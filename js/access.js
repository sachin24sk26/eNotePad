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

  let pendingDocData = null;
  let pendingCode = null;

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
      }

      if (getCodeFromBoxes().length === 6) {
        fetchContent();
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && index > 0) {
        codeBoxes[index - 1].focus();
        codeBoxes[index - 1].value = '';
        codeBoxes[index - 1].classList.remove('filled');
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

      if (pasted.length >= 6) {
        fetchContent();
      }
    });
  });

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

  // ----- Display Retrieved Content & Handle Burn-After-Reading -----
  async function displayRetrievedContent(data, code) {
    renderContent(data);

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

    const typeLabels = { text: '📝 Text', link: '🔗 Link', image: '🖼️ Image' };
    typeBadge.textContent = typeLabels[data.type] || data.type;

    contentBody.innerHTML = '';

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

      if (typeof window.openSaveFolderModal === 'function') {
        window.openSaveFolderModal({
          noteType: type,
          content: content,
          title: title,
          username: currentUser.username,
          onConfirm: async (folderId, folderName) => {
            contentSaveBtn.classList.add('btn-loading');
            contentSaveBtn.disabled = true;
            try {
              const noteId = generateCode(8);
              const preview = title || content.substring(0, 100);

              if (typeof window.saveNoteToFileManager === 'function') {
                await window.saveNoteToFileManager({ title, noteType: type, content }, folderId);
              }

              await db.collection('users').doc(currentUser.username)
                .collection('savedNotes').doc(noteId)
                .set({ type, content, title, preview, noteId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });

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
