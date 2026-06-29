const CACHE_NAME = 'coup-master-pwa-v36';

const APP_SHELL = [
  './',
  './login.html',
  './lobby.html',
  './index.html',
  './ranked.html',
  './manifest.webmanifest',
  './css/loading.css',
  './css/chat.css',
  './css/lobby.css',
  './css/casual-mode.css',
  './js/pwa/pwa.js',
  './js/firebase/firebase.js',
  './js/login/login-manager.js',
  './js/core/rules.js',
  './js/core/gameState.js',
  './js/lobby/lobby-manager.js',
  './js/gamemode/game-modes.js',
  './js/gamemode/casual/board-renderer.js',
  './css/ranked-mode.css',
  './js/gamemode/ranked/ranked-rules.js',
  './js/gamemode/ranked/ranked-engine.js',
  './js/gamemode/ranked/ranked-renderer.js',
  './js/gamemode/ranked/ranked-game.js',
  './assets/img/logo/favicon-coup-master.png',
  './assets/img/logo/coup-master-192x192.png',
  './assets/img/logo/coup-master-512x512.png',
  './assets/img/icons/google.svg',
  './assets/img/icons/logout.svg',
  './assets/img/icons/cached.svg',
  './assets/img/icons/chat.svg',
  './assets/img/icons/music_note.svg',
  './assets/img/icons/feedback.svg',
  './assets/img/icons/parchment.svg',
  './assets/img/icons/ghost.svg',
  './assets/img/icons/fullscreen.svg',
  './assets/img/icons/settings.svg',
  './assets/fonts/tilda-script-bold.woff2',
  './assets/fonts/PressStart2P-Regular.ttf'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './login.html'));
    return;
  }

  if (url.pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await cache.match(request))
      || (await cache.match(fallbackUrl))
      || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cachedResponse) return cachedResponse;

  const networkResponse = await networkResponsePromise;
  return networkResponse || Response.error();
}
