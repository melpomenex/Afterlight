import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseActivityDismount,
  findAnchorForSlot,
  createParticipationController,
} from '../src/activities/participation.js';
import { createInteractionRegistry, registerCoreInteractions } from '../src/social/interactions.js';
import { buildPlaceWorld } from '../src/places/worldFactory.js';
import { registerPlaceBuilder } from '../src/places/registry.js';
import { PLACE_DEFINITIONS } from '../shared/placeDefinitions.js';

test('findAnchorForSlot finds authored anchors by slot ID, index, or defaults to first', () => {
  const activityDef = {
    id: 'pong',
    participantAnchors: [
      { slot: 1, position: [-2, 0, 1], facing: 1.57 },
      { slot: 2, position: [2, 0, 1], facing: -1.57 },
    ],
  };

  assert.equal(findAnchorForSlot(activityDef, 1), activityDef.participantAnchors[0]);
  assert.equal(findAnchorForSlot(activityDef, '1'), activityDef.participantAnchors[0]);
  assert.equal(findAnchorForSlot(activityDef, 2), activityDef.participantAnchors[1]);
  assert.equal(findAnchorForSlot(activityDef, '2'), activityDef.participantAnchors[1]);
  // Unknown slot falls back to first anchor
  assert.equal(findAnchorForSlot(activityDef, 99), activityDef.participantAnchors[0]);
  assert.equal(findAnchorForSlot(activityDef, null), activityDef.participantAnchors[0]);

  // Empty or missing anchors
  assert.equal(findAnchorForSlot(null, 1), null);
  assert.equal(findAnchorForSlot({}, 1), null);
  assert.equal(findAnchorForSlot({ participantAnchors: [] }, 1), null);
});

test('chooseActivityDismount picks first walkable authored dismount point', () => {
  const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  const obstacles = [{ x: 1, z: 2, w: 0.5, d: 0.5 }];
  const isWalkable = (b, obs, x, z) => {
    if (x <= b.minX || x >= b.maxX || z <= b.minZ || z >= b.maxZ) return false;
    for (const o of obs) {
      if (Math.abs(x - o.x) < o.w && Math.abs(z - o.z) < o.d) return false;
    }
    return true;
  };

  const anchor = {
    slot: 1,
    position: [0, 0, 2],
    facing: 0,
    dismount: [
      { x: 1, z: 2 }, // blocked by obstacle
      { x: 0, z: 1 }, // clear
      { x: 0, z: 3 }, // clear
    ],
  };

  const result = chooseActivityDismount(anchor, null, {
    bounds,
    obstacles,
    isWalkable,
    spawn: [-5, -5],
  });

  assert.deepEqual(result, { x: 0, z: 1, fallback: false });
});

test('chooseActivityDismount computes directional step-out candidates when authored points are missing or blocked', () => {
  const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  const obstacles = [];
  const isWalkable = () => true;

  // Anchor at (0, 2) facing 0 (+Z)
  // Step-back should be (0 - sin(0)*0.8, 2 - cos(0)*0.8) = (0, 1.2)
  const anchor = {
    slot: 1,
    position: [0, 0, 2],
    facing: 0,
  };

  const result = chooseActivityDismount(anchor, null, {
    bounds,
    obstacles,
    isWalkable,
    spawn: [-5, -5],
  });

  assert.equal(result.fallback, false);
  assert.ok(Math.abs(result.x - 0) < 0.001);
  assert.ok(Math.abs(result.z - 1.2) < 0.001);
});

test('chooseActivityDismount falls back to safe spawn when all candidates are blocked', () => {
  const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  // isWalkable returns false for everything
  const isWalkable = () => false;

  const anchor = {
    slot: 1,
    position: [0, 0, 2],
    facing: 0,
    dismount: [{ x: 0, z: 1 }],
  };

  const result = chooseActivityDismount(anchor, null, {
    bounds,
    obstacles: [],
    isWalkable,
    spawn: [-5, 4],
  });

  assert.deepEqual(result, { x: -5, z: 4, fallback: true });
});

test('chooseActivityDismount falls back to anchor position as last resort when spawn is missing', () => {
  const isWalkable = () => false;
  const anchor = {
    slot: 1,
    position: [2.5, 0, 3.5],
    facing: 0,
  };

  const result = chooseActivityDismount(anchor, null, {
    bounds: null,
    obstacles: [],
    isWalkable,
    spawn: null,
  });

  assert.deepEqual(result, { x: 2.5, z: 3.5, fallback: true });
});

test('createParticipationController manages complete join -> participate -> leave lifecycle', () => {
  const sentMessages = [];
  const toasts = [];
  const stateChanges = [];
  let avatarPos = { x: 0, y: 0, z: 0 };
  let avatarRot = 0;
  let legRotations = [0, 0];
  let movementCleared = false;
  let movementSent = null;

  const net = {
    sendActivityJoin: (payload) => sentMessages.push(['join', payload]),
    sendActivityLeave: (payload) => sentMessages.push(['leave', payload]),
    sendActivityReady: (payload) => sentMessages.push(['ready', payload]),
  };

  const activityDef = {
    id: 'pong',
    title: 'Retro Pong',
    participantAnchors: [
      { slot: 1, position: [-1.5, 0, 0], facing: 1.57, dismount: [{ x: -2.5, z: 0 }] },
      { slot: 2, position: [1.5, 0, 0], facing: -1.57, dismount: [{ x: 2.5, z: 0 }] },
    ],
  };

  const controller = createParticipationController({
    net,
    applyAnchor: (anchor) => {
      avatarPos.x = anchor.position[0];
      avatarPos.z = anchor.position.length === 3 ? anchor.position[2] : anchor.position[1];
      avatarRot = anchor.facing;
      legRotations = [0, 0];
    },
    applyDismount: (pt) => {
      avatarPos.x = pt.x;
      avatarPos.z = pt.z;
      legRotations = [0, 0];
    },
    worldFacts: () => ({
      bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
      obstacles: [],
      isWalkable: () => true,
      spawn: [-8, 0],
    }),
    sendMovement: (sitting) => { movementSent = sitting; },
    clearMovement: () => { movementCleared = true; },
    toast: (title, body, tag) => toasts.push({ title, body, tag }),
    getRoomId: () => 'theater',
    onStateChange: (state, details) => stateChanges.push({ state, details }),
  });

  assert.equal(controller.state, 'idle');
  assert.equal(controller.isOccupied, false);

  // 1. Join request
  const joined = controller.join(activityDef, { role: 'player' });
  assert.equal(joined, true);
  assert.equal(controller.state, 'joining');
  assert.equal(controller.isJoining, true);
  assert.equal(controller.isOccupied, true);
  assert.deepEqual(sentMessages.at(-1), ['join', { roomId: 'theater', activityId: 'pong', role: 'play', requestedSlot: null }]);

  // 2. Server acceptance
  const accepted = controller.handleResult({
    activityId: 'pong',
    status: 'seated',
    role: 'player',
    slot: 1,
    lease: 'lease_abc123',
  });
  assert.equal(accepted, true);
  assert.equal(controller.state, 'participating');
  assert.equal(controller.isParticipating, true);
  assert.equal(controller.currentSlot, 1);
  assert.equal(controller.lease, 'lease_abc123');
  // Accepting the seat readies the player server-side (match starts when
  // every seated player is ready).
  assert.deepEqual(sentMessages.at(-1), ['ready', { activityId: 'pong', ready: true }]);

  // Avatar snapped to anchor 1
  assert.equal(avatarPos.x, -1.5);
  assert.equal(avatarPos.z, 0);
  assert.equal(avatarRot, 1.57);
  assert.equal(movementCleared, true);

  // 3. Leave request (safe dismount)
  movementCleared = false;
  const left = controller.leave();
  assert.equal(left, true);
  assert.equal(controller.state, 'idle');
  assert.equal(controller.isOccupied, false);
  assert.deepEqual(sentMessages.at(-1), ['leave', { roomId: 'theater', activityId: 'pong' }]);

  // Avatar landed at authored dismount point (-2.5, 0)
  assert.equal(avatarPos.x, -2.5);
  assert.equal(avatarPos.z, 0);
  assert.equal(movementCleared, true);
});

test('silent leave/cancel suppress the toast but still send the protocol leave (transport loss)', () => {
  const toasts = [];
  const sentMessages = [];
  const net = {
    sendActivityJoin: (payload) => sentMessages.push(['join', payload]),
    sendActivityLeave: (payload) => sentMessages.push(['leave', payload]),
    sendActivityReady: (payload) => sentMessages.push(['ready', payload]),
  };
  const activityDef = { id: 'orpheum-kart-royale', title: 'Kart Royale', type: 'kart-royale' };

  const controller = createParticipationController({
    net,
    toast: (title, body, tag) => toasts.push({ title, body, tag }),
    getRoomId: () => 'theater',
    worldFacts: () => ({
      bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
      obstacles: [],
      isWalkable: () => true,
      spawn: [-8, 0],
    }),
    applyAnchor: () => {},
    applyDismount: () => {},
  });

  // Seated, then the transport dies (superseded by another tab): the
  // controller exits with a silent leave so the connection toast — not a
  // misleading "Left Kart Royale" — explains what happened.
  controller.join(activityDef, { role: 'player' });
  controller.handleResult({ activityId: activityDef.id, status: 'seated', role: 'player', slot: 0 });
  toasts.length = 0;

  const left = controller.leave({ silent: true });
  assert.equal(left, true);
  assert.equal(controller.state, 'idle');
  assert.deepEqual(sentMessages.at(-1), ['leave', { roomId: 'theater', activityId: activityDef.id }]);
  assert.deepEqual(toasts, [], 'transport-loss leave stays quiet');

  // Same contract for a cancel while the join is still pending.
  controller.join(activityDef, { role: 'player' });
  toasts.length = 0;
  const cancelled = controller.cancelJoin({ silent: true });
  assert.equal(cancelled, true);
  assert.equal(controller.state, 'idle');
  assert.deepEqual(toasts, [], 'transport-loss cancel stays quiet');
});

test('cancelJoin cancels a pending join request cleanly', () => {
  const sentMessages = [];
  const net = {
    sendActivityJoin: (payload) => sentMessages.push(['join', payload]),
    sendActivityLeave: (payload) => sentMessages.push(['leave', payload]),
  };

  const controller = createParticipationController({
    net,
    getRoomId: () => 'court',
  });

  controller.join({ id: 'chess' });
  assert.equal(controller.state, 'joining');

  controller.cancelJoin();
  assert.equal(controller.state, 'idle');
  assert.deepEqual(sentMessages.at(-1), ['leave', { roomId: 'court', activityId: 'chess' }]);
});

test('handleResult supports queued and watching spectator roles', () => {
  const toasts = [];
  const controller = createParticipationController({
    toast: (title, body, tag) => toasts.push({ title, body, tag }),
    getRoomId: () => 'theater',
  });

  // Queued
  controller.join({ id: 'pong', title: 'Pong' }, { role: 'queue' });
  controller.handleResult({ activityId: 'pong', status: 'queued', queuePosition: 2 });
  assert.equal(controller.state, 'queued');
  assert.equal(controller.isQueued, true);

  controller.leave();
  assert.equal(controller.state, 'idle');

  // Spectating / Watching
  controller.join({ id: 'pong', title: 'Pong' }, { role: 'spectator' });
  controller.handleResult({ activityId: 'pong', status: 'spectating' });
  assert.equal(controller.state, 'watching');
  assert.equal(controller.isWatching, true);

  controller.leave();
  assert.equal(controller.state, 'idle');
});

test('deactivate releases pending join or participating state on travel/room change', () => {
  const sentMessages = [];
  let dismounted = false;
  const net = {
    sendActivityLeave: (payload) => sentMessages.push(['leave', payload]),
  };

  const controller = createParticipationController({
    net,
    applyDismount: () => { dismounted = true; },
    getRoomId: () => 'theater',
  });

  // Travel while joining
  controller.join({ id: 'pong' });
  assert.equal(controller.state, 'joining');
  controller.deactivate();
  assert.equal(controller.state, 'idle');
  assert.deepEqual(sentMessages.at(-1), ['leave', { roomId: 'theater', activityId: 'pong' }]);

  // Travel while participating
  controller.join({ id: 'pong' });
  controller.handleResult({ activityId: 'pong', status: 'seated', slot: 1 });
  assert.equal(controller.state, 'participating');
  controller.deactivate();
  assert.equal(controller.state, 'idle');
  assert.equal(dismounted, true);
});

test('handleError safely reverts participation to idle', () => {
  let dismounted = false;
  const toasts = [];
  const controller = createParticipationController({
    applyDismount: () => { dismounted = true; },
    toast: (t, b, tag) => toasts.push({ t, b, tag }),
    getRoomId: () => 'theater',
  });

  controller.join({ id: 'pong' });
  controller.handleResult({ activityId: 'pong', status: 'seated', slot: 1 });

  controller.handleError({ activityId: 'pong', reason: 'session_timeout', message: 'Activity timed out' });
  assert.equal(controller.state, 'idle');
  assert.equal(dismounted, true);
  assert.equal(toasts.at(-1).b, 'Activity timed out');
});

test('handleSnapshot ejects participant if slot is no longer seated in server state', () => {
  let dismounted = false;
  const controller = createParticipationController({
    applyDismount: () => { dismounted = true; },
    getRoomId: () => 'theater',
  });

  controller.join({ id: 'pong' });
  controller.handleResult({ activityId: 'pong', status: 'seated', slot: 1 });
  assert.equal(controller.state, 'participating');

  // Snapshot has only slot 2
  controller.handleSnapshot({
    activityId: 'pong',
    players: [{ slot: 2 }],
  });

  assert.equal(controller.state, 'idle');
  assert.equal(dismounted, true);
});

test('interactions registry dispatches activity items to activityControl', () => {
  const registry = createInteractionRegistry();
  const routed = [];

  registerCoreInteractions(registry, {
    travel: () => {},
    gardenRoom: () => 'garden',
    seatControl: { sit: () => {} },
    readFieldNote: () => {},
    openScreen: () => {},
    activityControl: {
      interact: (item) => {
        routed.push(['activity', item.activityId]);
        return { handled: true };
      },
    },
  });

  const res = registry.dispatch({ type: 'activity', activityId: 'pong' });
  assert.equal(res.handled, true);
  assert.deepEqual(routed, [['activity', 'pong']]);
});

test('buildPlaceWorld generates activity interactable items from def.activities', () => {
  registerPlaceBuilder('activityFixture', () => {});
  const baseDef = PLACE_DEFINITIONS.find(d => d.id === 'theater');
  const placeDef = {
    ...baseDef,
    builderKey: 'activityFixture',
    activities: [
      {
        id: 'pong-test',
        type: 'pong',
        rulesVersion: 1,
        transform: { position: [3, 4] },
        footprint: { width: 2, depth: 1 },
        interactionRadius: 2.5,
        participantAnchors: [
          { slot: 1, position: [2, 4], facing: 1.57 },
        ],
        capacities: { players: 2, spectators: 4, queue: 4 },
        environmentPolicy: 'none',
        spectatorPolicy: 'world',
        rendererKey: 'pongRenderer',
        controllerKey: 'pongController',
      },
    ],
  };

  const world = buildPlaceWorld(placeDef);
  assert.ok(world.items.some(it => it.type === 'activity' && it.activityId === 'pong-test'));

  const actItem = world.items.find(it => it.activityId === 'pong-test');
  assert.equal(actItem.x, 3);
  assert.equal(actItem.z, 4);
  assert.equal(actItem.interactionRadius, 2.5);

  // Also check that footprint block was created
  assert.ok(world.obstacles.some(o => Math.abs(o.x - 3) < 0.01 && Math.abs(o.z - 4) < 0.01));
});

test('pool command rejections retain the seat and credentials; stale sessions still dismount', () => {
  let dismounts = 0;
  const messages = [];
  const controller = createParticipationController({
    applyDismount: () => { dismounts++; },
    toast: (_title, message) => messages.push(message),
    getRoomId: () => 'theater',
  });
  controller.join({ id: 'orpheum-pool', type: 'pool' });
  controller.handleResult({ activityId: 'orpheum-pool', status: 'seated', slot: 0,
    sessionId: 'pool-session', lease: 'pool-lease' });
  for (const error of ['not_in_progress', 'out_of_turn', 'balls_in_motion', 'not_aiming',
    'must_place_cue_ball', 'pocket_call_required', 'overlap_placement',
    'invalid_state', 'no_ball_in_hand', 'invalid_call']) {
    assert.equal(controller.handleError({ activityId: 'orpheum-pool', error }), true);
    assert.equal(controller.state, 'participating', error);
    assert.equal(controller.sessionId, 'pool-session');
    assert.equal(controller.lease, 'pool-lease');
    assert.equal(controller.currentSlot, 0);
    assert.equal(dismounts, 0);
    assert.equal(messages.at(-1), error);
  }
  controller.handleError({ activityId: 'orpheum-pool', error: 'stale_session' });
  assert.equal(controller.state, 'idle');
  assert.equal(dismounts, 1);
});

test('a rejected input keeps the seat instead of ejecting the rider', () => {
  let dismounts = 0;
  const messages = [];
  const controller = createParticipationController({
    applyDismount: () => { dismounts++; },
    toast: (_title, message) => messages.push(message),
    getRoomId: () => 'theater',
  });
  controller.join({ id: 'orpheum-downhill-mayhem', type: 'downhill-mayhem' });
  controller.handleResult({ activityId: 'orpheum-downhill-mayhem', status: 'seated', slot: 0,
    sessionId: 'race-session', lease: 'race-lease' });

  // Server-side input rejections are command errors, not seat errors: the
  // rider must stay seated and see the reason (regression: invalid_input from
  // a null trick value ejected every racing human).
  for (const error of ['invalid_input', 'invalid_request', 'not_loaded', 'stale_sequence']) {
    assert.equal(controller.handleError({ activityId: 'orpheum-downhill-mayhem', error }), true);
    assert.equal(controller.state, 'participating', error);
    assert.equal(controller.lease, 'race-lease');
    assert.equal(dismounts, 0);
  }
});
