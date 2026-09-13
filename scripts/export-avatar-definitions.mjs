#!/usr/bin/env node
/**
 * Export the build-controlled avatar projection for the Phoenix gateway / accounts runtime.
 *
 * Phoenix cannot import ES modules directly, so the single editable manifest
 * (shared/avatarDefinitions.js) is projected into a committed, bounded JSON
 * subset at server_elixir/priv/avatar_definitions.json.
 *
 * Usage:
 *   node scripts/export-avatar-definitions.mjs           # (re)write the file
 *   node scripts/export-avatar-definitions.mjs --check   # verify committed bytes
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AVATAR_DEFINITIONS,
  VALID_RIG_KINDS,
  VALID_RARITIES,
  validateAvatarDefinition,
} from '../shared/avatarDefinitions.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const AVATAR_PROJECTION_PATH = path.join(REPO_ROOT, 'server_elixir', 'priv', 'avatar_definitions.json');

export const AVATAR_PROJECTION_SCHEMA_VERSION = 1;
export const AVATAR_PROJECTION_MAX_ENTRIES = 64;

/**
 * Pure projection of one definition: id, name, rig, rarity, weight.
 */
export function projectAvatar(definition) {
  validateAvatarDefinition(definition);

  return {
    id: definition.id,
    name: definition.name,
    rig: definition.rig,
    rarity: definition.rarity,
    weight: definition.weight,
  };
}

export function projectAvatarDefinitions(definitions = AVATAR_DEFINITIONS) {
  if (!Array.isArray(definitions)) throw new Error('avatar definitions must be an array');
  if (definitions.length > AVATAR_PROJECTION_MAX_ENTRIES) {
    throw new Error(
      `avatar projection exceeds ${AVATAR_PROJECTION_MAX_ENTRIES} entries (${definitions.length}); shrink the manifest`
    );
  }

  const seen = new Set();
  const entries = definitions.map((def) => {
    const projected = projectAvatar(def);
    if (seen.has(projected.id)) throw new Error(`duplicate avatar id: ${projected.id}`);
    seen.add(projected.id);
    return projected;
  });

  return {
    schemaVersion: AVATAR_PROJECTION_SCHEMA_VERSION,
    entries,
  };
}

/** Deterministic serialization: 2-space JSON + trailing newline. */
export function serializeProjection(projection) {
  return `${JSON.stringify(projection, null, 2)}\n`;
}

/** Byte-exact projection document for the current manifest. */
export function generateProjectionBytes() {
  return serializeProjection(projectAvatarDefinitions());
}

export async function exportProjection(outPath = AVATAR_PROJECTION_PATH) {
  const bytes = generateProjectionBytes();
  await writeFile(outPath, bytes);
  return bytes;
}

/** --check: the committed file must be byte-identical to the generated one. */
export async function checkProjection(outPath = AVATAR_PROJECTION_PATH) {
  const [committed, generated] = await Promise.all([
    readFile(outPath, 'utf8').catch(() => {
      throw new Error(`${path.relative(REPO_ROOT, outPath)} is missing — run: node scripts/export-avatar-definitions.mjs`);
    }),
    Promise.resolve(generateProjectionBytes()),
  ]);
  if (committed !== generated) {
    throw new Error(
      `${path.relative(REPO_ROOT, outPath)} drifted from shared/avatarDefinitions.js — regenerate it with: node scripts/export-avatar-definitions.mjs`
    );
  }
  return true;
}

function parseArgs(argv) {
  return { check: argv.includes('--check') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { check } = parseArgs(process.argv.slice(2));
  try {
    if (check) {
      await checkProjection();
      console.log(`avatar projection is up to date: ${path.relative(REPO_ROOT, AVATAR_PROJECTION_PATH)}`);
    } else {
      await exportProjection();
      console.log(
        `exported ${AVATAR_DEFINITIONS.length} avatars → ${path.relative(REPO_ROOT, AVATAR_PROJECTION_PATH)}`
      );
    }
  } catch (error) {
    console.error(`avatar projection error: ${error.message}`);
    process.exitCode = 1;
  }
}
