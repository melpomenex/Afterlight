# Evidence — deemphasize-legacy-farming (tasks 2.1, 2.2)

Session date: 2026-09-07. Scope of this session: tasks 2.1 (documentation
reconciliation) and 2.2 (verification). Tasks 1.1–1.2 were completed by an
earlier session. Another agent was concurrently implementing change B
(add-atmosphere-weather-system tasks 3.1–3.3, `src/atmosphere/**`,
`src/districts.js`, `src/main.js` frame wiring); no contention was observed —
the full suites below passed as-is.

## Task 2.1 — product copy and migration disposition (docs only)

Files changed: `README.md`, `AGENTS.md`, `docs/places.md` (all pre-existing
working-tree modifications were preserved; nothing outside docs was touched;
no runtime source or data change slipped in — the only code-adjacent file
this session edited is the additive test listed under 2.2).

What the docs now say:

- **Product identity.** README leads with "a collection of beautiful shared
  places on the internet"; accepted destinations are named as exactly the
  places the manifest flags `featured` today — The Orpheum (`theater`) and
  The Rain Court (`court`). Planned places (Desert Camp, rooftop rework) are
  described as future/planned only, never listed as destinations. AGENTS §1
  carries the same identity and the demotion-not-deletion rule.
- **Legacy framing.** The former "Core Gameplay Loop" is retitled "The legacy
  gardener's loop (retained content)" and the 17-district section "Legacy
  districts & restoration": retained, playable, defining no social objective.
- **Controls.** T = Places, M = Market Exchange, I = Satchel, V = emotes
  (hold-V wheel), G = booth; the new "Contextual HUD" paragraph documents the
  social/legacy presentation, the labeled "optional legacy" I/M dialogs,
  tool digits scoped to legacy contexts, the emote wheel's number-key
  priority, and the reversible Settings → "Legacy gardener HUD" switch
  (preference `afterlight-legacy-ui-v1`, presentation-only).
- **Transport.** Supported topology is the Phoenix gateway + Node specialty
  sidecar (`npm run dev:stack`); legacy Node-only transport deprecated
  (removal 2026-12-01). This preserves change A's corrections; F extends, it
  does not rewrite them.
- **No delete advice.** The README instruction to "delete those files to
  reset" the catalog originals (`data/iptv.json`, `data/epg.json`) is
  removed; the torrent bullet now distinguishes the regenerable
  downloaded-payload cache under `data/torrents/` from the never-deleted
  snapshot files. A repo grep confirms no doc advises deleting originals.
- **P6 disposition (F2), truthful status.** README's "Architecture & Server
  Authority" now points at the authority map
  (`docs/architecture/elixir/ownership.md`, §5) and states that the
  market-garden domains are still written by the legacy Node engine through
  the transitional gateway relay until the P6 cutover; the migration
  continues as compatibility/correctness work (import, transaction/
  concurrency proof, operator cutover still open) with reduced product
  scope, and must never be presented as finished. AGENTS stack paragraph
  adds the same rule (checkbox completion elsewhere never proves P6).
- **Upstream respected.** No edits to any upstream change's task counts.
  Verified read-only against `add-ash-gardens-economy-restoration/tasks.md`:
  32/46 checked; sections 6 (import 6.1–6.4), 7 (transactions/concurrency
  7.1–7.5) and 9 (rehearsal/cutover 9.1–9.5) all unchecked at session start.
- **docs/places.md** gains §9 "Legacy fields, HUD context, and
  non-destructive migration": the objective/note tuple is optional legacy
  metadata (present-tuple-must-be-complete; the twelve legacy contracts stay
  intact), the HUD context follows manifest flags via
  `src/ui/placeHudPolicy.js` (no hardcoded id lists), and the
  never-destroy/never-claim-P6 rules with a pointer to the authority map.
- **Authority map audited, not edited.** `docs/architecture/elixir/` was
  inspected and is already truthful about P6 ("Still active via transitional
  sidecar relay", "Until P6 Phoenix handlers land"); no stale claim found, so
  no edits were made there.

Verification (all pass):

- `git diff --check` — clean.
- `openspec validate deemphasize-legacy-farming --strict` — valid.
- Command/path sanity: every command mentioned in the edited docs exists in
  `package.json` scripts (`dev:stack`, `server`, `server:elixir`,
  `dev:phoenix`, `dev`, `test`, `build`, `preview`, `verify:gateway`,
  `verify:world`, `verify:chat`, `verify:p11`, `p11:snapshot-hashes`), and
  every referenced file/script exists (`scripts/theater-streaming-smoke.mjs`,
  `scripts/theater-streaming-pass.md`, `scripts/export-place-definitions.mjs`,
  `docs/architecture/elixir/ownership.md`, `server_elixir/README.md`,
  all `src/`+`tests/` files named in the docs, `server_elixir/priv/place_definitions.json`).

## Task 2.2 — reversible legacy access and social experience (automatable portion)

Commands and results:

- `node --test tests/place-hud-policy.test.js tests/place-travel.test.js`
  — 32 pass / 0 fail (31 pre-existing + 1 added this session).
- `npm test` — 529 tests, 529 pass / 0 fail. Existing garden/economy tests
  (`tests/crops.test.js`, `tests/economy.test.js`,
  `tests/gardens_persistence.test.js`, `tests/orderbook.test.js`,
  `tests/contracts.test.js`, `tests/crafting_gathering.test.js`) ran
  unchanged and green.
- `PATH="$HOME/.cargo/bin:$PATH" npm run build` — success in 2.59 s; only the
  known non-fatal >500 kB chunk warning (documented in AGENTS.md §3).
- `git diff --check` — clean.

Test extension (additive, `tests/place-hud-policy.test.js`): one new test,
"boot composition: a saved preference restores legacy presentation; storage
denial boots social". It closes the only gap found: previously the flip
(`legacyUi: true`) and the storage-denial fallbacks were tested separately;
now the composed boot path is pinned — a stored `afterlight-legacy-ui-v1` of
`'on'` rolls every place (Theater and the personal garden) back to the legacy
presentation (mill panel stays market-only even in rollback), while a
throwing storage at boot reads as `false` and the game boots into the social
presentation session-locally, and the flip remains reversible with no data
writes in the path.

Reversibility evidence covered by the suite (disposable in-memory fixtures
only; no real `data/` file and no real profile localStorage touched):

- Policy flip restores every hidden section, tool digits, and tool semantics
  without writes (pure policy tests; DOM application via injected elements).
- Storage-denial/session-fallback on read and write; malformed values ignored.
- Inventory/welcome snapshots update cached values but cannot reveal hidden
  panels (`updatePlayerHUD` re-asserts visibility from the policy).
- Keyboard walk social → personal garden → Theater: hidden sections leave the
  tab order, digits follow the emote wheel, garden restores the remembered
  tool, inventory is byte-identical throughout.

Original snapshot hashes (read-only `sha256sum`, before and after the whole
session — identical):

```
4e7882612fd628886e02ddd518c639b052a3034dcf0cd00924393301e41e3a36  data/game-state.json
504ba03f5335e16e76b3da1105d23f7e2e8d574887fbcd3953fe66af3968c205  data/iptv.json
cb9ad858fd5f2c87cfc7c374a2e411d42add90ca4dc5526b21ef7e29918a2ad0  data/epg.json
```

## Not verified here — pending orchestrator browser walkthrough

This session had **no browser tool**. The following required behaviors of
task 2.2 are therefore **recorded as unverified** and remain for the
orchestrator's interactive pass (dev stack already running: Vite :5173,
Phoenix :4000; use disposable/guest identities, never the live market state):

- Interactive walkthrough: enter a social place (The Orpheum) → observe the
  social HUD (tool belt, coins/XP pills, Satchel/Market footer buttons, mill
  panel hidden; hands instead of a held tool) → open I and M and confirm the
  "optional legacy" labels → travel to the personal garden from Legacy areas
  and confirm tools/stats return and the remembered tool is restored →
  return to the Theater → toggle Settings → "Legacy gardener HUD" and
  confirm the full legacy presentation returns instantly everywhere →
  toggle back.
- Emote wheel over number keys in each context; keyboard Tab walk confirming
  focus never enters hidden controls; dialog close returns focus and resets
  held keys.
- The same at a narrow viewport (≤560–930 px bands) checking panel overlap
  and dialog scrolling.
- Reload persistence: the preference and the save survive reload; snapshot
  hashes unchanged after the interactive session.

## Honest limits

- No production import/export, cutover, table change or live transaction was
  executed or simulated; no `data/` file was written (hashes above).
- The full `npm test` run passed on the first try despite change B running
  concurrently; no scoped rerun was necessary.
- docs/places.md and tests/place-hud-policy.test.js are untracked new files
  from earlier sessions of this program; this session only extended them
  additively. No git write operations were performed.
