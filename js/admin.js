/**
 * Admin Module — The Command Center
 * Handles broadcast messaging and feedback management.
 */

function initAdmin() {
    const sendBroadcastBtn = document.getElementById('sendBroadcastBtn');
    const broadcastInput = document.getElementById('broadcastInput');
    const feedbackList = document.getElementById('adminFeedbackList');

    // ----- Send Broadcast -----
    if (sendBroadcastBtn) {
        sendBroadcastBtn.addEventListener('click', async () => {
            const message = broadcastInput.value.trim();
            if (!message) return;

            sendBroadcastBtn.disabled = true;
            try {
                await db.collection('system').doc('broadcast').set({
                    message: message,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    active: true
                });
                showToast('Broadcast sent successfully!', 'success');
                broadcastInput.value = '';
            } catch (error) {
                console.error('Broadcast error:', error);
                showToast('Failed to send broadcast', 'error');
            } finally {
                sendBroadcastBtn.disabled = false;
            }
        });
    }

    // ----- Load Feedback (Real-time) -----
    if (feedbackList) {
        db.collection('feedback').orderBy('timestamp', 'desc').limit(50).onSnapshot(snapshot => {
            if (snapshot.empty) {
                feedbackList.innerHTML = '<div class="p-8 text-center text-primary/30 italic text-sm">No feedback received yet.</div>';
                return;
            }

            feedbackList.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const item = document.createElement('div');
                item.className = 'bg-white p-4 rounded-xl border border-outline-variant/10 space-y-2 relative group';
                item.innerHTML = `
                    <div class="flex justify-between items-start">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-primary/40">${data.username || 'Guest'}</span>
                        <span class="text-[10px] text-on-surface-variant">${data.timestamp ? formatTimestamp(data.timestamp) : ''}</span>
                    </div>
                    <p class="text-sm text-on-surface leading-relaxed">${escapeHTML(data.message)}</p>
                    <button class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all text-error hover:scale-110" onclick="deleteFeedback('${doc.id}')">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                `;
                feedbackList.appendChild(item);
            });
        });
    }
}

// ----- Global Broadcast Listener (For All Users) -----
function initBroadcastListener() {
    db.collection('system').doc('broadcast').onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            const lastRead = localStorage.getItem('last_broadcast_read');
            
            // Only show if it's new and active
            if (data.active && data.timestamp && data.timestamp.toMillis().toString() !== lastRead) {
                showBroadcastPopup(data.message, data.timestamp.toMillis());
            }
        }
    });
}

function showBroadcastPopup(message, timestamp) {
    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 z-[11000] flex items-center justify-center p-4';
    popup.id = 'broadcastModal';
    popup.innerHTML = `
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-md"></div>
        <!-- Card -->
        <div class="relative w-full max-w-sm bg-surface-container-lowest rounded-3xl editorial-shadow editorial-border overflow-hidden animate-slide-up">
            <div class="p-8 text-center space-y-6">
                <div class="w-20 h-20 mx-auto bg-error/10 rounded-full flex items-center justify-center text-error">
                    <span class="material-symbols-outlined text-4xl">campaign</span>
                </div>
                <div class="space-y-2">
                    <h3 class="font-body text-2xl italic text-primary">Announcement</h3>
                    <p class="text-sm text-on-surface-variant leading-relaxed px-4">${escapeHTML(message)}</p>
                </div>
                <button class="w-full py-4 bg-primary text-on-primary rounded-full font-bold text-sm shadow-lg hover:bg-primary-dim transition-all active:scale-[0.98]" id="closeBroadcast">
                    Got it, thanks!
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    popup.querySelector('#closeBroadcast').addEventListener('click', () => {
        localStorage.setItem('last_broadcast_read', timestamp.toString());
        popup.classList.add('opacity-0', 'scale-95');
        popup.style.transition = 'all 0.3s ease';
        setTimeout(() => popup.remove(), 300);
    });
}

// ----- User Feedback Submission -----
async function sendFeedback(message) {
    const user = getCurrentUser();
    try {
        await db.collection('feedback').add({
            username: user ? user.username : 'Guest',
            message: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Feedback sent! Thank you. ❤️', 'success');
        return true;
    } catch (error) {
        console.error('Feedback error:', error);
        showToast('Failed to send feedback', 'error');
        return false;
    }
}

// Helper for admin to delete feedback
async function deleteFeedback(id) {
    if (!confirm('Delete this feedback?')) return;
    try {
        await db.collection('feedback').doc(id).delete();
        showToast('Feedback deleted', 'success');
    } catch (e) {
        showToast('Failed to delete feedback', 'error');
    }
}

// Helper to escape HTML
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
