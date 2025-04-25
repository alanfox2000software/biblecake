// Bible Reader Service Worker v2
const CACHE_VERSION = 'bible-v3';
const CORE_CACHE = [
  '/biblecake/',
  '/biblecake/index.html',
  '/biblecake/styles.css',
  '/biblecake/script.js',
  '/biblecake/manifest.webmanifest',
  '/biblecake/images/icons/icon-192.webp',
  '/biblecake/images/icons/icon-512.webp',
  '/biblecake/data/translations/translations.json'
];

const CACHE_CONFIG = {
  static: {
    name: `${CACHE_VERSION}-static`,
    strategies: 'cacheFirst',
    expiration: {
      maxEntries: 50,
      maxAgeSeconds: 86400 * 30 // 30 days
    }
  },
  translations: {
    name: `${CACHE_VERSION}-translations`,
    strategies: 'staleWhileRevalidate',
    expiration: {
      maxEntries: 20,
      maxAgeSeconds: 86400 * 7 // 7 days
    }
  }
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_CONFIG.static.name)
      .then(cache => cache.addAll(CORE_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_CONFIG.static.name && 
                          name !== CACHE_CONFIG.translations.name)
          .map(name => caches.delete(name))
      );
    })
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Cache static assets
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAssets(event.request));
  }
  // Handle translation data
  else if (isTranslationData(url)) {
    event.respondWith(handleTranslationData(event.request));
  }
  // Fallback to network-first for others
  else {
    event.respondWith(networkFirstStrategy(event.request));
  }
});

// Caching Strategies
async function handleStaticAssets(request) {
  const cache = await caches.open(CACHE_CONFIG.static.name);
  const cached = await cache.match(request);
  return cached || fetchAndCache(request, cache);
}

async function handleTranslationData(request) {
  const cache = await caches.open(CACHE_CONFIG.translations.name);
  const cached = await cache.match(request);
  const networkPromise = fetchAndCache(request, cache);
  
  return cached || networkPromise;
}

async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(CACHE_CONFIG.static.name);
    const cached = await cache.match(request);
    return cached || offlineResponse();
  }
}

// Helper Functions
function isStaticAsset(url) {
  return [
    '/biblecake/styles.css',
    '/biblecake/script.js',
    '/biblecake/manifest.webmanifest',
    '/biblecake/images/'
  ].some(path => url.pathname.startsWith(path));
}

function isTranslationData(url) {
  return url.pathname.startsWith('/biblecake/data/translations/') && 
         url.pathname.endsWith('.json');
}

async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return offlineResponse();
  }
}

function offlineResponse() {
  return new Response(JSON.stringify({
    error: {
      code: 503,
      message: "Connection unavailable. Please check your network connection."
    }
  }), {
    headers: {'Content-Type': 'application/json'},
    status: 503
  });
}

// Background Sync (Optional)
self.addEventListener('sync', event => {
  if (event.tag === 'content-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  const cache = await caches.open(CACHE_CONFIG.translations.name);
  const keys = await cache.keys();
  
  const updatePromises = keys.map(async request => {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response);
    }
  });
  
  return Promise.all(updatePromises);
}
