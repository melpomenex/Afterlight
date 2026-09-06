import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Storage } from '../server/storage.js';
import { NodesManager } from '../server/nodes.js';
import { MachinesManager, isMillRestoredInState } from '../server/machines.js';
import { GardensManager } from '../server/gardens.js';
import { EconomyManager } from '../server/economy.js';
import { MATERIAL_NODES, MATERIALS, SPRINKLER, GOODS } from '../shared/materials.js';
import { sprinklerCoverage } from '../shared/gardenModel.js';
import { calculateNpcSellPrice } from '../shared/economy.js';

function tempPath(label) {
  return `/tmp/test-crafting-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
}

function makePlayer(id, materials = {}, produce = {}) {
  return {
    id,
    nickname: `Tester${id.slice(-3)}`,
    coins: 50,
    xp: 0,
    level: 1,
    reputation: 10,
    reservedCoins: 0,
    materials,
    inventory: {
      seeds: {},
      produce,
      reservedProduce: {},
      sprinklers: 0,
    },
  };
}

// --- Gathering: material nodes ---

test('node harvest grants nothing itself, depletes the node, and rejects repeats', () => {
  const nodes = new NodesManager(new Storage(tempPath('harvest')));
  const res = nodes.harvest('foundry_copper_1');
  assert.equal(res.success, true);
  assert.equal(res.material, 'copper');

  const repeat = nodes.harvest('foundry_copper_1');
  assert.equal(repeat.success, false);
  assert.equal(repeat.reason, 'node_depleted');
  assert.ok(repeat.respawnAt > Date.now());

  assert.equal(nodes.harvest('made_up_node').success, false);

  // Server-side district guard: a node can only be gathered from the room
  // that owns it (stops stale/throttled clients gathering remotely).
  assert.equal(nodes.nodeDistrict('foundry_copper_1'), 'foundry');
  assert.equal(nodes.nodeDistrict('made_up_node'), null);
  assert.notEqual(nodes.nodeDistrict('trestle_timber_1'), 'foundry');

  // Node definitions sit inside every district's walkable bounds with clear
  // standing spots (click clamp is tighter than walkable bounds).
  for (const node of MATERIAL_NODES) {
    const [x, z] = node.position;
    assert.ok(x > -11 && x < 11 && z > -9 && z < 10, `node ${node.id} out of bounds`);
    assert.ok(MATERIALS[node.material], `node ${node.id} has unknown material`);
  }
});

test('node depletion and respawn survive a server restart', () => {
  const path = tempPath('restart');
  const first = new NodesManager(new Storage(path));
  const harvestTime = Date.now() - 5000; // pretend the harvest happened 5s ago
  first.harvest('trestle_timber_2', harvestTime);

  // Simulate a full restart by re-reading the same state file.
  const second = new NodesManager(new Storage(path));
  const respawnMs = MATERIAL_NODES.find(n => n.id === 'trestle_timber_2').respawnMs;

  // Remaining respawn time is intact: still depleted just before the interval.
  assert.equal(second.isDepleted('trestle_timber_2', harvestTime + respawnMs - 1), true);
  const rejected = second.harvest('trestle_timber_2', harvestTime + respawnMs - 1);
  assert.equal(rejected.success, false);

  // Available again once the interval has fully elapsed.
  assert.equal(second.isDepleted('trestle_timber_2', harvestTime + respawnMs + 1), false);
  const reHarvest = second.harvest('trestle_timber_2', harvestTime + respawnMs + 1);
  assert.equal(reHarvest.success, true);
});

test('district node snapshots report availability and respawn timers', () => {
  const nodes = new NodesManager(new Storage(tempPath('states')));
  assert.equal(nodes.getStatesForDistrict('canal'), null);

  nodes.harvest('glasshouse_glass_1');
  const states = nodes.getStatesForDistrict('frost-spire');
  assert.equal(states.length, MATERIAL_NODES.filter(n => n.district === 'frost-spire').length);
  const harvested = states.find(s => s.nodeId === 'glasshouse_glass_1');
  assert.equal(harvested.available, false);
  assert.ok(harvested.respawnAt > Date.now());
  assert.equal(states.find(s => s.nodeId === 'glasshouse_glass_2').available, true);

  // tick() reports the district once its node comes back.
  const now = Date.now();
  const depletions = nodes.depletions;
  depletions['glasshouse_glass_1'] = now - 1000 * 60 * 60; // long expired
  assert.deepEqual(nodes.tick(now), ['frost-spire']);
  assert.deepEqual(nodes.tick(now), []);
  assert.equal(nodes.getStatesForDistrict('frost-spire').find(s => s.nodeId === 'glasshouse_glass_1').available, true);
});

// --- Crafting: community restoration ---

test('mill contributions validate material, clamp over-contribution, and persist', () => {
  const path = tempPath('mill');
  const machines = new MachinesManager(new Storage(path));
  const player = makePlayer('contributor', { copper: 10, timber: 5, glass: 4 });

  // Unneeded / unknown materials are rejected outright.
  assert.equal(machines.contribute(player, 'stone', 1).reason, 'material_not_needed');
  assert.equal(machines.contribute(player, 'copper', 0).reason, 'invalid_quantity');
  // Offering a needed material the player does not hold is rejected.
  assert.equal(machines.contribute(makePlayer('empty_handed'), 'copper', 1).reason, 'insufficient_materials');

  // Over-contribution clamps to the remaining need (4), not the offered 10.
  const clamped = machines.contribute(player, 'copper', 10);
  assert.equal(clamped.success, true);
  assert.equal(clamped.applied, 4);
  assert.equal(player.materials.copper, 6);
  assert.equal(machines.getStatus().mill.contributed.copper, 4);

  // Completing a material it no longer needs is rejected.
  assert.equal(machines.contribute(player, 'copper', 1).reason, 'material_fulfilled');

  // Timber: player holds 5, only 4 needed — clamped by need, not stock.
  const timberRes = machines.contribute(player, 'timber', 4);
  assert.equal(timberRes.success, true);
  assert.equal(timberRes.applied, 4);
  assert.equal(player.materials.timber, 1);
  assert.equal(timberRes.restored, false);

  // Glass: the final needed unit restores the mill in the same atomic step.
  const glassRes = machines.contribute(player, 'glass', 4);
  assert.equal(glassRes.success, true);
  assert.equal(glassRes.restored, true);
  assert.equal(machines.isMillRestored(), true);

  // Further contributions are rejected once restored.
  assert.equal(machines.contribute(player, 'copper', 1).reason, 'mill_already_restored');

  // Restoration is permanent across a restart.
  const restarted = new MachinesManager(new Storage(path));
  assert.equal(restarted.isMillRestored(), true);
  assert.equal(restarted.getStatus().mill.contributed.copper, 4);
});

// --- Crafting: milling wheat into flour ---

test('milling rejects broken mill and missing wheat, then converts 1:1 worst grade first', () => {
  const storage = new Storage(tempPath('millwheat'));
  const machines = new MachinesManager(storage);
  const player = makePlayer('miller', {}, { wheat_B: 2, wheat_C: 2, wheat_A: 1 });

  assert.equal(machines.millWheat(player, 1).reason, 'mill_broken');

  // Simulate a restored mill persisted in storage.
  storage.state.machines = { mill: { status: 'restored', required: { copper: 1, timber: 1, glass: 1 }, contributed: { copper: 1, timber: 1, glass: 1 }, restoredAt: Date.now() } };
  const restored = new MachinesManager(storage);
  assert.equal(restored.isMillRestored(), true);

  assert.equal(restored.millWheat(player, 0).reason, 'invalid_quantity');

  const res = restored.millWheat(player, 3);
  assert.equal(res.success, true);
  assert.equal(res.milled, 3);
  // Lowest grades go first: both C and one B.
  assert.equal(player.inventory.produce.wheat_C, undefined);
  assert.equal(player.inventory.produce.wheat_B, 1);
  assert.equal(player.inventory.produce.wheat_A, 1);
  assert.equal(player.inventory.produce.flour_B, 3);

  // Milling more than held clamps to stock.
  const rest = restored.millWheat(player, 99);
  assert.equal(rest.milled, 2);
  assert.equal(player.inventory.produce.flour_B, 5);
  assert.equal(restored.millWheat(player, 1).reason, 'no_wheat');
});

// --- Flour in the economy ---

test('flour sells at an NPC spot price above wheat and follows the dynamic multiplier', () => {
  // Wheat basePrice 9 -> grade B bid 8; flour basePrice 14 -> bid 12.
  assert.equal(calculateNpcSellPrice('wheat', 'B', 1.0), 8);
  assert.ok(calculateNpcSellPrice('flour', 'B', 1.0) > calculateNpcSellPrice('wheat', 'B', 1.0));

  const economy = new EconomyManager(new Storage(tempPath('flour-economy')));
  assert.ok(economy.getPricesSnapshot().flour);
  assert.equal(economy.getPricesSnapshot().flour.basePrice, GOODS.flour.basePrice);

  const player = makePlayer('flourseller', {}, { flour_B: 3 });
  const before = player.coins;
  const res = economy.npcSell(player, 'flour', 'A', 2); // quality forced to B for goods
  assert.equal(res.success, true);
  assert.equal(res.quality, 'B');
  assert.ok(player.coins > before);
  assert.equal(player.inventory.produce.flour_B, 1);
});

test('flour contracts generate only while the mill is restored and can be fulfilled', () => {
  const storage = new Storage(tempPath('flour-contracts'));
  const economy = new EconomyManager(storage);

  // Broken mill: no flour tier, ever.
  for (let i = 0; i < 5; i++) {
    economy.refreshContracts();
    assert.ok(economy.contracts.every(c => c.cropId !== 'flour'));
  }

  // Restore the mill: flour contracts appear on the next generation.
  storage.state.machines = {
    mill: { status: 'restored', required: { copper: 1, timber: 1, glass: 1 }, contributed: { copper: 1, timber: 1, glass: 1 }, restoredAt: Date.now() },
  };
  assert.equal(isMillRestoredInState(storage.state), true);
  let sawFlour = false;
  for (let i = 0; i < 10 && !sawFlour; i++) {
    economy.refreshContracts();
    sawFlour = economy.contracts.some(c => c.cropId === 'flour' && c.tier === 'flour' && c.minQuality === 'B');
  }
  assert.ok(sawFlour, 'no flour contract generated across 10 refreshes while restored');

  // Fulfilling one pays out and replaces it.
  const contract = economy.contracts.find(c => c.cropId === 'flour');
  const player = makePlayer('baker', {}, { flour_B: contract.quantity });
  const coinsBefore = player.coins;
  const res = economy.fulfillContract(player, contract.id);
  assert.equal(res.success, true);
  assert.ok(player.coins > coinsBefore);
  assert.equal(player.inventory.produce.flour_B, undefined);
});

// --- Sprinkler crafted tool ---

test('sprinkler crafting consumes copper and glass server-side', () => {
  const machines = new MachinesManager(new Storage(tempPath('craft')));
  const player = makePlayer('tinkerer', { copper: 2, glass: 2 });

  assert.equal(machines.craft(player, 'teleporter').reason, 'unknown_fixture');
  const ok = machines.craft(player, 'sprinkler');
  assert.equal(ok.success, true);
  assert.equal(player.inventory.sprinklers, 1);
  assert.equal(player.materials.copper, undefined);
  assert.equal(player.materials.glass, undefined);

  const broke = makePlayer('tinkerer2', { copper: 1, glass: 5 });
  assert.equal(machines.craft(broke, 'sprinkler').reason, 'insufficient_materials');
  assert.equal(broke.inventory.sprinklers, 0);
});

test('sprinkler placement validates kits, duplicates, and the per-garden cap', () => {
  const storage = new Storage(tempPath('place'));
  const gardens = new GardensManager(storage);

  // Without any fixture logic bypass, placement itself is validated by the
  // garden: duplicates and the cap are rejected, persisted gardens keep
  // their fixtures across a restart.
  assert.equal(gardens.handleAction('plot_owner', { action: 'place_sprinkler', bedIndex: 0 }).success, true);
  assert.equal(gardens.handleAction('plot_owner', { action: 'place_sprinkler', bedIndex: 0 }).reason, 'fixture_already_present');
  assert.equal(gardens.handleAction('plot_owner', { action: 'place_sprinkler', bedIndex: 3 }).success, true);
  assert.equal(gardens.handleAction('plot_owner', { action: 'place_sprinkler', bedIndex: 6 }).success, true);
  assert.equal(gardens.handleAction('plot_owner', { action: 'place_sprinkler', bedIndex: 9 }).reason, 'sprinkler_limit_reached');
  assert.equal(gardens.handleAction('plot_owner', { action: 'place_sprinkler', bedIndex: 99 }).reason, 'bed_not_found');

  const restarted = new GardensManager(new Storage(path_of(storage)));
  const garden = restarted.getOrCreateGarden('plot_owner');
  assert.equal(garden.fixtures.length, 3);
  assert.deepEqual(garden.fixtures.map(f => f.bedIndex).sort(), [0, 3, 6]);

  function path_of(s) { return s.filePath; }
});

test('sprinkler coverage in the tick keeps covered beds moist while others dry', () => {
  const storage = new Storage(tempPath('tick'));
  const gardens = new GardensManager(storage);
  gardens.getOrCreateGarden('waterer');

  // Sprinkler on bed 5 covers {1, 4, 5, 6, 9} (bed + orthogonal grid neighbors).
  assert.deepEqual(sprinklerCoverage(5).sort(), [1, 4, 5, 6, 9]);
  gardens.handleAction('waterer', { action: 'place_sprinkler', bedIndex: 5 });

  // Two planted beds: one covered (5), one not (1 is covered — use 0 instead).
  gardens.handleAction('waterer', { action: 'till', bedIndex: 5 });
  gardens.handleAction('waterer', { action: 'plant', bedIndex: 5, seedCropId: 'wheat' });
  gardens.handleAction('waterer', { action: 'till', bedIndex: 0 });
  gardens.handleAction('waterer', { action: 'plant', bedIndex: 0, seedCropId: 'wheat' });

  const garden = gardens.getOrCreateGarden('waterer');
  for (const bed of garden.beds) bed.moisture = 0.5;

  // 10 seconds of clear weather.
  gardens.tick(1.0, false);
  for (let i = 0; i < 9; i++) gardens.tick(1.0, false);

  const covered = garden.beds[5];
  const uncovered = garden.beds[0];
  const coveredButEmpty = garden.beds[1];
  assert.ok(covered.moisture > 0.9, `covered bed should stay wet, got ${covered.moisture}`);
  assert.ok(uncovered.moisture < 0.5, `uncovered bed should dry, got ${uncovered.moisture}`);
  assert.ok(coveredButEmpty.moisture > 0.9, 'coverage should extend to the empty neighbor bed');

  // Persistence: fixtures ride along with the garden save.
  const restarted = new GardensManager(new Storage(storage.filePath));
  assert.equal(restarted.getOrCreateGarden('waterer').fixtures.length, 1);
});

// --- Storage migration (task 7.2) ---

test('storage read path tolerates old state files without the new fields', () => {
  const path = tempPath('migration');
  const oldState = {
    version: 1,
    players: {
      old_gardener: {
        id: 'old_gardener',
        nickname: 'MossyOld',
        coins: 25,
        xp: 40,
        level: 1,
        reputation: 12,
        reservedCoins: 0,
        inventory: { seeds: { radish: 2 }, produce: { radish_B: 3 }, reservedProduce: {} },
        currentRoom: 'market',
        lastSeen: 1700000000000,
      },
    },
    gardens: {
      old_gardener: {
        beds: Array.from({ length: 12 }, (_, i) => ({ index: i, prepared: i === 0, cropId: null, plantedAt: null, lastWateredAt: null, moisture: 0, health: 1, moistureHistorySum: 0, moistureChecks: 0, stage: 0, harvestCount: 0 })),
      },
    },
    orders: [],
    trades: [],
    marketMultipliers: { radish: 1.2 },
    // No `nodes`, `machines`, `materials`, or garden `fixtures`.
  };
  fs.writeFileSync(path, JSON.stringify(oldState), 'utf8');

  const storage = new Storage(path);
  assert.deepEqual(storage.state.nodes, {});
  assert.deepEqual(storage.state.machines, {});

  const player = storage.getPlayer('old_gardener');
  assert.ok(player);
  assert.equal(player.coins, 25);
  assert.deepEqual(player.materials, {});
  assert.equal(player.inventory.sprinklers, 0);
  assert.equal(player.inventory.produce.radish_B, 3);

  const gardens = new GardensManager(storage);
  const garden = gardens.getOrCreateGarden('old_gardener');
  assert.equal(garden.beds.length, 12);
  assert.deepEqual(garden.fixtures, []);

  const machines = new MachinesManager(storage);
  assert.equal(machines.isMillRestored(), false);
  assert.equal(machines.getStatus().mill.contributed.copper, 0);

  const nodes = new NodesManager(storage);
  assert.equal(nodes.getStatesForDistrict('foundry').every(s => s.available), true);

  // Round trip: saving the migrated player keeps the new fields usable.
  player.materials.copper = 2;
  storage.savePlayer(player);
  const reloaded = new Storage(path);
  assert.equal(reloaded.getPlayer('old_gardener').materials.copper, 2);
});

test('storage repairs corrupt material fields on read and save', () => {
  const path = tempPath('corrupt');
  const state = {
    version: 1,
    players: {
      odd_gardener: {
        id: 'odd_gardener',
        nickname: 'OddOne',
        coins: 5,
        inventory: { seeds: {}, produce: {}, reservedProduce: {} },
        materials: 'not-an-object',
      },
      messy_gardener: {
        id: 'messy_gardener',
        nickname: 'MessyOne',
        coins: 5,
        inventory: { seeds: {}, produce: {}, reservedProduce: {}, sprinklers: 'three' },
        materials: { copper: 2.9, timber: -4, glass: 'many' },
      },
    },
  };
  fs.writeFileSync(path, JSON.stringify(state), 'utf8');

  const storage = new Storage(path);
  assert.deepEqual(storage.getPlayer('odd_gardener').materials, {});
  const messy = storage.getPlayer('messy_gardener');
  assert.equal(messy.materials.copper, 2); // floored positive integer
  assert.equal(messy.materials.timber, undefined);
  assert.equal(messy.materials.glass, undefined);
  assert.equal(messy.inventory.sprinklers, 0);

  // Machines state with a corrupt status falls back to broken.
  storage.state.machines = { mill: { status: 'haunted', contributed: { copper: 'lots' } } };
  const machines = new MachinesManager(storage);
  assert.equal(machines.isMillRestored(), false);
  assert.equal(machines.getStatus().mill.contributed.copper, 0);
});
