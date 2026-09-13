/**
 * The World selector: the compact native-dialog modal behind the HUD's
 * "World" control (Theater Environment campaign).
 *
 * Six authored worlds share the ONE Orpheum room; a world is selected by
 * adopting one of its atmosphere presets, so the choice is a shared room
 * property, not a private display setting. Picking a variant applies it
 * locally first (an offline session still previews worlds and a round trip
 * never flashes the previous one) and asks the room to follow; the accepted
 * `atmosphere_state` snapshot outranks the local pick for everyone, and the
 * dialog reflects whichever preset the room reports while it is open.
 *
 * The module renders the pure manifest only — it never invents state — and
 * every environment touch is injected so headless tests drive this exact
 * module with fake DOM and fake focus.
 */

import {
  THEATER_ENVIRONMENTS,
  THEATER_ENVIRONMENT_IDS,
  environmentForPreset,
} from '../../shared/theaterEnvironments.js';

/** Which world/variant does an atmosphere preset select? `null` outside the set. */
export function worldSelectionForPreset(presetId) {
  const found = environmentForPreset(presetId);
  return found ? { environmentId: found.environmentId, variantId: found.variantId } : null;
}

export function createWorldSelector({
  // Native <dialog> element (or a compatible fake in tests).
  dialog,
  // Element that receives the world cards.
  container,
  // Optional status/feedback container for preview / session-only messaging.
  statusElement = null,
  // () => string | null: the atmosphere preset the room currently reports.
  getActivePreset,
  // () => object | null: optional getter for worldState snapshot
  getState = null,
  // (presetId) => void: the optimistic local pick + room request.
  onSelect,
  // Lifecycle hooks owned by main.js: pause gameplay / hand it back.
  onOpen = null,
  onClose = null,
  // Element factory + focus seams (tests inject fakes; Node-safe default).
  createEl,
  focusElement = (el) => { if (el && typeof el.focus === 'function') el.focus(); },
} = {}) {
  if (!dialog || typeof dialog.showModal !== 'function') throw new Error('createWorldSelector requires a dialog with showModal');
  if (!container) throw new Error('createWorldSelector requires a container element');
  if (typeof getActivePreset !== 'function') throw new Error('createWorldSelector requires a getActivePreset provider');
  if (typeof onSelect !== 'function') throw new Error('createWorldSelector requires an onSelect seam');
  if (typeof createEl !== 'function') throw new Error('createWorldSelector requires a createEl factory');

  let openState = false;
  // presetId -> variant button, rebuilt once per open so focus is stable.
  const buttons = new Map();

  function updateStatus() {
    if (!statusElement) return;
    const state = typeof getState === 'function' ? getState() : null;
    if (!state) {
      statusElement.textContent = '';
      if (typeof statusElement.setAttribute === 'function') statusElement.setAttribute('hidden', '');
      statusElement.hidden = true;
      return;
    }
    if (state.isPreview) {
      statusElement.textContent = 'Previewing from link for this visit. Choose any variant to save it in this browser.';
      if (typeof statusElement.setAttribute === 'function') statusElement.setAttribute('data-state', 'preview');
      if (typeof statusElement.removeAttribute === 'function') statusElement.removeAttribute('hidden');
      statusElement.hidden = false;
    } else if (state.saved === false || state.storageAvailable === false) {
      statusElement.textContent = 'Active for this visit (browser storage unavailable).';
      if (typeof statusElement.setAttribute === 'function') statusElement.setAttribute('data-state', 'session');
      if (typeof statusElement.removeAttribute === 'function') statusElement.removeAttribute('hidden');
      statusElement.hidden = false;
    } else {
      statusElement.textContent = 'Saved in this browser. Follows you across places and games.';
      if (typeof statusElement.setAttribute === 'function') statusElement.setAttribute('data-state', 'saved');
      if (typeof statusElement.removeAttribute === 'function') statusElement.removeAttribute('hidden');
      statusElement.hidden = false;
    }
  }

  function build() {
    container.textContent = '';
    buttons.clear();

    for (const environmentId of THEATER_ENVIRONMENT_IDS) {
      const environment = THEATER_ENVIRONMENTS[environmentId];
      if (!environment) continue;

      const card = createEl('section');
      card.className = 'world-card';
      card.setAttribute('data-world', environmentId);

      const micro = createEl('div');
      micro.className = 'micro';
      micro.textContent = environment.district;
      card.appendChild(micro);

      const title = createEl('h3');
      title.textContent = environment.name;
      card.appendChild(title);

      const subtitle = createEl('p');
      subtitle.className = 'world-subtitle';
      subtitle.textContent = environment.subtitle;
      card.appendChild(subtitle);

      const description = createEl('p');
      description.className = 'world-description';
      description.textContent = environment.description;
      card.appendChild(description);

      const variants = createEl('div');
      variants.className = 'world-variants';
      variants.setAttribute('role', 'group');
      variants.setAttribute('aria-label', `${environment.name} variants`);

      for (const row of Object.values(environment.variants)) {
        const button = createEl('button');
        button.type = 'button';
        button.className = 'world-variant';
        button.textContent = row.label;
        button.setAttribute('aria-pressed', 'false');
        button.onclick = () => select(row.preset);
        variants.appendChild(button);
        buttons.set(row.preset, button);
      }

      card.appendChild(variants);
      container.appendChild(card);
    }
  }

  // Optimistic selection: highlight immediately, then ask the room. The
  // authoritative snapshot calls setActive again with whatever was accepted.
  function select(presetId) {
    setActive(presetId);
    onSelect(presetId);
    updateStatus();
  }

  function setActive(presetId) {
    for (const [preset, button] of buttons) {
      const active = preset === presetId;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (active) button.classList.add('active');
      else button.classList.remove('active');
    }
    updateStatus();
  }

  function open() {
    if (openState) return;
    openState = true;
    build();
    const activePreset = getActivePreset();
    setActive(activePreset);
    updateStatus();
    if (typeof onOpen === 'function') onOpen();
    dialog.showModal();
    const active = buttons.get(activePreset);
    if (active) focusElement(active);
  }

  function close() {
    if (!openState) return;
    openState = false;
    if (typeof dialog.close === 'function') dialog.close();
    if (typeof onClose === 'function') onClose();
  }

  return {
    open,
    close,
    select,
    setActive,
    updateStatus,
    isOpen: () => openState,
    /** The preset the dialog currently highlights (for tests/tools). */
    activePreset: () => {
      for (const [preset, button] of buttons) {
        if (button.getAttribute('aria-pressed') === 'true') return preset;
      }
      return null;
    },
  };
}
