/* Bid Pilot in-browser setup: generate a self-contained installer pre-filled with
 * this extension's ID, then live-poll the native host until it connects. */

const $ = (id) => document.getElementById(id);
const extId = chrome.runtime.id;

$('ver').textContent = 'v' + chrome.runtime.getManifest().version;

// --- build + download the installer -----------------------------------------

async function buildInstaller() {
  const [tmpl, host] = await Promise.all([
    fetch(chrome.runtime.getURL('setup/installer.sh.tmpl')).then((r) => r.text()),
    fetch(chrome.runtime.getURL('setup/host.js')).then((r) => r.text()),
  ]);
  // host.js goes inside a quoted heredoc, so no shell expansion to worry about.
  return tmpl.replaceAll('__EXTID__', extId).replace('__HOSTJS__', host.replace(/\n$/, ''));
}

$('download').addEventListener('click', async () => {
  try {
    const script = await buildInstaller();
    const blob = new Blob([script], { type: 'application/x-sh' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bidpilot-install.sh';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    $('dlHint').textContent = 'Saved to your Downloads folder.';
    $('s-dl').classList.add('ok');
  } catch (e) {
    $('dlHint').textContent = 'Could not build installer: ' + (e.message || e);
  }
});

// --- copy the run command ----------------------------------------------------

$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('cmd').textContent.trim());
    $('copy').textContent = 'Copied';
    setTimeout(() => ($('copy').textContent = 'Copy'), 1500);
  } catch (_) {
    // Clipboard blocked — select the text as a fallback.
    const r = document.createRange();
    r.selectNodeContents($('cmd'));
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }
});

// --- live connection status --------------------------------------------------

let connected = false;

function setStatus(state, text) {
  $('dot').className = 'dot ' + state;       // pending | ok | bad
  $('statusText').textContent = text;
}

function ping() {
  if (connected) return;
  chrome.runtime.sendMessage({ type: 'PING' }, (resp) => {
    const err = chrome.runtime.lastError;
    if (!err && resp && resp.ok) {
      connected = true;
      setStatus('ok', "Connected — Bid Pilot is ready. Open an Upwork or Freelancer job and click Generate Proposal.");
      document.body.classList.add('done');
    } else if (!connected) {
      setStatus('bad', 'Not connected yet — download and run the installer below.');
    }
  });
}

$('recheck').addEventListener('click', ping);

setStatus('pending', 'Checking connection…');
ping();
setInterval(ping, 2500);
