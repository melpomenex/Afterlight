// Pure compact-delta pack / scatter / XOR checksum for entity transforms.
// The WGSL in webgpu.js is the GPU twin of scatterCpu + checksumXor.
// Layout matches benchmarks/realtime/webgpu/probe.html:
//   u32 count + 3×u32 pad | u32 ids[count] | f32x4 values[count]

export const VEC4_BYTES = 16;
export const DELTA_HEADER_WORDS = 4;

export function packTransformDelta(ids, x, y, z, yaw, count) {
  const words = DELTA_HEADER_WORDS + count + count * 4;
  const buf = new ArrayBuffer(words * 4);
  const u32 = new Uint32Array(buf);
  const f32 = new Float32Array(buf);
  u32[0] = count;
  for (let i = 0; i < count; i++) {
    u32[DELTA_HEADER_WORDS + i] = ids[i];
    const base = DELTA_HEADER_WORDS + count + 4 * i;
    f32[base] = x[i];
    f32[base + 1] = y[i];
    f32[base + 2] = z[i];
    f32[base + 3] = yaw[i];
  }
  return buf;
}

export function packFlagsDelta(ids, flags, count) {
  const words = DELTA_HEADER_WORDS + count + count;
  const buf = new ArrayBuffer(words * 4);
  const u32 = new Uint32Array(buf);
  u32[0] = count;
  for (let i = 0; i < count; i++) {
    u32[DELTA_HEADER_WORDS + i] = ids[i];
    u32[DELTA_HEADER_WORDS + count + i] = flags[i] >>> 0;
  }
  return buf;
}

export function scatterCpu(positionsF32, deltaBytes) {
  const u32 = new Uint32Array(deltaBytes);
  const f32 = new Float32Array(deltaBytes);
  const count = u32[0];
  for (let i = 0; i < count; i++) {
    const slot = u32[DELTA_HEADER_WORDS + i];
    const base = DELTA_HEADER_WORDS + count + 4 * i;
    const dst = slot * 4;
    positionsF32[dst] = f32[base];
    positionsF32[dst + 1] = f32[base + 1];
    positionsF32[dst + 2] = f32[base + 2];
    positionsF32[dst + 3] = f32[base + 3];
  }
  return count;
}

export function scatterFlagsCpu(flagsU32, deltaBytes) {
  const u32 = new Uint32Array(deltaBytes);
  const count = u32[0];
  for (let i = 0; i < count; i++) {
    flagsU32[u32[DELTA_HEADER_WORDS + i]] = u32[DELTA_HEADER_WORDS + count + i];
  }
  return count;
}

export function checksumXor(positionsF32, n) {
  const bits = new Uint32Array(positionsF32.buffer, positionsF32.byteOffset, n * 4);
  let acc = 0;
  for (let i = 0; i < bits.length; i++) acc ^= bits[i];
  return acc >>> 0;
}

export function growFloat4(prev, nextSlots) {
  const next = new Float32Array(nextSlots * 4);
  if (prev) next.set(prev.subarray(0, Math.min(prev.length, next.length)));
  return next;
}

export function growU32(prev, nextSlots) {
  const next = new Uint32Array(nextSlots);
  if (prev) next.set(prev.subarray(0, Math.min(prev.length, next.length)));
  return next;
}
