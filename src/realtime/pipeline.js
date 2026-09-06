// RealtimePipeline — orchestrator implementing the worker-pipeline flag
// composition (spec: realtime-worker-pipeline, "Graceful degradation and
// flag composition"):
//
//   binary + worker → decode.worker.js (transfers, coalescing, ack round-trip)
//   binary, no worker → inline PipelineCore on the main thread (same codecs)
//   no binary        → legacy passthrough: JSON handlers keep working untouched
//
// Worker crash / construction failure / stall → falls back to inline and
// signals resync (worker state is lost; the app re-joins for a snapshot).
// Room travel → reset() (slots freed, baselines cleared, id maps dropped).
//
// This module is deliberately NOT imported by the game: wiring is a future
// gated change. The prototype harness (tools/realtime/harness.html) is the
// consumer today.

import { PipelineCore, PackGate, createPack, PACK_FIELDS } from './worker/core.js';
import { PackConsumer } from './consumer.js';

const CAPACITY = 1024;
const STALL_MS = 5000;

export class RealtimePipeline {
  constructor({ flags, workerFactory = null, maxSlots = 8192, handlers = {} } = {}) {
    this.flags = flags ?? {};
    this.enabled = !!this.flags.realtime_binary;
    this.handlers = handlers;
    this._maxSlots = maxSlots;
    this.mode = this.enabled ? (this.flags.realtime_worker ? 'worker' : 'inline') : 'legacy';
    this.droppedBinaryFrames = 0;

    // Pass the handlers object itself so late-bound callbacks (assigned after
    // construction) are picked up lazily at consume time.
    this.consumer = new PackConsumer(handlers);

    if (this.mode === 'inline') {
      this.core = new PipelineCore({ maxSlots });
    } else if (this.mode === 'worker') {
      this._startWorker(workerFactory, maxSlots);
    }
  }

  _startWorker(workerFactory, maxSlots) {
    try {
      this.worker = workerFactory
        ? workerFactory()
        : new Worker(new URL('./worker/decode.worker.js', import.meta.url), { type: 'module' });
    } catch {
      this._fallback('worker-construction-failed');
      return;
    }
    this.worker.onmessage = (e) => this._onWorkerMessage(e.data, e);
    this.worker.onerror = () => this._fallback('worker-error');
    this.worker.onmessageerror = () => this._fallback('worker-messageerror');
    this._stallTimer = setTimeout(() => this._fallback('worker-stall'), STALL_MS);
    this._ready = false;
  }

  _onWorkerMessage(msg) {
    if (msg.type === 'ready') {
      this._ready = true;
      clearTimeout(this._stallTimer);
      // size the worker's store before any frames flow
      this.worker.postMessage({ type: 'config', maxSlots: this._maxSlots ?? 8192 });
    } else if (msg.type === 'pack') {
      clearTimeout(this._stallTimer);
      this._stallTimer = setTimeout(() => this._fallback('worker-stall'), STALL_MS);
      this.handlers.onPack?.(msg.pack);
      this.consumer.consume(msg.pack);
      // return the row buffers for pooling (ownership transfer back)
      const buffers = PACK_FIELDS.map((f) => msg.pack[f].buffer);
      this.worker.postMessage({ type: 'ack', buffers }, buffers);
    } else if (msg.type === 'resync') {
      this.consumer.reset();
      this.handlers.onResync?.(msg.reason);
    } else if (msg.type === 'reset-done') {
      this.consumer.reset();
    }
  }

  _fallback(reason) {
    if (this.mode !== 'worker') return;
    try { this.worker?.terminate(); } catch { /* already gone */ }
    this.worker = null;
    clearTimeout(this._stallTimer);
    this.core = new PipelineCore({ maxSlots: this._maxSlots ?? 8192 });
    this.mode = 'inline';
    this.handlers.onModeChange?.(this.mode, reason);
    // Worker state is lost: the app must re-join for a fresh snapshot.
    this.consumer.reset();
    this.handlers.onResync?.(reason);
  }

  // Socket adapter: call when event.data is an ArrayBuffer/BinaryType frame.
  // In legacy mode binary frames are counted and dropped (the legacy JSON
  // handlers are the only state authority).
  feedBinary(arrayBuffer) {
    if (!this.enabled) {
      this.droppedBinaryFrames++;
      return;
    }
    if (this.mode === 'worker') {
      if (!this.worker || !this._ready) return; // pre-ready: nothing to lose
      this.worker.postMessage({ type: 'frame', frame: arrayBuffer }, [arrayBuffer]);
    } else if (this.mode === 'inline') {
      const pack = this._inlinePack ?? (this._inlinePack = createPack(CAPACITY));
      const index = this._inlineIndex ?? (this._inlineIndex = new Map());
      const r = this.core.applyFrame(new Uint8Array(arrayBuffer), pack, index);
      if (!r.ok) return; // bounded rejection; store stays usable
      if (r.kind === 'resync') {
        pack.count = 0; pack.joined = []; pack.left = []; index.clear();
        this.consumer.reset();
        this.handlers.onResync?.('baseline-gap');
        return;
      }
      if (pack.count || pack.joined.length || pack.left.length) {
        this.consumer.consume(pack, this.core);
        pack.count = 0; pack.joined = []; pack.left = []; index.clear();
      }
    }
  }

  // JSON control-plane messages flow past this pipeline untouched; provided
  // so call sites can use one object for both frame kinds.
  feedLegacy(_msg) { /* passthrough: no-op by contract */ }

  // Room travel / resync: clear slots, baselines, and id maps everywhere.
  reset() {
    this.consumer.reset();
    if (this.mode === 'worker' && this.worker) {
      this.worker.postMessage({ type: 'reset' });
    } else if (this.mode === 'inline') {
      this.core.reset();
      const pack = this._inlinePack;
      if (pack) { pack.count = 0; pack.joined = []; pack.left = []; }
      this._inlineIndex?.clear();
    }
  }

  dispose() {
    clearTimeout(this._stallTimer);
    try { this.worker?.terminate(); } catch { /* already gone */ }
    this.worker = null;
  }
}
