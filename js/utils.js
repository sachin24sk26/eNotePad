// ============================================================
// Utility Functions
// Helper functions used across the app: code generation,
// clipboard, toasts, time formatting, image compression, etc.
// ============================================================

/**
 * Generate a random alphanumeric code of the given length.
 * Uses uppercase letters and digits (no ambiguous chars like 0/O, 1/I/L).
 * @param {number} length - Code length (default 6)
 * @returns {string} Random code
 */
function generateCode(length = 6) {
  // Excluded ambiguous characters: 0, O, 1, I, L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  // Use crypto API for better randomness
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  return code;
}

/**
 * Generate a unique code that doesn't already exist in Firestore.
 * Retries up to 10 times to avoid collisions.
 * @param {number} length - Code length
 * @returns {Promise<string>} Unique code
 */
async function generateUniqueCode(length = 6) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode(length);
    const doc = await db.collection('shares').doc(code).get();
    if (!doc.exists) return code; // Code is unique
  }
  // Very unlikely to reach here with 6-char alphanumeric codes
  throw new Error('Unable to generate unique code. Please try again.');
}

/**
 * Copy text to clipboard with fallback for older browsers.
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
async function copyToClipboard(text) {
  try {
    // Modern Clipboard API
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * Show a toast notification.
 * @param {string} message - Notification text
 * @param {'success'|'error'|'warning'} type - Toast type
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');

  // Icon mapping
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto-remove after animation completes (4 seconds)
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 4000);
}

/**
 * Format a Firestore timestamp or Date to human-readable string.
 * @param {Object|Date} timestamp - Firestore timestamp or JS Date
 * @returns {string} Formatted time string
 */
function formatTimestamp(timestamp) {
  let date;
  if (timestamp && timestamp.toDate) {
    // Firestore Timestamp
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  // Relative time for recent items
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

  // Absolute time for older items
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Check if a shared item has expired.
 * @param {Object} expiresAt - Firestore timestamp for expiry
 * @returns {boolean} True if expired
 */
function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const expiryDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
  return new Date() > expiryDate;
}

/**
 * Compress/resize an image before upload to save bandwidth.
 * @param {File} file - Image file
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<string>} Compressed image Data URL (base64)
 */
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Process reasonable images normally
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          reject(new Error('Image processing failed: ' + err.message));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image format. Is it supported?'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('File reading failed.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Hash a string using SHA-256 (for PIN hashing).
 * @param {string} str - String to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate a URL string.
 * @param {string} str - URL to validate
 * @returns {boolean} True if valid URL
 */
function isValidURL(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get the currently logged-in user from localStorage.
 * @returns {Object|null} User object or null
 */
function getCurrentUser() {
  const userStr = localStorage.getItem('enotpad_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Set the current user in localStorage.
 * @param {Object|null} user - User object to save, or null to clear
 */
function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('enotpad_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('enotpad_user');
  }
}

/**
 * Debounce a function call.
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Clean up expired documents from Firestore.
 * All shared content auto-erases after 20 minutes.
 * Runs on load and every 5 minutes via initPeriodicCleanup().
 */
async function cleanupExpiredShares() {
  try {
    const now = firebase.firestore.Timestamp.now();
    
    // 1. Clean up old shares
    const snapshot = await db.collection('shares')
      .where('expiresAt', '<=', now)
      .limit(200)
      .get();

    if (!snapshot.empty) {
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 50) {
        const batch = db.batch();
        const chunk = docs.slice(i, i + 50);

        chunk.forEach(doc => {
          const data = doc.data();
          if (data.type === 'image' && data.content && data.content.includes('firebasestorage')) {
            try {
              const ref = storage.refFromURL(data.content);
              ref.delete().catch(() => {});
            } catch (e) { }
          }
          batch.delete(doc.ref);
        });

        await batch.commit();
      }
      console.log(`🧹 Cleaned up ${docs.length} expired shares`);
    }

    // 2. Clean up old convo_rooms
    const convoSnapshot = await db.collection('convo_rooms')
      .where('expiresAt', '<=', now)
      .limit(50)
      .get();

    if (!convoSnapshot.empty) {
      for (const doc of convoSnapshot.docs) {
         // Best effort delete subcollection messages first
         try {
             const msgs = await doc.ref.collection('messages').limit(200).get();
             if(!msgs.empty) {
                 const b = db.batch();
                 msgs.forEach(m => b.delete(m.ref));
                 await b.commit();
             }
         } catch(e) {}
         // Finally delete the room doc
         await doc.ref.delete();
      }
      console.log(`🧹 Cleaned up ${convoSnapshot.docs.length} expired convo rooms`);
    }

  } catch (error) {
    console.warn('Cleanup skipped:', error.message);
  }
}

/**
 * Safe element getter with optional error suppression
 */
function getEl(id) {
  if (typeof id !== 'string') return id;
  return document.getElementById(id);
}

/**
 * Safe textContent setter
 */
function setElText(id, text) {
  const el = getEl(id);
  if (el) el.textContent = text;
}

/**
 * Safe value setter
 */
function setElVal(id, val) {
  const el = getEl(id);
  if (el) el.value = val;
}

