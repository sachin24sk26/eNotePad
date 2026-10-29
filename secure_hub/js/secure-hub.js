/**
 * eNotePad — Secure Hub Engine v1.0
 * One-click Website Launcher & Google SSO Hub
 * 
 * Features:
 * - Curated catalog of top productivity, developer, and Google Workspace applications.
 * - Single Sign-On (SSO) indicators for Google OAuth supported destinations.
 * - Secure sandboxed launching in new browser tabs (noopener, noreferrer).
 * - User-defined custom websites with strict HTTPS scheme validation and XSS protection.
 * - Per-user Firestore cloud sync for Google-authenticated users + localStorage offline fallback for guests.
 * - Live instant search, category filtering, and favorite pinning.
 */

(function () {
  'use strict';

  // ─── Predefined Catalog of Verified Popular Web Applications ───
  const PRESET_SITES = [
    {
      id: 'gmail',
      name: 'Gmail',
      url: 'https://mail.google.com',
      domain: 'mail.google.com',
      category: 'google',
      categoryLabel: 'Google Suite',
      ssoGoogle: true,
      description: 'Email, inbox management, and enterprise communications.',
      icon: 'mail'
    },
    {
      id: 'gdrive',
      name: 'Google Drive',
      url: 'https://drive.google.com',
      domain: 'drive.google.com',
      category: 'google',
      categoryLabel: 'Google Suite',
      ssoGoogle: true,
      description: 'Cloud storage, file sharing, and workspace collaboration.',
      icon: 'add_to_drive'
    },
    {
      id: 'gdocs',
      name: 'Google Docs',
      url: 'https://docs.google.com',
      domain: 'docs.google.com',
      category: 'google',
      categoryLabel: 'Google Suite',
      ssoGoogle: true,
      description: 'Real-time collaborative word processing and document editing.',
      icon: 'description'
    },
    {
      id: 'gsheets',
      name: 'Google Sheets',
      url: 'https://sheets.google.com',
      domain: 'sheets.google.com',
      category: 'google',
      categoryLabel: 'Google Suite',
      ssoGoogle: true,
      description: 'Online spreadsheets, data analysis, and automated formulas.',
      icon: 'table_chart'
    },
    {
      id: 'gcalendar',
      name: 'Google Calendar',
      url: 'https://calendar.google.com',
      domain: 'calendar.google.com',
      category: 'google',
      categoryLabel: 'Google Suite',
      ssoGoogle: true,
      description: 'Event scheduling, calendar meetings, and team agendas.',
      icon: 'calendar_month'
    },
    {
      id: 'gkeep',
      name: 'Google Keep',
      url: 'https://keep.google.com',
      domain: 'keep.google.com',
      category: 'google',
      categoryLabel: 'Google Suite',
      ssoGoogle: true,
      description: 'Quick notes, audio memos, checklists, and pinboards.',
      icon: 'keep'
    },
    {
      id: 'gmeet',
      name: 'Google Meet',
      url: 'https://meet.google.com',
      domain: 'meet.google.com',
      category: 'google',
      categoryLabel: 'Google Suite',
      ssoGoogle: true,
      description: 'Enterprise video calling, group meetings, and screen sharing.',
      icon: 'video_call'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      url: 'https://www.youtube.com',
      domain: 'youtube.com',
      category: 'media',
      categoryLabel: 'Media',
      ssoGoogle: true,
      description: 'Video streaming, educational channels, and creative content.',
      icon: 'smart_display'
    },
    {
      id: 'github',
      name: 'GitHub',
      url: 'https://github.com',
      domain: 'github.com',
      category: 'dev',
      categoryLabel: 'Developer',
      ssoGoogle: true,
      description: 'Code repositories, pull requests, issues, and CI/CD pipelines.',
      icon: 'terminal'
    },
    {
      id: 'notion',
      name: 'Notion',
      url: 'https://www.notion.so',
      domain: 'notion.so',
      category: 'productivity',
      categoryLabel: 'Productivity',
      ssoGoogle: true,
      description: 'Connected workspace for wiki, docs, projects, and personal notes.',
      icon: 'auto_stories'
    },
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      url: 'https://chatgpt.com',
      domain: 'chatgpt.com',
      category: 'ai',
      categoryLabel: 'AI Tools',
      ssoGoogle: true,
      description: 'Conversational assistant, writing helper, and code synthesizer.',
      icon: 'psychology'
    },
    {
      id: 'claude',
      name: 'Claude AI',
      url: 'https://claude.ai',
      domain: 'claude.ai',
      category: 'ai',
      categoryLabel: 'AI Tools',
      ssoGoogle: true,
      description: 'Anthropic AI assistant for deep reasoning and writing analysis.',
      icon: 'neurology'
    },
    {
      id: 'figma',
      name: 'Figma',
      url: 'https://www.figma.com',
      domain: 'figma.com',
      category: 'creative',
      categoryLabel: 'Creative',
      ssoGoogle: true,
      description: 'Collaborative UI/UX interface design and interactive prototyping.',
      icon: 'draw'
    },
    {
      id: 'canva',
      name: 'Canva',
      url: 'https://www.canva.com',
      domain: 'canva.com',
      category: 'creative',
      categoryLabel: 'Creative',
      ssoGoogle: true,
      description: 'Graphic design, presentations, banners, and digital graphics.',
      icon: 'palette'
    },
    {
      id: 'slack',
      name: 'Slack',
      url: 'https://slack.com',
      domain: 'slack.com',
      category: 'productivity',
      categoryLabel: 'Productivity',
      ssoGoogle: true,
      description: 'Real-time team messaging channels, huddles, and bot workflows.',
      icon: 'chat'
    },
    {
      id: 'trello',
      name: 'Trello',
      url: 'https://trello.com',
      domain: 'trello.com',
      category: 'productivity',
      categoryLabel: 'Productivity',
      ssoGoogle: true,
      description: 'Kanban boards, project task management, and agile checklists.',
      icon: 'view_kanban'
    },
    {
      id: 'stackoverflow',
      name: 'Stack Overflow',
      url: 'https://stackoverflow.com',
      domain: 'stackoverflow.com',
      category: 'dev',
      categoryLabel: 'Developer',
      ssoGoogle: true,
      description: 'Q&A community for programmers, debugging, and code answers.',
      icon: 'help_outline'
    },
    {
      id: 'vercel',
      name: 'Vercel',
      url: 'https://vercel.com',
      domain: 'vercel.com',
      category: 'dev',
      categoryLabel: 'Developer',
      ssoGoogle: true,
      description: 'Next.js hosting, serverless functions, and frontend deployments.',
      icon: 'cloud'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      url: 'https://www.linkedin.com',
      domain: 'linkedin.com',
      category: 'professional',
      categoryLabel: 'Professional',
      ssoGoogle: true,
      description: 'Professional networking, industry news, and job career search.',
      icon: 'badge'
    },
    {
      id: 'perplexity',
      name: 'Perplexity AI',
      url: 'https://www.perplexity.ai',
      domain: 'perplexity.ai',
      category: 'ai',
      categoryLabel: 'AI Tools',
      ssoGoogle: true,
      description: 'Conversational answer engine with live citations and web search.',
      icon: 'travel_explore'
    },
    {
      id: 'spotify',
      name: 'Spotify Web Player',
      url: 'https://open.spotify.com',
      domain: 'spotify.com',
      category: 'media',
      categoryLabel: 'Media',
      ssoGoogle: true,
      description: 'Music streaming, podcasts, and curated focus playlists.',
      icon: 'music_note'
    },
    {
      id: 'reddit',
      name: 'Reddit',
      url: 'https://www.reddit.com',
      domain: 'reddit.com',
      category: 'community',
      categoryLabel: 'Community',
      ssoGoogle: true,
      description: 'Topic subreddits, technical discussions, and community forums.',
      icon: 'forum'
    }
  ];

  // ─── State Management ───
  let currentUser = null;
  let customSites = [];
  let favoriteIds = new Set();
  let currentCategory = 'all';
  let searchQuery = '';

  // Storage Keys
  const STORAGE_KEY_CUSTOM = 'enotepad_secure_hub_custom_sites';
  const STORAGE_KEY_FAVS = 'enotepad_secure_hub_favorites';

  // ─── DOM References ───
  let sitesGrid;
  let searchInput;
  let categoryPillsContainer;
  let addSiteBtn;
  let addSiteModal;
  let addSiteForm;
  let modalCloseBtn;
  let modalCancelBtn;
  let userAvatar;
  let userStatusText;
  let authActionBtn;
  let themeToggleBtn;
  let emptyState;
  let statsTotalCount;

  // ─── Initialization ───
  function init() {
    bindDomElements();
    initTheme();
    loadLocalState();
    setupEventListeners();
    initAuthObserver();
    renderSites();
  }

  function bindDomElements() {
    sitesGrid = document.getElementById('sitesGrid');
    searchInput = document.getElementById('searchInput');
    categoryPillsContainer = document.getElementById('categoryPills');
    addSiteBtn = document.getElementById('addSiteBtn');
    addSiteModal = document.getElementById('addSiteModal');
    addSiteForm = document.getElementById('addSiteForm');
    modalCloseBtn = document.getElementById('modalCloseBtn');
    modalCancelBtn = document.getElementById('modalCancelBtn');
    userAvatar = document.getElementById('userAvatar');
    userStatusText = document.getElementById('userStatusText');
    authActionBtn = document.getElementById('authActionBtn');
    themeToggleBtn = document.getElementById('themeToggle');
    emptyState = document.getElementById('emptyState');
    statsTotalCount = document.getElementById('statsTotalCount');
  }

  // ─── Theme Management ───
  function initTheme() {
    const htmlEl = document.documentElement;
    const saved = localStorage.getItem('enp-theme') || localStorage.getItem('enotpad_theme') || localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      htmlEl.classList.add('dark');
      htmlEl.classList.remove('light');
    } else {
      htmlEl.classList.add('light');
      htmlEl.classList.remove('dark');
    }

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const isDark = htmlEl.classList.contains('dark');
        const next = isDark ? 'light' : 'dark';
        htmlEl.classList.toggle('dark', !isDark);
        htmlEl.classList.toggle('light', isDark);
        localStorage.setItem('enp-theme', next);
        localStorage.setItem('enotpad_theme', next);
        localStorage.setItem('theme', next);
      });
    }
  }

  // ─── Local Storage Loader (Offline / Guest Fallback) ───
  function loadLocalState() {
    try {
      const storedFavs = localStorage.getItem(STORAGE_KEY_FAVS);
      if (storedFavs) {
        favoriteIds = new Set(JSON.parse(storedFavs));
      } else {
        // Defaults: Star Gmail, Google Drive, GitHub, and Notion
        favoriteIds = new Set(['gmail', 'gdrive', 'github', 'notion']);
      }

      const storedSites = localStorage.getItem(STORAGE_KEY_CUSTOM);
      if (storedSites) {
        customSites = JSON.parse(storedSites);
      }
    } catch (e) {
      console.warn('[SecureHub] Failed to read localStorage state:', e);
      favoriteIds = new Set(['gmail', 'gdrive', 'github', 'notion']);
      customSites = [];
    }
  }

  function saveLocalState() {
    try {
      localStorage.setItem(STORAGE_KEY_FAVS, JSON.stringify([...favoriteIds]));
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(customSites));
    } catch (e) {
      console.warn('[SecureHub] Failed to save localStorage:', e);
    }
  }

  // ─── Firebase Auth & Firestore Sync ───
  function initAuthObserver() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      console.warn('[SecureHub] Firebase Auth SDK unavailable, running in local guest mode.');
      updateAuthUI(null);
      return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
      currentUser = user;
      updateAuthUI(user);

      if (user && window.db) {
        await syncFromFirestore(user);
      }
      renderSites();
    });
  }

  function updateAuthUI(user) {
    if (!authActionBtn || !userStatusText) return;

    if (user) {
      const name = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
      userStatusText.innerHTML = `
        <span class="font-bold text-on-surface">${escapeHtml(name)}</span>
        <span class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Google SSO Synced
        </span>
      `;
      if (userAvatar) {
        if (user.photoURL) {
          userAvatar.src = user.photoURL;
          userAvatar.style.display = 'block';
        } else {
          userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=516070&color=fff`;
          userAvatar.style.display = 'block';
        }
      }
      authActionBtn.innerHTML = `
        <span class="material-symbols-outlined text-sm">logout</span>
        <span>Sign Out</span>
      `;
      authActionBtn.title = 'Sign out of eNotePad';
      authActionBtn.onclick = handleSignOut;
    } else {
      userStatusText.innerHTML = `
        <span class="font-bold text-on-surface">Guest Session</span>
        <span class="text-xs text-on-surface-variant/70">Connect Google for Cloud Sync</span>
      `;
      if (userAvatar) {
        userAvatar.src = '../assets/Favicon.png';
      }
      authActionBtn.innerHTML = `
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-4 h-4" alt="Google" />
        <span>Sign In with Google</span>
      `;
      authActionBtn.title = 'Sign in with your Google account to sync bookmarks across all devices';
      authActionBtn.onclick = handleGoogleSignIn;
    }
  }

  async function handleGoogleSignIn() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      if (typeof showToast === 'function') showToast('Firebase Auth is not available right now.', 'error');
      return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    try {
      authActionBtn.disabled = true;
      authActionBtn.classList.add('opacity-70');
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      if (typeof showToast === 'function') {
        showToast(`Signed in as ${user.displayName || user.email}! 🚀`, 'success');
      }
    } catch (err) {
      console.error('[SecureHub] Google sign-in failed:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        if (typeof showToast === 'function') {
          showToast(`Sign in issue: ${err.message}`, 'error');
        } else {
          alert('Sign in issue: ' + err.message);
        }
      }
    } finally {
      authActionBtn.disabled = false;
      authActionBtn.classList.remove('opacity-70');
    }
  }

  async function handleSignOut() {
    if (typeof firebase === 'undefined' || !firebase.auth) return;
    try {
      await firebase.auth().signOut();
      if (typeof showToast === 'function') showToast('Signed out of Google session.', 'info');
    } catch (err) {
      console.error('[SecureHub] Sign-out failed:', err);
    }
  }

  // ─── Cloud Sync via Firestore ───
  async function syncFromFirestore(user) {
    if (!window.db || !user) return;
    try {
      const userRef = window.db.collection('users').doc(user.uid);
      
      // 1. Fetch custom sites
      const sitesSnap = await userRef.collection('secure_hub_sites').get();
      if (!sitesSnap.empty) {
        const cloudSites = [];
        sitesSnap.forEach((doc) => {
          cloudSites.push({ id: doc.id, ...doc.data() });
        });
        // Merge with local if newly registered
        customSites = cloudSites;
        saveLocalState();
      } else if (customSites.length > 0) {
        // Upload any existing local guest bookmarks to newly signed-in account
        const batch = window.db.batch();
        customSites.forEach((s) => {
          const docRef = userRef.collection('secure_hub_sites').doc(s.id);
          batch.set(docRef, {
            name: s.name,
            url: s.url,
            domain: s.domain,
            category: s.category || 'custom',
            categoryLabel: s.categoryLabel || 'Custom',
            ssoGoogle: !!s.ssoGoogle,
            description: s.description || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
      }

      // 2. Fetch favorites metadata
      const favDoc = await userRef.collection('secure_hub_meta').doc('favorites').get();
      if (favDoc.exists && Array.isArray(favDoc.data().ids)) {
        favoriteIds = new Set(favDoc.data().ids);
        saveLocalState();
      } else if (favoriteIds.size > 0) {
        await userRef.collection('secure_hub_meta').doc('favorites').set({
          ids: [...favoriteIds],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      console.warn('[SecureHub] Firestore sync notice (falling back to local cache):', err);
    }
  }

  async function persistFavoriteState() {
    saveLocalState();
    if (currentUser && window.db) {
      try {
        await window.db
          .collection('users')
          .doc(currentUser.uid)
          .collection('secure_hub_meta')
          .doc('favorites')
          .set({
            ids: [...favoriteIds],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
      } catch (err) {
        console.warn('[SecureHub] Could not sync favorites to cloud:', err);
      }
    }
  }

  // ─── URL Sanitization & Security Guards ───
  /**
   * Sanitizes and strictly validates external URLs.
   * Only allows valid https: schemes. Prevents javascript:, data:, file:, etc.
   */
  function sanitizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let trimmed = rawUrl.trim();

    // Auto-prefix https if user entered domain without protocol
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }

    try {
      const parsed = new URL(trimmed);
      // Strictly enforce HTTPS
      if (parsed.protocol !== 'https:') {
        return null;
      }
      return parsed.href;
    } catch (e) {
      return null;
    }
  }

  function extractDomain(validUrl) {
    try {
      const u = new URL(validUrl);
      return u.hostname.replace(/^www\./i, '');
    } catch (e) {
      return 'external-site';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Safe Launcher (Isolated Browser Tab) ───
  window.launchSite = function (rawUrl, siteName) {
    const safeUrl = sanitizeUrl(rawUrl);
    if (!safeUrl) {
      if (typeof showToast === 'function') {
        showToast('Invalid or unsafe URL format. Only HTTPS links are allowed.', 'error');
      } else {
        alert('Invalid or unsafe URL. Only HTTPS destinations can be launched.');
      }
      return;
    }

    // Open in separate browsing context with noopener and noreferrer protection
    const win = window.open(safeUrl, '_blank', 'noopener,noreferrer');
    if (win) {
      win.opener = null;
    }

    if (typeof showToast === 'function') {
      showToast(`Opening ${siteName || 'website'} in safe browser tab...`, 'info');
    }
  };

  // ─── Rendering Engine ───
  function getAllSites() {
    return [...PRESET_SITES, ...customSites];
  }

  function renderSites() {
    if (!sitesGrid) return;
    const all = getAllSites();

    // Filter by Search Query & Active Category
    const q = searchQuery.toLowerCase().trim();
    const filtered = all.filter((site) => {
      const matchesSearch = !q ||
        site.name.toLowerCase().includes(q) ||
        site.domain.toLowerCase().includes(q) ||
        (site.description && site.description.toLowerCase().includes(q)) ||
        (site.categoryLabel && site.categoryLabel.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (currentCategory === 'all') return true;
      if (currentCategory === 'favorites') return favoriteIds.has(site.id);
      if (currentCategory === 'custom') return site.isCustom === true;
      return site.category === currentCategory;
    });

    if (statsTotalCount) {
      statsTotalCount.textContent = all.length;
    }

    if (filtered.length === 0) {
      sitesGrid.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    // Build Cards HTML
    const cardsHtml = filtered.map((site) => {
      const isFav = favoriteIds.has(site.id);
      const isCustom = !!site.isCustom;
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site.domain)}&sz=128`;
      const fallbackIcon = site.icon || 'public';

      return `
        <div class="editorial-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative group" data-site-id="${escapeHtml(site.id)}">
          
          <!-- Top Row: Logo, Title, Favorite & Delete -->
          <div>
            <div class="flex items-start justify-between gap-3 mb-2.5">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl bg-surface-container-low dark:bg-white/5 flex items-center justify-center p-2 border border-outline-variant/15 flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden shadow-xs">
                  <img src="${faviconUrl}" alt="${escapeHtml(site.name)}" class="w-full h-full object-contain" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
                  <span class="material-symbols-outlined text-primary text-xl" style="display:none;">${fallbackIcon}</span>
                </div>
                <div>
                  <h3 class="font-headline font-bold text-sm sm:text-base text-on-surface flex items-center gap-1.5 leading-snug">
                    ${escapeHtml(site.name)}
                    ${isCustom ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary uppercase tracking-wider">Custom</span>' : ''}
                  </h3>
                  <p class="text-xs text-on-surface-variant font-mono truncate max-w-[170px] sm:max-w-[200px]" title="${escapeHtml(site.domain)}">
                    ${escapeHtml(site.domain)}
                  </p>
                </div>
              </div>

              <!-- Action icons: Pin Favorite & Delete (if custom) -->
              <div class="flex items-center gap-0.5">
                <button type="button" class="fav-btn p-1.5 rounded-lg text-on-surface-variant/40 hover:text-amber-500 hover:bg-surface-container transition-all ${isFav ? 'is-favorite' : ''}" data-fav-id="${escapeHtml(site.id)}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" aria-label="Toggle favorite">
                  <span class="material-symbols-outlined text-lg">${isFav ? 'star' : 'star'}</span>
                </button>
                ${isCustom ? `
                  <button type="button" class="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-error hover:bg-error/10 transition-all delete-custom-btn" data-delete-id="${escapeHtml(site.id)}" title="Delete custom site" aria-label="Delete website">
                    <span class="material-symbols-outlined text-lg">delete</span>
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Description -->
            <p class="text-xs text-on-surface-variant line-clamp-2 mb-3.5 leading-relaxed">
              ${escapeHtml(site.description || 'Quick launch shortcut for your workflow.')}
            </p>
          </div>

          <!-- Bottom Row: SSO Tag & Open Button -->
          <div class="pt-3 border-t border-outline-variant/10 flex items-center justify-between gap-2 mt-auto">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${site.ssoGoogle ? `
                <span class="sso-badge-google text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" title="Supports Google Single Sign-On or Google Workspace browser session">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-2.5 h-2.5" alt="" />
                  Google SSO
                </span>
              ` : `
                <span class="text-[10px] font-medium text-on-surface-variant/70 bg-surface-container-low px-2 py-0.5 rounded-full border border-outline-variant/10">
                  Direct Login
                </span>
              `}
              <span class="text-[10px] font-medium text-on-surface-variant/60 hidden sm:inline">
                ${escapeHtml(site.categoryLabel || 'Web')}
              </span>
            </div>

            <!-- Launch Button -->
            <button type="button" onclick="launchSite('${site.url}', '${escapeHtml(site.name)}')" class="launch-btn px-3.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary text-primary hover:text-white dark:bg-white/5 dark:hover:bg-primary-container dark:hover:text-primary-dim text-xs font-semibold flex items-center gap-1 border border-outline-variant/15 transition-all shadow-xs cursor-pointer" title="Open ${escapeHtml(site.name)} in a new browser tab">
              <span>Open</span>
              <span class="material-symbols-outlined text-xs">open_in_new</span>
            </button>
          </div>

        </div>
      `;
    }).join('');

    sitesGrid.innerHTML = cardsHtml;
    attachCardListeners();
  }

  function attachCardListeners() {
    // Favorite toggle clicks
    sitesGrid.querySelectorAll('.fav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-fav-id');
        if (!id) return;

        if (favoriteIds.has(id)) {
          favoriteIds.delete(id);
          if (typeof showToast === 'function') showToast('Removed from favorites', 'info');
        } else {
          favoriteIds.add(id);
          if (typeof showToast === 'function') showToast('Added to favorites! ⭐', 'success');
        }
        persistFavoriteState();
        renderSites();
      });
    });

    // Custom site deletion
    sitesGrid.querySelectorAll('.delete-custom-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete-id');
        if (!id) return;

        if (!confirm('Are you sure you want to delete this custom site shortcut?')) {
          return;
        }

        customSites = customSites.filter((s) => s.id !== id);
        favoriteIds.delete(id);
        saveLocalState();

        if (currentUser && window.db) {
          try {
            await window.db
              .collection('users')
              .doc(currentUser.uid)
              .collection('secure_hub_sites')
              .doc(id)
              .delete();
          } catch (err) {
            console.warn('[SecureHub] Firestore delete warning:', err);
          }
        }

        if (typeof showToast === 'function') showToast('Custom website removed', 'info');
        renderSites();
      });
    });
  }

  // ─── Event Listeners ───
  function setupEventListeners() {
    // Live Search
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderSites();
      });

      // Keyboard shortcut '/' to search
      window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput && !isModalOpen()) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        } else if (e.key === 'Escape' && document.activeElement === searchInput) {
          searchInput.value = '';
          searchQuery = '';
          searchInput.blur();
          renderSites();
        }
      });
    }

    // Category Filter Pills
    if (categoryPillsContainer) {
      categoryPillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.category-pill');
        if (!pill) return;

        categoryPillsContainer.querySelectorAll('.category-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');

        currentCategory = pill.getAttribute('data-category') || 'all';
        renderSites();
      });
    }

    // Add Custom Site Modal
    if (addSiteBtn) {
      addSiteBtn.addEventListener('click', openModal);
    }
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', closeModal);
    }
    if (modalCancelBtn) {
      modalCancelBtn.addEventListener('click', closeModal);
    }

    // Close on backdrop click or ESC
    if (addSiteModal) {
      addSiteModal.addEventListener('click', (e) => {
        if (e.target === addSiteModal) closeModal();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isModalOpen()) closeModal();
      });
    }

    // Form Submission
    if (addSiteForm) {
      addSiteForm.addEventListener('submit', handleAddCustomSite);
    }
  }

  function isModalOpen() {
    return addSiteModal && !addSiteModal.classList.contains('hidden');
  }

  function openModal() {
    if (!addSiteModal) return;
    addSiteModal.classList.remove('hidden');
    addSiteModal.classList.add('flex');
    const input = document.getElementById('customSiteName');
    if (input) setTimeout(() => input.focus(), 80);
  }

  function closeModal() {
    if (!addSiteModal) return;
    addSiteModal.classList.add('hidden');
    addSiteModal.classList.remove('flex');
    if (addSiteForm) addSiteForm.reset();
  }

  // ─── Add Custom Site Handler ───
  async function handleAddCustomSite(e) {
    e.preventDefault();

    const nameInput = document.getElementById('customSiteName');
    const urlInput = document.getElementById('customSiteUrl');
    const categorySelect = document.getElementById('customSiteCategory');
    const ssoCheckbox = document.getElementById('customSiteSso');
    const descInput = document.getElementById('customSiteDesc');

    const name = (nameInput ? nameInput.value : '').trim();
    const rawUrl = (urlInput ? urlInput.value : '').trim();
    const category = (categorySelect ? categorySelect.value : 'custom');
    const ssoGoogle = !!(ssoCheckbox && ssoCheckbox.checked);
    const description = (descInput ? descInput.value : '').trim();

    if (!name || name.length < 2) {
      if (typeof showToast === 'function') showToast('Please enter a site name (at least 2 characters).', 'warning');
      return;
    }

    const validatedUrl = sanitizeUrl(rawUrl);
    if (!validatedUrl) {
      if (typeof showToast === 'function') {
        showToast('Please enter a valid HTTPS URL (e.g. https://example.com)', 'error');
      } else {
        alert('Invalid URL: Only secure HTTPS links are allowed.');
      }
      return;
    }

    const domain = extractDomain(validatedUrl);
    const id = 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    const categoryLabels = {
      google: 'Google Suite',
      productivity: 'Productivity',
      dev: 'Developer',
      ai: 'AI Tools',
      creative: 'Creative',
      media: 'Media',
      community: 'Community',
      custom: 'Custom'
    };

    const newSite = {
      id,
      name,
      url: validatedUrl,
      domain,
      category,
      categoryLabel: categoryLabels[category] || 'Custom',
      ssoGoogle,
      description: description || `Personal shortcut to ${domain}`,
      icon: 'public',
      isCustom: true,
      createdAt: Date.now()
    };

    // Add to state and save
    customSites.unshift(newSite);
    saveLocalState();

    // Persist to Firestore if user logged in
    if (currentUser && window.db) {
      try {
        await window.db
          .collection('users')
          .doc(currentUser.uid)
          .collection('secure_hub_sites')
          .doc(id)
          .set({
            name: newSite.name,
            url: newSite.url,
            domain: newSite.domain,
            category: newSite.category,
            categoryLabel: newSite.categoryLabel,
            ssoGoogle: newSite.ssoGoogle,
            description: newSite.description,
            isCustom: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
      } catch (err) {
        console.warn('[SecureHub] Firestore save error (cached locally):', err);
      }
    }

    if (typeof showToast === 'function') {
      showToast(`Added "${name}" to your Secure Hub! 🎯`, 'success');
    }

    closeModal();
    renderSites();
  }

  // ─── Initialize on DOM Ready ───
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

