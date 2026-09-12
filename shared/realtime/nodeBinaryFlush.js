// Node server binary flush — mirrors `Afterlight.World.BinaryFlush.encode_flush/3`.

import { FRAME_TYPE, ENCODING } from './constants.js';
import { writeFrame } from './writer.js';
import { playerEntityId } from './entityId.js';

export function poseFlags(pose) {
  let f = 0;
  if (pose?.walking) f |= 1;
  if (pose?.sitting) f |= 2;
  if (pose?.airborne) f |= 4;
  return f;
}

/**
 * @param {Array<{id?: string, player_id?: string, x?: number, z?: number, rotY?: number, yaw?: number, walking?: boolean, sitting?: boolean, airborne?: boolean, pose?: object}>} members
 * @param {number} tickCount
 * @param {number} seq
 * @returns {Uint8Array}
 */
export function encodeFlush(members, tickCount, seq) {
  const ids = [];
  const xs = [];
  const ys = [];
  const zs = [];
  const yaws = [];
  const flags = [];

  for (const m of members) {
    const id = playerEntityId(m.id ?? m.player_id);
    const pose = m.pose ?? m;
    ids.push(id);
    xs.push(pose.x ?? 0);
    ys.push(0);
    zs.push(pose.z ?? 0);
    yaws.push(pose.rotY ?? pose.yaw ?? pose.rot_y ?? 0);
    flags.push(poseFlags({
      walking: !!(pose.walking),
      sitting: !!(pose.sitting),
      airborne: !!(pose.airborne),
    }));
  }

  const result = writeFrame({
    frameType: FRAME_TYPE.DELTA,
    roomEpoch: 0,
    serverTick: tickCount,
    frameSequence: seq,
    baselineSequence: Math.max(seq - 1, 0),
    transform: {
      encoding: ENCODING.SORTED_IDS,
      ids,
      columns: { x: xs, y: ys, z: zs, yaw: yaws },
      count: ids.length,
    },
    flags: {
      encoding: ENCODING.SORTED_IDS,
      ids,
      columns: { flags },
      count: ids.length,
    },
  });

  if (!result.ok) throw new Error(result.reason ?? 'encode_failed');
  return result.bytes;
}

/**
 * Full-roster flush as a self-validating FULL snapshot (fix-remote-avatar-
 * flicker): SPAWN rows carry each member's guest id once via the string
 * table, and transform/flags columns are ordered by ascending entity id
 * (the SORTED_IDS contract the WASM decoder enforces).
 *
 * @param {Array<{id?: string, player_id?: string, x?: number, z?: number, rotY?: number, yaw?: number, walking?: boolean, sitting?: boolean, airborne?: boolean, pose?: object}>} members
 * @param {number} tickCount
 * @param {number} seq
 * @returns {Uint8Array}
 */
export function encodeSnapshot(members, tickCount, seq) {
  const rows = members
    .map((m) => {
      const id = playerEntityId(m.id ?? m.player_id);
      const pose = m.pose ?? m;
      return {
        id,
        guestId: m.id ?? m.player_id,
        x: pose.x ?? 0,
        y: 0,
        z: pose.z ?? 0,
        yaw: pose.rotY ?? pose.yaw ?? pose.rot_y ?? 0,
        flags: poseFlags({
          walking: !!(pose.walking),
          sitting: !!(pose.sitting),
          airborne: !!(pose.airborne),
        }),
      };
    })
    .sort((a, b) => a.id - b.id);

  const ids = rows.map((r) => r.id);
  const result = writeFrame({
    frameType: FRAME_TYPE.FULL_SNAPSHOT,
    roomEpoch: 0,
    serverTick: tickCount,
    frameSequence: seq,
    baselineSequence: Math.max(seq - 1, 0),
    spawn: rows.map((r) => ({
      id: r.id,
      guestId: r.guestId,
      archetype: 0,
      variant: 0,
      x: r.x,
      y: r.y,
      z: r.z,
      yaw: r.yaw,
    })),
    transform: {
      encoding: ENCODING.SORTED_IDS,
      ids,
      columns: {
        x: rows.map((r) => r.x),
        y: rows.map((r) => r.y),
        z: rows.map((r) => r.z),
        yaw: rows.map((r) => r.yaw),
      },
      count: ids.length,
    },
    flags: {
      encoding: ENCODING.SORTED_IDS,
      ids,
      columns: { flags: rows.map((r) => r.flags) },
      count: ids.length,
    },
  });

  if (!result.ok) throw new Error(result.reason ?? 'encode_failed');
  return result.bytes;
}
