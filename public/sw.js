/* ============================================================
 * Service Worker «Люмоса» — делает игру устанавливаемой (PWA)
 * и способной работать офлайн.
 *
 * Стратегии кэширования:
 *   • навигация (HTML)     — network-first, при офлайне — кэш-оболочка
 *   • статика (js/css/img) — cache-first с фоновым обновлением
 *   • шрифты               — cache-first
 *   • API (Википедия и т.п.) — только сеть, не кэшируем
 *
 * Иконки приложения (PNG для установки) генерируются прямо здесь,
 * на canvas: не нужно хранить бинарные файлы в репозитории.
 * ============================================================ */
const CACHE = 'lumos-v2';

/* оболочка приложения: сама страница + иконки */
const SHELL = ['./', './index.html', './icons/icon.svg'];
const ICON_PATHS = ['./icons/icon-192.png', './icons/icon-512.png'];

/* ---------- генерация PNG-иконки на canvas ---------- */
function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const S = size;
  const cx = S / 2, cy = S / 2;

  /* ночной фон */
  ctx.fillStyle = '#0c1220';
  ctx.fillRect(0, 0, S, S);

  /* звёзды (детерминированные, чтобы иконка была стабильной) */
  for (let i = 0; i < 26; i++) {
    const rx = (Math.sin(i * 127.1) * 0.5 + 0.5);
    const ry = (Math.sin(i * 311.7) * 0.5 + 0.5);
    const x = rx * S, y = ry * S;
    const r = (i % 3 === 0 ? 0.006 : 0.0035) * S;
    ctx.globalAlpha = 0.25 + (i % 4) * 0.18;
    ctx.fillStyle = i % 5 === 0 ? '#ffd98e' : '#fff3e2';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* тёплое свечение вокруг питомца */
  const glow = ctx.createRadialGradient(cx, cy, S * 0.1, cx, cy, S * 0.44);
  glow.addColorStop(0, 'rgba(255,217,142,0.30)');
  glow.addColorStop(1, 'rgba(255,217,142,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  const bodyR = S * 0.27;
  const bodyY = cy + S * 0.03;

  /* ушки */
  ctx.fillStyle = '#ffb49b';
  ctx.beginPath(); ctx.arc(cx - S * 0.16, bodyY - S * 0.24, S * 0.085, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + S * 0.16, bodyY - S * 0.24, S * 0.085, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe1d1';
  ctx.beginPath(); ctx.arc(cx - S * 0.16, bodyY - S * 0.235, S * 0.042, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + S * 0.16, bodyY - S * 0.235, S * 0.042, 0, Math.PI * 2); ctx.fill();

  /* тело — персиковый шарик с бликом */
  const body = ctx.createRadialGradient(cx - S * 0.09, bodyY - S * 0.11, S * 0.04, cx, bodyY, bodyR * 1.15);
  body.addColorStop(0, '#ffe1d1');
  body.addColorStop(1, '#ffb49b');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(cx, bodyY, bodyR, 0, Math.PI * 2); ctx.fill();

  /* щёчки */
  ctx.fillStyle = 'rgba(247,143,179,0.55)';
  ctx.beginPath(); ctx.ellipse(cx - S * 0.13, bodyY + S * 0.05, S * 0.036, S * 0.022, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + S * 0.13, bodyY + S * 0.05, S * 0.036, S * 0.022, 0, 0, Math.PI * 2); ctx.fill();

  /* глаза */
  ctx.fillStyle = '#2b1d33';
  ctx.beginPath(); ctx.arc(cx - S * 0.085, bodyY - S * 0.035, S * 0.034, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + S * 0.085, bodyY - S * 0.035, S * 0.034, 0, Math.PI * 2); ctx.fill();
  /* блики */
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx - S * 0.095, bodyY - S * 0.048, S * 0.011, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + S * 0.075, bodyY - S * 0.048, S * 0.011, 0, Math.PI * 2); ctx.fill();

  /* улыбка */
  ctx.strokeStyle = '#7a4a3a';
  ctx.lineWidth = S * 0.014;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, bodyY + S * 0.028, S * 0.055, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  return canvas.convertToBlob({ type: 'image/png' });
}

/* Ответ с иконкой: из кэша или нарисовать на лету и закэшировать */
async function iconResponse(request, size) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const blob = await drawIcon(size);
    const response = new Response(blob, { headers: { 'Content-Type': 'image/png' } });
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(async (cache) => {
        await cache.addAll(SHELL);
        /* заранее рисуем и кэшируем иконки для установки */
        await Promise.all(ICON_PATHS.map(async (p) => {
          const size = p.includes('512') ? 512 : 192;
          try {
            const blob = await drawIcon(size);
            await cache.put(p, new Response(blob, { headers: { 'Content-Type': 'image/png' } }));
          } catch { /* иконка не критична */ }
        }));
      })
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

  /* иконки приложения — генерируются на canvas (нужны для установки PWA) */
  if (url.pathname.endsWith('icon-512.png')) { event.respondWith(iconResponse(request, 512)); return; }
  if (url.pathname.endsWith('icon-192.png')) { event.respondWith(iconResponse(request, 192)); return; }

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
