/**
 * Frame-bound synchronous graphics job queue (fix-kart-royale-instant-entry D4).
 *
 * Jobs run only between host presentations, capture renderer policy before
 * mutation and restore it in `finally` before yielding. No second RAF loop.
 */

import {
  captureRendererPolicy,
  restoreRendererPolicy,
  rendererPolicyMatches,
} from './rendererPolicy.js';

function verifyRestored(renderer, snapshot) {
  if (!snapshot || rendererPolicyMatches(renderer, snapshot)) return;
  const msg = '[graphicsJobs] renderer policy mismatch after restore';
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    throw new Error(msg);
  }
  console.warn(msg);
}

/**
 * @param {object} options
 * @param {() => import('three').WebGLRenderer | null} options.getRenderer
 * @param {() => boolean} [options.isBlocked] true while a visible activity owns the renderer
 * @param {() => { width: number, height: number }} [options.getViewport]
 */
export function createGraphicsJobQueue({
  getRenderer,
  isBlocked = () => false,
  getViewport = () => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  }),
} = {}) {
  /** @type {Array<{ id: string, priority: number, run: Function, signal?: AbortSignal, gen: number }>} */
  const queue = [];
  let generation = 0;

  function schedule({ id = 'job', priority = 0, run, signal = null } = {}) {
    if (typeof run !== 'function') return { ok: false, reason: 'no_run' };
    if (signal?.aborted) return { ok: false, reason: 'aborted' };
    const entry = { id, priority, run, signal, gen: generation };
    queue.push(entry);
    queue.sort((a, b) => b.priority - a.priority);
    return { ok: true, id };
  }

  function cancelAll() {
    generation += 1;
    queue.length = 0;
  }

  /**
   * Run queued jobs synchronously up to maxMs CPU budget.
   * @param {{ maxMs?: number }} [opts]
   */
  function drain({ maxMs = 4 } = {}) {
    if (isBlocked()) return { ran: 0, remaining: queue.length, blocked: true };
    const renderer = getRenderer?.();
    if (!renderer) return { ran: 0, remaining: queue.length, blocked: false };
    const deadline = performance.now() + maxMs;
    const viewport = getViewport();
    let ran = 0;
    while (queue.length > 0 && performance.now() < deadline) {
      const job = queue.shift();
      if (!job || job.gen !== generation) continue;
      if (job.signal?.aborted) continue;
      const snap = captureRendererPolicy(renderer);
      try {
        job.run({ renderer, viewport });
      } finally {
        restoreRendererPolicy(renderer, snap, viewport);
        verifyRestored(renderer, snap);
      }
      ran += 1;
    }
    return { ran, remaining: queue.length, blocked: false };
  }

  /**
   * Run one synchronous graphics transaction immediately (used by awaiting boot).
   * Restores policy before returning; async work inside fn must be scheduled separately.
   * @param {(ctx: { renderer: import('three').WebGLRenderer, viewport: { width: number, height: number } }) => (void|Promise<void>)} fn
   */
  async function runTransaction(fn) {
    if (isBlocked()) {
      throw new Error('graphics_transaction_blocked');
    }
    const renderer = getRenderer?.();
    if (!renderer) throw new Error('graphics_transaction_no_renderer');
    const viewport = getViewport();
    const snap = captureRendererPolicy(renderer);
    try {
      return await fn({ renderer, viewport });
    } finally {
      restoreRendererPolicy(renderer, snap, viewport);
      verifyRestored(renderer, snap);
    }
  }

  return {
    schedule,
    drain,
    cancelAll,
    runTransaction,
    get pending() { return queue.length; },
    get generation() { return generation; },
  };
}
