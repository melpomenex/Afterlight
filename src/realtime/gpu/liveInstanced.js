// Live instanced remote layer (wire-realtime-entity-backend Phases 3–4).
// Experimental: ?rt_webgpu_fastpath=1 with the entity seam replaces full
// gardener meshes with InstancedMesh proxies on the existing WebGL scene so
// EffectComposer + bloom stay unchanged. WebGPU scatter may run in parallel
// for validation; visuals always come from the CPU instanced path today.

import * as THREE from 'three';
import { KILN_ID, CPUThreeBackend, shouldConstructWebGpu, isTraditionalPathEntity } from './backend.js';
import { createEntityRenderSession } from './session.js';
import { createPack } from '../worker/core.js';
import { playerEntityId } from '../../../shared/realtime/entityId.js';
import { presenceToFlags } from '../../../shared/realtime/entityStore.js';

const PROXY_COLORS = [
  0x7a8f6e, 0x8a7a5c, 0x6e8a7a, 0x9a8a6a, 0x5c7a6e, 0x8a6e5c,
];

function proxyColor(archetype = 0, variant = 0) {
  return PROXY_COLORS[(archetype + variant) % PROXY_COLORS.length];
}

export function createLiveInstancedSession({
  scene,
  remotePlayers,
  guestId = null,
  flags = {},
  maxSlots = 512,
} = {}) {
  const excluded = new Set([guestId, KILN_ID].filter(Boolean));
  const geom = new THREE.CapsuleGeometry(0.32, 0.85, 4, 8);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8a9a7a,
    roughness: 0.78,
    metalness: 0.08,
  });
  const mesh = new THREE.InstancedMesh(geom, mat, maxSlots);
  mesh.count = 0;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.name = 'rt-remote-proxies';
  mesh.userData._scratchMatrix = new THREE.Matrix4();
  scene.add(mesh);

  const cpu = new CPUThreeBackend({ excludedIds: excluded });
  cpu.bindInstancedMesh(mesh);

  let gpuSession = null;
  let gpuInit = null;
  if (shouldConstructWebGpu(flags)) {
    gpuInit = createEntityRenderSession({ flags, excludedIds: excluded })
      .then((session) => { gpuSession = session; })
      .catch(() => { gpuSession = null; });
  }

  remotePlayers.clear();

  const guestIds = new Map();
  const slotIds = [];

  function refreshMeshCount() {
    slotIds.length = 0;
    for (const id of cpu.slotOf.keys()) slotIds.push(id);
    mesh.count = slotIds.length;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function applyDeltaPack(pack, opts = {}) {
    const ids = opts.guestIds ?? guestIds;
    const r = cpu.applyDeltaPack(pack, { ...opts, excludedIds: excluded, guestIds: ids });
    for (const j of pack.joined ?? []) {
      const entityId = j.entityId ?? playerEntityId(j.guestId ?? j.id);
      const guestIdStr = j.guestId ?? j.id;
      if (isTraditionalPathEntity(entityId, guestIdStr, excluded)) continue;
      if (guestIdStr) ids.set(entityId, guestIdStr);
    }
    for (const id of pack.left ?? []) ids.delete(id);
    refreshMeshCount();
    if (gpuSession) {
      gpuSession.applyDeltaPack(pack, { ...opts, excludedIds: excluded, guestIds: ids });
    } else if (gpuInit) {
      gpuInit.then(() => gpuSession?.applyDeltaPack(pack, { ...opts, excludedIds: excluded, guestIds: ids }));
    }
    return r;
  }

  function applyPresencePlayer(player) {
    if (!player?.id || player.id === guestId) return;
    const entityId = player.entityId ?? playerEntityId(player.id);
    if (isTraditionalPathEntity(entityId, player.id, excluded)) return;
    guestIds.set(entityId, player.id);
    const pack = createPack(4);
    pack.tick = cpu.tick + 1;
    pack.count = 1;
    pack.ids[0] = entityId;
    pack.x[0] = player.x ?? 0;
    pack.z[0] = player.z ?? 0;
    pack.yaw[0] = player.rotY ?? 0;
    pack.flags[0] = presenceToFlags(!!player.walking, !!player.sitting, !!player.airborne);
    pack.joined = [{
      entityId,
      guestId: player.id,
      nickname: player.nickname,
      x: player.x,
      z: player.z,
      yaw: player.rotY,
    }];
    pack.left = [];
    applyDeltaPack(pack, { guestIds });
  }

  function removePresencePlayer(playerId) {
    if (!playerId) return;
    const entityId = playerEntityId(playerId);
    applyDeltaPack({
      tick: cpu.tick + 1,
      count: 0,
      ids: [],
      x: [],
      z: [],
      yaw: [],
      flags: [],
      joined: [],
      left: [entityId],
    }, { guestIds });
  }

  function update(dt, time) {
    void time;
    if (slotIds.length) cpu.sample(slotIds, {}, { dt });
    mesh.visible = mesh.count > 0;
  }

  function dispose() {
    scene.remove(mesh);
    geom.dispose();
    mat.dispose();
    cpu.dispose();
    gpuSession?.dispose();
  }

  const backend = {
    kind: 'live-instanced',
    cpu,
    get gpuSession() { return gpuSession; },
    applyDeltaPack,
    update,
    dispose,
    excludedIds: excluded,
    handlesPresence: () => true,
    applyPresencePlayer,
    removePresencePlayer,
    clearRemotes: () => {
      guestIds.clear();
      cpu.dispose();
      cpu.bindInstancedMesh(mesh);
      mesh.count = 0;
      slotIds.length = 0;
      remotePlayers.clear();
    },
  };

  return {
    backend,
    excludedIds: excluded,
    flags,
    mode: 'instanced-proxy',
    ensureCapacity: (n) => cpu.ensureCapacity(n),
    applyDeltaPack,
    update,
    dispose,
    handlesPresence: () => true,
    applyPresencePlayer,
    removePresencePlayer,
    clearRemotes: backend.clearRemotes,
  };
}
