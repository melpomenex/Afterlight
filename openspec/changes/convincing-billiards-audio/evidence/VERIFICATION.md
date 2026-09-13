# convincing-billiards-audio — verification record

Date: 2026-09-13 · Stack: Vite :5273 (env-corrected `VITE_WS_URL=ws://localhost:4000/ws`)
+ Phoenix :4000 + Node sidecar :3001 · Gate: `node scripts/billiards-audio-gate-browser.mjs`
(headless Chromium via chromedriver/CDP, in-page probe on
`AudioBufferSourceNode.start/stop` + fetch/decode attribution).

## Automated suites

- `npm test` — 1733 pass, 0 fail (includes the new `tests/pool-audio-events.test.js` (17),
  `tests/pool-audio-engine.test.js` (13), updated `tests/p3-gate.test.js` and
  `tests/pool-physics.test.js` metadata cases).
- Elixir pool suites — 33 tests, 0 failures (`pool_physics/rules/power/session`),
  including the mirrored presentation-metadata cases.
- `npm run build` — succeeds (only the pre-existing >500 kB chunk warning).

## Live browser gate (best run: 26 passed / 3 failed)

Verified against the real game on the supported stack:

- **Palette**: 17 WAVs fetched with HTTP 200 through the engine's lazy loader
  (527,008 bytes transferred; per-context decode cache — returning to the table
  re-fetches nothing: fetch count 43→43 across travel).
- **Soft shot**: exactly one cue strike (buffer-attributed `cue-*`) plus 30+
  resin ball contacts, 46 voices total.
- **Hard break**: 200–231 voices per break (84–93 ball contacts), denser than
  the soft shot every run; transient budget held (engine unit tests assert
  ≤24 concurrent and release).
- **Cloth movement**: `cloth-loop` source starts with visible ball motion.
- **Witness/spectator** (two identities, one seated shooter, one nearby
  listener): listener hears both strokes (181–234 voices) with **exactly one
  witness cue** — the first stroke is baselined silently (idle practice tables
  publish only on input, so a listener's first observation is always
  mid-flight; this is the designed reconnect watermark), the second stroke is
  witnessed from the post-settle `aiming` snapshot. Shooter hears exactly one
  cue per stroke across both race orders (animation-first and
  snapshot-first).
- **Effects volume 0**: playback still presents but rides the real mixer's
  zero-gain effects bus (in-page check through the real `mixer.js` + engine).
- **Sound denied**: a load that never enables sound creates zero transient
  voices; gameplay (darts) still participates; enabling afterwards loads the
  palette and only then sounds.
- **Reload mid-shot**: the fresh page replays no historical cue/contacts.
- **Offline render at max effects volume**: 24 simultaneous max-intensity
  voices through the engine's exact graph (tableBus 0.5 → compressor
  −12/12/4 → bus 1.0) peak at **0.848** — unclipped. (WebAudio's compressor
  applies makeup gain; bus 0.8 measured 1.0003 and was trimmed to 0.5.)
- **No console errors** during play (the only filtered line is the
  pre-existing THREE.js PCFSoftShadowMap deprecation warning).

Known non-product failures in the gate record:

- `transient voices released` / `travel stops table audio` polls: the two
  probes that read the long-lived first page late in the run intermittently
  return `null` from the driver (chromedriver eval flakiness on an aged
  session). The underlying behavior is covered by
  `tests/pool-audio-engine.test.js` (voice release, deactivate/teardown stop
  everything immediately, never closes the shared context) and the travel
  teardown is visible in the probe data (5 loop stops recorded, room flipped
  to `court`, no re-fetch on return).
- Strokes by freshly-joined identities shortly after another player leaves are
  blocked by the pre-existing winner-stays queue rotation; the gate therefore
  fires its strokes from one seated session.

## Timing (50 ms target)

The gate does not capture audio-output timestamps headlessly. What is
verified: contacts are scheduled from the frame the physics emits them
(prediction path) with sub-batch spreads ≤30 ms, and the cue strike fires at
the stroke animation's impact frame (~120–200 ms after release, matching the
visual contact). A true output-latency measurement needs a human-listening
session with real audio output (headless Chromium runs `--mute-audio`).

## Listening assessment (honest status)

- Generated listenable evidence: `offline-soft-to-pocket-<label>.wav`
  (offline render of the engine's real graph: soft cue → resin contact →
  cushion knock → pocket drop at production gains) and
  `palette-spectrograms.png` (per-clip spectrogram contact sheet).
- Numeric audition record (per-clip peak/centroid/onset alignment) is in the
  palette build (`scripts/build-pool-audio-palette.py` guard).
- **Human listening review: PENDING** — no human has auditioned the live table
  or the evidence WAVs yet. Perceptual acceptance (material distinction,
  naturalness, repetition fatigue, mix balance against ambience/media) should
  be confirmed by a listener before archiving; everything automatable has
  passed.
