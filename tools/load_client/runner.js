import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoadClient } from './client.js';
import { MetricsBundle } from './metrics.js';
import { connectLiveViewSessions } from './liveview.js';
import { MSG_TYPES } from '../../shared/protocol.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = path.join(DIR, 'scenarios');

function loadScenario(name) {
  const file = path.join(SCENARIOS_DIR, `${name}.json`);
  if (!existsSync(file)) throw new Error(`unknown scenario: ${name}`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

function listScenarios() {
  return readdirSync(SCENARIOS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(ms, spread = 0.3) {
  const delta = ms * spread * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(ms + delta));
}

async function spawnClient(config, idx, metrics) {
  const guestId = `${config.guestPrefix ?? 'guest_load'}_${idx}_${Date.now()}`;
  const client = new LoadClient({
    guestId,
    nickname: config.nickname ?? 'Load',
    wsUrl: config.wsUrl,
    roomId: config.rooms?.[idx % config.rooms.length] ?? 'market',
    consumeHz: config.consumeHz ?? 10,
    maxUnread: config.maxUnread ?? 32,
    slowReceiver: config.slowReceiver === true,
    metrics,
    label: guestId,
  });
  await client.connect();
  await client.handshake();
  await client.joinRoom();
  return client;
}

async function rampClients(config, metrics) {
  const clients = [];
  const total = config.sessions ?? 4;
  const rampMs = config.rampMs ?? 2000;
  const step = Math.max(1, Math.floor(rampMs / total));

  for (let i = 0; i < total; i++) {
    clients.push(await spawnClient(config, i, metrics));
    if (i < total - 1) await sleep(step);
  }
  return clients;
}

async function runMovementBurst(clients, config) {
  const bursts = config.movementBursts ?? 5;
  for (let b = 0; b < bursts; b++) {
    for (const c of clients) {
      c.movement({
        x: Math.random() * 4 - 2,
        z: Math.random() * 4 - 2,
        rotY: 0,
        walking: true,
        sitting: false,
        airborne: false,
      });
    }
    await sleep(100);
  }
}

async function runDurableCommands(clients, config) {
  const n = config.durableCommandsPerClient ?? 1;
  for (const c of clients) {
    for (let i = 0; i < n; i++) {
      c.sendDurable(MSG_TYPES.GARDEN_ACTION, { actionId: `a${i}`, action: 'till', bedIndex: 0 });
    }
  }
}

async function runReconnectStorm(clients, config) {
  const subset = clients.slice(0, Math.min(clients.length, config.reconnectCount ?? clients.length));
  await Promise.all(
    subset.map(async (c, i) => {
      await sleep(jitter(config.reconnectJitterMs ?? 200, 0.5) * i);
      await c.reconnect();
    }),
  );
}

async function runIdleSoak(clients, config) {
  const soakMs = config.soakMs ?? 3000;
  const movers = Math.floor(clients.length * (config.moverRatio ?? 0.1));
  const moverSet = clients.slice(0, movers);
  const end = Date.now() + soakMs;
  while (Date.now() < end) {
    for (const c of moverSet) {
      c.movement({
        x: Math.random() * 2,
        z: Math.random() * 2,
        rotY: 0,
        walking: Math.random() > 0.5,
        sitting: false,
        airborne: false,
      });
    }
    await sleep(1000 / (config.consumeHz ?? 10));
  }
}

async function runCatalogUploads(clients, config) {
  const httpBase = clients[0]?.httpBase ?? 'http://127.0.0.1:4000';
  const interval = config.uploadIntervalMs ?? 15000;
  const endpoint = `${httpBase}/api/theater/playlists`;
  const count = config.uploadCount ?? Math.max(1, Math.floor((config.soakMs ?? 30000) / interval));
  for (let i = 0; i < count; i++) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://www.youtube.com/playlist?list=PLloadtest_${i}` }),
      });
    } catch {}
    if (i < count - 1) await sleep(interval);
  }
}

async function scrapePrometheusMetrics(httpBase) {
  try {
    const res = await fetch(`${httpBase}/metrics`);
    if (!res.ok) return null;
    const text = await res.text();
    const serverMetrics = {};
    for (const line of text.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const spaceIdx = line.lastIndexOf(' ');
      if (spaceIdx === -1) continue;
      const key = line.slice(0, spaceIdx);
      const val = parseFloat(line.slice(spaceIdx + 1));
      if (!Number.isNaN(val)) {
        serverMetrics[key] = val;
      }
    }
    return serverMetrics;
  } catch {
    return null;
  }
}

/**
 * Execute one named scenario; returns structured results for reporting.
 */
export async function runScenario(name, overrides = {}) {
  const config = { ...loadScenario(name), ...overrides };
  const metrics = new MetricsBundle();
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const liveview = await connectLiveViewSessions(config);
  const clients = await rampClients(config, metrics);

  if (config.movementBursts) await runMovementBurst(clients, config);
  if (config.durableCommandsPerClient) await runDurableCommands(clients, config);
  if (config.reconnectStorm) await runReconnectStorm(clients, config);
  if (config.catalogUploads) {
    await Promise.all([
      config.soakMs ? runIdleSoak(clients, config) : Promise.resolve(),
      runCatalogUploads(clients, config),
    ]);
  } else if (config.soakMs) {
    await runIdleSoak(clients, config);
  }

  const soakMs = config.postSoakMs ?? 0;
  if (soakMs > 0) await sleep(soakMs);

  const clientStats = clients.map((c) => c.stats());
  const httpBase = clients[0]?.httpBase ?? 'http://127.0.0.1:4000';
  const serverMetrics = await scrapePrometheusMetrics(httpBase);
  for (const c of clients) c.close();

  const elapsedMs = Date.now() - t0;
  return {
    scenario: name,
    config,
    startedAt,
    elapsedMs,
    liveview,
    metrics: metrics.toJSON(),
    serverMetrics,
    clients: clientStats,
    software: {
      node: process.version,
      scenarioVersion: config.version ?? '1',
    },
  };
}

export { listScenarios, loadScenario, SCENARIOS_DIR };
