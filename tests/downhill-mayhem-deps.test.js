import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// integrate-multiplayer-downhill-mayhem-arcade 2.5: root and
// games/downhill-mayhem must stay on ONE shared `three` instance. The root
// build resolves the bare `three` import from the root node_modules while the
// standalone dev server resolves its own; if the declared ranges diverge the
// hosted game runs against a version it did not ask for (or the host does).

const ROOT = new URL('..', import.meta.url);
const SHARED_DEPS = ['three'];

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

test('root and downhill-mayhem declare compatible shared three ranges', () => {
  const root = readJson('package.json');
  const game = readJson('games/downhill-mayhem/package.json');
  const problems = [];
  for (const dep of SHARED_DEPS) {
    const rootRange = root.dependencies?.[dep];
    const gameRange = game.dependencies?.[dep];
    if (!rootRange) problems.push(`${dep}: missing from root dependencies`);
    if (!gameRange) problems.push(`${dep}: missing from games/downhill-mayhem dependencies`);
    if (!rootRange || !gameRange) continue;
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
    if (!rangeAllows(gameRange, installed)) {
      problems.push(`${dep}: games/downhill-mayhem range ${gameRange} excludes installed ${installed} (host/game drift)`);
    }
  }
  assert.deepEqual(problems, [], `shared dependency drift:\n  ${problems.join('\n  ')}`);
});

test('standalone.html preserves the original self-contained game byte-for-byte', () => {
  const offline = readFileSync(new URL('games/downhill-mayhem/standalone.html', ROOT));
  assert.ok(offline.length > 500_000, 'standalone.html still carries the inlined three.js build');
  const sha = createHash('sha256').update(offline).digest('hex');
  assert.equal(sha, '254858046aa8a934a26b4080e51d882b24406227686508318e0f93bc80cba3fc',
    'the offline artifact must remain byte-identical to the recorded source (task 2.2/13.3)');
  const text = offline.toString('latin1');
  assert.ok(text.includes('DOWNHILL MAYHEM'), 'the original game banner is preserved');
  assert.ok(text.includes('three.js r128'), 'the inlined offline three.js build is preserved');
});
