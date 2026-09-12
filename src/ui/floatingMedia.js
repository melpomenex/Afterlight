/**
 * Floating mini-game media chrome (add-floating-minigame-media D1/D5/D6).
 *
 * Builds the controls ONCE around the existing theater overlay surface and
 * only ever toggles presentation classes/labels. It never accepts a URL,
 * never creates video/iframe/HLS objects, never moves the media node and
 * never touches the shared bill. The theater UI remains the playback owner;
 * this module is a DOM view plus local input bindings.
 *
 * Controls (all keyboard reachable, labeled, >= 44 CSS px targets via CSS):
 *   - speaker: Mute stream / Unmute stream / Turn on sound and unmute stream
 *     (replaced by an honest notice for providers without audio control)
 *   - Enlarge stream / Reduce stream
 *   - Hide stream + a compact Restore stream control while media is current
 *   - Move stream (arrow keys) with Reset position
 *   - Back to game (returns focus to the canvas)
 */

import { FLOATING_LAYOUT, clampPosition, resolveFloatingLayout } from './floatingMediaLayout.js';

export const FLOATING_MEDIA_IDS = Object.freeze({
  chrome: 'floating-media',
  title: 'floating-media-title',
  speaker: 'floating-media-speaker',
  enlarge: 'floating-media-enlarge',
  hide: 'floating-media-hide',
  handle: 'floating-media-handle',
  reset: 'floating-media-reset',
  back: 'floating-media-back',
  restore: 'floating-media-restore',
  notice: 'floating-media-notice',
  live: 'floating-media-live',
});

/**
 * Pure mapping from theater UI state to chrome state. Exported for tests and
 * reused by the layout module for provider minimum sizes.
 */
export function floatingMediaChromeState(ui) {
  const mode = typeof ui?.presentationMode === 'function' ? ui.presentationMode() : 'primary';
  const now = ui?.state?.now || null;
  const audio = typeof ui?.audioControlState === 'function'
    ? ui.audioControlState()
    : { supported: null, status: 'idle' };
  const plan = typeof ui?.presentationState === 'object' && ui.presentationState
    ? {
      needsMaster: !ui.presentationState.masterSound,
      targetVolume: ui.presentationState.volume <= 0 ? 1 : null,
    }
    : { needsMaster: false, targetVolume: null };
  const supported = typeof ui?.audioControlAvailable === 'function' ? ui.audioControlAvailable() : false;
  const muted = typeof ui?.effectiveVolume === 'function' ? ui.effectiveVolume() <= 0 : true;
  const limitation = typeof ui?.audioLimitationNotice === 'function' ? ui.audioLimitationNotice() : null;
  return {
    mode,
    visible: mode === 'floating' || mode === 'hidden',
    hidden: mode === 'hidden',
    expanded: typeof ui?.isFloatingExpanded === 'function' ? ui.isFloatingExpanded() : false,
    hasItem: !!now,
    title: now?.title || '',
    overlayState: ui?.overlayState || 'idle',
    audioSupported: supported,
    muted,
    limitation,
    speakerLabel: !supported
      ? 'Automatic mute unavailable'
      : muted
        ? ((plan.needsMaster || plan.targetVolume != null) ? 'Turn on sound and unmute stream' : 'Unmute stream')
        : 'Mute stream',
    audioStatus: audio.status || 'idle',
  };
}

/**
 * @param {object} ui TheaterScreenUI (or a compatible facade)
 * @param {object} [options]
 * @param {Document} [options.document]
 * @param {Function} [options.onBack] return focus to the game canvas
 * @param {Function} [options.onMove] (dx, dy) keyboard nudge in CSS px
 * @param {Function} [options.onReset] reset the floating position
 */
export function createFloatingMediaChrome(ui, {
  document: doc = typeof document !== 'undefined' ? document : null,
  onBack = null,
  onMove = null,
  onReset = null,
  onRestore = null,
} = {}) {
  if (!doc?.createElement) throw new Error('floating media chrome requires a document');
  const overlay = ui?.dom?.overlay;
  if (!overlay) throw new Error('floating media chrome requires the theater overlay');

  let lastAnnouncement = '';
  const announcement = (text) => {
    lastAnnouncement = text;
    if (live) live.textContent = text;
  };

  const el = (tag, attrs = {}, text = null) => {
    const node = doc.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === true) node.setAttribute(key, '');
      else if (value !== false && value != null) node.setAttribute(key, String(value));
      // Mirror the reflected DOM properties fake test environments may not
      // model (title is both a content attribute and a property).
      if (key === 'title' && value != null) node.title = String(value);
      if (key === 'hidden') node.hidden = value === true;
    }
    if (text != null) node.textContent = text;
    return node;
  };

  const chrome = el('div', {
    id: FLOATING_MEDIA_IDS.chrome,
    class: 'fm-chrome',
    role: 'group',
    'aria-label': 'Floating stream controls',
    hidden: true,
  });

  const title = el('span', { id: FLOATING_MEDIA_IDS.title, class: 'fm-title micro' });
  const buttons = el('div', { class: 'fm-buttons' });

  // Icon-only controls keep the bar to one compact strip; the truthful text
  // lives in aria-label/title and in the polite live region. Reset position
  // moves into the move handle's small menu.
  const speaker = el('button', {
    id: FLOATING_MEDIA_IDS.speaker,
    type: 'button',
    class: 'fm-btn fm-btn--icon',
    'aria-pressed': 'false',
  }, '\u266b'); // ♫

  const enlarge = el('button', {
    id: FLOATING_MEDIA_IDS.enlarge,
    type: 'button',
    class: 'fm-btn fm-btn--icon',
    'aria-pressed': 'false',
  }, '\u2922'); // ⤢

  const hide = el('button', {
    id: FLOATING_MEDIA_IDS.hide,
    type: 'button',
    class: 'fm-btn fm-btn--icon',
    'aria-label': 'Hide stream',
    title: 'Hide stream',
  }, '\u25be'); // ▾

  const handle = el('button', {
    id: FLOATING_MEDIA_IDS.handle,
    type: 'button',
    class: 'fm-handle fm-btn--icon',
    'aria-label': 'Move stream \u2014 arrow keys move it, Enter opens position options',
    title: 'Move stream \u2014 arrow keys move it, Enter opens position options',
    'aria-haspopup': 'true',
    'aria-expanded': 'false',
  }, '\u283f'); // ⠿

  const menu = el('div', {
    class: 'fm-menu',
    role: 'menu',
    hidden: true,
  });

  const reset = el('button', {
    id: FLOATING_MEDIA_IDS.reset,
    type: 'button',
    class: 'fm-menu-item',
    role: 'menuitem',
  }, '\u27f2 Reset position');

  const back = el('button', {
    id: FLOATING_MEDIA_IDS.back,
    type: 'button',
    class: 'fm-btn fm-btn--icon',
    'aria-label': 'Back to game',
    title: 'Back to game',
  }, '\u293a'); // ⤺

  const notice = el('p', {
    id: FLOATING_MEDIA_IDS.notice,
    class: 'fm-notice micro',
    role: 'status',
    hidden: true,
  });

  const live = el('span', {
    id: FLOATING_MEDIA_IDS.live,
    class: 'fm-live',
    role: 'status',
    'aria-live': 'polite',
  });

  const restore = el('button', {
    id: FLOATING_MEDIA_IDS.restore,
    type: 'button',
    class: 'fm-restore',
    'aria-label': 'Restore stream',
    hidden: true,
  }, '\u25b8 Stream');

  menu.append(reset);
  buttons.append(handle, speaker, enlarge, hide, back);
  chrome.append(title, buttons, menu, notice, live);
  overlay.append(chrome);
  // The restore chip lives at the body level: the overlay clips its contents
  // (overflow + transform containing block), and the chip must stay reachable
  // while the player surface itself is hidden.
  (doc.body || overlay).append(restore);

  // --- control actions -------------------------------------------------------

  speaker.addEventListener('click', () => {
    if (!floatingMediaChromeState(ui).audioSupported) return;
    const state = floatingMediaChromeState(ui);
    if (!state.muted) {
      ui.setMuted(true);
      announcement('Stream muted.');
      return;
    }
    const result = typeof ui.requestUnmute === 'function' ? ui.requestUnmute() : { applied: false };
    announcement(result?.applied ? 'Stream unmuted.' : 'The stream is still silent — check the app sound controls.');
    sync();
  });

  enlarge.addEventListener('click', () => {
    const next = !ui.isFloatingExpanded();
    ui.setFloatingExpanded(next);
    announcement(next ? 'Stream enlarged.' : 'Stream reduced.');
    sync();
  });

  hide.addEventListener('click', () => {
    ui.setFloatingHidden(true);
    announcement('Stream hidden. Use Restore stream to bring it back.');
    sync();
  });

  restore.addEventListener('click', () => {
    if (typeof onRestore === 'function') onRestore();
    else ui.setFloatingHidden(false);
    announcement('Stream restored.');
    sync();
  });

  back.addEventListener('click', () => {
    if (typeof onBack === 'function') onBack();
    announcement('Back to the game.');
  });

  // --- move-handle menu (Reset position) -------------------------------------

  let menuOpen = false;
  const focusNode = (node) => { try { node?.focus?.(); } catch {} };

  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;
    menu.hidden = false;
    handle.setAttribute('aria-expanded', 'true');
  }

  function closeMenu({ focusHandle = false } = {}) {
    if (!menuOpen) return;
    menuOpen = false;
    menu.hidden = true;
    handle.setAttribute('aria-expanded', 'false');
    if (focusHandle) focusNode(handle);
  }

  function toggleMenu() {
    if (menuOpen) closeMenu({ focusHandle: true });
    else openMenu();
  }

  // A drag is not a menu request: compare the click against the press point.
  let handlePress = null;
  handle.addEventListener('pointerdown', (e) => {
    handlePress = { x: Number(e?.clientX) || 0, y: Number(e?.clientY) || 0 };
  });
  handle.addEventListener('click', (e) => {
    if (handlePress) {
      const dx = (Number(e?.clientX) || 0) - handlePress.x;
      const dy = (Number(e?.clientY) || 0) - handlePress.y;
      handlePress = null;
      if (Math.hypot(dx, dy) > 6) return;
    }
    toggleMenu();
  });

  reset.addEventListener('click', () => {
    if (typeof onReset === 'function') onReset();
    closeMenu({ focusHandle: true });
    announcement('Stream position reset.');
  });

  if (typeof doc.addEventListener === 'function') {
    doc.addEventListener('pointerdown', (e) => {
      if (!menuOpen) return;
      const target = e?.target;
      if (menu === target || menu.contains?.(target) || handle === target || handle.contains?.(target)) return;
      closeMenu();
    }, true);
  }

  handle.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
      return;
    }
    if (typeof onMove !== 'function') return;
    const step = e.shiftKey ? 24 : 8;
    const moves = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = moves[e.code];
    if (!delta) return;
    e.preventDefault();
    e.stopPropagation();
    onMove(delta[0], delta[1]);
  });

  // Escape inside the chrome closes the handle menu, collapses enlarged mode
  // and finally returns focus to the game. Outside the chrome, the existing
  // menu/activity hierarchy stays.
  chrome.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape' && e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    if (menuOpen) {
      closeMenu({ focusHandle: true });
      return;
    }
    if (typeof ui?.isFloatingExpanded === 'function' && ui.isFloatingExpanded()) {
      ui.setFloatingExpanded(false);
      announcement('Stream reduced.');
      sync();
      return;
    }
    if (typeof onBack === 'function') onBack();
  });

  // --- state sync ------------------------------------------------------------

  function sync(next = floatingMediaChromeState(ui), { chip = false } = {}) {
    chrome.hidden = !next.visible;
    restore.hidden = !(next.visible && next.hasItem && (next.hidden || chip));
    restore.textContent = chip && !next.hidden ? 'Make room for stream' : '\u25b8 Stream';
    chrome.classList.toggle('is-hidden', next.hidden);
    chrome.classList.toggle('is-expanded', next.expanded);
    chrome.classList.toggle('has-notice', !!next.limitation);

    title.textContent = next.title ? `Now playing · ${next.title}` : '';
    title.hidden = !next.title;

    speaker.hidden = !next.audioSupported;
    speaker.classList.toggle('is-muted', next.audioSupported && next.muted);
    speaker.setAttribute('aria-label', next.speakerLabel);
    speaker.title = next.speakerLabel;
    speaker.setAttribute('aria-pressed', String(next.muted));

    const enlargeLabel = next.expanded ? 'Reduce stream' : 'Enlarge stream';
    enlarge.textContent = next.expanded ? '\u2921' : '\u2922'; // ⤡ / ⤢
    enlarge.setAttribute('aria-label', enlargeLabel);
    enlarge.title = enlargeLabel;
    enlarge.setAttribute('aria-pressed', String(next.expanded));

    notice.hidden = !next.limitation;
    if (next.limitation) notice.textContent = next.limitation;

    return next;
  }

  sync();

  return {
    element: chrome,
    restore,
    sync,
    get lastAnnouncement() {
      return lastAnnouncement;
    },
    ids: FLOATING_MEDIA_IDS,
  };
}

/**
 * Floating media presenter: binds the chrome to the persistent overlay
 * surface with layout, pointer-capture dragging, keyboard movement, reset
 * and resize/visualViewport reclamping (add-floating-minigame-media D5/D6).
 *
 * The presenter never moves or recreates the media node: it writes CSS
 * custom properties on the overlay (the same element every presentation
 * change already reuses) and delegates geometry math to
 * `floatingMediaLayout.js`.
 */
export function createFloatingMediaPresenter(ui, {
  chrome = null,
  document: doc = typeof document !== 'undefined' ? document : null,
  window: win = typeof window !== 'undefined' ? window : null,
  getViewport = null,
  getReservations = null,
  getProvider = null,
  onManualMove = null,
} = {}) {
  const overlay = ui?.dom?.overlay;
  if (!overlay) throw new Error('floating media presenter requires the theater overlay');
  const handle = chrome?.element
    ? findById(chrome.element, FLOATING_MEDIA_IDS.handle)
    : null;

  let manualPosition = null;
  let lastLayout = null;
  let lastViewport = null;
  let dragging = null;
  let destroyed = false;
  let forceShow = false; // "Make room for stream": explicit override of reservations

  function findById(root, id) {
    if (!root) return null;
    if (root.id === id || root.attrs?.id === id || root.getAttribute?.('id') === id) return root;
    for (const child of root.children || []) {
      const found = findById(child, id);
      if (found) return found;
    }
    return null;
  }

  function viewportRect() {
    if (typeof getViewport === 'function') return getViewport() || {};
    const vv = win?.visualViewport;
    if (vv && Number.isFinite(vv.width) && Number.isFinite(vv.height)) {
      return {
        width: vv.width,
        height: vv.height,
        offsetLeft: vv.offsetLeft || 0,
        offsetTop: vv.offsetTop || 0,
      };
    }
    return { width: win?.innerWidth || 0, height: win?.innerHeight || 0 };
  }

  function providerFor() {
    if (typeof getProvider === 'function') return getProvider();
    const now = ui?.state?.now;
    if (!now) return null;
    if (now.kind === 'twitch') return 'twitch';
    return now.kind || null;
  }

  function apply(layout) {
    lastLayout = layout;
    const style = overlay.style;
    if (!style) return layout;
    if (layout?.mode === 'chip') {
      overlay.classList?.add?.('ts-floating-chip');
      chrome?.sync?.(undefined, { chip: true });
      return layout;
    }
    overlay.classList?.remove?.('ts-floating-chip');
    chrome?.sync?.(undefined, { chip: false });
    if (layout?.size) {
      // Primary-mode quad fitting writes inline geometry; floating owns its
      // size through the CSS custom properties instead.
      if (style.width || style.height || style.aspectRatio) {
        style.width = '';
        style.height = '';
        style.aspectRatio = '';
      }
      style.setProperty('--fm-width', `${layout.size.width}px`);
      style.setProperty('--fm-height', `${layout.size.height}px`);
      style.setProperty('--fm-bar', `${FLOATING_LAYOUT.CHROME_HEIGHT}px`);
    }
    if (layout?.position) {
      style.setProperty('--fm-left', `${Math.round(layout.position.x)}px`);
      style.setProperty('--fm-top', `${Math.round(layout.position.y)}px`);
      // Bottom-half placements anchor to the viewport bottom so wrapped
      // chrome rows grow upward instead of off-screen.
      const viewportBottom = (lastViewport?.offsetTop || 0) + (lastViewport?.height || 0);
      const footprintBottom = layout.position.y + layout.size.height + FLOATING_LAYOUT.CHROME_HEIGHT;
      const anchored = footprintBottom > (lastViewport?.offsetTop || 0) + (lastViewport?.height || 0) / 2;
      overlay.classList?.toggle?.('ts-floating-bottom', anchored);
      if (anchored) {
        style.setProperty('--fm-bottom', `${Math.max(0, Math.round(viewportBottom - footprintBottom))}px`);
      }
    }
    overlay.classList?.toggle?.('ts-floating-reduced', layout?.mode === 'reduced');
    overlay.classList?.toggle?.('ts-floating-enlarged', !!ui?.isFloatingExpanded?.());
    return layout;
  }

  function refresh(reason = 'sync') {
    if (destroyed) return null;
    if (typeof ui?.presentationMode === 'function') {
      const mode = ui.presentationMode();
      if (mode !== 'floating' && mode !== 'hidden') {
        // Keep the session position for the next span, but release the chip
        // override and the per-span geometry.
        forceShow = false;
        lastLayout = null;
        return null;
      }
    }
    lastViewport = viewportRect();
    const layout = resolveFloatingLayout({
      viewport: viewportRect(),
      aspect: typeof ui?.mediaAspect === 'function' ? ui.mediaAspect() : FLOATING_LAYOUT.DEFAULT_ASPECT,
      expanded: ui?.isFloatingExpanded?.() === true,
      provider: providerFor(),
      reservations: forceShow ? [] : (typeof getReservations === 'function' ? getReservations() : []),
      manualPosition,
      forceReclamp: reason === 'resize-critical',
      extraHeight: FLOATING_LAYOUT.CHROME_HEIGHT,
      maxReservations: 8,
    });
    return apply(layout);
  }

  function clampManual(position) {
    const layout = lastLayout || refresh('drag');
    if (!layout?.size || !layout?.avail) return position;
    return clampPosition(position, {
      width: layout.size.width,
      height: layout.size.height + FLOATING_LAYOUT.CHROME_HEIGHT,
    }, layout.avail);
  }

  // --- pointer-capture dragging on the handle --------------------------------

  function beginDrag(event) {
    if (!handle || dragging) return;
    const pointerId = event?.pointerId ?? 1;
    const layout = lastLayout?.position ? lastLayout : refresh('drag');
    dragging = {
      pointerId,
      startX: Number(event?.clientX) || 0,
      startY: Number(event?.clientY) || 0,
      originX: layout?.position?.x || 0,
      originY: layout?.position?.y || 0,
      moved: false,
    };
    try {
      handle.setPointerCapture?.(pointerId);
    } catch {}
    event?.preventDefault?.();
    event?.stopPropagation?.();
  }

  function moveDrag(event) {
    if (!dragging || (event?.pointerId ?? 1) !== dragging.pointerId) return;
    const dx = (Number(event?.clientX) || 0) - dragging.startX;
    const dy = (Number(event?.clientY) || 0) - dragging.startY;
    if (!dragging.moved && Math.abs(dx) + Math.abs(dy) < 2) return;
    dragging.moved = true;
    const next = clampManual({ x: dragging.originX + dx, y: dragging.originY + dy });
    manualPosition = next;
    apply(lastLayout ? { ...lastLayout, position: next, corner: 'manual' } : lastLayout);
    onManualMove?.(next);
    event?.preventDefault?.();
    event?.stopPropagation?.();
  }

  function endDrag(event, { cancelled = false } = {}) {
    if (!dragging || (event?.pointerId ?? dragging.pointerId) !== dragging.pointerId) return;
    const { pointerId, moved } = dragging;
    dragging = null;
    try {
      handle?.releasePointerCapture?.(pointerId);
    } catch {}
    if (cancelled && !moved) manualPosition = null; // never keep a half-drag
    if (cancelled) {
      // Re-clamp into the viewport so a cancelled drag cannot strand the player.
      manualPosition = manualPosition ? clampManual(manualPosition) : null;
      refresh('cancel');
    }
  }

  if (handle) {
    handle.addEventListener('pointerdown', (event) => beginDrag(event));
    handle.addEventListener('pointermove', moveDrag);
    handle.addEventListener('pointerup', (event) => endDrag(event));
    handle.addEventListener('pointercancel', (event) => endDrag(event, { cancelled: true }));
    handle.addEventListener('lostpointercapture', (event) => endDrag(event, { cancelled: true }));
  }

  // --- resize / visual viewport ----------------------------------------------

  const onViewportChange = () => {
    if (dragging) return; // never fight an active drag
    manualPosition = manualPosition ? clampManual(manualPosition) : null;
    refresh('resize');
  };
  win?.addEventListener?.('resize', onViewportChange);
  win?.addEventListener?.('orientationchange', onViewportChange);
  win?.visualViewport?.addEventListener?.('resize', onViewportChange);
  win?.visualViewport?.addEventListener?.('scroll', onViewportChange);

  return {
    refresh,
    reset() {
      manualPosition = null;
      forceShow = false;
      return refresh('reset');
    },
    /** Keyboard handle movement: nudge the session position and clamp. */
    nudge(dx, dy) {
      const layout = lastLayout || refresh('nudge');
      if (!layout?.position) return null;
      const next = clampManual({ x: layout.position.x + (Number(dx) || 0), y: layout.position.y + (Number(dy) || 0) });
      manualPosition = next;
      return apply({ ...layout, position: next, corner: 'manual' });
    },
    /** "Make room for stream": show at the least-overlap corner anyway. */
    requestSpace() {
      forceShow = true;
      const layout = refresh('force-show');
      if (layout?.position) manualPosition = layout.position;
      return layout;
    },
    get layout() {
      return lastLayout;
    },
    get manualPosition() {
      return manualPosition;
    },
    get dragging() {
      return !!dragging;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      win?.removeEventListener?.('resize', onViewportChange);
      win?.removeEventListener?.('orientationchange', onViewportChange);
      win?.visualViewport?.removeEventListener?.('resize', onViewportChange);
      win?.visualViewport?.removeEventListener?.('scroll', onViewportChange);
    },
  };
}
