/* ============================================================
 * Речь питомца: чат-мозг с намерениями и контекстом,
 * слова, факты, наука, сны, офлайн-события.
 * ============================================================ */
import type { GameState } from './core';
import { SPECIES, choice } from './core';

const R = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const WORDS = [
  'звезда', 'уют', 'искра', 'туман', 'карамель', 'сверчок', 'радуга', 'тишина',
  'маяк', 'облако', 'гнездо', 'светлячок', 'мечта', 'полуночь', 'рассвет',
  'тропинка', 'фонарь', 'снежинка', 'ягода', 'ромашка', 'комета', 'галактика',
  'созвездие', 'шёпот', 'тепло', 'ладошка', 'подушка', 'одеяло', 'сказка',
  'загадка', 'секрет', 'улыбка', 'печенье', 'мандарин', 'какао', 'свитер',
];

export interface Fact { title: string; text: string; }
export const FALLBACK_FACTS: Fact[] = [
  { title: 'Мёд не портится', text: 'Археологи находили в гробницах мёд возрастом более 3000 лет — он по-прежнему съедобен.' },
  { title: 'Осьминоги умные', text: 'У осьминога три сердца и голубая кровь, а щупальца могут «думать» самостоятельно.' },
  { title: 'Свет идёт долго', text: 'Солнечному свету нужно около 8 минут, чтобы долететь до Земли.' },
  { title: 'У жирафа семь позвонков', text: 'Как и у человека — просто каждый очень длинный.' },
  { title: 'Дельфины дают имена', text: 'Дельфины свистят друг другу «имена» и отзываются на свой свист.' },
  { title: 'Молния горячее Солнца', text: 'Молния примерно в пять раз горячее поверхности Солнца.' },
  { title: 'Пчёлы танцуют', text: 'Пчёлы показывают дорогу к цветам особым танцем.' },
  { title: 'Луна отдаляется', text: 'Каждый год Луна отдаляется от Земли на 3,8 см.' },
];

export interface Question { id: string; subject: string; q: string; opts: string[]; a: number; }
const Q = (subject: string, q: string, right: string, wrong: string[]): Question => {
  const opts = [right, ...wrong];
  const a = Math.floor(Math.random() * opts.length);
  const shuffled = [...opts]; shuffled.splice(shuffled.indexOf(right), 1); shuffled.splice(a, 0, right);
  return { id: `${subject}:${q.slice(0, 20)}`, subject, q, opts: shuffled, a };
};
export const QUESTIONS: Question[] = [
  Q('geo', 'Какой материк самый большой?', 'Евразия', ['Африка', 'Антарктида', 'Австралия']),
  Q('geo', 'Самая длинная река в мире?', 'Нил', ['Амазонка', 'Волга', 'Янцзы']),
  Q('geo', 'Столица Японии?', 'Токио', ['Пекин', 'Сеул', 'Бангкок']),
  Q('geo', 'Сколько материков на Земле?', 'Шесть', ['Три', 'Пять', 'Двенадцать']),
  Q('geo', 'Самое глубокое озеро?', 'Байкал', ['Каспийское', 'Виктория', 'Титикака']),
  Q('geo', 'Столица Франции?', 'Париж', ['Лион', 'Марсель', 'Ницца']),
  Q('phys', 'С какой планеты третья от Солнца?', 'Земля', ['Венера', 'Марс', 'Меркурий']),
  Q('phys', 'Что притягивает предметы к Земле?', 'Гравитация', ['Магнетизм', 'Трение', 'Инерция']),
  Q('phys', 'Из чего состоят все вещества?', 'Из атомов', ['Из света', 'Из тепла', 'Из звука']),
  Q('phys', 'Какая планета самая большая?', 'Юпитер', ['Сатурн', 'Земля', 'Нептун']),
  Q('phys', 'Что быстрее: свет или звук?', 'Свет', ['Звук', 'Они равны', 'Молния']),
  Q('phys', 'Сколько планет в Солнечной системе?', 'Восемь', ['Семь', 'Девять', 'Двенадцать']),
  Q('bio', 'Какое животное самое большое?', 'Синий кит', ['Слон', 'Жираф', 'Акула']),
  Q('bio', 'Сколько ног у паука?', 'Восемь', ['Шесть', 'Десять', 'Четыре']),
  Q('bio', 'Как дышат рыбы?', 'Жабрами', ['Лёгкими', 'Кожей', 'Плавниками']),
  Q('bio', 'Что делают пчёлы из нектара?', 'Мёд', ['Воск', 'Молоко', 'Сахар']),
  Q('bio', 'Сколько сердец у осьминога?', 'Три', ['Одно', 'Два', 'Четыре']),
  Q('bio', 'Какое животное меняет цвет?', 'Хамелеон', ['Ящерица', 'Крокодил', 'Черепаха']),
  Q('soc', 'Что такое дружба?', 'Взаимная забота и доверие', ['Совместные игры', 'Одинаковые игрушки', 'Соседство']),
  Q('soc', 'Почему важно говорить правду?', 'Доверие — основа отношений', ['Чтобы не наказали', 'Правда всегда приятна', 'Так проще спорить']),
  Q('soc', 'Что помогает понимать друг друга?', 'Умение слушать', ['Громкий голос', 'Быстрая речь', 'Длинные слова']),
  Q('soc', 'Как лучше решать спор?', 'Договариваться и слушать', ['Кричать громче', 'Обижаться', 'Уходить навсегда']),
];
export const SUBJECTS = [
  { id: 'geo', label: 'География', icon: 'compass', color: '#8ecae6', desc: 'Страны, реки, столицы' },
  { id: 'phys', label: 'Физика', icon: 'bolt', color: '#ffd98e', desc: 'Свет, звук, планеты' },
  { id: 'bio', label: 'Биология', icon: 'plant', color: '#9fe8c9', desc: 'Животные и растения' },
  { id: 'soc', label: 'Обществознание', icon: 'heart', color: '#ffaec9', desc: 'Люди, дружба, правила' },
];

const DREAM_PLACES = ['звёздный пляж', 'луг из лунного света', 'город на спине кита', 'библиотека облаков', 'лес стеклянных колокольчиков', 'море из тёплого молока', 'маяк на краю радуги', 'ярмарка светлячков'];
const DREAM_EVENTS = ['и я собирал карманные созвездия', 'и подружился с маленькой кометой', 'и учил рыбу петь колыбельные', 'и катался на спине у ветра', 'и пил чай с самой Луной'];
export function makeDreamText() { return `Мне снился ${R(DREAM_PLACES)}, ${R(DREAM_EVENTS)}.`; }

export const OFFLINE_EVENTS = {
  cleaned: 'навел порядок в комнате по фэн-шую светлячков',
  drew: 'скучал и нарисовал картину. Там есть вы',
  word: 'выучил новое слово и повторяет его шёпотом',
  missed: 'очень скучал и пересчитал все подушки',
  dreamGift: 'принёс подарок из сна',
};

const GREETINGS = {
  morning: ['Доброе утро! Я сторожил рассвет, пока ты спал.', 'Утро пахнет новыми историями!', 'Тс-с… солнце только просыпается. Привет!'],
  day: ['Привет! А у облаков есть чувства?', 'Привет-привет! Поиграем?', 'О, ты здесь! Я как раз репетировал улыбку.'],
  evening: ['Вечер такой тёплый… Расскажешь, как прошёл день?', 'Смотри, небо сегодня в веснушках-звёздах.', 'Хороший был день. Спасибо, что ты рядом.'],
  night: ['Тихо-тихо… звёзды уже легли спать.', 'Не могу уснуть без сказки.', 'Луна сегодня круглая, как печенье…'],
};
const QUESTIONS_FOR_OWNER = [
  'А какое у тебя самое тёплое воспоминание?',
  'Если бы у тебя был маленький маяк, что бы он освещал?',
  'Что тебе сегодня понравилось больше всего?',
  'Какая погода тебе нравится больше всего?',
  'Расскажи мне что-нибудь хорошее про сегодня?',
];

export interface BrainResult {
  lines: string[];
  save?: { kind: 'факт' | 'обещание' | 'шутка' | 'эмоция' | 'момент'; text: string };
  favorite?: string; ownerName?: string; moodDelta?: number;
  pendingQuestion?: string | null;
}

export function chatBrain(text: string, state: GameState): BrainResult {
  const t = text.toLowerCase().trim();
  const pet = state.pet!;
  const petName = pet.name;
  const owner = state.owner.name;

  // контекст: отвечаем на заданный питомцем вопрос
  if (state.dialog.pendingQuestion === 'name' && !/меня зовут/.test(t)) {
    const name = t.replace(/[^a-zа-яё-]/gi, '').trim();
    if (name) {
      return { lines: [`${name.charAt(0).toUpperCase() + name.slice(1)}! Красивое имя, я запомнил.`, R(QUESTIONS_FOR_OWNER)], save: { kind: 'факт', text: `Хозяина зовут ${name}` }, ownerName: name, pendingQuestion: null, moodDelta: 2 };
    }
  }

  let m = t.match(/(?:меня зовут|мо[её] имя|звать меня)\s+([a-zа-яё-]+)/i);
  if (m) {
    const name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    return { lines: [`${name}! Какое красивое имя. Я буду помнить его всегда.`, `Теперь мы знакомы. Я — ${petName}, а ты — ${name}!`], save: { kind: 'факт', text: `Хозяина зовут ${name}` }, ownerName: name, moodDelta: 3, pendingQuestion: null };
  }
  if (/(как меня зовут|помнишь мо[её] имя)/.test(t)) {
    return owner
      ? { lines: [`Конечно помню! Тебя зовут ${owner}. Это моё самое надёжное воспоминание.`], pendingQuestion: null }
      : { lines: ['Хм… ты ещё не говорил. Напиши: «меня зовут …» — и я запомню.'], pendingQuestion: 'name' };
  }
  // как тебя зовут / кто ты
  if (/(как тебя зовут|тво[её] имя|кто ты|ты кто)/.test(t)) {
    const sp = SPECIES.find(s => s.key === pet.dna.species);
    return { lines: [`Меня зовут ${petName}! Я — ${sp?.label ?? 'маленькое чудо'}.`, `${sp?.desc ?? ''} А ещё я ${pet.personality.traits[0]}.`], pendingQuestion: null };
  }
  // приветствие (по времени суток)
  if (/^(привет|здравств|хай|добр|салют|hello|hi|ку)/.test(t)) {
    const h = new Date().getHours();
    const bank = h < 6 ? GREETINGS.night : h < 12 ? GREETINGS.morning : h < 18 ? GREETINGS.day : h < 22 ? GREETINGS.evening : GREETINGS.night;
    return { lines: [R(bank), R(QUESTIONS_FOR_OWNER)], pendingQuestion: null, moodDelta: 1 };
  }
  // как дела / настроение
  if (/(как дела|как ты|как поживаешь|как настроение|что нового)/.test(t)) {
    const s = pet.stats;
    const moodWord = s.mood > 70 ? 'искристо' : s.mood > 45 ? 'уютно' : 'немного туманно';
    const hunger = s.hunger < 40 ? ' И чуть-чуть хочется лунного печенья.' : '';
    return { lines: [`У меня всё ${moodWord}!${hunger}`, `А у тебя как дела? Как прошёл твой день?`], pendingQuestion: null, moodDelta: 1 };
  }
  // что делал сегодня
  if (/(что делал|чем занимался|что ты делал|как прош[её]л твой день)/.test(t)) {
    const c = state.counters;
    const parts: string[] = [];
    if (c.feed) parts.push(`меня кормили ${c.feed} раз(а)`);
    if (c.play) parts.push('мы играли');
    if (c.walk) parts.push('мы гуляли');
    if (c.study) parts.push('я учился');
    const did = parts.length ? `Сегодня ${parts.join(', ')}.` : 'Сегодня я mostly мечтал и пересчитывал пылинки.';
    const dream = state.dreams[0] ? ` А ещё мне снился сон: ${state.dreams[0].text.toLowerCase()}` : '';
    return { lines: [did + dream, R(QUESTIONS_FOR_OWNER)], pendingQuestion: null };
  }
  // любимое
  m = t.match(/(?:я люблю|мне нравится|обожаю)\s+(.+)/i);
  if (m && m[1].length < 40) {
    const fav = m[1].replace(/[.!]/g, '').trim();
    return { lines: [`«${fav}» — записал в любимое! Будем заниматься этим вместе.`, `Ого, ${fav}! Расскажешь подробнее?`], save: { kind: 'факт', text: `Любимое: ${fav}` }, favorite: fav, moodDelta: 2, pendingQuestion: null };
  }
  // запомни
  m = t.match(/запомни[:\s]+(.+)/i);
  if (m) return { lines: ['Запомнил! Спрятал в самый надёжный кармашек памяти.', `«${m[1]}» — теперь часть моей истории о тебе.`], save: { kind: 'факт', text: m[1] }, pendingQuestion: null };
  // обещание
  m = t.match(/(?:обещаю|постараюсь|попробую)\s+(.+)/i);
  if (m) return { lines: ['Я запомню это обещание. Не чтобы проверять — а чтобы поддержать.', 'Договорились. Я буду рядом.'], save: { kind: 'обещание', text: m[1] }, moodDelta: 2, pendingQuestion: null };
  // эмоции
  if (/(груст|плохо|устал|устала|тревог|печал|тяжело|одиноко|плакать|больно)/.test(t)) {
    state.owner.moods.push(30);
    return {
      lines: ['Иди ко мне. Я хоть и маленький, но вмещаю много тепла.', state.owner.favorites.length ? `Помню, тебе нравится ${state.owner.favorites[0]}. Отвлечёмся на это?` : 'Расскажешь, что случилось? Я умею слушать всем сердцем.'],
      save: { kind: 'эмоция', text: 'Хозяину было грустно — обнял крепко' }, moodDelta: 4, pendingQuestion: null,
    };
  }
  if (/(рад|счаст|отлично|ура|класс|здорово|кайф|успех|получилось)/.test(t)) {
    state.owner.moods.push(90);
    return { lines: ['УРА! У меня уши встанут торчком от радости!', 'Это надо отпраздновать! Я уже танцую.'], save: { kind: 'эмоция', text: 'Разделили радость' }, moodDelta: 5, pendingQuestion: null };
  }
  // факт
  if (/(факт|расскажи что-нибудь|удиви меня|новост)/.test(t)) {
    const f = R(FALLBACK_FACTS);
    return { lines: [`Вот хороший факт: ${f.title.toLowerCase()} — ${f.text}`, 'Хочешь ещё один?'], save: { kind: 'момент', text: `Поделился фактом: ${f.title}` }, moodDelta: 2, pendingQuestion: null };
  }
  // шутка
  if (/(шутк|анекдот|смешн|ха-ха|хаха|ахах)/.test(t)) {
    return { lines: ['Хи-хи! У меня от смеха искры из ушей!', 'Почему светлячки не ходят в школу? Они и так всё светят! …Я работаю над материалом.'], save: { kind: 'шутка', text: 'Смеялись вместе' }, moodDelta: 4, pendingQuestion: null };
  }
  // математика
  m = t.match(/сколько будет\s+(\d+)\s*([+\-*/x×])\s*(\d+)/i);
  if (m) {
    const a = parseInt(m[1]), b = parseInt(m[3]);
    const op = m[2];
    const res = op === '+' ? a + b : op === '-' ? a - b : op === '*' || op === 'x' || op === '×' ? a * b : Math.round(a / b);
    return { lines: [`Думаю… Это будет ${res}! Я считал на пальчиках.`, 'Математика — это магия цифр.'], moodDelta: 2, pendingQuestion: null };
  }
  // спасибо
  if (/(спасибо|благодар)/.test(t)) return { lines: [R(['Всегда пожалуйста! Это моя любимая работа.', 'Обнимашка в ответ. Бесплатно и навсегда.'])], moodDelta: 2, pendingQuestion: null };
  // время
  if (/(который час|сколько времени|какое время)/.test(t)) {
    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return { lines: [`Сейчас ${now}. Время летит, когда мы вместе.`], pendingQuestion: null };
  }
  // вода/сон
  if (/(пить|воды|вода)/.test(t)) return { lines: ['Вода — это жидкие звёзды. Пей! Я прослежу.'], pendingQuestion: null };
  if (/(спать|сон|поздно)/.test(t)) return { lines: ['Спокойной ночи! Я посторожу твои сны.'], pendingQuestion: null };

  // fallback — любопытство + воспоминание + встречный вопрос
  const recall: string[] = [];
  if (state.memories.length > 2 && Math.random() < 0.3) {
    recall.push(`Кстати, я помню: ${R(state.memories).text.toLowerCase()}.`);
  }
  return {
    lines: [
      R([
        'Хм-м… как интересно! Расскажи ещё — я записываю каждое слово.',
        'Я пока маленький и многого не знаю, но ОЧЕНЬ стараюсь понять.',
        'Запишу это в коллекцию твоих слов. У меня уже целая полка!',
        `Мне нравится, как ты рассказываешь. Продолжай!`,
      ]),
      ...(recall.length ? recall : []),
      R(QUESTIONS_FOR_OWNER),
    ],
    moodDelta: 1, pendingQuestion: null,
  };
}

export function proactiveLine(state: GameState): string {
  const p = state.pet!;
  if (p.stats.hunger < 35) return R(['В животе урчит маленькая гроза…', 'А есть что-нибудь вкусненькое?']);
  if (p.stats.energy < 30) return R(['Глазки становятся сонными…', 'Может, вздремнем?']);
  if (p.bond > 70 && Math.random() < 0.4) return R(['Спасибо, что ты рядом!', 'Ты лучший человек в моей вселенной.']);
  if (state.memories.length > 3 && Math.random() < 0.3) return `Я тут вспомнил: ${R(state.memories).text.toLowerCase()}`;
  if (Math.random() < 0.35) return R(QUESTIONS_FOR_OWNER);
  return R([
    'Интересно, о чём мечтают подушки?',
    'Я сегодня выучил новое слово: «нежность».',
    'Звёзды — это дырочки в одеяле неба. Я проверял.',
    'Ты сегодня пил воду? Я за этим слежу.',
    'А давай сделаем что-нибудь маленькое, но волшебное?',
  ]);
}

export function welcomeLine(awayMs: number, trust: number, petName: string): string {
  const h = awayMs / 3600000;
  if (h < 2) return 'Ты вернулся так быстро! Я даже соскучиться не успел. Почти.';
  if (h < 12) return `Я ждал! Честно. Ну, ждал и немного ${trust > 60 ? 'мечтал' : 'грустил'}.`;
  if (h < 48) return `${petName} тут без тебя вёл дневник. Хочешь, покажу?`;
  if (trust < 50) return 'Ты так долго отсутствовал… Я уже говорил с лампой. Но я рад. Правда.';
  return 'Я знал, что ты вернёшься. Я держал для тебя тёплое место.';
}
