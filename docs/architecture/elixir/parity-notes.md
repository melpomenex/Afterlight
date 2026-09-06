# JS → Elixir parity notes (deterministic rule porting hazards)

Captured from the shared-rules audit of `shared/*.js` + pure logic in `server/*.js`. Every pure module is deterministic given injected `(nowMs, seed)`; the Elixir ports must reproduce EXACT semantic output before a domain takes authority (P0 fixtures gate this). Fixtures live in `tests/fixtures/parity/` (exported by `scripts/export-parity-fixtures.mjs`), consumed by the Elixir `Afterlight.Parity` runner.

## 1. Rank-ordered hazards

1. **Rounding.** JS `Math.round` = half toward +∞ (JS: `Math.round(-2.5) === -2`). Elixir `Float.round` = half-even; `trunc(round(x))` = half away from zero. Implement `js_round(x) = floor(x + 0.5)` and fixture it. Sites: `shared/economy.js:32,44`, `shared/economy.js:62` (`Number(mult.toFixed(3))` — binary-float formatting quirks; do NOT approximate with decimal rounding), `server/orderbook.js:48-49,79,127`, `server/economy.js` npc paths + contract rewards + level math, `server/machines.js` floor coercions.
2. **Integer vs float fields.** Integers: coins, xp, level, reputation, order price/quantity (post-`Math.round`), trade value/fee, mill required/contributed, material counts, ms timestamps, growth stages. Floats: moisture, health, `moistureHistorySum`, `moistureChecks` (float because `+= dtSeconds`), market multipliers (3-dp), theater `positionSec`/`effectivePositionSec`, torrent progress, `fileBytes`. Keep the distinction exact in Elixir types.
3. **JSON round-tripping.** JS `JSON.stringify(1.0)` → `"1"`; parses back as float in JS but integer in Elixir. Compare fixtures numerically with an int/float-tolerant comparator, or encode expected types explicitly. Map key order is NOT significant for equality EXCEPT where iteration order is semantic (below).
4. **Object key iteration order is semantic in:** EPG channel/programme caps (`shared/iptvModel.js:141,157`), EPG index first-wins (`shared/xmltv.js:242`), contract produce deduction order (`server/economy.js:228,241`), `CROP_LIST = Object.values(CROPS)` (`shared/crops.js:130`), `MILL_REQUIREMENT`/`SPRINKLER.cost` key order, `collectVideos` DFS (`server/youtubePlaylist.js:133`). JS also iterates integer-like string keys in ascending numeric order first — never rely on that; in Elixir store these as ordered lists/keyword structure.
5. **Sorting.** JS `Array.sort` is stable (ES2019+); comparators are numeric. `orderFilesForPicker` (bytes desc, playable first) and `sortBooks` (`(b.price-a.price) || (a.createdAt-b.createdAt)` → tuple `{desc price, asc createdAt}`) must preserve tie order exactly.
6. **WHATWG URL vs RFC 3986.** `classifySource` and `parseMagnet` rely on WHATWG parsing (`new URL()`): host lowercasing, `searchParams`, magnet scheme handling. Elixir `URI` differs (encoding, `+` handling, backslash rules). Port with a hand-rolled scanner pinned by the URL fixture table rather than trusting `URI`.
7. **String semantics.** `.slice(0, n)` counts UTF-16 code units (astral chars = 2) — `cleanText`, `sanitizeNickname`, title caps. Elixir `String.slice` counts graphemes: implement UTF-16-unit truncation. `charCodeAt` in `generatePlayerPalette` is UTF-16 too. Regex `\w` in JS is ASCII (`[A-Za-z0-9_]`); `\s` matches Unicode whitespace. Case conversions differ on a few code points — fixtures avoid exotic cases.
8. **32-bit arithmetic.** `generatePlayerPalette` hash `hash*31 + code >>> 0` — mask `&&& 0xFFFFFFFF` per step in Elixir. Base32 infohash decode (`torrentModel.js:87-96`): port the bit loop; output exactly 40 lowercase hex.
9. **null/undefined vs absent.** JS conflates all three via `||`/`!= null`; `Number(null)===0` but `Number(undefined)===NaN` (matters in `normalizeTheaterState`, `normalizeMill`, `sanitizeTorrentPick`). Elixir must model `:undefined` vs `nil` vs absent distinctly; fixtures include absent + null shapes (undefined-only shapes get JS-only extraction cases).
10. **`js_to_number` coercion.** `Number('')===0`, `Number(' ')===0`, `Number('0x10')===16`, `Number('12abc')===NaN` — implement one helper, fixture it.
11. **Error outcomes are data, not exceptions.** Reducers return `{state: null, error: reason_string}`; validators return `null`; parsers count `skipped`/`recognized`. Reason strings are wire protocol (`error` messages, `action_result.message`) — keep byte-identical.
12. **Timestamps.** Epoch ms everywhere except garden durations/`dt` in seconds. `Date.UTC` ROLLS OVER out-of-range components (`parseXmltvTime` relies on it) — replicate or reject explicitly. XMLTV seconds are parsed-then-discarded.
13. **Neutralized nondeterminism.** `newItemId` (theater), iptv `newId`, orderbook trade ids, contract generation, nickname random fallbacks: fixtures pin `nowMs`, exclude generated ids from equality (or pin an injected seed), and the Elixir side injects RNG identically.
14. **Locale.** `toLocaleDateString` fallback for imported list names (`iptvModel.js:100`) is locale-dependent — excluded from fixtures; the Elixir port must pick a deterministic fixed format (and we accept the cosmetic difference) or never trigger it.
15. **Mutation style.** `gardenModel`/orderbook mutate in place; Elixir ports are state-in/state-out. Multi-step fixture scripts thread state between steps.

## 2. Fixture conventions

Per case: `{fn, args, state, nowMs, seed?, expected}`. `expected` contains the full output object AND error reason. Generated ids are masked as `"<generated>"`. Multi-step reducers use `{steps: [...]}` scripts. Comparators: numeric-tolerant, order-sensitive where semantic (arrays), order-insensitive otherwise.

## 3. Fixture set priorities (P0)

1. `theaterModel.applyTheaterAction` full op matrix + `classifySource` URL table (~40 cases incl. hostile) + `parseM3U` + `normalizeTheaterState`
2. `torrentModel`: `parseMagnet` (hex+base32), `sanitizeTorrentPick` boundaries, `orderFilesForPicker` stability, `normalizeTorrentStatus`, `torrents.parseRange`
3. `gardenModel` tick sequences + `harvestBed` quality boundaries + `sprinklerCoverage` + `crops.getGrowthStage`/`calculateQuality`
4. `shared/economy` price math (all goods × qualities × multipliers) + `updateMarketMultiplier` chains (pins toFixed)
5. `orderbook.placeOrder` scripts (price-time priority, partial fills, fee min-1 boundary, crop-mismatch break, self-match allowed)
6. `iptvModel` add/remove/normalize + `serializeM3U` round-trip + `xmltv` parse table (tz offsets, rollover, caps, first-wins index)
7. `identity` nickname/palette (fixed seeds, UTF-16 boundary, 32-bit mask)
8. `nodes`/`machines` harvest/respawn/consume-order/contribute-matrix
9. `youtubePlaylist.extractPlaylistVideos` (existing synthetic HTML fixtures) + id predicates
10. `protocol.parse` (bad JSON → null)

## 4. Dual-consumed modules (parity mandatory — client imports them)

`src/main.js` → emotes/protocol/crops/materials; `src/net/client.js` → protocol/identity; `src/render/avatars.js` → emotes/identity palette; `src/render/plants.js` → crops; `src/ui/chatPanel.js` → protocol; `src/ui/emoteWheel.js` → emotes; `src/ui/marketModal.js` → crops/materials/price fns/protocol (client previews server prices — price parity is user-visible); `src/ui/theaterScreen.js` → protocol/iptvModel/theaterModel/torrentModel; `src/world/gardenWorld.js` → crops/sprinklerCoverage/materials; `src/districts.js` → materials.
