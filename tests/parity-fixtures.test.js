import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportFixtures } from '../scripts/export-parity-fixtures.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMMITTED_DIR = path.join(REPO_ROOT, 'tests', 'fixtures', 'parity');

test('parity fixtures: exporting twice yields byte-identical output', async () => {
  const dirA = await mkdtemp(path.join(tmpdir(), 'parity-a-'));
  const dirB = await mkdtemp(path.join(tmpdir(), 'parity-b-'));
  await exportFixtures(dirA);
  await exportFixtures(dirB);
  const names = (await readdir(dirA)).sort();
  assert.ok(names.includes('manifest.json'), 'manifest.json must be exported');
  for (const name of names) {
    const a = await readFile(path.join(dirA, name));
    const b = await readFile(path.join(dirB, name));
    assert.deepEqual(a, b, `${name} differs between two exports`);
  }
});

test('parity fixtures: committed files equal a fresh export', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'parity-c-'));
  await exportFixtures(dir);
  const names = (await readdir(dir)).sort();
  const committed = (await readdir(COMMITTED_DIR)).filter((n) => n.endsWith('.json')).sort();
  assert.deepEqual(committed, names, 'committed fixture set must match exporter file set');
  for (const name of names) {
    const fresh = await readFile(path.join(dir, name));
    const disk = await readFile(path.join(COMMITTED_DIR, name));
    assert.deepEqual(fresh, disk, `${name} is stale — re-run node scripts/export-parity-fixtures.mjs`);
  }
});

test('parity fixtures: manifest maps every hazard class to a real case id', async () => {
  const manifest = JSON.parse(await readFile(path.join(COMMITTED_DIR, 'manifest.json'), 'utf8'));
  const idsByFile = {};
  for (const file of manifest.files) {
    const body = JSON.parse(await readFile(path.join(COMMITTED_DIR, file.file), 'utf8'));
    idsByFile[file.file] = new Set(body.cases.map((c) => c.id));
    assert.ok(file.caseCount === body.cases.length, `${file.file} caseCount mismatch`);
  }
  // Case ids must be unique across the whole suite (the runner reports by id).
  const all = [];
  for (const set of Object.values(idsByFile)) all.push(...set);
  assert.equal(new Set(all).size, all.length, 'case ids must be globally unique');

  let classes = 0;
  for (const file of manifest.files) {
    for (const [hazard, patterns] of Object.entries(file.hazards)) {
      classes++;
      assert.ok(Array.isArray(patterns) && patterns.length > 0, `${file.file} hazard ${hazard} has no cases`);
      for (const pattern of patterns) {
        const re = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
        const hits = [...idsByFile[file.file]].filter((id) => re.test(id));
        assert.ok(hits.length > 0, `${file.file} hazard ${hazard}: pattern ${pattern} matches no case id`);
      }
    }
  }
  assert.ok(classes >= 20, `expected full hazard coverage, found ${classes} class mappings`);
});

test('parity fixtures: exporter runs clean from the CLI and leaves output stable', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'parity-cli-'));
  execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'export-parity-fixtures.mjs'), '--out', dir], { cwd: REPO_ROOT });
  const names = (await readdir(dir)).sort();
  assert.ok(names.length >= 7, `expected fixture files + manifest, got ${names.join(', ')}`);
});
