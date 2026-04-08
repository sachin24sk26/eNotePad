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
  console.log('✨ eNotePad — Digital Curator initialized');
});

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
    account: document.getElementById('panelAccount')
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
    // Update panels
    Object.keys(panels).forEach(key => {
      panels[key].setAttribute('data-active', key === tabName ? 'true' : 'false');
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
      btn.querySelector('.material-symbols-outlined').style.fontVariationSettings =
        isActive ? "'FILL' 1" : "'FILL' 0";
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
