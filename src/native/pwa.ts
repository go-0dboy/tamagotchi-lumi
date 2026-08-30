/* ============================================================
 * PWA-слой «Люмоса»: установка игры прямо из браузера.
 *
 * Браузер присылает событие `beforeinstallprompt`, когда игру
 * можно установить. Мы перехватываем его и по кнопке «Установить»
 * в настройках показываем системный диалог установки.
 * Работает в браузере; в нативном Capacitor-приложении — no-op.
 * ============================================================ */
import { Capacitor } from '@capacitor/core';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** можно ли сейчас предложить установку */
  canInstall: boolean;
  /** уже установлено (как PWA или нативное приложение) */
  installed: boolean;
  /** браузер вообще поддерживает PWA-установку */
  supported: boolean;
  /** запущено как нативное приложение Capacitor (APK/IPA) —
      WebView не присылает «предложение браузера», установка не нужна */
  nativeApp: boolean;
}

let state: PwaState = {
  canInstall: false,
  installed: typeof window !== 'undefined' && detectInstalled(),
  supported: typeof window !== 'undefined' && 'BeforeInstallPromptEvent' in window,
  nativeApp: typeof window !== 'undefined' && Capacitor.isNativePlatform(),
};

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<(s: PwaState) => void>();

function set(partial: Partial<PwaState>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l(state));
}

export function getPwaState(): PwaState {
  return state;
}

export function subscribePwa(cb: (s: PwaState) => void): () => void {
  listeners.add(cb);
  cb(state);
  return () => { listeners.delete(cb); };
}

/* установлено ли как приложение (standalone-режим) */
function detectInstalled(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  const mq = window.matchMedia('(display-mode: standalone)').matches;
  const ios = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return mq || ios;
}

/** Вызвать системный диалог «Установить приложение». */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (choice.outcome === 'accepted') {
      set({ canInstall: false, installed: true });
      return true;
    }
    set({ canInstall: false });
    return false;
  } catch {
    return false;
  }
}

/** Инициализация: регистрация SW + слушатели установки. */
export function initPwa() {
  /* в нативном приложении PWA-слой не нужен: приложение уже установлено */
  if (Capacitor.isNativePlatform()) {
    set({ installed: true, supported: false, nativeApp: true });
    return;
  }

  set({ installed: detectInstalled(), nativeApp: false });

  /* регистрируем service worker только в production-сборке,
     чтобы не мешать hot-reload при разработке */
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* SW не критичен — игра работает и без него */
      });
    });
  }

  /* браузер сообщает, что игру можно установить */
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // не показывать свой мини-баннер — покажем свой
    deferredPrompt = e as InstallPromptEvent;
    set({ canInstall: true });
  });

  /* пользователь установил (из нашего диалога или меню браузера) */
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    set({ canInstall: false, installed: true });
  });

  /* при смене display-mode (например, открыли как приложение) */
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', (e) => {
    set({ installed: e.matches });
  });
}
