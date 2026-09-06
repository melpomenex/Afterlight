(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=t(s);fetch(s.href,r)}})();const Gd="modulepreload",Wd=function(i){return"/"+i},sc={},Uh=function(e,t,n){let s=Promise.resolve();if(t&&t.length>0){let l=function(c){return Promise.all(c.map(h=>Promise.resolve(h).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),a=o?.nonce||o?.getAttribute("nonce");s=l(t.map(c=>{if(c=Wd(c),c in sc)return;sc[c]=!0;const h=c.endsWith(".css"),f=h?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${f}`))return;const d=document.createElement("link");if(d.rel=h?"stylesheet":Gd,h||(d.as="script"),d.crossOrigin="",d.href=c,a&&d.setAttribute("nonce",a),document.head.appendChild(d),h)return new Promise((u,g)=>{d.addEventListener("load",u),d.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${c}`)))})}))}function r(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return s.then(o=>{for(const a of o||[])a.status==="rejected"&&r(a.reason);return e().catch(r)})},us=Object.freeze([{id:"wave",label:"Hello there",icon:"👋",hint:"A little warmth goes a long way"},{id:"dance",label:"Rust shuffle",icon:"♫",hint:"Still got some rhythm in these gears"},{id:"cheer",label:"We did it!",icon:"✦",hint:"Small repairs. Big celebrations."},{id:"heart",label:"Much love",icon:"♡",hint:"For your favorite fellow gardener"},{id:"bow",label:"After you",icon:"❧",hint:"A gracious little thank-you"},{id:"shrug",label:"Who knows?",icon:"¯\\_(ツ)_/¯",hint:"Some mysteries can wait"}]),Nh=i=>us.some(e=>e.id===i),Do=3.2;function Xd(i,e,t=44){return!Number.isFinite(i)||!Number.isFinite(e)||Math.hypot(i,e)<t?-1:Math.floor((Math.atan2(e,i)+Math.PI/2+Math.PI/6+Math.PI*2)%(Math.PI*2)/(Math.PI/3))}function qd({canOpen:i,onOpen:e,onChoose:t}){const n=document.createElement("div");n.className="emote-overlay",n.hidden=!0,n.innerHTML=`<section class="emote-wheel" role="dialog" aria-label="Emotes" aria-describedby="emote-help"><div class="emote-center"><small>EXPRESS YOURSELF</small><strong aria-live="polite">Choose a feeling</strong><span class="emote-description">Move outward to choose</span><i class="emote-stick"></i></div>${us.map((d,u)=>`<button class="emote-choice" style="--x:${Math.sin(u*Math.PI/3)*36}%;--y:${-Math.cos(u*Math.PI/3)*36}%" data-index="${u}" aria-label="${d.label}"><span>${d.icon}</span><b>${d.label}</b><small>${u+1}</small></button>`).join("")}<p id="emote-help">Release V to perform · Center / Esc cancels<br>Or choose with 1–6 / arrow keys</p></section>`,document.body.append(n);const s=n.querySelector(".emote-wheel"),r=[...n.querySelectorAll("button")];let o=-1,a=!1,l;function c(d){o=d,r.forEach((u,g)=>{u.classList.toggle("selected",g===d),u.setAttribute("aria-pressed",String(g===d))}),n.querySelector("strong").textContent=us[d]?.label||"Choose a feeling",n.querySelector(".emote-description").textContent=us[d]?.hint||"Center to cancel"}function h(d=!1){if(n.hidden)return;const u=us[o];n.hidden=!0,a=!1,l?.focus({preventScroll:!0}),d&&u&&t(u.id)}function f(d=!1){!n.hidden||!i()||(e(),l=document.activeElement,a=d,n.hidden=!1,c(-1),n.querySelector(".emote-stick").style.transform="",r[0].focus({preventScroll:!0}))}return n.addEventListener("pointermove",d=>{const u=s.getBoundingClientRect(),g=d.clientX-u.left-u.width/2,_=d.clientY-u.top-u.height/2;c(Xd(g,_,u.width*.12));const m=Math.hypot(g,_)||1;n.querySelector(".emote-stick").style.transform=`translate(${g/m*Math.min(16,m)}px, ${_/m*Math.min(16,m)}px)`}),n.addEventListener("click",d=>{const u=d.target.closest("button");u?(c(Number(u.dataset.index)),h(!0)):h()}),window.addEventListener("keydown",d=>{const u=d.target.closest('input,textarea,select,[contenteditable="true"]');if(n.hidden){d.code==="KeyV"&&!d.repeat&&!u&&!d.ctrlKey&&!d.metaKey&&!d.altKey&&i()&&(d.preventDefault(),d.stopImmediatePropagation(),f(!0));return}if(d.stopImmediatePropagation(),d.code==="Tab"){d.preventDefault(),c((o+(d.shiftKey?5:1)+6)%6),r[o].focus();return}d.preventDefault(),d.code==="Escape"?h():/^Digit[1-6]$/.test(d.code)?c(Number(d.code.slice(-1))-1):["ArrowRight","ArrowDown","ArrowLeft","ArrowUp"].includes(d.code)?c((o+(["ArrowLeft","ArrowUp"].includes(d.code)?5:1)+6)%6):(d.code==="Enter"||d.code==="Space")&&h(!0)},!0),window.addEventListener("keyup",d=>{d.code==="KeyV"&&a&&(d.preventDefault(),d.stopImmediatePropagation(),h(!0))},!0),window.addEventListener("blur",()=>h()),document.addEventListener("visibilitychange",()=>{document.hidden&&h()}),window.addEventListener("resize",()=>h()),{open:f,close:h,get isOpen(){return!n.hidden}}}const bl="180",$d=0,rc=1,Yd=2,Oh=1,Fh=2,jn=3,_i=0,jt=1,rn=2,ei=0,gs=1,wa=2,oc=3,ac=4,jd=5,Pi=100,Kd=101,Zd=102,Jd=103,Qd=104,eu=200,tu=201,nu=202,iu=203,Aa=204,Ca=205,su=206,ru=207,ou=208,au=209,lu=210,cu=211,hu=212,du=213,uu=214,Ra=0,Pa=1,La=2,xs=3,Ia=4,Da=5,Ua=6,Na=7,Bh=0,fu=1,pu=2,gi=0,mu=1,gu=2,_u=3,kh=4,vu=5,yu=6,xu=7,Hh=300,Ms=301,Ss=302,Oa=303,Fa=304,So=306,Ba=1e3,Ui=1001,ka=1002,on=1003,Mu=1004,gr=1005,bn=1006,Uo=1007,Ni=1008,zn=1009,zh=1010,Vh=1011,Zs=1012,Tl=1013,Bi=1014,Bn=1015,ti=1016,wl=1017,Al=1018,Js=1020,Gh=35902,Wh=35899,Xh=1021,qh=1022,Tn=1023,Qs=1026,er=1027,Cl=1028,Rl=1029,$h=1030,Pl=1031,Ll=1033,Qr=33776,eo=33777,to=33778,no=33779,Ha=35840,za=35841,Va=35842,Ga=35843,Wa=36196,Xa=37492,qa=37496,$a=37808,Ya=37809,ja=37810,Ka=37811,Za=37812,Ja=37813,Qa=37814,el=37815,tl=37816,nl=37817,il=37818,sl=37819,rl=37820,ol=37821,al=36492,ll=36494,cl=36495,hl=36283,dl=36284,ul=36285,fl=36286,Su=3200,Eu=3201,Yh=0,bu=1,pi="",fn="srgb",Es="srgb-linear",ho="linear",rt="srgb",Wi=7680,lc=519,Tu=512,wu=513,Au=514,jh=515,Cu=516,Ru=517,Pu=518,Lu=519,pl=35044,cc="300 es",kn=2e3,uo=2001;class ws{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const s=n[e];if(s!==void 0){const r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}}const Ft=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let hc=1234567;const qs=Math.PI/180,tr=180/Math.PI;function ni(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ft[i&255]+Ft[i>>8&255]+Ft[i>>16&255]+Ft[i>>24&255]+"-"+Ft[e&255]+Ft[e>>8&255]+"-"+Ft[e>>16&15|64]+Ft[e>>24&255]+"-"+Ft[t&63|128]+Ft[t>>8&255]+"-"+Ft[t>>16&255]+Ft[t>>24&255]+Ft[n&255]+Ft[n>>8&255]+Ft[n>>16&255]+Ft[n>>24&255]).toLowerCase()}function je(i,e,t){return Math.max(e,Math.min(t,i))}function Il(i,e){return(i%e+e)%e}function Iu(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function Du(i,e,t){return i!==e?(t-i)/(e-i):0}function $s(i,e,t){return(1-t)*i+t*e}function Uu(i,e,t,n){return $s(i,e,1-Math.exp(-t*n))}function Nu(i,e=1){return e-Math.abs(Il(i,e*2)-e)}function Ou(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Fu(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Bu(i,e){return i+Math.floor(Math.random()*(e-i+1))}function ku(i,e){return i+Math.random()*(e-i)}function Hu(i){return i*(.5-Math.random())}function zu(i){i!==void 0&&(hc=i);let e=hc+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Vu(i){return i*qs}function Gu(i){return i*tr}function Wu(i){return(i&i-1)===0&&i!==0}function Xu(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function qu(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function $u(i,e,t,n,s){const r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),c=r((e+n)/2),h=o((e+n)/2),f=r((e-n)/2),d=o((e-n)/2),u=r((n-e)/2),g=o((n-e)/2);switch(s){case"XYX":i.set(a*h,l*f,l*d,a*c);break;case"YZY":i.set(l*d,a*h,l*f,a*c);break;case"ZXZ":i.set(l*f,l*d,a*h,a*c);break;case"XZX":i.set(a*h,l*g,l*u,a*c);break;case"YXY":i.set(l*u,a*h,l*g,a*c);break;case"ZYZ":i.set(l*g,l*u,a*h,a*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function En(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function nt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const Yu={DEG2RAD:qs,RAD2DEG:tr,generateUUID:ni,clamp:je,euclideanModulo:Il,mapLinear:Iu,inverseLerp:Du,lerp:$s,damp:Uu,pingpong:Nu,smoothstep:Ou,smootherstep:Fu,randInt:Bu,randFloat:ku,randFloatSpread:Hu,seededRandom:zu,degToRad:Vu,radToDeg:Gu,isPowerOfTwo:Wu,ceilPowerOfTwo:Xu,floorPowerOfTwo:qu,setQuaternionFromProperEuler:$u,normalize:nt,denormalize:En};class Ae{constructor(e=0,t=0){Ae.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=je(this.x,e.x,t.x),this.y=je(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=je(this.x,e,t),this.y=je(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(je(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(je(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*s+e.x,this.y=r*s+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class hr{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],f=n[s+3];const d=r[o+0],u=r[o+1],g=r[o+2],_=r[o+3];if(a===0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=f;return}if(a===1){e[t+0]=d,e[t+1]=u,e[t+2]=g,e[t+3]=_;return}if(f!==_||l!==d||c!==u||h!==g){let m=1-a;const p=l*d+c*u+h*g+f*_,E=p>=0?1:-1,b=1-p*p;if(b>Number.EPSILON){const R=Math.sqrt(b),w=Math.atan2(R,p*E);m=Math.sin(m*w)/R,a=Math.sin(a*w)/R}const M=a*E;if(l=l*m+d*M,c=c*m+u*M,h=h*m+g*M,f=f*m+_*M,m===1-a){const R=1/Math.sqrt(l*l+c*c+h*h+f*f);l*=R,c*=R,h*=R,f*=R}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=f}static multiplyQuaternionsFlat(e,t,n,s,r,o){const a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],f=r[o],d=r[o+1],u=r[o+2],g=r[o+3];return e[t]=a*g+h*f+l*u-c*d,e[t+1]=l*g+h*d+c*f-a*u,e[t+2]=c*g+h*u+a*d-l*f,e[t+3]=h*g-a*f-l*d-c*u,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),f=a(r/2),d=l(n/2),u=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=d*h*f+c*u*g,this._y=c*u*f-d*h*g,this._z=c*h*g+d*u*f,this._w=c*h*f-d*u*g;break;case"YXZ":this._x=d*h*f+c*u*g,this._y=c*u*f-d*h*g,this._z=c*h*g-d*u*f,this._w=c*h*f+d*u*g;break;case"ZXY":this._x=d*h*f-c*u*g,this._y=c*u*f+d*h*g,this._z=c*h*g+d*u*f,this._w=c*h*f-d*u*g;break;case"ZYX":this._x=d*h*f-c*u*g,this._y=c*u*f+d*h*g,this._z=c*h*g-d*u*f,this._w=c*h*f+d*u*g;break;case"YZX":this._x=d*h*f+c*u*g,this._y=c*u*f+d*h*g,this._z=c*h*g-d*u*f,this._w=c*h*f-d*u*g;break;case"XZY":this._x=d*h*f-c*u*g,this._y=c*u*f-d*h*g,this._z=c*h*g+d*u*f,this._w=c*h*f+d*u*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],s=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],h=t[6],f=t[10],d=n+a+f;if(d>0){const u=.5/Math.sqrt(d+1);this._w=.25/u,this._x=(h-l)*u,this._y=(r-c)*u,this._z=(o-s)*u}else if(n>a&&n>f){const u=2*Math.sqrt(1+n-a-f);this._w=(h-l)/u,this._x=.25*u,this._y=(s+o)/u,this._z=(r+c)/u}else if(a>f){const u=2*Math.sqrt(1+a-n-f);this._w=(r-c)/u,this._x=(s+o)/u,this._y=.25*u,this._z=(l+h)/u}else{const u=2*Math.sqrt(1+f-n-a);this._w=(o-s)/u,this._x=(r+c)/u,this._y=(l+h)/u,this._z=.25*u}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(je(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,s=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,s=this._y,r=this._z,o=this._w;let a=o*e._w+n*e._x+s*e._y+r*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=n,this._y=s,this._z=r,this;const l=1-a*a;if(l<=Number.EPSILON){const u=1-t;return this._w=u*o+t*this._w,this._x=u*n+t*this._x,this._y=u*s+t*this._y,this._z=u*r+t*this._z,this.normalize(),this}const c=Math.sqrt(l),h=Math.atan2(c,a),f=Math.sin((1-t)*h)/c,d=Math.sin(t*h)/c;return this._w=o*f+this._w*d,this._x=n*f+this._x*d,this._y=s*f+this._y*d,this._z=r*f+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class U{constructor(e=0,t=0,n=0){U.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(dc.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(dc.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,s=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*s-a*n),h=2*(a*t-r*s),f=2*(r*n-o*t);return this.x=t+l*c+o*f-a*h,this.y=n+l*h+a*c-r*f,this.z=s+l*f+r*h-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=je(this.x,e.x,t.x),this.y=je(this.y,e.y,t.y),this.z=je(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=je(this.x,e,t),this.y=je(this.y,e,t),this.z=je(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(je(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,s=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return No.copy(this).projectOnVector(e),this.sub(No)}reflect(e){return this.sub(No.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(je(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const No=new U,dc=new hr;class Ge{constructor(e,t,n,s,r,o,a,l,c){Ge.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c)}set(e,t,n,s,r,o,a,l,c){const h=this.elements;return h[0]=e,h[1]=s,h[2]=a,h[3]=t,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],f=n[7],d=n[2],u=n[5],g=n[8],_=s[0],m=s[3],p=s[6],E=s[1],b=s[4],M=s[7],R=s[2],w=s[5],L=s[8];return r[0]=o*_+a*E+l*R,r[3]=o*m+a*b+l*w,r[6]=o*p+a*M+l*L,r[1]=c*_+h*E+f*R,r[4]=c*m+h*b+f*w,r[7]=c*p+h*M+f*L,r[2]=d*_+u*E+g*R,r[5]=d*m+u*b+g*w,r[8]=d*p+u*M+g*L,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8];return t*o*h-t*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],f=h*o-a*c,d=a*l-h*r,u=c*r-o*l,g=t*f+n*d+s*u;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return e[0]=f*_,e[1]=(s*c-h*n)*_,e[2]=(a*n-s*o)*_,e[3]=d*_,e[4]=(h*t-s*l)*_,e[5]=(s*r-a*t)*_,e[6]=u*_,e[7]=(n*l-c*t)*_,e[8]=(o*t-n*r)*_,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,o,a){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-s*c,s*l,-s*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Oo.makeScale(e,t)),this}rotate(e){return this.premultiply(Oo.makeRotation(-e)),this}translate(e,t){return this.premultiply(Oo.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Oo=new Ge;function Kh(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function fo(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function ju(){const i=fo("canvas");return i.style.display="block",i}const uc={};function nr(i){i in uc||(uc[i]=!0,console.warn(i))}function Ku(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}const fc=new Ge().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),pc=new Ge().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Zu(){const i={enabled:!0,workingColorSpace:Es,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===rt&&(s.r=ii(s.r),s.g=ii(s.g),s.b=ii(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===rt&&(s.r=_s(s.r),s.g=_s(s.g),s.b=_s(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===pi?ho:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return nr("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return nr("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Es]:{primaries:e,whitePoint:n,transfer:ho,toXYZ:fc,fromXYZ:pc,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:fn},outputColorSpaceConfig:{drawingBufferColorSpace:fn}},[fn]:{primaries:e,whitePoint:n,transfer:rt,toXYZ:fc,fromXYZ:pc,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:fn}}}),i}const Ze=Zu();function ii(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function _s(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Xi;class Ju{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Xi===void 0&&(Xi=fo("canvas")),Xi.width=e.width,Xi.height=e.height;const s=Xi.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=Xi}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=fo("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=ii(r[o]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(ii(t[n]/255)*255):t[n]=ii(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Qu=0;class Dl{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Qu++}),this.uuid=ni(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Fo(s[o].image)):r.push(Fo(s[o]))}else r=Fo(s);n.url=r}return t||(e.images[this.uuid]=n),n}}function Fo(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Ju.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let ef=0;const Bo=new U;class kt extends ws{constructor(e=kt.DEFAULT_IMAGE,t=kt.DEFAULT_MAPPING,n=Ui,s=Ui,r=bn,o=Ni,a=Tn,l=zn,c=kt.DEFAULT_ANISOTROPY,h=pi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:ef++}),this.uuid=ni(),this.name="",this.source=new Dl(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Ae(0,0),this.repeat=new Ae(1,1),this.center=new Ae(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ge,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Bo).x}get height(){return this.source.getSize(Bo).y}get depth(){return this.source.getSize(Bo).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Hh)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ba:e.x=e.x-Math.floor(e.x);break;case Ui:e.x=e.x<0?0:1;break;case ka:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Ba:e.y=e.y-Math.floor(e.y);break;case Ui:e.y=e.y<0?0:1;break;case ka:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}kt.DEFAULT_IMAGE=null;kt.DEFAULT_MAPPING=Hh;kt.DEFAULT_ANISOTROPY=1;class ot{constructor(e=0,t=0,n=0,s=1){ot.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*s+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r;const l=e.elements,c=l[0],h=l[4],f=l[8],d=l[1],u=l[5],g=l[9],_=l[2],m=l[6],p=l[10];if(Math.abs(h-d)<.01&&Math.abs(f-_)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+d)<.1&&Math.abs(f+_)<.1&&Math.abs(g+m)<.1&&Math.abs(c+u+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const b=(c+1)/2,M=(u+1)/2,R=(p+1)/2,w=(h+d)/4,L=(f+_)/4,I=(g+m)/4;return b>M&&b>R?b<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(b),s=w/n,r=L/n):M>R?M<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(M),n=w/s,r=I/s):R<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(R),n=L/r,s=I/r),this.set(n,s,r,t),this}let E=Math.sqrt((m-g)*(m-g)+(f-_)*(f-_)+(d-h)*(d-h));return Math.abs(E)<.001&&(E=1),this.x=(m-g)/E,this.y=(f-_)/E,this.z=(d-h)/E,this.w=Math.acos((c+u+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=je(this.x,e.x,t.x),this.y=je(this.y,e.y,t.y),this.z=je(this.z,e.z,t.z),this.w=je(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=je(this.x,e,t),this.y=je(this.y,e,t),this.z=je(this.z,e,t),this.w=je(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(je(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class tf extends ws{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:bn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new ot(0,0,e,t),this.scissorTest=!1,this.viewport=new ot(0,0,e,t);const s={width:e,height:t,depth:n.depth},r=new kt(s);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:bn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isArrayTexture=this.textures[s].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const s=Object.assign({},e.textures[t].image);this.textures[t].source=new Dl(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class An extends tf{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Zh extends kt{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=on,this.minFilter=on,this.wrapR=Ui,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class nf extends kt{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=on,this.minFilter=on,this.wrapR=Ui,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Hi{constructor(e=new U(1/0,1/0,1/0),t=new U(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(yn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(yn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=yn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,yn):yn.fromBufferAttribute(r,o),yn.applyMatrix4(e.matrixWorld),this.expandByPoint(yn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),_r.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),_r.copy(n.boundingBox)),_r.applyMatrix4(e.matrixWorld),this.union(_r)}const s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,yn),yn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ls),vr.subVectors(this.max,Ls),qi.subVectors(e.a,Ls),$i.subVectors(e.b,Ls),Yi.subVectors(e.c,Ls),ai.subVectors($i,qi),li.subVectors(Yi,$i),Mi.subVectors(qi,Yi);let t=[0,-ai.z,ai.y,0,-li.z,li.y,0,-Mi.z,Mi.y,ai.z,0,-ai.x,li.z,0,-li.x,Mi.z,0,-Mi.x,-ai.y,ai.x,0,-li.y,li.x,0,-Mi.y,Mi.x,0];return!ko(t,qi,$i,Yi,vr)||(t=[1,0,0,0,1,0,0,0,1],!ko(t,qi,$i,Yi,vr))?!1:(yr.crossVectors(ai,li),t=[yr.x,yr.y,yr.z],ko(t,qi,$i,Yi,vr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,yn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(yn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Wn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Wn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Wn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Wn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Wn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Wn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Wn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Wn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Wn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Wn=[new U,new U,new U,new U,new U,new U,new U,new U],yn=new U,_r=new Hi,qi=new U,$i=new U,Yi=new U,ai=new U,li=new U,Mi=new U,Ls=new U,vr=new U,yr=new U,Si=new U;function ko(i,e,t,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){Si.fromArray(i,r);const a=s.x*Math.abs(Si.x)+s.y*Math.abs(Si.y)+s.z*Math.abs(Si.z),l=e.dot(Si),c=t.dot(Si),h=n.dot(Si);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const sf=new Hi,Is=new U,Ho=new U;class As{constructor(e=new U,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):sf.setFromPoints(e).getCenter(n);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Is.subVectors(e,this.center);const t=Is.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(Is,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Ho.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Is.copy(e.center).add(Ho)),this.expandByPoint(Is.copy(e.center).sub(Ho))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const Xn=new U,zo=new U,xr=new U,ci=new U,Vo=new U,Mr=new U,Go=new U;class Ul{constructor(e=new U,t=new U(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Xn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Xn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Xn.copy(this.origin).addScaledVector(this.direction,t),Xn.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){zo.copy(e).add(t).multiplyScalar(.5),xr.copy(t).sub(e).normalize(),ci.copy(this.origin).sub(zo);const r=e.distanceTo(t)*.5,o=-this.direction.dot(xr),a=ci.dot(this.direction),l=-ci.dot(xr),c=ci.lengthSq(),h=Math.abs(1-o*o);let f,d,u,g;if(h>0)if(f=o*l-a,d=o*a-l,g=r*h,f>=0)if(d>=-g)if(d<=g){const _=1/h;f*=_,d*=_,u=f*(f+o*d+2*a)+d*(o*f+d+2*l)+c}else d=r,f=Math.max(0,-(o*d+a)),u=-f*f+d*(d+2*l)+c;else d=-r,f=Math.max(0,-(o*d+a)),u=-f*f+d*(d+2*l)+c;else d<=-g?(f=Math.max(0,-(-o*r+a)),d=f>0?-r:Math.min(Math.max(-r,-l),r),u=-f*f+d*(d+2*l)+c):d<=g?(f=0,d=Math.min(Math.max(-r,-l),r),u=d*(d+2*l)+c):(f=Math.max(0,-(o*r+a)),d=f>0?r:Math.min(Math.max(-r,-l),r),u=-f*f+d*(d+2*l)+c);else d=o>0?-r:r,f=Math.max(0,-(o*d+a)),u=-f*f+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,f),s&&s.copy(zo).addScaledVector(xr,d),u}intersectSphere(e,t){Xn.subVectors(e.center,this.origin);const n=Xn.dot(this.direction),s=Xn.dot(Xn)-n*n,r=e.radius*e.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,o,a,l;const c=1/this.direction.x,h=1/this.direction.y,f=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,s=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,s=(e.min.x-d.x)*c),h>=0?(r=(e.min.y-d.y)*h,o=(e.max.y-d.y)*h):(r=(e.max.y-d.y)*h,o=(e.min.y-d.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),f>=0?(a=(e.min.z-d.z)*f,l=(e.max.z-d.z)*f):(a=(e.max.z-d.z)*f,l=(e.min.z-d.z)*f),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,Xn)!==null}intersectTriangle(e,t,n,s,r){Vo.subVectors(t,e),Mr.subVectors(n,e),Go.crossVectors(Vo,Mr);let o=this.direction.dot(Go),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;ci.subVectors(this.origin,e);const l=a*this.direction.dot(Mr.crossVectors(ci,Mr));if(l<0)return null;const c=a*this.direction.dot(Vo.cross(ci));if(c<0||l+c>o)return null;const h=-a*ci.dot(Go);return h<0?null:this.at(h/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class at{constructor(e,t,n,s,r,o,a,l,c,h,f,d,u,g,_,m){at.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c,h,f,d,u,g,_,m)}set(e,t,n,s,r,o,a,l,c,h,f,d,u,g,_,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=s,p[1]=r,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=h,p[10]=f,p[14]=d,p[3]=u,p[7]=g,p[11]=_,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new at().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,s=1/ji.setFromMatrixColumn(e,0).length(),r=1/ji.setFromMatrixColumn(e,1).length(),o=1/ji.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,s=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),f=Math.sin(r);if(e.order==="XYZ"){const d=o*h,u=o*f,g=a*h,_=a*f;t[0]=l*h,t[4]=-l*f,t[8]=c,t[1]=u+g*c,t[5]=d-_*c,t[9]=-a*l,t[2]=_-d*c,t[6]=g+u*c,t[10]=o*l}else if(e.order==="YXZ"){const d=l*h,u=l*f,g=c*h,_=c*f;t[0]=d+_*a,t[4]=g*a-u,t[8]=o*c,t[1]=o*f,t[5]=o*h,t[9]=-a,t[2]=u*a-g,t[6]=_+d*a,t[10]=o*l}else if(e.order==="ZXY"){const d=l*h,u=l*f,g=c*h,_=c*f;t[0]=d-_*a,t[4]=-o*f,t[8]=g+u*a,t[1]=u+g*a,t[5]=o*h,t[9]=_-d*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const d=o*h,u=o*f,g=a*h,_=a*f;t[0]=l*h,t[4]=g*c-u,t[8]=d*c+_,t[1]=l*f,t[5]=_*c+d,t[9]=u*c-g,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const d=o*l,u=o*c,g=a*l,_=a*c;t[0]=l*h,t[4]=_-d*f,t[8]=g*f+u,t[1]=f,t[5]=o*h,t[9]=-a*h,t[2]=-c*h,t[6]=u*f+g,t[10]=d-_*f}else if(e.order==="XZY"){const d=o*l,u=o*c,g=a*l,_=a*c;t[0]=l*h,t[4]=-f,t[8]=c*h,t[1]=d*f+_,t[5]=o*h,t[9]=u*f-g,t[2]=g*f-u,t[6]=a*h,t[10]=_*f+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(rf,e,of)}lookAt(e,t,n){const s=this.elements;return Qt.subVectors(e,t),Qt.lengthSq()===0&&(Qt.z=1),Qt.normalize(),hi.crossVectors(n,Qt),hi.lengthSq()===0&&(Math.abs(n.z)===1?Qt.x+=1e-4:Qt.z+=1e-4,Qt.normalize(),hi.crossVectors(n,Qt)),hi.normalize(),Sr.crossVectors(Qt,hi),s[0]=hi.x,s[4]=Sr.x,s[8]=Qt.x,s[1]=hi.y,s[5]=Sr.y,s[9]=Qt.y,s[2]=hi.z,s[6]=Sr.z,s[10]=Qt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],f=n[5],d=n[9],u=n[13],g=n[2],_=n[6],m=n[10],p=n[14],E=n[3],b=n[7],M=n[11],R=n[15],w=s[0],L=s[4],I=s[8],v=s[12],y=s[1],C=s[5],T=s[9],F=s[13],D=s[2],B=s[6],N=s[10],q=s[14],V=s[3],Z=s[7],ee=s[11],ce=s[15];return r[0]=o*w+a*y+l*D+c*V,r[4]=o*L+a*C+l*B+c*Z,r[8]=o*I+a*T+l*N+c*ee,r[12]=o*v+a*F+l*q+c*ce,r[1]=h*w+f*y+d*D+u*V,r[5]=h*L+f*C+d*B+u*Z,r[9]=h*I+f*T+d*N+u*ee,r[13]=h*v+f*F+d*q+u*ce,r[2]=g*w+_*y+m*D+p*V,r[6]=g*L+_*C+m*B+p*Z,r[10]=g*I+_*T+m*N+p*ee,r[14]=g*v+_*F+m*q+p*ce,r[3]=E*w+b*y+M*D+R*V,r[7]=E*L+b*C+M*B+R*Z,r[11]=E*I+b*T+M*N+R*ee,r[15]=E*v+b*F+M*q+R*ce,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],h=e[2],f=e[6],d=e[10],u=e[14],g=e[3],_=e[7],m=e[11],p=e[15];return g*(+r*l*f-s*c*f-r*a*d+n*c*d+s*a*u-n*l*u)+_*(+t*l*u-t*c*d+r*o*d-s*o*u+s*c*h-r*l*h)+m*(+t*c*f-t*a*u-r*o*f+n*o*u+r*a*h-n*c*h)+p*(-s*a*h-t*l*f+t*a*d+s*o*f-n*o*d+n*l*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],f=e[9],d=e[10],u=e[11],g=e[12],_=e[13],m=e[14],p=e[15],E=f*m*c-_*d*c+_*l*u-a*m*u-f*l*p+a*d*p,b=g*d*c-h*m*c-g*l*u+o*m*u+h*l*p-o*d*p,M=h*_*c-g*f*c+g*a*u-o*_*u-h*a*p+o*f*p,R=g*f*l-h*_*l-g*a*d+o*_*d+h*a*m-o*f*m,w=t*E+n*b+s*M+r*R;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const L=1/w;return e[0]=E*L,e[1]=(_*d*r-f*m*r-_*s*u+n*m*u+f*s*p-n*d*p)*L,e[2]=(a*m*r-_*l*r+_*s*c-n*m*c-a*s*p+n*l*p)*L,e[3]=(f*l*r-a*d*r-f*s*c+n*d*c+a*s*u-n*l*u)*L,e[4]=b*L,e[5]=(h*m*r-g*d*r+g*s*u-t*m*u-h*s*p+t*d*p)*L,e[6]=(g*l*r-o*m*r-g*s*c+t*m*c+o*s*p-t*l*p)*L,e[7]=(o*d*r-h*l*r+h*s*c-t*d*c-o*s*u+t*l*u)*L,e[8]=M*L,e[9]=(g*f*r-h*_*r-g*n*u+t*_*u+h*n*p-t*f*p)*L,e[10]=(o*_*r-g*a*r+g*n*c-t*_*c-o*n*p+t*a*p)*L,e[11]=(h*a*r-o*f*r-h*n*c+t*f*c+o*n*u-t*a*u)*L,e[12]=R*L,e[13]=(h*_*s-g*f*s+g*n*d-t*_*d-h*n*m+t*f*m)*L,e[14]=(g*a*s-o*_*s-g*n*l+t*_*l+o*n*m-t*a*m)*L,e[15]=(o*f*s-h*a*s+h*n*l-t*f*l-o*n*d+t*a*d)*L,this}scale(e){const t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),s=Math.sin(t),r=1-n,o=e.x,a=e.y,l=e.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,o){return this.set(1,n,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){const s=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,h=o+o,f=a+a,d=r*c,u=r*h,g=r*f,_=o*h,m=o*f,p=a*f,E=l*c,b=l*h,M=l*f,R=n.x,w=n.y,L=n.z;return s[0]=(1-(_+p))*R,s[1]=(u+M)*R,s[2]=(g-b)*R,s[3]=0,s[4]=(u-M)*w,s[5]=(1-(d+p))*w,s[6]=(m+E)*w,s[7]=0,s[8]=(g+b)*L,s[9]=(m-E)*L,s[10]=(1-(d+_))*L,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){const s=this.elements;let r=ji.set(s[0],s[1],s[2]).length();const o=ji.set(s[4],s[5],s[6]).length(),a=ji.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],xn.copy(this);const c=1/r,h=1/o,f=1/a;return xn.elements[0]*=c,xn.elements[1]*=c,xn.elements[2]*=c,xn.elements[4]*=h,xn.elements[5]*=h,xn.elements[6]*=h,xn.elements[8]*=f,xn.elements[9]*=f,xn.elements[10]*=f,t.setFromRotationMatrix(xn),n.x=r,n.y=o,n.z=a,this}makePerspective(e,t,n,s,r,o,a=kn,l=!1){const c=this.elements,h=2*r/(t-e),f=2*r/(n-s),d=(t+e)/(t-e),u=(n+s)/(n-s);let g,_;if(l)g=r/(o-r),_=o*r/(o-r);else if(a===kn)g=-(o+r)/(o-r),_=-2*o*r/(o-r);else if(a===uo)g=-o/(o-r),_=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=f,c[9]=u,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,o,a=kn,l=!1){const c=this.elements,h=2/(t-e),f=2/(n-s),d=-(t+e)/(t-e),u=-(n+s)/(n-s);let g,_;if(l)g=1/(o-r),_=o/(o-r);else if(a===kn)g=-2/(o-r),_=-(o+r)/(o-r);else if(a===uo)g=-1/(o-r),_=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=f,c[9]=0,c[13]=u,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const ji=new U,xn=new at,rf=new U(0,0,0),of=new U(1,1,1),hi=new U,Sr=new U,Qt=new U,mc=new at,gc=new hr;class Vn{constructor(e=0,t=0,n=0,s=Vn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const s=e.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],f=s[2],d=s[6],u=s[10];switch(t){case"XYZ":this._y=Math.asin(je(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,u),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-je(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,u),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(je(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-f,u),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-je(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(d,u),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(je(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(a,u));break;case"XZY":this._z=Math.asin(-je(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,u),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return mc.makeRotationFromQuaternion(e),this.setFromRotationMatrix(mc,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return gc.setFromEuler(this),this.setFromQuaternion(gc,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Vn.DEFAULT_ORDER="XYZ";class Nl{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let af=0;const _c=new U,Ki=new hr,qn=new at,Er=new U,Ds=new U,lf=new U,cf=new hr,vc=new U(1,0,0),yc=new U(0,1,0),xc=new U(0,0,1),Mc={type:"added"},hf={type:"removed"},Zi={type:"childadded",child:null},Wo={type:"childremoved",child:null};class Rt extends ws{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:af++}),this.uuid=ni(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Rt.DEFAULT_UP.clone();const e=new U,t=new Vn,n=new hr,s=new U(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new at},normalMatrix:{value:new Ge}}),this.matrix=new at,this.matrixWorld=new at,this.matrixAutoUpdate=Rt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Rt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Nl,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ki.setFromAxisAngle(e,t),this.quaternion.multiply(Ki),this}rotateOnWorldAxis(e,t){return Ki.setFromAxisAngle(e,t),this.quaternion.premultiply(Ki),this}rotateX(e){return this.rotateOnAxis(vc,e)}rotateY(e){return this.rotateOnAxis(yc,e)}rotateZ(e){return this.rotateOnAxis(xc,e)}translateOnAxis(e,t){return _c.copy(e).applyQuaternion(this.quaternion),this.position.add(_c.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(vc,e)}translateY(e){return this.translateOnAxis(yc,e)}translateZ(e){return this.translateOnAxis(xc,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(qn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Er.copy(e):Er.set(e,t,n);const s=this.parent;this.updateWorldMatrix(!0,!1),Ds.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?qn.lookAt(Ds,Er,this.up):qn.lookAt(Er,Ds,this.up),this.quaternion.setFromRotationMatrix(qn),s&&(qn.extractRotation(s.matrixWorld),Ki.setFromRotationMatrix(qn),this.quaternion.premultiply(Ki.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Mc),Zi.child=e,this.dispatchEvent(Zi),Zi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(hf),Wo.child=e,this.dispatchEvent(Wo),Wo.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),qn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),qn.multiply(e.parent.matrixWorld)),e.applyMatrix4(qn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Mc),Zi.child=e,this.dispatchEvent(Zi),Zi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ds,e,lf),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ds,cf,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const f=l[c];r(e.shapes,f)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];s.animations.push(r(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),h=o(e.images),f=o(e.shapes),d=o(e.skeletons),u=o(e.animations),g=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),f.length>0&&(n.shapes=f),d.length>0&&(n.skeletons=d),u.length>0&&(n.animations=u),g.length>0&&(n.nodes=g)}return n.object=s,n;function o(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const s=e.children[n];this.add(s.clone())}return this}}Rt.DEFAULT_UP=new U(0,1,0);Rt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Rt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Mn=new U,$n=new U,Xo=new U,Yn=new U,Ji=new U,Qi=new U,Sc=new U,qo=new U,$o=new U,Yo=new U,jo=new ot,Ko=new ot,Zo=new ot;class _n{constructor(e=new U,t=new U,n=new U){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),Mn.subVectors(e,t),s.cross(Mn);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){Mn.subVectors(s,t),$n.subVectors(n,t),Xo.subVectors(e,t);const o=Mn.dot(Mn),a=Mn.dot($n),l=Mn.dot(Xo),c=$n.dot($n),h=$n.dot(Xo),f=o*c-a*a;if(f===0)return r.set(0,0,0),null;const d=1/f,u=(c*l-a*h)*d,g=(o*h-a*l)*d;return r.set(1-u-g,g,u)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,Yn)===null?!1:Yn.x>=0&&Yn.y>=0&&Yn.x+Yn.y<=1}static getInterpolation(e,t,n,s,r,o,a,l){return this.getBarycoord(e,t,n,s,Yn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Yn.x),l.addScaledVector(o,Yn.y),l.addScaledVector(a,Yn.z),l)}static getInterpolatedAttribute(e,t,n,s,r,o){return jo.setScalar(0),Ko.setScalar(0),Zo.setScalar(0),jo.fromBufferAttribute(e,t),Ko.fromBufferAttribute(e,n),Zo.fromBufferAttribute(e,s),o.setScalar(0),o.addScaledVector(jo,r.x),o.addScaledVector(Ko,r.y),o.addScaledVector(Zo,r.z),o}static isFrontFacing(e,t,n,s){return Mn.subVectors(n,t),$n.subVectors(e,t),Mn.cross($n).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Mn.subVectors(this.c,this.b),$n.subVectors(this.a,this.b),Mn.cross($n).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return _n.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return _n.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return _n.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return _n.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return _n.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,s=this.b,r=this.c;let o,a;Ji.subVectors(s,n),Qi.subVectors(r,n),qo.subVectors(e,n);const l=Ji.dot(qo),c=Qi.dot(qo);if(l<=0&&c<=0)return t.copy(n);$o.subVectors(e,s);const h=Ji.dot($o),f=Qi.dot($o);if(h>=0&&f<=h)return t.copy(s);const d=l*f-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),t.copy(n).addScaledVector(Ji,o);Yo.subVectors(e,r);const u=Ji.dot(Yo),g=Qi.dot(Yo);if(g>=0&&u<=g)return t.copy(r);const _=u*c-l*g;if(_<=0&&c>=0&&g<=0)return a=c/(c-g),t.copy(n).addScaledVector(Qi,a);const m=h*g-u*f;if(m<=0&&f-h>=0&&u-g>=0)return Sc.subVectors(r,s),a=(f-h)/(f-h+(u-g)),t.copy(s).addScaledVector(Sc,a);const p=1/(m+_+d);return o=_*p,a=d*p,t.copy(n).addScaledVector(Ji,o).addScaledVector(Qi,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Jh={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},di={h:0,s:0,l:0},br={h:0,s:0,l:0};function Jo(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class Oe{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=fn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ze.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=Ze.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ze.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=Ze.workingColorSpace){if(e=Il(e,1),t=je(t,0,1),n=je(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=Jo(o,r,e+1/3),this.g=Jo(o,r,e),this.b=Jo(o,r,e-1/3)}return Ze.colorSpaceToWorking(this,s),this}setStyle(e,t=fn){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=fn){const n=Jh[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ii(e.r),this.g=ii(e.g),this.b=ii(e.b),this}copyLinearToSRGB(e){return this.r=_s(e.r),this.g=_s(e.g),this.b=_s(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=fn){return Ze.workingToColorSpace(Bt.copy(this),e),Math.round(je(Bt.r*255,0,255))*65536+Math.round(je(Bt.g*255,0,255))*256+Math.round(je(Bt.b*255,0,255))}getHexString(e=fn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ze.workingColorSpace){Ze.workingToColorSpace(Bt.copy(this),t);const n=Bt.r,s=Bt.g,r=Bt.b,o=Math.max(n,s,r),a=Math.min(n,s,r);let l,c;const h=(a+o)/2;if(a===o)l=0,c=0;else{const f=o-a;switch(c=h<=.5?f/(o+a):f/(2-o-a),o){case n:l=(s-r)/f+(s<r?6:0);break;case s:l=(r-n)/f+2;break;case r:l=(n-s)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=Ze.workingColorSpace){return Ze.workingToColorSpace(Bt.copy(this),t),e.r=Bt.r,e.g=Bt.g,e.b=Bt.b,e}getStyle(e=fn){Ze.workingToColorSpace(Bt.copy(this),e);const t=Bt.r,n=Bt.g,s=Bt.b;return e!==fn?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(di),this.setHSL(di.h+e,di.s+t,di.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(di),e.getHSL(br);const n=$s(di.h,br.h,t),s=$s(di.s,br.s,t),r=$s(di.l,br.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Bt=new Oe;Oe.NAMES=Jh;let df=0;class zi extends ws{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:df++}),this.uuid=ni(),this.name="",this.type="Material",this.blending=gs,this.side=_i,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Aa,this.blendDst=Ca,this.blendEquation=Pi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Oe(0,0,0),this.blendAlpha=0,this.depthFunc=xs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=lc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Wi,this.stencilZFail=Wi,this.stencilZPass=Wi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==gs&&(n.blending=this.blending),this.side!==_i&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Aa&&(n.blendSrc=this.blendSrc),this.blendDst!==Ca&&(n.blendDst=this.blendDst),this.blendEquation!==Pi&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==xs&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==lc&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Wi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Wi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Wi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(t){const r=s(e.textures),o=s(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Cs extends zi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Oe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Vn,this.combine=Bh,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const bt=new U,Tr=new Ae;let uf=0;class an{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:uf++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=pl,this.updateRanges=[],this.gpuType=Bn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Tr.fromBufferAttribute(this,t),Tr.applyMatrix3(e),this.setXY(t,Tr.x,Tr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)bt.fromBufferAttribute(this,t),bt.applyMatrix3(e),this.setXYZ(t,bt.x,bt.y,bt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)bt.fromBufferAttribute(this,t),bt.applyMatrix4(e),this.setXYZ(t,bt.x,bt.y,bt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)bt.fromBufferAttribute(this,t),bt.applyNormalMatrix(e),this.setXYZ(t,bt.x,bt.y,bt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)bt.fromBufferAttribute(this,t),bt.transformDirection(e),this.setXYZ(t,bt.x,bt.y,bt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=En(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=nt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=En(t,this.array)),t}setX(e,t){return this.normalized&&(t=nt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=En(t,this.array)),t}setY(e,t){return this.normalized&&(t=nt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=En(t,this.array)),t}setZ(e,t){return this.normalized&&(t=nt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=En(t,this.array)),t}setW(e,t){return this.normalized&&(t=nt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array),s=nt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array),s=nt(s,this.array),r=nt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==pl&&(e.usage=this.usage),e}}class Qh extends an{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class ed extends an{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class ct extends an{constructor(e,t,n){super(new Float32Array(e),t,n)}}let ff=0;const dn=new at,Qo=new Rt,es=new U,en=new Hi,Us=new Hi,Dt=new U;class Ot extends ws{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:ff++}),this.uuid=ni(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Kh(e)?ed:Qh)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new Ge().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return dn.makeRotationFromQuaternion(e),this.applyMatrix4(dn),this}rotateX(e){return dn.makeRotationX(e),this.applyMatrix4(dn),this}rotateY(e){return dn.makeRotationY(e),this.applyMatrix4(dn),this}rotateZ(e){return dn.makeRotationZ(e),this.applyMatrix4(dn),this}translate(e,t,n){return dn.makeTranslation(e,t,n),this.applyMatrix4(dn),this}scale(e,t,n){return dn.makeScale(e,t,n),this.applyMatrix4(dn),this}lookAt(e){return Qo.lookAt(e),Qo.updateMatrix(),this.applyMatrix4(Qo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(es).negate(),this.translate(es.x,es.y,es.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let s=0,r=e.length;s<r;s++){const o=e[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ct(n,3))}else{const n=Math.min(e.length,t.count);for(let s=0;s<n;s++){const r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Hi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new U(-1/0,-1/0,-1/0),new U(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){const r=t[n];en.setFromBufferAttribute(r),this.morphTargetsRelative?(Dt.addVectors(this.boundingBox.min,en.min),this.boundingBox.expandByPoint(Dt),Dt.addVectors(this.boundingBox.max,en.max),this.boundingBox.expandByPoint(Dt)):(this.boundingBox.expandByPoint(en.min),this.boundingBox.expandByPoint(en.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new As);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new U,1/0);return}if(e){const n=this.boundingSphere.center;if(en.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){const a=t[r];Us.setFromBufferAttribute(a),this.morphTargetsRelative?(Dt.addVectors(en.min,Us.min),en.expandByPoint(Dt),Dt.addVectors(en.max,Us.max),en.expandByPoint(Dt)):(en.expandByPoint(Us.min),en.expandByPoint(Us.max))}en.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)Dt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Dt));if(t)for(let r=0,o=t.length;r<o;r++){const a=t[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Dt.fromBufferAttribute(a,c),l&&(es.fromBufferAttribute(e,c),Dt.add(es)),s=Math.max(s,n.distanceToSquared(Dt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new an(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let I=0;I<n.count;I++)a[I]=new U,l[I]=new U;const c=new U,h=new U,f=new U,d=new Ae,u=new Ae,g=new Ae,_=new U,m=new U;function p(I,v,y){c.fromBufferAttribute(n,I),h.fromBufferAttribute(n,v),f.fromBufferAttribute(n,y),d.fromBufferAttribute(r,I),u.fromBufferAttribute(r,v),g.fromBufferAttribute(r,y),h.sub(c),f.sub(c),u.sub(d),g.sub(d);const C=1/(u.x*g.y-g.x*u.y);isFinite(C)&&(_.copy(h).multiplyScalar(g.y).addScaledVector(f,-u.y).multiplyScalar(C),m.copy(f).multiplyScalar(u.x).addScaledVector(h,-g.x).multiplyScalar(C),a[I].add(_),a[v].add(_),a[y].add(_),l[I].add(m),l[v].add(m),l[y].add(m))}let E=this.groups;E.length===0&&(E=[{start:0,count:e.count}]);for(let I=0,v=E.length;I<v;++I){const y=E[I],C=y.start,T=y.count;for(let F=C,D=C+T;F<D;F+=3)p(e.getX(F+0),e.getX(F+1),e.getX(F+2))}const b=new U,M=new U,R=new U,w=new U;function L(I){R.fromBufferAttribute(s,I),w.copy(R);const v=a[I];b.copy(v),b.sub(R.multiplyScalar(R.dot(v))).normalize(),M.crossVectors(w,v);const C=M.dot(l[I])<0?-1:1;o.setXYZW(I,b.x,b.y,b.z,C)}for(let I=0,v=E.length;I<v;++I){const y=E[I],C=y.start,T=y.count;for(let F=C,D=C+T;F<D;F+=3)L(e.getX(F+0)),L(e.getX(F+1)),L(e.getX(F+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new an(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,u=n.count;d<u;d++)n.setXYZ(d,0,0,0);const s=new U,r=new U,o=new U,a=new U,l=new U,c=new U,h=new U,f=new U;if(e)for(let d=0,u=e.count;d<u;d+=3){const g=e.getX(d+0),_=e.getX(d+1),m=e.getX(d+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,_),o.fromBufferAttribute(t,m),h.subVectors(o,r),f.subVectors(s,r),h.cross(f),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,m),a.add(h),l.add(h),c.add(h),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,u=t.count;d<u;d+=3)s.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),h.subVectors(o,r),f.subVectors(s,r),h.cross(f),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Dt.fromBufferAttribute(e,t),Dt.normalize(),e.setXYZ(t,Dt.x,Dt.y,Dt.z)}toNonIndexed(){function e(a,l){const c=a.array,h=a.itemSize,f=a.normalized,d=new c.constructor(l.length*h);let u=0,g=0;for(let _=0,m=l.length;_<m;_++){a.isInterleavedBufferAttribute?u=l[_]*a.data.stride+a.offset:u=l[_]*h;for(let p=0;p<h;p++)d[g++]=c[u++]}return new an(d,h,f)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Ot,n=this.index.array,s=this.attributes;for(const a in s){const l=s[a],c=e(l,n);t.setAttribute(a,c)}const r=this.morphAttributes;for(const a in r){const l=[],c=r[a];for(let h=0,f=c.length;h<f;h++){const d=c[h],u=e(d,n);l.push(u)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let f=0,d=c.length;f<d;f++){const u=c[f];h.push(u.toJSON(e.data))}h.length>0&&(s[l]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const s=e.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(t))}const r=e.morphAttributes;for(const c in r){const h=[],f=r[c];for(let d=0,u=f.length;d<u;d++)h.push(f[d].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,h=o.length;c<h;c++){const f=o[c];this.addGroup(f.start,f.count,f.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Ec=new at,Ei=new Ul,wr=new As,bc=new U,Ar=new U,Cr=new U,Rr=new U,ea=new U,Pr=new U,Tc=new U,Lr=new U;class re extends Rt{constructor(e=new Ot,t=new Cs){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(s,e);const a=this.morphTargetInfluences;if(r&&a){Pr.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=a[l],f=r[l];h!==0&&(ea.fromBufferAttribute(f,e),o?Pr.addScaledVector(ea,h):Pr.addScaledVector(ea.sub(t),h))}t.add(Pr)}return t}raycast(e,t){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),wr.copy(n.boundingSphere),wr.applyMatrix4(r),Ei.copy(e.ray).recast(e.near),!(wr.containsPoint(Ei.origin)===!1&&(Ei.intersectSphere(wr,bc)===null||Ei.origin.distanceToSquared(bc)>(e.far-e.near)**2))&&(Ec.copy(r).invert(),Ei.copy(e.ray).applyMatrix4(Ec),!(n.boundingBox!==null&&Ei.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Ei)))}_computeIntersections(e,t,n){let s;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,f=r.attributes.normal,d=r.groups,u=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,_=d.length;g<_;g++){const m=d[g],p=o[m.materialIndex],E=Math.max(m.start,u.start),b=Math.min(a.count,Math.min(m.start+m.count,u.start+u.count));for(let M=E,R=b;M<R;M+=3){const w=a.getX(M),L=a.getX(M+1),I=a.getX(M+2);s=Ir(this,p,e,n,c,h,f,w,L,I),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const g=Math.max(0,u.start),_=Math.min(a.count,u.start+u.count);for(let m=g,p=_;m<p;m+=3){const E=a.getX(m),b=a.getX(m+1),M=a.getX(m+2);s=Ir(this,o,e,n,c,h,f,E,b,M),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,_=d.length;g<_;g++){const m=d[g],p=o[m.materialIndex],E=Math.max(m.start,u.start),b=Math.min(l.count,Math.min(m.start+m.count,u.start+u.count));for(let M=E,R=b;M<R;M+=3){const w=M,L=M+1,I=M+2;s=Ir(this,p,e,n,c,h,f,w,L,I),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const g=Math.max(0,u.start),_=Math.min(l.count,u.start+u.count);for(let m=g,p=_;m<p;m+=3){const E=m,b=m+1,M=m+2;s=Ir(this,o,e,n,c,h,f,E,b,M),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}}function pf(i,e,t,n,s,r,o,a){let l;if(e.side===jt?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,e.side===_i,a),l===null)return null;Lr.copy(a),Lr.applyMatrix4(i.matrixWorld);const c=t.ray.origin.distanceTo(Lr);return c<t.near||c>t.far?null:{distance:c,point:Lr.clone(),object:i}}function Ir(i,e,t,n,s,r,o,a,l,c){i.getVertexPosition(a,Ar),i.getVertexPosition(l,Cr),i.getVertexPosition(c,Rr);const h=pf(i,e,t,n,Ar,Cr,Rr,Tc);if(h){const f=new U;_n.getBarycoord(Tc,Ar,Cr,Rr,f),s&&(h.uv=_n.getInterpolatedAttribute(s,a,l,c,f,new Ae)),r&&(h.uv1=_n.getInterpolatedAttribute(r,a,l,c,f,new Ae)),o&&(h.normal=_n.getInterpolatedAttribute(o,a,l,c,f,new U),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new U,materialIndex:0};_n.getNormal(Ar,Cr,Rr,d.normal),h.face=d,h.barycoord=f}return h}class Kt extends Ot{constructor(e=1,t=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const l=[],c=[],h=[],f=[];let d=0,u=0;g("z","y","x",-1,-1,n,t,e,o,r,0),g("z","y","x",1,-1,n,t,-e,o,r,1),g("x","z","y",1,1,e,n,t,s,o,2),g("x","z","y",1,-1,e,n,-t,s,o,3),g("x","y","z",1,-1,e,t,n,s,r,4),g("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new ct(c,3)),this.setAttribute("normal",new ct(h,3)),this.setAttribute("uv",new ct(f,2));function g(_,m,p,E,b,M,R,w,L,I,v){const y=M/L,C=R/I,T=M/2,F=R/2,D=w/2,B=L+1,N=I+1;let q=0,V=0;const Z=new U;for(let ee=0;ee<N;ee++){const ce=ee*C-F;for(let Ee=0;Ee<B;Ee++){const He=Ee*y-T;Z[_]=He*E,Z[m]=ce*b,Z[p]=D,c.push(Z.x,Z.y,Z.z),Z[_]=0,Z[m]=0,Z[p]=w>0?1:-1,h.push(Z.x,Z.y,Z.z),f.push(Ee/L),f.push(1-ee/I),q+=1}}for(let ee=0;ee<I;ee++)for(let ce=0;ce<L;ce++){const Ee=d+ce+B*ee,He=d+ce+B*(ee+1),Qe=d+(ce+1)+B*(ee+1),Q=d+(ce+1)+B*ee;l.push(Ee,He,Q),l.push(He,Qe,Q),V+=6}a.addGroup(u,V,v),u+=V,d+=q}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Kt(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function bs(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const s=i[t][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone():Array.isArray(s)?e[t][n]=s.slice():e[t][n]=s}}return e}function Gt(i){const e={};for(let t=0;t<i.length;t++){const n=bs(i[t]);for(const s in n)e[s]=n[s]}return e}function mf(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function td(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Ze.workingColorSpace}const po={clone:bs,merge:Gt};var gf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,_f=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Yt extends zi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=gf,this.fragmentShader=_f,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=bs(e.uniforms),this.uniformsGroups=mf(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class nd extends Rt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new at,this.projectionMatrix=new at,this.projectionMatrixInverse=new at,this.coordinateSystem=kn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const ui=new U,wc=new Ae,Ac=new Ae;class sn extends nd{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=tr*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(qs*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return tr*2*Math.atan(Math.tan(qs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){ui.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ui.x,ui.y).multiplyScalar(-e/ui.z),ui.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ui.x,ui.y).multiplyScalar(-e/ui.z)}getViewSize(e,t){return this.getViewBounds(e,wc,Ac),t.subVectors(Ac,wc)}setViewOffset(e,t,n,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(qs*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,t-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const ts=-90,ns=1;class vf extends Rt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new sn(ts,ns,e,t);s.layers=this.layers,this.add(s);const r=new sn(ts,ns,e,t);r.layers=this.layers,this.add(r);const o=new sn(ts,ns,e,t);o.layers=this.layers,this.add(o);const a=new sn(ts,ns,e,t);a.layers=this.layers,this.add(a);const l=new sn(ts,ns,e,t);l.layers=this.layers,this.add(l);const c=new sn(ts,ns,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,s,r,o,a,l]=t;for(const c of t)this.remove(c);if(e===kn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===uo)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,c,h]=this.children,f=e.getRenderTarget(),d=e.getActiveCubeFace(),u=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,s),e.render(t,r),e.setRenderTarget(n,1,s),e.render(t,o),e.setRenderTarget(n,2,s),e.render(t,a),e.setRenderTarget(n,3,s),e.render(t,l),e.setRenderTarget(n,4,s),e.render(t,c),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,s),e.render(t,h),e.setRenderTarget(f,d,u),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class id extends kt{constructor(e=[],t=Ms,n,s,r,o,a,l,c,h){super(e,t,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class yf extends An{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new id(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Kt(5,5,5),r=new Yt({name:"CubemapFromEquirect",uniforms:bs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:jt,blending:ei});r.uniforms.tEquirect.value=t;const o=new re(s,r),a=t.minFilter;return t.minFilter===Ni&&(t.minFilter=bn),new vf(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){const r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,s);e.setRenderTarget(r)}}class mt extends Rt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const xf={type:"move"};class ta{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new mt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new mt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new U,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new U),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new mt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new U,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new U),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const _ of e.hand.values()){const m=t.getJointPose(_,n),p=this._getHandJoint(c,_);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],d=h.position.distanceTo(f.position),u=.02,g=.005;c.inputState.pinching&&d>u+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=u-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(xf)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new mt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class Ol{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new Oe(e),this.density=t}clone(){return new Ol(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class Mf extends Rt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Vn,this.environmentIntensity=1,this.environmentRotation=new Vn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Sf{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=pl,this.updateRanges=[],this.version=0,this.uuid=ni()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ni()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ni()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Vt=new U;class mo{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Vt.fromBufferAttribute(this,t),Vt.applyMatrix4(e),this.setXYZ(t,Vt.x,Vt.y,Vt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Vt.fromBufferAttribute(this,t),Vt.applyNormalMatrix(e),this.setXYZ(t,Vt.x,Vt.y,Vt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Vt.fromBufferAttribute(this,t),Vt.transformDirection(e),this.setXYZ(t,Vt.x,Vt.y,Vt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=En(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=nt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=nt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=nt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=nt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=nt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=En(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=En(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=En(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=En(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array),s=nt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array),s=nt(s,this.array),r=nt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new an(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new mo(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}class sd extends zi{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Oe(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let is;const Ns=new U,ss=new U,rs=new U,os=new Ae,Os=new Ae,rd=new at,Dr=new U,Fs=new U,Ur=new U,Cc=new Ae,na=new Ae,Rc=new Ae;class Ef extends Rt{constructor(e=new sd){if(super(),this.isSprite=!0,this.type="Sprite",is===void 0){is=new Ot;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Sf(t,5);is.setIndex([0,1,2,0,2,3]),is.setAttribute("position",new mo(n,3,0,!1)),is.setAttribute("uv",new mo(n,2,3,!1))}this.geometry=is,this.material=e,this.center=new Ae(.5,.5),this.count=1}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),ss.setFromMatrixScale(this.matrixWorld),rd.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),rs.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&ss.multiplyScalar(-rs.z);const n=this.material.rotation;let s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));const o=this.center;Nr(Dr.set(-.5,-.5,0),rs,o,ss,s,r),Nr(Fs.set(.5,-.5,0),rs,o,ss,s,r),Nr(Ur.set(.5,.5,0),rs,o,ss,s,r),Cc.set(0,0),na.set(1,0),Rc.set(1,1);let a=e.ray.intersectTriangle(Dr,Fs,Ur,!1,Ns);if(a===null&&(Nr(Fs.set(-.5,.5,0),rs,o,ss,s,r),na.set(0,1),a=e.ray.intersectTriangle(Dr,Ur,Fs,!1,Ns),a===null))return;const l=e.ray.origin.distanceTo(Ns);l<e.near||l>e.far||t.push({distance:l,point:Ns.clone(),uv:_n.getInterpolation(Ns,Dr,Fs,Ur,Cc,na,Rc,new Ae),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function Nr(i,e,t,n,s,r){os.subVectors(i,t).addScalar(.5).multiply(n),s!==void 0?(Os.x=r*os.x-s*os.y,Os.y=s*os.x+r*os.y):Os.copy(os),i.copy(e),i.x+=Os.x,i.y+=Os.y,i.applyMatrix4(rd)}class bf extends kt{constructor(e=null,t=1,n=1,s,r,o,a,l,c=on,h=on,f,d){super(null,o,a,l,c,h,s,r,f,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Pc extends an{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const as=new at,Lc=new at,Or=[],Ic=new Hi,Tf=new at,Bs=new re,ks=new As;class Eo extends re{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Pc(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,Tf)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Hi),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,as),Ic.copy(e.boundingBox).applyMatrix4(as),this.boundingBox.union(Ic)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new As),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,as),ks.copy(e.boundingSphere).applyMatrix4(as),this.boundingSphere.union(ks)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,o=e*r+1;for(let a=0;a<n.length;a++)n[a]=s[o+a]}raycast(e,t){const n=this.matrixWorld,s=this.count;if(Bs.geometry=this.geometry,Bs.material=this.material,Bs.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ks.copy(this.boundingSphere),ks.applyMatrix4(n),e.ray.intersectsSphere(ks)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,as),Lc.multiplyMatrices(n,as),Bs.matrixWorld=Lc,Bs.raycast(e,Or);for(let o=0,a=Or.length;o<a;o++){const l=Or[o];l.instanceId=r,l.object=this,t.push(l)}Or.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Pc(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new bf(new Float32Array(s*this.count),s,this.count,Cl,Bn));const r=this.morphTexture.source.data.data;let o=0;for(let c=0;c<n.length;c++)o+=n[c];const a=this.geometry.morphTargetsRelative?1:1-o,l=s*e;r[l]=a,r.set(n,l+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const ia=new U,wf=new U,Af=new Ge;class fi{constructor(e=new U(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const s=ia.subVectors(n,t).cross(wf.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(ia),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Af.getNormalMatrix(e),s=this.coplanarPoint(ia).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const bi=new As,Cf=new Ae(.5,.5),Fr=new U;class Fl{constructor(e=new fi,t=new fi,n=new fi,s=new fi,r=new fi,o=new fi){this.planes=[e,t,n,s,r,o]}set(e,t,n,s,r,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=kn,n=!1){const s=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],f=r[5],d=r[6],u=r[7],g=r[8],_=r[9],m=r[10],p=r[11],E=r[12],b=r[13],M=r[14],R=r[15];if(s[0].setComponents(c-o,u-h,p-g,R-E).normalize(),s[1].setComponents(c+o,u+h,p+g,R+E).normalize(),s[2].setComponents(c+a,u+f,p+_,R+b).normalize(),s[3].setComponents(c-a,u-f,p-_,R-b).normalize(),n)s[4].setComponents(l,d,m,M).normalize(),s[5].setComponents(c-l,u-d,p-m,R-M).normalize();else if(s[4].setComponents(c-l,u-d,p-m,R-M).normalize(),t===kn)s[5].setComponents(c+l,u+d,p+m,R+M).normalize();else if(t===uo)s[5].setComponents(l,d,m,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),bi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),bi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(bi)}intersectsSprite(e){bi.center.set(0,0,0);const t=Cf.distanceTo(e.center);return bi.radius=.7071067811865476+t,bi.applyMatrix4(e.matrixWorld),this.intersectsSphere(bi)}intersectsSphere(e){const t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const s=t[n];if(Fr.x=s.normal.x>0?e.max.x:e.min.x,Fr.y=s.normal.y>0?e.max.y:e.min.y,Fr.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Fr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class od extends zi{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Oe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Dc=new at,ml=new Ul,Br=new As,kr=new U;class Rf extends Rt{constructor(e=new Ot,t=new od){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Br.copy(n.boundingSphere),Br.applyMatrix4(s),Br.radius+=r,e.ray.intersectsSphere(Br)===!1)return;Dc.copy(s).invert(),ml.copy(e.ray).applyMatrix4(Dc);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,f=n.attributes.position;if(c!==null){const d=Math.max(0,o.start),u=Math.min(c.count,o.start+o.count);for(let g=d,_=u;g<_;g++){const m=c.getX(g);kr.fromBufferAttribute(f,m),Uc(kr,m,l,s,e,t,this)}}else{const d=Math.max(0,o.start),u=Math.min(f.count,o.start+o.count);for(let g=d,_=u;g<_;g++)kr.fromBufferAttribute(f,g),Uc(kr,g,l,s,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Uc(i,e,t,n,s,r,o){const a=ml.distanceSqToPoint(i);if(a<t){const l=new U;ml.closestPointToPoint(i,l),l.applyMatrix4(n);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class Pf extends kt{constructor(e,t,n,s,r,o,a,l,c){super(e,t,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class ad extends kt{constructor(e,t,n=Bi,s,r,o,a=on,l=on,c,h=Qs,f=1){if(h!==Qs&&h!==er)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:f};super(d,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Dl(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class ld extends kt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Bl extends Ot{constructor(e=1,t=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:s},t=Math.max(3,t);const r=[],o=[],a=[],l=[],c=new U,h=new Ae;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let f=0,d=3;f<=t;f++,d+=3){const u=n+f/t*s;c.x=e*Math.cos(u),c.y=e*Math.sin(u),o.push(c.x,c.y,c.z),a.push(0,0,1),h.x=(o[d]/e+1)/2,h.y=(o[d+1]/e+1)/2,l.push(h.x,h.y)}for(let f=1;f<=t;f++)r.push(f,f+1,0);this.setIndex(r),this.setAttribute("position",new ct(o,3)),this.setAttribute("normal",new ct(a,3)),this.setAttribute("uv",new ct(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Bl(e.radius,e.segments,e.thetaStart,e.thetaLength)}}class oi extends Ot{constructor(e=1,t=1,n=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};const c=this;s=Math.floor(s),r=Math.floor(r);const h=[],f=[],d=[],u=[];let g=0;const _=[],m=n/2;let p=0;E(),o===!1&&(e>0&&b(!0),t>0&&b(!1)),this.setIndex(h),this.setAttribute("position",new ct(f,3)),this.setAttribute("normal",new ct(d,3)),this.setAttribute("uv",new ct(u,2));function E(){const M=new U,R=new U;let w=0;const L=(t-e)/n;for(let I=0;I<=r;I++){const v=[],y=I/r,C=y*(t-e)+e;for(let T=0;T<=s;T++){const F=T/s,D=F*l+a,B=Math.sin(D),N=Math.cos(D);R.x=C*B,R.y=-y*n+m,R.z=C*N,f.push(R.x,R.y,R.z),M.set(B,L,N).normalize(),d.push(M.x,M.y,M.z),u.push(F,1-y),v.push(g++)}_.push(v)}for(let I=0;I<s;I++)for(let v=0;v<r;v++){const y=_[v][I],C=_[v+1][I],T=_[v+1][I+1],F=_[v][I+1];(e>0||v!==0)&&(h.push(y,C,F),w+=3),(t>0||v!==r-1)&&(h.push(C,T,F),w+=3)}c.addGroup(p,w,0),p+=w}function b(M){const R=g,w=new Ae,L=new U;let I=0;const v=M===!0?e:t,y=M===!0?1:-1;for(let T=1;T<=s;T++)f.push(0,m*y,0),d.push(0,y,0),u.push(.5,.5),g++;const C=g;for(let T=0;T<=s;T++){const D=T/s*l+a,B=Math.cos(D),N=Math.sin(D);L.x=v*N,L.y=m*y,L.z=v*B,f.push(L.x,L.y,L.z),d.push(0,y,0),w.x=B*.5+.5,w.y=N*.5*y+.5,u.push(w.x,w.y),g++}for(let T=0;T<s;T++){const F=R+T,D=C+T;M===!0?h.push(D,D+1,F):h.push(D+1,D,F),I+=3}c.addGroup(p,I,M===!0?1:2),p+=I}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new oi(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class kl extends Ot{constructor(e=[],t=[],n=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:n,detail:s};const r=[],o=[];a(s),c(n),h(),this.setAttribute("position",new ct(r,3)),this.setAttribute("normal",new ct(r.slice(),3)),this.setAttribute("uv",new ct(o,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function a(E){const b=new U,M=new U,R=new U;for(let w=0;w<t.length;w+=3)u(t[w+0],b),u(t[w+1],M),u(t[w+2],R),l(b,M,R,E)}function l(E,b,M,R){const w=R+1,L=[];for(let I=0;I<=w;I++){L[I]=[];const v=E.clone().lerp(M,I/w),y=b.clone().lerp(M,I/w),C=w-I;for(let T=0;T<=C;T++)T===0&&I===w?L[I][T]=v:L[I][T]=v.clone().lerp(y,T/C)}for(let I=0;I<w;I++)for(let v=0;v<2*(w-I)-1;v++){const y=Math.floor(v/2);v%2===0?(d(L[I][y+1]),d(L[I+1][y]),d(L[I][y])):(d(L[I][y+1]),d(L[I+1][y+1]),d(L[I+1][y]))}}function c(E){const b=new U;for(let M=0;M<r.length;M+=3)b.x=r[M+0],b.y=r[M+1],b.z=r[M+2],b.normalize().multiplyScalar(E),r[M+0]=b.x,r[M+1]=b.y,r[M+2]=b.z}function h(){const E=new U;for(let b=0;b<r.length;b+=3){E.x=r[b+0],E.y=r[b+1],E.z=r[b+2];const M=m(E)/2/Math.PI+.5,R=p(E)/Math.PI+.5;o.push(M,1-R)}g(),f()}function f(){for(let E=0;E<o.length;E+=6){const b=o[E+0],M=o[E+2],R=o[E+4],w=Math.max(b,M,R),L=Math.min(b,M,R);w>.9&&L<.1&&(b<.2&&(o[E+0]+=1),M<.2&&(o[E+2]+=1),R<.2&&(o[E+4]+=1))}}function d(E){r.push(E.x,E.y,E.z)}function u(E,b){const M=E*3;b.x=e[M+0],b.y=e[M+1],b.z=e[M+2]}function g(){const E=new U,b=new U,M=new U,R=new U,w=new Ae,L=new Ae,I=new Ae;for(let v=0,y=0;v<r.length;v+=9,y+=6){E.set(r[v+0],r[v+1],r[v+2]),b.set(r[v+3],r[v+4],r[v+5]),M.set(r[v+6],r[v+7],r[v+8]),w.set(o[y+0],o[y+1]),L.set(o[y+2],o[y+3]),I.set(o[y+4],o[y+5]),R.copy(E).add(b).add(M).divideScalar(3);const C=m(R);_(w,y+0,E,C),_(L,y+2,b,C),_(I,y+4,M,C)}}function _(E,b,M,R){R<0&&E.x===1&&(o[b]=E.x-1),M.x===0&&M.z===0&&(o[b]=R/2/Math.PI+.5)}function m(E){return Math.atan2(E.z,-E.x)}function p(E){return Math.atan2(-E.y,Math.sqrt(E.x*E.x+E.z*E.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new kl(e.vertices,e.indices,e.radius,e.details)}}class Hl extends kl{constructor(e=1,t=0){const n=(1+Math.sqrt(5))/2,s=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(s,r,e,t),this.type="IcosahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Hl(e.radius,e.detail)}}class Rn extends Ot{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};const r=e/2,o=t/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,f=e/a,d=t/l,u=[],g=[],_=[],m=[];for(let p=0;p<h;p++){const E=p*d-o;for(let b=0;b<c;b++){const M=b*f-r;g.push(M,-E,0),_.push(0,0,1),m.push(b/a),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let E=0;E<a;E++){const b=E+c*p,M=E+c*(p+1),R=E+1+c*(p+1),w=E+1+c*p;u.push(b,M,w),u.push(M,R,w)}this.setIndex(u),this.setAttribute("position",new ct(g,3)),this.setAttribute("normal",new ct(_,3)),this.setAttribute("uv",new ct(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Rn(e.width,e.height,e.widthSegments,e.heightSegments)}}class dr extends Ot{constructor(e=.5,t=1,n=32,s=1,r=0,o=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:s,thetaStart:r,thetaLength:o},n=Math.max(3,n),s=Math.max(1,s);const a=[],l=[],c=[],h=[];let f=e;const d=(t-e)/s,u=new U,g=new Ae;for(let _=0;_<=s;_++){for(let m=0;m<=n;m++){const p=r+m/n*o;u.x=f*Math.cos(p),u.y=f*Math.sin(p),l.push(u.x,u.y,u.z),c.push(0,0,1),g.x=(u.x/t+1)/2,g.y=(u.y/t+1)/2,h.push(g.x,g.y)}f+=d}for(let _=0;_<s;_++){const m=_*(n+1);for(let p=0;p<n;p++){const E=p+m,b=E,M=E+n+1,R=E+n+2,w=E+1;a.push(b,M,w),a.push(M,R,w)}}this.setIndex(a),this.setAttribute("position",new ct(l,3)),this.setAttribute("normal",new ct(c,3)),this.setAttribute("uv",new ct(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new dr(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}}class zl extends Ot{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(o+a,Math.PI);let c=0;const h=[],f=new U,d=new U,u=[],g=[],_=[],m=[];for(let p=0;p<=n;p++){const E=[],b=p/n;let M=0;p===0&&o===0?M=.5/t:p===n&&l===Math.PI&&(M=-.5/t);for(let R=0;R<=t;R++){const w=R/t;f.x=-e*Math.cos(s+w*r)*Math.sin(o+b*a),f.y=e*Math.cos(o+b*a),f.z=e*Math.sin(s+w*r)*Math.sin(o+b*a),g.push(f.x,f.y,f.z),d.copy(f).normalize(),_.push(d.x,d.y,d.z),m.push(w+M,1-b),E.push(c++)}h.push(E)}for(let p=0;p<n;p++)for(let E=0;E<t;E++){const b=h[p][E+1],M=h[p][E],R=h[p+1][E],w=h[p+1][E+1];(p!==0||o>0)&&u.push(b,M,w),(p!==n-1||l<Math.PI)&&u.push(M,R,w)}this.setIndex(u),this.setAttribute("position",new ct(g,3)),this.setAttribute("normal",new ct(_,3)),this.setAttribute("uv",new ct(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new zl(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class bo extends Ot{constructor(e=1,t=.4,n=12,s=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:s,arc:r},n=Math.floor(n),s=Math.floor(s);const o=[],a=[],l=[],c=[],h=new U,f=new U,d=new U;for(let u=0;u<=n;u++)for(let g=0;g<=s;g++){const _=g/s*r,m=u/n*Math.PI*2;f.x=(e+t*Math.cos(m))*Math.cos(_),f.y=(e+t*Math.cos(m))*Math.sin(_),f.z=t*Math.sin(m),a.push(f.x,f.y,f.z),h.x=e*Math.cos(_),h.y=e*Math.sin(_),d.subVectors(f,h).normalize(),l.push(d.x,d.y,d.z),c.push(g/s),c.push(u/n)}for(let u=1;u<=n;u++)for(let g=1;g<=s;g++){const _=(s+1)*u+g-1,m=(s+1)*(u-1)+g-1,p=(s+1)*(u-1)+g,E=(s+1)*u+g;o.push(_,m,E),o.push(m,p,E)}this.setIndex(o),this.setAttribute("position",new ct(a,3)),this.setAttribute("normal",new ct(l,3)),this.setAttribute("uv",new ct(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new bo(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class Je extends zi{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Oe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Oe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Yh,this.normalScale=new Ae(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Vn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Lf extends zi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Su,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class If extends zi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class Vl extends Rt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Oe(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class Df extends Vl{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Rt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Oe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const sa=new at,Nc=new U,Oc=new U;class cd{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ae(512,512),this.mapType=zn,this.map=null,this.mapPass=null,this.matrix=new at,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Fl,this._frameExtents=new Ae(1,1),this._viewportCount=1,this._viewports=[new ot(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Nc.setFromMatrixPosition(e.matrixWorld),t.position.copy(Nc),Oc.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Oc),t.updateMatrixWorld(),sa.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(sa,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(sa)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Fc=new at,Hs=new U,ra=new U;class Uf extends cd{constructor(){super(new sn(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new Ae(4,2),this._viewportCount=6,this._viewports=[new ot(2,1,1,1),new ot(0,1,1,1),new ot(3,1,1,1),new ot(1,1,1,1),new ot(3,0,1,1),new ot(1,0,1,1)],this._cubeDirections=[new U(1,0,0),new U(-1,0,0),new U(0,0,1),new U(0,0,-1),new U(0,1,0),new U(0,-1,0)],this._cubeUps=[new U(0,1,0),new U(0,1,0),new U(0,1,0),new U(0,1,0),new U(0,0,1),new U(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,s=this.matrix,r=e.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),Hs.setFromMatrixPosition(e.matrixWorld),n.position.copy(Hs),ra.copy(n.position),ra.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(ra),n.updateMatrixWorld(),s.makeTranslation(-Hs.x,-Hs.y,-Hs.z),Fc.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Fc,n.coordinateSystem,n.reversedDepth)}}class Gl extends Vl{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new Uf}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class To extends nd{constructor(e=-1,t=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-e,o=n+e,a=s+t,l=s-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Nf extends cd{constructor(){super(new To(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Of extends Vl{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Rt.DEFAULT_UP),this.updateMatrix(),this.target=new Rt,this.shadow=new Nf}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class Ff extends sn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Bf{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const Bc=new at;class kf{constructor(e,t,n=0,s=1/0){this.ray=new Ul(e,t),this.near=n,this.far=s,this.camera=null,this.layers=new Nl,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Bc.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Bc),this}intersectObject(e,t=!0,n=[]){return gl(e,this,n,t),n.sort(kc),n}intersectObjects(e,t=!0,n=[]){for(let s=0,r=e.length;s<r;s++)gl(e[s],this,n,t);return n.sort(kc),n}}function kc(i,e){return i.distance-e.distance}function gl(i,e,t,n){let s=!0;if(i.layers.test(e.layers)&&i.raycast(e,t)===!1&&(s=!1),s===!0&&n===!0){const r=i.children;for(let o=0,a=r.length;o<a;o++)gl(r[o],e,t,!0)}}function Hc(i,e,t,n){const s=Hf(n);switch(t){case Xh:return i*e;case Cl:return i*e/s.components*s.byteLength;case Rl:return i*e/s.components*s.byteLength;case $h:return i*e*2/s.components*s.byteLength;case Pl:return i*e*2/s.components*s.byteLength;case qh:return i*e*3/s.components*s.byteLength;case Tn:return i*e*4/s.components*s.byteLength;case Ll:return i*e*4/s.components*s.byteLength;case Qr:case eo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case to:case no:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case za:case Ga:return Math.max(i,16)*Math.max(e,8)/4;case Ha:case Va:return Math.max(i,8)*Math.max(e,8)/2;case Wa:case Xa:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case qa:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case $a:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ya:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case ja:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Ka:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Za:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Ja:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Qa:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case el:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case tl:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case nl:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case il:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case sl:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case rl:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case ol:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case al:case ll:case cl:return Math.ceil(i/4)*Math.ceil(e/4)*16;case hl:case dl:return Math.ceil(i/4)*Math.ceil(e/4)*8;case ul:case fl:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Hf(i){switch(i){case zn:case zh:return{byteLength:1,components:1};case Zs:case Vh:case ti:return{byteLength:2,components:1};case wl:case Al:return{byteLength:2,components:4};case Bi:case Tl:case Bn:return{byteLength:4,components:1};case Gh:case Wh:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:bl}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=bl);function hd(){let i=null,e=!1,t=null,n=null;function s(r,o){t(r,o),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function zf(i){const e=new WeakMap;function t(a,l){const c=a.array,h=a.usage,f=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,h),a.onUploadCallback();let u;if(c instanceof Float32Array)u=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)u=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?u=i.HALF_FLOAT:u=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)u=i.SHORT;else if(c instanceof Uint32Array)u=i.UNSIGNED_INT;else if(c instanceof Int32Array)u=i.INT;else if(c instanceof Int8Array)u=i.BYTE;else if(c instanceof Uint8Array)u=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)u=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:u,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:f}}function n(a,l,c){const h=l.array,f=l.updateRanges;if(i.bindBuffer(c,a),f.length===0)i.bufferSubData(c,0,h);else{f.sort((u,g)=>u.start-g.start);let d=0;for(let u=1;u<f.length;u++){const g=f[d],_=f[u];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++d,f[d]=_)}f.length=d+1;for(let u=0,g=f.length;u<g;u++){const _=f[u];i.bufferSubData(c,_.start*h.BYTES_PER_ELEMENT,h,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(i.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var Vf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Gf=`#ifdef USE_ALPHAHASH
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
#endif`,Wf=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Xf=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,qf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,$f=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Yf=`#ifdef USE_AOMAP
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
#endif`,jf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Kf=`#ifdef USE_BATCHING
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
#endif`,Zf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Jf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Qf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,ep=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,tp=`#ifdef USE_IRIDESCENCE
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
#endif`,np=`#ifdef USE_BUMPMAP
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
#endif`,ip=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,sp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,rp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,op=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,ap=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,lp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,cp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,hp=`#if defined( USE_COLOR_ALPHA )
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
#endif`,dp=`#define PI 3.141592653589793
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
} // validated`,up=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,fp=`vec3 transformedNormal = objectNormal;
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
#endif`,pp=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,mp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,gp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,_p=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,vp="gl_FragColor = linearToOutputTexel( gl_FragColor );",yp=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,xp=`#ifdef USE_ENVMAP
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
#endif`,Mp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Sp=`#ifdef USE_ENVMAP
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
#endif`,Ep=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,bp=`#ifdef USE_ENVMAP
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
#endif`,Tp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,wp=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Ap=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Cp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Rp=`#ifdef USE_GRADIENTMAP
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
}`,Pp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Lp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Ip=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Dp=`uniform bool receiveShadow;
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
#endif`,Up=`#ifdef USE_ENVMAP
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
#endif`,Np=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Op=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Fp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Bp=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,kp=`PhysicalMaterial material;
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
#endif`,Hp=`struct PhysicalMaterial {
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
}`,zp=`
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
#endif`,Vp=`#if defined( RE_IndirectDiffuse )
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
#endif`,Gp=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Wp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Xp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,qp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,$p=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Yp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,jp=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Kp=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Zp=`#if defined( USE_POINTS_UV )
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
#endif`,Jp=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Qp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,em=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,tm=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,nm=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,im=`#ifdef USE_MORPHTARGETS
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
#endif`,sm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,rm=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,om=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,am=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,lm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,cm=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,hm=`#ifdef USE_NORMALMAP
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
#endif`,dm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,um=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,fm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,pm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,mm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,gm=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,_m=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,vm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,ym=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,xm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Mm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Sm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Em=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,bm=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Tm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,wm=`float getShadowMask() {
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
}`,Am=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Cm=`#ifdef USE_SKINNING
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
#endif`,Rm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Pm=`#ifdef USE_SKINNING
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
#endif`,Lm=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Im=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Dm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Um=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Nm=`#ifdef USE_TRANSMISSION
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
#endif`,Om=`#ifdef USE_TRANSMISSION
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
#endif`,Fm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Bm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,km=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Hm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const zm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Vm=`uniform sampler2D t2D;
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
}`,Gm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Wm=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Xm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,qm=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,$m=`#include <common>
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
}`,Ym=`#if DEPTH_PACKING == 3200
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
}`,jm=`#define DISTANCE
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
}`,Km=`#define DISTANCE
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
}`,Zm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Jm=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Qm=`uniform float scale;
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
}`,eg=`uniform vec3 diffuse;
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
}`,tg=`#include <common>
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
}`,ng=`uniform vec3 diffuse;
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
}`,ig=`#define LAMBERT
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
}`,sg=`#define LAMBERT
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
}`,rg=`#define MATCAP
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
}`,og=`#define MATCAP
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
}`,ag=`#define NORMAL
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
}`,lg=`#define NORMAL
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
}`,cg=`#define PHONG
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
}`,hg=`#define PHONG
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
}`,dg=`#define STANDARD
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
}`,ug=`#define STANDARD
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
}`,fg=`#define TOON
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
}`,pg=`#define TOON
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
}`,mg=`uniform float size;
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
}`,gg=`uniform vec3 diffuse;
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
}`,_g=`#include <common>
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
}`,vg=`uniform vec3 color;
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
}`,yg=`uniform float rotation;
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
}`,xg=`uniform vec3 diffuse;
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
}`,qe={alphahash_fragment:Vf,alphahash_pars_fragment:Gf,alphamap_fragment:Wf,alphamap_pars_fragment:Xf,alphatest_fragment:qf,alphatest_pars_fragment:$f,aomap_fragment:Yf,aomap_pars_fragment:jf,batching_pars_vertex:Kf,batching_vertex:Zf,begin_vertex:Jf,beginnormal_vertex:Qf,bsdfs:ep,iridescence_fragment:tp,bumpmap_pars_fragment:np,clipping_planes_fragment:ip,clipping_planes_pars_fragment:sp,clipping_planes_pars_vertex:rp,clipping_planes_vertex:op,color_fragment:ap,color_pars_fragment:lp,color_pars_vertex:cp,color_vertex:hp,common:dp,cube_uv_reflection_fragment:up,defaultnormal_vertex:fp,displacementmap_pars_vertex:pp,displacementmap_vertex:mp,emissivemap_fragment:gp,emissivemap_pars_fragment:_p,colorspace_fragment:vp,colorspace_pars_fragment:yp,envmap_fragment:xp,envmap_common_pars_fragment:Mp,envmap_pars_fragment:Sp,envmap_pars_vertex:Ep,envmap_physical_pars_fragment:Up,envmap_vertex:bp,fog_vertex:Tp,fog_pars_vertex:wp,fog_fragment:Ap,fog_pars_fragment:Cp,gradientmap_pars_fragment:Rp,lightmap_pars_fragment:Pp,lights_lambert_fragment:Lp,lights_lambert_pars_fragment:Ip,lights_pars_begin:Dp,lights_toon_fragment:Np,lights_toon_pars_fragment:Op,lights_phong_fragment:Fp,lights_phong_pars_fragment:Bp,lights_physical_fragment:kp,lights_physical_pars_fragment:Hp,lights_fragment_begin:zp,lights_fragment_maps:Vp,lights_fragment_end:Gp,logdepthbuf_fragment:Wp,logdepthbuf_pars_fragment:Xp,logdepthbuf_pars_vertex:qp,logdepthbuf_vertex:$p,map_fragment:Yp,map_pars_fragment:jp,map_particle_fragment:Kp,map_particle_pars_fragment:Zp,metalnessmap_fragment:Jp,metalnessmap_pars_fragment:Qp,morphinstance_vertex:em,morphcolor_vertex:tm,morphnormal_vertex:nm,morphtarget_pars_vertex:im,morphtarget_vertex:sm,normal_fragment_begin:rm,normal_fragment_maps:om,normal_pars_fragment:am,normal_pars_vertex:lm,normal_vertex:cm,normalmap_pars_fragment:hm,clearcoat_normal_fragment_begin:dm,clearcoat_normal_fragment_maps:um,clearcoat_pars_fragment:fm,iridescence_pars_fragment:pm,opaque_fragment:mm,packing:gm,premultiplied_alpha_fragment:_m,project_vertex:vm,dithering_fragment:ym,dithering_pars_fragment:xm,roughnessmap_fragment:Mm,roughnessmap_pars_fragment:Sm,shadowmap_pars_fragment:Em,shadowmap_pars_vertex:bm,shadowmap_vertex:Tm,shadowmask_pars_fragment:wm,skinbase_vertex:Am,skinning_pars_vertex:Cm,skinning_vertex:Rm,skinnormal_vertex:Pm,specularmap_fragment:Lm,specularmap_pars_fragment:Im,tonemapping_fragment:Dm,tonemapping_pars_fragment:Um,transmission_fragment:Nm,transmission_pars_fragment:Om,uv_pars_fragment:Fm,uv_pars_vertex:Bm,uv_vertex:km,worldpos_vertex:Hm,background_vert:zm,background_frag:Vm,backgroundCube_vert:Gm,backgroundCube_frag:Wm,cube_vert:Xm,cube_frag:qm,depth_vert:$m,depth_frag:Ym,distanceRGBA_vert:jm,distanceRGBA_frag:Km,equirect_vert:Zm,equirect_frag:Jm,linedashed_vert:Qm,linedashed_frag:eg,meshbasic_vert:tg,meshbasic_frag:ng,meshlambert_vert:ig,meshlambert_frag:sg,meshmatcap_vert:rg,meshmatcap_frag:og,meshnormal_vert:ag,meshnormal_frag:lg,meshphong_vert:cg,meshphong_frag:hg,meshphysical_vert:dg,meshphysical_frag:ug,meshtoon_vert:fg,meshtoon_frag:pg,points_vert:mg,points_frag:gg,shadow_vert:_g,shadow_frag:vg,sprite_vert:yg,sprite_frag:xg},le={common:{diffuse:{value:new Oe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ge}},envmap:{envMap:{value:null},envMapRotation:{value:new Ge},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ge}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ge}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ge},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ge},normalScale:{value:new Ae(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ge},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ge}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ge}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ge}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Oe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Oe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0},uvTransform:{value:new Ge}},sprite:{diffuse:{value:new Oe(16777215)},opacity:{value:1},center:{value:new Ae(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}}},Un={basic:{uniforms:Gt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.fog]),vertexShader:qe.meshbasic_vert,fragmentShader:qe.meshbasic_frag},lambert:{uniforms:Gt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Oe(0)}}]),vertexShader:qe.meshlambert_vert,fragmentShader:qe.meshlambert_frag},phong:{uniforms:Gt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Oe(0)},specular:{value:new Oe(1118481)},shininess:{value:30}}]),vertexShader:qe.meshphong_vert,fragmentShader:qe.meshphong_frag},standard:{uniforms:Gt([le.common,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.roughnessmap,le.metalnessmap,le.fog,le.lights,{emissive:{value:new Oe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:qe.meshphysical_vert,fragmentShader:qe.meshphysical_frag},toon:{uniforms:Gt([le.common,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.gradientmap,le.fog,le.lights,{emissive:{value:new Oe(0)}}]),vertexShader:qe.meshtoon_vert,fragmentShader:qe.meshtoon_frag},matcap:{uniforms:Gt([le.common,le.bumpmap,le.normalmap,le.displacementmap,le.fog,{matcap:{value:null}}]),vertexShader:qe.meshmatcap_vert,fragmentShader:qe.meshmatcap_frag},points:{uniforms:Gt([le.points,le.fog]),vertexShader:qe.points_vert,fragmentShader:qe.points_frag},dashed:{uniforms:Gt([le.common,le.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:qe.linedashed_vert,fragmentShader:qe.linedashed_frag},depth:{uniforms:Gt([le.common,le.displacementmap]),vertexShader:qe.depth_vert,fragmentShader:qe.depth_frag},normal:{uniforms:Gt([le.common,le.bumpmap,le.normalmap,le.displacementmap,{opacity:{value:1}}]),vertexShader:qe.meshnormal_vert,fragmentShader:qe.meshnormal_frag},sprite:{uniforms:Gt([le.sprite,le.fog]),vertexShader:qe.sprite_vert,fragmentShader:qe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ge},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:qe.background_vert,fragmentShader:qe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ge}},vertexShader:qe.backgroundCube_vert,fragmentShader:qe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:qe.cube_vert,fragmentShader:qe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:qe.equirect_vert,fragmentShader:qe.equirect_frag},distanceRGBA:{uniforms:Gt([le.common,le.displacementmap,{referencePosition:{value:new U},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:qe.distanceRGBA_vert,fragmentShader:qe.distanceRGBA_frag},shadow:{uniforms:Gt([le.lights,le.fog,{color:{value:new Oe(0)},opacity:{value:1}}]),vertexShader:qe.shadow_vert,fragmentShader:qe.shadow_frag}};Un.physical={uniforms:Gt([Un.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ge},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ge},clearcoatNormalScale:{value:new Ae(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ge},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ge},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ge},sheen:{value:0},sheenColor:{value:new Oe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ge},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ge},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ge},transmissionSamplerSize:{value:new Ae},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ge},attenuationDistance:{value:0},attenuationColor:{value:new Oe(0)},specularColor:{value:new Oe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ge},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ge},anisotropyVector:{value:new Ae},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ge}}]),vertexShader:qe.meshphysical_vert,fragmentShader:qe.meshphysical_frag};const Hr={r:0,b:0,g:0},Ti=new Vn,Mg=new at;function Sg(i,e,t,n,s,r,o){const a=new Oe(0);let l=r===!0?0:1,c,h,f=null,d=0,u=null;function g(b){let M=b.isScene===!0?b.background:null;return M&&M.isTexture&&(M=(b.backgroundBlurriness>0?t:e).get(M)),M}function _(b){let M=!1;const R=g(b);R===null?p(a,l):R&&R.isColor&&(p(R,1),M=!0);const w=i.xr.getEnvironmentBlendMode();w==="additive"?n.buffers.color.setClear(0,0,0,1,o):w==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(i.autoClear||M)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(b,M){const R=g(M);R&&(R.isCubeTexture||R.mapping===So)?(h===void 0&&(h=new re(new Kt(1,1,1),new Yt({name:"BackgroundCubeMaterial",uniforms:bs(Un.backgroundCube.uniforms),vertexShader:Un.backgroundCube.vertexShader,fragmentShader:Un.backgroundCube.fragmentShader,side:jt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(w,L,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),Ti.copy(M.backgroundRotation),Ti.x*=-1,Ti.y*=-1,Ti.z*=-1,R.isCubeTexture&&R.isRenderTargetTexture===!1&&(Ti.y*=-1,Ti.z*=-1),h.material.uniforms.envMap.value=R,h.material.uniforms.flipEnvMap.value=R.isCubeTexture&&R.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Mg.makeRotationFromEuler(Ti)),h.material.toneMapped=Ze.getTransfer(R.colorSpace)!==rt,(f!==R||d!==R.version||u!==i.toneMapping)&&(h.material.needsUpdate=!0,f=R,d=R.version,u=i.toneMapping),h.layers.enableAll(),b.unshift(h,h.geometry,h.material,0,0,null)):R&&R.isTexture&&(c===void 0&&(c=new re(new Rn(2,2),new Yt({name:"BackgroundMaterial",uniforms:bs(Un.background.uniforms),vertexShader:Un.background.vertexShader,fragmentShader:Un.background.fragmentShader,side:_i,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=R,c.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,c.material.toneMapped=Ze.getTransfer(R.colorSpace)!==rt,R.matrixAutoUpdate===!0&&R.updateMatrix(),c.material.uniforms.uvTransform.value.copy(R.matrix),(f!==R||d!==R.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,f=R,d=R.version,u=i.toneMapping),c.layers.enableAll(),b.unshift(c,c.geometry,c.material,0,0,null))}function p(b,M){b.getRGB(Hr,td(i)),n.buffers.color.setClear(Hr.r,Hr.g,Hr.b,M,o)}function E(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(b,M=1){a.set(b),l=M,p(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(b){l=b,p(a,l)},render:_,addToRenderList:m,dispose:E}}function Eg(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null);let r=s,o=!1;function a(y,C,T,F,D){let B=!1;const N=f(F,T,C);r!==N&&(r=N,c(r.object)),B=u(y,F,T,D),B&&g(y,F,T,D),D!==null&&e.update(D,i.ELEMENT_ARRAY_BUFFER),(B||o)&&(o=!1,M(y,C,T,F),D!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(D).buffer))}function l(){return i.createVertexArray()}function c(y){return i.bindVertexArray(y)}function h(y){return i.deleteVertexArray(y)}function f(y,C,T){const F=T.wireframe===!0;let D=n[y.id];D===void 0&&(D={},n[y.id]=D);let B=D[C.id];B===void 0&&(B={},D[C.id]=B);let N=B[F];return N===void 0&&(N=d(l()),B[F]=N),N}function d(y){const C=[],T=[],F=[];for(let D=0;D<t;D++)C[D]=0,T[D]=0,F[D]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:C,enabledAttributes:T,attributeDivisors:F,object:y,attributes:{},index:null}}function u(y,C,T,F){const D=r.attributes,B=C.attributes;let N=0;const q=T.getAttributes();for(const V in q)if(q[V].location>=0){const ee=D[V];let ce=B[V];if(ce===void 0&&(V==="instanceMatrix"&&y.instanceMatrix&&(ce=y.instanceMatrix),V==="instanceColor"&&y.instanceColor&&(ce=y.instanceColor)),ee===void 0||ee.attribute!==ce||ce&&ee.data!==ce.data)return!0;N++}return r.attributesNum!==N||r.index!==F}function g(y,C,T,F){const D={},B=C.attributes;let N=0;const q=T.getAttributes();for(const V in q)if(q[V].location>=0){let ee=B[V];ee===void 0&&(V==="instanceMatrix"&&y.instanceMatrix&&(ee=y.instanceMatrix),V==="instanceColor"&&y.instanceColor&&(ee=y.instanceColor));const ce={};ce.attribute=ee,ee&&ee.data&&(ce.data=ee.data),D[V]=ce,N++}r.attributes=D,r.attributesNum=N,r.index=F}function _(){const y=r.newAttributes;for(let C=0,T=y.length;C<T;C++)y[C]=0}function m(y){p(y,0)}function p(y,C){const T=r.newAttributes,F=r.enabledAttributes,D=r.attributeDivisors;T[y]=1,F[y]===0&&(i.enableVertexAttribArray(y),F[y]=1),D[y]!==C&&(i.vertexAttribDivisor(y,C),D[y]=C)}function E(){const y=r.newAttributes,C=r.enabledAttributes;for(let T=0,F=C.length;T<F;T++)C[T]!==y[T]&&(i.disableVertexAttribArray(T),C[T]=0)}function b(y,C,T,F,D,B,N){N===!0?i.vertexAttribIPointer(y,C,T,D,B):i.vertexAttribPointer(y,C,T,F,D,B)}function M(y,C,T,F){_();const D=F.attributes,B=T.getAttributes(),N=C.defaultAttributeValues;for(const q in B){const V=B[q];if(V.location>=0){let Z=D[q];if(Z===void 0&&(q==="instanceMatrix"&&y.instanceMatrix&&(Z=y.instanceMatrix),q==="instanceColor"&&y.instanceColor&&(Z=y.instanceColor)),Z!==void 0){const ee=Z.normalized,ce=Z.itemSize,Ee=e.get(Z);if(Ee===void 0)continue;const He=Ee.buffer,Qe=Ee.type,Q=Ee.bytesPerElement,z=Qe===i.INT||Qe===i.UNSIGNED_INT||Z.gpuType===Tl;if(Z.isInterleavedBufferAttribute){const Y=Z.data,de=Y.stride,Re=Z.offset;if(Y.isInstancedInterleavedBuffer){for(let xe=0;xe<V.locationSize;xe++)p(V.location+xe,Y.meshPerAttribute);y.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=Y.meshPerAttribute*Y.count)}else for(let xe=0;xe<V.locationSize;xe++)m(V.location+xe);i.bindBuffer(i.ARRAY_BUFFER,He);for(let xe=0;xe<V.locationSize;xe++)b(V.location+xe,ce/V.locationSize,Qe,ee,de*Q,(Re+ce/V.locationSize*xe)*Q,z)}else{if(Z.isInstancedBufferAttribute){for(let Y=0;Y<V.locationSize;Y++)p(V.location+Y,Z.meshPerAttribute);y.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=Z.meshPerAttribute*Z.count)}else for(let Y=0;Y<V.locationSize;Y++)m(V.location+Y);i.bindBuffer(i.ARRAY_BUFFER,He);for(let Y=0;Y<V.locationSize;Y++)b(V.location+Y,ce/V.locationSize,Qe,ee,ce*Q,ce/V.locationSize*Y*Q,z)}}else if(N!==void 0){const ee=N[q];if(ee!==void 0)switch(ee.length){case 2:i.vertexAttrib2fv(V.location,ee);break;case 3:i.vertexAttrib3fv(V.location,ee);break;case 4:i.vertexAttrib4fv(V.location,ee);break;default:i.vertexAttrib1fv(V.location,ee)}}}}E()}function R(){I();for(const y in n){const C=n[y];for(const T in C){const F=C[T];for(const D in F)h(F[D].object),delete F[D];delete C[T]}delete n[y]}}function w(y){if(n[y.id]===void 0)return;const C=n[y.id];for(const T in C){const F=C[T];for(const D in F)h(F[D].object),delete F[D];delete C[T]}delete n[y.id]}function L(y){for(const C in n){const T=n[C];if(T[y.id]===void 0)continue;const F=T[y.id];for(const D in F)h(F[D].object),delete F[D];delete T[y.id]}}function I(){v(),o=!0,r!==s&&(r=s,c(r.object))}function v(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:I,resetDefaultState:v,dispose:R,releaseStatesOfGeometry:w,releaseStatesOfProgram:L,initAttributes:_,enableAttribute:m,disableUnusedAttributes:E}}function bg(i,e,t){let n;function s(c){n=c}function r(c,h){i.drawArrays(n,c,h),t.update(h,n,1)}function o(c,h,f){f!==0&&(i.drawArraysInstanced(n,c,h,f),t.update(h,n,f))}function a(c,h,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,f);let u=0;for(let g=0;g<f;g++)u+=h[g];t.update(u,n,1)}function l(c,h,f,d){if(f===0)return;const u=e.get("WEBGL_multi_draw");if(u===null)for(let g=0;g<c.length;g++)o(c[g],h[g],d[g]);else{u.multiDrawArraysInstancedWEBGL(n,c,0,h,0,d,0,f);let g=0;for(let _=0;_<f;_++)g+=h[_]*d[_];t.update(g,n,1)}}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function Tg(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){const L=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(L.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(L){return!(L!==Tn&&n.convert(L)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(L){const I=L===ti&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(L!==zn&&n.convert(L)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&L!==Bn&&!I)}function l(L){if(L==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";L="mediump"}return L==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const f=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),u=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),E=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),b=i.getParameter(i.MAX_VARYING_VECTORS),M=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),R=g>0,w=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:u,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:E,maxVaryings:b,maxFragmentUniforms:M,vertexTextures:R,maxSamples:w}}function wg(i){const e=this;let t=null,n=0,s=!1,r=!1;const o=new fi,a=new Ge,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,d){const u=f.length!==0||d||n!==0||s;return s=d,n=f.length,u},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,d){t=h(f,d,0)},this.setState=function(f,d,u){const g=f.clippingPlanes,_=f.clipIntersection,m=f.clipShadows,p=i.get(f);if(!s||g===null||g.length===0||r&&!m)r?h(null):c();else{const E=r?0:n,b=E*4;let M=p.clippingState||null;l.value=M,M=h(g,d,b,u);for(let R=0;R!==b;++R)M[R]=t[R];p.clippingState=M,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=E}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(f,d,u,g){const _=f!==null?f.length:0;let m=null;if(_!==0){if(m=l.value,g!==!0||m===null){const p=u+_*4,E=d.matrixWorldInverse;a.getNormalMatrix(E),(m===null||m.length<p)&&(m=new Float32Array(p));for(let b=0,M=u;b!==_;++b,M+=4)o.copy(f[b]).applyMatrix4(E,a),o.normal.toArray(m,M),m[M+3]=o.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,m}}function Ag(i){let e=new WeakMap;function t(o,a){return a===Oa?o.mapping=Ms:a===Fa&&(o.mapping=Ss),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===Oa||a===Fa)if(e.has(o)){const l=e.get(o).texture;return t(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new yf(l.height);return c.fromEquirectangularTexture(i,o),e.set(o,c),o.addEventListener("dispose",s),t(c.texture,o.mapping)}else return null}}return o}function s(o){const a=o.target;a.removeEventListener("dispose",s);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}const fs=4,zc=[.125,.215,.35,.446,.526,.582],Li=20,oa=new To,Vc=new Oe;let aa=null,la=0,ca=0,ha=!1;const Ci=(1+Math.sqrt(5))/2,ls=1/Ci,Gc=[new U(-Ci,ls,0),new U(Ci,ls,0),new U(-ls,0,Ci),new U(ls,0,Ci),new U(0,Ci,-ls),new U(0,Ci,ls),new U(-1,1,-1),new U(1,1,-1),new U(-1,1,1),new U(1,1,1)],Cg=new U;class Wc{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,s=100,r={}){const{size:o=256,position:a=Cg}=r;aa=this._renderer.getRenderTarget(),la=this._renderer.getActiveCubeFace(),ca=this._renderer.getActiveMipmapLevel(),ha=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,s,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=$c(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=qc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(aa,la,ca),this._renderer.xr.enabled=ha,e.scissorTest=!1,zr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Ms||e.mapping===Ss?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),aa=this._renderer.getRenderTarget(),la=this._renderer.getActiveCubeFace(),ca=this._renderer.getActiveMipmapLevel(),ha=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:bn,minFilter:bn,generateMipmaps:!1,type:ti,format:Tn,colorSpace:Es,depthBuffer:!1},s=Xc(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Xc(e,t,n);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Rg(r)),this._blurMaterial=Pg(r,e,t)}return s}_compileMaterial(e){const t=new re(this._lodPlanes[0],e);this._renderer.compile(t,oa)}_sceneToCubeUV(e,t,n,s,r){const l=new sn(90,1,t,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],f=this._renderer,d=f.autoClear,u=f.toneMapping;f.getClearColor(Vc),f.toneMapping=gi,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(s),f.clearDepth(),f.setRenderTarget(null));const _=new Cs({name:"PMREM.Background",side:jt,depthWrite:!1,depthTest:!1}),m=new re(new Kt,_);let p=!1;const E=e.background;E?E.isColor&&(_.color.copy(E),e.background=null,p=!0):(_.color.copy(Vc),p=!0);for(let b=0;b<6;b++){const M=b%3;M===0?(l.up.set(0,c[b],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[b],r.y,r.z)):M===1?(l.up.set(0,0,c[b]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[b],r.z)):(l.up.set(0,c[b],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[b]));const R=this._cubeSize;zr(s,M*R,b>2?R:0,R,R),f.setRenderTarget(s),p&&f.render(m,l),f.render(e,l)}m.geometry.dispose(),m.material.dispose(),f.toneMapping=u,f.autoClear=d,e.background=E}_textureToCubeUV(e,t){const n=this._renderer,s=e.mapping===Ms||e.mapping===Ss;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=$c()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=qc());const r=s?this._cubemapMaterial:this._equirectMaterial,o=new re(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=e;const l=this._cubeSize;zr(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,oa)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const s=this._lodPlanes.length;for(let r=1;r<s;r++){const o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=Gc[(s-r-1)%Gc.length];this._blur(e,r-1,r,o,a)}t.autoClear=n}_blur(e,t,n,s,r){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,s,"latitudinal",r),this._halfBlur(o,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,f=new re(this._lodPlanes[s],c),d=c.uniforms,u=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*u):2*Math.PI/(2*Li-1),_=r/g,m=isFinite(r)?1+Math.floor(h*_):Li;m>Li&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Li}`);const p=[];let E=0;for(let L=0;L<Li;++L){const I=L/_,v=Math.exp(-I*I/2);p.push(v),L===0?E+=v:L<m&&(E+=2*v)}for(let L=0;L<p.length;L++)p[L]=p[L]/E;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:b}=this;d.dTheta.value=g,d.mipInt.value=b-n;const M=this._sizeLods[s],R=3*M*(s>b-fs?s-b+fs:0),w=4*(this._cubeSize-M);zr(t,R,w,3*M,2*M),l.setRenderTarget(t),l.render(f,oa)}}function Rg(i){const e=[],t=[],n=[];let s=i;const r=i-fs+1+zc.length;for(let o=0;o<r;o++){const a=Math.pow(2,s);t.push(a);let l=1/a;o>i-fs?l=zc[o-i+fs-1]:o===0&&(l=0),n.push(l);const c=1/(a-2),h=-c,f=1+c,d=[h,h,f,h,f,f,h,h,f,f,h,f],u=6,g=6,_=3,m=2,p=1,E=new Float32Array(_*g*u),b=new Float32Array(m*g*u),M=new Float32Array(p*g*u);for(let w=0;w<u;w++){const L=w%3*2/3-1,I=w>2?0:-1,v=[L,I,0,L+2/3,I,0,L+2/3,I+1,0,L,I,0,L+2/3,I+1,0,L,I+1,0];E.set(v,_*g*w),b.set(d,m*g*w);const y=[w,w,w,w,w,w];M.set(y,p*g*w)}const R=new Ot;R.setAttribute("position",new an(E,_)),R.setAttribute("uv",new an(b,m)),R.setAttribute("faceIndex",new an(M,p)),e.push(R),s>fs&&s--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function Xc(i,e,t){const n=new An(i,e,t);return n.texture.mapping=So,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function zr(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function Pg(i,e,t){const n=new Float32Array(Li),s=new U(0,1,0);return new Yt({name:"SphericalGaussianBlur",defines:{n:Li,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Wl(),fragmentShader:`

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
		`,blending:ei,depthTest:!1,depthWrite:!1})}function qc(){return new Yt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Wl(),fragmentShader:`

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
		`,blending:ei,depthTest:!1,depthWrite:!1})}function $c(){return new Yt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Wl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ei,depthTest:!1,depthWrite:!1})}function Wl(){return`

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
	`}function Lg(i){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===Oa||l===Fa,h=l===Ms||l===Ss;if(c||h){let f=e.get(a);const d=f!==void 0?f.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return t===null&&(t=new Wc(i)),f=c?t.fromEquirectangular(a,f):t.fromCubemap(a,f),f.texture.pmremVersion=a.pmremVersion,e.set(a,f),f.texture;if(f!==void 0)return f.texture;{const u=a.image;return c&&u&&u.height>0||h&&u&&s(u)?(t===null&&(t=new Wc(i)),f=c?t.fromEquirectangular(a):t.fromCubemap(a),f.texture.pmremVersion=a.pmremVersion,e.set(a,f),a.addEventListener("dispose",r),f.texture):null}}}return a}function s(a){let l=0;const c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function r(a){const l=a.target;l.removeEventListener("dispose",r);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:o}}function Ig(i){const e={};function t(n){if(e[n]!==void 0)return e[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const s=t(n);return s===null&&nr("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function Dg(i,e,t,n){const s={},r=new WeakMap;function o(f){const d=f.target;d.index!==null&&e.remove(d.index);for(const g in d.attributes)e.remove(d.attributes[g]);d.removeEventListener("dispose",o),delete s[d.id];const u=r.get(d);u&&(e.remove(u),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function a(f,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,t.memory.geometries++),d}function l(f){const d=f.attributes;for(const u in d)e.update(d[u],i.ARRAY_BUFFER)}function c(f){const d=[],u=f.index,g=f.attributes.position;let _=0;if(u!==null){const E=u.array;_=u.version;for(let b=0,M=E.length;b<M;b+=3){const R=E[b+0],w=E[b+1],L=E[b+2];d.push(R,w,w,L,L,R)}}else if(g!==void 0){const E=g.array;_=g.version;for(let b=0,M=E.length/3-1;b<M;b+=3){const R=b+0,w=b+1,L=b+2;d.push(R,w,w,L,L,R)}}else return;const m=new(Kh(d)?ed:Qh)(d,1);m.version=_;const p=r.get(f);p&&e.remove(p),r.set(f,m)}function h(f){const d=r.get(f);if(d){const u=f.index;u!==null&&d.version<u.version&&c(f)}else c(f);return r.get(f)}return{get:a,update:l,getWireframeAttribute:h}}function Ug(i,e,t){let n;function s(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,u){i.drawElements(n,u,r,d*o),t.update(u,n,1)}function c(d,u,g){g!==0&&(i.drawElementsInstanced(n,u,r,d*o,g),t.update(u,n,g))}function h(d,u,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,d,0,g);let m=0;for(let p=0;p<g;p++)m+=u[p];t.update(m,n,1)}function f(d,u,g,_){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<d.length;p++)c(d[p]/o,u[p],_[p]);else{m.multiDrawElementsInstancedWEBGL(n,u,0,r,d,0,_,0,g);let p=0;for(let E=0;E<g;E++)p+=u[E]*_[E];t.update(p,n,1)}}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=f}function Ng(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(r/3);break;case i.LINES:t.lines+=a*(r/2);break;case i.LINE_STRIP:t.lines+=a*(r-1);break;case i.LINE_LOOP:t.lines+=a*r;break;case i.POINTS:t.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function Og(i,e,t){const n=new WeakMap,s=new ot;function r(o,a,l){const c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,f=h!==void 0?h.length:0;let d=n.get(a);if(d===void 0||d.count!==f){let v=function(){L.dispose(),n.delete(a),a.removeEventListener("dispose",v)};d!==void 0&&d.texture.dispose();const u=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,_=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],E=a.morphAttributes.color||[];let b=0;u===!0&&(b=1),g===!0&&(b=2),_===!0&&(b=3);let M=a.attributes.position.count*b,R=1;M>e.maxTextureSize&&(R=Math.ceil(M/e.maxTextureSize),M=e.maxTextureSize);const w=new Float32Array(M*R*4*f),L=new Zh(w,M,R,f);L.type=Bn,L.needsUpdate=!0;const I=b*4;for(let y=0;y<f;y++){const C=m[y],T=p[y],F=E[y],D=M*R*4*y;for(let B=0;B<C.count;B++){const N=B*I;u===!0&&(s.fromBufferAttribute(C,B),w[D+N+0]=s.x,w[D+N+1]=s.y,w[D+N+2]=s.z,w[D+N+3]=0),g===!0&&(s.fromBufferAttribute(T,B),w[D+N+4]=s.x,w[D+N+5]=s.y,w[D+N+6]=s.z,w[D+N+7]=0),_===!0&&(s.fromBufferAttribute(F,B),w[D+N+8]=s.x,w[D+N+9]=s.y,w[D+N+10]=s.z,w[D+N+11]=F.itemSize===4?s.w:1)}}d={count:f,texture:L,size:new Ae(M,R)},n.set(a,d),a.addEventListener("dispose",v)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,t);else{let u=0;for(let _=0;_<c.length;_++)u+=c[_];const g=a.morphTargetsRelative?1:1-u;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function Fg(i,e,t,n){let s=new WeakMap;function r(l){const c=n.render.frame,h=l.geometry,f=e.get(l,h);if(s.get(f)!==c&&(e.update(f),s.set(f,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),s.get(l)!==c&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;s.get(d)!==c&&(d.update(),s.set(d,c))}return f}function o(){s=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:r,dispose:o}}const dd=new kt,Yc=new ad(1,1),ud=new Zh,fd=new nf,pd=new id,jc=[],Kc=[],Zc=new Float32Array(16),Jc=new Float32Array(9),Qc=new Float32Array(4);function Rs(i,e,t){const n=i[0];if(n<=0||n>0)return i;const s=e*t;let r=jc[s];if(r===void 0&&(r=new Float32Array(s),jc[s]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(r,a)}return r}function Pt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Lt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function wo(i,e){let t=Kc[e];t===void 0&&(t=new Int32Array(e),Kc[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function Bg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function kg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2fv(this.addr,e),Lt(t,e)}}function Hg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Pt(t,e))return;i.uniform3fv(this.addr,e),Lt(t,e)}}function zg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4fv(this.addr,e),Lt(t,e)}}function Vg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Lt(t,e)}else{if(Pt(t,n))return;Qc.set(n),i.uniformMatrix2fv(this.addr,!1,Qc),Lt(t,n)}}function Gg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Lt(t,e)}else{if(Pt(t,n))return;Jc.set(n),i.uniformMatrix3fv(this.addr,!1,Jc),Lt(t,n)}}function Wg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Lt(t,e)}else{if(Pt(t,n))return;Zc.set(n),i.uniformMatrix4fv(this.addr,!1,Zc),Lt(t,n)}}function Xg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function qg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2iv(this.addr,e),Lt(t,e)}}function $g(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;i.uniform3iv(this.addr,e),Lt(t,e)}}function Yg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4iv(this.addr,e),Lt(t,e)}}function jg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function Kg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2uiv(this.addr,e),Lt(t,e)}}function Zg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;i.uniform3uiv(this.addr,e),Lt(t,e)}}function Jg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4uiv(this.addr,e),Lt(t,e)}}function Qg(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Yc.compareFunction=jh,r=Yc):r=dd,t.setTexture2D(e||r,s)}function e0(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||fd,s)}function t0(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||pd,s)}function n0(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||ud,s)}function i0(i){switch(i){case 5126:return Bg;case 35664:return kg;case 35665:return Hg;case 35666:return zg;case 35674:return Vg;case 35675:return Gg;case 35676:return Wg;case 5124:case 35670:return Xg;case 35667:case 35671:return qg;case 35668:case 35672:return $g;case 35669:case 35673:return Yg;case 5125:return jg;case 36294:return Kg;case 36295:return Zg;case 36296:return Jg;case 35678:case 36198:case 36298:case 36306:case 35682:return Qg;case 35679:case 36299:case 36307:return e0;case 35680:case 36300:case 36308:case 36293:return t0;case 36289:case 36303:case 36311:case 36292:return n0}}function s0(i,e){i.uniform1fv(this.addr,e)}function r0(i,e){const t=Rs(e,this.size,2);i.uniform2fv(this.addr,t)}function o0(i,e){const t=Rs(e,this.size,3);i.uniform3fv(this.addr,t)}function a0(i,e){const t=Rs(e,this.size,4);i.uniform4fv(this.addr,t)}function l0(i,e){const t=Rs(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function c0(i,e){const t=Rs(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function h0(i,e){const t=Rs(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function d0(i,e){i.uniform1iv(this.addr,e)}function u0(i,e){i.uniform2iv(this.addr,e)}function f0(i,e){i.uniform3iv(this.addr,e)}function p0(i,e){i.uniform4iv(this.addr,e)}function m0(i,e){i.uniform1uiv(this.addr,e)}function g0(i,e){i.uniform2uiv(this.addr,e)}function _0(i,e){i.uniform3uiv(this.addr,e)}function v0(i,e){i.uniform4uiv(this.addr,e)}function y0(i,e,t){const n=this.cache,s=e.length,r=wo(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),Lt(n,r));for(let o=0;o!==s;++o)t.setTexture2D(e[o]||dd,r[o])}function x0(i,e,t){const n=this.cache,s=e.length,r=wo(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),Lt(n,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||fd,r[o])}function M0(i,e,t){const n=this.cache,s=e.length,r=wo(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),Lt(n,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||pd,r[o])}function S0(i,e,t){const n=this.cache,s=e.length,r=wo(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),Lt(n,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||ud,r[o])}function E0(i){switch(i){case 5126:return s0;case 35664:return r0;case 35665:return o0;case 35666:return a0;case 35674:return l0;case 35675:return c0;case 35676:return h0;case 5124:case 35670:return d0;case 35667:case 35671:return u0;case 35668:case 35672:return f0;case 35669:case 35673:return p0;case 5125:return m0;case 36294:return g0;case 36295:return _0;case 36296:return v0;case 35678:case 36198:case 36298:case 36306:case 35682:return y0;case 35679:case 36299:case 36307:return x0;case 35680:case 36300:case 36308:case 36293:return M0;case 36289:case 36303:case 36311:case 36292:return S0}}class b0{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=i0(t.type)}}class T0{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=E0(t.type)}}class w0{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(e,t[a.id],n)}}}const da=/(\w+)(\])?(\[|\.)?/g;function eh(i,e){i.seq.push(e),i.map[e.id]=e}function A0(i,e,t){const n=i.name,s=n.length;for(da.lastIndex=0;;){const r=da.exec(n),o=da.lastIndex;let a=r[1];const l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){eh(t,c===void 0?new b0(a,i,e):new T0(a,i,e));break}else{let f=t.map[a];f===void 0&&(f=new w0(a),eh(t,f)),t=f}}}class io{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){const r=e.getActiveUniform(t,s),o=e.getUniformLocation(t,r.name);A0(r,o,this)}}setValue(e,t,n,s){const r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){const s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,o=t.length;r!==o;++r){const a=t[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,s)}}static seqWithValue(e,t){const n=[];for(let s=0,r=e.length;s!==r;++s){const o=e[s];o.id in t&&n.push(o)}return n}}function th(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const C0=37297;let R0=0;function P0(i,e){const t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const nh=new Ge;function L0(i){Ze._getMatrix(nh,Ze.workingColorSpace,i);const e=`mat3( ${nh.elements.map(t=>t.toFixed(4))} )`;switch(Ze.getTransfer(i)){case ho:return[e,"LinearTransferOETF"];case rt:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function ih(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+P0(i.getShaderSource(e),a)}else return r}function I0(i,e){const t=L0(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function D0(i,e){let t;switch(e){case mu:t="Linear";break;case gu:t="Reinhard";break;case _u:t="Cineon";break;case kh:t="ACESFilmic";break;case yu:t="AgX";break;case xu:t="Neutral";break;case vu:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Vr=new U;function U0(){Ze.getLuminanceCoefficients(Vr);const i=Vr.x.toFixed(4),e=Vr.y.toFixed(4),t=Vr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function N0(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Xs).join(`
`)}function O0(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function F0(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(e,s),o=r.name;let a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}function Xs(i){return i!==""}function sh(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function rh(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const B0=/^[ \t]*#include +<([\w\d./]+)>/gm;function _l(i){return i.replace(B0,H0)}const k0=new Map;function H0(i,e){let t=qe[e];if(t===void 0){const n=k0.get(e);if(n!==void 0)t=qe[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return _l(t)}const z0=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function oh(i){return i.replace(z0,V0)}function V0(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function ah(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function G0(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===Oh?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===Fh?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===jn&&(e="SHADOWMAP_TYPE_VSM"),e}function W0(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case Ms:case Ss:e="ENVMAP_TYPE_CUBE";break;case So:e="ENVMAP_TYPE_CUBE_UV";break}return e}function X0(i){let e="ENVMAP_MODE_REFLECTION";return i.envMap&&i.envMapMode===Ss&&(e="ENVMAP_MODE_REFRACTION"),e}function q0(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Bh:e="ENVMAP_BLENDING_MULTIPLY";break;case fu:e="ENVMAP_BLENDING_MIX";break;case pu:e="ENVMAP_BLENDING_ADD";break}return e}function $0(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function Y0(i,e,t,n){const s=i.getContext(),r=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=G0(t),c=W0(t),h=X0(t),f=q0(t),d=$0(t),u=N0(t),g=O0(r),_=s.createProgram();let m,p,E=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Xs).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Xs).join(`
`),p.length>0&&(p+=`
`)):(m=[ah(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Xs).join(`
`),p=[ah(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+f:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==gi?"#define TONE_MAPPING":"",t.toneMapping!==gi?qe.tonemapping_pars_fragment:"",t.toneMapping!==gi?D0("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",qe.colorspace_pars_fragment,I0("linearToOutputTexel",t.outputColorSpace),U0(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Xs).join(`
`)),o=_l(o),o=sh(o,t),o=rh(o,t),a=_l(a),a=sh(a,t),a=rh(a,t),o=oh(o),a=oh(a),t.isRawShaderMaterial!==!0&&(E=`#version 300 es
`,m=[u,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===cc?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===cc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const b=E+m+o,M=E+p+a,R=th(s,s.VERTEX_SHADER,b),w=th(s,s.FRAGMENT_SHADER,M);s.attachShader(_,R),s.attachShader(_,w),t.index0AttributeName!==void 0?s.bindAttribLocation(_,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function L(C){if(i.debug.checkShaderErrors){const T=s.getProgramInfoLog(_)||"",F=s.getShaderInfoLog(R)||"",D=s.getShaderInfoLog(w)||"",B=T.trim(),N=F.trim(),q=D.trim();let V=!0,Z=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(V=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,_,R,w);else{const ee=ih(s,R,"vertex"),ce=ih(s,w,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+B+`
`+ee+`
`+ce)}else B!==""?console.warn("THREE.WebGLProgram: Program Info Log:",B):(N===""||q==="")&&(Z=!1);Z&&(C.diagnostics={runnable:V,programLog:B,vertexShader:{log:N,prefix:m},fragmentShader:{log:q,prefix:p}})}s.deleteShader(R),s.deleteShader(w),I=new io(s,_),v=F0(s,_)}let I;this.getUniforms=function(){return I===void 0&&L(this),I};let v;this.getAttributes=function(){return v===void 0&&L(this),v};let y=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return y===!1&&(y=s.getProgramParameter(_,C0)),y},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=R0++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=R,this.fragmentShader=w,this}let j0=0;class K0{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new Z0(e),t.set(e,n)),n}}class Z0{constructor(e){this.id=j0++,this.code=e,this.usedTimes=0}}function J0(i,e,t,n,s,r,o){const a=new Nl,l=new K0,c=new Set,h=[],f=s.logarithmicDepthBuffer,d=s.vertexTextures;let u=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(v){return c.add(v),v===0?"uv":`uv${v}`}function m(v,y,C,T,F){const D=T.fog,B=F.geometry,N=v.isMeshStandardMaterial?T.environment:null,q=(v.isMeshStandardMaterial?t:e).get(v.envMap||N),V=q&&q.mapping===So?q.image.height:null,Z=g[v.type];v.precision!==null&&(u=s.getMaxPrecision(v.precision),u!==v.precision&&console.warn("THREE.WebGLProgram.getParameters:",v.precision,"not supported, using",u,"instead."));const ee=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,ce=ee!==void 0?ee.length:0;let Ee=0;B.morphAttributes.position!==void 0&&(Ee=1),B.morphAttributes.normal!==void 0&&(Ee=2),B.morphAttributes.color!==void 0&&(Ee=3);let He,Qe,Q,z;if(Z){const tt=Un[Z];He=tt.vertexShader,Qe=tt.fragmentShader}else He=v.vertexShader,Qe=v.fragmentShader,l.update(v),Q=l.getVertexShaderID(v),z=l.getFragmentShaderID(v);const Y=i.getRenderTarget(),de=i.state.buffers.depth.getReversed(),Re=F.isInstancedMesh===!0,xe=F.isBatchedMesh===!0,Be=!!v.map,Et=!!v.matcap,P=!!q,ft=!!v.aoMap,ke=!!v.lightMap,Ue=!!v.bumpMap,Me=!!v.normalMap,pt=!!v.displacementMap,Se=!!v.emissiveMap,Xe=!!v.metalnessMap,It=!!v.roughnessMap,Mt=v.anisotropy>0,A=v.clearcoat>0,x=v.dispersion>0,G=v.iridescence>0,j=v.sheen>0,J=v.transmission>0,$=Mt&&!!v.anisotropyMap,Ce=A&&!!v.clearcoatMap,oe=A&&!!v.clearcoatNormalMap,be=A&&!!v.clearcoatRoughnessMap,Te=G&&!!v.iridescenceMap,ie=G&&!!v.iridescenceThicknessMap,fe=j&&!!v.sheenColorMap,De=j&&!!v.sheenRoughnessMap,we=!!v.specularMap,he=!!v.specularColorMap,ze=!!v.specularIntensityMap,O=J&&!!v.transmissionMap,se=J&&!!v.thicknessMap,ae=!!v.gradientMap,_e=!!v.alphaMap,te=v.alphaTest>0,K=!!v.alphaHash,ye=!!v.extensions;let Fe=gi;v.toneMapped&&(Y===null||Y.isXRRenderTarget===!0)&&(Fe=i.toneMapping);const ht={shaderID:Z,shaderType:v.type,shaderName:v.name,vertexShader:He,fragmentShader:Qe,defines:v.defines,customVertexShaderID:Q,customFragmentShaderID:z,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:u,batching:xe,batchingColor:xe&&F._colorsTexture!==null,instancing:Re,instancingColor:Re&&F.instanceColor!==null,instancingMorph:Re&&F.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:Y===null?i.outputColorSpace:Y.isXRRenderTarget===!0?Y.texture.colorSpace:Es,alphaToCoverage:!!v.alphaToCoverage,map:Be,matcap:Et,envMap:P,envMapMode:P&&q.mapping,envMapCubeUVHeight:V,aoMap:ft,lightMap:ke,bumpMap:Ue,normalMap:Me,displacementMap:d&&pt,emissiveMap:Se,normalMapObjectSpace:Me&&v.normalMapType===bu,normalMapTangentSpace:Me&&v.normalMapType===Yh,metalnessMap:Xe,roughnessMap:It,anisotropy:Mt,anisotropyMap:$,clearcoat:A,clearcoatMap:Ce,clearcoatNormalMap:oe,clearcoatRoughnessMap:be,dispersion:x,iridescence:G,iridescenceMap:Te,iridescenceThicknessMap:ie,sheen:j,sheenColorMap:fe,sheenRoughnessMap:De,specularMap:we,specularColorMap:he,specularIntensityMap:ze,transmission:J,transmissionMap:O,thicknessMap:se,gradientMap:ae,opaque:v.transparent===!1&&v.blending===gs&&v.alphaToCoverage===!1,alphaMap:_e,alphaTest:te,alphaHash:K,combine:v.combine,mapUv:Be&&_(v.map.channel),aoMapUv:ft&&_(v.aoMap.channel),lightMapUv:ke&&_(v.lightMap.channel),bumpMapUv:Ue&&_(v.bumpMap.channel),normalMapUv:Me&&_(v.normalMap.channel),displacementMapUv:pt&&_(v.displacementMap.channel),emissiveMapUv:Se&&_(v.emissiveMap.channel),metalnessMapUv:Xe&&_(v.metalnessMap.channel),roughnessMapUv:It&&_(v.roughnessMap.channel),anisotropyMapUv:$&&_(v.anisotropyMap.channel),clearcoatMapUv:Ce&&_(v.clearcoatMap.channel),clearcoatNormalMapUv:oe&&_(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:be&&_(v.clearcoatRoughnessMap.channel),iridescenceMapUv:Te&&_(v.iridescenceMap.channel),iridescenceThicknessMapUv:ie&&_(v.iridescenceThicknessMap.channel),sheenColorMapUv:fe&&_(v.sheenColorMap.channel),sheenRoughnessMapUv:De&&_(v.sheenRoughnessMap.channel),specularMapUv:we&&_(v.specularMap.channel),specularColorMapUv:he&&_(v.specularColorMap.channel),specularIntensityMapUv:ze&&_(v.specularIntensityMap.channel),transmissionMapUv:O&&_(v.transmissionMap.channel),thicknessMapUv:se&&_(v.thicknessMap.channel),alphaMapUv:_e&&_(v.alphaMap.channel),vertexTangents:!!B.attributes.tangent&&(Me||Mt),vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!B.attributes.uv&&(Be||_e),fog:!!D,useFog:v.fog===!0,fogExp2:!!D&&D.isFogExp2,flatShading:v.flatShading===!0&&v.wireframe===!1,sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:de,skinning:F.isSkinnedMesh===!0,morphTargets:B.morphAttributes.position!==void 0,morphNormals:B.morphAttributes.normal!==void 0,morphColors:B.morphAttributes.color!==void 0,morphTargetsCount:ce,morphTextureStride:Ee,numDirLights:y.directional.length,numPointLights:y.point.length,numSpotLights:y.spot.length,numSpotLightMaps:y.spotLightMap.length,numRectAreaLights:y.rectArea.length,numHemiLights:y.hemi.length,numDirLightShadows:y.directionalShadowMap.length,numPointLightShadows:y.pointShadowMap.length,numSpotLightShadows:y.spotShadowMap.length,numSpotLightShadowsWithMaps:y.numSpotLightShadowsWithMaps,numLightProbes:y.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:v.dithering,shadowMapEnabled:i.shadowMap.enabled&&C.length>0,shadowMapType:i.shadowMap.type,toneMapping:Fe,decodeVideoTexture:Be&&v.map.isVideoTexture===!0&&Ze.getTransfer(v.map.colorSpace)===rt,decodeVideoTextureEmissive:Se&&v.emissiveMap.isVideoTexture===!0&&Ze.getTransfer(v.emissiveMap.colorSpace)===rt,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===rn,flipSided:v.side===jt,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:ye&&v.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ye&&v.extensions.multiDraw===!0||xe)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return ht.vertexUv1s=c.has(1),ht.vertexUv2s=c.has(2),ht.vertexUv3s=c.has(3),c.clear(),ht}function p(v){const y=[];if(v.shaderID?y.push(v.shaderID):(y.push(v.customVertexShaderID),y.push(v.customFragmentShaderID)),v.defines!==void 0)for(const C in v.defines)y.push(C),y.push(v.defines[C]);return v.isRawShaderMaterial===!1&&(E(y,v),b(y,v),y.push(i.outputColorSpace)),y.push(v.customProgramCacheKey),y.join()}function E(v,y){v.push(y.precision),v.push(y.outputColorSpace),v.push(y.envMapMode),v.push(y.envMapCubeUVHeight),v.push(y.mapUv),v.push(y.alphaMapUv),v.push(y.lightMapUv),v.push(y.aoMapUv),v.push(y.bumpMapUv),v.push(y.normalMapUv),v.push(y.displacementMapUv),v.push(y.emissiveMapUv),v.push(y.metalnessMapUv),v.push(y.roughnessMapUv),v.push(y.anisotropyMapUv),v.push(y.clearcoatMapUv),v.push(y.clearcoatNormalMapUv),v.push(y.clearcoatRoughnessMapUv),v.push(y.iridescenceMapUv),v.push(y.iridescenceThicknessMapUv),v.push(y.sheenColorMapUv),v.push(y.sheenRoughnessMapUv),v.push(y.specularMapUv),v.push(y.specularColorMapUv),v.push(y.specularIntensityMapUv),v.push(y.transmissionMapUv),v.push(y.thicknessMapUv),v.push(y.combine),v.push(y.fogExp2),v.push(y.sizeAttenuation),v.push(y.morphTargetsCount),v.push(y.morphAttributeCount),v.push(y.numDirLights),v.push(y.numPointLights),v.push(y.numSpotLights),v.push(y.numSpotLightMaps),v.push(y.numHemiLights),v.push(y.numRectAreaLights),v.push(y.numDirLightShadows),v.push(y.numPointLightShadows),v.push(y.numSpotLightShadows),v.push(y.numSpotLightShadowsWithMaps),v.push(y.numLightProbes),v.push(y.shadowMapType),v.push(y.toneMapping),v.push(y.numClippingPlanes),v.push(y.numClipIntersection),v.push(y.depthPacking)}function b(v,y){a.disableAll(),y.supportsVertexTextures&&a.enable(0),y.instancing&&a.enable(1),y.instancingColor&&a.enable(2),y.instancingMorph&&a.enable(3),y.matcap&&a.enable(4),y.envMap&&a.enable(5),y.normalMapObjectSpace&&a.enable(6),y.normalMapTangentSpace&&a.enable(7),y.clearcoat&&a.enable(8),y.iridescence&&a.enable(9),y.alphaTest&&a.enable(10),y.vertexColors&&a.enable(11),y.vertexAlphas&&a.enable(12),y.vertexUv1s&&a.enable(13),y.vertexUv2s&&a.enable(14),y.vertexUv3s&&a.enable(15),y.vertexTangents&&a.enable(16),y.anisotropy&&a.enable(17),y.alphaHash&&a.enable(18),y.batching&&a.enable(19),y.dispersion&&a.enable(20),y.batchingColor&&a.enable(21),y.gradientMap&&a.enable(22),v.push(a.mask),a.disableAll(),y.fog&&a.enable(0),y.useFog&&a.enable(1),y.flatShading&&a.enable(2),y.logarithmicDepthBuffer&&a.enable(3),y.reversedDepthBuffer&&a.enable(4),y.skinning&&a.enable(5),y.morphTargets&&a.enable(6),y.morphNormals&&a.enable(7),y.morphColors&&a.enable(8),y.premultipliedAlpha&&a.enable(9),y.shadowMapEnabled&&a.enable(10),y.doubleSided&&a.enable(11),y.flipSided&&a.enable(12),y.useDepthPacking&&a.enable(13),y.dithering&&a.enable(14),y.transmission&&a.enable(15),y.sheen&&a.enable(16),y.opaque&&a.enable(17),y.pointsUvs&&a.enable(18),y.decodeVideoTexture&&a.enable(19),y.decodeVideoTextureEmissive&&a.enable(20),y.alphaToCoverage&&a.enable(21),v.push(a.mask)}function M(v){const y=g[v.type];let C;if(y){const T=Un[y];C=po.clone(T.uniforms)}else C=v.uniforms;return C}function R(v,y){let C;for(let T=0,F=h.length;T<F;T++){const D=h[T];if(D.cacheKey===y){C=D,++C.usedTimes;break}}return C===void 0&&(C=new Y0(i,y,v,r),h.push(C)),C}function w(v){if(--v.usedTimes===0){const y=h.indexOf(v);h[y]=h[h.length-1],h.pop(),v.destroy()}}function L(v){l.remove(v)}function I(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:M,acquireProgram:R,releaseProgram:w,releaseShaderCache:L,programs:h,dispose:I}}function Q0(){let i=new WeakMap;function e(o){return i.has(o)}function t(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function e_(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function lh(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function ch(){const i=[];let e=0;const t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function o(f,d,u,g,_,m){let p=i[e];return p===void 0?(p={id:f.id,object:f,geometry:d,material:u,groupOrder:g,renderOrder:f.renderOrder,z:_,group:m},i[e]=p):(p.id=f.id,p.object=f,p.geometry=d,p.material=u,p.groupOrder=g,p.renderOrder=f.renderOrder,p.z=_,p.group=m),e++,p}function a(f,d,u,g,_,m){const p=o(f,d,u,g,_,m);u.transmission>0?n.push(p):u.transparent===!0?s.push(p):t.push(p)}function l(f,d,u,g,_,m){const p=o(f,d,u,g,_,m);u.transmission>0?n.unshift(p):u.transparent===!0?s.unshift(p):t.unshift(p)}function c(f,d){t.length>1&&t.sort(f||e_),n.length>1&&n.sort(d||lh),s.length>1&&s.sort(d||lh)}function h(){for(let f=e,d=i.length;f<d;f++){const u=i[f];if(u.id===null)break;u.id=null,u.object=null,u.geometry=null,u.material=null,u.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:a,unshift:l,finish:h,sort:c}}function t_(){let i=new WeakMap;function e(n,s){const r=i.get(n);let o;return r===void 0?(o=new ch,i.set(n,[o])):s>=r.length?(o=new ch,r.push(o)):o=r[s],o}function t(){i=new WeakMap}return{get:e,dispose:t}}function n_(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new U,color:new Oe};break;case"SpotLight":t={position:new U,direction:new U,color:new Oe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new U,color:new Oe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new U,skyColor:new Oe,groundColor:new Oe};break;case"RectAreaLight":t={color:new Oe,position:new U,halfWidth:new U,halfHeight:new U};break}return i[e.id]=t,t}}}function i_(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ae};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ae};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ae,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let s_=0;function r_(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function o_(i){const e=new n_,t=i_(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new U);const s=new U,r=new at,o=new at;function a(c){let h=0,f=0,d=0;for(let v=0;v<9;v++)n.probe[v].set(0,0,0);let u=0,g=0,_=0,m=0,p=0,E=0,b=0,M=0,R=0,w=0,L=0;c.sort(r_);for(let v=0,y=c.length;v<y;v++){const C=c[v],T=C.color,F=C.intensity,D=C.distance,B=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)h+=T.r*F,f+=T.g*F,d+=T.b*F;else if(C.isLightProbe){for(let N=0;N<9;N++)n.probe[N].addScaledVector(C.sh.coefficients[N],F);L++}else if(C.isDirectionalLight){const N=e.get(C);if(N.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const q=C.shadow,V=t.get(C);V.shadowIntensity=q.intensity,V.shadowBias=q.bias,V.shadowNormalBias=q.normalBias,V.shadowRadius=q.radius,V.shadowMapSize=q.mapSize,n.directionalShadow[u]=V,n.directionalShadowMap[u]=B,n.directionalShadowMatrix[u]=C.shadow.matrix,E++}n.directional[u]=N,u++}else if(C.isSpotLight){const N=e.get(C);N.position.setFromMatrixPosition(C.matrixWorld),N.color.copy(T).multiplyScalar(F),N.distance=D,N.coneCos=Math.cos(C.angle),N.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),N.decay=C.decay,n.spot[_]=N;const q=C.shadow;if(C.map&&(n.spotLightMap[R]=C.map,R++,q.updateMatrices(C),C.castShadow&&w++),n.spotLightMatrix[_]=q.matrix,C.castShadow){const V=t.get(C);V.shadowIntensity=q.intensity,V.shadowBias=q.bias,V.shadowNormalBias=q.normalBias,V.shadowRadius=q.radius,V.shadowMapSize=q.mapSize,n.spotShadow[_]=V,n.spotShadowMap[_]=B,M++}_++}else if(C.isRectAreaLight){const N=e.get(C);N.color.copy(T).multiplyScalar(F),N.halfWidth.set(C.width*.5,0,0),N.halfHeight.set(0,C.height*.5,0),n.rectArea[m]=N,m++}else if(C.isPointLight){const N=e.get(C);if(N.color.copy(C.color).multiplyScalar(C.intensity),N.distance=C.distance,N.decay=C.decay,C.castShadow){const q=C.shadow,V=t.get(C);V.shadowIntensity=q.intensity,V.shadowBias=q.bias,V.shadowNormalBias=q.normalBias,V.shadowRadius=q.radius,V.shadowMapSize=q.mapSize,V.shadowCameraNear=q.camera.near,V.shadowCameraFar=q.camera.far,n.pointShadow[g]=V,n.pointShadowMap[g]=B,n.pointShadowMatrix[g]=C.shadow.matrix,b++}n.point[g]=N,g++}else if(C.isHemisphereLight){const N=e.get(C);N.skyColor.copy(C.color).multiplyScalar(F),N.groundColor.copy(C.groundColor).multiplyScalar(F),n.hemi[p]=N,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=le.LTC_FLOAT_1,n.rectAreaLTC2=le.LTC_FLOAT_2):(n.rectAreaLTC1=le.LTC_HALF_1,n.rectAreaLTC2=le.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=f,n.ambient[2]=d;const I=n.hash;(I.directionalLength!==u||I.pointLength!==g||I.spotLength!==_||I.rectAreaLength!==m||I.hemiLength!==p||I.numDirectionalShadows!==E||I.numPointShadows!==b||I.numSpotShadows!==M||I.numSpotMaps!==R||I.numLightProbes!==L)&&(n.directional.length=u,n.spot.length=_,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=E,n.directionalShadowMap.length=E,n.pointShadow.length=b,n.pointShadowMap.length=b,n.spotShadow.length=M,n.spotShadowMap.length=M,n.directionalShadowMatrix.length=E,n.pointShadowMatrix.length=b,n.spotLightMatrix.length=M+R-w,n.spotLightMap.length=R,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=L,I.directionalLength=u,I.pointLength=g,I.spotLength=_,I.rectAreaLength=m,I.hemiLength=p,I.numDirectionalShadows=E,I.numPointShadows=b,I.numSpotShadows=M,I.numSpotMaps=R,I.numLightProbes=L,n.version=s_++)}function l(c,h){let f=0,d=0,u=0,g=0,_=0;const m=h.matrixWorldInverse;for(let p=0,E=c.length;p<E;p++){const b=c[p];if(b.isDirectionalLight){const M=n.directional[f];M.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(m),f++}else if(b.isSpotLight){const M=n.spot[u];M.position.setFromMatrixPosition(b.matrixWorld),M.position.applyMatrix4(m),M.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(m),u++}else if(b.isRectAreaLight){const M=n.rectArea[g];M.position.setFromMatrixPosition(b.matrixWorld),M.position.applyMatrix4(m),o.identity(),r.copy(b.matrixWorld),r.premultiply(m),o.extractRotation(r),M.halfWidth.set(b.width*.5,0,0),M.halfHeight.set(0,b.height*.5,0),M.halfWidth.applyMatrix4(o),M.halfHeight.applyMatrix4(o),g++}else if(b.isPointLight){const M=n.point[d];M.position.setFromMatrixPosition(b.matrixWorld),M.position.applyMatrix4(m),d++}else if(b.isHemisphereLight){const M=n.hemi[_];M.direction.setFromMatrixPosition(b.matrixWorld),M.direction.transformDirection(m),_++}}}return{setup:a,setupView:l,state:n}}function hh(i){const e=new o_(i),t=[],n=[];function s(h){c.camera=h,t.length=0,n.length=0}function r(h){t.push(h)}function o(h){n.push(h)}function a(){e.setup(t)}function l(h){e.setupView(t,h)}const c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:a,setupLightsView:l,pushLight:r,pushShadow:o}}function a_(i){let e=new WeakMap;function t(s,r=0){const o=e.get(s);let a;return o===void 0?(a=new hh(i),e.set(s,[a])):r>=o.length?(a=new hh(i),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const l_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,c_=`uniform sampler2D shadow_pass;
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
}`;function h_(i,e,t){let n=new Fl;const s=new Ae,r=new Ae,o=new ot,a=new Lf({depthPacking:Eu}),l=new If,c={},h=t.maxTextureSize,f={[_i]:jt,[jt]:_i,[rn]:rn},d=new Yt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ae},radius:{value:4}},vertexShader:l_,fragmentShader:c_}),u=d.clone();u.defines.HORIZONTAL_PASS=1;const g=new Ot;g.setAttribute("position",new an(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new re(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Oh;let p=this.type;this.render=function(w,L,I){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||w.length===0)return;const v=i.getRenderTarget(),y=i.getActiveCubeFace(),C=i.getActiveMipmapLevel(),T=i.state;T.setBlending(ei),T.buffers.depth.getReversed()===!0?T.buffers.color.setClear(0,0,0,0):T.buffers.color.setClear(1,1,1,1),T.buffers.depth.setTest(!0),T.setScissorTest(!1);const F=p!==jn&&this.type===jn,D=p===jn&&this.type!==jn;for(let B=0,N=w.length;B<N;B++){const q=w[B],V=q.shadow;if(V===void 0){console.warn("THREE.WebGLShadowMap:",q,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;s.copy(V.mapSize);const Z=V.getFrameExtents();if(s.multiply(Z),r.copy(V.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/Z.x),s.x=r.x*Z.x,V.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/Z.y),s.y=r.y*Z.y,V.mapSize.y=r.y)),V.map===null||F===!0||D===!0){const ce=this.type!==jn?{minFilter:on,magFilter:on}:{};V.map!==null&&V.map.dispose(),V.map=new An(s.x,s.y,ce),V.map.texture.name=q.name+".shadowMap",V.camera.updateProjectionMatrix()}i.setRenderTarget(V.map),i.clear();const ee=V.getViewportCount();for(let ce=0;ce<ee;ce++){const Ee=V.getViewport(ce);o.set(r.x*Ee.x,r.y*Ee.y,r.x*Ee.z,r.y*Ee.w),T.viewport(o),V.updateMatrices(q,ce),n=V.getFrustum(),M(L,I,V.camera,q,this.type)}V.isPointLightShadow!==!0&&this.type===jn&&E(V,I),V.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(v,y,C)};function E(w,L){const I=e.update(_);d.defines.VSM_SAMPLES!==w.blurSamples&&(d.defines.VSM_SAMPLES=w.blurSamples,u.defines.VSM_SAMPLES=w.blurSamples,d.needsUpdate=!0,u.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new An(s.x,s.y)),d.uniforms.shadow_pass.value=w.map.texture,d.uniforms.resolution.value=w.mapSize,d.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(L,null,I,d,_,null),u.uniforms.shadow_pass.value=w.mapPass.texture,u.uniforms.resolution.value=w.mapSize,u.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(L,null,I,u,_,null)}function b(w,L,I,v){let y=null;const C=I.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(C!==void 0)y=C;else if(y=I.isPointLight===!0?l:a,i.localClippingEnabled&&L.clipShadows===!0&&Array.isArray(L.clippingPlanes)&&L.clippingPlanes.length!==0||L.displacementMap&&L.displacementScale!==0||L.alphaMap&&L.alphaTest>0||L.map&&L.alphaTest>0||L.alphaToCoverage===!0){const T=y.uuid,F=L.uuid;let D=c[T];D===void 0&&(D={},c[T]=D);let B=D[F];B===void 0&&(B=y.clone(),D[F]=B,L.addEventListener("dispose",R)),y=B}if(y.visible=L.visible,y.wireframe=L.wireframe,v===jn?y.side=L.shadowSide!==null?L.shadowSide:L.side:y.side=L.shadowSide!==null?L.shadowSide:f[L.side],y.alphaMap=L.alphaMap,y.alphaTest=L.alphaToCoverage===!0?.5:L.alphaTest,y.map=L.map,y.clipShadows=L.clipShadows,y.clippingPlanes=L.clippingPlanes,y.clipIntersection=L.clipIntersection,y.displacementMap=L.displacementMap,y.displacementScale=L.displacementScale,y.displacementBias=L.displacementBias,y.wireframeLinewidth=L.wireframeLinewidth,y.linewidth=L.linewidth,I.isPointLight===!0&&y.isMeshDistanceMaterial===!0){const T=i.properties.get(y);T.light=I}return y}function M(w,L,I,v,y){if(w.visible===!1)return;if(w.layers.test(L.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&y===jn)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(I.matrixWorldInverse,w.matrixWorld);const F=e.update(w),D=w.material;if(Array.isArray(D)){const B=F.groups;for(let N=0,q=B.length;N<q;N++){const V=B[N],Z=D[V.materialIndex];if(Z&&Z.visible){const ee=b(w,Z,v,y);w.onBeforeShadow(i,w,L,I,F,ee,V),i.renderBufferDirect(I,null,F,ee,w,V),w.onAfterShadow(i,w,L,I,F,ee,V)}}}else if(D.visible){const B=b(w,D,v,y);w.onBeforeShadow(i,w,L,I,F,B,null),i.renderBufferDirect(I,null,F,B,w,null),w.onAfterShadow(i,w,L,I,F,B,null)}}const T=w.children;for(let F=0,D=T.length;F<D;F++)M(T[F],L,I,v,y)}function R(w){w.target.removeEventListener("dispose",R);for(const I in c){const v=c[I],y=w.target.uuid;y in v&&(v[y].dispose(),delete v[y])}}}const d_={[Ra]:Pa,[La]:Ua,[Ia]:Na,[xs]:Da,[Pa]:Ra,[Ua]:La,[Na]:Ia,[Da]:xs};function u_(i,e){function t(){let O=!1;const se=new ot;let ae=null;const _e=new ot(0,0,0,0);return{setMask:function(te){ae!==te&&!O&&(i.colorMask(te,te,te,te),ae=te)},setLocked:function(te){O=te},setClear:function(te,K,ye,Fe,ht){ht===!0&&(te*=Fe,K*=Fe,ye*=Fe),se.set(te,K,ye,Fe),_e.equals(se)===!1&&(i.clearColor(te,K,ye,Fe),_e.copy(se))},reset:function(){O=!1,ae=null,_e.set(-1,0,0,0)}}}function n(){let O=!1,se=!1,ae=null,_e=null,te=null;return{setReversed:function(K){if(se!==K){const ye=e.get("EXT_clip_control");K?ye.clipControlEXT(ye.LOWER_LEFT_EXT,ye.ZERO_TO_ONE_EXT):ye.clipControlEXT(ye.LOWER_LEFT_EXT,ye.NEGATIVE_ONE_TO_ONE_EXT),se=K;const Fe=te;te=null,this.setClear(Fe)}},getReversed:function(){return se},setTest:function(K){K?Y(i.DEPTH_TEST):de(i.DEPTH_TEST)},setMask:function(K){ae!==K&&!O&&(i.depthMask(K),ae=K)},setFunc:function(K){if(se&&(K=d_[K]),_e!==K){switch(K){case Ra:i.depthFunc(i.NEVER);break;case Pa:i.depthFunc(i.ALWAYS);break;case La:i.depthFunc(i.LESS);break;case xs:i.depthFunc(i.LEQUAL);break;case Ia:i.depthFunc(i.EQUAL);break;case Da:i.depthFunc(i.GEQUAL);break;case Ua:i.depthFunc(i.GREATER);break;case Na:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}_e=K}},setLocked:function(K){O=K},setClear:function(K){te!==K&&(se&&(K=1-K),i.clearDepth(K),te=K)},reset:function(){O=!1,ae=null,_e=null,te=null,se=!1}}}function s(){let O=!1,se=null,ae=null,_e=null,te=null,K=null,ye=null,Fe=null,ht=null;return{setTest:function(tt){O||(tt?Y(i.STENCIL_TEST):de(i.STENCIL_TEST))},setMask:function(tt){se!==tt&&!O&&(i.stencilMask(tt),se=tt)},setFunc:function(tt,Gn,Pn){(ae!==tt||_e!==Gn||te!==Pn)&&(i.stencilFunc(tt,Gn,Pn),ae=tt,_e=Gn,te=Pn)},setOp:function(tt,Gn,Pn){(K!==tt||ye!==Gn||Fe!==Pn)&&(i.stencilOp(tt,Gn,Pn),K=tt,ye=Gn,Fe=Pn)},setLocked:function(tt){O=tt},setClear:function(tt){ht!==tt&&(i.clearStencil(tt),ht=tt)},reset:function(){O=!1,se=null,ae=null,_e=null,te=null,K=null,ye=null,Fe=null,ht=null}}}const r=new t,o=new n,a=new s,l=new WeakMap,c=new WeakMap;let h={},f={},d=new WeakMap,u=[],g=null,_=!1,m=null,p=null,E=null,b=null,M=null,R=null,w=null,L=new Oe(0,0,0),I=0,v=!1,y=null,C=null,T=null,F=null,D=null;const B=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let N=!1,q=0;const V=i.getParameter(i.VERSION);V.indexOf("WebGL")!==-1?(q=parseFloat(/^WebGL (\d)/.exec(V)[1]),N=q>=1):V.indexOf("OpenGL ES")!==-1&&(q=parseFloat(/^OpenGL ES (\d)/.exec(V)[1]),N=q>=2);let Z=null,ee={};const ce=i.getParameter(i.SCISSOR_BOX),Ee=i.getParameter(i.VIEWPORT),He=new ot().fromArray(ce),Qe=new ot().fromArray(Ee);function Q(O,se,ae,_e){const te=new Uint8Array(4),K=i.createTexture();i.bindTexture(O,K),i.texParameteri(O,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(O,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let ye=0;ye<ae;ye++)O===i.TEXTURE_3D||O===i.TEXTURE_2D_ARRAY?i.texImage3D(se,0,i.RGBA,1,1,_e,0,i.RGBA,i.UNSIGNED_BYTE,te):i.texImage2D(se+ye,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,te);return K}const z={};z[i.TEXTURE_2D]=Q(i.TEXTURE_2D,i.TEXTURE_2D,1),z[i.TEXTURE_CUBE_MAP]=Q(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),z[i.TEXTURE_2D_ARRAY]=Q(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),z[i.TEXTURE_3D]=Q(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),Y(i.DEPTH_TEST),o.setFunc(xs),Ue(!1),Me(rc),Y(i.CULL_FACE),ft(ei);function Y(O){h[O]!==!0&&(i.enable(O),h[O]=!0)}function de(O){h[O]!==!1&&(i.disable(O),h[O]=!1)}function Re(O,se){return f[O]!==se?(i.bindFramebuffer(O,se),f[O]=se,O===i.DRAW_FRAMEBUFFER&&(f[i.FRAMEBUFFER]=se),O===i.FRAMEBUFFER&&(f[i.DRAW_FRAMEBUFFER]=se),!0):!1}function xe(O,se){let ae=u,_e=!1;if(O){ae=d.get(se),ae===void 0&&(ae=[],d.set(se,ae));const te=O.textures;if(ae.length!==te.length||ae[0]!==i.COLOR_ATTACHMENT0){for(let K=0,ye=te.length;K<ye;K++)ae[K]=i.COLOR_ATTACHMENT0+K;ae.length=te.length,_e=!0}}else ae[0]!==i.BACK&&(ae[0]=i.BACK,_e=!0);_e&&i.drawBuffers(ae)}function Be(O){return g!==O?(i.useProgram(O),g=O,!0):!1}const Et={[Pi]:i.FUNC_ADD,[Kd]:i.FUNC_SUBTRACT,[Zd]:i.FUNC_REVERSE_SUBTRACT};Et[Jd]=i.MIN,Et[Qd]=i.MAX;const P={[eu]:i.ZERO,[tu]:i.ONE,[nu]:i.SRC_COLOR,[Aa]:i.SRC_ALPHA,[lu]:i.SRC_ALPHA_SATURATE,[ou]:i.DST_COLOR,[su]:i.DST_ALPHA,[iu]:i.ONE_MINUS_SRC_COLOR,[Ca]:i.ONE_MINUS_SRC_ALPHA,[au]:i.ONE_MINUS_DST_COLOR,[ru]:i.ONE_MINUS_DST_ALPHA,[cu]:i.CONSTANT_COLOR,[hu]:i.ONE_MINUS_CONSTANT_COLOR,[du]:i.CONSTANT_ALPHA,[uu]:i.ONE_MINUS_CONSTANT_ALPHA};function ft(O,se,ae,_e,te,K,ye,Fe,ht,tt){if(O===ei){_===!0&&(de(i.BLEND),_=!1);return}if(_===!1&&(Y(i.BLEND),_=!0),O!==jd){if(O!==m||tt!==v){if((p!==Pi||M!==Pi)&&(i.blendEquation(i.FUNC_ADD),p=Pi,M=Pi),tt)switch(O){case gs:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case wa:i.blendFunc(i.ONE,i.ONE);break;case oc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case ac:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",O);break}else switch(O){case gs:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case wa:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case oc:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case ac:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",O);break}E=null,b=null,R=null,w=null,L.set(0,0,0),I=0,m=O,v=tt}return}te=te||se,K=K||ae,ye=ye||_e,(se!==p||te!==M)&&(i.blendEquationSeparate(Et[se],Et[te]),p=se,M=te),(ae!==E||_e!==b||K!==R||ye!==w)&&(i.blendFuncSeparate(P[ae],P[_e],P[K],P[ye]),E=ae,b=_e,R=K,w=ye),(Fe.equals(L)===!1||ht!==I)&&(i.blendColor(Fe.r,Fe.g,Fe.b,ht),L.copy(Fe),I=ht),m=O,v=!1}function ke(O,se){O.side===rn?de(i.CULL_FACE):Y(i.CULL_FACE);let ae=O.side===jt;se&&(ae=!ae),Ue(ae),O.blending===gs&&O.transparent===!1?ft(ei):ft(O.blending,O.blendEquation,O.blendSrc,O.blendDst,O.blendEquationAlpha,O.blendSrcAlpha,O.blendDstAlpha,O.blendColor,O.blendAlpha,O.premultipliedAlpha),o.setFunc(O.depthFunc),o.setTest(O.depthTest),o.setMask(O.depthWrite),r.setMask(O.colorWrite);const _e=O.stencilWrite;a.setTest(_e),_e&&(a.setMask(O.stencilWriteMask),a.setFunc(O.stencilFunc,O.stencilRef,O.stencilFuncMask),a.setOp(O.stencilFail,O.stencilZFail,O.stencilZPass)),Se(O.polygonOffset,O.polygonOffsetFactor,O.polygonOffsetUnits),O.alphaToCoverage===!0?Y(i.SAMPLE_ALPHA_TO_COVERAGE):de(i.SAMPLE_ALPHA_TO_COVERAGE)}function Ue(O){y!==O&&(O?i.frontFace(i.CW):i.frontFace(i.CCW),y=O)}function Me(O){O!==$d?(Y(i.CULL_FACE),O!==C&&(O===rc?i.cullFace(i.BACK):O===Yd?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):de(i.CULL_FACE),C=O}function pt(O){O!==T&&(N&&i.lineWidth(O),T=O)}function Se(O,se,ae){O?(Y(i.POLYGON_OFFSET_FILL),(F!==se||D!==ae)&&(i.polygonOffset(se,ae),F=se,D=ae)):de(i.POLYGON_OFFSET_FILL)}function Xe(O){O?Y(i.SCISSOR_TEST):de(i.SCISSOR_TEST)}function It(O){O===void 0&&(O=i.TEXTURE0+B-1),Z!==O&&(i.activeTexture(O),Z=O)}function Mt(O,se,ae){ae===void 0&&(Z===null?ae=i.TEXTURE0+B-1:ae=Z);let _e=ee[ae];_e===void 0&&(_e={type:void 0,texture:void 0},ee[ae]=_e),(_e.type!==O||_e.texture!==se)&&(Z!==ae&&(i.activeTexture(ae),Z=ae),i.bindTexture(O,se||z[O]),_e.type=O,_e.texture=se)}function A(){const O=ee[Z];O!==void 0&&O.type!==void 0&&(i.bindTexture(O.type,null),O.type=void 0,O.texture=void 0)}function x(){try{i.compressedTexImage2D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function G(){try{i.compressedTexImage3D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function j(){try{i.texSubImage2D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function J(){try{i.texSubImage3D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function $(){try{i.compressedTexSubImage2D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function Ce(){try{i.compressedTexSubImage3D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function oe(){try{i.texStorage2D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function be(){try{i.texStorage3D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function Te(){try{i.texImage2D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function ie(){try{i.texImage3D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function fe(O){He.equals(O)===!1&&(i.scissor(O.x,O.y,O.z,O.w),He.copy(O))}function De(O){Qe.equals(O)===!1&&(i.viewport(O.x,O.y,O.z,O.w),Qe.copy(O))}function we(O,se){let ae=c.get(se);ae===void 0&&(ae=new WeakMap,c.set(se,ae));let _e=ae.get(O);_e===void 0&&(_e=i.getUniformBlockIndex(se,O.name),ae.set(O,_e))}function he(O,se){const _e=c.get(se).get(O);l.get(se)!==_e&&(i.uniformBlockBinding(se,_e,O.__bindingPointIndex),l.set(se,_e))}function ze(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),h={},Z=null,ee={},f={},d=new WeakMap,u=[],g=null,_=!1,m=null,p=null,E=null,b=null,M=null,R=null,w=null,L=new Oe(0,0,0),I=0,v=!1,y=null,C=null,T=null,F=null,D=null,He.set(0,0,i.canvas.width,i.canvas.height),Qe.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:Y,disable:de,bindFramebuffer:Re,drawBuffers:xe,useProgram:Be,setBlending:ft,setMaterial:ke,setFlipSided:Ue,setCullFace:Me,setLineWidth:pt,setPolygonOffset:Se,setScissorTest:Xe,activeTexture:It,bindTexture:Mt,unbindTexture:A,compressedTexImage2D:x,compressedTexImage3D:G,texImage2D:Te,texImage3D:ie,updateUBOMapping:we,uniformBlockBinding:he,texStorage2D:oe,texStorage3D:be,texSubImage2D:j,texSubImage3D:J,compressedTexSubImage2D:$,compressedTexSubImage3D:Ce,scissor:fe,viewport:De,reset:ze}}function f_(i,e,t,n,s,r,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Ae,h=new WeakMap;let f;const d=new WeakMap;let u=!1;try{u=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(A,x){return u?new OffscreenCanvas(A,x):fo("canvas")}function _(A,x,G){let j=1;const J=Mt(A);if((J.width>G||J.height>G)&&(j=G/Math.max(J.width,J.height)),j<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){const $=Math.floor(j*J.width),Ce=Math.floor(j*J.height);f===void 0&&(f=g($,Ce));const oe=x?g($,Ce):f;return oe.width=$,oe.height=Ce,oe.getContext("2d").drawImage(A,0,0,$,Ce),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+J.width+"x"+J.height+") to ("+$+"x"+Ce+")."),oe}else return"data"in A&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+J.width+"x"+J.height+")."),A;return A}function m(A){return A.generateMipmaps}function p(A){i.generateMipmap(A)}function E(A){return A.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?i.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function b(A,x,G,j,J=!1){if(A!==null){if(i[A]!==void 0)return i[A];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let $=x;if(x===i.RED&&(G===i.FLOAT&&($=i.R32F),G===i.HALF_FLOAT&&($=i.R16F),G===i.UNSIGNED_BYTE&&($=i.R8)),x===i.RED_INTEGER&&(G===i.UNSIGNED_BYTE&&($=i.R8UI),G===i.UNSIGNED_SHORT&&($=i.R16UI),G===i.UNSIGNED_INT&&($=i.R32UI),G===i.BYTE&&($=i.R8I),G===i.SHORT&&($=i.R16I),G===i.INT&&($=i.R32I)),x===i.RG&&(G===i.FLOAT&&($=i.RG32F),G===i.HALF_FLOAT&&($=i.RG16F),G===i.UNSIGNED_BYTE&&($=i.RG8)),x===i.RG_INTEGER&&(G===i.UNSIGNED_BYTE&&($=i.RG8UI),G===i.UNSIGNED_SHORT&&($=i.RG16UI),G===i.UNSIGNED_INT&&($=i.RG32UI),G===i.BYTE&&($=i.RG8I),G===i.SHORT&&($=i.RG16I),G===i.INT&&($=i.RG32I)),x===i.RGB_INTEGER&&(G===i.UNSIGNED_BYTE&&($=i.RGB8UI),G===i.UNSIGNED_SHORT&&($=i.RGB16UI),G===i.UNSIGNED_INT&&($=i.RGB32UI),G===i.BYTE&&($=i.RGB8I),G===i.SHORT&&($=i.RGB16I),G===i.INT&&($=i.RGB32I)),x===i.RGBA_INTEGER&&(G===i.UNSIGNED_BYTE&&($=i.RGBA8UI),G===i.UNSIGNED_SHORT&&($=i.RGBA16UI),G===i.UNSIGNED_INT&&($=i.RGBA32UI),G===i.BYTE&&($=i.RGBA8I),G===i.SHORT&&($=i.RGBA16I),G===i.INT&&($=i.RGBA32I)),x===i.RGB&&(G===i.UNSIGNED_INT_5_9_9_9_REV&&($=i.RGB9_E5),G===i.UNSIGNED_INT_10F_11F_11F_REV&&($=i.R11F_G11F_B10F)),x===i.RGBA){const Ce=J?ho:Ze.getTransfer(j);G===i.FLOAT&&($=i.RGBA32F),G===i.HALF_FLOAT&&($=i.RGBA16F),G===i.UNSIGNED_BYTE&&($=Ce===rt?i.SRGB8_ALPHA8:i.RGBA8),G===i.UNSIGNED_SHORT_4_4_4_4&&($=i.RGBA4),G===i.UNSIGNED_SHORT_5_5_5_1&&($=i.RGB5_A1)}return($===i.R16F||$===i.R32F||$===i.RG16F||$===i.RG32F||$===i.RGBA16F||$===i.RGBA32F)&&e.get("EXT_color_buffer_float"),$}function M(A,x){let G;return A?x===null||x===Bi||x===Js?G=i.DEPTH24_STENCIL8:x===Bn?G=i.DEPTH32F_STENCIL8:x===Zs&&(G=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===Bi||x===Js?G=i.DEPTH_COMPONENT24:x===Bn?G=i.DEPTH_COMPONENT32F:x===Zs&&(G=i.DEPTH_COMPONENT16),G}function R(A,x){return m(A)===!0||A.isFramebufferTexture&&A.minFilter!==on&&A.minFilter!==bn?Math.log2(Math.max(x.width,x.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?x.mipmaps.length:1}function w(A){const x=A.target;x.removeEventListener("dispose",w),I(x),x.isVideoTexture&&h.delete(x)}function L(A){const x=A.target;x.removeEventListener("dispose",L),y(x)}function I(A){const x=n.get(A);if(x.__webglInit===void 0)return;const G=A.source,j=d.get(G);if(j){const J=j[x.__cacheKey];J.usedTimes--,J.usedTimes===0&&v(A),Object.keys(j).length===0&&d.delete(G)}n.remove(A)}function v(A){const x=n.get(A);i.deleteTexture(x.__webglTexture);const G=A.source,j=d.get(G);delete j[x.__cacheKey],o.memory.textures--}function y(A){const x=n.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),n.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let j=0;j<6;j++){if(Array.isArray(x.__webglFramebuffer[j]))for(let J=0;J<x.__webglFramebuffer[j].length;J++)i.deleteFramebuffer(x.__webglFramebuffer[j][J]);else i.deleteFramebuffer(x.__webglFramebuffer[j]);x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer[j])}else{if(Array.isArray(x.__webglFramebuffer))for(let j=0;j<x.__webglFramebuffer.length;j++)i.deleteFramebuffer(x.__webglFramebuffer[j]);else i.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&i.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let j=0;j<x.__webglColorRenderbuffer.length;j++)x.__webglColorRenderbuffer[j]&&i.deleteRenderbuffer(x.__webglColorRenderbuffer[j]);x.__webglDepthRenderbuffer&&i.deleteRenderbuffer(x.__webglDepthRenderbuffer)}const G=A.textures;for(let j=0,J=G.length;j<J;j++){const $=n.get(G[j]);$.__webglTexture&&(i.deleteTexture($.__webglTexture),o.memory.textures--),n.remove(G[j])}n.remove(A)}let C=0;function T(){C=0}function F(){const A=C;return A>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+s.maxTextures),C+=1,A}function D(A){const x=[];return x.push(A.wrapS),x.push(A.wrapT),x.push(A.wrapR||0),x.push(A.magFilter),x.push(A.minFilter),x.push(A.anisotropy),x.push(A.internalFormat),x.push(A.format),x.push(A.type),x.push(A.generateMipmaps),x.push(A.premultiplyAlpha),x.push(A.flipY),x.push(A.unpackAlignment),x.push(A.colorSpace),x.join()}function B(A,x){const G=n.get(A);if(A.isVideoTexture&&Xe(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&G.__version!==A.version){const j=A.image;if(j===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(j.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{z(G,A,x);return}}else A.isExternalTexture&&(G.__webglTexture=A.sourceTexture?A.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,G.__webglTexture,i.TEXTURE0+x)}function N(A,x){const G=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&G.__version!==A.version){z(G,A,x);return}t.bindTexture(i.TEXTURE_2D_ARRAY,G.__webglTexture,i.TEXTURE0+x)}function q(A,x){const G=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&G.__version!==A.version){z(G,A,x);return}t.bindTexture(i.TEXTURE_3D,G.__webglTexture,i.TEXTURE0+x)}function V(A,x){const G=n.get(A);if(A.version>0&&G.__version!==A.version){Y(G,A,x);return}t.bindTexture(i.TEXTURE_CUBE_MAP,G.__webglTexture,i.TEXTURE0+x)}const Z={[Ba]:i.REPEAT,[Ui]:i.CLAMP_TO_EDGE,[ka]:i.MIRRORED_REPEAT},ee={[on]:i.NEAREST,[Mu]:i.NEAREST_MIPMAP_NEAREST,[gr]:i.NEAREST_MIPMAP_LINEAR,[bn]:i.LINEAR,[Uo]:i.LINEAR_MIPMAP_NEAREST,[Ni]:i.LINEAR_MIPMAP_LINEAR},ce={[Tu]:i.NEVER,[Lu]:i.ALWAYS,[wu]:i.LESS,[jh]:i.LEQUAL,[Au]:i.EQUAL,[Pu]:i.GEQUAL,[Cu]:i.GREATER,[Ru]:i.NOTEQUAL};function Ee(A,x){if(x.type===Bn&&e.has("OES_texture_float_linear")===!1&&(x.magFilter===bn||x.magFilter===Uo||x.magFilter===gr||x.magFilter===Ni||x.minFilter===bn||x.minFilter===Uo||x.minFilter===gr||x.minFilter===Ni)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(A,i.TEXTURE_WRAP_S,Z[x.wrapS]),i.texParameteri(A,i.TEXTURE_WRAP_T,Z[x.wrapT]),(A===i.TEXTURE_3D||A===i.TEXTURE_2D_ARRAY)&&i.texParameteri(A,i.TEXTURE_WRAP_R,Z[x.wrapR]),i.texParameteri(A,i.TEXTURE_MAG_FILTER,ee[x.magFilter]),i.texParameteri(A,i.TEXTURE_MIN_FILTER,ee[x.minFilter]),x.compareFunction&&(i.texParameteri(A,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(A,i.TEXTURE_COMPARE_FUNC,ce[x.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===on||x.minFilter!==gr&&x.minFilter!==Ni||x.type===Bn&&e.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||n.get(x).__currentAnisotropy){const G=e.get("EXT_texture_filter_anisotropic");i.texParameterf(A,G.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,s.getMaxAnisotropy())),n.get(x).__currentAnisotropy=x.anisotropy}}}function He(A,x){let G=!1;A.__webglInit===void 0&&(A.__webglInit=!0,x.addEventListener("dispose",w));const j=x.source;let J=d.get(j);J===void 0&&(J={},d.set(j,J));const $=D(x);if($!==A.__cacheKey){J[$]===void 0&&(J[$]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,G=!0),J[$].usedTimes++;const Ce=J[A.__cacheKey];Ce!==void 0&&(J[A.__cacheKey].usedTimes--,Ce.usedTimes===0&&v(x)),A.__cacheKey=$,A.__webglTexture=J[$].texture}return G}function Qe(A,x,G){return Math.floor(Math.floor(A/G)/x)}function Q(A,x,G,j){const $=A.updateRanges;if($.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,x.width,x.height,G,j,x.data);else{$.sort((ie,fe)=>ie.start-fe.start);let Ce=0;for(let ie=1;ie<$.length;ie++){const fe=$[Ce],De=$[ie],we=fe.start+fe.count,he=Qe(De.start,x.width,4),ze=Qe(fe.start,x.width,4);De.start<=we+1&&he===ze&&Qe(De.start+De.count-1,x.width,4)===he?fe.count=Math.max(fe.count,De.start+De.count-fe.start):(++Ce,$[Ce]=De)}$.length=Ce+1;const oe=i.getParameter(i.UNPACK_ROW_LENGTH),be=i.getParameter(i.UNPACK_SKIP_PIXELS),Te=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,x.width);for(let ie=0,fe=$.length;ie<fe;ie++){const De=$[ie],we=Math.floor(De.start/4),he=Math.ceil(De.count/4),ze=we%x.width,O=Math.floor(we/x.width),se=he,ae=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,ze),i.pixelStorei(i.UNPACK_SKIP_ROWS,O),t.texSubImage2D(i.TEXTURE_2D,0,ze,O,se,ae,G,j,x.data)}A.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,oe),i.pixelStorei(i.UNPACK_SKIP_PIXELS,be),i.pixelStorei(i.UNPACK_SKIP_ROWS,Te)}}function z(A,x,G){let j=i.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(j=i.TEXTURE_2D_ARRAY),x.isData3DTexture&&(j=i.TEXTURE_3D);const J=He(A,x),$=x.source;t.bindTexture(j,A.__webglTexture,i.TEXTURE0+G);const Ce=n.get($);if($.version!==Ce.__version||J===!0){t.activeTexture(i.TEXTURE0+G);const oe=Ze.getPrimaries(Ze.workingColorSpace),be=x.colorSpace===pi?null:Ze.getPrimaries(x.colorSpace),Te=x.colorSpace===pi||oe===be?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Te);let ie=_(x.image,!1,s.maxTextureSize);ie=It(x,ie);const fe=r.convert(x.format,x.colorSpace),De=r.convert(x.type);let we=b(x.internalFormat,fe,De,x.colorSpace,x.isVideoTexture);Ee(j,x);let he;const ze=x.mipmaps,O=x.isVideoTexture!==!0,se=Ce.__version===void 0||J===!0,ae=$.dataReady,_e=R(x,ie);if(x.isDepthTexture)we=M(x.format===er,x.type),se&&(O?t.texStorage2D(i.TEXTURE_2D,1,we,ie.width,ie.height):t.texImage2D(i.TEXTURE_2D,0,we,ie.width,ie.height,0,fe,De,null));else if(x.isDataTexture)if(ze.length>0){O&&se&&t.texStorage2D(i.TEXTURE_2D,_e,we,ze[0].width,ze[0].height);for(let te=0,K=ze.length;te<K;te++)he=ze[te],O?ae&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,he.width,he.height,fe,De,he.data):t.texImage2D(i.TEXTURE_2D,te,we,he.width,he.height,0,fe,De,he.data);x.generateMipmaps=!1}else O?(se&&t.texStorage2D(i.TEXTURE_2D,_e,we,ie.width,ie.height),ae&&Q(x,ie,fe,De)):t.texImage2D(i.TEXTURE_2D,0,we,ie.width,ie.height,0,fe,De,ie.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){O&&se&&t.texStorage3D(i.TEXTURE_2D_ARRAY,_e,we,ze[0].width,ze[0].height,ie.depth);for(let te=0,K=ze.length;te<K;te++)if(he=ze[te],x.format!==Tn)if(fe!==null)if(O){if(ae)if(x.layerUpdates.size>0){const ye=Hc(he.width,he.height,x.format,x.type);for(const Fe of x.layerUpdates){const ht=he.data.subarray(Fe*ye/he.data.BYTES_PER_ELEMENT,(Fe+1)*ye/he.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,Fe,he.width,he.height,1,fe,ht)}x.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,he.width,he.height,ie.depth,fe,he.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,te,we,he.width,he.height,ie.depth,0,he.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else O?ae&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,he.width,he.height,ie.depth,fe,De,he.data):t.texImage3D(i.TEXTURE_2D_ARRAY,te,we,he.width,he.height,ie.depth,0,fe,De,he.data)}else{O&&se&&t.texStorage2D(i.TEXTURE_2D,_e,we,ze[0].width,ze[0].height);for(let te=0,K=ze.length;te<K;te++)he=ze[te],x.format!==Tn?fe!==null?O?ae&&t.compressedTexSubImage2D(i.TEXTURE_2D,te,0,0,he.width,he.height,fe,he.data):t.compressedTexImage2D(i.TEXTURE_2D,te,we,he.width,he.height,0,he.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):O?ae&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,he.width,he.height,fe,De,he.data):t.texImage2D(i.TEXTURE_2D,te,we,he.width,he.height,0,fe,De,he.data)}else if(x.isDataArrayTexture)if(O){if(se&&t.texStorage3D(i.TEXTURE_2D_ARRAY,_e,we,ie.width,ie.height,ie.depth),ae)if(x.layerUpdates.size>0){const te=Hc(ie.width,ie.height,x.format,x.type);for(const K of x.layerUpdates){const ye=ie.data.subarray(K*te/ie.data.BYTES_PER_ELEMENT,(K+1)*te/ie.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,K,ie.width,ie.height,1,fe,De,ye)}x.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ie.width,ie.height,ie.depth,fe,De,ie.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,we,ie.width,ie.height,ie.depth,0,fe,De,ie.data);else if(x.isData3DTexture)O?(se&&t.texStorage3D(i.TEXTURE_3D,_e,we,ie.width,ie.height,ie.depth),ae&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ie.width,ie.height,ie.depth,fe,De,ie.data)):t.texImage3D(i.TEXTURE_3D,0,we,ie.width,ie.height,ie.depth,0,fe,De,ie.data);else if(x.isFramebufferTexture){if(se)if(O)t.texStorage2D(i.TEXTURE_2D,_e,we,ie.width,ie.height);else{let te=ie.width,K=ie.height;for(let ye=0;ye<_e;ye++)t.texImage2D(i.TEXTURE_2D,ye,we,te,K,0,fe,De,null),te>>=1,K>>=1}}else if(ze.length>0){if(O&&se){const te=Mt(ze[0]);t.texStorage2D(i.TEXTURE_2D,_e,we,te.width,te.height)}for(let te=0,K=ze.length;te<K;te++)he=ze[te],O?ae&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,fe,De,he):t.texImage2D(i.TEXTURE_2D,te,we,fe,De,he);x.generateMipmaps=!1}else if(O){if(se){const te=Mt(ie);t.texStorage2D(i.TEXTURE_2D,_e,we,te.width,te.height)}ae&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,fe,De,ie)}else t.texImage2D(i.TEXTURE_2D,0,we,fe,De,ie);m(x)&&p(j),Ce.__version=$.version,x.onUpdate&&x.onUpdate(x)}A.__version=x.version}function Y(A,x,G){if(x.image.length!==6)return;const j=He(A,x),J=x.source;t.bindTexture(i.TEXTURE_CUBE_MAP,A.__webglTexture,i.TEXTURE0+G);const $=n.get(J);if(J.version!==$.__version||j===!0){t.activeTexture(i.TEXTURE0+G);const Ce=Ze.getPrimaries(Ze.workingColorSpace),oe=x.colorSpace===pi?null:Ze.getPrimaries(x.colorSpace),be=x.colorSpace===pi||Ce===oe?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,be);const Te=x.isCompressedTexture||x.image[0].isCompressedTexture,ie=x.image[0]&&x.image[0].isDataTexture,fe=[];for(let K=0;K<6;K++)!Te&&!ie?fe[K]=_(x.image[K],!0,s.maxCubemapSize):fe[K]=ie?x.image[K].image:x.image[K],fe[K]=It(x,fe[K]);const De=fe[0],we=r.convert(x.format,x.colorSpace),he=r.convert(x.type),ze=b(x.internalFormat,we,he,x.colorSpace),O=x.isVideoTexture!==!0,se=$.__version===void 0||j===!0,ae=J.dataReady;let _e=R(x,De);Ee(i.TEXTURE_CUBE_MAP,x);let te;if(Te){O&&se&&t.texStorage2D(i.TEXTURE_CUBE_MAP,_e,ze,De.width,De.height);for(let K=0;K<6;K++){te=fe[K].mipmaps;for(let ye=0;ye<te.length;ye++){const Fe=te[ye];x.format!==Tn?we!==null?O?ae&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye,0,0,Fe.width,Fe.height,we,Fe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye,ze,Fe.width,Fe.height,0,Fe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):O?ae&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye,0,0,Fe.width,Fe.height,we,he,Fe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye,ze,Fe.width,Fe.height,0,we,he,Fe.data)}}}else{if(te=x.mipmaps,O&&se){te.length>0&&_e++;const K=Mt(fe[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,_e,ze,K.width,K.height)}for(let K=0;K<6;K++)if(ie){O?ae&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,0,0,fe[K].width,fe[K].height,we,he,fe[K].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,ze,fe[K].width,fe[K].height,0,we,he,fe[K].data);for(let ye=0;ye<te.length;ye++){const ht=te[ye].image[K].image;O?ae&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye+1,0,0,ht.width,ht.height,we,he,ht.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye+1,ze,ht.width,ht.height,0,we,he,ht.data)}}else{O?ae&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,0,0,we,he,fe[K]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,ze,we,he,fe[K]);for(let ye=0;ye<te.length;ye++){const Fe=te[ye];O?ae&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye+1,0,0,we,he,Fe.image[K]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ye+1,ze,we,he,Fe.image[K])}}}m(x)&&p(i.TEXTURE_CUBE_MAP),$.__version=J.version,x.onUpdate&&x.onUpdate(x)}A.__version=x.version}function de(A,x,G,j,J,$){const Ce=r.convert(G.format,G.colorSpace),oe=r.convert(G.type),be=b(G.internalFormat,Ce,oe,G.colorSpace),Te=n.get(x),ie=n.get(G);if(ie.__renderTarget=x,!Te.__hasExternalTextures){const fe=Math.max(1,x.width>>$),De=Math.max(1,x.height>>$);J===i.TEXTURE_3D||J===i.TEXTURE_2D_ARRAY?t.texImage3D(J,$,be,fe,De,x.depth,0,Ce,oe,null):t.texImage2D(J,$,be,fe,De,0,Ce,oe,null)}t.bindFramebuffer(i.FRAMEBUFFER,A),Se(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,j,J,ie.__webglTexture,0,pt(x)):(J===i.TEXTURE_2D||J>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&J<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,j,J,ie.__webglTexture,$),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Re(A,x,G){if(i.bindRenderbuffer(i.RENDERBUFFER,A),x.depthBuffer){const j=x.depthTexture,J=j&&j.isDepthTexture?j.type:null,$=M(x.stencilBuffer,J),Ce=x.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,oe=pt(x);Se(x)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,oe,$,x.width,x.height):G?i.renderbufferStorageMultisample(i.RENDERBUFFER,oe,$,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,$,x.width,x.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Ce,i.RENDERBUFFER,A)}else{const j=x.textures;for(let J=0;J<j.length;J++){const $=j[J],Ce=r.convert($.format,$.colorSpace),oe=r.convert($.type),be=b($.internalFormat,Ce,oe,$.colorSpace),Te=pt(x);G&&Se(x)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Te,be,x.width,x.height):Se(x)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Te,be,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,be,x.width,x.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function xe(A,x){if(x&&x.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,A),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const j=n.get(x.depthTexture);j.__renderTarget=x,(!j.__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),B(x.depthTexture,0);const J=j.__webglTexture,$=pt(x);if(x.depthTexture.format===Qs)Se(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,J,0,$):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,J,0);else if(x.depthTexture.format===er)Se(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,J,0,$):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,J,0);else throw new Error("Unknown depthTexture format")}function Be(A){const x=n.get(A),G=A.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==A.depthTexture){const j=A.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),j){const J=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,j.removeEventListener("dispose",J)};j.addEventListener("dispose",J),x.__depthDisposeCallback=J}x.__boundDepthTexture=j}if(A.depthTexture&&!x.__autoAllocateDepthBuffer){if(G)throw new Error("target.depthTexture not supported in Cube render targets");const j=A.texture.mipmaps;j&&j.length>0?xe(x.__webglFramebuffer[0],A):xe(x.__webglFramebuffer,A)}else if(G){x.__webglDepthbuffer=[];for(let j=0;j<6;j++)if(t.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[j]),x.__webglDepthbuffer[j]===void 0)x.__webglDepthbuffer[j]=i.createRenderbuffer(),Re(x.__webglDepthbuffer[j],A,!1);else{const J=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,$=x.__webglDepthbuffer[j];i.bindRenderbuffer(i.RENDERBUFFER,$),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,$)}}else{const j=A.texture.mipmaps;if(j&&j.length>0?t.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=i.createRenderbuffer(),Re(x.__webglDepthbuffer,A,!1);else{const J=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,$=x.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,$),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,$)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function Et(A,x,G){const j=n.get(A);x!==void 0&&de(j.__webglFramebuffer,A,A.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),G!==void 0&&Be(A)}function P(A){const x=A.texture,G=n.get(A),j=n.get(x);A.addEventListener("dispose",L);const J=A.textures,$=A.isWebGLCubeRenderTarget===!0,Ce=J.length>1;if(Ce||(j.__webglTexture===void 0&&(j.__webglTexture=i.createTexture()),j.__version=x.version,o.memory.textures++),$){G.__webglFramebuffer=[];for(let oe=0;oe<6;oe++)if(x.mipmaps&&x.mipmaps.length>0){G.__webglFramebuffer[oe]=[];for(let be=0;be<x.mipmaps.length;be++)G.__webglFramebuffer[oe][be]=i.createFramebuffer()}else G.__webglFramebuffer[oe]=i.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){G.__webglFramebuffer=[];for(let oe=0;oe<x.mipmaps.length;oe++)G.__webglFramebuffer[oe]=i.createFramebuffer()}else G.__webglFramebuffer=i.createFramebuffer();if(Ce)for(let oe=0,be=J.length;oe<be;oe++){const Te=n.get(J[oe]);Te.__webglTexture===void 0&&(Te.__webglTexture=i.createTexture(),o.memory.textures++)}if(A.samples>0&&Se(A)===!1){G.__webglMultisampledFramebuffer=i.createFramebuffer(),G.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,G.__webglMultisampledFramebuffer);for(let oe=0;oe<J.length;oe++){const be=J[oe];G.__webglColorRenderbuffer[oe]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,G.__webglColorRenderbuffer[oe]);const Te=r.convert(be.format,be.colorSpace),ie=r.convert(be.type),fe=b(be.internalFormat,Te,ie,be.colorSpace,A.isXRRenderTarget===!0),De=pt(A);i.renderbufferStorageMultisample(i.RENDERBUFFER,De,fe,A.width,A.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+oe,i.RENDERBUFFER,G.__webglColorRenderbuffer[oe])}i.bindRenderbuffer(i.RENDERBUFFER,null),A.depthBuffer&&(G.__webglDepthRenderbuffer=i.createRenderbuffer(),Re(G.__webglDepthRenderbuffer,A,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if($){t.bindTexture(i.TEXTURE_CUBE_MAP,j.__webglTexture),Ee(i.TEXTURE_CUBE_MAP,x);for(let oe=0;oe<6;oe++)if(x.mipmaps&&x.mipmaps.length>0)for(let be=0;be<x.mipmaps.length;be++)de(G.__webglFramebuffer[oe][be],A,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+oe,be);else de(G.__webglFramebuffer[oe],A,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0);m(x)&&p(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ce){for(let oe=0,be=J.length;oe<be;oe++){const Te=J[oe],ie=n.get(Te);let fe=i.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(fe=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(fe,ie.__webglTexture),Ee(fe,Te),de(G.__webglFramebuffer,A,Te,i.COLOR_ATTACHMENT0+oe,fe,0),m(Te)&&p(fe)}t.unbindTexture()}else{let oe=i.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(oe=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(oe,j.__webglTexture),Ee(oe,x),x.mipmaps&&x.mipmaps.length>0)for(let be=0;be<x.mipmaps.length;be++)de(G.__webglFramebuffer[be],A,x,i.COLOR_ATTACHMENT0,oe,be);else de(G.__webglFramebuffer,A,x,i.COLOR_ATTACHMENT0,oe,0);m(x)&&p(oe),t.unbindTexture()}A.depthBuffer&&Be(A)}function ft(A){const x=A.textures;for(let G=0,j=x.length;G<j;G++){const J=x[G];if(m(J)){const $=E(A),Ce=n.get(J).__webglTexture;t.bindTexture($,Ce),p($),t.unbindTexture()}}}const ke=[],Ue=[];function Me(A){if(A.samples>0){if(Se(A)===!1){const x=A.textures,G=A.width,j=A.height;let J=i.COLOR_BUFFER_BIT;const $=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ce=n.get(A),oe=x.length>1;if(oe)for(let Te=0;Te<x.length;Te++)t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Ce.__webglMultisampledFramebuffer);const be=A.texture.mipmaps;be&&be.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ce.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ce.__webglFramebuffer);for(let Te=0;Te<x.length;Te++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(J|=i.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(J|=i.STENCIL_BUFFER_BIT)),oe){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Ce.__webglColorRenderbuffer[Te]);const ie=n.get(x[Te]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,ie,0)}i.blitFramebuffer(0,0,G,j,0,0,G,j,J,i.NEAREST),l===!0&&(ke.length=0,Ue.length=0,ke.push(i.COLOR_ATTACHMENT0+Te),A.depthBuffer&&A.resolveDepthBuffer===!1&&(ke.push($),Ue.push($),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ue)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ke))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),oe)for(let Te=0;Te<x.length;Te++){t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.RENDERBUFFER,Ce.__webglColorRenderbuffer[Te]);const ie=n.get(x[Te]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.TEXTURE_2D,ie,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ce.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&l){const x=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[x])}}}function pt(A){return Math.min(s.maxSamples,A.samples)}function Se(A){const x=n.get(A);return A.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function Xe(A){const x=o.render.frame;h.get(A)!==x&&(h.set(A,x),A.update())}function It(A,x){const G=A.colorSpace,j=A.format,J=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||G!==Es&&G!==pi&&(Ze.getTransfer(G)===rt?(j!==Tn||J!==zn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",G)),x}function Mt(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=F,this.resetTextureUnits=T,this.setTexture2D=B,this.setTexture2DArray=N,this.setTexture3D=q,this.setTextureCube=V,this.rebindTextures=Et,this.setupRenderTarget=P,this.updateRenderTargetMipmap=ft,this.updateMultisampleRenderTarget=Me,this.setupDepthRenderbuffer=Be,this.setupFrameBufferTexture=de,this.useMultisampledRTT=Se}function p_(i,e){function t(n,s=pi){let r;const o=Ze.getTransfer(s);if(n===zn)return i.UNSIGNED_BYTE;if(n===wl)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Al)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Gh)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Wh)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===zh)return i.BYTE;if(n===Vh)return i.SHORT;if(n===Zs)return i.UNSIGNED_SHORT;if(n===Tl)return i.INT;if(n===Bi)return i.UNSIGNED_INT;if(n===Bn)return i.FLOAT;if(n===ti)return i.HALF_FLOAT;if(n===Xh)return i.ALPHA;if(n===qh)return i.RGB;if(n===Tn)return i.RGBA;if(n===Qs)return i.DEPTH_COMPONENT;if(n===er)return i.DEPTH_STENCIL;if(n===Cl)return i.RED;if(n===Rl)return i.RED_INTEGER;if(n===$h)return i.RG;if(n===Pl)return i.RG_INTEGER;if(n===Ll)return i.RGBA_INTEGER;if(n===Qr||n===eo||n===to||n===no)if(o===rt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Qr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===eo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===to)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===no)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Qr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===eo)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===to)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===no)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Ha||n===za||n===Va||n===Ga)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Ha)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===za)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Va)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Ga)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Wa||n===Xa||n===qa)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Wa||n===Xa)return o===rt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===qa)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===$a||n===Ya||n===ja||n===Ka||n===Za||n===Ja||n===Qa||n===el||n===tl||n===nl||n===il||n===sl||n===rl||n===ol)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===$a)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Ya)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===ja)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Ka)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Za)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Ja)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Qa)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===el)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===tl)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===nl)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===il)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===sl)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===rl)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===ol)return o===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===al||n===ll||n===cl)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===al)return o===rt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===ll)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===cl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===hl||n===dl||n===ul||n===fl)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===hl)return r.COMPRESSED_RED_RGTC1_EXT;if(n===dl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===ul)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===fl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Js?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const m_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,g_=`
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

}`;class __{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new ld(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Yt({vertexShader:m_,fragmentShader:g_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new re(new Rn(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class v_ extends ws{constructor(e,t){super();const n=this;let s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,f=null,d=null,u=null,g=null;const _=typeof XRWebGLBinding<"u",m=new __,p={},E=t.getContextAttributes();let b=null,M=null;const R=[],w=[],L=new Ae;let I=null;const v=new sn;v.viewport=new ot;const y=new sn;y.viewport=new ot;const C=[v,y],T=new Ff;let F=null,D=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(z){let Y=R[z];return Y===void 0&&(Y=new ta,R[z]=Y),Y.getTargetRaySpace()},this.getControllerGrip=function(z){let Y=R[z];return Y===void 0&&(Y=new ta,R[z]=Y),Y.getGripSpace()},this.getHand=function(z){let Y=R[z];return Y===void 0&&(Y=new ta,R[z]=Y),Y.getHandSpace()};function B(z){const Y=w.indexOf(z.inputSource);if(Y===-1)return;const de=R[Y];de!==void 0&&(de.update(z.inputSource,z.frame,c||o),de.dispatchEvent({type:z.type,data:z.inputSource}))}function N(){s.removeEventListener("select",B),s.removeEventListener("selectstart",B),s.removeEventListener("selectend",B),s.removeEventListener("squeeze",B),s.removeEventListener("squeezestart",B),s.removeEventListener("squeezeend",B),s.removeEventListener("end",N),s.removeEventListener("inputsourceschange",q);for(let z=0;z<R.length;z++){const Y=w[z];Y!==null&&(w[z]=null,R[z].disconnect(Y))}F=null,D=null,m.reset();for(const z in p)delete p[z];e.setRenderTarget(b),u=null,d=null,f=null,s=null,M=null,Q.stop(),n.isPresenting=!1,e.setPixelRatio(I),e.setSize(L.width,L.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(z){r=z,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(z){a=z,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(z){c=z},this.getBaseLayer=function(){return d!==null?d:u},this.getBinding=function(){return f===null&&_&&(f=new XRWebGLBinding(s,t)),f},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(z){if(s=z,s!==null){if(b=e.getRenderTarget(),s.addEventListener("select",B),s.addEventListener("selectstart",B),s.addEventListener("selectend",B),s.addEventListener("squeeze",B),s.addEventListener("squeezestart",B),s.addEventListener("squeezeend",B),s.addEventListener("end",N),s.addEventListener("inputsourceschange",q),E.xrCompatible!==!0&&await t.makeXRCompatible(),I=e.getPixelRatio(),e.getSize(L),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let de=null,Re=null,xe=null;E.depth&&(xe=E.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,de=E.stencil?er:Qs,Re=E.stencil?Js:Bi);const Be={colorFormat:t.RGBA8,depthFormat:xe,scaleFactor:r};f=this.getBinding(),d=f.createProjectionLayer(Be),s.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),M=new An(d.textureWidth,d.textureHeight,{format:Tn,type:zn,depthTexture:new ad(d.textureWidth,d.textureHeight,Re,void 0,void 0,void 0,void 0,void 0,void 0,de),stencilBuffer:E.stencil,colorSpace:e.outputColorSpace,samples:E.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const de={antialias:E.antialias,alpha:!0,depth:E.depth,stencil:E.stencil,framebufferScaleFactor:r};u=new XRWebGLLayer(s,t,de),s.updateRenderState({baseLayer:u}),e.setPixelRatio(1),e.setSize(u.framebufferWidth,u.framebufferHeight,!1),M=new An(u.framebufferWidth,u.framebufferHeight,{format:Tn,type:zn,colorSpace:e.outputColorSpace,stencilBuffer:E.stencil,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),Q.setContext(s),Q.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function q(z){for(let Y=0;Y<z.removed.length;Y++){const de=z.removed[Y],Re=w.indexOf(de);Re>=0&&(w[Re]=null,R[Re].disconnect(de))}for(let Y=0;Y<z.added.length;Y++){const de=z.added[Y];let Re=w.indexOf(de);if(Re===-1){for(let Be=0;Be<R.length;Be++)if(Be>=w.length){w.push(de),Re=Be;break}else if(w[Be]===null){w[Be]=de,Re=Be;break}if(Re===-1)break}const xe=R[Re];xe&&xe.connect(de)}}const V=new U,Z=new U;function ee(z,Y,de){V.setFromMatrixPosition(Y.matrixWorld),Z.setFromMatrixPosition(de.matrixWorld);const Re=V.distanceTo(Z),xe=Y.projectionMatrix.elements,Be=de.projectionMatrix.elements,Et=xe[14]/(xe[10]-1),P=xe[14]/(xe[10]+1),ft=(xe[9]+1)/xe[5],ke=(xe[9]-1)/xe[5],Ue=(xe[8]-1)/xe[0],Me=(Be[8]+1)/Be[0],pt=Et*Ue,Se=Et*Me,Xe=Re/(-Ue+Me),It=Xe*-Ue;if(Y.matrixWorld.decompose(z.position,z.quaternion,z.scale),z.translateX(It),z.translateZ(Xe),z.matrixWorld.compose(z.position,z.quaternion,z.scale),z.matrixWorldInverse.copy(z.matrixWorld).invert(),xe[10]===-1)z.projectionMatrix.copy(Y.projectionMatrix),z.projectionMatrixInverse.copy(Y.projectionMatrixInverse);else{const Mt=Et+Xe,A=P+Xe,x=pt-It,G=Se+(Re-It),j=ft*P/A*Mt,J=ke*P/A*Mt;z.projectionMatrix.makePerspective(x,G,j,J,Mt,A),z.projectionMatrixInverse.copy(z.projectionMatrix).invert()}}function ce(z,Y){Y===null?z.matrixWorld.copy(z.matrix):z.matrixWorld.multiplyMatrices(Y.matrixWorld,z.matrix),z.matrixWorldInverse.copy(z.matrixWorld).invert()}this.updateCamera=function(z){if(s===null)return;let Y=z.near,de=z.far;m.texture!==null&&(m.depthNear>0&&(Y=m.depthNear),m.depthFar>0&&(de=m.depthFar)),T.near=y.near=v.near=Y,T.far=y.far=v.far=de,(F!==T.near||D!==T.far)&&(s.updateRenderState({depthNear:T.near,depthFar:T.far}),F=T.near,D=T.far),T.layers.mask=z.layers.mask|6,v.layers.mask=T.layers.mask&3,y.layers.mask=T.layers.mask&5;const Re=z.parent,xe=T.cameras;ce(T,Re);for(let Be=0;Be<xe.length;Be++)ce(xe[Be],Re);xe.length===2?ee(T,v,y):T.projectionMatrix.copy(v.projectionMatrix),Ee(z,T,Re)};function Ee(z,Y,de){de===null?z.matrix.copy(Y.matrixWorld):(z.matrix.copy(de.matrixWorld),z.matrix.invert(),z.matrix.multiply(Y.matrixWorld)),z.matrix.decompose(z.position,z.quaternion,z.scale),z.updateMatrixWorld(!0),z.projectionMatrix.copy(Y.projectionMatrix),z.projectionMatrixInverse.copy(Y.projectionMatrixInverse),z.isPerspectiveCamera&&(z.fov=tr*2*Math.atan(1/z.projectionMatrix.elements[5]),z.zoom=1)}this.getCamera=function(){return T},this.getFoveation=function(){if(!(d===null&&u===null))return l},this.setFoveation=function(z){l=z,d!==null&&(d.fixedFoveation=z),u!==null&&u.fixedFoveation!==void 0&&(u.fixedFoveation=z)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(T)},this.getCameraTexture=function(z){return p[z]};let He=null;function Qe(z,Y){if(h=Y.getViewerPose(c||o),g=Y,h!==null){const de=h.views;u!==null&&(e.setRenderTargetFramebuffer(M,u.framebuffer),e.setRenderTarget(M));let Re=!1;de.length!==T.cameras.length&&(T.cameras.length=0,Re=!0);for(let P=0;P<de.length;P++){const ft=de[P];let ke=null;if(u!==null)ke=u.getViewport(ft);else{const Me=f.getViewSubImage(d,ft);ke=Me.viewport,P===0&&(e.setRenderTargetTextures(M,Me.colorTexture,Me.depthStencilTexture),e.setRenderTarget(M))}let Ue=C[P];Ue===void 0&&(Ue=new sn,Ue.layers.enable(P),Ue.viewport=new ot,C[P]=Ue),Ue.matrix.fromArray(ft.transform.matrix),Ue.matrix.decompose(Ue.position,Ue.quaternion,Ue.scale),Ue.projectionMatrix.fromArray(ft.projectionMatrix),Ue.projectionMatrixInverse.copy(Ue.projectionMatrix).invert(),Ue.viewport.set(ke.x,ke.y,ke.width,ke.height),P===0&&(T.matrix.copy(Ue.matrix),T.matrix.decompose(T.position,T.quaternion,T.scale)),Re===!0&&T.cameras.push(Ue)}const xe=s.enabledFeatures;if(xe&&xe.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&_){f=n.getBinding();const P=f.getDepthInformation(de[0]);P&&P.isValid&&P.texture&&m.init(P,s.renderState)}if(xe&&xe.includes("camera-access")&&_){e.state.unbindTexture(),f=n.getBinding();for(let P=0;P<de.length;P++){const ft=de[P].camera;if(ft){let ke=p[ft];ke||(ke=new ld,p[ft]=ke);const Ue=f.getCameraImage(ft);ke.sourceTexture=Ue}}}}for(let de=0;de<R.length;de++){const Re=w[de],xe=R[de];Re!==null&&xe!==void 0&&xe.update(Re,Y,c||o)}He&&He(z,Y),Y.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:Y}),g=null}const Q=new hd;Q.setAnimationLoop(Qe),this.setAnimationLoop=function(z){He=z},this.dispose=function(){}}}const wi=new Vn,y_=new at;function x_(i,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,td(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,E,b,M){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(m,p):p.isMeshToonMaterial?(r(m,p),f(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p)):p.isMeshStandardMaterial?(r(m,p),d(m,p),p.isMeshPhysicalMaterial&&u(m,p,M)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),_(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?l(m,p,E,b):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===jt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===jt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const E=e.get(p),b=E.envMap,M=E.envMapRotation;b&&(m.envMap.value=b,wi.copy(M),wi.x*=-1,wi.y*=-1,wi.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(wi.y*=-1,wi.z*=-1),m.envMapRotation.value.setFromMatrix4(y_.makeRotationFromEuler(wi)),m.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,E,b){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*E,m.scale.value=b*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function f(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function u(m,p,E){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===jt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=E.texture,m.transmissionSamplerSize.value.set(E.width,E.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function _(m,p){const E=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(E.matrixWorld),m.nearDistance.value=E.shadow.camera.near,m.farDistance.value=E.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function M_(i,e,t,n){let s={},r={},o=[];const a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(E,b){const M=b.program;n.uniformBlockBinding(E,M)}function c(E,b){let M=s[E.id];M===void 0&&(g(E),M=h(E),s[E.id]=M,E.addEventListener("dispose",m));const R=b.program;n.updateUBOMapping(E,R);const w=e.render.frame;r[E.id]!==w&&(d(E),r[E.id]=w)}function h(E){const b=f();E.__bindingPointIndex=b;const M=i.createBuffer(),R=E.__size,w=E.usage;return i.bindBuffer(i.UNIFORM_BUFFER,M),i.bufferData(i.UNIFORM_BUFFER,R,w),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,b,M),M}function f(){for(let E=0;E<a;E++)if(o.indexOf(E)===-1)return o.push(E),E;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(E){const b=s[E.id],M=E.uniforms,R=E.__cache;i.bindBuffer(i.UNIFORM_BUFFER,b);for(let w=0,L=M.length;w<L;w++){const I=Array.isArray(M[w])?M[w]:[M[w]];for(let v=0,y=I.length;v<y;v++){const C=I[v];if(u(C,w,v,R)===!0){const T=C.__offset,F=Array.isArray(C.value)?C.value:[C.value];let D=0;for(let B=0;B<F.length;B++){const N=F[B],q=_(N);typeof N=="number"||typeof N=="boolean"?(C.__data[0]=N,i.bufferSubData(i.UNIFORM_BUFFER,T+D,C.__data)):N.isMatrix3?(C.__data[0]=N.elements[0],C.__data[1]=N.elements[1],C.__data[2]=N.elements[2],C.__data[3]=0,C.__data[4]=N.elements[3],C.__data[5]=N.elements[4],C.__data[6]=N.elements[5],C.__data[7]=0,C.__data[8]=N.elements[6],C.__data[9]=N.elements[7],C.__data[10]=N.elements[8],C.__data[11]=0):(N.toArray(C.__data,D),D+=q.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,T,C.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function u(E,b,M,R){const w=E.value,L=b+"_"+M;if(R[L]===void 0)return typeof w=="number"||typeof w=="boolean"?R[L]=w:R[L]=w.clone(),!0;{const I=R[L];if(typeof w=="number"||typeof w=="boolean"){if(I!==w)return R[L]=w,!0}else if(I.equals(w)===!1)return I.copy(w),!0}return!1}function g(E){const b=E.uniforms;let M=0;const R=16;for(let L=0,I=b.length;L<I;L++){const v=Array.isArray(b[L])?b[L]:[b[L]];for(let y=0,C=v.length;y<C;y++){const T=v[y],F=Array.isArray(T.value)?T.value:[T.value];for(let D=0,B=F.length;D<B;D++){const N=F[D],q=_(N),V=M%R,Z=V%q.boundary,ee=V+Z;M+=Z,ee!==0&&R-ee<q.storage&&(M+=R-ee),T.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),T.__offset=M,M+=q.storage}}}const w=M%R;return w>0&&(M+=R-w),E.__size=M,E.__cache={},this}function _(E){const b={boundary:0,storage:0};return typeof E=="number"||typeof E=="boolean"?(b.boundary=4,b.storage=4):E.isVector2?(b.boundary=8,b.storage=8):E.isVector3||E.isColor?(b.boundary=16,b.storage=12):E.isVector4?(b.boundary=16,b.storage=16):E.isMatrix3?(b.boundary=48,b.storage=48):E.isMatrix4?(b.boundary=64,b.storage=64):E.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",E),b}function m(E){const b=E.target;b.removeEventListener("dispose",m);const M=o.indexOf(b.__bindingPointIndex);o.splice(M,1),i.deleteBuffer(s[b.id]),delete s[b.id],delete r[b.id]}function p(){for(const E in s)i.deleteBuffer(s[E]);o=[],s={},r={}}return{bind:l,update:c,dispose:p}}class S_{constructor(e={}){const{canvas:t=ju(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let u;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");u=n.getContextAttributes().alpha}else u=o;const g=new Uint32Array(4),_=new Int32Array(4);let m=null,p=null;const E=[],b=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=gi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const M=this;let R=!1;this._outputColorSpace=fn;let w=0,L=0,I=null,v=-1,y=null;const C=new ot,T=new ot;let F=null;const D=new Oe(0);let B=0,N=t.width,q=t.height,V=1,Z=null,ee=null;const ce=new ot(0,0,N,q),Ee=new ot(0,0,N,q);let He=!1;const Qe=new Fl;let Q=!1,z=!1;const Y=new at,de=new U,Re=new ot,xe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Be=!1;function Et(){return I===null?V:1}let P=n;function ft(S,k){return t.getContext(S,k)}try{const S={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${bl}`),t.addEventListener("webglcontextlost",ae,!1),t.addEventListener("webglcontextrestored",_e,!1),t.addEventListener("webglcontextcreationerror",te,!1),P===null){const k="webgl2";if(P=ft(k,S),P===null)throw ft(k)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(S){throw console.error("THREE.WebGLRenderer: "+S.message),S}let ke,Ue,Me,pt,Se,Xe,It,Mt,A,x,G,j,J,$,Ce,oe,be,Te,ie,fe,De,we,he,ze;function O(){ke=new Ig(P),ke.init(),we=new p_(P,ke),Ue=new Tg(P,ke,e,we),Me=new u_(P,ke),Ue.reversedDepthBuffer&&d&&Me.buffers.depth.setReversed(!0),pt=new Ng(P),Se=new Q0,Xe=new f_(P,ke,Me,Se,Ue,we,pt),It=new Ag(M),Mt=new Lg(M),A=new zf(P),he=new Eg(P,A),x=new Dg(P,A,pt,he),G=new Fg(P,x,A,pt),ie=new Og(P,Ue,Xe),oe=new wg(Se),j=new J0(M,It,Mt,ke,Ue,he,oe),J=new x_(M,Se),$=new t_,Ce=new a_(ke),Te=new Sg(M,It,Mt,Me,G,u,l),be=new h_(M,G,Ue),ze=new M_(P,pt,Ue,Me),fe=new bg(P,ke,pt),De=new Ug(P,ke,pt),pt.programs=j.programs,M.capabilities=Ue,M.extensions=ke,M.properties=Se,M.renderLists=$,M.shadowMap=be,M.state=Me,M.info=pt}O();const se=new v_(M,P);this.xr=se,this.getContext=function(){return P},this.getContextAttributes=function(){return P.getContextAttributes()},this.forceContextLoss=function(){const S=ke.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){const S=ke.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return V},this.setPixelRatio=function(S){S!==void 0&&(V=S,this.setSize(N,q,!1))},this.getSize=function(S){return S.set(N,q)},this.setSize=function(S,k,W=!0){if(se.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}N=S,q=k,t.width=Math.floor(S*V),t.height=Math.floor(k*V),W===!0&&(t.style.width=S+"px",t.style.height=k+"px"),this.setViewport(0,0,S,k)},this.getDrawingBufferSize=function(S){return S.set(N*V,q*V).floor()},this.setDrawingBufferSize=function(S,k,W){N=S,q=k,V=W,t.width=Math.floor(S*W),t.height=Math.floor(k*W),this.setViewport(0,0,S,k)},this.getCurrentViewport=function(S){return S.copy(C)},this.getViewport=function(S){return S.copy(ce)},this.setViewport=function(S,k,W,X){S.isVector4?ce.set(S.x,S.y,S.z,S.w):ce.set(S,k,W,X),Me.viewport(C.copy(ce).multiplyScalar(V).round())},this.getScissor=function(S){return S.copy(Ee)},this.setScissor=function(S,k,W,X){S.isVector4?Ee.set(S.x,S.y,S.z,S.w):Ee.set(S,k,W,X),Me.scissor(T.copy(Ee).multiplyScalar(V).round())},this.getScissorTest=function(){return He},this.setScissorTest=function(S){Me.setScissorTest(He=S)},this.setOpaqueSort=function(S){Z=S},this.setTransparentSort=function(S){ee=S},this.getClearColor=function(S){return S.copy(Te.getClearColor())},this.setClearColor=function(){Te.setClearColor(...arguments)},this.getClearAlpha=function(){return Te.getClearAlpha()},this.setClearAlpha=function(){Te.setClearAlpha(...arguments)},this.clear=function(S=!0,k=!0,W=!0){let X=0;if(S){let H=!1;if(I!==null){const ne=I.texture.format;H=ne===Ll||ne===Pl||ne===Rl}if(H){const ne=I.texture.type,ue=ne===zn||ne===Bi||ne===Zs||ne===Js||ne===wl||ne===Al,ve=Te.getClearColor(),me=Te.getClearAlpha(),Ie=ve.r,Ne=ve.g,Pe=ve.b;ue?(g[0]=Ie,g[1]=Ne,g[2]=Pe,g[3]=me,P.clearBufferuiv(P.COLOR,0,g)):(_[0]=Ie,_[1]=Ne,_[2]=Pe,_[3]=me,P.clearBufferiv(P.COLOR,0,_))}else X|=P.COLOR_BUFFER_BIT}k&&(X|=P.DEPTH_BUFFER_BIT),W&&(X|=P.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),P.clear(X)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ae,!1),t.removeEventListener("webglcontextrestored",_e,!1),t.removeEventListener("webglcontextcreationerror",te,!1),Te.dispose(),$.dispose(),Ce.dispose(),Se.dispose(),It.dispose(),Mt.dispose(),G.dispose(),he.dispose(),ze.dispose(),j.dispose(),se.dispose(),se.removeEventListener("sessionstart",Pn),se.removeEventListener("sessionend",Jl),yi.stop()};function ae(S){S.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),R=!0}function _e(){console.log("THREE.WebGLRenderer: Context Restored."),R=!1;const S=pt.autoReset,k=be.enabled,W=be.autoUpdate,X=be.needsUpdate,H=be.type;O(),pt.autoReset=S,be.enabled=k,be.autoUpdate=W,be.needsUpdate=X,be.type=H}function te(S){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function K(S){const k=S.target;k.removeEventListener("dispose",K),ye(k)}function ye(S){Fe(S),Se.remove(S)}function Fe(S){const k=Se.get(S).programs;k!==void 0&&(k.forEach(function(W){j.releaseProgram(W)}),S.isShaderMaterial&&j.releaseShaderCache(S))}this.renderBufferDirect=function(S,k,W,X,H,ne){k===null&&(k=xe);const ue=H.isMesh&&H.matrixWorld.determinant()<0,ve=Fd(S,k,W,X,H);Me.setMaterial(X,ue);let me=W.index,Ie=1;if(X.wireframe===!0){if(me=x.getWireframeAttribute(W),me===void 0)return;Ie=2}const Ne=W.drawRange,Pe=W.attributes.position;let Ye=Ne.start*Ie,it=(Ne.start+Ne.count)*Ie;ne!==null&&(Ye=Math.max(Ye,ne.start*Ie),it=Math.min(it,(ne.start+ne.count)*Ie)),me!==null?(Ye=Math.max(Ye,0),it=Math.min(it,me.count)):Pe!=null&&(Ye=Math.max(Ye,0),it=Math.min(it,Pe.count));const yt=it-Ye;if(yt<0||yt===1/0)return;he.setup(H,X,ve,W,me);let ut,lt=fe;if(me!==null&&(ut=A.get(me),lt=De,lt.setIndex(ut)),H.isMesh)X.wireframe===!0?(Me.setLineWidth(X.wireframeLinewidth*Et()),lt.setMode(P.LINES)):lt.setMode(P.TRIANGLES);else if(H.isLine){let Le=X.linewidth;Le===void 0&&(Le=1),Me.setLineWidth(Le*Et()),H.isLineSegments?lt.setMode(P.LINES):H.isLineLoop?lt.setMode(P.LINE_LOOP):lt.setMode(P.LINE_STRIP)}else H.isPoints?lt.setMode(P.POINTS):H.isSprite&&lt.setMode(P.TRIANGLES);if(H.isBatchedMesh)if(H._multiDrawInstances!==null)nr("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),lt.renderMultiDrawInstances(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount,H._multiDrawInstances);else if(ke.get("WEBGL_multi_draw"))lt.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{const Le=H._multiDrawStarts,gt=H._multiDrawCounts,Ke=H._multiDrawCount,Zt=me?A.get(me).bytesPerElement:1,Gi=Se.get(X).currentProgram.getUniforms();for(let Jt=0;Jt<Ke;Jt++)Gi.setValue(P,"_gl_DrawID",Jt),lt.render(Le[Jt]/Zt,gt[Jt])}else if(H.isInstancedMesh)lt.renderInstances(Ye,yt,H.count);else if(W.isInstancedBufferGeometry){const Le=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,gt=Math.min(W.instanceCount,Le);lt.renderInstances(Ye,yt,gt)}else lt.render(Ye,yt)};function ht(S,k,W){S.transparent===!0&&S.side===rn&&S.forceSinglePass===!1?(S.side=jt,S.needsUpdate=!0,mr(S,k,W),S.side=_i,S.needsUpdate=!0,mr(S,k,W),S.side=rn):mr(S,k,W)}this.compile=function(S,k,W=null){W===null&&(W=S),p=Ce.get(W),p.init(k),b.push(p),W.traverseVisible(function(H){H.isLight&&H.layers.test(k.layers)&&(p.pushLight(H),H.castShadow&&p.pushShadow(H))}),S!==W&&S.traverseVisible(function(H){H.isLight&&H.layers.test(k.layers)&&(p.pushLight(H),H.castShadow&&p.pushShadow(H))}),p.setupLights();const X=new Set;return S.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;const ne=H.material;if(ne)if(Array.isArray(ne))for(let ue=0;ue<ne.length;ue++){const ve=ne[ue];ht(ve,W,H),X.add(ve)}else ht(ne,W,H),X.add(ne)}),p=b.pop(),X},this.compileAsync=function(S,k,W=null){const X=this.compile(S,k,W);return new Promise(H=>{function ne(){if(X.forEach(function(ue){Se.get(ue).currentProgram.isReady()&&X.delete(ue)}),X.size===0){H(S);return}setTimeout(ne,10)}ke.get("KHR_parallel_shader_compile")!==null?ne():setTimeout(ne,10)})};let tt=null;function Gn(S){tt&&tt(S)}function Pn(){yi.stop()}function Jl(){yi.start()}const yi=new hd;yi.setAnimationLoop(Gn),typeof self<"u"&&yi.setContext(self),this.setAnimationLoop=function(S){tt=S,se.setAnimationLoop(S),S===null?yi.stop():yi.start()},se.addEventListener("sessionstart",Pn),se.addEventListener("sessionend",Jl),this.render=function(S,k){if(k!==void 0&&k.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(R===!0)return;if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),se.enabled===!0&&se.isPresenting===!0&&(se.cameraAutoUpdate===!0&&se.updateCamera(k),k=se.getCamera()),S.isScene===!0&&S.onBeforeRender(M,S,k,I),p=Ce.get(S,b.length),p.init(k),b.push(p),Y.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),Qe.setFromProjectionMatrix(Y,kn,k.reversedDepth),z=this.localClippingEnabled,Q=oe.init(this.clippingPlanes,z),m=$.get(S,E.length),m.init(),E.push(m),se.enabled===!0&&se.isPresenting===!0){const ne=M.xr.getDepthSensingMesh();ne!==null&&Lo(ne,k,-1/0,M.sortObjects)}Lo(S,k,0,M.sortObjects),m.finish(),M.sortObjects===!0&&m.sort(Z,ee),Be=se.enabled===!1||se.isPresenting===!1||se.hasDepthSensing()===!1,Be&&Te.addToRenderList(m,S),this.info.render.frame++,Q===!0&&oe.beginShadows();const W=p.state.shadowsArray;be.render(W,S,k),Q===!0&&oe.endShadows(),this.info.autoReset===!0&&this.info.reset();const X=m.opaque,H=m.transmissive;if(p.setupLights(),k.isArrayCamera){const ne=k.cameras;if(H.length>0)for(let ue=0,ve=ne.length;ue<ve;ue++){const me=ne[ue];ec(X,H,S,me)}Be&&Te.render(S);for(let ue=0,ve=ne.length;ue<ve;ue++){const me=ne[ue];Ql(m,S,me,me.viewport)}}else H.length>0&&ec(X,H,S,k),Be&&Te.render(S),Ql(m,S,k);I!==null&&L===0&&(Xe.updateMultisampleRenderTarget(I),Xe.updateRenderTargetMipmap(I)),S.isScene===!0&&S.onAfterRender(M,S,k),he.resetDefaultState(),v=-1,y=null,b.pop(),b.length>0?(p=b[b.length-1],Q===!0&&oe.setGlobalState(M.clippingPlanes,p.state.camera)):p=null,E.pop(),E.length>0?m=E[E.length-1]:m=null};function Lo(S,k,W,X){if(S.visible===!1)return;if(S.layers.test(k.layers)){if(S.isGroup)W=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(k);else if(S.isLight)p.pushLight(S),S.castShadow&&p.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||Qe.intersectsSprite(S)){X&&Re.setFromMatrixPosition(S.matrixWorld).applyMatrix4(Y);const ue=G.update(S),ve=S.material;ve.visible&&m.push(S,ue,ve,W,Re.z,null)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||Qe.intersectsObject(S))){const ue=G.update(S),ve=S.material;if(X&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),Re.copy(S.boundingSphere.center)):(ue.boundingSphere===null&&ue.computeBoundingSphere(),Re.copy(ue.boundingSphere.center)),Re.applyMatrix4(S.matrixWorld).applyMatrix4(Y)),Array.isArray(ve)){const me=ue.groups;for(let Ie=0,Ne=me.length;Ie<Ne;Ie++){const Pe=me[Ie],Ye=ve[Pe.materialIndex];Ye&&Ye.visible&&m.push(S,ue,Ye,W,Re.z,Pe)}}else ve.visible&&m.push(S,ue,ve,W,Re.z,null)}}const ne=S.children;for(let ue=0,ve=ne.length;ue<ve;ue++)Lo(ne[ue],k,W,X)}function Ql(S,k,W,X){const H=S.opaque,ne=S.transmissive,ue=S.transparent;p.setupLightsView(W),Q===!0&&oe.setGlobalState(M.clippingPlanes,W),X&&Me.viewport(C.copy(X)),H.length>0&&pr(H,k,W),ne.length>0&&pr(ne,k,W),ue.length>0&&pr(ue,k,W),Me.buffers.depth.setTest(!0),Me.buffers.depth.setMask(!0),Me.buffers.color.setMask(!0),Me.setPolygonOffset(!1)}function ec(S,k,W,X){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[X.id]===void 0&&(p.state.transmissionRenderTarget[X.id]=new An(1,1,{generateMipmaps:!0,type:ke.has("EXT_color_buffer_half_float")||ke.has("EXT_color_buffer_float")?ti:zn,minFilter:Ni,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ze.workingColorSpace}));const ne=p.state.transmissionRenderTarget[X.id],ue=X.viewport||C;ne.setSize(ue.z*M.transmissionResolutionScale,ue.w*M.transmissionResolutionScale);const ve=M.getRenderTarget(),me=M.getActiveCubeFace(),Ie=M.getActiveMipmapLevel();M.setRenderTarget(ne),M.getClearColor(D),B=M.getClearAlpha(),B<1&&M.setClearColor(16777215,.5),M.clear(),Be&&Te.render(W);const Ne=M.toneMapping;M.toneMapping=gi;const Pe=X.viewport;if(X.viewport!==void 0&&(X.viewport=void 0),p.setupLightsView(X),Q===!0&&oe.setGlobalState(M.clippingPlanes,X),pr(S,W,X),Xe.updateMultisampleRenderTarget(ne),Xe.updateRenderTargetMipmap(ne),ke.has("WEBGL_multisampled_render_to_texture")===!1){let Ye=!1;for(let it=0,yt=k.length;it<yt;it++){const ut=k[it],lt=ut.object,Le=ut.geometry,gt=ut.material,Ke=ut.group;if(gt.side===rn&&lt.layers.test(X.layers)){const Zt=gt.side;gt.side=jt,gt.needsUpdate=!0,tc(lt,W,X,Le,gt,Ke),gt.side=Zt,gt.needsUpdate=!0,Ye=!0}}Ye===!0&&(Xe.updateMultisampleRenderTarget(ne),Xe.updateRenderTargetMipmap(ne))}M.setRenderTarget(ve,me,Ie),M.setClearColor(D,B),Pe!==void 0&&(X.viewport=Pe),M.toneMapping=Ne}function pr(S,k,W){const X=k.isScene===!0?k.overrideMaterial:null;for(let H=0,ne=S.length;H<ne;H++){const ue=S[H],ve=ue.object,me=ue.geometry,Ie=ue.group;let Ne=ue.material;Ne.allowOverride===!0&&X!==null&&(Ne=X),ve.layers.test(W.layers)&&tc(ve,k,W,me,Ne,Ie)}}function tc(S,k,W,X,H,ne){S.onBeforeRender(M,k,W,X,H,ne),S.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),H.onBeforeRender(M,k,W,X,S,ne),H.transparent===!0&&H.side===rn&&H.forceSinglePass===!1?(H.side=jt,H.needsUpdate=!0,M.renderBufferDirect(W,k,X,H,S,ne),H.side=_i,H.needsUpdate=!0,M.renderBufferDirect(W,k,X,H,S,ne),H.side=rn):M.renderBufferDirect(W,k,X,H,S,ne),S.onAfterRender(M,k,W,X,H,ne)}function mr(S,k,W){k.isScene!==!0&&(k=xe);const X=Se.get(S),H=p.state.lights,ne=p.state.shadowsArray,ue=H.state.version,ve=j.getParameters(S,H.state,ne,k,W),me=j.getProgramCacheKey(ve);let Ie=X.programs;X.environment=S.isMeshStandardMaterial?k.environment:null,X.fog=k.fog,X.envMap=(S.isMeshStandardMaterial?Mt:It).get(S.envMap||X.environment),X.envMapRotation=X.environment!==null&&S.envMap===null?k.environmentRotation:S.envMapRotation,Ie===void 0&&(S.addEventListener("dispose",K),Ie=new Map,X.programs=Ie);let Ne=Ie.get(me);if(Ne!==void 0){if(X.currentProgram===Ne&&X.lightsStateVersion===ue)return ic(S,ve),Ne}else ve.uniforms=j.getUniforms(S),S.onBeforeCompile(ve,M),Ne=j.acquireProgram(ve,me),Ie.set(me,Ne),X.uniforms=ve.uniforms;const Pe=X.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Pe.clippingPlanes=oe.uniform),ic(S,ve),X.needsLights=kd(S),X.lightsStateVersion=ue,X.needsLights&&(Pe.ambientLightColor.value=H.state.ambient,Pe.lightProbe.value=H.state.probe,Pe.directionalLights.value=H.state.directional,Pe.directionalLightShadows.value=H.state.directionalShadow,Pe.spotLights.value=H.state.spot,Pe.spotLightShadows.value=H.state.spotShadow,Pe.rectAreaLights.value=H.state.rectArea,Pe.ltc_1.value=H.state.rectAreaLTC1,Pe.ltc_2.value=H.state.rectAreaLTC2,Pe.pointLights.value=H.state.point,Pe.pointLightShadows.value=H.state.pointShadow,Pe.hemisphereLights.value=H.state.hemi,Pe.directionalShadowMap.value=H.state.directionalShadowMap,Pe.directionalShadowMatrix.value=H.state.directionalShadowMatrix,Pe.spotShadowMap.value=H.state.spotShadowMap,Pe.spotLightMatrix.value=H.state.spotLightMatrix,Pe.spotLightMap.value=H.state.spotLightMap,Pe.pointShadowMap.value=H.state.pointShadowMap,Pe.pointShadowMatrix.value=H.state.pointShadowMatrix),X.currentProgram=Ne,X.uniformsList=null,Ne}function nc(S){if(S.uniformsList===null){const k=S.currentProgram.getUniforms();S.uniformsList=io.seqWithValue(k.seq,S.uniforms)}return S.uniformsList}function ic(S,k){const W=Se.get(S);W.outputColorSpace=k.outputColorSpace,W.batching=k.batching,W.batchingColor=k.batchingColor,W.instancing=k.instancing,W.instancingColor=k.instancingColor,W.instancingMorph=k.instancingMorph,W.skinning=k.skinning,W.morphTargets=k.morphTargets,W.morphNormals=k.morphNormals,W.morphColors=k.morphColors,W.morphTargetsCount=k.morphTargetsCount,W.numClippingPlanes=k.numClippingPlanes,W.numIntersection=k.numClipIntersection,W.vertexAlphas=k.vertexAlphas,W.vertexTangents=k.vertexTangents,W.toneMapping=k.toneMapping}function Fd(S,k,W,X,H){k.isScene!==!0&&(k=xe),Xe.resetTextureUnits();const ne=k.fog,ue=X.isMeshStandardMaterial?k.environment:null,ve=I===null?M.outputColorSpace:I.isXRRenderTarget===!0?I.texture.colorSpace:Es,me=(X.isMeshStandardMaterial?Mt:It).get(X.envMap||ue),Ie=X.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Ne=!!W.attributes.tangent&&(!!X.normalMap||X.anisotropy>0),Pe=!!W.morphAttributes.position,Ye=!!W.morphAttributes.normal,it=!!W.morphAttributes.color;let yt=gi;X.toneMapped&&(I===null||I.isXRRenderTarget===!0)&&(yt=M.toneMapping);const ut=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,lt=ut!==void 0?ut.length:0,Le=Se.get(X),gt=p.state.lights;if(Q===!0&&(z===!0||S!==y)){const zt=S===y&&X.id===v;oe.setState(X,S,zt)}let Ke=!1;X.version===Le.__version?(Le.needsLights&&Le.lightsStateVersion!==gt.state.version||Le.outputColorSpace!==ve||H.isBatchedMesh&&Le.batching===!1||!H.isBatchedMesh&&Le.batching===!0||H.isBatchedMesh&&Le.batchingColor===!0&&H.colorTexture===null||H.isBatchedMesh&&Le.batchingColor===!1&&H.colorTexture!==null||H.isInstancedMesh&&Le.instancing===!1||!H.isInstancedMesh&&Le.instancing===!0||H.isSkinnedMesh&&Le.skinning===!1||!H.isSkinnedMesh&&Le.skinning===!0||H.isInstancedMesh&&Le.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&Le.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&Le.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&Le.instancingMorph===!1&&H.morphTexture!==null||Le.envMap!==me||X.fog===!0&&Le.fog!==ne||Le.numClippingPlanes!==void 0&&(Le.numClippingPlanes!==oe.numPlanes||Le.numIntersection!==oe.numIntersection)||Le.vertexAlphas!==Ie||Le.vertexTangents!==Ne||Le.morphTargets!==Pe||Le.morphNormals!==Ye||Le.morphColors!==it||Le.toneMapping!==yt||Le.morphTargetsCount!==lt)&&(Ke=!0):(Ke=!0,Le.__version=X.version);let Zt=Le.currentProgram;Ke===!0&&(Zt=mr(X,k,H));let Gi=!1,Jt=!1,Ps=!1;const _t=Zt.getUniforms(),cn=Le.uniforms;if(Me.useProgram(Zt.program)&&(Gi=!0,Jt=!0,Ps=!0),X.id!==v&&(v=X.id,Jt=!0),Gi||y!==S){Me.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),_t.setValue(P,"projectionMatrix",S.projectionMatrix),_t.setValue(P,"viewMatrix",S.matrixWorldInverse);const $t=_t.map.cameraPosition;$t!==void 0&&$t.setValue(P,de.setFromMatrixPosition(S.matrixWorld)),Ue.logarithmicDepthBuffer&&_t.setValue(P,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(X.isMeshPhongMaterial||X.isMeshToonMaterial||X.isMeshLambertMaterial||X.isMeshBasicMaterial||X.isMeshStandardMaterial||X.isShaderMaterial)&&_t.setValue(P,"isOrthographic",S.isOrthographicCamera===!0),y!==S&&(y=S,Jt=!0,Ps=!0)}if(H.isSkinnedMesh){_t.setOptional(P,H,"bindMatrix"),_t.setOptional(P,H,"bindMatrixInverse");const zt=H.skeleton;zt&&(zt.boneTexture===null&&zt.computeBoneTexture(),_t.setValue(P,"boneTexture",zt.boneTexture,Xe))}H.isBatchedMesh&&(_t.setOptional(P,H,"batchingTexture"),_t.setValue(P,"batchingTexture",H._matricesTexture,Xe),_t.setOptional(P,H,"batchingIdTexture"),_t.setValue(P,"batchingIdTexture",H._indirectTexture,Xe),_t.setOptional(P,H,"batchingColorTexture"),H._colorsTexture!==null&&_t.setValue(P,"batchingColorTexture",H._colorsTexture,Xe));const hn=W.morphAttributes;if((hn.position!==void 0||hn.normal!==void 0||hn.color!==void 0)&&ie.update(H,W,Zt),(Jt||Le.receiveShadow!==H.receiveShadow)&&(Le.receiveShadow=H.receiveShadow,_t.setValue(P,"receiveShadow",H.receiveShadow)),X.isMeshGouraudMaterial&&X.envMap!==null&&(cn.envMap.value=me,cn.flipEnvMap.value=me.isCubeTexture&&me.isRenderTargetTexture===!1?-1:1),X.isMeshStandardMaterial&&X.envMap===null&&k.environment!==null&&(cn.envMapIntensity.value=k.environmentIntensity),Jt&&(_t.setValue(P,"toneMappingExposure",M.toneMappingExposure),Le.needsLights&&Bd(cn,Ps),ne&&X.fog===!0&&J.refreshFogUniforms(cn,ne),J.refreshMaterialUniforms(cn,X,V,q,p.state.transmissionRenderTarget[S.id]),io.upload(P,nc(Le),cn,Xe)),X.isShaderMaterial&&X.uniformsNeedUpdate===!0&&(io.upload(P,nc(Le),cn,Xe),X.uniformsNeedUpdate=!1),X.isSpriteMaterial&&_t.setValue(P,"center",H.center),_t.setValue(P,"modelViewMatrix",H.modelViewMatrix),_t.setValue(P,"normalMatrix",H.normalMatrix),_t.setValue(P,"modelMatrix",H.matrixWorld),X.isShaderMaterial||X.isRawShaderMaterial){const zt=X.uniformsGroups;for(let $t=0,Io=zt.length;$t<Io;$t++){const xi=zt[$t];ze.update(xi,Zt),ze.bind(xi,Zt)}}return Zt}function Bd(S,k){S.ambientLightColor.needsUpdate=k,S.lightProbe.needsUpdate=k,S.directionalLights.needsUpdate=k,S.directionalLightShadows.needsUpdate=k,S.pointLights.needsUpdate=k,S.pointLightShadows.needsUpdate=k,S.spotLights.needsUpdate=k,S.spotLightShadows.needsUpdate=k,S.rectAreaLights.needsUpdate=k,S.hemisphereLights.needsUpdate=k}function kd(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return L},this.getRenderTarget=function(){return I},this.setRenderTargetTextures=function(S,k,W){const X=Se.get(S);X.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,X.__autoAllocateDepthBuffer===!1&&(X.__useRenderToTexture=!1),Se.get(S.texture).__webglTexture=k,Se.get(S.depthTexture).__webglTexture=X.__autoAllocateDepthBuffer?void 0:W,X.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,k){const W=Se.get(S);W.__webglFramebuffer=k,W.__useDefaultFramebuffer=k===void 0};const Hd=P.createFramebuffer();this.setRenderTarget=function(S,k=0,W=0){I=S,w=k,L=W;let X=!0,H=null,ne=!1,ue=!1;if(S){const me=Se.get(S);if(me.__useDefaultFramebuffer!==void 0)Me.bindFramebuffer(P.FRAMEBUFFER,null),X=!1;else if(me.__webglFramebuffer===void 0)Xe.setupRenderTarget(S);else if(me.__hasExternalTextures)Xe.rebindTextures(S,Se.get(S.texture).__webglTexture,Se.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){const Pe=S.depthTexture;if(me.__boundDepthTexture!==Pe){if(Pe!==null&&Se.has(Pe)&&(S.width!==Pe.image.width||S.height!==Pe.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Xe.setupDepthRenderbuffer(S)}}const Ie=S.texture;(Ie.isData3DTexture||Ie.isDataArrayTexture||Ie.isCompressedArrayTexture)&&(ue=!0);const Ne=Se.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Ne[k])?H=Ne[k][W]:H=Ne[k],ne=!0):S.samples>0&&Xe.useMultisampledRTT(S)===!1?H=Se.get(S).__webglMultisampledFramebuffer:Array.isArray(Ne)?H=Ne[W]:H=Ne,C.copy(S.viewport),T.copy(S.scissor),F=S.scissorTest}else C.copy(ce).multiplyScalar(V).floor(),T.copy(Ee).multiplyScalar(V).floor(),F=He;if(W!==0&&(H=Hd),Me.bindFramebuffer(P.FRAMEBUFFER,H)&&X&&Me.drawBuffers(S,H),Me.viewport(C),Me.scissor(T),Me.setScissorTest(F),ne){const me=Se.get(S.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_CUBE_MAP_POSITIVE_X+k,me.__webglTexture,W)}else if(ue){const me=k;for(let Ie=0;Ie<S.textures.length;Ie++){const Ne=Se.get(S.textures[Ie]);P.framebufferTextureLayer(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0+Ie,Ne.__webglTexture,W,me)}}else if(S!==null&&W!==0){const me=Se.get(S.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,me.__webglTexture,W)}v=-1},this.readRenderTargetPixels=function(S,k,W,X,H,ne,ue,ve=0){if(!(S&&S.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let me=Se.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&ue!==void 0&&(me=me[ue]),me){Me.bindFramebuffer(P.FRAMEBUFFER,me);try{const Ie=S.textures[ve],Ne=Ie.format,Pe=Ie.type;if(!Ue.textureFormatReadable(Ne)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ue.textureTypeReadable(Pe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=S.width-X&&W>=0&&W<=S.height-H&&(S.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+ve),P.readPixels(k,W,X,H,we.convert(Ne),we.convert(Pe),ne))}finally{const Ie=I!==null?Se.get(I).__webglFramebuffer:null;Me.bindFramebuffer(P.FRAMEBUFFER,Ie)}}},this.readRenderTargetPixelsAsync=async function(S,k,W,X,H,ne,ue,ve=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let me=Se.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&ue!==void 0&&(me=me[ue]),me)if(k>=0&&k<=S.width-X&&W>=0&&W<=S.height-H){Me.bindFramebuffer(P.FRAMEBUFFER,me);const Ie=S.textures[ve],Ne=Ie.format,Pe=Ie.type;if(!Ue.textureFormatReadable(Ne))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ue.textureTypeReadable(Pe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Ye=P.createBuffer();P.bindBuffer(P.PIXEL_PACK_BUFFER,Ye),P.bufferData(P.PIXEL_PACK_BUFFER,ne.byteLength,P.STREAM_READ),S.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+ve),P.readPixels(k,W,X,H,we.convert(Ne),we.convert(Pe),0);const it=I!==null?Se.get(I).__webglFramebuffer:null;Me.bindFramebuffer(P.FRAMEBUFFER,it);const yt=P.fenceSync(P.SYNC_GPU_COMMANDS_COMPLETE,0);return P.flush(),await Ku(P,yt,4),P.bindBuffer(P.PIXEL_PACK_BUFFER,Ye),P.getBufferSubData(P.PIXEL_PACK_BUFFER,0,ne),P.deleteBuffer(Ye),P.deleteSync(yt),ne}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,k=null,W=0){const X=Math.pow(2,-W),H=Math.floor(S.image.width*X),ne=Math.floor(S.image.height*X),ue=k!==null?k.x:0,ve=k!==null?k.y:0;Xe.setTexture2D(S,0),P.copyTexSubImage2D(P.TEXTURE_2D,W,0,0,ue,ve,H,ne),Me.unbindTexture()};const zd=P.createFramebuffer(),Vd=P.createFramebuffer();this.copyTextureToTexture=function(S,k,W=null,X=null,H=0,ne=null){ne===null&&(H!==0?(nr("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ne=H,H=0):ne=0);let ue,ve,me,Ie,Ne,Pe,Ye,it,yt;const ut=S.isCompressedTexture?S.mipmaps[ne]:S.image;if(W!==null)ue=W.max.x-W.min.x,ve=W.max.y-W.min.y,me=W.isBox3?W.max.z-W.min.z:1,Ie=W.min.x,Ne=W.min.y,Pe=W.isBox3?W.min.z:0;else{const hn=Math.pow(2,-H);ue=Math.floor(ut.width*hn),ve=Math.floor(ut.height*hn),S.isDataArrayTexture?me=ut.depth:S.isData3DTexture?me=Math.floor(ut.depth*hn):me=1,Ie=0,Ne=0,Pe=0}X!==null?(Ye=X.x,it=X.y,yt=X.z):(Ye=0,it=0,yt=0);const lt=we.convert(k.format),Le=we.convert(k.type);let gt;k.isData3DTexture?(Xe.setTexture3D(k,0),gt=P.TEXTURE_3D):k.isDataArrayTexture||k.isCompressedArrayTexture?(Xe.setTexture2DArray(k,0),gt=P.TEXTURE_2D_ARRAY):(Xe.setTexture2D(k,0),gt=P.TEXTURE_2D),P.pixelStorei(P.UNPACK_FLIP_Y_WEBGL,k.flipY),P.pixelStorei(P.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),P.pixelStorei(P.UNPACK_ALIGNMENT,k.unpackAlignment);const Ke=P.getParameter(P.UNPACK_ROW_LENGTH),Zt=P.getParameter(P.UNPACK_IMAGE_HEIGHT),Gi=P.getParameter(P.UNPACK_SKIP_PIXELS),Jt=P.getParameter(P.UNPACK_SKIP_ROWS),Ps=P.getParameter(P.UNPACK_SKIP_IMAGES);P.pixelStorei(P.UNPACK_ROW_LENGTH,ut.width),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,ut.height),P.pixelStorei(P.UNPACK_SKIP_PIXELS,Ie),P.pixelStorei(P.UNPACK_SKIP_ROWS,Ne),P.pixelStorei(P.UNPACK_SKIP_IMAGES,Pe);const _t=S.isDataArrayTexture||S.isData3DTexture,cn=k.isDataArrayTexture||k.isData3DTexture;if(S.isDepthTexture){const hn=Se.get(S),zt=Se.get(k),$t=Se.get(hn.__renderTarget),Io=Se.get(zt.__renderTarget);Me.bindFramebuffer(P.READ_FRAMEBUFFER,$t.__webglFramebuffer),Me.bindFramebuffer(P.DRAW_FRAMEBUFFER,Io.__webglFramebuffer);for(let xi=0;xi<me;xi++)_t&&(P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,Se.get(S).__webglTexture,H,Pe+xi),P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,Se.get(k).__webglTexture,ne,yt+xi)),P.blitFramebuffer(Ie,Ne,ue,ve,Ye,it,ue,ve,P.DEPTH_BUFFER_BIT,P.NEAREST);Me.bindFramebuffer(P.READ_FRAMEBUFFER,null),Me.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else if(H!==0||S.isRenderTargetTexture||Se.has(S)){const hn=Se.get(S),zt=Se.get(k);Me.bindFramebuffer(P.READ_FRAMEBUFFER,zd),Me.bindFramebuffer(P.DRAW_FRAMEBUFFER,Vd);for(let $t=0;$t<me;$t++)_t?P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,hn.__webglTexture,H,Pe+$t):P.framebufferTexture2D(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,hn.__webglTexture,H),cn?P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,zt.__webglTexture,ne,yt+$t):P.framebufferTexture2D(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,zt.__webglTexture,ne),H!==0?P.blitFramebuffer(Ie,Ne,ue,ve,Ye,it,ue,ve,P.COLOR_BUFFER_BIT,P.NEAREST):cn?P.copyTexSubImage3D(gt,ne,Ye,it,yt+$t,Ie,Ne,ue,ve):P.copyTexSubImage2D(gt,ne,Ye,it,Ie,Ne,ue,ve);Me.bindFramebuffer(P.READ_FRAMEBUFFER,null),Me.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else cn?S.isDataTexture||S.isData3DTexture?P.texSubImage3D(gt,ne,Ye,it,yt,ue,ve,me,lt,Le,ut.data):k.isCompressedArrayTexture?P.compressedTexSubImage3D(gt,ne,Ye,it,yt,ue,ve,me,lt,ut.data):P.texSubImage3D(gt,ne,Ye,it,yt,ue,ve,me,lt,Le,ut):S.isDataTexture?P.texSubImage2D(P.TEXTURE_2D,ne,Ye,it,ue,ve,lt,Le,ut.data):S.isCompressedTexture?P.compressedTexSubImage2D(P.TEXTURE_2D,ne,Ye,it,ut.width,ut.height,lt,ut.data):P.texSubImage2D(P.TEXTURE_2D,ne,Ye,it,ue,ve,lt,Le,ut);P.pixelStorei(P.UNPACK_ROW_LENGTH,Ke),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,Zt),P.pixelStorei(P.UNPACK_SKIP_PIXELS,Gi),P.pixelStorei(P.UNPACK_SKIP_ROWS,Jt),P.pixelStorei(P.UNPACK_SKIP_IMAGES,Ps),ne===0&&k.generateMipmaps&&P.generateMipmap(gt),Me.unbindTexture()},this.initRenderTarget=function(S){Se.get(S).__webglFramebuffer===void 0&&Xe.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?Xe.setTextureCube(S,0):S.isData3DTexture?Xe.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?Xe.setTexture2DArray(S,0):Xe.setTexture2D(S,0),Me.unbindTexture()},this.resetState=function(){w=0,L=0,I=null,Me.reset(),he.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return kn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Ze._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ze._getUnpackColorSpace()}}const so={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class ur{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const E_=new To(-1,1,1,-1,0,1);class b_ extends Ot{constructor(){super(),this.setAttribute("position",new ct([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ct([0,2,0,0,2,0],2))}}const T_=new b_;class md{constructor(e){this._mesh=new re(T_,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,E_)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class w_ extends ur{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Yt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=po.clone(e.uniforms),this.material=new Yt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new md(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class dh extends ur{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){const s=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}}class A_ extends ur{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class C_{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const n=e.getSize(new Ae);this._width=n.width,this._height=n.height,t=new An(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ti}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new w_(so),this.copyPass.material.blending=ei,this.clock=new Bf}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let n=!1;for(let s=0,r=this.passes.length;s<r;s++){const o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),o.needsSwap){if(n){const a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}dh!==void 0&&(o instanceof dh?n=!0:o instanceof A_&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new Ae);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class R_ extends ur{constructor(e,t,n=null,s=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Oe}render(e,t,n){const s=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=s}}const P_={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Oe(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class Ts extends ur{constructor(e,t=1,n,s){super(),this.strength=t,this.radius=n,this.threshold=s,this.resolution=e!==void 0?new Ae(e.x,e.y):new Ae(256,256),this.clearColor=new Oe(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new An(r,o,{type:ti}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){const f=new An(r,o,{type:ti});f.texture.name="UnrealBloomPass.h"+h,f.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(f);const d=new An(r,o,{type:ti});d.texture.name="UnrealBloomPass.v"+h,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),r=Math.round(r/2),o=Math.round(o/2)}const a=P_;this.highPassUniforms=po.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Yt({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new Ae(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=po.clone(so.uniforms),this.blendMaterial=new Yt({uniforms:this.copyUniforms,vertexShader:so.vertexShader,fragmentShader:so.fragmentShader,blending:wa,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Oe,this._oldClearAlpha=1,this._basic=new Cs,this._fsQuad=new md(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),s=Math.round(t/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new Ae(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(e,t,n,s,r){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=Ts.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=Ts.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this._fsQuad.render(e),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=o}_getSeparableBlurMaterial(e){const t=[];for(let n=0;n<e;n++)t.push(.39894*Math.exp(-.5*n*n/(e*e))/e);return new Yt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new Ae(.5,.5)},direction:{value:new Ae(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
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
				}`})}_getCompositeMaterial(e){return new Yt({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
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
				}`})}}Ts.BlurDirectionX=new Ae(1,0);Ts.BlurDirectionY=new Ae(0,1);const ge={HELLO:"hello",SET_NICKNAME:"set_nickname",JOIN_ROOM:"join_room",MOVEMENT:"movement",GARDEN_ACTION:"garden_action",MARKET_BUY:"market_buy",MARKET_SELL:"market_sell",ORDER_PLACE:"order_place",ORDER_CANCEL:"order_cancel",CONTRACT_COMPLETE:"contract_complete",NODE_HARVEST:"node_harvest",MACHINE_CONTRIBUTE:"machine_contribute",MACHINE_MILL:"machine_mill",MACHINE_CRAFT:"machine_craft",THEATER_QUEUE:"theater_queue",THEATER_CONTROL:"theater_control",THEATER_CHANNEL:"theater_channel",THEATER_PLAYLIST_RESOLVE:"theater_playlist_resolve",TORRENT_RESOLVE:"torrent_resolve",TORRENT_FILES:"torrent_files",TORRENT_STATE:"torrent_state",IPTV_LIST_GET:"iptv_list_get",IPTV_LIST_REMOVE:"iptv_list_remove",EPG_LOOKUP:"epg_lookup",EMOTE:"emote",CHAT_SEND:"chat_send",WELCOME:"welcome",PRESENCE_JOIN:"presence_join",PRESENCE_LEAVE:"presence_leave",PRESENCE_UPDATE:"presence_update",GARDEN_STATE:"garden_state",INVENTORY_STATE:"inventory_state",MARKET_UPDATE:"market_update",CONTRACT_UPDATE:"contract_update",NODE_STATE:"node_state",MACHINE_UPDATE:"machine_update",THEATER_STATE:"theater_state",THEATER_PLAYLIST_RESOLVED:"theater_playlist_resolved",THEATER_IMPORT_RESULT:"theater_import_result",IPTV_STATE:"iptv_state",IPTV_LIST:"iptv_list",EPG_SCHEDULE:"epg_schedule",WEATHER_UPDATE:"weather_update",ACTION_RESULT:"action_result",TRADE_FILLED:"trade_filled",EMOTE_BROADCAST:"emote_broadcast",CHAT_HISTORY:"chat_history",CHAT_MESSAGE:"chat_message",CHAT_DM:"chat_dm",CHAT_PRESENCE:"chat_presence",CHAT_ERROR:"chat_error",ERROR:"error"},qt={MARKET:"market",THEATER:"theater",gardenFor:i=>`garden:${i}`,isGarden:i=>i?.startsWith("garden:"),gardenOwner:i=>i?.startsWith("garden:")?i.slice(7):null};function L_(i){return JSON.stringify(i)}function I_(i){try{return JSON.parse(i)}catch{return null}}const uh=["Mossy","Quiet","Copper","Rainy","Amber","Misty","Rust","Golden","Silver","Fern","Bramble","Cobble","Thistle","Breezy","Dusky","Dappled","Dewy","Hedge","Orchard","Verdant","Gilded","Pebble","Autumnal","Gleaming"],fh=["Radish","Turnip","Basil","Leek","Carrot","Kale","Tomato","Berry","Sorrel","Chive","Sprout","Fennel","Parsnip","Pepper","Clover","Borage","Sage","Mint","Beet","Chard"];function go(i=Math.random()){const e=Math.floor(Math.abs(Math.sin(i*999))*uh.length),t=Math.floor(Math.abs(Math.cos(i*888))*fh.length),n=Math.floor(Math.abs(Math.sin(i*777))*90)+10;return`${uh[e]}${fh[t]}${n}`}function ph(i){if(typeof i!="string")return go();let e=i.replace(/<[^>]*>/g,"").replace(/[\x00-\x1F\x7F-\x9F]/g,"").trim();return e=e.replace(/[^\w\s-]/g,"").replace(/\s+/g," "),e.length>20&&(e=e.slice(0,20).trim()),e.length<3?go():e}function D_(i=""){let e=0;for(let n=0;n<i.length;n++)e=e*31+i.charCodeAt(n)>>>0;const t=[{coat:"#7a4e32",apron:"#b8a682",hat:"#473d32",boots:"#2b231c"},{coat:"#3a5449",apron:"#c2bca3",hat:"#2d3f37",boots:"#202924"},{coat:"#3d4b60",apron:"#b5b29c",hat:"#2a3547",boots:"#1c222e"},{coat:"#634b6b",apron:"#bfb5a3",hat:"#44324a",boots:"#251c29"},{coat:"#806835",apron:"#ccc4a7",hat:"#544320",boots:"#2e2411"},{coat:"#445e38",apron:"#b8b498",hat:"#314427",boots:"#1f2b18"}];return t[e%t.length]}var vs=i=>typeof i=="function"?i:function(){return i},U_=typeof self<"u"?self:null,Sn=typeof window<"u"?window:null,Dn=U_||Sn||globalThis,N_="2.0.0",Nn={connecting:0,open:1,closing:2,closed:3},O_=100,F_=1e4,B_=1e3,tn={closed:"closed",errored:"errored",joined:"joined",joining:"joining",leaving:"leaving"},Kn={close:"phx_close",error:"phx_error",join:"phx_join",reply:"phx_reply",leave:"phx_leave"},vl={longpoll:"longpoll",websocket:"websocket"},k_={complete:4},yl="base64url.bearer.phx.",Gr=class{constructor(i,e,t,n){this.channel=i,this.event=e,this.payload=t||function(){return{}},this.receivedResp=null,this.timeout=n,this.timeoutTimer=null,this.recHooks=[],this.sent=!1}resend(i){this.timeout=i,this.reset(),this.send()}send(){this.hasReceived("timeout")||(this.startTimeout(),this.sent=!0,this.channel.socket.push({topic:this.channel.topic,event:this.event,payload:this.payload(),ref:this.ref,join_ref:this.channel.joinRef()}))}receive(i,e){return this.hasReceived(i)&&e(this.receivedResp.response),this.recHooks.push({status:i,callback:e}),this}reset(){this.cancelRefEvent(),this.ref=null,this.refEvent=null,this.receivedResp=null,this.sent=!1}matchReceive({status:i,response:e,_ref:t}){this.recHooks.filter(n=>n.status===i).forEach(n=>n.callback(e))}cancelRefEvent(){this.refEvent&&this.channel.off(this.refEvent)}cancelTimeout(){clearTimeout(this.timeoutTimer),this.timeoutTimer=null}startTimeout(){this.timeoutTimer&&this.cancelTimeout(),this.cancelRefEvent(),this.ref=this.channel.socket.makeRef(),this.refEvent=this.channel.replyEventName(this.ref),this.channel.on(this.refEvent,i=>{this.cancelRefEvent(),this.cancelTimeout(),this.receivedResp=i,this.matchReceive(i)}),this.timeoutTimer=setTimeout(()=>{this.trigger("timeout",{})},this.timeout)}hasReceived(i){return this.receivedResp&&this.receivedResp.status===i}trigger(i,e){this.channel.trigger(this.refEvent,{status:i,response:e})}},gd=class{constructor(i,e){this.callback=i,this.timerCalc=e,this.timer=null,this.tries=0}reset(){this.tries=0,clearTimeout(this.timer)}scheduleTimeout(){clearTimeout(this.timer),this.timer=setTimeout(()=>{this.tries=this.tries+1,this.callback()},this.timerCalc(this.tries+1))}},H_=class{constructor(i,e,t){this.state=tn.closed,this.topic=i,this.params=vs(e||{}),this.socket=t,this.bindings=[],this.bindingRef=0,this.timeout=this.socket.timeout,this.joinedOnce=!1,this.joinPush=new Gr(this,Kn.join,this.params,this.timeout),this.pushBuffer=[],this.stateChangeRefs=[],this.rejoinTimer=new gd(()=>{this.socket.isConnected()&&this.rejoin()},this.socket.rejoinAfterMs),this.stateChangeRefs.push(this.socket.onError(()=>this.rejoinTimer.reset())),this.stateChangeRefs.push(this.socket.onOpen(()=>{this.rejoinTimer.reset(),this.isErrored()&&this.rejoin()})),this.joinPush.receive("ok",()=>{this.state=tn.joined,this.rejoinTimer.reset(),this.pushBuffer.forEach(n=>n.send()),this.pushBuffer=[]}),this.joinPush.receive("error",()=>{this.state=tn.errored,this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.onClose(()=>{this.rejoinTimer.reset(),this.socket.hasLogger()&&this.socket.log("channel",`close ${this.topic} ${this.joinRef()}`),this.state=tn.closed,this.socket.remove(this)}),this.onError(n=>{this.socket.hasLogger()&&this.socket.log("channel",`error ${this.topic}`,n),this.isJoining()&&this.joinPush.reset(),this.state=tn.errored,this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.joinPush.receive("timeout",()=>{this.socket.hasLogger()&&this.socket.log("channel",`timeout ${this.topic} (${this.joinRef()})`,this.joinPush.timeout),new Gr(this,Kn.leave,vs({}),this.timeout).send(),this.state=tn.errored,this.joinPush.reset(),this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.on(Kn.reply,(n,s)=>{this.trigger(this.replyEventName(s),n)})}join(i=this.timeout){if(this.joinedOnce)throw new Error("tried to join multiple times. 'join' can only be called a single time per channel instance");return this.timeout=i,this.joinedOnce=!0,this.rejoin(),this.joinPush}onClose(i){this.on(Kn.close,i)}onError(i){return this.on(Kn.error,e=>i(e))}on(i,e){let t=this.bindingRef++;return this.bindings.push({event:i,ref:t,callback:e}),t}off(i,e){this.bindings=this.bindings.filter(t=>!(t.event===i&&(typeof e>"u"||e===t.ref)))}canPush(){return this.socket.isConnected()&&this.isJoined()}push(i,e,t=this.timeout){if(e=e||{},!this.joinedOnce)throw new Error(`tried to push '${i}' to '${this.topic}' before joining. Use channel.join() before pushing events`);let n=new Gr(this,i,function(){return e},t);return this.canPush()?n.send():(n.startTimeout(),this.pushBuffer.push(n)),n}leave(i=this.timeout){this.rejoinTimer.reset(),this.joinPush.cancelTimeout(),this.state=tn.leaving;let e=()=>{this.socket.hasLogger()&&this.socket.log("channel",`leave ${this.topic}`),this.trigger(Kn.close,"leave")},t=new Gr(this,Kn.leave,vs({}),i);return t.receive("ok",()=>e()).receive("timeout",()=>e()),t.send(),this.canPush()||t.trigger("ok",{}),t}onMessage(i,e,t){return e}isMember(i,e,t,n){return this.topic!==i?!1:n&&n!==this.joinRef()?(this.socket.hasLogger()&&this.socket.log("channel","dropping outdated message",{topic:i,event:e,payload:t,joinRef:n}),!1):!0}joinRef(){return this.joinPush.ref}rejoin(i=this.timeout){this.isLeaving()||(this.socket.leaveOpenTopic(this.topic),this.state=tn.joining,this.joinPush.resend(i))}trigger(i,e,t,n){let s=this.onMessage(i,e,t,n);if(e&&!s)throw new Error("channel onMessage callbacks must return the payload, modified or unmodified");let r=this.bindings.filter(o=>o.event===i);for(let o=0;o<r.length;o++)r[o].callback(s,t,n||this.joinRef())}replyEventName(i){return`chan_reply_${i}`}isClosed(){return this.state===tn.closed}isErrored(){return this.state===tn.errored}isJoined(){return this.state===tn.joined}isJoining(){return this.state===tn.joining}isLeaving(){return this.state===tn.leaving}},_o=class{static request(i,e,t,n,s,r,o){if(Dn.XDomainRequest){let a=new Dn.XDomainRequest;return this.xdomainRequest(a,i,e,n,s,r,o)}else if(Dn.XMLHttpRequest){let a=new Dn.XMLHttpRequest;return this.xhrRequest(a,i,e,t,n,s,r,o)}else{if(Dn.fetch&&Dn.AbortController)return this.fetchRequest(i,e,t,n,s,r,o);throw new Error("No suitable XMLHttpRequest implementation found")}}static fetchRequest(i,e,t,n,s,r,o){let a={method:i,headers:t,body:n},l=null;return s&&(l=new AbortController,setTimeout(()=>l.abort(),s),a.signal=l.signal),Dn.fetch(e,a).then(c=>c.text()).then(c=>this.parseJSON(c)).then(c=>o&&o(c)).catch(c=>{c.name==="AbortError"&&r?r():o&&o(null)}),l}static xdomainRequest(i,e,t,n,s,r,o){return i.timeout=s,i.open(e,t),i.onload=()=>{let a=this.parseJSON(i.responseText);o&&o(a)},r&&(i.ontimeout=r),i.onprogress=()=>{},i.send(n),i}static xhrRequest(i,e,t,n,s,r,o,a){i.open(e,t,!0),i.timeout=r;for(let[l,c]of Object.entries(n))i.setRequestHeader(l,c);return i.onerror=()=>a&&a(null),i.onreadystatechange=()=>{if(i.readyState===k_.complete&&a){let l=this.parseJSON(i.responseText);a(l)}},o&&(i.ontimeout=o),i.send(s),i}static parseJSON(i){if(!i||i==="")return null;try{return JSON.parse(i)}catch{return console&&console.log("failed to parse JSON response",i),null}}static serialize(i,e){let t=[];for(var n in i){if(!Object.prototype.hasOwnProperty.call(i,n))continue;let s=e?`${e}[${n}]`:n,r=i[n];typeof r=="object"?t.push(this.serialize(r,s)):t.push(encodeURIComponent(s)+"="+encodeURIComponent(r))}return t.join("&")}static appendParams(i,e){if(Object.keys(e).length===0)return i;let t=i.match(/\?/)?"&":"?";return`${i}${t}${this.serialize(e)}`}},z_=i=>{let e="",t=new Uint8Array(i),n=t.byteLength;for(let s=0;s<n;s++)e+=String.fromCharCode(t[s]);return btoa(e)},cs=class{constructor(i,e){e&&e.length===2&&e[1].startsWith(yl)&&(this.authToken=atob(e[1].slice(yl.length))),this.endPoint=null,this.token=null,this.skipHeartbeat=!0,this.reqs=new Set,this.awaitingBatchAck=!1,this.currentBatch=null,this.currentBatchTimer=null,this.batchBuffer=[],this.onopen=function(){},this.onerror=function(){},this.onmessage=function(){},this.onclose=function(){},this.pollEndpoint=this.normalizeEndpoint(i),this.readyState=Nn.connecting,setTimeout(()=>this.poll(),0)}normalizeEndpoint(i){return i.replace("ws://","http://").replace("wss://","https://").replace(new RegExp("(.*)/"+vl.websocket),"$1/"+vl.longpoll)}endpointURL(){return _o.appendParams(this.pollEndpoint,{token:this.token})}closeAndRetry(i,e,t){this.close(i,e,t),this.readyState=Nn.connecting}ontimeout(){this.onerror("timeout"),this.closeAndRetry(1005,"timeout",!1)}isActive(){return this.readyState===Nn.open||this.readyState===Nn.connecting}poll(){const i={Accept:"application/json"};this.authToken&&(i["X-Phoenix-AuthToken"]=this.authToken),this.ajax("GET",i,null,()=>this.ontimeout(),e=>{if(e){var{status:t,token:n,messages:s}=e;if(t===410&&this.token!==null){this.onerror(410),this.closeAndRetry(3410,"session_gone",!1);return}this.token=n}else t=0;switch(t){case 200:s.forEach(r=>{setTimeout(()=>this.onmessage({data:r}),0)}),this.poll();break;case 204:this.poll();break;case 410:this.readyState=Nn.open,this.onopen({}),this.poll();break;case 403:this.onerror(403),this.close(1008,"forbidden",!1);break;case 0:case 500:this.onerror(500),this.closeAndRetry(1011,"internal server error",500);break;default:throw new Error(`unhandled poll status ${t}`)}})}send(i){typeof i!="string"&&(i=z_(i)),this.currentBatch?this.currentBatch.push(i):this.awaitingBatchAck?this.batchBuffer.push(i):(this.currentBatch=[i],this.currentBatchTimer=setTimeout(()=>{this.batchSend(this.currentBatch),this.currentBatch=null},0))}batchSend(i,e=0){this.awaitingBatchAck=!0;const t=e+O_,n=i.slice(e,t);this.ajax("POST",{"Content-Type":"application/x-ndjson"},n.join(`
`),()=>this.ontimeout(),s=>{!s||s.status!==200?(this.awaitingBatchAck=!1,this.onerror(s&&s.status),this.closeAndRetry(1011,"internal server error",!1)):t<i.length?this.batchSend(i,t):this.batchBuffer.length>0?(this.batchSend(this.batchBuffer),this.batchBuffer=[]):this.awaitingBatchAck=!1})}close(i,e,t){for(let s of this.reqs)s.abort();this.readyState=Nn.closed;let n=Object.assign({code:1e3,reason:void 0,wasClean:!0},{code:i,reason:e,wasClean:t});this.batchBuffer=[],this.awaitingBatchAck=!1,clearTimeout(this.currentBatchTimer),this.currentBatchTimer=null,typeof CloseEvent<"u"?this.onclose(new CloseEvent("close",n)):this.onclose(n)}ajax(i,e,t,n,s){let r,o=()=>{this.reqs.delete(r),n()};r=_o.request(i,this.endpointURL(),e,t,this.timeout,o,a=>{this.reqs.delete(r),this.isActive()&&s(a)}),this.reqs.add(r)}},Wr={HEADER_LENGTH:1,META_LENGTH:4,KINDS:{push:0,reply:1,broadcast:2},encode(i,e){if(i.payload.constructor===ArrayBuffer)return e(this.binaryEncode(i));{let t=[i.join_ref,i.ref,i.topic,i.event,i.payload];return e(JSON.stringify(t))}},decode(i,e){if(i.constructor===ArrayBuffer)return e(this.binaryDecode(i));{let[t,n,s,r,o]=JSON.parse(i);return e({join_ref:t,ref:n,topic:s,event:r,payload:o})}},binaryEncode(i){let{join_ref:e,ref:t,event:n,topic:s,payload:r}=i,o=new TextEncoder,a=o.encode(e),l=o.encode(t),c=o.encode(s),h=o.encode(n);this.assertFieldSize(a.byteLength,"join_ref"),this.assertFieldSize(l.byteLength,"ref"),this.assertFieldSize(c.byteLength,"topic"),this.assertFieldSize(h.byteLength,"event");let f=this.META_LENGTH+a.byteLength+l.byteLength+c.byteLength+h.byteLength,d=new ArrayBuffer(this.HEADER_LENGTH+f),u=new Uint8Array(d),g=new DataView(d),_=0;g.setUint8(_++,this.KINDS.push),g.setUint8(_++,a.byteLength),g.setUint8(_++,l.byteLength),g.setUint8(_++,c.byteLength),g.setUint8(_++,h.byteLength),u.set(a,_),_+=a.byteLength,u.set(l,_),_+=l.byteLength,u.set(c,_),_+=c.byteLength,u.set(h,_),_+=h.byteLength;var m=new Uint8Array(d.byteLength+r.byteLength);return m.set(u,0),m.set(new Uint8Array(r),d.byteLength),m.buffer},assertFieldSize(i,e){if(i>255)throw new Error(`unable to convert ${e} to binary: must be less than or equal to 255 bytes, but is ${i} bytes`)},binaryDecode(i){let e=new DataView(i),t=e.getUint8(0),n=new TextDecoder;switch(t){case this.KINDS.push:return this.decodePush(i,e,n);case this.KINDS.reply:return this.decodeReply(i,e,n);case this.KINDS.broadcast:return this.decodeBroadcast(i,e,n)}},decodePush(i,e,t){let n=e.getUint8(1),s=e.getUint8(2),r=e.getUint8(3),o=this.HEADER_LENGTH+this.META_LENGTH-1,a=t.decode(i.slice(o,o+n));o=o+n;let l=t.decode(i.slice(o,o+s));o=o+s;let c=t.decode(i.slice(o,o+r));o=o+r;let h=i.slice(o,i.byteLength);return{join_ref:a,ref:null,topic:l,event:c,payload:h}},decodeReply(i,e,t){let n=e.getUint8(1),s=e.getUint8(2),r=e.getUint8(3),o=e.getUint8(4),a=this.HEADER_LENGTH+this.META_LENGTH,l=t.decode(i.slice(a,a+n));a=a+n;let c=t.decode(i.slice(a,a+s));a=a+s;let h=t.decode(i.slice(a,a+r));a=a+r;let f=t.decode(i.slice(a,a+o));a=a+o;let d=i.slice(a,i.byteLength),u={status:f,response:d};return{join_ref:l,ref:c,topic:h,event:Kn.reply,payload:u}},decodeBroadcast(i,e,t){let n=e.getUint8(1),s=e.getUint8(2),r=this.HEADER_LENGTH+2,o=t.decode(i.slice(r,r+n));r=r+n;let a=t.decode(i.slice(r,r+s));r=r+s;let l=i.slice(r,i.byteLength);return{join_ref:null,ref:null,topic:o,event:a,payload:l}}},V_=class{constructor(i,e={}){this.stateChangeCallbacks={open:[],close:[],error:[],message:[]},this.channels=[],this.sendBuffer=[],this.ref=0,this.fallbackRef=null,this.timeout=e.timeout||F_,this.transport=e.transport||Dn.WebSocket||cs,this.primaryPassedHealthCheck=!1,this.longPollFallbackMs=e.longPollFallbackMs,this.fallbackTimer=null,this.sessionStore=e.sessionStorage||Dn&&Dn.sessionStorage,this.establishedConnections=0,this.defaultEncoder=Wr.encode.bind(Wr),this.defaultDecoder=Wr.decode.bind(Wr),this.closeWasClean=!0,this.disconnecting=!1,this.binaryType=e.binaryType||"arraybuffer",this.connectClock=1,this.transport!==cs?(this.encode=e.encode||this.defaultEncoder,this.decode=e.decode||this.defaultDecoder):(this.encode=this.defaultEncoder,this.decode=this.defaultDecoder);let t=null;Sn&&Sn.addEventListener&&(Sn.addEventListener("pagehide",n=>{this.conn&&(this.disconnect(),t=this.connectClock)}),Sn.addEventListener("pageshow",n=>{t===this.connectClock&&(t=null,this.connect())}),Sn.addEventListener("visibilitychange",()=>{this.handleVisibilityChange()}),Sn.document&&Sn.document.addEventListener("resume",()=>{this.handleVisibilityChange()})),this.heartbeatIntervalMs=e.heartbeatIntervalMs||3e4,this.rejoinAfterMs=n=>e.rejoinAfterMs?e.rejoinAfterMs(n):[1e3,2e3,5e3][n-1]||1e4,this.reconnectAfterMs=n=>e.reconnectAfterMs?e.reconnectAfterMs(n):[10,50,100,150,200,250,500,1e3,2e3][n-1]||5e3,this.logger=e.logger||null,!this.logger&&e.debug&&(this.logger=(n,s,r)=>{console.log(`${n}: ${s}`,r)}),this.longpollerTimeout=e.longpollerTimeout||2e4,this.params=vs(e.params||{}),this.endPoint=`${i}/${vl.websocket}`,this.vsn=e.vsn||N_,this.heartbeatTimeoutTimer=null,this.heartbeatTimer=null,this.pendingHeartbeatRef=null,this.reconnectTimer=new gd(()=>{if(this.pageHidden){this.log("Not reconnecting as page is hidden!"),this.teardown();return}this.teardown(()=>this.connect())},this.reconnectAfterMs),this.authToken=e.authToken&&vs(e.authToken)}get pageHidden(){return Sn&&Sn.document?Sn.document.visibilityState==="hidden":!1}handleVisibilityChange(){this.pageHidden||!this.isConnected()&&!this.closeWasClean&&this.teardown(()=>this.connect())}getLongPollTransport(){return cs}replaceTransport(i){this.connectClock++,this.closeWasClean=!0,clearTimeout(this.fallbackTimer),this.reconnectTimer.reset(),this.conn&&(this.conn.close(),this.conn=null),this.transport=i}protocol(){return location.protocol.match(/^https/)?"wss":"ws"}endPointURL(){let i=_o.appendParams(_o.appendParams(this.endPoint,this.params()),{vsn:this.vsn});return i.charAt(0)!=="/"?i:i.charAt(1)==="/"?`${this.protocol()}:${i}`:`${this.protocol()}://${location.host}${i}`}disconnect(i,e,t){this.connectClock++,this.disconnecting=!0,this.closeWasClean=!0,clearTimeout(this.fallbackTimer),this.reconnectTimer.reset(),this.teardown(()=>{this.disconnecting=!1,i&&i()},e,t)}connect(i){i&&(console&&console.log("passing params to connect is deprecated. Instead pass :params to the Socket constructor"),this.params=vs(i)),!(this.conn&&!this.disconnecting)&&(this.longPollFallbackMs&&this.transport!==cs?this.connectWithFallback(cs,this.longPollFallbackMs):this.transportConnect())}log(i,e,t){this.logger&&this.logger(i,e,t)}hasLogger(){return this.logger!==null}onOpen(i){let e=this.makeRef();return this.stateChangeCallbacks.open.push([e,i]),e}onClose(i){let e=this.makeRef();return this.stateChangeCallbacks.close.push([e,i]),e}onError(i){let e=this.makeRef();return this.stateChangeCallbacks.error.push([e,i]),e}onMessage(i){let e=this.makeRef();return this.stateChangeCallbacks.message.push([e,i]),e}ping(i){if(!this.isConnected())return!1;let e=this.makeRef(),t=Date.now();this.push({topic:"phoenix",event:"heartbeat",payload:{},ref:e});let n=this.onMessage(s=>{s.ref===e&&(this.off([n]),i(Date.now()-t))});return!0}transportName(i){return i===cs?"LongPoll":i.name}transportConnect(){this.connectClock++,this.closeWasClean=!1;let i;this.authToken&&(i=["phoenix",`${yl}${btoa(this.authToken()).replace(/=/g,"")}`]),this.conn=new this.transport(this.endPointURL(),i),this.conn.binaryType=this.binaryType,this.conn.timeout=this.longpollerTimeout,this.conn.onopen=()=>this.onConnOpen(),this.conn.onerror=e=>this.onConnError(e),this.conn.onmessage=e=>this.onConnMessage(e),this.conn.onclose=e=>this.onConnClose(e)}getSession(i){return this.sessionStore&&this.sessionStore.getItem(i)}storeSession(i,e){this.sessionStore&&this.sessionStore.setItem(i,e)}connectWithFallback(i,e=2500){clearTimeout(this.fallbackTimer);let t=!1,n=!0,s,r,o=this.transportName(i),a=l=>{this.log("transport",`falling back to ${o}...`,l),this.off([s,r]),n=!1,this.replaceTransport(i),this.transportConnect()};if(this.getSession(`phx:fallback:${o}`))return a("memorized");this.fallbackTimer=setTimeout(a,e),r=this.onError(l=>{this.log("transport","error",l),n&&!t&&(clearTimeout(this.fallbackTimer),a(l))}),this.fallbackRef&&this.off([this.fallbackRef]),this.fallbackRef=this.onOpen(()=>{if(t=!0,!n){let l=this.transportName(i);return this.primaryPassedHealthCheck||this.storeSession(`phx:fallback:${l}`,"true"),this.log("transport",`established ${l} fallback`)}clearTimeout(this.fallbackTimer),this.fallbackTimer=setTimeout(a,e),this.ping(l=>{this.log("transport","connected to primary after",l),this.primaryPassedHealthCheck=!0,clearTimeout(this.fallbackTimer)})}),this.transportConnect()}clearHeartbeats(){clearTimeout(this.heartbeatTimer),clearTimeout(this.heartbeatTimeoutTimer)}onConnOpen(){this.hasLogger()&&this.log("transport",`${this.transportName(this.transport)} connected to ${this.endPointURL()}`),this.closeWasClean=!1,this.disconnecting=!1,this.establishedConnections++,this.flushSendBuffer(),this.reconnectTimer.reset(),this.resetHeartbeat(),this.stateChangeCallbacks.open.forEach(([,i])=>i())}heartbeatTimeout(){this.pendingHeartbeatRef&&(this.pendingHeartbeatRef=null,this.hasLogger()&&this.log("transport","heartbeat timeout. Attempting to re-establish connection"),this.triggerChanError("heartbeat_timeout"),this.closeWasClean=!1,this.teardown(()=>this.reconnectTimer.scheduleTimeout(),B_,"heartbeat timeout"))}resetHeartbeat(){this.conn&&this.conn.skipHeartbeat||(this.pendingHeartbeatRef=null,this.clearHeartbeats(),this.heartbeatTimer=setTimeout(()=>this.sendHeartbeat(),this.heartbeatIntervalMs))}teardown(i,e,t){if(!this.conn)return i&&i();const n=this.conn;this.waitForBufferDone(n,()=>{e?n.close(e,t||""):n.close(),this.waitForSocketClosed(n,()=>{this.conn===n&&(this.conn.onopen=function(){},this.conn.onerror=function(){},this.conn.onmessage=function(){},this.conn.onclose=function(){},this.conn=null),i&&i()})})}waitForBufferDone(i,e,t=1){if(t===5||!i.bufferedAmount){e();return}setTimeout(()=>{this.waitForBufferDone(i,e,t+1)},150*t)}waitForSocketClosed(i,e,t=1){if(t===5||i.readyState===Nn.closed){e();return}setTimeout(()=>{this.waitForSocketClosed(i,e,t+1)},150*t)}onConnClose(i){this.conn&&(this.conn.onclose=()=>{});let e=i&&i.code;this.hasLogger()&&this.log("transport","close",i),this.triggerChanError("connection_closed"),this.clearHeartbeats(),!this.closeWasClean&&e!==1e3&&this.reconnectTimer.scheduleTimeout(),this.stateChangeCallbacks.close.forEach(([,t])=>t(i))}onConnError(i){this.hasLogger()&&this.log("transport","error",i);let e=this.transport,t=this.establishedConnections;this.stateChangeCallbacks.error.forEach(([,n])=>{n(i,e,t)}),(e===this.transport||t>0)&&this.triggerChanError("connection_error")}triggerChanError(i){this.channels.forEach(e=>{e.isErrored()||e.isLeaving()||e.isClosed()||e.trigger(Kn.error,{source:"transport",reason:i})})}connectionState(){switch(this.conn&&this.conn.readyState){case Nn.connecting:return"connecting";case Nn.open:return"open";case Nn.closing:return"closing";default:return"closed"}}isConnected(){return this.connectionState()==="open"}remove(i){this.off(i.stateChangeRefs),this.channels=this.channels.filter(e=>e!==i)}off(i){for(let e in this.stateChangeCallbacks)this.stateChangeCallbacks[e]=this.stateChangeCallbacks[e].filter(([t])=>i.indexOf(t)===-1)}channel(i,e={}){let t=new H_(i,e,this);return this.channels.push(t),t}push(i){if(this.hasLogger()){let{topic:e,event:t,payload:n,ref:s,join_ref:r}=i;this.log("push",`${e} ${t} (${r}, ${s})`,n)}this.isConnected()?this.encode(i,e=>this.conn.send(e)):this.sendBuffer.push(()=>this.encode(i,e=>this.conn.send(e)))}makeRef(){let i=this.ref+1;return i===this.ref?this.ref=0:this.ref=i,this.ref.toString()}sendHeartbeat(){this.pendingHeartbeatRef&&!this.isConnected()||(this.pendingHeartbeatRef=this.makeRef(),this.push({topic:"phoenix",event:"heartbeat",payload:{},ref:this.pendingHeartbeatRef}),this.heartbeatTimeoutTimer=setTimeout(()=>this.heartbeatTimeout(),this.heartbeatIntervalMs))}flushSendBuffer(){this.isConnected()&&this.sendBuffer.length>0&&(this.sendBuffer.forEach(i=>i()),this.sendBuffer=[])}onConnMessage(i){this.decode(i.data,e=>{let{topic:t,event:n,payload:s,ref:r,join_ref:o}=e;r&&r===this.pendingHeartbeatRef&&(this.clearHeartbeats(),this.pendingHeartbeatRef=null,this.heartbeatTimer=setTimeout(()=>this.sendHeartbeat(),this.heartbeatIntervalMs)),this.hasLogger()&&this.log("receive",`${s.status||""} ${t} ${n} ${r&&"("+r+")"||""}`,s);for(let a=0;a<this.channels.length;a++){const l=this.channels[a];l.isMember(t,n,s,o)&&l.trigger(n,s,r,o)}for(let a=0;a<this.stateChangeCallbacks.message.length;a++){let[,l]=this.stateChangeCallbacks.message[a];l(e)}})}leaveOpenTopic(i){let e=this.channels.find(t=>t.topic===i&&(t.isJoined()||t.isJoining()));e&&(this.hasLogger()&&this.log("transport",`leaving duplicate topic "${i}"`),e.leave())}};const G_="game:v1";function W_(i){return typeof i!="string"||i.startsWith("phoenix")||i.startsWith("phx_")||i.startsWith("chan_reply")}function X_(i,e){return W_(i)?null:e&&typeof e=="object"&&!Array.isArray(e)?{type:i,...e}:{type:i}}function q_(i){try{const e=new URL(i);return`${e.protocol==="wss:"?"https:":"http:"}//${e.host}`}catch{const e=typeof window<"u"?window.location:{protocol:"http:",hostname:"localhost"};return`${e.protocol}//${e.hostname}:3001`}}function $_(i,e){let t=null,n=null,s=!1,r=!1;async function o(){const l=await fetch(`${q_(e)}/api/auth/guest`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({guestId:i.guestId,nickname:i.nickname})});if(!l.ok)throw new Error(`guest token refused (HTTP ${l.status})`);const c=await l.json();if(!c?.token)throw new Error("guest token response missing token");return c.token}function a(){if(n)try{n.leave()}catch{}if(t)try{t.disconnect()}catch{}n=null,t=null,s=!1,r=!1}return{isOpen:()=>s,isConnecting:()=>r,connect(){s||r||(r=!0,o().then(l=>{t=new V_(e,{params:{token:l}}),t.onOpen(()=>{n=t.channel(G_,{guestId:i.guestId}),n.onMessage=(c,h,f)=>{const d=X_(c,h);return d&&s&&i.handleFrame(d),f(c,h)},n.join().receive("ok",()=>{s=!0,r=!1,i.handleOpen()}).receive("error",c=>{console.warn("game channel join refused:",c),a(),i.handleError(c),i.handleClose()})}),t.onClose(()=>{const c=s;a(),c&&i.handleClose()}),t.onError(c=>{if(r){r=!1,a(),i.handleError(c),i.handleClose();return}i.handleError(c)}),t.connect()}).catch(l=>{r=!1,i.handleError(l),i.handleClose()}))},send(l){if(!s||!n)return;const{type:c,...h}=l;n.push(c,h)},close(){a()}}}const Y_={},mh="afterlight-gardener-guest-id",ua="afterlight-gardener-nickname";function j_(i,e){return{isOpen:()=>!!(i.ws&&i.ws.readyState===WebSocket.OPEN),isConnecting:()=>!!(i.ws&&i.ws.readyState===WebSocket.CONNECTING),connect(){if(this.isOpen()||this.isConnecting())return;let t;try{t=new WebSocket(e)}catch(n){console.warn("WebSocket init failed, scheduling reconnect:",n.message),i.scheduleReconnect();return}i.ws=t,t.binaryType="arraybuffer",t.onopen=()=>i.handleOpen(),t.onmessage=n=>{if(typeof n.data!="string"){i.handleBinary&&i.handleBinary(n.data);return}const s=I_(n.data);!s||!s.type||i.handleFrame(s)},t.onclose=()=>i.handleClose(),t.onerror=n=>i.handleError(n)},send(t){i.ws.send(L_(t))},close(){i.ws&&i.ws.close()}}}class K_{constructor(e=null){this.wsUrl=e||this.getDefaultUrl(),this.guestId=this.getOrCreateGuestId(),this.nickname=this.getOrCreateNickname(),this.ws=null,this.connected=!1,this.handlers=new Map,this.connectListeners=[],this.disconnectListeners=[],this.reconnectAttempts=0,this.reconnectTimer=null,this.lastMovementSend=0,this.desiredRoom=null,this.transportMode=Y_?.VITE_TRANSPORT==="phoenix"?"phoenix":"node",this.transport=this.transportMode==="phoenix"?$_(this,this.wsUrl):j_(this,this.wsUrl)}getDefaultUrl(){return"wss://racknerd-3941d39-1.tail494d3.ts.net/ws"}getOrCreateGuestId(){try{let e=localStorage.getItem(mh);return(!e||typeof e!="string")&&(e="guest_"+Math.random().toString(36).substring(2,11)+"_"+Date.now().toString(36),localStorage.setItem(mh,e)),e}catch{return"guest_"+Math.random().toString(36).substring(2,11)}}getOrCreateNickname(){try{let e=localStorage.getItem(ua);return e||(e=go(),localStorage.setItem(ua,e)),ph(e)}catch{return go()}}setStoredNickname(e){this.nickname=ph(e);try{localStorage.setItem(ua,this.nickname)}catch{}}connect(){this.transport.isOpen()||this.transport.isConnecting()||this.transport.connect()}handleOpen(){this.connected=!0,this.reconnectAttempts=0,this.send(ge.HELLO,{guestId:this.guestId,nickname:this.nickname,...this.rtHello?{rt:this.rtHello}:{}}),this.desiredRoom&&this.send(ge.JOIN_ROOM,{roomId:this.desiredRoom}),this.connectListeners.forEach(e=>e())}handleFrame(e){const t=this.handlers.get(e.type);t&&t.forEach(n=>n(e))}handleClose(){this.connected=!1,this.disconnectListeners.forEach(e=>e()),this.scheduleReconnect()}handleError(e){console.warn("NetworkClient transport error:",e)}scheduleReconnect(){if(this.reconnectTimer)return;const e=Math.min(1e4,1e3*Math.pow(1.5,this.reconnectAttempts));this.reconnectAttempts++,this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect()},e)}on(e,t){this.handlers.has(e)||this.handlers.set(e,[]),this.handlers.get(e).push(t)}onConnect(e){this.connectListeners.push(e)}onDisconnect(e){this.disconnectListeners.push(e)}send(e,t={}){this.transport.isOpen()&&this.transport.send({type:e,...t})}sendMovement(e,t,n,s,r=!1,o=!1){const a=performance.now();a-this.lastMovementSend<80||(this.lastMovementSend=a,this.send(ge.MOVEMENT,{x:e,z:t,rotY:n,walking:s,sitting:!!r,airborne:!!o}))}sendTheaterQueue(e){this.send(ge.THEATER_QUEUE,e)}sendTheaterControl(e){this.send(ge.THEATER_CONTROL,e)}sendTheaterChannel(e,t){this.send(ge.THEATER_CHANNEL,{url:e,title:t})}sendTorrentResolve(e,t){this.send(ge.TORRENT_RESOLVE,{requestId:e,magnet:t})}sendPlaylistResolve(e,t){this.send(ge.THEATER_PLAYLIST_RESOLVE,{requestId:e,listId:t})}sendIptvListGet(e){this.send(ge.IPTV_LIST_GET,{listId:e})}sendIptvListRemove(e){this.send(ge.IPTV_LIST_REMOVE,{listId:e})}sendEpgLookup(e){this.send(ge.EPG_LOOKUP,{keys:e})}get apiBase(){try{const e=new URL(this.wsUrl);return`${e.protocol==="wss:"?"https:":"http:"}//${e.host}`}catch{const e=typeof window<"u"?window.location:{protocol:"http:",hostname:"localhost"};return`${e.protocol}//${e.hostname}:3001`}}async postToTheater(e,t,n,s){const r=new URLSearchParams(Object.entries(t||{}).filter(([,l])=>l!=null&&l!=="")).toString();let o;try{o=await fetch(`${this.apiBase}${e}${r?`?${r}`:""}`,{method:"POST",headers:s?{"Content-Type":s}:void 0,body:n})}catch{throw new Error("Could not reach the theater service — is the game server running?")}let a=null;try{a=await o.json()}catch{}if(!o.ok||!a?.ok)throw new Error(a?.error||`The theater refused that (HTTP ${o.status}).`);return a}uploadPlaylistText(e,t,n){return this.postToTheater("/api/theater/playlists",{name:t,by:n},e,"text/plain")}importPlaylistFromUrl(e,t,n){return this.postToTheater("/api/theater/playlists",{name:t,by:n},JSON.stringify({url:e}),"application/json")}uploadEpg(e,t){return this.postToTheater("/api/theater/epg",{name:t},e,"application/octet-stream")}sendGardenAction(e,t,n=null){const s=`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;return this.send(ge.GARDEN_ACTION,{actionId:s,action:e,bedIndex:t,seedCropId:n}),s}sendMarketBuy(e,t){this.send(ge.MARKET_BUY,{cropId:e,quantity:t})}sendMarketSell(e,t,n){this.send(ge.MARKET_SELL,{cropId:e,quality:t,quantity:n})}sendOrderPlace(e,t,n,s,r="B"){const o=`ord_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;return this.send(ge.ORDER_PLACE,{orderId:o,side:e,cropId:t,price:n,quantity:s,quality:r}),o}sendOrderCancel(e){this.send(ge.ORDER_CANCEL,{orderId:e})}sendContractComplete(e){this.send(ge.CONTRACT_COMPLETE,{contractId:e})}sendEmote(e="wave"){this.send(ge.EMOTE,{emote:e})}sendChat(e){this.send(ge.CHAT_SEND,{text:e})}setNickname(e){this.setStoredNickname(e),this.send(ge.SET_NICKNAME,{nickname:this.nickname})}joinRoom(e){this.desiredRoom=e,this.send(ge.JOIN_ROOM,{roomId:e})}}const ir=5.5,Xl=22,Z_=.35,J_=1.5;function Q_(){return{airborne:!1,y:0,vy:0,hopSpeed:0,chain:0}}function _d(i){return i.airborne=!1,i.y=0,i.vy=0,i.hopSpeed=0,i.chain=0,i}function ev(i,e,t){const{jumpPressed:n,jumpHeld:s,moving:r,speed:o,cap:a}=e;return i.airborne?(i.vy-=Xl*t,i.y+=i.vy*t,i.y<=0&&(i.y=0,s?(i.chain+=1,i.hopSpeed=Math.min(i.hopSpeed+Z_,a),i.vy=ir):_d(i))):(r||(i.hopSpeed=0,i.chain=0),n&&(i.airborne=!0,i.vy=ir,i.chain=1,i.hopSpeed=r?o:0)),i}function tv(i,e){return i.airborne&&i.hopSpeed>0?i.hopSpeed:e}const gh=2*ir/Xl,nv=ir*ir/(2*Xl),_h=1.5,dt=new Kt(1,1,1),ro=new oi(1,1,1,8),fa=new Map;function pn(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return fa.has(n)||fa.set(n,new Je({color:i,roughness:e,metalness:t})),fa.get(n)}function vh(i){const e=document.createElement("canvas");e.width=256,e.height=64;const t=e.getContext("2d");t.fillStyle="rgba(23, 33, 32, 0.85)",t.beginPath(),t.roundRect(8,8,240,48,12),t.fill(),t.strokeStyle="#c6b47a",t.lineWidth=2.5,t.stroke(),t.fillStyle="#e8d8b5",t.font='bold 24px "Space Mono", monospace, sans-serif',t.textAlign="center",t.textBaseline="middle",t.fillText(i,128,32);const n=new Pf(e);n.minFilter=bn;const s=new sd({map:n,transparent:!0,depthTest:!1}),r=new Ef(s);return r.scale.set(2.2,.55,1),r.position.set(0,2.3,0),r}function vd(i,e="Gardener"){const t=new mt,n=D_(i),s=pn(n.coat,.7,.1),r=pn(n.apron,.8,.05),o=pn(n.hat,.75,.1),a=pn(n.boots,.65,.3),l=pn("#563a24",.6,.2),c=pn("#b78d50",.45,.6),h=new Je({color:"#d8f8e3",emissive:"#acf7d5",emissiveIntensity:2.2}),f=new re(dt,s);f.position.set(0,.9,0),f.scale.set(.64,.75,.48),f.castShadow=!0,t.add(f);const d=new re(dt,r);d.position.set(0,.86,.25),d.scale.set(.48,.68,.05),t.add(d);for(const C of[-.16,.16]){const T=new re(dt,l);T.position.set(C,1.15,.22),T.scale.set(.06,.25,.04),t.add(T)}const u=new re(dt,l);u.position.set(.34,.75,.08),u.scale.set(.16,.28,.24),u.castShadow=!0,t.add(u);const g=new re(dt,l);g.position.set(.08,.96,.15),g.rotation.z=-.65,g.scale.set(.68,.05,.04),t.add(g);const _=new re(dt,s);_.position.set(0,1.45,0),_.scale.set(.72,.46,.54),_.castShadow=!0,t.add(_);const m=new re(dt,pn("#1c2828",.5,.5));m.position.set(0,1.45,.28),m.scale.set(.58,.28,.05),t.add(m);for(const C of[-.17,.17]){const T=new re(dt,h);T.position.set(C,1.46,.31),T.scale.set(.1,.08,.04),t.add(T)}const p=new re(ro,o);p.position.set(0,1.7,0),p.scale.set(.65,.06,.65),t.add(p);const E=new re(dt,o);E.position.set(0,1.84,0),E.scale.set(.5,.24,.44),t.add(E);const b=new re(dt,l);b.position.set(0,1.75,0),b.scale.set(.52,.05,.46),t.add(b);const M=[];for(const C of[-.38,.38]){const T=new mt;T.position.set(C,1.2,0),t.add(T),M.push(T);const F=new re(dt,s);F.position.set(0,-.24,0),F.scale.set(.14,.5,.2),T.add(F);const D=new re(dt,l);D.position.set(0,-.54,0),D.scale.set(.13,.16,.18),T.add(D)}const R=new mt;R.position.set(.42,.65,.2);const w=new re(ro,c);w.scale.set(.12,.25,.12),R.add(w);const L=new re(ro,c);L.position.set(0,.12,.16),L.rotation.x=.6,L.scale.set(.03,.22,.03),R.add(L),R.visible=!1,t.add(R);const I=[];for(const C of[-.18,.18]){const T=new mt;T.position.set(C,.5,0);const F=new re(dt,s);F.position.set(0,-.14,0),F.scale.set(.18,.32,.2),T.add(F);const D=new re(dt,a);D.position.set(0,-.36,.06),D.scale.set(.2,.18,.34),D.castShadow=!0,T.add(D),t.add(T),I.push(T)}const v=vh(e);t.add(v);const y=new mt;for(const C of[...t.children])C!==v&&y.add(C);return t.add(y),t.userData={playerId:i,nickname:e,legs:I,arms:M,rig:y,emote:null,canGroup:R,nameSprite:v,setWateringCan(C){R.visible=C},updateNickname(C){t.remove(v);const T=vh(C);t.add(T),t.userData.nameSprite=T,t.userData.nickname=C}},t}class iv{constructor(e){this.scene=e,this.players=new Map}setPlayer(e){if(!e||!e.id)return;let t=this.players.get(e.id);if(t)t.targetX=e.x,t.targetZ=e.z,t.targetRotY=e.rotY,t.walking=!!e.walking,t.sitting=!!e.sitting,e.airborne&&!t.airborne&&(t.hopT=0),t.airborne=!!e.airborne,e.nickname&&e.nickname!==t.avatar.userData.nickname&&t.avatar.userData.updateNickname(e.nickname);else{const n=vd(e.id,e.nickname||"Gardener");n.position.set(e.x??0,0,e.z??0),n.rotation.y=e.rotY??0,this.scene.add(n),t={avatar:n,targetX:e.x??0,targetZ:e.z??0,targetRotY:e.rotY??0,walking:!!e.walking,sitting:!!e.sitting,airborne:!!e.airborne,hopT:0},this.players.set(e.id,t)}}removePlayer(e){const t=this.players.get(e);t&&(this.scene.remove(t.avatar),this.players.delete(e))}clear(){for(const e of this.players.values())this.scene.remove(e.avatar);this.players.clear()}update(e,t){const n=Math.min(1,e*12);for(const s of this.players.values()){const{avatar:r,targetX:o,targetZ:a,targetRotY:l,walking:c,sitting:h,airborne:f}=s;r.position.x+=(o-r.position.x)*n,r.position.z+=(a-r.position.z)*n;let d=l-r.rotation.y;for(;d<-Math.PI;)d+=Math.PI*2;for(;d>Math.PI;)d-=Math.PI*2;if(r.rotation.y+=d*n,(c||f)&&fr(r),f&&(s.hopT=Math.min(s.hopT+e,_h)),h)r.position.y=0,r.userData.legs.forEach(u=>{u.rotation.x=-1.35});else if(f&&s.hopT<_h){const u=s.hopT%gh/gh;r.position.y=4*nv*u*(1-u),r.userData.legs.forEach(g=>{g.rotation.x=-.8})}else c?(r.position.y=Math.sin(t*12)*.025,r.userData.legs.forEach((u,g)=>{u.rotation.x=Math.sin(t*12+g*Math.PI)*.45})):(r.position.y=0,r.userData.legs.forEach(u=>{u.rotation.x*=.8}));xd(r,e)}}}function sv(){const i=new mt,e=pn("#e6e0cc",.65,.2),t=pn("#233c3e",.6,.3),n=pn("#9c5838",.7,.2),s=pn("#b78d50",.5,.4),r=pn("#455759",.6,.3),o=new Je({color:"#d8f8e3",emissive:"#acf7d5",emissiveIntensity:2}),a=new re(dt,e);a.position.set(0,.85,0),a.scale.set(.62,.7,.48),i.add(a);const l=new re(dt,t);l.position.set(0,.92,.265),l.scale.set(.38,.35,.07),i.add(l);for(let m=0;m<3;m++){const p=new re(dt,n);p.position.set(0,.8+m*.095,.31),p.scale.set(.27,.035,.025),i.add(p)}const c=new re(dt,e);c.position.set(0,1.4,0),c.scale.set(.78,.46,.58),i.add(c);const h=new re(dt,t);h.position.set(0,1.4,.303),h.scale.set(.66,.3,.055),i.add(h);for(const m of[-.2,.2]){const p=new re(dt,o);p.position.set(m,1.43,.34),p.scale.set(.12,.1,.045),i.add(p)}const f=new re(dt,r);f.position.set(0,1.66,0),f.scale.set(.87,.08,.65),i.add(f);const d=new re(ro,n);d.position.set(.23,1.85,0),d.scale.set(.025,.3,.025),i.add(d);const u=new re(dt,s);u.position.set(.23,2.01,0),u.scale.set(.075,.075,.075),i.add(u);const g=new re(dt,r);g.position.set(0,.93,-.34),g.scale.set(.48,.53,.25),i.add(g);const _=[];for(const m of[-.22,.22]){const p=new mt;p.position.set(m,.52,0);const E=new re(dt,r);E.position.set(0,-.15,0),E.scale.set(.17,.33,.19),p.add(E);const b=new re(dt,e);b.position.set(0,-.34,.09),b.scale.set(.24,.16,.38),p.add(b),i.add(p),_.push(p);const M=new re(dt,e);M.position.set(m*1.9,.86,0),M.scale.set(.18,.53,.22),i.add(M)}return i.scale.setScalar(.68),i.userData.legs=_,i.castShadow=!0,i}function yd(i,e){!i||!Nh(e)||(fr(i),i.userData.emote={id:e,elapsed:0})}function fr(i){const e=i?.userData;e?.rig&&(e.emote=null,e.rig.rotation.set(0,0,0),e.rig.position.set(0,0,0),e.arms.forEach(t=>t.rotation.set(0,0,0)))}function xd(i,e){const t=i.userData,n=t.emote;if(!n)return;n.elapsed+=e;const s=n.elapsed;if(s>=Do){fr(i);return}const r=Math.min(1,s/.25,(Do-s)/.4),[o,a]=t.arms;switch(t.rig.rotation.set(0,0,0),t.rig.position.set(0,0,0),o.rotation.set(0,0,0),a.rotation.set(0,0,0),n.id){case"wave":a.rotation.z=(2.5+Math.sin(s*13)*.35)*r;break;case"dance":t.rig.rotation.z=Math.sin(s*7)*.16*r,t.rig.rotation.y=Math.sin(s*4)*.4*r,o.rotation.x=Math.sin(s*7)*.9*r,a.rotation.x=-o.rotation.x,o.rotation.z=-.65*r,a.rotation.z=.65*r;break;case"cheer":o.rotation.z=-2.6*r,a.rotation.z=2.6*r,t.rig.position.y=Math.abs(Math.sin(s*7))*.12*r;break;case"heart":o.rotation.x=a.rotation.x=-1.2*r,o.rotation.z=.65*r,a.rotation.z=-.65*r,t.rig.rotation.z=Math.sin(s*3)*.1*r;break;case"bow":t.rig.rotation.x=Math.sin(Math.min(1,s/Do)*Math.PI)*.55,a.rotation.x=-1*r,a.rotation.z=-.6*r;break;case"shrug":o.rotation.z=-1.15*r,a.rotation.z=1.15*r,o.rotation.x=a.rotation.x=-.5*r,t.rig.rotation.z=Math.sin(s*3)*.13*r;break}}const pa=new Kt(1,1,1),rv=new oi(1,1,1,8),ma=new Map;function $e(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return ma.has(n)||ma.set(n,new Je({color:i,roughness:e,metalness:t})),ma.get(n)}function ov(){const i=new mt;i.name="market";const e=[],t=[],n=[];function s(Q,z,Y,de,Re,xe,Be,Et=i){const P=new re(pa,typeof Be=="string"?$e(Be):Be);return P.position.set(Q,z,Y),P.scale.set(de,Re,xe),P.castShadow=!0,P.receiveShadow=!0,Et.add(P),P}function r(Q,z,Y,de){e.push({x:Q,z,w:Y/2+.38,d:de/2+.38})}function o(Q,z,Y,de,Re,xe,Be,Et=1.5){const P=s(Q,z,Y,de,Re,xe,Be);return P.material=new Je({color:Be,emissive:Be,emissiveIntensity:Et}),P}function a(Q,z,Y,de="#ffc775"){s(Q,z,Y,.3,.48,.3,new Je({color:"#fff2c6",emissive:de,emissiveIntensity:2.5})),s(Q,z+.28,Y,.46,.1,.44,$e("#192d2d")),s(Q,z-.28,Y,.36,.1,.35,$e("#192d2d"));const Re=new Gl(de,6,7,2);return Re.position.set(Q,z-.1,Y+.2),i.add(Re),Re}s(0,-.6,0,28,1,25,$e("#242f2b")),s(0,-.12,0,24,.4,21,$e("#3d4944",.27,.32));const l=["#485450","#535e55","#647065","#70776a","#3a4845","#7b7e6d"];let c=42;function h(){return c=c*1664525+1013904223>>>0,c/4294967296}for(let Q=-12;Q<12;Q++)for(let z=-10;z<11;z++){const Y=new Oe(l[Math.floor(h()*l.length)]).multiplyScalar(.75+h()*.25);s(Q+.49+z%2*.05,.06+h()*.03,z+.47,.96,.16,.96,$e("#"+Y.getHexString(),.3+h()*.3,.2))}for(let Q=0;Q<40;Q++){const z=new re(new Bl(.4+h()*.9,9),$e("#516564",.07,.62));z.rotation.x=-Math.PI/2,z.position.set((h()-.5)*22,.183,(h()-.5)*19),z.scale.y=.4+h()*.4,i.add(z)}for(let Q=-12;Q<=12;Q+=.8)for(let z=.4;z<3;z+=.4)s(Q,z,-10.5,.76,.37,.65,z>2.6?"#a0a18a":"#4d6561");for(let Q=-10;Q<11;Q+=.8)for(const z of[-12,12])Math.abs(Q)<2||(s(z,.65,Q,.5,1.3,.76,$e("#192d2d")),s(z,1.35,Q,.7,.15,.78,$e("#485450")));const f=0,d=-7.5;s(f,1.5,d,5.5,3,1.4,$e("#3f3224")),r(f,d,5.5,1.4);for(const Q of[-2.5,2.5]){const z=new re(rv,$e("#2d241c"));z.position.set(f+Q,2.2,d+.9),z.scale.set(.08,3.4,.08),i.add(z)}const u=s(f,3.6,d+.4,6,.25,2.4,$e("#7b4c34",.8));u.rotation.x=.18,s(f,1.8,d+.72,4.4,1.8,.08,$e("#1a2422",.9,.1)),a(f-1.8,2.8,d+.8),a(f+1.8,2.8,d+.8),t.push({type:"market_board",x:f,z:d+1.5,title:"Market Exchange Board",sub:"Press E to view spot prices, create orders, and trade"});const g=-6.5,_=-4.5;s(g,.9,_,3.6,1.8,2,$e("#4a3b2b")),r(g,_,3.6,2),s(g,1.85,_,3.8,.1,2.2,$e("#63523f"));for(let Q=-1;Q<=1;Q++)s(g+Q*.9,2.1,_,.6,.5,.6,$e(["#b8aa83","#a29571","#c4b693"][Q+1]));a(g,2.8,_+.8,"#ffdf96"),t.push({type:"seed_vendor",x:g,z:_+1.6,title:"Town Seed Merchant",sub:"Press E to browse seeds, tubers, and planting starts"});const m=6.5,p=-4.5;s(m,1.4,p,3.4,2.8,1,$e("#2d3c39")),r(m,p,3.4,1),s(m,1.6,p+.52,2.8,1.6,.06,$e("#d0c5a0",.85,.05)),a(m,2.9,p+.6,"#ffd580"),t.push({type:"contracts_board",x:m,z:p+1.5,title:"Restaurant & Café Noticeboard",sub:"Press E to fulfill delivery contracts for coins and reputation"});for(const[Q,z,Y]of[[-8,4,1.1],[-9.2,4.2,.9],[8.5,5,1],[9.5,5.4,.9],[-3,-3,.8],[3,-3,.8],[-8.5,-8,1.2],[8.5,-8,1.2]])s(Q,Y*.5,z,Y,Y,Y,$e("#634932")),r(Q,z,Y,Y);const E=10.7,b=0;for(const Q of[-1.5,1.5])s(E,1.8,Q,.6,3.6,.6,$e("#273d3d")),o(E,3.6,Q,.8,.3,.8,"#74d0bd",2);s(E,3.8,0,.8,.35,3.6,$e("#273d3d")),t.push({type:"garden_gate",x:E,z:b,title:"Travel to Your Market Garden",sub:"Press E to walk the path to your personal plot"});const M=-10.7,R=0;for(const Q of[-1.5,1.5])s(M,1.8,Q,.6,3.6,.6,$e("#273d3d")),o(M,3.6,Q,.8,.3,.8,"#e0c889",2);s(M,3.8,0,.8,.35,3.6,$e("#273d3d")),t.push({type:"district_gate",targetDistrict:"canal",x:M,z:R,title:"The Outer Districts Gateway",sub:"Press E to venture into the ancient city biomes"});const w=new mt;w.name="dynamic",i.add(w);const L={restored:!1},I=3,v=7.6;s(I,1.6,v,2.6,3.2,2.6,$e("#5a5f58",.75,.12),w),s(I,3.3,v,2.9,.28,2.9,$e("#6d7268"),w),s(I,.35,v,3,.7,3,$e("#454a44"),w),r(I,v,2.6,2.6),s(I,.75,v-1.32,.9,1.5,.12,$e("#2c2620"),w);const y=o(I,1,v-1.36,.7,1,.05,"#e0a865",.4);w.add(y);const C=new mt;w.add(C);const T=s(I,3.8,v,2.2,.5,2.2,$e("#4a3b2b"),C);T.rotation.z=.28;const F=s(I-1.9,.5,v-1.7,2.4,.16,.22,$e("#6b5845"),C);F.rotation.z=.1;const D=s(I+1.75,.55,v-1.5,1,1,.35,$e("#7d827a"),C);D.rotation.z=.35;const B=new mt;w.add(B),s(I,3.85,v,2.5,.55,2.5,$e("#63513a"),B),s(I,4.25,v,1.4,.35,1.4,$e("#54452f"),B);const N=new mt;N.position.set(I,3.6,v-1.42),B.add(N),s(I,3.6,v-1.35,.5,.5,.4,$e("#8a744f"),N);for(let Q=0;Q<4;Q++){const z=s(0,0,0,2.3,.5,.08,$e("#a08a5f",.7),N);z.position.set(Math.cos(Q*Math.PI/2)*1.35,Math.sin(Q*Math.PI/2)*1.35,-.18),z.rotation.z=Q*Math.PI/2}const q=o(I+1,1.9,v-1.36,.2,.3,.08,"#ffcb79",1.4);B.add(q);const V=o(I,1.05,v-1.38,.8,.5,.05,"#f0b060",.8);B.add(V),t.push({type:"mill",x:I,z:5.6,title:"The Great Mill (broken)",sub:"Press E to help restore it with materials"});const Z=5.8,ee=7.4;s(Z,.55,ee,1.5,.9,1.1,$e("#4a3b2b"),w),s(Z,1.05,ee,1.6,.12,1.2,$e("#5f4d36"),w),r(Z,ee,1.5,1.1),s(Z-.35,1.25,ee,.5,.3,.5,$e("#7d827a"),w),s(Z+.4,1.22,ee-.15,.3,.24,.3,$e("#c07840"),w),t.push({type:"machine_bench",x:Z,z:6.2,title:"Machine Shop Workbench",sub:"Press E to contribute materials & craft garden tools"});function ce(Q){const z=Q?.mill?.status==="restored";L.restored=z,C.visible=!z,B.visible=z;const Y=t.find(de=>de.type==="mill");Y&&(Y.title=z?"The Great Mill":"The Great Mill (broken)",Y.sub=z?"Press E to mill wheat into flour":"Press E to help restore it with materials")}ce(null);const Ee=i.children.filter(Q=>Q.isMesh&&Q.geometry===pa&&!Q.material.transparent&&Q.material.emissive?.getHex()===0),He=new Eo(pa,new Je({color:16777215,roughness:.62,metalness:.2}),Ee.length);Ee.forEach((Q,z)=>{Q.updateMatrix(),He.setMatrixAt(z,Q.matrix),He.setColorAt(z,Q.material.color),i.remove(Q)}),He.castShadow=!0,He.receiveShadow=!0,i.add(He);function Qe(Q){n.forEach(z=>z(Q)),L.restored&&(N.rotation.z=Q*.55)}return{group:i,obstacles:e,items:t,update:Qe,setMachineState:ce}}const vn={radish:{id:"radish",name:"Red Radish",tagline:"Crisp peppery roots, fast to harvest.",seedCost:4,basePrice:8,growDuration:25,waterDemand:1,yield:2,repeatHarvest:!1,color:"#4d8050",produceColor:"#c93b4a",xp:12,unlockLevel:1},lettuce:{id:"lettuce",name:"Rain Crisp Lettuce",tagline:"Tender layered greens favored by market cafes.",seedCost:6,basePrice:12,growDuration:40,waterDemand:1.2,yield:2,repeatHarvest:!1,color:"#65a759",produceColor:"#83cf72",xp:18,unlockLevel:1},carrot:{id:"carrot",name:"Amber Carrot",tagline:"Deep sweet orange taproots grown in dark tilled soil.",seedCost:8,basePrice:17,growDuration:60,waterDemand:.9,yield:2,repeatHarvest:!1,color:"#498845",produceColor:"#e07a2a",xp:25,unlockLevel:1},kale:{id:"kale",name:"Winter Kale",tagline:"Hearty ruffled brassica that thrives in cold rain.",seedCost:12,basePrice:24,growDuration:80,waterDemand:.8,yield:3,repeatHarvest:!1,color:"#2d6148",produceColor:"#3d785a",xp:32,unlockLevel:2},basil:{id:"basil",name:"Copper Basil",tagline:"Aromatic dark purple-green leaves prized by the apothecary.",seedCost:15,basePrice:32,growDuration:100,waterDemand:1.3,yield:3,repeatHarvest:!1,color:"#425a40",produceColor:"#7b3e64",xp:40,unlockLevel:2},tomato:{id:"tomato",name:"Lantern Tomato",tagline:"Heavy climbing vine with glowing scarlet fruit. Continues bearing.",seedCost:22,basePrice:28,growDuration:120,waterDemand:1.1,yield:3,repeatHarvest:!0,regrowDuration:45,color:"#3f7842",produceColor:"#d6422f",xp:50,unlockLevel:3},strawberry:{id:"strawberry",name:"Dew Strawberry",tagline:"Low creeping runners with bright sweet red berries.",seedCost:28,basePrice:38,growDuration:140,waterDemand:1.4,yield:4,repeatHarvest:!0,regrowDuration:50,color:"#39784b",produceColor:"#e6324b",xp:65,unlockLevel:3},wheat:{id:"wheat",name:"Hearth Wheat",tagline:"Golden milling grain. The Great Mill grinds it into flour.",seedCost:4,basePrice:9,growDuration:30,waterDemand:1,yield:2,repeatHarvest:!1,color:"#8a8a3d",produceColor:"#d9b45a",xp:14,unlockLevel:1}},xl=Object.values(vn),Zn={EMPTY:0,PREPARED:1,SEED:2,SPROUT:3,JUVENILE:4,MATURE:5,HARVESTABLE:6},av={C:.8,B:1,A:1.35,"A+":1.8},zs=new Kt(1,1,1),yh=new zl(1,6,6),Xr=new oi(1,1,1,6),ga=new Map;function Vs(i,e=.65,t=.1,n=0,s=0){const r=`${i}_${e}_${t}_${n}_${s}`;return ga.has(r)||ga.set(r,new Je({color:i,roughness:e,metalness:t,emissive:n,emissiveIntensity:s})),ga.get(r)}function lv(i,e,t){for(;i.children.length>0;)i.remove(i.children[0]);if(!e||t<=Zn.PREPARED)return;const n=vn[e]??vn.radish,s=Vs(n.color,.6,.1),r=Vs(n.produceColor,.4,.15,n.produceColor,.25);if(t===Zn.SEED){for(const[o,a]of[[-.2,-.15],[.2,.15],[0,0]]){const l=new re(zs,Vs("#829b65",.8));l.position.set(o,.08,a),l.scale.set(.06,.08,.06),l.castShadow=!0,i.add(l)}return}if(t===Zn.SPROUT){const o=new re(Xr,Vs("#55864e",.7));o.position.set(0,.15,0),o.scale.set(.025,.25,.025),i.add(o);for(let a=0;a<2;a++){const l=new re(zs,s);l.position.set(a===0?-.07:.07,.24,0),l.scale.set(.12,.03,.08),l.rotation.z=(a===0?-1:1)*.4,i.add(l)}return}if(t===Zn.JUVENILE){for(let o=0;o<3;o++){const a=o*Math.PI*2/3,l=new re(Xr,s);l.position.set(Math.cos(a)*.08,.25,Math.sin(a)*.08),l.scale.set(.035,.45,.035),l.rotation.z=Math.cos(a)*.25,l.rotation.x=Math.sin(a)*.25,i.add(l);const c=new re(zs,s);c.position.set(Math.cos(a)*.16,.45,Math.sin(a)*.16),c.scale.set(.22,.06,.16),c.rotation.y=a,i.add(c)}return}if(t===Zn.MATURE||t===Zn.HARVESTABLE){const o=t===Zn.HARVESTABLE,a=o?1:.85;if(e==="tomato"){const l=new re(Xr,Vs("#5b4834",.8));l.position.set(0,.5,0),l.scale.set(.04,1,.04),i.add(l)}for(let l=0;l<5;l++){const c=l*Math.PI*2/5,h=new re(zs,s);h.position.set(Math.cos(c)*.2*a,.35+l%2*.15,Math.sin(c)*.2*a),h.scale.set(.3*a,.1,.22*a),h.rotation.set(Math.sin(c)*.3,c,Math.cos(c)*.3),h.castShadow=!0,i.add(h)}if(o)if(e==="radish"||e==="carrot")for(let l=0;l<3;l++){const c=(l-1)*.18,h=new re(e==="carrot"?Xr:yh,r);h.position.set(c,e==="carrot"?.2:.16,0),h.scale.set(.12,.22,.12),h.castShadow=!0,i.add(h)}else if(e==="tomato"||e==="strawberry")for(let l=0;l<4;l++){const c=l*Math.PI*2/4+.3,h=new re(yh,r);h.position.set(Math.cos(c)*.25,.38+l%2*.15,Math.sin(c)*.25),h.scale.set(.13,.14,.13),h.castShadow=!0,i.add(h)}else for(let l=0;l<4;l++){const c=l*Math.PI*2/4,h=new re(zs,r);h.position.set(Math.cos(c)*.15,.55,Math.sin(c)*.15),h.scale.set(.24,.08,.18),h.rotation.set(.2,c+.4,.2),h.castShadow=!0,i.add(h)}}}function cv(i,e=4){const t=[];if(!Number.isInteger(i)||i<0)return t;const n=i%e;return i-e>=0&&t.push(i-e),n>0&&t.push(i-1),t.push(i),n<e-1&&t.push(i+1),t.push(i+e),t}const ql={copper:{id:"copper",name:"Copper Scrap",tagline:"Pipe stubs and verdigris sheeting pried from the foundry floor.",color:"#c07840",glowColor:"#e8934a",district:"foundry"},timber:{id:"timber",name:"Trestle Timber",tagline:"Sound oak beams cut free of the overgrown viaduct.",color:"#7a5a38",glowColor:"#c9a05e",district:"trestle"},glass:{id:"glass",name:"Glass Shards",tagline:"Thick panes of uncracked glass swept from the frost-line benches.",color:"#9fc4d8",glowColor:"#cfeaf7",district:"frost-spire"}},xh=Object.values(ql),Ii={flour:{id:"flour",name:"Stone-Ground Flour",tagline:"Fine milled flour from the Great Mill. Bakers pay a premium.",basePrice:14}},hv=Object.values(Ii),Md={copper:4,timber:4,glass:4},hs={id:"sprinkler",name:"Garden Sprinkler",cost:{copper:2,glass:2}},dv=[{id:"foundry_copper_1",district:"foundry",material:"copper",position:[4,2.5],respawnMs:18e4},{id:"foundry_copper_2",district:"foundry",material:"copper",position:[8.5,1],respawnMs:18e4},{id:"foundry_copper_3",district:"foundry",material:"copper",position:[-3.5,2.5],respawnMs:18e4},{id:"trestle_timber_1",district:"trestle",material:"timber",position:[6.5,2],respawnMs:18e4},{id:"trestle_timber_2",district:"trestle",material:"timber",position:[2.5,-2],respawnMs:18e4},{id:"trestle_timber_3",district:"trestle",material:"timber",position:[-3.5,-2],respawnMs:18e4},{id:"glasshouse_glass_1",district:"frost-spire",material:"glass",position:[8.5,2.5],respawnMs:18e4},{id:"glasshouse_glass_2",district:"frost-spire",material:"glass",position:[-3,.5],respawnMs:18e4},{id:"glasshouse_glass_3",district:"frost-spire",material:"glass",position:[2.5,3.5],respawnMs:18e4}],Ai=new Kt(1,1,1),uv=new oi(1,1,1,8),_a=new Map;function Tt(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return _a.has(n)||_a.set(n,new Je({color:i,roughness:e,metalness:t})),_a.get(n)}function fv(){const i=new mt;i.name="garden";const e=[],t=[],n=[];function s(D,B,N,q,V,Z,ee,ce=i){const Ee=new re(Ai,typeof ee=="string"?Tt(ee):ee);return Ee.position.set(D,B,N),Ee.scale.set(q,V,Z),Ee.castShadow=!0,Ee.receiveShadow=!0,ce.add(Ee),Ee}function r(D,B,N,q){e.push({x:D,z:B,w:N/2+.38,d:q/2+.38})}function o(D,B,N,q,V,Z,ee,ce=1.5){const Ee=s(D,B,N,q,V,Z,ee);return Ee.material=new Je({color:ee,emissive:ee,emissiveIntensity:ce}),Ee}function a(D,B,N,q="#ffdf96"){s(D,B,N,.25,.4,.25,new Je({color:"#fff2c6",emissive:q,emissiveIntensity:2.5})),s(D,B+.22,N,.38,.08,.38,Tt("#232a28"));const V=new Gl(q,5,6,2);return V.position.set(D,B,N),i.add(V),V}s(0,-.6,0,28,1,26,Tt("#272b22")),s(0,-.12,0,25,.4,23,Tt("#383e2f",.85,.1));const l=Tt("#565b4c",.8,.1);s(0,.07,0,24,.12,2.5,l),s(0,.07,0,2.5,.12,20,l);for(let D=-12;D<=12;D+=.8)s(D,.6,-10.5,.76,1.2,.65,Tt("#414b38")),s(D,.6,10.5,.76,1.2,.65,Tt("#414b38"));for(let D=-10;D<=10;D+=.8)for(const B of[-12,12])Math.abs(D)<2||s(B,.6,D,.65,1.2,.76,Tt("#414b38"));const c=-10.7,h=0;for(const D of[-1.4,1.4])s(c,1.8,D,.5,3.4,.5,Tt("#2d3835")),o(c,3.4,D,.7,.25,.7,"#74d0bd",2);s(c,3.6,0,.7,.3,3.3,Tt("#2d3835")),t.push({type:"market_gate",x:c,z:h,title:"Return to Market Court",sub:"Press E to walk back to the town market square"});const f=[[-6,-7],[-2,-7],[2,-7],[6,-7],[-6,-4],[-2,-4],[2,-4],[6,-4],[-6,4],[-2,4],[2,4],[6,4]];for(let D=0;D<f.length;D++){const[B,N]=f[D],q=2.4,V=1.6;s(B,.25,N,q+.2,.35,V+.2,Tt("#4d3e2c",.8,.1));const Z=new Oe("#382c1e"),ee=new re(Ai,new Je({color:Z.clone(),roughness:.85,metalness:.05}));ee.position.set(B,.35,N),ee.scale.set(q,.15,V),ee.castShadow=!0,ee.receiveShadow=!0,i.add(ee),r(B,N,q*.7,V*.7);const ce=new mt;ce.position.set(B,.42,N),i.add(ce),n.push({bedIndex:D,soilMesh:ee,plantGroup:ce,x:B,z:N,renderedCrop:null,renderedStage:-1}),t.push({type:"bed",bedIndex:D,x:B,z:N,title:`Garden Bed #${D+1}`,sub:"Empty. Select Hoe to prepare or Seed to plant."})}const d=-8.8,u=-8;s(d,1.8,u,3.2,3.2,2.6,Tt("#3f3323")),r(d,u,3.2,2.6);const g=s(d,3.5,u,3.6,.15,3,Tt("#52605f",.4,.5));g.rotation.z=-.15,a(d+1.2,2.6,u+1.4);const _=-8.5,m=-2.5;s(_,.45,m,1.4,.8,2,Tt("#443727")),r(_,m,1.4,2);const p=new re(new Rn(1.1,1.7),new Je({color:"#346d78",roughness:.1,metalness:.7,transparent:!0,opacity:.85}));p.rotation.x=-Math.PI/2,p.position.set(_,.82,m),i.add(p),t.push({type:"water_source",x:_+.8,z:m,title:"Rainwater Cistern",sub:"Clean water caught from the greenhouse gutters"});const E=9,b=-7.5;s(E,.6,b,2.4,1,2.2,Tt("#403425")),r(E,b,2.4,2.2),s(E,.9,b,2,.5,1.8,Tt("#261e14",.9));const M=9,R=5;s(M,.6,R,2.5,.9,3.2,Tt("#54432f")),r(M,R,2.5,3.2);const w=new re(uv,Tt("#707b78",.3,.6));w.position.set(M,1.2,R-.6),w.scale.set(.45,.45,.45),i.add(w),a(M-.8,2.4,R);const L=[],I=new dr(.62,.72,24);for(let D=0;D<5;D++){const B=new re(I,new Cs({color:"#7fd0e8",side:rn,transparent:!0,opacity:.55}));B.rotation.x=-Math.PI/2,B.position.y=.3,B.visible=!1,i.add(B),L.push(B)}function v(D){const B=Number.isInteger(D)&&D>=0?cv(D).filter(N=>n[N]):[];L.forEach((N,q)=>{const V=B[q];if(V===void 0){N.visible=!1;return}const Z=n[V];N.position.set(Z.x,.3,Z.z),N.visible=!0})}function y(D){const B=new Map((D||[]).map(N=>[N.bedIndex,N]));for(const N of n){const q=B.get(N.bedIndex);if(q&&!N.fixtureGroup){const V=new mt;V.position.set(N.x,.42,N.z);const Z=new re(Ai,Tt("#8a6844",.6,.3));Z.scale.set(.1,.55,.1),Z.position.y=.27,Z.castShadow=!0,V.add(Z);const ee=Tt("#b0784a",.5,.5);for(const[Ee,He]of[[.24,0],[-.24,0],[0,.24],[0,-.24]]){const Qe=new re(Ai,ee);Qe.scale.set(.34,.07,.07),Qe.position.set(Ee*.9,.52,He*.9),Qe.rotation.y=He!==0?Math.PI/2:0,V.add(Qe)}const ce=new re(Ai,new Je({color:"#aedff2",emissive:"#7fd0e8",emissiveIntensity:.9,transparent:!0,opacity:.85,roughness:.2,metalness:.1}));ce.scale.setScalar(.16),ce.position.y=.62,V.add(ce),N.fixtureGroup=V,N.fixtureGlobe=ce,i.add(V)}else!q&&N.fixtureGroup&&(i.remove(N.fixtureGroup),N.fixtureGroup=null,N.fixtureGlobe=null)}}const C=i.children.filter(D=>D.isMesh&&D.geometry===Ai&&!D.material.transparent&&!D.material.emissive?.getHex()),T=new Eo(Ai,new Je({color:16777215,roughness:.65,metalness:.15}),C.length);C.forEach((D,B)=>{D.updateMatrix(),T.setMatrixAt(B,D.matrix),T.setColorAt(B,D.material.color),i.remove(D)}),T.castShadow=!0,T.receiveShadow=!0,i.add(T);function F(D,B=null){if(B)for(const N of n){const q=B[N.bedIndex];if(!q)continue;N.fixtureGlobe&&(N.fixtureGlobe.rotation.y=D*1.2+N.bedIndex,N.fixtureGlobe.position.y=.62+Math.sin(D*3+N.bedIndex)*.03);const V=N.soilMesh.material;if(!q.prepared)V.color.set("#483d2f");else{const Z=q.moisture||0,ee=new Oe("#352a1c"),ce=new Oe("#161009");V.color.copy(ee).lerp(ce,Z)}(N.renderedCrop!==q.cropId||N.renderedStage!==q.stage)&&(N.renderedCrop=q.cropId,N.renderedStage=q.stage,lv(N.plantGroup,q.cropId,q.stage))}}return{group:i,obstacles:e,items:t,bedVisuals:n,update:F,setFixtures:y,previewCoverage:v}}const Gs=new U;function un(i,e,t,n,s,r){const o=2*Math.PI*s/4,a=Math.max(r-2*s,0),l=Math.PI/4;Gs.copy(e),Gs[n]=0,Gs.normalize();const c=.5*o/(o+a),h=1-Gs.angleTo(i)/l;return Math.sign(Gs[t])===1?h*c:a/(o+a)+c+c*(1-h)}class $l extends Kt{constructor(e=1,t=1,n=1,s=2,r=.1){const o=s*2+1;if(r=Math.min(e/2,t/2,n/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:e,height:t,depth:n,segments:s,radius:r},o===1)return;const a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;const l=new U,c=new U,h=new U(e,t,n).divideScalar(2).subScalar(r),f=this.attributes.position.array,d=this.attributes.normal.array,u=this.attributes.uv.array,g=f.length/6,_=new U,m=.5/o;for(let p=0,E=0;p<f.length;p+=3,E+=2)switch(l.fromArray(f,p),c.copy(l),c.x-=Math.sign(c.x)*m,c.y-=Math.sign(c.y)*m,c.z-=Math.sign(c.z)*m,c.normalize(),f[p+0]=h.x*Math.sign(l.x)+c.x*r,f[p+1]=h.y*Math.sign(l.y)+c.y*r,f[p+2]=h.z*Math.sign(l.z)+c.z*r,d[p+0]=c.x,d[p+1]=c.y,d[p+2]=c.z,Math.floor(p/g)){case 0:_.set(1,0,0),u[E+0]=un(_,c,"z","y",r,n),u[E+1]=1-un(_,c,"y","z",r,t);break;case 1:_.set(-1,0,0),u[E+0]=1-un(_,c,"z","y",r,n),u[E+1]=1-un(_,c,"y","z",r,t);break;case 2:_.set(0,1,0),u[E+0]=1-un(_,c,"x","z",r,e),u[E+1]=un(_,c,"z","x",r,n);break;case 3:_.set(0,-1,0),u[E+0]=1-un(_,c,"x","z",r,e),u[E+1]=1-un(_,c,"z","x",r,n);break;case 4:_.set(0,0,1),u[E+0]=1-un(_,c,"x","y",r,e),u[E+1]=1-un(_,c,"y","x",r,t);break;case 5:_.set(0,0,-1),u[E+0]=un(_,c,"x","y",r,e),u[E+1]=1-un(_,c,"y","x",r,t);break}}static fromJSON(e){return new $l(e.width,e.height,e.depth,e.segments,e.radius)}}function pv(i){const{group:e,block:t,box:n,glow:s,material:r,colors:o,items:a,animated:l}=i;n(0,.25,-8.3,14,.5,2.4,"#3a3134"),t(0,-8.3,14,2.4);const c=s(0,3.1,-8.35,13,4,.15,"#101418",.12);n(0,5.25,-8.3,13.6,.3,.34,o.brass),n(0,.95,-8.3,13.6,.3,.34,o.brass);for(const T of[-6.65,6.65])n(T,3.1,-8.3,.3,4.6,.34,o.brass);i.screenQuad=[new U(-6.5,1.1,-8.28),new U(6.5,1.1,-8.28),new U(6.5,5.1,-8.28),new U(-6.5,5.1,-8.28)],l.push((T,F)=>{c.material.emissiveIntensity=F?.45+Math.sin(T*2)*.08:.12});for(const T of[-1,1]){const F=n(T*7.3,2.7,-8.1,1.1,5.4,2.8,"#5a2029");F.rotation.z=-T*.035,t(T*7.3,-8.1,1.1,2.8)}n(0,6.2,-8.1,15.8,.5,1.2,"#4a1b22"),n(0,5.75,-7.7,13.4,.55,.5,"#2c2226");const h=[];for(let T=-6;T<=6;T+=.75)h.push(s(T,5.75,-7.42,.16,.16,.12,"#ffd9a0",.15));l.push((T,F)=>{h.forEach((D,B)=>{D.material.emissiveIntensity=F?1.6+Math.sin(T*3+B)*.5:.15})}),n(8,1.5,-6,1.8,3,1.6,o.dark),t(8,-6,1.8,1.6),n(8,3.15,-6.1,.6,.3,.6,"#33393c"),n(8,3.55,-6.1,.55,.5,.8,"#22282b");const f=new re(new oi(.14,.14,.45,10),r(o.brass));f.rotation.x=Math.PI/2,f.position.set(8,3.55,-6.65),e.add(f);const d=s(4.6,3.33,-7.58,.1,.1,6.95,"#ffe9c0",0);d.rotation.y=Math.atan2(-6.8,-1.35),l.push((T,F)=>{d.material.emissiveIntensity=F?.9+Math.sin(T*7)*.15:0});const u=[];for(const T of[-3.5,3.5])for(const F of[1.4,3.6])u.push(s(T,.1,F,.18,.1,.18,"#ffca7a",.15));l.push((T,F)=>{u.forEach((D,B)=>{D.material.emissiveIntensity=F?1.7+Math.sin(T*2+B)*.3:.15})});const g=new Map,_=new Je({color:"#ffffff",roughness:.96,metalness:0}),m=new Je({color:"#ffffff",roughness:.38,metalness:.65}),p=new $l(1,1,1,3,.12),E=new oi(1,1,1,16),b=new bo(1,.18,8,20),M=new Hl(1,1);function R(T,F,D,B,N,q,V,Z,ee,ce=0){let Ee=g.get(T);Ee||g.set(T,Ee=new Map),Ee.has(F)||Ee.set(F,[]);const He=new Rt;He.position.set(D,B,N),He.scale.set(q,V,Z),He.rotation.x=ce,He.updateMatrix(),Ee.get(F).push({matrix:He.matrix.clone(),color:new Oe(ee)})}const w=(T,F,D,B,N,q,V,Z=0)=>R(p,_,T,F,D,B,N,q,V,Z),L=[-2.75,-1.65,-.55,.55,1.65,2.75],I=[3.9,5,6.1,7.2,8.15],v=[...L,...I,...I.map(T=>-T)];for(const[T,F]of[[.3,1],[2.5,2],[4.7,3]])for(const[D,B]of v.entries()){t(B,T,.76,.62);const N=D%3===0?"#702c3b":"#602333";w(B,.48,T-.02,.58,.22,.59,N),w(B,.89,T+.24,.65,.92,.19,"#29282d",-.1),w(B,.91,T+.13,.57,.79,.18,N,-.1),w(B,1.2,T+.09,.49,.22,.13,"#823748",-.1);for(const q of[-.16,0,.16])w(B+q,.86,T+.025,.135,.4,.055,N,-.1);n(B,.19,T+.08,.13,.29,.22,"#262b30"),w(B,.17,T+.06,.47,.055,.39,"#303238");for(const q of[-.34,.34])n(B+q,.42,T+.06,.06,.49,.3,"#272b30"),w(B+q,.7,T,.1,.12,.65,"#29272d"),R(b,m,B+q,.77,T-.2,.055,.055,.055,"#ae8953",Math.PI/2),R(E,m,B+q,.743,T-.2,.042,.045,.042,"#151b20");n(B,1.08,T+.36,.14,.065,.02,o.brass),a.push({type:"seat",x:B,z:T,title:"Take a seat",sub:`Row ${F} · Seat ${D+1} · The Orpheum`})}n(0,.145,2.7,18.6,.025,8.5,"#34212c"),n(0,.145,8,18.6,.025,2,"#502b35");for(const T of[-9.15,9.15])n(T,.165,3.9,.045,.02,12,o.brass);for(const T of[-1.35,1.4,3.6,5.85]){n(0,.165,T,18.3,.02,.035,"#98754e");for(const F of[-8.95,8.95])s(F,.2,T,.12,.05,.22,"#ffca7a",.65)}for(const T of[-1,1])for(const F of[-4.5,2.8,6.4]){n(T*11.65,1.65,F,.25,3.05,2.3,"#302e38");for(let D=-.9;D<=.9;D+=.3)n(T*11.49,1.6,F+D,.12,2.8,.06,"#765447");n(T*11.38,1.9,F,.18,.65,.4,o.brass),s(T*11.25,1.9,F,.12,.45,.24,"#ffcc89",.8),w(T*11.25,3,F,.4,.62,.48,"#20262b");for(let D=2.8;D<3.25;D+=.08)n(T*11.02,D,F,.025,.025,.36,"#44494b")}n(-6.6,.65,9.2,5.1,1.05,1.2,"#48342e"),t(-6.6,9.2,5.1,1.2),n(-6.6,1.21,9.2,5.3,.13,1.4,"#c0a983");for(const T of[-8.5,-7.5,-6.5,-5.5,-4.5])n(T,.65,8.58,.78,.74,.04,"#6c493a"),n(T,.99,8.54,.64,.025,.03,o.brass);const y=-8;w(y,1.38,9.2,1.2,.23,.94,"#8a3036"),w(y,2.6,9.2,1.35,.24,1.04,"#8a3036"),s(y,2.44,9.2,1.02,.035,.73,"#ffcf7b",.8);for(const T of[-.54,.54])for(const F of[-.4,.4])n(y+T,1.99,9.2+F,.055,1.08,.055,o.brass);const C=new re(new Kt(1.04,.97,.79),new Je({color:"#d5e1dc",transparent:!0,opacity:.1,roughness:.12,depthWrite:!1}));C.position.set(y,1.98,9.2),e.add(C),R(E,m,y,2.16,9.2,.3,.25,.3,"#ad885b"),R(E,m,y,2.32,9.2,.34,.06,.34,"#d1b17b"),n(y,2.4,9.2,.04,.14,.04,"#45454a");for(let T=0;T<150;T++){const F=y+Math.sin(T*43.7)*.46,D=9.2+Math.cos(T*17.3)*.33;R(M,_,F,1.55+T%5*.026,D,.047,.043,.044,T%3?"#efcd83":"#fff0b9")}for(let T=0;T<9;T++)n(y-.52+T*.13,2.61,8.67,.055,.17,.02,"#e9d6ae");for(const T of[-6.9,-6.45,-6]){w(T,1.48,9,.29,.42,.29,"#ecdbb5");for(const F of[-.09,.03])n(T+F,1.48,8.848,.035,.37,.014,"#a13d40");for(let F=0;F<9;F++)R(M,_,T+Math.sin(F*5)*.1,1.71,9+Math.cos(F*4)*.1,.046,.04,.045,"#ffe4a0")}w(-4.8,1.73,9.35,.88,.94,.65,"#283a3c");for(const[T,F]of["#a95140","#bd9a4e","#528482"].entries())s(-5.07+T*.27,1.91,9.01,.19,.25,.025,F,.25),n(-5.07+T*.27,1.64,8.97,.05,.15,.12,o.brass);n(-4.8,1.31,8.93,.88,.06,.32,"#848680"),w(7.8,.66,8.8,.76,1.02,.76,"#2e4141"),t(7.8,8.8,.76,.76),w(7.8,1.21,8.8,.81,.15,.81,"#ab926a"),n(7.8,1.3,8.8,.43,.025,.38,"#111d24"),n(4.6,.72,9.15,1.1,1.16,.68,"#604339"),t(4.6,9.15,1.1,.68),n(4.6,1.34,9.15,1.2,.1,.8,o.brass);for(let T=0;T<5;T++)n(4.6+T*.03,1.41+T*.025,9.15,.52,.018,.3,"#dac9a1");for(const[T,F]of g)for(const[D,B]of F){const N=new Eo(T,D,B.length);B.forEach((q,V)=>{N.setMatrixAt(V,q.matrix),N.setColorAt(V,q.color)}),N.castShadow=N.receiveShadow=!0,e.add(N)}a.push({type:"theater_screen",x:0,z:-5.9,title:"Screen controls",sub:"Press E to run the picture"})}const Xt=[{id:"court",name:"The Rain Court",district:"LOWER DISTRICT / 04",subtitle:"AFTER THE RAIN",color:"#657264",sun:"#ffe0a5",description:"Wet stone, warm windows. Where your journey began."},{id:"canal",name:"The Sluiceworks",district:"WATER DISTRICT / 05",subtitle:"BENEATH THE MIST",color:"#466b70",sun:"#c3e6e1",description:"Cross the canal and wake the sleeping waterworks.",objective:"Open the sluice valve",action:"Turn the sluice valve",done:"Waterworks flowing",message:"Water moves through the old channels again. Somewhere below, a garden drinks.",landmark:[7,-5],note:[-7,5],noteTitle:"A waterkeeper’s promise",noteBody:"“Keep the water moving. The roots above us are still alive.”",spawn:[-9,0]},{id:"garden",name:"The Glass Garden",district:"UPPER TERRACES / 06",subtitle:"WHERE GREEN RETURNS",color:"#78846a",sun:"#ffe6ad",description:"An overgrown greenhouse above the city. Something still grows.",objective:"Wake the seed nursery",action:"Tend the seed nursery",done:"Nursery awakened",message:"The nursery lights up, sheltering a new generation of green. Kiln watches the leaves unfold.",landmark:[4,-5],note:[-6,5],noteTitle:"The last gardener",noteBody:"“A city is not empty while something is growing. Leave a little room for the wild.”",spawn:[-9,0]},{id:"station",name:"The Last Platform",district:"TRANSIT DISTRICT / 07",subtitle:"THE BLUE HOUR",color:"#424d70",sun:"#b4c5fa",description:"An abandoned tram stop, and a signal waiting to be heard.",objective:"Light the signal beacon",action:"Send the home signal",done:"Signal broadcasting",message:"A warm signal reaches across the rooftops. If someone is out there, they know the city is waking.",landmark:[7,5],note:[-6,5],noteTitle:"An unsent timetable",noteBody:"“Last service: whenever you are ready. There will always be a way home.”",spawn:[-9,0]},{id:"aqueduct",name:"The Sunken Aqueduct",district:"AQUEDUCT DISTRICT / 08",subtitle:"DEEP RUNS THE WATER",color:"#384d52",sun:"#9ec4c0",description:"Subterranean stone channels beneath the old city. Clear the silt sluice to let the cisterns breathe.",objective:"Clear the silt sluice",action:"Raise the silt gate",done:"Cisterns breathing",message:"Clear water rushes through the ancient conduit. The subterranean echoing returns to life.",landmark:[6,-4],note:[-6,4],noteTitle:"Cistern Overseer’s Log",noteBody:"“The masonry has held for three centuries. Give it clean water, and it will hold for three more.”",spawn:[-9,0]},{id:"caldera",name:"The Boiler Caldera",district:"GEOTHERMAL DISTRICT / 09",subtitle:"HEAT FROM THE DEEP",color:"#4d3b38",sun:"#f7aa74",description:"Steam vents hiss through dark basalt crevices. Regulate the geothermal manifold.",objective:"Regulate the geothermal manifold",action:"Turn the pressure manifold",done:"Manifold regulated",message:"Steam settles into a steady, resonant rhythm. Warm air rises toward the cold terraces above.",landmark:[5,-4],note:[-6,5],noteTitle:"Thermal Watchman",noteBody:"“Listen to the pressure before you touch a valve. The rock speaks if you have patience.”",spawn:[-9,0]},{id:"understory",name:"The Spore Understory",district:"FUNGAL DISTRICT / 10",subtitle:"LIGHT IN THE DAMP",color:"#3b4737",sun:"#a5d9a0",description:"A cavernous lower rotunda overtaken by luminous fungi. Awaken the bioluminescent mycelium.",objective:"Awaken the mycelium lattice",action:"Energize the mycelial node",done:"Mycelium luminous",message:"Soft green light pulses through the damp loam and ripples across the shelf fungi.",landmark:[6,-5],note:[-7,5],noteTitle:"Fungal Archivist",noteBody:"“Fungi remember where every tree once stood. They do not hurry, and they never forget.”",spawn:[-9,0]},{id:"saltworks",name:"The Bleached Saltworks",district:"MINERAL DISTRICT / 11",subtitle:"WHITE TERRACES OF BRINE",color:"#566668",sun:"#e3f3f7",description:"Blinding white crystalline flats and evaporation pans. Free the stuck brine pump.",objective:"Engage the brine pump",action:"Prime the brine pump",done:"Brine pump turning",message:"Clear brine trickles into the shallow crystallizers. Salt crystals shimmer in the sunlight.",landmark:[7,-4],note:[-6,4],noteTitle:"Salt Harvester’s Tablet",noteBody:"“The tide gives, the wind takes, and the salt remains. A clean basin makes clean bread.”",spawn:[-9,0]},{id:"rooftops",name:"The High Awnings",district:"SKYWARD DISTRICT / 12",subtitle:"WHERE WINDS GATHER",color:"#546370",sun:"#e6d8b8",description:"Wind-beaten scaffolding and catwalks overlooking the expanse. Free the anemometer array.",objective:"Free the anemometer array",action:"Align the wind vanes",done:"Wind array spinning",message:"The brass vanes catch the gusts and sing against the copper eaves. The city knows which way the wind blows.",landmark:[6,-5],note:[-5,5],noteTitle:"Roofkeeper’s Weather Log",noteBody:"“Up here, you feel the city breathing. The high wind is honest; it hides nothing.”",spawn:[-9,0]},{id:"mangrove",name:"The Brackish Basin",district:"ESTUARY DISTRICT / 13",subtitle:"ROOTS IN THE BRINE",color:"#44574c",sun:"#cde4cb",description:"Submerged brickwork laced with tangle roots and stilt boardwalks. Restore the tidal weir.",objective:"Clear the tidal weir",action:"Lower the timber weir",done:"Tidal weir secured",message:"The water slows behind the timber barrier. Small fish dart among the submerged brick columns.",landmark:[6,-4],note:[-6,5],noteTitle:"Estuary Keeper’s Marker",noteBody:"“The tide doesn’t care about our masonry, but the roots hold both together.”",spawn:[-9,0]},{id:"trestle",name:"The Overgrown Trestle",district:"CANOPY DISTRICT / 14",subtitle:"IRON IN THE BOUGHS",color:"#4e5a42",sun:"#dce6b6",description:"A massive iron railway viaduct gripped by ancient boughs. Restore the suspended maintenance crane.",objective:"Anchor the canopy crane",action:"Engage the hoist cable",done:"Canopy crane anchored",message:"Tension locks into the heavy iron cables. Kiln chirps as the suspension bridge stabilizes.",landmark:[7,-4],note:[-5,5],noteTitle:"Viaduct Inspector’s Plaque",noteBody:"“Steel will flex and timber will bend, but together they span the valley.”",spawn:[-9,0]},{id:"foundry",name:"The Rustfall Foundry",district:"SMELTING DISTRICT / 15",subtitle:"HEARTH OF SLAG AND ORE",color:"#4a3832",sun:"#f2a679",description:"Red iron dust and towering crucible furnaces. Ignite the pilot hearth.",objective:"Ignite the pilot hearth",action:"Spark the furnace igniter",done:"Pilot hearth glowing",message:"A warm orange glow spreads through the blast flue. Warmth returns to the cold cast iron.",landmark:[6,-4],note:[-6,5],noteTitle:"Foundry Master’s Inscription",noteBody:"“Cold iron forgets its shape until fire reminds it. Never let the pilot flame die completely.”",spawn:[-9,0]},{id:"frost-spire",name:"The Glacial Glasshouse",district:"ALPINE DISTRICT / 16",subtitle:"ABOVE THE CLOUD LINE",color:"#45596e",sun:"#d6ecff",description:"A fractured glass observatory battered by alpine frost. Clear the ice crystals from the solar collector.",objective:"Clear the solar collector",action:"Sweep the frost collector",done:"Solar collector cleared",message:"Sunlight catches the polished mirror facets. Warmth begins melting the frost along the rim.",landmark:[5,-5],note:[-6,5],noteTitle:"Alpine Observer’s Journal",noteBody:"“The cold is patient, but glass and copper remember the light. Keep looking upward.”",spawn:[-9,0]},{id:"delta",name:"The Reclaimed Marshes",district:"DELTA DISTRICT / 17",subtitle:"WHISPERS IN THE REEDS",color:"#525b45",sun:"#d9e0b2",description:"Shallow sandbars and cattail marshes woven through stranded barges. Realign the channel beacon.",objective:"Light the channel beacon",action:"Strike the marsh beacon",done:"Channel beacon lit",message:"A warm beacon reflects across the delta shallows, cutting through the twilight mist.",landmark:[7,-4],note:[-6,4],noteTitle:"Delta Boatman’s Note",noteBody:"“Follow the reeds when the silt shifts. Where water moves slowly, green things thrive.”",spawn:[-9,0]},{id:"archives",name:"The Paper Catacombs",district:"ARCHIVE DISTRICT / 18",subtitle:"WHISPERING VAULTS",color:"#48444a",sun:"#f5e4bd",description:"Stone shelves holding centuries of water-resistant parchment. Light the reading desk lamp.",objective:"Illuminate the study rotunda",action:"Turn the reading lamp switch",done:"Study rotunda illuminated",message:"A soft amber globe illuminates centuries of hand-bound volumes. The silence feels like peace.",landmark:[5,-4],note:[-6,5],noteTitle:"Chief Archivist’s Dedication",noteBody:"“Words outlive empires, provided someone keeps the rain from dripping on the ink.”",spawn:[-9,0]},{id:"kiln-terrace",name:"The Solar Kiln",district:"TERRACOTTA DISTRICT / 19",subtitle:"BAKED IN WARMTH",color:"#634b3e",sun:"#ffd09e",description:"Baked clay tiles and parabolic sun collectors. Align the solar concentrator.",objective:"Focus the solar concentrator",action:"Calibrate the focal mirror",done:"Concentrator focused",message:"A brilliant point of concentrated sunlight gleams against the terracotta kiln. Warmth radiates.",landmark:[6,-4],note:[-5,5],noteTitle:"Potter’s Credo",noteBody:"“Earth, water, and sun. With these three, a broken city can remake itself cup by cup.”",spawn:[-9,0]},{id:"theater",name:"The Orpheum",district:"CINEMA DISTRICT / 20",subtitle:"PICTURES IN THE DARK",color:"#3a3345",sun:"#e8c9a0",description:"A grand old cinema where the city gathers after dark. Queue a film, take a seat.",objective:"Restore power to the projector",action:"Restore the projector",done:"Projector humming",message:"The marquee blazes and the reel begins to turn. Take a seat — whatever plays here plays for everyone.",landmark:[8,-6],note:[-6,7.2],noteTitle:"The Orpheum’s house rules",noteBody:"“Anyone may change the picture. No one owns the screen. Leave the aisle lamps burning for whoever comes next.”",spawn:[-9,0]}],Sd=new Kt(1,1,1),va=new Map;function Ln(i,e=null,t=0){const n=`${i}_${e||""}_${t}`;return va.has(n)||va.set(n,new Je({color:i,roughness:.62,metalness:.2,emissive:e||"#000000",emissiveIntensity:t})),va.get(n)}function In(i,e,t,n,s,r,o,a,l=0,c=0){const h=new re(Sd,a);return h.position.set(e,t,n),h.scale.set(s,r,o),h.rotation.z=l,h.rotation.y=c,h.castShadow=h.receiveShadow=!0,i.add(h),h}function mv(i,e){const{group:t,items:n,animated:s}=e,r=dv.filter(l=>l.district===i.id);if(r.length===0)return null;const o=new mt;return o.name="dynamic",t.add(o),{visuals:r.map((l,c)=>{const h=ql[l.material],[f,d]=l.position,u=new mt;u.position.set(f,0,d),o.add(u),In(u,0,.12,0,1.15,.24,1.15,Ln("#3d4547"));const g=new mt;u.add(g),l.material==="copper"?(In(g,-.18,.34,.1,.42,.34,.42,Ln(h.color),0,.4),In(g,.22,.3,-.14,.34,.26,.34,Ln("#a8663a"),.2,-.5),In(g,.05,.54,.02,.2,.22,.2,Ln("#d18b52"),-.3,.9)):l.material==="timber"?(In(g,0,.36,.05,1.05,.26,.3,Ln(h.color),0,.18),In(g,.06,.6,-.04,.95,.24,.28,Ln("#8a6842"),0,-.32),In(g,-.05,.8,.02,.6,.2,.24,Ln("#6b4e30"),0,.62)):(In(g,-.16,.4,.08,.16,.5,.4,Ln(h.color),.12,.3),In(g,.18,.36,-.1,.14,.44,.34,Ln("#b8d8e8"),-.1,-.6),In(g,.02,.52,.12,.12,.62,.3,Ln("#cfe4f0"),.05,1.1));const _=new Je({color:h.glowColor,emissive:h.glowColor,emissiveIntensity:1.2}),m=new re(Sd,_);m.scale.set(.12,.12,.12),m.position.y=.95,u.add(m);const p={type:"material_node",nodeId:l.id,material:l.material,x:f,z:d,title:`${h.name} cache`,sub:"Press E to gather materials"};n.push(p);const E={def:l,nodeGroup:u,rich:g,spark:m,sparkMat:_,item:p,depleted:!1,phase:c*1.7};return s.push(b=>{m.position.y=.95+Math.sin(b*2+E.phase)*.07,m.rotation.y=b*.8+E.phase,_.emissiveIntensity=1.1+Math.sin(b*2.6+E.phase)*.35}),E}),dynamic:o}}function gv(i,e){i.depleted=!e.available,i.rich.visible=e.available,i.spark.visible=e.available,i.item&&(i.item.sub=e.available?"Press E to gather materials":"Picked clean — it will regrow in time")}function Mh(i){return{current:Xt.some(e=>e.id===i?.current)?i.current:"court",visited:[...new Set(["court",...Array.isArray(i?.visited)?i.visited.filter(e=>Xt.some(t=>t.id===e)):[]])],completed:[...new Set(Array.isArray(i?.completed)?i.completed.filter(e=>Xt.slice(1).some(t=>t.id===e)):[])]}}function _v(i){const{group:e,block:t,box:n,glow:s,material:r,colors:o,random:a,animated:l,geometry:c}=i;n(0,.17,0,5.8,.08,21,"#143c46");const h=new re(new Rn(5.6,20.8),new Je({color:"#367c88",transparent:!0,opacity:.8,roughness:.13,metalness:.65}));h.rotation.x=-Math.PI/2,h.position.y=.23,e.add(h);for(const u of[-6.15,6.65])t(0,u,5.5,u<0?8.5:7.5);n(0,.21,0,7,.2,3.8,"#8b8d77");for(let u=-3.5;u<4;u+=.6){n(u,.34,0,.54,.09,3.7,"#6d807d");for(const g of[-1.85,1.85])n(u,.85,g,.08,1.1,.08,o.brass)}for(const u of[-1.85,1.85])n(0,1.4,u,7.5,.09,.09,o.brass);for(let u=-9;u<10;u+=.65)for(const g of[-3.1,3.1])n(g,.45,u,.35,.55,.6,"#a6a28b");for(const u of[-8,8]){n(u,1.2,-8,3,2.4,2.2,o.dark),t(u,-8,3,2.2);for(let g=0;g<6;g++)n(u,.5+g*.28,-6.86,2.5,.08,.1,o.brass);n(u,3,-8,.5,2,.5,o.brass)}for(let u=-9;u<10;u+=1.5){const g=s((a()-.5)*4,.245,u,1+a(),.015,.045,"#72b7bd",.35);l.push(_=>{g.position.x=Math.sin(_*.45+u)*1.2})}const f=new mt;f.position.set(7,1.6,-5);const d=new re(new bo(.55,.07,6,24),r("#c0995d"));f.add(d);for(let u=0;u<6;u++){const g=new re(c,r("#c0995d"));g.scale.set(.95,.055,.07),g.rotation.z=u*Math.PI/3,f.add(g)}e.add(f),l.push((u,g)=>{f.rotation.z=g?u*.4:0})}function vv(i){const{group:e,block:t,box:n,glow:s,random:r,animated:o}=i,a=new Je({color:"#b7d9b3",transparent:!0,opacity:.13,metalness:.1,roughness:.3,depthWrite:!1,side:rn});for(const l of[-1,7])for(let c=-9;c<=-2;c+=1.4)n(l,2.1,c,.1,4.2,.1,"#789184");for(let l=-9;l<=-2;l+=1.4){const c=n(1,4.8,l,4.5,.12,.12,"#96a58b");c.rotation.z=.35;const h=n(5,4.8,l,4.5,.12,.12,"#96a58b");h.rotation.z=-.35}for(const l of[1,5]){const c=n(l,4.8,-5.5,4.25,.03,7.4);c.material=a,c.rotation.z=l===1?.35:-.35}for(const[l,c,h,f]of[[-6,-5,3,5],[3,3.5,5,2],[8,6,2,4]]){n(l,.35,c,h,.6,f,"#9b9270"),n(l,.68,c,h-.2,.1,f-.2,"#414b32"),t(l,c,h,f);for(let d=0;d<50;d++){const u=l+(r()-.5)*(h-.4),g=c+(r()-.5)*(f-.4),_=.4+r()*.7;n(u,.7+_/2,g,.045,_,.045,"#627347");const m=n(u,.8+_,g,.3,.12,.45,["#779455","#94a86a","#536f42"][d%3]);m.rotation.z=r(),d%8===0&&n(u,1+_,g,.16,.14,.16,"#d2b28a")}}for(const l of[-9,9]){n(l,1.1,-7,.35,2.2,.35,"#6b5942"),t(l,-7,1.5,1.5);for(let c=0;c<25;c++)n(l+(r()-.5)*2.5,2+r()*1.7,-7+(r()-.5)*2,.7,.5,.7,["#667c49","#819258","#4e6b47"][c%3])}n(4,.75,-5,2,1.4,1.2,"#a09776"),t(4,-5,2,1.2);for(let l=0;l<6;l++){const c=s(3.3+l*.28,1.55,-5,.1,.18,.2,"#b7ce86",.5);o.push((h,f)=>{c.material.emissiveIntensity=f?1.8+Math.sin(h+l)*.25:.3,c.scale.y=f?.35:.18})}}function yv(i){const{group:e,block:t,box:n,glow:s,material:r,colors:o,animated:a}=i;for(const c of[-5,-7])n(0,.25,c,23,.12,.12,"#9aa5a2");for(let c=-11;c<12;c+=.8)n(c,.17,-6,.24,.16,3.5,"#67584a");n(1,1.65,-6,8,2.7,2.6,"#485e62"),t(1,-6,8,2.6),n(1,3.15,-6,8.4,.3,2.8,"#9b9c87"),n(1,.75,-4.66,8,.27,.08,o.brass);for(let c=-2;c<5;c+=1.25)s(c,2.15,-4.66,.85,.95,.04,"#f3ce89",.5),n(c,2.15,-4.61,.045,.95,.05,o.dark);for(const c of[-2,4])for(const h of[-7.1,-4.9]){const f=new re(new oi(.45,.45,.2,12),r("#23363c"));f.rotation.x=Math.PI/2,f.position.set(c,.55,h),e.add(f)}for(const c of[-8,8])n(c,1.85,-2,.18,3.7,.18,o.brass),t(c,-2,.2,.2);n(0,3.8,-2,18,.22,2.4,"#35494f");for(const c of[-5,1]){n(c,.65,3,2.8,.16,.7,"#9b8966"),n(c,1.15,3.35,2.8,.75,.12,"#9b8966");for(const h of[-1,1])n(c+h,.3,3,.12,.6,.6,o.dark);t(c,3,2.8,.9)}n(7,2.3,5,.18,4.6,.18,o.dark),t(7,5,.3,.3);const l=s(7,4.7,5,.7,.65,.7,"#e2b67b",.2);a.push((c,h)=>{l.material.emissiveIntensity=h?2+Math.sin(c*2):.2})}function xv(i){const{group:e,block:t,box:n,glow:s,colors:r,animated:o}=i;for(const c of[-7,-2,3,8])n(c,2.5,-6.5,1.2,5,1.2,"#3b4b4e"),t(c,-6.5,1.2,1.2),n(c,5.2,-6.5,3.6,.6,1.4,"#495f63");n(0,.18,-6.5,22,.12,2,"#182b2e");const a=new re(new Rn(21.8,1.8),new Je({color:"#2a555e",transparent:!0,opacity:.82,roughness:.15,metalness:.6}));a.rotation.x=-Math.PI/2,a.position.set(0,.24,-6.5),e.add(a),n(6,1.4,-4,2,2.8,1.4,r.dark),t(6,-4,2,1.4);const l=n(6,.8,-3.2,1.2,1.4,.2,r.brass);o.push((c,h)=>{l.position.y=h?1.5+Math.sin(c*.5)*.05:.8});for(const c of[-6,0])n(c,.6,6,2.5,1.2,1.8,"#34474a"),t(c,6,2.5,1.8),n(c,1.3,6,2.2,.2,.2,r.brass)}function Mv(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const[a,l,c,h]of[[-7,-6,3.2,2.6],[-1,-7,2.8,2.2],[8,-7,3,2.4],[-8,6.5,3,2.5],[2,6.5,3.5,2.2]])t(a,1.1,l,c,2.2,h,"#252528"),e(a,l,c,h),t(a,2.3,l,c*.7,.6,h*.7,"#383230"),n(a,2.65,l,c*.35,.1,h*.35,"#f5a438",1.2);t(5,1.2,-4,2.2,2.4,1.6,s.dark),e(5,-4,2.2,1.6);const o=n(5,2.5,-4,.7,.7,.7,"#f7aa74",.8);r.push((a,l)=>{o.material.emissiveIntensity=l?2.5+Math.sin(a*3)*.5:.6,o.rotation.y=l?a*1.5:0})}function Sv(i){const{block:e,box:t,glow:n,random:s,animated:r}=i;for(const[a,l,c,h]of[[-7,-6,2.8,2.5],[1,-6.5,3.5,2.2],[-7,6,2.5,2.5],[3,6,3,2]]){t(a,.9,l,c,1.8,h,"#2d271e"),e(a,l,c,h);for(let f=0;f<3;f++){const d=1.2+f*.6;t(a+(f%2===0?.6:-.6),d,l,1.8,.15,1.4,"#5e4334");const u=n(a+(f%2===0?.6:-.6),d+.1,l,1.2,.08,.9,"#7ee8b0",.4);r.push((g,_)=>{u.material.emissiveIntensity=_?1.8+Math.sin(g*2+f)*.4:.4})}}t(6,.8,-5,2,1.6,1.8,"#322d25"),e(6,-5,2,1.8);const o=n(6,1.8,-5,.8,.8,.8,"#85f5bc",.5);r.push((a,l)=>{o.material.emissiveIntensity=l?2.8+Math.sin(a*2.5)*.6:.5,o.scale.setScalar(l?1+Math.sin(a*3)*.08:1)})}function Ev(i){const{group:e,block:t,box:n,glow:s,colors:r,animated:o}=i;for(let l=-8;l<=4;l+=3.5){n(l,.28,-6.5,3.2,.3,2.5,"#9ea8ab"),t(l,-6.5,3.2,2.5);const c=new re(new Rn(2.8,2.1),new Je({color:"#7cd4e2",transparent:!0,opacity:.75,roughness:.1}));c.rotation.x=-Math.PI/2,c.position.set(l,.45,-6.5),e.add(c),n(l,.48,-6.5,1.2,.08,1,"#f0f6f7")}for(const l of[-6,0]){n(l,1.2,6,3,2.4,1.4,"#7a6a57"),t(l,6,3,1.4);for(let c=.5;c<2.2;c+=.5)n(l,c,6,2.8,.08,1.2,"#ded7cb")}n(7,1.2,-4,1.8,2.4,1.8,r.dark),t(7,-4,1.8,1.8);const a=n(7,2.7,-4,.3,.25,2.2,r.brass);o.push((l,c)=>{a.rotation.x=c?Math.sin(l*3)*.2:0})}function bv(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const a of[-8,-2,4])t(a,1.8,-6.5,4.5,3.2,2.6,"#48555e"),e(a,-6.5,4.5,2.6),t(a,3.5,-6.5,4.8,.2,2.8,"#70828c"),t(a,4.2,-6.5,.15,1.2,.15,s.brass);for(const a of[-6,1])t(a,.9,6,3.8,1.8,1.6,"#6b5845"),e(a,6,3.8,1.6),t(a,1.9,5.3,3.8,.8,.08,s.brass);t(6,1.8,-5,.3,3.6,.3,s.dark),e(6,-5,.8,.8);const o=n(6,3.7,-5,1.4,.12,.12,"#e6c883",1.2);r.push((a,l)=>{o.rotation.y=l?a*4.5:a*.4})}function Tv(i){const{group:e,block:t,box:n,colors:s,animated:r}=i,o=new re(new Rn(23,8),new Je({color:"#254238",transparent:!0,opacity:.8,roughness:.2}));o.rotation.x=-Math.PI/2,o.position.set(0,.22,-6),e.add(o);for(const[l,c]of[[-8,-6],[-2,-6.5],[3,-6.5]]){n(l,1.2,c,2.4,2.4,2.2,"#3d3226"),t(l,c,2.4,2.2);for(let h=0;h<4;h++){const f=n(l+(h-1.5)*.5,.8,c,.18,1.6,.18,"#4f4030");f.rotation.z=(h-1.5)*.3}}for(const l of[-5,2])n(l,.8,6,3.2,1.6,2,"#485244"),t(l,6,3.2,2);n(6,1.4,-4,2,2.8,1.4,s.dark),t(6,-4,2,1.4);const a=n(6,1.8,-3.2,1.4,1.6,.2,"#7a5a3a");r.push((l,c)=>{a.position.y=c?.8:1.8+Math.sin(l)*.05})}function wv(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const a of[-8,-2,4])t(a,2.2,-6.5,1.2,4.4,1.2,"#5e3428"),e(a,-6.5,1.2,1.2);t(0,4.5,-6.5,22,.5,1.6,"#3a2018");for(let a=-10;a<=10;a+=1.2)t(a,4.8,-6.5,.3,.2,2.2,"#483c34");for(const a of[-6,0])t(a,.9,6,3.4,1.8,1.8,"#443b35"),e(a,6,3.4,1.8);t(7,2,-4,.4,4,.4,s.dark),e(7,-4,1,1),t(7,4.1,-4,1.8,.3,.3,s.brass);const o=n(7.6,3.2,-4,.08,1.6,.08,"#d9bf82",.6);r.push((a,l)=>{o.rotation.z=l?0:Math.sin(a*1.5)*.06})}function Av(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const a of[-7,-1])t(a,2.4,-6.5,3.5,4.8,2.8,"#2d2d33"),e(a,-6.5,3.5,2.8),t(a,4.9,-6.5,2,1.2,2,"#45454d"),n(a,1.1,-5,1.4,.8,.2,"#ff6622",1.8);for(const a of[-6,1])t(a,.7,6,3.6,1.4,1.8,"#3c2b28"),e(a,6,3.6,1.8),n(a,.8,6,2.8,.1,.8,"#8c3d23",.4);t(6,1.1,-4,2.2,2.2,2.2,s.dark),e(6,-4,2.2,2.2);const o=n(6,1.8,-4,1.2,.8,1.2,"#ff8033",.5);r.push((a,l)=>{o.material.emissiveIntensity=l?2.8+Math.sin(a*5)*.4:.5})}function Cv(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const a of[-8,-2,4])t(a,2.6,-6.5,.35,5.2,.35,"#627585"),e(a,-6.5,1,1),t(a,5.1,-6.5,3.8,.2,.2,"#8ea3b5");for(const a of[-6,0])t(a,1,6,3.2,2,2,"#667480"),e(a,6,3.2,2),t(a,2.05,6,2.8,.12,1.6,"#d8e5ed");t(5,1.4,-5,1.6,2.8,1.6,s.dark),e(5,-5,1.6,1.6);const o=n(5,3,-5,1.4,1.4,.2,"#cce6f5",1.2);r.push((a,l)=>{o.material.emissiveIntensity=l?2.6+Math.sin(a*2)*.4:.6,o.rotation.y=l?a*.5:0})}function Rv(i){const{group:e,block:t,box:n,glow:s,colors:r,animated:o}=i,a=new re(new Rn(22,5.5),new Je({color:"#2d4345",transparent:!0,opacity:.8,roughness:.2}));a.rotation.x=-Math.PI/2,a.position.set(0,.22,-6.5),e.add(a),n(-4,.8,-6.5,5.5,1.4,2.2,"#483e32"),t(-4,-6.5,5.5,2.2);for(const c of[-6,0])n(c,.7,6,3.4,1.4,1.8,"#594d3f"),t(c,6,3.4,1.8);n(7,2,-4,.4,4,.4,r.dark),t(7,-4,1,1),n(7,4.1,-4,1.2,.2,1.2,r.brass);const l=s(7,4.5,-4,.7,.7,.7,"#e8ca76",.4);o.push((c,h)=>{l.material.emissiveIntensity=h?2.8+Math.sin(c*2)*.5:.4})}function Pv(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const a of[-8,-2,4]){t(a,2.5,-6.5,3.6,5,1.6,"#35363b"),e(a,-6.5,3.6,1.6);for(let l=1;l<4.8;l+=.9){t(a,l,-5.6,3.2,.06,.2,s.brass);for(let c=-1.3;c<1.4;c+=.45)t(a+c,l+.35,-5.6,.35,.65,.15,["#574636","#6e5643","#434739"][c*10%3>>>0])}}for(const a of[-6,1])t(a,.8,6,3.2,1.6,1.8,"#524335"),e(a,6,3.2,1.8),t(a,1.65,6,2.8,.1,1.4,"#7a6652");t(5,1.1,-4,1.6,2.2,1.6,"#42372c"),e(5,-4,1.6,1.6),t(5,2.3,-4,.1,.6,.1,s.brass);const o=n(5,2.8,-4,.6,.6,.6,"#ffd580",.3);r.push((a,l)=>{o.material.emissiveIntensity=l?2.5+Math.sin(a*1.5)*.2:.3})}function Lv(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const a of[-7,-1])t(a,1.8,-6.5,3.4,3.6,2.8,"#8c4832"),e(a,-6.5,3.4,2.8),t(a,3.8,-6.5,2,.8,1.8,"#aa583e"),n(a,1.2,-5,.8,.8,.2,"#ffaa44",.6);for(const a of[-6,1]){t(a,.8,6,3.2,1.6,1.8,"#9c5a43"),e(a,6,3.2,1.8);for(let l=-1;l<=1;l+=.8)t(a+l,1.8,6,.45,.6,.45,"#bd6b51")}t(6,1.2,-4,1.8,2.4,1.8,s.dark),e(6,-4,1.8,1.8);const o=n(6,2.7,-4,1.4,1.4,.18,"#ffe0a0",.6);r.push((a,l)=>{o.rotation.x=l?Math.sin(a*.4)*.2:0,o.material.emissiveIntensity=l?2.8+Math.sin(a*2)*.4:.6})}function Iv(i){const{group:e,block:t,box:n,glow:s,lamp:r,random:o}=i;for(const[l,c]of[[-4,-4],[4,3]]){n(l,.45,c,2.6,.12,.8,"#5d6658"),t(l,c,2.6,.8),n(l,.85,c+.42,2.6,.55,.1,"#5d6658");for(const h of[-1.05,1.05])n(l+h,.2,c,.12,.45,.7,"#3d463f")}r(-7,6);for(const[l,c,h,f]of[[-2,2,2.2,1.4],[5,-2,1.6,2.4],[-6,-1,1.3,1.1]]){const d=new re(new Rn(h,f),new Je({color:"#367c88",transparent:!0,opacity:.5,roughness:.12,metalness:.6}));d.rotation.x=-Math.PI/2,d.position.set(l,.17,c),e.add(d)}const a=["#58734c","#47603f","#6b8156"];for(const l of[-8.5,8])for(let c=0;c<5;c++)n(l+(o()-.5)*1.2,1+c*.5,-10.1,1.5,.42,.45,a[c%3]);for(const[l,c]of[[-9,3.6],[3,4.5],[7.5,3.2]])s(l,c,-10.96,.5,.8,.05,"#e8b06a",.6)}const Dv={court:Iv,canal:_v,garden:vv,station:yv,aqueduct:xv,caldera:Mv,understory:Sv,saltworks:Ev,rooftops:bv,mangrove:Tv,trestle:wv,foundry:Av,"frost-spire":Cv,delta:Rv,archives:Pv,"kiln-terrace":Lv,theater:pv};function Uv(i,e=!1){const t=new mt;t.name=i.id;const n=[],s=[],r=[],o=new Kt(1,1,1),a={stone:"#6b776c",dark:"#233c3e",brass:"#b78d50",green:"#58734c"},l=new Map,c=v=>(l.has(v)||l.set(v,new Je({color:v,roughness:.62,metalness:.2})),l.get(v));function h(v,y,C,T,F,D,B=a.stone){const N=new re(o,c(B));return N.position.set(v,y,C),N.scale.set(T,F,D),N.castShadow=N.receiveShadow=!0,t.add(N),N}function f(v,y,C,T){n.push({x:v,z:y,w:C/2+.38,d:T/2+.38})}function d(v,y,C,T,F,D,B,N=1.5){const q=h(v,y,C,T,F,D,B);return q.material=new Je({color:B,emissive:B,emissiveIntensity:N}),q}function u(v,y,C="#ffcb79"){h(v,1.8,y,.12,3.6,.12,a.dark),d(v,3.6,y,.35,.5,.35,C,2),h(v,3.92,y,.6,.12,.6,a.dark);const T=new Gl(C,7,7,2);T.position.set(v,3.4,y),t.add(T),f(v,y,.25,.25)}let g=Xt.indexOf(i)*37;function _(){return g=g*1664525+1013904223>>>0,g/4294967296}h(0,-.55,0,25,1,22,"#263638");for(let v=-12;v<12;v++)for(let y=-10;y<11;y++){const C=i.id==="garden"?["#7b816a","#8b8b70","#64745e"]:["#586b6d","#657373","#475b61"];h(v+.5,.06,y+.5,.96,.15,.96,C[Math.floor(_()*3)])}for(let v=-12;v<=12;v+=.8)for(let y=.4;y<3;y+=.4)h(v,y,-10.5,.76,.37,.65,y>2.6?"#a0a18a":"#4d6561");for(let v=-10;v<11;v+=.8)for(const y of[-12,12])Math.abs(v)<2||(h(y,.65,v,.5,1.3,.76,a.dark),h(y,1.35,v,.7,.15,.78,a.stone));for(const v of[-9,-3,3,9]){h(v,4,-13,5,8,4,"#2b4145");for(let y=-1.5;y<2;y+=1)for(let C=3;C<7;C+=1.5)d(v+y,C,-10.96,.45,.7,.04,"#91b4ab",.25)}u(-10,-7),u(10,8);const m=Dv[i.id];if(!m)throw new Error(`Unknown district id: ${i.id}`);const p={group:t,obstacles:n,items:s,animated:r,geometry:o,colors:a,material:c,box:h,block:f,glow:d,lamp:u,random:_,def:i,completed:e};m(p);let E=null,b=null;if(i.note){const[v,y]=i.note;h(v,.6,y,.8,1.2,.6,a.dark),f(v,y,.8,.6),d(v,1.24,y,.5,.035,.4,"#d4c9a1",.4),s.push({type:"field-note",x:v,z:y,title:"Read the field note",sub:i.noteTitle,body:i.noteBody})}if(i.landmark){const[v,y]=i.landmark;E=d(v,2.5,y,.13,.13,.13,"#ffe0a0",2),b=new re(new dr(.8,.84,32),new Cs({color:"#e7c889",side:rn,transparent:!0,opacity:.65})),b.rotation.x=-Math.PI/2,b.position.set(v,.25,y),t.add(b),s.push({type:"landmark",x:v,z:y,title:i.action,sub:"A small act of restoration"})}const M=mv(i,{group:t,items:s,animated:r});function R(v){if(!(!M||!Array.isArray(v)))for(const y of v){const C=M.visuals.find(T=>T.def.id===y.nodeId);C&&gv(C,y)}}function w(v,y){E&&(E.position.y=2.5+Math.sin(v*2)*.12,E.material.emissive.set(y?"#93e9b6":"#ffe0a0")),b&&b.material.color.set(y?"#93e9b6":"#e7c889"),r.forEach(C=>C(v,y))}w(0,e);const L=t.children.filter(v=>v.isMesh&&v.geometry===o&&!v.material.transparent&&v.material.emissive?.getHex()===0),I=new Eo(o,new Je({color:"#ffffff",roughness:.62,metalness:.2}),L.length);return L.forEach((v,y)=>{v.updateMatrix(),I.setMatrixAt(y,v.matrix),I.setColorAt(y,v.material.color),t.remove(v)}),I.castShadow=I.receiveShadow=!0,t.add(I),{group:t,obstacles:n,items:s,update:w,setNodeStates:R,screenQuad:p.screenQuad||null}}const qr={market:{id:"market",minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3,spawn:[0,3],exitGarden:[10.7,0]},garden:{id:"garden",minX:-11.5,maxX:11.5,minZ:-10,maxZ:10.5,spawn:[-9.5,0],exitMarket:[-10.7,0]}};function oo(i){return!i||i==="market"?qr.market:i.startsWith("garden:")||i==="garden"?qr.garden:qr[i]?qr[i]:{id:i,minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3,spawn:[-9,0],exitWest:[-10.7,0],exitEast:[10.7,0]}}function vo(i,e,t,n){if(t<=i.minX||t>=i.maxX||n<=i.minZ||n>=i.maxZ)return!1;for(let s=0;s<e.length;s++){const r=e[s];if(Math.abs(t-r.x)<r.w&&Math.abs(n-r.z)<r.d)return!1}return!0}function Nv(i,e,t){return{x:Math.max(i.minX+.35,Math.min(i.maxX-.35,e)),z:Math.max(i.minZ+.35,Math.min(i.maxZ-.35,t))}}function Ov(i,e,t,n={x:24,y:24,w:106,h:72}){const s=(e-i.minX)/(i.maxX-i.minX),r=(t-i.minZ)/(i.maxZ-i.minZ);return{cx:n.x+Math.max(0,Math.min(1,s))*n.w,cy:n.y+Math.max(0,Math.min(1,r))*n.h}}function Fv(i){return vn[i]||Ii[i]||null}function Bv(i,e="B",t=1){const n=Fv(i);if(!n)return 0;const s=av[e]??1;return Math.max(1,Math.round(n.basePrice*t*s*.85))}function kv(i,e=1){const t=vn[i];if(!t)return 0;const n=1+(e-1)*.4;return Math.max(1,Math.round(t.seedCost*n))}class Hv{constructor(e,t={}){this.client=e,this.onAction=t,this.selectedCropId="radish",this.activeTool="hands",this.selectedSeed="radish",this.lastMachines={mill:{status:"broken",required:{...Md},contributed:{copper:0,timber:0,glass:0},restoredAt:null}},this.initDOM()}initDOM(){this.createMarketDialog(),this.createSeedDialog(),this.createContractDialog(),this.createInventoryDialog(),this.createProfileDialog(),this.createMachineShopDialog(),this.setupEventListeners()}createMarketDialog(){const e=document.createElement("dialog");e.id="market-dialog",e.className="game-modal",e.innerHTML=`
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
      <div class="micro modal-header-tag">GARDENER'S SATCHEL</div>
      <h2>Inventory & Harvests</h2>
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
      <p>Your identity is stored permanently on the server via your persistent token.</p>
      <label>Nickname: <input type="text" id="profile-nick-input" maxlength="20"></label>
      <button id="btn-save-nickname" class="action-btn">Update Nickname</button>
      <div class="modal-footer">
        <button id="close-profile" class="btn-secondary">Close →</button>
      </div>
    `,document.body.append(e)}setupEventListeners(){const e=document.getElementById("market-crop-tabs");e.innerHTML="";const t=[...xl,...hv];for(const n of t){const s=document.createElement("button");s.className=`crop-tab ${n.id===this.selectedCropId?"active":""}`,s.textContent=n.name,s.onclick=()=>{this.selectedCropId=n.id,document.querySelectorAll(".crop-tab").forEach(r=>r.classList.remove("active")),s.classList.add("active"),this.updateMarketView()},e.append(s)}document.querySelectorAll("#sell-quality-selector button").forEach(n=>{n.onclick=()=>{document.querySelectorAll("#sell-quality-selector button").forEach(s=>s.classList.remove("active")),n.classList.add("active"),this.updateMarketView()}}),document.getElementById("btn-instant-sell").onclick=()=>{const n=!!Ii[this.selectedCropId],s=document.querySelector("#sell-quality-selector button.active"),r=n?"B":s?s.dataset.qual:"B",o=parseInt(document.getElementById("sell-qty-input").value,10)||1;this.client.sendMarketSell(this.selectedCropId,r,o)},document.getElementById("btn-create-order").onclick=()=>{const n=document.getElementById("order-side").value,s=parseFloat(document.getElementById("order-price").value)||10,r=parseInt(document.getElementById("order-qty").value,10)||1;this.client.sendOrderPlace(n,this.selectedCropId,s,r,"B")},document.getElementById("close-market").onclick=()=>document.getElementById("market-dialog").close(),document.getElementById("close-seed-dialog").onclick=()=>document.getElementById("seed-dialog").close(),document.getElementById("close-contracts").onclick=()=>document.getElementById("contract-dialog").close(),document.getElementById("close-inventory").onclick=()=>document.getElementById("inventory-dialog").close(),document.getElementById("close-profile").onclick=()=>document.getElementById("profile-dialog").close(),document.getElementById("close-machine-shop").onclick=()=>document.getElementById("machine-shop-dialog").close(),document.getElementById("btn-save-nickname").onclick=()=>{const n=document.getElementById("profile-nick-input").value.trim();n&&(this.client.setNickname(n),document.getElementById("profile-dialog").close())}}openMarket(){this.updateMarketView(),document.getElementById("market-dialog").showModal()}openSeedVendor(){this.updateSeedVendorView(),document.getElementById("seed-dialog").showModal()}openContracts(){this.updateContractsView(),document.getElementById("contract-dialog").showModal()}openInventory(){this.updateInventoryView(),document.getElementById("inventory-dialog").showModal()}openProfile(){document.getElementById("profile-nick-input").value=this.client.nickname,document.getElementById("profile-dialog").showModal()}updateMachineShopView(e=null){e&&(this.lastMachines=e);const t=this.lastMachines?.mill,n=document.getElementById("mill-progress-summary"),s=document.getElementById("mill-material-rows"),r=document.getElementById("mill-flour-box"),o=document.getElementById("sprinkler-craft-box");if(!n||!s||!t)return;const a=this.lastPlayer,l=a?.materials||{};if(t.status==="restored")n.innerHTML=`
        <strong class="mill-restored-line">✦ The Great Mill is turning.</strong>
        <p>Restored by the community. It grinds wheat into flour for everyone, permanently.</p>
      `,s.innerHTML="";else{let u=0,g=0,_="";for(const m of xh){const p=t.required?.[m.id]||0,E=Math.min(t.contributed?.[m.id]||0,p);u+=E,g+=p;const b=l[m.id]||0,M=p-E,R=b>0&&M>0?`<button class="btn-contribute" data-material="${m.id}" data-qty="1">Give 1</button>
             <button class="btn-contribute" data-material="${m.id}" data-qty="${Math.min(b,M)}">Give all</button>`:"";_+=`
          <div class="mill-material-row">
            <span class="mill-mat-name">${m.name}</span>
            <span class="mill-mat-count">${E} / ${p}</span>
            <span class="mill-mat-held">satchel: ${b}</span>
            ${R}
          </div>`}n.innerHTML=`
        <strong>The Great Mill is broken.</strong>
        <p>Community restoration: ${u} / ${g} materials delivered.</p>
      `,s.innerHTML=_}if(s.querySelectorAll(".btn-contribute").forEach(u=>{u.onclick=()=>{this.client.send(ge.MACHINE_CONTRIBUTE,{actionId:this.nextActionId(),material:u.dataset.material,quantity:parseInt(u.dataset.qty,10)||1})}}),t.status==="restored"){const g=["C","B","A","A+"].reduce((p,E)=>p+(a?.inventory?.produce?.[`wheat_${E}`]||0),0),_=a?.inventory?.produce?.flour_B||0;r.innerHTML=`
        <div class="micro">MILLING · WHEAT → FLOUR (1:1)</div>
        <p class="machine-hint">Wheat in satchel: ${g} · Flour: ${_}</p>
        <div class="order-form-row">
          <input type="number" id="mill-qty-input" min="1" max="99" value="1">
          <button id="btn-mill-flour" class="action-btn"${g<=0?" disabled":""}>Mill Flour</button>
        </div>
      `;const m=r.querySelector("#btn-mill-flour");m&&(m.onclick=()=>{const p=parseInt(document.getElementById("mill-qty-input").value,10)||1;this.client.send(ge.MACHINE_MILL,{actionId:this.nextActionId(),quantity:p})})}else r.innerHTML=`
        <div class="micro">MILLING</div>
        <p class="machine-hint">The millstones wait. Restore the mill to grind wheat into flour.</p>
      `;const c=Object.entries(hs.cost).map(([u,g])=>`${g}× ${ql[u].name}`).join(" + "),h=Object.entries(hs.cost).map(([u,g])=>`${l[u]||0}/${g}`).join(" · "),f=Object.entries(hs.cost).every(([u,g])=>(l[u]||0)>=g);o.innerHTML=`
      <div class="micro">CRAFT · ${hs.name}</div>
      <p class="machine-hint">Cost: ${c}. Keeps covered beds watered on their own. (satchel: ${h})</p>
      <button id="btn-craft-sprinkler" class="action-btn"${f?"":" disabled"}>Craft Sprinkler Kit</button>
    `;const d=o.querySelector("#btn-craft-sprinkler");d&&(d.onclick=()=>{this.client.send(ge.MACHINE_CRAFT,{actionId:this.nextActionId(),fixture:hs.id})})}nextActionId(){return`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`}updateMarketView(e=null,t=null){e&&(this.lastPrices=e),t&&(this.lastOrderBook=t);const n=vn[this.selectedCropId]||Ii[this.selectedCropId];if(!n)return;const s=!!Ii[this.selectedCropId];document.getElementById("spot-crop-name").textContent=n.name,document.getElementById("spot-crop-tagline").textContent=n.tagline;const r=this.lastPrices?this.lastPrices[n.id]:null,o=r?r.multiplier:1,a=document.querySelector("#sell-quality-selector button.active"),l=s?"B":a?a.dataset.qual:"B",c=Bv(n.id,l,o);document.getElementById("spot-instant-bid").textContent=`${c} ⛁`,document.getElementById("spot-base-price").textContent=`${n.basePrice} ⛁`,document.getElementById("spot-multiplier").textContent=`${o.toFixed(2)}x`;const h=this.lastPlayer;let f=0;h&&h.inventory&&h.inventory.produce&&(f=h.inventory.produce[`${n.id}_${l}`]||0),document.getElementById("sell-owned-qty").textContent=f;const d=document.getElementById("orderbook-asks"),u=document.getElementById("orderbook-bids");if(d.innerHTML="",u.innerHTML="",this.lastOrderBook){const g=this.lastOrderBook.asks?.filter(m=>m.cropId===n.id)||[],_=this.lastOrderBook.bids?.filter(m=>m.cropId===n.id)||[];if(g.length===0)d.innerHTML='<div class="empty-book">No active asks</div>';else for(const m of g){const p=document.createElement("div");p.className="book-row ask-row",p.innerHTML=`<span>${m.quantity}x</span> <strong>${m.price} ⛁</strong>`,d.append(p)}if(_.length===0)u.innerHTML='<div class="empty-book">No active bids</div>';else for(const m of _){const p=document.createElement("div");p.className="book-row bid-row",p.innerHTML=`<span>${m.quantity}x</span> <strong>${m.price} ⛁</strong>`,u.append(p)}}}updateSeedVendorView(){const e=document.getElementById("seed-catalog-list");e.innerHTML="";for(const t of xl){const n=document.createElement("div");n.className="seed-card panel";const s=this.lastPrices&&this.lastPrices[t.id]?this.lastPrices[t.id].multiplier:1,r=kv(t.id,s);n.innerHTML=`
        <div class="micro">GROWTH: ${t.growDuration}S · YIELD: ${t.yield}x</div>
        <strong>${t.name}</strong>
        <p>${t.tagline}</p>
        <div class="seed-card-footer">
          <b>${r} ⛁</b>
          <button data-crop="${t.id}" class="btn-buy-seed">Buy Seed Packet</button>
        </div>
      `,n.querySelector(".btn-buy-seed").onclick=()=>{this.client.sendMarketBuy(t.id,1)},e.append(n)}}updateContractsView(e=null){e&&(this.lastContracts=e);const t=document.getElementById("contracts-container");t.innerHTML="";const n=this.lastContracts||[];if(n.length===0){t.innerHTML="<p>No active restaurant contracts at this moment. Check back soon!</p>";return}for(const s of n){const r=document.createElement("div");r.className="contract-card panel",r.innerHTML=`
        <div class="contract-head">
          <span class="micro">${s.client.toUpperCase()}</span>
          <span class="contract-reward">+${s.reward} ⛁ · +${s.reputation} ★ · +${s.xp} XP</span>
        </div>
        <strong>Order: ${s.quantity}x ${s.cropName} (Min Grade ${s.minQuality})</strong>
        <button data-id="${s.id}" class="btn-fulfill-contract">Deliver Order →</button>
      `,r.querySelector(".btn-fulfill-contract").onclick=()=>{this.client.sendContractComplete(s.id)},t.append(r)}}updateInventoryView(e=null){e&&(this.lastPlayer=e);const t=document.getElementById("inv-seeds-list"),n=document.getElementById("inv-produce-list"),s=document.getElementById("inv-materials-list");t.innerHTML="",n.innerHTML="",s.innerHTML="";const r=this.lastPlayer;if(!r||!r.inventory)return;const o=r.inventory.seeds||{},a=Object.entries(o).filter(([u,g])=>g>0);if(a.length===0)t.innerHTML='<div class="empty-msg">No seeds in satchel</div>';else for(const[u,g]of a){const _=vn[u],m=document.createElement("div");m.className="inv-item",m.innerHTML=`<strong>${_?.name||u}</strong> <span>${g} packets</span>`,m.onclick=()=>{this.selectedSeed=u,this.activeTool="seed",this.onAction.onSelectTool?.("seed",u),document.getElementById("inventory-dialog").close()},t.append(m)}const l=r.inventory.produce||{},c=Object.entries(l).filter(([u,g])=>g>0);if(c.length===0)n.innerHTML='<div class="empty-msg">No harvested produce</div>';else for(const[u,g]of c){const[_,m]=u.split("_"),p=vn[_]||Ii[_],E=!!Ii[_],b=document.createElement("div");b.className="inv-item",b.innerHTML=`<strong>${p?.name||_}</strong> ${E?"":`<span class="badge-grade">Grade ${m}</span>`} <span>${g} units</span>`,n.append(b)}const h=r.materials||{},f=xh.map(u=>[u,h[u.id]||0]).filter(([,u])=>u>0),d=r.inventory.sprinklers||0;if(f.length===0&&d<=0)s.innerHTML='<div class="empty-msg">No materials yet — gather them in the outer districts</div>';else{for(const[u,g]of f){const _=document.createElement("div");_.className="inv-item",_.innerHTML=`<strong>${u.name}</strong> <span>${g} units</span>`,s.append(_)}if(d>0){const u=document.createElement("div");u.className="inv-item",u.innerHTML=`<strong>${hs.name} kit</strong> <span>${d} ready — place on a bed (tool 6)</span>`,s.append(u)}}}updatePlayerHUD(e){this.lastPlayer=e;const t=document.getElementById("hud-coins"),n=document.getElementById("hud-rep"),s=document.getElementById("hud-xp"),r=document.getElementById("hud-nick");t&&(t.textContent=`${e.coins} ⛁`),n&&(n.textContent=`${e.reputation||10} ★`),s&&(s.textContent=`Lvl ${e.level||1} · ${e.xp||0} XP`),r&&(r.textContent=e.nickname)}}const zv=200,ya="afterlight-chat-size",xa=280,Ma=120,Vv=640,Gv=560;function ds(i,e,t){return Math.max(e,Math.min(t,i))}class Wv{constructor(e,{onFocusChange:t=null}={}){this.net=e,this.onFocusChange=t,this.collapsed=!1,this.unread=0,this.panel=document.getElementById("chat-panel"),this.log=document.getElementById("chat-log"),this.toggle=document.getElementById("chat-toggle"),this.unreadBadge=document.getElementById("chat-unread"),this.form=document.getElementById("chat-form"),this.input=document.getElementById("chat-input"),this.sendBtn=document.getElementById("chat-send"),this.handle=document.getElementById("chat-resize"),this.connected=!1,!(!this.panel||!this.log)&&(this.toggle.addEventListener("click",()=>this.setCollapsed(!this.collapsed)),this.input.addEventListener("focus",()=>this.onFocusChange?.(!0)),this.input.addEventListener("blur",()=>this.onFocusChange?.(!1)),this.input.addEventListener("keydown",n=>{if(n.stopPropagation(),n.code==="Escape"){n.preventDefault(),this.input.blur();return}n.code==="Enter"&&(n.preventDefault(),this.submit(n.shiftKey))}),this.form.addEventListener("submit",n=>{n.preventDefault(),this.submit(n.shiftKey||document.activeElement!==this.input)}),this.net.on(ge.CHAT_HISTORY,n=>this.setHistory(n.messages||[])),this.net.on(ge.CHAT_MESSAGE,n=>this.addMessage(n)),this.net.on(ge.CHAT_DM,n=>this.addDM(n)),this.net.on(ge.CHAT_PRESENCE,n=>this.addPresence(n)),this.net.on(ge.CHAT_ERROR,n=>this.addError(n)),this.net.onDisconnect(()=>this.setConnected(!1)),this.net.onConnect(()=>this.setConnected(!0)),this.setConnected(this.net.connected),this.#h())}setConnected(e){this.connected=e,this.input&&(this.input.disabled=!e,this.sendBtn.disabled=!e,this.input.placeholder=e?"Say hello… (Enter to chat, Esc to release)":"The relay is quiet — reconnecting…",e||this.addSystemLine("The town relay is out of reach."))}setCollapsed(e){this.collapsed=e,this.panel.classList.toggle("collapsed",e),this.toggle.setAttribute("aria-expanded",String(!e)),e||this.#p()}focusInput(e=""){if(!this.connected){this.setCollapsed(!1),this.input.focus();return}this.setCollapsed(!1),e&&(this.input.value=e),this.input.focus()}submit(e=!1){const t=this.input.value.trim();this.input.value="",t&&this.connected&&(this.net.sendChat(t),e||this.input.blur())}setHistory(e){this.log.textContent="";for(const t of e)this.addMessage(t,{fromHistory:!0});this.#c(!0)}addMessage(e){if((e.fromKind||"player")==="system"){this.addSystemLine(e.text);return}const n=this.#t(e);e.action?n.appendChild(this.#e("chat-body chat-action",`${e.from} ${Sh(e.text)}`)):(n.appendChild(this.#e("chat-nick",e.from)),n.appendChild(this.#e("chat-body",e.text))),this.#n(n,e.from===this.net.nickname)}addDM(e){const t=this.#t(e),n=e.echo||e.from===this.net.nickname,s=n?e.to:e.from;t.appendChild(this.#e("chat-nick",n?`to ${s}`:`from ${s}`)),t.appendChild(this.#e("chat-body",e.action?`${e.from} ${Sh(e.text)}`:e.text)),this.#n(t,n,"dm")}addPresence(e){const t=e.event==="join"?"steps into the town channel":" drifts away from it",n=e.fromKind==="irc"?" (relay)":"";this.addSystemLine(`${e.who}${n}${t}.`)}addError(e){const t=this.#t({ts:Date.now()});t.appendChild(this.#e("chat-body chat-error",e.message)),this.#n(t,!1,"error")}addSystemLine(e){const t=this.#t({ts:Date.now()});t.appendChild(this.#e("chat-body chat-system",e)),this.#n(t,!1,"system")}#h(){if(!this.handle)return;this.sizeMedia=window.matchMedia("(max-width: 900px)"),this.#a(),this.sizeMedia.addEventListener("change",()=>this.#a()),window.addEventListener("resize",()=>this.#a());let e=null;const t=s=>{if(!e)return;s.preventDefault();const r=ds(e.w-(s.clientX-e.x),xa,this.#i()),o=ds(e.h-(s.clientY-e.y),Ma,this.#s());this.#r(r,o)},n=()=>{e&&(e=null,window.removeEventListener("pointermove",t),window.removeEventListener("pointerup",n),window.removeEventListener("pointercancel",n),this.#l(this.#o()))};this.handle.addEventListener("pointerdown",s=>{if(!(this.sizeMedia.matches||this.collapsed)){s.preventDefault(),e={x:s.clientX,y:s.clientY,w:this.panel.getBoundingClientRect().width,h:this.log.getBoundingClientRect().height};try{this.handle.setPointerCapture(s.pointerId)}catch{}window.addEventListener("pointermove",t),window.addEventListener("pointerup",n),window.addEventListener("pointercancel",n)}}),this.handle.addEventListener("dblclick",()=>this.#u()),this.handle.addEventListener("keydown",s=>{if(this.sizeMedia.matches||this.collapsed)return;const r=s.shiftKey?8:28,o=this.#o();let a=o.w,l=o.h;if(s.code==="ArrowLeft")a+=r;else if(s.code==="ArrowRight")a-=r;else if(s.code==="ArrowUp")l+=r;else if(s.code==="ArrowDown")l-=r;else return;s.preventDefault(),this.#r(ds(a,xa,this.#i()),ds(l,Ma,this.#s())),this.#l(this.#o())})}#i(){return Math.min(Vv,window.innerWidth-380)}#s(){return Math.min(Gv,window.innerHeight-260)}#r(e,t){this.panel.style.width=`${Math.round(e)}px`,this.log.style.height=`${Math.round(t)}px`}#o(){return{w:this.panel.getBoundingClientRect().width,h:this.log.getBoundingClientRect().height}}#a(){const e=this.#d();if(this.sizeMedia.matches||!e){this.panel.style.width="",this.log.style.height="";return}this.#r(ds(e.w,xa,this.#i()),ds(e.h,Ma,this.#s()))}#d(){try{const e=localStorage.getItem(ya);if(!e)return null;const t=JSON.parse(e);return!t||!Number.isFinite(t.w)||!Number.isFinite(t.h)?null:t}catch{return null}}#l(e){try{localStorage.setItem(ya,JSON.stringify({w:Math.round(e.w),h:Math.round(e.h)}))}catch{}}#u(){try{localStorage.removeItem(ya)}catch{}this.panel.style.width="",this.log.style.height=""}#t(e={}){const t=document.createElement("div");t.className="chat-line";const n=e.ts?new Date(e.ts):new Date,s=String(n.getHours()).padStart(2,"0"),r=String(n.getMinutes()).padStart(2,"0");return t.appendChild(this.#e("chat-time",`${s}:${r}`)),t}#e(e,t){const n=document.createElement("span");return n.className=e,n.textContent=t,n}#n(e,t,n=""){for(n&&e.classList.add(n),t&&e.classList.add("self"),this.log.appendChild(e);this.log.childElementCount>zv;)this.log.firstChild.remove();this.#c(),this.collapsed&&this.#f()}#c(e=!1){const t=this.log.scrollHeight-this.log.scrollTop-this.log.clientHeight<48;(e||t)&&(this.log.scrollTop=this.log.scrollHeight)}#f(){this.unread+=1,this.unreadBadge.hidden=!1,this.unreadBadge.textContent=String(this.unread)}#p(){this.unread=0,this.unreadBadge.hidden=!0,this.unreadBadge.textContent=""}}function Sh(i){return String(i??"").replace(/^\u0001ACTION /,"").replace(/\u0001$/,"")}const Xv=2048,qv={RESOLVE_TIMEOUT_MS:45e3},$v=/^[0-9a-fA-F]{40}$/,Yv=/^[A-Z2-7]{32}$/;function jv(i){if(typeof i!="string")return null;const e=i.trim();if(!e||e.length>Xv||!e.toLowerCase().startsWith("magnet:?"))return null;let t;try{t=new URL(e)}catch{return null}if(t.protocol!=="magnet:")return null;for(const n of t.searchParams.getAll("xt")){const s=/^urn:btih:(.+)$/i.exec(n.trim());if(!s)continue;const r=s[1];if($v.test(r))return{url:e,infohash:r.toLowerCase()};if(Yv.test(r)){const o="0123456789abcdef";let a=0,l=0,c="";for(const h of r.toUpperCase())if(l=l<<5|"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(h),a+=5,a>=8){const f=l>>a-8&255;c+=o[f>>4&15]+o[f&15],a-=8}return{url:e,infohash:c}}}return null}function Kv(i,e,t=120){const n=String(i||"").replace(/\s+/g," ").trim(),s=String(e||"").split("/").pop().replace(/\s+/g," ").trim();return(n&&s&&s.toLowerCase()!==n.toLowerCase()?`${n} — ${s}`:n||s||"A torrent stream").slice(0,t)}function Zv(i){if(!i||typeof i!="object")return null;const e=typeof i.infohash=="string"&&/^[0-9a-f]{40}$/.test(i.infohash)?i.infohash:null;if(!e)return null;const t=Number(i.progress),n=Number(i.peers),s=Number(i.downloaded);return{infohash:e,progress:Number.isFinite(t)?Math.min(1,Math.max(0,t)):0,peers:Number.isInteger(n)&&n>=0?n:0,downloaded:Number.isFinite(s)&&s>=0?s:0,ready:i.ready===!0}}function Jv(i){switch(i){case"engine_unavailable":return"The projector’s torrent engine is unavailable right now.";case"invalid_magnet":return"That does not look like a magnet link (magnet:?xt=urn:btih:…).";case"resolve_timeout":return"The swarm never answered in time. Check the torrent has seeders and try again.";case"resolve_failed":return"The torrent could not be resolved. It may have no seeders.";case"metadata_timeout":return"The torrent’s file list is taking too long to arrive. Try again.";case"file_not_streamable":return"That file is not something the projector can stream from the torrent.";case"resolve_in_flight":return"Hold on — one torrent is still being looked up.";case"no_file_chosen":return"Pick a file from the torrent first.";default:return"The torrent reel jams; try that magnet again."}}const ao={URL_MAX:2048,QUEUE_MAX:50},Eh={youtube:"YouTube",youtubePlaylist:"YouTube playlist",vimeo:"Vimeo",file:"Video file",hls:"Live stream (HLS)",torrent:"Torrent stream"};function Qv(i){switch(i){case"youtube":return"A YouTube video";case"vimeo":return"A Vimeo video";case"hls":return"Live channel";case"file":return"A video link";case"torrent":return"A torrent stream";default:return"Something to watch"}}const ey=new Set(["youtube.com","www.youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com","youtu.be","www.youtu.be"]),ty=/\.(mp4|webm|m4v|mov|ogv|ogg)$/i;function bh(i){if(typeof i!="string")return null;const e=i.trim();if(!e||e.length>ao.URL_MAX)return null;let t;try{t=new URL(e)}catch{return null}const n=jv(e);if(n)return{kind:"torrent",url:n.url,infohash:n.infohash};if(t.protocol!=="http:"&&t.protocol!=="https:")return null;const s=t.hostname.toLowerCase(),r=t.pathname;if(ey.has(s)){let o=null,a;if(s.endsWith("youtu.be")?(a=r.match(/^\/([\w-]{6,})/),o=a?a[1]:null):(a=r.match(/^\/(?:watch\/)?(?:\?v=)?\/?$/))&&t.searchParams.has("v"),!o&&t.searchParams.has("v")){const h=t.searchParams.get("v");/^[\w-]{6,}$/.test(h)&&(o=h)}o||(a=r.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/),a&&(o=a[1]));const l=t.searchParams.get("list"),c=l&&/^[\w-]{12,}$/.test(l)?l:null;return o?c?{kind:"youtube",url:e,videoId:o,listId:c}:{kind:"youtube",url:e,videoId:o}:c?{kind:"youtubePlaylist",listId:c,url:e}:null}if(s==="vimeo.com"||s==="www.vimeo.com"||s==="player.vimeo.com"){const o=r.match(/^\/(?:video\/)?(\d{6,})(?:[/?]|$)/);return o?{kind:"vimeo",url:e,videoId:o[1]}:null}return r.toLowerCase().endsWith(".m3u8")?{kind:"hls",url:e}:ty.test(r)?{kind:"file",url:e}:null}function ny(i,e){return e?`https://player.vimeo.com/video/${e}?autoplay=1&controls=0&enablejsapi=1`:null}function iy(i,e){return i?i.playing?i.positionSec+Math.max(0,(e-i.updatedAt)/1e3):i.positionSec:0}function Th(i){switch(i){case"invalid_url":return"That link is not something the projector can play. Try YouTube, Vimeo, a direct video file, or an .m3u8 stream.";case"no_file_chosen":return"Pick a file from that torrent first — paste the magnet and choose from its file list.";case"url_too_long":return"That link is far too long to pin to the marquee.";case"queue_full":return"The queue reel is full. Remove something first.";case"item_not_found":return"That item is no longer on the bill.";case"nothing_playing":return"Nothing is on the screen right now.";case"item_mismatch":return"The screen has moved on to something else.";case"invalid_position":return"That timestamp does not make sense.";case"seek_unsupported":return"Live channels cannot be rewound.";case"invalid_action":return"The projector does not understand that request.";case"use_import":return"That link is a whole playlist — import it and its videos come to the reel together.";case"is_mix":return"Radio mixes never end, so the projector cannot pin them down — add the video itself instead.";case"playlist_not_public":return"That playlist is private or no longer exists — the projector can only read public playlists.";case"playlist_unreadable":return"The projector could not read that playlist just now. Give it a moment and try again.";case"resolve_in_flight":return"Hold on — one playlist is still being read.";case"resolve_cooldown":return"Give the projector a breath — try that playlist again in a moment.";default:return"The projector ignores that."}}const On={LISTS_MAX:24,LIST_TEXT_MAX:8*1024*1024,CHANNELS_MAX:2e4,CHANNEL_NAME_MAX:200,GROUP_MAX:120,EPG_LOOKUP_MAX:300};function sy(i,e=On.CHANNELS_MAX){const t=[];if(!Array.isArray(i))return t;const n=Number.isFinite(e)&&e>0?e:On.CHANNELS_MAX;for(const s of i){if(t.length>=n)break;if(!s||typeof s!="object")continue;const r=typeof s.url=="string"?s.url.trim():"";if(!/^https?:\/\//i.test(r))continue;const o=typeof s.tvgId=="string"?s.tvgId.trim().slice(0,On.GROUP_MAX):"";t.push({url:r,name:typeof s.name=="string"&&s.name.trim()?s.name.trim().slice(0,On.CHANNEL_NAME_MAX):`Channel ${t.length+1}`,group:typeof s.group=="string"&&s.group.trim()?s.group.trim().slice(0,On.GROUP_MAX):null,logo:typeof s.logo=="string"&&/^https?:\/\//i.test(s.logo.trim())?s.logo.trim():null,tvgId:o||null})}return t}function ry(i){switch(i){case"too_many_lists":return`The theater's channel shelf is full (${On.LISTS_MAX} lists). Remove one to make room.`;case"text_too_large":return"That playlist text is too large to file — trim it or split it into a couple of lists.";case"too_many_channels":return`That playlist carries more than ${On.CHANNELS_MAX} channels — more than the guide can hold.`;case"no_channels":return"No playable channels were found in that playlist.";case"not_a_playlist":return"That does not look like an M3U/M3U8 playlist — it should start with #EXTM3U or contain channel URLs, one per line.";case"list_not_found":return"That list is no longer in the theater library.";default:return"The theater could not accept that."}}function $r(i){return String(i).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function oy(i){let e=`#EXTM3U
`;for(const t of Array.isArray(i)?i:[]){if(!t?.url||!/^https?:\/\//i.test(t.url))continue;const n=[];t.tvgId&&n.push(`tvg-id="${$r(t.tvgId)}"`),t.name&&n.push(`tvg-name="${$r(t.name)}"`),t.group&&n.push(`group-title="${$r(t.group)}"`),t.logo&&n.push(`tvg-logo="${$r(t.logo)}"`),e+=`#EXTINF:-1 ${n.join(" ")},${t.name||"Channel"}
${t.url}
`}return e}const Yr=100,ay=1.5,ly=2e3,Ed=8e3,cy=3e3,hy=2e4,Sa=5,wh="afterlight-iptv-lists",dy=12,uy=5e3,fy=6e4;function py(i,e){const t=[1,0,0,0,1,0,0,0,1];if(!Array.isArray(i)||!Array.isArray(e)||i.length<4||e.length<4)return t;const n=[];for(let o=0;o<4;o++){const a=i[o]||{},l=e[o]||{},c=Number(a.x),h=Number(a.y),f=Number(l.x),d=Number(l.y);if(![c,h,f,d].every(Number.isFinite))return t;n.push([c,h,1,0,0,0,-f*c,-f*h,f]),n.push([0,0,0,c,h,1,-d*c,-d*h,d])}const s=8;for(let o=0;o<s;o++){let a=o;for(let c=o+1;c<n.length;c++)Math.abs(n[c][o])>Math.abs(n[a][o])&&(a=c);if(Math.abs(n[a][o])<1e-12)return t;if(a!==o){const c=n[a];n[a]=n[o],n[o]=c}const l=n[o][o];for(let c=o;c<=s;c++)n[o][c]/=l;for(let c=0;c<n.length;c++){if(c===o)continue;const h=n[c][o];if(h!==0)for(let f=o;f<=s;f++)n[c][f]-=h*n[o][f]}}const r=[];for(let o=0;o<s;o++)r.push(n[o][s]);return r.push(1),r}function my(i){const e=(t,n=0)=>{const s=Number(i?.[t]);return Number.isFinite(s)?s:t===8?1:n};return`matrix3d(${e(0)}, ${e(3)}, 0, ${e(6)}, ${e(1)}, ${e(4)}, 0, ${e(7)}, 0, 0, 1, 0, ${e(2)}, ${e(5)}, 0, ${e(8)})`}const lo="Other";function bd(i){const e=typeof i=="string"?i.trim():"";if(!e)return{country:null,category:null};const t=e.indexOf("|");return t<0?{country:e,category:null}:{country:e.slice(0,t).trim()||null,category:e.slice(t+1).trim()||null}}function gy(i){const e=new Map;let t=0,n=0;for(const s of Array.isArray(i)?i:[]){const{country:r,category:o}=bd(s?.group);if(!r&&!o){n+=1;continue}t+=1;const a=r||lo;e.has(a)||e.set(a,new Set),o&&e.get(a).add(o)}return t>0&&n>0&&e.set(lo,e.get(lo)||new Set),{countries:[...e.keys()].sort((s,r)=>s.localeCompare(r)),categoriesFor(s){const r=s==="All"?[...e.values()]:[e.get(s)].filter(Boolean),o=new Set;for(const a of r)for(const l of a)o.add(l);return[...o].sort((a,l)=>a.localeCompare(l))}}}function Ah(i,e,t){const{country:n,category:s}=bd(i?.group);return!(e&&e!=="All"&&(n||lo)!==e||t&&t!=="All"&&(s||"")!==t)}function Ch(i,e=0){const t=[];if(!Array.isArray(i))return t;const n=Number.isFinite(Number(e))?Number(e):0;for(const s of i){if(t.length>=dy)break;if(!s||typeof s!="object")continue;const r=[];if(Array.isArray(s.channels))for(const o of s.channels){if(r.length>=uy)break;if(!o||typeof o!="object")continue;const a=typeof o.url=="string"?o.url.trim():"";if(!/^https?:\/\//i.test(a))continue;const l=typeof o.logo=="string"?o.logo.trim():"";r.push({url:a,name:typeof o.name=="string"&&o.name.trim()?o.name.trim().slice(0,200):`Channel ${r.length+1}`,group:typeof o.group=="string"&&o.group.trim()?o.group.trim().slice(0,120):null,logo:/^https?:\/\//i.test(l)?l:null})}r.length!==0&&t.push({id:typeof s.id=="string"&&s.id?s.id:`iptv_${t.length}_${n}`,name:typeof s.name=="string"&&s.name.trim()?s.name.trim().slice(0,80):"Untitled list",savedAt:Number.isFinite(Number(s.savedAt))?Number(s.savedAt):n,channels:r})}return t}function Rh(i,e){const t=i.getBoundingClientRect();return e.clientX<t.left||e.clientX>t.right||e.clientY<t.top||e.clientY>t.bottom}const jr=new Map;function Td(i,e=Ed){if(typeof document>"u")return Promise.reject(new Error("no document"));if(jr.has(i))return jr.get(i);const t=new Promise((n,s)=>{const r=document.createElement("script"),o=setTimeout(()=>s(new Error(`Timed out loading ${i}`)),e);r.src=i,r.async=!0,r.onload=()=>{clearTimeout(o),n()},r.onerror=()=>{clearTimeout(o),jr.delete(i),s(new Error(`Failed to load ${i}`))},document.head.append(r)});return jr.set(i,t),t}let Ws=null;function _y(){return typeof window>"u"?Promise.reject(new Error("no window")):window.YT&&window.YT.Player?Promise.resolve(window.YT):(Ws||(Ws=new Promise((i,e)=>{const t=setTimeout(()=>e(new Error("YouTube IFrame API timed out")),Ed),n=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(clearTimeout(t),typeof n=="function")try{n()}catch{}window.YT&&window.YT.Player?i(window.YT):e(new Error("YouTube IFrame API missing after load"))},Td("https://www.youtube.com/iframe_api").catch(s=>{clearTimeout(t),e(s)})}),Ws.catch(()=>{Ws=null})),Ws)}async function vy(){if(typeof window>"u")throw new Error("no window");if(window.Vimeo&&window.Vimeo.Player||(await Td("https://player.vimeo.com/api/player.js"),window.Vimeo&&window.Vimeo.Player))return window.Vimeo;throw new Error("Vimeo player SDK missing after load")}class yy{constructor(e=null){this.net=e,this.state=null,this.serverDelta=0,this.roomActive=!1,this.quad=null,this.engine=null,this.loadedItemId=null,this.reportedForId=null,this.overlayState="idle",this.errorTitle=null,this.awaitingGesture=!1,this.lastDriftCheckMs=0,this.loadToken=0,this.volume=1,this.watching=!1,this.onStandUpRequest=null,this.seatedInWorld=!1,this.savedLists=[],this.sharedCatalog={lists:[],epg:null},this.sharedChannels=new Map,this.pendingFlip=0,this.epgSchedule=new Map,this.epgTimer=null,this.activeListId=null,this.activeChannelIndex=-1,this.guideCountry="All",this.guideCategory="All",this.guideListId=null,this.torrentPending=null,this.torrentPick=null,this.torrentStatuses=new Map,this.playlistPending=null,this.playlistChoice=null,this.playlistPreview=null,this.overlayW=Yr,this.overlayH=Yr,this.dom=null,typeof document<"u"&&(this.dom={},this.buildOverlay(),this.buildControlsButton(),this.buildDialogs(),this.buildWatchBar(),this.savedLists=this.loadSavedLists(),this.syncOverlay()),e&&typeof e.on=="function"&&(e.on(ge.THEATER_STATE,t=>this.applyState(t?.theater,t?.serverNow||Date.now())),e.on(ge.IPTV_STATE,t=>this.applyIptvState(t?.iptv)),e.on(ge.IPTV_LIST,t=>this.applySharedList(t)),e.on(ge.EPG_SCHEDULE,t=>this.applyEpgSchedule(t)),e.on(ge.TORRENT_FILES,t=>this.applyTorrentFiles(t)),e.on(ge.TORRENT_STATE,t=>this.applyTorrentStatus(t)),e.on(ge.THEATER_PLAYLIST_RESOLVED,t=>this.applyPlaylistResolved(t)),e.on(ge.THEATER_IMPORT_RESULT,t=>this.applyImportResult(t)),e.on(ge.ERROR,t=>this.applyServerErrorMessage(t)))}setRoomActive(e){this.roomActive=!!e,this.roomActive?this.state?.now?(this.loadedItemId=null,this.loadCurrent()):this.setOverlayState("idle"):(this.teardownEngine(),this.loadedItemId=null,this.awaitingGesture=!1,this.cancelTorrentResolve(),this.torrentPick=null,this.torrentStatuses.clear(),this.cancelPlaylistResolve(),this.playlistChoice=null,this.playlistPreview=null,this.dom?.playlistDialog?.open&&this.dom.playlistDialog.close(),this.dom?.playlistChoiceDialog?.open&&this.dom.playlistChoiceDialog.close(),this.setOverlayState("idle")),this.dom?.controlsBtn&&(this.dom.controlsBtn.hidden=!this.roomActive),this.syncOverlay()}applyState(e,t=null){const n=e&&typeof e=="object"?e:{now:null,queue:[]};this.state={now:n.now&&typeof n.now=="object"?n.now:null,queue:Array.isArray(n.queue)?n.queue:[]};const s=Number(t);if(Number.isFinite(s)&&s>0&&(this.serverDelta=s-Date.now()),this.dom?.controlsDialog?.open&&this.renderControls(),this.dom?.guideDialog?.open&&this.renderGuide(),this.watching&&this.updateWatchBar(),!this.roomActive)return;const r=this.state.now;if(!r){(this.engine||this.loadedItemId!==null)&&this.teardownEngine(),this.loadedItemId=null,this.reportedForId=null,this.setOverlayState("idle"),this.syncOverlay();return}this.rememberChannelFor(r.url),r.id!==this.loadedItemId?(this.reportedForId=null,this.loadCurrent()):this.enforceSync(),this.syncOverlay()}updateScreenQuad(e,t=1){if(this.quad=Array.isArray(e)&&e.length>=4?e:null,this.dom?.overlay&&this.quad&&!this.watching){const n=this.quad.map(d=>d.x),s=this.quad.map(d=>d.y),r=Math.max(0,Math.max(...n)-Math.min(...n))*Math.max(0,Math.max(...s)-Math.min(...s)),o=Number.isFinite(t)&&t>0?t:1,a=Math.min(Math.max(Math.sqrt(Math.max(r,1)*o),Yr),2400),l=Math.round(a),c=Math.max(1,Math.round(a/o));if(Math.abs(l-this.overlayW)>2||Math.abs(c-this.overlayH)>2){this.overlayW=l,this.overlayH=c;const d=this.dom.overlay.style;d.width=`${l}px`,d.height=`${c}px`,d.setProperty("--ts-scale",(c/Yr).toFixed(3))}const h=[{x:0,y:0},{x:l,y:0},{x:l,y:c},{x:0,y:c}],f=[this.quad[3],this.quad[2],this.quad[1],this.quad[0]];this.dom.overlay.style.transform=my(py(h,f))}this.syncOverlay(),this.tickDriftCheck()}openControls(){this.dom?.controlsDialog&&(this.renderControls(),this.dom.controlsDialog.open||this.dom.controlsDialog.showModal())}isWatching(){return!!this.watching}setWatchMode(e){if(typeof document>"u")return;const t=!!e;t!==this.watching&&(this.watching=t,document.body.classList.toggle("theater-watching",this.watching),document.activeElement?.id==="chat-input"&&document.activeElement.blur(),this.dom?.overlay&&(this.watching?(this.dom.overlay.style.transform="",this.dom.overlay.style.width="",this.dom.overlay.style.height="",this.dom.overlay.style.removeProperty("--ts-scale")):this.dom.overlay.style.aspectRatio=""),this.watching&&this.dockChatForWatch(),this.updateWatchBar(),this.syncOverlay())}dockChatForWatch(){const e=document.getElementById("chat-panel");if(!e){document.body.style.setProperty("--theater-chat-gutter","0px");return}e.classList.contains("collapsed")&&document.getElementById("chat-toggle")?.click(),requestAnimationFrame(()=>{if(!this.watching)return;const t=e.getBoundingClientRect(),n=t.width>0?Math.ceil(t.width+Math.max(0,window.innerWidth-t.right)):0;document.body.style.setProperty("--theater-chat-gutter",`${n}px`)})}buildWatchBar(){const e=document.createElement("div");e.id="theater-watchbar",e.hidden=!0,e.innerHTML=`
      <span class="theater-watchbar-title" id="theater-watchbar-title">The Orpheum</span>
      <span class="theater-watchbar-state micro" id="theater-watchbar-state"></span>
      <button type="button" id="theater-watchbar-controls" title="Open the projection booth (G)">▣ Booth</button>
      <button type="button" id="theater-watchbar-leave" title="Stand up and return to the game (Esc)">⤺ Stand up</button>
    `,document.body.append(e),e.querySelector("#theater-watchbar-controls").addEventListener("click",()=>this.openControls()),e.querySelector("#theater-watchbar-leave").addEventListener("click",()=>{this.onStandUpRequest?.(),this.setWatchMode(!1)}),this.watchbar=e,this.watchbarTitle=e.querySelector("#theater-watchbar-title"),this.watchbarState=e.querySelector("#theater-watchbar-state")}updateWatchBar(){if(!this.watchbar||(this.watchbar.hidden=!this.watching,!this.watching))return;const e=this.state?.now;this.watchbarTitle.textContent=e?`Now playing · ${e.title}`:"The Orpheum · the screen sleeps",this.watchbarState.textContent=e?e.playing?"▶":"⏸":"";const t=this.watchbar.querySelector("#theater-watchbar-leave");t&&(t.textContent=this.seatedInWorld?"⤺ Stand up":"⤺ Back to the world",t.title=this.seatedInWorld?"Stand up and return to the game (Esc)":"Step out of the cinema view and walk the aisles (Esc)")}setSeated(e){this.seatedInWorld=!!e,this.watching&&this.updateWatchBar()}openGuide(){this.dom?.guideDialog&&(this.renderGuide(),this.dom.guideDialog.open||this.dom.guideDialog.showModal(),this.requestEpgSchedule(),this.startEpgRefresh())}targetPosition(e=Date.now()){return this.state?.now?iy(this.state.now,e+this.serverDelta):0}tickDriftCheck(){const e=this.state?.now;if(!this.roomActive||!e||!this.engine||this.engine.degraded||!this.engine.ready)return;const t=Date.now();t-this.lastDriftCheckMs<ly||(this.lastDriftCheckMs=t,this.enforceSync())}enforceSync(){if(!this.engine||this.engine.degraded||!this.engine.ready)return;const e=this.state?.now;if(!e)return;const t=this.engine.getTime?this.engine.getTime():null,n=this.targetPosition();Number.isFinite(t)&&Number.isFinite(n)&&Math.abs(t-n)>ay&&e.kind!=="hls"&&this.engine.seek(Math.max(0,n)),e.playing?this.awaitingGesture||this.engine.play():this.engine.pause()}teardownEngine(){const e=this.engine;if(this.engine=null,this.awaitingGesture=!1,this.hideGestureBadge(),e)try{e.destroy?.()}catch{}this.dom?.mediaHost&&(this.dom.mediaHost.innerHTML="")}loadCurrent(){const e=this.state?.now;if(!e||!this.dom)return;const t=++this.loadToken;switch(this.teardownEngine(),this.loadedItemId=e.id,this.errorTitle=null,this.setOverlayState("loading"),e.kind){case"file":this.startFileEngine(e,t,!1);break;case"hls":this.startFileEngine(e,t,!0);break;case"torrent":this.startFileEngine(e,t,!1);break;case"youtube":this.startYouTubeEngine(e,t);break;case"vimeo":this.startVimeoEngine(e,t);break;default:this.failItem()}}startFileEngine(e,t,n){const s=document.createElement("video");s.autoplay=!0,s.setAttribute("playsinline",""),s.preload="auto",s.volume=this.volume,this.dom.mediaHost.append(s);const r={kind:e.kind,video:s,hls:null,degraded:!1,ready:!1,getTime:()=>Number.isFinite(s.currentTime)?s.currentTime:null,seek:a=>{try{s.currentTime=a}catch{}},play:()=>{s.paused&&this.playVideoElement(s)},pause:()=>{s.paused||s.pause()},setVolume:a=>{s.volume=a},destroy:()=>{if(r.hls){try{r.hls.destroy()}catch{}r.hls=null}try{s.pause()}catch{}try{s.removeAttribute("src"),s.load()}catch{}}};this.engine=r,s.addEventListener("playing",()=>{this.engine===r&&(this.hideGestureBadge(),this.setOverlayState("playing"))}),s.addEventListener("waiting",()=>{this.engine===r&&this.overlayState==="playing"&&this.setOverlayState("loading")}),s.addEventListener("ended",()=>this.reportEnded()),s.addEventListener("error",()=>{this.engine===r&&this.failItem()});const o=()=>{if(this.engine!==r||t!==this.loadToken)return;r.ready=!0;const a=this.targetPosition();a>.5&&e.kind!=="hls"&&r.seek(a),this.state?.now?.playing!==!1?this.playVideoElement(s):r.pause()};s.readyState>=1?o():s.addEventListener("loadedmetadata",o,{once:!0}),n?this.attachHls(s,e,r,t):s.src=e.kind==="torrent"?this.torrentStreamUrl(e):e.url}async attachHls(e,t,n,s){let r=null;try{const o=await Uh(()=>import("./hls-BOLXTnjL.js"),[]);r=o?.default??o}catch(o){console.warn("theater: hls.js unavailable, trying native HLS playback",o)}if(!(this.engine!==n||s!==this.loadToken))if(r&&typeof r.isSupported=="function"&&r.isSupported()){const o=new r;n.hls=o,o.on(r.Events.ERROR,(a,l)=>{if(!(!l?.fatal||this.engine!==n)){try{o.destroy()}catch{}n.hls===o&&(n.hls=null),this.failItem()}}),o.loadSource(t.url),o.attachMedia(e)}else e.src=t.url}async startYouTubeEngine(e,t){let n=null;try{n=await _y()}catch(l){console.warn("theater: YouTube API unavailable",l),t===this.loadToken&&this.failItem();return}if(t!==this.loadToken)return;const s=document.createElement("div");this.dom.mediaHost.append(s);const r={kind:"youtube",player:null,mount:s,degraded:!1,ready:!1,unstartedTimer:null};this.engine=r;const o=()=>{try{return r.player?.getPlayerState?.()}catch{return null}};let a;try{a=new n.Player(s,{width:"100%",height:"100%",videoId:e.videoId,playerVars:{autoplay:1,playsinline:1,controls:0,rel:0,disablekb:1},events:{onReady:()=>{if(this.engine!==r||t!==this.loadToken)return;r.ready=!0,r.player=a;try{a.setVolume(Math.round(this.volume*100))}catch{}const l=this.targetPosition();if(l>.5)try{a.seekTo(l,!0)}catch{}if(this.state?.now?.playing!==!1)try{a.playVideo()}catch{}r.unstartedTimer=setTimeout(()=>{if(r.unstartedTimer=null,this.engine!==r)return;const c=o();this.state?.now?.playing!==!1&&(c===-1||c===5)&&this.showGestureBadge()},cy)},onStateChange:l=>{if(this.engine!==r)return;const c=l?.data;c===1?(this.hideGestureBadge(),this.setOverlayState("playing")):c===0&&this.reportEnded()},onError:()=>{this.engine===r&&this.failItem()}}})}catch(l){console.warn("theater: YouTube player creation failed",l),t===this.loadToken&&this.failItem();return}r.player=a,r.getTime=()=>{try{const l=a.getCurrentTime?.();return Number.isFinite(l)?l:null}catch{return null}},r.seek=l=>{try{a.seekTo(l,!0)}catch{}},r.play=()=>{try{a.playVideo()}catch{}},r.pause=()=>{try{a.pauseVideo()}catch{}},r.setVolume=l=>{try{a.setVolume(Math.round(l*100))}catch{}},r.destroy=()=>{r.unstartedTimer&&(clearTimeout(r.unstartedTimer),r.unstartedTimer=null);try{a.destroy?.()}catch{}}}async startVimeoEngine(e,t){const n=document.createElement("iframe");n.src=ny("vimeo",e.videoId)||e.url,n.setAttribute("allow","autoplay; fullscreen; picture-in-picture"),n.setAttribute("allowfullscreen",""),this.dom.mediaHost.append(n);const s={kind:"vimeo",iframe:n,player:null,degraded:!0,ready:!0,time:null,getTime:()=>s.degraded?null:s.time,seek:r=>{try{s.player?.setCurrentTime?.(r)}catch{}},play:()=>{try{s.player?.play?.()}catch{}},pause:()=>{try{s.player?.pause?.()}catch{}},setVolume:r=>{try{s.player?.setVolume?.(r)}catch{}},destroy:()=>{try{s.player?.destroy?.()}catch{}}};this.engine=s,this.setOverlayState("loading");try{const r=await vy();if(this.engine!==s||t!==this.loadToken)return;const o=new r.Player(n);s.player=o,s.degraded=!1,o.on("playing",()=>{this.engine===s&&(this.hideGestureBadge(),this.setOverlayState("playing"))}),o.on("timeupdate",l=>{this.engine===s&&(s.time=Number.isFinite(l?.seconds)?l.seconds:s.time)}),o.on("ended",()=>this.reportEnded()),o.on("error",()=>{this.engine===s&&this.failItem()});const a=this.targetPosition();if(a>.5)try{await o.setCurrentTime(a)}catch{}try{await o.setVolume(this.volume)}catch{}try{await o.play()}catch{this.showGestureBadge()}}catch(r){console.warn("theater: Vimeo SDK unavailable, iframe runs unsynced",r),s.degraded=!0}}playVideoElement(e){try{const t=e.play();t&&typeof t.catch=="function"&&t.catch(n=>{this.engine?.video===e&&(console.warn("theater: autoplay blocked",n?.name||n),this.showGestureBadge())})}catch{this.showGestureBadge()}}setOverlayState(e){this.overlayState=e;const t=this.dom?.overlay;t&&(t.classList.remove("ts-state-idle","ts-state-loading","ts-state-playing","ts-state-error"),t.classList.add(`ts-state-${e}`),this.renderCaption())}renderCaption(){const e=this.dom?.caption;if(!e)return;const t=this.state?.now;let n="";if(this.overlayState==="idle")n="";else if(this.overlayState==="loading"){const s=t?.kind==="torrent"?this.torrentStatusText(t.infohash):"";n=s?`${s} — ${t.title}`:t?`Warming up the projector… ${t.title}`:"Warming up the projector…"}else this.overlayState==="error"?n=`Couldn't play: ${this.errorTitle||t?.title||"unknown item"}`:n=t?t.title:"";e.textContent=n}syncOverlay(){const e=this.dom?.overlay;e&&e.classList.toggle("ts-hidden",!(this.roomActive&&(this.quad||this.watching)))}showGestureBadge(){this.awaitingGesture=!0,this.dom?.playBadge&&(this.dom.playBadge.hidden=!1)}hideGestureBadge(){this.awaitingGesture=!1,this.dom?.playBadge&&(this.dom.playBadge.hidden=!0)}resumeFromGesture(){this.hideGestureBadge();const e=this.engine;e&&(e.video?this.playVideoElement(e.video):e.play?.())}reportEnded(){this.sendItemReport("ended")}failItem(){const e=this.state?.now;this.errorTitle=e?.title||"the current item",this.teardownEngine(),this.setOverlayState("error"),this.sendItemReport("failed")}sendItemReport(e){const t=this.state?.now?.id;!t||this.reportedForId===t||(this.reportedForId=t,this.sendControl({op:e,itemId:t}))}sendControl(e){typeof this.net?.sendTheaterControl=="function"?this.net.sendTheaterControl(e):this.net?.send?.(ge.THEATER_CONTROL,e)}sendQueue(e){typeof this.net?.sendTheaterQueue=="function"?this.net.sendTheaterQueue(e):this.net?.send?.(ge.THEATER_QUEUE,e)}sendChannel(e,t){typeof this.net?.sendTheaterChannel=="function"?this.net.sendTheaterChannel(e,t):this.net?.send?.(ge.THEATER_CHANNEL,{url:e,title:t})}buildOverlay(){const e=document.createElement("div");e.id="theater-screen",e.className="ts-hidden ts-state-idle",e.innerHTML=`
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
        <input type="text" id="theater-url-input" maxlength="${ao.URL_MAX}"
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
    `,document.body.append(e),e.addEventListener("cancel",n=>{n.preventDefault(),e.close()});let t=!1;e.addEventListener("mousedown",n=>{t=Rh(e,n)}),e.addEventListener("click",n=>{t&&Rh(e,n)&&e.close()}),this.dom.controlsDialog=e,this.dom.nowPanel=e.querySelector("#theater-now-panel"),this.dom.urlInput=e.querySelector("#theater-url-input"),this.dom.addStatus=e.querySelector("#theater-add-status"),this.dom.queueList=e.querySelector("#theater-queue-list"),this.dom.btnToggle=e.querySelector("#theater-btn-toggle"),this.dom.btnSkip=e.querySelector("#theater-btn-skip"),this.dom.btnBack=e.querySelector("#theater-btn-back"),this.dom.btnFwd=e.querySelector("#theater-btn-fwd"),this.dom.btnClear=e.querySelector("#theater-btn-clear"),this.dom.volumeInput=e.querySelector("#theater-volume"),this.dom.iptvSelect=e.querySelector("#theater-iptv-select"),this.dom.iptvCurrent=e.querySelector("#theater-iptv-current"),this.dom.iptvStatus=e.querySelector("#theater-iptv-status"),this.dom.iptvPush=e.querySelector("#theater-btn-push-list"),this.dom.iptvPaste=e.querySelector("#theater-iptv-paste"),this.dom.iptvFile=e.querySelector("#theater-iptv-file"),this.dom.iptvUrl=e.querySelector("#theater-iptv-url"),this.dom.epgFile=e.querySelector("#theater-epg-file"),this.dom.epgStatus=e.querySelector("#theater-epg-status"),e.querySelector("#close-theater-dialog").addEventListener("click",()=>e.close()),e.querySelector("#theater-btn-add").addEventListener("click",()=>this.onAddClicked(!1)),e.querySelector("#theater-btn-play-url").addEventListener("click",()=>this.onAddClicked(!0)),this.dom.urlInput.addEventListener("keydown",n=>{n.key==="Enter"&&(n.preventDefault(),this.onAddClicked(!1))}),this.dom.urlInput.addEventListener("input",()=>this.recognizeAddInput()),this.dom.btnToggle.addEventListener("click",()=>{const n=this.state?.now;n&&this.sendControl(n.playing?{op:"pause",itemId:n.id}:{op:"resume",itemId:n.id})}),this.dom.btnSkip.addEventListener("click",()=>this.sendQueue({op:"skip"})),this.dom.btnBack.addEventListener("click",()=>this.nudgeSeek(-30)),this.dom.btnFwd.addEventListener("click",()=>this.nudgeSeek(30)),this.dom.btnClear.addEventListener("click",()=>this.sendQueue({op:"clear"})),this.dom.volumeInput.addEventListener("input",()=>{const n=Number(this.dom.volumeInput.value);this.volume=Number.isFinite(n)?Math.min(1,Math.max(0,n/100)):1,this.engine?.setVolume?.(this.volume)}),this.dom.iptvSelect.addEventListener("change",()=>{this.activeListId=this.dom.iptvSelect.value||null,this.activeChannelIndex=-1,this.renderIptvSection()}),e.querySelector("#theater-btn-open-guide").addEventListener("click",()=>this.openGuide()),e.querySelector("#theater-btn-delete-list").addEventListener("click",()=>this.deleteActiveList()),this.dom.iptvPush.addEventListener("click",()=>this.pushActivePersonalList()),e.querySelector("#theater-btn-prev").addEventListener("click",()=>this.flipChannel(-1)),e.querySelector("#theater-btn-next").addEventListener("click",()=>this.flipChannel(1)),e.querySelector("#theater-btn-import-paste").addEventListener("click",()=>{this.uploadPlaylistText(this.dom.iptvPaste.value,null),this.dom.iptvPaste.value=""}),this.dom.iptvFile.addEventListener("change",()=>{const n=this.dom.iptvFile.files?.[0];this.dom.iptvFile.value="",this.importPlaylistFile(n)}),e.querySelector("#theater-btn-import-url").addEventListener("click",()=>this.importPlaylistUrl()),this.dom.epgFile.addEventListener("change",()=>{const n=this.dom.epgFile.files?.[0];this.dom.epgFile.value="",this.uploadEpgFile(n)})}buildGuideDialog(){const e=document.createElement("dialog");e.id="theater-guide-dialog",e.className="game-modal game-modal--wide",e.innerHTML=`
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
    `,document.body.append(e),e.addEventListener("cancel",n=>{n.preventDefault(),this.playlistChoice=null,e.close()}),e.querySelector("#theater-playlist-choice-import").addEventListener("click",()=>{const n=this.playlistChoice;this.playlistChoice=null,e.close(),n&&(this.dom.urlInput.value="",this.beginPlaylistResolve(n.classified.listId,n.playNow))}),e.querySelector("#theater-playlist-choice-video").addEventListener("click",()=>{const n=this.playlistChoice;this.playlistChoice=null,e.close(),n&&(this.dom.urlInput.value="",this.addSingleVideo(n.classified,n.playNow))}),this.dom.playlistChoiceDialog=e;const t=document.createElement("dialog");t.id="theater-playlist-dialog",t.className="game-modal",t.innerHTML=`
      <div class="micro modal-header-tag">THE ORPHEUM · PLAYLIST IMPORT</div>
      <h2 id="theater-playlist-name">A playlist</h2>
      <p class="modal-sub" id="theater-playlist-sub"></p>
      <div id="theater-playlist-videos" class="theater-playlist-videos"></div>
      <div class="modal-footer">
        <button type="button" id="theater-playlist-confirm" class="btn-secondary">Add to the queue</button>
        <button type="button" id="theater-playlist-cancel" class="btn-secondary">Never mind</button>
      </div>
    `,document.body.append(t),t.addEventListener("cancel",n=>{n.preventDefault(),this.playlistPreview=null,t.close()}),t.querySelector("#theater-playlist-cancel").addEventListener("click",()=>{this.playlistPreview=null,t.close()}),t.querySelector("#theater-playlist-confirm").addEventListener("click",()=>this.confirmPlaylistImport()),this.dom.playlistDialog=t}nudgeSeek(e){const t=this.state?.now;if(!t)return;const n=Math.max(0,Math.round((this.targetPosition()+e)*10)/10);this.sendControl({op:"seek",positionSec:n,itemId:t.id})}setAddStatus(e,t=!1){const n=this.dom?.addStatus;n&&(n.hidden=!e,n.textContent=e||"",n.classList.toggle("is-error",!!t))}setIptvStatus(e,t=!1){const n=this.dom?.iptvStatus;n&&(n.hidden=!e,n.textContent=e||"",n.classList.toggle("is-error",!!t))}setEpgStatus(e,t=!1){const n=this.dom?.epgStatus;n&&(n.hidden=!e,n.textContent=e||"",n.classList.toggle("is-error",!!t))}async uploadEpgFile(e){if(e){if(!this.net?.uploadEpg){this.setEpgStatus("Multiplayer is offline — the theater cannot store guides right now.",!0);return}this.setEpgStatus("Uploading the program guide…");try{const t=await this.net.uploadEpg(e,e.name.replace(/\.(epg|xml|xmltv|gz)$/i,"")),n=t.epg||{};this.setEpgStatus(`Guide active: ${n.name||"Program guide"} — ${n.channels||0} channels with listings${t.truncated?" (the file was larger than the guide shelf, so it was trimmed)":""}. Everyone in the auditorium now sees now/next in the guide.`)}catch(t){this.setEpgStatus(t.message||"Could not upload that guide.",!0)}}}recognizeAddInput(){const e=this.dom?.urlInput,t=bh((e?.value||"").trim());t?.kind==="youtubePlaylist"?this.setAddStatus("A YouTube playlist — Add reads it and queues its videos together."):t?.kind==="youtube"&&t.listId&&this.setAddStatus("A YouTube video that belongs to a playlist — Add will ask which one you want.")}beginPlaylistResolve(e,t){if(!this.net?.send){this.setAddStatus("Multiplayer is offline — playlists cannot be imported right now.",!0);return}if(this.playlistPending){this.setAddStatus(Th("resolve_in_flight"),!0);return}const n=`plreq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,s=setTimeout(()=>{this.playlistPending?.requestId===n&&(this.playlistPending=null,this.setAddStatus("That playlist took too long to read. Try again in a moment.",!0))},hy);this.playlistPending={requestId:n,playNow:t,timer:s},this.setAddStatus("Reading the playlist…"),typeof this.net.sendPlaylistResolve=="function"?this.net.sendPlaylistResolve(n,e):this.net.send(ge.THEATER_PLAYLIST_RESOLVE,{requestId:n,listId:e})}cancelPlaylistResolve(){this.playlistPending?.timer&&clearTimeout(this.playlistPending.timer),this.playlistPending=null}applyServerErrorMessage(e){const t=typeof e?.message=="string"?e.message:"";if(t){if(this.playlistPending){this.cancelPlaylistResolve(),this.roomActive&&this.setAddStatus(t,!0);return}this.torrentPending&&(this.cancelTorrentResolve(),this.roomActive&&this.setAddStatus(t,!0))}}applyPlaylistResolved(e){const t=this.playlistPending;if(!t||!e||String(e.requestId||"")!==t.requestId||(clearTimeout(t.timer),this.playlistPending=null,!this.roomActive))return;const n=(Array.isArray(e.videos)?e.videos:[]).filter(s=>s&&typeof s.videoId=="string"&&/^[\w-]{6,}$/.test(s.videoId));if(!n.length){this.setAddStatus("That playlist had no videos the projector could read.",!0);return}this.setAddStatus(""),this.openPlaylistPreview(String(e.title||"A YouTube playlist"),n,t.playNow)}importCapacity(){return this.state?Math.max(0,ao.QUEUE_MAX-(this.state.queue?.length||0))+(this.state.now?0:1):ao.QUEUE_MAX}openPlaylistPreview(e,t,n){const s=this.dom?.playlistDialog;if(!s)return;this.playlistPreview={title:e,videos:t,playNow:n},s.querySelector("#theater-playlist-name").textContent=e;const r=Math.min(this.importCapacity(),t.length);s.querySelector("#theater-playlist-sub").textContent=`${t.length} video${t.length===1?"":"s"} resolved — `+(r>=t.length?"they all fit on the reel right now.":`the reel can take ${r} more right now; the rest would be left off.`);const o=s.querySelector("#theater-playlist-videos");o.innerHTML="";for(const l of t.slice(0,Sa)){const c=document.createElement("div");c.className="theater-playlist-video",c.textContent=l.title||"Untitled video",o.append(c)}if(t.length>Sa){const l=document.createElement("div");l.className="theater-playlist-video theater-playlist-more",l.textContent=`… and ${t.length-Sa} more`,o.append(l)}const a=s.querySelector("#theater-playlist-confirm");a.textContent=r>0?`Add ${r} video${r===1?"":"s"} to the reel`:"The reel is full",a.disabled=r===0,s.open||s.showModal()}confirmPlaylistImport(){const e=this.playlistPreview;this.playlistPreview=null;const t=this.dom?.playlistDialog;if(t?.open&&t.close(),!e?.videos?.length)return;const n=e.videos.map(s=>({url:`https://www.youtube.com/watch?v=${encodeURIComponent(s.videoId)}`,title:s.title||""}));this.sendQueue({op:"addMany",items:n}),this.setAddStatus(`Pinning ${n.length} videos from "${e.title}" to the reel…`)}applyImportResult(e){const t=Math.max(0,Number(e?.queued)||0),n=Math.max(0,Number(e?.skipped)||0),s=Math.max(0,Number(e?.didNotFit)||0);if(!t&&!n&&!s)return;const r=[`Queued ${t} video${t===1?"":"s"}`];s&&r.push(`${s} didn't fit — the reel is full`),n&&r.push(`${n} skipped`),this.setAddStatus(`${r.join(" · ")}.`)}onAddClicked(e){const t=this.dom?.urlInput,n=(t?.value||"").trim(),s=bh(n);if(!s){this.setAddStatus(Th("invalid_url"),!0);return}if(s.kind==="torrent"){t.value="",this.beginTorrentResolve(s.url,e);return}if(s.kind==="youtubePlaylist"){t.value="",this.beginPlaylistResolve(s.listId,e);return}if(s.kind==="youtube"&&s.listId){this.openPlaylistChoice(s,e);return}this.addSingleVideo(s,e),t.value=""}openPlaylistChoice(e,t){const n=this.dom?.playlistChoiceDialog;n&&(this.playlistChoice={classified:e,playNow:t},n.open||n.showModal())}addSingleVideo(e,t){this.setAddStatus(""),t?this.sendChannel(e.url,Qv(e.kind)):this.sendQueue({op:"add",url:e.url})}torrentStreamUrl(e){return`${typeof this.net?.apiBase=="string"?this.net.apiBase.replace(/\/+$/,""):""}/api/theater/torrent/${e.infohash}/${e.fileIndex}`}beginTorrentResolve(e,t){if(!this.net?.send){this.setAddStatus("Multiplayer is offline — the torrent reel is unreachable.",!0);return}if(this.torrentPending){this.setAddStatus("Hold on — one torrent is still being looked up.",!0);return}const n=`treq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,s=setTimeout(()=>{this.torrentPending?.requestId===n&&(this.torrentPending=null,this.setAddStatus(Jv("resolve_timeout"),!0))},qv.RESOLVE_TIMEOUT_MS+5e3);this.torrentPending={requestId:n,magnet:e,playNow:t,timer:s},this.setAddStatus("Reaching the swarm for that torrent…"),typeof this.net.sendTorrentResolve=="function"?this.net.sendTorrentResolve(n,e):this.net.send(ge.TORRENT_RESOLVE,{requestId:n,magnet:e})}cancelTorrentResolve(){this.torrentPending?.timer&&clearTimeout(this.torrentPending.timer),this.torrentPending=null}applyTorrentFiles(e){const t=this.torrentPending;if(!t||!e||String(e.requestId||"")!==t.requestId||(clearTimeout(t.timer),this.torrentPending=null,!this.roomActive))return;const n=Array.isArray(e.files)?e.files:[];if(!n.length){this.setAddStatus("That torrent has no video files the projector can play.",!0);return}this.setAddStatus(""),this.openTorrentPicker(String(e.name||"Unnamed torrent"),n,t.magnet,t.playNow)}openTorrentPicker(e,t,n,s){const r=this.dom?.torrentDialog;if(!r)return;this.torrentPick={magnet:n,name:e,playNow:s},r.querySelector("#theater-torrent-name").textContent=e;const o=r.querySelector("#theater-torrent-files");o.innerHTML="";for(const a of t){const l=document.createElement("button");l.type="button",l.className="theater-torrent-file";const c=document.createElement("span");c.className="theater-torrent-file-path",c.textContent=a.path;const h=document.createElement("span");if(h.className="theater-torrent-file-meta",h.textContent=this.formatBytes(a.bytes),!a.playable){const f=document.createElement("span");f.className="theater-kind-tag",f.textContent="may not play",h.append(" · ",f)}l.append(c,h),l.addEventListener("click",()=>{r.close(),this.sendTorrentPick(a)}),o.append(l)}r.open||r.showModal()}sendTorrentPick(e){const t=this.torrentPick;if(this.torrentPick=null,!t)return;const n={url:t.magnet,title:Kv(t.name,e.path),torrentName:t.name,fileIndex:e.index,filePath:e.path,fileBytes:e.bytes};t.playNow?(this.net?.send?.(ge.THEATER_CHANNEL,n),this.setAddStatus(`Starting “${n.title}” on the screen…`)):(this.sendQueue({op:"add",...n}),this.setAddStatus(`“${n.title}” is on the reel — it starts for everyone.`))}torrentStatusText(e){const t=this.torrentStatuses.get(e);return!t||t.ready&&t.progress>=1?"":t.ready?`Downloading… ${Math.round(t.progress*100)}% · ${t.peers} peer${t.peers===1?"":"s"}`:t.peers>0||t.progress>0?`Fetching reels… ${Math.round(t.progress*100)}% · ${t.peers} peer${t.peers===1?"":"s"}`:"Reaching the swarm…"}applyTorrentStatus(e){const t=Array.isArray(e?.items)?e.items:[];if(t.length){const s=new Map;for(const r of t){const o=Zv(r);o&&s.set(o.infohash,o)}this.torrentStatuses=s}this.state?.now?.kind==="torrent"&&this.overlayState==="loading"&&this.renderCaption(),this.dom?.controlsDialog?.open&&this.renderControls()}formatBytes(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"unknown size";const n=["B","KB","MB","GB","TB"];let s=t,r=0;for(;s>=1e3&&r<n.length-1;)s/=1e3,r+=1;return`${s>=100||r===0?Math.round(s):s.toFixed(1)} ${n[r]}`}renderControls(){if(!this.dom?.controlsDialog)return;const e=this.state?.now,t=this.state?.queue||[],n=this.dom.nowPanel;if(n.innerHTML="",e){const a=document.createElement("div");a.className="theater-now-head";const l=document.createElement("strong");l.className="theater-now-title",l.textContent=e.title||"Untitled";const c=document.createElement("span");c.className="theater-kind-tag",c.textContent=Eh[e.kind]||e.kind||"media";const h=document.createElement("span");h.className=`theater-badge ${e.playing?"is-playing":"is-paused"}`,h.textContent=e.playing?"▶ PLAYING":"❚❚ PAUSED",a.append(l,c,h);const f=document.createElement("div");if(f.className="micro theater-now-by",f.textContent=`queued/changed by ${e.queuedBy||e.by||"Someone"}`,n.append(a,f),e.kind==="torrent"){const d=this.torrentStatusText(e.infohash);if(d){const u=document.createElement("div");u.className="micro theater-torrent-status",u.textContent=d,n.append(u)}}}else{const a=document.createElement("div");a.className="theater-empty",a.textContent="Nothing on the screen. Queue something below — it starts for everyone.",n.append(a)}const s=this.dom.queueList;if(s.innerHTML="",!t.length){const a=document.createElement("div");a.className="theater-empty",a.textContent="The queue is empty.",s.append(a)}for(const a of t){const l=document.createElement("div");l.className="theater-queue-row";const c=document.createElement("span");c.className="theater-queue-title",c.textContent=a.title||"Untitled";const h=document.createElement("span");h.className="theater-kind-tag",h.textContent=Eh[a.kind]||a.kind||"media";const f=document.createElement("span");f.className="theater-queued-by",f.textContent=`· ${a.queuedBy||"Someone"}`;const d=document.createElement("button");d.type="button",d.textContent="Play now",d.addEventListener("click",()=>this.sendQueue({op:"playNow",itemId:a.id}));const u=document.createElement("button");u.type="button",u.textContent="Remove",u.addEventListener("click",()=>this.sendQueue({op:"remove",itemId:a.id})),l.append(c,h,f,d,u),s.append(l)}const r=!!e;this.dom.btnToggle.textContent=e?.playing?"Pause":"Resume",this.dom.btnToggle.disabled=!r,this.dom.btnSkip.disabled=!r;const o=r&&e.kind!=="hls";this.dom.btnBack.disabled=!o,this.dom.btnFwd.disabled=!o,this.dom.btnClear.disabled=!r&&!t.length,this.dom.volumeInput.value=String(Math.round(this.volume*100)),this.renderIptvSection()}getActiveListMeta(){const e=(this.sharedCatalog?.lists||[]).find(n=>n.id===this.activeListId);if(e)return{...e,shared:!0};const t=this.savedLists.find(n=>n.id===this.activeListId);return t?{...t,shared:!1}:null}getActiveList(){const e=this.getActiveListMeta();return e?e.shared?{id:e.id,name:e.name,addedBy:e.addedBy,shared:!0,channelCount:e.channelCount,channels:this.sharedChannels.get(e.id)||null}:e:null}loadSavedLists(){try{const e=JSON.parse(localStorage.getItem(wh)||"[]");return Ch(e,Date.now())}catch{return[]}}saveSavedLists(){try{localStorage.setItem(wh,JSON.stringify(Ch(this.savedLists,Date.now())))}catch{}}applyIptvState(e){const t=(Array.isArray(e?.lists)?e.lists:[]).filter(s=>s&&typeof s.id=="string").map(s=>({id:s.id,name:typeof s.name=="string"&&s.name?s.name:"Untitled list",addedBy:typeof s.addedBy=="string"&&s.addedBy?s.addedBy:"Someone",channelCount:Number(s.channelCount)||0})),n=e?.epg&&typeof e.epg=="object"?e.epg:null;this.sharedCatalog={lists:t,epg:n?{name:typeof n.name=="string"&&n.name?n.name:"Program guide",updatedAt:Number(n.updatedAt)||0,channelCount:Number(n.channels)||0,programmes:Number(n.programmes)||0}:null};for(const s of[...this.sharedChannels.keys()])t.some(r=>r.id===s)||this.sharedChannels.delete(s);this.activeListId&&!this.getActiveListMeta()&&(this.activeListId=t[0]?.id||this.savedLists[0]?.id||null,this.activeChannelIndex=-1),this.dom?.iptvSelect&&this.renderIptvSection(),this.dom?.guideDialog?.open&&this.renderGuide(),this.dom?.controlsDialog?.open&&this.renderControls()}applySharedList(e){const t=String(e?.listId||""),n=sy(e?.channels,On.CHANNELS_MAX);if(!(!t||!n.length)){if(this.sharedChannels.set(t,n),this.pendingFlip&&t===this.activeListId){const s=this.pendingFlip;this.pendingFlip=0,this.flipChannel(s);return}this.dom?.guideDialog?.open&&this.guideListId===t&&this.renderGuide(),this.dom?.controlsDialog?.open&&this.renderIptvSection()}}requestSharedChannels(e){!e||this.sharedChannels.has(e)||(typeof this.net?.sendIptvListGet=="function"?this.net.sendIptvListGet(e):this.net?.send?.(ge.IPTV_LIST_GET,{listId:e}))}async uploadPlaylistText(e,t){if(!e||!e.trim()){this.setIptvStatus("Nothing to add — paste playlist text or choose a file first.",!0);return}if(!this.net?.uploadPlaylistText){this.setIptvStatus("Multiplayer is offline — the theater cannot store lists right now.",!0);return}if(e.length>On.LIST_TEXT_MAX){this.setIptvStatus(ry("text_too_large"),!0);return}this.setIptvStatus("Adding to the theater library…");try{const n=await this.net.uploadPlaylistText(e,t,this.net.nickname);this.setIptvStatus(`"${n.list.name}" added to the theater library — ${n.list.channelCount} channels for everyone in the auditorium.`)}catch(n){this.setIptvStatus(n.message||"The theater could not accept that playlist.",!0)}}async importPlaylistFile(e){if(e)try{const t=new FileReader;t.onload=()=>{const n=e.name.replace(/\.(m3u8?|txt)$/i,"");this.uploadPlaylistText(String(t.result||""),n)},t.onerror=()=>this.setIptvStatus("Could not read that file.",!0),t.readAsText(e)}catch{this.setIptvStatus("Could not read that file.",!0)}}async importPlaylistUrl(){const e=(this.dom?.iptvUrl?.value||"").trim();if(!/^https?:\/\//i.test(e)){this.setIptvStatus("Enter an http(s) URL pointing at an .m3u / .m3u8 playlist.",!0);return}if(!this.net?.importPlaylistFromUrl){this.setIptvStatus("Multiplayer is offline — the theater cannot fetch lists right now.",!0);return}this.setIptvStatus("Fetching the playlist for the whole auditorium…");try{const t=await this.net.importPlaylistFromUrl(e,null,this.net.nickname);this.setIptvStatus(`"${t.list.name}" added to the theater library — ${t.list.channelCount} channels for everyone in the auditorium.`)}catch(t){this.setIptvStatus(t.message||"Could not fetch that playlist.",!0)}}async pushActivePersonalList(){const e=this.getActiveListMeta();if(!e||e.shared){this.setIptvStatus("Select one of your own lists to add it to the theater library.",!0);return}const t=oy(e.channels);await this.uploadPlaylistText(t,e.name)}deleteActiveList(){const e=this.getActiveListMeta();if(!e){this.setIptvStatus("Select a list to remove.",!0);return}if(e.shared){typeof this.net?.sendIptvListRemove=="function"?this.net.sendIptvListRemove(e.id):this.net?.send?.(ge.IPTV_LIST_REMOVE,{listId:e.id}),this.setIptvStatus(`Removing "${e.name}" from the theater library…`);return}this.savedLists=this.savedLists.filter(t=>t.id!==e.id),this.saveSavedLists(),this.activeListId===e.id&&(this.activeListId=this.getActiveListMeta()?this.activeListId:this.sharedCatalog?.lists?.[0]?.id||this.savedLists[0]?.id||null,this.activeChannelIndex=-1),this.renderIptvSection(),this.setIptvStatus(`Deleted "${e.name}" from your saved lists.`)}renderIptvSection(){if(!this.dom?.iptvSelect)return;const e=this.dom.iptvSelect,t=this.sharedCatalog?.lists||[],n=this.savedLists;if(e.innerHTML="",!t.length&&!n.length){const o=document.createElement("option");o.value="",o.textContent="No channel lists yet — add one below",e.append(o),e.disabled=!0,this.activeListId=null}else{if(e.disabled=!1,t.length){const a=document.createElement("optgroup");a.label="Theater library — everyone can browse";for(const l of t){const c=document.createElement("option");c.value=l.id,c.textContent=`${l.name} (${l.channelCount})`,a.append(c)}e.append(a)}if(n.length){const a=document.createElement("optgroup");a.label="Your lists — private until added";for(const l of n){const c=document.createElement("option");c.value=l.id,c.textContent=`${l.name} (${l.channels.length})`,a.append(c)}e.append(a)}this.getActiveListMeta()||(this.activeListId=t[0]?.id||n[0].id,this.activeChannelIndex=-1),e.value=this.activeListId;const o=this.getActiveListMeta();o?.shared&&this.requestSharedChannels(o.id)}const s=this.getActiveList(),r=s?.channels?.[this.activeChannelIndex];this.dom.iptvCurrent.textContent=r?`Tuned: ${r.name}`:this.state?.now?`On screen: ${this.state.now.title}`:"No channel tuned",this.dom.iptvPush&&(this.dom.iptvPush.hidden=!(s&&!s.shared))}rememberChannelFor(e){if(!e)return;const t=this.getActiveList();if(!t?.channels)return;const n=t.channels.findIndex(s=>s.url===e);n!==-1&&(this.activeChannelIndex=n)}flipChannel(e){const t=this.getActiveList();if(!t||!t.channels||!t.channels.length){if(t?.shared){this.pendingFlip=e,this.requestSharedChannels(t.id),this.setIptvStatus("Fetching the theater channel list…");return}this.setIptvStatus("No channel list available — add a playlist to the theater library (paste text, file, or URL) to start flipping.",!0),this.openControls();return}const n=t.channels.length;let s=this.activeChannelIndex;s<0||s>=n?s=e>0?0:n-1:s=(s+e+n)%n,this.tuneChannel(t,s)}tuneChannel(e,t){const n=e?.channels?.[t];n&&(this.activeListId=e.id,this.activeChannelIndex=t,this.sendChannel(n.url,n.name),this.renderIptvSection(),this.dom?.guideDialog?.open&&this.renderGuide())}channelKey(e){return(e?.tvgId||e?.name||"").trim()}formatGuideTime(e){if(!Number.isFinite(e))return"";try{return new Date(e).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}catch{return""}}scheduleTextFor(e){const t=this.epgSchedule.get(this.channelKey(e));if(!t)return null;const n=[];return t.now&&n.push(`Now ${this.formatGuideTime(t.now.start)}–${this.formatGuideTime(t.now.stop)} · ${t.now.title}`),t.next&&n.push(`Next ${this.formatGuideTime(t.next.start)} · ${t.next.title}`),n.join("   ·   ")||null}requestEpgSchedule(){if(!this.dom?.guideDialog?.open||!this.sharedCatalog?.epg)return;const e=this.getActiveList();if(!e?.channels)return;const t=[],n=new Set;for(const s of e.channels){if(!Ah(s,this.guideCountry,this.guideCategory))continue;const r=this.channelKey(s);if(!(!r||n.has(r))&&(n.add(r),t.push(r),t.length>=On.EPG_LOOKUP_MAX))break}t.length&&(typeof this.net?.sendEpgLookup=="function"?this.net.sendEpgLookup(t):this.net?.send?.(ge.EPG_LOOKUP,{keys:t}))}startEpgRefresh(){this.stopEpgRefresh(),this.epgTimer=setInterval(()=>{if(!this.dom?.guideDialog?.open){this.stopEpgRefresh();return}this.requestEpgSchedule()},fy)}stopEpgRefresh(){this.epgTimer&&(clearInterval(this.epgTimer),this.epgTimer=null)}applyEpgSchedule(e){const t=Array.isArray(e?.entries)?e.entries:[];for(const n of t)typeof n?.key=="string"&&this.epgSchedule.set(n.key,{now:n.now||null,next:n.next||null});!this.dom?.guideDialog?.open||!t.length||this.dom.guideList.querySelectorAll("[data-epg-key]").forEach(n=>{const s=this.channelByKey?.get(n.dataset.epgKey),r=s?this.scheduleTextFor(s):null;r!==null&&(n.textContent=r)})}renderGuide(){if(!this.dom?.guideDialog)return;const e=this.getActiveListMeta(),t=this.getActiveList();this.guideListId!==(e?.id||null)&&(this.guideListId=e?.id||null,this.guideCountry="All",this.guideCategory="All"),this.dom.guideTitle.textContent=e?`${e.name}${e.shared?" · theater library":" · your list"}`:"Channel Guide";const n=this.sharedCatalog?.epg;this.dom.guideEpg.textContent=n?`Program guide: ${n.name} — ${n.channelCount} channels with listings${e?.shared?"":" (matching may be limited on private lists)"}`:"No program guide uploaded — rows show channels only.",e?.shared&&!t?.channels&&this.requestSharedChannels(e.id);const s=t?.channels||[],r=gy(s),o=r.countries.length>0;if(this.dom.guideCountryRow.hidden=!o,this.dom.guideGroups.hidden=!0,t?.channels&&o){r.countries.includes(this.guideCountry)||(this.guideCountry="All");const h=this.dom.guideCountrySelect;h.innerHTML="";for(const u of["All countries",...r.countries]){const g=document.createElement("option");g.value=u==="All countries"?"All":u,g.textContent=u,h.append(g)}h.value=this.guideCountry;const f=r.categoriesFor(this.guideCountry);f.includes(this.guideCategory)||(this.guideCategory="All");const d=this.dom.guideGroups;if(d.innerHTML="",f.length){d.hidden=!1;for(const u of["All categories",...f]){const g=u==="All categories"?"All":u,_=document.createElement("button");_.type="button",_.className=`theater-chip ${g===this.guideCategory?"active":""}`,_.textContent=u,_.addEventListener("click",()=>{this.guideCategory=g,this.renderGuide(),this.requestEpgSchedule()}),d.append(_)}}this.guideCountry!=="All"||this.guideCategory}const a=this.dom.guideList;if(a.innerHTML="",this.channelByKey=new Map,!e){this.dom.guideCount.textContent="No list loaded";const h=document.createElement("div");h.className="theater-empty",h.textContent="The theater has no channel lists yet — open the Screen controls and add a playlist (paste text, upload a file, or fetch a URL). Everyone here will be able to browse it.",a.append(h);return}if(!t?.channels){this.dom.guideCount.textContent="Fetching the theater channel list…";const h=document.createElement("div");h.className="theater-empty",h.textContent="Fetching the theater channel list…",a.append(h);return}let l=0;if(t.channels.forEach((h,f)=>{if(!Ah(h,this.guideCountry,this.guideCategory))return;l+=1;const d=this.channelKey(h);this.channelByKey.set(d,h);const u=document.createElement("div");if(u.className=`theater-channel-row ${f===this.activeChannelIndex?"current":""}`,h.logo&&/^https?:\/\//i.test(h.logo)){const _=document.createElement("img");_.src=h.logo,_.alt="",_.loading="lazy",_.addEventListener("error",()=>{_.hidden=!0}),u.append(_)}const g=document.createElement("span");if(g.className="theater-channel-name",g.textContent=h.name||"Channel",u.append(g),h.group){const _=document.createElement("span");_.className="theater-group-tag",_.textContent=h.group,u.append(_)}if(this.sharedCatalog?.epg){const _=document.createElement("span");_.className="theater-channel-epg",_.dataset.epgKey=d,_.textContent=this.scheduleTextFor(h)||"",u.append(_)}u.addEventListener("click",()=>{this.tuneChannel(t,f),this.dom.guideDialog.close()}),a.append(u)}),!l){const h=document.createElement("div");h.className="theater-empty",h.textContent="No channels match this country and category.",a.append(h)}const c=e.shared?"theater library":"your lists";this.dom.guideCount.textContent=`${t.channels.length} channels · showing ${l}${this.state?.now?` · on screen: ${this.state.now.title}`:""} · ${c}`,this.requestEpgSchedule()}}const Qn=3,xy=4,My=6,Sy=-.9,Ey=.7,by=[Math.PI/4,0,-Math.PI/4];function Ty(i){return(i+1)%xy}function wy(i){return Math.min(Ey,Math.max(Sy,i))}function Ay(i,e,t,n){if(i===Qn){const r=Math.sin(e),o=Math.cos(e),a=-r,l=-o,c=o,h=-r;return{x:c*t+a*-n,z:h*t+l*-n}}const s=by[i]??0;return{x:t*Math.cos(s)+n*Math.sin(s),z:-t*Math.sin(s)+n*Math.cos(s)}}function Cy(i,e,t,n,s){return s||Math.hypot(t-i,n-e)>My}const pe=i=>document.getElementById(i),Ct=new Mf;Ct.background=new Oe("#222d2a");Ct.fog=new Ol("#54645d",.018);const Ht=new S_({canvas:pe("world"),antialias:!0});Ht.setPixelRatio(Math.min(devicePixelRatio,1.5));Ht.setSize(innerWidth,innerHeight);Ht.shadowMap.enabled=!0;Ht.shadowMap.type=Fh;Ht.toneMapping=kh;Ht.toneMappingExposure=1.15;const mn=new To,Ry=1.55,Py=1.05,Ly=.005,Iy=.004,sr=new sn(58,1,.1,150);let rr=mn,Fn=0,or=0,yo=0,ps=24;const Ao=new C_(Ht),Yl=new R_(Ct,mn);Ao.addPass(Yl);const Dy=new Ts(new Ae(innerWidth,innerHeight),.25,.65,1.05);Ao.addPass(Dy);Ct.add(new Df("#c5d9d4","#343a2b",2.2));const Hn=new Of("#ffe0a5",3);Hn.position.set(-14,24,7);Hn.castShadow=!0;Hn.shadow.mapSize.set(2048,2048);Object.assign(Hn.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:80});Hn.shadow.normalBias=.035;Hn.shadow.bias=-1e-4;Ct.add(Hn);const Cn=new re(new dr(.25,.29,32),new Cs({color:"#e0d49b",transparent:!0,opacity:.8,side:rn}));Cn.rotation.x=-Math.PI/2;Cn.visible=!1;Ct.add(Cn);const wd=120,Ad=new Ot,co=new Float32Array(wd*3);for(let i=0;i<wd;i++)co[i*3]=(Math.random()-.5)*26,co[i*3+1]=Math.random()*6+.3,co[i*3+2]=(Math.random()-.5)*24;Ad.setAttribute("position",new an(co,3));const jl=new Rf(Ad,new od({color:"#e3d7a7",size:.035,transparent:!0,opacity:.5}));Ct.add(jl);const We=new K_,Vi=new iv(Ct);Uh(async()=>{const{wireRealtime:i}=await import("./wire-BeZWHRIE.js");return{wireRealtime:i}},[]).then(({wireRealtime:i})=>{i({net:We,remotePlayers:Vi})}).catch(()=>{});let mi="hands",ys=0;const ar=xl.map(i=>i.id),xt=new Hv(We,{onSelectTool:(i,e)=>{Zl(i),e&&(ys=ar.indexOf(e),pe("active-seed-label").textContent=vn[e]?.name||e)}}),Cd=new Wv(We,{onFocusChange:i=>{i&&(Ut.clear(),vi())}}),St=new yy(We);St.onStandUpRequest=()=>ki();const Ve=vd(We.guestId,We.nickname);Ve.position.set(0,0,3);Ct.add(Ve);const wt=sv();wt.position.set(.8,0,4);Ct.add(wt);const Ml="afterlight-save";function Uy(){try{const i=localStorage.getItem(Ml),e=i?JSON.parse(i):{};return Mh(e.exploration)}catch{return Mh({})}}function Rd(i){try{const e=localStorage.getItem(Ml),t=e?JSON.parse(e):{};t.exploration=i,localStorage.setItem(Ml,JSON.stringify(t))}catch{}}let wn=Uy();const lr=ov(),cr=fv();Ct.add(lr.group);Ct.add(cr.group);const Ys=new Map,Kr={market:"M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24",garden:"M24 24H130V96H24Z M38 36H116V84H38Z M65 24V96",court:"M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24",canal:"M24 24H130V96H24Z M24 60H130 M70 24V96 M84 24V96",station:"M24 24H130V96H24Z M24 40H130 M24 75H130 M65 40V75",aqueduct:"M24 24H130V96H24Z M24 35H130 M45 24V96 M80 24V96 M105 24V96",caldera:"M24 24H130V96H24Z M50 35H100V80H50Z M75 35V80 M24 60H50 M100 60H130",understory:"M24 24H130V96H24Z M35 40H65V75H35Z M90 40H120V75H90Z M65 60H90",saltworks:"M24 24H130V96H24Z M35 30H115V55H35Z M35 65H115V90H35Z M75 24V96",rooftops:"M24 24H130V96H24Z M40 45H110 M75 24V96 M40 30L75 60L110 30 M40 90L75 60L110 90",mangrove:"M24 24H130V96H24Z M24 50Q75 20 130 50 M24 70Q75 100 130 70 M75 35V85",trestle:"M24 24H130V96H24Z M24 35H130 M24 85H130 M35 35L55 85 M55 35L75 85 M75 35L95 85 M95 35L115 85",foundry:"M24 24H130V96H24Z M40 35H70V65H40Z M85 35H115V65H85Z M24 75H130","frost-spire":"M24 24H130V96H24Z M75 25L115 60L75 95L35 60Z M75 25V95 M35 60H115",delta:"M24 24H130V96H24Z M24 45C55 40 85 75 130 55 M24 75C60 70 90 90 130 85 M70 24V96",archives:"M24 24H130V96H24Z M35 35H115 M35 50H115 M35 65H115 M35 80H115 M75 24V96","kiln-terrace":"M24 24H130V96H24Z M45 35H105V85H45Z M75 45A15 15 0 1 0 75 75A15 15 0 1 0 75 45 M24 60H45 M105 60H130",theater:"M24 24H130V96H24Z M42 34H112 M42 38H112 M34 52H62 M70 52H120 M34 68H62 M70 68H120 M34 84H120"};function Ny(i){if(Ys.has(i))return Ys.get(i);const e=Xt.find(d=>d.id===i);if(!e)return null;const t=wn.completed.includes(i),n=Uv(e,t),s=Xt.findIndex(d=>d.id===i),r=Xt[(s-1+Xt.length)%Xt.length],o=Xt[(s+1)%Xt.length];n.items.push({type:"district_gate",x:-10.7,z:0,targetDistrict:r.id,title:`Gate to ${r.name}`,sub:`Westbound: ${r.district}`}),n.items.push({type:"district_gate",x:10.7,z:0,targetDistrict:o.id,title:`Gate to ${o.name}`,sub:`Eastbound: ${o.district}`}),n.items.push({type:"market_gate",x:0,z:8.8,targetDistrict:"market",title:"Return to Market Court",sub:"Trade produce & visit your garden"});const a=new Kt(1,1,1),l=new Je({color:"#c5b478",emissive:"#857545",emissiveIntensity:.6}),c=new Je({color:"#2b3d3e",roughness:.6});for(const d of[-10.7,10.7]){const u=new re(a,c);u.position.set(d,2.5,0),u.scale.set(.6,5,2.4),n.group.add(u);const g=new re(a,l);g.position.set(d,1.8,0),g.scale.set(.1,3.4,1.8),n.group.add(g)}const h=new re(a,c);h.position.set(0,2.5,8.8),h.scale.set(2.4,5,.6),n.group.add(h);const f=new re(a,l);return f.position.set(0,1.8,8.8),f.scale.set(1.8,3.4,.1),n.group.add(f),Ct.add(n.group),Ys.set(i,n),Sl.has(i)&&n.setNodeStates?.(Sl.get(i)),n}let st=null,gn=null,vt=null,Co=null,ln=!1,Jn=0,Ph=null;const Ut=new Set,Oy=2.8,Lh=5,Ri=Q_();let js=!1;function vi(){Co?.close(),fr(Ve),_d(Ri),js=!1}const Ih=new kf,Fy=new fi(new U(0,1,0),0),Ea=new U;function Nt(i,e,t="FIELD NOTE"){const n=pe("toast-title"),s=pe("toast-body"),r=pe("toast-type"),o=pe("toast");n&&(n.textContent=i),s&&(s.textContent=e),r&&(r.textContent=t),o&&(o.style.opacity="1"),clearTimeout(Ph),Ph=setTimeout(()=>{o&&(o.style.opacity="0")},5e3)}let At=qt.MARKET,nn=lr,si=oo("market"),xo=null;const Sl=new Map;let Di={mill:{status:"broken",required:{...Md},contributed:{copper:0,timber:0,glass:0},restoredAt:null}};function Oi(i){ki(),At=i;const e=qt.isGarden(i),t=i===qt.MARKET,n=Xt.find(s=>s.id===i);if(lr.group.visible=t,cr.group.visible=e,Ys.forEach((s,r)=>{s.group.visible=r===i}),n){nn=Ny(i),si=oo(i),wn.visited.includes(i)||wn.visited.push(i),wn.current=i,Rd(wn),Ct.fog.color.set(n.color),Ct.background.set(n.color).multiplyScalar(.45),Hn.color.set(n.sun);const r=n.spawn||[-9,0];Ve.position.set(r[0],0,r[1]),wt.position.set(r[0]+.8,0,r[1]+1),pe("location-title").textContent=n.name,pe("district-tag").textContent=n.district,pe("map-label").textContent="• "+n.subtitle,pe("map-path").setAttribute("d",Kr[i]||Kr.court),Nt(n.name,n.description,"ARRIVED IN DISTRICT")}else e?(nn=cr,si=oo(i),Ve.position.set(-9.5,0,0),wt.position.set(-8.7,0,1),Ct.fog.color.set("#54645d"),Ct.background.set("#222d2a"),Hn.color.set("#ffe0a5"),pe("location-title").textContent="Your Market Garden",pe("district-tag").textContent="CULTIVATION DISTRICT / 02",pe("map-label").textContent="• MARKET GARDEN 02",pe("map-path").setAttribute("d",Kr.garden),Nt("Your Garden Plot","Tend your garden beds and harvest fresh crops.")):(nn=lr,si=oo("market"),Ve.position.set(0,0,3),wt.position.set(.8,0,4),Ct.fog.color.set("#54645d"),Ct.background.set("#222d2a"),Hn.color.set("#ffe0a5"),pe("location-title").textContent="The Market Court",pe("district-tag").textContent="MARKET SOCIAL DISTRICT / 01",pe("map-label").textContent="• MARKET COURT 01",pe("map-path").setAttribute("d",Kr.market),Nt("The Market Court","Trade produce, buy seeds, and fulfill contracts."));gn=null,Cn.visible=!1,vi(),Vi.clear(),St.setWatchMode(!1),We.joinRoom(i),St.setRoomActive(i===qt.THEATER),i===qt.THEATER&&St.setWatchMode(!0)}const ba=new URLSearchParams(window.location.search).get("room");let El=qt.THEATER;ba==="garden"?El=qt.gardenFor(We.guestId):ba&&(El=ba);Oi(El);We.on(ge.WELCOME,i=>{pe("net-indicator").textContent="● ONLINE",pe("net-indicator").style.color="#85e0a3",i.player&&(xt.updatePlayerHUD(i.player),Ve.userData.updateNickname(i.player.nickname)),i.weather&&Id(i.weather),i.prices&&xt.updateMarketView(i.prices),i.orderBook&&xt.updateMarketView(null,i.orderBook),i.contracts&&xt.updateContractsView(i.contracts),i.theater&&St.applyState(i.theater,i.serverNow||Date.now())});We.on(ge.PRESENCE_JOIN,i=>{i.player&&i.player.id!==We.guestId&&(Vi.setPlayer(i.player),Nt("Gardener Arrived",`${i.player.nickname} entered the area.`))});We.on(ge.PRESENCE_LEAVE,i=>{i.playerId&&Vi.removePlayer(i.playerId)});We.on(ge.PRESENCE_UPDATE,i=>{if(Array.isArray(i.players))for(const e of i.players)e.id!==We.guestId&&Vi.setPlayer(e)});We.on(ge.GARDEN_STATE,i=>{xo=i.beds,cr.setFixtures?.(i.fixtures||[]),cr.update(0,i.beds)});We.on(ge.INVENTORY_STATE,i=>{i.player&&(xt.updatePlayerHUD(i.player),xt.updateInventoryView(i.player),xt.updateMarketView(),xt.updateMachineShopView())});We.on(ge.MARKET_UPDATE,i=>{i.prices&&xt.updateMarketView(i.prices),i.orderBook&&xt.updateMarketView(null,i.orderBook)});We.on(ge.CONTRACT_UPDATE,i=>{i.contracts&&xt.updateContractsView(i.contracts)});We.on(ge.NODE_STATE,i=>{!i.roomId||!Array.isArray(i.nodes)||(Sl.set(i.roomId,i.nodes),Ys.get(i.roomId)?.setNodeStates?.(i.nodes))});We.on(ge.THEATER_STATE,i=>{i.theater&&St.applyState(i.theater,i.serverNow||Date.now())});We.on(ge.MACHINE_UPDATE,i=>{if(!i.machines?.mill)return;const e=Di?.mill?.status;Di=i.machines,xt.updateMachineShopView(Di),lr.setMachineState?.(Di),Ld(),e==="broken"&&Di.mill.status==="restored"&&(Kl([523,659,784,1046]),Nt("The Great Mill Restored","The sails turn above the court. Wheat becomes flour for everyone.","RESTORATION COMPLETE"))});We.on(ge.TRADE_FILLED,i=>{const e=i.trade;Kl([523,659,784]),Nt("Order Filled!",`Traded ${e.quantity}x ${e.cropId} @ ${e.price} ⛁`)});We.on(ge.WEATHER_UPDATE,i=>{Id(i.weather)});We.on(ge.ACTION_RESULT,i=>{i.success?(Kl([440,554]),Nt(i.title||"Garden",i.message)):i.message&&Nt(i.title||"Notice",i.message)});let Pd=null;function Ld(){const i=pe("mill-panel");if(!i)return;const e=At===qt.MARKET;if(i.style.display=e?"block":"none",Pd=At,!e)return;const t=Di?.mill,n=pe("mill-status-tag"),s=pe("mill-progress-lines");if(!t)return;if(t.status==="restored"){n.textContent="RESTORED",n.className="mill-tag restored",s.innerHTML='<div class="mill-line">✦ The sails are turning. It grinds wheat into flour for everyone.</div>';return}n.textContent="BROKEN",n.className="mill-tag broken";let r=0,o=0,a="";for(const[l,c]of Object.entries(t.required||{})){const h=Math.min(t.contributed?.[l]||0,c);r+=h,o+=c,a+=`<div class="mill-line"><span>${l}</span><b>${h}/${c}</b></div>`}a=`<div class="mill-line mill-total"><span>restoration</span><b>${r}/${o}</b></div>`+a,s.innerHTML=a}We.on(ge.EMOTE_BROADCAST,i=>{i.playerId===We.guestId||!Nh(i.emote)||yd(Vi.players.get(i.playerId)?.avatar,i.emote)});We.on(ge.WELCOME,()=>Cd.setConnected(!0));function Id(i){const e=i==="rain"?"☔":i==="drizzle"?"☂":"☼",t=i==="rain"?"HEAVY RAIN":i==="drizzle"?"RAINY MIST":"CLEAR AFTER RAIN";pe("weather-icon").textContent=e,pe("weather-text").textContent=t,Ct.fog.density=i==="rain"?.026:i==="drizzle"?.022:.016}We.connect();let et=null,ms=!0,ri=.7,Fi=null,Mo=null,Zr=0,Ta=1;const Dd="afterlight-footsteps";try{const i=localStorage.getItem(Dd);if(i!==null&&i!==""){const e=Number(i);Number.isFinite(e)&&e>=0&&e<=100&&(ri=e/100)}}catch{}function By(){try{localStorage.setItem(Dd,String(Math.round(ri*100)))}catch{}}function Kl(i=[440,554,660]){!et||ms||i.forEach((e,t)=>{const n=et.createOscillator(),s=et.createGain();n.type="sine",n.frequency.value=e,s.gain.setValueAtTime(0,et.currentTime+t*.08),s.gain.linearRampToValueAtTime(.04,et.currentTime+.02+t*.08),s.gain.exponentialRampToValueAtTime(.001,et.currentTime+.8+t*.08),n.connect(s).connect(et.destination),n.start(et.currentTime+t*.08),n.stop(et.currentTime+.9+t*.08)})}function ky(){if(!et||ms||ri<=0||!Mo)return;const i=et.createBufferSource();i.buffer=Mo,i.playbackRate.value=.85+Math.random()*.35;const e=et.createBiquadFilter();e.type="lowpass",e.frequency.value=380+Math.random()*220;const t=et.createGain(),n=et.currentTime;if(t.gain.setValueAtTime(1e-4,n),t.gain.exponentialRampToValueAtTime(.5+Math.random()*.2,n+.012),t.gain.exponentialRampToValueAtTime(1e-4,n+.09),i.connect(e).connect(t),et.createStereoPanner){const s=et.createStereoPanner();s.pan.value=.22*Ta,Ta=-Ta,t.connect(s).connect(Fi)}else t.connect(Fi);i.start(n),i.stop(n+.1)}pe("sound").onclick=async()=>{if(ms=!ms,!et){et=new AudioContext,Fi=et.createGain(),Fi.gain.value=ri,Fi.connect(et.destination),Mo=et.createBuffer(1,Math.floor(et.sampleRate*.09),et.sampleRate);const i=Mo.getChannelData(0);for(let r=0;r<i.length;r++)i[r]=(Math.random()*2-1)*Math.pow(1-r/i.length,2);const e=et.createBuffer(1,et.sampleRate*2,et.sampleRate),t=e.getChannelData(0);for(let r=0;r<t.length;r++)t[r]=(Math.random()*2-1)*.04;const n=et.createBufferSource();n.buffer=e,n.loop=!0;const s=et.createBiquadFilter();s.type="lowpass",s.frequency.value=320,n.connect(s).connect(et.destination),n.start()}await(ms?et.suspend():et.resume()),pe("sound").textContent=ms?"♫  Sound off":"♫  Sound on"};pe("footsteps").value=String(Math.round(ri*100));pe("footsteps-value").textContent=`${Math.round(ri*100)}%`;pe("footsteps").oninput=()=>{ri=Number(pe("footsteps").value)/100,pe("footsteps-value").textContent=`${Math.round(ri*100)}%`,Fi&&(Fi.gain.value=ri),By()};function Zl(i){mi=i,document.querySelectorAll(".tool-btn").forEach(t=>{t.classList.toggle("active",t.dataset.tool===i)}),Ve.userData.setWateringCan(i==="water");const e={hands:"Tool: Hands & Inspect · Read crop stats",hoe:"Tool: Hoe · Till uncultivated beds",seed:`Tool: Seeds (${vn[ar[ys]].name}) · Plant in tilled beds`,water:"Tool: Watering Can · Replenish soil moisture",harvest:"Tool: Harvest Shears · Collect mature produce",sprinkler:"Tool: Sprinkler Kit · Press E on a bed to place (waters it + neighbors)"};pe("hud-tool-hint").textContent=e[i]||i}document.querySelectorAll(".tool-btn").forEach(i=>{i.onclick=()=>{const e=i.dataset.tool;e==="seed"&&mi==="seed"&&(ys=(ys+1)%ar.length,pe("active-seed-label").textContent=vn[ar[ys]].name),Zl(e)}});function Hy(i){vt||(vt={x:i.x,z:i.z-.08,standZ:i.z-.8,rotY:Math.PI},document.activeElement?.id==="chat-input"&&document.activeElement.blur(),Ve.position.set(vt.x,0,vt.z),Ve.rotation.y=vt.rotY,Fn===Qn&&(or=vt.rotY+Math.PI),Ve.userData.legs.forEach(e=>{e.rotation.x=-1.35}),gn=null,Cn.visible=!1,vi(),We.sendMovement(Ve.position.x,Ve.position.z,Ve.rotation.y,!1,!0),Nt("Take a Seat","You settle into the velvet. Press E or a movement key to stand.","THE ORPHEUM"),St.setSeated(!0),St.setWatchMode(!0))}function ki(){vt&&(Ve.position.set(vt.x,0,vt.standZ),vt=null,vi(),Ve.userData.legs.forEach(i=>{i.rotation.x=0}),We.sendMovement(Ve.position.x,Ve.position.z,Ve.rotation.y,!1,!1),St.setSeated(!1),St.setWatchMode(!1))}function Ud(){if(!ln){if(vt){ki();return}if(!st){Nt("No Target Nearby","Approach a garden bed, market stall, or gateway to interact.");return}if(st.type==="garden_gate"){Oi(qt.gardenFor(We.guestId));return}if(st.type==="market_gate"){Oi(qt.MARKET);return}if(st.type==="district_gate"){Oi(st.targetDistrict);return}if(st.type==="landmark"){const i=Xt.find(e=>e.id===At);i&&(wn.completed.includes(At)?Nt(i.done,"This sector has already been restored.","RESTORATION ACTIVE"):(wn.completed.push(At),Rd(wn),nn.update?.(Jn,!0),Nt(i.done,i.message,"RESTORATION COMPLETE")));return}if(st.type==="field-note"){Nt(st.sub,st.body,"FIELD NOTE");return}if(st.type==="seat"){Hy(st);return}if(st.type==="theater_screen"){St.openControls();return}if(st.type==="market_board"){xt.openMarket();return}if(st.type==="seed_vendor"){xt.openSeedVendor();return}if(st.type==="contracts_board"){xt.openContracts();return}if(st.type==="material_node"){We.send(ge.NODE_HARVEST,{actionId:`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,nodeId:st.nodeId});return}if(st.type==="mill"){Di?.mill?.status==="restored"?We.send(ge.MACHINE_MILL,{actionId:`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,quantity:1}):xt.openMachineShop();return}if(st.type==="machine_bench"){xt.openMachineShop();return}if(st.type==="bed"){const i=st.bedIndex,e=xo?xo[i]:null;if(mi==="hoe"){We.sendGardenAction("till",i);return}if(mi==="seed"){const t=ar[ys];We.sendGardenAction("plant",i,t);return}if(mi==="water"){We.sendGardenAction("water",i);return}if(mi==="harvest"){We.sendGardenAction("harvest",i);return}if(mi==="sprinkler"){We.sendGardenAction("place_sprinkler",i);return}if(!e||e.stage===Zn.EMPTY)Nt(`Bed #${i+1}`,"Unprepared soil. Select your Hoe (2) to till.");else if(e.stage===Zn.PREPARED)Nt(`Bed #${i+1}`,"Prepared soil. Select Seeds (3) to sow.");else{const t=vn[e.cropId],n=["Empty","Prepared","Seed","Sprout","Juvenile","Mature","Harvestable"];Nt(`${t?.name||"Crop"} (Bed #${i+1})`,`Stage: ${n[e.stage]||"Growing"} · Moisture: ${Math.round((e.moisture||0)*100)}% · Health: ${Math.round((e.health||1)*100)}%`)}}}}pe("interact").onclick=Ud;pe("btn-inventory").onclick=()=>xt.openInventory();pe("btn-market").onclick=()=>xt.openMarket();function Nd(){ln=!0,Ut.clear(),vi(),zy(),pe("district-dialog").showModal()}function Ks(){ln=!1,pe("district-dialog").close()}function zy(){const i=pe("district-list");i.innerHTML="";const e=document.createElement("button");e.className="district-choice"+(At==="market"?" active":""),e.innerHTML=`
    <div>
      <span class="micro">SOCIAL TRADING HUB</span>
      <strong>The Market Court</strong>
    </div>
    <span class="desc">Exchange harvests, buy seeds, and fulfill town contracts.</span>
    <span class="status-badge ${At==="market"?"current":"visited"}">${At==="market"?"CURRENT":"CIVIC HUB"}</span>
  `,e.onclick=()=>{Ks(),Oi("market")},i.appendChild(e);const t=qt.gardenFor(We.guestId),n=document.createElement("button");n.className="district-choice"+(At===t?" active":""),n.innerHTML=`
    <div>
      <span class="micro">CULTIVATION PLOT</span>
      <strong>Your Market Garden</strong>
    </div>
    <span class="desc">Till soil, sow crops, water, and harvest fresh produce.</span>
    <span class="status-badge ${At===t?"current":"visited"}">${At===t?"CURRENT":"PERSONAL PLOT"}</span>
  `,n.onclick=()=>{Ks(),Oi(t)},i.appendChild(n),Xt.forEach(s=>{const r=At===s.id,o=wn.completed.includes(s.id),a=wn.visited.includes(s.id),l=document.createElement("button");l.className="district-choice"+(r?" active":"");let c="unexplored",h="UNEXPLORED";r?(c="current",h="CURRENT"):o?(c="restored",h="✦ RESTORED"):a&&(c="visited",h="VISITED"),l.innerHTML=`
      <div>
        <span class="micro">${s.district}</span>
        <strong>${s.name}</strong>
      </div>
      <span class="desc">${s.description}</span>
      <span class="status-badge ${c}">${h}</span>
    `,l.onclick=()=>{Ks(),Oi(s.id)},i.appendChild(l)})}pe("btn-travel").onclick=Nd;pe("close-districts").onclick=Ks;pe("district-dialog").addEventListener("cancel",i=>{i.preventDefault(),Ks()});Co=qd({canOpen:()=>!ln&&!document.querySelector("dialog[open]"),onOpen:()=>{Ut.clear(),vi(),gn=null,Cn.visible=!1,Wt=null,St.setWatchMode(!1)},onChoose:i=>{yd(Ve,i),We.sendEmote(i),Nt(us.find(e=>e.id===i).label,"Move to finish your emote.","EMOTE")}});pe("btn-emote").onclick=()=>Co.open();pe("btn-edit-nick").onclick=()=>xt.openProfile();function Ro(){ln=!ln,Ut.clear(),vi(),ln?pe("settings-dialog").showModal():pe("settings-dialog").close()}pe("settings").onclick=Ro;pe("resume").onclick=Ro;pe("settings-dialog").addEventListener("cancel",i=>{i.preventDefault(),Ro()});function Vy(i){Fn=i,rr=i===Qn?sr:mn,Yl.camera=rr,i===Qn&&(or=Ve.rotation.y+Math.PI,yo=0),Ve.visible=i!==Qn,Ht.domElement.style.cursor=i===Qn?"grab":""}pe("camera").onclick=()=>Vy(Ty(Fn));pe("quality").onchange=()=>{Ht.setPixelRatio(Math.min(devicePixelRatio,Number(pe("quality").value))),Po()};pe("atmosphere").onchange=()=>{jl.visible=pe("atmosphere").checked};window.addEventListener("keydown",i=>{if(!(i.target.closest('input,select,textarea,[contenteditable="true"]')&&i.code!=="Escape")){if(vt&&["KeyE","KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(i.code)){if(ki(),i.code!=="KeyE"){i.preventDefault();return}return}if(i.code==="KeyT"){Nd();return}if((i.code==="Enter"||i.code==="Slash")&&!document.querySelector("dialog[open]")){i.preventDefault(),Cd.focusInput(i.code==="Slash"?"/":"");return}if(["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6"].includes(i.code)){Zl({Digit1:"hands",Digit2:"hoe",Digit3:"seed",Digit4:"water",Digit5:"harvest",Digit6:"sprinkler"}[i.code]);return}["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(i.code)&&i.preventDefault(),Ut.add(i.code),!i.repeat&&(i.code==="Space"&&!ln&&!vt&&(js=!0),i.code==="KeyE"&&Ud(),i.code==="KeyI"&&xt.openInventory(),i.code==="KeyM"&&xt.openMarket(),i.code==="KeyG"&&At===qt.THEATER&&!document.querySelector("dialog[open]")&&(i.preventDefault(),St.openControls()),i.code==="KeyC"&&pe("camera").click(),i.code==="Escape"&&(vt?ki():ln||(St.isWatching()?St.setWatchMode(!1):Ro())))}});window.addEventListener("keyup",i=>Ut.delete(i.code));window.addEventListener("blur",()=>{Ut.clear(),vi()});let Wt=null;Ht.domElement.addEventListener("pointerdown",i=>{ln||Co?.isOpen||(Wt={x:i.clientX,y:i.clientY,lastX:i.clientX,lastY:i.clientY,dragging:!1},Ht.domElement.setPointerCapture(i.pointerId))});Ht.domElement.addEventListener("pointermove",i=>{if(!Wt||ln)return;const e=i.clientX-Wt.lastX,t=i.clientY-Wt.lastY;Wt.lastX=i.clientX,Wt.lastY=i.clientY,Wt.dragging=Cy(Wt.x,Wt.y,i.clientX,i.clientY,Wt.dragging),Wt.dragging&&Fn===Qn&&(or-=e*Ly,yo=wy(yo-t*Iy))});function Gy(i){const e=Wt;if(Wt=null,!(!e||ln||e.dragging)&&(vt?ki():St.isWatching()&&St.setWatchMode(!1),Ih.setFromCamera(new Ae(i.clientX/innerWidth*2-1,-(i.clientY/innerHeight)*2+1),rr),Ih.ray.intersectPlane(Fy,Ea))){const t=Nv(si,Ea.x,Ea.z);gn=new U(t.x,0,t.z),Cn.position.set(gn.x,.24,gn.z),Cn.visible=!0}}Ht.domElement.addEventListener("pointerup",Gy);Ht.domElement.addEventListener("pointercancel",()=>{Wt=null});Ht.domElement.addEventListener("wheel",i=>{i.preventDefault(),Fn!==Qn&&(ps=Yu.clamp(ps+i.deltaY*.015,18,34),Po())},{passive:!1});function Wy(i,e,t,n){const s=i.position.x,r=i.position.z;vo(si,nn.obstacles,s+e,r)&&(i.position.x+=e),vo(si,nn.obstacles,i.position.x,r+t)&&(i.position.z+=t);const o=Math.hypot(i.position.x-s,i.position.z-r)>1e-4;return o?(i.rotation.y=Math.atan2(e,t),i.position.y=Math.sin(Jn*13)*.025,i.userData.legs.forEach((a,l)=>{a.rotation.x=Math.sin(Jn*13+l*Math.PI)*.45})):(i.position.y=0,i.userData.legs.forEach(a=>{a.rotation.x*=.8})),o}function Po(){const i=innerWidth/innerHeight;mn.left=-ps*i/2,mn.right=ps*i/2,mn.top=ps/2,mn.bottom=-ps/2,mn.near=.1,mn.far=150,mn.updateProjectionMatrix(),sr.aspect=i,sr.updateProjectionMatrix(),Ht.setSize(innerWidth,innerHeight),Ao.setSize(innerWidth,innerHeight)}window.addEventListener("resize",Po);Po();const Jr=new U(0,0,0);let Dh=performance.now();function Od(i){requestAnimationFrame(Od);const e=Math.min((i-Dh)/1e3,.04);if(Dh=i,!ln){Jn+=e;let t=0,n=0;(Ut.has("KeyW")||Ut.has("ArrowUp"))&&n--,(Ut.has("KeyS")||Ut.has("ArrowDown"))&&n++,(Ut.has("KeyA")||Ut.has("ArrowLeft"))&&t--,(Ut.has("KeyD")||Ut.has("ArrowRight"))&&t++,vt&&(t||n)?(ki(),t=0,n=0):!vt&&(t||n)&&St.isWatching()&&St.setWatchMode(!1);let s=new U(0,0,0);if(t||n){gn=null,Cn.visible=!1;const d=Ay(Fn,or,t,n);s.set(d.x,0,d.z)}else gn&&(s.subVectors(gn,Ve.position),s.y=0,s.length()<.15&&(gn=null,Cn.visible=!1,s.set(0,0,0)));(s.lengthSq()>0||js)&&fr(Ve);const r=Ut.has("ShiftLeft")||Ut.has("ShiftRight"),o=r?Lh:Oy;vt||(ev(Ri,{jumpPressed:js,jumpHeld:Ut.has("Space"),moving:s.lengthSq()>0,speed:o,cap:Lh*J_},e),js=!1),s.normalize().multiplyScalar(e*tv(Ri,o));const a=vt?!1:Wy(Ve,s.x,s.z);gn&&!a&&(gn=null,Cn.visible=!1),!vt&&Ri.airborne&&(Ve.position.y=Ri.y,Ve.userData.legs.forEach(d=>{d.rotation.x=-.8})),xd(Ve,e),a&&!Ri.airborne?(Zr-=e,Zr<=0&&(ky(),Zr=r?.29:.42)):Zr=0,We.sendMovement(Ve.position.x,Ve.position.z,Ve.rotation.y,a,!!vt,!vt&&Ri.airborne);const l=new U().subVectors(Ve.position,wt.position);if(l.y=0,l.length()>1.3){l.normalize().multiplyScalar(e*3.5);const d=wt.position.x,u=wt.position.z;vo(si,nn.obstacles||[],d+l.x,u)&&(wt.position.x+=l.x),vo(si,nn.obstacles||[],wt.position.x,u+l.z)&&(wt.position.z+=l.z),Math.hypot(wt.position.x-d,wt.position.z-u)>1e-4?(wt.rotation.y=Math.atan2(l.x,l.z),wt.position.y=Math.sin(Jn*12)*.025,wt.userData.legs?.forEach((_,m)=>_.rotation.x=Math.sin(Jn*12+m*Math.PI)*.45)):(wt.position.y=0,wt.userData.legs?.forEach(_=>_.rotation.x*=.8))}else wt.position.y=0,wt.userData.legs?.forEach(d=>d.rotation.x*=.8);Vi.update(e,Jn);const c=wn.completed.includes(At);nn.update(Jn,xo||c),st=null;let h=2.4;for(const d of nn.items||[]){const u=Math.hypot(Ve.position.x-d.x,Ve.position.z-d.z);u<h&&(st=d,h=u)}if(st)pe("action-title").textContent=st.title,pe("action-sub").textContent=st.sub,pe("interact").style.borderColor="#c6b47a99";else{const d=Xt.find(u=>u.id===At);d?(pe("action-title").textContent=d.name,pe("action-sub").textContent="Explore sector with Kiln · Press T to travel"):(pe("action-title").textContent=At===qt.MARKET?"Market Court":"Your Market Garden",pe("action-sub").textContent=At===qt.MARKET?"Explore stalls or travel to outer districts":"Approach beds to till, plant, water, and harvest"),pe("interact").style.borderColor="#9faa9240"}nn.previewCoverage?.(mi==="sprinkler"&&st?.type==="bed"?st.bedIndex:null),At!==Pd&&Ld();const f=Ov(si,Ve.position.x,Ve.position.z);pe("map-player").setAttribute("cx",f.cx),pe("map-player").setAttribute("cy",f.cy),jl.rotation.y=Math.sin(Jn*.03)*.04}if(Fn===Qn){const t=vt?Py:Ry;sr.position.set(Ve.position.x,Ve.position.y+t,Ve.position.z),sr.rotation.set(yo,or,0,"YXZ")}else{const t=[[21,25,26],[0,29,31],[-23,27,25]];Jr.lerp(new U(Ve.position.x*.14,.1,Ve.position.z*.14),.025),mn.position.set(Jr.x+t[Fn][0],t[Fn][1],Jr.z+t[Fn][2]),mn.lookAt(Jr)}if(Yl.camera=rr,Ao.render(),At===qt.THEATER&&nn?.screenQuad){const t=nn.screenQuad,n=t.map(o=>{const a=o.clone().project(rr);return{x:(a.x*.5+.5)*innerWidth,y:(-a.y*.5+.5)*innerHeight,z:a.z}}),s=n.every(o=>o.z>-1&&o.z<1)&&n.every(o=>o.x>-innerWidth&&o.x<innerWidth*2&&o.y>-innerHeight&&o.y<innerHeight*2),r=s?t[1].distanceTo(t[0])/Math.max(.01,t[3].distanceTo(t[0])):void 0;St.updateScreenQuad(s?n.map(({x:o,y:a})=>({x:o,y:a})):null,r)}else St.updateScreenQuad(null)}requestAnimationFrame(Od);pe("loading").style.opacity="0";setTimeout(()=>pe("loading").remove(),800);export{ge as M};
