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
import { getBoundsForRoom, isWalkable, clampClickTarget, projectToMinimap } from './world/bounds.js';
import { UIManager } from './ui/marketModal.js';
import { ChatPanel } from './ui/chatPanel.js';
import { TheaterScreenUI } from './ui/theaterScreen.js';
import { MSG_TYPES, ROOMS } from '../shared/protocol.js';
import { CROPS, CROP_LIST, GROWTH_STAGES } from '../shared/crops.js';
import { MILL_REQUIREMENT } from '../shared/materials.js';
import { FP_MODE, nextCameraMode, clampPitch, moveBasis, classifyDrag } from './cameraControl.js';
import { createJumpState, resetJump, stepJump, moveSpeedFor, HOP_CAP_RATIO } from './jump.js';

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
let activeCamera = camera;
let cameraMode = 0;
let fpYaw = 0;
let fpPitch = 0;
let zoom = 24;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.65, 1.05);
composer.addPass(bloom);

// Lights
scene.add(new THREE.HemisphereLight('#c5d9d4', '#343a2b', 2.2));
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

const districtWorlds = new Map();

// Detailed SVG minimap schematics for every room/district
const mapPaths = {
  market: 'M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24',
  garden: 'M24 24H130V96H24Z M38 36H116V84H38Z M65 24V96',
  court: 'M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24',
  canal: 'M24 24H130V96H24Z M24 60H130 M70 24V96 M84 24V96',
  station: 'M24 24H130V96H24Z M24 40H130 M24 75H130 M65 40V75',
  aqueduct: 'M24 24H130V96H24Z M24 35H130 M45 24V96 M80 24V96 M105 24V96',
  caldera: 'M24 24H130V96H24Z M50 35H100V80H50Z M75 35V80 M24 60H50 M100 60H130',
  understory: 'M24 24H130V96H24Z M35 40H65V75H35Z M90 40H120V75H90Z M65 60H90',
  saltworks: 'M24 24H130V96H24Z M35 30H115V55H35Z M35 65H115V90H35Z M75 24V96',
  rooftops: 'M24 24H130V96H24Z M40 45H110 M75 24V96 M40 30L75 60L110 30 M40 90L75 60L110 90',
  mangrove: 'M24 24H130V96H24Z M24 50Q75 20 130 50 M24 70Q75 100 130 70 M75 35V85',
  trestle: 'M24 24H130V96H24Z M24 35H130 M24 85H130 M35 35L55 85 M55 35L75 85 M75 35L95 85 M95 35L115 85',
  foundry: 'M24 24H130V96H24Z M40 35H70V65H40Z M85 35H115V65H85Z M24 75H130',
  'frost-spire': 'M24 24H130V96H24Z M75 25L115 60L75 95L35 60Z M75 25V95 M35 60H115',
  delta: 'M24 24H130V96H24Z M24 45C55 40 85 75 130 55 M24 75C60 70 90 90 130 85 M70 24V96',
  archives: 'M24 24H130V96H24Z M35 35H115 M35 50H115 M35 65H115 M35 80H115 M75 24V96',
  'kiln-terrace': 'M24 24H130V96H24Z M45 35H105V85H45Z M75 45A15 15 0 1 0 75 75A15 15 0 1 0 75 45 M24 60H45 M105 60H130',
  theater: 'M24 24H130V96H24Z M42 34H112 M42 38H112 M34 52H62 M70 52H120 M34 68H62 M70 68H120 M34 84H120',
};

function getOrCreateDistrictWorld(distId) {
  if (districtWorlds.has(distId)) return districtWorlds.get(distId);
  const def = districts.find(d => d.id === distId);
  if (!def) return null;
  const isDone = exploration.completed.includes(distId);
  const world = buildDistrict(def, isDone);

  const index = districts.findIndex(d => d.id === distId);
  const prevDist = districts[(index - 1 + districts.length) % districts.length];
  const nextDist = districts[(index + 1) % districts.length];

  world.items.push({
    type: 'district_gate',
    x: -10.7,
    z: 0,
    targetDistrict: prevDist.id,
    title: `Gate to ${prevDist.name}`,
    sub: `Westbound: ${prevDist.district}`,
  });
  world.items.push({
    type: 'district_gate',
    x: 10.7,
    z: 0,
    targetDistrict: nextDist.id,
    title: `Gate to ${nextDist.name}`,
    sub: `Eastbound: ${nextDist.district}`,
  });
  world.items.push({
    type: 'market_gate',
    x: 0,
    z: 8.8,
    targetDistrict: 'market',
    title: 'Return to Market Court',
    sub: 'Trade produce & visit your garden',
  });

  const gateGeo = new THREE.BoxGeometry(1, 1, 1);
  const gateMat = new THREE.MeshStandardMaterial({ color: '#c5b478', emissive: '#857545', emissiveIntensity: 0.6 });
  const archMat = new THREE.MeshStandardMaterial({ color: '#2b3d3e', roughness: 0.6 });
  for (const gx of [-10.7, 10.7]) {
    const arch = new THREE.Mesh(gateGeo, archMat); arch.position.set(gx, 2.5, 0); arch.scale.set(0.6, 5, 2.4); world.group.add(arch);
    const portal = new THREE.Mesh(gateGeo, gateMat); portal.position.set(gx, 1.8, 0); portal.scale.set(0.1, 3.4, 1.8); world.group.add(portal);
  }
  const southArch = new THREE.Mesh(gateGeo, archMat); southArch.position.set(0, 2.5, 8.8); southArch.scale.set(2.4, 5, 0.6); world.group.add(southArch);
  const southPortal = new THREE.Mesh(gateGeo, gateMat); southPortal.position.set(0, 1.8, 8.8); southPortal.scale.set(1.8, 3.4, 0.1); world.group.add(southPortal);

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
let seated = null; // { x, z, rotY } while the player sits in a theater seat
let emoteWheel = null;
let paused = false;
let t = 0;
let toastTimer = null;
const keys = new Set();

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

function setRoom(roomId) {
  // Leaving a room (or re-spawning inside one) always stands the player up.
  standUp();
  currentRoomId = roomId;
  const isGarden = ROOMS.isGarden(roomId);
  const isMarket = roomId === ROOMS.MARKET;
  const distDef = districts.find(d => d.id === roomId);

  marketWorld.group.visible = isMarket;
  gardenWorld.group.visible = isGarden;
  districtWorlds.forEach((dw, id) => {
    dw.group.visible = id === roomId;
  });

  if (distDef) {
    const distWorld = getOrCreateDistrictWorld(roomId);
    currentWorld = distWorld;
    currentBounds = getBoundsForRoom(roomId);
    if (!exploration.visited.includes(roomId)) {
      exploration.visited.push(roomId);
    }
    exploration.current = roomId;
    saveExploration(exploration);

    // Dynamic lighting & background
    scene.fog.color.set(distDef.color);
    scene.background.set(distDef.color).multiplyScalar(0.45);
    sun.color.set(distDef.sun);

    // Safe spawn position
    const spawn = distDef.spawn || [-9, 0];
    player.position.set(spawn[0], 0, spawn[1]);
    kiln.position.set(spawn[0] + 0.8, 0, spawn[1] + 1);

    // Update HUD headers
    $('location-title').textContent = distDef.name;
    $('district-tag').textContent = distDef.district;
    $('map-label').textContent = '• ' + distDef.subtitle;
    $('map-path').setAttribute('d', mapPaths[roomId] || mapPaths.court);
    toast(distDef.name, distDef.description, 'ARRIVED IN DISTRICT');
  } else if (isGarden) {
    currentWorld = gardenWorld;
    currentBounds = getBoundsForRoom(roomId);
    player.position.set(-9.5, 0, 0);
    kiln.position.set(-8.7, 0, 1);
    scene.fog.color.set('#54645d');
    scene.background.set('#222d2a');
    sun.color.set('#ffe0a5');

    $('location-title').textContent = "Your Market Garden";
    $('district-tag').textContent = "CULTIVATION DISTRICT / 02";
    $('map-label').textContent = "• MARKET GARDEN 02";
    $('map-path').setAttribute('d', mapPaths.garden);
    toast("Your Garden Plot", "Tend your garden beds and harvest fresh crops.");
  } else {
    currentWorld = marketWorld;
    currentBounds = getBoundsForRoom('market');
    player.position.set(0, 0, 3);
    kiln.position.set(0.8, 0, 4);
    scene.fog.color.set('#54645d');
    scene.background.set('#222d2a');
    sun.color.set('#ffe0a5');

    $('location-title').textContent = "The Market Court";
    $('district-tag').textContent = "MARKET SOCIAL DISTRICT / 01";
    $('map-label').textContent = "• MARKET COURT 01";
    $('map-path').setAttribute('d', mapPaths.market);
    toast("The Market Court", "Trade produce, buy seeds, and fulfill contracts.");
  }

  target = null;
  marker.visible = false;
  clearJumpMomentum(); // travel always spawns grounded, with no hop chain
  remotePlayers.clear();
  // Leaving the room (or re-entering it) always drops cinema view; standing
  // is handled by the travel paths that call standUp() first.
  theaterUI.setWatchMode(false);
  // Records the desired room on the network client: sent immediately while
  // connected, and replayed from onopen (including after reconnects) when
  // the socket is not open yet, as during page load.
  net.joinRoom(roomId);
  theaterUI.setRoomActive(roomId === ROOMS.THEATER);
  // Cinema view is the theater's default presentation: walking in starts
  // the big screen. Esc, movement, or the watch bar steps back out.
  if (roomId === ROOMS.THEATER) theaterUI.setWatchMode(true);
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
  $('net-indicator').textContent = '● ONLINE';
  $('net-indicator').style.color = '#85e0a3';
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

net.on(MSG_TYPES.PRESENCE_JOIN, (msg) => {
  if (rtWire?.consumePresenceJoin?.(msg)) return;
  if (msg.player && msg.player.id !== net.guestId) {
    remotePlayers.setPlayer(msg.player);
    toast("Gardener Arrived", `${msg.player.nickname} entered the area.`);
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
    osc.connect(gain).connect(audio.destination);
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
    audio = new AudioContext();
    stepGain = audio.createGain();
    stepGain.gain.value = stepsVolume;
    stepGain.connect(audio.destination);
    // Footstep source: a short noise burst, pre-decayed so it thuds.
    stepBuffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.09), audio.sampleRate);
    const stepData = stepBuffer.getChannelData(0);
    for (let i = 0; i < stepData.length; i++) {
      stepData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / stepData.length, 2);
    }
    const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.04;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    source.connect(filter).connect(audio.destination);
    source.start();
  }
  await (muted ? audio.suspend() : audio.resume());
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
// Sitting: the player snaps into a chair facing the screen (-z), legs folded.
// Any movement key, walk-click, E, or travel stands them up again.
function sitOn(seatItem) {
  if (seated) return;
  // standZ: a clear spot 0.8 in front of the seat center (the way it faces).
  // The seated position sits inside the chair's collision rectangle; standing
  // up must step outside it or small movement steps can never escape.
  seated = { x: seatItem.x, z: seatItem.z - 0.08, standZ: seatItem.z - 0.8, rotY: Math.PI };
  // Take the keyboard back: a focused chat input would silently swallow the
  // keys that get the player out of the chair again.
  if (document.activeElement?.id === 'chat-input') document.activeElement.blur();
  player.position.set(seated.x, 0, seated.z);
  player.rotation.y = seated.rotY;
  // Seated in first person: open the view facing where the chair faces.
  if (cameraMode === FP_MODE) fpYaw = seated.rotY + Math.PI;
  player.userData.legs.forEach(leg => { leg.rotation.x = -1.35; });
  target = null;
  marker.visible = false;
  clearJumpMomentum(); // sitting is a hard reset: no queued jump from the chair
  net.sendMovement(player.position.x, player.position.z, player.rotation.y, false, true);
  toast('Take a Seat', 'You settle into the velvet. Press E or a movement key to stand.', 'THE ORPHEUM');
  // Cinema view: big stage, chat beside it, HUD out of the way.
  theaterUI.setSeated(true);
  theaterUI.setWatchMode(true);
}

function standUp() {
  if (!seated) return;
  // Step out in front of the chair (the way it faces). Standing at the seated
  // spot would leave the player inside the seat's collision rectangle, wedged
  // between chair rows — small movement steps never escape a blocked rect.
  player.position.set(seated.x, 0, seated.standZ);
  seated = null;
  clearJumpMomentum();
  player.userData.legs.forEach(leg => { leg.rotation.x = 0; });
  net.sendMovement(player.position.x, player.position.z, player.rotation.y, false, false);
  theaterUI.setSeated(false);
  theaterUI.setWatchMode(false);
}

function interact() {
  if (paused) return;

  // E while seated always stands up, regardless of what else is nearby.
  if (seated) {
    standUp();
    return;
  }

  if (!nearest) {
    toast("No Target Nearby", "Approach a garden bed, market stall, or gateway to interact.");
    return;
  }

  // Garden Gate in Market Court
  if (nearest.type === 'garden_gate') {
    setRoom(ROOMS.gardenFor(net.guestId));
    return;
  }

  // Market Gate in Garden or Districts
  if (nearest.type === 'market_gate') {
    setRoom(ROOMS.MARKET);
    return;
  }

  // District Gateway
  if (nearest.type === 'district_gate') {
    setRoom(nearest.targetDistrict);
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

  // Field Note Reading
  if (nearest.type === 'field-note') {
    toast(nearest.sub, nearest.body, 'FIELD NOTE');
    return;
  }

  // Theater seating & the shared screen
  if (nearest.type === 'seat') {
    sitOn(nearest);
    return;
  }
  if (nearest.type === 'theater_screen') {
    theaterUI.openControls();
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

// District Travel Dialog Management
function openDistricts() {
  paused = true;
  keys.clear();
  clearJumpMomentum();
  renderDistrictList();
  $('district-dialog').showModal();
}

function closeDistricts() {
  paused = false;
  $('district-dialog').close();
}

function renderDistrictList() {
  const container = $('district-list');
  container.innerHTML = '';

  // 1. Market Court option
  const marketBtn = document.createElement('button');
  marketBtn.className = 'district-choice' + (currentRoomId === 'market' ? ' active' : '');
  marketBtn.innerHTML = `
    <div>
      <span class="micro">SOCIAL TRADING HUB</span>
      <strong>The Market Court</strong>
    </div>
    <span class="desc">Exchange harvests, buy seeds, and fulfill town contracts.</span>
    <span class="status-badge ${currentRoomId === 'market' ? 'current' : 'visited'}">${currentRoomId === 'market' ? 'CURRENT' : 'CIVIC HUB'}</span>
  `;
  marketBtn.onclick = () => { closeDistricts(); setRoom('market'); };
  container.appendChild(marketBtn);

  // 2. Personal Garden option
  const gardenRoom = ROOMS.gardenFor(net.guestId);
  const gardenBtn = document.createElement('button');
  gardenBtn.className = 'district-choice' + (currentRoomId === gardenRoom ? ' active' : '');
  gardenBtn.innerHTML = `
    <div>
      <span class="micro">CULTIVATION PLOT</span>
      <strong>Your Market Garden</strong>
    </div>
    <span class="desc">Till soil, sow crops, water, and harvest fresh produce.</span>
    <span class="status-badge ${currentRoomId === gardenRoom ? 'current' : 'visited'}">${currentRoomId === gardenRoom ? 'CURRENT' : 'PERSONAL PLOT'}</span>
  `;
  gardenBtn.onclick = () => { closeDistricts(); setRoom(gardenRoom); };
  container.appendChild(gardenBtn);

  // 3. All 16 districts
  districts.forEach(def => {
    const isCurrent = currentRoomId === def.id;
    const isCompleted = exploration.completed.includes(def.id);
    const isVisited = exploration.visited.includes(def.id);

    const btn = document.createElement('button');
    btn.className = 'district-choice' + (isCurrent ? ' active' : '');
    let badgeClass = 'unexplored', badgeText = 'UNEXPLORED';
    if (isCurrent) {
      badgeClass = 'current'; badgeText = 'CURRENT';
    } else if (isCompleted) {
      badgeClass = 'restored'; badgeText = '✦ RESTORED';
    } else if (isVisited) {
      badgeClass = 'visited'; badgeText = 'VISITED';
    }

    btn.innerHTML = `
      <div>
        <span class="micro">${def.district}</span>
        <strong>${def.name}</strong>
      </div>
      <span class="desc">${def.description}</span>
      <span class="status-badge ${badgeClass}">${badgeText}</span>
    `;
    btn.onclick = () => { closeDistricts(); setRoom(def.id); };
    container.appendChild(btn);
  });
}

$('btn-travel').onclick = openDistricts;
$('close-districts').onclick = closeDistricts;
$('district-dialog').addEventListener('cancel', (e) => { e.preventDefault(); closeDistricts(); });
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
  else $('settings-dialog').close();
}
$('settings').onclick = toggleSettings;
$('resume').onclick = toggleSettings;
$('settings-dialog').addEventListener('cancel', (e) => { e.preventDefault(); toggleSettings(); });
function setCameraMode(mode) {
  cameraMode = mode;
  activeCamera = mode === FP_MODE ? fpCamera : camera;
  renderPass.camera = activeCamera;
  // First person opens facing where the avatar faces. The avatar faces +Z at
  // rotation.y = 0 while the camera looks down -Z, so the yaw needs a PI flip.
  if (mode === FP_MODE) {
    fpYaw = player.rotation.y + Math.PI;
    fpPitch = 0;
  }
  // The player's own avatar stays out of view in first person; everything
  // else (Kiln, remote players, scenery) renders normally.
  player.visible = mode !== FP_MODE;
  renderer.domElement.style.cursor = mode === FP_MODE ? 'grab' : '';
}
$('camera').onclick = () => setCameraMode(nextCameraMode(cameraMode));
$('quality').onchange = () => {
  renderer.setPixelRatio(Math.min(devicePixelRatio, Number($('quality').value)));
  resize();
};
$('atmosphere').onchange = () => { particles.visible = $('atmosphere').checked; };

// --- KEYBOARD CONTROLS ---
window.addEventListener('keydown', (e) => {
  if (e.target.closest('input,select,textarea,[contenteditable="true"]') && e.code !== 'Escape') return;

  // A seated player can always free themselves with E or any movement key —
  // this runs even while some panel has paused the world, so sitting can
  // never become a trap.
  if (seated && ['KeyE', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
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
    chatPanel.focusInput(e.code === 'Slash' ? '/' : '');
    return;
  }

  if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(e.code)) {
    const map = { Digit1: 'hands', Digit2: 'hoe', Digit3: 'seed', Digit4: 'water', Digit5: 'harvest', Digit6: 'sprinkler' };
    setTool(map[e.code]);
    return;
  }

  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  keys.add(e.code);

  if (e.repeat) return;
  if (e.code === 'Space' && !paused && !seated) jumpQueued = true; // consumed by the frame loop
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
    // Esc always frees a seated player completely (cinema view + chair).
    if (seated) standUp();
    else if (!paused) {
      // In cinema view, Escape returns to the game first; settings needs a second press.
      if (theaterUI.isWatching()) theaterUI.setWatchMode(false);
      else toggleSettings();
    }
  }
});

window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => {
  keys.clear();
  clearJumpMomentum();
});

// --- POINTER / CLICK TO WALK + DRAG TO LOOK ---
// A press is a walk click unless pointer travel promotes it to a drag
// (classifyDrag). In first person a drag turns the view instead; in every
// mode a plain press-release does what the old pointerdown handler did:
// stands a seated player up, leaves cinema view, and plants a walk target.
let press = null; // { x, y, lastX, lastY, dragging }

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
  if (seated) standUp();
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

  if (!paused) {
    t += dt;

    let moveX = 0, moveZ = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) moveZ--;
    if (keys.has('KeyS') || keys.has('ArrowDown')) moveZ++;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) moveX--;
    if (keys.has('KeyD') || keys.has('ArrowRight')) moveX++;

    // Any movement key stands a seated player up — or, when watching without
    // sitting, steps out of cinema view so the walk begins immediately.
    if (seated && (moveX || moveZ)) {
      standUp();
      moveX = 0;
      moveZ = 0;
    } else if (!seated && (moveX || moveZ) && theaterUI.isWatching()) {
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
    if (!seated) {
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
    const moved = seated ? false : move(player, dir.x, dir.z, dt);
    if (target && !moved) {
      target = null;
      marker.visible = false;
    }

    // While airborne the jump owns the avatar's y and the legs tuck; the
    // grounded walk bob that move() just applied stays untouched.
    if (!seated && jumpState.airborne) {
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
    // players render the seated pose; airborne lets them render hops)
    net.sendMovement(player.position.x, player.position.z, player.rotation.y, moved, !!seated, !seated && jumpState.airborne);

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

    // Update active world
    const isDone = exploration.completed.includes(currentRoomId);
    currentWorld.update(t, currentGardenBeds || isDone);

    // Find nearest interactable
    nearest = null;
    let minDist = 2.4;
    for (const item of (currentWorld.items || [])) {
      const dist = Math.hypot(player.position.x - item.x, player.position.z - item.z);
      if (dist < minDist) {
        nearest = item;
        minDist = dist;
      }
    }

    if (nearest) {
      $('action-title').textContent = nearest.title;
      $('action-sub').textContent = nearest.sub;
      $('interact').style.borderColor = '#c6b47a99';
    } else {
      const distDef = districts.find(d => d.id === currentRoomId);
      if (distDef) {
        $('action-title').textContent = distDef.name;
        $('action-sub').textContent = "Explore sector with Kiln · Press T to travel";
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

    // Update Minimap
    const mapPos = projectToMinimap(currentBounds, player.position.x, player.position.z);
    $('map-player').setAttribute('cx', mapPos.cx);
    $('map-player').setAttribute('cy', mapPos.cy);

    particles.rotation.y = Math.sin(t * 0.03) * 0.04;
  }

  // Camera follow: isometric orbit modes vs first person at eye height
  // (lowered when seated in a theater chair).
  if (cameraMode === FP_MODE) {
    const eye = seated ? SEATED_EYE_HEIGHT : EYE_HEIGHT;
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

// Remove initial loading screen
$('loading').style.opacity = '0';
setTimeout(() => $('loading').remove(), 800);
