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
