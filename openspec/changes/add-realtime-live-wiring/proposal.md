# Add Realtime Live Wiring

## Why
The binary data plane (protocol, codecs, worker pipeline, parity harness) is built, benchmarked, and verified — but nothing in the live game can negotiate it. This change lands the gated client integration: capability advertisement, binary-frame routing, and pipeline consumption, strictly additive and default-off, so the game stays byte-identical until a server speaks the protocol (the Phoenix gateway's `FrameEncoder`, now byte-parity-proven).

## What Changes
- Two additive hooks in `src/net/client.js`'s node transport: non-text frames route to an optional `handleBinary` (dropped exactly as before when unset), `binaryType = 'arraybuffer'`, and hello carries an optional `rt` capability object (contract §5, absent by default).
- `src/realtime/wire.js` (`wireRealtime`): composes the pipeline with the existing `RemotePlayersManager` (setPlayer/removePlayer only), disarms itself when `welcome` carries no `rt` reply, resets on room re-join, replays the desired-room join on resync.
- One guarded block in `src/main.js` calling `wireRealtime` (dynamic import, caught) — default-off via `resolveFlags()`.
- Coexistence rule: a binary server stops JSON presence for negotiating clients; dual delivery is benign (identical data, last-write-wins).

## Capabilities
### New Capabilities
- `realtime-live-wiring`: the flag-gated client integration contract — additive-only transport hooks, self-disarming negotiation, legacy-path neutrality, fallback via the governance ladder.
### Modified Capabilities
- (none)

## Impact
- Client: `src/net/client.js` (+2 additive branches; facade contract untouched, presence-race suite green), `src/main.js` (+1 guarded block), new `src/realtime/wire.js`.
- Tests: `tests/realtime/wiring.test.js` (binary routing, rt hello, legacy neutrality) — real ephemeral server.
- Server: none required; the Node server ignores unknown fields and never sends binary. Binary arrives when the gateway adopts `FrameEncoder` (byte-parity verified).
