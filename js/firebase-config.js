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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);




// Export Firestore, Storage, and Auth references for use in other modules
const db = firebase.firestore();
const storage = firebase.storage();

console.log("🔥 Firebase initialized successfully");
