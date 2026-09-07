#!/usr/bin/env node
/**
 * Export language-neutral parity fixtures from the JavaScript reference
 * implementations (shared/ + pure parts of server/).
 *
 * Output: tests/fixtures/parity/<name>.json + manifest.json
 *
 * The exported fixtures are the admission gate for the Elixir ports
 * (migration-governance "Parity before authority"): Afterlight.Parity must
 * reproduce every case before a domain takes authority. Determinism is
 * enforced by tests/parity-fixtures.test.js (two exports must be
 * byte-identical and must equal the committed files).
 *
 * Usage:
 *   node scripts/export-parity-fixtures.mjs [--out <dir>]
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeFixtures } from './parity/harness.mjs';
import { theaterCases, theaterHazards } from './parity/theater.mjs';
import { torrentCases, torrentHazards } from './parity/torrent.mjs';
import { marketCases, marketHazards } from './parity/market.mjs';
import { gardenCases, gardenHazards } from './parity/garden.mjs';
import { catalogCases, catalogHazards } from './parity/catalog.mjs';
import { miscCases, miscHazards } from './parity/misc.mjs';
import { worldCases, worldHazards } from './parity/world.mjs';
import { chatCases, chatHazards } from './parity/chat.mjs';
import { contractCases, contractHazards } from './parity/contracts.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = path.join(REPO_ROOT, 'tests', 'fixtures', 'parity');

const FILES = [
  { name: 'theater-model', module: 'Afterlight.Parity.Reference.Theater', cases: theaterCases, hazards: theaterHazards },
  { name: 'torrent-model', module: 'Afterlight.Parity.Reference.Torrent', cases: torrentCases, hazards: torrentHazards },
  { name: 'market', module: 'Afterlight.Parity.Reference.Market', cases: marketCases, hazards: marketHazards },
  { name: 'contracts', module: 'Afterlight.Parity.Reference.Contracts', cases: contractCases, hazards: contractHazards },
  { name: 'garden-crops', module: 'Afterlight.Parity.Reference.Garden', cases: gardenCases, hazards: gardenHazards },
  { name: 'iptv-xmltv', module: 'Afterlight.Parity.Reference.Catalog', cases: await catalogCases(), hazards: catalogHazards },
  { name: 'identity-nodes-machines', module: 'Afterlight.Parity.Reference.Misc', cases: miscCases, hazards: miscHazards },
  { name: 'world', module: 'Afterlight.Parity.Reference.World', cases: worldCases, hazards: worldHazards },
  { name: 'chat-relay', module: 'Afterlight.Parity.Reference.Chat', cases: chatCases, hazards: chatHazards },
];

/**
 * Pure entry point (importable by tests): writes every fixture file into
 * `outDir` and returns the list of written file paths.
 */
export async function exportFixtures(outDir = DEFAULT_OUT) {
  await mkdir(outDir, { recursive: true });
  const written = [];

  const manifest = {
    version: 1,
    generator: 'scripts/export-parity-fixtures.mjs',
    comparator: {
      numbers: 'numeric-tolerant (JS 1.0 serializes as 1; compare by value)',
      arrays: 'order-sensitive (arrays are semantic)',
      objects: 'key-order-insensitive except where the case pins key order',
      generated: '<gen:N> tokens are positional: the Nth id generated within a case (scan order: now, then queue order); "<generated>" masks random nickname fallbacks',
      '<prev>': 'threads the previous script step result (keepPrev: the step-0 result stays pinned)',
    },
    files: [],
  };

  for (const file of FILES) {
    const body = serializeFixtures(file.cases);
    const dest = path.join(outDir, `${file.name}.json`);
    await writeFile(dest, body);
    written.push(dest);
    manifest.files.push({
      file: `${file.name}.json`,
      module: file.module,
      caseCount: file.cases.length,
      hazards: file.hazards,
    });
  }

  const manifestDest = path.join(outDir, 'manifest.json');
  await writeFile(manifestDest, `${JSON.stringify(manifest, null, 2)}\n`);
  written.push(manifestDest);
  return written;
}

function parseArgs(argv) {
  const out = { out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out.out = path.resolve(argv[++i]);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { out } = parseArgs(process.argv.slice(2));
  const written = await exportFixtures(out);
  const total = FILES.reduce((n, f) => n + f.cases.length, 0);
  console.log(`exported ${total} cases across ${FILES.length} files + manifest → ${out}`);
  for (const w of written) console.log(`  ${path.relative(REPO_ROOT, w)}`);
}
