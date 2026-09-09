/**
 * Shared telescope sky marks — semantic objects, not GPU-decided outcomes.
 */

import * as THREE from 'three';

import { apparentTelescopePosition } from '../../../shared/telescopeModel.js';

export function createTelescopeSkyScene({
  position = [-6.5, 0, -5.5],
} = {}) {
  const group = new THREE.Group();
  group.name = 'telescope-sky';

  const ownedGeometries = [];
  const ownedMaterials = [];
  const markers = new Map();

  const geo = new THREE.SphereGeometry(0.08, 10, 8);
  ownedGeometries.push(geo);

  function markerMaterial(hex, emissive) {
    const mat = new THREE.MeshBasicMaterial({ color: hex });
    mat.userData.emissiveHex = emissive;
    ownedMaterials.push(mat);
    return mat;
  }

  function ensureMarker(object) {
    let mesh = markers.get(object.id);
    if (mesh) return mesh;
    mesh = new THREE.Mesh(geo, markerMaterial('#d8e6f0', '#9fd0c6'));
    mesh.name = `sky-${object.id}`;
    group.add(mesh);
    markers.set(object.id, mesh);
    return mesh;
  }

  return {
    group,

    updateVisuals(simState) {
      const objects = simState?.sky?.objects || [];
      const env = simState?.environment;
      const now = env?.now ?? env?.updatedAt ?? 0;
      const marks = simState?.marks || {};

      for (const object of objects) {
        const mesh = ensureMarker(object);
        const pos = apparentTelescopePosition(object, now, env);
        mesh.position.set(
          position[0] + pos.x * 18,
          6.5 + pos.y * 10,
          position[2] + pos.z * 18,
        );
        const mark = marks[object.id];
        const highlighted = mark && mark.highlightedBy?.length > 0;
        mesh.scale.setScalar(highlighted ? 1.8 : (object.seeded ? 0.7 : 1));
        mesh.material.color.set(highlighted ? '#ffb24d' : (object.seeded ? '#9bb4c6' : '#eef4ff'));
      }
    },

    dispose() {
      group.removeFromParent();
      for (const geoItem of ownedGeometries) geoItem.dispose();
      for (const mat of ownedMaterials) mat.dispose();
      markers.clear();
    },
  };
}
