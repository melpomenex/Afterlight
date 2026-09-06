import fs from 'node:fs';
import path from 'node:path';
import {
  IPTV_LIMITS,
  applyAddPlaylist,
  applyRemoveList,
  applySetEpg,
  catalogSnapshot,
  normalizeEpg,
  normalizeIptvLibrary,
} from '../shared/iptvModel.js';
import { createEpgIndex, lookupNowNext } from '../shared/xmltv.js';

/**
 * Server-side home of the shared Orpheum channel library and program guide
 * (mirrors TheaterManager's thin-manager style). Every rule — limits,
 * sanitizing, catalog snapshots — lives in shared/iptvModel.js + shared/
 * xmltv.js so client, server, and tests run the same code; this class only
 * holds state, owns its persistence files, and answers lookups.
 *
 * Deliberately NOT part of server/storage.js's game-state.json: that file
 * is rewritten whole on every save, and a multi-megabyte guide would ride
 * along on every unrelated persist. Both files below are written atomically
 * and only when an upload/removal succeeds.
 *
 * Nothing here invents content: a fresh install starts with an empty
 * library and no guide, and only player uploads fill them.
 */
export class IptvManager {
  constructor(dataDir = path.resolve(process.cwd(), 'data')) {
    this.dir = dataDir;
    this.libraryPath = path.join(this.dir, 'iptv.json');
    this.epgPath = path.join(this.dir, 'epg.json');
    this.library = normalizeIptvLibrary(this.readJson(this.libraryPath));
    this.epg = normalizeEpg(this.readJson(this.epgPath));
    this.epgIndex = createEpgIndex(this.epg);
  }

  /** Missing/corrupt file -> null (the caller normalizes), never a throw. */
  readJson(filePath) {
    try {
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.warn(`IptvManager could not read ${filePath}, starting empty:`, err.message);
      return null;
    }
  }

  /** Atomic write (tmp + rename), same durability pattern as Storage. */
  writeJson(filePath, value) {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const tmpPath = `${filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(value), 'utf8');
      fs.renameSync(tmpPath, filePath);
      return true;
    } catch (err) {
      console.error(`IptvManager write failed for ${filePath}:`, err.message);
      return false;
    }
  }

  /** Payload for IPTV_STATE broadcasts and WELCOME/join snapshots. */
  snapshot() {
    return catalogSnapshot({ lists: this.library.lists, epg: this.epg });
  }

  /** Channels of one shared list, for on-demand pulls; null if unknown. */
  listChannels(listId) {
    const list = this.library.lists.find((l) => l.id === listId);
    return list ? list.channels : null;
  }

  /** Bounded now/next schedule lookup for guide keys (tvg-ids or names). */
  lookupEpg(keys, atMs = Date.now()) {
    return lookupNowNext(this.epgIndex, keys, atMs, IPTV_LIMITS.EPG_LOOKUP_MAX);
  }

  /** Apply an uploaded playlist (text already fetched). Persists on success. */
  addPlaylist({ name, text, addedBy } = {}, nowMs = Date.now()) {
    const { library, error, list } = applyAddPlaylist(this.library, { name, text, addedBy }, nowMs);
    if (error) return { success: false, reason: error };
    this.library = library;
    if (!this.writeJson(this.libraryPath, this.library)) {
      // Roll back the in-memory change so memory and disk stay consistent.
      this.library = normalizeIptvLibrary(this.readJson(this.libraryPath));
      return { success: false, reason: 'persist_failed' };
    }
    return { success: true, list };
  }

  /** Remove a shared list (communal control — no ownership checks). */
  removeList(listId) {
    const { library, error } = applyRemoveList(this.library, listId);
    if (error) return { success: false, reason: error };
    const previous = this.library;
    this.library = library;
    if (!this.writeJson(this.libraryPath, this.library)) {
      this.library = previous;
      return { success: false, reason: 'persist_failed' };
    }
    return { success: true };
  }

  /**
   * Make a freshly parsed guide the active one (replaces any previous).
   * Persists and rebuilds the in-memory lookup index.
   */
  setEpg({ name, channels, programmes } = {}, nowMs = Date.now()) {
    const { epg } = applySetEpg({ name, channels, programmes }, nowMs);
    const previous = this.epg;
    this.epg = epg;
    this.epgIndex = createEpgIndex(this.epg);
    if (!this.writeJson(this.epgPath, this.epg)) {
      this.epg = previous;
      this.epgIndex = createEpgIndex(this.epg);
      return { success: false, reason: 'persist_failed' };
    }
    return { success: true, summary: catalogSnapshot({ lists: this.library.lists, epg: this.epg }).epg };
  }
}
