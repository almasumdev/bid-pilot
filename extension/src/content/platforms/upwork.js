/* Upwork platform adapter. Classic content script — registers into window.BidPilot.
 * Selectors are best-effort and brittle; verify against live pages and patch here. */
(function () {
  'use strict';
  const BP = (window.BidPilot = window.BidPilot || {});
  BP.platforms = BP.platforms || {};

  function text(el) { return el ? el.textContent.trim() : ''; }
  function first(sels) {
    for (const s of sels) {
      // Skip Bid Pilot's own injected UI so we never target our panel.
      for (const el of document.querySelectorAll(s)) {
        if (!el.closest('#bp-root')) return el;
      }
    }
    return null;
  }

  BP.platforms.upwork = {
    id: 'upwork',
    hostMatch: (url) => /(^|\.)upwork\.com$/.test(new URL(url).hostname),

    isJobPage() {
      const u = location.pathname;
      const onJob = /\/jobs\/~/.test(u) || /\/proposals?\//.test(u) || /\/apply\//.test(u);
      return onJob || !!this.insertTarget() || !!first(['[data-test="job-description-text"]', '[data-test="Description"]']);
    },

    scrape() {
      const titleEl = first([
        '[data-test="job-title"]',
        'h1[data-test="job-title-link"]',
        'header h1',
        'h1',
      ]);
      const descEl = first([
        '[data-test="job-description-text"]',
        '[data-test="Description"]',
        'section[data-test="Description"]',
      ]);
      const skillEls = document.querySelectorAll(
        '[data-test="token"], [data-test="skill"] a, .air3-token, [data-test="Skills"] a'
      );
      const skills = Array.from(skillEls).map((e) => text(e)).filter(Boolean);

      const budgetEl = first([
        '[data-test="BudgetAmount"]',
        '[data-test="budget"]',
        '[data-cy="clock-budget"]',
        '[class*="budget" i]',
      ]);
      const budget = text(budgetEl);

      const locEl = first([
        '[data-test="client-location"] strong',
        '[data-qa="client-location"]',
        'li[data-test="LocationLabel"] strong',
        '[data-test="LocationLabel"]',
        '[data-test="client-location"]',
      ]);
      const clientLocation = text(locEl);

      return {
        platform: 'upwork',
        url: location.href,
        title: text(titleEl),
        description: text(descEl),
        skills: Array.from(new Set(skills)),
        budget,
        currency: BP.detectCurrency(budget) || 'USD',
        clientLocation,
      };
    },

    insertTarget() {
      return first([
        'textarea[aria-labelledby*="cover" i]',
        'textarea[name*="cover" i]',
        'textarea[placeholder*="cover" i]',
        'div[contenteditable="true"][aria-label*="cover" i]',
        '[data-test="cover-letter"] textarea',
        '[data-test="proposal"] textarea',
      ]);
    },
  };
})();
