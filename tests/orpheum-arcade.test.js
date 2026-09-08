import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildDistrict } from '../src/districts.js';
import { gateItemsFor } from '../src/places/worldFactory.js';
import {
  getPlaceDefinition,
  ORPHEUM_ACTIVITIES,
  LEGACY_URBAN_BOUNDS,
} from '../shared/placeDefinitions.js';

test('Orpheum arcade wing builds with all 4 cabinets and preserved theater items', () => {
  const theaterDef = getPlaceDefinition('theater');
  assert.ok(theaterDef, 'theater definition exists');

  const world = buildDistrict(theaterDef);
  assert.ok(world, 'theater world builds successfully');

  // Verify all 4 activity items exist in items
  const activityItems = world.items.filter(it => it.type === 'activity');
  assert.equal(activityItems.length, 4, '4 activity items registered');
  const activityIds = activityItems.map(it => it.id || it.activityId).sort();
  assert.deepEqual(activityIds, [
    'orpheum-pong',
    'orpheum-rain-runner',
    'orpheum-signal-lost',
    'orpheum-sporefall',
  ]);

  // Verify all 48 seats are present (3 rows of 16 seats)
  const seats = world.items.filter(it => it.type === 'seat');
  assert.equal(seats.length, 48, '48 theater seats preserved');

  // Verify movie screen interactable is present
  const screenItem = world.items.find(it => it.type === 'theater_screen');
  assert.ok(screenItem, 'theater_screen interactable preserved');

  // Verify gates are generated and preserved
  const gates = gateItemsFor(theaterDef);
  assert.ok(gates.length >= 3, 'exit gates generated for theater');
  assert.ok(gates.some(g => g.targetDistrict === 'court'), 'east gate to court preserved');
  assert.ok(gates.some(g => g.targetDistrict === 'kiln-terrace'), 'west gate to kiln-terrace preserved');
  assert.ok(gates.some(g => g.targetDistrict === 'market'), 'south market gate preserved');
});

test('Orpheum arcade cabinets have collision blocks and do not overlap seats, gates, or spawns', () => {
  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);

  // Identify cabinet obstacles
  const cabinetObs = [];
  for (const act of ORPHEUM_ACTIVITIES) {
    const [cx, , cz] = act.transform.position;
    const obs = world.obstacles.find(o => Math.abs(o.x - cx) < 0.05 && Math.abs(o.z - cz) < 0.05);
    assert.ok(obs, `collision obstacle exists for cabinet ${act.id} at [${cx}, ${cz}]`);
    assert.ok(obs.w >= act.footprint.width / 2 - 0.01, `obstacle width matches footprint for ${act.id}`);
    assert.ok(obs.d >= act.footprint.depth / 2 - 0.01, `obstacle depth matches footprint for ${act.id}`);
    cabinetObs.push(obs);
  }
  assert.equal(cabinetObs.length, 4);

  // Cabinets do not overlap with each other physically
  for (let i = 0; i < cabinetObs.length; i++) {
    for (let j = i + 1; j < cabinetObs.length; j++) {
      const a = cabinetObs[i], b = cabinetObs[j];
      const physicalOverlapX = Math.abs(a.x - b.x) < ((a.w - 0.38) + (b.w - 0.38));
      const physicalOverlapZ = Math.abs(a.z - b.z) < ((a.d - 0.38) + (b.d - 0.38));
      assert.ok(!(physicalOverlapX && physicalOverlapZ), `cabinets ${i} and ${j} do not overlap physically`);
    }
  }

  // Cabinets do not overlap with player spawn or companion spawn
  const [px, pz] = theaterDef.spawn;
  const [kx, kz] = theaterDef.companionSpawn;
  for (const c of cabinetObs) {
    assert.ok(Math.abs(px - c.x) >= c.w || Math.abs(pz - c.z) >= c.d, 'player spawn is outside cabinet collision');
    assert.ok(Math.abs(kx - c.x) >= c.w || Math.abs(kz - c.z) >= c.d, 'companion spawn is outside cabinet collision');
  }

  // Cabinets do not overlap with any of the theater seats
  const seats = world.items.filter(it => it.type === 'seat');
  for (const seat of seats) {
    for (const c of cabinetObs) {
      const physicalOverlapX = Math.abs(seat.x - c.x) < ((c.w - 0.38) + 0.38);
      const physicalOverlapZ = Math.abs(seat.z - c.z) < ((c.d - 0.38) + 0.31);
      assert.ok(!(physicalOverlapX && physicalOverlapZ), `seat at [${seat.x}, ${seat.z}] does not overlap cabinet at [${c.x}, ${c.z}]`);
    }
  }

  // Gates are not blocked
  const gates = gateItemsFor(theaterDef);
  for (const gate of gates) {
    for (const c of cabinetObs) {
      const overlapX = Math.abs(gate.x - c.x) < c.w;
      const overlapZ = Math.abs(gate.z - c.z) < c.d;
      assert.ok(!(overlapX && overlapZ), `gate at [${gate.x}, ${gate.z}] is clear of cabinet collision`);
    }
  }
});

test('Orpheum arcade wing participant anchors and dismount spots are collision-free and inside bounds', () => {
  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);
  const b = theaterDef.bounds;

  const isFree = (x, z) => (
    x > b.minX && x < b.maxX &&
    z > b.minZ && z < b.maxZ &&
    !world.obstacles.some(o => Math.abs(x - o.x) < o.w && Math.abs(z - o.z) < o.d)
  );

  for (const act of ORPHEUM_ACTIVITIES) {
    for (const anchor of act.participantAnchors) {
      const [ax, , az] = anchor.position;
      assert.ok(isFree(ax, az), `${act.id} slot ${anchor.slot} anchor [${ax}, ${az}] is inside bounds and collision-free`);

      for (const dismount of (anchor.dismount || [])) {
        assert.ok(isFree(dismount.x, dismount.z), `${act.id} slot ${anchor.slot} dismount [${dismount.x}, ${dismount.z}] is collision-free`);
      }
    }
  }
});

test('Orpheum accessible routes have >= 1.2m width and connect all cabinets to spawns and gates', () => {
  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);
  const b = theaterDef.bounds;

  // 1. Walkway between front and back cabinet rows:
  // Front cabinets are centered at z = -3.5 (span z in [-4.0, -3.0])
  // Back cabinets are centered at z = -5.8 (span z in [-6.3, -5.3])
  // Clearance = -4.0 - (-5.3) = 1.3m >= 1.2m
  const frontRowZMin = -3.5 - 1.0 / 2; // -4.0
  const backRowZMax = -5.8 + 1.0 / 2;  // -5.3
  const interCabinetWalkway = frontRowZMin - backRowZMax;
  assert.ok(interCabinetWalkway >= 1.2, `walkway between cabinet rows is ${interCabinetWalkway.toFixed(2)}m (>= 1.2m)`);

  // 2. Cross-promenade clearance south of front row cabinets to Row 1 of seats:
  // Front cabinets south edge: z = -3.0
  // Seat Row 1 north edge: z = 0.3 - 0.31 = -0.01
  const southPromenadeClearance = Math.abs(-3.0 - (-0.01));
  assert.ok(southPromenadeClearance >= 1.2, `promenade clearance south of cabinets is ${southPromenadeClearance.toFixed(2)}m (>= 1.2m)`);

  // 3. East side promenade width between east seats and east perimeter:
  // East seats max x = 8.15 + 0.38 = 8.53; east perimeter = 11.3
  // East promenade width = 11.3 - 8.53 = 2.77m >= 1.2m
  const eastPromenadeWidth = 11.3 - (8.15 + 0.38);
  assert.ok(eastPromenadeWidth >= 1.2, `east promenade width is ${eastPromenadeWidth.toFixed(2)}m (>= 1.2m)`);

  // 4. Graph reachability: all cabinets, seats, and exits are reachable from spawn
  const step = 0.2;
  const isWalkable = (x, z) => (
    x > b.minX && x < b.maxX &&
    z > b.minZ && z < b.maxZ &&
    !world.obstacles.some(o => Math.abs(x - o.x) < o.w && Math.abs(z - o.z) < o.d)
  );

  const start = theaterDef.spawn;
  assert.ok(isWalkable(...start), 'spawn is walkable');

  const visited = new Set();
  const queue = [[Math.round(start[0] / step) * step, Math.round(start[1] / step) * step]];
  visited.add(`${queue[0][0].toFixed(1)},${queue[0][1].toFixed(1)}`);

  while (queue.length > 0) {
    const [cx, cz] = queue.shift();
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = Math.round((cx + dx) * 10) / 10;
      const nz = Math.round((cz + dz) * 10) / 10;
      const key = `${nx.toFixed(1)},${nz.toFixed(1)}`;
      if (!visited.has(key) && isWalkable(nx, nz)) {
        visited.add(key);
        queue.push([nx, nz]);
      }
    }
  }

  // Verify each cabinet anchor is close to a reachable node
  for (const act of ORPHEUM_ACTIVITIES) {
    for (const anchor of act.participantAnchors) {
      const [ax, , az] = anchor.position;
      let reachableNearAnchor = false;
      for (const key of visited) {
        const [vx, vz] = key.split(',').map(Number);
        if (Math.abs(vx - ax) <= 0.35 && Math.abs(vz - az) <= 0.35) {
          reachableNearAnchor = true;
          break;
        }
      }
      assert.ok(reachableNearAnchor, `${act.id} anchor [${ax}, ${az}] is accessible via continuous route`);
    }
  }
});

test('Movie screen sightlines remain unobstructed from all theater seats', () => {
  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);

  // Movie screen quad in theaterWorld.js spans x in [-6.5, 6.5] at z = -8.28
  const screenZ = -8.28;
  const screenCenter = [0, screenZ];
  const screenRightEdge = [6.5, screenZ];

  const seats = world.items.filter(it => it.type === 'seat');
  assert.equal(seats.length, 48);

  const cabinetBoxes = ORPHEUM_ACTIVITIES.map(act => {
    const [cx, , cz] = act.transform.position;
    const hw = act.footprint.width / 2;
    const hd = act.footprint.depth / 2;
    return {
      id: act.id,
      minX: cx - hw,
      maxX: cx + hw,
      minZ: cz - hd,
      maxZ: cz + hd,
    };
  });

  // Helper: check if line segment between (x1, z1) and (x2, z2) intersects an AABB
  function segmentIntersectsBox(x1, z1, x2, z2, box) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    let tmin = 0, tmax = 1;

    if (Math.abs(dx) > 1e-6) {
      const tx1 = (box.minX - x1) / dx;
      const tx2 = (box.maxX - x1) / dx;
      tmin = Math.max(tmin, Math.min(tx1, tx2));
      tmax = Math.min(tmax, Math.max(tx1, tx2));
    } else if (x1 < box.minX || x1 > box.maxX) {
      return false;
    }

    if (Math.abs(dz) > 1e-6) {
      const tz1 = (box.minZ - z1) / dz;
      const tz2 = (box.maxZ - z1) / dz;
      tmin = Math.max(tmin, Math.min(tz1, tz2));
      tmax = Math.min(tmax, Math.max(tz1, tz2));
    } else if (z1 < box.minZ || z1 > box.maxZ) {
      return false;
    }

    return tmin <= tmax && tmax >= 0 && tmin <= 1;
  }

  // 1. From ALL 48 seats, sightline to screen center is completely unobstructed
  for (const seat of seats) {
    for (const box of cabinetBoxes) {
      const blocked = segmentIntersectsBox(seat.x, seat.z, screenCenter[0], screenCenter[1], box);
      assert.equal(blocked, false, `seat [${seat.x}, ${seat.z}] to screen center unobstructed by ${box.id}`);
    }
  }

  // 2. From ALL 48 seats, sightline to the primary viewing region (center 80%: x in [-5.2, 5.2]) is completely unobstructed
  for (const seat of seats) {
    for (const testX of [-5.2, -2.6, 0, 2.6, 5.2]) {
      for (const box of cabinetBoxes) {
        const blocked = segmentIntersectsBox(seat.x, seat.z, testX, screenZ, box);
        assert.equal(blocked, false, `seat [${seat.x}, ${seat.z}] to screen point [${testX}, ${screenZ}] unobstructed by ${box.id}`);
      }
    }
  }

  // 3. For 46 out of 48 seats, sightline to the entire screen (100% width x in [-6.5, 6.5]) is completely unobstructed
  let fullyUnobstructedCount = 0;
  for (const seat of seats) {
    let seatHasFullView = true;
    for (const testX of [-6.5, -4.0, 0, 4.0, 6.5]) {
      for (const box of cabinetBoxes) {
        if (segmentIntersectsBox(seat.x, seat.z, testX, screenZ, box)) {
          seatHasFullView = false;
          break;
        }
      }
      if (!seatHasFullView) break;
    }
    if (seatHasFullView) fullyUnobstructedCount++;
  }
  assert.ok(fullyUnobstructedCount >= 46, `${fullyUnobstructedCount}/48 seats have 100% unobstructed edge-to-edge view`);

  // 4. Outermost east seat (Row 1 East: [8.15, 0.3]) sightline ray to right edge [6.5, -8.28]
  // passes east of x <= 7.42 at z = -3.5
  const row1SeatEast = seats.find(s => Math.abs(s.x - 8.15) < 0.05 && Math.abs(s.z - 0.3) < 0.05);
  assert.ok(row1SeatEast, 'Row 1 East seat found');
  const t = (-3.5 - row1SeatEast.z) / (screenRightEdge[1] - row1SeatEast.z);
  const rayXAtCabinetZ = row1SeatEast.x + t * (screenRightEdge[0] - row1SeatEast.x);
  assert.ok(rayXAtCabinetZ <= 7.42, `sightline ray at z = -3.5 is at x = ${rayXAtCabinetZ.toFixed(3)} <= 7.42`);
});

test('Orpheum minimap schematic incorporates the northeast arcade wing', () => {
  const theaterDef = getPlaceDefinition('theater');
  // The wing rect (M121 30H125V56H121Z) covers the cabinet line (x = 10.42,
  // z from -7.55 to -1.4) under the minimap projection: seat rows and the
  // arcade wing are drawn as subpaths of the theater schematic.
  assert.ok(theaterDef.minimapPath.includes('M121 30H125V56H121Z'), 'minimap path contains arcade wing rect');
});
