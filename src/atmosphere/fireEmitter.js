import * as THREE from 'three';

export function fireLightIntensity(time, base = 24, phase = 0) {
  return base * (1 + .08 * Math.sin(2.3 * time) + .04 * Math.sin(5.1 * time + phase));
}

// One retained billboard batch; local cosmetic seeds, never wire entities.
export function createFireEmitter({ position = [0,.2,-2], quality = 'normal', seed = 629, light = null } = {}) {
  const reduced = quality === 'reduced';
  const count = reduced ? 12 : 24;
  const group = new THREE.Group(); group.name = 'atmosphere-fire'; group.position.fromArray(position);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex([0,1,2,0,2,3]);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,.5,1,0,-.5,1,0],3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
  const phases = new Float32Array(count);
  for(let i=0;i<count;i++) phases[i]=(i*.61803398875+seed*.0001)%1;
  geometry.setAttribute('phase',new THREE.InstancedBufferAttribute(phases,1));geometry.instanceCount=count;
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{time:{value:0},motion:{value:1},wind:{value:new THREE.Vector2()}},
    vertexShader:`attribute float phase; uniform float time; uniform float motion; uniform vec2 wind; varying vec2 vUv; varying float vLife;
      void main(){vUv=uv; float age=fract(phase+time*.48); vLife=sin(age*3.14159);
      float angle=phase*37.7; vec3 center=vec3(cos(angle)*.27,age*.65,sin(angle)*.27);
      center.xz+=wind*age*.3; vec4 mv=modelViewMatrix*vec4(center,1.);
      float sway=sin(time*2.+phase*30.)*.08*motion;
      mv.xy+=vec2(position.x*(.25+.2*vLife)+sway*uv.y,position.y*(.5+.65*vLife));
      gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying vec2 vUv; varying float vLife;
      void main(){float edge=1.-abs(vUv.x*2.-1.); float alpha=pow(max(0.,edge-vUv.y*.4),2.)*(1.-vUv.y)*.22;
      vec3 color=mix(vec3(1.,.58,.12),vec3(1.,.13,.015),vUv.y);
      gl_FragColor=vec4(color,alpha*(.4+.6*vLife));}`,
  });
  const flame=new THREE.Mesh(geometry,material);flame.frustumCulled=false;group.add(flame);
  let ember=null,emberGeometry=null,emberMaterial=null,positions=null;
  if(!reduced){
    positions=new Float32Array(128*3);emberGeometry=new THREE.BufferGeometry();
    emberGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    emberMaterial=new THREE.PointsMaterial({color:'#ffb862',size:.025,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending});
    ember=new THREE.Points(emberGeometry,emberMaterial);ember.frustumCulled=false;group.add(ember);
  }
  let disposed=false;
  const baseIntensity=light?.intensity??24;
  function update(time, {windX=0,windZ=0,reduceMotion=false}={}) {
    if(disposed)return;
    material.uniforms.time.value=reduceMotion?0:time;
    material.uniforms.motion.value=reduceMotion?0:1;
    material.uniforms.wind.value.set(windX,windZ);
    if(light)light.intensity=reduceMotion?baseIntensity:fireLightIntensity(time,baseIntensity,seed*.01);
    if(ember){
      ember.visible=!reduceMotion;
      for(let i=0;i<128;i++){
        const age=(time*.19+i/128)%1,angle=i*2.39996;
        positions[i*3]=Math.cos(angle)*(.15+age*.4)+windX*age;
        positions[i*3+1]=age*2.8;
        positions[i*3+2]=Math.sin(angle)*(.15+age*.4)+windZ*age;
      }
      emberGeometry.attributes.position.needsUpdate=true;
    }
  }
  function dispose(){
    if(disposed)return;disposed=true;group.removeFromParent();geometry.dispose();material.dispose();
    emberGeometry?.dispose();emberMaterial?.dispose();if(light)light.intensity=baseIntensity;
  }
  return {group,update,dispose,counts:{flames:count,embers:reduced?0:128,batches:reduced?1:2},get disposed(){return disposed;}};
}
