import * as THREE from 'three';

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

  // --- Projector booth + physical prop beneath the landmark signal ---
  box(8, 1.5, -6, 1.8, 3, 1.6, colors.dark); block(8, -6, 1.8, 1.6);
  box(8, 3.15, -6.1, .6, .3, .6, '#33393c');
  box(8, 3.55, -6.1, .55, .5, .8, '#22282b');
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .45, 10), material(colors.brass));
  lens.rotation.x = Math.PI / 2; lens.position.set(8, 3.55, -6.65); group.add(lens);
  const beam = glow(4.6, 3.33, -7.58, .1, .1, 6.95, '#ffe9c0', 0);
  beam.rotation.y = Math.atan2(-6.8, -1.35);
  animated.push((time, done) => {
    beam.material.emissiveIntensity = done ? .9 + Math.sin(time * 7) * .15 : 0;
  });

  // --- Aisle lamps: emissive floor studs along both aisles ---
  const studs = [];
  for (const x of [-3.5, 3.5]) for (const z of [1.4, 3.6]) studs.push(glow(x, .1, z, .18, .1, .18, '#ffca7a', .15));
  animated.push((time, done) => {
    studs.forEach((s, i) => { s.material.emissiveIntensity = done ? 1.7 + Math.sin(time * 2 + i) * .3 : .15; });
  });

  // --- Seating: three rows of 16 with aisles at |x| ~ 3.5 plus outer flanks ---
  const center = [-2.75, -1.65, -0.55, 0.55, 1.65, 2.75];
  const sides = [3.9, 5.0, 6.1, 7.2, 8.3];
  const rowXs = [...center, ...sides, ...sides.map(v => -v)];
  for (const [z, n] of [[0.3, 1], [2.5, 2], [4.7, 3]]) {
    for (const x of rowXs) {
      block(x, z, .55, .6);
      box(x, .22, z, .52, .12, .5, '#63212c');
      box(x, .56, z + .26, .52, .62, .1, '#6b2733');
      for (const dx of [-.19, .19]) box(x + dx, .07, z, .07, .14, .07, colors.dark);
      items.push({ type: 'seat', x, z, title: 'Take a seat', sub: `Row ${n} · The Orpheum` });
    }
  }

  // --- Supporting props: poster cases, concession counter, carpet ---
  for (const [z, tint] of [[-5, '#c9a86a'], [5, '#8fa8b0']]) {
    box(11.5, 2.1, z, .16, 2, 1.3, colors.dark);
    glow(11.4, 2.1, z, .05, 1.6, 1.05, tint, .35);
  }
  box(-7.5, .5, 9.2, 3.4, 1, 1.4, '#4a3830'); block(-7.5, 9.2, 3.4, 1.4);
  box(-7.5, 1.05, 9.2, 3.6, .12, 1.6, '#8a7057');
  glow(-7.5, 1.35, 9.2, 1.8, .12, .5, '#ffca7a', .5);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3), new THREE.MeshStandardMaterial({ color: '#6e2430', transparent: true, opacity: .92, roughness: .9 }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, .16, 7.1); group.add(carpet);

  // The screen itself as an interactable (controls live in theaterScreen.js).
  items.push({ type: 'theater_screen', x: 0, z: -5.9, title: 'Screen controls', sub: 'Press E to run the picture' });
}
