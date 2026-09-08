import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFireEmitter,fireLightIntensity } from '../src/atmosphere/fireEmitter.js';

test('fire uses retained bounded buffers, smooth light and idempotent disposal',()=>{
  for(const quality of ['normal','reduced']){
    const light=new THREE.PointLight('#ffbb77',24),effect=createFireEmitter({quality,light});
    const geometry=effect.group.children[0].geometry,phases=geometry.attributes.phase.array;
    let disposals=0;geometry.addEventListener('dispose',()=>disposals++);
    for(let i=0;i<600;i++)effect.update(i/60,{windX:.1});
    assert.equal(geometry.attributes.phase.array,phases);assert.equal(light.castShadow,false);
    assert.equal(effect.counts.flames,quality==='normal'?24:12);
    assert.equal(effect.counts.embers,quality==='normal'?128:0);
    effect.update(10,{reduceMotion:true});assert.equal(light.intensity,24);
    effect.dispose();effect.dispose();assert.equal(disposals,1);assert.equal(effect.disposed,true);
  }
  for(let t=0;t<100;t+=.1){
    assert.ok(fireLightIntensity(t)>=24*.88&&fireLightIntensity(t)<=24*1.12);
    assert.ok(Math.abs(fireLightIntensity(t+.001)-fireLightIntensity(t))<.02);
  }
});
