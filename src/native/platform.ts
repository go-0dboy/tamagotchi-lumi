/* ============================================================
 * Инициализация нативной платформы «Люмоса».
 * Вызывается один раз из App.tsx после старта движка.
 * В браузере — мгновенный no-op: веб-версия ничего не чувствует.
 *
 * Отвечает за:
 *   • сплэш-скрин   — скрываем, когда игра готова
 *   • статус-бар    — цвет подстраивается под время суток в игре
 *   • жизненный цикл — фон: сохранение + пуши о питомце;
 *                      возврат: гасим пуши и пересчитываем офлайн-жизнь
 *   • уведомления   — запрашиваем разрешение (Android 13+ / iOS)
 * ============================================================ */
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { engine } from '../game/engine';
import { cancelAll, ensurePermission, scheduleCareReminders } from './notify';

const native = () => Capacitor.isNativePlatform();

/** цвет статус-бара под время суток: игра всегда «ночная», днём — мягче */
function phaseStatusBarColor(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 11) return '#274a63';  // утро — рассветное небо
  if (h >= 11 && h < 17) return '#2e5a78'; // день — светлое небо
  if (h >= 17 && h < 22) return '#33304f'; // вечер — сумерки
  return '#0c1220';                        // ночь — глубокая ночь
}

async function applyStatusBar() {
  try {
    await StatusBar.setStyle({ style: Style.Dark });     // светлые иконки на тёмном
    await StatusBar.setBackgroundColor({ color: phaseStatusBarColor() });
  } catch { /* noop */ }
}

export async function initializeNative() {
  if (!native()) return;

  /* игра готова — убираем системный сплэш */
  try { await SplashScreen.hide({ fadeOutDuration: 400 }); } catch { /* noop */ }

  /* статус-бар: ставим сразу и обновляем при смене времени суток */
  await applyStatusBar();
  setInterval(() => void applyStatusBar(), 60_000);

  /* разрешение на пуши (диалог покажет система) */
  await ensurePermission();

  /* жизненный цикл приложения */
  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      /* вернулись: гасим пуши и пересчитываем, что питомец делал без нас */
      void cancelAll();
      engine.start();
    } else {
      /* ушли в фон: сохраняемся и планируем заботливые напоминания */
      engine.save();
      void scheduleCareReminders(engine.state);
    }
  });
}
