## Context

See `proposal.md` for motivation and `specs/twitch-streaming/spec.md` for the behavior contract.

- The shared bill is authoritative on the Phoenix gateway. `shared/theaterModel.js` is the pure JS model (classification, reducer, normalization); `server_elixir/lib/afterlight/theater/reducer.ex` is its 1:1 port. `tests/fixtures/parity/theater-model.json`, generated from JS by `scripts/parity/theater.mjs` + `scripts/export-parity-fixtures.mjs`, pins both to the same semantics.
- Item shape today: `id`, `kind` (`youtube`, `vimeo`, `file`, `hls`, `torrent`), `url`, `videoId`, optional torrent pick fields. `normalizeTheaterState` rebuilds items by reclassifying `url`, so URL classification is the single source of truth for persistence.
- The client plays YouTube/Vimeo through lazily loaded official SDKs (iframe engines) and files/HLS/torrent through a `<video>` element. Both iframe engines already degrade gracefully when their SDK is missing.
- Live HLS is the only non-seekable source; the rule `kind === 'hls' && !playbackUrl` is duplicated in the reducer and three client sites.
- Twitch's official embed constraints (dev.twitch.tv/docs/embed/video-and-clips): interactive `player.twitch.tv` requires the JS SDK for channels/VODs; VOD `video` ids need a `v` prefix in the iframe URL but the numeric id in the JS options; clips use a separate **non-interactive** `clips.twitch.tv/embed` iframe with no JS API; every embed requires `parent=<serving hostname>`; the interactive player exposes `READY`, `PLAYING`, `PLAY`, `PAUSE`, `ENDED`, `OFFLINE`, `ONLINE`, `PLAYBACK_BLOCKED`, `SEEK` but **no documented error event**; `getCurrentTime()`/`getDuration()`/`seek()` work only for VODs; clips are capped at 60 seconds.

## Goals / Non-Goals

**Goals:**

- Classify Twitch channel, VOD, and clip links in both reducers, carrying one additive item shape (`twitchType` + `twitchId`) through add, queue, snapshot, and normalization.
- One client engine adapter that behaves correctly per Twitch type: live attach (no seek), VOD on the shared clock, clip as a bounded non-synchronized insert.
- Host-derived `parent` so `localhost` dev, the Vercel frontend, and the Tailscale host each work without configuration.
- Keep JS and Elixir in parity; no new dependencies, no server fetch, no save migration.

**Non-Goals:**

- Twitch chat, authentication, subscriptions, or channel browsing.
- Extracting or proxying Twitch's video assets (embeds only; no HLS URL scraping).
- Server-side clip metadata resolution or any new server-to-Twitch request.
- Room-wide failed-bill reports for ambiguous Twitch player trouble; offline channels and blocked autoplay stay local by design.

## Decisions

**D1 — One `kind: 'twitch'` with `twitchType: 'channel' | 'video' | 'clip'` and `twitchId`.**
Three separate kinds would multiply every switch (reducer, engine selection, labels, failure taxonomy) for no gain; a single generic `embed` kind would lose live/VOD/clip semantics. `classifySource` returns the fields, `makeItem`/`startNow` copy them, and `normalizeTheaterState` re-derives them by reclassifying the stored URL. Additive only: old saves and unknown-kind normalization are unaffected.

**D2 — A shared seekability rule replaces the ad-hoc live checks.**
Add a pure helper (exported from `shared/theaterModel.js`, mirrored in Elixir) such as `isSeekSupported(item)`: false for live HLS without `playbackUrl`, Twitch channels, and Twitch clips; true otherwise. The reducer's `seek` op returns `seek_unsupported` for it, and the client derives `seekAllowed` from the same helper at all three current call sites. This keeps one policy instead of four copies.

**D3 — Embed URLs and the interactive player are built host-first, in one adapter.**
`buildTwitchEmbedUrl(classified, type, parent)` produces the iframe srces: `https://player.twitch.tv/?channel=<id>&parent=<host>` for channels, `...?video=v<id>&parent=<host>` for VODs, `https://clips.twitch.tv/embed?clip=<slug>&parent=<host>` for clips. The interactive path uses `new Twitch.Player(div, { channel | video: <numeric id>, parent: [host], autoplay: true, muted })`. `parent` is `window.location.hostname` (no scheme, no port). Alternative considered: hard-coding known parent hosts — rejected, it breaks preview deployments and future hosts; the nested-iframe ancestor case is documented instead of guessed.

**D4 — A `startTwitchEngine(item, token)` adapter with three paths.**
- Channel/VOD: select/create a host div, lazily load `https://player.twitch.tv/js/embed/v1.js`, construct the player, wire `READY`/`PLAYING`/`PLAY`/`PAUSE`/`ENDED`/`OFFLINE`/`ONLINE`/`PLAYBACK_BLOCKED` into the existing engine interface (`getTime`, `getState`, `seek`, `play`, `pause`, `setVolume`, `destroy`). `getTime`/`seek` are VOD-only; live returns null so drift correction is inert. VOD joins seek to `targetPosition()` after `READY`; live joins at the edge.
- SDK load failure: fall back to the non-interactive iframe (autoplay, muted per effective volume) as a degraded engine, exactly like the Vimeo fallback.
- Clip: always the non-interactive embed iframe, no SDK, no sync.

**D5 — The clip guard is a pure, tested decision, not a timer inside the adapter.**
Add `shouldAdvanceClip({ item, elapsedSec, reported })` (or equivalent) to the pure playback-state module: true when the live item is a Twitch clip and shared elapsed time reaches `TWITCH_CLIP_GUARD_SEC` (default 75 s = 60 s maximum clip + 15 s margin). The client calls the existing `reportEnded()` path, whose `reportedForId` once-per-item guard already makes duplicate/early-skip races idempotent. Alternatives considered: server-side clip duration lookup (unreliable, new fetch surface, and the clip page served to non-browsers carries no duration metadata) and manual-skip-only (leaves unattended bills wedged). The booth labels clips as non-synchronized and offers skip so the guard is a backstop, not the primary control.

**D6 — Twitch failures are conservative and local.**
`isSourceFatalFailure` gains an explicit `twitch` branch returning false for all current evidence, because Twitch documents no fatal-source event: blocked autoplay (`PLAYBACK_BLOCKED`) shows the existing gesture badge; `OFFLINE` shows the player's offline state and keeps the bill; `READY` timeout reuses `shouldRetryPlayerReady` (rebuild once) and then `localPlaybackProblem()`, never a room-wide `failed` report. A genuinely broken VOD/channel still gives visible feedback through Twitch's own player error screen.

**D7 — Classification is explicit and conservative.**
Hosts: `twitch.tv`, `www.twitch.tv`, `m.twitch.tv` (channel/VOD/clip paths) and `clips.twitch.tv` (clip slugs). Rules: `/videos/<digits 6+>` is a VOD; `/<channel>/clip/<slug>` is a clip; a single `[A-Za-z0-9_]{4,25}` segment that is not a reserved route (`directory`, `settings`, `subscriptions`, `inventory`, `wallet`, `drops`, `friends`, `search`, `videos`, `downloads`, `following`, `p/`, `bits`, `prime`, `turbo`, `store`, `login`, `signup`, `oauth2`, …) is a channel; a single clip slug on the clips host is a clip. `player.twitch.tv` and every other Twitch page classify to null and surface the readable unsupported-link message. `go.twitch.tv` is deliberately not accepted (redirect host, not a share surface); it can be added later as a one-line host change.

**D8 — Parity stays mechanical.**
Add classification/normalization/seek-policy cases to `scripts/parity/theater.mjs`, regenerate `tests/fixtures/parity/theater-model.json`, and implement the same rules in `Reducer` + `errors.ex`. `tests/parity-fixtures.test.js` (determinism) and the Elixir `Afterlight.Parity` suite are the gate.

**D9 — Labels and copy stay in the existing pure model.**
`KIND_LABELS.twitch = 'Twitch'`; `defaultTitle('twitch')` returns "A Twitch stream" (the signature stays kind-only to avoid a parity break; per-type titles are not worth the ripple). The invalid-URL text now lists Twitch, and the booth's existing `seek_unsupported` message already reads correctly for live channels.

**D10 — The booth presents the clip limitation instead of pretending.**
When the live item is a Twitch clip, the transport area marks it as not synchronized (no pause/seek enforcement) and keeps skip prominent; channel/VOD items use the normal controls. This is presentation derived from `twitchType` + `isSeekSupported`, not new reducer state.

## Risks / Trade-offs

- [Guard dead air] A 10-second clip can sit on its end card until the 75 s guard if nobody skips → keep the margin tight, label the clip as non-synchronized, and rely on the existing always-available skip; revisit the constant after live observation.
- [Parent/ancestor domains] Twitch rejects embeds whose embedding ancestry is not listed; only `location.hostname` can be derived from the page → document the limitation for nested-iframe embeds; a future config hook can add ancestors without changing classification.
- [`FailedAttributeCheck` and SSL] Twitch expects SSL outside localhost, and IP-address hosts are unreliable → localhost works; note in README that previews should use hostnames.
- [Minimum embed size] Twitch requires at least 400×300 CSS pixels; the in-world screen quad can be smaller → floor the Twitch host layout size and let the existing homography scale it, then verify in a real browser.
- [No fatal error event] A dead VOD/channel cannot be reported failed → visible Twitch error screen plus the READY retry/path; the bill can be advanced by any occupant.
- [VOD `v`-prefix mismatch] The iframe URL and JS options take different id spellings → centralize both in `buildTwitchEmbedUrl`/the adapter and cover with tests.
- [Twitch embed churn] Player params/events can change → all Twitch specifics live in one adapter and one classifier, so breakage is contained.
- [Mixed-version deploys] New clients against an old gateway get `invalid_url` for Twitch links; old clients encountering a Twitch item show a local playback problem but never a false room failure → acceptable, and both sides ship together.

## Migration Plan

- Purely additive: no save-schema change or data migration. Existing saves normalize unchanged; a Twitch item that a rolled-back older build encounters is dropped by the old classifier (unclassifiable URL), which is safe.
- Deploy backend (Elixir reducer + parity) and frontend together; no environment variables, no new services, no new dependencies.
- Rollback is reverting the change; no persisted state depends on it.
