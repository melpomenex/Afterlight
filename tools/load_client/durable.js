import { randomUUID } from 'node:crypto';

/**
 * Durable command envelope helpers — mirrors the P4/P6 `{request_id,
 * expected_revision}` contract. The load client tracks revisions locally
 * and classifies gateway/account rejections for benchmark reports.
 */

export const REJECTION_REASONS = {
  ROOM_UNAVAILABLE: 'room_unavailable',
  RELAY_DOWN: 'relay_down',
  STALE_REVISION: 'stale_revision',
  STALE_EPOCH: 'stale_epoch',
  OVERLOAD: 'overload',
  IDEMPOTENCY_CONFLICT: 'idempotency_conflict',
  VALIDATION: 'validation',
  TIMEOUT: 'timeout',
};

export class DurableCommandTracker {
  constructor() {
    this.revision = 0;
    this.pending = new Map();
    this.applied = new Map();
    this.rejections = new Map();
  }

  nextRequestId() {
    return randomUUID();
  }

  bumpRevision() {
    this.revision += 1;
    return this.revision;
  }

  buildEnvelope(type, fields = {}) {
    const requestId = this.nextRequestId();
    const expectedRevision = this.revision;
    const envelope = {
      type,
      ...fields,
      request_id: requestId,
      expected_revision: expectedRevision,
    };
    this.pending.set(requestId, { envelope, sentAt: Date.now() });
    return envelope;
  }

  classifyErrorFrame(frame) {
    const msg = frame?.message ?? frame?.reason ?? '';
    if (msg === REJECTION_REASONS.ROOM_UNAVAILABLE) return REJECTION_REASONS.ROOM_UNAVAILABLE;
    if (msg === REJECTION_REASONS.RELAY_DOWN) return REJECTION_REASONS.RELAY_DOWN;
    if (/stale.?revision/i.test(msg)) return REJECTION_REASONS.STALE_REVISION;
    if (/stale.?epoch/i.test(msg)) return REJECTION_REASONS.STALE_EPOCH;
    if (/overload/i.test(msg)) return REJECTION_REASONS.OVERLOAD;
    if (/idempotency/i.test(msg)) return REJECTION_REASONS.IDEMPOTENCY_CONFLICT;
    return REJECTION_REASONS.VALIDATION;
  }

  noteAck(requestId, { revision = null, replay = false } = {}) {
    const pending = this.pending.get(requestId);
    if (pending) this.pending.delete(requestId);
    this.applied.set(requestId, { revision, replay, at: Date.now() });
    if (revision != null && revision > this.revision) this.revision = revision;
    return pending;
  }

  noteRejection(requestId, reason) {
    const pending = this.pending.get(requestId);
    if (pending) this.pending.delete(requestId);
    this.rejections.set(requestId, { reason, at: Date.now() });
    return pending;
  }

  snapshot() {
    return {
      revision: this.revision,
      pending: this.pending.size,
      applied: this.applied.size,
      rejections: Object.fromEntries(
        [...this.rejections.values()].map((r) => [r.reason, 1]),
      ),
    };
  }
}
