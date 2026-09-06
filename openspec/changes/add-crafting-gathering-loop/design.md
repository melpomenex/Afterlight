## Context

The server already owns the patterns this change extends: gardens are per-player server state with validated actions and file persistence (`server/gardens.js`, `server/storage.js`), the economy prices commodities dynamically (`server/economy.js`, `shared/economy.js`), and the client renders districts from definitions with static batching plus dynamic subgroups (`src/districts.js`, AGENTS.md §7). Presence/rooms are per-district; the Market Court is the shared room. See proposal.md — Why. This change assumes `fix-presence-race` is applied.

## Goals / Non-Goals

**Goals:**
- One braided loop: biomes produce materials → the court's machine shop converts materials + crops into value → farming tools improve.
- All economically meaningful state (materials, nodes, machines, sprinklers) is server-authoritative and persisted additively.
- Reuse existing interaction, persistence, pricing, and batching patterns; no new frameworks.

**Non-Goals:**
- Gating recipes on biome landmark completion (requires migrating client-side exploration saves server-side — its own change).
- More machines beyond the Great Mill, more materials beyond the first three, weather/seasons, player-to-player item trading.

## Decisions

- **Materials live on the player object (`player.materials`), not a parallel store.** Mirrors how crops occupy inventory; protocol inventory payloads gain an additive `materials` field. Alternative (separate materials ledger) rejected as a second thing to persist and sync.
- **Nodes are static per-district definitions with server-held depletion state** (`{nodeId, district, position, material, respawnMs}`; state `{depletedAt}`), following the garden-bed pattern: definitions in shared code, state on the server, client renders from server state sent on district entry. Positions are hand-placed inside existing walkable bounds with clear standing spots (AGENTS.md §6 contracts: interaction range < 2 units, click-clamp area).
- **Machines are a new server module beside gardens**, not part of `economy.js` — machines have restore/consume lifecycles, not pricing. State: `{mill: {status, contributed}}` in the world state file; contributions validated against remaining need and inventory atomically.
- **Flour gets no quality grades in this slice** — crops use C–A+ grades, but milling one wheat unit into one flour unit keeps the first recipe legible; contracts demand flour by quantity only. Revisit with more recipes.
- **Flour contracts generate only while the mill is restored.** Contract generation consults machine state; otherwise a pre-restore server would offer unfulfillable contracts. Alternative (allow flour NPC sale only, no contracts until restored) rejected — contracts are the demand signal that makes restoration worthwhile.
- **Flour price sits above its wheat input** in the base-price table so milling is net-positive before fees but not so profitable that raw-wheat contracts become obsolete; the existing bounded multiplier and mean reversion apply unchanged.
- **Sprinklers are garden fixtures with fixed adjacent-bed coverage** (the bed they occupy plus orthogonal neighbors), applied inside the existing server tick (`tickBed` moisture step). No free placement aiming; placement happens on a bed tile, which keeps collision and rendering trivial. Limit: a small maximum per garden (tunable constant) to bound tick cost.
- **Client rendering: nodes and mill states live in each world's dynamic subgroup**, explicitly excluded from the static instanced batch — they change visual state at runtime (depleted nodes, restored mill), and animating batched source meshes silently does nothing (AGENTS.md §7 failure mode). Node geometry is a small repeated prop family per material; the mill is the court's new landmark-class prop.

## Risks / Trade-offs

- [Save schema drift across `game-state.json` (machines, nodes, materials, sprinklers)] → all fields additive with defaults on read; persistence tests cover missing-field and corrupt-field cases like existing garden tests do.
- [Node farming via client trust] → every grant/conversion is a server-validated action; the client never simulates materials. Client-side exploration saves stay decorative in this slice, so they remain non-economic.
- [Restoration griefing] (a player contributing unwanted materials) → contributions are player-chosen and only accepted materials count; no way to deplete another player's stock.
- [Two players interacting with the same node/mill in the same tick] → process actions sequentially on the server (single-threaded event order as with beds); atomic validation prevents double grants.
- [Court visual clutter near existing landmarks] → mill placed against the existing court layout with clear approach space; verify occlusion from the isometric camera in a real screenshot before finishing.

## Migration Plan

Deploy behind nothing — features are additive and inert until players interact: a broken mill, full nodes, and empty material inventories harm nothing. Persistence migration is default-on-read. Rollback: revert; leftover `machines`/`nodes` fields in the state file are ignored by the previous reader only if it tolerates unknown fields — verify `server/storage.js` read path before merging, and add a strip-on-load if it does not.

## Open Questions

- Exact respawn interval and per-node yield (starting point: 1 unit, a few real minutes) — tune during verification, no spec impact.
- Whether mill contribution should later also accept coins as an alternative currency for players who prefer farming to gathering — deferred with the broader recipe-tree work.
