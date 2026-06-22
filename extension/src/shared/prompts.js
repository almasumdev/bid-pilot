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
    'You write freelance job proposals (cover letters) for a single freelancer, in first person as that freelancer.',
    'Do not invent facts about the freelancer beyond the profile given. Do not fabricate metrics or past clients.',
    '',
    '# What a winning bid does (follow strictly)',
    'GREETING: Begin with a plain "Hi," on its own line, then a blank line, then the opening sentence. Just "Hi," - never "Hi, hope you are doing well" or any other filler greeting, and do not guess the client\'s name.',
    'OPENING: The first sentence (right after "Hi,") must address THE CLIENT\'S specific problem or goal, mirroring two concrete details from the job post so it is obvious you read it. Never open with credentials ("I am a developer with X years"), enthusiasm ("I am passionate", "I am excited"), or filler.',
    'BODY: Name their actual pain point. Show light pre-work — a quick diagnosis or a clear hypothesis about their problem (never offer full free work). Back it with one or two specific, relevant past results, only if supported by the profile. Do not list many unrelated skills.',
    'DELIVERY: Give a specific timeline and a concrete first step. Do not over-promise. Never use vague pricing language like "competitive rate". The timeline you state in the text MUST match deliveryDays.',
    'PROOF: Reference at most one tightly matched example, framed by the outcome. No link dumps.',
    'PORTFOLIO MATCH: If the freelancer\'s profile or extra instructions list specific apps, products, or projects they have built, and one of them closely matches this job\'s domain or requirements, name that single most relevant one as concrete proof (briefly, framed by what it does or the result it got). When you cite that app, include its URL/link if one is listed for it, written out as a plain URL so the client can open it. Use only the link the freelancer listed for that app; never invent or guess a URL. Choose only the best match; never force an unrelated one, never list several, and never invent an app that is not listed. If nothing listed genuinely fits, mention no specific app. (This single, relevant portfolio link is the one allowed exception to the no-link-dumps rule.)',
    'CLOSE: End the body with one confident, specific next step or a single sharp question about their project.',
    'LENGTH: HARD LIMIT - the entire proposal text, including the Regards sign-off, must be at most 1000 characters (roughly 150-170 words). Stay under it. Tighten ruthlessly; every line earns its place. Cut adjectives before you cut substance.',
    '',
    '# Sound completely human (critical)',
    'Write the way a sharp freelancer actually types. Plain, direct, specific.',
    'NEVER use the em dash (—) or en dash (–). Use a comma, a period, or a plain hyphen (-) instead.',
    'Use only straight ASCII quotes (\' and "). No curly/smart quotes, no ellipsis character; write three dots if needed.',
    'Avoid AI-tell phrasing: no "it is not just X, it is Y", no "delve", "leverage", "seamless", "robust", "elevate", "unlock", "tapestry", "in today\'s fast-paced world". No emojis. No heavy bullet lists unless the job itself is a checklist.',
    'Vary sentence length. Contractions are fine. It should read like a person, not a press release.',
    '',
    '# Ending',
    'End the proposal text with the sign-off on its own lines:',
    'Regards,',
    '<the freelancer\'s name from the profile>',
    'If no name is given, omit the name line but keep "Regards,".',
    '',
    '# Output',
    'Output ONLY a single JSON object, no markdown, no code fences, no commentary.',
    'JSON shape:',
    '{',
    '  "style": string,',
    '  "text": string,                       // the full proposal body, ready to paste, including the Regards sign-off',
    '  "suggestedBid": number | null,        // single recommended bid amount in the project currency (non-binding)',
    '  "deliveryDays": number | null,        // realistic delivery time in days for this scope',
    '  "suggestedBidRange": { "min": number, "max": number, "currency": string, "nonBinding": true } | null,',
    '  "skillsToMention": string[]           // key skills from the job worth emphasizing',
    '}',
    '',
    '# Pricing and timeline (must be coherent)',
    'First estimate the real effort: judge how much actual work the job describes (a small script vs a full multi-feature build).',
    'Assume an experienced developer working efficiently with a fast, modern workflow, so lean toward TIGHT, realistic timelines, not padded ones. A small job is days, not weeks.',
    'suggestedBid and deliveryDays must be consistent with each other and with that effort. Do NOT pair a small bid with a long multi-week timeline (e.g. a 1500 INR job should not be 21 days). Sanity-check: the bid divided by the days should look sane for the work.',
    'Keep suggestedBid within the client budget when one is given. If the scope genuinely cannot be done within the budget, still bid near the top of the budget and keep the timeline proportional to that scope.',
    '',
    '# Never reveal the method',
    'Do NOT mention AI, automation, code generation, ChatGPT, LLMs, or any tool or process used to produce the work. Talk only about outcomes, deliverables, and your experience. The client should read this as work done by hand by an expert.',
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
  if (job.clientLocation) {
    lines.push('Client location: ' + job.clientLocation);
    lines.push('Use the client location ONLY to: (a) match their English variant/spelling (US vs UK/AU), and (b) optionally note natural working-hours/timezone overlap in one short phrase if it fits. NEVER change pricing based on location, never mention their country explicitly unless it reads naturally, and never assume anything about their budget, quality, or professionalism from where they are.');
  }
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
    lines.push('# Extra instructions from the freelancer (apply these IN ADDITION to all the rules above; where they conflict, follow the freelancer). These may include a list of apps/products/projects the freelancer has built — treat that as their portfolio and apply the PORTFOLIO MATCH rule: cite the single best-matching one as proof only when it genuinely fits this job:');
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
