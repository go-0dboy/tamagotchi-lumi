/* ============================================================
 * ЛЮМОС — типы данных игрового движка
 * ============================================================ */

export type Rarity = 'обычный' | 'необычный' | 'редкий' | 'эпический' | 'мифический';

export interface PetDNA {
  seed: number;
  species: string;          // ключ архетипа
  body: number;             // 0..3 форма тела
  ears: string;             // тип ушей
  tail: string;             // тип хвоста
  eyeStyle: number;         // размер/форма глаз
  mouth: number;
  pattern: string;          // узор
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  aura: string;             // цвет ауры
  rarity: Rarity;
  idle: string;             // любимая idle-анимация
  abilityId: string;        // уникальная способность
}

export interface Personality {
  temperament: string;
  likes: string[];
  dislikes: string[];
  traits: string[];
}

export interface Stats {
  hunger: number;
  energy: number;
  mood: number;
  cleanliness: number;
}

export interface Growth {
  xp: number;
  level: number;
  bornAt: number;
  skills: Record<string, number>; // интеллект, спорт, эмпатия, магия, творчество, любознательность
}

export interface Outfit {
  hat: string | null;
  scarf: string | null;
  glasses: string | null;
  wings: string | null;
}

export interface MemoryItem {
  id: string;
  kind: 'факт' | 'эмоция' | 'момент' | 'обещание' | 'подарок' | 'шутка';
  text: string;
  at: number;
}

export interface DiaryEntry {
  id: string;
  day: number;
  date: string;
  text: string;
  moodWord: string;
}

export interface DreamItem {
  id: string;
  at: number;
  text: string;
  gift?: string;
}

export interface OfflineEvent { icon: string; text: string; }

export interface QuestState {
  id: string;
  metric: string;
  text: string;
  target: number;
  reward: number;
  progress: number;
  claimed: boolean;
}

export interface LegacyEntry {
  id: string;
  name: string;
  species: string;
  rarity: Rarity;
  days: number;
  bonus: string;
  colorPrimary: string;
  epitaph: string;
  at: number;
}

export interface OwnerProfile {
  name: string;
  favorites: string[];
  facts: string[];
  moods: number[];
  promises: string[];
}

export interface Pet {
  id: string;
  name: string;
  dna: PetDNA;
  personality: Personality;
  stats: Stats;
  growth: Growth;
  outfit: Outfit;
  bond: number;       // привязанность 0..100
  trust: number;      // доверие 0..100
  sleeping: boolean;
  transcended: boolean;
  evolutionTraits: string[];  // визуальные черты от стиля заботы
  wordsLearned: string[];
}

export interface ChatMsg { id: string; from: 'pet' | 'owner'; text: string; at: number; }

export interface GameState {
  version: number;
  createdAt: number;
  lastSeen: number;
  coins: number;
  owner: OwnerProfile;
  pet: Pet | null;
  inventory: Record<string, number>;
  roomTheme: string;
  furniture: string[];
  memories: MemoryItem[];
  diary: DiaryEntry[];
  dreams: DreamItem[];
  chat: ChatMsg[];
  quests: QuestState[];
  questDay: string;
  legacy: LegacyEntry[];
  counters: Record<string, number>;
  pendingWelcome: { awayMs: number; events: OfflineEvent[]; line: string } | null;
  pendingFarewell: LegacyEntry | null;
  focusEndsAt: number | null;
  focusMinutes: number;
  bubble: { text: string; at: number } | null;
  dayKey: string;
  settings: { sound: boolean; reminders: boolean };
}

export type EngineEvent = 'state';
