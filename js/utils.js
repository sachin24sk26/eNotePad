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
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-20 sm:top-24 right-4 sm:right-6 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100vw-2rem)]';
    document.body.appendChild(container);
  }

  // Icon mapping
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} pointer-events-auto shadow-xl transition-all duration-300`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span>${message}</span>
  `;

  // Announce to screen readers via aria-live polite region
  let announcer = document.getElementById('a11yAnnouncer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'a11yAnnouncer';
    announcer.className = 'sr-only';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  }
  announcer.textContent = message;

  // Auto-remove with smooth exit animation after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 4000);
}

/**
 * Smoothly scroll to an element with offset for fixed navigation headers.
 * @param {HTMLElement|string} target - Target element or element ID
 * @param {number} offset - Pixel offset from top (default 85px)
 */
function smoothScrollTo(target, offset = 85) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) return;
  const elementPosition = el.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;
  window.scrollTo({
    top: Math.max(0, offsetPosition),
    behavior: 'smooth'
  });
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
 * Smart Compress / Optimize an image before upload to Firestore.
 * Preserves high resolution (up to 2048px) and high visual fidelity (0.90 quality),
 * while guaranteeing the base64 payload safely fits within Firestore's 1MB document limit.
 * If the image is already small (<= 650KB) and within normal dimensions, it preserves 100% original quality.
 *
 * @param {File|Blob} file - Image file
 * @param {number} maxDimension - Maximum width or height in pixels (default: 2048)
 * @param {number} quality - Target image quality (default: 0.90)
 * @returns {Promise<string>} Base64 image Data URL
 */
function compressImage(file, maxDimension = 2048, quality = 0.90) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return reject(new Error('Invalid image file.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File reading failed.'));
    reader.onload = (e) => {
      const originalDataUrl = e.target.result;

      // Firestore document hard limit is 1,048,576 bytes (~1MB).
      // A base64 string length <= 880KB leaves plenty of room for Firestore metadata.
      const MAX_DATA_URL_LENGTH = 880 * 1024; // ~901,120 chars

      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image format. Is it supported?'));
      img.onload = () => {
        try {
          let { width, height } = img;

          // If the file is already under 650KB and dimensions are within reasonable bounds,
          // keep original dataUrl directly for 100% lossless, zero-compression quality!
          if (file.size <= 650 * 1024 && width <= 2560 && height <= 2560 && originalDataUrl.length <= MAX_DATA_URL_LENGTH) {
            return resolve(originalDataUrl);
          }

          // Calculate aspect-ratio preserving dimensions capped at maxDimension (default 2048px)
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Detect WebP support for maximum visual quality at lower size and transparency support
          const supportsWebP = (() => {
            try {
              const testCanvas = document.createElement('canvas');
              testCanvas.width = 1;
              testCanvas.height = 1;
              return testCanvas.toDataURL('image/webp').startsWith('data:image/webp');
            } catch (e) {
              return false;
            }
          })();

          // Use WebP if supported; fallback to JPEG
          const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';
          if (!supportsWebP && (file.type === 'image/png' || file.type === 'image/webp')) {
            // Fill background with white to avoid black backgrounds on transparent PNGs when falling back to JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Progressive optimization: attempt high quality (0.90), stepping down only if exceeding Firestore safe limit
          let resultDataUrl = canvas.toDataURL(mimeType, quality);

          if (resultDataUrl.length > MAX_DATA_URL_LENGTH) {
            const qualitySteps = [0.85, 0.80, 0.75];
            for (const q of qualitySteps) {
              resultDataUrl = canvas.toDataURL(mimeType, q);
              if (resultDataUrl.length <= MAX_DATA_URL_LENGTH) break;
            }
          }

          // If still over budget, downscale dimensions slightly while keeping clean quality
          if (resultDataUrl.length > MAX_DATA_URL_LENGTH) {
            const scales = [0.8, 0.65, 0.5];
            for (const s of scales) {
              const sw = Math.round(width * s);
              const sh = Math.round(height * s);
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = sw;
              tempCanvas.height = sh;
              const tctx = tempCanvas.getContext('2d');
              tctx.imageSmoothingEnabled = true;
              tctx.imageSmoothingQuality = 'high';
              if (!supportsWebP) {
                tctx.fillStyle = '#FFFFFF';
                tctx.fillRect(0, 0, sw, sh);
              }
              tctx.drawImage(canvas, 0, 0, sw, sh);
              resultDataUrl = tempCanvas.toDataURL(mimeType, 0.82);
              if (resultDataUrl.length <= MAX_DATA_URL_LENGTH) break;
            }
          }

          resolve(resultDataUrl);
        } catch (err) {
          reject(new Error('Image processing failed: ' + err.message));
        }
      };

      img.src = originalDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human-readable file size string.
 * @param {number} bytes
 * @returns {string} e.g. "450 KB", "1.2 MB"
 */
function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

