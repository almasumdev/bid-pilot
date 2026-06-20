#!/usr/bin/env node
/**
 * Bid Pilot native messaging host.
 *
 * Bridges the Chrome extension to the locally-installed `claude` CLI so AI calls
 * run through the user's Claude Code subscription (no API key).
 *
 * Protocol (Chrome native messaging, stdio):
 *   each message = 4-byte little-endian uint32 length prefix + UTF-8 JSON body.
 *
 * Request from extension:
 *   { "id": <number>, "prompt": <string>, "systemPrompt"?: <string>, "model"?: <string> }
 * Response to extension:
 *   { "id": <number>, "ok": true,  "result": <string> }   // raw CLI text (model output)
 *   { "id": <number>, "ok": false, "error": <string> }
 */

'use strict';

const { spawn } = require('child_process');

const CLI_TIMEOUT_MS = 120000;
const MAX_MESSAGE_BYTES = 1024 * 1024; // Chrome caps native messages at 1MB.

// ---- stdio framing ---------------------------------------------------------

let buffer = Buffer.alloc(0);

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  drainFrames();
});

process.stdin.on('end', () => process.exit(0));

function drainFrames() {
  // Process every complete frame currently buffered.
  while (buffer.length >= 4) {
    const len = buffer.readUInt32LE(0);
    if (len > MAX_MESSAGE_BYTES) {
      // Corrupt/oversized — bail rather than allocate unbounded.
      process.exit(1);
    }
    if (buffer.length < 4 + len) return; // wait for more data
    const body = buffer.subarray(4, 4 + len);
    buffer = buffer.subarray(4 + len);
    let msg;
    try {
      msg = JSON.parse(body.toString('utf8'));
    } catch (e) {
      send({ id: null, ok: false, error: 'bad JSON in request: ' + e.message });
      continue;
    }
    handle(msg);
  }
}

function send(obj) {
  const json = Buffer.from(JSON.stringify(obj), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  process.stdout.write(Buffer.concat([header, json]));
}

// ---- request handling ------------------------------------------------------

function handle(msg) {
  const id = msg && typeof msg.id !== 'undefined' ? msg.id : null;

  // Health check ping.
  if (msg && msg.type === 'ping') {
    send({ id, ok: true, result: 'pong' });
    return;
  }

  if (!msg || typeof msg.prompt !== 'string' || !msg.prompt.trim()) {
    send({ id, ok: false, error: 'missing prompt' });
    return;
  }

  runClaude(msg)
    .then((result) => send({ id, ok: true, result }))
    .catch((err) => send({ id, ok: false, error: String(err && err.message || err) }));
}

function runClaude({ prompt, systemPrompt, model }) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--output-format', 'json'];
    if (systemPrompt) args.push('--system-prompt', systemPrompt);
    if (model) args.push('--model', model);

    const claudeBin = process.env.BIDPILOT_CLAUDE || 'claude';
    const child = spawn(claudeBin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error('claude CLI timed out after ' + CLI_TIMEOUT_MS + 'ms'));
    }, CLI_TIMEOUT_MS);

    child.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (e.code === 'ENOENT') {
        reject(new Error('claude CLI not found on PATH. Install Claude Code + log in.'));
      } else {
        reject(e);
      }
    });

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error('claude CLI exited ' + code + (stderr ? ': ' + stderr.trim() : '')));
        return;
      }
      try {
        const envelope = JSON.parse(stdout);
        if (envelope.is_error) {
          reject(new Error('claude reported error: ' + (envelope.result || 'unknown')));
          return;
        }
        if (typeof envelope.result !== 'string') {
          reject(new Error('unexpected CLI output shape'));
          return;
        }
        resolve(envelope.result);
      } catch (e) {
        reject(new Error('could not parse CLI output: ' + e.message));
      }
    });

    // Feed prompt via stdin (safer than arg for long text).
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
