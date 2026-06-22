/* Content script entry. Mounts the button on job pages and wires the panel to
 * the background worker. Loads last (see manifest content_scripts order). */
(function () {
  'use strict';
  const BP = (window.BidPilot = window.BidPilot || {});

  let lastJob = null;

  function onJobPage() {
    const adapter = BP.getAdapter();
    try {
      return !!adapter && adapter.isJobPage();
    } catch (_) {
      return false;
    }
  }

  function ensureButton() {
    if (onJobPage()) {
      BP.mountButton(openAndGenerate);
    } else {
      // Navigated away from a job page (SPA) — clean up.
      BP.unmountButton();
      if (BP.panel) BP.panel.hide();
    }
  }

  function openPanel() {
    BP.panel.show({
      style: undefined,
      handlers: {
        onStyle: (style) => generate(style),
        onRegenerate: (style) => generate(style),
        onInsert: (text, extras) => doInsert(text, extras),
      },
    });
  }

  function openAndGenerate() {
    openPanel();
    generate(BP.panel.style);
  }

  let generating = false;

  function contextAlive() {
    return !!(chrome.runtime && chrome.runtime.id);
  }

  async function generate(style) {
    if (generating) return; // ignore overlapping clicks / rapid style switches
    if (!contextAlive()) {
      BP.panel.setError('Bid Pilot was updated. Reload this page to reconnect.');
      return;
    }
    const job = BP.scrapeJob();
    if (!job || (!job.description && !job.title)) {
      BP.panel.setError('Could not read the job post on this page.');
      return;
    }
    lastJob = job;
    generating = true;
    BP.panel.setLoading(true);
    try {
      const resp = await sendMessage({ type: 'GENERATE', job, style });
      if (resp && resp.ok) {
        BP.panel.renderProposal(resp.proposal);
      } else {
        BP.panel.setError((resp && resp.error) || 'Generation failed.');
      }
    } catch (e) {
      BP.panel.setError(String(e.message || e));
    } finally {
      generating = false;
      BP.panel.setLoading(false);
    }
  }

  function doInsert(text, extras) {
    if (!text || !text.trim()) {
      BP.panel.setError('Nothing to insert — the proposal is empty.');
      return;
    }
    const res = BP.insertProposal(text, extras);
    if (res.ok) {
      const extra = res.filled && res.filled.length ? ' (+ ' + res.filled.join(' + ') + ')' : '';
      BP.panel.notify('Inserted ✓' + extra + ' — review and submit yourself.');
    } else {
      BP.panel.setError(res.error);
    }
  }

  function sendMessage(msg) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(msg, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(resp);
      });
    });
  }

  // SPA-aware: re-check on URL changes (Upwork/Freelancer are single-page apps).
  let lastUrl = location.href;
  function watch() {
    // Extension was reloaded/updated — this stale content script is dead. Stop
    // observing so we don't churn or throw on every DOM mutation.
    if (!contextAlive()) { mo.disconnect(); return; }
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      ensureButton();
    }
  }
  const mo = new MutationObserver(watch);
  mo.observe(document.documentElement, { subtree: true, childList: true });
  window.addEventListener('popstate', ensureButton);

  ensureButton();
})();
