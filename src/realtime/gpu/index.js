// Public seam for the experimental entity-render backends.
// The live game does not import this module (wireRealtime stays on setPlayer).

export {
  CPUThreeBackend,
  KILN_ID,
  TRADITIONAL_PATH_ROLES,
  createEntityRenderBackend,
  isTraditionalPathEntity,
  lerpAlpha,
  shouldConstructWebGpu,
} from './backend.js';
export { WebGPUThreeBackend, SCATTER_WGSL, CHECKSUM_WGSL } from './webgpu.js';
export { EntityRenderSession, createEntityRenderSession } from './session.js';
export { createMockGpuDevice, createMockAdapter, createMockNavigatorGpu } from './mockDevice.js';
