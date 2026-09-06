// Tests for the live wiring hooks (add-realtime-live-wiring): binary frame
// routing, additive hello capabilities, and legacy neutrality when the fast
// path is off. Uses a real ephemeral WebSocket server (presence-race pattern).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocketServer } from 'ws';
import { NetworkClient } from '../../src/net/client.js';


function startServer() {
  return new Promise((resolve) => {
    const wss = new WebSocketServer({ port: 0 }, () => resolve({ wss, port: wss.address().port }));
  });
}

function detach(net) {
  // stop the reconnect loop so the test process can exit cleanly
  net.scheduleReconnect = () => {};
  net.ws?.close();
}

test('binary frames route to handleBinary; hello carries rt only when set', async () => {
  const { wss, port } = await startServer();
  const seen = { hello: null, binaryFromClient: 0 };
  wss.on('connection', (ws) => {
    ws.on('message', (data, isBinary) => {
      if (isBinary) { seen.binaryFromClient++; return; }
      const msg = JSON.parse(data.toString());
      if (msg.type === 'hello') {
        seen.hello = msg;
        // reply with a binary frame to exercise the client's routing hook
        ws.send(Uint8Array.from([1, 2, 3, 4]), { binary: true });
      }
    });
  });

  const net = new NetworkClient(`ws://127.0.0.1:${port}/ws`);
  let binaryFrames = 0;
  net.handleBinary = () => binaryFrames++;
  net.rtHello = { protocols: ['afterlight-soa-v1'], webgpu: false, wasm: false };
  net.connect();
  await new Promise((r) => setTimeout(r, 300));

  assert.ok(seen.hello, 'hello received');
  assert.deepEqual(seen.hello.rt?.protocols, ['afterlight-soa-v1']);
  assert.equal(binaryFrames, 1, 'binary frame routed to the handler');
  assert.equal(seen.binaryFromClient, 0);
  net.handleBinary = null;
  detach(net);
  wss.close();
});

test('legacy neutrality: without rtHello the hello is unchanged and binary is dropped', async () => {
  const { wss, port } = await startServer();
  const seen = { hello: null };
  wss.on('connection', (ws) => {
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      const msg = JSON.parse(data.toString());
      if (msg.type === 'hello') {
        seen.hello = msg;
        ws.send(Uint8Array.from([9, 9]), { binary: true });
      }
    });
  });

  const net = new NetworkClient(`ws://127.0.0.1:${port}/ws`); // no hooks set
  net.connect();
  await new Promise((r) => setTimeout(r, 300));

  assert.ok(seen.hello);
  assert.equal(seen.hello.rt, undefined, 'no capability field without the fast path');
  detach(net);
  wss.close();
});
