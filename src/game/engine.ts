/* ============================================================
 * GameEngine — синглтон вне React. Состояние, офлайн-жизнь,
 * уход, учёба, прогулки, мини-игры, чат и крошечная нейросеть.
 * ============================================================ */
import {
  GameState, Pet, PetDNA, OfflineEvent, LegacyEntry, MemoryItem, QuestState,
  clamp, uid, dayKeyOf, mulberry32, pick, choice,
  generateDNA, generateName, generatePersonality, stageForAge,
  SPECIES, speciesOf, RARITY_BONUS, setSoundEnabled, sfx,
} from './core';
import { WORDS, FALLBACK_FACTS, QUESTIONS, SUBJECTS, chatBrain, proactiveLine, makeDreamText, welcomeLine, OFFLINE_EVENTS } from './speech';

const KEY = 'lumos.save.v1';
const BRAIN_KEY = 'lumos.brain.v1';

function defaultState(): GameState {
  return {
    version: 1,
    createdAt: Date.now(), lastSeen: Date.now(),
    coins: 60,
    owner: { name: '', city: '', favorites: [], promises: [], moods: [] },
    pet: null,
    inventory: {},
    roomTheme: 'dusk', furniture: [],
    memories: [], diary: [], dreams: [],
    chat: [],
    quests: [], questDay: dayKeyOf(Date.now()),
    legacy: [],
    counters: {},
    inherit: null,
    pendingWelcome: null, pendingFarewell: null,
    focusEndsAt: null, focusMinutes: 0,
    bubble: null,
    dayKey: dayKeyOf(Date.now()),
    settings: { sound: true, reminders: true },
    freshHatch: false,
    fx: null,
    weatherReal: null,
    dialog: { pendingQuestion: null, lastIntent: '', turn: 0 },
  };
}

/* ============================================================
 * MiniLM — крошечная самообучающаяся языковая сеть.
 * усреднение эмбеддингов K слов → tanh-слой → softmax.
 * ============================================================ */
export class MiniLM {
  readonly H = 24; readonly K = 3;
  vocab: string[] = ['<unk>', '</s>'];
  private w2i = new Map<string, number>();
  private W1 = new Float32Array(0); private Wx = new Float32Array(0);
  private b1 = new Float32Array(0); private Wo = new Float32Array(0); private b2 = new Float32Array(0);
  trainedTokens = 0;

  get ready() { return this.vocab.length > 2 && this.trainedTokens > 0; }
  get vocabSize() { return this.vocab.length; }

  tokenize(s: string): string[] {
    return s.toLowerCase().replace(/[^a-zа-яё0-9+\- ]/gi, ' ').split(/\s+/).filter(Boolean).slice(0, 24);
  }
  knows(w: string) { return this.w2i.has(w); }

  buildVocab(texts: string[]) {
    const freq = new Map<string, number>();
    for (const t of texts) for (const w of this.tokenize(t)) freq.set(w, (freq.get(w) ?? 0) + 1);
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 280).map(([w]) => w);
    this.vocab = ['<unk>', '</s>', ...top];
    this.w2i = new Map(this.vocab.map((w, i) => [w, i]));
    const V = this.vocab.length, H = this.H;
    const r = mulberry32(7);
    const init = (n: number) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = (r() - 0.5) * 0.4; return a; };
    this.W1 = init(V * H); this.Wx = init(H * H); this.b1 = new Float32Array(H);
    this.Wo = init(H * V); this.b2 = new Float32Array(V);
  }

  private ids(toks: string[]) { return toks.map(t => this.w2i.get(t) ?? 0); }

  train(texts: string[], epochs = 2, lr = 0.1) {
    if (!this.ready && this.vocab.length <= 2) return;
    const H = this.H, V = this.vocab.length;
    for (let e = 0; e < epochs; e++) {
      for (const t of texts) {
        const ids = this.ids(this.tokenize(t));
        if (ids.length < 2) continue;
        for (let i = 1; i < ids.length; i++) this.step(ids.slice(Math.max(0, i - this.K), i), ids[i], lr);
        this.trainedTokens += ids.length;
      }
    }
    void H; void V;
  }
  learnLine(line: string) {
    const ids = this.ids(this.tokenize(line));
    if (ids.length < 2) return;
    for (let i = 1; i < ids.length; i++) this.step(ids.slice(Math.max(0, i - this.K), i), ids[i], 0.08);
    this.trainedTokens += ids.length;
  }

  private step(ctx: number[], target: number, lr: number) {
    const H = this.H, V = this.vocab.length;
    const x = new Float32Array(H);
    for (const id of ctx) for (let h = 0; h < H; h++) x[h] += this.W1[id * H + h];
    const n = Math.max(1, ctx.length);
    for (let h = 0; h < H; h++) x[h] /= n;
    const hid = new Float32Array(H);
    for (let h = 0; h < H; h++) {
      let s = this.b1[h];
      for (let k = 0; k < H; k++) s += x[k] * this.Wx[k * H + h];
      hid[h] = Math.tanh(s);
    }
    const logits = new Float32Array(V);
    let mx = -1e9;
    for (let v = 0; v < V; v++) {
      let s = this.b2[v];
      for (let h = 0; h < H; h++) s += hid[h] * this.Wo[h * V + v];
      logits[v] = s; if (s > mx) mx = s;
    }
    const probs = new Float32Array(V); let sum = 0;
    for (let v = 0; v < V; v++) { probs[v] = Math.exp(logits[v] - mx); sum += probs[v]; }
    for (let v = 0; v < V; v++) probs[v] /= sum;
    for (let v = 0; v < V; v++) {
      const g = (probs[v] - (v === target ? 1 : 0)) * lr;
      this.b2[v] -= g;
      for (let h = 0; h < H; h++) this.Wo[h * V + v] -= g * hid[h];
    }
    for (let h = 0; h < H; h++) {
      let dh = 0;
      for (let v = 0; v < V; v++) dh += (probs[v] - (v === target ? 1 : 0)) * this.Wo[h * V + v];
      const g = dh * (1 - hid[h] * hid[h]) * lr;
      this.b1[h] -= g;
      for (let k = 0; k < H; k++) this.Wx[k * H + h] -= g * x[k];
    }
  }

  generate(seeds: string[], maxLen = 12, temp = 0.9): string {
    if (!this.ready) return '';
    const ctx = this.ids(seeds.filter(w => this.knows(w)));
    const cur = ctx.length ? [...ctx] : [2 + Math.floor(Math.random() * (this.vocab.length - 2))];
    const out: string[] = [];
    for (let i = 0; i < maxLen; i++) {
      const H = this.H, V = this.vocab.length;
      const x = new Float32Array(H);
      const window = cur.slice(-this.K);
      for (const id of window) for (let h = 0; h < H; h++) x[h] += this.W1[id * H + h];
      for (let h = 0; h < H; h++) x[h] /= Math.max(1, window.length);
      const hid = new Float32Array(H);
      for (let h = 0; h < H; h++) { let s = this.b1[h]; for (let k = 0; k < H; k++) s += x[k] * this.Wx[k * H + h]; hid[h] = Math.tanh(s); }
      const logits = new Float32Array(V); let mx = -1e9;
      for (let v = 0; v < V; v++) { let s = this.b2[v]; for (let h = 0; h < H; h++) s += hid[h] * this.Wo[h * V + v]; logits[v] = s / temp; if (logits[v] > mx) mx = logits[v]; }
      const probs = new Float32Array(V); let sum = 0;
      for (let v = 0; v < V; v++) { probs[v] = Math.exp(logits[v] - mx); sum += probs[v]; }
      let r = Math.random() * sum, next = 1;
      for (let v = 0; v < V; v++) { r -= probs[v]; if (r <= 0) { next = v; break; } }
      if (next === 1 || next === 0) break;
      out.push(this.vocab[next]); cur.push(next);
    }
    if (!out.length) return '';
    return out.join(' ');
  }

  serialize() {
    const b64 = (a: Float32Array) => {
      const u8 = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
      let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 0x8000)));
      return btoa(bin);
    };
    return { v: 1, vocab: this.vocab, H: this.H, K: this.K, trainedTokens: this.trainedTokens, W1: b64(this.W1), Wx: b64(this.Wx), b1: b64(this.b1), Wo: b64(this.Wo), b2: b64(this.b2) };
  }
  static deserialize(d: any): MiniLM | null {
    try {
      if (!d || d.v !== 1 || !Array.isArray(d.vocab)) return null;
      const lm = new MiniLM();
      lm.vocab = d.vocab;
      lm.w2i = new Map(lm.vocab.map((w, i) => [w, i]));
      lm.trainedTokens = d.trainedTokens ?? 0;
      const f32 = (s: string, len: number) => {
        const bin = atob(s); if (bin.length !== len * 4) return null;
        const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return new Float32Array(u8.buffer);
      };
      const V = lm.vocab.length, H = lm.H;
      const W1 = f32(d.W1, V * H), Wx = f32(d.Wx, H * H), b1 = f32(d.b1, H), Wo = f32(d.Wo, H * V), b2 = f32(d.b2, V);
      if (!W1 || !Wx || !b1 || !Wo || !b2) return null;
      lm.W1 = W1; lm.Wx = Wx; lm.b1 = b1; lm.Wo = Wo; lm.b2 = b2;
      return lm;
    } catch { return null; }
  }
}

export function baseCorpus(): string[] {
  return [
    'привет как у тебя дела сегодня', 'доброе утро солнце уже встало',
    'как настроение расскажи мне', 'я сегодня видел очень красивый сон',
    'давай поиграем вместе мне не скучно', 'что ты делал сегодня расскажи',
    'я выучил новое слово и очень горжусь', 'ты мой самый любимый человек',
    'спасибо что ты всегда рядом', 'за окном идёт тёплый летний дождь',
    'звёзды сегодня особенно ярко светят', 'я люблю когда ты меня гладишь',
    'расскажи мне что-нибудь хорошее', 'мне нравится учиться вместе с тобой',
    'я скучал пока тебя не было', 'давай помечтаем о чём-нибудь приятном',
    'самое важное это быть рядом', 'вместе нам всё по плечу',
    ...WORDS.map(w => `я люблю слово ${w}`),
    ...FALLBACK_FACTS.map(f => `${f.title}. ${f.text}`),
  ];
}

/* ============================================================
 * Engine
 * ============================================================ */
class Engine {
  state: GameState = defaultState();
  private listeners = new Set<() => void>();
  private lm: MiniLM | null = null;
  private brainDirty = false;

  constructor() { this.load(); }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach(f => f()); }
  private commit() { this.save(); this.emit(); }

  save() {
    this.state.lastSeen = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch { /* noop */ }
    if (this.brainDirty) { this.saveBrain(); this.brainDirty = false; }
  }
  private load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) this.state = { ...defaultState(), ...parsed };
      }
    } catch { /* повреждённый сейв — начинаем заново */ }
  }

  start() {
    setSoundEnabled(this.state.settings.sound);
    const now = Date.now();
    const away = now - this.state.lastSeen;
    if (this.state.pet && away > 5 * 60000) this.simulateOffline(away);
    this.state.lastSeen = now;
    this.ensureQuests();
    this.initBrain();
    this.save(); this.emit();
  }

  /* ---------- нейросеть ---------- */
  private initBrain() {
    try {
      const raw = localStorage.getItem(BRAIN_KEY);
      if (raw) { const lm = MiniLM.deserialize(JSON.parse(raw)); if (lm) { this.lm = lm; return; } }
    } catch { /* вырастим новый */ }
    const lm = new MiniLM();
    lm.buildVocab(baseCorpus());
    lm.train(baseCorpus(), 3, 0.12);
    this.lm = lm; this.saveBrain();
  }
  private saveBrain() {
    if (!this.lm) return;
    try { localStorage.setItem(BRAIN_KEY, JSON.stringify(this.lm.serialize())); } catch { /* noop */ }
  }
  neuroThought(seedText?: string): string {
    const lm = this.lm; if (!lm || !lm.ready) return '';
    let seeds: string[] = [];
    if (seedText) seeds = lm.tokenize(seedText).filter(w => lm.knows(w));
    if (!seeds.length && this.state.pet) {
      const pool = [...this.state.pet.wordsLearned, ...this.state.pet.knowledge.filter(k => !k.startsWith('fact:'))];
      if (pool.length) seeds = [choice(pool)];
    }
    return lm.generate(seeds.slice(0, 2), 12, 0.9);
  }
  brainInfo() { return this.lm ? { ready: this.lm.ready, words: this.lm.vocabSize, tokens: this.lm.trainedTokens } : { ready: false, words: 0, tokens: 0 }; }

  /** проактивная «умная» реплика: погода, факты, воспоминания сети */
  smartProactive(): string | null {
    const s = this.state; const p = s.pet; if (!p || p.sleeping || p.transcended) return null;
    const today = dayKeyOf(Date.now());
    const wr = s.weatherReal;
    const warnedToday = !!s.counters.weatherWarnAt && dayKeyOf(s.counters.weatherWarnAt) === today;
    if (wr && (wr.kind === 'rain' || wr.kind === 'snow') && !warnedToday) {
      s.counters.weatherWarnAt = Date.now();
      this.addMemory('факт', `Предупредил о погоде: ${wr.label}`);
      return wr.kind === 'snow'
        ? `За окном сегодня снег${wr.temp ? `, ${wr.temp}°` : ''}. Одевайся теплее!`
        : `Похоже, сегодня дождь${wr.temp ? `, ${wr.temp}°` : ''}. Не забудь зонт!`;
    }
    const roll = Math.random();
    if (roll < 0.28) {
      const facts = s.memories.filter(m => m.kind === 'факт');
      if (facts.length && Math.random() < 0.6) {
        const f = facts[Math.floor(Math.random() * facts.length)];
        return `Помнишь, я узнал: ${f.text.toLowerCase()}`;
      }
      const good = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
      return `Добрая новость из мира: ${good.title.toLowerCase()} — ${good.text.toLowerCase()}`;
    }
    if (roll < 0.5) {
      const t = this.neuroThought();
      if (t) return Math.random() < 0.5 ? `Я тут вспомнил: ${t}.` : `Знаешь, о чём я думаю? ${t}`;
    }
    return null;
  }
  exportBrain() { return this.lm ? btoa(unescape(encodeURIComponent(JSON.stringify(this.lm.serialize())))) : null; }
  importBrain(code: string): boolean {
    try {
      const lm = MiniLM.deserialize(JSON.parse(decodeURIComponent(escape(atob(code.trim())))));
      if (!lm) return false;
      this.lm = lm; this.saveBrain();
      this.setBubble('Ого… я помню слова, которых раньше не знал!'); this.commit();
      return true;
    } catch { return false; }
  }

  /* ---------- офлайн ---------- */
  private simulateOffline(ms: number) {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return;
    const hours = ms / 3600000;
    const events: OfflineEvent[] = [];
    const nights = Math.floor(ms / 86400000);
    for (let i = 0; i < Math.min(nights, 5); i++) {
      const dream = { id: uid(), text: makeDreamText(), at: Date.now() - i * 86400000, gift: Math.random() < 0.3 ? choice(['keep_feather', 'keep_shell', 'keep_stone']) : undefined };
      s.dreams.unshift(dream);
      if (dream.gift) { s.inventory[dream.gift] = (s.inventory[dream.gift] ?? 0) + 1; events.push({ icon: 'gift', text: OFFLINE_EVENTS.dreamGift }); }
    }
    s.dreams = s.dreams.slice(0, 20);
    p.stats.hunger = clamp(p.stats.hunger - hours * 4, 12, 100);
    p.stats.cleanliness = clamp(p.stats.cleanliness - hours * 2, 10, 100);
    p.stats.energy = clamp(p.stats.energy + nights * 22, 0, 100);
    const target = 38 + p.bond * 0.35;
    p.stats.mood = clamp(p.stats.mood + (target - p.stats.mood) * Math.min(1, hours / 12), 10, 100);
    p.trust = clamp(p.trust - (hours > 48 ? 4 : 1), 5, 100);
    if (hours > 1 && Math.random() < 0.6) { p.stats.cleanliness = clamp(p.stats.cleanliness + 20, 0, 100); events.push({ icon: 'broom', text: OFFLINE_EVENTS.cleaned }); }
    if (hours > 3 && Math.random() < 0.5) { s.inventory['keep_drawing'] = (s.inventory['keep_drawing'] ?? 0) + 1; events.push({ icon: 'drawing', text: OFFLINE_EVENTS.drew }); }
    if (hours > 2 && Math.random() < 0.5) { const w = choice(WORDS); if (!p.wordsLearned.includes(w)) p.wordsLearned.push(w); events.push({ icon: 'book', text: OFFLINE_EVENTS.word }); }
    if (hours > 24) events.push({ icon: 'heart', text: OFFLINE_EVENTS.missed });
    s.pendingWelcome = { awayMs: ms, events: events.slice(0, 5), line: welcomeLine(ms, p.trust, p.name) };
    this.addMemory('момент', `Вернулся хозяин после ${Math.round(hours)} ч — обнялись`);
  }

  private addMemory(kind: MemoryItem['kind'], text: string) {
    this.state.memories.unshift({ id: uid(), kind, text, at: Date.now() });
    this.state.memories = this.state.memories.slice(0, 60);
  }

  /* ---------- квесты ---------- */
  private ensureQuests() {
    const s = this.state; const today = dayKeyOf(Date.now());
    if (s.questDay !== today) {
      s.questDay = today;
      const pool = [
        { id: 'q_feed', metric: 'feed', text: 'Покормить питомца 2 раза', target: 2, reward: 20 },
        { id: 'q_pet', metric: 'pet', text: 'Погладить питомца 5 раз', target: 5, reward: 15 },
        { id: 'q_play', metric: 'play', text: 'Сыграть в мини-игру', target: 1, reward: 25 },
        { id: 'q_study', metric: 'study', text: 'Позаниматься вместе', target: 1, reward: 20 },
        { id: 'q_walk', metric: 'walk', text: 'Сходить на прогулку', target: 1, reward: 20 },
      ];
      s.quests = pool.map(q => ({ ...q, progress: 0, claimed: false }));
    }
  }
  private bumpCounter(metric: string) {
    this.ensureQuests();
    const c = this.state.counters;
    c[metric] = (c[metric] ?? 0) + 1;
    for (const q of this.state.quests) if (q.metric === metric && !q.claimed) q.progress = Math.min(q.target, q.progress + 1);
  }
  claimQuest(id: string) {
    const q = this.state.quests.find(x => x.id === id);
    if (!q || q.claimed || q.progress < q.target) return;
    q.claimed = true;
    this.state.coins += q.reward;
    this.addXp(8); sfx.coin();
    this.setBubble(`Задание выполнено! +${q.reward} искр. Мы команда!`);
    this.commit();
  }

  /* ---------- рост ---------- */
  private addXp(n: number) {
    const p = this.state.pet; if (!p) return;
    p.growth.xp += n;
    const need = 80 + p.growth.level * 40;
    if (p.growth.xp >= need) {
      p.growth.xp -= need; p.growth.level++;
      this.state.coins += 15; sfx.levelup();
      this.setBubble(`Уровень ${p.growth.level}! Я расту!`);
    }
    this.checkEvolution();
  }
  growSkill(key: string, n: number) {
    const p = this.state.pet; if (!p) return;
    p.growth.skills[key] = (p.growth.skills[key] ?? 0) + n;
    this.checkEvolution();
  }
  private checkEvolution() {
    const p = this.state.pet; if (!p) return;
    const map: Record<string, string> = { 'интеллект': 'очки мудрости', 'спорт': 'спортивная повязка', 'эмпатия': 'мягкое свечение', 'магия': 'мерцающие искры', 'творчество': 'берет художника', 'любознательность': 'рюкзачок искателя' };
    for (const [k, trait] of Object.entries(map)) {
      if ((p.growth.skills[k] ?? 0) >= 40 && !p.evolutionTraits.includes(trait)) {
        p.evolutionTraits.push(trait);
        this.setBubble(`Я изменился! Теперь у меня есть ${trait}!`);
        sfx.sparkle();
      }
    }
  }

  /* ---------- уход ---------- */
  setBubble(text: string) { this.state.bubble = { text, at: Date.now() }; }
  clearBubble() { if (this.state.bubble) { this.state.bubble = null; this.emit(); } }
  clearFx() { if (this.state.fx) { this.state.fx = null; this.emit(); } }

  feed(foodId: string): { ok: boolean; msg: string } {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return { ok: false, msg: '' };
    if (p.sleeping) return { ok: false, msg: 'Он спит. Еда подождёт.' };
    const foods: Record<string, { name: string; price: number; hunger: number; mood: number; tag: string }> = {
      berries: { name: 'Лесные ягоды', price: 8, hunger: 18, mood: 2, tag: 'ягоды' },
      honey: { name: 'Капля мёда', price: 12, hunger: 14, mood: 6, tag: 'мёд' },
      soup: { name: 'Звёздный суп', price: 20, hunger: 34, mood: 4, tag: 'звёздный суп' },
      cookie: { name: 'Лунное печенье', price: 15, hunger: 20, mood: 8, tag: 'лунное печенье' },
      tea: { name: 'Облачный чай', price: 10, hunger: 8, mood: 5, tag: 'чай' },
      cake: { name: 'Праздничный торт', price: 40, hunger: 30, mood: 16, tag: 'торт' },
    };
    const f = foods[foodId]; if (!f) return { ok: false, msg: 'Нет такой еды.' };
    if ((s.inventory[foodId] ?? 0) > 0) s.inventory = { ...s.inventory, [foodId]: s.inventory[foodId] - 1 };
    else if (s.coins >= f.price) s.coins -= f.price;
    else return { ok: false, msg: 'Не хватает искр.' };
    const liked = p.personality.likes.includes(f.tag);
    p.stats.hunger = clamp(p.stats.hunger + f.hunger, 0, 100);
    p.stats.mood = clamp(p.stats.mood + f.mood * (liked ? 1.5 : 1), 0, 100);
    p.bond = clamp(p.bond + 1, 0, 100);
    this.bumpCounter('feed'); this.addXp(4);
    sfx.eat();
    this.setBubble(liked ? `${f.name}! Моё любимое! Ты знаешь меня наизусть!` : `Ням! ${f.name} — вкусно!`);
    this.commit();
    return { ok: true, msg: liked ? 'Любимая еда! Настроение взлетело.' : 'Питомец сыт и доволен.' };
  }

  cleanRoom(): { ok: boolean; msg: string } {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return { ok: false, msg: '' };
    p.stats.cleanliness = clamp(p.stats.cleanliness + 35, 0, 100);
    p.stats.mood = clamp(p.stats.mood + 2, 0, 100);
    this.bumpCounter('clean'); this.addXp(3);
    s.fx = { kind: 'clean', at: Date.now() };
    sfx.sparkle();
    this.setBubble('Вжух-вжух! Мётла танцует, пыль разбегается!');
    this.commit();
    return { ok: true, msg: 'В комнате стало чище.' };
  }

  bathPet(): { ok: boolean; msg: string } {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return { ok: false, msg: '' };
    if (p.sleeping) return { ok: false, msg: 'Спит. Купание подождёт до утра.' };
    p.stats.cleanliness = 100;
    p.stats.mood = clamp(p.stats.mood + 8, 0, 100);
    p.bond = clamp(p.bond + 1.5, 0, 100);
    this.bumpCounter('clean'); this.addXp(4);
    s.fx = { kind: 'bath', at: Date.now() };
    sfx.splash();
    this.setBubble('Буль-буль! Я теперь пахну облаком и ромашкой.');
    this.commit();
    return { ok: true, msg: `${p.name} выкупан и сияет!` };
  }

  petStroke() {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return;
    if (p.sleeping) { this.setBubble('Тс-с… я сплю. Погладишь, когда проснусь.'); this.commit(); return; }
    const boost = this.has('fox_charm') ? 2 : 1;
    p.stats.mood = clamp(p.stats.mood + 3 * boost, 0, 100);
    p.bond = clamp(p.bond + 1.2, 0, 100);
    p.trust = clamp(p.trust + 0.4, 0, 100);
    this.growSkill('эмпатия', 0.5);
    this.bumpCounter('pet'); this.addXp(1);
    s.fx = { kind: 'pet', at: Date.now() };
    sfx.purr();
    this.commit();
  }

  toggleSleep() {
    const p = this.state.pet; if (!p || p.transcended) return;
    p.sleeping = !p.sleeping;
    this.setBubble(p.sleeping ? 'Спокойной ночи… z-z-z…' : 'Доброе утро! Я выспался!');
    this.commit();
  }

  private has(ability: string) { return this.state.pet?.dna.abilityId === ability; }

  /* ---------- учёба ---------- */
  answerStudy(subjectId: string, correct: boolean): number {
    const s = this.state; const p = s.pet; if (!p) return 0;
    if (correct) {
      p.knowledge.push(`${subjectId}:${uid()}`);
      this.growSkill('интеллект', 2);
      this.addXp(10);
      p.stats.mood = clamp(p.stats.mood + 3, 0, 100);
      this.bumpCounter('study');
      sfx.sparkle();
      this.setBubble('Я запомнил! Расскажу тебе интересный факт потом!');
      this.commit();
      return 12;
    }
    sfx.sad();
    return 0;
  }
  randomFact() { return choice(FALLBACK_FACTS); }
  getQuestions(subjectId: string) { return QUESTIONS.filter(q => q.subject === subjectId); }

  /* ---------- прогулка ---------- */
  walkVisit(locName: string, story: string): { ok: boolean; coins: number; souvenir?: string } {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return { ok: false, coins: 0 };
    if (p.stats.energy < 12) { this.setBubble('Я слишком устал для прогулки…'); this.commit(); return { ok: false, coins: 0 }; }
    p.stats.energy = clamp(p.stats.energy - 12, 0, 100);
    p.stats.mood = clamp(p.stats.mood + 10, 0, 100);
    p.stats.hunger = clamp(p.stats.hunger - 6, 0, 100);
    p.bond = clamp(p.bond + 2.5, 0, 100);
    this.growSkill('любознательность', 2);
    this.bumpCounter('walk'); this.addXp(12);
    let coins = 15 + Math.floor(Math.random() * 10) + (this.has('crumb_finder') ? 6 : 0);
    s.coins += coins;
    let souvenir: string | undefined;
    if (Math.random() < 0.3) { souvenir = choice(['keep_feather', 'keep_shell', 'keep_stone']); s.inventory = { ...s.inventory, [souvenir]: (s.inventory[souvenir] ?? 0) + 1 }; }
    this.addMemory('момент', `Гуляли: ${locName}. ${story}`);
    sfx.coin();
    this.commit();
    return { ok: true, coins, souvenir };
  }

  /* ---------- мини-игры ---------- */
  finishMinigame(kind: string, score: number): number {
    const s = this.state; const p = s.pet; if (!p) return 0;
    const lucky = this.has('pixel_luck') ? 1.2 : 1;
    const reward = Math.max(8, Math.round(score * lucky));
    s.coins += reward;
    p.stats.mood = clamp(p.stats.mood + 6, 0, 100);
    p.stats.energy = clamp(p.stats.energy - 5, 0, 100);
    p.bond = clamp(p.bond + 2, 0, 100);
    this.growSkill(kind === 'firefly' ? 'спорт' : kind === 'echo' ? 'творчество' : 'интеллект', 2);
    this.bumpCounter('play'); this.addXp(10);
    sfx.coin();
    this.setBubble('Это было здорово! Ещё разок?');
    this.commit();
    return reward;
  }

  /* ---------- магазин / подарки ---------- */
  buy(itemId: string, price: number, kind: string): { ok: boolean; msg: string } {
    const s = this.state; if (s.coins < price) return { ok: false, msg: 'Не хватает искр.' };
    s.coins -= price;
    if (kind === 'furniture') { if (!s.furniture.includes(itemId)) s.furniture = [...s.furniture, itemId]; }
    else s.inventory = { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + 1 };
    sfx.coin();
    this.setBubble('Покупка! Спасибо!');
    this.commit();
    return { ok: true, msg: 'Куплено!' };
  }
  equip(itemId: string, slot: 'hat' | 'scarf' | 'glasses' | 'wings') {
    const p = this.state.pet; if (!p) return;
    p.outfit[slot] = p.outfit[slot] === itemId ? null : itemId;
    this.commit();
  }
  setRoomTheme(id: string) { this.state.roomTheme = id; this.commit(); }
  giveGift(itemId: string): { ok: boolean; msg: string } {
    const s = this.state; const p = s.pet; if (!p) return { ok: false, msg: '' };
    if ((s.inventory[itemId] ?? 0) <= 0) return { ok: false, msg: 'Подарка нет в рюкзаке.' };
    s.inventory = { ...s.inventory, [itemId]: s.inventory[itemId] - 1 };
    p.bond = clamp(p.bond + 4, 0, 100);
    p.trust = clamp(p.trust + 3, 0, 100);
    p.stats.mood = clamp(p.stats.mood + 10, 0, 100);
    this.bumpCounter('gift'); this.addXp(8);
    this.addMemory('подарок', `Подарили: ${itemId}`);
    sfx.chime();
    this.setBubble('Подарок! Это мне?! Я сохраню его навсегда!');
    this.commit();
    return { ok: true, msg: 'Питомец счастлив!' };
  }

  /* ---------- чат ---------- */
  sendChat(text: string) {
    const s = this.state; const p = s.pet; if (!p) return;
    s.chat.push({ id: uid(), from: 'owner', text, at: Date.now() });
    this.bumpCounter('talk');
    const brain = chatBrain(text, s);
    if (brain.save) this.addMemory(brain.save.kind, brain.save.text);
    if (brain.ownerName) s.owner.name = brain.ownerName;
    if (brain.favorite && !s.owner.favorites.includes(brain.favorite)) s.owner.favorites.push(brain.favorite);
    if (brain.save?.kind === 'обещание') s.owner.promises.push(brain.save.text);
    if (brain.moodDelta) p.stats.mood = clamp(p.stats.mood + brain.moodDelta, 0, 100);
    if (brain.pendingQuestion) s.dialog.pendingQuestion = brain.pendingQuestion;
    else s.dialog.pendingQuestion = null;
    if (this.lm) { this.lm.learnLine(text); for (const l of brain.lines) this.lm.learnLine(l); this.brainDirty = true; }
    s.chat = s.chat.slice(-60);
    this.growSkill('эмпатия', 0.4);
    this.save(); this.emit();
    const lines = [...brain.lines];
    if (Math.random() < 0.35) {
      const assoc = this.neuroThought(text);
      if (assoc && assoc.length > 6) lines.push(`Кстати, ${assoc}.`);
    }
    lines.forEach((line, i) => {
      setTimeout(() => {
        s.chat.push({ id: uid(), from: 'pet', text: line, at: Date.now() });
        s.chat = s.chat.slice(-60);
        if (i === 0) this.setBubble(line.length > 60 ? line.slice(0, 57) + '…' : line);
        sfx.bubble();
        this.save(); this.emit();
      }, 700 + i * 1300);
    });
  }

  /* ---------- рождение / наследие ---------- */
  hatchEgg(): Pet {
    const s = this.state;
    const seed = ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) % 2147483647;
    const inherit = s.inherit ? { colorPrimary: s.inherit.color, speciesKey: s.inherit.species } : null;
    const dna = generateDNA(seed, inherit);
    const rng = mulberry32(seed ^ 0x9e3779b9);
    const pet: Pet = {
      id: uid(), name: generateName(rng, dna), dna,
      personality: generatePersonality(rng, dna),
      stats: { hunger: 70, energy: 85, mood: 78, cleanliness: 90 },
      growth: { xp: 0, level: 1, bornAt: Date.now(), skills: {} },
      outfit: { hat: null, scarf: null, glasses: null, wings: null },
      bond: 20, trust: 50, sleeping: false, transcended: false,
      evolutionTraits: [], wordsLearned: [], knowledge: [],
    };
    s.pet = pet; s.freshHatch = true;
    sfx.hatch();
    this.commit();
    return pet;
  }
  completeReveal() { this.state.freshHatch = false; this.commit(); }
  renamePet(name: string) {
    const p = this.state.pet; if (!p) return;
    p.name = name.trim().slice(0, 14) || p.name;
    this.commit();
  }
  transcend() {
    const s = this.state; const p = s.pet; if (!p) return;
    const days = Math.max(0, Math.floor((Date.now() - p.growth.bornAt) / 86400000));
    const entry: LegacyEntry = {
      id: uid(), name: p.name, species: speciesOf(p.dna.species).label, days,
      colorPrimary: p.dna.colorPrimary, rarity: p.dna.rarity,
      epitaph: `${p.name} прожил(а) ${days} дней и оставил(а) в наших сердцах тёплый свет. ${RARITY_BONUS[p.dna.rarity]} — теперь это дар для следующего.`,
      bonus: RARITY_BONUS[p.dna.rarity],
    };
    p.transcended = true;
    s.pendingFarewell = entry;
    this.commit();
  }
  dismissFarewell() { this.state.pendingFarewell = null; this.commit(); }
  startNewGeneration() {
    const s = this.state; const p = s.pet;
    if (p && p.transcended && s.pendingFarewell) {
      s.legacy.unshift(s.pendingFarewell);
      s.legacy = s.legacy.slice(0, 12);
      s.inherit = { color: p.dna.colorPrimary, species: p.dna.species };
      s.pendingFarewell = null;
      s.pet = null;
      this.commit();
    }
  }

  hugOnReturn() {
    const p = this.state.pet; if (!p) return;
    p.stats.mood = clamp(p.stats.mood + 10, 0, 100);
    p.bond = clamp(p.bond + 2, 0, 100);
    this.state.pendingWelcome = null;
    sfx.purr();
    this.setBubble('Обнимашки! Вот теперь день начался.');
    this.commit();
  }

  /* ---------- фокус-таймер ---------- */
  startFocus(minutes: number) {
    this.state.focusMinutes = minutes;
    this.state.focusEndsAt = Date.now() + minutes * 60000;
    this.bumpCounter('focus');
    this.addXp(6);
    this.setBubble(`Фокус на ${minutes} минут! Я сижу тихо-тихо.`);
    this.commit();
  }
  endFocus() {
    this.state.focusEndsAt = null;
    this.state.focusMinutes = 0;
    this.state.coins += 10;
    this.setBubble('Отличный фокус! +10 искр за старание.');
    sfx.coin();
    this.commit();
  }

  /* ---------- настройки ---------- */
  setSound(on: boolean) { this.state.settings.sound = on; setSoundEnabled(on); this.commit(); }
  setReminders(on: boolean) { this.state.settings.reminders = on; this.commit(); }
  setCity(city: string) {
    this.state.owner.city = city.trim();
    this.state.weatherReal = null;
    this.commit();
  }

  /* ---------- реальная погода ---------- */
  async refreshWeather() {
    const o = this.state.owner;
    let lat: number | undefined, lon: number | undefined;
    try {
      if (o.city.trim()) {
        const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(o.city.trim())}&count=1&language=ru&format=json`);
        const gd = await g.json();
        const r = gd?.results?.[0];
        if (r && typeof r.latitude === 'number') { lat = r.latitude; lon = r.longitude; }
      }
      if (lat == null || lon == null) return;
      const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
      const wd = await w.json();
      const code = wd?.current?.weather_code ?? 0;
      const temp = Math.round(wd?.current?.temperature_2m ?? 0);
      const kind = code === 0 ? 'clear' : code <= 3 ? 'clouds' : (code >= 71 && code <= 77) ? 'snow' : code >= 51 ? 'rain' : 'clouds';
      const label = { clear: 'Ясно', clouds: 'Облачно', rain: 'Дождь', snow: 'Снег' }[kind] ?? 'Облачно';
      this.state.weatherReal = { kind, label, temp, at: Date.now() };
      this.save(); this.emit();
    } catch { /* офлайн — сезонная погода */ }
  }

  /* ---------- сейв ---------- */
  exportSave(): string {
    this.save();
    const payload = { __lumos: 2, state: this.state, brain: this.lm ? this.lm.serialize() : null };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }
  importSave(code: string): boolean {
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (parsed?.__lumos === 2 && parsed.state?.version === 1) {
        this.state = { ...defaultState(), ...parsed.state };
        if (parsed.brain) { const lm = MiniLM.deserialize(parsed.brain); if (lm) { this.lm = lm; this.saveBrain(); } }
        this.save(); this.emit();
        return true;
      }
      if (parsed?.version === 1) { this.state = { ...defaultState(), ...parsed }; this.save(); this.emit(); return true; }
      return false;
    } catch { return false; }
  }
  resetAll() {
    try { localStorage.removeItem(KEY); localStorage.removeItem(BRAIN_KEY); } catch { /* noop */ }
    this.state = defaultState();
    this.lm = null; this.initBrain();
    this.emit();
  }

  /* ---------- тик ---------- */
  tick() {
    const p = this.state.pet; if (!p || p.transcended) return;
    const night = this.isNight();
    if (night && !p.sleeping && p.stats.energy < 30) p.sleeping = true;
    if (!night && p.sleeping && p.stats.energy > 90) p.sleeping = false;
    if (p.sleeping) {
      p.stats.energy = clamp(p.stats.energy + (this.has('ember_heart') || this.has('cozy_den') ? 1.4 : 0.9), 0, 100);
      p.stats.hunger = clamp(p.stats.hunger - 0.4, 12, 100);
    } else {
      const moss = this.has('calm_moss') || this.has('night_prowl') ? 0.6 : 1;
      p.stats.energy = clamp(p.stats.energy - 0.5 * moss, 0, 100);
      p.stats.hunger = clamp(p.stats.hunger - 0.7, 12, 100);
      p.stats.cleanliness = clamp(p.stats.cleanliness - 0.25, 10, 100);
      let dm = -0.15 * (this.has('warm_purr') ? 0.6 : 1);
      if (p.stats.hunger < 25) dm -= 0.04;
      if (this.has('purr_heal') && p.stats.mood < 70) dm += 0.03;
      if (night && this.has('starlight')) dm += 0.1;
      p.stats.mood = clamp(p.stats.mood + dm, 10, 100);
    }
    const today = dayKeyOf(Date.now());
    if (this.state.dayKey !== today) {
      this.state.dayKey = today;
      this.writeDiary();
      this.ensureQuests();
    }
    this.save(); this.emit();
  }
  isNight() { const h = new Date().getHours(); return h >= 22 || h < 6; }

  private writeDiary() {
    const p = this.state.pet; if (!p) return;
    const c = this.state.counters;
    const days = Math.max(0, Math.floor((Date.now() - p.growth.bornAt) / 86400000));
    const moods = this.state.owner.moods.slice(-10);
    const avg = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : p.stats.mood;
    const moodWords = ['уютный', 'волшебный', 'тихий', 'весёлый', 'сонный', 'тёплый', 'искристый'];
    const text = [
      c.feed ? `Сегодня меня кормили ${c.feed} раз(а) — ${c.feed > 1 ? 'я почти круглый' : 'было вкусно'}.` : 'Сегодня я mostly мечтал.',
      c.play ? 'Мы играли, и я чуть не выиграл у самого себя.' : '',
      avg >= 70 ? 'Настроение искрилось, как лимонад.' : avg < 40 ? 'День был серым, но я нашёл тёплую крошку.' : '',
      choice(['Лампа мигнула два раза — думаю, это было «привет».', 'Считал звёзды, сбился на двенадцатой.', 'Пылинки в луче света танцевали.', '']),
    ].filter(Boolean).slice(0, 3).join(' ');
    this.state.diary.unshift({
      id: uid(), day: days + 1, text,
      date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
      moodWord: moodWords[Math.floor(Math.random() * moodWords.length)], at: Date.now(),
    });
    this.state.diary = this.state.diary.slice(0, 40);
    this.state.counters = {};
  }
}

export const engine = new Engine();
export { SUBJECTS, WORDS, SPECIES, speciesOf, stageForAge, clamp, choice };
export const getWeather = () => {
  const m = new Date().getMonth();
  if (m === 11 || m <= 1) return { kind: 'snow', label: 'Снег' };
  if (m >= 2 && m <= 4) return { kind: 'rain', label: 'Весна' };
  if (m >= 5 && m <= 7) return { kind: 'clear', label: 'Лето' };
  return { kind: 'clouds', label: 'Осень' };
};
export const timePhase = (): 'morning' | 'day' | 'evening' | 'night' => {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'day';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
};
export { proactiveLine };
