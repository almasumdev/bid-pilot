/* Proposal panel UI. Classic content script. Exposes BP.panel with render hooks.
 * Pure view + user intents; orchestration lives in content/index.js. */
(function () {
  'use strict';
  const BP = (window.BidPilot = window.BidPilot || {});

  const STYLES = [
    { id: 'short', label: 'Short' },
    { id: 'professional', label: 'Professional' },
    { id: 'persuasive', label: 'Persuasive' },
  ];

  let root, els, handlers = {}, currentStyle = 'professional';

  function build() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'bp-root';
    root.className = 'bp-root bp-hidden';
    let logoUrl = '';
    try { if (chrome.runtime && chrome.runtime.id) logoUrl = chrome.runtime.getURL('assets/icon128.png'); } catch (_) {}
    root.innerHTML = `
      <div class="bp-header">
        <div class="bp-brand"><img class="bp-logo" src="${logoUrl}" alt="" /> Bid Pilot</div>
        <button class="bp-x" type="button" aria-label="Close">×</button>
      </div>

      <div class="bp-seg" role="tablist"></div>

      <div class="bp-stage">
        <textarea class="bp-text" spellcheck="true" placeholder="Your proposal will appear here…"></textarea>
        <div class="bp-meta"></div>

        <div class="bp-loading" aria-hidden="true">
          <div class="bp-ai">
            <svg class="bp-spark bp-spark-lg" viewBox="0 0 24 24" aria-hidden="true">
              <defs>
                <linearGradient id="bpGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#7df3d3"/>
                  <stop offset="0.55" stop-color="#2fe0b0"/>
                  <stop offset="1" stop-color="#0e9c84"/>
                </linearGradient>
              </defs>
              <path d="M12 0c.5 5.4 2.6 7.5 8 8-5.4.5-7.5 2.6-8 8-.5-5.4-2.6-7.5-8-8 5.4-.5 7.5-2.6 8-8Z" fill="url(#bpGrad)"/>
            </svg>
            <svg class="bp-spark bp-spark-sm" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2c.4 4 1.9 5.5 6 6-4.1.5-5.6 2-6 6-.4-4-1.9-5.5-6-6 4.1-.5 5.6-2 6-6Z" fill="url(#bpGrad)"/>
            </svg>
          </div>
          <div class="bp-loadtext">Bid Pilot is writing<span class="bp-dots"><i>.</i><i>.</i><i>.</i></span></div>
        </div>
      </div>

      <div class="bp-toast"></div>

      <div class="bp-actions">
        <button class="bp-btn bp-regen" type="button"><span class="bp-ico">↻</span> Regenerate</button>
        <button class="bp-btn bp-primary bp-insert" type="button">Insert into form</button>
      </div>
    `;
    document.body.appendChild(root);

    els = {
      seg: root.querySelector('.bp-seg'),
      text: root.querySelector('.bp-text'),
      loading: root.querySelector('.bp-loading'),
      meta: root.querySelector('.bp-meta'),
      toast: root.querySelector('.bp-toast'),
      regen: root.querySelector('.bp-regen'),
      insert: root.querySelector('.bp-insert'),
      close: root.querySelector('.bp-x'),
    };

    STYLES.forEach((s) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'bp-segbtn';
      t.dataset.style = s.id;
      t.textContent = s.label;
      t.addEventListener('click', () => {
        if (els.regen.disabled) return; // ignore while loading
        currentStyle = s.id;
        syncTabs();
        if (handlers.onStyle) handlers.onStyle(s.id);
      });
      els.seg.appendChild(t);
    });

    els.close.addEventListener('click', () => BP.panel.hide());
    els.regen.addEventListener('click', () => handlers.onRegenerate && handlers.onRegenerate(currentStyle));
    els.insert.addEventListener('click', () => handlers.onInsert && handlers.onInsert(els.text.value, readBidDays()));
    syncTabs();
  }

  function syncTabs() {
    root.querySelectorAll('.bp-segbtn').forEach((t) => {
      t.classList.toggle('bp-on', t.dataset.style === currentStyle);
    });
  }

  function setBusy(on) {
    els.regen.disabled = on;
    els.insert.disabled = on;
    els.text.disabled = on;
    root.classList.toggle('bp-busy', on);
    els.loading.setAttribute('aria-hidden', String(!on));
  }

  BP.panel = {
    show(opts = {}) {
      build();
      if (opts.style) { currentStyle = opts.style; syncTabs(); }
      handlers = opts.handlers || {};
      root.classList.remove('bp-hidden');
    },
    hide() { if (root) root.classList.add('bp-hidden'); },

    setLoading(on) {
      build();
      setBusy(on);
      if (on) { clearToast(); }
    },

    setError(message) {
      build();
      setBusy(false);
      toast(message, 'err');
    },

    renderProposal(p) {
      build();
      setBusy(false);
      clearToast();
      els.text.value = p.text || '';
      renderMeta(p);
    },

    notify(message) { build(); toast(message, 'ok'); },

    getText() { build(); return els.text.value; },
    get style() { return currentStyle; },
  };

  function renderMeta(p) {
    const bid = p.suggestedBid != null ? p.suggestedBid : '';
    const days = p.deliveryDays != null ? p.deliveryDays : '';
    const cur = p.currency ? `<span class="bp-cur">${escapeHtml(p.currency)}</span>` : '';
    els.meta.innerHTML = `
      <div class="bp-field">
        <span class="bp-flabel">Bid</span>
        ${cur}
        <input class="bp-bidamt" type="number" step="0.01" value="${escapeHtml(bid)}" placeholder="—">
      </div>
      <div class="bp-field">
        <span class="bp-flabel">Days</span>
        <input class="bp-days" type="number" value="${escapeHtml(days)}" placeholder="—">
      </div>
      <span class="bp-nb">non-binding</span>
    `;
  }

  function readBidDays() {
    const bidEl = root.querySelector('.bp-bidamt');
    const daysEl = root.querySelector('.bp-days');
    return {
      bid: bidEl && bidEl.value.trim() !== '' ? bidEl.value.trim() : null,
      days: daysEl && daysEl.value.trim() !== '' ? daysEl.value.trim() : null,
    };
  }

  let toastTimer;
  function toast(msg, kind) {
    els.toast.textContent = msg;
    els.toast.className = 'bp-toast bp-show bp-' + (kind || 'ok');
    clearTimeout(toastTimer);
    if (kind === 'ok') toastTimer = setTimeout(clearToast, 3500);
  }
  function clearToast() { els.toast.className = 'bp-toast'; els.toast.textContent = ''; }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
})();
