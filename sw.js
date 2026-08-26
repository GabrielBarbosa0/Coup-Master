const CACHE_NAME = 'coup-master-pwa-v122';
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '::1', '[::1]'];
const IS_LOCALHOST = LOCAL_HOSTNAMES.includes(new URL(self.location.href).hostname);

const APP_SHELL = [
  './',
  './login.html',
  './lobby.html',
  './legal/privacy.html',
  './legal/terms.html',
  './index.html',
  './ranked/ranked-waiting.html',
  './ranked/ranked.html',
  './personalized/personalized-waiting.html',
  './personalized/personalized.html',
  './manifest.webmanifest?v=custom-logo-v2',
  './css/loading.css',
  './css/chat.css',
  './css/lobby.css',
  './css/legal.css',
  './css/compat.css',
  './css/casual-mode.css',
  './js/pwa/pwa.js',
  './js/i18n/initial-language.js',
  './js/i18n/language-service.js',
  './lang/pt-BR.json',
  './lang/en-US.json',
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
  './js/gamemode/personalized/personalized-rules.js',
  './js/gamemode/personalized/personalized-engine.js',
  './js/gamemode/personalized/personalized-renderer.js',
  './js/gamemode/personalized/personalized-game.js',
  './assets/img/logo/favicon-coup-master-circulo.png?v=custom-logo-v2',
  './assets/img/logo/coup-master-circulo-192x192.png?v=custom-logo-v2',
  './assets/img/logo/coup-master-circulo-512x512.png?v=custom-logo-v2',
  './assets/img/logo/logo-coup-master.png',
  './assets/img/logo/logo-coup-master-transparente.png',
  './assets/img/icons/google.svg',
  './assets/img/icons/logout.svg',
  './assets/img/icons/cached.svg',
  './assets/img/icons/chat.svg',
  './assets/img/icons/music_note.svg',
  './assets/img/icons/feedback.svg',
  './assets/img/icons/gavel.svg',
  './assets/img/icons/parchment.svg',
  './assets/img/icons/info.svg',
  './assets/img/icons/ghost.svg',
  './assets/img/icons/fullscreen.svg',
  './assets/img/icons/settings.svg',
  './assets/img/guides/front-actions.png',
  './assets/img/guides/back-actions.png',
  './assets/sounds/vfx/blip.mp3',
  './assets/sounds/vfx/card-slide.mp3',
  './assets/sounds/vfx/pop.mp3',
  './assets/fonts/tilda-script-bold.woff2',
  './assets/fonts/PressStart2P-Regular.ttf'
];

self.addEventListener('install', (event) => {
  if (IS_LOCALHOST) {
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  if (IS_LOCALHOST) {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
    return;
  }

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
  if (IS_LOCALHOST) return;

  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (isDynamicAssetRequest(url) || request.headers.has('range')) {
    return;
  }

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
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
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
      if (isCacheableResponse(response)) {
        cache.put(request, response.clone()).catch(() => null);
      }
      return response;
    })
    .catch(() => null);

  if (cachedResponse) return cachedResponse;

  const networkResponse = await networkResponsePromise;
  return networkResponse || Response.error();
}

function isCacheableResponse(response) {
  return Boolean(response && response.status === 200);
}

function isDynamicAssetRequest(url) {
  return url.pathname.includes('/assets/sounds/')
    || url.pathname.includes('/assets/img/cards/');
}
