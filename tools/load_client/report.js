import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BENCHMARKS_DIR = path.join(REPO, 'docs', 'benchmarks');

const ERROR_DEFINITIONS = `
| Code | Definition |
| --- | --- |
| \`rejection\` | Server \`error\` frame with a documented reason (room_unavailable, superseded, etc.) |
| \`drop\` | Client dropped a \`presence_update\` due to backpressure (\`maxUnread\` exceeded) |
| \`timeout\` | Scenario step exceeded its wait deadline |
| \`stale_revision\` | Durable command rejected because \`expected_revision\` lagged authority |
| \`stale_epoch\` | Binary/rt frame discarded because room epoch advanced |
| \`overload\` | Pool/mailbox overload rejection before command execution |
`.trim();

function hardwareBlock() {
  const cpus = os.cpus() ?? [];
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpuModel: cpus[0]?.model ?? 'unknown',
    cpuCount: cpus.length,
    totalMemGb: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
  };
}

function formatHist(h) {
  if (!h || h.count === 0) return '_no samples_';
  return `p50 ${h.p50} ms · p95 ${h.p95} ms · p99 ${h.p99} ms (n=${h.count})`;
}

function targetsTable(measured) {
  const tickP99 = measured?.histograms?.tick_latency_ms?.p99;
  const ackP95 = measured?.histograms?.durable_ack_ms?.p95;
  return `
| Target | Threshold | Measured | Status |
| --- | --- | --- | --- |
| Room tick lag (client consume) | p99 < 50 ms | ${tickP99 ?? '—'} ms | ${tickP99 != null && tickP99 < 50 ? 'PASS' : 'NOT EVALUATED'} |
| Durable ack (same-region) | p95 < 250 ms | ${ackP95 ?? '—'} ms | ${ackP95 != null && ackP95 < 250 ? 'PASS' : 'NOT EVALUATED'} |
| Mailbox/memory monotonic growth | none over soak | not instrumented in smoke | DEFERRED |
| Zero duplicated economic effects | 0 duplicates | not measured in smoke | DEFERRED |
`.trim();
}

/**
 * Render a markdown benchmark report from a scenario result object.
 */
export function renderReport(result, { status = 'smoke', notes = [] } = {}) {
  const hw = hardwareBlock();
  const payload = result.metrics?.payload;
  const lines = [
    `# Benchmark — ${result.scenario}`,
    '',
    `**Status:** ${status}`,
    `**Recorded:** ${result.startedAt}`,
    `**Duration:** ${result.elapsedMs} ms`,
    '',
    '## Scenario parameters',
    '',
    '```json',
    JSON.stringify(result.config, null, 2),
    '```',
    '',
    '## Hardware',
    '',
    `- Host: ${hw.hostname} (${hw.platform}/${hw.arch})`,
    `- CPU: ${hw.cpuModel} × ${hw.cpuCount}`,
    `- RAM: ${hw.totalMemGb} GB`,
    '',
    '## Software versions',
    '',
    `- Node: ${result.software?.node ?? process.version}`,
    `- Scenario config version: ${result.config?.version ?? '1'}`,
    `- Elixir/OTP/PostgreSQL: _record from deployment when running full soak_`,
    `- LiveView sessions: ${result.liveview?.connected ?? 0} (${result.liveview?.note ?? 'n/a'})`,
    '',
    '## Latencies',
    '',
    `- Join: ${formatHist(result.metrics?.histograms?.join_latency_ms)}`,
    `- Frame interval: ${formatHist(result.metrics?.histograms?.frame_interval_ms)}`,
    `- Tick consume lag: ${formatHist(result.metrics?.histograms?.tick_latency_ms)}`,
    `- Durable ack: ${formatHist(result.metrics?.histograms?.durable_ack_ms)}`,
    '',
    '## Payload sizes (JSON frames, bytes)',
    '',
    payload?.count
      ? `n=${payload.count} · p50 ${payload.p50} · p95 ${payload.p95} · p99 ${payload.p99}`
      : '_no frames captured_',
    '',
    '## Error definitions',
    '',
    ERROR_DEFINITIONS,
    '',
    '## Counters',
    '',
    '```json',
    JSON.stringify(result.metrics?.counters ?? {}, null, 2),
    '```',
    '',
    '## Acceptance targets',
    '',
    targetsTable(result.metrics),
    '',
  ];

  if (notes.length) {
    lines.push('## Notes', '', ...notes.map((n) => `- ${n}`), '');
  }

  return lines.join('\n');
}

export function writeReport(result, filename, opts = {}) {
  mkdirSync(BENCHMARKS_DIR, { recursive: true });
  const out = path.join(BENCHMARKS_DIR, filename);
  writeFileSync(out, renderReport(result, opts));
  return out;
}

export function writeAcceptanceGate({ reports = [], notes = [] } = {}) {
  const body = [
    '# P10 acceptance gate evidence',
    '',
    `**Assembled:** ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## 7.1 — Measured profile',
    '',
    '| Scenario | Report | p99 tick | p95 durable ack | Status |',
    '| --- | --- | --- | --- | --- |',
    ...reports.map((r) => {
      const tick = r.metrics?.histograms?.tick_latency_ms?.p99 ?? '—';
      const ack = r.metrics?.histograms?.durable_ack_ms?.p95 ?? '—';
      return `| ${r.scenario} | [${r.filename}](./${r.filename}) | ${tick} ms | ${ack} ms | ${r.status ?? 'smoke'} |`;
    }),
    '',
    '### 1,000-session / 20-room steady soak',
    '',
    '_Not yet run in this environment._ Full parameters and stop conditions: [runbook](./runbook.md#steady-soak-1000-sessions--20-rooms).',
    '',
    '## 7.2 — No claim without measurement',
    '',
    'Performance statements in migration docs must link here or be labeled projections. This gate document is the index.',
    '',
    '## 7.3 — Scope bound',
    '',
    '- 10,000-session benchmark **deferred** until the 1,000-session profile is understood.',
    '- Autoscale signals documented for future work: room tick lag, mailbox depth, media egress (when P8 flag on).',
    '',
  ];

  if (notes.length) body.push('## Additional notes', '', ...notes.map((n) => `- ${n}`), '');

  const out = path.join(BENCHMARKS_DIR, 'p10-acceptance-gate.md');
  writeFileSync(out, body.join('\n'));
  return out;
}

export { BENCHMARKS_DIR };
