# Tasks: wire-realtime-entity-backend

## 0. Binary data plane (prerequisite)

- [x] 0.1 Server: parse `hello.rt`, reply `welcome.rt`, emit `rt_binary` (base64) flush frames for negotiating clients.
- [x] 0.2 Client: Phoenix transport decodes `rt_binary` → `handleBinary`; flags support `?rt_binary=1&rt_worker=1` and `VITE_RT_*` dev defaults.
- [x] 0.3 Node server binary path: `hello.rt` / `welcome.rt` negotiation + `rt_binary` flush in `server/world.js` (mirrors Phoenix `BinaryFlush`; direct-Node transport only).

## 1. Wire the seam (CPU backend)

- [x] 1.1 `createLiveEntitySession` + `LiveRemoteBackend` wrapping `RemotePlayersManager`.
- [x] 1.2 `wire.js` attaches backend to `PackConsumer`; presence JSON bridge when binary off.
- [x] 1.3 `main.js` delegates presence + `update()` to `rtWire`; local player + Kiln excluded.

## 2. Visual parity (CPU arm)

- [x] 2.1 Full gardener avatars via existing `RemotePlayersManager` (walk/sit/airborne/emotes/nicknames).
- [x] 2.2 Shadows/bloom/HUD unchanged — still WebGL composer path (Phase 4).

## 3. WebGPU arm (live)

- [x] 3.1 Live instanced proxy layer behind `?rt_webgpu_fastpath=1` — InstancedMesh on the WebGL scene (full gardener meshes when flag off; bloom/HUD coexist). WebGPU scatter may run in parallel; TSL-native instanced gardener meshes remain future work.
- [x] 3.2 Harness remains the proving ground; live game stays CPU avatars when flag off.

## 4. Composer coexistence

- [x] 4.1 Instanced proxies render inside the existing WebGL scene before `EffectComposer` — no second renderer; documented delta vs harness WebGPURenderer arm.

## 5. Flip policy

- [x] 5.1 URL → localStorage → Vite env → default OFF; `rt_entity_seam` auto-on with `rt_binary`.
- [x] 5.2 Umbrella gates 2.1–2.3 satisfied (`tests/realtime/gates.test.js`); production default-on remains REJECT per decisions.md §7.
