// Live game entity backend: full RemotePlayersManager avatars (Phase 2 CPU arm).
// Implements the EntityRenderBackend seam without harness boxes.

import { playerEntityId } from '../../shared/realtime/entityId.js';
import { isTraditionalPathEntity, KILN_ID } from './gpu/backend.js';

export class LiveRemoteBackend {
  constructor({ remotePlayers, excludedIds = null } = {}) {
    this.kind = 'live-remote';
    this.remotePlayers = remotePlayers;
    this.excludedIds = excludedIds ?? new Set();
    this.guestIds = new Map(); // entityId -> guestId string
    this.live = 0;
  }

  ensureCapacity() {
    return this;
  }

  applyDeltaPack(pack, opts = {}) {
    const excluded = opts.excludedIds ?? this.excludedIds;
    const guestIds = opts.guestIds ?? this.guestIds;
    const pending = new Map();

    for (const j of pack.joined ?? []) {
      const entityId = j.entityId ?? playerEntityId(j.guestId ?? j.id);
      const guestId = j.guestId ?? j.id;
      if (isTraditionalPathEntity(entityId, guestId, excluded)) continue;
      if (guestId) guestIds.set(entityId, guestId);
      pending.set(guestId ?? entityId, {
        id: guestId ?? entityId,
        nickname: j.nickname,
        x: j.x ?? 0,
        z: j.z ?? 0,
        rotY: j.yaw ?? j.rotY ?? 0,
        walking: false,
        sitting: false,
        airborne: false,
      });
      this.live++;
    }

    for (const id of pack.left ?? []) {
      const guestId = guestIds.get(id) ?? guestIds.get(Number(id));
      if (isTraditionalPathEntity(id, guestId, excluded)) continue;
      guestIds.delete(id);
      const key = guestId ?? id;
      pending.delete(key);
      this.remotePlayers.removePlayer(key);
      this.live = Math.max(0, this.live - 1);
    }

    const n = pack.count ?? 0;
    for (let i = 0; i < n; i++) {
      const entityId = pack.ids[i];
      const guestId = guestIds.get(entityId) ?? String(entityId);
      if (isTraditionalPathEntity(entityId, guestId, excluded)) continue;
      if (!guestIds.has(entityId)) guestIds.set(entityId, guestId);
      const f = pack.flags?.[i] ?? 0;
      pending.set(guestId, {
        id: guestId,
        x: pack.x[i],
        z: pack.z[i],
        rotY: pack.yaw[i],
        walking: !!(f & 1),
        sitting: !!(f & 2),
        airborne: !!(f & 4),
      });
    }

    for (const player of pending.values()) {
      this.remotePlayers.setPlayer(player);
    }

    return { applied: true, kind: this.kind, live: this.live };
  }

  /** Presence JSON path (until server binary is always on). */
  applyPresencePlayer(player) {
    if (!player?.id) return;
    const entityId = player.entityId ?? playerEntityId(player.id);
    if (isTraditionalPathEntity(entityId, player.id, this.excludedIds)) return;
    this.guestIds.set(entityId, player.id);
    this.remotePlayers.setPlayer(player);
  }

  removePresencePlayer(playerId) {
    if (!playerId) return;
    const entityId = playerEntityId(playerId);
    if (isTraditionalPathEntity(entityId, playerId, this.excludedIds)) return;
    this.guestIds.delete(entityId);
    this.remotePlayers.removePlayer(playerId);
  }

  update(dt, time) {
    this.remotePlayers.update(dt, time);
  }

  sample() {
    return { count: 0 };
  }

  snapshot() {
    return { kind: this.kind, guestIds: [...this.guestIds.entries()] };
  }

  restoreSnapshot(snap) {
    this.guestIds.clear();
    for (const [id, guestId] of snap?.guestIds ?? []) this.guestIds.set(id, guestId);
  }

  onDeviceLost() {
    return { recovered: true, kind: this.kind };
  }

  dispose() {
    this.guestIds.clear();
  }
}

export function createLiveEntitySession({ remotePlayers, guestId, flags = {} } = {}) {
  const excluded = new Set([guestId, KILN_ID].filter(Boolean));
  const backend = new LiveRemoteBackend({ remotePlayers, excludedIds: excluded });
  return {
    backend,
    excludedIds: excluded,
    flags,
    ensureCapacity: () => backend.ensureCapacity(),
    applyDeltaPack: (pack, opts) => backend.applyDeltaPack(pack, { ...opts, excludedIds: excluded }),
    update: (dt, time) => backend.update(dt, time),
    dispose: () => backend.dispose(),
    handlesPresence: () => true,
    applyPresencePlayer: (p) => backend.applyPresencePlayer(p),
    removePresencePlayer: (id) => backend.removePresencePlayer(id),
    clearRemotes: () => remotePlayers.clear(),
  };
}
