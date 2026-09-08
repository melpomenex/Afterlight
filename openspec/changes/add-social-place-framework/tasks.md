# Implementation tasks — add-social-place-framework

Planning only: every checkbox is intentionally unchecked. Read design.md and ../add-social-place-framework/program.md first. Complete prerequisites before starting; each task depends on earlier tasks in this file unless explicitly stated. New paths below are proposed files to create, not claims they already exist. Commands run from repository root except `mix ...`, which runs from server_elixir. Preserve unrelated working changes.

## 1. Definition and builder contracts

- [x] 1.1 Register immutable place metadata without changing legacy identity

  - **Goal:** Register immutable place metadata without changing legacy identity
  - **Files/symbols:** new shared/placeDefinitions.js and src/places/registry.js; src/districts.js districts/readExploration; src/world/bounds.js
  - **Reuse:** Existing 17 definitions and pure bounds helpers; A D1.
  - **Required behavior:** Move plain definitions behind compatible district re-export; retain IDs/order/seeds and existing notes/objectives; add kind/capabilities, explicit spawns, map paths, legacy classification and optional objective validation; tiny view fixture with smaller bounds.
  - **Architecture constraints:** No Three.js/DOM imports in shared definitions; no YAML, arbitrary builder function or user-defined URL in data.
  - **Failure/cleanup:** Invalid definition reports ID before build; bad storage normalizes without losing valid old progress.
  - **Tests:** new tests/place-definitions.test.js: duplicate/unknown builder, malformed optional objective, finite bounds, smaller view, old save and sibling-field retention; update districts metadata test to conditional contracts.
  - **Verify:** node --test tests/place-definitions.test.js tests/districts.test.js
  - **Done when:** All old IDs and exact seeds survive, new objective-free fixture builds through registry and bounds/minimap tests pass.
  - **Do not change:** No renaming court/rooftops/theater; no garden economy state/schema edits.

- [x] 1.2 Freeze legacy gate topology and make universal scenery optional

  - **Goal:** Freeze legacy gate topology and make universal scenery optional
  - **Files/symbols:** src/main.js getOrCreateDistrictWorld/mapPaths; src/districts.js buildDistrict; new src/places/worldFactory.js
  - **Reuse:** Existing gate shapes and DISTRICT_BUILDERS; A D1/D2.
  - **Required behavior:** Declare exact legacy west/east/south destinations before adding new definitions; shell legacy-urban reproduces old construction, shell none skips floor/walls/lamps and lets builder own them; return environment bindings and explicit owned-resource set.
  - **Architecture constraints:** Keep static batching, dynamic exclusions, screenQuad and material-node callbacks; no new generic world engine.
  - **Failure/cleanup:** Partially built worlds dispose only owned resources and stay hidden until activation.
  - **Tests:** new tests/place-worlds.test.js: 17-edge golden topology, seeds unchanged after appended fixture, unknown builder throw, shell-none lacks urban props, Theater quad/seats unchanged.
  - **Verify:** node --test tests/place-worlds.test.js tests/districts.test.js; npm run build
  - **Done when:** Appending fixture cannot reroute Theater or recolor legacy seeded scenery; both shells compile and build.
  - **Do not change:** No wholesale rewrite of existing biome builders or Theater geometry.

## 2. Travel and social interaction lifecycle

- [x] 2.1 Extract a tested transition coordinator around setRoom

  - **Goal:** Extract a tested transition coordinator around setRoom
  - **Files/symbols:** new src/places/runtime.js/travelState.js; src/main.js setRoom/frame/getOrCreateDistrictWorld
  - **Reuse:** Existing setRoom responsibilities, clearJumpMomentum, remotePlayers.clear and net.joinRoom; A D2.
  - **Required behavior:** Prepare before commit; reset nearest/keys/press/target/seat/jump/emote; assign typed garden-vs-district update inputs; safe player/Kiln placement; consistent HUD/canvas name/save; unknown URL falls back Theater.
  - **Architecture constraints:** One active runtime and existing rAF; preserve net.joinRoom interception by realtime; local readiness distinct from network acceptance.
  - **Failure/cleanup:** Builder rejection preserves prior room; async stale generation ignored; server join failure renders destination offline with shared actions disabled and retry.
  - **Tests:** new tests/place-travel.test.js with injected builders/network/input/UI: pending A→B→C, build throw, stale bed snapshot, held inputs, unknown query, reconnect no rebuild; extend tests/presence-race.test.js only for relevant facade behavior.
  - **Verify:** node --test tests/place-travel.test.js tests/presence-race.test.js tests/realtime/wiring.test.js; npm run build
  - **Done when:** Tests assert reset effects and call order through the production coordinator rather than source-string matching.
  - **Do not change:** No exact-position persistence, capture, new socket or legacy default-server-room change.

- [x] 2.2 Generalize seats and delegate specialized Theater lifecycle

  - **Goal:** Generalize seats and delegate specialized Theater lifecycle
  - **Files/symbols:** new src/social/seating.js/interactions.js, src/places/theaterAdapter.js; src/main.js sitOn/standUp/interact; existing TheaterScreenUI public lifecycle
  - **Reuse:** Theater seat offsets, existing six emotes, existing media methods; A D4/D5/D7.
  - **Required behavior:** Normalize historical seats exactly; support explicit yaw and candidate dismounts; registry handles seat/gates/notes then legacy fallback; only active Theater adapter opens cinema; injected optional call adapter remains no-op when absent.
  - **Architecture constraints:** Existing sitting/airborne wire flags only, no reserved seats; preserve projection using activeCamera and the specialized media engine.
  - **Failure/cleanup:** Stand fallback safe spawn; close owned dialogs/cancel resolves on leaving; do not duplicate handlers or dispose shared media state; P8 leave stops capture immediately if provided.
  - **Tests:** new tests/seating.test.js and tests/theater-place-adapter.test.js: rotated seat, blocked exits, repeated teardown, external bench no cinema, existing Theater offsets, call adapter absent/no capture; existing camera/jump/theater tests.
  - **Verify:** node --test tests/seating.test.js tests/theater-place-adapter.test.js tests/camera.test.js tests/jump.test.js tests/theater-ui.test.js tests/districts.test.js
  - **Done when:** Every seat has safe escape, Theater returns with same behavior, and no non-Theater seat calls cinema methods.
  - **Do not change:** No media source classifier/reducer/EPG/playlist/torrent rewrites; no calls.js or WebRTC implementation.

## 3. Authoritative public metadata and room output isolation

- [x] 3.1 Publish the build-controlled public definition projection

  - **Goal:** Publish the build-controlled public definition projection
  - **Files/symbols:** new scripts/export-place-definitions.mjs, server_elixir/priv/place_definitions.json, lib/afterlight/world/place_definitions.ex; projection test
  - **Reuse:** Static shared definitions from1.1 and existing boot configuration; A D1/D8.
  - **Required behavior:** Export whitelisted plain fields, canonical key ordering and schemaVersion; --check verifies identical committed bytes; Elixir validates limits and IDs at boot; unknown legacy room strings remain accepted but receive no feature entry.
  - **Architecture constraints:** One editable source in JS; committed JSON is generated, ≤64 public entries; no arbitrary room URLs or code.
  - **Failure/cleanup:** Invalid projection fails feature initialization with named errors rather than partial catalog; no private garden projection.
  - **Tests:** new tests/place-projection.test.js plus test/afterlight/world/place_definitions_test.exs: roundtrip, drift, malformed/oversized config, garden privacy.
  - **Verify:** node scripts/export-place-definitions.mjs --check; node --test tests/place-projection.test.js; mix test test/afterlight/world/place_definitions_test.exs
  - **Done when:** Both runtimes recognize identical public IDs/bounds and hand-editing projection is caught.
  - **Do not change:** No modification of player tables, auth tokens or general Rooms.resolve compatibility.

- [x] 3.2 Prevent old room output crossing travel

  - **Goal:** Prevent old room output crossing travel
  - **Files/symbols:** lib/afterlight/world/room_server.ex/frames.ex, lib/afterlight_web/game_channel.ex; src/net/roomEpoch.js/phoenixClient.js/client.js
  - **Reuse:** Existing world_frame path, conn_ref membership, realtime outer event and desiredRoom; A D3.
  - **Required behavior:** Tag source room in internal messages; filter before push/binary conversion; add roomId to public JSON/rt_binary envelope; client rejects mismatched tagged frames before epoch bookkeeping and binary consumption.
  - **Architecture constraints:** Preserve untagged legacy compatibility and SoA bytes/worker ABI; no per-room channel.
  - **Failure/cleanup:** Queued old-owner/room messages dropped; stale monitor paths cannot tear down current room; preserve superseded terminal close.
  - **Tests:** Extend test/afterlight_web/game_channel_world_test.exs, test/afterlight/world/frames_test.exs, tests/net/room-epoch.test.js and tests/realtime/gateway-binary-convergence.test.js: queued A after B, wrong-room high epoch, binary envelope filter, normal roster and reconnect.
  - **Verify:** mix test test/afterlight_web/game_channel_world_test.exs test/afterlight/world/frames_test.exs; node --test tests/net/room-epoch.test.js tests/realtime/gateway-binary-convergence.test.js tests/superseded-close.test.js
  - **Done when:** Old room avatars/effects cannot appear after travel on JSON or negotiated binary paths, without changing binary format.
  - **Do not change:** No broad filtering of untagged WELCOME/catalog/Theater replies or media state redesign.

- [x] 3.3 Serve bounded public directory snapshots from existing owners

  - **Goal:** Serve bounded public directory snapshots from existing owners
  - **Files/symbols:** new lib/afterlight/world/place_directory.ex; World/RoomServer.stats, GameChannel, Gateway.Router/rate_limit, shared/protocol.js
  - **Reuse:** Existing roster_size/TaskSupervisor/owner lookup; A D8.
  - **Required behavior:** Add place_directory_get/place_directory on game:v1, 5s request rate, one in flight, 64 entries/16KiB, 4 concurrent100ms reads within500ms; count unique occupants, zero only absent local known room, null unreachable/remote.
  - **Architecture constraints:** Read projection only; no second roster, lazy room creation, capacity policy or private player information.
  - **Failure/cleanup:** Cancel timed-out work; directory failure never blocks join; omit unavailable activity, use no fake counts.
  - **Tests:** new test/afterlight/world/place_directory_test.exs and GameChannel cases: duplicate connection count, requester included, no process zero, timeout null, private gardens excluded, auth/rate/size caps, unknown type not relayed Node.
  - **Verify:** mix test test/afterlight/world/place_directory_test.exs test/afterlight_web/game_channel_world_test.exs
  - **Done when:** Queries meet deadline/caps and no Node path owns new messages.
  - **Do not change:** No new Presence system, occupancy database or friend graph.

## 4. Selector and vertical regression

- [x] 4.1 Render Places as a compact accessible modal

  - **Goal:** Render Places as a compact accessible modal
  - **Files/symbols:** new src/ui/placeSelector.js; src/main.js renderDistrictList/openDistricts; index.html/src/style.css
  - **Reuse:** Existing native dialog, T/Travel, status badges; A D8 and modified navigation spec.
  - **Required behavior:** Featured accepted destinations first; Legacy areas retains all old destinations and own garden; text-only counts, unknown after30s; poll10s while open, request generation protects stale replies.
  - **Architecture constraints:** No navigation bar, fake activity, unshipped cards or new T/M mapping; do not modify user icon work.
  - **Failure/cleanup:** Close/disconnect cancels polling, returns focus, clears keys; malformed response preserves usable destination buttons.
  - **Tests:** new tests/place-selector.test.js via injected DOM/timers or browser harness: open/close polling, stale count, unsafe activity text, Legacy selection, keyboard/narrow focus behavior.
  - **Verify:** node --test tests/place-selector.test.js; npm test; npm run build
  - **Done when:** Real cards are navigable by keyboard and touch, unknown occupancy never displays as a made-up count.
  - **Do not change:** No full HUD product demotion here; F owns tool/coin/copy policy.

- [x] 4.2 Verify Theater and document how to add a place

  - **Goal:** Verify Theater and document how to add a place
  - **Files/symbols:** new docs/places.md, this change evidence/; README/AGENTS actual module/controls descriptions
  - **Reuse:** Existing tests/theater*, scripts/verify-world-runtime.mjs and verify-theater-cutover.mjs on isolated stack; verification.md.
  - **Required behavior:** Run full A media/travel/focus matrix and save screenshots/captures; author definition→builder→bounds/seat→preset→tests guide with explicit server projection step and optional specialized controller.
  - **Architecture constraints:** Use disposable database/identities/media fixtures; inventory existing ports before starting stack; missing providers are unverified, not passed.
  - **Failure/cleanup:** Exercise build failure, room disconnect, repeated return and disabled conferencing; clean only created test resources.
  - **Tests:** Full JS and Mix suites; two-client world/Theater scripts plus real browser provider/cinema tests from verification.md.
  - **Verify:** npm test; npm run build; mix test; npm run verify:world; npm run verify:theater (isolated test stack only)
  - **Done when:** All automated checks pass and evidence identifies actual browser/provider results and limitations; guide matches implemented APIs.
  - **Do not change:** No production Theater queue writes, original snapshot deletion, deployment or upstream task completion claims.
