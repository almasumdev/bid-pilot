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
    // Logo rendered white via CSS mask so it reads on the teal button.
    btn.innerHTML =
      `<span class="bp-fab-logo" style="-webkit-mask-image:url('${logo}');mask-image:url('${logo}')"></span>` +
      `<span class="bp-fab-label">Generate Proposal</span>`;
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
