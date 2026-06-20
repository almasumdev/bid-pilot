/* Freelancer.com platform adapter. Classic content script.
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

  BP.platforms.freelancer = {
    id: 'freelancer',
    hostMatch: (url) => /(^|\.)freelancer\.[a-z.]+$/.test(new URL(url).hostname),

    isJobPage() {
      const u = location.pathname;
      const onProject = /\/projects?\//.test(u);
      return onProject || !!this.insertTarget() || !!first(['.ProjectDescription', '.ViewHeaderContent-title']);
    },

    scrape() {
      const titleEl = first([
        'h1.Heading',
        'h1.text-body-24',
        '.ViewHeaderContent-title',
        '.ProjectDetailsCard-title',
        'header h1',
        'h1',
      ]);
      const descEl = first([
        '.ProjectDescription',
        '.PageProjectViewLogout-detail-description',
        'fl-text[data-line-clamp] p',
        '.project-description',
      ]);
      const skillEls = document.querySelectorAll(
        '.ProjectViewDetailsTags a, .SkillsList a, fl-tag a, a[href*="/jobs/"]'
      );
      const skills = Array.from(skillEls).map((e) => text(e)).filter(Boolean);

      const budgetEl = first(['.ProjectViewDetails-budget', '.BudgetLabel', '[class*="budget" i]']);
      const budget = text(budgetEl);

      return {
        platform: 'freelancer',
        url: location.href,
        title: text(titleEl),
        description: text(descEl),
        skills: Array.from(new Set(skills)),
        budget,
        currency: BP.detectCurrency(budget),
      };
    },

    insertTarget() {
      return first([
        'textarea#descriptionTextArea',
        'textarea[name="descriptionTextArea"]',
        'textarea[formcontrolname="description"]',
        'textarea[data-placeholder*="bid" i]',
      ]);
    },

    // Optional numeric bid fields — present only on the bid form.
    bidTarget() {
      return first(['input#bidAmountInput', 'input[placeholder*="bid amount" i]']);
    },
    periodTarget() {
      return first(['input#periodInput', 'input[placeholder*="number of days" i]']);
    },
  };
})();
