## Why

Pasting a YouTube playlist link into the projection booth today is rejected outright ("That link is not something the projector can play"), even though playlists are the most natural way to fill a shared screening evening. Importing the videos one paste at a time is tedious enough that the room loses its easiest shared-programming feature. The pieces to do this well already exist in the game: the torrent flow established resolve-server-side-then-confirm, and the IPTV flow established bounded server-side fetching.

## What Changes

- Pasting a YouTube **playlist URL** (`youtube.com/playlist?list=…`, or `music.youtube.com`) into the Add-by-URL field no longer reports an invalid link; it starts a playlist import flow.
- A **mixed link** (`watch?v=…&list=…`) offers a choice every time: import the whole playlist, or add just that one video.
- The **server resolves** a public playlist to its video list (video IDs + titles), browser-side fetching being impossible (CORS), following the existing server-fetch pattern (http(s) only, timeout, size cap, no API key required).
- A **preview-then-confirm dialog** shows the playlist title, video count, and the first few video titles; one confirmation enqueues them for the whole room. Cancelling leaves the shared bill untouched (torrent-picker precedent).
- **Batch enqueue is atomic**: a single reducer operation adds the videos with one state write and one broadcast; the existing queue cap applies and any videos that did not fit are reported honestly ("imported 31, 19 didn't fit").
- **Mixes/radio playlists** (`list=RD…` and other infinite lists), private or unavailable playlists, and resolution failures produce clear, specific messages; the plain video in a mixed link always remains addable.
- **Input UX recognizes playlists live**: the status line under the URL field identifies a pasted playlist link, Enter/Add routes it into the import flow, and import progress/results are reported in the same place.

## Capabilities

### New Capabilities

- `youtube-playlist-import`: Recognizing playlist links in the theater's URL input, server-side resolution of public YouTube playlists to a bounded video list, the preview/confirm gate (including the mixed-link choice), cap-truncation and honest outcome reporting, and failure handling for mixes, private lists, and unreachable resolves.

### Modified Capabilities

- `video-screen`: "Supported source types" — YouTube playlist URLs are no longer rejected as unsupported; they enter the playlist import flow instead of direct single-item enqueue. "Shared queue with auto-advance" — a single player action may enqueue many items at once via one atomic batch operation, still bounded by the queue maximum, with the outcome reported to the actor.

## Impact

- `shared/theaterModel.js` — playlist-link classification (extract `list=` and distinguish standalone vs mixed vs mix/radio lists), a new pure batch-enqueue reducer op with cap truncation, new error reasons and their readable texts, `THEATER_LIMITS` additions (resolve result bounds).
- `server/` — a bounded server-side playlist resolver (fetch the playlist page and extract its video list; no new API-key dependency), wired as a request/reply message mirroring the torrent resolve flow, rate-limited per room. Queue persistence unchanged: imported items are ordinary video items.
- `shared/protocol.js` — new message types for playlist resolve request/reply.
- `src/ui/theaterScreen.js` — live link recognition in the add field, import status/progress reporting, the preview/confirm (and mixed-link choice) dialog, result summary.
- Tests — model tests for classification and the batch op (caps, truncation, idempotence of cancellation), resolver extraction tests against saved fixture HTML.
- No save-schema or migration impact: imported items are ordinary queue entries already covered by `normalizeTheaterState`. No new npm dependencies.
