# Acceptance evidence (Tasks 5.1–5.3)

Recorded 2026-09-09 against the port at HEAD of this working session. Paired
captures live under `captures/source/` (frozen Next.js source app, rev
e87f6c7d) and `captures/integrated/` (the Afterlight cabinet, dev stack:
Vite :5173 + Phoenix :4000, both running the ported code).

## 5.1 Paired source/integrated captures

| Source capture | Integrated capture | Agreement |
| --- | --- | --- |
| `source/01-start.png` ready panel | `integrated/01-lobby-start-panel.png` | Daylight `#a4cede` sky/fog, vertex-colored terrain with raised banks, layered peaks, banner gates, slalom poles, chairlift mast, orange rider with lime-tipped board at the start; GO BIG./GET TRICKY. panel, rider card THE MAVERICK, position/time/score blocks, course map, KM/H + boost bars. Differences are intentional: Afterlight's READY (R) replaces DROP IN/ENTER and the RACE/FREE RIDE switch (shared race), the action bar (EXIT/REMATCH/SOUND) sits bottom-center clear of the chat dock, conditions sit beside the course map instead of over chat. |
| `source/02-countdown.png` | `integrated/03-countdown-client2.png`, `19-solo-ready-countdown.png` | READY TO DROP? + big number + "Hold SPACE, release to jump" caption; both from a server-scheduled start (integrated) vs the local phase timer (source). |
| `source/03-early-run.png` | `integrated/04-race-early-client2.png` | Chase camera, cyan speed lane with chevrons + BOOST sign, orange poles, banners, HUD speed/boost feedback (SPEED LANE label at 93 KM/H integrated vs source's boost bar). |
| `source/04-speed-lane-ramp.png` | `integrated/05-airborne-trick-client2.png` | Ramp launch off the lime lip with side rails, airborne trick callout (AIR COMBO ×1 / 360 SPIN / 800 PTS) in both. |
| `source/05-airborne-trick.png` | `integrated/05`, `17-e-grab-airborne.png`, `20-solo-race-trick.png` | Trick callouts and grab/spin poses match; integrated adds the E-grab verification (grab fires, race does not exit). |
| `source/06-chairlift.png` | `integrated/06-midcourse-client2.png` | Chairlift with masts, crossbars, cables and hanging orange chairs down the left shoulder; GO BIG. banner ahead; clean-landing toast + trick score in the HUD. |
| `source/07-finish.png` | `integrated/07-finish-approach-client2.png` | Lime FINISH banner between portal posts, course map down to 0.1 KM. |
| `source/08-results.png` | `integrated/08-results-client2.png`, `10-client1-results.png`, `21-solo-results.png` | WHAT A RUN. heading, big POINTS score, POSITION/TIME/BEST COMBO/CLEAN LANDINGS grid, ANOTHER RUN→REMATCH, session-only note. Integrated standings add per-rider rows with times/scores (server-authoritative); source shows the six-AI field — the documented multiplayer adaptation (humans only, 1–8). |

Composition note: the integrated scene is the source construction verbatim
(same seed-321 LCG layout, same 440×2200 terrain grid, same ramp/zone/pickup
positions from the canonical document) — verified structurally by
`tests/snowboard-scene.test.js` (terrain dimensions, feature counts, source
lighting, framing) on top of the visual record above.

## 5.2 Real two-client playtests (IAB, two connections)

| Step | Evidence | Result |
| --- | --- | --- |
| Fresh walk-up entry (both) | `01`, client-2 walk + `02` | E entry, cancellable load, lobby seated; cabinet bystander screen showed live "1/8 RIDERS · 1 READY" from summary frames. |
| First-press load+ready | `02`, `14` | Single R readied after the seat handshake; no not_loaded, no double press. |
| Shared countdown | `03` | All-ready locked the roster; synchronized READY TO DROP? on both clients from the server startAt. |
| Race with remotes | `04`–`07`, `09` | Both riders visible to each other (orange + purple rigs), remote interpolation smooth, positions 1/2 and 2/2 correct on each client. |
| Ramp + trick + landing | `05`, `06` | Speed lane → ramp launch → 360 SPIN → CLEAN LANDING +1,627 with score/best-combo/boost feedback. |
| Finish + agreed results | `08`, `10` | Both clients rendered the same authoritative standings (winner 01:08.04 / 3,763 PTS; both times listed). |
| First Rematch | `11`, `15` | One R per client started a new countdown; the new race ran with score/pickups/boost/time reset (score 0, 45% boost). |
| Exit mid-countdown | `12`, `13` | Escape restored the social world (camera/chat/HUD); the locked rider leaving canceled the countdown back to lobby for the remaining rider. |
| Re-seat then ready | `14` | Exit → E → single R: new seat handshake, first press succeeded. |
| Solo racing (1–8, user decision) | `19`–`21` | One client: single R → countdown → race (trick verified) → authoritative results POSITION 1/1 with score/best-combo; exit restored the world (`22`). |
| Input scope | `17` | Airborne E = INDY GRAB (no world interaction, no exit); R during racing is inert (phase-scoped); Escape exits. |
| Resource stability | `16` | 3 rapid entry/exit cycles: world restored every time, no stuck HUD/black frames. |

## 5.3 Performance record (2/4/8 riders)

Measured Node-side per-frame cost of `scene.update` (all rider poses, camera,
particles, pickups) + 30 Hz steps for all riders, 300 frames, quality high
and low, on this dev machine (`/tmp/sb-perf.json`, script inline in the
session log):

| Quality | 2 riders | 4 riders | 8 riders |
| --- | --- | --- | --- |
| high | 0.070 ms/frame | 0.080 ms/frame | 0.087 ms/frame |
| low | 0.021 ms/frame | 0.027 ms/frame | 0.049 ms/frame |

The GPU-side workload equals the source game's (same terrain/scenery
composition) rendered through the host composer in the same browser; the
two-client races above ran smoothly. Low quality keeps gates/ramps/riders
readable (tree density + particles + shadows trimmed). Not yet recorded:
instrumented in-browser FPS traces and a repeated-rematch GPU memory soak —
the live races and repeated entry/exit cycles showed no degradation, but no
automated counters were captured (browser evaluate surface unavailable).


## Post-review fix (2026-09-09, user-reported)

The user reported that clicking READY in a fresh session did nothing. Root
cause: the client-side protocol validator
(`validateSnowboardControls` in `shared/activityProtocol.js`, landed with
concurrent activity-protocol work) still enforced the v1 contract — it
rejected the v2 `loaded` handshake (`courseId must be summit-night`) and the
new ride fields (`unknown ride control field: lean`), so
`NetworkClient.sendActivityInput` silently dropped the seat's load send and
`sendReady` bailed before reaching Phoenix. Reproduced exactly (fresh load →
E → READY button click → no countdown; captures 23/24 are the fixed flow),
fixed by moving the validator to the alpine-rush v2 identity + full source
control vocabulary (steer/tuck/lean/brake/boost/jumpHeld/trickQ/E/X, exact
allowlist, `speed`/`score` still rejected), and re-verified: the READY
button now locks a solo roster, the countdown runs, and tuck/lean ride
inputs reach the authority (123 KM/H aero tuck in capture 24). Earlier
keyboard-path playtests (5.2) had ridden a module graph from before the
concurrent validator edit hot-reloaded; this fix makes the committed bundle
correct for every entry path. JS suite 1086/1086 after the change.


## Second user report (2026-09-09): proportions + Ready on a portrait pane

Two findings, both fixed:

1. **Distorted proportions** — the leased race camera was sized only on
   window-resize events, never on view acquire, so it kept its placeholder
   1:1 aspect (noticeably wrong on the user's 886×1050 in-app pane ≈ 0.84).
   `main.js` lease `apply()` now calls `lease.resize(innerWidth, innerHeight)`
   immediately (captures 25–27: undistorted lobby/race on the same portrait
   viewport).
2. **Ready still dead for the user** — their tab had been loaded before the
   validator fix reached the client; the fix is client-side, so the remedy
   is a page reload (no server restart). Verified post-reload behavior on an
   identical 886×1050 viewport: READY button click → solo countdown → race
   (captures 26–27).

JS suite 1086/1086 and production build re-run after the aspect fix.


## Third user report (2026-09-09): "1 ready" but no start

Diagnosis: the READY was accepted server-side (bystander cabinet summary
showed 1 seated / 1 ready) but the roster never locked — the running Phoenix
had parsed `priv/place_definitions.json` ONCE at its pre-solo boot
(PlaceDefinitions is an ETS-cached boot reader), so the server still enforced
minPlayers: 2 while the client/HUD/manifest all said 1. The user's earlier
solo-start "verification" (captures 26/27) had in fact been a two-seat
session (the user's own blocked seat + the verification tab), which is why it
misleadingly passed. After a Phoenix restart with the regenerated projection
(minPlayers: 1 confirmed in priv JSON), TRUE solo start verified: single
client, one R press → countdown → race, position stat 1/1 (capture 28).
Deployment note folded into the rollout runbook: the minPlayers change rides
the BACKEND deploy step — restart/redeploy Phoenix whenever the projection
changes.


## Fourth user report (2026-09-09): wrong dimensions during the race

Root cause: the earlier "aspect on acquire" fix never executed — the view
lease's `apply()` forwarded only `{scene, camera, owner}` without the
`resize` hook, so the race camera kept its placeholder 1:1 aspect on any
non-square window (the user's 886×1050 pane rendered ~18% horizontally
squeezed; my portrait re-verification had misjudged a static frame as fine).
Fixed at the seam (`viewLease.acquireView` now forwards the full request
including `resize`/`onRelease`; host-view test expectation extended) plus a
defensive controller-side `sceneResize(innerWidth, innerHeight)` after every
successful acquire. Verified at 480×960 (capture 29 — an extreme 0.5 aspect
that would have been unmistakably pinched before) and at the user's exact
886×1050 pane shape mid-race after a live viewport change (capture 30).
JS suite 1086/1086; production build re-run.


## Fifth user report (2026-09-09): washed out / too bright vs the source

Root cause: the host composer's UnrealBloomPass — tuned for the dark evening
social world — hazed over the Alpine Rush scene's sun-lit snow and sky; the
source game renders WITHOUT bloom (engine.js renders directly), which is why
its palette stays punchy. Fix: the view lease now suspends the bloom pass for
leased race frames and restores it on release (capture 31 race vs the source
A/B; capture 32 confirms the social world's bloom returns on exit). JS suite
1086/1086; production build re-run.
