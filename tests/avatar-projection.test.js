import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AVATAR_PROJECTION_PATH,
  AVATAR_PROJECTION_SCHEMA_VERSION,
  projectAvatarDefinitions,
  generateProjectionBytes,
  checkProjection,
} from '../scripts/export-avatar-definitions.mjs';
import { AVATAR_DEFINITIONS, VALID_RIG_KINDS, VALID_RARITIES } from '../shared/avatarDefinitions.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('avatar projection produces the committed 24-entry manifest', () => {
  const doc = projectAvatarDefinitions();
  assert.equal(doc.schemaVersion, AVATAR_PROJECTION_SCHEMA_VERSION);
  assert.equal(doc.entries.length, 24);
  assert.equal(doc.entries.length, AVATAR_DEFINITIONS.length);
  assert.deepEqual(
    doc.entries.map(e => e.id),
    AVATAR_DEFINITIONS.map(d => d.id)
  );
});

test('projected avatar entries carry canonical key shape', () => {
  const doc = projectAvatarDefinitions();
  for (const entry of doc.entries) {
    assert.deepEqual(Object.keys(entry), [
      'id',
      'name',
      'rig',
      'rarity',
      'weight',
    ]);
    assert.ok(typeof entry.id === 'string' && entry.id.length > 0);
    assert.ok(typeof entry.name === 'string' && entry.name.length > 0);
    assert.ok(VALID_RIG_KINDS.includes(entry.rig));
    assert.ok(VALID_RARITIES.includes(entry.rarity));
    assert.ok(typeof entry.weight === 'number' && entry.weight > 0);
  }
});

test('committed server_elixir/priv/avatar_definitions.json matches generator exactly', async () => {
  const diskBytes = readFileSync(path.resolve(REPO, AVATAR_PROJECTION_PATH), 'utf8');
  const generatedBytes = generateProjectionBytes();
  assert.equal(diskBytes, generatedBytes, 'projection on disk matches generator');
  await assert.doesNotReject(() => checkProjection());
});
