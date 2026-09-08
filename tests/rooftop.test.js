import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySocialPlace, verifyLegacyEdges } from './social-place-helpers.js';
import { readExploration } from '../src/districts.js';
import { defaultAtmosphereState,sampleAtmosphere } from '../shared/atmosphereModel.js';

test('Rooftops has ten usable seats and retains its note and restoration',()=>{
  verifyLegacyEdges();
  const {def,world}=verifySocialPlace('rooftops',10,[[-9,0],[0,0],[9,0],[0,8.8],[-5,4],[6,-4]]);
  assert.deepEqual(def.note,[-5,5]);assert.deepEqual(def.landmark,[6,-5]);
  assert.deepEqual(readExploration({completed:['rooftops']}).completed,['rooftops']);
  const rotor=world.group.getObjectByName('roof-anemometer');world.update(10,false);const slow=rotor.rotation.y;
  world.update(10,true);assert.ok(rotor.rotation.y>slow);
  assert.equal(world.environment.traffic.geometry.attributes.position.count,32);
  world.ownedResources.dispose();
});

test('rooftop schedule is finite and continuous at wrap and every authored transition',()=>{
  const state=defaultAtmosphereState('rooftop-cycle');
  for(const t of [-1,0,30,60,299,300,600,630,660,900,1199,1200,1e9]){
    const sample=sampleAtmosphere(state,t*1000,{});
    for(const key of ['rain','cloud','wetnessTarget'])assert.ok(Number.isFinite(sample[key]),`${key} at ${t}`);
  }
  assert.equal(sampleAtmosphere(state,660000,{}).rain,.35);
  assert.equal(sampleAtmosphere(state,1200000,{}).rain,0);
  assert.ok(Math.abs(sampleAtmosphere(state,1199999,{}).rain-sampleAtmosphere(state,1200000,{}).rain)<.001);
});

import { getPreset } from '../shared/atmospherePresets.js';
import { sampleVisualSchedule } from '../src/atmosphere/visualSchedule.js';
test('city sky holds each phase then blends for sixty seconds without a wrap snap',()=>{
  const preset=getPreset('rooftop-cycle'),out={};
  const start=sampleVisualSchedule(preset,600000,out);assert.equal(start.u,0);
  const mid=sampleVisualSchedule(preset,630000,out);assert.equal(mid.u,.5);
  assert.notEqual(mid.fromVisuals.skyColor,mid.toVisuals.skyColor);
  const end=sampleVisualSchedule(preset,660000,out);assert.equal(end.fromVisuals.skyColor,end.toVisuals.skyColor);
  assert.equal(sampleVisualSchedule(preset,1200000,out).u,0);
});
