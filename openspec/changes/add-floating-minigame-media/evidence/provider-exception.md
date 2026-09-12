# Provider audio exception (AC3/AC4/AC12)

Recorded for task 2.3 of `add-floating-minigame-media`. This is a declared
exception, not evidence of universal automatic mute.

## Classification

| Provider adapter | Programmatic audio | Floating behavior |
| --- | --- | --- |
| Direct `<video>` (file, HLS, granted torrent) | yes (`video.volume`/`muted`) | entry mute + one-action unmute + exact restoration |
| YouTube (SDK ready) | yes (`setVolume`/`mute`) | entry mute precedes playback via `playerVars.mute`; ack on `onReady` |
| Vimeo (SDK ready) | yes | embed starts muted when silent; ack after SDK volume/mute |
| Twitch channel/VOD (interactive SDK) | yes | SDK player created muted when silent; ack on `READY` |
| Twitch clip / SDK-fallback embed / degraded Vimeo | **no** | same frame floats with native controls; persistent notice |

## What the exception means

- The degraded adapter reports `{ supported: false, status: 'unavailable',
  reason: 'provider' }` from `TheaterScreenUI.audioControlState()`, and
  `audioLimitationNotice()` returns "Use the player's own audio controls —
  automatic mute unavailable". No "Muted" indicator is ever shown.
- AC3 (automatic mute), AC4 (one-action application unmute) and AC12 (exact
  audio restoration) are **not** claimed for these adapters. They are claimed
  only for the controlled set above.
- No cross-origin DOM access, reload, skip, stop, or shared failure report is
  attempted for an uncontrollable provider. `setMuted()` returns false; the
  room-wide bill is untouched.

## Test evidence

- `tests/theater-media-audio.test.js`: "degraded clip/embed: honest notice,
  no false mute indicator, native controls stay usable" and
  "presentation-only transitions never reload a degraded frame or send a
  shared action".
- `tests/theater-twitch.test.js` continues to cover clip embed, SDK-fallback,
  autoplay blocked, retry watchdog and offline branches (unchanged behavior).
- The browser gate (`scripts/floating-media-gate-browser.mjs`) must report
  degraded-provider audio as an exception outcome, not as a pass of the
  universal mute criteria (task 6.2).
