import * as THREE from 'three';

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

  function lamp(x, y, z, color = '#ffc775') {
    box(x, y, z, 0.3, 0.48, 0.3, new THREE.MeshStandardMaterial({ color: '#fff2c6', emissive: color, emissiveIntensity: 2.5 }));
    box(x, y + 0.28, z, 0.46, 0.1, 0.44, mat('#192d2d'));
    box(x, y - 0.28, z, 0.36, 0.1, 0.35, mat('#192d2d'));
    const l = new THREE.PointLight(color, 6, 7, 2);
    l.position.set(x, y - 0.1, z + 0.2);
    group.add(l);
    return l;
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

  // --- MARKET STALL 1: The Central Trading Board (Order Book & Spot Market) ---
  const boardX = 0, boardZ = -7.5;
  box(boardX, 1.5, boardZ, 5.5, 3.0, 1.4, mat('#3f3224'));
  block(boardX, boardZ, 5.5, 1.4);
  // Awning posts and striped canopy
  for (const sx of [-2.5, 2.5]) {
    const post = new THREE.Mesh(cylGeo, mat('#2d241c'));
    post.position.set(boardX + sx, 2.2, boardZ + 0.9);
    post.scale.set(0.08, 3.4, 0.08);
    group.add(post);
  }
  const canopy = box(boardX, 3.6, boardZ + 0.4, 6.0, 0.25, 2.4, mat('#7b4c34', 0.8));
  canopy.rotation.x = 0.18;
  // Chalkboard facade
  const chalkBoard = box(boardX, 1.8, boardZ + 0.72, 4.4, 1.8, 0.08, mat('#1a2422', 0.9, 0.1));
  lamp(boardX - 1.8, 2.8, boardZ + 0.8);
  lamp(boardX + 1.8, 2.8, boardZ + 0.8);
  items.push({
    type: 'market_board',
    x: boardX,
    z: boardZ + 1.5,
    title: 'Market Exchange Board',
    sub: 'Press E to view spot prices, create orders, and trade',
  });

  // --- MARKET STALL 2: The Local Seed Vendor (Northwest) ---
  const seedX = -6.5, seedZ = -4.5;
  box(seedX, 0.9, seedZ, 3.6, 1.8, 2.0, mat('#4a3b2b'));
  block(seedX, seedZ, 3.6, 2.0);
  box(seedX, 1.85, seedZ, 3.8, 0.1, 2.2, mat('#63523f'));
  // Seed sack props
  for (let i = -1; i <= 1; i++) {
    box(seedX + i * 0.9, 2.1, seedZ, 0.6, 0.5, 0.6, mat(['#b8aa83', '#a29571', '#c4b693'][i + 1]));
  }
  lamp(seedX, 2.8, seedZ + 0.8, '#ffdf96');
  items.push({
    type: 'seed_vendor',
    x: seedX,
    z: seedZ + 1.6,
    title: 'Town Seed Merchant',
    sub: 'Press E to browse seeds, tubers, and planting starts',
  });

  // --- MARKET STALL 3: Town Contracts Board (Northeast) ---
  const contX = 6.5, contZ = -4.5;
  box(contX, 1.4, contZ, 3.4, 2.8, 1.0, mat('#2d3c39'));
  block(contX, contZ, 3.4, 1.0);
  box(contX, 1.6, contZ + 0.52, 2.8, 1.6, 0.06, mat('#d0c5a0', 0.85, 0.05));
  lamp(contX, 2.9, contZ + 0.6, '#ffd580');
  items.push({
    type: 'contracts_board',
    x: contX,
    z: contZ + 1.5,
    title: 'Restaurant & Café Noticeboard',
    sub: 'Press E to fulfill delivery contracts for coins and reputation',
  });

  // Decorative crates, barrels, and scale props
  for (const [cx, cz, s] of [
    [-8, 4, 1.1], [-9.2, 4.2, 0.9], [8.5, 5, 1.0], [9.5, 5.4, 0.9],
    [-3, -3, 0.8], [3, -3, 0.8], [-8.5, -8, 1.2], [8.5, -8, 1.2]
  ]) {
    box(cx, s * 0.5, cz, s, s, s, mat('#634932'));
    block(cx, cz, s, s);
  }

  // Eastern Gateway to Personal Garden
  const gateX = 10.7, gateZ = 0;
  for (const gz of [-1.5, 1.5]) {
    box(gateX, 1.8, gz, 0.6, 3.6, 0.6, mat('#273d3d'));
    glow(gateX, 3.6, gz, 0.8, 0.3, 0.8, '#74d0bd', 2.0);
  }
  box(gateX, 3.8, 0, 0.8, 0.35, 3.6, mat('#273d3d'));
  items.push({
    type: 'garden_gate',
    x: gateX,
    z: gateZ,
    title: 'Travel to Your Market Garden',
    sub: 'Press E to walk the path to your personal plot',
  });

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

  // --- THE GREAT MILL & MACHINE SHOP (southeast, against the south wall) ---
  // The mill is the court's machine-shop landmark: broken until the community
  // restores it, then it grinds wheat into flour for everyone. It changes
  // visual state at runtime, so it lives under a dynamic subgroup that the
  // static instanced batch below never touches (AGENTS.md §7).
  const millDynamic = new THREE.Group();
  millDynamic.name = 'dynamic';
  group.add(millDynamic);
  const millState = { restored: false };

  const millX = 3, millZ = 7.6;
  // Round stone tower base (always present)
  box(millX, 1.6, millZ, 2.6, 3.2, 2.6, mat('#5a5f58', 0.75, 0.12), millDynamic);
  box(millX, 3.3, millZ, 2.9, 0.28, 2.9, mat('#6d7268'), millDynamic);
  box(millX, 0.35, millZ, 3.0, 0.7, 3.0, mat('#454a44'), millDynamic);
  block(millX, millZ, 2.6, 2.6);
  // Mill doorway facing the court
  box(millX, 0.75, millZ - 1.32, 0.9, 1.5, 0.12, mat('#2c2620'), millDynamic);
  const millDoorGlow = glow(millX, 1.0, millZ - 1.36, 0.7, 1.0, 0.05, '#e0a865', 0.4);
  millDynamic.add(millDoorGlow);

  // Broken state: shattered cap and a collapsed sail arm
  const brokenGroup = new THREE.Group();
  millDynamic.add(brokenGroup);
  const brokenCap = box(millX, 3.8, millZ, 2.2, 0.5, 2.2, mat('#4a3b2b'), brokenGroup);
  brokenCap.rotation.z = 0.28;
  const fallenArm = box(millX - 1.9, 0.5, millZ - 1.7, 2.4, 0.16, 0.22, mat('#6b5845'), brokenGroup);
  fallenArm.rotation.z = 0.1;
  // Leaning millstone awaiting reassembly
  const leanStone = box(millX + 1.75, 0.55, millZ - 1.5, 1.0, 1.0, 0.35, mat('#7d827a'), brokenGroup);
  leanStone.rotation.z = 0.35;

  // Restored state: proper cap, four sails on a hub, warm working glow
  const restoredGroup = new THREE.Group();
  millDynamic.add(restoredGroup);
  box(millX, 3.85, millZ, 2.5, 0.55, 2.5, mat('#63513a'), restoredGroup);
  box(millX, 4.25, millZ, 1.4, 0.35, 1.4, mat('#54452f'), restoredGroup);
  const hub = new THREE.Group();
  hub.position.set(millX, 3.6, millZ - 1.42);
  restoredGroup.add(hub);
  box(millX, 3.6, millZ - 1.35, 0.5, 0.5, 0.4, mat('#8a744f'), hub);
  for (let i = 0; i < 4; i++) {
    const sail = box(0, 0, 0, 2.3, 0.5, 0.08, mat('#a08a5f', 0.7), hub);
    sail.position.set(Math.cos(i * Math.PI / 2) * 1.35, Math.sin(i * Math.PI / 2) * 1.35, -0.18);
    sail.rotation.z = i * Math.PI / 2;
  }
  const millLantern = glow(millX + 1.0, 1.9, millZ - 1.36, 0.2, 0.3, 0.08, '#ffcb79', 1.4);
  restoredGroup.add(millLantern);
  const workGlow = glow(millX, 1.05, millZ - 1.38, 0.8, 0.5, 0.05, '#f0b060', 0.8);
  restoredGroup.add(workGlow);

  items.push({
    type: 'mill',
    x: millX,
    z: 5.6,
    title: 'The Great Mill (broken)',
    sub: 'Press E to help restore it with materials',
  });

  // Machine shop workbench beside the mill: contributions & tool crafting
  const benchX = 5.8, benchZ = 7.4;
  box(benchX, 0.55, benchZ, 1.5, 0.9, 1.1, mat('#4a3b2b'), millDynamic);
  box(benchX, 1.05, benchZ, 1.6, 0.12, 1.2, mat('#5f4d36'), millDynamic);
  block(benchX, benchZ, 1.5, 1.1);
  box(benchX - 0.35, 1.25, benchZ, 0.5, 0.3, 0.5, mat('#7d827a'), millDynamic);
  box(benchX + 0.4, 1.22, benchZ - 0.15, 0.3, 0.24, 0.3, mat('#c07840'), millDynamic);
  items.push({
    type: 'machine_bench',
    x: benchX,
    z: 6.2,
    title: 'Machine Shop Workbench',
    sub: 'Press E to contribute materials & craft garden tools',
  });

  function setMachineState(machines) {
    const restored = machines?.mill?.status === 'restored';
    millState.restored = restored;
    brokenGroup.visible = !restored;
    restoredGroup.visible = restored;
    const millItem = items.find(item => item.type === 'mill');
    if (millItem) {
      millItem.title = restored ? 'The Great Mill' : 'The Great Mill (broken)';
      millItem.sub = restored
        ? 'Press E to mill wheat into flour'
        : 'Press E to help restore it with materials';
    }
  }
  setMachineState(null);

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
    if (millState.restored) {
      hub.rotation.z = time * 0.55;
    }
  }

  return { group, obstacles, items, update, setMachineState };
}
