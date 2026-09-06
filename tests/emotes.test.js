import test from 'node:test';
import assert from 'node:assert/strict';
import { emoteSector, isEmote } from '../shared/emotes.js';
import { startEmote, updateEmote, stopEmote } from '../src/render/avatars.js';
import * as THREE from 'three';
test('wheel center cancels and six directions select clockwise', () => {
  assert.equal(emoteSector(0, 0), -1);
  assert.equal(emoteSector(43, 0), -1);
  assert.equal(emoteSector(NaN, 4), -1);
  for (let i = 0; i < 6; i++) assert.equal(emoteSector(Math.sin(i * Math.PI / 3) * 100, -Math.cos(i * Math.PI / 3) * 100), i);
  assert.equal(isEmote('__proto__'), false);
});
test('poses expire and cancel without changing world position or facing', () => {
  const avatar = new THREE.Group();
  avatar.userData = { rig: new THREE.Group(), arms: [new THREE.Group(), new THREE.Group()] };
  avatar.position.set(3, 0, 4);
  for (const id of ['wave', 'dance', 'cheer', 'heart', 'bow', 'shrug']) {
    startEmote(avatar, id); updateEmote(avatar, .8);
    assert.ok(avatar.userData.arms.some(a => a.rotation.x || a.rotation.z));
    assert.deepEqual(avatar.position.toArray(), [3, 0, 4]);
    updateEmote(avatar, 4);
    assert.equal(avatar.userData.emote, null);
    assert.equal(avatar.userData.rig.rotation.x, 0);
  }
  startEmote(avatar, 'dance'); updateEmote(avatar, 1); stopEmote(avatar);
  assert.equal(avatar.userData.rig.rotation.z, 0);
});
