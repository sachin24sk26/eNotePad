// ============================================================
// Access Module — The Tactile Editorial
// Uses data-hidden attribute for toggling visibility.
// ============================================================

function initAccess() {
  const codeBoxes = document.querySelectorAll('.code-input-box');
  const fetchBtn = document.getElementById('fetchBtn');
  const contentCopyBtn = document.getElementById('contentCopyBtn');

  // ----- OTP-style Code Input -----
  codeBoxes.forEach((box, index) => {
    box.addEventListener('input', (e) => {
      const value = e.target.value.toUpperCase();
      e.target.value = value;

      if (value) {
        box.classList.add('filled');
        if (index < codeBoxes.length - 1) {
          codeBoxes[index + 1].focus();
        }
      }

      if (getCodeFromBoxes().length === 6) {
        fetchContent();
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && index > 0) {
        codeBoxes[index - 1].focus();
        codeBoxes[index - 1].value = '';
        codeBoxes[index - 1].classList.remove('filled');
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData('text') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      for (let i = 0; i < Math.min(pasted.length, 6); i++) {
        codeBoxes[i].value = pasted[i];
        codeBoxes[i].classList.add('filled');
      }
      const focusIndex = Math.min(pasted.length, 5);
      codeBoxes[focusIndex].focus();

      if (pasted.length >= 6) {
        fetchContent();
      }
    });
  });

  function getCodeFromBoxes() {
    return Array.from(codeBoxes).map(b => b.value).join('').toUpperCase();
  }

  fetchBtn.addEventListener('click', fetchContent);

  async function fetchContent() {
    const code = getCodeFromBoxes();

    if (code.length !== 6) {
      showToast('Please enter the full 6-character code', 'warning');
      return;
    }

    fetchBtn.classList.add('btn-loading');
    fetchBtn.disabled = true;

    hideEl('contentResult');
    hideEl('accessStatus');

    try {
      const doc = await db.collection('shares').doc(code).get();

      if (!doc.exists) {
        showStatus('😕', 'No content found for this code. It may have expired or the code is incorrect.', 'error');
        return;
      }

      const data = doc.data();

      if (data.expiresAt && isExpired(data.expiresAt)) {
        await db.collection('shares').doc(code).delete();
        showStatus('⏰', 'This content has expired and is no longer available.', 'expired');
        return;
      }

      renderContent(data);
      showToast('Content retrieved!', 'success');

    } catch (error) {
      console.error('Fetch error:', error);
      showToast('Failed to fetch content.', 'error');
    } finally {
      fetchBtn.classList.remove('btn-loading');
      fetchBtn.disabled = false;
    }
  }

  function renderContent(data) {
    const resultContainer = document.getElementById('contentResult');
    const typeBadge = document.getElementById('contentTypeBadge');
    const contentBody = document.getElementById('contentBody');
    const copyBtn = document.getElementById('contentCopyBtn');

    const typeLabels = { text: '📝 Text', link: '🔗 Link', image: '🖼️ Image' };
    typeBadge.textContent = typeLabels[data.type] || data.type;

    contentBody.innerHTML = '';

    if (data.type === 'text') {
      const textDiv = document.createElement('div');
      textDiv.className = 'content-text-display';
      textDiv.textContent = data.content;
      contentBody.appendChild(textDiv);
      copyBtn.style.display = '';

    } else if (data.type === 'link') {
      const links = Array.isArray(data.content) ? data.content : [data.content];
      const linkContainer = document.createElement('div');
      linkContainer.className = 'flex flex-col gap-3';
      
      links.forEach(link => {
        const linkEl = document.createElement('a');
        linkEl.className = 'content-link-display';
        linkEl.href = link;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
        linkEl.innerHTML = `<span class="material-symbols-outlined">open_in_new</span> <span class="break-all">${link}</span>`;
        linkContainer.appendChild(linkEl);
      });
      contentBody.appendChild(linkContainer);
      copyBtn.style.display = '';
      
      data.content = links.join('\n');

    } else if (data.type === 'image') {
      const imageDiv = document.createElement('div');
      imageDiv.className = 'content-image-display';
      imageDiv.innerHTML = `
        <img src="${data.content}" alt="Shared image" class="w-full max-h-[400px] object-contain rounded-xl" />
        <a class="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-full text-sm font-medium text-primary hover:bg-surface-container-low transition-all" href="${data.content}" target="_blank" download>
          <span class="material-symbols-outlined text-lg">download</span> Download Image
        </a>
      `;
      contentBody.appendChild(imageDiv);
      copyBtn.style.display = 'none';
    }

    showEl('contentResult');
    resultContainer.dataset.content = data.content;
    resultContainer.dataset.type = data.type;
  }

  contentCopyBtn.addEventListener('click', async () => {
    const resultContainer = document.getElementById('contentResult');
    const content = resultContainer.dataset.content;
    if (!content) return;

    const success = await copyToClipboard(content);
    if (success) {
      contentCopyBtn.innerHTML = '<span class="material-symbols-outlined text-lg">check</span> Copied!';
      showToast('Content copied!', 'success');
      setTimeout(() => {
        contentCopyBtn.innerHTML = '<span class="material-symbols-outlined text-lg">content_copy</span> Copy';
      }, 2000);
    }
  });

  function showStatus(icon, text, type) {
    document.getElementById('accessStatusIcon').textContent = icon;
    document.getElementById('accessStatusText').textContent = text;
    const statusEl = document.getElementById('accessStatus');
    statusEl.className = `p-6 md:p-8 text-center status-${type}`;
    showEl('accessStatus');
  }
}
