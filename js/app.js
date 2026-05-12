// ============================================================
// App Controller — The Tactile Editorial
// Initializes all modules, handles unified tab switching
// across sidebar, topnav, mobile nav, and inline tabs.
// Manages dark mode, sidebar, and periodic cleanup.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initTheme();
  initSidebar();
  initShare();
  initAccess();
  initAuth();
  initPeriodicCleanup();
  initBroadcastListener();
  initFeedback();
  console.log('✨ eNotePad — Digital Curator initialized');
});

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
  if (sidebarUserInfo) {
    sidebarUserInfo.addEventListener('click', () => {
      if (typeof window.switchToTab === 'function') {
        window.switchToTab('account');
      }
    });
  }

  // Sidebar quick links for logged-in users
  const quickLinks = document.querySelectorAll('.sidebar-quick-link');
  quickLinks.forEach(link => {
    link.addEventListener('click', () => {
      const action = link.dataset.sidebarAction;
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
    admin: document.getElementById('panelAdmin')
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
    // Update panels — guard against null (e.g. panelAdmin may not exist for non-admins)
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
