/**
 * Interactive "Buy Me a Coffee" Module v1.0
 * Provides a delightful, gamified tipping & appreciation experience for eNotePad.
 */

(function () {
  'use strict';

  // Configurable Creator Details
  const COFFEE_CONFIG = {
    creatorName: 'Sachin Kumar (eNotePad Creator)',
    bmcUsername: 'sachin24sk', // buymeacoffee.com/sachin24sk
    upiId: 'officialsachinkumarthakur@okicici',
    payeeName: 'Sachin Kumar',
    qrImagePath: 'assets/upi_qr.jpg',
    defaultAmount: 5,
    tiers: {
      1: { name: 'Espresso Shot', price: 2, inr: 150, fill: '35%', desc: 'Quick bug-fix fuel! Keeps the keyboard clacking.', icon: '☕', foam: 'Standard Foam' },
      2: { name: 'Double Cappuccino', price: 5, inr: 350, fill: '65%', desc: '⭐ Most Popular! Covers cloud database & fast API queries.', icon: '☕☕', foam: 'Heart Latte Art ❤️' },
      3: { name: 'Venti Cold Brew', price: 10, inr: 800, fill: '90%', desc: 'Mega fuel! Keeps eNotePad 100% ad-light & private.', icon: '🫖', foam: 'Caramel Macchiato ✨' },
      5: { name: 'Server Feast Patron', price: 25, inr: 2000, fill: '100%', desc: '🚀 Legendary Patron! Hall of Fame status & eternal gratitude.', icon: '👑', foam: 'Golden Crown Foam 👑' }
    }
  };

  // State
  let currentTier = 2;
  let currentMethod = 'bmc'; // 'bmc' | 'upi' | 'virtual'
  let isModalOpen = false;

  // Initial supporters list (can be augmented from localStorage)
  let supporters = [
    { name: 'Alex M.', coffees: 2, note: 'Saved my lecture notes anonymously, lifesaver!', time: '2h ago' },
    { name: 'Priya K.', coffees: 3, note: 'Cleanest digital curator out there. Keep building!', time: '5h ago' },
    { name: 'Dev_Vikram', coffees: 1, note: 'Quick pastebin tool is awesome.', time: '1d ago' },
    { name: 'Sarah L.', coffees: 5, note: 'Love the zero-tracking privacy focus!', time: '2d ago' }
  ];

  // Load saved virtual coffees from localStorage
  try {
    const saved = localStorage.getItem('enotepad_coffee_supporters');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        supporters = [...parsed, ...supporters].slice(0, 10);
      }
    }
  } catch (e) {}

  /**
   * Confetti Burst (Canvas Confetti or custom particle fallback)
   */
  function triggerCelebration() {
    if (typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#d97706', '#10b981', '#3b82f6', '#ec4899']
      });
    } else {
      createFloatingHearts();
    }
  }

  function createFloatingHearts() {
    const modalContent = document.getElementById('coffeeModalContent');
    if (!modalContent) return;

    const emojis = ['❤️', '☕', '✨', '💖', '🎉'];
    for (let i = 0; i < 7; i++) {
      const heart = document.createElement('div');
      heart.className = 'floating-heart text-2xl';
      heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      heart.style.left = `${30 + Math.random() * 40}%`;
      heart.style.bottom = '120px';
      heart.style.animationDelay = `${i * 0.12}s`;
      modalContent.appendChild(heart);
      setTimeout(() => heart.remove(), 1600);
    }
  }

  /**
   * Update the interactive cup visualizer & description based on selected tier
   */
  function updateCupVisual(tierKey) {
    const tier = COFFEE_CONFIG.tiers[tierKey] || COFFEE_CONFIG.tiers[2];
    currentTier = tierKey;

    // Update cup fill height
    const liquidEl = document.getElementById('coffeeCupLiquid');
    if (liquidEl) {
      liquidEl.style.height = tier.fill;
    }

    // Update foam text/icon
    const foamEl = document.getElementById('coffeeCupFoam');
    if (foamEl) {
      foamEl.textContent = tier.foam;
    }

    // Update text details
    const titleEl = document.getElementById('coffeeTierTitle');
    const descEl = document.getElementById('coffeeTierDesc');
    const priceEl = document.getElementById('coffeeTierPrice');

    if (titleEl) titleEl.textContent = tier.name;
    if (descEl) descEl.textContent = tier.desc;
    if (priceEl) priceEl.textContent = `$${tier.price} (₹${tier.inr})`;

    // Update BMC button link with prefilled amount
    const bmcBtn = document.getElementById('coffeeDirectBmcBtn');
    if (bmcBtn) {
      bmcBtn.href = `https://buymeacoffee.com/${COFFEE_CONFIG.bmcUsername}?amount=${tier.price}`;
    }

    // Update chips active state
    document.querySelectorAll('.coffee-chip').forEach(btn => {
      const t = parseInt(btn.dataset.tier, 10);
      btn.classList.toggle('active', t === tierKey);
    });

    // Update amount in virtual button
    const virtualBtnText = document.getElementById('virtualCoffeeBtnText');
    if (virtualBtnText) {
      virtualBtnText.textContent = `Send ${tierKey} Virtual Coffee${tierKey > 1 ? 's' : ''} & Love ❤️`;
    }
  }

  /**
   * Switch payment method tab inside modal
   */
  function switchMethodTab(method) {
    currentMethod = method;

    document.querySelectorAll('.coffee-method-tab').forEach(tab => {
      const isTarget = tab.dataset.method === method;
      tab.classList.toggle('active', isTarget);
      tab.classList.toggle('bg-surface-container-high', isTarget);
      tab.classList.toggle('text-primary', isTarget);
      tab.classList.toggle('font-bold', isTarget);
      tab.classList.toggle('text-on-surface-variant', !isTarget);
    });

    const bmcSection = document.getElementById('coffeeSectionBmc');
    const upiSection = document.getElementById('coffeeSectionUpi');
    const virtualSection = document.getElementById('coffeeSectionVirtual');

    if (bmcSection) bmcSection.style.display = method === 'bmc' ? 'block' : 'none';
    if (upiSection) upiSection.style.display = method === 'upi' ? 'block' : 'none';
    if (virtualSection) virtualSection.style.display = method === 'virtual' ? 'block' : 'none';
  }

  /**
   * Render Recent Supporters
   */
  function renderSupporters() {
    const listEl = document.getElementById('coffeeSupportersList');
    if (!listEl) return;

    listEl.innerHTML = supporters.map(s => `
      <div class="flex items-start gap-2.5 p-2 rounded-xl bg-surface-container-low/70 border border-outline-variant/10 text-left">
        <span class="text-sm mt-0.5">☕</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1">
            <span class="text-xs font-bold text-on-surface truncate">${escapeHTML(s.name)}</span>
            <span class="text-[9px] text-on-surface-variant/70 font-mono">${escapeHTML(s.time)}</span>
          </div>
          <p class="text-[11px] text-on-surface-variant line-clamp-1 italic">${escapeHTML(s.note || 'Bought a coffee for eNotePad')}</p>
        </div>
      </div>
    `).join('');
  }

  function escapeHTML(str) {
    return String(str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  /**
   * Handle Virtual Coffee Submission
   */
  function handleVirtualCoffee() {
    const nameInput = document.getElementById('coffeeSupporterName');
    const noteInput = document.getElementById('coffeeSupporterNote');

    const name = (nameInput && nameInput.value.trim()) || 'Friendly Supporter';
    const note = (noteInput && noteInput.value.trim()) || 'Sent virtual coffee & positive vibes!';

    const newSupporter = {
      name: name,
      coffees: currentTier,
      note: note,
      time: 'Just now'
    };

    // Add to state
    supporters.unshift(newSupporter);

    // Save up to 5 custom supporters
    try {
      localStorage.setItem('enotepad_coffee_supporters', JSON.stringify(supporters.slice(0, 5)));
    } catch (e) {}

    // Trigger celebration
    triggerCelebration();

    // Show Thank You Feedback View
    const successCard = document.getElementById('coffeeSuccessCard');
    const mainForm = document.getElementById('coffeeMainForm');

    if (mainForm) mainForm.style.display = 'none';
    if (successCard) {
      successCard.style.display = 'block';
      const thankName = document.getElementById('coffeeThankYouName');
      if (thankName) thankName.textContent = name;
    }

    renderSupporters();

    if (typeof window.showToast === 'function') {
      window.showToast(`☕ Thank you ${name}! Your love keeps eNotePad going!`, 'success');
    }
  }

  /**
   * Reset Success Card and Return to Form
   */
  function resetCoffeeForm() {
    const successCard = document.getElementById('coffeeSuccessCard');
    const mainForm = document.getElementById('coffeeMainForm');
    if (successCard) successCard.style.display = 'none';
    if (mainForm) mainForm.style.display = 'block';
  }

  /**
   * Open Modal
   */
  function openCoffeeModal(tier = 2) {
    const modal = document.getElementById('coffeeModal');
    if (!modal) return;

    modal.style.display = 'flex';
    isModalOpen = true;
    resetCoffeeForm();
    updateCupVisual(tier);
    switchMethodTab('bmc');
    renderSupporters();

    // Pre-fill user name if logged in
    const nameInput = document.getElementById('coffeeSupporterName');
    if (nameInput && !nameInput.value) {
      try {
        const loggedInUser = localStorage.getItem('enotepad_current_user');
        if (loggedInUser) nameInput.value = loggedInUser;
      } catch (e) {}
    }
  }

  /**
   * Close Modal
   */
  function closeCoffeeModal() {
    const modal = document.getElementById('coffeeModal');
    if (!modal) return;
    modal.style.display = 'none';
    isModalOpen = false;
  }

  /**
   * Copy UPI ID with feedback
   */
  function copyUpiId() {
    navigator.clipboard.writeText(COFFEE_CONFIG.upiId).then(() => {
      const copyBtn = document.getElementById('coffeeCopyUpiBtn');
      if (copyBtn) {
        const origHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span class="material-symbols-outlined text-xs">check</span> Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.innerHTML = origHTML;
          copyBtn.classList.remove('copied');
        }, 2000);
      }
      if (typeof window.showToast === 'function') {
        window.showToast('UPI ID copied to clipboard: ' + COFFEE_CONFIG.upiId, 'success');
      }
    }).catch(() => {
      alert('UPI ID: ' + COFFEE_CONFIG.upiId);
    });
  }

  /**
   * Initialize Listeners & Periodic Nudge
   */
  function initCoffee() {
    // Open buttons
    const fabBtn = document.getElementById('coffeeFabBtn');
    const sidebarBtn = document.getElementById('sidebarCoffeeBtn');
    const closeBtn = document.getElementById('closeCoffeeModal');
    const backdrop = document.getElementById('coffeeModalBackdrop');
    const copyUpiBtn = document.getElementById('coffeeCopyUpiBtn');
    const sendVirtualBtn = document.getElementById('sendVirtualCoffeeBtn');
    const anotherTipBtn = document.getElementById('coffeeAnotherTipBtn');
    const closeNudgeBtn = document.getElementById('closeCoffeeNudge');

    if (fabBtn) fabBtn.addEventListener('click', () => openCoffeeModal(2));
    if (sidebarBtn) sidebarBtn.addEventListener('click', () => openCoffeeModal(2));
    if (closeBtn) closeBtn.addEventListener('click', closeCoffeeModal);
    if (backdrop) backdrop.addEventListener('click', closeCoffeeModal);
    if (copyUpiBtn) copyUpiBtn.addEventListener('click', copyUpiId);
    if (sendVirtualBtn) sendVirtualBtn.addEventListener('click', handleVirtualCoffee);
    if (anotherTipBtn) anotherTipBtn.addEventListener('click', resetCoffeeForm);

    if (closeNudgeBtn) {
      closeNudgeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bubble = document.getElementById('coffeeNudgeBubble');
        if (bubble) bubble.style.display = 'none';
      });
    }

    // Tier selection chips
    document.querySelectorAll('.coffee-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const t = parseInt(chip.dataset.tier, 10);
        updateCupVisual(t);
        triggerCupBounce();
      });
    });

    // Method tabs
    document.querySelectorAll('.coffee-method-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        switchMethodTab(tab.dataset.method);
      });
    });

    // Cup click = heart burst fun
    const mugWrapper = document.getElementById('coffeeMugWrapper');
    if (mugWrapper) {
      mugWrapper.addEventListener('click', () => {
        createFloatingHearts();
        triggerCupBounce();
      });
    }

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeCoffeeModal();
      }
    });

    // Check hash on load
    if (window.location.hash === '#coffee' || new URLSearchParams(window.location.search).get('coffee') === 'true') {
      setTimeout(() => openCoffeeModal(2), 350);
    }
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#coffee') {
        openCoffeeModal(2);
      }
    });

    // Subtle playful periodic wiggle every 35s
    setInterval(() => {
      if (fabBtn && !isModalOpen) {
        fabBtn.classList.add('coffee-wiggle');
        setTimeout(() => fabBtn.classList.remove('coffee-wiggle'), 1300);
      }
    }, 35000);
  }

  function triggerCupBounce() {
    const mug = document.getElementById('coffeeMugGraphic');
    if (mug) {
      mug.classList.remove('coffee-wiggle');
      void mug.offsetWidth; // trigger reflow
      mug.classList.add('coffee-wiggle');
    }
  }

  // Expose globally
  window.openCoffeeModal = openCoffeeModal;
  window.closeCoffeeModal = closeCoffeeModal;

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCoffee);
  } else {
    initCoffee();
  }
})();
