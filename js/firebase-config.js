// ============================================================
// Firebase Configuration — eNotePad
// Using Firebase compat SDK loaded via CDN in index.html
// Optimized: persistence, connection monitoring, latency tracking
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyAAXDffMtDriaAY18jmw2B_iItmWgg2HH8",
  authDomain: "enotpad.firebaseapp.com",
  projectId: "enotpad",
  storageBucket: "enotpad.firebasestorage.app",
  messagingSenderId: "608459725551",
  appId: "1:608459725551:web:b47c42f53fbe51d84b991a"
};

let db;

// Connection state tracker — used by admin panel for real health metrics
window.firebaseConnectionState = {
  connected: false,
  lastPingMs: null,
  lastChecked: null,
  persistence: false
};

if (typeof firebase === 'undefined') {
  console.error('🔥 Firebase SDK not loaded. Check your internet connection or ad blocker.');
  alert('Firebase SDK failed to load. Please check your connection.');
} else {
  try {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    // Export Firestore reference
    db = firebase.firestore();
    window.db = db;

    // Enable offline persistence for caching & reduced reads
    db.enablePersistence({ synchronizeTabs: true })
      .then(() => {
        console.log('🔥 Firestore persistence enabled (offline cache active)');
        window.firebaseConnectionState.persistence = true;
      })
      .catch(err => {
        if (err.code === 'failed-precondition') {
          console.warn('🔥 Persistence failed: multiple tabs open. Cache will still work per-tab.');
        } else if (err.code === 'unimplemented') {
          console.warn('🔥 Persistence not supported in this browser.');
        } else {
          console.warn('🔥 Persistence error:', err);
        }
      });

    console.log("🔥 Firebase initialized successfully");

    // Connection health monitor — measures actual Firestore latency
    async function measureFirestoreLatency() {
      try {
        const start = performance.now();
        await db.collection('system').doc('ping').get({ source: 'server' });
        const latency = Math.round(performance.now() - start);
        window.firebaseConnectionState.connected = true;
        window.firebaseConnectionState.lastPingMs = latency;
        window.firebaseConnectionState.lastChecked = new Date();
        return latency;
      } catch (e) {
        window.firebaseConnectionState.connected = false;
        window.firebaseConnectionState.lastPingMs = null;
        window.firebaseConnectionState.lastChecked = new Date();

        if (e.code === 'permission-denied') {
          // Still connected, just no permissions for this doc
          window.firebaseConnectionState.connected = true;
          window.firebaseConnectionState.lastPingMs = 0;
        }
        return null;
      }
    }

    // Initial connection check (delayed to not block page load)
    setTimeout(() => {
      measureFirestoreLatency().then(ms => {
        if (ms !== null) {
          console.log(`🔥 Firestore connected (${ms}ms latency)`);
        }
      });
    }, 2000);

    // Expose for admin panel
    window.measureFirestoreLatency = measureFirestoreLatency;

  } catch (error) {
    console.error("🔥 Firebase initialization error:", error);
  }
}
