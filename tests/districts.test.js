import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDistrict, districts, readExploration } from '../src/districts.js';

test('old and malformed saves migrate without inventing progress', () => {
  assert.deepEqual(readExploration(undefined), { current: 'court', visited: ['court'], completed: [] });
  assert.deepEqual(readExploration({ current: 'removed', visited: ['canal', 'canal', 'missing'], completed: ['garden', 'garden', 3] }), { current: 'court', visited: ['court', 'canal'], completed: ['garden'] });
  assert.equal(readExploration({ current: 'station' }).current, 'station');
  assert.equal(readExploration({ current: 'aqueduct' }).current, 'aqueduct');
  assert.ok(readExploration({ visited: ['aqueduct', 'caldera'] }).visited.includes('aqueduct'));
  assert.ok(readExploration({ completed: ['understory', 'saltworks'] }).completed.includes('understory'));
});

test('all seventeen districts have unique IDs, names, and complete metadata', () => {
  assert.equal(districts.length, 17);
  const ids = new Set(), names = new Set();
  for (const d of districts) {
    assert.ok(!ids.has(d.id), `duplicate district id: ${d.id}`);
    ids.add(d.id);
    assert.ok(!names.has(d.name), `duplicate district name: ${d.name}`);
    names.add(d.name);
    assert.ok(d.color.startsWith('#'), `${d.id} has valid hex color`);
    assert.ok(d.sun.startsWith('#'), `${d.id} has valid sun hex`);
    if (d.id !== 'court') {
      assert.ok(Array.isArray(d.landmark) && d.landmark.length === 2, `${d.id} has landmark coordinate`);
      assert.ok(Array.isArray(d.note) && d.note.length === 2, `${d.id} has note coordinate`);
      assert.ok(d.noteTitle && d.noteBody, `${d.id} has note lore`);
      assert.ok(d.objective && d.action && d.done, `${d.id} has restoration action metadata`);
    }
  }
});

for (const def of districts.slice(1)) test(`${def.name}: exits and objectives are reachable with collision enabled`, () => {
  const world = buildDistrict(def);
  const free = (x, z) => x > -11.3 && x < 11.3 && z > -9.5 && z < 10.3 && !world.obstacles.some(o => Math.abs(x - o.x) < o.w && Math.abs(z - o.z) < o.d);
  assert.ok(free(...def.spawn), 'player spawn is clear');
  assert.ok(free(def.spawn[0] + .8, def.spawn[1] + 1), 'companion spawn is clear');
  const queue = [def.spawn], visited = new Set([def.spawn.join(',')]);
  for (let index = 0; index < queue.length; index++) {
    const [x, z] = queue[index];
    for (const [dx, dz] of [[.5, 0], [-.5, 0], [0, .5], [0, -.5]]) {
      const next = [x + dx, z + dz], key = next.join(',');
      if (!visited.has(key) && free(...next)) { visited.add(key); queue.push(next); }
    }
  }
  for (const item of [...world.items, { x: -10.7, z: 0, type: 'west exit' }, { x: 10.7, z: 0, type: 'east exit' }]) {
    assert.ok(queue.some(([x, z]) => Math.hypot(x - item.x, z - item.z) < 1.8), `${item.type} has an accessible interaction approach`);
  }
  assert.ok(world.group.children.some(o => o.isInstancedMesh), 'static scenery is batched');
  world.update(3, false); world.update(4, true);
  world.group.traverse(object => assert.ok(object.position.toArray().every(Number.isFinite)));
});

test('the theater exposes its screen quad and a full house of seats', () => {
  const world = buildDistrict(districts.find(d => d.id === 'theater'));
  assert.ok(Array.isArray(world.screenQuad), 'theater defines a screen quad');
  assert.equal(world.screenQuad.length, 4);
  for (const p of world.screenQuad) {
    assert.ok([p.x, p.y, p.z].every(Number.isFinite), `screen quad corner is finite: ${p.x},${p.y},${p.z}`);
  }
  assert.ok(world.items.filter(i => i.type === 'seat').length >= 30, 'theater has seats to sit in');
});

test('every theater seat has a clear stand-up spot in front of the chair', () => {
  // standUp() steps the player to (seat.x, seat.z - 0.8); that spot must be
  // free of every obstacle or the player is wedged inside the chair's
  // collision rectangle (small movement steps can never escape one).
  const world = buildDistrict(districts.find(d => d.id === 'theater'));
  const free = (x, z) => x > -11.3 && x < 11.3 && z > -9.5 && z < 10.3
    && !world.obstacles.some(o => Math.abs(x - o.x) < o.w && Math.abs(z - o.z) < o.d);
  const seats = world.items.filter(i => i.type === 'seat');
  assert.ok(seats.length > 0, 'theater has seats');
  for (const seat of seats) {
    assert.ok(free(seat.x, seat.z - 0.8), `stand-up spot is clear for the seat at ${seat.x},${seat.z}`);
  }
});

test('the rain court builds without a landmark or field note', () => {
  const world = buildDistrict(districts.find(d => d.id === 'court'));
  assert.ok(!world.items.some(i => i.type === 'landmark'), 'court has no landmark');
  assert.ok(!world.items.some(i => i.type === 'field-note'), 'court has no field note');
});
