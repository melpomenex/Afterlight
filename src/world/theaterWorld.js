import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The Orpheum auditorium. Large forms first: screen wall, proscenium, seat
// rows, projector booth; small props stay sparse. Everything emissive or
// animated (screen sheen, marquee bulbs, aisle studs, projector beam) is
// built from its own material so the static instanced batch skips it —
// animating batched meshes silently does nothing (AGENTS.md §7).
//
// Seat rows sit at z = 0.3 / 2.5 / 4.7: shifted south of the screen wall so
// the player spawn (-9, 0) and the Kiln companion spawn (-8.2, 1) stay clear
// of the outermost seats while keeping two cross-aisles between the rows.
export function buildTheaterScenery(ctx) {
  const { group, block, box, glow, material, colors, items, animated } = ctx;

  // --- Screen wall (north): stage platform + dark glass screen ---
  box(0, .25, -8.3, 14, .5, 2.4, '#3a3134'); // visual elevation only; actors stay at y=0
  block(0, -8.3, 14, 2.4);
  const screen = glow(0, 3.1, -8.35, 13, 4, .15, '#101418', .12);
  // Brass trim framing all four sides of the screen.
  box(0, 5.25, -8.3, 13.6, .3, .34, colors.brass);
  box(0, .95, -8.3, 13.6, .3, .34, colors.brass);
  for (const x of [-6.65, 6.65]) box(x, 3.1, -8.3, .3, 4.6, .34, colors.brass);
  // Screen quad for the DOM overlay: four corners of the screen surface.
  ctx.screenQuad = [
    new THREE.Vector3(-6.5, 1.1, -8.28),
    new THREE.Vector3(6.5, 1.1, -8.28),
    new THREE.Vector3(6.5, 5.1, -8.28),
    new THREE.Vector3(-6.5, 5.1, -8.28),
  ];
  animated.push((time, done) => {
    screen.material.emissiveIntensity = done ? .45 + Math.sin(time * 2) * .08 : .12;
  });

  // --- Proscenium: side curtains, valance, marquee with bulbs ---
  for (const s of [-1, 1]) {
    const curtain = box(s * 7.3, 2.7, -8.1, 1.1, 5.4, 2.8, '#5a2029');
    curtain.rotation.z = -s * .035;
    block(s * 7.3, -8.1, 1.1, 2.8);
  }
  box(0, 6.2, -8.1, 15.8, .5, 1.2, '#4a1b22');
  box(0, 5.75, -7.7, 13.4, .55, .5, '#2c2226');
  const bulbs = [];
  for (let x = -6; x <= 6; x += .75) bulbs.push(glow(x, 5.75, -7.42, .16, .16, .12, '#ffd9a0', .15));
  animated.push((time, done) => {
    bulbs.forEach((b, i) => { b.material.emissiveIntensity = done ? 1.6 + Math.sin(time * 3 + i) * .5 : .15; });
  });

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

  // --- Aisle lamps: emissive floor studs along both aisles ---
  const studs = [];
  for (const x of [-3.5, 3.5]) for (const z of [1.4, 3.6]) studs.push(glow(x, .1, z, .18, .1, .18, '#ffca7a', .15));
  animated.push((time, done) => {
    studs.forEach((s, i) => { s.material.emissiveIntensity = done ? 1.7 + Math.sin(time * 2 + i) * .3 : .15; });
  });

  // Reusable detailed parts: batch by geometry/material, including curved
  // upholstery, so a full house costs a handful of draw calls.
  const parts = new Map();
  const velvet = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .96, metalness: 0 });
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
      const red = i % 3 === 0 ? '#702c3b' : '#602333';
      cushion(x, .48, z - .02, .58, .22, .59, red);
      cushion(x, .89, z + .24, .65, .92, .19, '#29282d', -.10);
      cushion(x, .91, z + .13, .57, .79, .18, red, -.10);
      cushion(x, 1.20, z + .09, .49, .22, .13, '#823748', -.10);
      // Padded vertical channels give the upholstery depth at eye level.
      for (const dx of [-.16, 0, .16]) cushion(x + dx, .86, z + .025, .135, .40, .055, red, -.10);
      box(x, .19, z + .08, .13, .29, .22, '#262b30');
      cushion(x, .17, z + .06, .47, .055, .39, '#303238');
      for (const dx of [-.34, .34]) {
        box(x + dx, .42, z + .06, .06, .49, .30, '#272b30');
        cushion(x + dx, .70, z, .10, .12, .65, '#29272d');
        part(ring, metal, x + dx, .77, z - .20, .055, .055, .055, '#ae8953', Math.PI / 2);
        part(cylinder, metal, x + dx, .743, z - .20, .042, .045, .042, '#151b20');
      }
      // Brass identification plaque on the back, visible from the next row.
      box(x, 1.08, z + .36, .14, .065, .02, colors.brass);
      items.push({ type: 'seat', x, z, title: 'Take a seat', sub: `Row ${n} · Seat ${i + 1} · The Orpheum` });
    }
  }

  // Burgundy fitted carpet and gold borders cover the outdoor paving.
  box(0, .145, 2.7, 18.6, .025, 8.5, '#34212c');
  box(0, .145, 8, 18.6, .025, 2, '#502b35');
  for (const x of [-9.15, 9.15]) box(x, .165, 3.9, .045, .02, 12, colors.brass);
  for (const z of [-1.35, 1.4, 3.6, 5.85]) {
    box(0, .165, z, 18.3, .02, .035, '#98754e');
    for (const x of [-8.95, 8.95]) glow(x, .20, z, .12, .05, .22, '#ffca7a', .65);
  }

  // Low side paneling preserves isometric visibility; acoustic ribs and
  // sconces give the street-level view a recognizable auditorium interior.
  for (const side of [-1, 1]) for (const z of [-4.5, 2.8, 6.4]) {
    box(side * 11.65, 1.65, z, .25, 3.05, 2.3, '#302e38');
    for (let dz = -.9; dz <= .9; dz += .3) box(side * 11.49, 1.6, z + dz, .12, 2.8, .06, '#765447');
    box(side * 11.38, 1.9, z, .18, .65, .4, colors.brass);
    glow(side * 11.25, 1.9, z, .12, .45, .24, '#ffcc89', .8);
    cushion(side * 11.25, 3.0, z, .4, .62, .48, '#20262b');
    for (let y = 2.8; y < 3.25; y += .08) box(side * 11.02, y, z, .025, .025, .36, '#44494b');
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
  // this wall at x = 10.42, fronts facing west, z = -7.95 / -5.9 / -3.85 /
  // -1.8 (north end clears the east gate arch at z -1.2..+1.2). The inset runner carpet, brass borders and emissive floor studs
  // frame that row; positions are clear of all 45 seat sightlines to the
  // movie screen, the east travel gate at (10.7, 0), and leave >= 1.2m
  // accessible routes on the stand side.
  box(9.1, .148, -4.5, 3.8, .025, 7.8, '#1e2430');
  box(7.2, .165, -4.5, .045, .02, 7.8, colors.brass);
  box(11.0, .165, -4.5, .045, .02, 7.8, colors.brass);
  box(9.1, .165, -.6, 3.8, .02, .045, colors.brass);
  box(9.1, .165, -8.4, 3.8, .02, .045, colors.brass);

  const arcadeStuds = [];
  for (const x of [7.6, 9.7]) {
    for (const z of [-7.95, -5.9, -3.85, -1.8]) {
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
  box(9.1, .148, 2.6, 3.8, .025, 3.4, '#1e2430');
  box(9.1, .165, .9, 3.8, .02, .045, colors.brass);
  box(9.1, .165, 4.3, 3.8, .02, .045, colors.brass);
  box(7.2, .165, 2.6, .045, .02, 3.4, colors.brass);
  box(11.0, .165, 2.6, .045, .02, 3.4, colors.brass);
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

  for (const [geo, materials] of parts) for (const [mat, instances] of materials) {
    const mesh = new THREE.InstancedMesh(geo, mat, instances.length);
    instances.forEach((p, i) => { mesh.setMatrixAt(i, p.matrix); mesh.setColorAt(i, p.color); });
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }

  // The screen itself as an interactable (controls live in theaterScreen.js).
  items.push({ type: 'theater_screen', x: 0, z: -5.9, title: 'Screen controls', sub: 'Press E to run the picture' });
}
