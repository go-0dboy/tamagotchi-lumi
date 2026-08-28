/* ============================================================
 * Контентные каталоги: еда, магазин, мебель, квесты, стадии,
 * навыки, темы комнаты, аффирмации и локации прогулок.
 * ============================================================ */

export interface FoodDef { id: string; name: string; icon: string; price: number; hunger: number; mood: number; tag: string; desc: string; }
export const FOODS: FoodDef[] = [
  { id: 'berries', name: 'Лесные ягоды', icon: 'berry', price: 8, hunger: 18, mood: 2, tag: 'ягоды', desc: 'Сладкие и чуть прохладные.' },
  { id: 'honey', name: 'Капля мёда', icon: 'honey', price: 12, hunger: 14, mood: 6, tag: 'мёд', desc: 'Солнечный вкус.' },
  { id: 'soup', name: 'Звёздный суп', icon: 'soup', price: 20, hunger: 34, mood: 4, tag: 'звёздный суп', desc: 'В нём плавают маленькие созвездия.' },
  { id: 'cookie', name: 'Лунное печенье', icon: 'cookie', price: 15, hunger: 20, mood: 8, tag: 'лунное печенье', desc: 'Хрустит, как первый снег.' },
  { id: 'tea', name: 'Облачный чай', icon: 'tea', price: 10, hunger: 8, mood: 5, tag: 'чай', desc: 'Напиток из тёплого тумана.' },
  { id: 'cake', name: 'Праздничный торт', icon: 'cake', price: 40, hunger: 30, mood: 16, tag: 'торт', desc: 'Для очень важных дней.' },
];

export interface ItemDef {
  id: string; name: string; price: number;
  kind: 'hat' | 'scarf' | 'glasses' | 'wings' | 'furniture' | 'toy' | 'gift' | 'keepsake';
  icon: string; desc: string;
}
export const SHOP: ItemDef[] = [
  { id: 'hat_star', name: 'Колпачок со звездой', price: 60, kind: 'hat', icon: 'hat', desc: 'Чтобы сны были выше.' },
  { id: 'hat_leaf', name: 'Шапочка-листик', price: 45, kind: 'hat', icon: 'leafhat', desc: 'Прячет от дождя и грусти.' },
  { id: 'scarf_cozy', name: 'Вязаный шарфик', price: 50, kind: 'scarf', icon: 'scarf', desc: 'Тёплый, как обнимашка.' },
  { id: 'glasses_round', name: 'Круглые очки', price: 55, kind: 'glasses', icon: 'glasses', desc: 'Для очень умного вида.' },
  { id: 'wings_moth', name: 'Крылышки мотылька', price: 90, kind: 'wings', icon: 'wings', desc: 'Летать не обязательно. Порхать — да.' },
  { id: 'furn_starlamp', name: 'Звёздная лампа', price: 70, kind: 'furniture', icon: 'lamp', desc: 'Сны о созвездиях гарантированы.' },
  { id: 'furn_aquarium', name: 'Аквариум с луной', price: 85, kind: 'furniture', icon: 'aquarium', desc: 'Внутри плавает маленькая луна.' },
  { id: 'furn_bookshelf', name: 'Книжная полка', price: 65, kind: 'furniture', icon: 'bookshelf', desc: 'Сказки на ночь и на день.' },
  { id: 'furn_plant', name: 'Растение-светлячок', price: 40, kind: 'furniture', icon: 'plant', desc: 'Мурлычет, когда его поливают.' },
  { id: 'furn_musicbox', name: 'Музыкальная шкатулка', price: 100, kind: 'furniture', icon: 'musicbox', desc: 'Играет колыбельную для двоих.' },
  { id: 'toy_kite', name: 'Бумажный змей', price: 45, kind: 'toy', icon: 'kite', desc: 'Для ветреных дней.' },
  { id: 'gift_flower', name: 'Цветок-незабудка', price: 25, kind: 'gift', icon: 'flower', desc: 'Чтобы помнили.' },
];

export const KEEPSAKES: ItemDef[] = [
  { id: 'keep_drawing', name: 'Рисунок питомца', price: 0, kind: 'keepsake', icon: 'drawing', desc: 'Нарисован, пока вас не было. Это вы.' },
  { id: 'keep_feather', name: 'Перо из сна', price: 0, kind: 'keepsake', icon: 'feather', desc: 'Принесено из звёздного сна.' },
  { id: 'keep_shell', name: 'Ракушка тишины', price: 0, kind: 'keepsake', icon: 'shell', desc: 'Если приложить к уху — слышно море.' },
  { id: 'keep_stone', name: 'Тёплый камешек', price: 0, kind: 'keepsake', icon: 'stone', desc: 'Он помнит вашу ладонь.' },
];

export interface QuestDef { id: string; metric: string; text: string; target: number; reward: number; }
export const QUEST_POOL: QuestDef[] = [
  { id: 'q_feed', metric: 'feed', text: 'Покормить питомца 2 раза', target: 2, reward: 20 },
  { id: 'q_pet', metric: 'pet', text: 'Погладить питомца 5 раз', target: 5, reward: 15 },
  { id: 'q_play', metric: 'play', text: 'Сыграть в мини-игру', target: 1, reward: 25 },
  { id: 'q_study', metric: 'study', text: 'Позаниматься вместе', target: 1, reward: 20 },
  { id: 'q_talk', metric: 'talk', text: 'Поболтать 3 раза', target: 3, reward: 15 },
  { id: 'q_clean', metric: 'clean', text: 'Навести чистоту (уборка или купание)', target: 1, reward: 15 },
  { id: 'q_walk', metric: 'walk', text: 'Сходить на прогулку', target: 1, reward: 20 },
  { id: 'q_gift', metric: 'gift', text: 'Подарить подарок', target: 1, reward: 25 },
  { id: 'q_focus', metric: 'focus', text: 'Провести фокус-сессию', target: 1, reward: 30 },
];

export const STAGES = [
  { key: 'egg', label: 'Яйцо', minDays: -1 },
  { key: 'baby', label: 'Малыш', minDays: 0 },
  { key: 'child', label: 'Ребёнок', minDays: 2 },
  { key: 'teen', label: 'Подросток', minDays: 6 },
  { key: 'adult', label: 'Взрослый', minDays: 14 },
  { key: 'elder', label: 'Старейшина', minDays: 40 },
];
export function stageForAge(days: number): { key: string; label: string } {
  let cur = STAGES[1];
  for (const s of STAGES) if (days >= s.minDays && s.key !== 'egg') cur = s;
  return { key: cur.key, label: cur.label };
}
export const stageScale = (key: string) => ({ baby: 0.72, child: 0.85, teen: 0.95, adult: 1, elder: 1.02 }[key] ?? 1);

export const SKILLS = [
  { key: 'интеллект', icon: 'book', trait: 'очки мудрости', color: '#8ecae6' },
  { key: 'спорт', icon: 'bolt', trait: 'спортивная повязка', color: '#9fe8c9' },
  { key: 'эмпатия', icon: 'heart', trait: 'мягкое свечение', color: '#ffaec9' },
  { key: 'магия', icon: 'spark', trait: 'мерцающие искры', color: '#c8b6ff' },
  { key: 'творчество', icon: 'brush', trait: 'берет художника', color: '#ffd98e' },
  { key: 'любознательность', icon: 'compass', trait: 'рюкзачок искателя', color: '#f4c266' },
];
export const TRAIT_THRESHOLD = 40;

export const ROOM_THEMES = [
  { id: 'dusk', name: 'Сумерки', wall: '#253258', wallDeep: '#1a2544', floor: '#3a2f52', floorDeep: '#2b2140' },
  { id: 'meadow', name: 'Лужайка', wall: '#2e4a43', wallDeep: '#22382f', floor: '#4a3f2e', floorDeep: '#372f22' },
  { id: 'rose', name: 'Розовый вечер', wall: '#4a2f45', wallDeep: '#372335', floor: '#3a2f52', floorDeep: '#2b2140' },
  { id: 'sea', name: 'Морская бухта', wall: '#23435c', wallDeep: '#1a3246', floor: '#3c4a3a', floorDeep: '#2d382c' },
];

export const AFFIRMATIONS = [
  'Сегодня у тебя всё получится. Я проверил по звёздам.',
  'Ты делаешь достаточно. Даже больше, чем кажется.',
  'Маленькие шаги — тоже шаги. Я иду рядом.',
  'Отдохнуть — не значит сдаться. Это значит заботиться.',
  'Ты — чьё-то любимое созвездие.',
  'Твоё тепло оставляет следы. Я видел.',
];

export interface WalkLoc { id: string; icon: string; name: string; stories: string[]; }
export const WALK_LOCATIONS: WalkLoc[] = [
  {
    id: 'park', icon: 'plant', name: 'Липовый парк',
    stories: [
      'Мы кормили уток крошками лунного печенья. Утки были вежливые.',
      'Я залез на самый красивый пенёк и объявил его своим замком.',
      'В парке пахло липой и приключениями. Принесли домой два каштана.',
    ],
  },
  {
    id: 'bakery', icon: 'cookie', name: 'Пекарня «Тёплый хлеб»',
    stories: [
      'Пекарь угостил нас булочкой с корицей. Я запомнил рецепт. Почти.',
      'В пекарне я научился говорить «спасибо» с набитым ртом. Тренировался.',
      'Мы смотрели, как поднимается тесто. Оно поднималось. Мы радовались.',
    ],
  },
  {
    id: 'lib', icon: 'book', name: 'Библиотека',
    stories: [
      'Я прочитал целую полку. Ну, обнюхал. Это почти то же самое.',
      'Библиотекарь пустил меня в отдел сказок. Я теперь знаю три новые.',
      'В тишине библиотеки слышно, как растут знания. Честно.',
    ],
  },
  {
    id: 'river', icon: 'drop', name: 'Набережная',
    stories: [
      'Мы пускали кораблики из листиков. Мой доплыл до середины реки!',
      'Река рассказывала сказку. Я запомнил начало: «Жила-была вода…»',
      'В воде отражалось небо. Я поздоровался с отражением луны.',
    ],
  },
];
