import test from 'node:test';
import assert from 'node:assert/strict';
import { createAirHockeyTableScene } from '../src/activities/airHockey/tableScene.js';
import {
  AIR_HOCKEY_BED_FINISH,
  AIR_HOCKEY_SURFACE_BOUNDS,
  AIR_HOCKEY_SURFACE_PALETTE,
  contrastRatio,
  relativeLuminance,
} from '../src/activities/airHockey/surfacePalette.js';

test('air hockey palette stays within calibrated luminance bounds', () => {
  const bedLuminance = relativeLuminance(AIR_HOCKEY_SURFACE_PALETTE.bed);
  assert.ok(
    bedLuminance >= AIR_HOCKEY_SURFACE_BOUNDS.bedLuminanceMin,
    `bed luminance ${bedLuminance} below minimum`
  );
  assert.ok(
    bedLuminance <= AIR_HOCKEY_SURFACE_BOUNDS.bedLuminanceMax,
    `bed luminance ${bedLuminance} above maximum`
  );

  for (const marking of ['red', 'cyan']) {
    const ratio = contrastRatio(AIR_HOCKEY_SURFACE_PALETTE[marking], AIR_HOCKEY_SURFACE_PALETTE.bed);
    assert.ok(
      ratio >= AIR_HOCKEY_SURFACE_BOUNDS.minMarkingContrast,
      `${marking} contrast ${ratio} below minimum`
    );
  }
});

test('air hockey bed finish stays within calibrated bounds', () => {
  assert.ok(AIR_HOCKEY_BED_FINISH.roughness >= AIR_HOCKEY_SURFACE_BOUNDS.minRoughness);
  assert.ok(AIR_HOCKEY_BED_FINISH.metalness <= AIR_HOCKEY_SURFACE_BOUNDS.maxMetalness);

  const table = createAirHockeyTableScene();
  assert.ok(table.bedSurface?.mesh, 'bed surface mesh exposed');
  assert.ok(table.bedSurface?.material, 'bed surface material exposed');

  const material = table.bedSurface.material;
  assert.equal(material.color.getHexString(), 'ffffff', 'color lives in the palette texture, not the material');
  assert.ok(material.roughness >= AIR_HOCKEY_SURFACE_BOUNDS.minRoughness);
  assert.ok(material.metalness <= AIR_HOCKEY_SURFACE_BOUNDS.maxMetalness);
  table.destroy();
});

test('air hockey goal glow and scoreboard accents remain intact', () => {
  const table = createAirHockeyTableScene();
  const glowMaterials = [];
  let scoreboardScreens = 0;

  table.group.traverse((child) => {
    if (!child.isMesh) return;
    const material = child.material;
    if (material?.emissive?.getHexString?.() === 'ffaa00') glowMaterials.push(material);
    if (material?.isMeshBasicMaterial && material.map && child.geometry?.type === 'PlaneGeometry') {
      scoreboardScreens += 1;
    }
  });

  assert.ok(glowMaterials.length > 0, 'goal glow material present');
  assert.equal(Math.max(...glowMaterials.map((m) => m.emissiveIntensity)), 0, 'goal glow rests dark');
  assert.ok(scoreboardScreens >= 2, 'front and back scoreboard screens present');

  table.flashGoal(0);
  table.update(0.1);
  assert.ok(
    Math.max(...glowMaterials.map((m) => m.emissiveIntensity)) > 0,
    'goal flash lights the glow strips'
  );

  table.update(1.0);
  assert.equal(
    Math.max(...glowMaterials.map((m) => m.emissiveIntensity)),
    0,
    'goal flash decays back to rest'
  );
  table.destroy();
});
