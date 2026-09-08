# Implementation verification contract

This is a future acceptance procedure, not recorded test success. B creates the capture tool described below; it does not exist at planning time. A runs its applicable automated/browser matrix without waiting for B. Each later change records actual results under its own `evidence/`, including failures and unavailable external providers. Read the task's specific tests as well as this cross-cutting contract.

## Safe, repeatable setup

1. Record commit, dirty-path inventory, browser/version, OS, GPU/driver, CPU, RAM, viewport, actual DPR and atmosphere quality. Preserve preexisting edits. Inventory listening ports before using or starting the stack; read its actual URLs. Commands below assume port 5173 only as an example.
2. Use the supported Phoenix gateway + Node specialty sidecar stack (`npm run dev:stack`) with an isolated test database, test identities and disposable media/library fixtures. Follow existing stack configuration docs for credentials and service prerequisites. Do not point mutation scripts at production or the user's bill/catalog. Do not delete original `data/game-state.json`, `data/iptv.json`, `data/epg.json` or write sidecar-owned torrent files directly.
3. Run task-specific Node tests, then `npm test` and `npm run build`; run `mix test` from `server_elixir` with the isolated test database. Build retains the Rust/WASM prerequisite in the existing package script. Capture warnings honestly; the existing large-chunk warning alone is not failure. Run `npm run verify:world` and `npm run verify:theater` only after confirming their target is this isolated stack.
4. Use two independent browser contexts with different identities. Add enough scripted test participants to occupy every authored seat for scene captures; injected rendering fixtures do not prove network membership. Use a separate synthetic/fake-clock test for deterministic event timing. Explicitly distinguish these two forms of evidence.

## A: travel, input and Theater regression matrix

| Exercise | Required observation |
|---|---|
| Cold load without query, valid query, invalid query, personal garden shortcut | Default Theater/cinema retained; known destination works; invalid falls back visibly to Theater; private garden and public garden stay distinct. |
| Theater → garden → court → Theater; rapid A→B→C; injected build rejection | Current obstacles/bounds/HUD match visible world; no stale beds/completion, nearest item, gesture, held jump/emote or queued media resolve. Failed preparation leaves previous place playable. |
| Two clients travel/reconnect; queued old-room JSON and binary envelopes | Only destination roster displayed; no wrong-room epoch poisoning; desiredRoom replay retained, specialized snapshots intact. |
| Every Theater seat, new rotated seat, blocked dismount | Existing Theater offsets/cinema are identical; other seats never enter cinema; fallback dismount is reachable; remote sitting/airborne remain correct. |
| C four modes, drag/click, wheel, WASD/arrows, Shift, Space, E, T, V, Escape | Existing controls work; activeCamera drives projection/raycast/resize. Typing never drives avatar. Dialog close returns visible keyboard focus and clears held input. |
| Direct MP4 and HLS fixture, YouTube, Vimeo | Start/pause/seek/end/error, two-client timeline/late join, provider cleanup and return work. Exercise engine initialization and user volume before/after logical mix gain. |
| Booth queue and watchbar; sitting, standing, Escape, travel mid-load | Same queue authority and controls; no orphan iframe/video/audio, duplicated listeners or late old-source callbacks; homography works in all views and cinema docks chat correctly. |
| Playlist video URL, playlist-only URL, mixed watch/list URL, cancel preview, batch cap | Existing resolve → preview → confirm and mixed-link choice remain; counts are honest, cancel leaves bill unchanged. |
| Shared/personal IPTV, lazy list pull, flip before response, guide open/close | Existing list grouping, pendingFlip, now/next and scroll survive; guide interval stops on close; remove/upload behavior and persistence remain domain-owned. |
| Torrent resolve → picker → cancel/select; seek via Range; reconnect | Canonical magnet/pick survives; cancel does not queue; status/loading and authorized stream work, failures are surfaced. |
| No conferencing implementation/flag off | No permission prompt, camera/microphone capture or autojoin on any travel/seat. Optional adapter failure does not prevent gameplay. |
| Sound denied/unavailable storage/provider volume unavailable | Visual play remains usable; settings degrade honestly; no volume preference overwrite or shared media mutation to simulate ducking. |

Use controlled local fixtures for reliable reducer/engine tests, then record actual supported-provider browser results separately. A passing mocked YouTube/Vimeo test is not proof of live provider playback. If external credentials/content/network prevent a row, record it as unverified and keep release acceptance open for that row. Do not rewrite media internals to make test fixtures easier.

## B: ownership, timing and effect harness

Verify real GameChannel → World → RoomServer ownership with acquired handle, nonzero lease epoch where applicable, renewal, owner loss, successor acquisition, fenced stale output and a new joiner. Do not merely unit-test pure Atmosphere while the live path still discards its handle. Multi-node rollout remains off until upstream load/ownership gates pass.

Use shared JS/Elixir fixtures for seed arithmetic (including zero), schedule wrap, 50% transition join, wrong-room higher epoch, duplicate revision, new epoch, malformed/oversized payload, resnapshot throttle and event dedup. Test hidden tab/settings pause, >5s clock discontinuity, disconnect and travel across a scheduled thunder deadline. Resume must sample current state without catch-up one-shots. Compare two clients' semantic event IDs/times; do not require identical individual particles or exact audio waveforms.

Harness contains a wet/dry slab, sheltered slab, roof with support posts, overlapping exposure rectangles, runoff anchor, a seated listener and one event. Inspect rain *segments* crossing the roof boundary, not only particle heads; exterior rain stays visible from under cover. Ten wet/dry cycles return dry material values within epsilon, including after static batching. Repeated quality changes must not leak buffers/maps. Legacy agricultural weather messages must not overwrite an active atmosphere or affect the Theater baseline on return.

## C/D/E: visual acceptance captures

Every scene: capture all four camera modes at 1920×1080, normal and reduced quality, default comfort settings. Also inspect 390×844 for HUD/dialog overflow and a 1280×720 viewport for route readability. Inspect walking, running, bunny hops, seated/standing camera height and Kiln following through entrances, route bends, seating groups and all exits. No geometric elevation implies walkable ramps or jump-over collision.

- **Rain Court:** north arcade, sheltered alcove, exposed seating, basin, canopy, masonry/pipes/ivy and warm windows read as one composed courtyard. Compare shelter boundary audio and rain clipping. Capture dry fixture versus sustained rain/wetness and one reduced lightning event. Lamps and footing remain readable without bloom. Six seated participants can linger without blocking all movement. No objective/reward needed to enjoy the place.
- **Desert Camp:** warm fire and cool sky establish depth; six fire seats and two quiet seats are usable; fixed bent east/west route is clear, including Kiln. Dunes are convincing distant scenery, tents cast readable local form without new shadow lights. Capture maximum bounded flame/ember/sand plus meteor, then reduced tier with omitted ember/smoke and caption event. No fuel/farming dependency or urban-shell remnants.
- **Rooftops:** skyline has three depth bands, restrained window/traffic life, safe visible parapet and ten seats across groups. Capture schedule phases at 0/300/600/900 seconds and transition midpoints; sheltered lounge stays dry. Existing note/anemometer remain reachable and completed save still animates. No skyline traversal, heavy-storm mode or restoration gate is implied.

Screenshots alone do not pass movement, audio, event timing or memory checks. Include short recordings and a plain observations table linking each capture to the condition exercised. If an authored coordinate fails production collision tests, fix geometry/route while preserving the documented composition; record the exact revised coordinates in design and fixtures before continuing, never weaken the collision test.

## Capture tool interface to implement in B

`tools/atmosphere/capture.mjs` uses the project's available browser automation runtime; creates no public debug API. It must import/use production instrumentation and fail with an actionable missing-runtime message. Harness-only clock/seed overrides remain inside the harness. Live public scenes read authoritative snapshots; deterministic scene phase fixtures run locally in the harness, never by sending a debug weather command to a public room.

Required flags:

- `--url <origin>`: actual existing dev server origin; no guessed automatic port switch.
- `--place harness|court|desert-camp|rooftops`: harness page or live supported scene. Unknown/missing scene fails rather than measuring Theater fallback.
- `--quality normal|reduced`, `--camera 0|1|2|3`, `--warmup-ms 10000`, `--duration-ms 60000`, `--repeats 3`, `--out <directory>`; these numeric defaults apply if omitted.
- `--matrix`: both qualities × all four cameras × three repetitions at 1920×1080, plus 390×844 layout captures and a 20-cycle selected-place → Theater → selected-place resource soak. `harness` substitutes harness activation/deactivation for live travel. This flag supersedes quality/camera selectors. No media bill/catalog mutations.
- `--help`: document prerequisites, outputs, measurement scope and how to attach isolated test identities. Never write credentials, grants or signed playback URLs into reports.

Example future commands from repo root:

```sh
node tools/atmosphere/capture.mjs --url http://localhost:5173 --place harness --matrix --out openspec/changes/add-atmosphere-weather-system/evidence
node tools/atmosphere/capture.mjs --url http://localhost:5173 --place court --matrix --out openspec/changes/add-rain-court-social-space/evidence
node tools/atmosphere/capture.mjs --url http://localhost:5173 --place desert-camp --matrix --out openspec/changes/add-desert-camp-social-space/evidence
node tools/atmosphere/capture.mjs --url http://localhost:5173 --place rooftops --matrix --out openspec/changes/add-rooftop-social-space/evidence
```

Output `report.json` with schemaVersion1, environment metadata, per-run frame p50/p95, atmosphere CPU p50/p95, draw/triangle counters, peak active particles/batches/lights/shadow lights, geometries/textures/estimated effect bytes, active audio nodes/listeners/controllers before/after soak, screenshots and threshold pass/fail with reasons. `report.md` summarizes the same data with relative capture links. Report missing counters as unavailable and fail the affected gate; never turn null into zero. Exit nonzero when an applicable measured budget fails. Manual visual/audio acceptance remains a separate signed-off observations table, not an algorithmically invented aesthetic score.

Measure full-frame intervals after warmup for 60s, three repetitions, with ordinary default graphics settings and all relevant scene effects active. Record per-run and worst p95; do not average away a bad run. `renderer.info` must aggregate the entire composer frame (including additional passes); its auto-reset can otherwise report only the final pass. Save/restore instrumentation settings on teardown. Separately report world-only versus atmosphere draws/triangles and render-only fixture versus actual connected avatars. Time production atmosphere update with performance.now; CPU update time is not GPU time. If GPU timer is available report separately, disjoint samples discarded. Do not claim GPU timing from CPU submission duration.

Check B's exact particle/buffer/texture/CPU caps and each world's draw/triangle/light ceilings. Whole-frame target: median ≤16.7ms and p95 ≤25ms on declared desktop at 1920×1080. Reduced hardware failures stay visible; reduce optional effects and remeasure, never silently raise ceilings. After warming every cached destination once, 20 travel cycles must show no monotonic growth in live controller, listeners, audio nodes or owned GPU allocations; cached static worlds are a documented stable baseline. Capture before/after counts and a 10-minute active Desert soak. Hidden worlds perform no atmosphere updates.

## Release and evidence rule

A can finish only after its Theater/travel regression evidence. B needs real owner/fencing tests and measured harness evidence. C/D/E need their full scene, two-client, reduced-quality and travel/resource evidence before becoming featured selector cards. F needs old saves/inventory/gardens/market access checks and keyboard/accessibility review, without advancing or deleting P6 migration work. These gates are future implementation obligations; none was executed during planning.
