/* The build supplies a revision and the complete list of bundled assets. */
const REVISION = '__LUMOS_REVISION__';
const ASSETS = /* __LUMOS_ASSETS__ */ [];
const ROOT = self.registration.scope;
const PREFIX = `lumos:${ROOT}:`;
const CACHE = PREFIX + REVISION;
const ENTRY = new URL('index.html', ROOT).href;
const SHELL = new Set([
  ROOT, ENTRY,
  ...ASSETS.map(asset => new URL(asset, ROOT).href),
]);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...SHELL])));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const path = url.origin + url.pathname;

  if (request.mode === 'navigate' && (path === ROOT || path === ENTRY)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch { /* no network */ }
      const cache = await caches.open(CACHE);
      return await cache.match(ENTRY) ?? Response.error();
    })());
    return;
  }

  if (SHELL.has(request.url)) {
    event.respondWith(caches.open(CACHE).then(async cache => await cache.match(request) ?? fetch(request)));
    return;
  }

  // An online page may have loaded newer HTML while its worker is still waiting.
  // Keep those hashed assets available to that page until the next activation.
  if (request.url.startsWith(new URL('assets/', ROOT).href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        try { await cache.put(request, response.clone()); } catch { /* quota */ }
      }
      return response;
    })());
  }
});
