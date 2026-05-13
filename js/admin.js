/**
 * Admin Module v3.0 — The Command Center
 * Premium administrative dashboard logic.
 */

function initAdmin() {
    if (window.adminInitialized) {
        console.log('🛡️ Admin already initialized, skipping...');
        return;
    }
    console.log('🛡️ Admin Command Center Initializing...');
    
    const adminTabs = document.querySelectorAll('.admin-tab-btn');
    const adminSections = document.querySelectorAll('.admin-section');
    console.log(`🛡️ Found ${adminTabs.length} tabs and ${adminSections.length} sections`);
    
    const sendBroadcastBtn = document.getElementById('adminSendBroadcastBtn');
    const broadcastInput = document.getElementById('adminBroadcastInput');
    const currentBroadcastEl = document.getElementById('adminCurrentBroadcast');
    
    const feedbackList = document.getElementById('adminFeedbackListExpanded');
    const userList = document.getElementById('adminUserList');
    const userSearch = document.getElementById('adminUserSearch');

    // ----- 1. Tab Navigation -----
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.adminTab;
            
            // Switch Active Tab Button
            adminTabs.forEach(t => {
                t.classList.remove('active', 'text-primary', 'font-bold');
                t.classList.add('text-primary/50');
            });
            tab.classList.add('active', 'text-primary', 'font-bold');
            tab.classList.remove('text-primary/50');
            
            // Switch Section Visibility
            adminSections.forEach(s => s.classList.add('hidden'));
            const activeSection = document.getElementById(`adminSection${target.charAt(0).toUpperCase() + target.slice(1)}`);
            if (activeSection) {
                activeSection.classList.remove('hidden');
                activeSection.classList.add('animate-editorialFadeIn');
            }
            
            // Contextual Data Loading
            if (target === 'overview') loadAdminStats();
            if (target === 'broadcast') loadCurrentBroadcast();
            if (target === 'feedback') loadAdminFeedback();
            if (target === 'users') loadAdminUsers();
        });
    });

    // ----- 2. Dynamic Stats (with counters) -----
    async function loadAdminStats() {
        try {
            // Parallel fetch for speed
            const [usersSnap, sharesSnap, feedbackSnap] = await Promise.all([
                db.collection('users').get(),
                db.collection('shares').get(),
                db.collection('feedback').get()
            ]);
            
            animateCounter('adminStatUsers', usersSnap.size);
            animateCounter('adminStatNotes', sharesSnap.size);
            animateCounter('adminStatFeedback', feedbackSnap.size);

            // Update badge if any feedback
            const badge = document.getElementById('adminFeedbackBadge');
            if (badge) {
                if (feedbackSnap.size > 0) {
                    badge.textContent = feedbackSnap.size;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        } catch (e) {
            console.error('Stats fetch error:', e);
        }
    }

    function animateCounter(id, target) {
        const el = document.getElementById(id);
        if (!el) {
            console.warn(`Counter element ${id} not found`);
            return;
        }
        let current = parseInt(el.textContent) || 0;
        const duration = 800; // ms
        const increment = (target - current) / (duration / 16);
        
        const timer = setInterval(() => {
            current += increment;
            const currentEl = document.getElementById(id); // Re-fetch to be safe
            if (!currentEl) {
                clearInterval(timer);
                return;
            }
            if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
                currentEl.textContent = target;
                clearInterval(timer);
            } else {
                currentEl.textContent = Math.floor(current);
            }
        }, 16);
    }

    // ----- 3. Broadcast Management -----
    if (sendBroadcastBtn) {
        sendBroadcastBtn.addEventListener('click', async () => {
            const message = broadcastInput.value.trim();
            if (!message) {
                showToast('Message cannot be empty', 'warning');
                return;
            }

            sendBroadcastBtn.disabled = true;
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
                loadCurrentBroadcast();
            } catch (err) {
                showToast('Failed to broadcast', 'error');
            } finally {
                sendBroadcastBtn.disabled = false;
                sendBroadcastBtn.innerHTML = '<span class="material-symbols-outlined text-sm">send</span> Publish Broadcast';
            }
        });
    }

    async function loadCurrentBroadcast() {
        if (!currentBroadcastEl) return;
        try {
            const doc = await db.collection('system').doc('broadcast').get();
            if (doc.exists && doc.data().active) {
                const data = doc.data();
                currentBroadcastEl.innerHTML = `
                    <div class="w-full flex justify-between items-start admin-card p-6 border-error/10">
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 bg-error rounded-full animate-pulse"></span>
                                <span class="text-[10px] font-bold uppercase text-error tracking-tighter">Live Broadcast</span>
                            </div>
                            <p class="text-on-surface leading-relaxed text-base font-medium">${escapeHTML(data.message)}</p>
                            <div class="flex items-center gap-2 text-[10px] text-on-surface-variant/40 font-bold">
                                <span class="material-symbols-outlined text-xs">schedule</span>
                                ${data.timestamp ? formatTimestamp(data.timestamp) : 'Just now'}
                            </div>
                        </div>
                        <button class="w-10 h-10 rounded-xl bg-error/5 text-error hover:bg-error/10 transition-all flex items-center justify-center shadow-sm" id="killBroadcastBtn">
                            <span class="material-symbols-outlined">cancel</span>
                        </button>
                    </div>
                `;
                document.getElementById('killBroadcastBtn').addEventListener('click', deactivateBroadcast);
            } else {
                currentBroadcastEl.innerHTML = `
                    <div class="text-center opacity-30 italic flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined text-4xl">notifications_off</span>
                        <span>No active announcements.</span>
                    </div>
                `;
            }
        } catch (e) { console.error(e); }
    }

    async function deactivateBroadcast() {
        if (!confirm('End this broadcast for all users?')) return;
        try {
            await db.collection('system').doc('broadcast').update({ active: false });
            showToast('Announcement retracted', 'info');
            loadCurrentBroadcast();
        } catch (e) { showToast('Action failed', 'error'); }
    }

    // ----- 4. Feedback Dashboard -----
    async function loadAdminFeedback() {
        if (!feedbackList) return;
        feedbackList.innerHTML = '<div class="py-20 flex justify-center"><div class="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div></div>';
        
        try {
            const snapshot = await db.collection('feedback').orderBy('timestamp', 'desc').get();
            if (snapshot.empty) {
                feedbackList.innerHTML = `
                    <div class="py-20 text-center text-primary/20 italic text-sm flex flex-col items-center gap-4">
                        <span class="material-symbols-outlined text-6xl opacity-10">inbox</span>
                        No voices heard yet.
                    </div>`;
                return;
            }

            feedbackList.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const item = document.createElement('div');
                item.className = 'admin-card p-6 space-y-4';
                item.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                                ${(data.username || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p class="font-bold text-on-surface text-sm">${data.username || 'Anonymous Citizen'}</p>
                                <p class="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-wider">${data.timestamp ? formatTimestamp(data.timestamp) : ''}</p>
                            </div>
                        </div>
                        <button class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/30 hover:bg-error/10 hover:text-error transition-all" onclick="deleteFeedback('${doc.id}')">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                    <div class="bg-surface-container-low/50 p-5 rounded-2xl border border-outline-variant/5">
                        <p class="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">${escapeHTML(data.message)}</p>
                    </div>
                `;
                feedbackList.appendChild(item);
            });
        } catch (e) { console.error(e); }
    }

    // ----- 5. User Directory -----
    async function loadAdminUsers() {
        if (!userList) return;
        userList.innerHTML = '<tr><td colspan="4" class="py-20 text-center"><div class="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin mx-auto"></div></td></tr>';
        
        try {
            const snapshot = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get();
            renderUserTable(snapshot.docs);
        } catch (e) { console.error(e); }
    }

    function renderUserTable(docs) {
        userList.innerHTML = '';
        docs.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement('tr');
            tr.className = 'group transition-all hover:bg-primary/5';
            tr.innerHTML = `
                <td class="px-8 py-5">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                            ${(data.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="font-bold text-on-surface text-sm">${data.username || 'Unknown'}</p>
                            <p class="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-wider">${data.email || 'Citizen of ENotepad'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-5">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${data.role === 'admin' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}">
                        ${data.role || 'Member'}
                    </span>
                </td>
                <td class="px-8 py-5 text-on-surface-variant/60 font-medium">
                    ${data.createdAt ? data.createdAt.toDate().toLocaleDateString() : '—'}
                </td>
                <td class="px-8 py-5 text-right">
                    <button class="w-9 h-9 rounded-xl bg-surface-container-low text-on-surface-variant/30 hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center ml-auto">
                        <span class="material-symbols-outlined text-lg">more_vert</span>
                    </button>
                </td>
            `;
            userList.appendChild(tr);
        });
    }

    // Search filter
    if (userSearch) {
        userSearch.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const rows = userList.querySelectorAll('tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(q) ? '' : 'none';
            });
        });
    }

    // Initial Overview Stat Load
    loadAdminStats();
    window.adminInitialized = true;
    console.log('🛡️ Admin Command Center Fully Initialized');
}

// ============================================================
// GLOBAL FUNCTIONS (Exposed for User Feedback Submission)
// ============================================================

function initBroadcastListener() {
    db.collection('system').doc('broadcast').onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            const lastRead = localStorage.getItem('last_announcement_id');
            const announcementId = data.timestamp ? data.timestamp.toMillis().toString() : 'new';
            
            if (data.active && announcementId !== lastRead) {
                showBroadcastPopup(data.message, announcementId);
            }
        }
    });
}

function showBroadcastPopup(message, id) {
    const existing = document.getElementById('broadcastOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fade-in';
    overlay.id = 'broadcastOverlay';
    overlay.innerHTML = `
        <div class="relative w-full max-w-sm bg-surface-container-lowest rounded-[40px] editorial-shadow editorial-border overflow-hidden animate-spring-up">
            <div class="p-10 text-center space-y-8">
                <div class="w-24 h-24 mx-auto bg-error/10 rounded-[30px] flex items-center justify-center text-error rotate-12">
                    <span class="material-symbols-outlined text-5xl">campaign</span>
                </div>
                <div class="space-y-3">
                    <h3 class="font-body text-3xl italic text-primary leading-tight">System Notice</h3>
                    <p class="text-sm text-on-surface-variant leading-relaxed px-2 font-medium">${escapeHTML(message)}</p>
                </div>
                <button class="w-full py-5 bg-primary text-on-primary rounded-full font-bold text-sm shadow-2xl hover:bg-primary-dim transition-all active:scale-[0.96]" id="ackAnnouncement">
                    Confirm Receipt
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#ackAnnouncement').addEventListener('click', () => {
        localStorage.setItem('last_announcement_id', id);
        overlay.classList.add('opacity-0', 'scale-90');
        overlay.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => overlay.remove(), 400);
    });
}

async function sendFeedback(message) {
    const user = getCurrentUser();
    try {
        await db.collection('feedback').add({
            username: user ? user.username : 'Guest Citizen',
            message: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'new'
        });
        showToast('Feedback transmitted successfully', 'success');
        return true;
    } catch (err) {
        showToast('Transmission failed', 'error');
        return false;
    }
}

async function deleteFeedback(id) {
    if (!confirm('Archive this feedback permanently?')) return;
    try {
        await db.collection('feedback').doc(id).delete();
        showToast('Feedback archived', 'info');
        loadAdminFeedback();
        // Update stats badge
        const badge = document.getElementById('adminFeedbackBadge');
        if (badge) {
            const current = parseInt(badge.textContent) - 1;
            if (current > 0) badge.textContent = current;
            else badge.classList.add('hidden');
        }
    } catch (e) { showToast('Operation failed', 'error'); }
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
