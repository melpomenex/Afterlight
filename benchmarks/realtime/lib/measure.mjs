// Shared measurement harness for realtime encoding benchmarks (contract §8).
// Run node with --expose-gc for allocation measurements.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { cpus } from 'node:os';

export const WARMUP = 3;
export const RUNS = 20;

// Returns {median, p95, min} in milliseconds. Under machine contention the
// MIN is the honest estimator; always report both (contract §8).
export function timeIt(fn) {
  for (let i = 0; i < WARMUP; i++) fn();
  const samples = new Float64Array(RUNS);
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    fn();
    samples[i] = performance.now() - t0;
  }
  samples.sort();
  const median = samples[RUNS >> 1];
  const p95 = samples[Math.min(RUNS - 1, Math.ceil(RUNS * 0.95) - 1)];
  return { median: +median.toFixed(4), p95: +p95.toFixed(4), min: +samples[0].toFixed(4) };
}

// Allocation proxy: retained-heap delta of one call (gc required).
// Returns undefined when --expose-gc is absent — do not fake numbers.
export function heapDelta(fn) {
  if (typeof globalThis.gc !== 'function') return undefined;
  globalThis.gc();
  const before = process.memoryUsage().heapUsed;
  fn();
  globalThis.gc();
  return process.memoryUsage().heapUsed - before;
}

export function writeResults(relPath, obj) {
  const p = new URL('../' + relPath, import.meta.url).pathname;
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  return p;
}

export function markdownTable(headers, rows) {
  const h = '| ' + headers.join(' | ') + ' |';
  const sep = '|' + headers.map((x) => '---|').join('');
  const body = rows.map((r) => '| ' + r.join(' | ') + ' |').join('\n');
  return h + '\n' + sep + '\n' + body;
}

export const env = () => ({
  node: process.version,
  exposedGc: typeof globalThis.gc === 'function',
  cpus: cpus().length,
  date: new Date().toISOString(),
});
