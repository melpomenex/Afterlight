// Headless WebGPU stand-in for EntityRenderSession fallback tests.
// Records writeBuffer calls and can force adapter/device/validation failures.
// Does not implement WGSL — WebGPUThreeBackend treats __afterlightMock as a
// CPU-scatter device (the real WGSL path is the browser probe + harness).

export function createMockGpuDevice({ failWrite = false } = {}) {
  const buffers = new Map();
  let nextId = 1;
  let lostResolve = null;
  const device = {
    __afterlightMock: true,
    label: 'afterlight-mock-gpu',
    _buffers: buffers,
    lost: new Promise((resolve) => { lostResolve = resolve; }),
    queue: {
      writeBufferCalls: 0,
      writeBuffer(buf, offset, data, srcOffset = 0, size = undefined) {
        this.writeBufferCalls++;
        if (failWrite) {
          const err = new Error('validation: mock writeBuffer rejected');
          err.name = 'GPUValidationError';
          throw err;
        }
        const src = data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const n = size ?? src.byteLength - srcOffset;
        const dst = new Uint8Array(buf.data);
        dst.set(src.subarray(srcOffset, srcOffset + n), offset);
      },
      submit() {},
      onSubmittedWorkDone() { return Promise.resolve(); },
    },
    createBuffer({ size, usage, label }) {
      const buf = { id: nextId++, size, usage, label, data: new ArrayBuffer(size) };
      buffers.set(buf.id, buf);
      return buf;
    },
    createShaderModule() { return {}; },
    createBindGroupLayout() { return {}; },
    createPipelineLayout() { return {}; },
    createComputePipeline() { return { getBindGroupLayout: () => ({}) }; },
    createBindGroup() { return {}; },
    createCommandEncoder() {
      return {
        beginComputePass() {
          return { setPipeline() {}, setBindGroup() {}, dispatchWorkgroups() {}, end() {} };
        },
        finish() { return {}; },
      };
    },
    destroy() {
      buffers.clear();
    },
    forceLost(reason = 'destroyed') {
      lostResolve?.({ reason });
    },
  };
  return device;
}

export function createMockAdapter({ device = null, rejectDevice = false } = {}) {
  return {
    requestDevice() {
      if (rejectDevice) return Promise.reject(new Error('requestDevice failed'));
      return Promise.resolve(device ?? createMockGpuDevice());
    },
  };
}

export function createMockNavigatorGpu({ adapter = null, rejectAdapter = false } = {}) {
  return {
    requestAdapter() {
      if (rejectAdapter) return Promise.resolve(null);
      return Promise.resolve(adapter ?? createMockAdapter());
    },
  };
}
