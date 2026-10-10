// ============================================================
// Share Module — The Tactile Editorial
// Handles content sharing (text/link/image) with flexible expiry,
// Burn-After-Reading, password protection, QR Code, and deep link generator.
// ============================================================

function initShare() {
  const typeButtons = document.querySelectorAll('.type-btn');
  const shareBtn = document.getElementById('shareBtn');
  const shareIconBtn = document.getElementById('shareIconBtn');
  const saveBtn = document.getElementById('saveBtn');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('imageFileInput');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const changeFileBtn = document.getElementById('changeFileBtn');
  const selectedFileNameEl = document.getElementById('selectedFileName');
  const selectedFileSizeEl = document.getElementById('selectedFileSize');
  const genericFilePreviewWrap = document.getElementById('genericFilePreviewWrap');
  const genericFileNameEl = document.getElementById('genericFileName');
  const genericFileSizeEl = document.getElementById('genericFileSize');
  const genericFileTypeBadgeEl = document.getElementById('genericFileTypeBadge');
  const genericFileIconEl = document.getElementById('genericFileIcon');
  const genericFileIconWrap = document.getElementById('genericFileIconWrap');
  const imagePreviewImgWrap = document.getElementById('imagePreviewImgWrap');
  const codeCopyBtn = document.getElementById('codeCopyBtn');
  const codeCopyLinkBtn = document.getElementById('codeCopyLinkBtn');
  const codeQrToggleBtn = document.getElementById('codeQrToggleBtn');
  const shareQrContainer = document.getElementById('shareQrContainer');
  const shareQrCanvas = document.getElementById('shareQrCanvas');
  const noteMeta = document.getElementById('noteMeta');
  const noteTitle = document.getElementById('noteTitle');
  const noteCategory = document.getElementById('noteCategory');
  const expirySelect = document.getElementById('shareExpirySelect');
  const expiryBadgeText = document.getElementById('expiryBadgeText');
  const toggleSharePasswordBtn = document.getElementById('toggleSharePasswordBtn');
  const sharePasswordRow = document.getElementById('sharePasswordRow');
  const sharePasswordInput = document.getElementById('sharePasswordInput');
  const toggleSharePasswordLabel = document.getElementById('toggleSharePasswordLabel');
  const clearSharePasswordBtn = document.getElementById('clearSharePasswordBtn');

  let selectedType = 'text';
  let selectedFile = null;
  let qrCodeInstance = null;

  const addLinkBtn = document.getElementById('addLinkBtn');
  const linkInputsContainer = document.getElementById('linkInputsContainer');

  // ----- Custom Tag & Expiry Dropdowns -----
  const tagToggleBtn = document.getElementById('tagToggleBtn');
  const tagOptionsList = document.getElementById('tagOptionsList');
  const tagToggleIcon = document.getElementById('tagToggleIcon');
  const tagSelectedIcon = document.getElementById('tagSelectedIcon');
  const tagSelectedLabel = document.getElementById('tagSelectedLabel');
  const tagDropdownWrap = document.getElementById('noteTagWrap');

  const expiryToggleBtn = document.getElementById('expiryToggleBtn');
  const expiryOptionsList = document.getElementById('expiryOptionsList');
  const expiryToggleIcon = document.getElementById('expiryToggleIcon');
  const expirySelectedIcon = document.getElementById('expirySelectedIcon');
  const expirySelectedLabel = document.getElementById('expirySelectedLabel');
  const expiryDropdownWrap = document.getElementById('expiryDropdownWrap');

  const TAG_MAP = {
    '': { icon: '🏷️', label: 'Tag' },
    'personal': { icon: '📝', label: 'Personal' },
    'work': { icon: '💼', label: 'Work' },
    'ideas': { icon: '💡', label: 'Ideas' },
    'code': { icon: '🖥️', label: 'Code' },
    'links': { icon: '🔗', label: 'Links' },
    'important': { icon: '⭐', label: 'Important' }
  };

  const EXPIRY_MAP = {
    '5': { icon: 'timer', label: '5 min' },
    '20': { icon: 'timer', label: '20 min' },
    '60': { icon: 'timer', label: '1 hour' },
    '1440': { icon: 'timer', label: '24 hours' },
    '10080': { icon: 'timer', label: '7 days' },
    'burn': { icon: 'local_fire_department', label: '1 view 🔥' }
  };

  function updateTagUI(val) {
    const info = TAG_MAP[val] || TAG_MAP[''];
    if (tagSelectedIcon) tagSelectedIcon.textContent = info.icon;
    if (tagSelectedLabel) tagSelectedLabel.textContent = info.label;
    if (tagOptionsList) {
      tagOptionsList.querySelectorAll('[data-tag]').forEach(btn => {
        const isActive = (btn.dataset.tag || '') === (val || '');
        btn.classList.toggle('active', isActive);
      });
    }
  }

  function updateExpiryUI(val) {
    const info = EXPIRY_MAP[val] || EXPIRY_MAP['20'];
    if (expirySelectedIcon) expirySelectedIcon.textContent = info.icon;
    if (expirySelectedLabel) expirySelectedLabel.textContent = info.label;
    if (expiryOptionsList) {
      expiryOptionsList.querySelectorAll('[data-expiry]').forEach(btn => {
        const isActive = btn.dataset.expiry === val;
        btn.classList.toggle('active', isActive);
      });
    }
  }

  const closeTagDropdown = () => {
    if (tagOptionsList) {
      tagOptionsList.classList.add('hidden');
      if (tagToggleBtn) tagToggleBtn.setAttribute('aria-expanded', 'false');
      if (tagToggleIcon) tagToggleIcon.textContent = 'expand_more';
    }
  };

  const openTagDropdown = () => {
    if (tagOptionsList) {
      closeExpiryDropdown();
      const starterList = document.getElementById('starterOptionsList');
      if (starterList) {
        starterList.classList.add('hidden');
        starterList.classList.remove('flex');
        const sBtn = document.getElementById('starterToggleBtn');
        if (sBtn) sBtn.setAttribute('aria-expanded', 'false');
      }
      tagOptionsList.classList.remove('hidden');
      if (tagToggleBtn) tagToggleBtn.setAttribute('aria-expanded', 'true');
      if (tagToggleIcon) tagToggleIcon.textContent = 'expand_less';
    }
  };

  const closeExpiryDropdown = () => {
    if (expiryOptionsList) {
      expiryOptionsList.classList.add('hidden');
      if (expiryToggleBtn) expiryToggleBtn.setAttribute('aria-expanded', 'false');
      if (expiryToggleIcon) expiryToggleIcon.textContent = 'expand_less';
    }
  };

  const openExpiryDropdown = () => {
    if (expiryOptionsList) {
      closeTagDropdown();
      const starterList = document.getElementById('starterOptionsList');
      if (starterList) {
        starterList.classList.add('hidden');
        starterList.classList.remove('flex');
        const sBtn = document.getElementById('starterToggleBtn');
        if (sBtn) sBtn.setAttribute('aria-expanded', 'false');
      }
      expiryOptionsList.classList.remove('hidden');
      if (expiryToggleBtn) expiryToggleBtn.setAttribute('aria-expanded', 'true');
      if (expiryToggleIcon) expiryToggleIcon.textContent = 'expand_more';
    }
  };

  if (tagToggleBtn && tagOptionsList) {
    tagToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = tagOptionsList.classList.contains('hidden');
      if (isHidden) openTagDropdown();
      else closeTagDropdown();
    });

    tagOptionsList.addEventListener('click', (e) => {
      const item = e.target.closest('[data-tag]');
      if (!item) return;
      const tagVal = item.dataset.tag || '';
      if (noteCategory) {
        noteCategory.value = tagVal;
        noteCategory.dispatchEvent(new Event('change', { bubbles: true }));
      }
      updateTagUI(tagVal);
      closeTagDropdown();
    });
  }

  if (expiryToggleBtn && expiryOptionsList) {
    expiryToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = expiryOptionsList.classList.contains('hidden');
      if (isHidden) openExpiryDropdown();
      else closeExpiryDropdown();
    });

    expiryOptionsList.addEventListener('click', (e) => {
      const item = e.target.closest('[data-expiry]');
      if (!item) return;
      const expVal = item.dataset.expiry || '20';
      if (expirySelect) {
        expirySelect.value = expVal;
        expirySelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      updateExpiryUI(expVal);
      closeExpiryDropdown();
    });
  }

  document.addEventListener('click', (e) => {
    if (tagDropdownWrap && !tagDropdownWrap.contains(e.target)) {
      closeTagDropdown();
    }
    if (expiryDropdownWrap && !expiryDropdownWrap.contains(e.target)) {
      closeExpiryDropdown();
    }
  });

  if (noteCategory) {
    noteCategory.addEventListener('change', () => {
      updateTagUI(noteCategory.value);
    });
    updateTagUI(noteCategory.value);
  }

  if (expirySelect) {
    expirySelect.addEventListener('change', () => {
      const val = expirySelect.value;
      updateExpiryUI(val);
      if (val === 'burn') {
        if (expiryBadgeText) expiryBadgeText.innerHTML = '🔥 <strong>Burn After Reading</strong> (1-Time)';
      } else {
        const text = expirySelect.options[expirySelect.selectedIndex]?.text || (val + ' min');
        if (expiryBadgeText) expiryBadgeText.innerHTML = `Auto-erases in <strong>${text.split(' ')[0]} ${text.split(' ')[1] || ''}</strong>`;
      }
    });
    updateExpiryUI(expirySelect.value || '20');
  }

  // ----- Password Protection Toggle -----
  if (toggleSharePasswordBtn && sharePasswordRow) {
    toggleSharePasswordBtn.addEventListener('click', () => {
      if (!getCurrentUser()) return; // Password protection only available for logged-in members
      const isHidden = sharePasswordRow.style.display === 'none';
      sharePasswordRow.style.display = isHidden ? 'block' : 'none';
      if (isHidden && sharePasswordInput) {
        sharePasswordInput.focus();
        if (toggleSharePasswordLabel) toggleSharePasswordLabel.textContent = 'Password Enabled';
        toggleSharePasswordBtn.classList.add('text-primary', 'bg-primary/10', 'border-primary/30');
      } else {
        if (sharePasswordInput) sharePasswordInput.value = '';
        if (toggleSharePasswordLabel) toggleSharePasswordLabel.textContent = 'Add Password';
        toggleSharePasswordBtn.classList.remove('text-primary', 'bg-primary/10', 'border-primary/30');
      }
    });
  }

  if (clearSharePasswordBtn) {
    clearSharePasswordBtn.addEventListener('click', () => {
      if (sharePasswordInput) sharePasswordInput.value = '';
      if (sharePasswordRow) sharePasswordRow.style.display = 'none';
      if (toggleSharePasswordLabel) toggleSharePasswordLabel.textContent = 'Add Password';
      if (toggleSharePasswordBtn) toggleSharePasswordBtn.classList.remove('text-primary', 'bg-primary/10', 'border-primary/30');
    });
  }

  // Password Hash Helper (SHA-256)
  async function hashPassword(str) {
    if (!str) return null;
    const encoder = new TextEncoder();
    const data = encoder.encode(str + '_enotepad_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ----- Dynamic Links Manager -----
  const pasteFromClipboardBtn = document.getElementById('pasteFromClipboardBtn');
  const clearAllLinksBtn = document.getElementById('clearAllLinksBtn');
  const linkCountBadge = document.getElementById('linkCountBadge');

  function createLinkRow(initialVal = '') {
    const row = document.createElement('div');
    row.className = 'link-input-row group relative flex flex-col gap-2 p-3 sm:p-3.5 bg-surface-container-low/60 dark:bg-white/[0.03] rounded-2xl border border-outline-variant/20 dark:border-white/10 hover:border-primary/40 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/15 transition-all';
    row.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="link-row-badge flex-shrink-0 w-7 h-7 rounded-xl bg-surface-container-high/70 dark:bg-white/5 border border-outline-variant/15 text-[11px] font-mono font-bold text-primary flex items-center justify-center select-none">
          1
        </div>
        <div class="flex-1 min-w-0 relative flex items-center">
          <input type="url" class="shareLinkInput w-full bg-transparent text-sm sm:text-base font-body text-on-surface placeholder:text-outline-variant/50 outline-none border-none focus:ring-0 p-0" placeholder="Paste or type URL (e.g., https://...)" aria-label="Share URL link" autocomplete="off" />
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <a href="#" target="_blank" rel="noopener noreferrer" class="test-link-btn w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors hidden" title="Test open link" aria-label="Test open link">
            <span class="material-symbols-outlined text-[18px]">open_in_new</span>
          </a>
          <button type="button" class="clear-link-field-btn w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container-high transition-colors hidden" title="Clear input" aria-label="Clear field">
            <span class="material-symbols-outlined text-[17px]">backspace</span>
          </button>
          <button class="remove-link-btn w-8 h-8 rounded-xl flex items-center justify-center text-error/50 hover:text-error hover:bg-error/10 transition-colors hidden" type="button" title="Remove this link" aria-label="Remove link">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
      <div class="link-meta-pill hidden items-center gap-2 pt-1 border-t border-outline-variant/10 text-[11px] text-on-surface-variant">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-[10px] tracking-wide font-mono link-domain-display"></span>
        <span class="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5 text-[10px]">
          <span class="material-symbols-outlined text-[12px]">check_circle</span> Ready
        </span>
      </div>
    `;
    if (initialVal) {
      const input = row.querySelector('.shareLinkInput');
      if (input) input.value = initialVal;
      updateSingleRowState(row, initialVal);
    }
    return row;
  }

  function updateSingleRowState(row, val) {
    if (!row) return;
    const metaPill = row.querySelector('.link-meta-pill');
    const domainDisplay = row.querySelector('.link-domain-display');
    const testBtn = row.querySelector('.test-link-btn');
    const clearBtn = row.querySelector('.clear-link-field-btn');

    if (!val) {
      if (metaPill) {
        metaPill.classList.add('hidden');
        metaPill.classList.remove('flex');
      }
      if (testBtn) testBtn.classList.add('hidden');
      if (clearBtn) clearBtn.classList.add('hidden');
      return;
    }

    if (clearBtn) clearBtn.classList.remove('hidden');

    let normalized = val;
    if (!/^https?:\/\//i.test(normalized) && !normalized.includes('://')) {
      normalized = 'https://' + normalized;
    }

    try {
      const parsed = new URL(normalized);
      if (parsed.hostname && parsed.hostname.includes('.')) {
        if (domainDisplay) domainDisplay.textContent = parsed.hostname.replace(/^www\./, '');
        if (metaPill) {
          metaPill.classList.remove('hidden');
          metaPill.classList.add('flex');
        }
        if (testBtn) {
          testBtn.href = normalized;
          testBtn.classList.remove('hidden');
        }
        return;
      }
    } catch (_) {}

    if (metaPill) {
      metaPill.classList.add('hidden');
      metaPill.classList.remove('flex');
    }
    if (testBtn) testBtn.classList.add('hidden');
  }

  function updateLinkRowsUI() {
    if (!linkInputsContainer) return;
    const rows = linkInputsContainer.querySelectorAll('.link-input-row');
    const total = rows.length;

    if (linkCountBadge) {
      linkCountBadge.textContent = `${total} ${total === 1 ? 'link' : 'links'}`;
    }

    let hasAnyValue = false;

    rows.forEach((row, idx) => {
      const badge = row.querySelector('.link-row-badge');
      if (badge) badge.textContent = String(idx + 1);

      const rmBtn = row.querySelector('.remove-link-btn');
      if (rmBtn) {
        rmBtn.classList.toggle('hidden', total <= 1);
      }

      const input = row.querySelector('.shareLinkInput');
      const val = input ? input.value.trim() : '';
      if (val) hasAnyValue = true;

      updateSingleRowState(row, val);
    });

    if (clearAllLinksBtn) {
      clearAllLinksBtn.classList.toggle('hidden', !hasAnyValue && total <= 1);
    }
  }

  if (linkInputsContainer) {
    linkInputsContainer.addEventListener('input', (e) => {
      const input = e.target.closest('.shareLinkInput');
      if (input) {
        const row = input.closest('.link-input-row');
        if (row) updateSingleRowState(row, input.value.trim());
        updateLinkRowsUI();
      }
    });

    linkInputsContainer.addEventListener('change', (e) => {
      const input = e.target.closest('.shareLinkInput');
      if (input) {
        let val = input.value.trim();
        if (val && !/^https?:\/\//i.test(val) && !val.includes('://') && val.includes('.')) {
          input.value = 'https://' + val;
        }
        const row = input.closest('.link-input-row');
        if (row) updateSingleRowState(row, input.value.trim());
      }
    });

    linkInputsContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('.shareLinkInput')) {
        e.preventDefault();
        if (addLinkBtn) addLinkBtn.click();
      }
    });

    linkInputsContainer.addEventListener('paste', (e) => {
      const input = e.target.closest('.shareLinkInput');
      if (!input) return;
      const pasted = (e.clipboardData || window.clipboardData)?.getData('text');
      if (pasted && pasted.includes('\n')) {
        const lines = pasted.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
        if (lines.length > 1) {
          e.preventDefault();
          input.value = lines[0];
          const currentRow = input.closest('.link-input-row');
          updateSingleRowState(currentRow, lines[0]);

          for (let i = 1; i < lines.length; i++) {
            const newRow = createLinkRow(lines[i]);
            linkInputsContainer.appendChild(newRow);
          }
          updateLinkRowsUI();
          showToast(`Added ${lines.length} links from clipboard`, 'success');
        }
      }
    });

    linkInputsContainer.addEventListener('click', (e) => {
      const rmBtn = e.target.closest('.remove-link-btn');
      if (rmBtn) {
        const row = rmBtn.closest('.link-input-row');
        if (row) {
          row.remove();
          updateLinkRowsUI();
        }
        return;
      }

      const clearBtn = e.target.closest('.clear-link-field-btn');
      if (clearBtn) {
        const row = clearBtn.closest('.link-input-row');
        if (row) {
          const inp = row.querySelector('.shareLinkInput');
          if (inp) {
            inp.value = '';
            inp.focus();
            updateSingleRowState(row, '');
            updateLinkRowsUI();
          }
        }
      }
    });
  }

  if (addLinkBtn) {
    addLinkBtn.addEventListener('click', () => {
      const newRow = createLinkRow();
      linkInputsContainer.appendChild(newRow);
      const input = newRow.querySelector('.shareLinkInput');
      if (input) input.focus();
      updateLinkRowsUI();
    });
  }

  if (pasteFromClipboardBtn) {
    pasteFromClipboardBtn.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          showToast('Clipboard reading not supported in this browser. Please paste manually.', 'info');
          return;
        }
        const text = await navigator.clipboard.readText();
        if (!text || !text.trim()) {
          showToast('Clipboard is empty', 'warning');
          return;
        }
        const lines = text.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
        if (lines.length > 1) {
          const rows = linkInputsContainer.querySelectorAll('.link-input-row');
          let startIndex = 0;
          if (rows.length === 1 && !rows[0].querySelector('.shareLinkInput')?.value.trim()) {
            rows[0].querySelector('.shareLinkInput').value = lines[0];
            updateSingleRowState(rows[0], lines[0]);
            startIndex = 1;
          }
          for (let i = startIndex; i < lines.length; i++) {
            const newRow = createLinkRow(lines[i]);
            linkInputsContainer.appendChild(newRow);
          }
          updateLinkRowsUI();
          showToast(`Pasted ${lines.length} links from clipboard`, 'success');
        } else {
          const emptyRow = Array.from(linkInputsContainer.querySelectorAll('.link-input-row'))
            .find(r => !r.querySelector('.shareLinkInput')?.value.trim());
          if (emptyRow) {
            const inp = emptyRow.querySelector('.shareLinkInput');
            inp.value = lines[0];
            inp.focus();
            updateSingleRowState(emptyRow, lines[0]);
          } else {
            const newRow = createLinkRow(lines[0]);
            linkInputsContainer.appendChild(newRow);
            newRow.querySelector('.shareLinkInput')?.focus();
            updateSingleRowState(newRow, lines[0]);
          }
          updateLinkRowsUI();
          showToast('Pasted link from clipboard', 'success');
        }
      } catch (err) {
        showToast('Please allow clipboard permission to paste directly', 'warning');
      }
    });
  }

  if (clearAllLinksBtn) {
    clearAllLinksBtn.addEventListener('click', () => {
      if (!linkInputsContainer) return;
      linkInputsContainer.innerHTML = '';
      linkInputsContainer.appendChild(createLinkRow());
      updateLinkRowsUI();
    });
  }

  updateLinkRowsUI();

  // ----- Update button + fields visibility based on login state -----
  function updateActionButtons() {
    const user = getCurrentUser();
    if (user) {
      shareBtn.setAttribute('data-hidden', 'true');
      shareIconBtn.removeAttribute('data-hidden');
      saveBtn.removeAttribute('data-hidden');
      if (toggleSharePasswordBtn) toggleSharePasswordBtn.removeAttribute('data-hidden');
    } else {
      shareBtn.removeAttribute('data-hidden');
      shareIconBtn.setAttribute('data-hidden', 'true');
      saveBtn.setAttribute('data-hidden', 'true');
      // Password protection is hidden for guest users
      if (toggleSharePasswordBtn) toggleSharePasswordBtn.setAttribute('data-hidden', 'true');
      if (sharePasswordRow) sharePasswordRow.style.display = 'none';
      if (sharePasswordInput) sharePasswordInput.value = '';
      if (toggleSharePasswordLabel) toggleSharePasswordLabel.textContent = 'Add Password';
      if (toggleSharePasswordBtn) toggleSharePasswordBtn.classList.remove('text-primary', 'bg-primary/10', 'border-primary/30');
    }
    // Title & Category are accessible to all users (both guests and logged-in)
    if (noteMeta) noteMeta.removeAttribute('data-hidden');

    // Guest storage notice
    const guestNotice = document.getElementById('guestShareNotice');
    if (guestNotice) {
      guestNotice.style.display = user ? 'none' : 'flex';
    }
  }

  updateActionButtons();
  window.updateShareButtons = updateActionButtons;

  // ----- Content Type Switching -----
  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      typeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
      const isText = selectedType === 'text';
      toggleDataHidden('editorFullscreenWrapper', !isText);
      toggleDataHidden('editorToolbar', !isText);
      toggleDataHidden('inputText', !isText);
      toggleDataHidden('editorStarterChips', !isText);
      toggleDataHidden('inputLink', selectedType !== 'link');
      toggleDataHidden('inputImage', selectedType !== 'image');

      if (!isText) {
        const findPanel = document.getElementById('findReplacePanel');
        if (findPanel) findPanel.style.display = 'none';
        const starterList = document.getElementById('starterOptionsList');
        if (starterList) {
          starterList.classList.add('hidden');
          starterList.classList.remove('flex');
          const sBtn = document.getElementById('starterToggleBtn');
          if (sBtn) sBtn.setAttribute('aria-expanded', 'false');
        }
      }
    });
  });

  // ----- Image & File Upload -----
  function getFileIconAndTheme(fileName, mimeType) {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    const mime = (mimeType || '').toLowerCase();

    if (ext === 'pdf' || mime === 'application/pdf') {
      return { icon: 'picture_as_pdf', bg: 'bg-red-500/10 text-red-500 border-red-500/20' };
    }
    if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || mime.includes('word') || mime.includes('officedocument.wordprocessingml')) {
      return { icon: 'description', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    }
    if (['xls', 'xlsx', 'ods', 'csv'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
      return { icon: 'table_chart', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    }
    if (['ppt', 'pptx', 'odp'].includes(ext) || mime.includes('presentation')) {
      return { icon: 'slideshow', bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20' };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime.includes('zip') || mime.includes('compressed')) {
      return { icon: 'folder_zip', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    }
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext) || mime.startsWith('audio/')) {
      return { icon: 'audio_file', bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
    }
    if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext) || mime.startsWith('video/')) {
      return { icon: 'video_file', bg: 'bg-pink-500/10 text-pink-500 border-pink-500/20' };
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css', 'cpp', 'c', 'java', 'sql', 'sh', 'md', 'xml'].includes(ext) || mime.includes('json') || mime.includes('javascript')) {
      return { icon: 'code', bg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' };
    }
    return { icon: 'attach_file', bg: 'bg-primary/10 text-primary border-primary/20' };
  }

  ['dragenter', 'dragover'].forEach(event => {
    dropzone.addEventListener(event, (e) => {
      e.preventDefault();
      dropzone.classList.add('bg-surface-container-low');
    });
  });

  ['dragleave', 'drop'].forEach(event => {
    dropzone.addEventListener(event, (e) => {
      e.preventDefault();
      dropzone.classList.remove('bg-surface-container-low');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    } else {
      showToast('Please drop a valid file', 'error');
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
  });

  if (changeFileBtn) {
    changeFileBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  // Ctrl+V paste support for media and files
  window.addEventListener('paste', (e) => {
    if (selectedType !== 'image') return;
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          handleFileSelect(file);
          showToast(`Pasted ${file.name || 'file from clipboard'}! 📋`, 'info');
          break;
        }
      }
    }
  });

  function handleFileSelect(file) {
    if (!file) return;

    const isImage = file.type && file.type.startsWith('image/');

    // Images can be compressed client-side, up to 10MB
    if (isImage && file.size > 10 * 1024 * 1024) {
      showToast('Image must be under 10MB', 'error');
      return;
    }

    // Non-image files are stored directly as base64 in Firestore (~1MB doc limit)
    if (!isImage && file.size > 800 * 1024) {
      showToast('Files without compression must be under 800KB for instant sharing. For larger files, compress or zip.', 'warning');
      return;
    }

    selectedFile = file;

    // Auto-populate note title with file name if title is empty
    if (noteTitle && !noteTitle.value.trim()) {
      noteTitle.value = file.name;
    }

    // Update bottom details bar
    if (selectedFileNameEl) selectedFileNameEl.textContent = file.name;
    if (selectedFileSizeEl) selectedFileSizeEl.textContent = typeof formatFileSize === 'function' ? formatFileSize(file.size) : (file.size + ' B');

    if (isImage) {
      // Show image preview, hide generic preview
      if (imagePreviewImgWrap) imagePreviewImgWrap.classList.remove('hidden');
      if (genericFilePreviewWrap) {
        genericFilePreviewWrap.classList.add('hidden');
        genericFilePreviewWrap.classList.remove('flex');
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.getElementById('imagePreviewImg');
        if (img) img.src = e.target.result;
        showEl('imagePreview');
        dropzone.style.display = 'none';
      };
      reader.readAsDataURL(file);
    } else {
      // Show generic file card preview, hide image preview
      if (imagePreviewImgWrap) imagePreviewImgWrap.classList.add('hidden');
      if (genericFilePreviewWrap) {
        genericFilePreviewWrap.classList.remove('hidden');
        genericFilePreviewWrap.classList.add('flex');
      }

      if (genericFileNameEl) genericFileNameEl.textContent = file.name;
      if (genericFileSizeEl) genericFileSizeEl.textContent = typeof formatFileSize === 'function' ? formatFileSize(file.size) : (file.size + ' B');

      const ext = file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'FILE';
      if (genericFileTypeBadgeEl) genericFileTypeBadgeEl.textContent = ext;

      const theme = getFileIconAndTheme(file.name, file.type);
      if (genericFileIconEl) genericFileIconEl.textContent = theme.icon;
      if (genericFileIconWrap) {
        genericFileIconWrap.className = `w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 ${theme.bg}`;
      }

      showEl('imagePreview');
      dropzone.style.display = 'none';
    }
  }

  const handleImageSelect = handleFileSelect;

  removeImageBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    hideEl('imagePreview');
    dropzone.style.display = '';
    if (imagePreviewImgWrap) imagePreviewImgWrap.classList.remove('hidden');
    if (genericFilePreviewWrap) {
      genericFilePreviewWrap.classList.add('hidden');
      genericFilePreviewWrap.classList.remove('flex');
    }
    const imgEl = document.getElementById('imagePreviewImg');
    if (imgEl) imgEl.removeAttribute('src');
  });

  // ----- Get content from inputs -----
  function getContent() {
    if (selectedType === 'text') {
      const content = (typeof getEditorPlainText === 'function') ? getEditorPlainText() : '';
      if (!content) { showToast('Please enter some text', 'warning'); return null; }
      return content;
    } else if (selectedType === 'link') {
      const linkInputs = document.querySelectorAll('.shareLinkInput');
      const content = [];
      for (const input of linkInputs) {
        let val = input.value.trim();
        if (val) {
          if (!/^https?:\/\//i.test(val) && !val.includes('://')) {
            val = 'https://' + val;
          }
          if (!isValidURL(val)) { showToast('Please enter a valid web URL (https://...)', 'error'); return null; }
          content.push(val);
        }
      }
      if (content.length === 0) { showToast('Please enter at least one URL', 'warning'); return null; }
      return content.length === 1 ? content[0] : content;
    } else if (selectedType === 'image') {
      if (!selectedFile) { showToast('Please select a file or image', 'warning'); return null; }
      return '__image__';
    }
    return null;
  }

  // ----- Upload file / image helper -----
  async function uploadFile(code) {
    if (!selectedFile) throw new Error('No file selected');
    if (selectedFile.type && selectedFile.type.startsWith('image/')) {
      return await compressImage(selectedFile);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file: ' + (e.target?.error?.message || 'Unknown error')));
      reader.readAsDataURL(selectedFile);
    });
  }

  const uploadImage = uploadFile;

  // ----- Share handlers -----
  shareBtn.addEventListener('click', (e) => { e.preventDefault(); handleShare(shareBtn); });
  shareIconBtn.addEventListener('click', (e) => { e.preventDefault(); handleShare(shareIconBtn); });

  async function handleShare(triggerBtn) {
    let content = getContent();
    if (content === null) return;

    triggerBtn.classList.add('btn-loading');
    triggerBtn.disabled = true;

    // Helper timeout wrapper to aggressively catch hanging promises
    const withTimeout = (promise, ms, name) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(name + ' timed out after ' + ms + 'ms')), ms);
        promise.then(val => { clearTimeout(timer); resolve(val); })
               .catch(err => { clearTimeout(timer); reject(err); });
      });
    };

    try {
      const code = await withTimeout(generateUniqueCode(6), 10000, 'generateUniqueCode');
      
      // Handle custom expiry
      const expiryVal = expirySelect ? expirySelect.value : '20';
      const isBurnAfterReading = expiryVal === 'burn';
      let expiryMinutes = 20;
      if (!isBurnAfterReading) {
        expiryMinutes = parseInt(expiryVal) || 20;
      } else {
        expiryMinutes = 1440; // 24h fallback safety expiry for unread burn notes
      }
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Handle password protection (logged-in members only)
      const currentUser = getCurrentUser();
      const rawPassword = (currentUser && sharePasswordInput) ? sharePasswordInput.value.trim() : '';
      let passwordHash = null;
      let isProtected = false;
      if (rawPassword) {
        passwordHash = await hashPassword(rawPassword);
        isProtected = true;
      }

      let fileMeta = null;
      if (selectedType === 'image') {
        content = await withTimeout(uploadFile(code), 20000, 'File processing');
        const isImg = Boolean(selectedFile && selectedFile.type && selectedFile.type.startsWith('image/'));
        fileMeta = {
          fileName: selectedFile ? selectedFile.name : 'file',
          fileSize: selectedFile ? selectedFile.size : 0,
          fileType: selectedFile ? (selectedFile.type || 'application/octet-stream') : 'application/octet-stream',
          isImage: isImg
        };
      }

      // Capture title & category (visible to all users via noteMeta or global fields)
      const titleEl = document.getElementById('noteTitle');
      const categoryEl = document.getElementById('noteCategory');
      const shareTitle = (titleEl ? titleEl.value.trim().substring(0, 100) : '') || '';
      const allowedCategories = ['personal', 'work', 'ideas', 'code', 'links', 'important'];
      const rawCategory = categoryEl ? categoryEl.value : '';
      const shareCategory = allowedCategories.includes(rawCategory) ? rawCategory : '';

      const shareData = {
        type: selectedType,
        content: content,
        title: shareTitle,
        category: shareCategory,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
        burnAfterReading: isBurnAfterReading,
        isProtected: isProtected,
        passwordHash: passwordHash,
        userId: null,
        ...(fileMeta || {})
      };

      if (currentUser) shareData.userId = currentUser.username;

      await withTimeout(db.collection('shares').doc(code).set(shareData), 10000, 'Firestore Write');

      // Add to user's history if logged in
      if (currentUser) {
        const title = noteTitle ? noteTitle.value.trim() : '';
        const previewText = title || (selectedType === 'image' ? (fileMeta?.isImage ? '🖼️ Image' : `📎 ${fileMeta?.fileName || 'File'}`) : (Array.isArray(content) ? content.join(', ') : content).substring(0, 100));
        await db.collection('users').doc(currentUser.username)
          .collection('history').doc(code)
          .set({
            type: selectedType,
            preview: previewText,
            code: code,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
      }

      displayCode(code, { isBurnAfterReading, expiryMinutes, isProtected, title: shareTitle, category: shareCategory });
      showToast(isBurnAfterReading ? 'Shared! 🔥 Self-destructs after 1st read' : `Shared! Auto-erases in ${expiryMinutes >= 60 ? (expiryMinutes / 60) + 'h' : expiryMinutes + 'm'} ⏱️`, 'success');
      resetShareForm();

    } catch (error) {
      console.error('Share error:', error);
      showToast('Failed to share. Check your connection.', 'error');
    } finally {
      triggerBtn.classList.remove('btn-loading');
      triggerBtn.disabled = false;
    }
  }

  // ----- Save Button — open folder-picker modal -----
  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    let content = getContent();
    if (content === null) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
      showToast('Please log in to save notes', 'warning');
      return;
    }

    // If image/file, prepare first (needed for preview in modal title)
    let resolvedContent = content;
    let fileMeta = null;
    if (selectedType === 'image') {
      saveBtn.classList.add('btn-loading');
      saveBtn.disabled = true;
      try {
        resolvedContent = await uploadFile('preview');
        const isImg = Boolean(selectedFile && selectedFile.type && selectedFile.type.startsWith('image/'));
        fileMeta = {
          fileName: selectedFile ? selectedFile.name : 'file',
          fileSize: selectedFile ? selectedFile.size : 0,
          fileType: selectedFile ? (selectedFile.type || 'application/octet-stream') : 'application/octet-stream',
          isImage: isImg
        };
      } catch(e) {
        showToast('File processing failed', 'error');
      } finally {
        saveBtn.classList.remove('btn-loading');
        saveBtn.disabled = false;
      }
    }

    const noteTitle = document.getElementById('noteTitle');
    const noteCategory = document.getElementById('noteCategory');
    const title = noteTitle ? noteTitle.value.trim() : '';
    const category = noteCategory ? noteCategory.value : '';

    // Open folder picker modal, then on confirm do the actual save
    openSaveFolderModal({
      noteType: selectedType,
      content: resolvedContent,
      title: title,
      category: category,
      username: currentUser.username,
      onConfirm: async (folderId, folderName) => {
        saveBtn.classList.add('btn-loading');
        saveBtn.disabled = true;
        try {
          const noteId = generateCode(8);
          const preview = title || (selectedType === 'image' ? (fileMeta?.isImage ? '🖼️ Image' : `📎 ${fileMeta?.fileName || 'File'}`) : (Array.isArray(resolvedContent) ? resolvedContent.join(', ') : resolvedContent).substring(0, 100));

          // Save to File Manager (users/{u}/files)
          if (typeof window.saveNoteToFileManager === 'function') {
            await window.saveNoteToFileManager({ title, category, noteType: selectedType, content: resolvedContent, ...(fileMeta || {}) }, folderId);
          }

          // Also save to savedNotes (backward compat for Saved tab)
          await db.collection('users').doc(currentUser.username)
            .collection('savedNotes').doc(noteId)
            .set({ type: selectedType, content: resolvedContent, title, category, preview, noteId, createdAt: firebase.firestore.FieldValue.serverTimestamp(), ...(fileMeta || {}) });

          // History entry
          await db.collection('users').doc(currentUser.username)
            .collection('history').doc(noteId)
            .set({ type: selectedType, preview, code: noteId, saved: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });

          const dest = folderName ? `"${folderName}"` : 'My Files';
          showToast(`Note saved to ${dest}! 📁`, 'success');
          resetShareForm();
          if (typeof window.refreshHistory === 'function') window.refreshHistory();
        } catch (error) {
          console.error('Save error:', error);
          showToast('Failed to save note.', 'error');
        } finally {
          saveBtn.classList.remove('btn-loading');
          saveBtn.disabled = false;
        }
      }
    });
  });

  // ----- Folder Picker Modal logic -----
  function openSaveFolderModal({ noteType, title, onConfirm }) {
    const modal = document.getElementById('saveFolderModal');
    if (!modal) {
      onConfirm(null, null);
      return;
    }

    const list = document.getElementById('saveFolderList');
    const newFolderInput = document.getElementById('saveFolderNewName');
    const newFolderRow = document.getElementById('saveFolderNewRow');
    const addFolderBtn = document.getElementById('saveFolderAddBtn');
    const confirmBtn = document.getElementById('saveFolderConfirmBtn');
    const cancelBtn = document.getElementById('saveFolderCancelBtn');
    const backdrop = document.getElementById('saveFolderBackdrop');
    const notePreview = document.getElementById('saveFolderNotePreview');
    const typeIconEl = document.getElementById('saveFolderTypeIcon');

    if (notePreview) notePreview.textContent = title || `Untitled ${noteType}`;
    if (typeIconEl) {
      const icons = { text: 'edit_note', link: 'link', image: 'image' };
      typeIconEl.textContent = icons[noteType] || 'description';
    }

    const folders = (typeof window.getFolderList === 'function') ? window.getFolderList() : [];
    list.innerHTML = '';
    let selectedFolderId = null;
    let selectedFolderName = null;

    function buildFolderItem(id, name, depth, icon) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'sfm-folder-item';
      item.style.paddingLeft = (16 + depth * 18) + 'px';
      item.dataset.fid = id || '';
      item.dataset.fname = name;
      item.innerHTML = `<span class="material-symbols-outlined sfm-folder-icon">${icon || 'folder'}</span><span>${escSFM(name)}</span>`;
      item.addEventListener('click', () => {
        list.querySelectorAll('.sfm-folder-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedFolderId = id || null;
        selectedFolderName = id ? name : null;
      });
      list.appendChild(item);
    }

    function buildLevel(parentId, depth) {
      folders.filter(f => (f.parentId || null) === parentId).forEach(f => {
        buildFolderItem(f.id, f.name, depth, 'folder');
        buildLevel(f.id, depth + 1);
      });
    }

    buildFolderItem(null, 'My Files (Root)', 0, 'home');
    buildLevel(null, 1);

    if (list.firstChild) list.firstChild.classList.add('selected');

    if (newFolderRow) newFolderRow.style.display = 'none';
    if (newFolderInput) newFolderInput.value = '';
    if (addFolderBtn) {
      addFolderBtn.onclick = () => {
        if (newFolderRow) newFolderRow.style.display = newFolderRow.style.display === 'none' ? 'flex' : 'none';
        if (newFolderInput && newFolderRow.style.display !== 'none') setTimeout(() => newFolderInput.focus(), 80);
      };
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('sfm-open'), 10);

    function closeModal() {
      modal.classList.remove('sfm-open');
      setTimeout(() => { modal.style.display = 'none'; }, 280);
    }

    if (cancelBtn) cancelBtn.onclick = closeModal;
    if (backdrop) backdrop.onclick = closeModal;

    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        const newName = newFolderInput ? newFolderInput.value.trim() : '';
        if (newName && newFolderRow && newFolderRow.style.display !== 'none') {
          try {
            if (!window.db || !getCurrentUser()) throw new Error('Not logged in');
            const user = getCurrentUser();
            const ref = await db.collection('users').doc(user.username).collection('folders').add({
              name: newName,
              parentId: null,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            selectedFolderId = ref.id;
            selectedFolderName = newName;
          } catch(e) {
            showToast('Could not create folder: ' + e.message, 'error');
            return;
          }
        }
        closeModal();
        onConfirm(selectedFolderId, selectedFolderName);
      };
    }

    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }

  function escSFM(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ----- Display Code -----
  function displayCode(code, options = {}) {
    hideEl('shareForm');
    setElText('codeValue', code);
    
    // Expiry description
    if (options.isBurnAfterReading) {
      setElText('codeExpiry', '🔥 Self-destructs immediately after recipient views it once');
    } else {
      const minutes = options.expiryMinutes || 20;
      const formattedTime = minutes >= 1440 ? `${minutes / 1440} day(s)` : (minutes >= 60 ? `${minutes / 60} hour(s)` : `${minutes} minutes`);
      setElText('codeExpiry', `Auto-erases in ${formattedTime}`);
    }

    // Password badge
    const pwdBadge = document.getElementById('codePasswordBadge');
    if (pwdBadge) {
      pwdBadge.style.display = options.isProtected ? 'inline-flex' : 'none';
    }

    // Title & Category badge on code display
    const codeTitleBadge = document.getElementById('codeTitleBadge');
    const codeCategoryBadge = document.getElementById('codeCategoryBadge');
    if (codeTitleBadge) {
      const titleTextSpan = codeTitleBadge.querySelector('span:last-child');
      if (options.title) {
        if (titleTextSpan) titleTextSpan.textContent = options.title;
        codeTitleBadge.style.display = 'inline-flex';
      } else {
        codeTitleBadge.style.display = 'none';
      }
    }
    if (codeCategoryBadge) {
      const catMap = { personal: '📝 Personal', work: '💼 Work', ideas: '💡 Ideas', code: '🖥️ Code', links: '🔗 Links', important: '⭐ Important' };
      if (options.category && catMap[options.category]) {
        codeCategoryBadge.textContent = catMap[options.category];
        codeCategoryBadge.style.display = 'inline-flex';
      } else {
        codeCategoryBadge.style.display = 'none';
      }
    }

    // Direct Link & QR Code
    const directUrl = `${window.location.origin}${window.location.pathname}?code=${code}`;
    
    // Setup QR Code
    if (shareQrCanvas && typeof QRCode !== 'undefined') {
      shareQrCanvas.innerHTML = '';
      try {
        qrCodeInstance = new QRCode(shareQrCanvas, {
          text: directUrl,
          width: 140,
          height: 140,
          colorDark: "#516070",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (err) {
        console.warn('QR Code generation notice:', err);
      }
    }

    if (shareQrContainer) shareQrContainer.style.display = 'none';

    showEl('codeDisplay');

    // Smoothly auto-scroll to the generated code card
    setTimeout(() => {
      const codeDisplayEl = document.getElementById('codeDisplay');
      if (codeDisplayEl) {
        if (typeof smoothScrollTo === 'function') {
          smoothScrollTo(codeDisplayEl, 85);
        } else {
          codeDisplayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 120);
  }

  // ----- QR Code Toggle -----
  if (codeQrToggleBtn && shareQrContainer) {
    codeQrToggleBtn.addEventListener('click', () => {
      const isVisible = shareQrContainer.style.display !== 'none';
      shareQrContainer.style.display = isVisible ? 'none' : 'flex';
      codeQrToggleBtn.classList.toggle('bg-primary', !isVisible);
      codeQrToggleBtn.classList.toggle('text-on-primary', !isVisible);
    });
  }

  // ----- Copy Direct Link -----
  if (codeCopyLinkBtn) {
    codeCopyLinkBtn.addEventListener('click', async () => {
      const valEl = document.getElementById('codeValue');
      const code = valEl ? valEl.textContent : '';
      if (!code) return;
      const directUrl = `${window.location.origin}${window.location.pathname}?code=${code}`;
      const success = await copyToClipboard(directUrl);
      if (success) {
        setElText('codeCopyLinkText', 'Link Copied!');
        showToast('Direct note link copied to clipboard!', 'success');
        setTimeout(() => {
          setElText('codeCopyLinkText', 'Copy Link');
        }, 2000);
      }
    });
  }

  // ----- Copy Code -----
  codeCopyBtn.addEventListener('click', async () => {
    const valEl = document.getElementById('codeValue');
    const code = valEl ? valEl.textContent : '';
    const success = await copyToClipboard(code);
    if (success) {
      setElText('codeCopyText', 'Copied!');
      showToast('Code copied to clipboard!', 'success');
      setTimeout(() => {
        setElText('codeCopyText', 'Copy Code');
      }, 2000);
    }
  });

  // ----- Reset Form -----
  function resetShareForm() {
    if (typeof clearEditor === 'function') clearEditor();
    const linkContainer = document.getElementById('linkInputsContainer');
    if (linkInputsContainer) {
      linkInputsContainer.innerHTML = '';
      linkInputsContainer.appendChild(createLinkRow());
      updateLinkRowsUI();
    }
    if (noteTitle) noteTitle.value = '';
    if (noteCategory) {
      noteCategory.value = '';
      updateTagUI('');
    }
    if (sharePasswordInput) sharePasswordInput.value = '';
    if (sharePasswordRow) sharePasswordRow.style.display = 'none';
    if (toggleSharePasswordLabel) toggleSharePasswordLabel.textContent = 'Add Password';
    if (toggleSharePasswordBtn) {
      toggleSharePasswordBtn.classList.remove('text-primary', 'bg-primary/10', 'border-primary/30');
      const user = getCurrentUser();
      if (!user) toggleSharePasswordBtn.setAttribute('data-hidden', 'true');
      else toggleSharePasswordBtn.removeAttribute('data-hidden');
    }
    if (expirySelect) {
      expirySelect.value = '20';
      updateExpiryUI('20');
    }
    if (expiryBadgeText) expiryBadgeText.innerHTML = 'Auto-erases in <strong>20 min</strong>';
    selectedFile = null;
    fileInput.value = '';
    hideEl('imagePreview');
    dropzone.style.display = '';
    if (imagePreviewImgWrap) imagePreviewImgWrap.classList.remove('hidden');
    if (genericFilePreviewWrap) {
      genericFilePreviewWrap.classList.add('hidden');
      genericFilePreviewWrap.classList.remove('flex');
    }
    const imgEl = document.getElementById('imagePreviewImg');
    if (imgEl) imgEl.removeAttribute('src');

    // Reset content type to text
    selectedType = 'text';
    typeButtons.forEach(b => b.classList.toggle('active', b.dataset.type === 'text'));
    toggleDataHidden('editorFullscreenWrapper', false);
    toggleDataHidden('editorToolbar', false);
    toggleDataHidden('inputText', false);
    toggleDataHidden('editorStarterChips', false);
    toggleDataHidden('inputLink', true);
    toggleDataHidden('inputImage', true);
  }

  function toggleDataHidden(id, hide) {
    const el = document.getElementById(id);
    if (!el) return;
    if (hide) el.setAttribute('data-hidden', 'true');
    else el.removeAttribute('data-hidden');
  }

  // Expose folder picker modal for other modules
  window.openSaveFolderModal = openSaveFolderModal;
}
