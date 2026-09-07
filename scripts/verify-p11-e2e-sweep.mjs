#!/usr/bin/env node
/**
 * P11 two-browser end-to-end sweep (task 6.2).
 * Composes existing gateway verification scripts against the Phoenix stack.
 * Wire-level coverage: travel/reconnect, world flip, chat, emotes.
 * Theater torrent/IPTV/EPG and full browser rendering require a live stack +
 * manual pass when sidecars are up — noted in evidence output.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const evidenceDir = join(ROOT, 'openspec/changes/remove-node-server-authority/evidence');
mkdirSync(evidenceDir, { recursive: true });

const steps = [
  ['verify:gateway', 'npm run verify:gateway'],
  ['verify:world', 'npm run verify:world'],
  ['verify:chat', 'npm run verify:chat'],
  ['snapshot-hashes', 'node scripts/p11-snapshot-hashes.mjs --verify'],
];

const lines = [`# P11 e2e sweep`, `Recorded: ${new Date().toISOString()}`, ''];

let ok = true;
for (const [name, cmd] of steps) {
  const started = Date.now();
  const r = spawnSync(cmd, { shell: true, cwd: ROOT, encoding: 'utf8' });
  const ms = Date.now() - started;
  const pass = r.status === 0;
  ok &&= pass;
  lines.push(`- **${name}**: ${pass ? 'PASS' : 'FAIL'} (${ms} ms)`);
  if (!pass) {
    lines.push('```');
    lines.push((r.stdout || '') + (r.stderr || ''));
    lines.push('```');
  }
}

lines.push('', '## Manual / live-stack (not automated here)', '');
lines.push('- Two real browsers on `npm run dev:stack`: theater torrent Range stream, IPTV booth, EPG guide');
lines.push('- Emote wheel + travel gates across districts');
lines.push('- Reconnect with fresh snapshots after gateway restart');

writeFileSync(join(evidenceDir, 'e2e-sweep.md'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
process.exit(ok ? 0 : 1);
