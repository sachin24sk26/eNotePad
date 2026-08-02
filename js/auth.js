// ============================================================
// Auth Module — The Tactile Editorial
// Account dashboard with Recent History, Saved Notes, Settings.
// ============================================================

function initAuth() {
  const authBtn = document.getElementById('authBtn');
  const authToggleLink = document.getElementById('authToggleLink');
  const googleAuthBtn = document.getElementById('googleAuthBtn');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const usernameInput = document.getElementById('authUsername');
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const usernameStatus = document.getElementById('usernameStatus');
  const usernameIcon = document.getElementById('usernameIcon');

  let authMode = 'login';
  let isUsernameAvailable = false;

  // Admin email — this account always gets admin role
  const ADMIN_EMAIL = '24sk26sachin@gmail.com';

  // ----- Auth State Observer -----
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      console.log('Auth state: signed in as', user.email);
      let userProfile = await fetchUserProfileByUid(user.uid);

      // Auto-provision: if admin email has no doc, create it
      if (!userProfile && user.email === ADMIN_EMAIL) {
        console.log('Admin profile missing — auto-creating...');
        await db.collection('users').doc('sachin24sk26').set({
          username: 'sachin24sk26',
          uid: user.uid,
          role: 'admin',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        userProfile = { username: 'sachin24sk26', uid: user.uid, role: 'admin' };
      }

      if (userProfile) {
        // Always enforce admin role for the admin email
        let isAdmin = userProfile.role === 'admin';
        if (!isAdmin && user.email === ADMIN_EMAIL) {
          console.log('Admin email detected — patching role in Firestore...');
          await db.collection('users').doc(userProfile.username).update({ role: 'admin' });
          isAdmin = true;
          userProfile.role = 'admin';
        }

        console.log('User profile loaded:', userProfile.username, '| isAdmin:', isAdmin);
        setCurrentUser({ username: userProfile.username, email: user.email, uid: user.uid, role: userProfile.role });
        showLoggedInView(userProfile.username, isAdmin);
      } else if (authMode !== 'register') {
        console.warn('User authenticated but no Firestore profile found for uid:', user.uid);
        // Don't call showLoggedOutView here — user is still authenticated, just missing a profile
      }
    } else {
      // User is signed out
      setCurrentUser(null);
      showLoggedOutView();
    }
  });

  async function fetchUserProfileByUid(uid) {
    try {
      const snapshot = await db.collection('users').where('uid', '==', uid).limit(1).get();
      if (!snapshot.empty) {
        return snapshot.docs[0].data();
      }
    } catch (e) {
      console.error('fetchUserProfileByUid error:', e);
    }
    return null;
  }

  // ----- Username Availability Check -----
  const checkUsername = debounce(async (username) => {
    if (username.length < 3) {
      updateUsernameUI(null);
      return;
    }

    usernameStatus.classList.remove('hidden');
    usernameStatus.textContent = 'Checking...';
    usernameStatus.className = 'text-[10px] font-bold uppercase tracking-tight text-primary/40';

    try {
      const doc = await db.collection('users').doc(username).get();
      if (doc.exists) {
        isUsernameAvailable = false;
        updateUsernameUI('taken');
      } else {
        isUsernameAvailable = true;
        updateUsernameUI('available');
      }
    } catch (error) {
      console.error('Username check error:', error);
      updateUsernameUI(null);
    }
  }, 500);

  function updateUsernameUI(state) {
    usernameIcon.classList.remove('hidden');
    const iconSpan = usernameIcon.querySelector('span');
    
    if (state === 'available') {
      usernameStatus.textContent = 'Available';
      usernameStatus.className = 'text-[10px] font-bold uppercase tracking-tight text-success';
      iconSpan.textContent = 'check_circle';
      iconSpan.className = 'material-symbols-outlined text-sm text-success';
    } else if (state === 'taken') {
      usernameStatus.textContent = 'Taken';
      usernameStatus.className = 'text-[10px] font-bold uppercase tracking-tight text-error';
      iconSpan.textContent = 'cancel';
      iconSpan.className = 'material-symbols-outlined text-sm text-error';
    } else {
      usernameStatus.classList.add('hidden');
      usernameIcon.classList.add('hidden');
    }
  }

  usernameInput.addEventListener('input', (e) => {
    if (authMode === 'register') {
      const username = e.target.value.trim().toLowerCase();
      checkUsername(username);
    }
  });

  // ----- Toggle Login/Register -----
  authToggleLink.addEventListener('click', () => {
    if (authMode === 'login') {
      authMode = 'register';
      document.getElementById('authTitle').textContent = 'Create Account';
      document.getElementById('authSubtitle').textContent = 'Join the digital curation movement.';
      document.getElementById('authBtnText').textContent = 'Register';
      document.getElementById('authTogglePrefix').textContent = 'Already have an account?';
      authToggleLink.textContent = 'Login';
      // Show username field
      document.getElementById('usernameFieldGroup').classList.remove('hidden');
    } else {
      authMode = 'login';
      document.getElementById('authTitle').textContent = 'Welcome Back';
      document.getElementById('authSubtitle').textContent = 'Access your digital editorial desk.';
      document.getElementById('authBtnText').textContent = 'Login';
      document.getElementById('authTogglePrefix').textContent = "Don't have an account?";
      authToggleLink.textContent = 'Register';
      // Hide username field (login by email)
      document.getElementById('usernameFieldGroup').classList.add('hidden');
      updateUsernameUI(null);
    }
  });

  // Set initial state
  document.getElementById('usernameFieldGroup').classList.add('hidden');

  // ----- Auth Button -----
  authBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const username = usernameInput.value.trim().toLowerCase();

    if (!email || !password) {
      showToast('Please fill in all fields', 'warning');
      return;
    }

    if (authMode === 'register') {
      if (username.length < 3) {
        showToast('Username too short', 'warning');
        return;
      }
      if (!isUsernameAvailable) {
        showToast('Please choose an available username', 'warning');
        return;
      }
    }

    authBtn.classList.add('btn-loading');
    authBtn.disabled = true;

    try {
      if (authMode === 'register') {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(username).set({
          username: username,
          uid: userCredential.user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Welcome to eNotePad! 🎉', 'success');
      } else {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        showToast('Successfully logged in!', 'success');
      }
    } catch (error) {
      console.error('Auth error:', error);
      showToast(error.message, 'error');
    } finally {
      authBtn.classList.remove('btn-loading');
      authBtn.disabled = false;
    }
  });

  // ----- Google Sign-In -----
  googleAuthBtn.addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      
      // Check if user already has a username
      const userProfile = await fetchUserProfileByUid(user.uid);
      if (!userProfile) {
        // If new Google user, we need to prompt for a username
        // Simplified: generate one from email or name
        const baseName = (user.displayName || user.email.split('@')[0]).replace(/\s+/g, '').toLowerCase().substring(0, 15);
        let finalUsername = baseName;
        let suffix = 1;
        
        // Ensure uniqueness
        while ((await db.collection('users').doc(finalUsername).get()).exists) {
          finalUsername = baseName + suffix;
          suffix++;
        }

        await db.collection('users').doc(finalUsername).set({
          username: finalUsername,
          uid: user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(`Welcome, ${finalUsername}!`, 'success');
      }
    } catch (error) {
      console.error('Google Auth error:', error);
      showToast('Google login failed', 'error');
    }
  });

  // ----- Forgot Password -----
  forgotPasswordBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) {
      showToast('Enter your email first', 'warning');
      return;
    }
    
    try {
      await firebase.auth().sendPasswordResetEmail(email);
      showToast('Password reset link sent to your email!', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  // ----- Logout -----
  logoutBtn.addEventListener('click', async () => {
    try {
      await firebase.auth().signOut();
      showToast('Logged out successfully', 'success');
    } catch (error) {
      showToast('Logout failed', 'error');
    }
  });

  // =========================================================
  // UI MANAGEMENT
  // =========================================================

  function showLoggedInView(username, isAdmin = false) {
    // Use data-hidden attribute (not CSS class) since CSS uses [data-hidden="true"] selector
    document.getElementById('authCard').setAttribute('data-hidden', 'true');
    document.getElementById('accountView').removeAttribute('data-hidden');

    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
    document.getElementById('userName').textContent = username;

    // Update sidebar user info
    const sidebarAvatar = document.getElementById('sidebarUserAvatar');
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarInfo = document.getElementById('sidebarUserInfo');
    const sidebarLinks = document.getElementById('sidebarLoggedInLinks');
    const sidebarAdmin = document.getElementById('sidebarAdmin');

    if (sidebarAvatar) sidebarAvatar.textContent = username.charAt(0).toUpperCase();
    if (sidebarName) sidebarName.textContent = username;
    if (sidebarInfo) sidebarInfo.removeAttribute('data-hidden');
    if (sidebarLinks) sidebarLinks.removeAttribute('data-hidden');

    // Update Profile Card Badge
    const roleContainer = document.getElementById('userRoleContainer');
    const roleText = document.getElementById('userRoleText');
    const sidebarRole = document.getElementById('sidebarUserRole');

    if (isAdmin) {
      if (roleContainer) {
        roleContainer.classList.add('text-error', 'font-bold');
      }
      if (roleText) {
        roleText.textContent = 'System Administrator';
      }
      if (sidebarRole) {
        sidebarRole.textContent = 'System Administrator';
        sidebarRole.classList.add('text-error', 'font-bold');
      }
    }

    if (isAdmin && sidebarAdmin) {
      sidebarAdmin.style.display = 'flex';
    }

    loadUserProfile(username);
    loadHistory(username);
    loadSavedNotes(username);

    // Refresh file manager for the logged-in user
    if (typeof window.fileManagerRefresh === 'function') {
      window.fileManagerRefresh(username);
    }

    // Initialize Admin Features if admin
    if (isAdmin && typeof initAdmin === 'function') {
      initAdmin();
    }
  }

  function showLoggedOutView() {
    // Use data-hidden attribute (not CSS class) since CSS uses [data-hidden="true"] selector
    document.getElementById('authCard').removeAttribute('data-hidden');
    document.getElementById('accountView').setAttribute('data-hidden', 'true');

    const sidebarInfo = document.getElementById('sidebarUserInfo');
    const sidebarLinks = document.getElementById('sidebarLoggedInLinks');
    const sidebarAdmin = document.getElementById('sidebarAdmin');

    if (sidebarInfo) sidebarInfo.setAttribute('data-hidden', 'true');
    if (sidebarLinks) sidebarLinks.setAttribute('data-hidden', 'true');
    if (sidebarAdmin) {
      sidebarAdmin.style.display = 'none';
    }

    // Stop file manager listeners
    if (typeof window.fileManagerRefresh === 'function') {
      window.fileManagerRefresh(null);
    }

    // Reset fields
    emailInput.value = '';
    passwordInput.value = '';
    usernameInput.value = '';
    updateUsernameUI(null);
  }

  // ----- Profile & Data Loaders -----
  async function loadUserProfile(username) {
    try {
      const userDoc = await db.collection('users').doc(username).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data.createdAt) {
          const joinDate = data.createdAt.toDate();
          const joinDateEl = document.getElementById('userJoinDate');
          if (joinDateEl) {
            joinDateEl.textContent = joinDate.toLocaleDateString('en-US', {
              month: 'short', year: 'numeric'
            });
          }
        }
      }

      const historySnap = await db.collection('users').doc(username).collection('history').get();
      const savedSnap = await db.collection('users').doc(username).collection('savedNotes').get();

      const statShared = document.getElementById('statShared');
      const statSaved = document.getElementById('statSaved');
      const statTotal = document.getElementById('statTotal');

      if (statShared) statShared.textContent = historySnap.size;
      if (statSaved) statSaved.textContent = savedSnap.size;
      if (statTotal) statTotal.textContent = historySnap.size + savedSnap.size;

      const sidebarBadge = document.getElementById('sidebarSavedCount');
      if (sidebarBadge) sidebarBadge.textContent = savedSnap.size > 0 ? savedSnap.size : '';
    } catch (e) { console.warn('Stats load error:', e.message); }
  }

  async function loadHistory(username) {
    const list = document.getElementById('notesHistory');
    const empty = document.getElementById('notesEmpty');
    try {
      const snap = await db.collection('users').doc(username).collection('history').orderBy('createdAt', 'desc').limit(50).get();
      if (snap.empty) { empty.style.display = ''; return; }
      empty.style.display = 'none';
      list.querySelectorAll('.note-item').forEach(el => el.remove());
      snap.docs.forEach(doc => list.appendChild(createHistoryItem(doc.data(), doc.id)));
    } catch (e) { console.error('History load error:', e); }
  }

  async function loadSavedNotes(username) {
    const list = document.getElementById('savedNotesList');
    const empty = document.getElementById('savedEmpty');
    const badge = document.getElementById('savedCount');
    try {
      const snap = await db.collection('users').doc(username).collection('savedNotes').orderBy('createdAt', 'desc').get();
      if (snap.empty) { 
        if (empty) empty.style.display = ''; 
        if (badge) badge.textContent = '0 notes'; 
        return; 
      }
      if (empty) empty.style.display = 'none';
      if (badge) badge.textContent = `${snap.size} note${snap.size !== 1 ? 's' : ''}`;
      list.querySelectorAll('.saved-note-item').forEach(el => el.remove());
      snap.docs.forEach(doc => list.appendChild(createSavedNoteItem(doc.data(), doc.id, username)));
    } catch (e) { console.error('Saved notes load error:', e); }
  }

  // ----- UI Component Builders -----
  function createHistoryItem(data, docId) {
    const li = document.createElement('li');
    li.className = 'note-item';
    const typeIcons = { text: 'edit_note', link: 'link', image: 'image' };
    const icon = typeIcons[data.type] || 'description';
    li.innerHTML = `
      <div class="note-item-icon"><span class="material-symbols-outlined text-lg">${icon}</span></div>
      <div class="note-item-content">
        <div class="note-item-text">${escapeHTML(data.preview || 'Untitled')}</div>
        <div class="note-item-meta"><span class="note-item-code">${data.code || docId}</span><span>${data.createdAt ? formatTimestamp(data.createdAt) : ''}</span></div>
      </div>
    `;
    li.addEventListener('click', async () => {
      const code = data.code || docId;
      await copyToClipboard(code);
      showToast(`Code ${code} copied!`, 'success');
    });
    return li;
  }

  const categoryLabels = { personal: '📝 Personal', work: '💼 Work', ideas: '💡 Ideas', code: '🖥️ Code', links: '🔗 Links', important: '⭐ Important' };
  function createSavedNoteItem(data, docId, username) {
    const li = document.createElement('li');
    li.className = 'saved-note-item';
    li.setAttribute('data-note-category', data.category || '');
    const typeIcons = { text: 'edit_note', link: 'link', image: 'image' };
    const icon = typeIcons[data.type] || 'description';
    const catLabel = data.category ? categoryLabels[data.category] || '' : '';
    const snippetContent = Array.isArray(data.content) ? data.content.join(', ') : data.content;
    const snippet = snippetContent && snippetContent.length > 80 ? escapeHTML(snippetContent.substring(0, 80)) + '…' : (snippetContent ? escapeHTML(snippetContent) : '');
    li.innerHTML = `
      <div class="saved-note-item-icon"><span class="material-symbols-outlined text-lg">${icon}</span></div>
      <div class="saved-note-item-content">
        <div class="saved-note-item-text">${escapeHTML(data.title || data.preview || 'Untitled')}</div>
        ${data.type !== 'image' && snippet ? `<div class="saved-note-item-snippet">${snippet}</div>` : ''}
        <div class="saved-note-item-meta">${catLabel ? `<span class="saved-note-cat-badge">${catLabel}</span>` : ''}<span>${data.createdAt ? formatTimestamp(data.createdAt) : ''}</span></div>
      </div>
      <div class="saved-note-item-actions">
        <button class="saved-note-action edit-action"><span class="material-symbols-outlined text-base">edit</span></button>
        <button class="saved-note-action copy-action"><span class="material-symbols-outlined text-base">content_copy</span></button>
        <button class="saved-note-action delete"><span class="material-symbols-outlined text-base">delete</span></button>
      </div>
    `;
    li.querySelector('.edit-action').addEventListener('click', (e) => { 
      e.stopPropagation(); 
      console.log('Edit action clicked!', data, docId);
      openEditModal(data, docId, username); 
    });
    li.querySelector('.copy-action').addEventListener('click', async (e) => { e.stopPropagation(); if (data.content) { await copyToClipboard(data.content); showToast('Content copied!', 'success'); } });
    li.querySelector('.delete').addEventListener('click', async (e) => { e.stopPropagation(); if (confirm('Delete this note?')) await deleteNote(docId, username, li); });
    return li;
  }

  async function deleteNote(docId, username, li) {
    try {
      await db.collection('users').doc(username).collection('savedNotes').doc(docId).delete();
      li.remove();
      loadUserProfile(username);
    } catch (e) { showToast('Delete failed', 'error'); }
  }

  // ----- Tabs & Filtering -----
  document.querySelectorAll('.account-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.accountTab;
      document.querySelectorAll('.account-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      ['recent', 'saved', 'settings', 'files'].forEach(k => {
        const el = document.getElementById(`section${k.charAt(0).toUpperCase() + k.slice(1)}`);
        if (el) el.setAttribute('data-account-active', k === target ? 'true' : 'false');
      });
    });
  });

  document.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('.saved-note-item').forEach(item => {
        item.style.display = (filter === 'all' || item.getAttribute('data-note-category') === filter) ? '' : 'none';
      });
    });
  });

  // ----- Edit Note Modal -----
  const editModalOverlay = document.getElementById('editNoteModalOverlay');
  const editModalClose   = document.getElementById('editNoteModalClose');
  const editCancelBtn    = document.getElementById('editNoteCancelBtn');
  const editSaveBtn      = document.getElementById('editNoteSaveBtn');
  const editCharCount    = document.getElementById('editNoteCharCount');
  const editContentArea  = document.getElementById('editNoteContent');
  const editTypeLabel    = document.getElementById('editNoteTypeLabel');

  // Live char counter
  if (editContentArea && editCharCount) {
    editContentArea.addEventListener('input', () => {
      const len = editContentArea.value.length;
      editCharCount.textContent = len > 0 ? `${len} chars` : '';
    });
  }

  window.openEditModal = function(data, docId, username) {
    console.log('openEditModal called', { data, docId, username });

    // Fill hidden tracking fields
    document.getElementById('editNoteId').value       = docId;
    document.getElementById('editNoteUsername').value = username;
    document.getElementById('editNoteType').value     = data.type || 'text';

    // Title: use title field, fallback to preview, fallback to content snippet
    let titleValue = data.title || data.preview || '';
    if (!titleValue && data.content) {
      const raw = Array.isArray(data.content) ? data.content.join(', ') : data.content;
      titleValue = raw.substring(0, 60);
    }
    document.getElementById('editNoteTitle').value = titleValue;

    // Category
    document.getElementById('editNoteCategory').value = data.category || '';

    // Type label
    const typeMap = { text: '📝 Text note', link: '🔗 Link note', image: '🖼️ Image note' };
    if (editTypeLabel) editTypeLabel.textContent = typeMap[data.type] || '📝 Text note';

    // Content vs image
    const contentContainer = document.getElementById('editNoteContentContainer');
    const imageInfo        = document.getElementById('editNoteImageInfo');

    if (data.type === 'image') {
      if (contentContainer) contentContainer.style.display = 'none';
      if (imageInfo)        imageInfo.style.display = 'flex';
    } else {
      if (contentContainer) contentContainer.style.display = 'block';
      if (imageInfo)        imageInfo.style.display = 'none';

      let content = data.content || '';
      if (Array.isArray(content)) content = content.join('\n');

      if (editContentArea) {
        editContentArea.value = content;
        if (editCharCount) {
          editCharCount.textContent = content.length > 0 ? `${content.length} chars` : '';
        }
      }
    }

    // Show modal
    if (editModalOverlay) editModalOverlay.style.display = 'flex';

    // Auto-focus title
    setTimeout(() => {
      const t = document.getElementById('editNoteTitle');
      if (t) { t.focus(); t.select(); }
    }, 60);
  };

  function closeEditModal() {
    if (editModalOverlay) editModalOverlay.style.display = 'none';
  }

  if (editModalClose) editModalClose.addEventListener('click', closeEditModal);
  if (editCancelBtn)  editCancelBtn.addEventListener('click', closeEditModal);

  // Click backdrop to close
  if (editModalOverlay) {
    editModalOverlay.addEventListener('click', (e) => {
      if (e.target === editModalOverlay) closeEditModal();
    });
  }

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editModalOverlay && editModalOverlay.style.display !== 'none') {
      closeEditModal();
    }
  });

  // Save
  if (editSaveBtn) {
    editSaveBtn.addEventListener('click', async () => {
      const docId    = document.getElementById('editNoteId').value;
      const username = document.getElementById('editNoteUsername').value;
      const type     = document.getElementById('editNoteType').value;
      const newTitle = document.getElementById('editNoteTitle').value.trim();
      const newCat   = document.getElementById('editNoteCategory').value;
      const rawText  = editContentArea ? editContentArea.value : '';

      if (!docId || !username) return;

      editSaveBtn.disabled = true;
      const origHTML = editSaveBtn.innerHTML;
      editSaveBtn.innerHTML = '<span class="material-symbols-outlined text-sm" style="animation:spin 1s linear infinite">progress_activity</span> Saving…';

      try {
        const updateData = { title: newTitle, category: newCat };

        if (type !== 'image') {
          updateData.content = (type === 'link')
            ? rawText.split('\n').map(l => l.trim()).filter(Boolean)
            : rawText;
        }

        await db.collection('users').doc(username).collection('savedNotes').doc(docId).update(updateData);

        // Sync history preview
        try {
          const previewSnippet = newTitle || (type === 'image'
            ? '🖼️ Image'
            : (Array.isArray(updateData.content) ? updateData.content.join(', ') : (updateData.content || '')).substring(0, 100));
          await db.collection('users').doc(username).collection('history').doc(docId).update({ preview: previewSnippet });
        } catch (_) {}

        showToast('Note updated! ✅', 'success');
        closeEditModal();
        loadSavedNotes(username);

      } catch (err) {
        console.error('Edit save error:', err);
        showToast('Could not save changes. Try again.', 'error');
      } finally {
        editSaveBtn.disabled = false;
        editSaveBtn.innerHTML = origHTML;
      }
    });
  }

  // ----- Helper Utils -----
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
