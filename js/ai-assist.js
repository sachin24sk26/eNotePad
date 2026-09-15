// ============================================================
// AI Assist Module — eNotePad
// Powered by Google Gemini API (gemini-3.6-flash)
// Provides: Fix Grammar, Rephrase, Beautify, Summarize,
//           Continue Writing, and Custom Prompt actions.
// ============================================================

function initAiAssist() {
  'use strict';

  const STORAGE_KEY = 'enp_gemini_api_key';
  const DEFAULT_API_KEY = (typeof window !== 'undefined' && (
    (window.__ENV__ && window.__ENV__.GEMINI_API_KEY) ||
    (window.ENV && window.ENV.GEMINI_API_KEY) ||
    window.GEMINI_API_KEY
  )) || '';
  const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

  let currentAction = null;
  let isPanelOpen = false;
  let abortController = null;

  const panel = document.getElementById('aiAssistPanel');
  const editor = document.getElementById('richEditor');
  if (!panel || !editor) return;

  const keySetupSection = document.getElementById('aiKeySetup');
  const actionSection = document.getElementById('aiActionSection');
  const previewSection = document.getElementById('aiPreviewSection');
  const previewContent = document.getElementById('aiPreviewContent');
  const customPromptRow = document.getElementById('aiCustomPromptRow');
  const customPromptInput = document.getElementById('aiCustomPromptInput');
  const aiScopeToggle = document.getElementById('aiScopeToggle');
  const apiKeyInput = document.getElementById('aiApiKeyInput');
  const saveApiKeyBtn = document.getElementById('aiSaveApiKeyBtn');
  const resetApiKeyBtn = document.getElementById('aiResetApiKeyBtn');
  const cancelKeyBtn = document.getElementById('aiCancelKeyBtn');
  const changeKeyBtn = document.getElementById('aiChangeKeyBtn');
  const closePanelBtn = document.getElementById('aiAssistCloseBtn');
  const floatingBtn = document.getElementById('aiFloatingBtn');
  const runBtn = document.getElementById('aiRunBtn');
  const aiApplyBtn = document.getElementById('aiApplyBtn');
  const aiDiscardBtn = document.getElementById('aiDiscardBtn');
  const aiCopyBtn = document.getElementById('aiCopyBtn');
  const aiRegenerateBtn = document.getElementById('aiRegenerateBtn');

  let generatedHTML = '';
  let savedRange = null;
  let selectedText = '';

  // ─── Toggle panel ─────────────────────────────────────────
  window.toggleAiAssistPanel = function () {
    isPanelOpen = !isPanelOpen;
    panel.style.display = isPanelOpen ? 'block' : 'none';
    if (isPanelOpen) {
      panel.classList.add('ai-panel-animate-in');
      setTimeout(() => panel.classList.remove('ai-panel-animate-in'), 400);
      captureSelection();
      refreshPanelState();
      try { panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    } else {
      resetPanel();
    }
    const toolbarBtn = document.querySelector('[data-cmd="aiAssist"]');
    if (toolbarBtn) toolbarBtn.classList.toggle('active', isPanelOpen);
    if (floatingBtn) floatingBtn.classList.toggle('active', isPanelOpen);
  };

  if (floatingBtn) {
    floatingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.toggleAiAssistPanel();
    });
  }

  if (closePanelBtn) {
    closePanelBtn.addEventListener('click', () => {
      isPanelOpen = false;
      panel.style.display = 'none';
      resetPanel();
      const toolbarBtn = document.querySelector('[data-cmd="aiAssist"]');
      if (toolbarBtn) toolbarBtn.classList.remove('active');
      if (floatingBtn) floatingBtn.classList.remove('active');
    });
  }

  // ─── API Key management ───────────────────────────────────
  function getApiKey() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored.trim()) {
        return stored.trim();
      }
      return DEFAULT_API_KEY || '';
    } catch (e) {
      return DEFAULT_API_KEY || '';
    }
  }

  function setApiKey(key) {
    try { localStorage.setItem(STORAGE_KEY, key.trim()); } catch (e) {}
  }

  function refreshPanelState() {
    const key = getApiKey();
    if (key) {
      if (keySetupSection) keySetupSection.style.display = 'none';
      if (actionSection) actionSection.style.display = 'block';
    } else {
      if (keySetupSection) keySetupSection.style.display = 'block';
      if (actionSection) actionSection.style.display = 'none';
    }
    if (previewSection) previewSection.style.display = 'none';
  }

  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', () => {
      const key = apiKeyInput ? apiKeyInput.value.trim() : '';
      if (!key) {
        if (DEFAULT_API_KEY) {
          try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
          showToast('Using default Gemini API key ✨', 'success');
          refreshPanelState();
          return;
        }
        showToast('Please enter a valid API key', 'error');
        return;
      }
      if (key.length < 8) {
        showToast('Please enter a valid API key', 'error');
        return;
      }
      setApiKey(key);
      showToast('API key saved! AI Assist is ready \u2728', 'success');
      refreshPanelState();
    });
  }

  if (resetApiKeyBtn) {
    resetApiKeyBtn.addEventListener('click', () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      if (apiKeyInput) apiKeyInput.value = '';
      showToast('Reverted to default Gemini API key ✨', 'success');
      refreshPanelState();
    });
  }

  if (cancelKeyBtn) {
    cancelKeyBtn.addEventListener('click', () => {
      if (getApiKey()) {
        if (keySetupSection) keySetupSection.style.display = 'none';
        if (actionSection) actionSection.style.display = 'block';
      }
    });
  }

  if (changeKeyBtn) {
    changeKeyBtn.addEventListener('click', () => {
      const isShowingSetup = keySetupSection && keySetupSection.style.display === 'block';
      if (isShowingSetup && getApiKey()) {
        keySetupSection.style.display = 'none';
        if (actionSection) actionSection.style.display = 'block';
        return;
      }
      if (keySetupSection) keySetupSection.style.display = 'block';
      if (actionSection) actionSection.style.display = 'none';
      if (apiKeyInput) {
        const storedKey = localStorage.getItem(STORAGE_KEY);
        apiKeyInput.value = storedKey || '';
        apiKeyInput.placeholder = DEFAULT_API_KEY ? 'Default key active (paste custom key to override)...' : 'Paste your Gemini API key...';
        apiKeyInput.focus();
      }
    });
  }

  // ─── Capture selection ────────────────────────────────────
  function captureSelection() {
    const sel = window.getSelection();
    selectedText = '';
    savedRange = null;
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        savedRange = range.cloneRange();
        selectedText = sel.toString().trim();
      }
    }
    updateScopeLabel();
  }

  function updateScopeLabel() {
    if (!aiScopeToggle) return;
    if (selectedText) {
      const preview = selectedText.split(' ').slice(0, 4).join(' ');
      const wordCount = selectedText.split(/\s+/).length;
      aiScopeToggle.textContent = '\uD83D\uDCCC "' + preview + '\u2026" (' + wordCount + ' words selected)';
      aiScopeToggle.classList.add('has-selection');
    } else {
      aiScopeToggle.textContent = '\uD83D\uDCC4 Full note';
      aiScopeToggle.classList.remove('has-selection');
    }
  }

  // ─── Action chips ─────────────────────────────────────────
  document.querySelectorAll('.ai-action-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.ai-action-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentAction = chip.dataset.action;
      if (customPromptRow) {
        customPromptRow.style.display = currentAction === 'custom' ? 'block' : 'none';
        if (currentAction === 'custom' && customPromptInput) customPromptInput.focus();
      }
    });
  });

  // ─── Run AI ───────────────────────────────────────────────
  if (runBtn) runBtn.addEventListener('click', runAI);
  if (aiRegenerateBtn) aiRegenerateBtn.addEventListener('click', runAI);

  async function runAI() {
    if (!currentAction) {
      showToast('Please select an action first', 'warning');
      return;
    }
    const apiKey = getApiKey();
    if (!apiKey) {
      showToast('Please save your Gemini API key first', 'warning');
      refreshPanelState();
      return;
    }

    const plainText = selectedText || (editor.innerText || '').trim();
    const rawHTML = selectedText ? getSelectionHTML() : (editor.innerHTML || '');

    if (!plainText || plainText.length < 2) {
      showToast('Please write something in the editor first', 'warning');
      return;
    }

    const prompt = buildPrompt(currentAction, plainText, rawHTML);
    if (!prompt) return;

    setLoading(true);
    if (previewSection) previewSection.style.display = 'none';
    if (abortController) abortController.abort();
    abortController = new AbortController();

    try {
      const response = await fetch(API_BASE + '?key=' + apiKey, {
        method: 'POST',
        signal: abortController.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: currentAction === 'rephrase' ? 0.8 : 0.5,
            maxOutputTokens: 2048
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = (errData && errData.error && errData.error.message) || ('HTTP ' + response.status);
        throw new Error(errMsg);
      }

      const data = await response.json();
      let rawText = '';
      if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        rawText = data.candidates[0].content.parts
          .filter(function(p) { return p && p.text; })
          .map(function(p) { return p.text; })
          .join('');
      }
      if (!rawText.trim()) throw new Error('AI returned an empty response. Try again.');

      generatedHTML = markdownToRichHTML(rawText.trim());
      showPreview(generatedHTML);

    } catch (err) {
      if (err.name === 'AbortError') return;
      showToast('AI Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function getSelectionHTML() {
    if (!savedRange) return '';
    const fragment = savedRange.cloneContents();
    const div = document.createElement('div');
    div.appendChild(fragment);
    return div.innerHTML;
  }

  // ─── Build prompts ────────────────────────────────────────
  function buildPrompt(action, text, html) {
    const richInstructions = '\nIMPORTANT FORMATTING RULES:\n- Use **text** for bold\n- Use *text* for italic\n- Use ## for H2 headings with emoji, ### for H3\n- Use - for bullets, 1. for numbered lists\n- Use > for blockquotes\n- Use `code` for inline code\n- Use ==text== for highlighted text\n- Output ONLY the improved content with no meta-commentary\n- Return clean markdown';

    switch (action) {
      case 'grammar':
        return 'Fix all grammar, spelling, and punctuation errors. Preserve original meaning, tone, and structure exactly.\n\n' + text + richInstructions;
      case 'rephrase':
        return 'Rephrase to be clearer, more concise, and professionally written. Maintain the original meaning.\n\n' + text + richInstructions;
      case 'beautify':
        return 'Transform this into a beautifully structured rich note with:\n- H2 title with emoji\n- H3 sub-headings for sections\n- Bullet/numbered lists for enumerables\n- **Bold** for important terms\n- ==Highlighted== for critical facts\n- Blockquotes for notable statements\n- Relevant emojis throughout\nReturn ONLY the transformed content:\n\n' + text + richInstructions;
      case 'summarize':
        return 'Summarize into:\n- A 1-2 sentence TL;DR blockquote at the top\n- 3-5 key bullet points\n- Action items/conclusions in a numbered list\n\n' + text + richInstructions;
      case 'continue':
        return 'Continue writing the text below naturally, matching the same style and format. Add 2-3 more paragraphs. Return ONLY the new continuation:\n\n' + text + richInstructions;
      case 'custom': {
        const instruction = customPromptInput ? customPromptInput.value.trim() : '';
        if (!instruction) { showToast('Please enter a custom instruction', 'warning'); return null; }
        return 'Apply this instruction to the text:\n\nInstruction: "' + instruction + '"\n\nText:\n' + text + richInstructions;
      }
      default: return null;
    }
  }

  // ─── Markdown to rich HTML ────────────────────────────────
  function markdownToRichHTML(md) {
    let html = md
      .replace(/^```html\n?/i, '').replace(/\n?```$/m, '')
      .replace(/^```\n?/m, '').replace(/\n?```$/m, '')
      .replace(/^#### (.+)$/gm, '<h4 style="font-family:Inter,sans-serif;font-weight:700;font-size:1em;margin:1em 0 0.3em;">$1</h4>')
      .replace(/^### (.+)$/gm, '<h3 style="font-family:Inter,sans-serif;font-weight:700;font-size:1.1em;margin:1.3em 0 0.5em;color:#516070;">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="font-family:Inter,sans-serif;font-weight:700;font-size:1.3em;margin:1.5em 0 0.6em;color:#2f342e;">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.6em;margin:0 0 0.8em;">$1</h1>')
      .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #516070;padding:8px 16px;margin:10px 0;background:#f4f4ef;border-radius:0 8px 8px 0;font-style:italic;color:#5c605a;">$1</blockquote>')
      .replace(/==(.+?)==/g, '<mark style="background:#fff9c4;padding:1px 3px;border-radius:3px;">$1</mark>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`(.+?)`/g, '<code style="background:#edeee8;padding:2px 6px;border-radius:4px;font-family:Courier New,monospace;font-size:0.9em;color:#516070;">$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#516070;text-decoration:underline;">$1</a>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #afb3ac;margin:1.2em 0;">');

    html = html.replace(/((?:^- .+$\n?)+)/gm, function(match) {
      var items = match.trim().split('\n').map(function(l) { return '<li style="margin:3px 0;">' + l.replace(/^- /, '') + '</li>'; }).join('');
      return '<ul style="padding-left:1.4em;margin:8px 0;">' + items + '</ul>';
    });
    html = html.replace(/((?:^\d+\. .+$\n?)+)/gm, function(match) {
      var items = match.trim().split('\n').map(function(l) { return '<li style="margin:3px 0;">' + l.replace(/^\d+\. /, '') + '</li>'; }).join('');
      return '<ol style="padding-left:1.4em;margin:8px 0;">' + items + '</ol>';
    });

    html = html.replace(/\n\n+/g, '</p><p style="margin:0.7em 0;">');
    html = html.replace(/\n/g, '<br>');
    if (!html.match(/^<(h[1-6]|ul|ol|blockquote|hr|p)/i)) {
      html = '<p style="margin:0.7em 0;">' + html + '</p>';
    }
    return html;
  }

  // ─── Show preview ─────────────────────────────────────────
  function showPreview(html) {
    if (!previewSection || !previewContent) return;
    previewContent.innerHTML = html;
    previewSection.style.display = 'block';
    setTimeout(function() { previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
  }

  // ─── Apply ────────────────────────────────────────────────
  if (aiApplyBtn) {
    aiApplyBtn.addEventListener('click', function() {
      if (!generatedHTML) return;
      editor.focus();
      if (savedRange && selectedText) {
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
        document.execCommand('insertHTML', false, generatedHTML);
      } else {
        if (typeof window.setEditorContent === 'function') {
          window.setEditorContent(generatedHTML);
        } else {
          editor.innerHTML = generatedHTML;
        }
      }
      isPanelOpen = false;
      panel.style.display = 'none';
      resetPanel();
      var toolbarBtn = document.querySelector('[data-cmd="aiAssist"]');
      if (toolbarBtn) toolbarBtn.classList.remove('active');
      showToast('\u2728 AI content applied! Press Ctrl+Z to undo.', 'success');
    });
  }

  if (aiDiscardBtn) {
    aiDiscardBtn.addEventListener('click', function() {
      generatedHTML = '';
      if (previewSection) previewSection.style.display = 'none';
      if (previewContent) previewContent.innerHTML = '';
    });
  }

  if (aiCopyBtn) {
    aiCopyBtn.addEventListener('click', function() {
      if (!previewContent) return;
      navigator.clipboard.writeText(previewContent.innerText || '').then(function() {
        showToast('Copied to clipboard', 'success');
      });
    });
  }

  // ─── Loading ──────────────────────────────────────────────
  function setLoading(loading) {
    if (runBtn) {
      runBtn.disabled = loading;
      runBtn.innerHTML = loading
        ? '<span class="ai-btn-spinner"></span> Generating\u2026'
        : '<span class="material-symbols-outlined text-sm">auto_awesome</span> Generate';
    }
    if (aiRegenerateBtn) aiRegenerateBtn.disabled = loading;
  }

  // ─── Reset ────────────────────────────────────────────────
  function resetPanel() {
    generatedHTML = '';
    currentAction = null;
    selectedText = '';
    savedRange = null;
    if (previewSection) previewSection.style.display = 'none';
    if (previewContent) previewContent.innerHTML = '';
    if (customPromptRow) customPromptRow.style.display = 'none';
    if (customPromptInput) customPromptInput.value = '';
    document.querySelectorAll('.ai-action-chip').forEach(function(c) { c.classList.remove('active'); });
    setLoading(false);
    if (abortController) { abortController.abort(); abortController = null; }
  }

  var savedKey = getApiKey();
  if (savedKey && apiKeyInput) apiKeyInput.value = savedKey;
  refreshPanelState();
}
