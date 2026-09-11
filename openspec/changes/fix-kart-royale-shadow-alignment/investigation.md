## Shadow-path finding

The supplied paused-race screenshot shows a dark, vehicle-shaped silhouette displaced laterally from the foreground kart. A local standalone launch reached the game's WebGL 2 requirement, but the available browser cannot create WebGL 2, so it could not provide a second live rendered capture.

Static inspection isolates the offending path:

- `KartModel.buildKart()` creates `kartImpostor` from the merged vehicle geometry and previously enabled `castShadow` on it.
- `DrawBudget.lateUpdate()` previously kept that proxy visible in near LOD solely to cast and re-enabled/disables its cast flag according to the camera and shadow-map range.
- The key light is deliberately low-angle, so this directional shadow appears next to the car rather than underneath it.

## Ownership rule

Each kart owns one shipping shadow: the root-relative `shadowBlob` contact mesh. It is excluded from the far-LOD merge, follows wheel suspension in `onBeforeRender`, and remains visible in both LOD states. Detail meshes and the merged impostor do not cast directional-light shadows. Track and scenery shadow-map behavior is unchanged.
