// ============================================================
// Users Module — eNotePad
// Username handle system: search, profiles, inbox, follow, send-note.
// ============================================================

function initUsers() {
  initUserSearch();
  initUserProfileModal();
  initSendToUserUI();
}

// ============================================================
// SECTION 1 — USER SEARCH PANEL
// ============================================================

function initUserSearch() {
  const searchInput = document.getElementById('userSearchInput');
  const searchResults = document.getElementById('userSearchResults');
  const searchEmpty = document.getElementById('userSearchEmpty');
  const filterBtns = document.querySelectorAll('.user-filter-btn');

  if (!searchInput || !searchResults) return;

  let currentFilter = 'all';
  let cachedUsers = null;

  async function fetchAllUsers() {
    if (cachedUsers) return cachedUsers;
    try {
      const snap = await db.collection('userSearch').where('isPublic', '==', true).limit(500).get();
      cachedUsers = snap.docs.map(d => d.data());
      return cachedUsers;
    } catch (e) {
      console.warn('userSearch fetch error:', e);
      return [];
    }
  }

  const doSearch = debounce(async (query) => {
    const q = (query || '').trim().toLowerCase().replace(/^@/, '');
    const currentUser = getCurrentUser();

    searchResults.innerHTML = `<div class="user-search-loading"><span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span></div>`;
    if (searchEmpty) searchEmpty.style.display = 'none';

    const all = await fetchAllUsers();
    let filtered = all;

    if (q.length > 0) {
      filtered = all.filter(u =>
        (u.username || '').toLowerCase().startsWith(q) ||
        (u.displayName || '').toLowerCase().includes(q)
      );
    }

    if (currentFilter === 'following' && currentUser) {
      const followingSnap = await db.collection('users').doc(currentUser.username)
        .collection('following').get().catch(() => ({ docs: [] }));
      const followingIds = new Set(followingSnap.docs.map(d => d.id));
      filtered = filtered.filter(u => followingIds.has(u.username));
    }

    if (currentUser) {
      filtered = filtered.filter(u => u.username !== currentUser.username);
    }

    searchResults.innerHTML = '';

    if (filtered.length === 0) {
      if (searchEmpty) searchEmpty.style.display = '';
      return;
    }
    if (searchEmpty) searchEmpty.style.display = 'none';

    filtered.slice(0, 30).forEach(user => {
      const card = renderUserCard(user, currentUser);
      searchResults.appendChild(card);
    });
  }, 300);

  searchInput.addEventListener('input', e => doSearch(e.target.value));
  searchInput.addEventListener('focus', () => { if (!searchInput.value) doSearch(''); });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter || 'all';
      doSearch(searchInput.value);
    });
  });

  window.refreshUserSearch = () => { cachedUsers = null; doSearch(searchInput.value); };
  doSearch('');
}

function renderUserCard(user, currentUser) {
  const card = document.createElement('div');
  card.className = 'user-search-card';

  const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase();
  const color = user.avatarColor || generateAvatarColor(user.username);
  const isLoggedIn = !!currentUser;

  card.innerHTML = `
    <div class="usc-avatar" style="background:${color};">${initial}</div>
    <div class="usc-info">
      <div class="usc-name">${escapeHTMLStr(user.displayName || user.username)}</div>
      <div class="usc-handle">@${escapeHTMLStr(user.username)}</div>
      ${user.bio ? `<div class="usc-bio">${escapeHTMLStr(user.bio)}</div>` : ''}
    </div>
    <div class="usc-actions">
      ${isLoggedIn ? `<button class="usc-follow-btn" data-username="${escapeHTMLStr(user.username)}">
        <span class="material-symbols-outlined">person_add</span>
      </button>` : ''}
      <button class="usc-profile-btn" data-username="${escapeHTMLStr(user.username)}" title="View Profile">
        <span class="material-symbols-outlined">open_in_new</span>
      </button>
    </div>
  `;

  if (isLoggedIn) {
    const followBtn = card.querySelector('.usc-follow-btn');
    updateFollowButtonState(followBtn, currentUser.username, user.username);
    followBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleFollow(currentUser.username, user.username, followBtn);
    });
  }

  card.querySelector('.usc-profile-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openUserProfile(user.username);
  });

  card.addEventListener('click', () => openUserProfile(user.username));
  return card;
}

// ============================================================
// SECTION 2 — USER PROFILE MODAL
// ============================================================

function initUserProfileModal() {
  const modal = document.getElementById('userProfileModal');
  const closeBtn = document.getElementById('userProfileModalClose');
  const backdrop = document.getElementById('userProfileModalBackdrop');
  if (!modal) return;

  const close = () => {
    modal.classList.remove('upm-open');
    setTimeout(() => { modal.style.display = 'none'; }, 260);
  };

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.style.display !== 'none') close();
  });

  window.closeUserProfile = close;
}

window.openUserProfile = async function openUserProfile(username) {
  const modal = document.getElementById('userProfileModal');
  if (!modal) return;

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('upm-open'), 10);

  const body = document.getElementById('userProfileBody');
  if (body) body.innerHTML = `<div class="upm-loading"><span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span> Loading…</div>`;

  try {
    const userDoc = await db.collection('users').doc(username).get();
    if (!userDoc.exists) {
      if (body) body.innerHTML = `<div class="upm-error">User not found.</div>`;
      return;
    }
    const data = userDoc.data();
    const searchDoc = await db.collection('userSearch').doc(username).get().catch(() => ({ exists: false }));
    const searchData = searchDoc.exists ? searchDoc.data() : {};

    const initial = (data.displayName || username).charAt(0).toUpperCase();
    const color = data.avatarColor || searchData.avatarColor || generateAvatarColor(username);
    const bio = data.bio || searchData.bio || '';
    const displayName = data.displayName || searchData.displayName || username;
    const joinDate = data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

    const [histSnap, savedSnap] = await Promise.all([
      db.collection('users').doc(username).collection('history').get().catch(() => ({ size: 0 })),
      db.collection('users').doc(username).collection('savedNotes').get().catch(() => ({ size: 0 }))
    ]);

    const currentUser = getCurrentUser();
    const isOwnProfile = currentUser && currentUser.username === username;
    const isLoggedIn = !!currentUser;

    if (body) {
      body.innerHTML = `
        <div class="upm-header">
          <div class="upm-avatar" style="background:${color};">${initial}</div>
          <div class="upm-header-info">
            <div class="upm-display-name">${escapeHTMLStr(displayName)}</div>
            <div class="upm-username">@${escapeHTMLStr(username)}</div>
            ${bio ? `<div class="upm-bio">${escapeHTMLStr(bio)}</div>` : ''}
            <div class="upm-join">Joined ${joinDate}</div>
          </div>
          ${isLoggedIn && !isOwnProfile ? `
          <button class="upm-follow-btn" id="upmFollowBtn" data-username="${escapeHTMLStr(username)}">
            <span class="material-symbols-outlined">person_add</span>
            <span>Follow</span>
          </button>` : ''}
          ${isOwnProfile ? `
          <button class="upm-edit-profile-btn" id="upmEditProfileBtn">
            <span class="material-symbols-outlined">edit</span>
            <span>Edit Profile</span>
          </button>` : ''}
        </div>
        <div class="upm-stats">
          <div class="upm-stat"><div class="upm-stat-value">${histSnap.size}</div><div class="upm-stat-label">Shared</div></div>
          <div class="upm-stat"><div class="upm-stat-value">${savedSnap.size}</div><div class="upm-stat-label">Saved</div></div>
          <div class="upm-stat"><div class="upm-stat-value" id="upmFollowersCount">${data.followersCount || 0}</div><div class="upm-stat-label">Followers</div></div>
        </div>
        ${isLoggedIn && !isOwnProfile ? `
        <div class="upm-actions">
          <button class="upm-action-btn upm-send-btn" id="upmSendNoteBtn">
            <span class="material-symbols-outlined">send</span><span>Send a Note</span>
          </button>
          <button class="upm-action-btn upm-invite-btn" id="upmInviteRoomBtn">
            <span class="material-symbols-outlined">forum</span><span>Invite to Room</span>
          </button>
        </div>` : ''}
      `;

      const followBtn = body.querySelector('#upmFollowBtn');
      if (followBtn && currentUser) {
        updateFollowButtonState(followBtn, currentUser.username, username, true);
        followBtn.addEventListener('click', async () => {
          await toggleFollow(currentUser.username, username, followBtn, true);
          const newCount = document.getElementById('upmFollowersCount');
          if (newCount) {
            const doc = await db.collection('users').doc(username).get().catch(() => null);
            if (doc && doc.exists) newCount.textContent = doc.data().followersCount || 0;
          }
        });
      }

      const editBtn = body.querySelector('#upmEditProfileBtn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          window.closeUserProfile && window.closeUserProfile();
          if (typeof window.switchToTab === 'function') window.switchToTab('account');
          setTimeout(() => {
            const settingsTab = document.querySelector('.account-tab[data-account-tab="settings"]');
            if (settingsTab) settingsTab.click();
          }, 100);
        });
      }

      const sendBtn = body.querySelector('#upmSendNoteBtn');
      if (sendBtn) {
        sendBtn.addEventListener('click', () => {
          window.closeUserProfile && window.closeUserProfile();
          openSendToUserPanel(username);
        });
      }

      const inviteBtn = body.querySelector('#upmInviteRoomBtn');
      if (inviteBtn) {
        inviteBtn.addEventListener('click', async () => {
          const roomUrl = `${window.location.origin}/convo_room/index.html?room=${encodeURIComponent(username)}`;
          const ok = await copyToClipboard(roomUrl);
          if (ok) showToast(`Invite link copied! 📋`, 'success');
        });
      }
    }
  } catch (e) {
    console.error('openUserProfile error:', e);
    if (body) body.innerHTML = `<div class="upm-error">Could not load profile.</div>`;
  }
};

// ============================================================
// SECTION 3 — FOLLOW / UNFOLLOW
// ============================================================

async function updateFollowButtonState(btn, fromUsername, toUsername, withLabel = false) {
  if (!btn || !fromUsername) return;
  try {
    const doc = await db.collection('users').doc(fromUsername).collection('following').doc(toUsername).get();
    applyFollowBtnStyle(btn, doc.exists, withLabel);
  } catch (e) { /* silent */ }
}

function applyFollowBtnStyle(btn, isFollowing, withLabel) {
  btn.classList.toggle('following', isFollowing);
  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = isFollowing ? 'person_check' : 'person_add';
  if (withLabel) {
    const span = btn.querySelector('span:last-child');
    if (span && span !== icon) span.textContent = isFollowing ? 'Following' : 'Follow';
  }
  btn.title = isFollowing ? 'Unfollow' : 'Follow';
}

async function toggleFollow(fromUsername, toUsername, btn, withLabel = false) {
  try {
    const ref = db.collection('users').doc(fromUsername).collection('following').doc(toUsername);
    const doc = await ref.get();
    const isFollowing = doc.exists;

    if (isFollowing) {
      await ref.delete();
      await db.collection('users').doc(toUsername).collection('followers').doc(fromUsername).delete().catch(() => {});
      await db.collection('users').doc(toUsername).update({ followersCount: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
      await db.collection('users').doc(fromUsername).update({ followingCount: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
      applyFollowBtnStyle(btn, false, withLabel);
      showToast(`Unfollowed @${toUsername}`, 'success');
    } else {
      await ref.set({ username: toUsername, followedAt: firebase.firestore.FieldValue.serverTimestamp() });
      await db.collection('users').doc(toUsername).collection('followers').doc(fromUsername).set({ username: fromUsername, followedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
      await db.collection('users').doc(toUsername).update({ followersCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
      await db.collection('users').doc(fromUsername).update({ followingCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
      applyFollowBtnStyle(btn, true, withLabel);
      showToast(`Following @${toUsername}! 🎉`, 'success');
    }

    if (typeof window.refreshUserSearch === 'function') window.refreshUserSearch();
  } catch (e) {
    console.error('toggleFollow error:', e);
    showToast('Could not update follow', 'error');
  }
}

// ============================================================
// SECTION 4 — SEND NOTE TO @USER
// ============================================================

function initSendToUserUI() {
  const toggleBtn = document.getElementById('sendToUserToggle');
  const sendPanel = document.getElementById('sendToUserPanel');
  const recipientInput = document.getElementById('sendToUserInput');
  const autocompleteList = document.getElementById('sendToUserAutocomplete');
  const sendNoteBtn = document.getElementById('sendToUserBtn');

  if (!toggleBtn || !sendPanel) return;

  let selectedRecipient = null;

  toggleBtn.addEventListener('click', () => {
    const isActive = toggleBtn.classList.toggle('active');
    sendPanel.style.display = isActive ? 'block' : 'none';
    if (isActive && recipientInput) setTimeout(() => recipientInput.focus(), 80);
    selectedRecipient = null;
    if (recipientInput) recipientInput.value = '';
    if (autocompleteList) { autocompleteList.innerHTML = ''; autocompleteList.style.display = 'none'; }
  });

  if (recipientInput && autocompleteList) {
    const doAutocomplete = debounce(async (query) => {
      const q = (query || '').toLowerCase().replace(/^@/, '');
      if (q.length < 1) { autocompleteList.innerHTML = ''; autocompleteList.style.display = 'none'; return; }

      const snap = await db.collection('userSearch').where('isPublic', '==', true).limit(200).get().catch(() => ({ docs: [] }));
      const results = snap.docs.map(d => d.data())
        .filter(u => (u.username || '').startsWith(q) || (u.displayName || '').toLowerCase().includes(q))
        .slice(0, 6);

      autocompleteList.innerHTML = '';
      if (results.length === 0) { autocompleteList.style.display = 'none'; return; }
      autocompleteList.style.display = 'block';

      results.forEach(u => {
        const item = document.createElement('div');
        item.className = 'stu-autocomplete-item';
        const color = u.avatarColor || generateAvatarColor(u.username);
        const initial = (u.displayName || u.username || '?').charAt(0).toUpperCase();
        item.innerHTML = `
          <div class="stu-ac-avatar" style="background:${color};">${initial}</div>
          <div class="stu-ac-info">
            <span class="stu-ac-name">${escapeHTMLStr(u.displayName || u.username)}</span>
            <span class="stu-ac-handle">@${escapeHTMLStr(u.username)}</span>
          </div>`;
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          selectedRecipient = u.username;
          recipientInput.value = `@${u.username}`;
          autocompleteList.innerHTML = '';
          autocompleteList.style.display = 'none';
        });
        autocompleteList.appendChild(item);
      });
    }, 250);

    recipientInput.addEventListener('input', e => doAutocomplete(e.target.value));
    recipientInput.addEventListener('blur', () => {
      setTimeout(() => { autocompleteList.style.display = 'none'; }, 150);
    });
  }

  if (sendNoteBtn) {
    sendNoteBtn.addEventListener('click', async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) { showToast('Please sign in to send notes', 'warning'); return; }

      const to = sendNoteBtn._directRecipient ||
                 selectedRecipient ||
                 (recipientInput ? recipientInput.dataset.selectedRecipient || recipientInput.value.trim().replace(/^@/, '').toLowerCase() : '');

      if (!to) { showToast('Please select a recipient', 'warning'); return; }
      if (to === currentUser.username) { showToast("Can't send to yourself!", 'warning'); return; }

      const richEditor = document.getElementById('richEditor');
      const content = richEditor ? richEditor.innerHTML : '';
      const plainText = typeof getEditorPlainText === 'function' ? getEditorPlainText() : richEditor ? richEditor.textContent : '';

      if (!plainText || !plainText.trim()) {
        showToast('Please write something first', 'warning'); return;
      }

      const noteTitleEl = document.getElementById('noteTitle');
      const title = noteTitleEl ? noteTitleEl.value.trim() : '';

      sendNoteBtn.classList.add('btn-loading');
      sendNoteBtn.disabled = true;

      try {
        const recipientDoc = await db.collection('users').doc(to).get();
        if (!recipientDoc.exists) { showToast(`User @${to} not found`, 'error'); return; }

        const noteId = generateCode(10);
        await db.collection('users').doc(to).collection('inbox').doc(noteId).set({
          from: currentUser.username,
          type: 'text',
          content: content,
          plainText: plainText.substring(0, 300),
          title: title || `Note from @${currentUser.username}`,
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('users').doc(to).update({
          inboxUnread: firebase.firestore.FieldValue.increment(1)
        }).catch(() => {});

        showToast(`Note sent to @${to}! ✉️`, 'success');
        toggleBtn.classList.remove('active');
        sendPanel.style.display = 'none';
        selectedRecipient = null;
        sendNoteBtn._directRecipient = null;
        if (recipientInput) { recipientInput.value = ''; delete recipientInput.dataset.selectedRecipient; }
      } catch (e) {
        console.error('sendNote error:', e);
        showToast('Failed to send note', 'error');
      } finally {
        sendNoteBtn.classList.remove('btn-loading');
        sendNoteBtn.disabled = false;
      }
    });
  }
}

function openSendToUserPanel(username) {
  if (typeof window.switchToTab === 'function') window.switchToTab('share');
  setTimeout(() => {
    const toggleBtn = document.getElementById('sendToUserToggle');
    const sendPanel = document.getElementById('sendToUserPanel');
    const recipientInput = document.getElementById('sendToUserInput');
    if (toggleBtn && !toggleBtn.classList.contains('active')) {
      toggleBtn.classList.add('active');
      if (sendPanel) sendPanel.style.display = 'block';
    }
    if (recipientInput) {
      recipientInput.value = `@${username}`;
      recipientInput.dataset.selectedRecipient = username;
    }
  }, 120);
}

// ============================================================
// SECTION 5 — INBOX
// ============================================================

window.loadInbox = async function loadInbox(username) {
  const list = document.getElementById('inboxList');
  const emptyEl = document.getElementById('inboxEmpty');
  if (!list || !username) return;

  list.innerHTML = `<div class="inbox-loading"><span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span></div>`;

  try {
    const snap = await db.collection('users').doc(username).collection('inbox')
      .orderBy('createdAt', 'desc').limit(50).get();

    list.innerHTML = '';
    if (snap.empty) {
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    snap.docs.forEach(doc => list.appendChild(createInboxItem(doc.data(), doc.id, username)));
  } catch (e) {
    console.error('loadInbox error:', e);
    list.innerHTML = `<p class="text-xs text-center py-4 text-error/60">Could not load inbox.</p>`;
  }
};

function createInboxItem(data, docId, username) {
  const item = document.createElement('div');
  item.className = `inbox-item${data.read ? '' : ' inbox-item-unread'}`;

  const timeStr = data.createdAt ? formatTimestamp(data.createdAt) : '';
  const color = generateAvatarColor(data.from || '?');
  const initial = (data.from || '?').charAt(0).toUpperCase();
  const preview = data.plainText || (typeof data.content === 'string' ? data.content.replace(/<[^>]+>/g, '').substring(0, 100) : '') || '';

  item.innerHTML = `
    <div class="inbox-avatar" style="background:${color};">${initial}</div>
    <div class="inbox-content">
      <div class="inbox-header-row">
        <span class="inbox-from">@${escapeHTMLStr(data.from || '?')}</span>
        <span class="inbox-time">${timeStr}</span>
        ${!data.read ? '<span class="inbox-unread-dot"></span>' : ''}
      </div>
      <div class="inbox-title">${escapeHTMLStr(data.title || 'Untitled Note')}</div>
      <div class="inbox-preview">${escapeHTMLStr(preview)}</div>
    </div>
    <div class="inbox-actions">
      <button class="inbox-view-btn" title="View"><span class="material-symbols-outlined">open_in_full</span></button>
      <button class="inbox-delete-btn" title="Delete"><span class="material-symbols-outlined">delete</span></button>
    </div>`;

  item.addEventListener('click', async () => {
    if (!data.read) {
      await db.collection('users').doc(username).collection('inbox').doc(docId).update({ read: true }).catch(() => {});
      item.classList.remove('inbox-item-unread');
      item.querySelector('.inbox-unread-dot')?.remove();
      await db.collection('users').doc(username).update({ inboxUnread: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
      data.read = true;
    }
  });

  item.querySelector('.inbox-view-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openInboxNoteModal(data, docId, username);
  });

  item.querySelector('.inbox-delete-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      if (!data.read) {
        await db.collection('users').doc(username).update({ inboxUnread: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
      }
      await db.collection('users').doc(username).collection('inbox').doc(docId).delete();
      item.remove();
      showToast('Deleted from inbox', 'success');
      const list = document.getElementById('inboxList');
      if (list && list.children.length === 0) {
        const emptyEl = document.getElementById('inboxEmpty');
        if (emptyEl) emptyEl.style.display = '';
      }
    } catch (err) { showToast('Delete failed', 'error'); }
  });

  return item;
}

function openInboxNoteModal(data, docId, username) {
  const modal = document.getElementById('inboxNoteModal');
  if (!modal) return;
  const titleEl = document.getElementById('inboxNoteModalTitle');
  const fromEl = document.getElementById('inboxNoteModalFrom');
  const bodyEl = document.getElementById('inboxNoteModalBody');

  if (titleEl) titleEl.textContent = data.title || 'Untitled Note';
  if (fromEl) fromEl.textContent = `From @${data.from || '?'}`;
  if (bodyEl) {
    const content = data.content || '';
    if (content.includes('<') && content.includes('>')) {
      bodyEl.innerHTML = content;
    } else {
      bodyEl.textContent = content;
    }
  }

  const replyBtn = document.getElementById('inboxNoteModalReply');
  if (replyBtn && data.from) {
    replyBtn.onclick = () => { closeInboxNoteModal(); openSendToUserPanel(data.from); };
  }

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('inm-open'), 10);
}

function closeInboxNoteModal() {
  const modal = document.getElementById('inboxNoteModal');
  if (!modal) return;
  modal.classList.remove('inm-open');
  setTimeout(() => { modal.style.display = 'none'; }, 260);
}

// ============================================================
// SECTION 6 — INBOX BADGE
// ============================================================

let inboxUnsubscribe = null;

window.loadInboxBadge = function loadInboxBadge(username) {
  if (inboxUnsubscribe) { inboxUnsubscribe(); inboxUnsubscribe = null; }
  if (!username) return;

  inboxUnsubscribe = db.collection('users').doc(username).onSnapshot(doc => {
    const data = doc.data();
    const count = (data && data.inboxUnread) ? Math.max(0, data.inboxUnread) : 0;
    updateInboxBadge(count);
  }, () => {});
};

function updateInboxBadge(count) {
  document.querySelectorAll('.inbox-badge').forEach(badge => {
    badge.textContent = count > 0 ? (count > 99 ? '99+' : count) : '';
    badge.style.display = count > 0 ? '' : 'none';
  });
}

// ============================================================
// SECTION 7 — USER SEARCH INDEX HELPERS
// ============================================================

window.writeUserSearchIndex = async function writeUserSearchIndex(username, fields = {}) {
  try {
    await db.collection('userSearch').doc(username).set({
      username,
      displayName: fields.displayName || username,
      bio: fields.bio || '',
      avatarColor: fields.avatarColor || generateAvatarColor(username),
      isPublic: fields.isPublic !== false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn('writeUserSearchIndex error:', e);
  }
};

// ============================================================
// SECTION 8 — PROFILE SETTINGS (display name, bio, avatar)
// ============================================================

window.initProfileSettings = function initProfileSettings() {
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const displayNameInput = document.getElementById('profileDisplayName');
  const bioInput = document.getElementById('profileBio');
  const avatarColorBtns = document.querySelectorAll('.avatar-color-swatch');
  const previewAvatar = document.getElementById('profileAvatarPreview');

  const currentUser = getCurrentUser();
  if (!currentUser) return;

  let selectedColor = null;

  db.collection('users').doc(currentUser.username).get().then(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    if (displayNameInput) displayNameInput.value = d.displayName || '';
    if (bioInput) bioInput.value = d.bio || '';
    selectedColor = d.avatarColor || generateAvatarColor(currentUser.username);
    if (previewAvatar) {
      previewAvatar.style.background = selectedColor;
      previewAvatar.textContent = (d.displayName || currentUser.username).charAt(0).toUpperCase();
    }
    avatarColorBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.color === selectedColor));
  }).catch(() => {});

  avatarColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      avatarColorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.color;
      if (previewAvatar) previewAvatar.style.background = selectedColor;
    });
  });

  if (displayNameInput && previewAvatar) {
    displayNameInput.addEventListener('input', () => {
      const val = displayNameInput.value.trim();
      previewAvatar.textContent = (val || currentUser.username).charAt(0).toUpperCase();
    });
  }

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
      const displayName = displayNameInput ? displayNameInput.value.trim() : '';
      const bio = bioInput ? bioInput.value.trim() : '';
      const avatarColor = selectedColor || generateAvatarColor(currentUser.username);

      saveProfileBtn.classList.add('btn-loading');
      saveProfileBtn.disabled = true;

      try {
        await db.collection('users').doc(currentUser.username).update({ displayName, bio, avatarColor });
        await window.writeUserSearchIndex(currentUser.username, { displayName, bio, avatarColor });

        const avatarEl = document.getElementById('userAvatar');
        const sidebarAvatarEl = document.getElementById('sidebarUserAvatar');
        const initial = (displayName || currentUser.username).charAt(0).toUpperCase();
        if (avatarEl) { avatarEl.textContent = initial; avatarEl.style.background = avatarColor; }
        if (sidebarAvatarEl) { sidebarAvatarEl.textContent = initial; sidebarAvatarEl.style.background = avatarColor; }

        if (typeof window.refreshUserSearch === 'function') window.refreshUserSearch();
        showToast('Profile updated! ✅', 'success');
      } catch (e) {
        console.error('saveProfile error:', e);
        showToast('Could not save profile', 'error');
      } finally {
        saveProfileBtn.classList.remove('btn-loading');
        saveProfileBtn.disabled = false;
      }
    });
  }
};

// ============================================================
// UTILITIES
// ============================================================

function generateAvatarColor(username) {
  const colors = [
    'hsl(215,55%,45%)', 'hsl(160,50%,38%)', 'hsl(280,45%,48%)',
    'hsl(340,50%,45%)', 'hsl(30,60%,45%)', 'hsl(190,55%,40%)',
    'hsl(260,48%,50%)', 'hsl(15,58%,46%)', 'hsl(130,45%,40%)',
    'hsl(310,45%,48%)'
  ];
  let hash = 0;
  for (let i = 0; i < (username || '').length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length];
}

function escapeHTMLStr(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('inboxNoteModalClose');
  const backdrop = document.getElementById('inboxNoteModalBackdrop');
  if (closeBtn) closeBtn.addEventListener('click', closeInboxNoteModal);
  if (backdrop) backdrop.addEventListener('click', closeInboxNoteModal);
});
