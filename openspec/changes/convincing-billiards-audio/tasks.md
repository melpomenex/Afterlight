## 1. Establish reference and assets

- [x] 1.1 Re-read pool session/event serialization and current activity/world lifecycle, including concurrent changes; record the concrete shot identity and activation seams in design.md and verify them against existing pool lifecycle tests.
- [x] 1.2 Source and audition the cue, ball, cushion and pocket palette; commit local assets with provenance, licenses and edit notes, and verify at least three variants per family, cue/ball velocity layers and measured transfer/decoded sizes against the design budgets.

## 2. Normalize contact data and synchronization

- [x] 2.1 Add pure audio event normalization for current/legacy speed and pocket fields, finite bounds and contact positions; verify tests cover real physics payloads, zero intensity, malformed input and missing optional fields.
- [x] 2.2 Add the missing impact metadata and stable shot/contact timing to shared JS and matching Elixir pool physics/session output where required; verify parity fixtures and existing pool physics/rules/power/session tests retain identical gameplay outcomes.
- [x] 2.3 Route predicted steps, snapshots and activity events through bounded shot-scoped reconciliation; verify delayed and duplicate snapshots, out-of-order events, rapid same-pair recontacts, distinct break contacts, rerack and reconnect fixtures.
- [x] 2.4 Unify cue strike ownership for local animation and observed remote accepted shots; verify one strike for shooter and witness, silence on pre-impact cancellation/refusal, and no historical cue on mid-shot join.

## 3. Build the table sound engine

- [x] 3.1 Replace oscillator impacts with cached sample playback through the existing mixer effects bus; verify velocity-layer selection, restrained variant choice, shared-context-only output, Sound/effects control and suspended/unavailable context behavior.
- [x] 3.2 Add table-local voice limits, priority stealing, gain envelopes and headroom; verify a dense break stays within 24 transient voices, releases nodes and produces an unclipped captured/offline output at maximum effects volume.
- [x] 3.3 Add speed/state-driven cloth movement using at most four voices in the existing update; verify stationary/pocketed exclusion, smooth transitions and silence within 200ms of settling through tests and a listening capture.
- [x] 3.4 Transform event positions with table placement/rotation and apply view-relative stereo plus distance attenuation; verify rotated-table fixtures, camera changes, mono playback and silence beyond the listening range.
- [x] 3.5 Wire active-place reset/deactivation/disposal and generation-fenced loading; verify travel during decode and pocket decay, cached return, player-to-spectator transitions, missing assets, bounded retry and no shared-context closure or stale playback.

## 4. Integration and listening acceptance

- [x] 4.1 Run focused audio and pool tests, relevant Elixir tests, npm test and npm run build; record actual results and distinguish pre-existing failures from regressions.
- [x] 4.2 Exercise two players and a nearby spectator on the supported Phoenix stack; capture soft shots, hard break, banks, pocket/scratch and roll-to-rest, and record material distinction, dynamics, repetition, clipping, seams and observed contact/audio timing against the 50ms local target.
- [x] 4.3 Exercise mute/effects volume with floating media, browser audio denial/re-enable, reconnect, travel and repeated table entry; verify no timeline mutations, duplicate contacts, lingering sound or resource growth, and inspect browser errors.
- [x] 4.4 Document the finished sound behavior and local controls in README.md and preserve the audio/video evidence with a listening assessment; mark perceptual acceptance pending if listening was unavailable, then validate the completed OpenSpec change.
