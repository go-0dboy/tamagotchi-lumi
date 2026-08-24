/* ============================================================
 * GameEngine — сердце «Люмоса».
 * Класс на чистом ES6+: состояние, сохранение в localStorage,
 * офлайн-симуляция жизни (TimeEngine), уход, рост, квесты,
 * сны (DreamEngine), дневник (DiaryEngine), память (MemoryCore),
 * наследие. Никакого сервера — только браузер игрока.
 * ============================================================ */
import type { GameState, Pet, LegacyEntry, OfflineEvent, QuestState } from './types';
import { generateDNA, generatePersonality, mulberry32, uid, speciesOf } from './dna';
import { FOODS, SHOP, KEEPSAKES, QUEST_POOL, stageForAge, SKILLS, TRAIT_THRESHOLD, PET_WORDS } from './content';
import { makeDreamText, dreamGiftId, makeDiaryText, welcomeLine, chatBrain, proactiveLine, MOOD_WORDS } from './speech';
import { sfx, setSoundEnabled } from './sound';

const SAVE_KEY = 'lumos_save_v1';
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const dayKeyOf = (ts: number) => new Date(ts).toLocaleDateString('ru-RU');
const HOUR = 3600000, DAY = 86400000;

/* ---------- начальное состояние ---------- */
export function freshState(): GameState {
  return {
    version: 1,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    coins: 60,
    owner: { name: '', favorites: [], facts: [], moods: [], promises: [] },
    pet: null,
    inventory: { berries: 3, honey: 1 },
    roomTheme: 'dusk',
    furniture: ['furn_rug'],
    memories: [],
    diary: [],
    dreams: [],
    chat: [],
    quests: [],
    questDay: dayKeyOf(Date.now()),
    legacy: [],
    counters: {},
    pendingWelcome: null,
    pendingFarewell: null,
    focusEndsAt: null,
    focusMinutes: 25,
    bubble: null,
    dayKey: dayKeyOf(Date.now()),
    settings: { sound: true, reminders: true },
  };
}

function loadState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    return { ...freshState(), ...parsed, pet: parsed.pet ? { ...freshState().pet, ...parsed.pet } : null };
  } catch { return freshState(); }
}

export class GameEngine {
  state: GameState;
  private listeners = new Set<() => void>();

  constructor() {
    this.state = loadState();
    setSoundEnabled(this.state.settings.sound);
    this.checkDailyRollover(true);
    this.simulateOffline();
  }

  /* ---------- подписка / сохранение ---------- */
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach(fn => fn()); }
  private commit() { this.state.lastSeen = Date.now(); this.emit(); }
  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...this.state, lastSeen: Date.now() })); } catch { /* приватный режим */ }
  }
  reset() { localStorage.removeItem(SAVE_KEY); this.state = freshState(); this.emit(); }
  exportSave(): string { return btoa(unescape(encodeURIComponent(JSON.stringify(this.state)))); }
  importSave(data: string): boolean {
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(data.trim()))));
      if (!parsed || parsed.version !== 1 || !('coins' in parsed)) return false;
      this.state = { ...freshState(), ...parsed };
      this.emit(); this.save(); return true;
    } catch { return false; }
  }

  /* ---------- хелперы ---------- */
  private has(ability: string) { return this.state.pet?.dna.abilityId === ability; }
  setBubble(text: string) { this.state.bubble = { text, at: Date.now() }; this.commit(); }
  private addMemory(kind: 'факт' | 'эмоция' | 'момент' | 'обещание' | 'подарок' | 'шутка', text: string) {
    this.state.memories.push({ id: uid(), kind, text, at: Date.now() });
    if (this.state.memories.length > 60) this.state.memories.shift();
  }
  private bumpCounter(metric: string, n = 1) {
    this.state.counters[metric] = (this.state.counters[metric] ?? 0) + n;
    this.state.quests.forEach(q => {
      if (q.metric === metric && !q.claimed) q.progress = Math.min(q.target, q.progress + n);
    });
  }
  private addXp(n: number) {
    const p = this.state.pet; if (!p) return;
    if (this.has('nebula_mind')) n = Math.round(n * 1.3);
    p.growth.xp += n;
    let leveled = false;
    while (p.growth.xp >= 80 + p.growth.level * 40) {
      p.growth.xp -= 80 + p.growth.level * 40;
      p.growth.level++; leveled = true;
      this.state.coins += 25;
    }
    if (leveled) { sfx.levelup(); this.setBubble(`Уровень ${p.growth.level}! Я становлюсь мудрее и чуть-чуть больше.`); }
  }
  private growSkill(key: string, n: number) {
    const p = this.state.pet; if (!p) return;
    p.growth.skills[key] = clamp((p.growth.skills[key] ?? 0) + n, 0, 100);
    this.recalcTraits();
  }
  private recalcTraits() {
    const p = this.state.pet; if (!p) return;
    const traits = SKILLS.filter(s => (p.growth.skills[s.key] ?? 0) >= TRAIT_THRESHOLD).map(s => s.trait);
    if (p.bond >= 80 && !traits.includes('сияющая связь')) traits.push('сияющая связь');
    p.evolutionTraits = traits;
  }

  /* ---------- рождение / яйцо ---------- */
  hatchEgg(inherit?: { colorPrimary?: string; speciesKey?: string } | null): Pet {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const rng = mulberry32(seed);
    const dna = generateDNA(seed, inherit);
    const name = speciesOf(dna.species).syllA[0]; // предложение имени уточнит игрок
    const pet: Pet = {
      id: uid(),
      name: name + speciesOf(dna.species).syllB[0],
      dna,
      personality: generatePersonality(rng, dna),
      stats: { hunger: 80, energy: 90, mood: 85, cleanliness: 100 },
      growth: { xp: 0, level: 1, bornAt: Date.now(), skills: { 'интеллект': 5, 'спорт': 5, 'эмпатия': 5, 'магия': 5, 'творчество': 5, 'любознательность': 5 } },
      outfit: { hat: null, scarf: null, glasses: null, wings: null },
      bond: 20, trust: 55,
      sleeping: false, transcended: false,
      evolutionTraits: [],
      wordsLearned: [],
    };
    // бонусы наследия
    if (this.state.legacy.length) {
      const last = this.state.legacy[this.state.legacy.length - 1];
      const skillMap: Record<string, string> = { 'спокойствие': 'эмпатия', 'любопытство': 'любознательность', 'мудрость': 'интеллект', 'отвага': 'спорт', 'вдохновение': 'творчество' };
      const sk = skillMap[last.bonus] ?? 'эмпатия';
      pet.growth.skills[sk] += 12;
      pet.trust += 5;
    }
    this.state.pet = pet;
    this.recalcTraits();
    this.addMemory('момент', `${pet.name} появился на свет! Редкость: ${dna.rarity}.`);
    this.pushDiary(`${pet.name} вылупился и первым делом посмотрел на меня. Кажется, это начало большой дружбы.`, 'волшебный');
    sfx.hatch();
    this.commit();
    return pet;
  }
  renamePet(name: string) {
    if (this.state.pet && name.trim()) { this.state.pet.name = name.trim().slice(0, 16); this.commit(); }
  }

  /* ============================================================
   * УХОД И ВЗАИМОДЕЙСТВИЯ
   * ============================================================ */
  feed(foodId: string): { ok: boolean; msg: string } {
    const p = this.state.pet; if (!p || p.transcended) return { ok: false, msg: '' };
    const food = FOODS.find(f => f.id === foodId); if (!food) return { ok: false, msg: '' };
    const owned = this.state.inventory[foodId] ?? 0;
    if (owned <= 0) {
      if (this.state.coins < food.price) return { ok: false, msg: 'Не хватает искр. Сыграй в мини-игру!' };
      this.state.coins -= food.price;
    } else this.state.inventory[foodId] = owned - 1;

    const liked = p.personality.likes.includes(food.tag);
    const disliked = p.personality.dislikes.includes(food.tag);
    p.stats.hunger = clamp(p.stats.hunger + food.hunger, 0, 100);
    p.stats.mood = clamp(p.stats.mood + food.mood + (liked ? 5 : 0) - (disliked ? 4 : 0), 0, 100);
    p.bond = clamp(p.bond + 0.5, 0, 100);
    this.bumpCounter('feed');
    this.addXp(4);
    sfx.eat();
    const msg = liked ? `${p.name} обожает ${food.name.toLowerCase()}! Глаза стали как блюдца.`
      : disliked ? `${p.name} вежливо доел, но это точно не его любимое блюдо.`
      : `Ням! ${food.name} исчезло со скоростью светлячка.`;
    if (p.trust < 60) p.trust = clamp(p.trust + 1, 0, 100); // еда восстанавливает доверие
    this.setBubble(msg);
    this.commit();
    return { ok: true, msg };
  }

  petStroke(): void {
    const p = this.state.pet; if (!p || p.transcended || p.sleeping) return;
    const mult = this.has('jelly_hug') ? 1.8 : 1;
    p.stats.mood = clamp(p.stats.mood + 2.2 * mult, 0, 100);
    p.bond = clamp(p.bond + 0.6, 0, 100);
    if (p.trust < 70) p.trust = clamp(p.trust + 0.4, 0, 100);
    this.bumpCounter('pet');
    this.addXp(1);
    sfx.purr();
    this.commit();
  }

  cleanRoom() {
    const p = this.state.pet; if (!p) return;
    p.stats.cleanliness = 100;
    p.stats.mood = clamp(p.stats.mood - 2, 0, 100);
    this.bumpCounter('clean');
    this.addXp(3);
    sfx.pop();
    this.setBubble('Чисто! Теперь я сверкаю, как начищенная луна.');
    this.commit();
  }

  toggleSleep() {
    const p = this.state.pet; if (!p) return;
    p.sleeping = !p.sleeping;
    this.setBubble(p.sleeping ? 'Спокойной ночи… я пошёл ловить сны.' : 'Доброе утро! Я видел сон про звёздный пляж.');
    if (!p.sleeping && this.has('ember_heart')) p.stats.energy = clamp(p.stats.energy + 8, 0, 100);
    sfx.bubble();
    this.commit();
  }

  studyTogether() {
    const p = this.state.pet; if (!p || p.sleeping) return { ok: false, msg: 'Я сплю… давай позже?' };
    if (p.stats.energy < 10) return { ok: false, msg: 'Я слишком сонный для науки…' };
    p.stats.energy = clamp(p.stats.energy - 6, 0, 100);
    p.stats.mood = clamp(p.stats.mood + 2, 0, 100);
    p.bond = clamp(p.bond + 1.2, 0, 100);
    this.growSkill('интеллект', 2);
    this.growSkill('магия', this.has('nebula_mind') ? 2 : 1);
    this.bumpCounter('study');
    this.addXp(8);
    const wordsToLearn = this.has('cache_memory') ? 2 : 1;
    for (let i = 0; i < wordsToLearn; i++) {
      const w = PET_WORDS[Math.floor(Math.random() * PET_WORDS.length)];
      if (!p.wordsLearned.includes(w)) p.wordsLearned.push(w);
    }
    sfx.chime();
    const word = p.wordsLearned[p.wordsLearned.length - 1];
    this.setBubble(`Мы прочитали целую главу! Теперь я знаю слово «${word}».`);
    this.commit();
    return { ok: true, msg: `+интеллект, новое слово: «${word}»` };
  }

  explore(): { ok: boolean; msg: string } {
    const p = this.state.pet; if (!p || p.sleeping) return { ok: false, msg: 'Я сплю… давай позже?' };
    if (p.stats.energy < 12) return { ok: false, msg: 'Лапки не идут. Мне нужен сон или перекус.' };
    p.stats.energy = clamp(p.stats.energy - 10, 0, 100);
    p.stats.hunger = clamp(p.stats.hunger - 6, 0, 100);
    p.stats.cleanliness = clamp(p.stats.cleanliness - 8, 0, 100);
    this.growSkill('любознательность', 2);
    this.growSkill('спорт', 1);
    this.bumpCounter('walk');
    this.addXp(7);
    const rng = Math.random();
    const luck = this.has('crumb_finder') || this.has('trail_sense') ? 0.2 : 0;
    let msg: string;
    if (rng < 0.3 + luck) {
      const found = 12 + Math.floor(Math.random() * 20);
      this.state.coins += found; sfx.coin();
      msg = `Мы нашли тайник светлячков! +${found} искр.`;
    } else if (rng < 0.5 + luck) {
      const keep = KEEPSAKES[Math.floor(Math.random() * KEEPSAKES.length)];
      this.state.inventory[keep.id] = (this.state.inventory[keep.id] ?? 0) + 1;
      this.addMemory('момент', `На прогулке нашли: ${keep.name.toLowerCase()}`);
      sfx.sparkle();
      msg = `Находка дня: ${keep.name.toLowerCase()}!`;
    } else if (rng < 0.7) {
      this.growSkill('творчество', 2);
      msg = 'Мы рисовали карту двора мелками. Вышло кривовато, но честно.';
    } else {
      p.bond = clamp(p.bond + 2, 0, 100);
      msg = 'Мы просто бродили и болтали. Такие прогулки — самые лучшие.';
    }
    if (this.has('berry_pocket') && Math.random() < 0.35) {
      this.state.inventory.berries = (this.state.inventory.berries ?? 0) + 1;
      msg += ' И ягод из кармана!';
    }
    this.setBubble(msg);
    this.commit();
    return { ok: true, msg };
  }

  giveGift(itemId: string): { ok: boolean; msg: string } {
    const p = this.state.pet; if (!p) return { ok: false, msg: '' };
    const owned = this.state.inventory[itemId] ?? 0;
    if (owned <= 0) return { ok: false, msg: 'Такого подарка у нас нет.' };
    this.state.inventory[itemId] = owned - 1;
    p.bond = clamp(p.bond + 3.5, 0, 100);
    p.stats.mood = clamp(p.stats.mood + 6, 0, 100);
    p.trust = clamp(p.trust + 1.5, 0, 100);
    this.growSkill('эмпатия', 1);
    this.bumpCounter('gift');
    this.addMemory('подарок', `Подарил(а) мне «${itemId.replace(/keep_|furn_|toy_|gift_/, '')}»`);
    sfx.sparkle();
    this.setBubble('Подарок?! Для МЕНЯ?! Я сохраню его в сердце. И в коробочке.');
    this.commit();
    return { ok: true, msg: 'Подарок принят с восторгом!' };
  }

  /* ---------- магазин и гардероб ---------- */
  buy(itemId: string): { ok: boolean; msg: string } {
    const item = SHOP.find(i => i.id === itemId);
    if (!item) return { ok: false, msg: '' };
    if (this.state.coins < item.price) return { ok: false, msg: 'Не хватает искр!' };
    this.state.coins -= item.price;
    if (item.kind === 'furniture') {
      if (!this.state.furniture.includes(item.id)) this.state.furniture.push(item.id);
    } else {
      this.state.inventory[item.id] = (this.state.inventory[item.id] ?? 0) + 1;
    }
    sfx.coin();
    this.setBubble(`Ого, «${item.name.toLowerCase()}»! У нас отличный вкус.`);
    this.commit();
    return { ok: true, msg: `Куплено: ${item.name}` };
  }

  equip(itemId: string, slot: 'hat' | 'scarf' | 'glasses' | 'wings') {
    const p = this.state.pet; if (!p) return;
    const owned = this.state.inventory[itemId] ?? 0;
    if (owned <= 0 && p.outfit[slot] !== itemId) return;
    p.outfit[slot] = p.outfit[slot] === itemId ? null : itemId;
    sfx.pop();
    this.commit();
  }

  setRoomTheme(id: string) { this.state.roomTheme = id; sfx.tap(); this.commit(); }

  /* ---------- квесты ---------- */
  claimQuest(id: string) {
    const q = this.state.quests.find(x => x.id === id);
    if (!q || q.claimed || q.progress < q.target) return;
    q.claimed = true;
    this.state.coins += q.reward;
    const p = this.state.pet; if (p) { p.bond = clamp(p.bond + 1, 0, 100); this.addXp(6); }
    sfx.coin();
    this.commit();
  }
  private rollQuests() {
    const rng = mulberry32(Math.floor(Date.now() / DAY));
    const pool = [...QUEST_POOL];
    const chosen: QuestState[] = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const idx = Math.floor(rng() * pool.length);
      const def = pool.splice(idx, 1)[0];
      chosen.push({ ...def, progress: 0, claimed: false });
    }
    this.state.quests = chosen;
    this.state.questDay = dayKeyOf(Date.now());
    this.state.counters = {};
  }

  /* ---------- мини-игры / фокус ---------- */
  finishMinigame(kind: 'memory' | 'firefly', score: number): number {
    const p = this.state.pet; if (!p) return 0;
    const lucky = this.has('pixel_luck') ? 1.2 : 1;
    const reward = Math.max(8, Math.round(score * lucky));
    this.state.coins += reward;
    p.stats.mood = clamp(p.stats.mood + 6, 0, 100);
    p.stats.energy = clamp(p.stats.energy - 5, 0, 100);
    p.bond = clamp(p.bond + 2, 0, 100);
    this.growSkill(kind === 'memory' ? 'интеллект' : 'спорт', 2);
    this.bumpCounter('play');
    this.addXp(10);
    this.addMemory('момент', kind === 'memory' ? `Сыграли в «Звёздную память», счёт ${score}` : `Ловили светлячков, поймали на ${score} искр`);
    sfx.coin();
    this.setBubble(`Это было здорово! Ещё разок? Ещё разочек?`);
    this.commit();
    return reward;
  }

  startFocus(minutes: number) {
    this.state.focusMinutes = minutes;
    this.state.focusEndsAt = Date.now() + minutes * 60000;
    this.setBubble(`Тс-с… ${minutes} минут тишины. Я буду учиться рядом.`);
    sfx.bubble();
    this.commit();
  }
  private checkFocus() {
    if (this.state.focusEndsAt && Date.now() >= this.state.focusEndsAt) {
      this.state.focusEndsAt = null;
      const p = this.state.pet;
      if (p) {
        this.state.coins += 30; p.bond = clamp(p.bond + 2, 0, 100);
        this.growSkill('интеллект', 3);
        this.bumpCounter('focus');
        this.addXp(15);
        this.pushDiary(`Мы ${this.state.focusMinutes} минут занимались в тишине. Я горжусь нами обоими.`, 'гордый');
        sfx.levelup();
        this.setBubble('Фокус-сессия завершена! Мы — команда мечты. +30 искр!');
      }
      this.commit();
    }
  }

  /* ---------- чат / память ---------- */
  sendChat(text: string): string[] {
    const p = this.state.pet; if (!p) return [];
    this.state.chat.push({ id: uid(), from: 'owner', text, at: Date.now() });
    const res = chatBrain(text, this.state);
    if (res.ownerName) this.state.owner.name = res.ownerName;
    if (res.favorite && !this.state.owner.favorites.includes(res.favorite)) this.state.owner.favorites.push(res.favorite);
    if (res.save) {
      if (res.save.kind === 'обещание') this.state.owner.promises.push(res.save.text);
      else if (res.save.kind === 'факт') this.state.owner.facts.push(res.save.text);
      this.addMemory(res.save.kind, res.save.text);
    }
    if (res.moodDelta) p.stats.mood = clamp(p.stats.mood + res.moodDelta, 0, 100);
    p.bond = clamp(p.bond + 0.4, 0, 100);
    this.bumpCounter('talk');
    res.lines.forEach(l => this.state.chat.push({ id: uid(), from: 'pet', text: l, at: Date.now() }));
    if (this.state.chat.length > 80) this.state.chat.splice(0, this.state.chat.length - 80);
    sfx.bubble();
    this.commit();
    return res.lines;
  }

  /* ============================================================
   * ВРЕМЯ: офлайн-симуляция, тики, смена дня
   * ============================================================ */
  private simulateOffline() {
    const s = this.state; const p = s.pet;
    const now = Date.now();
    const away = now - s.lastSeen;
    if (!p || p.transcended || away < 90000) { s.lastSeen = now; return; }

    const h = Math.min(away / HOUR, 336);
    const nights = Math.max(1, Math.floor(away / (20 * HOUR)));
    const events: OfflineEvent[] = [];

    // сон и сны за каждую «ночь»
    const dreamCount = Math.min(nights, 2);
    for (let i = 0; i < dreamCount; i++) {
      const text = makeDreamText();
      const gift = dreamGiftId() ?? (this.has('root_song') || this.has('wish_dust') ? 'keep_feather' : undefined);
      s.dreams.unshift({ id: uid(), at: now - Math.floor(away / 2), text, gift });
      events.push({ icon: 'moon', text: `${p.name} видел сон: «${text}»` });
      if (gift) {
        s.inventory[gift] = (s.inventory[gift] ?? 0) + 1;
        events.push({ icon: 'gift', text: `Из сна ${p.name} принёс подарок — загляни в рюкзачок!` });
      }
    }
    if (s.dreams.length > 20) s.dreams.length = 20;

    // мягкий распад характеристик (питомец НЕ умирает в офлайне)
    p.stats.hunger = clamp(p.stats.hunger - 4 * h, 12, 100);
    p.stats.cleanliness = clamp(p.stats.cleanliness - 2 * h, 8, 100);
    p.stats.energy = clamp(p.stats.energy + 22 * nights - 1.5 * h, 10, 100);
    p.stats.mood = clamp(p.stats.mood - h * 0.7 + (p.bond > 60 ? 6 : 0), 15, 95);

    // доверие: скучал, но не разлюбил
    if (h > 24) {
      p.trust = clamp(p.trust - Math.min(14, ((h - 24) / 24) * 4), 25, 100);
      events.push({ icon: 'heart', text: `${p.name} скучал и ждал у окна. Доверие чуть пошатнулось — обнимите его.` });
      this.addMemory('эмоция', `Вы долго отсутствовали (${Math.floor(h)} ч). ${p.name} скучал.`);
    }

    // правдоподобные события
    const rng = mulberry32(Math.floor(now / 1000));
    if (rng() < 0.6) { p.stats.cleanliness = clamp(p.stats.cleanliness + 12, 0, 100); events.push({ icon: 'broom', text: `${p.name} навёл порядок в комнате и расставил всё по фэн-шую светлячков.` }); }
    if (h > 6 && rng() < 0.5) {
      s.inventory['keep_drawing'] = (s.inventory['keep_drawing'] ?? 0) + 1;
      events.push({ icon: 'art', text: `${p.name} скучал и нарисовал картину. Там есть вы. И немного звёзд.` });
      this.addMemory('момент', 'Нарисовал картину, пока вас не было');
    }
    if (rng() < 0.45) {
      const w = PET_WORDS[Math.floor(rng() * PET_WORDS.length)];
      if (!p.wordsLearned.includes(w)) p.wordsLearned.push(w);
      p.growth.skills['интеллект'] = clamp((p.growth.skills['интеллект'] ?? 0) + 2, 0, 100);
      events.push({ icon: 'book', text: `${p.name} выучил новое слово: «${w}».` });
    }
    if (s.furniture.includes('furn_plant') && rng() < 0.5) events.push({ icon: 'plant', text: `${p.name} полил растение-светлячок и поговорил с ним о погоде.` });
    if (rng() < 0.35) { const found = 8 + Math.floor(rng() * 18); s.coins += found; events.push({ icon: 'spark', text: `${p.name} нашёл под ковриком ${found} искр.` }); }
    if (h > 3) events.unshift({ icon: 'food', text: `${p.name} проголодался и скромно ждал (не клянчил. почти).` });
    if (s.settings.reminders && h > 4) events.push({ icon: 'drop', text: `И главное: ${p.name} напоминает — попейте воды и разомните спинку!` });

    s.pendingWelcome = {
      awayMs: away,
      events: events.slice(0, 6),
      line: welcomeLine(away, p.trust, p.name),
    };
    s.lastSeen = now;
    this.pushDiary(`Вас не было ${formatAway(away)}. ${p.name} ${p.trust < 50 ? 'немного грустил, но держался' : 'мечтал, убирался и учил слова'}.`, 'задумчивый');
    this.emit();
  }

  dismissWelcome(hug: boolean) {
    const p = this.state.pet;
    if (hug && p) {
      p.stats.mood = clamp(p.stats.mood + 12, 0, 100);
      p.trust = clamp(p.trust + 3, 0, 100);
      p.bond = clamp(p.bond + 2, 0, 100);
      sfx.purr();
    }
    this.state.pendingWelcome = null;
    this.commit();
  }

  /* ---------- живой тик (вызывается каждые несколько секунд) ---------- */
  tick() {
    const s = this.state; const p = s.pet;
    const now = Date.now();
    this.checkFocus();

    if (p && !p.transcended) {
      const hour = new Date().getHours();
      const isNight = hour >= 22 || hour < 6;
      const warmPurr = this.has('warm_purr') ? 0.6 : 1;
      const moss = this.has('calm_moss') ? 0.6 : 1;

      if (p.sleeping) {
        p.stats.energy = clamp(p.stats.energy + (this.has('deep_sleep') ? 1.4 : 0.9), 0, 100);
        p.stats.mood = clamp(p.stats.mood + 0.03, 0, 100);
        if (p.stats.energy >= 100) { p.sleeping = false; this.setBubble('Я выспался! Мир, держись — я иду.'); }
      } else {
        p.stats.hunger = clamp(p.stats.hunger - 0.045, 0, 100);
        p.stats.energy = clamp(p.stats.energy - 0.022 * moss * (isNight ? 1.4 : 1), 0, 100);
        p.stats.cleanliness = clamp(p.stats.cleanliness - (this.has('gravity_nap') ? 0.006 : 0.01), 0, 100);
        const moodTarget = 38 + p.bond * 0.35;
        const nightShield = isNight && this.has('starlight') ? 0.2 : 1;
        let dm = (moodTarget - p.stats.mood) * 0.002 * warmPurr * nightShield;
        if (p.stats.hunger < 25) dm -= 0.04;
        if (p.stats.energy < 20) dm -= 0.02;
        p.stats.mood = clamp(p.stats.mood + dm, 10, 100);
      }
      p.bond = clamp(p.bond - 0.0008, 0, 100);
      this.recalcTraits();
    }

    // пузырь реплики живёт 7 секунд
    if (s.bubble && now - s.bubble.at > 7000) { s.bubble = null; this.emit(); return; }

    this.checkDailyRollover(false);
    this.emit();
  }

  private pushDiary(text: string, moodWord: string) {
    this.state.diary.unshift({ id: uid(), day: Math.floor((Date.now() - this.state.createdAt) / DAY), date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }), text, moodWord });
    if (this.state.diary.length > 40) this.state.diary.length = 40;
  }

  private checkDailyRollover(silent: boolean) {
    const s = this.state;
    const today = dayKeyOf(Date.now());
    if (s.dayKey === today) {
      if (!s.quests.length) this.rollQuests();
      return;
    }
    // вчерашняя запись дневника
    const p = s.pet;
    if (p && !silent) {
      const w = getWeather();
      this.pushDiary(makeDiaryText({
        ownerName: s.owner.name,
        fedTimes: s.counters['feed'] ?? 0,
        playedTimes: s.counters['play'] ?? 0,
        avgMood: p.stats.mood,
        weather: w.label.toLowerCase(),
      }), p.stats.mood > 65 ? MOOD_WORDS[Math.floor(Math.random() * 4)] : MOOD_WORDS[4 + Math.floor(Math.random() * 4)]);
    }
    s.dayKey = today;
    this.rollQuests();

    if (p && !p.transcended) {
      const ageDays = (Date.now() - p.growth.bornAt) / DAY;
      const stage = stageForAge(ageDays);
      const prevStage = stageForAge((Date.now() - DAY - p.growth.bornAt) / DAY);
      if (stage.key !== prevStage.key && !silent) {
        this.setBubble(`Я вырос! Теперь я — ${stage.label.toLowerCase()}. Время такое странное… но тёплое.`);
        this.addMemory('момент', `${p.name} стал старше: стадия «${stage.label}»`);
        this.pushDiary(`Сегодня я стал ${stage.label.toLowerCase()}ом. Если честно, колени пока не трясутся.`, 'гордый');
        sfx.chime();
      }
      // бережная трансценденция (только глубокая старость)
      if (stage.key === 'elder' && ageDays > 45 && p.stats.energy < 30 && Math.random() < 0.22) {
        this.transcend();
      }
    }
    this.save();
  }

  /* ---------- наследие ---------- */
  private transcend() {
    const s = this.state; const p = s.pet; if (!p) return;
    p.transcended = true;
    const skills = p.growth.skills;
    const top = Object.entries(skills).sort((a, b) => b[1] - a[1])[0];
    const bonusMap: Record<string, string> = { 'эмпатия': 'спокойствие', 'любознательность': 'любопытство', 'интеллект': 'мудрость', 'спорт': 'отвага', 'творчество': 'вдохновение', 'магия': 'вдохновение' };
    const entry: LegacyEntry = {
      id: uid(),
      name: p.name,
      species: speciesOf(p.dna.species).label,
      rarity: p.dna.rarity,
      days: Math.floor((Date.now() - p.growth.bornAt) / DAY),
      bonus: bonusMap[top[0]] ?? 'спокойствие',
      colorPrimary: p.dna.colorPrimary,
      epitaph: `${p.name} прожил(а) ${Math.floor((Date.now() - p.growth.bornAt) / DAY)} дней и стал(а) ${top[0]}ом на ${Math.round(top[1])} из 100. Теперь это маленький свет в нашем окне.`,
      at: Date.now(),
    };
    s.legacy.push(entry);
    s.pendingFarewell = entry;
    this.pushDiary(`${p.name} превратился в духа памяти. Он оставил нам ${entry.bonus} и целое созвездие тёплых дней.`, 'тихий');
    sfx.sad();
    this.save();
    this.emit();
  }
  dismissFarewell() { this.state.pendingFarewell = null; this.commit(); }
  startNewGeneration(): Pet | null {
    const s = this.state;
    const last = s.legacy[s.legacy.length - 1];
    s.pendingFarewell = null;
    const p = this.hatchEgg(last ? { colorPrimary: last.colorPrimary } : null);
    return p;
  }

  /* ---------- проактивные реплики ---------- */
  idleSpeak() {
    const p = this.state.pet;
    if (!p || p.transcended || p.sleeping || this.state.pendingWelcome) return;
    this.setBubble(proactiveLine(this.state));
  }

  toggleSetting(key: 'sound' | 'reminders') {
    this.state.settings[key] = !this.state.settings[key];
    if (key === 'sound') setSoundEnabled(this.state.settings.sound);
    this.commit();
  }
}

/* ============================================================
 * Утилиты времени и погоды (TimeEngine helpers)
 * ============================================================ */
export function formatAway(ms: number): string {
  const h = ms / HOUR;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))} мин`;
  if (h < 48) return `${Math.floor(h)} ч ${Math.round((ms % HOUR) / 60000)} мин`;
  return `${Math.floor(h / 24)} дн ${Math.floor(h % 24)} ч`;
}
export function timePhase(): 'morning' | 'day' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 5 && h < 9) return 'morning';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}
export function getWeather() {
  const d = new Date();
  const doy = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / DAY);
  const rng = mulberry32(doy * 7 + d.getFullYear());
  const month = d.getMonth();
  const winter = month === 11 || month <= 1;
  const r = rng();
  if (winter && r < 0.4) return { kind: 'snow', label: 'Снег' };
  if (r < 0.35) return { kind: 'rain', label: 'Дождь' };
  if (r < 0.55) return { kind: 'clouds', label: 'Облачно' };
  if (r < 0.75) return { kind: 'clear', label: 'Ясно' };
  return { kind: 'wind', label: 'Ветерок' };
}

export const engine = new GameEngine();
