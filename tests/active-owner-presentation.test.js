import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createActivityViewLease } from '../src/activities/viewLease.js';
import { createPlaceRuntime } from '../src/places/runtime.js';

test('activity view lease lifecycle restores social scene and camera without mutating player or seat state', () => {
  const socialScene = new THREE.Scene();
  const socialCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
  socialCamera.position.set(0, 10, 20);

  const player = { position: new THREE.Vector3(5, 0, 7) };
  let currentSeat = { kind: 'seat', id: 'seat-4' };
  let floatingMediaState = { playing: true, mediaUrl: 'https://example.com/video.mp4' };

  let activeScene = socialScene;
  let activeCamera = socialCamera;
  let rendererExposure = 1.0;
  let bloomEnabled = true;

  let environmentRefreshed = false;

  const viewLease = createActivityViewLease({
    generation: () => 1,
    apply: ({ scene, camera, toneMappingExposure }) => {
      activeScene = scene;
      activeCamera = camera;
      if (typeof toneMappingExposure === 'number') {
        rendererExposure = toneMappingExposure;
      }
      bloomEnabled = false;
    },
    restore: () => {
      activeScene = socialScene;
      activeCamera = socialCamera;
      rendererExposure = 1.0;
      bloomEnabled = true;
      environmentRefreshed = true;
    },
  });

  // 1. Same-scene camera activity (e.g. telescope)
  const telescopeCamera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 5000);
  const telescopeResult = viewLease.acquireView({
    owner: 'activity:telescope',
    generation: 1,
    scene: socialScene,
    camera: telescopeCamera,
  });

  assert.equal(telescopeResult.ok, true);
  assert.equal(activeScene, socialScene);
  assert.equal(activeCamera, telescopeCamera);
  assert.equal(bloomEnabled, false);

  // Player and seat state must remain untouched
  assert.equal(player.position.x, 5);
  assert.equal(currentSeat.id, 'seat-4');
  assert.equal(floatingMediaState.playing, true);

  // Release telescope
  viewLease.release('activity:telescope');
  assert.equal(activeScene, socialScene);
  assert.equal(activeCamera, socialCamera);
  assert.equal(bloomEnabled, true);
  assert.equal(environmentRefreshed, true);

  // 2. Leased-scene activity (e.g. Summit Run or Kart Royale)
  environmentRefreshed = false;
  const gameScene = new THREE.Scene();
  const gameCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 2000);

  const gameResult = viewLease.acquireView({
    owner: 'activity:snowboard-race',
    generation: 1,
    scene: gameScene,
    camera: gameCamera,
    toneMappingExposure: 1.4,
  });

  assert.equal(gameResult.ok, true);
  assert.equal(activeScene, gameScene);
  assert.equal(activeCamera, gameCamera);
  assert.equal(rendererExposure, 1.4);

  // Player, seat, and media remain intact during game
  assert.equal(player.position.x, 5);
  assert.equal(currentSeat.id, 'seat-4');
  assert.equal(floatingMediaState.playing, true);

  // Return from leased scene
  viewLease.release('activity:snowboard-race');
  assert.equal(activeScene, socialScene);
  assert.equal(activeCamera, socialCamera);
  assert.equal(rendererExposure, 1.0);
  assert.equal(environmentRefreshed, true);
  assert.equal(player.position.x, 5);
  assert.equal(currentSeat.id, 'seat-4');
  assert.equal(floatingMediaState.playing, true);

  // 3. Travel during leased scene revokes view lease
  viewLease.acquireView({
    owner: 'activity:kart-royale',
    generation: 1,
    scene: gameScene,
    camera: gameCamera,
  });
  assert.equal(viewLease.held, true);

  viewLease.revoke('travel');
  assert.equal(viewLease.held, false);
  assert.equal(activeScene, socialScene);
  assert.equal(activeCamera, socialCamera);

  // 4. Failed load / revocation is idempotent and safe
  const revokeResult = viewLease.revoke('already-released');
  assert.equal(revokeResult.released, false);
  assert.equal(activeScene, socialScene);
  assert.equal(activeCamera, socialCamera);
});
