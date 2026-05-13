/**
 * Admin Module v3.0 — The Command Center
 * Premium administrative dashboard logic.
 */

// Global State
window.adminInitialized = false;
let broadcastSnapshotListener = null;

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

    console.log('🛡️ Admin Command Center Initializing...');

    // 1. Tab Switching (Horizontal Top-Nav)
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.adminTab;
            if (!target) return;
            
            // Update buttons
            adminTabs.forEach(t => {
                const isActive = t === tab;
                t.classList.toggle('active', isActive);
                t.classList.toggle('bg-white/5', isActive);
                t.classList.toggle('text-white', isActive);
                t.classList.toggle('text-white/30', !isActive);
            });

            // Update sections
            adminSections.forEach(sec => {
                const isTarget = sec.id === `adminSection${target.charAt(0).toUpperCase() + target.slice(1)}`;
                sec.classList.toggle('hidden', !isTarget);
                if (isTarget) sec.classList.add('animate-editorialFadeIn');
            });

            // Contextual Data Loading
            switch(target) {
                case 'feedback': loadAdminFeedback(); break;
                case 'users': loadAdminUsers(); break;
                case 'overview': loadAdminStats(); break;
                case 'rooms': loadAdminStats(); break;
                case 'broadcast': /* Listener handles this */ break;
            }
        });
    });

    // 2. Broadcast Sending
    if (sendBroadcastBtn && broadcastInput) {
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
                await db.collection('system').doc('broadcast').set({
                    message: message,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    active: true,
                    type: 'announcement'
                });
                
                showToast('Announcement broadcasted!', 'success');
                broadcastInput.value = '';
            } catch (err) {
                console.error('Broadcast failed:', err);
                showToast('Failed to broadcast', 'error');
            } finally {
                sendBroadcastBtn.disabled = false;
                sendBroadcastBtn.innerHTML = originalHTML;
            }
        });
    }

    // 3. User Search
    if (userSearch) {
        userSearch.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const userList = document.getElementById('adminUserList');
            if (!userList) return;
            const rows = userList.querySelectorAll('tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(q) ? '' : 'none';
            });
        });
    }

    // Initial Overview Stat Load
    loadAdminStats();
    initCurrentBroadcastListener();
    
    window.adminInitialized = true;
    console.log('🛡️ Admin Command Center Fully Initialized');
}

// ============================================================
// DATA LOADING FUNCTIONS (Global Scope)
// ============================================================

async function loadAdminStats() {
    try {
        const [usersSnap, sharesSnap, feedbackSnap, roomsSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('shares').get(),
            db.collection('feedback').get(), // Get all for total items count
            db.collection('convo_rooms').get()
        ]);

        const stats = {
            users: usersSnap.size,
            notes: sharesSnap.size,
            feedback: feedbackSnap.size,
            rooms: roomsSnap.size
        };

        // Update UI with animation
        animateCounter('adminStatUsers', stats.users);
        animateCounter('adminStatNotes', stats.notes);
        animateCounter('adminStatFeedback', stats.feedback);
        animateCounter('adminStatRooms', stats.rooms);
        animateCounter('adminDetailRooms', stats.rooms);

    } catch (e) {
        console.error('Stats load failed:', e);
    }
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = parseInt(el.textContent) || 0;
    if (current === target) return;
    
    const duration = 800;
    const startTime = performance.now();
    const startValue = current;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        const nextValue = Math.floor(startValue + (target - startValue) * easeProgress);
        el.textContent = nextValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = target;
        }
    }
    requestAnimationFrame(update);
}

function initCurrentBroadcastListener() {
    if (broadcastSnapshotListener) return; // Prevent multiple listeners

    const container = document.getElementById('adminCurrentBroadcast');
    if (!container) return;

    broadcastSnapshotListener = db.collection('system').doc('broadcast').onSnapshot(doc => {
        if (!doc.exists || !doc.data().active) {
            container.innerHTML = `
                <div class="bg-[#1e2230] p-12 rounded-[32px] border border-white/5 flex flex-col items-center justify-center text-center space-y-3">
                    <span class="material-symbols-outlined text-4xl text-white/5">notifications_off</span>
                    <p class="text-white/20 italic text-sm">No active announcements currently broadcasting.</p>
                </div>
            `;
            return;
        }

        const data = doc.data();
        container.innerHTML = `
            <div class="bg-[#1e2230] p-8 rounded-[32px] border border-white/10 space-y-6 animate-editorialFadeIn relative overflow-hidden">
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
                            <p class="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Live Dispatch</p>
                            <p class="text-[10px] text-white/10 uppercase tracking-widest font-bold">${data.timestamp ? formatTimestamp(data.timestamp) : 'Just now'}</p>
                        </div>
                    </div>
                    <button class="w-10 h-10 rounded-xl bg-white/5 text-white/20 hover:text-error hover:bg-error/10 transition-all flex items-center justify-center border border-white/5" onclick="deactivateBroadcast()">
                        <span class="material-symbols-outlined text-lg">cancel</span>
                    </button>
                </div>
                <div class="bg-black/20 p-6 rounded-2xl border border-white/5">
                    <p class="text-white/80 italic leading-relaxed text-sm">"${escapeHTML(data.message)}"</p>
                </div>
            </div>
        `;
    }, err => {
        console.error('Broadcast listener failed:', err);
    });
}

async function deactivateBroadcast() {
    if (!confirm('Retract this announcement from all users?')) return;
    try {
        await db.collection('system').doc('broadcast').update({ active: false });
        showToast('Broadcast terminated', 'info');
    } catch (e) { 
        console.error('Deactivation failed:', e);
        showToast('Operation failed', 'error'); 
    }
}

async function loadAdminFeedback() {
    const feedbackList = document.getElementById('adminFeedbackListExpanded');
    if (!feedbackList) return;
    feedbackList.innerHTML = '<div class="py-20 flex justify-center col-span-full"><div class="w-12 h-12 border-4 border-white/5 border-t-white/20 rounded-full animate-spin"></div></div>';
    
    try {
        const snapshot = await db.collection('feedback').orderBy('timestamp', 'desc').get();
        if (snapshot.empty) {
            feedbackList.innerHTML = `
                <div class="py-20 text-center text-white/10 italic text-sm flex flex-col items-center gap-4 col-span-full w-full">
                    <span class="material-symbols-outlined text-6xl opacity-10">inbox</span>
                    The citizens are currently silent.
                </div>`;
            return;
        }

        feedbackList.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'bg-[#1e2230] p-8 rounded-[32px] border border-white/5 space-y-6 editorial-shadow group hover:border-white/10 transition-all';
            item.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 font-bold border border-white/5">
                            ${(data.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="font-bold text-white/90 text-sm">${data.username || 'Anonymous Citizen'}</p>
                            <p class="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]">${data.timestamp ? formatTimestamp(data.timestamp) : 'Moment ago'}</p>
                        </div>
                    </div>
                    <button class="w-10 h-10 rounded-xl flex items-center justify-center text-white/10 hover:bg-error/10 hover:text-error transition-all border border-transparent hover:border-error/20" onclick="deleteFeedback('${doc.id}')">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
                <div class="bg-black/20 p-6 rounded-2xl border border-white/5 group-hover:border-white/10 transition-all">
                    <p class="text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-medium">${escapeHTML(data.message)}</p>
                </div>
            `;
            feedbackList.appendChild(item);
        });
    } catch (e) { 
        console.error('Feedback load failed:', e);
        feedbackList.innerHTML = '<div class="py-20 text-center text-error/50">Connection to voice cluster lost.</div>';
    }
}

async function loadAdminUsers() {
    const userList = document.getElementById('adminUserList');
    if (!userList) return;
    userList.innerHTML = '<tr><td colspan="3" class="py-20 text-center"><div class="w-10 h-10 border-4 border-white/5 border-t-white/20 rounded-full animate-spin mx-auto"></div></td></tr>';
    
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get();
        userList.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-white/2 transition-colors border-b border-white/5 last:border-0';
            tr.innerHTML = `
                <td class="px-8 py-5">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 font-bold border border-white/5">
                            ${(data.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="font-bold text-white/90 text-sm">${data.username || 'Unknown'}</p>
                            <p class="text-[10px] text-white/20 font-bold uppercase tracking-wider">${data.email || 'Citizen'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-5">
                    <span class="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] ${data.role === 'admin' ? 'bg-error/10 text-error/80' : 'bg-white/5 text-white/30'}">
                        ${data.role || 'Member'}
                    </span>
                </td>
                <td class="px-8 py-5 text-right text-white/20 font-bold uppercase tracking-widest text-[9px]">
                    ${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleDateString() : '—'}
                </td>
            `;
            userList.appendChild(tr);
        });
    } catch (e) { 
        console.error('User load failed:', e);
        userList.innerHTML = '<tr><td colspan="3" class="py-10 text-center text-error/50 font-bold">Failed to decrypt citizen records.</td></tr>';
    }
}

async function deleteFeedback(id) {
    if (!confirm('Archive this feedback permanently?')) return;
    try {
        await db.collection('feedback').doc(id).delete();
        showToast('Feedback archived', 'info');
        loadAdminFeedback();
        loadAdminStats();
    } catch (e) { 
        console.error('Deletion failed:', e);
        showToast('Operation failed', 'error'); 
    }
}

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

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
