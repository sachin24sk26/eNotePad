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
  const logoutOtherBtn = document.getElementById('logoutOtherBtn');
  const usernameInput = document.getElementById('authUsername');
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const togglePasswordIcon = document.getElementById('togglePasswordIcon');
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

        // Backfill email if missing for existing users
        if (!userProfile.email && user.email) {
          try {
            await db.collection('users').doc(userProfile.username).update({ email: user.email });
            userProfile.email = user.email;
          } catch (e) {
            console.warn('Could not backfill email:', e);
          }
        }

        console.log('User profile loaded:', userProfile.username, '| isAdmin:', isAdmin);
        setCurrentUser({ username: userProfile.username, email: user.email, uid: user.uid, role: userProfile.role });

        // === Session Token Validation (Logout Other Devices) ===
        // Only attach listener after a short delay to avoid race condition on first login
        if (window.currentSessionUnsub) window.currentSessionUnsub();
        let sessionListenerReady = false;
        // Give the login flow 1.5s to write the session token before we start validating
        setTimeout(() => { sessionListenerReady = true; }, 1500);

        window.currentSessionUnsub = db.collection('users').doc(userProfile.username).onSnapshot(doc => {
          if (!sessionListenerReady) return;
          const data = doc.data();
          if (data && data.sessionToken) {
            const myToken = localStorage.getItem('enotepad_session_token');
            if (myToken && myToken !== data.sessionToken) {
              // Another device rotated the token — sign out this device
              if (window.currentSessionUnsub) window.currentSessionUnsub();
              firebase.auth().signOut().then(() => {
                showToast('You were signed out from another device', 'warning');
              });
            }
          }
        });

        showLoggedInView(userProfile.username, isAdmin);
        // Start inactivity timer now that user is signed in
        if (typeof window.resetInactivityTimer === 'function') window.resetInactivityTimer();
      } else if (authMode !== 'register') {
        console.warn('User authenticated but no Firestore profile found for uid:', user.uid);
        // Don't call showLoggedOutView here — user is still authenticated, just missing a profile
      }
    } else {
      // User is signed out — clean up session subscription
      if (window.currentSessionUnsub) {
        window.currentSessionUnsub();
        window.currentSessionUnsub = null;
      }
      // Cancel inactivity timer
      if (typeof window.cancelInactivityTimer === 'function') window.cancelInactivityTimer();
      // Clean up admin listeners to prevent memory leaks
      if (typeof window.cleanupAdminListeners === 'function') window.cleanupAdminListeners();
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

  if (usernameInput) {
    usernameInput.addEventListener('input', (e) => {
      if (authMode === 'register') {
        const username = e.target.value.trim().toLowerCase();
        checkUsername(username);
      }
    });
  }

  // Form Submit & Enter key press support on auth inputs
  const authFormElement = document.getElementById('authFormElement');
  if (authFormElement) {
    authFormElement.addEventListener('submit', (e) => {
      e.preventDefault();
      if (authBtn) authBtn.click();
    });
  }

  const handleEnterKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (authBtn) authBtn.click();
    }
  };
  if (emailInput) emailInput.addEventListener('keydown', handleEnterKey);
  if (passwordInput) passwordInput.addEventListener('keydown', handleEnterKey);
  if (usernameInput) usernameInput.addEventListener('keydown', handleEnterKey);

  // ----- Toggle Login/Register Tabs & Modes -----
  const authTabLogin = document.getElementById('authTabLogin');
  const authTabRegister = document.getElementById('authTabRegister');

  function switchAuthMode(targetMode) {
    authMode = targetMode;
    const unameGroup = document.getElementById('usernameFieldGroup');
    const emailLabel = document.querySelector('label[for="authEmail"]');

    if (authTabLogin && authTabRegister) {
      authTabLogin.classList.toggle('active', authMode === 'login');
      authTabRegister.classList.toggle('active', authMode === 'register');
    }

    if (authMode === 'register') {
      setElText('authTitle', 'Create Account');
      setElText('authSubtitle', 'Join the digital curation movement.');
      setElText('authBtnText', 'Create Account');
      setElText('authTogglePrefix', 'Already have an account?');
      if (authToggleLink) authToggleLink.textContent = 'Sign In';
      if (emailLabel) emailLabel.textContent = 'Email Address';
      if (emailInput) {
        emailInput.placeholder = 'name@example.com';
        emailInput.type = 'email';
      }
      if (unameGroup) unameGroup.removeAttribute('data-hidden');
    } else {
      setElText('authTitle', 'Welcome Back');
      setElText('authSubtitle', 'Access your digital editorial desk.');
      setElText('authBtnText', 'Sign In');
      setElText('authTogglePrefix', "Don't have an account?");
      if (authToggleLink) authToggleLink.textContent = 'Sign Up';
      if (emailLabel) emailLabel.textContent = 'Email or Username';
      if (emailInput) {
        emailInput.placeholder = 'name@example.com or username';
        emailInput.type = 'text';
      }
      if (unameGroup) unameGroup.setAttribute('data-hidden', 'true');
      updateUsernameUI(null);
    }
  }

  if (authTabLogin) authTabLogin.addEventListener('click', () => switchAuthMode('login'));
  if (authTabRegister) authTabRegister.addEventListener('click', () => switchAuthMode('register'));
  if (authToggleLink) {
    authToggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthMode(authMode === 'login' ? 'register' : 'login');
    });
  }

  // Set initial state
  switchAuthMode('login');

  // ----- Toggle Password Visibility -----
  if (togglePasswordBtn && passwordInput && togglePasswordIcon) {
    togglePasswordBtn.addEventListener('click', () => {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePasswordIcon.textContent = 'visibility_off';
      } else {
        passwordInput.type = 'password';
        togglePasswordIcon.textContent = 'visibility';
      }
    });
  }

  // ----- Auth Button -----
  if (authBtn) {
    authBtn.addEventListener('click', async () => {
      let email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const username = usernameInput ? usernameInput.value.trim().toLowerCase() : '';

      if (!email || !password) {
        showToast('Please fill in all fields', 'warning');
        return;
      }

      if (authMode === 'register') {
        if (username.length < 3) {
          showToast('Username must be at least 3 characters', 'warning');
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
          const newToken = generateSessionToken();
          localStorage.setItem('enotepad_session_token', newToken);
          await db.collection('users').doc(username).set({
            username: username,
            email: email,
            uid: userCredential.user.uid,
            sessionToken: newToken,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          // Write to public search index
          if (typeof window.writeUserSearchIndex === 'function') {
            await window.writeUserSearchIndex(username, { displayName: username });
          }
          showToast('Welcome to eNotePad! 🎉', 'success');
        } else {
          let loginEmail = email;
          if (!loginEmail.includes('@')) {
            loginEmail = loginEmail.toLowerCase();
            const userDoc = await db.collection('users').doc(loginEmail).get();
            if (userDoc.exists && userDoc.data() && userDoc.data().email) {
              loginEmail = userDoc.data().email;
            } else {
              const querySnap = await db.collection('users').where('username', '==', loginEmail).limit(1).get();
              if (!querySnap.empty && querySnap.docs[0].data() && querySnap.docs[0].data().email) {
                loginEmail = querySnap.docs[0].data().email;
              } else {
                showToast('Username not found. Please check your username or login with your email address.', 'warning');
                authBtn.classList.remove('btn-loading');
                authBtn.disabled = false;
                return;
              }
            }
          }
          await firebase.auth().signInWithEmailAndPassword(loginEmail, password);
          showToast('Successfully logged in!', 'success');
        }
      } catch (error) {
        console.error('Auth error:', error);
        let errorMsg = error.message;
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
          errorMsg = 'Incorrect username/email or password.';
        } else if (error.code === 'auth/email-already-in-use') {
          errorMsg = 'This email address is already registered. Please sign in instead.';
        } else if (error.code === 'auth/weak-password') {
          errorMsg = 'Password should be at least 6 characters.';
        }
        showToast(errorMsg, 'error');
      } finally {
        authBtn.classList.remove('btn-loading');
        authBtn.disabled = false;
      }
    });
  }

  // ----- Google Sign-In -----
  if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        const userProfile = await fetchUserProfileByUid(user.uid);
        if (!userProfile) {
          const baseName = (user.displayName || user.email.split('@')[0]).replace(/\s+/g, '').toLowerCase().substring(0, 15);
          let finalUsername = baseName;
          let suffix = 1;
          while ((await db.collection('users').doc(finalUsername).get()).exists) {
            finalUsername = baseName + suffix;
            suffix++;
          }
          const newToken = generateSessionToken();
          localStorage.setItem('enotepad_session_token', newToken);
          await db.collection('users').doc(finalUsername).set({
            username: finalUsername,
            email: user.email,
            uid: user.uid,
            sessionToken: newToken,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          // Write to public search index
          if (typeof window.writeUserSearchIndex === 'function') {
            await window.writeUserSearchIndex(finalUsername, { displayName: user.displayName || finalUsername });
          }
          showToast(`Welcome, ${finalUsername}!`, 'success');
        }
      } catch (error) {
        console.error('Google Auth error:', error);
        showToast(error.message || 'Google login failed', 'error');
      }
    });
  }

  // ----- Forgot Password -----
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async () => {
      const email = emailInput ? emailInput.value.trim() : '';
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
  }

  // ----- Logout -----
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      showConfirmModal({
        title: 'Sign Out',
        message: 'Are you sure you want to log out from this device?',
        icon: 'logout',
        iconBg: 'rgba(159,64,61,0.08)',
        iconColor: '#9f403d',
        confirmText: 'Logout',
        confirmClass: 'bg-error text-on-error hover:opacity-90',
        onConfirm: async () => {
          try {
            await terminateCurrentSession();
            if (window.currentSessionUnsub) { window.currentSessionUnsub(); window.currentSessionUnsub = null; }
            await firebase.auth().signOut();
            showToast('Logged out successfully', 'success');
          } catch (error) {
            showToast('Logout failed', 'error');
          }
        }
      });
    });
  }

  // ----- Logout All Other Devices -----
  function setupLogoutOtherBtns() {
    if (logoutOtherBtn) {
      logoutOtherBtn.addEventListener('click', () => rotateSessionToken());
    }
    const logoutAllSessionsBtn = document.getElementById('logoutAllSessionsBtn');
    if (logoutAllSessionsBtn) {
      logoutAllSessionsBtn.addEventListener('click', () => rotateSessionToken());
    }
  }
  setupLogoutOtherBtns();

  async function rotateSessionToken() {
    showConfirmModal({
      title: 'Logout Other Devices',
      message: 'All other signed-in devices will be immediately logged out.',
      icon: 'phonelink_erase',
      iconBg: 'rgba(159,64,61,0.08)',
      iconColor: '#9f403d',
      confirmText: 'Logout Others',
      confirmClass: 'bg-error text-on-error hover:opacity-90',
      onConfirm: async () => {
        const username = (getEl('userName')?.textContent || '').trim();
        if (!username) return;
        const newToken = generateSessionToken();
        const currentSessionId = localStorage.getItem('enotepad_session_id');
        localStorage.setItem('enotepad_session_token', newToken);
        try {
          await db.collection('users').doc(username).update({ sessionToken: newToken });
          
          // Also mark all other sessions as inactive in the database
          const sessionsRef = db.collection('users').doc(username).collection('sessions');
          const activeSnap = await sessionsRef.where('isActive', '==', true).get();
          
          const batch = db.batch();
          activeSnap.forEach(doc => {
            if (doc.data().sessionId !== currentSessionId) {
              batch.update(doc.ref, { isActive: false });
            }
          });
          await batch.commit();

          showToast('✅ Other devices signed out', 'success');
          loadActiveSessions(username);
          if (typeof window.loadLoginHistory === 'function') {
            window.loadLoginHistory(username);
          }
        } catch (error) {
          console.error(error);
          showToast('Failed to logout other devices', 'error');
        }
      }
    });
  }

  // =========================================================
  // UI MANAGEMENT
  // =========================================================

  function showLoggedInView(username, isAdmin = false) {
    // Use data-hidden attribute (not CSS class) since CSS uses [data-hidden="true"] selector
    const authCard = getEl('authCard');
    const accountView = getEl('accountView');
    if (authCard) authCard.setAttribute('data-hidden', 'true');
    if (accountView) accountView.removeAttribute('data-hidden');

    const unameInitial = (username || '').charAt(0).toUpperCase();
    setElText('userAvatar', unameInitial);
    setElText('userName', username);

    // Update sidebar user info
    const sidebarAvatar = getEl('sidebarUserAvatar');
    const sidebarName = getEl('sidebarUserName');
    const sidebarInfo = getEl('sidebarUserInfo');
    const sidebarLinks = getEl('sidebarLoggedInLinks');
    const sidebarAdmin = getEl('sidebarAdmin');

    if (sidebarAvatar) sidebarAvatar.textContent = unameInitial;
    if (sidebarName) sidebarName.textContent = username;
    if (sidebarInfo) sidebarInfo.removeAttribute('data-hidden');
    if (sidebarLinks) sidebarLinks.removeAttribute('data-hidden');
    const sidebarLoggedOutBtn = document.getElementById('sidebarLoggedOutBtn');
    if (sidebarLoggedOutBtn) sidebarLoggedOutBtn.setAttribute('data-hidden', 'true');

    if (typeof window.hideGuestNudge === 'function') {
      window.hideGuestNudge();
    }

    // Update Profile Card Badge
    const roleContainer = getEl('userRoleContainer');
    const roleText = getEl('userRoleText');
    const sidebarRole = getEl('sidebarUserRole');

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
    recordLoginSession(username);

    // Load inbox badge (real-time listener)
    if (typeof window.loadInboxBadge === 'function') {
      window.loadInboxBadge(username);
    }

    // Show send-to-user button (logged-in only)
    const stuWrapper = document.getElementById('sendToUserWrapper');
    if (stuWrapper) stuWrapper.removeAttribute('data-hidden');

    // Refresh file manager for the logged-in user
    if (typeof window.fileManagerRefresh === 'function') {
      window.fileManagerRefresh(username);
    }

    // Initialize Admin Features if admin
    if (isAdmin && typeof initAdmin === 'function') {
      initAdmin();
    }

    // Initialize profile settings panel
    if (typeof window.initProfileSettings === 'function') {
      window.initProfileSettings();
    }
  }

  function showLoggedOutView() {
    // Use data-hidden attribute (not CSS class) since CSS uses [data-hidden="true"] selector
    const authCard = getEl('authCard');
    const accountView = getEl('accountView');
    if (authCard) authCard.removeAttribute('data-hidden');
    if (accountView) accountView.setAttribute('data-hidden', 'true');

    const sidebarInfo = document.getElementById('sidebarUserInfo');
    const sidebarLinks = document.getElementById('sidebarLoggedInLinks');
    const sidebarAdmin = document.getElementById('sidebarAdmin');

    if (sidebarInfo) sidebarInfo.setAttribute('data-hidden', 'true');
    if (sidebarLinks) sidebarLinks.setAttribute('data-hidden', 'true');
    const sidebarLoggedOutBtn = document.getElementById('sidebarLoggedOutBtn');
    if (sidebarLoggedOutBtn) sidebarLoggedOutBtn.removeAttribute('data-hidden');
    if (sidebarAdmin) {
      sidebarAdmin.style.display = 'none';
    }

    // Stop file manager listeners
    if (typeof window.fileManagerRefresh === 'function') {
      window.fileManagerRefresh(null);
    }

    // Reset fields & switch to login tab
    emailInput.value = '';
    passwordInput.value = '';
    usernameInput.value = '';
    switchAuthMode('login');
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

      const followingSnap = await db.collection('users').doc(username).collection('following').get().catch(() => ({ size: 0 }));
      const savedSnap = await db.collection('users').doc(username).collection('savedNotes').get().catch(() => ({ size: 0 }));

      const statFollowing = document.getElementById('statFollowing');
      const statSaved = document.getElementById('statSaved');
      const statTotal = document.getElementById('statTotal');

      const followingCount = userData.followingCount || followingSnap.size || 0;
      if (statFollowing) statFollowing.textContent = followingCount;
      if (statSaved) statSaved.textContent = savedSnap.size;
      if (statTotal) statTotal.textContent = followingCount + savedSnap.size + (userData.followersCount || 0);

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
      list.querySelectorAll('.note-item, .view-more-btn').forEach(el => el.remove());
      
      let count = 0;
      snap.docs.forEach(doc => {
        const item = createHistoryItem(doc.data(), doc.id);
        if (count >= 5) {
          item.style.display = 'none';
          item.classList.add('hidden-history-item');
        }
        list.appendChild(item);
        count++;
      });
      
      if (count > 5) {
        const btnLi = document.createElement('li');
        btnLi.className = 'text-center mt-4 view-more-btn';
        btnLi.innerHTML = `<button class="text-xs text-primary/70 hover:text-primary font-bold px-4 py-2 bg-primary-container/20 hover:bg-primary-container/40 rounded-full transition-colors">View More</button>`;
        btnLi.addEventListener('click', () => {
          list.querySelectorAll('.hidden-history-item').forEach(el => {
            el.style.display = '';
            el.classList.remove('hidden-history-item');
          });
          btnLi.remove();
        });
        list.appendChild(btnLi);
      }
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
      ['recent', 'saved', 'settings', 'files', 'inbox'].forEach(k => {
        const el = document.getElementById(`section${k.charAt(0).toUpperCase() + k.slice(1)}`);
        if (el) el.setAttribute('data-account-active', k === target ? 'true' : 'false');
      });
      // Load session data when Settings tab opens
      if (target === 'settings') {
        const username = (getEl('userName')?.textContent || '').trim();
        if (username && typeof window.loadActiveSessions === 'function') {
          window.loadActiveSessions(username);
        }
        if (username && typeof window.loadLoginHistory === 'function') {
          window.loadLoginHistory(username);
        }
      }
      // Load inbox when Inbox tab opens
      if (target === 'inbox') {
        const username = (getEl('userName')?.textContent || '').trim();
        if (username && typeof window.loadInbox === 'function') {
          window.loadInbox(username);
        }
      }
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
    setElVal('editNoteId', docId);
    setElVal('editNoteUsername', username);
    setElVal('editNoteType', data.type || 'text');

    // Title: use title field, fallback to preview, fallback to content snippet
    let titleValue = data.title || data.preview || '';
    if (!titleValue && data.content) {
      const raw = Array.isArray(data.content) ? data.content.join(', ') : data.content;
      titleValue = raw.substring(0, 60);
    }
    setElVal('editNoteTitle', titleValue);

    // Category
    setElVal('editNoteCategory', data.category || '');

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
      const docId    = getEl('editNoteId')?.value || '';
      const username = getEl('editNoteUsername')?.value || '';
      const type     = getEl('editNoteType')?.value || '';
      const newTitle = (getEl('editNoteTitle')?.value || '').trim();
      const newCat   = getEl('editNoteCategory')?.value || '';
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

  // =========================================================
  // SESSION MANAGEMENT HELPERS
  // =========================================================

  /**
   * Generate a cryptographically secure session token.
   */
  function generateSessionToken() {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Record this login as a session in Firestore.
   * Also writes the session token to Firestore so other devices can detect it.
   */
  async function recordLoginSession(username) {
    try {
      const ua = navigator.userAgent;
      const deviceInfo = parseUserAgent(ua);

      // Check if we can reuse the existing session to avoid duplicate logging on page refresh
      const existingSessionId = localStorage.getItem('enotepad_session_id');
      const existingToken = localStorage.getItem('enotepad_session_token');

      if (existingSessionId && existingToken) {
        try {
          const docRef = db.collection('users').doc(username).collection('sessions').doc(existingSessionId);
          const doc = await docRef.get();
          if (doc.exists && doc.data().isActive) {
            // Reuse existing session!
            await docRef.update({
              lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('📍 Session reused and updated lastSeen:', existingSessionId);
            return;
          }
        } catch (e) {
          console.warn('Failed to reuse session, creating a new one:', e);
        }
      }

      const sessionId = generateSessionToken().slice(0, 16);

      // Write a new session token to the user doc so this becomes the active session
      let myToken = localStorage.getItem('enotepad_session_token');
      if (!myToken) {
        myToken = generateSessionToken();
        localStorage.setItem('enotepad_session_token', myToken);
        // Also update Firestore with this new token
        await db.collection('users').doc(username).update({ sessionToken: myToken }).catch(() => {});
      }

      const sessionData = {
        sessionId,
        sessionToken: myToken,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        loginAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        userAgent: ua.substring(0, 200)
      };

      // Save sessionId so we can update lastSeen
      localStorage.setItem('enotepad_session_id', sessionId);

      await db.collection('users').doc(username)
        .collection('sessions').doc(sessionId).set(sessionData);

      console.log('📍 Session recorded:', sessionId);
    } catch (e) {
      console.warn('Session record failed (non-critical):', e.message);
    }
  }

  /**
   * Load and display active sessions in the Settings panel.
   */
  window.loadActiveSessions = async function loadActiveSessions(username) {
    const container = document.getElementById('sessionsList');
    if (!container) return;
    container.innerHTML = `<div class="flex items-center justify-center py-6 text-on-surface-variant/40 text-sm"><span class="material-symbols-outlined text-lg mr-2" style="animation:spin 1s linear infinite">progress_activity</span> Loading…</div>`;

    if (!username) {
      container.innerHTML = `<p class="text-xs text-center py-4 text-on-surface-variant/50">Please log in to view active sessions.</p>`;
      return;
    }

    try {
      let snap;
      try {
        snap = await db.collection('users').doc(username)
          .collection('sessions')
          .orderBy('lastSeen', 'desc')
          .limit(20).get();
      } catch (orderErr) {
        console.warn('orderBy lastSeen failed, fetching without orderBy:', orderErr);
        snap = await db.collection('users').doc(username)
          .collection('sessions')
          .limit(30).get();
      }
        
      const activeSessions = [];
      snap.forEach(doc => {
        if (doc.data().isActive === true) {
          activeSessions.push(doc);
        }
      });

      // Sort by lastSeen descending in JS (handles missing index or client-side fallback)
      activeSessions.sort((a, b) => {
        const getMs = (val) => val ? (val.toMillis ? val.toMillis() : new Date(val).getTime() || 0) : 0;
        return getMs(b.data().lastSeen) - getMs(a.data().lastSeen);
      });

      const mySessionId = localStorage.getItem('enotepad_session_id');
      container.innerHTML = '';

      if (activeSessions.length === 0) {
        container.innerHTML = `<p class="text-xs text-center py-4 text-on-surface-variant/50">No active sessions found.</p>`;
        return;
      }

      activeSessions.slice(0, 10).forEach(doc => {
        const s = doc.data();
        const isCurrentSession = s.sessionId === mySessionId;
        const lastSeen = s.lastSeen ? formatTimestamp(s.lastSeen) : 'Unknown';
        const loginAt = s.loginAt ? formatTimestamp(s.loginAt) : 'Unknown';
        const deviceIcon = s.device === 'Mobile' ? 'smartphone' : s.device === 'Tablet' ? 'tablet' : 'computer';

        const el = document.createElement('div');
        el.className = `flex items-center justify-between p-3 rounded-xl transition-all ${
          isCurrentSession
            ? 'bg-primary/5 border border-primary/15'
            : 'bg-surface-container hover:bg-surface-container-high'
        }`;
        el.innerHTML = `
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              isCurrentSession ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'
            }">
              <span class="material-symbols-outlined text-lg">${deviceIcon}</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-xs font-semibold text-on-surface truncate">${escapeHTML(s.browser || 'Browser')} on ${escapeHTML(s.os || 'OS')}</p>
                ${isCurrentSession ? '<span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-primary/15 text-primary rounded-full">This device</span>' : ''}
              </div>
              <p class="text-[10px] text-on-surface-variant">${escapeHTML(s.device || 'Device')} &bull; Signed in ${loginAt} &bull; Last seen ${lastSeen}</p>
            </div>
          </div>
          ${!isCurrentSession ? `
          <button class="session-logout-btn flex-shrink-0 ml-2 px-3 py-1.5 rounded-full text-[10px] font-bold text-error/70 bg-error/5 hover:bg-error/10 border border-error/10 transition-all" data-session-id="${s.sessionId}" data-username="${username}">
            <span class="material-symbols-outlined text-sm">logout</span>
          </button>` : ''}
        `;
        container.appendChild(el);
      });

      // Attach logout handlers to each session card
      container.querySelectorAll('.session-logout-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const sid = btn.dataset.sessionId;
          const uname = btn.dataset.username;
          showConfirmModal({
            title: 'Sign Out Device',
            message: 'This device will be immediately signed out.',
            icon: 'logout',
            iconBg: 'rgba(159,64,61,0.08)',
            iconColor: '#9f403d',
            confirmText: 'Sign Out',
            confirmClass: 'bg-error text-on-error hover:opacity-90',
            onConfirm: async () => {
              try {
                // Rotate session token so that device gets signed out
                const newToken = generateSessionToken();
                localStorage.setItem('enotepad_session_token', newToken);
                await db.collection('users').doc(uname).update({ sessionToken: newToken });
                await db.collection('users').doc(uname).collection('sessions').doc(sid).update({ isActive: false });
                showToast('Device signed out', 'success');
                loadActiveSessions(uname);
                loadLoginHistory(uname);
              } catch (e) {
                showToast('Failed to sign out device', 'error');
              }
            }
          });
        });
      });

    } catch (e) {
      console.error('Load sessions error:', e);
      let errMsg = 'Failed to load sessions. Check Firestore rules.';
      if (e && e.code === 'permission-denied') {
        errMsg = 'Permission denied by Firestore security rules.';
      }
      container.innerHTML = `<p class="text-xs text-center py-4 text-error/60">${errMsg}</p>`;
    }
  };

  /**
   * Load and display login history (all sessions, including old ones).
   */
  window.loadLoginHistory = async function loadLoginHistory(username) {
    const container = document.getElementById('loginHistoryList');
    if (!container) return;
    container.innerHTML = `<div class="flex items-center justify-center py-6 text-on-surface-variant/40 text-sm"><span class="material-symbols-outlined text-lg mr-2" style="animation:spin 1s linear infinite">progress_activity</span> Loading…</div>`;

    if (!username) {
      container.innerHTML = `<p class="text-xs text-center py-4 text-on-surface-variant/50">Please log in to view login history.</p>`;
      return;
    }

    try {
      let snap;
      try {
        snap = await db.collection('users').doc(username)
          .collection('sessions')
          .orderBy('loginAt', 'desc')
          .limit(20).get();
      } catch (orderErr) {
        console.warn('orderBy loginAt failed, fetching without orderBy:', orderErr);
        snap = await db.collection('users').doc(username)
          .collection('sessions')
          .limit(30).get();
      }

      const docs = [];
      snap.forEach(doc => docs.push(doc));
      docs.sort((a, b) => {
        const getMs = (val) => val ? (val.toMillis ? val.toMillis() : new Date(val).getTime() || 0) : 0;
        return getMs(b.data().loginAt) - getMs(a.data().loginAt);
      });

      const mySessionId = localStorage.getItem('enotepad_session_id');
      container.innerHTML = '';

      if (docs.length === 0) {
        container.innerHTML = `<p class="text-xs text-center py-4 text-on-surface-variant/50">No login history found.</p>`;
        return;
      }

      let count = 0;
      docs.forEach(doc => {
        const s = doc.data();
        const isCurrentSession = s.sessionId === mySessionId;
        const loginAt = s.loginAt ? formatTimestamp(s.loginAt) : 'Unknown';
        const deviceIcon = s.device === 'Mobile' ? 'smartphone' : s.device === 'Tablet' ? 'tablet' : 'computer';
        const statusColor = s.isActive ? 'text-green-500' : 'text-on-surface-variant/40';
        const statusText = isCurrentSession ? 'Current' : s.isActive ? 'Active' : 'Ended';

        let durationText = '';
        if (!s.isActive && s.loginAt && s.lastSeen) {
          const dur = formatDuration(s.loginAt, s.lastSeen);
          if (dur) durationText = ` &bull; Duration: ${dur}`;
        }

        const el = document.createElement('div');
        el.className = 'flex items-center gap-3 p-3 rounded-xl bg-surface-container';
        if (count >= 5) {
          el.style.display = 'none';
          el.classList.add('hidden-login-item');
        }
        el.innerHTML = `
          <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0 text-on-surface-variant">
            <span class="material-symbols-outlined text-base">${deviceIcon}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-xs font-semibold text-on-surface truncate">${escapeHTML(s.browser || 'Browser')} — ${escapeHTML(s.os || 'OS')}</p>
              <span class="text-[9px] font-bold uppercase ${statusColor}">${statusText}</span>
            </div>
            <p class="text-[10px] text-on-surface-variant">${escapeHTML(s.device || 'Device')} &bull; Signed in ${loginAt}${durationText}</p>
          </div>
        `;
        container.appendChild(el);
        count++;
      });

      if (count > 5) {
        const btnWrapper = document.createElement('div');
        btnWrapper.className = 'text-center mt-3';
        btnWrapper.innerHTML = `<button class="text-xs text-primary/70 hover:text-primary font-bold px-4 py-2 bg-primary-container/20 hover:bg-primary-container/40 rounded-full transition-colors">View More</button>`;
        btnWrapper.addEventListener('click', () => {
          container.querySelectorAll('.hidden-login-item').forEach(el => {
            el.style.display = 'flex';
            el.classList.remove('hidden-login-item');
          });
          btnWrapper.remove();
        });
        container.appendChild(btnWrapper);
      }
    } catch (e) {
      console.error('Load login history error:', e);
      container.innerHTML = `<p class="text-xs text-center py-4 text-error/60">Failed to load login history.</p>`;
    }
  };

  /**
   * Parse a User-Agent string into readable device / browser / OS info.
   */
  function parseUserAgent(ua) {
    let device = 'Desktop';
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';

    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
      device = /iPad/i.test(ua) ? 'Tablet' : 'Mobile';
    }

    if (/Windows NT/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = /iPhone|iPad/i.test(ua) ? 'iOS' : 'macOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Linux/i.test(ua)) os = 'Linux';
    else if (/CrOS/i.test(ua)) os = 'ChromeOS';

    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/OPR\//i.test(ua)) browser = 'Opera';
    else if (/Chrome/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';

    return { device, os, browser };
  }

  /**
   * Show a polished in-app confirmation modal (replaces native confirm()).
   * @param {Object} opts - { title, message, icon, iconBg, iconColor, confirmText, confirmClass, onConfirm }
   */
  function showConfirmModal(opts) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    const iconEl = document.getElementById('confirmModalIcon');
    const iconWrap = document.getElementById('confirmModalIconWrap');
    const confirmBtn = document.getElementById('confirmModalConfirm');
    const cancelBtn = document.getElementById('confirmModalCancel');
    const backdrop = document.getElementById('confirmModalBackdrop');
    if (!modal) return;

    titleEl.textContent = opts.title || 'Confirm';
    msgEl.textContent = opts.message || '';
    iconEl.textContent = opts.icon || 'warning';
    iconWrap.style.background = opts.iconBg || 'rgba(81,96,112,0.08)';
    iconEl.style.color = opts.iconColor || '#516070';
    confirmBtn.textContent = opts.confirmText || 'Confirm';
    confirmBtn.className = `flex-1 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${opts.confirmClass || 'bg-primary text-on-primary hover:bg-primary-dim'}`;

    modal.style.display = 'flex';

    // Clean up old listeners
    const newConfirm = confirmBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    // Re-apply text/class after clone
    newConfirm.textContent = opts.confirmText || 'Confirm';
    newConfirm.className = `flex-1 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${opts.confirmClass || 'bg-primary text-on-primary hover:bg-primary-dim'}`;

    const close = () => { modal.style.display = 'none'; };
    newConfirm.addEventListener('click', () => { close(); opts.onConfirm && opts.onConfirm(); });
    newCancel.addEventListener('click', close);
    backdrop.addEventListener('click', close, { once: true });
  }

  /**
   * Terminate the current session by marking it inactive in Firestore and clearing localStorage.
   */
  async function terminateCurrentSession() {
    const user = getCurrentUser();
    const username = user ? user.username : null;
    const sessionId = localStorage.getItem('enotepad_session_id');

    if (username && sessionId) {
      try {
        await db.collection('users').doc(username)
          .collection('sessions').doc(sessionId)
          .update({
            isActive: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
          });
        console.log('📍 Current session terminated in Firestore:', sessionId);
      } catch (e) {
        console.warn('Could not mark current session inactive:', e);
      }
    }
    localStorage.removeItem('enotepad_session_token');
    localStorage.removeItem('enotepad_session_id');
    setCurrentUser(null);
  }
  window.terminateCurrentSession = terminateCurrentSession;

  /**
   * Update the lastSeen field in Firestore for the current active session (throttled).
   */
  let lastActivityUpdate = 0;
  window.updateSessionActivity = async function updateSessionActivity() {
    const now = Date.now();
    // Throttle to at most once every 3 minutes
    if (now - lastActivityUpdate < 3 * 60 * 1000) return;

    const user = getCurrentUser();
    const username = user ? user.username : null;
    const sessionId = localStorage.getItem('enotepad_session_id');

    if (username && sessionId) {
      lastActivityUpdate = now;
      try {
        await db.collection('users').doc(username)
          .collection('sessions').doc(sessionId)
          .update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
          });
        console.log('📍 Session activity timestamp updated');
      } catch (e) {
        console.warn('Failed to update session activity:', e);
      }
    }
  };

  /**
   * Helper to format the session duration.
   */
  function formatDuration(start, end) {
    if (!start || !end) return '';
    try {
      const startTime = start.toDate ? start.toDate() : new Date(start);
      const endTime = end.toDate ? end.toDate() : new Date(end);
      const diffMs = endTime - startTime;
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins < 1) return 'less than a min';
      if (diffMins < 60) return `${diffMins} min`;
      const diffHrs = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return remainingMins > 0 ? `${diffHrs}h ${remainingMins}m` : `${diffHrs}h`;
    } catch (e) {
      return '';
    }
  }

}
