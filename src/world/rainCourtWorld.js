import { createSocialScenery, addSocialBoundary } from './socialScenery.js';

export function buildRainCourtScenery(ctx) {
  const s = createSocialScenery(ctx);
  s.box(0, -.32, .4, 24, .6, 21, '#293d46');
  for (let x = -11; x <= 11; x++) for (let z = -9; z <= 10; z++) {
    const covered = x >= -8 && x <= 8 && z <= -4;
    const colors = covered ? ['#657171', '#727c77', '#586b6b'] : ['#405a62', '#52666c', '#48616a'];
    s.box(x, -.025, z, .96, .08, .96, colors[Math.floor(ctx.random() * 3)], covered ? 'dry-stone' : 'wet-stone');
  }
  addSocialBoundary(s, ctx.def, '#364d53');
  // Layered masonry, divided warm windows and copper gutters.
  s.box(0, 2, -8.8, 17.4, 4, .55, '#344b50');
  ctx.block(0, -8.8, 17.4, .55);
  for (let row = 0; row < 10; row++) for (let i = 0; i < 22; i++) {
    s.box(-8.4 + i * .78 + (row % 2) * .28, .2 + row * .38, -8.47, .73, .33, .1,
      ['#4e6264', '#596966', '#425959'][Math.floor(ctx.random() * 3)]);
  }
  for (const x of [-6.8, -3.5, 1, 4.5, 7]) {
    s.box(x, 2.15, -8.33, 1.45, 1.8, .14, '#20373e', 'metal');
    s.box(x, 2.15, -8.22, 1.2, 1.55, .05, '#efc58a', 'windows');
    s.box(x, 2.15, -8.16, .07, 1.6, .06, '#32464a', 'metal');
    s.box(x, 2.15, -8.15, 1.25, .08, .06, '#32464a', 'metal');
    s.box(x, 1.21, -8.15, 1.65, .13, .4, '#81908b');
  }
  // Rear roof and narrow front eave leave the bench line legible overhead.
  s.box(0, 3.52, -7.95, 16.4, .18, 1.5, '#526c66', 'metal');
  s.box(0, 3.42, -4.25, 16.4, .16, .7, '#61736c', 'metal');
  for (const x of [-7, 0, 7]) {
    s.box(x, 1.65, -4.2, .3, 3.3, .3, '#3c5354', 'metal'); ctx.block(x, -4.2, .3, .3);
    s.box(x, 3.25, -6, .12, .16, 3.5, '#8b795b', 'wood');
  }
  s.box(-8.15, 1.5, -6.8, .25, 3, 2.3, '#3e5557'); ctx.block(-8.15, -6.8, .25, 2.3);
  s.box(-2, .56, -7.7, 1.6, .1, .6, '#927751', 'wood'); ctx.block(-2, -7.7, 1.6, .6);
  const seats = [[-2,-6.6,0,'arcade'],[2,-6.6,0,'arcade'],[-6.5,-6.8,0,'alcove'],[-5.2,-6.8,0,'alcove'],[5.8,4.4,Math.PI,'square'],[7.1,4.4,Math.PI,'square']];
  seats.forEach(([x,z,yaw,zone], i) => s.seat(`court-seat-${i}`,x,z,yaw,zone));
  // Basin rim, dark water and twin hanging rain chains.
  s.box(3,.35,-1.8,1.6,.7,1.4,'#80908a'); ctx.block(3,-1.8,1.6,1.4);
  s.box(3,.71,-1.8,1.3,.03,1.1,'#315964','puddle');
  s.beam([3,3.5,-4.25],[3,3.5,-1.8],.1,'#ae8053');
  for (const x of [2.65,3.35]) for (let y=.85;y<3.5;y+=.17) s.cylinder(x,y,-1.8,.08,.12,'#b88d59');
  ctx.environment.emitterAnchors.push({ kind:'runoff', x:2.65,y:3.4,z:-1.8 },{ kind:'runoff', x:3.35,y:3.4,z:-1.8 });
  for (const x of [-7.7,7.7]) {
    s.cylinder(x,1.7,-8.1,.13,3.4,'#b18457');
    for (let y=.4;y<3.3;y+=.6) s.box(x,y,-8.1,.25,.08,.2,'#475958','metal');
  }
  for (const [x,z] of [[8,5],[-7,6]]) {
    s.box(x,.3,z,1.2,.6,1.2,'#596b61');ctx.block(x,z,1.2,1.2);
    s.cylinder(x,1.35,z,.22,2.1,'#6a6250','wood');
    for (let i=0;i<8;i++) s.sphere(x+(ctx.random()-.5)*1.4,2.4+ctx.random(),z+(ctx.random()-.5)*1.3,1.25,1,1.2,'#344b3e');
    s.zone(`canopy-${x}`,{minX:x-1,maxX:x+1,minZ:z-1,maxZ:z+1},3,.55,5,{rain:.6,roof:.15,wind:.2,lowpassHz:4500});
  }
  for (let i=0;i<70;i++) s.sphere(-7.7+ctx.random()*1.2,.5+ctx.random()*3.3,-8.02,.22,.35,.12,'#3d5948');
  for (const [x,z,w,d] of [[-3,2.7,2.8,.65],[3,5.8,3,.7],[6,-2.8,1.8,.6],[-6,-1.5,1.6,.5]])
    s.box(x,.025,z,w,.014,d,'#61838a','puddle');
  for (const x of [-4.5,4.5]) s.box(x,.027,3,.06,.02,10,'#283f47','metal');
  ctx.block(-4.5, 2.5, 1.4, 8.4);
  s.light(-5,2.6,-7.7,'#ffc47a',14,9);s.light(4,2.6,-7.7,'#ffc47a',14,9);
  s.lantern(8.8,6.8,2.7,false);s.lantern(-8.8,4,2.7,false);
  s.zone('arcade',{minX:-8,maxX:8,minZ:-8,maxZ:-4},3.4,.1,10,{rain:.35,roof:.7,wind:.15,lowpassHz:2400});
  s.zone('alcove',{minX:-8,maxX:-4,minZ:-8,maxZ:-5.5},3.4,0,20,{rain:.15,roof:.25,wind:.05,lowpassHz:900});
  ctx.environment.audioAnchors = [{kind:'trickle',position:[3,.7,-1.8],gain:.12}];
  s.finish();
}
