# Design — Shared IPTV & EPG

## Context

`add-theater-district` (in flight) gives The Orpheum a screen with server-owned playback state (`TheaterManager` + `shared/theaterModel.js`), channel tuning via `theater_channel` (resolved stream URL shared with viewers), and a channel guide — but the guide's playlist data is per-browser (localStorage `afterlight-iptv-lists`, max 12 lists / 5,000 channels), so non-importers can watch but not browse or flip. Playlist URL import is a client-side `fetch()` and dies on CORS. There is no schedule data anywhere.

Server facts that shape the design: the game server already runs an `http.createServer` (currently `/api/health` only) upgraded for WebSockets on `:3001`; WS messages are JSON-only (`parse()` in `shared/protocol.js`); `server/storage.js` rewrites the whole `game-state.json` on every save; WELCOME and theater-room JOIN snapshots already carry `theater: theater.snapshot()`. The dev client runs on `:5173` (cross-origin from `:3001`); deployed builds derive the server from `VITE_WS_URL`. `parseM3U` (`shared/theaterModel.js`) captures `tvg-name`/`group-title`/`tvg-logo` but **not `tvg-id`**.

Reference test asset (not shipped, not fetched by code): `<IPTV_DIR>/out/guide.epg` — XMLTV, 36 MB plain / 4.6 MB gzipped, 12,246 channels, 56,132 programmes; channel ids like `ToloTV.af` match the `tvg-id`s in the sibling `master.m3u8` (3.1 MB, ~10k channels). The repo's `english-master.m3u8` is 1.2 MB.

See proposal.md for motivation and the two capability specs for behavior contracts.

## Goals / Non-Goals

**Goals:**
- Uploads only: server starts with an empty library and no guide; everything in the guide comes from a player upload.
- Everyone in the theater room sees and can drive the same lineup (browse, filter, tune, flip) with zero local import.
- Now/next schedule display matched against shared playlists, times in the viewer's timezone.
- Multi-megabyte guides handled without bloating `game-state.json` or stalling the server loop.
- Pure, testable rules (parsers, limits, matching, lookup) in `shared/`, mirroring the theaterModel pattern.

**Non-Goals:**
- No accounts/permissions/ownership enforcement (chill-hangout rule: anyone may add or remove).
- No scheduled/automatic EPG refresh from remote URLs; guides update by manual upload only.
- No catch-up TV, programme reminders, or recording.
- No change to screen playback sync (`theater_channel`, `theater_state`, queue) or to the localStorage personal-list feature beyond a "push to library" action.
- No EPG matching UI (manual channel↔guide mapping); id/name matching only.

## Decisions

### D1 — Uploads ride HTTP POST on the existing game server, not WS frames
`POST /api/theater/playlists` (UTF-8 text body, `?name=` query) and `POST /api/theater/epg` (raw bytes, gzip detected by `1f 8b` magic) added to the existing `http.createServer` handler in `server/index.js`, alongside `/api/health`. Rationale: WS messages are JSON-parsed per frame; a 36–50 MB base64-ish string would be slow and allocation-heavy, and the guide file is exactly the kind of payload HTTP handles natively (Content-Length checks, streamed abort on over-size). Alternatives considered: multipart (needs a parser dependency for little gain), WS binary frames (muddies the JSON protocol for one feature), client parses and sends JSON over WS (huge messages, still no server-side URL fetch).

CORS: the API routes answer `OPTIONS` preflight and echo the request `Origin` (`Access-Control-Allow-Origin`, `Content-Type` allowed) because the dev origin (`:5173`) differs from the server (`:3001`); same-origin deployed setups are unaffected. The client derives the API base from its WS URL (swap `ws:`→`http:`, strip a trailing `/ws`), so `VITE_WS_URL` deployments keep working.

### D2 — Library and guide persist in their own files, not `game-state.json`
New `server/iptv.js` (`IptvManager`, thin like `TheaterManager`) owns `data/iptv.json` (catalog + parsed channel arrays) and `data/epg.json` (compact parsed guide), written atomically (tmp + rename, same pattern as `Storage.save`) only when an upload/removal succeeds. `server/storage.js` is untouched. Rationale: `Storage.save()` rewrites the entire state file on every persist; folding a 6 MB parsed guide (or an 8 MB playlist) into it would multiply every unrelated save (gardens, players, machines) by megabytes. Corrupt/missing files are repaired to empty (library) or "no guide" (EPG) on load — same defensive posture as `normalizeTheaterState`.

### D3 — Pure rules in `shared/iptvModel.js` + `shared/xmltv.js`
- `shared/xmltv.js` (new, no dependencies): a tolerant scanning parser over the small XMLTV grammar the game needs (`<channel id>`, `<display-name>`, `<icon>`, `<programme start stop channel>` with `<title>/<sub-title>/<desc>`). Implementation is an `indexOf`-slicing scanner, not nested regexes, over potentially 36 MB of text; XMLTV times (`YYYYMMDDHHMMSS +hhmm`) parse to UTC ms. Also exports `matchEpgChannels(programmeIndex, channels)` (tvg-id → guide channel id, fallback normalized display-name) and `nowNext(programmes, atMs)` (binary search over per-channel sorted programmes). Parsing yields to the event loop between blocks (batched async), so a 36 MB import doesn't stall movement ticks.
- `shared/iptvModel.js` (new): library limits and shapes — `LISTS_MAX = 24`, `LIST_TEXT_MAX = 8 MB`, `CHANNELS_MAX = 20_000` (the 3.1 MB reference list must fit whole), `EPG_FILE_MAX = 64 MB`, `EPG_CHANNELS_MAX = 50_000`, `EPG_PROGRAMMES_MAX = 250_000`, `EPG_LOOKUP_MAX = 300` keys per request; name sanitization; `normalizeIptvLibrary()` repair for untrusted persisted data; snapshot builders. Playlist parsing reuses `parseM3U` from `shared/theaterModel.js` (one additive change there: `parseExtInf` also captures `tvg-id` as `tvgId` — needed for guide matching, additive so existing saves/tests are unaffected).

### D4 — Catalog snapshots are metadata-only; channels and schedules are pulled on demand
Broadcasting every list's full channel array on every change would be ~7 MB in the worst case to every occupant. Instead:
- `IPTV_STATE` (S→C): `{ lists: [{ id, name, channelCount }], epg: { name, channelCount, programmes } | null }` — broadcast to the theater room on every change and included as `iptv: snapshot()` in WELCOME and the theater-room JOIN snapshot (mirroring `theater.snapshot()`).
- `IPTV_LIST_GET` (C→S `{ listId }`) → `IPTV_LIST` (S→C `{ listId, channels }`): the guide fetches a list's channels when first selected (client caches per session).
- `EPG_LOOKUP` (C→S `{ keys: [...] }`, ≤ `EPG_LOOKUP_MAX` keys, batched per visible guide page) → `EPG_SCHEDULE` (S→C `{ entries: [{ key, now, next }] }`): now/next computed server-side from the in-memory guide; the client refetches while the guide is open (on open + every 60 s), which also satisfies "now advances while browsing".
- `IPTV_LIST_REMOVE` (C→S `{ listId }`): any occupant may remove; server broadcasts `IPTV_STATE`; playback untouched (removal never mutates theater playback state).

### D5 — URL imports are fetched server-side
The URL-import button posts `{ name, url }` as JSON to the playlists endpoint variant; the server fetches with a 15 s abort timeout, `http(s)`-only enforcement (same posture as the theaterModel URL classifier), 3-redirect cap, and the same streamed size cap, then runs the identical parse/save path. Rationale: fixes the existing client-side CORS failures and guarantees the whole room gets the same result. Unreachable/oversized/non-http URLs fail with a readable error and no state change.

### D6 — Client flow changes in `src/ui/theaterScreen.js`
Import (paste/file/URL) now uploads to the server; the client no longer parses new imports itself. The saved-lists `<select>` shows shared lists (from `IPTV_STATE`) first, personal localStorage lists after, labelled; the "Add to theater" action re-serializes a personal list's channels to M3U text client-side (small serializer) and uploads it — localStorage keeps nothing new. The guide renders a now/next column for channels with schedule data (from the `EPG_SCHEDULE` cache), shows the active guide summary in the status line, and polls while open. Prev/next flipping operates on the selected list (shared or personal) and tunes via the unchanged `sendTheaterChannel`. The personal-list repair path (`repairSavedLists`) stays as-is.

### D7 — Persistence shapes
`data/iptv.json`: `{ lists: [{ id, name, addedBy, addedAt, channels: [{ url, name, group, logo, tvgId }] }] }` (parsed once at upload; raw text is not kept). `data/epg.json`: `{ name, updatedAt, channels: { [xmltvId]: { names: [...], icon } }, programmes: { [xmltvId]: [[startMs, stopMs, title, desc?]] } }` — programme titles dominate, `desc` kept only when short; sorted per channel at import so lookups binary-search. Sizes: the reference guide lands ≈ 5–8 MB JSON, comfortably in memory and in a single atomic write.

## Risks / Trade-offs

- [36 MB parse could jank the server loop] → batched async parsing with `setImmediate` yields between blocks; caps abort runaway files before parsing; integration test parses the real-sized fixture shape.
- [Hand-rolled XML scanner meets weird XML] → scanner is tolerant-by-contract (skip + count bad entries, like `parseM3U`), fixture tests include entities, self-closing tags, missing attributes, and a sliced sample of the real 36 MB guide; total garbage is rejected as "not a guide".
- [Upload abuse (size, garbage, repeated posts)] → byte caps enforced from Content-Length *and* streamed count with abort; parse caps; uploads are rare events by design; consistent with the server's existing no-auth posture (guest ids only), noted rather than solved here.
- [Catalog/list messages grow with use] → metadata-only snapshots + lazy `IPTV_LIST_GET`; `CHANNELS_MAX` bounds the worst single-list payload (~2–3 MB), fetched once per client per session.
- [Playlists without `tvg-id`] → normalized display-name fallback matching; unmatched channels simply show no schedule.
- [gz bomb] → `zlib.gunzipSync(data, { maxOutputLength: EPG_FILE_MAX })` throws cleanly → readable rejection, active guide unchanged.
- [Old clients / mixed versions] → new MSG_TYPES are additive; unknown types are already ignored by the client's handler map; localStorage lists keep working.

## Migration Plan

Purely additive: new module, new endpoints, new message types, two new files under `data/`, one additive `tvgId` field in `parseM3U` output. `game-state.json` and existing saves are untouched. Rollback = deploy previous build; leftover `data/iptv.json` / `data/epg.json` are inert. To reset the library/guide, delete those two files (server may be running; it reloads on restart).

## Open Questions

None material. Exact limit numbers (D3) are constants in one shared module and can be tuned during implementation without touching specs.
