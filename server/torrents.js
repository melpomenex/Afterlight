import fs from 'node:fs';
import path from 'node:path';
import {
  TORRENT_LIMITS,
  isVideoFile,
  orderFilesForPicker,
  parseMagnet,
} from '../shared/torrentModel.js';
import { verifyTorrentGrant, redactGrantQuery } from '../shared/torrentGrant.js';

export { verifyTorrentGrant, redactGrantQuery };

/**
 * Parse an HTTP Range header against a known total size. Returns
 * `{ start, end }` (inclusive byte positions) or null when the header is
 * absent, unsatisfiable, or malformed (the caller answers 200 or 416).
 */
export function parseRange(rangeHeader, total) {
  if (typeof rangeHeader !== 'string' || !total || !Number.isFinite(total)) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!m) return null;
  const [, rawStart, rawEnd] = m;
  if (rawStart === '' && rawEnd === '') return null;
  let start;
  let end;
  if (rawStart === '') {
    // suffix range: last N bytes
    const suffix = Number(rawEnd);
    if (!Number.isInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(rawStart);
    if (!Number.isInteger(start) || start < 0 || start >= total) return null;
    end = rawEnd === '' ? total - 1 : Number(rawEnd);
    if (!Number.isInteger(end) || end < start) return null;
    end = Math.min(end, total - 1);
  }
  return { start, end };
}

const INFOHASH_RE = /^[0-9a-f]{40}$/;
const CONTENT_TYPES = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
};

/**
 * Server-side home of the Orpheum's torrent engine (mirrors IptvManager's
 * owning-manager style). Wraps a webtorrent client: resolving magnets to
 * file lists, streaming the chosen file (Range-capable), and a bounded,
 * disposable download cache. All validation rules live in
 * shared/torrentModel.js; this class holds state and touches disk/network.
 *
 * The webtorrent module is imported lazily so a broken install degrades to
 * a clear "engine unavailable" error instead of preventing server boot —
 * the same posture as the IRC listener failing to bind its port.
 *
 * `clientFactory` is injectable for tests (a webtorrent-shaped stub).
 */
export class TorrentManager {
  constructor({
    dataDir = path.resolve(process.cwd(), 'data'),
    cacheDir = process.env.TORRENT_CACHE_DIR || null,
    maxCacheBytes = null,
    clientFactory = null,
  } = {}) {
    this.cacheDir = cacheDir || path.join(dataDir, 'torrents');
    this.maxCacheBytes = maxCacheBytes
      ?? (Number(process.env.TORRENT_CACHE_MAX_BYTES) || TORRENT_LIMITS.CACHE_MAX_BYTES_DEFAULT);
    this.clientFactory = clientFactory;
    this.client = null;          // lazy webtorrent client (or injected stub)
    this.engineBroken = false;   // module import failed; every call answers unavailable
    // infohash -> Promise<torrent>: concurrent ensureTorrent calls share one add
    this.pendingAdds = new Map();
    /**
     * Optional (infohash) -> magnet lookup wired by the server: the shared
     * bill is the canonical magnet source, so a stream request can revive a
     * torrent after a restart even when this manager's library.json is gone.
     */
    this.magnetResolver = null;
    /** Advisory exempt-from-reap set pushed by Phoenix BillSync. */
    this.exemptInfohashes = new Set();
    // infohash -> { infohash, magnet, torrent, name, lastServedMs, addedMs }
    this.entries = new Map();
    this.sweepStartup();
  }

  /** Human-readable reason string; used for ERROR messages to clients. */
  unavailableReason() {
    return 'engine_unavailable';
  }

  /**
   * Wire the canonical magnet lookup (the shared theater bill). Called by
   * the server after both managers exist; keeps the stream endpoint able to
   * revive torrent items after a restart with no persisted library file.
   */
  setMagnetResolver(resolver) {
    this.magnetResolver = typeof resolver === 'function' ? resolver : null;
  }

  /** Replace the Phoenix-pushed exempt-from-reap infohash set (idempotent). */
  setExemptInfohashes(infohashes) {
    const next = new Set();
    for (const raw of infohashes || []) {
      const hash = String(raw || '').toLowerCase();
      if (INFOHASH_RE.test(hash)) next.add(hash);
    }
    this.exemptInfohashes = next;
  }

  referencedSet(referencedInfohashes) {
    const referenced = new Set(referencedInfohashes || []);
    for (const hash of this.exemptInfohashes) referenced.add(hash);
    return referenced;
  }

  /**
   * Lazily import and start the webtorrent client. Resolves null when the
   * engine cannot be used (module missing) — callers answer a readable
   * error rather than crashing the server.
   */
  async ensureEngine() {
    if (this.client) return this.client;
    if (this.engineBroken) return null;
    try {
      const mod = await import('webtorrent');
      const WebTorrent = mod.default ?? mod;
      this.client = this.clientFactory
        ? this.clientFactory()
        : new WebTorrent();
      this.client.on?.('error', (err) => {
        console.warn('TorrentManager: client error:', err?.message || err);
      });
      return this.client;
    } catch (err) {
      this.engineBroken = true;
      console.warn('TorrentManager: webtorrent unavailable, torrent features disabled:', err?.message || err);
      return null;
    }
  }

  /** Load the persisted magnet library and clean malformed cache junk. */
  sweepStartup() {
    try {
      const raw = fs.readFileSync(this.libraryPath(), 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [infohash, magnet] of Object.entries(parsed)) {
          if (INFOHASH_RE.test(infohash) && parseMagnet(magnet)) {
            this.entries.set(infohash, {
              infohash, magnet, torrent: null, name: null,
              lastServedMs: 0, addedMs: 0,
            });
          }
        }
      }
    } catch {
      // missing/corrupt library: start empty
    }
    // Drop cache directories that are not valid infohashes (orphans).
    try {
      for (const name of fs.readdirSync(this.cacheDir)) {
        if (!INFOHASH_RE.test(name)) {
          fs.rmSync(path.join(this.cacheDir, name), { recursive: true, force: true });
        }
      }
    } catch {}
  }

  libraryPath() {
    return path.join(this.cacheDir, 'library.json');
  }

  /** Persist infohash -> magnet so the stream endpoint can re-add after a restart. */
  persistLibrary() {
    try {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      const map = {};
      for (const entry of this.entries.values()) {
        if (entry.magnet) map[entry.infohash] = entry.magnet;
      }
      const tmp = `${this.libraryPath()}.tmp.${Date.now()}`;
      fs.writeFileSync(tmp, JSON.stringify(map), 'utf8');
      fs.renameSync(tmp, this.libraryPath());
    } catch (err) {
      console.warn('TorrentManager: could not persist magnet library:', err.message);
    }
  }

  /**
   * Resolve a magnet to its metadata + picker file list. Rejects with
   * `{ reason }` ('invalid_magnet' | 'engine_unavailable' |
   * 'resolve_timeout' | 'resolve_failed'). The torrent is added with all
   * files deselected (`deselect: true`); streaming selects on demand.
   */
  async resolve(rawMagnet) {
    const magnet = parseMagnet(rawMagnet);
    if (!magnet) return Promise.reject({ reason: 'invalid_magnet' });
    const client = await this.ensureEngine();
    if (!client) return Promise.reject({ reason: this.unavailableReason() });

    const existing = this.entries.get(magnet.infohash);
    if (existing?.torrent?.info) {
      existing.lastServedMs = Date.now();
      return this.pickerSnapshot(existing);
    }
    const torrent = await this.ensureTorrent(magnet.url, magnet.infohash, TORRENT_LIMITS.RESOLVE_TIMEOUT_MS);
    const entry = this.entries.get(magnet.infohash);
    entry.torrent = torrent;
    entry.name = torrent.name || null;
    entry.lastServedMs = Date.now();
    this.persistLibrary();
    return this.pickerSnapshot(entry);
  }

  /** File list for the picker (ordered, capped, playable-flagged). */
  pickerSnapshot(entry) {
    const files = (entry.torrent?.files || []).map((file, index) => ({
      index,
      path: file.path,
      length: file.length,
    }));
    return {
      infohash: entry.infohash,
      name: entry.torrent?.name || entry.name || 'Unnamed torrent',
      files: orderFilesForPicker(files),
    };
  }

  /**
   * Ensure a torrent object is active for `infohash`, adding it if needed
   * and waiting for metadata. Rejects { reason } on timeout/failure.
   * Concurrent callers for the same infohash share one add.
   */
  async ensureTorrent(magnetUri, infohash, timeoutMs) {
    const existing = this.entries.get(infohash);
    if (existing?.torrent) return existing.torrent;
    const client = this.client;
    if (!client) return Promise.reject({ reason: 'engine_unavailable' });
    if (this.pendingAdds.has(infohash)) return this.pendingAdds.get(infohash);

    // Already hot in the client (e.g. re-streaming after a bookkeeping gap)?
    // v3's client.get is async; undefined stubs simply fall through.
    try {
      const hot = await client.get?.(infohash);
      if (hot) {
        const entry = existing || {
          infohash, magnet: magnetUri, torrent: hot, name: hot.name || null,
          lastServedMs: 0, addedMs: Date.now(),
        };
        entry.torrent = hot;
        this.entries.set(infohash, entry);
        return hot;
      }
    } catch {}
    // Another caller may have finished an add while we awaited get().
    if (this.entries.get(infohash)?.torrent) return this.entries.get(infohash).torrent;
    if (this.pendingAdds.has(infohash)) return this.pendingAdds.get(infohash);

    const entry = existing || {
      infohash, magnet: magnetUri, torrent: null, name: null,
      lastServedMs: 0, addedMs: Date.now(),
    };
    this.entries.set(infohash, entry);

    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject({ reason: 'resolve_timeout' });
      }, Math.max(1000, timeoutMs));

      const cleanup = () => {
        clearTimeout(timer);
        torrent.removeListener('ready', onReady);
        torrent.removeListener('error', onError);
        this.pendingAdds.delete(infohash);
      };

      // webtorrent v3: add() returns the torrent synchronously and reports
      // readiness/failure via its own events — there is no error-first
      // callback (that was the v2 API). `deselect: true` is required for the
      // documented add-deselected behavior: without it v3 selects the whole
      // torrent once metadata is ready (lib/torrent.js `_startAsDeselected`),
      // so a picked episode dragged the entire archive down from the swarm.
      // Streaming re-selects only the chosen file (and ranged pieces).
      const torrent = client.add(magnetUri, {
        path: path.join(this.cacheDir, infohash),
        deselect: true,
      });
      const onReady = () => {
        cleanup();
        entry.torrent = torrent;
        resolve(torrent);
      };
      const onError = (err) => {
        cleanup();
        entry.torrent = null;
        console.warn(`TorrentManager: torrent ${infohash.slice(0, 8)} failed:`, err?.message || err);
        reject({ reason: 'resolve_failed' });
      };
      torrent.once('ready', onReady);
      torrent.once('error', onError);
    });
    this.pendingAdds.set(infohash, promise);
    return promise;
  }

  /**
   * Open a read stream for one file of one torrent, Range-aware. Returns
   * `{ statusCode, headers, stream }`, or `{ statusCode }` (404/416/503)
   * when the file cannot be served. `rangeHeader` may be null.
   */
  async streamFile(infohash, fileIndex, rangeHeader) {
    if (!INFOHASH_RE.test(String(infohash || ''))) return { statusCode: 404, reason: 'stream_404' };
    const idx = Number(fileIndex);
    if (!Number.isInteger(idx) || idx < 0) return { statusCode: 404, reason: 'stream_404' };
    const client = await this.ensureEngine();
    if (!client) return { statusCode: 503, reason: 'engine_unavailable' };

    const entry = this.entries.get(infohash);
    if (!entry?.magnet && this.magnetResolver) {
      // The bill is the canonical magnet source: revive the entry from it
      // (covers a lost/missing library.json after a restart).
      const magnet = this.magnetResolver(infohash);
      if (magnet && parseMagnet(magnet)) {
        const revived = {
          infohash, magnet, torrent: null, name: null,
          lastServedMs: Date.now(), addedMs: Date.now(),
        };
        this.entries.set(infohash, revived);
        this.persistLibrary();
        return this.streamFile(infohash, idx, rangeHeader); // retry with the entry in place
      }
    }
    if (!entry?.magnet) return { statusCode: 404, reason: 'stream_404' };

    let torrent = entry.torrent;
    if (!torrent?.info) {
      try {
        torrent = await this.ensureTorrent(
          entry.magnet, infohash, TORRENT_LIMITS.STREAM_METADATA_TIMEOUT_MS,
        );
        entry.torrent = torrent;
      } catch (err) {
        return err?.reason === 'resolve_timeout'
          ? { statusCode: 504, reason: 'metadata_timeout' }
          : { statusCode: 404, reason: 'stream_404' };
      }
    }

    const file = torrent.files?.[idx];
    if (!file || !isVideoFile(file.path)) return { statusCode: 404, reason: 'stream_404' };

    const total = file.length;
    const range = parseRange(rangeHeader, total);
    if (rangeHeader && !range) return { statusCode: 416, reason: 'stream_416' };

    // Streaming selects the file; everything else stays deselected so a
    // picked episode does not drag the whole archive down from the swarm.
    try {
      file.select();
    } catch {}

    const opts = range ? { start: range.start, end: range.end } : {};
    let stream;
    try {
      stream = file.createReadStream(opts);
    } catch {
      return { statusCode: 500, reason: 'stream_error' };
    }
    entry.lastServedMs = Date.now();

    const ext = (/\.([a-z0-9]+)$/i.exec(file.path)?.[1] || '').toLowerCase();
    const headers = {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      'Content-Length': range ? range.end - range.start + 1 : total,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    };
    if (range) {
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${total}`;
      return { statusCode: 206, headers, stream };
    }
    return { statusCode: 200, headers, stream };
  }

  /** Swarm status snapshots for the periodic TORRENT_STATE broadcast. */
  status() {
    const items = [];
    for (const entry of this.entries.values()) {
      const torrent = entry.torrent;
      if (!torrent) continue;
      items.push({
        infohash: entry.infohash,
        progress: Number.isFinite(torrent.progress) ? torrent.progress : 0,
        peers: Number.isInteger(torrent.numPeers) ? torrent.numPeers : 0,
        downloaded: Number.isFinite(torrent.downloaded) ? torrent.downloaded : 0,
        ready: !!torrent.info,
      });
    }
    return items;
  }

  /**
   * Lifecycle tick (run from the server's existing 1 Hz interval):
   * destroy torrents idle beyond the reap window unless their infohash is
   * referenced by the live bill, then enforce the disk cap by evicting the
   * least-recently-served inactive entries (data + torrent, never the
   * playing item). `nowMs` is injectable for tests.
   */
  async tick(referencedInfohashes, nowMs = Date.now()) {
    const referenced = this.referencedSet(referencedInfohashes);
    const reapable = [];
    for (const entry of this.entries.values()) {
      if (referenced.has(entry.infohash)) continue;
      // The TTL is what matters: anything unreferenced by the bill for the
      // idle window is torn down (lingering peers don't keep it alive —
      // seeding stops once the room moves on).
      const idleFor = nowMs - (entry.lastServedMs || entry.addedMs || 0);
      if (entry.torrent && idleFor >= TORRENT_LIMITS.IDLE_REAP_MS) {
        reapable.push(entry);
      }
    }
    for (const entry of reapable) {
      await this.dropTorrent(entry, { keepData: true });
    }
    if (reapable.length) this.persistLibrary();
    await this.enforceCacheCap(referenced);
  }

  /** Destroy one torrent. `keepData` false also removes its files. */
  async dropTorrent(entry, { keepData }) {
    const torrent = entry.torrent;
    entry.torrent = null;
    if (torrent) {
      const opts = { destroyStore: !keepData };
      entry.lastDestroyOpts = opts; // observable for tests
      try {
        await new Promise((resolve) => torrent.destroy(opts, resolve));
      } catch {}
    }
    if (!keepData) {
      try {
        fs.rmSync(path.join(this.cacheDir, entry.infohash), { recursive: true, force: true });
      } catch {}
    }
  }

  /**
   * Keep cached bytes under the cap by evicting least-recently-served
   * inactive entries. Sizes are on-disk byte counts per infohash directory.
   */
  async enforceCacheCap(referencedInfohashes) {
    const referenced = this.referencedSet(referencedInfohashes);
    const sizes = [];
    let total = 0;
    try {
      for (const name of fs.readdirSync(this.cacheDir)) {
        if (!INFOHASH_RE.test(name)) continue;
        const size = this.dirSize(path.join(this.cacheDir, name));
        total += size;
        sizes.push({ infohash: name, size });
      }
    } catch {
      return; // no readable cache dir: nothing to evict
    }
    if (total <= this.maxCacheBytes) return;

    const evictable = sizes
      .filter((s) => !referenced.has(s.infohash))
      .map((s) => ({ ...s, lastServedMs: this.entries.get(s.infohash)?.lastServedMs || 0 }))
      .sort((a, b) => a.lastServedMs - b.lastServedMs);
    for (const victim of evictable) {
      if (total <= this.maxCacheBytes) break;
      const entry = this.entries.get(victim.infohash);
      if (entry?.torrent) continue; // safety: never evict a live torrent
      try {
        fs.rmSync(path.join(this.cacheDir, victim.infohash), { recursive: true, force: true });
        total -= victim.size;
      } catch {}
    }
  }

  dirSize(dir) {
    let total = 0;
    try {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const stat = fs.statSync(p);
        total += stat.isDirectory() ? this.dirSize(p) : stat.size;
      }
    } catch {}
    return total;
  }

  /** Shut the engine down (server close). */
  async close() {
    const client = this.client;
    this.client = null;
    if (!client) return;
    await new Promise((resolve) => {
      try {
        client.destroy(resolve);
      } catch {
        resolve();
      }
    });
  }
}
