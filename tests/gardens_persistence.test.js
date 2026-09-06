import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../server/storage.js';
import { GardensManager } from '../server/gardens.js';
import { GROWTH_STAGES } from '../shared/crops.js';

test('gardens manager mutates beds and persists state to storage', () => {
  const tempPath = `/tmp/test-garden-persistence-${Date.now()}.json`;
  const storage = new Storage(tempPath);
  const manager = new GardensManager(storage);

  const playerId = 'gardener_persist_1';
  const initial = manager.getOrCreateGarden(playerId);
  assert.equal(initial.beds.length, 12);
  assert.equal(initial.beds[0].stage, GROWTH_STAGES.EMPTY);

  // Till bed 0
  const tillRes = manager.handleAction(playerId, { action: 'till', bedIndex: 0 });
  assert.equal(tillRes.success, true);
  assert.equal(tillRes.beds[0].stage, GROWTH_STAGES.PREPARED);

  // Plant radish in bed 0
  const plantRes = manager.handleAction(playerId, {
    action: 'plant',
    bedIndex: 0,
    seedCropId: 'radish',
  });
  assert.equal(plantRes.success, true);
  assert.equal(plantRes.beds[0].cropId, 'radish');
  assert.equal(plantRes.beds[0].stage, GROWTH_STAGES.SEED);

  // Water bed 0
  const waterRes = manager.handleAction(playerId, { action: 'water', bedIndex: 0 });
  assert.equal(waterRes.success, true);
  assert.equal(waterRes.beds[0].moisture, 1.0);

  // Simulate server restart by creating a new Storage instance pointing to the same file
  const storageRestart = new Storage(tempPath);
  const managerRestart = new GardensManager(storageRestart);
  const restoredGarden = managerRestart.getOrCreateGarden(playerId);

  assert.equal(restoredGarden.beds[0].cropId, 'radish');
  assert.equal(restoredGarden.beds[0].prepared, true);
  assert.equal(restoredGarden.beds[0].stage, GROWTH_STAGES.SEED);
  assert.equal(restoredGarden.beds[0].moisture, 1.0);
});

test('garden tick handles moisture decay and advances crop growth stages', () => {
  const tempPath = `/tmp/test-garden-tick-${Date.now()}.json`;
  const storage = new Storage(tempPath);
  const manager = new GardensManager(storage);

  const playerId = 'gardener_persist_2';
  manager.getOrCreateGarden(playerId);
  manager.handleAction(playerId, { action: 'till', bedIndex: 1 });
  manager.handleAction(playerId, { action: 'plant', bedIndex: 1, seedCropId: 'radish' });
  manager.handleAction(playerId, { action: 'water', bedIndex: 1 });

  const garden = manager.getOrCreateGarden(playerId);
  const plantedBed = garden.beds[1];
  // Artificially advance plantedAt by 30 seconds (radish duration is 25s)
  plantedBed.plantedAt = Date.now() - 30 * 1000;

  manager.tick(1.0, false);
  assert.equal(plantedBed.stage, GROWTH_STAGES.HARVESTABLE);

  // Harvest
  const harvestRes = manager.handleAction(playerId, { action: 'harvest', bedIndex: 1 });
  assert.equal(harvestRes.success, true);
  assert.equal(harvestRes.yield, 2);
  assert.ok(['A+', 'A', 'B'].includes(harvestRes.quality));
});
