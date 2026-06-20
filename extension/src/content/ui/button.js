/* Floating "Generate Proposal" button. Classic content script. */
(function () {
  'use strict';
  const BP = (window.BidPilot = window.BidPilot || {});

  BP.mountButton = function mountButton(onClick) {
    if (document.getElementById('bp-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'bp-fab';
    btn.type = 'button';
    btn.className = 'bp-fab';
    btn.textContent = '✦ Generate Proposal';
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
