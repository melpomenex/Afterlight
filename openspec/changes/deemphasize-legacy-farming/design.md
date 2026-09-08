# Legacy farming presentation transition

## Context

See A program.md for the ownership conflict. main.js exposes tools1–6, I inventory, M market everywhere; marketModal updates balances/tool HUD; Travel puts Market and personal garden first; arrival/action copy says gardener/crops. index.html carries primary garden identity and controls. README gives mutually inconsistent transport claims and says catalog originals may be deleted. P6 is 32/46, including incomplete import/concurrency/production ceremony. Product demotion must not delete valuable state or present incomplete migration as finished.

## Goals / Non-Goals

Social places become the primary product identity; legacy users can still tend gardens/trade/read notes. No economy-rule change, job shutdown, schema/table/data deletion, personal garden access removal, transport configuration flip or automatic OpenSpec archiving. Migration infrastructure is still useful independently of farming's prominence.

## Decisions

### F1 — Contextual presentation table

Add **src/ui/placeHudPolicy.js** pure `hudPolicy(place,roomId)` returning visible sections and shortcut scope; main applies via data attributes/hidden and guards key handlers. Reuse A manifest and selector; do not fork navigation. Keep all existing DOM IDs/marketModal state consumers so arriving inventory snapshots can update cached data safely. Use `hidden`/inert as appropriate, not invisible keyboard-focusable controls.

| Current entry | Social place behavior | Legacy behavior |
|---|---|---|
| Market/garden first Travel cards | A featured social section first; Legacy areas expandable with explicit names | Market and personal garden still selectable, deep links work |
| Tool belt / active seed / watering can | Hide belt, set visual hands on entry, Digit1–6 ignored unless emote wheel owns them | Personal garden restores chosen tool when re-entered; no inventory mutation |
| Coins/xp/level/reputation | Hidden from primary social HUD | Visible inside inventory/market/profile legacy contexts |
| I / inventory footer | No primary footer button; I opens existing inventory labeled optional legacy inventory | Preserved |
| M / exchange footer | Remove primary social footer action; M still opens legacy exchange with clear label | Existing trading in market remains; no new remote authorization |
| T / Travel | Label Places, no hotkey remap | Same selector includes legacy destinations |
| Mill progress panel | Not shown in social rooms | Remains market-only with live server data |
| Restoration HUD/completion badges | Never a compulsory social objective; optional legacy status in expanded areas/details | Existing biome landmarks, field notes, idempotence, completion visuals persist |
| Material-node caches | No new nodes in C/D/E | Existing foundry/trestle/frost-spire nodes stay |
| Generic no-target, arrival, loading/help copy | Person/visitor, places, sit/emote/chat/travel | Contextually accurate tools/crops guidance in garden |
| Weather display | B active place caption | Agricultural weather retained for legacy garden context |

Preserve current Theater default/cinema/booth/watchbar, compact full-screen HUD, Kiln, emote wheel capture-phase priority and chat-input focus. No site navigation bar. Do not remove user-added icons/manifests or change deployment configuration while editing index.html.

### F2 — P6 disposition and data boundary

Recommend **continue P6 as compatibility and data correctness, reduce future product scope**. Its remaining import/hash/validation/reverse-export, transaction/concurrency/outbox tests and operator cutover remain mandatory before claiming production migration. Do not cancel those because the garden button is hidden. Do not split its authority group or stop the crop tick here: that changes persisted progression and needs a later explicit sunset contract. Defer follow-up farming enhancements (offline moisture catch-up, expanded economic gameplay) outside this program; correctness fixes affecting existing value retain their own priority. No pending tasks are checked off or archived by F.

If a later product decision retires farming entirely, create a separate destructive-sunset proposal specifying export/retention, outstanding escrow/orders, user access, crop-time handling and read-only APIs. F is not that proposal. Original game-state/iptv/epg snapshots remain immutable; sidecar cache ownership unchanged. Only add presentation preference key `afterlight-legacy-ui-v1`, preserving all existing keys and sibling fields.

### F3 — Documentation reconciliation

README lead becomes the social-world north star and accepted flagship destinations; list future places as planned only until accepted. Update controls from actual main.js (T Places, M legacy exchange), not stale AGENTS M guidance. State supported Phoenix+Node-specialty topology from current routing and observed environment configuration; don't assert P6 production ceremony happened. Remove README instructions to delete originals and distinguish regenerable torrent payload cache from library/snapshot data. AGENTS updates describe actual modules after A/B land and conditional instructions for legacy objective builders; preserve verification, data policy and Theater media guarantees. docs/places.md gets optional legacy fields and non-destructive migration notes. This change does not silently edit previous proposals to claim different completion.

## Lifecycle, failure and accessibility

HUD policy derives on every successful place activation, not on unrelated inventory message arrival; messages must not make hidden coin/tool panels reappear. Close returns keyboard focus to game. Hidden sections are removed from tab order; native dialogs and scroll remain accessible at narrow sizes. localStorage failure keeps preferences session-local. Backend failures show existing action errors without altering balances. Turning a presentation flag off restores legacy UI and performs no writes to shared state.

## Risks / Trade-offs

[Users think saved progress disappeared] → labeled Legacy areas and direct-link preservation, no migration toast claiming deletion. [Hidden controls still receive focus] → DOM tests and keyboard walkthrough. [Backend status is stale] → inspect routing/evidence at implementation, report actual state; never edit configs to make docs true. [P6 appears obsolete] → explicit continue-correctness disposition, no archiving.

## Migration Plan

Pure HUD policy/tests → contextual DOM/shortcut wiring → copy/help/docs → legacy and social browser walkthrough with existing save fixture. Rollback presentation module/styles only. Verify data files unchanged by diff/hash before and after the UI exercise on disposable test data; never run imports or production mutations for this change.
