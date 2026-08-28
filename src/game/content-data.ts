/* Контентные каталоги: магазин, темы комнаты, локации прогулок, аффирмации. */

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
  { id: 'wings_moth', name: 'Крылышки мотылька', price: 90, kind: 'wings', icon: 'wings', desc: 'Порхать — да.' },
  { id: 'furn_starlamp', name: 'Звёздная лампа', price: 70, kind: 'furniture', icon: 'lamp', desc: 'Сны о созвездиях.' },
  { id: 'furn_aquarium', name: 'Аквариум с луной', price: 85, kind: 'furniture', icon: 'aquarium', desc: 'Внутри плавает луна.' },
  { id: 'furn_bookshelf', name: 'Книжная полка', price: 65, kind: 'furniture', icon: 'bookshelf', desc: 'Сказки на ночь.' },
  { id: 'furn_plant', name: 'Растение-светлячок', price: 40, kind: 'furniture', icon: 'plant', desc: 'Мурлычет при поливе.' },
  { id: 'furn_musicbox', name: 'Музыкальная шкатулка', price: 100, kind: 'furniture', icon: 'musicbox', desc: 'Колыбельная для двоих.' },
  { id: 'gift_flower', name: 'Цветок-незабудка', price: 25, kind: 'gift', icon: 'flower', desc: 'Чтобы помнили.' },
];

export const ROOM_THEMES = [
  { id: 'dusk', name: 'Сумерки', wall: '#253258' },
  { id: 'meadow', name: 'Лужайка', wall: '#2e4a43' },
  { id: 'rose', name: 'Розовый вечер', wall: '#4a2f45' },
  { id: 'sea', name: 'Морская бухта', wall: '#23435c' },
];

export interface WalkLoc { id: string; icon: string; name: string; stories: string[]; tint: string; }
export const WALK_LOCATIONS: WalkLoc[] = [
  {
    id: 'park', icon: 'plant', name: 'Липовый парк', tint: '#9fe8c9',
    stories: [
      'Мы кормили уток крошками лунного печенья. Утки были вежливые.',
      'Я залез на самый красивый пенёк и объявил его своим замком.',
      'В парке пахло липой и приключениями. Принесли домой два каштана.',
    ],
  },
  {
    id: 'bakery', icon: 'cookie', name: 'Пекарня «Тёплый хлеб»', tint: '#ffd98e',
    stories: [
      'Пекарь угостил нас булочкой с корицей. Я запомнил рецепт. Почти.',
      'Мы смотрели, как поднимается тесто. Оно поднималось. Мы радовались.',
      'В пекарне пахло так, что я чуть не остался там жить.',
    ],
  },
  {
    id: 'lib', icon: 'book', name: 'Библиотека', tint: '#c8b6ff',
    stories: [
      'Я прочитал целую полку. Ну, обнюхал. Это почти то же самое.',
      'Библиотекарь пустил меня в отдел сказок. Я теперь знаю три новые.',
      'В тишине библиотеки слышно, как растут знания. Честно.',
    ],
  },
  {
    id: 'river', icon: 'drop', name: 'Набережная', tint: '#8ecae6',
    stories: [
      'Мы пускали кораблики из листиков. Мой доплыл до середины реки!',
      'Река рассказывала сказку. Я запомнил начало: «Жила-была вода…»',
      'В воде отражалось небо. Я поздоровался с отражением луны.',
    ],
  },
];

export const AFFIRMATIONS = [
  'Сегодня у тебя всё получится. Я проверил по звёздам.',
  'Ты делаешь достаточно. Даже больше, чем кажется.',
  'Маленькие шаги — тоже шаги. Я иду рядом.',
  'Отдохнуть — не значит сдаться. Это значит заботиться.',
  'Ты — чьё-то любимое созвездие.',
];
