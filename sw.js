const CACHE_NAME = 'vokabeltrainer-ultra-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll würde bei einem einzigen Fehler alles abbrechen –
      // daher jede Ressource einzeln und fehlertolerant cachen.
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('Cache fehlgeschlagen für:', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Nur GET-Anfragen cachen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // 'basic' = Same-Origin, 'cors' = CDN (z.B. Font Awesome) –
          // beides darf gecacht werden, sonst fehlen Icons offline.
          const cacheable =
            response &&
            response.status === 200 &&
            (response.type === 'basic' || response.type === 'cors');

          if (cacheable) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline-Fallback: Navigationsanfragen bekommen die App-Shell
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline – Diese Ressource ist nicht im Cache.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    })
  );
});