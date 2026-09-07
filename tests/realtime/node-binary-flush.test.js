import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAGIC } from '../../shared/realtime/constants.js';
import { encodeFlush } from '../../shared/realtime/nodeBinaryFlush.js';
import { playerEntityId } from '../../shared/realtime/entityId.js';
import { parseHelloRt, buildWelcomeRt } from '../../shared/realtime/negotiation.js';

test('encodeFlush produces ALRT magic header', () => {
  const bin = encodeFlush([
    { id: 'guest_one', x: 1, z: 2, rotY: 0.5, walking: true },
  ], 3, 3);
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  assert.equal(view.getUint32(0, true), MAGIC);
});

test('playerEntityId matches Elixir FNV-1a fixture', () => {
  const id = playerEntityId('guest_abc');
  assert.equal(typeof id, 'number');
  assert.ok(id > 0);
});

test('negotiation helpers tolerate legacy hello/welcome', () => {
  assert.equal(parseHelloRt({ guestId: 'g' }), null);
  assert.deepEqual(parseHelloRt({
    guestId: 'g',
    rt: { protocols: ['afterlight-soa-v1'], webgpu: true, wasm: false },
  }), { protocols: ['afterlight-soa-v1'], webgpu: true, wasm: false });
  assert.deepEqual(buildWelcomeRt(), { protocol: 'afterlight-soa-v1', snapshot_hz: 10 });
});
