// ============================================================
// Auth Module — The Tactile Editorial
// Account dashboard with Recent History, Saved Notes, Settings.
// ============================================================

function initAuth() {
  const pinBoxes = document.querySelectorAll('.pin-box');
  const authBtn = document.getElementById('authBtn');
  const authToggleLink = document.getElementById('authToggleLink');
  const logoutBtn = document.getElementById('logoutBtn');

  let authMode = 'login';

  // ----- PIN Input Auto-advance -----
  pinBoxes.forEach((box, index) => {
    box.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      if (e.target.value && index < pinBoxes.length - 1) {
        pinBoxes[index + 1].focus();
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && index > 0) {
        pinBoxes[index - 1].focus();
        pinBoxes[index - 1].value = '';
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '');
      for (let i = 0; i < Math.min(pasted.length, 4); i++) {
        pinBoxes[i].value = pasted[i];
      }
      pinBoxes[Math.min(pasted.length, 3)].focus();
    });
  });

  function getPIN() {
    return Array.from(pinBoxes).map(b => b.value).join('');
  }

  // ----- Setup PIN auto-advance for change-PIN boxes -----
  function setupPinGroupAutoAdvance(groupId) {
    const boxes = document.querySelectorAll(`#${groupId} .pin-change-box`);
    boxes.forEach((box, index) => {
      box.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
        if (e.target.value && index < boxes.length - 1) {
          boxes[index + 1].focus();
        }
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && index > 0) {
          boxes[index - 1].focus();
          boxes[index - 1].value = '';
        }
      });
    });
  }
  setupPinGroupAutoAdvance('currentPinGroup');
  setupPinGroupAutoAdvance('newPinGroup');

  // ----- Toggle Login/Register -----
  authToggleLink.addEventListener('click', () => {
    if (authMode === 'login') {
      authMode = 'register';
      document.getElementById('authTitle').textContent = 'Create Account';
      document.getElementById('authSubtitle').textContent = 'Choose a username and 4-digit PIN to create your account.';
      document.getElementById('authBtnText').textContent = 'Register';
      authToggleLink.textContent = 'Login';
      authToggleLink.previousElementSibling.textContent = 'Already have an account?';
    } else {
      authMode = 'login';
      document.getElementById('authTitle').textContent = 'Login';
      document.getElementById('authSubtitle').textContent = 'Enter your username and 4-digit PIN to access your account.';
      document.getElementById('authBtnText').textContent = 'Login';
      authToggleLink.textContent = 'Register';
      authToggleLink.previousElementSibling.textContent = "Don't have an account?";
    }
  });

  // ----- Auth Button -----
  authBtn.addEventListener('click', async () => {
    const username = document.getElementById('authUsername').value.trim().toLowerCase();
    const pin = getPIN();

    if (!username || username.length < 3) {
      showToast('Username must be at least 3 characters', 'warning');
      return;
    }
    if (pin.length !== 4) {
      showToast('Please enter a 4-digit PIN', 'warning');
      return;
    }

    authBtn.classList.add('btn-loading');
    authBtn.disabled = true;

    try {
      const pinHash = await hashString(pin + username);

      if (authMode === 'register') {
        await handleRegister(username, pinHash);
      } else {
        await handleLogin(username, pinHash);
      }
    } catch (error) {
      console.error('Auth error:', error);
      showToast('Authentication failed.', 'error');
    } finally {
      authBtn.classList.remove('btn-loading');
      authBtn.disabled = false;
    }
  });

  async function handleRegister(username, pinHash) {
    const existing = await db.collection('users').doc(username).get();
    if (existing.exists) {
      showToast('Username already taken.', 'error');
      return;
    }

    await db.collection('users').doc(username).set({
      username: username,
      pinHash: pinHash,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    setCurrentUser({ username });
    showToast('Account created! 🎉', 'success');
    showLoggedInView(username);
    if (typeof window.updateShareButtons === 'function') window.updateShareButtons();
  }

  async function handleLogin(username, pinHash) {
    const userDoc = await db.collection('users').doc(username).get();

    if (!userDoc.exists) {
      showToast('Username not found', 'error');
      return;
    }

    if (userDoc.data().pinHash !== pinHash) {
      showToast('Incorrect PIN', 'error');
      return;
    }

    setCurrentUser({ username });
    showToast(`Welcome back, ${username}!`, 'success');
    showLoggedInView(username);
    if (typeof window.updateShareButtons === 'function') window.updateShareButtons();
  }

  // =========================================================
  // LOGGED-IN DASHBOARD
  // =========================================================

  function showLoggedInView(username) {
    hideEl('authCard');
    showEl('accountView');

    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
    document.getElementById('userName').textContent = username;

    // Update sidebar user info
    const sidebarAvatar = document.getElementById('sidebarUserAvatar');
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarInfo = document.getElementById('sidebarUserInfo');
    const sidebarLinks = document.getElementById('sidebarLoggedInLinks');
    if (sidebarAvatar) sidebarAvatar.textContent = username.charAt(0).toUpperCase();
    if (sidebarName) sidebarName.textContent = username;
    if (sidebarInfo) sidebarInfo.removeAttribute('data-hidden');
    if (sidebarLinks) sidebarLinks.removeAttribute('data-hidden');

    loadUserProfile(username);
    loadHistory(username);
    loadSavedNotes(username);
  }

  // ----- Load User Profile & Stats -----
  async function loadUserProfile(username) {
    try {
      const userDoc = await db.collection('users').doc(username).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data.createdAt) {
          const joinDate = data.createdAt.toDate();
          document.getElementById('userJoinDate').textContent = joinDate.toLocaleDateString('en-US', {
            month: 'short', year: 'numeric'
          });
        }
      }

      // Count shared (history)
      const historySnap = await db.collection('users').doc(username)
        .collection('history').get();
      const sharedCount = historySnap.size;

      // Count saved
      const savedSnap = await db.collection('users').doc(username)
        .collection('savedNotes').get();
      const savedCount = savedSnap.size;

      document.getElementById('statShared').textContent = sharedCount;
      document.getElementById('statSaved').textContent = savedCount;
      document.getElementById('statTotal').textContent = sharedCount + savedCount;

      // Update sidebar saved count badge
      const sidebarBadge = document.getElementById('sidebarSavedCount');
      if (sidebarBadge) sidebarBadge.textContent = savedCount > 0 ? savedCount : '';

    } catch (error) {
      console.warn('Profile load error:', error.message);
    }
  }

  // =========================================================
  // ACCOUNT TABS (Recent / Saved / Settings)
  // =========================================================

  const accountTabs = document.querySelectorAll('.account-tab');
  const accountSections = {
    recent: document.getElementById('sectionRecent'),
    saved: document.getElementById('sectionSaved'),
    settings: document.getElementById('sectionSettings')
  };

  accountTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.accountTab;

      // Update tab styles
      accountTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Toggle sections
      Object.keys(accountSections).forEach(key => {
        accountSections[key].setAttribute('data-account-active', key === target ? 'true' : 'false');
      });
    });
  });

  // =========================================================
  // RECENT HISTORY
  // =========================================================

  async function loadHistory(username) {
    const historyList = document.getElementById('notesHistory');
    const emptyMsg = document.getElementById('notesEmpty');

    try {
      const snapshot = await db.collection('users').doc(username)
        .collection('history')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      if (snapshot.empty) {
        emptyMsg.style.display = '';
        return;
      }

      emptyMsg.style.display = 'none';
      historyList.querySelectorAll('.note-item').forEach(el => el.remove());

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        historyList.appendChild(createHistoryItem(data, doc.id));
      });

    } catch (error) {
      console.error('History load error:', error);
    }
  }

  // Expose refreshHistory globally
  window.refreshHistory = () => {
    const user = getCurrentUser();
    if (user) {
      loadHistory(user.username);
      loadSavedNotes(user.username);
      loadUserProfile(user.username);
    }
  };

  function createHistoryItem(data, docId) {
    const li = document.createElement('li');
    li.className = 'note-item';

    const typeIcons = { text: 'edit_note', link: 'link', image: 'image' };
    const icon = typeIcons[data.type] || 'description';
    const savedBadge = data.saved ? '<span class="note-item-code" style="background:rgba(213,220,251,0.3);color:#575e78;">📌 saved</span>' : '';

    li.innerHTML = `
      <div class="note-item-icon">
        <span class="material-symbols-outlined text-lg">${icon}</span>
      </div>
      <div class="note-item-content">
        <div class="note-item-text">${escapeHTML(data.preview || 'Untitled')}</div>
        <div class="note-item-meta">
          <span class="note-item-code">${data.code || docId}</span>
          ${savedBadge}
          <span>${data.createdAt ? formatTimestamp(data.createdAt) : ''}</span>
        </div>
      </div>
    `;

    li.addEventListener('click', async () => {
      const code = data.code || docId;
      await copyToClipboard(code);
      showToast(`Code ${code} copied!`, 'success');
    });

    return li;
  }

  // Clear History
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (!user) return;

      if (!confirm('Clear all recent history? This cannot be undone.')) return;

      try {
        const snapshot = await db.collection('users').doc(user.username)
          .collection('history').get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        document.getElementById('notesHistory').querySelectorAll('.note-item').forEach(el => el.remove());
        document.getElementById('notesEmpty').style.display = '';
        loadUserProfile(user.username);
        showToast('History cleared', 'success');
      } catch (error) {
        console.error('Clear history error:', error);
        showToast('Failed to clear history', 'error');
      }
    });
  }

  // =========================================================
  // SAVED NOTES
  // =========================================================

  async function loadSavedNotes(username) {
    const list = document.getElementById('savedNotesList');
    const emptyMsg = document.getElementById('savedEmpty');
    const countBadge = document.getElementById('savedCount');

    try {
      const snapshot = await db.collection('users').doc(username)
        .collection('savedNotes')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      if (snapshot.empty) {
        emptyMsg.style.display = '';
        countBadge.textContent = '0 notes';
        list.querySelectorAll('.saved-note-item').forEach(el => el.remove());
        return;
      }

      emptyMsg.style.display = 'none';
      countBadge.textContent = `${snapshot.size} note${snapshot.size !== 1 ? 's' : ''}`;
      list.querySelectorAll('.saved-note-item').forEach(el => el.remove());

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        list.appendChild(createSavedNoteItem(data, doc.id, username));
      });

    } catch (error) {
      console.error('Saved notes load error:', error);
    }
  }

  // Category labels
  const categoryLabels = {
    personal: '📝 Personal',
    work: '💼 Work',
    ideas: '💡 Ideas',
    code: '🖥️ Code',
    links: '🔗 Links',
    important: '⭐ Important'
  };

  function createSavedNoteItem(data, docId, username) {
    const li = document.createElement('li');
    li.className = 'saved-note-item';
    li.setAttribute('data-note-category', data.category || '');

    const typeIcons = { text: 'edit_note', link: 'link', image: 'image' };
    const icon = typeIcons[data.type] || 'description';
    const title = data.title || data.preview || 'Untitled';
    const catLabel = data.category ? categoryLabels[data.category] || '' : '';
    const catBadge = catLabel
      ? `<span class="saved-note-cat-badge">${catLabel}</span>`
      : '';

    // Show a snippet of content below the title
    const snippet = data.content && data.content.length > 80
      ? escapeHTML(data.content.substring(0, 80)) + '…'
      : (data.content ? escapeHTML(data.content) : '');
    const snippetEl = data.type !== 'image' && snippet
      ? `<div class="saved-note-item-snippet">${snippet}</div>`
      : '';

    li.innerHTML = `
      <div class="saved-note-item-icon">
        <span class="material-symbols-outlined text-lg">${icon}</span>
      </div>
      <div class="saved-note-item-content">
        <div class="saved-note-item-text">${escapeHTML(title)}</div>
        ${snippetEl}
        <div class="saved-note-item-meta">
          ${catBadge}
          <span>${data.createdAt ? formatTimestamp(data.createdAt) : ''}</span>
        </div>
      </div>
      <div class="saved-note-item-actions">
        <button class="saved-note-action edit-action" title="Edit note">
          <span class="material-symbols-outlined text-base">edit</span>
        </button>
        <button class="saved-note-action copy-action" title="Copy content">
          <span class="material-symbols-outlined text-base">content_copy</span>
        </button>
        <button class="saved-note-action share-action" title="Share with code">
          <span class="material-symbols-outlined text-base">ios_share</span>
        </button>
        <button class="saved-note-action delete" title="Delete note">
          <span class="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
    `;

    // Edit note
    li.querySelector('.edit-action').addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(data, docId, username);
    });

    // Copy content
    li.querySelector('.copy-action').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (data.content) {
        await copyToClipboard(data.content);
        showToast('Content copied!', 'success');
      }
    });

    // Re-share as temporary code
    li.querySelector('.share-action').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const code = await generateUniqueCode(6);
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

        await db.collection('shares').doc(code).set({
          type: data.type,
          content: data.content,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
          userId: username
        });

        await copyToClipboard(code);
        showToast(`Shared! Code ${code} copied 📋`, 'success');
      } catch (error) {
        console.error('Re-share error:', error);
        showToast('Failed to share', 'error');
      }
    });

    // Delete note
    li.querySelector('.delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this saved note?')) return;
      await deleteNote(docId, username, li);
    });

    // Click entire row to copy content
    li.addEventListener('click', async () => {
      if (data.content) {
        await copyToClipboard(data.content);
        showToast('Content copied!', 'success');
      }
    });

    return li;
  }

  async function deleteNote(docId, username, liElement) {
    try {
      await db.collection('users').doc(username)
        .collection('savedNotes').doc(docId).delete();
      if (liElement) liElement.remove();

      const remaining = document.querySelectorAll('.saved-note-item').length;
      document.getElementById('savedCount').textContent = `${remaining} note${remaining !== 1 ? 's' : ''}`;
      if (remaining === 0) {
        document.getElementById('savedEmpty').style.display = '';
      }
      loadUserProfile(username);
      showToast('Note deleted', 'success');
    } catch (error) {
      console.error('Delete note error:', error);
      showToast('Failed to delete', 'error');
    }
  }

  // =========================================================
  // EDIT NOTE MODAL
  // =========================================================

  function openEditModal(data, docId, username) {
    document.getElementById('editNoteTitle').value = data.title || '';
    document.getElementById('editNoteCategory').value = data.category || '';
    document.getElementById('editNoteContent').value = data.content || '';
    document.getElementById('editNoteId').value = docId;
    showEl('editNoteModal');

    // Scroll to modal
    document.getElementById('editNoteModal').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const saveEditBtn = document.getElementById('saveEditBtn');
  const deleteFromEditBtn = document.getElementById('deleteFromEditBtn');

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      hideEl('editNoteModal');
    });
  }

  if (saveEditBtn) {
    saveEditBtn.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (!user) return;

      const docId = document.getElementById('editNoteId').value;
      const title = document.getElementById('editNoteTitle').value.trim();
      const category = document.getElementById('editNoteCategory').value;
      const content = document.getElementById('editNoteContent').value.trim();

      if (!content) {
        showToast('Content cannot be empty', 'warning');
        return;
      }

      saveEditBtn.classList.add('btn-loading');
      saveEditBtn.disabled = true;

      try {
        const preview = title || content.substring(0, 100);
        await db.collection('users').doc(user.username)
          .collection('savedNotes').doc(docId)
          .update({
            title: title,
            category: category,
            content: content,
            preview: preview
          });

        hideEl('editNoteModal');
        showToast('Note updated! ✏️', 'success');
        loadSavedNotes(user.username);
        loadUserProfile(user.username);
      } catch (error) {
        console.error('Edit note error:', error);
        showToast('Failed to update note', 'error');
      } finally {
        saveEditBtn.classList.remove('btn-loading');
        saveEditBtn.disabled = false;
      }
    });
  }

  if (deleteFromEditBtn) {
    deleteFromEditBtn.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (!user) return;

      const docId = document.getElementById('editNoteId').value;
      if (!confirm('Delete this note permanently?')) return;

      await deleteNote(docId, user.username, null);
      hideEl('editNoteModal');
      loadSavedNotes(user.username);
    });
  }

  // =========================================================
  // CATEGORY FILTER
  // =========================================================

  const catFilterBtns = document.querySelectorAll('.cat-filter-btn');
  catFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      const items = document.querySelectorAll('.saved-note-item');

      items.forEach(item => {
        if (filter === 'all' || item.getAttribute('data-note-category') === filter) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // =========================================================
  // SETTINGS
  // =========================================================

  // Change PIN
  const changePinBtn = document.getElementById('changePinBtn');
  const cancelPinBtn = document.getElementById('cancelPinBtn');
  const savePinBtn = document.getElementById('savePinBtn');

  if (changePinBtn) {
    changePinBtn.addEventListener('click', () => {
      showEl('changePinModal');
    });
  }

  if (cancelPinBtn) {
    cancelPinBtn.addEventListener('click', () => {
      hideEl('changePinModal');
      clearPinGroup('currentPinGroup');
      clearPinGroup('newPinGroup');
    });
  }

  if (savePinBtn) {
    savePinBtn.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (!user) return;

      const currentPin = getPinFromGroup('currentPinGroup');
      const newPin = getPinFromGroup('newPinGroup');

      if (currentPin.length !== 4) {
        showToast('Enter your current 4-digit PIN', 'warning');
        return;
      }
      if (newPin.length !== 4) {
        showToast('Enter a new 4-digit PIN', 'warning');
        return;
      }

      savePinBtn.classList.add('btn-loading');
      savePinBtn.disabled = true;

      try {
        const currentHash = await hashString(currentPin + user.username);
        const userDoc = await db.collection('users').doc(user.username).get();

        if (userDoc.data().pinHash !== currentHash) {
          showToast('Current PIN is incorrect', 'error');
          return;
        }

        const newHash = await hashString(newPin + user.username);
        await db.collection('users').doc(user.username).update({ pinHash: newHash });

        showToast('PIN updated successfully! 🔒', 'success');
        hideEl('changePinModal');
        clearPinGroup('currentPinGroup');
        clearPinGroup('newPinGroup');
      } catch (error) {
        console.error('Change PIN error:', error);
        showToast('Failed to change PIN', 'error');
      } finally {
        savePinBtn.classList.remove('btn-loading');
        savePinBtn.disabled = false;
      }
    });
  }

  function getPinFromGroup(groupId) {
    const boxes = document.querySelectorAll(`#${groupId} .pin-change-box`);
    return Array.from(boxes).map(b => b.value).join('');
  }

  function clearPinGroup(groupId) {
    document.querySelectorAll(`#${groupId} .pin-change-box`).forEach(b => b.value = '');
  }

  // Export Notes
  const exportNotesBtn = document.getElementById('exportNotesBtn');
  if (exportNotesBtn) {
    exportNotesBtn.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (!user) return;

      try {
        const snapshot = await db.collection('users').doc(user.username)
          .collection('savedNotes')
          .orderBy('createdAt', 'desc')
          .get();

        if (snapshot.empty) {
          showToast('No notes to export', 'warning');
          return;
        }

        const notes = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            type: d.type,
            content: d.content,
            preview: d.preview,
            createdAt: d.createdAt ? d.createdAt.toDate().toISOString() : null
          };
        });

        const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `enotpad_notes_${user.username}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Notes exported! 📥', 'success');
      } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export notes', 'error');
      }
    });
  }

  // Delete Account
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (!user) return;

      const confirmText = prompt(`Type "${user.username}" to permanently delete your account:`);
      if (confirmText !== user.username) {
        showToast('Account deletion cancelled', 'warning');
        return;
      }

      try {
        // Delete saved notes
        const savedSnap = await db.collection('users').doc(user.username)
          .collection('savedNotes').get();
        const batch1 = db.batch();
        savedSnap.docs.forEach(doc => batch1.delete(doc.ref));
        await batch1.commit();

        // Delete history
        const historySnap = await db.collection('users').doc(user.username)
          .collection('history').get();
        const batch2 = db.batch();
        historySnap.docs.forEach(doc => batch2.delete(doc.ref));
        await batch2.commit();

        // Delete user doc
        await db.collection('users').doc(user.username).delete();

        // Logout
        setCurrentUser(null);
        showEl('authCard');
        hideEl('accountView');
        hideEl('changePinModal');

        const sidebarInfo = document.getElementById('sidebarUserInfo');
        const sidebarLinks = document.getElementById('sidebarLoggedInLinks');
        if (sidebarInfo) sidebarInfo.setAttribute('data-hidden', 'true');
        if (sidebarLinks) sidebarLinks.setAttribute('data-hidden', 'true');

        document.getElementById('authUsername').value = '';
        pinBoxes.forEach(b => b.value = '');
        if (typeof window.updateShareButtons === 'function') window.updateShareButtons();
        showToast('Account deleted. Goodbye! 👋', 'success');
      } catch (error) {
        console.error('Delete account error:', error);
        showToast('Failed to delete account', 'error');
      }
    });
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  logoutBtn.addEventListener('click', () => {
    setCurrentUser(null);
    showEl('authCard');
    hideEl('accountView');
    hideEl('changePinModal');

    const sidebarInfo = document.getElementById('sidebarUserInfo');
    const sidebarLinks = document.getElementById('sidebarLoggedInLinks');
    if (sidebarInfo) sidebarInfo.setAttribute('data-hidden', 'true');
    if (sidebarLinks) sidebarLinks.setAttribute('data-hidden', 'true');

    document.getElementById('authUsername').value = '';
    pinBoxes.forEach(b => b.value = '');
    showToast('Logged out', 'success');
    if (typeof window.updateShareButtons === 'function') window.updateShareButtons();
  });

  // =========================================================
  // UTILITIES
  // =========================================================

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function checkSession() {
    const user = getCurrentUser();
    if (user) showLoggedInView(user.username);
  }

  checkSession();
}
