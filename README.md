<div align="center">

<img src="extension/assets/logo.png" alt="Bid Pilot" width="96" height="96" />

# Bid Pilot

**An AI copilot for freelance proposals — on Upwork & Freelancer, powered by your local Claude CLI.**

Drafts tailored cover letters, suggests a bid amount and delivery time in the
project's own currency, and fills the form for you to review. It never submits.

</div>

---

## Why

Writing a strong, tailored proposal for every job is slow. Bid Pilot reads the
job post, drafts a proposal in your voice, and one-click fills the form — while
keeping **you** in control of every word and the submit button.

It runs entirely through your **Claude Code CLI**, so there is **no API key and no
per-token billing** — generations are covered by your existing Claude subscription.

## Features

- **Auto-detects** Upwork & Freelancer job/bid pages and shows a floating action button
- **One-click draft** in three styles — Short, Professional, Persuasive
- **Currency-aware bidding** — suggests a bid + delivery time in the *project's* currency, within the client's budget
- **Your voice** — feed a profile, custom standing instructions, and past winning proposals
- **Edit-then-insert** — review and tweak in an editable panel; fills the form, never submits
- **Zero secrets** — auth lives in your local `claude` login; the extension stores no keys and makes no network calls

## How it works

```
 Browser (extension)                                   Your machine
 ┌───────────────────────────────┐                     ┌──────────────────────────┐
 │ content scripts (job page)    │                     │ host-launcher.sh         │
 │   detect → scrape → panel UI  │                     │   (resolves node + PATH) │
 │        │ insert ▲             │                     │        │                 │
 │        ▼        │             │                     │        ▼                 │
 │ background service worker ────┼──── native msg ────▶│ host.js ── spawn ──▶ claude CLI
 │   builds the prompt   ◀───────┼──── JSON ───────────┤   (your subscription)    │
 │        ▲                      │                     └──────────────────────────┘
 │ popup (settings)              │
 └───────────────────────────────┘
```

1. A content script detects a job page and injects the **Generate Proposal** button.
2. On click it scrapes the title, description, skills, budget and currency — **only on demand**.
3. The background worker builds a prompt (profile, style, custom instructions, currency rules).
4. A **Native Messaging host** runs `claude -p --output-format json` locally and returns the draft.
5. You review/edit the proposal + bid + days in the panel, then **Insert** to fill the form.

## Requirements

- Google Chrome, Chromium, or Brave (Linux)
- [Node.js](https://nodejs.org/) on your `PATH`
- [Claude Code CLI](https://claude.com/claude-code) installed and logged in
  (`echo hi | claude -p` should print a reply)

## Install

### 1 · Load the extension

1. Open `chrome://extensions` (or `brave://extensions`)
2. Enable **Developer mode**
3. **Load unpacked** → select the `extension/` folder
4. Copy the **extension ID** shown on the card

### 2 · Install the native host

From the repo root:

```bash
./native-host/install.sh <EXTENSION_ID> [chrome|chromium|brave]
```

This generates a launcher with absolute paths to `node` and `claude` (so it works
even when the browser is launched from the GUI) and registers the messaging host.

5. **Fully quit and reopen** the browser.

### 3 · Configure

Open the toolbar icon → fill in your profile, pick a default style and model, add any
custom instructions → **Test connection** should report the host is reachable.

## Usage

1. Open an Upwork or Freelancer job / bid page
2. Click the floating **✦ Generate Proposal** button
3. Switch styles, **Regenerate**, or edit the draft directly; adjust the bid / days
4. Click **Insert into form** — then review and submit it yourself

## Settings

| Setting | Purpose |
|---|---|
| Profile | Name, title, skills, experience — grounds the proposal |
| Default style | Short / Professional / Persuasive |
| Model | `claude` model (or CLI default) |
| Tone | Optional tone hint |
| Custom instructions | Standing rules applied to every proposal |
| Past winning proposals | Few-shot examples to match your voice |

## Project structure

```
extension/
  manifest.json
  assets/                 icons + logo
  src/
    content/              page detect, scrape, insert, floating UI
      platforms/          per-site adapters (Upwork, Freelancer)
      ui/                 button + proposal panel
    background/           service worker + native messaging client
    popup/                settings UI
    shared/               storage + prompt building
native-host/
  host.js                 reads stdin frames, runs the claude CLI
  com.bidpilot.host.json  native messaging manifest (template)
  install.sh              registers the host for a browser
  integration-test.mjs    end-to-end smoke test (no browser)
```

## Development

Run the end-to-end pipeline test (prompt → native host → real `claude` → parse) with
no browser:

```bash
node native-host/integration-test.mjs
```

## Safety

- **No auto-submit** — Bid Pilot only fills fields; you click submit.
- **No background scraping** — the page is read only when you click Generate.
- **No bulk / automation** — one job, one proposal, one click.
- **No secrets stored** — authentication is your local `claude` login.

## Limitations

- Platform DOM selectors are best-effort and may need patching when Upwork/Freelancer
  change their markup — they are isolated in `extension/src/content/platforms/`.
- Per-machine setup: requires the `claude` CLI installed and logged in locally.
- Each generation spawns the CLI (a few seconds of latency).

## License

MIT
