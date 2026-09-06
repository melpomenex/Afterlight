import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createGameServer } from '../server/index.js';
import { Storage } from '../server/storage.js';
import { WebSocket as WsClient } from 'ws';

const SECRET = 'test-boundary-secret';

/**
 * Boundary rule under test (P2 gateway transport, design D5): the Phoenix
 * gateway presents x-afterlight-boundary on its loopback shadow
 * connections. An INVALID secret is rejected (HTTP 403 / refused upgrade);
 * a secret-less request is still accepted so direct-to-Node clients (the
 * rollback path) keep working during P2.
 */
async function listen(envSecret) {
  process.env.AFTERLIGHT_BOUNDARY_SECRET = envSecret;
  process.env.IRC_DISABLED = '1'; // another dev process may hold the IRC port
  // Throwaway state — never touch the developer's live game state.
  const handle = createGameServer(
    new Storage(`/tmp/test-boundary-${Date.now()}-${Math.random().toString(36).slice(2)}.json`),
  );
  await new Promise((resolve) => handle.server.listen(0, '127.0.0.1', resolve));
  const { port } = handle.server.address();
  return {
    handle,
    url: `ws://127.0.0.1:${port}/ws`,
    base: `http://127.0.0.1:${port}`,
  };
}

function fetchStatus(base, headers) {
  return fetch(`${base}/api/health`, { headers }).then((r) => r.status);
}

function wsConnect(url, headers) {
  return new Promise((resolve, reject) => {
    const ws = new WsClient(url, { headers });
    ws.on('open', () => {
      ws.close();
      resolve('open');
    });
    ws.on('error', (err) => reject(err));
  });
}

test('boundary: no secret in env — everything accepted (direct-client rollback path)', async () => {
  const { handle, base, url } = await listen('');
  try {
    assert.equal(await fetchStatus(base, {}), 200);
    assert.equal(await fetchStatus(base, { 'x-afterlight-boundary': 'anything' }), 200);
    assert.equal(await wsConnect(url, {}), 'open');
  } finally {
    handle.close();
  }
});

test('boundary: secret set — valid and absent accepted, invalid rejected (HTTP + upgrade)', async () => {
  const { handle, base, url } = await listen(SECRET);
  try {
    assert.equal(await fetchStatus(base, {}), 200, 'secret-less direct request stays accepted');
    assert.equal(await fetchStatus(base, { 'x-afterlight-boundary': SECRET }), 200, 'valid secret accepted');
    assert.equal(await fetchStatus(base, { 'x-afterlight-boundary': 'wrong' }), 403, 'invalid secret rejected');

    assert.equal(await wsConnect(url, { 'x-afterlight-boundary': SECRET }), 'open');
    assert.equal(await wsConnect(url, {}), 'open', 'secret-less upgrade stays accepted');
    await assert.rejects(
      wsConnect(url, { 'x-afterlight-boundary': 'wrong' }),
      undefined,
      'invalid-secret upgrade refused',
    );
  } finally {
    handle.close();
  }
});

test('boundary: reject path answers before any routing (unknown paths too)', async () => {
  const { handle, base } = await listen(SECRET);
  try {
    const res = await fetch(`${base}/api/definitely-not-a-route`, {
      headers: { 'x-afterlight-boundary': 'wrong' },
    });
    assert.equal(res.status, 403);
  } finally {
    handle.close();
  }
});
