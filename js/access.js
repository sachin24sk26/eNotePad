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

  let pendingDocData = null;
  let pendingCode = null;

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

  // ----- OTP-style Code Input -----
  codeBoxes.forEach((box, index) => {
    box.addEventListener('input', (e) => {
      const value = e.target.value.toUpperCase();
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
        fetchContent();
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && index > 0) {
        codeBoxes[index - 1].focus();
        codeBoxes[index - 1].value = '';
        codeBoxes[index - 1].classList.remove('filled');
        updateClearBtnVisibility();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        fetchContent();
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData('text') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      for (let i = 0; i < Math.min(pasted.length, 6); i++) {
        codeBoxes[i].value = pasted[i];
        codeBoxes[i].classList.add('filled');
      }
      const focusIndex = Math.min(pasted.length, 5);
      codeBoxes[focusIndex].focus();
      updateClearBtnVisibility();

      if (pasted.length >= 6) {
        fetchContent();
      }
    });
  });

  // Paste Code Button Handler
  if (accessPasteBtn) {
    accessPasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        const clean = (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
        if (!clean) {
          showToast('No valid code in clipboard', 'warning');
          return;
        }
        setCodeInBoxes(clean);
        updateClearBtnVisibility();
        showToast(`Pasted "${clean}"`, 'success');
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
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
    clean.split('').forEach((char, idx) => {
      if (codeBoxes[idx]) {
        codeBoxes[idx].value = char;
        codeBoxes[idx].classList.add('filled');
      }
    });
    updateClearBtnVisibility();
  }

  fetchBtn.addEventListener('click', fetchContent);

  // ----- Fetch Content -----
  async function fetchContent() {
    const code = getCodeFromBoxes();

    if (code.length !== 6) {
      showToast('Please enter the full 6-character code', 'warning');
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
        showStatus('😕', 'No content found for this code. It may have expired, burned, or the code is incorrect.', 'error');
        return;
      }

      const data = doc.data();

      // Check Expiration
      if (data.expiresAt && isExpired(data.expiresAt)) {
        await db.collection('shares').doc(code).delete();
        // Also clean up owner's history entry
        if (data.userId) {
          await db.collection('users').doc(data.userId)
            .collection('history').doc(code).delete().catch(() => {});
        }
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
            setTimeout(() => accessPasswordInput.focus(), 100);
          }
        }
        return;
      }

      // Render Directly if no password
      await displayRetrievedContent(data, code);

    } catch (error) {
      console.error('Fetch error:', error);
      showToast('Failed to fetch content.', 'error');
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
          await displayRetrievedContent(pendingDocData, pendingCode);
          showToast('Password verified!', 'success');
        } else {
          showToast('Incorrect password. Please try again.', 'error');
          accessPasswordInput.classList.add('ring-2', 'ring-error');
          setTimeout(() => accessPasswordInput.classList.remove('ring-2', 'ring-error'), 1500);
          accessPasswordInput.select();
        }
      } catch (err) {
        console.error('Password verify error:', err);
        showToast('Verification failed', 'error');
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
  async function displayRetrievedContent(data, code) {
    renderContent(data);

    // Live Expiry Timer
    if (data.burnAfterReading) {
      const timerBadge = document.getElementById('contentExpiryTimerBadge');
      if (timerBadge) timerBadge.style.display = 'none';
    } else {
      startContentExpiryTimer(data.expiresAt, code);
    }

    // If Burn-After-Reading: Show badge & immediately delete from Firestore
    if (data.burnAfterReading) {
      if (burnAfterReadingBadge) burnAfterReadingBadge.style.display = 'flex';
      try {
        await db.collection('shares').doc(code).delete();
        console.log(`🔥 Note [${code}] burned after reading.`);
        // Also delete the history entry from the note owner's account
        if (data.userId) {
          await db.collection('users').doc(data.userId)
            .collection('history').doc(code).delete().catch(() => {});
        }
      } catch (err) {
        console.warn('Burn deletion notice:', err);
      }
    } else {
      if (burnAfterReadingBadge) burnAfterReadingBadge.style.display = 'none';
    }

    showToast('Content retrieved!', 'success');

    // Guest milestone nudge
    if (!getCurrentUser() && typeof window.showGuestMilestoneToast === 'function') {
      setTimeout(() => window.showGuestMilestoneToast('code_accessed'), 3000);
    }
  }

  function renderContent(data) {
    const resultContainer = document.getElementById('contentResult');
    const typeBadge = document.getElementById('contentTypeBadge');
    const contentBody = document.getElementById('contentBody');
    const copyBtn = document.getElementById('contentCopyBtn');

    const typeLabels = { text: '📝 TEXT', link: '🔗 LINK', image: '🖼️ IMAGE' };
    typeBadge.textContent = typeLabels[data.type] || data.type;

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
        const linkEl = document.createElement('a');
        linkEl.className = 'content-link-display flex items-center gap-2 p-3 bg-surface-container-low hover:bg-surface-container rounded-xl text-primary font-medium transition-colors text-sm break-all';
        linkEl.href = link;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
        linkEl.innerHTML = `<span class="material-symbols-outlined text-base">open_in_new</span> <span>${escText(link)}</span>`;
        linkContainer.appendChild(linkEl);
      });
      contentBody.appendChild(linkContainer);
      copyBtn.style.display = '';
      
      data.content = links.join('\n');

    } else if (data.type === 'image') {
      const imageDiv = document.createElement('div');
      imageDiv.className = 'content-image-display flex flex-col items-center';
      imageDiv.innerHTML = `
        <img src="${data.content}" alt="Shared image" class="w-full max-h-[400px] object-contain rounded-xl shadow-sm" />
        <a class="inline-flex items-center gap-2 mt-4 px-6 py-2.5 rounded-full text-xs font-bold text-primary bg-surface-container-low hover:bg-surface-container transition-all" href="${data.content}" target="_blank" download="enotepad-image.png">
          <span class="material-symbols-outlined text-base">download</span> Download Image
        </a>
      `;
      contentBody.appendChild(imageDiv);
      copyBtn.style.display = 'none';
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
      contentExportDropdown.style.display = isVisible ? 'none' : 'block';
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
              const preview = title || content.substring(0, 100);

              if (typeof window.saveNoteToFileManager === 'function') {
                await window.saveNoteToFileManager({ title, category, noteType: type, content }, folderId);
              }

              await db.collection('users').doc(currentUser.username)
                .collection('savedNotes').doc(noteId)
                .set({ type, content, title, category, preview, noteId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });

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
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code') || window.location.hash.replace('#', '').replace('code=', '');

    if (codeFromUrl && codeFromUrl.length === 6) {
      setTimeout(() => {
        if (typeof window.switchToTab === 'function') {
          window.switchToTab('access');
        }
        setCodeInBoxes(codeFromUrl);
        fetchContent();
      }, 350);
    }
  }

  checkUrlForCode();
}
