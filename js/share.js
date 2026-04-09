// ============================================================
// Share Module — The Tactile Editorial
// Handles content sharing (text/link/image) with 20-min auto-erase.
// Logged in: Save (main) + Share (icon) + Title/Category fields.
// Guest: Share only, no title/category.
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
  const noteMeta = document.getElementById('noteMeta');
  const noteTitle = document.getElementById('noteTitle');
  const noteCategory = document.getElementById('noteCategory');

  // Fixed 20-minute expiry for all shared content
  const EXPIRY_MINUTES = 20;

  let selectedType = 'text';
  let selectedFile = null;

  const addLinkBtn = document.getElementById('addLinkBtn');
  const linkInputsContainer = document.getElementById('linkInputsContainer');

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
      if (noteMeta) noteMeta.removeAttribute('data-hidden');
    } else {
      shareBtn.removeAttribute('data-hidden');
      shareIconBtn.setAttribute('data-hidden', 'true');
      saveBtn.setAttribute('data-hidden', 'true');
      if (noteMeta) noteMeta.setAttribute('data-hidden', 'true');
    }
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
      document.getElementById('imagePreviewImg').src = e.target.result;
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
      const content = document.getElementById('shareTextArea').value.trim();
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
    // Return base64 string directly, bypassing Firebase Storage 
    // This perfectly averts CORS issues for file:// and localhost origins
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
      const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

      if (selectedType === 'image') {
        content = await withTimeout(uploadImage(code), 15000, 'Image compression');
      }

      const shareData = {
        type: selectedType,
        content: content,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
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

      displayCode(code);
      showToast('Shared! Auto-erases in 20 min ⏱️', 'success');
      resetShareForm();

    } catch (error) {
      console.error('Share error:', error);
      showToast('Failed to share. Check your connection.', 'error');
    } finally {
      triggerBtn.classList.remove('btn-loading');
      triggerBtn.disabled = false;
    }
  }

  // ----- Save Button (logged-in: permanent save with title + category) -----
  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    let content = getContent();
    if (content === null) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
      showToast('Please log in to save notes', 'warning');
      return;
    }

    saveBtn.classList.add('btn-loading');
    saveBtn.disabled = true;

    try {
      const noteId = generateCode(8);
      const title = noteTitle ? noteTitle.value.trim() : '';
      const category = noteCategory ? noteCategory.value : '';

      if (selectedType === 'image') content = await uploadImage(noteId);

      const preview = title || (selectedType === 'image' ? '🖼️ Image' : (Array.isArray(content) ? content.join(', ') : content).substring(0, 100));

      await db.collection('users').doc(currentUser.username)
        .collection('savedNotes').doc(noteId)
        .set({
          type: selectedType,
          content: content,
          title: title,
          category: category,
          preview: preview,
          noteId: noteId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      // Add to history
      await db.collection('users').doc(currentUser.username)
        .collection('history').doc(noteId)
        .set({
          type: selectedType,
          preview: preview,
          code: noteId,
          saved: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      showToast('Note saved to your account! 📌', 'success');
      resetShareForm();

      if (typeof window.refreshHistory === 'function') window.refreshHistory();

    } catch (error) {
      console.error('Save error:', error);
      showToast('Failed to save note.', 'error');
    } finally {
      saveBtn.classList.remove('btn-loading');
      saveBtn.disabled = false;
    }
  });

  // ----- Display Code -----
  function displayCode(code) {
    hideEl('shareForm');
    document.getElementById('codeValue').textContent = code;
    document.getElementById('codeExpiry').textContent = `Auto-erases in ${EXPIRY_MINUTES} minutes`;
    showEl('codeDisplay');
  }

  // ----- Copy Code -----
  codeCopyBtn.addEventListener('click', async () => {
    const code = document.getElementById('codeValue').textContent;
    const success = await copyToClipboard(code);
    if (success) {
      document.getElementById('codeCopyText').textContent = 'Copied!';
      showToast('Code copied to clipboard!', 'success');
      setTimeout(() => {
        document.getElementById('codeCopyText').textContent = 'Copy Code';
      }, 2000);
    }
  });

  // ----- Reset Form -----
  function resetShareForm() {
    document.getElementById('shareTextArea').value = '';
    const linkContainer = document.getElementById('linkInputsContainer');
    if (linkContainer) {
      linkContainer.innerHTML = `
        <div class="flex items-center gap-3 p-4 bg-surface-dim/30 rounded-xl link-input-row">
          <span class="material-symbols-outlined text-primary/40">link</span>
          <input type="url" class="flex-1 bg-transparent border-none focus:ring-0 font-body text-lg text-on-surface placeholder:text-outline-variant/40 shareLinkInput" placeholder="https://example.com" />
          <button class="remove-link-btn text-error/60 hover:text-error transition-colors hidden" type="button" aria-label="Remove link">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      `;
    }
    if (noteTitle) noteTitle.value = '';
    if (noteCategory) noteCategory.value = '';
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
}
