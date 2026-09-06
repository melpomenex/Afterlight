import * as THREE from 'three';
import { renderCropVisual } from '../render/plants.js';
import { GROWTH_STAGES } from '../../shared/crops.js';
import { sprinklerCoverage } from '../../shared/gardenModel.js';
import { SPRINKLER } from '../../shared/materials.js';

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8);

const matCache = new Map();
function mat(color, roughness = 0.7, metalness = 0.15) {
  const key = `${color}_${roughness}_${metalness}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  }
  return matCache.get(key);
}

export function buildGardenWorld() {
  const group = new THREE.Group();
  group.name = 'garden';
  const obstacles = [];
  const items = [];
  const bedVisuals = []; // index -> { soilMesh, plantGroup, bedIndex, x, z }

  function box(x, y, z, w, h, d, m, parent = group) {
    const mesh = new THREE.Mesh(boxGeo, typeof m === 'string' ? mat(m) : m);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function block(x, z, w, d) {
    obstacles.push({ x, z, w: w / 2 + 0.38, d: d / 2 + 0.38 });
  }

  function glow(x, y, z, w, h, d, color, intensity = 1.5) {
    const mesh = box(x, y, z, w, h, d, color);
    mesh.material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity });
    return mesh;
  }

  function lamp(x, y, z, color = '#ffdf96') {
    box(x, y, z, 0.25, 0.4, 0.25, new THREE.MeshStandardMaterial({ color: '#fff2c6', emissive: color, emissiveIntensity: 2.5 }));
    box(x, y + 0.22, z, 0.38, 0.08, 0.38, mat('#232a28'));
    const l = new THREE.PointLight(color, 5, 6, 2);
    l.position.set(x, y, z);
    group.add(l);
    return l;
  }

  // Foundation ground
  box(0, -0.6, 0, 28, 1, 26, mat('#272b22'));
  box(0, -0.12, 0, 25, 0.4, 23, mat('#383e2f', 0.85, 0.1));

  // Garden paths (crushed gravel / paving)
  const pathMat = mat('#565b4c', 0.8, 0.1);
  box(0, 0.07, 0, 24, 0.12, 2.5, pathMat); // main central cross path E-W
  box(0, 0.07, 0, 2.5, 0.12, 20, pathMat); // main central cross path N-S

  // Perimeter low stone and hedgerow walls
  for (let x = -12; x <= 12; x += 0.8) {
    box(x, 0.6, -10.5, 0.76, 1.2, 0.65, mat('#414b38'));
    box(x, 0.6, 10.5, 0.76, 1.2, 0.65, mat('#414b38'));
  }
  for (let z = -10; z <= 10; z += 0.8) {
    for (const x of [-12, 12]) {
      if (Math.abs(z) < 2) continue; // western gate open
      box(x, 0.6, z, 0.65, 1.2, 0.76, mat('#414b38'));
    }
  }

  // Western Gateway leading back to Market
  const gateX = -10.7, gateZ = 0;
  for (const gz of [-1.4, 1.4]) {
    box(gateX, 1.8, gz, 0.5, 3.4, 0.5, mat('#2d3835'));
    glow(gateX, 3.4, gz, 0.7, 0.25, 0.7, '#74d0bd', 2.0);
  }
  box(gateX, 3.6, 0, 0.7, 0.3, 3.3, mat('#2d3835'));
  items.push({
    type: 'market_gate',
    x: gateX,
    z: gateZ,
    title: 'Return to Market Court',
    sub: 'Press E to walk back to the town market square',
  });

  // --- 12 GARDEN BEDS ---
  // Laid out in 2 blocks (North block: 6 beds, South block: 6 beds)
  // Each block has 2 rows of 3 beds.
  const bedPositions = [
    // North block (z ~ -4.5 and -7.5)
    [-6.0, -7.0], [-2.0, -7.0], [2.0, -7.0], [6.0, -7.0],
    [-6.0, -4.0], [-2.0, -4.0], [2.0, -4.0], [6.0, -4.0],
    // South block (z ~ 4.0 and 7.0)
    [-6.0, 4.0], [-2.0, 4.0], [2.0, 4.0], [6.0, 4.0],
  ];

  for (let i = 0; i < bedPositions.length; i++) {
    const [bx, bz] = bedPositions[i];
    const bedW = 2.4, bedD = 1.6;

    // Raised wood border
    box(bx, 0.25, bz, bedW + 0.2, 0.35, bedD + 0.2, mat('#4d3e2c', 0.8, 0.1));

    // Soil mesh (separate material so its color can darken with moisture)
    const drySoilColor = new THREE.Color('#382c1e');
    const soilMesh = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({
      color: drySoilColor.clone(),
      roughness: 0.85,
      metalness: 0.05,
    }));
    soilMesh.position.set(bx, 0.35, bz);
    soilMesh.scale.set(bedW, 0.15, bedD);
    soilMesh.castShadow = true;
    soilMesh.receiveShadow = true;
    group.add(soilMesh);

    // Obstacle so player doesn't clip through bed center, but edges are easily reachable
    block(bx, bz, bedW * 0.7, bedD * 0.7);

    // Plant 3D container
    const plantGroup = new THREE.Group();
    plantGroup.position.set(bx, 0.42, bz);
    group.add(plantGroup);

    bedVisuals.push({
      bedIndex: i,
      soilMesh,
      plantGroup,
      x: bx,
      z: bz,
      renderedCrop: null,
      renderedStage: -1,
    });

    items.push({
      type: 'bed',
      bedIndex: i,
      x: bx,
      z: bz,
      title: `Garden Bed #${i + 1}`,
      sub: 'Empty. Select Hoe to prepare or Seed to plant.',
    });
  }

  // --- TOOL SHED (Northwest: x=-8.5, z=-8.0) ---
  const shedX = -8.8, shedZ = -8.0;
  box(shedX, 1.8, shedZ, 3.2, 3.2, 2.6, mat('#3f3323'));
  block(shedX, shedZ, 3.2, 2.6);
  // Shed tin roof
  const shedRoof = box(shedX, 3.5, shedZ, 3.6, 0.15, 3.0, mat('#52605f', 0.4, 0.5));
  shedRoof.rotation.z = -0.15;
  lamp(shedX + 1.2, 2.6, shedZ + 1.4);

  // --- WATER TROUGH & RAIN BARREL (x=-7.5, z=-2.5) ---
  const troughX = -8.5, troughZ = -2.5;
  box(troughX, 0.45, troughZ, 1.4, 0.8, 2.0, mat('#443727'));
  block(troughX, troughZ, 1.4, 2.0);
  const waterSurface = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.7), new THREE.MeshStandardMaterial({
    color: '#346d78',
    roughness: 0.1,
    metalness: 0.7,
    transparent: true,
    opacity: 0.85,
  }));
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.set(troughX, 0.82, troughZ);
  group.add(waterSurface);

  items.push({
    type: 'water_source',
    x: troughX + 0.8,
    z: troughZ,
    title: 'Rainwater Cistern',
    sub: 'Clean water caught from the greenhouse gutters',
  });

  // --- COMPOST AREA (Northeast: x=9.0, z=-7.5) ---
  const compX = 9.0, compZ = -7.5;
  box(compX, 0.6, compZ, 2.4, 1.0, 2.2, mat('#403425'));
  block(compX, compZ, 2.4, 2.2);
  box(compX, 0.9, compZ, 2.0, 0.5, 1.8, mat('#261e14', 0.9));

  // --- WASH & PACK STATION (Southeast: x=9.0, z=5.0) ---
  const washX = 9.0, washZ = 5.0;
  box(washX, 0.6, washZ, 2.5, 0.9, 3.2, mat('#54432f'));
  block(washX, washZ, 2.5, 3.2);
  // Washing tub on bench
  const tub = new THREE.Mesh(cylGeo, mat('#707b78', 0.3, 0.6));
  tub.position.set(washX, 1.2, washZ - 0.6);
  tub.scale.set(0.45, 0.45, 0.45);
  group.add(tub);
  lamp(washX - 0.8, 2.4, washZ);

  // --- SPRINKLER FIXTURES & COVERAGE PREVIEW ---
  // Placed sprinklers are server state (garden fixtures); the client only
  // renders them. Coverage rings are five pre-created meshes, shown/hidden
  // in place while aiming — no per-frame allocation.
  const coverageRings = [];
  const ringGeo = new THREE.RingGeometry(0.62, 0.72, 24);
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: '#7fd0e8', side: THREE.DoubleSide, transparent: true, opacity: 0.55,
    }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.3;
    ring.visible = false;
    group.add(ring);
    coverageRings.push(ring);
  }

  function previewCoverage(bedIndex) {
    const indices = Number.isInteger(bedIndex) && bedIndex >= 0
      ? sprinklerCoverage(bedIndex).filter(idx => bedVisuals[idx])
      : [];
    coverageRings.forEach((ring, i) => {
      const idx = indices[i];
      if (idx === undefined) {
        ring.visible = false;
        return;
      }
      const visual = bedVisuals[idx];
      ring.position.set(visual.x, 0.3, visual.z);
      ring.visible = true;
    });
  }

  function setFixtures(fixtures) {
    const placed = new Map((fixtures || []).map(f => [f.bedIndex, f]));
    for (const visual of bedVisuals) {
      const fixture = placed.get(visual.bedIndex);
      if (fixture && !visual.fixtureGroup) {
        const fixtureGroup = new THREE.Group();
        fixtureGroup.position.set(visual.x, 0.42, visual.z);
        const stand = new THREE.Mesh(boxGeo, mat('#8a6844', 0.6, 0.3));
        stand.scale.set(0.1, 0.55, 0.1);
        stand.position.y = 0.27;
        stand.castShadow = true;
        fixtureGroup.add(stand);
        const armMat = mat('#b0784a', 0.5, 0.5);
        for (const [ax, az] of [[0.24, 0], [-0.24, 0], [0, 0.24], [0, -0.24]]) {
          const arm = new THREE.Mesh(boxGeo, armMat);
          arm.scale.set(0.34, 0.07, 0.07);
          arm.position.set(ax * 0.9, 0.52, az * 0.9);
          arm.rotation.y = az !== 0 ? Math.PI / 2 : 0;
          fixtureGroup.add(arm);
        }
        const globe = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({
          color: '#aedff2', emissive: '#7fd0e8', emissiveIntensity: 0.9,
          transparent: true, opacity: 0.85, roughness: 0.2, metalness: 0.1,
        }));
        globe.scale.setScalar(0.16);
        globe.position.y = 0.62;
        fixtureGroup.add(globe);
        visual.fixtureGroup = fixtureGroup;
        visual.fixtureGlobe = globe;
        group.add(fixtureGroup);
      } else if (!fixture && visual.fixtureGroup) {
        group.remove(visual.fixtureGroup);
        visual.fixtureGroup = null;
        visual.fixtureGlobe = null;
      }
    }
  }

  // Batch static scenery
  const statics = group.children.filter(o => o.isMesh && o.geometry === boxGeo && !o.material.transparent && !o.material.emissive?.getHex());
  const batch = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, metalness: 0.15 }), statics.length);
  statics.forEach((mesh, i) => {
    mesh.updateMatrix();
    batch.setMatrixAt(i, mesh.matrix);
    batch.setColorAt(i, mesh.material.color);
    group.remove(mesh);
  });
  batch.castShadow = true;
  batch.receiveShadow = true;
  group.add(batch);

  function update(time, bedsData = null) {
    if (!bedsData) return;

    for (const visual of bedVisuals) {
      const bed = bedsData[visual.bedIndex];
      if (!bed) continue;

      // Idle sprinkle animation on placed fixtures
      if (visual.fixtureGlobe) {
        visual.fixtureGlobe.rotation.y = time * 1.2 + visual.bedIndex;
        visual.fixtureGlobe.position.y = 0.62 + Math.sin(time * 3 + visual.bedIndex) * 0.03;
      }

      // 1. Update soil color based on preparation & moisture
      const soilMat = visual.soilMesh.material;
      if (!bed.prepared) {
        soilMat.color.set('#483d2f'); // uncultivated dry earth
      } else {
        const moisture = bed.moisture || 0;
        // Interpolate between dry tilled (#352a1c) and wet dark (#1b140b)
        const dryColor = new THREE.Color('#352a1c');
        const wetColor = new THREE.Color('#161009');
        soilMat.color.copy(dryColor).lerp(wetColor, moisture);
      }

      // 2. Update plant geometry if stage or crop changed
      if (visual.renderedCrop !== bed.cropId || visual.renderedStage !== bed.stage) {
        visual.renderedCrop = bed.cropId;
        visual.renderedStage = bed.stage;
        renderCropVisual(visual.plantGroup, bed.cropId, bed.stage);
      }
    }
  }

  return { group, obstacles, items, bedVisuals, update, setFixtures, previewCoverage };
}
