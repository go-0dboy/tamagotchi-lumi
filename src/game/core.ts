/* ============================================================
 * Ядро: типы, хелперы, ДНК-генератор питомца, звук.
 * ============================================================ */

/* ---------- helpers ---------- */
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const dayKeyOf = (t: number) => new Date(t).toISOString().slice(0, 10);

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
export const rint = (rng: () => number, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
export const choice = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/* ---------- типы ---------- */
export type Rarity = 'обычный' | 'необычный' | 'редкий' | 'эпический' | 'мифический';

export interface PetDNA {
  seed: number;
  species: string; body: number; ears: string; tail: string;
  eyeStyle: number; mouth: number; pattern: string;
  colorPrimary: string; colorSecondary: string; colorAccent: string;
  aura: string; rarity: Rarity; idle: string; abilityId: string;
}

export interface PetStats { hunger: number; energy: number; mood: number; cleanliness: number; }

export interface Pet {
  id: string; name: string;
  dna: PetDNA;
  personality: { temperament: string; likes: string[]; dislikes: string[]; traits: string[] };
  stats: PetStats;
  growth: { xp: number; level: number; bornAt: number; skills: Record<string, number> };
  outfit: { hat: string | null; scarf: string | null; glasses: string | null; wings: string | null };
  bond: number; trust: number;
  sleeping: boolean; transcended: boolean;
  evolutionTraits: string[];
  wordsLearned: string[];
  knowledge: string[];
}

export interface MemoryItem { id: string; kind: 'факт' | 'эмоция' | 'момент' | 'обещание' | 'подарок' | 'шутка'; text: string; at: number; }
export interface DiaryEntry { id: string; day: number; text: string; date: string; moodWord: string; at: number; }
export interface DreamItem { id: string; text: string; gift?: string; at: number; }
export interface ChatMsg { id: string; from: 'pet' | 'owner'; text: string; at: number; }
export interface OfflineEvent { icon: string; text: string; }
export interface LegacyEntry { id: string; name: string; species: string; days: number; colorPrimary: string; rarity: Rarity; epitaph: string; bonus: string; }
export interface QuestState { id: string; metric: string; text: string; target: number; progress: number; reward: number; claimed: boolean; }

export interface GameState {
  version: number;
  createdAt: number; lastSeen: number;
  coins: number;
  owner: { name: string; city: string; favorites: string[]; promises: string[]; moods: number[] };
  pet: Pet | null;
  inventory: Record<string, number>;
  roomTheme: string; furniture: string[];
  memories: MemoryItem[]; diary: DiaryEntry[]; dreams: DreamItem[];
  chat: ChatMsg[];
  quests: QuestState[]; questDay: string;
  legacy: LegacyEntry[];
  counters: Record<string, number>;
  inherit: { color?: string; species?: string } | null;
  pendingWelcome: { awayMs: number; events: OfflineEvent[]; line: string } | null;
  pendingFarewell: LegacyEntry | null;
  focusEndsAt: number | null; focusMinutes: number;
  bubble: { text: string; at: number } | null;
  dayKey: string;
  settings: { sound: boolean; reminders: boolean };
  freshHatch: boolean;
  fx: { kind: 'pet' | 'clean' | 'bath'; at: number } | null;
  weatherReal: { kind: string; label: string; temp: number; at: number } | null;
  dialog: { pendingQuestion: string | null; lastIntent: string; turn: number };
}

/* ---------- ДНК ---------- */
const PALETTES = [
  { p: '#ffb49b', s: '#ffe1d1', a: '#ff8f7d' },
  { p: '#9fe8c9', s: '#e2fbf0', a: '#7fd4ae' },
  { p: '#8ecae6', s: '#dff2fc', a: '#6fb4d8' },
  { p: '#c8b6ff', s: '#ece4ff', a: '#a992f0' },
  { p: '#ffd98e', s: '#fff1d4', a: '#f4c266' },
  { p: '#ffaec9', s: '#ffe3ee', a: '#f78fb3' },
  { p: '#b5e0a8', s: '#e8f7e0', a: '#8fca7f' },
];
const AURAS = ['#ffd98e', '#9fe8c9', '#8ecae6', '#c8b6ff', '#ffaec9', '#fff3e2'];

export interface SpeciesDef {
  key: string; label: string; desc: string;
  ears: string[]; tails: string[]; patterns: string[]; bodies: number[];
  syllA: string[]; syllB: string[];
  abilities: { id: string; name: string; desc: string }[];
}
export const SPECIES: SpeciesDef[] = [
  { key: 'fluffy', label: 'Пушистик', desc: 'Тёплый комочек уюта, пахнет карамелью.', ears: ['round', 'long'], tails: ['fluffy', 'curl', 'bun'], patterns: ['belly', 'spots'], bodies: [0, 1], syllA: ['Пух', 'Мя', 'Бу', 'Со'], syllB: ['ша', 'лка', 'мик', 'ня'], abilities: [{ id: 'warm_purr', name: 'Тёплое мурчание', desc: 'Настроение падает медленнее.' }, { id: 'crumb_finder', name: 'Нюх на крошки', desc: 'Чаще находит искры на прогулке.' }] },
  { key: 'spirit', label: 'Дух рощи', desc: 'Тихий хранитель листвы и тумана.', ears: ['leaf', 'tuft'], tails: ['wisp', 'leaf'], patterns: ['glowdots', 'belly'], bodies: [2, 1], syllA: ['Ви', 'Лу', 'Ива', 'Се'], syllB: ['ла', 'ми', 'ри', 'нь'], abilities: [{ id: 'calm_moss', name: 'Спокойный мох', desc: 'Энергия тратится медленнее.' }, { id: 'root_song', name: 'Песня корней', desc: 'Сны чаще приносят подарки.' }] },
  { key: 'dragon', label: 'Дракоша', desc: 'Крошечный, но уже дышит тёплым светом.', ears: ['horn', 'pointy'], tails: ['spike', 'curl'], patterns: ['scales', 'belly'], bodies: [1, 0], syllA: ['Иг', 'Кра', 'Дра', 'О'], syllB: ['ни', 'ша', 'шик', 'рро'], abilities: [{ id: 'ember_heart', name: 'Уголёк в груди', desc: 'Сон восстанавливает больше сил.' }, { id: 'spark_burp', name: 'Искрящаяся отрыжка', desc: 'Награды за ритуалы щедрее.' }] },
  { key: 'star', label: 'Звёздное дитя', desc: 'Упало с неба и решило остаться.', ears: ['antenna', 'pointy'], tails: ['star', 'comet'], patterns: ['stars', 'glowdots'], bodies: [0, 3], syllA: ['Лю', 'Ас', 'Со', 'Ми'], syllB: ['ми', 'тра', 'ль', 'ка'], abilities: [{ id: 'starlight', name: 'Звёздный свет', desc: 'Ночью настроение не падает.' }, { id: 'wish_dust', name: 'Пыль желаний', desc: 'Сны сбываются: редкие предметы.' }] },
  { key: 'fox', label: 'Лисёнок', desc: 'Рыжее чудо с хитрым носом.', ears: ['floppy', 'pointy'], tails: ['fox', 'fluffy'], patterns: ['belly', 'spots'], bodies: [1, 0], syllA: ['Ры', 'Ли', 'Фо', 'Ог'], syllB: ['жик', 'са', 'кси', 'нёк'], abilities: [{ id: 'fox_charm', name: 'Лисье обаяние', desc: 'Поглаживания бодрят сильнее.' }, { id: 'cozy_den', name: 'Уютная нора', desc: 'Сон восстанавливает быстрее.' }] },
  { key: 'cat', label: 'Туманный котёнок', desc: 'Мурчит на частоте вечернего тумана.', ears: ['pointy', 'tuft'], tails: ['curl', 'fox'], patterns: ['stripes', 'belly'], bodies: [0, 2], syllA: ['Му', 'Ко', 'Се', 'Ды'], syllB: ['рчик', 'тя', 'ва', 'мок'], abilities: [{ id: 'night_prowl', name: 'Ночной дозор', desc: 'Энергия почти не тратится.' }, { id: 'purr_heal', name: 'Мурлыканье', desc: 'Сам поднимает себе настроение.' }] },
];

export const speciesOf = (key: string): SpeciesDef => SPECIES.find(s => s.key === key) ?? SPECIES[0];

const ABILITY_FLAVOR: Record<string, string> = {
  warm_purr: 'мурчит, когда вы рядом', crumb_finder: 'вечно что-то находит',
  calm_moss: 'невероятно спокойный', root_song: 'напевает корням',
  ember_heart: 'тёплый, как печка', spark_burp: 'фыркает искрами',
  starlight: 'светится в темноте', wish_dust: 'собирает пыль желаний',
  fox_charm: 'обаятельнее всех лис', cozy_den: 'обустроил уютную нору',
  night_prowl: 'бродит по лунным крышам', purr_heal: 'мурчит себе под нос',
};
export const abilityOf = (dna: PetDNA) => speciesOf(dna.species).abilities.find(a => a.id === dna.abilityId) ?? speciesOf(dna.species).abilities[0];

export function rollRarity(rng: () => number): Rarity {
  const r = rng() * 100;
  if (r < 48) return 'обычный'; if (r < 76) return 'необычный';
  if (r < 91) return 'редкий'; if (r < 98) return 'эпический';
  return 'мифический';
}
export const RARITY_COLOR: Record<Rarity, string> = {
  'обычный': '#9fe8c9', 'необычный': '#8ecae6', 'редкий': '#c8b6ff', 'эпический': '#ffaec9', 'мифический': '#ffd98e',
};
export const RARITY_BONUS: Record<Rarity, string> = {
  'обычный': 'крепкое здоровье', 'необычный': 'хороший аппетит', 'редкий': 'яркие сны', 'эпический': 'сильная аура', 'мифический': 'звёздная благодать',
};

const IDLES = ['anim-bob', 'anim-sway', 'anim-float'];
const TEMPERAMENTS = ['спокойный', 'любопытный', 'игривый', 'робкий', 'смелый', 'озорной', 'нежный', 'умный', 'мечтательный'];
const LIKES_POOL = ['мёд', 'ягоды', 'звёздный суп', 'дождь за окном', 'рисование', 'книги', 'прогулки', 'обнимашки', 'лунное печенье', 'снег'];

export function generateDNA(seed: number, inherit?: { colorPrimary?: string; speciesKey?: string } | null): PetDNA {
  const rng = mulberry32(seed);
  const species = inherit?.speciesKey && rng() < 0.5
    ? SPECIES.find(s => s.key === inherit.speciesKey) ?? pick(rng, SPECIES)
    : pick(rng, SPECIES);
  const pal = pick(rng, PALETTES);
  const rarity = rollRarity(rng);
  return {
    seed,
    species: species.key,
    body: pick(rng, species.bodies),
    ears: pick(rng, species.ears),
    tail: pick(rng, species.tails),
    eyeStyle: rint(rng, 0, 2),
    mouth: rint(rng, 0, 2),
    pattern: pick(rng, species.patterns),
    colorPrimary: inherit?.colorPrimary && rng() < 0.65 ? inherit.colorPrimary : pal.p,
    colorSecondary: pal.s,
    colorAccent: pal.a,
    aura: rarity === 'мифический' ? '#ffd98e' : pick(rng, AURAS),
    rarity,
    idle: pick(rng, IDLES),
    abilityId: pick(rng, species.abilities).id,
  };
}
export function generateName(rng: () => number, dna: PetDNA): string {
  const sp = speciesOf(dna.species);
  let name = pick(rng, sp.syllA) + pick(rng, sp.syllB);
  if (rng() < 0.5) name += pick(rng, sp.syllB);
  return name.charAt(0).toUpperCase() + name.slice(1);
}
export function generatePersonality(rng: () => number, dna: PetDNA) {
  const temperament = pick(rng, TEMPERAMENTS);
  const likes = [...new Set([pick(rng, LIKES_POOL), pick(rng, LIKES_POOL), pick(rng, LIKES_POOL)])];
  return { temperament, likes, dislikes: [pick(rng, LIKES_POOL.filter(l => !likes.includes(l)))], traits: [temperament, ABILITY_FLAVOR[dna.abilityId] ?? 'полон загадок'] };
}

/* ---------- стадии ---------- */
export const STAGES = [
  { key: 'baby', label: 'Малыш', minDays: 0 },
  { key: 'child', label: 'Ребёнок', minDays: 2 },
  { key: 'teen', label: 'Подросток', minDays: 6 },
  { key: 'adult', label: 'Взрослый', minDays: 14 },
  { key: 'elder', label: 'Старейшина', minDays: 40 },
];
export function stageForAge(days: number) {
  let cur = STAGES[0];
  for (const s of STAGES) if (days >= s.minDays) cur = s;
  return cur;
}
export const stageScale = (key: string) => ({ baby: 0.72, child: 0.85, teen: 0.95, adult: 1, elder: 1.02 }[key] ?? 1);

/* ---------- звук (WebAudio) ---------- */
let actx: AudioContext | null = null;
let soundOn = true;
export const setSoundEnabled = (v: boolean) => { soundOn = v; };
function ac(): AudioContext | null {
  if (!soundOn) return null;
  try {
    if (!actx) actx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  } catch { return null; }
}
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, delay = 0, glide = 0) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator(); const gain = a.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + glide), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}
const SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
export const sfx = {
  pop() { tone(520, 0.12, 'sine', 0.14, 0, -180); },
  chime() { tone(880, 0.5, 'sine', 0.08); tone(1320, 0.6, 'sine', 0.05, 0.09); },
  sparkle() { tone(1560, 0.25, 'triangle', 0.07); tone(2080, 0.3, 'triangle', 0.05, 0.07); },
  purr() { tone(140, 0.5, 'sine', 0.1, 0, -20); tone(110, 0.55, 'sine', 0.07, 0.12, -15); },
  eat() { tone(300, 0.1, 'triangle', 0.12, 0, 90); tone(380, 0.12, 'triangle', 0.1, 0.1, 60); },
  sad() { tone(392, 0.5, 'sine', 0.08, 0, -80); tone(311, 0.6, 'sine', 0.06, 0.18, -60); },
  coin() { tone(988, 0.14, 'square', 0.05); tone(1319, 0.25, 'square', 0.04, 0.08); },
  levelup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.08, i * 0.1)); },
  hatch() { [392, 494, 587, 784, 988].forEach((f, i) => tone(f, 0.3, 'sine', 0.09, i * 0.09)); },
  bubble() { tone(700 + Math.random() * 300, 0.08, 'sine', 0.06); },
  tap() { tone(440 + Math.random() * 120, 0.06, 'sine', 0.05); },
  splash() { tone(300, 0.3, 'sine', 0.1, 0, 250); tone(500, 0.25, 'sine', 0.07, 0.1, 300); },
  note(i: number) { tone(SCALE[Math.max(0, Math.min(SCALE.length - 1, i))], 0.38, 'triangle', 0.13); },
};
