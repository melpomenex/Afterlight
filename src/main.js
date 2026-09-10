import { createEmoteWheel } from './ui/emoteWheel.js';
import { EMOTES, isEmote } from '../shared/emotes.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import './style.css';
import { NetworkClient } from './net/client.js';
import { createGardenerAvatar, createKilnCompanion, RemotePlayersManager, startEmote, stopEmote, updateEmote } from './render/avatars.js';
import { buildMarketWorld } from './world/marketWorld.js';
import { buildGardenWorld } from './world/gardenWorld.js';
import { districts, buildDistrict, readExploration } from './districts.js';
import { getPlaceActivities, getPlaceDefinition } from '../shared/placeDefinitions.js';
import { gateItemsFor } from './places/worldFactory.js';
import { getBoundsForRoom, isWalkable, clampClickTarget, projectToMinimap } from './world/bounds.js';
import { UIManager } from './ui/marketModal.js';
import { ChatPanel } from './ui/chatPanel.js';
import { CallClient } from './net/calls.js';
import { CallPanel } from './ui/callPanel.js';
import { TheaterScreenUI } from './ui/theaterScreen.js';
import { createPlaceSelector } from './ui/placeSelector.js';
import { createLeaderboardDialog } from './ui/leaderboard.js';
import { initChallenges } from './ui/challenges.js';
import { initNearbyActivities } from './ui/nearbyActivities.js';
import { initTournamentBoard } from './ui/tournamentBoard.js';
import { recordRun as recordLocalBest, applyRecordingStatus } from './activities/localBests.js';
import { ARCADE_GAMES } from '../shared/leaderboardModel.js';
import { MSG_TYPES, ROOMS } from '../shared/protocol.js';
import { CROPS, CROP_LIST, GROWTH_STAGES } from '../shared/crops.js';
import { MILL_REQUIREMENT } from '../shared/materials.js';
import { FP_MODE, nextCameraMode, clampPitch, moveBasis, classifyDrag } from './cameraControl.js';
import { createJumpState, resetJump, stepJump, moveSpeedFor, HOP_CAP_RATIO } from './jump.js';
import { createPlaceRuntime } from './places/runtime.js';
import { resolveRoomRequest, worldUpdateInput } from './places/travelState.js';
import { createTheaterAdapter, registerTheaterAdapter } from './places/theaterAdapter.js';
import { createActivityRuntime } from './activities/runtime.js';
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
import {
  hudPolicy,
  toolForDigit,
  nextToolState,
  applyHudPolicyToDom,
  readLegacyUiPreference,
  writeLegacyUiPreference,
} from './ui/placeHudPolicy.js';
import { createCameraSeam } from './activities/cameraSeam.js';
import { resolveEscapeAction, isTypingTarget, ESCAPE_TARGETS } from './activities/inputSeam.js';

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
const LOOK_SENS_YAW = 0.005;
const LOOK_SENS_PITCH = 0.004;
const fpCamera = new THREE.PerspectiveCamera(58, 1, 0.1, 150);
const cameraSeam = createCameraSeam({ initialMode: 0 });
let activeCamera = camera;
let cameraMode = 0;
let fpYaw = 0;
let fpPitch = 0;
let zoom = 24;

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
  },
});
let leasedRendererState = null;
let leasedBloomEnabled = null;
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
const remotePlayers = new RemotePlayersManager(scene);

// Room atmosphere state client (task 2.2): ONE instance on the shared
// connection, routed only to the current place generation. It holds the
// semantic snapshot/server-clock facts; the presentation controller that
// consumes them arrives with the renderer work (3.x/4.x).
const atmosphereStateClient = createAtmosphereStateClient({ net });

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
});

// --- LOCAL AUDIO, SHARED EVENTS AND COMFORT (tasks 4.1–4.3) ---
// ONE AudioContext for the whole game, created lazily on the existing Sound
// gesture; environment ambience/weather loops are synthesized and retained
// (no external assets), footsteps/chimes feed the shared effects bus, and
// the Theater keeps its provider volume through the setMixGain seam.
const audioMixer = createAudioMixer({});
const environmentAudio = createEnvironmentAudio({ mixer: audioMixer });

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

let activeTool = 'hands'; // 'hands' | 'hoe' | 'seed' | 'water' | 'harvest'
let activeSeedIndex = 0;
const seedKeys = CROP_LIST.map(c => c.id);

const ui = new UIManager(net, {
  onSelectTool: (tool, seedCropId) => {
    setTool(tool);
    if (seedCropId) {
      activeSeedIndex = seedKeys.indexOf(seedCropId);
      $('active-seed-label').textContent = CROPS[seedCropId]?.name || seedCropId;
    }
  },
  // Closing the legacy exchange/satchel hands the keyboard back with nothing
  // held — same hygiene as the Places selector and settings.
  onLegacyDialogClosed: () => {
    keys.clear();
    clearJumpMomentum();
  },
});

// Town chat: panel + input. While the input holds focus the game must not
// react to typing, so focus changes clear any held movement keys.
const chatPanel = new ChatPanel(net, {
  onFocusChange: (typing) => {
    if (typing) {
      keys.clear();
      clearJumpMomentum();
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

// Conferencing: opt-in audio/video/screen call panel (P8)
const callClient = new CallClient(net);
const callPanel = new CallPanel(callClient, {
  onFocusChange: (focusing) => {
    if (focusing) {
      keys.clear();
      clearJumpMomentum();
    }
  },
  onDuckingChange: (duckingRatio) => {
    const gain = callClient.status === 'connected' ? Math.max(0, 1.0 - duckingRatio) : 1.0;
    theaterUI.setMixGain(gain);
  },
});

// Local player avatar & Kiln companion
const player = createGardenerAvatar(net.guestId, net.nickname);
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
const gardenWorld = buildGardenWorld();
scene.add(marketWorld.group);
scene.add(gardenWorld.group);
// Worlds stay dark until travel activates them: the first committed
// destination shows itself and every other group remains hidden.
marketWorld.group.visible = false;
gardenWorld.group.visible = false;

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
  for (const gx of [-10.7, 10.7]) {
    const arch = new THREE.Mesh(gateGeo, archMat); arch.position.set(gx, 2.5, 0); arch.scale.set(0.6, 5, 2.4); world.group.add(arch);
    const portal = new THREE.Mesh(gateGeo, gateMat); portal.position.set(gx, 1.8, 0); portal.scale.set(0.1, 3.4, 1.8); world.group.add(portal);
  }
  const southArch = new THREE.Mesh(gateGeo, archMat); southArch.position.set(0, 2.5, 8.8); southArch.scale.set(2.4, 5, 0.6); world.group.add(southArch);
  const southPortal = new THREE.Mesh(gateGeo, gateMat); southPortal.position.set(0, 1.8, 8.8); southPortal.scale.set(1.8, 3.4, 0.1); world.group.add(southPortal);

  world.ownedResources.geometries.push(gateGeo);
  world.ownedResources.materials.push(gateMat, archMat);
  }

  // A freshly built world stays hidden until travel activates it; only the
  // destination room's group is shown.
  world.group.visible = distId === currentRoomId;
  scene.add(world.group);
  districtWorlds.set(distId, world);
  // Apply any gather-node state already received for this district.
  if (nodeStatesByDistrict.has(distId)) {
    world.setNodeStates?.(nodeStatesByDistrict.get(distId));
  }
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
let currentGardenBeds = null;
// The active place's validated spawns; a seat dismount falls back to them
// when every authored escape point is blocked.
let activeSpawns = { spawn: [0, 3], companionSpawn: [0.8, 4] };

// Gathering & crafting state mirrored from the server; the client only
// renders what the server reports and never grants items locally.
const nodeStatesByDistrict = new Map(); // districtId -> NODE_STATE node array
let machineState = {
  mill: {
    status: 'broken',
    required: { ...MILL_REQUIREMENT },
    contributed: { copper: 0, timber: 0, glass: 0 },
    restoredAt: null,
  },
};

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

// Place activities runtime (Phase 1, place activities program):
// Coordinates activity lifecycles in the active place without adding a second rAF.
const activityRuntime = createActivityRuntime({
  net,
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
});
const participation = activityRuntime.participation;

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
    // Dev/test teleport (behind ?debug=1 only): places the avatar and
    // broadcasts one movement frame so server-side proximity checks see the
    // new pose. Used by automated browser gates; never a player feature.
    netState: () => ({
      mode: net.transportMode,
      supports: net.supportsActivities,
      open: net.transport?.isOpen?.() ?? null,
    }),
    tp: (x, z) => {
      player.position.set(Number(x) || 0, 0, Number(z) || 0);
      target = null;
      marker.visible = false;
      clearJumpMomentum();
      net.sendMovement(player.position.x, player.position.z, player.rotation.y, false, false);
      return [player.position.x, player.position.z];
    },
    project: (x, z) => {
      const v = new THREE.Vector3(x, 0, z).project(activeCamera);
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

// --- PLACE CONTEXT HUD POLICY (deemphasize-legacy-farming F1) ---
// Social places lead with place identity, people, chat, emotes and travel;
// farming tools and coin progression step back but never disappear (I, M and
// the Legacy areas remain). The policy derives only on successful place
// activation — never from an inventory or network message — so async data
// cannot reopen what a place hides. The saved preference rolls the whole
// presentation back to the legacy HUD without touching any data.
let activeHudPolicy = null;      // policy of the active place (hudPolicy shape)
let rememberedLegacyTool = null; // held visual tool set aside on entering a social place
let legacyUiHud = readLegacyUiPreference();

const hudElements = {
  contextRoot: document.body,
  toolBelt: $('tool-belt'),
  toolHint: $('hud-tool-hint'),
  economyStats: document.querySelector('.player-stats-row'),
  legacyButtons: [$('btn-inventory'), $('btn-market')],
};

function applyPlaceHud(res) {
  activeHudPolicy = hudPolicy(res?.def ?? null, res?.roomId ?? null, { legacyUi: legacyUiHud });
  applyHudPolicyToDom(activeHudPolicy, hudElements);
  // Clearing to hands on entering a social place is presentation only: the
  // choice is remembered and restored when the personal garden is re-entered,
  // and inventory data is never read or written by either move.
  const toolState = nextToolState({
    policy: activeHudPolicy,
    currentTool: activeTool,
    rememberedTool: rememberedLegacyTool,
  });
  rememberedLegacyTool = toolState.rememberedTool;
  if (toolState.tool !== activeTool) setTool(toolState.tool);
}

// The market modal re-asserts section visibility from this same policy, so a
// welcome or inventory snapshot refreshes cached values without ever
// revealing the panels the active place hides.
ui.hudPolicyProvider = () => activeHudPolicy;

function presentDestination(res) {
  // The runtime's active place is the game's active room from here on.
  currentRoomId = res.roomId;
  if (res.kind === 'place' && res.def) {
    // Dynamic lighting & background
    scene.fog.color.set(res.def.color);
    scene.background.set(res.def.color).multiplyScalar(0.45);
    sun.color.set(res.def.sun);

    // HUD headers + the canvas accessible name travel with the place.
    $('location-title').textContent = res.def.name;
    $('district-tag').textContent = res.def.district;
    $('map-label').textContent = '• ' + res.def.subtitle;
    $('map-path').setAttribute('d', mapPaths[res.roomId] || mapPaths.court);
    $('world').setAttribute('aria-label', `${res.def.name} — ${res.def.description}`);
    toast(res.def.name, res.def.description, 'ARRIVED IN DISTRICT');
  } else if (res.kind === 'garden') {
    scene.fog.color.set('#54645d');
    scene.background.set('#222d2a');
    sun.color.set('#ffe0a5');

    $('location-title').textContent = "Your Market Garden";
    $('district-tag').textContent = "CULTIVATION DISTRICT / 02";
    $('map-label').textContent = "• MARKET GARDEN 02";
    $('map-path').setAttribute('d', mapPaths.garden);
    $('world').setAttribute('aria-label', 'Your Market Garden — tend your garden beds and harvest fresh crops');
    toast("Your Garden Plot", "Tend your garden beds and harvest fresh crops.");
  } else {
    scene.fog.color.set('#54645d');
    scene.background.set('#222d2a');
    sun.color.set('#ffe0a5');

    $('location-title').textContent = "The Market Court";
    $('district-tag').textContent = "MARKET SOCIAL DISTRICT / 01";
    $('map-label').textContent = "• MARKET COURT 01";
    $('map-path').setAttribute('d', mapPaths.market);
    $('world').setAttribute('aria-label', 'The Market Court — trade produce, buy seeds, and fulfill town contracts');
    toast("The Market Court", "Trade produce, buy seeds, and fulfill contracts.");
  }

  // The contextual HUD follows the place, on every successful activation.
  applyPlaceHud(res);
}

// Exploration save follows the legacy contract: only registered places are
// visited/current; market and the personal garden stay out of the save.
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
    if (res.kind === 'garden') return gardenWorld;
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
        activityRuntime.deactivate();
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
  gardenRoom: () => ROOMS.gardenFor(net.guestId),
  seatControl: seats,
  readFieldNote: (item) => toast(item.sub, item.body, 'FIELD NOTE'),
  openScreen: () => theaterAdapter.openScreen(),
  activityControl: participation,
});

function setRoom(roomId) {
  placeRuntime.travel(roomId);
}

// New gardeners wake up in The Orpheum, in cinema view — the shared screen
// is the city's living room. ?room=<id> (e.g. ?room=market, ?room=garden)
// overrides for deep links.
const initialRoomParam = new URLSearchParams(window.location.search).get('room');
let initialRoom = ROOMS.THEATER;
if (initialRoomParam === 'garden') initialRoom = ROOMS.gardenFor(net.guestId);
else if (initialRoomParam) initialRoom = initialRoomParam;
setRoom(initialRoom);

// --- NETWORK PACKET HANDLERS ---
net.on(MSG_TYPES.WELCOME, (msg) => {
  // Server acceptance evidence for the active room: shared actions resume.
  placeRuntime.markNetworkOnline();
  if (msg.player) {
    ui.updatePlayerHUD(msg.player);
    player.userData.updateNickname(msg.player.nickname);
  }
  if (msg.weather) updateWeatherDisplay(msg.weather);
  if (msg.prices) ui.updateMarketView(msg.prices);
  if (msg.orderBook) ui.updateMarketView(null, msg.orderBook);
  if (msg.contracts) ui.updateContractsView(msg.contracts);
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
    // Social places greet visitors; legacy contexts greet gardeners.
    toast(activeHudPolicy?.copy.visitorArrival ?? 'Gardener Arrived', `${msg.player.nickname} entered the area.`);
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

net.on(MSG_TYPES.GARDEN_STATE, (msg) => {
  currentGardenBeds = msg.beds;
  gardenWorld.setFixtures?.(msg.fixtures || []);
  gardenWorld.update(0, msg.beds);
});

net.on(MSG_TYPES.INVENTORY_STATE, (msg) => {
  if (msg.player) {
    ui.updatePlayerHUD(msg.player);
    ui.updateInventoryView(msg.player);
    ui.updateMarketView();
    // Keep the machine shop dialog (contribution buttons, sprinkler craft)
    // in step with the server-owned inventory.
    ui.updateMachineShopView();
  }
});

net.on(MSG_TYPES.MARKET_UPDATE, (msg) => {
  if (msg.prices) ui.updateMarketView(msg.prices);
  if (msg.orderBook) ui.updateMarketView(null, msg.orderBook);
});

net.on(MSG_TYPES.CONTRACT_UPDATE, (msg) => {
  if (msg.contracts) ui.updateContractsView(msg.contracts);
});

net.on(MSG_TYPES.NODE_STATE, (msg) => {
  if (!msg.roomId || !Array.isArray(msg.nodes)) return;
  nodeStatesByDistrict.set(msg.roomId, msg.nodes);
  districtWorlds.get(msg.roomId)?.setNodeStates?.(msg.nodes);
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

net.on(MSG_TYPES.MACHINE_UPDATE, (msg) => {
  if (!msg.machines?.mill) return;
  const previousStatus = machineState?.mill?.status;
  machineState = msg.machines;
  ui.updateMachineShopView(machineState);
  marketWorld.setMachineState?.(machineState);
  updateMillPanel();
  // Celebrate the community restoration with everyone present in the court.
  if (previousStatus === 'broken' && machineState.mill.status === 'restored') {
    chime([523, 659, 784, 1046]);
    toast('The Great Mill Restored', 'The sails turn above the court. Wheat becomes flour for everyone.', 'RESTORATION COMPLETE');
  }
});

net.on(MSG_TYPES.TRADE_FILLED, (msg) => {
  const t = msg.trade;
  chime([523, 659, 784]);
  toast("Order Filled!", `Traded ${t.quantity}x ${t.cropId} @ ${t.price} ⛁`);
});

net.on(MSG_TYPES.WEATHER_UPDATE, (msg) => {
  updateWeatherDisplay(msg.weather);
});

net.on(MSG_TYPES.ACTION_RESULT, (msg) => {
  if (msg.success) {
    chime([440, 554]);
    toast(msg.title || 'Garden', msg.message);
  } else if (msg.message) {
    toast(msg.title || 'Notice', msg.message);
  }
});

// --- MILL PROGRESS PANEL (persistent HUD, market court only) ---
let millPanelRoom = null;
function updateMillPanel() {
  const panel = $('mill-panel');
  if (!panel) return;
  const inCourt = currentRoomId === ROOMS.MARKET;
  panel.style.display = inCourt ? 'block' : 'none';
  millPanelRoom = currentRoomId;
  if (!inCourt) return;

  const mill = machineState?.mill;
  const statusTag = $('mill-status-tag');
  const lines = $('mill-progress-lines');
  if (!mill) return;

  if (mill.status === 'restored') {
    statusTag.textContent = 'RESTORED';
    statusTag.className = 'mill-tag restored';
    lines.innerHTML = '<div class="mill-line">✦ The sails are turning. It grinds wheat into flour for everyone.</div>';
    return;
  }

  statusTag.textContent = 'BROKEN';
  statusTag.className = 'mill-tag broken';
  let totalDone = 0, totalNeed = 0;
  let html = '';
  for (const [materialId, need] of Object.entries(mill.required || {})) {
    const done = Math.min(mill.contributed?.[materialId] || 0, need);
    totalDone += done;
    totalNeed += need;
    html += `<div class="mill-line"><span>${materialId}</span><b>${done}/${need}</b></div>`;
  }
  html = `<div class="mill-line mill-total"><span>restoration</span><b>${totalDone}/${totalNeed}</b></div>` + html;
  lines.innerHTML = html;
}

net.on(MSG_TYPES.EMOTE_BROADCAST, (msg) => {
  if (msg.playerId === net.guestId || !isEmote(msg.emote)) return;
  startEmote(remotePlayers.players.get(msg.playerId)?.avatar, msg.emote);
});

// Town chat packets; the ChatPanel registered its own handlers at setup and
// flips to online again on WELCOME (e.g. after a reconnect).
net.on(MSG_TYPES.WELCOME, () => chatPanel.setConnected(true));

function updateWeatherDisplay(weather) {
  // Legacy agricultural weather (World.Weather via weather_update/WELCOME)
  // keeps feeding the HUD cache on legacy rooms, but it must never override
  // an active place atmosphere's fog or caption (add-atmosphere-weather-system
  // D1). No garden simulation is changed — only this presentation write.
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

// Legacy gardener HUD: the reversible rollback for the contextual policy.
// Flipping it re-applies the policy for the current place and persists the
// preference; a storage failure simply keeps the choice for this session.
$('legacy-hud').checked = legacyUiHud;
$('legacy-hud').onchange = () => {
  legacyUiHud = $('legacy-hud').checked;
  writeLegacyUiPreference(legacyUiHud);
  applyPlaceHud(placeRuntime.snapshot().resolution);
};

// --- TOOL SELECTION ---
function setTool(toolName) {
  activeTool = toolName;
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === toolName);
  });
  player.userData.setWateringCan(toolName === 'water');
  const toolHints = {
    hands: 'Tool: Hands & Inspect · Read crop stats',
    hoe: 'Tool: Hoe · Till uncultivated beds',
    seed: `Tool: Seeds (${CROPS[seedKeys[activeSeedIndex]].name}) · Plant in tilled beds`,
    water: 'Tool: Watering Can · Replenish soil moisture',
    harvest: 'Tool: Harvest Shears · Collect mature produce',
    sprinkler: 'Tool: Sprinkler Kit · Press E on a bed to place (waters it + neighbors)',
  };
  $('hud-tool-hint').textContent = toolHints[toolName] || toolName;
}

document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.onclick = () => {
    const t = btn.dataset.tool;
    if (t === 'seed' && activeTool === 'seed') {
      // Cycle active seed
      activeSeedIndex = (activeSeedIndex + 1) % seedKeys.length;
      $('active-seed-label').textContent = CROPS[seedKeys[activeSeedIndex]].name;
    }
    setTool(t);
  };
});

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

  // Summit Run loads BEFORE joining (6.1): activities declaring
  // beginParticipation take the E press; other games fall through to the
  // generic immediate join below.
  if (nearest?.type === 'activity') {
    const actId = nearest.activityId ?? nearest.id;
    if (actId === 'orpheum-kart-royale') {
      startKartAttempt({ generation: activityRuntime.activeGeneration ?? 0, attemptId: Date.now(), route: 'cold' });
      startKartSpan('interaction');
    }
    if (activityRuntime.beginParticipationFor(nearest)) {
      if (actId === 'orpheum-kart-royale') {
        endKartSpan('interaction');
      }
      return;
    }
  }

  if (!nearest) {
    toast("No Target Nearby", activeHudPolicy?.copy.noTargetHint
      ?? "Approach a garden bed, market stall, or gateway to interact.");
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

  // Market stalls
  if (nearest.type === 'market_board') {
    ui.openMarket();
    return;
  }
  if (nearest.type === 'seed_vendor') {
    ui.openSeedVendor();
    return;
  }
  if (nearest.type === 'contracts_board') {
    ui.openContracts();
    return;
  }

  // Material gather nodes (server-validated harvest; the client never grants)
  if (nearest.type === 'material_node') {
    net.send(MSG_TYPES.NODE_HARVEST, {
      actionId: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nodeId: nearest.nodeId,
    });
    return;
  }

  // The Great Mill: restored mills grind wheat on E; broken mills open the
  // machine shop so nearby materials can be contributed.
  if (nearest.type === 'mill') {
    if (machineState?.mill?.status === 'restored') {
      net.send(MSG_TYPES.MACHINE_MILL, {
        actionId: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        quantity: 1,
      });
    } else {
      ui.openMachineShop();
    }
    return;
  }

  // Machine shop workbench: contributions & sprinkler crafting
  if (nearest.type === 'machine_bench') {
    ui.openMachineShop();
    return;
  }

  // Garden Bed Interaction
  if (nearest.type === 'bed') {
    const bedIndex = nearest.bedIndex;
    const bed = currentGardenBeds ? currentGardenBeds[bedIndex] : null;

    if (activeTool === 'hoe') {
      net.sendGardenAction('till', bedIndex);
      return;
    }
    if (activeTool === 'seed') {
      const cropId = seedKeys[activeSeedIndex];
      net.sendGardenAction('plant', bedIndex, cropId);
      return;
    }
    if (activeTool === 'water') {
      net.sendGardenAction('water', bedIndex);
      return;
    }
    if (activeTool === 'harvest') {
      net.sendGardenAction('harvest', bedIndex);
      return;
    }
    if (activeTool === 'sprinkler') {
      net.sendGardenAction('place_sprinkler', bedIndex);
      return;
    }

    // Inspect tool (hands)
    if (!bed || bed.stage === GROWTH_STAGES.EMPTY) {
      toast(`Bed #${bedIndex + 1}`, "Unprepared soil. Select your Hoe (2) to till.");
    } else if (bed.stage === GROWTH_STAGES.PREPARED) {
      toast(`Bed #${bedIndex + 1}`, "Prepared soil. Select Seeds (3) to sow.");
    } else {
      const crop = CROPS[bed.cropId];
      const stageNames = ['Empty', 'Prepared', 'Seed', 'Sprout', 'Juvenile', 'Mature', 'Harvestable'];
      toast(
        `${crop?.name || 'Crop'} (Bed #${bedIndex + 1})`,
        `Stage: ${stageNames[bed.stage] || 'Growing'} · Moisture: ${Math.round((bed.moisture || 0) * 100)}% · Health: ${Math.round((bed.health || 1) * 100)}%`
      );
    }
  }
}

$('interact').onclick = interact;
$('btn-inventory').onclick = () => ui.openInventory();
$('btn-market').onclick = () => ui.openMarket();

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
  const gardenRoom = ROOMS.gardenFor(net.guestId);
  entries.push(
    {
      roomId: ROOMS.MARKET,
      featured: false,
      micro: 'MARKET SOCIAL DISTRICT / 01',
      name: 'The Market Court',
      description: 'Exchange harvests, buy seeds, and fulfill town contracts.',
      badgeClass: currentRoomId === ROOMS.MARKET ? 'current' : 'visited',
      badgeText: currentRoomId === ROOMS.MARKET ? 'CURRENT' : 'CIVIC HUB',
      current: currentRoomId === ROOMS.MARKET,
    },
    {
      roomId: gardenRoom,
      featured: false,
      micro: 'CULTIVATION PLOT',
      name: 'Your Market Garden',
      description: 'Till soil, sow crops, water, and harvest fresh produce.',
      badgeClass: currentRoomId === gardenRoom ? 'current' : 'visited',
      badgeText: currentRoomId === gardenRoom ? 'CURRENT' : 'PERSONAL PLOT',
      current: currentRoomId === gardenRoom,
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
  onOpen: () => {
    paused = true;
    keys.clear();
    clearJumpMomentum();
  },
  onClose: () => {
    paused = false;
    // Closing hands the keyboard back to the game with nothing held: keys
    // pressed while the modal was up must not walk the gardener.
    keys.clear();
    clearJumpMomentum();
  },
});

function openDistricts() {
  placeSelector.open();
}

$('btn-travel').onclick = openDistricts;

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
  },
  onClose: () => {
    paused = false;
    keys.clear();
    clearJumpMomentum();
  },
});
$('btn-records').onclick = () => leaderboardDialog.open();

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
  },
  onChoose: id => {
    startEmote(player, id);
    net.sendEmote(id);
    toast(EMOTES.find(e => e.id === id).label, 'Move to finish your emote.', 'EMOTE');
  },
});
$('btn-emote').onclick = () => emoteWheel.open();
$('btn-edit-nick').onclick = () => ui.openProfile();

// Settings & Pause
function toggleSettings() {
  paused = !paused;
  keys.clear();
  clearJumpMomentum();
  if (paused) $('settings-dialog').showModal();
  else {
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
  renderer.domElement.style.cursor = cameraMode === FP_MODE ? 'grab' : '';
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

// --- KEYBOARD CONTROLS ---
window.addEventListener('keydown', (e) => {
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

  if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(e.code)) {
    // Tool digits only exist in legacy contexts; in social places the numbers
    // stay with the emote wheel, which consumes them in the capture phase.
    const tool = toolForDigit(e.code, {
      enabled: activeHudPolicy ? activeHudPolicy.shortcuts.toolDigits : true,
      emoteWheelOpen: !!emoteWheel?.isOpen,
    });
    if (tool) setTool(tool);
    return;
  }

  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  keys.add(e.code);

  if (e.repeat) return;
  if (e.code === 'Space' && !paused && !seats.current && !participation.isParticipating) jumpQueued = true; // consumed by the frame loop
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyI') ui.openInventory();
  if (e.code === 'KeyM') ui.openMarket();
  // In The Orpheum, G opens the projection booth (screen controls, IPTV, guide).
  // preventDefault keeps the g from typing into the dialog's freshly focused URL input.
  if (e.code === 'KeyG' && currentRoomId === ROOMS.THEATER && !document.querySelector('dialog[open]')) {
    e.preventDefault();
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

// --- POINTER / CLICK TO WALK + DRAG TO LOOK ---
// A press is a walk click unless pointer travel promotes it to a drag
// (classifyDrag). In first person a drag turns the view instead; in every
// mode a plain press-release does what the old pointerdown handler did:
// stands a seated player up, leaves cinema view, and plants a walk target.
// (`press` is declared with the other travel-transient state above.)

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (paused || emoteWheel?.isOpen) return;
  press = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, dragging: false };
  renderer.domElement.setPointerCapture(e.pointerId);
});

renderer.domElement.addEventListener('pointermove', (e) => {
  if (!press || paused) return;
  const dx = e.clientX - press.lastX;
  const dy = e.clientY - press.lastY;
  press.lastX = e.clientX;
  press.lastY = e.clientY;
  press.dragging = classifyDrag(press.x, press.y, e.clientX, e.clientY, press.dragging);
  if (press.dragging && cameraMode === FP_MODE) {
    // Drag right looks right, drag up looks up (direct, non-inverted).
    fpYaw -= dx * LOOK_SENS_YAW;
    fpPitch = clampPitch(fpPitch - dy * LOOK_SENS_PITCH);
  }
});

function endPress(e) {
  const started = press;
  press = null;
  if (!started || paused || started.dragging) return; // a look-drag never walks
  if (seats.current) standUp();
  else if (theaterUI.isWatching()) theaterUI.setWatchMode(false); // tap-to-walk leaves cinema view
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), activeCamera);
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
  camera.far = 150;
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

    // Update active world with typed inputs: a personal garden room receives
    // its bed snapshot, and every other world receives only its boolean
    // completion — a stale garden snapshot can never masquerade as district
    // restoration state.
    const worldInput = worldUpdateInput({
      isGardenRoom: ROOMS.isGarden(currentRoomId),
      gardenBeds: currentGardenBeds,
      completed: exploration.completed.includes(currentRoomId),
    });
    currentWorld.update?.(t, worldInput.value);

    // The atmosphere controller rides the existing loop (no second rAF): it
    // samples the room's semantic state at the anchored server time and
    // costs nothing while inactive or while the world is hidden.
    atmosphereController.update(dt * 1000);

    // Active activities update on the same frame loop: costs zero when
    // inactive or when the place declares no activities.
    activityRuntime.update(t, dt);

    // Background Kart preparation (D3/D4): proximity-aware CPU slices and
    // graphics jobs only while the Theater still owns presentation.
    if (!activityView.held) {
      const kartBudget = activityRuntime.getKartPrepareFrameBudgetMs?.() ?? 0;
      const framePressure = dt > 0.033 || (typeof document !== 'undefined' && document.hidden);
      if (kartBudget > 0) {
        activityRuntime.tickBackgroundPreparation?.({
          maxMs: kartBudget,
          viewLeaseHeld: activityView.held,
          framePressure,
        });
      }
      graphicsJobs.drain({ maxMs: kartBudget > 0 && !framePressure ? kartBudget : 2 });
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
      $('action-title').textContent = nearest.title;
      $('action-sub').textContent = nearest.sub;
      $('interact').style.borderColor = '#c6b47a99';
    } else {
      const distDef = districts.find(d => d.id === currentRoomId);
      if (distDef) {
        $('action-title').textContent = distDef.name;
        $('action-sub').textContent = activeHudPolicy?.copy.idleActionHint
          ?? "Explore sector with Kiln · Press T to travel";
      } else {
        $('action-title').textContent = currentRoomId === ROOMS.MARKET ? "Market Court" : "Your Market Garden";
        $('action-sub').textContent = currentRoomId === ROOMS.MARKET ? "Explore stalls or travel to outer districts" : "Approach beds to till, plant, water, and harvest";
      }
      $('interact').style.borderColor = '#9faa9240';
    }

    // Sprinkler coverage preview while aiming at a bed with tool 6
    currentWorld.previewCoverage?.(
      activeTool === 'sprinkler' && nearest?.type === 'bed' ? nearest.bedIndex : null
    );

    // Refresh the mill panel when the room changed (machine updates refresh it directly)
    if (currentRoomId !== millPanelRoom) {
      updateMillPanel();
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
