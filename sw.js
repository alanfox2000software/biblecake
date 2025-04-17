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

// Fetch Event: Network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache translation data on-demand
  if (url.pathname.startsWith('/biblecake/data/translations/')) {
    event.respondWith(
      cacheFirstThenUpdate(event.request)
    );
  } else {
    event.respondWith(
      networkFirstWithCacheFallback(event.request)
    );
  }
});

async function cacheFirstThenUpdate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Return cached response immediately
  if (cachedResponse) {
    // Update cache in background
    fetchAndCache(request);
    return cachedResponse;
  }
  
  // Otherwise fetch and cache
  return fetchAndCache(request);
}

async function networkFirstWithCacheFallback(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Offline content unavailable', { 
      status: 503, 
      headers: { 'Content-Type': 'text/plain' } 
    });
  }
}

async function fetchAndCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    return await cache.match(request);
  }
}

// Cleanup Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});
