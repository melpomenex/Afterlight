/**
 * Canonical course hashing (Node-side only; add-multiplayer-snowboard-arcade
 * 3.1). The BROWSER never recomputes the hash — it loads the document with
 * its embedded hash and the server is the authority — so node:crypto lives
 * here, not in course.js, keeping course.js browser-importable.
 */

import { createHash } from 'node:crypto';

/** Canonical JSON: sorted object keys, no whitespace, arrays in order. */
export function canonicalCourseJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalCourseJson).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalCourseJson(value[key])}`).join(',')}}`;
}

/** sha256 hex of the canonical form of a hash-free document. */
export function courseHash(doc) {
  const { hash: _omit, ...rest } = doc;
  return createHash('sha256').update(canonicalCourseJson(rest)).digest('hex');
}
