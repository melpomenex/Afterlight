import * as THREE from 'three';
import { createSocialScenery, addSocialBoundary } from './socialScenery.js';

export function buildRooftopScenery(ctx) {
  const s=createSocialScenery(ctx);
  s.box(0,-.35,.4,24,.68,21,'#3e4d56');
  for(let x=-11;x<=11;x+=2) for(let z=-9;z<=10;z+=2)
    s.box(x,-.008,z,1.96,.035,1.96,'#647178',z<=-4&&x>=-2&&x<=5?'dry-stone':'wet-stone');
  addSocialBoundary(s,ctx.def,'#7d8580');
  s.box(-6,1.45,-6.5,3,2.9,2.4,'#435660');ctx.block(-6,-6.5,3,2.4);
  s.box(-6,2.98,-6.5,3.3,.16,2.7,'#88948d','metal');
  s.box(-6,.95,-5.25,.85,1.9,.06,'#2d3c42','metal');
  for(let x=-7.2;x<-4.8;x+=.25) s.box(x,2,-5.22,.12,.4,.06,'#9eacac','metal');
  for(const [x,z] of [[-2,-7.9],[5,-7.9],[-2,-4.1],[5,-4.1]]) {
    s.box(x,1.5,z,.13,3,.13,'#5f6b66','metal');ctx.block(x,z,.13,.13);
  }
  s.box(1.5,3.15,-7.5,7.3,.12,1,'#9b957e','cloth');
  s.box(1.5,3.07,-4.4,7.3,.12,.6,'#827f6d','cloth');
  for(const x of [-2,1.5,5]) s.beam([x,3.1,-8],[x,3.05,-4],.07,'#7b715a','metal');
  [-1,.4,1.8,3.2].forEach((x,i)=>s.seat(`roof-lounge-${i}`,x,-6.4,0,'lounge','#987a5e'));
  [[-6.5,5.8],[-3.7,6.4],[4.8,5.8],[6.2,5.8]].forEach(([x,z],i)=>s.seat(`roof-south-${i}`,x,z,Math.PI,'south','#987a5e'));
  [-2.5,-4].forEach((z,i)=>s.seat(`roof-overlook-${i}`,8,z,-Math.PI/2,'overlook','#987a5e'));
  ctx.block(-3.0, 3.5, 3.2, 1.4);
  ctx.block(7.5, -7.5, 1.6, 0.9);
  s.box(8,.95,6.8,1.2,1.9,.8,'#3d5b5e','metal');ctx.block(8,6.8,1.2,.8);
  s.box(8,1.15,6.35,.9,1,.04,'#d3ad7c','windows');
  for(const x of [-8.5,8.5]) {
    s.box(x,.25,8,1.2,.5,.7,'#68756a');ctx.block(x,8,1.2,.7);
    for(let i=0;i<5;i++) s.sphere(x+(i-2)*.2,.7,8,.4,.8,.4,'#526d53');
  }
  for(let i=0;i<24;i++) {
    const x=-4.5+i*.42,y=3.4-Math.sin(i/23*Math.PI)*.65;
    s.sphere(x,y,-5.1,.1,.12,.1,'#ffce8e','emissive');
    if(i<23)s.beam([x,y,-5.1],[x+.42,3.4-Math.sin((i+1)/23*Math.PI)*.65,-5.1],.02,'#394647','metal');
  }
  s.light(-.5,2.8,-5.2,'#ffcb87',12,10);s.light(5,2,5,'#ffc47a',7,8);
  // Retain the old anemometer position and restoration speed distinction.
  s.cylinder(6,1.15,-5,.12,2.3,'#b39869');ctx.block(6,-5,.32,.32);
  const rotor=new THREE.Group();rotor.name='roof-anemometer';rotor.position.set(6,2.35,-5);ctx.group.add(rotor);
  const armGeo=new THREE.BoxGeometry(1.7,.07,.07),armMat=new THREE.MeshStandardMaterial({color:'#c9ad75',metalness:.6,roughness:.4});
  ctx.owned.geometries.push(armGeo);ctx.owned.materials.push(armMat);
  for(let i=0;i<3;i++){const arm=new THREE.Mesh(armGeo,armMat);arm.rotation.y=i*Math.PI/3;rotor.add(arm);}
  ctx.animated.push((time,done)=>{rotor.rotation.y=time*(done?1.5:.16);});
  // Three coherent city silhouette bands; all windows share a material.
  for(const [band,z] of [-18,-30,-48].entries()) for(let i=0;i<18;i++) {
    const x=-45+i*5.2+ctx.random()*1.5,w=2.5+ctx.random()*2.5,h=5+ctx.random()*13;
    s.box(x,h/2-1,z,w,h,3+band*2,['#344955','#2a3d4b','#243444'][band],'skyline');
    s.box(x,h-.8,z,w*.5,.6,1,'#465560','skyline');
    for(let row=1;row<h-1;row+=1.4) for(let col=-w/2+.4;col<w/2;col+=.8)
      if(ctx.random()>.35)s.box(x+col,row,z+1.65+band,.25,.48,.025,'#d8bd89','windows');
  }
  s.zone('lounge',{minX:-2,maxX:5,minZ:-8,maxZ:-4},3.1,.1,10,{rain:.35,roof:.7,wind:.15,lowpassHz:2400});
  s.zone('utility',{minX:-7.5,maxX:-4.5,minZ:-7.7,maxZ:-5.3},3,0,20,{rain:.1,roof:.2,wind:.05,lowpassHz:900});
  ctx.environment.emitterAnchors.push({kind:'runoff',x:5,y:3.1,z:-4.4});
  const {materials}=s.finish();
  ctx.environment.nightMaterials=[materials.get('windows')];
  addTraffic(ctx);
}

function addTraffic(ctx) {
  const geometry=new THREE.BufferGeometry(),positions=new Float32Array(32*3);
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.PointsMaterial({color:'#ffd299',size:.13,transparent:true,opacity:.8,depthWrite:false});
  const traffic=new THREE.Points(geometry,material);traffic.name='roof-traffic';traffic.frustumCulled=false;ctx.group.add(traffic);
  ctx.owned.geometries.push(geometry);ctx.owned.materials.push(material);
  ctx.environment.traffic=traffic;
  ctx.animated.push(time=>{
    for(let i=0;i<32;i++) {
      positions[i*3]=((time*(i%2?1.4:-1.1)+i*3.1)%90+90)%90-45;
      positions[i*3+1]=1.4+(i%3)*.7;positions[i*3+2]=-17-(i%3)*10;
    }
    geometry.attributes.position.needsUpdate=true;
  });
}
