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
          return {
            version: parsed.version || 1,
            players: parsed.players || {},
            gardens: parsed.gardens || {},
            orders: parsed.orders || [],
            trades: parsed.trades || [],
            marketMultipliers: parsed.marketMultipliers || {},
            // Additive fields (crafting/gathering loop); default on read so
            // pre-existing state files load unchanged.
            nodes: isPlainObject(parsed.nodes) ? parsed.nodes : {},
            machines: isPlainObject(parsed.machines) ? parsed.machines : {},
            // Additive field (theater district); normalized on read so a
            // corrupt or missing section defaults to an idle screen.
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
      gardens: {},
      orders: [],
      trades: [],
      marketMultipliers: {},
      nodes: {},
      machines: {},
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

  /**
   * Additive player defaults, applied on every read: gathered materials and
   * crafted-but-unplaced sprinkler kits. Old players without these fields
   * load cleanly; corrupt fields are repaired to safe values.
   */
  normalizePlayer(player) {
    if (!player) return player;
    if (!isPlainObject(player.materials)) player.materials = {};
    for (const key of Object.keys(player.materials)) {
      const count = Number(player.materials[key]);
      if (!Number.isFinite(count) || count <= 0) delete player.materials[key];
      else player.materials[key] = Math.floor(count);
    }
    if (!isPlainObject(player.inventory)) player.inventory = {};
    const sprinklers = Number(player.inventory.sprinklers);
    player.inventory.sprinklers = Number.isFinite(sprinklers) && sprinklers > 0 ? Math.floor(sprinklers) : 0;
    return player;
  }

  getPlayer(id) {
    const player = this.state.players[id] || null;
    return player ? this.normalizePlayer(player) : null;
  }

  savePlayer(player) {
    if (!player || !player.id) return;
    this.normalizePlayer(player);
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

  getTheater() {
    return this.state.theater;
  }

  saveTheater(theater) {
    this.state.theater = theater;
    this.save();
  }
}
