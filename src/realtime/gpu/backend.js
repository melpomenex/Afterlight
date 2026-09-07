// EntityRenderBackend — the dynamic-entity rendering seam (openspec change
// add-realtime-gpu-rendering, tasks 1.1 + 1.2; design.md "Backend seam").
//
//   EntityRenderBackend
//     ensureCapacity(n) / applyDeltaPack(pack) / sample(indices, out) /
//     snapshot() / dispose() / onDeviceLost(handler)
//     ├── CPUThreeBackend    — per-entity Object3D writes, today's behavior
//     └── WebGPUThreeBackend — persistent storage buffers + compute scatter
//                             (later wave; never constructed unless the
//                             device supports it AND renderer_webgpu_fastpath
//                             is enabled — src/realtime/flags.js)
//
// CONSUMER INTEGRATION POINT (task 1.2). Once wired (a separate gated
// change — nothing calls this seam today), the worker pipeline's consumer
// drives it like this:
//
//   session start / resync   construct the backend (capability + flag
//                            decision: WebGPU adapter+device available AND
//                            renderer_webgpu_fastpath on, else CPU), then
//                            backend.ensureCapacity(store.maxSlots)
//   per posted pack          backend.applyDeltaPack(pack) — the consumer
//                            hands over worker packs as posted
//                            (src/realtime/worker/core.js shape: joined,
//                            left, count rows of ids/x/z/yaw/flags), and
//                            uses the returned receipt for its ack
//   per rendered frame       CPU arm: backend.update(dt, time) — the
//                            exponential lerp and flag poses below.
//                            GPU arm: interpolation is evaluated on-device;
//                            read state back with sample(keys, out) only
//                            where the CPU needs it (rare)
//   teardown                 backend.dispose()
//
// DEVICE-LOSS REBUILD (design.md "Failure model"). The GPU arm routes async
// device loss, requestAdapter/requestDevice rejection, validation errors,
// and scatter-checksum failures to its onDeviceLost handlers. The consumer's
// handler snapshots the dying backend (snapshot() = state of the last
// acknowledged pack) and constructs a fresh CPUThreeBackend seeded from it:
//
//   backend.onDeviceLost((reason, dying) => {
//     const snap = dying.snapshot();
//     dying.dispose();
//     backend = new CPUThreeBackend({ scene, createAvatar, snapshot: snap });
//   });
//
// The snapshot carries packId/epoch/tick/frameSequence, so the rebuilt arm
// rejoins the ack round-trip without duplicate or missing entities.
//
// EXCLUDED BY DESIGN. The local player and Kiln never pass through this
// seam: their camera and interaction coupling (activeCamera follow,
// first-person hiding, companion logic) outweighs any instance savings at
// n=2 (design.md). They keep their traditional per-frame update path in
// main.js regardless of which backend renders remote entities.
//
// The default arm is a thin adapter over the existing avatar patterns in
// src/render/avatars.js: it owns no rig of its own — avatars come from
// createGardenerAvatar (or an injected factory in headless tests), and the
// exponential position/yaw lerp plus flag-derived poses (sitting fold,
// standardized airborne hop, walking bob, emotes) are delegated verbatim to
// RemotePlayersManager. With no backend constructed the game is
// byte-identical to the pre-seam game.

import * as THREE from 'three';
import { RemotePlayersManager, createGardenerAvatar } from '../../render/avatars.js';
import { FLAG_WALKING, FLAG_SITTING, FLAG_AIRBORNE, presenceToFlags } from
  '../../../shared/realtime/entityStore.js';

// Sampled row shape — the setPlayer()-shaped projection used across the
// realtime plane (EntityStore.entryFor, PipelineCore.entryFor, PackConsumer).
// {id, entityId, x, z, rotY, walking, sitting, airborne}

export class EntityRenderBackend {
  // Interface class: never instantiated directly. Duck-typed backends that
  // implement the same methods are acceptable; subclasses get the shared
  // device-loss registry for free.
  constructor() {
    if (new.target === EntityRenderBackend) {
      throw new TypeError(
        'EntityRenderBackend is an interface; construct CPUThreeBackend or a GPU backend'
      );
    }
    this._deviceLostHandlers = [];
  }

  // Hint that the population may grow to n entities (a resync boundary or
  // the store's maxSlots). Monotonic; returns the effective capacity. The
  // CPU arm treats this as a soft hint; the GPU arm pre-allocates buffers.
  ensureCapacity(n) {
    throw new Error('EntityRenderBackend.ensureCapacity is abstract');
  }

  // Apply one worker delta pack (see createPack in src/realtime/worker/
  // core.js). Lifecycle is applied before rows, mirroring PackConsumer:
  // `joined` seeds identity (guestId rides spawn frames once), `left`
  // removes entities, then `count` dense rows update transforms/flags.
  // Returns a receipt for the consumer's ack round-trip:
  //   { ok: true, packId, epoch, tick, frameSequence, appliedRows, joined, left }
  // A GPU backend reports scatter/checksum failure as
  //   { ok: false, reason, packId, ... }
  // so a failed frame is never presented as applied (spec: wrong scatter
  // fails loudly).
  applyDeltaPack(pack) {
    throw new Error('EntityRenderBackend.applyDeltaPack is abstract');
  }

  // Read back current rendered state for the given backend keys (CPU arm:
  // resolved ids — guestId string or numeric entityId; GPU arm: dense
  // slots) into `out`, an array of reusable row objects filled in place
  // (missing rows are allocated; unknown keys fill null). Returns `out`.
  sample(indices, out) {
    throw new Error('EntityRenderBackend.sample is abstract');
  }

  // State of the last acknowledged pack — the seed for the device-loss
  // rebuild. Shape: { kind, packId, epoch, tick, frameSequence, entities:
  // [{ entityId, guestId, x, z, yaw, flags }] }. Targets, not interpolated
  // positions: a rebuilt arm restarts interpolation from server state.
  snapshot() {
    throw new Error('EntityRenderBackend.snapshot is abstract');
  }

  // Release all render resources. Use after dispose is a programmer error.
  dispose() {
    throw new Error('EntityRenderBackend.dispose is abstract');
  }

  // Register a device-loss handler `(reason, backend) => void`. The GPU arm
  // fires it on async device loss, request rejection, validation errors,
  // and checksum failure (reportDeviceLost below); the CPU arm has no
  // device and never fires it in production. Returns an unsubscribe fn.
  onDeviceLost(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('onDeviceLost expects a handler function');
    }
    this._deviceLostHandlers.push(handler);
    const handlers = this._deviceLostHandlers;
    return () => {
      const i = handlers.indexOf(handler);
      if (i !== -1) handlers.splice(i, 1);
    };
  }

  // Mechanism, not policy: GPU backends call this from their loss/checksum
  // paths. Public so headless failure-model tests can simulate loss on any
  // backend without a mock device.
  reportDeviceLost(reason) {
    for (const handler of [...this._deviceLostHandlers]) handler(reason, this);
  }
}

// Browser default rig factory; throws a clear error in headless contexts so
// tests are pushed toward injecting a stub instead of failing on `document`.
function defaultAvatarFactory() {
  if (typeof document === 'undefined') {
    throw new Error(
      'CPUThreeBackend needs an injected createAvatar factory in headless environments ' +
      '(the browser default is createGardenerAvatar from src/render/avatars.js)'
    );
  }
  return (id, nickname) => createGardenerAvatar(id, nickname);
}

export class CPUThreeBackend extends EntityRenderBackend {
  // scene — where avatars live; defaults to a private root so the backend
  //   stays self-contained (tests are headless).
  // createAvatar — (id, nickname) => Object3D rig with userData.legs/arms/rig
  //   (the createGardenerAvatar shape). Defaults to the real avatar builder
  //   in the browser; headless consumers must inject one.
  // snapshot — optional seed from a dying backend's snapshot() (device-loss
  //   rebuild): spawns every entity at its last acknowledged target state
  //   and restores the ack bookkeeping. Idempotent per entity.
  constructor({ scene = null, createAvatar = null, snapshot = null } = {}) {
    super();
    this.scene = scene ?? new THREE.Group();
    this.createAvatar = createAvatar ?? defaultAvatarFactory();
    // Behavior preservation: RemotePlayersManager owns the exponential lerp,
    // yaw wrap, hop/bob/sit poses, and emotes exactly as today. This class
    // only translates packs into setPlayer()-shaped entries.
    this.manager = new RemotePlayersManager(this.scene);
    this.capacityValue = 0;
    this.disposed = false;
    this.ack = { packId: 0, epoch: 0, tick: 0, frameSequence: 0 };
    this.guestIds = new Map(); // entityId -> guestId string (seeded by joined rows)
    this.entityOf = new Map(); // resolved render id -> u32 entityId
    this.resolveOf = new Map(); // u32 entityId -> resolved render id
    this._scratch = { id: 0, entityId: 0, x: 0, z: 0, rotY: 0, walking: false, sitting: false, airborne: false };
    if (snapshot) this.restore(snapshot);
  }

  get capacity() {
    return this.capacityValue;
  }

  get population() {
    return this.manager.players.size;
  }

  ensureCapacity(n) {
    this.capacityValue = Math.max(this.capacityValue, n);
    return this.capacityValue;
  }

  applyDeltaPack(pack) {
    if (this.disposed) throw new Error('CPUThreeBackend disposed');
    for (const j of pack.joined) {
      if (j.guestId) this.guestIds.set(j.entityId, j.guestId);
      const resolved = j.guestId ?? j.entityId;
      this._ensureSpawn(resolved, j.entityId, j.x ?? 0, j.z ?? 0, j.yaw ?? 0);
    }
    for (const entityId of pack.left) {
      const resolved = this.resolveOf.get(entityId) ?? entityId;
      this.guestIds.delete(entityId);
      this.resolveOf.delete(entityId);
      this.entityOf.delete(resolved);
      this.manager.removePlayer(resolved);
    }
    const s = this._scratch;
    for (let i = 0; i < pack.count; i++) {
      const entityId = pack.ids[i];
      const resolved = this.guestIds.get(entityId) ?? entityId;
      const f = pack.flags[i];
      s.id = resolved;
      s.entityId = entityId;
      s.x = pack.x[i];
      s.z = pack.z[i];
      s.rotY = pack.yaw[i];
      s.walking = !!(f & FLAG_WALKING);
      s.sitting = !!(f & FLAG_SITTING);
      s.airborne = !!(f & FLAG_AIRBORNE);
      // Delta rows may arrive for entities this backend has not seen (a
      // resync boundary); the legacy path spawned avatars on first sight,
      // and so does this one.
      this._ensureSpawn(resolved, entityId, s.x, s.z, s.rotY);
      this.manager.setPlayer(s);
    }
    this.ack = { packId: pack.packId, epoch: pack.epoch, tick: pack.tick, frameSequence: pack.frameSequence };
    return { ok: true, ...this.ack, appliedRows: pack.count, joined: pack.joined.length, left: pack.left.length };
  }

  sample(indices, out) {
    for (let i = 0; i < indices.length; i++) {
      const key = indices[i];
      const entry = this.manager.players.get(key);
      if (!entry) {
        out[i] = null;
        continue;
      }
      const row = out[i] ?? (out[i] = {}); // allocate only when the caller did not
      row.id = key;
      row.entityId = this.entityOf.get(key);
      row.x = entry.avatar.position.x;
      row.z = entry.avatar.position.z;
      row.rotY = entry.avatar.rotation.y;
      row.walking = entry.walking;
      row.sitting = entry.sitting;
      row.airborne = entry.airborne;
    }
    return out;
  }

  snapshot() {
    const entities = [];
    for (const [entityId, resolved] of this.resolveOf) {
      const entry = this.manager.players.get(resolved);
      if (!entry) continue;
      entities.push({
        entityId,
        guestId: this.guestIds.get(entityId) ?? null,
        x: entry.targetX,
        z: entry.targetZ,
        yaw: entry.targetRotY,
        flags: presenceToFlags(entry.walking, entry.sitting, entry.airborne),
      });
    }
    return { kind: 'cpu-three', ...this.ack, entities };
  }

  // Seed from a snapshot of another backend (device-loss rebuild). Uses the
  // ordinary spawn path, so re-seeding an existing entity updates in place
  // instead of duplicating.
  restore(snapshot) {
    for (const e of snapshot?.entities ?? []) {
      if (e.guestId) this.guestIds.set(e.entityId, e.guestId);
      const resolved = e.guestId ?? e.entityId;
      this._ensureSpawn(resolved, e.entityId, e.x ?? 0, e.z ?? 0, e.yaw ?? 0);
      const f = e.flags ?? 0;
      this.manager.setPlayer({
        id: resolved,
        x: e.x ?? 0,
        z: e.z ?? 0,
        rotY: e.yaw ?? 0,
        walking: !!(f & FLAG_WALKING),
        sitting: !!(f & FLAG_SITTING),
        airborne: !!(f & FLAG_AIRBORNE),
      });
    }
    if (snapshot && snapshot.packId !== undefined) {
      this.ack = {
        packId: snapshot.packId,
        epoch: snapshot.epoch ?? 0,
        tick: snapshot.tick ?? 0,
        frameSequence: snapshot.frameSequence ?? 0,
      };
    }
    return this;
  }

  // CPU arm's per-frame driver — the exponential lerp (lerpRate =
  // min(1, dt * 12)) and flag-derived poses run here, exactly as in
  // RemotePlayersManager.update. Not part of the seam interface: the GPU
  // arm evaluates interpolation on-device instead.
  update(dt, time) {
    if (this.disposed) throw new Error('CPUThreeBackend disposed');
    this.manager.update(dt, time);
    return this;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.manager.clear();
    this.guestIds.clear();
    this.entityOf.clear();
    this.resolveOf.clear();
    this._deviceLostHandlers.length = 0;
  }

  // Create-or-reuse the manager entry for an entity. The entry shape mirrors
  // RemotePlayersManager.setPlayer's creation branch (src/render/avatars.js)
  // — { avatar, targetX, targetZ, targetRotY, walking, sitting, airborne,
  // hopT } — so delegated updates keep the rising-edge hop semantics.
  _ensureSpawn(resolvedId, entityId, x, z, yaw) {
    this.entityOf.set(resolvedId, entityId);
    this.resolveOf.set(entityId, resolvedId);
    if (this.manager.players.has(resolvedId)) return;
    const avatar = this.createAvatar(resolvedId);
    avatar.position.set(x, 0, z);
    avatar.rotation.y = yaw;
    this.scene.add(avatar);
    this.manager.players.set(resolvedId, {
      avatar,
      targetX: x,
      targetZ: z,
      targetRotY: yaw,
      walking: false,
      sitting: false,
      airborne: false,
      hopT: 0,
    });
  }
}
