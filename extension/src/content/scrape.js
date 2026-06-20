/* Scrape job data from the active page via the platform adapter. Classic content script.
 * Only runs on demand (user clicked Generate) — never in the background. */
(function () {
  'use strict';
  const BP = (window.BidPilot = window.BidPilot || {});

  BP.scrapeJob = function scrapeJob() {
    const adapter = BP.getAdapter();
    if (!adapter) return null;
    const job = adapter.scrape();
    // Trim oversized descriptions to stay well under the 1MB native-message cap
    // and to keep prompts cheap.
    if (job.description && job.description.length > 8000) {
      job.description = job.description.slice(0, 8000) + ' …';
    }
    return job;
  };
})();
