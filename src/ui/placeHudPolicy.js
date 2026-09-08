/**
 * Place-context HUD policy (deemphasize-legacy-farming, decision F1).
 *
 * A pure presentation policy: given the active place's definition (from the
 * shared manifest) and its room id, it returns which HUD sections are visible
 * and which shortcut scope applies. Social places lead with place identity,
 * people, chat, emotes and travel; farming tools and coin progression step
 * back. Legacy contexts — the Market Court, the personal garden and the old
 * biomes — keep the full gardener HUD. Nothing here issues domain commands,
 * edits balances or renames DOM ids: it only decides visibility, shortcuts,
 * tool visuals and copy.
 *
 * Classification is metadata-driven, never a hardcoded list of social ids:
 * a place is social when its manifest entry says `social.featured` or when
 * its kind is a gathering `venue` (The Orpheum today; the Rain Court; any
 * future featured place appends to the manifest and is classified without a
 * code change here). The Market Court and personal gardens are identified by
 * their stable room ids, matching the place runtime's own resolution. A
 * place with unknown or missing metadata falls back to the safe social
 * default: farming controls stay hidden until the manifest says otherwise.
 *
 * The optional saved presentation preference (`afterlight-legacy-ui-v1`)
 * rolls the whole table back to the legacy presentation. Reading it never
 * throws and never rewrites storage: a malformed stored value is ignored for
 * the session, and unavailable storage simply keeps the choice session-local.
 */

import { ROOMS } from '../../shared/protocol.js';

/** Storage key for the reversible legacy-presentation preference (F2). */
export const LEGACY_UI_PREF_KEY = 'afterlight-legacy-ui-v1';

export const HUD_CONTEXTS = Object.freeze({
  SOCIAL: 'social',
  LEGACY: 'legacy',
});

/** Digit shortcuts to tools; the emote wheel owns these keys while open. */
export const TOOL_DIGIT_MAP = Object.freeze({
  Digit1: 'hands',
  Digit2: 'hoe',
  Digit3: 'seed',
  Digit4: 'water',
  Digit5: 'harvest',
  Digit6: 'sprinkler',
});

const defaultStorage = () => (typeof localStorage !== 'undefined' ? localStorage : null);

/**
 * Read the saved legacy-presentation preference. Only the exact strings
 * 'on'/'off' are meaningful; anything else (or unavailable storage) falls
 * back to the social-default presentation for this session without touching
 * the stored value.
 */
export function readLegacyUiPreference(storage = defaultStorage()) {
  try {
    const raw = storage?.getItem(LEGACY_UI_PREF_KEY);
    return raw === 'on' ? true : false;
  } catch {
    return false;
  }
}

/**
 * Persist the preference. Returns true when it was stored; a storage failure
 * keeps the choice session-local and reports false (the caller must not
 * pretend otherwise).
 */
export function writeLegacyUiPreference(value, storage = defaultStorage()) {
  try {
    storage?.setItem(LEGACY_UI_PREF_KEY, value ? 'on' : 'off');
    return true;
  } catch {
    return false;
  }
}

function isPersonalGarden(roomId) {
  return typeof roomId === 'string' && ROOMS.isGarden(roomId);
}

/**
 * Social versus legacy classification for one room. Personal gardens and the
 * Market Court are legacy contexts by id; manifest places by their social
 * metadata; anything unknown defaults to social so farming controls never
 * surface on metadata the policy cannot vouch for.
 */
export function hudContextFor(place, roomId) {
  if (isPersonalGarden(roomId)) return HUD_CONTEXTS.LEGACY;
  if (roomId === ROOMS.MARKET) return HUD_CONTEXTS.LEGACY;
  if (!place || typeof place !== 'object') return HUD_CONTEXTS.SOCIAL;
  const social = place.social;
  if (!social || typeof social !== 'object') return HUD_CONTEXTS.SOCIAL;
  if (social.featured === true || place.kind === 'venue') return HUD_CONTEXTS.SOCIAL;
  return HUD_CONTEXTS.LEGACY;
}

function freezePolicy(policy) {
  return Object.freeze({
    ...policy,
    sections: Object.freeze({ ...policy.sections }),
    shortcuts: Object.freeze({ ...policy.shortcuts }),
    tools: Object.freeze({ ...policy.tools }),
    copy: Object.freeze({ ...policy.copy }),
  });
}

/**
 * The F1 contextual presentation table for one place.
 *
 * @param {*} place   The place definition from the shared manifest (or null
 *                    for market / personal garden / unknown rooms).
 * @param {?string} roomId The resolved room id.
 * @param {{ legacyUi?: boolean }} [options] When `legacyUi` is true (the
 *                    saved presentation preference), every place gets the
 *                    legacy presentation back — the reversible rollback path.
 * @returns {Readonly<{context, placeId, sections, shortcuts, tools, copy}>}
 */
export function hudPolicy(place, roomId, { legacyUi = false } = {}) {
  const social = !legacyUi && hudContextFor(place, roomId) === HUD_CONTEXTS.SOCIAL;
  const context = social ? HUD_CONTEXTS.SOCIAL : HUD_CONTEXTS.LEGACY;
  const personalGarden = isPersonalGarden(roomId);

  return freezePolicy({
    context,
    placeId: typeof roomId === 'string' ? roomId : null,
    // Which HUD sections are visible in this context. DOM ids stay exactly
    // as shipped so marketModal state consumers keep working; hidden
    // sections only stop being presented.
    sections: {
      // Tool belt / active seed buttons and the companion tool hint.
      toolBelt: !social,
      toolHint: !social,
      // Coins / reputation / level+XP pills in the header.
      economyStats: !social,
      // The footer Satchel (I) and Market (M) buttons; the shortcuts remain.
      legacyButtons: !social,
      // The Great Mill progress panel stays a Market Court feature; the
      // updateMillPanel seam already enforces the room part.
      millPanel: !social && roomId === ROOMS.MARKET,
    },
    shortcuts: {
      // 1–6 equip tools only in legacy contexts; the emote wheel always
      // outranks them while it owns input (see toolForDigit).
      toolDigits: !social,
      // Legacy access is retained everywhere: I and M still open their
      // dialogs (labeled optional legacy in social places), T stays Places,
      // V and Enter/chat are untouched.
      inventory: true,
      market: true,
      travel: true,
      emotes: true,
      chat: true,
    },
    tools: {
      // Entering a social place clears the held visual tool to hands and
      // remembers it; the personal garden restores the remembered tool on
      // re-entry. Purely visual state — inventory data is never read,
      // written or mutated by either move.
      clearOnEntry: social,
      restoreOnEntry: personalGarden,
    },
    copy: {
      // Someone arriving in a social place is a visitor, not a gardener.
      visitorArrival: social ? 'A Visitor Arrived' : 'Gardener Arrived',
      noTargetHint: social
        ? 'Walk up to a seat or a gateway — or chat, emote, or pick a place to travel.'
        : 'Approach a garden bed, market stall, or gateway to interact.',
      // Idle action-panel hint for social places; null keeps the legacy
      // room-specific copy (market stalls, garden beds, sector exploring).
      idleActionHint: social ? 'Sit, emote, chat — or press T to travel' : null,
    },
  });
}

/**
 * Resolve a Digit1–6 keydown to a tool name under the active policy. The
 * emote wheel's capture-phase handler consumes these keys first while it is
 * open, and this guard is the second line of defense: number keys must never
 * equip a farming tool behind the wheel's back.
 */
export function toolForDigit(code, { enabled = false, emoteWheelOpen = false } = {}) {
  if (!enabled || emoteWheelOpen) return null;
  return TOOL_DIGIT_MAP[code] ?? null;
}

/**
 * The presentation-only tool transition between places: what the avatar's
 * hands should hold after entering the new place, and what to remember for
 * the personal garden's restore. Returns plain data; applying it is the
 * caller's setTool-equivalent, and no inventory structure is touched.
 */
export function nextToolState({ policy, currentTool = 'hands', rememberedTool = null }) {
  if (policy?.tools?.clearOnEntry) {
    return {
      tool: 'hands',
      rememberedTool: currentTool && currentTool !== 'hands' ? currentTool : (rememberedTool ?? null),
    };
  }
  if (policy?.tools?.restoreOnEntry && rememberedTool && rememberedTool !== 'hands') {
    return { tool: rememberedTool, rememberedTool: null };
  }
  return { tool: currentTool, rememberedTool: rememberedTool ?? null };
}

/**
 * Apply a policy to the HUD DOM. Every element is injected, so headless
 * tests drive this exact function with plain fakes; absent elements are
 * skipped (the browser HUD may be missing a node without breaking travel).
 * Only the context root's data attribute and the sections' `hidden` flags
 * are touched — attribute-driven CSS plus `hidden` remove hidden controls
 * from layout and tab order together, at context changes only.
 */
export function applyHudPolicyToDom(policy, elements = {}) {
  const { contextRoot, toolBelt, toolHint, economyStats, legacyButtons, millPanel } = elements;
  if (contextRoot) contextRoot.dataset.hudContext = policy.context;
  if (toolBelt) toolBelt.hidden = !policy.sections.toolBelt;
  if (toolHint) toolHint.hidden = !policy.sections.toolHint;
  if (economyStats) economyStats.hidden = !policy.sections.economyStats;
  // legacyButtons may be one element or a list (the Satchel and Market
  // footer buttons share one policy row).
  const buttons = legacyButtons == null ? [] : (Array.isArray(legacyButtons) ? legacyButtons : [legacyButtons]);
  for (const button of buttons) {
    if (button) button.hidden = !policy.sections.legacyButtons;
  }
  if (millPanel) millPanel.hidden = !policy.sections.millPanel;
  return policy;
}
