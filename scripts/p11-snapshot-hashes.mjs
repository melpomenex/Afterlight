#!/usr/bin/env node
/**
 * P11 snapshot hash recorder / verifier (task 4.1, 6.4).
 *
 *   node scripts/p11-snapshot-hashes.mjs          # print hashes
 *   node scripts/p11-snapshot-hashes.mjs --verify # exit 1 if drift
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const EXPECTED = {
  'data/game-state.json': '4e7882612fd628886e02ddd518c639b052a3034dcf0cd00924393301e41e3a36',
  'data/iptv.json': '504ba03f5335e16e76b3da1105d23f7e2e8d574887fbcd3953fe66af3968c205',
  'data/epg.json': 'cb9ad858fd5f2c87cfc7c374a2e411d42add90ca4dc5526b21ef7e29918a2ad0',
};

const verify = process.argv.includes('--verify');
let failed = false;

for (const [rel, want] of Object.entries(EXPECTED)) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) {
    console.error(`MISSING ${rel}`);
    failed = true;
    continue;
  }
  const buf = readFileSync(path);
  const got = createHash('sha256').update(buf).digest('hex');
  const ok = got === want;
  console.log(`${rel}\t${got}\t${buf.length} bytes${ok ? '' : ' DRIFT'}`);
  if (verify && !ok) {
    console.error(`  expected ${want}`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
