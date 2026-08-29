import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Конфигурация нативной оболочки «Люмоса».
 *
 * ВАЖНО про сборку:
 *   1) npm run build -- --base=./     (относительные пути — WebView открывает файлы с диска)
 *   2) npx cap sync                   (копирует dist/ в нативные проекты)
 *   3) npx cap open android | ios     (открывает проект в Android Studio / Xcode)
 */
const config: CapacitorConfig = {
  /* уникальные идентификаторы приложения в сторах */
  appId: 'com.lumos.companion',
  appName: 'Люмос',

  /* папка со собранной игрокой (результат vite build) */
  webDir: 'dist',

  /* Android:
     • adjustMarginsForEdgeToEdge — WebView получает поля под системные панели:
       строку статуса сверху и панель «Назад / Домой» снизу. Без этого на
       Android 15 (SDK 35, принудительный edge-to-edge) нижние кнопки
       наезжают на контент игры.
     • держим WebView живым, чтобы питомец «не умирал» при сворачивании. */
  android: {
    adjustMarginsForEdgeToEdge: 'always',
    buildOptions: {
      keystorePath: undefined,
    },
  },

  plugins: {
    /* ---------- сплэш-скрин ----------
       Показываем системный сплэш, пока игра грузится;
       скрываем программно, когда движок готов (см. src/native/platform.ts). */
    SplashScreen: {
      launchShowDuration: 0,          // не авто-скрывать по таймеру
      launchAutoHide: false,          // скрываем сами через SplashScreen.hide()
      backgroundColor: '#0c1220',     // цвет глубокой ночи из палитры игры
      splashFullScreen: true,
      splashImmersive: true,
      showSpinner: false,
    },

    /* ---------- статус-бар ----------
       Стиль (светлые/тёмные иконки) переключаем по времени суток в игре. */
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#0c1220',
    },

    /* ---------- локальные уведомления ----------
       «Кофи проголодался!» — пуши о жизни питомца, пока приложение закрыто. */
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#ffd98e',
    },

    /* ---------- вибрация ---------- */
    Haptics: {
      /* на iOS используем системный Taptic Engine */
      enabled: true,
    },
  },
};

export default config;
