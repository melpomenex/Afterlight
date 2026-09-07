/**
 * Lightweight latency histogram for load-client scenarios.
 * Records samples in milliseconds; computes p50/p95/p99.
 */

export class LatencyHistogram {
  constructor(name) {
    this.name = name;
    this.samples = [];
    this.errors = 0;
  }

  record(ms) {
    if (Number.isFinite(ms) && ms >= 0) this.samples.push(ms);
  }

  recordError() {
    this.errors += 1;
  }

  count() {
    return this.samples.length;
  }

  percentile(p) {
    if (this.samples.length === 0) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(0, idx)];
  }

  summary() {
    return {
      name: this.name,
      count: this.samples.length,
      errors: this.errors,
      p50: this.percentile(50),
      p95: this.percentile(95),
      p99: this.percentile(99),
      min: this.samples.length ? Math.min(...this.samples) : null,
      max: this.samples.length ? Math.max(...this.samples) : null,
    };
  }
}

export class MetricsBundle {
  constructor() {
    this.histograms = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.payloadBytes = [];
  }

  hist(name) {
    if (!this.histograms.has(name)) this.histograms.set(name, new LatencyHistogram(name));
    return this.histograms.get(name);
  }

  inc(name, n = 1) {
    this.counters.set(name, (this.counters.get(name) ?? 0) + n);
  }

  setGauge(name, value) {
    this.gauges.set(name, value);
  }

  recordPayload(bytes) {
    if (Number.isFinite(bytes) && bytes > 0) this.payloadBytes.push(bytes);
  }

  payloadSummary() {
    if (this.payloadBytes.length === 0) return { count: 0, p50: null, p95: null, p99: null };
    const sorted = [...this.payloadBytes].sort((a, b) => a - b);
    const pct = (p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
    return { count: sorted.length, p50: pct(50), p95: pct(95), p99: pct(99) };
  }

  toJSON() {
    return {
      histograms: Object.fromEntries([...this.histograms].map(([k, h]) => [k, h.summary()])),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      payload: this.payloadSummary(),
    };
  }
}
