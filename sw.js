const CACHE_NAME = 'bible-v3';
const CORE_ASSETS = [
  '/biblecake/',
  '/biblecake/index.html',
  '/biblecake/styles.css',
  '/biblecake/script.js',
  '/biblecake/images/icons/icon-192.webp',
  '/biblecake/images/icons/icon-512.webp'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});