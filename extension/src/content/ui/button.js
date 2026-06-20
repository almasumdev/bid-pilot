/* Floating "Generate Proposal" button. Classic content script. */
(function () {
  'use strict';
  const BP = (window.BidPilot = window.BidPilot || {});

  BP.mountButton = function mountButton(onClick) {
    if (document.getElementById('bp-fab')) return;
    const logo = chrome.runtime.getURL('assets/icon128.png');
    const btn = document.createElement('button');
    btn.id = 'bp-fab';
    btn.type = 'button';
    btn.className = 'bp-fab';
    // Build via DOM + CSSOM (not an inline style attribute) so strict page CSP
    // (style-src without 'unsafe-inline') can't strip the mask.
    const ico = document.createElement('span');
    ico.className = 'bp-fab-logo';
    ico.style.webkitMaskImage = `url("${logo}")`;
    ico.style.maskImage = `url("${logo}")`;
    const lbl = document.createElement('span');
    lbl.className = 'bp-fab-label';
    lbl.textContent = 'Generate Proposal';
    btn.append(ico, lbl);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
    document.body.appendChild(btn);
  };

  BP.unmountButton = function unmountButton() {
    const btn = document.getElementById('bp-fab');
    if (btn) btn.remove();
  };
})();
