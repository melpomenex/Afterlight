import * as THREE from 'three';

const boxGeo = new THREE.BoxGeometry(1, 1, 1);

const matCache = new Map();
function mat(color, roughness = 0.7, metalness = 0.15) {
  const key = `${color}_${roughness}_${metalness}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  }
  return matCache.get(key);
}

export function buildMarketWorld() {
  const group = new THREE.Group();
  group.name = 'market';
  const obstacles = [];
  const items = [];
  const animated = [];

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

  // Paving foundation
  box(0, -0.6, 0, 28, 1, 25, mat('#242f2b'));
  box(0, -0.12, 0, 24, 0.4, 21, mat('#3d4944', 0.27, 0.32));

  // Irregular wet paving stones
  const stone = ['#485450', '#535e55', '#647065', '#70776a', '#3a4845', '#7b7e6d'];
  let seed = 42;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let x = -12; x < 12; x++) {
    for (let z = -10; z < 11; z++) {
      const c = new THREE.Color(stone[Math.floor(rand() * stone.length)]).multiplyScalar(0.75 + rand() * 0.25);
      box(x + 0.49 + (z % 2) * 0.05, 0.06 + rand() * 0.03, z + 0.47, 0.96, 0.16, 0.96, mat('#' + c.getHexString(), 0.3 + rand() * 0.3, 0.2));
    }
  }

  // Rain puddles
  for (let i = 0; i < 40; i++) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.4 + rand() * 0.9, 9), mat('#516564', 0.07, 0.62));
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set((rand() - 0.5) * 22, 0.183, (rand() - 0.5) * 19);
    puddle.scale.y = 0.4 + rand() * 0.4;
    group.add(puddle);
  }

  // Perimeter boundary walls
  for (let x = -12; x <= 12; x += 0.8) {
    for (let y = 0.4; y < 3; y += 0.4) {
      box(x, y, -10.5, 0.76, 0.37, 0.65, y > 2.6 ? '#a0a18a' : '#4d6561');
    }
  }
  for (let z = -10; z < 11; z += 0.8) {
    for (const x of [-12, 12]) {
      if (Math.abs(z) < 2) continue; // Leave eastern & western gate openings
      box(x, 0.65, z, 0.5, 1.3, 0.76, mat('#192d2d'));
      box(x, 1.35, z, 0.7, 0.15, 0.78, mat('#485450'));
    }
  }

  // Decorative crates, barrels, and scale props
  for (const [cx, cz, s] of [
    [-8, 4, 1.1], [-9.2, 4.2, 0.9], [8.5, 5, 1.0], [9.5, 5.4, 0.9],
    [-3, -3, 0.8], [3, -3, 0.8], [-8.5, -8, 1.2], [8.5, -8, 1.2]
  ]) {
    box(cx, s * 0.5, cz, s, s, s, mat('#634932'));
    block(cx, cz, s, s);
  }

  // Western Gateway to Exploration Biome Districts
  const westGateX = -10.7, westGateZ = 0;
  for (const gz of [-1.5, 1.5]) {
    box(westGateX, 1.8, gz, 0.6, 3.6, 0.6, mat('#273d3d'));
    glow(westGateX, 3.6, gz, 0.8, 0.3, 0.8, '#e0c889', 2.0);
  }
  box(westGateX, 3.8, 0, 0.8, 0.35, 3.6, mat('#273d3d'));
  items.push({
    type: 'district_gate',
    targetDistrict: 'canal',
    x: westGateX,
    z: westGateZ,
    title: 'The Outer Districts Gateway',
    sub: 'Press E to venture into the ancient city biomes',
  });

  // Batch static geometry
  const statics = group.children.filter(o => o.isMesh && o.geometry === boxGeo && !o.material.transparent && o.material.emissive?.getHex() === 0);
  const batch = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.2 }), statics.length);
  statics.forEach((mesh, i) => {
    mesh.updateMatrix();
    batch.setMatrixAt(i, mesh.matrix);
    batch.setColorAt(i, mesh.material.color);
    group.remove(mesh);
  });
  batch.castShadow = true;
  batch.receiveShadow = true;
  group.add(batch);

  function update(time) {
    animated.forEach(fn => fn(time));
  }

  return { group, obstacles, items, update };
}
