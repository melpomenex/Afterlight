/**
 * Summit Run mountain scene — the ALPINE RUSH port
 * (integrate-ssxtricky-snowboard 2.1/2.2).
 *
 * Faithful extraction of the frozen user-owned source scene
 * `SSXTricky/lib/game/engine.js` @ rev e87f6c7d (see the change's
 * baseline.md): daylight alpine palette, the winding 440×2200 m vertex-colored
 * terrain with raised banks, 70 layered peaks, 420 instanced pines, banner
 * gates, slalom poles, 13 lime-lipped ramps, cyan speed lanes with chevrons,
 * the left-shoulder chairlift, 22 boost pickups, snow-spray particles, the
 * soft contact shadow, the source humanoid rider rigs (pivot/stance/body with
 * grab/spin/flip/bail poses), the source chase camera with speed FOV, and the
 * rider-following sun. Terrain composition, seed (321 LCG), scenery, ramps,
 * lanes and pickups are UNALTERED — including the source's cosmetic bank
 * noise beyond |x-center|>29, which the source's own contact math also
 * ignores outside the groomed corridor.
 *
 * Host-driven: this module owns NO renderer, NO RAF loop, NO input listeners
 * and NO ResizeObserver — the host composes it through the existing view
 * lease and frame loop (engine.js's autonomous tick/observer/window hooks are
 * deliberately not ported). The standalone source app under `SSXTricky/`
 * remains runnable for side-by-side comparison.
 *
 * Multiplayer adaptations (documented in the change design): the source's five
 * AI rivals render as REMOTE riders from their authoritative interpolated
 * states (accent-colored rigs with the same pose logic), and pickups hide
 * per-viewer only when THIS rider claimed them (claims are per-rider).
 */

import * as THREE from 'three';
import { loadCourse, COURSE_ID, courseCenter, groundHeight, onRamp } from '../../../shared/snowboard/course.js';

// Source palette/engine constants (engine.js at the frozen revision).
const SKY = '#a4cede';
const FOG_COLOR = '#b6d5e0';
const RIVAL_ACCENTS = ['#7d5ecc', '#168fa4', '#d6a631', '#e34e73', '#426dd5', '#8b3fa8', '#3fa87a', '#a8623f'];
const TERRAIN_ROWS = 550;
const TERRAIN_COLS = 70;
const TERRAIN_LENGTH = 2200;
const TERRAIN_WIDTH = 440;
const PEAK_COUNT = 70;
const TREE_COUNT = 420;
const PARTICLE_COUNT = 160;

// Quality presets (host integration necessity; low keeps gates/ramps/riders
// readable while trimming optional density — source values on high).
const PRESETS = {
  high: { trees: 1.0, particles: PARTICLE_COUNT, shadows: true },
  low: { trees: 0.6, particles: 80, shadows: false },
};

/** The source's seeded LCG (seed 321) — same call order, same layout. */
function createSourceRandom(seed = 321) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export async function createSnowboardScene({ courseDoc, resourceCache = null, owner = 'snowboard', quality = 'high' } = {}) {
  if (!courseDoc) throw new Error('createSnowboardScene requires the canonical course document');
  const course = loadCourse(courseDoc);
  const preset = PRESETS[quality] ?? PRESETS.high;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(FOG_COLOR, 125, 510);

  // --- daylight lighting (source) --------------------------------------------
  scene.add(new THREE.HemisphereLight(0xe6f8ff, 0x7890a6, 2.5));
  const sun = new THREE.DirectionalLight(0xfff4dc, 3.2);
  sun.position.set(-80, 150, 30);
  sun.castShadow = preset.shadows;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.far = 320;
  sun.shadow.normalBias = 0.1;
  scene.add(sun);
  scene.add(sun.target);

  // --- shared materials (source mat() cache) -----------------------------------
  const materials = new Map();
  const mat = (color) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.84 }));
    return materials.get(color);
  };
  const box = (w, h, d, color, parent = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const sphere = (r, color, parent = scene) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat(color));
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const rand = createSourceRandom(course.doc.renderSeed);

  // --- terrain (source: continuous slope, raised banks, groomed center) --------
  {
    const vertices = [], colors = [], indices = [];
    const rows = TERRAIN_ROWS, cols = TERRAIN_COLS, length = TERRAIN_LENGTH, width = TERRAIN_WIDTH;
    const snow = new THREE.Color();
    for (let r = 0; r <= rows; r++) {
      const d = r * length / rows - 120;
      for (let c = 0; c <= cols; c++) {
        const x = (c / cols - 0.5) * width + courseCenter(d), side = Math.abs(x - courseCenter(d));
        const noise = side > 29 ? Math.sin(x * .07 + d * .025) * Math.sin(d * .037) * Math.min(18, (side - 29) * .12) : 0;
        vertices.push(x, groundHeight(x, d) + noise, -d);
        const tone = side < 23 ? .94 + rand() * .06 : .72 + rand() * .25;
        snow.setRGB(tone * .88, tone * .95, tone);
        colors.push(snow.r, snow.g, snow.b);
        if (r < rows && c < cols) {
          const a = r * (cols + 1) + c, b = a + cols + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide }));
    terrain.receiveShadow = true;
    scene.add(terrain);
  }

  // --- layered jagged alpine peaks (source) -------------------------------------
  for (let i = 0; i < PEAK_COUNT; i++) {
    const d = i * 34 - 80, sign = i % 2 ? 1 : -1, x = courseCenter(d) + sign * (125 + rand() * 150), height = 55 + rand() * 105;
    const peak = new THREE.Mesh(new THREE.ConeGeometry(45 + rand() * 45, height, 5, 1), mat(i % 3 ? '#b6c9d9' : '#879bb1'));
    peak.position.set(x, groundHeight(x, d) + height * .22, -d);
    peak.rotation.y = rand() * 6;
    scene.add(peak);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(30, height * .58, 5, 1), mat('#eef7fc'));
    cap.position.copy(peak.position);
    cap.position.y += height * .21;
    cap.rotation.y = peak.rotation.y;
    scene.add(cap);
  }

  // --- instanced pines (source geometry + counts) --------------------------------
  const treeCount = Math.floor(TREE_COUNT * preset.trees);
  {
    const trunkGeo = new THREE.CylinderGeometry(.23, .42, 2.8, 5), pineGeo = new THREE.ConeGeometry(3.2, 8, 7), snowGeo = new THREE.ConeGeometry(2.35, 5.8, 7);
    const trunks = new THREE.InstancedMesh(trunkGeo, mat('#556c70'), treeCount);
    const pines = new THREE.InstancedMesh(pineGeo, mat('#25545b'), treeCount);
    const caps = new THREE.InstancedMesh(snowGeo, mat('#dfedf2'), treeCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < treeCount; i++) {
      const d = rand() * 2100 - 80, x = courseCenter(d) + (i % 2 ? 1 : -1) * (30 + rand() * 72), h = groundHeight(x, d), scale = .65 + rand() * .8;
      dummy.position.set(x, h + 1, -d);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      dummy.position.y = h + 5 * scale;
      dummy.updateMatrix();
      pines.setMatrixAt(i, dummy.matrix);
      dummy.position.y = h + 6.6 * scale;
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    }
    pines.castShadow = true;
    scene.add(trunks, pines, caps);
  }

  // --- banner gates (source label canvas) -----------------------------------------
  function label(text, bg = '#153c45', fg = '#dfff70') {
    // The canvas texture needs a DOM (browser); Node tests get the source
    // banner colors as a flat material so the scene still builds headlessly.
    if (typeof document === 'undefined') {
      return new THREE.MeshBasicMaterial({ color: bg, side: THREE.DoubleSide });
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 900 65px Arial';
    ctx.fillText(text, 256, 68);
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  }
  function gate(d, title, finish = false) {
    const x = courseCenter(d), y = groundHeight(x, d);
    for (const side of [-1, 1]) {
      const post = box(.5, 9, .5, '#193c4a');
      post.position.set(x + side * 20, y + 4.5, -d);
      const foot = box(1.6, 2, 1.5, finish ? '#dfff70' : '#ff6740');
      foot.position.set(x + side * 20, y + 1, -d);
    }
    const banner = new THREE.Mesh(new THREE.BoxGeometry(40, 3, .35), label(title, finish ? '#ddff77' : '#193c4a', finish ? '#153c45' : '#eaffcc'));
    banner.position.set(x, y + 9, -d);
    scene.add(banner);
  }
  for (const b of course.banners) gate(b.d, b.title, b.finish === true);

  // --- slalom poles (source: every 22 m, flags every third) ------------------------
  for (let d = 15; d < course.lengthMeters; d += 22) {
    for (const side of [-1, 1]) {
      const x = courseCenter(d) + side * 23, y = groundHeight(x, d);
      const pole = box(.14, 2.4, .14, '#f06237');
      pole.position.set(x, y + 1.2, -d);
      if (Math.floor(d / 22) % 3 === 0) {
        const flag = box(1.6, .8, .08, '#ff7046');
        flag.position.set(x + side * .8, y + 2, -d);
      }
    }
  }

  // --- ramps (source wedges + lime lips + rails) ------------------------------------
  for (const r of course.ramps) {
    const half = r.width / 2, rise = r.height;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-half, 0, -r.start, half, 0, -r.start, -half, rise, -r.end, half, rise, -r.end, -half, -4, -r.end, half, -4, -r.end], 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 0, 2, 4, 1, 5, 3]);
    g.computeVertexNormals();
    const ramp = new THREE.Mesh(g, mat('#bddbe7'));
    ramp.position.set(r.x, r.base, 0);
    ramp.receiveShadow = true;
    scene.add(ramp);
    const lip = box(r.width, .18, .6, '#e3ff71');
    lip.position.set(r.x, r.base + rise + .06, -r.end);
    for (const side of [-1, 1]) {
      const rail = box(.2, Math.hypot(r.end - r.start, rise), .2, '#e3ff71');
      rail.position.set(r.x + side * half, r.base + rise / 2, -(r.start + r.end) / 2);
      rail.rotation.x = -Math.atan2(r.end - r.start, rise);
    }
  }

  // --- cyan speed lanes with chevrons + BOOST signs (source) -------------------------
  for (const zone of course.speedZones) {
    const positions = [], index = [];
    for (let row = 0; row <= 8; row++) {
      const d = zone.start + (zone.end - zone.start) * row / 8;
      for (const side of [-1, 1]) {
        const x = zone.x + side * zone.width / 2;
        positions.push(x, groundHeight(x, d) + .09, -d);
      }
      if (row < 8) {
        const n = row * 2;
        index.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#139ab5', side: THREE.DoubleSide })));
    for (let d = zone.start + 3; d < zone.end; d += 5) {
      const vertices = [];
      for (const [x, offset] of [[-3, 1], [0, -1.5], [3, 1], [3, 2.3], [0, -.2], [-3, 2.3]]) {
        vertices.push(zone.x + x, groundHeight(zone.x + x, d - offset) + .14, -d + offset);
      }
      const arrow = new THREE.BufferGeometry();
      arrow.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      arrow.setIndex([0, 1, 5, 1, 4, 5, 1, 2, 4, 2, 3, 4]);
      scene.add(new THREE.Mesh(arrow, new THREE.MeshBasicMaterial({ color: '#b2ffff', side: THREE.DoubleSide })));
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), label('BOOST', '#10677d', '#d7ffff'));
    sign.position.set(zone.x, groundHeight(zone.x, zone.start) + 2, -zone.start);
    scene.add(sign);
  }

  // --- chairlift along the left shoulder (source) -------------------------------------
  for (let d = 20; d < 1700; d += 125) {
    const x = courseCenter(d) - 37, y = groundHeight(x, d);
    const mast = box(.7, 16, .7, '#567381');
    mast.position.set(x, y + 8, -d);
    const cross = box(9, .45, .45, '#567381');
    cross.position.set(x, y + 16, -d);
    if (d < 1600) {
      const nd = d + 125, nx = courseCenter(nd) - 37, ny = groundHeight(nx, nd) + 16;
      for (const offset of [-3, 3]) {
        const cable = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x + offset, y + 16, -d), new THREE.Vector3(nx + offset, ny, -nd)]),
          new THREE.LineBasicMaterial({ color: '#465b6c' }),
        );
        scene.add(cable);
        const chair = box(3, .25, 1.2, '#e87447');
        chair.position.set((x + nx) / 2 + offset, (y + 16 + ny) / 2 - 3, -d - 62);
        const hanger = box(.08, 3, .08, '#465b6c');
        hanger.position.copy(chair.position);
        hanger.position.y += 1.5;
      }
    }
  }

  // --- pickups (source octahedra; per-rider claims handled by the sim) ----------------
  const pickups = [];
  for (const p of course.pickups) {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.85), new THREE.MeshStandardMaterial({ color: '#e6ff6e', emissive: '#afca24', emissiveIntensity: .4, metalness: .3, roughness: .3 }));
    mesh.position.set(p.x, groundHeight(p.x, p.d) + 1.5, -p.d);
    scene.add(mesh);
    pickups.push({ id: p.id, mesh });
  }

  // --- rider rigs (source rider() factory, verbatim) -----------------------------------
  function rider(color) {
    const group = new THREE.Group();
    const pivot = new THREE.Group();
    group.add(pivot);
    const stance = new THREE.Group();
    stance.rotation.y = Math.PI / 2;
    pivot.add(stance);
    const board = box(3, .15, .67, '#153340', stance);
    board.position.y = .17;
    const tip = box(.45, .18, .67, '#dfff70', stance);
    tip.position.set(1.3, .22, 0);
    tip.rotation.z = .13;
    const body = new THREE.Group();
    stance.add(body);
    for (const side of [-1, 1]) {
      const boot = box(.42, .28, .56, '#25303b', body);
      boot.position.set(side * .62, .34, 0);
      const leg = box(.42, .83, .42, '#24313b', body);
      leg.position.set(side * .48, .86, 0);
      leg.rotation.z = side * .18;
    }
    const torso = box(1.05, 1.14, .66, color, body);
    torso.position.set(0, 1.64, 0);
    torso.rotation.z = .08;
    const vest = box(.72, .7, .1, '#283d46', body);
    vest.position.set(0, 1.7, .37);
    const head = sphere(.39, '#fc7847', body);
    head.position.set(.05, 2.53, 0);
    const goggles = box(.6, .18, .18, '#193b48', body);
    goggles.position.set(.05, 2.56, -.32);
    for (const side of [-1, 1]) {
      const arm = box(.34, .93, .34, color, body);
      arm.position.set(side * .89, 1.57, 0);
      arm.rotation.z = side * .85;
      const hand = sphere(.2, '#233442', body);
      hand.position.set(side * 1.2, 1.32, 0);
    }
    scene.add(group);
    return { group, pivot, body };
  }

  const player = rider('#ff7043');
  const remoteRigs = new Map();

  // --- snow spray particles + contact shadow (source) ----------------------------------
  const particleCount = preset.particles;
  const particlePos = new Float32Array(particleCount * 3);
  const particleLives = new Float32Array(particleCount);
  particlePos.fill(-10000);
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
  const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: '#ffffff', size: .22, transparent: true, opacity: .75 }));
  scene.add(particles);
  let particleIndex = 0;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: '#476374', transparent: true, opacity: .18, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  // --- chase camera (source 64° perspective, ported follow math) ------------------------
  const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 1000);
  const cameraTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const smoothLookTarget = new THREE.Vector3(0, 2, -20);
  camera.position.set(12, 10, 22);

  /**
   * Frame update — the source tick's presentation section, driven by the
   * host loop. `localState` is the predicted rider state (null while
   * lobby/loading: the camera frames the start banner like the source's
   * ready phase); `remoteStates` are interpolated remote riders.
   */
  function update(time, dt, localState = null, remoteStates = []) {
    const clampedDt = Math.min(dt, 0.04);

    if (localState) {
      updateRider(player, localState, time, clampedDt, true);
      const ground = groundHeight(localState.x, localState.s);
      shadow.visible = true;
      shadow.position.set(localState.x, ground + .06, -localState.s);
      shadow.scale.setScalar(1 + Math.max(0, localState.y - ground) * .07);
    } else {
      // Lobby framing: the source ready-phase camera at the start gate.
      shadow.visible = false;
      updateRider(player, { x: 0, y: groundHeight(0, 0), s: 0, lateral: 0, v: 0 }, time, clampedDt, false);
    }

    // Remote riders: authoritative interpolated placement + same pose logic.
    const seen = new Set();
    for (const [index, remote] of remoteStates.entries()) {
      if (!remote?.state) continue;
      seen.add(remote.playerId);
      let rig = remoteRigs.get(remote.playerId);
      if (!rig) {
        rig = rider(remote.accent ?? RIVAL_ACCENTS[index % RIVAL_ACCENTS.length]);
        remoteRigs.set(remote.playerId, rig);
      }
      updateRider(rig, remote.state, time, clampedDt, false);
      // Remote pickups visible unless THIS viewer claimed them (per-rider).
      void rig;
    }
    for (const [playerId, rig] of remoteRigs) {
      if (!seen.has(playerId)) {
        scene.remove(rig.group);
        disposeRig(rig);
        remoteRigs.delete(playerId);
      }
    }

    // Pickups: spin forever; hide the ones THIS rider already claimed.
    for (const p of pickups) {
      p.mesh.rotation.y = time * 1.3;
      p.mesh.rotation.z = time * .5;
      p.mesh.visible = !localState?.pickupsClaimed?.includes(p.id);
    }

    // Snow spray while grounded and moving (source spawn cadence).
    if (localState && !localState.airborne) {
      for (let i = 0; i < 3; i++) {
        const n = particleIndex++ % particleCount;
        particlePos[n * 3] = localState.x + (rand() - 0.5) * 1.4;
        particlePos[n * 3 + 1] = localState.y + 0.15;
        particlePos[n * 3 + 2] = -localState.s + 0.7;
        particleLives[n] = 0.75;
      }
    }
    for (let i = 0; i < particleCount; i++) {
      if (particleLives[i] > 0 && localState) {
        particleLives[i] -= clampedDt;
        particlePos[i * 3 + 1] += 0.6 * clampedDt;
        if (particleLives[i] <= 0) particlePos[i * 3 + 1] = -10000;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;

    // Camera (source follow math, verbatim).
    if (localState) {
      const base = groundHeight(localState.x, localState.s);
      cameraTarget.set(
        localState.x * .8 + courseCenter(localState.s) * .2,
        Math.max(base + 6.5, localState.y + 5),
        -localState.s + 13 + (localState.boosting ? 2 : 0),
      );
      lookTarget.set(localState.x + localState.lateral * .15, localState.y + 1.2, -localState.s - 13);
    } else {
      const startX = 0, base = groundHeight(startX, 0);
      cameraTarget.set(startX + 10, base + 7.5, 17);
      lookTarget.set(startX, base + 2, -20);
    }
    camera.position.lerp(cameraTarget, 1 - Math.exp(-clampedDt * 5));
    // Smooth the aim point as well as the camera position. Snapping lookAt
    // directly to lateral rider motion made digital A/D carving jerk the
    // whole view even though the camera position itself was interpolated.
    smoothLookTarget.lerp(lookTarget, 1 - Math.exp(-clampedDt * 8));
    camera.lookAt(smoothLookTarget);
    camera.fov = THREE.MathUtils.lerp(camera.fov, localState?.boosting ? 76 : 64, clampedDt * 3);
    camera.updateProjectionMatrix();

    // Sun follows the rider so shadows stay crisp where it matters (source).
    const focus = localState ?? { x: 0, s: 0 };
    const base = groundHeight(focus.x, focus.s);
    sun.position.set(focus.x - 65, base + 110, -focus.s + 35);
    sun.target.position.set(focus.x, base, -focus.s - 25);
  }

  /**
   * One rider's world placement and pose — the source tick's player/rival
   * presentation, driven from a sim state (local predicted or remote
   * interpolated). Deterministic from the state; visuals never feed back.
   */
  function updateRider(rig, state, time, dt, isLocal) {
    const s = state.s ?? 0, x = state.x ?? 0;
    rig.group.position.set(x, state.y ?? 0, -s);
    rig.group.rotation.y = -Math.atan2(state.lateral ?? 0, Math.max(8, state.v ?? 0));
    const ridingRamp = course.ramps.find((r) => onRamp(r, x, s));
    rig.group.rotation.x = state.airborne ? 0 : ridingRamp ? Math.atan2(ridingRamp.height, ridingRamp.end - ridingRamp.start) : -0.18;
    rig.pivot.rotation.set(0, 0, 0);
    rig.pivot.position.y = 0;
    const crouchAmount = state.airborne ? 0 : Math.max(state.tucking ? 1 : 0, (state.charge ?? 0) * .7);
    rig.body.scale.y = THREE.MathUtils.lerp(rig.body.scale.y, 1 - crouchAmount * .3, dt * 10);
    rig.body.rotation.z = THREE.MathUtils.lerp(rig.body.rotation.z, state.leaning && !state.airborne ? -0.32 : 0, dt * 8);
    if ((state.bail ?? 0) > 0) {
      rig.pivot.rotation.z = 1.3;
      rig.pivot.position.y = -0.3;
    } else if (state.trick) {
      const p = Math.min(1, Math.max(0, state.trick.elapsed / state.trick.duration));
      if (state.trick.axis === 'grab') {
        rig.pivot.rotation.z = Math.sin(p * Math.PI) * .6;
        rig.pivot.position.y = -Math.sin(p * Math.PI) * .35;
      } else {
        rig.pivot.rotation[state.trick.axis] = p * Math.PI * 2;
      }
    } else {
      rig.pivot.rotation.z = -(state.lateral ?? 0) * .014;
    }
    void time;
    void isLocal;
  }

  function disposeRig(rig) {
    rig.group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
    });
    rig.group.removeFromParent();
  }

  function dispose() {
    for (const rig of remoteRigs.values()) disposeRig(rig);
    remoteRigs.clear();
    // Source destroy() semantics: dispose every geometry, every material
    // (including canvas textures) — renderer-owned resources are untouched.
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          material.map?.dispose();
          material.dispose();
        }
      }
    });
    materials.clear();
    scene.clear();
  }

  return {
    scene,
    camera,
    update,
    dispose,
    courseId: COURSE_ID,
    course,
    /** Test seam: pickup meshes by id (per-rider claim visibility checks). */
    getPickupMesh(id) {
      return pickups.find((p) => p.id === id)?.mesh ?? null;
    },
  };
}
