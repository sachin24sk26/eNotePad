// s:\eNotepad\convo_room\js\convo.js
let currentRoomCode = null;
let unsubscribeMessages = null;
let isAnonymousInRoom = false; 
let currentUserInfo = null;

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
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const messagesContainer = document.getElementById('messagesContainer');
    const headerUsername = document.getElementById('headerUsername');
    const loginWarning = document.getElementById('loginWarning');
    const participantsCountDisplay = document.getElementById('participantsCountDisplay');
    
    // Auth check using the eNotepad local storage setup (if any) or standard fallback
    const localUser = localStorage.getItem('enotepad_user');
    let userObj = null;
    try {
        if (localUser) userObj = JSON.parse(localUser);
    } catch(e){}

    if (userObj && userObj.username) {
        currentUserInfo = { username: userObj.username, isGuest: false };
        headerUsername.textContent = userObj.username;
    } else {
        currentUserInfo = { username: `Guest_${Math.floor(Math.random() * 10000)}`, isGuest: true };
    }

    joinRoomBtn.addEventListener('click', async () => {
        const code = roomCodeInput.value.trim().toUpperCase();
        if (!code) {
           if(typeof showToast === 'function') showToast('Please enter a room code.', 'warning');
           else alert('Please enter a room code.');
           return;
        }
        if (code.length < 3) {
           if(typeof showToast === 'function') showToast('Code too short.', 'warning');
           else alert('Code too short.');
           return;
        }
        
        joinRoomBtn.disabled = true;
        joinRoomBtn.innerHTML = 'Connecting...';
        loginWarning.classList.add('hidden');
        
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
            
            // Start listening to messages
            startListening(code);
            if(typeof showToast === 'function') showToast('Connected to room!', 'success');
            
        } catch (error) {
            console.error('Join Error:', error);
            if (error.message === 'ROOM_FULL_ANON') {
                loginWarning.classList.remove('hidden');
            } else {
                if(typeof showToast === 'function') showToast('Failed to join room.', 'error');
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
                if(typeof showToast === 'function') showToast('Failed to create room.', 'error');
                else alert('Failed to create room');
            } finally {
                createRoomBtn.disabled = false;
                createRoomBtn.innerHTML = `<span class="material-symbols-outlined">add_circle</span> Create a Room`;
            }
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
        messageInput.style.height = '52px';
        
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
            if(typeof showToast === 'function') showToast('Failed to send message', 'error');
        }
    }

    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');

    if(attachBtn) {
        attachBtn.addEventListener('click', () => fileInput.click());
    }

    if(fileInput) {
        fileInput.addEventListener('change', async (e) => {
            if (!currentRoomCode) {
                if(typeof showToast === 'function') showToast('Please join a room first', 'error');
                return;
            }
            
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { 
               if(typeof showToast === 'function') showToast('File must be under 2MB', 'error');
               else alert('File must be under 2MB');
               return;
            }

            attachBtn.classList.add('opacity-50');
            attachBtn.disabled = true;

            try {
                let dataUrl;
                if (file.type.startsWith('image/') && typeof compressImage === 'function') {
                   // if utils.js compressImage is available, use it
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
                 if(typeof showToast === 'function') showToast('Failed to send file', 'error');
            } finally {
                fileInput.value = '';
                attachBtn.classList.remove('opacity-50');
                attachBtn.disabled = false;
            }
        });
    }

    function startListening(code) {
        if (unsubscribeMessages) unsubscribeMessages();
        
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
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, error => {
            console.error("Listen failed:", error);
        });
        
        // Setup room listener for active logic (optional, for participant count if desired)
        db.collection('convo_rooms').doc(code).onSnapshot(doc => {
           if(doc.exists) {
               const count = doc.data().anonymousCount || 0;
               // It's tricky to know total logged in users without presence system
               // As a baseline, just display anonymous count
               participantsCountDisplay.textContent = `${count} guest(s) online`;
           }
        });
    }

    // Safely encode text without needing utils.js escapeHTML
    function createSafeElement(tag, className, textInfo) {
       const el = document.createElement(tag);
       if(className) el.className = className;
       if(textInfo) el.textContent = textInfo;
       return el;
    }

    function renderMessage(data, docId) {
        const isMine = data.author === currentUserInfo.username;
        const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
        
        let displayedName = data.author;
        if (isMine) displayedName = 'You';
        else if (data.isGuest) displayedName = 'Friend';

        const msgDiv = document.createElement('div');
        msgDiv.id = 'msg-' + docId;
        msgDiv.className = `flex items-start gap-4 max-w-2xl group ${isMine ? 'ml-auto flex-row-reverse' : ''}`;
        
        const avatarColor = data.isGuest ? 'bg-surface-container-high editorial-border shadow-sm' : 'bg-primary border border-primary/20 shadow-sm';
        const avatarIconStyle = data.isGuest ? 'text-primary' : 'text-on-primary';
        const avatarLetter = data.isGuest ? '?' : displayedName.charAt(0).toUpperCase();

        const bubbleBg = isMine ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container text-on-surface editorial-border shadow-sm';
        const borderRadius = isMine ? 'rounded-xl rounded-tr-none' : 'rounded-xl rounded-tl-none';
        const nameColor = isMine ? 'text-primary text-right' : 'text-primary';

        let attachmentHtml = '';
        if (data.attachmentUrl) {
            if (data.attachmentType === 'image') {
                attachmentHtml = `<img src="${data.attachmentUrl}" class="mt-3 max-w-full rounded-lg border border-outline-variant/20" style="max-height: 250px; object-fit: contain;">`;
            } else {
                attachmentHtml = `<a href="${data.attachmentUrl}" download class="mt-3 block p-3 bg-white/10 rounded-lg text-sm truncate font-sans hover:bg-white/20 transition-colors">📎 Download File</a>`;
            }
        }

        let deleteBtnHtml = '';
        if (isMine) {
            deleteBtnHtml = `<button data-doc-id="${docId}" class="delete-msg-btn text-error/60 hover:text-error text-[10px] uppercase font-bold tracking-wider mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1 w-full text-right cursor-pointer"><span class="material-symbols-outlined text-[14px]">delete</span> Unsend</button>`;
        }

        msgDiv.innerHTML = `
            <div class="w-10 h-10 rounded-lg ${avatarColor} flex items-center justify-center ${avatarIconStyle} mt-1 font-bold shrink-0">
                ${data.isGuest ? '<span class="material-symbols-outlined">person</span>' : avatarLetter}
            </div>
            <div class="${isMine ? 'text-right' : ''} flex-1 min-w-0">
                <div class="flex items-baseline gap-2 mb-1 justify-${isMine ? 'end' : 'start'}">
                    ${isMine ? `<span class="text-[10px] text-on-surface-variant/40">${timeStr}</span> <span class="font-sans font-bold text-xs uppercase ${nameColor}">${displayedName}</span>` 
                            : `<span class="font-sans font-bold text-xs uppercase ${nameColor}">${displayedName}</span> <span class="text-[10px] text-on-surface-variant/40">${timeStr}</span>`}
                </div>
                <div class="p-5 ${bubbleBg} ${borderRadius} text-left">
                    <p class="font-serif text-lg leading-relaxed whitespace-pre-wrap break-words message-text"></p>
                    ${attachmentHtml}
                </div>
                ${deleteBtnHtml}
            </div>
        `;
        
        // Inject text content safely
        msgDiv.querySelector('.message-text').textContent = data.text || '';
        
        messagesContainer.appendChild(msgDiv);
    }

    messageInput.addEventListener('input', function() {
        this.style.height = '52px';
        this.style.height = (this.scrollHeight) + 'px';
        if(this.value.trim() === '') this.style.height = '52px';
    });

    messagesContainer.addEventListener('click', async (e) => {
        const delBtn = e.target.closest('.delete-msg-btn');
        if (delBtn) {
            const docId = delBtn.dataset.docId;
            if (!docId || !currentRoomCode) return;
            try {
                await db.collection('convo_rooms').doc(currentRoomCode).collection('messages').doc(docId).delete();
                if(typeof showToast === 'function') showToast('Message unsent', 'success');
            } catch(err) {
                console.error("Delete failed:", err);
            }
        }
    });
});
