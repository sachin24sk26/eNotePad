// ============================================================
// Access Module — The Tactile Editorial
// Handles note retrieval, password verification, burn-after-reading
// self-destruct, multi-format export, and URL query param auto-loader.
// ============================================================

function initAccess() {
  const codeBoxes = document.querySelectorAll('.code-input-box');
  const fetchBtn = document.getElementById('fetchBtn');
  const contentCopyBtn = document.getElementById('contentCopyBtn');
  const contentSaveBtn = document.getElementById('contentSaveBtn');
  const accessPasswordPrompt = document.getElementById('accessPasswordPrompt');
  const accessPasswordInput = document.getElementById('accessPasswordInput');
  const submitAccessPasswordBtn = document.getElementById('submitAccessPasswordBtn');
  const burnAfterReadingBadge = document.getElementById('burnAfterReadingBadge');
  const contentExportBtn = document.getElementById('contentExportBtn');
  const contentExportDropdown = document.getElementById('contentExportDropdown');

  const accessPasteBtn = document.getElementById('accessPasteBtn');
  const accessClearBtn = document.getElementById('accessClearBtn');
  const retrieveAnotherBtn = document.getElementById('retrieveAnotherBtn');
  const statusRetryBtn = document.getElementById('statusRetryBtn');

  // Popup Alert Floating Banner Elements (Top-Left Corner)
  const accessAlertModal = document.getElementById('accessAlertModal');
  const accessAlertCloseIconBtn = document.getElementById('accessAlertCloseIconBtn');
  const accessAlertTitle = document.getElementById('accessAlertTitle');
  const accessAlertMessage = document.getElementById('accessAlertMessage');
  const accessAlertIcon = document.getElementById('accessAlertIcon');
  const accessAlertProgress = document.getElementById('accessAlertProgress');

  let pendingDocData = null;
  let pendingCode = null;
  let accessAlertTimer = null;

  function showAccessAlert(title, message, code = '', icon = 'warning') {
    if (accessAlertTitle) accessAlertTitle.textContent = title;
    if (accessAlertMessage) {
      if (code) {
        accessAlertMessage.innerHTML = `No note found for code <strong>"${escText(code)}"</strong>.<br><span class="opacity-80">It may have expired or contains a typo.</span>`;
      } else {
        accessAlertMessage.textContent = message;
      }
    }
    if (accessAlertIcon) accessAlertIcon.textContent = icon;

    // Trigger tactile shake animation on code input boxes for visual feedback
    const codeInputGroup = document.getElementById('codeInputGroup');
    if (codeInputGroup) {
      codeInputGroup.classList.add('animate-shake');
      setTimeout(() => codeInputGroup.classList.remove('animate-shake'), 600);
    }

    if (accessAlertModal) {
      if (accessAlertTimer) {
        clearTimeout(accessAlertTimer);
        accessAlertTimer = null;
      }

      // Reset progress bar
      if (accessAlertProgress) {
        accessAlertProgress.style.transition = 'none';
        accessAlertProgress.style.width = '100%';
      }

      accessAlertModal.style.display = 'block';

      // Animate slide-in from top-right
      requestAnimationFrame(() => {
        accessAlertModal.classList.remove('opacity-0', 'translate-x-12');
        accessAlertModal.classList.add('opacity-100', 'translate-x-0');

        if (accessAlertProgress) {
          setTimeout(() => {
            accessAlertProgress.style.transition = 'width 3.5s linear';
            accessAlertProgress.style.width = '0%';
          }, 30);
        }
      });

      // Auto vanish after 3.5 seconds
      accessAlertTimer = setTimeout(() => {
        hideAccessAlert();
      }, 3500);
    }
  }

  function hideAccessAlert() {
    if (accessAlertTimer) {
      clearTimeout(accessAlertTimer);
      accessAlertTimer = null;
    }
    if (!accessAlertModal) return;
    accessAlertModal.classList.remove('opacity-100', 'translate-x-0');
    accessAlertModal.classList.add('opacity-0', 'translate-x-12');
    setTimeout(() => {
      accessAlertModal.style.display = 'none';
    }, 320);
  }

  if (accessAlertCloseIconBtn) accessAlertCloseIconBtn.addEventListener('click', hideAccessAlert);

  function showStatus(icon, text, type = 'error') {
    const statusDiv = document.getElementById('accessStatus');
    const statusIcon = document.getElementById('accessStatusIcon');
    const statusText = document.getElementById('accessStatusText');
    if (statusIcon) statusIcon.textContent = icon;
    if (statusText) statusText.textContent = text;
    if (statusDiv) showEl('accessStatus');
  }

  function updateClearBtnVisibility() {
    if (!accessClearBtn) return;
    const hasAny = Array.from(codeBoxes).some(b => b.value.length > 0);
    accessClearBtn.style.display = hasAny ? 'inline-flex' : 'none';
  }

  // Password Hash Helper (SHA-256 with salt)
  async function hashPassword(str) {
    if (!str) return null;
    const encoder = new TextEncoder();
    const data = encoder.encode(str + '_enotepad_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ─── Rate Limiter (Brute-Force Attack Prevention) ──────────
  const RATE_LIMIT = {
    maxAttempts: 5,
    windowMs: 60 * 1000,
    lockoutMs: 30 * 1000,
    attempts: [],
    lockedUntil: 0
  };

  function checkRateLimit() {
    const now = Date.now();
    if (now < RATE_LIMIT.lockedUntil) {
      const remainingSec = Math.ceil((RATE_LIMIT.lockedUntil - now) / 1000);
      showToast(`Too many attempts. Security lockout active: wait ${remainingSec}s`, 'warning');
      return false;
    }
    return true;
  }

  function recordFailedAttempt() {
    const now = Date.now();
    RATE_LIMIT.attempts = RATE_LIMIT.attempts.filter(t => now - t < RATE_LIMIT.windowMs);
    RATE_LIMIT.attempts.push(now);
    if (RATE_LIMIT.attempts.length >= RATE_LIMIT.maxAttempts) {
      RATE_LIMIT.lockedUntil = now + RATE_LIMIT.lockoutMs;
      RATE_LIMIT.attempts = [];
      showToast('⚠️ Too many invalid attempts. Access locked for 30s.', 'error');
    }
  }

  function recordSuccessfulAttempt() {
    RATE_LIMIT.attempts = [];
    RATE_LIMIT.lockedUntil = 0;
  }

  // ─── URL & Image Sanitizers (XSS Defense) ──────────────────
  function sanitizeUrl(rawUrl, allowedProtocols = ['http:', 'https:']) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    try {
      const parsed = new URL(trimmed);
      if (allowedProtocols.includes(parsed.protocol)) {
        return parsed.href;
      }
    } catch (e) {}
    return null;
  }

  function isSafeFileSource(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
      return true;
    }
    // Safe Data URLs for images, documents, audio, video, archives, text, and code
    if (/^data:(image\/[a-z0-9.+_-]+|application\/(pdf|zip|x-zip-compressed|x-rar|octet-stream|json|msword|vnd\.[a-z0-9._-]+)|audio\/[a-z0-9.+_-]+|video\/[a-z0-9.+_-]+|text\/[a-z0-9.+_-]+);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
      return true;
    }
    return false;
  }
  const isSafeImageSource = isSafeFileSource;

  // ─── Universal Access Code String Extractor ───────────────
  // Intelligently parses raw pastes, full URLs, formatted keys (e.g. ABC-123), and standalone tokens.
  function extractCodeFromRawString(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();

    const reservedRoutes = ['ACCESS', 'SHARE', 'EDITOR', 'USERS', 'ADMIN', 'LOGIN', 'SIGNUP', 'SETTINGS', 'ROOMS', 'HISTORY', 'SAVED', 'INBOX'];

    // 1. URL parser (detect ?code=, ?c=, or #hash)
    const isFullUrl = trimmed.includes('://') || /^(https?:)?\/\//i.test(trimmed);
    try {
      if (isFullUrl || trimmed.includes('?') || trimmed.includes('#')) {
        const dummyBase = 'https://enotepad.site/';
        const url = new URL(isFullUrl ? trimmed : dummyBase + trimmed.replace(/^\/?/, ''));
        const paramCode = url.searchParams.get('code') || url.searchParams.get('c');
        if (paramCode) {
          const cleanParam = paramCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (cleanParam.length === 6) return cleanParam;
        }
        const hash = url.hash.replace(/^#/, '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (hash.length === 6 && !reservedRoutes.includes(hash)) {
          return hash;
        }
        // If it's a full URL and has no valid code param/hash, DO NOT fall through to substring matching!
        if (isFullUrl) {
          return '';
        }
      }
    } catch (e) {
      if (isFullUrl) return '';
    }

    // 2. Explicit prefix like "code: ABC123", "code is ABC123", "secret code: ABC123"
    const prefixMatch = trimmed.match(/(?:code|key|pin|secret|access)[\s:=]+(?:is\s+|to\s+)?([A-Za-z0-9]{6})\b/i);
    if (prefixMatch) return prefixMatch[1].toUpperCase();

    // 3. 3-3 split like ABC-123 or ABC 123
    const splitMatch = trimmed.match(/\b([A-Za-z0-9]{3})[-_\s]([A-Za-z0-9]{3})\b/);
    if (splitMatch) return (splitMatch[1] + splitMatch[2]).toUpperCase();

    // 4. Standalone 6-char code containing digits (e.g. P3Q4R5, AB12CD, 123456)
    const codeWithDigitMatch = trimmed.match(/\b([A-Za-z0-9]{6})\b/g);
    if (codeWithDigitMatch) {
      const withDigit = codeWithDigitMatch.find(m => /\d/.test(m) && !reservedRoutes.includes(m.toUpperCase()));
      if (withDigit) return withDigit.toUpperCase();
    }

    // 5. If stripped alphanumeric is exactly 6 chars and not a reserved route, return it
    const stripped = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (stripped.length === 6 && !reservedRoutes.includes(stripped)) return stripped;

    // 6. Standalone 6-char alphanumeric word
    if (codeWithDigitMatch && codeWithDigitMatch.length > 0) {
      const validToken = codeWithDigitMatch.find(m => !reservedRoutes.includes(m.toUpperCase()));
      if (validToken) return validToken.toUpperCase();
    }

    // 7. Fallback for manual partial typing (only if not a URL or path)
    if (!trimmed.includes('/') && !trimmed.includes(':') && stripped.length <= 6) {
      return stripped;
    }

    return '';
  }

  // ----- OTP-style Code Input -----
  codeBoxes.forEach((box, index) => {
    // Auto-select contents on focus for frictionless editing
    box.addEventListener('focus', () => {
      box.select();
    });

    box.addEventListener('input', (e) => {
      const rawVal = e.target.value;

      // If user pasted or autofilled multiple characters into one box
      if (rawVal.length > 1) {
        const extracted = extractCodeFromRawString(rawVal);
        if (extracted) {
          setCodeInBoxes(extracted);
          if (extracted.length === 6) {
            fetchContent();
          }
          return;
        }
      }

      const value = rawVal.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 1);
      e.target.value = value;

      if (value) {
        box.classList.add('filled');
        if (index < codeBoxes.length - 1) {
          codeBoxes[index + 1].focus();
        }
      } else {
        box.classList.remove('filled');
      }

      updateClearBtnVisibility();

      if (getCodeFromBoxes().length === 6) {
        codeBoxes.forEach(b => {
          b.classList.add('code-box-pulse');
          setTimeout(() => b.classList.remove('code-box-pulse'), 350);
        });
        fetchContent();
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!box.value && index > 0) {
          e.preventDefault();
          codeBoxes[index - 1].focus();
          codeBoxes[index - 1].value = '';
          codeBoxes[index - 1].classList.remove('filled');
          updateClearBtnVisibility();
        } else {
          box.classList.remove('filled');
          setTimeout(updateClearBtnVisibility, 0);
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        codeBoxes[index - 1].focus();
      } else if (e.key === 'ArrowRight' && index < codeBoxes.length - 1) {
        e.preventDefault();
        codeBoxes[index + 1].focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        fetchContent();
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const rawPasted = e.clipboardData ? e.clipboardData.getData('text') : '';
      const parsed = extractCodeFromRawString(rawPasted);
      if (!parsed) return;

      setCodeInBoxes(parsed);
      const focusIndex = Math.min(parsed.length, 5);
      codeBoxes[focusIndex].focus();
      updateClearBtnVisibility();

      if (parsed.length === 6) {
        fetchContent();
      }
    });
  });

  // Paste Code Button Handler
  if (accessPasteBtn) {
    accessPasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        const clean = extractCodeFromRawString(text);
        if (!clean) {
          showToast('No valid 6-character code found in clipboard', 'warning');
          return;
        }
        setCodeInBoxes(clean);
        updateClearBtnVisibility();
        showToast(`Loaded "${clean}"`, 'success');
        if (clean.length === 6) {
          fetchContent();
        }
      } catch (err) {
        showToast('Please paste manually or allow clipboard access', 'warning');
      }
    });
  }

  // Clear Code Button Handler
  if (accessClearBtn) {
    accessClearBtn.addEventListener('click', () => {
      codeBoxes.forEach(box => {
        box.value = '';
        box.classList.remove('filled');
      });
      updateClearBtnVisibility();
      if (codeBoxes[0]) codeBoxes[0].focus();
    });
  }

  // Retrieve Another Note Button Handler
  if (retrieveAnotherBtn) {
    retrieveAnotherBtn.addEventListener('click', () => {
      hideEl('contentResult');
      hideEl('accessStatus');
      codeBoxes.forEach(box => {
        box.value = '';
        box.classList.remove('filled');
      });
      updateClearBtnVisibility();
      if (codeBoxes[0]) codeBoxes[0].focus();
    });
  }

  // Retry Button Handler
  if (statusRetryBtn) {
    statusRetryBtn.addEventListener('click', () => {
      hideEl('accessStatus');
      codeBoxes.forEach(box => {
        box.value = '';
        box.classList.remove('filled');
      });
      updateClearBtnVisibility();
      if (codeBoxes[0]) codeBoxes[0].focus();
    });
  }

  function getCodeFromBoxes() {
    return Array.from(codeBoxes).map(b => b.value).join('').toUpperCase();
  }

  function setCodeInBoxes(code) {
    if (!code) return;
    const clean = extractCodeFromRawString(code);
    codeBoxes.forEach((box, idx) => {
      const char = clean[idx] || '';
      box.value = char;
      if (char) {
        box.classList.add('filled');
      } else {
        box.classList.remove('filled');
      }
    });
    updateClearBtnVisibility();

    if (clean.length === 6) {
      codeBoxes.forEach(b => {
        b.classList.add('code-box-pulse');
        setTimeout(() => b.classList.remove('code-box-pulse'), 350);
      });
    }
  }

  fetchBtn.addEventListener('click', fetchContent);

  // ----- Fetch Content -----
  async function fetchContent() {
    if (!checkRateLimit()) return;

    const code = getCodeFromBoxes();

    if (code.length !== 6) {
      showAccessAlert('Incomplete Code', 'Please enter all 6 characters of the access code to retrieve content.', code, 'dialpad');
      return;
    }

    fetchBtn.classList.add('btn-loading');
    fetchBtn.disabled = true;

    hideEl('contentResult');
    hideEl('accessStatus');
    if (accessPasswordPrompt) accessPasswordPrompt.style.display = 'none';
    if (expiryTimerInterval) {
      clearInterval(expiryTimerInterval);
      expiryTimerInterval = null;
    }

    try {
      const doc = await db.collection('shares').doc(code).get();

      if (!doc.exists) {
        recordFailedAttempt();
        showAccessAlert('Invalid Access Code', '', code, 'warning');
        showStatus('😕', 'No content found for this code. It may have expired, burned, or the code is incorrect.', 'error');
        return;
      }

      recordSuccessfulAttempt();
      const data = doc.data();

      // Check Expiration
      if (data.expiresAt && isExpired(data.expiresAt)) {
        await db.collection('shares').doc(code).delete().catch(() => {});
        // Also clean up owner's history entry
        if (data.userId) {
          await db.collection('users').doc(data.userId)
            .collection('history').doc(code).delete().catch(() => {});
        }
        showAccessAlert('Note Expired', 'This note has reached its expiration time and has been purged.', code, 'timer_off');
        showStatus('⏰', 'This content has expired and is no longer available.', 'expired');
        return;
      }

      // Check Password Protection
      if (data.isProtected && data.passwordHash) {
        pendingDocData = data;
        pendingCode = code;
        if (accessPasswordPrompt) {
          accessPasswordPrompt.style.display = 'block';
          if (accessPasswordInput) {
            accessPasswordInput.value = '';
            setTimeout(() => {
              accessPasswordInput.focus();
              accessPasswordPrompt.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
          }
        }
        return;
      }

      // If Burn-After-Reading without password: execute atomic single-reader transaction
      if (data.burnAfterReading) {
        let burnedData = null;
        try {
          burnedData = await db.runTransaction(async (transaction) => {
            const shareRef = db.collection('shares').doc(code);
            const sfDoc = await transaction.get(shareRef);
            if (!sfDoc.exists) {
              throw new Error('ALREADY_BURNED');
            }
            const current = sfDoc.data();
            if (current.isBurned) {
              throw new Error('ALREADY_BURNED');
            }
            transaction.delete(shareRef);
            return current;
          });
        } catch (burnErr) {
          showAccessAlert('Note Already Burned', 'This note was configured to self-destruct upon reading and has already been burned.', code, 'local_fire_department');
          showStatus('🔥', 'This note was set to self-destruct and has already been burned.', 'expired');
          return;
        }

        if (data.userId) {
          db.collection('users').doc(data.userId)
            .collection('history').doc(code).delete().catch(() => {});
        }

        await displayRetrievedContent(burnedData || data, code, true);
        return;
      }

      // Render Directly if no password & not burn-after-reading
      await displayRetrievedContent(data, code, false);

    } catch (error) {
      console.error('Fetch error:', error);
      showAccessAlert('Network Error', 'Failed to retrieve note. Please check your internet connection.', code, 'cloud_off');
    } finally {
      fetchBtn.classList.remove('btn-loading');
      fetchBtn.disabled = false;
    }
  }

  // ----- Password Unlock Handler -----
  if (submitAccessPasswordBtn && accessPasswordInput) {
    const handlePasswordUnlock = async () => {
      const enteredPwd = accessPasswordInput.value.trim();
      if (!enteredPwd) {
        showToast('Please enter the password', 'warning');
        accessPasswordInput.focus();
        return;
      }

      submitAccessPasswordBtn.disabled = true;
      submitAccessPasswordBtn.classList.add('btn-loading');

      try {
        const enteredHash = await hashPassword(enteredPwd);
        if (pendingDocData && enteredHash === pendingDocData.passwordHash) {
          if (accessPasswordPrompt) accessPasswordPrompt.style.display = 'none';

          // If note is Burn-After-Reading, atomically delete & verify in transaction
          if (pendingDocData.burnAfterReading) {
            let burnedData = null;
            try {
              burnedData = await db.runTransaction(async (transaction) => {
                const shareRef = db.collection('shares').doc(pendingCode);
                const sfDoc = await transaction.get(shareRef);
                if (!sfDoc.exists) {
                  throw new Error('ALREADY_BURNED');
                }
                const current = sfDoc.data();
                if (current.isBurned) {
                  throw new Error('ALREADY_BURNED');
                }
                transaction.delete(shareRef);
                return current;
              });
            } catch (burnErr) {
              showAccessAlert('Note Already Burned', 'This note was configured to self-destruct upon reading and has already been burned.', pendingCode, 'local_fire_department');
              showStatus('🔥', 'This note was set to self-destruct and has already been burned.', 'expired');
              return;
            }

            if (pendingDocData.userId) {
              db.collection('users').doc(pendingDocData.userId)
                .collection('history').doc(pendingCode).delete().catch(() => {});
            }

            await displayRetrievedContent(burnedData || pendingDocData, pendingCode, true);
            showToast('Password verified & note burned! 🔥', 'success');
            return;
          }

          await displayRetrievedContent(pendingDocData, pendingCode, false);
          showToast('Password verified!', 'success');
        } else {
          showAccessAlert('Incorrect Password', 'The passcode or PIN entered is incorrect. Please verify and try again.', pendingCode, 'lock_clock');
          accessPasswordInput.classList.add('ring-2', 'ring-error');
          setTimeout(() => accessPasswordInput.classList.remove('ring-2', 'ring-error'), 1500);
          accessPasswordInput.select();
        }
      } catch (err) {
        console.error('Password verify error:', err);
        showAccessAlert('Verification Failed', 'An error occurred while validating the password. Please try again.', pendingCode, 'error');
      } finally {
        submitAccessPasswordBtn.disabled = false;
        submitAccessPasswordBtn.classList.remove('btn-loading');
      }
    };

    submitAccessPasswordBtn.addEventListener('click', handlePasswordUnlock);
    accessPasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePasswordUnlock();
      }
    });
  }

  let expiryTimerInterval = null;

  function startContentExpiryTimer(expiresAt, code) {
    if (expiryTimerInterval) {
      clearInterval(expiryTimerInterval);
      expiryTimerInterval = null;
    }

    const timerBadge = document.getElementById('contentExpiryTimerBadge');
    const timerText = document.getElementById('contentExpiryTimerText');
    const timerIcon = document.getElementById('contentExpiryTimerIcon');
    if (!timerBadge || !timerText) return;

    if (!expiresAt) {
      timerBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-surface-container-low text-on-surface-variant border border-outline-variant/20';
      if (timerIcon) timerIcon.textContent = 'all_inclusive';
      timerText.textContent = 'No Expiration';
      timerBadge.style.display = 'inline-flex';
      return;
    }

    const expiryTime = expiresAt.toDate ? expiresAt.toDate().getTime() : new Date(expiresAt).getTime();

    function update() {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        clearInterval(expiryTimerInterval);
        expiryTimerInterval = null;
        timerBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse';
        if (timerIcon) timerIcon.textContent = 'timer_off';
        timerText.textContent = 'Expired';
        showToast('This note has expired!', 'error');
        if (code) {
          db.collection('shares').doc(code).delete().catch(() => {});
        }
        return;
      }

      const totalSecs = Math.floor(diff / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      let timeStr = '';
      if (days > 0) {
        timeStr = `${days}d ${hours}h ${mins}m`;
      } else if (hours > 0) {
        timeStr = `${hours}h ${mins}m ${secs.toString().padStart(2, '0')}s`;
      } else {
        timeStr = `${mins}m ${secs.toString().padStart(2, '0')}s`;
      }

      timerText.textContent = `Expires in ${timeStr}`;

      if (diff < 3 * 60 * 1000) {
        timerBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse';
        if (timerIcon) timerIcon.textContent = 'alarm';
      } else if (diff < 15 * 60 * 1000) {
        timerBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
        if (timerIcon) timerIcon.textContent = 'hourglass_bottom';
      } else {
        timerBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-primary-container/40 text-primary border border-primary/20';
        if (timerIcon) timerIcon.textContent = 'timer';
      }

      timerBadge.style.display = 'inline-flex';
    }

    update();
    expiryTimerInterval = setInterval(update, 1000);
  }

  // ----- Display Retrieved Content & Handle Burn-After-Reading -----
  async function displayRetrievedContent(data, code, isAlreadyBurned = false) {
    renderContent(data);

    // Live Expiry Timer
    if (data.burnAfterReading || isAlreadyBurned) {
      const timerBadge = document.getElementById('contentExpiryTimerBadge');
      if (timerBadge) timerBadge.style.display = 'none';
      if (burnAfterReadingBadge) burnAfterReadingBadge.style.display = 'flex';

      // Fallback cleanup if not burned via transaction
      if (!isAlreadyBurned) {
        try {
          await db.collection('shares').doc(code).delete();
          if (data.userId) {
            await db.collection('users').doc(data.userId)
              .collection('history').doc(code).delete().catch(() => {});
          }
        } catch (err) {
          console.warn('Burn deletion notice:', err);
        }
      }
    } else {
      if (burnAfterReadingBadge) burnAfterReadingBadge.style.display = 'none';
      startContentExpiryTimer(data.expiresAt, code);
    }

    showToast('Content retrieved!', 'success');

    // Auto-scroll the page smoothly to the received data / message
    setTimeout(() => {
      const resultContainer = document.getElementById('contentResult');
      if (resultContainer) {
        if (typeof smoothScrollTo === 'function') {
          smoothScrollTo(resultContainer, 85);
        } else {
          resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 120);
  }

  function renderContent(data) {
    const resultContainer = document.getElementById('contentResult');
    const typeBadge = document.getElementById('contentTypeBadge');
    const contentBody = document.getElementById('contentBody');
    const copyBtn = document.getElementById('contentCopyBtn');

    let typeBadgeLabel = '📝 TEXT';
    if (data.type === 'link') typeBadgeLabel = '🔗 LINK';
    else if (data.type === 'image') {
      if (data.isImage === false) {
        const mime = (data.fileType || '').toLowerCase();
        if (mime.startsWith('audio/')) typeBadgeLabel = '🎵 AUDIO';
        else if (mime === 'application/pdf') typeBadgeLabel = '📄 PDF';
        else typeBadgeLabel = '📎 FILE';
      } else {
        typeBadgeLabel = '🖼️ IMAGE';
      }
    }
    typeBadge.textContent = typeBadgeLabel;

    resultContainer.dataset.type = data.type || 'text';
    resultContainer.dataset.content = data.content || '';
    resultContainer.dataset.title = data.title || '';
    resultContainer.dataset.category = data.category || '';
    if (data.fileName) resultContainer.dataset.fileName = data.fileName;
    else delete resultContainer.dataset.fileName;
    if (data.fileSize) resultContainer.dataset.fileSize = data.fileSize;
    else delete resultContainer.dataset.fileSize;
    if (data.fileType) resultContainer.dataset.fileType = data.fileType;
    else delete resultContainer.dataset.fileType;
    if (typeof data.isImage !== 'undefined') resultContainer.dataset.isImage = data.isImage ? 'true' : 'false';
    else delete resultContainer.dataset.isImage;

    contentBody.innerHTML = '';

    // --- Title & Category header (above content) ---
    const catMap = { personal: '📝 Personal', work: '💼 Work', ideas: '💡 Ideas', code: '🖥️ Code', links: '🔗 Links', important: '⭐ Important' };
    const hasTitle = data.title && data.title.trim();
    const hasCategory = data.category && catMap[data.category];
    if (hasTitle || hasCategory) {
      const metaHeader = document.createElement('div');
      metaHeader.className = 'accessed-note-meta';
      if (hasTitle) {
        const titleEl = document.createElement('h2');
        titleEl.className = 'accessed-note-title';
        titleEl.textContent = data.title.trim();
        metaHeader.appendChild(titleEl);
      }
      if (hasCategory) {
        const catEl = document.createElement('span');
        catEl.className = 'accessed-note-tag';
        catEl.textContent = catMap[data.category];
        metaHeader.appendChild(catEl);
      }
      contentBody.appendChild(metaHeader);
    }

    if (data.type === 'text') {
      const textDiv = document.createElement('div');
      textDiv.className = 'content-text-display whitespace-pre-wrap leading-relaxed text-sm';
      textDiv.textContent = data.content;
      contentBody.appendChild(textDiv);
      copyBtn.style.display = '';

    } else if (data.type === 'link') {
      const links = Array.isArray(data.content) ? data.content : [data.content];
      const linkContainer = document.createElement('div');
      linkContainer.className = 'flex flex-col gap-3';
      
      links.forEach(link => {
        const linkStr = String(link || '').trim();
        const safeHref = sanitizeUrl(linkStr);
        const linkEl = document.createElement('a');
        linkEl.className = 'content-link-display flex items-center gap-2 p-3 bg-surface-container-low hover:bg-surface-container rounded-xl text-primary font-medium transition-colors text-sm break-all';
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-symbols-outlined text-base';

        const textSpan = document.createElement('span');
        textSpan.textContent = linkStr;

        if (safeHref) {
          linkEl.href = safeHref;
          linkEl.target = '_blank';
          linkEl.rel = 'noopener noreferrer';
          iconSpan.textContent = 'open_in_new';
        } else {
          linkEl.href = '#';
          linkEl.title = 'Blocked unsafe or malformed link protocol';
          linkEl.style.opacity = '0.65';
          linkEl.style.cursor = 'not-allowed';
          iconSpan.textContent = 'block';
          linkEl.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Blocked unsafe link protocol for security.', 'error');
          });
        }

        linkEl.appendChild(iconSpan);
        linkEl.appendChild(textSpan);
        linkContainer.appendChild(linkEl);
      });
      contentBody.appendChild(linkContainer);
      copyBtn.style.display = '';
      
      data.content = links.join('\n');

    } else if (data.type === 'image') {
      const fileSrc = String(data.content || '').trim();
      const isImage = (data.isImage !== false) && (
        (data.fileType && data.fileType.startsWith('image/')) ||
        fileSrc.startsWith('data:image/') ||
        /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(fileSrc)
      );

      if (isImage) {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'content-image-display flex flex-col items-center w-full';

        if (isSafeImageSource(fileSrc)) {
          const img = document.createElement('img');
          img.src = fileSrc;
          img.alt = data.title ? `Shared image: ${data.title}` : 'Shared image';
          img.className = 'w-full max-h-[520px] object-contain rounded-xl shadow-sm cursor-zoom-in hover:opacity-95 transition-opacity';
          img.loading = 'lazy';
          img.title = 'Click to view full resolution';
          
          const openFullImage = () => {
            const w = window.open('');
            if (w) {
              w.document.write(`<!DOCTYPE html><html><head><title>${escText(data.title || 'Shared Image')}</title><style>body{margin:0;background:#0b0f19;display:flex;align-items:center;justify-content:center;min-height:100vh;}img{max-width:100%;max-height:100vh;object-fit:contain;box-shadow:0 10px 40px rgba(0,0,0,0.5);}</style></head><body><img src="${fileSrc}" alt="Full size image"></body></html>`);
            }
          };
          img.addEventListener('click', openFullImage);
          imageDiv.appendChild(img);

          // Resolution badge
          const badge = document.createElement('div');
          badge.className = 'text-[11px] font-medium text-on-surface-variant/70 mt-2 flex items-center gap-1.5';
          img.addEventListener('load', () => {
            if (img.naturalWidth && img.naturalHeight) {
              badge.innerHTML = `<span class="material-symbols-outlined text-[14px]">photo_size_select_actual</span> <span>${img.naturalWidth} × ${img.naturalHeight} px</span>`;
            }
          });
          imageDiv.appendChild(badge);

          let ext = 'jpg';
          if (fileSrc.startsWith('data:image/webp')) ext = 'webp';
          else if (fileSrc.startsWith('data:image/png')) ext = 'png';
          else if (fileSrc.startsWith('data:image/gif')) ext = 'gif';

          const btnRow = document.createElement('div');
          btnRow.className = 'flex items-center gap-2 mt-3 flex-wrap justify-center';

          const viewBtn = document.createElement('button');
          viewBtn.type = 'button';
          viewBtn.className = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-on-surface bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer';
          viewBtn.innerHTML = '<span class="material-symbols-outlined text-base">fullscreen</span> <span>View Full Size</span>';
          viewBtn.addEventListener('click', openFullImage);
          btnRow.appendChild(viewBtn);

          const downloadLink = document.createElement('a');
          downloadLink.className = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all';
          downloadLink.href = fileSrc;
          downloadLink.target = '_blank';
          downloadLink.download = data.fileName || `enotepad-image.${ext}`;
          downloadLink.rel = 'noopener noreferrer';
          downloadLink.innerHTML = '<span class="material-symbols-outlined text-base">download</span> <span>Download Image</span>';
          btnRow.appendChild(downloadLink);

          imageDiv.appendChild(btnRow);
        } else {
          const warningDiv = document.createElement('div');
          warningDiv.className = 'p-6 text-center text-error bg-error/10 rounded-xl text-sm font-semibold';
          warningDiv.textContent = '⚠️ Blocked untrusted or invalid image data for your security.';
          imageDiv.appendChild(warningDiv);
        }
        contentBody.appendChild(imageDiv);
        copyBtn.style.display = 'none';

      } else {
        // Non-image file card
        const fileCardDiv = document.createElement('div');
        fileCardDiv.className = 'content-file-display w-full flex flex-col gap-3 py-1';

        if (isSafeFileSource(fileSrc)) {
          const fileName = data.fileName || data.title || 'shared-file';
          const fileExt = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : (data.fileType ? data.fileType.split('/')[1] : 'file');
          const mime = (data.fileType || '').toLowerCase();
          const fileSizeStr = data.fileSize ? (typeof formatFileSize === 'function' ? formatFileSize(data.fileSize) : '') : '';

          let iconName = 'description';
          let themeColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20';

          if (fileExt === 'pdf' || mime === 'application/pdf') {
            iconName = 'picture_as_pdf';
            themeColor = 'bg-red-500/10 text-red-500 border-red-500/20';
          } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(fileExt) || mime.startsWith('audio/')) {
            iconName = 'audio_file';
            themeColor = 'bg-purple-500/10 text-purple-500 border-purple-500/20';
          } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExt) || mime.includes('zip') || mime.includes('compressed')) {
            iconName = 'folder_zip';
            themeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
          } else if (['xls', 'xlsx', 'ods', 'csv'].includes(fileExt) || mime.includes('spreadsheet') || mime.includes('csv')) {
            iconName = 'table_chart';
            themeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
          } else if (['ppt', 'pptx', 'odp'].includes(fileExt) || mime.includes('presentation')) {
            iconName = 'slideshow';
            themeColor = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
          } else if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css', 'cpp', 'java', 'sql', 'sh', 'md'].includes(fileExt)) {
            iconName = 'code';
            themeColor = 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
          }

          const card = document.createElement('div');
          card.className = 'p-5 sm:p-6 bg-surface-container-low/70 dark:bg-white/[0.03] rounded-2xl border border-outline-variant/20 flex flex-col gap-4';

          const topRow = document.createElement('div');
          topRow.className = 'flex items-center gap-4';

          const iconWrap = document.createElement('div');
          iconWrap.className = `w-14 h-14 rounded-2xl flex items-center justify-center border flex-shrink-0 ${themeColor}`;
          iconWrap.innerHTML = `<span class="material-symbols-outlined text-3xl">${iconName}</span>`;

          const infoWrap = document.createElement('div');
          infoWrap.className = 'flex-1 min-w-0';

          const titleEl = document.createElement('h3');
          titleEl.className = 'text-base font-bold text-on-surface truncate';
          titleEl.textContent = fileName;
          titleEl.title = fileName;

          const metaRow = document.createElement('div');
          metaRow.className = 'flex items-center gap-2 mt-1 text-xs text-on-surface-variant flex-wrap';

          if (fileSizeStr) {
            metaRow.innerHTML += `<span class="font-mono font-medium">${fileSizeStr}</span><span>•</span>`;
          }
          metaRow.innerHTML += `<span class="uppercase font-bold text-[10px] tracking-wider px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">${fileExt.toUpperCase()}</span>`;

          infoWrap.appendChild(titleEl);
          infoWrap.appendChild(metaRow);
          topRow.appendChild(iconWrap);
          topRow.appendChild(infoWrap);
          card.appendChild(topRow);

          // Audio player embed if audio file
          if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(fileExt) || mime.startsWith('audio/')) {
            const audioWrap = document.createElement('div');
            audioWrap.className = 'w-full pt-1';
            const audioEl = document.createElement('audio');
            audioEl.controls = true;
            audioEl.src = fileSrc;
            audioEl.className = 'w-full rounded-xl';
            audioWrap.appendChild(audioEl);
            card.appendChild(audioWrap);
          }

          // Action buttons row
          const actionRow = document.createElement('div');
          actionRow.className = 'flex items-center gap-2 pt-2 border-t border-outline-variant/10 flex-wrap';

          // Preview button for PDF
          if (fileExt === 'pdf' || mime === 'application/pdf') {
            const previewBtn = document.createElement('button');
            previewBtn.type = 'button';
            previewBtn.className = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-on-surface bg-surface-container-high hover:bg-surface-container transition-all cursor-pointer';
            previewBtn.innerHTML = '<span class="material-symbols-outlined text-base">visibility</span> <span>Preview PDF</span>';
            previewBtn.addEventListener('click', () => {
              const w = window.open('');
              if (w) {
                w.document.write(`<!DOCTYPE html><html><head><title>${escText(fileName)}</title><style>body,html,iframe{margin:0;padding:0;width:100%;height:100%;border:none;}</style></head><body><iframe src="${fileSrc}"></iframe></body></html>`);
              }
            });
            actionRow.appendChild(previewBtn);
          }

          // Download button
          const downloadBtn = document.createElement('a');
          downloadBtn.className = 'inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-sm transition-all cursor-pointer';
          downloadBtn.href = fileSrc;
          downloadBtn.download = fileName;
          downloadBtn.rel = 'noopener noreferrer';
          downloadBtn.innerHTML = '<span class="material-symbols-outlined text-base">download</span> <span>Download File</span>';
          actionRow.appendChild(downloadBtn);

          card.appendChild(actionRow);
          fileCardDiv.appendChild(card);
        } else {
          const warningDiv = document.createElement('div');
          warningDiv.className = 'p-6 text-center text-error bg-error/10 rounded-xl text-sm font-semibold';
          warningDiv.textContent = '⚠️ Blocked untrusted or invalid file data for your security.';
          fileCardDiv.appendChild(warningDiv);
        }

        contentBody.appendChild(fileCardDiv);
        copyBtn.style.display = 'none';
      }
    }

    if (contentSaveBtn) {
      contentSaveBtn.disabled = false;
      contentSaveBtn.innerHTML = '<span class="material-symbols-outlined text-lg">bookmark_add</span> <span>Save Note</span>';
    }

    showEl('contentResult');
    resultContainer.dataset.content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
    resultContainer.dataset.type = data.type;
    resultContainer.dataset.title = data.title || `Accessed ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`;
    resultContainer.dataset.category = data.category || '';
  }

  function escText(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ----- Copy Button -----
  if (contentCopyBtn) {
    contentCopyBtn.addEventListener('click', async () => {
      const resultContainer = document.getElementById('contentResult');
      const content = resultContainer ? resultContainer.dataset.content : '';
      if (!content) return;

      const success = await copyToClipboard(content);
      if (success) {
        contentCopyBtn.innerHTML = '<span class="material-symbols-outlined text-lg">check</span> Copied!';
        showToast('Content copied!', 'success');
        setTimeout(() => {
          contentCopyBtn.innerHTML = '<span class="material-symbols-outlined text-lg">content_copy</span> Copy';
        }, 2000);
      }
    });
  }

  // ----- Export Dropdown & Format Handlers -----
  if (contentExportBtn && contentExportDropdown) {
    contentExportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = contentExportDropdown.style.display !== 'none';
      contentExportDropdown.style.display = isVisible ? 'none' : 'flex';
    });

    document.addEventListener('click', () => {
      if (contentExportDropdown) contentExportDropdown.style.display = 'none';
    });

    document.querySelectorAll('.export-format-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const format = btn.dataset.format;
        const resultContainer = document.getElementById('contentResult');
        const content = resultContainer ? resultContainer.dataset.content : '';
        const title = resultContainer ? (resultContainer.dataset.title || 'enotepad-note') : 'enotepad-note';
        
        if (!content) {
          showToast('No content to export', 'warning');
          return;
        }

        downloadContentFile(content, title, format);
        contentExportDropdown.style.display = 'none';
      });
    });
  }

  function downloadContentFile(content, title, format) {
    let mime = 'text/plain';
    let ext = 'txt';
    let fileData = content;

    if (format === 'md') {
      mime = 'text/markdown';
      ext = 'md';
      fileData = `# ${title}\n\n${content}\n\n---\n*Exported from eNotePad*`;
    } else if (format === 'html') {
      mime = 'text/html';
      ext = 'html';
      fileData = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;line-height:1.6;padding:0 20px;}h1{color:#516070;}pre{background:#f4f4ef;padding:15px;border-radius:8px;}</style></head><body><h1>${title}</h1><pre>${escText(content)}</pre><p><em>Exported from <a href="https://enotepad.vercel.app">eNotePad</a></em></p></body></html>`;
    }

    const blob = new Blob([fileData], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported as .${ext}! 📄`, 'success');
  }

  // ----- Save Button -----
  if (contentSaveBtn) {
    contentSaveBtn.addEventListener('click', async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        showToast('Please sign in to save accessed notes to your library.', 'warning');
        if (typeof window.switchToTab === 'function') {
          window.switchToTab('account');
        }
        return;
      }

      const resultContainer = document.getElementById('contentResult');
      if (!resultContainer) return;
      const type = resultContainer.dataset.type || 'text';
      let content = resultContainer.dataset.content || '';
      const title = resultContainer.dataset.title || 'Saved Note';
      const category = resultContainer.dataset.category || '';
      const fileName = resultContainer.dataset.fileName;
      const fileSize = resultContainer.dataset.fileSize ? Number(resultContainer.dataset.fileSize) : undefined;
      const fileType = resultContainer.dataset.fileType;
      const isImg = resultContainer.dataset.isImage === 'true';
      const fileMeta = fileName ? { fileName, fileSize, fileType, isImage: isImg } : {};

      if (typeof window.openSaveFolderModal === 'function') {
        window.openSaveFolderModal({
          noteType: type,
          content: content,
          title: title,
          category: category,
          username: currentUser.username,
          onConfirm: async (folderId, folderName) => {
            contentSaveBtn.classList.add('btn-loading');
            contentSaveBtn.disabled = true;
            try {
              const noteId = generateCode(8);
              const preview = title || (type === 'image' ? (isImg ? '🖼️ Image' : `📎 ${fileName || 'File'}`) : content.substring(0, 100));

              if (typeof window.saveNoteToFileManager === 'function') {
                await window.saveNoteToFileManager({ title, category, noteType: type, content, ...(fileMeta || {}) }, folderId);
              }

              await db.collection('users').doc(currentUser.username)
                .collection('savedNotes').doc(noteId)
                .set({ type, content, title, category, preview, noteId, createdAt: firebase.firestore.FieldValue.serverTimestamp(), ...(fileMeta || {}) });

              // History entry
              await db.collection('users').doc(currentUser.username)
                .collection('history').doc(noteId)
                .set({ type, preview, code: noteId, saved: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });

              const dest = folderName ? `"${folderName}"` : 'My Files';
              showToast(`Note saved to ${dest}! 📁`, 'success');
              contentSaveBtn.innerHTML = '<span class="material-symbols-outlined text-lg">check</span> Saved!';
            } catch (err) {
              console.error('Save error:', err);
              showToast('Failed to save note.', 'error');
            } finally {
              contentSaveBtn.classList.remove('btn-loading');
            }
          }
        });
      }
    });
  }

  // ----- Auto-Check URL query param on startup -----
  function checkUrlForCode() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramCode = urlParams.get('code') || urlParams.get('c');
      if (paramCode) {
        const clean = extractCodeFromRawString(paramCode);
        if (clean && clean.length === 6) {
          setTimeout(() => {
            if (typeof window.switchToTab === 'function') {
              window.switchToTab('access');
            }
            setCodeInBoxes(clean);
            fetchContent();
          }, 350);
          return;
        }
      }

      // Check hash if valid 6-char code (e.g. #ABC123, not #access, #share, etc.)
      const hash = window.location.hash.replace(/^#/, '').trim().toUpperCase();
      const cleanHash = extractCodeFromRawString(hash);
      if (cleanHash && cleanHash.length === 6) {
        setTimeout(() => {
          if (typeof window.switchToTab === 'function') {
            window.switchToTab('access');
          }
          setCodeInBoxes(cleanHash);
          fetchContent();
        }, 350);
      }
    } catch (e) {
      console.warn('URL code check error:', e);
    }
  }

  checkUrlForCode();
}
