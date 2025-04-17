const CACHE_NAME = 'bible-v6';
const CORE_ASSETS = [
  '/biblecake/',
  '/biblecake/index.html',
  '/biblecake/styles.css',
  '/biblecake/script.js',
  '/biblecake/manifest.webmanifest',
  '/biblecake/data/translations/translations.json',
  '/biblecake/images/icons/icon-192.webp',
  '/biblecake/images/icons/icon-512.webp'
];

// Install Event: Cache Core Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
  );
});
