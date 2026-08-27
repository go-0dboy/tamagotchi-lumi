/* ============================================================
 * MiniLM — крошечная языковая нейросеть питомца.
 *
 * Архитектура (настоящая, хоть и маленькая):
 *   усреднение эмбеддингов последних K слов  (emb, V×H)
 *     → скрытый слой tanh                    (Wx, H×H)
 *     → softmax-классификатор следующего слова (Wo, H×V)
 *
 * Сеть обучается на всём, что питомец «слышит» и «говорит»:
 * фразы из характера, знания, выученные факты, реплики хозяина,
 * сны и дневник. Обучение онлайн — каждый разговор делает её
 * чуть умнее. Хранится отдельно (только веса + словарь),
 * выгружается и загружается как самостоятельная модель.
 * ============================================================ */
import { GREETINGS, HUNGRY_LINES, TIRED_LINES, LONELY_LINES, PET_LINES, THANKS_LINES, QUESTIONS_FOR_OWNER, IDLE_THOUGHTS, WORDS } from './speech';
import { FOODS, SHOP, AFFIRMATIONS, WALK_LOCATIONS } from './content';
import { QUESTIONS as SCIENCE_QUESTIONS, FALLBACK_FACTS } from './knowledge';

const UNK = 0; // <unk>
const EOS = 1; // </s>
const MAX_VOCAB = 300;

export interface BrainData {
  v: 1;
  vocab: string[];
  H: number;
  K: number;
  trainedTokens: number;
  W1: string; // base64 Float32Array (V×H) эмбеддинги
  Wx: string; // (H×H) скрытый слой
  b1: string; // (H)
  Wo: string; // (H×V) выходной слой
  b2: string; // (V)
}

function f32ToB64(a: Float32Array): string {
  const u8 = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 0x8000)));
  }
  return btoa(bin);
}
function b64ToF32(s: string, len: number): Float32Array | null {
  try {
    const bin = atob(s);
    if (bin.length !== len * 4) return null;
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Float32Array(u8.buffer);
  } catch { return null; }
}

export class MiniLM {
  readonly H = 32; // ширина скрытого слоя
  readonly K = 3;  // контекстное окно
  vocab: string[] = ['<unk>', '</s>'];
  private w2i = new Map<string, number>();
  private W1: Float32Array = new Float32Array(0);
  private Wx: Float32Array = new Float32Array(0);
  private b1: Float32Array = new Float32Array(0);
  private Wo: Float32Array = new Float32Array(0);
  private b2: Float32Array = new Float32Array(0);
  trainedTokens = 0;

  get ready() { return this.vocab.length > 2 && this.trainedTokens > 0; }
  get vocabSize() { return this.vocab.length; }

  /* ---------- словарь ---------- */
  buildVocab(texts: string[]) {
    const freq = new Map<string, number>();
    for (const t of texts) {
      for (const w of this.tokenize(t)) freq.set(w, (freq.get(w) ?? 0) + 1);
    }
    const top = [...freq.entries()]
      .filter(([, n]) => n >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_VOCAB)
      .map(([w]) => w);
    this.vocab = ['<unk>', '</s>', ...top];
    this.w2i = new Map(this.vocab.map((w, i) => [w, i]));
    this.initWeights();
  }

  private initWeights() {
    const V = this.vocab.length, H = this.H;
    this.W1 = new Float32Array(V * H);
    this.Wx = new Float32Array(H * H);
    this.b1 = new Float32Array(H);
    this.Wo = new Float32Array(H * V);
    this.b2 = new Float32Array(V);
    const rnd = () => (Math.random() - 0.5) * 0.2;
    for (let i = 0; i < this.W1.length; i++) this.W1[i] = rnd();
    for (let i = 0; i < this.Wx.length; i++) this.Wx[i] = rnd();
    for (let i = 0; i < this.Wo.length; i++) this.Wo[i] = rnd();
  }

  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s'-]/gi, ' ')
      .split(/[\s-]+/)
      .map(w => w.replace(/^'+|'+$/g, ''))
      .filter(w => w.length > 1 || /^[а-яa-z0-9ё]$/i.test(w))
      .slice(0, 48);
  }

  private id(w: string): number { return this.w2i.get(w) ?? UNK; }
  knows(w: string): boolean { return this.w2i.has(w.toLowerCase()); }

  /* ---------- прямой проход ---------- */
  private forward(ctx: number[]) {
    const H = this.H, V = this.vocab.length;
    const n = Math.max(1, ctx.length);
    // усреднённый эмбеддинг контекста
    const e = new Float32Array(H);
    for (const w of ctx) {
      const row = w * H;
      for (let i = 0; i < H; i++) e[i] += this.W1[row + i];
    }
    for (let i = 0; i < H; i++) e[i] /= n;
    // скрытый слой tanh
    const h = new Float32Array(H);
    for (let j = 0; j < H; j++) {
      let s = this.b1[j];
      for (let i = 0; i < H; i++) s += this.Wx[i * H + j] * e[i];
      h[j] = Math.tanh(s);
    }
    // логиты
    const logits = new Float32Array(V);
    for (let v = 0; v < V; v++) {
      let s = this.b2[v];
      for (let j = 0; j < H; j++) s += this.Wo[j * V + v] * h[j];
      logits[v] = s;
    }
    return { e, h, logits };
  }

  /* ---------- обучение (SGD, кросс-энтропия) ---------- */
  train(texts: string[], epochs: number, lr: number) {
    if (this.vocab.length <= 2) this.buildVocab(texts);
    for (let ep = 0; ep < epochs; ep++) {
      for (const text of texts) {
        const ids = this.tokenize(text).map(w => this.id(w)).filter(i => i !== UNK);
        if (ids.length < 2) continue;
        for (let t = 1; t < ids.length; t++) {
          this.step(ids.slice(Math.max(0, t - this.K), t), ids[t], lr);
          this.trainedTokens++;
        }
      }
    }
  }

  private step(ctx: number[], target: number, lr: number) {
    const H = this.H, V = this.vocab.length;
    const { e, h, logits } = this.forward(ctx);
    // softmax
    let mx = -Infinity;
    for (let v = 0; v < V; v++) if (logits[v] > mx) mx = logits[v];
    let sum = 0;
    const p = new Float32Array(V);
    for (let v = 0; v < V; v++) { p[v] = Math.exp(logits[v] - mx); sum += p[v]; }
    for (let v = 0; v < V; v++) p[v] /= sum;
    // dLogits = p - onehot(target)
    const dL = new Float32Array(V);
    for (let v = 0; v < V; v++) dL[v] = p[v] - (v === target ? 1 : 0);
    // градиенты Wo, b2; накопление dh
    const dh = new Float32Array(H);
    for (let j = 0; j < H; j++) {
      let s = 0;
      const row = j * V;
      for (let v = 0; v < V; v++) {
        s += this.Wo[row + v] * dL[v];
        this.Wo[row + v] -= lr * h[j] * dL[v];
      }
      dh[j] = s;
    }
    for (let v = 0; v < V; v++) this.b2[v] -= lr * dL[v];
    // через tanh
    const dz = new Float32Array(H);
    for (let j = 0; j < H; j++) dz[j] = dh[j] * (1 - h[j] * h[j]);
    // градиенты Wx, b1; накопление de
    const de = new Float32Array(H);
    for (let i = 0; i < H; i++) {
      let s = 0;
      for (let j = 0; j < H; j++) {
        s += this.Wx[i * H + j] * dz[j];
        this.Wx[i * H + j] -= lr * e[i] * dz[j];
      }
      de[i] = s;
    }
    for (let j = 0; j < H; j++) this.b1[j] -= lr * dz[j];
    // градиенты эмбеддингов контекста (делим на длину)
    const n = Math.max(1, ctx.length);
    for (const w of ctx) {
      const row = w * H;
      for (let i = 0; i < H; i++) this.W1[row + i] -= lr * de[i] / n;
    }
  }

  /** дообучиться на одной реплике (онлайн-обучение) */
  learnLine(text: string) { this.train([text], 2, 0.06); }

  /* ---------- генерация ---------- */
  generate(seedWords: string[], maxLen = 14, temp = 0.85): string {
    if (!this.ready) return '';
    const known = seedWords.map(w => this.id(w.toLowerCase())).filter(i => i !== UNK && i !== EOS);
    const ctx = known.slice(-this.K);
    const out: string[] = [];
    let cur = [...ctx];
    for (let n = 0; n < maxLen; n++) {
      const { logits } = this.forward(cur);
      const next = this.sample(logits, temp);
      if (next === EOS || next === UNK) break;
      out.push(this.vocab[next]);
      cur = [...cur, next].slice(-this.K);
    }
    if (!out.length) return '';
    let s = out.join(' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  private sample(logits: Float32Array, temp: number): number {
    const V = logits.length;
    // топ-k = 10
    const idx = Array.from({ length: V }, (_, i) => i)
      .filter(i => i !== UNK)
      .sort((a, b) => logits[b] - logits[a])
      .slice(0, 10);
    let mx = -Infinity;
    for (const i of idx) if (logits[i] > mx) mx = logits[i];
    let sum = 0;
    const w = idx.map(i => { const e = Math.exp((logits[i] - mx) / temp); sum += e; return e; });
    let r = Math.random() * sum;
    for (let k = 0; k < idx.length; k++) {
      r -= w[k];
      if (r <= 0) return idx[k];
    }
    return idx[idx.length - 1];
  }

  /* ---------- сериализация (только модель) ---------- */
  serialize(): BrainData {
    return {
      v: 1,
      vocab: this.vocab,
      H: this.H,
      K: this.K,
      trainedTokens: this.trainedTokens,
      W1: f32ToB64(this.W1),
      Wx: f32ToB64(this.Wx),
      b1: f32ToB64(this.b1),
      Wo: f32ToB64(this.Wo),
      b2: f32ToB64(this.b2),
    };
  }

  static deserialize(d: BrainData): MiniLM | null {
    try {
      if (!d || d.v !== 1 || !Array.isArray(d.vocab) || d.vocab.length < 3) return null;
      const m = new MiniLM();
      const V = d.vocab.length;
      if (d.H !== m.H) return null;
      const W1 = b64ToF32(d.W1, V * m.H);
      const Wx = b64ToF32(d.Wx, m.H * m.H);
      const b1 = b64ToF32(d.b1, m.H);
      const Wo = b64ToF32(d.Wo, m.H * V);
      const b2 = b64ToF32(d.b2, V);
      if (!W1 || !Wx || !b1 || !Wo || !b2) return null;
      m.vocab = d.vocab;
      m.w2i = new Map(d.vocab.map((w, i) => [w, i]));
      m.W1 = W1; m.Wx = Wx; m.b1 = b1; m.Wo = Wo; m.b2 = b2;
      m.trainedTokens = d.trainedTokens ?? 0;
      return m;
    } catch { return null; }
  }
}

/* ---------- базовый корпус: всё, что питомец «знает от рождения» ---------- */
export function baseCorpus(): string[] {
  const lines: string[] = [];
  const push = (...arrs: string[][]) => { for (const a of arrs) lines.push(...a); };

  push(
    Object.values(GREETINGS).flat(),
    HUNGRY_LINES, TIRED_LINES, LONELY_LINES, PET_LINES, THANKS_LINES,
    QUESTIONS_FOR_OWNER, IDLE_THOUGHTS, AFFIRMATIONS,
  );
  // любимые слова — как предложения
  for (const w of WORDS) lines.push(`я люблю слово ${w}`, `${w} — чудесное слово`);
  // еда и вещи
  for (const f of FOODS) lines.push(`я люблю ${f.name}`, `${f.name} очень вкусно пахнет`);
  for (const s of SHOP) lines.push(`мне нравится ${s.name}`);
  // истории с прогулок
  for (const l of WALK_LOCATIONS) lines.push(...l.stories);
  // наука: вопрос + правильный ответ
  for (const q of SCIENCE_QUESTIONS) lines.push(`${q.q} — ${q.opts[q.a]}`);
  // факты
  for (const f of FALLBACK_FACTS) lines.push(`${f.title}. ${f.text}`);

  return lines;
}
