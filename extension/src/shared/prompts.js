/**
 * Prompt building. ES module — used by the background worker.
 * Produces a system prompt + user prompt that ask Claude for a single proposal
 * as strict JSON. The native host returns the model's raw text; the worker parses it.
 */

const STYLE_GUIDE = {
  short: 'Short and punchy: 3-4 sentences. Lead with the single strongest reason to hire. No filler.',
  professional: 'Professional and structured: a brief greeting, how you match the key requirements, a concrete relevant detail, and a clear call to action.',
  persuasive: 'Persuasive and value-led: open with a hook tied to the client\'s goal, frame outcomes and results, build credibility, end with confident next step.',
};

export function buildSystemPrompt() {
  return [
    'You write freelance job proposals (cover letters) for a single freelancer.',
    'Write in first person as that freelancer. Sound human, specific, and confident — never generic or templated.',
    'Do not invent facts about the freelancer beyond the profile given. Do not fabricate metrics.',
    'Output ONLY a single JSON object, no markdown, no code fences, no commentary.',
    'JSON shape:',
    '{',
    '  "style": string,',
    '  "text": string,                       // the full proposal body, ready to paste',
    '  "suggestedBid": number | null,        // single recommended bid amount in the project currency (non-binding)',
    '  "deliveryDays": number | null,        // realistic delivery time in days for this scope',
    '  "suggestedBidRange": { "min": number, "max": number, "currency": string, "nonBinding": true } | null,',
    '  "skillsToMention": string[]           // key skills from the job worth emphasizing',
    '}',
    'Base suggestedBid + deliveryDays on the job scope and any budget stated in the post. If the post gives no pricing signal, still give a sensible estimate.',
  ].join('\n');
}

export function buildUserPrompt({ job, profile, style, tone, examples, customInstructions }) {
  const styleGuide = STYLE_GUIDE[style] || STYLE_GUIDE.professional;
  const lines = [];

  lines.push('# Job post');
  lines.push('Platform: ' + (job.platform || 'unknown'));
  if (job.title) lines.push('Title: ' + job.title);
  if (job.skills && job.skills.length) lines.push('Required skills: ' + job.skills.join(', '));
  if (job.budget) lines.push('Client budget: ' + job.budget);
  if (job.currency) lines.push('Project currency: ' + job.currency + ' — suggestedBid MUST be a number in ' + job.currency + ', within the client budget. Do NOT convert to USD.');
  lines.push('Description:');
  lines.push(job.description || '(none extracted)');
  lines.push('');

  lines.push('# Freelancer profile');
  if (profile.name) lines.push('Name: ' + profile.name);
  if (profile.title) lines.push('Title: ' + profile.title);
  if (profile.skills) lines.push('Skills: ' + profile.skills);
  if (profile.experience) lines.push('Experience: ' + profile.experience);
  lines.push('');

  lines.push('# Style');
  lines.push('Requested style: ' + style);
  lines.push(styleGuide);
  if (tone) lines.push('Extra tone preference: ' + tone);
  lines.push('');

  if (customInstructions && customInstructions.trim()) {
    lines.push('# Custom instructions from the freelancer — follow these closely, they override defaults:');
    lines.push(customInstructions.trim());
    lines.push('');
  }

  if (examples && examples.trim()) {
    lines.push('# The freelancer\'s own past proposals — MATCH this voice, structure, and length. Do not copy verbatim.');
    lines.push(examples.trim());
    lines.push('');
  }

  lines.push('Write the proposal now. Remember: output ONLY the JSON object.');
  return lines.join('\n');
}
