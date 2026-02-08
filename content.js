(() => {
  const STORAGE_KEY = 'articleHighlights';
  const URL_KEY = location.href.split('#')[0];
  const state = {
    addButton: null,
    tooltip: null,
    detailCard: null,
    pendingSelectionText: ''
  };

  init().catch((error) => console.error('AIH init failed', error));

  async function init() {
    await renderStoredHighlights();
    document.addEventListener('mouseup', handleSelectionMouseUp);
    document.addEventListener('mousedown', removeFloatingButton, true);
  }

  function handleSelectionMouseUp() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) {
      return;
    }

    state.pendingSelectionText = selectedText;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    showFloatingButton(rect.left + window.scrollX, rect.bottom + window.scrollY + 8);
  }

  function showFloatingButton(left, top) {
    removeFloatingButton();
    const button = document.createElement('button');
    button.className = 'aih-floating-btn';
    button.textContent = 'Add highlight';
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openHighlightModal(state.pendingSelectionText);
    });
    document.body.appendChild(button);
    state.addButton = button;
  }

  function removeFloatingButton() {
    if (state.addButton) {
      state.addButton.remove();
      state.addButton = null;
    }
  }

  function openHighlightModal(selectedText) {
    removeFloatingButton();
    if (!selectedText) return;

    const overlay = document.createElement('div');
    overlay.className = 'aih-modal-overlay';
    overlay.innerHTML = `
      <div class="aih-modal" role="dialog" aria-modal="true" aria-label="Add highlight">
        <h3>Add highlight details</h3>
        <p><strong>Selected text:</strong> ${escapeHtml(selectedText.slice(0, 500))}</p>

        <div class="aih-field">
          <label for="aih-brief">Brief explanation (shown on hover)</label>
          <input id="aih-brief" type="text" maxlength="240" placeholder="Short summary" />
        </div>

        <div class="aih-field">
          <label for="aih-long">Lengthy explanation</label>
          <textarea id="aih-long" rows="5" placeholder="Detailed notes"></textarea>
        </div>

        <div class="aih-field">
          <label for="aih-videos">Relevant YouTube links (one per line)</label>
          <textarea id="aih-videos" rows="3" placeholder="https://youtube.com/watch?v=..."></textarea>
        </div>

        <div class="aih-field">
          <label for="aih-refs">Reference links (one per line)</label>
          <textarea id="aih-refs" rows="3" placeholder="https://example.com/reference"></textarea>
        </div>

        <div class="aih-modal-actions">
          <button type="button" data-action="cancel">Cancel</button>
          <button type="button" class="aih-save" data-action="save">Save highlight</button>
        </div>
      </div>`;

    const close = () => overlay.remove();
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });

    overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
    overlay.querySelector('[data-action="save"]').addEventListener('click', async () => {
      const brief = overlay.querySelector('#aih-brief').value.trim();
      const long = overlay.querySelector('#aih-long').value.trim();
      const videos = splitLines(overlay.querySelector('#aih-videos').value);
      const refs = splitLines(overlay.querySelector('#aih-refs').value);

      const highlight = {
        id: crypto.randomUUID(),
        text: selectedText,
        briefExplanation: brief,
        longExplanation: long,
        youtubeLinks: videos,
        referenceLinks: refs,
        createdAt: new Date().toISOString()
      };

      await saveHighlight(highlight);
      close();
      applyHighlightToPage(highlight);
      window.getSelection()?.removeAllRanges();
    });

    document.body.appendChild(overlay);
  }

  function splitLines(value) {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  async function saveHighlight(highlight) {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const all = data[STORAGE_KEY] || {};
    const pageHighlights = all[URL_KEY] || [];
    pageHighlights.push(highlight);
    all[URL_KEY] = pageHighlights;
    await chrome.storage.local.set({ [STORAGE_KEY]: all });
  }

  async function getHighlightsForPage() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const all = data[STORAGE_KEY] || {};
    return all[URL_KEY] || [];
  }

  async function renderStoredHighlights() {
    const highlights = await getHighlightsForPage();
    for (const highlight of highlights) {
      applyHighlightToPage(highlight);
    }
  }

  function applyHighlightToPage(highlight) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (["script", "style", "noscript", "textarea", "input"].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('.aih-modal-overlay, .aih-detail-card')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      const value = textNode.nodeValue;
      const index = value.indexOf(highlight.text);
      if (index < 0) continue;

      const range = document.createRange();
      range.setStart(textNode, index);
      range.setEnd(textNode, index + highlight.text.length);

      const mark = document.createElement('mark');
      mark.className = 'aih-highlight';
      mark.dataset.highlightId = highlight.id;
      mark.addEventListener('mouseenter', (event) => showTooltip(event, highlight.briefExplanation || 'No brief explanation'));
      mark.addEventListener('mouseleave', hideTooltip);
      mark.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        showDetailCard(event, highlight);
      });

      try {
        range.surroundContents(mark);
      } catch {
        continue;
      }
      return;
    }
  }

  function showTooltip(event, text) {
    hideTooltip();
    const tooltip = document.createElement('div');
    tooltip.className = 'aih-tooltip';
    tooltip.textContent = text;
    const { left, bottom } = event.target.getBoundingClientRect();
    tooltip.style.left = `${left + window.scrollX}px`;
    tooltip.style.top = `${bottom + window.scrollY + 6}px`;
    document.body.appendChild(tooltip);
    state.tooltip = tooltip;
  }

  function hideTooltip() {
    if (state.tooltip) {
      state.tooltip.remove();
      state.tooltip = null;
    }
  }

  function showDetailCard(event, highlight) {
    hideDetailCard();
    const card = document.createElement('div');
    card.className = 'aih-detail-card';
    const yLinks = (highlight.youtubeLinks || [])
      .map((link) => `<li><a href="${escapeAttr(link)}" target="_blank" rel="noreferrer">${escapeHtml(link)}</a></li>`)
      .join('');
    const rLinks = (highlight.referenceLinks || [])
      .map((link) => `<li><a href="${escapeAttr(link)}" target="_blank" rel="noreferrer">${escapeHtml(link)}</a></li>`)
      .join('');

    card.innerHTML = `
      <h4>Highlight details</h4>
      <p class="aih-small"><strong>Brief:</strong> ${escapeHtml(highlight.briefExplanation || 'N/A')}</p>
      <p>${escapeHtml(highlight.longExplanation || 'No long explanation yet.')}</p>
      ${yLinks ? `<div><strong>YouTube videos</strong><ul>${yLinks}</ul></div>` : ''}
      ${rLinks ? `<div><strong>References</strong><ul>${rLinks}</ul></div>` : ''}
    `;

    const rect = event.target.getBoundingClientRect();
    card.style.left = `${Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 430)}px`;
    card.style.top = `${window.scrollY + rect.bottom + 8}px`;

    document.body.appendChild(card);
    state.detailCard = card;

    setTimeout(() => {
      document.addEventListener('click', handleOutsideCardClick, { once: true });
    }, 0);
  }

  function handleOutsideCardClick(event) {
    if (!state.detailCard) return;
    if (!state.detailCard.contains(event.target)) {
      hideDetailCard();
    }
  }

  function hideDetailCard() {
    if (state.detailCard) {
      state.detailCard.remove();
      state.detailCard = null;
    }
  }

  function escapeHtml(value) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll('`', '&#96;');
  }
})();
