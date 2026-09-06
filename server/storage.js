import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'game-state.json');

export class Storage {
  constructor(filePath = DATA_FILE) {
    this.filePath = filePath;
    this.dir = path.dirname(filePath);
    this.state = this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.dir)) {
        fs.mkdirSync(this.dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            version: parsed.version || 1,
            players: parsed.players || {},
            gardens: parsed.gardens || {},
            orders: parsed.orders || [],
            trades: parsed.trades || [],
            marketMultipliers: parsed.marketMultipliers || {},
          };
        }
      }
    } catch (err) {
      console.warn('Storage load failed, initializing default state:', err.message);
    }
    return {
      version: 1,
      players: {},
      gardens: {},
      orders: [],
      trades: [],
      marketMultipliers: {},
    };
  }

  save() {
    try {
      if (!fs.existsSync(this.dir)) {
        fs.mkdirSync(this.dir, { recursive: true });
      }
      const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.state, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('Storage atomic write error:', err.message);
    }
  }

  getPlayer(id) {
    return this.state.players[id] || null;
  }

  savePlayer(player) {
    if (!player || !player.id) return;
    this.state.players[player.id] = player;
    this.save();
  }

  getGarden(playerId) {
    return this.state.gardens[playerId] || null;
  }

  saveGarden(playerId, gardenData) {
    if (!playerId) return;
    this.state.gardens[playerId] = gardenData;
    this.save();
  }
}
