/**
 * Canonical arcade cabinet system: ONE GLB, per-game skins.
 *
 * Every upright arcade machine in Afterlight instances the same hero model
 * (public/arcade/cabinet/afterlight_arcade_cabinet.glb) and differentiates
 * itself entirely through data — artwork channels, LED trim, control
 * plastics, and screen content — driven by the activity definition's
 * `cabinet` block (shared/placeDefinitions.js). Adding a game is a
 * content task, never a modeling task (docs/arcade.md).
 *
 * Design contracts (AGENTS.md §3a/§7, task spec):
 *   - The GLB is fetched and parsed ONCE; cabinets clone the scene graph so
 *     geometry is shared. Materials that vary per cabinet are cloned per
 *     instance — recoloring one machine's LED can never leak into another.
 *   - Nodes and materials are resolved by NAME (INT_*, MAT_*), never by
 *     traversal order, so Blender re-exports stay safe. Missing targets are
 *     reported in development only.
 *   - Screen content is independent of the skin: Screen_Display carries the
 *     game canvas composited 13:9; Screen_Glass remains a physical layer.
 *   - If the model has not arrived (or fails to load), machines fall back to
 *     the legacy primitive cabinet and hot-swap to the GLB when it lands —
 *     a slow network degrades visuals, never playability.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createCabinetMesh } from '../activities/cabinetRenderer.js';
import {
  normalizeCabinetSkin,
  fitSourceIntoDisplay,
  SCREEN,
  SKIN_CHANNELS,
} from './skins.js';
import { paintSkinChannel, skinFileUrl } from './artwork.js';

const DEV = Boolean(import.meta.env?.DEV);
const CABINET_URL = `${import.meta.env?.BASE_URL ?? '/'}arcade/cabinet/afterlight_arcade_cabinet.glb`;

// Materials that vary per cabinet. Everything else (cabinet blacks, brushed
// metal, glass, speaker cloth, cream plastics) is shared and never mutated.
const PER_CABINET_MATERIALS = new Set([
  'MAT_Skin_Left',
  'MAT_Skin_Right',
  'MAT_Skin_Front',
  'MAT_Skin_ControlPanel',
  'MAT_Skin_Marquee',
  'MAT_ScreenContent',
  'MAT_LED_Emissive',
  'MAT_CoinSlot_Emissive',
  'MAT_Plastic_Blue',
  'MAT_Plastic_Red',
]);

// Interaction/emitter markers exported by the model ( INT_* empty nodes ).
export const CABINET_MARKERS = Object.freeze([
  'INT_PlayerStand',
  'INT_PlayerLookTarget',
  'INT_ScreenCenter',
  'INT_ControlPanel',
  'INT_AudioSource',
  'INT_P1',
  'INT_P2',
]);

// UV orientation convention: GLTFLoader presents glTF textures with flipY
// disabled, so replacement canvas art must match or it lands upside down.
const TEXTURE_FLIP_Y = false;

// --- template loading (once per session) -------------------------------------

let templatePromise = null;
let templateScene = null;
const liveCabinets = new Set();
const missingReported = new Set();

/**
 * Loads and caches the parsed cabinet template. Resolves to the cloned-able
 * template scene, or null when the asset cannot be fetched/parsed (offline,
 * missing file) — callers keep working via the primitive fallback.
 */
export function loadArcadeCabinetTemplate(url = CABINET_URL) {
  if (templatePromise) return templatePromise;
  templatePromise = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      const buffer = await response.arrayBuffer();
      const gltf = await new Promise((resolve, reject) => {
        new GLTFLoader().parse(buffer, '', resolve, reject);
      });
      const root = gltf.scene?.getObjectByName('ARC_Cabinet_ROOT') || gltf.scene;
      if (!root) throw new Error('GLB has no ARC_Cabinet_ROOT scene node');
      templateScene = root;
      if (DEV) console.info(`[ArcadeCabinet] template loaded from ${url}`);
      for (const cabinet of liveCabinets) {
        try { cabinet._upgradeToTemplate?.(); } catch (err) {
          console.warn('[ArcadeCabinet] upgrade failed for a cabinet:', err);
        }
      }
      return root;
    } catch (err) {
      console.warn(`[ArcadeCabinet] cabinet model unavailable (${err?.message || err}); primitive fallback in use`);
      templatePromise = null; // allow a later retry (e.g. after reconnect)
      return null;
    }
  })();
  return templatePromise;
}

/** Test/preview hook: inject a pre-built template scene without fetching. */
export function injectArcadeCabinetTemplate(scene) {
  templateScene = scene;
  templatePromise = Promise.resolve(scene);
  for (const cabinet of liveCabinets) {
    try { cabinet._upgradeToTemplate?.(); } catch (err) {
      console.warn('[ArcadeCabinet] upgrade failed for a cabinet:', err);
    }
  }
}

/** Development utility: dump the template hierarchy (nodes, meshes, materials). */
export function dumpCabinetHierarchy() {
  if (!templateScene) return null;
  const lines = [];
  templateScene.traverse((obj) => {
    const mats = obj.isMesh
      ? [].concat(obj.material).map((m) => m.name || '<unnamed>').join(',')
      : '';
    lines.push(`${obj.name || '<anon>'} (${obj.type})${mats ? ` [${mats}]` : ''}`);
  });
  return lines;
}

// --- shared skin texture cache (refcounted per game+channel) -----------------

const skinTextureCache = new Map();
const textureLoader = new THREE.TextureLoader();

function configureSkinTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = TEXTURE_FLIP_Y;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return texture;
}

function canvasTextureFrom(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  return configureSkinTexture(texture);
}

/**
 * Acquires the texture for one artwork channel of one game: a definition-
 * declared file when it loads, otherwise the procedural painter. Cached per
 * game+channel with refcounting so N cabinets of a game share one texture.
 * `skin` is the full normalized record (painter + files both read through it).
 */
function acquireSkinTexture(gameId, channel, skin, onLate) {
  const key = `${gameId}:${channel}`;
  const cached = skinTextureCache.get(key);
  if (cached) {
    cached.refs += 1;
    return cached.texture;
  }

  const entry = { refs: 1, texture: null };
  const file = skin.skin?.files?.[channel];
  if (file) {
    const texture = configureSkinTexture(textureLoader.load(
      skinFileUrl(gameId, file),
      () => { onLate?.(channel); },
      undefined,
      () => {
        if (DEV) console.warn(`[ArcadeCabinet] ${gameId}/${channel}: "${file}" missing, using procedural art`);
        const canvas = paintSkinChannel(channel, skin);
        if (!canvas) return;
        entry.texture.image = canvas;
        entry.texture.needsUpdate = true;
        onLate?.(channel);
      },
    ));
    entry.texture = texture;
  } else {
    const canvas = paintSkinChannel(channel, skin);
    if (!canvas) return null;
    entry.texture = canvasTextureFrom(canvas);
  }
  // UV ground truth (verified against the GLB's vertex data): the LEFT side
  // panel samples mirrored; the right panel is correct. Flip `left`
  // horizontally for both author files and procedural art, so authors always
  // supply both sides in the same orientation (docs/arcade.md).
  if (channel === 'left' && entry.texture) {
    entry.texture.wrapS = THREE.RepeatWrapping;
    entry.texture.repeat.x = -1;
    entry.texture.offset.x = 1;
  }
  skinTextureCache.set(key, entry);
  return entry.texture;
}

function releaseSkinTexture(gameId, channel) {
  const key = `${gameId}:${channel}`;
  const entry = skinTextureCache.get(key);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    skinTextureCache.delete(key);
    try { entry.texture?.dispose(); } catch {}
  }
}

// --- per-cabinet build --------------------------------------------------------

function devWarnMissing(name, kind) {
  if (!DEV || missingReported.has(name)) return;
  missingReported.add(name);
  console.warn(`[ArcadeCabinet] Missing ${kind} "${name}" on cabinet model`);
}

function cloneCabinetMaterials(instance) {
  const cloned = new Map();
  instance.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = materials.map((mat) => {
      if (!PER_CABINET_MATERIALS.has(mat.name)) return mat;
      if (!cloned.has(mat.name)) {
        const copy = mat.clone();
        copy.name = mat.name;
        cloned.set(mat.name, copy);
      }
      return cloned.get(mat.name);
    });
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
  return cloned;
}

function findMarkers(instance) {
  const markers = new Map();
  for (const name of CABINET_MARKERS) {
    const node = instance.getObjectByName(name);
    if (node) markers.set(name, node);
    else devWarnMissing(name, 'interaction marker');
  }
  return markers;
}

function buildDisplayMaterial() {
  // Color must stay white: it multiplies the map, and a dark base would dim
  // the composited game frame to near-black (toneMapped false keeps CRT pop).
  return new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
}

function buildFocusedCamera(markers) {
  const camera = new THREE.PerspectiveCamera(48, SCREEN.aspect, 0.1, 50);
  const stand = markers.get('INT_PlayerStand');
  const look = markers.get('INT_PlayerLookTarget') || markers.get('INT_ScreenCenter');
  if (stand && look) {
    camera.position.set(stand.position.x, stand.position.y + 1.5, stand.position.z + 0.45);
    camera.lookAt(look.position);
  } else {
    camera.position.set(0, 1.5, 1.6);
    camera.lookAt(0, 1.16, 0);
  }
  return camera;
}

/**
 * Creates one arcade machine instance for an activity definition.
 *
 * @param {object} options
 * @param {object} options.activityDef  Place-activities definition (owns the
 *   `cabinet` skin block; id keys the skin cache).
 * @param {object} [options.world]      Place world; when it has a group the
 *   cabinet is added to it (games may also re-parent).
 * @param {HTMLCanvasElement|THREE.Texture} [options.screenSource]  Live game
 *   canvas (composited) or a ready texture (video/render target — bound as-is).
 * @returns {{ group, bodyMesh, screenMesh, activityCamera, usingModel,
 *   marker(), setScreenSource(), syncScreen(), setLed(), setControls(),
 *   update(), dispose() }}
 */
export function createArcadeCabinet({
  activityDef,
  world = null,
  screenSource = null,
} = {}) {
  const gameId = activityDef?.id || 'arcade';
  const skin = normalizeCabinetSkin(activityDef?.cabinet);
  const group = new THREE.Group();
  group.name = `arcade-cabinet-${gameId}`;

  // Screen surface owned by the factory: 13:9 composite canvas shared by both
  // the GLB and fallback visuals, so games keep drawing their own canvas and
  // the factory letterboxes it onto the CRT without stretching.
  const displayCanvas = (typeof document !== 'undefined')
    ? document.createElement('canvas')
    : null;
  if (displayCanvas) {
    displayCanvas.width = SCREEN.canvas[0];
    displayCanvas.height = SCREEN.canvas[1];
  }
  const displayCtx = displayCanvas?.getContext('2d') || null;
  const displayTexture = displayCanvas
    ? new THREE.CanvasTexture(displayCanvas)
    : new THREE.Texture();
  // Geometry-verified: the CRT's art face samples v top-down, so flipY must
  // be false — with the default true the game frame renders upside down.
  displayTexture.flipY = false;
  displayTexture.colorSpace = THREE.SRGBColorSpace;
  displayTexture.minFilter = THREE.LinearFilter;
  displayTexture.magFilter = THREE.LinearFilter;

  const ownedMaterials = [buildDisplayMaterial()];
  let usingModel = false;
  let modelInstance = null;
  let clonedMaterials = new Map();
  let markers = new Map();
  let screenMesh = null;
  let bodyMesh = null;
  let screenSourceTexture = null;
  let screenSourceCanvas = screenSource && !screenSource.isTexture ? screenSource : null;
  if (screenSource?.isTexture) screenSourceTexture = screenSource;

  // Primitive stand-in sized to the canonical footprint (~0.74m deep × 0.78m
  // wide × 1.73m tall), used only until the GLB arrives or if it can't load.
  let fallback = createCabinetMesh({
    width: 0.9,
    height: 1.9,
    depth: 0.85,
    screenWidth: 0.62,
    screenHeight: 0.44,
    marqueeTitle: skin.skin.title,
    marqueeColor: skin.skin.palette.glow,
    trimColor: skin.skin.palette.accent,
    canvasTexture: displayTexture,
  });
  fallback.screenMesh.material = ownedMaterials[0];
  group.add(fallback.group);

  const activityCamera = fallback.activityCamera;
  activityCamera.aspect = SCREEN.aspect;
  activityCamera.updateProjectionMatrix();

  function paintStandby(ctx) {
    if (!ctx) return;
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.save();
    ctx.font = `bold ${Math.round(displayCanvas.height * 0.09)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 202, 122, 0.7)';
    ctx.fillText(skin.skin.title, displayCanvas.width / 2, displayCanvas.height / 2);
    ctx.restore();
  }

  /** Composites the source canvas onto the 13:9 display (letterbox, no stretch). */
  function syncScreen() {
    if (!displayCtx) return;
    displayCtx.fillStyle = '#05070a';
    displayCtx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
    const source = screenSourceCanvas;
    if (source && source.width > 0 && source.height > 0) {
      const rect = fitSourceIntoDisplay(source.width, source.height, displayCanvas.width, displayCanvas.height);
      displayCtx.drawImage(source, rect.x, rect.y, rect.w, rect.h);
    } else {
      paintStandby(displayCtx);
    }
    displayTexture.needsUpdate = true;
  }

  function setScreenSource(source) {
    if (!source) return;
    if (source.isTexture) {
      screenSourceTexture = source;
      screenSourceCanvas = null;
      const displayMat = ownedMaterials[0];
      displayMat.map = source;
      displayMat.needsUpdate = true;
    } else {
      screenSourceCanvas = source;
      screenSourceTexture = null;
      if (ownedMaterials[0].map !== displayTexture) {
        ownedMaterials[0].map = displayTexture;
        ownedMaterials[0].needsUpdate = true;
      }
      syncScreen();
    }
  }

  function applySkinToMaterials() {
    const ledMat = clonedMaterials.get('MAT_LED_Emissive');
    const coinMat = clonedMaterials.get('MAT_CoinSlot_Emissive');
    for (const mat of [ledMat, coinMat]) {
      if (!mat) { if (ledMat === undefined) devWarnMissing('MAT_LED_Emissive', 'skin target'); continue; }
      mat.emissive = new THREE.Color(skin.led.color);
      mat.emissiveIntensity = skin.led.intensity;
      if (mat.color) mat.color.set('#111111');
    }

    const p1 = clonedMaterials.get('MAT_Plastic_Blue');
    if (p1) p1.color.set(skin.controls.player1);
    else devWarnMissing('MAT_Plastic_Blue', 'control material');
    const p2 = clonedMaterials.get('MAT_Plastic_Red');
    if (p2) p2.color.set(skin.controls.player2);
    else devWarnMissing('MAT_Plastic_Red', 'control material');

    for (const [channel, channelDef] of Object.entries(SKIN_CHANNELS)) {
      const mat = clonedMaterials.get(channelDef.material);
      if (!mat) { devWarnMissing(channelDef.material, 'skin target'); continue; }
      try {
        mat.map = acquireSkinTexture(gameId, channel, skin, () => {
          if (mat.map) mat.needsUpdate = true;
        });
        mat.color.set('#ffffff');
        // The stock marquee is backlit through its emissiveMap — route OUR art
        // through it so the machine glows with its own artwork, and clear the
        // stock emissive art on every other channel so it cannot bleed
        // through under the new map (the "AFTERLIGHT" ghost overlay).
        if (channel === 'marquee') {
          mat.emissiveMap = mat.map;
          mat.emissive.set('#ffffff');
          mat.emissiveIntensity = Math.min(mat.emissiveIntensity || 1, 1.4);
        } else {
          mat.emissiveMap = null;
          mat.emissive.set('#000000');
        }
        mat.needsUpdate = true;
      } catch (err) {
        // One failed channel keeps the stock texture; never blocks screens/LED.
        console.warn(`[ArcadeCabinet] ${gameId}/${channel} artwork failed:`, err);
      }
    }
  }

  function upgradeToTemplate() {
    if (!templateScene || usingModel) return;
    modelInstance = templateScene.clone(true);
    clonedMaterials = cloneCabinetMaterials(modelInstance);
    markers = findMarkers(modelInstance);

    const display = modelInstance.getObjectByName('Screen_Display');
    if (display?.isMesh) {
      screenMesh = display;
      display.material = ownedMaterials[0];
    } else {
      devWarnMissing('Screen_Display', 'screen node');
      screenMesh = fallback.screenMesh;
    }
    bodyMesh = modelInstance.getObjectByName('Cabinet_Body') || modelInstance;

    // Model scale check: the asset ships at natural human scale (~1.7 m).
    const box = new THREE.Box3().setFromObject(modelInstance);
    const height = box.max.y - box.min.y;
    if (height > 0.5 && Math.abs(height - 1.73) > 0.4) {
      const scale = 1.73 / height;
      modelInstance.scale.setScalar(scale);
    }
    modelInstance.position.set(0, 0, 0);

    group.add(modelInstance);
    group.remove(fallback.group);
    fallback.dispose();
    usingModel = true;

    const replacementCamera = buildFocusedCamera(markers);
    activityCamera.copy(replacementCamera, false);
    activityCamera.layers = replacementCamera.layers;

    // Screens bind before skins: playback never depends on artwork succeeding.
    if (screenSourceTexture) setScreenSource(screenSourceTexture);
    else syncScreen();
    applySkinToMaterials();
  }

  function releaseSkinTextures() {
    for (const channel of Object.keys(SKIN_CHANNELS)) {
      releaseSkinTexture(gameId, channel);
    }
  }

  if (templateScene) {
    upgradeToTemplate();
  } else {
    loadArcadeCabinetTemplate();
    syncScreen();
  }

  function dispose() {
    liveCabinets.delete(handle);
    globalThis.__arcade?.cabinets?.delete(handle);
    releaseSkinTextures();
    for (const mat of ownedMaterials) {
      try { mat.dispose(); } catch {}
    }
    ownedMaterials.length = 0;
    try { displayTexture.dispose(); } catch {}
    if (usingModel && modelInstance) {
      group.remove(modelInstance);
      modelInstance = null;
    } else {
      group.remove(fallback.group);
      fallback.dispose();
    }
    if (group.parent) group.parent.remove(group);
  }

  const handle = {
    _updateCount: 0,
    get group() { return group; },
    get bodyMesh() { return bodyMesh || fallback.bodyMesh; },
    get screenMesh() { return screenMesh || fallback.screenMesh; },
    get activityCamera() { return activityCamera; },
    get usingModel() { return usingModel; },
    get markers() { return markers; },
    gameId,
    skin,

    marker(name) {
      return markers.get(name) || null;
    },

    /** World-space position of an INT_* marker (throttled callers only). */
    markerWorldPosition(name, out = new THREE.Vector3()) {
      const node = markers.get(name);
      if (!node) return out.set(0, 0, 0);
      return node.getWorldPosition(out);
    },

    setScreenSource,
    syncScreen,
    _upgradeToTemplate: upgradeToTemplate,

    setLed(color, intensity) {
      if (typeof color === 'string') skin.led.color = color;
      if (Number.isFinite(intensity)) skin.led.intensity = intensity;
      const ledMat = clonedMaterials.get('MAT_LED_Emissive');
      const coinMat = clonedMaterials.get('MAT_CoinSlot_Emissive');
      for (const mat of [ledMat, coinMat]) {
        if (!mat) continue;
        if (typeof color === 'string') mat.emissive.set(color);
        if (Number.isFinite(intensity)) mat.emissiveIntensity = intensity;
      }
      fallback.marqueeLight.color.set(skin.skin.palette.glow);
    },

    setControls({ player1, player2 } = {}) {
      const p1 = clonedMaterials.get('MAT_Plastic_Blue');
      const p2 = clonedMaterials.get('MAT_Plastic_Red');
      if (p1 && player1) p1.color.set(player1);
      if (p2 && player2) p2.color.set(player2);
    },

    /** Per-frame: screen composite + LED breathing. Cheap enough for 10 Hz tiers. */
    update(time = 0) {
      handle._updateCount += 1;
      syncScreen();
      if (usingModel) {
        const ledMat = clonedMaterials.get('MAT_LED_Emissive');
        if (ledMat) {
          ledMat.emissiveIntensity = skin.led.intensity * (0.92 + Math.sin(time * 2.1) * 0.08);
        }
      }
    },

    dispose,
  };

  liveCabinets.add(handle);

  // Dev-only inspection hook (import.meta.env.DEV): read-only access for
  // browser tooling; never present in production builds.
  if (DEV) {
    const arc = (globalThis.__arcade ??= { cabinets: new Set(), warnings: [] });
    arc.cabinets.add(handle);
    if (!arc.warningsHooked) {
      arc.warningsHooked = true;
      const originalWarn = console.warn.bind(console);
      console.warn = (...args) => {
        try {
          arc.warnings.push(args.map(a => (a?.stack || a?.message || String(a))).join(' '));
          if (arc.warnings.length > 40) arc.warnings.shift();
        } catch {}
        originalWarn(...args);
      };
    }
    setTimeout(() => {
      try {
        const marquee = handle.group.getObjectByName('Artwork_Marquee');
        const display = handle.group.getObjectByName('Screen_Display');
        const led = handle.group.getObjectByName('Trim_ControlDeck');
        const root = globalThis.document?.documentElement;
        if (!root) return;
        const parsed = root.dataset.arcadeCabinets ? JSON.parse(root.dataset.arcadeCabinets) : [];
        const prev = Array.isArray(parsed) ? parsed : (parsed.cabinets || []);
        let displayStats = null;
        let sourceStats = null;
        try {
          const stat = (ctx2, w, h) => {
            const sample = ctx2?.getImageData?.(0, 0, w, h);
            if (!sample) return null;
            let maxLum = 0;
            let litCount = 0;
            const total = 24 * 16;
            for (let gy = 0; gy < 16; gy++) {
              for (let gx = 0; gx < 24; gx++) {
                const idx = ((gy * h / 16 | 0) * w + (gx * w / 24 | 0)) * 4;
                const lum = 0.2126 * sample.data[idx] + 0.7152 * sample.data[idx + 1] + 0.0722 * sample.data[idx + 2];
                if (lum > maxLum) maxLum = lum;
                if (lum > 90) litCount += 1;
              }
            }
            return { maxLum: Math.round(maxLum), litPct: Math.round(litCount * 100 / total) };
          };
          displayStats = stat(displayCtx, displayCanvas.width, displayCanvas.height);
          sourceStats = screenSourceCanvas
            ? stat(screenSourceCanvas.getContext('2d'), screenSourceCanvas.width, screenSourceCanvas.height)
            : null;
        } catch {}
        prev.push({
          id: gameId,
          updateCount: handle._updateCount,
          usingModel: handle.usingModel,
          marqueeMat: marquee?.material?.name ?? null,
          marqueeHasMap: !!marquee?.material?.map,
          marqueeMapIsCanvas: marquee?.material?.map?.isCanvasTexture === true,
          displayHasCanvas: display?.material?.map?.isCanvasTexture === true
            && display.material.map.image?.width === 1040,
          displayStats,
          sourceStats,
          sourceSize: screenSourceCanvas ? [screenSourceCanvas.width, screenSourceCanvas.height] : null,
          ledColor: led?.material?.emissive ? `#${led.material.emissive.getHexString()}` : null,
        });
        root.dataset.arcadeCabinets = JSON.stringify({
          cabinets: prev,
          warnings: (globalThis.__arcade?.warnings || []).slice(-6),
        });
      } catch {}
    }, 4000);
  }

  // Late-arriving screen source (games create their canvas after the cabinet).
  if (screenSource) setScreenSource(screenSource);
  else syncScreen();

  if (world?.group) world.group.add(group);

  return handle;
}
