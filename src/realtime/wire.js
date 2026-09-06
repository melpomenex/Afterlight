// wireRealtime — the live integration of the binary data plane behind the
// rt flags (openspec: add-realtime-live-wiring). Defaults OFF: with no flags
// this is never called and the game is byte-identical to the legacy path.
//
// What it does when realtime_binary is on:
//   - advertises capabilities in hello (additive `rt` field; legacy servers
//     ignore unknown fields and stay fully JSON);
//   - routes socket binary frames into the RealtimePipeline;
//   - feeds the pipeline's output into the EXISTING RemotePlayersManager
//     (setPlayer/removePlayer — the legacy renderer contract, unchanged);
//   - disarms itself when the server's welcome carries no `rt` reply
//     (no binary peer → pure legacy traffic, zero overhead beyond hello);
//   - resets the pipeline on room re-join and triggers a re-join on resync.
//
// Coexistence rule: a binary-speaking server stops JSON presence for
// negotiating clients; if both arrive anyway the data is identical and
// last-write-wins is harmless (documented in the wiring change).

import { resolveFlags } from './flags.js';
import { RealtimePipeline } from './pipeline.js';
import { buildHelloRt, parseWelcomeRt } from '../../shared/realtime/negotiation.js';
import { MSG_TYPES } from '../../shared/protocol.js';

export function wireRealtime({ net, remotePlayers, flags = null, maxSlots = 65536 } = {}) {
  const rtFlags = flags ?? resolveFlags();
  if (!rtFlags.realtime_binary) return null;

  const pipeline = new RealtimePipeline({
    flags: rtFlags,
    maxSlots,
    handlers: {
      onEntry: (e) => remotePlayers.setPlayer(e),
      onJoin: (j) => remotePlayers.setPlayer({
        id: j.guestId ?? j.id, x: j.x, z: j.z, rotY: j.yaw,
        walking: false, sitting: false, airborne: false,
      }),
      onLeave: (id) => remotePlayers.removePlayer(id),
      onResync: () => {
        // fresh snapshot: replay the desired-room join (existing reconnect
        // semantics — no new message types)
        if (net.desiredRoom) net.send(MSG_TYPES.JOIN_ROOM, { roomId: net.desiredRoom });
      },
    },
  });

  net.handleBinary = (data) => pipeline.feedBinary(data);
  net.rtHello = buildHelloRt({ webgpu: rtFlags.renderer_webgpu_fastpath, wasm: rtFlags.realtime_wasm });

  // Disarm when the server does not speak the binary protocol.
  net.on('welcome', (msg) => {
    if (parseWelcomeRt(msg)) return;
    net.handleBinary = null;
    net.rtHello = null;
    pipeline.dispose();
  });

  // Room travel resets pipeline state (slots, baselines, id maps) — wrap
  // send once so any join_room replay clears stale entities.
  const rawSend = net.send.bind(net);
  net.send = (type, payload) => {
    if (type === MSG_TYPES.JOIN_ROOM && pipeline) pipeline.reset();
    rawSend(type, payload);
  };

  return pipeline;
}
