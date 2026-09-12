/**
 * Pure floating media layout (add-floating-minigame-media D5).
 *
 * Computes compact/enlarged sizes, safe viewport bounds (visualViewport,
 * safe-area insets, virtual keyboard), corner candidates with bounded host
 * reservations, manual-position preservation and the all-corners-blocked
 * fallback. No DOM: the UI passes measurements in and applies the result.
 */

export const FLOATING_LAYOUT = Object.freeze({
  TARGET_VW: 0.22, // compact target fraction of the available width
  MIN_WIDTH: 280,
  MAX_WIDTH: 400,
  REDUCED_WIDTH: 200, // "smallest usable" retry before the restore chip
  ENLARGED_MAX: 0.8, // at most 80% of the available width/height
  MARGIN: 12, // safe margin from the visual viewport edges
  CONTROLS_MIN: 44, // accessible touch target (CSS handles rendering)
  DEFAULT_ASPECT: 16 / 9,
  CHROME_HEIGHT: 52, // controls strip below the media rectangle (>= 44px targets)
});

const CORNER_ORDER = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];

const providerMinimum = (provider) => {
  if (!provider) return null;
  if (provider === 'twitch') return { width: 400, height: 300 };
  if (typeof provider === 'object' && Number.isFinite(provider.width) && Number.isFinite(provider.height)) {
    return { width: provider.width, height: provider.height };
  }
  return null;
};

/**
 * Usable rectangle inside the visual viewport after the safe margin and the
 * device safe-area insets (notches, rounded corners).
 */
export function availableViewport(viewport, {
  margin = FLOATING_LAYOUT.MARGIN,
  safeArea = null,
} = {}) {
  const width = Math.max(0, Number(viewport?.width) || 0);
  const height = Math.max(0, Number(viewport?.height) || 0);
  const offsetLeft = Number(viewport?.offsetLeft) || 0;
  const offsetTop = Number(viewport?.offsetTop) || 0;
  const insets = safeArea || viewport?.safeArea || {};
  const inset = {
    top: Math.max(0, Number(insets?.top) || 0),
    right: Math.max(0, Number(insets?.right) || 0),
    bottom: Math.max(0, Number(insets?.bottom) || 0),
    left: Math.max(0, Number(insets?.left) || 0),
  };
  return {
    x: offsetLeft + margin + inset.left,
    y: offsetTop + margin + inset.top,
    width: Math.max(0, width - margin * 2 - inset.left - inset.right),
    height: Math.max(0, height - margin * 2 - inset.top - inset.bottom),
  };
}

/**
 * Media size for compact/enlarged presentation. `fits:false` means a provider
 * minimum cannot be met without scaling below it (the UI keeps playback and
 * shows the restore chip plus an explanation).
 */
export function computeFloatingSize({
  viewport,
  aspect = FLOATING_LAYOUT.DEFAULT_ASPECT,
  expanded = false,
  provider = null,
  reservedHeight = 0,
  extraHeight = 0,
  margin = FLOATING_LAYOUT.MARGIN,
  safeArea = null,
  widthOverride = null,
} = {}) {
  const avail = availableViewport(viewport, { margin, safeArea });
  const usableHeight = Math.max(0, avail.height - Math.max(0, reservedHeight) - Math.max(0, extraHeight));
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : FLOATING_LAYOUT.DEFAULT_ASPECT;

  let width;
  if (Number.isFinite(widthOverride) && widthOverride > 0) {
    width = Math.round(Math.min(avail.width, widthOverride));
  } else if (expanded) {
    width = Math.min(avail.width, avail.width * FLOATING_LAYOUT.ENLARGED_MAX);
    let height = width / safeAspect;
    const maxHeight = usableHeight * FLOATING_LAYOUT.ENLARGED_MAX;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * safeAspect;
    }
    width = Math.max(0, Math.round(width));
  } else {
    width = Math.round(Math.min(avail.width, Math.max(FLOATING_LAYOUT.MIN_WIDTH, Math.min(FLOATING_LAYOUT.MAX_WIDTH, avail.width * FLOATING_LAYOUT.TARGET_VW))));
    if (avail.width < FLOATING_LAYOUT.MIN_WIDTH) width = Math.max(0, Math.round(avail.width));
  }
  let height = Math.round(width / safeAspect);

  const min = providerMinimum(provider);
  if (min) {
    const scale = Math.max(1, min.width / Math.max(1, width), min.height / Math.max(1, height));
    if (scale > 1) {
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    if (width > avail.width || height > usableHeight) {
      return { width, height, aspect: safeAspect, avail, fits: false, reason: 'provider_min_size', providerMin: min };
    }
  }
  if (height > usableHeight) {
    height = Math.max(0, Math.round(usableHeight));
    width = Math.max(0, Math.round(height * safeAspect));
  }
  return {
    width,
    height,
    aspect: safeAspect,
    avail,
    fits: width > 0 && height > 0,
    reason: width > 0 && height > 0 ? null : 'no_space',
  };
}

/** Rectangle of a corner candidate inside the available rect. */
export function cornerRect(corner, avail, size) {
  const right = avail.x + avail.width - size.width;
  const bottom = avail.y + avail.height - size.height;
  const rect = { width: size.width, height: size.height };
  switch (corner) {
    case 'bottom-left': return { ...rect, x: avail.x, y: bottom };
    case 'top-right': return { ...rect, x: right, y: avail.y };
    case 'top-left': return { ...rect, x: avail.x, y: avail.y };
    case 'bottom-right':
    default: return { ...rect, x: right, y: bottom };
  }
}

export function overlapArea(a, b) {
  if (!a || !b) return 0;
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Clamp a position so the whole rectangle stays inside the available rect. */
export function clampPosition(position, size, avail) {
  const maxX = Math.max(avail.x, avail.x + avail.width - size.width);
  const maxY = Math.max(avail.y, avail.y + avail.height - size.height);
  return {
    x: Math.min(maxX, Math.max(avail.x, Number(position?.x) || 0)),
    y: Math.min(maxY, Math.max(avail.y, Number(position?.y) || 0)),
  };
}

/**
 * Resolve the layout.
 *
 * @param {object} input
 * @param {object} input.viewport { width, height, offsetLeft, offsetTop, safeArea }
 * @param {number} [input.aspect]
 * @param {boolean} [input.expanded]
 * @param {string|object} [input.provider]
 * @param {Array<{x,y,width,height}>} [input.reservations] bounded host rects
 * @param {{x,y}} [input.manualPosition] user's dragged position (session)
 * @param {boolean} [input.forceReclamp] resize/critical controls force a corner
 * @param {number} [input.reservedHeight]
 * @param {number} [input.extraHeight] chrome strip below the media rectangle
 * @param {number} [input.maxReservations=8]
 * @returns {{ mode:'floating'|'reduced'|'chip', size, position, corner, overlap, reason, avail, fits }}
 */
export function resolveFloatingLayout({
  viewport,
  aspect = FLOATING_LAYOUT.DEFAULT_ASPECT,
  expanded = false,
  provider = null,
  reservations = [],
  manualPosition = null,
  forceReclamp = false,
  reservedHeight = 0,
  extraHeight = 0,
  margin = FLOATING_LAYOUT.MARGIN,
  safeArea = null,
  maxReservations = 8,
} = {}) {
  const rects = (Array.isArray(reservations) ? reservations : [])
    .filter((r) => r && Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.width) && Number.isFinite(r.height))
    .slice(0, Math.max(0, maxReservations));
  const chrome = Math.max(0, Number(extraHeight) || 0);
  const footprint = (size) => ({ x: 0, y: 0, width: size.width, height: size.height + chrome });

  const cornersFor = (avail, size) => CORNER_ORDER.map((corner) => {
    const rect = cornerRect(corner, avail, footprint(size));
    const overlap = rects.reduce((sum, r) => sum + overlapArea(rect, r), 0);
    return { corner, rect, overlap };
  });

  const attempt = (sizeInput) => {
    const size = computeFloatingSize({ viewport, aspect, expanded, provider, reservedHeight, extraHeight: chrome, margin, safeArea, ...sizeInput });
    if (!size.fits) return { size, placement: null };
    const avail = size.avail;
    const cornerResults = cornersFor(avail, size);
    const best = cornerResults.reduce((acc, cur) => (cur.overlap < acc.overlap ? cur : acc), cornerResults[0]);
    return { size, avail, cornerResults, best };
  };

  const normal = attempt({});
  if (!normal.size.fits) {
    return {
      mode: 'chip',
      size: normal.size,
      position: null,
      corner: null,
      overlap: 0,
      reason: normal.size.reason || 'no_space',
      avail: normal.size.avail,
      fits: false,
    };
  }

  const { size, avail, best } = normal;
  const totalArea = size.width * size.height;

  // Manual placement survives ordinary updates, but a fully blocked or
  // out-of-bounds position reclamps to the best corner.
  if (manualPosition && !forceReclamp) {
    const clamped = clampPosition(manualPosition, footprint(size), avail);
    const overlap = rects.reduce((sum, r) => sum + overlapArea({ ...clamped, ...footprint(size) }, r), 0);
    if (overlap <= 0) {
      return { mode: 'floating', size, position: clamped, corner: 'manual', overlap, reason: null, avail, fits: true };
    }
  }

  if (best.overlap <= 0) {
    return { mode: 'floating', size, position: { x: best.rect.x, y: best.rect.y }, corner: best.corner, overlap: 0, reason: null, avail, fits: true };
  }

  // All corners are at least partially reserved: try the smallest usable size.
  const reduced = attempt({ expanded: false, widthOverride: Math.min(FLOATING_LAYOUT.REDUCED_WIDTH, avail.width) });
  if (reduced.size.fits) {
    const reducedCorners = cornersFor(reduced.avail, reduced.size);
    const reducedBest = reducedCorners.reduce((acc, cur) => (cur.overlap < acc.overlap ? cur : acc), reducedCorners[0]);
    if (reducedBest.overlap <= 0) {
      return {
        mode: 'reduced',
        size: reduced.size,
        position: { x: reducedBest.rect.x, y: reducedBest.rect.y },
        corner: reducedBest.corner,
        overlap: 0,
        reason: 'reduced_for_reservations',
        avail: reduced.avail,
        fits: true,
      };
    }
  }

  // Nothing fits cleanly: retain playback and show the restore chip. The
  // least-overlap corner is still reported for a manual "Make room" action.
  return {
    mode: 'chip',
    size: reduced.size.fits ? reduced.size : size,
    position: { x: best.rect.x, y: best.rect.y },
    corner: best.corner,
    overlap: best.overlap,
    reason: totalArea > 0 ? 'reserved_space' : 'no_space',
    avail,
    fits: true,
    leastOverlapCorner: best.corner,
  };
}
