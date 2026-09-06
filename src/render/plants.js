import * as THREE from 'three';
import { CROPS, GROWTH_STAGES } from '../../shared/crops.js';

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 6, 6);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 6);

const plantMaterials = new Map();
function getMaterial(color, roughness = 0.65, metalness = 0.1, emissive = 0x000000, emissiveIntensity = 0) {
  const key = `${color}_${roughness}_${metalness}_${emissive}_${emissiveIntensity}`;
  if (!plantMaterials.has(key)) {
    plantMaterials.set(key, new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive,
      emissiveIntensity,
    }));
  }
  return plantMaterials.get(key);
}

/**
 * Creates or updates the visual 3D mesh for a crop at a given growth stage.
 * @param {THREE.Group} targetGroup Group where crop meshes are added
 * @param {string} cropId
 * @param {number} stage GROWTH_STAGES enum value
 */
export function renderCropVisual(targetGroup, cropId, stage) {
  // Clear previous plant children
  while (targetGroup.children.length > 0) {
    targetGroup.remove(targetGroup.children[0]);
  }

  if (!cropId || stage <= GROWTH_STAGES.PREPARED) {
    return;
  }

  const crop = CROPS[cropId] ?? CROPS.radish;
  const plantMat = getMaterial(crop.color, 0.6, 0.1);
  const produceMat = getMaterial(crop.produceColor, 0.4, 0.15, crop.produceColor, 0.25);

  if (stage === GROWTH_STAGES.SEED) {
    // Stage 1: Seed dots / tiny green cotyledons poking out of mounds
    for (const [ox, oz] of [[-0.2, -0.15], [0.2, 0.15], [0, 0]]) {
      const seed = new THREE.Mesh(boxGeo, getMaterial('#829b65', 0.8));
      seed.position.set(ox, 0.08, oz);
      seed.scale.set(0.06, 0.08, 0.06);
      seed.castShadow = true;
      targetGroup.add(seed);
    }
    return;
  }

  if (stage === GROWTH_STAGES.SPROUT) {
    // Stage 2: Small stem and 2 tiny leaves
    const stem = new THREE.Mesh(cylGeo, getMaterial('#55864e', 0.7));
    stem.position.set(0, 0.15, 0);
    stem.scale.set(0.025, 0.25, 0.025);
    targetGroup.add(stem);

    for (let i = 0; i < 2; i++) {
      const leaf = new THREE.Mesh(boxGeo, plantMat);
      leaf.position.set(i === 0 ? -0.07 : 0.07, 0.24, 0);
      leaf.scale.set(0.12, 0.03, 0.08);
      leaf.rotation.z = (i === 0 ? -1 : 1) * 0.4;
      targetGroup.add(leaf);
    }
    return;
  }

  if (stage === GROWTH_STAGES.JUVENILE) {
    // Stage 3: Bushier stems and medium leaf clusters
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const stem = new THREE.Mesh(cylGeo, plantMat);
      stem.position.set(Math.cos(angle) * 0.08, 0.25, Math.sin(angle) * 0.08);
      stem.scale.set(0.035, 0.45, 0.035);
      stem.rotation.z = Math.cos(angle) * 0.25;
      stem.rotation.x = Math.sin(angle) * 0.25;
      targetGroup.add(stem);

      const leafCluster = new THREE.Mesh(boxGeo, plantMat);
      leafCluster.position.set(Math.cos(angle) * 0.16, 0.45, Math.sin(angle) * 0.16);
      leafCluster.scale.set(0.22, 0.06, 0.16);
      leafCluster.rotation.y = angle;
      targetGroup.add(leafCluster);
    }
    return;
  }

  if (stage === GROWTH_STAGES.MATURE || stage === GROWTH_STAGES.HARVESTABLE) {
    // Stage 4 & 5: Full lush foliage
    const isHarvestable = stage === GROWTH_STAGES.HARVESTABLE;
    const foliageScale = isHarvestable ? 1.0 : 0.85;

    // Center main stem / trellis
    if (cropId === 'tomato') {
      // Trellis stake
      const stake = new THREE.Mesh(cylGeo, getMaterial('#5b4834', 0.8));
      stake.position.set(0, 0.5, 0);
      stake.scale.set(0.04, 1.0, 0.04);
      targetGroup.add(stake);
    }

    // Leaf bundles
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const leaf = new THREE.Mesh(boxGeo, plantMat);
      leaf.position.set(Math.cos(angle) * 0.2 * foliageScale, 0.35 + (i % 2) * 0.15, Math.sin(angle) * 0.2 * foliageScale);
      leaf.scale.set(0.3 * foliageScale, 0.1, 0.22 * foliageScale);
      leaf.rotation.set(Math.sin(angle) * 0.3, angle, Math.cos(angle) * 0.3);
      leaf.castShadow = true;
      targetGroup.add(leaf);
    }

    // If harvestable, show prominent produce fruits / roots
    if (isHarvestable) {
      if (cropId === 'radish' || cropId === 'carrot') {
        // Root crops: Top of the root crowned by greens
        for (let i = 0; i < 3; i++) {
          const ox = (i - 1) * 0.18;
          const root = new THREE.Mesh(cropId === 'carrot' ? cylGeo : sphereGeo, produceMat);
          root.position.set(ox, cropId === 'carrot' ? 0.2 : 0.16, 0);
          root.scale.set(0.12, 0.22, 0.12);
          root.castShadow = true;
          targetGroup.add(root);
        }
      } else if (cropId === 'tomato' || cropId === 'strawberry') {
        // Hanging fruit spheres
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI * 2) / 4 + 0.3;
          const fruit = new THREE.Mesh(sphereGeo, produceMat);
          fruit.position.set(Math.cos(angle) * 0.25, 0.38 + (i % 2) * 0.15, Math.sin(angle) * 0.25);
          fruit.scale.set(0.13, 0.14, 0.13);
          fruit.castShadow = true;
          targetGroup.add(fruit);
        }
      } else {
        // Basil, Lettuce, Kale: lush harvestable crown leaves
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI * 2) / 4;
          const leafCrown = new THREE.Mesh(boxGeo, produceMat);
          leafCrown.position.set(Math.cos(angle) * 0.15, 0.55, Math.sin(angle) * 0.15);
          leafCrown.scale.set(0.24, 0.08, 0.18);
          leafCrown.rotation.set(0.2, angle + 0.4, 0.2);
          leafCrown.castShadow = true;
          targetGroup.add(leafCrown);
        }
      }
    }
  }
}
