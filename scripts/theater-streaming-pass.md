# Theater streaming browser pass

Acceptance gate for `fix-theater-streaming-after-elixir-cutover` (tasks
3.2–3.5) and for any future deploy that touches the gateway, the theater
domain, or the specialty sidecar. The WS-level smoke
(`node scripts/theater-streaming-smoke.mjs`) proves the server side; this
pass proves what a real browser does with it — engines, iframes, HLS,
granted streams. WS-green/browser-red behavior shipped twice in this
migration; only the browser counts.

Run against `npm run dev:stack` (gateway on :4000, Vite on :5173, Node
sidecar on :3001, `AFTERLIGHT_*_OWNER=phoenix`).

Hygiene: use a disposable browser profile or a `?`-fresh guest; queue only
clearly named probe items; remove them after; never press "Clear queue";
leave other occupants' items alone.

## Transport precondition

1. Open the game. Within a few seconds the chat panel must show the town
   channel (not "The relay is quiet — reconnecting…").
   - If it never connects: the gateway is rejecting the browser origin —
     check the gateway log for "Could not check origin"; the dev stack
     smoke (`scripts/dev-elixir-stack.sh`) should have caught this at boot.

## Playback (one probe item per source kind)

For each of: a YouTube watch URL, an `.mp4` URL, an `.m3u8` URL:

2. Press G (Booth), paste the URL, Add.
3. Play now. The screen overlay must show the item actually playing
   (moving picture/audio level, not a stuck spinner), and the booth's
   now-panel must name it.
4. A second connected client (or a second browser profile) must show the
   same thing within ~2 s, without reloading.

5. YouTube specifics: the iframe engine loads (YouTube player chrome
   responds); seeking via the controls moves the shared position.
6. HLS specifics: hls.js attaches (playback starts within seconds);
   if the SDK is blocked, the failure is a readable item error that
   advances the queue — never an infinite load.
7. Magnet: paste a known-good magnet in the booth → the file picker opens
   → pick a video file → the granted stream plays (`<video>` seeks).
   While connecting, the loading caption shows swarm progress if the
   sidecar reports it. (Skip in offline environments; record that.)

## Failure modes

8. Paste garbage ("not a url") → a readable message in the booth; the bill
   is unchanged.
9. A dead URL (e.g. 404 `.mp4`) → the item fails visibly and the queue
   advances (or idles); the screen does not wedge; no duplicate entries.

## State integrity

10. After the pass: the bill contains no probe items; pre-existing items
    are untouched; a reload shows the same bill and your seat/nickname.
11. `node scripts/theater-streaming-smoke.mjs` passes.
