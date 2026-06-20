/* End-to-end pipeline test (no browser):
 *   realistic JobData + profile
 *   -> real prompts.js (buildSystemPrompt/buildUserPrompt)
 *   -> real native-host/host.js  -> real `claude` CLI
 *   -> the worker's parseProposal logic
 * Proves everything except the Chrome DOM + messaging layer. */

import { spawn } from 'child_process';
import { buildSystemPrompt, buildUserPrompt } from '../extension/src/shared/prompts.js';

// --- replicate the worker's parseProposal (kept in sync with service-worker.js) ---
function extractJson(text) {
  let s = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const f = s.indexOf('{'), l = s.lastIndexOf('}');
  if (f !== -1 && l > f) s = s.slice(f, l + 1);
  try { return JSON.parse(s); } catch (_) { return null; }
}
function parseProposal(raw, style) {
  const text = String(raw || '').trim();
  const j = extractJson(text);
  if (j) return {
    style,
    text: typeof j.text === 'string' ? j.text : text,
    suggestedBidRange: j.suggestedBidRange || null,
    skillsToMention: Array.isArray(j.skillsToMention) ? j.skillsToMention : [],
  };
  return { style, text, suggestedBidRange: null, skillsToMention: [] };
}

// --- talk to the real native host over the framing protocol ---
function callHost(message) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [new URL('./host.js', import.meta.url).pathname]);
    let buf = Buffer.alloc(0);
    child.stderr.on('data', (d) => process.stderr.write('HOST_ERR: ' + d));
    child.stdout.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 4) {
        const len = buf.readUInt32LE(0);
        if (buf.length < 4 + len) break;
        const body = buf.subarray(4, 4 + len); buf = buf.subarray(4 + len);
        child.stdin.end();
        const m = JSON.parse(body.toString());
        m.ok ? resolve(m.result) : reject(new Error(m.error));
      }
    });
    const j = Buffer.from(JSON.stringify(message));
    const h = Buffer.alloc(4); h.writeUInt32LE(j.length, 0);
    child.stdin.write(Buffer.concat([h, j]));
  });
}

// --- realistic inputs ---
const job = {
  platform: 'upwork',
  url: 'https://www.upwork.com/jobs/~example',
  title: 'Build a Chrome extension (MV3) for browser automation',
  description:
    'We need a Chrome extension built on Manifest V3. It should inject a content ' +
    'script, communicate with a background service worker, and store user settings. ' +
    'Experience with native messaging is a plus. Must be clean, documented code.',
  skills: ['Chrome Extension', 'JavaScript', 'Manifest V3', 'Node.js'],
};
const profile = {
  name: 'Al',
  title: 'Full-stack JS developer',
  skills: 'JavaScript, Chrome extensions, Node.js, React',
  experience: 'Built several MV3 extensions including native-messaging bridges.',
};

const style = 'professional';
const systemPrompt = buildSystemPrompt();
const userPrompt = buildUserPrompt({ job, profile, style, tone: '', examples: '' });

console.log('=== sending to native host -> claude CLI (real call) ===');
const raw = await callHost({ id: 1, prompt: userPrompt, systemPrompt, model: 'claude-haiku-4-5-20251001' });
const proposal = parseProposal(raw, style);

console.log('\n=== PARSED PROPOSAL ===');
console.log('style :', proposal.style);
console.log('bid   :', JSON.stringify(proposal.suggestedBidRange));
console.log('skills:', JSON.stringify(proposal.skillsToMention));
console.log('text  :\n' + proposal.text);

// assertions
const problems = [];
if (proposal.style !== style) problems.push('style mismatch');
if (!proposal.text || proposal.text.length < 40) problems.push('text too short / empty');
if (/```/.test(proposal.text)) problems.push('code fence leaked into text');
console.log('\n=== RESULT:', problems.length ? 'FAIL -> ' + problems.join(', ') : 'PASS', '===');
process.exit(problems.length ? 1 : 0);
