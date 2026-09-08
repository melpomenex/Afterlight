(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(s){if(s.ep)return;s.ep=!0;const r=t(s);fetch(s.href,r)}})();const fp="modulepreload",pp=function(n){return"/"+n},pu={},vd=function(e,t,i){let s=Promise.resolve();if(t&&t.length>0){let l=function(c){return Promise.all(c.map(u=>Promise.resolve(u).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),a=o?.nonce||o?.getAttribute("nonce");s=l(t.map(c=>{if(c=pp(c),c in pu)return;pu[c]=!0;const u=c.endsWith(".css"),f=u?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${f}`))return;const d=document.createElement("link");if(d.rel=u?"stylesheet":fp,u||(d.as="script"),d.crossOrigin="",d.href=c,a&&d.setAttribute("nonce",a),document.head.appendChild(d),u)return new Promise((h,v)=>{d.addEventListener("load",h),d.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${c}`)))})}))}function r(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return s.then(o=>{for(const a of o||[])a.status==="rejected"&&r(a.reason);return e().catch(r)})},Ds=Object.freeze([{id:"wave",label:"Hello there",icon:"👋",hint:"A little warmth goes a long way"},{id:"dance",label:"Rust shuffle",icon:"♫",hint:"Still got some rhythm in these gears"},{id:"cheer",label:"We did it!",icon:"✦",hint:"Small repairs. Big celebrations."},{id:"heart",label:"Much love",icon:"♡",hint:"For your favorite fellow gardener"},{id:"bow",label:"After you",icon:"❧",hint:"A gracious little thank-you"},{id:"shrug",label:"Who knows?",icon:"¯\\_(ツ)_/¯",hint:"Some mysteries can wait"}]),_d=n=>Ds.some(e=>e.id===n),Ra=3.2;function mp(n,e,t=44){return!Number.isFinite(n)||!Number.isFinite(e)||Math.hypot(n,e)<t?-1:Math.floor((Math.atan2(e,n)+Math.PI/2+Math.PI/6+Math.PI*2)%(Math.PI*2)/(Math.PI/3))}function gp({canOpen:n,onOpen:e,onChoose:t}){const i=document.createElement("div");i.className="emote-overlay",i.hidden=!0,i.innerHTML=`<section class="emote-wheel" role="dialog" aria-label="Emotes" aria-describedby="emote-help"><div class="emote-center"><small>EXPRESS YOURSELF</small><strong aria-live="polite">Choose a feeling</strong><span class="emote-description">Move outward to choose</span><i class="emote-stick"></i></div>${Ds.map((d,h)=>`<button class="emote-choice" style="--x:${Math.sin(h*Math.PI/3)*36}%;--y:${-Math.cos(h*Math.PI/3)*36}%" data-index="${h}" aria-label="${d.label}"><span>${d.icon}</span><b>${d.label}</b><small>${h+1}</small></button>`).join("")}<p id="emote-help">Release V to perform · Center / Esc cancels<br>Or choose with 1–6 / arrow keys</p></section>`,document.body.append(i);const s=i.querySelector(".emote-wheel"),r=[...i.querySelectorAll("button")];let o=-1,a=!1,l;function c(d){o=d,r.forEach((h,v)=>{h.classList.toggle("selected",v===d),h.setAttribute("aria-pressed",String(v===d))}),i.querySelector("strong").textContent=Ds[d]?.label||"Choose a feeling",i.querySelector(".emote-description").textContent=Ds[d]?.hint||"Center to cancel"}function u(d=!1){if(i.hidden)return;const h=Ds[o];i.hidden=!0,a=!1,l?.focus({preventScroll:!0}),d&&h&&t(h.id)}function f(d=!1){!i.hidden||!n()||(e(),l=document.activeElement,a=d,i.hidden=!1,c(-1),i.querySelector(".emote-stick").style.transform="",r[0].focus({preventScroll:!0}))}return i.addEventListener("pointermove",d=>{const h=s.getBoundingClientRect(),v=d.clientX-h.left-h.width/2,g=d.clientY-h.top-h.height/2;c(mp(v,g,h.width*.12));const m=Math.hypot(v,g)||1;i.querySelector(".emote-stick").style.transform=`translate(${v/m*Math.min(16,m)}px, ${g/m*Math.min(16,m)}px)`}),i.addEventListener("click",d=>{const h=d.target.closest("button");h?(c(Number(h.dataset.index)),u(!0)):u()}),window.addEventListener("keydown",d=>{const h=d.target.closest('input,textarea,select,[contenteditable="true"]');if(i.hidden){d.code==="KeyV"&&!d.repeat&&!h&&!d.ctrlKey&&!d.metaKey&&!d.altKey&&n()&&(d.preventDefault(),d.stopImmediatePropagation(),f(!0));return}if(d.stopImmediatePropagation(),d.code==="Tab"){d.preventDefault(),c((o+(d.shiftKey?5:1)+6)%6),r[o].focus();return}d.preventDefault(),d.code==="Escape"?u():/^Digit[1-6]$/.test(d.code)?c(Number(d.code.slice(-1))-1):["ArrowRight","ArrowDown","ArrowLeft","ArrowUp"].includes(d.code)?c((o+(["ArrowLeft","ArrowUp"].includes(d.code)?5:1)+6)%6):(d.code==="Enter"||d.code==="Space")&&u(!0)},!0),window.addEventListener("keyup",d=>{d.code==="KeyV"&&a&&(d.preventDefault(),d.stopImmediatePropagation(),u(!0))},!0),window.addEventListener("blur",()=>u()),document.addEventListener("visibilitychange",()=>{document.hidden&&u()}),window.addEventListener("resize",()=>u()),{open:f,close:u,get isOpen(){return!i.hidden}}}const Dc="180",vp=0,mu=1,_p=2,yd=1,xd=2,ii=3,Ii=0,Zt=1,Yt=2,di=0,Os=1,is=2,gu=3,vu=4,yp=5,Yi=100,xp=101,bp=102,Mp=103,Sp=104,Ep=200,wp=201,Tp=202,Ap=203,Al=204,Cl=205,Cp=206,Rp=207,Pp=208,Ip=209,Lp=210,Dp=211,Np=212,Up=213,Op=214,Rl=0,Pl=1,Il=2,Hs=3,Ll=4,Dl=5,Nl=6,Ul=7,bd=0,Fp=1,kp=2,Ri=0,Bp=1,Hp=2,zp=3,Md=4,Vp=5,Gp=6,Wp=7,Sd=300,zs=301,Vs=302,Ol=303,Fl=304,fa=306,Ko=1e3,Qi=1001,kl=1002,an=1003,Xp=1004,$r=1005,Tn=1006,Pa=1007,es=1008,Yn=1009,Ed=1010,wd=1011,Sr=1012,Nc=1013,ss=1014,Wn=1015,fi=1016,Uc=1017,Oc=1018,Er=1020,Td=35902,Ad=35899,Cd=1021,Rd=1022,_n=1023,wr=1026,Tr=1027,Fc=1028,kc=1029,Pd=1030,Bc=1031,Hc=1033,Fo=33776,ko=33777,Bo=33778,Ho=33779,Bl=35840,Hl=35841,zl=35842,Vl=35843,Gl=36196,Wl=37492,Xl=37496,ql=37808,$l=37809,jl=37810,Yl=37811,Kl=37812,Zl=37813,Jl=37814,Ql=37815,ec=37816,tc=37817,nc=37818,ic=37819,sc=37820,rc=37821,oc=36492,ac=36494,lc=36495,cc=36283,uc=36284,hc=36285,dc=36286,qp=3200,$p=3201,Id=0,jp=1,Ai="",fn="srgb",Gs="srgb-linear",Zo="linear",lt="srgb",cs=7680,_u=519,Yp=512,Kp=513,Zp=514,Ld=515,Jp=516,Qp=517,em=518,tm=519,fc=35044,yu="300 es",Xn=2e3,Jo=2001;class Ys{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const s=i[e];if(s!==void 0){const r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const s=i.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}}const Ht=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let xu=1234567;const vr=Math.PI/180,Ar=180/Math.PI;function pi(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Ht[n&255]+Ht[n>>8&255]+Ht[n>>16&255]+Ht[n>>24&255]+"-"+Ht[e&255]+Ht[e>>8&255]+"-"+Ht[e>>16&15|64]+Ht[e>>24&255]+"-"+Ht[t&63|128]+Ht[t>>8&255]+"-"+Ht[t>>16&255]+Ht[t>>24&255]+Ht[i&255]+Ht[i>>8&255]+Ht[i>>16&255]+Ht[i>>24&255]).toLowerCase()}function Ke(n,e,t){return Math.max(e,Math.min(t,n))}function zc(n,e){return(n%e+e)%e}function nm(n,e,t,i,s){return i+(n-e)*(s-i)/(t-e)}function im(n,e,t){return n!==e?(t-n)/(e-n):0}function _r(n,e,t){return(1-t)*n+t*e}function sm(n,e,t,i){return _r(n,e,1-Math.exp(-t*i))}function rm(n,e=1){return e-Math.abs(zc(n,e*2)-e)}function om(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function am(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function lm(n,e){return n+Math.floor(Math.random()*(e-n+1))}function cm(n,e){return n+Math.random()*(e-n)}function um(n){return n*(.5-Math.random())}function hm(n){n!==void 0&&(xu=n);let e=xu+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function dm(n){return n*vr}function fm(n){return n*Ar}function pm(n){return(n&n-1)===0&&n!==0}function mm(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function gm(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function vm(n,e,t,i,s){const r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),c=r((e+i)/2),u=o((e+i)/2),f=r((e-i)/2),d=o((e-i)/2),h=r((i-e)/2),v=o((i-e)/2);switch(s){case"XYX":n.set(a*u,l*f,l*d,a*c);break;case"YZY":n.set(l*d,a*u,l*f,a*c);break;case"ZXZ":n.set(l*f,l*d,a*u,a*c);break;case"XZX":n.set(a*u,l*v,l*h,a*c);break;case"YXY":n.set(l*h,a*u,l*v,a*c);break;case"ZYZ":n.set(l*v,l*h,a*u,a*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function wn(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function rt(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const _m={DEG2RAD:vr,RAD2DEG:Ar,generateUUID:pi,clamp:Ke,euclideanModulo:zc,mapLinear:nm,inverseLerp:im,lerp:_r,damp:sm,pingpong:rm,smoothstep:om,smootherstep:am,randInt:lm,randFloat:cm,randFloatSpread:um,seededRandom:hm,degToRad:dm,radToDeg:fm,isPowerOfTwo:pm,ceilPowerOfTwo:mm,floorPowerOfTwo:gm,setQuaternionFromProperEuler:vm,normalize:rt,denormalize:wn};class Ee{constructor(e=0,t=0){Ee.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6],this.y=s[1]*t+s[4]*i+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Ke(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*i-o*s+e.x,this.y=r*s+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ks{constructor(e=0,t=0,i=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=s}static slerpFlat(e,t,i,s,r,o,a){let l=i[s+0],c=i[s+1],u=i[s+2],f=i[s+3];const d=r[o+0],h=r[o+1],v=r[o+2],g=r[o+3];if(a===0){e[t+0]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f;return}if(a===1){e[t+0]=d,e[t+1]=h,e[t+2]=v,e[t+3]=g;return}if(f!==g||l!==d||c!==h||u!==v){let m=1-a;const p=l*d+c*h+u*v+f*g,S=p>=0?1:-1,E=1-p*p;if(E>Number.EPSILON){const M=Math.sqrt(E),x=Math.atan2(M,p*S);m=Math.sin(m*x)/M,a=Math.sin(a*x)/M}const _=a*S;if(l=l*m+d*_,c=c*m+h*_,u=u*m+v*_,f=f*m+g*_,m===1-a){const M=1/Math.sqrt(l*l+c*c+u*u+f*f);l*=M,c*=M,u*=M,f*=M}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f}static multiplyQuaternionsFlat(e,t,i,s,r,o){const a=i[s],l=i[s+1],c=i[s+2],u=i[s+3],f=r[o],d=r[o+1],h=r[o+2],v=r[o+3];return e[t]=a*v+u*f+l*h-c*d,e[t+1]=l*v+u*d+c*f-a*h,e[t+2]=c*v+u*h+a*d-l*f,e[t+3]=u*v-a*f-l*d-c*h,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,s){return this._x=e,this._y=t,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(i/2),u=a(s/2),f=a(r/2),d=l(i/2),h=l(s/2),v=l(r/2);switch(o){case"XYZ":this._x=d*u*f+c*h*v,this._y=c*h*f-d*u*v,this._z=c*u*v+d*h*f,this._w=c*u*f-d*h*v;break;case"YXZ":this._x=d*u*f+c*h*v,this._y=c*h*f-d*u*v,this._z=c*u*v-d*h*f,this._w=c*u*f+d*h*v;break;case"ZXY":this._x=d*u*f-c*h*v,this._y=c*h*f+d*u*v,this._z=c*u*v+d*h*f,this._w=c*u*f-d*h*v;break;case"ZYX":this._x=d*u*f-c*h*v,this._y=c*h*f+d*u*v,this._z=c*u*v-d*h*f,this._w=c*u*f+d*h*v;break;case"YZX":this._x=d*u*f+c*h*v,this._y=c*h*f+d*u*v,this._z=c*u*v-d*h*f,this._w=c*u*f-d*h*v;break;case"XZY":this._x=d*u*f-c*h*v,this._y=c*h*f-d*u*v,this._z=c*u*v+d*h*f,this._w=c*u*f+d*h*v;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,s=Math.sin(i);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],s=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],u=t[6],f=t[10],d=i+a+f;if(d>0){const h=.5/Math.sqrt(d+1);this._w=.25/h,this._x=(u-l)*h,this._y=(r-c)*h,this._z=(o-s)*h}else if(i>a&&i>f){const h=2*Math.sqrt(1+i-a-f);this._w=(u-l)/h,this._x=.25*h,this._y=(s+o)/h,this._z=(r+c)/h}else if(a>f){const h=2*Math.sqrt(1+a-i-f);this._w=(r-c)/h,this._x=(s+o)/h,this._y=.25*h,this._z=(l+u)/h}else{const h=2*Math.sqrt(1+f-i-a);this._w=(o-s)/h,this._x=(r+c)/h,this._y=(l+u)/h,this._z=.25*h}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ke(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const s=Math.min(1,t/i);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,s=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,u=t._w;return this._x=i*u+o*a+s*c-r*l,this._y=s*u+o*l+r*a-i*c,this._z=r*u+o*c+i*l-s*a,this._w=o*u-i*a-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const i=this._x,s=this._y,r=this._z,o=this._w;let a=o*e._w+i*e._x+s*e._y+r*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=i,this._y=s,this._z=r,this;const l=1-a*a;if(l<=Number.EPSILON){const h=1-t;return this._w=h*o+t*this._w,this._x=h*i+t*this._x,this._y=h*s+t*this._y,this._z=h*r+t*this._z,this.normalize(),this}const c=Math.sqrt(l),u=Math.atan2(c,a),f=Math.sin((1-t)*u)/c,d=Math.sin(t*u)/c;return this._w=o*f+this._w*d,this._x=i*f+this._x*d,this._y=s*f+this._y*d,this._z=r*f+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class k{constructor(e=0,t=0,i=0){k.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(bu.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(bu.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6]*s,this.y=r[1]*t+r[4]*i+r[7]*s,this.z=r[2]*t+r[5]*i+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*i+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*i+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*i+r[10]*s+r[14])*o,this}applyQuaternion(e){const t=this.x,i=this.y,s=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*s-a*i),u=2*(a*t-r*s),f=2*(r*i-o*t);return this.x=t+l*c+o*f-a*u,this.y=i+l*u+a*c-r*f,this.z=s+l*f+r*u-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*i+r[8]*s,this.y=r[1]*t+r[5]*i+r[9]*s,this.z=r[2]*t+r[6]*i+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this.z=Ke(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this.z=Ke(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,s=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=s*l-r*a,this.y=r*o-i*l,this.z=i*a-s*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return Ia.copy(this).projectOnVector(e),this.sub(Ia)}reflect(e){return this.sub(Ia.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Ke(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,s=this.z-e.z;return t*t+i*i+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const s=Math.sin(t)*e;return this.x=s*Math.sin(i),this.y=Math.cos(t)*e,this.z=s*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Ia=new k,bu=new Ks;class We{constructor(e,t,i,s,r,o,a,l,c){We.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,s,r,o,a,l,c)}set(e,t,i,s,r,o,a,l,c){const u=this.elements;return u[0]=e,u[1]=s,u[2]=a,u[3]=t,u[4]=r,u[5]=l,u[6]=i,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,s=t.elements,r=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],u=i[4],f=i[7],d=i[2],h=i[5],v=i[8],g=s[0],m=s[3],p=s[6],S=s[1],E=s[4],_=s[7],M=s[2],x=s[5],w=s[8];return r[0]=o*g+a*S+l*M,r[3]=o*m+a*E+l*x,r[6]=o*p+a*_+l*w,r[1]=c*g+u*S+f*M,r[4]=c*m+u*E+f*x,r[7]=c*p+u*_+f*w,r[2]=d*g+h*S+v*M,r[5]=d*m+h*E+v*x,r[8]=d*p+h*_+v*w,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return t*o*u-t*a*c-i*r*u+i*a*l+s*r*c-s*o*l}invert(){const e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],f=u*o-a*c,d=a*l-u*r,h=c*r-o*l,v=t*f+i*d+s*h;if(v===0)return this.set(0,0,0,0,0,0,0,0,0);const g=1/v;return e[0]=f*g,e[1]=(s*c-u*i)*g,e[2]=(a*i-s*o)*g,e[3]=d*g,e[4]=(u*t-s*l)*g,e[5]=(s*r-a*t)*g,e[6]=h*g,e[7]=(i*l-c*t)*g,e[8]=(o*t-i*r)*g,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,s,r,o,a){const l=Math.cos(r),c=Math.sin(r);return this.set(i*l,i*c,-i*(l*o+c*a)+o+e,-s*c,s*l,-s*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(La.makeScale(e,t)),this}rotate(e){return this.premultiply(La.makeRotation(-e)),this}translate(e,t){return this.premultiply(La.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let s=0;s<9;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const La=new We;function Dd(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Qo(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function ym(){const n=Qo("canvas");return n.style.display="block",n}const Mu={};function Cr(n){n in Mu||(Mu[n]=!0,console.warn(n))}function xm(n,e,t){return new Promise(function(i,s){function r(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:i()}}setTimeout(r,t)})}const Su=new We().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Eu=new We().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function bm(){const n={enabled:!0,workingColorSpace:Gs,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===lt&&(s.r=mi(s.r),s.g=mi(s.g),s.b=mi(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===lt&&(s.r=Fs(s.r),s.g=Fs(s.g),s.b=Fs(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Ai?Zo:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Cr("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Cr("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[Gs]:{primaries:e,whitePoint:i,transfer:Zo,toXYZ:Su,fromXYZ:Eu,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:fn},outputColorSpaceConfig:{drawingBufferColorSpace:fn}},[fn]:{primaries:e,whitePoint:i,transfer:lt,toXYZ:Su,fromXYZ:Eu,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:fn}}}),n}const et=bm();function mi(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Fs(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let us;class Mm{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{us===void 0&&(us=Qo("canvas")),us.width=e.width,us.height=e.height;const s=us.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),i=us}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Qo("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const s=i.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=mi(r[o]/255)*255;return i.putImageData(s,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(mi(t[i]/255)*255):t[i]=mi(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Sm=0;class Vc{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Sm++}),this.uuid=pi(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Da(s[o].image)):r.push(Da(s[o]))}else r=Da(s);i.url=r}return t||(e.images[this.uuid]=i),i}}function Da(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Mm.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Em=0;const Na=new k;class Gt extends Ys{constructor(e=Gt.DEFAULT_IMAGE,t=Gt.DEFAULT_MAPPING,i=Qi,s=Qi,r=Tn,o=es,a=_n,l=Yn,c=Gt.DEFAULT_ANISOTROPY,u=Ai){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Em++}),this.uuid=pi(),this.name="",this.source=new Vc(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Ee(0,0),this.repeat=new Ee(1,1),this.center=new Ee(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new We,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Na).x}get height(){return this.source.getSize(Na).y}get depth(){return this.source.getSize(Na).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}s&&i&&s.isVector2&&i.isVector2||s&&i&&s.isVector3&&i.isVector3||s&&i&&s.isMatrix3&&i.isMatrix3?s.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Sd)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ko:e.x=e.x-Math.floor(e.x);break;case Qi:e.x=e.x<0?0:1;break;case kl:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Ko:e.y=e.y-Math.floor(e.y);break;case Qi:e.y=e.y<0?0:1;break;case kl:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Gt.DEFAULT_IMAGE=null;Gt.DEFAULT_MAPPING=Sd;Gt.DEFAULT_ANISOTROPY=1;class ot{constructor(e=0,t=0,i=0,s=1){ot.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,s){return this.x=e,this.y=t,this.z=i,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*i+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*i+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*i+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*i+o[11]*s+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,s,r;const l=e.elements,c=l[0],u=l[4],f=l[8],d=l[1],h=l[5],v=l[9],g=l[2],m=l[6],p=l[10];if(Math.abs(u-d)<.01&&Math.abs(f-g)<.01&&Math.abs(v-m)<.01){if(Math.abs(u+d)<.1&&Math.abs(f+g)<.1&&Math.abs(v+m)<.1&&Math.abs(c+h+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const E=(c+1)/2,_=(h+1)/2,M=(p+1)/2,x=(u+d)/4,w=(f+g)/4,R=(v+m)/4;return E>_&&E>M?E<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(E),s=x/i,r=w/i):_>M?_<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(_),i=x/s,r=R/s):M<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(M),i=w/r,s=R/r),this.set(i,s,r,t),this}let S=Math.sqrt((m-v)*(m-v)+(f-g)*(f-g)+(d-u)*(d-u));return Math.abs(S)<.001&&(S=1),this.x=(m-v)/S,this.y=(f-g)/S,this.z=(d-u)/S,this.w=Math.acos((c+h+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this.z=Ke(this.z,e.z,t.z),this.w=Ke(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this.z=Ke(this.z,e,t),this.w=Ke(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class wm extends Ys{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Tn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new ot(0,0,e,t),this.scissorTest=!1,this.viewport=new ot(0,0,e,t);const s={width:e,height:t,depth:i.depth},r=new Gt(s);this.textures=[];const o=i.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(e={}){const t={minFilter:Tn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=i,this.textures[s].isArrayTexture=this.textures[s].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const s=Object.assign({},e.textures[t].image);this.textures[t].source=new Vc(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Cn extends wm{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class Nd extends Gt{constructor(e=null,t=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=an,this.minFilter=an,this.wrapR=Qi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Tm extends Gt{constructor(e=null,t=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=an,this.minFilter=an,this.wrapR=Qi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class os{constructor(e=new k(1/0,1/0,1/0),t=new k(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(bn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(bn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=bn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const r=i.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,bn):bn.fromBufferAttribute(r,o),bn.applyMatrix4(e.matrixWorld),this.expandByPoint(bn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),jr.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),jr.copy(i.boundingBox)),jr.applyMatrix4(e.matrixWorld),this.union(jr)}const s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,bn),bn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(er),Yr.subVectors(this.max,er),hs.subVectors(e.a,er),ds.subVectors(e.b,er),fs.subVectors(e.c,er),_i.subVectors(ds,hs),yi.subVectors(fs,ds),Hi.subVectors(hs,fs);let t=[0,-_i.z,_i.y,0,-yi.z,yi.y,0,-Hi.z,Hi.y,_i.z,0,-_i.x,yi.z,0,-yi.x,Hi.z,0,-Hi.x,-_i.y,_i.x,0,-yi.y,yi.x,0,-Hi.y,Hi.x,0];return!Ua(t,hs,ds,fs,Yr)||(t=[1,0,0,0,1,0,0,0,1],!Ua(t,hs,ds,fs,Yr))?!1:(Kr.crossVectors(_i,yi),t=[Kr.x,Kr.y,Kr.z],Ua(t,hs,ds,fs,Yr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,bn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(bn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Jn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Jn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Jn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Jn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Jn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Jn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Jn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Jn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Jn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Jn=[new k,new k,new k,new k,new k,new k,new k,new k],bn=new k,jr=new os,hs=new k,ds=new k,fs=new k,_i=new k,yi=new k,Hi=new k,er=new k,Yr=new k,Kr=new k,zi=new k;function Ua(n,e,t,i,s){for(let r=0,o=n.length-3;r<=o;r+=3){zi.fromArray(n,r);const a=s.x*Math.abs(zi.x)+s.y*Math.abs(zi.y)+s.z*Math.abs(zi.z),l=e.dot(zi),c=t.dot(zi),u=i.dot(zi);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}const Am=new os,tr=new k,Oa=new k;class Ui{constructor(e=new k,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):Am.setFromPoints(e).getCenter(i);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,i.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;tr.subVectors(e,this.center);const t=tr.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),s=(i-this.radius)*.5;this.center.addScaledVector(tr,s/i),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Oa.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(tr.copy(e.center).add(Oa)),this.expandByPoint(tr.copy(e.center).sub(Oa))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const Qn=new k,Fa=new k,Zr=new k,xi=new k,ka=new k,Jr=new k,Ba=new k;class pa{constructor(e=new k,t=new k(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Qn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Qn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Qn.copy(this.origin).addScaledVector(this.direction,t),Qn.distanceToSquared(e))}distanceSqToSegment(e,t,i,s){Fa.copy(e).add(t).multiplyScalar(.5),Zr.copy(t).sub(e).normalize(),xi.copy(this.origin).sub(Fa);const r=e.distanceTo(t)*.5,o=-this.direction.dot(Zr),a=xi.dot(this.direction),l=-xi.dot(Zr),c=xi.lengthSq(),u=Math.abs(1-o*o);let f,d,h,v;if(u>0)if(f=o*l-a,d=o*a-l,v=r*u,f>=0)if(d>=-v)if(d<=v){const g=1/u;f*=g,d*=g,h=f*(f+o*d+2*a)+d*(o*f+d+2*l)+c}else d=r,f=Math.max(0,-(o*d+a)),h=-f*f+d*(d+2*l)+c;else d=-r,f=Math.max(0,-(o*d+a)),h=-f*f+d*(d+2*l)+c;else d<=-v?(f=Math.max(0,-(-o*r+a)),d=f>0?-r:Math.min(Math.max(-r,-l),r),h=-f*f+d*(d+2*l)+c):d<=v?(f=0,d=Math.min(Math.max(-r,-l),r),h=d*(d+2*l)+c):(f=Math.max(0,-(o*r+a)),d=f>0?r:Math.min(Math.max(-r,-l),r),h=-f*f+d*(d+2*l)+c);else d=o>0?-r:r,f=Math.max(0,-(o*d+a)),h=-f*f+d*(d+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,f),s&&s.copy(Fa).addScaledVector(Zr,d),h}intersectSphere(e,t){Qn.subVectors(e.center,this.origin);const i=Qn.dot(this.direction),s=Qn.dot(Qn)-i*i,r=e.radius*e.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,s,r,o,a,l;const c=1/this.direction.x,u=1/this.direction.y,f=1/this.direction.z,d=this.origin;return c>=0?(i=(e.min.x-d.x)*c,s=(e.max.x-d.x)*c):(i=(e.max.x-d.x)*c,s=(e.min.x-d.x)*c),u>=0?(r=(e.min.y-d.y)*u,o=(e.max.y-d.y)*u):(r=(e.max.y-d.y)*u,o=(e.min.y-d.y)*u),i>o||r>s||((r>i||isNaN(i))&&(i=r),(o<s||isNaN(s))&&(s=o),f>=0?(a=(e.min.z-d.z)*f,l=(e.max.z-d.z)*f):(a=(e.max.z-d.z)*f,l=(e.min.z-d.z)*f),i>l||a>s)||((a>i||i!==i)&&(i=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,t)}intersectsBox(e){return this.intersectBox(e,Qn)!==null}intersectTriangle(e,t,i,s,r){ka.subVectors(t,e),Jr.subVectors(i,e),Ba.crossVectors(ka,Jr);let o=this.direction.dot(Ba),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;xi.subVectors(this.origin,e);const l=a*this.direction.dot(Jr.crossVectors(xi,Jr));if(l<0)return null;const c=a*this.direction.dot(ka.cross(xi));if(c<0||l+c>o)return null;const u=-a*xi.dot(Ba);return u<0?null:this.at(u/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class it{constructor(e,t,i,s,r,o,a,l,c,u,f,d,h,v,g,m){it.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,s,r,o,a,l,c,u,f,d,h,v,g,m)}set(e,t,i,s,r,o,a,l,c,u,f,d,h,v,g,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=i,p[12]=s,p[1]=r,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=u,p[10]=f,p[14]=d,p[3]=h,p[7]=v,p[11]=g,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new it().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,s=1/ps.setFromMatrixColumn(e,0).length(),r=1/ps.setFromMatrixColumn(e,1).length(),o=1/ps.setFromMatrixColumn(e,2).length();return t[0]=i[0]*s,t[1]=i[1]*s,t[2]=i[2]*s,t[3]=0,t[4]=i[4]*r,t[5]=i[5]*r,t[6]=i[6]*r,t[7]=0,t[8]=i[8]*o,t[9]=i[9]*o,t[10]=i[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,s=e.y,r=e.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(s),c=Math.sin(s),u=Math.cos(r),f=Math.sin(r);if(e.order==="XYZ"){const d=o*u,h=o*f,v=a*u,g=a*f;t[0]=l*u,t[4]=-l*f,t[8]=c,t[1]=h+v*c,t[5]=d-g*c,t[9]=-a*l,t[2]=g-d*c,t[6]=v+h*c,t[10]=o*l}else if(e.order==="YXZ"){const d=l*u,h=l*f,v=c*u,g=c*f;t[0]=d+g*a,t[4]=v*a-h,t[8]=o*c,t[1]=o*f,t[5]=o*u,t[9]=-a,t[2]=h*a-v,t[6]=g+d*a,t[10]=o*l}else if(e.order==="ZXY"){const d=l*u,h=l*f,v=c*u,g=c*f;t[0]=d-g*a,t[4]=-o*f,t[8]=v+h*a,t[1]=h+v*a,t[5]=o*u,t[9]=g-d*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const d=o*u,h=o*f,v=a*u,g=a*f;t[0]=l*u,t[4]=v*c-h,t[8]=d*c+g,t[1]=l*f,t[5]=g*c+d,t[9]=h*c-v,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const d=o*l,h=o*c,v=a*l,g=a*c;t[0]=l*u,t[4]=g-d*f,t[8]=v*f+h,t[1]=f,t[5]=o*u,t[9]=-a*u,t[2]=-c*u,t[6]=h*f+v,t[10]=d-g*f}else if(e.order==="XZY"){const d=o*l,h=o*c,v=a*l,g=a*c;t[0]=l*u,t[4]=-f,t[8]=c*u,t[1]=d*f+g,t[5]=o*u,t[9]=h*f-v,t[2]=v*f-h,t[6]=a*u,t[10]=g*f+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Cm,e,Rm)}lookAt(e,t,i){const s=this.elements;return nn.subVectors(e,t),nn.lengthSq()===0&&(nn.z=1),nn.normalize(),bi.crossVectors(i,nn),bi.lengthSq()===0&&(Math.abs(i.z)===1?nn.x+=1e-4:nn.z+=1e-4,nn.normalize(),bi.crossVectors(i,nn)),bi.normalize(),Qr.crossVectors(nn,bi),s[0]=bi.x,s[4]=Qr.x,s[8]=nn.x,s[1]=bi.y,s[5]=Qr.y,s[9]=nn.y,s[2]=bi.z,s[6]=Qr.z,s[10]=nn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,s=t.elements,r=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],u=i[1],f=i[5],d=i[9],h=i[13],v=i[2],g=i[6],m=i[10],p=i[14],S=i[3],E=i[7],_=i[11],M=i[15],x=s[0],w=s[4],R=s[8],y=s[12],b=s[1],P=s[5],N=s[9],U=s[13],I=s[2],F=s[6],B=s[10],L=s[14],A=s[3],H=s[7],V=s[11],Z=s[15];return r[0]=o*x+a*b+l*I+c*A,r[4]=o*w+a*P+l*F+c*H,r[8]=o*R+a*N+l*B+c*V,r[12]=o*y+a*U+l*L+c*Z,r[1]=u*x+f*b+d*I+h*A,r[5]=u*w+f*P+d*F+h*H,r[9]=u*R+f*N+d*B+h*V,r[13]=u*y+f*U+d*L+h*Z,r[2]=v*x+g*b+m*I+p*A,r[6]=v*w+g*P+m*F+p*H,r[10]=v*R+g*N+m*B+p*V,r[14]=v*y+g*U+m*L+p*Z,r[3]=S*x+E*b+_*I+M*A,r[7]=S*w+E*P+_*F+M*H,r[11]=S*R+E*N+_*B+M*V,r[15]=S*y+E*U+_*L+M*Z,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],s=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],u=e[2],f=e[6],d=e[10],h=e[14],v=e[3],g=e[7],m=e[11],p=e[15];return v*(+r*l*f-s*c*f-r*a*d+i*c*d+s*a*h-i*l*h)+g*(+t*l*h-t*c*d+r*o*d-s*o*h+s*c*u-r*l*u)+m*(+t*c*f-t*a*h-r*o*f+i*o*h+r*a*u-i*c*u)+p*(-s*a*u-t*l*f+t*a*d+s*o*f-i*o*d+i*l*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],f=e[9],d=e[10],h=e[11],v=e[12],g=e[13],m=e[14],p=e[15],S=f*m*c-g*d*c+g*l*h-a*m*h-f*l*p+a*d*p,E=v*d*c-u*m*c-v*l*h+o*m*h+u*l*p-o*d*p,_=u*g*c-v*f*c+v*a*h-o*g*h-u*a*p+o*f*p,M=v*f*l-u*g*l-v*a*d+o*g*d+u*a*m-o*f*m,x=t*S+i*E+s*_+r*M;if(x===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const w=1/x;return e[0]=S*w,e[1]=(g*d*r-f*m*r-g*s*h+i*m*h+f*s*p-i*d*p)*w,e[2]=(a*m*r-g*l*r+g*s*c-i*m*c-a*s*p+i*l*p)*w,e[3]=(f*l*r-a*d*r-f*s*c+i*d*c+a*s*h-i*l*h)*w,e[4]=E*w,e[5]=(u*m*r-v*d*r+v*s*h-t*m*h-u*s*p+t*d*p)*w,e[6]=(v*l*r-o*m*r-v*s*c+t*m*c+o*s*p-t*l*p)*w,e[7]=(o*d*r-u*l*r+u*s*c-t*d*c-o*s*h+t*l*h)*w,e[8]=_*w,e[9]=(v*f*r-u*g*r-v*i*h+t*g*h+u*i*p-t*f*p)*w,e[10]=(o*g*r-v*a*r+v*i*c-t*g*c-o*i*p+t*a*p)*w,e[11]=(u*a*r-o*f*r-u*i*c+t*f*c+o*i*h-t*a*h)*w,e[12]=M*w,e[13]=(u*g*s-v*f*s+v*i*d-t*g*d-u*i*m+t*f*m)*w,e[14]=(v*a*s-o*g*s-v*i*l+t*g*l+o*i*m-t*a*m)*w,e[15]=(o*f*s-u*a*s+u*i*l-t*f*l-o*i*d+t*a*d)*w,this}scale(e){const t=this.elements,i=e.x,s=e.y,r=e.z;return t[0]*=i,t[4]*=s,t[8]*=r,t[1]*=i,t[5]*=s,t[9]*=r,t[2]*=i,t[6]*=s,t[10]*=r,t[3]*=i,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,s))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),s=Math.sin(t),r=1-i,o=e.x,a=e.y,l=e.z,c=r*o,u=r*a;return this.set(c*o+i,c*a-s*l,c*l+s*a,0,c*a+s*l,u*a+i,u*l-s*o,0,c*l-s*a,u*l+s*o,r*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,s,r,o){return this.set(1,i,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,i){const s=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,u=o+o,f=a+a,d=r*c,h=r*u,v=r*f,g=o*u,m=o*f,p=a*f,S=l*c,E=l*u,_=l*f,M=i.x,x=i.y,w=i.z;return s[0]=(1-(g+p))*M,s[1]=(h+_)*M,s[2]=(v-E)*M,s[3]=0,s[4]=(h-_)*x,s[5]=(1-(d+p))*x,s[6]=(m+S)*x,s[7]=0,s[8]=(v+E)*w,s[9]=(m-S)*w,s[10]=(1-(d+g))*w,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,i){const s=this.elements;let r=ps.set(s[0],s[1],s[2]).length();const o=ps.set(s[4],s[5],s[6]).length(),a=ps.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],Mn.copy(this);const c=1/r,u=1/o,f=1/a;return Mn.elements[0]*=c,Mn.elements[1]*=c,Mn.elements[2]*=c,Mn.elements[4]*=u,Mn.elements[5]*=u,Mn.elements[6]*=u,Mn.elements[8]*=f,Mn.elements[9]*=f,Mn.elements[10]*=f,t.setFromRotationMatrix(Mn),i.x=r,i.y=o,i.z=a,this}makePerspective(e,t,i,s,r,o,a=Xn,l=!1){const c=this.elements,u=2*r/(t-e),f=2*r/(i-s),d=(t+e)/(t-e),h=(i+s)/(i-s);let v,g;if(l)v=r/(o-r),g=o*r/(o-r);else if(a===Xn)v=-(o+r)/(o-r),g=-2*o*r/(o-r);else if(a===Jo)v=-o/(o-r),g=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=f,c[9]=h,c[13]=0,c[2]=0,c[6]=0,c[10]=v,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,s,r,o,a=Xn,l=!1){const c=this.elements,u=2/(t-e),f=2/(i-s),d=-(t+e)/(t-e),h=-(i+s)/(i-s);let v,g;if(l)v=1/(o-r),g=o/(o-r);else if(a===Xn)v=-2/(o-r),g=-(o+r)/(o-r);else if(a===Jo)v=-1/(o-r),g=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=f,c[9]=0,c[13]=h,c[2]=0,c[6]=0,c[10]=v,c[14]=g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let s=0;s<16;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const ps=new k,Mn=new it,Cm=new k(0,0,0),Rm=new k(1,1,1),bi=new k,Qr=new k,nn=new k,wu=new it,Tu=new Ks;class Kn{constructor(e=0,t=0,i=0,s=Kn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,s=this._order){return this._x=e,this._y=t,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const s=e.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],u=s[9],f=s[2],d=s[6],h=s[10];switch(t){case"XYZ":this._y=Math.asin(Ke(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,h),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ke(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,h),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ke(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-f,h),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ke(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(d,h),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Ke(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(a,h));break;case"XZY":this._z=Math.asin(-Ke(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-u,h),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return wu.makeRotationFromQuaternion(e),this.setFromRotationMatrix(wu,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Tu.setFromEuler(this),this.setFromQuaternion(Tu,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Kn.DEFAULT_ORDER="XYZ";class Gc{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Pm=0;const Au=new k,ms=new Ks,ei=new it,eo=new k,nr=new k,Im=new k,Lm=new Ks,Cu=new k(1,0,0),Ru=new k(0,1,0),Pu=new k(0,0,1),Iu={type:"added"},Dm={type:"removed"},gs={type:"childadded",child:null},Ha={type:"childremoved",child:null};class Tt extends Ys{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Pm++}),this.uuid=pi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Tt.DEFAULT_UP.clone();const e=new k,t=new Kn,i=new Ks,s=new k(1,1,1);function r(){i.setFromEuler(t,!1)}function o(){t.setFromQuaternion(i,void 0,!1)}t._onChange(r),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new it},normalMatrix:{value:new We}}),this.matrix=new it,this.matrixWorld=new it,this.matrixAutoUpdate=Tt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Tt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Gc,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ms.setFromAxisAngle(e,t),this.quaternion.multiply(ms),this}rotateOnWorldAxis(e,t){return ms.setFromAxisAngle(e,t),this.quaternion.premultiply(ms),this}rotateX(e){return this.rotateOnAxis(Cu,e)}rotateY(e){return this.rotateOnAxis(Ru,e)}rotateZ(e){return this.rotateOnAxis(Pu,e)}translateOnAxis(e,t){return Au.copy(e).applyQuaternion(this.quaternion),this.position.add(Au.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Cu,e)}translateY(e){return this.translateOnAxis(Ru,e)}translateZ(e){return this.translateOnAxis(Pu,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ei.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?eo.copy(e):eo.set(e,t,i);const s=this.parent;this.updateWorldMatrix(!0,!1),nr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ei.lookAt(nr,eo,this.up):ei.lookAt(eo,nr,this.up),this.quaternion.setFromRotationMatrix(ei),s&&(ei.extractRotation(s.matrixWorld),ms.setFromRotationMatrix(ei),this.quaternion.premultiply(ms.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Iu),gs.child=e,this.dispatchEvent(gs),gs.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Dm),Ha.child=e,this.dispatchEvent(Ha),Ha.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ei.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ei.multiply(e.parent.matrixWorld)),e.applyMatrix4(ei),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Iu),gs.child=e,this.dispatchEvent(gs),gs.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,s=this.children.length;i<s;i++){const o=this.children[i].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(nr,e,Im),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(nr,Lm,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const f=l[c];r(e.shapes,f)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];s.animations.push(r(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),u=o(e.images),f=o(e.shapes),d=o(e.skeletons),h=o(e.animations),v=o(e.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),u.length>0&&(i.images=u),f.length>0&&(i.shapes=f),d.length>0&&(i.skeletons=d),h.length>0&&(i.animations=h),v.length>0&&(i.nodes=v)}return i.object=s,i;function o(a){const l=[];for(const c in a){const u=a[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const s=e.children[i];this.add(s.clone())}return this}}Tt.DEFAULT_UP=new k(0,1,0);Tt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Tt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Sn=new k,ti=new k,za=new k,ni=new k,vs=new k,_s=new k,Lu=new k,Va=new k,Ga=new k,Wa=new k,Xa=new ot,qa=new ot,$a=new ot;class vn{constructor(e=new k,t=new k,i=new k){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,s){s.subVectors(i,t),Sn.subVectors(e,t),s.cross(Sn);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,i,s,r){Sn.subVectors(s,t),ti.subVectors(i,t),za.subVectors(e,t);const o=Sn.dot(Sn),a=Sn.dot(ti),l=Sn.dot(za),c=ti.dot(ti),u=ti.dot(za),f=o*c-a*a;if(f===0)return r.set(0,0,0),null;const d=1/f,h=(c*l-a*u)*d,v=(o*u-a*l)*d;return r.set(1-h-v,v,h)}static containsPoint(e,t,i,s){return this.getBarycoord(e,t,i,s,ni)===null?!1:ni.x>=0&&ni.y>=0&&ni.x+ni.y<=1}static getInterpolation(e,t,i,s,r,o,a,l){return this.getBarycoord(e,t,i,s,ni)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,ni.x),l.addScaledVector(o,ni.y),l.addScaledVector(a,ni.z),l)}static getInterpolatedAttribute(e,t,i,s,r,o){return Xa.setScalar(0),qa.setScalar(0),$a.setScalar(0),Xa.fromBufferAttribute(e,t),qa.fromBufferAttribute(e,i),$a.fromBufferAttribute(e,s),o.setScalar(0),o.addScaledVector(Xa,r.x),o.addScaledVector(qa,r.y),o.addScaledVector($a,r.z),o}static isFrontFacing(e,t,i,s){return Sn.subVectors(i,t),ti.subVectors(e,t),Sn.cross(ti).dot(s)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,s){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,i,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Sn.subVectors(this.c,this.b),ti.subVectors(this.a,this.b),Sn.cross(ti).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return vn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return vn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,s,r){return vn.getInterpolation(e,this.a,this.b,this.c,t,i,s,r)}containsPoint(e){return vn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return vn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,s=this.b,r=this.c;let o,a;vs.subVectors(s,i),_s.subVectors(r,i),Va.subVectors(e,i);const l=vs.dot(Va),c=_s.dot(Va);if(l<=0&&c<=0)return t.copy(i);Ga.subVectors(e,s);const u=vs.dot(Ga),f=_s.dot(Ga);if(u>=0&&f<=u)return t.copy(s);const d=l*f-u*c;if(d<=0&&l>=0&&u<=0)return o=l/(l-u),t.copy(i).addScaledVector(vs,o);Wa.subVectors(e,r);const h=vs.dot(Wa),v=_s.dot(Wa);if(v>=0&&h<=v)return t.copy(r);const g=h*c-l*v;if(g<=0&&c>=0&&v<=0)return a=c/(c-v),t.copy(i).addScaledVector(_s,a);const m=u*v-h*f;if(m<=0&&f-u>=0&&h-v>=0)return Lu.subVectors(r,s),a=(f-u)/(f-u+(h-v)),t.copy(s).addScaledVector(Lu,a);const p=1/(m+g+d);return o=g*p,a=d*p,t.copy(i).addScaledVector(vs,o).addScaledVector(_s,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Ud={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Mi={h:0,s:0,l:0},to={h:0,s:0,l:0};function ja(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class Se{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=fn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,et.colorSpaceToWorking(this,t),this}setRGB(e,t,i,s=et.workingColorSpace){return this.r=e,this.g=t,this.b=i,et.colorSpaceToWorking(this,s),this}setHSL(e,t,i,s=et.workingColorSpace){if(e=zc(e,1),t=Ke(t,0,1),i=Ke(i,0,1),t===0)this.r=this.g=this.b=i;else{const r=i<=.5?i*(1+t):i+t-i*t,o=2*i-r;this.r=ja(o,r,e+1/3),this.g=ja(o,r,e),this.b=ja(o,r,e-1/3)}return et.colorSpaceToWorking(this,s),this}setStyle(e,t=fn){function i(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=fn){const i=Ud[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=mi(e.r),this.g=mi(e.g),this.b=mi(e.b),this}copyLinearToSRGB(e){return this.r=Fs(e.r),this.g=Fs(e.g),this.b=Fs(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=fn){return et.workingToColorSpace(zt.copy(this),e),Math.round(Ke(zt.r*255,0,255))*65536+Math.round(Ke(zt.g*255,0,255))*256+Math.round(Ke(zt.b*255,0,255))}getHexString(e=fn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=et.workingColorSpace){et.workingToColorSpace(zt.copy(this),t);const i=zt.r,s=zt.g,r=zt.b,o=Math.max(i,s,r),a=Math.min(i,s,r);let l,c;const u=(a+o)/2;if(a===o)l=0,c=0;else{const f=o-a;switch(c=u<=.5?f/(o+a):f/(2-o-a),o){case i:l=(s-r)/f+(s<r?6:0);break;case s:l=(r-i)/f+2;break;case r:l=(i-s)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=et.workingColorSpace){return et.workingToColorSpace(zt.copy(this),t),e.r=zt.r,e.g=zt.g,e.b=zt.b,e}getStyle(e=fn){et.workingToColorSpace(zt.copy(this),e);const t=zt.r,i=zt.g,s=zt.b;return e!==fn?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(e,t,i){return this.getHSL(Mi),this.setHSL(Mi.h+e,Mi.s+t,Mi.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(Mi),e.getHSL(to);const i=_r(Mi.h,to.h,t),s=_r(Mi.s,to.s,t),r=_r(Mi.l,to.l,t);return this.setHSL(i,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*i+r[6]*s,this.g=r[1]*t+r[4]*i+r[7]*s,this.b=r[2]*t+r[5]*i+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const zt=new Se;Se.NAMES=Ud;let Nm=0;class Oi extends Ys{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Nm++}),this.uuid=pi(),this.name="",this.type="Material",this.blending=Os,this.side=Ii,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Al,this.blendDst=Cl,this.blendEquation=Yi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Se(0,0,0),this.blendAlpha=0,this.depthFunc=Hs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=_u,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=cs,this.stencilZFail=cs,this.stencilZPass=cs,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Os&&(i.blending=this.blending),this.side!==Ii&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Al&&(i.blendSrc=this.blendSrc),this.blendDst!==Cl&&(i.blendDst=this.blendDst),this.blendEquation!==Yi&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Hs&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==_u&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==cs&&(i.stencilFail=this.stencilFail),this.stencilZFail!==cs&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==cs&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(t){const r=s(e.textures),o=s(e.images);r.length>0&&(i.textures=r),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const s=t.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=t[r].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Fi extends Oi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Se(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kn,this.combine=bd,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Ct=new k,no=new Ee;let Um=0;class bt{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Um++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=fc,this.updateRanges=[],this.gpuType=Wn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[i+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)no.fromBufferAttribute(this,t),no.applyMatrix3(e),this.setXY(t,no.x,no.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix3(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix4(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.applyNormalMatrix(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.transformDirection(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=wn(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=rt(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=wn(t,this.array)),t}setX(e,t){return this.normalized&&(t=rt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=wn(t,this.array)),t}setY(e,t){return this.normalized&&(t=rt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=wn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=rt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=wn(t,this.array)),t}setW(e,t){return this.normalized&&(t=rt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=rt(t,this.array),i=rt(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,s){return e*=this.itemSize,this.normalized&&(t=rt(t,this.array),i=rt(i,this.array),s=rt(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this}setXYZW(e,t,i,s,r){return e*=this.itemSize,this.normalized&&(t=rt(t,this.array),i=rt(i,this.array),s=rt(s,this.array),r=rt(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==fc&&(e.usage=this.usage),e}}class Od extends bt{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class Fd extends bt{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class Je extends bt{constructor(e,t,i){super(new Float32Array(e),t,i)}}let Om=0;const hn=new it,Ya=new Tt,ys=new k,sn=new os,ir=new os,Ot=new k;class ft extends Ys{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Om++}),this.uuid=pi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Dd(e)?Fd:Od)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const r=new We().getNormalMatrix(e);i.applyNormalMatrix(r),i.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return hn.makeRotationFromQuaternion(e),this.applyMatrix4(hn),this}rotateX(e){return hn.makeRotationX(e),this.applyMatrix4(hn),this}rotateY(e){return hn.makeRotationY(e),this.applyMatrix4(hn),this}rotateZ(e){return hn.makeRotationZ(e),this.applyMatrix4(hn),this}translate(e,t,i){return hn.makeTranslation(e,t,i),this.applyMatrix4(hn),this}scale(e,t,i){return hn.makeScale(e,t,i),this.applyMatrix4(hn),this}lookAt(e){return Ya.lookAt(e),Ya.updateMatrix(),this.applyMatrix4(Ya.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ys).negate(),this.translate(ys.x,ys.y,ys.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let s=0,r=e.length;s<r;s++){const o=e[s];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Je(i,3))}else{const i=Math.min(e.length,t.count);for(let s=0;s<i;s++){const r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new os);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new k(-1/0,-1/0,-1/0),new k(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,s=t.length;i<s;i++){const r=t[i];sn.setFromBufferAttribute(r),this.morphTargetsRelative?(Ot.addVectors(this.boundingBox.min,sn.min),this.boundingBox.expandByPoint(Ot),Ot.addVectors(this.boundingBox.max,sn.max),this.boundingBox.expandByPoint(Ot)):(this.boundingBox.expandByPoint(sn.min),this.boundingBox.expandByPoint(sn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ui);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new k,1/0);return}if(e){const i=this.boundingSphere.center;if(sn.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){const a=t[r];ir.setFromBufferAttribute(a),this.morphTargetsRelative?(Ot.addVectors(sn.min,ir.min),sn.expandByPoint(Ot),Ot.addVectors(sn.max,ir.max),sn.expandByPoint(Ot)):(sn.expandByPoint(ir.min),sn.expandByPoint(ir.max))}sn.getCenter(i);let s=0;for(let r=0,o=e.count;r<o;r++)Ot.fromBufferAttribute(e,r),s=Math.max(s,i.distanceToSquared(Ot));if(t)for(let r=0,o=t.length;r<o;r++){const a=t[r],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)Ot.fromBufferAttribute(a,c),l&&(ys.fromBufferAttribute(e,c),Ot.add(ys)),s=Math.max(s,i.distanceToSquared(Ot))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new bt(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let R=0;R<i.count;R++)a[R]=new k,l[R]=new k;const c=new k,u=new k,f=new k,d=new Ee,h=new Ee,v=new Ee,g=new k,m=new k;function p(R,y,b){c.fromBufferAttribute(i,R),u.fromBufferAttribute(i,y),f.fromBufferAttribute(i,b),d.fromBufferAttribute(r,R),h.fromBufferAttribute(r,y),v.fromBufferAttribute(r,b),u.sub(c),f.sub(c),h.sub(d),v.sub(d);const P=1/(h.x*v.y-v.x*h.y);isFinite(P)&&(g.copy(u).multiplyScalar(v.y).addScaledVector(f,-h.y).multiplyScalar(P),m.copy(f).multiplyScalar(h.x).addScaledVector(u,-v.x).multiplyScalar(P),a[R].add(g),a[y].add(g),a[b].add(g),l[R].add(m),l[y].add(m),l[b].add(m))}let S=this.groups;S.length===0&&(S=[{start:0,count:e.count}]);for(let R=0,y=S.length;R<y;++R){const b=S[R],P=b.start,N=b.count;for(let U=P,I=P+N;U<I;U+=3)p(e.getX(U+0),e.getX(U+1),e.getX(U+2))}const E=new k,_=new k,M=new k,x=new k;function w(R){M.fromBufferAttribute(s,R),x.copy(M);const y=a[R];E.copy(y),E.sub(M.multiplyScalar(M.dot(y))).normalize(),_.crossVectors(x,y);const P=_.dot(l[R])<0?-1:1;o.setXYZW(R,E.x,E.y,E.z,P)}for(let R=0,y=S.length;R<y;++R){const b=S[R],P=b.start,N=b.count;for(let U=P,I=P+N;U<I;U+=3)w(e.getX(U+0)),w(e.getX(U+1)),w(e.getX(U+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new bt(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let d=0,h=i.count;d<h;d++)i.setXYZ(d,0,0,0);const s=new k,r=new k,o=new k,a=new k,l=new k,c=new k,u=new k,f=new k;if(e)for(let d=0,h=e.count;d<h;d+=3){const v=e.getX(d+0),g=e.getX(d+1),m=e.getX(d+2);s.fromBufferAttribute(t,v),r.fromBufferAttribute(t,g),o.fromBufferAttribute(t,m),u.subVectors(o,r),f.subVectors(s,r),u.cross(f),a.fromBufferAttribute(i,v),l.fromBufferAttribute(i,g),c.fromBufferAttribute(i,m),a.add(u),l.add(u),c.add(u),i.setXYZ(v,a.x,a.y,a.z),i.setXYZ(g,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,h=t.count;d<h;d+=3)s.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),u.subVectors(o,r),f.subVectors(s,r),u.cross(f),i.setXYZ(d+0,u.x,u.y,u.z),i.setXYZ(d+1,u.x,u.y,u.z),i.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)Ot.fromBufferAttribute(e,t),Ot.normalize(),e.setXYZ(t,Ot.x,Ot.y,Ot.z)}toNonIndexed(){function e(a,l){const c=a.array,u=a.itemSize,f=a.normalized,d=new c.constructor(l.length*u);let h=0,v=0;for(let g=0,m=l.length;g<m;g++){a.isInterleavedBufferAttribute?h=l[g]*a.data.stride+a.offset:h=l[g]*u;for(let p=0;p<u;p++)d[v++]=c[h++]}return new bt(d,u,f)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new ft,i=this.index.array,s=this.attributes;for(const a in s){const l=s[a],c=e(l,i);t.setAttribute(a,c)}const r=this.morphAttributes;for(const a in r){const l=[],c=r[a];for(let u=0,f=c.length;u<f;u++){const d=c[u],h=e(d,i);l.push(h)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let f=0,d=c.length;f<d;f++){const h=c[f];u.push(h.toJSON(e.data))}u.length>0&&(s[l]=u,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const s=e.attributes;for(const c in s){const u=s[c];this.setAttribute(c,u.clone(t))}const r=e.morphAttributes;for(const c in r){const u=[],f=r[c];for(let d=0,h=f.length;d<h;d++)u.push(f[d].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,u=o.length;c<u;c++){const f=o[c];this.addGroup(f.start,f.count,f.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Du=new it,Vi=new pa,io=new Ui,Nu=new k,so=new k,ro=new k,oo=new k,Ka=new k,ao=new k,Uu=new k,lo=new k;class ae extends Tt{constructor(e=new ft,t=new Fi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){const i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,o=i.morphTargetsRelative;t.fromBufferAttribute(s,e);const a=this.morphTargetInfluences;if(r&&a){ao.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const u=a[l],f=r[l];u!==0&&(Ka.fromBufferAttribute(f,e),o?ao.addScaledVector(Ka,u):ao.addScaledVector(Ka.sub(t),u))}t.add(ao)}return t}raycast(e,t){const i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),io.copy(i.boundingSphere),io.applyMatrix4(r),Vi.copy(e.ray).recast(e.near),!(io.containsPoint(Vi.origin)===!1&&(Vi.intersectSphere(io,Nu)===null||Vi.origin.distanceToSquared(Nu)>(e.far-e.near)**2))&&(Du.copy(r).invert(),Vi.copy(e.ray).applyMatrix4(Du),!(i.boundingBox!==null&&Vi.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Vi)))}_computeIntersections(e,t,i){let s;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,u=r.attributes.uv1,f=r.attributes.normal,d=r.groups,h=r.drawRange;if(a!==null)if(Array.isArray(o))for(let v=0,g=d.length;v<g;v++){const m=d[v],p=o[m.materialIndex],S=Math.max(m.start,h.start),E=Math.min(a.count,Math.min(m.start+m.count,h.start+h.count));for(let _=S,M=E;_<M;_+=3){const x=a.getX(_),w=a.getX(_+1),R=a.getX(_+2);s=co(this,p,e,i,c,u,f,x,w,R),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const v=Math.max(0,h.start),g=Math.min(a.count,h.start+h.count);for(let m=v,p=g;m<p;m+=3){const S=a.getX(m),E=a.getX(m+1),_=a.getX(m+2);s=co(this,o,e,i,c,u,f,S,E,_),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let v=0,g=d.length;v<g;v++){const m=d[v],p=o[m.materialIndex],S=Math.max(m.start,h.start),E=Math.min(l.count,Math.min(m.start+m.count,h.start+h.count));for(let _=S,M=E;_<M;_+=3){const x=_,w=_+1,R=_+2;s=co(this,p,e,i,c,u,f,x,w,R),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const v=Math.max(0,h.start),g=Math.min(l.count,h.start+h.count);for(let m=v,p=g;m<p;m+=3){const S=m,E=m+1,_=m+2;s=co(this,o,e,i,c,u,f,S,E,_),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}}function Fm(n,e,t,i,s,r,o,a){let l;if(e.side===Zt?l=i.intersectTriangle(o,r,s,!0,a):l=i.intersectTriangle(s,r,o,e.side===Ii,a),l===null)return null;lo.copy(a),lo.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(lo);return c<t.near||c>t.far?null:{distance:c,point:lo.clone(),object:n}}function co(n,e,t,i,s,r,o,a,l,c){n.getVertexPosition(a,so),n.getVertexPosition(l,ro),n.getVertexPosition(c,oo);const u=Fm(n,e,t,i,so,ro,oo,Uu);if(u){const f=new k;vn.getBarycoord(Uu,so,ro,oo,f),s&&(u.uv=vn.getInterpolatedAttribute(s,a,l,c,f,new Ee)),r&&(u.uv1=vn.getInterpolatedAttribute(r,a,l,c,f,new Ee)),o&&(u.normal=vn.getInterpolatedAttribute(o,a,l,c,f,new k),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new k,materialIndex:0};vn.getNormal(so,ro,oo,d.normal),u.face=d,u.barycoord=f}return u}class Wt extends ft{constructor(e=1,t=1,i=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const l=[],c=[],u=[],f=[];let d=0,h=0;v("z","y","x",-1,-1,i,t,e,o,r,0),v("z","y","x",1,-1,i,t,-e,o,r,1),v("x","z","y",1,1,e,i,t,s,o,2),v("x","z","y",1,-1,e,i,-t,s,o,3),v("x","y","z",1,-1,e,t,i,s,r,4),v("x","y","z",-1,-1,e,t,-i,s,r,5),this.setIndex(l),this.setAttribute("position",new Je(c,3)),this.setAttribute("normal",new Je(u,3)),this.setAttribute("uv",new Je(f,2));function v(g,m,p,S,E,_,M,x,w,R,y){const b=_/w,P=M/R,N=_/2,U=M/2,I=x/2,F=w+1,B=R+1;let L=0,A=0;const H=new k;for(let V=0;V<B;V++){const Z=V*P-U;for(let le=0;le<F;le++){const ve=le*b-N;H[g]=ve*S,H[m]=Z*E,H[p]=I,c.push(H.x,H.y,H.z),H[g]=0,H[m]=0,H[p]=x>0?1:-1,u.push(H.x,H.y,H.z),f.push(le/w),f.push(1-V/R),L+=1}}for(let V=0;V<R;V++)for(let Z=0;Z<w;Z++){const le=d+Z+F*V,ve=d+Z+F*(V+1),Oe=d+(Z+1)+F*(V+1),K=d+(Z+1)+F*V;l.push(le,ve,K),l.push(ve,Oe,K),A+=6}a.addGroup(h,A,y),h+=A,d+=L}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Wt(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Ws(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const s=n[t][i];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=s.clone():Array.isArray(s)?e[t][i]=s.slice():e[t][i]=s}}return e}function $t(n){const e={};for(let t=0;t<n.length;t++){const i=Ws(n[t]);for(const s in i)e[s]=i[s]}return e}function km(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function kd(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:et.workingColorSpace}const ea={clone:Ws,merge:$t};var Bm=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Hm=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Lt extends Oi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Bm,this.fragmentShader=Hm,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ws(e.uniforms),this.uniformsGroups=km(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class Bd extends Tt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new it,this.projectionMatrix=new it,this.projectionMatrixInverse=new it,this.coordinateSystem=Xn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Si=new k,Ou=new Ee,Fu=new Ee;class on extends Bd{constructor(e=50,t=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Ar*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(vr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Ar*2*Math.atan(Math.tan(vr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){Si.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Si.x,Si.y).multiplyScalar(-e/Si.z),Si.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Si.x,Si.y).multiplyScalar(-e/Si.z)}getViewSize(e,t){return this.getViewBounds(e,Ou,Fu),t.subVectors(Fu,Ou)}setViewOffset(e,t,i,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(vr*.5*this.fov)/this.zoom,i=2*t,s=this.aspect*i,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,t-=o.offsetY*i/c,s*=o.width/l,i*=o.height/c}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const xs=-90,bs=1;class zm extends Tt{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new on(xs,bs,e,t);s.layers=this.layers,this.add(s);const r=new on(xs,bs,e,t);r.layers=this.layers,this.add(r);const o=new on(xs,bs,e,t);o.layers=this.layers,this.add(o);const a=new on(xs,bs,e,t);a.layers=this.layers,this.add(a);const l=new on(xs,bs,e,t);l.layers=this.layers,this.add(l);const c=new on(xs,bs,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,s,r,o,a,l]=t;for(const c of t)this.remove(c);if(e===Xn)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Jo)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,c,u]=this.children,f=e.getRenderTarget(),d=e.getActiveCubeFace(),h=e.getActiveMipmapLevel(),v=e.xr.enabled;e.xr.enabled=!1;const g=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,s),e.render(t,r),e.setRenderTarget(i,1,s),e.render(t,o),e.setRenderTarget(i,2,s),e.render(t,a),e.setRenderTarget(i,3,s),e.render(t,l),e.setRenderTarget(i,4,s),e.render(t,c),i.texture.generateMipmaps=g,e.setRenderTarget(i,5,s),e.render(t,u),e.setRenderTarget(f,d,h),e.xr.enabled=v,i.texture.needsPMREMUpdate=!0}}class Hd extends Gt{constructor(e=[],t=zs,i,s,r,o,a,l,c,u){super(e,t,i,s,r,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Vm extends Cn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},s=[i,i,i,i,i,i];this.texture=new Hd(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Wt(5,5,5),r=new Lt({name:"CubemapFromEquirect",uniforms:Ws(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Zt,blending:di});r.uniforms.tEquirect.value=t;const o=new ae(s,r),a=t.minFilter;return t.minFilter===es&&(t.minFilter=Tn),new zm(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,i=!0,s=!0){const r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,i,s);e.setRenderTarget(r)}}class nt extends Tt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Gm={type:"move"};class Za{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new nt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new nt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new k,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new k),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new nt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new k,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new k),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let s=null,r=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const g of e.hand.values()){const m=t.getJointPose(g,i),p=this._getHandJoint(c,g);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const u=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],d=u.position.distanceTo(f.position),h=.02,v=.005;c.inputState.pinching&&d>h+v?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=h-v&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,i),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(s=t.getPose(e.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Gm)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new nt;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}class Wc{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new Se(e),this.density=t}clone(){return new Wc(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class Wm extends Tt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Kn,this.environmentIntensity=1,this.environmentRotation=new Kn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Xm{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=fc,this.updateRanges=[],this.version=0,this.uuid=pi()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,i){e*=this.stride,i*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[i+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=pi()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(t,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=pi()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const qt=new k;class ta{constructor(e,t,i,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=i,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,i=this.data.count;t<i;t++)qt.fromBufferAttribute(this,t),qt.applyMatrix4(e),this.setXYZ(t,qt.x,qt.y,qt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)qt.fromBufferAttribute(this,t),qt.applyNormalMatrix(e),this.setXYZ(t,qt.x,qt.y,qt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)qt.fromBufferAttribute(this,t),qt.transformDirection(e),this.setXYZ(t,qt.x,qt.y,qt.z);return this}getComponent(e,t){let i=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(i=wn(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=rt(i,this.array)),this.data.array[e*this.data.stride+this.offset+t]=i,this}setX(e,t){return this.normalized&&(t=rt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=rt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=rt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=rt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=wn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=wn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=wn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=wn(t,this.array)),t}setXY(e,t,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=rt(t,this.array),i=rt(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this}setXYZ(e,t,i,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=rt(t,this.array),i=rt(i,this.array),s=rt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this}setXYZW(e,t,i,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=rt(t,this.array),i=rt(i,this.array),s=rt(s,this.array),r=rt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new bt(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new ta(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}class zd extends Oi{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Se(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let Ms;const sr=new k,Ss=new k,Es=new k,ws=new Ee,rr=new Ee,Vd=new it,uo=new k,or=new k,ho=new k,ku=new Ee,Ja=new Ee,Bu=new Ee;class qm extends Tt{constructor(e=new zd){if(super(),this.isSprite=!0,this.type="Sprite",Ms===void 0){Ms=new ft;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new Xm(t,5);Ms.setIndex([0,1,2,0,2,3]),Ms.setAttribute("position",new ta(i,3,0,!1)),Ms.setAttribute("uv",new ta(i,2,3,!1))}this.geometry=Ms,this.material=e,this.center=new Ee(.5,.5),this.count=1}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),Ss.setFromMatrixScale(this.matrixWorld),Vd.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),Es.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Ss.multiplyScalar(-Es.z);const i=this.material.rotation;let s,r;i!==0&&(r=Math.cos(i),s=Math.sin(i));const o=this.center;fo(uo.set(-.5,-.5,0),Es,o,Ss,s,r),fo(or.set(.5,-.5,0),Es,o,Ss,s,r),fo(ho.set(.5,.5,0),Es,o,Ss,s,r),ku.set(0,0),Ja.set(1,0),Bu.set(1,1);let a=e.ray.intersectTriangle(uo,or,ho,!1,sr);if(a===null&&(fo(or.set(-.5,.5,0),Es,o,Ss,s,r),Ja.set(0,1),a=e.ray.intersectTriangle(uo,ho,or,!1,sr),a===null))return;const l=e.ray.origin.distanceTo(sr);l<e.near||l>e.far||t.push({distance:l,point:sr.clone(),uv:vn.getInterpolation(sr,uo,or,ho,ku,Ja,Bu,new Ee),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function fo(n,e,t,i,s,r){ws.subVectors(n,t).addScalar(.5).multiply(i),s!==void 0?(rr.x=r*ws.x-s*ws.y,rr.y=s*ws.x+r*ws.y):rr.copy(ws),n.copy(e),n.x+=rr.x,n.y+=rr.y,n.applyMatrix4(Vd)}class Gd extends Gt{constructor(e=null,t=1,i=1,s,r,o,a,l,c=an,u=an,f,d){super(null,o,a,l,c,u,s,r,f,d),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class na extends bt{constructor(e,t,i,s=1){super(e,t,i),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const Ts=new it,Hu=new it,po=[],zu=new os,$m=new it,ar=new ae,lr=new Ui;class Li extends ae{constructor(e,t,i){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new na(new Float32Array(i*16),16),this.instanceColor=null,this.morphTexture=null,this.count=i,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<i;s++)this.setMatrixAt(s,$m)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new os),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,Ts),zu.copy(e.boundingBox).applyMatrix4(Ts),this.boundingBox.union(zu)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Ui),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,Ts),lr.copy(e.boundingSphere).applyMatrix4(Ts),this.boundingSphere.union(lr)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const i=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=i.length+1,o=e*r+1;for(let a=0;a<i.length;a++)i[a]=s[o+a]}raycast(e,t){const i=this.matrixWorld,s=this.count;if(ar.geometry=this.geometry,ar.material=this.material,ar.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),lr.copy(this.boundingSphere),lr.applyMatrix4(i),e.ray.intersectsSphere(lr)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Ts),Hu.multiplyMatrices(i,Ts),ar.matrixWorld=Hu,ar.raycast(e,po);for(let o=0,a=po.length;o<a;o++){const l=po[o];l.instanceId=r,l.object=this,t.push(l)}po.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new na(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const i=t.morphTargetInfluences,s=i.length+1;this.morphTexture===null&&(this.morphTexture=new Gd(new Float32Array(s*this.count),s,this.count,Fc,Wn));const r=this.morphTexture.source.data.data;let o=0;for(let c=0;c<i.length;c++)o+=i[c];const a=this.geometry.morphTargetsRelative?1:1-o,l=s*e;r[l]=a,r.set(i,l+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const Qa=new k,jm=new k,Ym=new We;class wi{constructor(e=new k(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,s){return this.normal.set(e,t,i),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const s=Qa.subVectors(i,t).cross(jm.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(Qa),s=this.normal.dot(i);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(i,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||Ym.getNormalMatrix(e),s=this.coplanarPoint(Qa).applyMatrix4(e),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Gi=new Ui,Km=new Ee(.5,.5),mo=new k;class Xc{constructor(e=new wi,t=new wi,i=new wi,s=new wi,r=new wi,o=new wi){this.planes=[e,t,i,s,r,o]}set(e,t,i,s,r,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(i),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=Xn,i=!1){const s=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],u=r[4],f=r[5],d=r[6],h=r[7],v=r[8],g=r[9],m=r[10],p=r[11],S=r[12],E=r[13],_=r[14],M=r[15];if(s[0].setComponents(c-o,h-u,p-v,M-S).normalize(),s[1].setComponents(c+o,h+u,p+v,M+S).normalize(),s[2].setComponents(c+a,h+f,p+g,M+E).normalize(),s[3].setComponents(c-a,h-f,p-g,M-E).normalize(),i)s[4].setComponents(l,d,m,_).normalize(),s[5].setComponents(c-l,h-d,p-m,M-_).normalize();else if(s[4].setComponents(c-l,h-d,p-m,M-_).normalize(),t===Xn)s[5].setComponents(c+l,h+d,p+m,M+_).normalize();else if(t===Jo)s[5].setComponents(l,d,m,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Gi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Gi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Gi)}intersectsSprite(e){Gi.center.set(0,0,0);const t=Km.distanceTo(e.center);return Gi.radius=.7071067811865476+t,Gi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Gi)}intersectsSphere(e){const t=this.planes,i=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const s=t[i];if(mo.x=s.normal.x>0?e.max.x:e.min.x,mo.y=s.normal.y>0?e.max.y:e.min.y,mo.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(mo)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Zm extends Oi{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Se(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ia=new k,sa=new k,Vu=new it,cr=new pa,go=new Ui,el=new k,Gu=new k;class Jm extends Tt{constructor(e=new ft,t=new Zm){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[0];for(let s=1,r=t.count;s<r;s++)ia.fromBufferAttribute(t,s-1),sa.fromBufferAttribute(t,s),i[s]=i[s-1],i[s]+=ia.distanceTo(sa);e.setAttribute("lineDistance",new Je(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const i=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),go.copy(i.boundingSphere),go.applyMatrix4(s),go.radius+=r,e.ray.intersectsSphere(go)===!1)return;Vu.copy(s).invert(),cr.copy(e.ray).applyMatrix4(Vu);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,u=i.index,d=i.attributes.position;if(u!==null){const h=Math.max(0,o.start),v=Math.min(u.count,o.start+o.count);for(let g=h,m=v-1;g<m;g+=c){const p=u.getX(g),S=u.getX(g+1),E=vo(this,e,cr,l,p,S,g);E&&t.push(E)}if(this.isLineLoop){const g=u.getX(v-1),m=u.getX(h),p=vo(this,e,cr,l,g,m,v-1);p&&t.push(p)}}else{const h=Math.max(0,o.start),v=Math.min(d.count,o.start+o.count);for(let g=h,m=v-1;g<m;g+=c){const p=vo(this,e,cr,l,g,g+1,g);p&&t.push(p)}if(this.isLineLoop){const g=vo(this,e,cr,l,v-1,h,v-1);g&&t.push(g)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function vo(n,e,t,i,s,r,o){const a=n.geometry.attributes.position;if(ia.fromBufferAttribute(a,s),sa.fromBufferAttribute(a,r),t.distanceSqToSegment(ia,sa,el,Gu)>i)return;el.applyMatrix4(n.matrixWorld);const c=e.ray.origin.distanceTo(el);if(!(c<e.near||c>e.far))return{distance:c,point:Gu.clone().applyMatrix4(n.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:n}}const Wu=new k,Xu=new k;class Wd extends Jm{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[];for(let s=0,r=t.count;s<r;s+=2)Wu.fromBufferAttribute(t,s),Xu.fromBufferAttribute(t,s+1),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+Wu.distanceTo(Xu);e.setAttribute("lineDistance",new Je(i,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Br extends Oi{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Se(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const qu=new it,pc=new pa,_o=new Ui,yo=new k;class ma extends Tt{constructor(e=new ft,t=new Br){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const i=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),_o.copy(i.boundingSphere),_o.applyMatrix4(s),_o.radius+=r,e.ray.intersectsSphere(_o)===!1)return;qu.copy(s).invert(),pc.copy(e.ray).applyMatrix4(qu);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=i.index,f=i.attributes.position;if(c!==null){const d=Math.max(0,o.start),h=Math.min(c.count,o.start+o.count);for(let v=d,g=h;v<g;v++){const m=c.getX(v);yo.fromBufferAttribute(f,m),$u(yo,m,l,s,e,t,this)}}else{const d=Math.max(0,o.start),h=Math.min(f.count,o.start+o.count);for(let v=d,g=h;v<g;v++)yo.fromBufferAttribute(f,v),$u(yo,v,l,s,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function $u(n,e,t,i,s,r,o){const a=pc.distanceSqToPoint(n);if(a<t){const l=new k;pc.closestPointToPoint(n,l),l.applyMatrix4(i);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class Qm extends Gt{constructor(e,t,i,s,r,o,a,l,c){super(e,t,i,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Xd extends Gt{constructor(e,t,i=ss,s,r,o,a=an,l=an,c,u=wr,f=1){if(u!==wr&&u!==Tr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:f};super(d,s,r,o,a,l,u,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Vc(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class qd extends Gt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class $d extends ft{constructor(e=1,t=1,i=4,s=8,r=1){super(),this.type="CapsuleGeometry",this.parameters={radius:e,height:t,capSegments:i,radialSegments:s,heightSegments:r},t=Math.max(0,t),i=Math.max(1,Math.floor(i)),s=Math.max(3,Math.floor(s)),r=Math.max(1,Math.floor(r));const o=[],a=[],l=[],c=[],u=t/2,f=Math.PI/2*e,d=t,h=2*f+d,v=i*2+r,g=s+1,m=new k,p=new k;for(let S=0;S<=v;S++){let E=0,_=0,M=0,x=0;if(S<=i){const y=S/i,b=y*Math.PI/2;_=-u-e*Math.cos(b),M=e*Math.sin(b),x=-e*Math.cos(b),E=y*f}else if(S<=i+r){const y=(S-i)/r;_=-u+y*t,M=e,x=0,E=f+y*d}else{const y=(S-i-r)/i,b=y*Math.PI/2;_=u+e*Math.sin(b),M=e*Math.cos(b),x=e*Math.sin(b),E=f+d+y*f}const w=Math.max(0,Math.min(1,E/h));let R=0;S===0?R=.5/s:S===v&&(R=-.5/s);for(let y=0;y<=s;y++){const b=y/s,P=b*Math.PI*2,N=Math.sin(P),U=Math.cos(P);p.x=-M*U,p.y=_,p.z=M*N,a.push(p.x,p.y,p.z),m.set(-M*U,x,M*N),m.normalize(),l.push(m.x,m.y,m.z),c.push(b+R,w)}if(S>0){const y=(S-1)*g;for(let b=0;b<s;b++){const P=y+b,N=y+b+1,U=S*g+b,I=S*g+b+1;o.push(P,N,U),o.push(N,I,U)}}}this.setIndex(o),this.setAttribute("position",new Je(a,3)),this.setAttribute("normal",new Je(l,3)),this.setAttribute("uv",new Je(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new $d(e.radius,e.height,e.capSegments,e.radialSegments,e.heightSegments)}}class qc extends ft{constructor(e=1,t=32,i=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:i,thetaLength:s},t=Math.max(3,t);const r=[],o=[],a=[],l=[],c=new k,u=new Ee;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let f=0,d=3;f<=t;f++,d+=3){const h=i+f/t*s;c.x=e*Math.cos(h),c.y=e*Math.sin(h),o.push(c.x,c.y,c.z),a.push(0,0,1),u.x=(o[d]/e+1)/2,u.y=(o[d+1]/e+1)/2,l.push(u.x,u.y)}for(let f=1;f<=t;f++)r.push(f,f+1,0);this.setIndex(r),this.setAttribute("position",new Je(o,3)),this.setAttribute("normal",new Je(a,3)),this.setAttribute("uv",new Je(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new qc(e.radius,e.segments,e.thetaStart,e.thetaLength)}}class Rn extends ft{constructor(e=1,t=1,i=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};const c=this;s=Math.floor(s),r=Math.floor(r);const u=[],f=[],d=[],h=[];let v=0;const g=[],m=i/2;let p=0;S(),o===!1&&(e>0&&E(!0),t>0&&E(!1)),this.setIndex(u),this.setAttribute("position",new Je(f,3)),this.setAttribute("normal",new Je(d,3)),this.setAttribute("uv",new Je(h,2));function S(){const _=new k,M=new k;let x=0;const w=(t-e)/i;for(let R=0;R<=r;R++){const y=[],b=R/r,P=b*(t-e)+e;for(let N=0;N<=s;N++){const U=N/s,I=U*l+a,F=Math.sin(I),B=Math.cos(I);M.x=P*F,M.y=-b*i+m,M.z=P*B,f.push(M.x,M.y,M.z),_.set(F,w,B).normalize(),d.push(_.x,_.y,_.z),h.push(U,1-b),y.push(v++)}g.push(y)}for(let R=0;R<s;R++)for(let y=0;y<r;y++){const b=g[y][R],P=g[y+1][R],N=g[y+1][R+1],U=g[y][R+1];(e>0||y!==0)&&(u.push(b,P,U),x+=3),(t>0||y!==r-1)&&(u.push(P,N,U),x+=3)}c.addGroup(p,x,0),p+=x}function E(_){const M=v,x=new Ee,w=new k;let R=0;const y=_===!0?e:t,b=_===!0?1:-1;for(let N=1;N<=s;N++)f.push(0,m*b,0),d.push(0,b,0),h.push(.5,.5),v++;const P=v;for(let N=0;N<=s;N++){const I=N/s*l+a,F=Math.cos(I),B=Math.sin(I);w.x=y*B,w.y=m*b,w.z=y*F,f.push(w.x,w.y,w.z),d.push(0,b,0),x.x=F*.5+.5,x.y=B*.5*b+.5,h.push(x.x,x.y),v++}for(let N=0;N<s;N++){const U=M+N,I=P+N;_===!0?u.push(I,I+1,U):u.push(I+1,I,U),R+=3}c.addGroup(p,R,_===!0?1:2),p+=R}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Rn(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class $c extends ft{constructor(e=[],t=[],i=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:i,detail:s};const r=[],o=[];a(s),c(i),u(),this.setAttribute("position",new Je(r,3)),this.setAttribute("normal",new Je(r.slice(),3)),this.setAttribute("uv",new Je(o,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function a(S){const E=new k,_=new k,M=new k;for(let x=0;x<t.length;x+=3)h(t[x+0],E),h(t[x+1],_),h(t[x+2],M),l(E,_,M,S)}function l(S,E,_,M){const x=M+1,w=[];for(let R=0;R<=x;R++){w[R]=[];const y=S.clone().lerp(_,R/x),b=E.clone().lerp(_,R/x),P=x-R;for(let N=0;N<=P;N++)N===0&&R===x?w[R][N]=y:w[R][N]=y.clone().lerp(b,N/P)}for(let R=0;R<x;R++)for(let y=0;y<2*(x-R)-1;y++){const b=Math.floor(y/2);y%2===0?(d(w[R][b+1]),d(w[R+1][b]),d(w[R][b])):(d(w[R][b+1]),d(w[R+1][b+1]),d(w[R+1][b]))}}function c(S){const E=new k;for(let _=0;_<r.length;_+=3)E.x=r[_+0],E.y=r[_+1],E.z=r[_+2],E.normalize().multiplyScalar(S),r[_+0]=E.x,r[_+1]=E.y,r[_+2]=E.z}function u(){const S=new k;for(let E=0;E<r.length;E+=3){S.x=r[E+0],S.y=r[E+1],S.z=r[E+2];const _=m(S)/2/Math.PI+.5,M=p(S)/Math.PI+.5;o.push(_,1-M)}v(),f()}function f(){for(let S=0;S<o.length;S+=6){const E=o[S+0],_=o[S+2],M=o[S+4],x=Math.max(E,_,M),w=Math.min(E,_,M);x>.9&&w<.1&&(E<.2&&(o[S+0]+=1),_<.2&&(o[S+2]+=1),M<.2&&(o[S+4]+=1))}}function d(S){r.push(S.x,S.y,S.z)}function h(S,E){const _=S*3;E.x=e[_+0],E.y=e[_+1],E.z=e[_+2]}function v(){const S=new k,E=new k,_=new k,M=new k,x=new Ee,w=new Ee,R=new Ee;for(let y=0,b=0;y<r.length;y+=9,b+=6){S.set(r[y+0],r[y+1],r[y+2]),E.set(r[y+3],r[y+4],r[y+5]),_.set(r[y+6],r[y+7],r[y+8]),x.set(o[b+0],o[b+1]),w.set(o[b+2],o[b+3]),R.set(o[b+4],o[b+5]),M.copy(S).add(E).add(_).divideScalar(3);const P=m(M);g(x,b+0,S,P),g(w,b+2,E,P),g(R,b+4,_,P)}}function g(S,E,_,M){M<0&&S.x===1&&(o[E]=S.x-1),_.x===0&&_.z===0&&(o[E]=M/2/Math.PI+.5)}function m(S){return Math.atan2(S.z,-S.x)}function p(S){return Math.atan2(-S.y,Math.sqrt(S.x*S.x+S.z*S.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new $c(e.vertices,e.indices,e.radius,e.details)}}class ga extends $c{constructor(e=1,t=0){const i=(1+Math.sqrt(5))/2,s=[-1,i,0,1,i,0,-1,-i,0,1,-i,0,0,-1,i,0,1,i,0,-1,-i,0,1,-i,i,0,-1,i,0,1,-i,0,-1,-i,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(s,r,e,t),this.type="IcosahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new ga(e.radius,e.detail)}}class xn extends ft{constructor(e=1,t=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:s};const r=e/2,o=t/2,a=Math.floor(i),l=Math.floor(s),c=a+1,u=l+1,f=e/a,d=t/l,h=[],v=[],g=[],m=[];for(let p=0;p<u;p++){const S=p*d-o;for(let E=0;E<c;E++){const _=E*f-r;v.push(_,-S,0),g.push(0,0,1),m.push(E/a),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let S=0;S<a;S++){const E=S+c*p,_=S+c*(p+1),M=S+1+c*(p+1),x=S+1+c*p;h.push(E,_,x),h.push(_,M,x)}this.setIndex(h),this.setAttribute("position",new Je(v,3)),this.setAttribute("normal",new Je(g,3)),this.setAttribute("uv",new Je(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new xn(e.width,e.height,e.widthSegments,e.heightSegments)}}class Zs extends ft{constructor(e=.5,t=1,i=32,s=1,r=0,o=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:i,phiSegments:s,thetaStart:r,thetaLength:o},i=Math.max(3,i),s=Math.max(1,s);const a=[],l=[],c=[],u=[];let f=e;const d=(t-e)/s,h=new k,v=new Ee;for(let g=0;g<=s;g++){for(let m=0;m<=i;m++){const p=r+m/i*o;h.x=f*Math.cos(p),h.y=f*Math.sin(p),l.push(h.x,h.y,h.z),c.push(0,0,1),v.x=(h.x/t+1)/2,v.y=(h.y/t+1)/2,u.push(v.x,v.y)}f+=d}for(let g=0;g<s;g++){const m=g*(i+1);for(let p=0;p<i;p++){const S=p+m,E=S,_=S+i+1,M=S+i+2,x=S+1;a.push(E,_,x),a.push(_,M,x)}}this.setIndex(a),this.setAttribute("position",new Je(l,3)),this.setAttribute("normal",new Je(c,3)),this.setAttribute("uv",new Je(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Zs(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}}class va extends ft{constructor(e=1,t=32,i=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:i,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),i=Math.max(2,Math.floor(i));const l=Math.min(o+a,Math.PI);let c=0;const u=[],f=new k,d=new k,h=[],v=[],g=[],m=[];for(let p=0;p<=i;p++){const S=[],E=p/i;let _=0;p===0&&o===0?_=.5/t:p===i&&l===Math.PI&&(_=-.5/t);for(let M=0;M<=t;M++){const x=M/t;f.x=-e*Math.cos(s+x*r)*Math.sin(o+E*a),f.y=e*Math.cos(o+E*a),f.z=e*Math.sin(s+x*r)*Math.sin(o+E*a),v.push(f.x,f.y,f.z),d.copy(f).normalize(),g.push(d.x,d.y,d.z),m.push(x+_,1-E),S.push(c++)}u.push(S)}for(let p=0;p<i;p++)for(let S=0;S<t;S++){const E=u[p][S+1],_=u[p][S],M=u[p+1][S],x=u[p+1][S+1];(p!==0||o>0)&&h.push(E,_,x),(p!==i-1||l<Math.PI)&&h.push(_,M,x)}this.setIndex(h),this.setAttribute("position",new Je(v,3)),this.setAttribute("normal",new Je(g,3)),this.setAttribute("uv",new Je(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new va(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class _a extends ft{constructor(e=1,t=.4,i=12,s=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:i,tubularSegments:s,arc:r},i=Math.floor(i),s=Math.floor(s);const o=[],a=[],l=[],c=[],u=new k,f=new k,d=new k;for(let h=0;h<=i;h++)for(let v=0;v<=s;v++){const g=v/s*r,m=h/i*Math.PI*2;f.x=(e+t*Math.cos(m))*Math.cos(g),f.y=(e+t*Math.cos(m))*Math.sin(g),f.z=t*Math.sin(m),a.push(f.x,f.y,f.z),u.x=e*Math.cos(g),u.y=e*Math.sin(g),d.subVectors(f,u).normalize(),l.push(d.x,d.y,d.z),c.push(v/s),c.push(h/i)}for(let h=1;h<=i;h++)for(let v=1;v<=s;v++){const g=(s+1)*h+v-1,m=(s+1)*(h-1)+v-1,p=(s+1)*(h-1)+v,S=(s+1)*h+v;o.push(g,m,S),o.push(m,p,S)}this.setIndex(o),this.setAttribute("position",new Je(a,3)),this.setAttribute("normal",new Je(l,3)),this.setAttribute("uv",new Je(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new _a(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class Ze extends Oi{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Se(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Se(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Id,this.normalScale=new Ee(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class eg extends Oi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=qp,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class tg extends Oi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class jc extends Tt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Se(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class ng extends jc{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Tt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Se(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const tl=new it,ju=new k,Yu=new k;class jd{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ee(512,512),this.mapType=Yn,this.map=null,this.mapPass=null,this.matrix=new it,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Xc,this._frameExtents=new Ee(1,1),this._viewportCount=1,this._viewports=[new ot(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;ju.setFromMatrixPosition(e.matrixWorld),t.position.copy(ju),Yu.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Yu),t.updateMatrixWorld(),tl.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(tl,t.coordinateSystem,t.reversedDepth),t.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(tl)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Ku=new it,ur=new k,nl=new k;class ig extends jd{constructor(){super(new on(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new Ee(4,2),this._viewportCount=6,this._viewports=[new ot(2,1,1,1),new ot(0,1,1,1),new ot(3,1,1,1),new ot(1,1,1,1),new ot(3,0,1,1),new ot(1,0,1,1)],this._cubeDirections=[new k(1,0,0),new k(-1,0,0),new k(0,0,1),new k(0,0,-1),new k(0,1,0),new k(0,-1,0)],this._cubeUps=[new k(0,1,0),new k(0,1,0),new k(0,1,0),new k(0,1,0),new k(0,0,1),new k(0,0,-1)]}updateMatrices(e,t=0){const i=this.camera,s=this.matrix,r=e.distance||i.far;r!==i.far&&(i.far=r,i.updateProjectionMatrix()),ur.setFromMatrixPosition(e.matrixWorld),i.position.copy(ur),nl.copy(i.position),nl.add(this._cubeDirections[t]),i.up.copy(this._cubeUps[t]),i.lookAt(nl),i.updateMatrixWorld(),s.makeTranslation(-ur.x,-ur.y,-ur.z),Ku.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ku,i.coordinateSystem,i.reversedDepth)}}class ya extends jc{constructor(e,t,i=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=s,this.shadow=new ig}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class xa extends Bd{constructor(e=-1,t=1,i=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=i-e,o=i+e,a=s+t,l=s-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class sg extends jd{constructor(){super(new xa(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class rg extends jc{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Tt.DEFAULT_UP),this.updateMatrix(),this.target=new Tt,this.shadow=new sg}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class og extends ft{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){const e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}}class ag extends on{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class lg{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const Zu=new it;class cg{constructor(e,t,i=0,s=1/0){this.ray=new pa(e,t),this.near=i,this.far=s,this.camera=null,this.layers=new Gc,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Zu.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Zu),this}intersectObject(e,t=!0,i=[]){return mc(e,this,i,t),i.sort(Ju),i}intersectObjects(e,t=!0,i=[]){for(let s=0,r=e.length;s<r;s++)mc(e[s],this,i,t);return i.sort(Ju),i}}function Ju(n,e){return n.distance-e.distance}function mc(n,e,t,i){let s=!0;if(n.layers.test(e.layers)&&n.raycast(e,t)===!1&&(s=!1),s===!0&&i===!0){const r=n.children;for(let o=0,a=r.length;o<a;o++)mc(r[o],e,t,!0)}}function Qu(n,e,t,i){const s=ug(i);switch(t){case Cd:return n*e;case Fc:return n*e/s.components*s.byteLength;case kc:return n*e/s.components*s.byteLength;case Pd:return n*e*2/s.components*s.byteLength;case Bc:return n*e*2/s.components*s.byteLength;case Rd:return n*e*3/s.components*s.byteLength;case _n:return n*e*4/s.components*s.byteLength;case Hc:return n*e*4/s.components*s.byteLength;case Fo:case ko:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Bo:case Ho:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Hl:case Vl:return Math.max(n,16)*Math.max(e,8)/4;case Bl:case zl:return Math.max(n,8)*Math.max(e,8)/2;case Gl:case Wl:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Xl:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case ql:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case $l:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case jl:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case Yl:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case Kl:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case Zl:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case Jl:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case Ql:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case ec:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case tc:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case nc:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case ic:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case sc:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case rc:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case oc:case ac:case lc:return Math.ceil(n/4)*Math.ceil(e/4)*16;case cc:case uc:return Math.ceil(n/4)*Math.ceil(e/4)*8;case hc:case dc:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function ug(n){switch(n){case Yn:case Ed:return{byteLength:1,components:1};case Sr:case wd:case fi:return{byteLength:2,components:1};case Uc:case Oc:return{byteLength:2,components:4};case ss:case Nc:case Wn:return{byteLength:4,components:1};case Td:case Ad:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Dc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Dc);function Yd(){let n=null,e=!1,t=null,i=null;function s(r,o){t(r,o),i=n.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(s),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){n=r}}}function hg(n){const e=new WeakMap;function t(a,l){const c=a.array,u=a.usage,f=c.byteLength,d=n.createBuffer();n.bindBuffer(l,d),n.bufferData(l,c,u),a.onUploadCallback();let h;if(c instanceof Float32Array)h=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)h=n.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?h=n.HALF_FLOAT:h=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)h=n.SHORT;else if(c instanceof Uint32Array)h=n.UNSIGNED_INT;else if(c instanceof Int32Array)h=n.INT;else if(c instanceof Int8Array)h=n.BYTE;else if(c instanceof Uint8Array)h=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)h=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:h,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:f}}function i(a,l,c){const u=l.array,f=l.updateRanges;if(n.bindBuffer(c,a),f.length===0)n.bufferSubData(c,0,u);else{f.sort((h,v)=>h.start-v.start);let d=0;for(let h=1;h<f.length;h++){const v=f[d],g=f[h];g.start<=v.start+v.count+1?v.count=Math.max(v.count,g.start+g.count-v.start):(++d,f[d]=g)}f.length=d+1;for(let h=0,v=f.length;h<v;h++){const g=f[h];n.bufferSubData(c,g.start*u.BYTES_PER_ELEMENT,u,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(n.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var dg=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,fg=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,pg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,mg=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,gg=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,vg=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,_g=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,yg=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,xg=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,bg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Mg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Sg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Eg=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,wg=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Tg=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Ag=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Cg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Rg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Pg=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ig=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Lg=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Dg=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Ng=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Ug=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Og=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Fg=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,kg=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Bg=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Hg=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,zg=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Vg="gl_FragColor = linearToOutputTexel( gl_FragColor );",Gg=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Wg=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Xg=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,qg=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,$g=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,jg=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Yg=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Kg=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Zg=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Jg=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Qg=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,e0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,t0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,n0=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,i0=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,s0=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,r0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,o0=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,a0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,l0=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,c0=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,u0=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,h0=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,d0=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,f0=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,p0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,m0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,g0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,v0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,_0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,y0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,x0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,b0=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,M0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,S0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,E0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,w0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,T0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,A0=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,C0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,R0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,P0=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,I0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,L0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,D0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,N0=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,U0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,O0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,F0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,k0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,B0=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,H0=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,z0=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,V0=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,G0=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,W0=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,X0=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,q0=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,$0=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,j0=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Y0=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,K0=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Z0=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,J0=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Q0=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,ev=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,tv=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,nv=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,iv=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,sv=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,rv=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,ov=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,av=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,lv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,cv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,uv=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const hv=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,dv=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,fv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,pv=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,gv=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,vv=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,_v=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,yv=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,xv=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,bv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Mv=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Sv=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Ev=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,wv=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Tv=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Av=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cv=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rv=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Pv=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Iv=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Lv=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Dv=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Nv=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Uv=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Ov=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Fv=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,kv=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Bv=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Hv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,zv=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Vv=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Gv=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Wv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,qe={alphahash_fragment:dg,alphahash_pars_fragment:fg,alphamap_fragment:pg,alphamap_pars_fragment:mg,alphatest_fragment:gg,alphatest_pars_fragment:vg,aomap_fragment:_g,aomap_pars_fragment:yg,batching_pars_vertex:xg,batching_vertex:bg,begin_vertex:Mg,beginnormal_vertex:Sg,bsdfs:Eg,iridescence_fragment:wg,bumpmap_pars_fragment:Tg,clipping_planes_fragment:Ag,clipping_planes_pars_fragment:Cg,clipping_planes_pars_vertex:Rg,clipping_planes_vertex:Pg,color_fragment:Ig,color_pars_fragment:Lg,color_pars_vertex:Dg,color_vertex:Ng,common:Ug,cube_uv_reflection_fragment:Og,defaultnormal_vertex:Fg,displacementmap_pars_vertex:kg,displacementmap_vertex:Bg,emissivemap_fragment:Hg,emissivemap_pars_fragment:zg,colorspace_fragment:Vg,colorspace_pars_fragment:Gg,envmap_fragment:Wg,envmap_common_pars_fragment:Xg,envmap_pars_fragment:qg,envmap_pars_vertex:$g,envmap_physical_pars_fragment:s0,envmap_vertex:jg,fog_vertex:Yg,fog_pars_vertex:Kg,fog_fragment:Zg,fog_pars_fragment:Jg,gradientmap_pars_fragment:Qg,lightmap_pars_fragment:e0,lights_lambert_fragment:t0,lights_lambert_pars_fragment:n0,lights_pars_begin:i0,lights_toon_fragment:r0,lights_toon_pars_fragment:o0,lights_phong_fragment:a0,lights_phong_pars_fragment:l0,lights_physical_fragment:c0,lights_physical_pars_fragment:u0,lights_fragment_begin:h0,lights_fragment_maps:d0,lights_fragment_end:f0,logdepthbuf_fragment:p0,logdepthbuf_pars_fragment:m0,logdepthbuf_pars_vertex:g0,logdepthbuf_vertex:v0,map_fragment:_0,map_pars_fragment:y0,map_particle_fragment:x0,map_particle_pars_fragment:b0,metalnessmap_fragment:M0,metalnessmap_pars_fragment:S0,morphinstance_vertex:E0,morphcolor_vertex:w0,morphnormal_vertex:T0,morphtarget_pars_vertex:A0,morphtarget_vertex:C0,normal_fragment_begin:R0,normal_fragment_maps:P0,normal_pars_fragment:I0,normal_pars_vertex:L0,normal_vertex:D0,normalmap_pars_fragment:N0,clearcoat_normal_fragment_begin:U0,clearcoat_normal_fragment_maps:O0,clearcoat_pars_fragment:F0,iridescence_pars_fragment:k0,opaque_fragment:B0,packing:H0,premultiplied_alpha_fragment:z0,project_vertex:V0,dithering_fragment:G0,dithering_pars_fragment:W0,roughnessmap_fragment:X0,roughnessmap_pars_fragment:q0,shadowmap_pars_fragment:$0,shadowmap_pars_vertex:j0,shadowmap_vertex:Y0,shadowmask_pars_fragment:K0,skinbase_vertex:Z0,skinning_pars_vertex:J0,skinning_vertex:Q0,skinnormal_vertex:ev,specularmap_fragment:tv,specularmap_pars_fragment:nv,tonemapping_fragment:iv,tonemapping_pars_fragment:sv,transmission_fragment:rv,transmission_pars_fragment:ov,uv_pars_fragment:av,uv_pars_vertex:lv,uv_vertex:cv,worldpos_vertex:uv,background_vert:hv,background_frag:dv,backgroundCube_vert:fv,backgroundCube_frag:pv,cube_vert:mv,cube_frag:gv,depth_vert:vv,depth_frag:_v,distanceRGBA_vert:yv,distanceRGBA_frag:xv,equirect_vert:bv,equirect_frag:Mv,linedashed_vert:Sv,linedashed_frag:Ev,meshbasic_vert:wv,meshbasic_frag:Tv,meshlambert_vert:Av,meshlambert_frag:Cv,meshmatcap_vert:Rv,meshmatcap_frag:Pv,meshnormal_vert:Iv,meshnormal_frag:Lv,meshphong_vert:Dv,meshphong_frag:Nv,meshphysical_vert:Uv,meshphysical_frag:Ov,meshtoon_vert:Fv,meshtoon_frag:kv,points_vert:Bv,points_frag:Hv,shadow_vert:zv,shadow_frag:Vv,sprite_vert:Gv,sprite_frag:Wv},de={common:{diffuse:{value:new Se(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new We},alphaMap:{value:null},alphaMapTransform:{value:new We},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new We}},envmap:{envMap:{value:null},envMapRotation:{value:new We},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new We}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new We}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new We},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new We},normalScale:{value:new Ee(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new We},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new We}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new We}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new We}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Se(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Se(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new We},alphaTest:{value:0},uvTransform:{value:new We}},sprite:{diffuse:{value:new Se(16777215)},opacity:{value:1},center:{value:new Ee(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new We},alphaMap:{value:null},alphaMapTransform:{value:new We},alphaTest:{value:0}}},kn={basic:{uniforms:$t([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.fog]),vertexShader:qe.meshbasic_vert,fragmentShader:qe.meshbasic_frag},lambert:{uniforms:$t([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.fog,de.lights,{emissive:{value:new Se(0)}}]),vertexShader:qe.meshlambert_vert,fragmentShader:qe.meshlambert_frag},phong:{uniforms:$t([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.fog,de.lights,{emissive:{value:new Se(0)},specular:{value:new Se(1118481)},shininess:{value:30}}]),vertexShader:qe.meshphong_vert,fragmentShader:qe.meshphong_frag},standard:{uniforms:$t([de.common,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.roughnessmap,de.metalnessmap,de.fog,de.lights,{emissive:{value:new Se(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:qe.meshphysical_vert,fragmentShader:qe.meshphysical_frag},toon:{uniforms:$t([de.common,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.gradientmap,de.fog,de.lights,{emissive:{value:new Se(0)}}]),vertexShader:qe.meshtoon_vert,fragmentShader:qe.meshtoon_frag},matcap:{uniforms:$t([de.common,de.bumpmap,de.normalmap,de.displacementmap,de.fog,{matcap:{value:null}}]),vertexShader:qe.meshmatcap_vert,fragmentShader:qe.meshmatcap_frag},points:{uniforms:$t([de.points,de.fog]),vertexShader:qe.points_vert,fragmentShader:qe.points_frag},dashed:{uniforms:$t([de.common,de.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:qe.linedashed_vert,fragmentShader:qe.linedashed_frag},depth:{uniforms:$t([de.common,de.displacementmap]),vertexShader:qe.depth_vert,fragmentShader:qe.depth_frag},normal:{uniforms:$t([de.common,de.bumpmap,de.normalmap,de.displacementmap,{opacity:{value:1}}]),vertexShader:qe.meshnormal_vert,fragmentShader:qe.meshnormal_frag},sprite:{uniforms:$t([de.sprite,de.fog]),vertexShader:qe.sprite_vert,fragmentShader:qe.sprite_frag},background:{uniforms:{uvTransform:{value:new We},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:qe.background_vert,fragmentShader:qe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new We}},vertexShader:qe.backgroundCube_vert,fragmentShader:qe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:qe.cube_vert,fragmentShader:qe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:qe.equirect_vert,fragmentShader:qe.equirect_frag},distanceRGBA:{uniforms:$t([de.common,de.displacementmap,{referencePosition:{value:new k},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:qe.distanceRGBA_vert,fragmentShader:qe.distanceRGBA_frag},shadow:{uniforms:$t([de.lights,de.fog,{color:{value:new Se(0)},opacity:{value:1}}]),vertexShader:qe.shadow_vert,fragmentShader:qe.shadow_frag}};kn.physical={uniforms:$t([kn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new We},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new We},clearcoatNormalScale:{value:new Ee(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new We},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new We},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new We},sheen:{value:0},sheenColor:{value:new Se(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new We},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new We},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new We},transmissionSamplerSize:{value:new Ee},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new We},attenuationDistance:{value:0},attenuationColor:{value:new Se(0)},specularColor:{value:new Se(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new We},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new We},anisotropyVector:{value:new Ee},anisotropyMap:{value:null},anisotropyMapTransform:{value:new We}}]),vertexShader:qe.meshphysical_vert,fragmentShader:qe.meshphysical_frag};const xo={r:0,b:0,g:0},Wi=new Kn,Xv=new it;function qv(n,e,t,i,s,r,o){const a=new Se(0);let l=r===!0?0:1,c,u,f=null,d=0,h=null;function v(E){let _=E.isScene===!0?E.background:null;return _&&_.isTexture&&(_=(E.backgroundBlurriness>0?t:e).get(_)),_}function g(E){let _=!1;const M=v(E);M===null?p(a,l):M&&M.isColor&&(p(M,1),_=!0);const x=n.xr.getEnvironmentBlendMode();x==="additive"?i.buffers.color.setClear(0,0,0,1,o):x==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||_)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function m(E,_){const M=v(_);M&&(M.isCubeTexture||M.mapping===fa)?(u===void 0&&(u=new ae(new Wt(1,1,1),new Lt({name:"BackgroundCubeMaterial",uniforms:Ws(kn.backgroundCube.uniforms),vertexShader:kn.backgroundCube.vertexShader,fragmentShader:kn.backgroundCube.fragmentShader,side:Zt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(x,w,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(u)),Wi.copy(_.backgroundRotation),Wi.x*=-1,Wi.y*=-1,Wi.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(Wi.y*=-1,Wi.z*=-1),u.material.uniforms.envMap.value=M,u.material.uniforms.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=_.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(Xv.makeRotationFromEuler(Wi)),u.material.toneMapped=et.getTransfer(M.colorSpace)!==lt,(f!==M||d!==M.version||h!==n.toneMapping)&&(u.material.needsUpdate=!0,f=M,d=M.version,h=n.toneMapping),u.layers.enableAll(),E.unshift(u,u.geometry,u.material,0,0,null)):M&&M.isTexture&&(c===void 0&&(c=new ae(new xn(2,2),new Lt({name:"BackgroundMaterial",uniforms:Ws(kn.background.uniforms),vertexShader:kn.background.vertexShader,fragmentShader:kn.background.fragmentShader,side:Ii,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=M,c.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,c.material.toneMapped=et.getTransfer(M.colorSpace)!==lt,M.matrixAutoUpdate===!0&&M.updateMatrix(),c.material.uniforms.uvTransform.value.copy(M.matrix),(f!==M||d!==M.version||h!==n.toneMapping)&&(c.material.needsUpdate=!0,f=M,d=M.version,h=n.toneMapping),c.layers.enableAll(),E.unshift(c,c.geometry,c.material,0,0,null))}function p(E,_){E.getRGB(xo,kd(n)),i.buffers.color.setClear(xo.r,xo.g,xo.b,_,o)}function S(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(E,_=1){a.set(E),l=_,p(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(E){l=E,p(a,l)},render:g,addToRenderList:m,dispose:S}}function $v(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=d(null);let r=s,o=!1;function a(b,P,N,U,I){let F=!1;const B=f(U,N,P);r!==B&&(r=B,c(r.object)),F=h(b,U,N,I),F&&v(b,U,N,I),I!==null&&e.update(I,n.ELEMENT_ARRAY_BUFFER),(F||o)&&(o=!1,_(b,P,N,U),I!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(I).buffer))}function l(){return n.createVertexArray()}function c(b){return n.bindVertexArray(b)}function u(b){return n.deleteVertexArray(b)}function f(b,P,N){const U=N.wireframe===!0;let I=i[b.id];I===void 0&&(I={},i[b.id]=I);let F=I[P.id];F===void 0&&(F={},I[P.id]=F);let B=F[U];return B===void 0&&(B=d(l()),F[U]=B),B}function d(b){const P=[],N=[],U=[];for(let I=0;I<t;I++)P[I]=0,N[I]=0,U[I]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:P,enabledAttributes:N,attributeDivisors:U,object:b,attributes:{},index:null}}function h(b,P,N,U){const I=r.attributes,F=P.attributes;let B=0;const L=N.getAttributes();for(const A in L)if(L[A].location>=0){const V=I[A];let Z=F[A];if(Z===void 0&&(A==="instanceMatrix"&&b.instanceMatrix&&(Z=b.instanceMatrix),A==="instanceColor"&&b.instanceColor&&(Z=b.instanceColor)),V===void 0||V.attribute!==Z||Z&&V.data!==Z.data)return!0;B++}return r.attributesNum!==B||r.index!==U}function v(b,P,N,U){const I={},F=P.attributes;let B=0;const L=N.getAttributes();for(const A in L)if(L[A].location>=0){let V=F[A];V===void 0&&(A==="instanceMatrix"&&b.instanceMatrix&&(V=b.instanceMatrix),A==="instanceColor"&&b.instanceColor&&(V=b.instanceColor));const Z={};Z.attribute=V,V&&V.data&&(Z.data=V.data),I[A]=Z,B++}r.attributes=I,r.attributesNum=B,r.index=U}function g(){const b=r.newAttributes;for(let P=0,N=b.length;P<N;P++)b[P]=0}function m(b){p(b,0)}function p(b,P){const N=r.newAttributes,U=r.enabledAttributes,I=r.attributeDivisors;N[b]=1,U[b]===0&&(n.enableVertexAttribArray(b),U[b]=1),I[b]!==P&&(n.vertexAttribDivisor(b,P),I[b]=P)}function S(){const b=r.newAttributes,P=r.enabledAttributes;for(let N=0,U=P.length;N<U;N++)P[N]!==b[N]&&(n.disableVertexAttribArray(N),P[N]=0)}function E(b,P,N,U,I,F,B){B===!0?n.vertexAttribIPointer(b,P,N,I,F):n.vertexAttribPointer(b,P,N,U,I,F)}function _(b,P,N,U){g();const I=U.attributes,F=N.getAttributes(),B=P.defaultAttributeValues;for(const L in F){const A=F[L];if(A.location>=0){let H=I[L];if(H===void 0&&(L==="instanceMatrix"&&b.instanceMatrix&&(H=b.instanceMatrix),L==="instanceColor"&&b.instanceColor&&(H=b.instanceColor)),H!==void 0){const V=H.normalized,Z=H.itemSize,le=e.get(H);if(le===void 0)continue;const ve=le.buffer,Oe=le.type,K=le.bytesPerElement,G=Oe===n.INT||Oe===n.UNSIGNED_INT||H.gpuType===Nc;if(H.isInterleavedBufferAttribute){const q=H.data,ne=q.stride,Ie=H.offset;if(q.isInstancedInterleavedBuffer){for(let _e=0;_e<A.locationSize;_e++)p(A.location+_e,q.meshPerAttribute);b.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=q.meshPerAttribute*q.count)}else for(let _e=0;_e<A.locationSize;_e++)m(A.location+_e);n.bindBuffer(n.ARRAY_BUFFER,ve);for(let _e=0;_e<A.locationSize;_e++)E(A.location+_e,Z/A.locationSize,Oe,V,ne*K,(Ie+Z/A.locationSize*_e)*K,G)}else{if(H.isInstancedBufferAttribute){for(let q=0;q<A.locationSize;q++)p(A.location+q,H.meshPerAttribute);b.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=H.meshPerAttribute*H.count)}else for(let q=0;q<A.locationSize;q++)m(A.location+q);n.bindBuffer(n.ARRAY_BUFFER,ve);for(let q=0;q<A.locationSize;q++)E(A.location+q,Z/A.locationSize,Oe,V,Z*K,Z/A.locationSize*q*K,G)}}else if(B!==void 0){const V=B[L];if(V!==void 0)switch(V.length){case 2:n.vertexAttrib2fv(A.location,V);break;case 3:n.vertexAttrib3fv(A.location,V);break;case 4:n.vertexAttrib4fv(A.location,V);break;default:n.vertexAttrib1fv(A.location,V)}}}}S()}function M(){R();for(const b in i){const P=i[b];for(const N in P){const U=P[N];for(const I in U)u(U[I].object),delete U[I];delete P[N]}delete i[b]}}function x(b){if(i[b.id]===void 0)return;const P=i[b.id];for(const N in P){const U=P[N];for(const I in U)u(U[I].object),delete U[I];delete P[N]}delete i[b.id]}function w(b){for(const P in i){const N=i[P];if(N[b.id]===void 0)continue;const U=N[b.id];for(const I in U)u(U[I].object),delete U[I];delete N[b.id]}}function R(){y(),o=!0,r!==s&&(r=s,c(r.object))}function y(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:R,resetDefaultState:y,dispose:M,releaseStatesOfGeometry:x,releaseStatesOfProgram:w,initAttributes:g,enableAttribute:m,disableUnusedAttributes:S}}function jv(n,e,t){let i;function s(c){i=c}function r(c,u){n.drawArrays(i,c,u),t.update(u,i,1)}function o(c,u,f){f!==0&&(n.drawArraysInstanced(i,c,u,f),t.update(u,i,f))}function a(c,u,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,u,0,f);let h=0;for(let v=0;v<f;v++)h+=u[v];t.update(h,i,1)}function l(c,u,f,d){if(f===0)return;const h=e.get("WEBGL_multi_draw");if(h===null)for(let v=0;v<c.length;v++)o(c[v],u[v],d[v]);else{h.multiDrawArraysInstancedWEBGL(i,c,0,u,0,d,0,f);let v=0;for(let g=0;g<f;g++)v+=u[g]*d[g];t.update(v,i,1)}}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function Yv(n,e,t,i){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){const w=e.get("EXT_texture_filter_anisotropic");s=n.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(w){return!(w!==_n&&i.convert(w)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(w){const R=w===fi&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(w!==Yn&&i.convert(w)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&w!==Wn&&!R)}function l(w){if(w==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";w="mediump"}return w==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const u=l(c);u!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const f=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),h=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),v=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_TEXTURE_SIZE),m=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),p=n.getParameter(n.MAX_VERTEX_ATTRIBS),S=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),E=n.getParameter(n.MAX_VARYING_VECTORS),_=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),M=v>0,x=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:h,maxVertexTextures:v,maxTextureSize:g,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:S,maxVaryings:E,maxFragmentUniforms:_,vertexTextures:M,maxSamples:x}}function Kv(n){const e=this;let t=null,i=0,s=!1,r=!1;const o=new wi,a=new We,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,d){const h=f.length!==0||d||i!==0||s;return s=d,i=f.length,h},this.beginShadows=function(){r=!0,u(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,d){t=u(f,d,0)},this.setState=function(f,d,h){const v=f.clippingPlanes,g=f.clipIntersection,m=f.clipShadows,p=n.get(f);if(!s||v===null||v.length===0||r&&!m)r?u(null):c();else{const S=r?0:i,E=S*4;let _=p.clippingState||null;l.value=_,_=u(v,d,E,h);for(let M=0;M!==E;++M)_[M]=t[M];p.clippingState=_,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(f,d,h,v){const g=f!==null?f.length:0;let m=null;if(g!==0){if(m=l.value,v!==!0||m===null){const p=h+g*4,S=d.matrixWorldInverse;a.getNormalMatrix(S),(m===null||m.length<p)&&(m=new Float32Array(p));for(let E=0,_=h;E!==g;++E,_+=4)o.copy(f[E]).applyMatrix4(S,a),o.normal.toArray(m,_),m[_+3]=o.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=g,e.numIntersection=0,m}}function Zv(n){let e=new WeakMap;function t(o,a){return a===Ol?o.mapping=zs:a===Fl&&(o.mapping=Vs),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===Ol||a===Fl)if(e.has(o)){const l=e.get(o).texture;return t(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new Vm(l.height);return c.fromEquirectangularTexture(n,o),e.set(o,c),o.addEventListener("dispose",s),t(c.texture,o.mapping)}else return null}}return o}function s(o){const a=o.target;a.removeEventListener("dispose",s);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function r(){e=new WeakMap}return{get:i,dispose:r}}const Ns=4,eh=[.125,.215,.35,.446,.526,.582],Ki=20,il=new xa,th=new Se;let sl=null,rl=0,ol=0,al=!1;const $i=(1+Math.sqrt(5))/2,As=1/$i,nh=[new k(-$i,As,0),new k($i,As,0),new k(-As,0,$i),new k(As,0,$i),new k(0,$i,-As),new k(0,$i,As),new k(-1,1,-1),new k(1,1,-1),new k(-1,1,1),new k(1,1,1)],Jv=new k;class ih{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,s=100,r={}){const{size:o=256,position:a=Jv}=r;sl=this._renderer.getRenderTarget(),rl=this._renderer.getActiveCubeFace(),ol=this._renderer.getActiveMipmapLevel(),al=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,s,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=oh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=rh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(sl,rl,ol),this._renderer.xr.enabled=al,e.scissorTest=!1,bo(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===zs||e.mapping===Vs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),sl=this._renderer.getRenderTarget(),rl=this._renderer.getActiveCubeFace(),ol=this._renderer.getActiveMipmapLevel(),al=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Tn,minFilter:Tn,generateMipmaps:!1,type:fi,format:_n,colorSpace:Gs,depthBuffer:!1},s=sh(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=sh(e,t,i);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Qv(r)),this._blurMaterial=e_(r,e,t)}return s}_compileMaterial(e){const t=new ae(this._lodPlanes[0],e);this._renderer.compile(t,il)}_sceneToCubeUV(e,t,i,s,r){const l=new on(90,1,t,i),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],f=this._renderer,d=f.autoClear,h=f.toneMapping;f.getClearColor(th),f.toneMapping=Ri,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(s),f.clearDepth(),f.setRenderTarget(null));const g=new Fi({name:"PMREM.Background",side:Zt,depthWrite:!1,depthTest:!1}),m=new ae(new Wt,g);let p=!1;const S=e.background;S?S.isColor&&(g.color.copy(S),e.background=null,p=!0):(g.color.copy(th),p=!0);for(let E=0;E<6;E++){const _=E%3;_===0?(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+u[E],r.y,r.z)):_===1?(l.up.set(0,0,c[E]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+u[E],r.z)):(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+u[E]));const M=this._cubeSize;bo(s,_*M,E>2?M:0,M,M),f.setRenderTarget(s),p&&f.render(m,l),f.render(e,l)}m.geometry.dispose(),m.material.dispose(),f.toneMapping=h,f.autoClear=d,e.background=S}_textureToCubeUV(e,t){const i=this._renderer,s=e.mapping===zs||e.mapping===Vs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=oh()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=rh());const r=s?this._cubemapMaterial:this._equirectMaterial,o=new ae(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=e;const l=this._cubeSize;bo(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(o,il)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const s=this._lodPlanes.length;for(let r=1;r<s;r++){const o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=nh[(s-r-1)%nh.length];this._blur(e,r-1,r,o,a)}t.autoClear=i}_blur(e,t,i,s,r){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,i,s,"latitudinal",r),this._halfBlur(o,e,i,i,s,"longitudinal",r)}_halfBlur(e,t,i,s,r,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,f=new ae(this._lodPlanes[s],c),d=c.uniforms,h=this._sizeLods[i]-1,v=isFinite(r)?Math.PI/(2*h):2*Math.PI/(2*Ki-1),g=r/v,m=isFinite(r)?1+Math.floor(u*g):Ki;m>Ki&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Ki}`);const p=[];let S=0;for(let w=0;w<Ki;++w){const R=w/g,y=Math.exp(-R*R/2);p.push(y),w===0?S+=y:w<m&&(S+=2*y)}for(let w=0;w<p.length;w++)p[w]=p[w]/S;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:E}=this;d.dTheta.value=v,d.mipInt.value=E-i;const _=this._sizeLods[s],M=3*_*(s>E-Ns?s-E+Ns:0),x=4*(this._cubeSize-_);bo(t,M,x,3*_,2*_),l.setRenderTarget(t),l.render(f,il)}}function Qv(n){const e=[],t=[],i=[];let s=n;const r=n-Ns+1+eh.length;for(let o=0;o<r;o++){const a=Math.pow(2,s);t.push(a);let l=1/a;o>n-Ns?l=eh[o-n+Ns-1]:o===0&&(l=0),i.push(l);const c=1/(a-2),u=-c,f=1+c,d=[u,u,f,u,f,f,u,u,f,f,u,f],h=6,v=6,g=3,m=2,p=1,S=new Float32Array(g*v*h),E=new Float32Array(m*v*h),_=new Float32Array(p*v*h);for(let x=0;x<h;x++){const w=x%3*2/3-1,R=x>2?0:-1,y=[w,R,0,w+2/3,R,0,w+2/3,R+1,0,w,R,0,w+2/3,R+1,0,w,R+1,0];S.set(y,g*v*x),E.set(d,m*v*x);const b=[x,x,x,x,x,x];_.set(b,p*v*x)}const M=new ft;M.setAttribute("position",new bt(S,g)),M.setAttribute("uv",new bt(E,m)),M.setAttribute("faceIndex",new bt(_,p)),e.push(M),s>Ns&&s--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function sh(n,e,t){const i=new Cn(n,e,t);return i.texture.mapping=fa,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function bo(n,e,t,i,s){n.viewport.set(e,t,i,s),n.scissor.set(e,t,i,s)}function e_(n,e,t){const i=new Float32Array(Ki),s=new k(0,1,0);return new Lt({name:"SphericalGaussianBlur",defines:{n:Ki,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Yc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:di,depthTest:!1,depthWrite:!1})}function rh(){return new Lt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Yc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:di,depthTest:!1,depthWrite:!1})}function oh(){return new Lt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Yc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:di,depthTest:!1,depthWrite:!1})}function Yc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function t_(n){let e=new WeakMap,t=null;function i(a){if(a&&a.isTexture){const l=a.mapping,c=l===Ol||l===Fl,u=l===zs||l===Vs;if(c||u){let f=e.get(a);const d=f!==void 0?f.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return t===null&&(t=new ih(n)),f=c?t.fromEquirectangular(a,f):t.fromCubemap(a,f),f.texture.pmremVersion=a.pmremVersion,e.set(a,f),f.texture;if(f!==void 0)return f.texture;{const h=a.image;return c&&h&&h.height>0||u&&h&&s(h)?(t===null&&(t=new ih(n)),f=c?t.fromEquirectangular(a):t.fromCubemap(a),f.texture.pmremVersion=a.pmremVersion,e.set(a,f),a.addEventListener("dispose",r),f.texture):null}}}return a}function s(a){let l=0;const c=6;for(let u=0;u<c;u++)a[u]!==void 0&&l++;return l===c}function r(a){const l=a.target;l.removeEventListener("dispose",r);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:o}}function n_(n){const e={};function t(i){if(e[i]!==void 0)return e[i];let s;switch(i){case"WEBGL_depth_texture":s=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=n.getExtension(i)}return e[i]=s,s}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const s=t(i);return s===null&&Cr("THREE.WebGLRenderer: "+i+" extension not supported."),s}}}function i_(n,e,t,i){const s={},r=new WeakMap;function o(f){const d=f.target;d.index!==null&&e.remove(d.index);for(const v in d.attributes)e.remove(d.attributes[v]);d.removeEventListener("dispose",o),delete s[d.id];const h=r.get(d);h&&(e.remove(h),r.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function a(f,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,t.memory.geometries++),d}function l(f){const d=f.attributes;for(const h in d)e.update(d[h],n.ARRAY_BUFFER)}function c(f){const d=[],h=f.index,v=f.attributes.position;let g=0;if(h!==null){const S=h.array;g=h.version;for(let E=0,_=S.length;E<_;E+=3){const M=S[E+0],x=S[E+1],w=S[E+2];d.push(M,x,x,w,w,M)}}else if(v!==void 0){const S=v.array;g=v.version;for(let E=0,_=S.length/3-1;E<_;E+=3){const M=E+0,x=E+1,w=E+2;d.push(M,x,x,w,w,M)}}else return;const m=new(Dd(d)?Fd:Od)(d,1);m.version=g;const p=r.get(f);p&&e.remove(p),r.set(f,m)}function u(f){const d=r.get(f);if(d){const h=f.index;h!==null&&d.version<h.version&&c(f)}else c(f);return r.get(f)}return{get:a,update:l,getWireframeAttribute:u}}function s_(n,e,t){let i;function s(d){i=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,h){n.drawElements(i,h,r,d*o),t.update(h,i,1)}function c(d,h,v){v!==0&&(n.drawElementsInstanced(i,h,r,d*o,v),t.update(h,i,v))}function u(d,h,v){if(v===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,h,0,r,d,0,v);let m=0;for(let p=0;p<v;p++)m+=h[p];t.update(m,i,1)}function f(d,h,v,g){if(v===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<d.length;p++)c(d[p]/o,h[p],g[p]);else{m.multiDrawElementsInstancedWEBGL(i,h,0,r,d,0,g,0,v);let p=0;for(let S=0;S<v;S++)p+=h[S]*g[S];t.update(p,i,1)}}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u,this.renderMultiDrawInstances=f}function r_(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,o,a){switch(t.calls++,o){case n.TRIANGLES:t.triangles+=a*(r/3);break;case n.LINES:t.lines+=a*(r/2);break;case n.LINE_STRIP:t.lines+=a*(r-1);break;case n.LINE_LOOP:t.lines+=a*r;break;case n.POINTS:t.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:i}}function o_(n,e,t){const i=new WeakMap,s=new ot;function r(o,a,l){const c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,f=u!==void 0?u.length:0;let d=i.get(a);if(d===void 0||d.count!==f){let y=function(){w.dispose(),i.delete(a),a.removeEventListener("dispose",y)};d!==void 0&&d.texture.dispose();const h=a.morphAttributes.position!==void 0,v=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],S=a.morphAttributes.color||[];let E=0;h===!0&&(E=1),v===!0&&(E=2),g===!0&&(E=3);let _=a.attributes.position.count*E,M=1;_>e.maxTextureSize&&(M=Math.ceil(_/e.maxTextureSize),_=e.maxTextureSize);const x=new Float32Array(_*M*4*f),w=new Nd(x,_,M,f);w.type=Wn,w.needsUpdate=!0;const R=E*4;for(let b=0;b<f;b++){const P=m[b],N=p[b],U=S[b],I=_*M*4*b;for(let F=0;F<P.count;F++){const B=F*R;h===!0&&(s.fromBufferAttribute(P,F),x[I+B+0]=s.x,x[I+B+1]=s.y,x[I+B+2]=s.z,x[I+B+3]=0),v===!0&&(s.fromBufferAttribute(N,F),x[I+B+4]=s.x,x[I+B+5]=s.y,x[I+B+6]=s.z,x[I+B+7]=0),g===!0&&(s.fromBufferAttribute(U,F),x[I+B+8]=s.x,x[I+B+9]=s.y,x[I+B+10]=s.z,x[I+B+11]=U.itemSize===4?s.w:1)}}d={count:f,texture:w,size:new Ee(_,M)},i.set(a,d),a.addEventListener("dispose",y)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",o.morphTexture,t);else{let h=0;for(let g=0;g<c.length;g++)h+=c[g];const v=a.morphTargetsRelative?1:1-h;l.getUniforms().setValue(n,"morphTargetBaseInfluence",v),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",d.size)}return{update:r}}function a_(n,e,t,i){let s=new WeakMap;function r(l){const c=i.render.frame,u=l.geometry,f=e.get(l,u);if(s.get(f)!==c&&(e.update(f),s.set(f,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),s.get(l)!==c&&(t.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,n.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;s.get(d)!==c&&(d.update(),s.set(d,c))}return f}function o(){s=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:r,dispose:o}}const Kd=new Gt,ah=new Xd(1,1),Zd=new Nd,Jd=new Tm,Qd=new Hd,lh=[],ch=[],uh=new Float32Array(16),hh=new Float32Array(9),dh=new Float32Array(4);function Js(n,e,t){const i=n[0];if(i<=0||i>0)return n;const s=e*t;let r=lh[s];if(r===void 0&&(r=new Float32Array(s),lh[s]=r),e!==0){i.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,n[o].toArray(r,a)}return r}function Dt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Nt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function ba(n,e){let t=ch[e];t===void 0&&(t=new Int32Array(e),ch[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function l_(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function c_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Dt(t,e))return;n.uniform2fv(this.addr,e),Nt(t,e)}}function u_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Dt(t,e))return;n.uniform3fv(this.addr,e),Nt(t,e)}}function h_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Dt(t,e))return;n.uniform4fv(this.addr,e),Nt(t,e)}}function d_(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Dt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Nt(t,e)}else{if(Dt(t,i))return;dh.set(i),n.uniformMatrix2fv(this.addr,!1,dh),Nt(t,i)}}function f_(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Dt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Nt(t,e)}else{if(Dt(t,i))return;hh.set(i),n.uniformMatrix3fv(this.addr,!1,hh),Nt(t,i)}}function p_(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Dt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Nt(t,e)}else{if(Dt(t,i))return;uh.set(i),n.uniformMatrix4fv(this.addr,!1,uh),Nt(t,i)}}function m_(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function g_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Dt(t,e))return;n.uniform2iv(this.addr,e),Nt(t,e)}}function v_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Dt(t,e))return;n.uniform3iv(this.addr,e),Nt(t,e)}}function __(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Dt(t,e))return;n.uniform4iv(this.addr,e),Nt(t,e)}}function y_(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function x_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Dt(t,e))return;n.uniform2uiv(this.addr,e),Nt(t,e)}}function b_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Dt(t,e))return;n.uniform3uiv(this.addr,e),Nt(t,e)}}function M_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Dt(t,e))return;n.uniform4uiv(this.addr,e),Nt(t,e)}}function S_(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_2D_SHADOW?(ah.compareFunction=Ld,r=ah):r=Kd,t.setTexture2D(e||r,s)}function E_(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture3D(e||Jd,s)}function w_(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTextureCube(e||Qd,s)}function T_(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture2DArray(e||Zd,s)}function A_(n){switch(n){case 5126:return l_;case 35664:return c_;case 35665:return u_;case 35666:return h_;case 35674:return d_;case 35675:return f_;case 35676:return p_;case 5124:case 35670:return m_;case 35667:case 35671:return g_;case 35668:case 35672:return v_;case 35669:case 35673:return __;case 5125:return y_;case 36294:return x_;case 36295:return b_;case 36296:return M_;case 35678:case 36198:case 36298:case 36306:case 35682:return S_;case 35679:case 36299:case 36307:return E_;case 35680:case 36300:case 36308:case 36293:return w_;case 36289:case 36303:case 36311:case 36292:return T_}}function C_(n,e){n.uniform1fv(this.addr,e)}function R_(n,e){const t=Js(e,this.size,2);n.uniform2fv(this.addr,t)}function P_(n,e){const t=Js(e,this.size,3);n.uniform3fv(this.addr,t)}function I_(n,e){const t=Js(e,this.size,4);n.uniform4fv(this.addr,t)}function L_(n,e){const t=Js(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function D_(n,e){const t=Js(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function N_(n,e){const t=Js(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function U_(n,e){n.uniform1iv(this.addr,e)}function O_(n,e){n.uniform2iv(this.addr,e)}function F_(n,e){n.uniform3iv(this.addr,e)}function k_(n,e){n.uniform4iv(this.addr,e)}function B_(n,e){n.uniform1uiv(this.addr,e)}function H_(n,e){n.uniform2uiv(this.addr,e)}function z_(n,e){n.uniform3uiv(this.addr,e)}function V_(n,e){n.uniform4uiv(this.addr,e)}function G_(n,e,t){const i=this.cache,s=e.length,r=ba(t,s);Dt(i,r)||(n.uniform1iv(this.addr,r),Nt(i,r));for(let o=0;o!==s;++o)t.setTexture2D(e[o]||Kd,r[o])}function W_(n,e,t){const i=this.cache,s=e.length,r=ba(t,s);Dt(i,r)||(n.uniform1iv(this.addr,r),Nt(i,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||Jd,r[o])}function X_(n,e,t){const i=this.cache,s=e.length,r=ba(t,s);Dt(i,r)||(n.uniform1iv(this.addr,r),Nt(i,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||Qd,r[o])}function q_(n,e,t){const i=this.cache,s=e.length,r=ba(t,s);Dt(i,r)||(n.uniform1iv(this.addr,r),Nt(i,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||Zd,r[o])}function $_(n){switch(n){case 5126:return C_;case 35664:return R_;case 35665:return P_;case 35666:return I_;case 35674:return L_;case 35675:return D_;case 35676:return N_;case 5124:case 35670:return U_;case 35667:case 35671:return O_;case 35668:case 35672:return F_;case 35669:case 35673:return k_;case 5125:return B_;case 36294:return H_;case 36295:return z_;case 36296:return V_;case 35678:case 36198:case 36298:case 36306:case 35682:return G_;case 35679:case 36299:case 36307:return W_;case 35680:case 36300:case 36308:case 36293:return X_;case 36289:case 36303:case 36311:case 36292:return q_}}class j_{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=A_(t.type)}}class Y_{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=$_(t.type)}}class K_{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(e,t[a.id],i)}}}const ll=/(\w+)(\])?(\[|\.)?/g;function fh(n,e){n.seq.push(e),n.map[e.id]=e}function Z_(n,e,t){const i=n.name,s=i.length;for(ll.lastIndex=0;;){const r=ll.exec(i),o=ll.lastIndex;let a=r[1];const l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){fh(t,c===void 0?new j_(a,n,e):new Y_(a,n,e));break}else{let f=t.map[a];f===void 0&&(f=new K_(a),fh(t,f)),t=f}}}class zo{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<i;++s){const r=e.getActiveUniform(t,s),o=e.getUniformLocation(t,r.name);Z_(r,o,this)}}setValue(e,t,i,s){const r=this.map[t];r!==void 0&&r.setValue(e,i,s)}setOptional(e,t,i){const s=t[i];s!==void 0&&this.setValue(e,i,s)}static upload(e,t,i,s){for(let r=0,o=t.length;r!==o;++r){const a=t[r],l=i[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,s)}}static seqWithValue(e,t){const i=[];for(let s=0,r=e.length;s!==r;++s){const o=e[s];o.id in t&&i.push(o)}return i}}function ph(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const J_=37297;let Q_=0;function ey(n,e){const t=n.split(`
`),i=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){const a=o+1;i.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return i.join(`
`)}const mh=new We;function ty(n){et._getMatrix(mh,et.workingColorSpace,n);const e=`mat3( ${mh.elements.map(t=>t.toFixed(4))} )`;switch(et.getTransfer(n)){case Zo:return[e,"LinearTransferOETF"];case lt:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function gh(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),r=(n.getShaderInfoLog(e)||"").trim();if(i&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+ey(n.getShaderSource(e),a)}else return r}function ny(n,e){const t=ty(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function iy(n,e){let t;switch(e){case Bp:t="Linear";break;case Hp:t="Reinhard";break;case zp:t="Cineon";break;case Md:t="ACESFilmic";break;case Gp:t="AgX";break;case Wp:t="Neutral";break;case Vp:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Mo=new k;function sy(){et.getLuminanceCoefficients(Mo);const n=Mo.x.toFixed(4),e=Mo.y.toFixed(4),t=Mo.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function ry(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(mr).join(`
`)}function oy(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function ay(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){const r=n.getActiveAttrib(e,s),o=r.name;let a=1;r.type===n.FLOAT_MAT2&&(a=2),r.type===n.FLOAT_MAT3&&(a=3),r.type===n.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:n.getAttribLocation(e,o),locationSize:a}}return t}function mr(n){return n!==""}function vh(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function _h(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const ly=/^[ \t]*#include +<([\w\d./]+)>/gm;function gc(n){return n.replace(ly,uy)}const cy=new Map;function uy(n,e){let t=qe[e];if(t===void 0){const i=cy.get(e);if(i!==void 0)t=qe[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return gc(t)}const hy=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function yh(n){return n.replace(hy,dy)}function dy(n,e,t,i){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function xh(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function fy(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===yd?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===xd?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===ii&&(e="SHADOWMAP_TYPE_VSM"),e}function py(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case zs:case Vs:e="ENVMAP_TYPE_CUBE";break;case fa:e="ENVMAP_TYPE_CUBE_UV";break}return e}function my(n){let e="ENVMAP_MODE_REFLECTION";return n.envMap&&n.envMapMode===Vs&&(e="ENVMAP_MODE_REFRACTION"),e}function gy(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case bd:e="ENVMAP_BLENDING_MULTIPLY";break;case Fp:e="ENVMAP_BLENDING_MIX";break;case kp:e="ENVMAP_BLENDING_ADD";break}return e}function vy(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function _y(n,e,t,i){const s=n.getContext(),r=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=fy(t),c=py(t),u=my(t),f=gy(t),d=vy(t),h=ry(t),v=oy(r),g=s.createProgram();let m,p,S=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v].filter(mr).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v].filter(mr).join(`
`),p.length>0&&(p+=`
`)):(m=[xh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(mr).join(`
`),p=[xh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+f:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Ri?"#define TONE_MAPPING":"",t.toneMapping!==Ri?qe.tonemapping_pars_fragment:"",t.toneMapping!==Ri?iy("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",qe.colorspace_pars_fragment,ny("linearToOutputTexel",t.outputColorSpace),sy(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(mr).join(`
`)),o=gc(o),o=vh(o,t),o=_h(o,t),a=gc(a),a=vh(a,t),a=_h(a,t),o=yh(o),a=yh(a),t.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,m=[h,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===yu?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===yu?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const E=S+m+o,_=S+p+a,M=ph(s,s.VERTEX_SHADER,E),x=ph(s,s.FRAGMENT_SHADER,_);s.attachShader(g,M),s.attachShader(g,x),t.index0AttributeName!==void 0?s.bindAttribLocation(g,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(g,0,"position"),s.linkProgram(g);function w(P){if(n.debug.checkShaderErrors){const N=s.getProgramInfoLog(g)||"",U=s.getShaderInfoLog(M)||"",I=s.getShaderInfoLog(x)||"",F=N.trim(),B=U.trim(),L=I.trim();let A=!0,H=!0;if(s.getProgramParameter(g,s.LINK_STATUS)===!1)if(A=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,g,M,x);else{const V=gh(s,M,"vertex"),Z=gh(s,x,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(g,s.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+F+`
`+V+`
`+Z)}else F!==""?console.warn("THREE.WebGLProgram: Program Info Log:",F):(B===""||L==="")&&(H=!1);H&&(P.diagnostics={runnable:A,programLog:F,vertexShader:{log:B,prefix:m},fragmentShader:{log:L,prefix:p}})}s.deleteShader(M),s.deleteShader(x),R=new zo(s,g),y=ay(s,g)}let R;this.getUniforms=function(){return R===void 0&&w(this),R};let y;this.getAttributes=function(){return y===void 0&&w(this),y};let b=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return b===!1&&(b=s.getProgramParameter(g,J_)),b},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(g),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Q_++,this.cacheKey=e,this.usedTimes=1,this.program=g,this.vertexShader=M,this.fragmentShader=x,this}let yy=0;class xy{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new by(e),t.set(e,i)),i}}class by{constructor(e){this.id=yy++,this.code=e,this.usedTimes=0}}function My(n,e,t,i,s,r,o){const a=new Gc,l=new xy,c=new Set,u=[],f=s.logarithmicDepthBuffer,d=s.vertexTextures;let h=s.precision;const v={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(y){return c.add(y),y===0?"uv":`uv${y}`}function m(y,b,P,N,U){const I=N.fog,F=U.geometry,B=y.isMeshStandardMaterial?N.environment:null,L=(y.isMeshStandardMaterial?t:e).get(y.envMap||B),A=L&&L.mapping===fa?L.image.height:null,H=v[y.type];y.precision!==null&&(h=s.getMaxPrecision(y.precision),h!==y.precision&&console.warn("THREE.WebGLProgram.getParameters:",y.precision,"not supported, using",h,"instead."));const V=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,Z=V!==void 0?V.length:0;let le=0;F.morphAttributes.position!==void 0&&(le=1),F.morphAttributes.normal!==void 0&&(le=2),F.morphAttributes.color!==void 0&&(le=3);let ve,Oe,K,G;if(H){const st=kn[H];ve=st.vertexShader,Oe=st.fragmentShader}else ve=y.vertexShader,Oe=y.fragmentShader,l.update(y),K=l.getVertexShaderID(y),G=l.getFragmentShaderID(y);const q=n.getRenderTarget(),ne=n.state.buffers.depth.getReversed(),Ie=U.isInstancedMesh===!0,_e=U.isBatchedMesh===!0,Le=!!y.map,tt=!!y.matcap,O=!!L,pt=!!y.aoMap,Ve=!!y.lightMap,ke=!!y.bumpMap,we=!!y.normalMap,mt=!!y.displacementMap,Te=!!y.emissiveMap,Xe=!!y.metalnessMap,Ut=!!y.roughnessMap,At=y.anisotropy>0,D=y.clearcoat>0,T=y.dispersion>0,$=y.iridescence>0,Q=y.sheen>0,te=y.transmission>0,J=At&&!!y.anisotropyMap,Pe=D&&!!y.clearcoatMap,ce=D&&!!y.clearcoatNormalMap,Ae=D&&!!y.clearcoatRoughnessMap,Ce=$&&!!y.iridescenceMap,re=$&&!!y.iridescenceThicknessMap,me=Q&&!!y.sheenColorMap,Fe=Q&&!!y.sheenRoughnessMap,Re=!!y.specularMap,fe=!!y.specularColorMap,Ge=!!y.specularIntensityMap,z=te&&!!y.transmissionMap,oe=te&&!!y.thicknessMap,he=!!y.gradientMap,xe=!!y.alphaMap,ie=y.alphaTest>0,ee=!!y.alphaHash,Me=!!y.extensions;let ze=Ri;y.toneMapped&&(q===null||q.isXRRenderTarget===!0)&&(ze=n.toneMapping);const ut={shaderID:H,shaderType:y.type,shaderName:y.name,vertexShader:ve,fragmentShader:Oe,defines:y.defines,customVertexShaderID:K,customFragmentShaderID:G,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:h,batching:_e,batchingColor:_e&&U._colorsTexture!==null,instancing:Ie,instancingColor:Ie&&U.instanceColor!==null,instancingMorph:Ie&&U.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:q===null?n.outputColorSpace:q.isXRRenderTarget===!0?q.texture.colorSpace:Gs,alphaToCoverage:!!y.alphaToCoverage,map:Le,matcap:tt,envMap:O,envMapMode:O&&L.mapping,envMapCubeUVHeight:A,aoMap:pt,lightMap:Ve,bumpMap:ke,normalMap:we,displacementMap:d&&mt,emissiveMap:Te,normalMapObjectSpace:we&&y.normalMapType===jp,normalMapTangentSpace:we&&y.normalMapType===Id,metalnessMap:Xe,roughnessMap:Ut,anisotropy:At,anisotropyMap:J,clearcoat:D,clearcoatMap:Pe,clearcoatNormalMap:ce,clearcoatRoughnessMap:Ae,dispersion:T,iridescence:$,iridescenceMap:Ce,iridescenceThicknessMap:re,sheen:Q,sheenColorMap:me,sheenRoughnessMap:Fe,specularMap:Re,specularColorMap:fe,specularIntensityMap:Ge,transmission:te,transmissionMap:z,thicknessMap:oe,gradientMap:he,opaque:y.transparent===!1&&y.blending===Os&&y.alphaToCoverage===!1,alphaMap:xe,alphaTest:ie,alphaHash:ee,combine:y.combine,mapUv:Le&&g(y.map.channel),aoMapUv:pt&&g(y.aoMap.channel),lightMapUv:Ve&&g(y.lightMap.channel),bumpMapUv:ke&&g(y.bumpMap.channel),normalMapUv:we&&g(y.normalMap.channel),displacementMapUv:mt&&g(y.displacementMap.channel),emissiveMapUv:Te&&g(y.emissiveMap.channel),metalnessMapUv:Xe&&g(y.metalnessMap.channel),roughnessMapUv:Ut&&g(y.roughnessMap.channel),anisotropyMapUv:J&&g(y.anisotropyMap.channel),clearcoatMapUv:Pe&&g(y.clearcoatMap.channel),clearcoatNormalMapUv:ce&&g(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ae&&g(y.clearcoatRoughnessMap.channel),iridescenceMapUv:Ce&&g(y.iridescenceMap.channel),iridescenceThicknessMapUv:re&&g(y.iridescenceThicknessMap.channel),sheenColorMapUv:me&&g(y.sheenColorMap.channel),sheenRoughnessMapUv:Fe&&g(y.sheenRoughnessMap.channel),specularMapUv:Re&&g(y.specularMap.channel),specularColorMapUv:fe&&g(y.specularColorMap.channel),specularIntensityMapUv:Ge&&g(y.specularIntensityMap.channel),transmissionMapUv:z&&g(y.transmissionMap.channel),thicknessMapUv:oe&&g(y.thicknessMap.channel),alphaMapUv:xe&&g(y.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(we||At),vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,pointsUvs:U.isPoints===!0&&!!F.attributes.uv&&(Le||xe),fog:!!I,useFog:y.fog===!0,fogExp2:!!I&&I.isFogExp2,flatShading:y.flatShading===!0&&y.wireframe===!1,sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:ne,skinning:U.isSkinnedMesh===!0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:Z,morphTextureStride:le,numDirLights:b.directional.length,numPointLights:b.point.length,numSpotLights:b.spot.length,numSpotLightMaps:b.spotLightMap.length,numRectAreaLights:b.rectArea.length,numHemiLights:b.hemi.length,numDirLightShadows:b.directionalShadowMap.length,numPointLightShadows:b.pointShadowMap.length,numSpotLightShadows:b.spotShadowMap.length,numSpotLightShadowsWithMaps:b.numSpotLightShadowsWithMaps,numLightProbes:b.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:y.dithering,shadowMapEnabled:n.shadowMap.enabled&&P.length>0,shadowMapType:n.shadowMap.type,toneMapping:ze,decodeVideoTexture:Le&&y.map.isVideoTexture===!0&&et.getTransfer(y.map.colorSpace)===lt,decodeVideoTextureEmissive:Te&&y.emissiveMap.isVideoTexture===!0&&et.getTransfer(y.emissiveMap.colorSpace)===lt,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===Yt,flipSided:y.side===Zt,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:Me&&y.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Me&&y.extensions.multiDraw===!0||_e)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return ut.vertexUv1s=c.has(1),ut.vertexUv2s=c.has(2),ut.vertexUv3s=c.has(3),c.clear(),ut}function p(y){const b=[];if(y.shaderID?b.push(y.shaderID):(b.push(y.customVertexShaderID),b.push(y.customFragmentShaderID)),y.defines!==void 0)for(const P in y.defines)b.push(P),b.push(y.defines[P]);return y.isRawShaderMaterial===!1&&(S(b,y),E(b,y),b.push(n.outputColorSpace)),b.push(y.customProgramCacheKey),b.join()}function S(y,b){y.push(b.precision),y.push(b.outputColorSpace),y.push(b.envMapMode),y.push(b.envMapCubeUVHeight),y.push(b.mapUv),y.push(b.alphaMapUv),y.push(b.lightMapUv),y.push(b.aoMapUv),y.push(b.bumpMapUv),y.push(b.normalMapUv),y.push(b.displacementMapUv),y.push(b.emissiveMapUv),y.push(b.metalnessMapUv),y.push(b.roughnessMapUv),y.push(b.anisotropyMapUv),y.push(b.clearcoatMapUv),y.push(b.clearcoatNormalMapUv),y.push(b.clearcoatRoughnessMapUv),y.push(b.iridescenceMapUv),y.push(b.iridescenceThicknessMapUv),y.push(b.sheenColorMapUv),y.push(b.sheenRoughnessMapUv),y.push(b.specularMapUv),y.push(b.specularColorMapUv),y.push(b.specularIntensityMapUv),y.push(b.transmissionMapUv),y.push(b.thicknessMapUv),y.push(b.combine),y.push(b.fogExp2),y.push(b.sizeAttenuation),y.push(b.morphTargetsCount),y.push(b.morphAttributeCount),y.push(b.numDirLights),y.push(b.numPointLights),y.push(b.numSpotLights),y.push(b.numSpotLightMaps),y.push(b.numHemiLights),y.push(b.numRectAreaLights),y.push(b.numDirLightShadows),y.push(b.numPointLightShadows),y.push(b.numSpotLightShadows),y.push(b.numSpotLightShadowsWithMaps),y.push(b.numLightProbes),y.push(b.shadowMapType),y.push(b.toneMapping),y.push(b.numClippingPlanes),y.push(b.numClipIntersection),y.push(b.depthPacking)}function E(y,b){a.disableAll(),b.supportsVertexTextures&&a.enable(0),b.instancing&&a.enable(1),b.instancingColor&&a.enable(2),b.instancingMorph&&a.enable(3),b.matcap&&a.enable(4),b.envMap&&a.enable(5),b.normalMapObjectSpace&&a.enable(6),b.normalMapTangentSpace&&a.enable(7),b.clearcoat&&a.enable(8),b.iridescence&&a.enable(9),b.alphaTest&&a.enable(10),b.vertexColors&&a.enable(11),b.vertexAlphas&&a.enable(12),b.vertexUv1s&&a.enable(13),b.vertexUv2s&&a.enable(14),b.vertexUv3s&&a.enable(15),b.vertexTangents&&a.enable(16),b.anisotropy&&a.enable(17),b.alphaHash&&a.enable(18),b.batching&&a.enable(19),b.dispersion&&a.enable(20),b.batchingColor&&a.enable(21),b.gradientMap&&a.enable(22),y.push(a.mask),a.disableAll(),b.fog&&a.enable(0),b.useFog&&a.enable(1),b.flatShading&&a.enable(2),b.logarithmicDepthBuffer&&a.enable(3),b.reversedDepthBuffer&&a.enable(4),b.skinning&&a.enable(5),b.morphTargets&&a.enable(6),b.morphNormals&&a.enable(7),b.morphColors&&a.enable(8),b.premultipliedAlpha&&a.enable(9),b.shadowMapEnabled&&a.enable(10),b.doubleSided&&a.enable(11),b.flipSided&&a.enable(12),b.useDepthPacking&&a.enable(13),b.dithering&&a.enable(14),b.transmission&&a.enable(15),b.sheen&&a.enable(16),b.opaque&&a.enable(17),b.pointsUvs&&a.enable(18),b.decodeVideoTexture&&a.enable(19),b.decodeVideoTextureEmissive&&a.enable(20),b.alphaToCoverage&&a.enable(21),y.push(a.mask)}function _(y){const b=v[y.type];let P;if(b){const N=kn[b];P=ea.clone(N.uniforms)}else P=y.uniforms;return P}function M(y,b){let P;for(let N=0,U=u.length;N<U;N++){const I=u[N];if(I.cacheKey===b){P=I,++P.usedTimes;break}}return P===void 0&&(P=new _y(n,b,y,r),u.push(P)),P}function x(y){if(--y.usedTimes===0){const b=u.indexOf(y);u[b]=u[u.length-1],u.pop(),y.destroy()}}function w(y){l.remove(y)}function R(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:_,acquireProgram:M,releaseProgram:x,releaseShaderCache:w,programs:u,dispose:R}}function Sy(){let n=new WeakMap;function e(o){return n.has(o)}function t(o){let a=n.get(o);return a===void 0&&(a={},n.set(o,a)),a}function i(o){n.delete(o)}function s(o,a,l){n.get(o)[a]=l}function r(){n=new WeakMap}return{has:e,get:t,remove:i,update:s,dispose:r}}function Ey(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function bh(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function Mh(){const n=[];let e=0;const t=[],i=[],s=[];function r(){e=0,t.length=0,i.length=0,s.length=0}function o(f,d,h,v,g,m){let p=n[e];return p===void 0?(p={id:f.id,object:f,geometry:d,material:h,groupOrder:v,renderOrder:f.renderOrder,z:g,group:m},n[e]=p):(p.id=f.id,p.object=f,p.geometry=d,p.material=h,p.groupOrder=v,p.renderOrder=f.renderOrder,p.z=g,p.group=m),e++,p}function a(f,d,h,v,g,m){const p=o(f,d,h,v,g,m);h.transmission>0?i.push(p):h.transparent===!0?s.push(p):t.push(p)}function l(f,d,h,v,g,m){const p=o(f,d,h,v,g,m);h.transmission>0?i.unshift(p):h.transparent===!0?s.unshift(p):t.unshift(p)}function c(f,d){t.length>1&&t.sort(f||Ey),i.length>1&&i.sort(d||bh),s.length>1&&s.sort(d||bh)}function u(){for(let f=e,d=n.length;f<d;f++){const h=n[f];if(h.id===null)break;h.id=null,h.object=null,h.geometry=null,h.material=null,h.group=null}}return{opaque:t,transmissive:i,transparent:s,init:r,push:a,unshift:l,finish:u,sort:c}}function wy(){let n=new WeakMap;function e(i,s){const r=n.get(i);let o;return r===void 0?(o=new Mh,n.set(i,[o])):s>=r.length?(o=new Mh,r.push(o)):o=r[s],o}function t(){n=new WeakMap}return{get:e,dispose:t}}function Ty(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new k,color:new Se};break;case"SpotLight":t={position:new k,direction:new k,color:new Se,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new k,color:new Se,distance:0,decay:0};break;case"HemisphereLight":t={direction:new k,skyColor:new Se,groundColor:new Se};break;case"RectAreaLight":t={color:new Se,position:new k,halfWidth:new k,halfHeight:new k};break}return n[e.id]=t,t}}}function Ay(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ee};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ee};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ee,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let Cy=0;function Ry(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function Py(n){const e=new Ty,t=Ay(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new k);const s=new k,r=new it,o=new it;function a(c){let u=0,f=0,d=0;for(let y=0;y<9;y++)i.probe[y].set(0,0,0);let h=0,v=0,g=0,m=0,p=0,S=0,E=0,_=0,M=0,x=0,w=0;c.sort(Ry);for(let y=0,b=c.length;y<b;y++){const P=c[y],N=P.color,U=P.intensity,I=P.distance,F=P.shadow&&P.shadow.map?P.shadow.map.texture:null;if(P.isAmbientLight)u+=N.r*U,f+=N.g*U,d+=N.b*U;else if(P.isLightProbe){for(let B=0;B<9;B++)i.probe[B].addScaledVector(P.sh.coefficients[B],U);w++}else if(P.isDirectionalLight){const B=e.get(P);if(B.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){const L=P.shadow,A=t.get(P);A.shadowIntensity=L.intensity,A.shadowBias=L.bias,A.shadowNormalBias=L.normalBias,A.shadowRadius=L.radius,A.shadowMapSize=L.mapSize,i.directionalShadow[h]=A,i.directionalShadowMap[h]=F,i.directionalShadowMatrix[h]=P.shadow.matrix,S++}i.directional[h]=B,h++}else if(P.isSpotLight){const B=e.get(P);B.position.setFromMatrixPosition(P.matrixWorld),B.color.copy(N).multiplyScalar(U),B.distance=I,B.coneCos=Math.cos(P.angle),B.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),B.decay=P.decay,i.spot[g]=B;const L=P.shadow;if(P.map&&(i.spotLightMap[M]=P.map,M++,L.updateMatrices(P),P.castShadow&&x++),i.spotLightMatrix[g]=L.matrix,P.castShadow){const A=t.get(P);A.shadowIntensity=L.intensity,A.shadowBias=L.bias,A.shadowNormalBias=L.normalBias,A.shadowRadius=L.radius,A.shadowMapSize=L.mapSize,i.spotShadow[g]=A,i.spotShadowMap[g]=F,_++}g++}else if(P.isRectAreaLight){const B=e.get(P);B.color.copy(N).multiplyScalar(U),B.halfWidth.set(P.width*.5,0,0),B.halfHeight.set(0,P.height*.5,0),i.rectArea[m]=B,m++}else if(P.isPointLight){const B=e.get(P);if(B.color.copy(P.color).multiplyScalar(P.intensity),B.distance=P.distance,B.decay=P.decay,P.castShadow){const L=P.shadow,A=t.get(P);A.shadowIntensity=L.intensity,A.shadowBias=L.bias,A.shadowNormalBias=L.normalBias,A.shadowRadius=L.radius,A.shadowMapSize=L.mapSize,A.shadowCameraNear=L.camera.near,A.shadowCameraFar=L.camera.far,i.pointShadow[v]=A,i.pointShadowMap[v]=F,i.pointShadowMatrix[v]=P.shadow.matrix,E++}i.point[v]=B,v++}else if(P.isHemisphereLight){const B=e.get(P);B.skyColor.copy(P.color).multiplyScalar(U),B.groundColor.copy(P.groundColor).multiplyScalar(U),i.hemi[p]=B,p++}}m>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=de.LTC_FLOAT_1,i.rectAreaLTC2=de.LTC_FLOAT_2):(i.rectAreaLTC1=de.LTC_HALF_1,i.rectAreaLTC2=de.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=f,i.ambient[2]=d;const R=i.hash;(R.directionalLength!==h||R.pointLength!==v||R.spotLength!==g||R.rectAreaLength!==m||R.hemiLength!==p||R.numDirectionalShadows!==S||R.numPointShadows!==E||R.numSpotShadows!==_||R.numSpotMaps!==M||R.numLightProbes!==w)&&(i.directional.length=h,i.spot.length=g,i.rectArea.length=m,i.point.length=v,i.hemi.length=p,i.directionalShadow.length=S,i.directionalShadowMap.length=S,i.pointShadow.length=E,i.pointShadowMap.length=E,i.spotShadow.length=_,i.spotShadowMap.length=_,i.directionalShadowMatrix.length=S,i.pointShadowMatrix.length=E,i.spotLightMatrix.length=_+M-x,i.spotLightMap.length=M,i.numSpotLightShadowsWithMaps=x,i.numLightProbes=w,R.directionalLength=h,R.pointLength=v,R.spotLength=g,R.rectAreaLength=m,R.hemiLength=p,R.numDirectionalShadows=S,R.numPointShadows=E,R.numSpotShadows=_,R.numSpotMaps=M,R.numLightProbes=w,i.version=Cy++)}function l(c,u){let f=0,d=0,h=0,v=0,g=0;const m=u.matrixWorldInverse;for(let p=0,S=c.length;p<S;p++){const E=c[p];if(E.isDirectionalLight){const _=i.directional[f];_.direction.setFromMatrixPosition(E.matrixWorld),s.setFromMatrixPosition(E.target.matrixWorld),_.direction.sub(s),_.direction.transformDirection(m),f++}else if(E.isSpotLight){const _=i.spot[h];_.position.setFromMatrixPosition(E.matrixWorld),_.position.applyMatrix4(m),_.direction.setFromMatrixPosition(E.matrixWorld),s.setFromMatrixPosition(E.target.matrixWorld),_.direction.sub(s),_.direction.transformDirection(m),h++}else if(E.isRectAreaLight){const _=i.rectArea[v];_.position.setFromMatrixPosition(E.matrixWorld),_.position.applyMatrix4(m),o.identity(),r.copy(E.matrixWorld),r.premultiply(m),o.extractRotation(r),_.halfWidth.set(E.width*.5,0,0),_.halfHeight.set(0,E.height*.5,0),_.halfWidth.applyMatrix4(o),_.halfHeight.applyMatrix4(o),v++}else if(E.isPointLight){const _=i.point[d];_.position.setFromMatrixPosition(E.matrixWorld),_.position.applyMatrix4(m),d++}else if(E.isHemisphereLight){const _=i.hemi[g];_.direction.setFromMatrixPosition(E.matrixWorld),_.direction.transformDirection(m),g++}}}return{setup:a,setupView:l,state:i}}function Sh(n){const e=new Py(n),t=[],i=[];function s(u){c.camera=u,t.length=0,i.length=0}function r(u){t.push(u)}function o(u){i.push(u)}function a(){e.setup(t)}function l(u){e.setupView(t,u)}const c={lightsArray:t,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:a,setupLightsView:l,pushLight:r,pushShadow:o}}function Iy(n){let e=new WeakMap;function t(s,r=0){const o=e.get(s);let a;return o===void 0?(a=new Sh(n),e.set(s,[a])):r>=o.length?(a=new Sh(n),o.push(a)):a=o[r],a}function i(){e=new WeakMap}return{get:t,dispose:i}}const Ly=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Dy=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Ny(n,e,t){let i=new Xc;const s=new Ee,r=new Ee,o=new ot,a=new eg({depthPacking:$p}),l=new tg,c={},u=t.maxTextureSize,f={[Ii]:Zt,[Zt]:Ii,[Yt]:Yt},d=new Lt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ee},radius:{value:4}},vertexShader:Ly,fragmentShader:Dy}),h=d.clone();h.defines.HORIZONTAL_PASS=1;const v=new ft;v.setAttribute("position",new bt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const g=new ae(v,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=yd;let p=this.type;this.render=function(x,w,R){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||x.length===0)return;const y=n.getRenderTarget(),b=n.getActiveCubeFace(),P=n.getActiveMipmapLevel(),N=n.state;N.setBlending(di),N.buffers.depth.getReversed()===!0?N.buffers.color.setClear(0,0,0,0):N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);const U=p!==ii&&this.type===ii,I=p===ii&&this.type!==ii;for(let F=0,B=x.length;F<B;F++){const L=x[F],A=L.shadow;if(A===void 0){console.warn("THREE.WebGLShadowMap:",L,"has no shadow.");continue}if(A.autoUpdate===!1&&A.needsUpdate===!1)continue;s.copy(A.mapSize);const H=A.getFrameExtents();if(s.multiply(H),r.copy(A.mapSize),(s.x>u||s.y>u)&&(s.x>u&&(r.x=Math.floor(u/H.x),s.x=r.x*H.x,A.mapSize.x=r.x),s.y>u&&(r.y=Math.floor(u/H.y),s.y=r.y*H.y,A.mapSize.y=r.y)),A.map===null||U===!0||I===!0){const Z=this.type!==ii?{minFilter:an,magFilter:an}:{};A.map!==null&&A.map.dispose(),A.map=new Cn(s.x,s.y,Z),A.map.texture.name=L.name+".shadowMap",A.camera.updateProjectionMatrix()}n.setRenderTarget(A.map),n.clear();const V=A.getViewportCount();for(let Z=0;Z<V;Z++){const le=A.getViewport(Z);o.set(r.x*le.x,r.y*le.y,r.x*le.z,r.y*le.w),N.viewport(o),A.updateMatrices(L,Z),i=A.getFrustum(),_(w,R,A.camera,L,this.type)}A.isPointLightShadow!==!0&&this.type===ii&&S(A,R),A.needsUpdate=!1}p=this.type,m.needsUpdate=!1,n.setRenderTarget(y,b,P)};function S(x,w){const R=e.update(g);d.defines.VSM_SAMPLES!==x.blurSamples&&(d.defines.VSM_SAMPLES=x.blurSamples,h.defines.VSM_SAMPLES=x.blurSamples,d.needsUpdate=!0,h.needsUpdate=!0),x.mapPass===null&&(x.mapPass=new Cn(s.x,s.y)),d.uniforms.shadow_pass.value=x.map.texture,d.uniforms.resolution.value=x.mapSize,d.uniforms.radius.value=x.radius,n.setRenderTarget(x.mapPass),n.clear(),n.renderBufferDirect(w,null,R,d,g,null),h.uniforms.shadow_pass.value=x.mapPass.texture,h.uniforms.resolution.value=x.mapSize,h.uniforms.radius.value=x.radius,n.setRenderTarget(x.map),n.clear(),n.renderBufferDirect(w,null,R,h,g,null)}function E(x,w,R,y){let b=null;const P=R.isPointLight===!0?x.customDistanceMaterial:x.customDepthMaterial;if(P!==void 0)b=P;else if(b=R.isPointLight===!0?l:a,n.localClippingEnabled&&w.clipShadows===!0&&Array.isArray(w.clippingPlanes)&&w.clippingPlanes.length!==0||w.displacementMap&&w.displacementScale!==0||w.alphaMap&&w.alphaTest>0||w.map&&w.alphaTest>0||w.alphaToCoverage===!0){const N=b.uuid,U=w.uuid;let I=c[N];I===void 0&&(I={},c[N]=I);let F=I[U];F===void 0&&(F=b.clone(),I[U]=F,w.addEventListener("dispose",M)),b=F}if(b.visible=w.visible,b.wireframe=w.wireframe,y===ii?b.side=w.shadowSide!==null?w.shadowSide:w.side:b.side=w.shadowSide!==null?w.shadowSide:f[w.side],b.alphaMap=w.alphaMap,b.alphaTest=w.alphaToCoverage===!0?.5:w.alphaTest,b.map=w.map,b.clipShadows=w.clipShadows,b.clippingPlanes=w.clippingPlanes,b.clipIntersection=w.clipIntersection,b.displacementMap=w.displacementMap,b.displacementScale=w.displacementScale,b.displacementBias=w.displacementBias,b.wireframeLinewidth=w.wireframeLinewidth,b.linewidth=w.linewidth,R.isPointLight===!0&&b.isMeshDistanceMaterial===!0){const N=n.properties.get(b);N.light=R}return b}function _(x,w,R,y,b){if(x.visible===!1)return;if(x.layers.test(w.layers)&&(x.isMesh||x.isLine||x.isPoints)&&(x.castShadow||x.receiveShadow&&b===ii)&&(!x.frustumCulled||i.intersectsObject(x))){x.modelViewMatrix.multiplyMatrices(R.matrixWorldInverse,x.matrixWorld);const U=e.update(x),I=x.material;if(Array.isArray(I)){const F=U.groups;for(let B=0,L=F.length;B<L;B++){const A=F[B],H=I[A.materialIndex];if(H&&H.visible){const V=E(x,H,y,b);x.onBeforeShadow(n,x,w,R,U,V,A),n.renderBufferDirect(R,null,U,V,x,A),x.onAfterShadow(n,x,w,R,U,V,A)}}}else if(I.visible){const F=E(x,I,y,b);x.onBeforeShadow(n,x,w,R,U,F,null),n.renderBufferDirect(R,null,U,F,x,null),x.onAfterShadow(n,x,w,R,U,F,null)}}const N=x.children;for(let U=0,I=N.length;U<I;U++)_(N[U],w,R,y,b)}function M(x){x.target.removeEventListener("dispose",M);for(const R in c){const y=c[R],b=x.target.uuid;b in y&&(y[b].dispose(),delete y[b])}}}const Uy={[Rl]:Pl,[Il]:Nl,[Ll]:Ul,[Hs]:Dl,[Pl]:Rl,[Nl]:Il,[Ul]:Ll,[Dl]:Hs};function Oy(n,e){function t(){let z=!1;const oe=new ot;let he=null;const xe=new ot(0,0,0,0);return{setMask:function(ie){he!==ie&&!z&&(n.colorMask(ie,ie,ie,ie),he=ie)},setLocked:function(ie){z=ie},setClear:function(ie,ee,Me,ze,ut){ut===!0&&(ie*=ze,ee*=ze,Me*=ze),oe.set(ie,ee,Me,ze),xe.equals(oe)===!1&&(n.clearColor(ie,ee,Me,ze),xe.copy(oe))},reset:function(){z=!1,he=null,xe.set(-1,0,0,0)}}}function i(){let z=!1,oe=!1,he=null,xe=null,ie=null;return{setReversed:function(ee){if(oe!==ee){const Me=e.get("EXT_clip_control");ee?Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.ZERO_TO_ONE_EXT):Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.NEGATIVE_ONE_TO_ONE_EXT),oe=ee;const ze=ie;ie=null,this.setClear(ze)}},getReversed:function(){return oe},setTest:function(ee){ee?q(n.DEPTH_TEST):ne(n.DEPTH_TEST)},setMask:function(ee){he!==ee&&!z&&(n.depthMask(ee),he=ee)},setFunc:function(ee){if(oe&&(ee=Uy[ee]),xe!==ee){switch(ee){case Rl:n.depthFunc(n.NEVER);break;case Pl:n.depthFunc(n.ALWAYS);break;case Il:n.depthFunc(n.LESS);break;case Hs:n.depthFunc(n.LEQUAL);break;case Ll:n.depthFunc(n.EQUAL);break;case Dl:n.depthFunc(n.GEQUAL);break;case Nl:n.depthFunc(n.GREATER);break;case Ul:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}xe=ee}},setLocked:function(ee){z=ee},setClear:function(ee){ie!==ee&&(oe&&(ee=1-ee),n.clearDepth(ee),ie=ee)},reset:function(){z=!1,he=null,xe=null,ie=null,oe=!1}}}function s(){let z=!1,oe=null,he=null,xe=null,ie=null,ee=null,Me=null,ze=null,ut=null;return{setTest:function(st){z||(st?q(n.STENCIL_TEST):ne(n.STENCIL_TEST))},setMask:function(st){oe!==st&&!z&&(n.stencilMask(st),oe=st)},setFunc:function(st,Zn,Dn){(he!==st||xe!==Zn||ie!==Dn)&&(n.stencilFunc(st,Zn,Dn),he=st,xe=Zn,ie=Dn)},setOp:function(st,Zn,Dn){(ee!==st||Me!==Zn||ze!==Dn)&&(n.stencilOp(st,Zn,Dn),ee=st,Me=Zn,ze=Dn)},setLocked:function(st){z=st},setClear:function(st){ut!==st&&(n.clearStencil(st),ut=st)},reset:function(){z=!1,oe=null,he=null,xe=null,ie=null,ee=null,Me=null,ze=null,ut=null}}}const r=new t,o=new i,a=new s,l=new WeakMap,c=new WeakMap;let u={},f={},d=new WeakMap,h=[],v=null,g=!1,m=null,p=null,S=null,E=null,_=null,M=null,x=null,w=new Se(0,0,0),R=0,y=!1,b=null,P=null,N=null,U=null,I=null;const F=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let B=!1,L=0;const A=n.getParameter(n.VERSION);A.indexOf("WebGL")!==-1?(L=parseFloat(/^WebGL (\d)/.exec(A)[1]),B=L>=1):A.indexOf("OpenGL ES")!==-1&&(L=parseFloat(/^OpenGL ES (\d)/.exec(A)[1]),B=L>=2);let H=null,V={};const Z=n.getParameter(n.SCISSOR_BOX),le=n.getParameter(n.VIEWPORT),ve=new ot().fromArray(Z),Oe=new ot().fromArray(le);function K(z,oe,he,xe){const ie=new Uint8Array(4),ee=n.createTexture();n.bindTexture(z,ee),n.texParameteri(z,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(z,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Me=0;Me<he;Me++)z===n.TEXTURE_3D||z===n.TEXTURE_2D_ARRAY?n.texImage3D(oe,0,n.RGBA,1,1,xe,0,n.RGBA,n.UNSIGNED_BYTE,ie):n.texImage2D(oe+Me,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,ie);return ee}const G={};G[n.TEXTURE_2D]=K(n.TEXTURE_2D,n.TEXTURE_2D,1),G[n.TEXTURE_CUBE_MAP]=K(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),G[n.TEXTURE_2D_ARRAY]=K(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),G[n.TEXTURE_3D]=K(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),q(n.DEPTH_TEST),o.setFunc(Hs),ke(!1),we(mu),q(n.CULL_FACE),pt(di);function q(z){u[z]!==!0&&(n.enable(z),u[z]=!0)}function ne(z){u[z]!==!1&&(n.disable(z),u[z]=!1)}function Ie(z,oe){return f[z]!==oe?(n.bindFramebuffer(z,oe),f[z]=oe,z===n.DRAW_FRAMEBUFFER&&(f[n.FRAMEBUFFER]=oe),z===n.FRAMEBUFFER&&(f[n.DRAW_FRAMEBUFFER]=oe),!0):!1}function _e(z,oe){let he=h,xe=!1;if(z){he=d.get(oe),he===void 0&&(he=[],d.set(oe,he));const ie=z.textures;if(he.length!==ie.length||he[0]!==n.COLOR_ATTACHMENT0){for(let ee=0,Me=ie.length;ee<Me;ee++)he[ee]=n.COLOR_ATTACHMENT0+ee;he.length=ie.length,xe=!0}}else he[0]!==n.BACK&&(he[0]=n.BACK,xe=!0);xe&&n.drawBuffers(he)}function Le(z){return v!==z?(n.useProgram(z),v=z,!0):!1}const tt={[Yi]:n.FUNC_ADD,[xp]:n.FUNC_SUBTRACT,[bp]:n.FUNC_REVERSE_SUBTRACT};tt[Mp]=n.MIN,tt[Sp]=n.MAX;const O={[Ep]:n.ZERO,[wp]:n.ONE,[Tp]:n.SRC_COLOR,[Al]:n.SRC_ALPHA,[Lp]:n.SRC_ALPHA_SATURATE,[Pp]:n.DST_COLOR,[Cp]:n.DST_ALPHA,[Ap]:n.ONE_MINUS_SRC_COLOR,[Cl]:n.ONE_MINUS_SRC_ALPHA,[Ip]:n.ONE_MINUS_DST_COLOR,[Rp]:n.ONE_MINUS_DST_ALPHA,[Dp]:n.CONSTANT_COLOR,[Np]:n.ONE_MINUS_CONSTANT_COLOR,[Up]:n.CONSTANT_ALPHA,[Op]:n.ONE_MINUS_CONSTANT_ALPHA};function pt(z,oe,he,xe,ie,ee,Me,ze,ut,st){if(z===di){g===!0&&(ne(n.BLEND),g=!1);return}if(g===!1&&(q(n.BLEND),g=!0),z!==yp){if(z!==m||st!==y){if((p!==Yi||_!==Yi)&&(n.blendEquation(n.FUNC_ADD),p=Yi,_=Yi),st)switch(z){case Os:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case is:n.blendFunc(n.ONE,n.ONE);break;case gu:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case vu:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",z);break}else switch(z){case Os:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case is:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case gu:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case vu:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",z);break}S=null,E=null,M=null,x=null,w.set(0,0,0),R=0,m=z,y=st}return}ie=ie||oe,ee=ee||he,Me=Me||xe,(oe!==p||ie!==_)&&(n.blendEquationSeparate(tt[oe],tt[ie]),p=oe,_=ie),(he!==S||xe!==E||ee!==M||Me!==x)&&(n.blendFuncSeparate(O[he],O[xe],O[ee],O[Me]),S=he,E=xe,M=ee,x=Me),(ze.equals(w)===!1||ut!==R)&&(n.blendColor(ze.r,ze.g,ze.b,ut),w.copy(ze),R=ut),m=z,y=!1}function Ve(z,oe){z.side===Yt?ne(n.CULL_FACE):q(n.CULL_FACE);let he=z.side===Zt;oe&&(he=!he),ke(he),z.blending===Os&&z.transparent===!1?pt(di):pt(z.blending,z.blendEquation,z.blendSrc,z.blendDst,z.blendEquationAlpha,z.blendSrcAlpha,z.blendDstAlpha,z.blendColor,z.blendAlpha,z.premultipliedAlpha),o.setFunc(z.depthFunc),o.setTest(z.depthTest),o.setMask(z.depthWrite),r.setMask(z.colorWrite);const xe=z.stencilWrite;a.setTest(xe),xe&&(a.setMask(z.stencilWriteMask),a.setFunc(z.stencilFunc,z.stencilRef,z.stencilFuncMask),a.setOp(z.stencilFail,z.stencilZFail,z.stencilZPass)),Te(z.polygonOffset,z.polygonOffsetFactor,z.polygonOffsetUnits),z.alphaToCoverage===!0?q(n.SAMPLE_ALPHA_TO_COVERAGE):ne(n.SAMPLE_ALPHA_TO_COVERAGE)}function ke(z){b!==z&&(z?n.frontFace(n.CW):n.frontFace(n.CCW),b=z)}function we(z){z!==vp?(q(n.CULL_FACE),z!==P&&(z===mu?n.cullFace(n.BACK):z===_p?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):ne(n.CULL_FACE),P=z}function mt(z){z!==N&&(B&&n.lineWidth(z),N=z)}function Te(z,oe,he){z?(q(n.POLYGON_OFFSET_FILL),(U!==oe||I!==he)&&(n.polygonOffset(oe,he),U=oe,I=he)):ne(n.POLYGON_OFFSET_FILL)}function Xe(z){z?q(n.SCISSOR_TEST):ne(n.SCISSOR_TEST)}function Ut(z){z===void 0&&(z=n.TEXTURE0+F-1),H!==z&&(n.activeTexture(z),H=z)}function At(z,oe,he){he===void 0&&(H===null?he=n.TEXTURE0+F-1:he=H);let xe=V[he];xe===void 0&&(xe={type:void 0,texture:void 0},V[he]=xe),(xe.type!==z||xe.texture!==oe)&&(H!==he&&(n.activeTexture(he),H=he),n.bindTexture(z,oe||G[z]),xe.type=z,xe.texture=oe)}function D(){const z=V[H];z!==void 0&&z.type!==void 0&&(n.bindTexture(z.type,null),z.type=void 0,z.texture=void 0)}function T(){try{n.compressedTexImage2D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function $(){try{n.compressedTexImage3D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function Q(){try{n.texSubImage2D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function te(){try{n.texSubImage3D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function J(){try{n.compressedTexSubImage2D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function Pe(){try{n.compressedTexSubImage3D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function ce(){try{n.texStorage2D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function Ae(){try{n.texStorage3D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function Ce(){try{n.texImage2D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function re(){try{n.texImage3D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function me(z){ve.equals(z)===!1&&(n.scissor(z.x,z.y,z.z,z.w),ve.copy(z))}function Fe(z){Oe.equals(z)===!1&&(n.viewport(z.x,z.y,z.z,z.w),Oe.copy(z))}function Re(z,oe){let he=c.get(oe);he===void 0&&(he=new WeakMap,c.set(oe,he));let xe=he.get(z);xe===void 0&&(xe=n.getUniformBlockIndex(oe,z.name),he.set(z,xe))}function fe(z,oe){const xe=c.get(oe).get(z);l.get(oe)!==xe&&(n.uniformBlockBinding(oe,xe,z.__bindingPointIndex),l.set(oe,xe))}function Ge(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),o.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),u={},H=null,V={},f={},d=new WeakMap,h=[],v=null,g=!1,m=null,p=null,S=null,E=null,_=null,M=null,x=null,w=new Se(0,0,0),R=0,y=!1,b=null,P=null,N=null,U=null,I=null,ve.set(0,0,n.canvas.width,n.canvas.height),Oe.set(0,0,n.canvas.width,n.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:q,disable:ne,bindFramebuffer:Ie,drawBuffers:_e,useProgram:Le,setBlending:pt,setMaterial:Ve,setFlipSided:ke,setCullFace:we,setLineWidth:mt,setPolygonOffset:Te,setScissorTest:Xe,activeTexture:Ut,bindTexture:At,unbindTexture:D,compressedTexImage2D:T,compressedTexImage3D:$,texImage2D:Ce,texImage3D:re,updateUBOMapping:Re,uniformBlockBinding:fe,texStorage2D:ce,texStorage3D:Ae,texSubImage2D:Q,texSubImage3D:te,compressedTexSubImage2D:J,compressedTexSubImage3D:Pe,scissor:me,viewport:Fe,reset:Ge}}function Fy(n,e,t,i,s,r,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Ee,u=new WeakMap;let f;const d=new WeakMap;let h=!1;try{h=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function v(D,T){return h?new OffscreenCanvas(D,T):Qo("canvas")}function g(D,T,$){let Q=1;const te=At(D);if((te.width>$||te.height>$)&&(Q=$/Math.max(te.width,te.height)),Q<1)if(typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&D instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&D instanceof ImageBitmap||typeof VideoFrame<"u"&&D instanceof VideoFrame){const J=Math.floor(Q*te.width),Pe=Math.floor(Q*te.height);f===void 0&&(f=v(J,Pe));const ce=T?v(J,Pe):f;return ce.width=J,ce.height=Pe,ce.getContext("2d").drawImage(D,0,0,J,Pe),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+te.width+"x"+te.height+") to ("+J+"x"+Pe+")."),ce}else return"data"in D&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+te.width+"x"+te.height+")."),D;return D}function m(D){return D.generateMipmaps}function p(D){n.generateMipmap(D)}function S(D){return D.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:D.isWebGL3DRenderTarget?n.TEXTURE_3D:D.isWebGLArrayRenderTarget||D.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function E(D,T,$,Q,te=!1){if(D!==null){if(n[D]!==void 0)return n[D];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+D+"'")}let J=T;if(T===n.RED&&($===n.FLOAT&&(J=n.R32F),$===n.HALF_FLOAT&&(J=n.R16F),$===n.UNSIGNED_BYTE&&(J=n.R8)),T===n.RED_INTEGER&&($===n.UNSIGNED_BYTE&&(J=n.R8UI),$===n.UNSIGNED_SHORT&&(J=n.R16UI),$===n.UNSIGNED_INT&&(J=n.R32UI),$===n.BYTE&&(J=n.R8I),$===n.SHORT&&(J=n.R16I),$===n.INT&&(J=n.R32I)),T===n.RG&&($===n.FLOAT&&(J=n.RG32F),$===n.HALF_FLOAT&&(J=n.RG16F),$===n.UNSIGNED_BYTE&&(J=n.RG8)),T===n.RG_INTEGER&&($===n.UNSIGNED_BYTE&&(J=n.RG8UI),$===n.UNSIGNED_SHORT&&(J=n.RG16UI),$===n.UNSIGNED_INT&&(J=n.RG32UI),$===n.BYTE&&(J=n.RG8I),$===n.SHORT&&(J=n.RG16I),$===n.INT&&(J=n.RG32I)),T===n.RGB_INTEGER&&($===n.UNSIGNED_BYTE&&(J=n.RGB8UI),$===n.UNSIGNED_SHORT&&(J=n.RGB16UI),$===n.UNSIGNED_INT&&(J=n.RGB32UI),$===n.BYTE&&(J=n.RGB8I),$===n.SHORT&&(J=n.RGB16I),$===n.INT&&(J=n.RGB32I)),T===n.RGBA_INTEGER&&($===n.UNSIGNED_BYTE&&(J=n.RGBA8UI),$===n.UNSIGNED_SHORT&&(J=n.RGBA16UI),$===n.UNSIGNED_INT&&(J=n.RGBA32UI),$===n.BYTE&&(J=n.RGBA8I),$===n.SHORT&&(J=n.RGBA16I),$===n.INT&&(J=n.RGBA32I)),T===n.RGB&&($===n.UNSIGNED_INT_5_9_9_9_REV&&(J=n.RGB9_E5),$===n.UNSIGNED_INT_10F_11F_11F_REV&&(J=n.R11F_G11F_B10F)),T===n.RGBA){const Pe=te?Zo:et.getTransfer(Q);$===n.FLOAT&&(J=n.RGBA32F),$===n.HALF_FLOAT&&(J=n.RGBA16F),$===n.UNSIGNED_BYTE&&(J=Pe===lt?n.SRGB8_ALPHA8:n.RGBA8),$===n.UNSIGNED_SHORT_4_4_4_4&&(J=n.RGBA4),$===n.UNSIGNED_SHORT_5_5_5_1&&(J=n.RGB5_A1)}return(J===n.R16F||J===n.R32F||J===n.RG16F||J===n.RG32F||J===n.RGBA16F||J===n.RGBA32F)&&e.get("EXT_color_buffer_float"),J}function _(D,T){let $;return D?T===null||T===ss||T===Er?$=n.DEPTH24_STENCIL8:T===Wn?$=n.DEPTH32F_STENCIL8:T===Sr&&($=n.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===ss||T===Er?$=n.DEPTH_COMPONENT24:T===Wn?$=n.DEPTH_COMPONENT32F:T===Sr&&($=n.DEPTH_COMPONENT16),$}function M(D,T){return m(D)===!0||D.isFramebufferTexture&&D.minFilter!==an&&D.minFilter!==Tn?Math.log2(Math.max(T.width,T.height))+1:D.mipmaps!==void 0&&D.mipmaps.length>0?D.mipmaps.length:D.isCompressedTexture&&Array.isArray(D.image)?T.mipmaps.length:1}function x(D){const T=D.target;T.removeEventListener("dispose",x),R(T),T.isVideoTexture&&u.delete(T)}function w(D){const T=D.target;T.removeEventListener("dispose",w),b(T)}function R(D){const T=i.get(D);if(T.__webglInit===void 0)return;const $=D.source,Q=d.get($);if(Q){const te=Q[T.__cacheKey];te.usedTimes--,te.usedTimes===0&&y(D),Object.keys(Q).length===0&&d.delete($)}i.remove(D)}function y(D){const T=i.get(D);n.deleteTexture(T.__webglTexture);const $=D.source,Q=d.get($);delete Q[T.__cacheKey],o.memory.textures--}function b(D){const T=i.get(D);if(D.depthTexture&&(D.depthTexture.dispose(),i.remove(D.depthTexture)),D.isWebGLCubeRenderTarget)for(let Q=0;Q<6;Q++){if(Array.isArray(T.__webglFramebuffer[Q]))for(let te=0;te<T.__webglFramebuffer[Q].length;te++)n.deleteFramebuffer(T.__webglFramebuffer[Q][te]);else n.deleteFramebuffer(T.__webglFramebuffer[Q]);T.__webglDepthbuffer&&n.deleteRenderbuffer(T.__webglDepthbuffer[Q])}else{if(Array.isArray(T.__webglFramebuffer))for(let Q=0;Q<T.__webglFramebuffer.length;Q++)n.deleteFramebuffer(T.__webglFramebuffer[Q]);else n.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&n.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&n.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let Q=0;Q<T.__webglColorRenderbuffer.length;Q++)T.__webglColorRenderbuffer[Q]&&n.deleteRenderbuffer(T.__webglColorRenderbuffer[Q]);T.__webglDepthRenderbuffer&&n.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const $=D.textures;for(let Q=0,te=$.length;Q<te;Q++){const J=i.get($[Q]);J.__webglTexture&&(n.deleteTexture(J.__webglTexture),o.memory.textures--),i.remove($[Q])}i.remove(D)}let P=0;function N(){P=0}function U(){const D=P;return D>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+D+" texture units while this GPU supports only "+s.maxTextures),P+=1,D}function I(D){const T=[];return T.push(D.wrapS),T.push(D.wrapT),T.push(D.wrapR||0),T.push(D.magFilter),T.push(D.minFilter),T.push(D.anisotropy),T.push(D.internalFormat),T.push(D.format),T.push(D.type),T.push(D.generateMipmaps),T.push(D.premultiplyAlpha),T.push(D.flipY),T.push(D.unpackAlignment),T.push(D.colorSpace),T.join()}function F(D,T){const $=i.get(D);if(D.isVideoTexture&&Xe(D),D.isRenderTargetTexture===!1&&D.isExternalTexture!==!0&&D.version>0&&$.__version!==D.version){const Q=D.image;if(Q===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Q.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{G($,D,T);return}}else D.isExternalTexture&&($.__webglTexture=D.sourceTexture?D.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,$.__webglTexture,n.TEXTURE0+T)}function B(D,T){const $=i.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&$.__version!==D.version){G($,D,T);return}t.bindTexture(n.TEXTURE_2D_ARRAY,$.__webglTexture,n.TEXTURE0+T)}function L(D,T){const $=i.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&$.__version!==D.version){G($,D,T);return}t.bindTexture(n.TEXTURE_3D,$.__webglTexture,n.TEXTURE0+T)}function A(D,T){const $=i.get(D);if(D.version>0&&$.__version!==D.version){q($,D,T);return}t.bindTexture(n.TEXTURE_CUBE_MAP,$.__webglTexture,n.TEXTURE0+T)}const H={[Ko]:n.REPEAT,[Qi]:n.CLAMP_TO_EDGE,[kl]:n.MIRRORED_REPEAT},V={[an]:n.NEAREST,[Xp]:n.NEAREST_MIPMAP_NEAREST,[$r]:n.NEAREST_MIPMAP_LINEAR,[Tn]:n.LINEAR,[Pa]:n.LINEAR_MIPMAP_NEAREST,[es]:n.LINEAR_MIPMAP_LINEAR},Z={[Yp]:n.NEVER,[tm]:n.ALWAYS,[Kp]:n.LESS,[Ld]:n.LEQUAL,[Zp]:n.EQUAL,[em]:n.GEQUAL,[Jp]:n.GREATER,[Qp]:n.NOTEQUAL};function le(D,T){if(T.type===Wn&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===Tn||T.magFilter===Pa||T.magFilter===$r||T.magFilter===es||T.minFilter===Tn||T.minFilter===Pa||T.minFilter===$r||T.minFilter===es)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(D,n.TEXTURE_WRAP_S,H[T.wrapS]),n.texParameteri(D,n.TEXTURE_WRAP_T,H[T.wrapT]),(D===n.TEXTURE_3D||D===n.TEXTURE_2D_ARRAY)&&n.texParameteri(D,n.TEXTURE_WRAP_R,H[T.wrapR]),n.texParameteri(D,n.TEXTURE_MAG_FILTER,V[T.magFilter]),n.texParameteri(D,n.TEXTURE_MIN_FILTER,V[T.minFilter]),T.compareFunction&&(n.texParameteri(D,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(D,n.TEXTURE_COMPARE_FUNC,Z[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===an||T.minFilter!==$r&&T.minFilter!==es||T.type===Wn&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||i.get(T).__currentAnisotropy){const $=e.get("EXT_texture_filter_anisotropic");n.texParameterf(D,$.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,s.getMaxAnisotropy())),i.get(T).__currentAnisotropy=T.anisotropy}}}function ve(D,T){let $=!1;D.__webglInit===void 0&&(D.__webglInit=!0,T.addEventListener("dispose",x));const Q=T.source;let te=d.get(Q);te===void 0&&(te={},d.set(Q,te));const J=I(T);if(J!==D.__cacheKey){te[J]===void 0&&(te[J]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,$=!0),te[J].usedTimes++;const Pe=te[D.__cacheKey];Pe!==void 0&&(te[D.__cacheKey].usedTimes--,Pe.usedTimes===0&&y(T)),D.__cacheKey=J,D.__webglTexture=te[J].texture}return $}function Oe(D,T,$){return Math.floor(Math.floor(D/$)/T)}function K(D,T,$,Q){const J=D.updateRanges;if(J.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,T.width,T.height,$,Q,T.data);else{J.sort((re,me)=>re.start-me.start);let Pe=0;for(let re=1;re<J.length;re++){const me=J[Pe],Fe=J[re],Re=me.start+me.count,fe=Oe(Fe.start,T.width,4),Ge=Oe(me.start,T.width,4);Fe.start<=Re+1&&fe===Ge&&Oe(Fe.start+Fe.count-1,T.width,4)===fe?me.count=Math.max(me.count,Fe.start+Fe.count-me.start):(++Pe,J[Pe]=Fe)}J.length=Pe+1;const ce=n.getParameter(n.UNPACK_ROW_LENGTH),Ae=n.getParameter(n.UNPACK_SKIP_PIXELS),Ce=n.getParameter(n.UNPACK_SKIP_ROWS);n.pixelStorei(n.UNPACK_ROW_LENGTH,T.width);for(let re=0,me=J.length;re<me;re++){const Fe=J[re],Re=Math.floor(Fe.start/4),fe=Math.ceil(Fe.count/4),Ge=Re%T.width,z=Math.floor(Re/T.width),oe=fe,he=1;n.pixelStorei(n.UNPACK_SKIP_PIXELS,Ge),n.pixelStorei(n.UNPACK_SKIP_ROWS,z),t.texSubImage2D(n.TEXTURE_2D,0,Ge,z,oe,he,$,Q,T.data)}D.clearUpdateRanges(),n.pixelStorei(n.UNPACK_ROW_LENGTH,ce),n.pixelStorei(n.UNPACK_SKIP_PIXELS,Ae),n.pixelStorei(n.UNPACK_SKIP_ROWS,Ce)}}function G(D,T,$){let Q=n.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(Q=n.TEXTURE_2D_ARRAY),T.isData3DTexture&&(Q=n.TEXTURE_3D);const te=ve(D,T),J=T.source;t.bindTexture(Q,D.__webglTexture,n.TEXTURE0+$);const Pe=i.get(J);if(J.version!==Pe.__version||te===!0){t.activeTexture(n.TEXTURE0+$);const ce=et.getPrimaries(et.workingColorSpace),Ae=T.colorSpace===Ai?null:et.getPrimaries(T.colorSpace),Ce=T.colorSpace===Ai||ce===Ae?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,T.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,T.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ce);let re=g(T.image,!1,s.maxTextureSize);re=Ut(T,re);const me=r.convert(T.format,T.colorSpace),Fe=r.convert(T.type);let Re=E(T.internalFormat,me,Fe,T.colorSpace,T.isVideoTexture);le(Q,T);let fe;const Ge=T.mipmaps,z=T.isVideoTexture!==!0,oe=Pe.__version===void 0||te===!0,he=J.dataReady,xe=M(T,re);if(T.isDepthTexture)Re=_(T.format===Tr,T.type),oe&&(z?t.texStorage2D(n.TEXTURE_2D,1,Re,re.width,re.height):t.texImage2D(n.TEXTURE_2D,0,Re,re.width,re.height,0,me,Fe,null));else if(T.isDataTexture)if(Ge.length>0){z&&oe&&t.texStorage2D(n.TEXTURE_2D,xe,Re,Ge[0].width,Ge[0].height);for(let ie=0,ee=Ge.length;ie<ee;ie++)fe=Ge[ie],z?he&&t.texSubImage2D(n.TEXTURE_2D,ie,0,0,fe.width,fe.height,me,Fe,fe.data):t.texImage2D(n.TEXTURE_2D,ie,Re,fe.width,fe.height,0,me,Fe,fe.data);T.generateMipmaps=!1}else z?(oe&&t.texStorage2D(n.TEXTURE_2D,xe,Re,re.width,re.height),he&&K(T,re,me,Fe)):t.texImage2D(n.TEXTURE_2D,0,Re,re.width,re.height,0,me,Fe,re.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){z&&oe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,xe,Re,Ge[0].width,Ge[0].height,re.depth);for(let ie=0,ee=Ge.length;ie<ee;ie++)if(fe=Ge[ie],T.format!==_n)if(me!==null)if(z){if(he)if(T.layerUpdates.size>0){const Me=Qu(fe.width,fe.height,T.format,T.type);for(const ze of T.layerUpdates){const ut=fe.data.subarray(ze*Me/fe.data.BYTES_PER_ELEMENT,(ze+1)*Me/fe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ie,0,0,ze,fe.width,fe.height,1,me,ut)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ie,0,0,0,fe.width,fe.height,re.depth,me,fe.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,ie,Re,fe.width,fe.height,re.depth,0,fe.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else z?he&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,ie,0,0,0,fe.width,fe.height,re.depth,me,Fe,fe.data):t.texImage3D(n.TEXTURE_2D_ARRAY,ie,Re,fe.width,fe.height,re.depth,0,me,Fe,fe.data)}else{z&&oe&&t.texStorage2D(n.TEXTURE_2D,xe,Re,Ge[0].width,Ge[0].height);for(let ie=0,ee=Ge.length;ie<ee;ie++)fe=Ge[ie],T.format!==_n?me!==null?z?he&&t.compressedTexSubImage2D(n.TEXTURE_2D,ie,0,0,fe.width,fe.height,me,fe.data):t.compressedTexImage2D(n.TEXTURE_2D,ie,Re,fe.width,fe.height,0,fe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):z?he&&t.texSubImage2D(n.TEXTURE_2D,ie,0,0,fe.width,fe.height,me,Fe,fe.data):t.texImage2D(n.TEXTURE_2D,ie,Re,fe.width,fe.height,0,me,Fe,fe.data)}else if(T.isDataArrayTexture)if(z){if(oe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,xe,Re,re.width,re.height,re.depth),he)if(T.layerUpdates.size>0){const ie=Qu(re.width,re.height,T.format,T.type);for(const ee of T.layerUpdates){const Me=re.data.subarray(ee*ie/re.data.BYTES_PER_ELEMENT,(ee+1)*ie/re.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,ee,re.width,re.height,1,me,Fe,Me)}T.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,re.width,re.height,re.depth,me,Fe,re.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,Re,re.width,re.height,re.depth,0,me,Fe,re.data);else if(T.isData3DTexture)z?(oe&&t.texStorage3D(n.TEXTURE_3D,xe,Re,re.width,re.height,re.depth),he&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,re.width,re.height,re.depth,me,Fe,re.data)):t.texImage3D(n.TEXTURE_3D,0,Re,re.width,re.height,re.depth,0,me,Fe,re.data);else if(T.isFramebufferTexture){if(oe)if(z)t.texStorage2D(n.TEXTURE_2D,xe,Re,re.width,re.height);else{let ie=re.width,ee=re.height;for(let Me=0;Me<xe;Me++)t.texImage2D(n.TEXTURE_2D,Me,Re,ie,ee,0,me,Fe,null),ie>>=1,ee>>=1}}else if(Ge.length>0){if(z&&oe){const ie=At(Ge[0]);t.texStorage2D(n.TEXTURE_2D,xe,Re,ie.width,ie.height)}for(let ie=0,ee=Ge.length;ie<ee;ie++)fe=Ge[ie],z?he&&t.texSubImage2D(n.TEXTURE_2D,ie,0,0,me,Fe,fe):t.texImage2D(n.TEXTURE_2D,ie,Re,me,Fe,fe);T.generateMipmaps=!1}else if(z){if(oe){const ie=At(re);t.texStorage2D(n.TEXTURE_2D,xe,Re,ie.width,ie.height)}he&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,me,Fe,re)}else t.texImage2D(n.TEXTURE_2D,0,Re,me,Fe,re);m(T)&&p(Q),Pe.__version=J.version,T.onUpdate&&T.onUpdate(T)}D.__version=T.version}function q(D,T,$){if(T.image.length!==6)return;const Q=ve(D,T),te=T.source;t.bindTexture(n.TEXTURE_CUBE_MAP,D.__webglTexture,n.TEXTURE0+$);const J=i.get(te);if(te.version!==J.__version||Q===!0){t.activeTexture(n.TEXTURE0+$);const Pe=et.getPrimaries(et.workingColorSpace),ce=T.colorSpace===Ai?null:et.getPrimaries(T.colorSpace),Ae=T.colorSpace===Ai||Pe===ce?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,T.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,T.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ae);const Ce=T.isCompressedTexture||T.image[0].isCompressedTexture,re=T.image[0]&&T.image[0].isDataTexture,me=[];for(let ee=0;ee<6;ee++)!Ce&&!re?me[ee]=g(T.image[ee],!0,s.maxCubemapSize):me[ee]=re?T.image[ee].image:T.image[ee],me[ee]=Ut(T,me[ee]);const Fe=me[0],Re=r.convert(T.format,T.colorSpace),fe=r.convert(T.type),Ge=E(T.internalFormat,Re,fe,T.colorSpace),z=T.isVideoTexture!==!0,oe=J.__version===void 0||Q===!0,he=te.dataReady;let xe=M(T,Fe);le(n.TEXTURE_CUBE_MAP,T);let ie;if(Ce){z&&oe&&t.texStorage2D(n.TEXTURE_CUBE_MAP,xe,Ge,Fe.width,Fe.height);for(let ee=0;ee<6;ee++){ie=me[ee].mipmaps;for(let Me=0;Me<ie.length;Me++){const ze=ie[Me];T.format!==_n?Re!==null?z?he&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,0,0,ze.width,ze.height,Re,ze.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,Ge,ze.width,ze.height,0,ze.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):z?he&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,0,0,ze.width,ze.height,Re,fe,ze.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,Ge,ze.width,ze.height,0,Re,fe,ze.data)}}}else{if(ie=T.mipmaps,z&&oe){ie.length>0&&xe++;const ee=At(me[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,xe,Ge,ee.width,ee.height)}for(let ee=0;ee<6;ee++)if(re){z?he&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,me[ee].width,me[ee].height,Re,fe,me[ee].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,Ge,me[ee].width,me[ee].height,0,Re,fe,me[ee].data);for(let Me=0;Me<ie.length;Me++){const ut=ie[Me].image[ee].image;z?he&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,0,0,ut.width,ut.height,Re,fe,ut.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,Ge,ut.width,ut.height,0,Re,fe,ut.data)}}else{z?he&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,Re,fe,me[ee]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,Ge,Re,fe,me[ee]);for(let Me=0;Me<ie.length;Me++){const ze=ie[Me];z?he&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,0,0,Re,fe,ze.image[ee]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,Ge,Re,fe,ze.image[ee])}}}m(T)&&p(n.TEXTURE_CUBE_MAP),J.__version=te.version,T.onUpdate&&T.onUpdate(T)}D.__version=T.version}function ne(D,T,$,Q,te,J){const Pe=r.convert($.format,$.colorSpace),ce=r.convert($.type),Ae=E($.internalFormat,Pe,ce,$.colorSpace),Ce=i.get(T),re=i.get($);if(re.__renderTarget=T,!Ce.__hasExternalTextures){const me=Math.max(1,T.width>>J),Fe=Math.max(1,T.height>>J);te===n.TEXTURE_3D||te===n.TEXTURE_2D_ARRAY?t.texImage3D(te,J,Ae,me,Fe,T.depth,0,Pe,ce,null):t.texImage2D(te,J,Ae,me,Fe,0,Pe,ce,null)}t.bindFramebuffer(n.FRAMEBUFFER,D),Te(T)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,Q,te,re.__webglTexture,0,mt(T)):(te===n.TEXTURE_2D||te>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&te<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,Q,te,re.__webglTexture,J),t.bindFramebuffer(n.FRAMEBUFFER,null)}function Ie(D,T,$){if(n.bindRenderbuffer(n.RENDERBUFFER,D),T.depthBuffer){const Q=T.depthTexture,te=Q&&Q.isDepthTexture?Q.type:null,J=_(T.stencilBuffer,te),Pe=T.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ce=mt(T);Te(T)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ce,J,T.width,T.height):$?n.renderbufferStorageMultisample(n.RENDERBUFFER,ce,J,T.width,T.height):n.renderbufferStorage(n.RENDERBUFFER,J,T.width,T.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,Pe,n.RENDERBUFFER,D)}else{const Q=T.textures;for(let te=0;te<Q.length;te++){const J=Q[te],Pe=r.convert(J.format,J.colorSpace),ce=r.convert(J.type),Ae=E(J.internalFormat,Pe,ce,J.colorSpace),Ce=mt(T);$&&Te(T)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,Ce,Ae,T.width,T.height):Te(T)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Ce,Ae,T.width,T.height):n.renderbufferStorage(n.RENDERBUFFER,Ae,T.width,T.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function _e(D,T){if(T&&T.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,D),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const Q=i.get(T.depthTexture);Q.__renderTarget=T,(!Q.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),F(T.depthTexture,0);const te=Q.__webglTexture,J=mt(T);if(T.depthTexture.format===wr)Te(T)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,te,0,J):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,te,0);else if(T.depthTexture.format===Tr)Te(T)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,te,0,J):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,te,0);else throw new Error("Unknown depthTexture format")}function Le(D){const T=i.get(D),$=D.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==D.depthTexture){const Q=D.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),Q){const te=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,Q.removeEventListener("dispose",te)};Q.addEventListener("dispose",te),T.__depthDisposeCallback=te}T.__boundDepthTexture=Q}if(D.depthTexture&&!T.__autoAllocateDepthBuffer){if($)throw new Error("target.depthTexture not supported in Cube render targets");const Q=D.texture.mipmaps;Q&&Q.length>0?_e(T.__webglFramebuffer[0],D):_e(T.__webglFramebuffer,D)}else if($){T.__webglDepthbuffer=[];for(let Q=0;Q<6;Q++)if(t.bindFramebuffer(n.FRAMEBUFFER,T.__webglFramebuffer[Q]),T.__webglDepthbuffer[Q]===void 0)T.__webglDepthbuffer[Q]=n.createRenderbuffer(),Ie(T.__webglDepthbuffer[Q],D,!1);else{const te=D.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,J=T.__webglDepthbuffer[Q];n.bindRenderbuffer(n.RENDERBUFFER,J),n.framebufferRenderbuffer(n.FRAMEBUFFER,te,n.RENDERBUFFER,J)}}else{const Q=D.texture.mipmaps;if(Q&&Q.length>0?t.bindFramebuffer(n.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=n.createRenderbuffer(),Ie(T.__webglDepthbuffer,D,!1);else{const te=D.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,J=T.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,J),n.framebufferRenderbuffer(n.FRAMEBUFFER,te,n.RENDERBUFFER,J)}}t.bindFramebuffer(n.FRAMEBUFFER,null)}function tt(D,T,$){const Q=i.get(D);T!==void 0&&ne(Q.__webglFramebuffer,D,D.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),$!==void 0&&Le(D)}function O(D){const T=D.texture,$=i.get(D),Q=i.get(T);D.addEventListener("dispose",w);const te=D.textures,J=D.isWebGLCubeRenderTarget===!0,Pe=te.length>1;if(Pe||(Q.__webglTexture===void 0&&(Q.__webglTexture=n.createTexture()),Q.__version=T.version,o.memory.textures++),J){$.__webglFramebuffer=[];for(let ce=0;ce<6;ce++)if(T.mipmaps&&T.mipmaps.length>0){$.__webglFramebuffer[ce]=[];for(let Ae=0;Ae<T.mipmaps.length;Ae++)$.__webglFramebuffer[ce][Ae]=n.createFramebuffer()}else $.__webglFramebuffer[ce]=n.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){$.__webglFramebuffer=[];for(let ce=0;ce<T.mipmaps.length;ce++)$.__webglFramebuffer[ce]=n.createFramebuffer()}else $.__webglFramebuffer=n.createFramebuffer();if(Pe)for(let ce=0,Ae=te.length;ce<Ae;ce++){const Ce=i.get(te[ce]);Ce.__webglTexture===void 0&&(Ce.__webglTexture=n.createTexture(),o.memory.textures++)}if(D.samples>0&&Te(D)===!1){$.__webglMultisampledFramebuffer=n.createFramebuffer(),$.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,$.__webglMultisampledFramebuffer);for(let ce=0;ce<te.length;ce++){const Ae=te[ce];$.__webglColorRenderbuffer[ce]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,$.__webglColorRenderbuffer[ce]);const Ce=r.convert(Ae.format,Ae.colorSpace),re=r.convert(Ae.type),me=E(Ae.internalFormat,Ce,re,Ae.colorSpace,D.isXRRenderTarget===!0),Fe=mt(D);n.renderbufferStorageMultisample(n.RENDERBUFFER,Fe,me,D.width,D.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ce,n.RENDERBUFFER,$.__webglColorRenderbuffer[ce])}n.bindRenderbuffer(n.RENDERBUFFER,null),D.depthBuffer&&($.__webglDepthRenderbuffer=n.createRenderbuffer(),Ie($.__webglDepthRenderbuffer,D,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(J){t.bindTexture(n.TEXTURE_CUBE_MAP,Q.__webglTexture),le(n.TEXTURE_CUBE_MAP,T);for(let ce=0;ce<6;ce++)if(T.mipmaps&&T.mipmaps.length>0)for(let Ae=0;Ae<T.mipmaps.length;Ae++)ne($.__webglFramebuffer[ce][Ae],D,T,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ce,Ae);else ne($.__webglFramebuffer[ce],D,T,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ce,0);m(T)&&p(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Pe){for(let ce=0,Ae=te.length;ce<Ae;ce++){const Ce=te[ce],re=i.get(Ce);let me=n.TEXTURE_2D;(D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(me=D.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(me,re.__webglTexture),le(me,Ce),ne($.__webglFramebuffer,D,Ce,n.COLOR_ATTACHMENT0+ce,me,0),m(Ce)&&p(me)}t.unbindTexture()}else{let ce=n.TEXTURE_2D;if((D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(ce=D.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(ce,Q.__webglTexture),le(ce,T),T.mipmaps&&T.mipmaps.length>0)for(let Ae=0;Ae<T.mipmaps.length;Ae++)ne($.__webglFramebuffer[Ae],D,T,n.COLOR_ATTACHMENT0,ce,Ae);else ne($.__webglFramebuffer,D,T,n.COLOR_ATTACHMENT0,ce,0);m(T)&&p(ce),t.unbindTexture()}D.depthBuffer&&Le(D)}function pt(D){const T=D.textures;for(let $=0,Q=T.length;$<Q;$++){const te=T[$];if(m(te)){const J=S(D),Pe=i.get(te).__webglTexture;t.bindTexture(J,Pe),p(J),t.unbindTexture()}}}const Ve=[],ke=[];function we(D){if(D.samples>0){if(Te(D)===!1){const T=D.textures,$=D.width,Q=D.height;let te=n.COLOR_BUFFER_BIT;const J=D.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Pe=i.get(D),ce=T.length>1;if(ce)for(let Ce=0;Ce<T.length;Ce++)t.bindFramebuffer(n.FRAMEBUFFER,Pe.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ce,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,Pe.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ce,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,Pe.__webglMultisampledFramebuffer);const Ae=D.texture.mipmaps;Ae&&Ae.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Pe.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Pe.__webglFramebuffer);for(let Ce=0;Ce<T.length;Ce++){if(D.resolveDepthBuffer&&(D.depthBuffer&&(te|=n.DEPTH_BUFFER_BIT),D.stencilBuffer&&D.resolveStencilBuffer&&(te|=n.STENCIL_BUFFER_BIT)),ce){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Pe.__webglColorRenderbuffer[Ce]);const re=i.get(T[Ce]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,re,0)}n.blitFramebuffer(0,0,$,Q,0,0,$,Q,te,n.NEAREST),l===!0&&(Ve.length=0,ke.length=0,Ve.push(n.COLOR_ATTACHMENT0+Ce),D.depthBuffer&&D.resolveDepthBuffer===!1&&(Ve.push(J),ke.push(J),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,ke)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Ve))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),ce)for(let Ce=0;Ce<T.length;Ce++){t.bindFramebuffer(n.FRAMEBUFFER,Pe.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ce,n.RENDERBUFFER,Pe.__webglColorRenderbuffer[Ce]);const re=i.get(T[Ce]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,Pe.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ce,n.TEXTURE_2D,re,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Pe.__webglMultisampledFramebuffer)}else if(D.depthBuffer&&D.resolveDepthBuffer===!1&&l){const T=D.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[T])}}}function mt(D){return Math.min(s.maxSamples,D.samples)}function Te(D){const T=i.get(D);return D.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function Xe(D){const T=o.render.frame;u.get(D)!==T&&(u.set(D,T),D.update())}function Ut(D,T){const $=D.colorSpace,Q=D.format,te=D.type;return D.isCompressedTexture===!0||D.isVideoTexture===!0||$!==Gs&&$!==Ai&&(et.getTransfer($)===lt?(Q!==_n||te!==Yn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",$)),T}function At(D){return typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement?(c.width=D.naturalWidth||D.width,c.height=D.naturalHeight||D.height):typeof VideoFrame<"u"&&D instanceof VideoFrame?(c.width=D.displayWidth,c.height=D.displayHeight):(c.width=D.width,c.height=D.height),c}this.allocateTextureUnit=U,this.resetTextureUnits=N,this.setTexture2D=F,this.setTexture2DArray=B,this.setTexture3D=L,this.setTextureCube=A,this.rebindTextures=tt,this.setupRenderTarget=O,this.updateRenderTargetMipmap=pt,this.updateMultisampleRenderTarget=we,this.setupDepthRenderbuffer=Le,this.setupFrameBufferTexture=ne,this.useMultisampledRTT=Te}function ky(n,e){function t(i,s=Ai){let r;const o=et.getTransfer(s);if(i===Yn)return n.UNSIGNED_BYTE;if(i===Uc)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Oc)return n.UNSIGNED_SHORT_5_5_5_1;if(i===Td)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Ad)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===Ed)return n.BYTE;if(i===wd)return n.SHORT;if(i===Sr)return n.UNSIGNED_SHORT;if(i===Nc)return n.INT;if(i===ss)return n.UNSIGNED_INT;if(i===Wn)return n.FLOAT;if(i===fi)return n.HALF_FLOAT;if(i===Cd)return n.ALPHA;if(i===Rd)return n.RGB;if(i===_n)return n.RGBA;if(i===wr)return n.DEPTH_COMPONENT;if(i===Tr)return n.DEPTH_STENCIL;if(i===Fc)return n.RED;if(i===kc)return n.RED_INTEGER;if(i===Pd)return n.RG;if(i===Bc)return n.RG_INTEGER;if(i===Hc)return n.RGBA_INTEGER;if(i===Fo||i===ko||i===Bo||i===Ho)if(o===lt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===Fo)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===ko)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Bo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Ho)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===Fo)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===ko)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Bo)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Ho)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Bl||i===Hl||i===zl||i===Vl)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===Bl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Hl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===zl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Vl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Gl||i===Wl||i===Xl)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(i===Gl||i===Wl)return o===lt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===Xl)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===ql||i===$l||i===jl||i===Yl||i===Kl||i===Zl||i===Jl||i===Ql||i===ec||i===tc||i===nc||i===ic||i===sc||i===rc)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(i===ql)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===$l)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===jl)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Yl)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Kl)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Zl)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Jl)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Ql)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===ec)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===tc)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===nc)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===ic)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===sc)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===rc)return o===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===oc||i===ac||i===lc)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(i===oc)return o===lt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===ac)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===lc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===cc||i===uc||i===hc||i===dc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(i===cc)return r.COMPRESSED_RED_RGTC1_EXT;if(i===uc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===hc)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===dc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Er?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}const By=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Hy=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class zy{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new qd(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new Lt({vertexShader:By,fragmentShader:Hy,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new ae(new xn(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Vy extends Ys{constructor(e,t){super();const i=this;let s=null,r=1,o=null,a="local-floor",l=1,c=null,u=null,f=null,d=null,h=null,v=null;const g=typeof XRWebGLBinding<"u",m=new zy,p={},S=t.getContextAttributes();let E=null,_=null;const M=[],x=[],w=new Ee;let R=null;const y=new on;y.viewport=new ot;const b=new on;b.viewport=new ot;const P=[y,b],N=new ag;let U=null,I=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(G){let q=M[G];return q===void 0&&(q=new Za,M[G]=q),q.getTargetRaySpace()},this.getControllerGrip=function(G){let q=M[G];return q===void 0&&(q=new Za,M[G]=q),q.getGripSpace()},this.getHand=function(G){let q=M[G];return q===void 0&&(q=new Za,M[G]=q),q.getHandSpace()};function F(G){const q=x.indexOf(G.inputSource);if(q===-1)return;const ne=M[q];ne!==void 0&&(ne.update(G.inputSource,G.frame,c||o),ne.dispatchEvent({type:G.type,data:G.inputSource}))}function B(){s.removeEventListener("select",F),s.removeEventListener("selectstart",F),s.removeEventListener("selectend",F),s.removeEventListener("squeeze",F),s.removeEventListener("squeezestart",F),s.removeEventListener("squeezeend",F),s.removeEventListener("end",B),s.removeEventListener("inputsourceschange",L);for(let G=0;G<M.length;G++){const q=x[G];q!==null&&(x[G]=null,M[G].disconnect(q))}U=null,I=null,m.reset();for(const G in p)delete p[G];e.setRenderTarget(E),h=null,d=null,f=null,s=null,_=null,K.stop(),i.isPresenting=!1,e.setPixelRatio(R),e.setSize(w.width,w.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(G){r=G,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(G){a=G,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(G){c=G},this.getBaseLayer=function(){return d!==null?d:h},this.getBinding=function(){return f===null&&g&&(f=new XRWebGLBinding(s,t)),f},this.getFrame=function(){return v},this.getSession=function(){return s},this.setSession=async function(G){if(s=G,s!==null){if(E=e.getRenderTarget(),s.addEventListener("select",F),s.addEventListener("selectstart",F),s.addEventListener("selectend",F),s.addEventListener("squeeze",F),s.addEventListener("squeezestart",F),s.addEventListener("squeezeend",F),s.addEventListener("end",B),s.addEventListener("inputsourceschange",L),S.xrCompatible!==!0&&await t.makeXRCompatible(),R=e.getPixelRatio(),e.getSize(w),g&&"createProjectionLayer"in XRWebGLBinding.prototype){let ne=null,Ie=null,_e=null;S.depth&&(_e=S.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ne=S.stencil?Tr:wr,Ie=S.stencil?Er:ss);const Le={colorFormat:t.RGBA8,depthFormat:_e,scaleFactor:r};f=this.getBinding(),d=f.createProjectionLayer(Le),s.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),_=new Cn(d.textureWidth,d.textureHeight,{format:_n,type:Yn,depthTexture:new Xd(d.textureWidth,d.textureHeight,Ie,void 0,void 0,void 0,void 0,void 0,void 0,ne),stencilBuffer:S.stencil,colorSpace:e.outputColorSpace,samples:S.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const ne={antialias:S.antialias,alpha:!0,depth:S.depth,stencil:S.stencil,framebufferScaleFactor:r};h=new XRWebGLLayer(s,t,ne),s.updateRenderState({baseLayer:h}),e.setPixelRatio(1),e.setSize(h.framebufferWidth,h.framebufferHeight,!1),_=new Cn(h.framebufferWidth,h.framebufferHeight,{format:_n,type:Yn,colorSpace:e.outputColorSpace,stencilBuffer:S.stencil,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),K.setContext(s),K.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function L(G){for(let q=0;q<G.removed.length;q++){const ne=G.removed[q],Ie=x.indexOf(ne);Ie>=0&&(x[Ie]=null,M[Ie].disconnect(ne))}for(let q=0;q<G.added.length;q++){const ne=G.added[q];let Ie=x.indexOf(ne);if(Ie===-1){for(let Le=0;Le<M.length;Le++)if(Le>=x.length){x.push(ne),Ie=Le;break}else if(x[Le]===null){x[Le]=ne,Ie=Le;break}if(Ie===-1)break}const _e=M[Ie];_e&&_e.connect(ne)}}const A=new k,H=new k;function V(G,q,ne){A.setFromMatrixPosition(q.matrixWorld),H.setFromMatrixPosition(ne.matrixWorld);const Ie=A.distanceTo(H),_e=q.projectionMatrix.elements,Le=ne.projectionMatrix.elements,tt=_e[14]/(_e[10]-1),O=_e[14]/(_e[10]+1),pt=(_e[9]+1)/_e[5],Ve=(_e[9]-1)/_e[5],ke=(_e[8]-1)/_e[0],we=(Le[8]+1)/Le[0],mt=tt*ke,Te=tt*we,Xe=Ie/(-ke+we),Ut=Xe*-ke;if(q.matrixWorld.decompose(G.position,G.quaternion,G.scale),G.translateX(Ut),G.translateZ(Xe),G.matrixWorld.compose(G.position,G.quaternion,G.scale),G.matrixWorldInverse.copy(G.matrixWorld).invert(),_e[10]===-1)G.projectionMatrix.copy(q.projectionMatrix),G.projectionMatrixInverse.copy(q.projectionMatrixInverse);else{const At=tt+Xe,D=O+Xe,T=mt-Ut,$=Te+(Ie-Ut),Q=pt*O/D*At,te=Ve*O/D*At;G.projectionMatrix.makePerspective(T,$,Q,te,At,D),G.projectionMatrixInverse.copy(G.projectionMatrix).invert()}}function Z(G,q){q===null?G.matrixWorld.copy(G.matrix):G.matrixWorld.multiplyMatrices(q.matrixWorld,G.matrix),G.matrixWorldInverse.copy(G.matrixWorld).invert()}this.updateCamera=function(G){if(s===null)return;let q=G.near,ne=G.far;m.texture!==null&&(m.depthNear>0&&(q=m.depthNear),m.depthFar>0&&(ne=m.depthFar)),N.near=b.near=y.near=q,N.far=b.far=y.far=ne,(U!==N.near||I!==N.far)&&(s.updateRenderState({depthNear:N.near,depthFar:N.far}),U=N.near,I=N.far),N.layers.mask=G.layers.mask|6,y.layers.mask=N.layers.mask&3,b.layers.mask=N.layers.mask&5;const Ie=G.parent,_e=N.cameras;Z(N,Ie);for(let Le=0;Le<_e.length;Le++)Z(_e[Le],Ie);_e.length===2?V(N,y,b):N.projectionMatrix.copy(y.projectionMatrix),le(G,N,Ie)};function le(G,q,ne){ne===null?G.matrix.copy(q.matrixWorld):(G.matrix.copy(ne.matrixWorld),G.matrix.invert(),G.matrix.multiply(q.matrixWorld)),G.matrix.decompose(G.position,G.quaternion,G.scale),G.updateMatrixWorld(!0),G.projectionMatrix.copy(q.projectionMatrix),G.projectionMatrixInverse.copy(q.projectionMatrixInverse),G.isPerspectiveCamera&&(G.fov=Ar*2*Math.atan(1/G.projectionMatrix.elements[5]),G.zoom=1)}this.getCamera=function(){return N},this.getFoveation=function(){if(!(d===null&&h===null))return l},this.setFoveation=function(G){l=G,d!==null&&(d.fixedFoveation=G),h!==null&&h.fixedFoveation!==void 0&&(h.fixedFoveation=G)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(N)},this.getCameraTexture=function(G){return p[G]};let ve=null;function Oe(G,q){if(u=q.getViewerPose(c||o),v=q,u!==null){const ne=u.views;h!==null&&(e.setRenderTargetFramebuffer(_,h.framebuffer),e.setRenderTarget(_));let Ie=!1;ne.length!==N.cameras.length&&(N.cameras.length=0,Ie=!0);for(let O=0;O<ne.length;O++){const pt=ne[O];let Ve=null;if(h!==null)Ve=h.getViewport(pt);else{const we=f.getViewSubImage(d,pt);Ve=we.viewport,O===0&&(e.setRenderTargetTextures(_,we.colorTexture,we.depthStencilTexture),e.setRenderTarget(_))}let ke=P[O];ke===void 0&&(ke=new on,ke.layers.enable(O),ke.viewport=new ot,P[O]=ke),ke.matrix.fromArray(pt.transform.matrix),ke.matrix.decompose(ke.position,ke.quaternion,ke.scale),ke.projectionMatrix.fromArray(pt.projectionMatrix),ke.projectionMatrixInverse.copy(ke.projectionMatrix).invert(),ke.viewport.set(Ve.x,Ve.y,Ve.width,Ve.height),O===0&&(N.matrix.copy(ke.matrix),N.matrix.decompose(N.position,N.quaternion,N.scale)),Ie===!0&&N.cameras.push(ke)}const _e=s.enabledFeatures;if(_e&&_e.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&g){f=i.getBinding();const O=f.getDepthInformation(ne[0]);O&&O.isValid&&O.texture&&m.init(O,s.renderState)}if(_e&&_e.includes("camera-access")&&g){e.state.unbindTexture(),f=i.getBinding();for(let O=0;O<ne.length;O++){const pt=ne[O].camera;if(pt){let Ve=p[pt];Ve||(Ve=new qd,p[pt]=Ve);const ke=f.getCameraImage(pt);Ve.sourceTexture=ke}}}}for(let ne=0;ne<M.length;ne++){const Ie=x[ne],_e=M[ne];Ie!==null&&_e!==void 0&&_e.update(Ie,q,c||o)}ve&&ve(G,q),q.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:q}),v=null}const K=new Yd;K.setAnimationLoop(Oe),this.setAnimationLoop=function(G){ve=G},this.dispose=function(){}}}const Xi=new Kn,Gy=new it;function Wy(n,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function i(m,p){p.color.getRGB(m.fogColor.value,kd(n)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,S,E,_){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(m,p):p.isMeshToonMaterial?(r(m,p),f(m,p)):p.isMeshPhongMaterial?(r(m,p),u(m,p)):p.isMeshStandardMaterial?(r(m,p),d(m,p),p.isMeshPhysicalMaterial&&h(m,p,_)):p.isMeshMatcapMaterial?(r(m,p),v(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),g(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?l(m,p,S,E):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Zt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Zt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const S=e.get(p),E=S.envMap,_=S.envMapRotation;E&&(m.envMap.value=E,Xi.copy(_),Xi.x*=-1,Xi.y*=-1,Xi.z*=-1,E.isCubeTexture&&E.isRenderTargetTexture===!1&&(Xi.y*=-1,Xi.z*=-1),m.envMapRotation.value.setFromMatrix4(Gy.makeRotationFromEuler(Xi)),m.flipEnvMap.value=E.isCubeTexture&&E.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,S,E){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*S,m.scale.value=E*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function u(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function f(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function h(m,p,S){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Zt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=S.texture,m.transmissionSamplerSize.value.set(S.width,S.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function v(m,p){p.matcap&&(m.matcap.value=p.matcap)}function g(m,p){const S=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(S.matrixWorld),m.nearDistance.value=S.shadow.camera.near,m.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function Xy(n,e,t,i){let s={},r={},o=[];const a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(S,E){const _=E.program;i.uniformBlockBinding(S,_)}function c(S,E){let _=s[S.id];_===void 0&&(v(S),_=u(S),s[S.id]=_,S.addEventListener("dispose",m));const M=E.program;i.updateUBOMapping(S,M);const x=e.render.frame;r[S.id]!==x&&(d(S),r[S.id]=x)}function u(S){const E=f();S.__bindingPointIndex=E;const _=n.createBuffer(),M=S.__size,x=S.usage;return n.bindBuffer(n.UNIFORM_BUFFER,_),n.bufferData(n.UNIFORM_BUFFER,M,x),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,E,_),_}function f(){for(let S=0;S<a;S++)if(o.indexOf(S)===-1)return o.push(S),S;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(S){const E=s[S.id],_=S.uniforms,M=S.__cache;n.bindBuffer(n.UNIFORM_BUFFER,E);for(let x=0,w=_.length;x<w;x++){const R=Array.isArray(_[x])?_[x]:[_[x]];for(let y=0,b=R.length;y<b;y++){const P=R[y];if(h(P,x,y,M)===!0){const N=P.__offset,U=Array.isArray(P.value)?P.value:[P.value];let I=0;for(let F=0;F<U.length;F++){const B=U[F],L=g(B);typeof B=="number"||typeof B=="boolean"?(P.__data[0]=B,n.bufferSubData(n.UNIFORM_BUFFER,N+I,P.__data)):B.isMatrix3?(P.__data[0]=B.elements[0],P.__data[1]=B.elements[1],P.__data[2]=B.elements[2],P.__data[3]=0,P.__data[4]=B.elements[3],P.__data[5]=B.elements[4],P.__data[6]=B.elements[5],P.__data[7]=0,P.__data[8]=B.elements[6],P.__data[9]=B.elements[7],P.__data[10]=B.elements[8],P.__data[11]=0):(B.toArray(P.__data,I),I+=L.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,N,P.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function h(S,E,_,M){const x=S.value,w=E+"_"+_;if(M[w]===void 0)return typeof x=="number"||typeof x=="boolean"?M[w]=x:M[w]=x.clone(),!0;{const R=M[w];if(typeof x=="number"||typeof x=="boolean"){if(R!==x)return M[w]=x,!0}else if(R.equals(x)===!1)return R.copy(x),!0}return!1}function v(S){const E=S.uniforms;let _=0;const M=16;for(let w=0,R=E.length;w<R;w++){const y=Array.isArray(E[w])?E[w]:[E[w]];for(let b=0,P=y.length;b<P;b++){const N=y[b],U=Array.isArray(N.value)?N.value:[N.value];for(let I=0,F=U.length;I<F;I++){const B=U[I],L=g(B),A=_%M,H=A%L.boundary,V=A+H;_+=H,V!==0&&M-V<L.storage&&(_+=M-V),N.__data=new Float32Array(L.storage/Float32Array.BYTES_PER_ELEMENT),N.__offset=_,_+=L.storage}}}const x=_%M;return x>0&&(_+=M-x),S.__size=_,S.__cache={},this}function g(S){const E={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(E.boundary=4,E.storage=4):S.isVector2?(E.boundary=8,E.storage=8):S.isVector3||S.isColor?(E.boundary=16,E.storage=12):S.isVector4?(E.boundary=16,E.storage=16):S.isMatrix3?(E.boundary=48,E.storage=48):S.isMatrix4?(E.boundary=64,E.storage=64):S.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",S),E}function m(S){const E=S.target;E.removeEventListener("dispose",m);const _=o.indexOf(E.__bindingPointIndex);o.splice(_,1),n.deleteBuffer(s[E.id]),delete s[E.id],delete r[E.id]}function p(){for(const S in s)n.deleteBuffer(s[S]);o=[],s={},r={}}return{bind:l,update:c,dispose:p}}class qy{constructor(e={}){const{canvas:t=ym(),context:i=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let h;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");h=i.getContextAttributes().alpha}else h=o;const v=new Uint32Array(4),g=new Int32Array(4);let m=null,p=null;const S=[],E=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Ri,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const _=this;let M=!1;this._outputColorSpace=fn;let x=0,w=0,R=null,y=-1,b=null;const P=new ot,N=new ot;let U=null;const I=new Se(0);let F=0,B=t.width,L=t.height,A=1,H=null,V=null;const Z=new ot(0,0,B,L),le=new ot(0,0,B,L);let ve=!1;const Oe=new Xc;let K=!1,G=!1;const q=new it,ne=new k,Ie=new ot,_e={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Le=!1;function tt(){return R===null?A:1}let O=i;function pt(C,W){return t.getContext(C,W)}try{const C={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Dc}`),t.addEventListener("webglcontextlost",he,!1),t.addEventListener("webglcontextrestored",xe,!1),t.addEventListener("webglcontextcreationerror",ie,!1),O===null){const W="webgl2";if(O=pt(W,C),O===null)throw pt(W)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(C){throw console.error("THREE.WebGLRenderer: "+C.message),C}let Ve,ke,we,mt,Te,Xe,Ut,At,D,T,$,Q,te,J,Pe,ce,Ae,Ce,re,me,Fe,Re,fe,Ge;function z(){Ve=new n_(O),Ve.init(),Re=new ky(O,Ve),ke=new Yv(O,Ve,e,Re),we=new Oy(O,Ve),ke.reversedDepthBuffer&&d&&we.buffers.depth.setReversed(!0),mt=new r_(O),Te=new Sy,Xe=new Fy(O,Ve,we,Te,ke,Re,mt),Ut=new Zv(_),At=new t_(_),D=new hg(O),fe=new $v(O,D),T=new i_(O,D,mt,fe),$=new a_(O,T,D,mt),re=new o_(O,ke,Xe),ce=new Kv(Te),Q=new My(_,Ut,At,Ve,ke,fe,ce),te=new Wy(_,Te),J=new wy,Pe=new Iy(Ve),Ce=new qv(_,Ut,At,we,$,h,l),Ae=new Ny(_,$,ke),Ge=new Xy(O,mt,ke,we),me=new jv(O,Ve,mt),Fe=new s_(O,Ve,mt),mt.programs=Q.programs,_.capabilities=ke,_.extensions=Ve,_.properties=Te,_.renderLists=J,_.shadowMap=Ae,_.state=we,_.info=mt}z();const oe=new Vy(_,O);this.xr=oe,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){const C=Ve.get("WEBGL_lose_context");C&&C.loseContext()},this.forceContextRestore=function(){const C=Ve.get("WEBGL_lose_context");C&&C.restoreContext()},this.getPixelRatio=function(){return A},this.setPixelRatio=function(C){C!==void 0&&(A=C,this.setSize(B,L,!1))},this.getSize=function(C){return C.set(B,L)},this.setSize=function(C,W,j=!0){if(oe.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}B=C,L=W,t.width=Math.floor(C*A),t.height=Math.floor(W*A),j===!0&&(t.style.width=C+"px",t.style.height=W+"px"),this.setViewport(0,0,C,W)},this.getDrawingBufferSize=function(C){return C.set(B*A,L*A).floor()},this.setDrawingBufferSize=function(C,W,j){B=C,L=W,A=j,t.width=Math.floor(C*j),t.height=Math.floor(W*j),this.setViewport(0,0,C,W)},this.getCurrentViewport=function(C){return C.copy(P)},this.getViewport=function(C){return C.copy(Z)},this.setViewport=function(C,W,j,Y){C.isVector4?Z.set(C.x,C.y,C.z,C.w):Z.set(C,W,j,Y),we.viewport(P.copy(Z).multiplyScalar(A).round())},this.getScissor=function(C){return C.copy(le)},this.setScissor=function(C,W,j,Y){C.isVector4?le.set(C.x,C.y,C.z,C.w):le.set(C,W,j,Y),we.scissor(N.copy(le).multiplyScalar(A).round())},this.getScissorTest=function(){return ve},this.setScissorTest=function(C){we.setScissorTest(ve=C)},this.setOpaqueSort=function(C){H=C},this.setTransparentSort=function(C){V=C},this.getClearColor=function(C){return C.copy(Ce.getClearColor())},this.setClearColor=function(){Ce.setClearColor(...arguments)},this.getClearAlpha=function(){return Ce.getClearAlpha()},this.setClearAlpha=function(){Ce.setClearAlpha(...arguments)},this.clear=function(C=!0,W=!0,j=!0){let Y=0;if(C){let X=!1;if(R!==null){const se=R.texture.format;X=se===Hc||se===Bc||se===kc}if(X){const se=R.texture.type,pe=se===Yn||se===ss||se===Sr||se===Er||se===Uc||se===Oc,be=Ce.getClearColor(),ye=Ce.getClearAlpha(),Ue=be.r,Be=be.g,De=be.b;pe?(v[0]=Ue,v[1]=Be,v[2]=De,v[3]=ye,O.clearBufferuiv(O.COLOR,0,v)):(g[0]=Ue,g[1]=Be,g[2]=De,g[3]=ye,O.clearBufferiv(O.COLOR,0,g))}else Y|=O.COLOR_BUFFER_BIT}W&&(Y|=O.DEPTH_BUFFER_BIT),j&&(Y|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),O.clear(Y)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",he,!1),t.removeEventListener("webglcontextrestored",xe,!1),t.removeEventListener("webglcontextcreationerror",ie,!1),Ce.dispose(),J.dispose(),Pe.dispose(),Te.dispose(),Ut.dispose(),At.dispose(),$.dispose(),fe.dispose(),Ge.dispose(),Q.dispose(),oe.dispose(),oe.removeEventListener("sessionstart",Dn),oe.removeEventListener("sessionend",lu),ki.stop()};function he(C){C.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),M=!0}function xe(){console.log("THREE.WebGLRenderer: Context Restored."),M=!1;const C=mt.autoReset,W=Ae.enabled,j=Ae.autoUpdate,Y=Ae.needsUpdate,X=Ae.type;z(),mt.autoReset=C,Ae.enabled=W,Ae.autoUpdate=j,Ae.needsUpdate=Y,Ae.type=X}function ie(C){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",C.statusMessage)}function ee(C){const W=C.target;W.removeEventListener("dispose",ee),Me(W)}function Me(C){ze(C),Te.remove(C)}function ze(C){const W=Te.get(C).programs;W!==void 0&&(W.forEach(function(j){Q.releaseProgram(j)}),C.isShaderMaterial&&Q.releaseShaderCache(C))}this.renderBufferDirect=function(C,W,j,Y,X,se){W===null&&(W=_e);const pe=X.isMesh&&X.matrixWorld.determinant()<0,be=ap(C,W,j,Y,X);we.setMaterial(Y,pe);let ye=j.index,Ue=1;if(Y.wireframe===!0){if(ye=T.getWireframeAttribute(j),ye===void 0)return;Ue=2}const Be=j.drawRange,De=j.attributes.position;let Ye=Be.start*Ue,at=(Be.start+Be.count)*Ue;se!==null&&(Ye=Math.max(Ye,se.start*Ue),at=Math.min(at,(se.start+se.count)*Ue)),ye!==null?(Ye=Math.max(Ye,0),at=Math.min(at,ye.count)):De!=null&&(Ye=Math.max(Ye,0),at=Math.min(at,De.count));const Mt=at-Ye;if(Mt<0||Mt===1/0)return;fe.setup(X,Y,be,j,ye);let dt,ct=me;if(ye!==null&&(dt=D.get(ye),ct=Fe,ct.setIndex(dt)),X.isMesh)Y.wireframe===!0?(we.setLineWidth(Y.wireframeLinewidth*tt()),ct.setMode(O.LINES)):ct.setMode(O.TRIANGLES);else if(X.isLine){let Ne=Y.linewidth;Ne===void 0&&(Ne=1),we.setLineWidth(Ne*tt()),X.isLineSegments?ct.setMode(O.LINES):X.isLineLoop?ct.setMode(O.LINE_LOOP):ct.setMode(O.LINE_STRIP)}else X.isPoints?ct.setMode(O.POINTS):X.isSprite&&ct.setMode(O.TRIANGLES);if(X.isBatchedMesh)if(X._multiDrawInstances!==null)Cr("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),ct.renderMultiDrawInstances(X._multiDrawStarts,X._multiDrawCounts,X._multiDrawCount,X._multiDrawInstances);else if(Ve.get("WEBGL_multi_draw"))ct.renderMultiDraw(X._multiDrawStarts,X._multiDrawCounts,X._multiDrawCount);else{const Ne=X._multiDrawStarts,gt=X._multiDrawCounts,Qe=X._multiDrawCount,en=ye?D.get(ye).bytesPerElement:1,ls=Te.get(Y).currentProgram.getUniforms();for(let tn=0;tn<Qe;tn++)ls.setValue(O,"_gl_DrawID",tn),ct.render(Ne[tn]/en,gt[tn])}else if(X.isInstancedMesh)ct.renderInstances(Ye,Mt,X.count);else if(j.isInstancedBufferGeometry){const Ne=j._maxInstanceCount!==void 0?j._maxInstanceCount:1/0,gt=Math.min(j.instanceCount,Ne);ct.renderInstances(Ye,Mt,gt)}else ct.render(Ye,Mt)};function ut(C,W,j){C.transparent===!0&&C.side===Yt&&C.forceSinglePass===!1?(C.side=Zt,C.needsUpdate=!0,qr(C,W,j),C.side=Ii,C.needsUpdate=!0,qr(C,W,j),C.side=Yt):qr(C,W,j)}this.compile=function(C,W,j=null){j===null&&(j=C),p=Pe.get(j),p.init(W),E.push(p),j.traverseVisible(function(X){X.isLight&&X.layers.test(W.layers)&&(p.pushLight(X),X.castShadow&&p.pushShadow(X))}),C!==j&&C.traverseVisible(function(X){X.isLight&&X.layers.test(W.layers)&&(p.pushLight(X),X.castShadow&&p.pushShadow(X))}),p.setupLights();const Y=new Set;return C.traverse(function(X){if(!(X.isMesh||X.isPoints||X.isLine||X.isSprite))return;const se=X.material;if(se)if(Array.isArray(se))for(let pe=0;pe<se.length;pe++){const be=se[pe];ut(be,j,X),Y.add(be)}else ut(se,j,X),Y.add(se)}),p=E.pop(),Y},this.compileAsync=function(C,W,j=null){const Y=this.compile(C,W,j);return new Promise(X=>{function se(){if(Y.forEach(function(pe){Te.get(pe).currentProgram.isReady()&&Y.delete(pe)}),Y.size===0){X(C);return}setTimeout(se,10)}Ve.get("KHR_parallel_shader_compile")!==null?se():setTimeout(se,10)})};let st=null;function Zn(C){st&&st(C)}function Dn(){ki.stop()}function lu(){ki.start()}const ki=new Yd;ki.setAnimationLoop(Zn),typeof self<"u"&&ki.setContext(self),this.setAnimationLoop=function(C){st=C,oe.setAnimationLoop(C),C===null?ki.stop():ki.start()},oe.addEventListener("sessionstart",Dn),oe.addEventListener("sessionend",lu),this.render=function(C,W){if(W!==void 0&&W.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(M===!0)return;if(C.matrixWorldAutoUpdate===!0&&C.updateMatrixWorld(),W.parent===null&&W.matrixWorldAutoUpdate===!0&&W.updateMatrixWorld(),oe.enabled===!0&&oe.isPresenting===!0&&(oe.cameraAutoUpdate===!0&&oe.updateCamera(W),W=oe.getCamera()),C.isScene===!0&&C.onBeforeRender(_,C,W,R),p=Pe.get(C,E.length),p.init(W),E.push(p),q.multiplyMatrices(W.projectionMatrix,W.matrixWorldInverse),Oe.setFromProjectionMatrix(q,Xn,W.reversedDepth),G=this.localClippingEnabled,K=ce.init(this.clippingPlanes,G),m=J.get(C,S.length),m.init(),S.push(m),oe.enabled===!0&&oe.isPresenting===!0){const se=_.xr.getDepthSensingMesh();se!==null&&Aa(se,W,-1/0,_.sortObjects)}Aa(C,W,0,_.sortObjects),m.finish(),_.sortObjects===!0&&m.sort(H,V),Le=oe.enabled===!1||oe.isPresenting===!1||oe.hasDepthSensing()===!1,Le&&Ce.addToRenderList(m,C),this.info.render.frame++,K===!0&&ce.beginShadows();const j=p.state.shadowsArray;Ae.render(j,C,W),K===!0&&ce.endShadows(),this.info.autoReset===!0&&this.info.reset();const Y=m.opaque,X=m.transmissive;if(p.setupLights(),W.isArrayCamera){const se=W.cameras;if(X.length>0)for(let pe=0,be=se.length;pe<be;pe++){const ye=se[pe];uu(Y,X,C,ye)}Le&&Ce.render(C);for(let pe=0,be=se.length;pe<be;pe++){const ye=se[pe];cu(m,C,ye,ye.viewport)}}else X.length>0&&uu(Y,X,C,W),Le&&Ce.render(C),cu(m,C,W);R!==null&&w===0&&(Xe.updateMultisampleRenderTarget(R),Xe.updateRenderTargetMipmap(R)),C.isScene===!0&&C.onAfterRender(_,C,W),fe.resetDefaultState(),y=-1,b=null,E.pop(),E.length>0?(p=E[E.length-1],K===!0&&ce.setGlobalState(_.clippingPlanes,p.state.camera)):p=null,S.pop(),S.length>0?m=S[S.length-1]:m=null};function Aa(C,W,j,Y){if(C.visible===!1)return;if(C.layers.test(W.layers)){if(C.isGroup)j=C.renderOrder;else if(C.isLOD)C.autoUpdate===!0&&C.update(W);else if(C.isLight)p.pushLight(C),C.castShadow&&p.pushShadow(C);else if(C.isSprite){if(!C.frustumCulled||Oe.intersectsSprite(C)){Y&&Ie.setFromMatrixPosition(C.matrixWorld).applyMatrix4(q);const pe=$.update(C),be=C.material;be.visible&&m.push(C,pe,be,j,Ie.z,null)}}else if((C.isMesh||C.isLine||C.isPoints)&&(!C.frustumCulled||Oe.intersectsObject(C))){const pe=$.update(C),be=C.material;if(Y&&(C.boundingSphere!==void 0?(C.boundingSphere===null&&C.computeBoundingSphere(),Ie.copy(C.boundingSphere.center)):(pe.boundingSphere===null&&pe.computeBoundingSphere(),Ie.copy(pe.boundingSphere.center)),Ie.applyMatrix4(C.matrixWorld).applyMatrix4(q)),Array.isArray(be)){const ye=pe.groups;for(let Ue=0,Be=ye.length;Ue<Be;Ue++){const De=ye[Ue],Ye=be[De.materialIndex];Ye&&Ye.visible&&m.push(C,pe,Ye,j,Ie.z,De)}}else be.visible&&m.push(C,pe,be,j,Ie.z,null)}}const se=C.children;for(let pe=0,be=se.length;pe<be;pe++)Aa(se[pe],W,j,Y)}function cu(C,W,j,Y){const X=C.opaque,se=C.transmissive,pe=C.transparent;p.setupLightsView(j),K===!0&&ce.setGlobalState(_.clippingPlanes,j),Y&&we.viewport(P.copy(Y)),X.length>0&&Xr(X,W,j),se.length>0&&Xr(se,W,j),pe.length>0&&Xr(pe,W,j),we.buffers.depth.setTest(!0),we.buffers.depth.setMask(!0),we.buffers.color.setMask(!0),we.setPolygonOffset(!1)}function uu(C,W,j,Y){if((j.isScene===!0?j.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[Y.id]===void 0&&(p.state.transmissionRenderTarget[Y.id]=new Cn(1,1,{generateMipmaps:!0,type:Ve.has("EXT_color_buffer_half_float")||Ve.has("EXT_color_buffer_float")?fi:Yn,minFilter:es,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:et.workingColorSpace}));const se=p.state.transmissionRenderTarget[Y.id],pe=Y.viewport||P;se.setSize(pe.z*_.transmissionResolutionScale,pe.w*_.transmissionResolutionScale);const be=_.getRenderTarget(),ye=_.getActiveCubeFace(),Ue=_.getActiveMipmapLevel();_.setRenderTarget(se),_.getClearColor(I),F=_.getClearAlpha(),F<1&&_.setClearColor(16777215,.5),_.clear(),Le&&Ce.render(j);const Be=_.toneMapping;_.toneMapping=Ri;const De=Y.viewport;if(Y.viewport!==void 0&&(Y.viewport=void 0),p.setupLightsView(Y),K===!0&&ce.setGlobalState(_.clippingPlanes,Y),Xr(C,j,Y),Xe.updateMultisampleRenderTarget(se),Xe.updateRenderTargetMipmap(se),Ve.has("WEBGL_multisampled_render_to_texture")===!1){let Ye=!1;for(let at=0,Mt=W.length;at<Mt;at++){const dt=W[at],ct=dt.object,Ne=dt.geometry,gt=dt.material,Qe=dt.group;if(gt.side===Yt&&ct.layers.test(Y.layers)){const en=gt.side;gt.side=Zt,gt.needsUpdate=!0,hu(ct,j,Y,Ne,gt,Qe),gt.side=en,gt.needsUpdate=!0,Ye=!0}}Ye===!0&&(Xe.updateMultisampleRenderTarget(se),Xe.updateRenderTargetMipmap(se))}_.setRenderTarget(be,ye,Ue),_.setClearColor(I,F),De!==void 0&&(Y.viewport=De),_.toneMapping=Be}function Xr(C,W,j){const Y=W.isScene===!0?W.overrideMaterial:null;for(let X=0,se=C.length;X<se;X++){const pe=C[X],be=pe.object,ye=pe.geometry,Ue=pe.group;let Be=pe.material;Be.allowOverride===!0&&Y!==null&&(Be=Y),be.layers.test(j.layers)&&hu(be,W,j,ye,Be,Ue)}}function hu(C,W,j,Y,X,se){C.onBeforeRender(_,W,j,Y,X,se),C.modelViewMatrix.multiplyMatrices(j.matrixWorldInverse,C.matrixWorld),C.normalMatrix.getNormalMatrix(C.modelViewMatrix),X.onBeforeRender(_,W,j,Y,C,se),X.transparent===!0&&X.side===Yt&&X.forceSinglePass===!1?(X.side=Zt,X.needsUpdate=!0,_.renderBufferDirect(j,W,Y,X,C,se),X.side=Ii,X.needsUpdate=!0,_.renderBufferDirect(j,W,Y,X,C,se),X.side=Yt):_.renderBufferDirect(j,W,Y,X,C,se),C.onAfterRender(_,W,j,Y,X,se)}function qr(C,W,j){W.isScene!==!0&&(W=_e);const Y=Te.get(C),X=p.state.lights,se=p.state.shadowsArray,pe=X.state.version,be=Q.getParameters(C,X.state,se,W,j),ye=Q.getProgramCacheKey(be);let Ue=Y.programs;Y.environment=C.isMeshStandardMaterial?W.environment:null,Y.fog=W.fog,Y.envMap=(C.isMeshStandardMaterial?At:Ut).get(C.envMap||Y.environment),Y.envMapRotation=Y.environment!==null&&C.envMap===null?W.environmentRotation:C.envMapRotation,Ue===void 0&&(C.addEventListener("dispose",ee),Ue=new Map,Y.programs=Ue);let Be=Ue.get(ye);if(Be!==void 0){if(Y.currentProgram===Be&&Y.lightsStateVersion===pe)return fu(C,be),Be}else be.uniforms=Q.getUniforms(C),C.onBeforeCompile(be,_),Be=Q.acquireProgram(be,ye),Ue.set(ye,Be),Y.uniforms=be.uniforms;const De=Y.uniforms;return(!C.isShaderMaterial&&!C.isRawShaderMaterial||C.clipping===!0)&&(De.clippingPlanes=ce.uniform),fu(C,be),Y.needsLights=cp(C),Y.lightsStateVersion=pe,Y.needsLights&&(De.ambientLightColor.value=X.state.ambient,De.lightProbe.value=X.state.probe,De.directionalLights.value=X.state.directional,De.directionalLightShadows.value=X.state.directionalShadow,De.spotLights.value=X.state.spot,De.spotLightShadows.value=X.state.spotShadow,De.rectAreaLights.value=X.state.rectArea,De.ltc_1.value=X.state.rectAreaLTC1,De.ltc_2.value=X.state.rectAreaLTC2,De.pointLights.value=X.state.point,De.pointLightShadows.value=X.state.pointShadow,De.hemisphereLights.value=X.state.hemi,De.directionalShadowMap.value=X.state.directionalShadowMap,De.directionalShadowMatrix.value=X.state.directionalShadowMatrix,De.spotShadowMap.value=X.state.spotShadowMap,De.spotLightMatrix.value=X.state.spotLightMatrix,De.spotLightMap.value=X.state.spotLightMap,De.pointShadowMap.value=X.state.pointShadowMap,De.pointShadowMatrix.value=X.state.pointShadowMatrix),Y.currentProgram=Be,Y.uniformsList=null,Be}function du(C){if(C.uniformsList===null){const W=C.currentProgram.getUniforms();C.uniformsList=zo.seqWithValue(W.seq,C.uniforms)}return C.uniformsList}function fu(C,W){const j=Te.get(C);j.outputColorSpace=W.outputColorSpace,j.batching=W.batching,j.batchingColor=W.batchingColor,j.instancing=W.instancing,j.instancingColor=W.instancingColor,j.instancingMorph=W.instancingMorph,j.skinning=W.skinning,j.morphTargets=W.morphTargets,j.morphNormals=W.morphNormals,j.morphColors=W.morphColors,j.morphTargetsCount=W.morphTargetsCount,j.numClippingPlanes=W.numClippingPlanes,j.numIntersection=W.numClipIntersection,j.vertexAlphas=W.vertexAlphas,j.vertexTangents=W.vertexTangents,j.toneMapping=W.toneMapping}function ap(C,W,j,Y,X){W.isScene!==!0&&(W=_e),Xe.resetTextureUnits();const se=W.fog,pe=Y.isMeshStandardMaterial?W.environment:null,be=R===null?_.outputColorSpace:R.isXRRenderTarget===!0?R.texture.colorSpace:Gs,ye=(Y.isMeshStandardMaterial?At:Ut).get(Y.envMap||pe),Ue=Y.vertexColors===!0&&!!j.attributes.color&&j.attributes.color.itemSize===4,Be=!!j.attributes.tangent&&(!!Y.normalMap||Y.anisotropy>0),De=!!j.morphAttributes.position,Ye=!!j.morphAttributes.normal,at=!!j.morphAttributes.color;let Mt=Ri;Y.toneMapped&&(R===null||R.isXRRenderTarget===!0)&&(Mt=_.toneMapping);const dt=j.morphAttributes.position||j.morphAttributes.normal||j.morphAttributes.color,ct=dt!==void 0?dt.length:0,Ne=Te.get(Y),gt=p.state.lights;if(K===!0&&(G===!0||C!==b)){const Xt=C===b&&Y.id===y;ce.setState(Y,C,Xt)}let Qe=!1;Y.version===Ne.__version?(Ne.needsLights&&Ne.lightsStateVersion!==gt.state.version||Ne.outputColorSpace!==be||X.isBatchedMesh&&Ne.batching===!1||!X.isBatchedMesh&&Ne.batching===!0||X.isBatchedMesh&&Ne.batchingColor===!0&&X.colorTexture===null||X.isBatchedMesh&&Ne.batchingColor===!1&&X.colorTexture!==null||X.isInstancedMesh&&Ne.instancing===!1||!X.isInstancedMesh&&Ne.instancing===!0||X.isSkinnedMesh&&Ne.skinning===!1||!X.isSkinnedMesh&&Ne.skinning===!0||X.isInstancedMesh&&Ne.instancingColor===!0&&X.instanceColor===null||X.isInstancedMesh&&Ne.instancingColor===!1&&X.instanceColor!==null||X.isInstancedMesh&&Ne.instancingMorph===!0&&X.morphTexture===null||X.isInstancedMesh&&Ne.instancingMorph===!1&&X.morphTexture!==null||Ne.envMap!==ye||Y.fog===!0&&Ne.fog!==se||Ne.numClippingPlanes!==void 0&&(Ne.numClippingPlanes!==ce.numPlanes||Ne.numIntersection!==ce.numIntersection)||Ne.vertexAlphas!==Ue||Ne.vertexTangents!==Be||Ne.morphTargets!==De||Ne.morphNormals!==Ye||Ne.morphColors!==at||Ne.toneMapping!==Mt||Ne.morphTargetsCount!==ct)&&(Qe=!0):(Qe=!0,Ne.__version=Y.version);let en=Ne.currentProgram;Qe===!0&&(en=qr(Y,W,X));let ls=!1,tn=!1,Qs=!1;const vt=en.getUniforms(),cn=Ne.uniforms;if(we.useProgram(en.program)&&(ls=!0,tn=!0,Qs=!0),Y.id!==y&&(y=Y.id,tn=!0),ls||b!==C){we.buffers.depth.getReversed()&&C.reversedDepth!==!0&&(C._reversedDepth=!0,C.updateProjectionMatrix()),vt.setValue(O,"projectionMatrix",C.projectionMatrix),vt.setValue(O,"viewMatrix",C.matrixWorldInverse);const Jt=vt.map.cameraPosition;Jt!==void 0&&Jt.setValue(O,ne.setFromMatrixPosition(C.matrixWorld)),ke.logarithmicDepthBuffer&&vt.setValue(O,"logDepthBufFC",2/(Math.log(C.far+1)/Math.LN2)),(Y.isMeshPhongMaterial||Y.isMeshToonMaterial||Y.isMeshLambertMaterial||Y.isMeshBasicMaterial||Y.isMeshStandardMaterial||Y.isShaderMaterial)&&vt.setValue(O,"isOrthographic",C.isOrthographicCamera===!0),b!==C&&(b=C,tn=!0,Qs=!0)}if(X.isSkinnedMesh){vt.setOptional(O,X,"bindMatrix"),vt.setOptional(O,X,"bindMatrixInverse");const Xt=X.skeleton;Xt&&(Xt.boneTexture===null&&Xt.computeBoneTexture(),vt.setValue(O,"boneTexture",Xt.boneTexture,Xe))}X.isBatchedMesh&&(vt.setOptional(O,X,"batchingTexture"),vt.setValue(O,"batchingTexture",X._matricesTexture,Xe),vt.setOptional(O,X,"batchingIdTexture"),vt.setValue(O,"batchingIdTexture",X._indirectTexture,Xe),vt.setOptional(O,X,"batchingColorTexture"),X._colorsTexture!==null&&vt.setValue(O,"batchingColorTexture",X._colorsTexture,Xe));const un=j.morphAttributes;if((un.position!==void 0||un.normal!==void 0||un.color!==void 0)&&re.update(X,j,en),(tn||Ne.receiveShadow!==X.receiveShadow)&&(Ne.receiveShadow=X.receiveShadow,vt.setValue(O,"receiveShadow",X.receiveShadow)),Y.isMeshGouraudMaterial&&Y.envMap!==null&&(cn.envMap.value=ye,cn.flipEnvMap.value=ye.isCubeTexture&&ye.isRenderTargetTexture===!1?-1:1),Y.isMeshStandardMaterial&&Y.envMap===null&&W.environment!==null&&(cn.envMapIntensity.value=W.environmentIntensity),tn&&(vt.setValue(O,"toneMappingExposure",_.toneMappingExposure),Ne.needsLights&&lp(cn,Qs),se&&Y.fog===!0&&te.refreshFogUniforms(cn,se),te.refreshMaterialUniforms(cn,Y,A,L,p.state.transmissionRenderTarget[C.id]),zo.upload(O,du(Ne),cn,Xe)),Y.isShaderMaterial&&Y.uniformsNeedUpdate===!0&&(zo.upload(O,du(Ne),cn,Xe),Y.uniformsNeedUpdate=!1),Y.isSpriteMaterial&&vt.setValue(O,"center",X.center),vt.setValue(O,"modelViewMatrix",X.modelViewMatrix),vt.setValue(O,"normalMatrix",X.normalMatrix),vt.setValue(O,"modelMatrix",X.matrixWorld),Y.isShaderMaterial||Y.isRawShaderMaterial){const Xt=Y.uniformsGroups;for(let Jt=0,Ca=Xt.length;Jt<Ca;Jt++){const Bi=Xt[Jt];Ge.update(Bi,en),Ge.bind(Bi,en)}}return en}function lp(C,W){C.ambientLightColor.needsUpdate=W,C.lightProbe.needsUpdate=W,C.directionalLights.needsUpdate=W,C.directionalLightShadows.needsUpdate=W,C.pointLights.needsUpdate=W,C.pointLightShadows.needsUpdate=W,C.spotLights.needsUpdate=W,C.spotLightShadows.needsUpdate=W,C.rectAreaLights.needsUpdate=W,C.hemisphereLights.needsUpdate=W}function cp(C){return C.isMeshLambertMaterial||C.isMeshToonMaterial||C.isMeshPhongMaterial||C.isMeshStandardMaterial||C.isShadowMaterial||C.isShaderMaterial&&C.lights===!0}this.getActiveCubeFace=function(){return x},this.getActiveMipmapLevel=function(){return w},this.getRenderTarget=function(){return R},this.setRenderTargetTextures=function(C,W,j){const Y=Te.get(C);Y.__autoAllocateDepthBuffer=C.resolveDepthBuffer===!1,Y.__autoAllocateDepthBuffer===!1&&(Y.__useRenderToTexture=!1),Te.get(C.texture).__webglTexture=W,Te.get(C.depthTexture).__webglTexture=Y.__autoAllocateDepthBuffer?void 0:j,Y.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(C,W){const j=Te.get(C);j.__webglFramebuffer=W,j.__useDefaultFramebuffer=W===void 0};const up=O.createFramebuffer();this.setRenderTarget=function(C,W=0,j=0){R=C,x=W,w=j;let Y=!0,X=null,se=!1,pe=!1;if(C){const ye=Te.get(C);if(ye.__useDefaultFramebuffer!==void 0)we.bindFramebuffer(O.FRAMEBUFFER,null),Y=!1;else if(ye.__webglFramebuffer===void 0)Xe.setupRenderTarget(C);else if(ye.__hasExternalTextures)Xe.rebindTextures(C,Te.get(C.texture).__webglTexture,Te.get(C.depthTexture).__webglTexture);else if(C.depthBuffer){const De=C.depthTexture;if(ye.__boundDepthTexture!==De){if(De!==null&&Te.has(De)&&(C.width!==De.image.width||C.height!==De.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Xe.setupDepthRenderbuffer(C)}}const Ue=C.texture;(Ue.isData3DTexture||Ue.isDataArrayTexture||Ue.isCompressedArrayTexture)&&(pe=!0);const Be=Te.get(C).__webglFramebuffer;C.isWebGLCubeRenderTarget?(Array.isArray(Be[W])?X=Be[W][j]:X=Be[W],se=!0):C.samples>0&&Xe.useMultisampledRTT(C)===!1?X=Te.get(C).__webglMultisampledFramebuffer:Array.isArray(Be)?X=Be[j]:X=Be,P.copy(C.viewport),N.copy(C.scissor),U=C.scissorTest}else P.copy(Z).multiplyScalar(A).floor(),N.copy(le).multiplyScalar(A).floor(),U=ve;if(j!==0&&(X=up),we.bindFramebuffer(O.FRAMEBUFFER,X)&&Y&&we.drawBuffers(C,X),we.viewport(P),we.scissor(N),we.setScissorTest(U),se){const ye=Te.get(C.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+W,ye.__webglTexture,j)}else if(pe){const ye=W;for(let Ue=0;Ue<C.textures.length;Ue++){const Be=Te.get(C.textures[Ue]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+Ue,Be.__webglTexture,j,ye)}}else if(C!==null&&j!==0){const ye=Te.get(C.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,ye.__webglTexture,j)}y=-1},this.readRenderTargetPixels=function(C,W,j,Y,X,se,pe,be=0){if(!(C&&C.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ye=Te.get(C).__webglFramebuffer;if(C.isWebGLCubeRenderTarget&&pe!==void 0&&(ye=ye[pe]),ye){we.bindFramebuffer(O.FRAMEBUFFER,ye);try{const Ue=C.textures[be],Be=Ue.format,De=Ue.type;if(!ke.textureFormatReadable(Be)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!ke.textureTypeReadable(De)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}W>=0&&W<=C.width-Y&&j>=0&&j<=C.height-X&&(C.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+be),O.readPixels(W,j,Y,X,Re.convert(Be),Re.convert(De),se))}finally{const Ue=R!==null?Te.get(R).__webglFramebuffer:null;we.bindFramebuffer(O.FRAMEBUFFER,Ue)}}},this.readRenderTargetPixelsAsync=async function(C,W,j,Y,X,se,pe,be=0){if(!(C&&C.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ye=Te.get(C).__webglFramebuffer;if(C.isWebGLCubeRenderTarget&&pe!==void 0&&(ye=ye[pe]),ye)if(W>=0&&W<=C.width-Y&&j>=0&&j<=C.height-X){we.bindFramebuffer(O.FRAMEBUFFER,ye);const Ue=C.textures[be],Be=Ue.format,De=Ue.type;if(!ke.textureFormatReadable(Be))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!ke.textureTypeReadable(De))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Ye=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,Ye),O.bufferData(O.PIXEL_PACK_BUFFER,se.byteLength,O.STREAM_READ),C.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+be),O.readPixels(W,j,Y,X,Re.convert(Be),Re.convert(De),0);const at=R!==null?Te.get(R).__webglFramebuffer:null;we.bindFramebuffer(O.FRAMEBUFFER,at);const Mt=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await xm(O,Mt,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,Ye),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,se),O.deleteBuffer(Ye),O.deleteSync(Mt),se}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(C,W=null,j=0){const Y=Math.pow(2,-j),X=Math.floor(C.image.width*Y),se=Math.floor(C.image.height*Y),pe=W!==null?W.x:0,be=W!==null?W.y:0;Xe.setTexture2D(C,0),O.copyTexSubImage2D(O.TEXTURE_2D,j,0,0,pe,be,X,se),we.unbindTexture()};const hp=O.createFramebuffer(),dp=O.createFramebuffer();this.copyTextureToTexture=function(C,W,j=null,Y=null,X=0,se=null){se===null&&(X!==0?(Cr("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),se=X,X=0):se=0);let pe,be,ye,Ue,Be,De,Ye,at,Mt;const dt=C.isCompressedTexture?C.mipmaps[se]:C.image;if(j!==null)pe=j.max.x-j.min.x,be=j.max.y-j.min.y,ye=j.isBox3?j.max.z-j.min.z:1,Ue=j.min.x,Be=j.min.y,De=j.isBox3?j.min.z:0;else{const un=Math.pow(2,-X);pe=Math.floor(dt.width*un),be=Math.floor(dt.height*un),C.isDataArrayTexture?ye=dt.depth:C.isData3DTexture?ye=Math.floor(dt.depth*un):ye=1,Ue=0,Be=0,De=0}Y!==null?(Ye=Y.x,at=Y.y,Mt=Y.z):(Ye=0,at=0,Mt=0);const ct=Re.convert(W.format),Ne=Re.convert(W.type);let gt;W.isData3DTexture?(Xe.setTexture3D(W,0),gt=O.TEXTURE_3D):W.isDataArrayTexture||W.isCompressedArrayTexture?(Xe.setTexture2DArray(W,0),gt=O.TEXTURE_2D_ARRAY):(Xe.setTexture2D(W,0),gt=O.TEXTURE_2D),O.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,W.flipY),O.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,W.premultiplyAlpha),O.pixelStorei(O.UNPACK_ALIGNMENT,W.unpackAlignment);const Qe=O.getParameter(O.UNPACK_ROW_LENGTH),en=O.getParameter(O.UNPACK_IMAGE_HEIGHT),ls=O.getParameter(O.UNPACK_SKIP_PIXELS),tn=O.getParameter(O.UNPACK_SKIP_ROWS),Qs=O.getParameter(O.UNPACK_SKIP_IMAGES);O.pixelStorei(O.UNPACK_ROW_LENGTH,dt.width),O.pixelStorei(O.UNPACK_IMAGE_HEIGHT,dt.height),O.pixelStorei(O.UNPACK_SKIP_PIXELS,Ue),O.pixelStorei(O.UNPACK_SKIP_ROWS,Be),O.pixelStorei(O.UNPACK_SKIP_IMAGES,De);const vt=C.isDataArrayTexture||C.isData3DTexture,cn=W.isDataArrayTexture||W.isData3DTexture;if(C.isDepthTexture){const un=Te.get(C),Xt=Te.get(W),Jt=Te.get(un.__renderTarget),Ca=Te.get(Xt.__renderTarget);we.bindFramebuffer(O.READ_FRAMEBUFFER,Jt.__webglFramebuffer),we.bindFramebuffer(O.DRAW_FRAMEBUFFER,Ca.__webglFramebuffer);for(let Bi=0;Bi<ye;Bi++)vt&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Te.get(C).__webglTexture,X,De+Bi),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Te.get(W).__webglTexture,se,Mt+Bi)),O.blitFramebuffer(Ue,Be,pe,be,Ye,at,pe,be,O.DEPTH_BUFFER_BIT,O.NEAREST);we.bindFramebuffer(O.READ_FRAMEBUFFER,null),we.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(X!==0||C.isRenderTargetTexture||Te.has(C)){const un=Te.get(C),Xt=Te.get(W);we.bindFramebuffer(O.READ_FRAMEBUFFER,hp),we.bindFramebuffer(O.DRAW_FRAMEBUFFER,dp);for(let Jt=0;Jt<ye;Jt++)vt?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,un.__webglTexture,X,De+Jt):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,un.__webglTexture,X),cn?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Xt.__webglTexture,se,Mt+Jt):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Xt.__webglTexture,se),X!==0?O.blitFramebuffer(Ue,Be,pe,be,Ye,at,pe,be,O.COLOR_BUFFER_BIT,O.NEAREST):cn?O.copyTexSubImage3D(gt,se,Ye,at,Mt+Jt,Ue,Be,pe,be):O.copyTexSubImage2D(gt,se,Ye,at,Ue,Be,pe,be);we.bindFramebuffer(O.READ_FRAMEBUFFER,null),we.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else cn?C.isDataTexture||C.isData3DTexture?O.texSubImage3D(gt,se,Ye,at,Mt,pe,be,ye,ct,Ne,dt.data):W.isCompressedArrayTexture?O.compressedTexSubImage3D(gt,se,Ye,at,Mt,pe,be,ye,ct,dt.data):O.texSubImage3D(gt,se,Ye,at,Mt,pe,be,ye,ct,Ne,dt):C.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,se,Ye,at,pe,be,ct,Ne,dt.data):C.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,se,Ye,at,dt.width,dt.height,ct,dt.data):O.texSubImage2D(O.TEXTURE_2D,se,Ye,at,pe,be,ct,Ne,dt);O.pixelStorei(O.UNPACK_ROW_LENGTH,Qe),O.pixelStorei(O.UNPACK_IMAGE_HEIGHT,en),O.pixelStorei(O.UNPACK_SKIP_PIXELS,ls),O.pixelStorei(O.UNPACK_SKIP_ROWS,tn),O.pixelStorei(O.UNPACK_SKIP_IMAGES,Qs),se===0&&W.generateMipmaps&&O.generateMipmap(gt),we.unbindTexture()},this.initRenderTarget=function(C){Te.get(C).__webglFramebuffer===void 0&&Xe.setupRenderTarget(C)},this.initTexture=function(C){C.isCubeTexture?Xe.setTextureCube(C,0):C.isData3DTexture?Xe.setTexture3D(C,0):C.isDataArrayTexture||C.isCompressedArrayTexture?Xe.setTexture2DArray(C,0):Xe.setTexture2D(C,0),we.unbindTexture()},this.resetState=function(){x=0,w=0,R=null,we.reset(),fe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Xn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=et._getDrawingBufferColorSpace(e),t.unpackColorSpace=et._getUnpackColorSpace()}}const Vo={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class Hr{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const $y=new xa(-1,1,1,-1,0,1);class jy extends ft{constructor(){super(),this.setAttribute("position",new Je([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Je([0,2,0,0,2,0],2))}}const Yy=new jy;class ef{constructor(e){this._mesh=new ae(Yy,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,$y)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class Ky extends Hr{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Lt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=ea.clone(e.uniforms),this.material=new Lt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new ef(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class Eh extends Hr{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const s=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}}class Zy extends Hr{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class Jy{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new Ee);this._width=i.width,this._height=i.height,t=new Cn(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:fi}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Ky(Vo),this.copyPass.material.blending=di,this.clock=new lg}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let s=0,r=this.passes.length;s<r;s++){const o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),o.needsSwap){if(i){const a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Eh!==void 0&&(o instanceof Eh?i=!0:o instanceof Zy&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new Ee);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(i,s),this.renderTarget2.setSize(i,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(i,s)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Qy extends Hr{constructor(e,t,i=null,s=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Se}render(e,t,i){const s=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=s}}const ex={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Se(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class Xs extends Hr{constructor(e,t=1,i,s){super(),this.strength=t,this.radius=i,this.threshold=s,this.resolution=e!==void 0?new Ee(e.x,e.y):new Ee(256,256),this.clearColor=new Se(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Cn(r,o,{type:fi}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let u=0;u<this.nMips;u++){const f=new Cn(r,o,{type:fi});f.texture.name="UnrealBloomPass.h"+u,f.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(f);const d=new Cn(r,o,{type:fi});d.texture.name="UnrealBloomPass.v"+u,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),r=Math.round(r/2),o=Math.round(o/2)}const a=ex;this.highPassUniforms=ea.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Lt({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let u=0;u<this.nMips;u++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[u])),this.separableBlurMaterials[u].uniforms.invSize.value=new Ee(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new k(1,1,1),new k(1,1,1),new k(1,1,1),new k(1,1,1),new k(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=ea.clone(Vo.uniforms),this.blendMaterial=new Lt({uniforms:this.copyUniforms,vertexShader:Vo.vertexShader,fragmentShader:Vo.fragmentShader,blending:is,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Se,this._oldClearAlpha=1,this._basic=new Fi,this._fsQuad=new ef(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let i=Math.round(e/2),s=Math.round(t/2);this.renderTargetBright.setSize(i,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(i,s),this.renderTargetsVertical[r].setSize(i,s),this.separableBlurMaterials[r].uniforms.invSize.value=new Ee(1/i,1/s),i=Math.round(i/2),s=Math.round(s/2)}render(e,t,i,s,r){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=i.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=Xs.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=Xs.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this._fsQuad.render(e),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(i),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=o}_getSeparableBlurMaterial(e){const t=[];for(let i=0;i<e;i++)t.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new Lt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new Ee(.5,.5)},direction:{value:new Ee(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}_getCompositeMaterial(e){return new Lt({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}Xs.BlurDirectionX=new Ee(1,0);Xs.BlurDirectionY=new Ee(0,1);const ge={HELLO:"hello",SET_NICKNAME:"set_nickname",JOIN_ROOM:"join_room",MOVEMENT:"movement",GARDEN_ACTION:"garden_action",MARKET_BUY:"market_buy",MARKET_SELL:"market_sell",ORDER_PLACE:"order_place",ORDER_CANCEL:"order_cancel",CONTRACT_COMPLETE:"contract_complete",NODE_HARVEST:"node_harvest",MACHINE_CONTRIBUTE:"machine_contribute",MACHINE_MILL:"machine_mill",MACHINE_CRAFT:"machine_craft",THEATER_QUEUE:"theater_queue",THEATER_CONTROL:"theater_control",THEATER_CHANNEL:"theater_channel",THEATER_PLAYLIST_RESOLVE:"theater_playlist_resolve",TORRENT_RESOLVE:"torrent_resolve",TORRENT_FILES:"torrent_files",TORRENT_STATE:"torrent_state",TORRENT_GRANT:"torrent_grant",IPTV_LIST_GET:"iptv_list_get",IPTV_LIST_REMOVE:"iptv_list_remove",EPG_LOOKUP:"epg_lookup",EMOTE:"emote",CHAT_SEND:"chat_send",PLACE_DIRECTORY_GET:"place_directory_get",WELCOME:"welcome",PRESENCE_JOIN:"presence_join",PRESENCE_LEAVE:"presence_leave",PRESENCE_UPDATE:"presence_update",GARDEN_STATE:"garden_state",INVENTORY_STATE:"inventory_state",MARKET_UPDATE:"market_update",CONTRACT_UPDATE:"contract_update",NODE_STATE:"node_state",MACHINE_UPDATE:"machine_update",THEATER_STATE:"theater_state",THEATER_PLAYLIST_RESOLVED:"theater_playlist_resolved",THEATER_IMPORT_RESULT:"theater_import_result",IPTV_STATE:"iptv_state",IPTV_LIST:"iptv_list",EPG_SCHEDULE:"epg_schedule",WEATHER_UPDATE:"weather_update",ACTION_RESULT:"action_result",TRADE_FILLED:"trade_filled",EMOTE_BROADCAST:"emote_broadcast",CHAT_HISTORY:"chat_history",CHAT_MESSAGE:"chat_message",CHAT_DM:"chat_dm",CHAT_PRESENCE:"chat_presence",CHAT_ERROR:"chat_error",PLACE_DIRECTORY:"place_directory",ATMOSPHERE_GET:"atmosphere_get",ATMOSPHERE_STATE:"atmosphere_state",ATMOSPHERE_UNAVAILABLE:"atmosphere_unavailable",ERROR:"error"},wt={MARKET:"market",THEATER:"theater",gardenFor:n=>`garden:${n}`,isGarden:n=>n?.startsWith("garden:"),gardenOwner:n=>n?.startsWith("garden:")?n.slice(7):null};function tx(n){return JSON.stringify(n)}function nx(n){try{return JSON.parse(n)}catch{return null}}const wh=["Mossy","Quiet","Copper","Rainy","Amber","Misty","Rust","Golden","Silver","Fern","Bramble","Cobble","Thistle","Breezy","Dusky","Dappled","Dewy","Hedge","Orchard","Verdant","Gilded","Pebble","Autumnal","Gleaming"],Th=["Radish","Turnip","Basil","Leek","Carrot","Kale","Tomato","Berry","Sorrel","Chive","Sprout","Fennel","Parsnip","Pepper","Clover","Borage","Sage","Mint","Beet","Chard"];function ra(n=Math.random()){const e=Math.floor(Math.abs(Math.sin(n*999))*wh.length),t=Math.floor(Math.abs(Math.cos(n*888))*Th.length),i=Math.floor(Math.abs(Math.sin(n*777))*90)+10;return`${wh[e]}${Th[t]}${i}`}function Ah(n){if(typeof n!="string")return ra();let e=n.replace(/<[^>]*>/g,"").replace(/[\x00-\x1F\x7F-\x9F]/g,"").trim();return e=e.replace(/[^\w\s-]/g,"").replace(/\s+/g," "),e.length>20&&(e=e.slice(0,20).trim()),e.length<3?ra():e}function ix(n=""){let e=0;for(let i=0;i<n.length;i++)e=e*31+n.charCodeAt(i)>>>0;const t=[{coat:"#7a4e32",apron:"#b8a682",hat:"#473d32",boots:"#2b231c"},{coat:"#3a5449",apron:"#c2bca3",hat:"#2d3f37",boots:"#202924"},{coat:"#3d4b60",apron:"#b5b29c",hat:"#2a3547",boots:"#1c222e"},{coat:"#634b6b",apron:"#bfb5a3",hat:"#44324a",boots:"#251c29"},{coat:"#806835",apron:"#ccc4a7",hat:"#544320",boots:"#2e2411"},{coat:"#445e38",apron:"#b8b498",hat:"#314427",boots:"#1f2b18"}];return t[e%t.length]}var ks=n=>typeof n=="function"?n:function(){return n},sx=typeof self<"u"?self:null,En=typeof window<"u"?window:null,On=sx||En||globalThis,rx="2.0.0",Bn={connecting:0,open:1,closing:2,closed:3},ox=100,ax=1e4,lx=1e3,rn={closed:"closed",errored:"errored",joined:"joined",joining:"joining",leaving:"leaving"},si={close:"phx_close",error:"phx_error",join:"phx_join",reply:"phx_reply",leave:"phx_leave"},vc={longpoll:"longpoll",websocket:"websocket"},cx={complete:4},_c="base64url.bearer.phx.",So=class{constructor(n,e,t,i){this.channel=n,this.event=e,this.payload=t||function(){return{}},this.receivedResp=null,this.timeout=i,this.timeoutTimer=null,this.recHooks=[],this.sent=!1}resend(n){this.timeout=n,this.reset(),this.send()}send(){this.hasReceived("timeout")||(this.startTimeout(),this.sent=!0,this.channel.socket.push({topic:this.channel.topic,event:this.event,payload:this.payload(),ref:this.ref,join_ref:this.channel.joinRef()}))}receive(n,e){return this.hasReceived(n)&&e(this.receivedResp.response),this.recHooks.push({status:n,callback:e}),this}reset(){this.cancelRefEvent(),this.ref=null,this.refEvent=null,this.receivedResp=null,this.sent=!1}matchReceive({status:n,response:e,_ref:t}){this.recHooks.filter(i=>i.status===n).forEach(i=>i.callback(e))}cancelRefEvent(){this.refEvent&&this.channel.off(this.refEvent)}cancelTimeout(){clearTimeout(this.timeoutTimer),this.timeoutTimer=null}startTimeout(){this.timeoutTimer&&this.cancelTimeout(),this.cancelRefEvent(),this.ref=this.channel.socket.makeRef(),this.refEvent=this.channel.replyEventName(this.ref),this.channel.on(this.refEvent,n=>{this.cancelRefEvent(),this.cancelTimeout(),this.receivedResp=n,this.matchReceive(n)}),this.timeoutTimer=setTimeout(()=>{this.trigger("timeout",{})},this.timeout)}hasReceived(n){return this.receivedResp&&this.receivedResp.status===n}trigger(n,e){this.channel.trigger(this.refEvent,{status:n,response:e})}},tf=class{constructor(n,e){this.callback=n,this.timerCalc=e,this.timer=null,this.tries=0}reset(){this.tries=0,clearTimeout(this.timer)}scheduleTimeout(){clearTimeout(this.timer),this.timer=setTimeout(()=>{this.tries=this.tries+1,this.callback()},this.timerCalc(this.tries+1))}},ux=class{constructor(n,e,t){this.state=rn.closed,this.topic=n,this.params=ks(e||{}),this.socket=t,this.bindings=[],this.bindingRef=0,this.timeout=this.socket.timeout,this.joinedOnce=!1,this.joinPush=new So(this,si.join,this.params,this.timeout),this.pushBuffer=[],this.stateChangeRefs=[],this.rejoinTimer=new tf(()=>{this.socket.isConnected()&&this.rejoin()},this.socket.rejoinAfterMs),this.stateChangeRefs.push(this.socket.onError(()=>this.rejoinTimer.reset())),this.stateChangeRefs.push(this.socket.onOpen(()=>{this.rejoinTimer.reset(),this.isErrored()&&this.rejoin()})),this.joinPush.receive("ok",()=>{this.state=rn.joined,this.rejoinTimer.reset(),this.pushBuffer.forEach(i=>i.send()),this.pushBuffer=[]}),this.joinPush.receive("error",()=>{this.state=rn.errored,this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.onClose(()=>{this.rejoinTimer.reset(),this.socket.hasLogger()&&this.socket.log("channel",`close ${this.topic} ${this.joinRef()}`),this.state=rn.closed,this.socket.remove(this)}),this.onError(i=>{this.socket.hasLogger()&&this.socket.log("channel",`error ${this.topic}`,i),this.isJoining()&&this.joinPush.reset(),this.state=rn.errored,this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.joinPush.receive("timeout",()=>{this.socket.hasLogger()&&this.socket.log("channel",`timeout ${this.topic} (${this.joinRef()})`,this.joinPush.timeout),new So(this,si.leave,ks({}),this.timeout).send(),this.state=rn.errored,this.joinPush.reset(),this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.on(si.reply,(i,s)=>{this.trigger(this.replyEventName(s),i)})}join(n=this.timeout){if(this.joinedOnce)throw new Error("tried to join multiple times. 'join' can only be called a single time per channel instance");return this.timeout=n,this.joinedOnce=!0,this.rejoin(),this.joinPush}onClose(n){this.on(si.close,n)}onError(n){return this.on(si.error,e=>n(e))}on(n,e){let t=this.bindingRef++;return this.bindings.push({event:n,ref:t,callback:e}),t}off(n,e){this.bindings=this.bindings.filter(t=>!(t.event===n&&(typeof e>"u"||e===t.ref)))}canPush(){return this.socket.isConnected()&&this.isJoined()}push(n,e,t=this.timeout){if(e=e||{},!this.joinedOnce)throw new Error(`tried to push '${n}' to '${this.topic}' before joining. Use channel.join() before pushing events`);let i=new So(this,n,function(){return e},t);return this.canPush()?i.send():(i.startTimeout(),this.pushBuffer.push(i)),i}leave(n=this.timeout){this.rejoinTimer.reset(),this.joinPush.cancelTimeout(),this.state=rn.leaving;let e=()=>{this.socket.hasLogger()&&this.socket.log("channel",`leave ${this.topic}`),this.trigger(si.close,"leave")},t=new So(this,si.leave,ks({}),n);return t.receive("ok",()=>e()).receive("timeout",()=>e()),t.send(),this.canPush()||t.trigger("ok",{}),t}onMessage(n,e,t){return e}isMember(n,e,t,i){return this.topic!==n?!1:i&&i!==this.joinRef()?(this.socket.hasLogger()&&this.socket.log("channel","dropping outdated message",{topic:n,event:e,payload:t,joinRef:i}),!1):!0}joinRef(){return this.joinPush.ref}rejoin(n=this.timeout){this.isLeaving()||(this.socket.leaveOpenTopic(this.topic),this.state=rn.joining,this.joinPush.resend(n))}trigger(n,e,t,i){let s=this.onMessage(n,e,t,i);if(e&&!s)throw new Error("channel onMessage callbacks must return the payload, modified or unmodified");let r=this.bindings.filter(o=>o.event===n);for(let o=0;o<r.length;o++)r[o].callback(s,t,i||this.joinRef())}replyEventName(n){return`chan_reply_${n}`}isClosed(){return this.state===rn.closed}isErrored(){return this.state===rn.errored}isJoined(){return this.state===rn.joined}isJoining(){return this.state===rn.joining}isLeaving(){return this.state===rn.leaving}},oa=class{static request(n,e,t,i,s,r,o){if(On.XDomainRequest){let a=new On.XDomainRequest;return this.xdomainRequest(a,n,e,i,s,r,o)}else if(On.XMLHttpRequest){let a=new On.XMLHttpRequest;return this.xhrRequest(a,n,e,t,i,s,r,o)}else{if(On.fetch&&On.AbortController)return this.fetchRequest(n,e,t,i,s,r,o);throw new Error("No suitable XMLHttpRequest implementation found")}}static fetchRequest(n,e,t,i,s,r,o){let a={method:n,headers:t,body:i},l=null;return s&&(l=new AbortController,setTimeout(()=>l.abort(),s),a.signal=l.signal),On.fetch(e,a).then(c=>c.text()).then(c=>this.parseJSON(c)).then(c=>o&&o(c)).catch(c=>{c.name==="AbortError"&&r?r():o&&o(null)}),l}static xdomainRequest(n,e,t,i,s,r,o){return n.timeout=s,n.open(e,t),n.onload=()=>{let a=this.parseJSON(n.responseText);o&&o(a)},r&&(n.ontimeout=r),n.onprogress=()=>{},n.send(i),n}static xhrRequest(n,e,t,i,s,r,o,a){n.open(e,t,!0),n.timeout=r;for(let[l,c]of Object.entries(i))n.setRequestHeader(l,c);return n.onerror=()=>a&&a(null),n.onreadystatechange=()=>{if(n.readyState===cx.complete&&a){let l=this.parseJSON(n.responseText);a(l)}},o&&(n.ontimeout=o),n.send(s),n}static parseJSON(n){if(!n||n==="")return null;try{return JSON.parse(n)}catch{return console&&console.log("failed to parse JSON response",n),null}}static serialize(n,e){let t=[];for(var i in n){if(!Object.prototype.hasOwnProperty.call(n,i))continue;let s=e?`${e}[${i}]`:i,r=n[i];typeof r=="object"?t.push(this.serialize(r,s)):t.push(encodeURIComponent(s)+"="+encodeURIComponent(r))}return t.join("&")}static appendParams(n,e){if(Object.keys(e).length===0)return n;let t=n.match(/\?/)?"&":"?";return`${n}${t}${this.serialize(e)}`}},hx=n=>{let e="",t=new Uint8Array(n),i=t.byteLength;for(let s=0;s<i;s++)e+=String.fromCharCode(t[s]);return btoa(e)},Cs=class{constructor(n,e){e&&e.length===2&&e[1].startsWith(_c)&&(this.authToken=atob(e[1].slice(_c.length))),this.endPoint=null,this.token=null,this.skipHeartbeat=!0,this.reqs=new Set,this.awaitingBatchAck=!1,this.currentBatch=null,this.currentBatchTimer=null,this.batchBuffer=[],this.onopen=function(){},this.onerror=function(){},this.onmessage=function(){},this.onclose=function(){},this.pollEndpoint=this.normalizeEndpoint(n),this.readyState=Bn.connecting,setTimeout(()=>this.poll(),0)}normalizeEndpoint(n){return n.replace("ws://","http://").replace("wss://","https://").replace(new RegExp("(.*)/"+vc.websocket),"$1/"+vc.longpoll)}endpointURL(){return oa.appendParams(this.pollEndpoint,{token:this.token})}closeAndRetry(n,e,t){this.close(n,e,t),this.readyState=Bn.connecting}ontimeout(){this.onerror("timeout"),this.closeAndRetry(1005,"timeout",!1)}isActive(){return this.readyState===Bn.open||this.readyState===Bn.connecting}poll(){const n={Accept:"application/json"};this.authToken&&(n["X-Phoenix-AuthToken"]=this.authToken),this.ajax("GET",n,null,()=>this.ontimeout(),e=>{if(e){var{status:t,token:i,messages:s}=e;if(t===410&&this.token!==null){this.onerror(410),this.closeAndRetry(3410,"session_gone",!1);return}this.token=i}else t=0;switch(t){case 200:s.forEach(r=>{setTimeout(()=>this.onmessage({data:r}),0)}),this.poll();break;case 204:this.poll();break;case 410:this.readyState=Bn.open,this.onopen({}),this.poll();break;case 403:this.onerror(403),this.close(1008,"forbidden",!1);break;case 0:case 500:this.onerror(500),this.closeAndRetry(1011,"internal server error",500);break;default:throw new Error(`unhandled poll status ${t}`)}})}send(n){typeof n!="string"&&(n=hx(n)),this.currentBatch?this.currentBatch.push(n):this.awaitingBatchAck?this.batchBuffer.push(n):(this.currentBatch=[n],this.currentBatchTimer=setTimeout(()=>{this.batchSend(this.currentBatch),this.currentBatch=null},0))}batchSend(n,e=0){this.awaitingBatchAck=!0;const t=e+ox,i=n.slice(e,t);this.ajax("POST",{"Content-Type":"application/x-ndjson"},i.join(`
`),()=>this.ontimeout(),s=>{!s||s.status!==200?(this.awaitingBatchAck=!1,this.onerror(s&&s.status),this.closeAndRetry(1011,"internal server error",!1)):t<n.length?this.batchSend(n,t):this.batchBuffer.length>0?(this.batchSend(this.batchBuffer),this.batchBuffer=[]):this.awaitingBatchAck=!1})}close(n,e,t){for(let s of this.reqs)s.abort();this.readyState=Bn.closed;let i=Object.assign({code:1e3,reason:void 0,wasClean:!0},{code:n,reason:e,wasClean:t});this.batchBuffer=[],this.awaitingBatchAck=!1,clearTimeout(this.currentBatchTimer),this.currentBatchTimer=null,typeof CloseEvent<"u"?this.onclose(new CloseEvent("close",i)):this.onclose(i)}ajax(n,e,t,i,s){let r,o=()=>{this.reqs.delete(r),i()};r=oa.request(n,this.endpointURL(),e,t,this.timeout,o,a=>{this.reqs.delete(r),this.isActive()&&s(a)}),this.reqs.add(r)}},Eo={HEADER_LENGTH:1,META_LENGTH:4,KINDS:{push:0,reply:1,broadcast:2},encode(n,e){if(n.payload.constructor===ArrayBuffer)return e(this.binaryEncode(n));{let t=[n.join_ref,n.ref,n.topic,n.event,n.payload];return e(JSON.stringify(t))}},decode(n,e){if(n.constructor===ArrayBuffer)return e(this.binaryDecode(n));{let[t,i,s,r,o]=JSON.parse(n);return e({join_ref:t,ref:i,topic:s,event:r,payload:o})}},binaryEncode(n){let{join_ref:e,ref:t,event:i,topic:s,payload:r}=n,o=new TextEncoder,a=o.encode(e),l=o.encode(t),c=o.encode(s),u=o.encode(i);this.assertFieldSize(a.byteLength,"join_ref"),this.assertFieldSize(l.byteLength,"ref"),this.assertFieldSize(c.byteLength,"topic"),this.assertFieldSize(u.byteLength,"event");let f=this.META_LENGTH+a.byteLength+l.byteLength+c.byteLength+u.byteLength,d=new ArrayBuffer(this.HEADER_LENGTH+f),h=new Uint8Array(d),v=new DataView(d),g=0;v.setUint8(g++,this.KINDS.push),v.setUint8(g++,a.byteLength),v.setUint8(g++,l.byteLength),v.setUint8(g++,c.byteLength),v.setUint8(g++,u.byteLength),h.set(a,g),g+=a.byteLength,h.set(l,g),g+=l.byteLength,h.set(c,g),g+=c.byteLength,h.set(u,g),g+=u.byteLength;var m=new Uint8Array(d.byteLength+r.byteLength);return m.set(h,0),m.set(new Uint8Array(r),d.byteLength),m.buffer},assertFieldSize(n,e){if(n>255)throw new Error(`unable to convert ${e} to binary: must be less than or equal to 255 bytes, but is ${n} bytes`)},binaryDecode(n){let e=new DataView(n),t=e.getUint8(0),i=new TextDecoder;switch(t){case this.KINDS.push:return this.decodePush(n,e,i);case this.KINDS.reply:return this.decodeReply(n,e,i);case this.KINDS.broadcast:return this.decodeBroadcast(n,e,i)}},decodePush(n,e,t){let i=e.getUint8(1),s=e.getUint8(2),r=e.getUint8(3),o=this.HEADER_LENGTH+this.META_LENGTH-1,a=t.decode(n.slice(o,o+i));o=o+i;let l=t.decode(n.slice(o,o+s));o=o+s;let c=t.decode(n.slice(o,o+r));o=o+r;let u=n.slice(o,n.byteLength);return{join_ref:a,ref:null,topic:l,event:c,payload:u}},decodeReply(n,e,t){let i=e.getUint8(1),s=e.getUint8(2),r=e.getUint8(3),o=e.getUint8(4),a=this.HEADER_LENGTH+this.META_LENGTH,l=t.decode(n.slice(a,a+i));a=a+i;let c=t.decode(n.slice(a,a+s));a=a+s;let u=t.decode(n.slice(a,a+r));a=a+r;let f=t.decode(n.slice(a,a+o));a=a+o;let d=n.slice(a,n.byteLength),h={status:f,response:d};return{join_ref:l,ref:c,topic:u,event:si.reply,payload:h}},decodeBroadcast(n,e,t){let i=e.getUint8(1),s=e.getUint8(2),r=this.HEADER_LENGTH+2,o=t.decode(n.slice(r,r+i));r=r+i;let a=t.decode(n.slice(r,r+s));r=r+s;let l=n.slice(r,n.byteLength);return{join_ref:null,ref:null,topic:o,event:a,payload:l}}},dx=class{constructor(n,e={}){this.stateChangeCallbacks={open:[],close:[],error:[],message:[]},this.channels=[],this.sendBuffer=[],this.ref=0,this.fallbackRef=null,this.timeout=e.timeout||ax,this.transport=e.transport||On.WebSocket||Cs,this.primaryPassedHealthCheck=!1,this.longPollFallbackMs=e.longPollFallbackMs,this.fallbackTimer=null,this.sessionStore=e.sessionStorage||On&&On.sessionStorage,this.establishedConnections=0,this.defaultEncoder=Eo.encode.bind(Eo),this.defaultDecoder=Eo.decode.bind(Eo),this.closeWasClean=!0,this.disconnecting=!1,this.binaryType=e.binaryType||"arraybuffer",this.connectClock=1,this.transport!==Cs?(this.encode=e.encode||this.defaultEncoder,this.decode=e.decode||this.defaultDecoder):(this.encode=this.defaultEncoder,this.decode=this.defaultDecoder);let t=null;En&&En.addEventListener&&(En.addEventListener("pagehide",i=>{this.conn&&(this.disconnect(),t=this.connectClock)}),En.addEventListener("pageshow",i=>{t===this.connectClock&&(t=null,this.connect())}),En.addEventListener("visibilitychange",()=>{this.handleVisibilityChange()}),En.document&&En.document.addEventListener("resume",()=>{this.handleVisibilityChange()})),this.heartbeatIntervalMs=e.heartbeatIntervalMs||3e4,this.rejoinAfterMs=i=>e.rejoinAfterMs?e.rejoinAfterMs(i):[1e3,2e3,5e3][i-1]||1e4,this.reconnectAfterMs=i=>e.reconnectAfterMs?e.reconnectAfterMs(i):[10,50,100,150,200,250,500,1e3,2e3][i-1]||5e3,this.logger=e.logger||null,!this.logger&&e.debug&&(this.logger=(i,s,r)=>{console.log(`${i}: ${s}`,r)}),this.longpollerTimeout=e.longpollerTimeout||2e4,this.params=ks(e.params||{}),this.endPoint=`${n}/${vc.websocket}`,this.vsn=e.vsn||rx,this.heartbeatTimeoutTimer=null,this.heartbeatTimer=null,this.pendingHeartbeatRef=null,this.reconnectTimer=new tf(()=>{if(this.pageHidden){this.log("Not reconnecting as page is hidden!"),this.teardown();return}this.teardown(()=>this.connect())},this.reconnectAfterMs),this.authToken=e.authToken&&ks(e.authToken)}get pageHidden(){return En&&En.document?En.document.visibilityState==="hidden":!1}handleVisibilityChange(){this.pageHidden||!this.isConnected()&&!this.closeWasClean&&this.teardown(()=>this.connect())}getLongPollTransport(){return Cs}replaceTransport(n){this.connectClock++,this.closeWasClean=!0,clearTimeout(this.fallbackTimer),this.reconnectTimer.reset(),this.conn&&(this.conn.close(),this.conn=null),this.transport=n}protocol(){return location.protocol.match(/^https/)?"wss":"ws"}endPointURL(){let n=oa.appendParams(oa.appendParams(this.endPoint,this.params()),{vsn:this.vsn});return n.charAt(0)!=="/"?n:n.charAt(1)==="/"?`${this.protocol()}:${n}`:`${this.protocol()}://${location.host}${n}`}disconnect(n,e,t){this.connectClock++,this.disconnecting=!0,this.closeWasClean=!0,clearTimeout(this.fallbackTimer),this.reconnectTimer.reset(),this.teardown(()=>{this.disconnecting=!1,n&&n()},e,t)}connect(n){n&&(console&&console.log("passing params to connect is deprecated. Instead pass :params to the Socket constructor"),this.params=ks(n)),!(this.conn&&!this.disconnecting)&&(this.longPollFallbackMs&&this.transport!==Cs?this.connectWithFallback(Cs,this.longPollFallbackMs):this.transportConnect())}log(n,e,t){this.logger&&this.logger(n,e,t)}hasLogger(){return this.logger!==null}onOpen(n){let e=this.makeRef();return this.stateChangeCallbacks.open.push([e,n]),e}onClose(n){let e=this.makeRef();return this.stateChangeCallbacks.close.push([e,n]),e}onError(n){let e=this.makeRef();return this.stateChangeCallbacks.error.push([e,n]),e}onMessage(n){let e=this.makeRef();return this.stateChangeCallbacks.message.push([e,n]),e}ping(n){if(!this.isConnected())return!1;let e=this.makeRef(),t=Date.now();this.push({topic:"phoenix",event:"heartbeat",payload:{},ref:e});let i=this.onMessage(s=>{s.ref===e&&(this.off([i]),n(Date.now()-t))});return!0}transportName(n){return n===Cs?"LongPoll":n.name}transportConnect(){this.connectClock++,this.closeWasClean=!1;let n;this.authToken&&(n=["phoenix",`${_c}${btoa(this.authToken()).replace(/=/g,"")}`]),this.conn=new this.transport(this.endPointURL(),n),this.conn.binaryType=this.binaryType,this.conn.timeout=this.longpollerTimeout,this.conn.onopen=()=>this.onConnOpen(),this.conn.onerror=e=>this.onConnError(e),this.conn.onmessage=e=>this.onConnMessage(e),this.conn.onclose=e=>this.onConnClose(e)}getSession(n){return this.sessionStore&&this.sessionStore.getItem(n)}storeSession(n,e){this.sessionStore&&this.sessionStore.setItem(n,e)}connectWithFallback(n,e=2500){clearTimeout(this.fallbackTimer);let t=!1,i=!0,s,r,o=this.transportName(n),a=l=>{this.log("transport",`falling back to ${o}...`,l),this.off([s,r]),i=!1,this.replaceTransport(n),this.transportConnect()};if(this.getSession(`phx:fallback:${o}`))return a("memorized");this.fallbackTimer=setTimeout(a,e),r=this.onError(l=>{this.log("transport","error",l),i&&!t&&(clearTimeout(this.fallbackTimer),a(l))}),this.fallbackRef&&this.off([this.fallbackRef]),this.fallbackRef=this.onOpen(()=>{if(t=!0,!i){let l=this.transportName(n);return this.primaryPassedHealthCheck||this.storeSession(`phx:fallback:${l}`,"true"),this.log("transport",`established ${l} fallback`)}clearTimeout(this.fallbackTimer),this.fallbackTimer=setTimeout(a,e),this.ping(l=>{this.log("transport","connected to primary after",l),this.primaryPassedHealthCheck=!0,clearTimeout(this.fallbackTimer)})}),this.transportConnect()}clearHeartbeats(){clearTimeout(this.heartbeatTimer),clearTimeout(this.heartbeatTimeoutTimer)}onConnOpen(){this.hasLogger()&&this.log("transport",`${this.transportName(this.transport)} connected to ${this.endPointURL()}`),this.closeWasClean=!1,this.disconnecting=!1,this.establishedConnections++,this.flushSendBuffer(),this.reconnectTimer.reset(),this.resetHeartbeat(),this.stateChangeCallbacks.open.forEach(([,n])=>n())}heartbeatTimeout(){this.pendingHeartbeatRef&&(this.pendingHeartbeatRef=null,this.hasLogger()&&this.log("transport","heartbeat timeout. Attempting to re-establish connection"),this.triggerChanError("heartbeat_timeout"),this.closeWasClean=!1,this.teardown(()=>this.reconnectTimer.scheduleTimeout(),lx,"heartbeat timeout"))}resetHeartbeat(){this.conn&&this.conn.skipHeartbeat||(this.pendingHeartbeatRef=null,this.clearHeartbeats(),this.heartbeatTimer=setTimeout(()=>this.sendHeartbeat(),this.heartbeatIntervalMs))}teardown(n,e,t){if(!this.conn)return n&&n();const i=this.conn;this.waitForBufferDone(i,()=>{e?i.close(e,t||""):i.close(),this.waitForSocketClosed(i,()=>{this.conn===i&&(this.conn.onopen=function(){},this.conn.onerror=function(){},this.conn.onmessage=function(){},this.conn.onclose=function(){},this.conn=null),n&&n()})})}waitForBufferDone(n,e,t=1){if(t===5||!n.bufferedAmount){e();return}setTimeout(()=>{this.waitForBufferDone(n,e,t+1)},150*t)}waitForSocketClosed(n,e,t=1){if(t===5||n.readyState===Bn.closed){e();return}setTimeout(()=>{this.waitForSocketClosed(n,e,t+1)},150*t)}onConnClose(n){this.conn&&(this.conn.onclose=()=>{});let e=n&&n.code;this.hasLogger()&&this.log("transport","close",n),this.triggerChanError("connection_closed"),this.clearHeartbeats(),!this.closeWasClean&&e!==1e3&&this.reconnectTimer.scheduleTimeout(),this.stateChangeCallbacks.close.forEach(([,t])=>t(n))}onConnError(n){this.hasLogger()&&this.log("transport","error",n);let e=this.transport,t=this.establishedConnections;this.stateChangeCallbacks.error.forEach(([,i])=>{i(n,e,t)}),(e===this.transport||t>0)&&this.triggerChanError("connection_error")}triggerChanError(n){this.channels.forEach(e=>{e.isErrored()||e.isLeaving()||e.isClosed()||e.trigger(si.error,{source:"transport",reason:n})})}connectionState(){switch(this.conn&&this.conn.readyState){case Bn.connecting:return"connecting";case Bn.open:return"open";case Bn.closing:return"closing";default:return"closed"}}isConnected(){return this.connectionState()==="open"}remove(n){this.off(n.stateChangeRefs),this.channels=this.channels.filter(e=>e!==n)}off(n){for(let e in this.stateChangeCallbacks)this.stateChangeCallbacks[e]=this.stateChangeCallbacks[e].filter(([t])=>n.indexOf(t)===-1)}channel(n,e={}){let t=new ux(n,e,this);return this.channels.push(t),t}push(n){if(this.hasLogger()){let{topic:e,event:t,payload:i,ref:s,join_ref:r}=n;this.log("push",`${e} ${t} (${r}, ${s})`,i)}this.isConnected()?this.encode(n,e=>this.conn.send(e)):this.sendBuffer.push(()=>this.encode(n,e=>this.conn.send(e)))}makeRef(){let n=this.ref+1;return n===this.ref?this.ref=0:this.ref=n,this.ref.toString()}sendHeartbeat(){this.pendingHeartbeatRef&&!this.isConnected()||(this.pendingHeartbeatRef=this.makeRef(),this.push({topic:"phoenix",event:"heartbeat",payload:{},ref:this.pendingHeartbeatRef}),this.heartbeatTimeoutTimer=setTimeout(()=>this.heartbeatTimeout(),this.heartbeatIntervalMs))}flushSendBuffer(){this.isConnected()&&this.sendBuffer.length>0&&(this.sendBuffer.forEach(n=>n()),this.sendBuffer=[])}onConnMessage(n){this.decode(n.data,e=>{let{topic:t,event:i,payload:s,ref:r,join_ref:o}=e;r&&r===this.pendingHeartbeatRef&&(this.clearHeartbeats(),this.pendingHeartbeatRef=null,this.heartbeatTimer=setTimeout(()=>this.sendHeartbeat(),this.heartbeatIntervalMs)),this.hasLogger()&&this.log("receive",`${s.status||""} ${t} ${i} ${r&&"("+r+")"||""}`,s);for(let a=0;a<this.channels.length;a++){const l=this.channels[a];l.isMember(t,i,s,o)&&l.trigger(i,s,r,o)}for(let a=0;a<this.stateChangeCallbacks.message.length;a++){let[,l]=this.stateChangeCallbacks.message[a];l(e)}})}leaveOpenTopic(n){let e=this.channels.find(t=>t.topic===n&&(t.isJoined()||t.isJoining()));e&&(this.hasLogger()&&this.log("transport",`leaving duplicate topic "${n}"`),e.leave())}};const fx=new Set(["presence_update","presence_join","presence_leave","emote_broadcast","theater_state","torrent_state","garden_state","welcome","atmosphere_state"]);function nf(n,e){return typeof e!="string"||typeof n!="string"?!0:e===n}function px(n,e,t){if(!t?.type||!fx.has(t.type))return!0;if(!nf(e,t.roomId))return!1;const i=typeof t.epoch=="number"?t.epoch:0,s=e||t.roomId||"_default",r=n.get(s)??0;return i<r?!1:(i>r&&n.set(s,i),!0)}function mx(n=1e3){const e=Math.floor(Math.random()*n);return n+e}const gx="game:v1";function vx(n){return typeof n!="string"||n.startsWith("phoenix")||n.startsWith("phx_")||n.startsWith("chan_reply")}function _x(n,e){return vx(n)?null:e&&typeof e=="object"&&!Array.isArray(e)?{type:n,...e}:{type:n}}function yx(n,e){if(!n?.data||typeof n.data!="string"||!nf(e,n.roomId))return null;const t=atob(n.data),i=new Uint8Array(t.length);for(let s=0;s<t.length;s++)i[s]=t.charCodeAt(s);return i.buffer}function xx(n){try{const e=new URL(n);return`${e.protocol==="wss:"?"https:":"http:"}//${e.host}`}catch{const e=typeof window<"u"?window.location:{protocol:"http:",hostname:"localhost"};return`${e.protocol}//${e.hostname}:3001`}}function bx(n,e){let t=null,i=null,s=!1,r=!1;async function o(){const l=await fetch(`${xx(e)}/api/auth/guest`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({guestId:n.guestId,nickname:n.nickname})});if(!l.ok)throw new Error(`guest token refused (HTTP ${l.status})`);const c=await l.json();if(!c?.token)throw new Error("guest token response missing token");return c.token}function a(){if(i)try{i.leave()}catch{}if(t)try{t.disconnect()}catch{}i=null,t=null,s=!1,r=!1}return{isOpen:()=>s,isConnecting:()=>r,connect(){s||r||(r=!0,o().then(l=>{t=new dx(e,{params:{token:l}}),t.onOpen(()=>{i=t.channel(gx,{guestId:n.guestId}),i.onMessage=(c,u)=>{const f=_x(c,u);return f&&s&&n.handleFrame(f),u},i.join().receive("ok",()=>{s=!0,r=!1,i.on("rt_binary",c=>{if(!n.handleBinary)return;const u=yx(c,n.desiredRoom);u&&n.handleBinary(u)}),n.handleOpen()}).receive("error",c=>{console.warn("game channel join refused:",c),a(),n.handleError(c),n.handleClose()})}),t.onClose(()=>{const c=s;a(),c&&n.handleClose()}),t.onError(c=>{if(r){r=!1,a(),n.handleError(c),n.handleClose();return}n.handleError(c)}),t.connect()}).catch(l=>{r=!1,n.handleError(l),n.handleClose()}))},send(l){if(!s||!i)return;const{type:c,...u}=l;i.push(c,u)},close(){a()},getSocket(){return t},joinChannel(l,c={}){return t?t.channel(l,c):null}}}const Ch="afterlight-gardener-guest-id",cl="afterlight-gardener-nickname";function Mx(n,e){return{isOpen:()=>!!(n.ws&&n.ws.readyState===WebSocket.OPEN),isConnecting:()=>!!(n.ws&&n.ws.readyState===WebSocket.CONNECTING),connect(){if(this.isOpen()||this.isConnecting())return;let t;try{t=new WebSocket(e)}catch(i){console.warn("WebSocket init failed, scheduling reconnect:",i.message),n.scheduleReconnect();return}n.ws=t,t.binaryType="arraybuffer",t.onopen=()=>n.handleOpen(),t.onmessage=i=>{if(typeof i.data!="string"){n.handleBinary&&n.handleBinary(i.data);return}const s=nx(i.data);!s||!s.type||n.handleFrame(s)},t.onclose=()=>n.handleClose(),t.onerror=i=>n.handleError(i)},send(t){n.ws.send(tx(t))},close(){n.ws&&n.ws.close()}}}class Sx{constructor(e=null){this.wsUrl=e||this.getDefaultUrl(),this.guestId=this.getOrCreateGuestId(),this.nickname=this.getOrCreateNickname(),this.ws=null,this.connected=!1,this.handlers=new Map,this.connectListeners=[],this.disconnectListeners=[],this.reconnectAttempts=0,this.reconnectTimer=null,this.lastMovementSend=0,this.desiredRoom=null,this.superseded=!1,this.roomEpochs=new Map,this.torrentGrants=new Map,this.transportMode="phoenix",this.transport=this.transportMode==="phoenix"?bx(this,this.wsUrl):Mx(this,this.wsUrl)}getDefaultUrl(){return"<PRODUCTION_WS_URL>"}getOrCreateGuestId(){try{let e=localStorage.getItem(Ch);return(!e||typeof e!="string")&&(e="guest_"+Math.random().toString(36).substring(2,11)+"_"+Date.now().toString(36),localStorage.setItem(Ch,e)),e}catch{return"guest_"+Math.random().toString(36).substring(2,11)}}getOrCreateNickname(){try{let e=localStorage.getItem(cl);return e||(e=ra(),localStorage.setItem(cl,e)),Ah(e)}catch{return ra()}}setStoredNickname(e){this.nickname=Ah(e);try{localStorage.setItem(cl,this.nickname)}catch{}}connect(){this.superseded||this.transport.isOpen()||this.transport.isConnecting()||this.transport.connect()}handleOpen(){this.connected=!0,this.reconnectAttempts=0,this.send(ge.HELLO,{guestId:this.guestId,nickname:this.nickname,...this.rtHello?{rt:this.rtHello}:{}}),this.desiredRoom&&this.send(ge.JOIN_ROOM,{roomId:this.desiredRoom}),this.connectListeners.forEach(e=>e())}handleFrame(e){if(e.type==="error"&&e.message==="superseded"&&(this.superseded=!0),e.type==="error"&&e.message==="lease_lost"){if(typeof e.epoch=="number"&&this.desiredRoom){const i=this.roomEpochs.get(this.desiredRoom)??0;e.epoch>i&&this.roomEpochs.set(this.desiredRoom,e.epoch)}this.scheduleReconnect(mx());return}if(!px(this.roomEpochs,this.desiredRoom,e))return;e.type==="torrent_grant"&&this.storeTorrentGrant(e);const t=this.handlers.get(e.type);t&&t.forEach(i=>i(e))}handleClose(){this.connected=!1,this.disconnectListeners.forEach(e=>e()),this.scheduleReconnect()}handleError(e){console.warn("NetworkClient transport error:",e)}scheduleReconnect(e=null){if(this.superseded||this.reconnectTimer)return;const t=e??Math.min(1e4,1e3*Math.pow(1.5,this.reconnectAttempts));this.reconnectAttempts++,this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect()},t)}on(e,t){this.handlers.has(e)||this.handlers.set(e,[]),this.handlers.get(e).push(t)}onConnect(e){this.connectListeners.push(e)}onDisconnect(e){this.disconnectListeners.push(e)}send(e,t={}){this.transport.isOpen()&&this.transport.send({type:e,...t})}sendMovement(e,t,i,s,r=!1,o=!1){const a=performance.now();a-this.lastMovementSend<80||(this.lastMovementSend=a,this.send(ge.MOVEMENT,{x:e,z:t,rotY:i,walking:s,sitting:!!r,airborne:!!o}))}sendTheaterQueue(e){this.send(ge.THEATER_QUEUE,e)}sendTheaterControl(e){this.send(ge.THEATER_CONTROL,e)}sendTheaterChannel(e,t){this.send(ge.THEATER_CHANNEL,{url:e,title:t})}sendTorrentResolve(e,t){this.send(ge.TORRENT_RESOLVE,{requestId:e,magnet:t})}sendPlaylistResolve(e,t){this.send(ge.THEATER_PLAYLIST_RESOLVE,{requestId:e,listId:t})}sendIptvListGet(e){this.send(ge.IPTV_LIST_GET,{listId:e})}sendIptvListRemove(e){this.send(ge.IPTV_LIST_REMOVE,{listId:e})}sendEpgLookup(e){this.send(ge.EPG_LOOKUP,{keys:e})}joinCallChannel(e,t={}){return this.transport?.joinChannel?this.transport.joinChannel(`call:${e}`,t):null}get apiBase(){try{const e=new URL(this.wsUrl);return`${e.protocol==="wss:"?"https:":"http:"}//${e.host}`}catch{const e=typeof window<"u"?window.location:{protocol:"http:",hostname:"localhost"};return`${e.protocol}//${e.hostname}:3001`}}storeTorrentGrant({infohash:e,fileIndex:t,grant:i,expiresAtMs:s}={}){if(!e||t===void 0||!i)return;const r=`${String(e).toLowerCase()}:${Number(t)}`;this.torrentGrants.set(r,{grant:i,expiresAtMs:s})}torrentStreamUrl(e){const t=this.apiBase.replace(/\/+$/,""),i=String(e?.infohash||"").toLowerCase(),s=Number(e?.fileIndex),r=`${t}/api/theater/torrent/${i}/${s}`,o=this.torrentGrants.get(`${i}:${s}`);if(!o?.grant)return r;const a=new URLSearchParams({grant:o.grant});return`${r}?${a}`}async postToTheater(e,t,i,s){const r=new URLSearchParams(Object.entries(t||{}).filter(([,l])=>l!=null&&l!=="")).toString();let o;try{o=await fetch(`${this.apiBase}${e}${r?`?${r}`:""}`,{method:"POST",headers:s?{"Content-Type":s}:void 0,body:i})}catch{throw new Error("Could not reach the theater service — is the game server running?")}let a=null;try{a=await o.json()}catch{}if(!o.ok||!a?.ok)throw new Error(a?.error||`The theater refused that (HTTP ${o.status}).`);return a}uploadPlaylistText(e,t,i){return this.postToTheater("/api/theater/playlists",{name:t,by:i},e,"text/plain")}importPlaylistFromUrl(e,t,i){return this.postToTheater("/api/theater/playlists",{name:t,by:i},JSON.stringify({url:e}),"application/json")}uploadEpg(e,t){return this.postToTheater("/api/theater/epg",{name:t},e,"application/octet-stream")}sendGardenAction(e,t,i=null){const s=`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;return this.send(ge.GARDEN_ACTION,{actionId:s,action:e,bedIndex:t,seedCropId:i}),s}sendMarketBuy(e,t){this.send(ge.MARKET_BUY,{cropId:e,quantity:t})}sendMarketSell(e,t,i){this.send(ge.MARKET_SELL,{cropId:e,quality:t,quantity:i})}sendOrderPlace(e,t,i,s,r="B"){const o=`ord_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;return this.send(ge.ORDER_PLACE,{orderId:o,side:e,cropId:t,price:i,quantity:s,quality:r}),o}sendOrderCancel(e){this.send(ge.ORDER_CANCEL,{orderId:e})}sendContractComplete(e){this.send(ge.CONTRACT_COMPLETE,{contractId:e})}sendEmote(e="wave"){this.send(ge.EMOTE,{emote:e})}sendChat(e){this.send(ge.CHAT_SEND,{text:e})}setNickname(e){this.setStoredNickname(e),this.send(ge.SET_NICKNAME,{nickname:this.nickname})}joinRoom(e){this.desiredRoom=e,this.send(ge.JOIN_ROOM,{roomId:e})}}const Rr=5.5,Kc=22,Ex=.35,wx=1.5;function Tx(){return{airborne:!1,y:0,vy:0,hopSpeed:0,chain:0}}function sf(n){return n.airborne=!1,n.y=0,n.vy=0,n.hopSpeed=0,n.chain=0,n}function Ax(n,e,t){const{jumpPressed:i,jumpHeld:s,moving:r,speed:o,cap:a}=e;return n.airborne?(n.vy-=Kc*t,n.y+=n.vy*t,n.y<=0&&(n.y=0,s?(n.chain+=1,n.hopSpeed=Math.min(n.hopSpeed+Ex,a),n.vy=Rr):sf(n))):(r||(n.hopSpeed=0,n.chain=0),i&&(n.airborne=!0,n.vy=Rr,n.chain=1,n.hopSpeed=r?o:0)),n}function Cx(n,e){return n.airborne&&n.hopSpeed>0?n.hopSpeed:e}const Rh=2*Rr/Kc,Rx=Rr*Rr/(2*Kc),Ph=1.5,ht=new Wt(1,1,1),Go=new Rn(1,1,1,8),ul=new Map;function pn(n,e=.7,t=.15){const i=`${n}_${e}_${t}`;return ul.has(i)||ul.set(i,new Ze({color:n,roughness:e,metalness:t})),ul.get(i)}function Ih(n){const e=document.createElement("canvas");e.width=256,e.height=64;const t=e.getContext("2d");t.fillStyle="rgba(23, 33, 32, 0.85)",t.beginPath(),t.roundRect(8,8,240,48,12),t.fill(),t.strokeStyle="#c6b47a",t.lineWidth=2.5,t.stroke(),t.fillStyle="#e8d8b5",t.font='bold 24px "Space Mono", monospace, sans-serif',t.textAlign="center",t.textBaseline="middle",t.fillText(n,128,32);const i=new Qm(e);i.minFilter=Tn;const s=new zd({map:i,transparent:!0,depthTest:!1}),r=new qm(s);return r.scale.set(2.2,.55,1),r.position.set(0,2.3,0),r}function rf(n,e="Gardener"){const t=new nt,i=ix(n),s=pn(i.coat,.7,.1),r=pn(i.apron,.8,.05),o=pn(i.hat,.75,.1),a=pn(i.boots,.65,.3),l=pn("#563a24",.6,.2),c=pn("#b78d50",.45,.6),u=new Ze({color:"#d8f8e3",emissive:"#acf7d5",emissiveIntensity:2.2}),f=new ae(ht,s);f.position.set(0,.9,0),f.scale.set(.64,.75,.48),f.castShadow=!0,t.add(f);const d=new ae(ht,r);d.position.set(0,.86,.25),d.scale.set(.48,.68,.05),t.add(d);for(const P of[-.16,.16]){const N=new ae(ht,l);N.position.set(P,1.15,.22),N.scale.set(.06,.25,.04),t.add(N)}const h=new ae(ht,l);h.position.set(.34,.75,.08),h.scale.set(.16,.28,.24),h.castShadow=!0,t.add(h);const v=new ae(ht,l);v.position.set(.08,.96,.15),v.rotation.z=-.65,v.scale.set(.68,.05,.04),t.add(v);const g=new ae(ht,s);g.position.set(0,1.45,0),g.scale.set(.72,.46,.54),g.castShadow=!0,t.add(g);const m=new ae(ht,pn("#1c2828",.5,.5));m.position.set(0,1.45,.28),m.scale.set(.58,.28,.05),t.add(m);for(const P of[-.17,.17]){const N=new ae(ht,u);N.position.set(P,1.46,.31),N.scale.set(.1,.08,.04),t.add(N)}const p=new ae(Go,o);p.position.set(0,1.7,0),p.scale.set(.65,.06,.65),t.add(p);const S=new ae(ht,o);S.position.set(0,1.84,0),S.scale.set(.5,.24,.44),t.add(S);const E=new ae(ht,l);E.position.set(0,1.75,0),E.scale.set(.52,.05,.46),t.add(E);const _=[];for(const P of[-.38,.38]){const N=new nt;N.position.set(P,1.2,0),t.add(N),_.push(N);const U=new ae(ht,s);U.position.set(0,-.24,0),U.scale.set(.14,.5,.2),N.add(U);const I=new ae(ht,l);I.position.set(0,-.54,0),I.scale.set(.13,.16,.18),N.add(I)}const M=new nt;M.position.set(.42,.65,.2);const x=new ae(Go,c);x.scale.set(.12,.25,.12),M.add(x);const w=new ae(Go,c);w.position.set(0,.12,.16),w.rotation.x=.6,w.scale.set(.03,.22,.03),M.add(w),M.visible=!1,t.add(M);const R=[];for(const P of[-.18,.18]){const N=new nt;N.position.set(P,.5,0);const U=new ae(ht,s);U.position.set(0,-.14,0),U.scale.set(.18,.32,.2),N.add(U);const I=new ae(ht,a);I.position.set(0,-.36,.06),I.scale.set(.2,.18,.34),I.castShadow=!0,N.add(I),t.add(N),R.push(N)}const y=Ih(e);t.add(y);const b=new nt;for(const P of[...t.children])P!==y&&b.add(P);return t.add(b),t.userData={playerId:n,nickname:e,legs:R,arms:_,rig:b,emote:null,canGroup:M,nameSprite:y,setWateringCan(P){M.visible=P},updateNickname(P){t.remove(y);const N=Ih(P);t.add(N),t.userData.nameSprite=N,t.userData.nickname=P}},t}class Px{constructor(e){this.scene=e,this.players=new Map}setPlayer(e){if(!e||!e.id)return;let t=this.players.get(e.id);if(t)t.targetX=e.x,t.targetZ=e.z,t.targetRotY=e.rotY,t.walking=!!e.walking,t.sitting=!!e.sitting,e.airborne&&!t.airborne&&(t.hopT=0),t.airborne=!!e.airborne,e.nickname&&e.nickname!==t.avatar.userData.nickname&&t.avatar.userData.updateNickname(e.nickname);else{const i=rf(e.id,e.nickname||"Gardener");i.position.set(e.x??0,0,e.z??0),i.rotation.y=e.rotY??0,this.scene.add(i),t={avatar:i,targetX:e.x??0,targetZ:e.z??0,targetRotY:e.rotY??0,walking:!!e.walking,sitting:!!e.sitting,airborne:!!e.airborne,hopT:0},this.players.set(e.id,t)}}removePlayer(e){const t=this.players.get(e);t&&(this.scene.remove(t.avatar),this.players.delete(e))}clear(){for(const e of this.players.values())this.scene.remove(e.avatar);this.players.clear()}update(e,t){const i=Math.min(1,e*12);for(const s of this.players.values()){const{avatar:r,targetX:o,targetZ:a,targetRotY:l,walking:c,sitting:u,airborne:f}=s;r.position.x+=(o-r.position.x)*i,r.position.z+=(a-r.position.z)*i;let d=l-r.rotation.y;for(;d<-Math.PI;)d+=Math.PI*2;for(;d>Math.PI;)d-=Math.PI*2;if(r.rotation.y+=d*i,(c||f)&&zr(r),f&&(s.hopT=Math.min(s.hopT+e,Ph)),u)r.position.y=0,r.userData.legs.forEach(h=>{h.rotation.x=-1.35});else if(f&&s.hopT<Ph){const h=s.hopT%Rh/Rh;r.position.y=4*Rx*h*(1-h),r.userData.legs.forEach(v=>{v.rotation.x=-.8})}else c?(r.position.y=Math.sin(t*12)*.025,r.userData.legs.forEach((h,v)=>{h.rotation.x=Math.sin(t*12+v*Math.PI)*.45})):(r.position.y=0,r.userData.legs.forEach(h=>{h.rotation.x*=.8}));af(r,e)}}}function Ix(){const n=new nt,e=pn("#e6e0cc",.65,.2),t=pn("#233c3e",.6,.3),i=pn("#9c5838",.7,.2),s=pn("#b78d50",.5,.4),r=pn("#455759",.6,.3),o=new Ze({color:"#d8f8e3",emissive:"#acf7d5",emissiveIntensity:2}),a=new ae(ht,e);a.position.set(0,.85,0),a.scale.set(.62,.7,.48),n.add(a);const l=new ae(ht,t);l.position.set(0,.92,.265),l.scale.set(.38,.35,.07),n.add(l);for(let m=0;m<3;m++){const p=new ae(ht,i);p.position.set(0,.8+m*.095,.31),p.scale.set(.27,.035,.025),n.add(p)}const c=new ae(ht,e);c.position.set(0,1.4,0),c.scale.set(.78,.46,.58),n.add(c);const u=new ae(ht,t);u.position.set(0,1.4,.303),u.scale.set(.66,.3,.055),n.add(u);for(const m of[-.2,.2]){const p=new ae(ht,o);p.position.set(m,1.43,.34),p.scale.set(.12,.1,.045),n.add(p)}const f=new ae(ht,r);f.position.set(0,1.66,0),f.scale.set(.87,.08,.65),n.add(f);const d=new ae(Go,i);d.position.set(.23,1.85,0),d.scale.set(.025,.3,.025),n.add(d);const h=new ae(ht,s);h.position.set(.23,2.01,0),h.scale.set(.075,.075,.075),n.add(h);const v=new ae(ht,r);v.position.set(0,.93,-.34),v.scale.set(.48,.53,.25),n.add(v);const g=[];for(const m of[-.22,.22]){const p=new nt;p.position.set(m,.52,0);const S=new ae(ht,r);S.position.set(0,-.15,0),S.scale.set(.17,.33,.19),p.add(S);const E=new ae(ht,e);E.position.set(0,-.34,.09),E.scale.set(.24,.16,.38),p.add(E),n.add(p),g.push(p);const _=new ae(ht,e);_.position.set(m*1.9,.86,0),_.scale.set(.18,.53,.22),n.add(_)}return n.scale.setScalar(.68),n.userData.legs=g,n.castShadow=!0,n}function of(n,e){!n||!_d(e)||(zr(n),n.userData.emote={id:e,elapsed:0})}function zr(n){const e=n?.userData;e?.rig&&(e.emote=null,e.rig.rotation.set(0,0,0),e.rig.position.set(0,0,0),e.arms.forEach(t=>t.rotation.set(0,0,0)))}function af(n,e){const t=n.userData,i=t.emote;if(!i)return;i.elapsed+=e;const s=i.elapsed;if(s>=Ra){zr(n);return}const r=Math.min(1,s/.25,(Ra-s)/.4),[o,a]=t.arms;switch(t.rig.rotation.set(0,0,0),t.rig.position.set(0,0,0),o.rotation.set(0,0,0),a.rotation.set(0,0,0),i.id){case"wave":a.rotation.z=(2.5+Math.sin(s*13)*.35)*r;break;case"dance":t.rig.rotation.z=Math.sin(s*7)*.16*r,t.rig.rotation.y=Math.sin(s*4)*.4*r,o.rotation.x=Math.sin(s*7)*.9*r,a.rotation.x=-o.rotation.x,o.rotation.z=-.65*r,a.rotation.z=.65*r;break;case"cheer":o.rotation.z=-2.6*r,a.rotation.z=2.6*r,t.rig.position.y=Math.abs(Math.sin(s*7))*.12*r;break;case"heart":o.rotation.x=a.rotation.x=-1.2*r,o.rotation.z=.65*r,a.rotation.z=-.65*r,t.rig.rotation.z=Math.sin(s*3)*.1*r;break;case"bow":t.rig.rotation.x=Math.sin(Math.min(1,s/Ra)*Math.PI)*.55,a.rotation.x=-1*r,a.rotation.z=-.6*r;break;case"shrug":o.rotation.z=-1.15*r,a.rotation.z=1.15*r,o.rotation.x=a.rotation.x=-.5*r,t.rig.rotation.z=Math.sin(s*3)*.13*r;break}}const hl=new Wt(1,1,1),Lx=new Rn(1,1,1,8),dl=new Map;function je(n,e=.7,t=.15){const i=`${n}_${e}_${t}`;return dl.has(i)||dl.set(i,new Ze({color:n,roughness:e,metalness:t})),dl.get(i)}function Dx(){const n=new nt;n.name="market";const e=[],t=[],i=[];function s(K,G,q,ne,Ie,_e,Le,tt=n){const O=new ae(hl,typeof Le=="string"?je(Le):Le);return O.position.set(K,G,q),O.scale.set(ne,Ie,_e),O.castShadow=!0,O.receiveShadow=!0,tt.add(O),O}function r(K,G,q,ne){e.push({x:K,z:G,w:q/2+.38,d:ne/2+.38})}function o(K,G,q,ne,Ie,_e,Le,tt=1.5){const O=s(K,G,q,ne,Ie,_e,Le);return O.material=new Ze({color:Le,emissive:Le,emissiveIntensity:tt}),O}function a(K,G,q,ne="#ffc775"){s(K,G,q,.3,.48,.3,new Ze({color:"#fff2c6",emissive:ne,emissiveIntensity:2.5})),s(K,G+.28,q,.46,.1,.44,je("#192d2d")),s(K,G-.28,q,.36,.1,.35,je("#192d2d"));const Ie=new ya(ne,6,7,2);return Ie.position.set(K,G-.1,q+.2),n.add(Ie),Ie}s(0,-.6,0,28,1,25,je("#242f2b")),s(0,-.12,0,24,.4,21,je("#3d4944",.27,.32));const l=["#485450","#535e55","#647065","#70776a","#3a4845","#7b7e6d"];let c=42;function u(){return c=c*1664525+1013904223>>>0,c/4294967296}for(let K=-12;K<12;K++)for(let G=-10;G<11;G++){const q=new Se(l[Math.floor(u()*l.length)]).multiplyScalar(.75+u()*.25);s(K+.49+G%2*.05,.06+u()*.03,G+.47,.96,.16,.96,je("#"+q.getHexString(),.3+u()*.3,.2))}for(let K=0;K<40;K++){const G=new ae(new qc(.4+u()*.9,9),je("#516564",.07,.62));G.rotation.x=-Math.PI/2,G.position.set((u()-.5)*22,.183,(u()-.5)*19),G.scale.y=.4+u()*.4,n.add(G)}for(let K=-12;K<=12;K+=.8)for(let G=.4;G<3;G+=.4)s(K,G,-10.5,.76,.37,.65,G>2.6?"#a0a18a":"#4d6561");for(let K=-10;K<11;K+=.8)for(const G of[-12,12])Math.abs(K)<2||(s(G,.65,K,.5,1.3,.76,je("#192d2d")),s(G,1.35,K,.7,.15,.78,je("#485450")));const f=0,d=-7.5;s(f,1.5,d,5.5,3,1.4,je("#3f3224")),r(f,d,5.5,1.4);for(const K of[-2.5,2.5]){const G=new ae(Lx,je("#2d241c"));G.position.set(f+K,2.2,d+.9),G.scale.set(.08,3.4,.08),n.add(G)}const h=s(f,3.6,d+.4,6,.25,2.4,je("#7b4c34",.8));h.rotation.x=.18,s(f,1.8,d+.72,4.4,1.8,.08,je("#1a2422",.9,.1)),a(f-1.8,2.8,d+.8),a(f+1.8,2.8,d+.8),t.push({type:"market_board",x:f,z:d+1.5,title:"Market Exchange Board",sub:"Press E to view spot prices, create orders, and trade"});const v=-6.5,g=-4.5;s(v,.9,g,3.6,1.8,2,je("#4a3b2b")),r(v,g,3.6,2),s(v,1.85,g,3.8,.1,2.2,je("#63523f"));for(let K=-1;K<=1;K++)s(v+K*.9,2.1,g,.6,.5,.6,je(["#b8aa83","#a29571","#c4b693"][K+1]));a(v,2.8,g+.8,"#ffdf96"),t.push({type:"seed_vendor",x:v,z:g+1.6,title:"Town Seed Merchant",sub:"Press E to browse seeds, tubers, and planting starts"});const m=6.5,p=-4.5;s(m,1.4,p,3.4,2.8,1,je("#2d3c39")),r(m,p,3.4,1),s(m,1.6,p+.52,2.8,1.6,.06,je("#d0c5a0",.85,.05)),a(m,2.9,p+.6,"#ffd580"),t.push({type:"contracts_board",x:m,z:p+1.5,title:"Restaurant & Café Noticeboard",sub:"Press E to fulfill delivery contracts for coins and reputation"});for(const[K,G,q]of[[-8,4,1.1],[-9.2,4.2,.9],[8.5,5,1],[9.5,5.4,.9],[-3,-3,.8],[3,-3,.8],[-8.5,-8,1.2],[8.5,-8,1.2]])s(K,q*.5,G,q,q,q,je("#634932")),r(K,G,q,q);const S=10.7,E=0;for(const K of[-1.5,1.5])s(S,1.8,K,.6,3.6,.6,je("#273d3d")),o(S,3.6,K,.8,.3,.8,"#74d0bd",2);s(S,3.8,0,.8,.35,3.6,je("#273d3d")),t.push({type:"garden_gate",x:S,z:E,title:"Travel to Your Market Garden",sub:"Press E to walk the path to your personal plot"});const _=-10.7,M=0;for(const K of[-1.5,1.5])s(_,1.8,K,.6,3.6,.6,je("#273d3d")),o(_,3.6,K,.8,.3,.8,"#e0c889",2);s(_,3.8,0,.8,.35,3.6,je("#273d3d")),t.push({type:"district_gate",targetDistrict:"canal",x:_,z:M,title:"The Outer Districts Gateway",sub:"Press E to venture into the ancient city biomes"});const x=new nt;x.name="dynamic",n.add(x);const w={restored:!1},R=3,y=7.6;s(R,1.6,y,2.6,3.2,2.6,je("#5a5f58",.75,.12),x),s(R,3.3,y,2.9,.28,2.9,je("#6d7268"),x),s(R,.35,y,3,.7,3,je("#454a44"),x),r(R,y,2.6,2.6),s(R,.75,y-1.32,.9,1.5,.12,je("#2c2620"),x);const b=o(R,1,y-1.36,.7,1,.05,"#e0a865",.4);x.add(b);const P=new nt;x.add(P);const N=s(R,3.8,y,2.2,.5,2.2,je("#4a3b2b"),P);N.rotation.z=.28;const U=s(R-1.9,.5,y-1.7,2.4,.16,.22,je("#6b5845"),P);U.rotation.z=.1;const I=s(R+1.75,.55,y-1.5,1,1,.35,je("#7d827a"),P);I.rotation.z=.35;const F=new nt;x.add(F),s(R,3.85,y,2.5,.55,2.5,je("#63513a"),F),s(R,4.25,y,1.4,.35,1.4,je("#54452f"),F);const B=new nt;B.position.set(R,3.6,y-1.42),F.add(B),s(R,3.6,y-1.35,.5,.5,.4,je("#8a744f"),B);for(let K=0;K<4;K++){const G=s(0,0,0,2.3,.5,.08,je("#a08a5f",.7),B);G.position.set(Math.cos(K*Math.PI/2)*1.35,Math.sin(K*Math.PI/2)*1.35,-.18),G.rotation.z=K*Math.PI/2}const L=o(R+1,1.9,y-1.36,.2,.3,.08,"#ffcb79",1.4);F.add(L);const A=o(R,1.05,y-1.38,.8,.5,.05,"#f0b060",.8);F.add(A),t.push({type:"mill",x:R,z:5.6,title:"The Great Mill (broken)",sub:"Press E to help restore it with materials"});const H=5.8,V=7.4;s(H,.55,V,1.5,.9,1.1,je("#4a3b2b"),x),s(H,1.05,V,1.6,.12,1.2,je("#5f4d36"),x),r(H,V,1.5,1.1),s(H-.35,1.25,V,.5,.3,.5,je("#7d827a"),x),s(H+.4,1.22,V-.15,.3,.24,.3,je("#c07840"),x),t.push({type:"machine_bench",x:H,z:6.2,title:"Machine Shop Workbench",sub:"Press E to contribute materials & craft garden tools"});function Z(K){const G=K?.mill?.status==="restored";w.restored=G,P.visible=!G,F.visible=G;const q=t.find(ne=>ne.type==="mill");q&&(q.title=G?"The Great Mill":"The Great Mill (broken)",q.sub=G?"Press E to mill wheat into flour":"Press E to help restore it with materials")}Z(null);const le=n.children.filter(K=>K.isMesh&&K.geometry===hl&&!K.material.transparent&&K.material.emissive?.getHex()===0),ve=new Li(hl,new Ze({color:16777215,roughness:.62,metalness:.2}),le.length);le.forEach((K,G)=>{K.updateMatrix(),ve.setMatrixAt(G,K.matrix),ve.setColorAt(G,K.material.color),n.remove(K)}),ve.castShadow=!0,ve.receiveShadow=!0,n.add(ve);function Oe(K){i.forEach(G=>G(K)),w.restored&&(B.rotation.z=K*.55)}return{group:n,obstacles:e,items:t,update:Oe,setMachineState:Z}}const yn={radish:{id:"radish",name:"Red Radish",tagline:"Crisp peppery roots, fast to harvest.",seedCost:4,basePrice:8,growDuration:25,waterDemand:1,yield:2,repeatHarvest:!1,color:"#4d8050",produceColor:"#c93b4a",xp:12,unlockLevel:1},lettuce:{id:"lettuce",name:"Rain Crisp Lettuce",tagline:"Tender layered greens favored by market cafes.",seedCost:6,basePrice:12,growDuration:40,waterDemand:1.2,yield:2,repeatHarvest:!1,color:"#65a759",produceColor:"#83cf72",xp:18,unlockLevel:1},carrot:{id:"carrot",name:"Amber Carrot",tagline:"Deep sweet orange taproots grown in dark tilled soil.",seedCost:8,basePrice:17,growDuration:60,waterDemand:.9,yield:2,repeatHarvest:!1,color:"#498845",produceColor:"#e07a2a",xp:25,unlockLevel:1},kale:{id:"kale",name:"Winter Kale",tagline:"Hearty ruffled brassica that thrives in cold rain.",seedCost:12,basePrice:24,growDuration:80,waterDemand:.8,yield:3,repeatHarvest:!1,color:"#2d6148",produceColor:"#3d785a",xp:32,unlockLevel:2},basil:{id:"basil",name:"Copper Basil",tagline:"Aromatic dark purple-green leaves prized by the apothecary.",seedCost:15,basePrice:32,growDuration:100,waterDemand:1.3,yield:3,repeatHarvest:!1,color:"#425a40",produceColor:"#7b3e64",xp:40,unlockLevel:2},tomato:{id:"tomato",name:"Lantern Tomato",tagline:"Heavy climbing vine with glowing scarlet fruit. Continues bearing.",seedCost:22,basePrice:28,growDuration:120,waterDemand:1.1,yield:3,repeatHarvest:!0,regrowDuration:45,color:"#3f7842",produceColor:"#d6422f",xp:50,unlockLevel:3},strawberry:{id:"strawberry",name:"Dew Strawberry",tagline:"Low creeping runners with bright sweet red berries.",seedCost:28,basePrice:38,growDuration:140,waterDemand:1.4,yield:4,repeatHarvest:!0,regrowDuration:50,color:"#39784b",produceColor:"#e6324b",xp:65,unlockLevel:3},wheat:{id:"wheat",name:"Hearth Wheat",tagline:"Golden milling grain. The Great Mill grinds it into flour.",seedCost:4,basePrice:9,growDuration:30,waterDemand:1,yield:2,repeatHarvest:!1,color:"#8a8a3d",produceColor:"#d9b45a",xp:14,unlockLevel:1}},yc=Object.values(yn),ri={EMPTY:0,PREPARED:1,SEED:2,SPROUT:3,JUVENILE:4,MATURE:5,HARVESTABLE:6},Nx={C:.8,B:1,A:1.35,"A+":1.8},hr=new Wt(1,1,1),Lh=new va(1,6,6),wo=new Rn(1,1,1,6),fl=new Map;function dr(n,e=.65,t=.1,i=0,s=0){const r=`${n}_${e}_${t}_${i}_${s}`;return fl.has(r)||fl.set(r,new Ze({color:n,roughness:e,metalness:t,emissive:i,emissiveIntensity:s})),fl.get(r)}function Ux(n,e,t){for(;n.children.length>0;)n.remove(n.children[0]);if(!e||t<=ri.PREPARED)return;const i=yn[e]??yn.radish,s=dr(i.color,.6,.1),r=dr(i.produceColor,.4,.15,i.produceColor,.25);if(t===ri.SEED){for(const[o,a]of[[-.2,-.15],[.2,.15],[0,0]]){const l=new ae(hr,dr("#829b65",.8));l.position.set(o,.08,a),l.scale.set(.06,.08,.06),l.castShadow=!0,n.add(l)}return}if(t===ri.SPROUT){const o=new ae(wo,dr("#55864e",.7));o.position.set(0,.15,0),o.scale.set(.025,.25,.025),n.add(o);for(let a=0;a<2;a++){const l=new ae(hr,s);l.position.set(a===0?-.07:.07,.24,0),l.scale.set(.12,.03,.08),l.rotation.z=(a===0?-1:1)*.4,n.add(l)}return}if(t===ri.JUVENILE){for(let o=0;o<3;o++){const a=o*Math.PI*2/3,l=new ae(wo,s);l.position.set(Math.cos(a)*.08,.25,Math.sin(a)*.08),l.scale.set(.035,.45,.035),l.rotation.z=Math.cos(a)*.25,l.rotation.x=Math.sin(a)*.25,n.add(l);const c=new ae(hr,s);c.position.set(Math.cos(a)*.16,.45,Math.sin(a)*.16),c.scale.set(.22,.06,.16),c.rotation.y=a,n.add(c)}return}if(t===ri.MATURE||t===ri.HARVESTABLE){const o=t===ri.HARVESTABLE,a=o?1:.85;if(e==="tomato"){const l=new ae(wo,dr("#5b4834",.8));l.position.set(0,.5,0),l.scale.set(.04,1,.04),n.add(l)}for(let l=0;l<5;l++){const c=l*Math.PI*2/5,u=new ae(hr,s);u.position.set(Math.cos(c)*.2*a,.35+l%2*.15,Math.sin(c)*.2*a),u.scale.set(.3*a,.1,.22*a),u.rotation.set(Math.sin(c)*.3,c,Math.cos(c)*.3),u.castShadow=!0,n.add(u)}if(o)if(e==="radish"||e==="carrot")for(let l=0;l<3;l++){const c=(l-1)*.18,u=new ae(e==="carrot"?wo:Lh,r);u.position.set(c,e==="carrot"?.2:.16,0),u.scale.set(.12,.22,.12),u.castShadow=!0,n.add(u)}else if(e==="tomato"||e==="strawberry")for(let l=0;l<4;l++){const c=l*Math.PI*2/4+.3,u=new ae(Lh,r);u.position.set(Math.cos(c)*.25,.38+l%2*.15,Math.sin(c)*.25),u.scale.set(.13,.14,.13),u.castShadow=!0,n.add(u)}else for(let l=0;l<4;l++){const c=l*Math.PI*2/4,u=new ae(hr,r);u.position.set(Math.cos(c)*.15,.55,Math.sin(c)*.15),u.scale.set(.24,.08,.18),u.rotation.set(.2,c+.4,.2),u.castShadow=!0,n.add(u)}}}function Ox(n,e=4){const t=[];if(!Number.isInteger(n)||n<0)return t;const i=n%e;return n-e>=0&&t.push(n-e),i>0&&t.push(n-1),t.push(n),i<e-1&&t.push(n+1),t.push(n+e),t}const Zc={copper:{id:"copper",name:"Copper Scrap",tagline:"Pipe stubs and verdigris sheeting pried from the foundry floor.",color:"#c07840",glowColor:"#e8934a",district:"foundry"},timber:{id:"timber",name:"Trestle Timber",tagline:"Sound oak beams cut free of the overgrown viaduct.",color:"#7a5a38",glowColor:"#c9a05e",district:"trestle"},glass:{id:"glass",name:"Glass Shards",tagline:"Thick panes of uncracked glass swept from the frost-line benches.",color:"#9fc4d8",glowColor:"#cfeaf7",district:"frost-spire"}},Dh=Object.values(Zc),Zi={flour:{id:"flour",name:"Stone-Ground Flour",tagline:"Fine milled flour from the Great Mill. Bakers pay a premium.",basePrice:14}},Fx=Object.values(Zi),lf={copper:4,timber:4,glass:4},Rs={id:"sprinkler",name:"Garden Sprinkler",cost:{copper:2,glass:2}},kx=[{id:"foundry_copper_1",district:"foundry",material:"copper",position:[4,2.5],respawnMs:18e4},{id:"foundry_copper_2",district:"foundry",material:"copper",position:[8.5,1],respawnMs:18e4},{id:"foundry_copper_3",district:"foundry",material:"copper",position:[-3.5,2.5],respawnMs:18e4},{id:"trestle_timber_1",district:"trestle",material:"timber",position:[6.5,2],respawnMs:18e4},{id:"trestle_timber_2",district:"trestle",material:"timber",position:[2.5,-2],respawnMs:18e4},{id:"trestle_timber_3",district:"trestle",material:"timber",position:[-3.5,-2],respawnMs:18e4},{id:"glasshouse_glass_1",district:"frost-spire",material:"glass",position:[8.5,2.5],respawnMs:18e4},{id:"glasshouse_glass_2",district:"frost-spire",material:"glass",position:[-3,.5],respawnMs:18e4},{id:"glasshouse_glass_3",district:"frost-spire",material:"glass",position:[2.5,3.5],respawnMs:18e4}],qi=new Wt(1,1,1),Bx=new Rn(1,1,1,8),pl=new Map;function Rt(n,e=.7,t=.15){const i=`${n}_${e}_${t}`;return pl.has(i)||pl.set(i,new Ze({color:n,roughness:e,metalness:t})),pl.get(i)}function Hx(){const n=new nt;n.name="garden";const e=[],t=[],i=[];function s(I,F,B,L,A,H,V,Z=n){const le=new ae(qi,typeof V=="string"?Rt(V):V);return le.position.set(I,F,B),le.scale.set(L,A,H),le.castShadow=!0,le.receiveShadow=!0,Z.add(le),le}function r(I,F,B,L){e.push({x:I,z:F,w:B/2+.38,d:L/2+.38})}function o(I,F,B,L,A,H,V,Z=1.5){const le=s(I,F,B,L,A,H,V);return le.material=new Ze({color:V,emissive:V,emissiveIntensity:Z}),le}function a(I,F,B,L="#ffdf96"){s(I,F,B,.25,.4,.25,new Ze({color:"#fff2c6",emissive:L,emissiveIntensity:2.5})),s(I,F+.22,B,.38,.08,.38,Rt("#232a28"));const A=new ya(L,5,6,2);return A.position.set(I,F,B),n.add(A),A}s(0,-.6,0,28,1,26,Rt("#272b22")),s(0,-.12,0,25,.4,23,Rt("#383e2f",.85,.1));const l=Rt("#565b4c",.8,.1);s(0,.07,0,24,.12,2.5,l),s(0,.07,0,2.5,.12,20,l);for(let I=-12;I<=12;I+=.8)s(I,.6,-10.5,.76,1.2,.65,Rt("#414b38")),s(I,.6,10.5,.76,1.2,.65,Rt("#414b38"));for(let I=-10;I<=10;I+=.8)for(const F of[-12,12])Math.abs(I)<2||s(F,.6,I,.65,1.2,.76,Rt("#414b38"));const c=-10.7,u=0;for(const I of[-1.4,1.4])s(c,1.8,I,.5,3.4,.5,Rt("#2d3835")),o(c,3.4,I,.7,.25,.7,"#74d0bd",2);s(c,3.6,0,.7,.3,3.3,Rt("#2d3835")),t.push({type:"market_gate",x:c,z:u,title:"Return to Market Court",sub:"Press E to walk back to the town market square"});const f=[[-6,-7],[-2,-7],[2,-7],[6,-7],[-6,-4],[-2,-4],[2,-4],[6,-4],[-6,4],[-2,4],[2,4],[6,4]];for(let I=0;I<f.length;I++){const[F,B]=f[I],L=2.4,A=1.6;s(F,.25,B,L+.2,.35,A+.2,Rt("#4d3e2c",.8,.1));const H=new Se("#382c1e"),V=new ae(qi,new Ze({color:H.clone(),roughness:.85,metalness:.05}));V.position.set(F,.35,B),V.scale.set(L,.15,A),V.castShadow=!0,V.receiveShadow=!0,n.add(V),r(F,B,L*.7,A*.7);const Z=new nt;Z.position.set(F,.42,B),n.add(Z),i.push({bedIndex:I,soilMesh:V,plantGroup:Z,x:F,z:B,renderedCrop:null,renderedStage:-1}),t.push({type:"bed",bedIndex:I,x:F,z:B,title:`Garden Bed #${I+1}`,sub:"Empty. Select Hoe to prepare or Seed to plant."})}const d=-8.8,h=-8;s(d,1.8,h,3.2,3.2,2.6,Rt("#3f3323")),r(d,h,3.2,2.6);const v=s(d,3.5,h,3.6,.15,3,Rt("#52605f",.4,.5));v.rotation.z=-.15,a(d+1.2,2.6,h+1.4);const g=-8.5,m=-2.5;s(g,.45,m,1.4,.8,2,Rt("#443727")),r(g,m,1.4,2);const p=new ae(new xn(1.1,1.7),new Ze({color:"#346d78",roughness:.1,metalness:.7,transparent:!0,opacity:.85}));p.rotation.x=-Math.PI/2,p.position.set(g,.82,m),n.add(p),t.push({type:"water_source",x:g+.8,z:m,title:"Rainwater Cistern",sub:"Clean water caught from the greenhouse gutters"});const S=9,E=-7.5;s(S,.6,E,2.4,1,2.2,Rt("#403425")),r(S,E,2.4,2.2),s(S,.9,E,2,.5,1.8,Rt("#261e14",.9));const _=9,M=5;s(_,.6,M,2.5,.9,3.2,Rt("#54432f")),r(_,M,2.5,3.2);const x=new ae(Bx,Rt("#707b78",.3,.6));x.position.set(_,1.2,M-.6),x.scale.set(.45,.45,.45),n.add(x),a(_-.8,2.4,M);const w=[],R=new Zs(.62,.72,24);for(let I=0;I<5;I++){const F=new ae(R,new Fi({color:"#7fd0e8",side:Yt,transparent:!0,opacity:.55}));F.rotation.x=-Math.PI/2,F.position.y=.3,F.visible=!1,n.add(F),w.push(F)}function y(I){const F=Number.isInteger(I)&&I>=0?Ox(I).filter(B=>i[B]):[];w.forEach((B,L)=>{const A=F[L];if(A===void 0){B.visible=!1;return}const H=i[A];B.position.set(H.x,.3,H.z),B.visible=!0})}function b(I){const F=new Map((I||[]).map(B=>[B.bedIndex,B]));for(const B of i){const L=F.get(B.bedIndex);if(L&&!B.fixtureGroup){const A=new nt;A.position.set(B.x,.42,B.z);const H=new ae(qi,Rt("#8a6844",.6,.3));H.scale.set(.1,.55,.1),H.position.y=.27,H.castShadow=!0,A.add(H);const V=Rt("#b0784a",.5,.5);for(const[le,ve]of[[.24,0],[-.24,0],[0,.24],[0,-.24]]){const Oe=new ae(qi,V);Oe.scale.set(.34,.07,.07),Oe.position.set(le*.9,.52,ve*.9),Oe.rotation.y=ve!==0?Math.PI/2:0,A.add(Oe)}const Z=new ae(qi,new Ze({color:"#aedff2",emissive:"#7fd0e8",emissiveIntensity:.9,transparent:!0,opacity:.85,roughness:.2,metalness:.1}));Z.scale.setScalar(.16),Z.position.y=.62,A.add(Z),B.fixtureGroup=A,B.fixtureGlobe=Z,n.add(A)}else!L&&B.fixtureGroup&&(n.remove(B.fixtureGroup),B.fixtureGroup=null,B.fixtureGlobe=null)}}const P=n.children.filter(I=>I.isMesh&&I.geometry===qi&&!I.material.transparent&&!I.material.emissive?.getHex()),N=new Li(qi,new Ze({color:16777215,roughness:.65,metalness:.15}),P.length);P.forEach((I,F)=>{I.updateMatrix(),N.setMatrixAt(F,I.matrix),N.setColorAt(F,I.material.color),n.remove(I)}),N.castShadow=!0,N.receiveShadow=!0,n.add(N);function U(I,F=null){if(F)for(const B of i){const L=F[B.bedIndex];if(!L)continue;B.fixtureGlobe&&(B.fixtureGlobe.rotation.y=I*1.2+B.bedIndex,B.fixtureGlobe.position.y=.62+Math.sin(I*3+B.bedIndex)*.03);const A=B.soilMesh.material;if(!L.prepared)A.color.set("#483d2f");else{const H=L.moisture||0,V=new Se("#352a1c"),Z=new Se("#161009");A.color.copy(V).lerp(Z,H)}(B.renderedCrop!==L.cropId||B.renderedStage!==L.stage)&&(B.renderedCrop=L.cropId,B.renderedStage=L.stage,Ux(B.plantGroup,L.cropId,L.stage))}}return{group:n,obstacles:e,items:t,bedVisuals:i,update:U,setFixtures:b,previewCoverage:y}}function Jc(n){const e=new nt;e.name="social-scenery",n.group.add(e);const t={box:new Wt(1,1,1),cylinder:new Rn(.5,.5,1,10),sphere:new ga(.5,1)},i=new Map,s=n.owned;s.geometries.push(...Object.values(t));const r=new Tt,o=new Se,a=new Map;function l(S,E,_,M,x="stone",w=[0,0,0]){const R=`${S}:${x}`;i.has(R)||i.set(R,{shape:S,family:x,instances:[]}),r.position.fromArray(E),r.scale.fromArray(_),r.rotation.set(...w),r.updateMatrix(),i.get(R).instances.push({matrix:r.matrix.clone(),tint:M})}const c=(S,E,_,M,x,w,R,y="stone",b=0)=>l("box",[S,E,_],[M,x,w],R,y,[0,b,0]),u=(S,E,_,M,x,w,R="metal")=>l("cylinder",[S,E,_],[M,x,M],w,R),f=(S,E,_,M,x,w,R,y="foliage")=>l("sphere",[S,E,_],[M,x,w],R,y);function d(S,E,_,M,x="metal"){const w=new k(...S),R=new k(...E);r.position.copy(w).add(R).multiplyScalar(.5),r.scale.set(_,w.distanceTo(R),_),r.quaternion.setFromUnitVectors(new k(0,1,0),R.sub(w).normalize()),r.updateMatrix();const y=`box:${x}`;i.has(y)||i.set(y,{shape:"box",family:x,instances:[]}),i.get(y).instances.push({matrix:r.matrix.clone(),tint:M})}function h(S,E,_,M,x,w="#8a684b"){const R=Math.sin(M),y=Math.cos(M);c(E,.39,_,.72,.14,.58,w,"wood",M),c(E-R*.25,.7,_-y*.25,.72,.48,.1,w,"wood",M);for(const P of[-1,1]){const N=E+P*.27*y,U=_-P*.27*R;c(N,.18,U,.09,.36,.45,"#263637","metal",M)}n.block(E,_,.76,.76);const b=Math.abs(R*y)>.1?1.2:1.05;n.items.push({type:"seat",id:S,x:E,z:_,title:"Take a seat",sub:"Stay a while · E to sit",groupId:x,acousticZoneId:x,sit:{x:E,y:0,z:_,rotY:M},dismount:[{x:E+R*b,z:_+y*b}],animationProfile:"folded"})}function v(S,E,_,M="#ffc47a",x=9,w=9){const R=new ya(M,x,w,2);return R.position.set(S,E,_),e.add(R),s.lights.push(R),R}function g(S,E,_=2.7,M=!0){u(S,_/2,E,.09,_,"#324446"),c(S,_,E,.24,.35,.24,"#ffc47a","emissive"),c(S,_+.23,E,.43,.1,.43,"#344449","metal"),M&&v(S,_,E),n.block(S,E,.18,.18)}function m(S,E,_,M,x,w){n.environment.zones.push({id:S,rect:E,roofY:_,exposure:M,priority:x,feather:.5,audio:w,acoustic:{groupId:S,quiet:M<.2}})}function p(){for(const{shape:S,family:E,instances:_}of i.values()){if(!a.has(E)){const x=new Ze({color:"#ffffff",roughness:.72,metalness:E==="metal"?.6:.08});(E==="emissive"||E==="windows")&&(x.emissive.set("#ffbb73"),x.emissiveIntensity=E==="windows"?.75:1.8),E==="puddle"&&(x.transparent=!0,x.opacity=.48,x.depthWrite=!1,x.roughness=.15,x.metalness=.5),a.set(E,x),s.materials.push(x),n.environment.materialFamilies.push({key:E,material:x,wettable:E==="wet-stone",sheltered:E!=="wet-stone",dry:Object.freeze({color:x.color.getHex(),roughness:x.roughness,metalness:x.metalness})})}const M=new Li(t[S],a.get(E),_.length);M.name=`social-${S}-${E}`,_.forEach((x,w)=>{M.setMatrixAt(w,x.matrix),M.setColorAt(w,o.set(x.tint))}),M.castShadow=!["emissive","windows","puddle"].includes(E),M.receiveShadow=!0,M.computeBoundingSphere(),e.add(M)}return{root:e,materials:a}}return{box:c,cylinder:u,sphere:f,beam:d,seat:h,light:v,lantern:g,zone:m,finish:p}}function cf(n,e,t){for(const i of[-11.6,11.6])for(const s of[-6,6])n.box(i,.36,s,.35,.72,8,t);n.box(0,.45,-9.9,23.5,.9,.4,t);for(const i of[-6.4,6.4])n.box(i,.2,10.6,10.2,.4,.4,t);for(const i of e.exits){const[s,r]=i.position;n.box(s,.015,r,1.2,.035,1.2,"#b9a777","metal");for(const o of[-1,1])n.box(s+(i.kind==="market"?o*.85:0),.32,r+(i.kind==="market"?0:o*.85),.16,.64,.16,"#e2bb78","emissive")}}function zx(n){const e=Jc(n);e.box(0,-.32,.4,24,.6,21,"#293d46");for(let i=-11;i<=11;i++)for(let s=-9;s<=10;s++){const r=i>=-8&&i<=8&&s<=-4,o=r?["#657171","#727c77","#586b6b"]:["#405a62","#52666c","#48616a"];e.box(i,-.025,s,.96,.08,.96,o[Math.floor(n.random()*3)],r?"dry-stone":"wet-stone")}cf(e,n.def,"#364d53"),e.box(0,2,-8.8,17.4,4,.55,"#344b50"),n.block(0,-8.8,17.4,.55);for(let i=0;i<10;i++)for(let s=0;s<22;s++)e.box(-8.4+s*.78+i%2*.28,.2+i*.38,-8.47,.73,.33,.1,["#4e6264","#596966","#425959"][Math.floor(n.random()*3)]);for(const i of[-6.8,-3.5,1,4.5,7])e.box(i,2.15,-8.33,1.45,1.8,.14,"#20373e","metal"),e.box(i,2.15,-8.22,1.2,1.55,.05,"#efc58a","windows"),e.box(i,2.15,-8.16,.07,1.6,.06,"#32464a","metal"),e.box(i,2.15,-8.15,1.25,.08,.06,"#32464a","metal"),e.box(i,1.21,-8.15,1.65,.13,.4,"#81908b");e.box(0,3.52,-7.95,16.4,.18,1.5,"#526c66","metal"),e.box(0,3.42,-4.25,16.4,.16,.7,"#61736c","metal");for(const i of[-7,0,7])e.box(i,1.65,-4.2,.3,3.3,.3,"#3c5354","metal"),n.block(i,-4.2,.3,.3),e.box(i,3.25,-6,.12,.16,3.5,"#8b795b","wood");e.box(-8.15,1.5,-6.8,.25,3,2.3,"#3e5557"),n.block(-8.15,-6.8,.25,2.3),e.box(-2,.56,-7.7,1.6,.1,.6,"#927751","wood"),n.block(-2,-7.7,1.6,.6),[[-2,-6.6,0,"arcade"],[2,-6.6,0,"arcade"],[-6.5,-6.8,0,"alcove"],[-5.2,-6.8,0,"alcove"],[5.8,4.4,Math.PI,"square"],[7.1,4.4,Math.PI,"square"]].forEach(([i,s,r,o],a)=>e.seat(`court-seat-${a}`,i,s,r,o)),e.box(3,.35,-1.8,1.6,.7,1.4,"#80908a"),n.block(3,-1.8,1.6,1.4),e.box(3,.71,-1.8,1.3,.03,1.1,"#315964","puddle"),e.beam([3,3.5,-4.25],[3,3.5,-1.8],.1,"#ae8053");for(const i of[2.65,3.35])for(let s=.85;s<3.5;s+=.17)e.cylinder(i,s,-1.8,.08,.12,"#b88d59");n.environment.emitterAnchors.push({kind:"runoff",x:2.65,y:3.4,z:-1.8},{kind:"runoff",x:3.35,y:3.4,z:-1.8});for(const i of[-7.7,7.7]){e.cylinder(i,1.7,-8.1,.13,3.4,"#b18457");for(let s=.4;s<3.3;s+=.6)e.box(i,s,-8.1,.25,.08,.2,"#475958","metal")}for(const[i,s]of[[8,5],[-7,6]]){e.box(i,.3,s,1.2,.6,1.2,"#596b61"),n.block(i,s,1.2,1.2),e.cylinder(i,1.35,s,.22,2.1,"#6a6250","wood");for(let r=0;r<8;r++)e.sphere(i+(n.random()-.5)*1.4,2.4+n.random(),s+(n.random()-.5)*1.3,1.25,1,1.2,"#344b3e");e.zone(`canopy-${i}`,{minX:i-1,maxX:i+1,minZ:s-1,maxZ:s+1},3,.55,5,{rain:.6,roof:.15,wind:.2,lowpassHz:4500})}for(let i=0;i<70;i++)e.sphere(-7.7+n.random()*1.2,.5+n.random()*3.3,-8.02,.22,.35,.12,"#3d5948");for(const[i,s,r,o]of[[-3,2.7,2.8,.65],[3,5.8,3,.7],[6,-2.8,1.8,.6],[-6,-1.5,1.6,.5]])e.box(i,.025,s,r,.014,o,"#61838a","puddle");for(const i of[-4.5,4.5])e.box(i,.027,3,.06,.02,10,"#283f47","metal");e.light(-5,2.6,-7.7,"#ffc47a",14,9),e.light(4,2.6,-7.7,"#ffc47a",14,9),e.lantern(8.8,6.8,2.7,!1),e.lantern(-8.8,4,2.7,!1),e.zone("arcade",{minX:-8,maxX:8,minZ:-8,maxZ:-4},3.4,.1,10,{rain:.35,roof:.7,wind:.15,lowpassHz:2400}),e.zone("alcove",{minX:-8,maxX:-4,minZ:-8,maxZ:-5.5},3.4,0,20,{rain:.15,roof:.25,wind:.05,lowpassHz:900}),n.environment.audioAnchors=[{kind:"trickle",position:[3,.7,-1.8],gain:.12}],e.finish()}function Vx(n){const e=Jc(n);e.box(0,-.28,-10,110,.5,110,"#8e7358","sand");for(let i=0;i<90;i++){const s=(n.random()-.5)*23,r=(n.random()-.5)*20;e.box(s,-.009,r,1+n.random()*2,.012,.5+n.random(),"#9b8061","sand",n.random())}for(let i=0;i<13;i++){const s=-35+i*6;e.sphere(s,-.4,-15-n.random()*4,14,3,14,"#796754","sand"),e.box(s,3+n.random()*3,-30-n.random()*8,5+n.random()*4,8+n.random()*6,8,"#34333d")}for(const i of[-17,17])for(const s of[-5,5,15])e.sphere(i,-.3,s,12,2.3,15,"#796754","sand");for(const i of n.def.exits){const[s,r]=i.position;e.box(s,.005,r,1.5,.025,1.3,"#bfa485","sand");for(const o of[-1,1])e.box(s,.23,r+o*1.1,.38,.46,.38,"#afa087"),e.box(s,.53,r+o*1.1,.19,.17,.19,"#ffc47a","emissive")}n.block(0,-2,1.6,1.6);for(let i=0;i<12;i++){const s=i*Math.PI/6;e.sphere(Math.cos(s)*.7,.17,-2+Math.sin(s)*.7,.38,.3,.32,"#575552","stone")}for(const i of[-.7,.7])e.box(0,.19,-2,1.1,.18,.23,"#49352b","wood",i);e.cylinder(0,.19,-2,.7,.08,"#ff9b4b","emissive");const t=e.light(0,1,-2,"#ffae5e",24,12);n.environment.fire={position:[0,.2,-2],radius:.65,light:t,baseIntensity:24},n.environment.emitterAnchors.push({kind:"fire",position:[0,.2,-2],radius:.65}),n.environment.sky={stars:1500,milkyWay:!0},n.environment.dust={count:192,color:"#c5a27a"},n.environment.audioAnchors=[{kind:"fire",position:[0,.3,-2],gain:.3,radius:8}];for(let i=0;i<6;i++){const s=(30+i*60)*Math.PI/180,r=3*Math.cos(s),o=-2+3*Math.sin(s);e.seat(`camp-fire-${i}`,r,o,Math.atan2(-r,-2-o),"fire","#9f7651"),e.box(r,-.005,o,1.1,.025,1.1,i%2?"#655862":"#aa7c55","cloth")}e.seat("camp-quiet-0",6,-6,0,"shelter","#bba084"),e.seat("camp-quiet-1",7.3,-6,0,"shelter","#bba084"),n.block(-6,-6,3,2),e.box(-6,.65,-6,3,1.3,2,"#625944","cloth"),e.beam([-7.6,0,-7],[-6,2.4,-7],.13,"#b29c75","wood"),e.beam([-4.4,0,-7],[-6,2.4,-7],.13,"#b29c75","wood");for(const i of[-1,1]){const s=[-6,2.4,-6],r=[-6+i*1.7,.2,-6];for(let o=-6.95;o<-5;o+=.16)e.beam([s[0],s[1],o],[r[0],r[1],o],.18,"#a49473","cloth")}e.box(-6,.65,-4.98,1.2,1.3,.04,"#292d30"),e.box(-6,.09,-4.45,1.2,.1,.5,"#9b7961","cloth");for(const[i,s]of[[3.1,-7.9],[7.9,-7.9],[3.1,-4.1],[7.9,-4.1]])e.cylinder(i,1.4,s,.09,2.8,"#977a52","wood"),n.block(i,s,.12,.12);e.box(5.5,2.85,-7.5,5,.07,1,"#b1a086","cloth"),e.box(5.5,2.75,-4.4,5,.07,.6,"#a69378","cloth");for(const i of[3.1,5.5,7.9])e.beam([i,2.8,-8],[i,2.7,-4],.08,"#7c684a","wood");e.zone("shelter",{minX:3,maxX:8,minZ:-8,maxZ:-4},2.8,.15,10,{rain:0,roof:0,wind:.12,lowpassHz:2600}),e.zone("tent",{minX:-7.5,maxX:-4.5,minZ:-7,maxZ:-5},2.4,0,20,{rain:0,roof:0,wind:.05,lowpassHz:1200}),e.lantern(-7,-3,1.3,!0),e.lantern(6,-4,1.3,!1),e.lantern(-4,6,1.3,!1);for(const[i,s]of[[-7.8,-7],[-4.1,-7.4]])e.box(i,.22,s,.7,.44,.6,"#655743","wood"),n.block(i,s,.7,.6),e.box(i,.48,s,.75,.09,.65,"#987d56","wood");e.finish()}function Gx(n){const e=Jc(n);e.box(0,-.35,.4,24,.68,21,"#3e4d56");for(let o=-11;o<=11;o+=2)for(let a=-9;a<=10;a+=2)e.box(o,-.008,a,1.96,.035,1.96,"#647178",a<=-4&&o>=-2&&o<=5?"dry-stone":"wet-stone");cf(e,n.def,"#7d8580"),e.box(-6,1.45,-6.5,3,2.9,2.4,"#435660"),n.block(-6,-6.5,3,2.4),e.box(-6,2.98,-6.5,3.3,.16,2.7,"#88948d","metal"),e.box(-6,.95,-5.25,.85,1.9,.06,"#2d3c42","metal");for(let o=-7.2;o<-4.8;o+=.25)e.box(o,2,-5.22,.12,.4,.06,"#9eacac","metal");for(const[o,a]of[[-2,-7.9],[5,-7.9],[-2,-4.1],[5,-4.1]])e.box(o,1.5,a,.13,3,.13,"#5f6b66","metal"),n.block(o,a,.13,.13);e.box(1.5,3.15,-7.5,7.3,.12,1,"#9b957e","cloth"),e.box(1.5,3.07,-4.4,7.3,.12,.6,"#827f6d","cloth");for(const o of[-2,1.5,5])e.beam([o,3.1,-8],[o,3.05,-4],.07,"#7b715a","metal");[-1,.4,1.8,3.2].forEach((o,a)=>e.seat(`roof-lounge-${a}`,o,-6.4,0,"lounge","#987a5e")),[[-6.5,5.8],[-3.7,6.4],[4.8,5.8],[6.2,5.8]].forEach(([o,a],l)=>e.seat(`roof-south-${l}`,o,a,Math.PI,"south","#987a5e")),[-2.5,-4].forEach((o,a)=>e.seat(`roof-overlook-${a}`,8,o,-Math.PI/2,"overlook","#987a5e")),e.box(8,.95,6.8,1.2,1.9,.8,"#3d5b5e","metal"),n.block(8,6.8,1.2,.8),e.box(8,1.15,6.35,.9,1,.04,"#d3ad7c","windows");for(const o of[-8.5,8.5]){e.box(o,.25,8,1.2,.5,.7,"#68756a"),n.block(o,8,1.2,.7);for(let a=0;a<5;a++)e.sphere(o+(a-2)*.2,.7,8,.4,.8,.4,"#526d53")}for(let o=0;o<24;o++){const a=-4.5+o*.42,l=3.4-Math.sin(o/23*Math.PI)*.65;e.sphere(a,l,-5.1,.1,.12,.1,"#ffce8e","emissive"),o<23&&e.beam([a,l,-5.1],[a+.42,3.4-Math.sin((o+1)/23*Math.PI)*.65,-5.1],.02,"#394647","metal")}e.light(-.5,2.8,-5.2,"#ffcb87",12,10),e.light(5,2,5,"#ffc47a",7,8),e.cylinder(6,1.15,-5,.12,2.3,"#b39869"),n.block(6,-5,.32,.32);const t=new nt;t.name="roof-anemometer",t.position.set(6,2.35,-5),n.group.add(t);const i=new Wt(1.7,.07,.07),s=new Ze({color:"#c9ad75",metalness:.6,roughness:.4});n.owned.geometries.push(i),n.owned.materials.push(s);for(let o=0;o<3;o++){const a=new ae(i,s);a.rotation.y=o*Math.PI/3,t.add(a)}n.animated.push((o,a)=>{t.rotation.y=o*(a?1.5:.16)});for(const[o,a]of[-18,-30,-48].entries())for(let l=0;l<18;l++){const c=-45+l*5.2+n.random()*1.5,u=2.5+n.random()*2.5,f=5+n.random()*13;e.box(c,f/2-1,a,u,f,3+o*2,["#344955","#2a3d4b","#243444"][o],"skyline"),e.box(c,f-.8,a,u*.5,.6,1,"#465560","skyline");for(let d=1;d<f-1;d+=1.4)for(let h=-u/2+.4;h<u/2;h+=.8)n.random()>.35&&e.box(c+h,d,a+1.65+o,.25,.48,.025,"#d8bd89","windows")}e.zone("lounge",{minX:-2,maxX:5,minZ:-8,maxZ:-4},3.1,.1,10,{rain:.35,roof:.7,wind:.15,lowpassHz:2400}),e.zone("utility",{minX:-7.5,maxX:-4.5,minZ:-7.7,maxZ:-5.3},3,0,20,{rain:.1,roof:.2,wind:.05,lowpassHz:900}),n.environment.emitterAnchors.push({kind:"runoff",x:5,y:3.1,z:-4.4});const{materials:r}=e.finish();n.environment.nightMaterials=[r.get("windows")],Wx(n)}function Wx(n){const e=new ft,t=new Float32Array(96);e.setAttribute("position",new bt(t,3));const i=new Br({color:"#ffd299",size:.13,transparent:!0,opacity:.8,depthWrite:!1}),s=new ma(e,i);s.name="roof-traffic",s.frustumCulled=!1,n.group.add(s),n.owned.geometries.push(e),n.owned.materials.push(i),n.environment.traffic=s,n.animated.push(r=>{for(let o=0;o<32;o++)t[o*3]=((r*(o%2?1.4:-1.1)+o*3.1)%90+90)%90-45,t[o*3+1]=1.4+o%3*.7,t[o*3+2]=-17-o%3*10;e.attributes.position.needsUpdate=!0})}const fr=new k;function dn(n,e,t,i,s,r){const o=2*Math.PI*s/4,a=Math.max(r-2*s,0),l=Math.PI/4;fr.copy(e),fr[i]=0,fr.normalize();const c=.5*o/(o+a),u=1-fr.angleTo(n)/l;return Math.sign(fr[t])===1?u*c:a/(o+a)+c+c*(1-u)}class Qc extends Wt{constructor(e=1,t=1,i=1,s=2,r=.1){const o=s*2+1;if(r=Math.min(e/2,t/2,i/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:e,height:t,depth:i,segments:s,radius:r},o===1)return;const a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;const l=new k,c=new k,u=new k(e,t,i).divideScalar(2).subScalar(r),f=this.attributes.position.array,d=this.attributes.normal.array,h=this.attributes.uv.array,v=f.length/6,g=new k,m=.5/o;for(let p=0,S=0;p<f.length;p+=3,S+=2)switch(l.fromArray(f,p),c.copy(l),c.x-=Math.sign(c.x)*m,c.y-=Math.sign(c.y)*m,c.z-=Math.sign(c.z)*m,c.normalize(),f[p+0]=u.x*Math.sign(l.x)+c.x*r,f[p+1]=u.y*Math.sign(l.y)+c.y*r,f[p+2]=u.z*Math.sign(l.z)+c.z*r,d[p+0]=c.x,d[p+1]=c.y,d[p+2]=c.z,Math.floor(p/v)){case 0:g.set(1,0,0),h[S+0]=dn(g,c,"z","y",r,i),h[S+1]=1-dn(g,c,"y","z",r,t);break;case 1:g.set(-1,0,0),h[S+0]=1-dn(g,c,"z","y",r,i),h[S+1]=1-dn(g,c,"y","z",r,t);break;case 2:g.set(0,1,0),h[S+0]=1-dn(g,c,"x","z",r,e),h[S+1]=dn(g,c,"z","x",r,i);break;case 3:g.set(0,-1,0),h[S+0]=1-dn(g,c,"x","z",r,e),h[S+1]=1-dn(g,c,"z","x",r,i);break;case 4:g.set(0,0,1),h[S+0]=1-dn(g,c,"x","y",r,e),h[S+1]=1-dn(g,c,"y","x",r,t);break;case 5:g.set(0,0,-1),h[S+0]=dn(g,c,"x","y",r,e),h[S+1]=1-dn(g,c,"y","x",r,t);break}}static fromJSON(e){return new Qc(e.width,e.height,e.depth,e.segments,e.radius)}}function Xx(n){const{group:e,block:t,box:i,glow:s,material:r,colors:o,items:a,animated:l}=n;i(0,.25,-8.3,14,.5,2.4,"#3a3134"),t(0,-8.3,14,2.4);const c=s(0,3.1,-8.35,13,4,.15,"#101418",.12);i(0,5.25,-8.3,13.6,.3,.34,o.brass),i(0,.95,-8.3,13.6,.3,.34,o.brass);for(const L of[-6.65,6.65])i(L,3.1,-8.3,.3,4.6,.34,o.brass);n.screenQuad=[new k(-6.5,1.1,-8.28),new k(6.5,1.1,-8.28),new k(6.5,5.1,-8.28),new k(-6.5,5.1,-8.28)],l.push((L,A)=>{c.material.emissiveIntensity=A?.45+Math.sin(L*2)*.08:.12});for(const L of[-1,1]){const A=i(L*7.3,2.7,-8.1,1.1,5.4,2.8,"#5a2029");A.rotation.z=-L*.035,t(L*7.3,-8.1,1.1,2.8)}i(0,6.2,-8.1,15.8,.5,1.2,"#4a1b22"),i(0,5.75,-7.7,13.4,.55,.5,"#2c2226");const u=[];for(let L=-6;L<=6;L+=.75)u.push(s(L,5.75,-7.42,.16,.16,.12,"#ffd9a0",.15));l.push((L,A)=>{u.forEach((H,V)=>{H.material.emissiveIntensity=A?1.6+Math.sin(L*3+V)*.5:.15})}),i(0,1.7,9.35,2.3,3.4,1.7,o.dark),t(0,9.35,2.3,1.7),i(0,3.47,9.35,2,.14,1.4,"#33393c"),i(0,3.69,9.2,.6,.3,.6,"#33393c"),i(0,4.09,9.2,.55,.5,.8,"#22282b");const f=new ae(new Rn(.14,.14,.45,10),r(o.brass));f.rotation.x=Math.PI/2,f.position.set(0,4.09,8.72),e.add(f);const d=s(0,4.09,8.6,.18,.18,.12,"#ffe9c0",0),h=new k(0,4.09,8.72),v=new k(0,3.1,-8.25).sub(h),g=v.length(),m=new Fi({color:"#ffe9c0",transparent:!0,opacity:0,blending:is,depthWrite:!1,fog:!1,side:Yt}),p=new ae(new Rn(.14,1.5,1,14,1,!0),m);p.geometry.translate(0,-.5,0),p.position.copy(h),p.quaternion.setFromUnitVectors(new k(0,-1,0),v.normalize()),p.scale.set(1,g,1),p.visible=!1,e.add(p),l.push((L,A)=>{p.visible=A,m.opacity=.11+Math.sin(L*7)*.025,d.material.emissiveIntensity=A?1.4+Math.sin(L*7)*.3:0});const S=[];for(const L of[-3.5,3.5])for(const A of[1.4,3.6])S.push(s(L,.1,A,.18,.1,.18,"#ffca7a",.15));l.push((L,A)=>{S.forEach((H,V)=>{H.material.emissiveIntensity=A?1.7+Math.sin(L*2+V)*.3:.15})});const E=new Map,_=new Ze({color:"#ffffff",roughness:.96,metalness:0}),M=new Ze({color:"#ffffff",roughness:.38,metalness:.65}),x=new Qc(1,1,1,3,.12),w=new Rn(1,1,1,16),R=new _a(1,.18,8,20),y=new ga(1,1);function b(L,A,H,V,Z,le,ve,Oe,K,G=0){let q=E.get(L);q||E.set(L,q=new Map),q.has(A)||q.set(A,[]);const ne=new Tt;ne.position.set(H,V,Z),ne.scale.set(le,ve,Oe),ne.rotation.x=G,ne.updateMatrix(),q.get(A).push({matrix:ne.matrix.clone(),color:new Se(K)})}const P=(L,A,H,V,Z,le,ve,Oe=0)=>b(x,_,L,A,H,V,Z,le,ve,Oe),N=[-2.75,-1.65,-.55,.55,1.65,2.75],U=[3.9,5,6.1,7.2,8.15],I=[...N,...U,...U.map(L=>-L)];for(const[L,A]of[[.3,1],[2.5,2],[4.7,3]])for(const[H,V]of I.entries()){t(V,L,.76,.62);const Z=H%3===0?"#702c3b":"#602333";P(V,.48,L-.02,.58,.22,.59,Z),P(V,.89,L+.24,.65,.92,.19,"#29282d",-.1),P(V,.91,L+.13,.57,.79,.18,Z,-.1),P(V,1.2,L+.09,.49,.22,.13,"#823748",-.1);for(const le of[-.16,0,.16])P(V+le,.86,L+.025,.135,.4,.055,Z,-.1);i(V,.19,L+.08,.13,.29,.22,"#262b30"),P(V,.17,L+.06,.47,.055,.39,"#303238");for(const le of[-.34,.34])i(V+le,.42,L+.06,.06,.49,.3,"#272b30"),P(V+le,.7,L,.1,.12,.65,"#29272d"),b(R,M,V+le,.77,L-.2,.055,.055,.055,"#ae8953",Math.PI/2),b(w,M,V+le,.743,L-.2,.042,.045,.042,"#151b20");i(V,1.08,L+.36,.14,.065,.02,o.brass),a.push({type:"seat",x:V,z:L,title:"Take a seat",sub:`Row ${A} · Seat ${H+1} · The Orpheum`})}i(0,.145,2.7,18.6,.025,8.5,"#34212c"),i(0,.145,8,18.6,.025,2,"#502b35");for(const L of[-9.15,9.15])i(L,.165,3.9,.045,.02,12,o.brass);for(const L of[-1.35,1.4,3.6,5.85]){i(0,.165,L,18.3,.02,.035,"#98754e");for(const A of[-8.95,8.95])s(A,.2,L,.12,.05,.22,"#ffca7a",.65)}for(const L of[-1,1])for(const A of[-4.5,2.8,6.4]){i(L*11.65,1.65,A,.25,3.05,2.3,"#302e38");for(let H=-.9;H<=.9;H+=.3)i(L*11.49,1.6,A+H,.12,2.8,.06,"#765447");i(L*11.38,1.9,A,.18,.65,.4,o.brass),s(L*11.25,1.9,A,.12,.45,.24,"#ffcc89",.8),P(L*11.25,3,A,.4,.62,.48,"#20262b");for(let H=2.8;H<3.25;H+=.08)i(L*11.02,H,A,.025,.025,.36,"#44494b")}i(-6.6,.65,9.2,5.1,1.05,1.2,"#48342e"),t(-6.6,9.2,5.1,1.2),i(-6.6,1.21,9.2,5.3,.13,1.4,"#c0a983");for(const L of[-8.5,-7.5,-6.5,-5.5,-4.5])i(L,.65,8.58,.78,.74,.04,"#6c493a"),i(L,.99,8.54,.64,.025,.03,o.brass);const F=-8;P(F,1.38,9.2,1.2,.23,.94,"#8a3036"),P(F,2.6,9.2,1.35,.24,1.04,"#8a3036"),s(F,2.44,9.2,1.02,.035,.73,"#ffcf7b",.8);for(const L of[-.54,.54])for(const A of[-.4,.4])i(F+L,1.99,9.2+A,.055,1.08,.055,o.brass);const B=new ae(new Wt(1.04,.97,.79),new Ze({color:"#d5e1dc",transparent:!0,opacity:.1,roughness:.12,depthWrite:!1}));B.position.set(F,1.98,9.2),e.add(B),b(w,M,F,2.16,9.2,.3,.25,.3,"#ad885b"),b(w,M,F,2.32,9.2,.34,.06,.34,"#d1b17b"),i(F,2.4,9.2,.04,.14,.04,"#45454a");for(let L=0;L<150;L++){const A=F+Math.sin(L*43.7)*.46,H=9.2+Math.cos(L*17.3)*.33;b(y,_,A,1.55+L%5*.026,H,.047,.043,.044,L%3?"#efcd83":"#fff0b9")}for(let L=0;L<9;L++)i(F-.52+L*.13,2.61,8.67,.055,.17,.02,"#e9d6ae");for(const L of[-6.9,-6.45,-6]){P(L,1.48,9,.29,.42,.29,"#ecdbb5");for(const A of[-.09,.03])i(L+A,1.48,8.848,.035,.37,.014,"#a13d40");for(let A=0;A<9;A++)b(y,_,L+Math.sin(A*5)*.1,1.71,9+Math.cos(A*4)*.1,.046,.04,.045,"#ffe4a0")}P(-4.8,1.73,9.35,.88,.94,.65,"#283a3c");for(const[L,A]of["#a95140","#bd9a4e","#528482"].entries())s(-5.07+L*.27,1.91,9.01,.19,.25,.025,A,.25),i(-5.07+L*.27,1.64,8.97,.05,.15,.12,o.brass);i(-4.8,1.31,8.93,.88,.06,.32,"#848680"),P(7.8,.66,8.8,.76,1.02,.76,"#2e4141"),t(7.8,8.8,.76,.76),P(7.8,1.21,8.8,.81,.15,.81,"#ab926a"),i(7.8,1.3,8.8,.43,.025,.38,"#111d24"),i(4.6,.72,9.15,1.1,1.16,.68,"#604339"),t(4.6,9.15,1.1,.68),i(4.6,1.34,9.15,1.2,.1,.8,o.brass);for(let L=0;L<5;L++)i(4.6+L*.03,1.41+L*.025,9.15,.52,.018,.3,"#dac9a1");for(const[L,A]of E)for(const[H,V]of A){const Z=new Li(L,H,V.length);V.forEach((le,ve)=>{Z.setMatrixAt(ve,le.matrix),Z.setColorAt(ve,le.color)}),Z.castShadow=Z.receiveShadow=!0,e.add(Z)}a.push({type:"theater_screen",x:0,z:-5.9,title:"Screen controls",sub:"Press E to run the picture"})}const xc=new Map,aa=new Map;function qx(n,e){if(typeof n!="string"||n.length===0)throw new Error("Place builder keys must be non-empty strings");if(typeof e!="function")throw new Error(`Place builder "${n}" must be a function`);if(xc.has(n))throw new Error(`Duplicate place builder key: ${n}`);return xc.set(n,e),e}function $x(n){const e=n?.builderKey||n?.id,t=xc.get(e);if(!t)throw new Error(`Place "${n?.id??"unknown"}" declares unknown builder key: ${e}`);return t}function jx(n,e){if(n.length===0)throw new Error("Place controller keys must be non-empty strings");if(!e||typeof e!="object")throw new Error(`Place controller "${n}" must be an object`);if(aa.has(n))throw new Error(`Duplicate place controller key: ${n}`);return aa.set(n,e),e}function Yx(n){return aa.get(n)}function Kx(n){return aa.delete(n)}const Zx={court:{shell:"none",subtitle:"STAY FOR THE RAIN",color:"#283f51",sun:"#b8cbd8",description:"Rain on blue stone. A warm arcade and a seat out of the weather.",capabilities:{seating:!0,sharedMedia:!1,conferencing:!1},atmosphere:{preset:"rain-night",weatherMode:"fixed",timeMode:"fixed"},minimapPath:"M34 40H119V49H34Z M80 53H90V60H80Z M29 58H124 M77 58V88"},rooftops:{shell:"none",subtitle:"ABOVE THE EVENING",description:"A sheltered lounge above the city. Watch windows light up across the skyline.",capabilities:{seating:!0,sharedMedia:!1,conferencing:!1},atmosphere:{preset:"rooftop-cycle",weatherMode:"scheduled",timeMode:"fixed"},minimapPath:"M39 36H53V47H39Z M68 37H99V49H68Z M30 59H125 M77 59V88"}},Jx={id:"desert-camp",name:"The Desert Camp",district:"BEYOND THE CITY / 21",subtitle:"UNDER A THOUSAND STARS",color:"#111b2b",sun:"#9badca",description:"A circle of firelight, a canvas shelter, and a sky worth staying for.",kind:"environment",seed:629,bounds:{minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3},spawn:[-9,0],companionSpawn:[-8.2,1],shell:"none",builderKey:"desert-camp",minimapPath:"M38 37H52V46H38Z M91 37H113V50H91Z M66 52H87V65H66Z M29 58L57 70H96L125 58",atmosphere:{preset:"desert-night",weatherMode:"fixed",timeMode:"fixed"},capabilities:{seating:!0,sharedMedia:!1,conferencing:!1},social:{featured:!1,legacy:!1},exits:[{id:"west",kind:"district",position:[-10.7,0],target:"court"},{id:"east",kind:"district",position:[10.7,0],target:"theater"}]},uf=[{id:"court",name:"The Rain Court",district:"LOWER DISTRICT / 04",subtitle:"AFTER THE RAIN",color:"#657264",sun:"#ffe0a5",description:"Wet stone, warm windows. Where your journey began."},{id:"canal",name:"The Sluiceworks",district:"WATER DISTRICT / 05",subtitle:"BENEATH THE MIST",color:"#466b70",sun:"#c3e6e1",description:"Cross the canal and wake the sleeping waterworks.",objective:"Open the sluice valve",action:"Turn the sluice valve",done:"Waterworks flowing",message:"Water moves through the old channels again. Somewhere below, a garden drinks.",landmark:[7,-5],note:[-7,5],noteTitle:"A waterkeeper’s promise",noteBody:"“Keep the water moving. The roots above us are still alive.”",spawn:[-9,0]},{id:"garden",name:"The Glass Garden",district:"UPPER TERRACES / 06",subtitle:"WHERE GREEN RETURNS",color:"#78846a",sun:"#ffe6ad",description:"An overgrown greenhouse above the city. Something still grows.",objective:"Wake the seed nursery",action:"Tend the seed nursery",done:"Nursery awakened",message:"The nursery lights up, sheltering a new generation of green. Kiln watches the leaves unfold.",landmark:[4,-5],note:[-6,5],noteTitle:"The last gardener",noteBody:"“A city is not empty while something is growing. Leave a little room for the wild.”",spawn:[-9,0]},{id:"station",name:"The Last Platform",district:"TRANSIT DISTRICT / 07",subtitle:"THE BLUE HOUR",color:"#424d70",sun:"#b4c5fa",description:"An abandoned tram stop, and a signal waiting to be heard.",objective:"Light the signal beacon",action:"Send the home signal",done:"Signal broadcasting",message:"A warm signal reaches across the rooftops. If someone is out there, they know the city is waking.",landmark:[7,5],note:[-6,5],noteTitle:"An unsent timetable",noteBody:"“Last service: whenever you are ready. There will always be a way home.”",spawn:[-9,0]},{id:"aqueduct",name:"The Sunken Aqueduct",district:"AQUEDUCT DISTRICT / 08",subtitle:"DEEP RUNS THE WATER",color:"#384d52",sun:"#9ec4c0",description:"Subterranean stone channels beneath the old city. Clear the silt sluice to let the cisterns breathe.",objective:"Clear the silt sluice",action:"Raise the silt gate",done:"Cisterns breathing",message:"Clear water rushes through the ancient conduit. The subterranean echoing returns to life.",landmark:[6,-4],note:[-6,4],noteTitle:"Cistern Overseer’s Log",noteBody:"“The masonry has held for three centuries. Give it clean water, and it will hold for three more.”",spawn:[-9,0]},{id:"caldera",name:"The Boiler Caldera",district:"GEOTHERMAL DISTRICT / 09",subtitle:"HEAT FROM THE DEEP",color:"#4d3b38",sun:"#f7aa74",description:"Steam vents hiss through dark basalt crevices. Regulate the geothermal manifold.",objective:"Regulate the geothermal manifold",action:"Turn the pressure manifold",done:"Manifold regulated",message:"Steam settles into a steady, resonant rhythm. Warm air rises toward the cold terraces above.",landmark:[5,-4],note:[-6,5],noteTitle:"Thermal Watchman",noteBody:"“Listen to the pressure before you touch a valve. The rock speaks if you have patience.”",spawn:[-9,0]},{id:"understory",name:"The Spore Understory",district:"FUNGAL DISTRICT / 10",subtitle:"LIGHT IN THE DAMP",color:"#3b4737",sun:"#a5d9a0",description:"A cavernous lower rotunda overtaken by luminous fungi. Awaken the bioluminescent mycelium.",objective:"Awaken the mycelium lattice",action:"Energize the mycelial node",done:"Mycelium luminous",message:"Soft green light pulses through the damp loam and ripples across the shelf fungi.",landmark:[6,-5],note:[-7,5],noteTitle:"Fungal Archivist",noteBody:"“Fungi remember where every tree once stood. They do not hurry, and they never forget.”",spawn:[-9,0]},{id:"saltworks",name:"The Bleached Saltworks",district:"MINERAL DISTRICT / 11",subtitle:"WHITE TERRACES OF BRINE",color:"#566668",sun:"#e3f3f7",description:"Blinding white crystalline flats and evaporation pans. Free the stuck brine pump.",objective:"Engage the brine pump",action:"Prime the brine pump",done:"Brine pump turning",message:"Clear brine trickles into the shallow crystallizers. Salt crystals shimmer in the sunlight.",landmark:[7,-4],note:[-6,4],noteTitle:"Salt Harvester’s Tablet",noteBody:"“The tide gives, the wind takes, and the salt remains. A clean basin makes clean bread.”",spawn:[-9,0]},{id:"rooftops",name:"The High Awnings",district:"SKYWARD DISTRICT / 12",subtitle:"WHERE WINDS GATHER",color:"#546370",sun:"#e6d8b8",description:"Wind-beaten scaffolding and catwalks overlooking the expanse. Free the anemometer array.",objective:"Free the anemometer array",action:"Align the wind vanes",done:"Wind array spinning",message:"The brass vanes catch the gusts and sing against the copper eaves. The city knows which way the wind blows.",landmark:[6,-5],note:[-5,5],noteTitle:"Roofkeeper’s Weather Log",noteBody:"“Up here, you feel the city breathing. The high wind is honest; it hides nothing.”",spawn:[-9,0]},{id:"mangrove",name:"The Brackish Basin",district:"ESTUARY DISTRICT / 13",subtitle:"ROOTS IN THE BRINE",color:"#44574c",sun:"#cde4cb",description:"Submerged brickwork laced with tangle roots and stilt boardwalks. Restore the tidal weir.",objective:"Clear the tidal weir",action:"Lower the timber weir",done:"Tidal weir secured",message:"The water slows behind the timber barrier. Small fish dart among the submerged brick columns.",landmark:[6,-4],note:[-6,5],noteTitle:"Estuary Keeper’s Marker",noteBody:"“The tide doesn’t care about our masonry, but the roots hold both together.”",spawn:[-9,0]},{id:"trestle",name:"The Overgrown Trestle",district:"CANOPY DISTRICT / 14",subtitle:"IRON IN THE BOUGHS",color:"#4e5a42",sun:"#dce6b6",description:"A massive iron railway viaduct gripped by ancient boughs. Restore the suspended maintenance crane.",objective:"Anchor the canopy crane",action:"Engage the hoist cable",done:"Canopy crane anchored",message:"Tension locks into the heavy iron cables. Kiln chirps as the suspension bridge stabilizes.",landmark:[7,-4],note:[-5,5],noteTitle:"Viaduct Inspector’s Plaque",noteBody:"“Steel will flex and timber will bend, but together they span the valley.”",spawn:[-9,0]},{id:"foundry",name:"The Rustfall Foundry",district:"SMELTING DISTRICT / 15",subtitle:"HEARTH OF SLAG AND ORE",color:"#4a3832",sun:"#f2a679",description:"Red iron dust and towering crucible furnaces. Ignite the pilot hearth.",objective:"Ignite the pilot hearth",action:"Spark the furnace igniter",done:"Pilot hearth glowing",message:"A warm orange glow spreads through the blast flue. Warmth returns to the cold cast iron.",landmark:[6,-4],note:[-6,5],noteTitle:"Foundry Master’s Inscription",noteBody:"“Cold iron forgets its shape until fire reminds it. Never let the pilot flame die completely.”",spawn:[-9,0]},{id:"frost-spire",name:"The Glacial Glasshouse",district:"ALPINE DISTRICT / 16",subtitle:"ABOVE THE CLOUD LINE",color:"#45596e",sun:"#d6ecff",description:"A fractured glass observatory battered by alpine frost. Clear the ice crystals from the solar collector.",objective:"Clear the solar collector",action:"Sweep the frost collector",done:"Solar collector cleared",message:"Sunlight catches the polished mirror facets. Warmth begins melting the frost along the rim.",landmark:[5,-5],note:[-6,5],noteTitle:"Alpine Observer’s Journal",noteBody:"“The cold is patient, but glass and copper remember the light. Keep looking upward.”",spawn:[-9,0]},{id:"delta",name:"The Reclaimed Marshes",district:"DELTA DISTRICT / 17",subtitle:"WHISPERS IN THE REEDS",color:"#525b45",sun:"#d9e0b2",description:"Shallow sandbars and cattail marshes woven through stranded barges. Realign the channel beacon.",objective:"Light the channel beacon",action:"Strike the marsh beacon",done:"Channel beacon lit",message:"A warm beacon reflects across the delta shallows, cutting through the twilight mist.",landmark:[7,-4],note:[-6,4],noteTitle:"Delta Boatman’s Note",noteBody:"“Follow the reeds when the silt shifts. Where water moves slowly, green things thrive.”",spawn:[-9,0]},{id:"archives",name:"The Paper Catacombs",district:"ARCHIVE DISTRICT / 18",subtitle:"WHISPERING VAULTS",color:"#48444a",sun:"#f5e4bd",description:"Stone shelves holding centuries of water-resistant parchment. Light the reading desk lamp.",objective:"Illuminate the study rotunda",action:"Turn the reading lamp switch",done:"Study rotunda illuminated",message:"A soft amber globe illuminates centuries of hand-bound volumes. The silence feels like peace.",landmark:[5,-4],note:[-6,5],noteTitle:"Chief Archivist’s Dedication",noteBody:"“Words outlive empires, provided someone keeps the rain from dripping on the ink.”",spawn:[-9,0]},{id:"kiln-terrace",name:"The Solar Kiln",district:"TERRACOTTA DISTRICT / 19",subtitle:"BAKED IN WARMTH",color:"#634b3e",sun:"#ffd09e",description:"Baked clay tiles and parabolic sun collectors. Align the solar concentrator.",objective:"Focus the solar concentrator",action:"Calibrate the focal mirror",done:"Concentrator focused",message:"A brilliant point of concentrated sunlight gleams against the terracotta kiln. Warmth radiates.",landmark:[6,-4],note:[-5,5],noteTitle:"Potter’s Credo",noteBody:"“Earth, water, and sun. With these three, a broken city can remake itself cup by cup.”",spawn:[-9,0]},{id:"theater",name:"The Orpheum",district:"CINEMA DISTRICT / 20",subtitle:"PICTURES IN THE DARK",color:"#3a3345",sun:"#e8c9a0",description:"A grand old cinema where the city gathers after dark. Queue a film, take a seat.",objective:"Restore power to the projector",action:"Restore the projector",done:"Projector humming",message:"The marquee blazes and the reel begins to turn. Take a seat — whatever plays here plays for everyone.",landmark:[0,7.6],note:[-6,7.2],noteTitle:"The Orpheum’s house rules",noteBody:"“Anyone may change the picture. No one owns the screen. Leave the aisle lamps burning for whoever comes next.”",spawn:[-9,0]}],Nh=["environment","venue","view"],Uh=["legacy-urban","none"],Oh=["seating","sharedMedia","conferencing"],Fh=["fixed","scheduled"],kh=["fixed","scheduled"],Qx=Object.freeze({minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3}),gr=Object.freeze(uf.map(n=>n.id)),eb=Object.freeze([-10.7,0]),tb=Object.freeze([10.7,0]),nb=Object.freeze([0,8.8]),ib={court:"M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24",canal:"M24 24H130V96H24Z M24 60H130 M70 24V96 M84 24V96",station:"M24 24H130V96H24Z M24 40H130 M24 75H130 M65 40V75",aqueduct:"M24 24H130V96H24Z M24 35H130 M45 24V96 M80 24V96 M105 24V96",caldera:"M24 24H130V96H24Z M50 35H100V80H50Z M75 35V80 M24 60H50 M100 60H130",understory:"M24 24H130V96H24Z M35 40H65V75H35Z M90 40H120V75H90Z M65 60H90",saltworks:"M24 24H130V96H24Z M35 30H115V55H35Z M35 65H115V90H35Z M75 24V96",rooftops:"M24 24H130V96H24Z M40 45H110 M75 24V96 M40 30L75 60L110 30 M40 90L75 60L110 90",mangrove:"M24 24H130V96H24Z M24 50Q75 20 130 50 M24 70Q75 100 130 70 M75 35V85",trestle:"M24 24H130V96H24Z M24 35H130 M24 85H130 M35 35L55 85 M55 35L75 85 M75 35L95 85 M95 35L115 85",foundry:"M24 24H130V96H24Z M40 35H70V65H40Z M85 35H115V65H85Z M24 75H130","frost-spire":"M24 24H130V96H24Z M75 25L115 60L75 95L35 60Z M75 25V95 M35 60H115",delta:"M24 24H130V96H24Z M24 45C55 40 85 75 130 55 M24 75C60 70 90 90 130 85 M70 24V96",archives:"M24 24H130V96H24Z M35 35H115 M35 50H115 M35 65H115 M35 80H115 M75 24V96","kiln-terrace":"M24 24H130V96H24Z M45 35H105V85H45Z M75 45A15 15 0 1 0 75 75A15 15 0 1 0 75 45 M24 60H45 M105 60H130",theater:"M24 24H130V96H24Z M42 34H112 M42 38H112 M34 52H62 M70 52H120 M34 68H62 M70 68H120 M34 84H120",garden:"M24 24H130V96H24Z M38 36H116V84H38Z M65 24V96"};function sb(n){const e=gr.indexOf(n),t=gr.length;return[Object.freeze({id:"west",kind:"district",position:eb,target:gr[(e-1+t)%t]}),Object.freeze({id:"east",kind:"district",position:tb,target:gr[(e+1)%t]}),Object.freeze({id:"market",kind:"market",position:nb,target:"market"})]}function Ma(n){if(n&&typeof n=="object"&&!Object.isFrozen(n)){Object.freeze(n);for(const e of Object.keys(n))Ma(n[e])}return n}function rb(n,e){const t=n.spawn??[-9,0],i=n.id==="theater";return Ma({...n,kind:i?"venue":"environment",seed:e*37,bounds:{...Qx},spawn:t,companionSpawn:[t[0]+.8,t[1]+1],shell:"legacy-urban",builderKey:n.id,minimapPath:ib[n.id],atmosphere:{preset:null,weatherMode:"fixed",timeMode:"fixed"},capabilities:i?{seating:!0,sharedMedia:!0,conferencing:!1}:{seating:!1,sharedMedia:!1,conferencing:!1},social:{featured:i||n.id==="court",legacy:!0},exits:sb(n.id),...Zx[n.id]})}const Pn=Ma([...uf.map(rb),Jx]);Ma({id:"tiny-view",name:"The Pocket Stage",kind:"view",seed:gr.length*37,bounds:Object.freeze({minX:-3,maxX:3,minZ:-2.5,maxZ:2.5}),spawn:[0,0],companionSpawn:[.8,1],exits:[],minimapPath:"M24 24H130V96H24Z",shell:"none",builderKey:"tinyView",atmosphere:{preset:null,weatherMode:"fixed",timeMode:"fixed"},capabilities:{seating:!1,sharedMedia:!1,conferencing:!1},social:{featured:!1,legacy:!1},objective:null,note:null});function hf(n){return Pn.find(e=>e.id===n)}const To=n=>Array.isArray(n)&&n.length===2&&n.every(Number.isFinite),Bh=n=>typeof n=="string"&&/^#[0-9a-f]{6}$/i.test(n),ob=n=>typeof n=="string"&&/^[a-z0-9][a-z0-9-]*$/.test(n);function ab(n,{knownIds:e=null}={}){const t=[],i=(h,v)=>{h||t.push(v)};if(!n||typeof n!="object"||Array.isArray(n))return["definition is not an object"];i(typeof n.id=="string"&&/^[a-z0-9-]+$/.test(n.id),`id must be a kebab-case string, got ${JSON.stringify(n.id)}`),i(typeof n.name=="string"&&n.name.length>0,"name must be a non-empty string"),i(Nh.includes(n.kind),`kind must be one of ${Nh.join(", ")}`),i(Number.isFinite(n.seed)&&n.seed>=0,"seed must be a finite, non-negative number");const s=n.bounds;i(s&&typeof s=="object","bounds are required");const r=!!s&&["minX","maxX","minZ","maxZ"].every(h=>Number.isFinite(s[h]));i(r,"bounds must be finite numbers"),r&&i(s.minX<s.maxX&&s.minZ<s.maxZ,"bounds must not be inverted");const o=h=>r&&To(h)&&h[0]>s.minX&&h[0]<s.maxX&&h[1]>s.minZ&&h[1]<s.maxZ;if(i(o(n.spawn),"spawn must be a finite [x, z] pair strictly inside bounds"),i(o(n.companionSpawn),"companionSpawn must be a finite [x, z] pair strictly inside bounds"),n.exits!=null){i(Array.isArray(n.exits),"exits must be an array");for(const[h,v]of(n.exits??[]).entries())i(v&&typeof v=="object",`exits[${h}] must be an object`),i(typeof v?.id=="string"&&v.id.length>0,`exits[${h}].id must be a non-empty string`),i(v?.kind==null||["district","market"].includes(v.kind),`exits[${h}].kind must be 'district' or 'market'`),i(To(v?.position),`exits[${h}].position must be a finite [x, z] pair`),i(typeof v?.target=="string"&&v.target.length>0,`exits[${h}].target must be a place id`),e&&typeof v?.target=="string"&&i(v.target==="market"||e.has(v.target),`exits[${h}].target "${v.target}" is not a known place`)}i(typeof n.minimapPath=="string"&&n.minimapPath.length>0,"minimapPath must be a non-empty SVG path string"),i(Uh.includes(n.shell),`shell must be one of ${Uh.join(", ")}`),i(typeof n.builderKey=="string"&&n.builderKey.length>0,"builderKey must be a non-empty string (registry resolves it to a function)");const a=n.atmosphere;i(a&&typeof a=="object","atmosphere configuration is required"),a&&(i(a.preset===null||ob(a.preset),"atmosphere.preset must be null or a preset key"),i(Fh.includes(a.weatherMode),`atmosphere.weatherMode must be one of ${Fh.join(", ")}`),i(kh.includes(a.timeMode),`atmosphere.timeMode must be one of ${kh.join(", ")}`));const l=n.capabilities;if(i(l&&typeof l=="object","capabilities are required"),l){for(const[h,v]of Object.entries(l))i(Oh.includes(h),`unknown capability: ${h}`),i(typeof v=="boolean",`capability ${h} must be a boolean`);for(const h of Oh)i(typeof l[h]=="boolean",`capability ${h} must be declared`)}const c=n.social;i(c&&typeof c=="object"&&typeof c.featured=="boolean"&&typeof c.legacy=="boolean","social must declare boolean featured and legacy flags"),n.color!=null&&i(Bh(n.color),"color must be a #rrggbb hex string"),n.sun!=null&&i(Bh(n.sun),"sun must be a #rrggbb hex string");const u=n.objective!=null,f=[n.action,n.done,n.message,n.landmark];u?(i(typeof n.objective=="string"&&n.objective.length>0,"objective must be a non-empty string when present"),i(f.every(h=>h!=null),"objective tuple is incomplete: action, done, message and landmark are required alongside objective"),n.landmark!=null&&i(To(n.landmark),"landmark must be a finite [x, z] pair")):i(!f.some(h=>h!=null),"restoration fields (action/done/message/landmark) require an objective; social places stay objective-free");const d=[n.noteTitle,n.noteBody];return n.note!=null?(i(To(n.note),"note must be a finite [x, z] pair"),i(d.every(h=>h!=null),"note tuple is incomplete: noteTitle and noteBody are required alongside note")):i(!d.some(h=>h!=null),"note fields (noteTitle/noteBody) require a note position; social places stay note-free"),t}const df=new Wt(1,1,1),ml=new Map;function Nn(n,e=null,t=0){const i=`${n}_${e||""}_${t}`;return ml.has(i)||ml.set(i,new Ze({color:n,roughness:.62,metalness:.2,emissive:e||"#000000",emissiveIntensity:t})),ml.get(i)}function Un(n,e,t,i,s,r,o,a,l=0,c=0){const u=new ae(df,a);return u.position.set(e,t,i),u.scale.set(s,r,o),u.rotation.z=l,u.rotation.y=c,u.castShadow=u.receiveShadow=!0,n.add(u),u}function lb(n,e){const{group:t,items:i,animated:s}=e,r=kx.filter(l=>l.district===n.id);if(r.length===0)return null;const o=new nt;return o.name="dynamic",t.add(o),{visuals:r.map((l,c)=>{const u=Zc[l.material],[f,d]=l.position,h=new nt;h.position.set(f,0,d),o.add(h),Un(h,0,.12,0,1.15,.24,1.15,Nn("#3d4547"));const v=new nt;h.add(v),l.material==="copper"?(Un(v,-.18,.34,.1,.42,.34,.42,Nn(u.color),0,.4),Un(v,.22,.3,-.14,.34,.26,.34,Nn("#a8663a"),.2,-.5),Un(v,.05,.54,.02,.2,.22,.2,Nn("#d18b52"),-.3,.9)):l.material==="timber"?(Un(v,0,.36,.05,1.05,.26,.3,Nn(u.color),0,.18),Un(v,.06,.6,-.04,.95,.24,.28,Nn("#8a6842"),0,-.32),Un(v,-.05,.8,.02,.6,.2,.24,Nn("#6b4e30"),0,.62)):(Un(v,-.16,.4,.08,.16,.5,.4,Nn(u.color),.12,.3),Un(v,.18,.36,-.1,.14,.44,.34,Nn("#b8d8e8"),-.1,-.6),Un(v,.02,.52,.12,.12,.62,.3,Nn("#cfe4f0"),.05,1.1));const g=new Ze({color:u.glowColor,emissive:u.glowColor,emissiveIntensity:1.2}),m=new ae(df,g);m.scale.set(.12,.12,.12),m.position.y=.95,h.add(m);const p={type:"material_node",nodeId:l.id,material:l.material,x:f,z:d,title:`${u.name} cache`,sub:"Press E to gather materials"};i.push(p);const S={def:l,nodeGroup:h,rich:v,spark:m,sparkMat:g,item:p,depleted:!1,phase:c*1.7};return s.push(E=>{m.position.y=.95+Math.sin(E*2+S.phase)*.07,m.rotation.y=E*.8+S.phase,g.emissiveIntensity=1.1+Math.sin(E*2.6+S.phase)*.35}),S}),dynamic:o}}function cb(n,e){n.depleted=!e.available,n.rich.visible=e.available,n.spark.visible=e.available,n.item&&(n.item.sub=e.available?"Press E to gather materials":"Picked clean — it will regrow in time")}const ub={west:"Westbound",east:"Eastbound"};function hb(n){const e=[];for(const t of n.exits??[]){if(t.kind==="market"){e.push({type:"market_gate",x:t.position[0],z:t.position[1],targetDistrict:"market",title:"Return to Market Court",sub:"Trade produce & visit your garden"});continue}const i=hf(t.target),s=ub[t.id]??`${t.id.charAt(0).toUpperCase()}${t.id.slice(1)}bound`;e.push({type:"district_gate",x:t.position[0],z:t.position[1],targetDistrict:t.target,title:`Gate to ${i?i.name:t.target}`,sub:`${s}: ${i?i.district:""}`})}return e}function db(n,{completed:e=!1}={}){const t=ab(n);if(t.length>0)throw new Error(`Invalid place definition "${n?.id??"unknown"}": ${t.join("; ")}`);const i=$x(n),s=new nt;s.name=n.id;const r=[],o=[],a=[],l=new Wt(1,1,1),c={stone:"#6b776c",dark:"#233c3e",brass:"#b78d50",green:"#58734c"},u={geometries:[l],materials:[],lights:[]},f={zones:[],materialFamilies:[],emitterAnchors:[]},d=new Map,h=x=>(d.has(x)||(d.set(x,new Ze({color:x,roughness:.62,metalness:.2})),u.materials.push(d.get(x))),d.get(x));function v(x,{color:w=c.stone,roughness:R=.62,metalness:y=.2,sheltered:b=!1}={}){const P=new Ze({color:w,roughness:R,metalness:y});u.materials.push(P);const N={key:x,material:P,sheltered:!!b,dry:Object.freeze({color:P.color.getHex(),roughness:R,metalness:y})};return f.materialFamilies.push(N),P}function g(x,w,R,y,b,P,N=c.stone){const U=N&&N.isMaterial?N:h(N),I=new ae(l,U);return I.position.set(x,w,R),I.scale.set(y,b,P),I.castShadow=I.receiveShadow=!0,s.add(I),I}function m(x,w,R,y){r.push({x,z:w,w:R/2+.38,d:y/2+.38})}function p(x,w,R,y,b,P,N,U=1.5){const I=g(x,w,R,y,b,P,N);return I.material=new Ze({color:N,emissive:N,emissiveIntensity:U}),u.materials.push(I.material),I}function S(x,w,R="#ffcb79"){g(x,1.8,w,.12,3.6,.12,c.dark),p(x,3.6,w,.35,.5,.35,R,2),g(x,3.92,w,.6,.12,.6,c.dark);const y=new ya(R,7,7,2);y.position.set(x,3.4,w),s.add(y),u.lights.push(y),m(x,w,.25,.25)}let E=Number.isFinite(n.seed)?n.seed:hf(n.id)?.seed;Number.isFinite(E)||(E=0);function _(){return E=E*1664525+1013904223>>>0,E/4294967296}function M(){for(const x of u.geometries.splice(0))x.dispose();for(const x of u.materials.splice(0))x.dispose();for(const x of u.lights.splice(0))x.parent?.remove(x)}try{let b=function(L){if(!(!y||!Array.isArray(L)))for(const A of L){const H=y.visuals.find(V=>V.def.id===A.nodeId);H&&cb(H,A)}},P=function(L,A){w&&(w.position.y=2.5+Math.sin(L*2)*.12,w.material.emissive.set(A?"#93e9b6":"#ffe0a0")),R&&R.material.color.set(A?"#93e9b6":"#e7c889"),a.forEach(H=>H(L,A))};if(n.shell!=="none"){g(0,-.55,0,25,1,22,"#263638");for(let L=-12;L<12;L++)for(let A=-10;A<11;A++){const H=n.id==="garden"?["#7b816a","#8b8b70","#64745e"]:["#586b6d","#657373","#475b61"];g(L+.5,.06,A+.5,.96,.15,.96,H[Math.floor(_()*3)])}for(let L=-12;L<=12;L+=.8)for(let A=.4;A<3;A+=.4)g(L,A,-10.5,.76,.37,.65,A>2.6?"#a0a18a":"#4d6561");for(let L=-10;L<11;L+=.8)for(const A of[-12,12])Math.abs(L)<2||(g(A,.65,L,.5,1.3,.76,c.dark),g(A,1.35,L,.7,.15,.78,c.stone));for(const L of[-9,-3,3,9]){g(L,4,-13,5,8,4,"#2b4145");for(let A=-1.5;A<2;A+=1)for(let H=3;H<7;H+=1.5)p(L+A,H,-10.96,.45,.7,.04,"#91b4ab",.25)}S(-10,-7),S(10,8)}const x={group:s,obstacles:r,items:o,animated:a,geometry:l,colors:c,material:h,box:g,block:m,glow:p,lamp:S,random:_,def:n,completed:e,environment:f,owned:u,family:v};i(x);let w=null,R=null;if(n.note){const[L,A]=n.note;g(L,.6,A,.8,1.2,.6,c.dark),m(L,A,.8,.6),p(L,1.24,A,.5,.035,.4,"#d4c9a1",.4),o.push({type:"field-note",x:L,z:A,title:"Read the field note",sub:n.noteTitle,body:n.noteBody})}if(n.landmark){const[L,A]=n.landmark;w=p(L,2.5,A,.13,.13,.13,"#ffe0a0",2),R=new ae(new Zs(.8,.84,32),new Fi({color:"#e7c889",side:Yt,transparent:!0,opacity:.65})),R.rotation.x=-Math.PI/2,R.position.set(L,.25,A),s.add(R),o.push({type:"landmark",x:L,z:A,title:n.action,sub:"A small act of restoration"})}const y=lb(n,{group:s,items:o,animated:a});P(0,e);const N=s.children.filter(L=>L.isMesh&&L.geometry===l&&!L.material.transparent&&L.material.emissive?.getHex()===0),U=new Map(f.materialFamilies.map(L=>[L.material,L])),I=new Map,F=[];for(const L of N){const A=U.get(L.material);A?(I.has(A)||I.set(A,[]),I.get(A).push(L)):F.push(L)}const B=(L,A)=>{if(L.length===0)return null;const H=new Li(l,A,L.length);return L.forEach((V,Z)=>{V.updateMatrix(),H.setMatrixAt(Z,V.matrix),H.setColorAt(Z,V.material.color),s.remove(V)}),H.castShadow=H.receiveShadow=!0,s.add(H),H};if(F.length>0||f.materialFamilies.length===0){const L=new Ze({color:"#ffffff",roughness:.62,metalness:.2});u.materials.push(L),B(F,L)}for(const[L,A]of I)L.batch=B(A,L.material);return s.visible=!1,{group:s,obstacles:r,items:o,update:P,setNodeStates:b,screenQuad:x.screenQuad||null,environment:f,ownedResources:{geometries:u.geometries,materials:u.materials,lights:u.lights,dispose:M}}}catch(x){throw M(),x}}function Hh(n){return{current:Pn.some(e=>e.id===n?.current)?n.current:"court",visited:[...new Set(["court",...Array.isArray(n?.visited)?n.visited.filter(e=>Pn.some(t=>t.id===e)):[]])],completed:[...new Set(Array.isArray(n?.completed)?n.completed.filter(e=>Pn.slice(1).some(t=>t.id===e)):[])]}}function fb(n){const{group:e,block:t,box:i,glow:s,material:r,colors:o,random:a,animated:l,geometry:c}=n;i(0,.17,0,5.8,.08,21,"#143c46");const u=new ae(new xn(5.6,20.8),new Ze({color:"#367c88",transparent:!0,opacity:.8,roughness:.13,metalness:.65}));u.rotation.x=-Math.PI/2,u.position.y=.23,e.add(u);for(const h of[-6.15,6.65])t(0,h,5.5,h<0?8.5:7.5);i(0,.21,0,7,.2,3.8,"#8b8d77");for(let h=-3.5;h<4;h+=.6){i(h,.34,0,.54,.09,3.7,"#6d807d");for(const v of[-1.85,1.85])i(h,.85,v,.08,1.1,.08,o.brass)}for(const h of[-1.85,1.85])i(0,1.4,h,7.5,.09,.09,o.brass);for(let h=-9;h<10;h+=.65)for(const v of[-3.1,3.1])i(v,.45,h,.35,.55,.6,"#a6a28b");for(const h of[-8,8]){i(h,1.2,-8,3,2.4,2.2,o.dark),t(h,-8,3,2.2);for(let v=0;v<6;v++)i(h,.5+v*.28,-6.86,2.5,.08,.1,o.brass);i(h,3,-8,.5,2,.5,o.brass)}for(let h=-9;h<10;h+=1.5){const v=s((a()-.5)*4,.245,h,1+a(),.015,.045,"#72b7bd",.35);l.push(g=>{v.position.x=Math.sin(g*.45+h)*1.2})}const f=new nt;f.position.set(7,1.6,-5);const d=new ae(new _a(.55,.07,6,24),r("#c0995d"));f.add(d);for(let h=0;h<6;h++){const v=new ae(c,r("#c0995d"));v.scale.set(.95,.055,.07),v.rotation.z=h*Math.PI/3,f.add(v)}e.add(f),l.push((h,v)=>{f.rotation.z=v?h*.4:0})}function pb(n){const{group:e,block:t,box:i,glow:s,random:r,animated:o}=n,a=new Ze({color:"#b7d9b3",transparent:!0,opacity:.13,metalness:.1,roughness:.3,depthWrite:!1,side:Yt});for(const l of[-1,7])for(let c=-9;c<=-2;c+=1.4)i(l,2.1,c,.1,4.2,.1,"#789184");for(let l=-9;l<=-2;l+=1.4){const c=i(1,4.8,l,4.5,.12,.12,"#96a58b");c.rotation.z=.35;const u=i(5,4.8,l,4.5,.12,.12,"#96a58b");u.rotation.z=-.35}for(const l of[1,5]){const c=i(l,4.8,-5.5,4.25,.03,7.4);c.material=a,c.rotation.z=l===1?.35:-.35}for(const[l,c,u,f]of[[-6,-5,3,5],[3,3.5,5,2],[8,6,2,4]]){i(l,.35,c,u,.6,f,"#9b9270"),i(l,.68,c,u-.2,.1,f-.2,"#414b32"),t(l,c,u,f);for(let d=0;d<50;d++){const h=l+(r()-.5)*(u-.4),v=c+(r()-.5)*(f-.4),g=.4+r()*.7;i(h,.7+g/2,v,.045,g,.045,"#627347");const m=i(h,.8+g,v,.3,.12,.45,["#779455","#94a86a","#536f42"][d%3]);m.rotation.z=r(),d%8===0&&i(h,1+g,v,.16,.14,.16,"#d2b28a")}}for(const l of[-9,9]){i(l,1.1,-7,.35,2.2,.35,"#6b5942"),t(l,-7,1.5,1.5);for(let c=0;c<25;c++)i(l+(r()-.5)*2.5,2+r()*1.7,-7+(r()-.5)*2,.7,.5,.7,["#667c49","#819258","#4e6b47"][c%3])}i(4,.75,-5,2,1.4,1.2,"#a09776"),t(4,-5,2,1.2);for(let l=0;l<6;l++){const c=s(3.3+l*.28,1.55,-5,.1,.18,.2,"#b7ce86",.5);o.push((u,f)=>{c.material.emissiveIntensity=f?1.8+Math.sin(u+l)*.25:.3,c.scale.y=f?.35:.18})}}function mb(n){const{group:e,block:t,box:i,glow:s,material:r,colors:o,animated:a}=n;for(const c of[-5,-7])i(0,.25,c,23,.12,.12,"#9aa5a2");for(let c=-11;c<12;c+=.8)i(c,.17,-6,.24,.16,3.5,"#67584a");i(1,1.65,-6,8,2.7,2.6,"#485e62"),t(1,-6,8,2.6),i(1,3.15,-6,8.4,.3,2.8,"#9b9c87"),i(1,.75,-4.66,8,.27,.08,o.brass);for(let c=-2;c<5;c+=1.25)s(c,2.15,-4.66,.85,.95,.04,"#f3ce89",.5),i(c,2.15,-4.61,.045,.95,.05,o.dark);for(const c of[-2,4])for(const u of[-7.1,-4.9]){const f=new ae(new Rn(.45,.45,.2,12),r("#23363c"));f.rotation.x=Math.PI/2,f.position.set(c,.55,u),e.add(f)}for(const c of[-8,8])i(c,1.85,-2,.18,3.7,.18,o.brass),t(c,-2,.2,.2);i(0,3.8,-2,18,.22,2.4,"#35494f");for(const c of[-5,1]){i(c,.65,3,2.8,.16,.7,"#9b8966"),i(c,1.15,3.35,2.8,.75,.12,"#9b8966");for(const u of[-1,1])i(c+u,.3,3,.12,.6,.6,o.dark);t(c,3,2.8,.9)}i(7,2.3,5,.18,4.6,.18,o.dark),t(7,5,.3,.3);const l=s(7,4.7,5,.7,.65,.7,"#e2b67b",.2);a.push((c,u)=>{l.material.emissiveIntensity=u?2+Math.sin(c*2):.2})}function gb(n){const{group:e,block:t,box:i,glow:s,colors:r,animated:o}=n;for(const c of[-7,-2,3,8])i(c,2.5,-6.5,1.2,5,1.2,"#3b4b4e"),t(c,-6.5,1.2,1.2),i(c,5.2,-6.5,3.6,.6,1.4,"#495f63");i(0,.18,-6.5,22,.12,2,"#182b2e");const a=new ae(new xn(21.8,1.8),new Ze({color:"#2a555e",transparent:!0,opacity:.82,roughness:.15,metalness:.6}));a.rotation.x=-Math.PI/2,a.position.set(0,.24,-6.5),e.add(a),i(6,1.4,-4,2,2.8,1.4,r.dark),t(6,-4,2,1.4);const l=i(6,.8,-3.2,1.2,1.4,.2,r.brass);o.push((c,u)=>{l.position.y=u?1.5+Math.sin(c*.5)*.05:.8});for(const c of[-6,0])i(c,.6,6,2.5,1.2,1.8,"#34474a"),t(c,6,2.5,1.8),i(c,1.3,6,2.2,.2,.2,r.brass)}function vb(n){const{block:e,box:t,glow:i,colors:s,animated:r}=n;for(const[a,l,c,u]of[[-7,-6,3.2,2.6],[-1,-7,2.8,2.2],[8,-7,3,2.4],[-8,6.5,3,2.5],[2,6.5,3.5,2.2]])t(a,1.1,l,c,2.2,u,"#252528"),e(a,l,c,u),t(a,2.3,l,c*.7,.6,u*.7,"#383230"),i(a,2.65,l,c*.35,.1,u*.35,"#f5a438",1.2);t(5,1.2,-4,2.2,2.4,1.6,s.dark),e(5,-4,2.2,1.6);const o=i(5,2.5,-4,.7,.7,.7,"#f7aa74",.8);r.push((a,l)=>{o.material.emissiveIntensity=l?2.5+Math.sin(a*3)*.5:.6,o.rotation.y=l?a*1.5:0})}function _b(n){const{block:e,box:t,glow:i,random:s,animated:r}=n;for(const[a,l,c,u]of[[-7,-6,2.8,2.5],[1,-6.5,3.5,2.2],[-7,6,2.5,2.5],[3,6,3,2]]){t(a,.9,l,c,1.8,u,"#2d271e"),e(a,l,c,u);for(let f=0;f<3;f++){const d=1.2+f*.6;t(a+(f%2===0?.6:-.6),d,l,1.8,.15,1.4,"#5e4334");const h=i(a+(f%2===0?.6:-.6),d+.1,l,1.2,.08,.9,"#7ee8b0",.4);r.push((v,g)=>{h.material.emissiveIntensity=g?1.8+Math.sin(v*2+f)*.4:.4})}}t(6,.8,-5,2,1.6,1.8,"#322d25"),e(6,-5,2,1.8);const o=i(6,1.8,-5,.8,.8,.8,"#85f5bc",.5);r.push((a,l)=>{o.material.emissiveIntensity=l?2.8+Math.sin(a*2.5)*.6:.5,o.scale.setScalar(l?1+Math.sin(a*3)*.08:1)})}function yb(n){const{group:e,block:t,box:i,glow:s,colors:r,animated:o}=n;for(let l=-8;l<=4;l+=3.5){i(l,.28,-6.5,3.2,.3,2.5,"#9ea8ab"),t(l,-6.5,3.2,2.5);const c=new ae(new xn(2.8,2.1),new Ze({color:"#7cd4e2",transparent:!0,opacity:.75,roughness:.1}));c.rotation.x=-Math.PI/2,c.position.set(l,.45,-6.5),e.add(c),i(l,.48,-6.5,1.2,.08,1,"#f0f6f7")}for(const l of[-6,0]){i(l,1.2,6,3,2.4,1.4,"#7a6a57"),t(l,6,3,1.4);for(let c=.5;c<2.2;c+=.5)i(l,c,6,2.8,.08,1.2,"#ded7cb")}i(7,1.2,-4,1.8,2.4,1.8,r.dark),t(7,-4,1.8,1.8);const a=i(7,2.7,-4,.3,.25,2.2,r.brass);o.push((l,c)=>{a.rotation.x=c?Math.sin(l*3)*.2:0})}function xb(n){const{group:e,block:t,box:i,colors:s,animated:r}=n,o=new ae(new xn(23,8),new Ze({color:"#254238",transparent:!0,opacity:.8,roughness:.2}));o.rotation.x=-Math.PI/2,o.position.set(0,.22,-6),e.add(o);for(const[l,c]of[[-8,-6],[-2,-6.5],[3,-6.5]]){i(l,1.2,c,2.4,2.4,2.2,"#3d3226"),t(l,c,2.4,2.2);for(let u=0;u<4;u++){const f=i(l+(u-1.5)*.5,.8,c,.18,1.6,.18,"#4f4030");f.rotation.z=(u-1.5)*.3}}for(const l of[-5,2])i(l,.8,6,3.2,1.6,2,"#485244"),t(l,6,3.2,2);i(6,1.4,-4,2,2.8,1.4,s.dark),t(6,-4,2,1.4);const a=i(6,1.8,-3.2,1.4,1.6,.2,"#7a5a3a");r.push((l,c)=>{a.position.y=c?.8:1.8+Math.sin(l)*.05})}function bb(n){const{block:e,box:t,glow:i,colors:s,animated:r}=n;for(const a of[-8,-2,4])t(a,2.2,-6.5,1.2,4.4,1.2,"#5e3428"),e(a,-6.5,1.2,1.2);t(0,4.5,-6.5,22,.5,1.6,"#3a2018");for(let a=-10;a<=10;a+=1.2)t(a,4.8,-6.5,.3,.2,2.2,"#483c34");for(const a of[-6,0])t(a,.9,6,3.4,1.8,1.8,"#443b35"),e(a,6,3.4,1.8);t(7,2,-4,.4,4,.4,s.dark),e(7,-4,1,1),t(7,4.1,-4,1.8,.3,.3,s.brass);const o=i(7.6,3.2,-4,.08,1.6,.08,"#d9bf82",.6);r.push((a,l)=>{o.rotation.z=l?0:Math.sin(a*1.5)*.06})}function Mb(n){const{block:e,box:t,glow:i,colors:s,animated:r}=n;for(const a of[-7,-1])t(a,2.4,-6.5,3.5,4.8,2.8,"#2d2d33"),e(a,-6.5,3.5,2.8),t(a,4.9,-6.5,2,1.2,2,"#45454d"),i(a,1.1,-5,1.4,.8,.2,"#ff6622",1.8);for(const a of[-6,1])t(a,.7,6,3.6,1.4,1.8,"#3c2b28"),e(a,6,3.6,1.8),i(a,.8,6,2.8,.1,.8,"#8c3d23",.4);t(6,1.1,-4,2.2,2.2,2.2,s.dark),e(6,-4,2.2,2.2);const o=i(6,1.8,-4,1.2,.8,1.2,"#ff8033",.5);r.push((a,l)=>{o.material.emissiveIntensity=l?2.8+Math.sin(a*5)*.4:.5})}function Sb(n){const{block:e,box:t,glow:i,colors:s,animated:r}=n;for(const a of[-8,-2,4])t(a,2.6,-6.5,.35,5.2,.35,"#627585"),e(a,-6.5,1,1),t(a,5.1,-6.5,3.8,.2,.2,"#8ea3b5");for(const a of[-6,0])t(a,1,6,3.2,2,2,"#667480"),e(a,6,3.2,2),t(a,2.05,6,2.8,.12,1.6,"#d8e5ed");t(5,1.4,-5,1.6,2.8,1.6,s.dark),e(5,-5,1.6,1.6);const o=i(5,3,-5,1.4,1.4,.2,"#cce6f5",1.2);r.push((a,l)=>{o.material.emissiveIntensity=l?2.6+Math.sin(a*2)*.4:.6,o.rotation.y=l?a*.5:0})}function Eb(n){const{group:e,block:t,box:i,glow:s,colors:r,animated:o}=n,a=new ae(new xn(22,5.5),new Ze({color:"#2d4345",transparent:!0,opacity:.8,roughness:.2}));a.rotation.x=-Math.PI/2,a.position.set(0,.22,-6.5),e.add(a),i(-4,.8,-6.5,5.5,1.4,2.2,"#483e32"),t(-4,-6.5,5.5,2.2);for(const c of[-6,0])i(c,.7,6,3.4,1.4,1.8,"#594d3f"),t(c,6,3.4,1.8);i(7,2,-4,.4,4,.4,r.dark),t(7,-4,1,1),i(7,4.1,-4,1.2,.2,1.2,r.brass);const l=s(7,4.5,-4,.7,.7,.7,"#e8ca76",.4);o.push((c,u)=>{l.material.emissiveIntensity=u?2.8+Math.sin(c*2)*.5:.4})}function wb(n){const{block:e,box:t,glow:i,colors:s,animated:r}=n;for(const a of[-8,-2,4]){t(a,2.5,-6.5,3.6,5,1.6,"#35363b"),e(a,-6.5,3.6,1.6);for(let l=1;l<4.8;l+=.9){t(a,l,-5.6,3.2,.06,.2,s.brass);for(let c=-1.3;c<1.4;c+=.45)t(a+c,l+.35,-5.6,.35,.65,.15,["#574636","#6e5643","#434739"][c*10%3>>>0])}}for(const a of[-6,1])t(a,.8,6,3.2,1.6,1.8,"#524335"),e(a,6,3.2,1.8),t(a,1.65,6,2.8,.1,1.4,"#7a6652");t(5,1.1,-4,1.6,2.2,1.6,"#42372c"),e(5,-4,1.6,1.6),t(5,2.3,-4,.1,.6,.1,s.brass);const o=i(5,2.8,-4,.6,.6,.6,"#ffd580",.3);r.push((a,l)=>{o.material.emissiveIntensity=l?2.5+Math.sin(a*1.5)*.2:.3})}function Tb(n){const{block:e,box:t,glow:i,colors:s,animated:r}=n;for(const a of[-7,-1])t(a,1.8,-6.5,3.4,3.6,2.8,"#8c4832"),e(a,-6.5,3.4,2.8),t(a,3.8,-6.5,2,.8,1.8,"#aa583e"),i(a,1.2,-5,.8,.8,.2,"#ffaa44",.6);for(const a of[-6,1]){t(a,.8,6,3.2,1.6,1.8,"#9c5a43"),e(a,6,3.2,1.8);for(let l=-1;l<=1;l+=.8)t(a+l,1.8,6,.45,.6,.45,"#bd6b51")}t(6,1.2,-4,1.8,2.4,1.8,s.dark),e(6,-4,1.8,1.8);const o=i(6,2.7,-4,1.4,1.4,.18,"#ffe0a0",.6);r.push((a,l)=>{o.rotation.x=l?Math.sin(a*.4)*.2:0,o.material.emissiveIntensity=l?2.8+Math.sin(a*2)*.4:.6})}const Ab={court:zx,canal:fb,garden:pb,station:mb,aqueduct:gb,caldera:vb,understory:_b,saltworks:yb,rooftops:Gx,"desert-camp":Vx,mangrove:xb,trestle:bb,foundry:Mb,"frost-spire":Sb,delta:Eb,archives:wb,"kiln-terrace":Tb,theater:Xx};for(const[n,e]of Object.entries(Ab))qx(n,e);function Cb(n,e=!1){return db(n,{completed:e})}const zh={market:{id:"market",minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3,spawn:[0,3],exitGarden:[10.7,0]},garden:{id:"garden",minX:-11.5,maxX:11.5,minZ:-10,maxZ:10.5,spawn:[-9.5,0],exitMarket:[-10.7,0]}},ff=new Map;for(const n of Pn)n.bounds&&ff.set(n.id,n);const Vh=(n,e,t)=>n.exits?.find(i=>i.id===e)?.position??t;function pf(n){if(!n||n==="market")return zh.market;if(n.startsWith("garden:")||n==="garden")return zh.garden;const e=ff.get(n);return e?{id:n,minX:e.bounds.minX,maxX:e.bounds.maxX,minZ:e.bounds.minZ,maxZ:e.bounds.maxZ,spawn:e.spawn??[-9,0],exitWest:Vh(e,"west",[-10.7,0]),exitEast:Vh(e,"east",[10.7,0])}:{id:n,minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3,spawn:[-9,0],exitWest:[-10.7,0],exitEast:[10.7,0]}}function la(n,e,t,i){if(t<=n.minX||t>=n.maxX||i<=n.minZ||i>=n.maxZ)return!1;for(let s=0;s<e.length;s++){const r=e[s];if(Math.abs(t-r.x)<r.w&&Math.abs(i-r.z)<r.d)return!1}return!0}function Rb(n,e,t){return{x:Math.max(n.minX+.35,Math.min(n.maxX-.35,e)),z:Math.max(n.minZ+.35,Math.min(n.maxZ-.35,t))}}function Pb(n,e,t,i={x:24,y:24,w:106,h:72}){const s=(e-n.minX)/(n.maxX-n.minX),r=(t-n.minZ)/(n.maxZ-n.minZ);return{cx:i.x+Math.max(0,Math.min(1,s))*i.w,cy:i.y+Math.max(0,Math.min(1,r))*i.h}}function Ib(n){return yn[n]||Zi[n]||null}function Lb(n,e="B",t=1){const i=Ib(n);if(!i)return 0;const s=Nx[e]??1;return Math.max(1,Math.round(i.basePrice*t*s*.85))}function Db(n,e=1){const t=yn[n];if(!t)return 0;const i=1+(e-1)*.4;return Math.max(1,Math.round(t.seedCost*i))}class Nb{constructor(e,t={}){this.client=e,this.onAction=t,this.hudPolicyProvider=null,this.selectedCropId="radish",this.activeTool="hands",this.selectedSeed="radish",this.lastMachines={mill:{status:"broken",required:{...lf},contributed:{copper:0,timber:0,glass:0},restoredAt:null}},this.initDOM()}initDOM(){this.createMarketDialog(),this.createSeedDialog(),this.createContractDialog(),this.createInventoryDialog(),this.createProfileDialog(),this.createMachineShopDialog(),this.setupEventListeners()}createMarketDialog(){const e=document.createElement("dialog");e.id="market-dialog",e.className="game-modal",e.innerHTML=`
      <div class="micro modal-header-tag">TOWN COMMERCE · LIVE SPOT & ORDER BOOK</div>
      <h2>Market Exchange Board</h2>
      <p class="modal-sub">Trade graded produce with town merchants and other gardeners.</p>
      
      <div class="market-tabs" id="market-crop-tabs"></div>
      
      <div class="market-main-grid">
        <div class="market-spot-card panel">
          <div class="micro">SPOT TRADING</div>
          <h3 id="spot-crop-name">Red Radish</h3>
          <p id="spot-crop-tagline">Crisp peppery roots</p>
          <div class="spot-price-row">
            <div>
              <span class="micro">INSTANT BID</span>
              <strong id="spot-instant-bid">7 ⛁</strong>
            </div>
            <div>
              <span class="micro">BASE EQUILIBRIUM</span>
              <span id="spot-base-price">8 ⛁</span>
            </div>
            <div>
              <span class="micro">MARKET DEMAND</span>
              <span id="spot-multiplier">1.00x</span>
            </div>
          </div>
          
          <div class="sell-controls">
            <label class="micro">SELECT HARVEST GRADE & QTY TO SELL</label>
            <div class="quality-selector" id="sell-quality-selector">
              <button data-qual="C">Grade C</button>
              <button data-qual="B" class="active">Grade B</button>
              <button data-qual="A">Grade A</button>
              <button data-qual="A+">Grade A+</button>
            </div>
            <div class="qty-row">
              <span>Owned: <b id="sell-owned-qty">0</b></span>
              <input type="number" id="sell-qty-input" min="1" max="99" value="1">
              <button id="btn-instant-sell" class="action-btn">Sell to Market →</button>
            </div>
          </div>
        </div>

        <div class="orderbook-card panel">
          <div class="micro">ORDER BOOK (DOUBLE AUCTION)</div>
          <div class="orderbook-split">
            <div class="orderbook-col">
              <span class="micro asks-title">SELL ASKS (LOWEST FIRST)</span>
              <div id="orderbook-asks" class="book-list"></div>
            </div>
            <div class="orderbook-col">
              <span class="micro bids-title">BUY BIDS (HIGHEST FIRST)</span>
              <div id="orderbook-bids" class="book-list"></div>
            </div>
          </div>
          
          <div class="create-order-box">
            <div class="micro">POST LIMIT ORDER (2% FEE)</div>
            <div class="order-form-row">
              <select id="order-side"><option value="sell">SELL</option><option value="buy">BUY</option></select>
              <input type="number" id="order-price" placeholder="Price" min="1" value="10">
              <input type="number" id="order-qty" placeholder="Qty" min="1" value="2">
              <button id="btn-create-order">Post Order</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button id="close-market" class="btn-secondary">Close Market Board →</button>
      </div>
    `,document.body.append(e)}createSeedDialog(){const e=document.createElement("dialog");e.id="seed-dialog",e.className="game-modal",e.innerHTML=`
      <div class="micro modal-header-tag">TOWN SEED MERCHANT</div>
      <h2>Local Seed & Sprout Catalog</h2>
      <p class="modal-sub">Purchase fresh seed packets for your garden beds.</p>
      <div class="seed-grid" id="seed-catalog-list"></div>
      <div class="modal-footer">
        <button id="close-seed-dialog" class="btn-secondary">Close Seed Catalog →</button>
      </div>
    `,document.body.append(e)}createContractDialog(){const e=document.createElement("dialog");e.id="contract-dialog",e.className="game-modal",e.innerHTML=`
      <div class="micro modal-header-tag">TOWN NOTICEBOARD</div>
      <h2>Restaurant & Kitchen Contracts</h2>
      <p class="modal-sub">Supply local establishments with high-quality produce for coins, reputation, and XP.</p>
      <div class="contracts-list" id="contracts-container"></div>
      <div class="modal-footer">
        <button id="close-contracts" class="btn-secondary">Close Noticeboard →</button>
      </div>
    `,document.body.append(e)}createInventoryDialog(){const e=document.createElement("dialog");e.id="inventory-dialog",e.className="game-modal",e.innerHTML=`
      <div class="micro modal-header-tag">GARDENER’S SATCHEL</div>
      <h2>Inventory & Harvests</h2>
      <p class="modal-sub" id="inv-player-summary"></p>
      <div class="inventory-sections">
        <div>
          <h3 class="micro">SEEDS & PROPAGATION</h3>
          <div id="inv-seeds-list" class="inv-grid"></div>
        </div>
        <div>
          <h3 class="micro">HARVESTED PRODUCE</h3>
          <div id="inv-produce-list" class="inv-grid"></div>
        </div>
        <div>
          <h3 class="micro">MATERIALS & TOOLS</h3>
          <div id="inv-materials-list" class="inv-grid"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="close-inventory" class="btn-secondary">Close Satchel →</button>
      </div>
    `,document.body.append(e)}createMachineShopDialog(){const e=document.createElement("dialog");e.id="machine-shop-dialog",e.className="game-modal",e.innerHTML=`
      <div class="micro modal-header-tag">MARKET COURT · MACHINE SHOP</div>
      <h2>The Great Mill</h2>
      <p class="modal-sub">A communal machine of the court. Restore it together — once turning, it grinds wheat into flour for everyone.</p>
      <div class="machine-grid">
        <div class="panel machine-card">
          <div class="micro">RESTORATION PROGRESS</div>
          <div id="mill-progress-summary"></div>
          <div id="mill-material-rows"></div>
        </div>
        <div class="panel machine-card">
          <div class="micro">MACHINE SHOP SERVICES</div>
          <div id="mill-flour-box"></div>
          <div id="sprinkler-craft-box"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="close-machine-shop" class="btn-secondary">Leave the Machine Shop →</button>
      </div>
    `,document.body.append(e)}openMachineShop(){this.updateMachineShopView(),document.getElementById("machine-shop-dialog").showModal()}createProfileDialog(){const e=document.createElement("dialog");e.id="profile-dialog",e.className="game-modal",e.innerHTML=`
      <div class="micro modal-header-tag">GARDENER IDENTITY</div>
      <h2>Gardener Pass</h2>
      <p class="modal-sub" id="profile-player-summary"></p>
      <p>Your identity is stored permanently on the server via your persistent token.</p>
      <label>Nickname: <input type="text" id="profile-nick-input" maxlength="20"></label>
      <button id="btn-save-nickname" class="action-btn">Update Nickname</button>
      <div class="modal-footer">
        <button id="close-profile" class="btn-secondary">Close →</button>
      </div>
    `,document.body.append(e)}setupEventListeners(){const e=document.getElementById("market-crop-tabs");e.innerHTML="";const t=[...yc,...Fx];for(const i of t){const s=document.createElement("button");s.className=`crop-tab ${i.id===this.selectedCropId?"active":""}`,s.textContent=i.name,s.onclick=()=>{this.selectedCropId=i.id,document.querySelectorAll(".crop-tab").forEach(r=>r.classList.remove("active")),s.classList.add("active"),this.updateMarketView()},e.append(s)}document.querySelectorAll("#sell-quality-selector button").forEach(i=>{i.onclick=()=>{document.querySelectorAll("#sell-quality-selector button").forEach(s=>s.classList.remove("active")),i.classList.add("active"),this.updateMarketView()}}),document.getElementById("btn-instant-sell").onclick=()=>{const i=!!Zi[this.selectedCropId],s=document.querySelector("#sell-quality-selector button.active"),r=i?"B":s?s.dataset.qual:"B",o=parseInt(document.getElementById("sell-qty-input").value,10)||1;this.client.sendMarketSell(this.selectedCropId,r,o)},document.getElementById("btn-create-order").onclick=()=>{const i=document.getElementById("order-side").value,s=parseFloat(document.getElementById("order-price").value)||10,r=parseInt(document.getElementById("order-qty").value,10)||1;this.client.sendOrderPlace(i,this.selectedCropId,s,r,"B")},document.getElementById("close-market").onclick=()=>document.getElementById("market-dialog").close(),document.getElementById("close-seed-dialog").onclick=()=>document.getElementById("seed-dialog").close(),document.getElementById("close-contracts").onclick=()=>document.getElementById("contract-dialog").close(),document.getElementById("close-inventory").onclick=()=>document.getElementById("inventory-dialog").close(),document.getElementById("close-profile").onclick=()=>document.getElementById("profile-dialog").close(),document.getElementById("close-machine-shop").onclick=()=>document.getElementById("machine-shop-dialog").close();for(const i of["market-dialog","inventory-dialog"])document.getElementById(i)?.addEventListener("close",()=>this.onAction.onLegacyDialogClosed?.());document.getElementById("btn-save-nickname").onclick=()=>{const i=document.getElementById("profile-nick-input").value.trim();i&&(this.client.setNickname(i),document.getElementById("profile-dialog").close())}}openMarket(){this.updateMarketView(),this.labelLegacyDialog("market-dialog","TOWN COMMERCE · LIVE SPOT & ORDER BOOK"),document.getElementById("market-dialog").showModal()}openSeedVendor(){this.updateSeedVendorView(),document.getElementById("seed-dialog").showModal()}openContracts(){this.updateContractsView(),document.getElementById("contract-dialog").showModal()}openInventory(){this.updateInventoryView(),this.labelLegacyDialog("inventory-dialog","GARDENER’S SATCHEL"),document.getElementById("inventory-dialog").showModal()}labelLegacyDialog(e,t){const i=document.querySelector(`#${e} .modal-header-tag`);if(!i)return;const s=this.hudPolicyProvider?.()?.context==="social";i.textContent=s?`OPTIONAL LEGACY · ${t}`:t}openProfile(){document.getElementById("profile-nick-input").value=this.client.nickname,document.getElementById("profile-dialog").showModal()}updateMachineShopView(e=null){e&&(this.lastMachines=e);const t=this.lastMachines?.mill,i=document.getElementById("mill-progress-summary"),s=document.getElementById("mill-material-rows"),r=document.getElementById("mill-flour-box"),o=document.getElementById("sprinkler-craft-box");if(!i||!s||!t)return;const a=this.lastPlayer,l=a?.materials||{};if(t.status==="restored")i.innerHTML=`
        <strong class="mill-restored-line">✦ The Great Mill is turning.</strong>
        <p>Restored by the community. It grinds wheat into flour for everyone, permanently.</p>
      `,s.innerHTML="";else{let h=0,v=0,g="";for(const m of Dh){const p=t.required?.[m.id]||0,S=Math.min(t.contributed?.[m.id]||0,p);h+=S,v+=p;const E=l[m.id]||0,_=p-S,M=E>0&&_>0?`<button class="btn-contribute" data-material="${m.id}" data-qty="1">Give 1</button>
             <button class="btn-contribute" data-material="${m.id}" data-qty="${Math.min(E,_)}">Give all</button>`:"";g+=`
          <div class="mill-material-row">
            <span class="mill-mat-name">${m.name}</span>
            <span class="mill-mat-count">${S} / ${p}</span>
            <span class="mill-mat-held">satchel: ${E}</span>
            ${M}
          </div>`}i.innerHTML=`
        <strong>The Great Mill is broken.</strong>
        <p>Community restoration: ${h} / ${v} materials delivered.</p>
      `,s.innerHTML=g}if(s.querySelectorAll(".btn-contribute").forEach(h=>{h.onclick=()=>{this.client.send(ge.MACHINE_CONTRIBUTE,{actionId:this.nextActionId(),material:h.dataset.material,quantity:parseInt(h.dataset.qty,10)||1})}}),t.status==="restored"){const v=["C","B","A","A+"].reduce((p,S)=>p+(a?.inventory?.produce?.[`wheat_${S}`]||0),0),g=a?.inventory?.produce?.flour_B||0;r.innerHTML=`
        <div class="micro">MILLING · WHEAT → FLOUR (1:1)</div>
        <p class="machine-hint">Wheat in satchel: ${v} · Flour: ${g}</p>
        <div class="order-form-row">
          <input type="number" id="mill-qty-input" min="1" max="99" value="1">
          <button id="btn-mill-flour" class="action-btn"${v<=0?" disabled":""}>Mill Flour</button>
        </div>
      `;const m=r.querySelector("#btn-mill-flour");m&&(m.onclick=()=>{const p=parseInt(document.getElementById("mill-qty-input").value,10)||1;this.client.send(ge.MACHINE_MILL,{actionId:this.nextActionId(),quantity:p})})}else r.innerHTML=`
        <div class="micro">MILLING</div>
        <p class="machine-hint">The millstones wait. Restore the mill to grind wheat into flour.</p>
      `;const c=Object.entries(Rs.cost).map(([h,v])=>`${v}× ${Zc[h].name}`).join(" + "),u=Object.entries(Rs.cost).map(([h,v])=>`${l[h]||0}/${v}`).join(" · "),f=Object.entries(Rs.cost).every(([h,v])=>(l[h]||0)>=v);o.innerHTML=`
      <div class="micro">CRAFT · ${Rs.name}</div>
      <p class="machine-hint">Cost: ${c}. Keeps covered beds watered on their own. (satchel: ${u})</p>
      <button id="btn-craft-sprinkler" class="action-btn"${f?"":" disabled"}>Craft Sprinkler Kit</button>
    `;const d=o.querySelector("#btn-craft-sprinkler");d&&(d.onclick=()=>{this.client.send(ge.MACHINE_CRAFT,{actionId:this.nextActionId(),fixture:Rs.id})})}nextActionId(){return`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`}updateMarketView(e=null,t=null){e&&(this.lastPrices=e),t&&(this.lastOrderBook=t);const i=yn[this.selectedCropId]||Zi[this.selectedCropId];if(!i)return;const s=!!Zi[this.selectedCropId];document.getElementById("spot-crop-name").textContent=i.name,document.getElementById("spot-crop-tagline").textContent=i.tagline;const r=this.lastPrices?this.lastPrices[i.id]:null,o=r?r.multiplier:1,a=document.querySelector("#sell-quality-selector button.active"),l=s?"B":a?a.dataset.qual:"B",c=Lb(i.id,l,o);document.getElementById("spot-instant-bid").textContent=`${c} ⛁`,document.getElementById("spot-base-price").textContent=`${i.basePrice} ⛁`,document.getElementById("spot-multiplier").textContent=`${o.toFixed(2)}x`;const u=this.lastPlayer;let f=0;u&&u.inventory&&u.inventory.produce&&(f=u.inventory.produce[`${i.id}_${l}`]||0),document.getElementById("sell-owned-qty").textContent=f;const d=document.getElementById("orderbook-asks"),h=document.getElementById("orderbook-bids");if(d.innerHTML="",h.innerHTML="",this.lastOrderBook){const v=this.lastOrderBook.asks?.filter(m=>m.cropId===i.id)||[],g=this.lastOrderBook.bids?.filter(m=>m.cropId===i.id)||[];if(v.length===0)d.innerHTML='<div class="empty-book">No active asks</div>';else for(const m of v){const p=document.createElement("div");p.className="book-row ask-row",p.innerHTML=`<span>${m.quantity}x</span> <strong>${m.price} ⛁</strong>`,d.append(p)}if(g.length===0)h.innerHTML='<div class="empty-book">No active bids</div>';else for(const m of g){const p=document.createElement("div");p.className="book-row bid-row",p.innerHTML=`<span>${m.quantity}x</span> <strong>${m.price} ⛁</strong>`,h.append(p)}}}updateSeedVendorView(){const e=document.getElementById("seed-catalog-list");e.innerHTML="";for(const t of yc){const i=document.createElement("div");i.className="seed-card panel";const s=this.lastPrices&&this.lastPrices[t.id]?this.lastPrices[t.id].multiplier:1,r=Db(t.id,s);i.innerHTML=`
        <div class="micro">GROWTH: ${t.growDuration}S · YIELD: ${t.yield}x</div>
        <strong>${t.name}</strong>
        <p>${t.tagline}</p>
        <div class="seed-card-footer">
          <b>${r} ⛁</b>
          <button data-crop="${t.id}" class="btn-buy-seed">Buy Seed Packet</button>
        </div>
      `,i.querySelector(".btn-buy-seed").onclick=()=>{this.client.sendMarketBuy(t.id,1)},e.append(i)}}updateContractsView(e=null){e&&(this.lastContracts=e);const t=document.getElementById("contracts-container");t.innerHTML="";const i=this.lastContracts||[];if(i.length===0){t.innerHTML="<p>No active restaurant contracts at this moment. Check back soon!</p>";return}for(const s of i){const r=document.createElement("div");r.className="contract-card panel",r.innerHTML=`
        <div class="contract-head">
          <span class="micro">${s.client.toUpperCase()}</span>
          <span class="contract-reward">+${s.reward} ⛁ · +${s.reputation} ★ · +${s.xp} XP</span>
        </div>
        <strong>Order: ${s.quantity}x ${s.cropName} (Min Grade ${s.minQuality})</strong>
        <button data-id="${s.id}" class="btn-fulfill-contract">Deliver Order →</button>
      `,r.querySelector(".btn-fulfill-contract").onclick=()=>{this.client.sendContractComplete(s.id)},t.append(r)}}updateInventoryView(e=null){e&&(this.lastPlayer=e);const t=document.getElementById("inv-seeds-list"),i=document.getElementById("inv-produce-list"),s=document.getElementById("inv-materials-list");t.innerHTML="",i.innerHTML="",s.innerHTML="";const r=this.lastPlayer;if(!r||!r.inventory)return;const o=r.inventory.seeds||{},a=Object.entries(o).filter(([h,v])=>v>0);if(a.length===0)t.innerHTML='<div class="empty-msg">No seeds in satchel</div>';else for(const[h,v]of a){const g=yn[h],m=document.createElement("div");m.className="inv-item",m.innerHTML=`<strong>${g?.name||h}</strong> <span>${v} packets</span>`,m.onclick=()=>{this.selectedSeed=h,this.activeTool="seed",this.onAction.onSelectTool?.("seed",h),document.getElementById("inventory-dialog").close()},t.append(m)}const l=r.inventory.produce||{},c=Object.entries(l).filter(([h,v])=>v>0);if(c.length===0)i.innerHTML='<div class="empty-msg">No harvested produce</div>';else for(const[h,v]of c){const[g,m]=h.split("_"),p=yn[g]||Zi[g],S=!!Zi[g],E=document.createElement("div");E.className="inv-item",E.innerHTML=`<strong>${p?.name||g}</strong> ${S?"":`<span class="badge-grade">Grade ${m}</span>`} <span>${v} units</span>`,i.append(E)}const u=r.materials||{},f=Dh.map(h=>[h,u[h.id]||0]).filter(([,h])=>h>0),d=r.inventory.sprinklers||0;if(f.length===0&&d<=0)s.innerHTML='<div class="empty-msg">No materials yet — gather them in the outer districts</div>';else{for(const[h,v]of f){const g=document.createElement("div");g.className="inv-item",g.innerHTML=`<strong>${h.name}</strong> <span>${v} units</span>`,s.append(g)}if(d>0){const h=document.createElement("div");h.className="inv-item",h.innerHTML=`<strong>${Rs.name} kit</strong> <span>${d} ready — place on a bed (tool 6)</span>`,s.append(h)}}}describePlayerProgress(e){return e?`${e.coins} ⛁ · Lvl ${e.level||1} · ${e.xp||0} XP · ${e.reputation||10} ★`:""}updatePlayerHUD(e){this.lastPlayer=e;const t=document.getElementById("hud-coins"),i=document.getElementById("hud-rep"),s=document.getElementById("hud-xp"),r=document.getElementById("hud-nick");t&&(t.textContent=`${e.coins} ⛁`),i&&(i.textContent=`${e.reputation||10} ★`),s&&(s.textContent=`Lvl ${e.level||1} · ${e.xp||0} XP`),r&&(r.textContent=e.nickname);const o=this.hudPolicyProvider?.()??null,a=document.querySelector(".player-stats-row");a&&o&&(a.hidden=!o.sections.economyStats);const l=this.describePlayerProgress(e),c=document.getElementById("inv-player-summary");c&&(c.textContent=l);const u=document.getElementById("profile-player-summary");u&&(u.textContent=l)}}const Ub=200,gl="afterlight-chat-size",vl=280,_l=120,Ob=640,Fb=560;function Ps(n,e,t){return Math.max(e,Math.min(t,n))}class kb{constructor(e,{onFocusChange:t=null}={}){this.net=e,this.onFocusChange=t,this.collapsed=!1,this.unread=0,this.panel=document.getElementById("chat-panel"),this.log=document.getElementById("chat-log"),this.toggle=document.getElementById("chat-toggle"),this.unreadBadge=document.getElementById("chat-unread"),this.form=document.getElementById("chat-form"),this.input=document.getElementById("chat-input"),this.sendBtn=document.getElementById("chat-send"),this.handle=document.getElementById("chat-resize"),this.connected=!1,!(!this.panel||!this.log)&&(this.toggle.addEventListener("click",()=>this.setCollapsed(!this.collapsed)),this.input.addEventListener("focus",()=>this.onFocusChange?.(!0)),this.input.addEventListener("blur",()=>this.onFocusChange?.(!1)),this.input.addEventListener("keydown",i=>{if(i.stopPropagation(),i.code==="Escape"){i.preventDefault(),this.input.blur();return}i.code==="Enter"&&(i.preventDefault(),this.submit(i.shiftKey))}),this.form.addEventListener("submit",i=>{i.preventDefault(),this.submit(i.shiftKey||document.activeElement!==this.input)}),this.net.on(ge.CHAT_HISTORY,i=>this.setHistory(i.messages||[])),this.net.on(ge.CHAT_MESSAGE,i=>this.addMessage(i)),this.net.on(ge.CHAT_DM,i=>this.addDM(i)),this.net.on(ge.CHAT_PRESENCE,i=>this.addPresence(i)),this.net.on(ge.CHAT_ERROR,i=>this.addError(i)),this.net.onDisconnect(()=>this.setConnected(!1)),this.net.onConnect(()=>this.setConnected(!0)),this.setConnected(this.net.connected),this.#u())}setConnected(e){const t=this.connected;this.connected=e,this.input&&(this.input.disabled=!e,this.sendBtn.disabled=!e,this.input.placeholder=e?"Say hello… (Enter to chat, Esc to release)":"The relay is quiet — reconnecting…",t&&!e&&this.addSystemLine("The town relay is out of reach."))}setCollapsed(e){this.collapsed=e,this.panel.classList.toggle("collapsed",e),this.toggle.setAttribute("aria-expanded",String(!e)),e||this.#p()}focusInput(e=""){if(!this.connected){this.setCollapsed(!1),this.input.focus();return}this.setCollapsed(!1),e&&(this.input.value=e),this.input.focus()}submit(e=!1){const t=this.input.value.trim();this.input.value="",t&&this.connected&&(this.net.sendChat(t),e||this.input.blur())}setHistory(e){this.log.textContent="";for(const t of e)this.addMessage(t,{fromHistory:!0});this.#c(!0)}addMessage(e){if((e.fromKind||"player")==="system"){this.addSystemLine(e.text);return}const i=this.#t(e);e.action?i.appendChild(this.#e("chat-body chat-action",`${e.from} ${Gh(e.text)}`)):(i.appendChild(this.#e("chat-nick",e.from)),i.appendChild(this.#e("chat-body",e.text))),this.#n(i,e.from===this.net.nickname)}addDM(e){const t=this.#t(e),i=e.echo||e.from===this.net.nickname,s=i?e.to:e.from;t.appendChild(this.#e("chat-nick",i?`to ${s}`:`from ${s}`)),t.appendChild(this.#e("chat-body",e.action?`${e.from} ${Gh(e.text)}`:e.text)),this.#n(t,i,"dm")}addPresence(e){const t=e.event==="join"?"steps into the town channel":" drifts away from it",i=e.fromKind==="irc"?" (relay)":"";this.addSystemLine(`${e.who}${i}${t}.`)}addError(e){const t=this.#t({ts:Date.now()});t.appendChild(this.#e("chat-body chat-error",e.message)),this.#n(t,!1,"error")}addSystemLine(e){const t=this.#t({ts:Date.now()});t.appendChild(this.#e("chat-body chat-system",e)),this.#n(t,!1,"system")}#u(){if(!this.handle)return;this.sizeMedia=window.matchMedia("(max-width: 900px)"),this.#a(),this.sizeMedia.addEventListener("change",()=>this.#a()),window.addEventListener("resize",()=>this.#a());let e=null;const t=s=>{if(!e)return;s.preventDefault();const r=Ps(e.w-(s.clientX-e.x),vl,this.#i()),o=Ps(e.h-(s.clientY-e.y),_l,this.#s());this.#r(r,o)},i=()=>{e&&(e=null,window.removeEventListener("pointermove",t),window.removeEventListener("pointerup",i),window.removeEventListener("pointercancel",i),this.#l(this.#o()))};this.handle.addEventListener("pointerdown",s=>{if(!(this.sizeMedia.matches||this.collapsed)){s.preventDefault(),e={x:s.clientX,y:s.clientY,w:this.panel.getBoundingClientRect().width,h:this.log.getBoundingClientRect().height};try{this.handle.setPointerCapture(s.pointerId)}catch{}window.addEventListener("pointermove",t),window.addEventListener("pointerup",i),window.addEventListener("pointercancel",i)}}),this.handle.addEventListener("dblclick",()=>this.#d()),this.handle.addEventListener("keydown",s=>{if(this.sizeMedia.matches||this.collapsed)return;const r=s.shiftKey?8:28,o=this.#o();let a=o.w,l=o.h;if(s.code==="ArrowLeft")a+=r;else if(s.code==="ArrowRight")a-=r;else if(s.code==="ArrowUp")l+=r;else if(s.code==="ArrowDown")l-=r;else return;s.preventDefault(),this.#r(Ps(a,vl,this.#i()),Ps(l,_l,this.#s())),this.#l(this.#o())})}#i(){return Math.min(Ob,window.innerWidth-380)}#s(){return Math.min(Fb,window.innerHeight-260)}#r(e,t){this.panel.style.width=`${Math.round(e)}px`,this.log.style.height=`${Math.round(t)}px`}#o(){return{w:this.panel.getBoundingClientRect().width,h:this.log.getBoundingClientRect().height}}#a(){const e=this.#h();if(this.sizeMedia.matches||!e){this.panel.style.width="",this.log.style.height="";return}this.#r(Ps(e.w,vl,this.#i()),Ps(e.h,_l,this.#s()))}#h(){try{const e=localStorage.getItem(gl);if(!e)return null;const t=JSON.parse(e);return!t||!Number.isFinite(t.w)||!Number.isFinite(t.h)?null:t}catch{return null}}#l(e){try{localStorage.setItem(gl,JSON.stringify({w:Math.round(e.w),h:Math.round(e.h)}))}catch{}}#d(){try{localStorage.removeItem(gl)}catch{}this.panel.style.width="",this.log.style.height=""}#t(e={}){const t=document.createElement("div");t.className="chat-line";const i=e.ts?new Date(e.ts):new Date,s=String(i.getHours()).padStart(2,"0"),r=String(i.getMinutes()).padStart(2,"0");return t.appendChild(this.#e("chat-time",`${s}:${r}`)),t}#e(e,t){const i=document.createElement("span");return i.className=e,i.textContent=t,i}#n(e,t,i=""){for(i&&e.classList.add(i),t&&e.classList.add("self"),this.log.appendChild(e);this.log.childElementCount>Ub;)this.log.firstChild.remove();this.#c(),this.collapsed&&this.#f()}#c(e=!1){const t=this.log.scrollHeight-this.log.scrollTop-this.log.clientHeight<48;(e||t)&&(this.log.scrollTop=this.log.scrollHeight)}#f(){this.unread+=1,this.unreadBadge.hidden=!1,this.unreadBadge.textContent=String(this.unread)}#p(){this.unread=0,this.unreadBadge.hidden=!0,this.unreadBadge.textContent=""}}function Gh(n){return String(n??"").replace(/^\u0001ACTION /,"").replace(/\u0001$/,"")}class Bb{constructor(e,{onStateChange:t=null,onParticipantsChange:i=null,onError:s=null}={}){this.net=e,this.onStateChange=t,this.onParticipantsChange=i,this.onError=s,this.callId=null,this.status="idle",this.channel=null,this.grant=null,this.turn=null,this.expiresAt=null,this.localStream=null,this.screenStream=null,this.peerConnections=new Map,this.participants=new Map,this.audioMuted=!1,this.videoMuted=!1,this.sharingScreen=!1,this.captureDeclined=!1,this.reconnectTimer=null,this.reconnectGraceMs=3e4}setStatus(e,t={}){this.status=e,this.onStateChange?.(e,t)}async joinCall(e,{audio:t=!0,video:i=!1}={}){if(!(this.status==="connected"||this.status==="joining")){if(this.callId=e,this.setStatus("joining"),this.captureDeclined=!1,(t||i)&&await this.requestCapture({audio:t,video:i}),!this.net.joinCallChannel){this.setStatus("error",{reason:"transport_unsupported"}),this.onError?.(new Error("Conferencing requires Phoenix gateway transport"));return}if(this.channel=this.net.joinCallChannel(e),!this.channel){this.setStatus("error",{reason:"channel_join_failed"});return}this.channel.on("participant_joined",s=>this.handleParticipantJoined(s)),this.channel.on("participant_left",s=>this.handleParticipantLeft(s)),this.channel.on("participant_muted",s=>this.handleParticipantMuted(s)),this.channel.on("signal",s=>this.handleSignal(s)),this.channel.on("grant_revoked",s=>this.handleGrantRevoked(s)),this.channel.join().receive("ok",s=>{this.grant=s.grant,this.turn=s.turn,this.expiresAt=s.expires_at,this.participants.clear(),(s.participants||[]).forEach(r=>{this.participants.set(r.player_id,r)}),this.setStatus("connected",{callId:this.callId,grant:this.grant,turn:this.turn,captureDeclined:this.captureDeclined}),this.onParticipantsChange?.(Array.from(this.participants.values())),this.participants.forEach(r=>{r.player_id!==this.net.guestId&&this.createPeerConnection(r.player_id,!0)})}).receive("error",s=>{const r=s?.reason||"join_rejected";this.setStatus("error",{reason:r}),this.onError?.(new Error(`Call join rejected: ${r}`))})}}async requestCapture({audio:e=!0,video:t=!1}){if(typeof navigator>"u"||!navigator.mediaDevices?.getUserMedia)return this.captureDeclined=!0,null;try{const i=await navigator.mediaDevices.getUserMedia({audio:e,video:t});return this.localStream=i,this.audioMuted=!e,this.videoMuted=!t,i}catch(i){return console.warn("Capture permission declined or unavailable, proceeding subscribe-only:",i.message),this.captureDeclined=!0,null}}leaveCall(){if(this.channel){try{this.channel.push("leave",{}),this.channel.leave()}catch{}this.channel=null}this.stopAllMedia(),this.participants.clear(),this.onParticipantsChange?.([]),this.setStatus("idle")}stopAllMedia(){this.localStream&&(this.localStream.getTracks().forEach(e=>e.stop()),this.localStream=null),this.screenStream&&(this.screenStream.getTracks().forEach(e=>e.stop()),this.screenStream=null),this.peerConnections.forEach(e=>e.close()),this.peerConnections.clear(),this.sharingScreen=!1}setAudioMute(e){this.audioMuted=e,this.localStream&&this.localStream.getAudioTracks().forEach(t=>{t.enabled=!e}),this.channel&&this.channel.push("mute",{kind:"audio",muted:e})}async setVideoMute(e){this.videoMuted=e,!e&&(!this.localStream||this.localStream.getVideoTracks().length===0)?await this.requestCapture({audio:!this.audioMuted,video:!0}):this.localStream&&this.localStream.getVideoTracks().forEach(t=>{t.enabled=!e}),this.channel&&this.channel.push("mute",{kind:"video",muted:e})}async startScreenShare(){if(!(typeof navigator>"u"||!navigator.mediaDevices?.getDisplayMedia))try{const e=await navigator.mediaDevices.getDisplayMedia({video:!0});this.screenStream=e,this.sharingScreen=!0;const t=e.getVideoTracks()[0];t&&(t.onended=()=>{this.stopScreenShare()}),this.setStatus(this.status,{sharingScreen:!0})}catch(e){console.warn("Screen share canceled or declined:",e.message)}}stopScreenShare(){this.screenStream&&(this.screenStream.getTracks().forEach(e=>e.stop()),this.screenStream=null),this.sharingScreen=!1,this.setStatus(this.status,{sharingScreen:!1})}createPeerConnection(e,t){if(typeof RTCPeerConnection>"u")return null;const i={iceServers:this.turn?.urls?.map(r=>({urls:r,username:this.turn.username,credential:this.turn.credential}))||[{urls:"stun:stun.l.google.com:19302"}]},s=new RTCPeerConnection(i);return this.peerConnections.set(e,s),this.localStream&&this.localStream.getTracks().forEach(r=>s.addTrack(r,this.localStream)),s.onicecandidate=r=>{r.candidate&&this.channel&&this.channel.push("signal",{target_player_id:e,type:"candidate",data:r.candidate})},s.onconnectionstatechange=()=>{(s.connectionState==="disconnected"||s.connectionState==="failed")&&this.handleDisconnect()},t&&s.createOffer().then(r=>s.setLocalDescription(r)).then(()=>{this.channel?.push("signal",{target_player_id:e,type:"offer",data:s.localDescription})}).catch(r=>console.warn("Offer creation error:",r)),s}handleSignal(e){if(e.target_player_id!==this.net.guestId)return;const t=e.from_player_id;let i=this.peerConnections.get(t);i||(i=this.createPeerConnection(t,!1)),i&&(e.type==="offer"?i.setRemoteDescription(new RTCSessionDescription(e.data)).then(()=>i.createAnswer()).then(s=>i.setLocalDescription(s)).then(()=>{this.channel?.push("signal",{target_player_id:t,type:"answer",data:i.localDescription})}).catch(s=>console.warn("Error handling offer:",s)):e.type==="answer"?i.setRemoteDescription(new RTCSessionDescription(e.data)).catch(s=>console.warn("Error setting answer:",s)):e.type==="candidate"&&i.addIceCandidate(new RTCIceCandidate(e.data)).catch(s=>console.warn("Error adding ICE candidate:",s)))}handleParticipantJoined(e){this.participants.set(e.player_id,{player_id:e.player_id,joined_at:new Date().toISOString()}),this.onParticipantsChange?.(Array.from(this.participants.values()))}handleParticipantLeft(e){this.participants.delete(e.player_id);const t=this.peerConnections.get(e.player_id);t&&(t.close(),this.peerConnections.delete(e.player_id)),this.onParticipantsChange?.(Array.from(this.participants.values()))}handleParticipantMuted(e){const t=this.participants.get(e.player_id);t&&(t.muted=t.muted||{},t.muted[e.kind]=e.muted,this.onParticipantsChange?.(Array.from(this.participants.values())))}handleGrantRevoked(e){this.stopAllMedia(),this.setStatus("error",{reason:"grant_revoked"}),this.onError?.(new Error("Media grant was revoked by moderator"))}handleDisconnect(){this.status==="connected"&&(this.setStatus("rejoining",{reason:"connection_interrupted"}),this.peerConnections.forEach(e=>e.close()),this.peerConnections.clear(),this.reconnectTimer&&clearTimeout(this.reconnectTimer),this.reconnectTimer=setTimeout(()=>{this.status==="rejoining"&&this.callId&&this.renegotiate()},1500))}async renegotiate(){if(this.callId)try{this.channel&&this.channel.push("renew_grant",{}),this.setStatus("connected",{renegotiated:!0})}catch(e){this.setStatus("error",{reason:"renegotiation_failed"}),this.onError?.(e)}}}class Hb{constructor(e,{onFocusChange:t=null,onDuckingChange:i=null}={}){this.callClient=e,this.onFocusChange=t,this.onDuckingChange=i,this.visible=!1,this.duckingRatio=.5,this.panel=document.getElementById("call-panel"),this.toggleBtn=document.getElementById("call-toggle"),this.statusBadge=document.getElementById("call-status-badge"),this.participantList=document.getElementById("call-participants"),this.joinBtn=document.getElementById("call-join-btn"),this.leaveBtn=document.getElementById("call-leave-btn"),this.muteAudioBtn=document.getElementById("call-mute-audio-btn"),this.muteVideoBtn=document.getElementById("call-mute-video-btn"),this.shareScreenBtn=document.getElementById("call-share-screen-btn"),this.duckingSlider=document.getElementById("call-ducking-slider"),this.noticeArea=document.getElementById("call-notice"),this.setupListeners(),this.setupClientHooks(),this.updateUI()}setupListeners(){this.toggleBtn&&this.toggleBtn.addEventListener("click",e=>{this.blurTarget(e),this.toggle()}),this.joinBtn&&this.joinBtn.addEventListener("click",async e=>{this.blurTarget(e);const t=this.getDefaultCallId();await this.callClient.joinCall(t,{audio:!0,video:!1}),this.updateUI()}),this.leaveBtn&&this.leaveBtn.addEventListener("click",e=>{this.blurTarget(e),this.callClient.leaveCall(),this.updateUI()}),this.muteAudioBtn&&this.muteAudioBtn.addEventListener("click",e=>{this.blurTarget(e);const t=!this.callClient.audioMuted;this.callClient.setAudioMute(t),this.updateUI()}),this.muteVideoBtn&&this.muteVideoBtn.addEventListener("click",async e=>{this.blurTarget(e);const t=!this.callClient.videoMuted;await this.callClient.setVideoMute(t),this.updateUI()}),this.shareScreenBtn&&this.shareScreenBtn.addEventListener("click",async e=>{this.blurTarget(e),this.callClient.sharingScreen?this.callClient.stopScreenShare():await this.callClient.startScreenShare(),this.updateUI()}),this.duckingSlider&&(this.duckingSlider.addEventListener("input",e=>{const t=parseFloat(e.target.value);this.duckingRatio=Math.max(0,Math.min(1,isNaN(t)?.5:t)),this.onDuckingChange?.(this.duckingRatio)}),this.duckingSlider.addEventListener("change",e=>{this.blurTarget(e)})),this.panel&&(this.panel.addEventListener("focusin",()=>this.onFocusChange?.(!0)),this.panel.addEventListener("focusout",()=>this.onFocusChange?.(!1)),this.panel.addEventListener("keydown",e=>{e.stopPropagation(),e.code==="Escape"&&(this.setVisible(!1),this.returnFocusToGame())}))}setupClientHooks(){this.callClient.onStateChange=(e,t)=>{this.updateStatusBadge(e,t),this.updateUI(),this.onDuckingChange?.(e==="connected"?this.duckingRatio:0)},this.callClient.onParticipantsChange=e=>{this.renderParticipants(e)},this.callClient.onError=e=>{this.noticeArea&&(this.noticeArea.textContent=`Error: ${e.message}`,this.noticeArea.style.display="block")}}getDefaultCallId(){return this.callClient.net?.desiredRoom||"theater-main"}blurTarget(e){e?.currentTarget&&typeof e.currentTarget.blur=="function"&&e.currentTarget.blur()}returnFocusToGame(){const e=document.getElementById("game-canvas");e&&typeof e.focus=="function"&&e.focus()}toggle(){this.setVisible(!this.visible)}setVisible(e){this.visible=e,this.panel&&(this.panel.style.display=e?"flex":"none",e||this.returnFocusToGame()),this.toggleBtn&&this.toggleBtn.classList.toggle("active",e)}updateStatusBadge(e,t={}){this.statusBadge&&(this.statusBadge.className=`call-badge status-${e}`,e==="connected"?(this.statusBadge.textContent="Connected",t.captureDeclined&&this.noticeArea?(this.noticeArea.textContent="Microphone permission declined. Listening in subscribe-only mode.",this.noticeArea.style.display="block"):this.noticeArea&&(this.noticeArea.style.display="none")):e==="rejoining"?(this.statusBadge.textContent="Rejoining...",this.noticeArea&&(this.noticeArea.textContent="Reconnecting to media worker...",this.noticeArea.style.display="block")):e==="joining"?this.statusBadge.textContent="Joining...":e==="error"?this.statusBadge.textContent="Error":(this.statusBadge.textContent="Offline",this.noticeArea&&(this.noticeArea.style.display="none")))}renderParticipants(e){if(this.participantList){if(this.participantList.innerHTML="",!e||e.length===0){const t=document.createElement("div");t.className="call-empty-message",t.textContent="No participants in call",this.participantList.appendChild(t);return}e.forEach(t=>{const i=document.createElement("div");i.className="call-participant-tile";const s=document.createElement("span");s.className="participant-name",s.textContent=t.player_id===this.callClient.net?.guestId?"You":t.player_id;const r=document.createElement("span");r.className="participant-badge";const o=t.muted?.audio??!1;r.textContent=o?"Muted":"Speaking",o&&r.classList.add("muted"),i.appendChild(s),i.appendChild(r),this.participantList.appendChild(i)})}}updateUI(){const e=this.callClient.status==="connected",t=this.callClient.status==="joining";this.joinBtn&&(this.joinBtn.style.display=e||t?"none":"inline-block"),this.leaveBtn&&(this.leaveBtn.style.display=e||t?"inline-block":"none"),this.muteAudioBtn&&(this.muteAudioBtn.disabled=!e,this.muteAudioBtn.textContent=this.callClient.audioMuted?"Unmute Mic":"Mute Mic",this.muteAudioBtn.classList.toggle("active",!this.callClient.audioMuted)),this.muteVideoBtn&&(this.muteVideoBtn.disabled=!e,this.muteVideoBtn.textContent=this.callClient.videoMuted?"Start Camera":"Stop Camera",this.muteVideoBtn.classList.toggle("active",!this.callClient.videoMuted)),this.shareScreenBtn&&(this.shareScreenBtn.disabled=!e,this.shareScreenBtn.textContent=this.callClient.sharingScreen?"Stop Screen":"Share Screen",this.shareScreenBtn.classList.toggle("active",this.callClient.sharingScreen))}}const zb=2048,Vb={RESOLVE_TIMEOUT_MS:45e3},Gb=/^[0-9a-fA-F]{40}$/,Wb=/^[A-Z2-7]{32}$/;function Xb(n){if(typeof n!="string")return null;const e=n.trim();if(!e||e.length>zb||!e.toLowerCase().startsWith("magnet:?"))return null;let t;try{t=new URL(e)}catch{return null}if(t.protocol!=="magnet:")return null;for(const i of t.searchParams.getAll("xt")){const s=/^urn:btih:(.+)$/i.exec(i.trim());if(!s)continue;const r=s[1];if(Gb.test(r))return{url:e,infohash:r.toLowerCase()};if(Wb.test(r)){const o="0123456789abcdef";let a=0,l=0,c="";for(const u of r.toUpperCase())if(l=l<<5|"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(u),a+=5,a>=8){const f=l>>a-8&255;c+=o[f>>4&15]+o[f&15],a-=8}return{url:e,infohash:c}}}return null}function qb(n,e,t=120){const i=String(n||"").replace(/\s+/g," ").trim(),s=String(e||"").split("/").pop().replace(/\s+/g," ").trim();return(i&&s&&s.toLowerCase()!==i.toLowerCase()?`${i} — ${s}`:i||s||"A torrent stream").slice(0,t)}function $b(n){if(!n||typeof n!="object")return null;const e=typeof n.infohash=="string"&&/^[0-9a-f]{40}$/.test(n.infohash)?n.infohash:null;if(!e)return null;const t=Number(n.progress),i=Number(n.peers),s=Number(n.downloaded);return{infohash:e,progress:Number.isFinite(t)?Math.min(1,Math.max(0,t)):0,peers:Number.isInteger(i)&&i>=0?i:0,downloaded:Number.isFinite(s)&&s>=0?s:0,ready:n.ready===!0}}function jb(n){switch(n){case"engine_unavailable":return"The projector’s torrent engine is unavailable right now.";case"invalid_magnet":return"That does not look like a magnet link (magnet:?xt=urn:btih:…).";case"resolve_timeout":return"The swarm never answered in time. Check the torrent has seeders and try again.";case"resolve_failed":return"The torrent could not be resolved. It may have no seeders.";case"metadata_timeout":return"The torrent’s file list is taking too long to arrive. Try again.";case"file_not_streamable":return"That file is not something the projector can stream from the torrent.";case"resolve_in_flight":return"Hold on — one torrent is still being looked up.";case"resolve_cooldown":return"Give the projector a breath — try that magnet again in a moment.";case"no_file_chosen":return"Pick a file from the torrent first.";default:return"The torrent reel jams; try that magnet again."}}const Wo={URL_MAX:2048,QUEUE_MAX:50},Wh={youtube:"YouTube",youtubePlaylist:"YouTube playlist",vimeo:"Vimeo",file:"Video file",hls:"Live stream (HLS)",torrent:"Torrent stream"};function Yb(n){switch(n){case"youtube":return"A YouTube video";case"vimeo":return"A Vimeo video";case"hls":return"Live channel";case"file":return"A video link";case"torrent":return"A torrent stream";default:return"Something to watch"}}const Kb=new Set(["youtube.com","www.youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com","youtu.be","www.youtu.be"]),Zb=/\.(mp4|webm|m4v|mov|ogv|ogg)$/i;function Xh(n){if(typeof n!="string")return null;const e=n.trim();if(!e||e.length>Wo.URL_MAX)return null;let t;try{t=new URL(e)}catch{return null}const i=Xb(e);if(i)return{kind:"torrent",url:i.url,infohash:i.infohash};if(t.protocol!=="http:"&&t.protocol!=="https:")return null;const s=t.hostname.toLowerCase(),r=t.pathname;if(Kb.has(s)){let o=null,a;if(s.endsWith("youtu.be")?(a=r.match(/^\/([\w-]{6,})/),o=a?a[1]:null):(a=r.match(/^\/(?:watch\/)?(?:\?v=)?\/?$/))&&t.searchParams.has("v"),!o&&t.searchParams.has("v")){const u=t.searchParams.get("v");/^[\w-]{6,}$/.test(u)&&(o=u)}o||(a=r.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/),a&&(o=a[1]));const l=t.searchParams.get("list"),c=l&&/^[\w-]{12,}$/.test(l)?l:null;return o?c?{kind:"youtube",url:e,videoId:o,listId:c}:{kind:"youtube",url:e,videoId:o}:c?{kind:"youtubePlaylist",listId:c,url:e}:null}if(s==="vimeo.com"||s==="www.vimeo.com"||s==="player.vimeo.com"){const o=r.match(/^\/(?:video\/)?(\d{6,})(?:[/?]|$)/);return o?{kind:"vimeo",url:e,videoId:o[1]}:null}return r.toLowerCase().endsWith(".m3u8")?{kind:"hls",url:e}:Zb.test(r)?{kind:"file",url:e}:null}function Jb(n,e){return e?`https://player.vimeo.com/video/${e}?autoplay=1&controls=0&enablejsapi=1`:null}function Qb(n,e){return n?n.playing?n.positionSec+Math.max(0,(e-n.updatedAt)/1e3):n.positionSec:0}function qh(n){switch(n){case"invalid_url":return"That link is not something the projector can play. Try YouTube, Vimeo, a direct video file, or an .m3u8 stream.";case"no_file_chosen":return"Pick a file from that torrent first — paste the magnet and choose from its file list.";case"url_too_long":return"That link is far too long to pin to the marquee.";case"queue_full":return"The queue reel is full. Remove something first.";case"item_not_found":return"That item is no longer on the bill.";case"nothing_playing":return"Nothing is on the screen right now.";case"item_mismatch":return"The screen has moved on to something else.";case"invalid_position":return"That timestamp does not make sense.";case"seek_unsupported":return"Live channels cannot be rewound.";case"invalid_action":return"The projector does not understand that request.";case"use_import":return"That link is a whole playlist — import it and its videos come to the reel together.";case"is_mix":return"Radio mixes never end, so the projector cannot pin them down — add the video itself instead.";case"playlist_not_public":return"That playlist is private or no longer exists — the projector can only read public playlists.";case"playlist_unreadable":return"The projector could not read that playlist just now. Give it a moment and try again.";case"resolve_in_flight":return"Hold on — one playlist is still being read.";case"resolve_cooldown":return"Give the projector a breath — try that playlist again in a moment.";default:return"The projector ignores that."}}const Hn={LISTS_MAX:24,LIST_TEXT_MAX:8*1024*1024,CHANNELS_MAX:2e4,CHANNEL_NAME_MAX:200,GROUP_MAX:120,EPG_LOOKUP_MAX:300};function eM(n,e=Hn.CHANNELS_MAX){const t=[];if(!Array.isArray(n))return t;const i=Number.isFinite(e)&&e>0?e:Hn.CHANNELS_MAX;for(const s of n){if(t.length>=i)break;if(!s||typeof s!="object")continue;const r=typeof s.url=="string"?s.url.trim():"";if(!/^https?:\/\//i.test(r))continue;const o=typeof s.tvgId=="string"?s.tvgId.trim().slice(0,Hn.GROUP_MAX):"";t.push({url:r,name:typeof s.name=="string"&&s.name.trim()?s.name.trim().slice(0,Hn.CHANNEL_NAME_MAX):`Channel ${t.length+1}`,group:typeof s.group=="string"&&s.group.trim()?s.group.trim().slice(0,Hn.GROUP_MAX):null,logo:typeof s.logo=="string"&&/^https?:\/\//i.test(s.logo.trim())?s.logo.trim():null,tvgId:o||null})}return t}function tM(n){switch(n){case"too_many_lists":return`The theater's channel shelf is full (${Hn.LISTS_MAX} lists). Remove one to make room.`;case"text_too_large":return"That playlist text is too large to file — trim it or split it into a couple of lists.";case"too_many_channels":return`That playlist carries more than ${Hn.CHANNELS_MAX} channels — more than the guide can hold.`;case"no_channels":return"No playable channels were found in that playlist.";case"not_a_playlist":return"That does not look like an M3U/M3U8 playlist — it should start with #EXTM3U or contain channel URLs, one per line.";case"list_not_found":return"That list is no longer in the theater library.";default:return"The theater could not accept that."}}function Ao(n){return String(n).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function nM(n){let e=`#EXTM3U
`;for(const t of Array.isArray(n)?n:[]){if(!t?.url||!/^https?:\/\//i.test(t.url))continue;const i=[];t.tvgId&&i.push(`tvg-id="${Ao(t.tvgId)}"`),t.name&&i.push(`tvg-name="${Ao(t.name)}"`),t.group&&i.push(`group-title="${Ao(t.group)}"`),t.logo&&i.push(`tvg-logo="${Ao(t.logo)}"`),e+=`#EXTINF:-1 ${i.join(" ")},${t.name||"Channel"}
${t.url}
`}return e}const yr=100,$h=84e5,iM=1.5,sM=2e3,mf=8e3,rM=3e3,oM=2e4,yl=5,jh="afterlight-iptv-lists",aM=12,lM=5e3,cM=6e4;function uM(n,e){const t=[1,0,0,0,1,0,0,0,1];if(!Array.isArray(n)||!Array.isArray(e)||n.length<4||e.length<4)return t;const i=[];for(let o=0;o<4;o++){const a=n[o]||{},l=e[o]||{},c=Number(a.x),u=Number(a.y),f=Number(l.x),d=Number(l.y);if(![c,u,f,d].every(Number.isFinite))return t;i.push([c,u,1,0,0,0,-f*c,-f*u,f]),i.push([0,0,0,c,u,1,-d*c,-d*u,d])}const s=8;for(let o=0;o<s;o++){let a=o;for(let c=o+1;c<i.length;c++)Math.abs(i[c][o])>Math.abs(i[a][o])&&(a=c);if(Math.abs(i[a][o])<1e-12)return t;if(a!==o){const c=i[a];i[a]=i[o],i[o]=c}const l=i[o][o];for(let c=o;c<=s;c++)i[o][c]/=l;for(let c=0;c<i.length;c++){if(c===o)continue;const u=i[c][o];if(u!==0)for(let f=o;f<=s;f++)i[c][f]-=u*i[o][f]}}const r=[];for(let o=0;o<s;o++)r.push(i[o][s]);return r.push(1),r}function hM(n){const e=(t,i=0)=>{const s=Number(n?.[t]);return Number.isFinite(s)?s:t===8?1:i};return`matrix3d(${e(0)}, ${e(3)}, 0, ${e(6)}, ${e(1)}, ${e(4)}, 0, ${e(7)}, 0, 0, 1, 0, ${e(2)}, ${e(5)}, 0, ${e(8)})`}function dM(n,e=1){const t=Number.isFinite(e)&&e>0?e:1;let i=0,s=0;if(Array.isArray(n)&&n.length>=4){const l=(c,u)=>Math.hypot(Number(u?.x)-Number(c?.x),Number(u?.y)-Number(c?.y));i=Math.max(l(n[0],n[1]),l(n[3],n[2])),s=Math.max(l(n[0],n[3]),l(n[1],n[2])),(!Number.isFinite(i)||i<=0)&&(i=0),(!Number.isFinite(s)||s<=0)&&(s=0)}const r=Math.max(i,s*t);let o=Math.max(Math.round(r)||yr,yr),a=Math.max(1,Math.round(o/t));return o*a>$h&&(o=Math.floor(o*Math.sqrt($h/(o*a))),a=Math.max(1,Math.floor(o/t))),{w:o,h:a}}const Xo="Other";function gf(n){const e=typeof n=="string"?n.trim():"";if(!e)return{country:null,category:null};const t=e.indexOf("|");return t<0?{country:e,category:null}:{country:e.slice(0,t).trim()||null,category:e.slice(t+1).trim()||null}}function fM(n){const e=new Map;let t=0,i=0;for(const s of Array.isArray(n)?n:[]){const{country:r,category:o}=gf(s?.group);if(!r&&!o){i+=1;continue}t+=1;const a=r||Xo;e.has(a)||e.set(a,new Set),o&&e.get(a).add(o)}return t>0&&i>0&&e.set(Xo,e.get(Xo)||new Set),{countries:[...e.keys()].sort((s,r)=>s.localeCompare(r)),categoriesFor(s){const r=s==="All"?[...e.values()]:[e.get(s)].filter(Boolean),o=new Set;for(const a of r)for(const l of a)o.add(l);return[...o].sort((a,l)=>a.localeCompare(l))}}}function Yh(n,e,t){const{country:i,category:s}=gf(n?.group);return!(e&&e!=="All"&&(i||Xo)!==e||t&&t!=="All"&&(s||"")!==t)}function Kh(n,e=0){const t=[];if(!Array.isArray(n))return t;const i=Number.isFinite(Number(e))?Number(e):0;for(const s of n){if(t.length>=aM)break;if(!s||typeof s!="object")continue;const r=[];if(Array.isArray(s.channels))for(const o of s.channels){if(r.length>=lM)break;if(!o||typeof o!="object")continue;const a=typeof o.url=="string"?o.url.trim():"";if(!/^https?:\/\//i.test(a))continue;const l=typeof o.logo=="string"?o.logo.trim():"";r.push({url:a,name:typeof o.name=="string"&&o.name.trim()?o.name.trim().slice(0,200):`Channel ${r.length+1}`,group:typeof o.group=="string"&&o.group.trim()?o.group.trim().slice(0,120):null,logo:/^https?:\/\//i.test(l)?l:null})}r.length!==0&&t.push({id:typeof s.id=="string"&&s.id?s.id:`iptv_${t.length}_${i}`,name:typeof s.name=="string"&&s.name.trim()?s.name.trim().slice(0,80):"Untitled list",savedAt:Number.isFinite(Number(s.savedAt))?Number(s.savedAt):i,channels:r})}return t}function Zh(n,e){const t=n.getBoundingClientRect();return e.clientX<t.left||e.clientX>t.right||e.clientY<t.top||e.clientY>t.bottom}const Co=new Map;function vf(n,e=mf){if(typeof document>"u")return Promise.reject(new Error("no document"));if(Co.has(n))return Co.get(n);const t=new Promise((i,s)=>{const r=document.createElement("script"),o=setTimeout(()=>s(new Error(`Timed out loading ${n}`)),e);r.src=n,r.async=!0,r.onload=()=>{clearTimeout(o),i()},r.onerror=()=>{clearTimeout(o),Co.delete(n),s(new Error(`Failed to load ${n}`))},document.head.append(r)});return Co.set(n,t),t}let pr=null;function pM(){return typeof window>"u"?Promise.reject(new Error("no window")):window.YT&&window.YT.Player?Promise.resolve(window.YT):(pr||(pr=new Promise((n,e)=>{const t=setTimeout(()=>e(new Error("YouTube IFrame API timed out")),mf),i=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(clearTimeout(t),typeof i=="function")try{i()}catch{}window.YT&&window.YT.Player?n(window.YT):e(new Error("YouTube IFrame API missing after load"))},vf("https://www.youtube.com/iframe_api").catch(s=>{clearTimeout(t),e(s)})}),pr.catch(()=>{pr=null})),pr)}async function mM(){if(typeof window>"u")throw new Error("no window");if(window.Vimeo&&window.Vimeo.Player||(await vf("https://player.vimeo.com/api/player.js"),window.Vimeo&&window.Vimeo.Player))return window.Vimeo;throw new Error("Vimeo player SDK missing after load")}class gM{constructor(e=null){this.net=e,this.state=null,this.serverDelta=0,this.roomActive=!1,this.quad=null,this.engine=null,this.loadedItemId=null,this.reportedForId=null,this.overlayState="idle",this.errorTitle=null,this.awaitingGesture=!1,this.lastDriftCheckMs=0,this.loadToken=0,this.volume=1,this.mixGain=1,this.watching=!1,this.onStandUpRequest=null,this.seatedInWorld=!1,this.savedLists=[],this.sharedCatalog={lists:[],epg:null},this.sharedChannels=new Map,this.pendingFlip=0,this.epgSchedule=new Map,this.epgTimer=null,this.activeListId=null,this.activeChannelIndex=-1,this.guideCountry="All",this.guideCategory="All",this.guideListId=null,this.torrentPending=null,this.torrentPick=null,this.torrentStatuses=new Map,this.playlistPending=null,this.playlistChoice=null,this.playlistPreview=null,this.overlayW=yr,this.overlayH=yr,this.quadTransform="",this.dom=null,typeof document<"u"&&(this.dom={},this.buildOverlay(),this.buildControlsButton(),this.buildDialogs(),this.buildWatchBar(),this.savedLists=this.loadSavedLists(),this.syncOverlay()),e&&typeof e.on=="function"&&(e.on(ge.THEATER_STATE,t=>this.applyState(t?.theater,t?.serverNow||Date.now())),e.on(ge.IPTV_STATE,t=>this.applyIptvState(t?.iptv)),e.on(ge.IPTV_LIST,t=>this.applySharedList(t)),e.on(ge.EPG_SCHEDULE,t=>this.applyEpgSchedule(t)),e.on(ge.TORRENT_FILES,t=>this.applyTorrentFiles(t)),e.on(ge.TORRENT_STATE,t=>this.applyTorrentStatus(t)),e.on(ge.TORRENT_GRANT,t=>this.applyTorrentGrant(t)),e.on(ge.THEATER_PLAYLIST_RESOLVED,t=>this.applyPlaylistResolved(t)),e.on(ge.THEATER_IMPORT_RESULT,t=>this.applyImportResult(t)),e.on(ge.ERROR,t=>this.applyServerErrorMessage(t)))}setRoomActive(e){this.roomActive=!!e,this.roomActive?this.state?.now?(this.loadedItemId=null,this.loadCurrent()):this.setOverlayState("idle"):(this.teardownEngine(),this.loadedItemId=null,this.awaitingGesture=!1,this.cancelTorrentResolve(),this.torrentPick=null,this.torrentStatuses.clear(),this.cancelPlaylistResolve(),this.playlistChoice=null,this.playlistPreview=null,this.dom?.playlistDialog?.open&&this.dom.playlistDialog.close(),this.dom?.playlistChoiceDialog?.open&&this.dom.playlistChoiceDialog.close(),this.setOverlayState("idle")),this.dom?.controlsBtn&&(this.dom.controlsBtn.hidden=!this.roomActive),this.syncOverlay()}effectiveVolume(){const e=Number.isFinite(this.volume)?Math.min(1,Math.max(0,this.volume)):1,t=Number.isFinite(this.mixGain)?Math.min(1,Math.max(0,this.mixGain)):1;return e*t}setMixGain(e=1){const t=Number(e);return this.mixGain=Number.isFinite(t)?Math.min(1,Math.max(0,t)):1,this.applyEffectiveVolume()}applyEffectiveVolume(){const e=this.engine;if(!e||e.degraded||typeof e.setVolume!="function")return!1;try{return e.setVolume(this.effectiveVolume()),!0}catch{return!1}}applyState(e,t=null){const i=e&&typeof e=="object"?e:{now:null,queue:[]};this.state={now:i.now&&typeof i.now=="object"?i.now:null,queue:Array.isArray(i.queue)?i.queue:[]};const s=Number(t);if(Number.isFinite(s)&&s>0&&(this.serverDelta=s-Date.now()),this.dom?.controlsDialog?.open&&this.renderControls(),this.dom?.guideDialog?.open&&this.renderGuide(),this.watching&&this.updateWatchBar(),!this.roomActive)return;const r=this.state.now;if(!r){(this.engine||this.loadedItemId!==null)&&this.teardownEngine(),this.loadedItemId=null,this.reportedForId=null,this.setOverlayState("idle"),this.syncOverlay();return}this.rememberChannelFor(r.url),r.id!==this.loadedItemId?(this.reportedForId=null,this.loadCurrent()):this.enforceSync(),this.syncOverlay()}updateScreenQuad(e,t=1){if(this.quad=Array.isArray(e)&&e.length>=4?e:null,this.quad||(this.quadTransform=""),this.dom?.overlay&&this.quad&&!this.watching){const{w:i,h:s}=dM(this.quad,t);if(Math.abs(i-this.overlayW)>Math.max(2,this.overlayW*.03)||Math.abs(s-this.overlayH)>Math.max(2,this.overlayH*.03)){this.overlayW=i,this.overlayH=s;const l=this.dom.overlay.style;l.width=`${i}px`,l.height=`${s}px`,l.setProperty("--ts-scale",(s/yr).toFixed(3)),this.quadTransform=""}const r=[{x:0,y:0},{x:this.overlayW,y:0},{x:this.overlayW,y:this.overlayH},{x:0,y:this.overlayH}],o=[this.quad[3],this.quad[2],this.quad[1],this.quad[0]],a=hM(uM(r,o));a!==this.quadTransform&&(this.quadTransform=a,this.dom.overlay.style.transform=a)}this.syncOverlay(),this.tickDriftCheck()}openControls(){this.dom?.controlsDialog&&(this.renderControls(),this.dom.controlsDialog.open||this.dom.controlsDialog.showModal())}isWatching(){return!!this.watching}setWatchMode(e){if(typeof document>"u")return;const t=!!e;t!==this.watching&&(this.watching=t,document.body.classList.toggle("theater-watching",this.watching),document.activeElement?.id==="chat-input"&&document.activeElement.blur(),this.dom?.overlay&&(this.watching?(this.dom.overlay.style.transform="",this.quadTransform="",this.dom.overlay.style.width="",this.dom.overlay.style.height="",this.dom.overlay.style.removeProperty("--ts-scale")):this.dom.overlay.style.aspectRatio=""),this.watching&&this.dockChatForWatch(),this.updateWatchBar(),this.syncOverlay())}dockChatForWatch(){const e=document.getElementById("chat-panel");if(!e){document.body.style.setProperty("--theater-chat-gutter","0px");return}e.classList.contains("collapsed")&&document.getElementById("chat-toggle")?.click(),requestAnimationFrame(()=>{if(!this.watching)return;const t=e.getBoundingClientRect(),i=t.width>0?Math.ceil(t.width+Math.max(0,window.innerWidth-t.right)):0;document.body.style.setProperty("--theater-chat-gutter",`${i}px`)})}buildWatchBar(){const e=document.createElement("div");e.id="theater-watchbar",e.hidden=!0,e.innerHTML=`
      <span class="theater-watchbar-title" id="theater-watchbar-title">The Orpheum</span>
      <span class="theater-watchbar-state micro" id="theater-watchbar-state"></span>
      <button type="button" id="theater-watchbar-controls" title="Open the projection booth (G)">▣ Booth</button>
      <button type="button" id="theater-watchbar-leave" title="Stand up and return to the game (Esc)">⤺ Stand up</button>
    `,document.body.append(e),e.querySelector("#theater-watchbar-controls").addEventListener("click",()=>this.openControls()),e.querySelector("#theater-watchbar-leave").addEventListener("click",()=>{this.onStandUpRequest?.(),this.setWatchMode(!1)}),this.watchbar=e,this.watchbarTitle=e.querySelector("#theater-watchbar-title"),this.watchbarState=e.querySelector("#theater-watchbar-state")}updateWatchBar(){if(!this.watchbar||(this.watchbar.hidden=!this.watching,!this.watching))return;const e=this.state?.now;this.watchbarTitle.textContent=e?`Now playing · ${e.title}`:"The Orpheum · the screen sleeps",this.watchbarState.textContent=e?e.playing?"▶":"⏸":"";const t=this.watchbar.querySelector("#theater-watchbar-leave");t&&(t.textContent=this.seatedInWorld?"⤺ Stand up":"⤺ Back to the world",t.title=this.seatedInWorld?"Stand up and return to the game (Esc)":"Step out of the cinema view and walk the aisles (Esc)")}setSeated(e){this.seatedInWorld=!!e,this.watching&&this.updateWatchBar()}openGuide(){this.dom?.guideDialog&&(this.renderGuide(),this.dom.guideDialog.open||this.dom.guideDialog.showModal(),this.requestEpgSchedule(),this.startEpgRefresh())}targetPosition(e=Date.now()){return this.state?.now?Qb(this.state.now,e+this.serverDelta):0}tickDriftCheck(){const e=this.state?.now;if(!this.roomActive||!e||!this.engine||this.engine.degraded||!this.engine.ready)return;const t=Date.now();t-this.lastDriftCheckMs<sM||(this.lastDriftCheckMs=t,this.enforceSync())}enforceSync(){if(!this.engine||this.engine.degraded||!this.engine.ready)return;const e=this.state?.now;if(!e)return;const t=this.engine.getTime?this.engine.getTime():null,i=this.targetPosition();Number.isFinite(t)&&Number.isFinite(i)&&Math.abs(t-i)>iM&&e.kind!=="hls"&&this.engine.seek(Math.max(0,i)),e.playing?this.awaitingGesture||this.engine.play():this.engine.pause()}teardownEngine(){const e=this.engine;if(this.engine=null,this.awaitingGesture=!1,this.hideGestureBadge(),e)try{e.destroy?.()}catch{}this.dom?.mediaHost&&(this.dom.mediaHost.innerHTML="")}loadCurrent(){const e=this.state?.now;if(!e||!this.dom)return;const t=++this.loadToken;switch(this.teardownEngine(),this.loadedItemId=e.id,this.errorTitle=null,this.setOverlayState("loading"),e.kind){case"file":this.startFileEngine(e,t,!1);break;case"hls":this.startFileEngine(e,t,!0);break;case"torrent":this.startFileEngine(e,t,!1);break;case"youtube":this.startYouTubeEngine(e,t);break;case"vimeo":this.startVimeoEngine(e,t);break;default:this.failItem()}}startFileEngine(e,t,i){const s=document.createElement("video");s.autoplay=!0,s.setAttribute("playsinline",""),s.preload="auto",s.volume=this.effectiveVolume(),this.dom.mediaHost.append(s);const r={kind:e.kind,video:s,hls:null,degraded:!1,ready:!1,getTime:()=>Number.isFinite(s.currentTime)?s.currentTime:null,seek:a=>{try{s.currentTime=a}catch{}},play:()=>{s.paused&&this.playVideoElement(s)},pause:()=>{s.paused||s.pause()},setVolume:a=>{s.volume=a},destroy:()=>{if(r.hls){try{r.hls.destroy()}catch{}r.hls=null}try{s.pause()}catch{}try{s.removeAttribute("src"),s.load()}catch{}}};this.engine=r,s.addEventListener("playing",()=>{this.engine===r&&(this.hideGestureBadge(),this.setOverlayState("playing"))}),s.addEventListener("waiting",()=>{this.engine===r&&this.overlayState==="playing"&&this.setOverlayState("loading")}),s.addEventListener("ended",()=>this.reportEnded()),s.addEventListener("error",()=>{this.engine===r&&this.failItem()});const o=()=>{if(this.engine!==r||t!==this.loadToken)return;r.ready=!0;const a=this.targetPosition();a>.5&&e.kind!=="hls"&&r.seek(a),this.state?.now?.playing!==!1?this.playVideoElement(s):r.pause()};s.readyState>=1?o():s.addEventListener("loadedmetadata",o,{once:!0}),i?this.attachHls(s,e,r,t):s.src=e.kind==="torrent"?this.torrentStreamUrl(e):e.url}async attachHls(e,t,i,s){let r=null;try{const o=await vd(()=>import("./hls-BOLXTnjL.js"),[]);r=o?.default??o}catch(o){console.warn("theater: hls.js unavailable, trying native HLS playback",o)}if(!(this.engine!==i||s!==this.loadToken))if(r&&typeof r.isSupported=="function"&&r.isSupported()){const o=new r;i.hls=o,o.on(r.Events.ERROR,(a,l)=>{if(!(!l?.fatal||this.engine!==i)){try{o.destroy()}catch{}i.hls===o&&(i.hls=null),this.failItem()}}),o.loadSource(t.url),o.attachMedia(e)}else e.src=t.url}async startYouTubeEngine(e,t){let i=null;try{i=await pM()}catch(l){console.warn("theater: YouTube API unavailable",l),t===this.loadToken&&this.failItem();return}if(t!==this.loadToken)return;const s=document.createElement("div");this.dom.mediaHost.append(s);const r={kind:"youtube",player:null,mount:s,degraded:!1,ready:!1,unstartedTimer:null};this.engine=r;const o=()=>{try{return r.player?.getPlayerState?.()}catch{return null}};let a;try{a=new i.Player(s,{width:"100%",height:"100%",videoId:e.videoId,playerVars:{autoplay:1,playsinline:1,controls:0,rel:0,disablekb:1},events:{onReady:()=>{if(this.engine!==r||t!==this.loadToken)return;r.ready=!0,r.player=a;try{a.setVolume(Math.round(this.effectiveVolume()*100))}catch{}const l=this.targetPosition();if(l>.5)try{a.seekTo(l,!0)}catch{}if(this.state?.now?.playing!==!1)try{a.playVideo()}catch{}r.unstartedTimer=setTimeout(()=>{if(r.unstartedTimer=null,this.engine!==r)return;const c=o();this.state?.now?.playing!==!1&&(c===-1||c===5)&&this.showGestureBadge()},rM)},onStateChange:l=>{if(this.engine!==r)return;const c=l?.data;c===1?(this.hideGestureBadge(),this.setOverlayState("playing")):c===0&&this.reportEnded()},onError:()=>{this.engine===r&&this.failItem()}}})}catch(l){console.warn("theater: YouTube player creation failed",l),t===this.loadToken&&this.failItem();return}r.player=a,r.getTime=()=>{try{const l=a.getCurrentTime?.();return Number.isFinite(l)?l:null}catch{return null}},r.seek=l=>{try{a.seekTo(l,!0)}catch{}},r.play=()=>{try{a.playVideo()}catch{}},r.pause=()=>{try{a.pauseVideo()}catch{}},r.setVolume=l=>{try{a.setVolume(Math.round(l*100))}catch{}},r.destroy=()=>{r.unstartedTimer&&(clearTimeout(r.unstartedTimer),r.unstartedTimer=null);try{a.destroy?.()}catch{}}}async startVimeoEngine(e,t){const i=document.createElement("iframe");i.src=Jb("vimeo",e.videoId)||e.url,i.setAttribute("allow","autoplay; fullscreen; picture-in-picture"),i.setAttribute("allowfullscreen",""),this.dom.mediaHost.append(i);const s={kind:"vimeo",iframe:i,player:null,degraded:!0,ready:!0,time:null,getTime:()=>s.degraded?null:s.time,seek:r=>{try{s.player?.setCurrentTime?.(r)}catch{}},play:()=>{try{s.player?.play?.()}catch{}},pause:()=>{try{s.player?.pause?.()}catch{}},setVolume:r=>{try{s.player?.setVolume?.(r)}catch{}},destroy:()=>{try{s.player?.destroy?.()}catch{}}};this.engine=s,this.setOverlayState("loading");try{const r=await mM();if(this.engine!==s||t!==this.loadToken)return;const o=new r.Player(i);s.player=o,s.degraded=!1,o.on("playing",()=>{this.engine===s&&(this.hideGestureBadge(),this.setOverlayState("playing"))}),o.on("timeupdate",l=>{this.engine===s&&(s.time=Number.isFinite(l?.seconds)?l.seconds:s.time)}),o.on("ended",()=>this.reportEnded()),o.on("error",()=>{this.engine===s&&this.failItem()});const a=this.targetPosition();if(a>.5)try{await o.setCurrentTime(a)}catch{}try{await o.setVolume(this.effectiveVolume())}catch{}try{await o.play()}catch{this.showGestureBadge()}}catch(r){console.warn("theater: Vimeo SDK unavailable, iframe runs unsynced",r),s.degraded=!0}}playVideoElement(e){try{const t=e.play();t&&typeof t.catch=="function"&&t.catch(i=>{this.engine?.video===e&&(console.warn("theater: autoplay blocked",i?.name||i),this.showGestureBadge())})}catch{this.showGestureBadge()}}setOverlayState(e){this.overlayState=e;const t=this.dom?.overlay;t&&(t.classList.remove("ts-state-idle","ts-state-loading","ts-state-playing","ts-state-error"),t.classList.add(`ts-state-${e}`),this.renderCaption())}renderCaption(){const e=this.dom?.caption;if(!e)return;const t=this.state?.now;let i="";if(this.overlayState==="idle")i="";else if(this.overlayState==="loading"){const s=t?.kind==="torrent"?this.torrentStatusText(t.infohash):"";i=s?`${s} — ${t.title}`:t?`Warming up the projector… ${t.title}`:"Warming up the projector…"}else this.overlayState==="error"?i=`Couldn't play: ${this.errorTitle||t?.title||"unknown item"}`:i=t?t.title:"";e.textContent=i}syncOverlay(){const e=this.dom?.overlay;e&&e.classList.toggle("ts-hidden",!(this.roomActive&&(this.quad||this.watching)))}showGestureBadge(){this.awaitingGesture=!0,this.dom?.playBadge&&(this.dom.playBadge.hidden=!1)}hideGestureBadge(){this.awaitingGesture=!1,this.dom?.playBadge&&(this.dom.playBadge.hidden=!0)}resumeFromGesture(){this.hideGestureBadge();const e=this.engine;e&&(e.video?this.playVideoElement(e.video):e.play?.())}reportEnded(){this.sendItemReport("ended")}failItem(){const e=this.state?.now;this.errorTitle=e?.title||"the current item",this.teardownEngine(),this.setOverlayState("error"),this.sendItemReport("failed")}sendItemReport(e){const t=this.state?.now?.id;!t||this.reportedForId===t||(this.reportedForId=t,this.sendControl({op:e,itemId:t}))}sendControl(e){typeof this.net?.sendTheaterControl=="function"?this.net.sendTheaterControl(e):this.net?.send?.(ge.THEATER_CONTROL,e)}sendQueue(e){typeof this.net?.sendTheaterQueue=="function"?this.net.sendTheaterQueue(e):this.net?.send?.(ge.THEATER_QUEUE,e)}sendChannel(e,t){typeof this.net?.sendTheaterChannel=="function"?this.net.sendTheaterChannel(e,t):this.net?.send?.(ge.THEATER_CHANNEL,{url:e,title:t})}buildOverlay(){const e=document.createElement("div");e.id="theater-screen",e.className="ts-hidden ts-state-idle",e.innerHTML=`
      <div class="ts-media"></div>
      <div class="ts-state-layer"></div>
      <div class="ts-idle">
        <p class="ts-idle-title">The screen sleeps</p>
        <p class="ts-idle-hint">Press <kbd>G</kbd> to open the Booth and queue something to watch</p>
        <button type="button" class="ts-idle-open" title="Open the projection booth (G)">▣ Open the Booth</button>
      </div>
      <div class="ts-caption"><span class="ts-caption-text"></span></div>
      <button type="button" class="ts-play-badge" hidden>▶ Tap to start</button>
    `,this.dom.overlay=e,this.dom.mediaHost=e.querySelector(".ts-media"),this.dom.caption=e.querySelector(".ts-caption-text"),this.dom.playBadge=e.querySelector(".ts-play-badge"),this.dom.playBadge.addEventListener("click",()=>this.resumeFromGesture()),this.dom.idleOpen=e.querySelector(".ts-idle-open"),this.dom.idleOpen.addEventListener("click",()=>this.openControls()),document.body.append(e)}buildControlsButton(){const e=document.createElement("button");e.type="button",e.id="theater-controls-btn",e.textContent="▣ Screen",e.title="Screen controls (G)",e.hidden=!0,e.addEventListener("click",()=>this.openControls()),(document.querySelector("footer .actions")||document.body).append(e),this.dom.controlsBtn=e}buildDialogs(){this.buildControlsDialog(),this.buildGuideDialog(),this.buildTorrentDialog(),this.buildPlaylistDialogs()}buildControlsDialog(){const e=document.createElement("dialog");e.id="theater-dialog",e.className="game-modal",e.innerHTML=`
      <div class="micro modal-header-tag">THE ORPHEUM · PROJECTION BOOTH</div>
      <h2>Screen Controls</h2>
      <p class="modal-sub">Anyone in the auditorium may run the projector — everyone watching sees the same thing at the same time.</p>

      <div class="panel theater-now-panel" id="theater-now-panel"></div>

      <label class="micro" for="theater-url-input">ADD BY URL (YOUTUBE · PLAYLIST · VIMEO · .MP4 · .M3U8 · MAGNET)</label>
      <div class="theater-add-row">
        <input type="text" id="theater-url-input" maxlength="${Wo.URL_MAX}"
          placeholder="Paste a video, stream, or magnet link…" autocomplete="off" spellcheck="false">
        <button type="button" id="theater-btn-add" class="btn-secondary">Add to queue</button>
        <button type="button" id="theater-btn-play-url" class="action-btn">Play now</button>
      </div>
      <p class="theater-status-line" id="theater-add-status" hidden></p>

      <div class="micro theater-section-label">UP NEXT</div>
      <div id="theater-queue-list" class="theater-queue-list"></div>

      <div class="theater-transport">
        <button type="button" id="theater-btn-toggle" class="btn-secondary">Pause</button>
        <button type="button" id="theater-btn-skip" class="btn-secondary">Skip ▸</button>
        <button type="button" id="theater-btn-back" class="btn-secondary">↺ −30s</button>
        <button type="button" id="theater-btn-fwd" class="btn-secondary">+30s ↻</button>
        <button type="button" id="theater-btn-clear" class="btn-secondary">Clear</button>
      </div>

      <div class="theater-volume-row">
        <label class="micro" for="theater-volume">VOLUME · LOCAL ONLY</label>
        <input type="range" id="theater-volume" min="0" max="100" value="100">
      </div>

      <div class="iptv-section">
        <div class="micro modal-header-tag">IPTV &amp; CHANNELS</div>
        <p class="theater-iptv-intro micro">Playlists added here are filed in the theater's shared library — everyone in the auditorium can browse the guide, tune, and flip, with no import of their own.</p>
        <div class="theater-iptv-saved">
          <select id="theater-iptv-select" aria-label="Channel lists"></select>
          <button type="button" id="theater-btn-open-guide" class="action-btn">Open guide</button>
          <button type="button" id="theater-btn-push-list" class="btn-secondary" hidden>Add to theater</button>
          <button type="button" id="theater-btn-delete-list" class="btn-secondary">Remove list</button>
        </div>
        <div class="theater-iptv-flip">
          <button type="button" id="theater-btn-prev" class="btn-secondary">◂ Prev</button>
          <span id="theater-iptv-current" class="theater-current-channel">No channel tuned</span>
          <button type="button" id="theater-btn-next" class="btn-secondary">Next ▸</button>
        </div>
        <div class="theater-iptv-imports">
          <div class="theater-iptv-import">
            <label class="micro" for="theater-iptv-paste">PASTE PLAYLIST TEXT</label>
            <textarea id="theater-iptv-paste" rows="4" placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-name=&quot;…&quot; group-title=&quot;News&quot;,Channel&#10;https://…"></textarea>
            <button type="button" id="theater-btn-import-paste" class="btn-secondary">Import</button>
          </div>
          <div class="theater-iptv-import">
            <label class="micro" for="theater-iptv-file">UPLOAD .M3U / .M3U8 / .TXT</label>
            <input type="file" id="theater-iptv-file" accept=".m3u,.m3u8,.txt">
            <label class="micro" for="theater-iptv-url">…OR FETCH A PLAYLIST URL</label>
            <input type="text" id="theater-iptv-url" placeholder="http://example.com/playlist.m3u8" autocomplete="off" spellcheck="false">
            <button type="button" id="theater-btn-import-url" class="btn-secondary">Fetch</button>
          </div>
          <div class="theater-iptv-import">
            <label class="micro" for="theater-epg-file">PROGRAM GUIDE · .EPG / .XML (XMLTV, PLAIN OR .GZ)</label>
            <input type="file" id="theater-epg-file" accept=".epg,.xml,.xmltv,.gz">
            <p class="micro theater-epg-hint">A guide gives the whole room “now / next” in the channel guide. Uploading a new guide replaces the current one and never interrupts the screen.</p>
          </div>
        </div>
        <p class="theater-status-line" id="theater-iptv-status" hidden></p>
        <p class="theater-status-line" id="theater-epg-status" hidden></p>
      </div>

      <div class="modal-footer">
        <button type="button" id="close-theater-dialog" class="btn-secondary">Leave the booth →</button>
      </div>
    `,document.body.append(e),e.addEventListener("cancel",i=>{i.preventDefault(),e.close()});let t=!1;e.addEventListener("mousedown",i=>{t=Zh(e,i)}),e.addEventListener("click",i=>{t&&Zh(e,i)&&e.close()}),this.dom.controlsDialog=e,this.dom.nowPanel=e.querySelector("#theater-now-panel"),this.dom.urlInput=e.querySelector("#theater-url-input"),this.dom.addStatus=e.querySelector("#theater-add-status"),this.dom.queueList=e.querySelector("#theater-queue-list"),this.dom.btnToggle=e.querySelector("#theater-btn-toggle"),this.dom.btnSkip=e.querySelector("#theater-btn-skip"),this.dom.btnBack=e.querySelector("#theater-btn-back"),this.dom.btnFwd=e.querySelector("#theater-btn-fwd"),this.dom.btnClear=e.querySelector("#theater-btn-clear"),this.dom.volumeInput=e.querySelector("#theater-volume"),this.dom.iptvSelect=e.querySelector("#theater-iptv-select"),this.dom.iptvCurrent=e.querySelector("#theater-iptv-current"),this.dom.iptvStatus=e.querySelector("#theater-iptv-status"),this.dom.iptvPush=e.querySelector("#theater-btn-push-list"),this.dom.iptvPaste=e.querySelector("#theater-iptv-paste"),this.dom.iptvFile=e.querySelector("#theater-iptv-file"),this.dom.iptvUrl=e.querySelector("#theater-iptv-url"),this.dom.epgFile=e.querySelector("#theater-epg-file"),this.dom.epgStatus=e.querySelector("#theater-epg-status"),e.querySelector("#close-theater-dialog").addEventListener("click",()=>e.close()),e.querySelector("#theater-btn-add").addEventListener("click",()=>this.onAddClicked(!1)),e.querySelector("#theater-btn-play-url").addEventListener("click",()=>this.onAddClicked(!0)),this.dom.urlInput.addEventListener("keydown",i=>{i.key==="Enter"&&(i.preventDefault(),this.onAddClicked(!1))}),this.dom.urlInput.addEventListener("input",()=>this.recognizeAddInput()),this.dom.btnToggle.addEventListener("click",()=>{const i=this.state?.now;i&&this.sendControl(i.playing?{op:"pause",itemId:i.id}:{op:"resume",itemId:i.id})}),this.dom.btnSkip.addEventListener("click",()=>this.sendQueue({op:"skip"})),this.dom.btnBack.addEventListener("click",()=>this.nudgeSeek(-30)),this.dom.btnFwd.addEventListener("click",()=>this.nudgeSeek(30)),this.dom.btnClear.addEventListener("click",()=>this.sendQueue({op:"clear"})),this.dom.volumeInput.addEventListener("input",()=>{const i=Number(this.dom.volumeInput.value);this.volume=Number.isFinite(i)?Math.min(1,Math.max(0,i/100)):1,this.applyEffectiveVolume()}),this.dom.iptvSelect.addEventListener("change",()=>{this.activeListId=this.dom.iptvSelect.value||null,this.activeChannelIndex=-1,this.renderIptvSection()}),e.querySelector("#theater-btn-open-guide").addEventListener("click",()=>this.openGuide()),e.querySelector("#theater-btn-delete-list").addEventListener("click",()=>this.deleteActiveList()),this.dom.iptvPush.addEventListener("click",()=>this.pushActivePersonalList()),e.querySelector("#theater-btn-prev").addEventListener("click",()=>this.flipChannel(-1)),e.querySelector("#theater-btn-next").addEventListener("click",()=>this.flipChannel(1)),e.querySelector("#theater-btn-import-paste").addEventListener("click",()=>{this.uploadPlaylistText(this.dom.iptvPaste.value,null),this.dom.iptvPaste.value=""}),this.dom.iptvFile.addEventListener("change",()=>{const i=this.dom.iptvFile.files?.[0];this.dom.iptvFile.value="",this.importPlaylistFile(i)}),e.querySelector("#theater-btn-import-url").addEventListener("click",()=>this.importPlaylistUrl()),this.dom.epgFile.addEventListener("change",()=>{const i=this.dom.epgFile.files?.[0];this.dom.epgFile.value="",this.uploadEpgFile(i)})}buildGuideDialog(){const e=document.createElement("dialog");e.id="theater-guide-dialog",e.className="game-modal game-modal--wide",e.innerHTML=`
      <div class="micro modal-header-tag">THE ORPHEUM · CHANNEL GUIDE</div>
      <h2 id="theater-guide-title">Channel Guide</h2>
      <div class="theater-guide-top">
        <button type="button" id="theater-guide-prev" class="btn-secondary">◂ Prev</button>
        <button type="button" id="theater-guide-next" class="btn-secondary">Next ▸</button>
        <span id="theater-guide-count" class="micro"></span>
      </div>
      <label class="theater-guide-country">
        <span class="micro">COUNTRY</span>
        <select id="theater-guide-country" aria-label="Filter channels by country"></select>
      </label>
      <div id="theater-guide-groups" class="theater-chip-row" hidden></div>
      <p class="micro theater-guide-epg" id="theater-guide-epg"></p>
      <div id="theater-guide-list" class="theater-guide-list"></div>
      <div class="modal-footer">
        <button type="button" id="close-theater-guide" class="btn-secondary">Close guide →</button>
      </div>
    `,document.body.append(e),e.addEventListener("cancel",t=>{t.preventDefault(),e.close()}),e.addEventListener("close",()=>this.stopEpgRefresh()),this.dom.guideDialog=e,this.dom.guideTitle=e.querySelector("#theater-guide-title"),this.dom.guideCount=e.querySelector("#theater-guide-count"),this.dom.guideEpg=e.querySelector("#theater-guide-epg"),this.dom.guideCountryRow=e.querySelector(".theater-guide-country"),this.dom.guideCountrySelect=e.querySelector("#theater-guide-country"),this.dom.guideGroups=e.querySelector("#theater-guide-groups"),this.dom.guideList=e.querySelector("#theater-guide-list"),this.dom.guideCountrySelect.addEventListener("change",()=>{this.guideCountry=this.dom.guideCountrySelect.value||"All",this.guideCategory="All",this.renderGuide()}),e.querySelector("#theater-guide-prev").addEventListener("click",()=>this.flipChannel(-1)),e.querySelector("#theater-guide-next").addEventListener("click",()=>this.flipChannel(1)),e.querySelector("#close-theater-guide").addEventListener("click",()=>e.close())}buildTorrentDialog(){const e=document.createElement("dialog");e.id="theater-torrent-dialog",e.className="game-modal",e.innerHTML=`
      <div class="micro modal-header-tag">THE ORPHEUM · TORRENT REEL</div>
      <h2 id="theater-torrent-name">Torrent</h2>
      <p class="modal-sub">The reel holds several films. Pick which one plays for the whole auditorium — only video files are listed.</p>
      <div id="theater-torrent-files" class="theater-torrent-files"></div>
      <div class="modal-footer">
        <button type="button" id="theater-torrent-cancel" class="btn-secondary">Never mind</button>
      </div>
    `,document.body.append(e),e.addEventListener("cancel",t=>{t.preventDefault(),this.torrentPick=null,e.close()}),e.querySelector("#theater-torrent-cancel").addEventListener("click",()=>{this.torrentPick=null,e.close()}),this.dom.torrentDialog=e}buildPlaylistDialogs(){const e=document.createElement("dialog");e.id="theater-playlist-choice",e.className="game-modal",e.innerHTML=`
      <div class="micro modal-header-tag">THE ORPHEUM · PLAYLIST IMPORT</div>
      <h2>A video and a playlist</h2>
      <p class="modal-sub" id="theater-playlist-choice-sub">That link carries both a video and a playlist. Which should come to the reel?</p>
      <div class="modal-footer">
        <button type="button" id="theater-playlist-choice-import" class="btn-secondary">Import the playlist</button>
        <button type="button" id="theater-playlist-choice-video" class="btn-secondary">Add just this video</button>
      </div>
    `,document.body.append(e),e.addEventListener("cancel",i=>{i.preventDefault(),this.playlistChoice=null,e.close()}),e.querySelector("#theater-playlist-choice-import").addEventListener("click",()=>{const i=this.playlistChoice;this.playlistChoice=null,e.close(),i&&(this.dom.urlInput.value="",this.beginPlaylistResolve(i.classified.listId,i.playNow))}),e.querySelector("#theater-playlist-choice-video").addEventListener("click",()=>{const i=this.playlistChoice;this.playlistChoice=null,e.close(),i&&(this.dom.urlInput.value="",this.addSingleVideo(i.classified,i.playNow))}),this.dom.playlistChoiceDialog=e;const t=document.createElement("dialog");t.id="theater-playlist-dialog",t.className="game-modal",t.innerHTML=`
      <div class="micro modal-header-tag">THE ORPHEUM · PLAYLIST IMPORT</div>
      <h2 id="theater-playlist-name">A playlist</h2>
      <p class="modal-sub" id="theater-playlist-sub"></p>
      <div id="theater-playlist-videos" class="theater-playlist-videos"></div>
      <div class="modal-footer">
        <button type="button" id="theater-playlist-confirm" class="btn-secondary">Add to the queue</button>
        <button type="button" id="theater-playlist-cancel" class="btn-secondary">Never mind</button>
      </div>
    `,document.body.append(t),t.addEventListener("cancel",i=>{i.preventDefault(),this.playlistPreview=null,t.close()}),t.querySelector("#theater-playlist-cancel").addEventListener("click",()=>{this.playlistPreview=null,t.close()}),t.querySelector("#theater-playlist-confirm").addEventListener("click",()=>this.confirmPlaylistImport()),this.dom.playlistDialog=t}nudgeSeek(e){const t=this.state?.now;if(!t)return;const i=Math.max(0,Math.round((this.targetPosition()+e)*10)/10);this.sendControl({op:"seek",positionSec:i,itemId:t.id})}setAddStatus(e,t=!1){const i=this.dom?.addStatus;i&&(i.hidden=!e,i.textContent=e||"",i.classList.toggle("is-error",!!t))}setIptvStatus(e,t=!1){const i=this.dom?.iptvStatus;i&&(i.hidden=!e,i.textContent=e||"",i.classList.toggle("is-error",!!t))}setEpgStatus(e,t=!1){const i=this.dom?.epgStatus;i&&(i.hidden=!e,i.textContent=e||"",i.classList.toggle("is-error",!!t))}async uploadEpgFile(e){if(e){if(!this.net?.uploadEpg){this.setEpgStatus("Multiplayer is offline — the theater cannot store guides right now.",!0);return}this.setEpgStatus("Uploading the program guide…");try{const t=await this.net.uploadEpg(e,e.name.replace(/\.(epg|xml|xmltv|gz)$/i,"")),i=t.epg||{};this.setEpgStatus(`Guide active: ${i.name||"Program guide"} — ${i.channels||0} channels with listings${t.truncated?" (the file was larger than the guide shelf, so it was trimmed)":""}. Everyone in the auditorium now sees now/next in the guide.`)}catch(t){this.setEpgStatus(t.message||"Could not upload that guide.",!0)}}}recognizeAddInput(){const e=this.dom?.urlInput,t=Xh((e?.value||"").trim());t?.kind==="youtubePlaylist"?this.setAddStatus("A YouTube playlist — Add reads it and queues its videos together."):t?.kind==="youtube"&&t.listId&&this.setAddStatus("A YouTube video that belongs to a playlist — Add will ask which one you want.")}beginPlaylistResolve(e,t){if(!this.net?.send){this.setAddStatus("Multiplayer is offline — playlists cannot be imported right now.",!0);return}if(this.playlistPending){this.setAddStatus(qh("resolve_in_flight"),!0);return}const i=`plreq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,s=setTimeout(()=>{this.playlistPending?.requestId===i&&(this.playlistPending=null,this.setAddStatus("That playlist took too long to read. Try again in a moment.",!0))},oM);this.playlistPending={requestId:i,playNow:t,timer:s},this.setAddStatus("Reading the playlist…"),typeof this.net.sendPlaylistResolve=="function"?this.net.sendPlaylistResolve(i,e):this.net.send(ge.THEATER_PLAYLIST_RESOLVE,{requestId:i,listId:e})}cancelPlaylistResolve(){this.playlistPending?.timer&&clearTimeout(this.playlistPending.timer),this.playlistPending=null}applyServerErrorMessage(e){const t=typeof e?.message=="string"?e.message:"";if(t){if(this.playlistPending){this.cancelPlaylistResolve(),this.roomActive&&this.setAddStatus(t,!0);return}this.torrentPending&&(this.cancelTorrentResolve(),this.roomActive&&this.setAddStatus(t,!0))}}applyPlaylistResolved(e){const t=this.playlistPending;if(!t||!e||String(e.requestId||"")!==t.requestId||(clearTimeout(t.timer),this.playlistPending=null,!this.roomActive))return;const i=(Array.isArray(e.videos)?e.videos:[]).filter(s=>s&&typeof s.videoId=="string"&&/^[\w-]{6,}$/.test(s.videoId));if(!i.length){this.setAddStatus("That playlist had no videos the projector could read.",!0);return}this.setAddStatus(""),this.openPlaylistPreview(String(e.title||"A YouTube playlist"),i,t.playNow)}importCapacity(){return this.state?Math.max(0,Wo.QUEUE_MAX-(this.state.queue?.length||0))+(this.state.now?0:1):Wo.QUEUE_MAX}openPlaylistPreview(e,t,i){const s=this.dom?.playlistDialog;if(!s)return;this.playlistPreview={title:e,videos:t,playNow:i},s.querySelector("#theater-playlist-name").textContent=e;const r=Math.min(this.importCapacity(),t.length);s.querySelector("#theater-playlist-sub").textContent=`${t.length} video${t.length===1?"":"s"} resolved — `+(r>=t.length?"they all fit on the reel right now.":`the reel can take ${r} more right now; the rest would be left off.`);const o=s.querySelector("#theater-playlist-videos");o.innerHTML="";for(const l of t.slice(0,yl)){const c=document.createElement("div");c.className="theater-playlist-video",c.textContent=l.title||"Untitled video",o.append(c)}if(t.length>yl){const l=document.createElement("div");l.className="theater-playlist-video theater-playlist-more",l.textContent=`… and ${t.length-yl} more`,o.append(l)}const a=s.querySelector("#theater-playlist-confirm");a.textContent=r>0?`Add ${r} video${r===1?"":"s"} to the reel`:"The reel is full",a.disabled=r===0,s.open||s.showModal()}confirmPlaylistImport(){const e=this.playlistPreview;this.playlistPreview=null;const t=this.dom?.playlistDialog;if(t?.open&&t.close(),!e?.videos?.length)return;const i=e.videos.map(s=>({url:`https://www.youtube.com/watch?v=${encodeURIComponent(s.videoId)}`,title:s.title||""}));this.sendQueue({op:"addMany",items:i}),this.setAddStatus(`Pinning ${i.length} videos from "${e.title}" to the reel…`)}applyImportResult(e){const t=Math.max(0,Number(e?.queued)||0),i=Math.max(0,Number(e?.skipped)||0),s=Math.max(0,Number(e?.didNotFit)||0);if(!t&&!i&&!s)return;const r=[`Queued ${t} video${t===1?"":"s"}`];s&&r.push(`${s} didn't fit — the reel is full`),i&&r.push(`${i} skipped`),this.setAddStatus(`${r.join(" · ")}.`)}onAddClicked(e){const t=this.dom?.urlInput,i=(t?.value||"").trim(),s=Xh(i);if(!s){this.setAddStatus(qh("invalid_url"),!0);return}if(s.kind==="torrent"){t.value="",this.beginTorrentResolve(s.url,e);return}if(s.kind==="youtubePlaylist"){t.value="",this.beginPlaylistResolve(s.listId,e);return}if(s.kind==="youtube"&&s.listId){this.openPlaylistChoice(s,e);return}this.addSingleVideo(s,e),t.value=""}openPlaylistChoice(e,t){const i=this.dom?.playlistChoiceDialog;i&&(this.playlistChoice={classified:e,playNow:t},i.open||i.showModal())}addSingleVideo(e,t){this.setAddStatus(""),t?this.sendChannel(e.url,Yb(e.kind)):this.sendQueue({op:"add",url:e.url})}torrentStreamUrl(e){return typeof this.net?.torrentStreamUrl=="function"?this.net.torrentStreamUrl(e):`${typeof this.net?.apiBase=="string"?this.net.apiBase.replace(/\/+$/,""):""}/api/theater/torrent/${e.infohash}/${e.fileIndex}`}beginTorrentResolve(e,t){if(!this.net?.send){this.setAddStatus("Multiplayer is offline — the torrent reel is unreachable.",!0);return}if(this.torrentPending){this.setAddStatus("Hold on — one torrent is still being looked up.",!0);return}const i=`treq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,s=setTimeout(()=>{this.torrentPending?.requestId===i&&(this.torrentPending=null,this.setAddStatus(jb("resolve_timeout"),!0))},Vb.RESOLVE_TIMEOUT_MS+5e3);this.torrentPending={requestId:i,magnet:e,playNow:t,timer:s},this.setAddStatus("Reaching the swarm for that torrent…"),typeof this.net.sendTorrentResolve=="function"?this.net.sendTorrentResolve(i,e):this.net.send(ge.TORRENT_RESOLVE,{requestId:i,magnet:e})}cancelTorrentResolve(){this.torrentPending?.timer&&clearTimeout(this.torrentPending.timer),this.torrentPending=null}applyTorrentFiles(e){const t=this.torrentPending;if(!t||!e||String(e.requestId||"")!==t.requestId||(clearTimeout(t.timer),this.torrentPending=null,!this.roomActive))return;const i=Array.isArray(e.files)?e.files:[];if(!i.length){this.setAddStatus("That torrent has no video files the projector can play.",!0);return}this.setAddStatus(""),this.openTorrentPicker(String(e.name||"Unnamed torrent"),i,t.magnet,t.playNow)}applyTorrentGrant(e){const t=this.state?.now;if(!t||t.kind!=="torrent"||!e?.grant||String(t.infohash).toLowerCase()!==String(e.infohash||"").toLowerCase()||Number(t.fileIndex)!==Number(e.fileIndex))return;const i=this.dom?.mediaHost?.querySelector("video");if(!i)return;const s=this.torrentStreamUrl(t);i.src!==s&&(i.src=s)}openTorrentPicker(e,t,i,s){const r=this.dom?.torrentDialog;if(!r)return;this.torrentPick={magnet:i,name:e,playNow:s},r.querySelector("#theater-torrent-name").textContent=e;const o=r.querySelector("#theater-torrent-files");o.innerHTML="";for(const a of t){const l=document.createElement("button");l.type="button",l.className="theater-torrent-file";const c=document.createElement("span");c.className="theater-torrent-file-path",c.textContent=a.path;const u=document.createElement("span");if(u.className="theater-torrent-file-meta",u.textContent=this.formatBytes(a.bytes),!a.playable){const f=document.createElement("span");f.className="theater-kind-tag",f.textContent="may not play",u.append(" · ",f)}l.append(c,u),l.addEventListener("click",()=>{r.close(),this.sendTorrentPick(a)}),o.append(l)}r.open||r.showModal()}sendTorrentPick(e){const t=this.torrentPick;if(this.torrentPick=null,!t)return;const i={url:t.magnet,title:qb(t.name,e.path),torrentName:t.name,fileIndex:e.index,filePath:e.path,fileBytes:e.bytes};t.playNow?(this.net?.send?.(ge.THEATER_CHANNEL,i),this.setAddStatus(`Starting “${i.title}” on the screen…`)):(this.sendQueue({op:"add",...i}),this.setAddStatus(`“${i.title}” is on the reel — it starts for everyone.`))}torrentStatusText(e){const t=this.torrentStatuses.get(e);return!t||t.ready&&t.progress>=1?"":t.ready?`Downloading… ${Math.round(t.progress*100)}% · ${t.peers} peer${t.peers===1?"":"s"}`:t.peers>0||t.progress>0?`Fetching reels… ${Math.round(t.progress*100)}% · ${t.peers} peer${t.peers===1?"":"s"}`:"Reaching the swarm…"}applyTorrentStatus(e){const t=Array.isArray(e?.items)?e.items:[];if(t.length){const s=new Map;for(const r of t){const o=$b(r);o&&s.set(o.infohash,o)}this.torrentStatuses=s}this.state?.now?.kind==="torrent"&&this.overlayState==="loading"&&this.renderCaption(),this.dom?.controlsDialog?.open&&this.renderControls()}formatBytes(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"unknown size";const i=["B","KB","MB","GB","TB"];let s=t,r=0;for(;s>=1e3&&r<i.length-1;)s/=1e3,r+=1;return`${s>=100||r===0?Math.round(s):s.toFixed(1)} ${i[r]}`}renderControls(){if(!this.dom?.controlsDialog)return;const e=this.state?.now,t=this.state?.queue||[],i=this.dom.nowPanel;if(i.innerHTML="",e){const a=document.createElement("div");a.className="theater-now-head";const l=document.createElement("strong");l.className="theater-now-title",l.textContent=e.title||"Untitled";const c=document.createElement("span");c.className="theater-kind-tag",c.textContent=Wh[e.kind]||e.kind||"media";const u=document.createElement("span");u.className=`theater-badge ${e.playing?"is-playing":"is-paused"}`,u.textContent=e.playing?"▶ PLAYING":"❚❚ PAUSED",a.append(l,c,u);const f=document.createElement("div");if(f.className="micro theater-now-by",f.textContent=`queued/changed by ${e.queuedBy||e.by||"Someone"}`,i.append(a,f),e.kind==="torrent"){const d=this.torrentStatusText(e.infohash);if(d){const h=document.createElement("div");h.className="micro theater-torrent-status",h.textContent=d,i.append(h)}}}else{const a=document.createElement("div");a.className="theater-empty",a.textContent="Nothing on the screen. Queue something below — it starts for everyone.",i.append(a)}const s=this.dom.queueList;if(s.innerHTML="",!t.length){const a=document.createElement("div");a.className="theater-empty",a.textContent="The queue is empty.",s.append(a)}for(const a of t){const l=document.createElement("div");l.className="theater-queue-row";const c=document.createElement("span");c.className="theater-queue-title",c.textContent=a.title||"Untitled";const u=document.createElement("span");u.className="theater-kind-tag",u.textContent=Wh[a.kind]||a.kind||"media";const f=document.createElement("span");f.className="theater-queued-by",f.textContent=`· ${a.queuedBy||"Someone"}`;const d=document.createElement("button");d.type="button",d.textContent="Play now",d.addEventListener("click",()=>this.sendQueue({op:"playNow",itemId:a.id}));const h=document.createElement("button");h.type="button",h.textContent="Remove",h.addEventListener("click",()=>this.sendQueue({op:"remove",itemId:a.id})),l.append(c,u,f,d,h),s.append(l)}const r=!!e;this.dom.btnToggle.textContent=e?.playing?"Pause":"Resume",this.dom.btnToggle.disabled=!r,this.dom.btnSkip.disabled=!r;const o=r&&e.kind!=="hls";this.dom.btnBack.disabled=!o,this.dom.btnFwd.disabled=!o,this.dom.btnClear.disabled=!r&&!t.length,this.dom.volumeInput.value=String(Math.round(this.volume*100)),this.renderIptvSection()}getActiveListMeta(){const e=(this.sharedCatalog?.lists||[]).find(i=>i.id===this.activeListId);if(e)return{...e,shared:!0};const t=this.savedLists.find(i=>i.id===this.activeListId);return t?{...t,shared:!1}:null}getActiveList(){const e=this.getActiveListMeta();return e?e.shared?{id:e.id,name:e.name,addedBy:e.addedBy,shared:!0,channelCount:e.channelCount,channels:this.sharedChannels.get(e.id)||null}:e:null}loadSavedLists(){try{const e=JSON.parse(localStorage.getItem(jh)||"[]");return Kh(e,Date.now())}catch{return[]}}saveSavedLists(){try{localStorage.setItem(jh,JSON.stringify(Kh(this.savedLists,Date.now())))}catch{}}applyIptvState(e){const t=(Array.isArray(e?.lists)?e.lists:[]).filter(s=>s&&typeof s.id=="string").map(s=>({id:s.id,name:typeof s.name=="string"&&s.name?s.name:"Untitled list",addedBy:typeof s.addedBy=="string"&&s.addedBy?s.addedBy:"Someone",channelCount:Number(s.channelCount)||0})),i=e?.epg&&typeof e.epg=="object"?e.epg:null;this.sharedCatalog={lists:t,epg:i?{name:typeof i.name=="string"&&i.name?i.name:"Program guide",updatedAt:Number(i.updatedAt)||0,channelCount:Number(i.channels)||0,programmes:Number(i.programmes)||0}:null};for(const s of[...this.sharedChannels.keys()])t.some(r=>r.id===s)||this.sharedChannels.delete(s);this.activeListId&&!this.getActiveListMeta()&&(this.activeListId=t[0]?.id||this.savedLists[0]?.id||null,this.activeChannelIndex=-1),this.dom?.iptvSelect&&this.renderIptvSection(),this.dom?.guideDialog?.open&&this.renderGuide(),this.dom?.controlsDialog?.open&&this.renderControls()}applySharedList(e){const t=String(e?.listId||""),i=eM(e?.channels,Hn.CHANNELS_MAX);if(!(!t||!i.length)){if(this.sharedChannels.set(t,i),this.pendingFlip&&t===this.activeListId){const s=this.pendingFlip;this.pendingFlip=0,this.flipChannel(s);return}this.dom?.guideDialog?.open&&this.guideListId===t&&this.renderGuide(),this.dom?.controlsDialog?.open&&this.renderIptvSection()}}requestSharedChannels(e){!e||this.sharedChannels.has(e)||(typeof this.net?.sendIptvListGet=="function"?this.net.sendIptvListGet(e):this.net?.send?.(ge.IPTV_LIST_GET,{listId:e}))}async uploadPlaylistText(e,t){if(!e||!e.trim()){this.setIptvStatus("Nothing to add — paste playlist text or choose a file first.",!0);return}if(!this.net?.uploadPlaylistText){this.setIptvStatus("Multiplayer is offline — the theater cannot store lists right now.",!0);return}if(e.length>Hn.LIST_TEXT_MAX){this.setIptvStatus(tM("text_too_large"),!0);return}this.setIptvStatus("Adding to the theater library…");try{const i=await this.net.uploadPlaylistText(e,t,this.net.nickname);this.setIptvStatus(`"${i.list.name}" added to the theater library — ${i.list.channelCount} channels for everyone in the auditorium.`)}catch(i){this.setIptvStatus(i.message||"The theater could not accept that playlist.",!0)}}async importPlaylistFile(e){if(e)try{const t=new FileReader;t.onload=()=>{const i=e.name.replace(/\.(m3u8?|txt)$/i,"");this.uploadPlaylistText(String(t.result||""),i)},t.onerror=()=>this.setIptvStatus("Could not read that file.",!0),t.readAsText(e)}catch{this.setIptvStatus("Could not read that file.",!0)}}async importPlaylistUrl(){const e=(this.dom?.iptvUrl?.value||"").trim();if(!/^https?:\/\//i.test(e)){this.setIptvStatus("Enter an http(s) URL pointing at an .m3u / .m3u8 playlist.",!0);return}if(!this.net?.importPlaylistFromUrl){this.setIptvStatus("Multiplayer is offline — the theater cannot fetch lists right now.",!0);return}this.setIptvStatus("Fetching the playlist for the whole auditorium…");try{const t=await this.net.importPlaylistFromUrl(e,null,this.net.nickname);this.setIptvStatus(`"${t.list.name}" added to the theater library — ${t.list.channelCount} channels for everyone in the auditorium.`)}catch(t){this.setIptvStatus(t.message||"Could not fetch that playlist.",!0)}}async pushActivePersonalList(){const e=this.getActiveListMeta();if(!e||e.shared){this.setIptvStatus("Select one of your own lists to add it to the theater library.",!0);return}const t=nM(e.channels);await this.uploadPlaylistText(t,e.name)}deleteActiveList(){const e=this.getActiveListMeta();if(!e){this.setIptvStatus("Select a list to remove.",!0);return}if(e.shared){typeof this.net?.sendIptvListRemove=="function"?this.net.sendIptvListRemove(e.id):this.net?.send?.(ge.IPTV_LIST_REMOVE,{listId:e.id}),this.setIptvStatus(`Removing "${e.name}" from the theater library…`);return}this.savedLists=this.savedLists.filter(t=>t.id!==e.id),this.saveSavedLists(),this.activeListId===e.id&&(this.activeListId=this.getActiveListMeta()?this.activeListId:this.sharedCatalog?.lists?.[0]?.id||this.savedLists[0]?.id||null,this.activeChannelIndex=-1),this.renderIptvSection(),this.setIptvStatus(`Deleted "${e.name}" from your saved lists.`)}renderIptvSection(){if(!this.dom?.iptvSelect)return;const e=this.dom.iptvSelect,t=this.sharedCatalog?.lists||[],i=this.savedLists;if(e.innerHTML="",!t.length&&!i.length){const o=document.createElement("option");o.value="",o.textContent="No channel lists yet — add one below",e.append(o),e.disabled=!0,this.activeListId=null}else{if(e.disabled=!1,t.length){const a=document.createElement("optgroup");a.label="Theater library — everyone can browse";for(const l of t){const c=document.createElement("option");c.value=l.id,c.textContent=`${l.name} (${l.channelCount})`,a.append(c)}e.append(a)}if(i.length){const a=document.createElement("optgroup");a.label="Your lists — private until added";for(const l of i){const c=document.createElement("option");c.value=l.id,c.textContent=`${l.name} (${l.channels.length})`,a.append(c)}e.append(a)}this.getActiveListMeta()||(this.activeListId=t[0]?.id||i[0].id,this.activeChannelIndex=-1),e.value=this.activeListId;const o=this.getActiveListMeta();o?.shared&&this.requestSharedChannels(o.id)}const s=this.getActiveList(),r=s?.channels?.[this.activeChannelIndex];this.dom.iptvCurrent.textContent=r?`Tuned: ${r.name}`:this.state?.now?`On screen: ${this.state.now.title}`:"No channel tuned",this.dom.iptvPush&&(this.dom.iptvPush.hidden=!(s&&!s.shared))}rememberChannelFor(e){if(!e)return;const t=this.getActiveList();if(!t?.channels)return;const i=t.channels.findIndex(s=>s.url===e);i!==-1&&(this.activeChannelIndex=i)}flipChannel(e){const t=this.getActiveList();if(!t||!t.channels||!t.channels.length){if(t?.shared){this.pendingFlip=e,this.requestSharedChannels(t.id),this.setIptvStatus("Fetching the theater channel list…");return}this.setIptvStatus("No channel list available — add a playlist to the theater library (paste text, file, or URL) to start flipping.",!0),this.openControls();return}const i=t.channels.length;let s=this.activeChannelIndex;s<0||s>=i?s=e>0?0:i-1:s=(s+e+i)%i,this.tuneChannel(t,s)}tuneChannel(e,t){const i=e?.channels?.[t];i&&(this.activeListId=e.id,this.activeChannelIndex=t,this.sendChannel(i.url,i.name),this.renderIptvSection(),this.dom?.guideDialog?.open&&this.renderGuide())}channelKey(e){return(e?.tvgId||e?.name||"").trim()}formatGuideTime(e){if(!Number.isFinite(e))return"";try{return new Date(e).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}catch{return""}}scheduleTextFor(e){const t=this.epgSchedule.get(this.channelKey(e));if(!t)return null;const i=[];return t.now&&i.push(`Now ${this.formatGuideTime(t.now.start)}–${this.formatGuideTime(t.now.stop)} · ${t.now.title}`),t.next&&i.push(`Next ${this.formatGuideTime(t.next.start)} · ${t.next.title}`),i.join("   ·   ")||null}requestEpgSchedule(){if(!this.dom?.guideDialog?.open||!this.sharedCatalog?.epg)return;const e=this.getActiveList();if(!e?.channels)return;const t=[],i=new Set;for(const s of e.channels){if(!Yh(s,this.guideCountry,this.guideCategory))continue;const r=this.channelKey(s);if(!(!r||i.has(r))&&(i.add(r),t.push(r),t.length>=Hn.EPG_LOOKUP_MAX))break}t.length&&(typeof this.net?.sendEpgLookup=="function"?this.net.sendEpgLookup(t):this.net?.send?.(ge.EPG_LOOKUP,{keys:t}))}startEpgRefresh(){this.stopEpgRefresh(),this.epgTimer=setInterval(()=>{if(!this.dom?.guideDialog?.open){this.stopEpgRefresh();return}this.requestEpgSchedule()},cM)}stopEpgRefresh(){this.epgTimer&&(clearInterval(this.epgTimer),this.epgTimer=null)}applyEpgSchedule(e){const t=Array.isArray(e?.entries)?e.entries:[];for(const i of t)typeof i?.key=="string"&&this.epgSchedule.set(i.key,{now:i.now||null,next:i.next||null});!this.dom?.guideDialog?.open||!t.length||this.dom.guideList.querySelectorAll("[data-epg-key]").forEach(i=>{const s=this.channelByKey?.get(i.dataset.epgKey),r=s?this.scheduleTextFor(s):null;r!==null&&(i.textContent=r)})}renderGuide(){if(!this.dom?.guideDialog)return;const e=this.getActiveListMeta(),t=this.getActiveList();this.guideListId!==(e?.id||null)&&(this.guideListId=e?.id||null,this.guideCountry="All",this.guideCategory="All"),this.dom.guideTitle.textContent=e?`${e.name}${e.shared?" · theater library":" · your list"}`:"Channel Guide";const i=this.sharedCatalog?.epg;this.dom.guideEpg.textContent=i?`Program guide: ${i.name} — ${i.channelCount} channels with listings${e?.shared?"":" (matching may be limited on private lists)"}`:"No program guide uploaded — rows show channels only.",e?.shared&&!t?.channels&&this.requestSharedChannels(e.id);const s=t?.channels||[],r=fM(s),o=r.countries.length>0;if(this.dom.guideCountryRow.hidden=!o,this.dom.guideGroups.hidden=!0,t?.channels&&o){r.countries.includes(this.guideCountry)||(this.guideCountry="All");const u=this.dom.guideCountrySelect;u.innerHTML="";for(const h of["All countries",...r.countries]){const v=document.createElement("option");v.value=h==="All countries"?"All":h,v.textContent=h,u.append(v)}u.value=this.guideCountry;const f=r.categoriesFor(this.guideCountry);f.includes(this.guideCategory)||(this.guideCategory="All");const d=this.dom.guideGroups;if(d.innerHTML="",f.length){d.hidden=!1;for(const h of["All categories",...f]){const v=h==="All categories"?"All":h,g=document.createElement("button");g.type="button",g.className=`theater-chip ${v===this.guideCategory?"active":""}`,g.textContent=h,g.addEventListener("click",()=>{this.guideCategory=v,this.renderGuide(),this.requestEpgSchedule()}),d.append(g)}}this.guideCountry!=="All"||this.guideCategory}const a=this.dom.guideList;if(a.innerHTML="",this.channelByKey=new Map,!e){this.dom.guideCount.textContent="No list loaded";const u=document.createElement("div");u.className="theater-empty",u.textContent="The theater has no channel lists yet — open the Screen controls and add a playlist (paste text, upload a file, or fetch a URL). Everyone here will be able to browse it.",a.append(u);return}if(!t?.channels){this.dom.guideCount.textContent="Fetching the theater channel list…";const u=document.createElement("div");u.className="theater-empty",u.textContent="Fetching the theater channel list…",a.append(u);return}let l=0;if(t.channels.forEach((u,f)=>{if(!Yh(u,this.guideCountry,this.guideCategory))return;l+=1;const d=this.channelKey(u);this.channelByKey.set(d,u);const h=document.createElement("div");if(h.className=`theater-channel-row ${f===this.activeChannelIndex?"current":""}`,u.logo&&/^https?:\/\//i.test(u.logo)){const g=document.createElement("img");g.src=u.logo,g.alt="",g.loading="lazy",g.addEventListener("error",()=>{g.hidden=!0}),h.append(g)}const v=document.createElement("span");if(v.className="theater-channel-name",v.textContent=u.name||"Channel",h.append(v),u.group){const g=document.createElement("span");g.className="theater-group-tag",g.textContent=u.group,h.append(g)}if(this.sharedCatalog?.epg){const g=document.createElement("span");g.className="theater-channel-epg",g.dataset.epgKey=d,g.textContent=this.scheduleTextFor(u)||"",h.append(g)}h.addEventListener("click",()=>{this.tuneChannel(t,f),this.dom.guideDialog.close()}),a.append(h)}),!l){const u=document.createElement("div");u.className="theater-empty",u.textContent="No channels match this country and category.",a.append(u)}const c=e.shared?"theater library":"your lists";this.dom.guideCount.textContent=`${t.channels.length} channels · showing ${l}${this.state?.now?` · on screen: ${this.state.now.title}`:""} · ${c}`,this.requestEpgSchedule()}}const vM=3e4,_M=1e4;function yM({dialog:n,container:e,closeButton:t,net:i,getDestinations:s,onTravel:r,onOpen:o=null,onClose:a=null,now:l=()=>Date.now(),schedule:c=(g,m)=>setTimeout(g,m),cancel:u=g=>clearTimeout(g),newRequestId:f=()=>`dir_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,getActiveElement:d=()=>typeof document<"u"?document.activeElement:null,focusElement:h=g=>{g&&typeof g.focus=="function"&&g.focus()},createEl:v=g=>{if(typeof document>"u")throw new Error("createPlaceSelector needs a DOM or an injected createEl");return globalThis.document.createElement(g)}}={}){if(!n||typeof n.showModal!="function")throw new Error("createPlaceSelector requires a dialog with showModal");if(!e)throw new Error("createPlaceSelector requires a container element");if(typeof i?.send!="function"||typeof i?.on!="function")throw new Error("createPlaceSelector requires a net facade with send/on");if(typeof s!="function")throw new Error("createPlaceSelector requires a getDestinations provider");if(typeof r!="function")throw new Error("createPlaceSelector requires an onTravel seam");let g=!1,m=null,p=null,S=null;const E=new Map,_=new Map;function M(){g&&(p=f(),i.send(ge.PLACE_DIRECTORY_GET,{requestId:p}))}function x(A){if(!g||!A||typeof A!="object"||A.requestId!==p||!Array.isArray(A.entries))return;const H=l();for(const V of A.entries)!V||typeof V!="object"||typeof V.roomId!="string"||_.set(V.roomId,{occupancy:Number.isSafeInteger(V.occupancy)&&V.occupancy>=0?V.occupancy:null,activity:typeof V.activity=="string"&&V.activity.length>0?V.activity:null,atmosphereLabel:typeof V.atmosphereLabel=="string"&&V.atmosphereLabel.length>0?V.atmosphereLabel.slice(0,64):null,fetchedAt:H});y()}function w(A){const H=_.get(A);return!H||l()-H.fetchedAt>vM?null:H}function R(A){return A===0?{text:"Empty right now",label:"Nobody here right now"}:{text:`${A} here`,label:`${A} here now`}}function y(){for(const[A,H]of E){const V=w(A),Z=V&&Number.isSafeInteger(V.occupancy)&&V.occupancy>=0;if(Z){const ve=R(V.occupancy);H.countEl.textContent=ve.text,H.countEl.setAttribute("title","Live occupancy"),H.countEl.setAttribute("aria-label",ve.label)}else H.countEl.textContent="—",H.countEl.setAttribute("title","Occupancy unknown right now"),H.countEl.setAttribute("aria-label","Occupancy unknown");H.activityEl.textContent=V?.activity??"";const le=Z?V?.atmosphereLabel??"":"";H.weatherEl.textContent=le,le?H.button.setAttribute("data-atmosphere",le):H.button.removeAttribute?.("data-atmosphere")}}function b(){m=null,g&&(M(),y(),P())}function P(){N(),m=c(b,_M)}function N(){m!=null&&u(m),m=null}function U(A){const H=v("button");H.type="button",H.className="district-choice place-card"+(A.current?" active":"");const V=v("div"),Z=v("span");Z.className="micro",Z.textContent=A.micro??"";const le=v("strong");if(le.textContent=A.name??A.roomId,V.append(Z,le),H.append(V),A.description){const q=v("span");q.className="desc",q.textContent=A.description,H.append(q)}const ve=v("div");if(ve.className="place-card-meta",A.badgeText){const q=v("span");q.className=`status-badge ${A.badgeClass??""}`,q.textContent=A.badgeText,ve.append(q)}const Oe=v("span");Oe.className="place-activity";const K=v("span");K.className="place-count",ve.append(Oe,K),H.append(ve);const G=v("span");return G.className="place-weather micro",H.append(G),H.onclick=()=>{L(),r(A.roomId)},{button:H,countEl:K,activityEl:Oe,weatherEl:G}}function I(A,H,V){const Z=v(V?"details":"div");if(Z.className="place-group"+(V?" place-group-legacy":" place-group-featured"),V){Z.open=!1;const ve=v("summary");ve.className="micro place-group-label",ve.textContent=A,Z.append(ve)}else{const ve=v("div");ve.className="micro place-group-label",ve.textContent=A,Z.append(ve)}const le=v("div");le.className="place-cards";for(const ve of H){const Oe=U(ve);E.set(ve.roomId,Oe),le.append(Oe.button)}return Z.append(le),Z}function F(){e.textContent="",E.clear();const A=s()??[],H=A.filter(Z=>Z?.featured),V=A.filter(Z=>!Z?.featured);H.length>0&&e.append(I("FEATURED",H,!1)),V.length>0&&e.append(I("LEGACY AREAS",V,!0))}function B(){g||n.open||(o?.(),g=!0,_.clear(),S=d()??null,F(),y(),n.showModal(),M(),P())}function L(){!g&&!n.open||(g=!1,p=null,N(),_.clear(),n.open&&n.close(),a?.(),S&&h(S),S=null)}return n.addEventListener?.("cancel",A=>{A?.preventDefault?.(),L()}),t?.addEventListener?.("click",L),i.on(ge.PLACE_DIRECTORY,x),i.onDisconnect?.(()=>{p=null,N(),g&&(_.clear(),y())}),i.onConnect?.(()=>{g&&(M(),P())}),{open:B,close:L,isOpen:()=>g,snapshot(){return{open:g,requestId:p,pollArmed:m!=null,counts:new Map(_)}}}}const ui=3,xM=4,bM=6,MM=-.9,SM=.7,EM=[Math.PI/4,0,-Math.PI/4];function wM(n){return(n+1)%xM}function TM(n){return Math.min(SM,Math.max(MM,n))}function AM(n,e,t,i){if(n===ui){const r=Math.sin(e),o=Math.cos(e),a=-r,l=-o,c=o,u=-r;return{x:c*t+a*-i,z:u*t+l*-i}}const s=EM[n]??0;return{x:t*Math.cos(s)+i*Math.sin(s),z:-t*Math.sin(s)+i*Math.cos(s)}}function CM(n,e,t,i,s){return s||Math.hypot(t-n,i-e)>bM}const Ro=Object.freeze({IDLE:"idle",PREPARING:"preparing",ACTIVE:"active",FAILED:"failed"}),Ls=Object.freeze({OFFLINE:"offline",JOINING:"joining",ONLINE:"online"});function _f(n,{hasDefinition:e=()=>!1,theaterId:t=wt.THEATER}={}){if(typeof n!="string"||n.length===0)return{status:"ok",requested:null,roomId:t,kind:"place",def:null,fallback:!1};if(n===wt.MARKET)return{status:"ok",requested:n,roomId:n,kind:"market",def:null,fallback:!1};if(wt.isGarden(n))return{status:"ok",requested:n,roomId:n,kind:"garden",def:null,fallback:!1};const i=e(n);return i?{status:"ok",requested:n,roomId:n,kind:"place",def:i,fallback:!1}:{status:"unknown",requested:n,roomId:t,kind:"place",def:null,fallback:!0}}function RM({isGardenRoom:n=!1,gardenBeds:e=null,completed:t=!1}={}){return n?{kind:"garden",value:e??null}:{kind:"district",value:t===!0}}function PM(){return{value:0}}function IM(n){return n.value+=1,n.value}function Jh(n,e){return n.value===e}function Qh(n=null){return{phase:Ls.OFFLINE,roomId:n}}function LM(n){if(n?.kind==="place"&&n.def){const e=n.def.spawn??[-9,0],t=n.def.companionSpawn??[e[0]+.8,e[1]+1];return{spawn:e,companionSpawn:t}}return n?.kind==="garden"?{spawn:[-9.5,0],companionSpawn:[-8.7,1]}:{spawn:[0,3],companionSpawn:[.8,4]}}function DM(n){return!!n&&typeof n.then=="function"}function NM({resolve:n=null,hasDefinition:e=()=>!1,theaterId:t,build:i,controllerFor:s=null,callAdapter:r=null,seatControl:o=null,resetInput:a,placeActors:l,bindNetwork:c,present:u,persistVisit:f=null,clearRoster:d=null,adoptWorld:h=null}){if(typeof i!="function")throw new Error("createPlaceRuntime requires a build seam");if(typeof a!="function")throw new Error("createPlaceRuntime requires a resetInput seam");if(typeof l!="function")throw new Error("createPlaceRuntime requires a placeActors seam");if(typeof c!="function")throw new Error("createPlaceRuntime requires a bindNetwork seam");if(!u||typeof u!="object")throw new Error("createPlaceRuntime requires a present surface");const v=typeof n=="function"?M=>n(M):M=>_f(M,e),g={activeId:null,activeWorld:null,activeResolution:null,activeController:null,generation:PM(),phase:Ro.IDLE,network:Qh(null),lastError:null,buildCount:0};function m(){const M=g.activeController;g.activeController=null;try{M?.deactivate?.()}catch{}try{g.activeId!=null&&r?.onPlaceLeaving?.(g.activeId)}catch{}try{o?.standUp?.()}catch{}}function p(M,x,w){const R=typeof s=="function"?s(M):null;g.activeController=R??null;try{R?.activate?.({roomId:M.roomId,world:x,generation:w,def:M.def??null})}catch{g.activeController=null}}function S(M,x,w){m(),g.activeWorld&&g.activeWorld!==x&&(g.activeWorld.group.visible=!1),g.activeWorld=x,g.activeId=M.roomId,g.activeResolution=M,g.lastError=null,x.group.visible=!0,h?.(x,M),a(),l(M,LM(M)),u.destination?.(M),f?.(M),d?.(),g.network=Qh(M.roomId),g.network.phase=Ls.JOINING,u.network?.(g.network),c(M.roomId),p(M,x,w);try{r?.onPlaceReady?.({roomId:M.roomId,zones:x.environment?.zones??[],seatGroup:null})}catch{}u.arrived?.(M),g.phase=Ro.ACTIVE}function E(M,x,w){return Jh(g.generation,w)?(g.phase=Ro.FAILED,g.lastError=x,u.travelError?.(M,x),{status:"build-failed",roomId:g.activeId,requested:M.requested,error:x}):{status:"stale",generation:w}}function _(M,x,w){return Jh(g.generation,w)?!x||!x.group?E(M,new Error(`Destination "${M.requested??M.roomId}" could not be prepared.`),w):(M.fallback&&u.fallback?.(M),S(M,x,w),{status:M.fallback?"fallback":"ok",roomId:M.roomId,requested:M.requested,resolution:M}):{status:"stale",generation:w}}return{travel(M){const x=v(M),w=IM(g.generation);let R;try{g.phase=Ro.PREPARING,R=i(x),g.buildCount+=1}catch(y){return E(x,y,w)}return DM(R)?R.then(y=>_(x,y,w),y=>E(x,y,w)):_(x,R,w)},markNetworkOnline(){const M=g.network,x={phase:Ls.ONLINE,roomId:g.activeId},w=M.phase!==x.phase||M.roomId!==x.roomId;return g.network=x,w&&u.network?.(x),x},markNetworkOffline(){const M=g.network;return M.phase===Ls.OFFLINE?M:(g.network={phase:Ls.OFFLINE,roomId:g.activeId},u.network?.(g.network),g.network)},retry(){return g.activeId&&(g.network={phase:Ls.JOINING,roomId:g.activeId},u.network?.(g.network),c(g.activeId)),g.network},notifySeatChanged(M){try{g.activeController?.onSeatChanged?.(M)}catch{}},snapshot(){return{activeId:g.activeId,activeWorld:g.activeWorld,activeController:g.activeController,resolution:g.activeResolution,generation:g.generation.value,phase:g.phase,network:{...g.network},lastError:g.lastError,buildCount:g.buildCount}}}}const ed="theater",UM=Object.freeze(["controlsDialog","guideDialog","torrentDialog","playlistDialog","playlistChoiceDialog"]);function OM({ui:n}){if(!n||typeof n.setRoomActive!="function")throw new Error("The theater adapter requires the TheaterScreenUI instance");let e=!1;function t(){for(const i of UM){const s=n.dom?.[i];s?.open&&s.close()}}return{get active(){return e},activate(){e||(e=!0,n.setRoomActive(!0),n.setWatchMode(!0))},deactivate(){e&&(e=!1,n.setSeated(!1),n.setWatchMode(!1),n.setRoomActive(!1),n.updateScreenQuad(null),t())},onSeatChanged({seated:i}={}){e&&(n.setSeated(!!i),n.setWatchMode(!!i))},openScreen(){e&&n.openControls()}}}function FM(n){return Kx(ed),jx(ed,n)}const Pr={fogColor:"#586173",fogDensity:.012,skyColor:"#a07b7f",groundColor:"#535f63",hemisphereIntensity:2.2,sunColor:"#ffd09b",sunIntensity:2.8,exposure:.95,skyPhase:.65},bc={...Pr,fogColor:"#4f6472",skyColor:"#6a7b88",sunColor:"#c5d0d7",sunIntensity:1.6,skyPhase:.72},td={...bc,fogColor:"#344e62",fogDensity:.022,skyColor:"#465e73",sunIntensity:1.4,skyPhase:.78},nd={...Pr,fogColor:"#23374d",skyColor:"#2c425b",sunColor:"#a9c2df",sunIntensity:1.2,hemisphereIntensity:1.8,skyPhase:.86},kM=[{atMs:0,intensity:0,rain:0,cloud:.1,wetness:0,wind:[.12,.04],visuals:nd},{atMs:6e4,intensity:0,rain:0,cloud:.15,wetness:0,wind:[.1,.03],visuals:Pr},{atMs:3e5,intensity:0,rain:0,cloud:.15,wetness:0,wind:[.1,.03],visuals:Pr},{atMs:36e4,intensity:0,rain:0,cloud:.7,wetness:.14,wind:[.2,.06],visuals:bc},{atMs:6e5,intensity:0,rain:0,cloud:.7,wetness:.7,wind:[.2,.06],visuals:bc},{atMs:66e4,intensity:.35,rain:.35,cloud:.8,wetness:.64,wind:[.25,.08],visuals:td},{atMs:9e5,intensity:.35,rain:.35,cloud:.8,wetness:.4,wind:[.25,.08],visuals:td},{atMs:96e4,intensity:0,rain:0,cloud:.1,wetness:.32,wind:[.12,.04],visuals:nd}],BM={"rain-night":{weather:"fixed",intensity:.8,wind:[.2,.05],rain:.8,cloud:.8,wetness:1,events:{lightning:!0,meteor:!1},visuals:{fogColor:"#283f51",fogDensity:.022,skyColor:"#657d94",groundColor:"#465d60",hemisphereIntensity:2.4,sunColor:"#b8cbd8",sunIntensity:2.2,exposure:.9,skyPhase:.82},audio:{rain:1,roof:0,wind:.3,lowpassHz:6e3}},"desert-night":{weather:"fixed",intensity:0,wind:[.12,.04],rain:0,cloud:.05,wetness:0,events:{lightning:!1,meteor:!0},visuals:{fogColor:"#111b2b",fogDensity:.008,skyColor:"#7486a7",groundColor:"#76634f",hemisphereIntensity:1.8,sunColor:"#b1c6e7",sunIntensity:1.5,exposure:.85,skyPhase:.8},audio:{rain:0,roof:0,wind:.2,lowpassHz:6e3}},"rooftop-cycle":{weather:"scheduled",intensity:0,wind:[.1,.03],rain:0,cloud:.15,wetness:0,events:{lightning:!1,meteor:!1},schedule:{cycleMs:12e5,keyframes:kM},visuals:Pr,audio:{rain:0,roof:0,wind:.2,lowpassHz:6e3}}},HM=Object.freeze({minMs:45e3,maxMs:9e4}),zM=Object.freeze({minMs:35e3,maxMs:7e4}),VM=(n,e)=>Object.freeze({lightning:n?Object.freeze({...HM}):null,meteor:e?Object.freeze({...zM}):null});function GM(n){return n?Object.freeze({cycleMs:n.cycleMs,keyframes:Object.freeze(n.keyframes.map(e=>Object.freeze({...e,wind:Object.freeze([...e.wind])})))}):null}function Is(n){return Object.freeze({weather:"fixed",intensity:0,wind:Object.freeze([0,0]),rain:0,cloud:0,wetness:0,events:null,schedule:null,visuals:Object.freeze({}),audio:Object.freeze({}),...n,wind:Object.freeze([...n.wind??[0,0]]),events:n.events?VM(n.events.lightning,n.events.meteor):null,schedule:GM(n.schedule),visuals:Object.freeze({...n.visuals}),audio:Object.freeze({...n.audio})})}const Mc=Object.freeze({...Object.fromEntries(Object.entries(BM).map(([n,e])=>[n,Is(e)])),clear:Is({weather:"fixed",intensity:0,wind:[.05,0],rain:0,cloud:.15,wetness:0,visuals:{fogColor:"#8fa3a8",fogDensity:.02,skyColor:"#9db6bd",groundColor:"#5c6a5e",hemisphereIntensity:.9,sunColor:"#ffe0a5",sunIntensity:1.1,exposure:1,skyPhase:.35},audio:{rain:0,roof:0,wind:.1,lowpassHz:6e3}}),rain:Is({weather:"fixed",intensity:.6,wind:[.2,.05],rain:.7,cloud:.7,wetness:1,events:{lightning:!0,meteor:!1},visuals:{fogColor:"#5d6d72",fogDensity:.05,skyColor:"#51646e",groundColor:"#3c4a46",hemisphereIntensity:.55,sunColor:"#c8d2cf",sunIntensity:.45,exposure:.9,skyPhase:.8},audio:{rain:1,roof:0,wind:.3,lowpassHz:6e3}}),storm:Is({weather:"fixed",intensity:1,wind:[-.7,.35],rain:1,cloud:.95,wetness:1,events:{lightning:!0,meteor:!0},visuals:{fogColor:"#43525c",fogDensity:.07,skyColor:"#37444f",groundColor:"#333f3c",hemisphereIntensity:.4,sunColor:"#b3c0c4",sunIntensity:.3,exposure:.82,skyPhase:.9},audio:{rain:1,roof:.6,wind:.7,lowpassHz:4800}}),"dry-heat":Is({weather:"fixed",intensity:.2,wind:[.3,-.1],rain:0,cloud:.05,wetness:0,visuals:{fogColor:"#c7b294",fogDensity:.03,skyColor:"#d8c9a6",groundColor:"#8a7354",hemisphereIntensity:1,sunColor:"#ffd9a0",sunIntensity:1.25,exposure:1.05,skyPhase:.5},audio:{rain:0,roof:0,wind:.25,lowpassHz:6e3}}),"diurnal-rain":Is({weather:"scheduled",intensity:.5,wind:[.15,.05],rain:.5,cloud:.5,wetness:.5,events:{lightning:!1,meteor:!1},schedule:{cycleMs:144e4,keyframes:[{atMs:0,intensity:.15,wind:[.05,0],rain:0,cloud:.2,wetness:0},{atMs:48e4,intensity:.5,wind:[.2,.05],rain:.45,cloud:.55,wetness:.4},{atMs:96e4,intensity:.85,wind:[.35,.1],rain:.9,cloud:.85,wetness:1}]},visuals:{fogColor:"#71828a",fogDensity:.04,skyColor:"#7b8f98",groundColor:"#4c5852",hemisphereIntensity:.75,sunColor:"#e8d9b0",sunIntensity:.85,exposure:.95,skyPhase:0},audio:{rain:.5,roof:.1,wind:.2,lowpassHz:6e3}})});Object.freeze(Object.keys(Mc));function hi(n){return Object.prototype.hasOwnProperty.call(Mc,n)?Mc[n]:null}const WM=1,XM="atmosphere_state",qM=8*1024,$M=4,yf=12e4,Sc=64,jM=250,YM=Object.freeze(["fixed","scheduled"]),KM=Object.freeze(["fixed","accelerated"]),ZM=Object.freeze(["lightning","meteor"]),JM=2e4,QM=9e4,eS=5e3,ts=n=>Number.isSafeInteger(n)&&n>=0,Ir=(n,e,t)=>typeof n=="number"&&Number.isFinite(n)&&n>=e&&n<=t,eu=n=>Number.isSafeInteger(n)&&n>=0&&n<=4294967295,Lr=(n,e,t)=>n>=e&&n<=t,zn=n=>n<0?0:n>1?1:n,xf=(n,e)=>(n%e+e)%e;let xl=null;function tS(n){return xl||(xl=new TextEncoder),xl.encode(JSON.stringify(n)).length}function nS(n){return Math.imul(1664525,n)+1013904223>>>0}function bf(n){if(!eu(n))throw new TypeError("seed must be an unsigned 32-bit integer");let e=n>>>0;return()=>(e=nS(e),e)}function Ci(n){return n()/4294967296}function Mf(n){return n>0?n>=1?1:n*n*(3-2*n):0}function oi(n,e,t){return n+(e-n)*t}function Ec(n){return Array.isArray(n)&&n.length===2&&Number.isFinite(n[0])&&Number.isFinite(n[1])&&Lr(n[0],-1,1)&&Lr(n[1],-1,1)}function iS(n){return Array.isArray(n)&&n.length===3&&n.every(e=>typeof e=="number"&&Number.isFinite(e))}function sS(n){return!n||typeof n!="object"||Array.isArray(n)?"event_shape":typeof n.id=="string"&&Lr(n.id.length,1,Sc)?ZM.includes(n.kind)?ts(n.at)?Number.isInteger(n.durationMs)&&n.durationMs>0&&n.durationMs<=yf?Ir(n.intensity,0,1)?iS(n.origin)?null:"event_origin":"event_intensity":"event_duration":"event_at":"event_kind":"event_id"}function rS(n){return n==null?null:!n||typeof n!="object"||Array.isArray(n)?"transition_shape":typeof n.fromPreset=="string"&&typeof n.toPreset=="string"?Ir(n.fromIntensity,0,1)?Ir(n.toIntensity,0,1)?!Ec(n.fromWind)||!Ec(n.toWind)?"transition_wind":ts(n.startAt)?Number.isInteger(n.durationMs)&&n.durationMs>0&&n.durationMs<=yf?null:"transition_duration":"transition_start":"transition_to_intensity":"transition_from_intensity":"transition_preset"}function oS(n){return!n||typeof n!="object"||Array.isArray(n)?"time_shape":KM.includes(n.mode)?Ir(n.phase,0,1)?ts(n.anchorAt)?typeof n.rate=="number"&&Number.isFinite(n.rate)&&n.rate>=0?null:"time_rate":"time_anchor":"time_phase":"time_mode"}function aS(n){if(!n||typeof n!="object"||Array.isArray(n))return"state_shape";if(!eu(n.seed))return"seed";if(!YM.includes(n.mode))return"mode";if(!(typeof n.preset=="string"&&hi(n.preset)))return"preset";if(!Ir(n.intensity,0,1))return"intensity";if(!Ec(n.wind))return"wind";if(!ts(n.startedAt))return"started_at";const e=rS(n.transition);if(e)return e;const t=oS(n.time);if(t)return t;if(!Array.isArray(n.events)||n.events.length>$M)return"events_count";for(const i of n.events){const s=sS(i);if(s)return s}return null}function lS(n){if(!n||typeof n!="object"||Array.isArray(n))return{ok:!1,reason:"frame_shape"};if(n.type!==XM)return{ok:!1,reason:"type"};if(n.schemaVersion!==WM)return{ok:!1,reason:"schema_version"};if(tS(n)>qM)return{ok:!1,reason:"byte_size"};if(!(typeof n.roomId=="string"&&Lr(n.roomId.length,1,Sc)))return{ok:!1,reason:"room_id"};if(!ts(n.epoch))return{ok:!1,reason:"epoch"};if(!ts(n.revision))return{ok:!1,reason:"revision"};if(!ts(n.serverNow))return{ok:!1,reason:"server_now"};if(n.requestId!==void 0&&!(typeof n.requestId=="string"&&Lr(n.requestId.length,1,Sc)))return{ok:!1,reason:"request_id"};const e=aS(n.state);return e?{ok:!1,reason:e}:{ok:!0,value:n}}function cS(n,e){return!n||e.epoch>n.epoch?"new-epoch":e.epoch<n.epoch?"stale-epoch":e.revision>n.revision?"new-revision":e.revision<n.revision?"stale-revision":"duplicate"}function uS(n,e,t=eS){return Math.abs(e-n)>t}function hS(n,e){if(!n||typeof n!="object")return 0;if(n.mode!=="accelerated")return n.phase??0;const t=e-n.anchorAt;return xf(n.phase+t*n.rate/1e3,1)}function Sf(n,e){return xf(e,n.cycleMs)}function Ef(n,e,t,i){const s=n.length;let r=0;for(;r<s-1&&n[r+1].atMs<=e;)r+=1;const o=n[r],a=r+1>=s,l=n[(r+1)%s],c=a?t-o.atMs:l.atMs-o.atMs,u=c>0?c:1,f=Mf(zn((e-o.atMs)/u)),d=i??{};return d.intensity=oi(o.intensity,l.intensity,f),d.rain=oi(o.rain,l.rain,f),d.cloud=oi(o.cloud,l.cloud,f),d.wetness=oi(o.wetness,l.wetness,f),d.windX=oi(o.wind[0],l.wind[0],f),d.windZ=oi(o.wind[1],l.wind[1],f),d.keyframeU=f,d.wrapped=a,d}function dS(n,e,t){const i=t??{},s=hi(n.preset);let r=n.intensity,o=n.wind[0],a=n.wind[1],l=s?s.rain:0,c=s?s.cloud:0,u=s?s.wetness:0,f=null;const d=n.transition;if(d){const h=(e-d.startAt)/d.durationMs,v=zn(h);f=Mf(v),r=oi(d.fromIntensity,d.toIntensity,f),o=oi(d.fromWind[0],d.toWind[0],f),a=oi(d.fromWind[1],d.toWind[1],f);const g=hi(d.toPreset);g&&(l=g.rain,c=g.cloud,u=g.wetness)}else if(s&&s.schedule&&n.mode==="scheduled"){const h=Sf(s.schedule,e),v=Ef(s.schedule.keyframes,h,s.schedule.cycleMs,{});r=v.intensity,o=v.windX,a=v.windZ,l=v.rain,c=v.cloud,u=v.wetness}return i.intensity=zn(r),i.windX=o,i.windZ=a,i.rain=zn(l),i.cloud=zn(c),i.wetnessTarget=zn(u),i.timePhase=hS(n.time,e),i.transitionU=f,i}function fS(n,e,t){const i=t>0?t:0,s=e>n?JM:QM,r=e+(n-e)*Math.exp(-i/s);return zn(r)}function pS(n,e){const t=hi(n.preset);if(!t)return 0;if(n.mode==="scheduled"&&t.schedule){const i=Sf(t.schedule,e);return zn(Ef(t.schedule.keyframes,i,t.schedule.cycleMs,{}).wetness)}return zn(t.wetness)}function mS(n,{seed:e=0,now:t=0}={}){const i=hi(n);return i?{seed:eu(e)?e:0,mode:i.weather,preset:n,intensity:i.intensity,wind:[i.wind[0],i.wind[1]],startedAt:t,transition:null,time:{mode:"fixed",phase:i.visuals.skyPhase??0,anchorAt:t,rate:0},events:[]}:null}function gS(n,e,t=jM){return e<n.at?{state:"pending",leadMs:n.at-e,progress:0}:e<=n.at+n.durationMs+t?{state:"live",leadMs:0,progress:zn((e-n.at)/n.durationMs)}:{state:"expired",leadMs:0,progress:1}}function vS(n){const e=n/343*1e3;return Math.min(4e3,Math.max(500,e))}const _S=5e3,yS=32;function xS(n){return typeof n?.isActive=="function"&&n.isActive()}function bS({net:n,clock:e=()=>typeof performance<"u"?performance.now():Date.now(),requestTag:t=()=>`atmo-${Math.random().toString(36).slice(2,10)}`,resnapshotIntervalMs:i=_S,seenEventCap:s=yS}){if(!n||typeof n.on!="function"||typeof n.send!="function")throw new Error("createAtmosphereStateClient requires a net facade with on/send");let r=null,o=null,a=null,l=null,c=!1,u=!1,f=[];const d=new Map;let h=0,v=e(),g=-1/0;function m(){return h+(e()-v)}function p(A){h=A,v=e()}function S(A){if(!d.has(A))for(d.set(A,!0);d.size>s;){const H=d.keys().next().value;d.delete(H)}}function E(){f=[],d.clear()}function _({roomId:A,generation:H,def:V}={}){if(typeof A!="string"||A.length===0)return;const Z=V?.atmosphere?.preset;o=typeof Z=="string"?Z:null,(r!==A||!l)&&(a=null,l=o?mS(o,{seed:0,now:m()})??null:null,c=!1,E(),b=0,P=null,l&&p(m())),r=A,x("activate")}function M(){r=null,a=null,l=null,c=!1,E()}function x(A="manual"){if(r==null)return!1;const H=e();return H-g<i?!1:(g=H,n.send(ge.ATMOSPHERE_GET,{requestId:t(A).slice(0,64)}),!0)}function w(A){if(r==null||A?.roomId!==r)return;const H=lS(A);if(!H.ok){c=!1;return}const V=H.value,Z=cS(a,V);if(Z==="stale-epoch"||Z==="stale-revision")return;if(Z==="duplicate"){p(V.serverNow);return}const le=a!=null&&uS(m(),V.serverNow);le&&(E(),x("clock-jump")),u=le;const ve=Z==="new-epoch";a=V,l=V.state,c=!0,p(V.serverNow),ve&&E();const Oe=m();f=l.events.filter(K=>!(d.has(K.id)||ve&&K.at<Oe))}function R(A){r!=null&&(A?.roomId&&A.roomId!==r||(c=!1))}n.on(ge.ATMOSPHERE_STATE,w),n.on(ge.ATMOSPHERE_UNAVAILABLE,R),n.onDisconnect?.(()=>{c=!1,u=!1,E()}),n.onConnect?.(()=>{x("reconnect")});function y(){const A=m();f=f.filter(H=>H.at>A)}let b=0,P=null;function N(A={}){const H=m();return l?(dS(l,H,A),P==null?b=pS(l,H):b=fS(b,A.wetnessTarget,H-P),P=H,A.wetness=b,A.synced=c,A.active=!0,A.serverNow=H,A):(A.intensity=0,A.windX=0,A.windZ=0,A.rain=0,A.cloud=0,A.wetnessTarget=0,A.wetness=b,A.timePhase=0,A.transitionU=null,A.synced=!1,A.active=!1,A.serverNow=H,A)}function U(){if(u||r==null)return[];const A=m(),H=[];return f=f.filter(V=>{const Z=gS(V,A);return Z.state==="pending"?!0:(Z.state==="live"&&(S(V.id),H.push({event:V,progress:Z.progress})),!1)}),H}function I(A){return d.has(A)}function F(){return r!=null&&l!=null}function B(){return r==null?"inactive":l?c?"synchronized":"unsynchronized":"unsupported"}function L(){return l}return{activate:_,deactivate:M,sample:N,consumeDueEvents:U,hasSeenEvent:I,requestResnapshot:x,resume:y,isActive:F,status:B,getState:L,serverNow:m}}const $n=16,MS=.5,tu=n=>n<0?0:n>1?1:n;function SS(n){const e=tu(n);return e*e*(3-2*e)}function ES(n){if(!n||typeof n!="object")return null;const e=n.rect;if(!e)return null;const{minX:t,maxX:i,minZ:s,maxZ:r}=e;if(![t,i,s,r].every(Number.isFinite)||!(t<i)||!(s<r))return null;const o=Number.isFinite(n.roofY)?n.roofY:3,a=tu(Number.isFinite(n.exposure)?n.exposure:0),l=Number.isFinite(n.priority)?n.priority:0,c=Number.isFinite(n.feather)&&n.feather>0?n.feather:MS;return{id:typeof n.id=="string"&&n.id.length>0?n.id:"zone",rect:{minX:t,maxX:i,minZ:s,maxZ:r},roofY:o,exposure:a,priority:l,feather:c,audio:n.audio??null,acoustic:n.acoustic??null}}function wf(n){const e=[];if(Array.isArray(n))for(const t of n){const i=ES(t);if(i&&e.push(i),e.length>=$n)break}return e.sort(Tf),e}function wS(n,e,t){const i=Math.min(e-n.minX,n.maxX-e),s=Math.min(t-n.minZ,n.maxZ-t),r=Math.min(i,s);if(r>=0)return r;const o=Math.max(n.minX-e,0,e-n.maxX),a=Math.max(n.minZ-t,0,t-n.maxZ);return-Math.hypot(o,a)}function TS(n,e,t){const i=wS(n.rect,e,t);return SS((i+n.feather)/(2*n.feather))}function id(n){return[-n.priority,n.exposure,n.id]}function Tf(n,e){const t=id(n),i=id(e);for(let s=0;s<t.length;s++){if(t[s]<i[s])return-1;if(t[s]>i[s])return 1}return 0}function AS(n,e,t,i={}){let s=null,r=0;for(const o of n){const a=TS(o,e,t);a<=0||(s===null||Tf(o,s)<0)&&(s=o,r=a)}return s?(i.exposure=r>=1?s.exposure:tu(1+(s.exposure-1)*r),i.zoneId=s.id,i.weight=r,i):(i.exposure=1,i.zoneId=null,i.weight=0,i)}function CS(n,e,t){const i=Math.min(n.length,$n);for(let s=0;s<i;s++){const{rect:r}=n[s];e[s*4]=r.minX,e[s*4+1]=r.minZ,e[s*4+2]=r.maxX,e[s*4+3]=r.maxZ,t[s]=n[s].roofY}for(let s=i;s<$n;s++)e[s*4]=0,e[s*4+1]=0,e[s*4+2]=0,e[s*4+3]=0,t[s]=0;return i}const RS=90,PS=`
varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,IS=`
uniform vec3 uTopColor;
uniform vec3 uHorizonColor;
uniform vec3 uCloudColor;
uniform float uCloudOpacity;
uniform float uPhase;
uniform float uTime;
uniform float uDrift;
uniform vec2 uStarGrid;
uniform float uMilkyWay;
varying vec3 vDirection;

// Deterministic value noise (hash-based, no textures): two octaves are
// plenty for a soft overcast impression at isometric distance.
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float clouds(vec2 p) {
  float n = valueNoise(p) * 0.65 + valueNoise(p * 2.7 + 11.3) * 0.35;
  return smoothstep(0.42, 0.78, n);
}

void main() {
  float height = clamp(vDirection.y, 0.0, 1.0);
  vec3 sky = mix(uHorizonColor, uTopColor, pow(height, 0.62));
  // Cloud domain: project the upper hemisphere onto a plane and drift it
  // slowly with time (uDrift 0 stops all motion for reduced comfort tiers)
  // and rotate the domain by the shared time phase so scheduled places
  // agree on where the sky sits.
  float angle = uPhase * 6.2831853;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 domain = rot * vDirection.xz / max(vDirection.y, 0.24);
  float mask = smoothstep(0.02, 0.24, vDirection.y);
  float cloud = clouds(domain * 1.35 + vec2(uTime * 0.012 * uDrift, uTime * 0.007 * uDrift));
  vec3 color = mix(sky, uCloudColor, cloud * uCloudOpacity * mask);
  if (uStarGrid.x > 0.0) {
    vec3 direction = normalize(vDirection);
    vec2 uv = vec2(atan(direction.z,direction.x)/6.2831853+.5,asin(direction.y)/3.14159265+.5);
    vec2 cell = uv*uStarGrid;
    vec2 seed = floor(cell);
    vec2 center = vec2(.2+.6*hash(seed),.2+.6*hash(seed+19.));
    float star = 1.-smoothstep(.004,.022,length(fract(cell)-center));
    float twinkle = .95+.05*sin(uTime*.5*uDrift+hash(seed)*30.);
    color += vec3(.7,.79,1.)*star*twinkle*.9;
    float band = exp(-pow((direction.y-direction.x*.38-.25)*5.,2.));
    color += vec3(.07,.07,.11)*band*uMilkyWay*(.5+.5*valueNoise(uv*35.));
  }
  gl_FragColor = vec4(color, 1.0);
}
`;let bl=null;function LS(){return bl||(bl=new va(RS,24,12)),bl}function DS({drift:n=!0,stars:e=0,milkyWay:t=!1,tier:i="normal"}={}){const s=LS(),r=new Lt({vertexShader:PS,fragmentShader:IS,side:Zt,depthWrite:!1,fog:!1,uniforms:{uTopColor:{value:new Se("#9db6bd")},uHorizonColor:{value:new Se("#8fa3a8")},uCloudColor:{value:new Se("#77878c")},uCloudOpacity:{value:.2},uPhase:{value:0},uTime:{value:0},uDrift:{value:n?1:0},uStarGrid:{value:new Ee(e?i==="reduced"?25:60:0,i==="reduced"?20:25)},uMilkyWay:{value:t?1:0}}}),o=new ae(s,r);o.name="atmosphere-sky",o.renderOrder=-1,o.frustumCulled=!1,o.position.set(0,0,0);function a({topColor:u,horizonColor:f,cloudColor:d,cloudOpacity:h,phase:v,timeMs:g}){u&&r.uniforms.uTopColor.value.copy(u),f&&r.uniforms.uHorizonColor.value.copy(f),d&&r.uniforms.uCloudColor.value.copy(d),h!==void 0&&(r.uniforms.uCloudOpacity.value=h),v!==void 0&&(r.uniforms.uPhase.value=v),g!==void 0&&(r.uniforms.uTime.value=g/1e3)}function l(u){r.uniforms.uDrift.value=u?1:0}function c(){r.dispose()}return{mesh:o,setState:a,setDrift:l,dispose:c}}const Po=Object.freeze({normal:Object.freeze({drops:4096,splashes:128,runoff:64,spawnRate:140,splashRate:90}),reduced:Object.freeze({drops:1024,splashes:32,runoff:32,spawnRate:35,splashRate:22})}),Ml=9,Af=.55,NS=`
uniform float uTime;
uniform float uDensity;
uniform vec2 uWind;
uniform vec4 uCovers[${$n}];
uniform float uRoofY[${$n}];
uniform int uCoverCount;
attribute vec4 aSeed;   // x: baseX, y: baseZ, z: fall speed, w: phase seed
attribute float aTip;   // 0 = streak head, 1 = streak tail
varying float vAlpha;

// The roof plane covering this point, or -1.0 when the point is in the
// open. Mirrors coverRoofAt() in exposure.js exactly.
float coverRoof(vec3 p) {
  for (int i = 0; i < ${$n}; i++) {
    if (i >= uCoverCount) break;
    vec4 c = uCovers[i];
    if (p.x >= c.x && p.x <= c.z && p.z >= c.y && p.z <= c.w && p.y <= uRoofY[i]) {
      return uRoofY[i];
    }
  }
  return -1.0;
}

void main() {
  // Deterministic fall: the seed phase scrolls with time and speed, so the
  // CPU never advances a drop.
  float cycle = RAIN_HEIGHT_VALUE / aSeed.z;
  float y = mod(aSeed.w * RAIN_HEIGHT_VALUE + uTime * aSeed.z, RAIN_HEIGHT_VALUE);
  // Wind bends the column: drops drift horizontally as they descend, and
  // the streak aligns with the fall velocity so rain reads slanted.
  float fall = 1.0 - y / RAIN_HEIGHT_VALUE;
  vec3 head = vec3(aSeed.x + uWind.x * fall * 2.2, y, aSeed.y + uWind.y * fall * 2.2);
  float lengthJitter = 0.55 + fract(aSeed.w * 7.31) * 0.5;
  vec3 streakDir = normalize(vec3(uWind.x * 0.6, -aSeed.z, uWind.y * 0.6));
  vec3 tail = head + streakDir * lengthJitter * (aSeed.z * 0.055);

  // Segment masking: clip the tail at the roof plane when it falls under a
  // cover; if the head is under as well the segment degenerates away.
  float roofTail = coverRoof(tail);
  if (roofTail >= 0.0) {
    float denom = head.y - tail.y;
    float t = denom > 0.0001 ? clamp((roofTail - tail.y) / denom, 0.0, 1.0) : 0.0;
    vec3 clipPoint = mix(tail, head, t);
    tail = clipPoint;
    if (coverRoof(head) >= 0.0) head = clipPoint;
  }

  // Intensity gates which seeds are alive at all; alpha softens toward the
  // ground and very near the camera (first person stays usable).
  float gate = step(fract(aSeed.w * 13.7), uDensity);
  vec3 pos = aTip < 0.5 ? head : tail;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float nearFade = smoothstep(0.7, 2.4, -mv.z);
  vAlpha = gate * uDensity * nearFade * clamp(head.y / 2.5, 0.22, 1.0);
  gl_Position = projectionMatrix * mv;
}
`,US=`
uniform vec3 uColor;
varying float vAlpha;
void main() {
  if (vAlpha <= 0.003) discard;
  gl_FragColor = vec4(uColor, vAlpha * 0.42);
}
`,OS=`
uniform float uTime;
uniform float uLife;
attribute vec3 aSplash; // x, z, startTime
varying float vFade;
void main() {
  float age = uTime - aSplash.z;
  float live = step(0.0, age) * step(age, uLife);
  float growth = clamp(age / uLife, 0.0, 1.0);
  vFade = live * (1.0 - growth);
  vec3 pos = position * (0.25 + growth * 1.75) * live;
  pos.x += aSplash.x;
  pos.z += aSplash.z;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`,FS=`
uniform vec3 uColor;
uniform float uOpacity;
varying float vFade;
void main() {
  if (vFade <= 0.003) discard;
  gl_FragColor = vec4(uColor, vFade * uOpacity);
}
`,kS=`
uniform float uTime;
attribute vec3 aAnchor;  // roof-edge point the streak hangs from
attribute float aTip;    // 0 = top, 1 = bottom
attribute float aPhase;
varying float vAlpha;
void main() {
  // A short drip cycling down the anchor point; never below the ground.
  float cycle = fract(uTime * 0.45 + aPhase);
  vec3 top = aAnchor - vec3(0.0, cycle * 0.6, 0.0);
  top.y = max(top.y, 0.12);
  vec3 bottom = max(top - vec3(0.0, 0.55, 0.0), vec3(0.0, 0.05, 0.0));
  vec3 pos = aTip < 0.5 ? top : bottom;
  vAlpha = 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`,BS=`
uniform vec3 uColor;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor, vAlpha);
}
`,HS=new it;function zS(n,e,t,i){const s=t.maxX-t.minX,r=t.maxZ-t.minZ;for(let o=0;o<e;o++){const a=t.minX+Ci(i)*s,l=t.minZ+Ci(i)*r,c=7.5+Ci(i)*5.5,u=Ci(i);for(let f=0;f<2;f++){const d=(o*2+f)*4;n[d]=a,n[d+1]=l,n[d+2]=c,n[d+3]=u}}}function VS(n,e,t){const i=new Float32Array(n*2*3),s=new Float32Array(n*2*4),r=new Float32Array(n*2);zS(s,n,e,t);for(let c=0;c<n;c++)r[c*2]=0;for(let c=0;c<n;c++)r[c*2+1]=1;const o=new ft;o.setAttribute("position",new bt(i,3)),o.setAttribute("aSeed",new bt(s,4)),o.setAttribute("aTip",new bt(r,1)),o.boundingSphere=new Ui(new k(0,Ml/2,0),Math.max(GS(e),Ml));const a=new Lt({vertexShader:NS.replaceAll("RAIN_HEIGHT_VALUE",Ml.toFixed(1)),fragmentShader:US,uniforms:{uTime:{value:0},uDensity:{value:0},uWind:{value:new Ee(0,0)},uColor:{value:new Se("#9fb6bd")},uCovers:{value:Array.from({length:$n},()=>new ot(0,0,0,0))},uRoofY:{value:new Float32Array($n)},uCoverCount:{value:0}},transparent:!0,depthWrite:!1,fog:!1}),l=new Wd(o,a);return l.frustumCulled=!1,l.renderOrder=5,{mesh:l,geometry:o,material:a}}function GS(n){return Math.max(n.maxX-n.minX,n.maxZ-n.minZ)}function WS(n){const e=new Zs(.55,1,10);e.rotateX(-Math.PI/2);const t=new Float32Array(n*3);e.setAttribute("aSplash",new na(t,3));const i=new Lt({vertexShader:OS,fragmentShader:FS,uniforms:{uTime:{value:0},uLife:{value:Af},uColor:{value:new Se("#aec6cc")},uOpacity:{value:.5}},transparent:!0,depthWrite:!1,fog:!1}),s=new Li(e,i,n);for(let r=0;r<n;r++)s.setMatrixAt(r,HS);return s.instanceMatrix.needsUpdate=!0,s.frustumCulled=!1,s.renderOrder=6,s.count=n,{mesh:s,geometry:e,material:i,splashes:t}}function XS(n){const e=new Float32Array(n*2*3),t=new Float32Array(n*2*3),i=new Float32Array(n*2),s=new Float32Array(n*2),r=new ft;r.setAttribute("position",new bt(e,3)),r.setAttribute("aAnchor",new bt(t,3)),r.setAttribute("aTip",new bt(i,1)),r.setAttribute("aPhase",new bt(s,1));const o=new Lt({vertexShader:kS,fragmentShader:BS,uniforms:{uTime:{value:0},uColor:{value:new Se("#9fb6bd")}},transparent:!0,depthWrite:!1,fog:!1}),a=new Wd(r,o);return a.frustumCulled=!1,a.renderOrder=5,a.visible=!1,{mesh:a,geometry:r,material:o,anchorsAttr:t,tips:i,phases:s}}function qS({bounds:n={minX:-12,maxX:12,minZ:-10,maxZ:10},zones:e=[],anchors:t=[],tier:i="normal",seed:s=0}={}){let r=Po[i]?i:"normal",o=null,a=!1,l=!0,c=0,u=!0,f=-1/0;const d={reallocations:0,spawnedSplashes:0},h=new nt;h.name="atmosphere-precipitation";const v=bf(s>>>0);function g(){o&&m();const _=Po[r],M=VS(_.drops,n,v),x=WS(_.splashes),w=XS(_.runoff);h.add(M.mesh,x.mesh,w.mesh),o={rain:M,splash:x,runoff:w,cap:_},d.reallocations+=1,p(e),S(t),h.visible=l,u=!1}function m(){h.remove(o.rain.mesh,o.splash.mesh,o.runoff.mesh),o.rain.geometry.dispose(),o.rain.material.dispose(),o.splash.geometry.dispose(),o.splash.material.dispose(),o.runoff.geometry.dispose(),o.runoff.material.dispose()}function p(_){if(!o)return;const M=o.rain.material.uniforms.uCovers.value,x=o.rain.material.uniforms.uRoofY.value,w=new Float32Array($n*4),R=CS(_,w,x);for(let y=0;y<$n;y++)M[y].set(w[y*4],w[y*4+1],w[y*4+2],w[y*4+3]);o.rain.material.uniforms.uCoverCount.value=R}function S(_){if(!o)return;const{anchorsAttr:M,tips:x,phases:w}=o.runoff,R=o.cap.runoff;let y=0;if(Array.isArray(_))for(const b of _){if(y>=R)break;if(!b||typeof b!="object"||b.kind==="puddle")continue;const{x:P,z:N}=b;if(!Number.isFinite(P)||!Number.isFinite(N))continue;const U=Number.isFinite(b.y)?b.y:3,I=y*2*3;for(let F=0;F<2;F++)M[I+F*3]=P,M[I+F*3+1]=U+.02,M[I+F*3+2]=N,x[y*2+F]=F,w[y*2+F]=Ci(v);y+=1}for(let b=y;b<R;b++){const P=b*2*3;M.fill(0,P,P+6)}o.runoff.geometry.attributes.aAnchor.needsUpdate=!0,o.runoff.geometry.attributes.aTip.needsUpdate=!0,o.runoff.geometry.attributes.aPhase.needsUpdate=!0,o.runoff.mesh.visible=l&&y>0,o.runoff.count=y}g();let E=e;return{object3D:h,batchCount:3,get tier(){return r},get counts(){return{drops:o.cap.drops,splashes:o.cap.splashes,runoff:o.runoff.count}},get stats(){return d},setZones(_){E=_,p(E)},setAnchors(_){t=_,S(t)},setTier(_){return a||!Po[_]||_===r?!1:(r=_,g(),!0)},setVisible(_){l=!!_,h.visible=l,o&&(o.runoff.mesh.visible=l&&o.runoff.count>0)},update({timeMs:_,rain:M=0,windX:x=0,windZ:w=0,dtMs:R=0}){if(a||!o)return;const y=l&&M>.001,b=_/1e3;if(!y){u&&(o.rain.material.uniforms.uDensity.value=0,o.runoff.mesh.visible=!1,u=!1),b-f<Af+1&&(o.splash.material.uniforms.uTime.value=b);return}u=!0,o.runoff.mesh.visible=l&&o.runoff.count>0;const P=Po[r],N=r==="reduced"?M*.25:M,U=o.rain.material.uniforms;U.uTime.value=b,U.uDensity.value=Math.min(1,N),U.uWind.value.set(x,w),o.splash.material.uniforms.uTime.value=b;const I=Math.min(o.cap.splashes,Math.floor(R/1e3*P.splashRate*M));if(I>0){const F=o.splash.geometry.attributes.aSplash,B=F.array,L=n.maxX-n.minX,A=n.maxZ-n.minZ;for(let H=0;H<I;H++){const V=n.minX+Ci(v)*L,Z=n.minZ+Ci(v)*A;let le=!1;for(const Oe of E){const K=Oe.rect;if(V>=K.minX&&V<=K.maxX&&Z>=K.minZ&&Z<=K.maxZ){le=!0;break}}if(le)continue;const ve=c*3;B[ve]=V,B[ve+1]=Z,B[ve+2]=b,c=(c+1)%o.cap.splashes,d.spawnedSplashes+=1}F.needsUpdate=!0,f=b}o.runoff.material.uniforms.uTime.value=b},dispose(){a||(a=!0,o&&m(),h.removeFromParent())}}}const $S=.72,jS=.45,YS=.18,Ei=Object.freeze({normal:8,reduced:4}),Cf=128,KS=n=>n<0?0:n>1?1:n,sd=(n,e,t)=>n+(e-n)*t;function ZS(n=Cf,e=0){const t=new Uint8Array(n*n*4),i=bf(e>>>0),s=new Float32Array(n*n);for(let o=0;o<s.length;o++)s[o]=Ci(i);for(let o=0;o<n;o++)for(let a=0;a<n;a++){let l=0;for(const[f,d]of[[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const h=(a+f+n)%n,v=(o+d+n)%n;l+=s[v*n+h]}const c=Math.round(l/5*255),u=(o*n+a)*4;t[u]=c,t[u+1]=c,t[u+2]=c,t[u+3]=255}const r=new Gd(t,n,n,_n);return r.wrapS=r.wrapT=Ko,r.repeat.set(2,2),r.needsUpdate=!0,r}function JS({world:n=null,tier:e="normal",seed:t=0,wetMap:i=!0}={}){const s=n?.environment??{},r=Array.isArray(s.materialFamilies)?s.materialFamilies:[],o=[],a=[];for(const U of r)!U||!U.material||!U.dry||(U.sheltered?a:o).push(U);const l=new nt;l.name="atmosphere-surfaces";let c=!1,u=Ei[e]?e:"normal",f=null;if(i&&o.length>0){f=ZS(Cf,t);for(const{material:U}of o)U.roughnessMap=f,U.needsUpdate=!0}const d=Ei[u],h=(Array.isArray(s.emitterAnchors)?s.emitterAnchors:[]).filter(U=>U&&typeof U=="object"&&U.kind==="puddle"&&Number.isFinite(U.x)&&Number.isFinite(U.z)),v=new xn(1,1);v.rotateX(-Math.PI/2);const g=new Ze({color:"#2e4a52",transparent:!0,opacity:0,roughness:.08,metalness:.55,depthWrite:!1}),m=new Li(v,g,Ei.normal);m.name="atmosphere-puddles",m.frustumCulled=!1,m.renderOrder=4;const p=new it,S=new k,E=new Ks,_=new k;h.slice(0,Ei.normal).forEach((U,I)=>{S.set(U.x,Number.isFinite(U.y)?U.y:.17,U.z),_.set(Number.isFinite(U.w)?U.w:1,1,Number.isFinite(U.d)?U.d:1),p.compose(S,E,_),m.setMatrixAt(I,p)}),m.instanceMatrix&&(m.instanceMatrix.needsUpdate=!0),m.count=Math.min(h.length,d),m.visible=!1,l.add(m);const M=new xn(1,1);M.rotateX(-Math.PI/2);const x=new Fi({color:"#e8c889",transparent:!0,opacity:0,depthWrite:!1,blending:is}),w=new Li(M,x,Ei.normal);w.name="atmosphere-glints",w.frustumCulled=!1,w.renderOrder=5,h.slice(0,Ei.normal).forEach((U,I)=>{S.set(U.x,(Number.isFinite(U.y)?U.y:.17)+.02,U.z),_.set((Number.isFinite(U.w)?U.w:1)*.55,1,(Number.isFinite(U.d)?U.d:1)*.55),p.compose(S,E,_),w.setMatrixAt(I,p)}),w.instanceMatrix.needsUpdate=!0,w.count=m.count,w.visible=!1,l.add(w);let R=0;function y(U){if(c)return;const I=KS(U);R=I;for(const{material:B,dry:L}of o)B.color.setHex(L.color).multiplyScalar(sd(1,$S,I)),B.roughness=sd(L.roughness,Math.max(YS,L.roughness*jS),I);const F=.42*I;g.opacity=F,m.visible=F>.01&&m.count>0,x.opacity=.26*I,w.visible=I>.02&&w.count>0}function b(){y(0);for(const{material:U,dry:I}of o)U.color.setHex(I.color),U.roughness=I.roughness}function P(U){return c||!Ei[U]||U===u?!1:(u=U,m.count=Math.min(h.length,Ei[u]),w.count=m.count,y(R),!0)}function N(){if(!c){c=!0,b();for(const{material:U}of o)U.roughnessMap===f&&(U.roughnessMap=null,U.needsUpdate=!0);f&&f.dispose(),l.removeFromParent(),v.dispose(),g.dispose(),M.dispose(),x.dispose()}}return{object3D:l,apply:y,restore:b,setTier:P,dispose:N,get wettableKeys(){return o.map(U=>U.key)},get shelteredKeys(){return a.map(U=>U.key)},get puddleCount(){return m.count}}}function QS(n,e=24,t=0){return e*(1+.08*Math.sin(2.3*n)+.04*Math.sin(5.1*n+t))}function eE({position:n=[0,.2,-2],quality:e="normal",seed:t=629,light:i=null}={}){const s=e==="reduced",r=s?12:24,o=new nt;o.name="atmosphere-fire",o.position.fromArray(n);const a=new og;a.setIndex([0,1,2,0,2,3]),a.setAttribute("position",new Je([-.5,0,0,.5,0,0,.5,1,0,-.5,1,0],3)),a.setAttribute("uv",new Je([0,0,1,0,1,1,0,1],2));const l=new Float32Array(r);for(let E=0;E<r;E++)l[E]=(E*.61803398875+t*1e-4)%1;a.setAttribute("phase",new na(l,1)),a.instanceCount=r;const c=new Lt({transparent:!0,depthWrite:!1,blending:is,side:Yt,uniforms:{time:{value:0},motion:{value:1},wind:{value:new Ee}},vertexShader:`attribute float phase; uniform float time; uniform float motion; uniform vec2 wind; varying vec2 vUv; varying float vLife;
      void main(){vUv=uv; float age=fract(phase+time*.48); vLife=sin(age*3.14159);
      float angle=phase*37.7; vec3 center=vec3(cos(angle)*.27,age*.65,sin(angle)*.27);
      center.xz+=wind*age*.3; vec4 mv=modelViewMatrix*vec4(center,1.);
      float sway=sin(time*2.+phase*30.)*.08*motion;
      mv.xy+=vec2(position.x*(.25+.2*vLife)+sway*uv.y,position.y*(.5+.65*vLife));
      gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec2 vUv; varying float vLife;
      void main(){float edge=1.-abs(vUv.x*2.-1.); float alpha=pow(max(0.,edge-vUv.y*.4),2.)*(1.-vUv.y)*.22;
      vec3 color=mix(vec3(1.,.58,.12),vec3(1.,.13,.015),vUv.y);
      gl_FragColor=vec4(color,alpha*(.4+.6*vLife));}`}),u=new ae(a,c);u.frustumCulled=!1,o.add(u);let f=null,d=null,h=null,v=null;s||(v=new Float32Array(384),d=new ft,d.setAttribute("position",new bt(v,3)),h=new Br({color:"#ffb862",size:.025,transparent:!0,opacity:.7,depthWrite:!1,blending:is}),f=new ma(d,h),f.frustumCulled=!1,o.add(f));let g=!1;const m=i?.intensity??24;function p(E,{windX:_=0,windZ:M=0,reduceMotion:x=!1}={}){if(!g&&(c.uniforms.time.value=x?0:E,c.uniforms.motion.value=x?0:1,c.uniforms.wind.value.set(_,M),i&&(i.intensity=x?m:QS(E,m,t*.01)),f)){f.visible=!x;for(let w=0;w<128;w++){const R=(E*.19+w/128)%1,y=w*2.39996;v[w*3]=Math.cos(y)*(.15+R*.4)+_*R,v[w*3+1]=R*2.8,v[w*3+2]=Math.sin(y)*(.15+R*.4)+M*R}d.attributes.position.needsUpdate=!0}}function S(){g||(g=!0,o.removeFromParent(),a.dispose(),c.dispose(),d?.dispose(),h?.dispose(),i&&(i.intensity=m))}return{group:o,update:p,dispose:S,counts:{flames:r,embers:s?0:128,batches:s?1:2},get disposed(){return g}}}function rd({environment:n={},tier:e="normal",seed:t=0}={}){const i=new nt;i.name="atmosphere-place-effects";let s=null,r=null,o=null,a=null,l=null,c=!1;n.fire&&(s=eE({...n.fire,quality:e,seed:t}),i.add(s.group));const u=n.dust?e==="reduced"?48:Math.min(192,n.dust.count??192):0;u&&(l=new Float32Array(u*3),o=new ft,o.setAttribute("position",new bt(l,3)),a=new Br({color:n.dust.color??"#c5a27a",size:.018,transparent:!0,opacity:.2,depthWrite:!1}),r=new ma(o,a),r.frustumCulled=!1,i.add(r));const f=n.nightMaterials??[],d=f.map(p=>p.emissiveIntensity),h=n.traffic,v=h?.geometry.drawRange.count;h&&h.geometry.setDrawRange(0,e==="reduced"?8:32);function g(p,{reduceMotion:S=!1,particles:E=!0}={}){if(c)return;const _=(p.serverNow??0)/1e3;if(s?.update(_,{windX:p.windX,windZ:p.windZ,reduceMotion:S}),r){r.visible=E&&!S;for(let M=0;M<u;M++)l[M*3]=((M*1.731+_*.18)%23+23)%23-11.5,l[M*3+1]=.1+M%7*.06,l[M*3+2]=((M*3.19+_*.035)%20+20)%20-10;o.attributes.position.needsUpdate=!0}for(const M of f)M.emissiveIntensity=.45+(p.cloud??0)*.35;h&&(h.visible=!S&&E)}function m(){c||(c=!0,s?.dispose(),o?.dispose(),a?.dispose(),i.removeFromParent(),f.forEach((p,S)=>{p.emissiveIntensity=d[S]}),h&&(h.geometry.setDrawRange(0,v),h.visible=!0))}return{group:i,update:g,dispose:m,counts:{batches:(s?.counts.batches??0)+(u?1:0),dust:u,flames:s?.counts.flames??0,embers:s?.counts.embers??0}}}function tE(n,e,t){const i=n?.schedule;if(!i)return null;const s=(e%i.cycleMs+i.cycleMs)%i.cycleMs,r=i.keyframes;let o=0;for(;o<r.length-1&&r[o+1].atMs<=s;)o++;const a=r[o],l=r[(o+1)%r.length];if(!a.visuals||!l.visuals)return null;const c=(o+1<r.length?l.atMs:i.cycleMs)-a.atMs,u=Math.max(0,Math.min(1,(s-a.atMs)/c));return t.fromVisuals=a.visuals,t.toVisuals=l.visuals,t.u=u*u*(3-2*u),t}const od=Object.freeze(["normal","reduced"]),Io=(n,e,t)=>n+(e-n)*t;function nE({scene:n,renderer:e,sun:t,hemisphere:i=null,stateClient:s,world:r=null,tier:o="normal",skyFactory:a=DS,precipitationFactory:l=qS,surfacesFactory:c=JS}={}){if(!n)throw new Error("createAtmosphereController requires the shared scene");if(!e)throw new Error("createAtmosphereController requires the renderer");if(!t)throw new Error("createAtmosphereController requires the sun light");if(!s||typeof s.sample!="function")throw new Error("createAtmosphereController requires the atmosphere state client");let u=od.includes(o)?o:"normal",f=!1,d=!1,h=null,v=null,g=null,m=null,p=null,S=null,E=null,_=null,M=null,x=null;const w={},R={},y=new Se,b=new Se,P=new Se,N=new Se,U=new Se;new Se;const I=new Se,F={frames:0,updates:0,skippedFrames:0,activations:0,failedActivations:0};function B(){const K={fogColor:n.fog?.color?n.fog.color.getHex():null,fogDensity:typeof n.fog?.density=="number"?n.fog.density:null,background:n.background?.isColor?n.background.getHex():null,sunColor:t.color.getHex(),sunIntensity:t.intensity,hemiSky:i?.color?i.color.getHex():null,hemiGround:i?.groundColor?i.groundColor.getHex():null,hemiIntensity:i?i.intensity:null,exposure:typeof e.toneMappingExposure=="number"?e.toneMappingExposure:null};return Object.freeze(K)}function L(){m&&(m.fogColor!==null&&n.fog.color.setHex(m.fogColor),m.fogDensity!==null&&(n.fog.density=m.fogDensity),m.background!==null&&n.background.setHex(m.background),t.color.setHex(m.sunColor),t.intensity=m.sunIntensity,i&&(m.hemiSky!==null&&i.color.setHex(m.hemiSky),m.hemiGround!==null&&i.groundColor.setHex(m.hemiGround),m.hemiIntensity!==null&&(i.intensity=m.hemiIntensity)),m.exposure!==null&&(e.toneMappingExposure=m.exposure))}function A(){M?.dispose(),M=null,x=null,E&&(E.dispose(),E=null),_&&(_.dispose(),_=null),S&&(S.dispose(),S=null),p&&(p.removeFromParent(),p=null)}function H(K={}){if(d||(f&&V(),!K?.roomId||!K.def?.atmosphere?.preset))return!1;m=B(),h=K.roomId,v=K.generation??null,g=K.def,f=!0,F.activations+=1;try{const G=typeof K.world<"u"?K.world:r?.(),q=G?.environment??{};x=q;const ne=wf(q.zones);return p=new nt,p.name="atmosphere-active",S=a({drift:u!=="reduced",tier:u,stars:q.sky?.stars??0,milkyWay:!!q.sky?.milkyWay}),p.add(S.mesh),E=l({bounds:g.bounds??void 0,zones:ne,anchors:q.emitterAnchors??[],tier:u,seed:Number.isFinite(g.seed)?g.seed>>>0:0}),p.add(E.object3D),_=c({world:G??null,tier:u,seed:Number.isFinite(g.seed)?g.seed>>>0:0}),p.add(_.object3D),M=rd({environment:q,tier:u,seed:g.seed}),M.group.children.length&&p.add(M.group),n.add(p),!0}catch(G){throw A(),L(),m=null,f=!1,h=null,v=null,g=null,F.failedActivations+=1,G}}function V(){return f?(f=!1,A(),L(),m=null,h=null,v=null,g=null,!0):!1}function Z(){const K=typeof s.getState=="function"?s.getState():null,G=tE(hi(K?.preset??g?.atmosphere?.preset),w.serverNow??0,R),q=K?.transition??G,ne=K?.transition?w.transitionU:G?.u;if(q&&ne!=null){const Le=q.fromVisuals??hi(q.fromPreset)?.visuals,tt=q.toVisuals??hi(q.toPreset)?.visuals;if(Le&&tt)return y.set(Le.fogColor).lerp(I.set(tt.fogColor),ne),b.set(Le.skyColor).lerp(I.set(tt.skyColor),ne),P.set(Le.groundColor).lerp(I.set(tt.groundColor),ne),N.set(Le.sunColor).lerp(I.set(tt.sunColor),ne),U.set(Le.skyColor).lerp(I.set(tt.fogColor),ne),{fogColor:y,skyColor:b,groundColor:P,sunColor:N,cloudColor:U,fogDensity:Io(Le.fogDensity,tt.fogDensity,ne),hemisphereIntensity:Io(Le.hemisphereIntensity,tt.hemisphereIntensity,ne),sunIntensity:Io(Le.sunIntensity,tt.sunIntensity,ne),exposure:Io(Le.exposure,tt.exposure,ne)}}const Ie=K?.preset??g?.atmosphere?.preset??null,_e=hi(Ie)?.visuals;return _e?(y.set(_e.fogColor),b.set(_e.skyColor),P.set(_e.groundColor),N.set(_e.sunColor),U.set(_e.skyColor).lerp(y,.5),{fogColor:y,skyColor:b,groundColor:P,sunColor:N,cloudColor:U,fogDensity:_e.fogDensity,hemisphereIntensity:_e.hemisphereIntensity,sunIntensity:_e.sunIntensity,exposure:_e.exposure}):null}function le(K=0){if(F.frames+=1,!f||d||(typeof r=="function"?r():null)?.group?.visible===!1)return F.skippedFrames+=1,!1;s.sample(w);const q=Z();return q&&(n.fog.color.copy(q.fogColor),typeof n.fog?.density=="number"&&(n.fog.density=q.fogDensity),n.background?.isColor&&n.background.copy(q.fogColor).multiplyScalar(.45),t.color.copy(q.sunColor),t.intensity=q.sunIntensity,i&&(i.color.copy(q.skyColor),i.groundColor.copy(q.groundColor),i.intensity=q.hemisphereIntensity),typeof e.toneMappingExposure=="number"&&(e.toneMappingExposure=q.exposure),S.setState({topColor:q.skyColor,horizonColor:q.fogColor,cloudColor:q.cloudColor,cloudOpacity:w.cloud??0,phase:w.timePhase??0,timeMs:w.serverNow??0})),E?.update({timeMs:w.serverNow??0,rain:w.rain??0,windX:w.windX??0,windZ:w.windZ??0,dtMs:K}),_?.apply(w.wetness??0),M?.update(w,{reduceMotion:u==="reduced"}),F.updates+=1,!0}function ve(K){return!od.includes(K)||K===u?!1:(u=K,x&&(M?.dispose(),M=rd({environment:x,tier:K,seed:g?.seed}),M.group.children.length&&p.add(M.group)),E?.setTier(K),_?.setTier(K),S?.setDrift(K!=="reduced"),!0)}function Oe(){d||(V(),d=!0)}return{activate:H,deactivate:V,update:le,setQuality:ve,dispose:Oe,isActive:()=>f,get roomId(){return h},get generation(){return v},get tier(){return u},get stats(){return F}}}const iE=32,sE=800,rE=.2,oE=.2,aE=.5,ad=Object.freeze(["reduced","off"]);function lE(n){const e=typeof n=="string"?n:"",t=e.indexOf(":");if(t<=0)return null;const i=Number(e.slice(0,t));return Number.isSafeInteger(i)&&i>=0?i:null}function cE({stateClient:n,clock:e=()=>typeof performance<"u"?performance.now():Date.now(),audio:t=null,listenerPosition:i=null,flashMode:s="reduced",seenCap:r=iE,thunderDelay:o=vS}={}){if(!n||typeof n.consumeDueEvents!="function")throw new Error("createAtmosphereEvents requires the atmosphere state client");let a=ad.includes(s)?s:"reduced",l=null;const c=new Set,u=new Set;let f=null;const d={active:!1,kind:null,id:null,progress:0,amplitude:0,exposureAdd:0,sunAdd:0},h={consumed:0,deduped:0,lightning:0,meteors:0,thunderScheduled:0,replaced:0};function v(w){const R=lE(w);if(R!==l&&(l=R,c.clear()),c.has(w))return!1;for(c.add(w);c.size>r;)c.delete(c.values().next().value);return!0}function g(){f=null}function m(w,R){if(!t||typeof t.thunder!="function")return;const y=typeof i=="function"?i():null;let b=o(0);if(y&&Array.isArray(w.origin)){const I=(w.origin[0]??0)-(y.x??0),F=(w.origin[1]??0)-(y.y??0),B=(w.origin[2]??0)-(y.z??0);b=o(Math.hypot(I,F,B))}const P=Math.max(0,e()-R),N=Math.max(0,b-P),U=t.thunder({delayMs:N,intensity:w.intensity??.6});U&&(u.add(U),h.thunderScheduled+=1)}function p(w,R){h.lightning+=1;const y=e()-R*w.durationMs;if(m(w,y),a==="off"){g();return}f&&(h.replaced+=1),f={id:w.id,start:y,duration:Math.min(w.durationMs,sE),intensity:Math.min(1,Math.max(0,w.intensity??.5))}}function S(){const w=n.consumeDueEvents();for(const{event:R,progress:y}of w){if(h.consumed+=1,!v(R.id)){h.deduped+=1;continue}R.kind==="lightning"?p(R,Math.min(1,Math.max(0,y??0))):R.kind==="meteor"&&(h.meteors+=1)}}function E(w=d){if(!f)return w.active=!1,w.kind=null,w.id=null,w.progress=0,w.amplitude=0,w.exposureAdd=0,w.sunAdd=0,w;const R=(e()-f.start)/f.duration;if(R>=1)return g(),E(w);const y=Math.sin(Math.PI*Math.min(1,Math.max(0,R))),b=a==="off"?0:aE;return w.active=!0,w.kind="lightning",w.id=f.id,w.progress=R,w.amplitude=f.intensity*y*b,w.exposureAdd=w.amplitude*rE,w.sunAdd=w.amplitude*oE,w}function _(w){return!ad.includes(w)||w===a?!1:(a=w,a==="off"&&g(),!0)}function M(){for(const w of u)try{w.cancel()}catch{}u.clear(),g()}function x(){M()}return{update:S,getPulse:E,setFlashMode:_,cancelAll:M,resync:x,get flashMode(){return a},get seenCount(){return c.size},get stats(){return h}}}const Rf="afterlight-atmosphere-v1",Pf=Object.freeze(["normal","reduced"]),If=Object.freeze(["os","on","off"]),uE=Object.freeze(["reduced","off"]),Lf=Object.freeze({quality:"normal",reduceMotion:"os",flash:"reduced"});function xr(n,e,t){return typeof n=="string"&&e.includes(n)?n:t}function Df(n){const e={...Lf};return!n||typeof n!="object"||Array.isArray(n)||(e.quality=xr(n.quality,Pf,e.quality),e.reduceMotion=xr(n.reduceMotion,If,e.reduceMotion),e.flash=xr(n.flash,uE,e.flash)),e}function hE(n){if(!n||typeof n.getItem!="function")return null;let e=null;try{e=n.getItem(Rf)}catch{return null}if(!e||typeof e!="string")return null;try{const t=JSON.parse(e);return t&&typeof t=="object"&&!Array.isArray(t)?t:null}catch{return null}}function dE({storage:n=typeof localStorage<"u"?localStorage:null,prefersReducedMotion:e=!1}={}){const t=hE(n),i=Df(t);return Object.freeze({prefs:i,fromStorage:t!==null,sessionOnly:t===null})}function fE(n,e){if(!e||typeof e.setItem!="function")return!1;try{const t=Df(n);return e.setItem(Rf,JSON.stringify({version:1,...t})),!0}catch{return!1}}function pE(n,e=!1){const t=xr(n?.reduceMotion,If,"os");return t==="on"?"reduced":t==="off"?"full":e?"reduced":"full"}function Nf(n,e=!1){const t=xr(n?.quality,Pf,Lf.quality);return pE(n,e)==="reduced"?"reduced":t}const Uf="afterlight-audio-v1",wc=Object.freeze(["ambience","weather","effects","media","voice"]),mE=Object.freeze({ambience:.35,weather:.35,effects:.7,media:1,voice:1}),gE=.35,vE=.6,ld=150,Lo=600,cd=50,qo=n=>n<0?0:n>1?1:n;function _E(){return typeof AudioContext=="function"?AudioContext:typeof globalThis<"u"&&typeof globalThis.webkitAudioContext=="function"?globalThis.webkitAudioContext:null}function yE(n){const e={...mE};if(!n||typeof n!="object"||Array.isArray(n))return e;for(const t of wc){const i=Number(n[t]);Number.isFinite(i)&&(e[t]=qo(i))}return e}function xE(n){if(!n||typeof n.getItem!="function")return null;let e=null;try{e=n.getItem(Uf)}catch{return null}if(!e||typeof e!="string")return null;try{const t=JSON.parse(e);return t&&typeof t=="object"&&!Array.isArray(t)?t:null}catch{return null}}function bE({contextClass:n=_E(),storage:e=typeof localStorage<"u"?localStorage:null,clock:t=()=>typeof performance<"u"?performance.now():Date.now(),scheduleDelay:i=(r,o)=>setTimeout(r,o),cancelDelay:s=r=>clearTimeout(r)}={}){if(n!==null&&typeof n!="function")throw new Error("createAudioMixer: contextClass must be a constructor or null");let r=null,o=!1,a=!1,l=1,c=null;const u=yE(xE(e)),f=new Set,d={master:null,environment:null,ambience:null,weather:null,effects:null};function h(){for(const I of f)try{I(P())}catch{}}function v(I,F){if(!(!I||!r))try{I.gain.setTargetAtTime(F,r.currentTime,.05)}catch{I.gain.value=F}}function g(){r=new n;const I=r.createGain();I.gain.value=1,I.connect(r.destination);const F=r.createGain();F.gain.value=1,F.connect(I);const B=r.createGain();B.gain.value=u.ambience,B.connect(F);const L=r.createGain();L.gain.value=u.weather,L.connect(F);const A=r.createGain();return A.gain.value=u.effects,A.connect(I),d.master=I,d.environment=F,d.ambience=B,d.weather=L,d.effects=A,r}function m(){if(o)return null;if(r)return r;if(!n)return null;try{return g()}catch{return r=null,null}}function p(){return r?r.state==="running"?"running":"suspended":"unavailable"}async function S(){if(!r)return!1;try{await r.resume()}catch{}return r.state==="running"}async function E(){if(!r)return!1;try{await r.suspend()}catch{}return!0}function _(I){return wc.includes(I)?u[I]:0}function M(I,F){if(!wc.includes(I))return 0;const B=qo(Number(F));if(!Number.isFinite(B))return u[I];if(u[I]=B,I==="ambience"&&v(d.ambience,B),I==="weather"&&v(d.weather,B),I==="effects"&&v(d.effects,B),e&&typeof e.setItem=="function")try{e.setItem(Uf,JSON.stringify({version:1,...u}))}catch{}return B}function x(){return Object.freeze({...u})}function w(I,F){if(c!==null&&(s(c),c=null),F<=0){l=I,h();return}const B=l,L=t(),A=()=>{c=null;const H=Math.min(1,Math.max(0,(t()-L)/F)),V=B+(I-B)*H;V!==l&&(l=V,h()),H<1&&(c=i(A,cd))};c=i(A,cd)}function R(I){const F=!!I;if(F!==a){if(a=F,r&&d.environment){const B=r.currentTime,L=a?gE:1,A=(a?ld:Lo)/1e3;try{d.environment.gain.cancelScheduledValues(B)}catch{}d.environment.gain.setValueAtTime(d.environment.gain.value,B),d.environment.gain.linearRampToValueAtTime(L,B+A)}w(a?vE:1,a?ld:Lo)}}function y(){if(!(!a&&l===1&&c===null)){if(a=!1,r&&d.environment){const I=r.currentTime;try{d.environment.gain.cancelScheduledValues(I)}catch{}d.environment.gain.setValueAtTime(d.environment.gain.value,I),d.environment.gain.linearRampToValueAtTime(1,I+Lo/1e3)}w(1,Lo)}}function b(){return a}function P(){return qo(u.media)*qo(l)}function N(I){return typeof I!="function"?()=>{}:(f.add(I),()=>f.delete(I))}function U(){if(!o){if(o=!0,y(),r)for(const I of Object.values(d))try{I?.disconnect()}catch{}d.master=null,d.environment=null,d.ambience=null,d.weather=null,d.effects=null,r=null}}return{ensure:m,resume:S,suspend:E,status:p,preference:_,setPreference:M,preferences:x,setVoiceActive:R,clearDuck:y,isVoiceActive:b,mediaGain:P,onMediaGainChange:N,dispose:U,get context(){return r},get buses(){return d}}}const Do=500,ME=300,qs=Object.freeze({exposed:Object.freeze({rain:1,roof:0,wind:.3,lowpassHz:6e3}),roof:Object.freeze({rain:.35,roof:.7,wind:.15,lowpassHz:2400}),alcove:Object.freeze({rain:.15,roof:.25,wind:.05,lowpassHz:900})}),br=n=>n<0?0:n>1?1:n;function Of(n){const e=typeof n=="string"?qs[n]:n;if(!e||typeof e!="object"||Array.isArray(e))return null;const t=Number(e.rain),i=Number(e.roof),s=Number(e.wind),r=Number(e.lowpassHz);if(![t,i,s].every(Number.isFinite))return null;const o=Number.isFinite(r)?Math.min(2e4,Math.max(80,r)):qs.exposed.lowpassHz;return{rain:br(t),roof:br(i),wind:br(s),lowpassHz:o}}function SE(n,e=1){const t=Of(n?.audio);return t||(e<.5?qs.roof:qs.exposed)}function EE(n,e){return n===e?!0:!n||!e?!1:n.rain===e.rain&&n.roof===e.roof&&n.wind===e.wind&&n.lowpassHz===e.lowpassHz}function wE({mixer:n}={}){if(!n||typeof n.ensure!="function")throw new Error("createEnvironmentAudio requires the shared audio mixer");let e=!1,t=!1,i=null,s=null,r=0;const o={ambience:[],weather:[]},a={rain:null,roof:null,wind:null};let l=null,c=null;function u(){return n.ensure()}function f(_){if(i)return i;const M=Math.floor(_.sampleRate*2);i=_.createBuffer(1,M,_.sampleRate);const x=i.getChannelData(0);for(let w=0;w<x.length;w++)x[w]=Math.random()*2-1;return i}function d(_,M,x,w){const R=M.currentTime;try{_.cancelScheduledValues(R)}catch{}_.setValueAtTime(_.value,R),_.linearRampToValueAtTime(x,R+w)}function h(_,{type:M,frequency:x,gainValue:w,dest:R}){const y=_.createBufferSource();y.buffer=f(_),y.loop=!0;const b=_.createBiquadFilter();b.type=M,b.frequency.value=x;const P=_.createGain();return P.gain.value=w,y.connect(b).connect(P).connect(R),y.start(0),{src:y,filter:b,gain:P}}function v(){if(t||e)return e;const _=u();if(!_)return!1;const M=n.buses.ambience,x=n.buses.weather;return!M||!x?!1:(o.ambience.push(h(_,{type:"lowpass",frequency:320,gainValue:.5,dest:M})),l=_.createBiquadFilter(),l.type="lowpass",l.frequency.value=qs.exposed.lowpassHz,c=_.createGain(),c.gain.value=r,l.connect(c).connect(x),a.rain=h(_,{type:"bandpass",frequency:1900,gainValue:0,dest:l}),a.roof=h(_,{type:"highpass",frequency:3600,gainValue:0,dest:l}),a.wind=h(_,{type:"lowpass",frequency:340,gainValue:0,dest:l}),o.weather.push(a.rain,a.roof,a.wind),e=!0,s=null,r>0&&m(r),!0)}function g(_){const M=Of(_)??qs.exposed;if(EE(M,s)||(s=M,!e))return!1;const x=u();return x?(d(a.rain.gain.gain,x,s.rain,Do/1e3),d(a.roof.gain.gain,x,s.roof,Do/1e3),d(a.wind.gain.gain,x,s.wind,Do/1e3),d(l.frequency,x,s.lowpassHz,Do/1e3),!0):!1}function m(_){const M=br(Number(_));if(Number.isFinite(M)&&(r=M),!e)return!1;const x=u();return!x||!c?!1:(d(c.gain,x,r,ME/1e3),!0)}function p({delayMs:_=0,intensity:M=.6}={}){const x=u();if(t||!x||!n.buses.weather)return null;const w=Math.max(0,Number(_)||0)/1e3,R=.12+br(Number(M)||0)*.5,y=2.4,b=x.createBufferSource();b.buffer=f(x),b.loop=!1,b.playbackRate.value=.32;const P=x.createBiquadFilter();P.type="lowpass",P.frequency.value=150;const N=x.createGain(),U=x.currentTime+w;N.gain.setValueAtTime(1e-4,U),N.gain.linearRampToValueAtTime(R,U+.08),N.gain.exponentialRampToValueAtTime(1e-4,U+y),b.connect(P).connect(N).connect(n.buses.weather),b.start(U,Math.random()*1.2),b.stop(U+y+.05);let I=!1;return{get scheduledAt(){return U},cancel(){if(I)return;I=!0;const F=x.currentTime;if(F<U)try{b.stop(0)}catch{}else{try{N.gain.cancelScheduledValues(F),N.gain.setValueAtTime(N.gain.value,F),N.gain.linearRampToValueAtTime(0,F+.15)}catch{}try{b.stop(F+.16)}catch{}}for(const B of[b,P,N])try{B.disconnect()}catch{}}}}function S(){if(!e)return!1;const _=M=>{try{M.src.stop(0)}catch{}for(const x of[M.src,M.filter,M.gain])try{x.disconnect()}catch{}};for(const M of o.ambience)_(M);for(const M of o.weather)_(M);if(l)try{l.disconnect()}catch{}if(c)try{c.disconnect()}catch{}return o.ambience.length=0,o.weather.length=0,a.rain=null,a.roof=null,a.wind=null,l=null,c=null,e=!1,!0}function E(){t||(S(),i=null,t=!0)}return{start:v,stop:S,dispose:E,setZone:g,setWeather:m,thunder:p,get started(){return e},get zone(){return s},get weatherLevel(){return r}}}const li=n=>typeof n=="number"&&Number.isFinite(n),$o=Object.freeze({sitZOffset:-.08,rotY:Math.PI,standZOffset:-.8}),TE=Object.freeze(["folded"]),ud=4;function AE(n,e){return!n||typeof n!="object"||Array.isArray(n)?`${e} must be a { x, z } point`:!li(n.x)||!li(n.z)?`${e} must have finite x and z`:null}function CE(n){if(!n||typeof n!="object")throw new Error("Seat item is not an object");if(n.type!=="seat")throw new Error(`Seat item has unexpected type: ${String(n.type)}`);if(!li(n.x)||!li(n.z))throw new Error("Seat item must have finite x and z");if(n.sit==null)return Object.freeze({type:"seat",id:n.id??null,x:n.x,z:n.z,sit:{x:n.x,y:0,z:n.z+$o.sitZOffset,rotY:$o.rotY},dismount:[{x:n.x,z:n.z+$o.standZOffset}],groupId:n.groupId??null,acousticZoneId:n.acousticZoneId??null,animationProfile:"folded",title:n.title,sub:n.sub,legacy:!0});const e=n.sit;if(typeof e!="object"||Array.isArray(e))throw new Error("Seat sit pose must be a { x, y, z, rotY } object");if(!li(e.x)||!li(e.z))throw new Error("Seat sit pose must have finite x and z");if(e.y!=null&&e.y!==0)throw new Error("Seat sit pose y must stay zero: seated avatars and remote poses assume ground level");if(!li(e.rotY))throw new Error("Seat sit pose must declare a finite rotY (the avatar faces where the seat faces)");const t=n.dismount;if(!Array.isArray(t)||t.length<1||t.length>ud)throw new Error(`Seat dismount must list 1-${ud} authored escape points`);const i=t.map((r,o)=>{const a=AE(r,`Seat dismount[${o}]`);if(a)throw new Error(a);return{x:r.x,z:r.z}}),s=n.animationProfile??"folded";if(!TE.includes(s))throw new Error(`Unknown seat animationProfile: ${String(s)}`);return Object.freeze({type:"seat",id:n.id??null,x:n.x,z:n.z,sit:{x:e.x,y:0,z:e.z,rotY:e.rotY},dismount:i.map(r=>Object.freeze({...r})),groupId:n.groupId??null,acousticZoneId:n.acousticZoneId??null,animationProfile:s,title:n.title,sub:n.sub,legacy:!1})}function hd(n,{bounds:e,obstacles:t=[],isWalkable:i,spawn:s}){for(const o of n?.dismount??[])if(i(e,t,o.x,o.z))return{x:o.x,z:o.z,fallback:!1};const r=Array.isArray(s)?{x:s[0],z:s[1]}:s;return!r||!li(r.x)||!li(r.z)?{x:n.x,z:n.z+$o.standZOffset,fallback:!0}:{x:r.x,z:r.z,fallback:!0}}function RE({applySit:n,applyStand:e,sendMovement:t,onSeatChanged:i=null,announce:s=null,worldFacts:r=null,chooseDismountPoint:o=null}){if(typeof n!="function")throw new Error("createSeatController requires applySit");if(typeof e!="function")throw new Error("createSeatController requires applyStand");if(typeof t!="function")throw new Error("createSeatController requires sendMovement");let a=null;function l(c){if(typeof o=="function")return o(c);const u=r?.()??null;return!u||typeof u.isWalkable!="function"?hd(c,{isWalkable:()=>!0,spawn:null}):hd(c,u)}return{get current(){return a},sit(c){if(a)return null;const u=CE(c);a=u,n(u,u.sit),t(!0);try{i?.({seated:!0,seat:u})}catch{}return s?.(u),u},stand(){if(!a)return null;const c=a,u=l(c);a=null,e(c,u),t(!1);try{i?.({seated:!1,seat:c,point:u,fallback:u?.fallback===!0})}catch{}return u}}}const PE=["travel","gardenRoom","seatControl","readFieldNote","openScreen"];function IE(){const n=new Map;return{register(e,t){if(typeof e!="string"||e.length===0)throw new Error("Interaction types must be non-empty strings");if(typeof t!="function")throw new Error(`Interaction handler for "${e}" must be a function`);if(n.has(e))throw new Error(`Duplicate interaction handler: ${e}`);return n.set(e,t),t},has(e){return n.has(e)},types(){return[...n.keys()]},dispatch(e,t){const i=n.get(e?.type);return i?{handled:!0,result:i(e,t)}:{handled:!1}}}}function LE(n,e){for(const t of PE)if(!(t in e))throw new Error(`registerCoreInteractions requires context.${t}`);return n.register("district_gate",t=>e.travel(t.targetDistrict)),n.register("market_gate",()=>e.travel("market")),n.register("garden_gate",()=>e.travel(e.gardenRoom())),n.register("seat",t=>e.seatControl.sit(t)),n.register("field-note",t=>e.readFieldNote(t)),n.register("theater_screen",t=>e.openScreen(t)),n}const Ff="afterlight-legacy-ui-v1",ai=Object.freeze({SOCIAL:"social",LEGACY:"legacy"}),DE=Object.freeze({Digit1:"hands",Digit2:"hoe",Digit3:"seed",Digit4:"water",Digit5:"harvest",Digit6:"sprinkler"}),kf=()=>typeof localStorage<"u"?localStorage:null;function NE(n=kf()){try{return n?.getItem(Ff)==="on"}catch{return!1}}function UE(n,e=kf()){try{return e?.setItem(Ff,n?"on":"off"),!0}catch{return!1}}function Bf(n){return typeof n=="string"&&wt.isGarden(n)}function OE(n,e){if(Bf(e)||e===wt.MARKET)return ai.LEGACY;if(!n||typeof n!="object")return ai.SOCIAL;const t=n.social;return!t||typeof t!="object"||t.featured===!0||n.kind==="venue"?ai.SOCIAL:ai.LEGACY}function FE(n){return Object.freeze({...n,sections:Object.freeze({...n.sections}),shortcuts:Object.freeze({...n.shortcuts}),tools:Object.freeze({...n.tools}),copy:Object.freeze({...n.copy})})}function kE(n,e,{legacyUi:t=!1}={}){const i=!t&&OE(n,e)===ai.SOCIAL,s=i?ai.SOCIAL:ai.LEGACY,r=Bf(e);return FE({context:s,placeId:typeof e=="string"?e:null,sections:{toolBelt:!i,toolHint:!i,economyStats:!i,legacyButtons:!i,millPanel:!i&&e===wt.MARKET},shortcuts:{toolDigits:!i,inventory:!0,market:!0,travel:!0,emotes:!0,chat:!0},tools:{clearOnEntry:i,restoreOnEntry:r},copy:{visitorArrival:i?"A Visitor Arrived":"Gardener Arrived",noTargetHint:i?"Walk up to a seat or a gateway — or chat, emote, or pick a place to travel.":"Approach a garden bed, market stall, or gateway to interact.",idleActionHint:i?"Sit, emote, chat — or press T to travel":null}})}function BE(n,{enabled:e=!1,emoteWheelOpen:t=!1}={}){return!e||t?null:DE[n]??null}function HE({policy:n,currentTool:e="hands",rememberedTool:t=null}){return n?.tools?.clearOnEntry?{tool:"hands",rememberedTool:e&&e!=="hands"?e:t??null}:n?.tools?.restoreOnEntry&&t&&t!=="hands"?{tool:t,rememberedTool:null}:{tool:e,rememberedTool:t??null}}function zE(n,e={}){const{contextRoot:t,toolBelt:i,toolHint:s,economyStats:r,legacyButtons:o,millPanel:a}=e;t&&(t.dataset.hudContext=n.context),i&&(i.hidden=!n.sections.toolBelt),s&&(s.hidden=!n.sections.toolHint),r&&(r.hidden=!n.sections.economyStats);const l=o==null?[]:Array.isArray(o)?o:[o];for(const c of l)c&&(c.hidden=!n.sections.legacyButtons);return a&&(a.hidden=!n.sections.millPanel),n}const ue=n=>document.getElementById(n),Et=new Wm;Et.background=new Se("#222d2a");Et.fog=new Wc("#54645d",.018);const kt=new qy({canvas:ue("world"),antialias:!0});kt.setPixelRatio(Math.min(devicePixelRatio,1.5));kt.setSize(innerWidth,innerHeight);kt.shadowMap.enabled=!0;kt.shadowMap.type=xd;kt.toneMapping=Md;kt.toneMappingExposure=1.15;const mn=new xa,VE=1.55,GE=1.05,WE=.005,XE=.004,Dr=new on(58,1,.1,150);let Nr=mn,Vn=0,Ur=0,ca=0,Us=24;const Sa=new Jy(kt),nu=new Qy(Et,mn);Sa.addPass(nu);const qE=new Xs(new Ee(innerWidth,innerHeight),.25,.65,1.05);Sa.addPass(qE);const Hf=new ng("#c5d9d4","#343a2b",2.2);Et.add(Hf);const Bt=new rg("#ffe0a5",3);Bt.position.set(-14,24,7);Bt.castShadow=!0;Bt.shadow.mapSize.set(2048,2048);Object.assign(Bt.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:80});Bt.shadow.normalBias=.035;Bt.shadow.bias=-1e-4;Et.add(Bt);const In=new ae(new Zs(.25,.29,32),new Fi({color:"#e0d49b",transparent:!0,opacity:.8,side:Yt}));In.rotation.x=-Math.PI/2;In.visible=!1;Et.add(In);const zf=120,Vf=new ft,jo=new Float32Array(zf*3);for(let n=0;n<zf;n++)jo[n*3]=(Math.random()-.5)*26,jo[n*3+1]=Math.random()*6+.3,jo[n*3+2]=(Math.random()-.5)*24;Vf.setAttribute("position",new bt(jo,3));const iu=new ma(Vf,new Br({color:"#e3d7a7",size:.035,transparent:!0,opacity:.5}));Et.add(iu);const He=new Sx,as=new Px(Et),Di=bS({net:He}),Or=nE({scene:Et,renderer:kt,sun:Bt,hemisphere:Hf,stateClient:Di,world:()=>Qt}),ci=bE({}),$s=wE({mixer:ci}),su=typeof window.matchMedia=="function"?window.matchMedia("(prefers-reduced-motion: reduce)").matches:!1;let jn=dE({prefersReducedMotion:su}).prefs;const Ni=cE({stateClient:Di,audio:$s,listenerPosition:()=>$e.position,flashMode:jn.flash}),Gf=2048,$E=1024;function Tc(n){!Number.isFinite(n)||Bt.shadow.mapSize.x===n||(Bt.shadow.mapSize.set(n,n),Bt.shadow.map&&(Bt.shadow.map.dispose(),Bt.shadow.map=null))}function Wf(){return Nf(jn,su)==="reduced"?$E:Gf}function Xf(){Or.setQuality(Nf(jn,su)),Ni.setFlashMode(jn.flash),Or.isActive()&&Tc(Wf())}let Ac=[];const Cc=new Map,Sl={},jE={};function YE(n){const e=n?.world!==void 0?n.world:Qt;Ac=wf(e?.environment?.zones??[]),Cc.clear();for(const t of Ac)Cc.set(t.id,t)}function KE(){if(Di.sample(Sl),Sl.active!==!0)return;$s.setWeather(Sl.rain??0);const n=AS(Ac,$e.position.x,$e.position.z,jE),e=n.zoneId?Cc.get(n.zoneId):null;$s.setZone(SE(e,n.exposure))}let js=null;vd(async()=>{const{wireRealtime:n}=await import("./wire-CaeeHxYQ.js");return{wireRealtime:n}},[]).then(({wireRealtime:n})=>{js=n({net:He,remotePlayers:as,guestId:He.guestId,scene:Et})}).catch(()=>{});let Gn="hands",Bs=0;const Fr=yc.map(n=>n.id),xt=new Nb(He,{onSelectTool:(n,e)=>{Ea(n),e&&(Bs=Fr.indexOf(e),ue("active-seed-label").textContent=yn[e]?.name||e)},onLegacyDialogClosed:()=>{St.clear(),Ln()}}),qf=new kb(He,{onFocusChange:n=>{n&&(St.clear(),Ln())}}),Kt=new gM(He);Kt.onStandUpRequest=()=>rs();const Rc=new Bb(He);new Hb(Rc,{onFocusChange:n=>{n&&(St.clear(),Ln())},onDuckingChange:n=>{const e=Rc.status==="connected"?Math.max(0,1-n):1;Kt.setMixGain(e)}});const $e=rf(He.guestId,He.nickname);$e.position.set(0,0,3);Et.add($e);const Ft=Ix();Ft.position.set(.8,0,4);Et.add(Ft);const Pc="afterlight-save";function ZE(){try{const n=localStorage.getItem(Pc),e=n?JSON.parse(n):{};return Hh(e.exploration)}catch{return Hh({})}}function $f(n){try{const e=localStorage.getItem(Pc),t=e?JSON.parse(e):{};t.exploration=n,localStorage.setItem(Pc,JSON.stringify(t))}catch{}}let An=ZE();const Vr=Dx(),kr=Hx();Et.add(Vr.group);Et.add(kr.group);Vr.group.visible=!1;kr.group.visible=!1;const Yo=new Map,No={market:"M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24",...Object.fromEntries(Pn.map(n=>[n.id,n.minimapPath]))};function JE(n){if(Yo.has(n))return Yo.get(n);const e=Pn.find(s=>s.id===n);if(!e)return null;const t=An.completed.includes(n),i=Cb(e,t);if(i.items.push(...hb(e)),e.shell!=="none"){const s=new Wt(1,1,1),r=new Ze({color:"#c5b478",emissive:"#857545",emissiveIntensity:.6}),o=new Ze({color:"#2b3d3e",roughness:.6});for(const c of[-10.7,10.7]){const u=new ae(s,o);u.position.set(c,2.5,0),u.scale.set(.6,5,2.4),i.group.add(u);const f=new ae(s,r);f.position.set(c,1.8,0),f.scale.set(.1,3.4,1.8),i.group.add(f)}const a=new ae(s,o);a.position.set(0,2.5,8.8),a.scale.set(2.4,5,.6),i.group.add(a);const l=new ae(s,r);l.position.set(0,1.8,8.8),l.scale.set(1.8,3.4,.1),i.group.add(l),i.ownedResources.geometries.push(s),i.ownedResources.materials.push(r,o)}return i.group.visible=n===yt,Et.add(i.group),Yo.set(n,i),Ic.has(n)&&i.setNodeStates?.(Ic.get(n)),i}let Pt=null,gn=null,Gr=null,ln=!1,Fn=0,dd=null;const St=new Set;let Vt=null;const QE=2.8,fd=5,ji=Tx();let Mr=!1;function Ln(){Gr?.close(),zr($e),sf(ji),Mr=!1}const pd=new cg,ew=new wi(new k(0,1,0),0),El=new k;function It(n,e,t="FIELD NOTE"){const i=ue("toast-title"),s=ue("toast-body"),r=ue("toast-type"),o=ue("toast");i&&(i.textContent=n),s&&(s.textContent=e),r&&(r.textContent=t),o&&(o.style.opacity="1"),clearTimeout(dd),dd=setTimeout(()=>{o&&(o.style.opacity="0")},5e3)}let yt=wt.MARKET,Qt=Vr,Pi=pf("market"),ua=null,jf={spawn:[0,3],companionSpawn:[.8,4]};const Ic=new Map;let Ji={mill:{status:"broken",required:{...lf},contributed:{copper:0,timber:0,glass:0},restoredAt:null}};const Yf=OM({ui:Kt});FM(Yf);const jt=RE({worldFacts:()=>({bounds:Pi,obstacles:Qt?.obstacles??[],spawn:jf.spawn}),applySit:(n,e)=>{document.activeElement?.id==="chat-input"&&document.activeElement.blur(),$e.position.set(e.x,0,e.z),$e.rotation.y=e.rotY,Vn===ui&&(Ur=e.rotY+Math.PI),$e.userData.legs.forEach(t=>{t.rotation.x=-1.35}),gn=null,In.visible=!1,Ln()},applyStand:(n,e)=>{$e.position.set(e.x,0,e.z),Ln(),$e.userData.legs.forEach(t=>{t.rotation.x=0})},sendMovement:n=>He.sendMovement($e.position.x,$e.position.z,$e.rotation.y,!1,n),onSeatChanged:n=>Wr.notifySeatChanged(n),announce:n=>It(n.title||"Take a Seat",`${n.sub?`${n.sub} · `:""}Press E or a movement key to stand.`,yt===wt.THEATER?"THE ORPHEUM":"TAKE A SEAT")});let gi=null,md=null,ha=NE();const tw={contextRoot:document.body,toolBelt:ue("tool-belt"),toolHint:ue("hud-tool-hint"),economyStats:document.querySelector(".player-stats-row"),legacyButtons:[ue("btn-inventory"),ue("btn-market")]};function Kf(n){gi=kE(n?.def??null,n?.roomId??null,{legacyUi:ha}),zE(gi,tw);const e=HE({policy:gi,currentTool:Gn,rememberedTool:md});md=e.rememberedTool,e.tool!==Gn&&Ea(e.tool)}xt.hudPolicyProvider=()=>gi;function nw(n){yt=n.roomId,n.kind==="place"&&n.def?(Et.fog.color.set(n.def.color),Et.background.set(n.def.color).multiplyScalar(.45),Bt.color.set(n.def.sun),ue("location-title").textContent=n.def.name,ue("district-tag").textContent=n.def.district,ue("map-label").textContent="• "+n.def.subtitle,ue("map-path").setAttribute("d",No[n.roomId]||No.court),ue("world").setAttribute("aria-label",`${n.def.name} — ${n.def.description}`),It(n.def.name,n.def.description,"ARRIVED IN DISTRICT")):n.kind==="garden"?(Et.fog.color.set("#54645d"),Et.background.set("#222d2a"),Bt.color.set("#ffe0a5"),ue("location-title").textContent="Your Market Garden",ue("district-tag").textContent="CULTIVATION DISTRICT / 02",ue("map-label").textContent="• MARKET GARDEN 02",ue("map-path").setAttribute("d",No.garden),ue("world").setAttribute("aria-label","Your Market Garden — tend your garden beds and harvest fresh crops"),It("Your Garden Plot","Tend your garden beds and harvest fresh crops.")):(Et.fog.color.set("#54645d"),Et.background.set("#222d2a"),Bt.color.set("#ffe0a5"),ue("location-title").textContent="The Market Court",ue("district-tag").textContent="MARKET SOCIAL DISTRICT / 01",ue("map-label").textContent="• MARKET COURT 01",ue("map-path").setAttribute("d",No.market),ue("world").setAttribute("aria-label","The Market Court — trade produce, buy seeds, and fulfill town contracts"),It("The Market Court","Trade produce, buy seeds, and fulfill contracts.")),Kf(n)}function iw(n){n.kind!=="place"||!n.def||(An.visited.includes(n.roomId)||An.visited.push(n.roomId),An.current=n.roomId,$f(An))}function sw(n){const e=ue("net-indicator");e&&(n.phase==="online"?(e.textContent="● ONLINE",e.style.color="#85e0a3"):n.phase==="joining"?(e.textContent="● JOINING",e.style.color="#e0c583"):(e.textContent="● OFFLINE",e.style.color="#e0907c"))}const Wr=NM({resolve:n=>_f(n,{hasDefinition:e=>Pn.find(t=>t.id===e)}),build:n=>n.kind==="place"&&n.def?JE(n.roomId):n.kind==="garden"?kr:Vr,callAdapter:{onPlaceLeaving:()=>Rc.leaveCall()},controllerFor:n=>{const e=n.kind==="place"?Yx(n.roomId):null;return{activate:t=>{Di.activate(t),Or.activate(t),YE(t),$s.start(),Tc(Wf()),e?.activate?.(t)},deactivate:()=>{Or.deactivate(),Di.deactivate(),$s.stop(),Ni.cancelAll(),Tc(Gf),e?.deactivate?.()},onSeatChanged:t=>e?.onSeatChanged?.(t)}},adoptWorld:(n,e)=>{Qt=n,Pi=pf(e.roomId)},callAdapter:null,seatControl:{standUp:()=>rs()},resetInput:()=>{Pt=null,gn=null,In.visible=!1,St.clear(),Vt=null,Ln()},placeActors:(n,e)=>{jf=e,$e.position.set(e.spawn[0],0,e.spawn[1]),Ft.position.set(e.companionSpawn[0],0,e.companionSpawn[1])},bindNetwork:n=>{He.joinRoom(n)},clearRoster:()=>as.clear(),persistVisit:iw,present:{destination:nw,fallback:n=>It("That place is not on the map",`No known place answers to “${n.requested}” — you arrive at The Orpheum instead.`,"TRAVEL"),travelError:(n,e)=>It("Travel failed",`The way to ${n.def?.name||n.requested||n.roomId} is blocked for now — pick the place again to retry.`,"TRAVEL"),network:sw}}),Zf=IE();LE(Zf,{travel:n=>ru(n),gardenRoom:()=>wt.gardenFor(He.guestId),seatControl:jt,readFieldNote:n=>It(n.sub,n.body,"FIELD NOTE"),openScreen:()=>Yf.openScreen()});function ru(n){Wr.travel(n)}const wl=new URLSearchParams(window.location.search).get("room");let Lc=wt.THEATER;wl==="garden"?Lc=wt.gardenFor(He.guestId):wl&&(Lc=wl);ru(Lc);He.on(ge.WELCOME,n=>{Wr.markNetworkOnline(),n.player&&(xt.updatePlayerHUD(n.player),$e.userData.updateNickname(n.player.nickname)),n.weather&&ep(n.weather),n.prices&&xt.updateMarketView(n.prices),n.orderBook&&xt.updateMarketView(null,n.orderBook),n.contracts&&xt.updateContractsView(n.contracts),n.theater&&Kt.applyState(n.theater,n.serverNow||Date.now())});He.onDisconnect(()=>{Wr.markNetworkOffline(),Ni.cancelAll(),It("Connection Lost","The connection dropped — this place still renders, but shared actions wait for the server. It reconnects on its own, or pick a place to retry.","OFFLINE")});He.on(ge.PRESENCE_JOIN,n=>{js?.consumePresenceJoin?.(n)||n.player&&n.player.id!==He.guestId&&(as.setPlayer(n.player),It(gi?.copy.visitorArrival??"Gardener Arrived",`${n.player.nickname} entered the area.`))});He.on(ge.PRESENCE_LEAVE,n=>{js?.consumePresenceLeave?.(n)||n.playerId&&as.removePlayer(n.playerId)});He.on(ge.PRESENCE_UPDATE,n=>{if(!js?.consumePresenceUpdate?.(n)&&Array.isArray(n.players))for(const e of n.players)e.id!==He.guestId&&as.setPlayer(e)});He.on(ge.GARDEN_STATE,n=>{ua=n.beds,kr.setFixtures?.(n.fixtures||[]),kr.update(0,n.beds)});He.on(ge.INVENTORY_STATE,n=>{n.player&&(xt.updatePlayerHUD(n.player),xt.updateInventoryView(n.player),xt.updateMarketView(),xt.updateMachineShopView())});He.on(ge.MARKET_UPDATE,n=>{n.prices&&xt.updateMarketView(n.prices),n.orderBook&&xt.updateMarketView(null,n.orderBook)});He.on(ge.CONTRACT_UPDATE,n=>{n.contracts&&xt.updateContractsView(n.contracts)});He.on(ge.NODE_STATE,n=>{!n.roomId||!Array.isArray(n.nodes)||(Ic.set(n.roomId,n.nodes),Yo.get(n.roomId)?.setNodeStates?.(n.nodes))});He.on(ge.THEATER_STATE,n=>{n.theater&&Kt.applyState(n.theater,n.serverNow||Date.now())});He.on(ge.MACHINE_UPDATE,n=>{if(!n.machines?.mill)return;const e=Ji?.mill?.status;Ji=n.machines,xt.updateMachineShopView(Ji),Vr.setMachineState?.(Ji),Qf(),e==="broken"&&Ji.mill.status==="restored"&&(ou([523,659,784,1046]),It("The Great Mill Restored","The sails turn above the court. Wheat becomes flour for everyone.","RESTORATION COMPLETE"))});He.on(ge.TRADE_FILLED,n=>{const e=n.trade;ou([523,659,784]),It("Order Filled!",`Traded ${e.quantity}x ${e.cropId} @ ${e.price} ⛁`)});He.on(ge.WEATHER_UPDATE,n=>{ep(n.weather)});He.on(ge.ACTION_RESULT,n=>{n.success?(ou([440,554]),It(n.title||"Garden",n.message)):n.message&&It(n.title||"Notice",n.message)});let Jf=null;function Qf(){const n=ue("mill-panel");if(!n)return;const e=yt===wt.MARKET;if(n.style.display=e?"block":"none",Jf=yt,!e)return;const t=Ji?.mill,i=ue("mill-status-tag"),s=ue("mill-progress-lines");if(!t)return;if(t.status==="restored"){i.textContent="RESTORED",i.className="mill-tag restored",s.innerHTML='<div class="mill-line">✦ The sails are turning. It grinds wheat into flour for everyone.</div>';return}i.textContent="BROKEN",i.className="mill-tag broken";let r=0,o=0,a="";for(const[l,c]of Object.entries(t.required||{})){const u=Math.min(t.contributed?.[l]||0,c);r+=u,o+=c,a+=`<div class="mill-line"><span>${l}</span><b>${u}/${c}</b></div>`}a=`<div class="mill-line mill-total"><span>restoration</span><b>${r}/${o}</b></div>`+a,s.innerHTML=a}He.on(ge.EMOTE_BROADCAST,n=>{n.playerId===He.guestId||!_d(n.emote)||of(as.players.get(n.playerId)?.avatar,n.emote)});He.on(ge.WELCOME,()=>qf.setConnected(!0));function ep(n){if(xS(Di))return;const e=n==="rain"?"☔":n==="drizzle"?"☂":"☼",t=n==="rain"?"HEAVY RAIN":n==="drizzle"?"RAINY MIST":"CLEAR AFTER RAIN";ue("weather-icon").textContent=e,ue("weather-text").textContent=t,Et.fog.density=n==="rain"?.026:n==="drizzle"?.022:.016}He.connect();let _t=null,Ti=!0,vi=.7,ns=null,da=null,Uo=0,Tl=1;const tp="afterlight-footsteps";try{const n=localStorage.getItem(tp);if(n!==null&&n!==""){const e=Number(n);Number.isFinite(e)&&e>=0&&e<=100&&(vi=e/100)}}catch{}function rw(){try{localStorage.setItem(tp,String(Math.round(vi*100)))}catch{}}function ou(n=[440,554,660]){!_t||Ti||n.forEach((e,t)=>{const i=_t.createOscillator(),s=_t.createGain();i.type="sine",i.frequency.value=e,s.gain.setValueAtTime(0,_t.currentTime+t*.08),s.gain.linearRampToValueAtTime(.04,_t.currentTime+.02+t*.08),s.gain.exponentialRampToValueAtTime(.001,_t.currentTime+.8+t*.08),i.connect(s).connect(ci.buses.effects),i.start(_t.currentTime+t*.08),i.stop(_t.currentTime+.9+t*.08)})}function ow(){if(!_t||Ti||vi<=0||!da)return;const n=_t.createBufferSource();n.buffer=da,n.playbackRate.value=.85+Math.random()*.35;const e=_t.createBiquadFilter();e.type="lowpass",e.frequency.value=380+Math.random()*220;const t=_t.createGain(),i=_t.currentTime;if(t.gain.setValueAtTime(1e-4,i),t.gain.exponentialRampToValueAtTime(.5+Math.random()*.2,i+.012),t.gain.exponentialRampToValueAtTime(1e-4,i+.09),n.connect(e).connect(t),_t.createStereoPanner){const s=_t.createStereoPanner();s.pan.value=.22*Tl,Tl=-Tl,t.connect(s).connect(ns)}else t.connect(ns);n.start(i),n.stop(i+.1)}ue("sound").onclick=async()=>{if(Ti=!Ti,!_t&&(_t=ci.ensure(),_t)){ns=_t.createGain(),ns.gain.value=vi,ns.connect(ci.buses.effects),da=_t.createBuffer(1,Math.floor(_t.sampleRate*.09),_t.sampleRate);const n=da.getChannelData(0);for(let e=0;e<n.length;e++)n[e]=(Math.random()*2-1)*Math.pow(1-e/n.length,2);$s.start()}_t&&(Ti?(Ni.cancelAll(),await ci.suspend()):await ci.resume(),!Ti&&ci.status()!=="running"&&(Ti=!0)),ue("sound").textContent=Ti?"♫  Sound off":"♫  Sound on"};ue("footsteps").value=String(Math.round(vi*100));ue("footsteps-value").textContent=`${Math.round(vi*100)}%`;ue("footsteps").oninput=()=>{vi=Number(ue("footsteps").value)/100,ue("footsteps-value").textContent=`${Math.round(vi*100)}%`,ns&&(ns.gain.value=vi),rw()};const qn={quality:ue("atmosphere-quality"),motion:ue("atmosphere-motion"),flash:ue("atmosphere-flash")};function np(){qn.quality&&(qn.quality.value=jn.quality,qn.motion.value=jn.reduceMotion,qn.flash.value=jn.flash)}function au(n){jn={...jn,...n},fE(jn,localStorage),np(),Xf()}np();qn.quality?.addEventListener("change",()=>{au({quality:qn.quality.value})});qn.motion?.addEventListener("change",()=>{au({reduceMotion:qn.motion.value})});qn.flash?.addEventListener("change",()=>{au({flash:qn.flash.value})});Xf();function ip(n,e,t){const i=ue(n),s=ue(e);if(!i||!s)return;const r=Math.round(ci.preference(t)*100);i.value=String(r),s.textContent=`${r}%`,i.addEventListener("input",()=>{const o=Number(i.value)/100;s.textContent=`${i.value}%`,ci.setPreference(t,o)})}ip("ambience-volume","ambience-value","ambience");ip("weather-volume","weather-value","weather");ue("legacy-hud").checked=ha;ue("legacy-hud").onchange=()=>{ha=ue("legacy-hud").checked,UE(ha),Kf(Wr.snapshot().resolution)};function Ea(n){Gn=n,document.querySelectorAll(".tool-btn").forEach(t=>{t.classList.toggle("active",t.dataset.tool===n)}),$e.userData.setWateringCan(n==="water");const e={hands:"Tool: Hands & Inspect · Read crop stats",hoe:"Tool: Hoe · Till uncultivated beds",seed:`Tool: Seeds (${yn[Fr[Bs]].name}) · Plant in tilled beds`,water:"Tool: Watering Can · Replenish soil moisture",harvest:"Tool: Harvest Shears · Collect mature produce",sprinkler:"Tool: Sprinkler Kit · Press E on a bed to place (waters it + neighbors)"};ue("hud-tool-hint").textContent=e[n]||n}document.querySelectorAll(".tool-btn").forEach(n=>{n.onclick=()=>{const e=n.dataset.tool;e==="seed"&&Gn==="seed"&&(Bs=(Bs+1)%Fr.length,ue("active-seed-label").textContent=yn[Fr[Bs]].name),Ea(e)}});function rs(){jt.stand()}function sp(){if(!ln){if(jt.current){rs();return}if(!Pt){It("No Target Nearby",gi?.copy.noTargetHint??"Approach a garden bed, market stall, or gateway to interact.");return}if(!Zf.dispatch(Pt).handled){if(Pt.type==="landmark"){const n=Pn.find(e=>e.id===yt);n&&(An.completed.includes(yt)?It(n.done,"This sector has already been restored.","RESTORATION ACTIVE"):(An.completed.push(yt),$f(An),Qt.update?.(Fn,!0),It(n.done,n.message,"RESTORATION COMPLETE")));return}if(Pt.type==="market_board"){xt.openMarket();return}if(Pt.type==="seed_vendor"){xt.openSeedVendor();return}if(Pt.type==="contracts_board"){xt.openContracts();return}if(Pt.type==="material_node"){He.send(ge.NODE_HARVEST,{actionId:`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,nodeId:Pt.nodeId});return}if(Pt.type==="mill"){Ji?.mill?.status==="restored"?He.send(ge.MACHINE_MILL,{actionId:`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,quantity:1}):xt.openMachineShop();return}if(Pt.type==="machine_bench"){xt.openMachineShop();return}if(Pt.type==="bed"){const n=Pt.bedIndex,e=ua?ua[n]:null;if(Gn==="hoe"){He.sendGardenAction("till",n);return}if(Gn==="seed"){const t=Fr[Bs];He.sendGardenAction("plant",n,t);return}if(Gn==="water"){He.sendGardenAction("water",n);return}if(Gn==="harvest"){He.sendGardenAction("harvest",n);return}if(Gn==="sprinkler"){He.sendGardenAction("place_sprinkler",n);return}if(!e||e.stage===ri.EMPTY)It(`Bed #${n+1}`,"Unprepared soil. Select your Hoe (2) to till.");else if(e.stage===ri.PREPARED)It(`Bed #${n+1}`,"Prepared soil. Select Seeds (3) to sow.");else{const t=yn[e.cropId],i=["Empty","Prepared","Seed","Sprout","Juvenile","Mature","Harvestable"];It(`${t?.name||"Crop"} (Bed #${n+1})`,`Stage: ${i[e.stage]||"Growing"} · Moisture: ${Math.round((e.moisture||0)*100)}% · Health: ${Math.round((e.health||1)*100)}%`)}}}}}ue("interact").onclick=sp;ue("btn-inventory").onclick=()=>xt.openInventory();ue("btn-market").onclick=()=>xt.openMarket();function aw(){const n=Pn.map(t=>{const i=yt===t.id,s=An.completed.includes(t.id),r=An.visited.includes(t.id);let o="unexplored",a="UNEXPLORED";return i?(o="current",a="CURRENT"):s?(o="restored",a="✦ RESTORED"):r&&(o="visited",a="VISITED"),{roomId:t.id,featured:!!t.social?.featured,micro:t.district,name:t.name,description:t.description,badgeClass:o,badgeText:a,current:i}}),e=wt.gardenFor(He.guestId);return n.push({roomId:wt.MARKET,featured:!1,micro:"MARKET SOCIAL DISTRICT / 01",name:"The Market Court",description:"Exchange harvests, buy seeds, and fulfill town contracts.",badgeClass:yt===wt.MARKET?"current":"visited",badgeText:yt===wt.MARKET?"CURRENT":"CIVIC HUB",current:yt===wt.MARKET},{roomId:e,featured:!1,micro:"CULTIVATION PLOT",name:"Your Market Garden",description:"Till soil, sow crops, water, and harvest fresh produce.",badgeClass:yt===e?"current":"visited",badgeText:yt===e?"CURRENT":"PERSONAL PLOT",current:yt===e}),n}const lw=yM({dialog:ue("district-dialog"),container:ue("district-list"),closeButton:ue("close-districts"),net:He,getDestinations:aw,onTravel:n=>ru(n),onOpen:()=>{ln=!0,St.clear(),Ln()},onClose:()=>{ln=!1,St.clear(),Ln()}});function rp(){lw.open()}ue("btn-travel").onclick=rp;Gr=gp({canOpen:()=>!ln&&!document.querySelector("dialog[open]"),onOpen:()=>{St.clear(),Ln(),gn=null,In.visible=!1,Vt=null,Kt.setWatchMode(!1)},onChoose:n=>{of($e,n),He.sendEmote(n),It(Ds.find(e=>e.id===n).label,"Move to finish your emote.","EMOTE")}});ue("btn-emote").onclick=()=>Gr.open();ue("btn-edit-nick").onclick=()=>xt.openProfile();function wa(){ln=!ln,St.clear(),Ln(),ln?ue("settings-dialog").showModal():(ue("settings-dialog").close(),Di.resume(),Ni.resync())}ue("settings").onclick=wa;ue("resume").onclick=wa;ue("settings-dialog").addEventListener("cancel",n=>{n.preventDefault(),wa()});function cw(n){Vn=n,Nr=n===ui?Dr:mn,nu.camera=Nr,n===ui&&(Ur=$e.rotation.y+Math.PI,ca=0),$e.visible=n!==ui,kt.domElement.style.cursor=n===ui?"grab":""}ue("camera").onclick=()=>cw(wM(Vn));ue("quality").onchange=()=>{kt.setPixelRatio(Math.min(devicePixelRatio,Number(ue("quality").value))),Ta()};ue("atmosphere").onchange=()=>{iu.visible=ue("atmosphere").checked};window.addEventListener("keydown",n=>{if(!((n.target.closest('input,select,textarea,[contenteditable="true"]')||n.target.closest("#call-panel"))&&n.code!=="Escape")){if(jt.current&&["KeyE","KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(n.code)){if(rs(),n.code!=="KeyE"){n.preventDefault();return}return}if(n.code==="KeyT"){rp();return}if((n.code==="Enter"||n.code==="Slash")&&!document.querySelector("dialog[open]")){n.preventDefault(),qf.focusInput(n.code==="Slash"?"/":"");return}if(["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6"].includes(n.code)){const e=BE(n.code,{enabled:gi?gi.shortcuts.toolDigits:!0,emoteWheelOpen:!!Gr?.isOpen});e&&Ea(e);return}["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(n.code)&&n.preventDefault(),St.add(n.code),!n.repeat&&(n.code==="Space"&&!ln&&!jt.current&&(Mr=!0),n.code==="KeyE"&&sp(),n.code==="KeyI"&&xt.openInventory(),n.code==="KeyM"&&xt.openMarket(),n.code==="KeyG"&&yt===wt.THEATER&&!document.querySelector("dialog[open]")&&(n.preventDefault(),Kt.openControls()),n.code==="KeyC"&&ue("camera").click(),n.code==="Escape"&&(jt.current?rs():ln||(Kt.isWatching()?Kt.setWatchMode(!1):wa())))}});window.addEventListener("keyup",n=>St.delete(n.code));document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&(Di.resume(),Ni.resync())});window.addEventListener("blur",()=>{St.clear(),Ln()});kt.domElement.addEventListener("pointerdown",n=>{ln||Gr?.isOpen||(Vt={x:n.clientX,y:n.clientY,lastX:n.clientX,lastY:n.clientY,dragging:!1},kt.domElement.setPointerCapture(n.pointerId))});kt.domElement.addEventListener("pointermove",n=>{if(!Vt||ln)return;const e=n.clientX-Vt.lastX,t=n.clientY-Vt.lastY;Vt.lastX=n.clientX,Vt.lastY=n.clientY,Vt.dragging=CM(Vt.x,Vt.y,n.clientX,n.clientY,Vt.dragging),Vt.dragging&&Vn===ui&&(Ur-=e*WE,ca=TM(ca-t*XE))});function uw(n){const e=Vt;if(Vt=null,!(!e||ln||e.dragging)&&(jt.current?rs():Kt.isWatching()&&Kt.setWatchMode(!1),pd.setFromCamera(new Ee(n.clientX/innerWidth*2-1,-(n.clientY/innerHeight)*2+1),Nr),pd.ray.intersectPlane(ew,El))){const t=Rb(Pi,El.x,El.z);gn=new k(t.x,0,t.z),In.position.set(gn.x,.24,gn.z),In.visible=!0}}kt.domElement.addEventListener("pointerup",uw);kt.domElement.addEventListener("pointercancel",()=>{Vt=null});kt.domElement.addEventListener("wheel",n=>{n.preventDefault(),Vn!==ui&&(Us=_m.clamp(Us+n.deltaY*.015,18,34),Ta())},{passive:!1});function hw(n,e,t,i){const s=n.position.x,r=n.position.z;la(Pi,Qt.obstacles,s+e,r)&&(n.position.x+=e),la(Pi,Qt.obstacles,n.position.x,r+t)&&(n.position.z+=t);const o=Math.hypot(n.position.x-s,n.position.z-r)>1e-4;return o?(n.rotation.y=Math.atan2(e,t),n.position.y=Math.sin(Fn*13)*.025,n.userData.legs.forEach((a,l)=>{a.rotation.x=Math.sin(Fn*13+l*Math.PI)*.45})):(n.position.y=0,n.userData.legs.forEach(a=>{a.rotation.x*=.8})),o}function Ta(){const n=innerWidth/innerHeight;mn.left=-Us*n/2,mn.right=Us*n/2,mn.top=Us/2,mn.bottom=-Us/2,mn.near=.1,mn.far=150,mn.updateProjectionMatrix(),Dr.aspect=n,Dr.updateProjectionMatrix(),kt.setSize(innerWidth,innerHeight),Sa.setSize(innerWidth,innerHeight)}window.addEventListener("resize",Ta);Ta();const Oo=new k(0,0,0);let gd=performance.now();function op(n){requestAnimationFrame(op);const e=Math.min((n-gd)/1e3,.04);if(gd=n,!ln){Fn+=e;let t=0,i=0;(St.has("KeyW")||St.has("ArrowUp"))&&i--,(St.has("KeyS")||St.has("ArrowDown"))&&i++,(St.has("KeyA")||St.has("ArrowLeft"))&&t--,(St.has("KeyD")||St.has("ArrowRight"))&&t++,jt.current&&(t||i)?(rs(),t=0,i=0):!jt.current&&(t||i)&&Kt.isWatching()&&Kt.setWatchMode(!1);let s=new k(0,0,0);if(t||i){gn=null,In.visible=!1;const h=AM(Vn,Ur,t,i);s.set(h.x,0,h.z)}else gn&&(s.subVectors(gn,$e.position),s.y=0,s.length()<.15&&(gn=null,In.visible=!1,s.set(0,0,0)));(s.lengthSq()>0||Mr)&&zr($e);const r=St.has("ShiftLeft")||St.has("ShiftRight"),o=r?fd:QE;jt.current||(Ax(ji,{jumpPressed:Mr,jumpHeld:St.has("Space"),moving:s.lengthSq()>0,speed:o,cap:fd*wx},e),Mr=!1),s.normalize().multiplyScalar(e*Cx(ji,o));const a=jt.current?!1:hw($e,s.x,s.z);gn&&!a&&(gn=null,In.visible=!1),!jt.current&&ji.airborne&&($e.position.y=ji.y,$e.userData.legs.forEach(h=>{h.rotation.x=-.8})),af($e,e),a&&!ji.airborne?(Uo-=e,Uo<=0&&(ow(),Uo=r?.29:.42)):Uo=0,He.sendMovement($e.position.x,$e.position.z,$e.rotation.y,a,!!jt.current,!jt.current&&ji.airborne);const l=new k().subVectors($e.position,Ft.position);if(l.y=0,l.length()>1.3){l.normalize().multiplyScalar(e*3.5);const h=Ft.position.x,v=Ft.position.z;la(Pi,Qt.obstacles||[],h+l.x,v)&&(Ft.position.x+=l.x),la(Pi,Qt.obstacles||[],Ft.position.x,v+l.z)&&(Ft.position.z+=l.z),Math.hypot(Ft.position.x-h,Ft.position.z-v)>1e-4?(Ft.rotation.y=Math.atan2(l.x,l.z),Ft.position.y=Math.sin(Fn*12)*.025,Ft.userData.legs?.forEach((m,p)=>m.rotation.x=Math.sin(Fn*12+p*Math.PI)*.45)):(Ft.position.y=0,Ft.userData.legs?.forEach(m=>m.rotation.x*=.8))}else Ft.position.y=0,Ft.userData.legs?.forEach(h=>h.rotation.x*=.8);js?.update?js.update(e,Fn):as.update(e,Fn);const c=RM({isGardenRoom:wt.isGarden(yt),gardenBeds:ua,completed:An.completed.includes(yt)});Qt.update?.(Fn,c.value),Or.update(e*1e3),Ni.update();const u=Ni.getPulse();KE(),u.active&&u.amplitude>0&&(kt.toneMappingExposure+=u.exposureAdd,Bt.intensity*=1+u.sunAdd),Pt=null;let f=2.4;for(const h of Qt.items||[]){const v=Math.hypot($e.position.x-h.x,$e.position.z-h.z);v<f&&(Pt=h,f=v)}if(Pt)ue("action-title").textContent=Pt.title,ue("action-sub").textContent=Pt.sub,ue("interact").style.borderColor="#c6b47a99";else{const h=Pn.find(v=>v.id===yt);h?(ue("action-title").textContent=h.name,ue("action-sub").textContent=gi?.copy.idleActionHint??"Explore sector with Kiln · Press T to travel"):(ue("action-title").textContent=yt===wt.MARKET?"Market Court":"Your Market Garden",ue("action-sub").textContent=yt===wt.MARKET?"Explore stalls or travel to outer districts":"Approach beds to till, plant, water, and harvest"),ue("interact").style.borderColor="#9faa9240"}Qt.previewCoverage?.(Gn==="sprinkler"&&Pt?.type==="bed"?Pt.bedIndex:null),yt!==Jf&&Qf();const d=Pb(Pi,$e.position.x,$e.position.z);ue("map-player").setAttribute("cx",d.cx),ue("map-player").setAttribute("cy",d.cy),iu.rotation.y=Math.sin(Fn*.03)*.04}if(Vn===ui){const t=jt.current?GE:VE;Dr.position.set($e.position.x,$e.position.y+t,$e.position.z),Dr.rotation.set(ca,Ur,0,"YXZ")}else{const t=[[21,25,26],[0,29,31],[-23,27,25]];Oo.lerp(new k($e.position.x*.14,.1,$e.position.z*.14),.025),mn.position.set(Oo.x+t[Vn][0],t[Vn][1],Oo.z+t[Vn][2]),mn.lookAt(Oo)}if(nu.camera=Nr,Sa.render(),yt===wt.THEATER&&Qt?.screenQuad){const t=Qt.screenQuad,i=t.map(o=>{const a=o.clone().project(Nr);return{x:(a.x*.5+.5)*innerWidth,y:(-a.y*.5+.5)*innerHeight,z:a.z}}),s=i.every(o=>o.z>-1&&o.z<1)&&i.every(o=>o.x>-innerWidth&&o.x<innerWidth*2&&o.y>-innerHeight&&o.y<innerHeight*2),r=s?t[1].distanceTo(t[0])/Math.max(.01,t[3].distanceTo(t[0])):void 0;Kt.updateScreenQuad(s?i.map(({x:o,y:a})=>({x:o,y:a})):null,r)}else Kt.updateScreenQuad(null)}requestAnimationFrame(op);ue("loading").style.opacity="0";setTimeout(()=>ue("loading").remove(),800);export{$d as C,Li as I,Ze as M,it as a,ge as b};
