/**
 * Downhill Mayhem VFX (visual overhaul pass). Owns the in-scene particle
 * families that sell the alpine weather and the ride:
 *
 *  - snowfall: one GPU Points draw, animated entirely in the vertex shader and
 *    wrapped in a box around the chase camera (no per-frame CPU work);
 *  - spray: a single CPU-updated Points pool for wheel snow, landing puffs and
 *    crash bursts (bounded, no allocation during a race).
 *
 * No renderer, canvas, RAF or resize ownership: the runtime drives `update`.
 */

import * as THREE from 'three';
import { createParticleSprite } from './textures.js';

const SNOW_COUNT = 5200;
const SNOW_BOX = new THREE.Vector3(90, 50, 90);
const SPRAY_MAX = 260;

export function createVfx({ scene, camera } = {}) {
  const group = new THREE.Group();
  group.name = 'dm-vfx';
  if (scene) scene.add(group);

  const sprite = createParticleSprite(64);

  // --- snowfall (GPU) ------------------------------------------------------
  let snow = null;
  if (sprite) {
    const positions = new Float32Array(SNOW_COUNT * 3);
    const sizes = new Float32Array(SNOW_COUNT);
    const phases = new Float32Array(SNOW_COUNT);
    for (let i = 0; i < SNOW_COUNT; i++) {
      positions[i * 3] = Math.random() * SNOW_BOX.x;
      positions[i * 3 + 1] = Math.random() * SNOW_BOX.y;
      positions[i * 3 + 2] = Math.random() * SNOW_BOX.z;
      sizes[i] = 0.12 + Math.random() * 0.22;
      phases[i] = Math.random() * 6.28;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), SNOW_BOX.length());
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new THREE.Vector3() },
        uBox: { value: SNOW_BOX.clone() },
        uWind: { value: new THREE.Vector3(2.2, -2.1, 1.1) },
        uMap: { value: sprite },
        uOpacity: { value: 1.0 },
        uPixelScale: { value: 540 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform vec3 uCam;
        uniform vec3 uBox;
        uniform vec3 uWind;
        uniform float uPixelScale;
        varying float vAlpha;
        void main() {
          vec3 p = position + uWind * uTime;
          p.y -= uTime * 1.6;
          p.x += sin(uTime * 0.7 + aPhase) * 1.4;
          p = mod(p, uBox);
          p += uCam - uBox * 0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          gl_PointSize = clamp(aSize * uPixelScale / max(d, 1.0), 1.2, 26.0);
          vAlpha = smoothstep(85.0, 10.0, d) * smoothstep(0.8, 3.2, d) * (0.45 + 0.55 * fract(aPhase + uTime * 0.07));
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          if (t.a < 0.02) discard;
          gl_FragColor = vec4(0.96, 0.97, 1.0, t.a * vAlpha * uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      fog: false,
    });
    snow = new THREE.Points(geo, mat);
    snow.frustumCulled = false;
    snow.renderOrder = 5;
    group.add(snow);
  }

  // --- spray (CPU pool) ----------------------------------------------------
  let spray = null;
  let sprayGeo = null;
  const pCount = { value: 0 };
  const pPos = new Float32Array(SPRAY_MAX * 3);
  const pVel = new Float32Array(SPRAY_MAX * 3);
  const pLife = new Float32Array(SPRAY_MAX);
  const pMaxLife = new Float32Array(SPRAY_MAX);
  const pSize = new Float32Array(SPRAY_MAX);
  const pColor = new Float32Array(SPRAY_MAX * 4);
  if (sprite) {
    sprayGeo = new THREE.BufferGeometry();
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    sprayGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
    const colorAttr = new THREE.BufferAttribute(pColor, 4);
    sprayGeo.setAttribute('aColor', colorAttr);
    sprayGeo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: sprite },
        uPixelScale: { value: 540 },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec4 aColor;
        uniform float uPixelScale;
        varying vec4 vColor;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          gl_PointSize = max(1.0, aSize * uPixelScale / max(d, 1.0));
          vColor = aColor;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec4 vColor;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          if (t.a < 0.02) discard;
          gl_FragColor = vec4(vColor.rgb, t.a * vColor.a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      fog: false,
    });
    spray = new THREE.Points(sprayGeo, mat);
    spray.frustumCulled = false;
    spray.renderOrder = 4;
    group.add(spray);
  }

  function spawnSpray(x, y, z, vx, vy, vz, life, size, tint = 1) {
    let i = pCount.value;
    if (i >= SPRAY_MAX) i = Math.floor(Math.random() * SPRAY_MAX); // recycle the oldest-looking slot
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
    pLife[i] = life; pMaxLife[i] = life; pSize[i] = size;
    pColor[i * 4] = 0.97 * tint; pColor[i * 4 + 1] = 0.98 * tint; pColor[i * 4 + 2] = 1.0 * tint;
    pColor[i * 4 + 3] = 1;
    if (pCount.value < SPRAY_MAX) pCount.value++;
  }

  const scratch = new THREE.Vector3();

  return {
    group,
    get snow() { return snow; },

    /**
     * Emit a fan of snow/spray. `pos` is world space, `dir` the travel
     * direction (normalized), `amount` the particle count.
     */
    emit(pos, dir, amount, { speed = 2, up = 1.2, spread = 1.2, life = 0.7, size = 0.12 } = {}) {
      const n = Math.min(amount | 0, 24);
      for (let k = 0; k < n; k++) {
        const sx = (Math.random() - 0.5) * spread;
        const sy = (Math.random() - 0.2) * spread * 0.6;
        const sz = (Math.random() - 0.5) * spread;
        spawnSpray(
          pos.x + sx * 0.4, pos.y + 0.1 + Math.random() * 0.25, pos.z + sz * 0.4,
          -dir.x * speed + sx, dir.y * speed * 0.3 + up * (0.5 + Math.random()), -dir.z * speed + sz,
          life * (0.6 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.8),
        );
      }
    },

    update(dt, ctx = {}) {
      if (snow) {
        snow.material.uniforms.uTime.value += dt;
        if (camera) snow.material.uniforms.uCam.value.copy(camera.position);
      }
      if (!spray) return;
      const active = pCount.value;
      let w = 0;
      for (let i = 0; i < active; i++) {
        pLife[i] -= dt;
        if (pLife[i] <= 0) continue;
        pVel[i * 3 + 1] -= 7.5 * dt;
        const drag = Math.pow(0.12, dt);
        pVel[i * 3] *= drag; pVel[i * 3 + 1] *= Math.pow(0.5, dt); pVel[i * 3 + 2] *= drag;
        pPos[i * 3] += pVel[i * 3] * dt;
        pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
        pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
        const a = Math.min(1, pLife[i] / Math.max(pMaxLife[i], 0.001));
        pColor[i * 4 + 3] = a * a;
        if (w !== i) {
          pPos[w * 3] = pPos[i * 3]; pPos[w * 3 + 1] = pPos[i * 3 + 1]; pPos[w * 3 + 2] = pPos[i * 3 + 2];
          pVel[w * 3] = pVel[i * 3]; pVel[w * 3 + 1] = pVel[i * 3 + 1]; pVel[w * 3 + 2] = pVel[i * 3 + 2];
          pLife[w] = pLife[i]; pMaxLife[w] = pMaxLife[i]; pSize[w] = pSize[i];
          pColor[w * 4] = pColor[i * 4]; pColor[w * 4 + 1] = pColor[i * 4 + 1];
          pColor[w * 4 + 2] = pColor[i * 4 + 2]; pColor[w * 4 + 3] = pColor[i * 4 + 3];
        }
        w++;
      }
      pCount.value = w;
      sprayGeo.setDrawRange(0, w);
      sprayGeo.attributes.position.needsUpdate = true;
      sprayGeo.attributes.aColor.needsUpdate = true;
      sprayGeo.attributes.aSize.needsUpdate = true;
      void scratch; void ctx;
    },

    resize(width, height) {
      const scale = Math.max(1, Math.floor(height) || 1) * 0.5;
      if (snow) snow.material.uniforms.uPixelScale.value = scale;
      if (spray) spray.material.uniforms.uPixelScale.value = scale;
    },

    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const m = o.material;
        if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
          if (mm.map && mm.map.dispose) mm.map.dispose();
          mm.dispose();
        });
      });
      group.clear();
      if (group.parent) group.parent.remove(group);
    },
  };
}
