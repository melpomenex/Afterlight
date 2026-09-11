/**
 * 3D Billiards Table Scene Graph for Afterlight.
 *
 * Implements the physical pool table visuals, balls, contact shadows,
 * cue stick, and aiming guides (Task 5.1, Design D5).
 *
 * Coordinates match shared/pool/physics.js:
 *   - Local X in [-1.12, 1.12] (long playing axis, 2.24m)
 *   - Local Z in [-0.56, 0.56] (short playing axis, 1.12m)
 *   - Local Y = 0.78 (cloth playing bed)
 *   - Ball center Y = 0.78 + BALL_RADIUS (0.8085m)
 */

import * as THREE from 'three';
import {
  TABLE_LENGTH,
  TABLE_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  BALL_RADIUS,
  CORNER_POCKET_RADIUS,
  SIDE_POCKET_RADIUS,
  POCKETS,
} from '../../../shared/pool/physics.js';
import { getBallTexture } from './ballTextures.js';

export function createPoolTableScene({
  position = [-8.6, 0, -4.5],
  rotationY = Math.PI / 2,
} = {}) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'pool-table-root';
  rootGroup.position.set(position[0], position.length === 3 ? position[1] : 0, position.length === 3 ? position[2] : position[1]);
  rootGroup.rotation.y = rotationY;

  // Reusable materials
  const clothMat = new THREE.MeshStandardMaterial({
    color: '#1a6b40', // Deep tournament emerald green
    roughness: 0.82,
    metalness: 0.05,
  });

  const mahoganyMat = new THREE.MeshStandardMaterial({
    color: '#381f14', // Rich dark polished mahogany
    roughness: 0.45,
    metalness: 0.15,
  });

  const cushionMat = new THREE.MeshStandardMaterial({
    color: '#165c36', // Slightly darker green rubber cushion
    roughness: 0.9,
    metalness: 0.02,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: '#c99e46', // Antiqued brass
    roughness: 0.35,
    metalness: 0.85,
  });

  const pocketInteriorMat = new THREE.MeshStandardMaterial({
    color: '#0a0a0c', // Dark shadow leather pocket interior
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide, // visible from above through the pocket mouth
  });

  const diamondMat = new THREE.MeshStandardMaterial({
    color: '#e8e0d0', // Mother of pearl inlaid sights
    roughness: 0.25,
    metalness: 0.3,
  });

  const shadowMat = new THREE.MeshBasicMaterial({
    color: '#0a1a10',
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });

  // Track owned resources for clean disposal
  const ownedGeometries = [];
  const ownedMaterials = [
    clothMat,
    mahoganyMat,
    cushionMat,
    brassMat,
    pocketInteriorMat,
    diamondMat,
    shadowMat,
  ];

  function regGeo(geo) {
    ownedGeometries.push(geo);
    return geo;
  }

  // --- 1. Table Bed (Slate & Worsted Wool Cloth) ---
  // Length 2.24m (X: -1.12 to 1.12), Width 1.12m (Z: -0.56 to 0.56).
  // The cloth is extruded from a shape whose outline notches a real opening at
  // each pocket mouth (semicircular side notches, quarter-arc corners), so
  // balls have a visible hole to fall into. Mouths stay slightly wider than
  // the physics capture radii so capture always happens over an opening.
  const cornerMouthR = CORNER_POCKET_RADIUS + 0.01; // 0.075
  const sideMouthR = SIDE_POCKET_RADIUS + 0.008; // 0.068

  const clothShape = new THREE.Shape();
  clothShape.moveTo(-HALF_LENGTH + cornerMouthR, -HALF_WIDTH);
  clothShape.lineTo(-sideMouthR, -HALF_WIDTH);
  clothShape.absarc(0, -HALF_WIDTH, sideMouthR, Math.PI, 0, true);
  clothShape.lineTo(HALF_LENGTH - cornerMouthR, -HALF_WIDTH);
  clothShape.absarc(HALF_LENGTH, -HALF_WIDTH, cornerMouthR, Math.PI, Math.PI / 2, true);
  clothShape.lineTo(HALF_LENGTH, HALF_WIDTH - cornerMouthR);
  clothShape.absarc(HALF_LENGTH, HALF_WIDTH, cornerMouthR, Math.PI * 1.5, Math.PI, true);
  clothShape.lineTo(sideMouthR, HALF_WIDTH);
  clothShape.absarc(0, HALF_WIDTH, sideMouthR, 0, Math.PI, true);
  clothShape.lineTo(-HALF_LENGTH + cornerMouthR, HALF_WIDTH);
  clothShape.absarc(-HALF_LENGTH, HALF_WIDTH, cornerMouthR, 0, Math.PI * 1.5, true);
  clothShape.lineTo(-HALF_LENGTH, -HALF_WIDTH + cornerMouthR);
  clothShape.absarc(-HALF_LENGTH, -HALF_WIDTH, cornerMouthR, Math.PI / 2, 0, true);
  clothShape.closePath();

  const bedGeo = regGeo(new THREE.ExtrudeGeometry(clothShape, {
    depth: 0.04,
    bevelEnabled: false,
    curveSegments: 24,
  }));
  bedGeo.rotateX(-Math.PI / 2); // extrusion runs upward in Y; shape plane -> world XZ
  const bedMesh = new THREE.Mesh(bedGeo, clothMat);
  bedMesh.position.set(0, 0.74, 0); // spans 0.74..0.78; playing surface stays at 0.78
  bedMesh.receiveShadow = true;
  rootGroup.add(bedMesh);

  // --- 2. Table Apron & Frame ---
  const frameGeo = regGeo(new THREE.BoxGeometry(TABLE_LENGTH + 0.26, 0.24, TABLE_WIDTH + 0.26));
  const frameMesh = new THREE.Mesh(frameGeo, mahoganyMat);
  frameMesh.position.set(0, 0.62, 0);
  frameMesh.castShadow = frameMesh.receiveShadow = true;
  rootGroup.add(frameMesh);

  // --- 3. Four Mahogany Legs with Brass Feet ---
  const legGeo = regGeo(new THREE.CylinderGeometry(0.08, 0.06, 0.64, 16));
  const footGeo = regGeo(new THREE.CylinderGeometry(0.07, 0.09, 0.05, 16));
  const legOffsetX = HALF_LENGTH - 0.16;
  const legOffsetZ = HALF_WIDTH - 0.12;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, mahoganyMat);
      leg.position.set(sx * legOffsetX, 0.32, sz * legOffsetZ);
      leg.castShadow = true;
      rootGroup.add(leg);

      const foot = new THREE.Mesh(footGeo, brassMat);
      foot.position.set(sx * legOffsetX, 0.025, sz * legOffsetZ);
      rootGroup.add(foot);
    }
  }

  // --- 4. Wood Rails & Rubber Cushions ---
  const railHeight = 0.045;
  const railThick = 0.11;
  const railY = 0.8025;

  // Head and Foot Rails (along Z)
  const endRailGeo = regGeo(new THREE.BoxGeometry(railThick, railHeight, TABLE_WIDTH));
  const endCushionGeo = regGeo(new THREE.BoxGeometry(0.025, railHeight * 0.8, TABLE_WIDTH - 0.14));

  for (const sx of [-1, 1]) {
    const endRail = new THREE.Mesh(endRailGeo, mahoganyMat);
    endRail.position.set(sx * (HALF_LENGTH + railThick / 2), railY, 0);
    endRail.castShadow = true;
    rootGroup.add(endRail);

    const endCushion = new THREE.Mesh(endCushionGeo, cushionMat);
    endCushion.position.set(sx * (HALF_LENGTH - 0.0125), railY - 0.005, 0);
    rootGroup.add(endCushion);

    // 3 Diamond rail sights per end rail
    for (const sz of [-0.28, 0, 0.28]) {
      const sightGeo = regGeo(new THREE.CircleGeometry(0.007, 4));
      const sight = new THREE.Mesh(sightGeo, diamondMat);
      sight.rotation.x = -Math.PI / 2;
      sight.rotation.z = Math.PI / 4;
      sight.position.set(sx * (HALF_LENGTH + railThick / 2), railY + railHeight / 2 + 0.001, sz);
      rootGroup.add(sight);
    }
  }

  // Side Rails (along X, split into head and foot segments by side pockets)
  const sideSegLength = HALF_LENGTH - 0.12;
  const sideRailGeo = regGeo(new THREE.BoxGeometry(sideSegLength, railHeight, railThick));
  const sideCushionGeo = regGeo(new THREE.BoxGeometry(sideSegLength - 0.06, railHeight * 0.8, 0.025));

  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const segCenterX = sx * (sideSegLength / 2 + 0.06);
      const sideRail = new THREE.Mesh(sideRailGeo, mahoganyMat);
      sideRail.position.set(segCenterX, railY, sz * (HALF_WIDTH + railThick / 2));
      sideRail.castShadow = true;
      rootGroup.add(sideRail);

      const sideCushion = new THREE.Mesh(sideCushionGeo, cushionMat);
      sideCushion.position.set(segCenterX, railY - 0.005, sz * (HALF_WIDTH - 0.0125));
      rootGroup.add(sideCushion);

      // 3 Diamond rail sights per side rail segment
      for (const d of [-0.28, 0, 0.28]) {
        const sightGeo = regGeo(new THREE.CircleGeometry(0.007, 4));
        const sight = new THREE.Mesh(sightGeo, diamondMat);
        sight.rotation.x = -Math.PI / 2;
        sight.rotation.z = Math.PI / 4;
        sight.position.set(segCenterX + d * 0.8, railY + railHeight / 2 + 0.001, sz * (HALF_WIDTH + railThick / 2));
        rootGroup.add(sight);
      }
    }
  }

  // --- 5. Six Pocket Castings & Drop Pockets ---
  // Each pocket is a brass torus casting ringing the mouth in the cloth,
  // with a tapered dark leather well hanging below the slate so the mouth
  // reads as a real opening with depth, not a painted circle.
  const pocketKinds = [
    { match: 'corner', mouthR: cornerMouthR },
    { match: 'side', mouthR: sideMouthR },
  ];
  const wellDepth = 0.13; // from just under the slate (0.74) down to 0.61

  for (const kind of pocketKinds) {
    kind.wellGeo = regGeo(new THREE.CylinderGeometry(
      kind.mouthR * 0.98, kind.mouthR * 0.72, wellDepth, 20, 1, true,
    ));
    kind.capGeo = regGeo(new THREE.CircleGeometry(kind.mouthR * 0.72, 20));
    kind.castingGeo = regGeo(new THREE.TorusGeometry(kind.mouthR + 0.004, 0.011, 12, 28));
  }

  for (const p of POCKETS) {
    const kind = pocketKinds.find((k) => p.id.startsWith(k.match));

    const casting = new THREE.Mesh(kind.castingGeo, brassMat);
    casting.rotation.x = Math.PI / 2; // lie flat in the table plane
    casting.position.set(p.x, railY - 0.002, p.z);
    rootGroup.add(casting);

    const well = new THREE.Mesh(kind.wellGeo, pocketInteriorMat);
    well.position.set(p.x, 0.74 - wellDepth / 2, p.z);
    rootGroup.add(well);

    const cap = new THREE.Mesh(kind.capGeo, pocketInteriorMat);
    cap.rotation.x = -Math.PI / 2; // face upward, visible through the mouth
    cap.position.set(p.x, 0.74 - wellDepth, p.z);
    rootGroup.add(cap);
  }

  // --- 6. Ball Meshes & Contact Shadows (16 Balls) ---
  const ballGeo = regGeo(new THREE.SphereGeometry(BALL_RADIUS, 24, 16));
  const shadowGeo = regGeo(new THREE.CircleGeometry(BALL_RADIUS * 1.15, 16));
  const ballMeshes = new Map();
  const shadowMeshes = new Map();

  for (let i = 0; i <= 15; i++) {
    const tex = getBallTexture(i);
    const ballMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.15,
      metalness: 0.08,
    });
    ownedMaterials.push(ballMat);

    const mesh = new THREE.Mesh(ballGeo, ballMat);
    mesh.name = `pool-ball-${i}`;
    mesh.castShadow = true;
    mesh.position.set(0, 0.78 + BALL_RADIUS, 0);
    mesh.visible = true;
    rootGroup.add(mesh);
    ballMeshes.set(i, mesh);

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.name = `pool-shadow-${i}`;
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.781, 0);
    rootGroup.add(shadow);
    shadowMeshes.set(i, shadow);
  }

  // --- 7. Cue Stick Mesh ---
  const cueGroup = new THREE.Group();
  cueGroup.name = 'pool-cue-group';
  rootGroup.add(cueGroup);

  // Tapered maple shaft: 1.42m long, centered along -X in cueGroup local space
  const shaftGeo = regGeo(new THREE.CylinderGeometry(0.007, 0.015, 1.42, 16));
  shaftGeo.translate(0, 0.71, 0); // Origin at tip
  shaftGeo.rotateZ(Math.PI / 2);  // Points along -X
  const shaftMat = new THREE.MeshStandardMaterial({
    color: '#e8d4a7', // Light maple wood
    roughness: 0.5,
    metalness: 0.05,
  });
  ownedMaterials.push(shaftMat);
  const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
  cueGroup.add(shaftMesh);

  // Leather tip
  const tipGeo = regGeo(new THREE.CylinderGeometry(0.0068, 0.007, 0.012, 16));
  tipGeo.translate(0, 0.006, 0);
  tipGeo.rotateZ(Math.PI / 2);
  const tipMat = new THREE.MeshStandardMaterial({ color: '#2d4a6b', roughness: 0.9 });
  ownedMaterials.push(tipMat);
  const tipMesh = new THREE.Mesh(tipGeo, tipMat);
  cueGroup.add(tipMesh);

  // Dark butt wrap
  const buttGeo = regGeo(new THREE.CylinderGeometry(0.0145, 0.016, 0.42, 16));
  buttGeo.translate(0, 1.21, 0);
  buttGeo.rotateZ(Math.PI / 2);
  const buttMat = new THREE.MeshStandardMaterial({ color: '#22150e', roughness: 0.6 });
  ownedMaterials.push(buttMat);
  const buttMesh = new THREE.Mesh(buttGeo, buttMat);
  cueGroup.add(buttMesh);

  // --- 8. Aim Line, Ghost Ball & Deflection Guides ---
  const aimLineMat = new THREE.LineBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.75,
  });
  ownedMaterials.push(aimLineMat);

  const aimLineGeo = regGeo(new THREE.BufferGeometry());
  aimLineGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));
  const aimLine = new THREE.Line(aimLineGeo, aimLineMat);
  aimLine.position.y = 0.782;
  rootGroup.add(aimLine);

  // Ghost ball at projected impact point
  const ghostGeo = regGeo(new THREE.RingGeometry(BALL_RADIUS * 0.9, BALL_RADIUS, 24));
  const ghostMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });
  ownedMaterials.push(ghostMat);
  const ghostBall = new THREE.Mesh(ghostGeo, ghostMat);
  ghostBall.rotation.x = -Math.PI / 2;
  ghostBall.position.y = 0.783;
  rootGroup.add(ghostBall);

  // Target ball deflection line
  const deflectLineMat = new THREE.LineBasicMaterial({
    color: '#ffdd66',
    transparent: true,
    opacity: 0.6,
  });
  ownedMaterials.push(deflectLineMat);
  const deflectLineGeo = regGeo(new THREE.BufferGeometry());
  deflectLineGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.4, 0, 0], 3));
  const deflectLine = new THREE.Line(deflectLineGeo, deflectLineMat);
  deflectLine.position.y = 0.782;
  rootGroup.add(deflectLine);

  // --- 9. Ball-in-Hand Placement Preview ---
  const previewGeo = regGeo(new THREE.SphereGeometry(BALL_RADIUS, 16, 12));
  const previewMat = new THREE.MeshStandardMaterial({
    color: '#55ff77',
    transparent: true,
    opacity: 0.55,
  });
  ownedMaterials.push(previewMat);
  const previewMesh = new THREE.Mesh(previewGeo, previewMat);
  previewMesh.position.set(0, 0.78 + BALL_RADIUS, 0);
  previewMesh.visible = false;
  rootGroup.add(previewMesh);

  // Cosmetic pocket-drop animation state (presentation only; the shared
  // physics snapshots stay authoritative). When a ball transitions to
  // 'pocketed' after being seen in play, it sinks through the pocket mouth
  // instead of blinking out of existence.
  const CLOTH_TOP_Y = 0.78;
  const POCKET_DROP_SECONDS = 0.22;
  const POCKET_DROP_END_Y = 0.66; // fully below the slate, inside the well
  const pocketDrops = new Map(); // ball id -> { x0, z0, x1, z1, t }
  const seenInPlay = new Set();
  let lastDropNow = performance.now();

  return {
    group: rootGroup,
    ballMeshes,
    shadowMeshes,
    cueGroup,
    aimLine,
    ghostBall,
    deflectLine,
    previewMesh,

    /**
     * Updates ball and shadow transforms from physics simulation state.
     * @param {object} simState - State from shared/pool/physics.js or server snapshot
     * @param {number} [lerpFactor=1.0]
     */
    updateBalls(simState, lerpFactor = 1.0) {
      const balls = simState?.physics?.balls || simState?.balls;
      if (!balls) return;

      const now = performance.now();
      const dropDt = Math.min((now - lastDropNow) / 1000, 0.05);
      lastDropNow = now;

      for (let i = 0; i <= 15; i++) {
        const ballData = balls[String(i)] || balls[i];
        const mesh = ballMeshes.get(i);
        const shadow = shadowMeshes.get(i);
        if (!mesh || !shadow) continue;

        if (!ballData || ballData.state === 'pocketed') {
          shadow.visible = false;
          // Balls already pocketed when we join mid-game were never seen in
          // play: just hide them instead of dropping from a bogus position.
          if (!mesh.visible || !seenInPlay.has(i)) {
            mesh.visible = false;
            pocketDrops.delete(i);
            continue;
          }
          if (!pocketDrops.has(i)) {
            const sx = Number.isFinite(ballData?.x) ? ballData.x : mesh.position.x;
            const sz = Number.isFinite(ballData?.z) ? ballData.z : mesh.position.z;
            let target = POCKETS[0];
            let bestDist = Infinity;
            for (const p of POCKETS) {
              const d = (sx - p.x) * (sx - p.x) + (sz - p.z) * (sz - p.z);
              if (d < bestDist) {
                bestDist = d;
                target = p;
              }
            }
            pocketDrops.set(i, { x0: sx, z0: sz, x1: target.x, z1: target.z, t: 0 });
          }
          continue;
        }

        seenInPlay.add(i);
        pocketDrops.delete(i); // re-spotted or placed by hand: cancel any drop

        mesh.visible = true;
        shadow.visible = true;

        const targetX = ballData.x;
        const targetZ = ballData.z;
        const targetY = 0.78 + BALL_RADIUS;

        if (lerpFactor >= 1.0) {
          mesh.position.set(targetX, targetY, targetZ);
          shadow.position.set(targetX, 0.781, targetZ);
        } else {
          mesh.position.x += (targetX - mesh.position.x) * lerpFactor;
          mesh.position.y = targetY;
          mesh.position.z += (targetZ - mesh.position.z) * lerpFactor;

          shadow.position.x = mesh.position.x;
          shadow.position.z = mesh.position.z;
        }

        // Realistic rolling sphere rotation based on velocity
        const vx = ballData.vx || 0;
        const vz = ballData.vz || 0;
        const speed = Math.sqrt(vx * vx + vz * vz);
        if (speed > 0.001) {
          const rotAngle = (speed / BALL_RADIUS) * (1 / 60);
          const rotAxis = new THREE.Vector3(-vz, 0, vx).normalize();
          mesh.rotateOnWorldAxis(rotAxis, rotAngle);
        }
      }

      // Advance pocket drops: slide toward the pocket center while sinking
      // through the mouth (quadratic ease-in approximates gravity).
      for (const [id, drop] of pocketDrops) {
        drop.t += dropDt / POCKET_DROP_SECONDS;
        const mesh = ballMeshes.get(id);
        if (!mesh) {
          pocketDrops.delete(id);
          continue;
        }
        if (drop.t >= 1) {
          mesh.visible = false;
          pocketDrops.delete(id);
          continue;
        }
        const sink = drop.t * drop.t;
        mesh.position.set(
          drop.x0 + (drop.x1 - drop.x0) * drop.t,
          CLOTH_TOP_Y + BALL_RADIUS + (POCKET_DROP_END_Y - (CLOTH_TOP_Y + BALL_RADIUS)) * sink,
          drop.z0 + (drop.z1 - drop.z0) * drop.t,
        );
      }
    },

    /**
     * Updates cue stick position, orientation, and pull-back distance.
     */
    updateCue({
      cueX = 0,
      cueZ = 0,
      angle = 0,
      power = 0,
      strokeOffset = 0,
      visible = true,
    } = {}) {
      cueGroup.visible = visible;
      if (!visible) return;

      const pullBack = 0.05 + power * 0.28 - strokeOffset;
      const cueHeight = 0.78 + BALL_RADIUS + 0.015;

      // Position cue at cue ball center, elevated slightly above rail
      cueGroup.position.set(
        cueX - Math.cos(angle) * pullBack,
        cueHeight + 0.02 + power * 0.01,
        cueZ - Math.sin(angle) * pullBack,
      );

      // Cue points along aim angle, with slight downward elevation angle (~5 degrees)
      cueGroup.rotation.y = -angle;
      cueGroup.rotation.z = -0.07;
    },

    /**
     * Updates aim line and ghost ball impact prediction.
     */
    updateAimGuides({
      cueX = 0,
      cueZ = 0,
      angle = 0,
      visible = true,
      impact = null,
    } = {}) {
      aimLine.visible = visible;
      ghostBall.visible = visible && !!impact;
      deflectLine.visible = visible && !!impact;

      if (!visible) return;

      const lineLength = impact ? impact.distance : 1.8;
      const endX = cueX + Math.cos(angle) * lineLength;
      const endZ = cueZ + Math.sin(angle) * lineLength;

      const posAttr = aimLine.geometry.attributes.position;
      posAttr.setXYZ(0, cueX, 0.782, cueZ);
      posAttr.setXYZ(1, endX, 0.782, endZ);
      posAttr.needsUpdate = true;

      if (impact) {
        ghostBall.position.set(impact.ghostX, 0.783, impact.ghostZ);

        // Deflection indicator for target ball
        const defAttr = deflectLine.geometry.attributes.position;
        defAttr.setXYZ(0, impact.targetX, 0.782, impact.targetZ);
        defAttr.setXYZ(
          1,
          impact.targetX + impact.targetDirX * 0.35,
          0.782,
          impact.targetZ + impact.targetDirZ * 0.35,
        );
        defAttr.needsUpdate = true;
      }
    },

    /**
     * Updates ball-in-hand preview mesh.
     */
    updateBallInHandPreview({
      x = 0,
      z = 0,
      valid = true,
      visible = false,
    } = {}) {
      previewMesh.visible = visible;
      if (!visible) return;

      previewMesh.position.set(x, 0.78 + BALL_RADIUS, z);
      previewMesh.material.color.set(valid ? '#55ff77' : '#ff4444');
    },

    /**
     * Clean resource disposal.
     */
    dispose() {
      for (const geo of ownedGeometries) {
        try { geo.dispose(); } catch {}
      }
      for (const mat of ownedMaterials) {
        try { mat.dispose(); } catch {}
      }
      rootGroup.clear();
    },
  };
}
