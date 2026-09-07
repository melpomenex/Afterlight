// decode.worker.js — thin shell around PipelineCore or WasmPipelineCore.
import { PipelineCore, PackGate, MAX_IN_FLIGHT, createPack, packForTransfer, PACK_FIELDS } from './core.js';

const CAPACITY = 1024;

let core = null;
let coreMaxSlots = 8192;
let booted = false;
const gate = new PackGate();
const pool = [];

function takePack() {
  if (pool.length) return pool.pop();
  return createPack(CAPACITY);
}

function postPack(pack) {
  pack.packId = gate.nextPackId++;
  const transfer = PACK_FIELDS.map((f) => pack[f].buffer);
  self.postMessage({ type: 'pack', pack: packForTransfer(pack) }, transfer);
}

async function bootFromConfig(msg) {
  coreMaxSlots = msg.maxSlots ?? 8192;
  try {
    if (msg.useWasm) {
      const { createWasmPipelineCore } = await import('../wasm/pipelineCore.js');
      core = await createWasmPipelineCore({ maxSlots: coreMaxSlots });
    } else {
      core = new PipelineCore({ maxSlots: coreMaxSlots });
    }
  } catch {
    core = new PipelineCore({ maxSlots: coreMaxSlots });
  }
  booted = true;
  self.postMessage({ type: 'ready', wasm: msg.useWasm === true });
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'config') {
    if (!booted) {
      bootFromConfig(msg).catch(() => {
        core = new PipelineCore({ maxSlots: coreMaxSlots });
        booted = true;
        self.postMessage({ type: 'ready', wasm: false, fallback: 'wasm-unavailable' });
      });
    } else if (msg.maxSlots && msg.maxSlots !== coreMaxSlots) {
      coreMaxSlots = msg.maxSlots;
      core.reset();
      core = new PipelineCore({ maxSlots: coreMaxSlots });
    }
    return;
  }
  if (!booted || !core) return;

  if (msg.type === 'frame') {
    if (gate.pending === null) {
      gate.pending = takePack();
      gate.pendingIndex.clear();
    }
    const pack = gate.pending;
    pack.tick = msg.tick ?? pack.tick;
    const r = core.applyFrame(new Uint8Array(msg.frame), pack, gate.pendingIndex);
    if (!r.ok || r.kind === 'resync') {
      gate.pending = null;
      pool.push(resetPack(pack));
      self.postMessage({ type: 'resync', reason: r.ok ? r.kind : r.reason });
      return;
    }
    if (gate.afterApply(pack, false) === 'post') {
      postPack(pack);
      gate.onPosted();
    }
  } else if (msg.type === 'ack') {
    gate.onAcked();
    if (msg.buffers) {
      const p = takeFromBuffers(msg.buffers);
      if (p) pool.push(p);
    }
    if (gate.pending !== null && gate.unacked < MAX_IN_FLIGHT) {
      const pack = gate.pending;
      postPack(pack);
      gate.onPosted();
    }
  } else if (msg.type === 'reset') {
    gate.pending = null;
    gate.pendingIndex = new Map();
    core.reset();
    self.postMessage({ type: 'reset-done' });
  }
};

function resetPack(pack) {
  pack.count = 0;
  pack.joined = [];
  pack.left = [];
  return pack;
}

function takeFromBuffers(buffers) {
  if (!Array.isArray(buffers) || buffers.length !== PACK_FIELDS.length) return null;
  const sizes = new Set(buffers.map((b) => b.byteLength));
  if (sizes.size !== 1) return null;
  const p = createPack(buffers[0].byteLength / 4);
  p.ids = new Uint32Array(buffers[0]);
  p.x = new Float32Array(buffers[1]);
  p.z = new Float32Array(buffers[2]);
  p.yaw = new Float32Array(buffers[3]);
  p.flags = new Uint8Array(buffers[4]);
  p.count = 0;
  p.joined = [];
  p.left = [];
  return p;
}
