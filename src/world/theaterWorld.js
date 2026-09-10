import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { theaterMaterials } from './theaterTextures.js';
import { THEATER_CHANDELIER } from './theaterChandelierGeometry.js';

// The Orpheum auditorium. Large forms first: north wall and proscenium,
// coffered ceiling over the stage, grand arch, seat rows, projection booth.
//
// Visibility contract (isometric camera sits high to the south-east and looks
// down/north): the north wall, west wall, ceiling and stage may be tall; the
// east wall must stay low over the arcade cabinet row or the cabinets vanish
// behind it, and the south stays open. The ceiling therefore covers only
// z <= -2.2 so the stage and screen are always seen under its edge.
//
// Everything emissive or animated (screen sheen, marquee bulbs, aisle studs,
// projector beam, chandelier candles, cove light) is built from its own
// material so the static instanced batch skips it — animating batched meshes
// silently does nothing (AGENTS.md §7). Textured surfaces use per-mesh
// geometry with scaled UVs for the same reason: the batch only takes the
// shared unit-box geometry with flat, non-emissive materials.
//
// Seat rows sit at z = 0.3 / 2.5 / 4.7: shifted south of the screen wall so
// the player spawn (-9, 0) and the Kiln companion spawn (-8.2, 1) stay clear
// of the outermost seats while keeping two cross-aisles between the rows.
export function buildTheaterScenery(ctx) {
  const { group, block, box, glow, material, colors, items, animated, random } = ctx;
  const M = theaterMaterials();
  const ownedLights = ctx.owned?.lights ?? [];
  const GOLD = colors.brass;

  // --- Shared construction helpers -------------------------------------
  // Textured meshes own their geometry (and UV tiling) so the world factory's
  // static batch never strips the map off them.
  function uvScaleBox(geo, w, h, d, perMeter) {
    const uv = geo.attributes.uv;
    const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
      for (let i = 0; i < 4; i++) {
        const k = f * 4 + i;
        uv.setXY(k, uv.getX(k) * faces[f][0] * perMeter, uv.getY(k) * faces[f][1] * perMeter);
      }
    }
    uv.needsUpdate = true;
  }
  function texBox(x, y, z, w, h, d, mat, perMeter = .6, rx = 0, ry = 0, rz = 0) {
    if (!mat) return box(x, y, z, w, h, d, '#3a2b21');
    const geo = new THREE.BoxGeometry(w, h, d);
    uvScaleBox(geo, w, h, d, perMeter);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  // Lazy BufferGeometry per Blender-baked chandelier material group.
  const bakedCache = new Map();
  function bakedGeometry(name) {
    if (!bakedCache.has(name)) {
      const source = THEATER_CHANDELIER[name] ?? { positions: [], indices: [] };
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(source.positions), 3));
      geo.setIndex(source.indices);
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      bakedCache.set(name, geo);
    }
    return bakedCache.get(name);
  }
  function raw(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  // Emissive families (own materials; never batched).
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#ffe6bd', emissive: '#ffc978', emissiveIntensity: 1.5, roughness: .45, metalness: 0 });
  const coveMat = new THREE.MeshStandardMaterial({ color: '#e9c48c', emissive: '#c08a45', emissiveIntensity: .5, roughness: .6, metalness: 0 });
  const haloMat = new THREE.SpriteMaterial({
    map: M?.__glowSprite ?? null, color: '#ffd9a0', transparent: true, opacity: M ? .34 : 0,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const halos = [];
  function halo(x, y, z, scale) {
    if (!M) return null;
    const sprite = new THREE.Sprite(haloMat);
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(scale);
    group.add(sprite);
    halos.push({ sprite, base: scale, phase: halos.length * 1.7 });
    return sprite;
  }

  // --- Floor: polished stone under a patterned house carpet --------------
  texBox(0, .12, .4, 27.0, .02, 23.0, M?.marble, .3);
  const carpetMain = texBox(0, .152, -.1, 18.6, .03, 14.0, M?.carpet, .3);
  const carpetLobby = texBox(0, .152, 8, 18.6, .03, 2, M?.carpet, .3);
  carpetMain.renderOrder = 1; carpetLobby.renderOrder = 1;
  for (const x of [-9.15, 9.15]) box(x, .172, 1.6, .07, .025, 15.4, GOLD);
  for (const z of [-7.0, 6.95]) box(0, .172, z, 18.5, .025, .07, GOLD);
  for (const z of [-1.35, 1.4, 3.6, 5.85]) {
    box(0, .17, z, 18.3, .02, .045, '#98754e');
  }
  for (const z of [1.4, 3.6]) for (const x of [-8.95, 8.95]) glow(x, .21, z, .12, .05, .22, '#ffca7a', .65);

  // --- Screen wall (north): stage platform + dark glass screen -----------
  box(0, .25, -8.3, 14, .5, 2.4, '#3a3134'); // visual elevation only; actors stay at y=0
  block(0, -8.3, 14, 2.4);
  texBox(0, .51, -8.3, 13.9, .03, 2.3, M?.stageWood, 1.1);
  box(0, .42, -7.12, 14.2, .2, .18, '#8a6a3c');
  box(0, .68, -7.16, 14.4, .07, .1, GOLD);
  const stageLip = glow(0, .52, -7.12, 14.2, .05, .06, '#ffdca8', 1.3);
  box(0, .2, -6.95, 15.2, .4, .8, '#4a3423');
  box(0, .1, -6.35, 15.2, .2, .6, '#503a27');
  box(0, .22, -6.1, 15.2, .05, .12, '#c69a58');
  box(0, .5, -7.35, 15.2, .08, .22, '#8a6a3c');
  for (const s of [-1, 1]) {
    box(s * 8.1, .14, -6.9, 1.3, .28, .7, '#4a3423');
    box(s * 8.1, .34, -6.75, 1.4, .08, .3, '#c69a58');
  }
  const screen = glow(0, 3.1, -8.35, 13, 4, .15, '#101418', .12);
  // Brass trim framing all four sides of the screen.
  for (const [y, w, h, d] of [[5.32, 13.9, .34, .4], [.88, 13.9, .34, .4]]) box(0, y, -8.32, w, h, d, GOLD);
  for (const x of [-6.8, 6.8]) box(x, 3.1, -8.32, .34, 4.8, .4, GOLD);
  box(0, 5.62, -8.32, 13.6, .22, .5, '#2b2015');
  // Swagged velvet valance framing the top of the screen, with a gold fringe.
  for (const x of [-4.6, 0, 4.6]) {
    const swag = raw(new THREE.TorusGeometry(2.3, .3, 8, 26, Math.PI), M?.velvetCurtain, x, 5.9, -7.72);
    swag.scale.set(1, .32, 1);
    swag.rotation.z = Math.PI;
    for (let t = 0; t <= 1.001; t += .1) {
      const a = Math.PI * (1 - t);
      box(x + Math.cos(a) * 2.3, 5.9 - Math.sin(a) * .74 - .13, -7.55, .05, .15, .05, '#d8b46c');
    }
  }
  // Deep proscenium reveal: the screen sits in a gold-lined shadow box with
  // velvet drapes tucked into the opening and a fringe valance across the top.
  for (const [y, h] of [[5.5, .5], [.7, .5]]) {
    box(0, y, -7.95, 14.8, h, 1.7, '#2b2015');
    box(0, y, -7.14, 14.9, h, .12, '#c69a58');
  }
  for (const sx of [-1, 1]) {
    box(sx * 7.3, 3.1, -7.95, .8, 5.8, 1.7, '#2b2015');
    box(sx * 6.94, 3.1, -7.14, .12, 5.8, .12, '#c69a58');
    raw(new THREE.CylinderGeometry(.85, 1.05, 5.5, 14), M?.velvetCurtain, sx * 7.15, 3.0, -7.7);
    for (let f = -1; f <= 1; f++) {
      raw(new THREE.CylinderGeometry(.13, .17, 5.3, 8), M?.velvetCurtain, sx * (6.55 + f * .3), 3.0, -7.3);
    }
    box(sx * 7.15, 5.7, -7.7, 2.4, .5, 1.5, '#5a1722');
  }
  box(0, 5.52, -7.6, 13.6, .5, .6, '#5a1722');
  box(0, 5.3, -7.34, 13.3, .08, .12, '#d8b46c');
  for (let x = -6.4; x <= 6.4; x += .4) box(x, 5.24, -7.34, .1, .12, .1, '#d8b46c');
  // Footlights along the stage lip.
  const footlights = [];
  for (let x = -6.2; x <= 6.2; x += .8) footlights.push(glow(x, .56, -7.12, .18, .12, .18, '#ffca7a', .9));
  // Screen quad for the DOM overlay: four corners of the screen surface.
  ctx.screenQuad = [
    new THREE.Vector3(-6.5, 1.1, -8.28),
    new THREE.Vector3(6.5, 1.1, -8.28),
    new THREE.Vector3(6.5, 5.1, -8.28),
    new THREE.Vector3(-6.5, 5.1, -8.28),
  ];
  animated.push((time, done) => {
    screen.material.emissiveIntensity = done ? .45 + Math.sin(time * 2) * .08 : .12;
    footlights.forEach((b, i) => { b.material.emissiveIntensity = done ? 1.9 + Math.sin(time * 2.4 + i * .5) * .22 : 1.2; });
  });

  // --- North wall: towering panelled wood, gilded frieze, glowing niches -
  texBox(0, 6.0, -9.55, 23.4, 12.0, .3, M?.wood, .42);
  box(0, .78, -9.36, 23.2, 1.56, .14, '#221610');
  box(0, 1.58, -9.33, 23.2, .09, .18, '#c69a58');
  for (const x of [-9.3, -11.35, 9.3, 11.35]) {
    box(x, 4.8, -9.36, .52, 9.6, .3, '#2f2016');
    box(x, 9.42, -9.34, .7, .34, .42, '#c69a58');
    box(x, .2, -9.34, .7, .4, .42, '#c69a58');
    box(x, 4.75, -9.28, .34, 9.0, .12, '#3d2a1c');
  }
  // Lower tier of lit niches with framed paintings.
  for (const x of [-10.1, 10.1]) {
    box(x, 2.7, -9.34, 1.5, 2.9, .16, '#120d0a');
    box(x, 4.22, -9.3, 1.7, .12, .22, '#c69a58');
    box(x, 1.18, -9.3, 1.7, .12, .22, '#c69a58');
    box(x + .82, 2.7, -9.3, .12, 3.1, .22, '#c69a58');
    box(x - .82, 2.7, -9.3, .12, 3.1, .22, '#c69a58');
    const art = raw(new THREE.PlaneGeometry(1.05, 1.6), (x < 0 ? M?.paintingA : M?.paintingB) ?? material('#8a6a45'), x, 2.6, -9.2);
    art.receiveShadow = true;
    box(x, 3.56, -9.18, .24, .1, .14, '#c69a58');
    glow(x, 3.48, -9.14, .18, .1, .1, '#ffd9a0', 1.6);
    halo(x, 3.4, -8.95, 1.5);
  }
  // Upper tier of arched panels above the lower niches.
  for (const x of [-10.1, 10.1]) {
    box(x, 7.4, -9.38, 1.8, 2.4, .12, '#241811');
    glow(x, 7.4, -9.3, 1.3, 1.9, .06, '#b97f42', .45);
    const upperArch = raw(new THREE.TorusGeometry(1.3, .12, 6, 26, Math.PI), material('#c69a58'), x, 8.7, -9.32, 0, Math.PI / 2, 0);
    upperArch.scale.set(1, .5, 1);
    box(x, 6.18, -9.34, 2.1, .1, .2, '#c69a58');
    for (let dx = -1.1; dx <= 1.1; dx += .44) box(x + dx, 8.72, -9.34, .14, .3, .18, '#c69a58');
  }
  // Frieze band and top cornice under the vault.
  texBox(0, 9.55, -9.32, 23.2, .8, .12, M?.gilt, 1.0);
  box(0, 10.05, -9.3, 23.2, .12, .22, '#c69a58');
  box(0, 11.3, -9.28, 23.4, .5, .6, '#2b2015');
  for (let x = -11.2; x <= 11.2; x += .5) box(x, 10.86, -9.34, .2, .3, .22, '#c69a58');

  // --- Proscenium: wide piers, gilded arch, drapery ----------------------
  for (const s of [-1, 1]) {
    box(s * 8.55, 3.5, -7.95, 1.6, 7.0, 1.7, '#33231a');
    box(s * 8.55, 6.68, -7.45, 1.8, .5, .7, '#c69a58');
    box(s * 8.55, .4, -7.5, 1.8, .8, .8, '#c69a58');
    box(s * 7.9, 3.5, -7.6, .3, 7.2, .55, '#caa066');
    texBox(s * 8.9, 3.5, -8.35, .8, 6.4, .3, M?.gilt, 1.1);
    // Heavy side drape with vertical fold ridges.
    raw(new THREE.CylinderGeometry(.72, .9, 5.6, 14), M?.velvetCurtain, s * 9.35, 3.0, -8.5);
    for (let f = -2; f <= 2; f++) {
      raw(new THREE.CylinderGeometry(.12, .16, 5.4, 8), M?.velvetCurtain, s * (8.85 + f * .24), 3.0, -8.05 - Math.abs(f) * .06);
    }
    box(s * 9.35, 5.9, -8.5, 1.7, .28, 1.3, '#5a1722');
    box(s * 9.35, 6.08, -8.4, 1.8, .12, .5, '#c69a58');
  }
  const arch = raw(new THREE.TorusGeometry(8.05, .55, 10, 48, Math.PI), M?.goldTrim ?? material(GOLD), 0, 6.0, -8.7);
  arch.scale.set(1, .28, 1);
  const archInner = raw(new THREE.TorusGeometry(7.45, .22, 8, 44, Math.PI), material('#caa066'), 0, 5.9, -8.5);
  archInner.scale.set(1, .28, 1);
  // Entablature over the arch with a cartouche crest.
  texBox(0, 8.55, -8.55, 18.6, .85, 1.4, M?.gilt, 1.3);
  box(0, 8.1, -8.3, 18.8, .15, .4, '#c69a58');
  for (let x = -8.6; x <= 8.6; x += .52) box(x, 8.98, -8.1, .22, .26, .2, '#c69a58');
  raw(new THREE.TorusGeometry(.7, .13, 8, 24), M?.goldTrim ?? material(GOLD), 0, 8.55, -7.95);
  raw(new THREE.SphereGeometry(.34, 14, 12), material('#caa066'), 0, 8.55, -7.95);
  halo(0, 8.55, -7.6, 2.6);
  const archCove = box(0, 8.18, -7.85, 17.6, .07, .07, '#e9c48c');
  archCove.material = coveMat;
  halo(0, 8.0, -7.6, 4.0);

  // --- Vaulted ceiling: cut-away far roof that reads as the grand hall
  // ceiling. A horizontal slab would only ever show its top face to a camera
  // 25 units up; a plane rising away from the viewer shows its decorated
  // face, which is how the isometric frame can hold a real ceiling. It sits
  // over the stage only (z <= -4.8) so the screen and the arch stay clear,
  // and it deliberately casts no shadow: the sun must keep lighting the
  // house through the cut-away near roof.
  const vault = new THREE.Group();
  const vaultLen = Math.hypot(5.8, 2.5);
  vault.position.set(0, 9.95, -6.9);
  vault.rotation.x = -Math.atan2(2.5, 5.8);
  group.add(vault);
  {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(23.2, .3, vaultLen), M?.ceiling ?? material('#6f5a3e'));
    slab.receiveShadow = true; vault.add(slab);
    for (const x of [-8.6, -4.3, 0, 4.3, 8.6]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(.34, .3, vaultLen), material('#4a3823'));
      rib.position.set(x, .24, 0); vault.add(rib);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(.38, .06, vaultLen), material('#c69a58'));
      trim.position.set(x, .4, 0); vault.add(trim);
    }
    for (const z of [-3.0, -2.0, -.6, .8, 2.2]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(23.2, .3, .34), material('#4a3823'));
      rib.position.set(0, .24, z); vault.add(rib);
    }
    for (const x of [-8.6, -4.3, 0, 4.3, 8.6]) for (const z of [-3.0, -2.0, -.6, .8, 2.2]) {
      const rose = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), M?.goldTrim ?? material(GOLD));
      rose.position.set(x, .38, z); rose.scale.set(1, .45, 1); vault.add(rose);
    }
    // Cornice and cove at the south edge of the vault.
    const edge = new THREE.Mesh(new THREE.BoxGeometry(23.4, .6, .8), material('#2b2015'));
    edge.position.set(0, -.1, vaultLen / 2 - .2); vault.add(edge);
    const cove = new THREE.Mesh(new THREE.BoxGeometry(22.8, .1, .1), coveMat);
    cove.position.set(0, -.34, vaultLen / 2 - .45); vault.add(cove);
  }

  // --- Chandeliers: Blender-baked mesh, warm point light -----------------
  // The fixture mesh is generated by scripts/theater-chandelier.py into
  // theaterChandelierGeometry.js: one BufferGeometry per material group, so
  // two fixtures share four draw calls and no async GLB fetch.
  const chandelierParts = [
    [bakedGeometry('brass'), M?.brassRich ?? material(GOLD)],
    [bakedGeometry('candle'), material('#f2e7d2')],
    [bakedGeometry('flame'), bulbMat],
    [bakedGeometry('crystal'), M?.crystal ?? material('#dfe8f0')],
  ];
  for (const s of [-1, 1]) {
    const cx = s * 7.7, cz = -2.8;
    box(cx, 8.6, cz, .05, .6, .05, '#c69a58');
    const chandelier = new THREE.Group();
    chandelier.position.set(cx, 7.9, cz);
    group.add(chandelier);
    for (const [geo, mat] of chandelierParts) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = false;
      chandelier.add(mesh);
    }
    const light = new THREE.PointLight('#ffd9a0', 52, 36, 2);
    light.position.set(cx, 7.0, cz);
    group.add(light);
    ownedLights.push(light);
    halo(cx, 6.3, cz, 4.4);
  }
  // Warm hall and audience fill keep the paneling, gilding and velvet
  // legible under the cool global sky (group lights render only while this
  // place is the active world).
  const hallLight = new THREE.HemisphereLight('#ffdcb0', '#2a1a14', .68);
  const hallAmbient = new THREE.AmbientLight('#4a3828', .42);
  group.add(hallAmbient);
  ownedLights.push(hallAmbient);
  group.add(hallLight);
  ownedLights.push(hallLight);
  const stageLight = new THREE.PointLight('#ffe0b0', 44, 24, 2);
  stageLight.position.set(0, 5.4, -7.2);
  group.add(stageLight);
  ownedLights.push(stageLight);
  // A single soft warm directional fill from the audience side stands in for
  // the chandeliers' bounced light: it lifts the velvet, carpet and paneling
  // that the steep sun cannot reach inside the cut-away room.
  const hallFill = new THREE.DirectionalLight('#ffd8ac', 1.25);
  hallFill.position.set(7, 17, 11);
  group.add(hallFill);
  ownedLights.push(hallFill);
  // Stage key: the stage is the room's brightest source, spilling warm light
  // down the first rows instead of letting the media screen own the frame.
  const stageKey = new THREE.PointLight('#ffe3b8', 60, 22, 2);
  stageKey.position.set(0, 3.0, -6.6);
  group.add(stageKey);
  ownedLights.push(stageKey);
  const stagePool = new THREE.PointLight('#ffd9a0', 26, 14, 2);
  stagePool.position.set(0, 1.1, -5.2);
  group.add(stagePool);
  ownedLights.push(stagePool);
  // The screen is a DOM overlay: it cannot emit in the 3D scene by itself,
  // so a cool pool in front of the glass stands in for its spill on the
  // stage and the first rows.
  const screenSpill = new THREE.PointLight('#dfe8f5', 20, 18, 2);
  screenSpill.position.set(0, 3.2, -5.4);
  group.add(screenSpill);
  ownedLights.push(screenSpill);

  // --- West wall (far side): full-height panelled gallery ---------------
  texBox(-11.62, 3.8, -1.4, .3, 7.6, 15.6, M?.wood, .42);
  box(-11.44, 7.34, -1.4, .22, .34, 15.8, '#2b2015');
  box(-11.42, 7.55, -1.4, .28, .12, 15.8, '#c69a58');
  for (const z of [-8.6, -5.6, -2.6, .4, 3.4]) {
    box(-11.45, 3.9, z, .34, 7.8, .6, '#2f2016');
    box(-11.42, 7.55, z, .42, .34, .72, '#c69a58');
    box(-11.42, .25, z, .42, .5, .72, '#c69a58');
    if (z > -7) {
      box(-11.52, 4.1, z + 1.45, .14, 1.7, 2.1, '#1c130d');
      const art = raw(new THREE.PlaneGeometry(1.7, 1.25), (z < 0 ? M?.paintingB : M?.paintingA) ?? material('#8a6a45'), -11.42, 4.05, z + 1.45, 0, Math.PI / 2, 0);
      art.receiveShadow = true;
      box(-11.4, 4.95, z + 1.45, .16, .1, .5, '#c69a58');
      glow(-11.36, 4.86, z + 1.45, .1, .1, .4, '#ffd9a0', 1.6);
      halo(-11.2, 4.8, z + 1.45, 1.4);
      box(-11.52, 6.35, z + 1.45, .14, 1.5, 2.0, '#241811');
      glow(-11.48, 6.35, z + 1.45, .05, 1.3, 1.7, '#b97f42', .42);
    }
  }
  // Gilded panel mouldings frame each bay between the pilasters.
  for (const z of [-7.1, -4.1, -1.1, 1.9, 4.9]) {
    box(-11.5, 1.9, z, .06, .1, 1.9, '#c69a58');
    box(-11.5, 1.0, z, .06, .1, 1.9, '#c69a58');
    box(-11.5, 1.45, z - .95, .06, .9, .1, '#c69a58');
    box(-11.5, 1.45, z + .95, .06, .9, .1, '#c69a58');
  }
  // Wall sconces between the pilasters.
  for (const z of [-7.1, -4.1, -1.1, 1.9, 4.9]) {
    box(-11.5, 2.35, z, .16, .5, .16, '#c69a58');
    box(-11.45, 2.62, z, .12, .7, .34, '#2f2016');
    raw(new THREE.CylinderGeometry(.12, .2, .3, 10, 1, true), M?.goldTrim ?? material(GOLD), -11.3, 2.95, z);
    glow(-11.26, 2.9, z, .16, .18, .16, '#ffd9a0', 1.8);
    halo(-11.2, 2.95, z, 1.5);
  }
  // Narrow gallery ledge and balustrade along the west wall: overhead
  // (y ~3.4), so the walk below and every collision rectangle are untouched.
  box(-11.42, 3.32, -1.4, .4, .12, 15.4, '#2f2016');
  box(-11.28, 3.52, -1.4, .14, .1, 15.4, '#c69a58');
  box(-11.28, 3.4, -1.4, .1, .06, 15.4, '#8a6a3c');
  for (let z = -9; z <= 6.2; z += .46) {
    box(-11.28, 3.44, z, .05, .24, .05, '#c69a58');
  }

  // --- East wall (near side): low panelling keeps the cabinets visible ---
  for (const z of [-4.5, 2.8, 6.4]) {
    texBox(11.64, 1.65, z, .26, 3.1, 2.3, M?.wood, .5);
    for (let dz = -.9; dz <= .9; dz += .3) box(11.48, 1.6, z + dz, .12, 2.8, .06, '#765447');
    box(11.4, 3.28, z, .3, .22, 2.4, '#c69a58');
    box(11.38, 1.9, z, .18, .65, .4, '#c69a58');
    glow(11.25, 1.9, z, .12, .45, .24, '#ffcc89', 1.5);
    halo(11.25, 2.0, z, 1.3);
  }

  // Gilded pilaster casings dress the plain legacy exit slabs at x = +/-10.7
  // so they read as theatre exits. Flat against the wall (x ~ 11.08), no
  // collision, clear of the arcade cabinet row at z <= -1.35.
  for (const s of [-1, 1]) for (const z of [-2.6, 2.6]) {
    box(s * 11.08, 2.5, z, .3, 5.0, .45, '#2f2016');
    box(s * 11.04, 5.15, z, .4, .4, .6, '#c69a58');
    box(s * 11.04, .3, z, .4, .5, .6, '#c69a58');
  }
  for (const s of [-1, 1]) {
    box(s * 11.1, 5.0, 0, .24, .34, 5.0, '#2f2016');
    box(s * 11.06, 5.28, 0, .3, .12, 5.2, '#c69a58');
  }

  // --- South return: a low panelled wall with two framed poster cases so
  // the near edge of the diorama reads as an enclosed lobby, not open floor.
  box(0, .85, 10.15, 23.4, 1.7, .3, '#241812');
  box(0, 1.78, 10.1, 23.4, .16, .42, '#c69a58');
  for (const [x, art] of [[-4.6, M?.paintingA], [4.6, M?.paintingB]]) {
    box(x, 1.5, 10.0, 1.6, 2.1, .08, '#c69a58');
    box(x, 1.5, 9.95, 1.3, 1.8, .06, '#120d0a');
    const poster = raw(new THREE.PlaneGeometry(1.2, 1.7), art ?? material('#8a6a45'), x, 1.5, 9.91, 0, Math.PI, 0);
    poster.receiveShadow = true;
    glow(x, 2.72, 9.92, 1.0, .12, .1, '#ffd9a0', 1.6);
  }

  // --- Projection booth: raised rear-center platform throwing straight
  // down the room axis at the screen center, over the audience. The beam
  // is a translucent additive cone with its own material (the static batch
  // only takes opaque boxes) and stays invisible until the projector is
  // restored — its base color must never read as a lit stick at rest.
  box(0, 1.7, 9.35, 2.3, 3.4, 1.7, colors.dark); block(0, 9.35, 2.3, 1.7);
  box(0, 3.47, 9.35, 2, .14, 1.4, '#33393c');
  box(0, 3.69, 9.2, .6, .3, .6, '#33393c');
  box(0, 4.09, 9.2, .55, .5, .8, '#22282b');
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .45, 10), material(colors.brass));
  lens.rotation.x = Math.PI / 2; lens.position.set(0, 4.09, 8.72); group.add(lens);
  const lensDot = glow(0, 4.09, 8.6, .18, .18, .12, '#ffe9c0', 0);
  const beamOrigin = new THREE.Vector3(0, 4.09, 8.72);
  const beamDir = new THREE.Vector3(0, 3.1, -8.25).sub(beamOrigin);
  const beamLen = beamDir.length();
  const beamMat = new THREE.MeshBasicMaterial({
    color: '#ffe9c0', transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.14, 1.5, 1, 14, 1, true), beamMat);
  beam.geometry.translate(0, -.5, 0); // apex at the mesh origin, span along -Y
  beam.position.copy(beamOrigin);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamDir.normalize());
  beam.scale.set(1, beamLen, 1);
  beam.visible = false; group.add(beam);
  animated.push((time, done) => {
    beam.visible = done;
    beamMat.opacity = .11 + Math.sin(time * 7) * .025;
    lensDot.material.emissiveIntensity = done ? 1.4 + Math.sin(time * 7) * .3 : 0;
  });

  // --- Aisle lamps: emissive floor studs along both aisles ---------------
  const studs = [];
  for (const x of [-3.5, 3.5]) for (const z of [1.4, 3.6]) studs.push(glow(x, .1, z, .18, .1, .18, '#ffca7a', .15));
  animated.push((time, done) => {
    studs.forEach((s, i) => { s.material.emissiveIntensity = done ? 1.7 + Math.sin(time * 2 + i) * .3 : .15; });
  });

  // Reusable detailed parts: batch by geometry/material, including curved
  // upholstery, so a full house costs a handful of draw calls.
  const parts = new Map();
  const velvet = M?.velvetSeat ?? new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .96, metalness: 0 });
  const metal = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .38, metalness: .65 });
  const rounded = new RoundedBoxGeometry(1, 1, 1, 3, .12);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
  const ring = new THREE.TorusGeometry(1, .18, 8, 20);
  const kernel = new THREE.IcosahedronGeometry(1, 1);
  function part(geo, mat, x, y, z, w, h, d, color, rx = 0) {
    let batch = parts.get(geo);
    if (!batch) parts.set(geo, batch = new Map());
    if (!batch.has(mat)) batch.set(mat, []);
    const transform = new THREE.Object3D();
    transform.position.set(x, y, z); transform.scale.set(w, h, d);
    transform.rotation.x = rx; transform.updateMatrix();
    batch.get(mat).push({ matrix: transform.matrix.clone(), color: new THREE.Color(color) });
  }
  const cushion = (x, y, z, w, h, d, color, rx = 0) => part(rounded, velvet, x, y, z, w, h, d, color, rx);
  const center = [-2.75, -1.65, -.55, .55, 1.65, 2.75];
  const sides = [3.9, 5, 6.1, 7.2, 8.15];
  const rowXs = [...center, ...sides, ...sides.map(v => -v)];
  for (const [z, n] of [[.3, 1], [2.5, 2], [4.7, 3]]) {
    for (const [i, x] of rowXs.entries()) {
      // Outer envelope matches collision; front dismount stays clear.
      block(x, z, .76, .62);
      const red = i % 3 === 0 ? '#b34d61' : '#a03f52';
      cushion(x, .48, z - .02, .58, .22, .59, red);
      cushion(x, .89, z + .24, .65, .92, .19, '#5a2833', -.10);
      cushion(x, .91, z + .13, .57, .79, .18, red, -.10);
      cushion(x, 1.20, z + .09, .49, .22, .13, '#c05a6e', -.10);
      // Padded vertical channels give the upholstery depth at eye level.
      for (const dx of [-.16, 0, .16]) cushion(x + dx, .86, z + .025, .135, .40, .055, red, -.10);
      box(x, .19, z + .08, .13, .29, .22, '#3a2a30');
      cushion(x, .17, z + .06, .47, .055, .39, '#303238');
      for (const dx of [-.34, .34]) {
        box(x + dx, .42, z + .06, .06, .49, .30, '#3a2a30');
        cushion(x + dx, .70, z, .10, .12, .65, '#5a2833');
        part(ring, metal, x + dx, .77, z - .20, .055, .055, .055, '#ae8953', Math.PI / 2);
        part(cylinder, metal, x + dx, .743, z - .20, .042, .045, .042, '#151b20');
      }
      // Brass identification plaque on the back, visible from the next row.
      box(x, 1.08, z + .36, .14, .065, .02, colors.brass);
      items.push({ type: 'seat', x, z, title: 'Take a seat', sub: `Row ${n} · Seat ${i + 1} · The Orpheum` });
    }
  }

  // Concessions: paneled walnut counter, striped popcorn cabinet, brass
  // kettle, a lit warming bed, paper cartons, soda fountain and snack trays.
  box(-6.6, .65, 9.2, 5.1, 1.05, 1.2, '#48342e'); block(-6.6, 9.2, 5.1, 1.2);
  box(-6.6, 1.21, 9.2, 5.3, .13, 1.4, '#c0a983');
  for (const x of [-8.5, -7.5, -6.5, -5.5, -4.5]) {
    box(x, .65, 8.58, .78, .74, .04, '#6c493a');
    box(x, .99, 8.54, .64, .025, .03, colors.brass);
  }
  const px = -8;
  cushion(px, 1.38, 9.2, 1.2, .23, .94, '#8a3036');
  cushion(px, 2.60, 9.2, 1.35, .24, 1.04, '#8a3036');
  glow(px, 2.44, 9.2, 1.02, .035, .73, '#ffcf7b', .8);
  for (const dx of [-.54, .54]) for (const dz of [-.4, .4]) box(px + dx, 1.99, 9.2 + dz, .055, 1.08, .055, colors.brass);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.04, .97, .79), new THREE.MeshStandardMaterial({ color: '#d5e1dc', transparent: true, opacity: .10, roughness: .12, depthWrite: false }));
  glass.position.set(px, 1.98, 9.2); group.add(glass);
  part(cylinder, metal, px, 2.16, 9.2, .30, .25, .30, '#ad885b');
  part(cylinder, metal, px, 2.32, 9.2, .34, .06, .34, '#d1b17b');
  box(px, 2.4, 9.2, .04, .14, .04, '#45454a');
  for (let i = 0; i < 150; i++) {
    const x = px + Math.sin(i * 43.7) * .46, z = 9.2 + Math.cos(i * 17.3) * .33;
    part(kernel, velvet, x, 1.55 + (i % 5) * .026, z, .047, .043, .044, i % 3 ? '#efcd83' : '#fff0b9');
  }
  for (let i = 0; i < 9; i++) box(px - .52 + i * .13, 2.61, 8.67, .055, .17, .02, '#e9d6ae');
  for (const x of [-6.9, -6.45, -6]) {
    cushion(x, 1.48, 9.0, .29, .42, .29, '#ecdbb5');
    for (const dx of [-.09, .03]) box(x + dx, 1.48, 8.848, .035, .37, .014, '#a13d40');
    for (let i = 0; i < 9; i++) part(kernel, velvet, x + Math.sin(i * 5) * .10, 1.71, 9 + Math.cos(i * 4) * .10, .046, .04, .045, '#ffe4a0');
  }
  cushion(-4.8, 1.73, 9.35, .88, .94, .65, '#283a3c');
  for (const [i, color] of ['#a95140', '#bd9a4e', '#528482'].entries()) {
    glow(-5.07 + i * .27, 1.91, 9.01, .19, .25, .025, color, .25);
    box(-5.07 + i * .27, 1.64, 8.97, .05, .15, .12, colors.brass);
  }
  box(-4.8, 1.31, 8.93, .88, .06, .32, '#848680');
  // Waste bin and a ticket pedestal at the rear, outside the cross aisle.
  cushion(7.8, .66, 8.8, .76, 1.02, .76, '#2e4141'); block(7.8, 8.8, .76, .76);
  cushion(7.8, 1.21, 8.8, .81, .15, .81, '#ab926a');
  box(7.8, 1.30, 8.8, .43, .025, .38, '#111d24');
  box(4.6, .72, 9.15, 1.1, 1.16, .68, '#604339'); block(4.6, 9.15, 1.1, .68);
  box(4.6, 1.34, 9.15, 1.2, .10, .8, colors.brass);
  for (let i = 0; i < 5; i++) box(4.6 + i * .03, 1.41 + i * .025, 9.15, .52, .018, .3, '#dac9a1');

  // --- Arcade wall (east): the canonical cabinets (activity runtime) line
  // this wall at x = 10.42, fronts facing west, z = -7.4 / -5.7 / -3.85 /
  // -1.8 (north end clears the proscenium side drape and the east gate arch
  // at z -1.2..+1.2). The inset runner carpet, brass borders and emissive floor studs
  // frame that row; positions are clear of all 45 seat sightlines to the
  // movie screen, the east travel gate at (10.7, 0), and leave >= 1.2m
  // accessible routes on the stand side.
  box(9.1, .178, -4.5, 3.8, .025, 7.8, '#1e2430');
  box(7.2, .196, -4.5, .045, .02, 7.8, colors.brass);
  box(11.0, .196, -4.5, .045, .02, 7.8, colors.brass);
  box(9.1, .196, -.6, 3.8, .02, .045, colors.brass);
  box(9.1, .196, -8.4, 3.8, .02, .045, colors.brass);

  const arcadeStuds = [];
  for (const x of [7.6, 9.7]) {
    for (const z of [-7.4, -5.7, -3.85, -1.8]) {
      arcadeStuds.push(glow(x, .18, z, .14, .06, .14, '#ffca7a', .6));
    }
  }
  animated.push((time, done) => {
    arcadeStuds.forEach((s, i) => {
      s.material.emissiveIntensity = done ? 1.5 + Math.sin(time * 2.5 + i) * .3 : .6;
    });
  });

  // --- Summit Run bay (add-multiplayer-snowboard-arcade 2.3): the fifth
  // machine stands alone at (10.42, 2.6), south of the east gate arch, where
  // the four-machine row cannot reach. Same runner-carpet framing as the main
  // row plus its own wall-side queue studs; the rider queue line (manifest
  // anchors, x = 9.3, z 0.35..5.25) runs along the open promenade between the
  // bay and the seat rows, with cross-aisle dismounts at z = 1.4 / 3.6.
  box(9.1, .178, 2.6, 3.8, .025, 3.4, '#1e2430');
  box(9.1, .196, .9, 3.8, .02, .045, colors.brass);
  box(9.1, .196, 4.3, 3.8, .02, .045, colors.brass);
  box(7.2, .196, 2.6, .045, .02, 3.4, colors.brass);
  box(11.0, .196, 2.6, .045, .02, 3.4, colors.brass);
  const summitStuds = [];
  for (const z of [0.35, 1.05, 1.75, 2.45, 3.15, 3.85, 4.55, 5.25]) {
    summitStuds.push(glow(9.7, .18, z, .12, .06, .12, '#7acbd4', .6));
  }
  animated.push((time, done) => {
    summitStuds.forEach((s, i) => {
      s.material.emissiveIntensity = done ? 1.4 + Math.sin(time * 2 + i * .8) * .3 : .6;
    });
  });

  // Backlit arcade marquee / wall signage board along the east perimeter wall,
  // centered over the cabinet row (cabinet tops sit at ~1.73m; the board
  // starts at 1.58m on the wall plane itself, clear of the machines).
  box(11.15, 2.2, -4.65, .16, 1.2, 3.4, '#1b1e24');
  box(11.12, 2.82, -4.65, .18, .06, 3.5, colors.brass);
  box(11.12, 1.58, -4.65, .18, .06, 3.5, colors.brass);
  box(11.12, 2.2, -2.93, .18, 1.25, .06, colors.brass);
  box(11.12, 2.2, -6.37, .18, 1.25, .06, colors.brass);
  const arcadeSign = glow(11.05, 2.2, -4.65, .06, .95, 3.0, '#ffd9a0', .75);
  animated.push((time, done) => {
    arcadeSign.material.emissiveIntensity = done ? 1.4 + Math.sin(time * 3) * .2 : .75;
  });

  // --- West Billiards Lounge (Flagship Pool, Tasks 5.1-5.5) ---
  // Symmetrical counterpart to the east arcade wing: centered at x = -8.6,
  // z = -4.5. Runner carpet and brass borders frame the table area; a spectator
  // bench and wall cue rack line the west perimeter wall (x = -10.8 to -11.2);
  // and a suspended brass billiards pendant hangs above. Sightlines from all
  // 48 auditorium seats remain 100% unobstructed.
  box(-8.6, .178, -4.5, 3.4, .025, 4.8, '#1e2430');
  box(-8.6, .196, -2.1, 3.4, .02, .045, colors.brass);
  box(-8.6, .196, -6.9, 3.4, .02, .045, colors.brass);
  box(-6.9, .196, -4.5, .045, .02, 4.8, colors.brass);
  box(-10.3, .196, -4.5, .045, .02, 4.8, colors.brass);

  // Spectator bench against west wall
  box(-10.8, .35, -4.5, .4, .45, 2.2, '#3a271d');
  box(-10.8, .58, -4.5, .38, .12, 2.1, '#283a3c');
  block(-10.8, -4.5, .4, 2.2);

  // Wall-mounted cue rack
  box(-11.2, 1.8, -4.5, .1, 1.4, .8, '#3a271d');
  box(-11.15, 2.45, -4.5, .08, .06, .85, colors.brass);
  box(-11.15, 1.15, -4.5, .08, .06, .85, colors.brass);

  // Overhead brass billiards pendant lamp
  box(-8.6, 2.6, -4.5, .55, .18, 1.4, colors.brass);
  box(-8.6, 3.3, -4.5, .04, 1.2, .04, colors.dark);
  const poolLampGlow = glow(-8.6, 2.48, -4.5, .45, .04, 1.2, '#ffdd88', 1.2);
  animated.push((time, done) => {
    poolLampGlow.material.emissiveIntensity = done ? 1.5 + Math.sin(time * 2.2) * .15 : 1.2;
  });

  // --- Air Hockey Table Bay (Phase 4, Task 6.2) ---
  // Located in the rear east promenade at x = 5.8, z = 7.0.
  // Framed with dark navy runner carpet and brass borders, clear of
  // Row 3 seats (z = 4.7), ticket pedestal, and waste bin.
  box(5.8, .178, 7.0, 3.2, .025, 2.4, '#1e2430');
  box(5.8, .196, 5.8, 3.2, .02, .045, colors.brass);
  box(5.8, .196, 8.2, 3.2, .02, .045, colors.brass);
  box(4.2, .196, 7.0, .045, .02, 2.4, colors.brass);
  box(7.4, .196, 7.0, .045, .02, 2.4, colors.brass);
  block(5.8, 7.0, 2.2, 1.2);

  // --- Foosball Table Bay (Phase 4, Task 6.4) ---
  // Located in the rear west promenade at x = -5.8, z = 7.0.
  // Symmetrical counterpart to the air hockey bay; framed with dark emerald
  // runner carpet and brass borders, clear of Row 3 seats (z = 4.7).
  box(-5.8, .178, 7.0, 3.2, .025, 2.4, '#1c2826');
  box(-5.8, .196, 5.8, 3.2, .02, .045, colors.brass);
  box(-5.8, .196, 8.2, 3.2, .02, .045, colors.brass);
  box(-7.4, .196, 7.0, .045, .02, 2.4, colors.brass);
  box(-4.2, .196, 7.0, .045, .02, 2.4, colors.brass);
  block(-5.8, 7.0, 2.0, 1.2);

  // --- Lobby darts oche (Task 9.6) at [8.4, 3.6], west of Summit Run (x≈10.42)
  // and east of Row 2/3 seats (x=8.15). Low runner only — no extra collision.
  box(8.55, .178, 3.6, 1.1, .02, 1.6, '#2a1c18');
  box(8.55, .196, 2.85, 1.1, .02, .035, colors.brass);
  box(8.55, .196, 4.35, 1.1, .02, .035, colors.brass);

  // --- Lobby piano rug (Task 9.7) at [-2.2, 5.8], behind Row 3, clear of cinema.
  box(-2.2, .178, 5.8, 1.7, .02, 0.9, '#2c2018');
  box(-2.2, .196, 5.4, 1.7, .02, .03, colors.brass);
  box(-2.2, .196, 6.2, 1.7, .02, .03, colors.brass);

  // --- Photo booth pad (Task 9.8) at [2.4, 8.2], south of the projector (z=9.35).
  box(2.4, .178, 8.15, 1.6, .02, 1.1, '#3a1c22');
  box(2.4, .196, 7.65, 1.6, .02, .03, colors.brass);

  // --- Air: soft god-rays from the stage haze plus the candle pulse ------
  const shaftMat = new THREE.MeshBasicMaterial({
    map: M?.__shaft ?? null, color: '#ffe0b0', transparent: true, opacity: M ? .42 : 0,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide,
  });
  const rays = [
    [-4.2, 5.4, -7.0, 4.4, 12.0, .5, -.3],
    [.6, 5.6, -6.6, 5.5, 13.0, .38, -.24],
    [5.4, 5.2, -7.1, 3.8, 11.0, .64, -.32],
    [3.4, 6.0, -4.6, 4.4, 14.0, .46, -.42],
    [-2.6, 5.8, -3.6, 4.0, 13.0, .3, -.38],
  ];
  for (const [x, y, z, w, h, ry, rz] of rays) {
    const ray = raw(new THREE.PlaneGeometry(w, h), shaftMat, x, y, z, 0, ry, rz);
    ray.castShadow = false;
    ray.renderOrder = 2;
  }
  animated.push((time) => {
    haloMat.opacity = M ? .3 + Math.sin(time * 1.6) * .05 : 0;
    bulbMat.emissiveIntensity = 2.4 + Math.sin(time * 2.2) * .22;
    coveMat.emissiveIntensity = .8 + Math.sin(time * 1.1) * .12;
    shaftMat.opacity = M ? .38 + Math.sin(time * 0.9) * .06 : 0;
  });

  // Suspended dust: a small additive point cloud that catches the beams.
  const moteCount = 280;
  const motePositions = new Float32Array(moteCount * 3);
  const moteSeeds = new Float32Array(moteCount * 2);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = (random() - .5) * 19;
    motePositions[i * 3 + 1] = .4 + random() * 7.6;
    motePositions[i * 3 + 2] = -7 + random() * 14;
    moteSeeds[i * 2] = random() * Math.PI * 2;
    moteSeeds[i * 2 + 1] = random() * 8;
  }
  const moteGeometry = new THREE.BufferGeometry();
  const moteAttr = new THREE.BufferAttribute(motePositions, 3);
  moteGeometry.setAttribute('position', moteAttr);
  const moteMaterial = new THREE.PointsMaterial({
    map: M?.__glowSprite ?? null, color: '#ffe2b4', size: .11, transparent: true,
    opacity: M ? .6 : 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
  });
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  motes.frustumCulled = false;
  group.add(motes);
  animated.push((time) => {
    const arr = moteAttr.array;
    for (let i = 0; i < moteCount; i++) {
      const drift = time * .1 + moteSeeds[i * 2 + 1];
      arr[i * 3 + 1] = .4 + ((drift % 8));
      arr[i * 3] += Math.sin(time * .25 + moteSeeds[i * 2]) * .0016;
    }
    moteAttr.needsUpdate = true;
  });

  for (const [geo, materials] of parts) for (const [mat, instances] of materials) {
    const mesh = new THREE.InstancedMesh(geo, mat, instances.length);
    instances.forEach((p, i) => { mesh.setMatrixAt(i, p.matrix); mesh.setColorAt(i, p.color); });
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }

  // The screen itself as an interactable (controls live in theaterScreen.js).
  items.push({ type: 'theater_screen', x: 0, z: -5.9, title: 'Screen controls', sub: 'Press E to run the picture' });
}
