/**
 * Floating media HUD reservations (add-floating-minigame-media D5).
 *
 * Collects the bounded list of viewport rectangles the floating player must
 * avoid: host chat/action controls plus the active game's critical HUD and
 * touch regions (declared per activity module as `mediaPolicy
 * .reservedSelectors`, with an optional `reservedRects` callback for
 * measured coordinates). At most eight rects are returned; hidden/empty
 * elements are skipped.
 */

export const HOST_RESERVATION_SELECTORS = Object.freeze([
  '#chat-panel',
  '#interact',
  '.challenge-invite',
]);

export const MAX_FLOATING_RESERVATIONS = 8;

/** Viewport rect of a visible element, or null for hidden/zero-size nodes. */
export function rectFromElement(el) {
  if (!el) return null;
  if (el.hidden === true) return null;
  const rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
  if (!rect) return null;
  const width = Number(rect.width) || 0;
  const height = Number(rect.height) || 0;
  const x = Number(rect.x ?? rect.left) || 0;
  const y = Number(rect.y ?? rect.top) || 0;
  if (width < 4 || height < 4) return null;
  if (x + width < 0 || y + height < 0) return null; // fully offscreen
  return { x, y, width, height };
}

/**
 * @param {Document} doc
 * @param {object} [options]
 * @param {string[]} [options.selectors] host + activity CSS selectors
 * @param {Array} [options.extra] already-measured rects (policy callbacks)
 * @param {number} [options.max]
 * @returns {Array<{x,y,width,height}>}
 */
export function collectFloatingReservations(doc, {
  selectors = HOST_RESERVATION_SELECTORS,
  extra = [],
  max = MAX_FLOATING_RESERVATIONS,
} = {}) {
  const out = [];
  const seen = new Set();
  const push = (rect) => {
    if (!rect || out.length >= max) return;
    if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y) || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return;
    const key = `${Math.round(rect.x)}:${Math.round(rect.y)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  };

  for (const selector of selectors || []) {
    let nodes = [];
    try {
      nodes = doc?.querySelectorAll?.(selector) || [];
    } catch {
      nodes = [];
    }
    for (const node of nodes) push(rectFromElement(node));
  }
  for (const rect of extra || []) push(rect);
  return out;
}
