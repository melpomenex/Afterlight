import * as THREE from 'three';
import { MATERIAL_NODES, MATERIALS } from '../../shared/materials.js';
import { getPlaceDefinition, validatePlaceDefinition } from '../../shared/placeDefinitions.js';
import { requirePlaceBuilder } from './registry.js';

// Imperative construction pipeline shared by every place world. This is the
// same machinery buildDistrict always ran — validation, deterministic seed,
// optional legacy urban shell, per-district builder, notes/landmarks, gather
// nodes and static instanced batching — extracted so shells can vary and so
// each world reports the resources it owns. It is not a new world engine:
// geometry stays explicit Three.js authored in builder functions.

// Gather-node visuals. These live in a dynamic subgroup that is explicitly
// excluded from the static instanced batch: nodes change state at runtime
// (depleted/available), and animating batched source meshes silently does
// nothing (AGENTS.md §7). Geometry and cached materials here are shared
// module-level resources, so they are deliberately NOT part of a world's
// owned-resource set; disposing them would corrupt other cached worlds.
const nodeGeo = new THREE.BoxGeometry(1, 1, 1);
const nodeMaterialCache = new Map();
function nodeMaterial(color, emissive = null, emissiveIntensity = 0) {
  const key = `${color}_${emissive || ''}_${emissiveIntensity}`;
  if (!nodeMaterialCache.has(key)) {
    nodeMaterialCache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: 0.62, metalness: 0.2,
      emissive: emissive || '#000000', emissiveIntensity,
    }));
  }
  return nodeMaterialCache.get(key);
}
function nbox(parent, x, y, z, w, h, d, mat, rotZ = 0, rotY = 0) {
  const mesh = new THREE.Mesh(nodeGeo, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  mesh.rotation.z = rotZ;
  mesh.rotation.y = rotY;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Builds the harvestable material nodes owned by this district under a
// dynamic subgroup, and returns { visuals, dynamic }.
function buildMaterialNodes(def, ctx) {
  const { group, items, animated } = ctx;
  const defs = MATERIAL_NODES.filter(node => node.district === def.id);
  if (defs.length === 0) return null;

  const dynamic = new THREE.Group();
  dynamic.name = 'dynamic';
  group.add(dynamic);

  const visuals = defs.map((nodeDef, i) => {
    const matDef = MATERIALS[nodeDef.material];
    const [x, z] = nodeDef.position;
    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(x, 0, z);
    dynamic.add(nodeGroup);

    // Shared base slab every node keeps, even picked clean.
    nbox(nodeGroup, 0, 0.12, 0, 1.15, 0.24, 1.15, nodeMaterial('#3d4547'));

    // The harvestable cache itself; hidden while depleted.
    const rich = new THREE.Group();
    nodeGroup.add(rich);
    if (nodeDef.material === 'copper') {
      nbox(rich, -0.18, 0.34, 0.1, 0.42, 0.34, 0.42, nodeMaterial(matDef.color), 0, 0.4);
      nbox(rich, 0.22, 0.3, -0.14, 0.34, 0.26, 0.34, nodeMaterial('#a8663a'), 0.2, -0.5);
      nbox(rich, 0.05, 0.54, 0.02, 0.2, 0.22, 0.2, nodeMaterial('#d18b52'), -0.3, 0.9);
    } else if (nodeDef.material === 'timber') {
      nbox(rich, 0, 0.36, 0.05, 1.05, 0.26, 0.3, nodeMaterial(matDef.color), 0, 0.18);
      nbox(rich, 0.06, 0.6, -0.04, 0.95, 0.24, 0.28, nodeMaterial('#8a6842'), 0, -0.32);
      nbox(rich, -0.05, 0.8, 0.02, 0.6, 0.2, 0.24, nodeMaterial('#6b4e30'), 0, 0.62);
    } else {
      nbox(rich, -0.16, 0.4, 0.08, 0.16, 0.5, 0.4, nodeMaterial(matDef.color), 0.12, 0.3);
      nbox(rich, 0.18, 0.36, -0.1, 0.14, 0.44, 0.34, nodeMaterial('#b8d8e8'), -0.1, -0.6);
      nbox(rich, 0.02, 0.52, 0.12, 0.12, 0.62, 0.3, nodeMaterial('#cfe4f0'), 0.05, 1.1);
    }

    // A single warm glint marks the cache as gatherable; it is extinguished
    // while the node is depleted.
    const sparkMat = new THREE.MeshStandardMaterial({
      color: matDef.glowColor, emissive: matDef.glowColor, emissiveIntensity: 1.2,
    });
    const spark = new THREE.Mesh(nodeGeo, sparkMat);
    spark.scale.set(0.12, 0.12, 0.12);
    spark.position.y = 0.95;
    nodeGroup.add(spark);

    const item = {
      type: 'material_node',
      nodeId: nodeDef.id,
      material: nodeDef.material,
      x, z,
      title: `${matDef.name} cache`,
      sub: 'Press E to gather materials',
    };
    items.push(item);

    const visual = { def: nodeDef, nodeGroup, rich, spark, sparkMat, item, depleted: false, phase: i * 1.7 };
    animated.push(time => {
      if (visual.depleted) return;
      spark.position.y = 0.95 + Math.sin(time * 2 + visual.phase) * 0.07;
      spark.rotation.y = time * 0.8 + visual.phase;
      sparkMat.emissiveIntensity = 1.1 + Math.sin(time * 2.6 + visual.phase) * 0.35;
    });
    return visual;
  });

  return { visuals, dynamic };
}

function applyNodeState(visual, state) {
  visual.depleted = !state.available;
  visual.rich.visible = state.available;
  visual.spark.visible = state.available;
  if (visual.item) {
    visual.item.sub = state.available
      ? 'Press E to gather materials'
      : 'Picked clean — it will regrow in time';
  }
}

// Gate items generated from a definition's declared exits. The wording is the
// exact legacy gate copy; exits come from the frozen manifest topology, so
// appending a place can never reroute an existing destination.
const GATE_BOUND_WORDED = { west: 'Westbound', east: 'Eastbound' };

export function gateItemsFor(def) {
  const items = [];
  for (const exit of def.exits ?? []) {
    if (exit.kind === 'market') {
      items.push({
        type: 'market_gate',
        x: exit.position[0],
        z: exit.position[1],
        targetDistrict: 'market',
        title: 'Return to Market Court',
        sub: 'Trade produce & visit your garden',
      });
      continue;
    }
    const target = getPlaceDefinition(exit.target);
    const worded = GATE_BOUND_WORDED[exit.id]
      ?? `${exit.id.charAt(0).toUpperCase()}${exit.id.slice(1)}bound`;
    items.push({
      type: 'district_gate',
      x: exit.position[0],
      z: exit.position[1],
      targetDistrict: exit.target,
      title: `Gate to ${target ? target.name : exit.target}`,
      sub: `${worded}: ${target ? target.district : ''}`,
    });
  }
  return items;
}

// Generic legacy gate visual volumes: the dark arch slab and its glowing
// portal for every declared exit. Side gates (west/east) are thin in x; the
// axial market gate is thin in z. main.js renders exactly these boxes, and a
// builder that opts into solid gate slabs blocks the same volumes, so the
// rendered slab and its collision can never drift apart.
export function gateVisualBoxesFor(def) {
  const boxes = [];
  for (const exit of def.exits ?? []) {
    const [gx, gz] = exit.position;
    const side = Math.abs(gx) >= Math.abs(gz);
    boxes.push(
      { role: 'arch', x: gx, y: 2.5, z: gz, w: side ? 0.6 : 2.4, h: 5, d: side ? 2.4 : 0.6 },
      { role: 'portal', x: gx, y: 1.8, z: gz, w: side ? 0.1 : 1.8, h: 3.4, d: side ? 1.8 : 0.1 },
    );
  }
  return boxes;
}

// Builds one place world. The definition is validated (reporting its id)
// before any geometry exists, and a builder failure disposes exactly the
// resources this factory tracked — never shared module caches or other
// worlds' materials. The returned group is never added to a scene and stays
// hidden until travel activates it.
export function buildPlaceWorld(def, { completed = false } = {}) {
  const problems = validatePlaceDefinition(def);
  if (problems.length > 0) {
    throw new Error(`Invalid place definition "${def?.id ?? 'unknown'}": ${problems.join('; ')}`);
  }
  const builder = requirePlaceBuilder(def);

  const group = new THREE.Group();
  group.name = def.id;
  const obstacles = [], items = [], animated = [];
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const colors = { stone: '#6b776c', dark: '#233c3e', brass: '#b78d50', green: '#58734c' };

  // Owned resources: everything this factory created for THIS world. Builder
  // functions may add their own meshes; those ride the group but are not
  // individually tracked yet (see D6 — dispose only what is owned).
  const owned = { geometries: [geometry], materials: [], lights: [] };

  // Atmosphere hooks (zones, material families, emitter anchors) are authored
  // by builders over time; the keys exist from day one so later environments
  // bind without changing this contract.
  const environment = { zones: [], materialFamilies: [], emitterAnchors: [] };

  const materialCache = new Map();
  const material = color => {
    if (!materialCache.has(color)) {
      materialCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: .62, metalness: .2 }));
      owned.materials.push(materialCache.get(color));
    }
    return materialCache.get(color);
  };
  // Atmosphere material families (add-atmosphere-weather-system task 3.3,
  // design D6): a builder declares a family and receives ONE owned material
  // whose dry look is snapshotted immutably at declaration. Boxes created
  // with that material batch into their own InstancedMesh sharing exactly
  // that material object, so wetness (src/atmosphere/surfaces.js) can retint
  // the family after batching without cloning materials or writing
  // instanceColor. `sheltered` families stay dry under cover forever.
  function family(key, { color = colors.stone, roughness = .62, metalness = .2, sheltered = false } = {}) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    owned.materials.push(mat);
    const declaration = {
      key,
      material: mat,
      sheltered: !!sheltered,
      dry: Object.freeze({ color: mat.color.getHex(), roughness, metalness }),
    };
    environment.materialFamilies.push(declaration);
    return mat;
  }
  function box(x, y, z, w, h, d, color = colors.stone) {
    const mat = color && color.isMaterial ? color : material(color);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  function block(x, z, w, d) { obstacles.push({ x, z, w: w / 2 + .38, d: d / 2 + .38 }); }
  function glow(x, y, z, w, h, d, color, intensity = 1.5) {
    const mesh = box(x, y, z, w, h, d, color);
    mesh.material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity });
    owned.materials.push(mesh.material);
    return mesh;
  }
  function lamp(x, z, color = '#ffcb79') {
    box(x, 1.8, z, .12, 3.6, .12, colors.dark);
    glow(x, 3.6, z, .35, .5, .35, color, 2);
    box(x, 3.92, z, .6, .12, .6, colors.dark);
    const light = new THREE.PointLight(color, 7, 7, 2);
    light.position.set(x, 3.4, z); group.add(light);
    owned.lights.push(light);
    block(x, z, .25, .25);
  }
  // Seeds are explicit manifest values (legacy order × 37, zero for court);
  // the indexOf fallback keeps ad-hoc definitions deterministic too.
  let seed = Number.isFinite(def.seed) ? def.seed : getPlaceDefinition(def.id)?.seed;
  if (!Number.isFinite(seed)) seed = 0;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

  function disposeOwned() {
    for (const g of owned.geometries.splice(0)) g.dispose();
    for (const m of owned.materials.splice(0)) m.dispose();
    for (const light of owned.lights.splice(0)) light.parent?.remove(light);
  }

  try {
    // The universal urban shell: legacy-urban reproduces the historical
    // construction exactly (including its share of the deterministic seed);
    // shell `none` skips floor, paving, walls, backdrop and lamps so the
    // builder owns the complete environment.
    if (def.shell !== 'none') {
      box(0, -.55, 0, 25, 1, 22, '#263638');
      for (let x = -12; x < 12; x++) for (let z = -10; z < 11; z++) {
        const palette = def.id === 'garden' ? ['#7b816a', '#8b8b70', '#64745e'] : ['#586b6d', '#657373', '#475b61'];
        box(x + .5, .06, z + .5, .96, .15, .96, palette[Math.floor(random() * 3)]);
      }
      // Low perimeter walls leave the near side open to the camera.
      for (let x = -12; x <= 12; x += .8) for (let y = .4; y < 3; y += .4) box(x, y, -10.5, .76, .37, .65, y > 2.6 ? '#a0a18a' : '#4d6561');
      for (let z = -10; z < 11; z += .8) {
        for (const x of [-12, 12]) {
          if (Math.abs(z) < 2) continue;
          box(x, .65, z, .5, 1.3, .76, colors.dark);
          box(x, 1.35, z, .7, .15, .78, colors.stone);
        }
      }
      for (const x of [-9, -3, 3, 9]) {
        box(x, 4, -13, 5, 8, 4, '#2b4145');
        for (let a = -1.5; a < 2; a += 1) for (let y = 3; y < 7; y += 1.5) glow(x + a, y, -10.96, .45, .7, .04, '#91b4ab', .25);
      }
      lamp(-10, -7); lamp(10, 8);
    }

    // Atmosphere hooks live at function scope (declared above) so the family
    // helper and the batch step below share one binding.
    const ctx = { group, obstacles, items, animated, geometry, colors, material, box, block, glow, lamp, random, def, completed, environment, owned, family };
    builder(ctx);

    // Notes and landmarks remain accessible from a clear approach. Districts
    // without one (the court, every social place) simply skip the block.
    let signal = null, ring = null;
    if (def.note) {
      const [nx, nz] = def.note;
      box(nx, .6, nz, .8, 1.2, .6, colors.dark); block(nx, nz, .8, .6);
      glow(nx, 1.24, nz, .5, .035, .4, '#d4c9a1', .4);
      items.push({ type: 'field-note', x: nx, z: nz, title: 'Read the field note', sub: def.noteTitle, body: def.noteBody });
    }
    if (def.landmark) {
      const [lx, lz] = def.landmark;
      signal = glow(lx, 2.5, lz, .13, .13, .13, '#ffe0a0', 2);
      ring = new THREE.Mesh(new THREE.RingGeometry(.8, .84, 32), new THREE.MeshBasicMaterial({ color: '#e7c889', side: THREE.DoubleSide, transparent: true, opacity: .65 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(lx, .25, lz); group.add(ring);
      items.push({ type: 'landmark', x: lx, z: lz, title: def.action, sub: 'A small act of restoration' });
    }

    // Activities declared for this place (place activities program)
    if (Array.isArray(def.activities)) {
      for (const act of def.activities) {
        if (!act || !act.id) continue;
        if (items.some(it => it.id === act.id || it.activityId === act.id)) continue;
        const pos = act.transform?.position || [0, 0];
        const ax = pos[0];
        const az = pos.length === 3 ? pos[2] : pos[1];
        if (act.footprint && !obstacles.some(o => Math.abs(o.x - ax) < 0.01 && Math.abs(o.z - az) < 0.01)) {
          block(ax, az, act.footprint.width, act.footprint.depth);
        }
        items.push({
          type: 'activity',
          id: act.id,
          activityId: act.id,
          activityType: act.type,
          x: ax,
          z: az,
          interactionRadius: act.interactionRadius || 2.4,
          title: act.title || `Play ${act.type ? act.type.charAt(0).toUpperCase() + act.type.slice(1) : 'Activity'}`,
          sub: act.sub || 'Press E to play · Spectate / Queue',
          activityDef: act,
        });
      }
    }

    // Gather nodes for this district (server state applied on district entry).
    // They live in a dynamic subgroup that the static batch below skips.
    const nodeBuild = buildMaterialNodes(def, { group, items, animated });
    function setNodeStates(states) {
      if (!nodeBuild || !Array.isArray(states)) return;
      for (const state of states) {
        const visual = nodeBuild.visuals.find(v => v.def.id === state.nodeId);
        if (visual) applyNodeState(visual, state);
      }
    }
    function update(time, done) {
      if (signal) {
        signal.position.y = 2.5 + Math.sin(time * 2) * .12;
        signal.material.emissive.set(done ? '#93e9b6' : '#ffe0a0');
      }
      if (ring) ring.material.color.set(done ? '#93e9b6' : '#e7c889');
      animated.forEach(fn => fn(time, done));
    }
    update(0, completed);
    // Instance opaque static boxes, preserving glass and emissive animated
    // objects. Boxes whose material belongs to a declared atmosphere family
    // (task 3.3, design D6) batch per family under that family's OWN material
    // — one material per family, instanceColor unchanged — so wetness can
    // retint a family after batching. Every other box keeps the exact legacy
    // single batch (same filter, same order, same shared white material), so
    // legacy-urban worlds are unchanged byte for byte.
    const statics = group.children.filter(o => o.isMesh && o.geometry === geometry && !o.material.transparent && o.material.emissive?.getHex() === 0);
    const familyByMaterial = new Map(environment.materialFamilies.map(f => [f.material, f]));
    const familyBuckets = new Map();
    const legacyStatics = [];
    for (const mesh of statics) {
      const declaration = familyByMaterial.get(mesh.material);
      if (declaration) {
        if (!familyBuckets.has(declaration)) familyBuckets.set(declaration, []);
        familyBuckets.get(declaration).push(mesh);
      } else {
        legacyStatics.push(mesh);
      }
    }
    const batchInto = (meshes, batchMaterial) => {
      if (meshes.length === 0) return null;
      const batch = new THREE.InstancedMesh(geometry, batchMaterial, meshes.length);
      meshes.forEach((mesh, i) => { mesh.updateMatrix(); batch.setMatrixAt(i, mesh.matrix); batch.setColorAt(i, mesh.material.color); group.remove(mesh); });
      batch.castShadow = batch.receiveShadow = true; group.add(batch);
      return batch;
    };
    if (legacyStatics.length > 0 || environment.materialFamilies.length === 0) {
      const batchMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .62, metalness: .2 });
      owned.materials.push(batchMaterial);
      batchInto(legacyStatics, batchMaterial);
    }
    for (const [declaration, meshes] of familyBuckets) {
      declaration.batch = batchInto(meshes, declaration.material);
    }
    // Districts may expose extra data (the theater's screen quad for the DOM
    // overlay); existing consumers only read the fields above, so this is safe.
    group.visible = false;
    return {
      group, obstacles, items, update, setNodeStates,
      screenQuad: ctx.screenQuad || null,
      environment,
      ownedResources: { geometries: owned.geometries, materials: owned.materials, lights: owned.lights, dispose: disposeOwned },
    };
  } catch (error) {
    // A partially built world owns nothing yet: dispose only tracked
    // resources and surface the builder's error. The group was never added
    // to a scene, so nothing stays visible or reachable.
    disposeOwned();
    throw error;
  }
}
