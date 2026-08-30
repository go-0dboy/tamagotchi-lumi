/* ============================================================
 * Service Worker «Люмоса» — делает игру устанавливаемой (PWA)
 * и способной работать офлайн.
 *
 * Стратегии кэширования:
 *   • навигация (HTML)     — network-first, при офлайне — кэш-оболочка
 *   • статика (js/css/img) — cache-first с фоновым обновлением
 *   • шрифты               — cache-first
 *   • API (Википедия и т.п.) — только сеть, не кэшируем
 * ============================================================ */
const CACHE = 'lumos-v1';

/* оболочка приложения: сама страница + иконка */
const SHELL = ['./', './index.html', './icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      /* активируемся сразу, не ждём закрытия старых вкладок */
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      /* удаляем устаревшие кэши предыдущих версий */
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      /* берём под контроль все открытые вкладки сразу */
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* обрабатываем только GET и только http(s) */
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  /* внешние API (Википедия, Open-Meteo) — всегда из сети */
  if (url.origin !== location.origin && !url.hostname.includes('gstatic') && !url.hostname.includes('googleapis')) {
    return; // network-only
  }

  /* навигация: сеть → при офлайне оболочка из кэша */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached || caches.match('./')))
    );
    return;
  }

  /* статика и шрифты: сначала кэш, параллельно обновляем его из сети */
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          /* кэшируем только успешные ответы */
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached); /* при офлайне — то, что в кэше */
      return cached || network;
    })
  );
});
