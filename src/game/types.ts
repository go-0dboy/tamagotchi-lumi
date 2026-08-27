/* ============================================================
 * ЛЮМОС — типы данных игрового движка
 * ============================================================ */

export type Rarity = 'обычный' | 'необычный' | 'редкий' | 'эпический' | 'мифический';

export interface PetDNA {
  seed: number;
  species: string;
  body: number;
  ears: string;
  tail: string;
  eyeStyle: number;
  mouth: number;
  pattern: string;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  aura: string;
  rarity: Rarity;
  idle: string;
  abilityId: string;
}

export interface Personality {
  temperament: string;
  likes: string[];
  dislikes: string[];
  traits: string[];
}

export interface Stats { hunger: number; energy: number; mood: number; cleanliness: number; }

export interface Growth {
  xp: number;
  level: number;
  bornAt: number;
  skills: Record<string, number>;
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

export interface DiaryEntry { id: string; day: number; date: string; text: string; moodWord: string; }
export interface DreamItem { id: string; at: number; text: string; gift?: string; }
export interface OfflineEvent { icon: string; text: string; }

export interface QuestState {
  id: string; metric: string; text: string; target: number;
  reward: number; progress: number; claimed: boolean;
}

export interface LegacyEntry {
  id: string; name: string; species: string; rarity: Rarity;
  days: number; bonus: string; colorPrimary: string; epitaph: string; at: number;
}

export interface OwnerProfile {
  name: string;
  favorites: string[];
  facts: string[];
  moods: number[];
  promises: string[];
  city: string;
  geo: { lat: number; lon: number } | null;
}

export interface Pet {
  id: string;
  name: string;
  dna: PetDNA;
  personality: Personality;
  stats: Stats;
  growth: Growth;
  outfit: Outfit;
  bond: number;
  trust: number;
  sleeping: boolean;
  transcended: boolean;
  evolutionTraits: string[];
  wordsLearned: string[];
  knowledge: string[];
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
  inherit: { color?: string; species?: string } | null;
  pendingWelcome: { awayMs: number; events: OfflineEvent[]; line: string } | null;
  pendingFarewell: LegacyEntry | null;
  focusEndsAt: number | null;
  focusMinutes: number;
  bubble: { text: string; at: number } | null;
  dayKey: string;
  settings: { sound: boolean; reminders: boolean };
  freshHatch: boolean;
  fx: { kind: 'pet' | 'clean' | 'bath'; at: number } | null;
  weatherReal: { kind: string; label: string; temp: number; at: number } | null;
  dialog: {
    pendingQuestion: 'name' | 'mood' | 'day' | 'favorite' | null; // вопрос, который питомец задал и ждёт ответа
    lastIntent: string;
    turn: number;
  };
}
