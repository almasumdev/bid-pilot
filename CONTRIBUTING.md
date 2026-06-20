# Contributing to Bid Pilot

Thanks for your interest! Bid Pilot is a small, dependency-free Chrome (MV3)
extension plus a tiny Node native-messaging host. There is **no build step** —
the `extension/` folder loads as-is — so the feedback loop is fast.

## Ground rules

Bid Pilot is intentionally a *copilot*, not an *autopilot*. Please keep changes
within these guarantees — PRs that break them won't be merged:

- **Never auto-submit.** The extension fills fields; the human clicks submit.
- **No background scraping.** A page is read only on an explicit Generate click.
- **No bulk / mass applying.** One job, one proposal, one click.
- **No secrets, no telemetry, no network calls** from the extension. Auth lives
  in the user's local `claude` login.

## Local setup

1. **Prerequisites**
   - Chrome / Chromium / Brave
   - [Node.js](https://nodejs.org/) on your `PATH`
   - [Claude Code CLI](https://claude.com/claude-code), logged in
     (`echo hi | claude -p` should reply)
2. **Load the extension** — `chrome://extensions` → Developer mode → **Load
   unpacked** → pick `extension/`.
3. **Register the native host** — copy the extension ID from that page, then:
   ```bash
   native-host/install.sh <EXTENSION_ID> [chrome|chromium|brave]
   ```
4. Open the popup → **Test connection**. Green = the host reaches `claude`.

Reload the extension (the ↻ button on `chrome://extensions`) after editing
content/background scripts. The native host only needs re-running if you change
`native-host/host.js`.

## Project layout

```
extension/
  src/
    content/platforms/   ← per-site DOM adapters (most changes land here)
    content/scrape.js     page → job object
    content/insert.js     fill the form fields
    content/ui/           floating button + proposal panel
    background/           service worker + native-messaging client
    shared/prompts.js     system + user prompt construction
    popup/                settings UI
native-host/host.js       reads stdio frames, spawns the claude CLI
```

## Two common contributions

### Fixing a broken selector

Upwork / Freelancer change their markup and a selector stops matching. Each
site is isolated in `extension/src/content/platforms/<site>.js`. Update the
selector there; nothing else should need touching.

### Adding a new platform

1. Copy an existing adapter in `extension/src/content/platforms/` as a template.
2. Implement `isJobPage()`, `scrape()`, and the insert targets (proposal text,
   bid amount, delivery period).
3. Register it in `platforms/index.js`.
4. Add the site's URL to `host_permissions` in `extension/manifest.json`.

## Testing

Run the end-to-end pipeline test (prompt → native host → real `claude` →
parse), no browser required:

```bash
node native-host/integration-test.mjs
```

For UI/scrape changes, also sanity-check by hand on a live job page.

## Style & commits

- **Vanilla JS, no framework, no build.** Match the surrounding code; content
  scripts are classic scripts sharing the `window.BidPilot` namespace.
- DOM styling must stay **CSP-safe** — set `element.style.*` (CSSOM), never
  inline `style="..."` strings or injected `<style>` with page-origin CSP.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `chore:` …). Keep the subject under ~60 chars.

## Pull requests

- One focused change per PR; describe what platform/page you tested on.
- Confirm the four ground rules above still hold.
- Screenshots/GIFs welcome for any UI change.

## Reporting bugs

Open an issue with: browser + version, the platform and a sample job URL (or a
sanitized DOM snippet), what you expected, and what happened. For a broken
selector, the failing element's HTML is the most useful thing you can attach.
