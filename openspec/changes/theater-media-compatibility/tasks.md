# Tasks — Theater Media Compatibility

## 1. Shared model
- [x] 1.1 Add `shared/mediaModel.js` (limits, probe plan, cache key, error text)
- [x] 1.2 Extend `shared/theaterModel.js` (classify mkv/avi, prepare fields, normalization)
- [x] 1.3 Add `tests/media-model.test.js` and extend `tests/theater.test.js`

## 2. Phoenix media pipeline
- [x] 2.1 Migration: prepare columns on `theater_items`
- [x] 2.2 `Afterlight.TheaterMedia` supervisor, coordinator, probe, compatibility, transcoder, cache, commit
- [x] 2.3 HTTP plug: serve HLS under `/api/theater/media/:id/...`
- [x] 2.4 Gateway hook + structured logging; boot ffmpeg capability check
- [x] 2.5 Elixir tests (SSRF, planning, cache dedup, stale job guard)

## 3. Client
- [x] 3.1 `theaterScreen.js`: resolved playback URL, preparation captions, HLS/direct selection
- [x] 3.2 Allow seek on prepared HLS items in reducer (JS + Elixir parity)

## 4. Deploy & docs
- [x] 4.1 Add ffmpeg to `deploy/Dockerfile.phoenix`; document in README
- [x] 4.2 Update AGENTS.md theater section

## 5. Verification
- [x] 5.1 `npm test`, `mix test` (theater_media), `npm run build`
- [x] 5.2 Manual smoke: MP4 direct + MKV prepare path (when ffmpeg present) — `npm run verify:media`
