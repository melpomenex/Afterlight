#!/usr/bin/env node
/**
 * P11 load re-baseline pointer (task 6.3).
 * Re-runs the Node baseline probe harness and records output beside P10 gate doc.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const evidenceDir = join(ROOT, 'openspec/changes/remove-node-server-authority/evidence');
mkdirSync(evidenceDir, { recursive: true });

const p10 = join(ROOT, 'docs/benchmarks/p10-multi-node-gate.md');
const p10excerpt = existsSync(p10) ? readFileSync(p10, 'utf8').split('\n').slice(0, 40).join('\n') : '(p10 doc missing)';

const r = spawnSync('node scripts/measure-node-baseline.mjs', {
  shell: true,
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, AFTERLIGHT_BASELINE_PROBE: '1' },
});

const body = [
  '# P11 load re-baseline',
  '',
  `Recorded: ${new Date().toISOString()}`,
  '',
  '## Prior P10 reference (excerpt)',
  '',
  p10excerpt,
  '',
  '## This run (`measure-node-baseline.mjs`)',
  '',
  'Status: ' + (r.status === 0 ? 'PASS' : 'FAIL'),
  '',
  '```',
  (r.stdout || '') + (r.stderr || ''),
  '```',
  '',
  'Note: final topology is Phoenix gateway + Node sidecar; repeat under `npm run dev:stack` for integrated numbers when P10 harness gains Phoenix clients.',
  '',
].join('\n');

writeFileSync(join(evidenceDir, 'load-rebaseline.md'), body);
console.log(body);
process.exit(r.status ?? 1);
