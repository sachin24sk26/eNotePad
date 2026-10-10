// ============================================================
// eNotePad — Service Worker (High-Performance Caching & PWA)
// ============================================================

const CACHE_NAME = 'enotepad-cache-v17';
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
  './assets/favicon.svg',
  './assets/logo.svg',
  './assets/logo-light.svg',
  './assets/logo-dark.svg',
  './manifest.json'
];

// Install Event — Pre-cache local app shell with resilient Promise.allSettled
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[ServiceWorker] Optional asset pre-cache skipped:', url, err);
          })
        )
      );
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

  // 4. Network-First for local scripts and HTML (ensures auth updates and fixes are always live)
  if (url.pathname.includes('/js/') || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 5. Default App Shell: Stale-While-Revalidate / Cache with Network Fallback
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
