import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDistrict, districts, readExploration } from '../src/districts.js';

test('old and malformed saves migrate without inventing progress', () => {
  assert.deepEqual(readExploration(undefined), { current: 'court', visited: ['court'], completed: [] });
  assert.deepEqual(readExploration({ current: 'removed', visited: ['canal', 'canal', 'missing'], completed: ['garden', 'garden', 3] }), { current: 'court', visited: ['court', 'canal'], completed: ['garden'] });
  assert.equal(readExploration({ current: 'station' }).current, 'station');
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
