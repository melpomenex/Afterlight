#!/usr/bin/env node
// echo-server.mjs — standalone prototype WS server that negotiates the
// binary data plane and serves afterlight-soa-v1 frames. HARNESS ONLY: this
// is never imported by the game server; it exists so client pipelines and
// parity tests have a real binary peer. Uses the root `ws` dependency.
//
//   node tools/realtime/echo-server.mjs [--port 39301] [--hz 10]
//
// Protocol (additive over the legacy JSON catalog, contract §5):
//   client hello {rt:{protocols:[...]}}  →  server welcome {..., rt:{...}}
//   client join_room {roomId}            →  full snapshot + 10 Hz deltas
//   client movement {x,z,rotY,...}       →  joins the simulated world
// A tiny deterministic simulation moves NPC entities; connected players are
// relayed. JSON peers get the legacy presence_update shape instead.

import { WebSocketServer } from 'ws';
import { EntityStore, presenceToFlags } from '../../shared/realtime/entityStore.js';
import { writeFrame } from '../../shared/realtime/writer.js';
import { parseHelloRt } from '../../shared/realtime/negotiation.js';
import { chooseFrameShape } from '../../shared/realtime/chooseEncoding.js';
import { FRAME_TYPE, ENCODING } from '../../shared/realtime/constants.js';

const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 39301;
const hz = 10;

// A deterministic NPC population with gap-y ids (contract fixtures style).
const NPC_COUNT = 200;
const npcIds = Uint32Array.from({ length: NPC_COUNT }, (_, i) => 5000 + i * 7);
const world = {
  x: new Float32Array(NPC_COUNT), z: new Float32Array(NPC_COUNT), yaw: new Float32Array(NPC_COUNT),
};
for (let i = 0; i < NPC_COUNT; i++) {
  world.x[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1 * 20 - 10;
  world.z[i] = (Math.sin(i * 78.233) * 12345.6789) % 1 * 18 - 9;
  world.yaw[i] = (Math.sin(i * 3.7) + 1) * Math.PI;
}
const flags = new Uint8Array(NPC_COUNT); // idle

const store = new EntityStore(4096);
for (let i = 0; i < NPC_COUNT; i++) {
  store.spawn(npcIds[i], { archetype: 2, variant: i % 8, x: world.x[i], z: world.z[i], yaw: world.yaw[i] });
}
let tick = 0;
let frameSequence = 1;
const clients = new Set(); // {ws, binary:boolean, guestId, entityId}

const wss = new WebSocketServer({ port });
wss.on('connection', (ws) => {
  const client = { ws, binary: false, guestId: null, entityId: 0 };
  clients.add(client);
  ws.on('message', (data, isBinary) => {
    if (isBinary) return; // no client→server binary in v0
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; } // malformed dropped
    if (msg.type === 'hello') {
      client.guestId = String(msg.guestId ?? `guest_${Math.random().toString(36).slice(2, 11)}`);
      const caps = parseHelloRt(msg);
      client.binary = !!caps;
      send(client, { type: 'welcome', player: { id: client.guestId, x: 0, z: 0, rotY: 0, walking: false, sitting: false }, rt: client.binary ? { protocol: 'afterlight-soa-v1', snapshot_hz: hz } : undefined });
    } else if (msg.type === 'join_room') {
      client.entityId = 100000 + (clients.size * 13);
      store.spawn(client.entityId, { guestId: client.guestId, x: Number(msg.x) || 0, z: Number(msg.z) || 0 });
      sendSnapshot(client);
    } else if (msg.type === 'movement' && client.entityId) {
      const slot = store.slot(client.entityId);
      if (slot >= 0) {
        store.x[slot] = Number(msg.x) || 0;
        store.z[slot] = Number(msg.z) || 0;
        store.yaw[slot] = Number(msg.rotY) || 0;
        store.flags[slot] = presenceToFlags(!!msg.walking, !!msg.sitting, !!msg.airborne);
      }
    } else if (msg.type === 'ping') {
      send(client, { type: 'pong', t: msg.t });
    }
  });
  ws.on('close', () => {
    if (client.entityId) store.despawn(client.entityId);
    clients.delete(client);
  });
});

function send(client, obj) {
  if (client.ws.readyState === 1) client.ws.send(JSON.stringify(obj));
}

function spawnRowsFor(live) {
  const rows = new Array(live.length);
  for (let i = 0; i < live.length; i++) {
    const s = store.slot(live[i]);
    rows[i] = {
      id: live[i], guestId: store.guestIdOf[s] ?? undefined,
      archetype: store.archetype[s], variant: store.variant[s],
      x: store.x[s], y: store.y[s], z: store.z[s], yaw: store.yaw[s],
    };
  }
  return rows;
}

function sendSnapshot(client) {
  const live = liveIds();
  const cols = liveColumns(live);
  if (client.binary) {
    const f = writeFrame({
      frameType: FRAME_TYPE.FULL_SNAPSHOT, roomEpoch: 1, serverTick: tick,
      frameSequence: frameSequence, baselineSequence: frameSequence,
      spawn: spawnRowsFor(live),
      transform: { encoding: ENCODING.DENSE, count: live.length, columns: cols },
    });
    if (f.ok && client.ws.readyState === 1) client.ws.send(f.bytes, { binary: true });
  } else {
    send(client, { type: 'presence_update', players: legacyEntries(live) });
  }
}

function liveIds() {
  const ids = [];
  for (const [id] of store.slotOf) ids.push(id);
  return ids;
}
function liveColumns(live) {
  const n = live.length;
  const x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n), yaw = new Float32Array(n);
  live.forEach((id, i) => { const s = store.slot(id); x[i] = store.x[s]; y[i] = store.y[s]; z[i] = store.z[s]; yaw[i] = store.yaw[s]; });
  return { x, y, z, yaw };
}
function legacyEntries(live) {
  return live.map((id) => {
    const s = store.slot(id);
    const f = store.flags[s];
    return { id: store.guestIdOf[s] ?? String(id), x: store.x[s], z: store.z[s], rotY: store.yaw[s], walking: !!(f & 1), sitting: !!(f & 2), airborne: !!(f & 4) };
  });
}

// 10 Hz simulation + broadcast: NPCs drift; deltas selected by measured policy.
setInterval(() => {
  tick++;
  frameSequence++;
  for (let i = 0; i < NPC_COUNT; i++) {
    world.yaw[i] += 0.01;
    world.x[i] += Math.sin(world.yaw[i]) * 0.02;
    world.z[i] -= Math.cos(world.yaw[i]) * 0.02;
    const s = store.slot(npcIds[i]);
    if (s >= 0) { store.x[s] = world.x[i]; store.z[s] = world.z[i]; store.yaw[s] = world.yaw[i]; }
  }
  const live = liveIds();
  const changedNpcs = npcIds.filter((id) => store.slot(id) >= 0);
  const changed = Uint32Array.from(changedNpcs);
  const shape = chooseFrameShape(store.count, changed.length);
  for (const client of clients) {
    if (!client.entityId) continue;
    if (!client.binary) { send(client, { type: 'presence_update', players: legacyEntries(changedNpcs) }); continue; }
    if (shape.frameType === 'FULL_SNAPSHOT') {
      // Snapshot re-asserts the whole world (store resets client-side, so all
      // entities ride spawn rows); DENSE sections skip the mask entirely.
      const c = liveColumns(live);
      const f = writeFrame({
        frameType: FRAME_TYPE.FULL_SNAPSHOT, roomEpoch: 1, serverTick: tick,
        frameSequence, baselineSequence: frameSequence, spawn: spawnRowsFor(live),
        transform: { encoding: ENCODING.DENSE, count: live.length, columns: c },
      });
      if (f.ok && client.ws.readyState === 1) client.ws.send(f.bytes, { binary: true });
    } else {
      const enc = shape.transformEncoding === 'ROARING' ? ENCODING.ROARING : ENCODING.SORTED_IDS;
      const f = writeFrame({
        frameType: FRAME_TYPE.DELTA, roomEpoch: 1, serverTick: tick,
        frameSequence, baselineSequence: frameSequence - 1,
        transform: { encoding: enc, ids: changed, count: changed.length, columns: liveColumns(changedNpcs) },
      });
      if (f.ok && client.ws.readyState === 1) client.ws.send(f.bytes, { binary: true });
    }
  }
}, 1000 / hz);

console.log(`afterlight realtime echo server on ws://127.0.0.1:${port} — ${NPC_COUNT} npcs, ${hz} Hz`);
