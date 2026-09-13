/**
 * World selector tests (Theater Environment campaign). Every test drives the
 * production module (src/ui/worldSelector.js) through injected fake DOM and
 * fake focus seams — the same dependency seams main.js wires in the browser.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorldSelector, worldSelectionForPreset } from '../src/ui/worldSelector.js';
import {
  THEATER_ENVIRONMENTS,
  THEATER_ENVIRONMENT_IDS,
  THEATER_WORLD_DEFAULT_PRESETS,
  randomTheaterWorldPreset,
  environmentVariantPreset,
} from '../shared/theaterEnvironments.js';

// --- fake DOM --------------------------------------------------------------

function el(tag) {
  const node = {
    tagName: tag.toUpperCase(),
    className: '',
    type: null,
    open: false,
    children: [],
    parentNode: null,
    focused: false,
    attributes: new Map(),
    focus() { node.focused = true; },
    setAttribute(name, value) { node.attributes.set(name, String(value)); },
    getAttribute(name) { return node.attributes.get(name) ?? null; },
    removeAttribute(name) { node.attributes.delete(name); },
    append(...kids) {
      for (const kid of kids) {
        kid.parentNode = node;
        node.children.push(kid);
      }
    },
    appendChild(kid) { node.append(kid); return kid; },
    click() { node.onclick?.(); },
  };
  Object.defineProperty(node, 'innerHTML', {
    set() { throw new Error('worldSelector must not use innerHTML'); },
    get() { throw new Error('worldSelector must not read innerHTML'); },
  });
  let textValue = '';
  Object.defineProperty(node, 'textContent', {
    get: () => textValue,
    set(value) {
      textValue = value;
      if (value === '') node.children.length = 0;
    },
  });
  node.classList = {
    add(name) {
      const set = new Set(node.className.split(' ').filter(Boolean));
      set.add(name);
      node.className = [...set].join(' ');
    },
    remove(name) {
      const set = new Set(node.className.split(' ').filter(Boolean));
      set.delete(name);
      node.className = [...set].join(' ');
    },
    contains(name) { return node.className.split(' ').includes(name); },
  };
  return node;
}

function walk(root, visit) {
  visit(root);
  for (const child of root.children) walk(child, visit);
}

function byClass(root, className) {
  const found = [];
  walk(root, (node) => {
    if (String(node.className).split(' ').includes(className)) found.push(node);
  });
  return found;
}

function createHarness({ activePreset = 'env-coastal-sunset', statusElement = null, getState = null } = {}) {
  const dialog = el('dialog');
  dialog.showModal = function () { dialog.open = true; dialog.showModalCalls = (dialog.showModalCalls ?? 0) + 1; };
  dialog.close = function () { dialog.open = false; };
  const container = el('div');
  const calls = [];
  const selector = createWorldSelector({
    dialog,
    container,
    statusElement,
    getActivePreset: () => activePreset,
    getState,
    onSelect: (presetId) => calls.push(['select', presetId]),
    onOpen: () => calls.push(['open']),
    onClose: () => calls.push(['close']),
    createEl: el,
  });
  return { dialog, container, statusElement, calls, selector };
}

// --- tests ------------------------------------------------------------------

test('the dialog renders all six worlds and their 18 variants from the manifest', () => {
  const h = createHarness();
  h.selector.open();

  const cards = byClass(h.container, 'world-card');
  assert.deepEqual(cards.map(card => card.getAttribute('data-world')), [...THEATER_ENVIRONMENT_IDS]);

  const variantButtons = byClass(h.container, 'world-variant');
  const expectedPresets = Object.values(THEATER_ENVIRONMENTS)
    .flatMap(environment => Object.values(environment.variants).map(row => row.preset));
  assert.equal(variantButtons.length, 18);
  assert.deepEqual(variantButtons.map(button => button.textContent).sort(), Object.values(THEATER_ENVIRONMENTS)
    .flatMap(environment => Object.values(environment.variants).map(row => row.label)).sort());
  assert.deepEqual([...variantButtons.map(button => button.type)], Array(expectedPresets.length).fill('button'));
});

test('the active room preset is highlighted, and other variants are not pressed', () => {
  const h = createHarness({ activePreset: 'env-alpine-aurora' });
  h.selector.open();

  const pressed = byClass(h.container, 'world-variant').filter(button => button.getAttribute('aria-pressed') === 'true');
  assert.equal(pressed.length, 1);
  assert.equal(pressed[0].textContent, THEATER_ENVIRONMENTS.alpine.variants.aurora.label);
  assert.equal(h.selector.activePreset(), 'env-alpine-aurora');
});

test('choosing a variant selects its preset immediately and reflects it while the room confirms', () => {
  const h = createHarness();
  h.selector.open();

  const desertNight = byClass(h.container, 'world-variant')
    .find(button => button.textContent === THEATER_ENVIRONMENTS.desert.variants.night.label);
  desertNight.click();

  assert.deepEqual(h.calls[0], ['open']);
  assert.deepEqual(h.calls[1], ['select', 'env-desert-night']);
  assert.equal(h.selector.activePreset(), 'env-desert-night');
  assert.equal(desertNight.getAttribute('aria-pressed'), 'true');
});

test('an authoritative room change updates the open dialog in place (setActive)', () => {
  const h = createHarness();
  h.selector.open();

  h.selector.setActive('env-cloud-sunrise');
  assert.equal(h.selector.activePreset(), 'env-cloud-sunrise');
  const pressed = byClass(h.container, 'world-variant').filter(button => button.getAttribute('aria-pressed') === 'true');
  assert.equal(pressed.length, 1);
  assert.equal(pressed[0].textContent, THEATER_ENVIRONMENTS.cloud.variants.sunrise.label);
});

test('opening pauses gameplay before the modal takes focus and focuses the active variant', () => {
  const h = createHarness();
  assert.equal(h.selector.isOpen(), false);

  h.selector.open();
  assert.equal(h.selector.isOpen(), true);
  assert.equal(h.calls[0][0], 'open');
  assert.equal(h.dialog.open, true);
  assert.equal(h.dialog.showModalCalls, 1);

  const active = byClass(h.container, 'world-variant').find(button => button.getAttribute('aria-pressed') === 'true');
  assert.equal(active.focused, true);

  // Idempotent open: a second call never double-pauses or re-renders.
  h.selector.open();
  assert.equal(h.dialog.showModalCalls, 1);
  assert.deepEqual(h.calls.filter(call => call[0] === 'open').length, 1);

  h.selector.close();
  assert.equal(h.selector.isOpen(), false);
  assert.deepEqual(h.calls.at(-1), ['close']);
});

test('the preset reverse lookup covers every authored variant and refuses unknown ids', () => {
  for (const environmentId of THEATER_ENVIRONMENT_IDS) {
    const environment = THEATER_ENVIRONMENTS[environmentId];
    for (const [variantId, row] of Object.entries(environment.variants)) {
      assert.deepEqual(worldSelectionForPreset(row.preset), { environmentId, variantId });
      assert.equal(environmentVariantPreset(environmentId, variantId), row.preset);
    }
  }
  assert.equal(worldSelectionForPreset('env-nope'), null);
  assert.equal(worldSelectionForPreset(null), null);
});

test('THEATER_WORLD_DEFAULT_PRESETS contains the signature preset for each world in the World list', () => {
  assert.equal(THEATER_WORLD_DEFAULT_PRESETS.length, 6);
  assert.deepEqual([...THEATER_WORLD_DEFAULT_PRESETS], [
    'env-coastal-sunset',
    'env-rainforest-mist',
    'env-alpine-aurora',
    'env-desert-golden',
    'env-redwood-firefly',
    'env-cloud-sunrise',
  ]);
});

test('randomTheaterWorldPreset chooses uniformly from the 6 World presets', () => {
  assert.equal(randomTheaterWorldPreset(() => 0.0), 'env-coastal-sunset');
  assert.equal(randomTheaterWorldPreset(() => 0.17), 'env-rainforest-mist');
  assert.equal(randomTheaterWorldPreset(() => 0.35), 'env-alpine-aurora');
  assert.equal(randomTheaterWorldPreset(() => 0.52), 'env-desert-golden');
  assert.equal(randomTheaterWorldPreset(() => 0.7), 'env-redwood-firefly');
  assert.equal(randomTheaterWorldPreset(() => 0.99), 'env-cloud-sunrise');
});

test('world selector status honestly displays preview state when isPreview is true', () => {
  const statusElement = el('div');
  const h = createHarness({
    statusElement,
    getState: () => ({
      worldId: 'coastal',
      variantId: 'sunset',
      isPreview: true,
      saved: false,
      storageAvailable: true,
    }),
  });
  h.selector.open();

  assert.equal(statusElement.getAttribute('data-state'), 'preview');
  assert.equal(statusElement.hidden, false);
  assert.ok(statusElement.textContent.includes('Previewing'));
});

test('world selector status honestly displays session-only state when storage is unavailable', () => {
  const statusElement = el('div');
  const h = createHarness({
    statusElement,
    getState: () => ({
      worldId: 'desert',
      variantId: 'golden',
      isPreview: false,
      saved: false,
      storageAvailable: false,
    }),
  });
  h.selector.open();

  assert.equal(statusElement.getAttribute('data-state'), 'session');
  assert.equal(statusElement.hidden, false);
  assert.ok(statusElement.textContent.includes('storage unavailable'));
});

test('world selector status displays saved state when persistently saved', () => {
  const statusElement = el('div');
  const h = createHarness({
    statusElement,
    getState: () => ({
      worldId: 'alpine',
      variantId: 'aurora',
      isPreview: false,
      saved: true,
      storageAvailable: true,
    }),
  });
  h.selector.open();

  assert.equal(statusElement.getAttribute('data-state'), 'saved');
  assert.equal(statusElement.hidden, false);
  assert.ok(statusElement.textContent.includes('Saved in this browser'));
});

test('selecting a variant updates status from preview to saved', () => {
  const statusElement = el('div');
  let state = {
    worldId: 'coastal',
    variantId: 'sunset',
    isPreview: true,
    saved: false,
    storageAvailable: true,
  };
  const h = createHarness({
    statusElement,
    getState: () => state,
  });
  h.selector.open();
  assert.equal(statusElement.getAttribute('data-state'), 'preview');

  // Simulate explicit select making state durable
  state = {
    worldId: 'rainforest',
    variantId: 'mist',
    isPreview: false,
    saved: true,
    storageAvailable: true,
  };
  h.selector.select('env-rainforest-mist');
  assert.equal(statusElement.getAttribute('data-state'), 'saved');
});


