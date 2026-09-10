/**
 * Kart-owned resource ledger (fix-kart-royale-instant-entry 6.1).
 *
 * Tracks unique ownership labels and byte estimates for hosted Kart resources.
 * Does not dispose host-owned renderer/canvas/socket resources.
 */

const entries = new Map();

export function ledgerClaim(owner, kind, bytes = 0, { gpu = true } = {}) {
  if (!owner || !kind) return;
  const key = `${owner}:${kind}`;
  entries.set(key, {
    owner,
    kind,
    bytes: Math.max(0, bytes),
    gpu: Boolean(gpu),
    claimedAt: Date.now(),
  });
}

export function ledgerRelease(owner, kind = null) {
  if (!owner) return 0;
  let removed = 0;
  for (const [key, entry] of [...entries]) {
    if (entry.owner !== owner) continue;
    if (kind && entry.kind !== kind) continue;
    entries.delete(key);
    removed += 1;
  }
  return removed;
}

export function ledgerSummary() {
  let cpuBytes = 0;
  let gpuBytes = 0;
  for (const entry of entries.values()) {
    if (entry.gpu) gpuBytes += entry.bytes;
    else cpuBytes += entry.bytes;
  }
  return {
    count: entries.size,
    cpuBytes,
    gpuBytes,
    totalBytes: cpuBytes + gpuBytes,
    entries: [...entries.values()],
  };
}

export function ledgerReset() {
  entries.clear();
}

if (typeof globalThis !== 'undefined') {
  globalThis.__kartAllocationLedger = {
    claim: ledgerClaim,
    release: ledgerRelease,
    summary: ledgerSummary,
    reset: ledgerReset,
  };
}
