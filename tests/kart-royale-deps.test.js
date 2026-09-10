import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// integrate-kart-royale-arcade 1.4: root and games/kart-royale must stay on
// ONE shared three/postprocessing/n8ao/simplex-noise instance. The root build
// resolves these from the root node_modules, so the root-installed version
// must satisfy BOTH declared ranges — otherwise the two declarations have
// drifted apart and the game code is running against a version it did not
// ask for (or the host is).

const ROOT = new URL('..', import.meta.url);
const SHARED_DEPS = ['three', 'postprocessing', 'n8ao', 'simplex-noise'];

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, ROOT), 'utf8'));
}

/** Minimal `^` / `~` / exact semver range check (these deps only use those). */
function rangeAllows(range, version) {
  const versions = version.split('.').map(Number);
  const clauses = range.split('||').map((clause) => clause.trim());
  return clauses.some((clause) => {
    const caret = clause.match(/^\^(\d+)\.(\d+)\.(\d+)/);
    if (caret) {
      const [major, minor] = caret.slice(1).map(Number);
      if (versions[0] !== major) return false;
      if (versions[1] < minor) return true;
      return versions[1] === minor && versions[2] >= caret[3];
    }
    const tilde = clause.match(/^~(\d+)\.(\d+)\.(\d+)/);
    if (tilde) {
      return versions[0] === Number(tilde[1])
        && versions[1] === Number(tilde[2])
        && versions[2] >= Number(tilde[3]);
    }
    return clause === version;
  });
}

test('root and kart-royale declare compatible shared dependency ranges', () => {
  const root = readJson('package.json');
  const kart = readJson('games/kart-royale/package.json');
  const problems = [];
  for (const dep of SHARED_DEPS) {
    const rootRange = root.dependencies?.[dep];
    const kartRange = kart.dependencies?.[dep];
    if (!rootRange) problems.push(`${dep}: missing from root dependencies`);
    if (!kartRange) problems.push(`${dep}: missing from games/kart-royale dependencies`);
    if (!rootRange || !kartRange) continue;
    let installed = null;
    try {
      installed = readJson(`node_modules/${dep}/package.json`).version;
    } catch {
      problems.push(`${dep}: not installed in root node_modules`);
      continue;
    }
    if (!rangeAllows(rootRange, installed)) {
      problems.push(`${dep}: root range ${rootRange} excludes installed ${installed}`);
    }
    if (!rangeAllows(kartRange, installed)) {
      problems.push(`${dep}: games/kart-royale range ${kartRange} excludes installed ${installed} (host/game drift)`);
    }
  }
  assert.deepEqual(problems, [], `shared dependency drift:\n  ${problems.join('\n  ')}`);
});
