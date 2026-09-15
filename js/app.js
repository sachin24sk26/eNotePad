// ============================================================
// App Controller — The Tactile Editorial
// Initializes all modules, handles unified tab switching
// across sidebar, topnav, mobile nav, and inline tabs.
// Manages dark mode, sidebar, and periodic cleanup.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initHeaderScroll();
  initTheme();
  initSidebar();
  initEditor();
  initShare();
  initAccess();
  initAuth();
  initFileManager();
  initUsers();
  initPeriodicCleanup();
  initBroadcastListener();
  initFeedback();
  initGuestNudgeSystem();
  initCustomCursor();
  initPWA();
  initAiAssist();
  console.log('✨ eNotePad — Digital Curator initialized');
});

/**
 * PWA Service Worker Registration
 */
function initPWA() {
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('✨ eNotePad Service Worker active with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration notice:', err);
        });
    });
  }
}

/**
 * Custom Creative Cursor Follower
 */
function initCustomCursor() {
  // Only initialize on devices that support hovering (e.g., desktops/laptops)
  if (!window.matchMedia("(any-hover: hover)").matches) {
    return; // Leave native cursor completely alone for pure touch devices
  }

  // 1. DYNAMIC DOM INJECTION
  // Create dot
  const cursorDot = document.createElement('div');
  cursorDot.className = 'custom-cursor-dot';
  // Enforce bulletproof inline styles
  cursorDot.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    pointer-events: none !important;
    z-index: 999999 !important;
    opacity: 0;
  `;

  // Create outline
  const cursorOutline = document.createElement('div');
  cursorOutline.className = 'custom-cursor-outline';
  // Enforce bulletproof inline styles
  cursorOutline.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    pointer-events: none !important;
    z-index: 999998 !important;
    opacity: 0;
  `;

  // Inject into DOM at the very end
  document.body.appendChild(cursorDot);
  document.body.appendChild(cursorOutline);

  // 2. FORCE HIDE NATIVE CURSOR
  // Instead of @media queries, we dynamically attach this to guarantee sync
  document.body.classList.add('hide-native-cursor');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let outlineX = mouseX;
  let outlineY = mouseY;
  let isVisible = false;
  let idleTimeout = null;

  const hideCursor = () => {
    isVisible = false;
    cursorDot.style.opacity = '0';
    cursorOutline.style.opacity = '0';
  };

  const showCursor = () => {
    if (!isVisible) {
      isVisible = true;
      cursorDot.style.opacity = '1';
      cursorOutline.style.opacity = '1';
    }
  };

  // Track mouse movement
  window.addEventListener('mousemove', (e) => {
    clearTimeout(idleTimeout);

    if (!isVisible) {
      showCursor();
      outlineX = e.clientX;
      outlineY = e.clientY;
      console.log('✨ eNotePad Cursor Activated');
    }
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // The inner dot follows instantly
    cursorDot.style.left = `${mouseX}px`;
    cursorDot.style.top = `${mouseY}px`;

    // Set timeout to hide cursor after 3 seconds of inactivity
    idleTimeout = setTimeout(hideCursor, 3000);
  });

  document.addEventListener('mouseleave', () => {
    clearTimeout(idleTimeout);
    hideCursor();
  });

  // Smooth animation for the outline
  function animateCursor() {
    let dx = mouseX - outlineX;
    let dy = mouseY - outlineY;
    outlineX += dx * 0.15;
    outlineY += dy * 0.15;

    cursorOutline.style.left = `${outlineX}px`;
    cursorOutline.style.top = `${outlineY}px`;

    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // 3. EVENT DELEGATION FOR HOVER STATES
  document.addEventListener('mouseover', (e) => {
    if (!isVisible || !e.target || typeof e.target.matches !== 'function') return;
    
    try {
      if (e.target.matches('input[type="text"], input[type="password"], textarea, [contenteditable="true"]')) {
        cursorOutline.classList.add('text-hover');
        cursorDot.style.opacity = '0';
      } else if (e.target.closest('a, button, select, .clickable, .account-tab, .sidebar-nav-btn, label')) {
        cursorOutline.classList.add('hover');
      }
    } catch (err) { /* safely ignore node errors */ }
  });

  document.addEventListener('mouseout', (e) => {
    if (!isVisible || !e.target || typeof e.target.matches !== 'function') return;
    
    try {
      if (e.target.matches('input[type="text"], input[type="password"], textarea, [contenteditable="true"]')) {
        cursorOutline.classList.remove('text-hover');
        cursorDot.style.opacity = '1';
      } else if (e.target.closest('a, button, select, .clickable, .account-tab, .sidebar-nav-btn, label')) {
        cursorOutline.classList.remove('hover');
      }
    } catch (err) { /* safely ignore node errors */ }
  });
}


/**
 * Floating Sticky Top Header Navigation Bar.
 * Provides frosted glass elevation on scroll and smart directional sticky behavior.
 * Stays visible at top, glides away on continuous fast scroll-down, reveals immediately on scroll-up.
 */
function initHeaderScroll() {
  const header = document.getElementById('topAppBar') || document.querySelector('header');
  if (!header) return;

  header.classList.remove('-translate-y-full', 'header-hidden');

  let lastScrollY = window.scrollY || 0;
  let isHovered = false;
  let isFocused = false;
  let ticking = false;

  const updateHeader = () => {
    const currentScrollY = Math.max(0, window.scrollY || 0);
    const scrollDelta = currentScrollY - lastScrollY;

    // Elevation styling on scroll
    if (currentScrollY > 10) {
      header.classList.add('header-scrolled');
    } else {
      header.classList.remove('header-scrolled');
    }

    // Smart sticky visibility:
    // 1. Near the top of the page (< 60px): Always fully visible
    // 2. If user is hovering or focusing elements inside header: Always visible
    // 3. Scrolling Down past 120px with momentum (> 8px): Glide away
    // 4. Scrolling Up even slightly (< -4px): Reveal immediately
    if (currentScrollY <= 60 || isHovered || isFocused) {
      header.classList.remove('header-hidden');
    } else if (scrollDelta > 8 && currentScrollY > 120) {
      header.classList.add('header-hidden');
    } else if (scrollDelta < -4) {
      header.classList.remove('header-hidden');
    }

    lastScrollY = currentScrollY;
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  };

  const showHeader = () => {
    header.classList.remove('header-hidden');
  };

  header.addEventListener('mouseenter', () => {
    isHovered = true;
    showHeader();
  });

  header.addEventListener('mouseleave', () => {
    isHovered = false;
  });

  header.addEventListener('focusin', () => {
    isFocused = true;
    showHeader();
  });

  header.addEventListener('focusout', () => {
    isFocused = false;
  });

  // Mouse reaching top viewport edge reveals header immediately
  window.addEventListener('mousemove', (e) => {
    if (e.clientY <= 50) showHeader();
  }, { passive: true });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('touchstart', () => {}, { passive: true });

  // Initial check
  updateHeader();
}

/**
 * Feedback Modal — works for all users (guest + logged in).
 * Opened from sidebar "Feedback to Dev" button or Settings page button.
 */
function initFeedback() {
  const modal       = document.getElementById('feedbackModal');
  const textarea    = document.getElementById('feedbackTextarea');
  const charCount   = document.getElementById('feedbackCharCount');
  const submitBtn   = document.getElementById('submitFeedbackBtn');
  const cancelBtn   = document.getElementById('cancelFeedbackBtn');
  const closeBtn    = document.getElementById('closeFeedbackModal');
  const backdrop    = document.getElementById('feedbackBackdrop');
  const sidebarBtn  = document.getElementById('sidebarFeedbackBtn');
  const settingsBtn = document.getElementById('openFeedbackBtn');

  let selectedCategory = 'general';

  // --- Open modal ---
  function openModal() {
    modal.style.display = 'flex';
    textarea.value = '';
    charCount.textContent = '0';
    selectedCategory = 'general';
    // Reset chips
    document.querySelectorAll('.feedback-chip').forEach(c => {
      const isGeneral = c.dataset.cat === 'general';
      c.classList.toggle('active', isGeneral);
      c.classList.toggle('bg-primary/10', isGeneral);
      c.classList.toggle('text-primary', isGeneral);
      c.classList.toggle('border-primary/20', isGeneral);
      c.classList.toggle('text-primary/50', !isGeneral);
      c.classList.toggle('border-outline-variant/20', !isGeneral);
    });
    setTimeout(() => textarea.focus(), 150);
  }

  // --- Close modal ---
  function closeModal() {
    modal.style.display = 'none';
  }

  // --- Category chips ---
  document.querySelectorAll('.feedback-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedCategory = chip.dataset.cat;
      document.querySelectorAll('.feedback-chip').forEach(c => {
        const isActive = c === chip;
        c.classList.toggle('active', isActive);
        c.classList.toggle('bg-primary/10', isActive);
        c.classList.toggle('text-primary', isActive);
        c.classList.toggle('border-primary/20', isActive);
        c.classList.toggle('text-primary/50', !isActive);
        c.classList.toggle('border-outline-variant/20', !isActive);
      });
    });
  });

  // --- Character counter ---
  if (textarea) {
    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length;
    });
  }

  // --- Submit ---
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const msg = textarea.value.trim();
      if (!msg) {
        textarea.classList.add('ring-2', 'ring-error/30');
        setTimeout(() => textarea.classList.remove('ring-2', 'ring-error/30'), 1500);
        return;
      }
      submitBtn.disabled = true;
      submitBtn.classList.add('btn-loading');
      const ok = await sendFeedback(`[${selectedCategory.toUpperCase()}] ${msg}`);
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-loading');
      if (ok) closeModal();
    });
  }

  // --- Open triggers ---
  if (sidebarBtn)  sidebarBtn.addEventListener('click', openModal);
  if (settingsBtn) settingsBtn.addEventListener('click', openModal);

  // --- Close triggers ---
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (closeBtn)  closeBtn.addEventListener('click', closeModal);
  if (backdrop)  backdrop.addEventListener('click', closeModal);

  // --- Escape key ---
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.style.display !== 'none') closeModal();
  });
}


/**
 * Show/hide and toggle mobile off-canvas drawer.
 */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const closeSidebarBtn = document.getElementById('closeSidebarDrawerBtn');
  const headerMenuBtn = document.getElementById('headerMenuBtn');
  const mobileNavMenuBtn = document.getElementById('mobileNavMenuBtn');

  function openMobileDrawer() {
    if (!sidebar) return;
    sidebar.classList.add('mobile-open');
    if (sidebarBackdrop) {
      sidebarBackdrop.style.display = 'block';
      requestAnimationFrame(() => {
        sidebarBackdrop.classList.add('active');
      });
    }
    document.body.style.overflow = 'hidden';
  }

  function closeMobileDrawer() {
    if (!sidebar) return;
    sidebar.classList.remove('mobile-open');
    if (sidebarBackdrop) {
      sidebarBackdrop.classList.remove('active');
      setTimeout(() => {
        if (!sidebarBackdrop.classList.contains('active')) {
          sidebarBackdrop.style.display = 'none';
        }
      }, 300);
    }
    document.body.style.overflow = '';
  }

  if (headerMenuBtn) headerMenuBtn.addEventListener('click', openMobileDrawer);
  if (mobileNavMenuBtn) mobileNavMenuBtn.addEventListener('click', openMobileDrawer);
  if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMobileDrawer);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileDrawer);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar && sidebar.classList.contains('mobile-open')) {
      closeMobileDrawer();
    }
  });

  window.openMobileDrawer = openMobileDrawer;
  window.closeMobileDrawer = closeMobileDrawer;

  // Sidebar user profile click → navigate to account tab
  const sidebarUserInfo = document.getElementById('sidebarUserInfo');
  const sidebarLoggedOutBtn = document.getElementById('sidebarLoggedOutBtn');

  const onProfileClick = () => {
    closeMobileDrawer();
    if (typeof window.switchToTab === 'function') {
      window.switchToTab('account');
      setTimeout(() => {
        const settingsTab = document.querySelector('.account-tab[data-account-tab="settings"]');
        if (settingsTab) settingsTab.click();
      }, 50);
    }
  };

  if (sidebarUserInfo) sidebarUserInfo.addEventListener('click', onProfileClick);
  if (sidebarLoggedOutBtn) sidebarLoggedOutBtn.addEventListener('click', onProfileClick);

  // Top header inbox button click → navigate to account tab and open inbox sub-tab
  const topNavInboxBtn = document.getElementById('topNavInboxBtn');
  const mobileTopInboxBtn = document.getElementById('mobileTopInboxBtn');

  const onInboxClick = () => {
    closeMobileDrawer();
    if (typeof window.switchToTab === 'function') {
      window.switchToTab('account');
      setTimeout(() => {
        const inboxTab = document.querySelector('.account-tab[data-account-tab="inbox"]');
        if (inboxTab) inboxTab.click();
      }, 50);
    }
  };

  if (topNavInboxBtn) topNavInboxBtn.addEventListener('click', onInboxClick);
  if (mobileTopInboxBtn) mobileTopInboxBtn.addEventListener('click', onInboxClick);

  // Sidebar quick links for logged-in users
  const quickLinks = document.querySelectorAll('.sidebar-quick-link');
  quickLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMobileDrawer();
      const action = link.dataset.sidebarAction;
      if (action === 'files') {
        // Navigate to Account tab and switch to Files sub-tab
        if (typeof window.switchToTab === 'function') window.switchToTab('account');
        setTimeout(() => {
          const filesTab = document.querySelector('.account-tab[data-account-tab="files"]');
          if (filesTab) filesTab.click();
        }, 50);
        return;
      }
      // Navigate to Account tab and switch to the correct sub-tab
      if (typeof window.switchToTab === 'function') {
        window.switchToTab('account');
      }
      // Switch account sub-tab
      setTimeout(() => {
        const accountTab = document.querySelector(`.account-tab[data-account-tab="${action}"]`);
        if (accountTab) accountTab.click();
      }, 50);
    });
  });
}

/**
 * Unified navigation system.
 * Syncs tab state across all nav elements.
 */
function initNavigation() {
  const panels = {
    share: document.getElementById('panelShare'),
    access: document.getElementById('panelAccess'),
    account: document.getElementById('panelAccount'),
    admin: document.getElementById('panelAdmin'),
    search: document.getElementById('panelSearch')
  };

  const sidebarBtns = document.querySelectorAll('.sidebar-nav-btn');
  const topnavLinks = document.querySelectorAll('.topnav-link');
  const mobileBtns = document.querySelectorAll('.mobile-nav-btn');
  const inlineTabs = document.querySelectorAll('.inline-tab');

  // "New Note" button → share panel, reset form
  const newNoteBtn = document.getElementById('newNoteBtn');
  if (newNoteBtn) {
    newNoteBtn.addEventListener('click', () => {
      switchTab('share');
      showEl('shareForm');
      hideEl('codeDisplay');
    });
  }

  // "Share another" button
  const shareAnotherBtn = document.getElementById('shareAnotherBtn');
  if (shareAnotherBtn) {
    shareAnotherBtn.addEventListener('click', () => {
      hideEl('codeDisplay');
      showEl('shareForm');
      setTimeout(() => {
        const shareFormEl = document.getElementById('shareForm');
        if (shareFormEl) {
          shareFormEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    });
  }

  /**
   * Switch to a tab and sync all navigation elements.
   */
  function switchTab(tabName) {
    // ─── Admin Route Protection Guard ───
    if (tabName === 'admin') {
      const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
      const isAdmin = user && (user.role === 'admin' || user.isAdmin === true);
      if (!isAdmin) {
        if (typeof showToast === 'function') {
          showToast('Access restricted. Administrator credentials required.', 'error');
        }
        tabName = 'share';
        if (window.location.hash === '#admin') {
          try {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          } catch (e) {
            window.location.hash = '';
          }
        }
      }
    }

    // Close mobile drawer if open
    if (typeof closeMobileDrawer === 'function') {
      closeMobileDrawer();
    }

    // Update panels — guard against null
    Object.keys(panels).forEach(key => {
      if (panels[key]) {
        panels[key].setAttribute('data-active', key === tabName ? 'true' : 'false');
      }
    });

    // Sync sidebar
    sidebarBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Sync topnav
    topnavLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.tab === tabName);
    });

    // Sync mobile bottom dock
    mobileBtns.forEach(btn => {
      if (!btn.dataset.tab) return;
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.style.fontVariationSettings = isActive ? "'FILL' 1" : "'FILL' 0";
    });

    // If opening admin tab, initialize admin functions
    if (tabName === 'admin' && typeof initAdmin === 'function') {
      initAdmin();
    }
  }

  // Expose globally for sidebar quick links and hash routing
  window.switchToTab = switchTab;

  // Handle hash / param on load
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || window.location.hash.replace('#', '');
    if (initialTab && panels[initialTab]) {
      switchTab(initialTab);
    }
  } catch (e) {}

  window.addEventListener('hashchange', () => {
    const hashTab = window.location.hash.replace('#', '');
    if (hashTab && panels[hashTab]) {
      switchTab(hashTab);
    }
  });

  // Attach click handlers (deduplicated)
  [...sidebarBtns, ...topnavLinks, ...mobileBtns, ...inlineTabs].forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(el.dataset.tab);
    });
  });
}

/**
 * Dark/Light theme toggle.
 */
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;

  // Check saved preference or system preference
  const saved = localStorage.getItem('enotpad_theme');
  if (saved === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
  } else if (saved === 'light') {
    html.classList.remove('dark');
    html.classList.add('light');
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    html.classList.add('dark');
    html.classList.remove('light');
  }

  themeToggle.addEventListener('click', () => {
    const isDark = html.classList.contains('dark');
    html.classList.toggle('dark', !isDark);
    html.classList.toggle('light', isDark);
    localStorage.setItem('enotpad_theme', isDark ? 'light' : 'dark');
  });
}

/**
 * Periodic cleanup: erase expired shares on load and every 5 minutes.
 * All shared content auto-erases after 20 minutes.
 */
function initPeriodicCleanup() {
  // Run immediately on load
  cleanupExpiredShares();

  // Run every 5 minutes
  setInterval(cleanupExpiredShares, 5 * 60 * 1000);
}

// ---- Utility: show/hide elements via data-hidden attribute ----
function hideEl(id) {
  const el = document.getElementById(id);
  if (el) el.setAttribute('data-hidden', 'true');
}

function showEl(id) {
  const el = document.getElementById(id);
  if (el) el.removeAttribute('data-hidden');
}

/**
 * Auto-logout due to inactivity (20 minutes).
 * Shows a 60-second countdown warning at 19 minutes before signing out.
 */
(function initInactivityTimer() {
  const WARN_AFTER_MS   = 19 * 60 * 1000; // Show warning at 19 min
  const LOGOUT_AFTER_MS = 20 * 60 * 1000; // Sign out at 20 min
  const COUNTDOWN_SECS  = 60;             // Warning countdown duration

  let warnTimer = null;
  let logoutTimer = null;
  let countdownInterval = null;
  let warningVisible = false;

  // DOM refs are fetched after DOM ready
  let warningEl   = null;
  let countdownEl = null;

  function isLoggedIn() {
    return typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser;
  }

  function hideWarning() {
    if (warningEl) warningEl.style.display = 'none';
    warningVisible = false;
    clearInterval(countdownInterval);
  }

  function showWarning() {
    if (!isLoggedIn() || !warningEl) return;
    warningEl.style.display = 'flex';
    warningVisible = true;

    let remaining = COUNTDOWN_SECS;
    if (countdownEl) countdownEl.textContent = remaining;

    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      remaining--;
      if (countdownEl) countdownEl.textContent = remaining;
      if (remaining <= 0) clearInterval(countdownInterval);
    }, 1000);
  }

  function scheduleTimers() {
    clearTimeout(warnTimer);
    clearTimeout(logoutTimer);

    warnTimer = setTimeout(() => {
      if (isLoggedIn()) showWarning();
    }, WARN_AFTER_MS);

    logoutTimer = setTimeout(() => {
      if (isLoggedIn()) {
        hideWarning();
        const terminate = typeof window.terminateCurrentSession === 'function'
          ? window.terminateCurrentSession()
          : Promise.resolve();

        terminate.finally(() => {
          if (window.currentSessionUnsub) { window.currentSessionUnsub(); window.currentSessionUnsub = null; }
          firebase.auth().signOut().then(() => {
            if (typeof showToast === 'function') {
              showToast('Signed out due to inactivity (20 min)', 'warning');
            }
          }).catch(console.error);
        });
      }
    }, LOGOUT_AFTER_MS);
  }

  function resetTimers() {
    if (warningVisible) hideWarning();
    if (isLoggedIn()) {
      scheduleTimers();
      if (typeof window.updateSessionActivity === 'function') {
        window.updateSessionActivity();
      }
    }
  }

  // Expose for auth module
  window.resetInactivityTimer = resetTimers;
  window.cancelInactivityTimer = () => {
    clearTimeout(warnTimer);
    clearTimeout(logoutTimer);
    clearInterval(countdownInterval);
    hideWarning();
  };

  // Attach activity listeners
  const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'pointerdown'];
  ACTIVITY_EVENTS.forEach(evt => {
    window.addEventListener(evt, resetTimers, { passive: true });
  });

  // Initialise after DOM is ready (so we can find the elements)
  document.addEventListener('DOMContentLoaded', () => {
    warningEl   = document.getElementById('inactivityWarning');
    countdownEl = document.getElementById('inactivityCountdown');
    const stayBtn = document.getElementById('stayLoggedInBtn');

    if (stayBtn) {
      stayBtn.addEventListener('click', () => {
        hideWarning();
        scheduleTimers();
      });
    }

    // Initial kick — start timer if user is already logged in on page load
    setTimeout(() => {
      if (isLoggedIn()) scheduleTimers();
    }, 2500);
  });
})();

/**
 * Guest Nudge & Notification System — Enhanced & Interactive
 * Non-intrusive, attractive prompts for guest users to encourage sign-up / log-in.
 * Features: 15 dynamic spotlight messages, interval playback engine with progress bar,
 * dual Sign Up / Sign In actions, guest alert modal dialog, and milestone toasts.
 */
function initGuestNudgeSystem() {
  // ── Helper: is user logged in? ──────────────────────────────────
  const isGuest = () => {
    const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    return !u;
  };

  if (!isGuest()) return; // Bail immediately if already logged in

  // ── 1. DYNAMIC SPOTLIGHT MESSAGES (15 VARIED TOPICS) ─────────────
  const messages = [
    {
      badge: 'Preservation',
      icon: 'timer',
      title: '⏳ Guest notes vanish in 20 min',
      text: 'Guest notes auto-expire soon! Create a free account to lock in your notes permanently and keep your ideas safe forever.',
      btnText: 'Save Notes Forever'
    },
    {
      badge: 'Cloud Sync',
      icon: 'cloud_sync',
      title: '🚀 Access Notes Across All Devices',
      text: 'Sync your notes seamlessly between your phone, tablet, and laptop. Access your desk anytime, anywhere.',
      btnText: 'Enable Cloud Sync'
    },
    {
      badge: 'Privacy & Security',
      icon: 'lock_person',
      title: '🔐 Passcode & PIN Note Locking',
      text: 'Protect confidential notes from prying eyes! Member accounts get PIN code locking and encrypted storage.',
      btnText: 'Lock My Notes'
    },
    {
      badge: 'Organization',
      icon: 'folder_managed',
      title: '📁 Custom Folders & Smart Tags',
      text: 'Stop lost scribbles! Categorize notes into custom folders, assign colorful tags, and filter instantly.',
      btnText: 'Organize With Folders'
    },
    {
      badge: 'Direct Messaging',
      icon: 'mark_as_unread',
      title: '📬 Direct Note DM & File Sharing',
      text: 'Send notes, images, documents, and code snippets directly to other registered members in seconds.',
      btnText: 'Start Direct Messaging'
    },
    {
      badge: 'Live Rooms',
      icon: 'forum',
      title: '💬 Real-Time Encrypted Convo Rooms',
      text: 'Collaborate with friends in real-time encrypted rooms with live document sharing and instant messaging.',
      btnText: 'Join Live Rooms'
    },
    {
      badge: 'Pro Profile',
      icon: 'verified',
      title: '✨ Claim Your @Username & Badge',
      text: 'Get a personalized public bio page, custom avatar, and show off your verified creator profile badge.',
      btnText: 'Claim My Profile'
    },
    {
      badge: 'Customization',
      icon: 'palette',
      title: '🎨 Glassmorphism & Themes',
      text: 'Personalize your workspace with dark mode, modern glassmorphism, and custom editorial typography.',
      btnText: 'Unlock Custom Themes'
    },
    {
      badge: 'Smart Search',
      icon: 'search_insights',
      title: '🔍 Instant Full-Text & Tag Search',
      text: 'Find any past note, keyword, or code snippet in milliseconds with full-text fuzzy search.',
      btnText: 'Enable Instant Search'
    },
    {
      badge: 'Auto-Transfer',
      icon: 'move_up',
      title: '🛡️ Auto-Migrate Your Guest Notes',
      text: 'Already typed notes today as a guest? Sign up now and we will automatically transfer them to your new account!',
      btnText: 'Transfer Notes Now'
    },
    {
      badge: 'Analytics',
      icon: 'insights',
      title: '📈 Detailed Writing Analytics',
      text: 'Track your word count, reading time estimates, and productivity streaks with live writing stats.',
      btnText: 'Track My Writing'
    },
    {
      badge: 'Notifications',
      icon: 'notifications_active',
      title: '🔔 Real-Time Activity Alerts',
      text: 'Get notified instantly when someone views, replies to, or interacts with your shared notes.',
      btnText: 'Get Activity Alerts'
    },
    {
      badge: 'Exporting',
      icon: 'download_for_offline',
      title: '📤 Export to PDF, HTML & Markdown',
      text: 'Download your notes cleanly in Markdown, PDF, HTML, or raw text format with a single click.',
      btnText: 'Export Notes Free'
    },
    {
      badge: 'Public Bio',
      icon: 'language',
      title: '🌐 Share Your Public Portfolio',
      text: 'Publish custom public bio links to showcase your articles, snippets, and notes with the world.',
      btnText: 'Create Public Link'
    },
    {
      badge: 'Note History',
      icon: 'history_toggle_off',
      title: '🕐 Complete Version History',
      text: 'Never lose a revision again. Access full version history and restore previous note drafts easily.',
      btnText: 'Unlock Note History'
    }
  ];

  // ── 2. DOM ELEMENTS ───────────────────────────────────────────────
  const banner       = document.getElementById('guestNudgeBanner');
  const badgeWrap    = document.getElementById('guestNudgeBadge');
  const badgeTextEl  = document.getElementById('guestNudgeBadgeText');
  const counterEl    = document.getElementById('guestNudgeCounter');
  const iconEl       = document.getElementById('guestNudgeIcon');
  const iconWrapEl   = document.getElementById('guestNudgeIconWrap');
  const titleEl      = document.getElementById('guestNudgeTitle');
  const textEl       = document.getElementById('guestNudgeText');
  const btnLabelEl   = document.getElementById('guestNudgeBtnLabel');
  const actionBtn    = document.getElementById('guestNudgeActionBtn');
  const loginBtn     = document.getElementById('guestNudgeLoginBtn');
  const closeBtn     = document.getElementById('guestNudgeClose');
  const prevBtn      = document.getElementById('guestNudgePrev');
  const nextBtn      = document.getElementById('guestNudgeNext');
  const progressBar  = document.getElementById('guestNudgeProgressBar');

  let cardMsgIndex = 0;
  let cardDismissed = false;
  let isHovered = false;
  let progressMs = 0;
  const DISPLAY_DURATION_MS = 6000; // Snappy 6 seconds per spotlight message
  const TICK_MS = 100;
  let intervalTimer = null;

  // ── 3. AUTH MODAL NAVIGATION HELPERS ──────────────────────────────
  function openSignup() {
    if (typeof window.switchToTab === 'function') {
      window.switchToTab('account');
      setTimeout(() => {
        const signupTab = document.getElementById('authTabRegister') || document.querySelector('.auth-tab-btn[data-auth-tab="signup"]');
        if (signupTab) signupTab.click();
      }, 80);
    }
  }

  function openLogin() {
    if (typeof window.switchToTab === 'function') {
      window.switchToTab('account');
      setTimeout(() => {
        const loginTab = document.getElementById('authTabLogin') || document.querySelector('.auth-tab-btn[data-auth-tab="login"]');
        if (loginTab) loginTab.click();
      }, 80);
    }
  }

  // ── 4. RENDER SPOTLIGHT MESSAGE & INTERVAL PLAYBACK ──────────────
  function renderMessage(index) {
    if (!banner || !isGuest()) return;
    const msg = messages[(index + messages.length) % messages.length];
    cardMsgIndex = (index + messages.length) % messages.length;

    // Smooth subtle fade out transition during content swap
    if (iconWrapEl) iconWrapEl.style.opacity = '0.3';
    if (titleEl) titleEl.style.opacity = '0.3';
    if (textEl) textEl.style.opacity = '0.3';

    setTimeout(() => {
      if (badgeTextEl) badgeTextEl.textContent = msg.badge;
      if (counterEl)   counterEl.textContent   = `${cardMsgIndex + 1}/${messages.length}`;
      if (iconEl)      iconEl.textContent      = msg.icon;
      if (titleEl)     titleEl.textContent     = msg.title;
      if (textEl)      textEl.textContent      = msg.text;
      if (btnLabelEl)  btnLabelEl.textContent  = msg.btnText;

      if (iconWrapEl) iconWrapEl.style.opacity = '1';
      if (titleEl) titleEl.style.opacity = '1';
      if (textEl) textEl.style.opacity = '1';
    }, 100);

    resetProgressBar();
  }

  function showCard(forceIndex) {
    if (!banner || !isGuest() || cardDismissed || window.innerWidth < 768) return;

    if (typeof forceIndex === 'number') {
      cardMsgIndex = forceIndex;
    }
    renderMessage(cardMsgIndex);

    banner.style.display = 'block';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        banner.classList.add('gnb-visible');
      });
    });

    startIntervalLoop();
  }

  function hideCard() {
    if (!banner) return;
    stopIntervalLoop();
    banner.classList.remove('gnb-visible');
    setTimeout(() => {
      if (!banner.classList.contains('gnb-visible')) banner.style.display = 'none';
    }, 340);
  }

  function resetProgressBar() {
    progressMs = 0;
    if (progressBar) progressBar.style.width = '0%';
  }

  function startIntervalLoop() {
    stopIntervalLoop();
    intervalTimer = setInterval(() => {
      if (isHovered || cardDismissed || !isGuest()) return;
      progressMs += TICK_MS;
      const pct = Math.min(100, (progressMs / DISPLAY_DURATION_MS) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;

      if (progressMs >= DISPLAY_DURATION_MS) {
        progressMs = 0;
        cardMsgIndex = (cardMsgIndex + 1) % messages.length;
        renderMessage(cardMsgIndex);
      }
    }, TICK_MS);
  }

  function stopIntervalLoop() {
    if (intervalTimer) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
  }

  // ── 5. EVENT LISTENERS ───────────────────────────────────────────
  if (banner) {
    banner.addEventListener('mouseenter', () => { isHovered = true; });
    banner.addEventListener('mouseleave', () => { isHovered = false; });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideCard();
      // Resume interval playback after 30s snooze
      setTimeout(() => {
        cardDismissed = false;
        showCard();
      }, 30000);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      cardMsgIndex = (cardMsgIndex - 1 + messages.length) % messages.length;
      renderMessage(cardMsgIndex);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      cardMsgIndex = (cardMsgIndex + 1) % messages.length;
      renderMessage(cardMsgIndex);
    });
  }

  if (actionBtn) {
    actionBtn.addEventListener('click', () => {
      hideCard();
      openSignup();
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      hideCard();
      openLogin();
    });
  }

  // Launch initial card after 1 second (desktop only)
  setTimeout(() => {
    if (window.innerWidth >= 768) showCard(0);
  }, 1000);

  window.addEventListener('resize', () => {
    if (window.innerWidth < 768) {
      hideCard();
    }
  });


  // ── 6. GUEST ALERT MODAL DIALOG CONTROLLER ───────────────────────
  const alertModal         = document.getElementById('guestAlertModal');
  const alertModalIcon     = document.getElementById('guestAlertModalIcon');
  const alertModalTitle    = document.getElementById('guestAlertModalTitle');
  const alertModalText     = document.getElementById('guestAlertModalText');
  const alertModalClose    = document.getElementById('guestAlertModalClose');
  const alertModalSignup   = document.getElementById('guestAlertModalSignupBtn');
  const alertModalLogin    = document.getElementById('guestAlertModalLoginBtn');
  const alertModalSkip     = document.getElementById('guestAlertModalSkipBtn');

  function showGuestAlertModal(opts = {}) {
    if (!alertModal || !isGuest()) return;

    if (opts.title && alertModalTitle) alertModalTitle.textContent = opts.title;
    if (opts.text && alertModalText) alertModalText.textContent = opts.text;
    if (opts.icon && alertModalIcon) alertModalIcon.textContent = opts.icon;

    alertModal.style.display = 'flex';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        alertModal.classList.remove('opacity-0', 'pointer-events-none');
        alertModal.querySelector('div')?.classList.remove('scale-95');
        alertModal.querySelector('div')?.classList.add('scale-100');
      });
    });
  }

  function hideGuestAlertModal() {
    if (!alertModal) return;
    alertModal.classList.add('opacity-0', 'pointer-events-none');
    alertModal.querySelector('div')?.classList.remove('scale-100');
    alertModal.querySelector('div')?.classList.add('scale-95');
    setTimeout(() => {
      alertModal.style.display = 'none';
    }, 320);
  }

  if (alertModalClose) alertModalClose.addEventListener('click', hideGuestAlertModal);
  if (alertModalSkip) alertModalSkip.addEventListener('click', hideGuestAlertModal);
  if (alertModalSignup) {
    alertModalSignup.addEventListener('click', () => {
      hideGuestAlertModal();
      openSignup();
    });
  }
  if (alertModalLogin) {
    alertModalLogin.addEventListener('click', () => {
      hideGuestAlertModal();
      openLogin();
    });
  }

  // Trigger guest alert modal automatically after 2 minutes of guest session activity
  const alertModalSessionKey = 'enp_guest_modal_shown';
  if (!sessionStorage.getItem(alertModalSessionKey)) {
    setTimeout(() => {
      if (isGuest() && !sessionStorage.getItem(alertModalSessionKey)) {
        sessionStorage.setItem(alertModalSessionKey, '1');
        showGuestAlertModal({
          title: 'Preserve Your Work — Create a Free Account',
          text: 'You have been writing as a guest. Register free or sign in to permanently protect your notes, access custom folders, and direct message friends.',
          icon: 'shield_lock'
        });
      }
    }, 120000);
  }




  // ── 8. EXPOSE GLOBAL APIS ────────────────────────────────────────
  window.hideGuestNudge = hideCard;
  window.showGuestNudge = showCard;
  window.nextGuestNudge = () => { renderMessage(cardMsgIndex + 1); };
  window.prevGuestNudge = () => { renderMessage(cardMsgIndex - 1); };
  window.showGuestAlertModal = showGuestAlertModal;
  window.hideGuestAlertModal = hideGuestAlertModal;
  window.showGuestMilestoneToast = () => {};
  window.triggerGuestNudge = (index) => {
    cardDismissed = false;
    showCard(typeof index === 'number' ? index : undefined);
  };
}

