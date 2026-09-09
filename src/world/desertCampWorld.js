import { createSocialScenery } from './socialScenery.js';

export function buildDesertCampScenery(ctx) {
  const s = createSocialScenery(ctx);
  s.box(0,-.28,-10,110,.5,110,'#8e7358','sand');
  for(let i=0;i<90;i++) {
    const x=(ctx.random()-.5)*23,z=(ctx.random()-.5)*20;
    s.box(x,-.009,z,1+ctx.random()*2,.012,.5+ctx.random(),'#9b8061','sand',ctx.random());
  }
  // Dunes and mesas are beyond playable bounds, with no hidden city shell.
  for (let i=0;i<13;i++) {
    const x=-35+i*6;
    s.sphere(x,-.4,-15-ctx.random()*4,14,3,14,'#796754','sand');
    s.box(x,3+ctx.random()*3,-30-ctx.random()*8,5+ctx.random()*4,8+ctx.random()*6,8,'#34333d');
  }
  for(const x of [-17,17]) for(const z of [-5,5,15]) s.sphere(x,-.3,z,12,2.3,15,'#796754','sand');
  for(const exit of ctx.def.exits) {
    const [x,z]=exit.position;
    s.box(x,.005,z,1.5,.025,1.3,'#bfa485','sand');
    for(const side of [-1,1]) {
      s.box(x,.23,z+side*1.1,.38,.46,.38,'#afa087');
      s.box(x,.53,z+side*1.1,.19,.17,.19,'#ffc47a','emissive');
    }
  }
  // Fire ring: no interaction, consumption or completion is attached.
  ctx.block(0,-2,1.6,1.6);
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;
    s.sphere(Math.cos(a)*.7,.17,-2+Math.sin(a)*.7,.38,.3,.32,'#575552','stone');
  }
  for(const yaw of [-.7,.7]) s.box(0,.19,-2,1.1,.18,.23,'#49352b','wood',yaw);
  s.cylinder(0,.19,-2,.7,.08,'#ff9b4b','emissive');
  const fireLight=s.light(0,1,-2,'#ffae5e',24,12);
  ctx.environment.fire = { position:[0,.2,-2],radius:.65,light:fireLight,baseIntensity:24 };
  ctx.environment.emitterAnchors.push({kind:'fire',position:[0,.2,-2],radius:.65});
  ctx.environment.sky = {stars:1500,milkyWay:true};
  ctx.environment.dust = {count:192, color:'#c5a27a'};
  ctx.environment.audioAnchors = [{kind:'fire',position:[0,.3,-2],gain:.3,radius:8}];
  for (let i=0;i<6;i++) {
    const a=(30+i*60)*Math.PI/180,x=3*Math.cos(a),z=-2+3*Math.sin(a);
    s.seat(`camp-fire-${i}`,x,z,Math.atan2(-x,-2-z),'fire','#9f7651');
    s.box(x,-.005,z,1.1,.025,1.1,i%2?'#655862':'#aa7c55','cloth');
  }
  s.seat('camp-quiet-0',6,-6,0,'shelter','#bba084');
  s.seat('camp-quiet-1',7.3,-6,0,'shelter','#bba084');
  // A-frame tent with a dark opening, bedroll and tied canvas seams.
  ctx.block(-6,-6,3,2);
  s.box(-6,.65,-6,3,1.3,2,'#625944','cloth');
  s.beam([-7.6,0,-7],[-6,2.4,-7],.13,'#b29c75','wood');
  s.beam([-4.4,0,-7],[-6,2.4,-7],.13,'#b29c75','wood');
  for(const sign of [-1,1]) {
    // Canvas roof is a broad sloped beam, instanced with the cloth batch.
    const from=[-6,2.4,-6],to=[-6+sign*1.7,.2,-6];
    for(let z=-6.95;z<-5;z+=.16) s.beam([from[0],from[1],z],[to[0],to[1],z],.18,'#a49473','cloth');
  }
  s.box(-6,.65,-4.98,1.2,1.3,.04,'#292d30');
  s.box(-6,.09,-4.45,1.2,.1,.5,'#9b7961','cloth');
  for(const [x,z] of [[3.1,-7.9],[7.9,-7.9],[3.1,-4.1],[7.9,-4.1]]) {
    s.cylinder(x,1.4,z,.09,2.8,'#977a52','wood');ctx.block(x,z,.12,.12);
  }
  s.box(5.5,2.85,-7.5,5,.07,1,'#b1a086','cloth');
  s.box(5.5,2.75,-4.4,5,.07,.6,'#a69378','cloth');
  for(const x of [3.1,5.5,7.9]) s.beam([x,2.8,-8],[x,2.7,-4],.08,'#7c684a','wood');
  s.zone('shelter',{minX:3,maxX:8,minZ:-8,maxZ:-4},2.8,.15,10,{rain:0,roof:0,wind:.12,lowpassHz:2600});
  s.zone('tent',{minX:-7.5,maxX:-4.5,minZ:-7,maxZ:-5},2.4,0,20,{rain:0,roof:0,wind:.05,lowpassHz:1200});
  s.lantern(-7,-3,1.3,true);s.lantern(6,-4,1.3,false);s.lantern(-4,6,1.3,false);
  for(const [x,z] of [[-7.8,-7],[-4.1,-7.4]]) {
    s.box(x,.22,z,.7,.44,.6,'#655743','wood');ctx.block(x,z,.7,.6);
    s.box(x,.48,z,.75,.09,.65,'#987d56','wood');
  }
  // Night telescope at the tent opening — compact tripod, routes stay open.
  // (Horseshoe pits are drawn by the activity's own pit scene at its
  // manifest transform, so the camp does not duplicate stakes here.)
  s.cylinder(-6.5, 0.45, -5.5, 0.08, 0.9, '#3d4246', 'metal');
  s.box(-6.5, 1.05, -5.5, 0.16, 0.12, 0.4, '#2a2e32', 'metal');
  s.box(-6.5, 1.12, -5.35, 0.1, 0.08, 0.18, '#1c2226', 'metal');
  s.finish();
}
