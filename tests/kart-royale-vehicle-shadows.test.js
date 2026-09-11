import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../games/kart-royale/src/', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

test('karts keep one root-relative contact shadow and do not cast vehicle silhouettes', () => {
  const model = read('kart/KartModel.ts');
  const lod = read('render/DrawBudget.ts');

  assert.match(model, /shadowBlob\.name = 'shadowBlob';\s*root\.add\(shadowBlob\)/s);
  assert.match(model, /const IMPOSTOR_SKIP = new Set\(\['shadowBlob'\]\)/);
  assert.match(model, /impostor\.castShadow = false;\s*impostor\.receiveShadow = true;\s*impostor\.visible = false;/s);
  assert.match(model, /if \(\(m as unknown as \{ isMesh\?: boolean \}\)\.isMesh\) m\.castShadow = false;/);
  assert.doesNotMatch(lod, /impostor\.castShadow\s*=/);
  assert.match(lod, /lod\.impostor\.visible = !near;/);
});
