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
  const STORAGE_KEY_RECENT_LAUNCHES = 'enotepad_hub_recent_launches';

  // ─── Session & Modal State ───
  let currentSessionTab = 'devices';
  let cachedClientIp = null;

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

  // SSO Section & Session History Modal References
  let ssoAppsQuickGrid;
  let ssoBannerBadge;
  let ssoHistoryQuickBtn;
  let hubSessionHistoryBtn;
  let hubSessionModal;
  let hubSessionModalCloseBtn;
  let hubSessionModalDoneBtn;
  let hubSessionRefreshBtn;
  let hubRefreshIcon;
  let hubSessionTabs;
  let hubPanelDevices;
  let hubPanelApps;
  let hubPanelHistory;
  let hubSessionsList;
  let hubAppHistoryList;
  let hubLoginHistoryList;
  let hubLogoutOtherBtn;
  let clearHubAppHistoryBtn;
  let clearHubLoginHistoryBtn;
  let currentDeviceIcon;
  let currentDeviceName;
  let currentDeviceIp;
  let currentDeviceMethod;
  let hubSessionIdDisplay;
  let hubTabDevicesCount;
  let hubTabAppsCount;
  let hubTabHistoryCount;

  // ─── Initialization ───
  function init() {
    bindDomElements();
    initTheme();
    loadLocalState();
    setupEventListeners();
    initAuthObserver();
    renderSsoAppsQuickGrid();
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

    // SSO Section & Session History Modal
    ssoAppsQuickGrid = document.getElementById('ssoAppsQuickGrid');
    ssoBannerBadge = document.getElementById('ssoBannerBadge');
    ssoHistoryQuickBtn = document.getElementById('ssoHistoryQuickBtn');
    hubSessionHistoryBtn = document.getElementById('hubSessionHistoryBtn');
    hubSessionModal = document.getElementById('hubSessionModal');
    hubSessionModalCloseBtn = document.getElementById('hubSessionModalCloseBtn');
    hubSessionModalDoneBtn = document.getElementById('hubSessionModalDoneBtn');
    hubSessionRefreshBtn = document.getElementById('hubSessionRefreshBtn');
    hubRefreshIcon = document.getElementById('hubRefreshIcon');
    hubSessionTabs = document.getElementById('hubSessionTabs');
    hubPanelDevices = document.getElementById('hubPanelDevices');
    hubPanelApps = document.getElementById('hubPanelApps');
    hubPanelHistory = document.getElementById('hubPanelHistory');
    hubSessionsList = document.getElementById('hubSessionsList');
    hubAppHistoryList = document.getElementById('hubAppHistoryList');
    hubLoginHistoryList = document.getElementById('hubLoginHistoryList');
    hubLogoutOtherBtn = document.getElementById('hubLogoutOtherBtn');
    clearHubAppHistoryBtn = document.getElementById('clearHubAppHistoryBtn');
    clearHubLoginHistoryBtn = document.getElementById('clearHubLoginHistoryBtn');
    currentDeviceIcon = document.getElementById('currentDeviceIcon');
    currentDeviceName = document.getElementById('currentDeviceName');
    currentDeviceIp = document.getElementById('currentDeviceIp');
    currentDeviceMethod = document.getElementById('currentDeviceMethod');
    hubSessionIdDisplay = document.getElementById('hubSessionIdDisplay');
    hubTabDevicesCount = document.getElementById('hubTabDevicesCount');
    hubTabAppsCount = document.getElementById('hubTabAppsCount');
    hubTabHistoryCount = document.getElementById('hubTabHistoryCount');
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

    // Capture redirect sign-in results (fallback for popup-blocked / mobile browsers)
    if (typeof firebase.auth().getRedirectResult === 'function') {
      firebase.auth().getRedirectResult().then((result) => {
        if (result && result.user) {
          console.log('[SecureHub] Google redirect sign-in completed for:', result.user.email);
          if (typeof showToast === 'function') {
            showToast(`Signed in as ${result.user.displayName || result.user.email}! 🚀`, 'success');
          }
        }
      }).catch((e) => {
        console.warn('[SecureHub] Redirect result notice:', e);
      });
    }

    // Listen for single sign-out from other eNotePad tabs
    try {
      if ('BroadcastChannel' in window) {
        const authChannel = new BroadcastChannel('enotepad_auth_sync');
        authChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'LOGOUT') {
            console.log('[SecureHub] Logout broadcast received from another tab');
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
              firebase.auth().signOut().catch(() => {});
            }
            currentUser = null;
            customSites = [];
            favoriteIds = new Set(['gmail', 'gdrive', 'github', 'notion']);
            try {
              localStorage.removeItem(STORAGE_KEY_CUSTOM);
              localStorage.removeItem(STORAGE_KEY_FAVS);
            } catch (e) {}
            updateAuthUI(null);
            renderSites();
          }
        };
      }
    } catch (e) {}

    window.addEventListener('storage', (e) => {
      if (e.key === 'enotepad_logout_event') {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
          firebase.auth().signOut().catch(() => {});
        }
        currentUser = null;
        customSites = [];
        favoriteIds = new Set(['gmail', 'gdrive', 'github', 'notion']);
        updateAuthUI(null);
        renderSites();
      }
    });

    firebase.auth().onAuthStateChanged(async (user) => {
      currentUser = user;
      updateAuthUI(user);

      if (user && window.db) {
        await syncFromFirestore(user);
        try {
          const username = await getUsernameForUser(user);
          if (username) {
            await recordLoginSession(username);
          }
        } catch (e) {
          console.warn('[SecureHub] Error recording session:', e);
        }
      } else if (!user) {
        // Purge private custom sites and reset favorites to defaults on sign-out
        customSites = [];
        favoriteIds = new Set(['gmail', 'gdrive', 'github', 'notion']);
        try {
          localStorage.removeItem(STORAGE_KEY_CUSTOM);
          localStorage.removeItem(STORAGE_KEY_FAVS);
        } catch (e) {}
      }
      renderSites();
      if (isSessionModalOpen()) {
        loadHubSessions();
        if (currentSessionTab === 'apps') loadHubAppHistory();
        if (currentSessionTab === 'history') loadHubLoginHistory();
      }
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
      if (ssoBannerBadge) {
        ssoBannerBadge.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Google SSO Active: ${escapeHtml(user.email || name)}</span>
        `;
        ssoBannerBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1';
      }
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
      if (ssoBannerBadge) {
        ssoBannerBadge.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span>1-Click Launch Ready</span>
        `;
        ssoBannerBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1';
      }
      if (userAvatar) {
        userAvatar.src = '../assets/Favicon.png';
      }
      authActionBtn.innerHTML = `
        <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        <span>Sign In with Google</span>
      `;
      authActionBtn.title = 'Sign in with your Google account to sync bookmarks across all devices';
      authActionBtn.onclick = handleGoogleSignIn;
    }
  }

    function showHubGoogleHelpModal(reason) {
    const existing = document.getElementById('hubGoogleHelpModal');
    if (existing) existing.remove();

    const host = window.location.hostname || 'enotepad.vercel.app';
    const modal = document.createElement('div');
    modal.id = 'hubGoogleHelpModal';
    modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/20 space-y-4 text-on-surface">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-2xl">shield_lock</span>
          </div>
          <div>
            <h3 class="font-bold text-base text-primary dark:text-[#d4e4f8]">Google Sign-In Notice</h3>
            <p class="text-xs text-on-surface-variant">Authorized Domain setup</p>
          </div>
        </div>

        <p class="text-xs text-on-surface-variant leading-relaxed">
          Google's sign-in popup closed automatically because <strong class="text-primary font-semibold">${host}</strong> must be added to your Firebase project's <strong>Authorized Domains</strong>.
        </p>

        <div class="p-3 bg-surface-container-low rounded-xl text-xs space-y-1.5 border border-outline-variant/10">
          <div class="font-bold text-primary flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm text-emerald-500">check_circle</span>
            How to fix in 10 seconds:
          </div>
          <ol class="list-decimal pl-4 space-y-1 text-on-surface-variant/90 text-[11px]">
            <li>Open <strong>Firebase Console &gt; Authentication &gt; Settings</strong></li>
            <li>Click <strong>Authorized domains &gt; Add domain</strong></li>
            <li>Enter <code class="px-1.5 py-0.5 bg-primary/10 rounded font-mono font-bold text-primary">${host}</code> and click Add</li>
          </ol>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 pt-2">
          <a href="https://console.firebase.google.com/project/enotpad/authentication/settings" target="_blank" rel="noopener" class="flex-1 py-2.5 px-3 bg-primary text-on-primary rounded-xl font-bold text-xs text-center hover:bg-primary-dim transition-all flex items-center justify-center gap-1.5 shadow-sm">
            <span>Open Firebase Settings</span>
            <span class="material-symbols-outlined text-xs">open_in_new</span>
          </a>
          <button type="button" id="hubTryRedirectBtn" class="flex-1 py-2.5 px-3 bg-surface-container-high text-primary dark:text-white rounded-xl font-bold text-xs hover:bg-surface-container-highest transition-all flex items-center justify-center gap-1">
            <span class="material-symbols-outlined text-sm">login</span>
            <span>Try Full-Page Login</span>
          </button>
        </div>

        <div class="text-center pt-1">
          <button type="button" id="hubCloseHelpBtn" class="text-xs text-on-surface-variant hover:underline bg-transparent border-none cursor-pointer">
            Dismiss
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('hubCloseHelpBtn').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    const redirectBtn = document.getElementById('hubTryRedirectBtn');
    if (redirectBtn) {
      redirectBtn.onclick = async () => {
        close();
        if (typeof firebase !== 'undefined' && firebase.auth) {
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          provider.addScope('email');
          provider.addScope('profile');
          try {
            await firebase.auth().signInWithRedirect(provider);
          } catch (e) {
            console.error('Redirect sign-in error:', e);
            if (typeof showToast === 'function') showToast(e.message || 'Redirect failed', 'error');
          }
        }
      };
    }
  }

  function handleHubAuthError(err, elapsedMs = 9999) {
    console.error('[SecureHub] Google sign-in failed:', err);
    if (!err) return;

    if (err.code === 'auth/unauthorized-domain' || (err.code === 'auth/popup-closed-by-user' && elapsedMs < 3500)) {
      showHubGoogleHelpModal(err.code);
      return;
    }

    let msg = err.message || 'Google login failed';
    if (err.code === 'auth/popup-closed-by-user') {
      msg = 'Sign-in window was closed';
    } else if (err.code === 'auth/account-exists-with-different-credential') {
      msg = 'An account already exists with this email address. Please sign in with your email and password on the main notes page.';
    } else if (err.code === 'auth/operation-not-allowed') {
      msg = 'Google Sign-In is not enabled in Firebase Console.';
    } else if (err.code === 'auth/network-request-failed') {
      msg = 'Network connection error. Please check your internet connection.';
    }
    if (typeof showToast === 'function') {
      showToast(msg, 'error');
    } else {
      alert(msg);
    }
  }

  async function handleGoogleSignIn() {
    if (window.location.protocol === 'file:') {
      const msg = 'Google Sign-In requires running on a local or hosted web server (http:// or https://), not file://. Use Live Server or visit https://enotpad.web.app';
      if (typeof showToast === 'function') showToast(msg, 'warning');
      else alert(msg);
      return;
    }

    if (typeof firebase === 'undefined' || !firebase.auth) {
      if (typeof showToast === 'function') showToast('Firebase Auth is not available right now.', 'error');
      return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    provider.addScope('email');
    provider.addScope('profile');

    const startTime = Date.now();

    try {
      authActionBtn.disabled = true;
      authActionBtn.classList.add('opacity-70');
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      if (typeof showToast === 'function') {
        showToast(`Signed in as ${user.displayName || user.email}! 🚀`, 'success');
      }
    } catch (err) {
      const elapsed = Date.now() - startTime;
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        console.warn('[SecureHub] Popup blocked, attempting redirect fallback...');
        try {
          await firebase.auth().signInWithRedirect(provider);
          return;
        } catch (redirectErr) {
          handleHubAuthError(redirectErr, elapsed);
        }
      } else {
        handleHubAuthError(err, elapsed);
      }
    } finally {
      authActionBtn.disabled = false;
      authActionBtn.classList.remove('opacity-70');
    }
  }

  async function handleSignOut() {
    if (typeof firebase === 'undefined' || !firebase.auth) return;
    try {
      // 1. Sign out of Firebase session
      await firebase.auth().signOut();
      currentUser = null;

      // 2. Clear private bookmarks & reset favorites
      customSites = [];
      favoriteIds = new Set(['gmail', 'gdrive', 'github', 'notion']);

      // 3. Purge all related local storage keys
      try {
        localStorage.removeItem(STORAGE_KEY_CUSTOM);
        localStorage.removeItem(STORAGE_KEY_FAVS);
        localStorage.removeItem('enotepad_session_token');
        localStorage.removeItem('enotepad_session_id');
        localStorage.removeItem('enotpad_user');
      } catch (e) {}

      // 4. Update UI to clean guest state
      updateAuthUI(null);
      renderSites();

      // 5. Broadcast Single Sign-Out to all other open eNotePad tabs
      try {
        if ('BroadcastChannel' in window) {
          const ch = new BroadcastChannel('enotepad_auth_sync');
          ch.postMessage({ type: 'LOGOUT', timestamp: Date.now() });
          ch.close();
        }
        localStorage.setItem('enotepad_logout_event', Date.now().toString());
      } catch (e) {}

      if (typeof showToast === 'function') {
        showToast('Signed out completely from eNotePad. 🔒', 'success');
      }
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

  // ─── Smart SSO URL Resolver & Safe Launcher ───
  function resolveSsoUrl(rawUrl, site) {
    let target = rawUrl;
    const userEmail = currentUser && currentUser.email ? currentUser.email.trim() : null;

    if (!userEmail) return target;

    try {
      const parsed = new URL(target);
      const host = parsed.hostname.toLowerCase();

      // Deep link Google Ecosystem directly with the logged-in user's Google account
      if (host.includes('google.com') || host.includes('youtube.com')) {
        if (host === 'mail.google.com') {
          return `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(userEmail)}`;
        } else if (host === 'drive.google.com') {
          return `https://drive.google.com/drive/u/?authuser=${encodeURIComponent(userEmail)}`;
        } else if (host === 'docs.google.com') {
          return `https://docs.google.com/document/u/?authuser=${encodeURIComponent(userEmail)}`;
        } else if (host === 'sheets.google.com') {
          return `https://docs.google.com/spreadsheets/u/?authuser=${encodeURIComponent(userEmail)}`;
        } else if (host === 'calendar.google.com') {
          return `https://calendar.google.com/calendar/u/?authuser=${encodeURIComponent(userEmail)}`;
        } else if (host === 'keep.google.com') {
          return `https://keep.google.com/u/?authuser=${encodeURIComponent(userEmail)}`;
        } else if (host === 'meet.google.com') {
          return `https://meet.google.com/?authuser=${encodeURIComponent(userEmail)}`;
        } else {
          return `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(userEmail)}&continue=${encodeURIComponent(target)}`;
        }
      }
    } catch (e) {
      console.warn('[SecureHub] SSO resolve notice:', e);
    }

    return target;
  }

  window.launchSite = function (rawUrl, siteName, ssoEnabled = false) {
    let resolvedUrl = resolveSsoUrl(rawUrl, { ssoGoogle: ssoEnabled });
    const safeUrl = sanitizeUrl(resolvedUrl);

    if (!safeUrl) {
      if (typeof showToast === 'function') {
        showToast('Invalid or unsafe URL format. Only HTTPS links are allowed.', 'error');
      } else {
        alert('Invalid or unsafe URL. Only HTTPS destinations can be launched.');
      }
      return;
    }

    // Open in separate browsing context with noopener (preserving safe referral for SSO handshakes)
    const win = window.open(safeUrl, '_blank', 'noopener');
    if (win) {
      win.opener = null;
    }

    // Record app launch event locally & in Firestore
    recordAppLaunchEvent({
      appName: siteName || 'Web App',
      appUrl: safeUrl,
      provider: ssoEnabled ? 'Google SSO' : 'Direct Launch',
      category: 'web'
    });

    const userEmail = currentUser && currentUser.email ? currentUser.email : null;
    if (typeof showToast === 'function') {
      if (safeUrl.includes('authuser=') || safeUrl.includes('AccountChooser')) {
        showToast(`Opening ${siteName} with ${userEmail} 🚀`, 'success');
      } else if (ssoEnabled) {
        showToast(`Opening ${siteName}... Click "Continue with Google" to complete sign-in.`, 'info');
      } else {
        showToast(`Opening ${siteName || 'website'} in safe browser tab...`, 'info');
      }
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
      if (currentCategory === 'sso') return site.ssoGoogle === true;
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
                  <svg class="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
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
            <button type="button" onclick="launchSite('${site.url}', '${escapeHtml(site.name)}', ${!!site.ssoGoogle})" class="launch-btn px-3.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary text-primary hover:text-white dark:bg-white/5 dark:hover:bg-primary-container dark:hover:text-primary-dim text-xs font-semibold flex items-center gap-1 border border-outline-variant/15 transition-all shadow-xs cursor-pointer" title="Open ${escapeHtml(site.name)} in a new browser tab">
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

    // Session & Login History Modal triggers
    if (hubSessionHistoryBtn) {
      hubSessionHistoryBtn.addEventListener('click', () => openSessionModal('devices'));
    }
    if (ssoHistoryQuickBtn) {
      ssoHistoryQuickBtn.addEventListener('click', () => openSessionModal('apps'));
    }
    if (hubSessionModalCloseBtn) {
      hubSessionModalCloseBtn.addEventListener('click', closeSessionModal);
    }
    if (hubSessionModalDoneBtn) {
      hubSessionModalDoneBtn.addEventListener('click', closeSessionModal);
    }
    if (hubSessionRefreshBtn) {
      hubSessionRefreshBtn.addEventListener('click', () => {
        if (hubRefreshIcon) {
          hubRefreshIcon.classList.add('animate-spin');
          setTimeout(() => hubRefreshIcon.classList.remove('animate-spin'), 650);
        }
        loadHubSessions();
        if (currentSessionTab === 'apps') loadHubAppHistory();
        if (currentSessionTab === 'history') loadHubLoginHistory();
        if (typeof showToast === 'function') showToast('Session data refreshed 🔄', 'info');
      });
    }

    // Modal Tabs Switching
    if (hubSessionTabs) {
      hubSessionTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.hub-session-tab');
        if (!btn) return;
        const tab = btn.getAttribute('data-tab');
        if (tab) switchSessionTab(tab);
      });
    }

    // Backdrop click and ESC for Session Modal
    if (hubSessionModal) {
      hubSessionModal.addEventListener('click', (e) => {
        if (e.target === hubSessionModal) closeSessionModal();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isSessionModalOpen()) closeSessionModal();
      });
    }

    // Action buttons inside Session Modal
    if (hubLogoutOtherBtn) {
      hubLogoutOtherBtn.addEventListener('click', handleLogoutOtherDevices);
    }
    if (clearHubAppHistoryBtn) {
      clearHubAppHistoryBtn.addEventListener('click', handleClearAppHistory);
    }
    if (clearHubLoginHistoryBtn) {
      clearHubLoginHistoryBtn.addEventListener('click', handleClearEndedSessions);
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

  // ─── User Agent & Device Resolver ───
  function parseUserAgent(ua) {
    let device = 'Desktop';
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';

    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
      device = /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Mobile';
    }

    if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
    else if (/Windows NT/i.test(ua)) os = 'Windows';
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

  function generateSessionToken() {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }

  function formatFullDateTime(timestamp) {
    if (!timestamp) return 'Unknown';
    let date;
    if (timestamp && timestamp.toDate) date = timestamp.toDate();
    else if (timestamp instanceof Date) date = timestamp;
    else date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function getClientIp() {
    if (cachedClientIp) return cachedClientIp;
    try {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(1200) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ip) {
          cachedClientIp = data.ip;
          return cachedClientIp;
        }
      }
    } catch (e) {}
    return 'Direct Web';
  }

  async function getUsernameForUser(user) {
    if (!user) return null;
    try {
      if (typeof getCurrentUser === 'function') {
        const u = getCurrentUser();
        if (u && u.username) return u.username;
      }
    } catch (e) {}

    if (window.db) {
      try {
        const snap = await window.db.collection('users').where('uid', '==', user.uid).limit(1).get();
        if (!snap.empty) {
          return snap.docs[0].id;
        }
      } catch (e) {}

      if (user.email) {
        try {
          const snapEmail = await window.db.collection('users').where('email', '==', user.email.toLowerCase().trim()).limit(1).get();
          if (!snapEmail.empty) {
            return snapEmail.docs[0].id;
          }
        } catch (e) {}
      }
    }

    return (user.email ? user.email.split('@')[0] : 'user').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || user.uid;
  }

  // ─── Record Login Session ───
  async function recordLoginSession(username) {
    if (!username || !window.db) return;
    try {
      const ua = navigator.userAgent;
      const deviceInfo = parseUserAgent(ua);
      const authUser = firebase.auth().currentUser;
      const isGoogle = authUser && authUser.providerData && authUser.providerData.some(p => p.providerId === 'google.com');
      const loginMethod = isGoogle ? 'Google SSO (Gmail)' : (authUser?.isAnonymous ? 'Guest' : 'Password');
      const accountEmail = (authUser && authUser.email) ? authUser.email : '';

      const existingSessionId = localStorage.getItem('enotepad_session_id');
      const existingToken = localStorage.getItem('enotepad_session_token');

      if (existingSessionId && existingToken) {
        try {
          const docRef = window.db.collection('users').doc(username).collection('sessions').doc(existingSessionId);
          const doc = await docRef.get();
          if (doc.exists && doc.data().isActive) {
            await docRef.update({
              lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
              loginMethod,
              accountEmail: accountEmail || doc.data().accountEmail || ''
            });
            return;
          }
        } catch (e) {
          console.warn('[SecureHub] Session reuse notice:', e);
        }
      }

      const sessionId = 'ses_' + generateSessionToken().slice(0, 16);
      let myToken = localStorage.getItem('enotepad_session_token');
      if (!myToken) {
        myToken = generateSessionToken();
        localStorage.setItem('enotepad_session_token', myToken);
      }
      await window.db.collection('users').doc(username).update({ sessionToken: myToken }).catch(() => {});

      const clientIp = await getClientIp();

      const sessionData = {
        sessionId,
        sessionToken: myToken,
        loginMethod,
        accountEmail,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ip: clientIp,
        loginAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        userAgent: ua.substring(0, 200)
      };

      localStorage.setItem('enotepad_session_id', sessionId);
      await window.db.collection('users').doc(username).collection('sessions').doc(sessionId).set(sessionData);
    } catch (e) {
      console.warn('[SecureHub] Session record error:', e);
    }
  }

  // ─── Record App Launch Event ───
  async function recordAppLaunchEvent(appInfo) {
    const ua = navigator.userAgent;
    const deviceInfo = parseUserAgent(ua);
    const now = Date.now();

    const launchRecord = {
      appName: appInfo.appName,
      appUrl: appInfo.appUrl,
      provider: appInfo.provider || 'Google SSO',
      category: appInfo.category || 'web',
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      launchedAtMs: now
    };

    // 1. Local storage cache
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECENT_LAUNCHES);
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      list.unshift(launchRecord);
      list = list.slice(0, 30);
      localStorage.setItem(STORAGE_KEY_RECENT_LAUNCHES, JSON.stringify(list));
    } catch (e) {}

    // 2. Firestore sync
    if (currentUser && window.db) {
      try {
        const username = await getUsernameForUser(currentUser);
        if (username) {
          await window.db.collection('users').doc(username).collection('appLaunches').add({
            appName: appInfo.appName,
            appUrl: appInfo.appUrl,
            provider: appInfo.provider || 'Google SSO',
            category: appInfo.category || 'web',
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            launchedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (err) {
        console.warn('[SecureHub] Firestore app launch save warning:', err);
      }
    }

    if (isSessionModalOpen() && currentSessionTab === 'apps') {
      loadHubAppHistory();
    }
  }

  // ─── Render Google SSO Apps Shelf ───
  function renderSsoAppsQuickGrid() {
    if (!ssoAppsQuickGrid) return;
    const ssoPresetIds = ['gmail', 'gdrive', 'gdocs', 'gsheets', 'gcalendar', 'gmeet', 'youtube', 'github', 'notion', 'chatgpt', 'canva', 'figma'];
    const ssoSites = PRESET_SITES.filter(s => ssoPresetIds.includes(s.id));

    const html = ssoSites.map(site => {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site.domain)}&sz=128`;
      return `
        <div class="sso-quick-card rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between group relative cursor-pointer" onclick="launchSite('${site.url}', '${escapeHtml(site.name)}', true)" title="1-Click Launch ${escapeHtml(site.name)} via Google SSO">
          <div class="flex items-center gap-2.5 mb-2.5">
            <div class="w-8 h-8 rounded-xl bg-surface-container-low dark:bg-white/5 flex items-center justify-center p-1.5 border border-outline-variant/15 flex-shrink-0 group-hover:scale-110 transition-transform overflow-hidden shadow-xs">
              <img src="${faviconUrl}" alt="${escapeHtml(site.name)}" class="w-full h-full object-contain" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
              <span class="material-symbols-outlined text-primary text-base" style="display:none;">${site.icon || 'public'}</span>
            </div>
            <div class="min-w-0 flex-1 leading-tight">
              <h4 class="font-headline font-bold text-xs sm:text-sm text-on-surface truncate group-hover:text-primary transition-colors">${escapeHtml(site.name)}</h4>
              <span class="text-[10px] text-on-surface-variant/70 font-mono truncate block">${escapeHtml(site.domain.replace(/^www\./, ''))}</span>
            </div>
          </div>
          
          <div class="flex items-center justify-between pt-2 border-t border-outline-variant/10 text-[10px]">
            <span class="sso-badge-google text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <svg class="w-2 h-2 flex-shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              SSO
            </span>
            <span class="text-primary dark:text-[#70b4f8] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Launch
              <span class="material-symbols-outlined text-[11px]">open_in_new</span>
            </span>
          </div>
        </div>
      `;
    }).join('');

    ssoAppsQuickGrid.innerHTML = html;
  }

  // ─── Session & Login History Modal Controller ───
  function isSessionModalOpen() {
    return hubSessionModal && !hubSessionModal.classList.contains('hidden');
  }

  function openSessionModal(defaultTab = 'devices') {
    if (!hubSessionModal) return;
    hubSessionModal.classList.remove('hidden');
    hubSessionModal.classList.add('flex');
    switchSessionTab(defaultTab);
  }

  function closeSessionModal() {
    if (!hubSessionModal) return;
    hubSessionModal.classList.add('hidden');
    hubSessionModal.classList.remove('flex');
  }

  function switchSessionTab(tabName) {
    currentSessionTab = tabName;
    if (hubSessionTabs) {
      hubSessionTabs.querySelectorAll('.hub-session-tab').forEach(b => {
        if (b.getAttribute('data-tab') === tabName) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    }

    if (hubPanelDevices) hubPanelDevices.classList.toggle('hidden', tabName !== 'devices');
    if (hubPanelApps) hubPanelApps.classList.toggle('hidden', tabName !== 'apps');
    if (hubPanelHistory) hubPanelHistory.classList.toggle('hidden', tabName !== 'history');

    loadHubSessions();
    if (tabName === 'apps') loadHubAppHistory();
    else if (tabName === 'history') loadHubLoginHistory();
  }

  async function loadHubSessions() {
    if (!hubSessionsList) return;
    hubSessionsList.innerHTML = `<div class="flex items-center justify-center py-6 text-on-surface-variant/40 text-xs"><span class="material-symbols-outlined text-base mr-2 animate-spin">progress_activity</span> Loading active devices...</div>`;

    const ua = navigator.userAgent;
    const currentDevice = parseUserAgent(ua);
    const mySessionId = localStorage.getItem('enotepad_session_id') || 'Current Browser';

    if (currentDeviceName) {
      currentDeviceName.textContent = `${currentDevice.os} • ${currentDevice.browser}`;
    }
    if (currentDeviceIcon) {
      currentDeviceIcon.textContent = currentDevice.device === 'Mobile' ? 'phone_android' : (currentDevice.device === 'Tablet' ? 'tablet' : 'laptop_mac');
    }
    if (hubSessionIdDisplay) {
      hubSessionIdDisplay.textContent = `Session: ${mySessionId.slice(0, 16)}`;
    }

    getClientIp().then(ip => {
      if (currentDeviceIp) currentDeviceIp.textContent = `IP: ${ip}`;
    });

    if (!currentUser || !window.db) {
      if (currentDeviceMethod) {
        currentDeviceMethod.textContent = 'Guest Browser Session';
      }
      if (hubTabDevicesCount) hubTabDevicesCount.textContent = '1';
      hubSessionsList.innerHTML = `
        <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-lg">${currentDevice.device === 'Mobile' ? 'phone_android' : 'laptop_mac'}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-on-surface">${currentDevice.os} • ${currentDevice.browser}</span>
                <span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600">Active</span>
              </div>
              <p class="text-[11px] text-on-surface-variant/70">Local guest session on this browser</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('authActionBtn').click()" class="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold hover:bg-primary-dim transition-all cursor-pointer">
            Sign In to Sync
          </button>
        </div>
        <div class="p-3.5 rounded-2xl bg-primary/5 border border-primary/15 text-xs text-on-surface-variant flex items-center gap-2.5">
          <span class="material-symbols-outlined text-primary text-lg flex-shrink-0">cloud_sync</span>
          <span>Sign in with Google to sync your active sessions, revoke other devices, and view cross-device login history.</span>
        </div>
      `;
      return;
    }

    if (currentDeviceMethod) {
      currentDeviceMethod.textContent = currentUser.email ? `Google SSO (${currentUser.email})` : 'Google SSO (Gmail)';
    }

    try {
      const username = await getUsernameForUser(currentUser);
      let sessionsSnap;
      try {
        sessionsSnap = await window.db.collection('users').doc(username).collection('sessions').where('isActive', '==', true).get();
      } catch (e) {
        sessionsSnap = await window.db.collection('users').doc(username).collection('sessions').limit(10).get();
      }

      const docs = [];
      sessionsSnap.forEach(d => docs.push(d.data()));

      if (hubTabDevicesCount) hubTabDevicesCount.textContent = docs.length || 1;

      if (docs.length === 0) {
        hubSessionsList.innerHTML = `
          <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-xl">devices</span>
              <div>
                <span class="text-xs font-bold text-on-surface">${currentDevice.os} • ${currentDevice.browser}</span>
                <p class="text-[11px] text-on-surface-variant/70">Current Active Device</p>
              </div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Active Now</span>
          </div>
        `;
        return;
      }

      hubSessionsList.innerHTML = docs.map(s => {
        const isCurrent = s.sessionId === mySessionId;
        const deviceIconName = (s.device === 'Mobile' || s.device === 'Tablet') ? 'phone_android' : 'laptop_mac';
        const lastSeenStr = s.lastSeen ? (typeof formatTimestamp === 'function' ? formatTimestamp(s.lastSeen) : 'Recently') : 'Active now';
        return `
          <div class="p-3.5 sm:p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="w-9 h-9 rounded-xl ${isCurrent ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-primary/10 text-primary'} flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-lg">${deviceIconName}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs sm:text-sm font-bold text-on-surface truncate">${escapeHtml(s.os || 'Unknown OS')} • ${escapeHtml(s.browser || 'Browser')}</span>
                  ${isCurrent ? '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Current Device</span>' : ''}
                </div>
                <div class="flex items-center gap-2 text-[10px] text-on-surface-variant/70 flex-wrap mt-0.5">
                  <span>IP: ${escapeHtml(s.ip || 'Direct Web')}</span>
                  <span>•</span>
                  <span>${escapeHtml(s.loginMethod || 'Google SSO')}</span>
                  <span>•</span>
                  <span>Seen ${lastSeenStr}</span>
                </div>
              </div>
            </div>
            <div class="flex-shrink-0">
              ${isCurrent ? `
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                </span>
              ` : `
                <button type="button" class="px-2.5 py-1 rounded-lg text-error/80 hover:text-error hover:bg-error/10 text-[11px] font-semibold transition-all logout-single-session-btn cursor-pointer" data-session-id="${escapeHtml(s.sessionId)}" title="Terminate this session">
                  Sign Out
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');

      attachSessionActions();

    } catch (err) {
      console.error('[SecureHub] Failed to load sessions:', err);
      hubSessionsList.innerHTML = `<p class="text-xs text-center py-4 text-error/70">Failed to load active sessions.</p>`;
    }
  }

  function attachSessionActions() {
    if (!hubSessionsList) return;
    hubSessionsList.querySelectorAll('.logout-single-session-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetSid = btn.getAttribute('data-session-id');
        if (!targetSid || !currentUser || !window.db) return;
        if (!confirm('Terminate this device session?')) return;
        try {
          const username = await getUsernameForUser(currentUser);
          await window.db.collection('users').doc(username).collection('sessions').doc(targetSid).update({ isActive: false });
          if (typeof showToast === 'function') showToast('Device session terminated 🔒', 'info');
          loadHubSessions();
        } catch (err) {
          console.error('[SecureHub] Single logout error:', err);
        }
      });
    });
  }

  async function loadHubAppHistory() {
    if (!hubAppHistoryList) return;
    hubAppHistoryList.innerHTML = `<div class="flex items-center justify-center py-6 text-on-surface-variant/40 text-xs"><span class="material-symbols-outlined text-base mr-2 animate-spin">progress_activity</span> Loading app activity...</div>`;

    let historyDocs = [];

    if (currentUser && window.db) {
      try {
        const username = await getUsernameForUser(currentUser);
        let snap;
        try {
          snap = await window.db.collection('users').doc(username).collection('appLaunches').orderBy('launchedAt', 'desc').limit(25).get();
        } catch (e) {
          snap = await window.db.collection('users').doc(username).collection('appLaunches').limit(25).get();
        }
        snap.forEach(d => {
          const data = d.data();
          historyDocs.push({
            id: d.id,
            appName: data.appName,
            appUrl: data.appUrl,
            provider: data.provider || 'Google SSO',
            browser: data.browser,
            os: data.os,
            launchedAt: data.launchedAt ? (typeof formatTimestamp === 'function' ? formatTimestamp(data.launchedAt) : 'Recently') : 'Recently',
            fullTime: data.launchedAt ? formatFullDateTime(data.launchedAt) : ''
          });
        });
      } catch (e) {
        console.warn('[SecureHub] Firestore app history error:', e);
      }
    }

    if (historyDocs.length === 0) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_RECENT_LAUNCHES);
        if (raw) {
          const localList = JSON.parse(raw);
          if (Array.isArray(localList)) {
            localList.forEach((item, idx) => {
              historyDocs.push({
                id: 'local_' + idx,
                appName: item.appName,
                appUrl: item.appUrl,
                provider: item.provider || 'Google SSO',
                browser: item.browser,
                os: item.os,
                launchedAt: item.launchedAtMs ? (typeof formatTimestamp === 'function' ? formatTimestamp(new Date(item.launchedAtMs)) : 'Recently') : 'Recently',
                fullTime: item.launchedAtMs ? new Date(item.launchedAtMs).toLocaleString() : ''
              });
            });
          }
        }
      } catch (e) {}
    }

    if (hubTabAppsCount) hubTabAppsCount.textContent = historyDocs.length;

    if (historyDocs.length === 0) {
      hubAppHistoryList.innerHTML = `
        <div class="p-6 rounded-2xl bg-surface-container-low text-center space-y-2 border border-outline-variant/10">
          <span class="material-symbols-outlined text-2xl text-on-surface-variant/40">apps</span>
          <p class="text-xs text-on-surface-variant font-medium">No SSO app activity recorded yet.</p>
          <p class="text-[11px] text-on-surface-variant/70">Launch Gmail, Google Drive, or your favorite tools from the Secure Hub to track your session history.</p>
        </div>
      `;
      return;
    }

    hubAppHistoryList.innerHTML = historyDocs.slice(0, 15).map(item => {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.appUrl || 'google.com')}&sz=64`;
      return `
        <div class="p-3 sm:p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center p-1.5 flex-shrink-0 border border-outline-variant/10">
              <img src="${faviconUrl}" alt="${escapeHtml(item.appName)}" class="w-full h-full object-contain" onerror="this.src='../assets/Favicon.png';" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold text-on-surface truncate">${escapeHtml(item.appName)}</span>
                <span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">${escapeHtml(item.provider)}</span>
              </div>
              <div class="flex items-center gap-2 text-[10px] text-on-surface-variant/70 flex-wrap mt-0.5">
                <span>${escapeHtml(item.browser || 'Browser')} on ${escapeHtml(item.os || 'OS')}</span>
                <span>•</span>
                <span title="${escapeHtml(item.fullTime)}">Opened ${escapeHtml(item.launchedAt)}</span>
              </div>
            </div>
          </div>
          <button type="button" onclick="launchSite('${item.appUrl}', '${escapeHtml(item.appName)}', true)" class="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer" title="Re-launch ${escapeHtml(item.appName)}">
            <span>Open</span>
            <span class="material-symbols-outlined text-xs">open_in_new</span>
          </button>
        </div>
      `;
    }).join('');
  }

  async function loadHubLoginHistory() {
    if (!hubLoginHistoryList) return;
    hubLoginHistoryList.innerHTML = `<div class="flex items-center justify-center py-6 text-on-surface-variant/40 text-xs"><span class="material-symbols-outlined text-base mr-2 animate-spin">progress_activity</span> Loading login audit trail...</div>`;

    if (!currentUser || !window.db) {
      if (hubTabHistoryCount) hubTabHistoryCount.textContent = '1';
      hubLoginHistoryList.innerHTML = `
        <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
            <div>
              <span class="text-xs font-bold text-on-surface">Active Guest Session</span>
              <p class="text-[11px] text-on-surface-variant/70">Temporary local browser session</p>
            </div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Active</span>
        </div>
      `;
      return;
    }

    try {
      const username = await getUsernameForUser(currentUser);
      let snap;
      try {
        snap = await window.db.collection('users').doc(username).collection('sessions').orderBy('loginAt', 'desc').limit(25).get();
      } catch (e) {
        snap = await window.db.collection('users').doc(username).collection('sessions').limit(25).get();
      }

      const docs = [];
      snap.forEach(d => docs.push(d.data()));
      docs.sort((a, b) => {
        const getMs = (val) => val ? (val.toMillis ? val.toMillis() : new Date(val).getTime() || 0) : 0;
        return getMs(b.loginAt) - getMs(a.loginAt);
      });

      if (hubTabHistoryCount) hubTabHistoryCount.textContent = docs.length;

      if (docs.length === 0) {
        hubLoginHistoryList.innerHTML = `<p class="text-xs text-center py-4 text-on-surface-variant/60">No login history recorded yet.</p>`;
        return;
      }

      const mySessionId = localStorage.getItem('enotepad_session_id');

      hubLoginHistoryList.innerHTML = docs.map(s => {
        const isCurrent = s.sessionId && s.sessionId === mySessionId;
        const isActive = s.isActive !== false;
        const timeStr = s.loginAt ? (typeof formatTimestamp === 'function' ? formatTimestamp(s.loginAt) : 'Recently') : 'Recently';
        const fullTime = s.loginAt ? formatFullDateTime(s.loginAt) : '';

        return `
          <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="w-8 h-8 rounded-xl ${isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-surface-container text-on-surface-variant/60'} flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-lg">${isActive ? 'login' : 'logout'}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-bold text-on-surface truncate">${escapeHtml(s.loginMethod || 'Google SSO')}</span>
                  ${isCurrent ? '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Current Device</span>' : ''}
                </div>
                <div class="flex items-center gap-2 text-[10px] text-on-surface-variant/70 flex-wrap mt-0.5">
                  <span>${escapeHtml(s.os || 'OS')} • ${escapeHtml(s.browser || 'Browser')}</span>
                  <span>•</span>
                  <span>IP: ${escapeHtml(s.ip || 'Direct Web')}</span>
                  <span>•</span>
                  <span title="${escapeHtml(fullTime)}">${timeStr}</span>
                </div>
              </div>
            </div>
            <div class="flex-shrink-0">
              ${isActive ? `
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Active</span>
              ` : `
                <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant/60">Ended</span>
              `}
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error('[SecureHub] Login history error:', err);
      hubLoginHistoryList.innerHTML = `<p class="text-xs text-center py-4 text-error/70">Failed to load login audit trail.</p>`;
    }
  }

  async function handleLogoutOtherDevices() {
    if (!currentUser || !window.db) {
      if (typeof showToast === 'function') {
        showToast('Connect with Google to manage and sign out other devices.', 'info');
      }
      return;
    }

    if (!confirm('Are you sure you want to sign out all other devices? Only this current browser will remain active.')) {
      return;
    }

    try {
      const username = await getUsernameForUser(currentUser);
      if (!username) return;

      const currentSessionId = localStorage.getItem('enotepad_session_id');
      const newToken = generateSessionToken();
      localStorage.setItem('enotepad_session_token', newToken);

      await window.db.collection('users').doc(username).update({ sessionToken: newToken });

      const sessionsRef = window.db.collection('users').doc(username).collection('sessions');
      const activeSnap = await sessionsRef.where('isActive', '==', true).get();

      const batch = window.db.batch();
      activeSnap.forEach(doc => {
        if (doc.data().sessionId !== currentSessionId) {
          batch.update(doc.ref, { isActive: false });
        }
      });
      await batch.commit();

      if (typeof showToast === 'function') {
        showToast('All other devices have been signed out! 🔒', 'success');
      }

      loadHubSessions();
      loadHubLoginHistory();
    } catch (err) {
      console.error('[SecureHub] Sign out others error:', err);
      if (typeof showToast === 'function') {
        showToast('Failed to sign out other devices.', 'error');
      }
    }
  }

  async function handleClearAppHistory() {
    if (!confirm('Are you sure you want to clear your SSO app launch activity history?')) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY_RECENT_LAUNCHES);

      if (currentUser && window.db) {
        const username = await getUsernameForUser(currentUser);
        if (username) {
          const snap = await window.db.collection('users').doc(username).collection('appLaunches').limit(50).get();
          const batch = window.db.batch();
          snap.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }

      if (typeof showToast === 'function') {
        showToast('SSO app launch history cleared! 🧹', 'success');
      }

      loadHubAppHistory();
    } catch (err) {
      console.error('[SecureHub] Clear app history error:', err);
    }
  }

  async function handleClearEndedSessions() {
    if (!currentUser || !window.db) return;

    if (!confirm('Clear all inactive and ended login sessions from audit history?')) {
      return;
    }

    try {
      const username = await getUsernameForUser(currentUser);
      if (!username) return;

      const snap = await window.db.collection('users').doc(username).collection('sessions').where('isActive', '==', false).limit(50).get();
      const batch = window.db.batch();
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();

      if (typeof showToast === 'function') {
        showToast('Ended sessions cleared from audit trail.', 'success');
      }

      loadHubLoginHistory();
    } catch (err) {
      console.error('[SecureHub] Clear ended sessions error:', err);
    }
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

