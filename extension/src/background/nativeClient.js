/**
 * Native messaging client. Wraps chrome.runtime.connectNative to the local host
 * that runs the `claude` CLI. One connection per request (simple + robust).
 */

const HOST_NAME = 'com.bidpilot.host';
const TIMEOUT_MS = 130000; // a touch above the host's own CLI timeout

let nextId = 1;

function callNative(message, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let port;
    try {
      port = chrome.runtime.connectNative(HOST_NAME);
    } catch (e) {
      reject(new Error('cannot connect to native host: ' + e.message));
      return;
    }

    const id = nextId++;
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { port.disconnect(); } catch (_) {}
      reject(new Error('native host timed out'));
    }, timeoutMs);

    port.onMessage.addListener((msg) => {
      if (done || (msg && msg.id != null && msg.id !== id)) return;
      done = true;
      clearTimeout(timer);
      try { port.disconnect(); } catch (_) {}
      if (msg && msg.ok) resolve(msg.result);
      else reject(new Error((msg && msg.error) || 'native host error'));
    });

    port.onDisconnect.addListener(() => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const err = chrome.runtime.lastError;
      reject(new Error(
        'native host disconnected' + (err ? ': ' + err.message : '') +
        '. Is com.bidpilot.host installed? (run native-host/install.sh)'
      ));
    });

    port.postMessage({ id, ...message });
  });
}

export function ping() {
  return callNative({ type: 'ping' }, 5000);
}

export function generate({ prompt, systemPrompt, model }) {
  return callNative({ prompt, systemPrompt, model });
}
