const CACHE_NAME = 'italky-shorts-shell-v1';
const SHELL_URLS = ['/hosgeldiniz', '/pages/hosgeldiniz.html'];

async function cacheShell() {
  const cache = await caches.open(CACHE_NAME);
  for (const url of SHELL_URLS) {
    try {
      const response = await fetch(url, { cache: 'reload' });
      if (response && response.ok) await cache.put(url, response.clone());
    } catch (_) {}
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await cacheShell();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith('italky-shorts-shell-') && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, fallbackUrls = []) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      try { await cache.put(request, response.clone()); } catch (_) {}
      return response;
    }
  } catch (_) {}

  const direct = await cache.match(request, { ignoreSearch: true });
  if (direct) return direct;

  for (const url of fallbackUrls) {
    const cached = await cache.match(url, { ignoreSearch: true });
    if (cached) return cached;
  }

  throw new Error('offline_shell_miss');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isShortsShell = url.pathname === '/hosgeldiniz' || url.pathname === '/pages/hosgeldiniz.html';
  if (request.mode === 'navigate' && isShortsShell) {
    event.respondWith(networkFirst(request, SHELL_URLS));
  }
});
