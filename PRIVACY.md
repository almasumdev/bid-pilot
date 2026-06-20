# Bid Pilot — Privacy Policy

_Last updated: 20 June 2026_

Bid Pilot is a browser extension that helps freelancers draft job proposals on
Upwork and Freelancer. This policy explains exactly what it does with data.

## The short version

- Bid Pilot has **no servers** of its own and performs **no analytics or tracking**.
- The developer **never receives any of your data**.
- Everything runs **on your own computer**, through the Claude CLI you installed.

## What data Bid Pilot handles

1. **Your profile and settings** — the name, title, skills, experience, tone,
   custom instructions and model choice you optionally enter in the extension's
   settings. These are stored **locally** on your device using the browser's
   `chrome.storage.local` and never leave it except as described below.

2. **Job post content** — when you click "Generate Proposal" on a job page, the
   extension reads that page's job title, description, skills, budget and the
   client location shown on the page. This is read **only on that click**, never
   in the background.

## How that data is used

When you generate a proposal, your profile and the job post content are sent to
the **Claude CLI installed on your own machine** (via the browser's native
messaging bridge) so it can produce the proposal text. The Claude CLI processes
this through your own Anthropic account. Anthropic's handling of that request is
governed by Anthropic's own privacy policy: https://www.anthropic.com/legal/privacy

No proposal content, profile data, or browsing information is transmitted to the
extension's developer or to any other third party.

## Data we collect

The developer collects **nothing**. There is no account, no telemetry, no remote
logging, and no advertising.

## Data storage and retention

Your settings remain in your browser's local storage until you change or clear
them, or remove the extension. Generated proposals are not stored by the
extension; they exist only in the panel until you insert or discard them.

## Your control

- You can edit or clear your settings at any time from the extension's popup.
- Removing the extension deletes its local storage.
- The extension never submits a proposal for you — you always review and submit
  manually.

## Contact

Questions about this policy: dev.almasum@gmail.com
