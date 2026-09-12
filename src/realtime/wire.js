// wireRealtime — binary data plane + live entity backend (Phases 0–2).
// Default-off via rt flags; legacy JSON presence when seam inactive.

import { resolveFlags } from './flags.js';
import { RealtimePipeline } from './pipeline.js';
import { buildHelloRt, parseWelcomeRt } from '../../shared/realtime/negotiation.js';
import { MSG_TYPES } from '../../shared/protocol.js';
import { createLiveEntitySession } from './liveBackend.js';
import { createLiveInstancedSession } from './gpu/liveInstanced.js';
import { shouldConstructWebGpu } from './gpu/backend.js';
import { playerEntityId } from '../../shared/realtime/entityId.js';
import { createPack } from './worker/core.js';
import { presenceToFlags } from '../../shared/realtime/entityStore.js';

function entitySeamEnabled(flags) {
  return !!(flags.realtime_binary || flags.rt_entity_seam);
}

function presencePlayersToPack(players, guestIds, tick = 0) {
  const pack = createPack(Math.max(8, players.length + 2));
  pack.tick = tick;
  pack.joined = [];
  pack.left = [];
  for (const p of players) {
    if (!p?.id) continue;
    const entityId = p.entityId ?? playerEntityId(p.id);
    if (!guestIds.has(entityId)) {
      pack.joined.push({
        entityId,
        guestId: p.id,
        nickname: p.nickname,
        x: p.x ?? 0,
        z: p.z ?? 0,
        yaw: p.rotY ?? 0,
      });
      guestIds.set(entityId, p.id);
    }
    const row = pack.count++;
    pack.ids[row] = entityId;
    pack.x[row] = p.x ?? 0;
    pack.z[row] = p.z ?? 0;
    pack.yaw[row] = p.rotY ?? 0;
    pack.flags[row] = presenceToFlags(!!p.walking, !!p.sitting, !!p.airborne);
  }
  return pack;
}

export function wireRealtime({
  net,
  remotePlayers,
  guestId = null,
  flags = null,
  maxSlots = 65536,
  scene = null,
} = {}) {
  const rtFlags = flags ?? resolveFlags();
  const seamOn = entitySeamEnabled(rtFlags);
  const binaryOn = !!rtFlags.realtime_binary;

  if (!binaryOn && !seamOn) return null;

  const localGuest = guestId ?? net?.guestId ?? null;
  let entitySession = null;

  if (seamOn) {
    if (shouldConstructWebGpu(rtFlags) && scene) {
      entitySession = createLiveInstancedSession({
        scene,
        remotePlayers,
        guestId: localGuest,
        flags: rtFlags,
        maxSlots: Math.min(maxSlots, 512),
      });
    } else {
      entitySession = createLiveEntitySession({
        remotePlayers,
        guestId: localGuest,
        flags: rtFlags,
      });
    }
    net._rtPresenceBridge = entitySession;
  }

  const pipeline = binaryOn
    ? new RealtimePipeline({
        flags: rtFlags,
        maxSlots,
        handlers: {
          onEntry: (e) => {
            // With the entity seam active the backend owns every remote
            // avatar; the local guest and Kiln stay on the traditional path
            // and are never rendered as remote avatars.
            if (entitySession) return;
            remotePlayers.setPlayer(e);
          },
          onJoin: (j) => {
            if (entitySession) return;
            remotePlayers.setPlayer({
              id: j.guestId ?? j.id,
              x: j.x,
              z: j.z,
              rotY: j.yaw,
              walking: false,
              sitting: false,
              airborne: false,
            });
          },
          onResync: () => {
            entitySession?.clearRemotes?.();
            if (net.desiredRoom) net.send(MSG_TYPES.JOIN_ROOM, { roomId: net.desiredRoom });
          },
          onLeave: (id) => {
            if (!entitySession) remotePlayers.removePlayer(id);
          },
        },
      })
    : null;

  if (pipeline && entitySession) {
    pipeline.consumer.entityBackend = entitySession.backend;
    pipeline.consumer.excludedIds = entitySession.excludedIds;
  }

  if (binaryOn) {
    net.handleBinary = (data) => pipeline.feedBinary(data);
    net.rtHello = buildHelloRt({
      webgpu: rtFlags.renderer_webgpu_fastpath,
      wasm: rtFlags.realtime_wasm,
      // Additive live-flush capability (fix-remote-avatar-flicker): this
      // bundle applies lifecycle-carrying FULL snapshots.
      spawn: true,
    });
  } else if (seamOn) {
    net.rtHello = buildHelloRt({ webgpu: false, wasm: false });
  }

  const presenceTick = { n: 0 };

  function consumePresenceUpdate(msg) {
    if (!entitySession || !Array.isArray(msg.players)) return false;
    const others = msg.players.filter((p) => p?.id && p.id !== localGuest);
    if (binaryOn && pipeline) {
      const pack = presencePlayersToPack(others, pipeline.consumer.guestIds, ++presenceTick.n);
      entitySession.applyDeltaPack(pack, { guestIds: pipeline.consumer.guestIds });
      return true;
    }
    for (const p of others) entitySession.applyPresencePlayer(p);
    return true;
  }

  function consumePresenceJoin(msg) {
    if (!entitySession || !msg.player?.id || msg.player.id === localGuest) return false;
    if (binaryOn && pipeline) {
      const pack = presencePlayersToPack([msg.player], pipeline.consumer.guestIds, ++presenceTick.n);
      entitySession.applyDeltaPack(pack, { guestIds: pipeline.consumer.guestIds });
      return true;
    }
    entitySession.applyPresencePlayer(msg.player);
    return true;
  }

  function consumePresenceLeave(msg) {
    if (!entitySession || !msg.playerId) return false;
    if (binaryOn && pipeline) {
      const entityId = playerEntityId(msg.playerId);
      const pack = createPack(4);
      pack.tick = ++presenceTick.n;
      pack.left = [entityId];
      entitySession.applyDeltaPack(pack, { guestIds: pipeline.consumer.guestIds });
      return true;
    }
    entitySession.removePresencePlayer(msg.playerId);
    return true;
  }

  net.on('welcome', (msg) => {
    if (binaryOn && parseWelcomeRt(msg)) return;
    if (binaryOn) {
      net.handleBinary = null;
      net.rtHello = null;
      pipeline?.dispose();
    }
  });

  if (binaryOn) {
    const rawSend = net.send.bind(net);
    net.send = (type, payload) => {
      if (type === MSG_TYPES.JOIN_ROOM && pipeline) pipeline.reset();
      rawSend(type, payload);
    };
  }

  return {
    pipeline,
    entitySession,
    flags: rtFlags,
    handlesPresence: () => !!entitySession,
    consumePresenceUpdate,
    consumePresenceJoin,
    consumePresenceLeave,
    update: (dt, time) => entitySession?.update(dt, time),
    dispose: () => {
      net._rtPresenceBridge = null;
      pipeline?.dispose();
      entitySession?.dispose();
    },
  };
}
