import test from 'node:test';
import assert from 'node:assert/strict';

process.env.IRC_PORT = '0';

import { IrcPhoenixAdapter } from '../server/ircAdapter.js';
import { IrcServer } from '../server/irc.js';

test('irc adapter rejects unauthenticated intake when secret is set', () => {
  const adapter = new IrcPhoenixAdapter({
    irc: null,
    callbackUrl: 'http://127.0.0.1:9/unreachable',
    boundarySecret: 'adapter-test-secret',
  });
  const denied = { headers: {}, socket: { remoteAddress: '10.0.0.1' } };
  assert.equal(adapter.rejectsRequest(denied), true);
  const ok = {
    headers: { 'x-afterlight-boundary': 'adapter-test-secret' },
    socket: { remoteAddress: '10.0.0.1' },
  };
  assert.equal(adapter.rejectsRequest(ok), false);
});

test('irc adapter allows loopback without secret in dev', () => {
  const adapter = new IrcPhoenixAdapter({
    irc: null,
    callbackUrl: 'http://127.0.0.1:9/unreachable',
    boundarySecret: null,
  });
  const loopback = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
  assert.equal(adapter.rejectsRequest(loopback), false);
  const remote = { headers: {}, socket: { remoteAddress: '10.0.0.1' } };
  assert.equal(adapter.rejectsRequest(remote), true);
});

test('irc adapter replay delivers exactly once', async () => {
  const irc = new IrcServer();
  await irc.ready;
  const adapter = new IrcPhoenixAdapter({
    irc,
    callbackUrl: 'http://127.0.0.1:9/unreachable',
    boundarySecret: null,
  });
  const event = {
    type: 'chat_relay',
    origin: 'game',
    id: 'replay_test_1',
    from: 'Alice',
    text: 'once',
    action: false,
  };
  const first = adapter.handleInboundEvent(event);
  const second = adapter.handleInboundEvent(event);
  assert.equal(first.ok, true);
  assert.notEqual(first.dropped, true);
  assert.equal(second.dropped, true);
  adapter.destroy();
  irc.close();
});
