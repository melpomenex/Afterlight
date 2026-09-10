import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

// integrate-multiplayer-downhill-mayhem-arcade 2.2/2.3/13.1. The original
// self-contained game stays byte-for-byte; the ES-module shell is the only
// standalone entry and the ONLY place that creates a WebGLRenderer.

const ROOT = new URL('..', import.meta.url);
const GAME = new URL('games/downhill-mayhem/', ROOT);

test('standalone.html is byte-identical to the preserved original', () => {
  const offline = readFileSync(new URL('standalone.html', GAME));
  const sha = createHash('sha256').update(offline).digest('hex');
  assert.equal(sha, '254858046aa8a934a26b4080e51d882b24406227686508318e0f93bc80cba3fc',
    'the offline artifact must remain byte-identical (task 2.2/13.3)');
});

test('src/standalone.js exists and index.html imports it', () => {
  const standalone = new URL('src/standalone.js', GAME);
  assert.equal(existsSync(standalone), true, 'games/downhill-mayhem/src/standalone.js exists');
  const html = readFileSync(new URL('index.html', GAME), 'utf8');
  assert.ok(html.includes('./src/standalone.js'), 'index.html imports the standalone module');
  assert.ok(html.includes('bootStandalone'), 'index.html boots the standalone shell');
});

test('only the standalone entry creates a WebGLRenderer', () => {
  const offenders = [];
  const files = readdirSync(new URL('src/', GAME), { recursive: true, withFileTypes: false })
    .map(String).filter((f) => f.endsWith('.js'));
  for (const rel of files) {
    const text = readFileSync(new URL(`src/${rel}`, GAME), 'utf8');
    if (/new\s+(THREE\.)?WebGLRenderer\s*\(/.test(text) && rel !== 'standalone.js') {
      offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, [], `renderer creation outside the standalone entry: ${offenders.join(', ')}`);

  const standalone = readFileSync(new URL('src/standalone.js', GAME), 'utf8');
  assert.match(standalone, /new\s+THREE\.WebGLRenderer\s*\(/, 'standalone.js creates the renderer');
});

test('no hosted/game module owns a requestAnimationFrame loop', () => {
  const offenders = [];
  const files = readdirSync(new URL('src/', GAME), { recursive: true, withFileTypes: false })
    .map(String).filter((f) => f.endsWith('.js'));
  for (const rel of files) {
    if (rel === 'standalone.js') continue;
    const text = readFileSync(new URL(`src/${rel}`, GAME), 'utf8');
    if (/\brequestAnimationFrame\s*\(/.test(text)) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], `RAF ownership outside the standalone shell: ${offenders.join(', ')}`);
});
