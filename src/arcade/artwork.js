/**
 * Procedural cabinet artwork painter for the canonical arcade cabinet.
 *
 * Every upright machine shares one GLB; its five artwork channels (sides,
 * front, control panel, marquee) are painted here from the game definition's
 * palette/title/motif so adding a game never requires image assets. When a
 * definition later declares real files (`skin.files`), the factory loads them
 * instead and this painter becomes the automatic fallback — drop-in
 * replacement with no code changes (see docs/arcade.md).
 *
 * Channel aspect ratios mirror the GLB's UV layout (src/arcade/skins.js
 * SKIN_CHANNELS): never stretch square art across these panels.
 *
 * Canvas-only: every entry point tolerates a missing `document` (node tests)
 * by returning null.
 */

import { SKIN_CHANNELS } from './skins.js';

function createCanvas(w, h) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

// --- shared painting helpers ------------------------------------------------

function fillVerticalGradient(ctx, w, h, top, bottom) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function grain(ctx, w, h, amount = 0.05) {
  ctx.save();
  ctx.globalAlpha = amount;
  for (let i = 0; i < w * h / 900; i++) {
    const x = (i * 7919) % w;
    const y = (i * 104729) % h;
    ctx.fillStyle = i % 3 ? '#000000' : '#ffffff';
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

function printedFrame(ctx, w, h, accent) {
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.012);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
  ctx.globalAlpha = 1;
}

function glowText(ctx, text, x, y, font, fill, glow, blur = 14) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = glow;
  ctx.shadowBlur = blur;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function fitTitleFont(ctx, text, maxWidth, startPx, weight = 'bold') {
  let px = startPx;
  ctx.font = `${weight} ${px}px monospace`;
  while (px > startPx * 0.4 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${weight} ${px}px monospace`;
  }
  return px;
}

// --- motif painters -----------------------------------------------------------
// Each motif declares a background plus per-channel scene art; missing fns
// fall through to the generic title treatment.

const MOTIFS = {
  // Pong: white-on-graphite minimalism, giant paddles, oversized score.
  pong: {
    bg: (ctx, w, h, s) => fillVerticalGradient(ctx, w, h, '#15161a', '#0b0c0f'),
    side: (ctx, w, h, s) => {
      ctx.fillStyle = s.skin.palette.ink;
      ctx.fillRect(w * 0.14, h * 0.1, w * 0.1, h * 0.3);
      ctx.fillRect(w * 0.76, h * 0.58, w * 0.1, h * 0.3);
      ctx.setLineDash([w * 0.03, w * 0.045]);
      ctx.strokeStyle = s.skin.palette.ink;
      ctx.lineWidth = w * 0.016;
      ctx.beginPath(); ctx.moveTo(w / 2, h * 0.04); ctx.lineTo(w / 2, h * 0.96); ctx.stroke();
      ctx.setLineDash([]);
      glowText(ctx, '7', w * 0.32, h * 0.5, `bold ${w * 0.34}px monospace`, s.skin.palette.ink, 'rgba(255,255,255,0.5)', 10);
      glowText(ctx, '3', w * 0.68, h * 0.24, `bold ${w * 0.34}px monospace`, s.skin.palette.ink, 'rgba(255,255,255,0.5)', 10);
      ctx.fillStyle = s.skin.palette.ink;
      ctx.fillRect(w * 0.46, h * 0.47, w * 0.07, w * 0.07);
    },
    marquee: (ctx, w, h, s) => {
      const px = fitTitleFont(ctx, s.skin.title, w * 0.62, h * 0.62);
      glowText(ctx, s.skin.title, w * 0.46, h * 0.52, `bold ${px}px monospace`, s.skin.palette.ink, 'rgba(255,255,255,0.6)', 12);
      ctx.fillStyle = s.skin.palette.ink;
      ctx.fillRect(w * 0.86, h * 0.4, h * 0.22, h * 0.22);
    },
    front: (ctx, w, h, s) => {
      ctx.strokeStyle = s.skin.palette.ink;
      ctx.lineWidth = w * 0.02;
      ctx.strokeRect(w * 0.3, h * 0.3, w * 0.4, w * 0.4);
      ctx.fillStyle = s.skin.palette.ink;
      ctx.fillRect(w * 0.42, h * 0.42, w * 0.16, w * 0.16);
    },
    controlPanel: (ctx, w, h, s) => {
      // Printed pong "net" pinstripe only — the deck already carries the real
      // 3D sticks and buttons, so the plate must not fake control markings.
      ctx.save();
      ctx.strokeStyle = s.skin.palette.ink;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(2, w * 0.005);
      ctx.setLineDash([w * 0.018, w * 0.02]);
      ctx.beginPath();
      ctx.moveTo(w * 0.06, h * 0.82);
      ctx.lineTo(w * 0.94, h * 0.82);
      ctx.stroke();
      ctx.restore();
    },
  },

  // Rain Runner: wet teal night, diagonal rain, road lines, low car.
  rain: {
    bg: (ctx, w, h, s) => fillVerticalGradient(ctx, w, h, s.skin.palette.base, '#0a1622'),
    side: (ctx, w, h, s) => {
      ctx.save();
      ctx.strokeStyle = s.skin.palette.glow;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = Math.max(1.5, w * 0.012);
      for (let i = 0; i < 46; i++) {
        const x = (i * 137) % w;
        const y = (i * 613) % h;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - w * 0.05, y + h * 0.09); ctx.stroke();
      }
      ctx.restore();
      // Perspective road
      ctx.fillStyle = '#0d1b28';
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.52); ctx.lineTo(w * 1.1, h); ctx.lineTo(-w * 0.1, h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = s.skin.palette.glow;
      ctx.setLineDash([h * 0.05, h * 0.04]);
      ctx.lineWidth = w * 0.02;
      ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.54); ctx.lineTo(w * 0.5, h); ctx.stroke();
      ctx.setLineDash([]);
      // Low car silhouette
      ctx.fillStyle = s.skin.palette.accent;
      ctx.beginPath();
      ctx.moveTo(w * 0.3, h * 0.62);
      ctx.quadraticCurveTo(w * 0.5, h * 0.48, w * 0.7, h * 0.62);
      ctx.lineTo(w * 0.74, h * 0.7); ctx.lineTo(w * 0.26, h * 0.7); ctx.closePath(); ctx.fill();
      glowText(ctx, '»', w * 0.5, h * 0.84, `bold ${w * 0.2}px monospace`, s.skin.palette.glow, s.skin.palette.glow, 12);
    },
    marquee: (ctx, w, h, s) => {
      const px = fitTitleFont(ctx, s.skin.title, w * 0.7, h * 0.6);
      glowText(ctx, s.skin.title, w / 2, h * 0.54, `italic bold ${px}px monospace`, s.skin.palette.glow, s.skin.palette.glow, 16);
    },
    front: (ctx, w, h, s) => {
      ctx.strokeStyle = s.skin.palette.glow;
      ctx.lineWidth = w * 0.016;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.16, h * (0.3 + i * 0.12));
        ctx.lineTo(w * (0.5 + i * 0.08), h * (0.3 + i * 0.12));
        ctx.stroke();
      }
    },
  },

  // Signal Lost: violet-black space, starfield, wireframe rock, triangle ship.
  signal: {
    bg: (ctx, w, h, s) => fillVerticalGradient(ctx, w, h, '#0c0a18', s.skin.palette.base),
    side: (ctx, w, h, s) => {
      ctx.fillStyle = s.skin.palette.ink;
      for (let i = 0; i < 90; i++) {
        const x = (i * 373) % w, y = (i * 811) % h;
        ctx.globalAlpha = 0.25 + ((i * 31) % 70) / 100;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = s.skin.palette.glow;
      ctx.lineWidth = w * 0.012;
      ctx.beginPath();
      for (let a = 0; a < 7; a++) {
        const ang = a / 7 * Math.PI * 2 - Math.PI / 2;
        const r = w * (a % 2 ? 0.14 : 0.24);
        const x = w * 0.5 + Math.cos(ang) * r, y = h * 0.34 + Math.sin(ang) * r;
        a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
      ctx.fillStyle = s.skin.palette.accent;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.62); ctx.lineTo(w * 0.38, h * 0.8); ctx.lineTo(w * 0.62, h * 0.8);
      ctx.closePath(); ctx.fill();
    },
    marquee: (ctx, w, h, s) => {
      ctx.save();
      ctx.font = `bold ${h * 0.5}px monospace`;
      const px = fitTitleFont(ctx, s.skin.title, w * 0.66, h * 0.5);
      glowText(ctx, s.skin.title, w / 2, h * 0.54, `bold ${px}px monospace`, s.skin.palette.glow, s.skin.palette.glow, 18);
      ctx.restore();
      ctx.fillStyle = s.skin.palette.ink;
      ctx.fillRect(w * 0.08, h * 0.42, 3, 3);
      ctx.fillRect(w * 0.92, h * 0.6, 3, 3);
      ctx.fillRect(w * 0.85, h * 0.25, 2, 2);
    },
    front: (ctx, w, h, s) => {
      ctx.strokeStyle = s.skin.palette.glow;
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 1 - i * 0.22;
        ctx.lineWidth = w * 0.01;
        ctx.beginPath(); ctx.arc(w / 2, h * 0.46, w * 0.09 * i, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = s.skin.palette.accent;
      ctx.fillRect(w * 0.485, h * 0.3, w * 0.03, h * 0.06);
    },
  },

  // Sporefall: mossy forest dusk, mushroom line, drifting spores.
  spore: {
    bg: (ctx, w, h, s) => fillVerticalGradient(ctx, w, h, '#131a12', s.skin.palette.base),
    side: (ctx, w, h, s) => {
      // Ground line + mushroom silhouettes
      ctx.fillStyle = '#0d130c';
      ctx.fillRect(0, h * 0.78, w, h * 0.22);
      const cap = (cx, scale) => {
        ctx.fillStyle = s.skin.palette.accent;
        ctx.beginPath();
        ctx.arc(cx, h * 0.78, w * 0.16 * scale, Math.PI, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d8cdb4';
        ctx.fillRect(cx - w * 0.03 * scale, h * 0.78, w * 0.06 * scale, h * 0.09);
      };
      cap(w * 0.3, 1.1); cap(w * 0.68, 0.8);
      ctx.fillStyle = s.skin.palette.glow;
      for (let i = 0; i < 40; i++) {
        const x = (i * 419) % w, y = (i * 271) % (h * 0.7);
        ctx.globalAlpha = 0.3 + ((i * 17) % 50) / 100;
        ctx.beginPath(); ctx.arc(x, y, w * 0.012, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    marquee: (ctx, w, h, s) => {
      const px = fitTitleFont(ctx, s.skin.title, w * 0.68, h * 0.58);
      glowText(ctx, s.skin.title, w / 2, h * 0.55, `bold ${px}px Georgia, serif`, s.skin.palette.glow, s.skin.palette.glow, 14);
    },
    front: (ctx, w, h, s) => {
      ctx.fillStyle = s.skin.palette.accent;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.4, w * 0.2, Math.PI, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8cdb4';
      ctx.fillRect(w * 0.47, h * 0.4, w * 0.06, h * 0.14);
    },
  },

  // Summit Run: night mountain, layered peaks, winding lit trail, pines and
  // an amber lodge glow — original Afterlight re-theme of the race identity.
  summit: {
    bg: (ctx, w, h, s) => fillVerticalGradient(ctx, w, h, '#0b1420', s.skin.palette.base),
    side: (ctx, w, h, s) => {
      // Distant and near ridgelines under a starfield.
      ctx.fillStyle = s.skin.palette.ink;
      for (let i = 0; i < 46; i++) {
        const x = (i * 397) % w, y = (i * 761) % (h * 0.4);
        ctx.globalAlpha = 0.2 + ((i * 13) % 60) / 100;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
      const ridge = (base, amp, fill) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i <= 8; i++) {
          const x = (i / 8) * w;
          const y = base - amp * Math.abs(Math.sin(i * 2.7 + base));
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath(); ctx.fill();
      };
      ridge(h * 0.52, h * 0.16, '#16222e');
      ridge(h * 0.66, h * 0.12, '#101a24');
      // Winding floodlit trail with checkpoint dots.
      ctx.strokeStyle = s.skin.palette.glow;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = w * 0.02;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.06);
      ctx.bezierCurveTo(w * 0.1, h * 0.3, w * 0.9, h * 0.5, w * 0.42, h * 0.8);
      ctx.stroke();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) {
        const t = 0.18 + i * 0.2;
        const x = w * (0.5 - 0.34 * t + 0.5 * Math.sin(t * 7.2));
        const y = h * (0.1 + 0.7 * t);
        ctx.fillStyle = i % 2 ? s.skin.palette.accent : s.skin.palette.glow;
        ctx.beginPath(); ctx.arc(x, y, w * 0.014, 0, Math.PI * 2); ctx.fill();
      }
      // Pine line and the lodge's warm windows at the run's end.
      for (let i = 0; i < 7; i++) {
        const x = w * (0.06 + i * 0.15);
        ctx.fillStyle = '#0a0f14';
        ctx.beginPath();
        ctx.moveTo(x, h * 0.86); ctx.lineTo(x + w * 0.035, h * 0.7); ctx.lineTo(x + w * 0.07, h * 0.86);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = s.skin.palette.glow;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(w * 0.4, h * 0.88, w * 0.2, h * 0.03);
      ctx.globalAlpha = 1;
    },
    marquee: (ctx, w, h, s) => {
      const px = fitTitleFont(ctx, s.skin.title, w * 0.68, h * 0.52);
      glowText(ctx, s.skin.title, w / 2, h * 0.56, `bold ${px}px monospace`, s.skin.palette.glow, s.skin.palette.glow, 16);
      // Small peak mark over the title.
      ctx.strokeStyle = s.skin.palette.ink;
      ctx.lineWidth = w * 0.012;
      ctx.beginPath();
      ctx.moveTo(w * 0.36, h * 0.2); ctx.lineTo(w * 0.5, h * 0.05); ctx.lineTo(w * 0.64, h * 0.2);
      ctx.stroke();
    },
    front: (ctx, w, h, s) => {
      // Mini trail map: three linked runs, this machine's run highlighted.
      ctx.strokeStyle = '#2c3c4a';
      ctx.lineWidth = w * 0.016;
      ctx.beginPath();
      ctx.moveTo(w * 0.3, h * 0.14); ctx.bezierCurveTo(w * 0.5, h * 0.4, w * 0.2, h * 0.6, w * 0.42, h * 0.88);
      ctx.stroke();
      ctx.strokeStyle = s.skin.palette.glow;
      ctx.beginPath();
      ctx.moveTo(w * 0.62, h * 0.12); ctx.bezierCurveTo(w * 0.42, h * 0.36, w * 0.8, h * 0.62, w * 0.55, h * 0.9);
      ctx.stroke();
      ctx.fillStyle = s.skin.palette.accent;
      ctx.beginPath(); ctx.arc(w * 0.62, h * 0.12, w * 0.025, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.55, h * 0.9, w * 0.025, 0, Math.PI * 2); ctx.fill();
    },
    controlPanel: (ctx, w, h, s) => {
      // Slope pinstripes only — the deck carries the real controls.
      ctx.save();
      ctx.strokeStyle = s.skin.palette.accent;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = Math.max(2, w * 0.004);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(w * (0.1 + i * 0.06), h * 0.85);
        ctx.lineTo(w * (0.7 + i * 0.06), h * 0.2);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // Kart Royale: golden-hour circuit — low sun, checkered ribbon, a drifting
  // kart silhouette trailing sparks and speed lines (integrate-kart-royale-arcade).
  kart: {
    bg: (ctx, w, h, s) => fillVerticalGradient(ctx, w, h, s.skin.palette.base, '#3d1f0a'),
    side: (ctx, w, h, s) => {
      // Low golden sun with a warm haze band over a dusk track.
      const sunY = h * 0.34;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = s.skin.palette.glow;
      ctx.fillRect(0, sunY - h * 0.05, w, h * 0.1);
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(w * 0.68, sunY, w * 0.11, 0, Math.PI * 2); ctx.fill();
      // Speed lines fanning back from the sun-side corner.
      ctx.strokeStyle = s.skin.palette.accent;
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = 0.25 + i * 0.1;
        ctx.lineWidth = Math.max(1.5, w * 0.008);
        ctx.beginPath();
        ctx.moveTo(w * (0.06 + i * 0.045), h * 0.06);
        ctx.lineTo(w * (0.3 + i * 0.05), h * 0.62);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Road plane with a dashed centerline running into the distance.
      ctx.fillStyle = '#1c0f06';
      ctx.beginPath();
      ctx.moveTo(w * 0.42, h * 0.52); ctx.lineTo(w * 1.08, h); ctx.lineTo(-w * 0.08, h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = s.skin.palette.ink;
      ctx.setLineDash([h * 0.045, h * 0.05]);
      ctx.lineWidth = w * 0.018;
      ctx.beginPath(); ctx.moveTo(w * 0.47, h * 0.54); ctx.lineTo(w * 0.5, h); ctx.stroke();
      ctx.setLineDash([]);
      // Kart silhouette mid-drift: nose swung wide, tires biting.
      const kx = w * 0.4, ky = h * 0.72;
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(-0.14);
      ctx.fillStyle = s.skin.palette.accent;
      ctx.beginPath();
      ctx.moveTo(-w * 0.16, 0);
      ctx.quadraticCurveTo(-w * 0.05, -h * 0.09, w * 0.13, -h * 0.02);
      ctx.lineTo(w * 0.16, h * 0.02); ctx.lineTo(-w * 0.12, h * 0.04);
      ctx.closePath(); ctx.fill();
      // Driver helmet.
      ctx.fillStyle = s.skin.palette.ink;
      ctx.beginPath(); ctx.arc(-w * 0.02, -h * 0.075, w * 0.028, 0, Math.PI * 2); ctx.fill();
      // Wheels.
      ctx.fillStyle = '#120a04';
      for (const [wx, wy] of [[-0.13, 0.03], [0.12, 0.02]]) {
        ctx.beginPath(); ctx.arc(w * wx, h * wy, w * 0.03, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // Drift sparks kicking off the rear wheel.
      for (let i = 0; i < 7; i++) {
        const t = i / 7;
        ctx.globalAlpha = 0.85 - t * 0.55;
        ctx.fillStyle = i % 2 ? s.skin.palette.glow : s.skin.palette.ink;
        ctx.beginPath();
        ctx.arc(kx - w * (0.2 + t * 0.18), ky + h * (0.03 + Math.sin(i * 2.1) * 0.02), w * 0.008 * (1 + t), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    },
    marquee: (ctx, w, h, s) => {
      const px = fitTitleFont(ctx, s.skin.title, w * 0.74, h * 0.56);
      glowText(ctx, s.skin.title, w / 2, h * 0.54, `italic bold ${px}px monospace`, s.skin.palette.ink, s.skin.palette.glow, 18);
      // Checkered ribbon under the title.
      const cw = w * 0.05, ch = h * 0.07, y0 = h * 0.72;
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 2; j++) {
          if ((i + j) % 2) continue;
          ctx.fillStyle = s.skin.palette.ink;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(w * 0.02 + i * cw, y0 + j * ch, cw, ch);
        }
      }
      ctx.globalAlpha = 1;
    },
    front: (ctx, w, h, s) => {
      // Twin racing stripes converging toward the player.
      ctx.strokeStyle = s.skin.palette.accent;
      ctx.lineWidth = w * 0.03;
      ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.2); ctx.lineTo(w * 0.42, h * 0.85); ctx.stroke();
      ctx.strokeStyle = s.skin.palette.glow;
      ctx.beginPath(); ctx.moveTo(w * 0.72, h * 0.2); ctx.lineTo(w * 0.58, h * 0.85); ctx.stroke();
      ctx.fillStyle = s.skin.palette.ink;
      ctx.font = `bold ${w * 0.09}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('1st', w * 0.5, h * 0.4);
      ctx.textAlign = 'left';
    },
    controlPanel: (ctx, w, h, s) => {
      // Checkered pinstripe only — the deck carries the real wheel controls.
      ctx.save();
      const s2 = Math.max(3, w * 0.012);
      for (let i = 0; i * s2 * 2 < w * 0.88; i++) {
        ctx.fillStyle = i % 2 ? s.skin.palette.accent : 'transparent';
        ctx.globalAlpha = 0.4;
        if (i % 2) ctx.fillRect(w * 0.06 + i * s2 * 2, h * 0.84, s2, s2 * 2);
      }
      ctx.restore();
    },
  },

  // Downhill Mayhem: alpine descent — a frost-lit ridgeline, a descending
  // trail with a rider silhouette mid-air, and impact sparks over deep pine
  // green with a warm amber accent (integrate-multiplayer-downhill-mayhem-arcade).
  downhill: {
    bg: (ctx, w, h, s) => fillVerticalGradient(ctx, w, h, s.skin.palette.base, '#081712'),
    side: (ctx, w, h, s) => {
      // Layered ridgelines receding into the distance.
      const ridges = [
        { y: h * 0.3, amp: h * 0.12, color: 'rgba(255,255,255,0.10)', step: w * 0.16 },
        { y: h * 0.4, amp: h * 0.16, color: 'rgba(255,255,255,0.18)', step: w * 0.2 },
        { y: h * 0.52, amp: h * 0.2, color: 'rgba(0,0,0,0.35)', step: w * 0.24 },
      ];
      for (const ridge of ridges) {
        ctx.fillStyle = ridge.color;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += ridge.step) {
          ctx.lineTo(x, ridge.y + Math.sin(x * 0.02) * ridge.amp * 0.4 + (x / w) * ridge.amp * 0.5);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
      // Descending trail.
      ctx.strokeStyle = s.skin.palette.ink;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = Math.max(2, w * 0.02);
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.3);
      ctx.quadraticCurveTo(w * 0.5, h * 0.52, w * 0.74, h * 0.88);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Rider silhouette mid-air over the trail.
      const rx = w * 0.46, ry = h * 0.46;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(0.18);
      ctx.fillStyle = s.skin.palette.accent;
      // Frame.
      ctx.lineWidth = Math.max(1.5, w * 0.012);
      ctx.strokeStyle = s.skin.palette.accent;
      ctx.beginPath();
      ctx.moveTo(-w * 0.07, 0); ctx.lineTo(w * 0.05, 0);
      ctx.moveTo(-w * 0.04, -h * 0.005); ctx.lineTo(-w * 0.01, h * 0.03);
      ctx.moveTo(w * 0.02, -h * 0.005); ctx.lineTo(w * 0.04, h * 0.03);
      ctx.stroke();
      // Wheels.
      ctx.fillStyle = '#0b1512';
      for (const [wx, wy] of [[-0.06, 0.01], [0.04, 0.01]]) {
        ctx.beginPath(); ctx.arc(w * wx, h * wy, w * 0.022, 0, Math.PI * 2); ctx.fill();
      }
      // Rider body.
      ctx.fillStyle = s.skin.palette.ink;
      ctx.beginPath(); ctx.arc(-w * 0.005, -h * 0.06, w * 0.02, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-w * 0.012, -h * 0.05, w * 0.028, h * 0.06);
      ctx.restore();
      // Impact sparks trailing the rear wheel.
      for (let i = 0; i < 7; i++) {
        const t = i / 7;
        ctx.globalAlpha = 0.85 - t * 0.55;
        ctx.fillStyle = i % 2 ? s.skin.palette.glow : s.skin.palette.ink;
        ctx.beginPath();
        ctx.arc(w * (0.3 + t * 0.14), h * (0.52 + Math.sin(i * 2.1) * 0.02) + t * h * 0.05, w * 0.008 * (1 + t), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    marquee: (ctx, w, h, s) => {
      const px = fitTitleFont(ctx, s.skin.title, w * 0.8, h * 0.5);
      glowText(ctx, s.skin.title, w / 2, h * 0.46, `bold ${px}px monospace`, s.skin.palette.ink, s.skin.palette.glow, 18);
      // Trail chevrons under the title.
      ctx.strokeStyle = s.skin.palette.accent;
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = 0.4 + i * 0.12;
        ctx.lineWidth = Math.max(2, h * 0.03);
        const y = h * 0.7 + i * h * 0.045;
        ctx.beginPath();
        ctx.moveTo(w * (0.36 - i * 0.015), y);
        ctx.lineTo(w * 0.5, y + h * 0.03);
        ctx.lineTo(w * (0.64 + i * 0.015), y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    front: (ctx, w, h, s) => {
      // Downhill grade stripes with a wheel roundel.
      ctx.strokeStyle = s.skin.palette.accent;
      ctx.lineWidth = w * 0.03;
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.8 - i * 0.2;
        ctx.beginPath();
        ctx.moveTo(w * (0.24 + i * 0.14), h * 0.16);
        ctx.lineTo(w * (0.4 + i * 0.14), h * 0.86);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = s.skin.palette.glow;
      ctx.lineWidth = Math.max(2, w * 0.014);
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.46, w * 0.1, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = s.skin.palette.ink;
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.46, w * 0.03, 0, Math.PI * 2); ctx.fill();
    },
    controlPanel: (ctx, w, h, s) => {
      // Chevron grade pinstripe only — the deck carries the real controls.
      ctx.save();
      ctx.strokeStyle = s.skin.palette.accent;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.beginPath();
      for (let i = 0; i * w * 0.03 < w * 0.88; i++) {
        const x = w * 0.06 + i * w * 0.03;
        ctx.moveTo(x, h * 0.82);
        ctx.lineTo(x + w * 0.012, h * 0.78);
        ctx.lineTo(x + w * 0.024, h * 0.82);
      }
      ctx.stroke();
      ctx.restore();
    },
  },

  // Default Afterlight treatment: warm amber over wet slate.
  afterlight: {
    bg: (ctx, w, h, s) => fillVerticalGradient(ctx, w, h, s.skin.palette.base, '#141518'),
    side: (ctx, w, h, s) => {
      ctx.fillStyle = s.skin.palette.glow;
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < 6; i++) {
        const bw = w * (0.1 + (i % 3) * 0.04);
        const bh = h * (0.12 + (i % 4) * 0.05);
        ctx.fillRect(w * (0.1 + i * 0.14), h * 0.7 - bh, bw, bh);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = s.skin.palette.accent;
      ctx.fillRect(w * 0.08, h * 0.7, w * 0.84, h * 0.012);
    },
  },
};

function paintTitleStripe(ctx, w, h, spec) {
  const { title } = spec.skin;
  const px = fitTitleFont(ctx, title, w * 0.86, Math.min(w, h) * 0.14);
  glowText(ctx, title, w / 2, h * 0.9, `bold ${px}px monospace`, spec.skin.palette.ink, spec.skin.palette.glow, 10);
}

/**
 * Paints one artwork channel for a normalized skin. Returns a canvas (or
 * null when DOM is unavailable). `channel` is a SKIN_CHANNELS key.
 */
export function paintSkinChannel(channel, spec) {
  const channelDef = SKIN_CHANNELS[channel];
  if (!channelDef) return null;
  const canvas = createCanvas(channelDef.canvas[0], channelDef.canvas[1]);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const motif = MOTIFS[spec.skin.motif] || MOTIFS.afterlight;

  (motif.bg || MOTIFS.afterlight.bg)(ctx, w, h, spec);
  const scene = motif[channel];
  if (scene) {
    scene(ctx, w, h, spec);
  } else {
    // Generic scene: soft diagonal accent wash so panels never ship flat.
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = spec.skin.palette.accent;
    ctx.beginPath();
    ctx.moveTo(0, h); ctx.lineTo(w * 0.5, 0); ctx.lineTo(w * 0.75, 0); ctx.lineTo(w * 0.25, h);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  if (channel === 'left' || channel === 'right') paintTitleStripe(ctx, w, h, spec);
  if (channel === 'controlPanel' && spec.skin.tagline) {
    ctx.save();
    ctx.font = `${h * 0.1}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = spec.skin.palette.ink;
    ctx.globalAlpha = 0.8;
    ctx.fillText(spec.skin.tagline, w * 0.42, h * 0.5);
    ctx.restore();
  }
  grain(ctx, w, h);
  printedFrame(ctx, w, h, spec.skin.palette.accent);
  return canvas;
}

/** Dev-only hierarchy dump target naming, shared with the factory docs. */
export function skinFileUrl(gameId, file, baseUrl = '/') {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}arcade/games/${encodeURIComponent(gameId)}/${file}`;
}
