// Encoding A — JSON baseline (the real current wire path).
// Contract §8: "a presence_update-shaped object with string ids — measured
// through JSON.stringify/JSON.parse, the real code path."
// No contract header: JSON text frames are self-describing (contract §1).

import { worldToJsonUpdate } from '../fixtures.mjs';

export const name = 'json-baseline';

// encode -> string (the wire unit for text frames). Includes building the
// presence_update object, exactly what the server does today.
export function encode(world, changed) {
  return JSON.stringify(worldToJsonUpdate(world, changed));
}

export function byteLength(frame) {
  return Buffer.byteLength(frame, 'utf8');
}

// decode -> { ok: true, players } | { ok: false, error }. Never throws:
// a bad text frame must not escape into game code (contract §3 rejection
// discipline applied to the legacy path too).
export function decode(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || !Array.isArray(parsed.players)) {
      return { ok: false, error: 'bad-shape' };
    }
    return { ok: true, players: parsed.players };
  } catch {
    return { ok: false, error: 'bad-json' };
  }
}
