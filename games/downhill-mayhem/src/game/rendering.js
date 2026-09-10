/**
 * Downhill Mayhem rendering (integrate-multiplayer-downhill-mayhem-arcade 5.4).
 * Scene, perspective chase camera, fog, sky dome, distant-mountain diorama and
 * the descending sun colour. Ported from the frozen source `initThree` /
 * `updateCamera` light logic (`standalone.html`), with the r128→r185 port:
 * light intensities are in r155+ physical units (roughly ×2.5 on the old
 * values), and no renderer properties are mutated here — the host owns the
 * renderer.
 *
 * This module owns no canvas, renderer, RAF or resize listener. `setViewport`
 * is called by the runtime from `resize(w, h)`.
 */

import * as THREE from 'three';
import { clamp, smoothstep, mulberry32, SEED } from './course.js';

export const SUN_COLD = new THREE.Color(0xdfeaff);
export const SUN_MID = new THREE.Color(0xfff1d6);
export const SUN_WARM = new THREE.Color(0xffd9a0);

function aspectOf(viewport, fallback = 16 / 9) {
  try {
    const v = viewport ? viewport() : null;
    if (v && v.width > 0 && v.height > 0) return v.width / v.height;
  } catch { /* host viewport threw: fall back */ }
  return fallback;
}

export function createRendering({ viewport } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc8dcea);
  scene.fog = new THREE.Fog(0xc8dcea, 32, 235);

  // camera.far sits just past the fog wall so frustum culling drops the
  // kilometre of already-invisible terrain ahead (the PS2 way).
  const camera = new THREE.PerspectiveCamera(74, aspectOf(viewport), 0.3, 330);

  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6b5a43, 2.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.7);
  sun.position.set(60, 100, 40);
  scene.add(sun);

  // sky dome (vertex-colour gradient, unfogged, follows camera, inside far plane)
  const R = 300;
  const skyGeo = new THREE.SphereGeometry(R, 16, 10);
  {
    const posA = skyGeo.attributes.position;
    const cols = [];
    const top = new THREE.Color(0x5894db);
    const hor = new THREE.Color(0xc8dcea);
    for (let i = 0; i < posA.count; i++) {
      const t = smoothstep((posA.getY(i) / R) * 1.6 + 0.12);
      const c = hor.clone().lerp(top, t);
      cols.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  }
  const skyDome = new THREE.Mesh(
    skyGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  skyDome.frustumCulled = false;
  skyDome.renderOrder = -10;
  scene.add(skyDome);

  // "distant" mountain silhouettes — a small diorama ring that follows the
  // camera (zero parallax reads as infinitely far), unfogged, one call per ring.
  const mountains = new THREE.Group();
  {
    const rng = mulberry32(SEED + 7);
    const geo = new THREE.ConeGeometry(1, 1, 5);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(),
      pv = new THREE.Vector3(), sv = new THREE.Vector3();
    const mk = (n, rad, col, hMin, hMax) => {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: col, fog: false }), n);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rng() * 0.5;
        const h = hMin + rng() * (hMax - hMin);
        q.setFromEuler(e.set(0, rng() * 3, 0));
        m4.compose(pv.set(Math.cos(a) * rad, h * 0.28, Math.sin(a) * rad), q,
          sv.set(h * (1.0 + rng() * 0.5), h, h * (1.0 + rng() * 0.5)));
        im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
      im.frustumCulled = false;
      mountains.add(im);
    };
    mk(11, 318, 0xb2c4d6, 36, 68);
    mk(9, 292, 0x9db2c6, 26, 52);
  }
  scene.add(mountains);

  let disposed = false;

  return {
    scene,
    camera,
    sun,
    hemi,
    skyDome,
    mountains,
    get disposed() { return disposed; },

    setViewport(width, height) {
      const w = Math.max(1, Math.floor(width) || 1);
      const h = Math.max(1, Math.floor(height) || 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },

    setFov(fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    },

    /** Sun colour/intensity warms as the reference rider descends the mountain. */
    updateSun(alt, coldEdge, warmEdge) {
      const fAlt = clamp(alt, 0, 1);
      const cold = clamp((coldEdge - fAlt) / coldEdge, 0, 1);
      const warm = clamp((fAlt - warmEdge) / (1 - warmEdge), 0, 1);
      sun.color.copy(SUN_MID);
      if (cold > 0) sun.color.lerp(SUN_COLD, cold);
      if (warm > 0) sun.color.lerp(SUN_WARM, warm);
      sun.intensity = 2.7 + warm * 0.35;
    },

    /** True when a renderer can present this scene without a GL error. */
    isReady() { return !disposed; },

    dispose() {
      if (disposed) return;
      disposed = true;
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const m = o.material;
        if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
          if (mm.map && mm.map.dispose) mm.map.dispose();
          mm.dispose();
        });
      });
      scene.clear();
    },
  };
}
