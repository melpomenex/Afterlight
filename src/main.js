import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import './style.css';
import { districts, readExploration, buildDistrict } from './districts.js';
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color('#303b36');scene.fog=new THREE.FogExp2('#657264',.017);
const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const camera=new THREE.OrthographicCamera();let cameraMode=0,zoom=25;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.27,.65,1.05);composer.addPass(bloom);
scene.add(new THREE.HemisphereLight('#c5d9d4','#343a2b',2));const sun=new THREE.DirectionalLight('#ffe0a5',3.1);sun.position.set(-14,24,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:1,far:80});sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;scene.add(sun);
let seed=62;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}const range=(a,b)=>a+rand()*(b-a);
const mats={};function mat(color,roughness=.8,metalness=.1){const key=color+':'+roughness+':'+metalness;return mats[key]??=(new THREE.MeshStandardMaterial({color,roughness,metalness}));}const stone=['#485450','#535e55','#647065','#70776a','#3a4845','#7b7e6d'];const metal=mat('#273d3d',.53,.65),rust=mat('#805035',.74,.5),dark=mat('#192d2d',.75,.25),cream=mat('#babca5',.55,.4),gold=mat('#bd803d',.55,.55);const boxGeo=new THREE.BoxGeometry(1,1,1);let objects=[];
function box(x,y,z,w,h,d,m,parent=scene){const mesh=new THREE.Mesh(boxGeo,typeof m==='string'?mat(m):m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function cyl(x,y,z,r,h,m,parent=scene){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,8),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function pipe(a,b,r=.08,m=rust){const d=new THREE.Vector3().subVectors(b,a),mesh=cyl(0,0,0,r,d.length(),m);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return mesh;}
function block(x,z,w,d){objects.push({x,z,w:w/2+.38,d:d/2+.38});}
box(0,-.6,0,28,1,25,mat('#242f2b'));box(0,-.12,0,24,.4,21,mat('#3d4944',.27,.32));
// Slightly irregular, individually laid wet paving stones.
for(let x=-12;x<12;x++)for(let z=-10;z<11;z++){const c=new THREE.Color(stone[Math.floor(rand()*stone.length)]).multiplyScalar(range(.75,1));box(x+.49+(z%2)*.05,range(.05,.095),z+.47,.965,.16,.96,mat('#'+c.getHexString(),range(.22,.55),.22));}
for(let i=0;i<75;i++){const puddle=new THREE.Mesh(new THREE.CircleGeometry(range(.3,1.25),9),mat('#516564',.07,.62));puddle.rotation.x=-Math.PI/2;puddle.position.set(range(-11,11),.183,range(-9,10));puddle.scale.y=range(.3,.75);scene.add(puddle);}
// Brick walls are instanced for a detailed silhouette without thousands of draw calls.
const bricks=[];function wall(x,z,length,axis,height){for(let row=0;row<height/.35;row++)for(let j=0;j<length/.76;j++){const along=-length/2+j*.76+(row%2)*.36;bricks.push({x:x+(axis==='x'?along:0),y:.28+row*.35,z:z+(axis==='z'?along:0),w:axis==='x'?.72:.68,d:axis==='z'?.72:.68,h:.32});}for(let i=0;i<length/.65;i++){let along=-length/2+i*.65;box(x+(axis==='x'?along:0),height+.25+range(-.06,.07),z+(axis==='z'?along:0),axis==='x'?.61:1,.2,axis==='z'?.61:1,stone[Math.floor(rand()*stone.length)]);} }
wall(0,-10.5,25,'x',4.6);wall(-12.4,0,21,'z',4.6);wall(12.3,-6.4,8,'z',4);wall(12.3,6.9,6.5,'z',2.1);wall(0,11,25,'x',.9);
const brickMesh=new THREE.InstancedMesh(boxGeo,mat('#ffffff'),bricks.length);const dummy=new THREE.Object3D();bricks.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();brickMesh.setMatrixAt(i,dummy.matrix);brickMesh.setColorAt(i,new THREE.Color(stone[Math.floor(rand()*stone.length)]));});brickMesh.castShadow=true;brickMesh.receiveShadow=true;scene.add(brickMesh);
for(let x=-12;x<=12;x+=4){box(x,2.5,-10.15,.35,5,.7,metal);box(x,4.95,-10.2,.72,.25,1,cream);pipe(new THREE.Vector3(x+.35,.2,-9.9),new THREE.Vector3(x+.35,5.7,-9.9));for(let y=.5;y<4.5;y+=.85)box(x+.35,y,-9.84,.21,.1,.22,dark);}
pipe(new THREE.Vector3(-12,3.7,-9.98),new THREE.Vector3(12,3.7,-9.98),.1);for(let z=-9;z<10;z+=4){box(-12,2.5,z,.75,5,.38,metal);pipe(new THREE.Vector3(-11.83,.3,z+.4),new THREE.Vector3(-11.83,5.1,z+.4),.1);}
// Roofline and the dense industrial neighborhood behind the court.
function building(x,z,w,d,h){box(x,h/2,z,w,h,d,metal);box(x,h+.12,z,w+.5,.25,d+.4,dark);for(let k=-w/2+.3;k<w/2;k+=.5)box(x+k,h/2,z+d/2+.03,.14,h,.13,mat('#344742'));for(let a=-w/2+.8;a<w/2-.4;a+=1.6){box(x+a,h*.63,z+d/2+.12,1,h*.3,.12,dark);for(let t=0;t<4;t++)box(x+a,h*.49+t*.35,z+d/2+.2,.95,.055,.07,cream);}for(let a=-w/2;a<w/2;a+=.6)for(let b=-d/2;b<d/2;b+=.8)box(x+a,h+.3+range(0,.08),z+b,.57,.12,.77,stone[Math.floor(rand()*stone.length)]);box(x,h+.8,z,1.4,1,1.5,metal);}
building(-8,-14,8,6,7);building(1,-14,9,6,8.7);building(10,-14,8,6,6.2);building(-16,-6,6,8,8);building(-16,5,6,8,6.8);
// A sheltered maintenance shop with amber windows and a tiled awning.
box(3,1.8,-8.7,6.8,3.6,2.8,mat('#554b36'));block(3,-8.7,6.8,2.8);box(3,1.45,-7.24,1.35,2.9,.12,dark);for(let x of [1,5]){box(x,1.65,-7.2,1.25,1.4,.15,dark);box(x,1.65,-7.09,1.08,1.2,.06,new THREE.MeshStandardMaterial({color:'#f4d18b',emissive:'#ffb751',emissiveIntensity:1.4}));for(let j=-1;j<=1;j++)box(x+j*.33,1.65,-7.01,.045,1.2,.05,rust);box(x,1.65,-7,1.1,.055,.06,rust);}
for(let x=-.65;x<6.8;x+=.55)for(let z=-10;z<-6.1;z+=.65){const roof=box(x,3.5+( -z-6)*.23,z,.53,.11,.72,mat(['#70503a','#886246','#4c5141'][Math.floor(rand()*3)]));roof.rotation.x=-.23;}
for(let x of [-.5,6.5]){box(x,1.6,-6.5,.15,3.2,.15,rust);lamp(x,2.7,-6.5);}box(3,2.85,-7,2.3,.4,.12,metal);
function sign(text,x,y,z){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#243632';ctx.fillRect(0,0,512,96);ctx.fillStyle='#c9bc94';ctx.font='32px monospace';ctx.textAlign='center';ctx.fillText(text,256,60);const m=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.42),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}));m.position.set(x,y,z);scene.add(m);}sign('MAINTENANCE 04',3,2.85,-6.91);
function lamp(x,y,z){box(x,y,z,.3,.48,.3,new THREE.MeshStandardMaterial({color:'#fff2c6',emissive:'#ffc775',emissiveIntensity:2.5}));box(x,y+.28,z,.46,.1,.44,dark);box(x,y-.28,z,.36,.1,.35,dark);const l=new THREE.PointLight('#ffc16a',8,6,2);l.position.set(x,y-.1,z+.2);scene.add(l);return l;}
for(const [x,z]of[[-10,-5],[-10,6],[10,5]]){cyl(x,1.8,z,.075,3.6,metal);lamp(x,3.6,z);}
// Ivy hanging in broken curtains from the old masonry.
const leaves=[];for(let i=0;i<55;i++){const x=range(-11,11),len=range(.5,3.4);for(let j=0;j<len*12;j++)leaves.push([x+range(-.28,.28),4.9-j/12,-9.98+range(-.08,.18)]);}for(let i=0;i<800;i++){const side=rand()<.5;leaves.push([side?range(-11.9,-10.9):range(-11,11),range(.15,.38),side?range(-9,10):range(-9.9,-9.2)]);}const leafMesh=new THREE.InstancedMesh(boxGeo,mat('#ffffff'),leaves.length);leaves.forEach((p,i)=>{dummy.position.set(...p);dummy.rotation.set(range(-.6,.6),range(0,3),range(-.7,.7));dummy.scale.set(range(.12,.28),.06,range(.12,.3));dummy.updateMatrix();leafMesh.setMatrixAt(i,dummy.matrix);leafMesh.setColorAt(i,new THREE.Color(['#545d32','#697045','#424c2b','#7b7741'][Math.floor(rand()*4)]));});scene.add(leafMesh);dummy.rotation.set(0,0,0);
function crate(x,z,s=1){box(x,.5*s,z,s,s,s,rust);for(let y of [.12,.85])box(x,y*s,z,s+.07,.08,s+.07,metal);for(let off of [-.35,.35]){box(x+off*s,.5*s,z,.08,s+.05,s+.08,metal);box(x,.5*s,z+off*s,s+.07,s+.05,.06,metal);}block(x,z,s,s);}
for(const [x,z,s]of[[-8,3,1.2],[-9.2,3.3,.9],[-8.6,4.4,1],[8.7,7,1.1],[10,7.4,1],[9.8,-6.8,.9],[-8,-7.8,1.2]])crate(x,z,s);
for(const [x,z]of[[-9,1.5],[9,8.5],[-7.5,-8]]){cyl(x,.55,z,.4,1,rust);for(let y of [.2,.85])cyl(x,y,z,.43,.07,metal);block(x,z,.8,.8);}
for(let i=0;i<450;i++){const x=range(-11.5,11.5),z=range(-9.7,10.5);if(Math.abs(x)>8||Math.abs(z)>7||rand()<.12){const b=box(x,.21,z,range(.03,.13),.025,range(.06,.17),['#9e9771','#b0a77c','#65705c'][Math.floor(rand()*3)]);b.rotation.y=rand()*6;}}
for(const [x,z]of[[-4,4],[5,6],[-3,-4],[9,0]]){box(x,.192,z,1,.035,.65,dark);for(let a=-.4;a<=.4;a+=.13)box(x+a,.22,z,.045,.02,.59,metal);}
// Eastern conduit gateway.
for(let z of [-2.1,2.1]){box(12,2.1,z,.65,4.2,.65,metal);box(12,4.3,z,1,.2,1,cream);box(11.65,2.5,z,.045,2.4,.12,new THREE.MeshStandardMaterial({color:'#a0dfda',emissive:'#72c9c6',emissiveIntensity:1.7}));}box(12,4.2,0,1,.35,4.8,metal);box(14,.03,0,5,.2,4,mat('#596459'));
function robot(companion=false){const g=new THREE.Group();const body=companion?cream:gold;box(0,.85,0,.62,.7,.48,body,g);box(0,.92,.265,.38,.35,.07,dark,g);for(let i=0;i<3;i++)box(0,.8+i*.095,.31,.27,.035,.025,rust,g);box(0,1.4,0,.78,.46,.58,body,g);box(0,1.4,.303,.66,.3,.055,dark,g);const eye=new THREE.MeshStandardMaterial({color:'#d8f8e3',emissive:'#acf7d5',emissiveIntensity:2});for(let x of [-.2,.2])box(x,1.43,.34,.12,.1,.045,eye,g);box(0,1.66,0,.87,.08,.65,metal,g);cyl(.23,1.85,0,.025,.3,rust,g);box(.23,2.01,0,.075,.075,.075,gold,g);box(0,.93,-.34,.48,.53,.25,metal,g);const legs=[];for(let x of [-.22,.22]){const leg=new THREE.Group();leg.position.set(x,.52,0);box(0,-.15,0,.17,.33,.19,metal,leg);box(0,-.34,.09,.24,.16,.38,body,leg);g.add(leg);legs.push(leg);box(x*1.9,.86,0,.18,.53,.22,body,g);}if(companion)g.scale.setScalar(.7);scene.add(g);g.userData.legs=legs;return g;}
const player=robot();player.position.set(1,0,3);const kiln=robot(true);kiln.position.set(2.2,0,4);let saved={cells:[],restored:false};try{const data=JSON.parse(localStorage.getItem('afterlight-save'));if(data&&Array.isArray(data.cells))saved={cells:data.cells.filter(x=>[0,1,2].includes(x)),restored:!!data.restored,exploration:readExploration(data.exploration)};}catch{}
let interactables=[];const cellMaterial=new THREE.MeshStandardMaterial({color:'#e8c97a',emissive:'#ffc65c',emissiveIntensity:2});
for(const [i,p]of [[0,[-7,-5]],[1,[8,-3.7]],[2,[7,7.7]]]){const g=new THREE.Group();g.position.set(p[0],.65,p[1]);box(0,0,0,.28,.5,.28,cellMaterial,g);box(0,.29,0,.37,.09,.37,metal,g);box(0,-.29,0,.37,.09,.37,metal,g);scene.add(g);const light=new THREE.PointLight('#ffce75',2,3);g.add(light);const ring=new THREE.Mesh(new THREE.RingGeometry(.43,.46,40),new THREE.MeshBasicMaterial({color:'#cdbb82',transparent:true,opacity:.5,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(p[0],.23,p[1]);scene.add(ring);g.visible=ring.visible=!saved.cells.includes(i);interactables.push({type:'cell',id:i,x:p[0],z:p[1],g,ring,title:'Recover power cell',sub:'A little warmth, waiting to be found'});}
box(-4,.55,-7,1.4,1.1,.9,metal);box(-4,1.17,-7,1.6,.15,1.1,cream);box(-4,1.27,-6.9,.5,.025,.37,mat('#d0c5a0'));block(-4,-7,1.4,.9);interactables.push({type:'note',x:-4,z:-7,title:'Read the old note',sub:'Someone was here before you'});
box(8,1,-7.6,1.7,2,1.5,metal);block(8,-7.6,1.7,1.5);for(let j=0;j<7;j++)box(8,.5+j*.17,-6.8,1.25,.055,.08,cream);const core=box(8,1.7,-6.79,.48,.23,.07,new THREE.MeshStandardMaterial({color:'#bf8050',emissive:'#e49b53',emissiveIntensity:.3}));interactables.push({type:'generator',x:8,z:-7.6,title:'Restore the courtyard',sub:'The old generator needs three power cells'});const beacon=lamp(3,4.8,-8);beacon.intensity=saved.restored?35:0;
// Batch static masonry, paving, roofs, and props into one GPU draw call.
const staticBoxes=scene.children.filter(o=>o.isMesh&&o.geometry===boxGeo&&o.material.emissiveIntensity===1&&o.material.emissive.getHex()===0);
const scenery=new THREE.InstancedMesh(boxGeo,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.57,metalness:.22}),staticBoxes.length);
staticBoxes.forEach((o,i)=>{o.updateMatrix();scenery.setMatrixAt(i,o.matrix);scenery.setColorAt(i,o.material.color);scene.remove(o);});scenery.castShadow=true;scenery.receiveShadow=true;scene.add(scenery);
const particlesGeo=new THREE.BufferGeometry(),positions=new Float32Array(100*3);for(let i=0;i<100;i++){positions[i*3]=range(-13,13);positions[i*3+1]=range(.3,6);positions[i*3+2]=range(-11,11);}particlesGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));const particles=new THREE.Points(particlesGeo,new THREE.PointsMaterial({color:'#e3d7a7',size:.035,transparent:true,opacity:.55}));scene.add(particles);
const marker=new THREE.Mesh(new THREE.RingGeometry(.27,.3,32),new THREE.MeshBasicMaterial({color:'#e0d49b',transparent:true,opacity:.8,side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);
// Preserve the original courtyard as a district; actors and global lights are shared.
const courtGroup = new THREE.Group();
for (const child of [...scene.children]) {
  if (![player, kiln, particles, marker, sun].includes(child) && !child.isHemisphereLight) courtGroup.add(child);
}
scene.add(courtGroup);
const worlds = new Map([['court', { group: courtGroup, obstacles: objects, items: interactables, update() {} }]]);
saved.exploration = readExploration(saved.exploration);
let activeDistrict = 'court';
const districtMenu = document.createElement('dialog');
districtMenu.id = 'district-dialog';
districtMenu.innerHTML = `<div class="micro">THE CITY IS STILL HERE</div><h2>Beyond the courtyard</h2><p>Follow the old paths. Leave a little light behind.</p><div id="district-list"></div><button id="close-districts">Return to exploring →</button>`;
document.body.append(districtMenu);
const travelButton = document.createElement('button');
travelButton.id = 'travel'; travelButton.textContent = '◇ Districts';
document.querySelector('.actions').prepend(travelButton);
function renderDistrictMenu() {
  $('district-list').replaceChildren();
  for (const def of districts) {
    const button = document.createElement('button');
    button.className = 'district-choice';
    const done = def.id === 'court' ? saved.restored : saved.exploration.completed.includes(def.id);
    const status = def.id === activeDistrict ? 'YOU ARE HERE' : done ? 'RESTORED' : saved.exploration.visited.includes(def.id) ? 'VISITED' : 'UNEXPLORED';
    button.innerHTML = `<span class="micro">${def.district} · ${status}</span><strong>${def.name}</strong><span>${def.description}</span>`;
    button.disabled = def.id === activeDistrict;
    button.onclick = () => { closeDistricts(); enterDistrict(def.id); };
    $('district-list').append(button);
  }
}
function openDistricts() { if (paused) return; paused = true; keys.clear(); renderDistrictMenu(); districtMenu.showModal(); }
function closeDistricts() { districtMenu.close(); paused = false; keys.clear(); }
travelButton.onclick = openDistricts;
$('close-districts').onclick = closeDistricts;
districtMenu.addEventListener('cancel', event => { event.preventDefault(); closeDistricts(); });
function addGate(world, x, destination) {
  const group = new THREE.Group();
  group.position.set(x, 0, 0);
  const glow = new THREE.MeshStandardMaterial({ color: '#a4ddd0', emissive: '#74d0bd', emissiveIntensity: 1.5 });
  for (const z of [-1.3, 1.3]) {
    box(0, 1.6, z, .22, 3.2, .22, metal, group);
    box(0, 1.7, z, .25, 2.4, .1, glow, group);
  }
  box(0, 3.2, 0, .35, .22, 2.9, cream, group);
  world.group.add(group);
  const destinationDef = districts.find(d => d.id === destination);
  world.items.push({ type: 'exit', x, z: 0, destination, title: `Travel to ${destinationDef.name}`, sub: 'Press E to follow the old path' });
}
addGate(worlds.get('court'), 10.7, 'canal');
function enterDistrict(id, announce = true) {
  const index = districts.findIndex(def => def.id === id);
  if (index < 0) return;
  const def = districts[index];
  if (!worlds.has(id)) {
    const world = buildDistrict(def, saved.exploration.completed.includes(id));
    scene.add(world.group);
    addGate(world, -10.7, districts[index - 1].id);
    addGate(world, 10.7, districts[(index + 1) % districts.length].id);
    worlds.set(id, world);
  }
  for (const [key, world] of worlds) world.group.visible = key === id;
  activeDistrict = id;
  objects = worlds.get(id).obstacles;
  interactables = worlds.get(id).items;
  const spawn = def.spawn ?? [1, 3];
  player.position.set(spawn[0], 0, spawn[1]);
  kiln.position.set(spawn[0] + .8, 0, spawn[1] + 1);
  target = nearest = null; marker.visible = false; keys.clear();
  scene.fog.color.set(def.color); scene.background.set(def.color).multiplyScalar(.55); sun.color.set(def.sun);
  document.querySelector('.location h1').textContent = def.name;
  document.querySelector('.location .micro').textContent = def.district;
  document.querySelector('.location p').textContent = `☼  ${def.subtitle}    ${id === 'station' ? '18:26' : '17:42'}`;
  document.querySelector('.map-bottom').textContent = `• ${def.name.toUpperCase()}  ${String(index + 4).padStart(2, '0')}`;
  document.querySelector('.objective .micro').textContent = id === 'court' ? 'COURTYARD RESTORATION' : 'DISTRICT RESTORATION';
  const mapPaths = {
    court: 'M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24',
    canal: 'M24 24H130V96H24Z M65 24V53H88V24 M65 96V67H88V96 M65 53V67M88 53V67',
    garden: 'M24 24H130V96H24Z M72 29H108V53H72Z M43 38H56V61H43Z M82 69H106V79H82Z',
    station: 'M24 24H130V96H24Z M24 40H130M24 47H130 M63 35H100V50H63Z M40 59H112'
  };
  document.querySelector('.map svg path').setAttribute('d', mapPaths[id]);
  document.querySelectorAll('.map-point').forEach((point, i) => {
    const positions = id === 'court' ? [[-7,-5],[8,-3.7],[7,7.7]] : [def.landmark, def.note];
    point.style.display = positions[i] ? '' : 'none';
    if (positions[i]) { point.setAttribute('cx',24+(positions[i][0]+12)/24*106);point.setAttribute('cy',24+(positions[i][1]+10)/21*72); }
  });
  $('world').setAttribute('aria-label', `Explore ${def.name} with Kiln`);
  document.title = `Afterlight — ${def.name}`;
  saved.exploration.current = id;
  if (!saved.exploration.visited.includes(id)) saved.exploration.visited.push(id);
  persist(); updateProgress();
  if (announce || id !== 'court') toast(def.name, def.description, announce ? 'DISTRICT ARRIVAL' : 'WELCOME BACK');
}
let nearest=null,target=null,paused=false,t=0,toastTimer,muted=true,audio=null;const keys=new Set();const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
function persist(){try{localStorage.setItem('afterlight-save',JSON.stringify(saved));$('saved').textContent='✓ SAVED LOCALLY';}catch{$('saved').textContent='SESSION ONLY';}}
function updateProgress(){
if (activeDistrict !== 'court') {
  const def = districts.find(d => d.id === activeDistrict);
  const done = saved.exploration.completed.includes(activeDistrict);
  $('progress').textContent = done ? '1 / 1' : '0 / 1';
  $('progress-bar').style.width = done ? '100%' : '0%';
  $('objective-text').textContent = done ? def.done : def.objective;
  return;
}
$('progress').textContent=saved.cells.length+' / 3';$('progress-bar').style.width=saved.cells.length/3*100+'%';$('objective-text').textContent=saved.restored?'Courtyard restored':saved.cells.length===3?'Power the generator':'Recover power cells';if(saved.restored){beacon.intensity=35;core.material.emissive.set('#aaffbb');core.material.emissiveIntensity=2;}}
function toast(title,body,type='FIELD NOTE'){$('toast-title').textContent=title;$('toast-body').textContent=body;$('toast-type').textContent=type;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,6500);}
function chime(){if(!audio||muted)return;for(let i=0;i<3;i++){const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=[440,554,660][i];gain.gain.setValueAtTime(0,audio.currentTime+i*.1);gain.gain.linearRampToValueAtTime(.035,audio.currentTime+.02+i*.1);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+1+i*.1);osc.connect(gain).connect(audio.destination);osc.start(audio.currentTime+i*.1);osc.stop(audio.currentTime+1.2+i*.1);}}
function interact(){if(paused)return;if(!nearest){toast('Follow the old paths.',activeDistrict === 'court' ? 'Recover the power cells, or take the eastern gateway to the Sluiceworks.' : districts.find(d=>d.id===activeDistrict).description);return;}if(nearest.type==='exit'){enterDistrict(nearest.destination);return;}
if(nearest.type==='field-note'){toast(nearest.sub,nearest.body);return;}
if(nearest.type==='landmark'){
  const def = districts.find(d=>d.id===activeDistrict);
  if(!saved.exploration.completed.includes(activeDistrict)){saved.exploration.completed.push(activeDistrict);chime();}
  toast(def.done,def.message,'DISTRICT RESTORED');persist();updateProgress();return;
}
if(nearest.type==='cell'){
if(saved.cells.includes(nearest.id))return;
saved.cells.push(nearest.id);nearest.g.visible=nearest.ring.visible=false;chime();toast('A spark worth keeping.',saved.cells.length===3?'All three cells recovered. Find the generator beside the maintenance shop.':`Power cell ${saved.cells.length} of 3 recovered. Kiln hums approvingly.`,'SALVAGE RECOVERED');}else if(nearest.type==='note'){toast('An old maintenance note','“If anyone comes back, leave the light on.” The generator beside the shop may still work.');}else if(saved.restored){toast('A world worth repairing.','The lights are on. For tonight, this little corner of the world is home.','COURTYARD RESTORED');}else if(saved.cells.length<3){toast('The current has gone quiet.',`Find ${3-saved.cells.length} more power ${saved.cells.length===2?'cell':'cells'} to wake the old generator.`);}else{saved.restored=true;chime();toast('Welcome home.','Warmth returns to the Rain Court. Kiln settles beside you. You made a difference.','COURTYARD RESTORED');}persist();updateProgress();}
$('interact').onclick=interact;
function settings(){paused=!paused;keys.clear();if(paused)$('settings-dialog').showModal();else $('settings-dialog').close();}$('settings').onclick=settings;$('resume').onclick=settings;$('settings-dialog').addEventListener('cancel',e=>{e.preventDefault();settings();});$('reset').onclick=()=>{saved={cells:[],restored:false};persist();location.reload();};$('camera').onclick=()=>{cameraMode=(cameraMode+1)%3;};$('quality').onchange=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,Number($('quality').value)));resize();};$('atmosphere').onchange=()=>particles.visible=$('atmosphere').checked;
$('sound').onclick=async()=>{muted=!muted;if(!audio){audio=new AudioContext();const buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.08;const source=audio.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;source.connect(filter).connect(audio.destination);source.start();}await (muted?audio.suspend():audio.resume());$('sound').textContent=muted?'♫  Sound off':'♫  Sound on';};
window.addEventListener('keydown',e=>{if(e.target.matches('input,select')&&e.code!=='Escape')return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='KeyM')openDistricts();if(e.code==='KeyE')interact();if(e.code==='KeyC')$('camera').click();if(e.code==='Escape'&&!paused)settings();});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
renderer.domElement.addEventListener('pointerdown',e=>{if(paused)return;ray.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1),camera);if(ray.ray.intersectPlane(plane,hit)){target=hit.clone();target.x=THREE.MathUtils.clamp(target.x,-11,11);target.z=THREE.MathUtils.clamp(target.z,-9,10);marker.position.set(target.x,.24,target.z);marker.visible=true;}});renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.015,18,35);resize();},{passive:false});
function canMove(x,z){return x>-11.3&&x<11.3&&z>-9.5&&z<10.3&&!objects.some(o=>Math.abs(x-o.x)<o.w&&Math.abs(z-o.z)<o.d);}
function move(g,dx,dz,dt){const oldX=g.position.x,oldZ=g.position.z;if(canMove(oldX+dx,oldZ))g.position.x+=dx;if(canMove(g.position.x,oldZ+dz))g.position.z+=dz;const moving=Math.hypot(g.position.x-oldX,g.position.z-oldZ)>.0001;if(moving){g.rotation.y=Math.atan2(dx,dz);g.position.y=Math.sin(t*13)*.025;g.userData.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(t*13+i*Math.PI)*.45);}else{g.position.y=0;g.userData.legs.forEach(l=>l.rotation.x*=.8);}return moving;}
const look=new THREE.Vector3(0,0,0);function resize(){const a=innerWidth/innerHeight;camera.left=-zoom*a/2;camera.right=zoom*a/2;camera.top=zoom/2;camera.bottom=-zoom/2;camera.near=.1;camera.far=150;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);}window.addEventListener('resize',resize);resize();enterDistrict(saved.exploration.current,false);updateProgress();setTimeout(()=>$('toast').style.opacity=0,8000);
let previous=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.04);previous=now;if(!paused){t+=dt;let x=0,z=0;if(keys.has('KeyW')||keys.has('ArrowUp'))z--;if(keys.has('KeyS')||keys.has('ArrowDown'))z++;if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;if(keys.has('KeyD')||keys.has('ArrowRight'))x++;let direction=new THREE.Vector3(x,0,z);if(direction.lengthSq()){target=null;marker.visible=false;direction.applyAxisAngle(new THREE.Vector3(0,1,0),[Math.PI/4,0,-Math.PI/4][cameraMode]);}else if(target){direction.subVectors(target,player.position);direction.y=0;if(direction.length()<.15){target=null;marker.visible=false;direction.set(0,0,0);}}direction.normalize().multiplyScalar(dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?5:2.8));const moved=move(player,direction.x,direction.z,dt);if(target&&!moved){target=null;marker.visible=false;}const follow=new THREE.Vector3().subVectors(player.position,kiln.position);follow.y=0;if(follow.length()>1.3){follow.normalize().multiplyScalar(dt*3.5);move(kiln,follow.x,follow.z,dt);}else move(kiln,0,0,dt);
nearest=null;let distance=2;for(const item of interactables){if(item.type==='cell'&&saved.cells.includes(item.id))continue;const d=Math.hypot(player.position.x-item.x,player.position.z-item.z);if(d<distance){nearest=item;distance=d;}if(item.g&&item.g.visible){item.g.rotation.y=t*.7;item.g.position.y=.8+Math.sin(t*2+item.id)*.12;}}$('action-title').textContent=nearest?nearest.title:'Follow the little lights';$('action-sub').textContent=nearest?nearest.sub:'Explore with Kiln · M opens districts';$('interact').style.borderColor=nearest?'#c6b47a99':'#9faa9240';$('map-player').setAttribute('cx',24+(player.position.x+12)/24*106);$('map-player').setAttribute('cy',24+(player.position.z+10)/21*72);particles.rotation.y=Math.sin(t*.03)*.04;worlds.get(activeDistrict).update(t,saved.exploration.completed.includes(activeDistrict));}
const offsets=[[21,25,26],[0,29,31],[-23,27,25]];look.lerp(new THREE.Vector3(player.position.x*.14,.1,player.position.z*.14),.025);camera.position.set(look.x+offsets[cameraMode][0],offsets[cameraMode][1],look.z+offsets[cameraMode][2]);camera.lookAt(look);composer.render();}requestAnimationFrame(frame);$('loading').style.opacity=0;setTimeout(()=>$('loading').remove(),900);
