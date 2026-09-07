#!/usr/bin/env node
/**
 * Runtime probes for Node write-path retirement (P11 tasks 1.2–1.3).
 * Static analysis + router contract checks — no live server required.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

const router = readFileSync(join(ROOT, 'server_elixir/lib/afterlight/gateway/router.ex'), 'utf8');
const gameChannel = readFileSync(join(ROOT, 'server_elixir/lib/afterlight_web/game_channel.ex'), 'utf8');

const checks = [
  ['Router defines :unrouted disposition', /:unrouted/.test(router)],
  ['Router lists transitional @node_relay_types', /@node_relay_types/.test(router)],
  ['GameChannel handles {:unrouted', /\{:unrouted/.test(gameChannel)],
  ['GameChannel logs unrouted with corr=', /unrouted game message corr=/.test(gameChannel)],
  ['torrents.js present (sidecar retained)', exists(join(ROOT, 'server/torrents.js'))],
  ['irc.js present (sidecar retained)', exists(join(ROOT, 'server/irc.js'))],
];

function exists(p) {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
}

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}\t${label}`);
  if (!ok) failed++;
}

process.exit(failed ? 1 : 0);
