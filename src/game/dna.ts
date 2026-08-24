/* ============================================================
 * PetDNA — процедурный генератор уникальных питомцев
 * Каждый питомец описывается сидом: форма, уши, хвост, узор,
 * палитра, аура, редкость, способность, имя, idle-анимация.
 * ============================================================ */
import type { PetDNA, Rarity } from './types';

/* ---------- seeded RNG (mulberry32) ---------- */
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
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/* ---------- палитры (мягкие, сказочные) ---------- */
const PALETTES = [
  { p: '#ffb49b', s: '#ffe1d1', a: '#ff8f7d' },  // персик
  { p: '#9fe8c9', s: '#e2fbf0', a: '#7fd4ae' },  // мята
  { p: '#8ecae6', s: '#dff2fc', a: '#6fb4d8' },  // небо
  { p: '#c8b6ff', s: '#ece4ff', a: '#a992f0' },  // лаванда
  { p: '#ffd98e', s: '#fff1d4', a: '#f4c266' },  // масло
  { p: '#ffaec9', s: '#ffe3ee', a: '#f78fb3' },  // роза
  { p: '#b5e0a8', s: '#e8f7e0', a: '#8fca7f' },  // шалфей
  { p: '#f2b8a0', s: '#fbe4d8', a: '#d98e73' },  // глина
];
const AURAS = ['#ffd98e', '#9fe8c9', '#8ecae6', '#c8b6ff', '#ffaec9', '#fff3e2'];

/* ---------- архетипы видов ---------- */
export interface SpeciesDef {
  key: string; label: string; desc: string;
  ears: string[]; tails: string[]; patterns: string[]; bodies: number[];
  syllA: string[]; syllB: string[];
  abilities: { id: string; name: string; desc: string }[];
}
export const SPECIES: SpeciesDef[] = [
  {
    key: 'fluffy', label: 'Пушистик', desc: 'Тёплый комочек уюта, пахнет карамелью.',
    ears: ['round', 'long'], tails: ['fluffy', 'curl'], patterns: ['belly', 'spots'], bodies: [0, 1],
    syllA: ['Пух', 'Мя', 'Бу', 'Со', 'Ты'], syllB: ['ша', 'ша', 'лка', 'мик', 'ня'],
    abilities: [
      { id: 'warm_purr', name: 'Тёплое мурчание', desc: 'Настроение хозяина рядом медленно восстанавливается.' },
      { id: 'crumb_finder', name: 'Нюх на крошки', desc: 'Чаще находит искры во время прогулок.' },
    ],
  },
  {
    key: 'spirit', label: 'Дух рощи', desc: 'Тихий хранитель листвы и утреннего тумана.',
    ears: ['leaf', 'none'], tails: ['wisp', 'leaf'], patterns: ['glowdots', 'belly'], bodies: [2, 1],
    syllA: ['Ви', 'Лу', 'Э', 'Ива', 'Се'], syllB: ['ла', 'ми', 'ва', 'ри', 'нь'],
    abilities: [
      { id: 'calm_moss', name: 'Спокойный мох', desc: 'Энергия питомца расходуется медленнее.' },
      { id: 'root_song', name: 'Песня корней', desc: 'Сны чаще приносят подарки.' },
    ],
  },
  {
    key: 'dragon', label: 'Дракоша', desc: 'Крошечный, но уже дышит тёплым светом.',
    ears: ['horn', 'pointy'], tails: ['spike', 'curl'], patterns: ['scales', 'belly'], bodies: [1, 0],
    syllA: ['Иг', 'Кра', 'Жи', 'Дра', 'О'], syllB: ['ни', 'ша', 'ко', 'шик', 'рро'],
    abilities: [
      { id: 'ember_heart', name: 'Уголёк в груди', desc: 'Меньше мёрзнет и быстрее согревается после сна.' },
      { id: 'spark_burp', name: 'Искрящаяся отрыжка', desc: 'Иногда выдыхает искры — бонус к искрам за заботу.' },
    ],
  },
  {
    key: 'star', label: 'Звёздное дитя', desc: 'Упало с неба и решило остаться.',
    ears: ['antenna', 'pointy'], tails: ['star', 'comet'], patterns: ['stars', 'glowdots'], bodies: [0, 3],
    syllA: ['Лю', 'Ас', 'Но', 'Со', 'Ми'], syllB: ['ми', 'тра', 'ва', 'ль', 'ка'],
    abilities: [
      { id: 'starlight', name: 'Звёздный свет', desc: 'Ночью настроение почти не падает.' },
      { id: 'wish_dust', name: 'Пыль желаний', desc: 'Сны иногда сбываются: редкие предметы.' },
    ],
  },
  {
    key: 'blob', label: 'Сновидец-блоб', desc: 'Капля сна, принявшая форму сердца.',
    ears: ['none', 'round'], tails: ['none', 'wisp'], patterns: ['belly', 'bubbles'], bodies: [3, 0],
    syllA: ['Блу', 'Жи', 'Му', 'По', 'Дре'], syllB: ['би', 'жи', 'ра', 'ня', 'ма'],
    abilities: [
      { id: 'deep_sleep', name: 'Глубокий сон', desc: 'Во сне энергия восстанавливается быстрее.' },
      { id: 'jelly_hug', name: 'Желейные объятия', desc: 'Обнимашки дают двойной эффект.' },
    ],
  },
  {
    key: 'cosmic', label: 'Космический зверь', desc: 'Внутри него тихо вращается галактика.',
    ears: ['fin', 'antenna'], tails: ['comet', 'star'], patterns: ['stars', 'scales'], bodies: [2, 1],
    syllA: ['Ко', 'Пла', 'Ор', 'Зе', 'Ква'], syllB: ['смо', 'нета', 'би', 'фи', 'зар'],
    abilities: [
      { id: 'gravity_nap', name: 'Гравитационный дрейф', desc: 'Может спать где угодно — чистота падает медленнее.' },
      { id: 'nebula_mind', name: 'Туманный разум', desc: 'Учёба даёт чуть больше опыта.' },
    ],
  },
  {
    key: 'familiar', label: 'Цифровой фамильяр', desc: 'Родился из тёплого света экрана.',
    ears: ['pointy', 'fin'], tails: ['curl', 'wisp'], patterns: ['circuit', 'spots'], bodies: [2, 3],
    syllA: ['Би', 'Пи', 'Гли', 'Чи', 'Да'], syllB: ['тик', 'кс', 'тчи', 'па', 'та'],
    abilities: [
      { id: 'cache_memory', name: 'Кэш-память', desc: 'Быстрее запоминает слова и факты о хозяине.' },
      { id: 'pixel_luck', name: 'Пиксельная удача', desc: 'В мини-играх награды чуть щедрее.' },
    ],
  },
  {
    key: 'forest', label: 'Лесной топотун', desc: 'Пахнет земляникой и приключениями.',
    ears: ['long', 'leaf'], tails: ['puff', 'fluffy'], patterns: ['stripes', 'spots'], bodies: [1, 2],
    syllA: ['То', 'Гри', 'Ежо', 'Ли', 'Мо'], syllB: ['па', 'бок', 'вик', 'са', 'хно'],
    abilities: [
      { id: 'trail_sense', name: 'Чутьё тропинок', desc: 'Прогулки приносят больше находок.' },
      { id: 'berry_pocket', name: 'Ягодный карман', desc: 'Иногда приносит ягоды из леса.' },
    ],
  },
];

export const TEMPERAMENTS = ['спокойный', 'любопытный', 'игривый', 'робкий', 'смелый', 'озорной', 'нежный', 'умный', 'мечтательный'];
export const LIKES_POOL = ['мёд', 'ягоды', 'звёздный суп', 'дождь за окном', 'музыкальная шкатулка', 'рисование', 'книги', 'прогулки', 'обнимашки', 'лунное печенье', 'аквариум', 'снег'];
export const IDLES = ['anim-bob', 'anim-sway', 'anim-float'];

const ABILITY_FLAVOR: Record<string, string> = {
  warm_purr: 'мурчит, когда вы рядом', crumb_finder: 'вечно что-то находит',
  calm_moss: 'невероятно спокойный', root_song: 'напевает корням деревьев',
  ember_heart: 'тёплый, как печка', spark_burp: 'иногда фыркает искрами',
  starlight: 'светится в темноте', wish_dust: 'собирает пыль желаний',
  deep_sleep: 'спит как облако', jelly_hug: 'обнимает всем собой',
  gravity_nap: 'парит во сне', nebula_mind: 'думает туманностями',
  cache_memory: 'помнит всё-всё', pixel_luck: 'немного глючит от счастья',
  trail_sense: 'знает все тропинки', berry_pocket: 'прячет ягоды за щекой',
};
export const abilityFlavor = (id: string) => ABILITY_FLAVOR[id] ?? 'полон загадок';

/* ---------- редкость (без обид для обычных!) ---------- */
export function rollRarity(rng: () => number): Rarity {
  const r = rng() * 100;
  if (r < 48) return 'обычный';
  if (r < 76) return 'необычный';
  if (r < 91) return 'редкий';
  if (r < 98) return 'эпический';
  return 'мифический';
}
export const RARITY_COLOR: Record<Rarity, string> = {
  'обычный': '#9fe8c9', 'необычный': '#8ecae6', 'редкий': '#c8b6ff', 'эпический': '#ffaec9', 'мифический': '#ffd98e',
};
export const RARITY_BONUS: Record<Rarity, string> = {
  'обычный': 'крепкое здоровье', 'необычный': 'хороший аппетит', 'редкий': 'яркие сны', 'эпический': 'сильная аура', 'мифический': 'звёздная благодать',
};

/* ---------- генерация имени ---------- */
export function generateName(rng: () => number, species: SpeciesDef): string {
  let name = pick(rng, species.syllA) + pick(rng, species.syllB);
  if (rng() < 0.5) name += pick(rng, species.syllB);
  if (rng() < 0.35) name += pick(rng, ['и', 'о', 'у', 'а']);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/* ---------- главная функция генерации ДНК ---------- */
export function generateDNA(seed: number, inherit?: { colorPrimary?: string; speciesKey?: string } | null): PetDNA {
  const rng = mulberry32(seed);
  const species = inherit?.speciesKey && rng() < 0.5
    ? SPECIES.find(s => s.key === inherit.speciesKey) ?? pick(rng, SPECIES)
    : pick(rng, SPECIES);
  const pal = pick(rng, PALETTES);
  const rarity = rollRarity(rng);
  const primary = inherit?.colorPrimary && rng() < 0.65 ? inherit.colorPrimary : pal.p;
  return {
    seed,
    species: species.key,
    body: pick(rng, species.bodies),
    ears: pick(rng, species.ears),
    tail: pick(rng, species.tails),
    eyeStyle: rint(rng, 0, 2),
    mouth: rint(rng, 0, 2),
    pattern: pick(rng, species.patterns),
    colorPrimary: primary,
    colorSecondary: pal.s,
    colorAccent: pal.a,
    aura: rarity === 'мифический' ? '#ffd98e' : rarity === 'эпический' ? pick(rng, AURAS) : pick(rng, AURAS),
    rarity,
    idle: pick(rng, IDLES),
    abilityId: pick(rng, species.abilities).id,
  };
}

export const speciesOf = (key: string): SpeciesDef => SPECIES.find(s => s.key === key) ?? SPECIES[0];
export const abilityOf = (dna: PetDNA) => speciesOf(dna.species).abilities.find(a => a.id === dna.abilityId) ?? speciesOf(dna.species).abilities[0];

/* ---------- личность ---------- */
export function generatePersonality(rng: () => number, dna: PetDNA) {
  const temperament = pick(rng, TEMPERAMENTS);
  const likes = [...new Set([pick(rng, LIKES_POOL), pick(rng, LIKES_POOL), pick(rng, LIKES_POOL)])];
  const dislikes = [pick(rng, LIKES_POOL.filter(l => !likes.includes(l)))];
  return {
    temperament,
    likes,
    dislikes,
    traits: [`${temperament}`, `${abilityFlavor(dna.abilityId)}`],
  };
}
