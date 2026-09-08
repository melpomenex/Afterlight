import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySocialPlace, verifyLegacyEdges } from './social-place-helpers.js';
import { readExploration } from '../src/districts.js';
import { getPreset } from '../shared/atmospherePresets.js';

test('Desert adds a stable eighth-seat camp without changing the old route',()=>{
  verifyLegacyEdges();
  const {def,world,seats}=verifySocialPlace('desert-camp',8,[[-9,0],[-4,3],[4,3],[9,0],[5,-4.9]]);
  assert.equal(def.seed,629);assert.equal(def.exits.length,2);assert.equal(def.objective,undefined);
  assert.equal(readExploration({current:'desert-camp',visited:['desert-camp'],completed:['rooftops']}).current,'desert-camp');
  for(const seat of seats.filter(s=>s.groupId==='fire'))assert.ok(Math.abs(seat.sit.rotY-Math.atan2(-seat.x,-2-seat.z))<1e-9);
  assert.equal(getPreset(def.atmosphere.preset).rain,0);
  assert.ok(getPreset(def.atmosphere.preset).events.meteor);
  assert.ok(world.environment.fire);world.ownedResources.dispose();
});

import { createPlaceEffects } from '../src/atmosphere/placeEffects.js';
test('camp effects dispose on repeated travel and reduced tier fits three batches including sky',()=>{
  const {world}=verifySocialPlace('desert-camp',8,[[0,3]]);
  for(let i=0;i<20;i++){
    const effect=createPlaceEffects({environment:world.environment,tier:i%2?'normal':'reduced'});
    world.group.add(effect.group);
    effect.update({serverNow:600000,windX:.1,windZ:0});
    assert.ok(effect.counts.batches+(1)<= (i%2?6:3));
    effect.dispose();effect.dispose();assert.equal(effect.group.parent,null);
  }
  world.ownedResources.dispose();
});
