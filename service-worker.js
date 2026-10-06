const CACHE_NAME = 'mola-mola-tracker-v5';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './privacy.html',
  './fonts/patrick-hand-latin.woff2',
  './fonts/patrick-hand-latin-ext.woff2',
  './fonts/patrick-hand-vietnamese.woff2',
  './icons/ocean-bg.jpg',
  './icons/mola-resting.png',
  './icons/mola-eating.png',
  './icons/date-tracker.png',
  './icons/speech-bubble.png',
  './icons/toolbox.png',
  './icons/seaweed.png',
  './icons/jellyfish.png',
  './icons/fish.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first: always revalidate with the server (cache: 'no-cache') so app
// updates show up on reload instead of waiting out GitHub Pages' 10-minute
// HTTP cache. Only fall back to the cache when offline, so an
// unchanged service-worker.js (which browsers use to decide whether to
// re-install) never causes stale app code to keep being served.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
