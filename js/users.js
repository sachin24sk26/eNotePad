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
  const clearBtn = document.getElementById('clearUserSearchBtn');
  const statsRow = document.getElementById('userSearchStatsRow');
  const countLabel = document.getElementById('userSearchCountLabel');
  const refreshBtn = document.getElementById('refreshUsersBtn');
  const searchPrompt = document.getElementById('userSearchPrompt');
  const featuredGrid = document.getElementById('featuredCuratorsGrid');
  const filterBtns = document.querySelectorAll('.user-filter-btn');

  if (!searchInput || !searchResults) return;

  let currentFilter = 'discover';
  let cachedUsers = null;

  async function fetchAllUsers() {
    if (cachedUsers) return cachedUsers;
    try {
      const snap = await db.collection('userSearch').where('isPublic', '==', true).limit(500).get().catch(() => ({ docs: [] }));
      let users = snap.docs.map(d => d.data());

      // Fallback merge from main users collection to ensure no registered user is missing
      const usersSnap = await db.collection('users').limit(500).get().catch(() => ({ docs: [] }));
      const userMap = new Map();

      users.forEach(u => { if (u && u.username) userMap.set(u.username, u); });

      usersSnap.docs.forEach(d => {
        const data = d.data();
        const uname = d.id;
        if (!userMap.has(uname)) {
          userMap.set(uname, {
            username: uname,
            displayName: data.displayName || uname,
            bio: data.bio || '',
            avatarColor: data.avatarColor || generateAvatarColor(uname),
            tags: data.tags || [],
            followersCount: data.followersCount || 0,
            followingCount: data.followingCount || 0,
            isPublic: true
          });
        } else {
          const existing = userMap.get(uname);
          if (!existing.displayName) existing.displayName = data.displayName || uname;
          if (!existing.bio) existing.bio = data.bio || '';
          if (!existing.avatarColor) existing.avatarColor = data.avatarColor || generateAvatarColor(uname);
          if (!existing.tags || existing.tags.length === 0) existing.tags = data.tags || [];
          if (data.followersCount) existing.followersCount = data.followersCount;
        }
      });

      cachedUsers = Array.from(userMap.values());
      return cachedUsers;
    } catch (e) {
      console.warn('userSearch fetch error:', e);
      return [];
    }
  }

  function toggleClearButton() {
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !searchInput.value.trim());
    }
  }

  const doSearch = debounce(async (query) => {
    const q = (query || '').trim().toLowerCase().replace(/^@/, '');
    const currentUser = getCurrentUser();

    toggleClearButton();
    if (searchEmpty) searchEmpty.style.display = 'none';

    const all = await fetchAllUsers();

    // Render Featured Curators when on Discover tab and query is empty
    if (q.length === 0 && currentFilter === 'discover') {
      if (searchPrompt) searchPrompt.style.display = 'block';
      if (statsRow) statsRow.style.display = 'none';
      searchResults.innerHTML = '';

      if (featuredGrid) {
        featuredGrid.innerHTML = '';
        const featured = all.filter(u => {
          const uname = (u.username || '').toLowerCase();
          const bio = (u.bio || '').toLowerCase();
          return uname.includes('sachin') || bio.includes('developer') || bio.includes('founder') || (u.followersCount || 0) > 0;
        });
        const listToRender = featured.length > 0 ? featured : all.slice(0, 6);
        listToRender.forEach(user => {
          featuredGrid.appendChild(renderUserCard(user, currentUser));
        });
      }
      return;
    }

    if (searchPrompt) searchPrompt.style.display = 'none';
    searchResults.innerHTML = `<div class="user-search-loading"><span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span></div>`;

    let filtered = all;

    if (q.length > 0) {
      filtered = all.filter(u => {
        const uName = (u.username || '').toLowerCase();
        const dName = (u.displayName || '').toLowerCase();
        const bio = (u.bio || '').toLowerCase();
        const tagsStr = Array.isArray(u.tags) ? u.tags.join(' ').toLowerCase() : (u.tags || '').toLowerCase();

        return uName.includes(q) || dName.includes(q) || bio.includes(q) || tagsStr.includes(q);
      });
    }

    if (currentFilter === 'suggested') {
      filtered = filtered.filter(u => {
        const uname = (u.username || '').toLowerCase();
        const bio = (u.bio || '').toLowerCase();
        return uname.includes('sachin') || bio.includes('developer') || bio.includes('founder') || (u.followersCount || 0) > 0;
      });
    } else if (currentFilter === 'following' && currentUser) {
      const followingSnap = await db.collection('users').doc(currentUser.username)
        .collection('following').get().catch(() => ({ docs: [] }));
      const followingIds = new Set(followingSnap.docs.map(d => d.id));
      filtered = filtered.filter(u => followingIds.has(u.username));
    }

    searchResults.innerHTML = '';

    if (statsRow) {
      statsRow.style.display = 'flex';
      if (countLabel) countLabel.textContent = `${filtered.length} member${filtered.length === 1 ? '' : 's'} found`;
    }

    if (filtered.length === 0) {
      if (searchEmpty) searchEmpty.style.display = 'block';
      return;
    }
    if (searchEmpty) searchEmpty.style.display = 'none';

    filtered.slice(0, 40).forEach(user => {
      const card = renderUserCard(user, currentUser);
      searchResults.appendChild(card);
    });
  }, 250);

  searchInput.addEventListener('input', e => doSearch(e.target.value));
  searchInput.addEventListener('focus', () => { if (!searchInput.value && currentFilter !== 'discover') doSearch(''); });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      toggleClearButton();
      doSearch('');
      searchInput.focus();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      cachedUsers = null;
      doSearch(searchInput.value);
      if (typeof showToast === 'function') showToast('Refreshed members list 🔄', 'info');
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('active', 'bg-primary', 'text-on-primary', 'shadow-sm');
        b.classList.add('bg-surface-container-low', 'text-on-surface-variant');
      });
      btn.classList.add('active', 'bg-primary', 'text-on-primary', 'shadow-sm');
      btn.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
      currentFilter = btn.dataset.filter || 'discover';
      doSearch(searchInput.value);
    });
  });

  window.refreshUserSearch = () => { cachedUsers = null; doSearch(searchInput.value); };
  window.filterUsersByTag = (tag) => {
    if (typeof window.switchToTab === 'function') window.switchToTab('search');
    searchInput.value = tag;
    doSearch(tag);
  };

  doSearch('');
}

function renderUserCard(user, currentUser) {
  const card = document.createElement('div');
  card.className = 'user-search-card group transition-all';

  const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase();
  const color = user.avatarColor || generateAvatarColor(user.username);
  const isLoggedIn = !!currentUser;
  const isSelf = currentUser && currentUser.username === user.username;

  let tagsList = [];
  if (Array.isArray(user.tags)) {
    tagsList = user.tags.slice(0, 3);
  } else if (typeof user.tags === 'string' && user.tags.trim()) {
    tagsList = user.tags.split(/[\s,]+/).filter(Boolean).slice(0, 3);
  }

  card.innerHTML = `
    <div class="usc-avatar shadow-sm" style="background:${color};">${initial}</div>
    <div class="usc-info">
      <div class="usc-name flex items-center gap-1.5 flex-wrap">
        <span>${escapeHTMLStr(user.displayName || user.username)}</span>
        ${isSelf ? '<span class="usc-self-badge">You</span>' : ''}
        ${user.username.toLowerCase().includes('sachin') ? '<span class="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20">DEV</span>' : ''}
      </div>
      <div class="usc-handle">@${escapeHTMLStr(user.username)}</div>
      ${user.bio ? `<div class="usc-bio">${escapeHTMLStr(user.bio)}</div>` : ''}
      ${tagsList.length > 0 ? `
        <div class="flex items-center gap-1 mt-1.5 flex-wrap">
          ${tagsList.map(t => {
            const tagStr = t.startsWith('#') ? t : `#${t}`;
            return `<span class="usc-tag-chip" data-tag="${escapeHTMLStr(tagStr)}">${escapeHTMLStr(tagStr)}</span>`;
          }).join('')}
        </div>
      ` : ''}
    </div>
    <div class="usc-actions flex items-center gap-1.5">
      ${isLoggedIn && !isSelf ? `
        <button class="usc-follow-btn" data-username="${escapeHTMLStr(user.username)}" title="Follow / Unfollow">
          <span class="material-symbols-outlined">person_add</span>
        </button>
        <button class="usc-dm-btn w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 text-on-surface-variant hover:text-primary transition-all flex items-center justify-center text-sm" data-username="${escapeHTMLStr(user.username)}" title="Send Note to @${escapeHTMLStr(user.username)}">
          <span class="material-symbols-outlined text-base">alternate_email</span>
        </button>
      ` : ''}
      <button class="usc-share-btn w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 text-on-surface-variant hover:text-primary transition-all flex items-center justify-center text-sm" data-username="${escapeHTMLStr(user.username)}" title="Share Profile">
        <span class="material-symbols-outlined text-base">share</span>
      </button>
      <button class="usc-profile-btn" data-username="${escapeHTMLStr(user.username)}" title="View Full Profile">
        <span class="material-symbols-outlined">open_in_new</span>
      </button>
    </div>
  `;

  if (isLoggedIn && !isSelf) {
    const followBtn = card.querySelector('.usc-follow-btn');
    updateFollowButtonState(followBtn, currentUser.username, user.username);
    followBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleFollow(currentUser.username, user.username, followBtn);
    });

    const dmBtn = card.querySelector('.usc-dm-btn');
    if (dmBtn) {
      dmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof openSendToUserPanel === 'function') openSendToUserPanel(user.username);
      });
    }
  }

  const shareBtn = card.querySelector('.usc-share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const origin = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : window.location.href.split('index.html')[0];
      const profileUrl = `${origin}/index.html?user=${encodeURIComponent(user.username)}`;
      const ok = await copyToClipboard(profileUrl);
      if (ok && typeof showToast === 'function') showToast(`Copied @${user.username}'s profile link! 🔗`, 'success');
    });
  }

  card.querySelectorAll('.usc-tag-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const tag = chip.dataset.tag;
      if (tag && window.filterUsersByTag) window.filterUsersByTag(tag);
    });
  });

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

    const [followingSnap, savedSnap] = await Promise.all([
      db.collection('users').doc(username).collection('following').get().catch(() => ({ size: 0 })),
      db.collection('users').doc(username).collection('savedNotes').get().catch(() => ({ size: 0 }))
    ]);

    const currentUser = getCurrentUser();
    const isOwnProfile = currentUser && currentUser.username === username;
    const isLoggedIn = !!currentUser;

    let tags = [];
    if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
      tags = data.tags;
    } else if (typeof data.tags === 'string' && data.tags.trim().length > 0) {
      tags = data.tags.split(/[\s,]+/).filter(Boolean);
    } else {
      if (username.toLowerCase().includes('sachin') || bio.toLowerCase().includes('developer')) {
        tags = ['#developer', '#founder', '#enotepad', '#tech', '#creator'];
      } else {
        tags = ['#curator', '#enotepad', '#digitalNotes', '#creative', '#notes'];
      }
    }

    let roleBadge = '';
    if (username.toLowerCase().includes('sachin') || bio.toLowerCase().includes('developer')) {
      roleBadge = `<span class="upm-role-badge dev"><span class="material-symbols-outlined text-xs">code</span> Developer & Founder</span>`;
    } else if ((data.followersCount || 0) > 5) {
      roleBadge = `<span class="upm-role-badge pro"><span class="material-symbols-outlined text-xs">verified</span> Top Curator</span>`;
    } else {
      roleBadge = `<span class="upm-role-badge member"><span class="material-symbols-outlined text-xs">workspace_premium</span> Member</span>`;
    }

    if (body) {
      body.innerHTML = `
        <div class="upm-card-container">
          <div class="upm-banner" style="background: linear-gradient(135deg, ${color} 0%, #1e2230 100%);">
            <div class="upm-banner-pattern"></div>
          </div>
          <div class="upm-body-content">
            <div class="upm-avatar-row">
              <div class="upm-avatar-wrap">
                <div class="upm-avatar" style="background:${color};">${initial}</div>
                <span class="upm-status-dot" title="Active User"></span>
              </div>
              <div class="upm-header-actions">
                ${isLoggedIn && !isOwnProfile ? `
                <button class="upm-follow-btn" id="upmFollowBtn" data-username="${escapeHTMLStr(username)}">
                  <span class="material-symbols-outlined text-sm">person_add</span>
                  <span>Follow</span>
                </button>` : ''}
                ${isOwnProfile ? `
                <button class="upm-edit-profile-btn" id="upmEditProfileBtn">
                  <span class="material-symbols-outlined text-sm">edit</span>
                  <span>Edit Profile</span>
                </button>` : ''}
                <button class="upm-share-btn" id="upmShareProfileBtn" title="Share Profile">
                  <span class="material-symbols-outlined text-sm">share</span>
                </button>
              </div>
            </div>

            <div class="upm-user-identity">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <h2 class="upm-display-name">${escapeHTMLStr(displayName)}</h2>
                ${roleBadge}
              </div>
              <div class="upm-username">@${escapeHTMLStr(username)}</div>
              <div class="upm-join"><span class="material-symbols-outlined text-xs align-middle mr-1">calendar_month</span>Joined ${joinDate}</div>
            </div>

            ${bio ? `
            <div class="upm-bio-box">
              <span class="material-symbols-outlined upm-bio-icon">format_quote</span>
              <p class="upm-bio-text">${escapeHTMLStr(bio)}</p>
            </div>` : ''}

            <div class="upm-tags-section">
              <div class="upm-section-label">INTERESTS & HASHTAGS</div>
              <div class="upm-tags-list">
                ${tags.map(t => {
                  const tagStr = t.startsWith('#') ? t : `#${t}`;
                  return `<span class="upm-tag" data-tag="${escapeHTMLStr(tagStr)}">${escapeHTMLStr(tagStr)}</span>`;
                }).join('')}
              </div>
            </div>

            <div class="upm-stats">
              <div class="upm-stat">
                <span class="material-symbols-outlined upm-stat-icon">person_add</span>
                <div class="upm-stat-value" id="upmFollowingCount">${data.followingCount || followingSnap.size || 0}</div>
                <div class="upm-stat-label">Following</div>
              </div>
              <div class="upm-stat">
                <span class="material-symbols-outlined upm-stat-icon">bookmark</span>
                <div class="upm-stat-value">${savedSnap.size}</div>
                <div class="upm-stat-label">Saved</div>
              </div>
              <div class="upm-stat">
                <span class="material-symbols-outlined upm-stat-icon">group</span>
                <div class="upm-stat-value" id="upmFollowersCount">${data.followersCount || 0}</div>
                <div class="upm-stat-label">Followers</div>
              </div>
            </div>

            ${isLoggedIn && !isOwnProfile ? `
            <div class="upm-actions">
              <button class="upm-action-btn upm-send-btn" id="upmSendNoteBtn">
                <span class="material-symbols-outlined">send</span><span>Send Note</span>
              </button>
              <button class="upm-action-btn upm-invite-btn" id="upmInviteRoomBtn">
                <span class="material-symbols-outlined">forum</span><span>Invite to Room</span>
              </button>
            </div>` : ''}
          </div>
        </div>
      `;

      const shareBtn = body.querySelector('#upmShareProfileBtn');
      if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
          const origin = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : window.location.href.split('index.html')[0];
          const profileUrl = `${origin}/index.html?user=${encodeURIComponent(username)}`;
          const shareData = {
            title: `${displayName} (@${username}) on eNotePad`,
            text: `Check out @${username}'s profile on eNotePad!`,
            url: profileUrl
          };

          // Web Share API on file:// protocol crashes Chromium with RESULT_CODE_KILLED_BAD_MESSAGE
          const isHttp = window.location.protocol.startsWith('http');
          let shared = false;

          if (isHttp && typeof navigator.share === 'function') {
            try {
              if (!navigator.canShare || navigator.canShare(shareData)) {
                await navigator.share(shareData);
                shared = true;
              }
            } catch (err) {
              if (err.name === 'AbortError') return;
            }
          }

          if (!shared) {
            const ok = await copyToClipboard(profileUrl);
            if (ok) showToast('Profile link copied! 🔗', 'success');
          }
        });
      }

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
      <button class="inbox-save-btn" title="Save to Folder"><span class="material-symbols-outlined">folder_open</span></button>
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

  const saveBtn = item.querySelector('.inbox-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      saveInboxNoteToFolder(data);
    });
  }

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

function saveInboxNoteToFolder(noteData) {
  if (typeof window.openSaveFolderModal === 'function') {
    window.openSaveFolderModal({
      noteType: 'text',
      title: noteData.title || `Note from @${noteData.from || 'user'}`,
      onConfirm: async (folderId, folderName) => {
        try {
          const content = noteData.content || noteData.plainText || '';
          if (typeof window.saveNoteToFileManager === 'function') {
            await window.saveNoteToFileManager({
              title: noteData.title || `Note from @${noteData.from || 'user'}`,
              category: 'inbox',
              noteType: 'text',
              content: content
            }, folderId);
            const dest = folderName ? `"${folderName}"` : 'My Files';
            showToast(`Note saved to ${dest}! 📁`, 'success');
          } else {
            showToast('File manager unavailable', 'error');
          }
        } catch (err) {
          console.error('saveInboxNoteToFolder error:', err);
          showToast('Failed to save note to folder', 'error');
        }
      }
    });
  } else {
    showToast('Save folder dialog unavailable', 'error');
  }
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

  const saveBtn = document.getElementById('inboxNoteModalSave');
  if (saveBtn) {
    saveBtn.onclick = () => {
      closeInboxNoteModal();
      saveInboxNoteToFolder(data);
    };
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
    const payload = {
      username,
      displayName: fields.displayName || username,
      bio: fields.bio || '',
      avatarColor: fields.avatarColor || generateAvatarColor(username),
      isPublic: fields.isPublic !== false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (fields.tags) payload.tags = fields.tags;

    await db.collection('userSearch').doc(username).set(payload, { merge: true });
  } catch (e) {
    console.warn('writeUserSearchIndex error:', e);
  }
};

// ============================================================
// SECTION 8 — PROFILE SETTINGS (display name, bio, avatar, tags)
// ============================================================

let isProfileSettingsInitialized = false;

window.initProfileSettings = function initProfileSettings() {
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const displayNameInput = document.getElementById('profileDisplayName');
  const bioInput = document.getElementById('profileBio');
  const tagsInput = document.getElementById('profileTags');
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
    if (tagsInput) {
      if (Array.isArray(d.tags) && d.tags.length > 0) {
        tagsInput.value = d.tags.join(' ');
      } else if (typeof d.tags === 'string') {
        tagsInput.value = d.tags;
      } else {
        tagsInput.value = '';
      }
    }
    selectedColor = d.avatarColor || generateAvatarColor(currentUser.username);
    if (previewAvatar) {
      previewAvatar.style.background = selectedColor;
      previewAvatar.textContent = (d.displayName || currentUser.username).charAt(0).toUpperCase();
    }
    avatarColorBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.color === selectedColor));
  }).catch(e => console.warn('initProfileSettings load error:', e));

  if (isProfileSettingsInitialized) return;
  isProfileSettingsInitialized = true;

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
      const activeUser = getCurrentUser();
      if (!activeUser) {
        showToast('Please sign in to save profile', 'error');
        return;
      }

      const displayName = displayNameInput ? displayNameInput.value.trim() : '';
      const bio = bioInput ? bioInput.value.trim() : '';
      const tagsRaw = tagsInput ? tagsInput.value.trim() : '';
      const tags = tagsRaw.split(/[\s,]+/).filter(Boolean).map(t => t.startsWith('#') ? t : `#${t}`);
      const avatarColor = selectedColor || generateAvatarColor(activeUser.username);

      saveProfileBtn.classList.add('btn-loading');
      saveProfileBtn.disabled = true;

      try {
        await db.collection('users').doc(activeUser.username).set({
          displayName,
          bio,
          tags,
          avatarColor,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await window.writeUserSearchIndex(activeUser.username, { displayName, bio, tags, avatarColor });

        if (tagsInput) tagsInput.value = tags.join(' ');

        const avatarEl = document.getElementById('userAvatar');
        const sidebarAvatarEl = document.getElementById('sidebarUserAvatar');
        const initial = (displayName || activeUser.username).charAt(0).toUpperCase();
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
