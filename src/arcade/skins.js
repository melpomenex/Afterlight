/**
 * Pure arcade-cabinet skin logic for the canonical cabinet system.
 *
 * One shared GLB (public/arcade/cabinet/afterlight_arcade_cabinet.glb) is
 * instanced for every upright arcade machine; everything that differs per
 * game — artwork channels, LED trim, control plastics, screen source — comes
 * from the activity definition's `cabinet` block in shared/placeDefinitions.js.
 * This module owns the pure part: normalization with defaults, validation,
 * and the aspect-fit math for compositing a game's canvas onto the cabinet's
 * 13:9 display. It must stay free of Three.js and DOM imports so node tests
 * can exercise it directly.
 *
 * Material channels of the GLB (verified against the asset):
 *   MAT_Skin_Left / MAT_Skin_Right   side artwork   (0.825 × 1.730 world)
 *   MAT_Skin_Front                   front panel    (0.700 × 0.660)
 *   MAT_Skin_ControlPanel            control deck   (0.710 × 0.335)
 *   MAT_Skin_Marquee                 backlit top    (0.700 × 0.272)
 *   MAT_ScreenContent                CRT display    (0.520 × 0.360, 13:9)
 *   MAT_LED_Emissive / MAT_CoinSlot_Emissive   trim LEDs
 *   MAT_Plastic_Blue / MAT_Plastic_Red         P1 / P2 controls
 */

export const CABINET_MODELS = Object.freeze(['upright']);

// The one model that exists today. `cabinet.model` may name a future cabinet
// (racing cockpit, lightgun…) — the factory resolves it or reports honestly.
export const DEFAULT_CABINET_MODEL = 'upright';

// Artwork channels, their GLB skin material, and world-space aspect (w/h) of
// the surface the texture wraps. Procedural art and author files should match
// these ratios so nothing is stretched (see docs/arcade.md for templates).
export const SKIN_CHANNELS = Object.freeze({
  left: { material: 'MAT_Skin_Left', aspect: 0.825 / 1.73, canvas: [512, 1024] },
  right: { material: 'MAT_Skin_Right', aspect: 0.825 / 1.73, canvas: [512, 1024] },
  front: { material: 'MAT_Skin_Front', aspect: 0.7 / 0.66, canvas: [768, 720] },
  controlPanel: { material: 'MAT_Skin_ControlPanel', aspect: 0.71 / 0.335, canvas: [1024, 480] },
  marquee: { material: 'MAT_Skin_Marquee', aspect: 0.7 / 0.272, canvas: [1024, 400] },
});

// The CRT surface: a separate material from the artwork so skins never touch
// playback, and the glass (MAT_Glass) stays a physical layer above it.
export const SCREEN = Object.freeze({
  material: 'MAT_ScreenContent',
  aspect: 0.52 / 0.36,
  canvas: [1040, 720],
});

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function normalizeColor(value, fallback) {
  return typeof value === 'string' && HEX_RE.test(value) ? value.toLowerCase() : fallback;
}

function normalizeIntensity(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * Normalizes a definition's `cabinet` block into a complete skin record,
 * filling every omitted field with the neutral Afterlight default. Returns a
 * plain unfrozen object (callers may freeze); `problems` is empty for valid
 * input and lists human-readable complaints otherwise.
 */
export function normalizeCabinetSkin(cabinet, problems = []) {
  const at = (ok, message) => { if (!ok) problems.push(message); };
  const cab = cabinet && typeof cabinet === 'object' && !Array.isArray(cabinet) ? cabinet : {};

  const model = CABINET_MODELS.includes(cab.model) ? cab.model
    : (cab.model ? (at(false, `cabinet.model "${cab.model}" is not a known cabinet (${CABINET_MODELS.join(', ')})`), DEFAULT_CABINET_MODEL) : DEFAULT_CABINET_MODEL);

  const skin = cab.skin && typeof cab.skin === 'object' ? cab.skin : {};
  const paletteSrc = skin.palette && typeof skin.palette === 'object' ? skin.palette : {};
  const palette = {
    base: normalizeColor(paletteSrc.base, '#1d2126'),
    ink: normalizeColor(paletteSrc.ink, '#f2ead8'),
    accent: normalizeColor(paletteSrc.accent, '#b89358'),
    glow: normalizeColor(paletteSrc.glow, '#ffca7a'),
  };
  for (const key of Object.keys(paletteSrc)) {
    if (!(key in palette)) at(false, `cabinet.skin.palette.${key} is not a palette slot (${Object.keys(palette).join(', ')})`);
    else if (palette[key] !== paletteSrc[key].toLowerCase()) at(false, `cabinet.skin.palette.${key} must be a #rrggbb hex color`);
  }

  // Author-supplied artwork files are resolved per channel; omitted channels
  // use the procedural painter. Unknown channel names are reported.
  const filesSrc = skin.files && typeof skin.files === 'object' ? skin.files : {};
  const files = {};
  for (const [key, value] of Object.entries(filesSrc)) {
    if (!(key in SKIN_CHANNELS)) { at(false, `cabinet.skin.files.${key} is not an artwork channel (${Object.keys(SKIN_CHANNELS).join(', ')})`); continue; }
    if (typeof value !== 'string' || value.length === 0) { at(false, `cabinet.skin.files.${key} must be a non-empty file name`); continue; }
    files[key] = value;
  }

  const ledSrc = cab.led && typeof cab.led === 'object' ? cab.led : {};
  const led = {
    color: normalizeColor(ledSrc.color, '#ffca7a'),
    intensity: normalizeIntensity(ledSrc.intensity, 1.6),
  };
  if (ledSrc.color && led.color !== ledSrc.color.toLowerCase()) at(false, 'cabinet.led.color must be a #rrggbb hex color');
  if (ledSrc.intensity !== undefined && ledSrc.intensity !== led.intensity) at(false, 'cabinet.led.intensity must be a finite number >= 0');

  const controlsSrc = cab.controls && typeof cab.controls === 'object' ? cab.controls : {};
  const controls = {
    player1: normalizeColor(controlsSrc.player1, '#31a8ff'),
    player2: normalizeColor(controlsSrc.player2, '#ff4938'),
  };
  for (const key of ['player1', 'player2']) {
    if (controlsSrc[key] && controls[key] !== controlsSrc[key].toLowerCase()) at(false, `cabinet.controls.${key} must be a #rrggbb hex color`);
  }

  const screenSrc = cab.screen && typeof cab.screen === 'object' ? cab.screen : {};
  const screen = {
    type: screenSrc.type === 'canvas' || screenSrc.type === 'image' || screenSrc.type === 'video' ? screenSrc.type : 'canvas',
  };
  if (screenSrc.type && screenSrc.type !== screen.type) {
    at(false, 'cabinet.screen.type must be "canvas", "image" or "video"');
  }

  return {
    model,
    skin: {
      title: typeof skin.title === 'string' && skin.title.trim() ? skin.title.trim() : 'ARCADE',
      tagline: typeof skin.tagline === 'string' ? skin.tagline : '',
      motif: typeof skin.motif === 'string' && skin.motif ? skin.motif : 'afterlight',
      palette,
      files,
    },
    led,
    controls,
    screen,
  };
}

/**
 * Aspect-fit math: returns the destination rectangle that fits a source of
 * sw×sh inside a dw×dh surface with letterbox, centered. Pure and exported
 * for tests; the factory paints the letterbox bars around it.
 */
export function fitSourceIntoDisplay(sw, sh, dw, dh) {
  const scale = Math.min(dw / sw, dh / sh);
  const w = sw * scale;
  const h = sh * scale;
  return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
}
