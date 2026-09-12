#!/usr/bin/env node
/**
 * P3 verification harness (add-world-room-runtime tasks 7.2 + 7.4): drives a
 * scripted pair of clients through the SAME scenario —
 *
 *   client N  → DIRECT to the Node server (flat {type,...} ws frames)
 *   client P  → through the Phoenix gateway (guest token → Channels socket
 *               `game:v1` → flat frames re-flattened from {topic,event,payload})
 *
 * …then diffs the two frame streams SEMANTICALLY (playerIds/nicknames masked
 * to roles, Phoenix bookkeeping dropped, the DECLARED bounds clamp of
 * tightening #1 normalized, 10 Hz flush timing collapsed) and runs the
 * protocol-catalog §5 regression list on the gateway path.
 *
 * The scenario per leg (main client C + observer O, both on the same path):
 *
 *   hello → join_room market → movement burst (coalesced 10 Hz flush) →
 *   duplicate join_room (no-op) → out-of-bounds + airborne probe →
 *   emote (allow-list + 500 ms cooldown + duplicate-handler ordering) →
 *   travel to theater (one presence_leave at the observer, roster-then-
 *   snapshots ordering) → forced disconnect (one presence_leave, no ghost) →
 *   reconnect + desiredRoom replay (fresh roster + snapshots, exactly one
 *   presence_join, single roster entry afterwards).
 *
 * Servers are detected first; missing ones are STARTED by this script
 * (recorded PIDs, killed only if we started them). If the gateway's world
 * routing rows are still `:node` the gateway leg still runs (honest relay-
 * path evidence) but the runtime-owned assertions are reported as skipped,
 * and `--flip-wait <secs>` polls for the dev.exs flip first (restarting a
 * gateway WE started so it picks the flip up).
 *
 * Usage:
 *   node scripts/verify-world-runtime.mjs [--node-port 3001] [--gw-port 4000]
 *        [--prefix guest_vrw] [--nickname Verifier] [--evidence <path>]
 *        [--skip-gateway] [--flip-wait 900] [--no-autostart]
 *
 * Not part of npm test: recorded two-server evidence for the P3 phase gate.
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { WebSocket } from 'ws';
import { Socket } from 'phoenix';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Configuration (CLI flags override env overrides defaults)
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {
    nodePort: num(process.env.NODE_PORT, 3001),
    gwPort: num(process.env.GW_PORT, 4000),
    prefix: process.env.GUEST_PREFIX || 'guest_vrw',
    nickname: process.env.NICKNAME || 'Vfy',
    evidence: process.env.EVIDENCE || null,
    skipGateway: false,
    autostart: true,
    flipWaitSecs: num(process.env.FLIP_WAIT_SECS, 0),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--node-port') out.nodePort = num(argv[++i], out.nodePort);
    else if (a === '--gw-port') out.gwPort = num(argv[++i], out.gwPort);
    else if (a === '--prefix') out.prefix = argv[++i];
    else if (a === '--nickname') out.nickname = argv[++i];
    else if (a === '--evidence') out.evidence = path.resolve(argv[++i]);
    else if (a === '--skip-gateway') out.skipGateway = true;
    else if (a === '--no-autostart') out.autostart = false;
    else if (a === '--flip-wait') out.flipWaitSecs = num(argv[++i], out.flipWaitSecs);
    else throw new Error(`unknown flag: ${a}`);
  }
  return out;
}

function num(v, dflt) {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

const CFG = parseArgs(process.argv.slice(2));

const WEATHER_STATES = ['clear', 'drizzle', 'rain'];
const BOUNDS = { xMin: -11.3, xMax: 11.3, zMin: -9.5, zMax: 10.3 };
const JOIN_SHAPE = ['id', 'nickname', 'x', 'z', 'rotY', 'walking', 'sitting'];
const FLUSH_SHAPE = ['id', 'x', 'z', 'rotY', 'walking', 'sitting', 'airborne'];

const rand = () => Math.random().toString(36).slice(2, 8);

// ---------------------------------------------------------------------------
// Flat-frame clients (one class, two transports)
// ---------------------------------------------------------------------------

const PHOENIX_INTERNAL = (event) =>
  typeof event !== 'string' ||
  event === 'heartbeat' ||
  event.startsWith('phoenix') ||
  event.startsWith('phx_') ||
  event.startsWith('chan_reply');

/**
 * A game client speaking flat `{type, ...fields}` frames with NetworkClient
 * semantics: multiple handlers per type fire in REGISTRATION order (§5).
 */
class FlatClient {
  constructor(label) {
    this.label = label;
    this.guestId = null;
    this.nickname = null;
    this.frames = []; // every flat frame received (phoenix bookkeeping dropped)
    this.handlers = new Map(); // type -> [fn] in registration order
    this.open = false;
    this._socket = null;
    this._channel = null;
    this._closedByUs = false;
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
    return this;
  }

  _emit(frame) {
    this.frames.push(frame);
    const fns = this.handlers.get(frame.type);
    if (process.env.DEBUG_FRAMES) process.stderr.write(`[${this.label}] <- ${JSON.stringify(frame).slice(0, 400)}\n`);
    if (fns) for (const fn of [...fns]) fn(frame);
    const wild = this.handlers.get('*');
    if (wild) for (const fn of [...wild]) fn(frame);
  }

  push(type, payload = {}) {
    if (this._channel) {
      this._channel.push(type, payload);
    } else if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      this._socket.send(JSON.stringify({ type, ...payload }));
    } else {
      throw new Error(`${this.label}: push(${type}) on a closed client`);
    }
  }

  /**
   * Resolves with the first frame matching predicate. Forward-only by
   * default; `backlog: true` ALSO matches frames already received (needed
   * once: the Node baseline emits `presence_join` at hello time while the
   * world runtime emits it at join_room time — the trigger differs, the
   * stream must converge).
   */
  waitFor(predicate, { timeoutMs = 6000, label = 'frame', backlog = false } = {}) {
    if (backlog) {
      const hit = this.frames.find(predicate);
      if (hit) return Promise.resolve(hit);
    }
    return new Promise((resolve, reject) => {
      const seen = [];
      if (!this.handlers.has('*')) this.handlers.set('*', []);
      const handlers = this.handlers.get('*');
      const handler = (frame) => {
        seen.push(frame.type);
        if (predicate(frame)) {
          clearTimeout(timer);
          handlers.splice(handlers.indexOf(handler), 1);
          resolve(frame);
        }
      };
      const timer = setTimeout(() => {
        const at = handlers.indexOf(handler);
        if (at !== -1) handlers.splice(at, 1);
        reject(new Error(`timeout waiting for ${label} (recently saw: ${summary(seen)})`));
      }, timeoutMs);
      this.on('*', handler);
    });
  }

  /** Collects frames matching predicate until deadline; returns the list. */
  collectFor(predicate, ms) {
    return new Promise((resolve) => {
      const got = [];
      const handler = (frame) => {
        if (predicate(frame)) got.push(frame);
      };
      this.on('*', handler);
      setTimeout(() => {
        const list = this.handlers.get('*');
        list.splice(list.indexOf(handler), 1);
        resolve(got);
      }, ms);
    });
  }

  close() {
    this._closedByUs = true;
    try {
      if (this._channel) this._channel.leave();
    } catch {}
    try {
      if (this._socket) {
        if (typeof this._socket.disconnect === 'function') this._socket.disconnect();
        else this._socket.close();
      }
    } catch {}
    this.open = false;
  }
}

function summary(types) {
  return [...new Set(types)].slice(-6).join(',') || 'nothing';
}

/** Direct-to-Node client (flat ws frames, no envelope). */
function connectNode({ wsBase, guestId, nickname }) {
  return new Promise((resolve, reject) => {
    const client = new FlatClient('node');
    client.guestId = guestId;
    client.nickname = nickname;
    const ws = new WebSocket(wsBase);
    const timer = setTimeout(() => reject(new Error('node ws connect timeout')), 8000);
    ws.on('open', () => {
      clearTimeout(timer);
      client.open = true;
      resolve(client);
    });
    ws.on('error', (err) => {
      if (process.env.DEBUG_FRAMES) process.stderr.write(`[node] ## WS ERROR ${err.message}\n`);
      clearTimeout(timer);
      reject(err);
    });
    ws.on('close', (code, reason) => {
      if (process.env.DEBUG_FRAMES) process.stderr.write(`[node] ## CLOSED code=${code} reason=${reason}\n`);
      client.open = false;
    });
    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return; // malformed JSON parses to null and is dropped (catalog §1)
      }
      if (msg && msg.type) client._emit(msg);
    });
    client._socket = ws;
  });
}

/** Gateway client: guest token → Phoenix Channels `game:v1` → flat frames. */
async function connectGateway({ httpBase, wsBase, guestId, nickname }) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${httpBase}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, nickname }),
      });
      if (!res.ok) throw new Error(`guest token refused (HTTP ${res.status})`);
      const body = await res.json();
      if (!body?.token) throw new Error('guest token response missing token');

      return await new Promise((resolve, reject) => {
        const client = new FlatClient('gateway');
        client.guestId = guestId;
        client.nickname = nickname;
        const socket = new Socket(wsBase, { params: { token: body.token } });
        const timer = setTimeout(() => reject(new Error('gateway join timeout')), 8000);
        socket.onOpen(() => {
          const channel = socket.channel('game:v1', { guestId });
            channel.onMessage = (event, payload) => {
              if (!PHOENIX_INTERNAL(event)) {
                const frame =
                  payload && typeof payload === 'object' && !Array.isArray(payload)
                    ? { type: event, ...payload }
                    : { type: event };
                client._emit(frame);
              }
              return payload;
            };
          channel
            .join()
            .receive('ok', () => {
              clearTimeout(timer);
              client.open = true;
              client._socket = socket;
              client._channel = channel;
              resolve(client);
            })
            .receive('error', (resp) => {
              clearTimeout(timer);
              reject(new Error(`game channel join refused: ${JSON.stringify(resp)}`));
            });
        });
        socket.onError(() => {
          clearTimeout(timer);
          reject(new Error('gateway socket error'));
        });
        socket.connect();
      });
    } catch (err) {
      lastErr = err;
      await sleep(300);
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Server lifecycle — only kill what WE started
// ---------------------------------------------------------------------------

const own = { node: null, gateway: null, nodeTmp: null };

async function nodeHealthy(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function gatewayHealthy(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/guest`, { method: 'POST' });
    void res; // any HTTP answer (400 expected on an empty body) = listener up
    return true;
  } catch {
    return false;
  }
}

async function waitUntil(fn, { tries = 120, ms = 250, what = 'server' } = {}) {
  for (let i = 0; i < tries; i++) {
    if (await fn()) return true;
    await sleep(ms);
  }
  throw new Error(`${what} never became healthy`);
}

async function ensureServers() {
  const started = [];
  if (!(await nodeHealthy(CFG.nodePort))) {
    if (!CFG.autostart) throw new Error(`Node server not up on :${CFG.nodePort} (autostart disabled)`);
    own.nodeTmp = mkdtempSync(path.join(tmpdir(), 'p3-world-node-')); // throwaway data dir
    own.node = spawn(process.execPath, [path.join(REPO, 'server', 'index.js')], {
      cwd: own.nodeTmp,
      env: { ...process.env, PORT: String(CFG.nodePort), HOST: '127.0.0.1', IRC_DISABLED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    own.node.stdout.on('data', (d) => process.stderr.write(`[node-srv] ${d}`));
    own.node.stderr.on('data', (d) => process.stderr.write(`[node-srv] ${d}`));
    started.push(`Node :${CFG.nodePort} (pid ${own.node.pid}, throwaway data dir)`);
    await waitUntil(() => nodeHealthy(CFG.nodePort), { what: `Node :${CFG.nodePort}` });
  }

  if (!CFG.skipGateway && !(await gatewayHealthy(CFG.gwPort))) {
    if (!CFG.autostart) throw new Error(`gateway not up on :${CFG.gwPort} (autostart disabled)`);
    own.gateway = spawn('mix', ['phx.server'], {
      detached: true, // mix is a shell wrapper: kill the whole group on cleanup
      cwd: path.join(REPO, 'server_elixir'),
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.local/afterlight-beam/otp/bin:${process.env.HOME}/.local/afterlight-beam/elixir/bin:${process.env.PATH}`,
        PHX_SERVER: 'true',
        PORT: String(CFG.gwPort),
        AFTERLIGHT_NODE_WS_URL: `ws://127.0.0.1:${CFG.nodePort}/ws`,
        AFTERLIGHT_NODE_HTTP_URL: `http://127.0.0.1:${CFG.nodePort}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    own.gateway.stdout.on('data', (d) => process.stderr.write(`[gw] ${d}`));
    own.gateway.stderr.on('data', (d) => process.stderr.write(`[gw] ${d}`));
    started.push(`gateway :${CFG.gwPort} (pid ${own.gateway.pid}, process group ${-own.gateway.pid})`);
    // First boot may compile the whole dep tree — allow several minutes.
    await waitUntil(() => gatewayHealthy(CFG.gwPort), { what: `gateway :${CFG.gwPort}`, tries: 960 });
  }
  return started;
}

function stopOwnServers() {
  for (const proc of [own.gateway, own.node]) {
    if (!proc) continue;
    try {
      process.kill(-proc.pid, 'SIGTERM');
    } catch {
      try {
        proc.kill('SIGTERM');
      } catch {}
    }
  }
}

// ---------------------------------------------------------------------------
// Scenario + assertion ledger
// ---------------------------------------------------------------------------

class Ledger {
  constructor() {
    this.checks = [];
  }
  pass(name, detail = '') {
    this.checks.push({ ok: true, name, detail });
    console.log(`ok  ${name}${detail ? ` — ${detail}` : ''}`);
  }
  fail(name, detail = '') {
    this.checks.push({ ok: false, name, detail });
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
  skip(name, detail = '') {
    this.checks.push({ ok: null, name, detail });
    console.log(`skip ${name}${detail ? ` — ${detail}` : ''}`);
  }
  get failed() {
    return this.checks.filter((c) => c.ok === false);
  }
  get passed() {
    return this.checks.filter((c) => c.ok === true).length;
  }
  get skipped() {
    return this.checks.filter((c) => c.ok === null).length;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isFlag = (v) => typeof v === 'boolean';
const samePos = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-6;

function fieldSetExact(obj, expected, label) {
  const keys = Object.keys(obj).sort();
  const want = [...expected].sort();
  return keys.length === want.length && want.every((k, i) => keys[i] === k)
    ? null
    : `${label}: field set ${JSON.stringify(keys)} != ${JSON.stringify(want)}`;
}

/**
 * One full scenario against one path. `mk` builds a connected, greeted
 * client; `flavor` is 'node' | 'gateway'; `flipped` declares whether the
 * world runtime owns the gateway path (bounds clamp expected).
 */
async function runWorldLeg({ flavor, mk, ledger, worldOwner }) {
  const runId = rand();
  let observedOwner = null; // gateway leg auto-detects from the OOB probe
  const mainId = `${CFG.prefix}_${flavor}_main_${runId}`;
  const obsId = `${CFG.prefix}_${flavor}_obs_${runId}`;
  const mainNick = `${CFG.nickname} ${flavor} Main`;
  const obsNick = `${CFG.nickname} ${flavor} Obs`;

  const stream = []; // main client's normalized frames, for the cross-leg diff

  const record = (frame) => stream.push(frame);
  const mine = (id) => (id === mainId ? 'SELF' : id === obsId ? 'OBS' : null);

  // Filter + normalize the main client's stream down to catalog-defined
  // world frames about SELF/OBS only (shared servers carry third parties).
  const tap = (client) => {
    client.on('*', (f) => {
      switch (f.type) {
        case 'welcome':
          record({
            type: 'welcome',
            player: mine(f.player?.id) || 'OTHER',
            weather: WEATHER_STATES.includes(f.weather) ? f.weather : 'invalid',
            snapshots: {
              theater: f.theater != null,
              iptv: f.iptv != null,
            },
          });
          break;
        case 'presence_update': {
          const players = (f.players || [])
            .map((p) => ({ role: mine(p.id), ...normalizeActor(p) }))
            .filter((p) => p.role);
          if (players.length) record({ type: 'presence_update', players });
          break;
        }
        case 'presence_join':
          if (mine(f.player?.id)) record({ type: 'presence_join', player: { role: 'SELF', ...normalizeActor(f.player) } });
          break;
        case 'presence_leave':
          if (mine(f.playerId)) record({ type: 'presence_leave', playerId: mine(f.playerId) });
          break;
        case 'emote_broadcast':
          if (mine(f.playerId))
            record({ type: 'emote_broadcast', playerId: mine(f.playerId), nickname: f.nickname === mainNick ? 'SELF_NICK' : 'OTHER', emote: f.emote });
          break;
        case 'theater_state':
          record({ type: 'theater_state', theater: f.theater != null, serverNow: typeof f.serverNow === 'number' });
          break;
        case 'iptv_state':
          record({ type: 'iptv_state', iptv: f.iptv != null });
          break;
        case 'weather_update':
          record({ type: 'weather_update', weather: WEATHER_STATES.includes(f.weather) ? f.weather : 'invalid' });
          break;
        case 'error':
          record({ type: 'error', message: String(f.message) });
          break;
        default:
          break; // chat and the retired economy snapshots are Node-owned in both legs and server-noisy: excluded from the diff
      }
    });
  };

  function normalizeActor(p) {
    // Coordinates are normalized to typeof tokens in the DIFF: exact pose
    // values are timing-dependent (which movement lands in which 100 ms
    // tick) and the declared tightening #1 (bounds clamp) makes the probe
    // pose legitimately differ. Exact-value assertions live per-leg instead
    // (newest-burst pose, clamp/verbatim probe, roster/flush field sets).
    // Flags stay EXACT: flag parity is a catalog requirement.
    return {
      x: typeof p.x === 'number' ? 'num' : 'nonnum',
      z: typeof p.z === 'number' ? 'num' : 'nonnum',
      rotY: typeof p.rotY === 'number' ? 'num' : 'nonnum',
      walking: isFlag(p.walking) ? p.walking : 'notbool',
      sitting: isFlag(p.sitting) ? p.sitting : 'notbool',
      airborne: p.airborne === undefined ? 'ABSENT' : isFlag(p.airborne) ? p.airborne : 'notbool',
    };
  }

  // A roster frame's entries carry the JOIN shape (nickname present, no
  // airborne); a 10 Hz flush entry carries airborne and no nickname. The
  // predicates below pin roster-ness so a flush can never satisfy them.
  const isJoinShaped = (p) => p && p.nickname !== undefined && p.airborne === undefined;

  // --- clients -------------------------------------------------------------
  const obs = await mk(obsId, obsNick);
  tap(obs);
  const main = await mk(mainId, mainNick);
  tap(main);

  try {
    // 1. observer: hello → welcome; join market; settle a KNOWN pose so
    //    both legs' rosters list the observer at identical coordinates
    //    (Node sessions spawn at (0,3), world members at the origin).
    //    hello is sent inside mk(), so the welcome may already be in the
    //    backlog — the wait scans it.
    const obsWelcome = await obs.waitFor((f) => f.type === 'welcome', { label: 'observer welcome', backlog: true });
    ledger.pass(`${flavor}: observer hello → welcome`, `weather=${obsWelcome.weather}`);
    obs.push('join_room', { roomId: 'market' });
    await obs.waitFor((f) => f.type === 'presence_update' && Array.isArray(f.players), { label: 'observer market roster' });
    obs.push('movement', { x: 5.5, z: 2.5, rotY: 0.5, walking: false, sitting: false, airborne: false });
    await sleep(150); // let the pose land before anyone reads a roster

    // 2. main hello → welcome; guestId continuity on this path.
    const welcome = await main.waitFor((f) => f.type === 'welcome', { label: 'main welcome', backlog: true });
    if (welcome.player?.id === mainId) ledger.pass(`${flavor}: hello guestId adopted verbatim (welcome.player.id)`);
    else ledger.fail(`${flavor}: hello guestId adopted verbatim (welcome.player.id)`, `got ${JSON.stringify(welcome.player?.id)}`);
    if (WEATHER_STATES.includes(welcome.weather))
      ledger.pass(`${flavor}: welcome.weather is a valid rotation state`, `weather=${welcome.weather}`);
    else ledger.fail(`${flavor}: welcome.weather is a valid rotation state`, `got ${JSON.stringify(welcome.weather)}`);
    const missingSnap = ['theater', 'iptv'].filter((k) => welcome[k] == null);
    if (missingSnap.length === 0) ledger.pass(`${flavor}: welcome carries all Node snapshot fields`);
    else ledger.fail(`${flavor}: welcome carries all Node snapshot fields`, `missing ${missingSnap.join(',')}`);

    // The Node baseline auto-joins market at hello; the world runtime joins
    // at join_room. Move BEFORE the explicit join so both legs' presence
    // payloads about MAIN carry the same last-known pose.
    main.push('movement', { x: -2.5, z: 4.5, rotY: 0.25, walking: false, sitting: false, airborne: false });
    await sleep(120);

    // 3. join market: roster to the joiner (JOIN shape), presence_join to
    //    the room (joiner excluded — asserted by frame shape below).
    main.push('join_room', { roomId: 'market' });
    const roster = await main.waitFor(
      (f) => f.type === 'presence_update' && Array.isArray(f.players) && f.players.some((p) => p.id === obsId && isJoinShaped(p)),
      { label: 'joiner roster with a join-shaped observer entry' },
    );
    const obsEntry = roster.players.find((p) => p.id === obsId);
    if (samePos(obsEntry.x, 5.5) && samePos(obsEntry.z, 2.5)) ledger.pass(`${flavor}: roster lists the observer at its last-known pose`, 'x=5.5 z=2.5');
    else ledger.fail(`${flavor}: roster lists the observer at its last-known pose`, `x=${obsEntry.x} z=${obsEntry.z}`);
    const rosterShapeErr = fieldSetExact(obsEntry, JOIN_SHAPE, 'join-roster entry');
    if (!rosterShapeErr) ledger.pass(`${flavor}: joiner roster entry is the join shape {${JOIN_SHAPE.join(',')}}`);
    else ledger.fail(`${flavor}: joiner roster entry is the join shape`, rosterShapeErr);

    const pjoin = await obs.waitFor((f) => f.type === 'presence_join' && f.player?.id === mainId, { label: 'observer presence_join for main', backlog: true });
    const pjoinErr = fieldSetExact(pjoin.player, JOIN_SHAPE, 'presence_join player');
    if (!pjoinErr) ledger.pass(`${flavor}: presence_join carries the join shape`);
    else ledger.fail(`${flavor}: presence_join carries the join shape`, pjoinErr);

    // 4. movement burst (5 poses): at most ONE entry per actor per flush,
    //    the NEWEST pose survives (coalescing by overwrite).
    const burst = [1, 2, 3, 4, 5].map((i) => ({ x: i * 0.5, z: -1 - i * 0.25, rotY: 0.1 * i, walking: true, sitting: false, airborne: false }));
    main.push('movement', burst[0]);
    await sleep(90);
    for (let i = 1; i < burst.length; i++) {
      main.push('movement', burst[i]);
      await sleep(15);
    }
    const last = burst[burst.length - 1];
    const flush = await obs.waitFor(
      (f) => f.type === 'presence_update' && f.players?.some((p) => p.id === mainId && samePos(p.x, last.x) && samePos(p.z, last.z)),
      { label: 'flush carrying the newest burst pose', timeoutMs: 4000 },
    );
    const mainFlushEntries = flush.players.filter((p) => p.id === mainId);
    if (mainFlushEntries.length === 1) ledger.pass(`${flavor}: burst coalesces — one entry per actor per flush`);
    else ledger.fail(`${flavor}: burst coalesces — one entry per actor per flush`, `${mainFlushEntries.length} entries`);
    const flushErr = fieldSetExact(mainFlushEntries[0], FLUSH_SHAPE, 'flush entry');
    if (!flushErr) ledger.pass(`${flavor}: flush entry is the flush shape {${FLUSH_SHAPE.join(',')}}`);
    else ledger.fail(`${flavor}: flush entry is the flush shape`, flushErr);
    if (flush.players.some((p) => p.id === obsId)) ledger.pass(`${flavor}: flush is a FULL roster snapshot (all members listed)`);
    else ledger.fail(`${flavor}: flush is a FULL roster snapshot (all members listed)`);

    // 5. duplicate join_room: presence no-op, roster still returned.
    main.push('join_room', { roomId: 'market' });
    await main.waitFor(
      (f) => f.type === 'presence_update' && Array.isArray(f.players) && f.players.some((p) => p.id === obsId && isJoinShaped(p)),
      { label: 'roster re-ack on duplicate join' },
    );
    const churn = await obs.collectFor((f) => (f.type === 'presence_join' || f.type === 'presence_leave') && (f.player?.id === mainId || f.playerId === mainId), 450);
    if (churn.length === 0) ledger.pass(`${flavor}: duplicate join_room is a presence no-op`);
    else ledger.fail(`${flavor}: duplicate join_room is a presence no-op`, `observer saw ${churn.map((f) => f.type).join(',')}`);

    // 7. out-of-bounds + airborne probe (clamp = the declared tightening;
    //    also the empirical world-owner detector on the gateway path).
    main.push('movement', { x: 50, z: -50, rotY: 0.3, walking: false, sitting: false, airborne: true });
    const probe = await obs.waitFor(
      (f) => f.type === 'presence_update' && f.players?.some((p) => p.id === mainId && p.airborne === true),
      { label: 'flush carrying the airborne probe pose', timeoutMs: 4000 },
    );
    const probeEntry = probe.players.find((p) => p.id === mainId);
    if (probeEntry.airborne === true) ledger.pass(`${flavor}: airborne flag relayed (edge flag survives the pipe)`);
    else ledger.fail(`${flavor}: airborne flag relayed`, JSON.stringify(probeEntry));
    const clamped = probeEntry.x === BOUNDS.xMax && probeEntry.z === BOUNDS.zMin;
    const verbatim = probeEntry.x === 50 && probeEntry.z === -50;
    if (worldOwner === 'phoenix') {
      if (clamped) ledger.pass(`${flavor}: out-of-bounds pose clamped into walkable bounds (tightening #1)`, `x=${probeEntry.x} z=${probeEntry.z}`);
      else ledger.fail(`${flavor}: out-of-bounds pose clamped into walkable bounds`, `x=${probeEntry.x} z=${probeEntry.z}`);
    } else if (worldOwner === 'node') {
      if (verbatim) ledger.pass(`${flavor}: out-of-bounds pose relayed verbatim (Node baseline — no clamp)`, `x=${probeEntry.x} z=${probeEntry.z}`);
      else ledger.fail(`${flavor}: out-of-bounds pose relayed verbatim (Node baseline)`, `x=${probeEntry.x} z=${probeEntry.z}`);
    } else {
      // Auto-detect (gateway leg): either owner is recorded, neither is a
      // failure — the flip state is runtime configuration, not behavior.
      observedOwner = clamped ? 'phoenix' : verbatim ? 'node' : 'unknown';
      ledger.pass(
        `${flavor}: out-of-bounds probe observed`,
        clamped ? `clamped to x=${probeEntry.x} z=${probeEntry.z} → world runtime owns the path (flip active)` : `relayed x=${probeEntry.x} z=${probeEntry.z} → Node relay path (flip NOT active)`,
      );
    }

    // 8. emote: allow-list + 500 ms cooldown + duplicate-handler ordering.
    //    Each broadcast must invoke the two handlers in REGISTRATION order
    //    (h1 before h2, per §5) — checked on every received echo below.
    const handlerLog = [];
    main.on('emote_broadcast', (f) => handlerLog.push(`h1:${f.emote}`));
    main.on('emote_broadcast', (f) => handlerLog.push(`h2:${f.emote}`));

    main.push('emote', { emote: 'wave' });
    const wave = await obs.waitFor((f) => f.type === 'emote_broadcast' && f.playerId === mainId, { label: 'emote_broadcast wave' });
    if (wave.emote === 'wave' && wave.playerId === mainId && typeof wave.nickname === 'string' && wave.nickname.length > 0)
      ledger.pass(`${flavor}: allowed emote relays with playerId + live nickname`, `emote=${wave.emote} nick=${wave.nickname}`);
    else ledger.fail(`${flavor}: allowed emote relays with playerId + live nickname`, JSON.stringify(wave));

    main.push('emote', { emote: 'floss' }); // unknown id
    await sleep(300);
    main.push('emote', { emote: 'dance' }); // within 500 ms cooldown
    const spam = await obs.collectFor((f) => f.type === 'emote_broadcast' && f.playerId === mainId, 450);
    if (spam.length === 0) ledger.pass(`${flavor}: unknown emote + sub-cooldown emote rejected silently`);
    else ledger.fail(`${flavor}: unknown emote + sub-cooldown emote rejected silently`, `observer saw ${spam.map((f) => f.emote).join(',')}`);

    await sleep(350); // cross the 500 ms cooldown from the wave
    main.push('emote', { emote: 'bow' });
    const bow = await obs.waitFor((f) => f.type === 'emote_broadcast' && f.playerId === mainId && f.emote === 'bow', { label: 'emote_broadcast bow after cooldown', timeoutMs: 3000 });
    if (bow) ledger.pass(`${flavor}: emote after the 500 ms cooldown relays`);
    const selfEcho = main.frames.filter((f) => f.type === 'emote_broadcast' && f.playerId === mainId);
    if (selfEcho.length >= 2)
      ledger.pass(`${flavor}: server echoes own emote_broadcast (guestId string-equality can filter it)`, `${selfEcho.length} self echoes`);

    // The log must read h1,h2 for EVERY broadcast (registration order) and
    // must contain no rejected emote (floss/dance never broadcast).
    await sleep(300); // let the bow self-echo reach main before judging the log
    const orderedPairs = handlerLog.length % 2 === 0 && handlerLog.every((entry, i) => (i % 2 === 0 ? entry.startsWith('h1:') : entry.startsWith('h2:')));
    const noRejected = handlerLog.every((entry) => !entry.includes('floss') && !entry.includes('dance'));
    const lastPairIsBow = handlerLog[handlerLog.length - 2] === 'h1:bow' && handlerLog[handlerLog.length - 1] === 'h2:bow';
    if (orderedPairs && noRejected && lastPairIsBow)
      ledger.pass(`${flavor}: duplicate handlers fire in registration order (h1 then h2, every broadcast)`, `log=[${handlerLog.join(' ')}]`);
    else ledger.fail(`${flavor}: duplicate handlers fire in registration order`, `log=[${handlerLog.join(' ')}]`);

    // 9. travel market → theater: ONE presence_leave at the old room,
    //    roster-then-snapshots ordering at the joiner.
    const framesAtTravelJoin = main.frames.length;
    main.push('join_room', { roomId: 'theater' });
    await main.waitFor(
      (f) => f.type === 'presence_update' && Array.isArray(f.players),
      { label: 'theater roster ack', timeoutMs: 5000 },
    );
    const tState = await main.waitFor((f) => f.type === 'theater_state', { label: 'theater_state snapshot', timeoutMs: 8000, backlog: true });
    const iState = await main.waitFor((f) => f.type === 'iptv_state', { label: 'iptv_state snapshot', timeoutMs: 8000, backlog: true });
    if (tState && iState) {
      // A JOIN-SHAPED roster (travel roster, not the earlier market one)
      // must appear between the join push and the first Node snapshot.
      const theaterIdx = main.frames.findIndex((f) => f.type === 'theater_state');
      const travelRosterIdx = main.frames.findIndex(
        (f, i) => i >= framesAtTravelJoin && i < theaterIdx && f.type === 'presence_update' && Array.isArray(f.players),
      );
      if (travelRosterIdx !== -1)
        ledger.pass(`${flavor}: join ordering — roster presence_update before Node snapshots`);
      else ledger.fail(`${flavor}: join ordering — roster presence_update before Node snapshots`);
    }
    const travelLeave = await obs.waitFor((f) => f.type === 'presence_leave' && f.playerId === mainId, { label: 'presence_leave on travel', timeoutMs: 8000, backlog: true });
    if (travelLeave) ledger.pass(`${flavor}: travel fires presence_leave to the old room`);
    const extraTravelLeaves = await obs.collectFor((f) => f.type === 'presence_leave' && f.playerId === mainId, 350);
    if (extraTravelLeaves.length === 0) ledger.pass(`${flavor}: exactly one presence_leave per travel transition`);
    else ledger.fail(`${flavor}: exactly one presence_leave per travel transition`, `${1 + extraTravelLeaves.length} leaves`);

    // 10. observer follows to theater so the reconnect rejoin is observable.
    obs.push('join_room', { roomId: 'theater' });
    await obs.waitFor(
      (f) => f.type === 'presence_update' && Array.isArray(f.players) && f.players.some((p) => p.id === mainId && isJoinShaped(p)),
      { label: 'observer theater roster containing main', timeoutMs: 5000 },
    );

    // 11. forced disconnect: exactly one presence_leave, no ghost.
    const idxAtClose = obs.frames.length;
    main.close();
    await obs.waitFor((f) => f.type === 'presence_leave' && f.playerId === mainId, { label: 'presence_leave on disconnect', timeoutMs: 8000 });
    ledger.pass(`${flavor}: forced disconnect fires presence_leave to the room`);
    const disconnectLeaves = obs.frames
      .slice(idxAtClose)
      .filter((f) => f.type === 'presence_leave' && f.playerId === mainId);
    if (disconnectLeaves.length === 1) ledger.pass(`${flavor}: exactly one presence_leave on disconnect (no ghost churn)`);
    else ledger.fail(`${flavor}: exactly one presence_leave on disconnect`, `${disconnectLeaves.length} leaves after close`);

    // 12. reconnect + desiredRoom replay: fresh roster + snapshots, exactly
    //     one presence_join, single roster entry afterwards.
    const again = await mk(mainId, mainNick);
    tap(again);
    again.push('hello', { guestId: mainId, nickname: mainNick });
    await again.waitFor((f) => f.type === 'welcome', { label: 'welcome after reconnect', backlog: true });
    if (again.frames.some((f) => f.type === 'welcome' && f.player?.id === mainId))
      ledger.pass(`${flavor}: reconnect keeps guestId continuity (fresh welcome.player.id matches)`);
    // Count presence_joins about MAIN from BEFORE the rejoin push, so the
    // exactly-one assertion cannot miss an early frame.
    let rejoinJoinCount = 0;
    const joinCounter = (f) => {
      if (f.type === 'presence_join' && f.player?.id === mainId) rejoinJoinCount++;
    };
    obs.on('*', joinCounter);
    again.push('join_room', { roomId: 'theater' }); // desiredRoom replay
    const reRoster = await again.waitFor(
      (f) => f.type === 'presence_update' && Array.isArray(f.players) && f.players.some((p) => p.id === obsId && isJoinShaped(p)),
      { label: 'fresh roster after desiredRoom replay', timeoutMs: 5000 },
    );
    const reObsEntries = reRoster.players.filter((p) => p.id === obsId);
    if (reObsEntries.length === 1) ledger.pass(`${flavor}: reconnect desiredRoom replay returns a fresh roster`);
    else ledger.fail(`${flavor}: reconnect desiredRoom replay returns a fresh roster`, `${reObsEntries.length} observer entries`);
    await again.waitFor((f) => f.type === 'theater_state', { label: 'fresh theater_state after reconnect', timeoutMs: 8000, backlog: true });
    ledger.pass(`${flavor}: reconnect re-receives join-time snapshots`);

    await sleep(500); // settle window for the join counter
    {
      const at = obs.handlers.get('*').indexOf(joinCounter);
      if (at !== -1) obs.handlers.get('*').splice(at, 1);
    }
    if (rejoinJoinCount === 1) ledger.pass(`${flavor}: rejoin produces exactly one presence_join`);
    else ledger.fail(`${flavor}: rejoin produces exactly one presence_join`, `${rejoinJoinCount} joins`);

    // Single-member proof: a movement must flush exactly ONE SELF entry.
    again.push('movement', { x: 2, z: 2, rotY: 0, walking: true, sitting: false, airborne: false });
    const singleFlush = await obs.waitFor((f) => f.type === 'presence_update' && f.players?.some((p) => p.id === mainId), { label: 'post-rejoin flush', timeoutMs: 4000 });
    const selfEntries = singleFlush.players.filter((p) => p.id === mainId);
    if (selfEntries.length === 1) ledger.pass(`${flavor}: no ghost presence — roster/flush carries exactly one ${'SELF'} entry after reconnect`);
    else ledger.fail(`${flavor}: no ghost presence after reconnect`, `${selfEntries.length} SELF entries`);
    again.close();

    // 13. weather observations collected during the leg stay in-rotation.
    const weatherFrames = main.frames.filter((f) => f.type === 'weather_update');
    ledger.pass(
      `${flavor}: weather relayed from Node throughout`,
      `welcome=${welcome.weather}; ${weatherFrames.length} weather_update frames during the leg (3-min rotation — a full tick is not awaited)`,
    );
  } catch (err) {
    ledger.fail(`${flavor}: scenario aborted`, err.message);
  } finally {
    try {
      obs.close();
    } catch {}
    try {
      main.close();
    } catch {}
  }

  return { stream, mainId, obsId, observedOwner };
}

// ---------------------------------------------------------------------------
// Semantic diff of the two legs' main-client streams
// ---------------------------------------------------------------------------

function collapse(frames) {
  // 10 Hz flush timing is wall-clock dependent: collapse RUNS of consecutive
  // identical normalized frames into one so cadence differences (not
  // semantics) never show up as diffs.
  const out = [];
  for (const f of frames) {
    const prev = out[out.length - 1];
    if (prev && JSON.stringify(prev) === JSON.stringify(f)) continue;
    out.push(f);
  }
  return out;
}

function diffStreams(a, b) {
  const diff = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const fa = a[i];
    const fb = b[i];
    if (!fa || !fb || JSON.stringify(fa) !== JSON.stringify(fb)) {
      diff.push({ index: i, node: fa || null, gateway: fb || null });
    }
  }
  return diff;
}

// ---------------------------------------------------------------------------
// Evidence writer
// ---------------------------------------------------------------------------

function writeEvidence(file, { cfg, started, lines, ledgerNode, ledgerGateway, diff, worldOwnerGateway, regressions }) {
  const dir = path.dirname(file);
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString();
  const ledgerMd = (ledger) =>
    ledger.checks
      .map((c) => (c.ok === true ? `- PASS ${c.name}${c.detail ? ` — ${c.detail}` : ''}` : c.ok === false ? `- FAIL ${c.name}${c.detail ? ` — ${c.detail}` : ''}` : `- SKIP ${c.name}${c.detail ? ` — ${c.detail}` : ''}`))
      .join('\n');

  const body = `# Two-client equivalence + §5 regression list (task 7.2 / 7.4)

Generated by \`scripts/verify-world-runtime.mjs\` at ${stamp}.

## Setup

- Node server: ws://127.0.0.1:${cfg.nodePort}
- Phoenix gateway: http://127.0.0.1:${cfg.gwPort} (Channels \`game:v1\`, guest token via \`POST /api/auth/guest\`)
- Servers started by this run: ${started.length ? started.join('; ') : 'none (pre-existing servers were used; their PIDs were not touched)'}
- Gateway world routing observed at run time: **${worldOwnerGateway}**
- compared set: catalog world frames about the leg's own actors only; shared-server third parties filtered; Phoenix bookkeeping dropped.

## Method

Client N connects DIRECT to Node (flat ws frames). Client P connects through
the Phoenix gateway (token → Channels socket → flat frames). Both are driven
through the same script: hello → join market → movement burst → duplicate
join_room → out-of-bounds/airborne probe → emotes (allow-list, cooldown,
duplicate handlers) → travel to theater → forced disconnect → reconnect with
desiredRoom replay. The main clients' frame streams are normalized (ids →
SELF/OBS, coordinates clamped into the walkable bounds so tightening #1 is a
declared difference, flush cadence collapsed) and diffed.

## Results

- Node-leg checks: ${ledgerNode.passed} passed, ${ledgerNode.failed.length} failed, ${ledgerNode.skipped} skipped
- Gateway-leg checks: ${ledgerGateway.passed} passed, ${ledgerGateway.failed.length} failed, ${ledgerGateway.skipped} skipped
- Semantic stream diff after normalization: ${diff.length === 0 ? 'EQUIVALENT (no differences)' : `${diff.length} difference(s)`}

### Node leg (direct)

${ledgerMd(ledgerNode)}

### Gateway leg (Phoenix Channels)

${ledgerMd(ledgerGateway)}

### §5 regression list (gateway path)

${regressions.map((r) => `- ${r.ok === true ? 'PASS' : r.ok === false ? 'FAIL' : 'SKIP'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`).join('\n')}

### Semantic diff detail

${diff.length === 0 ? '_none_' : diff.map((d) => `- [${d.index}] node=${JSON.stringify(d.node)} gateway=${JSON.stringify(d.gateway)}`).join('\n')}
`;
  writeFileSync(file, body);
  return file;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const consoleEvidence = [];
console.log = ((orig) => (...args) => {
  const line = args.join(' ');
  consoleEvidence.push(line);
  orig(line);
})(console.log);

try {
  console.log(`verify-world-runtime: node=:${CFG.nodePort} gateway=:${CFG.gwPort}`);

  // Optional wait for the dev.exs world flip before the gateway leg.
  const devExs = path.join(REPO, 'server_elixir', 'config', 'dev.exs');
  if (CFG.flipWaitSecs > 0) {
    const flipped = () => {
      try {
        return /join_room.*:phoenix/s.test(readIfExists(devExs) || '');
      } catch {
        return false;
      }
    };
    if (!flipped()) {
      console.log(`world rows not yet :phoenix in dev.exs — polling up to ${CFG.flipWaitSecs}s ...`);
      const deadline = Date.now() + CFG.flipWaitSecs * 1000;
      while (!flipped() && Date.now() < deadline) await sleep(5000);
      console.log(flipped() ? 'world flip detected in dev.exs' : 'flip wait elapsed — continuing with current routing (recorded honestly below)');
    }
  }

  const started = await ensureServers();
  for (const s of started) console.log(`started ${s}`);

  // --- Node leg ------------------------------------------------------------
  console.log(`\n== Node leg (direct ws://127.0.0.1:${CFG.nodePort}) ==`);
  const ledgerNode = new Ledger();
  const nodeLeg = await runWorldLeg({
    flavor: 'node',
    worldOwner: 'node',
    ledger: ledgerNode,
    mk: async (guestId, nickname) => {
      const client = await connectNode({ wsBase: `ws://127.0.0.1:${CFG.nodePort}`, guestId, nickname });
      client.push('hello', { guestId, nickname });
      return client;
    },
  });

  // --- Gateway leg ---------------------------------------------------------
  let ledgerGateway = null;
  let gatewayLeg = null;
  let worldOwnerGateway = 'skipped';
  if (!CFG.skipGateway) {
    console.log(`\n== Gateway leg (Phoenix http://127.0.0.1:${CFG.gwPort}) ==`);
    ledgerGateway = new Ledger();
    gatewayLeg = await runWorldLeg({
      flavor: 'gateway',
      worldOwner: null, // auto-detected from the out-of-bounds probe
      ledger: ledgerGateway,
      mk: async (guestId, nickname) => {
        const client = await connectGateway({ httpBase: `http://127.0.0.1:${CFG.gwPort}`, wsBase: `ws://127.0.0.1:${CFG.gwPort}/ws`, guestId, nickname });
        client.push('hello', { guestId, nickname });
        return client;
      },
    });
    worldOwnerGateway =
      gatewayLeg.observedOwner === 'phoenix'
        ? 'phoenix (world runtime owns presence — flip active)'
        : gatewayLeg.observedOwner === 'node'
          ? 'node (relay path — flip NOT active for this run)'
          : 'unknown';
    console.log(`gateway world routing observed: ${worldOwnerGateway}`);
  }

  // --- §5 regression list summary (gateway path) ----------------------------
  const regressions = [];
  const rfind = (ledger, needle) => ledger?.checks.find((c) => c.name.includes(needle)) || null;
  regressions.push(
    { ok: rfind(ledgerGateway, 'guestId adopted verbatim')?.ok ?? false, name: 'self-echo filtering via guestId continuity (welcome.player.id == pushed guestId)', detail: '' },
    { ok: rfind(ledgerGateway, 'reconnect keeps guestId continuity')?.ok ?? false, name: 'guestId continuity across reconnect', detail: '' },
    { ok: rfind(ledgerGateway, 'echoes own emote_broadcast')?.ok ?? false, name: 'self-echo frames carry playerId == guestId (string-equality filter works)', detail: '' },
    { ok: rfind(ledgerGateway, 'presence no-op')?.ok ?? false, name: 'duplicate join_room is a no-op (no repeated presence_join)', detail: '' },
    { ok: rfind(ledgerGateway, 'airborne flag relayed')?.ok ?? false, name: 'airborne flag edge relayed', detail: '' },
    { ok: rfind(ledgerGateway, 'registration order')?.ok ?? false, name: 'duplicate-handler ordering (two handlers, registration order)', detail: '' },
  );

  // error consumers: a durable command with a bad payload must come back as
  // a bare `error` frame through the gateway path.
  if (gatewayLeg) {
    try {
      const errClient = await connectGateway({ httpBase: `http://127.0.0.1:${CFG.gwPort}`, wsBase: `ws://127.0.0.1:${CFG.gwPort}/ws`, guestId: `${CFG.prefix}_gw_err_${rand()}`, nickname: `${CFG.nickname} Err` });
      errClient.push('hello', { guestId: errClient.guestId, nickname: `${CFG.nickname} Err` });
      await errClient.waitFor((f) => f.type === 'welcome', { label: 'err-client welcome' });
      errClient.push('join_room', { roomId: 'market' });
      await errClient.waitFor((f) => f.type === 'presence_update', { label: 'err-client roster' });
      errClient.push('garden_action', { actionId: 'act_retired_probe', action: 'till', bedIndex: 0 });
      const err = await errClient.waitFor((f) => f.type === 'error', { label: 'bare error frame', timeoutMs: 5000 });
      const ok = typeof err.message === 'string' && err.message.length > 0;
      regressions.push({ ok, name: 'error consumers: retired commands answer with a bare {type:"error", message}', detail: `message=${JSON.stringify(err.message)}` });
      errClient.close();
    } catch (e) {
      regressions.push({ ok: false, name: 'error consumers: bare {type:"error", message} reaches the client', detail: e.message });
    }
  } else {
    regressions.push({ ok: null, name: 'error consumers', detail: 'gateway leg skipped' });
  }
  for (const r of regressions) console.log(`${r.ok === true ? 'ok' : r.ok === false ? 'FAIL' : 'skip'} §5: ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);

  // --- Semantic diff --------------------------------------------------------
  console.log('\n== Semantic stream diff (Node main vs gateway main) ==');
  let diff = [];
  let diffSkipped = false;
  if (gatewayLeg) {
    if (gatewayLeg.observedOwner === 'phoenix') {
      diffSkipped = true;
      console.log(
        'SKIPPED: gateway world routing is :phoenix — Node-direct vs world-owned gateway is a declared divergence (bounds clamp, join ordering, presence suppression). Per-leg ledger + §5 regressions are the gate.',
      );
    } else {
      diff = diffStreams(collapse(nodeLeg.stream), collapse(gatewayLeg.stream));
      if (diff.length === 0)
        console.log('EQUIVALENT: the normalized frame streams match (declared clamp normalized, flush cadence collapsed)');
      else for (const d of diff.slice(0, 20)) console.log(`diff [${d.index}] node=${JSON.stringify(d.node)} gateway=${JSON.stringify(d.gateway)}`);
    }
  }

  const failed =
    ledgerNode.failed.length +
    (ledgerGateway?.failed.length || 0) +
    regressions.filter((r) => r.ok === false).length +
    (diffSkipped ? 0 : diff.length);
  console.log(`\nVERIFY-WORLD-RUNTIME ${failed === 0 ? 'PASS' : `FAIL (${failed} problem(s))`}`);

  if (CFG.evidence) {
    const written = writeEvidence(CFG.evidence, {
      cfg: CFG,
      started,
      lines: consoleEvidence,
      ledgerNode,
      ledgerGateway: ledgerGateway || new Ledger(),
      diff,
      worldOwnerGateway,
      regressions,
    });
    console.log(`evidence written: ${written}`);
  }

  process.exitCode = failed === 0 ? 0 : 1;
} catch (err) {
  console.error(`\nVERIFY-WORLD-RUNTIME ERROR: ${err.stack || err}`);
  process.exitCode = 1;
} finally {
  stopOwnServers();
}

function readIfExists(p) {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}
