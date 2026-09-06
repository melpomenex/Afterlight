import { createInitialBeds, tillBed, plantBed, waterBed, tickBed, harvestBed } from '../shared/gardenModel.js';

export class GardensManager {
  constructor(storage) {
    this.storage = storage;
    this.gardens = new Map(); // playerId -> { beds, lastTick }
  }

  getOrCreateGarden(playerId) {
    if (this.gardens.has(playerId)) {
      return this.gardens.get(playerId);
    }

    const saved = this.storage.getGarden(playerId);
    const beds = saved && Array.isArray(saved.beds) ? saved.beds : createInitialBeds(12);
    const gardenData = {
      ownerId: playerId,
      beds,
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
    }

    if (result.success) {
      this.storage.saveGarden(playerId, { beds: garden.beds });
    }

    return { ...result, beds: garden.beds };
  }

  tick(dtSeconds, isRaining = false) {
    const now = Date.now();
    for (const [playerId, garden] of this.gardens.entries()) {
      let changed = false;
      for (const bed of garden.beds) {
        const oldStage = bed.stage;
        tickBed(bed, dtSeconds, isRaining, now);
        if (bed.stage !== oldStage) {
          changed = true;
        }
      }
      if (changed) {
        this.storage.saveGarden(playerId, { beds: garden.beds });
      }
    }
  }
}
