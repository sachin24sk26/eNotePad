// ============================================================
// Share Module — The Tactile Editorial
// Handles content sharing (text/link/image) with flexible expiry,
// Burn-After-Reading, password protection, QR Code, and deep link generator.
// ============================================================

function initShare() {
  const typeButtons = document.querySelectorAll('.type-btn');
  const shareBtn = document.getElementById('shareBtn');
  const shareIconBtn = document.getElementById('shareIconBtn');
  const saveBtn = document.getElementById('saveBtn');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('imageFileInput');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const codeCopyBtn = document.getElementById('codeCopyBtn');
  const codeCopyLinkBtn = document.getElementById('codeCopyLinkBtn');
  const codeQrToggleBtn = document.getElementById('codeQrToggleBtn');
  const shareQrContainer = document.getElementById('shareQrContainer');
  const shareQrCanvas = document.getElementById('shareQrCanvas');
  const noteMeta = document.getElementById('noteMeta');
  const noteTitle = document.getElementById('noteTitle');
  const noteCategory = document.getElementById('noteCategory');
  const expirySelect = document.getElementById('shareExpirySelect');
  const expiryBadgeText = document.getElementById('expiryBadgeText');
  const toggleSharePasswordBtn = document.getElementById('toggleSharePasswordBtn');
  const sharePasswordRow = document.getElementById('sharePasswordRow');
  const sharePasswordInput = document.getElementById('sharePasswordInput');
  const toggleSharePasswordLabel = document.getElementById('toggleSharePasswordLabel');
  const clearSharePasswordBtn = document.getElementById('clearSharePasswordBtn');

  let selectedType = 'text';
  let selectedFile = null;
  let qrCodeInstance = null;

  const addLinkBtn = document.getElementById('addLinkBtn');
  const linkInputsContainer = document.getElementById('linkInputsContainer');

  // ----- Expiry Selector Listener -----
  if (expirySelect) {
    expirySelect.addEventListener('change', () => {
      const val = expirySelect.value;
      if (val === 'burn') {
        if (expiryBadgeText) expiryBadgeText.innerHTML = '🔥 <strong>Burn After Reading</strong> (1-Time)';
      } else {
        const text = expirySelect.options[expirySelect.selectedIndex].text;
        if (expiryBadgeText) expiryBadgeText.innerHTML = `Auto-erases in <strong>${text.split(' ')[0]} ${text.split(' ')[1] || ''}</strong>`;
      }
    });
  }

  // ----- Password Protection Toggle -----
  if (toggleSharePasswordBtn && sharePasswordRow) {
    toggleSharePasswordBtn.addEventListener('click', () => {
      const isHidden = sharePasswordRow.style.display === 'none';
      sharePasswordRow.style.display = isHidden ? 'block' : 'none';
      if (isHidden && sharePasswordInput) {
        sharePasswordInput.focus();
        if (toggleSharePasswordLabel) toggleSharePasswordLabel.textContent = 'Password Enabled';
        toggleSharePasswordBtn.classList.add('text-primary', 'bg-primary/10', 'border-primary/30');
      } else {
        if (sharePasswordInput) sharePasswordInput.value = '';
        if (toggleSharePasswordLabel) toggleSharePasswordLabel.textContent = 'Add Password';
        toggleSharePasswordBtn.classList.remove('text-primary', 'bg-primary/10', 'border-primary/30');
      }
    });
  }

  if (clearSharePasswordBtn) {
    clearSharePasswordBtn.addEventListener('click', () => {
      if (sharePasswordInput) sharePasswordInput.value = '';
      if (sharePasswordRow) sharePasswordRow.style.display = 'none';
      if (toggleSharePasswordLabel) toggleSharePasswordLabel.textContent = 'Add Password';
      if (toggleSharePasswordBtn) toggleSharePasswordBtn.classList.remove('text-primary', 'bg-primary/10', 'border-primary/30');
    });
  }

  // Password Hash Helper (SHA-256)
  async function hashPassword(str) {
    if (!str) return null;
    const encoder = new TextEncoder();
    const data = encoder.encode(str + '_enotepad_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ----- Dynamic Links -----
  function updateRemoveLinkButtons() {
    const rows = linkInputsContainer.querySelectorAll('.link-input-row');
    rows.forEach(row => {
      const rmBtn = row.querySelector('.remove-link-btn');
      if (rows.length > 1) {
        rmBtn.classList.remove('hidden');
      } else {
        rmBtn.classList.add('hidden');
      }
    });
  }

  if (linkInputsContainer) {
    linkInputsContainer.addEventListener('click', (e) => {
      const rmBtn = e.target.closest('.remove-link-btn');
      if (rmBtn) {
        rmBtn.closest('.link-input-row').remove();
        updateRemoveLinkButtons();
      }
    });
  }

  if (addLinkBtn) {
    addLinkBtn.addEventListener('click', () => {
      const firstRow = linkInputsContainer.querySelector('.link-input-row');
      const newRow = firstRow.cloneNode(true);
      newRow.querySelector('input').value = '';
      linkInputsContainer.appendChild(newRow);
      newRow.querySelector('input').focus();
      updateRemoveLinkButtons();
    });
  }

  // ----- Update button + fields visibility based on login state -----
  function updateActionButtons() {
    const user = getCurrentUser();
    if (user) {
      shareBtn.setAttribute('data-hidden', 'true');
      shareIconBtn.removeAttribute('data-hidden');
      saveBtn.removeAttribute('data-hidden');
    } else {
      shareBtn.removeAttribute('data-hidden');
      shareIconBtn.setAttribute('data-hidden', 'true');
      saveBtn.setAttribute('data-hidden', 'true');
    }
    // Title & Category are accessible to all users (both guests and logged-in)
    if (noteMeta) noteMeta.removeAttribute('data-hidden');
  }

  updateActionButtons();
  window.updateShareButtons = updateActionButtons;

  // ----- Content Type Switching -----
  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      typeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
      toggleDataHidden('inputText', selectedType !== 'text');
      toggleDataHidden('inputLink', selectedType !== 'link');
      toggleDataHidden('inputImage', selectedType !== 'image');
    });
  });

  // ----- Image Upload -----
  ['dragenter', 'dragover'].forEach(event => {
    dropzone.addEventListener(event, (e) => {
      e.preventDefault();
      dropzone.classList.add('bg-surface-container-low');
    });
  });

  ['dragleave', 'drop'].forEach(event => {
    dropzone.addEventListener(event, (e) => {
      e.preventDefault();
      dropzone.classList.remove('bg-surface-container-low');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageSelect(files[0]);
    } else {
      showToast('Please drop an image file', 'error');
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleImageSelect(e.target.files[0]);
  });

  function handleImageSelect(file) {
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.getElementById('imagePreviewImg');
      if (img) img.src = e.target.result;
      showEl('imagePreview');
      dropzone.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  removeImageBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    hideEl('imagePreview');
    dropzone.style.display = '';
  });

  // ----- Get content from inputs -----
  function getContent() {
    if (selectedType === 'text') {
      const content = (typeof getEditorPlainText === 'function') ? getEditorPlainText() : '';
      if (!content) { showToast('Please enter some text', 'warning'); return null; }
      return content;
    } else if (selectedType === 'link') {
      const linkInputs = document.querySelectorAll('.shareLinkInput');
      const content = [];
      for (const input of linkInputs) {
        const val = input.value.trim();
        if (val) {
          if (!isValidURL(val)) { showToast('Please enter a valid URL (https://...)', 'error'); return null; }
          content.push(val);
        }
      }
      if (content.length === 0) { showToast('Please enter at least one URL', 'warning'); return null; }
      return content.length === 1 ? content[0] : content;
    } else if (selectedType === 'image') {
      if (!selectedFile) { showToast('Please select an image', 'warning'); return null; }
      return '__image__';
    }
    return null;
  }

  // ----- Upload image helper -----
  async function uploadImage(code) {
    const compressedDataUrl = await compressImage(selectedFile);
    return compressedDataUrl;
  }

  // ----- Share handlers -----
  shareBtn.addEventListener('click', (e) => { e.preventDefault(); handleShare(shareBtn); });
  shareIconBtn.addEventListener('click', (e) => { e.preventDefault(); handleShare(shareIconBtn); });

  async function handleShare(triggerBtn) {
    let content = getContent();
    if (content === null) return;

    triggerBtn.classList.add('btn-loading');
    triggerBtn.disabled = true;

    // Helper timeout wrapper to aggressively catch hanging promises
    const withTimeout = (promise, ms, name) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(name + ' timed out after ' + ms + 'ms')), ms);
        promise.then(val => { clearTimeout(timer); resolve(val); })
               .catch(err => { clearTimeout(timer); reject(err); });
      });
    };

    try {
      const code = await withTimeout(generateUniqueCode(6), 10000, 'generateUniqueCode');
      
      // Handle custom expiry
      const expiryVal = expirySelect ? expirySelect.value : '20';
      const isBurnAfterReading = expiryVal === 'burn';
      let expiryMinutes = 20;
      if (!isBurnAfterReading) {
        expiryMinutes = parseInt(expiryVal) || 20;
      } else {
        expiryMinutes = 1440; // 24h fallback safety expiry for unread burn notes
      }
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Handle password protection
      const rawPassword = sharePasswordInput ? sharePasswordInput.value.trim() : '';
      let passwordHash = null;
      let isProtected = false;
      if (rawPassword) {
        passwordHash = await hashPassword(rawPassword);
        isProtected = true;
      }

      if (selectedType === 'image') {
        content = await withTimeout(uploadImage(code), 15000, 'Image compression');
      }

      // Capture title & category (visible to all users via noteMeta or global fields)
      const titleEl = document.getElementById('noteTitle');
      const categoryEl = document.getElementById('noteCategory');
      const shareTitle = (titleEl ? titleEl.value.trim() : '') || '';
      const shareCategory = (categoryEl ? categoryEl.value : '') || '';

      const shareData = {
        type: selectedType,
        content: content,
        title: shareTitle,
        category: shareCategory,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
        burnAfterReading: isBurnAfterReading,
        isProtected: isProtected,
        passwordHash: passwordHash,
        userId: null
      };

      const currentUser = getCurrentUser();
      if (currentUser) shareData.userId = currentUser.username;

      await withTimeout(db.collection('shares').doc(code).set(shareData), 10000, 'Firestore Write');

      // Add to user's history if logged in
      if (currentUser) {
        const title = noteTitle ? noteTitle.value.trim() : '';
        await db.collection('users').doc(currentUser.username)
          .collection('history').doc(code)
          .set({
            type: selectedType,
            preview: title || (selectedType === 'image' ? '🖼️ Image' : (Array.isArray(content) ? content.join(', ') : content).substring(0, 100)),
            code: code,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
      }

      displayCode(code, { isBurnAfterReading, expiryMinutes, isProtected, title: shareTitle, category: shareCategory });
      showToast(isBurnAfterReading ? 'Shared! 🔥 Self-destructs after 1st read' : `Shared! Auto-erases in ${expiryMinutes >= 60 ? (expiryMinutes / 60) + 'h' : expiryMinutes + 'm'} ⏱️`, 'success');
      resetShareForm();

      // Guest milestone nudge — fires 2.5s after share to not collide with success toast
      if (!getCurrentUser() && typeof window.showGuestMilestoneToast === 'function') {
        setTimeout(() => window.showGuestMilestoneToast('note_shared'), 2500);
      }

    } catch (error) {
      console.error('Share error:', error);
      showToast('Failed to share. Check your connection.', 'error');
    } finally {
      triggerBtn.classList.remove('btn-loading');
      triggerBtn.disabled = false;
    }
  }

  // ----- Save Button — open folder-picker modal -----
  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    let content = getContent();
    if (content === null) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
      showToast('Please log in to save notes', 'warning');
      return;
    }

    // If image, compress first (needed for preview in modal title)
    let resolvedContent = content;
    if (selectedType === 'image') {
      saveBtn.classList.add('btn-loading');
      saveBtn.disabled = true;
      try {
        resolvedContent = await uploadImage('preview');
      } catch(e) {
        showToast('Image processing failed', 'error');
      } finally {
        saveBtn.classList.remove('btn-loading');
        saveBtn.disabled = false;
      }
    }

    const noteTitle = document.getElementById('noteTitle');
    const noteCategory = document.getElementById('noteCategory');
    const title = noteTitle ? noteTitle.value.trim() : '';
    const category = noteCategory ? noteCategory.value : '';

    // Open folder picker modal, then on confirm do the actual save
    openSaveFolderModal({
      noteType: selectedType,
      content: resolvedContent,
      title: title,
      category: category,
      username: currentUser.username,
      onConfirm: async (folderId, folderName) => {
        saveBtn.classList.add('btn-loading');
        saveBtn.disabled = true;
        try {
          const noteId = generateCode(8);
          const preview = title || (selectedType === 'image' ? '🖼️ Image' : (Array.isArray(resolvedContent) ? resolvedContent.join(', ') : resolvedContent).substring(0, 100));

          // Save to File Manager (users/{u}/files)
          if (typeof window.saveNoteToFileManager === 'function') {
            await window.saveNoteToFileManager({ title, category, noteType: selectedType, content: resolvedContent }, folderId);
          }

          // Also save to savedNotes (backward compat for Saved tab)
          await db.collection('users').doc(currentUser.username)
            .collection('savedNotes').doc(noteId)
            .set({ type: selectedType, content: resolvedContent, title, category, preview, noteId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });

          // History entry
          await db.collection('users').doc(currentUser.username)
            .collection('history').doc(noteId)
            .set({ type: selectedType, preview, code: noteId, saved: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });

          const dest = folderName ? `"${folderName}"` : 'My Files';
          showToast(`Note saved to ${dest}! 📁`, 'success');
          resetShareForm();
          if (typeof window.refreshHistory === 'function') window.refreshHistory();
        } catch (error) {
          console.error('Save error:', error);
          showToast('Failed to save note.', 'error');
        } finally {
          saveBtn.classList.remove('btn-loading');
          saveBtn.disabled = false;
        }
      }
    });
  });

  // ----- Folder Picker Modal logic -----
  function openSaveFolderModal({ noteType, title, onConfirm }) {
    const modal = document.getElementById('saveFolderModal');
    if (!modal) {
      onConfirm(null, null);
      return;
    }

    const list = document.getElementById('saveFolderList');
    const newFolderInput = document.getElementById('saveFolderNewName');
    const newFolderRow = document.getElementById('saveFolderNewRow');
    const addFolderBtn = document.getElementById('saveFolderAddBtn');
    const confirmBtn = document.getElementById('saveFolderConfirmBtn');
    const cancelBtn = document.getElementById('saveFolderCancelBtn');
    const backdrop = document.getElementById('saveFolderBackdrop');
    const notePreview = document.getElementById('saveFolderNotePreview');
    const typeIconEl = document.getElementById('saveFolderTypeIcon');

    if (notePreview) notePreview.textContent = title || `Untitled ${noteType}`;
    if (typeIconEl) {
      const icons = { text: 'edit_note', link: 'link', image: 'image' };
      typeIconEl.textContent = icons[noteType] || 'description';
    }

    const folders = (typeof window.getFolderList === 'function') ? window.getFolderList() : [];
    list.innerHTML = '';
    let selectedFolderId = null;
    let selectedFolderName = null;

    function buildFolderItem(id, name, depth, icon) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'sfm-folder-item';
      item.style.paddingLeft = (16 + depth * 18) + 'px';
      item.dataset.fid = id || '';
      item.dataset.fname = name;
      item.innerHTML = `<span class="material-symbols-outlined sfm-folder-icon">${icon || 'folder'}</span><span>${escSFM(name)}</span>`;
      item.addEventListener('click', () => {
        list.querySelectorAll('.sfm-folder-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedFolderId = id || null;
        selectedFolderName = id ? name : null;
      });
      list.appendChild(item);
    }

    function buildLevel(parentId, depth) {
      folders.filter(f => (f.parentId || null) === parentId).forEach(f => {
        buildFolderItem(f.id, f.name, depth, 'folder');
        buildLevel(f.id, depth + 1);
      });
    }

    buildFolderItem(null, 'My Files (Root)', 0, 'home');
    buildLevel(null, 1);

    if (list.firstChild) list.firstChild.classList.add('selected');

    if (newFolderRow) newFolderRow.style.display = 'none';
    if (newFolderInput) newFolderInput.value = '';
    if (addFolderBtn) {
      addFolderBtn.onclick = () => {
        if (newFolderRow) newFolderRow.style.display = newFolderRow.style.display === 'none' ? 'flex' : 'none';
        if (newFolderInput && newFolderRow.style.display !== 'none') setTimeout(() => newFolderInput.focus(), 80);
      };
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('sfm-open'), 10);

    function closeModal() {
      modal.classList.remove('sfm-open');
      setTimeout(() => { modal.style.display = 'none'; }, 280);
    }

    if (cancelBtn) cancelBtn.onclick = closeModal;
    if (backdrop) backdrop.onclick = closeModal;

    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        const newName = newFolderInput ? newFolderInput.value.trim() : '';
        if (newName && newFolderRow && newFolderRow.style.display !== 'none') {
          try {
            if (!window.db || !getCurrentUser()) throw new Error('Not logged in');
            const user = getCurrentUser();
            const ref = await db.collection('users').doc(user.username).collection('folders').add({
              name: newName,
              parentId: null,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            selectedFolderId = ref.id;
            selectedFolderName = newName;
          } catch(e) {
            showToast('Could not create folder: ' + e.message, 'error');
            return;
          }
        }
        closeModal();
        onConfirm(selectedFolderId, selectedFolderName);
      };
    }

    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }

  function escSFM(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ----- Display Code -----
  function displayCode(code, options = {}) {
    hideEl('shareForm');
    setElText('codeValue', code);
    
    // Expiry description
    if (options.isBurnAfterReading) {
      setElText('codeExpiry', '🔥 Self-destructs immediately after recipient views it once');
    } else {
      const minutes = options.expiryMinutes || 20;
      const formattedTime = minutes >= 1440 ? `${minutes / 1440} day(s)` : (minutes >= 60 ? `${minutes / 60} hour(s)` : `${minutes} minutes`);
      setElText('codeExpiry', `Auto-erases in ${formattedTime}`);
    }

    // Password badge
    const pwdBadge = document.getElementById('codePasswordBadge');
    if (pwdBadge) {
      pwdBadge.style.display = options.isProtected ? 'inline-flex' : 'none';
    }

    // Title & Category badge on code display
    const codeTitleBadge = document.getElementById('codeTitleBadge');
    const codeCategoryBadge = document.getElementById('codeCategoryBadge');
    if (codeTitleBadge) {
      const titleTextSpan = codeTitleBadge.querySelector('span:last-child');
      if (options.title) {
        if (titleTextSpan) titleTextSpan.textContent = options.title;
        codeTitleBadge.style.display = 'inline-flex';
      } else {
        codeTitleBadge.style.display = 'none';
      }
    }
    if (codeCategoryBadge) {
      const catMap = { personal: '📝 Personal', work: '💼 Work', ideas: '💡 Ideas', code: '🖥️ Code', links: '🔗 Links', important: '⭐ Important' };
      if (options.category && catMap[options.category]) {
        codeCategoryBadge.textContent = catMap[options.category];
        codeCategoryBadge.style.display = 'inline-flex';
      } else {
        codeCategoryBadge.style.display = 'none';
      }
    }

    // Direct Link & QR Code
    const directUrl = `${window.location.origin}${window.location.pathname}?code=${code}`;
    
    // Setup QR Code
    if (shareQrCanvas && typeof QRCode !== 'undefined') {
      shareQrCanvas.innerHTML = '';
      try {
        qrCodeInstance = new QRCode(shareQrCanvas, {
          text: directUrl,
          width: 140,
          height: 140,
          colorDark: "#516070",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (err) {
        console.warn('QR Code generation notice:', err);
      }
    }

    if (shareQrContainer) shareQrContainer.style.display = 'none';

    showEl('codeDisplay');
  }

  // ----- QR Code Toggle -----
  if (codeQrToggleBtn && shareQrContainer) {
    codeQrToggleBtn.addEventListener('click', () => {
      const isVisible = shareQrContainer.style.display !== 'none';
      shareQrContainer.style.display = isVisible ? 'none' : 'flex';
      codeQrToggleBtn.classList.toggle('bg-primary', !isVisible);
      codeQrToggleBtn.classList.toggle('text-on-primary', !isVisible);
    });
  }

  // ----- Copy Direct Link -----
  if (codeCopyLinkBtn) {
    codeCopyLinkBtn.addEventListener('click', async () => {
      const valEl = document.getElementById('codeValue');
      const code = valEl ? valEl.textContent : '';
      if (!code) return;
      const directUrl = `${window.location.origin}${window.location.pathname}?code=${code}`;
      const success = await copyToClipboard(directUrl);
      if (success) {
        setElText('codeCopyLinkText', 'Link Copied!');
        showToast('Direct note link copied to clipboard!', 'success');
        setTimeout(() => {
          setElText('codeCopyLinkText', 'Copy Link');
        }, 2000);
      }
    });
  }

  // ----- Copy Code -----
  codeCopyBtn.addEventListener('click', async () => {
    const valEl = document.getElementById('codeValue');
    const code = valEl ? valEl.textContent : '';
    const success = await copyToClipboard(code);
    if (success) {
      setElText('codeCopyText', 'Copied!');
      showToast('Code copied to clipboard!', 'success');
      setTimeout(() => {
        setElText('codeCopyText', 'Copy Code');
      }, 2000);
    }
  });

  // ----- Reset Form -----
  function resetShareForm() {
    if (typeof clearEditor === 'function') clearEditor();
    const linkContainer = document.getElementById('linkInputsContainer');
    if (linkContainer) {
      linkContainer.innerHTML = `
        <div class="flex items-center gap-3 p-4 bg-surface-container-low rounded-2xl link-input-row">
          <span class="material-symbols-outlined text-primary/40 text-lg">link</span>
          <input type="url" class="flex-1 border-none rounded-md focus:ring-0 font-body text-base placeholder:text-outline-variant/40 outline-none shareLinkInput" placeholder="https://example.com" />
          <button class="remove-link-btn text-error/50 hover:text-error transition-colors hidden" type="button" aria-label="Remove link">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      `;
    }
    if (noteTitle) noteTitle.value = '';
    if (noteCategory) noteCategory.value = '';
    if (sharePasswordInput) sharePasswordInput.value = '';
    if (sharePasswordRow) sharePasswordRow.style.display = 'none';
    if (toggleSharePasswordLabel) toggleSharePasswordLabel.textContent = 'Add Password';
    if (toggleSharePasswordBtn) toggleSharePasswordBtn.classList.remove('text-primary', 'bg-primary/10', 'border-primary/30');
    if (expirySelect) expirySelect.value = '20';
    if (expiryBadgeText) expiryBadgeText.innerHTML = 'Auto-erases in <strong>20 min</strong>';
    selectedFile = null;
    fileInput.value = '';
    hideEl('imagePreview');
    dropzone.style.display = '';
  }

  function toggleDataHidden(id, hide) {
    const el = document.getElementById(id);
    if (!el) return;
    if (hide) el.setAttribute('data-hidden', 'true');
    else el.removeAttribute('data-hidden');
  }

  // Expose folder picker modal for other modules
  window.openSaveFolderModal = openSaveFolderModal;
}
