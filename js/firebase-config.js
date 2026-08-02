// ============================================================
// Firebase Configuration — eNotePad
// Using Firebase compat SDK loaded via CDN in index.html
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
if (typeof firebase === 'undefined') {
  console.error('🔥 Firebase SDK not loaded. Check your internet connection or ad blocker.');
  alert('Firebase SDK failed to load. Please check your connection.');
} else {
  try {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    // Export Firestore, Storage, and Auth references for use in other modules
    db = firebase.firestore();
    window.db = db; // Ensure global accessibility
    // const storage = firebase.storage();
    // window.storage = storage;

    console.log("🔥 Firebase initialized successfully");

    // Optional: Test connection to catch missing rules or invalid project
    db.collection('system').limit(1).get()
      .then(() => console.log("🔥 Firestore connection established."))
      .catch(e => {
        console.error("🔥 Firestore connection/permission error:", e);
        if (e.code === 'permission-denied') {
          console.warn("⚠️ Your Firestore Security Rules are blocking access. Please update them in the Firebase Console.");
        }
      });

  } catch (error) {
    console.error("🔥 Firebase initialization error:", error);
  }
}
