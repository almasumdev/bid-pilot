/**
 * Background service worker. Routes messages from content script + popup.
 *   { type: 'GENERATE', job, style }  -> builds prompt, calls native host, returns proposal
 *   { type: 'PING' }                  -> health-check the native host
 */

import { getSettings } from '../shared/storage.js';
import { buildSystemPrompt, buildUserPrompt } from '../shared/prompts.js';
import { generate, ping } from './nativeClient.js';

// Open the in-browser setup page automatically on first install.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('setup/setup.html') });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'PING') {
    ping()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
    return true; // async
  }

  if (msg.type === 'GENERATE') {
    handleGenerate(msg)
      .then((proposal) => sendResponse({ ok: true, proposal }))
      .catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
    return true; // async
  }
});

async function handleGenerate({ job, style }) {
  const settings = await getSettings();
  const chosenStyle = style || settings.defaultStyle;

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    job,
    profile: settings.profile,
    style: chosenStyle,
    tone: settings.tone,
    examples: settings.examples,
    customInstructions: settings.customInstructions,
  });

  const raw = await generate({
    prompt: userPrompt,
    systemPrompt,
    model: settings.model || undefined,
  });

  const proposal = parseProposal(raw, chosenStyle);
  proposal.currency = job.currency || '';
  return proposal;
}

/**
 * Parse the model's text into a proposal object. Tolerates code fences and
 * surrounding prose by extracting the first {...} block. Falls back to treating
 * the whole text as the proposal body.
 */
function parseProposal(raw, style) {
  const text = String(raw || '').trim();
  const json = extractJson(text);
  if (json) {
    return {
      // Style is the user's choice — never trust the model to echo it back correctly.
      style,
      text: humanize(typeof json.text === 'string' ? json.text : text),
      suggestedBid: numOrNull(json.suggestedBid),
      deliveryDays: numOrNull(json.deliveryDays),
      suggestedBidRange: json.suggestedBidRange || null,
      skillsToMention: Array.isArray(json.skillsToMention) ? json.skillsToMention : [],
    };
  }
  return { style, text: humanize(text), suggestedBid: null, deliveryDays: null, suggestedBidRange: null, skillsToMention: [] };
}

const MAX_CHARS = 1000;

// Strip the characters that scream "AI wrote this" so the bid reads as typed by a
// person, then enforce the hard length cap.
function humanize(s) {
  const cleaned = String(s || '')
    .replace(/\s*[—–]\s*/g, ', ')   // em/en dash used as punctuation -> comma
    .replace(/[—–]/g, '-')          // any remaining dash -> plain hyphen
    .replace(/[“”]/g, '"')          // smart double quotes -> straight
    .replace(/[‘’]/g, "'")          // smart single quotes/apostrophes -> straight
    .replace(/…/g, '...')           // ellipsis char -> three dots
    .replace(/ /g, ' ')        // non-breaking space -> normal space
    .replace(/[ \t]+\n/g, '\n')     // trailing spaces
    .trim();
  return capLength(cleaned, MAX_CHARS);
}

// Guarantee the proposal never exceeds the limit. Trims the body at a sentence
// boundary while preserving a "Regards, <name>" sign-off if present.
function capLength(text, max) {
  if (text.length <= max) return text;
  const m = text.match(/\n+regards,[\s\S]*$/i);
  const signoff = m ? text.slice(m.index).trim() : '';
  let body = m ? text.slice(0, m.index).trim() : text;
  const budget = max - (signoff ? signoff.length + 2 : 0);
  if (body.length > budget) {
    body = body.slice(0, budget);
    const cut = Math.max(
      body.lastIndexOf('. '), body.lastIndexOf('.\n'),
      body.lastIndexOf('! '), body.lastIndexOf('? '), body.lastIndexOf('\n')
    );
    if (cut > budget * 0.5) body = body.slice(0, cut + 1);
    body = body.trim();
  }
  return signoff ? body + '\n\n' + signoff : body;
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractJson(text) {
  // Strip ```json ... ``` fences if present.
  let s = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  // If still wrapped in prose, grab the outermost JSON object.
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last > first) s = s.slice(first, last + 1);
  try {
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}
