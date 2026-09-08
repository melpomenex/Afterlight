import * as THREE from 'three';

// Small authoring helpers for the three social environments. Every repeated
// primitive is instanced; collision and seat metadata stay explicit.
export function createSocialScenery(ctx) {
  const root = new THREE.Group();
  root.name = 'social-scenery';
  ctx.group.add(root);
  const geometry = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    sphere: new THREE.IcosahedronGeometry(0.5, 1),
  };
  const batches = new Map();
  const owned = ctx.owned;
  owned.geometries.push(...Object.values(geometry));
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  const materials = new Map();

  function add(shape, position, size, tint, family = 'stone', rotation = [0, 0, 0]) {
    const key = `${shape}:${family}`;
    if (!batches.has(key)) batches.set(key, { shape, family, instances: [] });
    transform.position.fromArray(position);
    transform.scale.fromArray(size);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    batches.get(key).instances.push({ matrix: transform.matrix.clone(), tint });
  }
  const box = (x, y, z, w, h, d, tint, family = 'stone', yaw = 0) =>
    add('box', [x, y, z], [w, h, d], tint, family, [0, yaw, 0]);
  const cylinder = (x, y, z, w, h, tint, family = 'metal') =>
    add('cylinder', [x, y, z], [w, h, w], tint, family);
  const sphere = (x, y, z, w, h, d, tint, family = 'foliage') =>
    add('sphere', [x, y, z], [w, h, d], tint, family);

  function beam(from, to, width, tint, family = 'metal') {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    transform.position.copy(a).add(b).multiplyScalar(0.5);
    transform.scale.set(width, a.distanceTo(b), width);
    transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    transform.updateMatrix();
    const key = `box:${family}`;
    if (!batches.has(key)) batches.set(key, { shape: 'box', family, instances: [] });
    batches.get(key).instances.push({ matrix: transform.matrix.clone(), tint });
  }

  function seat(id, x, z, yaw, groupId, tint = '#8a684b') {
    const sx = Math.sin(yaw), cz = Math.cos(yaw);
    box(x, .39, z, .72, .14, .58, tint, 'wood', yaw);
    box(x - sx * .25, .7, z - cz * .25, .72, .48, .1, tint, 'wood', yaw);
    for (const side of [-1, 1]) {
      const lx = x + side * .27 * cz, lz = z - side * .27 * sx;
      box(lx, .18, lz, .09, .36, .45, '#263637', 'metal', yaw);
    }
    // Rotated footprint remains within this conservative square. Dismount
    // uses 1.05 rather than .95 for diagonal seats after actor expansion.
    ctx.block(x, z, .76, .76);
    const distance = Math.abs(sx * cz) > .1 ? 1.2 : 1.05;
    ctx.items.push({ type: 'seat', id, x, z, title: 'Take a seat',
      sub: 'Stay a while · E to sit', groupId, acousticZoneId: groupId,
      sit: { x, y: 0, z, rotY: yaw },
      dismount: [{ x: x + sx * distance, z: z + cz * distance }],
      animationProfile: 'folded' });
  }

  function light(x, y, z, tint = '#ffc47a', intensity = 9, distance = 9) {
    const node = new THREE.PointLight(tint, intensity, distance, 2);
    node.position.set(x, y, z); root.add(node); owned.lights.push(node);
    return node;
  }
  function lantern(x, z, height = 2.7, lit = true) {
    cylinder(x, height / 2, z, .09, height, '#324446');
    box(x, height, z, .24, .35, .24, '#ffc47a', 'emissive');
    box(x, height + .23, z, .43, .1, .43, '#344449', 'metal');
    if (lit) light(x, height, z);
    ctx.block(x, z, .18, .18);
  }
  function zone(id, rect, roofY, exposure, priority, audio) {
    ctx.environment.zones.push({ id, rect, roofY, exposure, priority, feather: .5,
      audio, acoustic: { groupId: id, quiet: exposure < .2 } });
  }
  function finish() {
    for (const { shape, family, instances } of batches.values()) {
      if (!materials.has(family)) {
        const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .72, metalness: family === 'metal' ? .6 : .08 });
        if (family === 'emissive' || family === 'windows') {
          mat.emissive.set('#ffbb73'); mat.emissiveIntensity = family === 'windows' ? .75 : 1.8;
        }
        if (family === 'puddle') {
          mat.transparent = true; mat.opacity = .48; mat.depthWrite = false;
          mat.roughness = .15; mat.metalness = .5;
        }
        materials.set(family, mat); owned.materials.push(mat);
        ctx.environment.materialFamilies.push({ key: family, material: mat, wettable: family === 'wet-stone',
          sheltered: family !== 'wet-stone',
          dry: Object.freeze({color:mat.color.getHex(),roughness:mat.roughness,metalness:mat.metalness}) });
      }
      const mesh = new THREE.InstancedMesh(geometry[shape], materials.get(family), instances.length);
      mesh.name = `social-${shape}-${family}`;
      instances.forEach((entry, i) => { mesh.setMatrixAt(i, entry.matrix); mesh.setColorAt(i, color.set(entry.tint)); });
      mesh.castShadow = !['emissive', 'windows', 'puddle'].includes(family);
      mesh.receiveShadow = true; mesh.computeBoundingSphere(); root.add(mesh);
    }
    return { root, materials };
  }
  return { box, cylinder, sphere, beam, seat, light, lantern, zone, finish };
}

export function addSocialBoundary(s, def, tint) {
  // Low parapets/rim with wide, visible openings at each actual exit.
  for (const x of [-11.6, 11.6]) for (const z of [-6, 6]) s.box(x, .36, z, .35, .72, 8, tint);
  s.box(0, .45, -9.9, 23.5, .9, .4, tint);
  for (const x of [-6.4, 6.4]) s.box(x, .2, 10.6, 10.2, .4, .4, tint);
  for (const exit of def.exits) {
    const [x, z] = exit.position;
    s.box(x, .015, z, 1.2, .035, 1.2, '#b9a777', 'metal');
    for (const side of [-1, 1]) s.box(x + (exit.kind === 'market' ? side * .85 : 0), .32,
      z + (exit.kind === 'market' ? 0 : side * .85), .16, .64, .16, '#e2bb78', 'emissive');
  }
}
