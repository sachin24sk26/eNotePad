// ============================================================
// eNotePad — Service Worker (High-Performance Caching & PWA)
// ============================================================

const CACHE_NAME = 'enotepad-cache-v2';
const FONT_CACHE_NAME = 'enotepad-fonts-v2';
const CDN_CACHE_NAME = 'enotepad-cdn-v2';

const ALL_CACHES = [CACHE_NAME, FONT_CACHE_NAME, CDN_CACHE_NAME];

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './how-it-works.html',
  './support.html',
  './privacy.html',
  './terms.html',
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
  './js/coffee.js',
  './js/ai-assist.js',
  './js/app.js',
  './assets/Favicon.png',
  './assets/logo.png',
  './assets/logo-light.svg',
  './assets/logo-dark.svg',
  './manifest.json'
];

// Install Event — Pre-cache local app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache error on some assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event — Cleanup older caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (!ALL_CACHES.includes(key)) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 1. Bypass real-time Firebase, Firestore, and AdSense APIs
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('pagead2') ||
    url.hostname.includes('googleads') ||
    url.hostname.includes('ep1.adtrafficquality.google')
  ) {
    return;
  }

  // 2. Cache-First for Google Fonts & Material Symbols (woff2 font files and CSS)
  if (url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cachedResponse || Response.error();
        }
      })
    );
    return;
  }

  // 3. Stale-While-Revalidate for Third-Party CDNs (Tailwind, CDNJS, jsDelivr, Firebase SDKs)
  if (
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('cdn.tailwindcss.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    event.respondWith(
      caches.open(CDN_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Default App Shell: Stale-While-Revalidate / Cache with Network Fallback
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
