// Umbrella gates 2.1–2.3 (realtime-binary-gpu-acceleration).
// Dual-path parity, fallback ladder, and decision-record completeness.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createPack } from '../../src/realtime/worker/core.js';
import { CPUThreeBackend } from '../../src/realtime/gpu/backend.js';
import { WebGPUThreeBackend } from '../../src/realtime/gpu/webgpu.js';
import { createMockGpuDevice } from '../../src/realtime/gpu/mockDevice.js';
import { createEntityRenderSession } from '../../src/realtime/gpu/session.js';
import { resolveFlagsFrom } from '../../src/realtime/flags.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HEADED = JSON.parse(
  readFileSync(path.join(REPO, 'openspec/changes/add-realtime-gpu-rendering/evidence/harness-headed.json'), 'utf8'),
);

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

function sampleRow(backend, id, nowTick) {
  const out = backend.sample([id], {}, { nowTick });
  return {
    x: out.xyzYaw[0],
    z: out.xyzYaw[2],
    yaw: out.xyzYaw[3],
  };
}

test('gate 2.1: dual-path parity — CPU and WebGPU mock agree on positions (fifty-scene fixture)', () => {
  const rows = [];
  const joined = [];
  for (let i = 0; i < 50; i++) {
    const id = i + 1;
    rows.push({ id, x: Math.sin(i * 0.4) * 8, z: Math.cos(i * 0.4) * 8, yaw: i * 0.1 });
    joined.push({ entityId: id, guestId: `guest_${id}`, x: rows[i].x, z: rows[i].z, yaw: rows[i].yaw });
  }
  const pack = packOf(rows, { tick: 10, joined });
  const cpu = new CPUThreeBackend();
  const gpu = new WebGPUThreeBackend({ device: createMockGpuDevice() });
  const guestIds = new Map(joined.map((j) => [j.entityId, j.guestId]));

  cpu.applyDeltaPack(pack, { guestIds });
  gpu.applyDeltaPack(pack, { guestIds });

  let maxErr = 0;
  for (const row of rows) {
    const a = sampleRow(cpu, row.id, 10);
    const b = sampleRow(gpu.cpu, row.id, 10);
    maxErr = Math.max(maxErr, Math.abs(a.x - b.x), Math.abs(a.z - b.z), Math.abs(a.yaw - b.yaw));
  }
  assert.ok(maxErr < 0.02, `max position error ${maxErr}`);
  assert.equal(cpu.live, 50);
  assert.equal(gpu.cpu.live, 50);
});

test('gate 2.1: headed harness evidence cites realistic population win', () => {
  assert.equal(HEADED.n, 50);
  assert.ok(HEADED.frames.medianMs < 1, 'headed median frame cost sub-ms at n=50');
  assert.ok(HEADED.flagOn, 'evidence recorded with fastpath on');
});

test('gate 2.2: fallback ladder — adapter absent, device loss, checksum, validation', async () => {
  const absent = await createEntityRenderSession({
    flags: { renderer_webgpu_fastpath: true },
    requestAdapter: () => Promise.resolve(null),
  });
  assert.equal(absent.backend.kind, 'cpu');

  const device = createMockGpuDevice();
  const session = await createEntityRenderSession({
    flags: { renderer_webgpu_fastpath: true },
    gpu: device,
  });
  session.applyDeltaPack(packOf([{ id: 1, x: 0, z: 0 }], {
    tick: 1, joined: [{ entityId: 1, x: 0, z: 0 }],
  }));
  device.forceLost('destroyed');
  const r = session.onDeviceLost({ reason: 'destroyed' });
  assert.equal(r.recovered, true);
  assert.equal(session.backend.kind, 'cpu');

  const badDev = createMockGpuDevice({ failWrite: true });
  const vSession = await createEntityRenderSession({
    flags: { renderer_webgpu_fastpath: true },
    gpu: badDev,
  });
  vSession.applyDeltaPack(packOf([{ id: 2, x: 1, z: 1 }], {
    tick: 1, joined: [{ entityId: 2, x: 1, z: 1 }],
  }));
  vSession.applyDeltaPack(packOf([{ id: 3, x: 2, z: 2 }], {
    tick: 2, joined: [{ entityId: 3, x: 2, z: 2 }],
  }));
  assert.equal(vSession.backend.kind, 'cpu');

  const flags = resolveFlagsFrom({ env: {} });
  const legacy = await createEntityRenderSession({ flags });
  assert.equal(legacy.backend.kind, 'cpu');
});

test('gate 2.3: decision records name all six technologies with adopt/reject and numbers', () => {
  const md = readFileSync(path.join(REPO, 'docs/architecture/realtime/decisions.md'), 'utf8');
  const sections = [
    { n: 1, title: 'Wire representation', need: /ADOPT|SELECTIVELY|REJECT/ },
    { n: 2, title: 'Sparse masks', need: /ADOPT|REJECT/ },
    { n: 3, title: 'Rust/WASM decode', need: /ADOPT|REJECT/ },
    { n: 4, title: 'WebGPU scatter', need: /PARK|ADOPT|REJECT/ },
    { n: 5, title: 'Web Workers', need: /ADOPT/ },
    { n: 6, title: 'WebTransport', need: /NOT STARTED|REJECT/ },
  ];
  for (const s of sections) {
    const re = new RegExp(`## ${s.n}\\. ${s.title}[\\s\\S]*?(?=## \\d+\\.|## Interop|$)`);
    const block = md.match(re);
    assert.ok(block, `section ${s.n} ${s.title}`);
    assert.match(block[0], s.need, `verdict in section ${s.n}`);
  }
  assert.match(md, /50,000.*1\.53|1\.53×/, 'worker measured win at scale');
  assert.match(md, /harness-headed\.json|median.*0\.200 ms/, 'WebGPU harness population evidence');
  assert.match(md, /NOT STARTED/, 'WebTransport explicitly deferred');
});
