/* ============================================================
 * GameEngine — сердце «Люмоса». Чистый ES6-синглтон вне React:
 * состояние, тики, офлайн-симуляция, уход, прогулки, учёба,
 * квесты, память, сны, дневник, наследие, реальная погода.
 * ============================================================ */
import type { GameState, Pet, MemoryItem, OfflineEvent, LegacyEntry } from './types';
import { generateDNA, generatePersonality, mulberry32, pick, uid, speciesOf, RARITY_BONUS } from './dna';
import { FOODS, SHOP, KEEPSAKES, QUEST_POOL, SKILLS, TRAIT_THRESHOLD } from './content';
import { makeDreamText, dreamGiftId, makeDiaryText, MOOD_WORDS, OFFLINE_EVENTS, chatBrain, welcomeLine, WORDS, correctText } from './speech';
import { purr, thud, celebrate, tick } from '../native/haptics';
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
    if (r < 30) return { kind: 'rain', label: 'Дождь' };
    if (r < 50) return { kind: 'clouds', label: 'Облачно' };
    if (r < 62) return { kind: 'wind', label: 'Ветер' };
    return { kind: 'clear', label: 'Ясно' };
  }
  if (m >= 6 && m <= 8) {
    if (r < 20) return { kind: 'rain', label: 'Дождь' };
    if (r < 32) return { kind: 'clouds', label: 'Облачно' };
    return { kind: 'clear', label: 'Ясно' };
  }
  if (r < 35) return { kind: 'rain', label: 'Дождь' };
  if (r < 55) return { kind: 'wind', label: 'Ветер' };
  if (r < 70) return { kind: 'clouds', label: 'Облачно' };
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
    inventory: { berries: 3, honey: 2 },
    roomTheme: 'dusk',
    furniture: ['furn_rug'],
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
    dialog: { pendingQuestion: null, lastIntent: '', turn: 0 },
  };
}

class Engine {
  state: GameState = defaultState();
  private listeners = new Set<() => void>();
  private lm: MiniLM | null = null; // языковая нейросеть питомца
  private brainDirty = false;

  constructor() { this.load(); }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach(fn => fn()); }
  save() {
    this.state.lastSeen = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch { /* приватный режим */ }
    // мозг сохраняется вместе с состоянием, когда он чему-то научился
    if (this.brainDirty) { this.saveBrain(); this.brainDirty = false; }
  }
  private load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as GameState;
      if (!parsed || parsed.version !== 1 || typeof parsed !== 'object') return;
      // строгая валидация: повреждённый или слишком старый сейв отбрасываем,
      // чтобы игра всегда запускалась
      if (!this.isValid(parsed)) { localStorage.removeItem(KEY); return; }
      this.state = { ...defaultState(), ...parsed };
      const s = this.state;
      const d = defaultState();
      const fill = <T extends object>(def: T, v: Partial<T> | null | undefined): T => ({ ...def, ...(v ?? {}) });
      s.owner = fill(d.owner, s.owner);
      s.settings = fill(d.settings, s.settings);
      if (s.pet) {
        s.pet.stats = fill({ hunger: 70, energy: 85, mood: 78, cleanliness: 90 }, s.pet.stats);
        s.pet.growth = fill({ xp: 0, level: 1, bornAt: Date.now(), skills: {} as Record<string, number> }, s.pet.growth);
        s.pet.outfit = fill<Pet['outfit']>({ hat: null, scarf: null, glasses: null, wings: null }, s.pet.outfit);
        s.pet.personality = fill<Pet['personality']>({ temperament: 'любопытный', likes: [], dislikes: [], traits: ['любопытный'] }, s.pet.personality);
        s.pet.knowledge = Array.isArray(s.pet.knowledge) ? s.pet.knowledge : [];
        s.pet.wordsLearned = Array.isArray(s.pet.wordsLearned) ? s.pet.wordsLearned : [];
        s.pet.evolutionTraits = Array.isArray(s.pet.evolutionTraits) ? s.pet.evolutionTraits : [];
      }
      s.inventory = (s.inventory && typeof s.inventory === 'object') ? s.inventory : {};
      s.furniture = Array.isArray(s.furniture) ? s.furniture : ['furn_rug'];
      s.counters = (s.counters && typeof s.counters === 'object') ? s.counters : {};
      s.fx = null;
    } catch {
      try { localStorage.removeItem(KEY); } catch { /* noop */ }
    }
  }

  private isValid(s: GameState): boolean {
    if (!Array.isArray(s.memories) || !Array.isArray(s.diary) || !Array.isArray(s.dreams) || !Array.isArray(s.quests)) return false;
    if (s.owner && typeof s.owner !== 'object') return false;
    const p = s.pet as Pet | null;
    if (p) {
      if (!p.dna || typeof p.dna !== 'object' || typeof p.dna.species !== 'string') return false;
      if (!p.stats || typeof p.stats !== 'object') return false;
      if (!p.growth || typeof p.growth !== 'object' || typeof p.growth.bornAt !== 'number') return false;
      if (!p.personality || !Array.isArray(p.personality.likes)) return false;
    }
    return true;
  }
  private commit() { this.save(); this.emit(); }

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

  /* ==================== нейросеть питомца ==================== */
  /** загрузить мозг из localStorage или вырастить новый */
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
    try { localStorage.setItem(BRAIN_KEY, JSON.stringify(this.lm.serialize())); } catch { /* переполнение — не страшно */ }
  }

  /** онлайн-дообучение на репликах разговора */
  private brainLearn(lines: string[]) {
    const lm = this.lm; if (!lm) return;
    for (const l of lines) if (l) lm.learnLine(l);
    this.brainDirty = true; // сохранится вместе с ближайшим save()
  }

  /** мысль «из головы» — сеть продолжает фразу, начатую с ключевых слов */
  neuroThought(seedText?: string): string {
    const lm = this.lm; if (!lm || !lm.ready) return '';
    let seeds: string[] = [];
    if (seedText) seeds = lm.tokenize(seedText).filter(w => lm.knows(w) && !Engine.STOPWORDS.has(w));
    if (!seeds.length && this.state.pet) {
      const pool = [
        ...this.state.pet.wordsLearned,
        ...this.state.pet.knowledge.filter(k => !k.startsWith('fact:')),
      ];
      if (pool.length) seeds = [pool[Math.floor(Math.random() * pool.length)]];
    }
    return lm.generate(seeds.slice(0, 2), 13, 0.9);
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

  /** проактивная «умная» реплика: погода, факты, воспоминания сети */
  smartProactive(): string | null {
    const s = this.state; const p = s.pet; if (!p || p.sleeping || p.transcended) return null;
    const today = dayKeyOf(Date.now());

    // предупреждение о плохой погоде (раз в день)
    const wr = s.weatherReal;
    const warnedToday = !!s.counters.weatherWarnAt && dayKeyOf(s.counters.weatherWarnAt) === today;
    if (wr && (wr.kind === 'rain' || wr.kind === 'snow') && !warnedToday) {
      s.counters.weatherWarnAt = Date.now();
      this.addMemory('факт', `Предупредил о погоде: ${wr.label}`);
      return wr.kind === 'snow'
        ? `За окном сегодня снег${wr.temp ? `, ${wr.temp}°` : ''}. Одевайся теплее! Я уже надел воображаемый шарф.`
        : `Похоже, сегодня дождь${wr.temp ? `, ${wr.temp}°` : ''}. Не забудь зонт! А лужи я посторожу.`;
    }

    const roll = Math.random();
    // добрая новость / выученный факт — делимся знаниями чаще
    if (roll < 0.4) {
      const facts = s.memories.filter(m => m.kind === 'факт');
      if (facts.length && Math.random() < 0.65) {
        const f = facts[Math.floor(Math.random() * facts.length)];
        return `Помнишь, я узнал: ${f.text.toLowerCase()}`;
      }
      const good = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
      return `Добрая новость из мира: ${good.title.toLowerCase()} — ${good.text.toLowerCase()}`;
    }

    // мысль, сгенерированная нейросетью — питомец делится своими размышлениями
    if (roll < 0.62) {
      const t = this.neuroThought();
      if (t) return Math.random() < 0.5 ? `Я тут подумал: ${t.charAt(0).toLowerCase() + t.slice(1)}.` : `Знаешь, о чём я размышляю? ${t}`;
    }
    return null;
  }

  /**
   * Самообучение во сне: пока питомец спит и есть интернет,
   * нейросеть читает случайную статью Википедии (книги, культура,
   * наука) и дообучается на ней. Словарь и счётчик слов растут.
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
    // изредка фиксируем выученное как знание питомца
    if (Math.random() < 0.5) {
      p.knowledge = [...new Set([...p.knowledge, 'fact:' + fact.title])].slice(-300);
    }
    this.brainDirty = true;
    this.save();
    return true;
  }

  tick() {
    const s = this.state;
    const p = s.pet;
    if (!p || p.transcended) { this.checkDayChange(); return; }
    const phase = timePhase();
    const night = phase === 'night';

    if (p.sleeping) {
      const fast = this.has('deep_sleep') || this.has('cozy_den') || this.has('ember_heart');
      p.stats.energy = clamp(p.stats.energy + (fast ? 1.1 : 0.7), 0, 100);
      p.stats.hunger = clamp(p.stats.hunger - 0.006, 12, 100);
      // просыпается сам: выспался или настало утро
      const morning = phase === 'morning';
      if (p.stats.energy >= 100 || (morning && p.stats.energy > 75)) {
        p.sleeping = false;
        p.stats.mood = clamp(p.stats.mood + 6, 0, 100);
        this.setBubble(morning ? 'Доброе утро! Мне снилось что-то очень круглое и тёплое.' : 'Выспался! Я снова полон искр.');
      }
    } else {
      const moss = (this.has('calm_moss') || this.has('night_prowl')) ? 0.55 : 1;
      p.stats.hunger = clamp(p.stats.hunger - 0.011, 12, 100);
      p.stats.energy = clamp(p.stats.energy - 0.006 * moss, 8, 100);
      const dust = this.has('gravity_nap') ? 0.6 : 1;
      p.stats.cleanliness = clamp(p.stats.cleanliness - 0.005 * dust, 10, 100);
      let target = 38 + p.bond * 0.35;
      if (night && this.has('starlight')) target = Math.max(target, 60);
      let dm = (target - p.stats.mood) * 0.004;
      if (p.stats.hunger < 25) dm -= 0.05;
      if (p.stats.energy < 20) dm -= 0.03;
      if (this.has('purr_heal') && p.stats.mood < 70) dm += 0.03;
      p.stats.mood = clamp(p.stats.mood + dm, 10, 100);
      // засыпает сам: очень устал или пришла ночь
      if (p.stats.energy <= 9 && Math.random() < 0.05) {
        p.sleeping = true;
        this.setBubble('Глазки закрылись сами… z-z-z…');
      } else if (night && p.stats.energy < 45 && Math.random() < 0.12) {
        p.sleeping = true;
        this.setBubble('Ночь… звёзды уже спят. И я, пожалуй, тоже…');
      }
    }

    // фокус-таймер
    if (s.focusEndsAt && Date.now() >= s.focusEndsAt) {
      s.focusEndsAt = null;
      const mins = s.focusMinutes || 15;
      const reward = 10 + mins;
      s.coins += reward;
      this.growSkill('интеллект', 1);
      this.bumpCounter('focus');
      this.addMemory('момент', `Вместе сосредоточенно занимались ${mins} минут`);
      this.setBubble(`Целых ${mins} минут фокуса! Я горжусь нами. +${reward} искр.`);
      sfx.levelup();
    }

    this.checkDayChange();
  }

  private checkDayChange() {
    const today = dayKeyOf(Date.now());
    if (this.state.dayKey === today) return;
    const s = this.state;
    const p = s.pet;
    if (p) {
      const w = getWeather();
      const fed = s.counters.feed ?? 0;
      const played = s.counters.play ?? 0;
      s.diary.unshift({
        id: uid(),
        day: Math.max(1, Math.floor((Date.now() - p.growth.bornAt) / 86400000)),
        date: new Date(Date.now() - 86400000).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
        text: makeDiaryText({ ownerName: s.owner.name, fedTimes: fed, playedTimes: played, avgMood: p.stats.mood, weather: w.label.toLowerCase() }),
        moodWord: pick(Math.random, MOOD_WORDS),
      });
      s.diary = s.diary.slice(0, 40);
      const ageDays = (Date.now() - p.growth.bornAt) / 86400000;
      if (!p.transcended && ageDays >= 55) this.transcend();
    }
    s.dayKey = today;
    s.counters = {};
    this.ensureQuests();
    this.save();
    this.emit();
  }

  /* ---------- офлайн-симуляция ---------- */
  private simulateOffline(elapsedMs: number) {
    const s = this.state;
    const p = s.pet!;
    const hours = elapsedMs / hourMs;
    const events: OfflineEvent[] = [];

    const nights = Math.min(6, Math.floor(hours / 6));
    for (let i = 0; i < nights; i++) {
      p.stats.energy = clamp(p.stats.energy + 22, 0, 100);
      const giftRate = this.has('root_song') || this.has('wish_dust') ? 0.55 : 0.3;
      const gift = Math.random() < giftRate ? (dreamGiftId() ?? 'keep_stone') : undefined;
      const text = makeDreamText();
      s.dreams.unshift({ id: uid(), at: Date.now() - (nights - i) * 8 * hourMs, text, gift });
      if (gift) {
        this.inv(gift, 1);
        this.growSkill('магия', 1);
      }
    }
    s.dreams = s.dreams.slice(0, 20);

    p.stats.hunger = clamp(p.stats.hunger - hours * 4, 12, 100);
    p.stats.cleanliness = clamp(p.stats.cleanliness - hours * 2, 10, 100);
    if (!p.sleeping) p.stats.energy = clamp(p.stats.energy - hours * 1.5, 15, 100);
    const target = 38 + p.bond * 0.35;
    p.stats.mood = clamp(p.stats.mood + (target - p.stats.mood) * Math.min(1, hours * 0.08), 15, 100);

    if (hours > 12) {
      p.trust = clamp(p.trust - Math.min(20, hours * 0.4), 5, 100);
      p.bond = clamp(p.bond - hours * 0.1, 5, 100);
      events.push({ icon: 'heart', text: OFFLINE_EVENTS.missed });
    }

    const roll = Math.random();
    if (hours > 2 && p.stats.cleanliness < 55 && roll < 0.4) {
      p.stats.cleanliness = clamp(p.stats.cleanliness + 30, 0, 100);
      events.push({ icon: 'broom', text: OFFLINE_EVENTS.cleaned });
    } else if (hours > 3 && roll < 0.65) {
      this.inv('keep_drawing', 1);
      events.push({ icon: 'drawing', text: OFFLINE_EVENTS.drew });
    }
    if (hours > 6 && Math.random() < 0.6) {
      const pool = WORDS.filter(w => !p.wordsLearned.includes(w));
      const word = pool.length ? pick(Math.random, pool) : pick(Math.random, WORDS);
      if (!p.wordsLearned.includes(word)) p.wordsLearned.push(word);
      events.push({ icon: 'book', text: `${OFFLINE_EVENTS.word}: «${word}»` });
    }
    if (hours > 4 && s.furniture.includes('furn_plant') && Math.random() < 0.5) {
      events.push({ icon: 'plant', text: OFFLINE_EVENTS.plants });
    }
    if (hours > 8 && Math.random() < 0.45) {
      const found = 5 + Math.floor(Math.random() * 10);
      s.coins += found;
      events.push({ icon: 'spark', text: `${OFFLINE_EVENTS.sparks} (+${found})` });
    }
    if (hours > 10 && Math.random() < 0.3) events.push({ icon: 'musicbox', text: OFFLINE_EVENTS.song });

    s.pendingWelcome = {
      awayMs: elapsedMs,
      events: events.slice(0, 4),
      line: welcomeLine(elapsedMs, p.trust, p.name),
    };
  }

  dismissWelcome() {
    const p = this.state.pet;
    this.state.pendingWelcome = null;
    if (p && p.trust < 45) this.setBubble('Ты вернулся. Я… рад. Честно. Дай мне минутку, ладно?');
    this.commit();
  }
  hugOnReturn() {
    const p = this.state.pet;
    this.state.pendingWelcome = null;
    if (p) {
      p.trust = clamp(p.trust + 8, 0, 100);
      p.bond = clamp(p.bond + 4, 0, 100);
      p.stats.mood = clamp(p.stats.mood + 10, 0, 100);
      this.addMemory('момент', 'Встретились после разлуки — обнимашки на десять баллов');
      this.setBubble('Вот теперь всё правильно. Ты здесь, я здесь — мир на месте.');
      sfx.chime();
    }
    this.commit();
  }

  /* ---------- способности ---------- */
  has(abilityId: string) { return this.state.pet?.dna.abilityId === abilityId; }

  addMemory(kind: MemoryItem['kind'], text: string) {
    const s = this.state;
    s.memories.unshift({ id: uid(), kind, text, at: Date.now() });
    s.memories = s.memories.slice(0, 60);
  }

  /** иммутабельное изменение инвентаря — чтобы UI гарантированно обновлялся */
  private inv(id: string, delta: number) {
    const s = this.state;
    s.inventory = { ...s.inventory, [id]: (s.inventory[id] ?? 0) + delta };
  }

  growSkill(key: string, amount: number) {
    const p = this.state.pet; if (!p) return;
    const before = p.growth.skills[key] ?? 0;
    const after = before + amount;
    p.growth.skills[key] = after;
    const def = SKILLS.find(sk => sk.key === key);
    if (def && before < TRAIT_THRESHOLD && after >= TRAIT_THRESHOLD && !p.evolutionTraits.includes(def.trait)) {
      p.evolutionTraits.push(def.trait);
      this.setBubble(`Я чувствую… во мне растёт ${key}! Посмотри, что изменилось!`);
      this.addMemory('момент', `У меня появилась черта: ${def.trait}`);
      sfx.sparkle();
    }
  }
  addXp(n: number) {
    const p = this.state.pet; if (!p) return;
    let amount = n;
    if (this.has('nebula_mind')) amount *= 1.25;
    p.growth.xp += amount;
    let need = 80 + p.growth.level * 40;
    while (p.growth.xp >= need) {
      p.growth.xp -= need;
      p.growth.level++;
      this.state.coins += 15;
      this.setBubble(`Уровень ${p.growth.level}! Я расту, как тесто на дрожжах из звёздной пыли.`);
      sfx.levelup();
      void celebrate();
      need = 80 + p.growth.level * 40;
    }
  }
  private bumpCounter(metric: string) {
    const s = this.state;
    s.counters[metric] = (s.counters[metric] ?? 0) + 1;
    s.quests.forEach(q => { if (q.metric === metric && !q.claimed) q.progress = Math.min(q.target, q.progress + 1); });
  }

  /* ---------- уход ---------- */
  setBubble(text: string) { this.state.bubble = { text, at: Date.now() }; }
  clearBubble() { if (this.state.bubble) { this.state.bubble = null; this.emit(); } }
  clearFx() { if (this.state.fx) { this.state.fx = null; this.emit(); } }

  feed(foodId: string): { ok: boolean; msg: string } {
    const s = this.state; const p = s.pet; if (!p) return { ok: false, msg: '' };
    if (p.sleeping) return { ok: false, msg: 'Тс-с… он спит. Еда подождёт.' };
    const food = FOODS.find(f => f.id === foodId); if (!food) return { ok: false, msg: 'Нет такой еды.' };
    const owned = s.inventory[foodId] ?? 0;
    if (owned > 0) this.inv(foodId, -1);
    else if (s.coins >= food.price) s.coins -= food.price;
    else return { ok: false, msg: `Не хватает искр (${food.price}). Сыграйте в игру или сходите на прогулку!` };
    const liked = p.personality.likes.includes(food.tag);
    const disliked = p.personality.dislikes.includes(food.tag);
    p.stats.hunger = clamp(p.stats.hunger + food.hunger * (liked ? 1.5 : 1), 0, 100);
    p.stats.mood = clamp(p.stats.mood + food.mood + (disliked ? -3 : 0), 0, 100);
    this.bumpCounter('feed');
    this.addXp(2);
    sfx.eat();
    void thud();
    if (liked) this.setBubble(`Ммм! ${food.name} — моё любимое! Ты знаешь путь к моему сердцу.`);
    else if (disliked) this.setBubble(`Спасибо… но ${food.name} — не совсем моё. Я съел. Честно.`);
    else this.setBubble(`Ням! ${food.name}. Вкусно почти до слёз.`);
    this.commit();
    return { ok: true, msg: `${p.name} съедает: ${food.name}${liked ? ' — обожает!' : ''}` };
  }

  petStroke() {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return;
    if (p.sleeping) { this.setBubble('Тс-с… я сплю и вижу сон. Разбудишь — погладишь.'); this.commit(); return; }
    const last = s.counters.lastPetAt ?? 0;
    if (Date.now() - last < 900) return;
    s.counters.lastPetAt = Date.now();
    const charm = this.has('fox_charm') ? 1.5 : 1;
    const jelly = this.has('jelly_hug') ? 2 : 1;
    p.stats.mood = clamp(p.stats.mood + 2 * charm * jelly, 0, 100);
    p.bond = clamp(p.bond + 0.6 * jelly, 0, 100);
    p.trust = clamp(p.trust + 0.4, 0, 100);
    this.growSkill('эмпатия', 0.5);
    this.bumpCounter('pet');
    this.addXp(1);
    s.fx = { kind: 'pet', at: Date.now() };
    if (Math.random() < 0.3) {
      const lines = ['Мррр… ещё, пожалуйста!', 'Хи-хи, щекотно!', 'Это лучшее место на свете — твоя ладонь.', 'Мур-мур-мур…'];
      this.setBubble(lines[Math.floor(Math.random() * lines.length)]);
    }
    sfx.purr();
    void purr();
    this.commit();
  }

  cleanRoom(): { ok: boolean; msg: string } {
    const p = this.state.pet; if (!p) return { ok: false, msg: '' };
    if (p.stats.cleanliness > 92) { this.setBubble('Тут и так сверкает! Я лично проверял каждый уголок.'); this.commit(); return { ok: false, msg: 'Уже чисто' }; }
    p.stats.cleanliness = clamp(p.stats.cleanliness + 35, 0, 100);
    p.stats.mood = clamp(p.stats.mood + 2, 0, 100);
    this.bumpCounter('clean');
    this.addXp(3);
    this.state.fx = { kind: 'clean', at: Date.now() };
    this.setBubble('Вжух-вжух! Мётла танцует, пыль разбегается!');
    sfx.sparkle();
    void thud();
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
    void thud();
    this.commit();
    return { ok: true, msg: `${p.name} выкупан и сияет!` };
  }

  toggleSleep() {
    const p = this.state.pet; if (!p || p.transcended) return;
    p.sleeping = !p.sleeping;
    if (p.sleeping) this.setBubble('Спокойной ночи… оставь лампу гореть, ладно?');
    else { p.stats.mood = clamp(p.stats.mood + 2, 0, 100); this.setBubble('Потягууушки! Я готов к подвигам. Ну, к маленьким.'); }
    sfx.pop();
    this.commit();
  }

  studyTogether(): { ok: boolean; msg: string } {
    const s = this.state; const p = s.pet; if (!p) return { ok: false, msg: '' };
    if (p.sleeping) return { ok: false, msg: 'Спит. Учёба подождёт.' };
    const last = s.counters.lastStudy ?? 0;
    if (Date.now() - last < 45000) return { ok: false, msg: 'Он ещё переваривает прошлое слово.' };
    s.counters.lastStudy = Date.now();
    let pool = WORDS.filter(w => !p.wordsLearned.includes(w));
    let fresh = true;
    if (pool.length === 0) { p.wordsLearned = []; pool = [...WORDS]; fresh = false; }
    const word = pool[Math.floor(Math.random() * pool.length)];
    p.wordsLearned.push(word);
    p.stats.mood = clamp(p.stats.mood + 3, 0, 100);
    p.stats.energy = clamp(p.stats.energy - 3, 0, 100);
    this.growSkill('интеллект', this.has('cache_memory') ? 3 : 2);
    this.bumpCounter('study');
    this.addXp(6);
    sfx.sparkle();
    this.setBubble(fresh ? `Я выучил слово «${word}»! Повторю три раза: ${word}, ${word}, ${word}!` : `Вспоминаем старое: «${word}». Как же я его люблю!`);
    this.commit();
    return { ok: true, msg: word };
  }

  /* ---------- прогулка с посещением места ---------- */
  walkVisit(locName: string, story: string): { ok: boolean; msg: string; coins: number; souvenir?: string } {
    const s = this.state; const p = s.pet; if (!p || p.transcended) return { ok: false, msg: '', coins: 0 };
    if (p.sleeping) return { ok: false, msg: 'Спит — прогулка подождёт.', coins: 0 };
    if (p.stats.energy < 12) return { ok: false, msg: 'Слишком устал, чтобы идти. Пусть поспит.', coins: 0 };
    p.stats.energy = clamp(p.stats.energy - 9, 0, 100);
    p.stats.mood = clamp(p.stats.mood + 9, 0, 100);
    p.bond = clamp(p.bond + 2, 0, 100);
    this.growSkill('любознательность', this.has('trail_sense') ? 2.5 : 1.5);
    this.bumpCounter('walk');
    this.addXp(8);
    const bonus = (this.has('crumb_finder') || this.has('trail_sense')) ? 1.5 : 1;
    const coins = Math.round((10 + Math.random() * 10) * bonus);
    s.coins += coins;
    let souvenir: string | undefined;
    if (Math.random() < 0.4) {
      souvenir = pick(Math.random, KEEPSAKES).id;
      this.inv(souvenir, 1);
    }
    this.addMemory('момент', story);
    this.setBubble(story);
    sfx.chime();
    this.commit();
    return { ok: true, msg: story, coins, souvenir };
  }

  /* ---------- настоящее обучение ---------- */
  finishStudy(correct: number, total: number, topicIds: string[], subjectLabel: string): { coins: number; xp: number } {
    const s = this.state; const p = s.pet; if (!p) return { coins: 0, xp: 0 };
    p.knowledge = [...new Set([...p.knowledge, ...topicIds])].slice(-300);
    const coins = correct * 5;
    const xp = correct * 7;
    s.coins += coins;
    p.stats.mood = clamp(p.stats.mood + 5, 0, 100);
    p.stats.energy = clamp(p.stats.energy - 4, 0, 100);
    p.bond = clamp(p.bond + 1.5, 0, 100);
    this.growSkill('интеллект', correct >= Math.ceil(total / 2) ? (this.has('cache_memory') ? 3 : 2) : 1);
    this.bumpCounter('study');
    this.addXp(xp);
    this.addMemory('момент', `Учились вместе (${subjectLabel}): ${correct} из ${total} верно`);
    this.setBubble(correct >= Math.ceil(total / 2)
      ? `Ого, ${subjectLabel}! Я запомнил ${correct} ответов. Мой мозг теперь скрипит от ума!`
      : `${subjectLabel} — непросто, но мы старались! Я записал всё на листик.`);
    sfx.levelup();
    this.commit();
    return { coins, xp };
  }

  rememberFact(title: string, extract: string) {
    const s = this.state; const p = s.pet; if (!p) return;
    p.knowledge = [...new Set([...p.knowledge, 'fact:' + title])].slice(-300);
    this.growSkill('интеллект', 1);
    this.addXp(5);
    this.addMemory('факт', `${title}: ${extract.slice(0, 80)}`);
    this.setBubble(`Ух ты! Теперь я знаю про «${title}». Расскажу всем светлячкам!`);
    sfx.sparkle();
    this.commit();
  }

  /* ---------- реальная погода (Open-Meteo) ---------- */
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
      const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
      const wd = await w.json();
      const code = wd?.current?.weather_code as number | undefined;
      const temp = wd?.current?.temperature_2m as number | undefined;
      if (typeof code !== 'number') return;
      this.state.weatherReal = { kind: mapWmo(code), label: wmoLabel(code, temp), temp: typeof temp === 'number' ? Math.round(temp) : 0, at: Date.now() };
      this.save(); this.emit();
    } catch { /* нет сети — живём по сезонной погоде */ }
  }

  setCity(city: string) {
    this.state.owner.city = city.trim().slice(0, 30);
    this.state.owner.geo = null;
    this.state.weatherReal = null;
    this.commit();
    void this.refreshWeather();
  }

  giveGift(itemId: string): { ok: boolean; msg: string } {
    const s = this.state; const p = s.pet; if (!p) return { ok: false, msg: '' };
    const owned = s.inventory[itemId] ?? 0;
    if (owned <= 0) return { ok: false, msg: 'Подарка нет в рюкзаке.' };
    this.inv(itemId, -1);
    const def = [...SHOP, ...KEEPSAKES].find(i => i.id === itemId);
    const name = def?.name ?? 'подарок';
    p.bond = clamp(p.bond + 3, 0, 100);
    p.trust = clamp(p.trust + 2, 0, 100);
    p.stats.mood = clamp(p.stats.mood + 6, 0, 100);
    this.growSkill('эмпатия', 1);
    this.bumpCounter('gift');
    this.addXp(4);
    this.addMemory('подарок', `Мне подарили: ${name}`);
    this.setBubble(`${name}?! Это мне? Я положу его в самое надёжное место. В сердце.`);
    sfx.chime();
    void celebrate();
    this.commit();
    return { ok: true, msg: `${p.name} в восторге от подарка!` };
  }

  /* ---------- лавка и гардероб ---------- */
  buy(itemId: string): { ok: boolean; msg: string } {
    const s = this.state;
    const item = SHOP.find(i => i.id === itemId); if (!item) return { ok: false, msg: '' };
    if (s.coins < item.price) return { ok: false, msg: `Не хватает искр: нужно ${item.price}.` };
    s.coins -= item.price;
    if (item.kind === 'furniture') {
      if (!s.furniture.includes(itemId)) s.furniture = [...s.furniture, itemId];
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
    void celebrate();
    this.commit();
  }

  /* ---------- мини-игры / фокус ---------- */
  finishMinigame(kind: 'memory' | 'firefly' | 'echo' | 'hangman' | 'puzzle' | 'sudoku', score: number): number {
    const p = this.state.pet; if (!p) return 0;
    const lucky = this.has('pixel_luck') ? 1.2 : 1;
    const reward = Math.max(8, Math.round(score * lucky));
    const skillMap: Record<string, string> = { memory: 'интеллект', firefly: 'спорт', echo: 'творчество', hangman: 'интеллект', puzzle: 'интеллект', sudoku: 'интеллект' };
    const nameMap: Record<string, string> = {
      memory: 'в «Звёздную память»', firefly: 'в ловлю светлячков', echo: 'в «Эхо-мелодию»',
      hangman: 'в виселицу', puzzle: 'в звёздные пятнашки', sudoku: 'в судоку',
    };
    this.state.coins += reward;
    p.stats.mood = clamp(p.stats.mood + 6, 0, 100);
    p.stats.energy = clamp(p.stats.energy - 5, 0, 100);
    p.bond = clamp(p.bond + 2, 0, 100);
    this.growSkill(skillMap[kind] ?? 'интеллект', 2);
    this.bumpCounter('play');
    this.addXp(10);
    this.addMemory('момент', `Сыграли ${nameMap[kind] ?? ''}, счёт ${score}`);
    sfx.coin();
    this.setBubble('Это было здорово! Ещё разок? Ещё разочек?');
    this.commit();
    return reward;
  }

  startFocus(minutes: number) {
    const s = this.state;
    s.focusMinutes = minutes;
    s.focusEndsAt = Date.now() + minutes * 60000;
    this.setBubble(`Договорились: ${minutes} минут фокуса. Я сижу тихо-тихо. Ну, почти.`);
    this.commit();
  }

  /* ---------- RAG: знания из Википедии на лету ---------- */

  /** Похож ли вопрос хозяина на запрос знаний («кто такой…», «почему…»). */
  private static KNOWLEDGE_RE = /(кто (такой|такая|такое|такие)|что такое|что за|почему|зачем|откуда|как (работает|устроен|устроена|появил|образовал)|где (жив[уе]т|живут|обита[ею]т|находит|располаг)|расскажи (про|о |об )|знаешь (ли )?(что-нибудь )?(про|об |о )|слышал(а)? (про|об |о )|читал(а)? (про|об |о )|в ч[её]м разница|чем отличается)/i;

  /** Стоп-слова для извлечения темы. ВАЖНО: в JS `\b` не работает с кириллицей,
   *  поэтому фильтруем через Set, а не регуляркой. */
  private static STOPWORDS = new Set([
    'кто', 'что', 'какой', 'какая', 'какое', 'какие', 'почему', 'зачем', 'где', 'когда', 'сколько', 'откуда',
    'такой', 'такая', 'такое', 'такие', 'расскажи', 'расскажите', 'про', 'обо', 'знаешь', 'знаете',
    'мне', 'нам', 'тебе', 'тебя', 'пожалуйста', 'есть', 'был', 'была', 'было', 'были', 'работает', 'устроен',
    'скажи', 'спроси', 'объясни',
    'устроена', 'устроено', 'появился', 'появилась', 'образовалась', 'образовался', 'чем', 'чём', 'разница',
    'отличается', 'слышал', 'слышала', 'читал', 'читала', 'можно', 'будет', 'означает', 'значит', 'это', 'этот',
    'эта', 'эти', 'вот', 'давай', 'ещё', 'тоже', 'очень', 'просто', 'вообще', 'как', 'ли', 'нибудь', 'что-нибудь',
    'ты', 'вы', 'меня', 'себя', 'него', 'неё', 'них', 'живут', 'живет', 'живёт', 'обитает', 'обитают',
    'находится', 'располагается',
  ]);

  /** Извлечь тему из вопроса, убрав «вопросительные» и служебные слова. */
  private extractTopic(text: string): string {
    const words = text.toLowerCase()
      .replace(/[?.!,;:()«»"'-]+/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !Engine.STOPWORDS.has(w));
    return words.slice(0, 4).join(' ');
  }

  /** Если вопрос похож на запрос знаний — найти статью в Википедии.
   *  Поиск идёт по ИСПРАВЛЕННОМУ тексту: опечатки («скожи»→«скажи») не должны
   *  мешать ни распознаванию намерения, ни извлечению темы. */
  private async webKnowledge(userText: string): Promise<{ title: string; text: string } | null> {
    const fixed = correctText(userText);
    if (!Engine.KNOWLEDGE_RE.test(fixed)) return null;
    const topic = this.extractTopic(fixed);
    if (!topic) return null;
    return searchWiki(topic);
  }

  /* ---------- болталка ---------- */
  async sendChat(text: string) {
    const s = this.state; const p = s.pet; if (!p) return;
    void tick();
    s.chat.push({ id: uid(), from: 'owner', text, at: Date.now() });
    this.bumpCounter('talk');
    this.save(); this.emit(); // сообщение хозяина показываем сразу

    // 1) знания из сети (RAG): тема → статья в Википедии → резюме
    // 2) движок намерений: контекст разговора, факты, few-shot, встречные вопросы
    // Всё обёрнуто в try/catch: питомец ОБЯЗАН ответить, иначе зависнет «печатает…»
    let fact: { title: string; text: string } | null = null;
    let lines: string[];
    let brain: ReturnType<typeof chatBrain> | null = null;
    try {
      fact = await this.webKnowledge(text);
      brain = chatBrain(text, s, fact);
      lines = brain.lines;
    } catch (e) {
      console.error('Люмос: ошибка в чат-мозге', e);
      lines = [];
    }
    if (!lines.length) lines = ['Ой… я на секунду запутался в мыслях. Расскажешь ещё раз?'];

    if (brain?.save) this.addMemory(brain.save.kind, brain.save.text);
    if (brain?.ownerName) { s.owner.name = brain.ownerName; }
    if (brain?.favorite && !s.owner.favorites.includes(brain.favorite)) s.owner.favorites.push(brain.favorite);
    if (brain?.save?.kind === 'обещание') s.owner.promises.push(brain.save.text);
    if (brain?.moodDelta) p.stats.mood = clamp(p.stats.mood + brain.moodDelta, 0, 100);
    // нейросеть учится на том, что написал хозяин, что ответил питомец,
    // и на найденном факте — так знания «впитываются» в её словарь
    this.brainLearn([text, ...lines, ...(fact ? [`${fact.title}: ${fact.text}`] : [])]);
    s.chat = s.chat.slice(-60);
    this.growSkill('эмпатия', 0.4);
    this.save(); this.emit();

    // иногда питомец добавляет «ассоциацию из головы» — фразу от нейросети,
    // начатую с ключевых слов хозяина. Так разговор становится живее.
    const replyLines = [...lines];
    if (Math.random() < 0.3) {
      const assoc = this.neuroThought(text);
      if (assoc && assoc.length > 12) {
        replyLines.push(Math.random() < 0.5
          ? `Кстати, ${assoc.charAt(0).toLowerCase() + assoc.slice(1)}.`
          : `…и знаешь что? ${assoc}`);
      }
    }

    replyLines.forEach((line, i) => {
      setTimeout(() => {
        s.chat.push({ id: uid(), from: 'pet', text: line, at: Date.now() });
        s.chat = s.chat.slice(-60);
        if (i === 0) this.setBubble(line.length > 60 ? line.slice(0, 57) + '…' : line);
        sfx.bubble();
        this.save(); this.emit();
      }, 400 + i * 900);
    });
  }

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
      dna, personality,
      stats: { hunger: 70, energy: 85, mood: 78, cleanliness: 90 },
      growth: { xp: 0, level: 1, bornAt: Date.now(), skills: {} },
      outfit: { hat: null, scarf: null, glasses: null, wings: null },
      bond: 10, trust: 30,
      sleeping: false, transcended: false,
      evolutionTraits: [],
      wordsLearned: [],
      knowledge: [],
    };
    s.pet = pet;
    s.freshHatch = true;
    s.pendingWelcome = null;
    this.addMemory('момент', `Я родился! Меня зовут ${pet.name}`);
    sfx.hatch();
    this.commit();
    return pet;
  }
  private makeName(dna: ReturnType<typeof generateDNA>, rng: () => number): string {
    const sp = speciesOf(dna.species);
    let name = pick(rng, sp.syllA) + pick(rng, sp.syllB);
    if (rng() < 0.5) name += pick(rng, sp.syllB);
    if (rng() < 0.35) name += pick(rng, ['и', 'о', 'у', 'а']);
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  renamePet(name: string) {
    const p = this.state.pet; if (!p) return;
    p.name = name.trim().slice(0, 14) || p.name;
    this.commit();
  }
  completeReveal() { this.state.freshHatch = false; this.commit(); }

  private transcend() {
    const s = this.state; const p = s.pet; if (!p) return;
    p.transcended = true;
    const days = Math.floor((Date.now() - p.growth.bornAt) / 86400000);
    const entry: LegacyEntry = {
      id: uid(),
      name: p.name,
      species: speciesOf(p.dna.species).label,
      rarity: p.dna.rarity,
      days,
      bonus: RARITY_BONUS[p.dna.rarity],
      colorPrimary: p.dna.colorPrimary,
      epitaph: `${p.name} прожил${days > 1 ? ' долгую' : ''} счастливую жизнь длиной в ${days} дней и стал духом памяти. ${p.evolutionTraits.length ? `Его черты — ${p.evolutionTraits.join(', ')} — остались с нами.` : 'Он умел радоваться мелочам. Это главное.'}`,
      at: Date.now(),
    };
    s.pendingFarewell = entry;
    sfx.chime();
  }

  startNewGeneration(): LegacyEntry | null {
    const s = this.state; const p = s.pet;
    if (!p || !p.transcended || !s.pendingFarewell) return null;
    const entry = s.pendingFarewell;
    s.legacy.unshift(entry);
    s.legacy = s.legacy.slice(0, 12);
    s.inherit = { color: entry.colorPrimary, species: p.dna.species };
    s.pet = null;
    s.coins = Math.floor(s.coins / 2) + 50;
    s.pendingFarewell = null;
    s.pendingWelcome = null;
    this.addMemory('момент', `${entry.name} стал духом памяти. В траве снова что-то светится…`);
    this.commit();
    return entry;
  }
  dismissFarewell() { this.state.pendingFarewell = null; this.commit(); }

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
      // новый формат: { __lumos: 2, state, brain }
      if (parsed && parsed.__lumos === 2 && parsed.state && parsed.state.version === 1) {
        this.state = { ...defaultState(), ...parsed.state };
        if (parsed.brain) {
          const lm = MiniLM.deserialize(parsed.brain);
          if (lm) { this.lm = lm; this.saveBrain(); }
        }
        this.save(); this.emit();
        return true;
      }
      // старый формат: просто состояние
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

/* коды погоды Open-Meteo → виды */
function mapWmo(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 3) return 'clouds';
  if (code === 45 || code === 48) return 'clouds';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'rain';
  return 'clouds';
}
function wmoLabel(code: number, temp?: number): string {
  const t = typeof temp === 'number' ? `${Math.round(temp)}°` : '';
  if (code === 0) return `Ясно ${t}`;
  if (code <= 3) return `Облачно ${t}`;
  if (code === 45 || code === 48) return `Туман ${t}`;
  if (code >= 71 && code <= 77) return `Снег ${t}`;
  if (code >= 95) return `Гроза ${t}`;
  return `Дождь ${t}`;
}

export const engine = new Engine();
setSoundEnabled(engine.state.settings.sound);
