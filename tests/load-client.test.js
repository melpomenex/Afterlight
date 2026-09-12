import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LatencyHistogram, MetricsBundle } from '../tools/load_client/metrics.js';
import { DurableCommandTracker, REJECTION_REASONS } from '../tools/load_client/durable.js';
import { renderReport } from '../tools/load_client/report.js';
import { listScenarios, loadScenario } from '../tools/load_client/runner.js';

describe('load_client metrics', () => {
  it('computes p50/p95/p99', () => {
    const h = new LatencyHistogram('test');
    for (let i = 1; i <= 100; i++) h.record(i);
    assert.equal(h.percentile(50), 50);
    assert.equal(h.percentile(95), 95);
    assert.equal(h.percentile(99), 99);
  });

  it('bundles histograms and payload sizes', () => {
    const m = new MetricsBundle();
    m.hist('tick').record(10);
    m.recordPayload(120);
    m.recordPayload(240);
    const json = m.toJSON();
    assert.equal(json.histograms.tick.count, 1);
    assert.equal(json.payload.count, 2);
  });
});

describe('load_client durable', () => {
  it('builds envelopes with request_id and expected_revision', () => {
    const t = new DurableCommandTracker();
    const env = t.buildEnvelope('set_nickname', { nickname: 'LoadTester' });
    assert.ok(env.request_id);
    assert.equal(env.expected_revision, 0);
    assert.equal(env.type, 'set_nickname');
  });

  it('classifies error frames', () => {
    const t = new DurableCommandTracker();
    assert.equal(
      t.classifyErrorFrame({ message: 'room_unavailable' }),
      REJECTION_REASONS.ROOM_UNAVAILABLE,
    );
  });
});

describe('load_client scenarios', () => {
  it('lists scenario configs', () => {
    const names = listScenarios();
    assert.ok(names.includes('smoke-mini'));
    const cfg = loadScenario('smoke-mini');
    assert.equal(cfg.sessions, 2);
  });
});

describe('load_client report', () => {
  it('renders markdown with latency table', () => {
    const md = renderReport({
      scenario: 'smoke-mini',
      startedAt: '2026-09-07T00:00:00.000Z',
      elapsedMs: 1000,
      config: { sessions: 2 },
      software: { node: 'v22.0.0' },
      liveview: { connected: 0, note: 'not mounted' },
      metrics: {
        histograms: {
          tick_latency_ms: { count: 10, p50: 12, p95: 20, p99: 25, errors: 0 },
        },
        counters: {},
        gauges: {},
        payload: { count: 5, p50: 100, p95: 200, p99: 220 },
      },
    });
    assert.match(md, /smoke-mini/);
    assert.match(md, /p99 25 ms/);
    assert.match(md, /Error definitions/);
  });
});
