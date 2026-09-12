import fs from 'node:fs';
import path from 'node:path';
import { normalizeTheaterState } from '../shared/theaterModel.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'game-state.json');

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

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
          // Retired gardening/economy sections (gardens, orders, trades,
          // marketMultipliers, nodes, machines) are carried through verbatim:
          // no reader consumes them, but the protected snapshot must never
          // be rewritten with its history dropped. `players` keeps whatever
          // fields a save already has for the same reason.
          return {
            ...parsed,
            version: parsed.version || 1,
            players: isPlainObject(parsed.players) ? parsed.players : {},
            theater: normalizeTheaterState(parsed.theater),
          };
        }
      }
    } catch (err) {
      console.warn('Storage load failed, initializing default state:', err.message);
    }
    return {
      version: 1,
      players: {},
      theater: normalizeTheaterState(undefined),
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

  getTheater() {
    return this.state.theater;
  }

  saveTheater(theater) {
    this.state.theater = theater;
    this.save();
  }
}
