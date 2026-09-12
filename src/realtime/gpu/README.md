# Entity render backend (experimental)

The worker-pipeline consumer is the integration point. `PackConsumer`
calls `entityBackend.applyDeltaPack(pack)` when a backend is attached.

**Live game:** when the entity seam is on (`?rt_binary=1` or `?rt_entity_seam=1`),
`wireRealtime` attaches `LiveRemoteBackend` — full `RemotePlayersManager`
avatars. When **also** `?rt_webgpu_fastpath=1`, remotes render as
`InstancedMesh` proxies on the WebGL scene (bloom/HUD unchanged); full
player meshes return when the flag is off. The harness still proves the
WebGPURenderer arm separately.

## Who stays on the traditional path

The local player and Kiln are excluded from the GPU path by design (camera
and interaction coupling outweigh instance savings at n=2):

- `KILN_ID === 'kiln'` is always skipped.
- `excludedIds` (typically the local guestId) is skipped.
- Those rows still reach `onEntry` so existing avatar / companion code runs.

## Constructing a backend

```js
import { PackConsumer } from '../consumer.js';
import { createEntityRenderSession } from './index.js';

const session = await createEntityRenderSession({
  flags: { renderer_webgpu_fastpath: false }, // harness may pass true
  excludedIds: new Set([localGuestId, 'kiln']),
});
const consumer = new PackConsumer({
  entityBackend: session,
  excludedIds: new Set([localGuestId, 'kiln']),
  onEntry(entry) { /* traditional path for everyone, including excluded */ },
});
```

`createEntityRenderSession` builds `WebGPUThreeBackend` only when the flag is
on AND an adapter/device exists; adapter absence, `requestDevice` rejection,
validation errors, checksum mismatch, and `device.lost` all rebuild
`CPUThreeBackend` from the last acknowledged snapshot.
