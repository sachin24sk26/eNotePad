// ============================================================
// Editor Module — eNotePad Rich Text Editor
// Lightweight contenteditable-based rich text editor with
// formatting toolbar, keyboard shortcuts, and utility features.
// ============================================================

function initEditor() {
  const editor = document.getElementById('richEditor');
  const toolbar = document.getElementById('editorToolbar');
  if (!editor || !toolbar) return;

  // ─── State ───
  let isMarkdownMode = false;
  let autoSaveTimer = null;
  const AUTO_SAVE_INTERVAL = 15000; // 15 seconds
  const MAX_VERSIONS = 5;

  // ─── Exec command helper ───
  function exec(command, value = null) {
    editor.focus();
    document.execCommand(command, false, value);
    updateToolbarState();
    updateStats();
    scheduleDraftSave();
  }

  // ─── Toolbar button handlers ───
  toolbar.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('#toggleSecondaryToolbar');
    if (toggleBtn) {
      e.preventDefault();
      e.stopPropagation();
      const secondary = document.getElementById('secondaryToolbar');
      const icon = toggleBtn.querySelector('.material-symbols-outlined');
      if (secondary.dataset.hidden === 'true') {
        secondary.dataset.hidden = 'false';
        secondary.style.display = 'flex';
        icon.textContent = 'expand_less';
        icon.style.transform = 'rotate(180deg)';
      } else {
        secondary.dataset.hidden = 'true';
        secondary.style.display = 'none';
        icon.textContent = 'expand_more';
        icon.style.transform = 'rotate(0deg)';
      }
      return;
    }

    const btn = e.target.closest('[data-cmd]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const cmd = btn.dataset.cmd;

    // Special commands
    switch (cmd) {
      case 'heading':
        toggleDropdown('headingDropdown');
        return;
      case 'fontFamily':
        toggleDropdown('fontFamilyDropdown');
        return;
      case 'fontSize':
        toggleDropdown('fontSizeDropdown');
        return;
      case 'foreColor':
        toggleDropdown('textColorDropdown');
        return;
      case 'hiliteColor':
        toggleDropdown('highlightColorDropdown');
        return;
      case 'insertLink':
        openLinkDialog();
        return;
      case 'insertImage': {
        const inp = document.getElementById('editorInlineImageInput');
        if (inp) inp.click();
        return;
      }
      case 'insertTable':
        toggleDropdown('tableDropdown');
        return;
      case 'emoji':
        toggleDropdown('emojiDropdown');
        return;
      case 'findReplace':
        toggleFindReplace();
        return;
      case 'fullscreen':
        toggleFullscreen();
        return;
      case 'print':
        printNote();
        return;
      case 'markdownToggle':
        toggleMarkdown();
        return;
      case 'shortcuts':
        toggleShortcutsPanel();
        return;
      case 'insertHR':
        exec('insertHTML', '<hr class="editor-hr">');
        return;
      case 'codeBlock':
        insertCodeBlock();
        return;
      case 'inlineCode':
        wrapSelectionWith('code');
        return;
      case 'checklist':
        insertChecklist();
        return;
      case 'clearFormatting':
        exec('removeFormat');
        return;
      default:
        exec(cmd);
    }
  });

  // ─── Heading dropdown ───
  document.getElementById('headingDropdown')?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-heading]');
    if (!item) return;
    const tag = item.dataset.heading;
    if (tag === 'p') {
      exec('formatBlock', '<p>');
    } else {
      exec('formatBlock', `<${tag}>`);
    }
    closeAllDropdowns();
  });

  // ─── Font Family dropdown ───
  document.getElementById('fontFamilyDropdown')?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-font]');
    if (!item) return;
    exec('fontName', item.dataset.font);
    closeAllDropdowns();
  });

  // ─── Font Size dropdown ───
  document.getElementById('fontSizeDropdown')?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-size]');
    if (!item) return;
    exec('fontSize', item.dataset.size);
    closeAllDropdowns();
  });

  // ─── Color pickers ───
  function setupColorPicker(dropdownId, command) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    dropdown.addEventListener('click', (e) => {
      const swatch = e.target.closest('[data-color]');
      if (!swatch) return;
      exec(command, swatch.dataset.color);
      closeAllDropdowns();
    });
    const customInput = dropdown.querySelector('.custom-color-input');
    if (customInput) {
      customInput.addEventListener('input', (e) => {
        exec(command, e.target.value);
      });
      customInput.addEventListener('change', () => {
        closeAllDropdowns();
      });
    }
  }
  setupColorPicker('textColorDropdown', 'foreColor');
  setupColorPicker('highlightColorDropdown', 'hiliteColor');

  // ─── Inline image upload ───
  const inlineImageInput = document.getElementById('editorInlineImageInput');
  if (inlineImageInput) {
    inlineImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be under 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        exec('insertHTML', `<img src="${ev.target.result}" alt="inline image" class="editor-inline-img" />`);
      };
      reader.readAsDataURL(file);
      inlineImageInput.value = '';
    });
  }

  // ─── Table dropdown (grid picker) ───
  const tableDropdown = document.getElementById('tableDropdown');
  if (tableDropdown) {
    const grid = tableDropdown.querySelector('.table-grid');
    const label = tableDropdown.querySelector('.table-grid-label');
    if (grid) {
      const cells = grid.querySelectorAll('.table-grid-cell');
      cells.forEach(cell => {
        cell.addEventListener('mouseenter', () => {
          const r = parseInt(cell.dataset.row);
          const c = parseInt(cell.dataset.col);
          if (label) label.textContent = `${r} × ${c}`;
          cells.forEach(cl => {
            const cr = parseInt(cl.dataset.row);
            const cc = parseInt(cl.dataset.col);
            cl.classList.toggle('active', cr <= r && cc <= c);
          });
        });
        cell.addEventListener('click', () => {
          const r = parseInt(cell.dataset.row);
          const c = parseInt(cell.dataset.col);
          insertTable(r, c);
          closeAllDropdowns();
        });
      });
      grid.addEventListener('mouseleave', () => {
        cells.forEach(cl => cl.classList.remove('active'));
        if (label) label.textContent = '0 × 0';
      });
    }
  }

  function insertTable(rows, cols) {
    let html = '<table class="editor-table"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += `<td>${r === 0 ? 'Header' : '&nbsp;'}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    exec('insertHTML', html);
  }

  // ─── Emoji picker ───
  const emojiDropdown = document.getElementById('emojiDropdown');
  if (emojiDropdown) {
    emojiDropdown.addEventListener('click', (e) => {
      const emojiBtn = e.target.closest('.emoji-item');
      if (!emojiBtn) return;
      exec('insertText', emojiBtn.textContent.trim());
      closeAllDropdowns();
    });
  }

  // ─── Link dialog ───
  function openLinkDialog() {
    const dialog = document.getElementById('linkDialog');
    const urlInput = document.getElementById('linkDialogUrl');
    if (!dialog) return;

    // Save current selection
    const sel = window.getSelection();
    let savedRange = null;
    if (sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }

    dialog.style.display = 'flex';
    urlInput.value = '';
    urlInput.focus();

    const insertBtn = document.getElementById('linkDialogInsert');
    const cancelBtn = document.getElementById('linkDialogCancel');

    function doInsert() {
      const url = urlInput.value.trim();
      if (!url) { showToast('Enter a URL', 'warning'); return; }
      // Restore selection
      if (savedRange) {
        const sel2 = window.getSelection();
        sel2.removeAllRanges();
        sel2.addRange(savedRange);
      }
      editor.focus();
      const selectedText = window.getSelection().toString() || url;
      exec('insertHTML', `<a href="${url}" target="_blank" rel="noopener">${selectedText}</a>`);
      dialog.style.display = 'none';
      cleanup();
    }

    function doCancel() {
      dialog.style.display = 'none';
      if (savedRange) {
        editor.focus();
        const sel2 = window.getSelection();
        sel2.removeAllRanges();
        sel2.addRange(savedRange);
      }
      cleanup();
    }

    function cleanup() {
      insertBtn.removeEventListener('click', doInsert);
      cancelBtn.removeEventListener('click', doCancel);
      urlInput.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
      if (e.key === 'Enter') { e.preventDefault(); doInsert(); }
      if (e.key === 'Escape') doCancel();
    }

    insertBtn.addEventListener('click', doInsert);
    cancelBtn.addEventListener('click', doCancel);
    urlInput.addEventListener('keydown', onKey);
  }

  // ─── Code block insertion ───
  function insertCodeBlock() {
    exec('insertHTML', '<pre class="editor-code-block"><code>// code here</code></pre><p><br></p>');
  }

  // ─── Inline code wrap ───
  function wrapSelectionWith(tag) {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const text = range.toString();
    const el = document.createElement(tag);
    el.textContent = text;
    el.className = 'editor-inline-code';
    range.deleteContents();
    range.insertNode(el);
    // Move cursor after the element
    range.setStartAfter(el);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    updateStats();
  }

  // ─── Checklist ───
  function insertChecklist() {
    const html = `<div class="editor-checklist-item"><input type="checkbox" class="editor-checkbox" /><span contenteditable="true">To-do item</span></div>`;
    exec('insertHTML', html);
  }

  // Editor handles checkbox toggling
  editor.addEventListener('click', (e) => {
    if (e.target.classList.contains('editor-checkbox')) {
      e.target.toggleAttribute('checked');
    }
  });

  // ─── Dropdowns ───
  function toggleDropdown(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const wasOpen = el.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) el.classList.add('open');
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.editor-dropdown').forEach(d => d.classList.remove('open'));
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.editor-dropdown') && !e.target.closest('[data-cmd]')) {
      closeAllDropdowns();
    }
  });

  // ─── Find & Replace ───
  function toggleFindReplace() {
    const panel = document.getElementById('findReplacePanel');
    if (!panel) return;
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      document.getElementById('findInput')?.focus();
    }
  }

  const findInput = document.getElementById('findInput');
  const replaceInput = document.getElementById('replaceInput');
  const findNextBtn = document.getElementById('findNextBtn');
  const replaceBtn = document.getElementById('replaceBtn');
  const replaceAllBtn = document.getElementById('replaceAllBtn');
  const closeFindPanel = document.getElementById('closeFindPanel');

  if (closeFindPanel) {
    closeFindPanel.addEventListener('click', () => {
      const panel = document.getElementById('findReplacePanel');
      if (panel) panel.style.display = 'none';
      clearHighlights();
    });
  }

  document.getElementById('closeShortcutsPanel')?.addEventListener('click', () => {
    const panel = document.getElementById('shortcutsPanel');
    if (panel) panel.style.display = 'none';
  });

  if (findNextBtn && findInput) {
    findNextBtn.addEventListener('click', () => findNext());
  }
  if (replaceBtn) {
    replaceBtn.addEventListener('click', () => replaceOne());
  }
  if (replaceAllBtn) {
    replaceAllBtn.addEventListener('click', () => replaceAll());
  }

  function clearHighlights() {
    editor.querySelectorAll('.find-highlight').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
  }

  function findNext() {
    const query = findInput?.value;
    if (!query) return;
    clearHighlights();

    const treeWalker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    let found = false;
    while (treeWalker.nextNode()) {
      const node = treeWalker.currentNode;
      const idx = node.textContent.toLowerCase().indexOf(query.toLowerCase());
      if (idx >= 0) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + query.length);
        const highlight = document.createElement('span');
        highlight.className = 'find-highlight';
        range.surroundContents(highlight);
        highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const sel = window.getSelection();
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(highlight);
        sel.addRange(newRange);
        found = true;
        break;
      }
    }
    if (!found) showToast('No matches found', 'info');
  }

  function replaceOne() {
    const query = findInput?.value;
    const replacement = replaceInput?.value ?? '';
    if (!query) return;
    const sel = window.getSelection();
    if (sel.toString().toLowerCase() === query.toLowerCase()) {
      exec('insertText', replacement);
    }
    findNext();
  }

  function replaceAll() {
    const query = findInput?.value;
    const replacement = replaceInput?.value ?? '';
    if (!query) return;
    clearHighlights();
    // Use innerHTML-based approach for replaceAll
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    editor.innerHTML = editor.innerHTML.replace(regex, replacement);
    updateStats();
    showToast('All occurrences replaced', 'success');
  }

  // ─── Fullscreen / Focus Mode ───
  function toggleFullscreen() {
    const wrapper = document.getElementById('editorFullscreenWrapper');
    if (!wrapper) return;
    const isFs = wrapper.classList.contains('editor-fullscreen');
    wrapper.classList.toggle('editor-fullscreen');
    const btn = toolbar.querySelector('[data-cmd="fullscreen"] .material-symbols-outlined');
    if (btn) btn.textContent = isFs ? 'fullscreen' : 'fullscreen_exit';
    document.body.classList.toggle('overflow-hidden', !isFs);
  }

  // ─── Print / Export ───
  function printNote() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>eNotePad — Print</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Newsreader:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Newsreader', serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #2e3640; line-height: 1.8; }
        h1,h2,h3 { font-family: 'Inter', sans-serif; margin: 1.5em 0 0.5em; }
        pre { background: #f4f4ef; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.9em; }
        code { background: #f4f4ef; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        td, th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
        img { max-width: 100%; border-radius: 8px; }
        .editor-checklist-item { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
        @media print { body { margin: 0; } }
      </style></head><body>${editor.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  // ─── Markdown toggle ───
  function toggleMarkdown() {
    const mdArea = document.getElementById('markdownArea');
    if (!mdArea) return;
    isMarkdownMode = !isMarkdownMode;
    if (isMarkdownMode) {
      // Convert HTML to plain text for markdown editing
      mdArea.value = htmlToMarkdown(editor.innerHTML);
      editor.style.display = 'none';
      mdArea.style.display = 'block';
      mdArea.focus();
    } else {
      // Convert markdown back to HTML
      editor.innerHTML = markdownToHtml(mdArea.value);
      mdArea.style.display = 'none';
      editor.style.display = 'block';
      editor.focus();
      updateStats();
    }
    const btn = toolbar.querySelector('[data-cmd="markdownToggle"]');
    if (btn) btn.classList.toggle('active', isMarkdownMode);
  }

  // Simple markdown → HTML conversion
  function markdownToHtml(md) {
    let html = md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`(.+?)`/g, '<code class="editor-inline-code">$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/^---$/gm, '<hr class="editor-hr">')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*?<\/li>\n?)+/gs, (match) => `<ul>${match}</ul>`);
    // Convert remaining newlines to <br>
    html = html.replace(/\n/g, '<br>');
    return html || '<p><br></p>';
  }

  // Simple HTML → markdown conversion
  function htmlToMarkdown(html) {
    let md = html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      .replace(/<del>(.*?)<\/del>/gi, '~~$1~~')
      .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n')
      .replace(/<hr[^>]*>/gi, '---\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n');
    return md.trim();
  }

  // ─── Keyboard shortcuts ───
  editor.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); exec('bold'); break;
        case 'i': e.preventDefault(); exec('italic'); break;
        case 'u': e.preventDefault(); exec('underline'); break;
        case 'h': e.preventDefault(); toggleFindReplace(); break;
        case 'l': e.preventDefault(); openLinkDialog(); break;
        case 'e': e.preventDefault(); exec('justifyCenter'); break;
      }
      if (e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 's': e.preventDefault(); exec('strikeThrough'); break;
          case 'x': e.preventDefault(); wrapSelectionWith('code'); break;
          case '7': e.preventDefault(); exec('insertOrderedList'); break;
          case '8': e.preventDefault(); exec('insertUnorderedList'); break;
        }
      }
    }
  });

  function toggleShortcutsPanel() {
    const panel = document.getElementById('shortcutsPanel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  }

  document.getElementById('closeShortcutsPanel')?.addEventListener('click', () => {
    const panel = document.getElementById('shortcutsPanel');
    if (panel) panel.style.display = 'none';
  });

  function updatePlaceholder() {
    const text = (editor.innerText || '').trim();
    if (!text) {
      editor.classList.add('is-empty');
    } else {
      editor.classList.remove('is-empty');
    }
  }

  function updateStats() {
    const text = editor.innerText || '';
    const chars = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    const wordCountEl = document.getElementById('editorWordCount');
    const charCountEl = document.getElementById('editorCharCount');
    const readTimeEl = document.getElementById('editorReadTime');

    if (wordCountEl) wordCountEl.textContent = words;
    if (charCountEl) charCountEl.textContent = chars;
    if (readTimeEl) readTimeEl.textContent = `~${readingTime} min read`;

    updatePlaceholder();
  }

  editor.addEventListener('input', () => {
    updateStats();
    updateToolbarState();
    scheduleDraftSave();

    // Trigger guest milestone nudge on note typing
    if (typeof window.showGuestMilestoneToast === 'function' && !sessionStorage.getItem('enp_nudge_typed_shown')) {
      const text = editor.innerText ? editor.innerText.trim() : '';
      if (text.length >= 25) {
        sessionStorage.setItem('enp_nudge_typed_shown', '1');
        window.showGuestMilestoneToast('note_typed');
      }
    }
  });

  // ─── Toolbar active states ───
  function updateToolbarState() {
    const cmds = ['bold', 'italic', 'underline', 'strikeThrough',
      'justifyLeft', 'justifyCenter', 'justifyRight',
      'insertUnorderedList', 'insertOrderedList'];
    cmds.forEach(cmd => {
      const btn = toolbar.querySelector(`[data-cmd="${cmd}"]`);
      if (btn) {
        btn.classList.toggle('active', document.queryCommandState(cmd));
      }
    });
  }

  editor.addEventListener('mouseup', updateToolbarState);
  editor.addEventListener('keyup', updateToolbarState);

  // ─── Auto-save draft (localStorage) ───
  function scheduleDraftSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveDraft, AUTO_SAVE_INTERVAL);
  }

  function saveDraft() {
    try {
      const content = editor.innerHTML;
      if (!content || content === '<p><br></p>') return;
      localStorage.setItem('eNotepad_draft', content);
      localStorage.setItem('eNotepad_draft_time', Date.now().toString());
    } catch (e) { /* quota exceeded - ignore */ }
  }

  function loadDraft() {
    try {
      const draft = localStorage.getItem('eNotepad_draft');
      const time = localStorage.getItem('eNotepad_draft_time');
      if (draft && time) {
        const age = Date.now() - parseInt(time);
        // Only restore drafts less than 24 hours old
        if (age < 86400000) {
          editor.innerHTML = draft;
          updateStats();
          showToast('Draft restored', 'info');
        }
      }
    } catch (e) { /* ignore */ }
  }

  // ─── Version history (localStorage) ───
  function saveVersion() {
    try {
      const content = editor.innerHTML;
      if (!content || content === '<p><br></p>') return;
      const versions = JSON.parse(localStorage.getItem('eNotepad_versions') || '[]');
      versions.unshift({
        content,
        timestamp: Date.now(),
        preview: (editor.innerText || '').substring(0, 60)
      });
      // Keep only MAX_VERSIONS
      if (versions.length > MAX_VERSIONS) versions.length = MAX_VERSIONS;
      localStorage.setItem('eNotepad_versions', JSON.stringify(versions));
    } catch (e) { /* ignore */ }
  }

  // Save a version when sharing/saving
  window.saveEditorVersion = saveVersion;

  // ─── Voice-to-Text (Web Speech API) ───
  let recognition = null;
  const voiceBtn = toolbar.querySelector('[data-cmd="voiceInput"]');
  if (voiceBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let isListening = false;

    voiceBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isListening) {
        recognition.stop();
        isListening = false;
        voiceBtn.classList.remove('active', 'voice-active');
      } else {
        recognition.start();
        isListening = true;
        voiceBtn.classList.add('active', 'voice-active');
        showToast('Listening...', 'info');
      }
    });

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        editor.focus();
        exec('insertText', finalTranscript + ' ');
      }
    };

    recognition.onerror = () => {
      isListening = false;
      voiceBtn.classList.remove('active', 'voice-active');
      showToast('Voice input error', 'error');
    };

    recognition.onend = () => {
      if (isListening) {
        // Restart if user hasn't stopped
        try { recognition.start(); } catch (e) { /* ignore */ }
      }
    };
  } else if (voiceBtn) {
    voiceBtn.style.display = 'none';
  }

  // ─── Text-to-Speech ───
  const ttsBtn = toolbar.querySelector('[data-cmd="textToSpeech"]');
  if (ttsBtn && 'speechSynthesis' in window) {
    let isSpeaking = false;
    ttsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSpeaking) {
        speechSynthesis.cancel();
        isSpeaking = false;
        ttsBtn.classList.remove('active');
      } else {
        const text = editor.innerText;
        if (!text.trim()) { showToast('Nothing to read', 'warning'); return; }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.onend = () => { isSpeaking = false; ttsBtn.classList.remove('active'); };
        speechSynthesis.speak(utterance);
        isSpeaking = true;
        ttsBtn.classList.add('active');
      }
    });
  } else if (ttsBtn) {
    ttsBtn.style.display = 'none';
  }

  // ─── Template presets ───
  const templateBtn = toolbar.querySelector('[data-cmd="templates"]');
  if (templateBtn) {
    templateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown('templateDropdown');
    });
  }

  document.getElementById('templateDropdown')?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-template]');
    if (!item) return;
    const templateKey = item.dataset.template;
    const templates = {
      meeting: `<h2>📋 Meeting Notes</h2><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><p><strong>Attendees:</strong></p><ul><li>Person 1</li><li>Person 2</li></ul><h3>Agenda</h3><ul><li>Topic 1</li><li>Topic 2</li></ul><h3>Action Items</h3><div class="editor-checklist-item"><input type="checkbox" class="editor-checkbox" /><span contenteditable="true">Action item 1</span></div><div class="editor-checklist-item"><input type="checkbox" class="editor-checkbox" /><span contenteditable="true">Action item 2</span></div>`,
      todo: `<h2>✅ To-Do List</h2><p><em>${new Date().toLocaleDateString()}</em></p><div class="editor-checklist-item"><input type="checkbox" class="editor-checkbox" /><span contenteditable="true">Task 1</span></div><div class="editor-checklist-item"><input type="checkbox" class="editor-checkbox" /><span contenteditable="true">Task 2</span></div><div class="editor-checklist-item"><input type="checkbox" class="editor-checkbox" /><span contenteditable="true">Task 3</span></div><div class="editor-checklist-item"><input type="checkbox" class="editor-checkbox" /><span contenteditable="true">Task 4</span></div><div class="editor-checklist-item"><input type="checkbox" class="editor-checkbox" /><span contenteditable="true">Task 5</span></div>`,
      journal: `<h2>📔 Journal Entry</h2><p><em>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</em></p><h3>How I'm feeling</h3><p>Today I feel...</p><h3>What happened</h3><p>Today's highlights...</p><h3>Grateful for</h3><ul><li>Thing 1</li><li>Thing 2</li><li>Thing 3</li></ul>`,
      brainstorm: `<h2>💡 Brainstorm</h2><p><strong>Topic:</strong> [Your topic here]</p><hr class="editor-hr"><h3>Ideas</h3><ul><li>Idea 1</li><li>Idea 2</li><li>Idea 3</li></ul><h3>Pros & Cons</h3><table class="editor-table"><tbody><tr><td><strong>Pros</strong></td><td><strong>Cons</strong></td></tr><tr><td>Pro 1</td><td>Con 1</td></tr><tr><td>Pro 2</td><td>Con 2</td></tr></tbody></table><h3>Next Steps</h3><div class="editor-checklist-item"><input type="checkbox" class="editor-checkbox" /><span contenteditable="true">Follow up on...</span></div>`
    };
    if (templates[templateKey]) {
      editor.innerHTML = templates[templateKey];
      updateStats();
    }
    closeAllDropdowns();
  });

  // ─── Public API for share.js integration ───
  window.getEditorContent = () => {
    if (isMarkdownMode) {
      const mdArea = document.getElementById('markdownArea');
      return mdArea ? mdArea.value.trim() : '';
    }
    return editor.innerHTML;
  };

  window.getEditorPlainText = () => {
    return (editor.innerText || '').trim();
  };

  window.clearEditor = () => {
    editor.innerHTML = '<p><br></p>';
    const mdArea = document.getElementById('markdownArea');
    if (mdArea) mdArea.value = '';
    isMarkdownMode = false;
    const btn = toolbar.querySelector('[data-cmd="markdownToggle"]');
    if (btn) btn.classList.remove('active');
    updateStats();
    try { localStorage.removeItem('eNotepad_draft'); } catch (e) { /* ignore */ }
  };

  window.setEditorContent = (html) => {
    editor.innerHTML = html || '<p><br></p>';
    updateStats();
  };

  // ─── Initial setup ───
  editor.innerHTML = '<p><br></p>';
  updateStats();

  // Optionally load draft
  // loadDraft(); — commented out; user may prefer a blank slate

  // Ensure placeholder works
  editor.addEventListener('focus', () => {
    if (editor.innerHTML === '<p><br></p>' || editor.innerHTML === '<br>' || editor.innerHTML === '') {
      editor.innerHTML = '<p><br></p>';
      const range = document.createRange();
      range.setStart(editor.firstChild, 0);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    updatePlaceholder();
  });

  editor.addEventListener('blur', () => {
    if (!editor.innerText.trim()) {
      editor.innerHTML = '<p><br></p>';
    }
    updatePlaceholder();
  });
}
