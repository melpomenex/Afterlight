/**
 * Opt-in baseline measurement probe (P0 of the Elixir migration).
 *
 * Active ONLY when AFTERLIGHT_BASELINE_PROBE=1. Emits batched JSONL
 * diagnostics to stderr — save-call latency and event-loop delay samples —
 * so scripts/measure-node-baseline.mjs can record an honest Node baseline.
 * Dead code when the env var is unset: no timers, no wrapping, no output.
 */

import { monitorEventLoopDelay } from 'node:perf_hooks';

const LOOP_SAMPLE_MS = 2_000;

/**
 * @param {{storage: import('./storage.js').Storage}} deps
 */
export function initBaselineProbe({ storage }) {
  if (process.env.AFTERLIGHT_BASELINE_PROBE !== '1') return;

  // Per-save latency: wrap the instance's save method.
  const originalSave = storage.save.bind(storage);
  storage.save = () => {
    const started = process.hrtime.bigint();
    try {
      return originalSave();
    } finally {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      emit({ event: 'save', ms });
    }
  };

  // Event-loop delay: sampled histogram, summarized every LOOP_SAMPLE_MS.
  const histogram = monitorEventLoopDelay({ resolution: 10 });
  histogram.enable();
  const timer = setInterval(() => {
    histogram.disable();
    emit({
      event: 'loop',
      p50: nsToMs(histogram.percentile(50)),
      p95: nsToMs(histogram.percentile(95)),
      p99: nsToMs(histogram.percentile(99)),
      max: nsToMs(histogram.max),
      count: histogram.count,
    });
    histogram.reset();
    histogram.enable();
  }, LOOP_SAMPLE_MS);
  timer.unref();

  emit({ event: 'probe_started', pid: process.pid });
}

function nsToMs(ns) {
  return Math.round((ns / 1e6) * 1000) / 1000;
}

function emit(record) {
  try {
    process.stderr.write(`${JSON.stringify(record)}\n`);
  } catch {
    // Diagnostics must never disturb the server under measurement.
  }
}
