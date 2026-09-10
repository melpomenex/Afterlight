/**
 * Hosted session separation (fix-kart-royale-instant-entry 4.2).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('controller commits view lease before mounting the live session', async () => {
  const src = await readFile(join(root, 'src/activities/kart-royale/controller.js'), 'utf8');
  const acquireIdx = src.indexOf('acquireTheView()');
  const beginIdx = src.indexOf('host.beginSession()');
  assert.ok(acquireIdx >= 0, 'acquireTheView must exist');
  assert.ok(beginIdx >= 0, 'host.beginSession must exist');
  assert.ok(beginIdx > acquireIdx, 'beginSession must follow view acquisition');
});

test('hosted runtime exposes beginSession/endSession that split HUD/audio from boot', async () => {
  const runtime = await readFile(join(root, 'games/kart-royale/src/host/runtime.ts'), 'utf8');
  assert.match(runtime, /function beginSession\(\)/);
  assert.match(runtime, /hud\.enterSession\(\)/);
  assert.match(runtime, /audio\.enterSession\(\)/);
  assert.match(runtime, /function endSession\(\)/);
  assert.match(runtime, /hud\.leaveSession\(\)/);
  assert.match(runtime, /audio\.leaveSession\(\)/);
});

test('hosted HUD stays hidden until enterSession', async () => {
  const hud = await readFile(join(root, 'games/kart-royale/src/ui/HUD.ts'), 'utf8');
  assert.match(hud, /this\.root\.hidden = true/);
  assert.match(hud, /enterSession\(\)/);
  assert.match(hud, /this\.root\.hidden = false/);
});

test('hosted audio defers gesture listeners until enterSession', async () => {
  const audio = await readFile(join(root, 'games/kart-royale/src/audio/Audio.ts'), 'utf8');
  assert.match(audio, /if \(!this\.external\) this\.mountSession\(\)/);
  assert.match(audio, /enterSession\(\)/);
  assert.match(audio, /private mountSession\(\)/);
});

test('controller runs cold boot concurrently with admission join', async () => {
  const src = await readFile(join(root, 'src/activities/kart-royale/controller.js'), 'utf8');
  assert.match(src, /if \(coldPreparationEnabled\) \{\s*void createAndBootHost\(\)/);
  assert.match(src, /participation\(\)\?\.join/);
});

test('controller consumes the entry E keyup after session commit', async () => {
  const src = await readFile(join(root, 'src/activities/kart-royale/controller.js'), 'utf8');
  assert.match(src, /consumeEntryKeyUp/);
  assert.match(src, /consumeEntryKeyUp = true/);
});

test('race resetToSelectionSession avoids countdown start', async () => {
  const race = await readFile(join(root, 'games/kart-royale/src/game/Race.ts'), 'utf8');
  assert.match(race, /resetToSelectionSession/);
  assert.match(race, /this\._state = RaceState\.Menu/);
  assert.doesNotMatch(race, /resetToSelectionSession[\s\S]*?this\.start\(\)/);
});

test('hosted input defers gamepad and haptics bus until enter', async () => {
  const input = await readFile(join(root, 'games/kart-royale/src/core/Input.ts'), 'utf8');
  assert.match(input, /mountSessionListeners\(\)/);
  assert.match(input, /if \(this\.hosted\) \{\s*this\.mountSessionListeners\(\)/);
});
