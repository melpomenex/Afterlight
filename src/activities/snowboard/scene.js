/**
 * Summit Run mountain scene (add-multiplayer-snowboard-arcade 3.4, design
 * D9). Lazy-imported module: nothing here loads until a rider enters the
 * activity — passive bystanders never execute this file.
 *
 * One original night mountain built from the CANONICAL course document:
 *   - terrain mesh displaced by the same bilinear sampler the authority
 *     simulates with (render and contact agree; no cosmetic noise inside
 *     the corridor);
 *   - instanced pines / rocks / lift towers / fence, gate markers, ramp
 *     wedges, start gate and the floodlit lodge — all from the document;
 *   - ≤2 000 snowfall points, one shadow-casting key light, existing bloom
 *     compatible;
 *   - chase camera with lookahead, speed FOV (64–76°), frame-independent
 *     smoothing and ground clearance.
 *
 * The scene never imports the standalone reference or a second renderer:
 * the HOST composes it through its existing WebGLRenderer/EffectComposer.
 */

import * as THREE from 'three';
import { loadCourse, COURSE_ID, LENGTH_METERS, CORRIDOR_HALF_WIDTH } from '../../../shared/snowboard/course.js';
import { worldPosition, TUNING } from '../../../shared/snowboard/rules.js';

const ACCENT = 0x7acbd4;
const GLOW = 0xedb66c;
const SNOW_COLOR = 0xe8eef4;

// Quality presets (D9: low preserves gates/obstacles/riders readability).
const PRESETS = {
  high: { snowfall: 2000, shadows: true, pines: 1.0 },
  low: { snowfall: 600, shadows: false, pines: 0.6 },
};

export async function createSnowboardScene({ courseDoc, resourceCache = null, owner = 'snowboard', quality = 'high' } = {}) {
  const doc = courseDoc ?? (resourceCache ? null : null);
  if (!doc) throw new Error('createSnowboardScene requires the canonical course document');
  const course = loadCourse(doc);
  const preset = PRESETS[quality] ?? PRESETS.high;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1118);
  scene.fog = new THREE.Fog(0x0a1118, 60, 240);

  // Night lighting: cool hemisphere fill + one warm floodlit key light that
  // follows the rider (the only shadow caster).
  scene.add(new THREE.HemisphereLight(0x38506a, 0x0c1218, 0.85));
  const moon = new THREE.DirectionalLight(0xbdd4ea, 0.5);
  moon.position.set(-40, 80, -60);
  scene.add(moon);
  const key = new THREE.DirectionalLight(0xffd9a0, 1.1);
  key.castShadow = preset.shadows;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 10;
  key.shadow.camera.far = 160;
  key.shadow.camera.left = -50;
  key.shadow.camera.right = 50;
  key.shadow.camera.top = 50;
  key.shadow.camera.bottom = -50;
  scene.add(key);
  scene.add(key.target);

  buildTerrain(scene, course, doc);
  buildScenery(scene, course, doc, preset);
  buildGates(scene, course, doc);
  buildLodge(scene, course);
  const snowfall = buildSnowfall(scene, preset.snowfall);
  const riderRig = createRiderRig(ACCENT);
  scene.add(riderRig.group);
  const remoteRigs = new Map();

  // Chase camera (D9: lookahead + speed FOV 64–76°, frame-independent).
  const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 600);
  const chaseState = { position: new THREE.Vector3(0, 210, 4), look: new THREE.Vector3(), initialized: false };

  const disposables = [];
  function track(source) {
    disposables.push(source);
    return source;
  }

  let finishedGlow = null;
  const gateMarkers = scene.userData.gateMarkers ?? [];

  function update(time, dt, localState = null, remoteStates = []) {
    // Snowfall drifts downhill-ish and wraps.
    if (snowfall) {
      const positions = snowfall.geometry.attributes.position;
      const fall = 6 * dt;
      const drift = 1.2 * dt;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i) - fall;
        let x = positions.getX(i) + drift;
        if (y < -10) y += 60;
        if (x > 30) x -= 60;
        positions.setY(i, y);
        positions.setX(i, x);
      }
      positions.needsUpdate = true;
    }

    // Local rider: world placement from the predicted state.
    if (localState) {
      const pos = worldPosition(course, localState);
      riderRig.group.position.set(pos.x, pos.y, pos.z);
      riderRig.update(time, localState, course);

      // Chase: behind the rider along +s (world -z), lookahead by speed.
      const smoothing = 1 - Math.pow(0.0015, dt);
      const speed01 = (localState.v ?? 0) / TUNING.speedMax;
      const targetFov = 64 + 12 * speed01;
      camera.fov += (targetFov - camera.fov) * smoothing;
      camera.updateProjectionMatrix();

      const desired = new THREE.Vector3(
        pos.x,
        pos.y + 3.4 - speed01 * 0.6,
        pos.z + 6.5 + speed01 * 2.4,
      );
      if (!chaseState.initialized) {
        chaseState.position.copy(desired);
        chaseState.initialized = true;
      } else {
        chaseState.position.lerp(desired, smoothing);
      }
      // Ground clearance: never below the sampled surface + 1.2m.
      const groundHere = course.heightAt(-chaseState.position.z, chaseState.position.x - course.centerXAt(-chaseState.position.z)) + 1.2;
      if (chaseState.position.y < groundHere) chaseState.position.y = groundHere;

      const lookTarget = new THREE.Vector3(
        pos.x,
        pos.y + 0.8,
        pos.z - (4 + speed01 * 6),
      );
      chaseState.look.lerp(lookTarget, smoothing);
      camera.position.copy(chaseState.position);
      camera.lookAt(chaseState.look);

      // Key light follows the rider so shadows stay crisp where it matters.
      key.position.set(pos.x - 20, pos.y + 40, pos.z + 20);
      key.target.position.set(pos.x, pos.y, pos.z);
      key.target.updateMatrixWorld();
    }

    // Remote riders: direct authoritative placement (the caller interpolates).
    if (Array.isArray(remoteStates)) {
      const seen = new Set();
      for (const remote of remoteStates) {
        seen.add(remote.playerId);
        let rig = remoteRigs.get(remote.playerId);
        if (!rig) {
          rig = createRiderRig(remote.accent ?? 0x7acbd4);
          scene.add(rig.group);
          remoteRigs.set(remote.playerId, rig);
        }
        const pos = worldPosition(course, remote.state);
        rig.group.position.set(pos.x, pos.y, pos.z);
        rig.update(time, remote.state, course);
      }
      for (const [playerId, rig] of remoteRigs) {
        if (!seen.has(playerId)) {
          scene.remove(rig.group);
          remoteRigs.delete(playerId);
        }
      }
    }

    // Finished-gate glow while any rider has finished.
    if (gateMarkers.length) {
      const glowOn = localState?.finishTick != null;
      if (glowOn !== finishedGlow) {
        finishedGlow = glowOn;
        const finishMarker = gateMarkers[gateMarkers.length - 1];
        if (finishMarker) finishMarker.material.emissiveIntensity = glowOn ? 2.2 : 1.1;
      }
    }

    void time;
  }

  function dispose() {
    for (const rig of remoteRigs.values()) scene.remove(rig.group);
    remoteRigs.clear();
    for (const source of disposables) {
      try {
        source.dispose?.();
      } catch {}
    }
    // Scene-owned geometries/materials
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose?.();
      if (object.material) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          material.dispose?.();
        }
      }
    });
    scene.clear();
  }

  return {
    scene,
    camera,
    update,
    dispose,
    courseId: COURSE_ID,
    course,
  };
}

// --- terrain -------------------------------------------------------------------

function buildTerrain(scene, course, doc) {
  const { grid } = doc;
  const sCount = grid.sValues.length;
  const uCount = grid.uValues.length;

  const geometry = new THREE.PlaneGeometry(1, 1, uCount - 1, sCount - 1);
  geometry.rotateX(-Math.PI / 2); // XZ plane, +x across, -z downhill

  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const groomed = new THREE.Color(0xdfe8f0);
  const shoulder = new THREE.Color(0xc9d6e2);
  const tint = new THREE.Color();

  for (let i = 0; i < sCount; i++) {
    for (let j = 0; j < uCount; j++) {
      const index = i * uCount + j;
      const u = grid.uValues[j];
      const centerX = course.centerXAt(grid.sValues[i]);
      position.setX(index, centerX + u);
      position.setZ(index, -grid.sValues[i]);
      position.setY(index, grid.height[i][j]);

      tint.copy(doc.grid.surface[i][j] === 0 ? groomed : shoulder);
      colors[index * 3] = tint.r;
      colors[index * 3 + 1] = tint.g;
      colors[index * 3 + 2] = tint.b;
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// --- instanced scenery -----------------------------------------------------------

function buildScenery(scene, course, doc, preset) {
  const pineTrunk = new THREE.CylinderGeometry(0.14, 0.2, 1.2, 6);
  const pineBody = new THREE.ConeGeometry(1.15, 3.4, 7);
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.95 });
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x1c3428, roughness: 0.9 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a6470, roughness: 0.85 });

  const pines = doc.obstacles.filter((o) => o.kind === 'pine');
  const rocks = doc.obstacles.filter((o) => o.kind === 'rock');
  const towers = doc.obstacles.filter((o) => o.kind === 'lift-tower');
  const fences = doc.obstacles.filter((o) => o.kind === 'fence');

  const pineCount = Math.floor(pines.length * preset.pines);
  const trunkMesh = new THREE.InstancedMesh(pineTrunk, trunkMat, Math.max(1, pineCount));
  const bodyMesh = new THREE.InstancedMesh(pineBody, pineMat, Math.max(1, pineCount));
  const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, Math.max(1, rocks.length));

  const transform = new THREE.Object3D();

  pines.slice(0, pineCount).forEach((pine, index) => {
    const surface = course.heightAt(pine.s, pine.u);
    transform.position.set(course.centerXAt(pine.s) + pine.u, surface + 0.6, -pine.s);
    transform.rotation.set(0, pine.u * 7, 0);
    transform.scale.set(1, 1, 1);
    transform.updateMatrix();
    trunkMesh.setMatrixAt(index, transform.matrix);
    transform.position.y = surface + 2.4;
    transform.updateMatrix();
    bodyMesh.setMatrixAt(index, transform.matrix);
  });
  trunkMesh.count = Math.max(1, pineCount);
  bodyMesh.count = Math.max(1, pineCount);
  trunkMesh.castShadow = bodyMesh.castShadow = true;
  scene.add(trunkMesh, bodyMesh);

  rocks.forEach((rock, index) => {
    const surface = course.heightAt(rock.s, rock.u);
    transform.position.set(course.centerXAt(rock.s) + rock.u, surface + 0.4, -rock.s);
    transform.rotation.set(rock.s, rock.u * 3, 0);
    transform.scale.set(rock.halfU, rock.height, rock.halfS);
    transform.updateMatrix();
    rockMesh.setMatrixAt(index, transform.matrix);
  });
  rockMesh.count = Math.max(1, rocks.length);
  rockMesh.castShadow = true;
  scene.add(rockMesh);

  // Lift towers: simple repeated pylons along their authored line.
  if (towers.length) {
    const towerGeo = new THREE.BoxGeometry(0.7, 9, 0.7);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.6, metalness: 0.5 });
    const towerMesh = new THREE.InstancedMesh(towerGeo, towerMat, towers.length);
    towers.forEach((tower, index) => {
      const surface = course.heightAt(tower.s, tower.u);
      transform.position.set(course.centerXAt(tower.s) + tower.u, surface + 4.5, -tower.s);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      towerMesh.setMatrixAt(index, transform.matrix);
    });
    towerMesh.castShadow = true;
    scene.add(towerMesh);
  }

  // Finish fence line.
  if (fences.length) {
    const fenceGeo = new THREE.BoxGeometry(0.12, 1.1, fenceGeometryLength());
    function fenceGeometryLength() {
      return 5.6;
    }
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.8 });
    const fenceMesh = new THREE.InstancedMesh(fenceGeo, fenceMat, fences.length);
    fences.forEach((fence, index) => {
      const surface = course.heightAt(fence.s, fence.u);
      transform.position.set(course.centerXAt(fence.s) + fence.u, surface + 0.55, -fence.s);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      fenceMesh.setMatrixAt(index, transform.matrix);
    });
    scene.add(fenceMesh);
  }
}

function buildGates(scene, course, doc) {
  const markers = [];
  const flagGeo = new THREE.BoxGeometry(0.5, 1.4, 0.12);
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6);

  doc.gates.forEach((gate) => {
    const material = new THREE.MeshStandardMaterial({
      color: ACCENT,
      emissive: ACCENT,
      emissiveIntensity: 1.1,
      roughness: 0.5,
    });
    const group = new THREE.Group();
    const surfaceMid = course.heightAt(gate.s, 0);

    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, material);
      post.position.set(side * (doc.groomedHalfWidth - 1), 1.1, 0);
      group.add(post);
      const flag = new THREE.Mesh(flagGeo, material);
      flag.position.set(side * (doc.groomedHalfWidth - 1.6), 1.7, 0);
      group.add(flag);
    }

    group.position.set(course.centerXAt(gate.s), surfaceMid, -gate.s);
    scene.add(group);
    markers.push({ s: gate.s, group, material });
  });

  // Finish: warm amber breakline.
  const finishMat = new THREE.MeshStandardMaterial({ color: GLOW, emissive: GLOW, emissiveIntensity: 1.1 });
  const finishSurface = course.heightAt(doc.finish.s, 0);
  const finish = new THREE.Mesh(new THREE.BoxGeometry((doc.finish.uMax - doc.finish.uMin) * 0.9, 0.12, 1.4), finishMat);
  finish.position.set(course.centerXAt(doc.finish.s), finishSurface + 0.08, -doc.finish.s);
  scene.add(finish);
  markers.push({ s: doc.finish.s, group: finish, material: finishMat });

  scene.userData.gateMarkers = markers;
}

function buildLodge(scene, course) {
  const lodgeS = 1786;
  const lodgeU = -CORRIDOR_HALF_WIDTH + 2;
  const surface = course.heightAt(lodgeS, lodgeU);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(9, 4.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2426, roughness: 0.9 }),
  );
  body.position.set(course.centerXAt(lodgeS) + lodgeU, surface + 2.1, -lodgeS);
  body.castShadow = true;
  scene.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(6.4, 2.2, 4),
    new THREE.MeshStandardMaterial({ color: 0x3d3038, roughness: 0.85 }),
  );
  roof.position.set(body.position.x, surface + 5.3, -lodgeS);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);

  const windowMat = new THREE.MeshStandardMaterial({ color: GLOW, emissive: GLOW, emissiveIntensity: 1.6 });
  for (const dx of [-2.6, 0, 2.6]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 0.1), windowMat);
    win.position.set(body.position.x + dx, surface + 2.3, -lodgeS + 3.05);
    scene.add(win);
  }

  const lodgeLight = new THREE.PointLight(GLOW, 1.4, 30);
  lodgeLight.position.set(body.position.x, surface + 3, -lodgeS + 5);
  scene.add(lodgeLight);
}

function buildSnowfall(scene, count) {
  if (!count) return null;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.sin(i * 12.9898) * 30);
    positions[i * 3 + 1] = Math.abs(Math.sin(i * 78.233)) * 50;
    positions[i * 3 + 2] = -Math.abs(Math.cos(i * 37.719)) * LENGTH_METERS;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: SNOW_COLOR,
    size: 0.22,
    transparent: true,
    opacity: 0.75,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
}

// --- riders ------------------------------------------------------------------------

function createRiderRig(accent) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd8d3c4, roughness: 0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.55 });
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a2a34, roughness: 0.5, metalness: 0.3 });

  // Original maintenance-robot rider: board, body, head, visor — no imported
  // outfit or silhouette.
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 1.55), boardMat);
  board.position.y = 0.03;
  group.add(board);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 10), bodyMat);
  body.position.y = 0.72;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), bodyMat);
  head.position.y = 1.22;
  head.castShadow = true;
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.05), accentMat);
  visor.position.set(0, 1.24, -0.15);
  group.add(visor);

  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.16), accentMat);
  pack.position.set(0, 0.82, 0.26);
  group.add(pack);

  let lean = 0;
  return {
    group,
    update(time, state, course) {
      // Carve lean from lateral velocity; board follows the sampled normal
      // approximately via forward slope pitch. Visual only — authority
      // never reads this.
      const targetLean = Math.max(-0.6, Math.min(0.6, -(state.vu ?? 0) / 10));
      lean += (targetLean - lean) * 0.2;
      group.rotation.z = lean;
      const sBack = Math.max(0, state.s - 2);
      const pitch = Math.atan2(
        course.heightAt(state.s, state.u) - course.heightAt(sBack, state.u),
        Math.max(1e-6, state.s - sBack),
      );
      group.rotation.x = pitch;
      group.rotation.y = Math.PI; // face downhill (world -z)
      // Tuck crouch.
      const crouch = state.grounded ? (state.tuckedAt ?? 0) : 0;
      body.scale.y = 1 - 0.25 * (state.tuck === true ? 1 : crouch);
      void time;
    },
  };
}
