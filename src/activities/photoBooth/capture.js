/**
 * Booth-only offscreen strip capture. Never samples theater media, chat, or bystanders.
 * Download is a local data URL — no upload.
 */

import { PHOTO_BOOTH_POSES } from '../../../shared/photoBoothModel.js';

const FRAME_W = 240;
const FRAME_H = 180;
const POSE_OFFSETS = {
  wave: { x: 0, lean: -8 },
  peace: { x: 10, lean: 0 },
  lean: { x: -14, lean: 12 },
  together: { x: 0, lean: 0 },
};

function defaultCanvas(w, h) {
  if (typeof document !== 'undefined' && document.createElement) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return {
    width: w,
    height: h,
    getContext: () => ({
      fillStyle: '',
      fillRect() {},
      drawImage() {},
    }),
    toDataURL: () => 'data:image/png;base64,',
  };
}

function defaultDraw(ctx, { slot, pose, x, y }) {
  const off = POSE_OFFSETS[pose] || POSE_OFFSETS.wave;
  ctx.fillStyle = slot === 0 ? '#c9a06a' : slot === 1 ? '#8eb8c4' : '#d4c4a8';
  ctx.fillRect(x + off.x, y + off.lean, 36, 52);
  ctx.fillStyle = '#e8d8b5';
  ctx.fillRect(x + 8 + off.x, y - 16 + off.lean, 20, 18);
}

/**
 * Render a four-pose strip of consented slots into an offscreen canvas.
 * @param {object} opts
 * @param {{ slots: number[], includeTheaterMedia?: boolean, includeChat?: boolean, includeBystanders?: boolean }} opts.subjects
 * @param {string[]} [opts.poses]
 * @param {Function} [opts.drawFrame]
 * @param {Function} [opts.createCanvas]
 */
export function captureBoothStrip({
  subjects,
  poses = PHOTO_BOOTH_POSES,
  drawFrame = defaultDraw,
  createCanvas = defaultCanvas,
} = {}) {
  const slots = (subjects?.slots || []).filter((s) => Number.isInteger(s));
  const width = FRAME_W;
  const height = FRAME_H * poses.length;
  const strip = createCanvas(width, height);
  const ctx = strip.getContext('2d');
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(0, 0, width, height);

  poses.forEach((pose, poseIndex) => {
    const y0 = poseIndex * FRAME_H;
    ctx.fillStyle = '#241c18';
    ctx.fillRect(8, y0 + 8, width - 16, FRAME_H - 16);
    slots.forEach((slot, i) => {
      const x = 40 + i * 70;
      const y = y0 + 70;
      drawFrame(ctx, { slot, pose, poseIndex, x, y });
    });
  });

  const dataUrl = typeof strip.toDataURL === 'function' ? strip.toDataURL('image/png') : 'data:image/png;base64,';
  return {
    dataUrl,
    localOnly: true,
    upload: false,
    theaterMedia: false,
    chat: false,
    bystanders: false,
    slots,
    filename: 'afterlight-orpheum-strip.png',
  };
}

export function downloadLocalStrip(result) {
  if (!result?.dataUrl || typeof document === 'undefined') return false;
  const a = document.createElement('a');
  a.href = result.dataUrl;
  a.download = result.filename || 'afterlight-orpheum-strip.png';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}
