# Implementation tasks — deemphasize-legacy-farming

Planning only: every checkbox is intentionally unchecked. Read design.md and ../add-social-place-framework/program.md first. Complete prerequisites before starting; each task depends on earlier tasks in this file unless explicitly stated. New paths below are proposed files to create, not claims they already exist. Commands run from repository root except `mix ...`, which runs from server_elixir. Preserve unrelated working changes.

## 1. Context policy and accessible controls

- [x] 1.1 Define and test social versus legacy HUD policy

  - **Goal:** Define and test social versus legacy HUD policy
  - **Files/symbols:** new src/ui/placeHudPolicy.js and tests/place-hud-policy.test.js
  - **Reuse:** A immutable place kind/legacy/capability metadata; F1 table.
  - **Required behavior:** Return explicit sections/shortcut policy for Theater, court, Desert, rooftops, market, public garden and personal garden; retain I/M legacy access, T Places; hide social coin/tool progression and clear held visual tool only.
  - **Architecture constraints:** Policy is presentation only, no domain commands/balance edits; retain original DOM IDs for state consumers.
  - **Failure/cleanup:** Unknown/missing metadata uses safe social defaults; malformed saved UI preference session fallback.
  - **Tests:** Truth table tests: inventory snapshot cannot reveal hidden panels, number keys respect emote wheel, garden tool restore does not mutate inventory.
  - **Verify:** node --test tests/place-hud-policy.test.js
  - **Done when:** Each F1 row has a testable contextual outcome and all original data paths remain intact.
  - **Do not change:** No disabling garden jobs/actions or changing crop/economy rules.

- [x] 1.2 Apply contextual HUD and keyboard focus without changing game flow

  - **Goal:** Apply contextual HUD and keyboard focus without changing game flow
  - **Files/symbols:** index.html/src/style.css; main setTool/key handlers/room activation; marketModal updatePlayerHUD visibility seam
  - **Reuse:** Existing DOM dialogs, emote capture-phase handler and A activation notification.
  - **Required behavior:** Apply data attributes/hidden/inert from policy only at context changes; clear visual watering can in social places; primary buttons place/emotes/chat; label optional legacy M/I dialogs and retain direct links/Legacy areas.
  - **Architecture constraints:** No site navigation, hotkey remap, new UI framework or forced close of Theater screen.
  - **Failure/cleanup:** Hidden elements removed from tab order; closing dialogs returns focus, held keys/jump reset; async inventory messages do not reopen UI.
  - **Tests:** Extend tests/place-hud-policy.test.js with injected DOM or production browser harness; keyboard walk social→garden→Theater with open/close and emote numbers.
  - **Verify:** node --test tests/place-hud-policy.test.js tests/place-travel.test.js; npm run build
  - **Done when:** Primary social HUD is uncluttered, legacy controls remain accessible, focus cannot reach hidden tools.
  - **Do not change:** No overwrite of user-added index icons/manifests/config or original market state handlers.

## 2. Non-destructive documentation and regression

- [x] 2.1 Reconcile product copy and migration disposition

  - **Goal:** Reconcile product copy and migration disposition
  - **Files/symbols:** README.md/AGENTS.md/docs/places.md; architecture/elixir ownership status notes where stale
  - **Reuse:** A program.md actual change matrix; F2/F3; current routing and evidence at implementation.
  - **Required behavior:** Describe beautiful shared places and only accepted destinations; correct T/M controls and supported Phoenix topology; remove advice to delete catalog originals; document P6 continue-correctness/reduced-product-scope and unfinished production gates.
  - **Architecture constraints:** Never claim all Node writers retired or P6 production import complete from checkbox status alone; no edits to upstream completed-task counts.
  - **Failure/cleanup:** Retain historical docs as dated history where useful; link current authority map; rollback UI copy without data migration.
  - **Tests:** Documentation link/path/command check; inspect P6 remaining tasks and actual route flags; ensure no runtime source or data changes slipped into doc task.
  - **Verify:** git diff --check; openspec validate deemphasize-legacy-farming --strict
  - **Done when:** Docs accurately distinguish product pivot, actual backend authority and retained legacy progress; no instruction permits original snapshot deletion.
  - **Do not change:** No production import/export execution, table drops or archive of incomplete P6.

- [x] 2.2 Verify reversible legacy access and social experience

  - **Goal:** Verify reversible legacy access and social experience
  - **Files/symbols:** tests/place-hud-policy.test.js; this change evidence/; shared browser verification checklist
  - **Reuse:** Existing save fixtures, legacy garden/market controls and A Theater/travel checks.
  - **Required behavior:** Run social HUD, Legacy navigation, I/M access, garden tools, emotes, Theater cinema and settings walkthrough on normal/narrow viewports; compare original snapshot hashes read-only and save sibling fields with disposable fixtures.
  - **Architecture constraints:** UI demotion does not modify shared values; test stack disposable; full tests needed for changed input behavior.
  - **Failure/cleanup:** Disable policy and prove legacy presentation returns without restoring data; storage denial does not block game.
  - **Tests:** Full JS/build and targeted browser cases; preserve existing garden/economy tests unchanged.
  - **Verify:** npm test; npm run build; git diff --check
  - **Done when:** Evidence shows saved progress/legacy access survive and new primary identity is social; rollback affects presentation only.
  - **Do not change:** No live market transactions or data cleanup to simplify testing.
