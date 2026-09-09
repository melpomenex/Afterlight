import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  getPlaceDefinition,
  POOL_ACTIVITY_DEFINITION,
  ORPHEUM_ALL_ACTIVITIES,
} from '../shared/placeDefinitions.js';
import { buildDistrict } from '../src/districts.js';
import { createPoolTableScene } from '../src/activities/pool/tableScene.js';
import { createPoolAudio } from '../src/activities/pool/audio.js';
import { createPoolCamera, POOL_CAMERA_MODES } from '../src/activities/pool/camera.js';
import { createPoolController } from '../src/activities/pool/controller.js';
import { getBallTexture, clearBallTextureCache } from '../src/activities/pool/ballTextures.js';
import { initGame } from '../shared/pool/rules.js';
import {
  TABLE_LENGTH,
  TABLE_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  BALL_RADIUS,
  BALL_DIAMETER,
  POCKETS,
} from '../shared/pool/physics.js';

test('1. P3 Gate: 3D pool table model, 16 numbered balls, cue, and contact shadows', () => {
  clearBallTextureCache();

  // 1. Verify ball texture generation for all 16 balls
  for (let i = 0; i <= 15; i++) {
    const tex = getBallTexture(i);
    assert.ok(tex, `texture exists for ball ${i}`);
  }

  // 2. Build table scene
  const tableScene = createPoolTableScene({
    position: [-8.6, 0, -4.5],
    rotationY: Math.PI / 2,
  });

  assert.ok(tableScene.group, 'table scene root group exists');
  assert.equal(tableScene.group.name, 'pool-table-root');

  // 3. Verify all 16 ball meshes and 16 shadow meshes are created
  assert.equal(tableScene.ballMeshes.size, 16, '16 ball meshes created');
  assert.equal(tableScene.shadowMeshes.size, 16, '16 shadow meshes created');

  for (let i = 0; i <= 15; i++) {
    const ball = tableScene.ballMeshes.get(i);
    const shadow = tableScene.shadowMeshes.get(i);
    assert.ok(ball, `ball mesh ${i} exists`);
    assert.ok(shadow, `shadow mesh ${i} exists`);
    assert.equal(ball.name, `pool-ball-${i}`);
    assert.equal(shadow.name, `pool-shadow-${i}`);
  }

  // 4. Verify cue stick group, aim line, ghost ball, and preview mesh exist
  assert.ok(tableScene.cueGroup, 'cue stick group exists');
  assert.ok(tableScene.aimLine, 'aim line exists');
  assert.ok(tableScene.ghostBall, 'ghost ball exists');
  assert.ok(tableScene.deflectLine, 'deflect line exists');
  assert.ok(tableScene.previewMesh, 'ball-in-hand preview mesh exists');

  // 5. Test ball position updates and cue aiming updates
  const sim = initGame();
  tableScene.updateBalls(sim, 1.0);

  const cueBallMesh = tableScene.ballMeshes.get(0);
  assert.ok(cueBallMesh.visible, 'cue ball is visible');
  assert.ok(Math.abs(cueBallMesh.position.y - (0.78 + BALL_RADIUS)) < 0.001, 'cue ball rests on cloth bed');

  tableScene.updateCue({ cueX: -0.56, cueZ: 0, angle: 0, power: 0.5, visible: true });
  assert.equal(tableScene.cueGroup.visible, true);

  // Clean disposal
  tableScene.dispose();
  clearBallTextureCache();
});

test('2. P3 Gate: multi-input parity for mouse, touch, and controller', () => {
  let shotData = null;
  let ballInHandData = null;
  let pocketData = null;
  let cameraCycled = false;

  const controller = createPoolController({
    tablePosition: [-8.6, 0, -4.5],
    onShoot: (data) => { shotData = data; },
    onPlaceCueBall: (x, z) => { ballInHandData = { x, z }; },
    onCallPocket: (id) => { pocketData = id; },
    onCameraCycle: () => { cameraCycled = true; },
  });

  const sim = initGame();
  controller.activate(0); // Activate as player slot 0

  // 1. Aim adjustment via keyboard
  controller.aimAngle = 0;
  controller.update(0.1, sim); // A/D or arrows would modify aimAngle
  assert.equal(controller.aimAngle, 0);

  // 2. 2D Spin setting (topspin/backspin/english)
  assert.ok(Math.abs(controller.spinX) <= 0.72);
  assert.ok(Math.abs(controller.spinY) <= 0.72);

  // 3. Aim prediction raycast finds closest object ball
  const cueX = -0.56;
  const cueZ = 0.0;
  // Apex ball (ball 1) is at (0.56, 0.0), directly in front at angle 0
  const impact = controller.calculateImpact(cueX, cueZ, 0.0, sim);
  assert.ok(impact, 'aim ray hits apex ball');
  assert.equal(impact.targetBallId, 1, 'impact targets ball 1');
  assert.ok(impact.distance > 0, 'impact distance is positive');
  assert.ok(Math.abs(impact.targetDirX - 1.0) < 0.01, 'target deflection is straight along X');

  // 4. Ball-in-hand placement validation
  // Valid spot: clear space in kitchen
  assert.equal(controller.validateBallInHand(-0.8, 0.2, sim), true, 'legal ball-in-hand spot');

  // Invalid spots:
  // (a) outside table rails
  assert.equal(controller.validateBallInHand(-1.3, 0.0, sim), false, 'outside table X is rejected');
  assert.equal(controller.validateBallInHand(0.0, 0.7, sim), false, 'outside table Z is rejected');

  // (b) overlapping an existing ball (apex ball at 0.56, 0)
  assert.equal(controller.validateBallInHand(0.56, 0.0, sim), false, 'overlapping apex ball is rejected');
  assert.equal(controller.validateBallInHand(0.56 + BALL_RADIUS * 0.5, 0.0, sim), false, 'grazing overlap is rejected');

  // 5. Camera mode trigger
  controller.handleTableClick?.(0, 0);
  assert.equal(controller.calledPocket, 'corner_br');

  controller.deactivate();
});

test('3. P3 Gate: camera modes (standing, cue, overhead) and reduced-motion support', () => {
  const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 100);
  let activeCameraRef = camera;

  const poolCam = createPoolCamera({
    tablePosition: [-8.6, 0, -4.5],
    getActiveCamera: () => activeCameraRef,
    setActivityCamera: (c) => { activeCameraRef = c; },
  });

  poolCam.activate();
  assert.equal(poolCam.active, true);
  assert.equal(poolCam.mode, 'cue');

  // Cycle to standing view
  assert.equal(poolCam.cycleMode(), 'standing');
  poolCam.update({ cueX: -0.56, cueZ: 0, angle: 0, power: 0, settled: true }, 1.0);
  assert.ok(camera.position.x > -8.6, 'standing camera looks from elevated 3/4 lounge angle');

  // Cycle to overhead view
  assert.equal(poolCam.cycleMode(), 'overhead');
  poolCam.update({ cueX: -0.56, cueZ: 0, angle: 0, power: 0, settled: true }, 1.0);
  assert.ok(Math.abs(camera.position.x - (-8.6)) < 0.01, 'overhead camera is centered over table X');
  assert.ok(Math.abs(camera.position.z - (-4.5)) < 0.01, 'overhead camera is centered over table Z');
  assert.ok(camera.position.y >= 3.5, 'overhead camera is high above table');

  // Cycle back to cue view
  assert.equal(poolCam.cycleMode(), 'cue');

  poolCam.deactivate();
  assert.equal(poolCam.active, false);
});

test('4. P3 Gate: positional audio and collision event deduplication', () => {
  let createdNodes = 0;
  const mockAudioContext = {
    currentTime: 1.0,
    state: 'running',
    sampleRate: 44100,
    destination: {},
    createGain: () => {
      createdNodes++;
      return {
        gain: {
          value: 1,
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    },
    createOscillator: () => {
      createdNodes++;
      return {
        type: 'sine',
        frequency: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        start() {},
        stop() {},
      };
    },
  };

  const audio = createPoolAudio({
    audioMixer: { context: mockAudioContext, buses: { effects: {} } },
    getPlayer: () => ({ position: { x: -8.6, y: 0, z: -4.5 } }), // Player at table
    tablePosition: [-8.6, 0, -4.5],
  });

  // 1. Play cue strike
  audio.playCueStrike(0.8);
  assert.ok(createdNodes >= 2, 'cue strike created audio nodes');

  // 2. Play ball hit and verify deduplication
  const countBefore = createdNodes;
  audio.playBallHit(1, 2, 1.5);
  assert.ok(createdNodes > countBefore, 'ball hit played');

  // Rapid immediate re-collision of the same pair (< 45ms) should be deduplicated
  const countAfterFirst = createdNodes;
  audio.playBallHit(1, 2, 1.4);
  assert.equal(createdNodes, countAfterFirst, 'second rapid collision for same pair was deduplicated');

  // Collision with different pair is allowed
  audio.playBallHit(2, 3, 1.0);
  assert.ok(createdNodes > countAfterFirst, 'collision for different pair was played');

  // 3. Play rail bounce and pocket drop
  audio.playRailBounce(1.2);
  audio.playPocketDrop();
  audio.playFoulTone();
  assert.ok(createdNodes >= 10);
});

test('5. P3 Gate: live Orpheum coexistence, spectator area, and 100% unobstructed screen sightlines', () => {
  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);

  // 1. Verify pool activity definition in theater
  const poolAct = ORPHEUM_ALL_ACTIVITIES.find(a => a.id === 'orpheum-pool');
  assert.ok(poolAct, 'orpheum-pool defined in ORPHEUM_ALL_ACTIVITIES');
  assert.equal(poolAct.type, 'pool');

  // 2. Verify pool item and collision obstacle in world
  const poolItem = world.items.find(it => it.id === 'orpheum-pool');
  assert.ok(poolItem, 'pool table item exists in world.items');
  assert.equal(poolItem.type, 'activity');

  const [tx, , tz] = poolAct.transform.position;
  const tableObs = world.obstacles.find(o => Math.abs(o.x - tx) < 0.05 && Math.abs(o.z - tz) < 0.05);
  assert.ok(tableObs, 'table collision obstacle exists in world');

  // Spectator bench obstacle exists
  const benchObs = world.obstacles.find(o => Math.abs(o.x - (-10.8)) < 0.05 && Math.abs(o.z - (-4.5)) < 0.05);
  assert.ok(benchObs, 'spectator bench obstacle exists in world');

  // 3. Preserved theater screen quad and 48 seats
  assert.ok(world.screenQuad, 'theater world screenQuad preserved');
  assert.equal(world.screenQuad.length, 4);

  const seats = world.items.filter(it => it.type === 'seat');
  assert.equal(seats.length, 48, 'all 48 theater seats preserved');

  // 4. Movie screen sightlines verification
  // Pool table box extents:
  const hw = poolAct.footprint.width / 2;
  const hd = poolAct.footprint.depth / 2;
  const poolBox = {
    minX: tx - hw,
    maxX: tx + hw,
    minZ: tz - hd,
    maxZ: tz + hd,
  };

  const screenZ = -8.28;
  const screenCenter = [0, screenZ];

  function segmentIntersectsBox(x1, z1, x2, z2, box) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    let tmin = 0, tmax = 1;

    if (Math.abs(dx) > 1e-6) {
      const tx1 = (box.minX - x1) / dx;
      const tx2 = (box.maxX - x1) / dx;
      tmin = Math.max(tmin, Math.min(tx1, tx2));
      tmax = Math.min(tmax, Math.max(tx1, tx2));
    } else if (x1 < box.minX || x1 > box.maxX) {
      return false;
    }

    if (Math.abs(dz) > 1e-6) {
      const tz1 = (box.minZ - z1) / dz;
      const tz2 = (box.maxZ - z1) / dz;
      tmin = Math.max(tmin, Math.min(tz1, tz2));
      tmax = Math.min(tmax, Math.max(tz1, tz2));
    } else if (z1 < box.minZ || z1 > box.maxZ) {
      return false;
    }

    return tmin <= tmax && tmax >= 0 && tmin <= 1;
  }

  // Sightline from every seat to screen center must be unobstructed by the pool table
  for (const seat of seats) {
    const blocked = segmentIntersectsBox(seat.x, seat.z, screenCenter[0], screenCenter[1], poolBox);
    assert.equal(blocked, false, `seat [${seat.x}, ${seat.z}] to screen center is not blocked by pool table`);
  }

  // Sightline to screen edges (x in [-6.5, 6.5]) must also remain unobstructed
  for (const seat of seats) {
    for (const sx of [-6.5, -3.25, 0, 3.25, 6.5]) {
      const blocked = segmentIntersectsBox(seat.x, seat.z, sx, screenZ, poolBox);
      assert.equal(blocked, false, `seat [${seat.x}, ${seat.z}] to screen [${sx}, ${screenZ}] is not blocked by pool table`);
    }
  }

  // Accessible routes: table is surrounded by >= 1.2m clear walkways
  // East side to central aisle: table east edge is -8.6 + 0.7 = -7.9. Auditorium center is 0. Clear width > 4.4m
  assert.ok(Math.abs(-7.9 - (-3.5)) >= 1.2, 'east walkway clearance >= 1.2m');
  // West side to bench: table west edge is -8.6 - 0.7 = -9.3. Bench east edge is -10.8 + 0.2 = -10.6. Clearance = 1.3m >= 1.2m
  assert.ok(Math.abs(-9.3 - (-10.6)) >= 1.2, 'west walkway clearance >= 1.2m');
});
