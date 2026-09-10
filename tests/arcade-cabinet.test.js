/**
 * Canonical arcade cabinet system tests.
 *
 * Covers the pure and three.js-level contracts of the cabinet system without
 * fetching the GLB: skin normalization, manifest integration, wall-row
 * layout safety, material isolation between cabinets, shared-resource
 * survival across disposal, and the screen aspect-fit math. The GLB parse
 * path itself is exercised in-browser (see docs/arcade.md); here the
 * template is injected as a stand-in hierarchy with the real node/material
 * names.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  normalizeCabinetSkin,
  fitSourceIntoDisplay,
  SCREEN,
  SKIN_CHANNELS,
} from '../src/arcade/skins.js';
import {
  injectArcadeCabinetTemplate,
  createArcadeCabinet,
  CABINET_MARKERS,
} from '../src/arcade/cabinet.js';
import {
  ORPHEUM_ACTIVITIES,
  PONG_ACTIVITY_DEFINITION,
  SIGNAL_LOST_ACTIVITY_DEFINITION,
  validateActivityDefinition,
  getPlaceDefinition,
  LEGACY_URBAN_BOUNDS,
} from '../shared/placeDefinitions.js';

const HEX = /^#[0-9a-fA-F]{6}$/;

// --- skins.js -----------------------------------------------------------------

test('normalizeCabinetSkin fills every default for an empty block', () => {
  const problems = [];
  const skin = normalizeCabinetSkin(undefined, problems);
  assert.deepEqual(problems, []);
  assert.equal(skin.model, 'upright');
  assert.equal(skin.skin.title, 'ARCADE');
  assert.equal(skin.skin.motif, 'afterlight');
  assert.match(skin.led.color, HEX);
  assert.ok(Number.isFinite(skin.led.intensity));
  assert.match(skin.controls.player1, HEX);
  assert.match(skin.controls.player2, HEX);
  assert.equal(skin.screen.type, 'canvas');
});

test('normalizeCabinetSkin reports invalid colors, models, and channels', () => {
  const problems = [];
  normalizeCabinetSkin({
    model: 'dance-machine',
    skin: {
      palette: { base: 'red', notAChannel: '#123456' },
      files: { marquee: 'marquee.webp', roof: 'roof.webp' },
    },
    led: { color: '#ff00', intensity: -2 },
    controls: { player1: 'blue' },
    screen: { type: 'hologram' },
  }, problems);
  assert.ok(problems.some(p => p.includes('cabinet.model')));
  assert.ok(problems.some(p => p.includes('palette.base')));
  assert.ok(problems.some(p => p.includes('palette.notAChannel')));
  assert.ok(problems.some(p => p.includes('files.roof')));
  assert.ok(problems.some(p => p.includes('led.color')));
  assert.ok(problems.some(p => p.includes('led.intensity')));
  assert.ok(problems.some(p => p.includes('controls.player1')));
  assert.ok(problems.some(p => p.includes('screen.type')));
});

test('normalizeCabinetSkin accepts declared artwork files per channel', () => {
  const problems = [];
  const skin = normalizeCabinetSkin({
    skin: { files: { marquee: 'marquee.webp', left: 'left.webp' } },
  }, problems);
  assert.deepEqual(problems, []);
  assert.equal(skin.skin.files.marquee, 'marquee.webp');
  assert.equal(skin.skin.files.left, 'left.webp');
});

test('fitSourceIntoDisplay letterboxes without stretching', () => {
  // 1.6 source on a 13:9 display: width-bound, vertical bars top/bottom.
  assert.deepEqual(fitSourceIntoDisplay(800, 500, 1040, 720), { x: 0, y: 35, w: 1040, h: 650 });
  // 4:3-ish source: height-bound, pillarbox left/right.
  const fit = fitSourceIntoDisplay(512, 384, 1040, 720);
  assert.equal(fit.h, 720);
  assert.ok(Math.abs(fit.x - (1040 - fit.w) / 2) < 1e-9);
  // The display aspect matches the GLB CRT surface.
  assert.ok(Math.abs(SCREEN.aspect - 0.52 / 0.36) < 1e-9);
});

// --- manifest integration -----------------------------------------------------

test('every Orpheum activity declares a valid, visually distinct cabinet skin', () => {
  const seen = new Set();
  for (const def of ORPHEUM_ACTIVITIES) {
    assert.ok(def.cabinet, `${def.id} must declare a cabinet block`);
    assert.equal(def.cabinet.model, 'upright', `${def.id} uses the canonical upright model`);

    const problems = [];
    const skin = normalizeCabinetSkin(def.cabinet, problems);
    assert.deepEqual(problems, []);
    assert.ok(validateActivityDefinition(def, { placeBounds: LEGACY_URBAN_BOUNDS }).length === 0,
      `${def.id} must fully validate`);

    assert.ok(skin.skin.title.length > 0);
    assert.ok(!seen.has(skin.led.color), `${def.id}: LED colors must differ between machines`);
    seen.add(skin.led.color);
  }
});

test('validateActivityDefinition rejects malformed cabinet blocks', () => {
  const base = { ...PONG_ACTIVITY_DEFINITION };
  const bad = { ...base, cabinet: { ...base.cabinet, model: 'hoverboard', led: { color: 'orange' } } };
  const problems = validateActivityDefinition(bad, { placeBounds: LEGACY_URBAN_BOUNDS });
  assert.ok(problems.some(p => p.includes('cabinet.model')));
  assert.ok(problems.some(p => p.includes('cabinet.led.color')));
});

// --- wall-row layout ------------------------------------------------------------
// Mirrors the world-factory collision rule (half-extent + 0.38 clearance) the
// same way tests/districts.test.js does, then proves the east-wall row is
// clear of gates, spawns, seats, and itself.

const CLEARANCE = 0.38;
function obstacleRects() {
  return ORPHEUM_ACTIVITIES.map((act) => {
    const [x, , z] = act.transform.position;
    const w = act.footprint.width / 2 + CLEARANCE;
    const d = act.footprint.depth / 2 + CLEARANCE;
    return { id: act.id, x, z, w, d };
  });
}

function rectsOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) && Math.abs(a.z - b.z) < (a.d + b.d);
}

test('cabinets line the east wall in a spaced row facing the room', () => {
  const zs = [];
  for (const act of ORPHEUM_ACTIVITIES) {
    assert.equal(act.transform.position[0], 10.42, `${act.id} stands on the east wall line`);
    assert.equal(act.transform.rotationY, -Math.PI / 2, `${act.id} faces west into the room`);
    zs.push(act.transform.position[2]);
  }
  zs.sort((a, b) => a - b);
  for (let i = 1; i < zs.length; i++) {
    assert.ok(zs[i] - zs[i - 1] >= 1.6, `cabinet spacing ${zs[i] - zs[i - 1]} leaves a walkable gap`);
  }
});

test('the cabinet row stays clear of gates, spawns, seats, and itself', () => {
  const rects = obstacleRects();
  const theater = getPlaceDefinition('theater');

  for (const gate of theater.exits) {
    const [gx, gz] = gate.position;
    for (const r of rects) {
      assert.ok(!(Math.abs(gx - r.x) < r.w + CLEARANCE && Math.abs(gz - r.z) < r.d + CLEARANCE),
        `${gate.id} gate must remain walkable`);
    }
  }

  for (const [sx, sz] of [theater.spawn, theater.companionSpawn]) {
    for (const r of rects) {
      assert.ok(!(Math.abs(sx - r.x) < r.w + CLEARANCE && Math.abs(sz - r.z) < r.d + CLEARANCE),
        `spawn [${sx}, ${sz}] must not sit inside cabinet collision`);
    }
  }

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      assert.ok(!rectsOverlap(rects[i], rects[j]),
        `${rects[i].id} and ${rects[j].id} collision boxes must not overlap`);
    }
  }

  // Seat rows: nearest seat column is at x = 8.15, rows z = 0.3 / 2.5 / 4.7.
  for (const sz of [0.3, 2.5, 4.7]) {
    for (const r of rects) {
      assert.ok(!(Math.abs(8.15 - r.x) < r.w + CLEARANCE && Math.abs(sz - r.z) < r.d + CLEARANCE),
        `seat column at z=${sz} must stay clear of ${r.id}`);
    }
  }
});

test('participant anchors and dismounts stand clear of every cabinet box', () => {
  const rects = obstacleRects();
  for (const act of ORPHEUM_ACTIVITIES) {
    const [cx, , cz] = act.transform.position;
    for (const anchor of act.participantAnchors) {
      const [ax, , az] = anchor.position;
      const dist = Math.hypot(ax - cx, az - cz);
      assert.ok(dist <= act.interactionRadius, `${act.id} anchor within interaction radius`);
      for (const r of rects) {
        assert.ok(!(Math.abs(ax - r.x) < r.w && Math.abs(az - r.z) < r.d),
          `${act.id} anchor must not be inside any collision box`);
      }
      for (const spot of anchor.dismount) {
        for (const r of rects) {
          assert.ok(!(Math.abs(spot.x - r.x) < r.w && Math.abs(spot.z - r.z) < r.d),
            `${act.id} dismount must land on walkable ground`);
        }
      }
    }
  }
});

// --- material isolation (three.js level, injected template) ---------------------

function makeFakeTemplate() {
  const root = new THREE.Group();
  root.name = 'ARC_Cabinet_ROOT';
  const named = (name) => new THREE.MeshStandardMaterial({ name, color: 0x888888 });
  const add = (name, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), mat);
    mesh.name = name;
    root.add(mesh);
    return mesh;
  };
  add('Cabinet_Body', named('MAT_Cabinet_Black'));   // shared — must never clone
  add('Screen_Display', named('MAT_ScreenContent')); // per-cabinet display
  add('Screen_Glass', named('MAT_Glass'));           // shared — must never clone
  add('Artwork_Marquee', named('MAT_Skin_Marquee')); // per-game artwork
  add('Trim_ControlDeck', named('MAT_LED_Emissive')); // per-game LED trim
  add('P1_Joystick_Ball', named('MAT_Plastic_Blue'));
  add('P2_Joystick_Ball', named('MAT_Plastic_Red'));
  const stand = new THREE.Object3D();
  stand.name = 'INT_PlayerStand';
  stand.position.set(0, 0, 1.05);
  root.add(stand);
  const look = new THREE.Object3D();
  look.name = 'INT_PlayerLookTarget';
  look.position.set(0, 1.28, 0.12);
  root.add(look);
  const p1 = new THREE.Object3D();
  p1.name = 'INT_P1';
  p1.position.set(-0.25, 0, 1.05);
  root.add(p1);
  return root;
}

function materialOf(cabinet, meshName) {
  const mesh = cabinet.group.getObjectByName(meshName);
  assert.ok(mesh, `${meshName} present in instance`);
  return mesh.material;
}

test('two cabinets clone per-instance materials and share immutable ones', () => {
  injectArcadeCabinetTemplate(makeFakeTemplate());

  const world = { group: new THREE.Group() };
  const cabinetA = createArcadeCabinet({ activityDef: ORPHEUM_ACTIVITIES[0], world });
  const cabinetB = createArcadeCabinet({ activityDef: ORPHEUM_ACTIVITIES[2], world });

  assert.equal(cabinetA.usingModel, true, 'injected template builds the GLB path');
  assert.equal(cabinetB.usingModel, true);
  assert.equal(cabinetA.gameId, 'orpheum-pong');
  assert.equal(cabinetB.gameId, 'orpheum-downhill-mayhem');

  // Per-cabinet clones: LED and screen materials are distinct instances...
  const ledA = materialOf(cabinetA, 'Trim_ControlDeck');
  const ledB = materialOf(cabinetB, 'Trim_ControlDeck');
  assert.notEqual(ledA, ledB, 'LED material must be cloned per cabinet');
  assert.notEqual(materialOf(cabinetA, 'Screen_Display'), materialOf(cabinetB, 'Screen_Display'));

  // ...so recoloring one machine never leaks into the other.
  cabinetA.setLed('#ff0000');
  assert.equal(ledA.emissive.getHexString(), 'ff0000');
  assert.notEqual(ledB.emissive.getHexString(), 'ff0000');

  // Skins applied from the definitions.
  assert.equal(ledA.emissiveIntensity, ORPHEUM_ACTIVITIES[0].cabinet.led.intensity);
  assert.equal(ledB.emissiveIntensity, ORPHEUM_ACTIVITIES[2].cabinet.led.intensity);
  assert.equal(ledB.emissive.getHexString(), 'ff7a3c', 'Downhill Mayhem LED comes from its definition');

  // Shared immutable materials stay shared.
  assert.equal(materialOf(cabinetA, 'Screen_Glass'), materialOf(cabinetB, 'Screen_Glass'),
    'glass must not be cloned');
  assert.equal(materialOf(cabinetA, 'Cabinet_Body'), materialOf(cabinetB, 'Cabinet_Body'),
    'body material must not be cloned');

  // Markers resolve by name, and the focused camera derives from them.
  for (const name of ['INT_PlayerStand', 'INT_PlayerLookTarget']) {
    assert.ok(cabinetA.marker(name), `${name} resolvable`);
  }
  assert.equal(cabinetA.marker('INT_NotExported'), null);
  const camA = cabinetA.activityCamera;
  assert.ok(camA instanceof THREE.PerspectiveCamera);
  assert.ok(Math.abs(camA.position.z - (1.05 + 0.45)) < 1e-6, 'camera stands at the INT_PlayerStand line');

  cabinetA.dispose();
  cabinetB.dispose();
  assert.equal(cabinetA.group.parent, null, 'disposed cabinet leaves the world');
});

test('disposing one cabinet leaves the shared template and sibling intact', () => {
  const world = { group: new THREE.Group() };
  const cabinetA = createArcadeCabinet({ activityDef: ORPHEUM_ACTIVITIES[1], world });
  const cabinetB = createArcadeCabinet({ activityDef: ORPHEUM_ACTIVITIES[3], world });
  assert.equal(cabinetA.group.parent, world.group);
  assert.equal(cabinetB.group.parent, world.group);

  const glassBefore = materialOf(cabinetB, 'Screen_Glass');
  cabinetA.dispose();

  assert.equal(cabinetA.group.parent, null);
  assert.equal(cabinetB.group.parent, world.group, 'sibling stays in the world');
  assert.equal(materialOf(cabinetB, 'Screen_Glass'), glassBefore, 'shared material survives');
  cabinetB.setLed('#00ff00');
  assert.equal(materialOf(cabinetB, 'Trim_ControlDeck').emissive.getHexString(), '00ff00');
  cabinetB.dispose();
  assert.equal(world.group.children.length, 0, 'world left clean');
});

test('all exported interaction markers are documented in the factory contract', () => {
  assert.ok(CABINET_MARKERS.includes('INT_PlayerStand'));
  assert.ok(CABINET_MARKERS.includes('INT_ScreenCenter'));
  assert.ok(CABINET_MARKERS.includes('INT_AudioSource'));
  assert.ok(CABINET_MARKERS.includes('INT_P1') && CABINET_MARKERS.includes('INT_P2'),
    'two-player anchor markers stay part of the contract');
});

// --- summit-run (add-multiplayer-snowboard-arcade 2.2) ---------------------------

test('summit-run adds a unique summit skin on the shared upright geometry', () => {
  const summit = ORPHEUM_ACTIVITIES.find(a => a.id === 'summit-run');
  assert.ok(summit, 'summit-run present in the Orpheum row');
  assert.equal(summit.cabinet.model, 'upright', 'summit run reuses the canonical GLB — no new geometry');

  const motifs = ORPHEUM_ACTIVITIES.map(a => a.cabinet.skin.motif);
  assert.equal(new Set(motifs).size, motifs.length, 'every machine keeps a distinct motif');
  assert.equal(summit.cabinet.skin.motif, 'summit');
  assert.equal(summit.cabinet.skin.title, 'SUMMIT RUN');

  const problems = [];
  const skin = normalizeCabinetSkin(summit.cabinet, problems);
  assert.deepEqual(problems, []);
  assert.ok(HEX.test(skin.skin.palette.accent));
  assert.ok(HEX.test(skin.led.color));
  // The five-machine row must keep globally distinct LED colors.
  const leds = ORPHEUM_ACTIVITIES.map(a => normalizeCabinetSkin(a.cabinet, []).led.color);
  assert.equal(new Set(leds).size, leds.length, 'LED colors differ between all five machines');
});

function makeStubCanvasFactory() {
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'createLinearGradient') return () => gradient;
      return () => undefined;
    },
    set() { return true; },
  });
  return {
    createElement() {
      return { width: 0, height: 0, getContext: () => ctx };
    },
  };
}

test('summit motif paints every artwork channel without runtime errors', async () => {
  const { paintSkinChannel } = await import('../src/arcade/artwork.js');
  const summit = ORPHEUM_ACTIVITIES.find(a => a.id === 'summit-run');
  const spec = normalizeCabinetSkin(summit.cabinet, []);

  globalThis.document = makeStubCanvasFactory();
  try {
    for (const channel of Object.keys(SKIN_CHANNELS)) {
      const canvas = paintSkinChannel(channel, spec);
      assert.ok(canvas && canvas.width > 0, `${channel} channel paints a canvas`);
    }
  } finally {
    delete globalThis.document;
  }
});

test('a disposed summit-run cabinet leaves siblings and the shared template intact', () => {
  injectArcadeCabinetTemplate(makeFakeTemplate());
  const world = { group: new THREE.Group() };
  const summit = createArcadeCabinet({ activityDef: ORPHEUM_ACTIVITIES[4], world });
  const pong = createArcadeCabinet({ activityDef: ORPHEUM_ACTIVITIES[0], world });

  assert.equal(summit.gameId, 'summit-run');
  assert.equal(summit.usingModel, true);
  assert.notEqual(materialOf(summit, 'Trim_ControlDeck'), materialOf(pong, 'Trim_ControlDeck'),
    'fifth machine still clones its LED material');
  assert.equal(materialOf(summit, 'Cabinet_Body'), materialOf(pong, 'Cabinet_Body'),
    'fifth machine shares the immutable body material');

  summit.dispose();
  assert.equal(summit.group.parent, null);
  assert.equal(pong.group.parent, world.group, 'sibling survives the summit disposal');
  pong.dispose();
  assert.equal(world.group.children.length, 0, 'world left clean');
});

// --- downhill-mayhem (integrate-multiplayer-downhill-mayhem-arcade 1.1/1.5) -----

test('downhill-mayhem repurposes the Signal Lost slot with a distinct machine', () => {
  const downhill = ORPHEUM_ACTIVITIES.find(a => a.id === 'orpheum-downhill-mayhem');
  assert.ok(downhill, 'downhill-mayhem present in the Orpheum row');
  assert.equal(downhill.type, 'downhill-mayhem');
  assert.equal(downhill.cabinet.model, 'upright', 'reuses the canonical GLB — no new geometry');
  assert.equal(downhill.cabinet.skin.title, 'DOWNHILL MAYHEM');
  assert.equal(downhill.cabinet.skin.tagline, 'RIDE • TRICK • FIGHT');
  assert.equal(downhill.cabinet.skin.motif, 'downhill');

  // Reuses the former Signal Lost transform exactly.
  const signalLost = ORPHEUM_ACTIVITIES.find(a => a.id === 'orpheum-signal-lost');
  assert.equal(signalLost, undefined, 'Signal Lost no longer placed in the active row');
  assert.deepEqual(downhill.transform.position, [10.42, 0, -3.85]);
  assert.equal(downhill.transform.rotationY, -Math.PI / 2);

  // Six-rider field and explicit-readiness race contract.
  assert.equal(downhill.capacities.players, 6);
  assert.equal(downhill.capacities.spectators, 32);
  assert.equal(downhill.capacities.queue, 16);
  assert.equal(downhill.minPlayers, 1);
  assert.equal(downhill.readyPolicy, 'explicit');
  assert.equal(downhill.course.id, 'classic');
  assert.equal(downhill.participantAnchors.length, 6);
  assert.deepEqual(downhill.participantAnchors.map(a => a.slot), [0, 1, 2, 3, 4, 5]);
  for (const anchor of downhill.participantAnchors) {
    assert.ok(anchor.dismount.length >= 1, `slot ${anchor.slot} has a dismount`);
  }

  const motifs = ORPHEUM_ACTIVITIES.map(a => a.cabinet.skin.motif);
  assert.equal(new Set(motifs).size, motifs.length, 'every machine keeps a distinct motif');
  const leds = ORPHEUM_ACTIVITIES.map(a => normalizeCabinetSkin(a.cabinet, []).led.color);
  assert.equal(new Set(leds).size, leds.length, 'LED colors differ between all five machines');

  // The dormant Signal Lost definition and cabinet still exist for re-placement.
  assert.ok(SIGNAL_LOST_ACTIVITY_DEFINITION, 'Signal Lost definition remains exported');
  assert.equal(SIGNAL_LOST_ACTIVITY_DEFINITION.id, 'orpheum-signal-lost');
  assert.ok(SIGNAL_LOST_ACTIVITY_DEFINITION.cabinet, 'Signal Lost cabinet block remains');
});

test('downhill motif paints every artwork channel without runtime errors', async () => {
  const { paintSkinChannel } = await import('../src/arcade/artwork.js');
  const downhill = ORPHEUM_ACTIVITIES.find(a => a.id === 'orpheum-downhill-mayhem');
  const spec = normalizeCabinetSkin(downhill.cabinet, []);

  globalThis.document = makeStubCanvasFactory();
  try {
    for (const channel of Object.keys(SKIN_CHANNELS)) {
      const canvas = paintSkinChannel(channel, spec);
      assert.ok(canvas && canvas.width > 0, `${channel} channel paints a canvas`);
    }
  } finally {
    delete globalThis.document;
  }
});

test('a disposed downhill-mayhem cabinet leaves siblings and the shared template intact', () => {
  injectArcadeCabinetTemplate(makeFakeTemplate());
  const world = { group: new THREE.Group() };
  const downhill = createArcadeCabinet({ activityDef: ORPHEUM_ACTIVITIES[2], world });
  const pong = createArcadeCabinet({ activityDef: ORPHEUM_ACTIVITIES[0], world });

  assert.equal(downhill.gameId, 'orpheum-downhill-mayhem');
  assert.equal(downhill.usingModel, true);
  assert.notEqual(materialOf(downhill, 'Trim_ControlDeck'), materialOf(pong, 'Trim_ControlDeck'),
    'downhill clones its own LED material');
  assert.equal(materialOf(downhill, 'Cabinet_Body'), materialOf(pong, 'Cabinet_Body'),
    'downhill shares the immutable body material');

  downhill.dispose();
  assert.equal(downhill.group.parent, null);
  assert.equal(pong.group.parent, world.group, 'sibling survives the downhill disposal');
  pong.dispose();
  assert.equal(world.group.children.length, 0, 'world left clean');
});
