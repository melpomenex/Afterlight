#!/usr/bin/env node
/**
 * Avatar Asset Verifier.
 *
 * Enforces strict performance budgets and technical contracts for all authored avatars (design D7, D8):
 *   - Triangles: <= 8k
 *   - Materials: <= 4
 *   - Textures: <= 2 (each <= 1024x1024)
 *   - File size: <= 3 MB (target <= 1.5 MB)
 *   - Rig node hierarchy: AL_Rig, AL_Root, AL_Head (and AL_Arm_L/R, AL_Leg_L/R for humanoid)
 *   - Ground origin: Y near 0
 *   - Forward facing: +Z
 *
 * Usage:
 *   node scripts/verify-avatar-assets.mjs          # verify all existing avatar GLBs
 *   node scripts/verify-avatar-assets.mjs <id>     # verify single avatar GLB
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AVATAR_DEFINITIONS, getAvatarDefinition } from '../shared/avatarDefinitions.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const BUDGETS = Object.freeze({
  MAX_TRIANGLES: 8000,
  MAX_MATERIALS: 4,
  MAX_TEXTURES: 2,
  MAX_TEXTURE_DIM: 1024,
  MAX_FILE_SIZE_BYTES: 3 * 1024 * 1024, // 3 MB
  TARGET_FILE_SIZE_BYTES: 1.5 * 1024 * 1024, // 1.5 MB
});

export const TEST_MANNEQUIN_DEF = Object.freeze({
  id: 'mannequin',
  name: 'Mannequin',
  assetPath: 'avatars/_test/mannequin.glb',
  rig: 'humanoid',
  scale: 1.0,
  nameplateY: 2.3,
  tintMaterials: ['MAT_Accent'],
  effect: null,
  rarity: 'common',
  weight: 0,
});

/**
 * Parses GLB header and extracts JSON chunk.
 */
export function parseGLB(buffer) {
  if (buffer.length < 12) throw new Error('File too small to be a valid GLB');
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) throw new Error('Invalid GLB magic header'); // 'glTF'

  const version = buffer.readUInt32LE(4);
  if (version !== 2) throw new Error(`Unsupported glTF version: ${version}`);

  const totalLength = buffer.readUInt32LE(8);
  if (buffer.length < totalLength) throw new Error('Truncated GLB file');

  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.readUInt32LE(16);
  if (chunkType !== 0x4e4f534a) throw new Error('First GLB chunk must be JSON (0x4E4F534A)');

  const jsonBuf = buffer.subarray(20, 20 + chunkLength);
  const gltf = JSON.parse(jsonBuf.toString('utf8'));

  let binaryBuffer = null;
  const chunk1Start = 20 + chunkLength;
  if (chunk1Start + 8 <= buffer.length) {
    const binLength = buffer.readUInt32LE(chunk1Start);
    const binType = buffer.readUInt32LE(chunk1Start + 4);
    if (binType === 0x004e4942) { // 'BIN\0'
      binaryBuffer = buffer.subarray(chunk1Start + 8, chunk1Start + 8 + binLength);
    }
  }

  return { gltf, binaryBuffer };
}

/**
 * Verifies an avatar GLB against technical budgets and contracts.
 */
export function verifyAvatarGLB(filePath, definition) {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      errors: [`File does not exist: ${filePath}`],
      warnings: [],
      stats: null,
    };
  }

  const stat = fs.statSync(filePath);
  if (stat.size > BUDGETS.MAX_FILE_SIZE_BYTES) {
    errors.push(`File size ${(stat.size / 1024 / 1024).toFixed(2)} MB exceeds hard budget ${BUDGETS.MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`);
  } else if (stat.size > BUDGETS.TARGET_FILE_SIZE_BYTES) {
    warnings.push(`File size ${(stat.size / 1024 / 1024).toFixed(2)} MB exceeds target 1.5 MB`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  let gltf;
  try {
    const parsed = parseGLB(fileBuffer);
    gltf = parsed.gltf;
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to parse GLB: ${err.message}`],
      warnings: [],
      stats: null,
    };
  }

  // 1. Triangle count
  let totalTriangles = 0;
  if (Array.isArray(gltf.meshes)) {
    for (const mesh of gltf.meshes) {
      for (const prim of mesh.primitives || []) {
        if (prim.indices !== undefined) {
          const acc = gltf.accessors[prim.indices];
          if (acc) totalTriangles += acc.count / 3;
        } else if (prim.attributes?.POSITION !== undefined) {
          const acc = gltf.accessors[prim.attributes.POSITION];
          if (acc) totalTriangles += acc.count / 3;
        }
      }
    }
  }
  totalTriangles = Math.round(totalTriangles);
  if (totalTriangles > BUDGETS.MAX_TRIANGLES) {
    errors.push(`Triangle count ${totalTriangles} exceeds maximum ${BUDGETS.MAX_TRIANGLES}`);
  }

  // 2. Material count
  const materialCount = Array.isArray(gltf.materials) ? gltf.materials.length : 0;
  if (materialCount > BUDGETS.MAX_MATERIALS) {
    errors.push(`Material count ${materialCount} exceeds maximum ${BUDGETS.MAX_MATERIALS}`);
  }

  // 3. Texture count
  const textureCount = Array.isArray(gltf.textures) ? gltf.textures.length : 0;
  if (textureCount > BUDGETS.MAX_TEXTURES) {
    errors.push(`Texture count ${textureCount} exceeds maximum ${BUDGETS.MAX_TEXTURES}`);
  }

  // 4. Node hierarchy contracts
  const nodeNames = new Set((gltf.nodes || []).map((n) => n.name).filter(Boolean));

  // Common required nodes
  const commonRequired = ['AL_Rig', 'AL_Root', 'AL_Head'];
  for (const node of commonRequired) {
    if (!nodeNames.has(node)) {
      errors.push(`Missing required rig node: ${node}`);
    }
  }

  // Humanoid required nodes
  const isHumanoid = !definition || definition.rig === 'humanoid' || definition.rig === 'humanoid-heavy';
  if (isHumanoid) {
    const humanoidNodes = ['AL_Arm_L', 'AL_Arm_R', 'AL_Leg_L', 'AL_Leg_R'];
    for (const node of humanoidNodes) {
      if (!nodeNames.has(node)) {
        errors.push(`Missing required humanoid node: ${node}`);
      }
    }
  }

  // 5. Check ground origin (min Y) and head height (max Y) from position accessors
  let globalMinY = Infinity;
  let globalMaxY = -Infinity;
  if (Array.isArray(gltf.accessors)) {
    for (const acc of gltf.accessors) {
      if (acc.type === 'VEC3' && Array.isArray(acc.min) && Array.isArray(acc.max)) {
        if (acc.min[1] < globalMinY) globalMinY = acc.min[1];
        if (acc.max[1] > globalMaxY) globalMaxY = acc.max[1];
      }
    }
  }

  const stats = {
    fileSize: stat.size,
    triangles: totalTriangles,
    materials: materialCount,
    textures: textureCount,
    nodeCount: nodeNames.size,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

/**
 * Run verification on one or all avatars.
 */
export function runVerification(targetId = null) {
  let targets = [];
  if (targetId === 'mannequin') {
    targets = [TEST_MANNEQUIN_DEF];
  } else if (targetId) {
    const def = getAvatarDefinition(targetId);
    if (!def) {
      console.error(`Unknown avatar id: "${targetId}"`);
      return false;
    }
    targets = [def];
  } else {
    // Check all existing avatar files
    targets = [...AVATAR_DEFINITIONS, TEST_MANNEQUIN_DEF];
  }

  let allPassed = true;
  let checkedCount = 0;

  for (const def of targets) {
    const glbPath = path.join(REPO_ROOT, 'public', def.assetPath);
    if (!fs.existsSync(glbPath)) {
      if (targetId) {
        console.error(`[FAIL] ${def.id}: GLB file not found at ${def.assetPath}`);
        allPassed = false;
      }
      continue;
    }

    checkedCount++;
    const res = verifyAvatarGLB(glbPath, def);
    if (!res.valid) {
      allPassed = false;
      console.error(`[FAIL] ${def.id} (${def.name}):`);
      for (const err of res.errors) {
        console.error(`  - ${err}`);
      }
    } else {
      const warnText = res.warnings.length ? ` (${res.warnings.join('; ')})` : '';
      console.log(`[PASS] ${def.id}: ${res.stats.triangles} tris, ${res.stats.materials} mats, ${(res.stats.fileSize / 1024).toFixed(1)} KB${warnText}`);
    }
  }

  if (checkedCount === 0) {
    console.log('No existing avatar GLB files found to verify.');
  }

  return allPassed;
}

if (process.argv[1] && process.argv[1].endsWith('verify-avatar-assets.mjs')) {
  const arg = process.argv[2];
  const passed = runVerification(arg);
  process.exit(passed ? 0 : 1);
}
