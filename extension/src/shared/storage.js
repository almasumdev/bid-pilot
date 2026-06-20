/**
 * Storage helpers (chrome.storage.local). ES module — used by background + popup.
 * No secrets stored: auth lives in the local claude CLI login, not here.
 */

const DEFAULTS = {
  profile: {
    name: '',
    title: '',
    skills: '',          // free text / comma list
    experience: '',      // short blurb
  },
  defaultStyle: 'professional', // short | professional | persuasive
  tone: '',                     // optional extra tone hint
  model: '',                    // optional --model override; empty = CLI default
  examples: '',                 // optional past winning proposals (few-shot voice match)
  customInstructions: '',       // standing instructions injected into every generation
};

export async function getSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return {
    ...DEFAULTS,
    ...stored,
    profile: { ...DEFAULTS.profile, ...(stored.profile || {}) },
  };
}

export async function saveSettings(patch) {
  await chrome.storage.local.set(patch);
}
