import { getSettings, saveSettings } from '../shared/storage.js';

const form = document.getElementById('form');
const savedEl = document.getElementById('saved');
const connEl = document.getElementById('conn');

async function load() {
  const s = await getSettings();
  form.name.value = s.profile.name || '';
  form.title.value = s.profile.title || '';
  form.skills.value = s.profile.skills || '';
  form.experience.value = s.profile.experience || '';
  form.defaultStyle.value = s.defaultStyle || 'professional';
  form.tone.value = s.tone || '';
  form.model.value = s.model || '';
  form.customInstructions.value = s.customInstructions || '';
  form.examples.value = s.examples || '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await saveSettings({
    profile: {
      name: form.name.value.trim(),
      title: form.title.value.trim(),
      skills: form.skills.value.trim(),
      experience: form.experience.value.trim(),
    },
    defaultStyle: form.defaultStyle.value,
    tone: form.tone.value.trim(),
    model: form.model.value.trim(),
    customInstructions: form.customInstructions.value.trim(),
    examples: form.examples.value.trim(),
  });
  savedEl.textContent = 'Saved ✓';
  setTimeout(() => (savedEl.textContent = ''), 1500);
});

document.getElementById('test').addEventListener('click', () => {
  connEl.textContent = 'Pinging native host…';
  connEl.className = 'conn busy';
  chrome.runtime.sendMessage({ type: 'PING' }, (resp) => {
    const err = chrome.runtime.lastError;
    if (err) {
      connEl.textContent = 'Error: ' + err.message;
      connEl.className = 'conn bad';
      return;
    }
    if (resp && resp.ok) {
      connEl.textContent = 'Native host OK — claude CLI reachable ✓';
      connEl.className = 'conn good';
    } else {
      connEl.textContent = 'Not reachable: ' + ((resp && resp.error) || 'unknown');
      connEl.className = 'conn bad';
    }
  });
});

load();
