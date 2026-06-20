/* Picks the active platform adapter by hostname. Classic content script. */
(function () {
  'use strict';
  const BP = (window.BidPilot = window.BidPilot || {});

  // Detect ISO currency code from a budget string like "₹600 – 1,500 INR" or "$250 USD".
  const SYMBOL_TO_CODE = {
    '₹': 'INR', '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY',
    '₽': 'RUB', '₩': 'KRW', '₪': 'ILS', '₺': 'TRY', 'R$': 'BRL', '฿': 'THB',
  };
  BP.detectCurrency = function detectCurrency(str) {
    if (!str) return '';
    const code = str.match(/\b([A-Z]{3})\b/);   // explicit ISO code wins
    if (code) return code[1];
    for (const sym of Object.keys(SYMBOL_TO_CODE)) {
      if (str.includes(sym)) return SYMBOL_TO_CODE[sym];
    }
    return '';
  };

  BP.getAdapter = function getAdapter() {
    const url = location.href;
    const all = BP.platforms || {};
    for (const key of Object.keys(all)) {
      try {
        if (all[key].hostMatch(url)) return all[key];
      } catch (_) { /* ignore bad adapter */ }
    }
    return null;
  };
})();
