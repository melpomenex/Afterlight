// The Orpheum's scenery integrity: floor pads own their footprints, solid
// volumes are collision-covered, and the additions never break navigation.
// See openspec/changes/fix-theater-geometry-clipping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDistrict } from '../src/districts.js';
import { getPlaceDefinition, ORPHEUM_ACTIVITIES } from '../shared/placeDefinitions.js';
import { isWalkable } from '../src/world/bounds.js';
import { THEATER_FLOOR_PADS, THEATER_PROJECTION_BOOTH, THEATER_SOLID_VOLUMES, THEATER_WEST_MOULDING_X } from '../src/world/theaterWorld.js';
import { gateVisualBoxesFor } from '../src/places/worldFactory.js';

function foot(pad) {
  return {
    minX: pad.x - pad.w / 2,
    maxX: pad.x + pad.w / 2,
    minZ: pad.z - pad.d / 2,
    maxZ: pad.z + pad.d / 2,
  };
}

function overlaps(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

test('theater accent floor pads each own their footprint', () => {
  const accents = THEATER_FLOOR_PADS.filter(p => p.kind !== 'carpet');
  assert.ok(accents.length >= 6, 'the runners and rugs are declared');
  for (let i = 0; i < accents.length; i++) {
    for (let j = i + 1; j < accents.length; j++) {
      assert.ok(
        !overlaps(foot(accents[i]), foot(accents[j])),
        `${accents[i].id} must not overlap ${accents[j].id}`,
      );
    }
  }
});

test('the retired lobby darts oche has no pad and the Summit Run bay is intact', () => {
  assert.ok(!THEATER_FLOOR_PADS.some(p => /oche|darts/.test(p.id)), 'no oche pad remains');
  assert.ok(
    !THEATER_FLOOR_PADS.some(p => Math.abs(p.x - 8.55) < .05 && Math.abs(p.z - 3.6) < .05
      && Math.abs(p.w - 1.1) < .05 && Math.abs(p.d - 1.6) < .05),
    'no pad reproduces the retired oche rectangle',
  );
  const summit = THEATER_FLOOR_PADS.find(p => p.id === 'summit-runner');
  assert.deepEqual(
    { x: summit?.x, z: summit?.z, w: summit?.w, d: summit?.d, border: summit?.border },
    { x: 9.1, z: 2.6, w: 3.8, d: 3.4, border: 'full' },
    'the Summit Run runner and its brass frame survive the oche removal',
  );
});

test('the theater still builds and batches after the pad refactor', () => {
  const world = buildDistrict(getPlaceDefinition('theater'));
  assert.equal(world.group.visible, false, 'a built world stays hidden until activation');
  let batched = false;
  world.group.traverse(o => { if (o.isInstancedMesh) batched = true; });
  assert.ok(batched, 'static scenery is still batched');
});

test('every declared solid volume is obstacle-covered with the 0.38 clearance', () => {
  const world = buildDistrict(getPlaceDefinition('theater'));
  for (const volume of THEATER_SOLID_VOLUMES) {
    const obs = world.obstacles.find(o => Math.abs(o.x - volume.x) < .01 && Math.abs(o.z - volume.z) < .01);
    assert.ok(obs, `${volume.id} has a collision obstacle`);
    assert.ok(
      obs.w >= volume.w / 2 + .38 - 1e-6 && obs.d >= volume.d / 2 + .38 - 1e-6,
      `${volume.id} obstacle covers the visual half-extent plus the actor/near-plane margin`,
    );
  }
});

test('the theater gate arch volumes are solid', () => {
  const def = getPlaceDefinition('theater');
  const world = buildDistrict(def);
  const arches = gateVisualBoxesFor(def).filter(g => g.role === 'arch');
  assert.equal(arches.length, 3, 'west, east and market arches are declared');
  for (const gate of arches) {
    const obs = world.obstacles.find(o => Math.abs(o.x - gate.x) < .01 && Math.abs(o.z - gate.z) < .01);
    assert.ok(obs, `gate arch at [${gate.x}, ${gate.z}] is collision-covered`);
    assert.ok(
      obs.w >= gate.w / 2 + .38 - 1e-6 && obs.d >= gate.d / 2 + .38 - 1e-6,
      `gate arch at [${gate.x}, ${gate.z}] keeps the actor margin`,
    );
  }
});

test('no proscenium side face reaches south of z = -7.8', () => {
  for (const volume of THEATER_SOLID_VOLUMES.filter(v => v.id.startsWith('proscenium'))) {
    assert.ok(volume.z + volume.d / 2 <= -7.8 + 1e-9, `${volume.id} south face stays north of -7.8`);
  }
});

test('Pong anchors are collision-free and clear of the proscenium visuals', () => {
  const def = getPlaceDefinition('theater');
  const world = buildDistrict(def);
  const b = def.bounds;
  const isFree = (x, z) => (
    x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ
    && !world.obstacles.some(o => Math.abs(x - o.x) < o.w && Math.abs(z - o.z) < o.d)
  );
  const pong = ORPHEUM_ACTIVITIES.find(activity => activity.id === 'orpheum-pong');
  assert.ok(pong, 'the Pong activity is declared');
  for (const anchor of pong.participantAnchors) {
    const [ax, , az] = anchor.position;
    assert.ok(isFree(ax, az), `Pong slot ${anchor.slot} anchor [${ax}, ${az}] is collision-free`);
    for (const dismount of anchor.dismount ?? []) {
      assert.ok(isFree(dismount.x, dismount.z), `Pong slot ${anchor.slot} dismount [${dismount.x}, ${dismount.z}] is free`);
    }
  }
  const [, , az] = pong.participantAnchors[0].position;
  const pier = THEATER_SOLID_VOLUMES.find(v => v.id === 'proscenium-east-pier');
  const drape = THEATER_SOLID_VOLUMES.find(v => v.id === 'proscenium-east-drape');
  assert.ok(az - (pier.z + pier.d / 2) >= .38, 'anchor keeps the actor margin in front of the pier face');
  assert.ok(az - (drape.z + drape.d / 2) >= .38, 'anchor keeps the actor margin in front of the drape reach');
});

test('east fixture collision leaves at least a 1.2m corridor off the seat band', () => {
  // Outermost east seat column (x = 8.15) plus the stored seat block half
  // extent (0.76) is the seat band edge the walkable corridor starts from.
  const seatBandEdge = 8.91;
  for (const volume of THEATER_SOLID_VOLUMES.filter(v => v.x > 10)) {
    const obstacleEdge = volume.x - volume.w / 2 - .38;
    assert.ok(
      obstacleEdge - seatBandEdge >= 1.2 - 1e-9,
      `${volume.id} keeps ${(obstacleEdge - seatBandEdge).toFixed(2)}m off the seat band`,
    );
  }
});

test('every theater gate keeps a collision-free approach spot', () => {
  const def = getPlaceDefinition('theater');
  const world = buildDistrict(def);
  const b = def.bounds;
  const isFree = (x, z) => (
    x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ
    && !world.obstacles.some(o => Math.abs(x - o.x) < o.w && Math.abs(z - o.z) < o.d)
  );
  for (const gate of gateVisualBoxesFor(def).filter(g => g.role === 'arch')) {
    let closest = Infinity;
    for (let x = gate.x - 3; x <= gate.x + 3; x += .2) {
      for (let z = gate.z - 3; z <= gate.z + 3; z += .2) {
        if (!isFree(x, z)) continue;
        closest = Math.min(closest, Math.hypot(x - gate.x, z - gate.z));
      }
    }
    assert.ok(closest < 2, `gate at [${gate.x}, ${gate.z}] has a free spot ${closest.toFixed(2)}m away`);
  }
});

test('the projection booth stands clear of the market gate visual', () => {
  const def = getPlaceDefinition('theater');
  const booth = {
    minX: THEATER_PROJECTION_BOOTH.x - THEATER_PROJECTION_BOOTH.w / 2,
    maxX: THEATER_PROJECTION_BOOTH.x + THEATER_PROJECTION_BOOTH.w / 2,
    minZ: THEATER_PROJECTION_BOOTH.z - THEATER_PROJECTION_BOOTH.d / 2,
    maxZ: THEATER_PROJECTION_BOOTH.z + THEATER_PROJECTION_BOOTH.d / 2,
  };
  for (const gate of gateVisualBoxesFor(def).filter(g => g.role === 'arch')) {
    const arch = {
      minX: gate.x - gate.w / 2,
      maxX: gate.x + gate.w / 2,
      minZ: gate.z - gate.d / 2,
      maxZ: gate.z + gate.d / 2,
    };
    assert.ok(!overlaps(booth, arch), `booth does not intersect the arch at [${gate.x}, ${gate.z}]`);
  }
});

test('west gallery trim sits fully proud of the wall plane', () => {
  const wallFaceX = -11.47;
  const thickness = .06;
  const back = THEATER_WEST_MOULDING_X - thickness / 2;
  const front = THEATER_WEST_MOULDING_X + thickness / 2;
  assert.ok(Math.abs(back - wallFaceX) > .005, `moulding back face ${back} is not coplanar with the wall`);
  assert.ok(Math.abs(front - wallFaceX) > .005, `moulding front face ${front} is not coplanar with the wall`);
  assert.ok(front > wallFaceX, 'the trim sits in front of the wall face');
});

test('every seat, activity, gate and the projector landmark stay reachable', () => {
  const def = getPlaceDefinition('theater');
  const world = buildDistrict(def);
  const b = def.bounds;
  const step = .5;
  const [sx, sz] = def.spawn;
  assert.ok(isWalkable(b, world.obstacles, sx, sz), 'spawn is walkable');

  const visited = new Set([`${sx},${sz}`]);
  const queue = [[sx, sz]];
  while (queue.length > 0) {
    const [cx, cz] = queue.shift();
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = cx + dx, nz = cz + dz;
      const key = `${nx},${nz}`;
      if (visited.has(key) || !isWalkable(b, world.obstacles, nx, nz)) continue;
      visited.add(key);
      queue.push([nx, nz]);
    }
  }
  const approachable = (x, z, distance = 1.8) => {
    for (const key of visited) {
      const [vx, vz] = key.split(',').map(Number);
      if (Math.hypot(vx - x, vz - z) < distance) return true;
    }
    return false;
  };

  const seats = world.items.filter(i => i.type === 'seat');
  assert.equal(seats.length, 48, 'the full house is present');
  for (const seat of seats) {
    assert.ok(approachable(seat.x, seat.z), `seat at [${seat.x}, ${seat.z}] is approachable`);
  }
  for (const activity of world.items.filter(i => i.type === 'activity')) {
    assert.ok(approachable(activity.x, activity.z), `${activity.id} is approachable`);
  }
  const landmark = world.items.find(i => i.type === 'landmark');
  assert.ok(landmark, 'the projector landmark is present');
  assert.ok(approachable(landmark.x, landmark.z), 'the projector landmark is approachable');
  for (const exit of def.exits) {
    const [ex, ez] = exit.position;
    assert.ok(approachable(ex, ez), `${exit.id} exit at [${ex}, ${ez}] is approachable`);
  }
});

test('every theater seat keeps a free stand-up spot', () => {
  const def = getPlaceDefinition('theater');
  const world = buildDistrict(def);
  const b = def.bounds;
  const seats = world.items.filter(i => i.type === 'seat');
  assert.ok(seats.length > 0, 'theater has seats');
  for (const seat of seats) {
    assert.ok(
      isWalkable(b, world.obstacles, seat.x, seat.z - .8),
      `stand-up spot is free for the seat at ${seat.x},${seat.z}`,
    );
  }
});
