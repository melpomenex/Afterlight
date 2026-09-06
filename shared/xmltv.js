/**
 * Pure XMLTV (electronic program guide) parsing and lookup.
 *
 * Side-effect free so the server (parse an upload, answer now/next lookups)
 * and the tests run the exact same code, mirroring shared/theaterModel.js.
 * No XML dependency: XMLTV files are flat, machine-generated lists of
 * <channel> and <programme> blocks, so a tolerant scanner over that small
 * grammar handles real-world guides (tens of MB) without pulling in a
 * general-purpose XML parser.
 *
 * Parsed guide shape (what gets persisted and shared):
 *   {
 *     channels:   { [xmltvId]: { names: [string], icon: string|null } },
 *     programmes: { [xmltvId]: [[startMs, stopMs, title, desc?], ...] }, // sorted by start
 *     skipped, truncated, recognized,
 *   }
 */

/** Decode the handful of XML entities real guides actually use. */
export function decodeEntities(text) {
  return String(text ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeFromCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCode(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function safeFromCode(code) {
  try {
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  } catch {
    return '';
  }
}

/** Index of the '>' closing the tag that opens at `start`, honoring quotes. */
function tagEnd(text, start) {
  let quote = null;
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '>') {
      return i;
    }
  }
  return -1;
}

function extractAttr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  if (!m) return null;
  return decodeEntities(m[1] ?? m[2] ?? '').trim() || null;
}

/** First <tag>…</tag> inner text within `block`, whitespace-collapsed. */
function extractInner(block, tag) {
  const open = block.indexOf(`<${tag}`);
  if (open === -1) return null;
  const gt = block.indexOf('>', open);
  if (gt === -1) return null;
  const close = block.indexOf(`</${tag}>`, gt);
  if (close === -1) return null;
  return decodeEntities(block.slice(gt + 1, close).replace(/\s+/g, ' ').trim()) || null;
}

/** All <tag>…</tag> inner texts, in order (display-name repeats legally). */
function extractAllInner(block, tag) {
  const out = [];
  let from = 0;
  for (;;) {
    const open = block.indexOf(`<${tag}`, from);
    if (open === -1) break;
    const gt = block.indexOf('>', open);
    if (gt === -1) break;
    const close = block.indexOf(`</${tag}>`, gt);
    if (close === -1) break;
    const value = decodeEntities(block.slice(gt + 1, close).replace(/\s+/g, ' ').trim());
    if (value) out.push(value);
    from = close + tag.length + 3;
  }
  return out;
}

/**
 * Parse an XMLTV timestamp (`YYYYMMDDHHMMSS [+-]HHMM` — seconds and the
 * timezone are optional) into epoch ms. Times are stored in UTC ms; the
 * client renders them in the viewer's local timezone.
 */
export function parseXmltvTime(value) {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?:\d{2})?(?:\s*([+-])(\d{2}):?(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, sign, oh, om] = m;
  let ms = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  if (sign) {
    const minutes = (+oh) * 60 + (+om);
    ms -= sign === '-' ? -minutes * 60000 : minutes * 60000;
  }
  return Number.isFinite(ms) ? ms : null;
}

const DESC_MAX = 200;

const yieldNow = () =>
  new Promise((resolve) => {
    if (typeof setImmediate === 'function') setImmediate(resolve);
    else setTimeout(resolve, 0);
  });

/**
 * Parse XMLTV text into a compact guide. Tolerant by contract: blocks with
 * missing/malformed fields are skipped and counted, never fatal. `opts` may
 * cap { maxChannels, maxProgrammes } — content beyond a cap marks
 * `truncated` and parsing stops early. Yields to the event loop between
 * batches so a large upload never stalls the server. `recognized` is false
 * when the text does not look like XMLTV at all.
 */
export async function parseXmltv(text, opts = {}) {
  const maxChannels = Number.isFinite(opts.maxChannels) ? opts.maxChannels : Infinity;
  const maxProgrammes = Number.isFinite(opts.maxProgrammes) ? opts.maxProgrammes : Infinity;
  const channels = {};
  const programmes = {};
  let channelCount = 0;
  let programmeCount = 0;
  let skipped = 0;
  let truncated = false;
  let seenBlocks = 0;

  if (typeof text !== 'string' || text.length < 12) {
    return { channels, programmes, skipped, truncated, recognized: false };
  }

  const addProgramme = (id, entry) => {
    if (!programmes[id]) programmes[id] = [];
    programmes[id].push(entry);
    programmeCount++;
  };

  const handleBlock = (kind, block) => {
    seenBlocks++;
    if (kind === 'channel') {
      if (channelCount >= maxChannels) {
        truncated = true;
        return;
      }
      const tag = block.slice(0, block.indexOf('>') + 1);
      const id = extractAttr(tag, 'id');
      if (!id) {
        skipped++;
        return;
      }
      const names = extractAllInner(block, 'display-name');
      const icon = extractAttr(block.match(/<icon\b[^>]*>/i)?.[0] || '', 'src');
      channels[id] = { names: names.slice(0, 6), icon };
      channelCount++;
      return;
    }
    if (programmeCount >= maxProgrammes) {
      truncated = true;
      return;
    }
    const tag = block.slice(0, block.indexOf('>') + 1);
    const id = extractAttr(tag, 'channel');
    const start = parseXmltvTime(extractAttr(tag, 'start'));
    const stop = parseXmltvTime(extractAttr(tag, 'stop'));
    if (!id || start === null || stop === null || stop <= start) {
      skipped++;
      return;
    }
    const title = extractInner(block, 'title');
    if (!title) {
      skipped++;
      return;
    }
    const desc = extractInner(block, 'desc');
    addProgramme(id, desc && desc.length <= DESC_MAX ? [start, stop, title, desc] : [start, stop, title]);
  };

  let pos = text.indexOf('<tv', 0);
  pos = text.indexOf('<', Math.max(pos, 0));
  while (pos !== -1 && !truncated) {
    const isChannel = text.startsWith('<channel', pos);
    const isProgramme = !isChannel && text.startsWith('<programme', pos);
    if (!isChannel && !isProgramme) {
      pos = text.indexOf('<', pos + 1);
      continue;
    }
    const closeTag = isChannel ? '</channel>' : '</programme>';
    const openEnd = text.indexOf('>', pos);
    const closeIdx = openEnd === -1 ? -1 : text.indexOf(closeTag, openEnd);
    if (closeIdx === -1) {
      skipped++; // unterminated block: tolerate and stop scanning this path
      break;
    }
    handleBlock(isChannel ? 'channel' : 'programme', text.slice(pos, closeIdx + closeTag.length));
    pos = text.indexOf('<', closeIdx + closeTag.length);
    if ((seenBlocks & 0xfff) === 0) await yieldNow(); // every 4096 blocks
  }

  // Sort each channel's programmes for the binary search in nowNext lookups.
  for (const arr of Object.values(programmes)) arr.sort((a, b) => a[0] - b[0]);

  const recognized =
    channelCount + programmeCount > 0 || /<tv[\s>]/i.test(text.slice(0, 2000));
  return { channels, programmes, skipped, truncated, recognized };
}

/**
 * Normalize a channel name/id for fallback matching: case- and
 * punctuation-insensitive. Non-latin names that normalize to nothing keep
 * their lowercased original instead of collapsing into one empty key.
 */
export function normalizeChannelKey(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  const key = raw.replace(/[^a-z0-9]+/g, '');
  return key || raw;
}

/**
 * Build the lookup index the server keeps in memory: xmltvId -> sorted
 * programmes, plus a normalized-name -> xmltvId map for playlist entries
 * that carry no tvg-id.
 */
export function createEpgIndex(epg) {
  const byId = new Map();
  const byName = new Map();
  const channels = epg?.channels && typeof epg.channels === 'object' ? epg.channels : {};
  const programmes = epg?.programmes && typeof epg.programmes === 'object' ? epg.programmes : {};
  for (const [id, arr] of Object.entries(programmes)) {
    if (Array.isArray(arr) && arr.length > 0) byId.set(id, arr);
  }
  for (const [id, ch] of Object.entries(channels)) {
    if (!Array.isArray(ch?.names)) continue;
    for (const name of ch.names) {
      const key = normalizeChannelKey(name);
      if (key && !byName.has(key)) byName.set(key, id);
    }
  }
  return { byId, byName };
}

/**
 * Resolve a guide key — a playlist entry's tvg-id, or its display name — to
 * an xmltv channel id. Exact id match first, normalized-name fallback next.
 */
export function resolveEpgKey(index, key) {
  if (!index || typeof key !== 'string' || !key) return null;
  if (index.byId.has(key)) return key;
  const id = index.byName.get(normalizeChannelKey(key));
  return id && index.byId.has(id) ? id : null;
}

const toProgramme = (entry) => ({
  start: entry[0],
  stop: entry[1],
  title: entry[2],
  desc: entry.length > 3 ? entry[3] : null,
});

/** Now/next for one resolved xmltv id at `atMs`. */
export function nowNextForId(index, id, atMs) {
  const arr = index.byId.get(id);
  if (!arr || arr.length === 0) return null;
  // First programme that ends after atMs (binary search over sorted starts
  // works because stop >= start and real guides do not overlap a channel).
  let lo = 0;
  let hi = arr.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid][1] > atMs) {
      found = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  if (found === -1) return { now: null, next: null }; // schedule ended
  const current = arr[found];
  if (current[0] > atMs) return { now: null, next: toProgramme(current) };
  return {
    now: toProgramme(current),
    next: arr[found + 1] ? toProgramme(arr[found + 1]) : null,
  };
}

/**
 * Batch lookup for guide keys (tvg-ids or names): returns one entry per
 * input key (capped at `max`), `now`/`next` null when unmatched or between
 * programmes. Bounded keys keep a 10,000-channel guide page cheap.
 */
export function lookupNowNext(index, keys, atMs = Date.now(), max = 300) {
  const out = [];
  if (!index || !Array.isArray(keys)) return out;
  const limit = Number.isFinite(max) && max > 0 ? max : 300;
  for (const key of keys) {
    if (out.length >= limit) break;
    const id = resolveEpgKey(index, key);
    out.push({
      key: typeof key === 'string' ? key : null,
      ...(id ? (nowNextForId(index, id, atMs) || { now: null, next: null }) : { now: null, next: null }),
    });
  }
  return out;
}
