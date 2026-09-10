// ============================================================
// eNotePad — Service Worker (PWA Offline Support)
// ============================================================

const CACHE_NAME = 'enotepad-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/firebase-config.js',
  './js/utils.js',
  './js/share.js',
  './js/access.js',
  './js/auth.js',
  './js/admin.js',
  './js/editor.js',
  './js/filemanager.js',
  './js/users.js',
  './js/app.js',
  './assets/Favicon.png',
  './manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache error on some assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network-first with cache fallback for dynamic content, cache-first for static assets)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip Firebase/External analytics APIs
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip Firestore, CDN scripts, and Google APIs from SW intercept
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('pagead2')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to cache if network fails
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
