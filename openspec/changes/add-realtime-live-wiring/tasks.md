# Tasks: add-realtime-live-wiring

## 1. Transport hooks (additive)
- [x] 1.1 Node transport: `binaryType = 'arraybuffer'`; non-text frames → optional `handleBinary` (drop when unset).
- [x] 1.2 Hello carries `rt` only when `rtHello` is set (nested object, contract §5).

## 2. Composition
- [x] 2.1 `src/realtime/wire.js`: pipeline ↔ RemotePlayersManager (setPlayer/removePlayer), resync → desired-room replay, join_room → pipeline reset, welcome-based self-disarm.
- [x] 2.2 `src/main.js`: one guarded dynamic-import block, default-off.

## 3. Verification
- [x] 3.1 `tests/realtime/wiring.test.js`: binary routing, rt hello presence/absence, legacy neutrality (real ephemeral server).
- [x] 3.2 Full `npm test` green with wiring landed; build clean; game without flags unchanged.
