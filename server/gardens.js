import { createInitialBeds, tillBed, plantBed, waterBed, tickBed, harvestBed, sprinklerCoverage } from '../shared/gardenModel.js';
import { SPRINKLER } from '../shared/materials.js';

export class GardensManager {
  constructor(storage) {
    this.storage = storage;
    this.gardens = new Map(); // playerId -> { beds, fixtures, lastTick }
  }

  getOrCreateGarden(playerId) {
    if (this.gardens.has(playerId)) {
      return this.gardens.get(playerId);
    }

    const saved = this.storage.getGarden(playerId);
    const beds = saved && Array.isArray(saved.beds) ? saved.beds : createInitialBeds(12);
    // Sprinkler fixtures are additive on the saved garden; older gardens
    // without them load cleanly as empty.
    const fixtures = saved && Array.isArray(saved.fixtures)
      ? saved.fixtures.filter(f => f && Number.isInteger(f.bedIndex) && f.bedIndex >= 0 && f.bedIndex < beds.length)
      : [];
    const gardenData = {
      ownerId: playerId,
      beds,
      fixtures,
      lastTick: Date.now(),
    };
    this.gardens.set(playerId, gardenData);
    return gardenData;
  }

  handleAction(playerId, { action, bedIndex, seedCropId }) {
    const garden = this.getOrCreateGarden(playerId);
    const bed = garden.beds[bedIndex];
    if (!bed) {
      return { success: false, reason: 'bed_not_found' };
    }

    const now = Date.now();
    let result = { success: false };

    if (action === 'till') {
      result = tillBed(bed);
    } else if (action === 'plant') {
      result = plantBed(bed, seedCropId, now);
    } else if (action === 'water') {
      result = waterBed(bed, now);
    } else if (action === 'harvest') {
      result = harvestBed(bed, now);
    } else if (action === 'place_sprinkler') {
      result = this.placeSprinkler(garden, bedIndex);
    }

    if (result.success) {
      this.storage.saveGarden(playerId, { beds: garden.beds, fixtures: garden.fixtures });
    }

    return { ...result, beds: garden.beds, fixtures: garden.fixtures };
  }

  placeSprinkler(garden, bedIndex) {
    if (garden.fixtures.some(f => f.bedIndex === bedIndex)) {
      return { success: false, reason: 'fixture_already_present' };
    }
    if (garden.fixtures.length >= SPRINKLER.maxPerGarden) {
      return { success: false, reason: 'sprinkler_limit_reached' };
    }
    garden.fixtures.push({ type: SPRINKLER.id, bedIndex });
    return { success: true };
  }

  tick(dtSeconds, isRaining = false) {
    const now = Date.now();
    for (const [playerId, garden] of this.gardens.entries()) {
      let changed = false;
      // Sprinkler coverage: occupied bed plus orthogonal grid neighbors.
      const covered = new Set();
      for (const fixture of garden.fixtures) {
        for (const idx of sprinklerCoverage(fixture.bedIndex)) {
          if (garden.beds[idx]) covered.add(idx);
        }
      }
      for (const bed of garden.beds) {
        const oldStage = bed.stage;
        tickBed(bed, dtSeconds, isRaining, now, covered.has(bed.index));
        if (bed.stage !== oldStage) {
          changed = true;
        }
      }
      if (changed) {
        this.storage.saveGarden(playerId, { beds: garden.beds, fixtures: garden.fixtures });
      }
    }
  }
}
