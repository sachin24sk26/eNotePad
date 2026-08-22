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
  console.log('✨ eNotePad — Digital Curator initialized');
});

/**
 * Auto-Revealing Top Header Navigation Bar for all pages.
 * Hides header when scrolling down, reveals top navbar when scrolling UP.
 */
function initHeaderScroll() {
  const header = document.getElementById('topAppBar') || document.querySelector('header');
  if (!header) return;

  let lastScrollY = window.scrollY;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;

        // If scrolled past initial top margin threshold
        if (currentScrollY > 40) {
          header.classList.add('header-scrolled');
          if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 6) {
            // Scrolling DOWN -> hide top header navbar
            header.classList.add('-translate-y-full');
          } else if (lastScrollY - currentScrollY > 4) {
            // Scrolling UP -> reveal top header navbar
            header.classList.remove('-translate-y-full');
          }
        } else {
          // Near top of page -> reveal top header navbar without shadow
          header.classList.remove('-translate-y-full', 'header-scrolled');
        }

        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
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
 * Show/hide sidebar based on viewport width.
 */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('main');

  function updateSidebar() {
    const isDesktop = window.innerWidth >= 768;
    sidebar.style.display = isDesktop ? 'flex' : 'none';
    mainContent.style.marginLeft = isDesktop ? '16rem' : '0';
  }

  updateSidebar();
  window.addEventListener('resize', updateSidebar);

  // Sidebar user profile click → navigate to account tab
  const sidebarUserInfo = document.getElementById('sidebarUserInfo');
  const sidebarLoggedOutBtn = document.getElementById('sidebarLoggedOutBtn');

  const onProfileClick = () => {
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

  // Top header left inbox button click → navigate to account tab and open inbox sub-tab
  const topNavInboxBtn = document.getElementById('topNavInboxBtn');
  if (topNavInboxBtn) {
    topNavInboxBtn.addEventListener('click', () => {
      if (typeof window.switchToTab === 'function') {
        window.switchToTab('account');
        setTimeout(() => {
          const inboxTab = document.querySelector('.account-tab[data-account-tab="inbox"]');
          if (inboxTab) inboxTab.click();
        }, 50);
      }
    });
  }

  // Sidebar quick links for logged-in users
  const quickLinks = document.querySelectorAll('.sidebar-quick-link');
  quickLinks.forEach(link => {
    link.addEventListener('click', () => {
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
    });
  }

  /**
   * Switch to a tab and sync all navigation elements.
   */
  function switchTab(tabName) {
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

    // Sync mobile nav
    mobileBtns.forEach(btn => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
      btn.classList.toggle('text-primary/40', !isActive);
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.style.fontVariationSettings = isActive ? "'FILL' 1" : "'FILL' 0";
    });

    // Sync inline tabs
    inlineTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
  }

  // Expose globally for sidebar quick links
  window.switchToTab = switchTab;

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
 * Guest Nudge & Notification System — Enhanced
 * Non-intrusive, attractive prompts for guest users to encourage sign-up.
 * Includes: rotating bottom-card, welcome strip, milestone toasts.
 */
function initGuestNudgeSystem() {
  // ── Helper: is user logged in? ──────────────────────────────────
  const isGuest = () => {
    const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    return !u;
  };

  if (!isGuest()) return; // Bail immediately if already logged in

  // ── 1. ROTATING BOTTOM-RIGHT NUDGE CARD ─────────────────────────
  const banner     = document.getElementById('guestNudgeBanner');
  const iconEl     = document.getElementById('guestNudgeIcon');
  const titleEl    = document.getElementById('guestNudgeTitle');
  const textEl     = document.getElementById('guestNudgeText');
  const btnLabelEl = document.getElementById('guestNudgeBtnLabel');
  const closeBtn   = document.getElementById('guestNudgeClose');
  const actionBtn  = document.getElementById('guestNudgeActionBtn');

  const messages = [
    {
      icon: 'cloud_sync',
      title: '⏳ Your notes vanish in 20 min',
      text: 'Guest notes auto-erase. Create a free account and keep your ideas safe — forever.',
      btnText: 'Save Notes Forever',
      color: '#516070'
    },
    {
      icon: 'folder_open',
      title: '📁 Organize with Custom Folders',
      text: 'Sign up to categorize your notes into folders, tag them, and find anything instantly.',
      btnText: 'Create Free Account',
      color: '#516070'
    },
    {
      icon: 'send',
      title: '📬 Send Direct Notes to Anyone',
      text: 'Registered users can DM notes, files, and images directly to other members.',
      btnText: 'Join & Start Sharing',
      color: '#516070'
    },
    {
      icon: 'workspace_premium',
      title: '✨ Earn Badges & Build a Profile',
      text: 'Show off your creator or developer badge. Claim your public eNotePad profile — free.',
      btnText: 'Claim My Profile',
      color: '#516070'
    },
    {
      icon: 'forum',
      title: '💬 Join Live Convo Rooms',
      text: 'Collaborate with friends in real-time encrypted rooms. Only 60 seconds to sign up.',
      btnText: 'Join Rooms Free',
      color: '#516070'
    },
    {
      icon: 'history',
      title: '🕐 Access Your Note History',
      text: 'Members get a full history of all notes shared and received. Never lose track again.',
      btnText: 'Get Note History',
      color: '#516070'
    }
  ];

  let cardMsgIndex = 0;
  let cardDismissed = false;
  let cardTimer = null;

  function openSignup() {
    if (typeof window.switchToTab === 'function') {
      window.switchToTab('account');
      setTimeout(() => {
        const signupTab = document.querySelector('.auth-tab-btn[data-auth-tab="signup"]');
        if (signupTab) signupTab.click();
      }, 60);
    }
  }

  function showCard(forceIndex) {
    if (!banner || !isGuest()) return;
    if (cardDismissed) return;

    const idx = typeof forceIndex === 'number' ? forceIndex : cardMsgIndex;
    const msg = messages[idx % messages.length];
    cardMsgIndex = (idx + 1) % messages.length;

    if (iconEl)     iconEl.textContent   = msg.icon;
    if (titleEl)    titleEl.textContent  = msg.title;
    if (textEl)     textEl.textContent   = msg.text;
    if (btnLabelEl) btnLabelEl.textContent = msg.btnText;

    banner.style.display = 'block';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => banner.classList.add('gnb-visible'));
    });

    // Auto-hide after 9 seconds
    clearTimeout(cardTimer);
    cardTimer = setTimeout(hideCard, 9000);
  }

  function hideCard() {
    if (!banner) return;
    banner.classList.remove('gnb-visible');
    setTimeout(() => {
      if (!banner.classList.contains('gnb-visible')) banner.style.display = 'none';
    }, 340);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideCard();
      cardDismissed = true;
      // Allow nudge again after 45 seconds
      setTimeout(() => { cardDismissed = false; }, 45000);
    });
  }

  if (actionBtn) {
    actionBtn.addEventListener('click', () => { hideCard(); openSignup(); });
  }

  // First card after 2.5 seconds, then every 22 seconds
  setTimeout(() => showCard(), 2500);
  setInterval(() => { if (!cardDismissed) showCard(); }, 22000);


  // ── 2. TOP WELCOME STRIP (shows once per session) ────────────────
  const sessionKey = 'enp_welcome_shown';
  if (!sessionStorage.getItem(sessionKey)) {
    sessionStorage.setItem(sessionKey, '1');
    const strip = document.createElement('div');
    strip.id = 'guestWelcomeStrip';
    strip.innerHTML = `
      <div class="flex items-center justify-between gap-3 max-w-5xl mx-auto px-4 py-2.5">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <span class="material-symbols-outlined text-base flex-shrink-0" style="color:inherit">auto_awesome</span>
          <span class="text-xs font-semibold truncate">
            <strong>Welcome to eNotePad!</strong> — You're using the free guest mode.
            <span class="hidden sm:inline opacity-80">Sign up free to keep notes forever, use folders, and DM others.</span>
          </span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button id="guestStripSignup" class="text-xs font-bold px-3 py-1 rounded-full border border-current/30 hover:bg-white/20 transition-all whitespace-nowrap">
            Sign Up Free
          </button>
          <button id="guestStripClose" class="opacity-60 hover:opacity-100 transition-opacity p-0.5">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>
    `;
    strip.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
      background: linear-gradient(135deg, #516070 0%, #575e78 100%);
      color: #f4f8ff; font-family: Inter, sans-serif;
      transform: translateY(-100%); transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
    `;
    document.body.appendChild(strip);

    setTimeout(() => { strip.style.transform = 'translateY(0)'; }, 600);

    const dismissStrip = () => {
      strip.style.transform = 'translateY(-100%)';
      setTimeout(() => strip.remove(), 400);
    };

    document.getElementById('guestStripClose')?.addEventListener('click', dismissStrip);
    document.getElementById('guestStripSignup')?.addEventListener('click', () => {
      dismissStrip();
      openSignup();
    });

    // Auto-dismiss strip after 8 seconds
    setTimeout(dismissStrip, 8000);
  }


  // ── 3. MILESTONE TOAST NUDGES (triggered by actions) ─────────────
  const toastMessages = [
    {
      trigger: 'note_shared',
      icon: 'celebration',
      text: '🎉 Note shared! Sign up to track all your shares and build a history.',
      btnText: 'Save My History'
    },
    {
      trigger: 'note_typed',
      icon: 'tips_and_updates',
      text: '💡 Great idea! Register free to keep this note safe — guest notes expire in 20 min.',
      btnText: 'Keep This Note'
    },
    {
      trigger: 'code_accessed',
      icon: 'lock_open',
      text: '✅ Note retrieved! Members can organize received notes into folders automatically.',
      btnText: 'Organize My Notes'
    }
  ];

  function showMilestoneToast(triggerName) {
    if (!isGuest()) return;
    const msg = toastMessages.find(m => m.trigger === triggerName);
    if (!msg) return;

    const toast = document.createElement('div');
    toast.className = 'gnb-milestone-toast';
    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--gnb-toast-bg,rgba(250,249,245,0.97));border:1px solid rgba(81,96,112,0.15);border-radius:16px;box-shadow:0 8px 24px rgba(47,52,46,0.14);max-width:320px;font-family:Inter,sans-serif;backdrop-filter:blur(12px);">
        <span class="material-symbols-outlined" style="color:#516070;font-size:20px;flex-shrink:0">${msg.icon}</span>
        <div style="flex:1;min-width:0">
          <p style="font-size:11.5px;color:#2f342e;line-height:1.4;margin:0 0 7px">${msg.text}</p>
          <button class="gnb-toast-action" style="font-size:10.5px;font-weight:700;color:#516070;background:rgba(81,96,112,0.1);border:none;padding:4px 10px;border-radius:8px;cursor:pointer;letter-spacing:0.02em">${msg.btnText}</button>
        </div>
        <button class="gnb-toast-close" style="color:rgba(47,52,46,0.3);background:none;border:none;cursor:pointer;font-size:18px;line-height:1;flex-shrink:0">×</button>
      </div>
    `;
    toast.style.cssText = `
      position:fixed; bottom:${banner && banner.style.display !== 'none' ? '160px' : '24px'}; left:50%;
      transform:translateX(-50%) translateY(20px); opacity:0;
      z-index:9960; transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);
    `;

    // Dark mode tweak
    if (document.documentElement.classList.contains('dark')) {
      toast.querySelector('div').style.background = 'rgba(22,25,33,0.97)';
      toast.querySelector('p').style.color = '#cbd5e1';
      toast.querySelector('.gnb-toast-action').style.color = '#93c5fd';
      toast.querySelector('.gnb-toast-action').style.background = 'rgba(147,197,253,0.1)';
      toast.querySelector('.gnb-toast-close').style.color = 'rgba(203,213,225,0.4)';
    }

    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    }));

    const removeToast = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(12px)';
      setTimeout(() => toast.remove(), 340);
    };

    toast.querySelector('.gnb-toast-close').addEventListener('click', removeToast);
    toast.querySelector('.gnb-toast-action').addEventListener('click', () => { removeToast(); openSignup(); });
    setTimeout(removeToast, 7000);
  }

  // ── 4. EXPOSE GLOBALLY FOR OTHER MODULES ────────────────────────
  window.hideGuestNudge = hideCard;
  window.showGuestNudge = showCard;
  window.showGuestMilestoneToast = showMilestoneToast;

  // Expose for external trigger (e.g., after sharing a note)
  window.triggerGuestNudge = (index) => {
    cardDismissed = false;
    showCard(typeof index === 'number' ? index : undefined);
  };
}
