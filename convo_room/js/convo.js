// s:\eNotepad\convo_room\js\convo.js
let currentRoomCode = null;
let unsubscribeMessages = null;
let unsubscribeRoomDoc = null;
let isAnonymousInRoom = false; 
let currentUserInfo = null;
let roomTimerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const htmlEl = document.documentElement;
    if (localStorage.getItem('theme') === 'dark') {
        htmlEl.classList.add('dark');
        htmlEl.classList.remove('light');
    }
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
             if (htmlEl.classList.contains('dark')) {
                 htmlEl.classList.remove('dark');
                 htmlEl.classList.add('light');
                 localStorage.setItem('theme', 'light');
             } else {
                 htmlEl.classList.add('dark');
                 htmlEl.classList.remove('light');
                 localStorage.setItem('theme', 'dark');
             }
        });
    }

    const joinView = document.getElementById('joinView');
    const streamView = document.getElementById('streamView');
    const roomCodeInput = document.getElementById('roomCodeInput');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    const shareInviteBtn = document.getElementById('shareInviteBtn');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const messagesContainer = document.getElementById('messagesContainer');
    const headerUsername = document.getElementById('headerUsername');
    const loginWarning = document.getElementById('loginWarning');
    const participantsCountDisplay = document.getElementById('participantsCountDisplay');
    const roomTimerCountdown = document.getElementById('roomTimerCountdown');
    const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');

    function updateAuthHeader(username, isGuest) {
        if (!headerUsername) return;
        if (!isGuest && username) {
            headerUsername.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1"></span> @${username}`;
        } else {
            headerUsername.textContent = `Guest (Click to Log In)`;
        }
    }

    // 1. Initial local storage check
    const localUser = localStorage.getItem('enotepad_user');
    let userObj = null;
    try {
        if (localUser) userObj = JSON.parse(localUser);
    } catch(e){}

    if (userObj && userObj.username) {
        currentUserInfo = { username: userObj.username, isGuest: false };
        updateAuthHeader(userObj.username, false);
    } else {
        currentUserInfo = { username: `Guest_${Math.floor(Math.random() * 10000)}`, isGuest: true };
        updateAuthHeader(null, true);
    }

    // 2. Real-time Firebase Auth fetch for eNotePad user credentials
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    let uname = user.displayName || (user.email ? user.email.split('@')[0] : null);
                    
                    if (typeof db !== 'undefined' && user.email) {
                        const usersSnap = await db.collection('users').where('email', '==', user.email).limit(1).get().catch(() => ({ docs: [] }));
                        if (usersSnap.docs && usersSnap.docs.length > 0) {
                            uname = usersSnap.docs[0].id;
                        }
                    }
                    
                    if (uname) {
                        currentUserInfo = { username: uname, isGuest: false };
                        updateAuthHeader(uname, false);
                        localStorage.setItem('enotepad_user', JSON.stringify({ username: uname }));
                    }
                } catch(e) {
                    console.warn('Convo auth fetch warning:', e);
                }
            }
        });
    }

    joinRoomBtn.addEventListener('click', async () => {
        const code = roomCodeInput.value.trim().toUpperCase();
        if (!code) {
           if (typeof showToast === 'function') showToast('Please enter a room code.', 'warning');
           else alert('Please enter a room code.');
           return;
        }
        if (code.length < 3) {
           if (typeof showToast === 'function') showToast('Code too short.', 'warning');
           else alert('Code too short.');
           return;
        }
        
        joinRoomBtn.disabled = true;
        joinRoomBtn.innerHTML = 'Connecting...';
        if (loginWarning) loginWarning.classList.add('hidden');
        
        try {
            const roomRef = db.collection('convo_rooms').doc(code);
            
            // Transaction to handle anonymous limit
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(roomRef);
                const expiry = firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 20 * 60000));
                
                if (!doc.exists) {
                    transaction.set(roomRef, {
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        expiresAt: expiry,
                        anonymousCount: currentUserInfo.isGuest ? 1 : 0,
                        participantsCount: 1
                    });
                } else {
                    let anonCount = doc.data().anonymousCount || 0;
                    let partCount = doc.data().participantsCount || 0;
                    if (currentUserInfo.isGuest && anonCount >= 2) {
                        throw new Error('ROOM_FULL_ANON');
                    }
                    transaction.update(roomRef, {
                        expiresAt: expiry,
                        anonymousCount: currentUserInfo.isGuest ? anonCount + 1 : anonCount,
                        participantsCount: partCount + 1
                    });
                }
            });
            
            // Success
            if (currentUserInfo.isGuest) isAnonymousInRoom = true;
            currentRoomCode = code;
            
            // Update UI
            document.getElementById('currentRoomCodeDisplay').textContent = code;
            joinView.classList.add('hidden');
            streamView.classList.remove('hidden');
            
            // Start listening to messages and room state
            startListening(code);
            if (typeof showToast === 'function') showToast(`Connected to room #${code}! 🔒`, 'success');
            
        } catch (error) {
            console.error('Join Error:', error);
            if (error.message === 'ROOM_FULL_ANON') {
                if (loginWarning) loginWarning.classList.remove('hidden');
            } else {
                if (typeof showToast === 'function') showToast('Failed to join room.', 'error');
                else alert('Failed to join room.');
            }
        } finally {
            joinRoomBtn.disabled = false;
            joinRoomBtn.innerHTML = 'Join Stream';
        }
    });

    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', async () => {
            createRoomBtn.disabled = true;
            createRoomBtn.innerHTML = 'Creating...';
            try {
                const code = await generateUniqueCode(6);
                roomCodeInput.value = code;
                joinRoomBtn.click();
            } catch(e) {
                console.error("Failed to generate code:", e);
                if (typeof showToast === 'function') showToast('Failed to create room.', 'error');
                else alert('Failed to create room');
            } finally {
                createRoomBtn.disabled = false;
                createRoomBtn.innerHTML = `<span class="material-symbols-outlined">add_circle</span> Create a Room`;
            }
        });
    }

    if (shareInviteBtn) {
        shareInviteBtn.addEventListener('click', async () => {
            if (!currentRoomCode) return;
            const origin = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : window.location.href.split('/convo_room')[0];
            const inviteUrl = `${origin}/convo_room/index.html?room=${currentRoomCode}`;
            const ok = await copyToClipboard(inviteUrl);
            if (ok && typeof showToast === 'function') showToast(`Copied room invite link! 📋`, 'success');
            else prompt('Copy Room Invite Link:', inviteUrl);
        });
    }

    leaveRoomBtn.addEventListener('click', () => {
        leaveRoom();
    });

    function executeLeaveLogic(code, wasAnon) {
        if (!code) return;
        const roomRef = db.collection('convo_rooms').doc(code);
        db.runTransaction(async (transaction) => {
            const doc = await transaction.get(roomRef);
            if (doc.exists) {
                const data = doc.data();
                const newPart = Math.max(0, (data.participantsCount || 0) - 1);
                if (newPart <= 0) {
                    transaction.update(roomRef, {
                        expiresAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    const newAnon = wasAnon ? Math.max(0, (data.anonymousCount || 0) - 1) : (data.anonymousCount || 0);
                    transaction.update(roomRef, {
                        participantsCount: newPart,
                        anonymousCount: newAnon
                    });
                }
            }
        }).catch(e => console.error(e));
    }

    window.addEventListener('beforeunload', () => {
        if (currentRoomCode) {
            executeLeaveLogic(currentRoomCode, isAnonymousInRoom);
        }
    });

    function leaveRoom() {
        if (currentRoomCode) {
            executeLeaveLogic(currentRoomCode, isAnonymousInRoom);
        }
        
        if (unsubscribeMessages) {
            unsubscribeMessages();
            unsubscribeMessages = null;
        }

        if (unsubscribeRoomDoc) {
            unsubscribeRoomDoc();
            unsubscribeRoomDoc = null;
        }

        if (roomTimerInterval) {
            clearInterval(roomTimerInterval);
            roomTimerInterval = null;
        }
        
        currentRoomCode = null;
        isAnonymousInRoom = false;
        messagesContainer.innerHTML = '';
        streamView.classList.add('hidden');
        joinView.classList.remove('hidden');
        roomCodeInput.value = '';
    }

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        if (!currentRoomCode) return;
        const text = messageInput.value.trim();
        if (!text) return;
        
        messageInput.value = '';
        messageInput.style.height = '48px';
        
        try {
            const roomRef = db.collection('convo_rooms').doc(currentRoomCode);
            roomRef.update({ expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 20 * 60000)) }).catch(e=>e);
            
            const messagesRef = roomRef.collection('messages');
            await messagesRef.add({
                text: text,
                author: currentUserInfo.username,
                isGuest: currentUserInfo.isGuest,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            console.error('Failed to send:', err);
            if (typeof showToast === 'function') showToast('Failed to send message', 'error');
        }
    }

    // Quick emoji reaction bar
    document.querySelectorAll('.quick-emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const emoji = btn.dataset.emoji;
            if (!emoji || !currentRoomCode) return;
            messageInput.value += emoji;
            sendMessage();
        });
    });

    // Scroll to bottom button logic
    if (scrollToBottomBtn && messagesContainer) {
        messagesContainer.addEventListener('scroll', () => {
            const isScrolledUp = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight > 150;
            if (isScrolledUp) {
                scrollToBottomBtn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
            } else {
                scrollToBottomBtn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
            }
        });

        scrollToBottomBtn.addEventListener('click', () => {
            messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
        });
    }

    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');

    if (attachBtn) {
        attachBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            if (!currentRoomCode) {
                if (typeof showToast === 'function') showToast('Please join a room first', 'error');
                return;
            }
            
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { 
               if (typeof showToast === 'function') showToast('File must be under 2MB', 'error');
               else alert('File must be under 2MB');
               return;
            }

            attachBtn.classList.add('opacity-50');
            attachBtn.disabled = true;

            try {
                let dataUrl;
                if (file.type.startsWith('image/') && typeof compressImage === 'function') {
                   dataUrl = await compressImage(file, 800, 0.7);
                } else {
                   dataUrl = await new Promise((resolve, reject) => {
                       const reader = new FileReader();
                       reader.onload = () => resolve(reader.result);
                       reader.onerror = () => reject('File read failed');
                       reader.readAsDataURL(file);
                   });
                }

                const roomRef = db.collection('convo_rooms').doc(currentRoomCode);
                roomRef.update({ expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 20 * 60000)) }).catch(e=>e);

                const messagesRef = roomRef.collection('messages');
                await messagesRef.add({
                    text: `Shared a file: ${file.name}`,
                    attachmentUrl: dataUrl,
                    attachmentType: file.type.startsWith('image/') ? 'image' : 'file',
                    author: currentUserInfo.username,
                    isGuest: currentUserInfo.isGuest,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch(err) {
                 console.error('File send error:', err);
                 if (typeof showToast === 'function') showToast('Failed to send file', 'error');
            } finally {
                fileInput.value = '';
                attachBtn.classList.remove('opacity-50');
                attachBtn.disabled = false;
            }
        });
    }

    function startRoomTimer(expiresAt) {
        if (roomTimerInterval) clearInterval(roomTimerInterval);
        if (!expiresAt || !roomTimerCountdown) return;

        function updateTimer() {
            const now = Date.now();
            const expTime = expiresAt.toDate ? expiresAt.toDate().getTime() : new Date(expiresAt).getTime();
            const diff = Math.max(0, Math.floor((expTime - now) / 1000));

            const mins = Math.floor(diff / 60);
            const secs = diff % 60;
            roomTimerCountdown.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            if (diff <= 0) {
                clearInterval(roomTimerInterval);
                if (typeof showToast === 'function') showToast('Room session expired', 'warning');
                leaveRoom();
            }
        }

        updateTimer();
        roomTimerInterval = setInterval(updateTimer, 1000);
    }

    function startListening(code) {
        if (unsubscribeMessages) unsubscribeMessages();
        if (unsubscribeRoomDoc) unsubscribeRoomDoc();
        
        const messagesRef = db.collection('convo_rooms').doc(code).collection('messages')
                               .orderBy('timestamp', 'asc');
                               
        unsubscribeMessages = messagesRef.onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    renderMessage(data, change.doc.id);
                } else if (change.type === 'removed') {
                    const msgDiv = document.getElementById('msg-' + change.doc.id);
                    if (msgDiv) msgDiv.remove();
                }
            });
            // Auto-scroll to bottom unless user is manually inspecting history
            const isScrolledUp = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight > 180;
            if (!isScrolledUp) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, error => {
            console.error("Listen failed:", error);
        });
        
        // Listen to room document for participant count and expiry timestamp
        unsubscribeRoomDoc = db.collection('convo_rooms').doc(code).onSnapshot(doc => {
           if (doc.exists) {
               const data = doc.data();
               const count = data.participantsCount || data.anonymousCount || 1;
               if (participantsCountDisplay) {
                   participantsCountDisplay.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ${count} participant${count === 1 ? '' : 's'} online`;
               }
               if (data.expiresAt) {
                   startRoomTimer(data.expiresAt);
               }
           }
        });
    }

    function renderMessage(data, docId) {
        const isMine = data.author === currentUserInfo.username;
        const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
        
        let displayedName = data.author;
        if (isMine) displayedName = 'You';
        else if (data.isGuest) displayedName = 'Guest Friend';

        const msgDiv = document.createElement('div');
        msgDiv.id = 'msg-' + docId;
        msgDiv.className = `flex items-start gap-3.5 max-w-2xl group ${isMine ? 'ml-auto flex-row-reverse' : ''}`;
        
        const avatarColor = data.isGuest ? 'bg-surface-container-high border border-outline-variant/20 shadow-sm' : 'bg-primary border border-primary/20 shadow-sm';
        const avatarIconStyle = data.isGuest ? 'text-primary' : 'text-on-primary';
        const avatarLetter = data.isGuest ? '?' : displayedName.charAt(0).toUpperCase();

        const bubbleBg = isMine ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-lowest text-on-surface border border-outline-variant/15 shadow-sm';
        const borderRadius = isMine ? 'rounded-2xl rounded-tr-none' : 'rounded-2xl rounded-tl-none';
        const nameColor = isMine ? 'text-primary text-right' : 'text-primary';

        let attachmentHtml = '';
        if (data.attachmentUrl) {
            if (data.attachmentType === 'image') {
                attachmentHtml = `<img src="${data.attachmentUrl}" class="mt-3 max-w-full rounded-xl border border-outline-variant/20 shadow-sm" style="max-height: 250px; object-fit: contain;" alt="Attachment">`;
            } else {
                attachmentHtml = `<a href="${data.attachmentUrl}" download class="mt-3 flex items-center gap-2 p-3 bg-primary/10 rounded-xl text-xs font-bold text-primary hover:bg-primary/20 transition-colors border border-primary/20"><span class="material-symbols-outlined text-base">download</span> <span>${escapeHTMLStr(data.text || 'Download File')}</span></a>`;
            }
        }

        let deleteBtnHtml = '';
        if (isMine) {
            deleteBtnHtml = `<button data-doc-id="${docId}" class="delete-msg-btn text-error/60 hover:text-error text-[10px] uppercase font-bold tracking-wider mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1 w-full text-right cursor-pointer"><span class="material-symbols-outlined text-[14px]">delete</span> Unsend</button>`;
        }

        msgDiv.innerHTML = `
            <div class="w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center ${avatarIconStyle} mt-1 font-bold text-sm shrink-0 shadow-sm">
                ${data.isGuest ? '<span class="material-symbols-outlined text-base">person</span>' : avatarLetter}
            </div>
            <div class="${isMine ? 'text-right' : ''} flex-1 min-w-0">
                <div class="flex items-baseline gap-2 mb-1 justify-${isMine ? 'end' : 'start'}">
                    ${isMine ? `<span class="text-[10px] text-on-surface-variant/50 font-medium">${timeStr}</span> <span class="font-sans font-bold text-[11px] uppercase tracking-wider ${nameColor}">${displayedName}</span>` 
                            : `<span class="font-sans font-bold text-[11px] uppercase tracking-wider ${nameColor}">${displayedName}</span> <span class="text-[10px] text-on-surface-variant/50 font-medium">${timeStr}</span>`}
                </div>
                <div class="inline-block max-w-full p-3.5 md:p-4 ${bubbleBg} ${borderRadius} text-left cursor-pointer message-bubble transition-all hover:brightness-98" title="Click to copy message">
                    <p class="font-serif text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words message-text"></p>
                    ${attachmentHtml}
                </div>
                ${deleteBtnHtml}
            </div>
        `;
        
        // Inject text content safely
        const textEl = msgDiv.querySelector('.message-text');
        if (textEl) textEl.textContent = data.text || '';

        // Click message bubble to copy text
        const bubble = msgDiv.querySelector('.message-bubble');
        if (bubble) {
            bubble.addEventListener('click', async () => {
                if (data.text) {
                    const ok = await copyToClipboard(data.text);
                    if (ok && typeof showToast === 'function') showToast('Copied message text! 📋', 'success');
                }
            });
        }
        
        messagesContainer.appendChild(msgDiv);
    }

    messageInput.addEventListener('input', function() {
        this.style.height = '48px';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim() === '') this.style.height = '48px';
    });

    messagesContainer.addEventListener('click', async (e) => {
        const delBtn = e.target.closest('.delete-msg-btn');
        if (delBtn) {
            const docId = delBtn.dataset.docId;
            if (!docId || !currentRoomCode) return;
            try {
                await db.collection('convo_rooms').doc(currentRoomCode).collection('messages').doc(docId).delete();
                if (typeof showToast === 'function') showToast('Message unsent', 'success');
            } catch(err) {
                console.error("Delete failed:", err);
            }
        }
    });

    // Auto-join from URL parameter ?room=CODE
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room') || urlParams.get('code');
    if (roomParam && roomCodeInput) {
        roomCodeInput.value = roomParam.trim().toUpperCase();
        setTimeout(() => {
            if (joinRoomBtn) joinRoomBtn.click();
        }, 300);
    }
});
