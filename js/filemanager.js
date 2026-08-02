// ============================================================
// File Manager Module — eNotePad
// Hierarchical file/folder system backed by Firestore.
// Sub-collections: users/{username}/files & users/{username}/folders
// ============================================================

function initFileManager() {
  // ─── State ───────────────────────────────────────────────────────────
  let currentUser = null;
  let currentFolderId = null;
  let allFolders = [];
  let allFiles = [];
  let selectedItem = null;
  let clipboard = null;
  let sortField = 'name';
  let sortAsc = true;
  let searchQuery = '';
  let viewMode = 'grid';
  let foldersUnsub = null;
  let filesUnsub = null;
  let openFileId = null;

  // ─── DOM refs ────────────────────────────────────────────────────────
  const fmTree = document.getElementById('fmTree');
  const fmGrid = document.getElementById('fmGrid');
  const fmBreadcrumb = document.getElementById('fmBreadcrumb');
  const fmSearchInput = document.getElementById('fmSearchInput');
  const fmSortBtn = document.getElementById('fmSortBtn');
  const fmViewToggle = document.getElementById('fmViewToggle');
  const fmNewFileBtn = document.getElementById('fmNewFileBtn');
  const fmNewFolderBtn = document.getElementById('fmNewFolderBtn');
  const fmImportBtn = document.getElementById('fmImportBtn');
  const fmImportInput = document.getElementById('fmImportInput');
  const fmEditorPane = document.getElementById('fmEditorPane');
  const fmEditorTitle = document.getElementById('fmEditorTitle');
  const fmEditorContent = document.getElementById('fmEditorContent');
  const fmEditorSaveBtn = document.getElementById('fmEditorSaveBtn');
  const fmEditorCloseBtn = document.getElementById('fmEditorCloseBtn');
  const contextMenu = document.getElementById('fmContextMenu');

  // Bail out if essential DOM not found
  if (!fmGrid) {
    console.warn('FileManager: #fmGrid not found, skipping init');
    return;
  }

  // ─── Expose refresh function ──────────────────────────────────────────
  window.fileManagerRefresh = function(username) {
    if (username) {
      currentUser = username;
      startListeners();
    } else {
      stopListeners();
      currentUser = null;
      allFolders = [];
      allFiles = [];
      renderAll();
    }
  };

  // ─── Expose folder list for external use (e.g. Save to Folder modal) ─
  window.getFolderList = function() {
    return allFolders.slice(); // shallow copy
  };

  // ─── Expose save-to-file-manager for share.js ─────────────────────────
  window.saveNoteToFileManager = async function(noteData, folderId) {
    if (!currentUser || !window.db) return false;
    try {
      await db.collection('users').doc(currentUser).collection('files').add({
        name: noteData.title || 'Untitled Note',
        type: noteData.noteType || 'note',
        content: noteData.content || '',
        folderId: folderId || null,
        isPinned: false,
        category: noteData.category || '',
        tags: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch(e) {
      console.error('saveNoteToFileManager error:', e);
      return false;
    }
  };



  // ─── Auth integration: driven entirely by fileManagerRefresh() ──────────
  // getCurrentUser() is NOT a global function — we rely on auth.js calling
  // window.fileManagerRefresh(username) after sign-in / sign-out.

  // ─── Firestore Listeners ─────────────────────────────────────────────
  function startListeners() {
    stopListeners();
    if (!currentUser || !window.db) return;

    // Use simple get + snapshot without orderBy to avoid index issues on empty collections
    foldersUnsub = db.collection('users').doc(currentUser).collection('folders')
      .onSnapshot(snap => {
        allFolders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderAll();
      }, e => {
        console.warn('FM folders listener error:', e.message);
        // Fallback: try without any constraints
      });

    filesUnsub = db.collection('users').doc(currentUser).collection('files')
      .onSnapshot(snap => {
        allFiles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderAll();
      }, e => {
        console.warn('FM files listener error:', e.message);
      });
  }

  function stopListeners() {
    if (foldersUnsub) { try { foldersUnsub(); } catch(e){} foldersUnsub = null; }
    if (filesUnsub) { try { filesUnsub(); } catch(e){} filesUnsub = null; }
  }

  // ─── Render Orchestration ─────────────────────────────────────────────
  function renderAll() {
    renderTree();
    renderGrid();
    renderBreadcrumb();
  }

  // ─── Breadcrumb ───────────────────────────────────────────────────────
  function renderBreadcrumb() {
    if (!fmBreadcrumb) return;
    fmBreadcrumb.innerHTML = '';

    const rootCrumb = document.createElement('button');
    rootCrumb.className = 'fm-crumb' + (currentFolderId === null ? ' active' : '');
    rootCrumb.dataset.fid = '';
    rootCrumb.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;vertical-align:-2px">home</span> My Files';
    rootCrumb.addEventListener('click', () => navigateTo(null));
    fmBreadcrumb.appendChild(rootCrumb);

    const crumbs = buildCrumbPath(currentFolderId);
    crumbs.forEach(folder => {
      const sep = document.createElement('span');
      sep.className = 'fm-crumb-sep';
      sep.textContent = '›';
      fmBreadcrumb.appendChild(sep);

      const crumb = document.createElement('button');
      crumb.className = 'fm-crumb' + (folder.id === currentFolderId ? ' active' : '');
      crumb.dataset.fid = folder.id;
      crumb.textContent = folder.name;
      crumb.addEventListener('click', () => navigateTo(folder.id));
      fmBreadcrumb.appendChild(crumb);
    });
  }

  function buildCrumbPath(folderId) {
    const path = [];
    let current = folderId;
    const seen = new Set();
    while (current && !seen.has(current)) {
      seen.add(current);
      const folder = allFolders.find(f => f.id === current);
      if (!folder) break;
      path.unshift(folder);
      current = folder.parentId || null;
    }
    return path;
  }

  // ─── Tree Sidebar ─────────────────────────────────────────────────────
  function renderTree() {
    if (!fmTree) return;
    fmTree.innerHTML = '';
    renderTreeLevel(null, fmTree, 0);
  }

  function renderTreeLevel(parentId, container, depth) {
    const folders = allFolders.filter(f => (f.parentId || null) === parentId);
    folders.forEach(folder => {
      const item = document.createElement('div');
      item.className = 'fm-tree-item' + (currentFolderId === folder.id ? ' active' : '');
      item.style.paddingLeft = (10 + depth * 14) + 'px';
      item.draggable = true;
      item.dataset.id = folder.id;
      item.dataset.type = 'folder';

      const hasChildren = allFolders.some(f => f.parentId === folder.id);
      item.innerHTML = `
        <span class="fm-tree-toggle material-symbols-outlined" style="${hasChildren ? '' : 'visibility:hidden'}">chevron_right</span>
        <span class="material-symbols-outlined fm-tree-folder-icon">folder</span>
        <span class="fm-tree-label">${escHtml(folder.name)}</span>
      `;

      const subContainer = document.createElement('div');
      subContainer.className = 'fm-tree-children';
      renderTreeLevel(folder.id, subContainer, depth + 1);

      // ── Chevron expand / collapse ──
      const toggle = item.querySelector('.fm-tree-toggle');
      if (toggle && hasChildren) {
        let expanded = true; // start expanded
        toggle.style.transition = 'transform 0.2s ease';
        toggle.addEventListener('click', e => {
          e.stopPropagation();
          expanded = !expanded;
          toggle.style.transform = expanded ? 'rotate(90deg)' : 'rotate(0deg)';
          subContainer.style.display = expanded ? '' : 'none';
        });
        // Start with chevron indicating expanded
        toggle.style.transform = 'rotate(90deg)';
      }

      item.addEventListener('click', e => { e.stopPropagation(); navigateTo(folder.id); });
      item.addEventListener('contextmenu', e => showContextMenu(e, folder.id, 'folder'));
      setupDragEvents(item, folder.id, 'folder');
      setupDropTarget(item, folder.id);
      container.appendChild(item);
      container.appendChild(subContainer);
    });
  }

  // ─── Grid / List View ─────────────────────────────────────────────────
  function renderGrid() {
    if (!fmGrid) return;
    fmGrid.className = viewMode === 'grid' ? 'fm-grid' : 'fm-list';
    fmGrid.innerHTML = '';

    // Show login prompt if no user is signed in
    if (!currentUser) {
      fmGrid.innerHTML = `
        <div class="fm-empty fm-login-prompt">
          <span class="material-symbols-outlined">lock_person</span>
          <p>Please log in to access My Files.</p>
          <p class="fm-empty-hint">Your personal file manager is available after signing in to your account.</p>
        </div>`;
      return;
    }

    let folders = allFolders.filter(f => (f.parentId || null) === currentFolderId);
    let files = allFiles.filter(f => (f.folderId || null) === currentFolderId);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      folders = folders.filter(f => f.name.toLowerCase().includes(q));
      files = files.filter(f => f.name.toLowerCase().includes(q) || ((f.content || '').replace(/<[^>]*>/g, '').toLowerCase().includes(q)));
    }

    const sortFn = (a, b) => {
      let va, vb;
      if (sortField === 'name') {
        va = (a.name || '').toLowerCase();
        vb = (b.name || '').toLowerCase();
      } else if (sortField === 'date') {
        va = a.createdAt?.seconds || 0;
        vb = b.createdAt?.seconds || 0;
      } else {
        va = a.type || 'folder';
        vb = b.type || 'folder';
      }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    };

    folders.sort(sortFn);
    const pinned = files.filter(f => f.isPinned).sort(sortFn);
    const unpinned = files.filter(f => !f.isPinned).sort(sortFn);
    files = [...pinned, ...unpinned];

    if (folders.length === 0 && files.length === 0) {
      fmGrid.innerHTML = `
        <div class="fm-empty">
          <span class="material-symbols-outlined">folder_open</span>
          <p>${searchQuery ? 'No results found.' : 'This folder is empty.'}</p>
          ${!searchQuery ? '<p class="fm-empty-hint">Use the toolbar or right-click to create files and folders.</p>' : ''}
        </div>`;
      return;
    }

    folders.forEach(folder => fmGrid.appendChild(createFolderCard(folder)));
    files.forEach(file => fmGrid.appendChild(createFileCard(file)));
  }

  function createFolderCard(folder) {
    const card = document.createElement('div');
    card.className = 'fm-folder-card fm-card' + (selectedItem?.id === folder.id ? ' selected' : '');
    card.draggable = true;
    card.dataset.id = folder.id;
    card.dataset.type = 'folder';

    const childCount = countChildren(folder.id);
    card.innerHTML = `
      <div class="fm-card-icon">
        <span class="material-symbols-outlined">folder</span>
      </div>
      <div class="fm-card-meta">
        <span class="fm-card-name" title="${escHtml(folder.name)}">${escHtml(folder.name)}</span>
        <span class="fm-card-info">${childCount}</span>
      </div>
      <button class="fm-card-menu" title="Options" type="button">
        <span class="material-symbols-outlined">more_vert</span>
      </button>`;

    card.querySelector('.fm-card-menu').addEventListener('click', e => { e.stopPropagation(); showContextMenu(e, folder.id, 'folder'); });
    card.addEventListener('click', e => { e.stopPropagation(); selectItem(folder.id, 'folder'); });
    card.addEventListener('dblclick', () => navigateTo(folder.id));
    card.addEventListener('contextmenu', e => showContextMenu(e, folder.id, 'folder'));
    setupDragEvents(card, folder.id, 'folder');
    setupDropTarget(card, folder.id);
    return card;
  }

  function createFileCard(file) {
    const card = document.createElement('div');
    card.className = 'fm-file-card fm-card' + (selectedItem?.id === file.id ? ' selected' : '') + (file.isPinned ? ' pinned' : '');
    card.draggable = true;
    card.dataset.id = file.id;
    card.dataset.type = 'file';

    const typeIcons = { note: 'edit_note', link: 'link', image: 'image' };
    const typeColors = { note: '#516070', link: '#1565c0', image: '#ad1457' };
    const icon = typeIcons[file.type] || 'description';
    const iconColor = typeColors[file.type] || '#516070';

    // Safe timestamp formatting
    let dateStr = '';
    try {
      const ts = file.updatedAt || file.createdAt;
      if (ts && typeof formatTimestamp === 'function') dateStr = formatTimestamp(ts);
    } catch(e) {}

    const rawPreview = (file.content || '').replace(/<[^>]*>/g, '');
    const preview = rawPreview.substring(0, 70) || '(empty)';

    card.innerHTML = `
      <div class="fm-card-icon" style="color:${iconColor}">
        <span class="material-symbols-outlined">${icon}</span>
        ${file.isPinned ? '<span class="fm-pin-badge material-symbols-outlined">push_pin</span>' : ''}
      </div>
      <div class="fm-card-meta">
        <span class="fm-card-name" title="${escHtml(file.name)}">${escHtml(file.name)}</span>
        <span class="fm-card-preview">${escHtml(preview)}</span>
        <div class="fm-card-footer">
          <span class="fm-type-badge ${file.type || 'note'}">${file.type || 'note'}</span>
          <span class="fm-card-info">${dateStr}</span>
        </div>
      </div>
      <button class="fm-card-menu" title="Options" type="button">
        <span class="material-symbols-outlined">more_vert</span>
      </button>`;

    card.querySelector('.fm-card-menu').addEventListener('click', e => { e.stopPropagation(); showContextMenu(e, file.id, 'file'); });
    card.addEventListener('click', e => { e.stopPropagation(); selectItem(file.id, 'file'); });
    card.addEventListener('dblclick', () => openFile(file.id));
    card.addEventListener('contextmenu', e => showContextMenu(e, file.id, 'file'));
    setupDragEvents(card, file.id, 'file');
    return card;
  }

  function countChildren(folderId) {
    const sf = allFolders.filter(f => f.parentId === folderId).length;
    const ff = allFiles.filter(f => f.folderId === folderId).length;
    const total = sf + ff;
    return total === 0 ? 'Empty' : `${total} item${total !== 1 ? 's' : ''}`;
  }

  function escHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── Navigation ───────────────────────────────────────────────────────
  function navigateTo(folderId) {
    currentFolderId = folderId;
    selectedItem = null;
    renderAll();
    closeEditorPane();
  }

  function selectItem(id, type) {
    selectedItem = { id, type };
    document.querySelectorAll('.fm-card').forEach(c => c.classList.remove('selected'));
    const el = fmGrid ? fmGrid.querySelector(`[data-id="${id}"]`) : null;
    if (el) el.classList.add('selected');
  }

  // ─── File Editor ──────────────────────────────────────────────────────
  function openFile(fileId) {
    const file = allFiles.find(f => f.id === fileId);
    if (!file) return;
    openFileId = fileId;
    if (fmEditorPane) fmEditorPane.classList.add('open');
    if (fmEditorTitle) fmEditorTitle.value = file.name;
    if (fmEditorContent) {
      fmEditorContent.innerHTML = file.type === 'note' ? (file.content || '<p></p>') : `<p>${escHtml(file.content || '')}</p>`;
      fmEditorContent.contentEditable = file.type !== 'image' ? 'true' : 'false';
    }
    // Auto-save
    if (fmEditorContent && typeof debounce === 'function') {
      fmEditorContent.oninput = debounce(async () => {
        if (!openFileId || !currentUser) return;
        await db.collection('users').doc(currentUser).collection('files').doc(openFileId).update({
          content: fmEditorContent.innerHTML,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
      }, 3000);
    }
  }

  function closeEditorPane() {
    openFileId = null;
    if (fmEditorPane) fmEditorPane.classList.remove('open');
    if (fmEditorContent) fmEditorContent.oninput = null;
  }

  if (fmEditorCloseBtn) fmEditorCloseBtn.addEventListener('click', closeEditorPane);

  if (fmEditorSaveBtn) {
    fmEditorSaveBtn.addEventListener('click', async () => {
      if (!openFileId || !currentUser) return;
      fmEditorSaveBtn.disabled = true;
      try {
        await db.collection('users').doc(currentUser).collection('files').doc(openFileId).update({
          name: fmEditorTitle?.value?.trim() || 'Untitled',
          content: fmEditorContent?.innerHTML || '',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (typeof showToast === 'function') showToast('File saved!', 'success');
      } catch(e) {
        if (typeof showToast === 'function') showToast('Save failed: ' + e.message, 'error');
      }
      fmEditorSaveBtn.disabled = false;
    });
  }

  // ─── Toolbar ─────────────────────────────────────────────────────────
  if (fmNewFileBtn) fmNewFileBtn.addEventListener('click', () => showNewItemModal('file'));
  if (fmNewFolderBtn) fmNewFolderBtn.addEventListener('click', () => showNewItemModal('folder'));

  if (fmImportBtn && fmImportInput) {
    fmImportBtn.addEventListener('click', () => fmImportInput.click());
    fmImportInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file || !currentUser) return;
      const reader = new FileReader();
      reader.onload = async ev => {
        let content = ev.target.result;
        const isHtml = /\.(html?|htm)$/i.test(file.name);
        if (!isHtml) content = content.split('\n').filter(l => l).map(l => `<p>${escHtml(l)}</p>`).join('');
        const name = file.name.replace(/\.(html?|txt|md)$/i, '');
        await createFileInDb(name, 'note', content, currentFolderId);
      };
      reader.readAsText(file);
      fmImportInput.value = '';
    });
  }

  // ─── New Item Modal ───────────────────────────────────────────────────
  function showNewItemModal(type, prefillName = '') {
    const modal = document.getElementById('fmNewItemModal');
    if (!modal) { console.error('fmNewItemModal not found'); return; }

    document.getElementById('fmNewItemTitle').textContent = type === 'folder' ? '📁 New Folder' : '📄 New File';
    const input = document.getElementById('fmNewItemName');
    input.value = prefillName;

    const ftg = document.getElementById('fmFileTypeGroup');
    if (ftg) ftg.style.display = type === 'file' ? 'flex' : 'none';

    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => input.focus(), 100);

    const doCreate = async () => {
      const name = input.value.trim();
      if (!name) {
        input.style.borderColor = '#9f403d';
        setTimeout(() => input.style.borderColor = '', 1500);
        return;
      }
      modal.style.display = 'none';
      if (type === 'folder') {
        await createFolderInDb(name, currentFolderId);
      } else {
        const checked = document.querySelector('input[name="fmFileType"]:checked');
        const fileType = checked ? checked.value : 'note';
        await createFileInDb(name, fileType, '', currentFolderId);
      }
    };

    document.getElementById('fmNewItemConfirm').onclick = doCreate;
    input.onkeydown = e => {
      if (e.key === 'Enter') doCreate();
      if (e.key === 'Escape') modal.style.display = 'none';
    };
    document.getElementById('fmNewItemCancel').onclick = () => (modal.style.display = 'none');

    const bd = document.getElementById('fmNewItemBackdrop');
    if (bd) bd.onclick = () => (modal.style.display = 'none');
  }

  // ─── Rename Modal ─────────────────────────────────────────────────────
  function showRenameModal(id, type, currentName) {
    const modal = document.getElementById('fmRenameModal');
    const input = document.getElementById('fmRenameInput');
    if (!modal) return;

    input.value = currentName;
    modal.style.display = 'flex';
    setTimeout(() => { input.focus(); input.select(); }, 100);

    const doRename = async () => {
      const name = input.value.trim();
      if (!name) return;
      modal.style.display = 'none';
      if (name !== currentName) await renameItem(id, type, name);
    };

    document.getElementById('fmRenameConfirm').onclick = doRename;
    input.onkeydown = e => {
      if (e.key === 'Enter') doRename();
      if (e.key === 'Escape') modal.style.display = 'none';
    };
    document.getElementById('fmRenameCancel').onclick = () => (modal.style.display = 'none');
    const bd = document.getElementById('fmRenameBackdrop');
    if (bd) bd.onclick = () => (modal.style.display = 'none');
  }

  // ─── Delete Modal ─────────────────────────────────────────────────────
  function showDeleteConfirm(id, type, name) {
    const modal = document.getElementById('fmDeleteConfirm');
    if (!modal) return;
    const nameEl = document.getElementById('fmDeleteItemName');
    if (nameEl) nameEl.textContent = `"${name}"`;

    modal.style.display = 'flex';

    document.getElementById('fmDeleteConfirmBtn').onclick = async () => {
      modal.style.display = 'none';
      await deleteItem(id, type);
    };
    document.getElementById('fmDeleteCancel').onclick = () => (modal.style.display = 'none');
    const bd = document.getElementById('fmDeleteBackdrop');
    if (bd) bd.onclick = () => (modal.style.display = 'none');
  }

  // ─── Move Modal ───────────────────────────────────────────────────────
  function showMoveModal(itemId, type) {
    const modal = document.getElementById('fmMoveModal');
    const tree = document.getElementById('fmMoveTree');
    if (!modal || !tree) return;

    tree.innerHTML = '';

    const addOpt = (label, fid, icon, depth) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fm-move-option';
      btn.style.paddingLeft = (12 + depth * 16) + 'px';
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:15px">${icon}</span> ${escHtml(label)}`;
      btn.addEventListener('click', async () => { modal.style.display = 'none'; await moveItem(itemId, type, fid); });
      tree.appendChild(btn);
    };

    addOpt('My Files (Root)', null, 'home', 0);
    const renderLevel = (parentId, depth) => {
      allFolders
        .filter(f => (f.parentId || null) === parentId && f.id !== itemId)
        .forEach(folder => {
          addOpt(folder.name, folder.id, 'folder', depth);
          renderLevel(folder.id, depth + 1);
        });
    };
    renderLevel(null, 1);

    modal.style.display = 'flex';
    document.getElementById('fmMoveCancel').onclick = () => (modal.style.display = 'none');
    const bd = document.getElementById('fmMoveBackdrop');
    if (bd) bd.onclick = () => (modal.style.display = 'none');
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────
  async function createFileInDb(name, type, content, folderId) {
    if (!currentUser) { toast('Please log in first', 'warning'); return; }
    try {
      const ref = await db.collection('users').doc(currentUser).collection('files').add({
        name,
        type: type || 'note',
        content: content || '',
        folderId: folderId || null,
        isPinned: false,
        category: '',
        tags: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      toast(`Created "${name}"`, 'success');
      if (type === 'note') setTimeout(() => openFile(ref.id), 600);
    } catch(e) {
      toast('Could not create file: ' + e.message, 'error');
      console.error('FM createFile error:', e);
    }
  }

  async function createFolderInDb(name, parentId) {
    if (!currentUser) { toast('Please log in first', 'warning'); return; }
    try {
      await db.collection('users').doc(currentUser).collection('folders').add({
        name,
        parentId: parentId || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      toast(`Folder "${name}" created`, 'success');
    } catch(e) {
      toast('Could not create folder: ' + e.message, 'error');
      console.error('FM createFolder error:', e);
    }
  }

  async function renameItem(id, type, newName) {
    if (!currentUser) return;
    const col = type === 'folder' ? 'folders' : 'files';
    try {
      await db.collection('users').doc(currentUser).collection(col).doc(id).update({
        name: newName,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      toast('Renamed', 'success');
    } catch(e) { toast('Rename failed: ' + e.message, 'error'); }
  }

  async function deleteItem(id, type) {
    if (!currentUser) return;
    try {
      if (type === 'folder') {
        await deleteFolderRecursive(id);
      } else {
        await db.collection('users').doc(currentUser).collection('files').doc(id).delete();
        if (openFileId === id) closeEditorPane();
      }
      selectedItem = null;
      toast('Deleted', 'success');
    } catch(e) {
      toast('Delete failed: ' + e.message, 'error');
      console.error('FM delete error:', e);
    }
  }

  async function deleteFolderRecursive(folderId) {
    // Delete all files in folder
    const batch = db.batch();
    allFiles.filter(f => f.folderId === folderId).forEach(f => {
      batch.delete(db.collection('users').doc(currentUser).collection('files').doc(f.id));
    });
    await batch.commit();
    // Recurse into sub-folders
    for (const sf of allFolders.filter(f => f.parentId === folderId)) {
      await deleteFolderRecursive(sf.id);
    }
    // Delete this folder
    await db.collection('users').doc(currentUser).collection('folders').doc(folderId).delete();
  }

  async function moveItem(id, type, targetFolderId) {
    if (!currentUser) return;
    const col = type === 'folder' ? 'folders' : 'files';
    const field = type === 'folder' ? 'parentId' : 'folderId';
    try {
      await db.collection('users').doc(currentUser).collection(col).doc(id).update({
        [field]: targetFolderId || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      toast('Moved successfully', 'success');
    } catch(e) { toast('Move failed: ' + e.message, 'error'); }
  }

  async function duplicateItem(id, type) {
    if (!currentUser) return;
    if (type === 'file') {
      const file = allFiles.find(f => f.id === id);
      if (file) await createFileInDb(file.name + ' (copy)', file.type, file.content, file.folderId);
    } else {
      const folder = allFolders.find(f => f.id === id);
      if (folder) await createFolderInDb(folder.name + ' (copy)', folder.parentId);
    }
  }

  async function togglePin(id) {
    const file = allFiles.find(f => f.id === id);
    if (!file || !currentUser) return;
    try {
      await db.collection('users').doc(currentUser).collection('files').doc(id).update({ isPinned: !file.isPinned });
      toast(file.isPinned ? 'Unpinned' : 'Pinned to top', 'success');
    } catch(e) { toast('Action failed', 'error'); }
  }

  // ─── Export ───────────────────────────────────────────────────────────
  function exportFile(id, format) {
    const file = allFiles.find(f => f.id === id);
    if (!file) return;
    let content, mime, ext;
    if (format === 'html') {
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(file.name)}</title></head><body>${file.content || ''}</body></html>`;
      mime = 'text/html'; ext = 'html';
    } else if (format === 'md') {
      content = htmlToMarkdown(file.content || ''); mime = 'text/markdown'; ext = 'md';
    } else {
      content = (file.content || '').replace(/<[^>]*>/g, ''); mime = 'text/plain'; ext = 'txt';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `${file.name}.${ext}` });
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported as .${ext}`, 'success');
  }

  function htmlToMarkdown(html) {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '_$1_')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
  }

  // ─── Toast helper ─────────────────────────────────────────────────────
  function toast(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type);
    else console.log(`[FM ${type}] ${msg}`);
  }

  // ─── Context Menu ─────────────────────────────────────────────────────
  function showContextMenu(e, id, type) {
    e.preventDefault();
    e.stopPropagation();
    selectItem(id, type);
    if (!contextMenu) return;

    const item = type === 'file' ? allFiles.find(f => f.id === id) : allFolders.find(f => f.id === id);
    const name = item?.name || '';
    const isPinned = item?.isPinned;

    contextMenu.innerHTML = `
      ${type === 'file' ? `<button class="fm-ctx-item" data-action="open" type="button"><span class="material-symbols-outlined">open_in_new</span>Open</button>` : ''}
      <button class="fm-ctx-item" data-action="rename" type="button"><span class="material-symbols-outlined">edit</span>Rename</button>
      <button class="fm-ctx-item" data-action="duplicate" type="button"><span class="material-symbols-outlined">content_copy</span>Duplicate</button>
      <button class="fm-ctx-item" data-action="copy" type="button"><span class="material-symbols-outlined">file_copy</span>Copy</button>
      <button class="fm-ctx-item" data-action="move" type="button"><span class="material-symbols-outlined">drive_file_move</span>Move to…</button>
      ${type === 'file' ? `<button class="fm-ctx-item" data-action="pin" type="button"><span class="material-symbols-outlined">${isPinned ? 'bookmark_remove' : 'push_pin'}</span>${isPinned ? 'Unpin' : 'Pin to top'}</button>` : ''}
      ${type === 'file' ? `
        <div class="fm-ctx-separator"></div>
        <div class="fm-ctx-submenu-wrap">
          <button class="fm-ctx-item fm-ctx-has-sub" type="button" data-action="noop">
            <span class="material-symbols-outlined">download</span>Export as…<span class="material-symbols-outlined fm-ctx-arrow">chevron_right</span>
          </button>
          <div class="fm-ctx-submenu">
            <button class="fm-ctx-item" data-action="export-txt" type="button"><span class="material-symbols-outlined">text_snippet</span>Plain Text (.txt)</button>
            <button class="fm-ctx-item" data-action="export-html" type="button"><span class="material-symbols-outlined">html</span>HTML (.html)</button>
            <button class="fm-ctx-item" data-action="export-md" type="button"><span class="material-symbols-outlined">markdown</span>Markdown (.md)</button>
          </div>
        </div>` : ''}
      <div class="fm-ctx-separator"></div>
      <button class="fm-ctx-item fm-ctx-danger" data-action="delete" type="button"><span class="material-symbols-outlined">delete</span>Delete</button>
    `;

    contextMenu.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'noop') return;
        closeContextMenu();
        switch (action) {
          case 'open': openFile(id); break;
          case 'rename': showRenameModal(id, type, name); break;
          case 'duplicate': duplicateItem(id, type); break;
          case 'copy':
            clipboard = { id, type, op: 'copy' };
            toast(`"${name}" copied`, 'success');
            break;
          case 'move': showMoveModal(id, type); break;
          case 'pin': togglePin(id); break;
          case 'export-txt': exportFile(id, 'txt'); break;
          case 'export-html': exportFile(id, 'html'); break;
          case 'export-md': exportFile(id, 'md'); break;
          case 'delete': showDeleteConfirm(id, type, name); break;
        }
      });
    });

    // Position context menu
    const menuW = 210, menuH = 340;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 10);
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.add('open');

    setTimeout(() => document.addEventListener('click', closeContextMenu, { once: true }), 50);
  }

  function closeContextMenu() {
    if (contextMenu) contextMenu.classList.remove('open');
  }

  // Right-click on empty grid area
  if (fmGrid) {
    fmGrid.addEventListener('contextmenu', e => {
      if (!e.target.closest('.fm-card')) {
        e.preventDefault();
        if (!contextMenu) return;
        contextMenu.innerHTML = `
          <button class="fm-ctx-item" data-action="new-file" type="button"><span class="material-symbols-outlined">add</span>New File</button>
          <button class="fm-ctx-item" data-action="new-folder" type="button"><span class="material-symbols-outlined">create_new_folder</span>New Folder</button>
          ${clipboard ? `<button class="fm-ctx-item" data-action="paste" type="button"><span class="material-symbols-outlined">content_paste</span>Paste</button>` : ''}
        `;
        contextMenu.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', async ev => {
            ev.stopPropagation();
            closeContextMenu();
            switch (btn.dataset.action) {
              case 'new-file': showNewItemModal('file'); break;
              case 'new-folder': showNewItemModal('folder'); break;
              case 'paste':
                if (clipboard) { await moveItem(clipboard.id, clipboard.type, currentFolderId); clipboard = null; }
                break;
            }
          });
        });
        const x = Math.min(e.clientX, window.innerWidth - 210);
        const y = Math.min(e.clientY, window.innerHeight - 120);
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.classList.add('open');
        setTimeout(() => document.addEventListener('click', closeContextMenu, { once: true }), 50);
      }
    });
  }

  // ─── Drag & Drop ─────────────────────────────────────────────────────
  let dragItem = null;

  function setupDragEvents(el, id, type) {
    el.addEventListener('dragstart', e => {
      dragItem = { id, type };
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => el.classList.add('fm-dragging'), 0);
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('fm-dragging');
      dragItem = null;
      document.querySelectorAll('.fm-drag-over').forEach(x => x.classList.remove('fm-drag-over'));
    });
  }

  function setupDropTarget(el, targetFolderId) {
    el.addEventListener('dragover', e => {
      e.preventDefault();
      if (dragItem && dragItem.id !== targetFolderId) {
        e.dataTransfer.dropEffect = 'move';
        el.classList.add('fm-drag-over');
      }
    });
    el.addEventListener('dragleave', () => el.classList.remove('fm-drag-over'));
    el.addEventListener('drop', async e => {
      e.preventDefault();
      el.classList.remove('fm-drag-over');
      if (dragItem && dragItem.id !== targetFolderId) {
        await moveItem(dragItem.id, dragItem.type, targetFolderId);
      }
    });
  }

  // Drop on grid background
  if (fmGrid) {
    fmGrid.addEventListener('dragover', e => {
      if (!e.target.closest('.fm-card')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    });
    fmGrid.addEventListener('drop', async e => {
      if (!e.target.closest('.fm-card') && dragItem) { e.preventDefault(); await moveItem(dragItem.id, dragItem.type, currentFolderId); }
    });
  }

  // Drop on breadcrumb
  if (fmBreadcrumb) {
    fmBreadcrumb.addEventListener('dragover', e => e.preventDefault());
    fmBreadcrumb.addEventListener('drop', async e => {
      e.preventDefault();
      const crumb = e.target.closest('.fm-crumb');
      if (crumb && dragItem) {
        const fid = crumb.dataset.fid === '' ? null : crumb.dataset.fid;
        await moveItem(dragItem.id, dragItem.type, fid);
      }
    });
  }

  // ─── Search ───────────────────────────────────────────────────────────
  if (fmSearchInput) {
    fmSearchInput.addEventListener('input', e => { searchQuery = e.target.value.trim(); renderGrid(); });
  }

  // ─── Sort ─────────────────────────────────────────────────────────────
  const sortDd = document.getElementById('fmSortDropdown');
  if (fmSortBtn && sortDd) {
    fmSortBtn.addEventListener('click', e => { e.stopPropagation(); sortDd.classList.toggle('open'); });
    sortDd.querySelectorAll('[data-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.sort;
        if (sortField === field) sortAsc = !sortAsc;
        else { sortField = field; sortAsc = true; }
        const lbl = fmSortBtn.querySelector('.fm-sort-label');
        if (lbl) lbl.textContent = btn.textContent.trim().split('\n')[0].trim();
        sortDd.classList.remove('open');
        renderGrid();
      });
    });
    document.addEventListener('click', () => sortDd.classList.remove('open'));
  }

  // ─── View Toggle ─────────────────────────────────────────────────────
  if (fmViewToggle) {
    fmViewToggle.addEventListener('click', () => {
      viewMode = viewMode === 'grid' ? 'list' : 'grid';
      const icon = fmViewToggle.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = viewMode === 'grid' ? 'view_list' : 'grid_view';
      renderGrid();
    });
  }

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    // Only active when Files section is visible
    const sectionFiles = document.getElementById('sectionFiles');
    if (!sectionFiles || sectionFiles.getAttribute('data-account-active') !== 'true') return;
    // Skip if any fm modal is open or user is typing
    const anyModal = document.querySelector('#fmNewItemModal[style*="flex"], #fmRenameModal[style*="flex"], #fmDeleteConfirm[style*="flex"], #fmMoveModal[style*="flex"]');
    if (anyModal) return;
    if (e.target.matches('input, textarea, [contenteditable="true"]')) return;

    if (e.key === 'F2' && selectedItem) {
      const it = selectedItem.type === 'file' ? allFiles.find(f => f.id === selectedItem.id) : allFolders.find(f => f.id === selectedItem.id);
      if (it) showRenameModal(selectedItem.id, selectedItem.type, it.name);
    }
    if (e.key === 'Delete' && selectedItem) {
      const it = selectedItem.type === 'file' ? allFiles.find(f => f.id === selectedItem.id) : allFolders.find(f => f.id === selectedItem.id);
      if (it) showDeleteConfirm(selectedItem.id, selectedItem.type, it.name);
    }
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); showNewItemModal('file'); }
    if (e.ctrlKey && e.shiftKey && e.key === 'N') { e.preventDefault(); showNewItemModal('folder'); }
    if (e.ctrlKey && e.key.toLowerCase() === 'd' && selectedItem) { e.preventDefault(); duplicateItem(selectedItem.id, selectedItem.type); }
    if (e.ctrlKey && e.key.toLowerCase() === 'c' && selectedItem) {
      clipboard = { ...selectedItem, op: 'copy' };
      toast('Copied to clipboard', 'success');
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'v' && clipboard) {
      e.preventDefault();
      moveItem(clipboard.id, clipboard.type, currentFolderId).then(() => { clipboard = null; });
    }
    if (e.key === 'Escape') {
      closeContextMenu();
      selectedItem = null;
      document.querySelectorAll('.fm-card.selected').forEach(c => c.classList.remove('selected'));
    }
    if (e.key === 'Backspace' && currentFolderId !== null) {
      e.preventDefault();
      const cur = allFolders.find(f => f.id === currentFolderId);
      navigateTo(cur?.parentId || null);
    }
  });

  // ─── Button Bindings & Missing Modals ───────────────────────────────

  // Toolbar
  if (fmNewFileBtn) fmNewFileBtn.addEventListener('click', () => showNewItemModal('file'));
  if (fmNewFolderBtn) fmNewFolderBtn.addEventListener('click', () => showNewItemModal('folder'));
  
  if (fmImportBtn && fmImportInput) {
    fmImportBtn.addEventListener('click', () => fmImportInput.click());
    fmImportInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const ext = file.name.split('.').pop().toLowerCase();
      let type = 'note';
      if (ext === 'html' || ext === 'htm') type = 'link'; // Just an example mapping
      
      try {
        await db.collection('users').doc(currentUser).collection('files').add({
          name: file.name.replace(/\.[^/.]+$/, ""),
          type: type,
          content: text,
          folderId: currentFolderId,
          isPinned: false,
          category: '',
          tags: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        toast('File imported successfully', 'success');
      } catch (err) {
        toast('Import failed', 'error');
      }
      fmImportInput.value = ''; // reset
    });
  }

  // Inline Editor
  if (fmEditorCloseBtn) {
    fmEditorCloseBtn.addEventListener('click', () => {
      fmEditorPane.classList.remove('open');
      openFileId = null;
    });
  }
  if (fmEditorSaveBtn) {
    fmEditorSaveBtn.addEventListener('click', async () => {
      if (!openFileId) return;
      const newName = fmEditorTitle.value.trim() || 'Untitled';
      const newContent = fmEditorContent.innerText;
      fmEditorSaveBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Saving...';
      try {
        await db.collection('users').doc(currentUser).collection('files').doc(openFileId).update({
          name: newName,
          content: newContent,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        toast('File saved', 'success');
        // keep editor open or close it? Let's keep it open
      } catch (err) {
        toast('Failed to save file', 'error');
      } finally {
        fmEditorSaveBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Save';
      }
    });
  }

  // Modals Implementation
  function openModal(id) {
    const m = document.getElementById(id);
    if (m) {
      m.style.display = 'flex';
      setTimeout(() => m.classList.add('open'), 10);
    }
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) {
      m.classList.remove('open');
      setTimeout(() => m.style.display = 'none', 200);
    }
  }

  // New Item
  let newItemType = 'file';
  function showNewItemModal(type) {
    newItemType = type;
    document.getElementById('fmNewItemTitle').textContent = type === 'file' ? 'New File' : 'New Folder';
    document.getElementById('fmFileTypeGroup').style.display = type === 'file' ? 'flex' : 'none';
    document.getElementById('fmNewItemName').value = '';
    openModal('fmNewItemModal');
    setTimeout(() => document.getElementById('fmNewItemName').focus(), 50);
  }
  
  const btnCancelNew = document.getElementById('fmNewItemCancel');
  const btnConfirmNew = document.getElementById('fmNewItemConfirm');
  if (btnCancelNew) btnCancelNew.addEventListener('click', () => closeModal('fmNewItemModal'));
  if (btnConfirmNew) btnConfirmNew.addEventListener('click', async () => {
    const nameInput = document.getElementById('fmNewItemName');
    const name = nameInput.value.trim() || (newItemType === 'file' ? 'Untitled File' : 'New Folder');
    let fType = 'note';
    if (newItemType === 'file') {
      const checked = document.querySelector('input[name="fmFileType"]:checked');
      if (checked) fType = checked.value;
    }
    
    try {
      btnConfirmNew.disabled = true;
      if (newItemType === 'folder') {
        await db.collection('users').doc(currentUser).collection('folders').add({
          name: name,
          parentId: currentFolderId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await db.collection('users').doc(currentUser).collection('files').add({
          name: name,
          type: fType,
          content: '',
          folderId: currentFolderId,
          isPinned: false,
          category: '',
          tags: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      closeModal('fmNewItemModal');
      toast(newItemType === 'folder' ? 'Folder created' : 'File created', 'success');
    } catch (err) {
      toast('Failed to create item', 'error');
    } finally {
      btnConfirmNew.disabled = false;
    }
  });

  // Rename
  let renameTarget = null;
  function showRenameModal(id, type, currentName) {
    renameTarget = { id, type };
    document.getElementById('fmRenameInput').value = currentName;
    openModal('fmRenameModal');
    setTimeout(() => document.getElementById('fmRenameInput').select(), 50);
  }
  const btnCancelRen = document.getElementById('fmRenameCancel');
  const btnConfirmRen = document.getElementById('fmRenameConfirm');
  if (btnCancelRen) btnCancelRen.addEventListener('click', () => closeModal('fmRenameModal'));
  if (btnConfirmRen) btnConfirmRen.addEventListener('click', async () => {
    if (!renameTarget) return;
    const newName = document.getElementById('fmRenameInput').value.trim();
    if (!newName) return;
    try {
      btnConfirmRen.disabled = true;
      const coll = renameTarget.type === 'file' ? 'files' : 'folders';
      await db.collection('users').doc(currentUser).collection(coll).doc(renameTarget.id).update({
        name: newName,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      closeModal('fmRenameModal');
      toast('Renamed', 'success');
    } catch (err) {
      toast('Failed to rename', 'error');
    } finally {
      btnConfirmRen.disabled = false;
    }
  });

  // Delete
  let deleteTarget = null;
  function showDeleteConfirm(id, type, name) {
    deleteTarget = { id, type };
    const span = document.getElementById('fmDeleteName');
    if (span) span.textContent = name;
    openModal('fmDeleteConfirm');
  }
  const btnCancelDel = document.getElementById('fmDeleteCancel');
  const btnConfirmDel = document.getElementById('fmDeleteBtn');
  if (btnCancelDel) btnCancelDel.addEventListener('click', () => closeModal('fmDeleteConfirm'));
  if (btnConfirmDel) btnConfirmDel.addEventListener('click', async () => {
    if (!deleteTarget) return;
    try {
      btnConfirmDel.disabled = true;
      const coll = deleteTarget.type === 'file' ? 'files' : 'folders';
      await db.collection('users').doc(currentUser).collection(coll).doc(deleteTarget.id).delete();
      closeModal('fmDeleteConfirm');
      toast('Item deleted', 'success');
    } catch (err) {
      toast('Failed to delete', 'error');
    } finally {
      btnConfirmDel.disabled = false;
    }
  });

  // Move
  let moveTarget = null;
  function showMoveModal(id, type) {
    moveTarget = { id, type };
    const list = document.getElementById('fmMoveList');
    list.innerHTML = '';
    
    // Add root
    const rootBtn = document.createElement('button');
    rootBtn.className = 'fm-move-option';
    rootBtn.innerHTML = `<span class="material-symbols-outlined">home</span> My Files (Root)`;
    rootBtn.onclick = () => performMove(null);
    list.appendChild(rootBtn);

    // Recursively build folders
    function buildMoveTree(parentId, depth) {
      allFolders.filter(f => (f.parentId || null) === parentId).forEach(f => {
        // Skip moving a folder into itself
        if (moveTarget.type === 'folder' && f.id === moveTarget.id) return;
        const btn = document.createElement('button');
        btn.className = 'fm-move-option';
        btn.style.paddingLeft = (12 + depth * 16) + 'px';
        btn.innerHTML = `<span class="material-symbols-outlined">folder</span> ${f.name}`;
        btn.onclick = () => performMove(f.id);
        list.appendChild(btn);
        buildMoveTree(f.id, depth + 1);
      });
    }
    buildMoveTree(null, 1);
    openModal('fmMoveModal');
  }
  async function performMove(targetFolderId) {
    if (!moveTarget) return;
    try {
      const coll = moveTarget.type === 'file' ? 'files' : 'folders';
      const updateData = moveTarget.type === 'file' ? { folderId: targetFolderId } : { parentId: targetFolderId };
      await db.collection('users').doc(currentUser).collection(coll).doc(moveTarget.id).update(updateData);
      closeModal('fmMoveModal');
      toast('Moved successfully', 'success');
    } catch(err) {
      toast('Failed to move', 'error');
    }
  }
  const btnCancelMove = document.getElementById('fmMoveCancel');
  if (btnCancelMove) btnCancelMove.addEventListener('click', () => closeModal('fmMoveModal'));

  // Duplicate
  async function duplicateItem(id, type) {
    try {
      const coll = type === 'file' ? 'files' : 'folders';
      const doc = await db.collection('users').doc(currentUser).collection(coll).doc(id).get();
      if (!doc.exists) return;
      const data = doc.data();
      data.name = data.name + ' (Copy)';
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('users').doc(currentUser).collection(coll).add(data);
      toast('Duplicated', 'success');
    } catch (err) {
      toast('Failed to duplicate', 'error');
    }
  }

  // Toggle Pin
  async function togglePin(id) {
    try {
      const docRef = db.collection('users').doc(currentUser).collection('files').doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        await docRef.update({ isPinned: !doc.data().isPinned });
      }
    } catch (err) {
      toast('Failed to pin/unpin', 'error');
    }
  }

  // Open File (Inline Editor)
  function openFile(id) {
    const file = allFiles.find(f => f.id === id);
    if (!file) return;
    openFileId = id;
    fmEditorTitle.value = file.name || '';
    fmEditorContent.innerText = file.content || '';
    fmEditorPane.classList.add('open');
  }

  // Export
  function exportFile(id, format) {
    const file = allFiles.find(f => f.id === id);
    if (!file) return;
    const blob = new Blob([file.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Utility toast
  function toast(msg, type='info') {
    if (typeof showToast === 'function') showToast(msg, type);
    else console.log(`Toast (${type}): ${msg}`);
  }

  // Close modals on backdrop click
  document.querySelectorAll('.fm-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target.classList.contains('absolute') && e.target.classList.contains('inset-0')) {
        closeModal(overlay.id);
      }
    });
  });

  console.log('✅ FileManager initialized');

}
