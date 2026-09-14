import { createEmoteWheel } from './ui/emoteWheel.js';
import { EMOTES, isEmote } from '../shared/emotes.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import './style.css';
import { NetworkClient } from './net/client.js';
import { createPlayerAvatar, createKilnCompanion, RemotePlayersManager, startEmote, stopEmote, updateEmote } from './render/avatars.js';
import { createAvatarFor } from './avatars/presenter.js';
import { buildMarketWorld } from './world/marketWorld.js';
import { districts, buildDistrict, readExploration } from './districts.js';
import { getPlaceActivities, getPlaceDefinition } from '../shared/placeDefinitions.js';
import { gateItemsFor, gateVisualBoxesFor } from './places/worldFactory.js';
import { getBoundsForRoom, isWalkable, clampClickTarget, projectToMinimap } from './world/bounds.js';
import { UIManager } from './ui/profileModal.js';
import { ChatPanel } from './ui/chatPanel.js';
import { CallClient } from './net/calls.js';
import { CallPanel } from './ui/callPanel.js';
import { TheaterScreenUI } from './ui/theaterScreen.js';
import { createAppFullscreen } from './ui/appFullscreen.js';
import { createPointerLockBridge } from './ui/pointerLockBridge.js';
import { createPlaceSelector } from './ui/placeSelector.js';
import { createWorldSelector } from './ui/worldSelector.js';
import { createUpdatePrompt } from './ui/updatePrompt.js';
import { createLeaderboardDialog } from './ui/leaderboard.js';
import { initChallenges } from './ui/challenges.js';
import { initNearbyActivities } from './ui/nearbyActivities.js';
import { initTournamentBoard } from './ui/tournamentBoard.js';
import { recordRun as recordLocalBest, applyRecordingStatus } from './activities/localBests.js';
import { ARCADE_GAMES } from '../shared/leaderboardModel.js';
import { MSG_TYPES, ROOMS } from '../shared/protocol.js';
import { FP_MODE, nextCameraMode, moveBasis, classifyDrag, applyLookDelta } from './cameraControl.js';
import { readMouseLookPreference, writeMouseLookPreference } from './ui/mouseLookPreference.js';
import { createJumpState, resetJump, stepJump, moveSpeedFor, HOP_CAP_RATIO } from './jump.js';
import { createPlaceRuntime } from './places/runtime.js';
import { createTheaterEnvironmentRuntime } from './environments/index.js';
import {
  getTheaterVariant,
  THEATER_ENVIRONMENT_IDS,
  isEnvironmentPreset,
  randomTheaterWorldPreset,
} from '../shared/theaterEnvironments.js';
import {
  getWorldVariant,
  worldForPreset,
  WORLD_IDS,
} from '../shared/worldDefinitions.js';
import { resolveBootstrapWorldState } from './worlds/state.js';
import { createAmbientPlaceManager } from './worlds/ambientPlace.js';
import { createDestinationPrefetchScheduler } from './worlds/prefetch.js';
import { resolveWorldPresentation } from './worlds/resolver.js';
import { estimateWorldAssetBytes } from './worlds/assets.js';
import { loadEnvironmentPreferences, saveEnvironmentPreferences } from './environments/quality.js';
import { resolveRoomRequest } from './places/travelState.js';
import { createTheaterAdapter, registerTheaterAdapter } from './places/theaterAdapter.js';
import { createActivityRuntime } from './activities/runtime.js';
import { getActivityMediaPolicy } from './activities/registry.js';
import {
  HOST_RESERVATION_SELECTORS,
  collectFloatingReservations,
} from './ui/floatingMediaReservations.js';
import { createActivityViewLease } from './activities/viewLease.js';
import {
  captureRendererPolicy,
  restoreRendererPolicy,
  applyLeasedRendererOverrides,
} from './activities/rendererPolicy.js';
import { createGraphicsJobQueue } from './activities/graphicsJobs.js';
import './activities/pong.js';
import './activities/rainRunner.js';
import './activities/signalLost.js';
import './activities/sporefall.js';
import './activities/snowboard.js';
import './activities/kart-royale.js';
import './activities/downhill-mayhem.js';
import {
  getRecords as getKartPerfRecords,
  clearRecords as clearKartPerfRecords,
  exportJson as exportKartPerfJson,
  startAttempt as startKartAttempt,
  startSpan as startKartSpan,
  endSpan as endKartSpan,
} from './activities/kartPerf.js';
import './activities/pool.js';
import './activities/airHockey.js';
import './activities/foosball.js';
import './activities/drones.js';
import './activities/paperAirplanes.js';
import './activities/gutterBoats.js';
import './activities/rcBoats.js';
import './activities/horseshoes.js';
import './activities/telescope.js';
import './activities/hammerStrike.js';
import './activities/forgeChallenge.js';
import './activities/curling.js';
import './activities/chess.js';
import './activities/checkers.js';
import './activities/tilePuzzle.js';
import './activities/lightMusic.js';
import './activities/darts.js';
import './activities/piano.js';
import './activities/photoBooth.js';
import './activities/fishing.js';
import './activities/skippingStones.js';
import { createAtmosphereStateClient, legacyWeatherDisplaySuppressed } from './atmosphere/stateClient.js';
import { createAtmosphereController } from './atmosphere/controller.js';
import { createAtmosphereEvents } from './atmosphere/events.js';
import {
  loadAtmospherePreferences,
  saveAtmospherePreferences,
  effectiveTier,
} from './atmosphere/quality.js';
import { normalizeZones, classifyExposure } from './atmosphere/exposure.js';
import { createAudioMixer } from './audio/mixer.js';
import { createEnvironmentAudio, zoneProfileFor } from './audio/environmentAudio.js';
import { getPlaceController } from './places/registry.js';
import { createSeatController } from './social/seating.js';
import { createInteractionRegistry, registerCoreInteractions } from './social/interactions.js';
import { createCameraSeam } from './activities/cameraSeam.js';
import { resolveEscapeAction, isTypingTarget, isMediaUiEvent, ESCAPE_TARGETS } from './activities/inputSeam.js';

const $ = (id) => document.getElementById(id);

// --- RENDERER & SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color('#222d2a');
scene.fog = new THREE.FogExp2('#54645d', 0.018);

const renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const camera = new THREE.OrthographicCamera();
// First person rides a perspective camera through the same pipeline: every
// consumer (composer, raycast, resize, follow, theater projection) renders
// through `activeCamera`, assigned by setCameraMode().
const EYE_HEIGHT = 1.55;
const SEATED_EYE_HEIGHT = 1.05;
// Far planes cover the Theater environments' distant scenery (peaks, island
// silhouettes, cloud decks) without any rendering cost in orthographic mode.
const fpCamera = new THREE.PerspectiveCamera(58, 1, 0.1, 420);
const cameraSeam = createCameraSeam({ initialMode: 0 });
let activeCamera = camera;
let cameraMode = 0;
let fpYaw = 0;
let fpPitch = 0;
let zoom = 24;
// Mouse look (add-first-person-mouse-look): hover-follow look input in first
// person, on by default, reversible in Settings. Presentation-only: like the
// camera mode it is never saved into the exploration save and never synced.
let mouseLookEnabled = readMouseLookPreference();

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Frame-bound graphics jobs for background Kart preparation (D4): run only
// while no visible activity owns the renderer.
const graphicsJobs = createGraphicsJobQueue({
  getRenderer: () => renderer,
  isBlocked: () => activityView.held,
  getViewport: () => ({ width: innerWidth, height: innerHeight }),
});

// Activity view lease (add-multiplayer-snowboard-arcade 6.1/6.2): a 3D
// activity borrows the render pass scene AND the active camera together.
// The social scene stays in memory and authoritative room membership never
// changes; on release the existing camera seam restores the saved mode.
const activityView = createActivityViewLease({
  generation: () => activityRuntime.activeGeneration ?? 0,
  apply: ({ scene: leasedScene, camera: leasedCamera, resize: leasedResize, toneMappingExposure }) => {
    renderPass.scene = leasedScene;
    activeCamera = leasedCamera;
    renderPass.camera = activeCamera;
    leasedResize?.(innerWidth, innerHeight);
    leasedRendererState = captureRendererPolicy(renderer);
    applyLeasedRendererOverrides(renderer, {
      toneMappingExposure: typeof toneMappingExposure === 'number' ? toneMappingExposure : 1.25,
    });
    leasedBloomEnabled = bloom.enabled;
    bloom.enabled = false;
    if (theaterUI.isWatching()) theaterUI.setWatchMode(false);
    leasedSocialAmbienceStopped = environmentAudio?.started ?? false;
    if (leasedSocialAmbienceStopped) {
      environmentAudio.stop();
    }
  },
  restore: () => {
    renderPass.scene = scene;
    activeCamera = cameraSeam.resolveActiveCamera({ isoCamera: camera, fpCamera });
    renderPass.camera = activeCamera;
    if (leasedRendererState) {
      restoreRendererPolicy(renderer, leasedRendererState, { width: innerWidth, height: innerHeight });
      leasedRendererState = null;
    }
    if (leasedBloomEnabled !== null) {
      bloom.enabled = leasedBloomEnabled;
      leasedBloomEnabled = null;
    }
    if (leasedSocialAmbienceStopped) {
      environmentAudio?.start?.();
      leasedSocialAmbienceStopped = false;
    }
    if (currentRoomId === ROOMS.THEATER) {
      syncTheaterEnvironment();
    }
  },
});
let leasedRendererState = null;
let leasedBloomEnabled = null;
let leasedSocialAmbienceStopped = false;
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.65, 1.05);
composer.addPass(bloom);

// Lights. The hemisphere light is kept in a named reference: the atmosphere
// controller (add-atmosphere-weather-system 3.1) captures/restores its exact
// colors and intensity around an active place atmosphere.
const hemisphere = new THREE.HemisphereLight('#c5d9d4', '#343a2b', 2.2);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight('#ffe0a5', 3.0);
sun.position.set(-14, 24, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
sun.shadow.normalBias = 0.035;
sun.shadow.bias = -0.0001;
scene.add(sun);

// Ground click marker
const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.25, 0.29, 32),
  new THREE.MeshBasicMaterial({ color: '#e0d49b', transparent: true, opacity: 0.8, side: THREE.DoubleSide })
);
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
scene.add(marker);

// Atmosphere particles
const particleCount = 120;
const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  particlePos[i * 3] = (Math.random() - 0.5) * 26;
  particlePos[i * 3 + 1] = Math.random() * 6 + 0.3;
  particlePos[i * 3 + 2] = (Math.random() - 0.5) * 24;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: '#e3d7a7', size: 0.035, transparent: true, opacity: 0.5 }));
scene.add(particles);

// --- NETWORK & UI INITIALIZATION ---
const net = new NetworkClient();
const remotePlayers = new RemotePlayersManager(scene, createAvatarFor);

// Room atmosphere state client (task 2.2): ONE instance on the shared
// connection, routed only to the current place generation. It holds the
// semantic snapshot/server-clock facts; the presentation controller that
// consumes them arrives with the renderer work (3.x/4.x).
const atmosphereStateClient = createAtmosphereStateClient({ net });

// Canonical personal World state owner (introduce-global-world-system)
const worldState = resolveBootstrapWorldState();
globalThis.__afterlightWorldState = worldState;

// The one retained atmosphere presentation controller (task 3.1): captures
// the shared fog/background/sun/hemisphere/exposure baseline on activation,
// renders the sampled semantic state through the owned sky dome, batched
// precipitation and wet-surface families, and restores the baseline exactly
// on travel. It runs only from the existing frame loop and only for the
// active, visible world.
const atmosphereController = createAtmosphereController({
  scene,
  renderer,
  sun,
  hemisphere,
  stateClient: atmosphereStateClient,
  world: () => currentWorld,
  // The sky backdrop reads the active camera each frame so the iso views
  // and first person both show the authored sky correctly.
  camera: () => activeCamera,
  getWorldSelection: () => worldState.selection,
});

// --- THEATER ENVIRONMENTS (Dream Loop campaign) ---
// The six authored worlds surrounding the one shared Orpheum. The runtime
// builds the selected environment INSIDE the theater world group, installs
// its atmosphere hooks and swaps geometry without rebuilding the Theater or
// the room. Selection is personal World state; environment quality is a
// separate local preference.
const environmentPrefs = loadEnvironmentPreferences({
  device: {
    hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 8,
    maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0,
    innerWidth: typeof innerWidth === 'number' ? innerWidth : 1920,
    deviceMemory: typeof navigator !== 'undefined' ? navigator.deviceMemory : 8,
  },
}).prefs;
const theaterEnvironments = createTheaterEnvironmentRuntime({
  defaultTier: environmentPrefs.quality,
  getWorldSelection: () => worldState.selection,
  onHooksChanged: () => {
    // The environment declared new wet families / zones / anchors: rebind
    // the active atmosphere controller's owned subsystems in place.
    if (atmosphereController.isActive()) atmosphereController.reloadEnvironment();
  },
  onError: (error) => console.error('[theater-environments]', error),
});
let lastEnvironmentPreset = undefined;
// Created with the other HUD dialogs (declared early so the frame-loop sync
// can refresh it without a temporal-dead-zone window).
let worldSelector = null;
const environmentSample = {};

function effectiveEnvironmentPreset() {
  const sel = worldState.selection;
  const v = getWorldVariant(sel.worldId, sel.variantId);
  return v?.preset ?? 'env-coastal-sunset';
}

function syncTheaterEnvironment() {
  if (currentRoomId !== ROOMS.THEATER) return;
  const presetId = effectiveEnvironmentPreset();
  // The open World dialog always reflects the personal world selection:
  if (worldSelector?.isOpen()) worldSelector.setActive(presetId);
  const def = districts.find(d => d.id === ROOMS.THEATER) ?? null;
  if (presetId === lastEnvironmentPreset && theaterEnvironments.active && !theaterEnvironments.state.failed) return;
  lastEnvironmentPreset = presetId;
  try {
    theaterEnvironments.sync({ presetId, def, world: currentWorld, tier: environmentPrefs.quality });
  } catch (error) {
    console.error('[theater-environments] sync failed', error);
  }
}

/** Public (HUD/debug) environment selection: selects the personal World state. */
function selectTheaterEnvironment(presetOrWorldId) {
  let worldId = null;
  let variantId = null;
  const found = worldForPreset(presetOrWorldId);
  if (found) {
    worldId = found.worldId;
    variantId = found.variantId;
  } else if (WORLD_IDS.includes(presetOrWorldId)) {
    worldId = presetOrWorldId;
  }
  if (worldId) {
    worldState.select({ worldId, variantId });
  }
  return theaterEnvironments.state;
}

let ambientPlaceManager = null;

worldState.subscribe(() => {
  lastEnvironmentPreset = undefined;
  if (currentRoomId === ROOMS.THEATER) {
    syncTheaterEnvironment();
  } else if (ambientPlaceManager) {
    ambientPlaceManager.sync();
  }
  const sel = worldState.selection;
  if (sel?.worldId) {
    environmentAudio.setAmbienceProfile(sel.worldId);
  }
});

// --- LOCAL AUDIO, SHARED EVENTS AND COMFORT (tasks 4.1–4.3) ---
// ONE AudioContext for the whole game, created lazily on the existing Sound
// gesture; environment ambience/weather loops are synthesized and retained
// (no external assets), footsteps/chimes feed the shared effects bus, and
// the Theater keeps its provider volume through the setMixGain seam.
const audioMixer = createAudioMixer({});
const environmentAudio = createEnvironmentAudio({ mixer: audioMixer });
if (worldState.selection?.worldId) {
  environmentAudio.setAmbienceProfile(worldState.selection.worldId);
}

ambientPlaceManager = createAmbientPlaceManager({
  scene,
  renderer,
  sun,
  hemisphere,
  environmentAudio,
  getWorldSelection: () => worldState.selection,
});

const destinationPrefetch = createDestinationPrefetchScheduler({
  graphicsJobs,
  getWorldSelection: () => worldState.selection,
});

// Comfort preferences (task 4.3): OS reduced-motion default with a local
// override, additive storage key, session defaults when storage is
// unavailable. The separate effect tier never touches the DPR selector.
const prefersReducedMotionOS = typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;
let atmospherePrefs = loadAtmospherePreferences({ prefersReducedMotion: prefersReducedMotionOS }).prefs;

// Bounded shared lightning/thunder envelopes (task 4.2): ONE pooled visual,
// pulled from the state client on the existing frame loop — no second
// scheduler, and the HUD flash layer is never touched.
const atmosphereEvents = createAtmosphereEvents({
  stateClient: atmosphereStateClient,
  audio: environmentAudio,
  listenerPosition: () => player.position,
  flashMode: atmospherePrefs.flash,
});

// Shadow map tier: reduced activations may use 1024, restored to the
// original 2048 on place exit — applied once per activation, never per frame.
const BASELINE_SHADOW_MAP = 2048;
const REDUCED_SHADOW_MAP = 1024;
function applyShadowTier(size) {
  if (!Number.isFinite(size) || sun.shadow.mapSize.x === size) return;
  sun.shadow.mapSize.set(size, size);
  if (sun.shadow.map) {
    sun.shadow.map.dispose();
    sun.shadow.map = null; // forces the next shadow pass to reallocate at the new size
  }
}
function shadowSizeForCurrentTier() {
  return effectiveTier(atmospherePrefs, prefersReducedMotionOS) === 'reduced'
    ? REDUCED_SHADOW_MAP
    : BASELINE_SHADOW_MAP;
}

// Live application of the comfort preferences: limits apply once per change
// (setQuality same-tier calls are no-ops inside the controller), and turning
// flashes off cancels the incompatible pending flash immediately.
function applyAtmospherePreferences() {
  atmosphereController.setQuality(effectiveTier(atmospherePrefs, prefersReducedMotionOS));
  atmosphereEvents.setFlashMode(atmospherePrefs.flash);
  if (atmosphereController.isActive()) applyShadowTier(shadowSizeForCurrentTier());
}

// Authored zone audio for the active place (task 4.1): normalized once per
// activation; the frame loop only classifies the listener and crossfades.
let activeZones = [];
const activeZonesById = new Map();
const audioSample = {};
const exposureSample = {};
function cacheZoneAudio(seam) {
  const worldObj = seam?.world !== undefined ? seam.world : currentWorld;
  activeZones = normalizeZones(worldObj?.environment?.zones ?? []);
  activeZonesById.clear();
  for (const zone of activeZones) activeZonesById.set(zone.id, zone);
}
function updateEnvironmentAudio() {
  atmosphereStateClient.sample(audioSample);
  if (audioSample.active !== true) return;
  environmentAudio.setWeather(audioSample.rain ?? 0);
  // The Theater's active environment authors the ambience mix per variant
  // (rain/roof/wind/lowpass): its row replaces the exposure-based zone
  // fallback so each world has its own sound. Every other place keeps the
  // authored zone profiles.
  if (currentRoomId === ROOMS.THEATER) {
    const environment = theaterEnvironments.state;
    const row = environment?.environmentId
      ? getTheaterVariant(environment.environmentId, environment.variantId)
      : null;
    if (row?.audio) {
      environmentAudio.setZone(row.audio);
      return;
    }
  }
  const cls = classifyExposure(activeZones, player.position.x, player.position.z, exposureSample);
  const zone = cls.zoneId ? activeZonesById.get(cls.zoneId) : null;
  environmentAudio.setZone(zoneProfileFor(zone, cls.exposure));
}

/** @type {import('./realtime/wire.js').wireRealtime | null} */
let rtWire = null;

// Realtime binary + entity seam — flag-gated, default-off (src/realtime/flags.js).
import('./realtime/wire.js').then(({ wireRealtime }) => {
  rtWire = wireRealtime({ net, remotePlayers, guestId: net.guestId, scene });
}).catch(() => { /* module unavailable: legacy path */ });

const ui = new UIManager(net, {
  onAvatarChange: (id) => {
    if (!urlParams.get('avatar')) {
      player.userData.setAvatar?.(id);
    }
  },
});

// Town chat: panel + input. While the input holds focus the game must not
// react to typing, so focus changes clear any held movement keys.
const chatPanel = new ChatPanel(net, {
  onFocusChange: (typing) => {
    if (typing) {
      keys.clear();
      clearJumpMomentum();
      if (pointerLock.locked) pointerLock.exit();
    }
  },
});

// Theater screen overlay: anchors shared playback to the in-world screen,
// self-registers THEATER_STATE, and owns its own DOM (overlay, modals, and
// the footer controls button).
const theaterUI = new TheaterScreenUI(net);
// The cinema view's "Stand up" button hands the request to the game: the
// player must actually leave the chair, not just the big screen.
theaterUI.onStandUpRequest = () => standUp();
// Floating chrome "Back to game" returns keyboard focus to the world canvas
// (tabindex -1: programmatically focusable, never part of the tab order).
theaterUI.onReturnGameFocus = () => renderer.domElement.focus();
// One labeled action for "Turn on sound and unmute stream": runs the app's
// own Sound handler, then the floating speaker unmutes the stream.
theaterUI.requestMasterSound = () => {
  if (!muted) return true;
  $('sound').click();
  return !muted;
};
// Pointer-lock integration: first-person view locks the pointer and hides the
// cursor when mouse look is active, freeing movement from screen boundaries.
const pointerLock = createPointerLockBridge({
  getCanvas: () => renderer.domElement,
  onChange: (locked) => {
    if (cameraMode === FP_MODE) {
      if (locked) {
        renderer.domElement.style.cursor = 'none';
      } else {
        renderer.domElement.style.cursor = mouseLookEnabled ? '' : 'grab';
        hoverLast = null;
      }
    } else {
      renderer.domElement.style.cursor = '';
      hoverLast = null;
    }
  },
});

// Conferencing: opt-in audio/video/screen call panel (P8)
const callClient = new CallClient(net);
const callPanel = new CallPanel(callClient, {
  onFocusChange: (focusing) => {
    if (focusing) {
      keys.clear();
      clearJumpMomentum();
      if (pointerLock.locked) pointerLock.exit();
    }
  },
  onDuckingChange: (duckingRatio) => {
    const gain = callClient.status === 'connected' ? Math.max(0, 1.0 - duckingRatio) : 1.0;
    theaterUI.setMixGain(gain);
  },
});

// Local player avatar & Kiln companion
const urlParams = new URLSearchParams(window.location.search);
const initialAvatar = urlParams.get('avatar') || null;
const player = createAvatarFor(net.guestId, net.nickname, initialAvatar);
player.position.set(0, 0, 3);
scene.add(player);

const kiln = createKilnCompanion();
kiln.position.set(0.8, 0, 4);
scene.add(kiln);

// Save persistence for exploration progress
const SAVE_KEY = 'afterlight-save';
function loadExploration() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return readExploration(parsed.exploration);
  } catch {
    return readExploration({});
  }
}
function saveExploration(exp) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.exploration = exp;
    localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
  } catch {}
}
let exploration = loadExploration();

// --- WORLDS SETUP ---
const marketWorld = buildMarketWorld();
scene.add(marketWorld.group);
// Worlds stay dark until travel activates them: the first committed
// destination shows itself and every other group remains hidden.
marketWorld.group.visible = false;

const districtWorlds = new Map();

// Detailed SVG minimap schematics for every room/district. Market keeps its
// bespoke entry; district paths come from the shared place manifest so the
// definitions stay the single editable source.
const mapPaths = {
  market: 'M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24',
  ...Object.fromEntries(districts.map(d => [d.id, d.minimapPath])),
};

function getOrCreateDistrictWorld(distId) {
  if (districtWorlds.has(distId)) return districtWorlds.get(distId);
  const def = districts.find(d => d.id === distId);
  if (!def) return null;
  const isDone = exploration.completed.includes(distId);
  const world = buildDistrict(def, isDone);

  // Gates come from the definition's frozen exit declarations (the exact
  // legacy west/east/south topology lives in shared/placeDefinitions.js), so
  // appending a place can never reroute an existing destination.
  world.items.push(...gateItemsFor(def));

  // Social builders author their declared exits; legacy slabs must not
  // create a nonexistent south portal in a two-exit environment.
  if (def.shell !== 'none') {
  const gateGeo = new THREE.BoxGeometry(1, 1, 1);
  const gateMat = new THREE.MeshStandardMaterial({ color: '#c5b478', emissive: '#857545', emissiveIntensity: 0.6 });
  const archMat = new THREE.MeshStandardMaterial({ color: '#2b3d3e', roughness: 0.6 });
  for (const gate of gateVisualBoxesFor(def)) {
    const slab = new THREE.Mesh(gateGeo, gate.role === 'arch' ? archMat : gateMat);
    slab.position.set(gate.x, gate.y, gate.z);
    slab.scale.set(gate.w, gate.h, gate.d);
    world.group.add(slab);
  }

  world.ownedResources.geometries.push(gateGeo);
  world.ownedResources.materials.push(gateMat, archMat);
  }

  // A freshly built world stays hidden until travel activates it; only the
  // destination room's group is shown.
  world.group.visible = distId === currentRoomId;
  scene.add(world.group);
  districtWorlds.set(distId, world);
  return world;
}

// State & interaction variables
let nearest = null;
let target = null;
let emoteWheel = null;
let paused = false;
let t = 0;
let toastTimer = null;
const keys = new Set();
// Pointer gesture state lives with the other travel-transient input so a
// room change can clear it (declared before the first setRoom call below).
let press = null; // { x, y, lastX, lastY, dragging }
let hoverLast = null; // { x, y } last mouse position over the canvas, for mouse-look deltas

// Jump & bunny hop: session-local movement state, never saved or synced as
// anything but an airborne flag. Space jumps; holding it chains hops whose
// preserved momentum grows by HOP_GAIN up to HOP_CAP_RATIO × run speed.
const WALK_SPEED = 2.8;
const RUN_SPEED = 5.0;
const jumpState = createJumpState();
let jumpQueued = false; // set by the Space keydown, consumed by the next stepped frame

// Every path that clears held keys (sit, travel, pause, chat focus, blur)
// also grounds the player and drops any live hop chain: momentum never
// survives a state change.
function clearJumpMomentum() {
  emoteWheel?.close();
  stopEmote(player);
  resetJump(jumpState);
  jumpQueued = false;
}

// Stale-deployment recovery: a redeploy erases the content-hashed chunks a
// long-lived tab still references, so lazy imports (arcade controllers,
// hls.js, the realtime wire) fail with a generic module-load TypeError and
// the feature silently does nothing. Vite surfaces those failures as a
// cancelable `vite:preloadError` event; this listener verifies the session
// really is stale (re-fetching the page and comparing entry modules) and
// only then offers a reload. Never preventDefault(): the original rejection
// still reaches the per-feature catch blocks.
createUpdatePrompt({
  dialog: $('update-dialog'),
  reloadButton: $('update-reload'),
  laterButton: $('update-later'),
  onOpen: () => {
    paused = true;
    keys.clear();
    clearJumpMomentum();
  },
  onClose: () => {
    // Dismissal hands the keyboard back with nothing held, like every other
    // dialog.
    paused = false;
    keys.clear();
    clearJumpMomentum();
  },
}).install();

const ray = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

function toast(title, body, type = 'FIELD NOTE') {
  const elTitle = $('toast-title');
  const elBody = $('toast-body');
  const elType = $('toast-type');
  const elToast = $('toast');
  if (elTitle) elTitle.textContent = title;
  if (elBody) elBody.textContent = body;
  if (elType) elType.textContent = type;
  if (elToast) elToast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (elToast) elToast.style.opacity = '0';
  }, 5000);
}

let currentRoomId = ROOMS.MARKET;
let currentWorld = marketWorld;
let currentBounds = getBoundsForRoom('market');
// The active place's validated spawns; a seat dismount falls back to them
// when every authored escape point is blocked.
let activeSpawns = { spawn: [0, 3], companionSpawn: [0.8, 4] };

// --- PLACE RUNTIME: the tested transition coordinator behind setRoom ---
// One active runtime owns travel (prepare before commit, transient input
// resets, activation generations, network phase). main.js keeps renderer,
// actors, the single rAF loop and UI orchestration, exposed to the runtime
// through the seams below.

// The Orpheum's specialized controller: a lifecycle wrapper around the
// existing TheaterScreenUI singleton (the object is never rebuilt). Only
// this adapter may open cinema view, and only while the theater room is
// active — an external bench can never invoke it.
const theaterAdapter = createTheaterAdapter({ ui: theaterUI });
registerTheaterAdapter(theaterAdapter);

// Floating-media developer rollback (6.6): `?floating-media=off` or the
// localStorage flag disables acquisition entirely and restores primary
// presentation/audio on the same engine — no data or protocol migration.
const floatingMediaRollback = (() => {
  try {
    if (new URLSearchParams(location.search).get('floating-media') === 'off') return true;
  } catch {}
  try {
    return localStorage.getItem('afterlight-floating-media') === 'off';
  } catch {
    return false;
  }
})();

// Place activities runtime (Phase 1, place activities program):
// Coordinates activity lifecycles in the active place without adding a second rAF.
const activityRuntime = createActivityRuntime({
  net,
  isFloatingMediaEnabled: () => !floatingMediaRollback,
  getActiveCamera: () => activeCamera,
  getCanvas: () => renderer.domElement,
  getRenderer: () => renderer,
  scheduleGraphicsJob: (job) => graphicsJobs.schedule(job),
  runGraphicsTransaction: (fn) => graphicsJobs.runTransaction(fn),
  cancelGraphicsJobs: () => graphicsJobs.cancelAll(),
  getPlayer: () => player,
  audioMixer: () => audioMixer,
  setActivityCamera: (cam) => setActivityCamera(cam),
  clearActivityCamera: () => clearActivityCamera(),
  acquireView: (request) => activityView.acquireView(request),
  releaseView: (owner, reason) => activityView.release(owner, reason),
  worldFacts: () => ({
    bounds: currentBounds,
    obstacles: currentWorld?.obstacles ?? [],
    isWalkable: (b, o, x, z) => isWalkable(b, o, x, z),
    spawn: activeSpawns.spawn,
  }),
  applyAnchor: (anchor, slot) => {
    // The join/interact button must not retain native Space-to-click focus:
    // activating it again while occupied is intentionally the leave action.
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
    // An activity anchor supersedes any theater seat. Clear the seat before
    // pool owns Space so a stale seated flag cannot turn Shoot into Stand.
    if (seats.current) seats.stand();
    const pos = anchor.position;
    const ax = pos[0];
    const az = pos.length === 3 ? pos[2] : pos[1];
    player.position.set(ax, 0, az);
    if (typeof anchor.facing === 'number') {
      player.rotation.y = anchor.facing;
    }
    player.userData?.legs?.forEach(leg => { leg.rotation.x = 0; });
    target = null;
    marker.visible = false;
    clearJumpMomentum();
  },
  applyDismount: (point) => {
    clearActivityCamera();
    player.position.set(point.x, 0, point.z);
    player.userData?.legs?.forEach(leg => { leg.rotation.x = 0; });
    target = null;
    marker.visible = false;
    clearJumpMomentum();
  },
  sendMovement: (sitting) => net.sendMovement(player.position.x, player.position.z, player.rotation.y, false, sitting),
  clearMovement: () => {
    keys.clear();
    target = null;
    marker.visible = false;
    clearJumpMomentum();
  },
  toast: (title, body, tag) => toast(title, body, tag),
  // Floating mini-game media (add-floating-minigame-media D2): the runtime's
  // presentation lease drives the one existing theater surface. Entering a
  // game steps out of cinema so the game HUD is visible; exiting restores the
  // current primary presentation without recreating playback.
  onMediaPresentationEnter: (lease) => {
    if (theaterUI.isWatching()) theaterUI.setWatchMode(false);
    theaterUI.beginActivityPresentation(lease.token);
  },
  onMediaPresentationReplace: (lease) => {
    theaterUI.replaceActivityPresentation(lease.token);
  },
  onMediaPresentationExit: () => {
    theaterUI.endActivityPresentation();
  },
});
const participation = activityRuntime.participation;

// Floating media reservations (4.4): host chat/action controls plus the
// active activity's declared critical HUD/touch regions. Bounded to eight and
// measured on entry/resize — never every animation frame.
theaterUI.floatingReservations = () => {
  const act = participation.currentActivity;
  const policy = act?.type ? getActivityMediaPolicy(act.type) : null;
  const selectors = [
    ...HOST_RESERVATION_SELECTORS,
    ...(policy?.reservedSelectors || []),
  ];
  const extra = [];
  if (typeof policy?.reservedRects === 'function') {
    try {
      extra.push(...(policy.reservedRects() || []));
    } catch {}
  }
  return collectFloatingReservations(document, { selectors, extra });
};

// Direct challenges + nearby tables (phase 6 social layer). Accept only
// highlights a table — never travels, sits, or joins.
let challengePulseUntil = 0;
function highlightChallengeTable({ activityId, roomId } = {}) {
  const destRoom = roomId || currentRoomId;
  const act = getPlaceActivities(destRoom).find((a) => a.id === activityId);
  const title = act?.title || 'the table';
  const place = destRoom !== currentRoomId ? getPlaceDefinition(destRoom) : null;
  toast(
    'Table marked',
    place
      ? `${title} is in ${place.name}. Walk there — nobody was moved.`
      : `${title} is marked on the radar. Walk there — nobody was seated.`,
    'ACTIVITY',
  );
  const marker = $('map-challenge');
  if (!marker) return;
  if (!act || destRoom !== currentRoomId) {
    marker.setAttribute('visibility', 'hidden');
    return;
  }
  const pos = act.transform?.position || [0, 0];
  const ax = pos[0];
  const az = pos.length === 3 ? pos[2] : pos[1];
  const mapPos = projectToMinimap(currentBounds, ax, az);
  marker.setAttribute('cx', String(mapPos.cx));
  marker.setAttribute('cy', String(mapPos.cy));
  marker.setAttribute('visibility', 'visible');
  challengePulseUntil = performance.now() + 8000;
}

const challenges = initChallenges({
  net,
  toast: (title, body, tag) => toast(title, body, tag),
  getLocalId: () => net.guestId,
  onHighlight: (info) => highlightChallengeTable(info),
});

initNearbyActivities({
  net,
  getRoomId: () => currentRoomId,
});

const tournament = initTournamentBoard({
  dialog: $('tournament-dialog'),
  button: $('btn-tournament'),
  net,
  getPlayerId: () => net.guestId,
  getDisplayName: () => net.nickname,
  getRoomId: () => currentRoomId,
  onOpen: () => {
    paused = true;
    keys.clear();
    clearJumpMomentum();
    activityRuntime.neutralizeInput?.();
  },
  onClose: () => {
    paused = false;
    keys.clear();
    clearJumpMomentum();
  },
});

let lastInviteKey = '';
function refreshChallengeInvite() {
  const panel = $('challenge-invite');
  const list = $('challenge-invite-list');
  if (!panel || !list) return;
  const activityId = nearest?.type === 'activity' ? (nearest.activityId || nearest.id) : null;
  if (!activityId) {
    if (lastInviteKey !== '') {
      lastInviteKey = '';
      panel.hidden = true;
      list.textContent = '';
    }
    return;
  }
  const visitors = [];
  for (const [id, entry] of remotePlayers.players) {
    if (!id || id === net.guestId) continue;
    visitors.push({
      id,
      name: entry.avatar?.userData?.nickname || 'Visitor',
    });
  }
  const key = `${activityId}|${visitors.map((v) => v.id).join(',')}`;
  if (key === lastInviteKey) return;
  lastInviteKey = key;
  list.textContent = '';
  if (visitors.length === 0) {
    panel.hidden = true;
    return;
  }
  const heading = panel.querySelector('.challenge-invite-label');
  if (heading) heading.textContent = `INVITE TO ${nearest.title || 'THIS TABLE'}`;
  for (const visitor of visitors.slice(0, 6)) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `Challenge ${visitor.name}`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      challenges.invite({
        activityId,
        targetId: visitor.id,
        targetName: visitor.name,
      });
    });
    li.append(btn);
    list.append(li);
  }
  panel.hidden = false;
}

// Opt-in debug introspection (?debug=1): read-only accessors for automated
// gate verification. Never enabled by default; exposes only local state.
if (Array.from(new URLSearchParams(location.search).keys()).includes('debug')) {
  // Theater playback diagnostics (fix-theater-second-player-playback D6):
  // the ring is only collected and exposed behind ?debug=1.
  theaterUI.setDebugRecord(true);
  window.__afterlight = {
    player: () => [player.position.x, player.position.z],
    facing: () => player.rotation.y,
    room: () => currentRoomId,
    participation: () => participation.state,
    activity: () => participation.currentActivity?.id ?? null,
    sim: () => {
      const inst = activityRuntime.getInstance(participation.currentActivity?.id);
      return inst?.latestSnapshot ?? null;
    },
    paused: () => paused,
    kartPerformance: () => getKartPerfRecords(),
    clearKartPerformance: () => clearKartPerfRecords(),
    exportKartPerformance: () => exportKartPerfJson(),
    kartReadinessMetrics: () => globalThis.__kartReadinessMetrics?.summarizeReadinessMetrics?.() ?? null,
    kartAllocationLedger: () => globalThis.__kartAllocationLedger?.summary?.() ?? null,
    // Downhill Mayhem gate projection (bounded, local; see
    // scripts/downhill-mayhem-gate-browser.mjs).
    downhill: () => {
      const inst = activityRuntime.getInstance('orpheum-downhill-mayhem')
        ?? activityRuntime.getInstance(participation.currentActivity?.id);
      return inst?.getDebugState?.() ?? null;
    },
    downhillReadinessMetrics: () => globalThis.__downhillReadinessMetrics?.summarizeReadinessMetrics?.() ?? null,
    // Dev/test teleport (behind ?debug=1 only): places the avatar and
    // broadcasts one movement frame so server-side proximity checks see the
    // new pose. Used by automated browser gates; never a player feature.
    netState: () => ({
      mode: net.transportMode,
      supports: net.supportsActivities,
      open: net.transport?.isOpen?.() ?? null,
    }),
    theaterPlayback: () => theaterUI.debugPlaybackEvents(),
    // Read-only theater ownership handle for browser gates (identity checks
    // only; never mutates playback). See scripts/floating-media-gate-browser.mjs.
    theater: () => theaterUI,
    // Theater Environment introspection (debug-only, read-only): the active
    // environment identity + counts and renderer memory/render stats used by
    // the visual loop and leak checks.
    environment: () => {
      const envState = theaterEnvironments.state;
      const snap = worldState.snapshot();
      const selection = { worldId: snap.worldId, variantId: snap.variantId };
      const currentRoomDef = districts.find(d => d.id === currentRoomId);
      const viewId = currentRoomDef?.viewId || `place:${currentRoomId}`;
      const plan = resolveWorldPresentation({
        selection,
        viewId,
      });
      const assets = plan?.assetIds ?? [];
      const byteEstimate = estimateWorldAssetBytes(assets);
      return {
        ...envState,
        selection,
        actualHost: plan?.host ?? (theaterEnvironments.active ? 'theater' : 'native'),
        appliedRevision: snap.revision,
        fallback: plan?.fallback ?? false,
        fallbackLevel: plan?.fallbackLevel ?? null,
        fallbackReason: plan?.fallbackReason ?? null,
        assets,
        byteEstimate,
      };
    },
    resolveWorldView: (worldIdOrSelection, viewId) => {
      const selection = typeof worldIdOrSelection === 'string'
        ? { worldId: worldIdOrSelection }
        : (worldIdOrSelection || worldState.selection);
      const targetView = viewId || (districts.find(d => d.id === currentRoomId)?.viewId || `place:${currentRoomId}`);
      const plan = resolveWorldPresentation({
        selection,
        viewId: targetView,
      });
      const assets = plan?.assetIds ?? [];
      return {
        selection: plan.selection,
        viewId: targetView,
        mode: plan.mode,
        actualHost: plan.host,
        fallback: plan.fallback ?? false,
        fallbackLevel: plan.fallbackLevel ?? null,
        fallbackReason: plan.fallbackReason ?? null,
        assets,
        byteEstimate: estimateWorldAssetBytes(assets),
      };
    },
    setEnvironment: (presetId) => selectTheaterEnvironment(presetId),
    world: () => worldState.snapshot(),
    ambientPlace: () => ({
      active: ambientPlaceManager?.isActive ?? false,
      roomId: ambientPlaceManager?.activeRoomId ?? null,
      plan: ambientPlaceManager?.currentPlan ?? null,
    }),
    destinationPrefetch: () => destinationPrefetch,
    setWorld: ({ worldId, variantId, persist }) => worldState.select({ worldId, variantId, persist }),
    renderStats: () => ({
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      programs: renderer.info.programs?.length ?? null,
    }),
    // Read-only atmosphere probe for the visual loop: the values the shared
    // controller actually applied to the scene this frame.
    sceneInfo: () => ({
      fog: scene.fog?.color ? `#${scene.fog.color.getHexString()}` : null,
      fogDensity: typeof scene.fog?.density === 'number' ? scene.fog.density : null,
      background: scene.background?.isColor ? `#${scene.background.getHexString()}` : null,
      exposure: renderer.toneMappingExposure,
      sun: `#${sun.color.getHexString()}`,
      sunIntensity: sun.intensity,
      hemiIntensity: hemisphere.intensity,
      hemiSky: `#${hemisphere.color.getHexString()}`,
      hemiGround: `#${hemisphere.groundColor.getHexString()}`,
      atmosphereActive: atmosphereController.isActive(),
    }),
    // The client's semantic atmosphere: which preset it currently holds and
    // whether a room snapshot has been accepted (offline previews are not
    // "synced"). Debug-only, read-only.
    atmosphere: () => ({
      synced: atmosphereStateClient.isSynced(),
      status: atmosphereStateClient.status(),
      preset: atmosphereStateClient.getState()?.preset ?? null,
    }),
    floatingMediaEnabled: () => !floatingMediaRollback,
    avatar: () => player.userData.avatarId ?? null,
    setAvatar: (id) => player.userData.setAvatar?.(id),
    remotePlayers: () => remotePlayers,
    setRemotePlayer: (p) => remotePlayers.setPlayer(p),
    removeRemotePlayer: (id) => remotePlayers.removePlayer(id),
    // Pointer-lock contract hooks (5.4): the harnesses call the explicit
    // request from inside a real canvas gesture; nothing is automatic.
    pointerLock: () => pointerLock,
    requestPointerLock: () => pointerLock.requestFromGesture(),
    tp: (x, z) => {
      player.position.set(Number(x) || 0, 0, Number(z) || 0);
      target = null;
      marker.visible = false;
      clearJumpMomentum();
      net.sendMovement(player.position.x, player.position.z, player.rotation.y, false, false);
      return [player.position.x, player.position.z];
    },
    // Dev/test travel (behind ?debug=1 only): requests the standard place
    // transition so automated gates can move between destinations without
    // simulating a gate walk. Never a player feature.
    travel: (roomId) => {
      setRoom(roomId);
      return currentRoomId;
    },
    cameraMode: () => cameraMode,
    project: (x, z) => {
      const v = new THREE.Vector3(x, 0, z).project(activeCamera);
      return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight];
    },
    project3: (x, y, z) => {
      const v = new THREE.Vector3(Number(x) || 0, Number(y) || 0, Number(z) || 0).project(activeCamera);
      return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight];
    },
    // Screen-space pick used by visual-verification tooling to identify which
    // mesh is rendering at a pixel (read-only; no gameplay effect).
    pick: (sx, sy) => {
      const ndc = new THREE.Vector2((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, activeCamera);
      return raycaster.intersectObjects(scene.children, true).slice(0, 5).map(hit => ({
        d: +hit.distance.toFixed(2),
        point: hit.point.toArray().map(v => +v.toFixed(2)),
        type: hit.object.type,
        geo: hit.object.geometry?.type ?? null,
        pos: hit.object.position.toArray().map(v => +v.toFixed(2)),
        scale: hit.object.scale.toArray().map(v => +v.toFixed(2)),
        color: hit.object.material?.color?.getHexString?.() ?? null,
        mapped: !!hit.object.material?.map,
        emissive: hit.object.material?.emissive?.getHexString?.() ?? null,
      }));
    },
  };
}

// Seated pose ownership: normalization (legacy Theater offsets reproduced
// exactly), safe dismount choice and the pose flags on the wire.
const seats = createSeatController({
  worldFacts: () => ({ bounds: currentBounds, obstacles: currentWorld?.obstacles ?? [], spawn: activeSpawns.spawn }),
  applySit: (seat, pose) => {
    // Take the keyboard back: a focused chat input would silently swallow the
    // keys that get the player out of the chair again.
    if (document.activeElement?.id === 'chat-input') document.activeElement.blur();
    player.position.set(pose.x, 0, pose.z);
    player.rotation.y = pose.rotY;
    // Seated in first person: open the view facing where the chair faces.
    if (cameraMode === FP_MODE) fpYaw = pose.rotY + Math.PI;
    player.userData.legs.forEach(leg => { leg.rotation.x = -1.35; });
    target = null;
    marker.visible = false;
    clearJumpMomentum(); // sitting is a hard reset: no queued jump from the chair
  },
  applyStand: (seat, point) => {
    // The chosen dismount point steps outside the chair's collision
    // rectangle; standing at the seated spot would wedge the player between
    // chair rows. The place's safe spawn backs the choice up.
    player.position.set(point.x, 0, point.z);
    clearJumpMomentum();
    player.userData.legs.forEach(leg => { leg.rotation.x = 0; });
  },
  sendMovement: (sitting) => net.sendMovement(player.position.x, player.position.z, player.rotation.y, false, sitting),
  onSeatChanged: (detail) => placeRuntime.notifySeatChanged(detail),
  announce: (seat) => toast(
    seat.title || 'Take a Seat',
    `${seat.sub ? `${seat.sub} · ` : ''}Press E or a movement key to stand.`,
    currentRoomId === ROOMS.THEATER ? 'THE ORPHEUM' : 'TAKE A SEAT',
  ),
});

// --- PLACE PRESENTATION ---
function presentDestination(res) {
  // The runtime's active place is the game's active room from here on.
  currentRoomId = res.roomId;
  if (res.kind === 'place' && res.def) {
    // Dynamic lighting & background
    scene.fog.color.set(res.def.color);
    scene.background.set(res.def.color).multiplyScalar(0.45);
    sun.color.set(res.def.sun);
    // Authored framing: places may widen the orbit so their surroundings
    // read. The wheel keeps overriding within its existing bounds, and
    // places without a value keep the historical default.
    const desiredZoom = Number.isFinite(res.def.cameraZoom) ? res.def.cameraZoom : 24;
    if (desiredZoom !== zoom) { zoom = desiredZoom; resize(); }

    // HUD headers + the canvas accessible name travel with the place.
    $('location-title').textContent = res.def.name;
    $('district-tag').textContent = res.def.district;
    $('map-label').textContent = '• ' + res.def.subtitle;
    $('map-path').setAttribute('d', mapPaths[res.roomId] || mapPaths.court);
    $('world').setAttribute('aria-label', `${res.def.name} — ${res.def.description}`);
    $('btn-world').hidden = false;
    toast(res.def.name, res.def.description, 'ARRIVED IN DISTRICT');
  } else {
    scene.fog.color.set('#54645d');
    scene.background.set('#222d2a');
    sun.color.set('#ffe0a5');
    if (zoom !== 24) { zoom = 24; resize(); }

    $('location-title').textContent = "The Market Court";
    $('district-tag').textContent = "MARKET SOCIAL DISTRICT / 01";
    $('map-label').textContent = "• MARKET COURT 01";
    $('map-path').setAttribute('d', mapPaths.market);
    $('world').setAttribute('aria-label', 'The Market Court — a quiet square where the city paths meet');
    $('btn-world').hidden = false;
    toast("The Market Court", "A quiet square where the city's paths meet.");
  }
}

// Exploration save follows the legacy contract: only registered places are
// visited/current; the Market Court stays out of the save.
function persistVisit(res) {
  if (res.kind !== 'place' || !res.def) return;
  if (!exploration.visited.includes(res.roomId)) {
    exploration.visited.push(res.roomId);
  }
  exploration.current = res.roomId;
  saveExploration(exploration);
}

// Network membership is rendered honestly: joining is not claimed before
// accepted server evidence, and offline keeps the place rendered while
// shared actions wait.
function presentNetwork(status) {
  const indicator = $('net-indicator');
  if (!indicator) return;
  if (status.phase === 'online') {
    indicator.textContent = '● ONLINE';
    indicator.style.color = '#85e0a3';
  } else if (status.phase === 'joining') {
    indicator.textContent = '● JOINING';
    indicator.style.color = '#e0c583';
  } else {
    indicator.textContent = '● OFFLINE';
    indicator.style.color = '#e0907c';
  }
}

const placeRuntime = createPlaceRuntime({
  resolve: (requested) => resolveRoomRequest(requested, {
    hasDefinition: (id) => districts.find(d => d.id === id),
  }),
  // Prepare the destination world hidden and never committed; the factory
  // keeps freshly built groups invisible until travel shows them.
  build: (res) => {
    if (res.kind === 'place' && res.def) return getOrCreateDistrictWorld(res.roomId);
    return marketWorld;
  },
  callAdapter: {
    onPlaceLeaving: () => callClient.leaveCall(),
  },
  controllerFor: (res) => {
    const controller = res.kind === 'place' ? getPlaceController(res.roomId) : null;
    // Task 2.2: bind the atmosphere state client to the current place and
    // generation through the runtime's activation order; task 3.1 layers the
    // presentation controller on the same seam — it captures/restores the
    // shared presentation baseline around every activation and only owns the
    // frame while the place's manifest declares an atmosphere preset.
    return {
      activate: (seam) => {
        atmosphereStateClient.activate(seam);
        // Theater environments install their geometry + atmosphere hooks
        // BEFORE the controller activates, so wet material families, shelter
        // zones and emitter anchors bind on the first frame.
        if (seam.roomId === ROOMS.THEATER) {
          lastEnvironmentPreset = undefined;
          try {
            theaterEnvironments.sync({
              presetId: effectiveEnvironmentPreset(),
              def: seam.def,
              world: seam.world ?? currentWorld,
              tier: environmentPrefs.quality,
            });
          } catch (error) {
            console.error('[theater-environments] activation sync failed', error);
          }
        } else if (ambientPlaceManager) {
          ambientPlaceManager.activate(seam);
        }
        atmosphereController.activate(seam);
        // Audio + comfort ride the same activation generation (tasks 4.1/4.3):
        // retained loops start (silently before the Sound gesture), zone rows
        // are cached for the frame loop, and the shadow tier applies once.
        cacheZoneAudio(seam);
        environmentAudio.start();
        applyShadowTier(shadowSizeForCurrentTier());
        activityRuntime.activate(seam);
        controller?.activate?.(seam);
      },
      deactivate: () => {
        if (ambientPlaceManager) {
          ambientPlaceManager.deactivate();
        }
        activityRuntime.deactivate();
        activityView.revoke('travel');
        atmosphereController.deactivate();
        atmosphereStateClient.deactivate();
        // Place exit: loops stop/disconnect synchronously (well inside the
        // 200ms budget), scheduled thunder dies with the place, and the
        // borrowed shadow quality is restored (task 4.3).
        environmentAudio.stop();
        atmosphereEvents.cancelAll();
        applyShadowTier(BASELINE_SHADOW_MAP);
        controller?.deactivate?.();
      },
      onSeatChanged: (detail) => controller?.onSeatChanged?.(detail),
      openScreen: () => controller?.openScreen?.(),
    };
  },
  // Every consumer (movement, seats, frame loop) reads the same active
  // world and bounds the runtime just committed.
  adoptWorld: (world, res) => {
    currentWorld = world;
    currentBounds = getBoundsForRoom(res.roomId);
    if (res.roomId === ROOMS.THEATER) tournament.attachWorld(world);
    else tournament.detachWorld();
  },
  // Optional P8 conferencing adapter arrives with its own change; absent is
  // a no-op and travel never starts capture.
  callAdapter: null,
  seatControl: { standUp: () => standUp() },
  resetInput: () => {
    nearest = null;
    target = null;
    marker.visible = false;
    keys.clear();
    press = null;
    // Grounds the player, drops any hop chain and closes the emote wheel
    // and pose: nothing of the old room's motion survives travel.
    clearJumpMomentum();
  },
  placeActors: (res, spawns) => {
    activeSpawns = spawns;
    player.position.set(spawns.spawn[0], 0, spawns.spawn[1]);
    kiln.position.set(spawns.companionSpawn[0], 0, spawns.companionSpawn[1]);
  },
  bindNetwork: (roomId) => {
    // Records the desired room on the network client: sent immediately while
    // connected, and replayed from onopen (including after reconnects) when
    // the socket is not open yet, as during page load. The realtime seam
    // keeps intercepting this path.
    net.joinRoom(roomId);
  },
  clearRoster: () => remotePlayers.clear(),
  persistVisit,
  present: {
    destination: presentDestination,
    fallback: (res) => toast(
      'That place is not on the map',
      `No known place answers to “${res.requested}” — you arrive at The Orpheum instead.`,
      'TRAVEL',
    ),
    travelError: (res, error) => toast(
      'Travel failed',
      `The way to ${res.def?.name || res.requested || res.roomId} is blocked for now — pick the place again to retry.`,
      'TRAVEL',
    ),
    network: presentNetwork,
  },
});

// Framework-owned interactions: seats, travel gates, field notes and
// specialized screen delegation answer first; every other item type falls
// through to the legacy dispatch in interact().
const interactions = createInteractionRegistry();
registerCoreInteractions(interactions, {
  travel: (roomId) => setRoom(roomId),
  seatControl: seats,
  readFieldNote: (item) => toast(item.sub, item.body, 'FIELD NOTE'),
  openScreen: () => theaterAdapter.openScreen(),
  activityControl: participation,
});

function setRoom(roomId) {
  placeRuntime.travel(roomId);
}

// New visitors wake up in The Orpheum, in cinema view — the shared screen
// is the city's living room. Users are served a randomly chosen World upon entry
// from the World list (Coastal Dusk, Rainforest Canopy, Alpine Aurora, Desert Oasis,
// Ancient Redwood Forest, Cloud Garden). ?world=<id> or ?preset=<id> overrides for deep links.
const initialRoomParam = new URLSearchParams(window.location.search).get('room');
let initialRoom = ROOMS.THEATER;
if (initialRoomParam) initialRoom = initialRoomParam;

setRoom(initialRoom);

// --- NETWORK PACKET HANDLERS ---
net.on(MSG_TYPES.WELCOME, (msg) => {
  // Server acceptance evidence for the active room: shared actions resume.
  placeRuntime.markNetworkOnline();
  if (msg.player) {
    ui.updatePlayerHUD(msg.player);
    player.userData.updateNickname(msg.player.nickname);
    if (msg.player.avatar && !urlParams.get('avatar')) {
      player.userData.setAvatar?.(msg.player.avatar);
    }
  }
  if (msg.weather) updateWeatherDisplay(msg.weather);
  if (msg.theater) theaterUI.applyState(msg.theater, msg.serverNow || Date.now());
});

// A dropped socket leaves the rendered place exactly where it is, marked
// offline: shared actions wait, and the client's own reconnect replay (or
// picking a place in Travel) restores membership without a rebuild.
net.onDisconnect(() => {
  placeRuntime.markNetworkOffline();
  atmosphereEvents.cancelAll(); // shared one-shots stop with the connection (task 4.2)
  toast('Connection Lost', 'The connection dropped — this place still renders, but shared actions wait for the server. It reconnects on its own, or pick a place to retry.', 'OFFLINE');
});

net.on(MSG_TYPES.PRESENCE_JOIN, (msg) => {
  if (rtWire?.consumePresenceJoin?.(msg)) return;
  if (msg.player && msg.player.id !== net.guestId) {
    remotePlayers.setPlayer(msg.player);
    toast('A Visitor Arrived', `${msg.player.nickname} entered the area.`);
  }
});

net.on(MSG_TYPES.PRESENCE_LEAVE, (msg) => {
  if (rtWire?.consumePresenceLeave?.(msg)) return;
  if (msg.playerId) {
    remotePlayers.removePlayer(msg.playerId);
  }
});

net.on(MSG_TYPES.PRESENCE_UPDATE, (msg) => {
  if (rtWire?.consumePresenceUpdate?.(msg)) return;
  if (Array.isArray(msg.players)) {
    for (const p of msg.players) {
      if (p.id !== net.guestId) {
        remotePlayers.setPlayer(p);
      }
    }
  }
});

// Theater snapshots arrive on WELCOME and on every applied change; the
// overlay also registers its own handler internally.
net.on(MSG_TYPES.THEATER_STATE, (msg) => {
  if (msg.theater) theaterUI.applyState(msg.theater, msg.serverNow || Date.now());
});

// Activity frames: forwarded to active-place activity runtime
net.on(MSG_TYPES.ACTIVITY_STATE, (msg) => activityRuntime.acceptSnapshot(msg));
net.on(MSG_TYPES.ACTIVITY_EVENT, (msg) => activityRuntime.acceptEvent(msg));
net.on(MSG_TYPES.ACTIVITY_RESULT, (msg) => activityRuntime.acceptResult(msg));
net.on(MSG_TYPES.ACTIVITY_ERROR, (msg) => activityRuntime.acceptError(msg));
// Join-time closed-game snapshot: gated cabinets present as coming soon.
net.on(MSG_TYPES.ACTIVITY_AVAILABILITY, (msg) => activityRuntime.acceptAvailability(msg));

net.on(MSG_TYPES.WEATHER_UPDATE, (msg) => {
  updateWeatherDisplay(msg.weather);
});

net.on(MSG_TYPES.EMOTE_BROADCAST, (msg) => {
  if (msg.playerId === net.guestId || !isEmote(msg.emote)) return;
  startEmote(remotePlayers.players.get(msg.playerId)?.avatar, msg.emote);
});

// Town chat packets; the ChatPanel registered its own handlers at setup and
// flips to online again on WELCOME (e.g. after a reconnect).
net.on(MSG_TYPES.WELCOME, () => chatPanel.setConnected(true));

function updateWeatherDisplay(weather) {
  // Legacy weather (World.Weather via weather_update/WELCOME) keeps feeding
  // the HUD cache on legacy rooms, but it must never override an active place
  // atmosphere's fog or caption (add-atmosphere-weather-system D1). Weather
  // is presentation-only: no simulation consumes it.
  if (legacyWeatherDisplaySuppressed(atmosphereStateClient)) return;
  const icon = weather === 'rain' ? '☔' : weather === 'drizzle' ? '☂' : '☼';
  const label = weather === 'rain' ? 'HEAVY RAIN' : weather === 'drizzle' ? 'RAINY MIST' : 'CLEAR AFTER RAIN';
  $('weather-icon').textContent = icon;
  $('weather-text').textContent = label;
  scene.fog.density = weather === 'rain' ? 0.026 : weather === 'drizzle' ? 0.022 : 0.016;
}

// Connect WebSocket
net.connect();

// --- AUDIO SYNTHESIS ---
let audio = null;
let muted = true;
// Footsteps: local player only, cadence follows run/walk. Volume lives in
// Settings and persists per browser; storage failures fall back to
// session-only without pretending otherwise.
let stepsVolume = 0.7;
let stepGain = null;
let stepBuffer = null;
let stepTimer = 0;
let stepSide = 1;
const STEPS_KEY = 'afterlight-footsteps';
try {
  const saved = localStorage.getItem(STEPS_KEY);
  if (saved !== null && saved !== '') {
    const n = Number(saved); // Number(null) is 0 — only parse a real stored value
    if (Number.isFinite(n) && n >= 0 && n <= 100) stepsVolume = n / 100;
  }
} catch { /* restricted storage: session-only volume */ }
function persistStepsVolume() {
  try { localStorage.setItem(STEPS_KEY, String(Math.round(stepsVolume * 100))); } catch { /* ignore */ }
}

function chime(freqs = [440, 554, 660]) {
  if (!audio || muted) return;
  freqs.forEach((f, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, audio.currentTime + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.04, audio.currentTime + 0.02 + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.8 + i * 0.08);
    osc.connect(gain).connect(audioMixer.buses.effects); // chimes share the effects bus
    osc.start(audio.currentTime + i * 0.08);
    osc.stop(audio.currentTime + 0.9 + i * 0.08);
  });
}

// One soft footfall: a decaying noise burst through a lowpass, alternating
// slightly between "feet" for a natural cadence. Deterministically cheap —
// one shared buffer, three small nodes per step.
function playFootstep() {
  if (!audio || muted || stepsVolume <= 0 || !stepBuffer) return;
  const src = audio.createBufferSource();
  src.buffer = stepBuffer;
  src.playbackRate.value = 0.85 + Math.random() * 0.35;
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 380 + Math.random() * 220;
  const env = audio.createGain();
  const t0 = audio.currentTime;
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.5 + Math.random() * 0.2, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  src.connect(filter).connect(env);
  if (audio.createStereoPanner) {
    const pan = audio.createStereoPanner();
    pan.pan.value = 0.22 * stepSide;
    stepSide = -stepSide;
    env.connect(pan).connect(stepGain);
  } else {
    env.connect(stepGain);
  }
  src.start(t0);
  src.stop(t0 + 0.1);
}

$('sound').onclick = async () => {
  muted = !muted;
  if (!audio) {
    // The ONE shared AudioContext (task 4.1): buses for environment/effects
    // live in the mixer; footsteps keep their own subgain on the effects bus.
    audio = audioMixer.ensure();
    if (audio) {
      stepGain = audio.createGain();
      stepGain.gain.value = stepsVolume;
      stepGain.connect(audioMixer.buses.effects);
      // Footstep source: a short noise burst, pre-decayed so it thuds.
      stepBuffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.09), audio.sampleRate);
      const stepData = stepBuffer.getChannelData(0);
      for (let i = 0; i < stepData.length; i++) {
        stepData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / stepData.length, 2);
      }
      // Environment loops (ambience + weather layers) are synthesized once
      // and retained; the old direct-to-destination ambient loop is gone.
      environmentAudio.start();
    }
  }
  if (audio) {
    if (muted) {
      atmosphereEvents.cancelAll(); // mute cancels scheduled thunder handles (task 4.2)
      await audioMixer.suspend();
    } else {
      await audioMixer.resume();
    }
    // Autoplay denial: report honestly and let the next Sound gesture retry.
    if (!muted && audioMixer.status() !== 'running') muted = true;
  }
  // The master switch gates every local source, theater media included:
  // sound off (the default) keeps queued videos silent; sound on restores
  // the user's own theater volume on the live engine.
  audioMixer.setSoundEnabled(!muted);
  theaterUI.setMasterSound(!muted);
  $('sound').textContent = muted ? '♫  Sound off' : '♫  Sound on';
};

$('footsteps').value = String(Math.round(stepsVolume * 100));
$('footsteps-value').textContent = `${Math.round(stepsVolume * 100)}%`;
$('footsteps').oninput = () => {
  stepsVolume = Number($('footsteps').value) / 100;
  $('footsteps-value').textContent = `${Math.round(stepsVolume * 100)}%`;
  if (stepGain) stepGain.gain.value = stepsVolume;
  persistStepsVolume();
};

// Weather comfort preferences (task 4.3): the effect tier is separate from
// the DPR selector above, reduced motion follows the OS until overridden,
// and every change applies live — no restart. Storage is best-effort and
// additive (`afterlight-atmosphere-v1`); failures keep the session choice.
const atmospherePrefControls = {
  quality: $('atmosphere-quality'),
  motion: $('atmosphere-motion'),
  flash: $('atmosphere-flash'),
};
function syncAtmosphereControls() {
  if (!atmospherePrefControls.quality) return;
  atmospherePrefControls.quality.value = atmospherePrefs.quality;
  atmospherePrefControls.motion.value = atmospherePrefs.reduceMotion;
  atmospherePrefControls.flash.value = atmospherePrefs.flash;
}
function setAtmospherePreference(change) {
  atmospherePrefs = { ...atmospherePrefs, ...change };
  saveAtmospherePreferences(atmospherePrefs, localStorage);
  syncAtmosphereControls();
  applyAtmospherePreferences();
}
syncAtmosphereControls();
atmospherePrefControls.quality?.addEventListener('change', () => {
  setAtmospherePreference({ quality: atmospherePrefControls.quality.value });
});
atmospherePrefControls.motion?.addEventListener('change', () => {
  setAtmospherePreference({ reduceMotion: atmospherePrefControls.motion.value });
});
atmospherePrefControls.flash?.addEventListener('change', () => {
  setAtmospherePreference({ flash: atmospherePrefControls.flash.value });
});
applyAtmospherePreferences();

// Ambience / weather volume sliders (tasks 4.1/4.3): independent logical
// gains on the shared mixer; malformed/unavailable storage stays session-only.
function bindAudioVolume(inputId, labelId, prefName) {
  const input = $(inputId);
  const label = $(labelId);
  if (!input || !label) return;
  const pct = Math.round(audioMixer.preference(prefName) * 100);
  input.value = String(pct);
  label.textContent = `${pct}%`;
  input.addEventListener('input', () => {
    const value = Number(input.value) / 100;
    label.textContent = `${input.value}%`;
    audioMixer.setPreference(prefName, value);
  });
}
bindAudioVolume('ambience-volume', 'ambience-value', 'ambience');
bindAudioVolume('weather-volume', 'weather-value', 'weather');

// --- INTERACTION LOGIC ---
// Sitting: the seat controller owns the pose (sit snap, folded legs, safe
// dismount, wire flags) — the interaction registry routes seat items to it.
// Cinema view is requested only by the active Theater adapter through the
// runtime's seat notification — an external bench never opens it.
function standUp() {
  seats.stand();
}

function interact() {
  if (paused && !activityView.held) return;

  // E while a leased race view is up exits the race (focus hierarchy kept):
  // leave the session (server leave + safe dismount) AND release the view so
  // world input and the camera seam are fully restored.
  if (activityView.held) {
    activityView.revoke('exit');
    if (participation.isOccupied) participation.leave();
    return;
  }

  // E while seated always stands up, regardless of what else is nearby.
  if (seats.current) {
    standUp();
    return;
  }

  // E while participating or joining an activity leaves with safe dismount.
  // Repeated E while joining Kart Royale reuses the pending attempt (Task 2.1).
  if (participation.isOccupied) {
    if (participation.currentActivity?.id === 'orpheum-kart-royale' && participation.isJoining) {
      return; // reuse pending activation; Esc cancels via participation.leave
    }
    participation.leave();
    return;
  }

  // Single activity entry route (3.2): the runtime acquires the floating
  // presentation token BEFORE lazy loading or a direct join, so media floats
  // from the first instant and a rejection releases it again.
  if (nearest?.type === 'activity') {
    const actId = nearest.activityId ?? nearest.id;

    // Server-marked closed (admission-gated game this server declined to
    // open): honest coming-soon feedback instead of a doomed join the
    // server is guaranteed to reject.
    const closedInfo = activityRuntime.closedActivityInfo(nearest.activityDef || nearest);
    if (closedInfo) {
      toast(closedInfo.title, 'Not open on this server yet — check back soon.');
      return;
    }

    if (actId === 'orpheum-kart-royale') {
      // Debug-only instrumentation: record which World presentation the
      // attempt resolved to (selection, host, fallback, assets and labeled
      // byte estimates) alongside the existing timing spans.
      const kartPlan = resolveWorldPresentation({
        selection: worldState.selection,
        viewId: 'activity:kart-royale',
      });
      const kartAssets = kartPlan?.assetIds ?? [];
      startKartAttempt({
        generation: activityRuntime.activeGeneration ?? 0,
        attemptId: Date.now(),
        route: 'cold',
        world: {
          selection: worldState.selection,
          appliedRevision: worldState.snapshot().revision,
          actualHost: kartPlan?.host ?? null,
          fallback: kartPlan?.fallback ?? false,
          assets: kartAssets,
          byteEstimates: estimateWorldAssetBytes(kartAssets),
        },
      });
      startKartSpan('interaction');
    }
    const entry = activityRuntime.enterActivity(nearest);
    if (actId === 'orpheum-kart-royale') {
      endKartSpan('interaction');
    }
    if (entry.handled) return;
  }

  if (!nearest) {
    toast("No Target Nearby", "Approach a gateway, seat, table or landmark to interact.");
    return;
  }

  // Framework-owned types (seats, travel gates, field notes, screen
  // delegation) answer first; unknown types fall through to the legacy
  // dispatch below, unchanged.
  if (interactions.dispatch(nearest).handled) return;

  if (nearest.type === 'tournament-board') {
    tournament.open();
    return;
  }

  // Landmark Restoration
  if (nearest.type === 'landmark') {
    const def = districts.find(d => d.id === currentRoomId);
    if (def) {
      if (!exploration.completed.includes(currentRoomId)) {
        exploration.completed.push(currentRoomId);
        saveExploration(exploration);
        currentWorld.update?.(t, true);
        toast(def.done, def.message, 'RESTORATION COMPLETE');
      } else {
        toast(def.done, 'This sector has already been restored.', 'RESTORATION ACTIVE');
      }
    }
    return;
  }
}

$('interact').onclick = interact;

// Places selector (T / Travel): featured destinations first, an expandable
// Legacy areas group that retains every old destination, and live occupancy
// counts where the server can answer (unknown stays "—", never a guess).
function placeDestinations() {
  const entries = districts.map(def => {
    const isCurrent = currentRoomId === def.id;
    const isCompleted = exploration.completed.includes(def.id);
    const isVisited = exploration.visited.includes(def.id);
    let badgeClass = 'unexplored', badgeText = 'UNEXPLORED';
    if (isCurrent) {
      badgeClass = 'current'; badgeText = 'CURRENT';
    } else if (isCompleted) {
      badgeClass = 'restored'; badgeText = '✦ RESTORED';
    } else if (isVisited) {
      badgeClass = 'visited'; badgeText = 'VISITED';
    }
    return {
      roomId: def.id,
      featured: !!def.social?.featured,
      micro: def.district,
      name: def.name,
      description: def.description,
      badgeClass,
      badgeText,
      current: isCurrent,
    };
  });
  entries.push(
    {
      roomId: ROOMS.MARKET,
      featured: false,
      micro: 'MARKET SOCIAL DISTRICT / 01',
      name: 'The Market Court',
      description: 'A quiet square where the city paths meet.',
      badgeClass: currentRoomId === ROOMS.MARKET ? 'current' : 'visited',
      badgeText: currentRoomId === ROOMS.MARKET ? 'CURRENT' : 'CIVIC HUB',
      current: currentRoomId === ROOMS.MARKET,
    },
  );
  return entries;
}

const placeSelector = createPlaceSelector({
  dialog: $('district-dialog'),
  container: $('district-list'),
  closeButton: $('close-districts'),
  net,
  getDestinations: placeDestinations,
  onTravel: (roomId) => setRoom(roomId),
  onIntent: (roomId) => destinationPrefetch?.declareIntent({ placeId: roomId }),
  onOpen: () => {
    paused = true;
    keys.clear();
    clearJumpMomentum();
    if (pointerLock.locked) pointerLock.exit();
  },
  onClose: () => {
    paused = false;
    // Closing hands the keyboard back to the game with nothing held: keys
    // pressed while the modal was up must not walk the player.
    keys.clear();
    clearJumpMomentum();
  },
});

function openDistricts() {
  if (pointerLock.locked) pointerLock.exit();
  placeSelector.open();
}

$('btn-travel').onclick = openDistricts;

// World selector (Theater Environment campaign): one Orpheum room, six
// authored worlds. The dialog renders the shared manifest; selecting applies
// the preset locally at once and asks the room to adopt it, and the accepted
// atmosphere snapshot keeps every occupant in sync (syncTheaterEnvironment
// refreshes the open dialog from that state).
worldSelector = createWorldSelector({
  dialog: $('world-dialog'),
  container: $('world-list'),
  statusElement: $('world-status'),
  getActivePreset: () => effectiveEnvironmentPreset(),
  getState: () => worldState.snapshot(),
  onSelect: (presetId) => selectTheaterEnvironment(presetId),
  onOpen: () => {
    paused = true;
    keys.clear();
    clearJumpMomentum();
    activityRuntime.neutralizeInput?.();
    if (pointerLock.locked) pointerLock.exit();
  },
  onClose: () => {
    paused = false;
    keys.clear();
    clearJumpMomentum();
    activityRuntime.neutralizeInput?.();
  },
  createEl: (tag) => document.createElement(tag),
});
$('btn-world').onclick = () => {
  if (pointerLock.locked) pointerLock.exit();
  worldSelector.open();
};
$('close-world').onclick = () => worldSelector.close();
$('world-dialog').addEventListener('cancel', (e) => { e.preventDefault(); worldSelector.close(); });
const settingsWorldBtn = $('settings-world-button');
if (settingsWorldBtn) {
  settingsWorldBtn.onclick = () => {
    $('settings-dialog').close();
    worldSelector.open();
  };
}

// Records & verified leaderboards (P2): local bests are machine-local and
// honestly labeled; verified records come only from the server's referee.
const leaderboardDialog = createLeaderboardDialog({
  dialog: $('leaderboard-dialog'),
  net,
    getPlayerId: () => net.guestId ?? null,
  onOpen: () => {
    paused = true;
    keys.clear();
    clearJumpMomentum();
    if (pointerLock.locked) pointerLock.exit();
  },
  onClose: () => {
    paused = false;
    keys.clear();
    clearJumpMomentum();
  },
});
$('btn-records').onclick = () => {
  if (pointerLock.locked) pointerLock.exit();
  leaderboardDialog.open();
};

// Terminal run results (P2): a finished arcade run updates the local best
// (marked pending), and the server's recording status relabels it verified
// or unrecorded. Never raised from the frame path.
net.on(MSG_TYPES.ACTIVITY_EVENT, (msg) => {
  const type = msg?.eventType || msg?.event || msg?.type;
  const data = msg?.data || msg?.payload || {};
  const game = data?.game;
  if (!game) return;

  if (type === 'result_recorded') {
    const version = data.rulesVersion;
    if (ARCADE_GAMES.includes(game) && Number.isInteger(data.score) && data.score >= 0) {
      recordLocalBest(game, version, data.score);
    }
    applyRecordingStatus({ game, rulesVersion: version, status: data.status });
  }
});
emoteWheel = createEmoteWheel({
  canOpen: () => !paused && !document.querySelector('dialog[open]'),
  onOpen: () => {
    keys.clear(); clearJumpMomentum(); target = null; marker.visible = false; press = null;
    theaterUI.setWatchMode(false);
    if (pointerLock.locked) pointerLock.exit();
  },
  onChoose: id => {
    startEmote(player, id);
    net.sendEmote(id);
    toast(EMOTES.find(e => e.id === id).label, 'Move to finish your emote.', 'EMOTE');
  },
});
$('btn-emote').onclick = () => {
  if (pointerLock.locked) pointerLock.exit();
  emoteWheel.open();
};
$('btn-edit-nick').onclick = () => {
  if (pointerLock.locked) pointerLock.exit();
  ui.openProfile();
};

// Settings & Pause
function toggleSettings() {
  paused = !paused;
  keys.clear();
  clearJumpMomentum();
  activityRuntime.neutralizeInput?.();
  if (paused) {
    if (pointerLock.locked) pointerLock.exit();
    $('settings-dialog').showModal();
  } else {
    $('settings-dialog').close();
    // Resuming seeks the atmosphere to CURRENT server state and silently
    // drops events that started or expired while paused (task 2.2 D3); the
    // event envelopes drop clock-dependent thunder handles with it (4.2).
    atmosphereStateClient.resume();
    atmosphereEvents.resync();
  }
}
$('settings').onclick = toggleSettings;
$('resume').onclick = toggleSettings;
$('settings-dialog').addEventListener('cancel', (e) => { e.preventDefault(); toggleSettings(); });

// Application-root fullscreen (5.3): documentElement owns the canvas, the
// floating media surface and native dialogs, so one browser fullscreen keeps
// the whole game usable. Canvas-only / provider-native fullscreen is outside
// this combined mode (documented in the settings note).
const appFullscreen = createAppFullscreen({
  onChange: (active) => {
    const btn = $('fullscreen-toggle');
    if (btn) {
      btn.textContent = active ? 'Exit fullscreen' : 'Go fullscreen';
      btn.setAttribute('aria-pressed', String(active));
    }
  },
});
$('fullscreen-toggle').onclick = async () => {
  const result = await appFullscreen.toggle();
  if (!result.ok) {
    toast('Fullscreen unavailable', 'The browser declined fullscreen — the game keeps playing in the window.');
  }
};
function setCameraMode(mode) {
  cameraMode = cameraSeam.setWorldMode(mode);
  activeCamera = cameraSeam.resolveActiveCamera({ isoCamera: camera, fpCamera });
  renderPass.camera = activeCamera;
  // First person opens facing where the avatar faces. The avatar faces +Z at
  // rotation.y = 0 while the camera looks down -Z, so the yaw needs a PI flip.
  if (cameraMode === FP_MODE) {
    fpYaw = player.rotation.y + Math.PI;
    fpPitch = 0;
  }
  // The player's own avatar stays out of view in first person; everything
  // else (Kiln, remote players, scenery) renders normally.
  player.visible = cameraMode !== FP_MODE;
  if (cameraMode === FP_MODE) {
    renderer.domElement.style.cursor = mouseLookEnabled ? 'none' : 'grab';
    if (mouseLookEnabled) {
      pointerLock.requestFromGesture();
    } else if (pointerLock.locked) {
      pointerLock.exit();
    }
  } else {
    renderer.domElement.style.cursor = '';
    if (pointerLock.locked) {
      pointerLock.exit();
    }
  }
}

function setActivityCamera(customCamera) {
  cameraSeam.acquireActivityCamera(customCamera);
  activeCamera = cameraSeam.resolveActiveCamera({ isoCamera: camera, fpCamera });
  renderPass.camera = activeCamera;
}

function clearActivityCamera() {
  const { restoredMode } = cameraSeam.releaseActivityCamera();
  setCameraMode(restoredMode);
}

$('camera').onclick = () => setCameraMode(cameraSeam.cycleWorldMode());
$('quality').onchange = () => {
  renderer.setPixelRatio(Math.min(devicePixelRatio, Number($('quality').value)));
  resize();
};
$('atmosphere').onchange = () => { particles.visible = $('atmosphere').checked; };

// Mouse look toggle: flips the look input immediately (no dialog close
// needed) and persists; a storage failure keeps the choice session-local.
{
  const mouseLookCheckbox = $('mouse-look');
  mouseLookCheckbox.checked = mouseLookEnabled;
  mouseLookCheckbox.onchange = () => {
    mouseLookEnabled = mouseLookCheckbox.checked;
    writeMouseLookPreference(mouseLookEnabled);
    if (cameraMode === FP_MODE) {
      if (mouseLookEnabled) {
        renderer.domElement.style.cursor = 'none';
        pointerLock.requestFromGesture();
      } else {
        renderer.domElement.style.cursor = 'grab';
        if (pointerLock.locked) pointerLock.exit();
      }
    }
  };
}

// --- KEYBOARD CONTROLS ---
window.addEventListener('keydown', (e) => {
  // Floating media controls own their keys: Tab/Enter/Space/arrows must not
  // reach gameplay, including capture-phase activity handlers.
  if (isMediaUiEvent(e)) return;
  // The browser's pointer-lock unlock gesture consumes this Escape: it must
  // not also leave the activity or open settings.
  if (e.code === 'Escape' && pointerLock.consumeUnlockEscape()) return;
  if ((isTypingTarget(e.target) || e.target.closest('#call-panel')) && e.code !== 'Escape') return;

  if (participation.isParticipating && e.code === 'KeyF') {
    e.preventDefault();
    e.stopImmediatePropagation();
    activityRuntime.getInstance(participation.currentActivity?.id)?.handlePrimaryAction?.(true);
    return;
  }

  // Space belongs exclusively to world jumping. At an occupied table it is
  // intentionally inert, so it cannot stand, click, shoot, or leave.
  if (participation.isParticipating && e.code === 'Space') {
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }

  // Occupied activities own their play keys before seat/cinema/world input is
  // considered. Returning here does not stop propagation; the activity's own
  // capture listener still receives the event.
  if (participation.isParticipating && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyC'].includes(e.code)) {
    e.preventDefault();
    return;
  }

  // A seated player can always free themselves with E or any movement key —
  // this runs even while some panel has paused the world, so sitting can
  // never become a trap.
  if (seats.current && ['KeyE', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    standUp();
    if (e.code !== 'KeyE') {
      e.preventDefault();
      return; // keep held movement out of the keys set on this press; repeats flow through normally
    }
    return;
  }

  if (e.code === 'KeyT') {
    openDistricts();
    return;
  }

  // Enter (or /) opens the town chat input — unless a dialog is up.
  if ((e.code === 'Enter' || e.code === 'Slash') && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    activityRuntime.neutralizeInput?.();
    chatPanel.focusInput(e.code === 'Slash' ? '/' : '');
    return;
  }

  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  keys.add(e.code);

  if (e.repeat) return;
  if (e.code === 'Space' && !paused && !seats.current && !participation.isParticipating) jumpQueued = true; // consumed by the frame loop
  if (e.code === 'KeyE') interact();
  // In The Orpheum, G opens the projection booth (screen controls, IPTV, guide).
  // preventDefault keeps the g from typing into the dialog's freshly focused URL input.
  if (e.code === 'KeyG' && currentRoomId === ROOMS.THEATER && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    if (pointerLock.locked) pointerLock.exit();
    theaterUI.openControls();
  }
  if (e.code === 'KeyC') $('camera').click();
  if (e.code === 'Escape') {
    const hasInputFocused = isTypingTarget(document.activeElement);
    const hasOpenDialog = !!document.querySelector('dialog[open]');
    const isActivityOccupied = participation.isOccupied;
    const isSeated = !!seats.current;
    const isCinemaWatching = theaterUI.isWatching();
    const action = resolveEscapeAction({
      hasInputFocused,
      hasOpenDialog,
      isActivityOccupied,
      isSeated,
      isCinemaWatching,
      isPaused: paused,
    });

    switch (action) {
      case ESCAPE_TARGETS.FOCUSED_INPUT:
        document.activeElement.blur();
        break;
      case ESCAPE_TARGETS.OPEN_DIALOG:
        break;
      case ESCAPE_TARGETS.ACTIVITY:
        participation.leave();
        break;
      case ESCAPE_TARGETS.SEAT:
        standUp();
        break;
      case ESCAPE_TARGETS.CINEMA:
        theaterUI.setWatchMode(false);
        break;
      case ESCAPE_TARGETS.SETTINGS:
        toggleSettings();
        break;
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (isMediaUiEvent(e)) return; // media chrome never releases a game action
  keys.delete(e.code);
  if (participation.isParticipating && e.code === 'KeyF') {
    e.preventDefault();
    e.stopImmediatePropagation();
    activityRuntime.getInstance(participation.currentActivity?.id)?.handlePrimaryAction?.(false);
  } else if (participation.isParticipating && e.code === 'Space') {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
});
// Returning to a hidden-then-shown tab is a resume, not a catch-up: seek to
// the current server state and drop clock-dependent thunder (tasks 2.2/4.2).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    atmosphereStateClient.resume();
    atmosphereEvents.resync();
  }
});
window.addEventListener('blur', () => {
  keys.clear();
  clearJumpMomentum();
  activityRuntime.neutralizeInput?.();
});
// Focusing the floating media chrome neutralizes any held game action, so a
// suppressed keyup on the canvas cannot leave steering/charging/firing stuck.
document.addEventListener('focusin', (e) => {
  if (!isMediaUiEvent(e)) return;
  keys.clear();
  clearJumpMomentum();
  activityRuntime.neutralizeInput?.();
});

// --- POINTER / CLICK TO WALK + LOOK ---
// A press is a walk click unless pointer travel promotes it to a drag
// (classifyDrag). In first person the view follows mouse movement by default
// (mouse look, hover-follow, no button held); with mouse look off, a held
// drag turns the view instead. In every mode a plain press-release does what
// the old pointerdown handler did: stands a seated player up, leaves cinema
// view, and plants a walk target. A dragged press never plants one.
// (`press` is declared with the other travel-transient state above.)

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (paused || emoteWheel?.isOpen) return;
  const isMouse = e.pointerType === 'mouse';
  if (cameraMode === FP_MODE && mouseLookEnabled && isMouse && !pointerLock.locked) {
    renderer.domElement.style.cursor = 'none';
    pointerLock.requestFromGesture();
  }
  press = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, travel: 0, dragging: false };
  if (!pointerLock.locked) {
    try {
      renderer.domElement.setPointerCapture(e.pointerId);
    } catch {}
  }
});

renderer.domElement.addEventListener('pointermove', (e) => {
  // Mouse look path: every mouse move over the canvas turns the view in
  // first person, gated exactly like the gesture path. The last-position
  // bookkeeping runs even while gated so enabling it can never jump the view.
  // Hover does not exist for touch, so touch never takes this path.
  const isMouse = e.pointerType === 'mouse';
  if (isMouse) {
    const hdx = pointerLock.locked
      ? (e.movementX ?? 0)
      : (hoverLast ? e.clientX - hoverLast.x : 0);
    const hdy = pointerLock.locked
      ? (e.movementY ?? 0)
      : (hoverLast ? e.clientY - hoverLast.y : 0);
    hoverLast = { x: e.clientX, y: e.clientY };
    if (mouseLookEnabled && cameraMode === FP_MODE && !paused && !emoteWheel?.isOpen) {
      ({ yaw: fpYaw, pitch: fpPitch } = applyLookDelta(fpYaw, fpPitch, hdx, hdy));
    }
  }
  if (!press || paused) return;
  if (pointerLock.locked) {
    const mx = e.movementX ?? 0;
    const my = e.movementY ?? 0;
    press.travel = (press.travel || 0) + Math.hypot(mx, my);
    if (classifyDrag(0, 0, press.travel, 0, press.dragging)) {
      press.dragging = true;
    }
    if (press.dragging && cameraMode === FP_MODE && !mouseLookEnabled) {
      ({ yaw: fpYaw, pitch: fpPitch } = applyLookDelta(fpYaw, fpPitch, mx, my));
    }
  } else {
    const dx = e.clientX - press.lastX;
    const dy = e.clientY - press.lastY;
    press.lastX = e.clientX;
    press.lastY = e.clientY;
    press.dragging = classifyDrag(press.x, press.y, e.clientX, e.clientY, press.dragging);
    // Drag-to-look: the fallback when mouse look is off, and touch's path in
    // both modes. With mouse look on, a held mouse drag is already covered by
    // the hover path, so applying it here again would double the turn.
    if (press.dragging && cameraMode === FP_MODE && !(mouseLookEnabled && isMouse)) {
      ({ yaw: fpYaw, pitch: fpPitch } = applyLookDelta(fpYaw, fpPitch, dx, dy));
    }
  }
});

// Leaving the canvas (over HUD or out of the window) resets hover deltas so
// the next entry starts from rest instead of applying the whole gap.
renderer.domElement.addEventListener('pointerleave', () => { hoverLast = null; });

function endPress(e) {
  const started = press;
  press = null;
  if (!started || paused || started.dragging) return; // a look-drag never walks
  if (seats.current) standUp();
  else if (theaterUI.isWatching()) theaterUI.setWatchMode(false); // tap-to-walk leaves cinema view
  const ndc = (pointerLock.locked && cameraMode === FP_MODE)
    ? new THREE.Vector2(0, 0)
    : new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, activeCamera);
  if (ray.ray.intersectPlane(plane, hit)) {
    const clamped = clampClickTarget(currentBounds, hit.x, hit.z);
    target = new THREE.Vector3(clamped.x, 0, clamped.z);
    marker.position.set(target.x, 0.24, target.z);
    marker.visible = true;
  }
}

renderer.domElement.addEventListener('pointerup', endPress);
renderer.domElement.addEventListener('pointercancel', () => { press = null; });

renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (cameraMode === FP_MODE) return; // wheel zoom is an orthographic concern
  zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.015, 18, 34);
  resize();
}, { passive: false });

// --- MOVEMENT & COLLISION ---
function move(avatar, dx, dz, dt) {
  const oldX = avatar.position.x;
  const oldZ = avatar.position.z;

  if (isWalkable(currentBounds, currentWorld.obstacles, oldX + dx, oldZ)) {
    avatar.position.x += dx;
  }
  if (isWalkable(currentBounds, currentWorld.obstacles, avatar.position.x, oldZ + dz)) {
    avatar.position.z += dz;
  }

  const moving = Math.hypot(avatar.position.x - oldX, avatar.position.z - oldZ) > 0.0001;
  if (moving) {
    avatar.rotation.y = Math.atan2(dx, dz);
    avatar.position.y = Math.sin(t * 13) * 0.025;
    avatar.userData.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(t * 13 + i * Math.PI) * 0.45;
    });
  } else {
    avatar.position.y = 0;
    avatar.userData.legs.forEach(leg => { leg.rotation.x *= 0.8; });
  }

  return moving;
}

// --- RESIZE ---
function resize() {
  const aspect = innerWidth / innerHeight;
  if (activityView.held && activityView.lease?.resize) {
    activityView.lease.resize(innerWidth, innerHeight);
  }
  camera.left = (-zoom * aspect) / 2;
  camera.right = (zoom * aspect) / 2;
  camera.top = zoom / 2;
  camera.bottom = -zoom / 2;
  camera.near = 0.1;
  camera.far = 420;
  camera.updateProjectionMatrix();
  fpCamera.aspect = aspect;
  fpCamera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}
window.addEventListener('resize', resize);
resize();

// --- ANIMATION FRAME LOOP ---
const look = new THREE.Vector3(0, 0, 0);
let previousTime = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previousTime) / 1000, 0.04);
  previousTime = now;

  // Leased activity view (add-multiplayer-snowboard-arcade 6.2): the race
  // renders with its own scene+camera and updates OUTSIDE the social pause
  // gate (dialogs/chat neutralize controls, never the race). World
  // simulation, world raycasts and the theater overlay anchor stay paused;
  // net/chat/theater synchronization live outside this loop and continue.
  if (activityView.held) {
    const lease = activityView.lease;
    renderPass.scene = lease.scene;
    activeCamera = lease.camera;
    renderPass.camera = activeCamera;
    activityRuntime.update(now / 1000, dt);
    // The update above may have exited the activity (menu exit, ejection,
    // failure) and released the lease mid-frame; never present a stale lease.
    if (!activityView.held) return;
    // integrate-kart-royale-arcade D3: an activity owning a foreign
    // post-processing chain (the `postprocessing` package) presents through
    // its own composer on the shared renderer; every other lessee keeps the
    // host composer with its swapped render pass.
    if (typeof lease.present === 'function') lease.present();
    else composer.render();
    theaterUI.updateScreenQuad(null);
    return;
  }

  if (!paused) {
    t += dt;

    let moveX = 0, moveZ = 0;
    if (participation.isParticipating) {
      moveX = 0;
      moveZ = 0;
      target = null;
    } else {
      if (keys.has('KeyW') || keys.has('ArrowUp')) moveZ--;
      if (keys.has('KeyS') || keys.has('ArrowDown')) moveZ++;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) moveX--;
      if (keys.has('KeyD') || keys.has('ArrowRight')) moveX++;
    }

    // Any movement key stands a seated player up — or, when watching without
    // sitting, steps out of cinema view so the walk begins immediately.
    if (seats.current && (moveX || moveZ)) {
      standUp();
      moveX = 0;
      moveZ = 0;
    } else if (!seats.current && (moveX || moveZ) && theaterUI.isWatching()) {
      theaterUI.setWatchMode(false);
    }

    let dir = new THREE.Vector3(0, 0, 0);
    if (moveX || moveZ) {
      target = null;
      marker.visible = false;
      // Isometric modes rotate input by the camera angle; first person moves
      // relative to the view yaw (W = where you look).
      const basis = moveBasis(cameraMode, fpYaw, moveX, moveZ);
      dir.set(basis.x, 0, basis.z);
    } else if (target) {
      dir.subVectors(target, player.position);
      dir.y = 0;
      if (dir.length() < 0.15) {
        target = null;
        marker.visible = false;
        dir.set(0, 0, 0);
      }
    }

    if (dir.lengthSq() > 0 || jumpQueued) stopEmote(player);
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const baseSpeed = running ? RUN_SPEED : WALK_SPEED;
    // Vertical physics first: a landing frame with Space held relaunches the
    // hop before this frame's horizontal step, so chains never touch ground.
    if (!seats.current && !participation.isParticipating) {
      stepJump(jumpState, {
        jumpPressed: jumpQueued,
        jumpHeld: keys.has('Space'),
        moving: dir.lengthSq() > 0,
        speed: baseSpeed,
        cap: RUN_SPEED * HOP_CAP_RATIO,
      }, dt);
      jumpQueued = false;
    }
    dir.normalize().multiplyScalar(dt * moveSpeedFor(jumpState, baseSpeed));
    const moved = (seats.current || participation.isParticipating) ? false : move(player, dir.x, dir.z, dt);
    if (target && !moved) {
      target = null;
      marker.visible = false;
    }

    // While airborne the jump owns the avatar's y and the legs tuck; the
    // grounded walk bob that move() just applied stays untouched.
    if (!seats.current && !participation.isParticipating && jumpState.airborne) {
      player.position.y = jumpState.y;
      player.userData.legs.forEach(leg => { leg.rotation.x = -0.8; });
    }

    updateEmote(player, dt);
    player.userData.update?.(t, dt);

    // Footstep cadence follows run/walk; idle, seated, or airborne is silent.
    if (moved && !jumpState.airborne) {
      stepTimer -= dt;
      if (stepTimer <= 0) {
        playFootstep();
        stepTimer = running ? 0.29 : 0.42;
      }
    } else {
      stepTimer = 0;
    }

    // Transmit position to multiplayer server (sitting rides along so remote
    // players render the seated pose; airborne lets them render hops). The
    // pose flags come from the seat controller, so a stand/sit whose immediate
    // packet was throttled still lands with the next permitted send.
    net.sendMovement(player.position.x, player.position.z, player.rotation.y, moved, !!seats.current, !seats.current && jumpState.airborne);

    // Companion Kiln follower movement
    const follow = new THREE.Vector3().subVectors(player.position, kiln.position);
    follow.y = 0;
    if (follow.length() > 1.3) {
      follow.normalize().multiplyScalar(dt * 3.5);
      const oldX = kiln.position.x, oldZ = kiln.position.z;
      if (isWalkable(currentBounds, currentWorld.obstacles || [], oldX + follow.x, oldZ)) kiln.position.x += follow.x;
      if (isWalkable(currentBounds, currentWorld.obstacles || [], kiln.position.x, oldZ + follow.z)) kiln.position.z += follow.z;
      const moving = Math.hypot(kiln.position.x - oldX, kiln.position.z - oldZ) > 0.0001;
      if (moving) {
        kiln.rotation.y = Math.atan2(follow.x, follow.z);
        kiln.position.y = Math.sin(t * 12) * 0.025;
        kiln.userData.legs?.forEach((leg, i) => leg.rotation.x = Math.sin(t * 12 + i * Math.PI) * 0.45);
      } else {
        kiln.position.y = 0;
        kiln.userData.legs?.forEach(leg => leg.rotation.x *= 0.8);
      }
    } else {
      kiln.position.y = 0;
      kiln.userData.legs?.forEach(leg => leg.rotation.x *= 0.8);
    }

    // Update remote players (entity seam owns interpolation when active)
    if (rtWire?.update) rtWire.update(dt, t);
    else remotePlayers.update(dt, t);

    // Update active world with its boolean restoration completion.
    currentWorld.update?.(t, exploration.completed.includes(currentRoomId));

    // The atmosphere controller rides the existing loop (no second rAF): it
    // samples the room's semantic state at the anchored server time and
    // costs nothing while inactive or while the world is hidden.
    atmosphereController.update(dt * 1000);

    // Theater environment: resolve the room's selected world from the
    // semantic atmosphere preset (swapping geometry only when it changed),
    // then animate the active environment's water/particles/vegetation. It
    // costs nothing while another place is active.
    if (currentRoomId === ROOMS.THEATER) {
      syncTheaterEnvironment();
      atmosphereStateClient.sample(environmentSample);
      environmentSample.world = currentWorld;
      environmentSample.atmosphereActive = currentWorld?.group?.visible !== false;
      theaterEnvironments.update(t, dt, environmentSample);
    }

    // Active activities update on the same frame loop: costs zero when
    // inactive or when the place declares no activities.
    activityRuntime.update(t, dt);

    // Staged background preparation for hosted arcade games (Kart Royale,
    // Downhill Mayhem): proximity-aware CPU slices and graphics jobs only
    // while the Theater still owns presentation.
    if (!activityView.held) {
      const prepBudget = activityRuntime.getBackgroundPrepareFrameBudgetMs?.()
        ?? activityRuntime.getKartPrepareFrameBudgetMs?.() ?? 0;
      const framePressure = dt > 0.033 || (typeof document !== 'undefined' && document.hidden);
      if (prepBudget > 0) {
        activityRuntime.tickBackgroundPreparation?.({
          maxMs: prepBudget,
          viewLeaseHeld: activityView.held,
          framePressure,
        });
      }
      graphicsJobs.drain({ maxMs: prepBudget > 0 && !framePressure ? prepBudget : 2 });
    }

    // Shared lightning envelopes + environmental audio (tasks 4.2/4.1), on
    // the same loop. The flash applies ADDITIVELY on top of the controller's
    // just-written presentation (≤0.2 exposure / ≤20% sun at full peak) and
    // the next controller write restores the exact baseline; the HUD flash
    // layer is never touched.
    atmosphereEvents.update();
    const flashPulse = atmosphereEvents.getPulse();
    updateEnvironmentAudio();
    if (flashPulse.active && flashPulse.amplitude > 0) {
      renderer.toneMappingExposure += flashPulse.exposureAdd;
      sun.intensity *= 1 + flashPulse.sunAdd;
    }

    // Find nearest interactable
    nearest = null;
    let minDist = Infinity;
    for (const item of (currentWorld.items || [])) {
      const radius = item.interactionRadius || 2.4;
      const dist = Math.hypot(player.position.x - item.x, player.position.z - item.z);
      if (dist < radius && dist < minDist) {
        nearest = item;
        minDist = dist;
      }
    }

    if (participation.isParticipating) {
      $('action-title').textContent = participation.currentActivity?.title || 'Playing Activity';
      $('action-sub').textContent = 'Press E or Esc to stop playing · Safe dismount';
      $('interact').style.borderColor = '#c6b47a99';
    } else if (participation.isJoining) {
      $('action-title').textContent = 'Joining Activity...';
      $('action-sub').textContent = 'Waiting for server · Press E or Esc to cancel';
      $('interact').style.borderColor = '#c6b47a99';
    } else if (participation.isQueued) {
      $('action-title').textContent = participation.currentActivity?.title || 'Queued';
      $('action-sub').textContent = 'Waiting in queue · Press E to leave queue';
      $('interact').style.borderColor = '#c6b47a99';
    } else if (participation.isWatching) {
      $('action-title').textContent = participation.currentActivity?.title || 'Spectating';
      $('action-sub').textContent = 'Watching activity · Press E to stop';
      $('interact').style.borderColor = '#c6b47a99';
    } else if (nearest) {
      // A cabinet the server marked closed presents as coming soon, not as
      // a playable machine (the join would be rejected with an error).
      const closedInfo = nearest.type === 'activity'
        ? activityRuntime.closedActivityInfo(nearest.activityDef || nearest)
        : null;
      if (closedInfo) {
        $('action-title').textContent = closedInfo.title;
        $('action-sub').textContent = closedInfo.sub;
        $('interact').style.borderColor = '#9faa9240';
      } else {
        $('action-title').textContent = nearest.title;
        $('action-sub').textContent = nearest.sub;
        $('interact').style.borderColor = '#c6b47a99';
      }
    } else {
      const distDef = districts.find(d => d.id === currentRoomId);
      if (distDef) {
        $('action-title').textContent = distDef.name;
        $('action-sub').textContent = "Explore sector with Kiln · Press T to travel";
      } else {
        $('action-title').textContent = "Market Court";
        $('action-sub').textContent = "Explore the square or travel to the outer districts";
      }
      $('interact').style.borderColor = '#9faa9240';
    }

    refreshChallengeInvite();

    // Update Minimap
    const mapPos = projectToMinimap(currentBounds, player.position.x, player.position.z);
    $('map-player').setAttribute('cx', mapPos.cx);
    $('map-player').setAttribute('cy', mapPos.cy);
    const challengeMark = $('map-challenge');
    if (challengeMark && challengePulseUntil > 0 && performance.now() >= challengePulseUntil) {
      challengeMark.setAttribute('visibility', 'hidden');
      challengePulseUntil = 0;
    }

    particles.rotation.y = Math.sin(t * 0.03) * 0.04;
  }

  // Camera follow: isometric orbit modes vs first person at eye height
  // (lowered when seated in a theater chair).
  if (cameraMode === FP_MODE) {
    const eye = seats.current ? SEATED_EYE_HEIGHT : EYE_HEIGHT;
    fpCamera.position.set(player.position.x, player.position.y + eye, player.position.z);
    fpCamera.rotation.set(fpPitch, fpYaw, 0, 'YXZ');
  } else {
    const offsets = [[21, 25, 26], [0, 29, 31], [-23, 27, 25]];
    look.lerp(new THREE.Vector3(player.position.x * 0.14, 0.1, player.position.z * 0.14), 0.025);
    camera.position.set(look.x + offsets[cameraMode][0], offsets[cameraMode][1], look.z + offsets[cameraMode][2]);
    camera.lookAt(look);
  }
  renderPass.camera = activeCamera;

  composer.render();

  // Anchor the theater screen overlay to the in-world screen: project the
  // quad's corners with the freshly updated active camera each frame. The
  // screen's world-plane aspect rides along so the overlay's untransformed
  // rect matches the real surface — media keeps its shape on the screen
  // instead of being squashed by the projection.
  if (currentRoomId === ROOMS.THEATER && currentWorld?.screenQuad) {
    const wq = currentWorld.screenQuad;
    const pts = wq.map(v => {
      const p = v.clone().project(activeCamera);
      return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight, z: p.z };
    });
    const visible = pts.every(p => p.z > -1 && p.z < 1)
      && pts.every(p => p.x > -innerWidth && p.x < innerWidth * 2 && p.y > -innerHeight && p.y < innerHeight * 2);
    // wq is bottomLeft, bottomRight, topRight, topLeft.
    const worldAspect = visible
      ? wq[1].distanceTo(wq[0]) / Math.max(0.01, wq[3].distanceTo(wq[0]))
      : undefined;
    theaterUI.updateScreenQuad(visible ? pts.map(({ x, y }) => ({ x, y })) : null, worldAspect);
  } else {
    theaterUI.updateScreenQuad(null);
  }
}

requestAnimationFrame(frame);

// Theater TTI: overlay fade + first interactive frame, then idle Kart prefetch.
let theaterInteractiveNotified = false;
function notifyTheaterInteractive() {
  if (theaterInteractiveNotified) return;
  theaterInteractiveNotified = true;
  requestAnimationFrame(() => {
    activityRuntime.scheduleTheaterIdlePrefetches?.();
  });
}

// Remove initial loading screen
$('loading').style.opacity = '0';
notifyTheaterInteractive();
setTimeout(() => $('loading').remove(), 800);
