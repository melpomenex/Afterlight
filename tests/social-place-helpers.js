import assert from 'node:assert/strict';
import { buildDistrict } from '../src/districts.js';
import { getPlaceDefinition, LEGACY_DISTRICT_IDS } from '../shared/placeDefinitions.js';
import { isWalkable } from '../src/world/bounds.js';
import { normalizeSeat } from '../src/social/seating.js';
import { gateItemsFor } from '../src/places/worldFactory.js';

export function verifySocialPlace(id, seatCount, waypoints) {
  const def=getPlaceDefinition(id),world=buildDistrict(def);
  const free=(x,z)=>isWalkable(def.bounds,world.obstacles,x,z);
  assert.ok(free(...def.spawn),'player spawn');assert.ok(free(...def.companionSpawn),'Kiln spawn');
  const queue=[def.spawn],visited=new Set([def.spawn.join(',')]);
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];
    for(const [dx,dz] of [[.25,0],[-.25,0],[0,.25],[0,-.25]]){
      const point=[x+dx,z+dz],key=point.join(',');
      if(!visited.has(key)&&free(...point)){visited.add(key);queue.push(point);}
    }
  }
  const near=(x,z,r)=>queue.some(p=>Math.hypot(p[0]-x,p[1]-z)<r);
  for(const item of [...world.items,...gateItemsFor(def)])assert.ok(near(item.x,item.z,1.8),`${id} ${item.type} ${item.id??''} approach (${item.x},${item.z})`);
  const seats=world.items.filter(i=>i.type==='seat');assert.equal(seats.length,seatCount);
  for(const item of seats){
    const seat=normalizeSeat(item);
    for(const p of seat.dismount){assert.ok(free(p.x,p.z),`${seat.id} dismount (${p.x},${p.z})`);assert.ok(near(p.x,p.z,.36),`${seat.id} connected`);}
  }
  for(const [x,z] of waypoints){assert.ok(free(x,z),`route ${x},${z}`);assert.ok(near(x,z,.36));}
  for(const done of [false,true]){world.update(60,done);world.group.traverse(o=>assert.ok(o.matrix.elements.every(Number.isFinite)));}
  let draws=0,triangles=0,lights=0;
  world.group.traverse(o=>{
    if(o.isPointLight){lights++;assert.equal(o.castShadow,false);}
    if(o.isMesh){draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}
  });
  assert.ok(draws<=45,`${draws} geometry draws`);assert.ok(triangles<80000,`${triangles} triangles`);assert.ok(lights<=2,`${lights} lights`);
  return {def,world,seats,draws,triangles,lights};
}

export function verifyLegacyEdges(){
  LEGACY_DISTRICT_IDS.forEach((id,i)=>{
    const d=getPlaceDefinition(id);assert.equal(d.seed,i*37);
    assert.equal(d.exits.find(e=>e.id==='east').target,LEGACY_DISTRICT_IDS[(i+1)%17]);
    assert.equal(d.exits.find(e=>e.id==='west').target,LEGACY_DISTRICT_IDS[(i+16)%17]);
  });
}
