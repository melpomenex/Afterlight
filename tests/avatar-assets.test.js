import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { verifyAvatarGLB, TEST_MANNEQUIN_DEF } from '../scripts/verify-avatar-assets.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('verifyAvatarGLB passes valid mannequin GLB', () => {
  const glbPath = path.join(REPO_ROOT, 'public', 'avatars', '_test', 'mannequin.glb');
  const res = verifyAvatarGLB(glbPath, TEST_MANNEQUIN_DEF);
  assert.equal(res.valid, true, 'Mannequin GLB must be valid');
  assert.equal(res.errors.length, 0);
  assert.ok(res.stats.triangles <= 8000);
  assert.ok(res.stats.materials <= 4);
});

test('verifyAvatarGLB fails non-compliant model with missing contract nodes', () => {
  // Synthesize a minimal GLB missing AL_Rig and AL_Head
  const fakeGltf = {
    asset: { version: '2.0' },
    nodes: [{ name: 'SomeRandomNode' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ count: 300, type: 'VEC3' }],
    materials: [{ name: 'MAT_1' }],
  };

  const jsonStr = JSON.stringify(fakeGltf);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');
  // Align chunk to 4 bytes with space padding
  const padding = (4 - (jsonBuf.length % 4)) % 4;
  const paddedJson = Buffer.concat([jsonBuf, Buffer.alloc(padding, 0x20)]);

  const totalLen = 12 + 8 + paddedJson.length;
  const glbBuf = Buffer.alloc(totalLen);
  glbBuf.writeUInt32LE(0x46546c67, 0); // 'glTF'
  glbBuf.writeUInt32LE(2, 4);          // version
  glbBuf.writeUInt32LE(totalLen, 8);   // total length
  glbBuf.writeUInt32LE(paddedJson.length, 12); // chunk length
  glbBuf.writeUInt32LE(0x4e4f534a, 16);        // 'JSON'
  paddedJson.copy(glbBuf, 20);

  const tmpPath = path.join(REPO_ROOT, 'public', 'avatars', '_test', 'invalid_synth.glb');
  fs.writeFileSync(tmpPath, glbBuf);

  try {
    const res = verifyAvatarGLB(tmpPath, { rig: 'humanoid' });
    assert.equal(res.valid, false, 'Synthetic model must fail validation');
    assert.ok(res.errors.some(e => e.includes('Missing required rig node: AL_Rig')));
    assert.ok(res.errors.some(e => e.includes('Missing required rig node: AL_Head')));
    assert.ok(res.errors.some(e => e.includes('Missing required humanoid node: AL_Leg_L')));
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
});

test('verifyAvatarGLB fails models that exceed triangle budget', () => {
  const fakeGltf = {
    asset: { version: '2.0' },
    nodes: [
      { name: 'AL_Rig' },
      { name: 'AL_Root' },
      { name: 'AL_Head' },
      { name: 'AL_Arm_L' },
      { name: 'AL_Arm_R' },
      { name: 'AL_Leg_L' },
      { name: 'AL_Leg_R' },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ count: 30000, type: 'VEC3' }], // 10,000 triangles > 8,000 limit
    materials: [{ name: 'MAT_1' }],
  };

  const jsonStr = JSON.stringify(fakeGltf);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');
  const padding = (4 - (jsonBuf.length % 4)) % 4;
  const paddedJson = Buffer.concat([jsonBuf, Buffer.alloc(padding, 0x20)]);

  const totalLen = 12 + 8 + paddedJson.length;
  const glbBuf = Buffer.alloc(totalLen);
  glbBuf.writeUInt32LE(0x46546c67, 0);
  glbBuf.writeUInt32LE(2, 4);
  glbBuf.writeUInt32LE(totalLen, 8);
  glbBuf.writeUInt32LE(paddedJson.length, 12);
  glbBuf.writeUInt32LE(0x4e4f534a, 16);
  paddedJson.copy(glbBuf, 20);

  const tmpPath = path.join(REPO_ROOT, 'public', 'avatars', '_test', 'excess_tris.glb');
  fs.writeFileSync(tmpPath, glbBuf);

  try {
    const res = verifyAvatarGLB(tmpPath, { rig: 'humanoid' });
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('exceeds maximum 8000')));
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
});
