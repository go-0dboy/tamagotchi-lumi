/* ============================================================
 * Локальные push-уведомления «Люмоса».
 *
 * Идея: питомец живёт, пока приложение закрыто — и зовёт хозяина,
 * когда ему действительно что-то нужно. Когда игра уходит в фон,
 * мы по текущим характеристикам и скоростям распада считаем,
 * КОГДА питомец проголодается или заскучает, и ставим уведомление
 * ровно на этот момент. При возвращении все pending-уведомления
 * гасятся (движок и так покажет «С возвращением!»).
 *
 * В браузере — безопасные no-op.
 * ============================================================ */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { GameState } from '../game/types';

const native = () => Capacitor.isNativePlatform();

/* стабильные id — повторное планирование заменяет старые уведомления */
const ID_HUNGER = 11;
const ID_BORED = 12;
const ID_WOKE = 13;

const HOUR = 3600_000;
const SPEED = { hungerPerHour: 4, energyPerHour: 1.5, cleanlinessPerHour: 2 };

const HUNGER_BODIES = [
  'В животе урчит маленькая гроза… Покорми меня, пожалуйста!',
  'Я бы не отказался от лунного печенья. Или хотя бы ягод…',
  'Запах еды мне снится. Ну, почти снится. Покормишь?',
];
const BORED_BODIES = [
  'Я пересчитал все пылинки. Их 47. Поиграем?',
  'Без тебя комната чуть-чуть тише, чем надо. Загляни!',
  'Я выучил новое слово и очень хочу тебе рассказать!',
];
const WOKE_BODIES = [
  'Я выспался и вижу чудесные сны. Расскажу?',
  'Утро! Я посторожил твои сны, пока ты спал.',
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** запросить разрешение на уведомления (Android 13+ / iOS) */
export async function ensurePermission() {
  if (!native()) return;
  try {
    const res = await LocalNotifications.checkPermissions();
    if (res.display !== 'granted') await LocalNotifications.requestPermissions();
  } catch { /* noop */ }
}

/** погасить все запланированные уведомления (при возвращении в игру) */
export async function cancelAll() {
  if (!native()) return;
  try {
    await LocalNotifications.cancel({ notifications: [
      { id: ID_HUNGER }, { id: ID_BORED }, { id: ID_WOKE },
    ]});
  } catch { /* noop */ }
}

/**
 * Запланировать заботливые напоминания, пока игра в фоне.
 * Вызывается на событии pause (см. platform.ts).
 */
export async function scheduleCareReminders(state: GameState) {
  if (!native()) return;
  const p = state.pet;
  if (!p || p.transcended) return;
  const name = p.name;
  const now = Date.now();
  const jobs: { id: number; title: string; body: string; at: number }[] = [];

  if (p.sleeping) {
    /* спит — энергия копится; напомним, когда выспится (условно через 6 ч) */
    jobs.push({ id: ID_WOKE, title: `${name} проснулся`, body: pick(WOKE_BODIES), at: now + 6 * HOUR });
  } else {
    /* когда питомец доест до 25 сытости */
    const hoursToHungry = (p.stats.hunger - 25) / SPEED.hungerPerHour;
    if (hoursToHungry > 0 && hoursToHungry < 48) {
      jobs.push({ id: ID_HUNGER, title: `${name} проголодался!`, body: pick(HUNGER_BODIES), at: now + hoursToHungry * HOUR });
    }
    /* дружеский тычок, если хозяин пропал надолго (через 8 часов) */
    if (p.stats.mood > 45) {
      jobs.push({ id: ID_BORED, title: `${name} скучает`, body: pick(BORED_BODIES), at: now + 8 * HOUR });
    }
  }

  try {
    await cancelAll();
    if (!jobs.length) return;
    await LocalNotifications.schedule({
      notifications: jobs.map(j => ({
        id: j.id,
        title: j.title,
        body: j.body,
        schedule: { at: new Date(Math.max(j.at, now + 5 * 60_000)) },
        /* тап по уведомлению открывает игру */
        extra: { openApp: true },
      })),
    });
  } catch { /* noop — уведомления не критичны для игры */ }
}
