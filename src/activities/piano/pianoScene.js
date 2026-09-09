/**
 * Orpheum lobby upright piano (Task 9.7). Low cabinet — cinema sightlines stay clear.
 */

import * as THREE from 'three';
import { PIANO_MIN_MIDI, PIANO_MAX_MIDI } from '../../../shared/pianoModel.js';

function isBlack(midi) {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

export function createPianoScene({
  position = [-2.2, 0, 5.8],
  rotationY = 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'piano-scene';
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;

  const geos = [];
  const mats = [];
  const regGeo = (g) => { geos.push(g); return g; };
  const regMat = (m) => { mats.push(m); return m; };

  const body = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(1.5, 0.72, 0.55)),
    regMat(new THREE.MeshStandardMaterial({ color: '#1c1814', roughness: 0.55 }))
  );
  body.position.y = 0.46;
  group.add(body);

  const fallboard = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(1.46, 0.22, 0.08)),
    regMat(new THREE.MeshStandardMaterial({ color: '#2a241c', roughness: 0.5 }))
  );
  fallboard.position.set(0, 0.92, -0.18);
  group.add(fallboard);

  const keys = new Map();
  const whites = [];
  for (let midi = PIANO_MIN_MIDI; midi <= PIANO_MAX_MIDI; midi++) {
    if (!isBlack(midi)) whites.push(midi);
  }
  whites.forEach((midi, i) => {
    const mat = regMat(new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.4 }));
    const key = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.07, 0.04, 0.28)), mat);
    key.position.set(-0.62 + i * 0.082, 0.84, 0.08);
    group.add(key);
    keys.set(midi, { mesh: key, mat, black: false });
  });
  for (let midi = PIANO_MIN_MIDI; midi <= PIANO_MAX_MIDI; midi++) {
    if (!isBlack(midi)) continue;
    const leftWhite = whites.filter((w) => w < midi).length - 1;
    const mat = regMat(new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.35 }));
    const key = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.045, 0.05, 0.16)), mat);
    key.position.set(-0.62 + leftWhite * 0.082 + 0.05, 0.88, 0.02);
    group.add(key);
    keys.set(midi, { mesh: key, mat, black: true });
  }

  return {
    group,
    updateVisuals(simState) {
      const active = new Set((simState?.activeNotes || []).map((n) => n.midi));
      for (const [midi, key] of keys) {
        key.mesh.position.y = (key.black ? 0.88 : 0.84) - (active.has(midi) ? 0.015 : 0);
        key.mat.emissive = new THREE.Color(active.has(midi) ? '#c9a227' : '#000000');
        key.mat.emissiveIntensity = active.has(midi) ? 0.5 : 0;
      }
    },
    dispose() {
      group.parent?.remove(group);
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}
