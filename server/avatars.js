/**
 * Server-side avatar assignment and validation for Node sidecar.
 *
 * Implements server-authoritative sticky avatar assignment (D1, D5).
 */

import crypto from 'node:crypto';
import { AVATAR_DEFINITIONS, getAvatarDefinition } from '../shared/avatarDefinitions.js';

/**
 * Performs a weighted random pick from avatar definitions.
 * @param {Array} definitions - List of avatar definitions with integer weights.
 * @param {number|null} roll - Optional explicit roll in [0, totalWeight) for testing.
 * @returns {string} The chosen avatar id.
 */
export function pickWeightedAvatar(definitions = AVATAR_DEFINITIONS, roll = null) {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    throw new Error('Cannot pick avatar from empty definitions');
  }
  const totalWeight = definitions.reduce((sum, d) => sum + d.weight, 0);
  if (totalWeight <= 0) {
    throw new Error('Total weight must be positive');
  }

  const target = roll !== null ? roll : crypto.randomInt(0, totalWeight);
  let cumulative = 0;
  for (const def of definitions) {
    cumulative += def.weight;
    if (target < cumulative) {
      return def.id;
    }
  }
  return definitions[definitions.length - 1].id;
}

/**
 * Ensures the player has a valid, stored avatar id.
 * - Stored valid avatar id: kept unchanged (stickiness).
 * - Missing or retired avatar id: newly assigned via weighted random pick and persisted.
 * - Client-supplied avatar values are never used (caller only passes stored player).
 *
 * @param {object} player - Player object from storage (or newly created).
 * @param {object|null} storage - Storage manager to persist changes immediately.
 * @returns {string} The resolved avatar id.
 */
export function ensureAvatar(player, storage = null) {
  if (!player || typeof player !== 'object') {
    throw new Error('Player must be an object');
  }

  // Validate existing persisted avatar against current manifest
  if (player.avatar && typeof player.avatar === 'string' && getAvatarDefinition(player.avatar)) {
    return player.avatar;
  }

  // Assign fresh avatar via server-side randomness
  const assigned = pickWeightedAvatar();
  player.avatar = assigned;

  if (storage && typeof storage.savePlayer === 'function') {
    storage.savePlayer(player);
  }

  return assigned;
}
