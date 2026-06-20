/* Insert proposal text into the platform's form field. Classic content script.
 * Fills the field only — never submits. Handles <textarea>/<input> and contenteditable.
 * Fires input/change events so the site's framework (React/Angular) registers the value. */
(function () {
  'use strict';
  const BP = (window.BidPilot = window.BidPilot || {});

  BP.insertProposal = function insertProposal(content, extras) {
    const adapter = BP.getAdapter();
    const el = adapter && adapter.insertTarget();
    if (!el) {
      return { ok: false, error: 'Could not find the proposal field on this page.' };
    }

    fillField(el, content);

    // Optional numeric fields (bid amount + delivery days), if the adapter
    // exposes them and the panel provided values.
    const filled = [];
    if (extras && adapter.bidTarget && extras.bid != null && extras.bid !== '') {
      const b = adapter.bidTarget();
      if (b) { fillField(b, String(extras.bid)); filled.push('bid'); }
    }
    if (extras && adapter.periodTarget && extras.days != null && extras.days !== '') {
      const p = adapter.periodTarget();
      if (p) { fillField(p, String(extras.days)); filled.push('days'); }
    }
    return { ok: true, filled };
  };

  function fillField(el, value) {
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      setNativeValue(el, value);
      // Angular (flcontrolvalueaccessor) + React both commit on a bubbling
      // InputEvent; change/blur trigger validation + auto-grow.
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    } else if (el.isContentEditable) {
      el.textContent = value;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
  }

  // React tracks an internal value; bypass its setter so the change sticks.
  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) setter.set.call(el, value);
    else el.value = value;
  }
})();
