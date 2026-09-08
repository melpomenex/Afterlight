import * as THREE from 'three';
import { createFireEmitter } from './fireEmitter.js';

// Optional authored effects under the common active controller. No room-id
// branching, event scheduler, audio context or animation loop lives here.
export function createPlaceEffects({environment={},tier='normal',seed=0}={}) {
  const group=new THREE.Group();group.name='atmosphere-place-effects';
  let fire=null,dust=null,geometry=null,material=null,positions=null,disposed=false;
  if(environment.fire){
    fire=createFireEmitter({...environment.fire,quality:tier,seed});group.add(fire.group);
  }
  const count=environment.dust?(tier==='reduced'?48:Math.min(192,environment.dust.count??192)):0;
  if(count){
    positions=new Float32Array(count*3);geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    material=new THREE.PointsMaterial({color:environment.dust.color??'#c5a27a',size:.018,transparent:true,opacity:.2,depthWrite:false});
    dust=new THREE.Points(geometry,material);dust.frustumCulled=false;group.add(dust);
  }
  const windows=environment.nightMaterials??[];
  const windowBaselines=windows.map(m=>m.emissiveIntensity);
  const traffic=environment.traffic;
  const oldTrafficCount=traffic?.geometry.drawRange.count;
  if(traffic)traffic.geometry.setDrawRange(0,tier==='reduced'?8:32);
  function update(sample,{reduceMotion=false,particles=true}={}){
    if(disposed)return;
    const t=(sample.serverNow??0)/1000;
    fire?.update(t,{windX:sample.windX,windZ:sample.windZ,reduceMotion});
    if(dust){
      dust.visible=particles&&!reduceMotion;
      for(let i=0;i<count;i++){
        positions[i*3]=((i*1.731+t*.18)%23+23)%23-11.5;
        positions[i*3+1]=.1+(i%7)*.06;
        positions[i*3+2]=((i*3.19+t*.035)%20+20)%20-10;
      }
      geometry.attributes.position.needsUpdate=true;
    }
    for(const m of windows)m.emissiveIntensity=.45+(sample.cloud??0)*.35;
    if(traffic)traffic.visible=!reduceMotion&&particles;
  }
  function dispose(){
    if(disposed)return;disposed=true;fire?.dispose();geometry?.dispose();material?.dispose();group.removeFromParent();
    windows.forEach((m,i)=>{m.emissiveIntensity=windowBaselines[i];});
    if(traffic){traffic.geometry.setDrawRange(0,oldTrafficCount);traffic.visible=true;}
  }
  return {group,update,dispose,counts:{batches:(fire?.counts.batches??0)+(count?1:0),dust:count,flames:fire?.counts.flames??0,embers:fire?.counts.embers??0}};
}
