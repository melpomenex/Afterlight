/**
 * Tests for the place-context HUD policy (deemphasize-legacy-farming
 * tasks 1.1 and 1.2). The policy itself is pure and is exercised directly;
 * the DOM application is exercised through injected fake elements, and the
 * marketModal visibility seam through a fake document — no browser and no
 * source-string matching.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hudPolicy,
  hudContextFor,
  toolForDigit,
  TOOL_DIGIT_MAP,
  nextToolState,
  applyHudPolicyToDom,
  readLegacyUiPreference,
  writeLegacyUiPreference,
  LEGACY_UI_PREF_KEY,
  HUD_CONTEXTS,
} from '../src/ui/placeHudPolicy.js';
import { getPlaceDefinition, PLACE_DEFINITIONS } from '../shared/placeDefinitions.js';

const SOCIAL_SECTIONS_HIDDEN = ['toolBelt', 'toolHint', 'economyStats', 'legacyButtons'];

// --- F1 truth table: one policy per kind of place -------------------------

test('The Orpheum (venue) presents the social policy', () => {
  const policy = hudPolicy(getPlaceDefinition('theater'), 'theater');
  assert.equal(policy.context, HUD_CONTEXTS.SOCIAL);
  for (const section of SOCIAL_SECTIONS_HIDDEN) {
    assert.equal(policy.sections[section], false, `${section} is hidden in a social place`);
  }
  assert.equal(policy.sections.millPanel, false);
  assert.equal(policy.shortcuts.toolDigits, false, 'digits never equip tools in social places');
  assert.equal(policy.shortcuts.inventory, true, 'I stays reachable');
  assert.equal(policy.shortcuts.market, true, 'M stays reachable');
  assert.equal(policy.shortcuts.travel, true, 'T stays Places');
  assert.equal(policy.tools.clearOnEntry, true, 'entering a social place clears the held visual tool');
  assert.equal(policy.tools.restoreOnEntry, false);
});

test('The Rain Court presents the social policy from manifest metadata', () => {
  const policy = hudPolicy(getPlaceDefinition('court'), 'court');
  assert.equal(policy.context, HUD_CONTEXTS.SOCIAL);
  assert.equal(policy.shortcuts.toolDigits, false);
  assert.equal(policy.tools.clearOnEntry, true);
});

test('an unlisted place id (desert-camp, not yet in the manifest) takes the safe social default', () => {
  const policy = hudPolicy(null, 'desert-camp');
  assert.equal(policy.context, HUD_CONTEXTS.SOCIAL);
  assert.equal(policy.sections.toolBelt, false);
  assert.equal(policy.shortcuts.toolDigits, false);
  // No hardcoded id: the same answer comes from metadata alone, which is how
  // the manifest entry will classify it once the place lands.
  const futureDef = { id: 'desert-camp', kind: 'environment', social: { featured: true, legacy: false } };
  assert.equal(hudContextFor(futureDef, 'desert-camp'), HUD_CONTEXTS.SOCIAL);
});

test('rooftops keeps the legacy policy today and follows metadata when a place turns social', () => {
  const policy = hudPolicy(getPlaceDefinition('rooftops'), 'rooftops');
  assert.equal(policy.context, HUD_CONTEXTS.LEGACY);
  for (const section of SOCIAL_SECTIONS_HIDDEN) {
    assert.equal(policy.sections[section], true, `${section} stays visible in a legacy biome`);
  }
  assert.equal(policy.sections.millPanel, false, 'the mill panel is a Market Court feature only');
  assert.equal(policy.shortcuts.toolDigits, true, 'legacy biomes keep tool shortcuts');
  assert.equal(policy.tools.clearOnEntry, false, 'legacy biomes never clear the held tool');
  assert.equal(policy.tools.restoreOnEntry, false);

  // When change E flips rooftops' metadata, the policy follows with no code
  // change and no hardcoded id.
  const flipped = { ...getPlaceDefinition('rooftops'), social: { featured: true, legacy: true } };
  assert.equal(hudContextFor(flipped, 'rooftops'), HUD_CONTEXTS.SOCIAL);
});

test('the Market Court keeps legacy trading sections, including the mill panel', () => {
  const policy = hudPolicy(null, 'market');
  assert.equal(policy.context, HUD_CONTEXTS.LEGACY);
  for (const section of SOCIAL_SECTIONS_HIDDEN) {
    assert.equal(policy.sections[section], true);
  }
  assert.equal(policy.sections.millPanel, true, 'the mill progress panel remains market-only');
  assert.equal(policy.tools.clearOnEntry, false);
  assert.equal(policy.tools.restoreOnEntry, false);
});

test('the public garden district stays legacy; only the personal garden restores the tool', () => {
  const publicGarden = hudPolicy(getPlaceDefinition('garden'), 'garden');
  assert.equal(publicGarden.context, HUD_CONTEXTS.LEGACY);
  assert.equal(publicGarden.tools.restoreOnEntry, false);

  const personal = hudPolicy(null, 'garden:guest_42');
  assert.equal(personal.context, HUD_CONTEXTS.LEGACY);
  assert.equal(personal.sections.toolBelt, true, 'cultivation controls survive in the personal garden');
  assert.equal(personal.shortcuts.toolDigits, true);
  assert.equal(personal.tools.clearOnEntry, false);
  assert.equal(personal.tools.restoreOnEntry, true, 're-entering the personal garden restores the chosen tool');
});

test('unknown or missing metadata falls back to safe social defaults', () => {
  for (const [place, roomId] of [[null, null], [undefined, 'somewhere'], [{ id: 'half-defined' }, 'half-defined'], ['junk', 'junk']]) {
    const policy = hudPolicy(place, roomId);
    assert.equal(policy.context, HUD_CONTEXTS.SOCIAL, `${roomId} defaults to social`);
    assert.equal(policy.sections.toolBelt, false);
    assert.equal(policy.shortcuts.toolDigits, false);
  }
});

test('every manifest place classifies without exception, and legacy access survives everywhere', () => {
  for (const def of PLACE_DEFINITIONS) {
    const policy = hudPolicy(def, def.id);
    assert.ok(['social', 'legacy'].includes(policy.context), `${def.id} has an explicit context`);
    assert.equal(policy.shortcuts.inventory, true, `${def.id}: I retains legacy access`);
    assert.equal(policy.shortcuts.market, true, `${def.id}: M retains legacy access`);
    assert.equal(policy.shortcuts.travel, true, `${def.id}: T stays Places`);
  }
});

test('the saved legacy-UI preference rolls the whole table back, presentation only', () => {
  const policy = hudPolicy(getPlaceDefinition('theater'), 'theater', { legacyUi: true });
  assert.equal(policy.context, HUD_CONTEXTS.LEGACY);
  for (const section of SOCIAL_SECTIONS_HIDDEN) {
    assert.equal(policy.sections[section], true, `${section} returns when the policy is disabled`);
  }
  assert.equal(policy.shortcuts.toolDigits, true);
  assert.equal(policy.tools.clearOnEntry, false, 'rollback performs no tool or data writes');
});

// --- presentation preference storage --------------------------------------

test('the legacy-UI preference reads exact values and session-falls-back on malformed data', () => {
  assert.equal(readLegacyUiPreference({ getItem: () => 'on' }), true);
  assert.equal(readLegacyUiPreference({ getItem: () => 'off' }), false);
  assert.equal(readLegacyUiPreference({ getItem: () => null }), false, 'absent preference keeps the social default');
  assert.equal(readLegacyUiPreference({ getItem: () => '{broken' }), false, 'malformed value is ignored');
  assert.equal(readLegacyUiPreference({ getItem: () => 'yes' }), false);
  assert.equal(
    readLegacyUiPreference({ getItem: () => { throw new Error('restricted'); } }),
    false,
    'unavailable storage never breaks the game',
  );
});

test('the legacy-UI preference writes are explicit and storage failures stay session-local', () => {
  const stored = [];
  const storage = { setItem: (k, v) => stored.push([k, v]) };
  assert.equal(writeLegacyUiPreference(true, storage), true);
  assert.equal(writeLegacyUiPreference(false, storage), true);
  assert.deepEqual(stored, [[LEGACY_UI_PREF_KEY, 'on'], [LEGACY_UI_PREF_KEY, 'off']]);
  assert.equal(writeLegacyUiPreference(true, { setItem: () => { throw new Error('quota'); } }), false);
});

// --- task 2.2: the boot path — stored preference (or its denial) drives the flip

test('boot composition: a saved preference restores legacy presentation; storage denial boots social', () => {
  // Saved "on" (the Settings checkbox): the whole table rolls back everywhere.
  const saved = readLegacyUiPreference({ getItem: (k) => (k === LEGACY_UI_PREF_KEY ? 'on' : null) });
  const restored = hudPolicy(getPlaceDefinition('theater'), 'theater', { legacyUi: saved });
  assert.equal(saved, true);
  assert.equal(restored.context, HUD_CONTEXTS.LEGACY);
  for (const section of SOCIAL_SECTIONS_HIDDEN) {
    assert.equal(restored.sections[section], true, `${section} is visible again with the saved legacy preference`);
  }
  const restoredGarden = hudPolicy(null, 'garden:guest_1', { legacyUi: saved });
  assert.equal(restoredGarden.context, HUD_CONTEXTS.LEGACY);
  assert.equal(restoredGarden.sections.millPanel, false, 'rollback never moves the mill panel out of the market');

  // Storage denied at boot: the read falls back to the social default and the
  // game still boots into the social presentation, session-local.
  const denied = readLegacyUiPreference({ getItem: () => { throw new Error('storage blocked'); } });
  assert.equal(denied, false);
  const booted = hudPolicy(getPlaceDefinition('theater'), 'theater', { legacyUi: denied });
  assert.equal(booted.context, HUD_CONTEXTS.SOCIAL);
  assert.equal(booted.sections.toolBelt, false);
  // And the rollback stays reversible: flipping back off restores social with
  // no data writes anywhere in the path.
  assert.equal(hudPolicy(getPlaceDefinition('theater'), 'theater', { legacyUi: false }).context, HUD_CONTEXTS.SOCIAL);
});

// --- number keys versus the emote wheel -----------------------------------

test('number keys respect the emote wheel and the context policy', () => {
  assert.equal(toolForDigit('Digit3', { enabled: true, emoteWheelOpen: true }), null,
    'a number press while the emote wheel owns input never equips a tool');
  assert.equal(toolForDigit('Digit3', { enabled: true }), 'seed');
  assert.deepEqual(TOOL_DIGIT_MAP, {
    Digit1: 'hands', Digit2: 'hoe', Digit3: 'seed', Digit4: 'water', Digit5: 'harvest', Digit6: 'sprinkler',
  });
  assert.equal(toolForDigit('Digit3', { enabled: false }), null, 'social places ignore tool digits');
  assert.equal(toolForDigit('Digit9', { enabled: true }), null);
  assert.equal(toolForDigit('KeyQ', { enabled: true }), null);
});

// --- tool transitions never touch inventory data --------------------------

test('garden tool clear/restore is a visual round-trip that never mutates inventory', () => {
  // A frozen server-owned player snapshot: the policy has no API to write it.
  const player = Object.freeze({
    coins: 60,
    inventory: Object.freeze({ seeds: Object.freeze({ radish: 2 }), produce: Object.freeze({}) }),
    materials: Object.freeze({ copper: 1 }),
  });
  const before = JSON.stringify(player);

  // In the garden the gardener holds the watering can, then travels out.
  let state = { currentTool: 'water', rememberedTool: null };
  const apply = (place, roomId) => {
    const policy = hudPolicy(place, roomId);
    const next = nextToolState({ policy, currentTool: state.currentTool, rememberedTool: state.rememberedTool });
    state = { currentTool: next.tool, rememberedTool: next.rememberedTool };
    return policy;
  };

  apply(getPlaceDefinition('court'), 'court'); // social: hands, remember the can
  assert.equal(state.currentTool, 'hands', 'the held visual tool clears on entering a social place');
  assert.equal(state.rememberedTool, 'water', 'the gardener\'s choice is remembered, not discarded');

  apply(getPlaceDefinition('theater'), 'theater'); // still social: stays hands
  assert.equal(state.currentTool, 'hands');
  assert.equal(state.rememberedTool, 'water');

  apply(null, 'garden:guest_1'); // back to the personal garden
  assert.equal(state.currentTool, 'water', 'the personal garden restores the chosen tool');
  assert.equal(state.rememberedTool, null, 'the memory is spent once');

  assert.equal(JSON.stringify(player), before, 'the inventory snapshot is byte-identical');

  // Legacy-to-legacy travel never touches the held tool at all.
  const steady = nextToolState({ policy: hudPolicy(null, 'market'), currentTool: 'hoe', rememberedTool: null });
  assert.deepEqual(steady, { tool: 'hoe', rememberedTool: null });

  // Already-empty hands do not erase an earlier memory.
  const gentle = nextToolState({
    policy: hudPolicy(getPlaceDefinition('theater'), 'theater'),
    currentTool: 'hands',
    rememberedTool: 'seed',
  });
  assert.deepEqual(gentle, { tool: 'hands', rememberedTool: 'seed' });
});

// --- DOM application (injected elements) ----------------------------------

function makeFakeEl() {
  return { hidden: false, dataset: {} };
}

test('applying the policy hides social-hidden sections and removes them from tab order', () => {
  const els = {
    contextRoot: makeFakeEl(),
    toolBelt: makeFakeEl(),
    toolHint: makeFakeEl(),
    economyStats: makeFakeEl(),
    legacyButtons: [makeFakeEl(), makeFakeEl()],
    millPanel: makeFakeEl(),
  };
  applyHudPolicyToDom(hudPolicy(getPlaceDefinition('court'), 'court'), els);
  assert.equal(els.contextRoot.dataset.hudContext, 'social');
  for (const el of [els.toolBelt, els.toolHint, els.economyStats, ...els.legacyButtons, els.millPanel]) {
    assert.equal(el.hidden, true, 'hidden attribute removes the control from layout and tab order');
  }

  applyHudPolicyToDom(hudPolicy(null, 'garden:guest_1'), els);
  assert.equal(els.contextRoot.dataset.hudContext, 'legacy');
  assert.equal(els.toolBelt.hidden, false);
  assert.equal(els.economyStats.hidden, false);
  assert.equal(els.millPanel.hidden, true, 'the mill panel never leaves the market');
});

test('applying the policy tolerates missing DOM nodes', () => {
  const policy = hudPolicy(getPlaceDefinition('theater'), 'theater');
  assert.doesNotThrow(() => applyHudPolicyToDom(policy, {}));
  assert.doesNotThrow(() => applyHudPolicyToDom(policy, { toolBelt: null, legacyButtons: [null, undefined] }));
});

// --- keyboard walk: social → personal garden → Theater --------------------

test('keyboard walk across contexts: hidden tools stay unreachable, digits follow the wheel', () => {
  const els = {
    contextRoot: makeFakeEl(),
    toolBelt: makeFakeEl(),
    toolHint: makeFakeEl(),
    economyStats: makeFakeEl(),
    legacyButtons: [makeFakeEl(), makeFakeEl()],
  };
  let tool = 'hoe';
  let remembered = null;

  const travel = (place, roomId) => {
    const policy = hudPolicy(place, roomId);
    applyHudPolicyToDom(policy, els);
    const next = nextToolState({ policy, currentTool: tool, rememberedTool: remembered });
    tool = next.tool;
    remembered = next.rememberedTool;
    return policy;
  };
  const pressDigit = (code, emoteWheelOpen) => toolForDigit(code, {
    enabled: els.contextRoot.dataset.hudContext === 'legacy',
    emoteWheelOpen,
  });

  // Social: the belt is gone from the tab order and digits do nothing.
  travel(getPlaceDefinition('theater'), 'theater');
  assert.equal(els.toolBelt.hidden, true);
  assert.equal(pressDigit('Digit2', false), null, 'no tool equip in a social place');
  assert.equal(pressDigit('Digit2', true), null, 'no tool equip while the emote wheel is open');

  // Personal garden via Legacy areas: controls return and the tool is restored.
  travel(null, 'garden:guest_9');
  assert.equal(els.toolBelt.hidden, false);
  assert.equal(els.legacyButtons[0].hidden, false);
  assert.equal(tool, 'hoe', 'the garden restores the remembered tool');
  assert.equal(pressDigit('Digit4', false), 'water', 'tool digits work in the garden');
  assert.equal(pressDigit('Digit4', true), null, 'but the emote wheel still owns the numbers');

  // Back to The Orpheum: the belt hides again, hands return, wheel rules hold.
  travel(getPlaceDefinition('theater'), 'theater');
  assert.equal(els.toolBelt.hidden, true);
  assert.equal(tool, 'hands');
  assert.equal(remembered, 'hoe');
  assert.equal(pressDigit('Digit6', true), null);
});

// --- marketModal visibility seam (injected document) ----------------------

function createFakeDocument() {
  const registry = new Map();
  const bySelector = new Map();
  function makeEl(tag = 'div') {
    return {
      tag,
      children: [],
      dataset: {},
      style: {},
      hidden: false,
      open: false,
      textContent: '',
      innerHTML: '',
      className: '',
      handlers: {},
      classList: { toggle() {}, add() {}, remove() {} },
      append(...kids) { this.children.push(...kids); },
      addEventListener(type, fn) { (this.handlers[type] ??= []).push(fn); },
      setAttribute() {}, getAttribute() { return null; },
      focus() {},
      showModal() { this.open = true; },
      close() {
        this.open = false;
        for (const fn of this.handlers.close ?? []) fn();
      },
      querySelector() { return null; },
    };
  }
  return {
    body: makeEl('body'),
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeEl());
      return registry.get(id);
    },
    querySelector(selector) {
      if (!bySelector.has(selector)) bySelector.set(selector, makeEl());
      return bySelector.get(selector);
    },
    querySelectorAll() { return []; },
    createElement(tag) { return makeEl(tag); },
  };
}

test('an inventory snapshot refreshes cached values without revealing hidden panels', async () => {
  const { UIManager } = await import('../src/ui/marketModal.js');
  const fakeDocument = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = fakeDocument;
  try {
    const ui = new UIManager({ send() {}, on() {} }, {});
    const player = {
      nickname: 'MossyRadish42',
      coins: 77,
      reputation: 12,
      level: 3,
      xp: 240,
      inventory: { seeds: { radish: 1 }, produce: {} },
      materials: {},
    };

    // The Orpheum: stats pills are hidden, yet a snapshot still caches values.
    ui.hudPolicyProvider = () => hudPolicy(getPlaceDefinition('theater'), 'theater');
    ui.updatePlayerHUD(player);
    const statsRow = fakeDocument.querySelector('.player-stats-row');
    assert.equal(statsRow.hidden, true, 'the header stats row stays hidden in a social place');
    assert.equal(fakeDocument.getElementById('hud-coins').textContent, '77 ⛁', 'values stay cached for legacy contexts');
    assert.equal(fakeDocument.getElementById('inv-player-summary').textContent.includes('77 ⛁'), true,
      'the legacy satchel keeps showing progression inside its dialog');
    assert.equal(fakeDocument.getElementById('hud-nick').textContent, 'MossyRadish42');

    // A burst of inventory messages cannot reopen what the policy hid.
    ui.updatePlayerHUD({ ...player, coins: 80 });
    assert.equal(statsRow.hidden, true);
    assert.equal(fakeDocument.getElementById('hud-coins').textContent, '80 ⛁');

    // A legacy context (Market Court) shows the pills again.
    ui.hudPolicyProvider = () => hudPolicy(null, 'market');
    ui.updatePlayerHUD(player);
    assert.equal(statsRow.hidden, false);

    // No policy provider at all: the seam stays inert (never reveals).
    ui.hudPolicyProvider = null;
    ui.updatePlayerHUD(player);
    assert.equal(statsRow.hidden, false, 'the last explicit policy decision stands');
  } finally {
    globalThis.document = previousDocument;
  }
});

test('legacy dialogs open labeled as optional legacy in social places, plainly in legacy ones', async () => {
  const { UIManager } = await import('../src/ui/marketModal.js');
  const fakeDocument = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = fakeDocument;
  try {
    const ui = new UIManager({ send() {}, on() {} }, {});
    ui.hudPolicyProvider = () => hudPolicy(getPlaceDefinition('theater'), 'theater');
    ui.openInventory();
    const inventoryTag = fakeDocument.querySelector('#inventory-dialog .modal-header-tag');
    assert.match(inventoryTag.textContent, /^OPTIONAL LEGACY/, 'I opens as an optional legacy inventory');
    assert.equal(fakeDocument.getElementById('inventory-dialog').open, true);

    ui.openMarket();
    const marketTag = fakeDocument.querySelector('#market-dialog .modal-header-tag');
    assert.match(marketTag.textContent, /^OPTIONAL LEGACY/, 'M opens as the legacy exchange with a clear label');

    ui.hudPolicyProvider = () => hudPolicy(null, 'market');
    ui.openMarket();
    assert.equal(marketTag.textContent.includes('OPTIONAL LEGACY'), false,
      'the Market Court keeps its own trading labels');
  } finally {
    globalThis.document = previousDocument;
  }
});

test('closing a legacy dialog reports back so held keys and jump momentum reset', async () => {
  const { UIManager } = await import('../src/ui/marketModal.js');
  const fakeDocument = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = fakeDocument;
  try {
    const closures = [];
    const ui = new UIManager({ send() {}, on() {} }, {
      onLegacyDialogClosed: () => closures.push('closed'),
    });
    ui.openInventory();
    fakeDocument.getElementById('inventory-dialog').close();
    fakeDocument.getElementById('market-dialog').close();
    assert.deepEqual(closures, ['closed', 'closed'], 'each dialog close is reported to the game');
  } finally {
    globalThis.document = previousDocument;
  }
});
