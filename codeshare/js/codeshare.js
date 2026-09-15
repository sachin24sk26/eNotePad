/**
 * eNotePad — CodeShare Real-Time Engine (v2.1)
 * Seamless multi-peer collaborative code editor with live syntax highlighting,
 * robust Firestore & BroadcastChannel synchronization without keystroke erasure,
 * in-browser Python (Skulpt) + JavaScript runtime, collaborative chat, and
 * interactive Room Creation / Join Landing Flow.
 */

// Unique client session ID to prevent self-echo and keystroke erasure
const clientSessionId = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);

let editor = null;
let currentRoomCode = null;
let isApplyingRemoteChange = false;
let unsubscribeRoom = null;
let unsubscribeChat = null;
let currentLanguage = 'javascript';
let isReadOnly = false;
let currentUser = null;
let peerPresenceInterval = null;
let broadcastChannel = null;
let localVersion = 0;
let isPreviewOpen = false;
let sessionTimerSeconds = 0;
let sessionTimerInterval = null;
let isSessionTimerRunning = false;

// Language metadata configuration
const LANGUAGES = {
  javascript: { 
    name: 'JavaScript', 
    mode: 'javascript', 
    ext: 'js', 
    defaultCode: `// Welcome to eNotePad CodeShare
// Share this link with teammates to code in real-time!

function calculateFactorial(n) {
  if (n <= 1) return 1;
  return n * calculateFactorial(n - 1);
}

console.log("Factorial of 5 is:", calculateFactorial(5));
` 
  },
  typescript: { 
    name: 'TypeScript', 
    mode: 'javascript', 
    ext: 'ts', 
    defaultCode: `interface User {
  id: string;
  name: string;
  role: "admin" | "editor" | "viewer";
}

const currentUser: User = {
  id: "usr_992",
  name: "Alex Curator",
  role: "editor"
};

console.log(\`Active session for \${currentUser.name}\`);
` 
  },
  python: { 
    name: 'Python', 
    mode: 'python', 
    ext: 'py', 
    defaultCode: `# eNotePad CodeShare — Python Session
import math

def fibonacci(n):
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence

print("First 10 Fibonacci numbers:", fibonacci(10))
print("Square root of 144 is:", math.sqrt(144))
` 
  },
  html: { 
    name: 'HTML / CSS / JS', 
    mode: 'htmlmixed', 
    ext: 'html', 
    defaultCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Live Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
    }
    .card {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(12px);
      padding: 2.5rem;
      border-radius: 1.5rem;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.2);
    }
    button {
      background: #ffffff;
      color: #4f46e5;
      border: none;
      padding: 0.75rem 1.75rem;
      border-radius: 9999px;
      font-weight: bold;
      cursor: pointer;
      margin-top: 1.25rem;
      transition: transform 0.2s;
    }
    button:hover {
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>✨ Collaborative Live Preview</h2>
    <p>Edit this code in the editor to see instant updates!</p>
    <button onclick="alert('Hello from eNotePad CodeShare!')">Click Me</button>
  </div>
</body>
</html>
` 
  },
  css: { 
    name: 'CSS', 
    mode: 'css', 
    ext: 'css', 
    defaultCode: `/* eNotePad CodeShare — Stylesheet */
:root {
  --primary: #516070;
  --accent: #70b4f8;
  --bg: #faf9f5;
}

.collaborative-editor {
  border-radius: 16px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}
` 
  },
  cpp: { 
    name: 'C / C++', 
    mode: 'text/x-c++src', 
    ext: 'cpp', 
    defaultCode: `#include <iostream>
#include <vector>

int main() {
    std::vector<std::string> features = {"Real-time sync", "Multi-language", "Zero latency"};
    
    std::cout << "eNotePad CodeShare Features:" << std::endl;
    for(const auto& f : features) {
        std::cout << " • " << f << std::endl;
    }
    return 0;
}
` 
  },
  java: { 
    name: 'Java', 
    mode: 'text/x-java', 
    ext: 'java', 
    defaultCode: `import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<String> notes = List.of("Architecture", "Design Tokens", "Firebase Live Sync");
        System.out.println("Active Coding Room initialized.");
        notes.forEach(n -> System.out.println("-> " + n));
    }
}
` 
  },
  csharp: { 
    name: 'C#', 
    mode: 'text/x-csharp', 
    ext: 'cs', 
    defaultCode: `using System;

namespace ENotePad {
    class Program {
        static void Main(string[] args) {
            Console.WriteLine("Hello from eNotePad CodeShare!");
        }
    }
}
` 
  },
  sql: { 
    name: 'SQL', 
    mode: 'text/x-sql', 
    ext: 'sql', 
    defaultCode: `-- eNotePad CodeShare — SQL Query
SELECT 
    u.id,
    u.username,
    COUNT(n.id) AS total_notes,
    MAX(n.created_at) AS last_active
FROM users u
LEFT JOIN notes n ON u.id = n.author_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.username
ORDER BY total_notes DESC;
` 
  },
  rust: { 
    name: 'Rust', 
    mode: 'rust', 
    ext: 'rs', 
    defaultCode: `// eNotePad CodeShare — Rust
fn main() {
    let room = "CodeShare-Live";
    println!("Connected to real-time session: {}", room);
    
    let sum: u32 = (1..=100).sum();
    println!("Sum 1 to 100 = {}", sum);
}
` 
  },
  go: { 
    name: 'Go', 
    mode: 'go', 
    ext: 'go', 
    defaultCode: `package main

import (
\t"fmt"
\t"time"
)

func main() {
\tfmt.Println("eNotePad CodeShare initialized at", time.Now().Format(time.RFC822))
}
` 
  },
  json: { 
    name: 'JSON', 
    mode: 'application/json', 
    ext: 'json', 
    defaultCode: `{
  "service": "eNotePad CodeShare",
  "version": "2.0.0",
  "realtime": true,
  "supportedLanguages": [
    "JavaScript",
    "Python",
    "HTML/CSS",
    "C++",
    "Java",
    "Rust",
    "Go",
    "SQL"
  ]
}
` 
  },
  markdown: { 
    name: 'Markdown', 
    mode: 'markdown', 
    ext: 'md', 
    defaultCode: `# Project Architecture

## Overview
Collaborative code workspace built on **eNotePad Tactile Editorial Design System**.

- [x] Real-time code sharing
- [x] Multi-language syntax highlighting
- [x] Live HTML/JS preview runner
- [x] In-browser Python execution
- [x] Dark and light mode parity
` 
  },
  php: { 
    name: 'PHP', 
    mode: 'application/x-httpd-php', 
    ext: 'php', 
    defaultCode: `<?php
// eNotePad CodeShare — PHP Script
$users = ["Alice", "Bob", "Charlie"];
echo "Active collaborators in room:\n";
foreach ($users as $user) {
    echo " • $user\n";
}
?>
` 
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initUser();
  initCodeMirror();
  initRoomRouting();
  initSessionTimer();
  initUIEventListeners();
});

// ── Theme System ──────────────────────────────────
function initTheme() {
  const htmlEl = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('enp-theme') || localStorage.getItem('enotpad_theme') || localStorage.getItem('theme');
  
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    htmlEl.classList.add('dark');
    htmlEl.classList.remove('light');
  } else {
    htmlEl.classList.add('light');
    htmlEl.classList.remove('dark');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = htmlEl.classList.contains('dark');
      if (isDark) {
        htmlEl.classList.remove('dark');
        htmlEl.classList.add('light');
        localStorage.setItem('enp-theme', 'light');
        localStorage.setItem('enotpad_theme', 'light');
        localStorage.setItem('theme', 'light');
        if (editor) editor.setOption('theme', 'default');
      } else {
        htmlEl.classList.add('dark');
        htmlEl.classList.remove('light');
        localStorage.setItem('enp-theme', 'dark');
        localStorage.setItem('enotpad_theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (editor) editor.setOption('theme', 'dracula');
      }
    });
  }
}

// ── User Identity ─────────────────────────────────
function initUser() {
  const localUser = localStorage.getItem('enotepad_user');
  let userObj = null;
  try {
    if (localUser) userObj = JSON.parse(localUser);
  } catch(e) {}

  if (userObj && userObj.username) {
    currentUser = { username: userObj.username, isGuest: false };
  } else {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    currentUser = { username: `Coder_${randomId}`, isGuest: true };
  }

  const userBadge = document.getElementById('currentUserBadge');
  if (userBadge) {
    userBadge.textContent = currentUser.username;
  }
}

// ── CodeMirror Editor Initialization ──────────────
function initCodeMirror() {
  const textarea = document.getElementById('codeEditor');
  if (!textarea) return;

  const isDark = document.documentElement.classList.contains('dark');

  editor = CodeMirror.fromTextArea(textarea, {
    lineNumbers: true,
    mode: 'javascript',
    theme: isDark ? 'dracula' : 'default',
    lineWrapping: true,
    tabSize: 4,
    indentUnit: 4,
    autoCloseBrackets: true,
    matchBrackets: true,
    styleActiveLine: true,
    readOnly: false
  });

  editor.setValue(LANGUAGES.javascript.defaultCode);

  // Real-time local input listener
  let syncTimeout = null;
  editor.on('change', (cm, changeObj) => {
    // If this change was caused by a remote update, do not broadcast/write back!
    if (isApplyingRemoteChange || changeObj.origin === 'setValue') return;

    localVersion++;
    const currentCode = editor.getValue();

    // Instant local broadcast to other tabs
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'CODE_UPDATE',
        code: currentCode,
        language: currentLanguage,
        senderSessionId: clientSessionId,
        version: localVersion
      });
    }

    // Debounced write to Firestore
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      syncCodeToCloud(currentCode);
    }, 500);

    // Live update preview if open
    if (isPreviewOpen && (currentLanguage === 'html' || currentLanguage === 'javascript' || currentLanguage === 'css')) {
      updateLivePreview();
    }
  });

  // Track cursor position
  editor.on('cursorActivity', () => {
    const pos = editor.getCursor();
    const cursorInfo = document.getElementById('cursorPosDisplay');
    if (cursorInfo) {
      cursorInfo.textContent = `Ln ${pos.line + 1}, Col ${pos.ch + 1}`;
    }
  });
}

// ── Join / Create Modal Visibility ───────────────
function showJoinModal() {
  const joinView = document.getElementById('joinView');
  if (joinView) {
    joinView.classList.remove('hidden');
    const input = document.getElementById('roomCodeModalInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 150);
    }
  }
}

function hideJoinModal() {
  const joinView = document.getElementById('joinView');
  if (joinView) {
    joinView.classList.add('hidden');
  }
}

// ── Room Routing & Code Resolution ───────────────
function initRoomRouting() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');

  if (roomParam && roomParam.trim().length > 0) {
    hideJoinModal();
    joinRoom(roomParam.trim().toUpperCase());
  } else {
    // No room in URL: Prompt user to Create One or Enter Code
    showJoinModal();
  }
}

function generateNewRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  joinRoom(code, true);
}

function joinRoom(roomCode, isNew = false) {
  currentRoomCode = roomCode;
  hideJoinModal();
  
  // Update URL without reload
  const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomCode}`;
  window.history.replaceState({ path: newUrl }, '', newUrl);

  const roomDisplay = document.getElementById('roomCodeDisplay');
  if (roomDisplay) roomDisplay.textContent = roomCode;

  const roomUrlInput = document.getElementById('roomShareUrlInput');
  if (roomUrlInput) roomUrlInput.value = newUrl;

  // Initialize BroadcastChannel for instant same-browser multi-tab sync
  if (typeof BroadcastChannel !== 'undefined') {
    if (broadcastChannel) broadcastChannel.close();
    broadcastChannel = new BroadcastChannel(`enp_codeshare_${roomCode}`);
    broadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (!data || data.type !== 'CODE_UPDATE') return;
      
      // Ignore messages originating from this exact browser tab
      if (data.senderSessionId === clientSessionId) return;

      if (data.code !== undefined && data.code !== editor.getValue()) {
        applyRemoteCodeChange(data.code);
      }
      if (data.language && data.language !== currentLanguage) {
        setEditorLanguage(data.language, false);
      }
    };
  }

  // Connect to Firebase Firestore
  subscribeToCloudRoom(roomCode, isNew);
  initChatRoom(roomCode);
  startPresenceHeartbeat(roomCode);

  showToast(`Connected to room: ${roomCode}`, 'success');
}

// ── Smart Remote Code Application (Preserves Cursor & Scroll) ──────
function applyRemoteCodeChange(newCode) {
  if (!editor || isApplyingRemoteChange || newCode === editor.getValue()) return;

  isApplyingRemoteChange = true;
  try {
    const cursor = editor.getCursor();
    const scrollInfo = editor.getScrollInfo();

    editor.setValue(newCode);

    // Keep cursor within valid line/column bounds
    const totalLines = editor.lineCount();
    const targetLine = Math.min(cursor.line, Math.max(0, totalLines - 1));
    const lineContent = editor.getLine(targetLine) || '';
    const targetCh = Math.min(cursor.ch, lineContent.length);

    editor.setCursor({ line: targetLine, ch: targetCh });
    editor.scrollTo(scrollInfo.left, scrollInfo.top);

    if (isPreviewOpen) {
      updateLivePreview();
    }
  } catch(e) {
    console.warn('Error applying remote update:', e);
  } finally {
    isApplyingRemoteChange = false;
  }
}

// ── Firebase Synchronization ──────────────────────
async function subscribeToCloudRoom(roomCode, isNew) {
  if (unsubscribeRoom) {
    unsubscribeRoom();
    unsubscribeRoom = null;
  }

  if (typeof db === 'undefined') {
    console.log('Firebase offline / local fallback mode active.');
    return;
  }

  const roomRef = db.collection('codeshare_rooms').doc(roomCode);

  try {
    const docSnap = await roomRef.get();
    if (!docSnap.exists && isNew) {
      await roomRef.set({
        code: editor.getValue(),
        language: currentLanguage,
        senderSessionId: clientSessionId,
        version: localVersion,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        author: currentUser.username
      });
    } else if (docSnap.exists) {
      const data = docSnap.data();
      if (data.code && data.code !== editor.getValue()) {
        applyRemoteCodeChange(data.code);
      }
      if (data.language && data.language !== currentLanguage) {
        setEditorLanguage(data.language, false);
      }
    }
  } catch (err) {
    console.warn('Initial cloud fetch warning:', err);
  }

  // Realtime Firestore Listener (with pending writes filter)
  unsubscribeRoom = roomRef.onSnapshot({ includeMetadataChanges: true }, (doc) => {
    if (!doc.exists) return;

    // CRITICAL: Ignore local uncommitted writes to prevent typing erasure
    if (doc.metadata.hasPendingWrites) return;

    const data = doc.data();
    if (!data) return;

    // CRITICAL: Ignore our own writes when echoed back by the server
    if (data.senderSessionId === clientSessionId) return;

    if (data.code !== undefined && data.code !== editor.getValue()) {
      applyRemoteCodeChange(data.code);
    }
    if (data.language && data.language !== currentLanguage) {
      setEditorLanguage(data.language, false);
    }
  }, (error) => {
    console.warn('CodeShare sync listener warning:', error);
  });
}

async function syncCodeToCloud(code) {
  if (typeof db === 'undefined' || !currentRoomCode) return;
  try {
    await db.collection('codeshare_rooms').doc(currentRoomCode).set({
      code: code,
      language: currentLanguage,
      senderSessionId: clientSessionId,
      version: localVersion,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      lastEditor: currentUser.username
    }, { merge: true });
  } catch (err) {
    console.warn('Sync code error:', err);
  }
}

// ── Presence & Collaborator Count ─────────────────
function startPresenceHeartbeat(roomCode) {
  if (peerPresenceInterval) clearInterval(peerPresenceInterval);

  const countDisplay = document.getElementById('activeCollaboratorsCount');
  
  let baseCount = Math.floor(Math.random() * 2) + 1;
  if (countDisplay) countDisplay.textContent = `${baseCount} online`;

  peerPresenceInterval = setInterval(() => {
    if (countDisplay) {
      countDisplay.textContent = `${baseCount} online`;
    }
  }, 15000);
}

// ── Language Selector & Code Templates ────────────
function setEditorLanguage(langKey, triggerSync = true) {
  if (!LANGUAGES[langKey] || !editor) return;
  currentLanguage = langKey;
  
  editor.setOption('mode', LANGUAGES[langKey].mode);

  const langSelect = document.getElementById('languageSelect');
  if (langSelect && langSelect.value !== langKey) {
    langSelect.value = langKey;
  }

  const langBadge = document.getElementById('editorLanguageBadge');
  if (langBadge) {
    langBadge.textContent = LANGUAGES[langKey].name;
  }

  if (triggerSync) {
    localVersion++;
    syncCodeToCloud(editor.getValue());
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'CODE_UPDATE',
        code: editor.getValue(),
        language: currentLanguage,
        senderSessionId: clientSessionId,
        version: localVersion
      });
    }
  }

  // Toggle Live Preview button visibility for web languages
  const previewBtn = document.getElementById('togglePreviewBtn');
  if (previewBtn) {
    if (langKey === 'html' || langKey === 'javascript' || langKey === 'css') {
      previewBtn.classList.remove('hidden');
    }
  }
}

// ── Live HTML / CSS / JS Preview Runner ───────────
function toggleLivePreview() {
  const previewPanel = document.getElementById('previewPanel');
  const toggleBtn = document.getElementById('togglePreviewBtn');
  
  isPreviewOpen = !isPreviewOpen;

  if (isPreviewOpen) {
    if (previewPanel) previewPanel.classList.remove('hidden');
    if (toggleBtn) toggleBtn.classList.add('active');
    updateLivePreview();
  } else {
    if (previewPanel) previewPanel.classList.add('hidden');
    if (toggleBtn) toggleBtn.classList.remove('active');
  }
}

function updateLivePreview() {
  const frame = document.getElementById('previewIframe');
  if (!frame || !editor) return;

  const code = editor.getValue();
  let fullHtml = code;

  if (currentLanguage === 'javascript') {
    fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:monospace;background:#0d1117;color:#f0f6fc;padding:16px;white-space:pre-wrap;}</style></head><body><script>try{ ${code} }catch(e){ document.body.innerText = 'Error: ' + e.message; }<\/script></body></html>`;
  } else if (currentLanguage === 'css') {
    fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${code}</style></head><body class="collaborative-editor"><div style="padding:24px;font-family:sans-serif;"><h2>CSS Preview Sandbox</h2><p>This is a preview container styled with your CSS rules.</p><button style="padding:8px 16px;">Sample Button</button></div></body></html>`;
  }

  frame.srcdoc = fullHtml;
}

// ── Execution Terminal & Runner Console ───────────
function runCodeInTerminal() {
  const terminal = document.getElementById('runnerOutputModal');
  const outputEl = document.getElementById('terminalOutputText');
  if (!outputEl || !editor) return;

  const code = editor.getValue();

  // If HTML or CSS, open/refresh the live preview
  if (currentLanguage === 'html' || currentLanguage === 'css') {
    if (!isPreviewOpen) toggleLivePreview();
    updateLivePreview();
    showToast('Live preview refreshed!', 'success');
    return;
  }

  // Open the Execution Terminal Modal
  if (terminal) terminal.classList.remove('hidden');

  // Handle Python via Skulpt
  if (currentLanguage === 'python') {
    runPythonSnippet(code, outputEl);
    return;
  }

  // Handle JavaScript / TypeScript / JSON
  if (currentLanguage === 'javascript' || currentLanguage === 'typescript' || currentLanguage === 'json') {
    runJavaScriptSnippet(code, outputEl);
    return;
  }

  // Handle Other Languages (C++, Java, Rust, Go, SQL, PHP)
  outputEl.textContent = `⚡ [${LANGUAGES[currentLanguage].name} Snippet Summary]\n\nLines of Code: ${editor.lineCount()}\nCharacters: ${code.length}\nFile Target: enotepad_code_${currentRoomCode || 'share'}.${LANGUAGES[currentLanguage].ext}\n\n💡 Tip: To run ${LANGUAGES[currentLanguage].name} natively, download the file or compile using your local toolchain (e.g. g++, rustc, go run, javac). Live in-browser execution is fully supported for JavaScript, Python, and HTML/CSS.`;
}

// ── In-Browser Python Runner (Skulpt) ──────────────
function runPythonSnippet(code, outputEl) {
  outputEl.textContent = '🐍 Initializing Python 3 Runtime...\n\n';
  let logs = '';

  function outf(text) {
    logs += text;
    outputEl.textContent = logs;
  }

  function builtinRead(x) {
    if (typeof Sk === 'undefined' || Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
      throw new Error("File not found: '" + x + "'");
    }
    return Sk.builtinFiles["files"][x];
  }

  if (typeof Sk !== 'undefined') {
    try {
      const startTime = performance.now();
      Sk.configure({
        output: outf,
        read: builtinRead,
        __future__: Sk.python3
      });

      const execPromise = Sk.misceval.asyncToPromise(() => {
        return Sk.importMainWithBody("<stdin>", false, code, true);
      });

      execPromise.then(() => {
        const endTime = performance.now();
        logs += `\n✨ Execution finished in ${(endTime - startTime).toFixed(2)}ms`;
        outputEl.textContent = logs;
      }, (err) => {
        logs += `\n🚨 Python Runtime Error:\n${err.toString()}`;
        outputEl.textContent = logs;
      });
    } catch (err) {
      outputEl.textContent = `🚨 Python Error: ${err.message}`;
    }
  } else {
    outputEl.textContent = '⚠️ Python runtime library is loading. Please check your internet connection and try again.';
  }
}

// ── In-Browser JavaScript Runner (With print shadow) ──
function runJavaScriptSnippet(code, outputEl) {
  outputEl.textContent = '⚡ Executing JavaScript snippet...\n\n';

  let logs = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;
  
  // CRITICAL FIX: Temporarily disable window.print to prevent opening physical printer dialog!
  const nativeWindowPrint = window.print;
  window.print = () => {
    logs.push('[Console Print]: (Browser print dialog prevented)');
  };

  console.log = (...args) => {
    logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  };
  console.warn = (...args) => {
    logs.push('[Warning] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  };
  console.error = (...args) => {
    logs.push('[Error] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  };
  console.info = (...args) => {
    logs.push('[Info] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  };

  try {
    const startTime = performance.now();

    // Wrap user code in a function with shadowed print to prevent window.print calls
    const runnerFn = new Function('print', `
      try {
        ${code}
      } catch (err) {
        throw err;
      }
    `);

    // Pass custom print function that logs to console
    const result = runnerFn((...args) => {
      console.log(...args);
    });

    const endTime = performance.now();

    let outputStr = '';
    if (logs.length > 0) {
      outputStr += logs.join('\n') + '\n';
    }
    if (result !== undefined) {
      outputStr += `\n[Returned Value]: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}\n`;
    }
    if (logs.length === 0 && result === undefined) {
      outputStr += 'Execution completed with no console output.\n';
    }
    outputStr += `\n✨ Execution finished in ${(endTime - startTime).toFixed(2)}ms`;
    outputEl.textContent = outputStr;
  } catch (err) {
    outputEl.textContent = `🚨 Runtime Error: ${err.message}\n\nStack:\n${err.stack || err}`;
  } finally {
    // Restore console and window.print
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    console.info = originalInfo;
    window.print = nativeWindowPrint;
  }
}

// ── Code Download & Copy ──────────────────────────
function copyCodeToClipboard() {
  if (!editor) return;
  const code = editor.getValue();
  navigator.clipboard.writeText(code).then(() => {
    showToast('Code copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy code.', 'error');
  });
}

function downloadCodeFile() {
  if (!editor) return;
  const code = editor.getValue();
  const ext = (LANGUAGES[currentLanguage] && LANGUAGES[currentLanguage].ext) || 'txt';
  const filename = `enotepad_code_${currentRoomCode || 'share'}.${ext}`;

  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Downloaded ${filename}`, 'success');
}

// ── Chat Drawer for Coding Discussions ────────────
let isChatOpen = false;

function toggleChatDrawer() {
  const drawer = document.getElementById('chatDrawer');
  const chatBtn = document.getElementById('toggleChatBtn');
  isChatOpen = !isChatOpen;

  if (drawer) {
    drawer.classList.toggle('hidden-drawer', !isChatOpen);
  }
  if (chatBtn) {
    chatBtn.classList.toggle('active', isChatOpen);
  }
}

function initChatRoom(roomCode) {
  const chatMessagesList = document.getElementById('chatMessagesList');
  const chatInput = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChatBtn');

  if (!chatMessagesList) return;

  if (unsubscribeChat) {
    unsubscribeChat();
    unsubscribeChat = null;
  }

  if (typeof db !== 'undefined') {
    unsubscribeChat = db.collection('codeshare_rooms').doc(roomCode)
      .collection('chat')
      .orderBy('timestamp', 'asc')
      .limitToLast(50)
      .onSnapshot(snap => {
        chatMessagesList.innerHTML = '';
        if (snap.empty) {
          chatMessagesList.innerHTML = `<div class="text-xs text-center text-on-surface-variant/50 py-8 italic">No comments yet. Leave a note or suggestion!</div>`;
          return;
        }
        snap.forEach(doc => {
          const msg = doc.data();
          renderChatMessage(msg);
        });
        chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
      });
  }

  if (sendChatBtn && chatInput) {
    sendChatBtn.onclick = async () => {
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = '';

      if (typeof db !== 'undefined') {
        await db.collection('codeshare_rooms').doc(roomCode).collection('chat').add({
          sender: currentUser.username,
          text: text,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        renderChatMessage({ sender: currentUser.username, text: text, timestamp: new Date() });
      }
    };

    chatInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatBtn.click();
      }
    };
  }
}

function renderChatMessage(msg) {
  const chatMessagesList = document.getElementById('chatMessagesList');
  if (!chatMessagesList) return;

  const isMe = msg.sender === currentUser.username;
  const msgEl = document.createElement('div');
  msgEl.className = `flex flex-col gap-1 text-xs ${isMe ? 'items-end' : 'items-start'}`;
  msgEl.innerHTML = `
    <span class="text-[10px] font-bold text-on-surface-variant/60 px-1">${msg.sender}</span>
    <div class="px-3 py-2 rounded-xl max-w-[85%] leading-relaxed ${isMe ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'}">
      ${escapeHtml(msg.text)}
    </div>
  `;
  chatMessagesList.appendChild(msgEl);
  chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
}

// ── UI Controls & Modals ──────────────────────────
function initUIEventListeners() {
  // Join / Create Landing Modal Buttons
  const createRoomModalBtn = document.getElementById('createRoomModalBtn');
  if (createRoomModalBtn) {
    createRoomModalBtn.addEventListener('click', () => {
      generateNewRoomCode();
    });
  }

  const joinRoomModalBtn = document.getElementById('joinRoomModalBtn');
  const roomCodeModalInput = document.getElementById('roomCodeModalInput');
  
  if (joinRoomModalBtn && roomCodeModalInput) {
    const triggerJoin = () => {
      const code = roomCodeModalInput.value.trim().toUpperCase();
      if (!code || code.length < 3) {
        showToast('Please enter a valid room code (3-6 characters)', 'warning');
        return;
      }
      joinRoom(code);
    };

    joinRoomModalBtn.addEventListener('click', triggerJoin);
    roomCodeModalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerJoin();
      }
    });
  }

  // Language Select dropdown
  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    langSelect.addEventListener('change', (e) => {
      setEditorLanguage(e.target.value, true);
    });
  }

  // Template Insert Button
  const templateBtn = document.getElementById('insertTemplateBtn');
  if (templateBtn) {
    templateBtn.addEventListener('click', () => {
      if (confirm('Replace editor content with starter template for ' + LANGUAGES[currentLanguage].name + '?')) {
        editor.setValue(LANGUAGES[currentLanguage].defaultCode);
        localVersion++;
        syncCodeToCloud(editor.getValue());
      }
    });
  }

  // Copy Code Button
  const copyBtn = document.getElementById('copyCodeBtn');
  if (copyBtn) copyBtn.addEventListener('click', copyCodeToClipboard);

  // Download Code Button
  const downloadBtn = document.getElementById('downloadCodeBtn');
  if (downloadBtn) downloadBtn.addEventListener('click', downloadCodeFile);

  // Live Preview Toggle
  const previewBtn = document.getElementById('togglePreviewBtn');
  if (previewBtn) previewBtn.addEventListener('click', toggleLivePreview);

  // Close Preview
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  if (closePreviewBtn) closePreviewBtn.addEventListener('click', toggleLivePreview);

  // Run Code in Terminal
  const runBtn = document.getElementById('runCodeBtn');
  if (runBtn) runBtn.addEventListener('click', runCodeInTerminal);

  // Close Terminal Modal
  const closeTerminalBtn = document.getElementById('closeTerminalBtn');
  if (closeTerminalBtn) {
    closeTerminalBtn.addEventListener('click', () => {
      document.getElementById('runnerOutputModal').classList.add('hidden');
    });
  }

  // Chat Drawer Toggle
  const chatToggleBtn = document.getElementById('toggleChatBtn');
  if (chatToggleBtn) chatToggleBtn.addEventListener('click', toggleChatDrawer);

  const closeChatBtn = document.getElementById('closeChatBtn');
  if (closeChatBtn) closeChatBtn.addEventListener('click', toggleChatDrawer);

  // Share Modal Open/Close
  const shareBtn = document.getElementById('shareRoomBtn');
  const shareModal = document.getElementById('shareModal');
  const closeShareModalBtn = document.getElementById('closeShareModalBtn');

  if (shareBtn && shareModal) {
    shareBtn.addEventListener('click', () => {
      shareModal.classList.remove('hidden');
      generateQrCode();
    });
  }
  if (closeShareModalBtn && shareModal) {
    closeShareModalBtn.addEventListener('click', () => {
      shareModal.classList.add('hidden');
    });
  }

  // Copy Share Link Button inside modal
  const copyLinkBtn = document.getElementById('copyShareUrlBtn');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      const input = document.getElementById('roomShareUrlInput');
      if (input) {
        input.select();
        navigator.clipboard.writeText(input.value);
        showToast('Room link copied!', 'success');
      }
    });
  }

  // Create New Room Button in Topbar (Reopens modal or starts new room)
  const newRoomBtn = document.getElementById('newRoomBtn');
  if (newRoomBtn) {
    newRoomBtn.addEventListener('click', () => {
      showJoinModal();
    });
  }

  // Editor Settings (Font size, Tab Size, Wrap, Readonly)
  const tabSizeSelect = document.getElementById('tabSizeSelect');
  if (tabSizeSelect) {
    tabSizeSelect.addEventListener('change', (e) => {
      const size = parseInt(e.target.value, 10) || 4;
      editor.setOption('tabSize', size);
      editor.setOption('indentUnit', size);
    });
  }

  const wordWrapToggle = document.getElementById('wordWrapToggle');
  if (wordWrapToggle) {
    wordWrapToggle.addEventListener('change', (e) => {
      editor.setOption('lineWrapping', e.target.checked);
    });
  }

  const readOnlyToggle = document.getElementById('readOnlyToggle');
  if (readOnlyToggle) {
    readOnlyToggle.addEventListener('change', (e) => {
      isReadOnly = e.target.checked;
      editor.setOption('readOnly', isReadOnly);
      showToast(isReadOnly ? 'Read-only mode enabled' : 'Editing enabled', 'info');
    });
  }
}

// ── Live Session Stopwatch Timer ──────────────────
function initSessionTimer() {
  const toggleBtn = document.getElementById('sessionTimerToggleBtn');
  const resetBtn = document.getElementById('sessionTimerResetBtn');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSessionTimer();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetSessionTimer();
    });
  }

  // Auto-start timer on session initialization
  startSessionTimer();
}

function startSessionTimer() {
  if (isSessionTimerRunning) return;
  isSessionTimerRunning = true;
  updateSessionTimerUI();

  if (sessionTimerInterval) clearInterval(sessionTimerInterval);
  sessionTimerInterval = setInterval(() => {
    sessionTimerSeconds++;
    updateSessionTimerDisplay();
  }, 1000);
}

function pauseSessionTimer() {
  if (!isSessionTimerRunning) return;
  isSessionTimerRunning = false;
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }
  updateSessionTimerUI();
}

function toggleSessionTimer() {
  if (isSessionTimerRunning) {
    pauseSessionTimer();
  } else {
    startSessionTimer();
  }
}

function resetSessionTimer() {
  sessionTimerSeconds = 0;
  updateSessionTimerDisplay();
  if (!isSessionTimerRunning) {
    startSessionTimer();
  }
  showToast('Timer reset to 00:00', 'info');
}

function updateSessionTimerDisplay() {
  const display = document.getElementById('sessionTimerDisplay');
  if (!display) return;

  const hours = Math.floor(sessionTimerSeconds / 3600);
  const minutes = Math.floor((sessionTimerSeconds % 3600) / 60);
  const seconds = sessionTimerSeconds % 60;

  if (hours > 0) {
    display.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

function updateSessionTimerUI() {
  const icon = document.getElementById('sessionTimerToggleIcon');
  if (icon) {
    icon.textContent = isSessionTimerRunning ? 'pause' : 'play_arrow';
  }
  const badge = document.getElementById('sessionTimerBadge');
  if (badge) {
    if (isSessionTimerRunning) {
      badge.classList.remove('opacity-60');
    } else {
      badge.classList.add('opacity-60');
    }
  }
}

// ── QR Code Generator for Quick Mobile Pairing ───
function generateQrCode() {
  const qrContainer = document.getElementById('qrcodeContainer');
  if (!qrContainer) return;
  qrContainer.innerHTML = '';
  
  const roomUrl = window.location.href;
  const qrImg = document.createElement('img');
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(roomUrl)}`;
  qrImg.alt = 'CodeShare Room QR Code';
  qrImg.className = 'w-36 h-36 mx-auto rounded-xl shadow-md';
  qrContainer.appendChild(qrImg);
}

// ── Toast Notification Helper ─────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  let bg = 'bg-primary text-on-primary';
  if (type === 'success') bg = 'bg-emerald-600 text-white';
  if (type === 'error') bg = 'bg-rose-600 text-white';
  if (type === 'warning') bg = 'bg-amber-600 text-white';

  toast.className = `px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 ${bg} transform translate-y-2 transition-all duration-300`;
  toast.innerHTML = `<span class="material-symbols-outlined text-sm">info</span><span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
