#!/usr/bin/env node
/**
 * Task 7.5: Market contention benchmark runner.
 * Runs `mix afterlight.bench_market_contention` and writes evidence to
 * `openspec/changes/add-ash-gardens-economy-restoration/evidence/market-contention-benchmark.md`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const serverElixir = join(ROOT, 'server_elixir');
const evidenceDir = join(ROOT, 'openspec/changes/add-ash-gardens-economy-restoration/evidence');
const evidenceFile = join(evidenceDir, 'market-contention-benchmark.md');

mkdirSync(evidenceDir, { recursive: true });

console.log('Running market contention benchmark in server_elixir...');
const r = spawnSync(`mix afterlight.bench_market_contention --samples 200 --out "${evidenceFile}"`, {
  shell: true,
  cwd: serverElixir,
  encoding: 'utf8',
  stdio: 'inherit',
});

if (r.status !== 0) {
  console.error('Market contention benchmark failed with status:', r.status);
  process.exit(r.status ?? 1);
}

console.log('Market contention benchmark successfully completed. Evidence written to:', evidenceFile);
process.exit(0);
