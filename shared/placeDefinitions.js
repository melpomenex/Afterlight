import { SOCIAL_PLACE_OVERRIDES, DESERT_CAMP_DEFINITION } from './socialPlaceDefinitions.js';
/**
 * Pure place metadata for every Afterlight destination: display identity,
 * stable ids, deterministic seeds, bounds, spawns, declared exits, minimap
 * paths, atmosphere keys, capabilities and legacy classification.
 *
 * This module is the single editable manifest. It must stay free of Three.js
 * and DOM imports so Node tests, the Elixir projection script and the browser
 * all read identical plain data. Renderer references (builders, controllers)
 * live in src/places/registry.js; this file never imports them.
 */

// Display metadata exactly as the legacy district table shipped it. Field
// notes, objectives and order are preserved verbatim; framework fields are
// layered on below.
const LEGACY_DISPLAY = [
  { id: 'court', name: 'The Rain Court', district: 'LOWER DISTRICT / 04', subtitle: 'AFTER THE RAIN', color: '#657264', sun: '#ffe0a5', description: 'Wet stone, warm windows. Where your journey began.' },
  { id: 'canal', name: 'The Sluiceworks', district: 'WATER DISTRICT / 05', subtitle: 'BENEATH THE MIST', color: '#466b70', sun: '#c3e6e1', description: 'Cross the canal and wake the sleeping waterworks.', objective: 'Open the sluice valve', action: 'Turn the sluice valve', done: 'Waterworks flowing', message: 'Water moves through the old channels again. Somewhere below, a garden drinks.', landmark: [7, -5], note: [-7, 5], noteTitle: 'A waterkeeper’s promise', noteBody: '“Keep the water moving. The roots above us are still alive.”', spawn: [-9, 0] },
  { id: 'garden', name: 'The Glass Garden', district: 'UPPER TERRACES / 06', subtitle: 'WHERE GREEN RETURNS', color: '#78846a', sun: '#ffe6ad', description: 'An overgrown greenhouse above the city. Something still grows.', objective: 'Wake the seed nursery', action: 'Tend the seed nursery', done: 'Nursery awakened', message: 'The nursery lights up, sheltering a new generation of green. Kiln watches the leaves unfold.', landmark: [4, -5], note: [-6, 5], noteTitle: 'The last gardener', noteBody: '“A city is not empty while something is growing. Leave a little room for the wild.”', spawn: [-9, 0] },
  { id: 'station', name: 'The Last Platform', district: 'TRANSIT DISTRICT / 07', subtitle: 'THE BLUE HOUR', color: '#424d70', sun: '#b4c5fa', description: 'An abandoned tram stop, and a signal waiting to be heard.', objective: 'Light the signal beacon', action: 'Send the home signal', done: 'Signal broadcasting', message: 'A warm signal reaches across the rooftops. If someone is out there, they know the city is waking.', landmark: [7, 5], note: [-6, 5], noteTitle: 'An unsent timetable', noteBody: '“Last service: whenever you are ready. There will always be a way home.”', spawn: [-9, 0] },
  { id: 'aqueduct', name: 'The Sunken Aqueduct', district: 'AQUEDUCT DISTRICT / 08', subtitle: 'DEEP RUNS THE WATER', color: '#384d52', sun: '#9ec4c0', description: 'Subterranean stone channels beneath the old city. Clear the silt sluice to let the cisterns breathe.', objective: 'Clear the silt sluice', action: 'Raise the silt gate', done: 'Cisterns breathing', message: 'Clear water rushes through the ancient conduit. The subterranean echoing returns to life.', landmark: [6, -4], note: [-6, 4], noteTitle: 'Cistern Overseer’s Log', noteBody: '“The masonry has held for three centuries. Give it clean water, and it will hold for three more.”', spawn: [-9, 0] },
  { id: 'caldera', name: 'The Boiler Caldera', district: 'GEOTHERMAL DISTRICT / 09', subtitle: 'HEAT FROM THE DEEP', color: '#4d3b38', sun: '#f7aa74', description: 'Steam vents hiss through dark basalt crevices. Regulate the geothermal manifold.', objective: 'Regulate the geothermal manifold', action: 'Turn the pressure manifold', done: 'Manifold regulated', message: 'Steam settles into a steady, resonant rhythm. Warm air rises toward the cold terraces above.', landmark: [5, -4], note: [-6, 5], noteTitle: 'Thermal Watchman', noteBody: '“Listen to the pressure before you touch a valve. The rock speaks if you have patience.”', spawn: [-9, 0] },
  { id: 'understory', name: 'The Spore Understory', district: 'FUNGAL DISTRICT / 10', subtitle: 'LIGHT IN THE DAMP', color: '#3b4737', sun: '#a5d9a0', description: 'A cavernous lower rotunda overtaken by luminous fungi. Awaken the bioluminescent mycelium.', objective: 'Awaken the mycelium lattice', action: 'Energize the mycelial node', done: 'Mycelium luminous', message: 'Soft green light pulses through the damp loam and ripples across the shelf fungi.', landmark: [6, -5], note: [-7, 5], noteTitle: 'Fungal Archivist', noteBody: '“Fungi remember where every tree once stood. They do not hurry, and they never forget.”', spawn: [-9, 0] },
  { id: 'saltworks', name: 'The Bleached Saltworks', district: 'MINERAL DISTRICT / 11', subtitle: 'WHITE TERRACES OF BRINE', color: '#566668', sun: '#e3f3f7', description: 'Blinding white crystalline flats and evaporation pans. Free the stuck brine pump.', objective: 'Engage the brine pump', action: 'Prime the brine pump', done: 'Brine pump turning', message: 'Clear brine trickles into the shallow crystallizers. Salt crystals shimmer in the sunlight.', landmark: [7, -4], note: [-6, 4], noteTitle: 'Salt Harvester’s Tablet', noteBody: '“The tide gives, the wind takes, and the salt remains. A clean basin makes clean bread.”', spawn: [-9, 0] },
  { id: 'rooftops', name: 'The High Awnings', district: 'SKYWARD DISTRICT / 12', subtitle: 'WHERE WINDS GATHER', color: '#546370', sun: '#e6d8b8', description: 'Wind-beaten scaffolding and catwalks overlooking the expanse. Free the anemometer array.', objective: 'Free the anemometer array', action: 'Align the wind vanes', done: 'Wind array spinning', message: 'The brass vanes catch the gusts and sing against the copper eaves. The city knows which way the wind blows.', landmark: [6, -5], note: [-5, 5], noteTitle: 'Roofkeeper’s Weather Log', noteBody: '“Up here, you feel the city breathing. The high wind is honest; it hides nothing.”', spawn: [-9, 0] },
  { id: 'mangrove', name: 'The Brackish Basin', district: 'ESTUARY DISTRICT / 13', subtitle: 'ROOTS IN THE BRINE', color: '#44574c', sun: '#cde4cb', description: 'Submerged brickwork laced with tangle roots and stilt boardwalks. Restore the tidal weir.', objective: 'Clear the tidal weir', action: 'Lower the timber weir', done: 'Tidal weir secured', message: 'The water slows behind the timber barrier. Small fish dart among the submerged brick columns.', landmark: [6, -4], note: [-6, 5], noteTitle: 'Estuary Keeper’s Marker', noteBody: '“The tide doesn’t care about our masonry, but the roots hold both together.”', spawn: [-9, 0] },
  { id: 'trestle', name: 'The Overgrown Trestle', district: 'CANOPY DISTRICT / 14', subtitle: 'IRON IN THE BOUGHS', color: '#4e5a42', sun: '#dce6b6', description: 'A massive iron railway viaduct gripped by ancient boughs. Restore the suspended maintenance crane.', objective: 'Anchor the canopy crane', action: 'Engage the hoist cable', done: 'Canopy crane anchored', message: 'Tension locks into the heavy iron cables. Kiln chirps as the suspension bridge stabilizes.', landmark: [7, -4], note: [-5, 5], noteTitle: 'Viaduct Inspector’s Plaque', noteBody: '“Steel will flex and timber will bend, but together they span the valley.”', spawn: [-9, 0] },
  { id: 'foundry', name: 'The Rustfall Foundry', district: 'SMELTING DISTRICT / 15', subtitle: 'HEARTH OF SLAG AND ORE', color: '#4a3832', sun: '#f2a679', description: 'Red iron dust and towering crucible furnaces. Ignite the pilot hearth.', objective: 'Ignite the pilot hearth', action: 'Spark the furnace igniter', done: 'Pilot hearth glowing', message: 'A warm orange glow spreads through the blast flue. Warmth returns to the cold cast iron.', landmark: [6, -4], note: [-6, 5], noteTitle: 'Foundry Master’s Inscription', noteBody: '“Cold iron forgets its shape until fire reminds it. Never let the pilot flame die completely.”', spawn: [-9, 0] },
  { id: 'frost-spire', name: 'The Glacial Glasshouse', district: 'ALPINE DISTRICT / 16', subtitle: 'ABOVE THE CLOUD LINE', color: '#45596e', sun: '#d6ecff', description: 'A fractured glass observatory battered by alpine frost. Clear the ice crystals from the solar collector.', objective: 'Clear the solar collector', action: 'Sweep the frost collector', done: 'Solar collector cleared', message: 'Sunlight catches the polished mirror facets. Warmth begins melting the frost along the rim.', landmark: [5, -5], note: [-6, 5], noteTitle: 'Alpine Observer’s Journal', noteBody: '“The cold is patient, but glass and copper remember the light. Keep looking upward.”', spawn: [-9, 0] },
  { id: 'delta', name: 'The Reclaimed Marshes', district: 'DELTA DISTRICT / 17', subtitle: 'WHISPERS IN THE REEDS', color: '#525b45', sun: '#d9e0b2', description: 'Shallow sandbars and cattail marshes woven through stranded barges. Realign the channel beacon.', objective: 'Light the channel beacon', action: 'Strike the marsh beacon', done: 'Channel beacon lit', message: 'A warm beacon reflects across the delta shallows, cutting through the twilight mist.', landmark: [7, -4], note: [-6, 4], noteTitle: 'Delta Boatman’s Note', noteBody: '“Follow the reeds when the silt shifts. Where water moves slowly, green things thrive.”', spawn: [-9, 0] },
  { id: 'archives', name: 'The Paper Catacombs', district: 'ARCHIVE DISTRICT / 18', subtitle: 'WHISPERING VAULTS', color: '#48444a', sun: '#f5e4bd', description: 'Stone shelves holding centuries of water-resistant parchment. Light the reading desk lamp.', objective: 'Illuminate the study rotunda', action: 'Turn the reading lamp switch', done: 'Study rotunda illuminated', message: 'A soft amber globe illuminates centuries of hand-bound volumes. The silence feels like peace.', landmark: [5, -4], note: [-6, 5], noteTitle: 'Chief Archivist’s Dedication', noteBody: '“Words outlive empires, provided someone keeps the rain from dripping on the ink.”', spawn: [-9, 0] },
  { id: 'kiln-terrace', name: 'The Solar Kiln', district: 'TERRACOTTA DISTRICT / 19', subtitle: 'BAKED IN WARMTH', color: '#634b3e', sun: '#ffd09e', description: 'Baked clay tiles and parabolic sun collectors. Align the solar concentrator.', objective: 'Focus the solar concentrator', action: 'Calibrate the focal mirror', done: 'Concentrator focused', message: 'A brilliant point of concentrated sunlight gleams against the terracotta kiln. Warmth radiates.', landmark: [6, -4], note: [-5, 5], noteTitle: 'Potter’s Credo', noteBody: '“Earth, water, and sun. With these three, a broken city can remake itself cup by cup.”', spawn: [-9, 0] },
  { id: 'theater', name: 'The Orpheum', district: 'CINEMA DISTRICT / 20', subtitle: 'PICTURES IN THE DARK', color: '#3a3345', sun: '#e8c9a0', description: 'A grand old cinema where the city gathers after dark. Queue a film, take a seat.', objective: 'Restore power to the projector', action: 'Restore the projector', done: 'Projector humming', message: 'The marquee blazes and the reel begins to turn. Take a seat — whatever plays here plays for everyone.', landmark: [0, 7.6], note: [-6, 7.2], noteTitle: 'The Orpheum’s house rules', noteBody: '“Anyone may change the picture. No one owns the screen. Leave the aisle lamps burning for whoever comes next.”', spawn: [-9, 0] },
];

export const PLACE_KINDS = ['environment', 'venue', 'view'];
export const PLACE_SHELLS = ['legacy-urban', 'none'];
export const PLACE_CAPABILITIES = ['seating', 'sharedMedia', 'conferencing', 'activities'];
export const PLACE_WEATHER_MODES = ['fixed', 'scheduled'];
export const PLACE_TIME_MODES = ['fixed', 'scheduled'];

export const MAX_ACTIVITIES_PER_PLACE = 16;
export const ACTIVITY_TYPES = Object.freeze([
  'pong',
  'rain-runner',
  'signal-lost',
  'sporefall',
  'snowboard-race',
  'pool',
  'billiards',
  'air-hockey',
  'foosball',
  'drones',
  'paper-airplanes',
  'gutter-boats',
  'rc-boats',
  'chess',
  'checkers',
  'tile-puzzle',
  'horseshoes',
  'telescope',
  'curling',
  'hammer-strike',
  'forge-challenge',
  'fishing',
  'skipping-stones',
  'light-music-puzzle',
  'darts',
  'piano',
  'photo-booth',
]);
export const ACTIVITY_ENVIRONMENT_POLICIES = Object.freeze(['none', 'frozen', 'live']);
export const ACTIVITY_SPECTATOR_POLICIES = Object.freeze(['world', 'focused']);
export const DEFAULT_ACTIVITY_CAPACITIES = Object.freeze({ players: 2, spectators: 32, queue: 16 });

// Cabinet presentation blocks (canonical arcade system, src/arcade/): one
// shared GLB model per machine, differentiated entirely through this data —
// artwork motif/palette, LED trim color, control plastics, screen source.
// `model: 'upright'` names the canonical cabinet; future hardware (cockpit,
// lightgun) adds new model keys instead of new geometry forks.
const PONG_CABINET = Object.freeze({
  model: 'upright',
  skin: Object.freeze({
    title: 'PONG',
    tagline: '2P · FREE PLAY',
    motif: 'pong',
    palette: Object.freeze({ base: '#17181c', ink: '#f2efe6', accent: '#e8563f', glow: '#f5f2e8' }),
  }),
  led: Object.freeze({ color: '#f5f2e8', intensity: 1.5 }),
  controls: Object.freeze({ player1: '#f2efe6', player2: '#e8563f' }),
  screen: Object.freeze({ type: 'canvas' }),
});

const RAIN_RUNNER_CABINET = Object.freeze({
  model: 'upright',
  skin: Object.freeze({
    title: 'RAIN RUNNER',
    tagline: 'HIGH SCORE RUN',
    motif: 'rain',
    palette: Object.freeze({ base: '#10222f', ink: '#e6f4fa', accent: '#0e7490', glow: '#38bdf8' }),
  }),
  led: Object.freeze({ color: '#38bdf8', intensity: 1.8 }),
  controls: Object.freeze({ player1: '#38bdf8', player2: '#0ea5e9' }),
  screen: Object.freeze({ type: 'canvas' }),
});

const SIGNAL_LOST_CABINET = Object.freeze({
  model: 'upright',
  skin: Object.freeze({
    title: 'SIGNAL LOST',
    tagline: 'ASTEROID SURVIVAL',
    motif: 'signal',
    palette: Object.freeze({ base: '#14102a', ink: '#e9e6f7', accent: '#7c5cd6', glow: '#a78bfa' }),
  }),
  led: Object.freeze({ color: '#a78bfa', intensity: 1.8 }),
  controls: Object.freeze({ player1: '#a78bfa', player2: '#31d2c8' }),
  screen: Object.freeze({ type: 'canvas' }),
});

const SPOREFALL_CABINET = Object.freeze({
  model: 'upright',
  skin: Object.freeze({
    title: 'SPOREFALL',
    tagline: 'BLOCK CLEAR PUZZLE',
    motif: 'spore',
    palette: Object.freeze({ base: '#1a231a', ink: '#efe9d6', accent: '#7da05a', glow: '#ffb24d' }),
  }),
  led: Object.freeze({ color: '#ffb24d', intensity: 1.7 }),
  controls: Object.freeze({ player1: '#7fb069', player2: '#ffb24d' }),
  screen: Object.freeze({ type: 'canvas' }),
});

// The Orpheum arcade row: machines line the east wall of the auditorium,
// fronts facing west onto the runner carpet (rotationY -PI/2). Footprints are
// axis-aligned world extents of the rotated canonical cabinet (~0.74m deep ×
// ~0.78m wide plus clearance); anchors put players at the stand markers.
export const PONG_ACTIVITY_DEFINITION = Object.freeze({
  id: 'orpheum-pong',
  type: 'pong',
  title: 'Pong Cabinet',
  sub: 'Press E to play · Spectate / Queue',
  rulesVersion: 1,
  cabinet: PONG_CABINET,
  transform: Object.freeze({ position: Object.freeze([10.42, 0, -7.95]), rotationY: -Math.PI / 2 }),
  footprint: Object.freeze({ width: 0.85, depth: 0.9 }),
  interactionRadius: 2.2,
  participantAnchors: Object.freeze([
    Object.freeze({ slot: 0, position: Object.freeze([9.3, 0, -7.9]), facing: Math.PI / 2, dismount: Object.freeze([Object.freeze({ x: 8.55, z: -7.9 })]) }),
    Object.freeze({ slot: 1, position: Object.freeze([9.3, 0, -7.2]), facing: Math.PI / 2, dismount: Object.freeze([Object.freeze({ x: 8.55, z: -7.2 })]) }),
  ]),
  capacities: Object.freeze({ players: 2, spectators: 32, queue: 16 }),
  environmentPolicy: 'none',
  spectatorPolicy: 'world',
  rendererKey: 'pongCabinet',
  controllerKey: 'pong',
});

export const RAIN_RUNNER_ACTIVITY_DEFINITION = Object.freeze({
  id: 'orpheum-rain-runner',
  type: 'rain-runner',
  title: 'Rain Runner',
  sub: 'Press E to drive · High score run',
  rulesVersion: 1,
  cabinet: RAIN_RUNNER_CABINET,
  transform: Object.freeze({ position: Object.freeze([10.42, 0, -5.9]), rotationY: -Math.PI / 2 }),
  footprint: Object.freeze({ width: 0.85, depth: 0.9 }),
  interactionRadius: 2.2,
  participantAnchors: Object.freeze([
    Object.freeze({ slot: 0, position: Object.freeze([9.3, 0, -5.9]), facing: Math.PI / 2, dismount: Object.freeze([Object.freeze({ x: 8.55, z: -5.9 })]) }),
  ]),
  capacities: Object.freeze({ players: 1, spectators: 16, queue: 8 }),
  environmentPolicy: 'none',
  spectatorPolicy: 'world',
  rendererKey: 'rainRunnerCabinet',
  controllerKey: 'rain-runner',
});

export const SIGNAL_LOST_ACTIVITY_DEFINITION = Object.freeze({
  id: 'orpheum-signal-lost',
  type: 'signal-lost',
  title: 'Signal Lost',
  sub: 'Press E to fly · Asteroid survival',
  rulesVersion: 1,
  cabinet: SIGNAL_LOST_CABINET,
  transform: Object.freeze({ position: Object.freeze([10.42, 0, -3.85]), rotationY: -Math.PI / 2 }),
  footprint: Object.freeze({ width: 0.85, depth: 0.9 }),
  interactionRadius: 2.2,
  participantAnchors: Object.freeze([
    Object.freeze({ slot: 0, position: Object.freeze([9.3, 0, -3.85]), facing: Math.PI / 2, dismount: Object.freeze([Object.freeze({ x: 8.55, z: -3.85 })]) }),
  ]),
  capacities: Object.freeze({ players: 1, spectators: 16, queue: 8 }),
  environmentPolicy: 'none',
  spectatorPolicy: 'world',
  rendererKey: 'signalLostCabinet',
  controllerKey: 'signal-lost',
});

export const SPOREFALL_ACTIVITY_DEFINITION = Object.freeze({
  id: 'orpheum-sporefall',
  type: 'sporefall',
  title: 'Sporefall',
  sub: 'Press E to drop · Block clear puzzle',
  rulesVersion: 1,
  cabinet: SPOREFALL_CABINET,
  transform: Object.freeze({ position: Object.freeze([10.42, 0, -1.8]), rotationY: -Math.PI / 2 }),
  footprint: Object.freeze({ width: 0.85, depth: 0.9 }),
  interactionRadius: 2.2,
  participantAnchors: Object.freeze([
    Object.freeze({ slot: 0, position: Object.freeze([9.3, 0, -1.8]), facing: Math.PI / 2, dismount: Object.freeze([Object.freeze({ x: 8.55, z: -1.8 })]) }),
  ]),
  capacities: Object.freeze({ players: 1, spectators: 16, queue: 8 }),
  environmentPolicy: 'none',
  spectatorPolicy: 'world',
  rendererKey: 'sporefallCabinet',
  controllerKey: 'sporefall',
});

// Summit Run (multiplayer snowboard arcade): fifth Orpheum machine, standing
// on the east wall south of the travel gate — the four-machine row above
// fills the north stretch and the gate arch at z -1.2..+1.2 keeps the row
// from extending, so Summit Run gets its own bay beside the seat rows with a
// wall-side queue line. Eight anchors put the rider queue along the open east
// promenade (x = 9.3, clear of the seat collision band ending at x 8.91 and
// the cabinet collision starting at x 9.615); dismounts step west into the
// cross aisles at z = 1.4 / 3.6. Race rules live in shared/snowboard/
// (course 'summit-night'); readiness is explicit, never auto-granted.
const SUMMIT_RUN_CABINET = Object.freeze({
  model: 'upright',
  skin: Object.freeze({
    title: 'SUMMIT RUN',
    tagline: '2–8 RIDERS',
    motif: 'summit',
    palette: Object.freeze({ base: '#152730', ink: '#ecf2ec', accent: '#7acbd4', glow: '#edb66c' }),
  }),
  led: Object.freeze({ color: '#7acbd4', intensity: 1.5 }),
  controls: Object.freeze({ player1: '#edb66c', player2: '#7acbd4' }),
  screen: Object.freeze({ type: 'canvas' }),
});

const summitAnchor = (slot, z, dismountZ) => Object.freeze({
  slot,
  position: Object.freeze([9.3, 0, z]),
  facing: Math.PI / 2,
  dismount: Object.freeze([Object.freeze({ x: 8.55, z: dismountZ })]),
});

export const SUMMIT_RUN_ACTIVITY_DEFINITION = Object.freeze({
  id: 'summit-run',
  type: 'snowboard-race',
  title: 'Summit Run',
  sub: 'Press E to ride · 2–8 riders',
  rulesVersion: 1,
  minPlayers: 2,
  readyPolicy: 'explicit',
  course: Object.freeze({ id: 'summit-night', version: 1 }),
  cabinet: SUMMIT_RUN_CABINET,
  transform: Object.freeze({ position: Object.freeze([10.42, 0, 2.6]), rotationY: -Math.PI / 2 }),
  footprint: Object.freeze({ width: 0.85, depth: 0.9 }),
  // 3.0 covers every queue anchor (farthest is ~2.88 from the machine) so the
  // server's seated proximity re-check can never eject an anchored rider.
  interactionRadius: 3.0,
  participantAnchors: Object.freeze([
    summitAnchor(0, 0.35, 1.4),
    summitAnchor(1, 1.05, 1.4),
    summitAnchor(2, 1.75, 1.4),
    summitAnchor(3, 2.45, 1.4),
    summitAnchor(4, 3.15, 3.6),
    summitAnchor(5, 3.85, 3.6),
    summitAnchor(6, 4.55, 3.6),
    summitAnchor(7, 5.25, 3.6),
  ]),
  capacities: Object.freeze({ players: 8, spectators: 32, queue: 16 }),
  environmentPolicy: 'none',
  spectatorPolicy: 'world',
  rendererKey: 'summitRunCabinet',
  controllerKey: 'snowboard-race',
});

// Flagship pool table (social-billiards, Tasks 5.1-5.5): standing in the
// symmetrical West Lounge at (-8.6, -4.5), rotated 90 degrees so its long
// playing axis aligns with the auditorium's Z axis. This placement preserves
// 100% unobstructed sightlines from all 48 seats to the movie screen while
// leaving >= 1.3m clearance to the west spectator bench and > 4.4m to the
// east main aisle. Anchors place the two players at the head and foot rails.
export const POOL_ACTIVITY_DEFINITION = Object.freeze({
  id: 'orpheum-pool',
  type: 'pool',
  title: 'Billiards Table',
  sub: 'Press E to play · Casual 8-ball',
  rulesVersion: 1,
  transform: Object.freeze({ position: Object.freeze([-8.6, 0, -4.5]), rotationY: Math.PI / 2 }),
  footprint: Object.freeze({ width: 1.4, depth: 2.5 }),
  interactionRadius: 2.8,
  participantAnchors: Object.freeze([
    Object.freeze({ slot: 0, position: Object.freeze([-8.6, 0, -6.1]), facing: 0, dismount: Object.freeze([Object.freeze({ x: -7.5, z: -6.1 })]) }),
    Object.freeze({ slot: 1, position: Object.freeze([-8.6, 0, -2.9]), facing: Math.PI, dismount: Object.freeze([Object.freeze({ x: -7.5, z: -2.9 })]) }),
  ]),
  capacities: Object.freeze({ players: 2, spectators: 32, queue: 16 }),
  environmentPolicy: 'none',
  spectatorPolicy: 'world',
  rendererKey: 'poolTableRenderer',
  controllerKey: 'pool',
});

export const AIR_HOCKEY_ACTIVITY_DEFINITION = Object.freeze({
  id: 'orpheum-air-hockey',
  type: 'air-hockey',
  title: 'Air Hockey',
  sub: 'Press E to play · Fast-paced table',
  rulesVersion: 1,
  transform: Object.freeze({ position: Object.freeze([5.8, 0, 7.0]), rotationY: 0 }),
  footprint: Object.freeze({ width: 2.2, depth: 1.2 }),
  interactionRadius: 2.5,
  participantAnchors: Object.freeze([
    Object.freeze({ slot: 0, position: Object.freeze([4.3, 0, 7.0]), facing: Math.PI / 2, dismount: Object.freeze([Object.freeze({ x: 4.3, z: 5.8 })]) }),
    Object.freeze({ slot: 1, position: Object.freeze([7.3, 0, 7.0]), facing: -Math.PI / 2, dismount: Object.freeze([Object.freeze({ x: 7.3, z: 5.8 })]) }),
  ]),
  capacities: Object.freeze({ players: 2, spectators: 32, queue: 16 }),
  environmentPolicy: 'none',
  spectatorPolicy: 'world',
  rendererKey: 'airHockeyRenderer',
  controllerKey: 'air-hockey',
});

export const FOOSBALL_ACTIVITY_DEFINITION = Object.freeze({
  id: 'orpheum-foosball',
  type: 'foosball',
  title: 'Classic Foosball',
  sub: 'Press E to play · Table football',
  rulesVersion: 1,
  transform: Object.freeze({ position: Object.freeze([-5.8, 0, 7.0]), rotationY: 0 }),
  footprint: Object.freeze({ width: 2.0, depth: 1.2 }),
  interactionRadius: 2.5,
  participantAnchors: Object.freeze([
    Object.freeze({ slot: 0, position: Object.freeze([-7.1, 0, 7.0]), facing: Math.PI / 2, dismount: Object.freeze([Object.freeze({ x: -7.1, z: 5.8 })]) }),
    Object.freeze({ slot: 1, position: Object.freeze([-4.5, 0, 7.0]), facing: -Math.PI / 2, dismount: Object.freeze([Object.freeze({ x: -4.5, z: 5.8 })]) }),
  ]),
  capacities: Object.freeze({ players: 2, spectators: 32, queue: 16 }),
  environmentPolicy: 'none',
  spectatorPolicy: 'world',
  rendererKey: 'foosballRenderer',
  controllerKey: 'foosball',
});

export const ORPHEUM_ACTIVITIES = Object.freeze([
  PONG_ACTIVITY_DEFINITION,
  RAIN_RUNNER_ACTIVITY_DEFINITION,
  SIGNAL_LOST_ACTIVITY_DEFINITION,
  SPOREFALL_ACTIVITY_DEFINITION,
  SUMMIT_RUN_ACTIVITY_DEFINITION,
]);

export const ORPHEUM_ALL_ACTIVITIES = Object.freeze([
  ...ORPHEUM_ACTIVITIES,
  POOL_ACTIVITY_DEFINITION,
  AIR_HOCKEY_ACTIVITY_DEFINITION,
  FOOSBALL_ACTIVITY_DEFINITION,
]);

// The universal urban shell every legacy district shares: floor, paving,
// perimeter walls, skyline backdrop and street lamps. `legacy-urban`
// reproduces the old construction; `none` lets a builder own them.
export const LEGACY_URBAN_BOUNDS = Object.freeze({ minX: -11.3, maxX: 11.3, minZ: -9.5, maxZ: 10.3 });

// Legacy gate topology. The original seventeen districts form a closed route
// (west = previous entry, east = next entry, wrapping around) and every one
// of them keeps a south gate to the Market Court. Distances are exact legacy
// positions. Freezing the destinations here — instead of deriving them from
// array order at build time — is what lets new places append without
// silently rerouting existing gates.
export const LEGACY_DISTRICT_IDS = Object.freeze(LEGACY_DISPLAY.map(d => d.id));
const WEST_GATE = Object.freeze([-10.7, 0]);
const EAST_GATE = Object.freeze([10.7, 0]);
const MARKET_GATE = Object.freeze([0, 8.8]);

// Minimap schematics for the legacy districts (moved from main.js so the
// manifest stays the single source); market and personal garden keep their
// bespoke entries where they are rendered.
const LEGACY_MINIMAP_PATHS = {
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
  theater: 'M24 24H130V96H24Z M42 34H112 M42 38H112 M34 52H62 M70 52H120 M34 68H62 M70 68H120 M34 84H120 M121 29H125V55H121Z M121 61H125V73H121Z',
  garden: 'M24 24H130V96H24Z M38 36H116V84H38Z M65 24V96',
};

// Exact legacy exits for one legacy district: closed west/east loop over
// LEGACY_DISTRICT_IDS plus the south market gate. Declared once, frozen, and
// consumed by the world factory — appending a place must never recompute
// these.
function legacyExits(id) {
  const index = LEGACY_DISTRICT_IDS.indexOf(id);
  const count = LEGACY_DISTRICT_IDS.length;
  return [
    Object.freeze({ id: 'west', kind: 'district', position: WEST_GATE, target: LEGACY_DISTRICT_IDS[(index - 1 + count) % count] }),
    Object.freeze({ id: 'east', kind: 'district', position: EAST_GATE, target: LEGACY_DISTRICT_IDS[(index + 1) % count] }),
    Object.freeze({ id: 'market', kind: 'market', position: MARKET_GATE, target: 'market' }),
  ];
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

// Layers the framework contract over one legacy display entry. Seeds are the
// explicit historical values (old array index × 37, zero for court) so
// procedural scenery never shifts when the public list grows.
function defineLegacyPlace(display, index) {
  const spawn = display.spawn ?? [-9, 0];
  const theater = display.id === 'theater';
  return deepFreeze({
    ...display,
    kind: theater ? 'venue' : 'environment',
    seed: index * 37,
    bounds: { ...LEGACY_URBAN_BOUNDS },
    spawn,
    companionSpawn: [spawn[0] + 0.8, spawn[1] + 1],
    shell: 'legacy-urban',
    builderKey: display.id,
    minimapPath: LEGACY_MINIMAP_PATHS[display.id],
    atmosphere: { preset: null, weatherMode: 'fixed', timeMode: 'fixed' },
    capabilities: theater
      ? { seating: true, sharedMedia: true, conferencing: false }
      : { seating: false, sharedMedia: false, conferencing: false },
    social: { featured: theater || display.id === 'court', legacy: true },
    exits: legacyExits(display.id),
    ...(theater ? { activities: ORPHEUM_ALL_ACTIVITIES } : {}),
    ...SOCIAL_PLACE_OVERRIDES[display.id],
  });
}

export const PLACE_DEFINITIONS = deepFreeze([...LEGACY_DISPLAY.map(defineLegacyPlace), DESERT_CAMP_DEFINITION]);

// Test-only tiny view: smaller bounds, no travel gates, no urban shell and no
// objective. It is deliberately NOT part of PLACE_DEFINITIONS (and never
// projected to the server); it exists so tests can prove the schema does not
// force a district-sized level. Its builder is registered by the tests that
// use it.
export const PLACE_VIEW_FIXTURE = deepFreeze({
  id: 'tiny-view',
  name: 'The Pocket Stage',
  kind: 'view',
  seed: LEGACY_DISTRICT_IDS.length * 37,
  bounds: Object.freeze({ minX: -3, maxX: 3, minZ: -2.5, maxZ: 2.5 }),
  spawn: [0, 0],
  companionSpawn: [0.8, 1],
  exits: [],
  minimapPath: 'M24 24H130V96H24Z',
  shell: 'none',
  builderKey: 'tinyView',
  atmosphere: { preset: null, weatherMode: 'fixed', timeMode: 'fixed' },
  capabilities: { seating: false, sharedMedia: false, conferencing: false },
  social: { featured: false, legacy: false },
  objective: null,
  note: null,
});

export function getPlaceDefinition(id) {
  return PLACE_DEFINITIONS.find(d => d.id === id);
}

const isCoord = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
const isHexColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const isPresetKey = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);

// Validates one definition and returns a list of problems (empty = valid).
// Pure metadata only: obstacle clearance and reachability are proven by
// builder tests, not here. `knownIds` (when given) additionally checks exit
// targets against known place ids plus the market.
export function validatePlaceDefinition(def, { knownIds = null } = {}) {
  const problems = [];
  const at = (ok, message) => { if (!ok) problems.push(message); };
  if (!def || typeof def !== 'object' || Array.isArray(def)) return ['definition is not an object'];

  at(typeof def.id === 'string' && /^[a-z0-9-]+$/.test(def.id), `id must be a kebab-case string, got ${JSON.stringify(def.id)}`);
  at(typeof def.name === 'string' && def.name.length > 0, 'name must be a non-empty string');
  at(PLACE_KINDS.includes(def.kind), `kind must be one of ${PLACE_KINDS.join(', ')}`);
  at(Number.isFinite(def.seed) && def.seed >= 0, 'seed must be a finite, non-negative number');

  const b = def.bounds;
  at(b && typeof b === 'object', 'bounds are required');
  const finiteBounds = !!b && ['minX', 'maxX', 'minZ', 'maxZ'].every(k => Number.isFinite(b[k]));
  at(finiteBounds, 'bounds must be finite numbers');
  if (finiteBounds) at(b.minX < b.maxX && b.minZ < b.maxZ, 'bounds must not be inverted');
  const insideBounds = c => finiteBounds && isCoord(c) && c[0] > b.minX && c[0] < b.maxX && c[1] > b.minZ && c[1] < b.maxZ;

  at(insideBounds(def.spawn), 'spawn must be a finite [x, z] pair strictly inside bounds');
  at(insideBounds(def.companionSpawn), 'companionSpawn must be a finite [x, z] pair strictly inside bounds');

  if (def.exits != null) {
    at(Array.isArray(def.exits), 'exits must be an array');
    for (const [i, exit] of (def.exits ?? []).entries()) {
      at(exit && typeof exit === 'object', `exits[${i}] must be an object`);
      at(typeof exit?.id === 'string' && exit.id.length > 0, `exits[${i}].id must be a non-empty string`);
      at(exit?.kind == null || ['district', 'market'].includes(exit.kind), `exits[${i}].kind must be 'district' or 'market'`);
      at(isCoord(exit?.position), `exits[${i}].position must be a finite [x, z] pair`);
      at(typeof exit?.target === 'string' && exit.target.length > 0, `exits[${i}].target must be a place id`);
      if (knownIds && typeof exit?.target === 'string') {
        at(exit.target === 'market' || knownIds.has(exit.target), `exits[${i}].target "${exit.target}" is not a known place`);
      }
    }
  }

  at(typeof def.minimapPath === 'string' && def.minimapPath.length > 0, 'minimapPath must be a non-empty SVG path string');
  at(PLACE_SHELLS.includes(def.shell), `shell must be one of ${PLACE_SHELLS.join(', ')}`);
  at(typeof def.builderKey === 'string' && def.builderKey.length > 0, 'builderKey must be a non-empty string (registry resolves it to a function)');

  const atmosphere = def.atmosphere;
  at(atmosphere && typeof atmosphere === 'object', 'atmosphere configuration is required');
  if (atmosphere) {
    at(atmosphere.preset === null || isPresetKey(atmosphere.preset), 'atmosphere.preset must be null or a preset key');
    at(PLACE_WEATHER_MODES.includes(atmosphere.weatherMode), `atmosphere.weatherMode must be one of ${PLACE_WEATHER_MODES.join(', ')}`);
    at(PLACE_TIME_MODES.includes(atmosphere.timeMode), `atmosphere.timeMode must be one of ${PLACE_TIME_MODES.join(', ')}`);
  }

  const capabilities = def.capabilities;
  at(capabilities && typeof capabilities === 'object', 'capabilities are required');
  if (capabilities) {
    for (const [key, value] of Object.entries(capabilities)) {
      at(PLACE_CAPABILITIES.includes(key), `unknown capability: ${key}`);
      at(typeof value === 'boolean', `capability ${key} must be a boolean`);
    }
    for (const key of ['seating', 'sharedMedia', 'conferencing']) {
      at(typeof capabilities[key] === 'boolean', `capability ${key} must be declared`);
    }
    if (capabilities.activities !== undefined) {
      at(typeof capabilities.activities === 'boolean', 'capability activities must be a boolean');
    }
  }

  const social = def.social;
  at(social && typeof social === 'object' && typeof social.featured === 'boolean' && typeof social.legacy === 'boolean',
    'social must declare boolean featured and legacy flags');

  if (def.color != null) at(isHexColor(def.color), 'color must be a #rrggbb hex string');
  if (def.sun != null) at(isHexColor(def.sun), 'sun must be a #rrggbb hex string');

  // Restoration metadata is optional for social places, but a *present*
  // tuple must be complete: objective, action, done, message and landmark
  // travel together; so do note, noteTitle and noteBody.
  const hasObjective = def.objective != null;
  const objectiveParts = [def.action, def.done, def.message, def.landmark];
  if (hasObjective) {
    at(typeof def.objective === 'string' && def.objective.length > 0, 'objective must be a non-empty string when present');
    at(objectiveParts.every(part => part != null), 'objective tuple is incomplete: action, done, message and landmark are required alongside objective');
    if (def.landmark != null) at(isCoord(def.landmark), 'landmark must be a finite [x, z] pair');
  } else {
    at(!objectiveParts.some(part => part != null), 'restoration fields (action/done/message/landmark) require an objective; social places stay objective-free');
  }
  const noteParts = [def.noteTitle, def.noteBody];
  if (def.note != null) {
    at(isCoord(def.note), 'note must be a finite [x, z] pair');
    at(noteParts.every(part => part != null), 'note tuple is incomplete: noteTitle and noteBody are required alongside note');
  } else {
    at(!noteParts.some(part => part != null), 'note fields (noteTitle/noteBody) require a note position; social places stay note-free');
  }

  if (def.activities != null) {
    at(Array.isArray(def.activities), 'activities must be an array');
    if (Array.isArray(def.activities)) {
      at(def.activities.length <= MAX_ACTIVITIES_PER_PLACE, `activities list exceeds maximum of ${MAX_ACTIVITIES_PER_PLACE}`);
      const seenActIds = new Set();
      for (const [idx, act] of def.activities.entries()) {
        const actId = act?.id ?? `index_${idx}`;
        if (act && typeof act.id === 'string') {
          if (seenActIds.has(act.id)) {
            problems.push(`activity "${act.id}": duplicate activity id`);
          }
          seenActIds.add(act.id);
        }
        const actProblems = validateActivityDefinition(act, { placeBounds: def.bounds });
        for (const prob of actProblems) {
          problems.push(`activity "${actId}": ${prob}`);
        }
      }
    }
  }

  return problems;
}

export function validateActivityDefinition(activity, { placeBounds = null } = {}) {
  const problems = [];
  const at = (ok, message) => { if (!ok) problems.push(message); };

  if (!activity || typeof activity !== 'object' || Array.isArray(activity)) {
    return ['activity must be an object'];
  }

  const id = activity.id;
  at(typeof id === 'string' && /^[a-z0-9-]+$/.test(id), `id must be a kebab-case string, got ${JSON.stringify(id)}`);

  at(ACTIVITY_TYPES.includes(activity.type), `unknown activity type: "${activity.type}"`);

  at(Number.isInteger(activity.rulesVersion) && activity.rulesVersion >= 1, 'rulesVersion must be an integer >= 1');

  // Cabinet presentation block (canonical arcade system): validated here so a
  // malformed skin fails loudly at projection/test time, never as a broken
  // machine in the world. Client-only — the server projection drops it.
  if (activity.cabinet !== undefined) {
    const cab = activity.cabinet;
    at(cab && typeof cab === 'object' && !Array.isArray(cab), 'cabinet must be an object');
    if (cab && typeof cab === 'object' && !Array.isArray(cab)) {
      const CABINET_MODELS = ['upright'];
      at(CABINET_MODELS.includes(cab.model), `cabinet.model must be one of ${CABINET_MODELS.join(', ')}`);
      const hex = (value) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
      const skin = cab.skin ?? {};
      at(typeof skin === 'object' && !Array.isArray(skin), 'cabinet.skin must be an object');
      if (skin && typeof skin === 'object' && !Array.isArray(skin)) {
        if (skin.title !== undefined) at(typeof skin.title === 'string' && skin.title.length <= 24, 'cabinet.skin.title must be a string of at most 24 characters');
        if (skin.motif !== undefined) at(typeof skin.motif === 'string' && skin.motif.length > 0, 'cabinet.skin.motif must be a non-empty string');
        const palette = skin.palette ?? {};
        for (const key of Object.keys(palette)) {
          at(hex(palette[key]), `cabinet.skin.palette.${key} must be a #rrggbb hex color`);
        }
        const files = skin.files ?? {};
        for (const key of Object.keys(files)) {
          at(typeof files[key] === 'string' && files[key].length > 0, `cabinet.skin.files.${key} must be a non-empty file name`);
        }
      }
      if (cab.led !== undefined) {
        const led = cab.led ?? {};
        at(typeof led === 'object' && !Array.isArray(led), 'cabinet.led must be an object');
        if (led && typeof led === 'object' && !Array.isArray(led)) {
          if (led.color !== undefined) at(hex(led.color), 'cabinet.led.color must be a #rrggbb hex color');
          if (led.intensity !== undefined) at(Number.isFinite(led.intensity) && led.intensity >= 0, 'cabinet.led.intensity must be a finite number >= 0');
        }
      }
      if (cab.controls !== undefined) {
        const controls = cab.controls ?? {};
        at(typeof controls === 'object' && !Array.isArray(controls), 'cabinet.controls must be an object');
        if (controls && typeof controls === 'object' && !Array.isArray(controls)) {
          for (const key of Object.keys(controls)) {
            at(hex(controls[key]), `cabinet.controls.${key} must be a #rrggbb hex color`);
          }
        }
      }
      if (cab.screen !== undefined) {
        const screen = cab.screen ?? {};
        at(typeof screen === 'object' && !Array.isArray(screen), 'cabinet.screen must be an object');
        if (screen && typeof screen === 'object' && !Array.isArray(screen)) {
          at(['canvas', 'image', 'video'].includes(screen.type), 'cabinet.screen.type must be "canvas", "image" or "video"');
        }
      }
    }
  }

  const transform = activity.transform;
  at(transform && typeof transform === 'object', 'transform must be an object');
  if (transform) {
    const pos = transform.position;
    const isPosValid = Array.isArray(pos) && (pos.length === 2 || pos.length === 3) && pos.every(Number.isFinite);
    at(isPosValid, 'transform.position must be a finite [x, z] or [x, y, z] array');
    if (isPosValid && placeBounds) {
      const x = pos[0];
      const z = pos.length === 3 ? pos[2] : pos[1];
      at(x > placeBounds.minX && x < placeBounds.maxX && z > placeBounds.minZ && z < placeBounds.maxZ,
        `transform.position [${x}, ${z}] is outside place bounds`);
    }
    if (transform.rotationY !== undefined) {
      at(Number.isFinite(transform.rotationY), 'transform.rotationY must be a finite number');
    }
  }

  const footprint = activity.footprint;
  at(footprint && typeof footprint === 'object', 'footprint must be an object');
  if (footprint) {
    at(Number.isFinite(footprint.width) && footprint.width > 0, 'footprint.width must be a positive finite number');
    at(Number.isFinite(footprint.depth) && footprint.depth > 0, 'footprint.depth must be a positive finite number');
  }

  at(Number.isFinite(activity.interactionRadius) && activity.interactionRadius > 0,
    'interactionRadius must be a positive finite number');

  const anchors = activity.participantAnchors;
  at(Array.isArray(anchors) && anchors.length > 0, 'participantAnchors must be a non-empty array');
  if (Array.isArray(anchors)) {
    for (const [idx, anchor] of anchors.entries()) {
      at(anchor && typeof anchor === 'object', `participantAnchors[${idx}] must be an object`);
      if (anchor) {
        at(anchor.slot !== undefined && (typeof anchor.slot === 'string' || Number.isInteger(anchor.slot)),
          `participantAnchors[${idx}].slot must be a string or integer`);
        const aPos = anchor.position;
        const isAPosValid = Array.isArray(aPos) && (aPos.length === 2 || aPos.length === 3) && aPos.every(Number.isFinite);
        at(isAPosValid, `participantAnchors[${idx}].position must be a finite [x, z] or [x, y, z] array`);
        if (isAPosValid && placeBounds) {
          const ax = aPos[0];
          const az = aPos.length === 3 ? aPos[2] : aPos[1];
          at(ax > placeBounds.minX && ax < placeBounds.maxX && az > placeBounds.minZ && az < placeBounds.maxZ,
            `anchor for slot "${anchor.slot}" position [${ax}, ${az}] is outside place bounds`);
        }
        if (anchor.facing !== undefined) {
          at(Number.isFinite(anchor.facing), `participantAnchors[${idx}].facing must be a finite number`);
        }
      }
    }
  }

  const caps = activity.capacities;
  at(caps && typeof caps === 'object', 'capacities must be an object');
  if (caps) {
    at(Number.isInteger(caps.players) && caps.players >= 1 && caps.players <= 8,
      'capacities.players must be an integer between 1 and 8');
    at(Number.isInteger(caps.spectators) && caps.spectators >= 0 && caps.spectators <= 32,
      'capacities.spectators must be an integer between 0 and 32');
    at(Number.isInteger(caps.queue) && caps.queue >= 0 && caps.queue <= 16,
      'capacities.queue must be an integer between 0 and 16');
  }

  // Race-style activity fields (add-multiplayer-snowboard-arcade): additive
  // and optional for every type, but a present value must be sane, and the
  // snowboard race must carry the complete admission/ready/course contract.
  if (activity.minPlayers !== undefined) {
    at(Number.isInteger(activity.minPlayers) && activity.minPlayers >= 1, 'minPlayers must be an integer >= 1');
    if (caps && Number.isInteger(caps.players)) {
      at(activity.minPlayers <= caps.players, 'minPlayers must not exceed capacities.players');
    }
  }
  if (activity.readyPolicy !== undefined) {
    at(['auto', 'explicit'].includes(activity.readyPolicy), 'readyPolicy must be "auto" or "explicit"');
  }
  if (activity.course !== undefined) {
    const course = activity.course ?? {};
    at(typeof course === 'object' && !Array.isArray(course), 'course must be an object');
    if (course && typeof course === 'object' && !Array.isArray(course)) {
      at(typeof course.id === 'string' && /^[a-z0-9-]+$/.test(course.id), 'course.id must be a kebab-case string');
      at(Number.isInteger(course.version) && course.version >= 1, 'course.version must be an integer >= 1');
    }
  }
  if (activity.type === 'snowboard-race') {
    at(activity.minPlayers !== undefined, 'snowboard-race requires minPlayers');
    at(activity.readyPolicy === 'explicit', 'snowboard-race uses explicit readiness (readyPolicy "explicit")');
    at(activity.course !== undefined, 'snowboard-race requires course metadata');
  }

  const envPolicy = activity.environmentPolicy ?? 'none';
  at(ACTIVITY_ENVIRONMENT_POLICIES.includes(envPolicy),
    `environmentPolicy must be one of ${ACTIVITY_ENVIRONMENT_POLICIES.join(', ')}`);

  const specPolicy = activity.spectatorPolicy ?? 'world';
  at(ACTIVITY_SPECTATOR_POLICIES.includes(specPolicy),
    `spectatorPolicy must be one of ${ACTIVITY_SPECTATOR_POLICIES.join(', ')}`);

  at(typeof activity.rendererKey === 'string' && activity.rendererKey.length > 0,
    'rendererKey must be a non-empty string');
  at(typeof activity.controllerKey === 'string' && activity.controllerKey.length > 0,
    'controllerKey must be a non-empty string');

  return problems;
}

export function placeHasCapability(place, capability) {
  if (!place) return false;
  if (place.capabilities && typeof place.capabilities[capability] === 'boolean') {
    return place.capabilities[capability];
  }
  if (capability === 'activities') {
    return Array.isArray(place.activities) && place.activities.length > 0;
  }
  return false;
}

export function getPlaceActivities(placeOrId) {
  const def = typeof placeOrId === 'string' ? getPlaceDefinition(placeOrId) : placeOrId;
  return def?.activities ?? [];
}

// Validates a whole list: per-definition problems plus duplicate ids, each
// reported with the offending definition's id. Exit targets may reference any
// registered public place, not just siblings in the same list.
export function validatePlaceDefinitions(list) {
  const knownIds = new Set(PLACE_DEFINITIONS.map(def => def.id));
  for (const def of list) if (def && typeof def.id === 'string') knownIds.add(def.id);
  const idCounts = new Map();
  for (const def of list) if (def && typeof def.id === 'string') idCounts.set(def.id, (idCounts.get(def.id) ?? 0) + 1);

  const reports = [];
  for (const [index, def] of list.entries()) {
    const problems = validatePlaceDefinition(def, { knownIds });
    if (def && typeof def.id === 'string' && idCounts.get(def.id) > 1) problems.push('duplicate id');
    if (problems.length > 0) reports.push({ id: def?.id ?? `index ${index}`, problems });
  }
  return reports;
}
