// EntityRenderBackend seam + fallback ladder (add-realtime-gpu-rendering).
// Headless: mock device, no Three.js, no live renderer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { PackConsumer } from '../../src/realtime/consumer.js';
import { createPack } from '../../src/realtime/worker/core.js';
import { resolveFlagsFrom } from '../../src/realtime/flags.js';
import {
  CPUThreeBackend, KILN_ID, createEntityRenderBackend,
  isTraditionalPathEntity, lerpAlpha, shouldConstructWebGpu,
} from '../../src/realtime/gpu/backend.js';
import { WebGPUThreeBackend } from '../../src/realtime/gpu/webgpu.js';
import { EntityRenderSession, createEntityRenderSession } from '../../src/realtime/gpu/session.js';
import { createMockGpuDevice, createMockNavigatorGpu } from '../../src/realtime/gpu/mockDevice.js';
import { packTransformDelta, scatterCpu, checksumXor } from '../../src/realtime/gpu/scatter.js';

function packOf(rows, { tick = 1, joined = [], left = [] } = {}) {
  const pack = createPack(Math.max(8, rows.length));
  pack.tick = tick;
  pack.count = rows.length;
  pack.joined = joined;
  pack.left = left;
  for (let i = 0; i < rows.length; i++) {
    pack.ids[i] = rows[i].id;
    pack.x[i] = rows[i].x;
    pack.z[i] = rows[i].z;
    pack.yaw[i] = rows[i].yaw ?? 0;
    pack.flags[i] = rows[i].flags ?? 0;
  }
  return pack;
}

test('flags: renderer_webgpu_fastpath defaults off and is not implied by other flags', () => {
  const d = resolveFlagsFrom({ env: {} });
  assert.equal(d.renderer_webgpu_fastpath, false);
  assert.equal(shouldConstructWebGpu(d), false);
  assert.equal(shouldConstructWebGpu(resolveFlagsFrom({ search: '?rt_binary=1&rt_wasm=1' })), false);
  assert.equal(shouldConstructWebGpu(resolveFlagsFrom({ search: '?rt_webgpu_fastpath=1' })), true);
});

// Regression guard (fix-remote-avatar-proxies): commit 9658158 turned the
// rejected WebGPU proxy default on in the committed env files, so every live
// remote player rendered as a capsule orb. The default build must stay on the
// full-avatar path; only a per-load runtime opt-in may select the proxies.
function parseEnvFile(url) {
  const out = {};
  for (const line of readFileSync(url, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key) out[key] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

test('committed env defaults keep full avatars: data plane on, WebGPU proxies off', () => {
  const prodFile = existsSync(new URL('../../.env.production', import.meta.url))
    ? '../../.env.production'
    : '../../.env.production.example';
  for (const rel of [prodFile, '../../.env.development']) {
    const env = parseEnvFile(new URL(rel, import.meta.url));
    const flags = resolveFlagsFrom({ env });
    assert.equal(flags.renderer_webgpu_fastpath, false, `${rel} must not enable the rejected proxy default`);
    assert.equal(shouldConstructWebGpu(flags), false, `${rel} must select the full-avatar live session`);
    assert.equal(flags.realtime_binary, true, `${rel} keeps the benchmarked binary data plane on`);
    assert.equal(flags.realtime_wasm, true, `${rel} keeps the WASM decoder on`);
    assert.equal(flags.realtime_worker, true, `${rel} keeps the worker pipeline on`);
  }
});

test('runtime opt-in still selects the experimental proxy path', () => {
  const flags = resolveFlagsFrom({ search: '?rt_webgpu_fastpath=1' });
  assert.equal(flags.renderer_webgpu_fastpath, true);
  assert.equal(shouldConstructWebGpu(flags), true);
});

test('CPUThreeBackend: apply + sample matches pack; kiln and local player excluded', () => {
  const local = 'guest_local';
  const cpu = createEntityRenderBackend({ excludedIds: new Set([local, KILN_ID]) });
  cpu.applyDeltaPack(packOf([
    { id: 10, x: 1, z: 2, yaw: 0.5 },
    { id: 11, x: 3, z: 4, yaw: 1 },
  ], {
    tick: 2,
    joined: [
      { entityId: 10, guestId: 'guest_remote', x: 1, z: 2 },
      { entityId: 11, guestId: local, x: 3, z: 4 },
      { entityId: 12, guestId: KILN_ID, x: 9, z: 9 },
    ],
  }), { guestIds: new Map([[10, 'guest_remote'], [11, local], [12, KILN_ID]]) });
  assert.equal(cpu.live, 1);
  assert.ok(cpu.slotOf.has(10));
  assert.equal(cpu.slotOf.has(11), false);
  assert.equal(cpu.slotOf.has(12), false);
  assert.equal(isTraditionalPathEntity(12, KILN_ID, new Set()), true);
  const out = cpu.sample(null, {}, { nowTick: 2 });
  assert.equal(out.count, 1);
  assert.equal(out.xyzYaw[0], 1);
  assert.equal(out.xyzYaw[2], 2);
});

test('CPUThreeBackend: capacity doubles and recycled slots get a new generation', () => {
  const cpu = new CPUThreeBackend();
  const rows = [];
  for (let i = 0; i < 300; i++) rows.push({ id: i + 1, x: i, z: 0 });
  cpu.applyDeltaPack(packOf(rows, {
    tick: 1,
    joined: rows.map((r) => ({ entityId: r.id, x: r.x, z: r.z })),
  }));
  assert.ok(cpu.capacity >= 300);
  const gen = cpu.generation[cpu.slotOf.get(1)];
  cpu.applyDeltaPack(packOf([], { tick: 2, left: [1] }));
  cpu.applyDeltaPack(packOf([{ id: 1, x: 0, z: 0 }], {
    tick: 3,
    joined: [{ entityId: 1, x: 0, z: 0 }],
  }));
  assert.notEqual(cpu.generation[cpu.slotOf.get(1)], gen);
});

test('consumer calls the seam; onEntry still fires for excluded ids', () => {
  const entries = [];
  const cpu = new CPUThreeBackend({ excludedIds: new Set(['guest_me', KILN_ID]) });
  const consumer = new PackConsumer({
    entityBackend: cpu,
    excludedIds: new Set(['guest_me', KILN_ID]),
    onEntry: (e) => entries.push({ ...e }),
  });
  const pack = packOf([
    { id: 1, x: 5, z: 6 },
    { id: 2, x: 1, z: 1 },
  ], {
    tick: 1,
    joined: [
      { entityId: 1, guestId: 'guest_other', x: 5, z: 6 },
      { entityId: 2, guestId: 'guest_me', x: 1, z: 1 },
    ],
  });
  consumer.consume(pack);
  assert.equal(entries.length, 2);
  assert.equal(cpu.live, 1);
  assert.ok(cpu.slotOf.has(1));
  assert.equal(cpu.slotOf.has(2), false);
});

test('interpolation: positions vary continuously between ticks; arrival time is unused', () => {
  const cpu = new CPUThreeBackend();
  cpu.applyDeltaPack(packOf([{ id: 1, x: 0, z: 0 }], { tick: 10, joined: [{ entityId: 1, x: 0, z: 0 }] }));
  cpu.applyDeltaPack(packOf([{ id: 1, x: 10, z: 0 }], { tick: 11 }));
  const a = cpu.sample([1], {}, { nowTick: 10 });
  const b = cpu.sample([1], {}, { nowTick: 10.5 });
  const c = cpu.sample([1], {}, { nowTick: 11 });
  assert.equal(a.xyzYaw[0], 0);
  assert.ok(b.xyzYaw[0] > 0 && b.xyzYaw[0] < 10);
  assert.equal(c.xyzYaw[0], 10);
  assert.equal(lerpAlpha(10.25, 10, 11), 0.25);
  // A late wall-clock arrival must not be an input — only nowTick (shared clock).
  const late = cpu.sample([1], {}, { nowTick: 10.5, arrivedAt: 99999 });
  assert.equal(late.xyzYaw[0], b.xyzYaw[0]);
});

test('WebGPU mock: one writeBuffer per dirty section; 3000-row pack stays constant', () => {
  const device = createMockGpuDevice();
  const gpu = new WebGPUThreeBackend({ device });
  const rows = [];
  const joined = [];
  for (let i = 0; i < 3000; i++) {
    rows.push({ id: i + 1, x: i, z: i * 0.1, flags: i & 7 });
    joined.push({ entityId: i + 1, x: i, z: i * 0.1 });
  }
  const r = gpu.applyDeltaPack(packOf(rows, { tick: 1, joined }));
  assert.equal(r.applied, true);
  assert.equal(r.writeBufferCalls, 2, 'transform + flags sections');
  assert.equal(r.checksum.passed, true);
  const r2 = gpu.applyDeltaPack(packOf(rows.slice(0, 10), { tick: 2 }));
  assert.equal(r2.writeBufferCalls, 2);
  assert.equal(gpu.cpu.live, 3000);
});

test('checksum mismatch is not presented as applied', () => {
  const gpu = new WebGPUThreeBackend({ device: createMockGpuDevice() });
  gpu._checksumOverride = 0xdeadbeef;
  const r = gpu.applyDeltaPack(packOf([{ id: 1, x: 1, z: 1 }], {
    tick: 1, joined: [{ entityId: 1, x: 1, z: 1 }],
  }));
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'checksum');
});

test('scatterCpu + checksumXor are bit-exact on the packed layout', () => {
  const pos = new Float32Array(16);
  const ids = [2, 0];
  const delta = packTransformDelta(ids, [1, 4], [0, 0], [2, 5], [0.5, 1], 2);
  scatterCpu(pos, delta);
  assert.equal(pos[8], 1);
  assert.equal(pos[10], 2);
  assert.equal(pos[0], 4);
  const xor = checksumXor(pos, 4);
  const again = new Float32Array(pos);
  assert.equal(checksumXor(again, 4), xor);
});

test('device lost rebuilds CPU backend from last acknowledged snapshot', () => {
  const device = createMockGpuDevice();
  const session = new EntityRenderSession({
    backend: new WebGPUThreeBackend({ device }),
  });
  session.backend.onLost = (info) => session.onDeviceLost(info);
  session.applyDeltaPack(packOf([{ id: 7, x: 3, z: 4 }], {
    tick: 4, joined: [{ entityId: 7, x: 3, z: 4 }],
  }));
  assert.equal(session.backend.kind, 'webgpu');
  assert.equal(session.backend.cpu.live, 1);
  device.forceLost('destroyed');
  const r = session.onDeviceLost({ reason: 'destroyed' });
  assert.equal(r.recovered, true);
  assert.equal(session.backend.kind, 'cpu');
  assert.equal(session.backend.live, 1);
  const out = session.sample([7], {}, { nowTick: 4 });
  assert.equal(out.xyzYaw[0], 3);
  assert.equal(out.xyzYaw[2], 4);
});

test('adapter absence and requestDevice failure land on CPU', async () => {
  const absent = await createEntityRenderSession({
    flags: { renderer_webgpu_fastpath: true },
    requestAdapter: () => Promise.resolve(null),
  });
  assert.equal(absent.backend.kind, 'cpu');
  assert.equal(absent.fallbackReason, 'adapter-absent');

  const nav = createMockNavigatorGpu({ rejectAdapter: true });
  const fromNav = await createEntityRenderSession({
    flags: { renderer_webgpu_fastpath: true },
    requestAdapter: () => nav.requestAdapter(),
  });
  assert.equal(fromNav.backend.kind, 'cpu');

  const rejectDev = await createEntityRenderSession({
    flags: { renderer_webgpu_fastpath: true },
    requestAdapter: () => Promise.resolve({
      requestDevice: () => Promise.reject(new Error('requestDevice failed')),
    }),
  });
  assert.equal(rejectDev.backend.kind, 'cpu');
});

test('validation error on write falls back to CPU snapshot', () => {
  const device = createMockGpuDevice({ failWrite: true });
  const session = new EntityRenderSession({
    backend: new WebGPUThreeBackend({ device }),
  });
  session.backend.onLost = (info) => session.onDeviceLost(info);
  session.applyDeltaPack(packOf([{ id: 1, x: 0, z: 0 }], {
    tick: 1, joined: [{ entityId: 1, x: 0, z: 0 }],
  }));
  const r = session.applyDeltaPack(packOf([{ id: 2, x: 8, z: 8 }], {
    tick: 2, joined: [{ entityId: 2, x: 8, z: 8 }],
  }));
  assert.equal(session.backend.kind, 'cpu');
  assert.ok(r.reason === 'validation' || session.fallbackReason === 'validation');
});

test('flag off never constructs WebGPU even when a device is handed in', async () => {
  const session = await createEntityRenderSession({
    flags: { renderer_webgpu_fastpath: false },
    gpu: createMockGpuDevice(),
  });
  assert.equal(session.backend.kind, 'cpu');
});
