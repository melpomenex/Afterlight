## Why

Entering an Orpheum game takes the theater screen out of view: Pool changes the camera, and hosted racers explicitly clear its projected quad. Players should be able to keep watching while playing, using the existing playback session without another connection, decoder, or timeline.

## What Changes

- Add one application-owned floating presentation of the existing theater DOM surface, activated through a generic activity lifecycle before lazy loading and retained through play.
- Add temporary default-muted audio, obvious local audio controls, hide/restore, enlarge/reduce, draggable bounded positioning, responsive sizing, and a small HUD-reservation interface.
- Preserve engine identity, room authority, synchronization, error reporting, and source-change behavior; change presentation using CSS, never by moving or recreating an iframe.
- Integrate Pool, air hockey, foosball, classic cabinets, Kart Royale, Summit Run, and Downhill Mayhem through shared activity infrastructure.
- Define input ownership, fullscreen ancestry, cancellation/generation fencing, provider limitations, and measurable regression gates.

## Capabilities

### New Capabilities

- `floating-minigame-media`: Local floating presentation, activity lifecycle, audio policy, input/accessibility, layout, continuity, and provider compatibility.

### Modified Capabilities

None. Existing `video-screen`, `twitch-streaming`, and room lifecycle requirements remain authoritative. This adds a presentation capability; it does not redefine shared playback or carry theater subscriptions across rooms. Activity contracts currently live in pending changes, so this proposal references those integration contracts without editing their artifacts.

## Impact

Likely changes: `src/ui/theaterScreen.js`, new focused media-presentation/audio/layout helpers, `src/activities/runtime.js`, `src/activities/participation.js`, lazy activity entry adapters, `src/main.js`, `src/style.css`, and relevant input/HUD modules. No new runtime framework, streaming protocol, backend, wire message, renderer, or media dependency is proposed. `README.md` and lifecycle/browser tests will document and verify behavior.

The current worktree includes theater/Twitch changes and unfinished arcade changes; implementation must build on them without overwriting unrelated work. Uncontrollable iframe audio and provider minimum dimensions require explicit compatibility handling; see design risks. This change contains planning artifacts only.
