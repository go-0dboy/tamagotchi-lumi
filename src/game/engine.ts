/* ============================================================
 * GameEngine — сердце «Люмоса». Чистый ES6-синглтон вне React:
 * состояние, тики, офлайн-симуляция, уход, прогулки, учёба,
 * квесты, память, сны, дневник, наследие, реальная погода,
 * маленькая нейросеть + знания из Википедии (RAG без LLM).
 * ============================================================ */
import type { GameState, Pet, MemoryItem, OfflineEvent, LegacyEntry } from './types';
import { generateDNA, generatePersonality, mulberry32, pick, uid, speciesOf, RARITY_BONUS } from './dna';
import { FOODS, SHOP, KEEPSAKES, QUEST_POOL, SKILLS, TRAIT_THRESHOLD } from './content';
import { makeDreamText, dreamGiftId, makeDiaryText, MOOD_WORDS, OFFLINE_EVENTS, chatBrain, welcomeLine, WORDS } from './speech';
import { sfx, setSoundEnabled } from './sound';
import { MiniLM, baseCorpus } from './neuro';
import { FALLBACK_FACTS, fetchWikiFact, searchWiki } from './knowledge';

const KEY = 'lumos.save.v1';
const BRAIN_KEY = 'lumos.brain.v1';
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dayKeyOf = (t: number) => new Date(t).toISOString().slice(0, 10);
const hourMs = 3600000;

export function timePhase(): 'morning' | 'day' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 5 && h <= 10) return 'morning';
  if (h >= 11 && h <= 16) return 'day';
  if (h >= 17 && h <= 20) return 'evening';
  return 'night';
}

/* сезонная погода-заглушка, пока нет города игрока */
export function getWeather(): { kind: string; label: string } {
  const m = new Date().getMonth() + 1;
  const r = Math.random() * 100;
  if (m === 12 || m <= 2) {
    if (r < 40) return { kind: 'snow', label: 'Снег' };
    if (r < 60) return { kind: 'clouds', label: 'Облачно' };
    return { kind: 'clear', label: 'Ясно' };
  }
  if (m >= 3 && m <= 5) {
    if (r < 35) return { kind: 'rain', label: 'Дождь' };
    if (r < 55) return { kind: 'clouds', label: 'Облачно' };
    return { kind: 'clear', label: 'Ясно' };
  }
  if (m >= 6 && m <= 8) {
    if (r < 20) return { kind: 'rain', label: 'Дождь' };
    if (r < 35) return { kind: 'clouds', label: 'Облачно' };
    return { kind: 'clear', label: 'Ясно' };
  }
  if (r < 30) return { kind: 'rain', label: 'Дождь' };
  if (r < 55) return { kind: 'clouds', label: 'Облачно' };
  return { kind: 'clear', label: 'Ясно' };
}

function defaultState(): GameState {
  return {
    version: 1,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    coins: 60,
    owner: { name: '', favorites: [], facts: [], moods: [], promises: [], city: '', geo: null },
    pet: null,
    inventory: { berries: 2, cookie: 1 },
    roomTheme: 'dusk',
    furniture: ['furn_plant'],
    memories: [],
    diary: [],
    dreams: [],
    chat: [],
    quests: [],
    questDay: '',
    legacy: [],
    counters: {},
    inherit: null,
    pendingWelcome: null,
    pendingFarewell: null,
    focusEndsAt: null,
    focusMinutes: 0,
    bubble: null,
    dayKey: dayKeyOf(Date.now()),
    settings: { sound: true, reminders: true },
    freshHatch: false,
    fx: null,
    weatherReal: null,
    dialog: { pendingQuestion: null, lastIntent: '', turn: 0, game: null },
  };
}

class Engine {
  state: GameState = defaultState();
  private listeners = new Set<() => void>();
  private lm: MiniLM | null = null; // маленькая языковая нейросеть питомца
  private brainDirty = false;

  constructor() { this.load(); }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach(fn => fn()); }
  private commit() { this.save(); this.emit(); }

  /* ---------- сохранение ---------- */
  save() {
    this.state.lastSeen = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch { /* приватный режим */ }
    if (this.brainDirty) { this.saveBrain(); this.brainDirty = false; }
  }
  private load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && 'pet' in parsed) {
        this.state = { ...defaultState(), ...parsed };
        // миграция старых сейвов
        if (!this.state.owner) this.state.owner = defaultState().owner;
        if (this.state.owner.city === undefined) this.state.owner.city = '';
        if (this.state.owner.geo === undefined) this.state.owner.geo = null;
        if (this.state.pet) this.state.pet.knowledge = this.state.pet.knowledge ?? [];
        if (!this.state.dialog) this.state.dialog = { pendingQuestion: null, lastIntent: '', turn: 0, game: null };
        if (this.state.dialog.game === undefined) this.state.dialog.game = null;
        // старые сейвы могли содержать удалённые поля — приводим к текущей схеме
        this.state.settings = { sound: this.state.settings.sound, reminders: this.state.settings.reminders };
        this.state.fx = null;
      }
    } catch { /* повреждённый сейв — начинаем с чистого */ }
    setSoundEnabled(this.state.settings.sound);
  }

  /* ---------- жизненный цикл ---------- */
  start() {
    const now = Date.now();
    if (this.state.pet && !this.state.pet.transcended && now - this.state.lastSeen > 10 * 60000) {
      this.simulateOffline(now - this.state.lastSeen);
    }
    this.state.lastSeen = now;
    this.ensureQuests();
    this.initBrain();
    this.save();
    this.emit();
  }

  /* ==================== маленькая нейросеть питомца ==================== */
  private initBrain() {
    try {
      const raw = localStorage.getItem(BRAIN_KEY);
      if (raw) {
        const loaded = MiniLM.deserialize(JSON.parse(raw));
        if (loaded) { this.lm = loaded; return; }
      }
    } catch { /* повреждённый мозг — вырастим новый */ }
    const lm = new MiniLM();
    lm.buildVocab(baseCorpus());
    lm.train(baseCorpus(), 3, 0.12); // предобучение: сеть сразу говорит связно
    this.lm = lm;
    this.saveBrain();
  }

  private saveBrain() {
    if (!this.lm) return;
    try { localStorage.setItem(BRAIN_KEY, JSON.stringify(this.lm.serialize())); } catch { /* переполнение */ }
  }

  /** онлайн-дообучение на репликах разговора */
  private brainLearn(lines: string[]) {
    const lm = this.lm; if (!lm) return;
    for (const l of lines) if (l) lm.learnLine(l);
    this.brainDirty = true; // сохранится вместе с ближайшим save()
  }

  brainInfo(): { ready: boolean; words: number; tokens: number } {
    return this.lm
      ? { ready: this.lm.ready, words: this.lm.vocabSize, tokens: this.lm.trainedTokens }
      : { ready: false, words: 0, tokens: 0 };
  }

  /** экспорт/импорт ТОЛЬКО модели */
  exportBrain(): string | null {
    return this.lm ? btoa(unescape(encodeURIComponent(JSON.stringify(this.lm.serialize())))) : null;
  }
  importBrain(code: string): boolean {
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      const lm = MiniLM.deserialize(d);
      if (!lm) return false;
      this.lm = lm;
      this.saveBrain();
      this.setBubble('Ого… я помню слова, которых раньше не знал! Спасибо за новый ум!');
      this.commit();
      return true;
    } catch { return false; }
  }

  /**
   * Самообучение во сне: пока питомец спит и есть интернет,
   * нейросеть читает случайную статью Википедии и дообучается на ней.
   * Возвращает true, если удалось что-то выучить (для анимации сна).
   */
  async sleepLearn(): Promise<boolean> {
    const p = this.state.pet;
    if (!p || !p.sleeping || p.transcended) return false;
    if (!this.lm) return false;
    const fact = await fetchWikiFact();
    if (!fact) return false; // нет интернета — тихо пропускаем
    this.lm.learnLine(fact.title);
    this.lm.learnLine(fact.text);
    if (Math.random() < 0.5) {
      p.knowledge = [...new Set([...p.knowledge, 'fact:' + fact.title])].slice(-300);
    }
    this.brainDirty = true;
    this.save();
    return true;
  }

  /** «Мысль из головы» — сеть продолжает фразу с ключевых слов хозяина. */
  neuroThought(seedText?: string): string {
    const lm = this.lm; if (!lm || !lm.ready) return '';
    let seeds: string[] = [];
    if (seedText) seeds = lm.tokenize(seedText).filter(w => lm.knows(w));
    if (!seeds.length && this.state.pet) {
      const pool = [
        ...this.state.pet.wordsLearned,
        ...this.state.pet.knowledge.filter(k => !k.startsWith('fact:')),
      ];
      if (pool.length) seeds = [pool[Math.floor(Math.random() * pool.length)]];
    }
    const gen = lm.generate(seeds.slice(0, 2), 13, 0.7);
    return this.isCoherent(gen) ? gen : '';
  }

  private isCoherent(s: string): boolean {
    if (!s || s.length < 10) return false;
    const words = s.toLowerCase().split(/\s+/);
    if (words.length < 3) return false;
    const uniq = new Set(words).size;
    if (uniq < words.length * 0.5) return false; // зацикливание
    const letters = s.match(/[a-zа-яё]/gi) ?? [];
    const cyr = letters.filter(c => /[а-яё]/i.test(c)).length;
    return letters.length > 0 && cyr / letters.length >= 0.5;
  }

  /* ==================== знания из сети (RAG без большой модели) ==================== */
  private static KNOWLEDGE_RE = /(кто (такой|такая|такие)|что такое|что за|почему|зачем|откуда|как (работает|устроен|появил|образовал)|расскажи (про|о|об)|знаешь (ли ты )?(кто|что|почему|где|когда)|в чём разница|чем отличается)/i;

  private extractTopic(text: string): string {
    const cleaned = text.toLowerCase()
      .replace(/(кто|что|какой|какая|какие|почему|зачем|где|когда|сколько|откуда|такой|такая|такое|такие|расскажи|расскажите|про|об|о|знаешь|знаете|ли|мне|нам|ты|вы|пожалуйста|есть|был|была|было|работает|устроен|появился|образовалась|в|чем|разница|отличается)\b/g, ' ')
      .replace(/[?.!,;:()«»"']+/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    return cleaned.slice(0, 4).join(' ');
  }

  /**
   * Знания из сети БЕЗ большой модели: на вопрос-знание («кто такой…»,
   * «почему…») ищем статью в Википедии, на «расскажи что-нибудь
   * интересное» — берём случайную статью. chatBrain вплетает найденное
   * в ответ по шаблону, поэтому питомец отвечает реальными фактами.
   */
  private async webKnowledge(userText: string): Promise<{ title: string; text: string } | null> {
    try {
      if (Engine.KNOWLEDGE_RE.test(userText)) {
        const topic = this.extractTopic(userText);
        if (topic) return await searchWiki(topic);
        return null;
      }
      if (/(расскажи (мне )?факт|какой-нибудь факт|удиви меня|что-нибудь интересное|расскажи что-нибудь)/i.test(userText)) {
        return await fetchWikiFact();
      }
    } catch { /* нет интернета — питомец ответит из локальных знаний */ }
    return null;
  }

  /* ---------- тики ---------- */
  tick() {
    const s = this.state; const p = s.pet;
    if (!p || p.transcended) return;
    const f = 4 / 3600; // 4 секунды в «часах»
    const hour = new Date().getHours();
    const night = hour >= 22 || hour < 7;

    // сам засыпает ночью, если устал; сам просыпается утром
    if (!p.sleeping && night && p.stats.energy < 45) {
      p.sleeping = true;
      this.setBubble('Что-то глазки слипаются… Посплю немножко. Тс-с…');
    } else if (p.sleeping && hour >= 7 && hour < 22 && p.stats.energy > 92) {
      p.sleeping = false;
      this.setBubble('Доброе утро! Я выспался и видел чудесный сон!');
    }

    if (p.sleeping) {
      const regen = (this.has('deep_sleep') || this.has('cozy_den') || this.has('ember_heart')) ? 60 : 40;
      p.stats.energy = clamp(p.stats.energy + regen * f, 0, 100);
      p.stats.hunger = clamp(p.stats.hunger - 2 * f, 0, 100);
      // во сне иногда снится сон
      if (Math.random() < 0.002 && s.dreams.length < 60) {
        const text = makeDreamText();
        const gift = this.has('root_song') || this.has('wish_dust')
          ? (Math.random() < 0.5 ? dreamGiftId() : dreamGiftId())
          : dreamGiftId();
        s.dreams.unshift({ id: uid(), at: Date.now(), text, gift });
        if (gift) this.inv(gift, 1);
      }
    } else {
      const moss = (this.has('calm_moss') || this.has('night_prowl')) ? 0.6 : 1;
      p.stats.hunger = clamp(p.stats.hunger - 4 * f, 0, 100);
      p.stats.cleanliness = clamp(p.stats.cleanliness - (this.has('gravity_nap') ? 1.2 : 2) * f, 0, 100);
      p.stats.energy = clamp(p.stats.energy - 1.6 * moss * f, 0, 100);
      let dm = 0;
      if (p.stats.hunger > 60 && p.stats.energy > 40) dm += 1.2 * f;
      else dm -= 2.4 * f;
      if (night && this.has('starlight')) dm += 1.5 * f;
      if (p.stats.hunger < 25) dm -= 0.04;
      if (p.stats.energy < 20) dm -= 0.02;
      if (this.has('purr_heal') && p.stats.mood < 70) dm += 0.03;
      // настроение медленно дрейфует к «базовому» уровню связи
      const base = 38 + p.bond * 0.35;
      dm += (base - p.stats.mood) * 0.02 * f;
      p.stats.mood = clamp(p.stats.mood + dm, 10, 100);
      // доверие тает, если питомцу плохо
      if (p.stats.mood < 30) p.trust = clamp(p.trust - 0.5 * f, 0, 100);
    }

    // фокус-таймер завершился?
    if (s.focusEndsAt && Date.now() >= s.focusEndsAt) {
      s.focusEndsAt = null;
      this.bumpCounter('focus');
      p.stats.mood = clamp(p.stats.mood + 4, 0, 100);
      p.bond = clamp(p.bond + 1.5, 0, 100);
      this.setBubble('Ура, фокус-сессия готова! Ты большой молодец. Я горжусь!');
      sfx.chime();
    }

    // смена дня: дневник за вчера + новые ритуалы
    const today = dayKeyOf(Date.now());
    if (s.dayKey !== today) this.rollDay(today);

    // долгая жизнь: старейшина может тихо уйти в дух памяти
    const ageDays = (Date.now() - p.growth.bornAt) / 86400000;
    if (ageDays > 45 && !p.transcended && Math.random() < 0.0004) this.transcend();

    this.save();
    this.emit();
  }

  private rollDay(today: string) {
    const s = this.state; const p = s.pet; if (!p) return;
    // дневник за прошедший день
    const fedTimes = s.counters.feed ?? 0;
    const playedTimes = (s.counters.play ?? 0) + (s.counters.walk ?? 0);
    const text = makeDiaryText({
      ownerName: s.owner.name,
      fedTimes,
      playedTimes,
      avgMood: p.stats.mood,
      weather: (s.weatherReal?.label ?? 'небо').toLowerCase(),
    });
    const day = Math.max(1, Math.round((Date.now() - p.growth.bornAt) / 86400000));
    s.diary.unshift({ id: uid(), day, date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), text, moodWord: MOOD_WORDS[Math.floor(p.stats.mood / 100 * MOOD_WORDS.length) % MOOD_WORDS.length] });
    s.diary = s.diary.slice(0, 60);
    s.counters = {};
    s.dayKey = today;
    this.ensureQuests();
  }

  /* ---------- офлайн-симуляция ---------- */
  private simulateOffline(elapsedMs: number) {
    const s = this.state; const p = s.pet; if (!p) return;
    const hours = Math.min(720, Math.floor(elapsedMs / hourMs));
    if (hours < 1) return;
    const events: OfflineEvent[] = [];
    const start = new Date(s.lastSeen);

    for (let h = 1; h <= hours; h++) {
      const dt = new Date(start.getTime() + h * hourMs);
      const hh = dt.getHours();
      const night = hh >= 22 || hh < 7;
      if (night) {
        p.stats.energy = clamp(p.stats.energy + 22 / 7, 0, 100);
        p.stats.hunger = clamp(p.stats.hunger - 4 / 7, 12, 100);
        // сон за ночь
        if (hh === 23 && s.dreams.length < 60) {
          const text = makeDreamText();
          const gift = dreamGiftId();
          s.dreams.unshift({ id: uid(), at: dt.getTime(), text, gift });
          if (gift) {
            this.inv(gift, 1);
            events.push({ icon: 'gift', text: `видел сон и принёс из него подарок — ${KEEPSAKES.find(k => k.id === gift)?.name.toLowerCase() ?? 'сокровище'}` });
          }
        }
      } else {
        p.stats.hunger = clamp(p.stats.hunger - 4, 12, 100);
        p.stats.cleanliness = clamp(p.stats.cleanliness - 2, 0, 100);
        p.stats.energy = clamp(p.stats.energy - 1.6, 0, 100);
        const base = 38 + p.bond * 0.35;
        p.stats.mood = clamp(p.stats.mood + (base - p.stats.mood) * 0.08, 10, 100);
      }
      // добрые события «пока вас не было»
      if (h % 6 === 0 && Math.random() < 0.5) {
        const roll = Math.random();
        if (roll < 0.18) {
          p.stats.cleanliness = clamp(p.stats.cleanliness + 30, 0, 100);
          events.push({ icon: 'broom', text: OFFLINE_EVENTS.cleaned });
        } else if (roll < 0.34) {
          this.inv('keep_drawing', 1);
          events.push({ icon: 'drawing', text: OFFLINE_EVENTS.drew });
        } else if (roll < 0.5) {
          const unlearned = WORDS.filter(w => !p.wordsLearned.includes(w));
          if (unlearned.length) {
            const w = pick(Math.random, unlearned);
            p.wordsLearned = [...p.wordsLearned, w];
            events.push({ icon: 'book', text: `${OFFLINE_EVENTS.word}: «${w}»` });
          }
        } else if (roll < 0.66) {
          events.push({ icon: 'heart', text: OFFLINE_EVENTS.missed });
          p.trust = clamp(p.trust - 1, 0, 100);
        } else if (roll < 0.8) {
          events.push({ icon: 'plant', text: OFFLINE_EVENTS.plants });
        } else {
          s.coins += 15;
          events.push({ icon: 'spark', text: OFFLINE_EVENTS.sparks });
        }
      }
    }

    p.sleeping = false;
    s.pendingWelcome = {
      awayMs: elapsedMs,
      events: events.slice(0, 5),
      line: welcomeLine(elapsedMs, p.trust, p.name),
    };
  }

  hugOnReturn() {
    const s = this.state; const p = s.pet;
    s.pendingWelcome = null;
    if (p && !p.transcended) {
      const k = this.has('jelly_hug') ? 2 : 1;
      p.stats.mood = clamp(p.stats.mood + 10 * k, 0, 100);
      p.bond = clamp(p.bond + 3, 0, 100);
      p.trust = clamp(p.trust + 2, 0, 100);
      this.setBubble('Обнимашки! Вот теперь день точно начался.');
      sfx.purr();
    }
    this.commit();
  }

  /* ---------- уход ---------- */
  private has(abilityId: string) { return this.state.pet?.dna.abilityId === abilityId; }
  private inv(itemId: string, delta: number) {
    const cur = this.state.inventory[itemId] ?? 0;
    const next = Math.max(0, cur + delta);
    this.state.inventory = { ...this.state.inventory, [itemId]: next };
  }

  feed(foodId: string): { ok: boolean; msg: string } {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return { ok: false, msg: '' };
    const food = FOODS.find(f => f.id === foodId); if (!food) return { ok: false, msg: '' };
    if (p.sleeping) return { ok: false, msg: 'Спит. Еда подождёт до пробуждения.' };
    const owned = s.inventory[foodId] ?? 0;
    if (owned > 0) this.inv(foodId, -1);
    else if (s.coins >= food.price) s.coins -= food.price;
    else return { ok: false, msg: `Не хватает искр (${food.price}). Сыграй в игру или выполни ритуал!` };

    const liked = p.personality.likes.includes(food.tag) ? 1.5 : 1;
    p.stats.hunger = clamp(p.stats.hunger + food.hunger * liked, 0, 100);
    p.stats.mood = clamp(p.stats.mood + food.mood * liked, 0, 100);
    p.bond = clamp(p.bond + 1, 0, 100);
    this.bumpCounter('feed');
    this.addXp(4);
    sfx.eat();
    this.setBubble(liked > 1 ? `Ням-ням! ${food.name.toLowerCase()} — моё любимое! Ты волшебник!` : `Ммм, ${food.name.toLowerCase()}! Спасибо!`);
    this.commit();
    return { ok: true, msg: liked > 1 ? 'Любимая еда! Питомец в восторге.' : 'Питомец сыт и доволен.' };
  }

  petStroke() {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return;
    if (p.sleeping) {
      this.setBubble('Тс-с… я сплю и вижу сны. Разбуди, если соскучился.');
      this.emit();
      return;
    }
    const k = this.has('fox_charm') ? 1.6 : 1;
    p.stats.mood = clamp(p.stats.mood + 3 * k, 0, 100);
    p.bond = clamp(p.bond + 0.6, 0, 100);
    p.trust = clamp(p.trust + 0.3, 0, 100);
    s.fx = { kind: 'pet', at: Date.now() };
    this.setBubble(pick(Math.random, ['Мррр… ещё, пожалуйста!', 'Хи-хи, щекотно!', 'Это лучшее место на свете — твоя ладонь.']));
    this.bumpCounter('pet');
    this.addXp(1);
    sfx.purr();
    this.commit();
  }

  cleanRoom(): { ok: boolean; msg: string } {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return { ok: false, msg: '' };
    const last = s.counters.lastClean ?? 0;
    if (Date.now() - last < 40000) return { ok: false, msg: 'Тут и так чисто! Блеск!' };
    s.counters.lastClean = Date.now();
    p.stats.cleanliness = clamp(p.stats.cleanliness + 35, 0, 100);
    p.stats.mood = clamp(p.stats.mood + 2, 0, 100);
    this.bumpCounter('clean');
    this.addXp(3);
    s.fx = { kind: 'clean', at: Date.now() };
    this.setBubble('Вжух-вжух! Мётла танцует, пыль разбегается!');
    sfx.sparkle();
    this.commit();
    return { ok: true, msg: 'В комнате стало чище' };
  }

  bathPet(): { ok: boolean; msg: string } {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return { ok: false, msg: '' };
    if (p.sleeping) return { ok: false, msg: 'Спит. Купание подождёт до утра.' };
    const last = s.counters.lastBath ?? 0;
    if (Date.now() - last < 40000) return { ok: false, msg: 'Он уже чистый-пречистый!' };
    s.counters.lastBath = Date.now();
    p.stats.cleanliness = 100;
    p.stats.mood = clamp(p.stats.mood + 8, 0, 100);
    p.bond = clamp(p.bond + 1.5, 0, 100);
    this.bumpCounter('clean');
    this.addXp(4);
    s.fx = { kind: 'bath', at: Date.now() };
    this.setBubble('Буль-буль-буль! Я теперь пахну облаком и немножко ромашкой.');
    sfx.splash();
    this.commit();
    return { ok: true, msg: `${p.name} выкупан и сияет!` };
  }

  toggleSleep() {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return;
    p.sleeping = !p.sleeping;
    if (p.sleeping) {
      this.setBubble('Хрр… хрр… (это я так тихо соплю во сне)');
    } else {
      p.stats.mood = clamp(p.stats.mood + 2, 0, 100);
      this.setBubble('Потягушки! Я выспался. Чем займёмся?');
      sfx.pop();
    }
    this.commit();
  }

  /* ---------- прогулки ---------- */
  walkVisit(locName: string, story: string): { ok: boolean; msg: string; coins: number; souvenir?: string } {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return { ok: false, msg: '', coins: 0 };
    if (p.sleeping) return { ok: false, msg: 'Спит — гулять пойдёт позже.', coins: 0 };
    if (p.stats.energy < 12) return { ok: false, msg: 'Питомец устал — дай ему отдохнуть.', coins: 0 };
    p.stats.energy = clamp(p.stats.energy - 12, 0, 100);
    p.stats.mood = clamp(p.stats.mood + 8, 0, 100);
    p.bond = clamp(p.bond + 2, 0, 100);
    const lucky = this.has('trail_sense') || this.has('crumb_finder') ? 1.4 : 1;
    const coins = Math.round((15 + Math.random() * 15) * lucky);
    s.coins += coins;
    let souvenir: string | undefined;
    if (Math.random() < 0.3) {
      souvenir = pick(Math.random, KEEPSAKES).id;
      this.inv(souvenir, 1);
    }
    this.growSkill('любознательность', 3);
    this.growSkill('спорт', 1);
    this.bumpCounter('walk');
    this.addXp(12);
    this.addMemory('момент', `Гуляли: ${locName}`);
    this.setBubble(story.length > 70 ? story.slice(0, 67) + '…' : story);
    sfx.chime();
    this.commit();
    return { ok: true, msg: `Прогулка: ${locName}`, coins, souvenir };
  }

  /* ---------- учёба ---------- */
  randomFact(): { title: string; text: string } {
    return FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
  }
  learnFact(fact: { title: string; text: string }) {
    const p = this.state.pet; if (!p) return;
    p.knowledge = [...new Set([...p.knowledge, 'fact:' + fact.title])].slice(-300);
    this.addMemory('факт', `${fact.title}: ${fact.text.slice(0, 100)}`);
  }
  answerStudy(correct: boolean, subject: string): { reward: number } {
    const s = this.state; const p = s.pet; if (!p) return { reward: 0 };
    this.bumpCounter('study');
    const k = this.has('nebula_mind') || this.has('cache_memory') ? 1.3 : 1;
    let reward = 0;
    if (correct) {
      reward = Math.round(10 * k);
      s.coins += reward;
      this.growSkill('интеллект', 3);
      this.addXp(10);
      p.stats.mood = clamp(p.stats.mood + 3, 0, 100);
      if (!p.knowledge.includes(subject)) p.knowledge = [...p.knowledge, subject].slice(-300);
    } else {
      this.growSkill('интеллект', 1);
      this.addXp(4);
    }
    p.bond = clamp(p.bond + 0.8, 0, 100);
    this.commit();
    return { reward };
  }

  /* ---------- рост ---------- */
  private growSkill(key: string, v: number) {
    const p = this.state.pet; if (!p) return;
    const cur = p.growth.skills[key] ?? 0;
    p.growth.skills = { ...p.growth.skills, [key]: cur + v };
    const def = SKILLS.find(s => s.key === key);
    if (def && cur < TRAIT_THRESHOLD && cur + v >= TRAIT_THRESHOLD && !p.evolutionTraits.includes(def.trait)) {
      p.evolutionTraits = [...p.evolutionTraits, def.trait];
      this.setBubble(`Ух ты! Я почувствовал в себе новое: ${def.trait}!`);
      sfx.levelup();
    }
  }

  private addXp(xp: number) {
    const p = this.state.pet; if (!p) return;
    p.growth.xp += xp;
    let need = 80 + p.growth.level * 40;
    while (p.growth.xp >= need) {
      p.growth.xp -= need;
      p.growth.level++;
      this.setBubble(`Уровень ${p.growth.level}! Я расту-расту-расту!`);
      sfx.levelup();
      need = 80 + p.growth.level * 40;
    }
  }

  private bumpCounter(key: string) {
    const s = this.state;
    s.counters = { ...s.counters, [key]: (s.counters[key] ?? 0) + 1 };
    for (const q of s.quests) {
      if (q.metric === key && !q.claimed) q.progress = Math.min(q.target, q.progress + 1);
    }
  }

  addMemory(kind: MemoryItem['kind'], text: string) {
    this.state.memories = [...this.state.memories, { id: uid(), kind, text, at: Date.now() }].slice(-120);
  }

  /* ---------- мини-игры / фокус ---------- */
  finishMinigame(kind: 'memory' | 'firefly' | 'echo' | 'hangman' | 'puzzle' | 'sudoku', score: number): number {
    const p = this.state.pet; if (!p) return 0;
    const lucky = this.has('pixel_luck') ? 1.2 : 1;
    const reward = Math.max(8, Math.round(score * lucky));
    const skillMap: Record<string, string> = { memory: 'интеллект', firefly: 'спорт', echo: 'творчество', hangman: 'интеллект', puzzle: 'интеллект', sudoku: 'интеллект' };
    this.state.coins += reward;
    p.stats.mood = clamp(p.stats.mood + 6, 0, 100);
    p.stats.energy = clamp(p.stats.energy - 5, 0, 100);
    p.bond = clamp(p.bond + 2, 0, 100);
    this.growSkill(skillMap[kind] ?? 'интеллект', 2);
    this.bumpCounter('play');
    this.addXp(10);
    this.addMemory('момент', `Сыграли в мини-игру, счёт ${score}`);
    sfx.coin();
    this.setBubble('Это было здорово! Ещё разок? Ещё разочек?');
    this.commit();
    return reward;
  }

  startFocus(minutes: number) {
    const s = this.state;
    s.focusMinutes = minutes;
    s.focusEndsAt = Date.now() + minutes * 60000;
    this.setBubble(`Тихо-тихо… ${minutes} минут фокуса. Я буду заниматься вместе с тобой!`);
    this.commit();
  }

  /* ---------- квесты ---------- */
  private ensureQuests() {
    const s = this.state;
    const today = dayKeyOf(Date.now());
    if (s.questDay === today && s.quests.length > 0) return;
    const rng = mulberry32(parseInt(today.replace(/-/g, ''), 10) % 2147483647);
    const pool = [...QUEST_POOL];
    const chosen = [];
    for (let i = 0; i < 4 && pool.length; i++) chosen.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    s.quests = chosen.map(q => ({ id: q.id, metric: q.metric, text: q.text, target: q.target, reward: q.reward, progress: 0, claimed: false }));
    s.questDay = today;
  }
  claimQuest(questId: string) {
    const s = this.state;
    const q = s.quests.find(x => x.id === questId);
    if (!q || q.claimed || q.progress < q.target) return;
    q.claimed = true;
    const reward = this.has('spark_burp') ? Math.round(q.reward * 1.2) : q.reward;
    s.coins += reward;
    this.setBubble(`Ритуал выполнен! +${reward} искр. Мы с тобой — отличная команда.`);
    sfx.coin();
    this.commit();
  }

  /* ---------- магазин / гардероб / подарки ---------- */
  buy(itemId: string): { ok: boolean; msg: string } {
    const s = this.state;
    const item = SHOP.find(i => i.id === itemId); if (!item) return { ok: false, msg: '' };
    if (item.kind === 'furniture' && s.furniture.includes(itemId)) return { ok: false, msg: 'Уже стоит в комнате!' };
    if (item.kind !== 'furniture' && (s.inventory[itemId] ?? 0) > 0) return { ok: false, msg: 'Уже в рюкзаке!' };
    if (s.coins < item.price) return { ok: false, msg: `Не хватает искр: нужно ${item.price}.` };
    s.coins -= item.price;
    if (item.kind === 'furniture') {
      s.furniture = [...s.furniture, itemId];
      this.setBubble(`Ого, ${item.name.toLowerCase()}! Комната стала ещё уютнее.`);
    } else {
      this.inv(itemId, 1);
      this.setBubble(`${item.name}! Примерим? Ну пожалуйста-пожалуйста!`);
    }
    sfx.coin();
    this.commit();
    return { ok: true, msg: `Куплено: ${item.name}` };
  }

  equip(itemId: string, slot: keyof Pet['outfit']) {
    const p = this.state.pet; if (!p) return;
    p.outfit[slot] = p.outfit[slot] === itemId ? null : itemId;
    if (p.outfit[slot]) this.setBubble('Ну как? Я в этом великолепен. Скромно, но великолепен.');
    this.commit();
  }

  setRoomTheme(themeId: string) { this.state.roomTheme = themeId; this.commit(); }

  giveGift(itemId: string): { ok: boolean; msg: string } {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return { ok: false, msg: '' };
    const owned = s.inventory[itemId] ?? 0;
    if (owned <= 0) return { ok: false, msg: 'Подарка нет в рюкзаке.' };
    this.inv(itemId, -1);
    const def = [...SHOP, ...KEEPSAKES].find(i => i.id === itemId);
    p.bond = clamp(p.bond + 4, 0, 100);
    p.trust = clamp(p.trust + 3, 0, 100);
    p.stats.mood = clamp(p.stats.mood + 10, 0, 100);
    this.bumpCounter('gift');
    this.addXp(8);
    this.addMemory('подарок', `Подарили: ${def?.name ?? 'подарок'}`);
    this.setBubble(`Ого! ${def?.name ?? 'Подарок'}! Я буду хранить его в самом тёплом месте сердца!`);
    sfx.chime();
    this.commit();
    return { ok: true, msg: `${p.name} в восторге от подарка!` };
  }

  /* ---------- болталка ---------- */
  async sendChat(text: string) {
    const s = this.state; const p = s.pet; if (!p) return;
    s.chat.push({ id: uid(), from: 'owner', text, at: Date.now() });
    this.bumpCounter('talk');

    // 1) знания из сети (работает без всяких моделей)
    const fact = await this.webKnowledge(text);

    // 2) движок намерений: игры в чате, сказки, извлечение фактов
    const brain = chatBrain(text, s, fact ?? undefined);
    if (brain.save) this.addMemory(brain.save.kind, brain.save.text);
    if (brain.ownerName) { s.owner.name = brain.ownerName; }
    if (brain.favorite && !s.owner.favorites.includes(brain.favorite)) s.owner.favorites.push(brain.favorite);
    if (brain.save?.kind === 'обещание') s.owner.promises.push(brain.save.text);
    if (brain.moodDelta) p.stats.mood = clamp(p.stats.mood + brain.moodDelta, 0, 100);
    s.chat = s.chat.slice(-60);
    this.growSkill('эмпатия', 0.4);
    this.save(); this.emit();

    const replyLines = [...brain.lines];

    // 3) иногда — «ассоциация из головы» от маленькой нейросети
    if (Math.random() < 0.2) {
      const assoc = this.neuroThought(text);
      if (assoc && assoc.length > 12) {
        replyLines.push(Math.random() < 0.5
          ? `Кстати, ${assoc.charAt(0).toLowerCase() + assoc.slice(1)}.`
          : `…и знаешь что? ${assoc}`);
      }
    }

    // нейросеть впитывает реплику хозяина и ответы — словарь растёт
    this.brainLearn([text, ...replyLines]);

    replyLines.forEach((line, i) => {
      setTimeout(() => {
        s.chat.push({ id: uid(), from: 'pet', text: line, at: Date.now() });
        s.chat = s.chat.slice(-60);
        if (i === 0) this.setBubble(line.length > 60 ? line.slice(0, 57) + '…' : line);
        sfx.bubble();
        this.save(); this.emit();
      }, 700 + i * 1300);
    });
  }

  /** Умная проактивная реплика: погода, факты, воспоминания, мысли. */
  smartProactive(): string | null {
    const s = this.state; const p = s.pet; if (!p || p.sleeping || p.transcended) return null;
    const today = dayKeyOf(Date.now());

    const wr = s.weatherReal;
    const warnedToday = !!s.counters.weatherWarnAt && dayKeyOf(s.counters.weatherWarnAt) === today;
    if (wr && (wr.kind === 'rain' || wr.kind === 'snow') && !warnedToday) {
      s.counters = { ...s.counters, weatherWarnAt: Date.now() };
      this.addMemory('факт', `Предупредил о погоде: ${wr.label}`);
      return wr.kind === 'snow'
        ? `За окном сегодня снег, ${wr.temp}°. Одевайся теплее! Я уже надел воображаемый шарф.`
        : `Похоже, сегодня дождь, ${wr.temp}°. Не забудь зонт! А лужи я посторожу.`;
    }

    const roll = Math.random();
    if (roll < 0.25) {
      const facts = s.memories.filter(m => m.kind === 'факт');
      if (facts.length && Math.random() < 0.6) {
        const f = facts[Math.floor(Math.random() * facts.length)];
        return `Помнишь, я узнал: ${f.text.toLowerCase()}`;
      }
      const good = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
      return `Добрая новость из мира: ${good.title.toLowerCase()} — ${good.text.toLowerCase()}`;
    }
    if (roll < 0.45) {
      const t = this.neuroThought();
      if (t) return Math.random() < 0.5 ? `Я тут вспомнил: ${t.charAt(0).toLowerCase() + t.slice(1)}.` : `Знаешь, о чём я думаю? ${t}`;
    }
    return null;
  }

  /* ---------- пузырь и эффекты ---------- */
  setBubble(text: string) { this.state.bubble = { text, at: Date.now() }; }
  clearBubble() { if (this.state.bubble) { this.state.bubble = null; this.emit(); } }
  clearFx() { if (this.state.fx) { this.state.fx = null; this.emit(); } }

  /* ---------- рождение, наследие, прощание ---------- */
  hatchEgg(): Pet {
    const s = this.state;
    if (s.pet) return s.pet;
    const seed = ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) % 2147483647;
    const inherit = s.inherit ? { colorPrimary: s.inherit.color, speciesKey: s.inherit.species } : null;
    const dna = generateDNA(seed, inherit);
    const rng = mulberry32(seed ^ 0x9e3779b9);
    const personality = generatePersonality(rng, dna);
    const pet: Pet = {
      id: uid(),
      name: this.makeName(dna, rng),
      dna,
      personality,
      stats: { hunger: 70, energy: 85, mood: 78, cleanliness: 90 },
      growth: { xp: 0, level: 1, bornAt: Date.now(), skills: {} },
      outfit: { hat: null, scarf: null, glasses: null, wings: null },
      bond: inherit ? 15 : 5,
      trust: inherit ? 55 : 40,
      sleeping: false,
      transcended: false,
      evolutionTraits: [],
      wordsLearned: [],
      knowledge: [],
    };
    s.pet = pet;
    s.freshHatch = true;
    sfx.hatch();
    this.commit();
    return pet;
  }

  private makeName(dna: ReturnType<typeof generateDNA>, rng: () => number): string {
    const sp = speciesOf(dna.species);
    let name = pick(rng, sp.syllA) + pick(rng, sp.syllB);
    if (rng() < 0.5) name += pick(rng, sp.syllB);
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  renamePet(name: string) {
    const p = this.state.pet; if (!p) return;
    p.name = (name.trim() || p.name).slice(0, 14);
    this.commit();
  }
  completeReveal() { this.state.freshHatch = false; this.commit(); }

  private transcend() {
    const s = this.state; const p = s.pet; if (!p) return;
    p.transcended = true;
    const days = Math.max(1, Math.round((Date.now() - p.growth.bornAt) / 86400000));
    const entry: LegacyEntry = {
      id: uid(),
      name: p.name,
      species: speciesOf(p.dna.species).label,
      rarity: p.dna.rarity,
      days,
      bonus: RARITY_BONUS[p.dna.rarity],
      colorPrimary: p.dna.colorPrimary,
      epitaph: `${p.name} прожил ${days} дней в тепле и любопытстве. Теперь он — дух памяти: светится тихонько и ждёт новую жизнь, чтобы передать ей свою мудрость.`,
      at: Date.now(),
    };
    s.pendingFarewell = entry;
    this.commit();
  }

  startNewGeneration(): LegacyEntry | null {
    const s = this.state;
    const entry = s.pendingFarewell;
    const p = s.pet;
    if (entry) {
      s.legacy = [entry, ...s.legacy].slice(0, 12);
      const src = p ?? null;
      s.inherit = { color: entry.colorPrimary, species: src?.dna.species };
    }
    s.pendingFarewell = null;
    s.pet = null;
    s.chat = [];
    s.dialog = { pendingQuestion: null, lastIntent: '', turn: 0, game: null };
    this.commit();
    return entry;
  }

  dismissFarewell() { this.state.pendingFarewell = null; this.commit(); }

  /* ---------- реальная погода ---------- */
  setCity(city: string) {
    this.state.owner.city = city.trim();
    this.state.owner.geo = null;
    this.commit();
    void this.refreshWeather();
  }

  async refreshWeather() {
    const o = this.state.owner;
    let lat: number | undefined = o.geo?.lat, lon: number | undefined = o.geo?.lon;
    const city = o.city;
    try {
      if (lat == null && city.trim()) {
        const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1&language=ru&format=json`);
        const gd = await g.json();
        const r = gd?.results?.[0];
        if (r && typeof r.latitude === 'number' && typeof r.longitude === 'number') {
          lat = r.latitude; lon = r.longitude;
          o.geo = { lat: r.latitude, lon: r.longitude };
          if (r.name) o.city = r.name;
        }
      }
      if (lat == null || lon == null) return;
      const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const wd = await w.json();
      const code = wd?.current_weather?.weathercode;
      const temp = Math.round(wd?.current_weather?.temperature ?? 0);
      if (code == null) return;
      const map = this.mapWmo(code);
      this.state.weatherReal = { kind: map.kind, label: `${map.label}, ${temp}°`, temp, at: Date.now() };
      this.save(); this.emit();
    } catch { /* нет интернета — остаётся сезонная погода */ }
  }

  private mapWmo(code: number): { kind: string; label: string } {
    if (code === 0) return { kind: 'clear', label: 'Ясно' };
    if (code <= 2) return { kind: 'clouds', label: 'Облачно' };
    if (code === 3) return { kind: 'clouds', label: 'Пасмурно' };
    if (code <= 48) return { kind: 'clouds', label: 'Туман' };
    if (code <= 57) return { kind: 'rain', label: 'Морось' };
    if (code <= 67) return { kind: 'rain', label: 'Дождь' };
    if (code <= 77) return { kind: 'snow', label: 'Снег' };
    if (code <= 82) return { kind: 'rain', label: 'Ливень' };
    if (code <= 86) return { kind: 'snow', label: 'Снегопад' };
    return { kind: 'rain', label: 'Гроза' };
  }

  /* ---------- настройки / перенос ---------- */
  setSound(on: boolean) { this.state.settings.sound = on; setSoundEnabled(on); this.commit(); }
  setReminders(on: boolean) { this.state.settings.reminders = on; this.commit(); }

  exportSave(): string {
    this.save();
    // вместе с состоянием питомца переносится и его мозг (нейросеть)
    const payload = { __lumos: 2, state: this.state, brain: this.lm ? this.lm.serialize() : null };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }
  importSave(code: string): boolean {
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (parsed && parsed.__lumos === 2 && parsed.state && parsed.state.version === 1) {
        this.state = { ...defaultState(), ...parsed.state };
        if (parsed.brain) {
          const lm = MiniLM.deserialize(parsed.brain);
          if (lm) { this.lm = lm; this.saveBrain(); }
        }
        this.save(); this.emit();
        return true;
      }
      if (parsed && parsed.version === 1) {
        this.state = { ...defaultState(), ...parsed };
        this.save(); this.emit();
        return true;
      }
      return false;
    } catch { return false; }
  }
  resetAll() {
    try { localStorage.removeItem(KEY); localStorage.removeItem(BRAIN_KEY); } catch { /* noop */ }
    this.state = defaultState();
    this.lm = null;
    this.initBrain();
    this.emit();
  }
}

export const engine = new Engine();
setSoundEnabled(engine.state.settings.sound);
