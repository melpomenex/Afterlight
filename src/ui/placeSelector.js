/**
 * The Places selector: the compact native-dialog modal behind T / Travel
 * (add-social-place-framework task 4.1, design D8).
 *
 * It replaces the old district list rendering in main.js. Featured accepted
 * destinations are listed first; an expandable "Legacy areas" group retains
 * every old destination — all registered districts, the Market Court and the
 * personal garden — so nothing that was reachable before is lost. Occupancy
 * counts ride the bounded place_directory protocol (task 3.3) and are
 * rendered as plain text only: a count the server could not answer is shown
 * as unknown ("—"), never as a made-up number, and data older than 30 s is
 * treated as unknown too. Polling runs at most every 10 s and only while the
 * dialog is open; closing or losing the connection cancels it, and a request
 * generation guard means a late reply can never update a dialog it was not
 * asked for. A malformed reply is ignored, leaving the destination buttons
 * fully usable.
 *
 * Every environment touch is injected (dialog elements, net facade, clock,
 * timers, focus), so headless tests drive this exact module with fake DOM
 * and fake timers. Like the rest of the HUD it never uses innerHTML for
 * dynamic content: all server-influenced strings go through textContent.
 */

import { MSG_TYPES } from '../../shared/protocol.js';
import {
  ACTIVITY_SUMMARY_TTL_MS,
  describePlaceOccupancy,
  formatActivityLine,
  sanitizeActivitySummaries,
  summariesFresh,
  tableLooksOccupied,
} from './activityDiscovery.js';

/** How long a directory occupancy answer stays trustworthy (social-place D8: 30 s). */
export const PLACES_OCCUPANCY_TTL_MS = 30_000;
/** Activity summaries older than 10 s are unknown — never a false empty table. */
export const PLACES_ACTIVITY_TTL_MS = ACTIVITY_SUMMARY_TTL_MS;
/** Poll cadence while the selector is open (design D8: at most every 10 s). */
export const PLACES_POLL_INTERVAL_MS = 10_000;

export function createPlaceSelector({
  // Native <dialog> element (or a compatible fake in tests).
  dialog,
  // Element that receives the destination groups.
  container,
  // The dialog's close button.
  closeButton,
  // NetworkClient facade: send(type, payload), on(type, fn), onConnect(fn),
  // onDisconnect(fn). send silently drops while the socket is closed.
  net,
  // () => [{ roomId, featured, micro, name, description, badgeClass, badgeText, current }]
  // Read fresh on every open so visited/restored badges and the current
  // place highlight are always up to date.
  getDestinations,
  // (roomId) => void: close has already run when this fires.
  onTravel,
  // Lifecycle hooks owned by main.js: pause gameplay / hand it back.
  onOpen = null,
  onClose = null,
  // Injectable clock and single-shot timers (setTimeout-shaped).
  now = () => Date.now(),
  schedule = (fn, ms) => setTimeout(fn, ms),
  cancel = (handle) => clearTimeout(handle),
  // Server echoes this id; bounds match the gateway's 1..64 rule.
  newRequestId = () => `dir_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  // Focus seams (default to the real document when it exists; Node-safe).
  getActiveElement = () => (typeof document !== 'undefined' ? document.activeElement : null),
  focusElement = (el) => { if (el && typeof el.focus === 'function') el.focus(); },
  // Element factory seam: defaults to the real document; tests inject fakes.
  createEl = (tag) => {
    if (typeof document === 'undefined') throw new Error('createPlaceSelector needs a DOM or an injected createEl');
    return globalThis.document.createElement(tag);
  },
} = {}) {
  if (!dialog || typeof dialog.showModal !== 'function') throw new Error('createPlaceSelector requires a dialog with showModal');
  if (!container) throw new Error('createPlaceSelector requires a container element');
  if (typeof net?.send !== 'function' || typeof net?.on !== 'function') throw new Error('createPlaceSelector requires a net facade with send/on');
  if (typeof getDestinations !== 'function') throw new Error('createPlaceSelector requires a getDestinations provider');
  if (typeof onTravel !== 'function') throw new Error('createPlaceSelector requires an onTravel seam');

  let openState = false;
  let pollHandle = null;
  let latestRequestId = null;
  let previousFocus = null;
  // roomId -> { countEl, activityEl } for in-place updates (no re-render,
  // so keyboard focus survives every refresh).
  const cards = new Map();
  // roomId -> { occupancy, activity, fetchedAt } from the latest accepted reply.
  const counts = new Map();

  // --- directory protocol (place_directory / place_directory_get) ---

  function requestDirectory() {
    if (!openState) return;
    latestRequestId = newRequestId();
    net.send(MSG_TYPES.PLACE_DIRECTORY_GET, { requestId: latestRequestId });
  }

  function applyDirectory(msg) {
    // A reply for a closed selector, or one whose generation was superseded,
    // must never touch the current dialog.
    if (!openState) return;
    if (!msg || typeof msg !== 'object' || msg.requestId !== latestRequestId) return;
    // Malformed response: keep whatever was shown and keep every destination
    // button usable — counts are honesty-critical, not load-bearing.
    if (!Array.isArray(msg.entries)) return;
    const fetchedAt = now();
    for (const entry of msg.entries) {
      if (!entry || typeof entry !== 'object' || typeof entry.roomId !== 'string') continue;
      counts.set(entry.roomId, {
        occupancy: Number.isSafeInteger(entry.occupancy) && entry.occupancy >= 0 ? entry.occupancy : null,
        activity: typeof entry.activity === 'string' && entry.activity.length > 0 ? entry.activity : null,
        activities: sanitizeActivitySummaries(entry.activities),
        // Static semantic atmosphere label (preset key) from the manifest
        // projection — server-influenced text, so it always renders as text.
        atmosphereLabel:
          typeof entry.atmosphereLabel === 'string' && entry.atmosphereLabel.length > 0
            ? entry.atmosphereLabel.slice(0, 64)
            : null,
        fetchedAt,
      });
    }
    refreshCounts();
  }

  function countEntryFor(roomId) {
    const entry = counts.get(roomId);
    if (!entry) return null;
    // Data older than the TTL is unknown, even if the socket never dropped.
    if (now() - entry.fetchedAt > PLACES_OCCUPANCY_TTL_MS) return null;
    return entry;
  }

  function refreshCounts() {
    for (const [roomId, card] of cards) {
      const entry = countEntryFor(roomId);
      const occupancyKnown = !!(entry && Number.isSafeInteger(entry.occupancy) && entry.occupancy >= 0);
      const activityFresh = !!(entry && summariesFresh(entry.fetchedAt, now(), PLACES_ACTIVITY_TTL_MS));
      const occupiedTable = tableLooksOccupied(entry?.activities, { fresh: activityFresh });
      const said = describePlaceOccupancy(occupancyKnown ? entry.occupancy : null, {
        occupiedTable,
        occupancyKnown,
      });
      card.countEl.textContent = said.text;
      card.countEl.setAttribute('title', occupancyKnown ? 'Live occupancy' : 'Occupancy unknown right now');
      card.countEl.setAttribute('aria-label', said.label);
      if (occupiedTable) card.button.setAttribute('data-occupied', 'true');
      else card.button.removeAttribute?.('data-occupied');

      // Prefer structured summaries; fall back to the legacy title string.
      // Stale/unknown never promises an empty table.
      const structured = formatActivityLine(entry?.activities, { fresh: activityFresh });
      if (!entry) {
        card.activityEl.textContent = '';
      } else if (!activityFresh && (entry.activities?.length > 0 || entry.activity)) {
        card.activityEl.textContent = 'Tables unknown';
      } else if (structured.text) {
        card.activityEl.textContent = structured.text;
      } else {
        card.activityEl.textContent = entry.activity ?? '';
      }
      // Semantic weather label rides occupancy freshness, not activity TTL.
      const label = occupancyKnown ? entry?.atmosphereLabel ?? '' : '';
      card.weatherEl.textContent = label;
      if (label) {
        card.button.setAttribute('data-atmosphere', label);
      } else {
        card.button.removeAttribute?.('data-atmosphere');
      }
    }
  }

  // --- polling (only while open; single-shot timer that re-arms itself) ---

  function pollTick() {
    pollHandle = null;
    if (!openState) return;
    requestDirectory();
    // Re-evaluate freshness even when the request was dropped: a count past
    // its TTL goes back to unknown while the travel button stays usable.
    refreshCounts();
    armPoll();
  }

  function armPoll() {
    disarmPoll();
    pollHandle = schedule(pollTick, PLACES_POLL_INTERVAL_MS);
  }

  function disarmPoll() {
    if (pollHandle != null) cancel(pollHandle);
    pollHandle = null;
  }

  // --- rendering (built once per open; counts update in place) ---

  function buildCard(destination) {
    const button = createEl('button');
    button.type = 'button';
    button.className = 'district-choice place-card' + (destination.current ? ' active' : '');

    const head = createEl('div');
    const micro = createEl('span');
    micro.className = 'micro';
    micro.textContent = destination.micro ?? '';
    const name = createEl('strong');
    name.textContent = destination.name ?? destination.roomId;
    head.append(micro, name);
    button.append(head);

    if (destination.description) {
      const desc = createEl('span');
      desc.className = 'desc';
      desc.textContent = destination.description;
      button.append(desc);
    }

    const meta = createEl('div');
    meta.className = 'place-card-meta';
    if (destination.badgeText) {
      const badge = createEl('span');
      badge.className = `status-badge ${destination.badgeClass ?? ''}`;
      badge.textContent = destination.badgeText;
      meta.append(badge);
    }
    const activity = createEl('span');
    activity.className = 'place-activity';
    const count = createEl('span');
    count.className = 'place-count';
    meta.append(activity, count);
    button.append(meta);

    // Semantic weather line (add-atmosphere-weather-system 2.2): attached
    // from the directory's static atmosphereLabel once the reply arrives.
    const weather = createEl('span');
    weather.className = 'place-weather micro';
    button.append(weather);

    button.onclick = () => { close(); onTravel(destination.roomId); };
    return { button, countEl: count, activityEl: activity, weatherEl: weather };
  }

  function buildGroup(label, destinations, expandable) {
    const group = createEl(expandable ? 'details' : 'div');
    group.className = 'place-group' + (expandable ? ' place-group-legacy' : ' place-group-featured');
    if (expandable) {
      // Native details/summary: keyboard-togglable for free, collapsed by
      // default so the modal stays compact.
      group.open = false;
      const summary = createEl('summary');
      summary.className = 'micro place-group-label';
      summary.textContent = label;
      group.append(summary);
    } else {
      const heading = createEl('div');
      heading.className = 'micro place-group-label';
      heading.textContent = label;
      group.append(heading);
    }
    const cardsEl = createEl('div');
    cardsEl.className = 'place-cards';
    for (const destination of destinations) {
      const card = buildCard(destination);
      cards.set(destination.roomId, card);
      cardsEl.append(card.button);
    }
    group.append(cardsEl);
    return group;
  }

  function render() {
    container.textContent = '';
    cards.clear();
    const destinations = getDestinations() ?? [];
    const featured = destinations.filter(d => d?.featured);
    const legacy = destinations.filter(d => !d?.featured);
    if (featured.length > 0) container.append(buildGroup('FEATURED', featured, false));
    if (legacy.length > 0) container.append(buildGroup('LEGACY AREAS', legacy, true));
  }

  // --- lifecycle ---

  function open() {
    if (openState || dialog.open) return;
    onOpen?.(); // pause gameplay and drop held keys before the modal takes focus
    openState = true;
    counts.clear();
    previousFocus = getActiveElement() ?? null;
    render();
    refreshCounts();
    dialog.showModal();
    requestDirectory();
    armPoll();
  }

  function close() {
    if (!openState && !dialog.open) return;
    openState = false;
    // Generation guard: a reply still in flight belongs to no future dialog.
    latestRequestId = null;
    disarmPoll();
    counts.clear();
    if (dialog.open) dialog.close();
    onClose?.();
    if (previousFocus) focusElement(previousFocus);
    previousFocus = null;
  }

  // Native cancellation (Escape) closes through the same path as the button.
  dialog.addEventListener?.('cancel', (e) => {
    e?.preventDefault?.();
    close();
  });
  closeButton?.addEventListener?.('click', close);

  net.on(MSG_TYPES.PLACE_DIRECTORY, applyDirectory);
  // A dropped connection cancels polling and clears counts: the selector
  // keeps every destination usable, showing unknown instead of stale numbers.
  net.onDisconnect?.(() => {
    latestRequestId = null;
    disarmPoll();
    if (openState) {
      counts.clear();
      refreshCounts();
    }
  });
  // Back online while open: ask again and resume the cadence.
  net.onConnect?.(() => {
    if (!openState) return;
    requestDirectory();
    armPoll();
  });

  return {
    open,
    close,
    isOpen: () => openState,
    /** Observation surface for tests; never a second authority. */
    snapshot() {
      return {
        open: openState,
        requestId: latestRequestId,
        pollArmed: pollHandle != null,
        counts: new Map(counts),
      };
    },
  };
}
