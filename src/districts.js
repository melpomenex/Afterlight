import { buildRainCourtScenery } from './world/rainCourtWorld.js';
import { buildDesertCampScenery } from './world/desertCampWorld.js';
import { buildRooftopScenery } from './world/rooftopWorld.js';
import * as THREE from 'three';
import { buildTheaterScenery } from './world/theaterWorld.js';
import { registerPlaceBuilder } from './places/registry.js';
import { buildPlaceWorld } from './places/worldFactory.js';
import { PLACE_DEFINITIONS as districts } from '../shared/placeDefinitions.js';

// Plain place metadata lives in the pure shared manifest (single editable
// source for tests, projection and browser); this module keeps the renderer
// side: the per-district builders, exploration-save normalization and the
// compatible buildDistrict entry, which delegates construction to the place
// world factory.
export { districts };

export function readExploration(value) {
  return {
    current: districts.some(d => d.id === value?.current) ? value.current : 'court',
    visited: [...new Set(['court', ...(Array.isArray(value?.visited) ? value.visited.filter(id => districts.some(d => d.id === id)) : [])])],
    completed: [...new Set(Array.isArray(value?.completed) ? value.completed.filter(id => districts.slice(1).some(d => d.id === id)) : [])],
  };
}

// Scenery builders for individual districts
function buildCanalScenery(ctx) {
  const { group, block, box, glow, material, colors, random, animated, geometry } = ctx;
  box(0, .17, 0, 5.8, .08, 21, '#143c46');
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 20.8), new THREE.MeshStandardMaterial({ color: '#367c88', transparent: true, opacity: .8, roughness: .13, metalness: .65 }));
  water.rotation.x = -Math.PI / 2; water.position.y = .23; group.add(water);
  for (const z of [-6.15, 6.65]) block(0, z, 5.5, z < 0 ? 8.5 : 7.5);
  box(0, .21, 0, 7, .2, 3.8, '#8b8d77');
  for (let x = -3.5; x < 4; x += .6) {
    box(x, .34, 0, .54, .09, 3.7, '#6d807d');
    for (const z of [-1.85, 1.85]) box(x, .85, z, .08, 1.1, .08, colors.brass);
  }
  for (const z of [-1.85, 1.85]) box(0, 1.4, z, 7.5, .09, .09, colors.brass);
  for (let z = -9; z < 10; z += .65) for (const x of [-3.1, 3.1]) box(x, .45, z, .35, .55, .6, '#a6a28b');
  for (const x of [-8, 8]) {
    box(x, 1.2, -8, 3, 2.4, 2.2, colors.dark); block(x, -8, 3, 2.2);
    for (let i = 0; i < 6; i++) box(x, .5 + i * .28, -6.86, 2.5, .08, .1, colors.brass);
    box(x, 3, -8, .5, 2, .5, colors.brass);
  }
  block(3.8, 2.0, 1.2, 3.2);
  for (let z = -9; z < 10; z += 1.5) {
    const ripple = glow((random() - .5) * 4, .245, z, 1 + random(), .015, .045, '#72b7bd', .35);
    animated.push(time => { ripple.position.x = Math.sin(time * .45 + z) * 1.2; });
  }
  const wheel = new THREE.Group(); wheel.position.set(7, 1.6, -5);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.55, .07, 6, 24), material('#c0995d')); wheel.add(rim);
  for (let i = 0; i < 6; i++) { const spoke = new THREE.Mesh(geometry, material('#c0995d')); spoke.scale.set(.95, .055, .07); spoke.rotation.z = i * Math.PI / 3; wheel.add(spoke); }
  group.add(wheel); animated.push((time, done) => { wheel.rotation.z = done ? time * .4 : 0; });
}

function buildGardenScenery(ctx) {
  const { group, block, box, glow, random, animated } = ctx;
  const glassMaterial = new THREE.MeshStandardMaterial({ color: '#b7d9b3', transparent: true, opacity: .13, metalness: .1, roughness: .3, depthWrite: false, side: THREE.DoubleSide });
  for (const x of [-1, 7]) for (let z = -9; z <= -2; z += 1.4) box(x, 2.1, z, .1, 4.2, .1, '#789184');
  for (let z = -9; z <= -2; z += 1.4) {
    const beam = box(1, 4.8, z, 4.5, .12, .12, '#96a58b'); beam.rotation.z = .35;
    const other = box(5, 4.8, z, 4.5, .12, .12, '#96a58b'); other.rotation.z = -.35;
  }
  for (const x of [1, 5]) { const glass = box(x, 4.8, -5.5, 4.25, .03, 7.4); glass.material = glassMaterial; glass.rotation.z = x === 1 ? .35 : -.35; }
  for (const [x, z, w, d] of [[-6, -5, 3, 5], [3, 3.5, 5, 2], [8, 6, 2, 4]]) {
    box(x, .35, z, w, .6, d, '#9b9270'); box(x, .68, z, w - .2, .1, d - .2, '#414b32'); block(x, z, w, d);
    for (let i = 0; i < 50; i++) {
      const px = x + (random() - .5) * (w - .4), pz = z + (random() - .5) * (d - .4), height = .4 + random() * .7;
      box(px, .7 + height / 2, pz, .045, height, .045, '#627347');
      const leaf = box(px, .8 + height, pz, .3, .12, .45, ['#779455', '#94a86a', '#536f42'][i % 3]); leaf.rotation.z = random();
      if (i % 8 === 0) box(px, 1 + height, pz, .16, .14, .16, '#d2b28a');
    }
  }
  for (const x of [-9, 9]) {
    box(x, 1.1, -7, .35, 2.2, .35, '#6b5942'); block(x, -7, 1.5, 1.5);
    for (let i = 0; i < 25; i++) box(x + (random() - .5) * 2.5, 2 + random() * 1.7, -7 + (random() - .5) * 2, .7, .5, .7, ['#667c49', '#819258', '#4e6b47'][i % 3]);
  }
  box(4, .75, -5, 2, 1.4, 1.2, '#a09776'); block(4, -5, 2, 1.2);
  for (let i = 0; i < 6; i++) {
    const seedling = glow(3.3 + i * .28, 1.55, -5, .1, .18, .2, '#b7ce86', .5);
    animated.push((time, done) => {
      seedling.material.emissiveIntensity = done ? 1.8 + Math.sin(time + i) * .25 : .3;
      seedling.scale.y = done ? .35 : .18;
    });
  }
}

function buildStationScenery(ctx) {
  const { group, block, box, glow, material, colors, animated } = ctx;
  for (const z of [-5, -7]) box(0, .25, z, 23, .12, .12, '#9aa5a2');
  for (let x = -11; x < 12; x += .8) box(x, .17, -6, .24, .16, 3.5, '#67584a');
  box(1, 1.65, -6, 8, 2.7, 2.6, '#485e62'); block(1, -6, 8, 2.6);
  box(1, 3.15, -6, 8.4, .3, 2.8, '#9b9c87'); box(1, .75, -4.66, 8, .27, .08, colors.brass);
  for (let x = -2; x < 5; x += 1.25) {
    glow(x, 2.15, -4.66, .85, .95, .04, '#f3ce89', .5);
    box(x, 2.15, -4.61, .045, .95, .05, colors.dark);
  }
  for (const x of [-2, 4]) for (const z of [-7.1, -4.9]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .2, 12), material('#23363c')); wheel.rotation.x = Math.PI / 2; wheel.position.set(x, .55, z); group.add(wheel);
  }
  for (const x of [-8, 8]) { box(x, 1.85, -2, .18, 3.7, .18, colors.brass); block(x, -2, .2, .2); }
  box(0, 3.8, -2, 18, .22, 2.4, '#35494f');
  for (const x of [-5, 1]) {
    box(x, .65, 3, 2.8, .16, .7, '#9b8966'); box(x, 1.15, 3.35, 2.8, .75, .12, '#9b8966');
    for (const dx of [-1, 1]) box(x + dx, .3, 3, .12, .6, .6, colors.dark); block(x, 3, 2.8, .9);
  }
  box(7, 2.3, 5, .18, 4.6, .18, colors.dark); block(7, 5, .3, .3);
  const beacon = glow(7, 4.7, 5, .7, .65, .7, '#e2b67b', .2);
  animated.push((time, done) => { beacon.material.emissiveIntensity = done ? 2 + Math.sin(time * 2) : .2; });
}

function buildAqueductScenery(ctx) {
  const { group, block, box, glow, colors, animated } = ctx;
  // Subterranean arched aqueduct conduits along north side
  for (const x of [-7, -2, 3, 8]) {
    box(x, 2.5, -6.5, 1.2, 5, 1.2, '#3b4b4e'); block(x, -6.5, 1.2, 1.2);
    box(x, 5.2, -6.5, 3.6, .6, 1.4, '#495f63');
  }
  box(0, .18, -6.5, 22, .12, 2, '#182b2e');
  const water = new THREE.Mesh(new THREE.PlaneGeometry(21.8, 1.8), new THREE.MeshStandardMaterial({ color: '#2a555e', transparent: true, opacity: .82, roughness: .15, metalness: .6 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, .24, -6.5); group.add(water);
  // Sluice gate housing at landmark [6, -4]
  box(6, 1.4, -4, 2, 2.8, 1.4, colors.dark); block(6, -4, 2, 1.4);
  const gateMesh = box(6, .8, -3.2, 1.2, 1.4, .2, colors.brass);
  animated.push((time, done) => { gateMesh.position.y = done ? 1.5 + Math.sin(time * .5) * .05 : .8; });
  // Sluice cistern channels and copper pipes
  for (const x of [-6, 0]) {
    box(x, .6, 6, 2.5, 1.2, 1.8, '#34474a'); block(x, 6, 2.5, 1.8);
    box(x, 1.3, 6, 2.2, .2, .2, colors.brass);
  }
}

function buildCalderaWorld(ctx) {
  const { block, box, glow, colors, animated } = ctx;
  // Dark basalt rock outcroppings and steam flues
  for (const [x, z, w, d] of [[-7, -6, 3.2, 2.6], [-1, -7, 2.8, 2.2], [8, -7, 3, 2.4], [-8, 6.5, 3, 2.5], [2, 6.5, 3.5, 2.2]]) {
    box(x, 1.1, z, w, 2.2, d, '#252528'); block(x, z, w, d);
    box(x, 2.3, z, w * .7, .6, d * .7, '#383230');
    // Glowing sulfur vein on rock top
    glow(x, 2.65, z, w * .35, .1, d * .35, '#f5a438', 1.2);
  }
  // Thermal manifold landmark at [5, -4]
  box(5, 1.2, -4, 2.2, 2.4, 1.6, colors.dark); block(5, -4, 2.2, 1.6);
  const valve = glow(5, 2.5, -4, .7, .7, .7, '#f7aa74', .8);
  // Steam vent pulsing animation
  animated.push((time, done) => {
    valve.material.emissiveIntensity = done ? 2.5 + Math.sin(time * 3) * .5 : .6;
    valve.rotation.y = done ? time * 1.5 : 0;
  });
}

function buildUnderstoryWorld(ctx) {
  const { block, box, glow, random, animated } = ctx;
  // Giant shelf fungi outcroppings on perimeter
  for (const [x, z, w, d] of [[-7, -6, 2.8, 2.5], [1, -6.5, 3.5, 2.2], [-7, 6, 2.5, 2.5], [3, 6, 3, 2]]) {
    box(x, .9, z, w, 1.8, d, '#2d271e'); block(x, z, w, d);
    // Shelf fungus caps
    for (let i = 0; i < 3; i++) {
      const cy = 1.2 + i * .6;
      box(x + (i % 2 === 0 ? .6 : -.6), cy, z, 1.8, .15, 1.4, '#5e4334');
      const capGlow = glow(x + (i % 2 === 0 ? .6 : -.6), cy + .1, z, 1.2, .08, .9, '#7ee8b0', .4);
      animated.push((time, done) => {
        capGlow.material.emissiveIntensity = done ? 1.8 + Math.sin(time * 2 + i) * .4 : .4;
      });
    }
  }
  // Mycelial heart node landmark at [6, -5]
  box(6, .8, -5, 2, 1.6, 1.8, '#322d25'); block(6, -5, 2, 1.8);
  const core = glow(6, 1.8, -5, .8, .8, .8, '#85f5bc', .5);
  animated.push((time, done) => {
    core.material.emissiveIntensity = done ? 2.8 + Math.sin(time * 2.5) * .6 : .5;
    core.scale.setScalar(done ? 1 + Math.sin(time * 3) * .08 : 1);
  });
}

function buildSaltworksWorld(ctx) {
  const { group, block, box, glow, colors, animated } = ctx;
  // Shallow brine evaporation pans stepped on north edge
  for (let x = -8; x <= 4; x += 3.5) {
    box(x, .28, -6.5, 3.2, .3, 2.5, '#9ea8ab'); block(x, -6.5, 3.2, 2.5);
    const brine = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.1), new THREE.MeshStandardMaterial({ color: '#7cd4e2', transparent: true, opacity: .75, roughness: .1 }));
    brine.rotation.x = -Math.PI / 2; brine.position.set(x, .45, -6.5); group.add(brine);
    box(x, .48, -6.5, 1.2, .08, 1, '#f0f6f7');
  }
  // Drying trellises on south side
  for (const x of [-6, 0]) {
    box(x, 1.2, 6, 3, 2.4, 1.4, '#7a6a57'); block(x, 6, 3, 1.4);
    for (let h = .5; h < 2.2; h += .5) box(x, h, 6, 2.8, .08, 1.2, '#ded7cb');
  }
  // Brine pump landmark at [7, -4]
  box(7, 1.2, -4, 1.8, 2.4, 1.8, colors.dark); block(7, -4, 1.8, 1.8);
  const pumpBeam = box(7, 2.7, -4, .3, .25, 2.2, colors.brass);
  animated.push((time, done) => {
    pumpBeam.rotation.x = done ? Math.sin(time * 3) * .2 : 0;
  });
}

function buildRooftopsWorld(ctx) {
  const { block, box, glow, colors, animated } = ctx;
  // Sloped zinc roof gables along north perimeter
  for (const x of [-8, -2, 4]) {
    box(x, 1.8, -6.5, 4.5, 3.2, 2.6, '#48555e'); block(x, -6.5, 4.5, 2.6);
    box(x, 3.5, -6.5, 4.8, .2, 2.8, '#70828c');
    box(x, 4.2, -6.5, .15, 1.2, .15, colors.brass);
  }
  // Catwalk timber staging along south side
  for (const x of [-6, 1]) {
    box(x, .9, 6, 3.8, 1.8, 1.6, '#6b5845'); block(x, 6, 3.8, 1.6);
    box(x, 1.9, 5.3, 3.8, .8, .08, colors.brass);
  }
  // Anemometer landmark at [6, -5]
  box(6, 1.8, -5, .3, 3.6, .3, colors.dark); block(6, -5, .8, .8);
  const rotor = glow(6, 3.7, -5, 1.4, .12, .12, '#e6c883', 1.2);
  animated.push((time, done) => {
    rotor.rotation.y = done ? time * 4.5 : time * .4;
  });
}

function buildMangroveWorld(ctx) {
  const { group, block, box, colors, animated } = ctx;
  // Submerged swamp water plane
  const water = new THREE.Mesh(new THREE.PlaneGeometry(23, 8), new THREE.MeshStandardMaterial({ color: '#254238', transparent: true, opacity: .8, roughness: .2 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, .22, -6); group.add(water);
  // Stilt root outcroppings in water
  for (const [x, z] of [[-8, -6], [-2, -6.5], [3, -6.5]]) {
    box(x, 1.2, z, 2.4, 2.4, 2.2, '#3d3226'); block(x, z, 2.4, 2.2);
    for (let r = 0; r < 4; r++) {
      const root = box(x + (r - 1.5) * .5, .8, z, .18, 1.6, .18, '#4f4030');
      root.rotation.z = (r - 1.5) * .3;
    }
  }
  // Southern raised brick footings
  for (const x of [-5, 2]) {
    box(x, .8, 6, 3.2, 1.6, 2, '#485244'); block(x, 6, 3.2, 2);
  }
  // Tidal weir landmark at [6, -4]
  box(6, 1.4, -4, 2, 2.8, 1.4, colors.dark); block(6, -4, 2, 1.4);
  const weirGate = box(6, 1.8, -3.2, 1.4, 1.6, .2, '#7a5a3a');
  animated.push((time, done) => {
    weirGate.position.y = done ? .8 : 1.8 + Math.sin(time) * .05;
  });
}

function buildTrestleWorld(ctx) {
  const { block, box, glow, colors, animated } = ctx;
  // Heavy iron railway viaduct truss overhead along north side
  for (const x of [-8, -2, 4]) {
    box(x, 2.2, -6.5, 1.2, 4.4, 1.2, '#5e3428'); block(x, -6.5, 1.2, 1.2);
  }
  box(0, 4.5, -6.5, 22, .5, 1.6, '#3a2018');
  for (let x = -10; x <= 10; x += 1.2) box(x, 4.8, -6.5, .3, .2, 2.2, '#483c34');
  // Rail maintenance depot on south side
  for (const x of [-6, 0]) {
    box(x, .9, 6, 3.4, 1.8, 1.8, '#443b35'); block(x, 6, 3.4, 1.8);
  }
  // Suspended canopy crane landmark at [7, -4]
  box(7, 2, -4, .4, 4, .4, colors.dark); block(7, -4, 1, 1);
  box(7, 4.1, -4, 1.8, .3, .3, colors.brass);
  const cable = glow(7.6, 3.2, -4, .08, 1.6, .08, '#d9bf82', .6);
  animated.push((time, done) => {
    cable.rotation.z = done ? 0 : Math.sin(time * 1.5) * .06;
  });
}

function buildFoundryWorld(ctx) {
  const { block, box, glow, colors, animated } = ctx;
  // Towering blast furnaces on north side
  for (const x of [-7, -1]) {
    box(x, 2.4, -6.5, 3.5, 4.8, 2.8, '#2d2d33'); block(x, -6.5, 3.5, 2.8);
    box(x, 4.9, -6.5, 2, 1.2, 2, '#45454d');
    glow(x, 1.1, -5, 1.4, .8, .2, '#ff6622', 1.8);
  }
  // Cooled slag troughs on south edge
  for (const x of [-6, 1]) {
    box(x, .7, 6, 3.6, 1.4, 1.8, '#3c2b28'); block(x, 6, 3.6, 1.8);
    glow(x, .8, 6, 2.8, .1, .8, '#8c3d23', .4);
  }
  // Pilot hearth crucible landmark at [6, -4]
  box(6, 1.1, -4, 2.2, 2.2, 2.2, colors.dark); block(6, -4, 2.2, 2.2);
  const hearth = glow(6, 1.8, -4, 1.2, .8, 1.2, '#ff8033', .5);
  animated.push((time, done) => {
    hearth.material.emissiveIntensity = done ? 2.8 + Math.sin(time * 5) * .4 : .5;
  });
}

function buildFrostSpireWorld(ctx) {
  const { block, box, glow, colors, animated } = ctx;
  // Shattered alpine conservatory arches along north side
  for (const x of [-8, -2, 4]) {
    box(x, 2.6, -6.5, .35, 5.2, .35, '#627585'); block(x, -6.5, 1, 1);
    box(x, 5.1, -6.5, 3.8, .2, .2, '#8ea3b5');
  }
  // Frost-covered boulders on south side
  for (const x of [-6, 0]) {
    box(x, 1, 6, 3.2, 2, 2, '#667480'); block(x, 6, 3.2, 2);
    box(x, 2.05, 6, 2.8, .12, 1.6, '#d8e5ed');
  }
  // Parabolic solar collector landmark at [5, -5]
  box(5, 1.4, -5, 1.6, 2.8, 1.6, colors.dark); block(5, -5, 1.6, 1.6);
  const mirror = glow(5, 3, -5, 1.4, 1.4, .2, '#cce6f5', 1.2);
  animated.push((time, done) => {
    mirror.material.emissiveIntensity = done ? 2.6 + Math.sin(time * 2) * .4 : .6;
    mirror.rotation.y = done ? time * .5 : 0;
  });
}

function buildDeltaWorld(ctx) {
  const { group, block, box, glow, colors, animated } = ctx;
  // Marsh delta water shallows along north side
  const marsh = new THREE.Mesh(new THREE.PlaneGeometry(22, 5.5), new THREE.MeshStandardMaterial({ color: '#2d4345', transparent: true, opacity: .8, roughness: .2 }));
  marsh.rotation.x = -Math.PI / 2; marsh.position.set(0, .22, -6.5); group.add(marsh);
  // Stranded flatboat barge hull at [-4, -6.5]
  box(-4, .8, -6.5, 5.5, 1.4, 2.2, '#483e32'); block(-4, -6.5, 5.5, 2.2);
  // Reclaimed timber embankments on south side
  for (const x of [-6, 0]) {
    box(x, .7, 6, 3.4, 1.4, 1.8, '#594d3f'); block(x, 6, 3.4, 1.8);
  }
  // Channel beacon tower landmark at [7, -4]
  box(7, 2, -4, .4, 4, .4, colors.dark); block(7, -4, 1, 1);
  box(7, 4.1, -4, 1.2, .2, 1.2, colors.brass);
  const beaconLantern = glow(7, 4.5, -4, .7, .7, .7, '#e8ca76', .4);
  animated.push((time, done) => {
    beaconLantern.material.emissiveIntensity = done ? 2.8 + Math.sin(time * 2) * .5 : .4;
  });
}

function buildArchivesWorld(ctx) {
  const { block, box, glow, colors, animated } = ctx;
  // Towering stone bookcases on north perimeter
  for (const x of [-8, -2, 4]) {
    box(x, 2.5, -6.5, 3.6, 5, 1.6, '#35363b'); block(x, -6.5, 3.6, 1.6);
    // Shelf row dividers with paper ledger spines
    for (let y = 1; y < 4.8; y += .9) {
      box(x, y, -5.6, 3.2, .06, .2, colors.brass);
      for (let s = -1.3; s < 1.4; s += .45) {
        box(x + s, y + .35, -5.6, .35, .65, .15, ['#574636', '#6e5643', '#434739'][(s * 10) % 3 >>> 0]);
      }
    }
  }
  // Study desks and catalog card chests on south side
  for (const x of [-6, 1]) {
    box(x, .8, 6, 3.2, 1.6, 1.8, '#524335'); block(x, 6, 3.2, 1.8);
    box(x, 1.65, 6, 2.8, .1, 1.4, '#7a6652');
  }
  // Brass study rotunda lamp landmark at [5, -4]
  box(5, 1.1, -4, 1.6, 2.2, 1.6, '#42372c'); block(5, -4, 1.6, 1.6);
  box(5, 2.3, -4, .1, .6, .1, colors.brass);
  const globe = glow(5, 2.8, -4, .6, .6, .6, '#ffd580', .3);
  animated.push((time, done) => {
    globe.material.emissiveIntensity = done ? 2.5 + Math.sin(time * 1.5) * .2 : .3;
  });
}

function buildKilnTerraceWorld(ctx) {
  const { block, box, glow, colors, animated } = ctx;
  // Adobe domed firing kilns on north perimeter
  for (const x of [-7, -1]) {
    box(x, 1.8, -6.5, 3.4, 3.6, 2.8, '#8c4832'); block(x, -6.5, 3.4, 2.8);
    box(x, 3.8, -6.5, 2, .8, 1.8, '#aa583e');
    glow(x, 1.2, -5, .8, .8, .2, '#ffaa44', .6);
  }
  // Terracotta drying racks on south side
  for (const x of [-6, 1]) {
    box(x, .8, 6, 3.2, 1.6, 1.8, '#9c5a43'); block(x, 6, 3.2, 1.8);
    for (let u = -1; u <= 1; u += .8) box(x + u, 1.8, 6, .45, .6, .45, '#bd6b51');
  }
  // Parabolic solar concentrator landmark at [6, -4]
  box(6, 1.2, -4, 1.8, 2.4, 1.8, colors.dark); block(6, -4, 1.8, 1.8);
  const reflector = glow(6, 2.7, -4, 1.4, 1.4, .18, '#ffe0a0', .6);
  animated.push((time, done) => {
    reflector.rotation.x = done ? Math.sin(time * .4) * .2 : 0;
    reflector.material.emissiveIntensity = done ? 2.8 + Math.sin(time * 2) * .4 : .6;
  });
}

// The Rain Court is the quiet starting district: wet stone, benches, and warm
// windows. It defines no landmark or field note.
function buildCourtScenery(ctx) {
  const { group, block, box, glow, lamp, random } = ctx;
  for (const [x, z] of [[-4, -4], [4, 3]]) {
    box(x, .45, z, 2.6, .12, .8, '#5d6658'); block(x, z, 2.6, .8);
    box(x, .85, z + .42, 2.6, .55, .1, '#5d6658');
    for (const dx of [-1.05, 1.05]) box(x + dx, .2, z, .12, .45, .7, '#3d463f');
  }
  lamp(-7, 6);
  for (const [x, z, w, d] of [[-2, 2, 2.2, 1.4], [5, -2, 1.6, 2.4], [-6, -1, 1.3, 1.1]]) {
    const puddle = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: '#367c88', transparent: true, opacity: .5, roughness: .12, metalness: .6 }));
    puddle.rotation.x = -Math.PI / 2; puddle.position.set(x, .17, z); group.add(puddle);
  }
  const ivy = ['#58734c', '#47603f', '#6b8156'];
  for (const x of [-8.5, 8]) for (let i = 0; i < 5; i++) box(x + (random() - .5) * 1.2, 1 + i * .5, -10.1, 1.5, .42, .45, ivy[i % 3]);
  for (const [x, y] of [[-9, 3.6], [3, 4.5], [7.5, 3.2]]) glow(x, y, -10.96, .5, .8, .05, '#e8b06a', .6);
}

const DISTRICT_BUILDERS = {
  court: buildRainCourtScenery,
  canal: buildCanalScenery,
  garden: buildGardenScenery,
  station: buildStationScenery,
  aqueduct: buildAqueductScenery,
  caldera: buildCalderaWorld,
  understory: buildUnderstoryWorld,
  saltworks: buildSaltworksWorld,
  rooftops: buildRooftopScenery,
  'desert-camp': buildDesertCampScenery,
  mangrove: buildMangroveWorld,
  trestle: buildTrestleWorld,
  foundry: buildFoundryWorld,
  'frost-spire': buildFrostSpireWorld,
  delta: buildDeltaWorld,
  archives: buildArchivesWorld,
  'kiln-terrace': buildKilnTerraceWorld,
  theater: buildTheaterScenery,
};

// Builder references resolve through the places registry; the manifest stays
// pure data. Registering the legacy table keeps DISTRICT_BUILDERS as the
// single place new biome builders are added to.
for (const [key, build] of Object.entries(DISTRICT_BUILDERS)) registerPlaceBuilder(key, build);

// Each district owns its scenery and collision map. Only the current group is
// rendered. Construction lives in the place world factory: definition
// validation before any geometry, explicit seed, shell selection, static
// batching and the owned-resource set.
export function buildDistrict(def, completed = false) {
  return buildPlaceWorld(def, { completed });
}
