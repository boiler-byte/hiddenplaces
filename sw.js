/* Hidden Places v5: cache the modular offline app shell; never cache Overpass API requests. */
const CACHE = 'hidden-places-shell-v5';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/main.css', './css/components.css', './css/responsive.css', './css/waves.css',
  './js/app.js', './js/config.js', './js/state.js',
  './js/services/geolocation.js', './js/services/sensors.js',
  './js/services/camera.js', './js/services/places-api.js',
  './js/services/signals.js',
  './js/components/toolbar.js', './js/components/viewer.js',
  './js/components/waves.js',
  './js/components/radar.js', './js/components/sidebar.js',
  './js/components/dropdown.js', './js/components/notifications.js',
  './js/utils/geo-math.js', './js/utils/dom.js', './js/utils/storage.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys
      .filter(key => key.startsWith('hidden-places-') && key !== CACHE)
      .map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    });
  }));
});
