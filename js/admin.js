/**
 * Admin Module v4.0 — The Full-Fledged Command Center
 * Complete admin dashboard with user management, feedback system,
 * broadcast, room moderation, shares management, and audit logging.
 * Optimized Firebase: pagination, listener cleanup, cached stats.
 * Theme Aware: Seamless Light & Dark Mode design system support.
 */

// ============================================================
// GLOBAL STATE
// ============================================================
window.adminInitialized = false;
let broadcastSnapshotListener = null;
let adminListeners = []; // Track all listeners for cleanup

// Pagination state
const adminState = {
  users: { page: 1, perPage: 25, lastDoc: null, firstDoc: null, stack: [], allDocs: [] },
  feedback: { lastDoc: null, filter: 'all', selectedIds: new Set() },
  rooms: { lastDoc: null },
  shares: { lastDoc: null },
  logs: { lastDoc: null },
  broadcastType: 'announcement',
  statsCache: { data: null, timestamp: 0 }
};

// Confirmation modal resolver
let adminConfirmResolver = null;

// ============================================================
// CONFIRMATION MODAL
// ============================================================
function showAdminConfirm(title, desc, icon = 'warning') {
  return new Promise(resolve => {
    const modal = document.getElementById('adminConfirmModal');
    document.getElementById('adminConfirmTitle').textContent = title;
    document.getElementById('adminConfirmDesc').textContent = desc;
    document.getElementById('adminConfirmIcon').textContent = icon;
    modal.style.display = 'flex';
    adminConfirmResolver = resolve;
  });
}

function closeAdminConfirm(result) {
  document.getElementById('adminConfirmModal').style.display = 'none';
  if (adminConfirmResolver) {
    adminConfirmResolver(result);
    adminConfirmResolver = null;
  }
}

// ============================================================
// INITIALIZATION
// ============================================================
function initAdmin() {
  if (window.adminInitialized) {
    console.log('🛡️ Admin already initialized, skipping...');
    return;
  }

  const adminTabs = document.querySelectorAll('.admin-tab-btn');
  const adminSections = document.querySelectorAll('.admin-section');
  const sendBroadcastBtn = document.getElementById('adminSendBroadcastBtn');
  const broadcastInput = document.getElementById('adminBroadcastInput');
  const userSearch = document.getElementById('adminUserSearch');

  if (!adminTabs.length) {
    console.warn('🛡️ Admin tabs not found in DOM');
    return;
  }

  console.log('🛡️ Admin Command Center v4.0 Initializing...');

  // 1. Tab Switching
  adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.adminTab;
      if (!target) return;

      adminTabs.forEach(t => {
        const isActive = t === tab;
        t.classList.toggle('active', isActive);
      });

      adminSections.forEach(sec => {
        const sectionName = sec.id.replace('adminSection', '').toLowerCase();
        const isTarget = sectionName === target;
        sec.classList.toggle('hidden', !isTarget);
        if (isTarget) sec.classList.add('animate-editorialFadeIn');
      });

      // Load data for each tab
      switch (target) {
        case 'overview': loadAdminStats(); refreshAdminHealth(); loadRecentActivity(); break;
        case 'users': loadAdminUsers(); break;
        case 'feedback': loadAdminFeedback(); break;
        case 'broadcast': loadBroadcastHistory(); break;
        case 'rooms': loadAdminRooms(); break;
        case 'shares': loadAdminShares(); break;
        case 'logs': loadAdminLogs(); break;
      }
    });
  });

  // 2. Broadcast Setup
  if (sendBroadcastBtn && broadcastInput) {
    // Character count
    broadcastInput.addEventListener('input', () => {
      const count = broadcastInput.value.length;
      const countEl = document.getElementById('adminBroadcastCharCount');
      if (countEl) countEl.textContent = `${count}/500`;
    });

    // Type selector
    document.querySelectorAll('.admin-broadcast-type').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-broadcast-type').forEach(b => {
          b.classList.remove('active');
          b.classList.add('bg-surface-container-low', 'text-on-surface-variant', 'border-outline-variant/15');
        });
        btn.classList.add('active');
        btn.classList.remove('bg-surface-container-low', 'text-on-surface-variant', 'border-outline-variant/15');
        adminState.broadcastType = btn.dataset.type;
      });
    });

    // Send broadcast
    sendBroadcastBtn.addEventListener('click', async () => {
      const message = broadcastInput.value.trim();
      if (!message) {
        showToast('Message cannot be empty', 'warning');
        return;
      }

      sendBroadcastBtn.disabled = true;
      const originalHTML = sendBroadcastBtn.innerHTML;
      sendBroadcastBtn.innerHTML = '<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>';

      try {
        const broadcastData = {
          message: message,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          active: true,
          type: adminState.broadcastType
        };

        await db.collection('system').doc('broadcast').set(broadcastData);

        // Save to history
        await db.collection('system').doc('broadcast').collection('history').add({
          ...broadcastData,
          sentBy: getCurrentUser()?.username || 'admin'
        });

        showToast('Announcement broadcasted!', 'success');
        broadcastInput.value = '';
        document.getElementById('adminBroadcastCharCount').textContent = '0/500';

        logAdminAction('broadcast_sent', `Sent ${adminState.broadcastType}: "${message.substring(0, 60)}..."`);
        loadBroadcastHistory();
      } catch (err) {
        console.error('Broadcast failed:', err);
        showToast('Failed to broadcast', 'error');
      } finally {
        sendBroadcastBtn.disabled = false;
        sendBroadcastBtn.innerHTML = originalHTML;
      }
    });
  }

  // 3. User Search (debounced)
  if (userSearch) {
    userSearch.addEventListener('input', debounce((e) => {
      const q = e.target.value.toLowerCase();
      const userList = document.getElementById('adminUserList');
      if (!userList) return;
      const rows = userList.querySelectorAll('tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    }, 300));
  }

  // 4. Feedback Filters
  document.querySelectorAll('.admin-feedback-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-feedback-filter').forEach(b => {
        b.classList.remove('active');
        b.classList.add('bg-surface-container-low', 'text-on-surface-variant', 'border-outline-variant/15');
      });
      btn.classList.add('active');
      btn.classList.remove('bg-surface-container-low', 'text-on-surface-variant', 'border-outline-variant/15');
      adminState.feedback.filter = btn.dataset.filter;
      adminState.feedback.lastDoc = null;
      loadAdminFeedback();
    });
  });

  // Initial data load
  loadAdminStats();
  refreshAdminHealth();
  loadRecentActivity();
  initCurrentBroadcastListener();

  window.adminInitialized = true;
  console.log('🛡️ Admin Command Center v4.0 Fully Initialized');
}

// ============================================================
// STATS — Cached client-side counting
// ============================================================
async function loadAdminStats() {
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();

  // Use cache if fresh
  if (adminState.statsCache.data && (now - adminState.statsCache.timestamp) < CACHE_TTL) {
    applyStats(adminState.statsCache.data);
    return;
  }

  try {
    const [usersSnap, sharesSnap, feedbackSnap, roomsSnap] = await Promise.allSettled([
      db.collection('users').get(),
      db.collection('shares').get(),
      db.collection('feedback').get(),
      db.collection('convo_rooms').get()
    ]);

    const stats = {
      users: usersSnap.status === 'fulfilled' ? usersSnap.value.size : 0,
      notes: sharesSnap.status === 'fulfilled' ? sharesSnap.value.size : 0,
      feedback: feedbackSnap.status === 'fulfilled' ? feedbackSnap.value.size : 0,
      rooms: roomsSnap.status === 'fulfilled' ? roomsSnap.value.size : 0
    };

    adminState.statsCache = { data: stats, timestamp: now };
    applyStats(stats);
  } catch (e) {
    console.error('Stats load failed:', e);
  }
}

function refreshAdminStats() {
  adminState.statsCache.timestamp = 0; // Force refresh
  loadAdminStats();
  showToast('Stats refreshed', 'success');
}

function applyStats(stats) {
  animateCounter('adminStatUsers', stats.users);
  animateCounter('adminStatNotes', stats.notes);
  animateCounter('adminStatFeedback', stats.feedback);
  animateCounter('adminStatRooms', stats.rooms);
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = parseInt(el.textContent) || 0;
  if (el.textContent === '—') current = 0;
  if (current === target) { el.textContent = target; return; }

  const duration = 800;
  const startTime = performance.now();
  const startValue = current;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(startValue + (target - startValue) * easeProgress);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  }
  requestAnimationFrame(update);
}

// ============================================================
// SYSTEM HEALTH — Real metrics
// ============================================================
async function refreshAdminHealth() {
  // 1. Firestore latency
  const apiEl = document.getElementById('adminHealthApi');
  const apiIcon = document.getElementById('adminHealthApiIcon');
  const healthDot = document.getElementById('adminHealthDot');

  try {
    if (typeof window.measureFirestoreLatency === 'function') {
      const ms = await window.measureFirestoreLatency();
      if (ms !== null) {
        apiEl.textContent = `Connected • ${ms}ms latency`;
        apiIcon.style.background = 'rgba(34,197,94,0.1)';
        apiIcon.style.color = '#22c55e';
        healthDot.style.background = '#22c55e';
      } else {
        apiEl.textContent = 'Connection Error';
        apiIcon.style.background = 'rgba(239,68,68,0.1)';
        apiIcon.style.color = '#ef4444';
        healthDot.style.background = '#ef4444';
      }
    }
  } catch (e) {
    apiEl.textContent = 'Error measuring';
  }

  // 2. Auth status
  const authEl = document.getElementById('adminHealthAuth');
  const authIcon = document.getElementById('adminHealthAuthIcon');
  const user = firebase.auth().currentUser;
  if (user) {
    authEl.textContent = `Active • ${user.email}`;
    authIcon.style.background = 'rgba(34,197,94,0.1)';
    authIcon.style.color = '#22c55e';
  } else {
    authEl.textContent = 'Not authenticated';
    authIcon.style.background = 'rgba(239,68,68,0.1)';
    authIcon.style.color = '#ef4444';
  }

  // 3. Cache status
  const cacheEl = document.getElementById('adminHealthCache');
  const cacheIcon = document.getElementById('adminHealthCacheIcon');
  if (window.firebaseConnectionState?.persistence) {
    cacheEl.textContent = 'Enabled • IndexedDB';
    cacheIcon.style.background = 'rgba(34,197,94,0.1)';
    cacheIcon.style.color = '#22c55e';
  } else {
    cacheEl.textContent = 'Not available';
    cacheIcon.style.background = 'rgba(234,179,8,0.1)';
    cacheIcon.style.color = '#eab308';
  }
}

// ============================================================
// RECENT ACTIVITY FEED
// ============================================================
async function loadRecentActivity() {
  const container = document.getElementById('adminRecentActivity');
  if (!container) return;

  try {
    const [recentUsers, recentShares, recentFeedback] = await Promise.allSettled([
      db.collection('users').orderBy('createdAt', 'desc').limit(5).get(),
      db.collection('shares').orderBy('createdAt', 'desc').limit(5).get(),
      db.collection('feedback').orderBy('timestamp', 'desc').limit(5).get()
    ]);

    const activities = [];

    if (recentUsers.status === 'fulfilled') {
      recentUsers.value.docs.forEach(doc => {
        const d = doc.data();
        activities.push({
          icon: 'person_add',
          color: 'blue',
          text: `<b>${escapeHTML(d.username || doc.id)}</b> joined`,
          time: d.createdAt
        });
      });
    }

    if (recentShares.status === 'fulfilled') {
      recentShares.value.docs.forEach(doc => {
        const d = doc.data();
        activities.push({
          icon: 'share',
          color: 'emerald',
          text: `New ${d.type || 'text'} shared — <code class="bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant font-mono text-[10px]">${doc.id}</code>`,
          time: d.createdAt
        });
      });
    }

    if (recentFeedback.status === 'fulfilled') {
      recentFeedback.value.docs.forEach(doc => {
        const d = doc.data();
        activities.push({
          icon: 'feedback',
          color: 'amber',
          text: `Feedback from <b>${escapeHTML(d.username || 'anonymous')}</b>`,
          time: d.timestamp
        });
      });
    }

    activities.sort((a, b) => {
      const timeA = a.time?.toDate ? a.time.toDate().getTime() : 0;
      const timeB = b.time?.toDate ? b.time.toDate().getTime() : 0;
      return timeB - timeA;
    });

    if (activities.length === 0) {
      container.innerHTML = '<p class="text-center text-on-surface-variant/40 text-xs italic py-8">No recent activity</p>';
      return;
    }

    const colorMap = {
      blue: 'bg-blue-500/10 text-blue-500',
      emerald: 'bg-emerald-500/10 text-emerald-500',
      amber: 'bg-amber-500/10 text-amber-500'
    };

    container.innerHTML = activities.slice(0, 10).map(a => `
      <div class="flex items-center gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 hover:border-outline-variant/20 transition-all">
        <div class="w-9 h-9 rounded-full ${colorMap[a.color] || 'bg-surface-container-high text-on-surface-variant'} flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-base">${a.icon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[11px] text-on-surface">${a.text}</p>
        </div>
        <span class="text-[9px] text-on-surface-variant/60 font-bold uppercase tracking-wider whitespace-nowrap">${a.time ? formatTimestamp(a.time) : '—'}</span>
      </div>
    `).join('');
  } catch (e) {
    console.error('Activity load failed:', e);
    container.innerHTML = '<p class="text-center text-error/50 text-xs py-8">Failed to load activity</p>';
  }
}

// ============================================================
// BROADCAST LISTENER & HISTORY
// ============================================================
function initCurrentBroadcastListener() {
  if (broadcastSnapshotListener) return;
  const container = document.getElementById('adminCurrentBroadcast');
  if (!container) return;

  broadcastSnapshotListener = db.collection('system').doc('broadcast').onSnapshot(doc => {
    if (!doc.exists || !doc.data().active) {
      container.innerHTML = `
        <div class="bg-surface-container-lowest p-10 rounded-[28px] border border-outline-variant/15 editorial-shadow flex flex-col items-center justify-center text-center space-y-3">
          <span class="material-symbols-outlined text-3xl text-on-surface-variant/30">notifications_off</span>
          <p class="text-on-surface-variant/50 italic text-xs">No active announcements currently broadcasting.</p>
        </div>`;
      return;
    }

    const data = doc.data();
    const typeEmoji = { announcement: '📢', warning: '⚠️', update: '🚀', maintenance: '🔧' };
    container.innerHTML = `
      <div class="bg-surface-container-lowest p-8 rounded-[28px] border border-outline-variant/15 editorial-shadow space-y-6 animate-editorialFadeIn relative overflow-hidden">
        <div class="absolute top-0 right-0 p-6">
          <span class="flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
          </span>
        </div>
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center text-error shadow-inner">
              <span class="material-symbols-outlined text-xl">campaign</span>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold">${typeEmoji[data.type] || '📢'} Live ${data.type || 'announcement'}</p>
              <p class="text-[10px] text-on-surface-variant/60 uppercase tracking-widest font-bold">${data.timestamp ? formatTimestamp(data.timestamp) : 'Just now'}</p>
            </div>
          </div>
          <button class="w-10 h-10 rounded-xl bg-surface-container-low text-on-surface-variant hover:text-error hover:bg-error/10 transition-all flex items-center justify-center border border-outline-variant/15" onclick="deactivateBroadcast()">
            <span class="material-symbols-outlined text-lg">cancel</span>
          </button>
        </div>
        <div class="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10">
          <p class="text-on-surface italic leading-relaxed text-sm">"${escapeHTML(data.message)}"</p>
        </div>
      </div>`;
  }, err => {
    console.error('Broadcast listener failed:', err);
  });

  adminListeners.push(broadcastSnapshotListener);
}

async function deactivateBroadcast() {
  const confirmed = await showAdminConfirm('Retract Announcement?', 'This will remove the broadcast from all users immediately.');
  if (!confirmed) return;
  try {
    await db.collection('system').doc('broadcast').update({ active: false });
    showToast('Broadcast terminated', 'info');
    logAdminAction('broadcast_retracted', 'Retracted active broadcast');
  } catch (e) {
    console.error('Deactivation failed:', e);
    showToast('Operation failed', 'error');
  }
}

async function loadBroadcastHistory() {
  const container = document.getElementById('adminBroadcastHistory');
  if (!container) return;

  try {
    const snap = await db.collection('system').doc('broadcast').collection('history')
      .orderBy('timestamp', 'desc').limit(20).get();

    if (snap.empty) {
      container.innerHTML = '<p class="text-center text-on-surface-variant/40 text-xs italic py-6">No previous broadcasts</p>';
      return;
    }

    container.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const typeEmoji = { announcement: '📢', warning: '⚠️', update: '🚀', maintenance: '🔧' };
      return `
        <div class="flex items-start gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
          <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant flex-shrink-0 mt-0.5">
            <span class="text-sm">${typeEmoji[d.type] || '📢'}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[11px] text-on-surface leading-relaxed">${escapeHTML(d.message || '')}</p>
            <div class="flex items-center gap-3 mt-2">
              <span class="text-[9px] text-on-surface-variant/60 font-bold uppercase tracking-wider">${d.timestamp ? formatTimestamp(d.timestamp) : '—'}</span>
              <span class="text-[9px] text-on-surface-variant/40">by ${escapeHTML(d.sentBy || 'admin')}</span>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    console.error('Broadcast history load failed:', e);
    container.innerHTML = '<p class="text-center text-error/50 text-xs py-6">Failed to load history</p>';
  }
}

// ============================================================
// FEEDBACK — Enhanced with filters, reply, bulk
// ============================================================
async function loadAdminFeedback() {
  const feedbackList = document.getElementById('adminFeedbackListExpanded');
  if (!feedbackList) return;
  feedbackList.innerHTML = '<div class="py-16 flex justify-center col-span-full"><div class="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>';

  try {
    let query = db.collection('feedback').orderBy('timestamp', 'desc');

    if (adminState.feedback.lastDoc) {
      query = query.startAfter(adminState.feedback.lastDoc);
    }

    const snapshot = await query.limit(20).get();

    if (snapshot.empty && !adminState.feedback.lastDoc) {
      feedbackList.innerHTML = `
        <div class="py-16 text-center text-on-surface-variant/40 italic text-xs flex flex-col items-center gap-3 col-span-full">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant/20">inbox</span>
          No feedback yet.
        </div>`;
      document.getElementById('adminFeedbackCount').textContent = '0 items';
      return;
    }

    if (!adminState.feedback.lastDoc) feedbackList.innerHTML = '';

    const filter = adminState.feedback.filter;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const msg = data.message || '';

      const catMatch = msg.match(/^\[(\w+)\]/i);
      const category = catMatch ? catMatch[1].toLowerCase() : 'general';

      if (filter !== 'all' && category !== filter) return;

      const item = document.createElement('div');
      item.className = 'bg-surface-container-lowest p-6 rounded-[28px] border border-outline-variant/15 space-y-4 group hover:border-outline-variant/30 transition-all editorial-shadow';
      item.dataset.feedbackId = doc.id;
      item.dataset.category = category;

      const catColors = {
        general: 'bg-surface-container-high text-on-surface-variant',
        bug: 'bg-red-500/10 text-red-500',
        feature: 'bg-blue-500/10 text-blue-500',
        praise: 'bg-emerald-500/10 text-emerald-500'
      };

      const cleanMsg = msg.replace(/^\[\w+\]\s*/i, '');

      item.innerHTML = `
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface font-bold border border-outline-variant/15 text-sm">
              ${(data.username || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p class="font-bold text-on-surface text-xs">${escapeHTML(data.username || 'Anonymous')}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-[9px] text-on-surface-variant/60 font-bold uppercase tracking-wider">${data.timestamp ? formatTimestamp(data.timestamp) : '—'}</span>
                <span class="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${catColors[category] || catColors.general}">${category}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            ${data.resolved ? '<span class="text-[9px] text-emerald-500 font-bold uppercase">✓ Resolved</span>' : ''}
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all" onclick="markFeedbackResolved('${doc.id}', ${!data.resolved})" title="${data.resolved ? 'Mark unresolved' : 'Mark resolved'}">
              <span class="material-symbols-outlined text-base">${data.resolved ? 'check_circle' : 'radio_button_unchecked'}</span>
            </button>
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:bg-blue-500/10 hover:text-blue-500 transition-all" onclick="replyToFeedback('${doc.id}', '${escapeHTML(data.username || '')}')" title="Reply">
              <span class="material-symbols-outlined text-base">reply</span>
            </button>
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:bg-error/10 hover:text-error transition-all" onclick="deleteFeedback('${doc.id}')" title="Delete">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        </div>
        <div class="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
          <p class="text-[11px] text-on-surface leading-relaxed whitespace-pre-wrap">${escapeHTML(cleanMsg)}</p>
        </div>`;
      feedbackList.appendChild(item);
    });

    document.getElementById('adminFeedbackCount').textContent = `${feedbackList.children.length} items`;

    if (snapshot.docs.length >= 20) {
      adminState.feedback.lastDoc = snapshot.docs[snapshot.docs.length - 1];
      document.getElementById('adminFeedbackPagination').style.display = 'flex';
    } else {
      document.getElementById('adminFeedbackPagination').style.display = 'none';
    }
  } catch (e) {
    console.error('Feedback load failed:', e);
    feedbackList.innerHTML = '<div class="py-16 text-center text-error/50 col-span-full text-xs">Failed to load feedback.</div>';
  }
}

function loadMoreAdminFeedback() {
  loadAdminFeedback();
}

async function deleteFeedback(id) {
  const confirmed = await showAdminConfirm('Delete Feedback?', 'This feedback will be permanently removed.');
  if (!confirmed) return;
  try {
    await db.collection('feedback').doc(id).delete();
    showToast('Feedback deleted', 'info');
    logAdminAction('feedback_deleted', `Deleted feedback ${id}`);
    adminState.feedback.lastDoc = null;
    adminState.statsCache.timestamp = 0;
    loadAdminFeedback();
    loadAdminStats();
  } catch (e) {
    console.error('Deletion failed:', e);
    showToast('Operation failed', 'error');
  }
}

async function markFeedbackResolved(id, resolved) {
  try {
    await db.collection('feedback').doc(id).update({ resolved });
    showToast(resolved ? 'Marked as resolved' : 'Marked as unresolved', 'success');
    logAdminAction('feedback_resolved', `${resolved ? 'Resolved' : 'Unresolved'} feedback ${id}`);
    adminState.feedback.lastDoc = null;
    loadAdminFeedback();
  } catch (e) {
    console.error('Resolve toggle failed:', e);
    showToast('Operation failed', 'error');
  }
}

async function replyToFeedback(feedbackId, username) {
  if (!username) {
    showToast('Cannot reply to anonymous feedback', 'warning');
    return;
  }

  const message = prompt(`Reply to ${username}:`);
  if (!message || !message.trim()) return;

  try {
    const currentUser = getCurrentUser();
    await db.collection('users').doc(username).collection('inbox').add({
      type: 'message',
      from: currentUser?.username || 'admin',
      message: `[Admin Reply] ${message.trim()}`,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    showToast(`Reply sent to ${username}!`, 'success');
    logAdminAction('feedback_replied', `Replied to ${username}'s feedback`);
  } catch (e) {
    console.error('Reply failed:', e);
    showToast('Failed to send reply', 'error');
  }
}

async function adminBulkDeleteFeedback() {
  const selected = document.querySelectorAll('.admin-feedback-checkbox:checked');
  if (!selected.length) {
    showToast('No feedback selected', 'warning');
    return;
  }

  const confirmed = await showAdminConfirm('Delete Selected?', `${selected.length} feedback items will be permanently deleted.`);
  if (!confirmed) return;

  try {
    const batch = db.batch();
    selected.forEach(cb => {
      batch.delete(db.collection('feedback').doc(cb.dataset.id));
    });
    await batch.commit();
    showToast(`${selected.length} items deleted`, 'success');
    logAdminAction('feedback_bulk_delete', `Bulk deleted ${selected.length} feedback items`);
    adminState.feedback.lastDoc = null;
    adminState.statsCache.timestamp = 0;
    loadAdminFeedback();
    loadAdminStats();
  } catch (e) {
    console.error('Bulk delete failed:', e);
    showToast('Bulk delete failed', 'error');
  }
}

// ============================================================
// USERS — Full management with pagination
// ============================================================
async function loadAdminUsers(reset = true) {
  const userList = document.getElementById('adminUserList');
  if (!userList) return;
  userList.innerHTML = '<tr><td colspan="7" class="py-16 text-center"><div class="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div></td></tr>';

  try {
    let query = db.collection('users').orderBy('createdAt', 'desc').limit(adminState.users.perPage);

    if (!reset && adminState.users.lastDoc) {
      query = query.startAfter(adminState.users.lastDoc);
    }

    if (reset) {
      adminState.users.page = 1;
      adminState.users.stack = [];
      adminState.users.lastDoc = null;
    }

    const snapshot = await query.get();
    userList.innerHTML = '';

    if (snapshot.empty) {
      userList.innerHTML = '<tr><td colspan="7" class="py-16 text-center text-on-surface-variant/40 italic text-xs">No users found.</td></tr>';
      return;
    }

    const currentAdmin = getCurrentUser()?.username;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const isCurrentAdmin = doc.id === currentAdmin;
      const isBanned = data.banned === true;

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-surface-container-low/60 transition-colors';
      tr.innerHTML = `
        <td class="px-6 py-4"><input type="checkbox" class="admin-user-checkbox rounded border-outline-variant/30" data-uid="${doc.id}" ${isCurrentAdmin ? 'disabled' : ''}></td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface font-bold border border-outline-variant/15 text-xs">
              ${(data.username || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p class="font-bold text-on-surface text-xs">${escapeHTML(data.username || doc.id)}</p>
              ${data.displayName ? `<p class="text-[9px] text-on-surface-variant/60">${escapeHTML(data.displayName)}</p>` : ''}
            </div>
          </div>
        </td>
        <td class="px-6 py-4 text-on-surface-variant text-[10px]">${escapeHTML(data.email || '—')}</td>
        <td class="px-6 py-4">
          <span class="px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider ${data.role === 'admin' ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant'}">
            ${data.role || 'member'}
          </span>
        </td>
        <td class="px-6 py-4">
          <span class="px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider ${isBanned ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}">
            ${isBanned ? 'Banned' : 'Active'}
          </span>
        </td>
        <td class="px-6 py-4 text-on-surface-variant/70 font-bold uppercase tracking-wider text-[9px]">
          ${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleDateString() : '—'}
        </td>
        <td class="px-6 py-4 text-right">
          ${isCurrentAdmin ? '<span class="text-[9px] text-on-surface-variant/40 italic">You</span>' : `
          <div class="flex items-center justify-end gap-1">
            <button class="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:bg-surface-container-high hover:text-on-surface transition-all" onclick="toggleUserRole('${doc.id}', '${data.role === 'admin' ? 'member' : 'admin'}')" title="${data.role === 'admin' ? 'Demote to member' : 'Promote to admin'}">
              <span class="material-symbols-outlined text-sm">${data.role === 'admin' ? 'arrow_downward' : 'arrow_upward'}</span>
            </button>
            <button class="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:bg-amber-500/10 hover:text-amber-500 transition-all" onclick="toggleUserBan('${doc.id}', ${!isBanned})" title="${isBanned ? 'Unban' : 'Ban'}">
              <span class="material-symbols-outlined text-sm">${isBanned ? 'lock_open' : 'block'}</span>
            </button>
            <button class="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:bg-error/10 hover:text-error transition-all" onclick="deleteUser('${doc.id}')" title="Delete user">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>`}
        </td>`;
      userList.appendChild(tr);
    });

    adminState.users.allDocs = snapshot.docs;
    adminState.users.lastDoc = snapshot.docs[snapshot.docs.length - 1];
    adminState.users.firstDoc = snapshot.docs[0];

    document.getElementById('adminUserCount').textContent = `${snapshot.size}+ users`;
    document.getElementById('adminUserPageInfo').textContent = `Page ${adminState.users.page}`;
    document.getElementById('adminUserPrevBtn').disabled = adminState.users.page <= 1;
    document.getElementById('adminUserNextBtn').disabled = snapshot.docs.length < adminState.users.perPage;
  } catch (e) {
    console.error('User load failed:', e);
    userList.innerHTML = '<tr><td colspan="7" class="py-10 text-center text-error/50 text-xs">Failed to load users.</td></tr>';
  }
}

function adminUsersNextPage() {
  if (adminState.users.lastDoc) {
    adminState.users.stack.push(adminState.users.firstDoc);
    adminState.users.page++;
    loadAdminUsers(false);
  }
}

async function adminUsersPrevPage() {
  if (adminState.users.page > 1 && adminState.users.stack.length > 0) {
    adminState.users.page--;
    const prevFirst = adminState.users.stack.pop();
    try {
      const snapshot = await db.collection('users')
        .orderBy('createdAt', 'desc')
        .startAt(prevFirst)
        .limit(adminState.users.perPage)
        .get();

      const userList = document.getElementById('adminUserList');
      userList.innerHTML = '';
      adminState.users.lastDoc = prevFirst;
      loadAdminUsers(false);
    } catch (e) {
      console.error('Prev page failed:', e);
    }
  }
}

function adminToggleAllUsers(checkbox) {
  document.querySelectorAll('.admin-user-checkbox:not(:disabled)').forEach(cb => {
    cb.checked = checkbox.checked;
  });
}

async function toggleUserRole(userId, newRole) {
  const action = newRole === 'admin' ? 'Promote to Admin' : 'Demote to Member';
  const confirmed = await showAdminConfirm(`${action}?`, `User "${userId}" will be ${newRole === 'admin' ? 'promoted to admin' : 'demoted to member'}.`);
  if (!confirmed) return;

  try {
    await db.collection('users').doc(userId).update({ role: newRole });
    showToast(`${userId} is now ${newRole}`, 'success');
    logAdminAction('role_changed', `Changed ${userId} role to ${newRole}`);
    loadAdminUsers();
  } catch (e) {
    console.error('Role change failed:', e);
    showToast('Failed to change role', 'error');
  }
}

async function toggleUserBan(userId, ban) {
  const action = ban ? 'Ban User' : 'Unban User';
  const confirmed = await showAdminConfirm(`${action}?`, `User "${userId}" will be ${ban ? 'banned from the platform' : 'unbanned and allowed access'}.`);
  if (!confirmed) return;

  try {
    await db.collection('users').doc(userId).update({ banned: ban });
    showToast(`${userId} ${ban ? 'banned' : 'unbanned'}`, ban ? 'warning' : 'success');
    logAdminAction(ban ? 'user_banned' : 'user_unbanned', `${ban ? 'Banned' : 'Unbanned'} user ${userId}`);
    loadAdminUsers();
  } catch (e) {
    console.error('Ban toggle failed:', e);
    showToast('Operation failed', 'error');
  }
}

async function deleteUser(userId) {
  const confirmed = await showAdminConfirm('Delete User?', `User "${userId}" and all their data will be permanently deleted. This cannot be undone.`, 'delete_forever');
  if (!confirmed) return;

  try {
    const subcols = ['savedNotes', 'history', 'inbox', 'files'];
    for (const sub of subcols) {
      try {
        const docs = await db.collection('users').doc(userId).collection(sub).limit(200).get();
        if (!docs.empty) {
          const batch = db.batch();
          docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) { }
    }

    try { await db.collection('userSearch').doc(userId).delete(); } catch (e) { }
    await db.collection('users').doc(userId).delete();

    showToast(`User ${userId} deleted`, 'warning');
    logAdminAction('user_deleted', `Deleted user ${userId} and subcollections`);
    adminState.statsCache.timestamp = 0;
    loadAdminUsers();
    loadAdminStats();
  } catch (e) {
    console.error('User deletion failed:', e);
    showToast('Failed to delete user', 'error');
  }
}

async function adminExportUsersCSV() {
  showToast('Exporting users...', 'info');
  try {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    if (snapshot.empty) {
      showToast('No users to export', 'warning');
      return;
    }

    const headers = ['Username', 'Email', 'Role', 'Status', 'Registered'];
    const rows = snapshot.docs.map(doc => {
      const d = doc.data();
      return [
        doc.id,
        d.email || '',
        d.role || 'member',
        d.banned ? 'Banned' : 'Active',
        d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enotpad_users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`Exported ${snapshot.size} users`, 'success');
    logAdminAction('users_exported', `Exported ${snapshot.size} users to CSV`);
  } catch (e) {
    console.error('Export failed:', e);
    showToast('Export failed', 'error');
  }
}

// ============================================================
// ROOMS — Full Management
// ============================================================
async function loadAdminRooms(reset = true) {
  const container = document.getElementById('adminRoomList');
  if (!container) return;

  if (reset) {
    container.innerHTML = '<div class="col-span-full py-16 flex justify-center"><div class="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>';
    adminState.rooms.lastDoc = null;
  }

  try {
    let query = db.collection('convo_rooms').orderBy('createdAt', 'desc').limit(20);
    if (adminState.rooms.lastDoc) {
      query = query.startAfter(adminState.rooms.lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty && !adminState.rooms.lastDoc) {
      container.innerHTML = `
        <div class="col-span-full py-16 flex flex-col items-center gap-3 text-center">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant/20">forum</span>
          <p class="text-on-surface-variant/40 italic text-xs">No active rooms</p>
        </div>`;
      document.getElementById('adminRoomCount').textContent = '0 rooms';
      return;
    }

    if (reset) container.innerHTML = '';
    const now = new Date();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const expired = data.expiresAt?.toDate ? data.expiresAt.toDate() < now : false;

      const card = document.createElement('div');
      card.className = `bg-surface-container-lowest p-6 rounded-[28px] border ${expired ? 'border-error/20' : 'border-outline-variant/15'} space-y-4 hover:border-outline-variant/30 transition-all editorial-shadow`;
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full ${expired ? 'bg-error/10 text-error' : 'bg-purple-500/10 text-purple-500'} flex items-center justify-center">
              <span class="material-symbols-outlined text-lg">chat_bubble</span>
            </div>
            <div>
              <p class="font-bold text-on-surface text-xs">${escapeHTML(data.name || doc.id)}</p>
              <p class="text-[9px] text-on-surface-variant uppercase tracking-wider">by ${escapeHTML(data.createdBy || 'unknown')}</p>
            </div>
          </div>
          ${expired ? '<span class="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-error/10 text-error">Expired</span>' : '<span class="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-emerald-500/10 text-emerald-500">Active</span>'}
        </div>
        <div class="flex items-center gap-4 text-[9px] text-on-surface-variant/60 font-bold uppercase tracking-wider">
          <span>Created: ${data.createdAt ? formatTimestamp(data.createdAt) : '—'}</span>
          <span>Expires: ${data.expiresAt?.toDate ? data.expiresAt.toDate().toLocaleString() : '—'}</span>
        </div>
        <div class="flex items-center gap-2 justify-end">
          <button class="px-3 py-1.5 rounded-xl text-[10px] font-bold text-on-surface-variant hover:text-primary border border-outline-variant/15 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center gap-1" onclick="viewRoomMessages('${doc.id}', '${escapeHTML(data.name || doc.id)}')">
            <span class="material-symbols-outlined text-sm">visibility</span> View
          </button>
          <button class="px-3 py-1.5 rounded-xl text-[10px] font-bold text-on-surface-variant hover:text-error border border-outline-variant/15 hover:border-error/30 hover:bg-error/5 transition-all flex items-center gap-1" onclick="deleteRoom('${doc.id}')">
            <span class="material-symbols-outlined text-sm">delete</span> Delete
          </button>
        </div>`;
      container.appendChild(card);
    });

    document.getElementById('adminRoomCount').textContent = `${container.children.length} rooms`;

    if (snapshot.docs.length >= 20) {
      adminState.rooms.lastDoc = snapshot.docs[snapshot.docs.length - 1];
      document.getElementById('adminRoomPagination').style.display = 'flex';
    } else {
      document.getElementById('adminRoomPagination').style.display = 'none';
    }
  } catch (e) {
    console.error('Rooms load failed:', e);
    container.innerHTML = '<div class="col-span-full py-16 text-center text-error/50 text-xs">Failed to load rooms.</div>';
  }
}

function loadMoreAdminRooms() { loadAdminRooms(false); }

async function viewRoomMessages(roomId, roomName) {
  const modal = document.getElementById('adminRoomViewerModal');
  const title = document.getElementById('adminRoomViewerTitle');
  const sub = document.getElementById('adminRoomViewerSub');
  const msgContainer = document.getElementById('adminRoomViewerMessages');

  title.textContent = roomName || 'Room Messages';
  sub.textContent = `Room ID: ${roomId}`;
  msgContainer.innerHTML = '<div class="py-8 flex justify-center"><div class="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>';
  modal.style.display = 'flex';

  try {
    const snap = await db.collection('convo_rooms').doc(roomId).collection('messages')
      .orderBy('timestamp', 'asc').limit(100).get();

    if (snap.empty) {
      msgContainer.innerHTML = '<p class="text-center text-on-surface-variant/40 text-xs italic py-8">No messages in this room</p>';
      return;
    }

    msgContainer.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `
        <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-all">
          <div class="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface font-bold text-[10px] flex-shrink-0 mt-0.5">
            ${(d.username || '?').charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold text-on-surface">${escapeHTML(d.username || 'anon')}</span>
              <span class="text-[9px] text-on-surface-variant/40">${d.timestamp ? formatTimestamp(d.timestamp) : ''}</span>
            </div>
            <p class="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed break-words">${escapeHTML(d.text || d.message || '')}</p>
          </div>
        </div>`;
    }).join('');

    msgContainer.scrollTop = msgContainer.scrollHeight;
  } catch (e) {
    console.error('Room messages load failed:', e);
    msgContainer.innerHTML = '<p class="text-center text-error/50 text-xs py-8">Failed to load messages</p>';
  }
}

function closeAdminRoomViewer() {
  document.getElementById('adminRoomViewerModal').style.display = 'none';
}

async function deleteRoom(roomId) {
  const confirmed = await showAdminConfirm('Delete Room?', 'This room and all messages will be permanently deleted.');
  if (!confirmed) return;

  try {
    const msgs = await db.collection('convo_rooms').doc(roomId).collection('messages').limit(500).get();
    if (!msgs.empty) {
      const batch = db.batch();
      msgs.forEach(m => batch.delete(m.ref));
      await batch.commit();
    }

    await db.collection('convo_rooms').doc(roomId).delete();
    showToast('Room deleted', 'warning');
    logAdminAction('room_deleted', `Deleted room ${roomId}`);
    adminState.statsCache.timestamp = 0;
    adminState.rooms.lastDoc = null;
    loadAdminRooms();
    loadAdminStats();
  } catch (e) {
    console.error('Room deletion failed:', e);
    showToast('Failed to delete room', 'error');
  }
}

async function adminBulkDeleteExpiredRooms() {
  const confirmed = await showAdminConfirm('Cleanup Expired Rooms?', 'All expired conversation rooms and their messages will be deleted.');
  if (!confirmed) return;

  showToast('Cleaning up expired rooms...', 'info');

  try {
    const now = firebase.firestore.Timestamp.now();
    const snap = await db.collection('convo_rooms').where('expiresAt', '<=', now).limit(50).get();

    if (snap.empty) {
      showToast('No expired rooms found', 'info');
      return;
    }

    let deleted = 0;
    for (const doc of snap.docs) {
      try {
        const msgs = await doc.ref.collection('messages').limit(200).get();
        if (!msgs.empty) {
          const batch = db.batch();
          msgs.forEach(m => batch.delete(m.ref));
          await batch.commit();
        }
        await doc.ref.delete();
        deleted++;
      } catch (e) { }
    }

    showToast(`Cleaned up ${deleted} expired rooms`, 'success');
    logAdminAction('rooms_bulk_cleanup', `Cleaned up ${deleted} expired rooms`);
    adminState.statsCache.timestamp = 0;
    adminState.rooms.lastDoc = null;
    loadAdminRooms();
    loadAdminStats();
  } catch (e) {
    console.error('Bulk cleanup failed:', e);
    showToast('Cleanup failed', 'error');
  }
}

// ============================================================
// SHARES — Management
// ============================================================
async function loadAdminShares(reset = true) {
  const shareList = document.getElementById('adminShareList');
  if (!shareList) return;

  if (reset) {
    shareList.innerHTML = '<tr><td colspan="6" class="py-16 text-center"><div class="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div></td></tr>';
    adminState.shares.lastDoc = null;
  }

  try {
    let query = db.collection('shares').orderBy('createdAt', 'desc').limit(30);
    if (adminState.shares.lastDoc) {
      query = query.startAfter(adminState.shares.lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty && !adminState.shares.lastDoc) {
      shareList.innerHTML = '<tr><td colspan="6" class="py-16 text-center text-on-surface-variant/40 italic text-xs">No active shares</td></tr>';
      document.getElementById('adminShareCount').textContent = '0 shares';
      return;
    }

    if (reset) shareList.innerHTML = '';
    const now = new Date();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const expired = data.expiresAt?.toDate ? data.expiresAt.toDate() < now : false;
      const typeIcons = { text: '📝', link: '🔗', image: '🖼️' };

      let preview = '';
      if (data.type === 'text') {
        preview = (data.content || '').substring(0, 50);
      } else if (data.type === 'link') {
        const links = Array.isArray(data.content) ? data.content : [data.content];
        preview = links[0]?.substring(0, 50) || '';
      } else if (data.type === 'image') {
        preview = '[Image data]';
      }

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-surface-container-low/60 transition-colors';
      tr.innerHTML = `
        <td class="px-6 py-4">
          <code class="text-[11px] text-on-surface bg-surface-container-low px-2 py-1 rounded font-mono border border-outline-variant/10">${doc.id}</code>
        </td>
        <td class="px-6 py-4">
          <span class="text-sm">${typeIcons[data.type] || '📄'}</span>
          <span class="text-[10px] text-on-surface-variant ml-1 uppercase">${data.type || 'text'}</span>
        </td>
        <td class="px-6 py-4 text-[10px] text-on-surface-variant max-w-[200px] truncate">${escapeHTML(preview)}</td>
        <td class="px-6 py-4 text-[9px] text-on-surface-variant/60 uppercase tracking-wider font-bold">${data.createdAt ? formatTimestamp(data.createdAt) : '—'}</td>
        <td class="px-6 py-4">
          <span class="text-[9px] font-bold uppercase tracking-wider ${expired ? 'text-error' : 'text-on-surface-variant/60'}">
            ${data.expiresAt?.toDate ? (expired ? 'Expired' : formatTimestamp(data.expiresAt)) : '—'}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <button class="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:bg-error/10 hover:text-error transition-all" onclick="deleteShare('${doc.id}')" title="Delete">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </td>`;
      shareList.appendChild(tr);
    });

    document.getElementById('adminShareCount').textContent = `${shareList.children.length} shares`;

    if (snapshot.docs.length >= 30) {
      adminState.shares.lastDoc = snapshot.docs[snapshot.docs.length - 1];
      document.getElementById('adminSharePagination').style.display = 'flex';
    } else {
      document.getElementById('adminSharePagination').style.display = 'none';
    }
  } catch (e) {
    console.error('Shares load failed:', e);
    shareList.innerHTML = '<tr><td colspan="6" class="py-16 text-center text-error/50 text-xs">Failed to load shares.</td></tr>';
  }
}

function loadMoreAdminShares() { loadAdminShares(false); }

async function deleteShare(code) {
  const confirmed = await showAdminConfirm('Delete Share?', `Share code "${code}" will be permanently deleted.`);
  if (!confirmed) return;

  try {
    await db.collection('shares').doc(code).delete();
    showToast('Share deleted', 'info');
    logAdminAction('share_deleted', `Deleted share ${code}`);
    adminState.statsCache.timestamp = 0;
    adminState.shares.lastDoc = null;
    loadAdminShares();
    loadAdminStats();
  } catch (e) {
    console.error('Share deletion failed:', e);
    showToast('Failed to delete share', 'error');
  }
}

async function adminCleanupExpired() {
  const confirmed = await showAdminConfirm('Cleanup All Expired?', 'All expired shares and rooms will be permanently deleted.');
  if (!confirmed) return;

  showToast('Running cleanup...', 'info');
  try {
    await cleanupExpiredShares();
    showToast('Cleanup complete!', 'success');
    logAdminAction('manual_cleanup', 'Ran manual cleanup of expired shares and rooms');
    adminState.statsCache.timestamp = 0;
    loadAdminStats();

    adminState.shares.lastDoc = null;
    adminState.rooms.lastDoc = null;
    loadAdminShares();
    loadAdminRooms();
  } catch (e) {
    console.error('Cleanup failed:', e);
    showToast('Cleanup failed', 'error');
  }
}

// ============================================================
// ACTIVITY LOGS
// ============================================================
async function logAdminAction(action, details) {
  try {
    const currentUser = getCurrentUser();
    await db.collection('system').doc('admin_logs').collection('entries').add({
      action,
      details,
      admin: currentUser?.username || 'unknown',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.warn('Failed to log admin action:', e);
  }
}

async function loadAdminLogs(reset = true) {
  const container = document.getElementById('adminLogList');
  if (!container) return;

  if (reset) {
    container.innerHTML = '<div class="py-16 flex justify-center"><div class="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>';
    adminState.logs.lastDoc = null;
  }

  try {
    let query = db.collection('system').doc('admin_logs').collection('entries')
      .orderBy('timestamp', 'desc').limit(30);

    if (adminState.logs.lastDoc) {
      query = query.startAfter(adminState.logs.lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty && !adminState.logs.lastDoc) {
      container.innerHTML = `
        <div class="py-16 flex flex-col items-center justify-center gap-3 text-center">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant/20">receipt_long</span>
          <p class="text-on-surface-variant/40 italic text-xs">Activity log is empty</p>
        </div>`;
      document.getElementById('adminLogCount').textContent = '0 entries';
      return;
    }

    if (reset) container.innerHTML = '';

    const actionIcons = {
      broadcast_sent: 'campaign',
      broadcast_retracted: 'notifications_off',
      feedback_deleted: 'delete',
      feedback_resolved: 'check_circle',
      feedback_replied: 'reply',
      feedback_bulk_delete: 'delete_sweep',
      role_changed: 'shield_person',
      user_banned: 'block',
      user_unbanned: 'lock_open',
      user_deleted: 'person_remove',
      users_exported: 'download',
      room_deleted: 'delete',
      rooms_bulk_cleanup: 'cleaning_services',
      share_deleted: 'delete',
      manual_cleanup: 'cleaning_services'
    };

    const actionColors = {
      broadcast_sent: 'bg-blue-500/10 text-blue-500',
      broadcast_retracted: 'bg-amber-500/10 text-amber-500',
      feedback_deleted: 'bg-error/10 text-error',
      feedback_resolved: 'bg-emerald-500/10 text-emerald-500',
      feedback_replied: 'bg-blue-500/10 text-blue-500',
      user_banned: 'bg-error/10 text-error',
      user_deleted: 'bg-error/10 text-error',
      role_changed: 'bg-purple-500/10 text-purple-500',
      users_exported: 'bg-emerald-500/10 text-emerald-500',
      manual_cleanup: 'bg-amber-500/10 text-amber-500'
    };

    snapshot.docs.forEach(doc => {
      const d = doc.data();
      const icon = actionIcons[d.action] || 'info';
      const color = actionColors[d.action] || 'bg-surface-container-high text-on-surface-variant';

      const entry = document.createElement('div');
      entry.className = 'flex items-center gap-4 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/15 editorial-shadow';
      entry.innerHTML = `
        <div class="w-9 h-9 rounded-full ${color} flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-base">${icon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[11px] text-on-surface">${escapeHTML(d.details || d.action)}</p>
          <p class="text-[9px] text-on-surface-variant mt-0.5">by <b>${escapeHTML(d.admin || 'unknown')}</b></p>
        </div>
        <span class="text-[9px] text-on-surface-variant/60 font-bold uppercase tracking-wider whitespace-nowrap">${d.timestamp ? formatTimestamp(d.timestamp) : '—'}</span>`;
      container.appendChild(entry);
    });

    document.getElementById('adminLogCount').textContent = `${container.children.length} entries`;

    if (snapshot.docs.length >= 30) {
      adminState.logs.lastDoc = snapshot.docs[snapshot.docs.length - 1];
      document.getElementById('adminLogPagination').style.display = 'flex';
    } else {
      document.getElementById('adminLogPagination').style.display = 'none';
    }
  } catch (e) {
    console.error('Logs load failed:', e);
    container.innerHTML = '<div class="py-16 text-center text-error/50 text-xs">Failed to load logs.</div>';
  }
}

function loadMoreAdminLogs() { loadAdminLogs(false); }

// ============================================================
// BROADCAST LISTENER (for non-admin users)
// ============================================================
function initBroadcastListener() {
  db.collection('system').doc('broadcast').onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      const lastRead = localStorage.getItem('last_announcement_id');
      const announcementId = data.timestamp ? data.timestamp.toMillis().toString() : 'new';

      if (data.active && announcementId !== lastRead) {
        if (window.showBroadcastModal) {
          window.showBroadcastModal({ ...data, id: announcementId });
        }
      }
    }
  });
}

function showBroadcastModal(data) {
  const overlay = document.getElementById('broadcastModalOverlay');
  const box = document.getElementById('broadcastModalBox');
  const msgEl = document.getElementById('broadcastModalMessage');
  const dateEl = document.getElementById('broadcastModalDate');

  if (!overlay || !box || !msgEl || !dateEl) return;

  msgEl.textContent = data.message;
  dateEl.textContent = data.timestamp ? formatTimestamp(data.timestamp) : 'Just now';

  overlay.removeAttribute('data-hidden');
  requestAnimationFrame(() => {
    box.style.transform = 'scale(1)';
    box.style.opacity = '1';
  });

  const dismiss = () => {
    box.style.transform = 'scale(0.92)';
    box.style.opacity = '0';
    setTimeout(() => overlay.setAttribute('data-hidden', 'true'), 280);
    localStorage.setItem('last_announcement_id', data.id);
  };

  const dismissBtn = document.getElementById('broadcastModalDismiss');
  const closeBtn = document.getElementById('broadcastModalClose');

  if (dismissBtn) dismissBtn.onclick = dismiss;
  if (closeBtn) closeBtn.onclick = dismiss;
  overlay.onclick = (e) => { if (e.target === overlay) dismiss(); };
}

window.showBroadcastModal = showBroadcastModal;

// ============================================================
// CLEANUP — Remove listeners on admin logout
// ============================================================
function cleanupAdminListeners() {
  adminListeners.forEach(unsub => {
    if (typeof unsub === 'function') unsub();
  });
  adminListeners = [];
  broadcastSnapshotListener = null;
  window.adminInitialized = false;
  adminState.statsCache = { data: null, timestamp: 0 };
  console.log('🛡️ Admin listeners cleaned up');
}

window.cleanupAdminListeners = cleanupAdminListeners;

// ============================================================
// UTILITY
// ============================================================
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
