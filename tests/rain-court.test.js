import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySocialPlace, verifyLegacyEdges } from './social-place-helpers.js';
import { getPreset } from '../shared/atmospherePresets.js';

test('Rain Court keeps its identity and has six safe seats across three groups',()=>{
  verifyLegacyEdges();
  const {def,world,seats}=verifySocialPlace('court',6,[[-9,0],[0,0],[9,0],[0,8.8],[-5,-5.5],[2,-5]]);
  assert.equal(def.shell,'none');assert.equal(def.objective,undefined);assert.equal(def.note,undefined);
  assert.equal(new Set(seats.map(s=>s.groupId)).size,3);
  assert.equal(world.environment.zones.find(z=>z.id==='alcove').priority,20);
  assert.equal(world.environment.zones.find(z=>z.id==='arcade').exposure,.1);
  assert.ok(world.environment.materialFamilies.some(f=>f.key==='wet-stone'&&f.wettable));
  assert.ok(world.environment.materialFamilies.some(f=>f.key==='dry-stone'&&!f.wettable));
  assert.equal(getPreset(def.atmosphere.preset).rain,.8);
  world.ownedResources.dispose();
});

import { createSurfaceWetness } from '../src/atmosphere/surfaces.js';
test('Rain Court wetness changes the rendered batch and restores its dry baseline',()=>{
  const {world}=verifySocialPlace('court',6,[[0,0]]);
  const wet=world.environment.materialFamilies.find(f=>f.key==='wet-stone');
  const dry=world.environment.materialFamilies.find(f=>f.key==='dry-stone');
  const before=wet.material.color.getHex(),covered=dry.material.color.getHex();
  const effect=createSurfaceWetness({world,wetMap:false});
  for(let i=0;i<10;i++){effect.apply(1);assert.notEqual(wet.material.color.getHex(),before);assert.equal(dry.material.color.getHex(),covered);effect.restore();assert.equal(wet.material.color.getHex(),before);}
  effect.dispose();world.ownedResources.dispose();
});
