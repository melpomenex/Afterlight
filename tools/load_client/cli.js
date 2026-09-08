#!/usr/bin/env node
/**
 * CLI for protocol-aware load scenarios.
 *
 *   node tools/load_client/cli.js list
 *   node tools/load_client/cli.js run <scenario> [--ws URL] [--sessions N]
 *   node tools/load_client/cli.js smoke [--ws URL]
 */

import { runScenario, listScenarios } from './runner.js';
import { writeReport, writeAcceptanceGate } from './report.js';

function parseArgs(argv) {
  const out = { cmd: argv[0], positional: [], flags: {} };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out.flags[key] = val;
    } else {
      out.positional.push(a);
    }
  }
  return out;
}

async function main() {
  const { cmd, positional, flags } = parseArgs(process.argv.slice(2));
  const wsUrl = flags.ws ?? process.env.LOAD_WS_URL ?? 'ws://127.0.0.1:4000/ws';
  const overrides = { wsUrl };
  if (flags.sessions) overrides.sessions = Number(flags.sessions);
  if (flags.rampMs) overrides.rampMs = Number(flags.rampMs);
  if (flags.soakMs) overrides.soakMs = Number(flags.soakMs);

  if (cmd === 'list') {
    for (const name of listScenarios()) console.log(name);
    return;
  }

  if (cmd === 'run') {
    const name = positional[0];
    if (!name) {
      console.error('usage: cli.js run <scenario>');
      process.exit(1);
    }
    const result = await runScenario(name, overrides);
    console.log(JSON.stringify(result, null, 2));
    if (flags.report) {
      const filename = typeof flags.report === 'string' ? flags.report : `${name}-report.md`;
      const file = writeReport(result, filename, {
        status: flags.status ?? 'measured',
      });
      console.error(`wrote ${file}`);
    }
    return;
  }

  if (cmd === 'smoke') {
    const scenarios = ['smoke-mini', 'idle-heavy'];
    const reports = [];
    for (const name of scenarios) {
      let result;
      try {
        result = await runScenario(name, { ...overrides, sessions: overrides.sessions ?? 2 });
      } catch (err) {
        const msg = err?.message || String(err) || 'unknown error';
        console.error(`scenario ${name} failed:`, msg);
        result = {
          scenario: name,
          config: { wsUrl, sessions: 2 },
          startedAt: new Date().toISOString(),
          elapsedMs: 0,
          metrics: { histograms: {}, counters: {}, gauges: {}, payload: { count: 0 } },
          error: msg,
        };
      }
      const filename = `${name}-smoke.md`;
      const failed = Boolean(result.error) || result.elapsedMs === 0;
      writeReport(result, filename, {
        status: failed ? 'failed — server unavailable' : 'smoke — measured',
        notes: failed
          ? [
              `Run failed: ${result.error || 'gateway not reachable'}`,
              'Start `npm run dev:stack` and re-run `npm run load:smoke`.',
            ]
          : ['Small-scale smoke only; not a 1,000-session soak.'],
      });
      reports.push({ ...result, filename, status: failed ? 'failed' : 'smoke' });
      console.error(`wrote docs/benchmarks/${filename}`);
    }
    writeAcceptanceGate({ reports });
    console.error('wrote docs/benchmarks/p10-acceptance-gate.md');
    return;
  }

  console.error(`unknown command: ${cmd ?? '(none)'}`);
  console.error('usage: cli.js list | run <scenario> | smoke');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
