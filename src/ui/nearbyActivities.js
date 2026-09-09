/**
 * Compact nearby activity status. Parent calls `initNearbyActivities`.
 * Does not replace people, chat, or travel — a small overlay under the radar.
 * Occupied tables never render as empty; stale/unknown stays unknown.
 */

import { MSG_TYPES } from '../../shared/protocol.js';
import {
  formatActivityLine,
  labelForType,
  sanitizeActivitySummaries,
  summariesFresh,
  tableLooksOccupied,
} from './activityDiscovery.js';
import { describeQueue } from './queuePresentation.js';

function makeEl(tag) {
  if (typeof document === 'undefined') throw new Error('initNearbyActivities needs a DOM');
  return document.createElement(tag);
}

export function initNearbyActivities({
  net,
  root = null,
  now = () => Date.now(),
  createEl = makeEl,
  getRoomId = () => net?.desiredRoom ?? null,
} = {}) {
  const mount =
    root ||
    (typeof document !== 'undefined' ? document.getElementById('nearby-activities') : null);
  if (!mount) {
    return {
      applyState() {},
      refresh() {},
      snapshot: () => ({ rows: [], fresh: false }),
    };
  }

  let rows = [];
  let fetchedAt = 0;
  let connected = true;

  const heading = mount.querySelector('.nearby-activities-label') || createEl('div');
  heading.className = 'micro nearby-activities-label';
  heading.textContent = 'NEARBY TABLES';
  const list = mount.querySelector('#nearby-activities-list') || createEl('ul');
  list.id = 'nearby-activities-list';
  list.className = 'nearby-activities-list';
  if (!heading.parentNode) mount.append(heading);
  if (!list.parentNode) mount.append(list);

  function paint() {
    const fresh = connected && summariesFresh(fetchedAt, now());
    list.textContent = '';
    if (!fresh || rows.length === 0) {
      const li = createEl('li');
      li.className = 'nearby-unknown';
      li.textContent = connected ? 'Tables unknown' : 'Tables unavailable';
      list.append(li);
      mount.hidden = false;
      mount.setAttribute('data-unknown', 'true');
      mount.removeAttribute('data-occupied');
      return;
    }
    mount.removeAttribute('data-unknown');
    const occupied = tableLooksOccupied(rows, { fresh: true });
    if (occupied) mount.setAttribute('data-occupied', 'true');
    else mount.removeAttribute('data-occupied');

    for (const row of rows) {
      const li = createEl('li');
      const line = formatActivityLine([row], { fresh: true });
      li.textContent = line.text || `${labelForType(row.type)} unknown`;
      if (row.localQueue) {
        const q = createEl('span');
        q.className = 'nearby-queue';
        q.textContent = ` · ${row.localQueue}`;
        li.append(q);
      }
      if (Number.isSafeInteger(row.playing) && row.playing > 0) {
        li.setAttribute('data-occupied', 'true');
      }
      list.append(li);
    }
    mount.hidden = false;
  }

  function applySummaries(summaries, observedAt = now()) {
    rows = sanitizeActivitySummaries(summaries);
    fetchedAt = observedAt;
    paint();
  }

  function applyState(frame, localPlayerId = null) {
    if (!frame || typeof frame !== 'object') return;
    const room = getRoomId();
    if (room && frame.roomId && frame.roomId !== room) return;
    const playing = Array.isArray(frame.players) ? frame.players.length : frame.state?.players?.length;
    const queued = Number.isSafeInteger(frame.queueLength)
      ? frame.queueLength
      : Array.isArray(frame.queue || frame.state?.queue)
        ? (frame.queue || frame.state.queue).length
        : null;
    const watching = Number.isSafeInteger(frame.spectatorCount) ? frame.spectatorCount : null;
    const queueCopy = describeQueue(frame, localPlayerId);
    const id = frame.activityId || frame.state?.activityId;
    if (!id) return;
    const next = {
      id,
      type: frame.activityType || frame.state?.type || id,
      playing: Number.isSafeInteger(playing) ? playing : null,
      watching,
      queued,
      status: frame.status || frame.state?.status || null,
      localQueue: queueCopy.position ? `you #${queueCopy.position}` : queueCopy.nextPlayer === localPlayerId ? 'you are next' : '',
    };
    const others = rows.filter((r) => r.id !== id);
    applySummaries([...others, next], Number.isFinite(frame.serverNow) ? frame.serverNow : now());
  }

  function onDirectory(msg) {
    const room = getRoomId();
    if (!msg || !Array.isArray(msg.entries) || !room) return;
    const entry = msg.entries.find((e) => e && e.roomId === room);
    if (!entry) {
      applySummaries([], now());
      return;
    }
    applySummaries(entry.activities, Number.isFinite(msg.serverNow) ? msg.serverNow : now());
  }

  net?.on?.(MSG_TYPES.ACTIVITY_STATE, (frame) => applyState(frame));
  net?.on?.(MSG_TYPES.PLACE_DIRECTORY, onDirectory);
  net?.onDisconnect?.(() => {
    connected = false;
    fetchedAt = 0;
    paint();
  });
  net?.onConnect?.(() => {
    connected = true;
    paint();
  });

  paint();

  return {
    applyState,
    applySummaries,
    refresh: paint,
    snapshot() {
      return {
        rows: rows.slice(),
        fresh: connected && summariesFresh(fetchedAt, now()),
        occupied: tableLooksOccupied(rows, { fresh: summariesFresh(fetchedAt, now()) }),
      };
    },
  };
}
