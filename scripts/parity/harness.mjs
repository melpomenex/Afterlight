/**
 * Shared recording harness for the parity fixture exporter.
 *
 * Every fixture case is recorded from the REAL JavaScript implementation at a
 * pinned revision, with a frozen clock so `nowMs`-sensitive code paths are
 * reproducible. Generated identifiers (theater item ids, iptv list ids,
 * nickname random fallbacks) are masked with tokens so the Elixir runner can
 * substitute its own generated values by position instead of by value.
 *
 * Case shapes (consumed by `Afterlight.Parity`):
 *   call:   { id, fn, args, nowMs?, seed?, expected, error? }
 *   script: { id, kind: 'script', steps: [{ fn, args, nowMs?, expected }], expected }
 *
 * The literal string "<prev>" inside a step's args threads the previous
 * step's threaded value (state, bed, book, ...) into that position — the
 * runner keeps the threaded value opaque and passes it through.
 */

const GENERATED_TOKEN_PREFIX = '<gen:';

let tokenIdCounter = 0;
let activeTokens = null; // Map<realId, token> while a case is being recorded

/** Freeze `Date.now()` for the duration of fn(). Returns fn()'s return value. */
export function withFrozenClock(nowMs, fn) {
  const realDateNow = Date.now;
  Date.now = () => nowMs;
  try {
    return fn();
  } finally {
    Date.now = realDateNow;
  }
}

/** Freeze `Math.random()` to return `seed` for the duration of fn(). */
export function withFrozenRandom(seed, fn) {
  const realRandom = Math.random;
  Math.random = () => seed;
  try {
    return fn();
  } finally {
    Math.random = realRandom;
  }
}

/**
 * Begin tokenizing generated ids for a new case. While active, `tokenize()`
 * replaces every generated id with a stable `<gen:N>` token, assigning tokens
 * in first-discovery order so the runner can reproduce them positionally.
 */
export function beginMasking() {
  activeTokens = new Map();
  tokenIdCounter = 0;
}

export function endMasking() {
  activeTokens = null;
}

const GENERATED_ID_PATTERNS = [
  /^itm_[0-9a-z]+_[0-9a-z]+$/, // theater newItemId(nowMs)
  /^iptv_[0-9a-z]+_[0-9a-z]+$/, // iptv newId(nowMs)
  /^trade_[0-9a-z]+_[0-9a-z]+$/, // orderbook trade id
];

/**
 * Recursively replace generated id strings with tokens (in discovery order).
 * Mutates nothing: returns the masked structure.
 */
export function tokenize(value) {
  if (!activeTokens) return value;
  if (typeof value === 'string') {
    if (GENERATED_ID_PATTERNS.some((re) => re.test(value))) {
      if (!activeTokens.has(value)) {
        activeTokens.set(value, `${GENERATED_TOKEN_PREFIX}${tokenIdCounter++}>`);
      }
      return activeTokens.get(value);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(tokenize);
  if (value && typeof value === 'object' && isWalkable(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = tokenize(v);
    return out;
  }
  return value;
}

/** Substitute `<gen:N>` tokens already registered this case into an arg value. */
// Walk everything except containers with non-JSON semantics. Class
// instances (OrderBook, manager objects) ARE walked: expected outputs are
// serialized, so their nested generated ids must be tokenized.
const isWalkable = (v) => !(v instanceof Set || v instanceof Map || v instanceof Date || v instanceof RegExp);
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && (v.constructor === Object || v.constructor === undefined);

export function detokenizeArgs(value) {
  if (!activeTokens) return value;
  const byToken = new Map([...activeTokens].map(([real, tok]) => [tok, real]));
  if (typeof value === 'string') return byToken.get(value) ?? value;
  if (Array.isArray(value)) return value.map(detokenizeArgs);
  if (isPlainObject(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = detokenizeArgs(v);
    return out;
  }
  return value; // Sets, Maps, class instances pass through untouched
}

/**
 * Cap recorded argument bulk: any string longer than MAX_ARG_STR becomes
 * {"__strLen": n} — the runner materializes a string of that length (content
 * is irrelevant for the length/limit validation paths these args exercise).
 * Expected outputs are NEVER compacted (they are already small).
 */
const MAX_ARG_STR = 4096;
export function compactArgs(value) {
  if (typeof value === 'string') {
    return value.length > MAX_ARG_STR ? { __strLen: value.length } : value;
  }
  if (Array.isArray(value)) return value.map(compactArgs);
  if (value instanceof Set) return Array.from(value).map(compactArgs);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = compactArgs(v);
    return out;
  }
  return value;
}

/**
 * Exporter safety net: a recorded case must never contain an unmasked
 * generated id (they carry Math.random suffixes and would break
 * determinism). Throws with the offending path.
 */
export function assertNoGenerated(value, where = '', path = '') {
  if (typeof value === 'string') {
    if (GENERATED_ID_PATTERNS.some((re) => re.test(value))) {
      throw new Error(`unmasked generated id at ${where}${path}: ${value}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoGenerated(v, where, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) assertNoGenerated(v, where, `${path}.${k}`);
  }
}

/**
 * Record a `call` case. `fn` is the real function reference; its `.name` is
 * recorded for the Elixir runner's dispatch. `fn` runs with the frozen
 * clock; its return value is tokenized into `expected`. Throws are bugs in
 * the exporter, not fixtures — expected error outcomes are returned values,
 * never thrown.
 */
export function recordCall({ id, fn, args, nowMs, seed, expected, mask }) {
  if (typeof fn !== 'function') throw new Error(`recordCall(${id}): fn must be a function reference`);
  beginMasking();
  try {
    const realArgs = args ?? [];
    // Pre-register ids embedded in pre-built arg states (scan order: now,
    // then queue order) so literal "<gen:N>" refs in the args resolve to the
    // real ids for EXECUTION, while the recorded form keeps the tokens.
    tokenize(structuredClone(realArgs));
    const execArgs = detokenizeArgs(structuredClone(realArgs));
    const run = () => fn(...execArgs);
    const runWithSeed = seed !== undefined ? () => withFrozenRandom(seed, run) : run;
    const result = nowMs === undefined ? runWithSeed() : withFrozenClock(nowMs, runWithSeed);
    const clean = mask ? mask(result) : result;
    const recorded = {
      id,
      fn: fn.name,
      args: compactArgs(tokenize(structuredClone(realArgs))),
      ...(nowMs !== undefined ? { nowMs } : {}),
      ...(seed !== undefined ? { seed } : {}),
      expected: expected !== undefined ? expected : tokenize(clean),
    };
    assertNoGenerated(recorded, id);
    return recorded;
  } finally {
    endMasking();
  }
}

/**
 * Record a `script` case. Each step: { fn, args (may contain "<prev>"),
 * nowMs?, keep? }. `thread` selects which part of the step result threads to
 * the next step when "<prev>" appears (default: the whole result; callers
 * pass e.g. 'state' for theater reducer results). Step results are tokenized
 * into `expected` per step; the case-level expected carries the last step's
 * threaded value.
 */
/**
 * Record a `script` case. Each step: { fn, args (may contain "<prev>"),
 * nowMs? }. When `keepPrev` is true the threaded value is the first step's
 * first argument (a mutable in-place object such as a bed or an OrderBook)
 * and is passed through unchanged to every later "<prev>"; otherwise the
 * previous step's RESULT threads (optionally field-selected via `thread`).
 */
export function recordScript({ id, steps, thread, keepPrev }) {
  for (const step of steps) {
    if (typeof step.fn !== 'function') throw new Error(`recordScript(${id}): step fn must be a function reference`);
  }
  beginMasking();
  try {
    let prev;
    const recorded = steps.map((step, index) => {
      const args = (step.args ?? []).map((a) => (a === '<prev>' ? prev : detokenizeArgs(a)));
      const run = () => step.fn(...args);
      const result = step.nowMs === undefined ? run() : withFrozenClock(step.nowMs, run);
      const expected = tokenize(result);
      if (keepPrev) {
        // Steps 1+ mutate the step-0 result in place; "<prev>" stays pinned.
        if (index === 0) prev = result;
      } else {
        prev = thread ? result?.[thread] : result;
        if (prev === undefined) prev = result;
      }
      // Recorded args keep "<prev>"/"<gen:N>" as literals — tokens are the
      // portable representation. Real ids embedded in pre-built arg objects
      // are caught by assertNoGenerated below.
      return { fn: step.fn.name, args: compactArgs(step.args ?? []), ...(step.nowMs !== undefined ? { nowMs: step.nowMs } : {}), expected };
    });
    const out = {
      id,
      kind: 'script',
      steps: recorded,
      ...(thread ? { thread } : {}),
      ...(keepPrev ? { keepPrev: true } : {}),
      expected: { prev: tokenize(prev) },
    };
    assertNoGenerated(out, id);
    return out;
  } finally {
    endMasking();
  }
}

/** Stable serialization: 2-space indent, trailing newline, sorted file order. */
export function serializeFixtures(cases, extra = {}) {
  return JSON.stringify({ version: 1, cases, ...extra }, null, 2) + '\n';
}
