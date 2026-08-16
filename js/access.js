// ============================================================
// Access Module — The Tactile Editorial
// Uses data-hidden attribute for toggling visibility.
// ============================================================

function initAccess() {
  const codeBoxes = document.querySelectorAll('.code-input-box');
  const fetchBtn = document.getElementById('fetchBtn');
  const contentCopyBtn = document.getElementById('contentCopyBtn');

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

  fetchBtn.addEventListener('click', fetchContent);

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

    try {
      const doc = await db.collection('shares').doc(code).get();

      if (!doc.exists) {
        showStatus('😕', 'No content found for this code. It may have expired or the code is incorrect.', 'error');
        return;
      }

      const data = doc.data();

      if (data.expiresAt && isExpired(data.expiresAt)) {
        await db.collection('shares').doc(code).delete();
        showStatus('⏰', 'This content has expired and is no longer available.', 'expired');
        return;
      }

      renderContent(data);
      showToast('Content retrieved!', 'success');

    } catch (error) {
      console.error('Fetch error:', error);
      showToast('Failed to fetch content.', 'error');
    } finally {
      fetchBtn.classList.remove('btn-loading');
      fetchBtn.disabled = false;
    }
  }

  const contentSaveBtn = document.getElementById('contentSaveBtn');

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
      textDiv.className = 'content-text-display';
      textDiv.textContent = data.content;
      contentBody.appendChild(textDiv);
      copyBtn.style.display = '';

    } else if (data.type === 'link') {
      const links = Array.isArray(data.content) ? data.content : [data.content];
      const linkContainer = document.createElement('div');
      linkContainer.className = 'flex flex-col gap-3';
      
      links.forEach(link => {
        const linkEl = document.createElement('a');
        linkEl.className = 'content-link-display';
        linkEl.href = link;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
        linkEl.innerHTML = `<span class="material-symbols-outlined">open_in_new</span> <span class="break-all">${link}</span>`;
        linkContainer.appendChild(linkEl);
      });
      contentBody.appendChild(linkContainer);
      copyBtn.style.display = '';
      
      data.content = links.join('\n');

    } else if (data.type === 'image') {
      const imageDiv = document.createElement('div');
      imageDiv.className = 'content-image-display';
      imageDiv.innerHTML = `
        <img src="${data.content}" alt="Shared image" class="w-full max-h-[400px] object-contain rounded-xl" />
        <a class="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-full text-sm font-medium text-primary hover:bg-surface-container-low transition-all" href="${data.content}" target="_blank" download>
          <span class="material-symbols-outlined text-lg">download</span> Download Image
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

  if (contentCopyBtn) {
    contentCopyBtn.addEventListener('click', async () => {
      const resultContainer = document.getElementById('contentResult');
      const content = resultContainer.dataset.content;
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
      const title = resultContainer.dataset.title || `Accessed Note`;

      const doSave = async (folderId, folderName) => {
        contentSaveBtn.disabled = true;
        contentSaveBtn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span> Saving…';

        try {
          const noteId = generateCode(8);
          let resolvedContent = content;
          try { resolvedContent = JSON.parse(content); } catch (e) {}

          const preview = title || (type === 'image' ? '🖼️ Image' : (Array.isArray(resolvedContent) ? resolvedContent.join(', ') : resolvedContent).substring(0, 100));

          // 1. Save to File Manager (users/{u}/files)
          if (typeof window.saveNoteToFileManager === 'function') {
            await window.saveNoteToFileManager({
              title: title,
              category: 'important',
              noteType: type,
              content: resolvedContent
            }, folderId);
          }

          // 2. Save to savedNotes
          await db.collection('users').doc(currentUser.username)
            .collection('savedNotes').doc(noteId)
            .set({
              type: type,
              content: resolvedContent,
              title: title,
              category: 'important',
              preview: preview,
              noteId: noteId,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

          // 3. Save to history
          await db.collection('users').doc(currentUser.username)
            .collection('history').doc(noteId)
            .set({
              type: type,
              preview: preview,
              code: noteId,
              saved: true,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

          contentSaveBtn.innerHTML = '<span class="material-symbols-outlined text-lg">bookmark_added</span> Saved!';
          const dest = folderName ? `"${folderName}"` : 'My Files';
          showToast(`Note saved to ${dest}! 📁`, 'success');

          if (typeof window.loadSavedNotes === 'function') window.loadSavedNotes(currentUser.username);
          if (typeof window.fileManagerRefresh === 'function') window.fileManagerRefresh(currentUser.username);
        } catch (err) {
          console.error('Save accessed note error:', err);
          showToast('Failed to save note.', 'error');
          contentSaveBtn.disabled = false;
          contentSaveBtn.innerHTML = '<span class="material-symbols-outlined text-lg">bookmark_add</span> Save Note';
        }
      };

      if (typeof window.openSaveFolderModal === 'function') {
        window.openSaveFolderModal({
          noteType: type,
          title: title,
          onConfirm: doSave
        });
      } else {
        await doSave(null, null);
      }
    });
  }

  function showStatus(icon, text, type) {
    setElText('accessStatusIcon', icon);
    setElText('accessStatusText', text);
    const statusEl = document.getElementById('accessStatus');
    if (statusEl) {
      statusEl.className = `p-6 md:p-8 text-center status-${type}`;
    }
    showEl('accessStatus');
  }
}
