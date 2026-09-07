// Gate 2.4: P2/P3 field convergence — JS encoder matches landed Phoenix BinaryFlush.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { encodeFlush } from '../../shared/realtime/nodeBinaryFlush.js';
import { MAGIC, HEADER_SIZE } from '../../shared/realtime/constants.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('gate 2.4: compat-report documents landed rt_binary path', () => {
  const md = readFileSync(path.join(REPO, 'docs/architecture/realtime/compat-report.md'), 'utf8');
  assert.match(md, /rt_binary|server_tick|frame_sequence/i, 'post-P2/P3 convergence section present');
  assert.match(md, /room_epoch.*0|P9/i, 'epoch fencing deferred');
});

test('gate 2.4: encodeFlush header fields match contract layout', () => {
  const bin = encodeFlush([
    { id: 'guest_a', x: 0, z: 0, rotY: 0 },
    { id: 'guest_b', x: 1, z: 2, rotY: 0.25, sitting: true },
  ], 10, 7);
  const v = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  assert.equal(v.getUint32(0, true), MAGIC);
  assert.ok(bin.length > HEADER_SIZE);
  assert.equal(v.getUint32(8, true), 0); // room_epoch
  assert.equal(v.getUint32(12, true), 10); // server_tick
  assert.equal(v.getUint32(16, true), 7); // frame_sequence
  assert.equal(v.getUint32(20, true), 6); // baseline_sequence
});
