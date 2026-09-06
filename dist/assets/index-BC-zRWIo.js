(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=t(s);fetch(s.href,r)}})();const rs=Object.freeze([{id:"wave",label:"Hello there",icon:"👋",hint:"A little warmth goes a long way"},{id:"dance",label:"Rust shuffle",icon:"♫",hint:"Still got some rhythm in these gears"},{id:"cheer",label:"We did it!",icon:"✦",hint:"Small repairs. Big celebrations."},{id:"heart",label:"Much love",icon:"♡",hint:"For your favorite fellow gardener"},{id:"bow",label:"After you",icon:"❧",hint:"A gracious little thank-you"},{id:"shrug",label:"Who knows?",icon:"¯\\_(ツ)_/¯",hint:"Some mysteries can wait"}]),Md=i=>rs.some(e=>e.id===i),Sa=3.2;function Ch(i,e,t=44){return!Number.isFinite(i)||!Number.isFinite(e)||Math.hypot(i,e)<t?-1:Math.floor((Math.atan2(e,i)+Math.PI/2+Math.PI/6+Math.PI*2)%(Math.PI*2)/(Math.PI/3))}function Rh({canOpen:i,onOpen:e,onChoose:t}){const n=document.createElement("div");n.className="emote-overlay",n.hidden=!0,n.innerHTML=`<section class="emote-wheel" role="dialog" aria-label="Emotes" aria-describedby="emote-help"><div class="emote-center"><small>EXPRESS YOURSELF</small><strong aria-live="polite">Choose a feeling</strong><span class="emote-description">Move outward to choose</span><i class="emote-stick"></i></div>${rs.map((h,u)=>`<button class="emote-choice" style="--x:${Math.sin(u*Math.PI/3)*36}%;--y:${-Math.cos(u*Math.PI/3)*36}%" data-index="${u}" aria-label="${h.label}"><span>${h.icon}</span><b>${h.label}</b><small>${u+1}</small></button>`).join("")}<p id="emote-help">Release V to perform · Center / Esc cancels<br>Or choose with 1–6 / arrow keys</p></section>`,document.body.append(n);const s=n.querySelector(".emote-wheel"),r=[...n.querySelectorAll("button")];let a=-1,o=!1,l;function c(h){a=h,r.forEach((u,g)=>{u.classList.toggle("selected",g===h),u.setAttribute("aria-pressed",String(g===h))}),n.querySelector("strong").textContent=rs[h]?.label||"Choose a feeling",n.querySelector(".emote-description").textContent=rs[h]?.hint||"Center to cancel"}function d(h=!1){if(n.hidden)return;const u=rs[a];n.hidden=!0,o=!1,l?.focus({preventScroll:!0}),h&&u&&t(u.id)}function f(h=!1){!n.hidden||!i()||(e(),l=document.activeElement,o=h,n.hidden=!1,c(-1),n.querySelector(".emote-stick").style.transform="",r[0].focus({preventScroll:!0}))}return n.addEventListener("pointermove",h=>{const u=s.getBoundingClientRect(),g=h.clientX-u.left-u.width/2,_=h.clientY-u.top-u.height/2;c(Ch(g,_,u.width*.12));const m=Math.hypot(g,_)||1;n.querySelector(".emote-stick").style.transform=`translate(${g/m*Math.min(16,m)}px, ${_/m*Math.min(16,m)}px)`}),n.addEventListener("click",h=>{const u=h.target.closest("button");u?(c(Number(u.dataset.index)),d(!0)):d()}),window.addEventListener("keydown",h=>{const u=h.target.closest('input,textarea,select,[contenteditable="true"]');if(n.hidden){h.code==="KeyV"&&!h.repeat&&!u&&!h.ctrlKey&&!h.metaKey&&!h.altKey&&i()&&(h.preventDefault(),h.stopImmediatePropagation(),f(!0));return}if(h.stopImmediatePropagation(),h.code==="Tab"){h.preventDefault(),c((a+(h.shiftKey?5:1)+6)%6),r[a].focus();return}h.preventDefault(),h.code==="Escape"?d():/^Digit[1-6]$/.test(h.code)?c(Number(h.code.slice(-1))-1):["ArrowRight","ArrowDown","ArrowLeft","ArrowUp"].includes(h.code)?c((a+(["ArrowLeft","ArrowUp"].includes(h.code)?5:1)+6)%6):(h.code==="Enter"||h.code==="Space")&&d(!0)},!0),window.addEventListener("keyup",h=>{h.code==="KeyV"&&o&&(h.preventDefault(),h.stopImmediatePropagation(),d(!0))},!0),window.addEventListener("blur",()=>d()),document.addEventListener("visibilitychange",()=>{document.hidden&&d()}),window.addEventListener("resize",()=>d()),{open:f,close:d,get isOpen(){return!n.hidden}}}const ul="180",Ph=0,ql=1,Ih=2,Sd=1,Ed=2,Xn=3,ui=0,Kt=1,sn=2,Kn=0,cs=1,go=2,$l=3,Yl=4,Lh=5,Ti=100,Dh=101,Uh=102,Nh=103,Fh=104,Oh=200,Bh=201,kh=202,Hh=203,_o=204,vo=205,zh=206,Vh=207,Gh=208,Wh=209,Xh=210,qh=211,$h=212,Yh=213,Kh=214,yo=0,xo=1,Mo=2,us=3,So=4,Eo=5,bo=6,To=7,bd=0,Zh=1,jh=2,hi=0,Jh=1,Qh=2,eu=3,Td=4,tu=5,nu=6,iu=7,wd=300,fs=301,ps=302,wo=303,Ao=304,ha=306,Co=1e3,Ri=1001,Ro=1002,rn=1003,su=1004,cr=1005,Sn=1006,Ea=1007,Pi=1008,On=1009,Ad=1010,Cd=1011,Ws=1012,fl=1013,Di=1014,Un=1015,Zn=1016,pl=1017,ml=1018,Xs=1020,Rd=35902,Pd=35899,Id=1021,Ld=1022,En=1023,qs=1026,$s=1027,gl=1028,_l=1029,Dd=1030,vl=1031,yl=1033,Wr=33776,Xr=33777,qr=33778,$r=33779,Po=35840,Io=35841,Lo=35842,Do=35843,Uo=36196,No=37492,Fo=37496,Oo=37808,Bo=37809,ko=37810,Ho=37811,zo=37812,Vo=37813,Go=37814,Wo=37815,Xo=37816,qo=37817,$o=37818,Yo=37819,Ko=37820,Zo=37821,jo=36492,Jo=36494,Qo=36495,el=36283,tl=36284,nl=36285,il=36286,ru=3200,au=3201,Ud=0,ou=1,ci="",un="srgb",ms="srgb-linear",ta="linear",rt="srgb",Bi=7680,Kl=519,lu=512,cu=513,du=514,Nd=515,hu=516,uu=517,fu=518,pu=519,sl=35044,Zl="300 es",Nn=2e3,na=2001;class vs{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const s=n[e];if(s!==void 0){const r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,e);e.target=null}}}const Ot=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let jl=1234567;const ks=Math.PI/180,Ys=180/Math.PI;function jn(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ot[i&255]+Ot[i>>8&255]+Ot[i>>16&255]+Ot[i>>24&255]+"-"+Ot[e&255]+Ot[e>>8&255]+"-"+Ot[e>>16&15|64]+Ot[e>>24&255]+"-"+Ot[t&63|128]+Ot[t>>8&255]+"-"+Ot[t>>16&255]+Ot[t>>24&255]+Ot[n&255]+Ot[n>>8&255]+Ot[n>>16&255]+Ot[n>>24&255]).toLowerCase()}function Ke(i,e,t){return Math.max(e,Math.min(t,i))}function xl(i,e){return(i%e+e)%e}function mu(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function gu(i,e,t){return i!==e?(t-i)/(e-i):0}function Hs(i,e,t){return(1-t)*i+t*e}function _u(i,e,t,n){return Hs(i,e,1-Math.exp(-t*n))}function vu(i,e=1){return e-Math.abs(xl(i,e*2)-e)}function yu(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function xu(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Mu(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Su(i,e){return i+Math.random()*(e-i)}function Eu(i){return i*(.5-Math.random())}function bu(i){i!==void 0&&(jl=i);let e=jl+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Tu(i){return i*ks}function wu(i){return i*Ys}function Au(i){return(i&i-1)===0&&i!==0}function Cu(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Ru(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Pu(i,e,t,n,s){const r=Math.cos,a=Math.sin,o=r(t/2),l=a(t/2),c=r((e+n)/2),d=a((e+n)/2),f=r((e-n)/2),h=a((e-n)/2),u=r((n-e)/2),g=a((n-e)/2);switch(s){case"XYX":i.set(o*d,l*f,l*h,o*c);break;case"YZY":i.set(l*h,o*d,l*f,o*c);break;case"ZXZ":i.set(l*f,l*h,o*d,o*c);break;case"XZX":i.set(o*d,l*g,l*u,o*c);break;case"YXY":i.set(l*u,o*d,l*g,o*c);break;case"ZYZ":i.set(l*g,l*u,o*d,o*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Mn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function nt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const Iu={DEG2RAD:ks,RAD2DEG:Ys,generateUUID:jn,clamp:Ke,euclideanModulo:xl,mapLinear:mu,inverseLerp:gu,lerp:Hs,damp:_u,pingpong:vu,smoothstep:yu,smootherstep:xu,randInt:Mu,randFloat:Su,randFloatSpread:Eu,seededRandom:bu,degToRad:Tu,radToDeg:wu,isPowerOfTwo:Au,ceilPowerOfTwo:Cu,floorPowerOfTwo:Ru,setQuaternionFromProperEuler:Pu,normalize:nt,denormalize:Mn};class Ae{constructor(e=0,t=0){Ae.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ke(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ke(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*n-a*s+e.x,this.y=r*s+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class ir{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,a,o){let l=n[s+0],c=n[s+1],d=n[s+2],f=n[s+3];const h=r[a+0],u=r[a+1],g=r[a+2],_=r[a+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=d,e[t+3]=f;return}if(o===1){e[t+0]=h,e[t+1]=u,e[t+2]=g,e[t+3]=_;return}if(f!==_||l!==h||c!==u||d!==g){let m=1-o;const p=l*h+c*u+d*g+f*_,E=p>=0?1:-1,b=1-p*p;if(b>Number.EPSILON){const R=Math.sqrt(b),w=Math.atan2(R,p*E);m=Math.sin(m*w)/R,o=Math.sin(o*w)/R}const M=o*E;if(l=l*m+h*M,c=c*m+u*M,d=d*m+g*M,f=f*m+_*M,m===1-o){const R=1/Math.sqrt(l*l+c*c+d*d+f*f);l*=R,c*=R,d*=R,f*=R}}e[t]=l,e[t+1]=c,e[t+2]=d,e[t+3]=f}static multiplyQuaternionsFlat(e,t,n,s,r,a){const o=n[s],l=n[s+1],c=n[s+2],d=n[s+3],f=r[a],h=r[a+1],u=r[a+2],g=r[a+3];return e[t]=o*g+d*f+l*u-c*h,e[t+1]=l*g+d*h+c*f-o*u,e[t+2]=c*g+d*u+o*h-l*f,e[t+3]=d*g-o*f-l*h-c*u,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,s=e._y,r=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(n/2),d=o(s/2),f=o(r/2),h=l(n/2),u=l(s/2),g=l(r/2);switch(a){case"XYZ":this._x=h*d*f+c*u*g,this._y=c*u*f-h*d*g,this._z=c*d*g+h*u*f,this._w=c*d*f-h*u*g;break;case"YXZ":this._x=h*d*f+c*u*g,this._y=c*u*f-h*d*g,this._z=c*d*g-h*u*f,this._w=c*d*f+h*u*g;break;case"ZXY":this._x=h*d*f-c*u*g,this._y=c*u*f+h*d*g,this._z=c*d*g+h*u*f,this._w=c*d*f-h*u*g;break;case"ZYX":this._x=h*d*f-c*u*g,this._y=c*u*f+h*d*g,this._z=c*d*g-h*u*f,this._w=c*d*f+h*u*g;break;case"YZX":this._x=h*d*f+c*u*g,this._y=c*u*f+h*d*g,this._z=c*d*g-h*u*f,this._w=c*d*f-h*u*g;break;case"XZY":this._x=h*d*f-c*u*g,this._y=c*u*f-h*d*g,this._z=c*d*g+h*u*f,this._w=c*d*f+h*u*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],s=t[4],r=t[8],a=t[1],o=t[5],l=t[9],c=t[2],d=t[6],f=t[10],h=n+o+f;if(h>0){const u=.5/Math.sqrt(h+1);this._w=.25/u,this._x=(d-l)*u,this._y=(r-c)*u,this._z=(a-s)*u}else if(n>o&&n>f){const u=2*Math.sqrt(1+n-o-f);this._w=(d-l)/u,this._x=.25*u,this._y=(s+a)/u,this._z=(r+c)/u}else if(o>f){const u=2*Math.sqrt(1+o-n-f);this._w=(r-c)/u,this._x=(s+a)/u,this._y=.25*u,this._z=(l+d)/u}else{const u=2*Math.sqrt(1+f-n-o);this._w=(a-s)/u,this._x=(r+c)/u,this._y=(l+d)/u,this._z=.25*u}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ke(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,s=e._y,r=e._z,a=e._w,o=t._x,l=t._y,c=t._z,d=t._w;return this._x=n*d+a*o+s*c-r*l,this._y=s*d+a*l+r*o-n*c,this._z=r*d+a*c+n*l-s*o,this._w=a*d-n*o-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,s=this._y,r=this._z,a=this._w;let o=a*e._w+n*e._x+s*e._y+r*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=s,this._z=r,this;const l=1-o*o;if(l<=Number.EPSILON){const u=1-t;return this._w=u*a+t*this._w,this._x=u*n+t*this._x,this._y=u*s+t*this._y,this._z=u*r+t*this._z,this.normalize(),this}const c=Math.sqrt(l),d=Math.atan2(c,o),f=Math.sin((1-t)*d)/c,h=Math.sin(t*d)/c;return this._w=a*f+this._w*h,this._x=n*f+this._x*h,this._y=s*f+this._y*h,this._z=r*f+this._z*h,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class D{constructor(e=0,t=0,n=0){D.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Jl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Jl.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=e.elements,a=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(e){const t=this.x,n=this.y,s=this.z,r=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*s-o*n),d=2*(o*t-r*s),f=2*(r*n-a*t);return this.x=t+l*c+a*f-o*d,this.y=n+l*d+o*c-r*f,this.z=s+l*f+r*d-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this.z=Ke(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this.z=Ke(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ke(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,s=e.y,r=e.z,a=t.x,o=t.y,l=t.z;return this.x=s*l-r*o,this.y=r*a-n*l,this.z=n*o-s*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return ba.copy(this).projectOnVector(e),this.sub(ba)}reflect(e){return this.sub(ba.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ke(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const ba=new D,Jl=new ir;class Ge{constructor(e,t,n,s,r,a,o,l,c){Ge.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,l,c)}set(e,t,n,s,r,a,o,l,c){const d=this.elements;return d[0]=e,d[1]=s,d[2]=o,d[3]=t,d[4]=r,d[5]=l,d[6]=n,d[7]=a,d[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],d=n[4],f=n[7],h=n[2],u=n[5],g=n[8],_=s[0],m=s[3],p=s[6],E=s[1],b=s[4],M=s[7],R=s[2],w=s[5],I=s[8];return r[0]=a*_+o*E+l*R,r[3]=a*m+o*b+l*w,r[6]=a*p+o*M+l*I,r[1]=c*_+d*E+f*R,r[4]=c*m+d*b+f*w,r[7]=c*p+d*M+f*I,r[2]=h*_+u*E+g*R,r[5]=h*m+u*b+g*w,r[8]=h*p+u*M+g*I,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],d=e[8];return t*a*d-t*o*c-n*r*d+n*o*l+s*r*c-s*a*l}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],d=e[8],f=d*a-o*c,h=o*l-d*r,u=c*r-a*l,g=t*f+n*h+s*u;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return e[0]=f*_,e[1]=(s*c-d*n)*_,e[2]=(o*n-s*a)*_,e[3]=h*_,e[4]=(d*t-s*l)*_,e[5]=(s*r-o*t)*_,e[6]=u*_,e[7]=(n*l-c*t)*_,e[8]=(a*t-n*r)*_,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,a,o){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+e,-s*c,s*l,-s*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Ta.makeScale(e,t)),this}rotate(e){return this.premultiply(Ta.makeRotation(-e)),this}translate(e,t){return this.premultiply(Ta.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Ta=new Ge;function Fd(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function ia(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Lu(){const i=ia("canvas");return i.style.display="block",i}const Ql={};function Ks(i){i in Ql||(Ql[i]=!0,console.warn(i))}function Du(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}const ec=new Ge().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),tc=new Ge().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Uu(){const i={enabled:!0,workingColorSpace:ms,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===rt&&(s.r=Jn(s.r),s.g=Jn(s.g),s.b=Jn(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===rt&&(s.r=ds(s.r),s.g=ds(s.g),s.b=ds(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===ci?ta:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Ks("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Ks("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[ms]:{primaries:e,whitePoint:n,transfer:ta,toXYZ:ec,fromXYZ:tc,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:un},outputColorSpaceConfig:{drawingBufferColorSpace:un}},[un]:{primaries:e,whitePoint:n,transfer:rt,toXYZ:ec,fromXYZ:tc,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:un}}}),i}const je=Uu();function Jn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function ds(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let ki;class Nu{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{ki===void 0&&(ki=ia("canvas")),ki.width=e.width,ki.height=e.height;const s=ki.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=ki}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=ia("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=Jn(r[a]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Jn(t[n]/255)*255):t[n]=Jn(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Fu=0;class Ml{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Fu++}),this.uuid=jn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(wa(s[a].image)):r.push(wa(s[a]))}else r=wa(s);n.url=r}return t||(e.images[this.uuid]=n),n}}function wa(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Nu.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Ou=0;const Aa=new D;class kt extends vs{constructor(e=kt.DEFAULT_IMAGE,t=kt.DEFAULT_MAPPING,n=Ri,s=Ri,r=Sn,a=Pi,o=En,l=On,c=kt.DEFAULT_ANISOTROPY,d=ci){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Ou++}),this.uuid=jn(),this.name="",this.source=new Ml(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new Ae(0,0),this.repeat=new Ae(1,1),this.center=new Ae(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ge,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=d,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Aa).x}get height(){return this.source.getSize(Aa).y}get depth(){return this.source.getSize(Aa).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==wd)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Co:e.x=e.x-Math.floor(e.x);break;case Ri:e.x=e.x<0?0:1;break;case Ro:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Co:e.y=e.y-Math.floor(e.y);break;case Ri:e.y=e.y<0?0:1;break;case Ro:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}kt.DEFAULT_IMAGE=null;kt.DEFAULT_MAPPING=wd;kt.DEFAULT_ANISOTROPY=1;class at{constructor(e=0,t=0,n=0,s=1){at.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*t+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*t+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*t+a[7]*n+a[11]*s+a[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r;const l=e.elements,c=l[0],d=l[4],f=l[8],h=l[1],u=l[5],g=l[9],_=l[2],m=l[6],p=l[10];if(Math.abs(d-h)<.01&&Math.abs(f-_)<.01&&Math.abs(g-m)<.01){if(Math.abs(d+h)<.1&&Math.abs(f+_)<.1&&Math.abs(g+m)<.1&&Math.abs(c+u+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const b=(c+1)/2,M=(u+1)/2,R=(p+1)/2,w=(d+h)/4,I=(f+_)/4,L=(g+m)/4;return b>M&&b>R?b<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(b),s=w/n,r=I/n):M>R?M<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(M),n=w/s,r=L/s):R<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(R),n=I/r,s=L/r),this.set(n,s,r,t),this}let E=Math.sqrt((m-g)*(m-g)+(f-_)*(f-_)+(h-d)*(h-d));return Math.abs(E)<.001&&(E=1),this.x=(m-g)/E,this.y=(f-_)/E,this.z=(h-d)/E,this.w=Math.acos((c+u+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this.z=Ke(this.z,e.z,t.z),this.w=Ke(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this.z=Ke(this.z,e,t),this.w=Ke(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ke(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Bu extends vs{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Sn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new at(0,0,e,t),this.scissorTest=!1,this.viewport=new at(0,0,e,t);const s={width:e,height:t,depth:n.depth},r=new kt(s);this.textures=[];const a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:Sn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isArrayTexture=this.textures[s].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const s=Object.assign({},e.textures[t].image);this.textures[t].source=new Ml(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Tn extends Bu{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Od extends kt{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=rn,this.minFilter=rn,this.wrapR=Ri,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class ku extends kt{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=rn,this.minFilter=rn,this.wrapR=Ri,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ni{constructor(e=new D(1/0,1/0,1/0),t=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(vn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(vn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=vn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,vn):vn.fromBufferAttribute(r,a),vn.applyMatrix4(e.matrixWorld),this.expandByPoint(vn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),dr.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),dr.copy(n.boundingBox)),dr.applyMatrix4(e.matrixWorld),this.union(dr)}const s=e.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,vn),vn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(bs),hr.subVectors(this.max,bs),Hi.subVectors(e.a,bs),zi.subVectors(e.b,bs),Vi.subVectors(e.c,bs),ni.subVectors(zi,Hi),ii.subVectors(Vi,zi),gi.subVectors(Hi,Vi);let t=[0,-ni.z,ni.y,0,-ii.z,ii.y,0,-gi.z,gi.y,ni.z,0,-ni.x,ii.z,0,-ii.x,gi.z,0,-gi.x,-ni.y,ni.x,0,-ii.y,ii.x,0,-gi.y,gi.x,0];return!Ca(t,Hi,zi,Vi,hr)||(t=[1,0,0,0,1,0,0,0,1],!Ca(t,Hi,zi,Vi,hr))?!1:(ur.crossVectors(ni,ii),t=[ur.x,ur.y,ur.z],Ca(t,Hi,zi,Vi,hr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,vn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(vn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Hn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Hn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Hn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Hn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Hn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Hn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Hn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Hn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Hn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Hn=[new D,new D,new D,new D,new D,new D,new D,new D],vn=new D,dr=new Ni,Hi=new D,zi=new D,Vi=new D,ni=new D,ii=new D,gi=new D,bs=new D,hr=new D,ur=new D,_i=new D;function Ca(i,e,t,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){_i.fromArray(i,r);const o=s.x*Math.abs(_i.x)+s.y*Math.abs(_i.y)+s.z*Math.abs(_i.z),l=e.dot(_i),c=t.dot(_i),d=n.dot(_i);if(Math.max(-Math.max(l,c,d),Math.min(l,c,d))>o)return!1}return!0}const Hu=new Ni,Ts=new D,Ra=new D;class ys{constructor(e=new D,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):Hu.setFromPoints(e).getCenter(n);let s=0;for(let r=0,a=e.length;r<a;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Ts.subVectors(e,this.center);const t=Ts.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(Ts,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Ra.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Ts.copy(e.center).add(Ra)),this.expandByPoint(Ts.copy(e.center).sub(Ra))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const zn=new D,Pa=new D,fr=new D,si=new D,Ia=new D,pr=new D,La=new D;class Sl{constructor(e=new D,t=new D(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,zn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=zn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(zn.copy(this.origin).addScaledVector(this.direction,t),zn.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){Pa.copy(e).add(t).multiplyScalar(.5),fr.copy(t).sub(e).normalize(),si.copy(this.origin).sub(Pa);const r=e.distanceTo(t)*.5,a=-this.direction.dot(fr),o=si.dot(this.direction),l=-si.dot(fr),c=si.lengthSq(),d=Math.abs(1-a*a);let f,h,u,g;if(d>0)if(f=a*l-o,h=a*o-l,g=r*d,f>=0)if(h>=-g)if(h<=g){const _=1/d;f*=_,h*=_,u=f*(f+a*h+2*o)+h*(a*f+h+2*l)+c}else h=r,f=Math.max(0,-(a*h+o)),u=-f*f+h*(h+2*l)+c;else h=-r,f=Math.max(0,-(a*h+o)),u=-f*f+h*(h+2*l)+c;else h<=-g?(f=Math.max(0,-(-a*r+o)),h=f>0?-r:Math.min(Math.max(-r,-l),r),u=-f*f+h*(h+2*l)+c):h<=g?(f=0,h=Math.min(Math.max(-r,-l),r),u=h*(h+2*l)+c):(f=Math.max(0,-(a*r+o)),h=f>0?r:Math.min(Math.max(-r,-l),r),u=-f*f+h*(h+2*l)+c);else h=a>0?-r:r,f=Math.max(0,-(a*h+o)),u=-f*f+h*(h+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,f),s&&s.copy(Pa).addScaledVector(fr,h),u}intersectSphere(e,t){zn.subVectors(e.center,this.origin);const n=zn.dot(this.direction),s=zn.dot(zn)-n*n,r=e.radius*e.radius;if(s>r)return null;const a=Math.sqrt(r-s),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,a,o,l;const c=1/this.direction.x,d=1/this.direction.y,f=1/this.direction.z,h=this.origin;return c>=0?(n=(e.min.x-h.x)*c,s=(e.max.x-h.x)*c):(n=(e.max.x-h.x)*c,s=(e.min.x-h.x)*c),d>=0?(r=(e.min.y-h.y)*d,a=(e.max.y-h.y)*d):(r=(e.max.y-h.y)*d,a=(e.min.y-h.y)*d),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),f>=0?(o=(e.min.z-h.z)*f,l=(e.max.z-h.z)*f):(o=(e.max.z-h.z)*f,l=(e.min.z-h.z)*f),n>l||o>s)||((o>n||n!==n)&&(n=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,zn)!==null}intersectTriangle(e,t,n,s,r){Ia.subVectors(t,e),pr.subVectors(n,e),La.crossVectors(Ia,pr);let a=this.direction.dot(La),o;if(a>0){if(s)return null;o=1}else if(a<0)o=-1,a=-a;else return null;si.subVectors(this.origin,e);const l=o*this.direction.dot(pr.crossVectors(si,pr));if(l<0)return null;const c=o*this.direction.dot(Ia.cross(si));if(c<0||l+c>a)return null;const d=-o*si.dot(La);return d<0?null:this.at(d/a,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ot{constructor(e,t,n,s,r,a,o,l,c,d,f,h,u,g,_,m){ot.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,l,c,d,f,h,u,g,_,m)}set(e,t,n,s,r,a,o,l,c,d,f,h,u,g,_,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=s,p[1]=r,p[5]=a,p[9]=o,p[13]=l,p[2]=c,p[6]=d,p[10]=f,p[14]=h,p[3]=u,p[7]=g,p[11]=_,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ot().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,s=1/Gi.setFromMatrixColumn(e,0).length(),r=1/Gi.setFromMatrixColumn(e,1).length(),a=1/Gi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,s=e.y,r=e.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(s),c=Math.sin(s),d=Math.cos(r),f=Math.sin(r);if(e.order==="XYZ"){const h=a*d,u=a*f,g=o*d,_=o*f;t[0]=l*d,t[4]=-l*f,t[8]=c,t[1]=u+g*c,t[5]=h-_*c,t[9]=-o*l,t[2]=_-h*c,t[6]=g+u*c,t[10]=a*l}else if(e.order==="YXZ"){const h=l*d,u=l*f,g=c*d,_=c*f;t[0]=h+_*o,t[4]=g*o-u,t[8]=a*c,t[1]=a*f,t[5]=a*d,t[9]=-o,t[2]=u*o-g,t[6]=_+h*o,t[10]=a*l}else if(e.order==="ZXY"){const h=l*d,u=l*f,g=c*d,_=c*f;t[0]=h-_*o,t[4]=-a*f,t[8]=g+u*o,t[1]=u+g*o,t[5]=a*d,t[9]=_-h*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){const h=a*d,u=a*f,g=o*d,_=o*f;t[0]=l*d,t[4]=g*c-u,t[8]=h*c+_,t[1]=l*f,t[5]=_*c+h,t[9]=u*c-g,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){const h=a*l,u=a*c,g=o*l,_=o*c;t[0]=l*d,t[4]=_-h*f,t[8]=g*f+u,t[1]=f,t[5]=a*d,t[9]=-o*d,t[2]=-c*d,t[6]=u*f+g,t[10]=h-_*f}else if(e.order==="XZY"){const h=a*l,u=a*c,g=o*l,_=o*c;t[0]=l*d,t[4]=-f,t[8]=c*d,t[1]=h*f+_,t[5]=a*d,t[9]=u*f-g,t[2]=g*f-u,t[6]=o*d,t[10]=_*f+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(zu,e,Vu)}lookAt(e,t,n){const s=this.elements;return Qt.subVectors(e,t),Qt.lengthSq()===0&&(Qt.z=1),Qt.normalize(),ri.crossVectors(n,Qt),ri.lengthSq()===0&&(Math.abs(n.z)===1?Qt.x+=1e-4:Qt.z+=1e-4,Qt.normalize(),ri.crossVectors(n,Qt)),ri.normalize(),mr.crossVectors(Qt,ri),s[0]=ri.x,s[4]=mr.x,s[8]=Qt.x,s[1]=ri.y,s[5]=mr.y,s[9]=Qt.y,s[2]=ri.z,s[6]=mr.z,s[10]=Qt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],d=n[1],f=n[5],h=n[9],u=n[13],g=n[2],_=n[6],m=n[10],p=n[14],E=n[3],b=n[7],M=n[11],R=n[15],w=s[0],I=s[4],L=s[8],v=s[12],y=s[1],C=s[5],T=s[9],B=s[13],U=s[2],F=s[6],N=s[10],W=s[14],V=s[3],j=s[7],ee=s[11],ce=s[15];return r[0]=a*w+o*y+l*U+c*V,r[4]=a*I+o*C+l*F+c*j,r[8]=a*L+o*T+l*N+c*ee,r[12]=a*v+o*B+l*W+c*ce,r[1]=d*w+f*y+h*U+u*V,r[5]=d*I+f*C+h*F+u*j,r[9]=d*L+f*T+h*N+u*ee,r[13]=d*v+f*B+h*W+u*ce,r[2]=g*w+_*y+m*U+p*V,r[6]=g*I+_*C+m*F+p*j,r[10]=g*L+_*T+m*N+p*ee,r[14]=g*v+_*B+m*W+p*ce,r[3]=E*w+b*y+M*U+R*V,r[7]=E*I+b*C+M*F+R*j,r[11]=E*L+b*T+M*N+R*ee,r[15]=E*v+b*B+M*W+R*ce,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],a=e[1],o=e[5],l=e[9],c=e[13],d=e[2],f=e[6],h=e[10],u=e[14],g=e[3],_=e[7],m=e[11],p=e[15];return g*(+r*l*f-s*c*f-r*o*h+n*c*h+s*o*u-n*l*u)+_*(+t*l*u-t*c*h+r*a*h-s*a*u+s*c*d-r*l*d)+m*(+t*c*f-t*o*u-r*a*f+n*a*u+r*o*d-n*c*d)+p*(-s*o*d-t*l*f+t*o*h+s*a*f-n*a*h+n*l*d)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],d=e[8],f=e[9],h=e[10],u=e[11],g=e[12],_=e[13],m=e[14],p=e[15],E=f*m*c-_*h*c+_*l*u-o*m*u-f*l*p+o*h*p,b=g*h*c-d*m*c-g*l*u+a*m*u+d*l*p-a*h*p,M=d*_*c-g*f*c+g*o*u-a*_*u-d*o*p+a*f*p,R=g*f*l-d*_*l-g*o*h+a*_*h+d*o*m-a*f*m,w=t*E+n*b+s*M+r*R;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const I=1/w;return e[0]=E*I,e[1]=(_*h*r-f*m*r-_*s*u+n*m*u+f*s*p-n*h*p)*I,e[2]=(o*m*r-_*l*r+_*s*c-n*m*c-o*s*p+n*l*p)*I,e[3]=(f*l*r-o*h*r-f*s*c+n*h*c+o*s*u-n*l*u)*I,e[4]=b*I,e[5]=(d*m*r-g*h*r+g*s*u-t*m*u-d*s*p+t*h*p)*I,e[6]=(g*l*r-a*m*r-g*s*c+t*m*c+a*s*p-t*l*p)*I,e[7]=(a*h*r-d*l*r+d*s*c-t*h*c-a*s*u+t*l*u)*I,e[8]=M*I,e[9]=(g*f*r-d*_*r-g*n*u+t*_*u+d*n*p-t*f*p)*I,e[10]=(a*_*r-g*o*r+g*n*c-t*_*c-a*n*p+t*o*p)*I,e[11]=(d*o*r-a*f*r-d*n*c+t*f*c+a*n*u-t*o*u)*I,e[12]=R*I,e[13]=(d*_*s-g*f*s+g*n*h-t*_*h-d*n*m+t*f*m)*I,e[14]=(g*o*s-a*_*s-g*n*l+t*_*l+a*n*m-t*o*m)*I,e[15]=(a*f*s-d*o*s+d*n*l-t*f*l-a*n*h+t*o*h)*I,this}scale(e){const t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),s=Math.sin(t),r=1-n,a=e.x,o=e.y,l=e.z,c=r*a,d=r*o;return this.set(c*a+n,c*o-s*l,c*l+s*o,0,c*o+s*l,d*o+n,d*l-s*a,0,c*l-s*o,d*l+s*a,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,a){return this.set(1,n,r,0,e,1,a,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){const s=this.elements,r=t._x,a=t._y,o=t._z,l=t._w,c=r+r,d=a+a,f=o+o,h=r*c,u=r*d,g=r*f,_=a*d,m=a*f,p=o*f,E=l*c,b=l*d,M=l*f,R=n.x,w=n.y,I=n.z;return s[0]=(1-(_+p))*R,s[1]=(u+M)*R,s[2]=(g-b)*R,s[3]=0,s[4]=(u-M)*w,s[5]=(1-(h+p))*w,s[6]=(m+E)*w,s[7]=0,s[8]=(g+b)*I,s[9]=(m-E)*I,s[10]=(1-(h+_))*I,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){const s=this.elements;let r=Gi.set(s[0],s[1],s[2]).length();const a=Gi.set(s[4],s[5],s[6]).length(),o=Gi.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],yn.copy(this);const c=1/r,d=1/a,f=1/o;return yn.elements[0]*=c,yn.elements[1]*=c,yn.elements[2]*=c,yn.elements[4]*=d,yn.elements[5]*=d,yn.elements[6]*=d,yn.elements[8]*=f,yn.elements[9]*=f,yn.elements[10]*=f,t.setFromRotationMatrix(yn),n.x=r,n.y=a,n.z=o,this}makePerspective(e,t,n,s,r,a,o=Nn,l=!1){const c=this.elements,d=2*r/(t-e),f=2*r/(n-s),h=(t+e)/(t-e),u=(n+s)/(n-s);let g,_;if(l)g=r/(a-r),_=a*r/(a-r);else if(o===Nn)g=-(a+r)/(a-r),_=-2*a*r/(a-r);else if(o===na)g=-a/(a-r),_=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=d,c[4]=0,c[8]=h,c[12]=0,c[1]=0,c[5]=f,c[9]=u,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,a,o=Nn,l=!1){const c=this.elements,d=2/(t-e),f=2/(n-s),h=-(t+e)/(t-e),u=-(n+s)/(n-s);let g,_;if(l)g=1/(a-r),_=a/(a-r);else if(o===Nn)g=-2/(a-r),_=-(a+r)/(a-r);else if(o===na)g=-1/(a-r),_=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=d,c[4]=0,c[8]=0,c[12]=h,c[1]=0,c[5]=f,c[9]=0,c[13]=u,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Gi=new D,yn=new ot,zu=new D(0,0,0),Vu=new D(1,1,1),ri=new D,mr=new D,Qt=new D,nc=new ot,ic=new ir;class Bn{constructor(e=0,t=0,n=0,s=Bn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const s=e.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],d=s[9],f=s[2],h=s[6],u=s[10];switch(t){case"XYZ":this._y=Math.asin(Ke(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-d,u),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(h,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ke(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(o,u),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ke(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-f,u),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ke(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(h,u),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Ke(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-d,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(o,u));break;case"XZY":this._z=Math.asin(-Ke(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(h,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-d,u),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return nc.makeRotationFromQuaternion(e),this.setFromRotationMatrix(nc,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return ic.setFromEuler(this),this.setFromQuaternion(ic,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Bn.DEFAULT_ORDER="XYZ";class El{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Gu=0;const sc=new D,Wi=new ir,Vn=new ot,gr=new D,ws=new D,Wu=new D,Xu=new ir,rc=new D(1,0,0),ac=new D(0,1,0),oc=new D(0,0,1),lc={type:"added"},qu={type:"removed"},Xi={type:"childadded",child:null},Da={type:"childremoved",child:null};class Rt extends vs{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Gu++}),this.uuid=jn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Rt.DEFAULT_UP.clone();const e=new D,t=new Bn,n=new ir,s=new D(1,1,1);function r(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ot},normalMatrix:{value:new Ge}}),this.matrix=new ot,this.matrixWorld=new ot,this.matrixAutoUpdate=Rt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Rt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new El,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Wi.setFromAxisAngle(e,t),this.quaternion.multiply(Wi),this}rotateOnWorldAxis(e,t){return Wi.setFromAxisAngle(e,t),this.quaternion.premultiply(Wi),this}rotateX(e){return this.rotateOnAxis(rc,e)}rotateY(e){return this.rotateOnAxis(ac,e)}rotateZ(e){return this.rotateOnAxis(oc,e)}translateOnAxis(e,t){return sc.copy(e).applyQuaternion(this.quaternion),this.position.add(sc.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(rc,e)}translateY(e){return this.translateOnAxis(ac,e)}translateZ(e){return this.translateOnAxis(oc,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Vn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?gr.copy(e):gr.set(e,t,n);const s=this.parent;this.updateWorldMatrix(!0,!1),ws.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Vn.lookAt(ws,gr,this.up):Vn.lookAt(gr,ws,this.up),this.quaternion.setFromRotationMatrix(Vn),s&&(Vn.extractRotation(s.matrixWorld),Wi.setFromRotationMatrix(Vn),this.quaternion.premultiply(Wi.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(lc),Xi.child=e,this.dispatchEvent(Xi),Xi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(qu),Da.child=e,this.dispatchEvent(Da),Da.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Vn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Vn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Vn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(lc),Xi.child=e,this.dispatchEvent(Xi),Xi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){const a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ws,e,Wu),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ws,Xu,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,d=l.length;c<d;c++){const f=l[c];r(e.shapes,f)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(e.materials,this.material[l]));s.material=o}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];s.animations.push(r(e.animations,l))}}if(t){const o=a(e.geometries),l=a(e.materials),c=a(e.textures),d=a(e.images),f=a(e.shapes),h=a(e.skeletons),u=a(e.animations),g=a(e.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),d.length>0&&(n.images=d),f.length>0&&(n.shapes=f),h.length>0&&(n.skeletons=h),u.length>0&&(n.animations=u),g.length>0&&(n.nodes=g)}return n.object=s,n;function a(o){const l=[];for(const c in o){const d=o[c];delete d.metadata,l.push(d)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const s=e.children[n];this.add(s.clone())}return this}}Rt.DEFAULT_UP=new D(0,1,0);Rt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Rt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const xn=new D,Gn=new D,Ua=new D,Wn=new D,qi=new D,$i=new D,cc=new D,Na=new D,Fa=new D,Oa=new D,Ba=new at,ka=new at,Ha=new at;class gn{constructor(e=new D,t=new D,n=new D){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),xn.subVectors(e,t),s.cross(xn);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){xn.subVectors(s,t),Gn.subVectors(n,t),Ua.subVectors(e,t);const a=xn.dot(xn),o=xn.dot(Gn),l=xn.dot(Ua),c=Gn.dot(Gn),d=Gn.dot(Ua),f=a*c-o*o;if(f===0)return r.set(0,0,0),null;const h=1/f,u=(c*l-o*d)*h,g=(a*d-o*l)*h;return r.set(1-u-g,g,u)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,Wn)===null?!1:Wn.x>=0&&Wn.y>=0&&Wn.x+Wn.y<=1}static getInterpolation(e,t,n,s,r,a,o,l){return this.getBarycoord(e,t,n,s,Wn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Wn.x),l.addScaledVector(a,Wn.y),l.addScaledVector(o,Wn.z),l)}static getInterpolatedAttribute(e,t,n,s,r,a){return Ba.setScalar(0),ka.setScalar(0),Ha.setScalar(0),Ba.fromBufferAttribute(e,t),ka.fromBufferAttribute(e,n),Ha.fromBufferAttribute(e,s),a.setScalar(0),a.addScaledVector(Ba,r.x),a.addScaledVector(ka,r.y),a.addScaledVector(Ha,r.z),a}static isFrontFacing(e,t,n,s){return xn.subVectors(n,t),Gn.subVectors(e,t),xn.cross(Gn).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return xn.subVectors(this.c,this.b),Gn.subVectors(this.a,this.b),xn.cross(Gn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return gn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return gn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return gn.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return gn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return gn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,s=this.b,r=this.c;let a,o;qi.subVectors(s,n),$i.subVectors(r,n),Na.subVectors(e,n);const l=qi.dot(Na),c=$i.dot(Na);if(l<=0&&c<=0)return t.copy(n);Fa.subVectors(e,s);const d=qi.dot(Fa),f=$i.dot(Fa);if(d>=0&&f<=d)return t.copy(s);const h=l*f-d*c;if(h<=0&&l>=0&&d<=0)return a=l/(l-d),t.copy(n).addScaledVector(qi,a);Oa.subVectors(e,r);const u=qi.dot(Oa),g=$i.dot(Oa);if(g>=0&&u<=g)return t.copy(r);const _=u*c-l*g;if(_<=0&&c>=0&&g<=0)return o=c/(c-g),t.copy(n).addScaledVector($i,o);const m=d*g-u*f;if(m<=0&&f-d>=0&&u-g>=0)return cc.subVectors(r,s),o=(f-d)/(f-d+(u-g)),t.copy(s).addScaledVector(cc,o);const p=1/(m+_+h);return a=_*p,o=h*p,t.copy(n).addScaledVector(qi,a).addScaledVector($i,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Bd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ai={h:0,s:0,l:0},_r={h:0,s:0,l:0};function za(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class Fe{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=un){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,je.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=je.workingColorSpace){return this.r=e,this.g=t,this.b=n,je.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=je.workingColorSpace){if(e=xl(e,1),t=Ke(t,0,1),n=Ke(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,a=2*n-r;this.r=za(a,r,e+1/3),this.g=za(a,r,e),this.b=za(a,r,e-1/3)}return je.colorSpaceToWorking(this,s),this}setStyle(e,t=un){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=un){const n=Bd[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Jn(e.r),this.g=Jn(e.g),this.b=Jn(e.b),this}copyLinearToSRGB(e){return this.r=ds(e.r),this.g=ds(e.g),this.b=ds(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=un){return je.workingToColorSpace(Bt.copy(this),e),Math.round(Ke(Bt.r*255,0,255))*65536+Math.round(Ke(Bt.g*255,0,255))*256+Math.round(Ke(Bt.b*255,0,255))}getHexString(e=un){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=je.workingColorSpace){je.workingToColorSpace(Bt.copy(this),t);const n=Bt.r,s=Bt.g,r=Bt.b,a=Math.max(n,s,r),o=Math.min(n,s,r);let l,c;const d=(o+a)/2;if(o===a)l=0,c=0;else{const f=a-o;switch(c=d<=.5?f/(a+o):f/(2-a-o),a){case n:l=(s-r)/f+(s<r?6:0);break;case s:l=(r-n)/f+2;break;case r:l=(n-s)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=d,e}getRGB(e,t=je.workingColorSpace){return je.workingToColorSpace(Bt.copy(this),t),e.r=Bt.r,e.g=Bt.g,e.b=Bt.b,e}getStyle(e=un){je.workingToColorSpace(Bt.copy(this),e);const t=Bt.r,n=Bt.g,s=Bt.b;return e!==un?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(ai),this.setHSL(ai.h+e,ai.s+t,ai.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(ai),e.getHSL(_r);const n=Hs(ai.h,_r.h,t),s=Hs(ai.s,_r.s,t),r=Hs(ai.l,_r.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Bt=new Fe;Fe.NAMES=Bd;let $u=0;class Fi extends vs{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:$u++}),this.uuid=jn(),this.name="",this.type="Material",this.blending=cs,this.side=ui,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=_o,this.blendDst=vo,this.blendEquation=Ti,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Fe(0,0,0),this.blendAlpha=0,this.depthFunc=us,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Kl,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Bi,this.stencilZFail=Bi,this.stencilZPass=Bi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==cs&&(n.blending=this.blending),this.side!==ui&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==_o&&(n.blendSrc=this.blendSrc),this.blendDst!==vo&&(n.blendDst=this.blendDst),this.blendEquation!==Ti&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==us&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Kl&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Bi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Bi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Bi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const a=[];for(const o in r){const l=r[o];delete l.metadata,a.push(l)}return a}if(t){const r=s(e.textures),a=s(e.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class xs extends Fi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Fe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Bn,this.combine=bd,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const bt=new D,vr=new Ae;let Yu=0;class an{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Yu++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=sl,this.updateRanges=[],this.gpuType=Un,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)vr.fromBufferAttribute(this,t),vr.applyMatrix3(e),this.setXY(t,vr.x,vr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)bt.fromBufferAttribute(this,t),bt.applyMatrix3(e),this.setXYZ(t,bt.x,bt.y,bt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)bt.fromBufferAttribute(this,t),bt.applyMatrix4(e),this.setXYZ(t,bt.x,bt.y,bt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)bt.fromBufferAttribute(this,t),bt.applyNormalMatrix(e),this.setXYZ(t,bt.x,bt.y,bt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)bt.fromBufferAttribute(this,t),bt.transformDirection(e),this.setXYZ(t,bt.x,bt.y,bt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Mn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=nt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Mn(t,this.array)),t}setX(e,t){return this.normalized&&(t=nt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Mn(t,this.array)),t}setY(e,t){return this.normalized&&(t=nt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Mn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=nt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Mn(t,this.array)),t}setW(e,t){return this.normalized&&(t=nt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array),s=nt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array),s=nt(s,this.array),r=nt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==sl&&(e.usage=this.usage),e}}class kd extends an{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Hd extends an{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class ct extends an{constructor(e,t,n){super(new Float32Array(e),t,n)}}let Ku=0;const dn=new ot,Va=new Rt,Yi=new D,en=new Ni,As=new Ni,Dt=new D;class Ft extends vs{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ku++}),this.uuid=jn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Fd(e)?Hd:kd)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new Ge().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return dn.makeRotationFromQuaternion(e),this.applyMatrix4(dn),this}rotateX(e){return dn.makeRotationX(e),this.applyMatrix4(dn),this}rotateY(e){return dn.makeRotationY(e),this.applyMatrix4(dn),this}rotateZ(e){return dn.makeRotationZ(e),this.applyMatrix4(dn),this}translate(e,t,n){return dn.makeTranslation(e,t,n),this.applyMatrix4(dn),this}scale(e,t,n){return dn.makeScale(e,t,n),this.applyMatrix4(dn),this}lookAt(e){return Va.lookAt(e),Va.updateMatrix(),this.applyMatrix4(Va.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Yi).negate(),this.translate(Yi.x,Yi.y,Yi.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let s=0,r=e.length;s<r;s++){const a=e[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ct(n,3))}else{const n=Math.min(e.length,t.count);for(let s=0;s<n;s++){const r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ni);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){const r=t[n];en.setFromBufferAttribute(r),this.morphTargetsRelative?(Dt.addVectors(this.boundingBox.min,en.min),this.boundingBox.expandByPoint(Dt),Dt.addVectors(this.boundingBox.max,en.max),this.boundingBox.expandByPoint(Dt)):(this.boundingBox.expandByPoint(en.min),this.boundingBox.expandByPoint(en.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ys);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(e){const n=this.boundingSphere.center;if(en.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const o=t[r];As.setFromBufferAttribute(o),this.morphTargetsRelative?(Dt.addVectors(en.min,As.min),en.expandByPoint(Dt),Dt.addVectors(en.max,As.max),en.expandByPoint(Dt)):(en.expandByPoint(As.min),en.expandByPoint(As.max))}en.getCenter(n);let s=0;for(let r=0,a=e.count;r<a;r++)Dt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Dt));if(t)for(let r=0,a=t.length;r<a;r++){const o=t[r],l=this.morphTargetsRelative;for(let c=0,d=o.count;c<d;c++)Dt.fromBufferAttribute(o,c),l&&(Yi.fromBufferAttribute(e,c),Dt.add(Yi)),s=Math.max(s,n.distanceToSquared(Dt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new an(new Float32Array(4*n.count),4));const a=this.getAttribute("tangent"),o=[],l=[];for(let L=0;L<n.count;L++)o[L]=new D,l[L]=new D;const c=new D,d=new D,f=new D,h=new Ae,u=new Ae,g=new Ae,_=new D,m=new D;function p(L,v,y){c.fromBufferAttribute(n,L),d.fromBufferAttribute(n,v),f.fromBufferAttribute(n,y),h.fromBufferAttribute(r,L),u.fromBufferAttribute(r,v),g.fromBufferAttribute(r,y),d.sub(c),f.sub(c),u.sub(h),g.sub(h);const C=1/(u.x*g.y-g.x*u.y);isFinite(C)&&(_.copy(d).multiplyScalar(g.y).addScaledVector(f,-u.y).multiplyScalar(C),m.copy(f).multiplyScalar(u.x).addScaledVector(d,-g.x).multiplyScalar(C),o[L].add(_),o[v].add(_),o[y].add(_),l[L].add(m),l[v].add(m),l[y].add(m))}let E=this.groups;E.length===0&&(E=[{start:0,count:e.count}]);for(let L=0,v=E.length;L<v;++L){const y=E[L],C=y.start,T=y.count;for(let B=C,U=C+T;B<U;B+=3)p(e.getX(B+0),e.getX(B+1),e.getX(B+2))}const b=new D,M=new D,R=new D,w=new D;function I(L){R.fromBufferAttribute(s,L),w.copy(R);const v=o[L];b.copy(v),b.sub(R.multiplyScalar(R.dot(v))).normalize(),M.crossVectors(w,v);const C=M.dot(l[L])<0?-1:1;a.setXYZW(L,b.x,b.y,b.z,C)}for(let L=0,v=E.length;L<v;++L){const y=E[L],C=y.start,T=y.count;for(let B=C,U=C+T;B<U;B+=3)I(e.getX(B+0)),I(e.getX(B+1)),I(e.getX(B+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new an(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let h=0,u=n.count;h<u;h++)n.setXYZ(h,0,0,0);const s=new D,r=new D,a=new D,o=new D,l=new D,c=new D,d=new D,f=new D;if(e)for(let h=0,u=e.count;h<u;h+=3){const g=e.getX(h+0),_=e.getX(h+1),m=e.getX(h+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,_),a.fromBufferAttribute(t,m),d.subVectors(a,r),f.subVectors(s,r),d.cross(f),o.fromBufferAttribute(n,g),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,m),o.add(d),l.add(d),c.add(d),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let h=0,u=t.count;h<u;h+=3)s.fromBufferAttribute(t,h+0),r.fromBufferAttribute(t,h+1),a.fromBufferAttribute(t,h+2),d.subVectors(a,r),f.subVectors(s,r),d.cross(f),n.setXYZ(h+0,d.x,d.y,d.z),n.setXYZ(h+1,d.x,d.y,d.z),n.setXYZ(h+2,d.x,d.y,d.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Dt.fromBufferAttribute(e,t),Dt.normalize(),e.setXYZ(t,Dt.x,Dt.y,Dt.z)}toNonIndexed(){function e(o,l){const c=o.array,d=o.itemSize,f=o.normalized,h=new c.constructor(l.length*d);let u=0,g=0;for(let _=0,m=l.length;_<m;_++){o.isInterleavedBufferAttribute?u=l[_]*o.data.stride+o.offset:u=l[_]*d;for(let p=0;p<d;p++)h[g++]=c[u++]}return new an(h,d,f)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Ft,n=this.index.array,s=this.attributes;for(const o in s){const l=s[o],c=e(l,n);t.setAttribute(o,c)}const r=this.morphAttributes;for(const o in r){const l=[],c=r[o];for(let d=0,f=c.length;d<f;d++){const h=c[d],u=e(h,n);l.push(u)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],d=[];for(let f=0,h=c.length;f<h;f++){const u=c[f];d.push(u.toJSON(e.data))}d.length>0&&(s[l]=d,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const s=e.attributes;for(const c in s){const d=s[c];this.setAttribute(c,d.clone(t))}const r=e.morphAttributes;for(const c in r){const d=[],f=r[c];for(let h=0,u=f.length;h<u;h++)d.push(f[h].clone(t));this.morphAttributes[c]=d}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let c=0,d=a.length;c<d;c++){const f=a[c];this.addGroup(f.start,f.count,f.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const dc=new ot,vi=new Sl,yr=new ys,hc=new D,xr=new D,Mr=new D,Sr=new D,Ga=new D,Er=new D,uc=new D,br=new D;class re extends Rt{constructor(e=new Ft,t=new xs){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(s,e);const o=this.morphTargetInfluences;if(r&&o){Er.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const d=o[l],f=r[l];d!==0&&(Ga.fromBufferAttribute(f,e),a?Er.addScaledVector(Ga,d):Er.addScaledVector(Ga.sub(t),d))}t.add(Er)}return t}raycast(e,t){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),yr.copy(n.boundingSphere),yr.applyMatrix4(r),vi.copy(e.ray).recast(e.near),!(yr.containsPoint(vi.origin)===!1&&(vi.intersectSphere(yr,hc)===null||vi.origin.distanceToSquared(hc)>(e.far-e.near)**2))&&(dc.copy(r).invert(),vi.copy(e.ray).applyMatrix4(dc),!(n.boundingBox!==null&&vi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,vi)))}_computeIntersections(e,t,n){let s;const r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,d=r.attributes.uv1,f=r.attributes.normal,h=r.groups,u=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,_=h.length;g<_;g++){const m=h[g],p=a[m.materialIndex],E=Math.max(m.start,u.start),b=Math.min(o.count,Math.min(m.start+m.count,u.start+u.count));for(let M=E,R=b;M<R;M+=3){const w=o.getX(M),I=o.getX(M+1),L=o.getX(M+2);s=Tr(this,p,e,n,c,d,f,w,I,L),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const g=Math.max(0,u.start),_=Math.min(o.count,u.start+u.count);for(let m=g,p=_;m<p;m+=3){const E=o.getX(m),b=o.getX(m+1),M=o.getX(m+2);s=Tr(this,a,e,n,c,d,f,E,b,M),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,_=h.length;g<_;g++){const m=h[g],p=a[m.materialIndex],E=Math.max(m.start,u.start),b=Math.min(l.count,Math.min(m.start+m.count,u.start+u.count));for(let M=E,R=b;M<R;M+=3){const w=M,I=M+1,L=M+2;s=Tr(this,p,e,n,c,d,f,w,I,L),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const g=Math.max(0,u.start),_=Math.min(l.count,u.start+u.count);for(let m=g,p=_;m<p;m+=3){const E=m,b=m+1,M=m+2;s=Tr(this,a,e,n,c,d,f,E,b,M),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}}function Zu(i,e,t,n,s,r,a,o){let l;if(e.side===Kt?l=n.intersectTriangle(a,r,s,!0,o):l=n.intersectTriangle(s,r,a,e.side===ui,o),l===null)return null;br.copy(o),br.applyMatrix4(i.matrixWorld);const c=t.ray.origin.distanceTo(br);return c<t.near||c>t.far?null:{distance:c,point:br.clone(),object:i}}function Tr(i,e,t,n,s,r,a,o,l,c){i.getVertexPosition(o,xr),i.getVertexPosition(l,Mr),i.getVertexPosition(c,Sr);const d=Zu(i,e,t,n,xr,Mr,Sr,uc);if(d){const f=new D;gn.getBarycoord(uc,xr,Mr,Sr,f),s&&(d.uv=gn.getInterpolatedAttribute(s,o,l,c,f,new Ae)),r&&(d.uv1=gn.getInterpolatedAttribute(r,o,l,c,f,new Ae)),a&&(d.normal=gn.getInterpolatedAttribute(a,o,l,c,f,new D),d.normal.dot(n.direction)>0&&d.normal.multiplyScalar(-1));const h={a:o,b:l,c,normal:new D,materialIndex:0};gn.getNormal(xr,Mr,Sr,h.normal),d.face=h,d.barycoord=f}return d}class Zt extends Ft{constructor(e=1,t=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};const o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);const l=[],c=[],d=[],f=[];let h=0,u=0;g("z","y","x",-1,-1,n,t,e,a,r,0),g("z","y","x",1,-1,n,t,-e,a,r,1),g("x","z","y",1,1,e,n,t,s,a,2),g("x","z","y",1,-1,e,n,-t,s,a,3),g("x","y","z",1,-1,e,t,n,s,r,4),g("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new ct(c,3)),this.setAttribute("normal",new ct(d,3)),this.setAttribute("uv",new ct(f,2));function g(_,m,p,E,b,M,R,w,I,L,v){const y=M/I,C=R/L,T=M/2,B=R/2,U=w/2,F=I+1,N=L+1;let W=0,V=0;const j=new D;for(let ee=0;ee<N;ee++){const ce=ee*C-B;for(let Ee=0;Ee<F;Ee++){const He=Ee*y-T;j[_]=He*E,j[m]=ce*b,j[p]=U,c.push(j.x,j.y,j.z),j[_]=0,j[m]=0,j[p]=w>0?1:-1,d.push(j.x,j.y,j.z),f.push(Ee/I),f.push(1-ee/L),W+=1}}for(let ee=0;ee<L;ee++)for(let ce=0;ce<I;ce++){const Ee=h+ce+F*ee,He=h+ce+F*(ee+1),Qe=h+(ce+1)+F*(ee+1),Q=h+(ce+1)+F*ee;l.push(Ee,He,Q),l.push(He,Qe,Q),V+=6}o.addGroup(u,V,v),u+=V,h+=W}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Zt(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function gs(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const s=i[t][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone():Array.isArray(s)?e[t][n]=s.slice():e[t][n]=s}}return e}function Gt(i){const e={};for(let t=0;t<i.length;t++){const n=gs(i[t]);for(const s in n)e[s]=n[s]}return e}function ju(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function zd(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:je.workingColorSpace}const sa={clone:gs,merge:Gt};var Ju=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Qu=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Yt extends Fi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Ju,this.fragmentShader=Qu,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=gs(e.uniforms),this.uniformsGroups=ju(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const s in this.uniforms){const a=this.uniforms[s].value;a&&a.isTexture?t.uniforms[s]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[s]={type:"m4",value:a.toArray()}:t.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class Vd extends Rt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ot,this.projectionMatrix=new ot,this.projectionMatrixInverse=new ot,this.coordinateSystem=Nn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const oi=new D,fc=new Ae,pc=new Ae;class nn extends Vd{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Ys*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(ks*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Ys*2*Math.atan(Math.tan(ks*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){oi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(oi.x,oi.y).multiplyScalar(-e/oi.z),oi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(oi.x,oi.y).multiplyScalar(-e/oi.z)}getViewSize(e,t){return this.getViewBounds(e,fc,pc),t.subVectors(pc,fc)}setViewOffset(e,t,n,s,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(ks*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,t-=a.offsetY*n/c,s*=a.width/l,n*=a.height/c}const o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const Ki=-90,Zi=1;class ef extends Rt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new nn(Ki,Zi,e,t);s.layers=this.layers,this.add(s);const r=new nn(Ki,Zi,e,t);r.layers=this.layers,this.add(r);const a=new nn(Ki,Zi,e,t);a.layers=this.layers,this.add(a);const o=new nn(Ki,Zi,e,t);o.layers=this.layers,this.add(o);const l=new nn(Ki,Zi,e,t);l.layers=this.layers,this.add(l);const c=new nn(Ki,Zi,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,s,r,a,o,l]=t;for(const c of t)this.remove(c);if(e===Nn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===na)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,a,o,l,c,d]=this.children,f=e.getRenderTarget(),h=e.getActiveCubeFace(),u=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,s),e.render(t,r),e.setRenderTarget(n,1,s),e.render(t,a),e.setRenderTarget(n,2,s),e.render(t,o),e.setRenderTarget(n,3,s),e.render(t,l),e.setRenderTarget(n,4,s),e.render(t,c),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,s),e.render(t,d),e.setRenderTarget(f,h,u),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class Gd extends kt{constructor(e=[],t=fs,n,s,r,a,o,l,c,d){super(e,t,n,s,r,a,o,l,c,d),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class tf extends Tn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new Gd(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Zt(5,5,5),r=new Yt({name:"CubemapFromEquirect",uniforms:gs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Kt,blending:Kn});r.uniforms.tEquirect.value=t;const a=new re(s,r),o=t.minFilter;return t.minFilter===Pi&&(t.minFilter=Sn),new ef(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){const r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,s);e.setRenderTarget(r)}}class mt extends Rt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const nf={type:"move"};class Wa{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new mt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new mt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new mt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(const _ of e.hand.values()){const m=t.getJointPose(_,n),p=this._getHandJoint(c,_);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const d=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],h=d.position.distanceTo(f.position),u=.02,g=.005;c.inputState.pinching&&h>u+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&h<=u-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(nf)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new mt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class bl{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new Fe(e),this.density=t}clone(){return new bl(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class sf extends Rt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Bn,this.environmentIntensity=1,this.environmentRotation=new Bn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class rf{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=sl,this.updateRanges=[],this.version=0,this.uuid=jn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=jn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=jn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Vt=new D;class ra{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Vt.fromBufferAttribute(this,t),Vt.applyMatrix4(e),this.setXYZ(t,Vt.x,Vt.y,Vt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Vt.fromBufferAttribute(this,t),Vt.applyNormalMatrix(e),this.setXYZ(t,Vt.x,Vt.y,Vt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Vt.fromBufferAttribute(this,t),Vt.transformDirection(e),this.setXYZ(t,Vt.x,Vt.y,Vt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Mn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=nt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=nt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=nt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=nt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=nt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Mn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Mn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Mn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Mn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array),s=nt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=nt(t,this.array),n=nt(n,this.array),s=nt(s,this.array),r=nt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new an(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new ra(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}class Wd extends Fi{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Fe(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let ji;const Cs=new D,Ji=new D,Qi=new D,es=new Ae,Rs=new Ae,Xd=new ot,wr=new D,Ps=new D,Ar=new D,mc=new Ae,Xa=new Ae,gc=new Ae;class af extends Rt{constructor(e=new Wd){if(super(),this.isSprite=!0,this.type="Sprite",ji===void 0){ji=new Ft;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new rf(t,5);ji.setIndex([0,1,2,0,2,3]),ji.setAttribute("position",new ra(n,3,0,!1)),ji.setAttribute("uv",new ra(n,2,3,!1))}this.geometry=ji,this.material=e,this.center=new Ae(.5,.5),this.count=1}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),Ji.setFromMatrixScale(this.matrixWorld),Xd.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),Qi.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Ji.multiplyScalar(-Qi.z);const n=this.material.rotation;let s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));const a=this.center;Cr(wr.set(-.5,-.5,0),Qi,a,Ji,s,r),Cr(Ps.set(.5,-.5,0),Qi,a,Ji,s,r),Cr(Ar.set(.5,.5,0),Qi,a,Ji,s,r),mc.set(0,0),Xa.set(1,0),gc.set(1,1);let o=e.ray.intersectTriangle(wr,Ps,Ar,!1,Cs);if(o===null&&(Cr(Ps.set(-.5,.5,0),Qi,a,Ji,s,r),Xa.set(0,1),o=e.ray.intersectTriangle(wr,Ar,Ps,!1,Cs),o===null))return;const l=e.ray.origin.distanceTo(Cs);l<e.near||l>e.far||t.push({distance:l,point:Cs.clone(),uv:gn.getInterpolation(Cs,wr,Ps,Ar,mc,Xa,gc,new Ae),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function Cr(i,e,t,n,s,r){es.subVectors(i,t).addScalar(.5).multiply(n),s!==void 0?(Rs.x=r*es.x-s*es.y,Rs.y=s*es.x+r*es.y):Rs.copy(es),i.copy(e),i.x+=Rs.x,i.y+=Rs.y,i.applyMatrix4(Xd)}class of extends kt{constructor(e=null,t=1,n=1,s,r,a,o,l,c=rn,d=rn,f,h){super(null,a,o,l,c,d,s,r,f,h),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class _c extends an{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const ts=new ot,vc=new ot,Rr=[],yc=new Ni,lf=new ot,Is=new re,Ls=new ys;class ua extends re{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new _c(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,lf)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Ni),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ts),yc.copy(e.boundingBox).applyMatrix4(ts),this.boundingBox.union(yc)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new ys),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ts),Ls.copy(e.boundingSphere).applyMatrix4(ts),this.boundingSphere.union(Ls)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=e*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(e,t){const n=this.matrixWorld,s=this.count;if(Is.geometry=this.geometry,Is.material=this.material,Is.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ls.copy(this.boundingSphere),Ls.applyMatrix4(n),e.ray.intersectsSphere(Ls)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,ts),vc.multiplyMatrices(n,ts),Is.matrixWorld=vc,Is.raycast(e,Rr);for(let a=0,o=Rr.length;a<o;a++){const l=Rr[a];l.instanceId=r,l.object=this,t.push(l)}Rr.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new _c(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new of(new Float32Array(s*this.count),s,this.count,gl,Un));const r=this.morphTexture.source.data.data;let a=0;for(let c=0;c<n.length;c++)a+=n[c];const o=this.geometry.morphTargetsRelative?1:1-a,l=s*e;r[l]=o,r.set(n,l+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const qa=new D,cf=new D,df=new Ge;class li{constructor(e=new D(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const s=qa.subVectors(n,t).cross(cf.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(qa),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||df.getNormalMatrix(e),s=this.coplanarPoint(qa).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const yi=new ys,hf=new Ae(.5,.5),Pr=new D;class Tl{constructor(e=new li,t=new li,n=new li,s=new li,r=new li,a=new li){this.planes=[e,t,n,s,r,a]}set(e,t,n,s,r,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Nn,n=!1){const s=this.planes,r=e.elements,a=r[0],o=r[1],l=r[2],c=r[3],d=r[4],f=r[5],h=r[6],u=r[7],g=r[8],_=r[9],m=r[10],p=r[11],E=r[12],b=r[13],M=r[14],R=r[15];if(s[0].setComponents(c-a,u-d,p-g,R-E).normalize(),s[1].setComponents(c+a,u+d,p+g,R+E).normalize(),s[2].setComponents(c+o,u+f,p+_,R+b).normalize(),s[3].setComponents(c-o,u-f,p-_,R-b).normalize(),n)s[4].setComponents(l,h,m,M).normalize(),s[5].setComponents(c-l,u-h,p-m,R-M).normalize();else if(s[4].setComponents(c-l,u-h,p-m,R-M).normalize(),t===Nn)s[5].setComponents(c+l,u+h,p+m,R+M).normalize();else if(t===na)s[5].setComponents(l,h,m,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),yi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),yi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(yi)}intersectsSprite(e){yi.center.set(0,0,0);const t=hf.distanceTo(e.center);return yi.radius=.7071067811865476+t,yi.applyMatrix4(e.matrixWorld),this.intersectsSphere(yi)}intersectsSphere(e){const t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const s=t[n];if(Pr.x=s.normal.x>0?e.max.x:e.min.x,Pr.y=s.normal.y>0?e.max.y:e.min.y,Pr.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Pr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class qd extends Fi{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Fe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const xc=new ot,rl=new Sl,Ir=new ys,Lr=new D;class uf extends Rt{constructor(e=new Ft,t=new qd){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ir.copy(n.boundingSphere),Ir.applyMatrix4(s),Ir.radius+=r,e.ray.intersectsSphere(Ir)===!1)return;xc.copy(s).invert(),rl.copy(e.ray).applyMatrix4(xc);const o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=n.index,f=n.attributes.position;if(c!==null){const h=Math.max(0,a.start),u=Math.min(c.count,a.start+a.count);for(let g=h,_=u;g<_;g++){const m=c.getX(g);Lr.fromBufferAttribute(f,m),Mc(Lr,m,l,s,e,t,this)}}else{const h=Math.max(0,a.start),u=Math.min(f.count,a.start+a.count);for(let g=h,_=u;g<_;g++)Lr.fromBufferAttribute(f,g),Mc(Lr,g,l,s,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}}function Mc(i,e,t,n,s,r,a){const o=rl.distanceSqToPoint(i);if(o<t){const l=new D;rl.closestPointToPoint(i,l),l.applyMatrix4(n);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}class ff extends kt{constructor(e,t,n,s,r,a,o,l,c){super(e,t,n,s,r,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class $d extends kt{constructor(e,t,n=Di,s,r,a,o=rn,l=rn,c,d=qs,f=1){if(d!==qs&&d!==$s)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const h={width:e,height:t,depth:f};super(h,s,r,a,o,l,d,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ml(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Yd extends kt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class wl extends Ft{constructor(e=1,t=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:s},t=Math.max(3,t);const r=[],a=[],o=[],l=[],c=new D,d=new Ae;a.push(0,0,0),o.push(0,0,1),l.push(.5,.5);for(let f=0,h=3;f<=t;f++,h+=3){const u=n+f/t*s;c.x=e*Math.cos(u),c.y=e*Math.sin(u),a.push(c.x,c.y,c.z),o.push(0,0,1),d.x=(a[h]/e+1)/2,d.y=(a[h+1]/e+1)/2,l.push(d.x,d.y)}for(let f=1;f<=t;f++)r.push(f,f+1,0);this.setIndex(r),this.setAttribute("position",new ct(a,3)),this.setAttribute("normal",new ct(o,3)),this.setAttribute("uv",new ct(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new wl(e.radius,e.segments,e.thetaStart,e.thetaLength)}}class ti extends Ft{constructor(e=1,t=1,n=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};const c=this;s=Math.floor(s),r=Math.floor(r);const d=[],f=[],h=[],u=[];let g=0;const _=[],m=n/2;let p=0;E(),a===!1&&(e>0&&b(!0),t>0&&b(!1)),this.setIndex(d),this.setAttribute("position",new ct(f,3)),this.setAttribute("normal",new ct(h,3)),this.setAttribute("uv",new ct(u,2));function E(){const M=new D,R=new D;let w=0;const I=(t-e)/n;for(let L=0;L<=r;L++){const v=[],y=L/r,C=y*(t-e)+e;for(let T=0;T<=s;T++){const B=T/s,U=B*l+o,F=Math.sin(U),N=Math.cos(U);R.x=C*F,R.y=-y*n+m,R.z=C*N,f.push(R.x,R.y,R.z),M.set(F,I,N).normalize(),h.push(M.x,M.y,M.z),u.push(B,1-y),v.push(g++)}_.push(v)}for(let L=0;L<s;L++)for(let v=0;v<r;v++){const y=_[v][L],C=_[v+1][L],T=_[v+1][L+1],B=_[v][L+1];(e>0||v!==0)&&(d.push(y,C,B),w+=3),(t>0||v!==r-1)&&(d.push(C,T,B),w+=3)}c.addGroup(p,w,0),p+=w}function b(M){const R=g,w=new Ae,I=new D;let L=0;const v=M===!0?e:t,y=M===!0?1:-1;for(let T=1;T<=s;T++)f.push(0,m*y,0),h.push(0,y,0),u.push(.5,.5),g++;const C=g;for(let T=0;T<=s;T++){const U=T/s*l+o,F=Math.cos(U),N=Math.sin(U);I.x=v*N,I.y=m*y,I.z=v*F,f.push(I.x,I.y,I.z),h.push(0,y,0),w.x=F*.5+.5,w.y=N*.5*y+.5,u.push(w.x,w.y),g++}for(let T=0;T<s;T++){const B=R+T,U=C+T;M===!0?d.push(U,U+1,B):d.push(U+1,U,B),L+=3}c.addGroup(p,L,M===!0?1:2),p+=L}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ti(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Al extends Ft{constructor(e=[],t=[],n=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:n,detail:s};const r=[],a=[];o(s),c(n),d(),this.setAttribute("position",new ct(r,3)),this.setAttribute("normal",new ct(r.slice(),3)),this.setAttribute("uv",new ct(a,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function o(E){const b=new D,M=new D,R=new D;for(let w=0;w<t.length;w+=3)u(t[w+0],b),u(t[w+1],M),u(t[w+2],R),l(b,M,R,E)}function l(E,b,M,R){const w=R+1,I=[];for(let L=0;L<=w;L++){I[L]=[];const v=E.clone().lerp(M,L/w),y=b.clone().lerp(M,L/w),C=w-L;for(let T=0;T<=C;T++)T===0&&L===w?I[L][T]=v:I[L][T]=v.clone().lerp(y,T/C)}for(let L=0;L<w;L++)for(let v=0;v<2*(w-L)-1;v++){const y=Math.floor(v/2);v%2===0?(h(I[L][y+1]),h(I[L+1][y]),h(I[L][y])):(h(I[L][y+1]),h(I[L+1][y+1]),h(I[L+1][y]))}}function c(E){const b=new D;for(let M=0;M<r.length;M+=3)b.x=r[M+0],b.y=r[M+1],b.z=r[M+2],b.normalize().multiplyScalar(E),r[M+0]=b.x,r[M+1]=b.y,r[M+2]=b.z}function d(){const E=new D;for(let b=0;b<r.length;b+=3){E.x=r[b+0],E.y=r[b+1],E.z=r[b+2];const M=m(E)/2/Math.PI+.5,R=p(E)/Math.PI+.5;a.push(M,1-R)}g(),f()}function f(){for(let E=0;E<a.length;E+=6){const b=a[E+0],M=a[E+2],R=a[E+4],w=Math.max(b,M,R),I=Math.min(b,M,R);w>.9&&I<.1&&(b<.2&&(a[E+0]+=1),M<.2&&(a[E+2]+=1),R<.2&&(a[E+4]+=1))}}function h(E){r.push(E.x,E.y,E.z)}function u(E,b){const M=E*3;b.x=e[M+0],b.y=e[M+1],b.z=e[M+2]}function g(){const E=new D,b=new D,M=new D,R=new D,w=new Ae,I=new Ae,L=new Ae;for(let v=0,y=0;v<r.length;v+=9,y+=6){E.set(r[v+0],r[v+1],r[v+2]),b.set(r[v+3],r[v+4],r[v+5]),M.set(r[v+6],r[v+7],r[v+8]),w.set(a[y+0],a[y+1]),I.set(a[y+2],a[y+3]),L.set(a[y+4],a[y+5]),R.copy(E).add(b).add(M).divideScalar(3);const C=m(R);_(w,y+0,E,C),_(I,y+2,b,C),_(L,y+4,M,C)}}function _(E,b,M,R){R<0&&E.x===1&&(a[b]=E.x-1),M.x===0&&M.z===0&&(a[b]=R/2/Math.PI+.5)}function m(E){return Math.atan2(E.z,-E.x)}function p(E){return Math.atan2(-E.y,Math.sqrt(E.x*E.x+E.z*E.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Al(e.vertices,e.indices,e.radius,e.details)}}class Cl extends Al{constructor(e=1,t=0){const n=(1+Math.sqrt(5))/2,s=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(s,r,e,t),this.type="IcosahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Cl(e.radius,e.detail)}}class An extends Ft{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};const r=e/2,a=t/2,o=Math.floor(n),l=Math.floor(s),c=o+1,d=l+1,f=e/o,h=t/l,u=[],g=[],_=[],m=[];for(let p=0;p<d;p++){const E=p*h-a;for(let b=0;b<c;b++){const M=b*f-r;g.push(M,-E,0),_.push(0,0,1),m.push(b/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let E=0;E<o;E++){const b=E+c*p,M=E+c*(p+1),R=E+1+c*(p+1),w=E+1+c*p;u.push(b,M,w),u.push(M,R,w)}this.setIndex(u),this.setAttribute("position",new ct(g,3)),this.setAttribute("normal",new ct(_,3)),this.setAttribute("uv",new ct(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new An(e.width,e.height,e.widthSegments,e.heightSegments)}}class sr extends Ft{constructor(e=.5,t=1,n=32,s=1,r=0,a=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:s,thetaStart:r,thetaLength:a},n=Math.max(3,n),s=Math.max(1,s);const o=[],l=[],c=[],d=[];let f=e;const h=(t-e)/s,u=new D,g=new Ae;for(let _=0;_<=s;_++){for(let m=0;m<=n;m++){const p=r+m/n*a;u.x=f*Math.cos(p),u.y=f*Math.sin(p),l.push(u.x,u.y,u.z),c.push(0,0,1),g.x=(u.x/t+1)/2,g.y=(u.y/t+1)/2,d.push(g.x,g.y)}f+=h}for(let _=0;_<s;_++){const m=_*(n+1);for(let p=0;p<n;p++){const E=p+m,b=E,M=E+n+1,R=E+n+2,w=E+1;o.push(b,M,w),o.push(M,R,w)}}this.setIndex(o),this.setAttribute("position",new ct(l,3)),this.setAttribute("normal",new ct(c,3)),this.setAttribute("uv",new ct(d,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new sr(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}}class Rl extends Ft{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(a+o,Math.PI);let c=0;const d=[],f=new D,h=new D,u=[],g=[],_=[],m=[];for(let p=0;p<=n;p++){const E=[],b=p/n;let M=0;p===0&&a===0?M=.5/t:p===n&&l===Math.PI&&(M=-.5/t);for(let R=0;R<=t;R++){const w=R/t;f.x=-e*Math.cos(s+w*r)*Math.sin(a+b*o),f.y=e*Math.cos(a+b*o),f.z=e*Math.sin(s+w*r)*Math.sin(a+b*o),g.push(f.x,f.y,f.z),h.copy(f).normalize(),_.push(h.x,h.y,h.z),m.push(w+M,1-b),E.push(c++)}d.push(E)}for(let p=0;p<n;p++)for(let E=0;E<t;E++){const b=d[p][E+1],M=d[p][E],R=d[p+1][E],w=d[p+1][E+1];(p!==0||a>0)&&u.push(b,M,w),(p!==n-1||l<Math.PI)&&u.push(M,R,w)}this.setIndex(u),this.setAttribute("position",new ct(g,3)),this.setAttribute("normal",new ct(_,3)),this.setAttribute("uv",new ct(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Rl(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class fa extends Ft{constructor(e=1,t=.4,n=12,s=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:s,arc:r},n=Math.floor(n),s=Math.floor(s);const a=[],o=[],l=[],c=[],d=new D,f=new D,h=new D;for(let u=0;u<=n;u++)for(let g=0;g<=s;g++){const _=g/s*r,m=u/n*Math.PI*2;f.x=(e+t*Math.cos(m))*Math.cos(_),f.y=(e+t*Math.cos(m))*Math.sin(_),f.z=t*Math.sin(m),o.push(f.x,f.y,f.z),d.x=e*Math.cos(_),d.y=e*Math.sin(_),h.subVectors(f,d).normalize(),l.push(h.x,h.y,h.z),c.push(g/s),c.push(u/n)}for(let u=1;u<=n;u++)for(let g=1;g<=s;g++){const _=(s+1)*u+g-1,m=(s+1)*(u-1)+g-1,p=(s+1)*(u-1)+g,E=(s+1)*u+g;a.push(_,m,E),a.push(m,p,E)}this.setIndex(a),this.setAttribute("position",new ct(o,3)),this.setAttribute("normal",new ct(l,3)),this.setAttribute("uv",new ct(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new fa(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class Je extends Fi{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Fe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Fe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ud,this.normalScale=new Ae(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Bn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class pf extends Fi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=ru,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class mf extends Fi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class Pl extends Rt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Fe(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class gf extends Pl{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Rt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Fe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const $a=new ot,Sc=new D,Ec=new D;class Kd{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ae(512,512),this.mapType=On,this.map=null,this.mapPass=null,this.matrix=new ot,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Tl,this._frameExtents=new Ae(1,1),this._viewportCount=1,this._viewports=[new at(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Sc.setFromMatrixPosition(e.matrixWorld),t.position.copy(Sc),Ec.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Ec),t.updateMatrixWorld(),$a.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix($a,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply($a)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const bc=new ot,Ds=new D,Ya=new D;class _f extends Kd{constructor(){super(new nn(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new Ae(4,2),this._viewportCount=6,this._viewports=[new at(2,1,1,1),new at(0,1,1,1),new at(3,1,1,1),new at(1,1,1,1),new at(3,0,1,1),new at(1,0,1,1)],this._cubeDirections=[new D(1,0,0),new D(-1,0,0),new D(0,0,1),new D(0,0,-1),new D(0,1,0),new D(0,-1,0)],this._cubeUps=[new D(0,1,0),new D(0,1,0),new D(0,1,0),new D(0,1,0),new D(0,0,1),new D(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,s=this.matrix,r=e.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),Ds.setFromMatrixPosition(e.matrixWorld),n.position.copy(Ds),Ya.copy(n.position),Ya.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Ya),n.updateMatrixWorld(),s.makeTranslation(-Ds.x,-Ds.y,-Ds.z),bc.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(bc,n.coordinateSystem,n.reversedDepth)}}class Il extends Pl{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new _f}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class pa extends Vd{constructor(e=-1,t=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-e,a=n+e,o=s+t,l=s-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,d=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=d*this.view.offsetY,l=o-d*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class vf extends Kd{constructor(){super(new pa(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class yf extends Pl{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Rt.DEFAULT_UP),this.updateMatrix(),this.target=new Rt,this.shadow=new vf}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class xf extends nn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Mf{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const Tc=new ot;class Sf{constructor(e,t,n=0,s=1/0){this.ray=new Sl(e,t),this.near=n,this.far=s,this.camera=null,this.layers=new El,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Tc.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Tc),this}intersectObject(e,t=!0,n=[]){return al(e,this,n,t),n.sort(wc),n}intersectObjects(e,t=!0,n=[]){for(let s=0,r=e.length;s<r;s++)al(e[s],this,n,t);return n.sort(wc),n}}function wc(i,e){return i.distance-e.distance}function al(i,e,t,n){let s=!0;if(i.layers.test(e.layers)&&i.raycast(e,t)===!1&&(s=!1),s===!0&&n===!0){const r=i.children;for(let a=0,o=r.length;a<o;a++)al(r[a],e,t,!0)}}function Ac(i,e,t,n){const s=Ef(n);switch(t){case Id:return i*e;case gl:return i*e/s.components*s.byteLength;case _l:return i*e/s.components*s.byteLength;case Dd:return i*e*2/s.components*s.byteLength;case vl:return i*e*2/s.components*s.byteLength;case Ld:return i*e*3/s.components*s.byteLength;case En:return i*e*4/s.components*s.byteLength;case yl:return i*e*4/s.components*s.byteLength;case Wr:case Xr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case qr:case $r:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Io:case Do:return Math.max(i,16)*Math.max(e,8)/4;case Po:case Lo:return Math.max(i,8)*Math.max(e,8)/2;case Uo:case No:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Fo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Oo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Bo:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case ko:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Ho:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case zo:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Vo:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Go:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Wo:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Xo:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case qo:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case $o:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Yo:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Ko:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Zo:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case jo:case Jo:case Qo:return Math.ceil(i/4)*Math.ceil(e/4)*16;case el:case tl:return Math.ceil(i/4)*Math.ceil(e/4)*8;case nl:case il:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Ef(i){switch(i){case On:case Ad:return{byteLength:1,components:1};case Ws:case Cd:case Zn:return{byteLength:2,components:1};case pl:case ml:return{byteLength:2,components:4};case Di:case fl:case Un:return{byteLength:4,components:1};case Rd:case Pd:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:ul}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=ul);function Zd(){let i=null,e=!1,t=null,n=null;function s(r,a){t(r,a),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function bf(i){const e=new WeakMap;function t(o,l){const c=o.array,d=o.usage,f=c.byteLength,h=i.createBuffer();i.bindBuffer(l,h),i.bufferData(l,c,d),o.onUploadCallback();let u;if(c instanceof Float32Array)u=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)u=i.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?u=i.HALF_FLOAT:u=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)u=i.SHORT;else if(c instanceof Uint32Array)u=i.UNSIGNED_INT;else if(c instanceof Int32Array)u=i.INT;else if(c instanceof Int8Array)u=i.BYTE;else if(c instanceof Uint8Array)u=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)u=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:h,type:u,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:f}}function n(o,l,c){const d=l.array,f=l.updateRanges;if(i.bindBuffer(c,o),f.length===0)i.bufferSubData(c,0,d);else{f.sort((u,g)=>u.start-g.start);let h=0;for(let u=1;u<f.length;u++){const g=f[h],_=f[u];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++h,f[h]=_)}f.length=h+1;for(let u=0,g=f.length;u<g;u++){const _=f[u];i.bufferSubData(c,_.start*d.BYTES_PER_ELEMENT,d,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=e.get(o);l&&(i.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const d=e.get(o);(!d||d.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var Tf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,wf=`#ifdef USE_ALPHAHASH
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
#endif`,Af=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Cf=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Rf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Pf=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,If=`#ifdef USE_AOMAP
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
#endif`,Lf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Df=`#ifdef USE_BATCHING
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
#endif`,Uf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Nf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Ff=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Of=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Bf=`#ifdef USE_IRIDESCENCE
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
#endif`,kf=`#ifdef USE_BUMPMAP
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
#endif`,Hf=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,zf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Vf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Gf=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Wf=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Xf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,qf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,$f=`#if defined( USE_COLOR_ALPHA )
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
#endif`,Yf=`#define PI 3.141592653589793
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
} // validated`,Kf=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Zf=`vec3 transformedNormal = objectNormal;
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
#endif`,jf=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Jf=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Qf=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ep=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,tp="gl_FragColor = linearToOutputTexel( gl_FragColor );",np=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,ip=`#ifdef USE_ENVMAP
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
#endif`,sp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,rp=`#ifdef USE_ENVMAP
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
#endif`,ap=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,op=`#ifdef USE_ENVMAP
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
#endif`,lp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,cp=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,dp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,hp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,up=`#ifdef USE_GRADIENTMAP
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
}`,fp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,pp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,mp=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,gp=`uniform bool receiveShadow;
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
#endif`,_p=`#ifdef USE_ENVMAP
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
#endif`,vp=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,yp=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,xp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Mp=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Sp=`PhysicalMaterial material;
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
#endif`,Ep=`struct PhysicalMaterial {
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
}`,bp=`
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
#endif`,Tp=`#if defined( RE_IndirectDiffuse )
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
#endif`,wp=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ap=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Cp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Rp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Pp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Ip=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Lp=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Dp=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Up=`#if defined( USE_POINTS_UV )
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
#endif`,Np=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Fp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Op=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Bp=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,kp=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Hp=`#ifdef USE_MORPHTARGETS
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
#endif`,zp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Vp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Gp=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Wp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Xp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,qp=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,$p=`#ifdef USE_NORMALMAP
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
#endif`,Yp=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Kp=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Zp=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,jp=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Jp=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Qp=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,em=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,tm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,nm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,im=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,sm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,rm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,am=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,om=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,lm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,cm=`float getShadowMask() {
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
}`,dm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,hm=`#ifdef USE_SKINNING
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
#endif`,um=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,fm=`#ifdef USE_SKINNING
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
#endif`,pm=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,mm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,gm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,_m=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,vm=`#ifdef USE_TRANSMISSION
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
#endif`,ym=`#ifdef USE_TRANSMISSION
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
#endif`,xm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Mm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Sm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Em=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const bm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Tm=`uniform sampler2D t2D;
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
}`,wm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Am=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Cm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Rm=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Pm=`#include <common>
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
}`,Im=`#if DEPTH_PACKING == 3200
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
}`,Lm=`#define DISTANCE
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
}`,Dm=`#define DISTANCE
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
}`,Um=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Nm=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Fm=`uniform float scale;
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
}`,Om=`uniform vec3 diffuse;
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
}`,Bm=`#include <common>
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
}`,km=`uniform vec3 diffuse;
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
}`,Hm=`#define LAMBERT
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
}`,zm=`#define LAMBERT
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
}`,Vm=`#define MATCAP
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
}`,Gm=`#define MATCAP
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
}`,Wm=`#define NORMAL
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
}`,Xm=`#define NORMAL
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
}`,qm=`#define PHONG
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
}`,$m=`#define PHONG
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
}`,Ym=`#define STANDARD
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
}`,Km=`#define STANDARD
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
}`,Zm=`#define TOON
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
}`,jm=`#define TOON
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
}`,Jm=`uniform float size;
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
}`,Qm=`uniform vec3 diffuse;
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
}`,eg=`#include <common>
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
}`,tg=`uniform vec3 color;
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
}`,ng=`uniform float rotation;
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
}`,ig=`uniform vec3 diffuse;
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
}`,Xe={alphahash_fragment:Tf,alphahash_pars_fragment:wf,alphamap_fragment:Af,alphamap_pars_fragment:Cf,alphatest_fragment:Rf,alphatest_pars_fragment:Pf,aomap_fragment:If,aomap_pars_fragment:Lf,batching_pars_vertex:Df,batching_vertex:Uf,begin_vertex:Nf,beginnormal_vertex:Ff,bsdfs:Of,iridescence_fragment:Bf,bumpmap_pars_fragment:kf,clipping_planes_fragment:Hf,clipping_planes_pars_fragment:zf,clipping_planes_pars_vertex:Vf,clipping_planes_vertex:Gf,color_fragment:Wf,color_pars_fragment:Xf,color_pars_vertex:qf,color_vertex:$f,common:Yf,cube_uv_reflection_fragment:Kf,defaultnormal_vertex:Zf,displacementmap_pars_vertex:jf,displacementmap_vertex:Jf,emissivemap_fragment:Qf,emissivemap_pars_fragment:ep,colorspace_fragment:tp,colorspace_pars_fragment:np,envmap_fragment:ip,envmap_common_pars_fragment:sp,envmap_pars_fragment:rp,envmap_pars_vertex:ap,envmap_physical_pars_fragment:_p,envmap_vertex:op,fog_vertex:lp,fog_pars_vertex:cp,fog_fragment:dp,fog_pars_fragment:hp,gradientmap_pars_fragment:up,lightmap_pars_fragment:fp,lights_lambert_fragment:pp,lights_lambert_pars_fragment:mp,lights_pars_begin:gp,lights_toon_fragment:vp,lights_toon_pars_fragment:yp,lights_phong_fragment:xp,lights_phong_pars_fragment:Mp,lights_physical_fragment:Sp,lights_physical_pars_fragment:Ep,lights_fragment_begin:bp,lights_fragment_maps:Tp,lights_fragment_end:wp,logdepthbuf_fragment:Ap,logdepthbuf_pars_fragment:Cp,logdepthbuf_pars_vertex:Rp,logdepthbuf_vertex:Pp,map_fragment:Ip,map_pars_fragment:Lp,map_particle_fragment:Dp,map_particle_pars_fragment:Up,metalnessmap_fragment:Np,metalnessmap_pars_fragment:Fp,morphinstance_vertex:Op,morphcolor_vertex:Bp,morphnormal_vertex:kp,morphtarget_pars_vertex:Hp,morphtarget_vertex:zp,normal_fragment_begin:Vp,normal_fragment_maps:Gp,normal_pars_fragment:Wp,normal_pars_vertex:Xp,normal_vertex:qp,normalmap_pars_fragment:$p,clearcoat_normal_fragment_begin:Yp,clearcoat_normal_fragment_maps:Kp,clearcoat_pars_fragment:Zp,iridescence_pars_fragment:jp,opaque_fragment:Jp,packing:Qp,premultiplied_alpha_fragment:em,project_vertex:tm,dithering_fragment:nm,dithering_pars_fragment:im,roughnessmap_fragment:sm,roughnessmap_pars_fragment:rm,shadowmap_pars_fragment:am,shadowmap_pars_vertex:om,shadowmap_vertex:lm,shadowmask_pars_fragment:cm,skinbase_vertex:dm,skinning_pars_vertex:hm,skinning_vertex:um,skinnormal_vertex:fm,specularmap_fragment:pm,specularmap_pars_fragment:mm,tonemapping_fragment:gm,tonemapping_pars_fragment:_m,transmission_fragment:vm,transmission_pars_fragment:ym,uv_pars_fragment:xm,uv_pars_vertex:Mm,uv_vertex:Sm,worldpos_vertex:Em,background_vert:bm,background_frag:Tm,backgroundCube_vert:wm,backgroundCube_frag:Am,cube_vert:Cm,cube_frag:Rm,depth_vert:Pm,depth_frag:Im,distanceRGBA_vert:Lm,distanceRGBA_frag:Dm,equirect_vert:Um,equirect_frag:Nm,linedashed_vert:Fm,linedashed_frag:Om,meshbasic_vert:Bm,meshbasic_frag:km,meshlambert_vert:Hm,meshlambert_frag:zm,meshmatcap_vert:Vm,meshmatcap_frag:Gm,meshnormal_vert:Wm,meshnormal_frag:Xm,meshphong_vert:qm,meshphong_frag:$m,meshphysical_vert:Ym,meshphysical_frag:Km,meshtoon_vert:Zm,meshtoon_frag:jm,points_vert:Jm,points_frag:Qm,shadow_vert:eg,shadow_frag:tg,sprite_vert:ng,sprite_frag:ig},le={common:{diffuse:{value:new Fe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ge}},envmap:{envMap:{value:null},envMapRotation:{value:new Ge},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ge}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ge}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ge},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ge},normalScale:{value:new Ae(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ge},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ge}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ge}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ge}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Fe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Fe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0},uvTransform:{value:new Ge}},sprite:{diffuse:{value:new Fe(16777215)},opacity:{value:1},center:{value:new Ae(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}}},In={basic:{uniforms:Gt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.fog]),vertexShader:Xe.meshbasic_vert,fragmentShader:Xe.meshbasic_frag},lambert:{uniforms:Gt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Fe(0)}}]),vertexShader:Xe.meshlambert_vert,fragmentShader:Xe.meshlambert_frag},phong:{uniforms:Gt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Fe(0)},specular:{value:new Fe(1118481)},shininess:{value:30}}]),vertexShader:Xe.meshphong_vert,fragmentShader:Xe.meshphong_frag},standard:{uniforms:Gt([le.common,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.roughnessmap,le.metalnessmap,le.fog,le.lights,{emissive:{value:new Fe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Xe.meshphysical_vert,fragmentShader:Xe.meshphysical_frag},toon:{uniforms:Gt([le.common,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.gradientmap,le.fog,le.lights,{emissive:{value:new Fe(0)}}]),vertexShader:Xe.meshtoon_vert,fragmentShader:Xe.meshtoon_frag},matcap:{uniforms:Gt([le.common,le.bumpmap,le.normalmap,le.displacementmap,le.fog,{matcap:{value:null}}]),vertexShader:Xe.meshmatcap_vert,fragmentShader:Xe.meshmatcap_frag},points:{uniforms:Gt([le.points,le.fog]),vertexShader:Xe.points_vert,fragmentShader:Xe.points_frag},dashed:{uniforms:Gt([le.common,le.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Xe.linedashed_vert,fragmentShader:Xe.linedashed_frag},depth:{uniforms:Gt([le.common,le.displacementmap]),vertexShader:Xe.depth_vert,fragmentShader:Xe.depth_frag},normal:{uniforms:Gt([le.common,le.bumpmap,le.normalmap,le.displacementmap,{opacity:{value:1}}]),vertexShader:Xe.meshnormal_vert,fragmentShader:Xe.meshnormal_frag},sprite:{uniforms:Gt([le.sprite,le.fog]),vertexShader:Xe.sprite_vert,fragmentShader:Xe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ge},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Xe.background_vert,fragmentShader:Xe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ge}},vertexShader:Xe.backgroundCube_vert,fragmentShader:Xe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Xe.cube_vert,fragmentShader:Xe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Xe.equirect_vert,fragmentShader:Xe.equirect_frag},distanceRGBA:{uniforms:Gt([le.common,le.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Xe.distanceRGBA_vert,fragmentShader:Xe.distanceRGBA_frag},shadow:{uniforms:Gt([le.lights,le.fog,{color:{value:new Fe(0)},opacity:{value:1}}]),vertexShader:Xe.shadow_vert,fragmentShader:Xe.shadow_frag}};In.physical={uniforms:Gt([In.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ge},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ge},clearcoatNormalScale:{value:new Ae(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ge},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ge},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ge},sheen:{value:0},sheenColor:{value:new Fe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ge},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ge},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ge},transmissionSamplerSize:{value:new Ae},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ge},attenuationDistance:{value:0},attenuationColor:{value:new Fe(0)},specularColor:{value:new Fe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ge},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ge},anisotropyVector:{value:new Ae},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ge}}]),vertexShader:Xe.meshphysical_vert,fragmentShader:Xe.meshphysical_frag};const Dr={r:0,b:0,g:0},xi=new Bn,sg=new ot;function rg(i,e,t,n,s,r,a){const o=new Fe(0);let l=r===!0?0:1,c,d,f=null,h=0,u=null;function g(b){let M=b.isScene===!0?b.background:null;return M&&M.isTexture&&(M=(b.backgroundBlurriness>0?t:e).get(M)),M}function _(b){let M=!1;const R=g(b);R===null?p(o,l):R&&R.isColor&&(p(R,1),M=!0);const w=i.xr.getEnvironmentBlendMode();w==="additive"?n.buffers.color.setClear(0,0,0,1,a):w==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||M)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(b,M){const R=g(M);R&&(R.isCubeTexture||R.mapping===ha)?(d===void 0&&(d=new re(new Zt(1,1,1),new Yt({name:"BackgroundCubeMaterial",uniforms:gs(In.backgroundCube.uniforms),vertexShader:In.backgroundCube.vertexShader,fragmentShader:In.backgroundCube.fragmentShader,side:Kt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),d.geometry.deleteAttribute("normal"),d.geometry.deleteAttribute("uv"),d.onBeforeRender=function(w,I,L){this.matrixWorld.copyPosition(L.matrixWorld)},Object.defineProperty(d.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(d)),xi.copy(M.backgroundRotation),xi.x*=-1,xi.y*=-1,xi.z*=-1,R.isCubeTexture&&R.isRenderTargetTexture===!1&&(xi.y*=-1,xi.z*=-1),d.material.uniforms.envMap.value=R,d.material.uniforms.flipEnvMap.value=R.isCubeTexture&&R.isRenderTargetTexture===!1?-1:1,d.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,d.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,d.material.uniforms.backgroundRotation.value.setFromMatrix4(sg.makeRotationFromEuler(xi)),d.material.toneMapped=je.getTransfer(R.colorSpace)!==rt,(f!==R||h!==R.version||u!==i.toneMapping)&&(d.material.needsUpdate=!0,f=R,h=R.version,u=i.toneMapping),d.layers.enableAll(),b.unshift(d,d.geometry,d.material,0,0,null)):R&&R.isTexture&&(c===void 0&&(c=new re(new An(2,2),new Yt({name:"BackgroundMaterial",uniforms:gs(In.background.uniforms),vertexShader:In.background.vertexShader,fragmentShader:In.background.fragmentShader,side:ui,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=R,c.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,c.material.toneMapped=je.getTransfer(R.colorSpace)!==rt,R.matrixAutoUpdate===!0&&R.updateMatrix(),c.material.uniforms.uvTransform.value.copy(R.matrix),(f!==R||h!==R.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,f=R,h=R.version,u=i.toneMapping),c.layers.enableAll(),b.unshift(c,c.geometry,c.material,0,0,null))}function p(b,M){b.getRGB(Dr,zd(i)),n.buffers.color.setClear(Dr.r,Dr.g,Dr.b,M,a)}function E(){d!==void 0&&(d.geometry.dispose(),d.material.dispose(),d=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(b,M=1){o.set(b),l=M,p(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(b){l=b,p(o,l)},render:_,addToRenderList:m,dispose:E}}function ag(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=h(null);let r=s,a=!1;function o(y,C,T,B,U){let F=!1;const N=f(B,T,C);r!==N&&(r=N,c(r.object)),F=u(y,B,T,U),F&&g(y,B,T,U),U!==null&&e.update(U,i.ELEMENT_ARRAY_BUFFER),(F||a)&&(a=!1,M(y,C,T,B),U!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(U).buffer))}function l(){return i.createVertexArray()}function c(y){return i.bindVertexArray(y)}function d(y){return i.deleteVertexArray(y)}function f(y,C,T){const B=T.wireframe===!0;let U=n[y.id];U===void 0&&(U={},n[y.id]=U);let F=U[C.id];F===void 0&&(F={},U[C.id]=F);let N=F[B];return N===void 0&&(N=h(l()),F[B]=N),N}function h(y){const C=[],T=[],B=[];for(let U=0;U<t;U++)C[U]=0,T[U]=0,B[U]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:C,enabledAttributes:T,attributeDivisors:B,object:y,attributes:{},index:null}}function u(y,C,T,B){const U=r.attributes,F=C.attributes;let N=0;const W=T.getAttributes();for(const V in W)if(W[V].location>=0){const ee=U[V];let ce=F[V];if(ce===void 0&&(V==="instanceMatrix"&&y.instanceMatrix&&(ce=y.instanceMatrix),V==="instanceColor"&&y.instanceColor&&(ce=y.instanceColor)),ee===void 0||ee.attribute!==ce||ce&&ee.data!==ce.data)return!0;N++}return r.attributesNum!==N||r.index!==B}function g(y,C,T,B){const U={},F=C.attributes;let N=0;const W=T.getAttributes();for(const V in W)if(W[V].location>=0){let ee=F[V];ee===void 0&&(V==="instanceMatrix"&&y.instanceMatrix&&(ee=y.instanceMatrix),V==="instanceColor"&&y.instanceColor&&(ee=y.instanceColor));const ce={};ce.attribute=ee,ee&&ee.data&&(ce.data=ee.data),U[V]=ce,N++}r.attributes=U,r.attributesNum=N,r.index=B}function _(){const y=r.newAttributes;for(let C=0,T=y.length;C<T;C++)y[C]=0}function m(y){p(y,0)}function p(y,C){const T=r.newAttributes,B=r.enabledAttributes,U=r.attributeDivisors;T[y]=1,B[y]===0&&(i.enableVertexAttribArray(y),B[y]=1),U[y]!==C&&(i.vertexAttribDivisor(y,C),U[y]=C)}function E(){const y=r.newAttributes,C=r.enabledAttributes;for(let T=0,B=C.length;T<B;T++)C[T]!==y[T]&&(i.disableVertexAttribArray(T),C[T]=0)}function b(y,C,T,B,U,F,N){N===!0?i.vertexAttribIPointer(y,C,T,U,F):i.vertexAttribPointer(y,C,T,B,U,F)}function M(y,C,T,B){_();const U=B.attributes,F=T.getAttributes(),N=C.defaultAttributeValues;for(const W in F){const V=F[W];if(V.location>=0){let j=U[W];if(j===void 0&&(W==="instanceMatrix"&&y.instanceMatrix&&(j=y.instanceMatrix),W==="instanceColor"&&y.instanceColor&&(j=y.instanceColor)),j!==void 0){const ee=j.normalized,ce=j.itemSize,Ee=e.get(j);if(Ee===void 0)continue;const He=Ee.buffer,Qe=Ee.type,Q=Ee.bytesPerElement,z=Qe===i.INT||Qe===i.UNSIGNED_INT||j.gpuType===fl;if(j.isInterleavedBufferAttribute){const Y=j.data,he=Y.stride,Re=j.offset;if(Y.isInstancedInterleavedBuffer){for(let xe=0;xe<V.locationSize;xe++)p(V.location+xe,Y.meshPerAttribute);y.isInstancedMesh!==!0&&B._maxInstanceCount===void 0&&(B._maxInstanceCount=Y.meshPerAttribute*Y.count)}else for(let xe=0;xe<V.locationSize;xe++)m(V.location+xe);i.bindBuffer(i.ARRAY_BUFFER,He);for(let xe=0;xe<V.locationSize;xe++)b(V.location+xe,ce/V.locationSize,Qe,ee,he*Q,(Re+ce/V.locationSize*xe)*Q,z)}else{if(j.isInstancedBufferAttribute){for(let Y=0;Y<V.locationSize;Y++)p(V.location+Y,j.meshPerAttribute);y.isInstancedMesh!==!0&&B._maxInstanceCount===void 0&&(B._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let Y=0;Y<V.locationSize;Y++)m(V.location+Y);i.bindBuffer(i.ARRAY_BUFFER,He);for(let Y=0;Y<V.locationSize;Y++)b(V.location+Y,ce/V.locationSize,Qe,ee,ce*Q,ce/V.locationSize*Y*Q,z)}}else if(N!==void 0){const ee=N[W];if(ee!==void 0)switch(ee.length){case 2:i.vertexAttrib2fv(V.location,ee);break;case 3:i.vertexAttrib3fv(V.location,ee);break;case 4:i.vertexAttrib4fv(V.location,ee);break;default:i.vertexAttrib1fv(V.location,ee)}}}}E()}function R(){L();for(const y in n){const C=n[y];for(const T in C){const B=C[T];for(const U in B)d(B[U].object),delete B[U];delete C[T]}delete n[y]}}function w(y){if(n[y.id]===void 0)return;const C=n[y.id];for(const T in C){const B=C[T];for(const U in B)d(B[U].object),delete B[U];delete C[T]}delete n[y.id]}function I(y){for(const C in n){const T=n[C];if(T[y.id]===void 0)continue;const B=T[y.id];for(const U in B)d(B[U].object),delete B[U];delete T[y.id]}}function L(){v(),a=!0,r!==s&&(r=s,c(r.object))}function v(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:L,resetDefaultState:v,dispose:R,releaseStatesOfGeometry:w,releaseStatesOfProgram:I,initAttributes:_,enableAttribute:m,disableUnusedAttributes:E}}function og(i,e,t){let n;function s(c){n=c}function r(c,d){i.drawArrays(n,c,d),t.update(d,n,1)}function a(c,d,f){f!==0&&(i.drawArraysInstanced(n,c,d,f),t.update(d,n,f))}function o(c,d,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,d,0,f);let u=0;for(let g=0;g<f;g++)u+=d[g];t.update(u,n,1)}function l(c,d,f,h){if(f===0)return;const u=e.get("WEBGL_multi_draw");if(u===null)for(let g=0;g<c.length;g++)a(c[g],d[g],h[g]);else{u.multiDrawArraysInstancedWEBGL(n,c,0,d,0,h,0,f);let g=0;for(let _=0;_<f;_++)g+=d[_]*h[_];t.update(g,n,1)}}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function lg(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){const I=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(I.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(I){return!(I!==En&&n.convert(I)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(I){const L=I===Zn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(I!==On&&n.convert(I)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&I!==Un&&!L)}function l(I){if(I==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";I="mediump"}return I==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const d=l(c);d!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",d,"instead."),c=d);const f=t.logarithmicDepthBuffer===!0,h=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),u=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),E=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),b=i.getParameter(i.MAX_VARYING_VECTORS),M=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),R=g>0,w=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:h,maxTextures:u,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:E,maxVaryings:b,maxFragmentUniforms:M,vertexTextures:R,maxSamples:w}}function cg(i){const e=this;let t=null,n=0,s=!1,r=!1;const a=new li,o=new Ge,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,h){const u=f.length!==0||h||n!==0||s;return s=h,n=f.length,u},this.beginShadows=function(){r=!0,d(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,h){t=d(f,h,0)},this.setState=function(f,h,u){const g=f.clippingPlanes,_=f.clipIntersection,m=f.clipShadows,p=i.get(f);if(!s||g===null||g.length===0||r&&!m)r?d(null):c();else{const E=r?0:n,b=E*4;let M=p.clippingState||null;l.value=M,M=d(g,h,b,u);for(let R=0;R!==b;++R)M[R]=t[R];p.clippingState=M,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=E}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function d(f,h,u,g){const _=f!==null?f.length:0;let m=null;if(_!==0){if(m=l.value,g!==!0||m===null){const p=u+_*4,E=h.matrixWorldInverse;o.getNormalMatrix(E),(m===null||m.length<p)&&(m=new Float32Array(p));for(let b=0,M=u;b!==_;++b,M+=4)a.copy(f[b]).applyMatrix4(E,o),a.normal.toArray(m,M),m[M+3]=a.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,m}}function dg(i){let e=new WeakMap;function t(a,o){return o===wo?a.mapping=fs:o===Ao&&(a.mapping=ps),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===wo||o===Ao)if(e.has(a)){const l=e.get(a).texture;return t(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const c=new tf(l.height);return c.fromEquirectangularTexture(i,a),e.set(a,c),a.addEventListener("dispose",s),t(c.texture,a.mapping)}else return null}}return a}function s(a){const o=a.target;o.removeEventListener("dispose",s);const l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}const as=4,Cc=[.125,.215,.35,.446,.526,.582],wi=20,Ka=new pa,Rc=new Fe;let Za=null,ja=0,Ja=0,Qa=!1;const Ei=(1+Math.sqrt(5))/2,ns=1/Ei,Pc=[new D(-Ei,ns,0),new D(Ei,ns,0),new D(-ns,0,Ei),new D(ns,0,Ei),new D(0,Ei,-ns),new D(0,Ei,ns),new D(-1,1,-1),new D(1,1,-1),new D(-1,1,1),new D(1,1,1)],hg=new D;class Ic{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,s=100,r={}){const{size:a=256,position:o=hg}=r;Za=this._renderer.getRenderTarget(),ja=this._renderer.getActiveCubeFace(),Ja=this._renderer.getActiveMipmapLevel(),Qa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,s,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Uc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Dc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Za,ja,Ja),this._renderer.xr.enabled=Qa,e.scissorTest=!1,Ur(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===fs||e.mapping===ps?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Za=this._renderer.getRenderTarget(),ja=this._renderer.getActiveCubeFace(),Ja=this._renderer.getActiveMipmapLevel(),Qa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Sn,minFilter:Sn,generateMipmaps:!1,type:Zn,format:En,colorSpace:ms,depthBuffer:!1},s=Lc(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Lc(e,t,n);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=ug(r)),this._blurMaterial=fg(r,e,t)}return s}_compileMaterial(e){const t=new re(this._lodPlanes[0],e);this._renderer.compile(t,Ka)}_sceneToCubeUV(e,t,n,s,r){const l=new nn(90,1,t,n),c=[1,-1,1,1,1,1],d=[1,1,1,-1,-1,-1],f=this._renderer,h=f.autoClear,u=f.toneMapping;f.getClearColor(Rc),f.toneMapping=hi,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(s),f.clearDepth(),f.setRenderTarget(null));const _=new xs({name:"PMREM.Background",side:Kt,depthWrite:!1,depthTest:!1}),m=new re(new Zt,_);let p=!1;const E=e.background;E?E.isColor&&(_.color.copy(E),e.background=null,p=!0):(_.color.copy(Rc),p=!0);for(let b=0;b<6;b++){const M=b%3;M===0?(l.up.set(0,c[b],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+d[b],r.y,r.z)):M===1?(l.up.set(0,0,c[b]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+d[b],r.z)):(l.up.set(0,c[b],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+d[b]));const R=this._cubeSize;Ur(s,M*R,b>2?R:0,R,R),f.setRenderTarget(s),p&&f.render(m,l),f.render(e,l)}m.geometry.dispose(),m.material.dispose(),f.toneMapping=u,f.autoClear=h,e.background=E}_textureToCubeUV(e,t){const n=this._renderer,s=e.mapping===fs||e.mapping===ps;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Uc()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Dc());const r=s?this._cubemapMaterial:this._equirectMaterial,a=new re(this._lodPlanes[0],r),o=r.uniforms;o.envMap.value=e;const l=this._cubeSize;Ur(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(a,Ka)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const s=this._lodPlanes.length;for(let r=1;r<s;r++){const a=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),o=Pc[(s-r-1)%Pc.length];this._blur(e,r-1,r,a,o)}t.autoClear=n}_blur(e,t,n,s,r){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,s,"latitudinal",r),this._halfBlur(a,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,a,o){const l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const d=3,f=new re(this._lodPlanes[s],c),h=c.uniforms,u=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*u):2*Math.PI/(2*wi-1),_=r/g,m=isFinite(r)?1+Math.floor(d*_):wi;m>wi&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${wi}`);const p=[];let E=0;for(let I=0;I<wi;++I){const L=I/_,v=Math.exp(-L*L/2);p.push(v),I===0?E+=v:I<m&&(E+=2*v)}for(let I=0;I<p.length;I++)p[I]=p[I]/E;h.envMap.value=e.texture,h.samples.value=m,h.weights.value=p,h.latitudinal.value=a==="latitudinal",o&&(h.poleAxis.value=o);const{_lodMax:b}=this;h.dTheta.value=g,h.mipInt.value=b-n;const M=this._sizeLods[s],R=3*M*(s>b-as?s-b+as:0),w=4*(this._cubeSize-M);Ur(t,R,w,3*M,2*M),l.setRenderTarget(t),l.render(f,Ka)}}function ug(i){const e=[],t=[],n=[];let s=i;const r=i-as+1+Cc.length;for(let a=0;a<r;a++){const o=Math.pow(2,s);t.push(o);let l=1/o;a>i-as?l=Cc[a-i+as-1]:a===0&&(l=0),n.push(l);const c=1/(o-2),d=-c,f=1+c,h=[d,d,f,d,f,f,d,d,f,f,d,f],u=6,g=6,_=3,m=2,p=1,E=new Float32Array(_*g*u),b=new Float32Array(m*g*u),M=new Float32Array(p*g*u);for(let w=0;w<u;w++){const I=w%3*2/3-1,L=w>2?0:-1,v=[I,L,0,I+2/3,L,0,I+2/3,L+1,0,I,L,0,I+2/3,L+1,0,I,L+1,0];E.set(v,_*g*w),b.set(h,m*g*w);const y=[w,w,w,w,w,w];M.set(y,p*g*w)}const R=new Ft;R.setAttribute("position",new an(E,_)),R.setAttribute("uv",new an(b,m)),R.setAttribute("faceIndex",new an(M,p)),e.push(R),s>as&&s--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function Lc(i,e,t){const n=new Tn(i,e,t);return n.texture.mapping=ha,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Ur(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function fg(i,e,t){const n=new Float32Array(wi),s=new D(0,1,0);return new Yt({name:"SphericalGaussianBlur",defines:{n:wi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Ll(),fragmentShader:`

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
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function Dc(){return new Yt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Ll(),fragmentShader:`

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
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function Uc(){return new Yt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Ll(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function Ll(){return`

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
	`}function pg(i){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){const l=o.mapping,c=l===wo||l===Ao,d=l===fs||l===ps;if(c||d){let f=e.get(o);const h=f!==void 0?f.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==h)return t===null&&(t=new Ic(i)),f=c?t.fromEquirectangular(o,f):t.fromCubemap(o,f),f.texture.pmremVersion=o.pmremVersion,e.set(o,f),f.texture;if(f!==void 0)return f.texture;{const u=o.image;return c&&u&&u.height>0||d&&u&&s(u)?(t===null&&(t=new Ic(i)),f=c?t.fromEquirectangular(o):t.fromCubemap(o),f.texture.pmremVersion=o.pmremVersion,e.set(o,f),o.addEventListener("dispose",r),f.texture):null}}}return o}function s(o){let l=0;const c=6;for(let d=0;d<c;d++)o[d]!==void 0&&l++;return l===c}function r(o){const l=o.target;l.removeEventListener("dispose",r);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function mg(i){const e={};function t(n){if(e[n]!==void 0)return e[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const s=t(n);return s===null&&Ks("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function gg(i,e,t,n){const s={},r=new WeakMap;function a(f){const h=f.target;h.index!==null&&e.remove(h.index);for(const g in h.attributes)e.remove(h.attributes[g]);h.removeEventListener("dispose",a),delete s[h.id];const u=r.get(h);u&&(e.remove(u),r.delete(h)),n.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,t.memory.geometries--}function o(f,h){return s[h.id]===!0||(h.addEventListener("dispose",a),s[h.id]=!0,t.memory.geometries++),h}function l(f){const h=f.attributes;for(const u in h)e.update(h[u],i.ARRAY_BUFFER)}function c(f){const h=[],u=f.index,g=f.attributes.position;let _=0;if(u!==null){const E=u.array;_=u.version;for(let b=0,M=E.length;b<M;b+=3){const R=E[b+0],w=E[b+1],I=E[b+2];h.push(R,w,w,I,I,R)}}else if(g!==void 0){const E=g.array;_=g.version;for(let b=0,M=E.length/3-1;b<M;b+=3){const R=b+0,w=b+1,I=b+2;h.push(R,w,w,I,I,R)}}else return;const m=new(Fd(h)?Hd:kd)(h,1);m.version=_;const p=r.get(f);p&&e.remove(p),r.set(f,m)}function d(f){const h=r.get(f);if(h){const u=f.index;u!==null&&h.version<u.version&&c(f)}else c(f);return r.get(f)}return{get:o,update:l,getWireframeAttribute:d}}function _g(i,e,t){let n;function s(h){n=h}let r,a;function o(h){r=h.type,a=h.bytesPerElement}function l(h,u){i.drawElements(n,u,r,h*a),t.update(u,n,1)}function c(h,u,g){g!==0&&(i.drawElementsInstanced(n,u,r,h*a,g),t.update(u,n,g))}function d(h,u,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,h,0,g);let m=0;for(let p=0;p<g;p++)m+=u[p];t.update(m,n,1)}function f(h,u,g,_){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<h.length;p++)c(h[p]/a,u[p],_[p]);else{m.multiDrawElementsInstancedWEBGL(n,u,0,r,h,0,_,0,g);let p=0;for(let E=0;E<g;E++)p+=u[E]*_[E];t.update(p,n,1)}}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=d,this.renderMultiDrawInstances=f}function vg(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(r/3);break;case i.LINES:t.lines+=o*(r/2);break;case i.LINE_STRIP:t.lines+=o*(r-1);break;case i.LINE_LOOP:t.lines+=o*r;break;case i.POINTS:t.points+=o*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function yg(i,e,t){const n=new WeakMap,s=new at;function r(a,o,l){const c=a.morphTargetInfluences,d=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,f=d!==void 0?d.length:0;let h=n.get(o);if(h===void 0||h.count!==f){let y=function(){L.dispose(),n.delete(o),o.removeEventListener("dispose",y)};var u=y;h!==void 0&&h.texture.dispose();const g=o.morphAttributes.position!==void 0,_=o.morphAttributes.normal!==void 0,m=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],E=o.morphAttributes.normal||[],b=o.morphAttributes.color||[];let M=0;g===!0&&(M=1),_===!0&&(M=2),m===!0&&(M=3);let R=o.attributes.position.count*M,w=1;R>e.maxTextureSize&&(w=Math.ceil(R/e.maxTextureSize),R=e.maxTextureSize);const I=new Float32Array(R*w*4*f),L=new Od(I,R,w,f);L.type=Un,L.needsUpdate=!0;const v=M*4;for(let C=0;C<f;C++){const T=p[C],B=E[C],U=b[C],F=R*w*4*C;for(let N=0;N<T.count;N++){const W=N*v;g===!0&&(s.fromBufferAttribute(T,N),I[F+W+0]=s.x,I[F+W+1]=s.y,I[F+W+2]=s.z,I[F+W+3]=0),_===!0&&(s.fromBufferAttribute(B,N),I[F+W+4]=s.x,I[F+W+5]=s.y,I[F+W+6]=s.z,I[F+W+7]=0),m===!0&&(s.fromBufferAttribute(U,N),I[F+W+8]=s.x,I[F+W+9]=s.y,I[F+W+10]=s.z,I[F+W+11]=U.itemSize===4?s.w:1)}}h={count:f,texture:L,size:new Ae(R,w)},n.set(o,h),o.addEventListener("dispose",y)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const _=o.morphTargetsRelative?1:1-g;l.getUniforms().setValue(i,"morphTargetBaseInfluence",_),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",h.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",h.size)}return{update:r}}function xg(i,e,t,n){let s=new WeakMap;function r(l){const c=n.render.frame,d=l.geometry,f=e.get(l,d);if(s.get(f)!==c&&(e.update(f),s.set(f,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),s.get(l)!==c&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){const h=l.skeleton;s.get(h)!==c&&(h.update(),s.set(h,c))}return f}function a(){s=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:r,dispose:a}}const jd=new kt,Nc=new $d(1,1),Jd=new Od,Qd=new ku,eh=new Gd,Fc=[],Oc=[],Bc=new Float32Array(16),kc=new Float32Array(9),Hc=new Float32Array(4);function Ms(i,e,t){const n=i[0];if(n<=0||n>0)return i;const s=e*t;let r=Fc[s];if(r===void 0&&(r=new Float32Array(s),Fc[s]=r),e!==0){n.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(r,o)}return r}function Pt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function It(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function ma(i,e){let t=Oc[e];t===void 0&&(t=new Int32Array(e),Oc[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function Mg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function Sg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2fv(this.addr,e),It(t,e)}}function Eg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Pt(t,e))return;i.uniform3fv(this.addr,e),It(t,e)}}function bg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4fv(this.addr,e),It(t,e)}}function Tg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),It(t,e)}else{if(Pt(t,n))return;Hc.set(n),i.uniformMatrix2fv(this.addr,!1,Hc),It(t,n)}}function wg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),It(t,e)}else{if(Pt(t,n))return;kc.set(n),i.uniformMatrix3fv(this.addr,!1,kc),It(t,n)}}function Ag(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),It(t,e)}else{if(Pt(t,n))return;Bc.set(n),i.uniformMatrix4fv(this.addr,!1,Bc),It(t,n)}}function Cg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function Rg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2iv(this.addr,e),It(t,e)}}function Pg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;i.uniform3iv(this.addr,e),It(t,e)}}function Ig(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4iv(this.addr,e),It(t,e)}}function Lg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function Dg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2uiv(this.addr,e),It(t,e)}}function Ug(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;i.uniform3uiv(this.addr,e),It(t,e)}}function Ng(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4uiv(this.addr,e),It(t,e)}}function Fg(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Nc.compareFunction=Nd,r=Nc):r=jd,t.setTexture2D(e||r,s)}function Og(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||Qd,s)}function Bg(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||eh,s)}function kg(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||Jd,s)}function Hg(i){switch(i){case 5126:return Mg;case 35664:return Sg;case 35665:return Eg;case 35666:return bg;case 35674:return Tg;case 35675:return wg;case 35676:return Ag;case 5124:case 35670:return Cg;case 35667:case 35671:return Rg;case 35668:case 35672:return Pg;case 35669:case 35673:return Ig;case 5125:return Lg;case 36294:return Dg;case 36295:return Ug;case 36296:return Ng;case 35678:case 36198:case 36298:case 36306:case 35682:return Fg;case 35679:case 36299:case 36307:return Og;case 35680:case 36300:case 36308:case 36293:return Bg;case 36289:case 36303:case 36311:case 36292:return kg}}function zg(i,e){i.uniform1fv(this.addr,e)}function Vg(i,e){const t=Ms(e,this.size,2);i.uniform2fv(this.addr,t)}function Gg(i,e){const t=Ms(e,this.size,3);i.uniform3fv(this.addr,t)}function Wg(i,e){const t=Ms(e,this.size,4);i.uniform4fv(this.addr,t)}function Xg(i,e){const t=Ms(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function qg(i,e){const t=Ms(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function $g(i,e){const t=Ms(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Yg(i,e){i.uniform1iv(this.addr,e)}function Kg(i,e){i.uniform2iv(this.addr,e)}function Zg(i,e){i.uniform3iv(this.addr,e)}function jg(i,e){i.uniform4iv(this.addr,e)}function Jg(i,e){i.uniform1uiv(this.addr,e)}function Qg(i,e){i.uniform2uiv(this.addr,e)}function e0(i,e){i.uniform3uiv(this.addr,e)}function t0(i,e){i.uniform4uiv(this.addr,e)}function n0(i,e,t){const n=this.cache,s=e.length,r=ma(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTexture2D(e[a]||jd,r[a])}function i0(i,e,t){const n=this.cache,s=e.length,r=ma(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTexture3D(e[a]||Qd,r[a])}function s0(i,e,t){const n=this.cache,s=e.length,r=ma(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTextureCube(e[a]||eh,r[a])}function r0(i,e,t){const n=this.cache,s=e.length,r=ma(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTexture2DArray(e[a]||Jd,r[a])}function a0(i){switch(i){case 5126:return zg;case 35664:return Vg;case 35665:return Gg;case 35666:return Wg;case 35674:return Xg;case 35675:return qg;case 35676:return $g;case 5124:case 35670:return Yg;case 35667:case 35671:return Kg;case 35668:case 35672:return Zg;case 35669:case 35673:return jg;case 5125:return Jg;case 36294:return Qg;case 36295:return e0;case 36296:return t0;case 35678:case 36198:case 36298:case 36306:case 35682:return n0;case 35679:case 36299:case 36307:return i0;case 35680:case 36300:case 36308:case 36293:return s0;case 36289:case 36303:case 36311:case 36292:return r0}}class o0{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Hg(t.type)}}class l0{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=a0(t.type)}}class c0{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const s=this.seq;for(let r=0,a=s.length;r!==a;++r){const o=s[r];o.setValue(e,t[o.id],n)}}}const eo=/(\w+)(\])?(\[|\.)?/g;function zc(i,e){i.seq.push(e),i.map[e.id]=e}function d0(i,e,t){const n=i.name,s=n.length;for(eo.lastIndex=0;;){const r=eo.exec(n),a=eo.lastIndex;let o=r[1];const l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){zc(t,c===void 0?new o0(o,i,e):new l0(o,i,e));break}else{let f=t.map[o];f===void 0&&(f=new c0(o),zc(t,f)),t=f}}}class Yr{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){const r=e.getActiveUniform(t,s),a=e.getUniformLocation(t,r.name);d0(r,a,this)}}setValue(e,t,n,s){const r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){const s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,a=t.length;r!==a;++r){const o=t[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,s)}}static seqWithValue(e,t){const n=[];for(let s=0,r=e.length;s!==r;++s){const a=e[s];a.id in t&&n.push(a)}return n}}function Vc(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const h0=37297;let u0=0;function f0(i,e){const t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=s;a<r;a++){const o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}const Gc=new Ge;function p0(i){je._getMatrix(Gc,je.workingColorSpace,i);const e=`mat3( ${Gc.elements.map(t=>t.toFixed(4))} )`;switch(je.getTransfer(i)){case ta:return[e,"LinearTransferOETF"];case rt:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Wc(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const a=/ERROR: 0:(\d+)/.exec(r);if(a){const o=parseInt(a[1]);return t.toUpperCase()+`

`+r+`

`+f0(i.getShaderSource(e),o)}else return r}function m0(i,e){const t=p0(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function g0(i,e){let t;switch(e){case Jh:t="Linear";break;case Qh:t="Reinhard";break;case eu:t="Cineon";break;case Td:t="ACESFilmic";break;case nu:t="AgX";break;case iu:t="Neutral";break;case tu:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Nr=new D;function _0(){je.getLuminanceCoefficients(Nr);const i=Nr.x.toFixed(4),e=Nr.y.toFixed(4),t=Nr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function v0(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Bs).join(`
`)}function y0(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function x0(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(e,s),a=r.name;let o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function Bs(i){return i!==""}function Xc(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function qc(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const M0=/^[ \t]*#include +<([\w\d./]+)>/gm;function ol(i){return i.replace(M0,E0)}const S0=new Map;function E0(i,e){let t=Xe[e];if(t===void 0){const n=S0.get(e);if(n!==void 0)t=Xe[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return ol(t)}const b0=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function $c(i){return i.replace(b0,T0)}function T0(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Yc(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}function w0(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===Sd?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===Ed?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===Xn&&(e="SHADOWMAP_TYPE_VSM"),e}function A0(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case fs:case ps:e="ENVMAP_TYPE_CUBE";break;case ha:e="ENVMAP_TYPE_CUBE_UV";break}return e}function C0(i){let e="ENVMAP_MODE_REFLECTION";return i.envMap&&i.envMapMode===ps&&(e="ENVMAP_MODE_REFRACTION"),e}function R0(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case bd:e="ENVMAP_BLENDING_MULTIPLY";break;case Zh:e="ENVMAP_BLENDING_MIX";break;case jh:e="ENVMAP_BLENDING_ADD";break}return e}function P0(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function I0(i,e,t,n){const s=i.getContext(),r=t.defines;let a=t.vertexShader,o=t.fragmentShader;const l=w0(t),c=A0(t),d=C0(t),f=R0(t),h=P0(t),u=v0(t),g=y0(r),_=s.createProgram();let m,p,E=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Bs).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Bs).join(`
`),p.length>0&&(p+=`
`)):(m=[Yc(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+d:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Bs).join(`
`),p=[Yc(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+d:"",t.envMap?"#define "+f:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==hi?"#define TONE_MAPPING":"",t.toneMapping!==hi?Xe.tonemapping_pars_fragment:"",t.toneMapping!==hi?g0("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Xe.colorspace_pars_fragment,m0("linearToOutputTexel",t.outputColorSpace),_0(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Bs).join(`
`)),a=ol(a),a=Xc(a,t),a=qc(a,t),o=ol(o),o=Xc(o,t),o=qc(o,t),a=$c(a),o=$c(o),t.isRawShaderMaterial!==!0&&(E=`#version 300 es
`,m=[u,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===Zl?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Zl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const b=E+m+a,M=E+p+o,R=Vc(s,s.VERTEX_SHADER,b),w=Vc(s,s.FRAGMENT_SHADER,M);s.attachShader(_,R),s.attachShader(_,w),t.index0AttributeName!==void 0?s.bindAttribLocation(_,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function I(C){if(i.debug.checkShaderErrors){const T=s.getProgramInfoLog(_)||"",B=s.getShaderInfoLog(R)||"",U=s.getShaderInfoLog(w)||"",F=T.trim(),N=B.trim(),W=U.trim();let V=!0,j=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(V=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,_,R,w);else{const ee=Wc(s,R,"vertex"),ce=Wc(s,w,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+F+`
`+ee+`
`+ce)}else F!==""?console.warn("THREE.WebGLProgram: Program Info Log:",F):(N===""||W==="")&&(j=!1);j&&(C.diagnostics={runnable:V,programLog:F,vertexShader:{log:N,prefix:m},fragmentShader:{log:W,prefix:p}})}s.deleteShader(R),s.deleteShader(w),L=new Yr(s,_),v=x0(s,_)}let L;this.getUniforms=function(){return L===void 0&&I(this),L};let v;this.getAttributes=function(){return v===void 0&&I(this),v};let y=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return y===!1&&(y=s.getProgramParameter(_,h0)),y},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=u0++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=R,this.fragmentShader=w,this}let L0=0;class D0{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(s)===!1&&(a.add(s),s.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new U0(e),t.set(e,n)),n}}class U0{constructor(e){this.id=L0++,this.code=e,this.usedTimes=0}}function N0(i,e,t,n,s,r,a){const o=new El,l=new D0,c=new Set,d=[],f=s.logarithmicDepthBuffer,h=s.vertexTextures;let u=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(v){return c.add(v),v===0?"uv":`uv${v}`}function m(v,y,C,T,B){const U=T.fog,F=B.geometry,N=v.isMeshStandardMaterial?T.environment:null,W=(v.isMeshStandardMaterial?t:e).get(v.envMap||N),V=W&&W.mapping===ha?W.image.height:null,j=g[v.type];v.precision!==null&&(u=s.getMaxPrecision(v.precision),u!==v.precision&&console.warn("THREE.WebGLProgram.getParameters:",v.precision,"not supported, using",u,"instead."));const ee=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,ce=ee!==void 0?ee.length:0;let Ee=0;F.morphAttributes.position!==void 0&&(Ee=1),F.morphAttributes.normal!==void 0&&(Ee=2),F.morphAttributes.color!==void 0&&(Ee=3);let He,Qe,Q,z;if(j){const tt=In[j];He=tt.vertexShader,Qe=tt.fragmentShader}else He=v.vertexShader,Qe=v.fragmentShader,l.update(v),Q=l.getVertexShaderID(v),z=l.getFragmentShaderID(v);const Y=i.getRenderTarget(),he=i.state.buffers.depth.getReversed(),Re=B.isInstancedMesh===!0,xe=B.isBatchedMesh===!0,Be=!!v.map,Et=!!v.matcap,P=!!W,ft=!!v.aoMap,ke=!!v.lightMap,Ue=!!v.bumpMap,Me=!!v.normalMap,pt=!!v.displacementMap,Se=!!v.emissiveMap,We=!!v.metalnessMap,Lt=!!v.roughnessMap,Mt=v.anisotropy>0,A=v.clearcoat>0,x=v.dispersion>0,G=v.iridescence>0,K=v.sheen>0,J=v.transmission>0,$=Mt&&!!v.anisotropyMap,Ce=A&&!!v.clearcoatMap,ae=A&&!!v.clearcoatNormalMap,be=A&&!!v.clearcoatRoughnessMap,Te=G&&!!v.iridescenceMap,ie=G&&!!v.iridescenceThicknessMap,fe=K&&!!v.sheenColorMap,De=K&&!!v.sheenRoughnessMap,we=!!v.specularMap,de=!!v.specularColorMap,ze=!!v.specularIntensityMap,O=J&&!!v.transmissionMap,se=J&&!!v.thicknessMap,oe=!!v.gradientMap,_e=!!v.alphaMap,te=v.alphaTest>0,Z=!!v.alphaHash,ye=!!v.extensions;let Oe=hi;v.toneMapped&&(Y===null||Y.isXRRenderTarget===!0)&&(Oe=i.toneMapping);const dt={shaderID:j,shaderType:v.type,shaderName:v.name,vertexShader:He,fragmentShader:Qe,defines:v.defines,customVertexShaderID:Q,customFragmentShaderID:z,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:u,batching:xe,batchingColor:xe&&B._colorsTexture!==null,instancing:Re,instancingColor:Re&&B.instanceColor!==null,instancingMorph:Re&&B.morphTexture!==null,supportsVertexTextures:h,outputColorSpace:Y===null?i.outputColorSpace:Y.isXRRenderTarget===!0?Y.texture.colorSpace:ms,alphaToCoverage:!!v.alphaToCoverage,map:Be,matcap:Et,envMap:P,envMapMode:P&&W.mapping,envMapCubeUVHeight:V,aoMap:ft,lightMap:ke,bumpMap:Ue,normalMap:Me,displacementMap:h&&pt,emissiveMap:Se,normalMapObjectSpace:Me&&v.normalMapType===ou,normalMapTangentSpace:Me&&v.normalMapType===Ud,metalnessMap:We,roughnessMap:Lt,anisotropy:Mt,anisotropyMap:$,clearcoat:A,clearcoatMap:Ce,clearcoatNormalMap:ae,clearcoatRoughnessMap:be,dispersion:x,iridescence:G,iridescenceMap:Te,iridescenceThicknessMap:ie,sheen:K,sheenColorMap:fe,sheenRoughnessMap:De,specularMap:we,specularColorMap:de,specularIntensityMap:ze,transmission:J,transmissionMap:O,thicknessMap:se,gradientMap:oe,opaque:v.transparent===!1&&v.blending===cs&&v.alphaToCoverage===!1,alphaMap:_e,alphaTest:te,alphaHash:Z,combine:v.combine,mapUv:Be&&_(v.map.channel),aoMapUv:ft&&_(v.aoMap.channel),lightMapUv:ke&&_(v.lightMap.channel),bumpMapUv:Ue&&_(v.bumpMap.channel),normalMapUv:Me&&_(v.normalMap.channel),displacementMapUv:pt&&_(v.displacementMap.channel),emissiveMapUv:Se&&_(v.emissiveMap.channel),metalnessMapUv:We&&_(v.metalnessMap.channel),roughnessMapUv:Lt&&_(v.roughnessMap.channel),anisotropyMapUv:$&&_(v.anisotropyMap.channel),clearcoatMapUv:Ce&&_(v.clearcoatMap.channel),clearcoatNormalMapUv:ae&&_(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:be&&_(v.clearcoatRoughnessMap.channel),iridescenceMapUv:Te&&_(v.iridescenceMap.channel),iridescenceThicknessMapUv:ie&&_(v.iridescenceThicknessMap.channel),sheenColorMapUv:fe&&_(v.sheenColorMap.channel),sheenRoughnessMapUv:De&&_(v.sheenRoughnessMap.channel),specularMapUv:we&&_(v.specularMap.channel),specularColorMapUv:de&&_(v.specularColorMap.channel),specularIntensityMapUv:ze&&_(v.specularIntensityMap.channel),transmissionMapUv:O&&_(v.transmissionMap.channel),thicknessMapUv:se&&_(v.thicknessMap.channel),alphaMapUv:_e&&_(v.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(Me||Mt),vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,pointsUvs:B.isPoints===!0&&!!F.attributes.uv&&(Be||_e),fog:!!U,useFog:v.fog===!0,fogExp2:!!U&&U.isFogExp2,flatShading:v.flatShading===!0&&v.wireframe===!1,sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:he,skinning:B.isSkinnedMesh===!0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:ce,morphTextureStride:Ee,numDirLights:y.directional.length,numPointLights:y.point.length,numSpotLights:y.spot.length,numSpotLightMaps:y.spotLightMap.length,numRectAreaLights:y.rectArea.length,numHemiLights:y.hemi.length,numDirLightShadows:y.directionalShadowMap.length,numPointLightShadows:y.pointShadowMap.length,numSpotLightShadows:y.spotShadowMap.length,numSpotLightShadowsWithMaps:y.numSpotLightShadowsWithMaps,numLightProbes:y.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:v.dithering,shadowMapEnabled:i.shadowMap.enabled&&C.length>0,shadowMapType:i.shadowMap.type,toneMapping:Oe,decodeVideoTexture:Be&&v.map.isVideoTexture===!0&&je.getTransfer(v.map.colorSpace)===rt,decodeVideoTextureEmissive:Se&&v.emissiveMap.isVideoTexture===!0&&je.getTransfer(v.emissiveMap.colorSpace)===rt,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===sn,flipSided:v.side===Kt,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:ye&&v.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ye&&v.extensions.multiDraw===!0||xe)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return dt.vertexUv1s=c.has(1),dt.vertexUv2s=c.has(2),dt.vertexUv3s=c.has(3),c.clear(),dt}function p(v){const y=[];if(v.shaderID?y.push(v.shaderID):(y.push(v.customVertexShaderID),y.push(v.customFragmentShaderID)),v.defines!==void 0)for(const C in v.defines)y.push(C),y.push(v.defines[C]);return v.isRawShaderMaterial===!1&&(E(y,v),b(y,v),y.push(i.outputColorSpace)),y.push(v.customProgramCacheKey),y.join()}function E(v,y){v.push(y.precision),v.push(y.outputColorSpace),v.push(y.envMapMode),v.push(y.envMapCubeUVHeight),v.push(y.mapUv),v.push(y.alphaMapUv),v.push(y.lightMapUv),v.push(y.aoMapUv),v.push(y.bumpMapUv),v.push(y.normalMapUv),v.push(y.displacementMapUv),v.push(y.emissiveMapUv),v.push(y.metalnessMapUv),v.push(y.roughnessMapUv),v.push(y.anisotropyMapUv),v.push(y.clearcoatMapUv),v.push(y.clearcoatNormalMapUv),v.push(y.clearcoatRoughnessMapUv),v.push(y.iridescenceMapUv),v.push(y.iridescenceThicknessMapUv),v.push(y.sheenColorMapUv),v.push(y.sheenRoughnessMapUv),v.push(y.specularMapUv),v.push(y.specularColorMapUv),v.push(y.specularIntensityMapUv),v.push(y.transmissionMapUv),v.push(y.thicknessMapUv),v.push(y.combine),v.push(y.fogExp2),v.push(y.sizeAttenuation),v.push(y.morphTargetsCount),v.push(y.morphAttributeCount),v.push(y.numDirLights),v.push(y.numPointLights),v.push(y.numSpotLights),v.push(y.numSpotLightMaps),v.push(y.numHemiLights),v.push(y.numRectAreaLights),v.push(y.numDirLightShadows),v.push(y.numPointLightShadows),v.push(y.numSpotLightShadows),v.push(y.numSpotLightShadowsWithMaps),v.push(y.numLightProbes),v.push(y.shadowMapType),v.push(y.toneMapping),v.push(y.numClippingPlanes),v.push(y.numClipIntersection),v.push(y.depthPacking)}function b(v,y){o.disableAll(),y.supportsVertexTextures&&o.enable(0),y.instancing&&o.enable(1),y.instancingColor&&o.enable(2),y.instancingMorph&&o.enable(3),y.matcap&&o.enable(4),y.envMap&&o.enable(5),y.normalMapObjectSpace&&o.enable(6),y.normalMapTangentSpace&&o.enable(7),y.clearcoat&&o.enable(8),y.iridescence&&o.enable(9),y.alphaTest&&o.enable(10),y.vertexColors&&o.enable(11),y.vertexAlphas&&o.enable(12),y.vertexUv1s&&o.enable(13),y.vertexUv2s&&o.enable(14),y.vertexUv3s&&o.enable(15),y.vertexTangents&&o.enable(16),y.anisotropy&&o.enable(17),y.alphaHash&&o.enable(18),y.batching&&o.enable(19),y.dispersion&&o.enable(20),y.batchingColor&&o.enable(21),y.gradientMap&&o.enable(22),v.push(o.mask),o.disableAll(),y.fog&&o.enable(0),y.useFog&&o.enable(1),y.flatShading&&o.enable(2),y.logarithmicDepthBuffer&&o.enable(3),y.reversedDepthBuffer&&o.enable(4),y.skinning&&o.enable(5),y.morphTargets&&o.enable(6),y.morphNormals&&o.enable(7),y.morphColors&&o.enable(8),y.premultipliedAlpha&&o.enable(9),y.shadowMapEnabled&&o.enable(10),y.doubleSided&&o.enable(11),y.flipSided&&o.enable(12),y.useDepthPacking&&o.enable(13),y.dithering&&o.enable(14),y.transmission&&o.enable(15),y.sheen&&o.enable(16),y.opaque&&o.enable(17),y.pointsUvs&&o.enable(18),y.decodeVideoTexture&&o.enable(19),y.decodeVideoTextureEmissive&&o.enable(20),y.alphaToCoverage&&o.enable(21),v.push(o.mask)}function M(v){const y=g[v.type];let C;if(y){const T=In[y];C=sa.clone(T.uniforms)}else C=v.uniforms;return C}function R(v,y){let C;for(let T=0,B=d.length;T<B;T++){const U=d[T];if(U.cacheKey===y){C=U,++C.usedTimes;break}}return C===void 0&&(C=new I0(i,y,v,r),d.push(C)),C}function w(v){if(--v.usedTimes===0){const y=d.indexOf(v);d[y]=d[d.length-1],d.pop(),v.destroy()}}function I(v){l.remove(v)}function L(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:M,acquireProgram:R,releaseProgram:w,releaseShaderCache:I,programs:d,dispose:L}}function F0(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,l){i.get(a)[o]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function O0(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function Kc(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Zc(){const i=[];let e=0;const t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function a(f,h,u,g,_,m){let p=i[e];return p===void 0?(p={id:f.id,object:f,geometry:h,material:u,groupOrder:g,renderOrder:f.renderOrder,z:_,group:m},i[e]=p):(p.id=f.id,p.object=f,p.geometry=h,p.material=u,p.groupOrder=g,p.renderOrder=f.renderOrder,p.z=_,p.group=m),e++,p}function o(f,h,u,g,_,m){const p=a(f,h,u,g,_,m);u.transmission>0?n.push(p):u.transparent===!0?s.push(p):t.push(p)}function l(f,h,u,g,_,m){const p=a(f,h,u,g,_,m);u.transmission>0?n.unshift(p):u.transparent===!0?s.unshift(p):t.unshift(p)}function c(f,h){t.length>1&&t.sort(f||O0),n.length>1&&n.sort(h||Kc),s.length>1&&s.sort(h||Kc)}function d(){for(let f=e,h=i.length;f<h;f++){const u=i[f];if(u.id===null)break;u.id=null,u.object=null,u.geometry=null,u.material=null,u.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:o,unshift:l,finish:d,sort:c}}function B0(){let i=new WeakMap;function e(n,s){const r=i.get(n);let a;return r===void 0?(a=new Zc,i.set(n,[a])):s>=r.length?(a=new Zc,r.push(a)):a=r[s],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function k0(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new D,color:new Fe};break;case"SpotLight":t={position:new D,direction:new D,color:new Fe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new D,color:new Fe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new D,skyColor:new Fe,groundColor:new Fe};break;case"RectAreaLight":t={color:new Fe,position:new D,halfWidth:new D,halfHeight:new D};break}return i[e.id]=t,t}}}function H0(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ae};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ae};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ae,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let z0=0;function V0(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function G0(i){const e=new k0,t=H0(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new D);const s=new D,r=new ot,a=new ot;function o(c){let d=0,f=0,h=0;for(let v=0;v<9;v++)n.probe[v].set(0,0,0);let u=0,g=0,_=0,m=0,p=0,E=0,b=0,M=0,R=0,w=0,I=0;c.sort(V0);for(let v=0,y=c.length;v<y;v++){const C=c[v],T=C.color,B=C.intensity,U=C.distance,F=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)d+=T.r*B,f+=T.g*B,h+=T.b*B;else if(C.isLightProbe){for(let N=0;N<9;N++)n.probe[N].addScaledVector(C.sh.coefficients[N],B);I++}else if(C.isDirectionalLight){const N=e.get(C);if(N.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const W=C.shadow,V=t.get(C);V.shadowIntensity=W.intensity,V.shadowBias=W.bias,V.shadowNormalBias=W.normalBias,V.shadowRadius=W.radius,V.shadowMapSize=W.mapSize,n.directionalShadow[u]=V,n.directionalShadowMap[u]=F,n.directionalShadowMatrix[u]=C.shadow.matrix,E++}n.directional[u]=N,u++}else if(C.isSpotLight){const N=e.get(C);N.position.setFromMatrixPosition(C.matrixWorld),N.color.copy(T).multiplyScalar(B),N.distance=U,N.coneCos=Math.cos(C.angle),N.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),N.decay=C.decay,n.spot[_]=N;const W=C.shadow;if(C.map&&(n.spotLightMap[R]=C.map,R++,W.updateMatrices(C),C.castShadow&&w++),n.spotLightMatrix[_]=W.matrix,C.castShadow){const V=t.get(C);V.shadowIntensity=W.intensity,V.shadowBias=W.bias,V.shadowNormalBias=W.normalBias,V.shadowRadius=W.radius,V.shadowMapSize=W.mapSize,n.spotShadow[_]=V,n.spotShadowMap[_]=F,M++}_++}else if(C.isRectAreaLight){const N=e.get(C);N.color.copy(T).multiplyScalar(B),N.halfWidth.set(C.width*.5,0,0),N.halfHeight.set(0,C.height*.5,0),n.rectArea[m]=N,m++}else if(C.isPointLight){const N=e.get(C);if(N.color.copy(C.color).multiplyScalar(C.intensity),N.distance=C.distance,N.decay=C.decay,C.castShadow){const W=C.shadow,V=t.get(C);V.shadowIntensity=W.intensity,V.shadowBias=W.bias,V.shadowNormalBias=W.normalBias,V.shadowRadius=W.radius,V.shadowMapSize=W.mapSize,V.shadowCameraNear=W.camera.near,V.shadowCameraFar=W.camera.far,n.pointShadow[g]=V,n.pointShadowMap[g]=F,n.pointShadowMatrix[g]=C.shadow.matrix,b++}n.point[g]=N,g++}else if(C.isHemisphereLight){const N=e.get(C);N.skyColor.copy(C.color).multiplyScalar(B),N.groundColor.copy(C.groundColor).multiplyScalar(B),n.hemi[p]=N,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=le.LTC_FLOAT_1,n.rectAreaLTC2=le.LTC_FLOAT_2):(n.rectAreaLTC1=le.LTC_HALF_1,n.rectAreaLTC2=le.LTC_HALF_2)),n.ambient[0]=d,n.ambient[1]=f,n.ambient[2]=h;const L=n.hash;(L.directionalLength!==u||L.pointLength!==g||L.spotLength!==_||L.rectAreaLength!==m||L.hemiLength!==p||L.numDirectionalShadows!==E||L.numPointShadows!==b||L.numSpotShadows!==M||L.numSpotMaps!==R||L.numLightProbes!==I)&&(n.directional.length=u,n.spot.length=_,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=E,n.directionalShadowMap.length=E,n.pointShadow.length=b,n.pointShadowMap.length=b,n.spotShadow.length=M,n.spotShadowMap.length=M,n.directionalShadowMatrix.length=E,n.pointShadowMatrix.length=b,n.spotLightMatrix.length=M+R-w,n.spotLightMap.length=R,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=I,L.directionalLength=u,L.pointLength=g,L.spotLength=_,L.rectAreaLength=m,L.hemiLength=p,L.numDirectionalShadows=E,L.numPointShadows=b,L.numSpotShadows=M,L.numSpotMaps=R,L.numLightProbes=I,n.version=z0++)}function l(c,d){let f=0,h=0,u=0,g=0,_=0;const m=d.matrixWorldInverse;for(let p=0,E=c.length;p<E;p++){const b=c[p];if(b.isDirectionalLight){const M=n.directional[f];M.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(m),f++}else if(b.isSpotLight){const M=n.spot[u];M.position.setFromMatrixPosition(b.matrixWorld),M.position.applyMatrix4(m),M.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(m),u++}else if(b.isRectAreaLight){const M=n.rectArea[g];M.position.setFromMatrixPosition(b.matrixWorld),M.position.applyMatrix4(m),a.identity(),r.copy(b.matrixWorld),r.premultiply(m),a.extractRotation(r),M.halfWidth.set(b.width*.5,0,0),M.halfHeight.set(0,b.height*.5,0),M.halfWidth.applyMatrix4(a),M.halfHeight.applyMatrix4(a),g++}else if(b.isPointLight){const M=n.point[h];M.position.setFromMatrixPosition(b.matrixWorld),M.position.applyMatrix4(m),h++}else if(b.isHemisphereLight){const M=n.hemi[_];M.direction.setFromMatrixPosition(b.matrixWorld),M.direction.transformDirection(m),_++}}}return{setup:o,setupView:l,state:n}}function jc(i){const e=new G0(i),t=[],n=[];function s(d){c.camera=d,t.length=0,n.length=0}function r(d){t.push(d)}function a(d){n.push(d)}function o(){e.setup(t)}function l(d){e.setupView(t,d)}const c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:o,setupLightsView:l,pushLight:r,pushShadow:a}}function W0(i){let e=new WeakMap;function t(s,r=0){const a=e.get(s);let o;return a===void 0?(o=new jc(i),e.set(s,[o])):r>=a.length?(o=new jc(i),a.push(o)):o=a[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}const X0=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,q0=`uniform sampler2D shadow_pass;
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
}`;function $0(i,e,t){let n=new Tl;const s=new Ae,r=new Ae,a=new at,o=new pf({depthPacking:au}),l=new mf,c={},d=t.maxTextureSize,f={[ui]:Kt,[Kt]:ui,[sn]:sn},h=new Yt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ae},radius:{value:4}},vertexShader:X0,fragmentShader:q0}),u=h.clone();u.defines.HORIZONTAL_PASS=1;const g=new Ft;g.setAttribute("position",new an(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new re(g,h),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Sd;let p=this.type;this.render=function(w,I,L){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||w.length===0)return;const v=i.getRenderTarget(),y=i.getActiveCubeFace(),C=i.getActiveMipmapLevel(),T=i.state;T.setBlending(Kn),T.buffers.depth.getReversed()===!0?T.buffers.color.setClear(0,0,0,0):T.buffers.color.setClear(1,1,1,1),T.buffers.depth.setTest(!0),T.setScissorTest(!1);const B=p!==Xn&&this.type===Xn,U=p===Xn&&this.type!==Xn;for(let F=0,N=w.length;F<N;F++){const W=w[F],V=W.shadow;if(V===void 0){console.warn("THREE.WebGLShadowMap:",W,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;s.copy(V.mapSize);const j=V.getFrameExtents();if(s.multiply(j),r.copy(V.mapSize),(s.x>d||s.y>d)&&(s.x>d&&(r.x=Math.floor(d/j.x),s.x=r.x*j.x,V.mapSize.x=r.x),s.y>d&&(r.y=Math.floor(d/j.y),s.y=r.y*j.y,V.mapSize.y=r.y)),V.map===null||B===!0||U===!0){const ce=this.type!==Xn?{minFilter:rn,magFilter:rn}:{};V.map!==null&&V.map.dispose(),V.map=new Tn(s.x,s.y,ce),V.map.texture.name=W.name+".shadowMap",V.camera.updateProjectionMatrix()}i.setRenderTarget(V.map),i.clear();const ee=V.getViewportCount();for(let ce=0;ce<ee;ce++){const Ee=V.getViewport(ce);a.set(r.x*Ee.x,r.y*Ee.y,r.x*Ee.z,r.y*Ee.w),T.viewport(a),V.updateMatrices(W,ce),n=V.getFrustum(),M(I,L,V.camera,W,this.type)}V.isPointLightShadow!==!0&&this.type===Xn&&E(V,L),V.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(v,y,C)};function E(w,I){const L=e.update(_);h.defines.VSM_SAMPLES!==w.blurSamples&&(h.defines.VSM_SAMPLES=w.blurSamples,u.defines.VSM_SAMPLES=w.blurSamples,h.needsUpdate=!0,u.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new Tn(s.x,s.y)),h.uniforms.shadow_pass.value=w.map.texture,h.uniforms.resolution.value=w.mapSize,h.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(I,null,L,h,_,null),u.uniforms.shadow_pass.value=w.mapPass.texture,u.uniforms.resolution.value=w.mapSize,u.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(I,null,L,u,_,null)}function b(w,I,L,v){let y=null;const C=L.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(C!==void 0)y=C;else if(y=L.isPointLight===!0?l:o,i.localClippingEnabled&&I.clipShadows===!0&&Array.isArray(I.clippingPlanes)&&I.clippingPlanes.length!==0||I.displacementMap&&I.displacementScale!==0||I.alphaMap&&I.alphaTest>0||I.map&&I.alphaTest>0||I.alphaToCoverage===!0){const T=y.uuid,B=I.uuid;let U=c[T];U===void 0&&(U={},c[T]=U);let F=U[B];F===void 0&&(F=y.clone(),U[B]=F,I.addEventListener("dispose",R)),y=F}if(y.visible=I.visible,y.wireframe=I.wireframe,v===Xn?y.side=I.shadowSide!==null?I.shadowSide:I.side:y.side=I.shadowSide!==null?I.shadowSide:f[I.side],y.alphaMap=I.alphaMap,y.alphaTest=I.alphaToCoverage===!0?.5:I.alphaTest,y.map=I.map,y.clipShadows=I.clipShadows,y.clippingPlanes=I.clippingPlanes,y.clipIntersection=I.clipIntersection,y.displacementMap=I.displacementMap,y.displacementScale=I.displacementScale,y.displacementBias=I.displacementBias,y.wireframeLinewidth=I.wireframeLinewidth,y.linewidth=I.linewidth,L.isPointLight===!0&&y.isMeshDistanceMaterial===!0){const T=i.properties.get(y);T.light=L}return y}function M(w,I,L,v,y){if(w.visible===!1)return;if(w.layers.test(I.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&y===Xn)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,w.matrixWorld);const B=e.update(w),U=w.material;if(Array.isArray(U)){const F=B.groups;for(let N=0,W=F.length;N<W;N++){const V=F[N],j=U[V.materialIndex];if(j&&j.visible){const ee=b(w,j,v,y);w.onBeforeShadow(i,w,I,L,B,ee,V),i.renderBufferDirect(L,null,B,ee,w,V),w.onAfterShadow(i,w,I,L,B,ee,V)}}}else if(U.visible){const F=b(w,U,v,y);w.onBeforeShadow(i,w,I,L,B,F,null),i.renderBufferDirect(L,null,B,F,w,null),w.onAfterShadow(i,w,I,L,B,F,null)}}const T=w.children;for(let B=0,U=T.length;B<U;B++)M(T[B],I,L,v,y)}function R(w){w.target.removeEventListener("dispose",R);for(const L in c){const v=c[L],y=w.target.uuid;y in v&&(v[y].dispose(),delete v[y])}}}const Y0={[yo]:xo,[Mo]:bo,[So]:To,[us]:Eo,[xo]:yo,[bo]:Mo,[To]:So,[Eo]:us};function K0(i,e){function t(){let O=!1;const se=new at;let oe=null;const _e=new at(0,0,0,0);return{setMask:function(te){oe!==te&&!O&&(i.colorMask(te,te,te,te),oe=te)},setLocked:function(te){O=te},setClear:function(te,Z,ye,Oe,dt){dt===!0&&(te*=Oe,Z*=Oe,ye*=Oe),se.set(te,Z,ye,Oe),_e.equals(se)===!1&&(i.clearColor(te,Z,ye,Oe),_e.copy(se))},reset:function(){O=!1,oe=null,_e.set(-1,0,0,0)}}}function n(){let O=!1,se=!1,oe=null,_e=null,te=null;return{setReversed:function(Z){if(se!==Z){const ye=e.get("EXT_clip_control");Z?ye.clipControlEXT(ye.LOWER_LEFT_EXT,ye.ZERO_TO_ONE_EXT):ye.clipControlEXT(ye.LOWER_LEFT_EXT,ye.NEGATIVE_ONE_TO_ONE_EXT),se=Z;const Oe=te;te=null,this.setClear(Oe)}},getReversed:function(){return se},setTest:function(Z){Z?Y(i.DEPTH_TEST):he(i.DEPTH_TEST)},setMask:function(Z){oe!==Z&&!O&&(i.depthMask(Z),oe=Z)},setFunc:function(Z){if(se&&(Z=Y0[Z]),_e!==Z){switch(Z){case yo:i.depthFunc(i.NEVER);break;case xo:i.depthFunc(i.ALWAYS);break;case Mo:i.depthFunc(i.LESS);break;case us:i.depthFunc(i.LEQUAL);break;case So:i.depthFunc(i.EQUAL);break;case Eo:i.depthFunc(i.GEQUAL);break;case bo:i.depthFunc(i.GREATER);break;case To:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}_e=Z}},setLocked:function(Z){O=Z},setClear:function(Z){te!==Z&&(se&&(Z=1-Z),i.clearDepth(Z),te=Z)},reset:function(){O=!1,oe=null,_e=null,te=null,se=!1}}}function s(){let O=!1,se=null,oe=null,_e=null,te=null,Z=null,ye=null,Oe=null,dt=null;return{setTest:function(tt){O||(tt?Y(i.STENCIL_TEST):he(i.STENCIL_TEST))},setMask:function(tt){se!==tt&&!O&&(i.stencilMask(tt),se=tt)},setFunc:function(tt,kn,Cn){(oe!==tt||_e!==kn||te!==Cn)&&(i.stencilFunc(tt,kn,Cn),oe=tt,_e=kn,te=Cn)},setOp:function(tt,kn,Cn){(Z!==tt||ye!==kn||Oe!==Cn)&&(i.stencilOp(tt,kn,Cn),Z=tt,ye=kn,Oe=Cn)},setLocked:function(tt){O=tt},setClear:function(tt){dt!==tt&&(i.clearStencil(tt),dt=tt)},reset:function(){O=!1,se=null,oe=null,_e=null,te=null,Z=null,ye=null,Oe=null,dt=null}}}const r=new t,a=new n,o=new s,l=new WeakMap,c=new WeakMap;let d={},f={},h=new WeakMap,u=[],g=null,_=!1,m=null,p=null,E=null,b=null,M=null,R=null,w=null,I=new Fe(0,0,0),L=0,v=!1,y=null,C=null,T=null,B=null,U=null;const F=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let N=!1,W=0;const V=i.getParameter(i.VERSION);V.indexOf("WebGL")!==-1?(W=parseFloat(/^WebGL (\d)/.exec(V)[1]),N=W>=1):V.indexOf("OpenGL ES")!==-1&&(W=parseFloat(/^OpenGL ES (\d)/.exec(V)[1]),N=W>=2);let j=null,ee={};const ce=i.getParameter(i.SCISSOR_BOX),Ee=i.getParameter(i.VIEWPORT),He=new at().fromArray(ce),Qe=new at().fromArray(Ee);function Q(O,se,oe,_e){const te=new Uint8Array(4),Z=i.createTexture();i.bindTexture(O,Z),i.texParameteri(O,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(O,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let ye=0;ye<oe;ye++)O===i.TEXTURE_3D||O===i.TEXTURE_2D_ARRAY?i.texImage3D(se,0,i.RGBA,1,1,_e,0,i.RGBA,i.UNSIGNED_BYTE,te):i.texImage2D(se+ye,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,te);return Z}const z={};z[i.TEXTURE_2D]=Q(i.TEXTURE_2D,i.TEXTURE_2D,1),z[i.TEXTURE_CUBE_MAP]=Q(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),z[i.TEXTURE_2D_ARRAY]=Q(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),z[i.TEXTURE_3D]=Q(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),Y(i.DEPTH_TEST),a.setFunc(us),Ue(!1),Me(ql),Y(i.CULL_FACE),ft(Kn);function Y(O){d[O]!==!0&&(i.enable(O),d[O]=!0)}function he(O){d[O]!==!1&&(i.disable(O),d[O]=!1)}function Re(O,se){return f[O]!==se?(i.bindFramebuffer(O,se),f[O]=se,O===i.DRAW_FRAMEBUFFER&&(f[i.FRAMEBUFFER]=se),O===i.FRAMEBUFFER&&(f[i.DRAW_FRAMEBUFFER]=se),!0):!1}function xe(O,se){let oe=u,_e=!1;if(O){oe=h.get(se),oe===void 0&&(oe=[],h.set(se,oe));const te=O.textures;if(oe.length!==te.length||oe[0]!==i.COLOR_ATTACHMENT0){for(let Z=0,ye=te.length;Z<ye;Z++)oe[Z]=i.COLOR_ATTACHMENT0+Z;oe.length=te.length,_e=!0}}else oe[0]!==i.BACK&&(oe[0]=i.BACK,_e=!0);_e&&i.drawBuffers(oe)}function Be(O){return g!==O?(i.useProgram(O),g=O,!0):!1}const Et={[Ti]:i.FUNC_ADD,[Dh]:i.FUNC_SUBTRACT,[Uh]:i.FUNC_REVERSE_SUBTRACT};Et[Nh]=i.MIN,Et[Fh]=i.MAX;const P={[Oh]:i.ZERO,[Bh]:i.ONE,[kh]:i.SRC_COLOR,[_o]:i.SRC_ALPHA,[Xh]:i.SRC_ALPHA_SATURATE,[Gh]:i.DST_COLOR,[zh]:i.DST_ALPHA,[Hh]:i.ONE_MINUS_SRC_COLOR,[vo]:i.ONE_MINUS_SRC_ALPHA,[Wh]:i.ONE_MINUS_DST_COLOR,[Vh]:i.ONE_MINUS_DST_ALPHA,[qh]:i.CONSTANT_COLOR,[$h]:i.ONE_MINUS_CONSTANT_COLOR,[Yh]:i.CONSTANT_ALPHA,[Kh]:i.ONE_MINUS_CONSTANT_ALPHA};function ft(O,se,oe,_e,te,Z,ye,Oe,dt,tt){if(O===Kn){_===!0&&(he(i.BLEND),_=!1);return}if(_===!1&&(Y(i.BLEND),_=!0),O!==Lh){if(O!==m||tt!==v){if((p!==Ti||M!==Ti)&&(i.blendEquation(i.FUNC_ADD),p=Ti,M=Ti),tt)switch(O){case cs:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case go:i.blendFunc(i.ONE,i.ONE);break;case $l:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Yl:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",O);break}else switch(O){case cs:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case go:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case $l:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Yl:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",O);break}E=null,b=null,R=null,w=null,I.set(0,0,0),L=0,m=O,v=tt}return}te=te||se,Z=Z||oe,ye=ye||_e,(se!==p||te!==M)&&(i.blendEquationSeparate(Et[se],Et[te]),p=se,M=te),(oe!==E||_e!==b||Z!==R||ye!==w)&&(i.blendFuncSeparate(P[oe],P[_e],P[Z],P[ye]),E=oe,b=_e,R=Z,w=ye),(Oe.equals(I)===!1||dt!==L)&&(i.blendColor(Oe.r,Oe.g,Oe.b,dt),I.copy(Oe),L=dt),m=O,v=!1}function ke(O,se){O.side===sn?he(i.CULL_FACE):Y(i.CULL_FACE);let oe=O.side===Kt;se&&(oe=!oe),Ue(oe),O.blending===cs&&O.transparent===!1?ft(Kn):ft(O.blending,O.blendEquation,O.blendSrc,O.blendDst,O.blendEquationAlpha,O.blendSrcAlpha,O.blendDstAlpha,O.blendColor,O.blendAlpha,O.premultipliedAlpha),a.setFunc(O.depthFunc),a.setTest(O.depthTest),a.setMask(O.depthWrite),r.setMask(O.colorWrite);const _e=O.stencilWrite;o.setTest(_e),_e&&(o.setMask(O.stencilWriteMask),o.setFunc(O.stencilFunc,O.stencilRef,O.stencilFuncMask),o.setOp(O.stencilFail,O.stencilZFail,O.stencilZPass)),Se(O.polygonOffset,O.polygonOffsetFactor,O.polygonOffsetUnits),O.alphaToCoverage===!0?Y(i.SAMPLE_ALPHA_TO_COVERAGE):he(i.SAMPLE_ALPHA_TO_COVERAGE)}function Ue(O){y!==O&&(O?i.frontFace(i.CW):i.frontFace(i.CCW),y=O)}function Me(O){O!==Ph?(Y(i.CULL_FACE),O!==C&&(O===ql?i.cullFace(i.BACK):O===Ih?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):he(i.CULL_FACE),C=O}function pt(O){O!==T&&(N&&i.lineWidth(O),T=O)}function Se(O,se,oe){O?(Y(i.POLYGON_OFFSET_FILL),(B!==se||U!==oe)&&(i.polygonOffset(se,oe),B=se,U=oe)):he(i.POLYGON_OFFSET_FILL)}function We(O){O?Y(i.SCISSOR_TEST):he(i.SCISSOR_TEST)}function Lt(O){O===void 0&&(O=i.TEXTURE0+F-1),j!==O&&(i.activeTexture(O),j=O)}function Mt(O,se,oe){oe===void 0&&(j===null?oe=i.TEXTURE0+F-1:oe=j);let _e=ee[oe];_e===void 0&&(_e={type:void 0,texture:void 0},ee[oe]=_e),(_e.type!==O||_e.texture!==se)&&(j!==oe&&(i.activeTexture(oe),j=oe),i.bindTexture(O,se||z[O]),_e.type=O,_e.texture=se)}function A(){const O=ee[j];O!==void 0&&O.type!==void 0&&(i.bindTexture(O.type,null),O.type=void 0,O.texture=void 0)}function x(){try{i.compressedTexImage2D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function G(){try{i.compressedTexImage3D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function K(){try{i.texSubImage2D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function J(){try{i.texSubImage3D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function $(){try{i.compressedTexSubImage2D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function Ce(){try{i.compressedTexSubImage3D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function ae(){try{i.texStorage2D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function be(){try{i.texStorage3D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function Te(){try{i.texImage2D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function ie(){try{i.texImage3D(...arguments)}catch(O){console.error("THREE.WebGLState:",O)}}function fe(O){He.equals(O)===!1&&(i.scissor(O.x,O.y,O.z,O.w),He.copy(O))}function De(O){Qe.equals(O)===!1&&(i.viewport(O.x,O.y,O.z,O.w),Qe.copy(O))}function we(O,se){let oe=c.get(se);oe===void 0&&(oe=new WeakMap,c.set(se,oe));let _e=oe.get(O);_e===void 0&&(_e=i.getUniformBlockIndex(se,O.name),oe.set(O,_e))}function de(O,se){const _e=c.get(se).get(O);l.get(se)!==_e&&(i.uniformBlockBinding(se,_e,O.__bindingPointIndex),l.set(se,_e))}function ze(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),d={},j=null,ee={},f={},h=new WeakMap,u=[],g=null,_=!1,m=null,p=null,E=null,b=null,M=null,R=null,w=null,I=new Fe(0,0,0),L=0,v=!1,y=null,C=null,T=null,B=null,U=null,He.set(0,0,i.canvas.width,i.canvas.height),Qe.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:Y,disable:he,bindFramebuffer:Re,drawBuffers:xe,useProgram:Be,setBlending:ft,setMaterial:ke,setFlipSided:Ue,setCullFace:Me,setLineWidth:pt,setPolygonOffset:Se,setScissorTest:We,activeTexture:Lt,bindTexture:Mt,unbindTexture:A,compressedTexImage2D:x,compressedTexImage3D:G,texImage2D:Te,texImage3D:ie,updateUBOMapping:we,uniformBlockBinding:de,texStorage2D:ae,texStorage3D:be,texSubImage2D:K,texSubImage3D:J,compressedTexSubImage2D:$,compressedTexSubImage3D:Ce,scissor:fe,viewport:De,reset:ze}}function Z0(i,e,t,n,s,r,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Ae,d=new WeakMap;let f;const h=new WeakMap;let u=!1;try{u=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(A,x){return u?new OffscreenCanvas(A,x):ia("canvas")}function _(A,x,G){let K=1;const J=Mt(A);if((J.width>G||J.height>G)&&(K=G/Math.max(J.width,J.height)),K<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){const $=Math.floor(K*J.width),Ce=Math.floor(K*J.height);f===void 0&&(f=g($,Ce));const ae=x?g($,Ce):f;return ae.width=$,ae.height=Ce,ae.getContext("2d").drawImage(A,0,0,$,Ce),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+J.width+"x"+J.height+") to ("+$+"x"+Ce+")."),ae}else return"data"in A&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+J.width+"x"+J.height+")."),A;return A}function m(A){return A.generateMipmaps}function p(A){i.generateMipmap(A)}function E(A){return A.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?i.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function b(A,x,G,K,J=!1){if(A!==null){if(i[A]!==void 0)return i[A];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let $=x;if(x===i.RED&&(G===i.FLOAT&&($=i.R32F),G===i.HALF_FLOAT&&($=i.R16F),G===i.UNSIGNED_BYTE&&($=i.R8)),x===i.RED_INTEGER&&(G===i.UNSIGNED_BYTE&&($=i.R8UI),G===i.UNSIGNED_SHORT&&($=i.R16UI),G===i.UNSIGNED_INT&&($=i.R32UI),G===i.BYTE&&($=i.R8I),G===i.SHORT&&($=i.R16I),G===i.INT&&($=i.R32I)),x===i.RG&&(G===i.FLOAT&&($=i.RG32F),G===i.HALF_FLOAT&&($=i.RG16F),G===i.UNSIGNED_BYTE&&($=i.RG8)),x===i.RG_INTEGER&&(G===i.UNSIGNED_BYTE&&($=i.RG8UI),G===i.UNSIGNED_SHORT&&($=i.RG16UI),G===i.UNSIGNED_INT&&($=i.RG32UI),G===i.BYTE&&($=i.RG8I),G===i.SHORT&&($=i.RG16I),G===i.INT&&($=i.RG32I)),x===i.RGB_INTEGER&&(G===i.UNSIGNED_BYTE&&($=i.RGB8UI),G===i.UNSIGNED_SHORT&&($=i.RGB16UI),G===i.UNSIGNED_INT&&($=i.RGB32UI),G===i.BYTE&&($=i.RGB8I),G===i.SHORT&&($=i.RGB16I),G===i.INT&&($=i.RGB32I)),x===i.RGBA_INTEGER&&(G===i.UNSIGNED_BYTE&&($=i.RGBA8UI),G===i.UNSIGNED_SHORT&&($=i.RGBA16UI),G===i.UNSIGNED_INT&&($=i.RGBA32UI),G===i.BYTE&&($=i.RGBA8I),G===i.SHORT&&($=i.RGBA16I),G===i.INT&&($=i.RGBA32I)),x===i.RGB&&(G===i.UNSIGNED_INT_5_9_9_9_REV&&($=i.RGB9_E5),G===i.UNSIGNED_INT_10F_11F_11F_REV&&($=i.R11F_G11F_B10F)),x===i.RGBA){const Ce=J?ta:je.getTransfer(K);G===i.FLOAT&&($=i.RGBA32F),G===i.HALF_FLOAT&&($=i.RGBA16F),G===i.UNSIGNED_BYTE&&($=Ce===rt?i.SRGB8_ALPHA8:i.RGBA8),G===i.UNSIGNED_SHORT_4_4_4_4&&($=i.RGBA4),G===i.UNSIGNED_SHORT_5_5_5_1&&($=i.RGB5_A1)}return($===i.R16F||$===i.R32F||$===i.RG16F||$===i.RG32F||$===i.RGBA16F||$===i.RGBA32F)&&e.get("EXT_color_buffer_float"),$}function M(A,x){let G;return A?x===null||x===Di||x===Xs?G=i.DEPTH24_STENCIL8:x===Un?G=i.DEPTH32F_STENCIL8:x===Ws&&(G=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===Di||x===Xs?G=i.DEPTH_COMPONENT24:x===Un?G=i.DEPTH_COMPONENT32F:x===Ws&&(G=i.DEPTH_COMPONENT16),G}function R(A,x){return m(A)===!0||A.isFramebufferTexture&&A.minFilter!==rn&&A.minFilter!==Sn?Math.log2(Math.max(x.width,x.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?x.mipmaps.length:1}function w(A){const x=A.target;x.removeEventListener("dispose",w),L(x),x.isVideoTexture&&d.delete(x)}function I(A){const x=A.target;x.removeEventListener("dispose",I),y(x)}function L(A){const x=n.get(A);if(x.__webglInit===void 0)return;const G=A.source,K=h.get(G);if(K){const J=K[x.__cacheKey];J.usedTimes--,J.usedTimes===0&&v(A),Object.keys(K).length===0&&h.delete(G)}n.remove(A)}function v(A){const x=n.get(A);i.deleteTexture(x.__webglTexture);const G=A.source,K=h.get(G);delete K[x.__cacheKey],a.memory.textures--}function y(A){const x=n.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),n.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(x.__webglFramebuffer[K]))for(let J=0;J<x.__webglFramebuffer[K].length;J++)i.deleteFramebuffer(x.__webglFramebuffer[K][J]);else i.deleteFramebuffer(x.__webglFramebuffer[K]);x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer[K])}else{if(Array.isArray(x.__webglFramebuffer))for(let K=0;K<x.__webglFramebuffer.length;K++)i.deleteFramebuffer(x.__webglFramebuffer[K]);else i.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&i.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let K=0;K<x.__webglColorRenderbuffer.length;K++)x.__webglColorRenderbuffer[K]&&i.deleteRenderbuffer(x.__webglColorRenderbuffer[K]);x.__webglDepthRenderbuffer&&i.deleteRenderbuffer(x.__webglDepthRenderbuffer)}const G=A.textures;for(let K=0,J=G.length;K<J;K++){const $=n.get(G[K]);$.__webglTexture&&(i.deleteTexture($.__webglTexture),a.memory.textures--),n.remove(G[K])}n.remove(A)}let C=0;function T(){C=0}function B(){const A=C;return A>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+s.maxTextures),C+=1,A}function U(A){const x=[];return x.push(A.wrapS),x.push(A.wrapT),x.push(A.wrapR||0),x.push(A.magFilter),x.push(A.minFilter),x.push(A.anisotropy),x.push(A.internalFormat),x.push(A.format),x.push(A.type),x.push(A.generateMipmaps),x.push(A.premultiplyAlpha),x.push(A.flipY),x.push(A.unpackAlignment),x.push(A.colorSpace),x.join()}function F(A,x){const G=n.get(A);if(A.isVideoTexture&&We(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&G.__version!==A.version){const K=A.image;if(K===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(K.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{z(G,A,x);return}}else A.isExternalTexture&&(G.__webglTexture=A.sourceTexture?A.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,G.__webglTexture,i.TEXTURE0+x)}function N(A,x){const G=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&G.__version!==A.version){z(G,A,x);return}t.bindTexture(i.TEXTURE_2D_ARRAY,G.__webglTexture,i.TEXTURE0+x)}function W(A,x){const G=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&G.__version!==A.version){z(G,A,x);return}t.bindTexture(i.TEXTURE_3D,G.__webglTexture,i.TEXTURE0+x)}function V(A,x){const G=n.get(A);if(A.version>0&&G.__version!==A.version){Y(G,A,x);return}t.bindTexture(i.TEXTURE_CUBE_MAP,G.__webglTexture,i.TEXTURE0+x)}const j={[Co]:i.REPEAT,[Ri]:i.CLAMP_TO_EDGE,[Ro]:i.MIRRORED_REPEAT},ee={[rn]:i.NEAREST,[su]:i.NEAREST_MIPMAP_NEAREST,[cr]:i.NEAREST_MIPMAP_LINEAR,[Sn]:i.LINEAR,[Ea]:i.LINEAR_MIPMAP_NEAREST,[Pi]:i.LINEAR_MIPMAP_LINEAR},ce={[lu]:i.NEVER,[pu]:i.ALWAYS,[cu]:i.LESS,[Nd]:i.LEQUAL,[du]:i.EQUAL,[fu]:i.GEQUAL,[hu]:i.GREATER,[uu]:i.NOTEQUAL};function Ee(A,x){if(x.type===Un&&e.has("OES_texture_float_linear")===!1&&(x.magFilter===Sn||x.magFilter===Ea||x.magFilter===cr||x.magFilter===Pi||x.minFilter===Sn||x.minFilter===Ea||x.minFilter===cr||x.minFilter===Pi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(A,i.TEXTURE_WRAP_S,j[x.wrapS]),i.texParameteri(A,i.TEXTURE_WRAP_T,j[x.wrapT]),(A===i.TEXTURE_3D||A===i.TEXTURE_2D_ARRAY)&&i.texParameteri(A,i.TEXTURE_WRAP_R,j[x.wrapR]),i.texParameteri(A,i.TEXTURE_MAG_FILTER,ee[x.magFilter]),i.texParameteri(A,i.TEXTURE_MIN_FILTER,ee[x.minFilter]),x.compareFunction&&(i.texParameteri(A,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(A,i.TEXTURE_COMPARE_FUNC,ce[x.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===rn||x.minFilter!==cr&&x.minFilter!==Pi||x.type===Un&&e.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||n.get(x).__currentAnisotropy){const G=e.get("EXT_texture_filter_anisotropic");i.texParameterf(A,G.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,s.getMaxAnisotropy())),n.get(x).__currentAnisotropy=x.anisotropy}}}function He(A,x){let G=!1;A.__webglInit===void 0&&(A.__webglInit=!0,x.addEventListener("dispose",w));const K=x.source;let J=h.get(K);J===void 0&&(J={},h.set(K,J));const $=U(x);if($!==A.__cacheKey){J[$]===void 0&&(J[$]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,G=!0),J[$].usedTimes++;const Ce=J[A.__cacheKey];Ce!==void 0&&(J[A.__cacheKey].usedTimes--,Ce.usedTimes===0&&v(x)),A.__cacheKey=$,A.__webglTexture=J[$].texture}return G}function Qe(A,x,G){return Math.floor(Math.floor(A/G)/x)}function Q(A,x,G,K){const $=A.updateRanges;if($.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,x.width,x.height,G,K,x.data);else{$.sort((ie,fe)=>ie.start-fe.start);let Ce=0;for(let ie=1;ie<$.length;ie++){const fe=$[Ce],De=$[ie],we=fe.start+fe.count,de=Qe(De.start,x.width,4),ze=Qe(fe.start,x.width,4);De.start<=we+1&&de===ze&&Qe(De.start+De.count-1,x.width,4)===de?fe.count=Math.max(fe.count,De.start+De.count-fe.start):(++Ce,$[Ce]=De)}$.length=Ce+1;const ae=i.getParameter(i.UNPACK_ROW_LENGTH),be=i.getParameter(i.UNPACK_SKIP_PIXELS),Te=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,x.width);for(let ie=0,fe=$.length;ie<fe;ie++){const De=$[ie],we=Math.floor(De.start/4),de=Math.ceil(De.count/4),ze=we%x.width,O=Math.floor(we/x.width),se=de,oe=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,ze),i.pixelStorei(i.UNPACK_SKIP_ROWS,O),t.texSubImage2D(i.TEXTURE_2D,0,ze,O,se,oe,G,K,x.data)}A.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,ae),i.pixelStorei(i.UNPACK_SKIP_PIXELS,be),i.pixelStorei(i.UNPACK_SKIP_ROWS,Te)}}function z(A,x,G){let K=i.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(K=i.TEXTURE_2D_ARRAY),x.isData3DTexture&&(K=i.TEXTURE_3D);const J=He(A,x),$=x.source;t.bindTexture(K,A.__webglTexture,i.TEXTURE0+G);const Ce=n.get($);if($.version!==Ce.__version||J===!0){t.activeTexture(i.TEXTURE0+G);const ae=je.getPrimaries(je.workingColorSpace),be=x.colorSpace===ci?null:je.getPrimaries(x.colorSpace),Te=x.colorSpace===ci||ae===be?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Te);let ie=_(x.image,!1,s.maxTextureSize);ie=Lt(x,ie);const fe=r.convert(x.format,x.colorSpace),De=r.convert(x.type);let we=b(x.internalFormat,fe,De,x.colorSpace,x.isVideoTexture);Ee(K,x);let de;const ze=x.mipmaps,O=x.isVideoTexture!==!0,se=Ce.__version===void 0||J===!0,oe=$.dataReady,_e=R(x,ie);if(x.isDepthTexture)we=M(x.format===$s,x.type),se&&(O?t.texStorage2D(i.TEXTURE_2D,1,we,ie.width,ie.height):t.texImage2D(i.TEXTURE_2D,0,we,ie.width,ie.height,0,fe,De,null));else if(x.isDataTexture)if(ze.length>0){O&&se&&t.texStorage2D(i.TEXTURE_2D,_e,we,ze[0].width,ze[0].height);for(let te=0,Z=ze.length;te<Z;te++)de=ze[te],O?oe&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,de.width,de.height,fe,De,de.data):t.texImage2D(i.TEXTURE_2D,te,we,de.width,de.height,0,fe,De,de.data);x.generateMipmaps=!1}else O?(se&&t.texStorage2D(i.TEXTURE_2D,_e,we,ie.width,ie.height),oe&&Q(x,ie,fe,De)):t.texImage2D(i.TEXTURE_2D,0,we,ie.width,ie.height,0,fe,De,ie.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){O&&se&&t.texStorage3D(i.TEXTURE_2D_ARRAY,_e,we,ze[0].width,ze[0].height,ie.depth);for(let te=0,Z=ze.length;te<Z;te++)if(de=ze[te],x.format!==En)if(fe!==null)if(O){if(oe)if(x.layerUpdates.size>0){const ye=Ac(de.width,de.height,x.format,x.type);for(const Oe of x.layerUpdates){const dt=de.data.subarray(Oe*ye/de.data.BYTES_PER_ELEMENT,(Oe+1)*ye/de.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,Oe,de.width,de.height,1,fe,dt)}x.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,de.width,de.height,ie.depth,fe,de.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,te,we,de.width,de.height,ie.depth,0,de.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else O?oe&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,de.width,de.height,ie.depth,fe,De,de.data):t.texImage3D(i.TEXTURE_2D_ARRAY,te,we,de.width,de.height,ie.depth,0,fe,De,de.data)}else{O&&se&&t.texStorage2D(i.TEXTURE_2D,_e,we,ze[0].width,ze[0].height);for(let te=0,Z=ze.length;te<Z;te++)de=ze[te],x.format!==En?fe!==null?O?oe&&t.compressedTexSubImage2D(i.TEXTURE_2D,te,0,0,de.width,de.height,fe,de.data):t.compressedTexImage2D(i.TEXTURE_2D,te,we,de.width,de.height,0,de.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):O?oe&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,de.width,de.height,fe,De,de.data):t.texImage2D(i.TEXTURE_2D,te,we,de.width,de.height,0,fe,De,de.data)}else if(x.isDataArrayTexture)if(O){if(se&&t.texStorage3D(i.TEXTURE_2D_ARRAY,_e,we,ie.width,ie.height,ie.depth),oe)if(x.layerUpdates.size>0){const te=Ac(ie.width,ie.height,x.format,x.type);for(const Z of x.layerUpdates){const ye=ie.data.subarray(Z*te/ie.data.BYTES_PER_ELEMENT,(Z+1)*te/ie.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Z,ie.width,ie.height,1,fe,De,ye)}x.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ie.width,ie.height,ie.depth,fe,De,ie.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,we,ie.width,ie.height,ie.depth,0,fe,De,ie.data);else if(x.isData3DTexture)O?(se&&t.texStorage3D(i.TEXTURE_3D,_e,we,ie.width,ie.height,ie.depth),oe&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ie.width,ie.height,ie.depth,fe,De,ie.data)):t.texImage3D(i.TEXTURE_3D,0,we,ie.width,ie.height,ie.depth,0,fe,De,ie.data);else if(x.isFramebufferTexture){if(se)if(O)t.texStorage2D(i.TEXTURE_2D,_e,we,ie.width,ie.height);else{let te=ie.width,Z=ie.height;for(let ye=0;ye<_e;ye++)t.texImage2D(i.TEXTURE_2D,ye,we,te,Z,0,fe,De,null),te>>=1,Z>>=1}}else if(ze.length>0){if(O&&se){const te=Mt(ze[0]);t.texStorage2D(i.TEXTURE_2D,_e,we,te.width,te.height)}for(let te=0,Z=ze.length;te<Z;te++)de=ze[te],O?oe&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,fe,De,de):t.texImage2D(i.TEXTURE_2D,te,we,fe,De,de);x.generateMipmaps=!1}else if(O){if(se){const te=Mt(ie);t.texStorage2D(i.TEXTURE_2D,_e,we,te.width,te.height)}oe&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,fe,De,ie)}else t.texImage2D(i.TEXTURE_2D,0,we,fe,De,ie);m(x)&&p(K),Ce.__version=$.version,x.onUpdate&&x.onUpdate(x)}A.__version=x.version}function Y(A,x,G){if(x.image.length!==6)return;const K=He(A,x),J=x.source;t.bindTexture(i.TEXTURE_CUBE_MAP,A.__webglTexture,i.TEXTURE0+G);const $=n.get(J);if(J.version!==$.__version||K===!0){t.activeTexture(i.TEXTURE0+G);const Ce=je.getPrimaries(je.workingColorSpace),ae=x.colorSpace===ci?null:je.getPrimaries(x.colorSpace),be=x.colorSpace===ci||Ce===ae?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,be);const Te=x.isCompressedTexture||x.image[0].isCompressedTexture,ie=x.image[0]&&x.image[0].isDataTexture,fe=[];for(let Z=0;Z<6;Z++)!Te&&!ie?fe[Z]=_(x.image[Z],!0,s.maxCubemapSize):fe[Z]=ie?x.image[Z].image:x.image[Z],fe[Z]=Lt(x,fe[Z]);const De=fe[0],we=r.convert(x.format,x.colorSpace),de=r.convert(x.type),ze=b(x.internalFormat,we,de,x.colorSpace),O=x.isVideoTexture!==!0,se=$.__version===void 0||K===!0,oe=J.dataReady;let _e=R(x,De);Ee(i.TEXTURE_CUBE_MAP,x);let te;if(Te){O&&se&&t.texStorage2D(i.TEXTURE_CUBE_MAP,_e,ze,De.width,De.height);for(let Z=0;Z<6;Z++){te=fe[Z].mipmaps;for(let ye=0;ye<te.length;ye++){const Oe=te[ye];x.format!==En?we!==null?O?oe&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ye,0,0,Oe.width,Oe.height,we,Oe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ye,ze,Oe.width,Oe.height,0,Oe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):O?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ye,0,0,Oe.width,Oe.height,we,de,Oe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ye,ze,Oe.width,Oe.height,0,we,de,Oe.data)}}}else{if(te=x.mipmaps,O&&se){te.length>0&&_e++;const Z=Mt(fe[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,_e,ze,Z.width,Z.height)}for(let Z=0;Z<6;Z++)if(ie){O?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,fe[Z].width,fe[Z].height,we,de,fe[Z].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,ze,fe[Z].width,fe[Z].height,0,we,de,fe[Z].data);for(let ye=0;ye<te.length;ye++){const dt=te[ye].image[Z].image;O?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ye+1,0,0,dt.width,dt.height,we,de,dt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ye+1,ze,dt.width,dt.height,0,we,de,dt.data)}}else{O?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,we,de,fe[Z]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,ze,we,de,fe[Z]);for(let ye=0;ye<te.length;ye++){const Oe=te[ye];O?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ye+1,0,0,we,de,Oe.image[Z]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ye+1,ze,we,de,Oe.image[Z])}}}m(x)&&p(i.TEXTURE_CUBE_MAP),$.__version=J.version,x.onUpdate&&x.onUpdate(x)}A.__version=x.version}function he(A,x,G,K,J,$){const Ce=r.convert(G.format,G.colorSpace),ae=r.convert(G.type),be=b(G.internalFormat,Ce,ae,G.colorSpace),Te=n.get(x),ie=n.get(G);if(ie.__renderTarget=x,!Te.__hasExternalTextures){const fe=Math.max(1,x.width>>$),De=Math.max(1,x.height>>$);J===i.TEXTURE_3D||J===i.TEXTURE_2D_ARRAY?t.texImage3D(J,$,be,fe,De,x.depth,0,Ce,ae,null):t.texImage2D(J,$,be,fe,De,0,Ce,ae,null)}t.bindFramebuffer(i.FRAMEBUFFER,A),Se(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,K,J,ie.__webglTexture,0,pt(x)):(J===i.TEXTURE_2D||J>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&J<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,K,J,ie.__webglTexture,$),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Re(A,x,G){if(i.bindRenderbuffer(i.RENDERBUFFER,A),x.depthBuffer){const K=x.depthTexture,J=K&&K.isDepthTexture?K.type:null,$=M(x.stencilBuffer,J),Ce=x.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ae=pt(x);Se(x)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ae,$,x.width,x.height):G?i.renderbufferStorageMultisample(i.RENDERBUFFER,ae,$,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,$,x.width,x.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Ce,i.RENDERBUFFER,A)}else{const K=x.textures;for(let J=0;J<K.length;J++){const $=K[J],Ce=r.convert($.format,$.colorSpace),ae=r.convert($.type),be=b($.internalFormat,Ce,ae,$.colorSpace),Te=pt(x);G&&Se(x)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Te,be,x.width,x.height):Se(x)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Te,be,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,be,x.width,x.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function xe(A,x){if(x&&x.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,A),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const K=n.get(x.depthTexture);K.__renderTarget=x,(!K.__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),F(x.depthTexture,0);const J=K.__webglTexture,$=pt(x);if(x.depthTexture.format===qs)Se(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,J,0,$):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,J,0);else if(x.depthTexture.format===$s)Se(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,J,0,$):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,J,0);else throw new Error("Unknown depthTexture format")}function Be(A){const x=n.get(A),G=A.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==A.depthTexture){const K=A.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),K){const J=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,K.removeEventListener("dispose",J)};K.addEventListener("dispose",J),x.__depthDisposeCallback=J}x.__boundDepthTexture=K}if(A.depthTexture&&!x.__autoAllocateDepthBuffer){if(G)throw new Error("target.depthTexture not supported in Cube render targets");const K=A.texture.mipmaps;K&&K.length>0?xe(x.__webglFramebuffer[0],A):xe(x.__webglFramebuffer,A)}else if(G){x.__webglDepthbuffer=[];for(let K=0;K<6;K++)if(t.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[K]),x.__webglDepthbuffer[K]===void 0)x.__webglDepthbuffer[K]=i.createRenderbuffer(),Re(x.__webglDepthbuffer[K],A,!1);else{const J=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,$=x.__webglDepthbuffer[K];i.bindRenderbuffer(i.RENDERBUFFER,$),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,$)}}else{const K=A.texture.mipmaps;if(K&&K.length>0?t.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=i.createRenderbuffer(),Re(x.__webglDepthbuffer,A,!1);else{const J=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,$=x.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,$),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,$)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function Et(A,x,G){const K=n.get(A);x!==void 0&&he(K.__webglFramebuffer,A,A.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),G!==void 0&&Be(A)}function P(A){const x=A.texture,G=n.get(A),K=n.get(x);A.addEventListener("dispose",I);const J=A.textures,$=A.isWebGLCubeRenderTarget===!0,Ce=J.length>1;if(Ce||(K.__webglTexture===void 0&&(K.__webglTexture=i.createTexture()),K.__version=x.version,a.memory.textures++),$){G.__webglFramebuffer=[];for(let ae=0;ae<6;ae++)if(x.mipmaps&&x.mipmaps.length>0){G.__webglFramebuffer[ae]=[];for(let be=0;be<x.mipmaps.length;be++)G.__webglFramebuffer[ae][be]=i.createFramebuffer()}else G.__webglFramebuffer[ae]=i.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){G.__webglFramebuffer=[];for(let ae=0;ae<x.mipmaps.length;ae++)G.__webglFramebuffer[ae]=i.createFramebuffer()}else G.__webglFramebuffer=i.createFramebuffer();if(Ce)for(let ae=0,be=J.length;ae<be;ae++){const Te=n.get(J[ae]);Te.__webglTexture===void 0&&(Te.__webglTexture=i.createTexture(),a.memory.textures++)}if(A.samples>0&&Se(A)===!1){G.__webglMultisampledFramebuffer=i.createFramebuffer(),G.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,G.__webglMultisampledFramebuffer);for(let ae=0;ae<J.length;ae++){const be=J[ae];G.__webglColorRenderbuffer[ae]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,G.__webglColorRenderbuffer[ae]);const Te=r.convert(be.format,be.colorSpace),ie=r.convert(be.type),fe=b(be.internalFormat,Te,ie,be.colorSpace,A.isXRRenderTarget===!0),De=pt(A);i.renderbufferStorageMultisample(i.RENDERBUFFER,De,fe,A.width,A.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ae,i.RENDERBUFFER,G.__webglColorRenderbuffer[ae])}i.bindRenderbuffer(i.RENDERBUFFER,null),A.depthBuffer&&(G.__webglDepthRenderbuffer=i.createRenderbuffer(),Re(G.__webglDepthRenderbuffer,A,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if($){t.bindTexture(i.TEXTURE_CUBE_MAP,K.__webglTexture),Ee(i.TEXTURE_CUBE_MAP,x);for(let ae=0;ae<6;ae++)if(x.mipmaps&&x.mipmaps.length>0)for(let be=0;be<x.mipmaps.length;be++)he(G.__webglFramebuffer[ae][be],A,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ae,be);else he(G.__webglFramebuffer[ae],A,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0);m(x)&&p(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ce){for(let ae=0,be=J.length;ae<be;ae++){const Te=J[ae],ie=n.get(Te);let fe=i.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(fe=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(fe,ie.__webglTexture),Ee(fe,Te),he(G.__webglFramebuffer,A,Te,i.COLOR_ATTACHMENT0+ae,fe,0),m(Te)&&p(fe)}t.unbindTexture()}else{let ae=i.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(ae=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ae,K.__webglTexture),Ee(ae,x),x.mipmaps&&x.mipmaps.length>0)for(let be=0;be<x.mipmaps.length;be++)he(G.__webglFramebuffer[be],A,x,i.COLOR_ATTACHMENT0,ae,be);else he(G.__webglFramebuffer,A,x,i.COLOR_ATTACHMENT0,ae,0);m(x)&&p(ae),t.unbindTexture()}A.depthBuffer&&Be(A)}function ft(A){const x=A.textures;for(let G=0,K=x.length;G<K;G++){const J=x[G];if(m(J)){const $=E(A),Ce=n.get(J).__webglTexture;t.bindTexture($,Ce),p($),t.unbindTexture()}}}const ke=[],Ue=[];function Me(A){if(A.samples>0){if(Se(A)===!1){const x=A.textures,G=A.width,K=A.height;let J=i.COLOR_BUFFER_BIT;const $=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ce=n.get(A),ae=x.length>1;if(ae)for(let Te=0;Te<x.length;Te++)t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Ce.__webglMultisampledFramebuffer);const be=A.texture.mipmaps;be&&be.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ce.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ce.__webglFramebuffer);for(let Te=0;Te<x.length;Te++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(J|=i.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(J|=i.STENCIL_BUFFER_BIT)),ae){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Ce.__webglColorRenderbuffer[Te]);const ie=n.get(x[Te]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,ie,0)}i.blitFramebuffer(0,0,G,K,0,0,G,K,J,i.NEAREST),l===!0&&(ke.length=0,Ue.length=0,ke.push(i.COLOR_ATTACHMENT0+Te),A.depthBuffer&&A.resolveDepthBuffer===!1&&(ke.push($),Ue.push($),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ue)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ke))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ae)for(let Te=0;Te<x.length;Te++){t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.RENDERBUFFER,Ce.__webglColorRenderbuffer[Te]);const ie=n.get(x[Te]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.TEXTURE_2D,ie,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ce.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&l){const x=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[x])}}}function pt(A){return Math.min(s.maxSamples,A.samples)}function Se(A){const x=n.get(A);return A.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function We(A){const x=a.render.frame;d.get(A)!==x&&(d.set(A,x),A.update())}function Lt(A,x){const G=A.colorSpace,K=A.format,J=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||G!==ms&&G!==ci&&(je.getTransfer(G)===rt?(K!==En||J!==On)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",G)),x}function Mt(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=B,this.resetTextureUnits=T,this.setTexture2D=F,this.setTexture2DArray=N,this.setTexture3D=W,this.setTextureCube=V,this.rebindTextures=Et,this.setupRenderTarget=P,this.updateRenderTargetMipmap=ft,this.updateMultisampleRenderTarget=Me,this.setupDepthRenderbuffer=Be,this.setupFrameBufferTexture=he,this.useMultisampledRTT=Se}function j0(i,e){function t(n,s=ci){let r;const a=je.getTransfer(s);if(n===On)return i.UNSIGNED_BYTE;if(n===pl)return i.UNSIGNED_SHORT_4_4_4_4;if(n===ml)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Rd)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Pd)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Ad)return i.BYTE;if(n===Cd)return i.SHORT;if(n===Ws)return i.UNSIGNED_SHORT;if(n===fl)return i.INT;if(n===Di)return i.UNSIGNED_INT;if(n===Un)return i.FLOAT;if(n===Zn)return i.HALF_FLOAT;if(n===Id)return i.ALPHA;if(n===Ld)return i.RGB;if(n===En)return i.RGBA;if(n===qs)return i.DEPTH_COMPONENT;if(n===$s)return i.DEPTH_STENCIL;if(n===gl)return i.RED;if(n===_l)return i.RED_INTEGER;if(n===Dd)return i.RG;if(n===vl)return i.RG_INTEGER;if(n===yl)return i.RGBA_INTEGER;if(n===Wr||n===Xr||n===qr||n===$r)if(a===rt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Wr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Xr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===qr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===$r)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Wr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Xr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===qr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===$r)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Po||n===Io||n===Lo||n===Do)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Po)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Io)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Lo)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Do)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Uo||n===No||n===Fo)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Uo||n===No)return a===rt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Fo)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Oo||n===Bo||n===ko||n===Ho||n===zo||n===Vo||n===Go||n===Wo||n===Xo||n===qo||n===$o||n===Yo||n===Ko||n===Zo)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Oo)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Bo)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===ko)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Ho)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===zo)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Vo)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Go)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Wo)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Xo)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===qo)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===$o)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Yo)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Ko)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Zo)return a===rt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===jo||n===Jo||n===Qo)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===jo)return a===rt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Jo)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Qo)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===el||n===tl||n===nl||n===il)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===el)return r.COMPRESSED_RED_RGTC1_EXT;if(n===tl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===nl)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===il)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Xs?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const J0=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Q0=`
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

}`;class e_{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Yd(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Yt({vertexShader:J0,fragmentShader:Q0,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new re(new An(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class t_ extends vs{constructor(e,t){super();const n=this;let s=null,r=1,a=null,o="local-floor",l=1,c=null,d=null,f=null,h=null,u=null,g=null;const _=typeof XRWebGLBinding<"u",m=new e_,p={},E=t.getContextAttributes();let b=null,M=null;const R=[],w=[],I=new Ae;let L=null;const v=new nn;v.viewport=new at;const y=new nn;y.viewport=new at;const C=[v,y],T=new xf;let B=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(z){let Y=R[z];return Y===void 0&&(Y=new Wa,R[z]=Y),Y.getTargetRaySpace()},this.getControllerGrip=function(z){let Y=R[z];return Y===void 0&&(Y=new Wa,R[z]=Y),Y.getGripSpace()},this.getHand=function(z){let Y=R[z];return Y===void 0&&(Y=new Wa,R[z]=Y),Y.getHandSpace()};function F(z){const Y=w.indexOf(z.inputSource);if(Y===-1)return;const he=R[Y];he!==void 0&&(he.update(z.inputSource,z.frame,c||a),he.dispatchEvent({type:z.type,data:z.inputSource}))}function N(){s.removeEventListener("select",F),s.removeEventListener("selectstart",F),s.removeEventListener("selectend",F),s.removeEventListener("squeeze",F),s.removeEventListener("squeezestart",F),s.removeEventListener("squeezeend",F),s.removeEventListener("end",N),s.removeEventListener("inputsourceschange",W);for(let z=0;z<R.length;z++){const Y=w[z];Y!==null&&(w[z]=null,R[z].disconnect(Y))}B=null,U=null,m.reset();for(const z in p)delete p[z];e.setRenderTarget(b),u=null,h=null,f=null,s=null,M=null,Q.stop(),n.isPresenting=!1,e.setPixelRatio(L),e.setSize(I.width,I.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(z){r=z,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(z){o=z,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(z){c=z},this.getBaseLayer=function(){return h!==null?h:u},this.getBinding=function(){return f===null&&_&&(f=new XRWebGLBinding(s,t)),f},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(z){if(s=z,s!==null){if(b=e.getRenderTarget(),s.addEventListener("select",F),s.addEventListener("selectstart",F),s.addEventListener("selectend",F),s.addEventListener("squeeze",F),s.addEventListener("squeezestart",F),s.addEventListener("squeezeend",F),s.addEventListener("end",N),s.addEventListener("inputsourceschange",W),E.xrCompatible!==!0&&await t.makeXRCompatible(),L=e.getPixelRatio(),e.getSize(I),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let he=null,Re=null,xe=null;E.depth&&(xe=E.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,he=E.stencil?$s:qs,Re=E.stencil?Xs:Di);const Be={colorFormat:t.RGBA8,depthFormat:xe,scaleFactor:r};f=this.getBinding(),h=f.createProjectionLayer(Be),s.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),M=new Tn(h.textureWidth,h.textureHeight,{format:En,type:On,depthTexture:new $d(h.textureWidth,h.textureHeight,Re,void 0,void 0,void 0,void 0,void 0,void 0,he),stencilBuffer:E.stencil,colorSpace:e.outputColorSpace,samples:E.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{const he={antialias:E.antialias,alpha:!0,depth:E.depth,stencil:E.stencil,framebufferScaleFactor:r};u=new XRWebGLLayer(s,t,he),s.updateRenderState({baseLayer:u}),e.setPixelRatio(1),e.setSize(u.framebufferWidth,u.framebufferHeight,!1),M=new Tn(u.framebufferWidth,u.framebufferHeight,{format:En,type:On,colorSpace:e.outputColorSpace,stencilBuffer:E.stencil,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),Q.setContext(s),Q.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function W(z){for(let Y=0;Y<z.removed.length;Y++){const he=z.removed[Y],Re=w.indexOf(he);Re>=0&&(w[Re]=null,R[Re].disconnect(he))}for(let Y=0;Y<z.added.length;Y++){const he=z.added[Y];let Re=w.indexOf(he);if(Re===-1){for(let Be=0;Be<R.length;Be++)if(Be>=w.length){w.push(he),Re=Be;break}else if(w[Be]===null){w[Be]=he,Re=Be;break}if(Re===-1)break}const xe=R[Re];xe&&xe.connect(he)}}const V=new D,j=new D;function ee(z,Y,he){V.setFromMatrixPosition(Y.matrixWorld),j.setFromMatrixPosition(he.matrixWorld);const Re=V.distanceTo(j),xe=Y.projectionMatrix.elements,Be=he.projectionMatrix.elements,Et=xe[14]/(xe[10]-1),P=xe[14]/(xe[10]+1),ft=(xe[9]+1)/xe[5],ke=(xe[9]-1)/xe[5],Ue=(xe[8]-1)/xe[0],Me=(Be[8]+1)/Be[0],pt=Et*Ue,Se=Et*Me,We=Re/(-Ue+Me),Lt=We*-Ue;if(Y.matrixWorld.decompose(z.position,z.quaternion,z.scale),z.translateX(Lt),z.translateZ(We),z.matrixWorld.compose(z.position,z.quaternion,z.scale),z.matrixWorldInverse.copy(z.matrixWorld).invert(),xe[10]===-1)z.projectionMatrix.copy(Y.projectionMatrix),z.projectionMatrixInverse.copy(Y.projectionMatrixInverse);else{const Mt=Et+We,A=P+We,x=pt-Lt,G=Se+(Re-Lt),K=ft*P/A*Mt,J=ke*P/A*Mt;z.projectionMatrix.makePerspective(x,G,K,J,Mt,A),z.projectionMatrixInverse.copy(z.projectionMatrix).invert()}}function ce(z,Y){Y===null?z.matrixWorld.copy(z.matrix):z.matrixWorld.multiplyMatrices(Y.matrixWorld,z.matrix),z.matrixWorldInverse.copy(z.matrixWorld).invert()}this.updateCamera=function(z){if(s===null)return;let Y=z.near,he=z.far;m.texture!==null&&(m.depthNear>0&&(Y=m.depthNear),m.depthFar>0&&(he=m.depthFar)),T.near=y.near=v.near=Y,T.far=y.far=v.far=he,(B!==T.near||U!==T.far)&&(s.updateRenderState({depthNear:T.near,depthFar:T.far}),B=T.near,U=T.far),T.layers.mask=z.layers.mask|6,v.layers.mask=T.layers.mask&3,y.layers.mask=T.layers.mask&5;const Re=z.parent,xe=T.cameras;ce(T,Re);for(let Be=0;Be<xe.length;Be++)ce(xe[Be],Re);xe.length===2?ee(T,v,y):T.projectionMatrix.copy(v.projectionMatrix),Ee(z,T,Re)};function Ee(z,Y,he){he===null?z.matrix.copy(Y.matrixWorld):(z.matrix.copy(he.matrixWorld),z.matrix.invert(),z.matrix.multiply(Y.matrixWorld)),z.matrix.decompose(z.position,z.quaternion,z.scale),z.updateMatrixWorld(!0),z.projectionMatrix.copy(Y.projectionMatrix),z.projectionMatrixInverse.copy(Y.projectionMatrixInverse),z.isPerspectiveCamera&&(z.fov=Ys*2*Math.atan(1/z.projectionMatrix.elements[5]),z.zoom=1)}this.getCamera=function(){return T},this.getFoveation=function(){if(!(h===null&&u===null))return l},this.setFoveation=function(z){l=z,h!==null&&(h.fixedFoveation=z),u!==null&&u.fixedFoveation!==void 0&&(u.fixedFoveation=z)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(T)},this.getCameraTexture=function(z){return p[z]};let He=null;function Qe(z,Y){if(d=Y.getViewerPose(c||a),g=Y,d!==null){const he=d.views;u!==null&&(e.setRenderTargetFramebuffer(M,u.framebuffer),e.setRenderTarget(M));let Re=!1;he.length!==T.cameras.length&&(T.cameras.length=0,Re=!0);for(let P=0;P<he.length;P++){const ft=he[P];let ke=null;if(u!==null)ke=u.getViewport(ft);else{const Me=f.getViewSubImage(h,ft);ke=Me.viewport,P===0&&(e.setRenderTargetTextures(M,Me.colorTexture,Me.depthStencilTexture),e.setRenderTarget(M))}let Ue=C[P];Ue===void 0&&(Ue=new nn,Ue.layers.enable(P),Ue.viewport=new at,C[P]=Ue),Ue.matrix.fromArray(ft.transform.matrix),Ue.matrix.decompose(Ue.position,Ue.quaternion,Ue.scale),Ue.projectionMatrix.fromArray(ft.projectionMatrix),Ue.projectionMatrixInverse.copy(Ue.projectionMatrix).invert(),Ue.viewport.set(ke.x,ke.y,ke.width,ke.height),P===0&&(T.matrix.copy(Ue.matrix),T.matrix.decompose(T.position,T.quaternion,T.scale)),Re===!0&&T.cameras.push(Ue)}const xe=s.enabledFeatures;if(xe&&xe.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&_){f=n.getBinding();const P=f.getDepthInformation(he[0]);P&&P.isValid&&P.texture&&m.init(P,s.renderState)}if(xe&&xe.includes("camera-access")&&_){e.state.unbindTexture(),f=n.getBinding();for(let P=0;P<he.length;P++){const ft=he[P].camera;if(ft){let ke=p[ft];ke||(ke=new Yd,p[ft]=ke);const Ue=f.getCameraImage(ft);ke.sourceTexture=Ue}}}}for(let he=0;he<R.length;he++){const Re=w[he],xe=R[he];Re!==null&&xe!==void 0&&xe.update(Re,Y,c||a)}He&&He(z,Y),Y.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:Y}),g=null}const Q=new Zd;Q.setAnimationLoop(Qe),this.setAnimationLoop=function(z){He=z},this.dispose=function(){}}}const Mi=new Bn,n_=new ot;function i_(i,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,zd(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,E,b,M){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(m,p):p.isMeshToonMaterial?(r(m,p),f(m,p)):p.isMeshPhongMaterial?(r(m,p),d(m,p)):p.isMeshStandardMaterial?(r(m,p),h(m,p),p.isMeshPhysicalMaterial&&u(m,p,M)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),_(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,E,b):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Kt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Kt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const E=e.get(p),b=E.envMap,M=E.envMapRotation;b&&(m.envMap.value=b,Mi.copy(M),Mi.x*=-1,Mi.y*=-1,Mi.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(Mi.y*=-1,Mi.z*=-1),m.envMapRotation.value.setFromMatrix4(n_.makeRotationFromEuler(Mi)),m.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,E,b){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*E,m.scale.value=b*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function d(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function f(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function h(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function u(m,p,E){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Kt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=E.texture,m.transmissionSamplerSize.value.set(E.width,E.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function _(m,p){const E=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(E.matrixWorld),m.nearDistance.value=E.shadow.camera.near,m.farDistance.value=E.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function s_(i,e,t,n){let s={},r={},a=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(E,b){const M=b.program;n.uniformBlockBinding(E,M)}function c(E,b){let M=s[E.id];M===void 0&&(g(E),M=d(E),s[E.id]=M,E.addEventListener("dispose",m));const R=b.program;n.updateUBOMapping(E,R);const w=e.render.frame;r[E.id]!==w&&(h(E),r[E.id]=w)}function d(E){const b=f();E.__bindingPointIndex=b;const M=i.createBuffer(),R=E.__size,w=E.usage;return i.bindBuffer(i.UNIFORM_BUFFER,M),i.bufferData(i.UNIFORM_BUFFER,R,w),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,b,M),M}function f(){for(let E=0;E<o;E++)if(a.indexOf(E)===-1)return a.push(E),E;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(E){const b=s[E.id],M=E.uniforms,R=E.__cache;i.bindBuffer(i.UNIFORM_BUFFER,b);for(let w=0,I=M.length;w<I;w++){const L=Array.isArray(M[w])?M[w]:[M[w]];for(let v=0,y=L.length;v<y;v++){const C=L[v];if(u(C,w,v,R)===!0){const T=C.__offset,B=Array.isArray(C.value)?C.value:[C.value];let U=0;for(let F=0;F<B.length;F++){const N=B[F],W=_(N);typeof N=="number"||typeof N=="boolean"?(C.__data[0]=N,i.bufferSubData(i.UNIFORM_BUFFER,T+U,C.__data)):N.isMatrix3?(C.__data[0]=N.elements[0],C.__data[1]=N.elements[1],C.__data[2]=N.elements[2],C.__data[3]=0,C.__data[4]=N.elements[3],C.__data[5]=N.elements[4],C.__data[6]=N.elements[5],C.__data[7]=0,C.__data[8]=N.elements[6],C.__data[9]=N.elements[7],C.__data[10]=N.elements[8],C.__data[11]=0):(N.toArray(C.__data,U),U+=W.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,T,C.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function u(E,b,M,R){const w=E.value,I=b+"_"+M;if(R[I]===void 0)return typeof w=="number"||typeof w=="boolean"?R[I]=w:R[I]=w.clone(),!0;{const L=R[I];if(typeof w=="number"||typeof w=="boolean"){if(L!==w)return R[I]=w,!0}else if(L.equals(w)===!1)return L.copy(w),!0}return!1}function g(E){const b=E.uniforms;let M=0;const R=16;for(let I=0,L=b.length;I<L;I++){const v=Array.isArray(b[I])?b[I]:[b[I]];for(let y=0,C=v.length;y<C;y++){const T=v[y],B=Array.isArray(T.value)?T.value:[T.value];for(let U=0,F=B.length;U<F;U++){const N=B[U],W=_(N),V=M%R,j=V%W.boundary,ee=V+j;M+=j,ee!==0&&R-ee<W.storage&&(M+=R-ee),T.__data=new Float32Array(W.storage/Float32Array.BYTES_PER_ELEMENT),T.__offset=M,M+=W.storage}}}const w=M%R;return w>0&&(M+=R-w),E.__size=M,E.__cache={},this}function _(E){const b={boundary:0,storage:0};return typeof E=="number"||typeof E=="boolean"?(b.boundary=4,b.storage=4):E.isVector2?(b.boundary=8,b.storage=8):E.isVector3||E.isColor?(b.boundary=16,b.storage=12):E.isVector4?(b.boundary=16,b.storage=16):E.isMatrix3?(b.boundary=48,b.storage=48):E.isMatrix4?(b.boundary=64,b.storage=64):E.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",E),b}function m(E){const b=E.target;b.removeEventListener("dispose",m);const M=a.indexOf(b.__bindingPointIndex);a.splice(M,1),i.deleteBuffer(s[b.id]),delete s[b.id],delete r[b.id]}function p(){for(const E in s)i.deleteBuffer(s[E]);a=[],s={},r={}}return{bind:l,update:c,dispose:p}}class r_{constructor(e={}){const{canvas:t=Lu(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:d="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:h=!1}=e;this.isWebGLRenderer=!0;let u;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");u=n.getContextAttributes().alpha}else u=a;const g=new Uint32Array(4),_=new Int32Array(4);let m=null,p=null;const E=[],b=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=hi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const M=this;let R=!1;this._outputColorSpace=un;let w=0,I=0,L=null,v=-1,y=null;const C=new at,T=new at;let B=null;const U=new Fe(0);let F=0,N=t.width,W=t.height,V=1,j=null,ee=null;const ce=new at(0,0,N,W),Ee=new at(0,0,N,W);let He=!1;const Qe=new Tl;let Q=!1,z=!1;const Y=new ot,he=new D,Re=new at,xe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Be=!1;function Et(){return L===null?V:1}let P=n;function ft(S,k){return t.getContext(S,k)}try{const S={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:d,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${ul}`),t.addEventListener("webglcontextlost",oe,!1),t.addEventListener("webglcontextrestored",_e,!1),t.addEventListener("webglcontextcreationerror",te,!1),P===null){const k="webgl2";if(P=ft(k,S),P===null)throw ft(k)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(S){throw console.error("THREE.WebGLRenderer: "+S.message),S}let ke,Ue,Me,pt,Se,We,Lt,Mt,A,x,G,K,J,$,Ce,ae,be,Te,ie,fe,De,we,de,ze;function O(){ke=new mg(P),ke.init(),we=new j0(P,ke),Ue=new lg(P,ke,e,we),Me=new K0(P,ke),Ue.reversedDepthBuffer&&h&&Me.buffers.depth.setReversed(!0),pt=new vg(P),Se=new F0,We=new Z0(P,ke,Me,Se,Ue,we,pt),Lt=new dg(M),Mt=new pg(M),A=new bf(P),de=new ag(P,A),x=new gg(P,A,pt,de),G=new xg(P,x,A,pt),ie=new yg(P,Ue,We),ae=new cg(Se),K=new N0(M,Lt,Mt,ke,Ue,de,ae),J=new i_(M,Se),$=new B0,Ce=new W0(ke),Te=new rg(M,Lt,Mt,Me,G,u,l),be=new $0(M,G,Ue),ze=new s_(P,pt,Ue,Me),fe=new og(P,ke,pt),De=new _g(P,ke,pt),pt.programs=K.programs,M.capabilities=Ue,M.extensions=ke,M.properties=Se,M.renderLists=$,M.shadowMap=be,M.state=Me,M.info=pt}O();const se=new t_(M,P);this.xr=se,this.getContext=function(){return P},this.getContextAttributes=function(){return P.getContextAttributes()},this.forceContextLoss=function(){const S=ke.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){const S=ke.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return V},this.setPixelRatio=function(S){S!==void 0&&(V=S,this.setSize(N,W,!1))},this.getSize=function(S){return S.set(N,W)},this.setSize=function(S,k,X=!0){if(se.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}N=S,W=k,t.width=Math.floor(S*V),t.height=Math.floor(k*V),X===!0&&(t.style.width=S+"px",t.style.height=k+"px"),this.setViewport(0,0,S,k)},this.getDrawingBufferSize=function(S){return S.set(N*V,W*V).floor()},this.setDrawingBufferSize=function(S,k,X){N=S,W=k,V=X,t.width=Math.floor(S*X),t.height=Math.floor(k*X),this.setViewport(0,0,S,k)},this.getCurrentViewport=function(S){return S.copy(C)},this.getViewport=function(S){return S.copy(ce)},this.setViewport=function(S,k,X,q){S.isVector4?ce.set(S.x,S.y,S.z,S.w):ce.set(S,k,X,q),Me.viewport(C.copy(ce).multiplyScalar(V).round())},this.getScissor=function(S){return S.copy(Ee)},this.setScissor=function(S,k,X,q){S.isVector4?Ee.set(S.x,S.y,S.z,S.w):Ee.set(S,k,X,q),Me.scissor(T.copy(Ee).multiplyScalar(V).round())},this.getScissorTest=function(){return He},this.setScissorTest=function(S){Me.setScissorTest(He=S)},this.setOpaqueSort=function(S){j=S},this.setTransparentSort=function(S){ee=S},this.getClearColor=function(S){return S.copy(Te.getClearColor())},this.setClearColor=function(){Te.setClearColor(...arguments)},this.getClearAlpha=function(){return Te.getClearAlpha()},this.setClearAlpha=function(){Te.setClearAlpha(...arguments)},this.clear=function(S=!0,k=!0,X=!0){let q=0;if(S){let H=!1;if(L!==null){const ne=L.texture.format;H=ne===yl||ne===vl||ne===_l}if(H){const ne=L.texture.type,ue=ne===On||ne===Di||ne===Ws||ne===Xs||ne===pl||ne===ml,ve=Te.getClearColor(),me=Te.getClearAlpha(),Le=ve.r,Ne=ve.g,Pe=ve.b;ue?(g[0]=Le,g[1]=Ne,g[2]=Pe,g[3]=me,P.clearBufferuiv(P.COLOR,0,g)):(_[0]=Le,_[1]=Ne,_[2]=Pe,_[3]=me,P.clearBufferiv(P.COLOR,0,_))}else q|=P.COLOR_BUFFER_BIT}k&&(q|=P.DEPTH_BUFFER_BIT),X&&(q|=P.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),P.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",oe,!1),t.removeEventListener("webglcontextrestored",_e,!1),t.removeEventListener("webglcontextcreationerror",te,!1),Te.dispose(),$.dispose(),Ce.dispose(),Se.dispose(),Lt.dispose(),Mt.dispose(),G.dispose(),de.dispose(),ze.dispose(),K.dispose(),se.dispose(),se.removeEventListener("sessionstart",Cn),se.removeEventListener("sessionend",Hl),pi.stop()};function oe(S){S.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),R=!0}function _e(){console.log("THREE.WebGLRenderer: Context Restored."),R=!1;const S=pt.autoReset,k=be.enabled,X=be.autoUpdate,q=be.needsUpdate,H=be.type;O(),pt.autoReset=S,be.enabled=k,be.autoUpdate=X,be.needsUpdate=q,be.type=H}function te(S){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function Z(S){const k=S.target;k.removeEventListener("dispose",Z),ye(k)}function ye(S){Oe(S),Se.remove(S)}function Oe(S){const k=Se.get(S).programs;k!==void 0&&(k.forEach(function(X){K.releaseProgram(X)}),S.isShaderMaterial&&K.releaseShaderCache(S))}this.renderBufferDirect=function(S,k,X,q,H,ne){k===null&&(k=xe);const ue=H.isMesh&&H.matrixWorld.determinant()<0,ve=Sh(S,k,X,q,H);Me.setMaterial(q,ue);let me=X.index,Le=1;if(q.wireframe===!0){if(me=x.getWireframeAttribute(X),me===void 0)return;Le=2}const Ne=X.drawRange,Pe=X.attributes.position;let Ye=Ne.start*Le,it=(Ne.start+Ne.count)*Le;ne!==null&&(Ye=Math.max(Ye,ne.start*Le),it=Math.min(it,(ne.start+ne.count)*Le)),me!==null?(Ye=Math.max(Ye,0),it=Math.min(it,me.count)):Pe!=null&&(Ye=Math.max(Ye,0),it=Math.min(it,Pe.count));const yt=it-Ye;if(yt<0||yt===1/0)return;de.setup(H,q,ve,X,me);let ut,lt=fe;if(me!==null&&(ut=A.get(me),lt=De,lt.setIndex(ut)),H.isMesh)q.wireframe===!0?(Me.setLineWidth(q.wireframeLinewidth*Et()),lt.setMode(P.LINES)):lt.setMode(P.TRIANGLES);else if(H.isLine){let Ie=q.linewidth;Ie===void 0&&(Ie=1),Me.setLineWidth(Ie*Et()),H.isLineSegments?lt.setMode(P.LINES):H.isLineLoop?lt.setMode(P.LINE_LOOP):lt.setMode(P.LINE_STRIP)}else H.isPoints?lt.setMode(P.POINTS):H.isSprite&&lt.setMode(P.TRIANGLES);if(H.isBatchedMesh)if(H._multiDrawInstances!==null)Ks("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),lt.renderMultiDrawInstances(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount,H._multiDrawInstances);else if(ke.get("WEBGL_multi_draw"))lt.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{const Ie=H._multiDrawStarts,gt=H._multiDrawCounts,Ze=H._multiDrawCount,jt=me?A.get(me).bytesPerElement:1,Oi=Se.get(q).currentProgram.getUniforms();for(let Jt=0;Jt<Ze;Jt++)Oi.setValue(P,"_gl_DrawID",Jt),lt.render(Ie[Jt]/jt,gt[Jt])}else if(H.isInstancedMesh)lt.renderInstances(Ye,yt,H.count);else if(X.isInstancedBufferGeometry){const Ie=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,gt=Math.min(X.instanceCount,Ie);lt.renderInstances(Ye,yt,gt)}else lt.render(Ye,yt)};function dt(S,k,X){S.transparent===!0&&S.side===sn&&S.forceSinglePass===!1?(S.side=Kt,S.needsUpdate=!0,lr(S,k,X),S.side=ui,S.needsUpdate=!0,lr(S,k,X),S.side=sn):lr(S,k,X)}this.compile=function(S,k,X=null){X===null&&(X=S),p=Ce.get(X),p.init(k),b.push(p),X.traverseVisible(function(H){H.isLight&&H.layers.test(k.layers)&&(p.pushLight(H),H.castShadow&&p.pushShadow(H))}),S!==X&&S.traverseVisible(function(H){H.isLight&&H.layers.test(k.layers)&&(p.pushLight(H),H.castShadow&&p.pushShadow(H))}),p.setupLights();const q=new Set;return S.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;const ne=H.material;if(ne)if(Array.isArray(ne))for(let ue=0;ue<ne.length;ue++){const ve=ne[ue];dt(ve,X,H),q.add(ve)}else dt(ne,X,H),q.add(ne)}),p=b.pop(),q},this.compileAsync=function(S,k,X=null){const q=this.compile(S,k,X);return new Promise(H=>{function ne(){if(q.forEach(function(ue){Se.get(ue).currentProgram.isReady()&&q.delete(ue)}),q.size===0){H(S);return}setTimeout(ne,10)}ke.get("KHR_parallel_shader_compile")!==null?ne():setTimeout(ne,10)})};let tt=null;function kn(S){tt&&tt(S)}function Cn(){pi.stop()}function Hl(){pi.start()}const pi=new Zd;pi.setAnimationLoop(kn),typeof self<"u"&&pi.setContext(self),this.setAnimationLoop=function(S){tt=S,se.setAnimationLoop(S),S===null?pi.stop():pi.start()},se.addEventListener("sessionstart",Cn),se.addEventListener("sessionend",Hl),this.render=function(S,k){if(k!==void 0&&k.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(R===!0)return;if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),se.enabled===!0&&se.isPresenting===!0&&(se.cameraAutoUpdate===!0&&se.updateCamera(k),k=se.getCamera()),S.isScene===!0&&S.onBeforeRender(M,S,k,L),p=Ce.get(S,b.length),p.init(k),b.push(p),Y.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),Qe.setFromProjectionMatrix(Y,Nn,k.reversedDepth),z=this.localClippingEnabled,Q=ae.init(this.clippingPlanes,z),m=$.get(S,E.length),m.init(),E.push(m),se.enabled===!0&&se.isPresenting===!0){const ne=M.xr.getDepthSensingMesh();ne!==null&&xa(ne,k,-1/0,M.sortObjects)}xa(S,k,0,M.sortObjects),m.finish(),M.sortObjects===!0&&m.sort(j,ee),Be=se.enabled===!1||se.isPresenting===!1||se.hasDepthSensing()===!1,Be&&Te.addToRenderList(m,S),this.info.render.frame++,Q===!0&&ae.beginShadows();const X=p.state.shadowsArray;be.render(X,S,k),Q===!0&&ae.endShadows(),this.info.autoReset===!0&&this.info.reset();const q=m.opaque,H=m.transmissive;if(p.setupLights(),k.isArrayCamera){const ne=k.cameras;if(H.length>0)for(let ue=0,ve=ne.length;ue<ve;ue++){const me=ne[ue];Vl(q,H,S,me)}Be&&Te.render(S);for(let ue=0,ve=ne.length;ue<ve;ue++){const me=ne[ue];zl(m,S,me,me.viewport)}}else H.length>0&&Vl(q,H,S,k),Be&&Te.render(S),zl(m,S,k);L!==null&&I===0&&(We.updateMultisampleRenderTarget(L),We.updateRenderTargetMipmap(L)),S.isScene===!0&&S.onAfterRender(M,S,k),de.resetDefaultState(),v=-1,y=null,b.pop(),b.length>0?(p=b[b.length-1],Q===!0&&ae.setGlobalState(M.clippingPlanes,p.state.camera)):p=null,E.pop(),E.length>0?m=E[E.length-1]:m=null};function xa(S,k,X,q){if(S.visible===!1)return;if(S.layers.test(k.layers)){if(S.isGroup)X=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(k);else if(S.isLight)p.pushLight(S),S.castShadow&&p.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||Qe.intersectsSprite(S)){q&&Re.setFromMatrixPosition(S.matrixWorld).applyMatrix4(Y);const ue=G.update(S),ve=S.material;ve.visible&&m.push(S,ue,ve,X,Re.z,null)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||Qe.intersectsObject(S))){const ue=G.update(S),ve=S.material;if(q&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),Re.copy(S.boundingSphere.center)):(ue.boundingSphere===null&&ue.computeBoundingSphere(),Re.copy(ue.boundingSphere.center)),Re.applyMatrix4(S.matrixWorld).applyMatrix4(Y)),Array.isArray(ve)){const me=ue.groups;for(let Le=0,Ne=me.length;Le<Ne;Le++){const Pe=me[Le],Ye=ve[Pe.materialIndex];Ye&&Ye.visible&&m.push(S,ue,Ye,X,Re.z,Pe)}}else ve.visible&&m.push(S,ue,ve,X,Re.z,null)}}const ne=S.children;for(let ue=0,ve=ne.length;ue<ve;ue++)xa(ne[ue],k,X,q)}function zl(S,k,X,q){const H=S.opaque,ne=S.transmissive,ue=S.transparent;p.setupLightsView(X),Q===!0&&ae.setGlobalState(M.clippingPlanes,X),q&&Me.viewport(C.copy(q)),H.length>0&&or(H,k,X),ne.length>0&&or(ne,k,X),ue.length>0&&or(ue,k,X),Me.buffers.depth.setTest(!0),Me.buffers.depth.setMask(!0),Me.buffers.color.setMask(!0),Me.setPolygonOffset(!1)}function Vl(S,k,X,q){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[q.id]===void 0&&(p.state.transmissionRenderTarget[q.id]=new Tn(1,1,{generateMipmaps:!0,type:ke.has("EXT_color_buffer_half_float")||ke.has("EXT_color_buffer_float")?Zn:On,minFilter:Pi,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:je.workingColorSpace}));const ne=p.state.transmissionRenderTarget[q.id],ue=q.viewport||C;ne.setSize(ue.z*M.transmissionResolutionScale,ue.w*M.transmissionResolutionScale);const ve=M.getRenderTarget(),me=M.getActiveCubeFace(),Le=M.getActiveMipmapLevel();M.setRenderTarget(ne),M.getClearColor(U),F=M.getClearAlpha(),F<1&&M.setClearColor(16777215,.5),M.clear(),Be&&Te.render(X);const Ne=M.toneMapping;M.toneMapping=hi;const Pe=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),p.setupLightsView(q),Q===!0&&ae.setGlobalState(M.clippingPlanes,q),or(S,X,q),We.updateMultisampleRenderTarget(ne),We.updateRenderTargetMipmap(ne),ke.has("WEBGL_multisampled_render_to_texture")===!1){let Ye=!1;for(let it=0,yt=k.length;it<yt;it++){const ut=k[it],lt=ut.object,Ie=ut.geometry,gt=ut.material,Ze=ut.group;if(gt.side===sn&&lt.layers.test(q.layers)){const jt=gt.side;gt.side=Kt,gt.needsUpdate=!0,Gl(lt,X,q,Ie,gt,Ze),gt.side=jt,gt.needsUpdate=!0,Ye=!0}}Ye===!0&&(We.updateMultisampleRenderTarget(ne),We.updateRenderTargetMipmap(ne))}M.setRenderTarget(ve,me,Le),M.setClearColor(U,F),Pe!==void 0&&(q.viewport=Pe),M.toneMapping=Ne}function or(S,k,X){const q=k.isScene===!0?k.overrideMaterial:null;for(let H=0,ne=S.length;H<ne;H++){const ue=S[H],ve=ue.object,me=ue.geometry,Le=ue.group;let Ne=ue.material;Ne.allowOverride===!0&&q!==null&&(Ne=q),ve.layers.test(X.layers)&&Gl(ve,k,X,me,Ne,Le)}}function Gl(S,k,X,q,H,ne){S.onBeforeRender(M,k,X,q,H,ne),S.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),H.onBeforeRender(M,k,X,q,S,ne),H.transparent===!0&&H.side===sn&&H.forceSinglePass===!1?(H.side=Kt,H.needsUpdate=!0,M.renderBufferDirect(X,k,q,H,S,ne),H.side=ui,H.needsUpdate=!0,M.renderBufferDirect(X,k,q,H,S,ne),H.side=sn):M.renderBufferDirect(X,k,q,H,S,ne),S.onAfterRender(M,k,X,q,H,ne)}function lr(S,k,X){k.isScene!==!0&&(k=xe);const q=Se.get(S),H=p.state.lights,ne=p.state.shadowsArray,ue=H.state.version,ve=K.getParameters(S,H.state,ne,k,X),me=K.getProgramCacheKey(ve);let Le=q.programs;q.environment=S.isMeshStandardMaterial?k.environment:null,q.fog=k.fog,q.envMap=(S.isMeshStandardMaterial?Mt:Lt).get(S.envMap||q.environment),q.envMapRotation=q.environment!==null&&S.envMap===null?k.environmentRotation:S.envMapRotation,Le===void 0&&(S.addEventListener("dispose",Z),Le=new Map,q.programs=Le);let Ne=Le.get(me);if(Ne!==void 0){if(q.currentProgram===Ne&&q.lightsStateVersion===ue)return Xl(S,ve),Ne}else ve.uniforms=K.getUniforms(S),S.onBeforeCompile(ve,M),Ne=K.acquireProgram(ve,me),Le.set(me,Ne),q.uniforms=ve.uniforms;const Pe=q.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Pe.clippingPlanes=ae.uniform),Xl(S,ve),q.needsLights=bh(S),q.lightsStateVersion=ue,q.needsLights&&(Pe.ambientLightColor.value=H.state.ambient,Pe.lightProbe.value=H.state.probe,Pe.directionalLights.value=H.state.directional,Pe.directionalLightShadows.value=H.state.directionalShadow,Pe.spotLights.value=H.state.spot,Pe.spotLightShadows.value=H.state.spotShadow,Pe.rectAreaLights.value=H.state.rectArea,Pe.ltc_1.value=H.state.rectAreaLTC1,Pe.ltc_2.value=H.state.rectAreaLTC2,Pe.pointLights.value=H.state.point,Pe.pointLightShadows.value=H.state.pointShadow,Pe.hemisphereLights.value=H.state.hemi,Pe.directionalShadowMap.value=H.state.directionalShadowMap,Pe.directionalShadowMatrix.value=H.state.directionalShadowMatrix,Pe.spotShadowMap.value=H.state.spotShadowMap,Pe.spotLightMatrix.value=H.state.spotLightMatrix,Pe.spotLightMap.value=H.state.spotLightMap,Pe.pointShadowMap.value=H.state.pointShadowMap,Pe.pointShadowMatrix.value=H.state.pointShadowMatrix),q.currentProgram=Ne,q.uniformsList=null,Ne}function Wl(S){if(S.uniformsList===null){const k=S.currentProgram.getUniforms();S.uniformsList=Yr.seqWithValue(k.seq,S.uniforms)}return S.uniformsList}function Xl(S,k){const X=Se.get(S);X.outputColorSpace=k.outputColorSpace,X.batching=k.batching,X.batchingColor=k.batchingColor,X.instancing=k.instancing,X.instancingColor=k.instancingColor,X.instancingMorph=k.instancingMorph,X.skinning=k.skinning,X.morphTargets=k.morphTargets,X.morphNormals=k.morphNormals,X.morphColors=k.morphColors,X.morphTargetsCount=k.morphTargetsCount,X.numClippingPlanes=k.numClippingPlanes,X.numIntersection=k.numClipIntersection,X.vertexAlphas=k.vertexAlphas,X.vertexTangents=k.vertexTangents,X.toneMapping=k.toneMapping}function Sh(S,k,X,q,H){k.isScene!==!0&&(k=xe),We.resetTextureUnits();const ne=k.fog,ue=q.isMeshStandardMaterial?k.environment:null,ve=L===null?M.outputColorSpace:L.isXRRenderTarget===!0?L.texture.colorSpace:ms,me=(q.isMeshStandardMaterial?Mt:Lt).get(q.envMap||ue),Le=q.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,Ne=!!X.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),Pe=!!X.morphAttributes.position,Ye=!!X.morphAttributes.normal,it=!!X.morphAttributes.color;let yt=hi;q.toneMapped&&(L===null||L.isXRRenderTarget===!0)&&(yt=M.toneMapping);const ut=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,lt=ut!==void 0?ut.length:0,Ie=Se.get(q),gt=p.state.lights;if(Q===!0&&(z===!0||S!==y)){const zt=S===y&&q.id===v;ae.setState(q,S,zt)}let Ze=!1;q.version===Ie.__version?(Ie.needsLights&&Ie.lightsStateVersion!==gt.state.version||Ie.outputColorSpace!==ve||H.isBatchedMesh&&Ie.batching===!1||!H.isBatchedMesh&&Ie.batching===!0||H.isBatchedMesh&&Ie.batchingColor===!0&&H.colorTexture===null||H.isBatchedMesh&&Ie.batchingColor===!1&&H.colorTexture!==null||H.isInstancedMesh&&Ie.instancing===!1||!H.isInstancedMesh&&Ie.instancing===!0||H.isSkinnedMesh&&Ie.skinning===!1||!H.isSkinnedMesh&&Ie.skinning===!0||H.isInstancedMesh&&Ie.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&Ie.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&Ie.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&Ie.instancingMorph===!1&&H.morphTexture!==null||Ie.envMap!==me||q.fog===!0&&Ie.fog!==ne||Ie.numClippingPlanes!==void 0&&(Ie.numClippingPlanes!==ae.numPlanes||Ie.numIntersection!==ae.numIntersection)||Ie.vertexAlphas!==Le||Ie.vertexTangents!==Ne||Ie.morphTargets!==Pe||Ie.morphNormals!==Ye||Ie.morphColors!==it||Ie.toneMapping!==yt||Ie.morphTargetsCount!==lt)&&(Ze=!0):(Ze=!0,Ie.__version=q.version);let jt=Ie.currentProgram;Ze===!0&&(jt=lr(q,k,H));let Oi=!1,Jt=!1,Es=!1;const _t=jt.getUniforms(),ln=Ie.uniforms;if(Me.useProgram(jt.program)&&(Oi=!0,Jt=!0,Es=!0),q.id!==v&&(v=q.id,Jt=!0),Oi||y!==S){Me.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),_t.setValue(P,"projectionMatrix",S.projectionMatrix),_t.setValue(P,"viewMatrix",S.matrixWorldInverse);const $t=_t.map.cameraPosition;$t!==void 0&&$t.setValue(P,he.setFromMatrixPosition(S.matrixWorld)),Ue.logarithmicDepthBuffer&&_t.setValue(P,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&_t.setValue(P,"isOrthographic",S.isOrthographicCamera===!0),y!==S&&(y=S,Jt=!0,Es=!0)}if(H.isSkinnedMesh){_t.setOptional(P,H,"bindMatrix"),_t.setOptional(P,H,"bindMatrixInverse");const zt=H.skeleton;zt&&(zt.boneTexture===null&&zt.computeBoneTexture(),_t.setValue(P,"boneTexture",zt.boneTexture,We))}H.isBatchedMesh&&(_t.setOptional(P,H,"batchingTexture"),_t.setValue(P,"batchingTexture",H._matricesTexture,We),_t.setOptional(P,H,"batchingIdTexture"),_t.setValue(P,"batchingIdTexture",H._indirectTexture,We),_t.setOptional(P,H,"batchingColorTexture"),H._colorsTexture!==null&&_t.setValue(P,"batchingColorTexture",H._colorsTexture,We));const cn=X.morphAttributes;if((cn.position!==void 0||cn.normal!==void 0||cn.color!==void 0)&&ie.update(H,X,jt),(Jt||Ie.receiveShadow!==H.receiveShadow)&&(Ie.receiveShadow=H.receiveShadow,_t.setValue(P,"receiveShadow",H.receiveShadow)),q.isMeshGouraudMaterial&&q.envMap!==null&&(ln.envMap.value=me,ln.flipEnvMap.value=me.isCubeTexture&&me.isRenderTargetTexture===!1?-1:1),q.isMeshStandardMaterial&&q.envMap===null&&k.environment!==null&&(ln.envMapIntensity.value=k.environmentIntensity),Jt&&(_t.setValue(P,"toneMappingExposure",M.toneMappingExposure),Ie.needsLights&&Eh(ln,Es),ne&&q.fog===!0&&J.refreshFogUniforms(ln,ne),J.refreshMaterialUniforms(ln,q,V,W,p.state.transmissionRenderTarget[S.id]),Yr.upload(P,Wl(Ie),ln,We)),q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(Yr.upload(P,Wl(Ie),ln,We),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&_t.setValue(P,"center",H.center),_t.setValue(P,"modelViewMatrix",H.modelViewMatrix),_t.setValue(P,"normalMatrix",H.normalMatrix),_t.setValue(P,"modelMatrix",H.matrixWorld),q.isShaderMaterial||q.isRawShaderMaterial){const zt=q.uniformsGroups;for(let $t=0,Ma=zt.length;$t<Ma;$t++){const mi=zt[$t];ze.update(mi,jt),ze.bind(mi,jt)}}return jt}function Eh(S,k){S.ambientLightColor.needsUpdate=k,S.lightProbe.needsUpdate=k,S.directionalLights.needsUpdate=k,S.directionalLightShadows.needsUpdate=k,S.pointLights.needsUpdate=k,S.pointLightShadows.needsUpdate=k,S.spotLights.needsUpdate=k,S.spotLightShadows.needsUpdate=k,S.rectAreaLights.needsUpdate=k,S.hemisphereLights.needsUpdate=k}function bh(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return I},this.getRenderTarget=function(){return L},this.setRenderTargetTextures=function(S,k,X){const q=Se.get(S);q.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,q.__autoAllocateDepthBuffer===!1&&(q.__useRenderToTexture=!1),Se.get(S.texture).__webglTexture=k,Se.get(S.depthTexture).__webglTexture=q.__autoAllocateDepthBuffer?void 0:X,q.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,k){const X=Se.get(S);X.__webglFramebuffer=k,X.__useDefaultFramebuffer=k===void 0};const Th=P.createFramebuffer();this.setRenderTarget=function(S,k=0,X=0){L=S,w=k,I=X;let q=!0,H=null,ne=!1,ue=!1;if(S){const me=Se.get(S);if(me.__useDefaultFramebuffer!==void 0)Me.bindFramebuffer(P.FRAMEBUFFER,null),q=!1;else if(me.__webglFramebuffer===void 0)We.setupRenderTarget(S);else if(me.__hasExternalTextures)We.rebindTextures(S,Se.get(S.texture).__webglTexture,Se.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){const Pe=S.depthTexture;if(me.__boundDepthTexture!==Pe){if(Pe!==null&&Se.has(Pe)&&(S.width!==Pe.image.width||S.height!==Pe.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");We.setupDepthRenderbuffer(S)}}const Le=S.texture;(Le.isData3DTexture||Le.isDataArrayTexture||Le.isCompressedArrayTexture)&&(ue=!0);const Ne=Se.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Ne[k])?H=Ne[k][X]:H=Ne[k],ne=!0):S.samples>0&&We.useMultisampledRTT(S)===!1?H=Se.get(S).__webglMultisampledFramebuffer:Array.isArray(Ne)?H=Ne[X]:H=Ne,C.copy(S.viewport),T.copy(S.scissor),B=S.scissorTest}else C.copy(ce).multiplyScalar(V).floor(),T.copy(Ee).multiplyScalar(V).floor(),B=He;if(X!==0&&(H=Th),Me.bindFramebuffer(P.FRAMEBUFFER,H)&&q&&Me.drawBuffers(S,H),Me.viewport(C),Me.scissor(T),Me.setScissorTest(B),ne){const me=Se.get(S.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_CUBE_MAP_POSITIVE_X+k,me.__webglTexture,X)}else if(ue){const me=k;for(let Le=0;Le<S.textures.length;Le++){const Ne=Se.get(S.textures[Le]);P.framebufferTextureLayer(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0+Le,Ne.__webglTexture,X,me)}}else if(S!==null&&X!==0){const me=Se.get(S.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,me.__webglTexture,X)}v=-1},this.readRenderTargetPixels=function(S,k,X,q,H,ne,ue,ve=0){if(!(S&&S.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let me=Se.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&ue!==void 0&&(me=me[ue]),me){Me.bindFramebuffer(P.FRAMEBUFFER,me);try{const Le=S.textures[ve],Ne=Le.format,Pe=Le.type;if(!Ue.textureFormatReadable(Ne)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ue.textureTypeReadable(Pe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=S.width-q&&X>=0&&X<=S.height-H&&(S.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+ve),P.readPixels(k,X,q,H,we.convert(Ne),we.convert(Pe),ne))}finally{const Le=L!==null?Se.get(L).__webglFramebuffer:null;Me.bindFramebuffer(P.FRAMEBUFFER,Le)}}},this.readRenderTargetPixelsAsync=async function(S,k,X,q,H,ne,ue,ve=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let me=Se.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&ue!==void 0&&(me=me[ue]),me)if(k>=0&&k<=S.width-q&&X>=0&&X<=S.height-H){Me.bindFramebuffer(P.FRAMEBUFFER,me);const Le=S.textures[ve],Ne=Le.format,Pe=Le.type;if(!Ue.textureFormatReadable(Ne))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ue.textureTypeReadable(Pe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Ye=P.createBuffer();P.bindBuffer(P.PIXEL_PACK_BUFFER,Ye),P.bufferData(P.PIXEL_PACK_BUFFER,ne.byteLength,P.STREAM_READ),S.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+ve),P.readPixels(k,X,q,H,we.convert(Ne),we.convert(Pe),0);const it=L!==null?Se.get(L).__webglFramebuffer:null;Me.bindFramebuffer(P.FRAMEBUFFER,it);const yt=P.fenceSync(P.SYNC_GPU_COMMANDS_COMPLETE,0);return P.flush(),await Du(P,yt,4),P.bindBuffer(P.PIXEL_PACK_BUFFER,Ye),P.getBufferSubData(P.PIXEL_PACK_BUFFER,0,ne),P.deleteBuffer(Ye),P.deleteSync(yt),ne}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,k=null,X=0){const q=Math.pow(2,-X),H=Math.floor(S.image.width*q),ne=Math.floor(S.image.height*q),ue=k!==null?k.x:0,ve=k!==null?k.y:0;We.setTexture2D(S,0),P.copyTexSubImage2D(P.TEXTURE_2D,X,0,0,ue,ve,H,ne),Me.unbindTexture()};const wh=P.createFramebuffer(),Ah=P.createFramebuffer();this.copyTextureToTexture=function(S,k,X=null,q=null,H=0,ne=null){ne===null&&(H!==0?(Ks("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ne=H,H=0):ne=0);let ue,ve,me,Le,Ne,Pe,Ye,it,yt;const ut=S.isCompressedTexture?S.mipmaps[ne]:S.image;if(X!==null)ue=X.max.x-X.min.x,ve=X.max.y-X.min.y,me=X.isBox3?X.max.z-X.min.z:1,Le=X.min.x,Ne=X.min.y,Pe=X.isBox3?X.min.z:0;else{const cn=Math.pow(2,-H);ue=Math.floor(ut.width*cn),ve=Math.floor(ut.height*cn),S.isDataArrayTexture?me=ut.depth:S.isData3DTexture?me=Math.floor(ut.depth*cn):me=1,Le=0,Ne=0,Pe=0}q!==null?(Ye=q.x,it=q.y,yt=q.z):(Ye=0,it=0,yt=0);const lt=we.convert(k.format),Ie=we.convert(k.type);let gt;k.isData3DTexture?(We.setTexture3D(k,0),gt=P.TEXTURE_3D):k.isDataArrayTexture||k.isCompressedArrayTexture?(We.setTexture2DArray(k,0),gt=P.TEXTURE_2D_ARRAY):(We.setTexture2D(k,0),gt=P.TEXTURE_2D),P.pixelStorei(P.UNPACK_FLIP_Y_WEBGL,k.flipY),P.pixelStorei(P.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),P.pixelStorei(P.UNPACK_ALIGNMENT,k.unpackAlignment);const Ze=P.getParameter(P.UNPACK_ROW_LENGTH),jt=P.getParameter(P.UNPACK_IMAGE_HEIGHT),Oi=P.getParameter(P.UNPACK_SKIP_PIXELS),Jt=P.getParameter(P.UNPACK_SKIP_ROWS),Es=P.getParameter(P.UNPACK_SKIP_IMAGES);P.pixelStorei(P.UNPACK_ROW_LENGTH,ut.width),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,ut.height),P.pixelStorei(P.UNPACK_SKIP_PIXELS,Le),P.pixelStorei(P.UNPACK_SKIP_ROWS,Ne),P.pixelStorei(P.UNPACK_SKIP_IMAGES,Pe);const _t=S.isDataArrayTexture||S.isData3DTexture,ln=k.isDataArrayTexture||k.isData3DTexture;if(S.isDepthTexture){const cn=Se.get(S),zt=Se.get(k),$t=Se.get(cn.__renderTarget),Ma=Se.get(zt.__renderTarget);Me.bindFramebuffer(P.READ_FRAMEBUFFER,$t.__webglFramebuffer),Me.bindFramebuffer(P.DRAW_FRAMEBUFFER,Ma.__webglFramebuffer);for(let mi=0;mi<me;mi++)_t&&(P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,Se.get(S).__webglTexture,H,Pe+mi),P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,Se.get(k).__webglTexture,ne,yt+mi)),P.blitFramebuffer(Le,Ne,ue,ve,Ye,it,ue,ve,P.DEPTH_BUFFER_BIT,P.NEAREST);Me.bindFramebuffer(P.READ_FRAMEBUFFER,null),Me.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else if(H!==0||S.isRenderTargetTexture||Se.has(S)){const cn=Se.get(S),zt=Se.get(k);Me.bindFramebuffer(P.READ_FRAMEBUFFER,wh),Me.bindFramebuffer(P.DRAW_FRAMEBUFFER,Ah);for(let $t=0;$t<me;$t++)_t?P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,cn.__webglTexture,H,Pe+$t):P.framebufferTexture2D(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,cn.__webglTexture,H),ln?P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,zt.__webglTexture,ne,yt+$t):P.framebufferTexture2D(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,zt.__webglTexture,ne),H!==0?P.blitFramebuffer(Le,Ne,ue,ve,Ye,it,ue,ve,P.COLOR_BUFFER_BIT,P.NEAREST):ln?P.copyTexSubImage3D(gt,ne,Ye,it,yt+$t,Le,Ne,ue,ve):P.copyTexSubImage2D(gt,ne,Ye,it,Le,Ne,ue,ve);Me.bindFramebuffer(P.READ_FRAMEBUFFER,null),Me.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else ln?S.isDataTexture||S.isData3DTexture?P.texSubImage3D(gt,ne,Ye,it,yt,ue,ve,me,lt,Ie,ut.data):k.isCompressedArrayTexture?P.compressedTexSubImage3D(gt,ne,Ye,it,yt,ue,ve,me,lt,ut.data):P.texSubImage3D(gt,ne,Ye,it,yt,ue,ve,me,lt,Ie,ut):S.isDataTexture?P.texSubImage2D(P.TEXTURE_2D,ne,Ye,it,ue,ve,lt,Ie,ut.data):S.isCompressedTexture?P.compressedTexSubImage2D(P.TEXTURE_2D,ne,Ye,it,ut.width,ut.height,lt,ut.data):P.texSubImage2D(P.TEXTURE_2D,ne,Ye,it,ue,ve,lt,Ie,ut);P.pixelStorei(P.UNPACK_ROW_LENGTH,Ze),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,jt),P.pixelStorei(P.UNPACK_SKIP_PIXELS,Oi),P.pixelStorei(P.UNPACK_SKIP_ROWS,Jt),P.pixelStorei(P.UNPACK_SKIP_IMAGES,Es),ne===0&&k.generateMipmaps&&P.generateMipmap(gt),Me.unbindTexture()},this.initRenderTarget=function(S){Se.get(S).__webglFramebuffer===void 0&&We.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?We.setTextureCube(S,0):S.isData3DTexture?We.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?We.setTexture2DArray(S,0):We.setTexture2D(S,0),Me.unbindTexture()},this.resetState=function(){w=0,I=0,L=null,Me.reset(),de.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Nn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=je._getDrawingBufferColorSpace(e),t.unpackColorSpace=je._getUnpackColorSpace()}}const Kr={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class rr{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const a_=new pa(-1,1,1,-1,0,1);class o_ extends Ft{constructor(){super(),this.setAttribute("position",new ct([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ct([0,2,0,0,2,0],2))}}const l_=new o_;class th{constructor(e){this._mesh=new re(l_,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,a_)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class c_ extends rr{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Yt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=sa.clone(e.uniforms),this.material=new Yt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new th(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class Jc extends rr{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){const s=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,a,4294967295),r.buffers.stencil.setClear(o),r.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}}class d_ extends rr{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class h_{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const n=e.getSize(new Ae);this._width=n.width,this._height=n.height,t=new Tn(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Zn}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new c_(Kr),this.copyPass.material.blending=Kn,this.clock=new Mf}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let n=!1;for(let s=0,r=this.passes.length;s<r;s++){const a=this.passes[s];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),a.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),a.needsSwap){if(n){const o=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(o.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(o.EQUAL,1,4294967295)}this.swapBuffers()}Jc!==void 0&&(a instanceof Jc?n=!0:a instanceof d_&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new Ae);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class u_ extends rr{constructor(e,t,n=null,s=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Fe}render(e,t,n){const s=e.autoClear;e.autoClear=!1;let r,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=s}}const f_={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Fe(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class _s extends rr{constructor(e,t=1,n,s){super(),this.strength=t,this.radius=n,this.threshold=s,this.resolution=e!==void 0?new Ae(e.x,e.y):new Ae(256,256),this.clearColor=new Fe(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new Tn(r,a,{type:Zn}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let d=0;d<this.nMips;d++){const f=new Tn(r,a,{type:Zn});f.texture.name="UnrealBloomPass.h"+d,f.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(f);const h=new Tn(r,a,{type:Zn});h.texture.name="UnrealBloomPass.v"+d,h.texture.generateMipmaps=!1,this.renderTargetsVertical.push(h),r=Math.round(r/2),a=Math.round(a/2)}const o=f_;this.highPassUniforms=sa.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Yt({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let d=0;d<this.nMips;d++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[d])),this.separableBlurMaterials[d].uniforms.invSize.value=new Ae(1/r,1/a),r=Math.round(r/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=sa.clone(Kr.uniforms),this.blendMaterial=new Yt({uniforms:this.copyUniforms,vertexShader:Kr.vertexShader,fragmentShader:Kr.fragmentShader,blending:go,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Fe,this._oldClearAlpha=1,this._basic=new xs,this._fsQuad=new th(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),s=Math.round(t/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new Ae(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(e,t,n,s,r){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();const a=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let o=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=o.texture,this.separableBlurMaterials[l].uniforms.direction.value=_s.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=_s.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this._fsQuad.render(e),o=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=a}_getSeparableBlurMaterial(e){const t=[];for(let n=0;n<e;n++)t.push(.39894*Math.exp(-.5*n*n/(e*e))/e);return new Yt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new Ae(.5,.5)},direction:{value:new Ae(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
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
				}`})}}_s.BlurDirectionX=new Ae(1,0);_s.BlurDirectionY=new Ae(0,1);const ge={HELLO:"hello",SET_NICKNAME:"set_nickname",JOIN_ROOM:"join_room",MOVEMENT:"movement",GARDEN_ACTION:"garden_action",MARKET_BUY:"market_buy",MARKET_SELL:"market_sell",ORDER_PLACE:"order_place",ORDER_CANCEL:"order_cancel",CONTRACT_COMPLETE:"contract_complete",NODE_HARVEST:"node_harvest",MACHINE_CONTRIBUTE:"machine_contribute",MACHINE_MILL:"machine_mill",MACHINE_CRAFT:"machine_craft",THEATER_QUEUE:"theater_queue",THEATER_CONTROL:"theater_control",THEATER_CHANNEL:"theater_channel",THEATER_PLAYLIST_RESOLVE:"theater_playlist_resolve",TORRENT_RESOLVE:"torrent_resolve",TORRENT_FILES:"torrent_files",TORRENT_STATE:"torrent_state",IPTV_LIST_GET:"iptv_list_get",IPTV_LIST_REMOVE:"iptv_list_remove",EPG_LOOKUP:"epg_lookup",EMOTE:"emote",CHAT_SEND:"chat_send",WELCOME:"welcome",PRESENCE_JOIN:"presence_join",PRESENCE_LEAVE:"presence_leave",PRESENCE_UPDATE:"presence_update",GARDEN_STATE:"garden_state",INVENTORY_STATE:"inventory_state",MARKET_UPDATE:"market_update",CONTRACT_UPDATE:"contract_update",NODE_STATE:"node_state",MACHINE_UPDATE:"machine_update",THEATER_STATE:"theater_state",THEATER_PLAYLIST_RESOLVED:"theater_playlist_resolved",THEATER_IMPORT_RESULT:"theater_import_result",IPTV_STATE:"iptv_state",IPTV_LIST:"iptv_list",EPG_SCHEDULE:"epg_schedule",WEATHER_UPDATE:"weather_update",ACTION_RESULT:"action_result",TRADE_FILLED:"trade_filled",EMOTE_BROADCAST:"emote_broadcast",CHAT_HISTORY:"chat_history",CHAT_MESSAGE:"chat_message",CHAT_DM:"chat_dm",CHAT_PRESENCE:"chat_presence",CHAT_ERROR:"chat_error"},qt={MARKET:"market",THEATER:"theater",gardenFor:i=>`garden:${i}`,isGarden:i=>i?.startsWith("garden:"),gardenOwner:i=>i?.startsWith("garden:")?i.slice(7):null};function p_(i){return JSON.stringify(i)}function m_(i){try{return JSON.parse(i)}catch{return null}}const Qc=["Mossy","Quiet","Copper","Rainy","Amber","Misty","Rust","Golden","Silver","Fern","Bramble","Cobble","Thistle","Breezy","Dusky","Dappled","Dewy","Hedge","Orchard","Verdant","Gilded","Pebble","Autumnal","Gleaming"],ed=["Radish","Turnip","Basil","Leek","Carrot","Kale","Tomato","Berry","Sorrel","Chive","Sprout","Fennel","Parsnip","Pepper","Clover","Borage","Sage","Mint","Beet","Chard"];function aa(i=Math.random()){const e=Math.floor(Math.abs(Math.sin(i*999))*Qc.length),t=Math.floor(Math.abs(Math.cos(i*888))*ed.length),n=Math.floor(Math.abs(Math.sin(i*777))*90)+10;return`${Qc[e]}${ed[t]}${n}`}function td(i){if(typeof i!="string")return aa();let e=i.replace(/<[^>]*>/g,"").replace(/[\x00-\x1F\x7F-\x9F]/g,"").trim();return e=e.replace(/[^\w\s-]/g,"").replace(/\s+/g," "),e.length>20&&(e=e.slice(0,20).trim()),e.length<3?aa():e}function g_(i=""){let e=0;for(let n=0;n<i.length;n++)e=e*31+i.charCodeAt(n)>>>0;const t=[{coat:"#7a4e32",apron:"#b8a682",hat:"#473d32",boots:"#2b231c"},{coat:"#3a5449",apron:"#c2bca3",hat:"#2d3f37",boots:"#202924"},{coat:"#3d4b60",apron:"#b5b29c",hat:"#2a3547",boots:"#1c222e"},{coat:"#634b6b",apron:"#bfb5a3",hat:"#44324a",boots:"#251c29"},{coat:"#806835",apron:"#ccc4a7",hat:"#544320",boots:"#2e2411"},{coat:"#445e38",apron:"#b8b498",hat:"#314427",boots:"#1f2b18"}];return t[e%t.length]}const nd="afterlight-gardener-guest-id",to="afterlight-gardener-nickname";class __{constructor(e=null){this.wsUrl=e||this.getDefaultUrl(),this.guestId=this.getOrCreateGuestId(),this.nickname=this.getOrCreateNickname(),this.ws=null,this.connected=!1,this.handlers=new Map,this.connectListeners=[],this.disconnectListeners=[],this.reconnectAttempts=0,this.reconnectTimer=null,this.lastMovementSend=0,this.desiredRoom=null}getDefaultUrl(){return"wss://racknerd-3941d39-1.tail494d3.ts.net/ws"}getOrCreateGuestId(){try{let e=localStorage.getItem(nd);return(!e||typeof e!="string")&&(e="guest_"+Math.random().toString(36).substring(2,11)+"_"+Date.now().toString(36),localStorage.setItem(nd,e)),e}catch{return"guest_"+Math.random().toString(36).substring(2,11)}}getOrCreateNickname(){try{let e=localStorage.getItem(to);return e||(e=aa(),localStorage.setItem(to,e)),td(e)}catch{return aa()}}setStoredNickname(e){this.nickname=td(e);try{localStorage.setItem(to,this.nickname)}catch{}}connect(){if(!(this.ws&&(this.ws.readyState===WebSocket.OPEN||this.ws.readyState===WebSocket.CONNECTING))){try{this.ws=new WebSocket(this.wsUrl)}catch(e){console.warn("WebSocket init failed, scheduling reconnect:",e.message),this.scheduleReconnect();return}this.ws.onopen=()=>{this.connected=!0,this.reconnectAttempts=0,this.send(ge.HELLO,{guestId:this.guestId,nickname:this.nickname}),this.desiredRoom&&this.send(ge.JOIN_ROOM,{roomId:this.desiredRoom}),this.connectListeners.forEach(e=>e())},this.ws.onmessage=e=>{const t=m_(e.data);if(!t||!t.type)return;const n=this.handlers.get(t.type);n&&n.forEach(s=>s(t))},this.ws.onclose=()=>{this.connected=!1,this.disconnectListeners.forEach(e=>e()),this.scheduleReconnect()},this.ws.onerror=e=>{console.warn("NetworkClient socket error:",e)}}}scheduleReconnect(){if(this.reconnectTimer)return;const e=Math.min(1e4,1e3*Math.pow(1.5,this.reconnectAttempts));this.reconnectAttempts++,this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect()},e)}on(e,t){this.handlers.has(e)||this.handlers.set(e,[]),this.handlers.get(e).push(t)}onConnect(e){this.connectListeners.push(e)}onDisconnect(e){this.disconnectListeners.push(e)}send(e,t={}){this.ws&&this.ws.readyState===WebSocket.OPEN&&this.ws.send(p_({type:e,...t}))}sendMovement(e,t,n,s,r=!1,a=!1){const o=performance.now();o-this.lastMovementSend<80||(this.lastMovementSend=o,this.send(ge.MOVEMENT,{x:e,z:t,rotY:n,walking:s,sitting:!!r,airborne:!!a}))}sendTheaterQueue(e){this.send(ge.THEATER_QUEUE,e)}sendTheaterControl(e){this.send(ge.THEATER_CONTROL,e)}sendTheaterChannel(e,t){this.send(ge.THEATER_CHANNEL,{url:e,title:t})}sendTorrentResolve(e,t){this.send(ge.TORRENT_RESOLVE,{requestId:e,magnet:t})}sendPlaylistResolve(e,t){this.send(ge.THEATER_PLAYLIST_RESOLVE,{requestId:e,listId:t})}sendIptvListGet(e){this.send(ge.IPTV_LIST_GET,{listId:e})}sendIptvListRemove(e){this.send(ge.IPTV_LIST_REMOVE,{listId:e})}sendEpgLookup(e){this.send(ge.EPG_LOOKUP,{keys:e})}get apiBase(){try{const e=new URL(this.wsUrl);return`${e.protocol==="wss:"?"https:":"http:"}//${e.host}`}catch{const e=typeof window<"u"?window.location:{protocol:"http:",hostname:"localhost"};return`${e.protocol}//${e.hostname}:3001`}}async postToTheater(e,t,n,s){const r=new URLSearchParams(Object.entries(t||{}).filter(([,l])=>l!=null&&l!=="")).toString();let a;try{a=await fetch(`${this.apiBase}${e}${r?`?${r}`:""}`,{method:"POST",headers:s?{"Content-Type":s}:void 0,body:n})}catch{throw new Error("Could not reach the theater service — is the game server running?")}let o=null;try{o=await a.json()}catch{}if(!a.ok||!o?.ok)throw new Error(o?.error||`The theater refused that (HTTP ${a.status}).`);return o}uploadPlaylistText(e,t,n){return this.postToTheater("/api/theater/playlists",{name:t,by:n},e,"text/plain")}importPlaylistFromUrl(e,t,n){return this.postToTheater("/api/theater/playlists",{name:t,by:n},JSON.stringify({url:e}),"application/json")}uploadEpg(e,t){return this.postToTheater("/api/theater/epg",{name:t},e,"application/octet-stream")}sendGardenAction(e,t,n=null){const s=`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;return this.send(ge.GARDEN_ACTION,{actionId:s,action:e,bedIndex:t,seedCropId:n}),s}sendMarketBuy(e,t){this.send(ge.MARKET_BUY,{cropId:e,quantity:t})}sendMarketSell(e,t,n){this.send(ge.MARKET_SELL,{cropId:e,quality:t,quantity:n})}sendOrderPlace(e,t,n,s,r="B"){const a=`ord_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;return this.send(ge.ORDER_PLACE,{orderId:a,side:e,cropId:t,price:n,quantity:s,quality:r}),a}sendOrderCancel(e){this.send(ge.ORDER_CANCEL,{orderId:e})}sendContractComplete(e){this.send(ge.CONTRACT_COMPLETE,{contractId:e})}sendEmote(e="wave"){this.send(ge.EMOTE,{emote:e})}sendChat(e){this.send(ge.CHAT_SEND,{text:e})}setNickname(e){this.setStoredNickname(e),this.send(ge.SET_NICKNAME,{nickname:this.nickname})}joinRoom(e){this.desiredRoom=e,this.send(ge.JOIN_ROOM,{roomId:e})}}const Zs=5.5,Dl=22,v_=.35,y_=1.5;function x_(){return{airborne:!1,y:0,vy:0,hopSpeed:0,chain:0}}function nh(i){return i.airborne=!1,i.y=0,i.vy=0,i.hopSpeed=0,i.chain=0,i}function M_(i,e,t){const{jumpPressed:n,jumpHeld:s,moving:r,speed:a,cap:o}=e;return i.airborne?(i.vy-=Dl*t,i.y+=i.vy*t,i.y<=0&&(i.y=0,s?(i.chain+=1,i.hopSpeed=Math.min(i.hopSpeed+v_,o),i.vy=Zs):nh(i))):(r||(i.hopSpeed=0,i.chain=0),n&&(i.airborne=!0,i.vy=Zs,i.chain=1,i.hopSpeed=r?a:0)),i}function S_(i,e){return i.airborne&&i.hopSpeed>0?i.hopSpeed:e}const id=2*Zs/Dl,E_=Zs*Zs/(2*Dl),sd=1.5,ht=new Zt(1,1,1),Zr=new ti(1,1,1,8),no=new Map;function fn(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return no.has(n)||no.set(n,new Je({color:i,roughness:e,metalness:t})),no.get(n)}function rd(i){const e=document.createElement("canvas");e.width=256,e.height=64;const t=e.getContext("2d");t.fillStyle="rgba(23, 33, 32, 0.85)",t.beginPath(),t.roundRect(8,8,240,48,12),t.fill(),t.strokeStyle="#c6b47a",t.lineWidth=2.5,t.stroke(),t.fillStyle="#e8d8b5",t.font='bold 24px "Space Mono", monospace, sans-serif',t.textAlign="center",t.textBaseline="middle",t.fillText(i,128,32);const n=new ff(e);n.minFilter=Sn;const s=new Wd({map:n,transparent:!0,depthTest:!1}),r=new af(s);return r.scale.set(2.2,.55,1),r.position.set(0,2.3,0),r}function ih(i,e="Gardener"){const t=new mt,n=g_(i),s=fn(n.coat,.7,.1),r=fn(n.apron,.8,.05),a=fn(n.hat,.75,.1),o=fn(n.boots,.65,.3),l=fn("#563a24",.6,.2),c=fn("#b78d50",.45,.6),d=new Je({color:"#d8f8e3",emissive:"#acf7d5",emissiveIntensity:2.2}),f=new re(ht,s);f.position.set(0,.9,0),f.scale.set(.64,.75,.48),f.castShadow=!0,t.add(f);const h=new re(ht,r);h.position.set(0,.86,.25),h.scale.set(.48,.68,.05),t.add(h);for(const C of[-.16,.16]){const T=new re(ht,l);T.position.set(C,1.15,.22),T.scale.set(.06,.25,.04),t.add(T)}const u=new re(ht,l);u.position.set(.34,.75,.08),u.scale.set(.16,.28,.24),u.castShadow=!0,t.add(u);const g=new re(ht,l);g.position.set(.08,.96,.15),g.rotation.z=-.65,g.scale.set(.68,.05,.04),t.add(g);const _=new re(ht,s);_.position.set(0,1.45,0),_.scale.set(.72,.46,.54),_.castShadow=!0,t.add(_);const m=new re(ht,fn("#1c2828",.5,.5));m.position.set(0,1.45,.28),m.scale.set(.58,.28,.05),t.add(m);for(const C of[-.17,.17]){const T=new re(ht,d);T.position.set(C,1.46,.31),T.scale.set(.1,.08,.04),t.add(T)}const p=new re(Zr,a);p.position.set(0,1.7,0),p.scale.set(.65,.06,.65),t.add(p);const E=new re(ht,a);E.position.set(0,1.84,0),E.scale.set(.5,.24,.44),t.add(E);const b=new re(ht,l);b.position.set(0,1.75,0),b.scale.set(.52,.05,.46),t.add(b);const M=[];for(const C of[-.38,.38]){const T=new mt;T.position.set(C,1.2,0),t.add(T),M.push(T);const B=new re(ht,s);B.position.set(0,-.24,0),B.scale.set(.14,.5,.2),T.add(B);const U=new re(ht,l);U.position.set(0,-.54,0),U.scale.set(.13,.16,.18),T.add(U)}const R=new mt;R.position.set(.42,.65,.2);const w=new re(Zr,c);w.scale.set(.12,.25,.12),R.add(w);const I=new re(Zr,c);I.position.set(0,.12,.16),I.rotation.x=.6,I.scale.set(.03,.22,.03),R.add(I),R.visible=!1,t.add(R);const L=[];for(const C of[-.18,.18]){const T=new mt;T.position.set(C,.5,0);const B=new re(ht,s);B.position.set(0,-.14,0),B.scale.set(.18,.32,.2),T.add(B);const U=new re(ht,o);U.position.set(0,-.36,.06),U.scale.set(.2,.18,.34),U.castShadow=!0,T.add(U),t.add(T),L.push(T)}const v=rd(e);t.add(v);const y=new mt;for(const C of[...t.children])C!==v&&y.add(C);return t.add(y),t.userData={playerId:i,nickname:e,legs:L,arms:M,rig:y,emote:null,canGroup:R,nameSprite:v,setWateringCan(C){R.visible=C},updateNickname(C){t.remove(v);const T=rd(C);t.add(T),t.userData.nameSprite=T,t.userData.nickname=C}},t}class b_{constructor(e){this.scene=e,this.players=new Map}setPlayer(e){if(!e||!e.id)return;let t=this.players.get(e.id);if(t)t.targetX=e.x,t.targetZ=e.z,t.targetRotY=e.rotY,t.walking=!!e.walking,t.sitting=!!e.sitting,e.airborne&&!t.airborne&&(t.hopT=0),t.airborne=!!e.airborne,e.nickname&&e.nickname!==t.avatar.userData.nickname&&t.avatar.userData.updateNickname(e.nickname);else{const n=ih(e.id,e.nickname||"Gardener");n.position.set(e.x??0,0,e.z??0),n.rotation.y=e.rotY??0,this.scene.add(n),t={avatar:n,targetX:e.x??0,targetZ:e.z??0,targetRotY:e.rotY??0,walking:!!e.walking,sitting:!!e.sitting,airborne:!!e.airborne,hopT:0},this.players.set(e.id,t)}}removePlayer(e){const t=this.players.get(e);t&&(this.scene.remove(t.avatar),this.players.delete(e))}clear(){for(const e of this.players.values())this.scene.remove(e.avatar);this.players.clear()}update(e,t){const n=Math.min(1,e*12);for(const s of this.players.values()){const{avatar:r,targetX:a,targetZ:o,targetRotY:l,walking:c,sitting:d,airborne:f}=s;r.position.x+=(a-r.position.x)*n,r.position.z+=(o-r.position.z)*n;let h=l-r.rotation.y;for(;h<-Math.PI;)h+=Math.PI*2;for(;h>Math.PI;)h-=Math.PI*2;if(r.rotation.y+=h*n,(c||f)&&ar(r),f&&(s.hopT=Math.min(s.hopT+e,sd)),d)r.position.y=0,r.userData.legs.forEach(u=>{u.rotation.x=-1.35});else if(f&&s.hopT<sd){const u=s.hopT%id/id;r.position.y=4*E_*u*(1-u),r.userData.legs.forEach(g=>{g.rotation.x=-.8})}else c?(r.position.y=Math.sin(t*12)*.025,r.userData.legs.forEach((u,g)=>{u.rotation.x=Math.sin(t*12+g*Math.PI)*.45})):(r.position.y=0,r.userData.legs.forEach(u=>{u.rotation.x*=.8}));rh(r,e)}}}function T_(){const i=new mt,e=fn("#e6e0cc",.65,.2),t=fn("#233c3e",.6,.3),n=fn("#9c5838",.7,.2),s=fn("#b78d50",.5,.4),r=fn("#455759",.6,.3),a=new Je({color:"#d8f8e3",emissive:"#acf7d5",emissiveIntensity:2}),o=new re(ht,e);o.position.set(0,.85,0),o.scale.set(.62,.7,.48),i.add(o);const l=new re(ht,t);l.position.set(0,.92,.265),l.scale.set(.38,.35,.07),i.add(l);for(let m=0;m<3;m++){const p=new re(ht,n);p.position.set(0,.8+m*.095,.31),p.scale.set(.27,.035,.025),i.add(p)}const c=new re(ht,e);c.position.set(0,1.4,0),c.scale.set(.78,.46,.58),i.add(c);const d=new re(ht,t);d.position.set(0,1.4,.303),d.scale.set(.66,.3,.055),i.add(d);for(const m of[-.2,.2]){const p=new re(ht,a);p.position.set(m,1.43,.34),p.scale.set(.12,.1,.045),i.add(p)}const f=new re(ht,r);f.position.set(0,1.66,0),f.scale.set(.87,.08,.65),i.add(f);const h=new re(Zr,n);h.position.set(.23,1.85,0),h.scale.set(.025,.3,.025),i.add(h);const u=new re(ht,s);u.position.set(.23,2.01,0),u.scale.set(.075,.075,.075),i.add(u);const g=new re(ht,r);g.position.set(0,.93,-.34),g.scale.set(.48,.53,.25),i.add(g);const _=[];for(const m of[-.22,.22]){const p=new mt;p.position.set(m,.52,0);const E=new re(ht,r);E.position.set(0,-.15,0),E.scale.set(.17,.33,.19),p.add(E);const b=new re(ht,e);b.position.set(0,-.34,.09),b.scale.set(.24,.16,.38),p.add(b),i.add(p),_.push(p);const M=new re(ht,e);M.position.set(m*1.9,.86,0),M.scale.set(.18,.53,.22),i.add(M)}return i.scale.setScalar(.68),i.userData.legs=_,i.castShadow=!0,i}function sh(i,e){!i||!Md(e)||(ar(i),i.userData.emote={id:e,elapsed:0})}function ar(i){const e=i?.userData;e?.rig&&(e.emote=null,e.rig.rotation.set(0,0,0),e.rig.position.set(0,0,0),e.arms.forEach(t=>t.rotation.set(0,0,0)))}function rh(i,e){const t=i.userData,n=t.emote;if(!n)return;n.elapsed+=e;const s=n.elapsed;if(s>=Sa){ar(i);return}const r=Math.min(1,s/.25,(Sa-s)/.4),[a,o]=t.arms;switch(t.rig.rotation.set(0,0,0),t.rig.position.set(0,0,0),a.rotation.set(0,0,0),o.rotation.set(0,0,0),n.id){case"wave":o.rotation.z=(2.5+Math.sin(s*13)*.35)*r;break;case"dance":t.rig.rotation.z=Math.sin(s*7)*.16*r,t.rig.rotation.y=Math.sin(s*4)*.4*r,a.rotation.x=Math.sin(s*7)*.9*r,o.rotation.x=-a.rotation.x,a.rotation.z=-.65*r,o.rotation.z=.65*r;break;case"cheer":a.rotation.z=-2.6*r,o.rotation.z=2.6*r,t.rig.position.y=Math.abs(Math.sin(s*7))*.12*r;break;case"heart":a.rotation.x=o.rotation.x=-1.2*r,a.rotation.z=.65*r,o.rotation.z=-.65*r,t.rig.rotation.z=Math.sin(s*3)*.1*r;break;case"bow":t.rig.rotation.x=Math.sin(Math.min(1,s/Sa)*Math.PI)*.55,o.rotation.x=-1*r,o.rotation.z=-.6*r;break;case"shrug":a.rotation.z=-1.15*r,o.rotation.z=1.15*r,a.rotation.x=o.rotation.x=-.5*r,t.rig.rotation.z=Math.sin(s*3)*.13*r;break}}const io=new Zt(1,1,1),w_=new ti(1,1,1,8),so=new Map;function $e(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return so.has(n)||so.set(n,new Je({color:i,roughness:e,metalness:t})),so.get(n)}function A_(){const i=new mt;i.name="market";const e=[],t=[],n=[];function s(Q,z,Y,he,Re,xe,Be,Et=i){const P=new re(io,typeof Be=="string"?$e(Be):Be);return P.position.set(Q,z,Y),P.scale.set(he,Re,xe),P.castShadow=!0,P.receiveShadow=!0,Et.add(P),P}function r(Q,z,Y,he){e.push({x:Q,z,w:Y/2+.38,d:he/2+.38})}function a(Q,z,Y,he,Re,xe,Be,Et=1.5){const P=s(Q,z,Y,he,Re,xe,Be);return P.material=new Je({color:Be,emissive:Be,emissiveIntensity:Et}),P}function o(Q,z,Y,he="#ffc775"){s(Q,z,Y,.3,.48,.3,new Je({color:"#fff2c6",emissive:he,emissiveIntensity:2.5})),s(Q,z+.28,Y,.46,.1,.44,$e("#192d2d")),s(Q,z-.28,Y,.36,.1,.35,$e("#192d2d"));const Re=new Il(he,6,7,2);return Re.position.set(Q,z-.1,Y+.2),i.add(Re),Re}s(0,-.6,0,28,1,25,$e("#242f2b")),s(0,-.12,0,24,.4,21,$e("#3d4944",.27,.32));const l=["#485450","#535e55","#647065","#70776a","#3a4845","#7b7e6d"];let c=42;function d(){return c=c*1664525+1013904223>>>0,c/4294967296}for(let Q=-12;Q<12;Q++)for(let z=-10;z<11;z++){const Y=new Fe(l[Math.floor(d()*l.length)]).multiplyScalar(.75+d()*.25);s(Q+.49+z%2*.05,.06+d()*.03,z+.47,.96,.16,.96,$e("#"+Y.getHexString(),.3+d()*.3,.2))}for(let Q=0;Q<40;Q++){const z=new re(new wl(.4+d()*.9,9),$e("#516564",.07,.62));z.rotation.x=-Math.PI/2,z.position.set((d()-.5)*22,.183,(d()-.5)*19),z.scale.y=.4+d()*.4,i.add(z)}for(let Q=-12;Q<=12;Q+=.8)for(let z=.4;z<3;z+=.4)s(Q,z,-10.5,.76,.37,.65,z>2.6?"#a0a18a":"#4d6561");for(let Q=-10;Q<11;Q+=.8)for(const z of[-12,12])Math.abs(Q)<2||(s(z,.65,Q,.5,1.3,.76,$e("#192d2d")),s(z,1.35,Q,.7,.15,.78,$e("#485450")));const f=0,h=-7.5;s(f,1.5,h,5.5,3,1.4,$e("#3f3224")),r(f,h,5.5,1.4);for(const Q of[-2.5,2.5]){const z=new re(w_,$e("#2d241c"));z.position.set(f+Q,2.2,h+.9),z.scale.set(.08,3.4,.08),i.add(z)}const u=s(f,3.6,h+.4,6,.25,2.4,$e("#7b4c34",.8));u.rotation.x=.18,s(f,1.8,h+.72,4.4,1.8,.08,$e("#1a2422",.9,.1)),o(f-1.8,2.8,h+.8),o(f+1.8,2.8,h+.8),t.push({type:"market_board",x:f,z:h+1.5,title:"Market Exchange Board",sub:"Press E to view spot prices, create orders, and trade"});const g=-6.5,_=-4.5;s(g,.9,_,3.6,1.8,2,$e("#4a3b2b")),r(g,_,3.6,2),s(g,1.85,_,3.8,.1,2.2,$e("#63523f"));for(let Q=-1;Q<=1;Q++)s(g+Q*.9,2.1,_,.6,.5,.6,$e(["#b8aa83","#a29571","#c4b693"][Q+1]));o(g,2.8,_+.8,"#ffdf96"),t.push({type:"seed_vendor",x:g,z:_+1.6,title:"Town Seed Merchant",sub:"Press E to browse seeds, tubers, and planting starts"});const m=6.5,p=-4.5;s(m,1.4,p,3.4,2.8,1,$e("#2d3c39")),r(m,p,3.4,1),s(m,1.6,p+.52,2.8,1.6,.06,$e("#d0c5a0",.85,.05)),o(m,2.9,p+.6,"#ffd580"),t.push({type:"contracts_board",x:m,z:p+1.5,title:"Restaurant & Café Noticeboard",sub:"Press E to fulfill delivery contracts for coins and reputation"});for(const[Q,z,Y]of[[-8,4,1.1],[-9.2,4.2,.9],[8.5,5,1],[9.5,5.4,.9],[-3,-3,.8],[3,-3,.8],[-8.5,-8,1.2],[8.5,-8,1.2]])s(Q,Y*.5,z,Y,Y,Y,$e("#634932")),r(Q,z,Y,Y);const E=10.7,b=0;for(const Q of[-1.5,1.5])s(E,1.8,Q,.6,3.6,.6,$e("#273d3d")),a(E,3.6,Q,.8,.3,.8,"#74d0bd",2);s(E,3.8,0,.8,.35,3.6,$e("#273d3d")),t.push({type:"garden_gate",x:E,z:b,title:"Travel to Your Market Garden",sub:"Press E to walk the path to your personal plot"});const M=-10.7,R=0;for(const Q of[-1.5,1.5])s(M,1.8,Q,.6,3.6,.6,$e("#273d3d")),a(M,3.6,Q,.8,.3,.8,"#e0c889",2);s(M,3.8,0,.8,.35,3.6,$e("#273d3d")),t.push({type:"district_gate",targetDistrict:"canal",x:M,z:R,title:"The Outer Districts Gateway",sub:"Press E to venture into the ancient city biomes"});const w=new mt;w.name="dynamic",i.add(w);const I={restored:!1},L=3,v=7.6;s(L,1.6,v,2.6,3.2,2.6,$e("#5a5f58",.75,.12),w),s(L,3.3,v,2.9,.28,2.9,$e("#6d7268"),w),s(L,.35,v,3,.7,3,$e("#454a44"),w),r(L,v,2.6,2.6),s(L,.75,v-1.32,.9,1.5,.12,$e("#2c2620"),w);const y=a(L,1,v-1.36,.7,1,.05,"#e0a865",.4);w.add(y);const C=new mt;w.add(C);const T=s(L,3.8,v,2.2,.5,2.2,$e("#4a3b2b"),C);T.rotation.z=.28;const B=s(L-1.9,.5,v-1.7,2.4,.16,.22,$e("#6b5845"),C);B.rotation.z=.1;const U=s(L+1.75,.55,v-1.5,1,1,.35,$e("#7d827a"),C);U.rotation.z=.35;const F=new mt;w.add(F),s(L,3.85,v,2.5,.55,2.5,$e("#63513a"),F),s(L,4.25,v,1.4,.35,1.4,$e("#54452f"),F);const N=new mt;N.position.set(L,3.6,v-1.42),F.add(N),s(L,3.6,v-1.35,.5,.5,.4,$e("#8a744f"),N);for(let Q=0;Q<4;Q++){const z=s(0,0,0,2.3,.5,.08,$e("#a08a5f",.7),N);z.position.set(Math.cos(Q*Math.PI/2)*1.35,Math.sin(Q*Math.PI/2)*1.35,-.18),z.rotation.z=Q*Math.PI/2}const W=a(L+1,1.9,v-1.36,.2,.3,.08,"#ffcb79",1.4);F.add(W);const V=a(L,1.05,v-1.38,.8,.5,.05,"#f0b060",.8);F.add(V),t.push({type:"mill",x:L,z:5.6,title:"The Great Mill (broken)",sub:"Press E to help restore it with materials"});const j=5.8,ee=7.4;s(j,.55,ee,1.5,.9,1.1,$e("#4a3b2b"),w),s(j,1.05,ee,1.6,.12,1.2,$e("#5f4d36"),w),r(j,ee,1.5,1.1),s(j-.35,1.25,ee,.5,.3,.5,$e("#7d827a"),w),s(j+.4,1.22,ee-.15,.3,.24,.3,$e("#c07840"),w),t.push({type:"machine_bench",x:j,z:6.2,title:"Machine Shop Workbench",sub:"Press E to contribute materials & craft garden tools"});function ce(Q){const z=Q?.mill?.status==="restored";I.restored=z,C.visible=!z,F.visible=z;const Y=t.find(he=>he.type==="mill");Y&&(Y.title=z?"The Great Mill":"The Great Mill (broken)",Y.sub=z?"Press E to mill wheat into flour":"Press E to help restore it with materials")}ce(null);const Ee=i.children.filter(Q=>Q.isMesh&&Q.geometry===io&&!Q.material.transparent&&Q.material.emissive?.getHex()===0),He=new ua(io,new Je({color:16777215,roughness:.62,metalness:.2}),Ee.length);Ee.forEach((Q,z)=>{Q.updateMatrix(),He.setMatrixAt(z,Q.matrix),He.setColorAt(z,Q.material.color),i.remove(Q)}),He.castShadow=!0,He.receiveShadow=!0,i.add(He);function Qe(Q){n.forEach(z=>z(Q)),I.restored&&(N.rotation.z=Q*.55)}return{group:i,obstacles:e,items:t,update:Qe,setMachineState:ce}}const _n={radish:{id:"radish",name:"Red Radish",tagline:"Crisp peppery roots, fast to harvest.",seedCost:4,basePrice:8,growDuration:25,waterDemand:1,yield:2,repeatHarvest:!1,color:"#4d8050",produceColor:"#c93b4a",xp:12,unlockLevel:1},lettuce:{id:"lettuce",name:"Rain Crisp Lettuce",tagline:"Tender layered greens favored by market cafes.",seedCost:6,basePrice:12,growDuration:40,waterDemand:1.2,yield:2,repeatHarvest:!1,color:"#65a759",produceColor:"#83cf72",xp:18,unlockLevel:1},carrot:{id:"carrot",name:"Amber Carrot",tagline:"Deep sweet orange taproots grown in dark tilled soil.",seedCost:8,basePrice:17,growDuration:60,waterDemand:.9,yield:2,repeatHarvest:!1,color:"#498845",produceColor:"#e07a2a",xp:25,unlockLevel:1},kale:{id:"kale",name:"Winter Kale",tagline:"Hearty ruffled brassica that thrives in cold rain.",seedCost:12,basePrice:24,growDuration:80,waterDemand:.8,yield:3,repeatHarvest:!1,color:"#2d6148",produceColor:"#3d785a",xp:32,unlockLevel:2},basil:{id:"basil",name:"Copper Basil",tagline:"Aromatic dark purple-green leaves prized by the apothecary.",seedCost:15,basePrice:32,growDuration:100,waterDemand:1.3,yield:3,repeatHarvest:!1,color:"#425a40",produceColor:"#7b3e64",xp:40,unlockLevel:2},tomato:{id:"tomato",name:"Lantern Tomato",tagline:"Heavy climbing vine with glowing scarlet fruit. Continues bearing.",seedCost:22,basePrice:28,growDuration:120,waterDemand:1.1,yield:3,repeatHarvest:!0,regrowDuration:45,color:"#3f7842",produceColor:"#d6422f",xp:50,unlockLevel:3},strawberry:{id:"strawberry",name:"Dew Strawberry",tagline:"Low creeping runners with bright sweet red berries.",seedCost:28,basePrice:38,growDuration:140,waterDemand:1.4,yield:4,repeatHarvest:!0,regrowDuration:50,color:"#39784b",produceColor:"#e6324b",xp:65,unlockLevel:3},wheat:{id:"wheat",name:"Hearth Wheat",tagline:"Golden milling grain. The Great Mill grinds it into flour.",seedCost:4,basePrice:9,growDuration:30,waterDemand:1,yield:2,repeatHarvest:!1,color:"#8a8a3d",produceColor:"#d9b45a",xp:14,unlockLevel:1}},ll=Object.values(_n),qn={EMPTY:0,PREPARED:1,SEED:2,SPROUT:3,JUVENILE:4,MATURE:5,HARVESTABLE:6},C_={C:.8,B:1,A:1.35,"A+":1.8},Us=new Zt(1,1,1),ad=new Rl(1,6,6),Fr=new ti(1,1,1,6),ro=new Map;function Ns(i,e=.65,t=.1,n=0,s=0){const r=`${i}_${e}_${t}_${n}_${s}`;return ro.has(r)||ro.set(r,new Je({color:i,roughness:e,metalness:t,emissive:n,emissiveIntensity:s})),ro.get(r)}function R_(i,e,t){for(;i.children.length>0;)i.remove(i.children[0]);if(!e||t<=qn.PREPARED)return;const n=_n[e]??_n.radish,s=Ns(n.color,.6,.1),r=Ns(n.produceColor,.4,.15,n.produceColor,.25);if(t===qn.SEED){for(const[a,o]of[[-.2,-.15],[.2,.15],[0,0]]){const l=new re(Us,Ns("#829b65",.8));l.position.set(a,.08,o),l.scale.set(.06,.08,.06),l.castShadow=!0,i.add(l)}return}if(t===qn.SPROUT){const a=new re(Fr,Ns("#55864e",.7));a.position.set(0,.15,0),a.scale.set(.025,.25,.025),i.add(a);for(let o=0;o<2;o++){const l=new re(Us,s);l.position.set(o===0?-.07:.07,.24,0),l.scale.set(.12,.03,.08),l.rotation.z=(o===0?-1:1)*.4,i.add(l)}return}if(t===qn.JUVENILE){for(let a=0;a<3;a++){const o=a*Math.PI*2/3,l=new re(Fr,s);l.position.set(Math.cos(o)*.08,.25,Math.sin(o)*.08),l.scale.set(.035,.45,.035),l.rotation.z=Math.cos(o)*.25,l.rotation.x=Math.sin(o)*.25,i.add(l);const c=new re(Us,s);c.position.set(Math.cos(o)*.16,.45,Math.sin(o)*.16),c.scale.set(.22,.06,.16),c.rotation.y=o,i.add(c)}return}if(t===qn.MATURE||t===qn.HARVESTABLE){const a=t===qn.HARVESTABLE,o=a?1:.85;if(e==="tomato"){const l=new re(Fr,Ns("#5b4834",.8));l.position.set(0,.5,0),l.scale.set(.04,1,.04),i.add(l)}for(let l=0;l<5;l++){const c=l*Math.PI*2/5,d=new re(Us,s);d.position.set(Math.cos(c)*.2*o,.35+l%2*.15,Math.sin(c)*.2*o),d.scale.set(.3*o,.1,.22*o),d.rotation.set(Math.sin(c)*.3,c,Math.cos(c)*.3),d.castShadow=!0,i.add(d)}if(a)if(e==="radish"||e==="carrot")for(let l=0;l<3;l++){const c=(l-1)*.18,d=new re(e==="carrot"?Fr:ad,r);d.position.set(c,e==="carrot"?.2:.16,0),d.scale.set(.12,.22,.12),d.castShadow=!0,i.add(d)}else if(e==="tomato"||e==="strawberry")for(let l=0;l<4;l++){const c=l*Math.PI*2/4+.3,d=new re(ad,r);d.position.set(Math.cos(c)*.25,.38+l%2*.15,Math.sin(c)*.25),d.scale.set(.13,.14,.13),d.castShadow=!0,i.add(d)}else for(let l=0;l<4;l++){const c=l*Math.PI*2/4,d=new re(Us,r);d.position.set(Math.cos(c)*.15,.55,Math.sin(c)*.15),d.scale.set(.24,.08,.18),d.rotation.set(.2,c+.4,.2),d.castShadow=!0,i.add(d)}}}function P_(i,e=4){const t=[];if(!Number.isInteger(i)||i<0)return t;const n=i%e;return i-e>=0&&t.push(i-e),n>0&&t.push(i-1),t.push(i),n<e-1&&t.push(i+1),t.push(i+e),t}const Ul={copper:{id:"copper",name:"Copper Scrap",tagline:"Pipe stubs and verdigris sheeting pried from the foundry floor.",color:"#c07840",glowColor:"#e8934a",district:"foundry"},timber:{id:"timber",name:"Trestle Timber",tagline:"Sound oak beams cut free of the overgrown viaduct.",color:"#7a5a38",glowColor:"#c9a05e",district:"trestle"},glass:{id:"glass",name:"Glass Shards",tagline:"Thick panes of uncracked glass swept from the frost-line benches.",color:"#9fc4d8",glowColor:"#cfeaf7",district:"frost-spire"}},od=Object.values(Ul),Ai={flour:{id:"flour",name:"Stone-Ground Flour",tagline:"Fine milled flour from the Great Mill. Bakers pay a premium.",basePrice:14}},I_=Object.values(Ai),ah={copper:4,timber:4,glass:4},is={id:"sprinkler",name:"Garden Sprinkler",cost:{copper:2,glass:2}},L_=[{id:"foundry_copper_1",district:"foundry",material:"copper",position:[4,2.5],respawnMs:18e4},{id:"foundry_copper_2",district:"foundry",material:"copper",position:[8.5,1],respawnMs:18e4},{id:"foundry_copper_3",district:"foundry",material:"copper",position:[-3.5,2.5],respawnMs:18e4},{id:"trestle_timber_1",district:"trestle",material:"timber",position:[6.5,2],respawnMs:18e4},{id:"trestle_timber_2",district:"trestle",material:"timber",position:[2.5,-2],respawnMs:18e4},{id:"trestle_timber_3",district:"trestle",material:"timber",position:[-3.5,-2],respawnMs:18e4},{id:"glasshouse_glass_1",district:"frost-spire",material:"glass",position:[8.5,2.5],respawnMs:18e4},{id:"glasshouse_glass_2",district:"frost-spire",material:"glass",position:[-3,.5],respawnMs:18e4},{id:"glasshouse_glass_3",district:"frost-spire",material:"glass",position:[2.5,3.5],respawnMs:18e4}],Si=new Zt(1,1,1),D_=new ti(1,1,1,8),ao=new Map;function Tt(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return ao.has(n)||ao.set(n,new Je({color:i,roughness:e,metalness:t})),ao.get(n)}function U_(){const i=new mt;i.name="garden";const e=[],t=[],n=[];function s(U,F,N,W,V,j,ee,ce=i){const Ee=new re(Si,typeof ee=="string"?Tt(ee):ee);return Ee.position.set(U,F,N),Ee.scale.set(W,V,j),Ee.castShadow=!0,Ee.receiveShadow=!0,ce.add(Ee),Ee}function r(U,F,N,W){e.push({x:U,z:F,w:N/2+.38,d:W/2+.38})}function a(U,F,N,W,V,j,ee,ce=1.5){const Ee=s(U,F,N,W,V,j,ee);return Ee.material=new Je({color:ee,emissive:ee,emissiveIntensity:ce}),Ee}function o(U,F,N,W="#ffdf96"){s(U,F,N,.25,.4,.25,new Je({color:"#fff2c6",emissive:W,emissiveIntensity:2.5})),s(U,F+.22,N,.38,.08,.38,Tt("#232a28"));const V=new Il(W,5,6,2);return V.position.set(U,F,N),i.add(V),V}s(0,-.6,0,28,1,26,Tt("#272b22")),s(0,-.12,0,25,.4,23,Tt("#383e2f",.85,.1));const l=Tt("#565b4c",.8,.1);s(0,.07,0,24,.12,2.5,l),s(0,.07,0,2.5,.12,20,l);for(let U=-12;U<=12;U+=.8)s(U,.6,-10.5,.76,1.2,.65,Tt("#414b38")),s(U,.6,10.5,.76,1.2,.65,Tt("#414b38"));for(let U=-10;U<=10;U+=.8)for(const F of[-12,12])Math.abs(U)<2||s(F,.6,U,.65,1.2,.76,Tt("#414b38"));const c=-10.7,d=0;for(const U of[-1.4,1.4])s(c,1.8,U,.5,3.4,.5,Tt("#2d3835")),a(c,3.4,U,.7,.25,.7,"#74d0bd",2);s(c,3.6,0,.7,.3,3.3,Tt("#2d3835")),t.push({type:"market_gate",x:c,z:d,title:"Return to Market Court",sub:"Press E to walk back to the town market square"});const f=[[-6,-7],[-2,-7],[2,-7],[6,-7],[-6,-4],[-2,-4],[2,-4],[6,-4],[-6,4],[-2,4],[2,4],[6,4]];for(let U=0;U<f.length;U++){const[F,N]=f[U],W=2.4,V=1.6;s(F,.25,N,W+.2,.35,V+.2,Tt("#4d3e2c",.8,.1));const j=new Fe("#382c1e"),ee=new re(Si,new Je({color:j.clone(),roughness:.85,metalness:.05}));ee.position.set(F,.35,N),ee.scale.set(W,.15,V),ee.castShadow=!0,ee.receiveShadow=!0,i.add(ee),r(F,N,W*.7,V*.7);const ce=new mt;ce.position.set(F,.42,N),i.add(ce),n.push({bedIndex:U,soilMesh:ee,plantGroup:ce,x:F,z:N,renderedCrop:null,renderedStage:-1}),t.push({type:"bed",bedIndex:U,x:F,z:N,title:`Garden Bed #${U+1}`,sub:"Empty. Select Hoe to prepare or Seed to plant."})}const h=-8.8,u=-8;s(h,1.8,u,3.2,3.2,2.6,Tt("#3f3323")),r(h,u,3.2,2.6);const g=s(h,3.5,u,3.6,.15,3,Tt("#52605f",.4,.5));g.rotation.z=-.15,o(h+1.2,2.6,u+1.4);const _=-8.5,m=-2.5;s(_,.45,m,1.4,.8,2,Tt("#443727")),r(_,m,1.4,2);const p=new re(new An(1.1,1.7),new Je({color:"#346d78",roughness:.1,metalness:.7,transparent:!0,opacity:.85}));p.rotation.x=-Math.PI/2,p.position.set(_,.82,m),i.add(p),t.push({type:"water_source",x:_+.8,z:m,title:"Rainwater Cistern",sub:"Clean water caught from the greenhouse gutters"});const E=9,b=-7.5;s(E,.6,b,2.4,1,2.2,Tt("#403425")),r(E,b,2.4,2.2),s(E,.9,b,2,.5,1.8,Tt("#261e14",.9));const M=9,R=5;s(M,.6,R,2.5,.9,3.2,Tt("#54432f")),r(M,R,2.5,3.2);const w=new re(D_,Tt("#707b78",.3,.6));w.position.set(M,1.2,R-.6),w.scale.set(.45,.45,.45),i.add(w),o(M-.8,2.4,R);const I=[],L=new sr(.62,.72,24);for(let U=0;U<5;U++){const F=new re(L,new xs({color:"#7fd0e8",side:sn,transparent:!0,opacity:.55}));F.rotation.x=-Math.PI/2,F.position.y=.3,F.visible=!1,i.add(F),I.push(F)}function v(U){const F=Number.isInteger(U)&&U>=0?P_(U).filter(N=>n[N]):[];I.forEach((N,W)=>{const V=F[W];if(V===void 0){N.visible=!1;return}const j=n[V];N.position.set(j.x,.3,j.z),N.visible=!0})}function y(U){const F=new Map((U||[]).map(N=>[N.bedIndex,N]));for(const N of n){const W=F.get(N.bedIndex);if(W&&!N.fixtureGroup){const V=new mt;V.position.set(N.x,.42,N.z);const j=new re(Si,Tt("#8a6844",.6,.3));j.scale.set(.1,.55,.1),j.position.y=.27,j.castShadow=!0,V.add(j);const ee=Tt("#b0784a",.5,.5);for(const[Ee,He]of[[.24,0],[-.24,0],[0,.24],[0,-.24]]){const Qe=new re(Si,ee);Qe.scale.set(.34,.07,.07),Qe.position.set(Ee*.9,.52,He*.9),Qe.rotation.y=He!==0?Math.PI/2:0,V.add(Qe)}const ce=new re(Si,new Je({color:"#aedff2",emissive:"#7fd0e8",emissiveIntensity:.9,transparent:!0,opacity:.85,roughness:.2,metalness:.1}));ce.scale.setScalar(.16),ce.position.y=.62,V.add(ce),N.fixtureGroup=V,N.fixtureGlobe=ce,i.add(V)}else!W&&N.fixtureGroup&&(i.remove(N.fixtureGroup),N.fixtureGroup=null,N.fixtureGlobe=null)}}const C=i.children.filter(U=>U.isMesh&&U.geometry===Si&&!U.material.transparent&&!U.material.emissive?.getHex()),T=new ua(Si,new Je({color:16777215,roughness:.65,metalness:.15}),C.length);C.forEach((U,F)=>{U.updateMatrix(),T.setMatrixAt(F,U.matrix),T.setColorAt(F,U.material.color),i.remove(U)}),T.castShadow=!0,T.receiveShadow=!0,i.add(T);function B(U,F=null){if(F)for(const N of n){const W=F[N.bedIndex];if(!W)continue;N.fixtureGlobe&&(N.fixtureGlobe.rotation.y=U*1.2+N.bedIndex,N.fixtureGlobe.position.y=.62+Math.sin(U*3+N.bedIndex)*.03);const V=N.soilMesh.material;if(!W.prepared)V.color.set("#483d2f");else{const j=W.moisture||0,ee=new Fe("#352a1c"),ce=new Fe("#161009");V.color.copy(ee).lerp(ce,j)}(N.renderedCrop!==W.cropId||N.renderedStage!==W.stage)&&(N.renderedCrop=W.cropId,N.renderedStage=W.stage,R_(N.plantGroup,W.cropId,W.stage))}}return{group:i,obstacles:e,items:t,bedVisuals:n,update:B,setFixtures:y,previewCoverage:v}}const Fs=new D;function hn(i,e,t,n,s,r){const a=2*Math.PI*s/4,o=Math.max(r-2*s,0),l=Math.PI/4;Fs.copy(e),Fs[n]=0,Fs.normalize();const c=.5*a/(a+o),d=1-Fs.angleTo(i)/l;return Math.sign(Fs[t])===1?d*c:o/(a+o)+c+c*(1-d)}class Nl extends Zt{constructor(e=1,t=1,n=1,s=2,r=.1){const a=s*2+1;if(r=Math.min(e/2,t/2,n/2,r),super(1,1,1,a,a,a),this.type="RoundedBoxGeometry",this.parameters={width:e,height:t,depth:n,segments:s,radius:r},a===1)return;const o=this.toNonIndexed();this.index=null,this.attributes.position=o.attributes.position,this.attributes.normal=o.attributes.normal,this.attributes.uv=o.attributes.uv;const l=new D,c=new D,d=new D(e,t,n).divideScalar(2).subScalar(r),f=this.attributes.position.array,h=this.attributes.normal.array,u=this.attributes.uv.array,g=f.length/6,_=new D,m=.5/a;for(let p=0,E=0;p<f.length;p+=3,E+=2)switch(l.fromArray(f,p),c.copy(l),c.x-=Math.sign(c.x)*m,c.y-=Math.sign(c.y)*m,c.z-=Math.sign(c.z)*m,c.normalize(),f[p+0]=d.x*Math.sign(l.x)+c.x*r,f[p+1]=d.y*Math.sign(l.y)+c.y*r,f[p+2]=d.z*Math.sign(l.z)+c.z*r,h[p+0]=c.x,h[p+1]=c.y,h[p+2]=c.z,Math.floor(p/g)){case 0:_.set(1,0,0),u[E+0]=hn(_,c,"z","y",r,n),u[E+1]=1-hn(_,c,"y","z",r,t);break;case 1:_.set(-1,0,0),u[E+0]=1-hn(_,c,"z","y",r,n),u[E+1]=1-hn(_,c,"y","z",r,t);break;case 2:_.set(0,1,0),u[E+0]=1-hn(_,c,"x","z",r,e),u[E+1]=hn(_,c,"z","x",r,n);break;case 3:_.set(0,-1,0),u[E+0]=1-hn(_,c,"x","z",r,e),u[E+1]=1-hn(_,c,"z","x",r,n);break;case 4:_.set(0,0,1),u[E+0]=1-hn(_,c,"x","y",r,e),u[E+1]=1-hn(_,c,"y","x",r,t);break;case 5:_.set(0,0,-1),u[E+0]=hn(_,c,"x","y",r,e),u[E+1]=1-hn(_,c,"y","x",r,t);break}}static fromJSON(e){return new Nl(e.width,e.height,e.depth,e.segments,e.radius)}}function N_(i){const{group:e,block:t,box:n,glow:s,material:r,colors:a,items:o,animated:l}=i;n(0,.25,-8.3,14,.5,2.4,"#3a3134"),t(0,-8.3,14,2.4);const c=s(0,3.1,-8.35,13,4,.15,"#101418",.12);n(0,5.25,-8.3,13.6,.3,.34,a.brass),n(0,.95,-8.3,13.6,.3,.34,a.brass);for(const T of[-6.65,6.65])n(T,3.1,-8.3,.3,4.6,.34,a.brass);i.screenQuad=[new D(-6.5,1.1,-8.28),new D(6.5,1.1,-8.28),new D(6.5,5.1,-8.28),new D(-6.5,5.1,-8.28)],l.push((T,B)=>{c.material.emissiveIntensity=B?.45+Math.sin(T*2)*.08:.12});for(const T of[-1,1]){const B=n(T*7.3,2.7,-8.1,1.1,5.4,2.8,"#5a2029");B.rotation.z=-T*.035,t(T*7.3,-8.1,1.1,2.8)}n(0,6.2,-8.1,15.8,.5,1.2,"#4a1b22"),n(0,5.75,-7.7,13.4,.55,.5,"#2c2226");const d=[];for(let T=-6;T<=6;T+=.75)d.push(s(T,5.75,-7.42,.16,.16,.12,"#ffd9a0",.15));l.push((T,B)=>{d.forEach((U,F)=>{U.material.emissiveIntensity=B?1.6+Math.sin(T*3+F)*.5:.15})}),n(8,1.5,-6,1.8,3,1.6,a.dark),t(8,-6,1.8,1.6),n(8,3.15,-6.1,.6,.3,.6,"#33393c"),n(8,3.55,-6.1,.55,.5,.8,"#22282b");const f=new re(new ti(.14,.14,.45,10),r(a.brass));f.rotation.x=Math.PI/2,f.position.set(8,3.55,-6.65),e.add(f);const h=s(4.6,3.33,-7.58,.1,.1,6.95,"#ffe9c0",0);h.rotation.y=Math.atan2(-6.8,-1.35),l.push((T,B)=>{h.material.emissiveIntensity=B?.9+Math.sin(T*7)*.15:0});const u=[];for(const T of[-3.5,3.5])for(const B of[1.4,3.6])u.push(s(T,.1,B,.18,.1,.18,"#ffca7a",.15));l.push((T,B)=>{u.forEach((U,F)=>{U.material.emissiveIntensity=B?1.7+Math.sin(T*2+F)*.3:.15})});const g=new Map,_=new Je({color:"#ffffff",roughness:.96,metalness:0}),m=new Je({color:"#ffffff",roughness:.38,metalness:.65}),p=new Nl(1,1,1,3,.12),E=new ti(1,1,1,16),b=new fa(1,.18,8,20),M=new Cl(1,1);function R(T,B,U,F,N,W,V,j,ee,ce=0){let Ee=g.get(T);Ee||g.set(T,Ee=new Map),Ee.has(B)||Ee.set(B,[]);const He=new Rt;He.position.set(U,F,N),He.scale.set(W,V,j),He.rotation.x=ce,He.updateMatrix(),Ee.get(B).push({matrix:He.matrix.clone(),color:new Fe(ee)})}const w=(T,B,U,F,N,W,V,j=0)=>R(p,_,T,B,U,F,N,W,V,j),I=[-2.75,-1.65,-.55,.55,1.65,2.75],L=[3.9,5,6.1,7.2,8.15],v=[...I,...L,...L.map(T=>-T)];for(const[T,B]of[[.3,1],[2.5,2],[4.7,3]])for(const[U,F]of v.entries()){t(F,T,.76,.62);const N=U%3===0?"#702c3b":"#602333";w(F,.48,T-.02,.58,.22,.59,N),w(F,.89,T+.24,.65,.92,.19,"#29282d",-.1),w(F,.91,T+.13,.57,.79,.18,N,-.1),w(F,1.2,T+.09,.49,.22,.13,"#823748",-.1);for(const W of[-.16,0,.16])w(F+W,.86,T+.025,.135,.4,.055,N,-.1);n(F,.19,T+.08,.13,.29,.22,"#262b30"),w(F,.17,T+.06,.47,.055,.39,"#303238");for(const W of[-.34,.34])n(F+W,.42,T+.06,.06,.49,.3,"#272b30"),w(F+W,.7,T,.1,.12,.65,"#29272d"),R(b,m,F+W,.77,T-.2,.055,.055,.055,"#ae8953",Math.PI/2),R(E,m,F+W,.743,T-.2,.042,.045,.042,"#151b20");n(F,1.08,T+.36,.14,.065,.02,a.brass),o.push({type:"seat",x:F,z:T,title:"Take a seat",sub:`Row ${B} · Seat ${U+1} · The Orpheum`})}n(0,.145,2.7,18.6,.025,8.5,"#34212c"),n(0,.145,8,18.6,.025,2,"#502b35");for(const T of[-9.15,9.15])n(T,.165,3.9,.045,.02,12,a.brass);for(const T of[-1.35,1.4,3.6,5.85]){n(0,.165,T,18.3,.02,.035,"#98754e");for(const B of[-8.95,8.95])s(B,.2,T,.12,.05,.22,"#ffca7a",.65)}for(const T of[-1,1])for(const B of[-4.5,2.8,6.4]){n(T*11.65,1.65,B,.25,3.05,2.3,"#302e38");for(let U=-.9;U<=.9;U+=.3)n(T*11.49,1.6,B+U,.12,2.8,.06,"#765447");n(T*11.38,1.9,B,.18,.65,.4,a.brass),s(T*11.25,1.9,B,.12,.45,.24,"#ffcc89",.8),w(T*11.25,3,B,.4,.62,.48,"#20262b");for(let U=2.8;U<3.25;U+=.08)n(T*11.02,U,B,.025,.025,.36,"#44494b")}n(-6.6,.65,9.2,5.1,1.05,1.2,"#48342e"),t(-6.6,9.2,5.1,1.2),n(-6.6,1.21,9.2,5.3,.13,1.4,"#c0a983");for(const T of[-8.5,-7.5,-6.5,-5.5,-4.5])n(T,.65,8.58,.78,.74,.04,"#6c493a"),n(T,.99,8.54,.64,.025,.03,a.brass);const y=-8;w(y,1.38,9.2,1.2,.23,.94,"#8a3036"),w(y,2.6,9.2,1.35,.24,1.04,"#8a3036"),s(y,2.44,9.2,1.02,.035,.73,"#ffcf7b",.8);for(const T of[-.54,.54])for(const B of[-.4,.4])n(y+T,1.99,9.2+B,.055,1.08,.055,a.brass);const C=new re(new Zt(1.04,.97,.79),new Je({color:"#d5e1dc",transparent:!0,opacity:.1,roughness:.12,depthWrite:!1}));C.position.set(y,1.98,9.2),e.add(C),R(E,m,y,2.16,9.2,.3,.25,.3,"#ad885b"),R(E,m,y,2.32,9.2,.34,.06,.34,"#d1b17b"),n(y,2.4,9.2,.04,.14,.04,"#45454a");for(let T=0;T<150;T++){const B=y+Math.sin(T*43.7)*.46,U=9.2+Math.cos(T*17.3)*.33;R(M,_,B,1.55+T%5*.026,U,.047,.043,.044,T%3?"#efcd83":"#fff0b9")}for(let T=0;T<9;T++)n(y-.52+T*.13,2.61,8.67,.055,.17,.02,"#e9d6ae");for(const T of[-6.9,-6.45,-6]){w(T,1.48,9,.29,.42,.29,"#ecdbb5");for(const B of[-.09,.03])n(T+B,1.48,8.848,.035,.37,.014,"#a13d40");for(let B=0;B<9;B++)R(M,_,T+Math.sin(B*5)*.1,1.71,9+Math.cos(B*4)*.1,.046,.04,.045,"#ffe4a0")}w(-4.8,1.73,9.35,.88,.94,.65,"#283a3c");for(const[T,B]of["#a95140","#bd9a4e","#528482"].entries())s(-5.07+T*.27,1.91,9.01,.19,.25,.025,B,.25),n(-5.07+T*.27,1.64,8.97,.05,.15,.12,a.brass);n(-4.8,1.31,8.93,.88,.06,.32,"#848680"),w(7.8,.66,8.8,.76,1.02,.76,"#2e4141"),t(7.8,8.8,.76,.76),w(7.8,1.21,8.8,.81,.15,.81,"#ab926a"),n(7.8,1.3,8.8,.43,.025,.38,"#111d24"),n(4.6,.72,9.15,1.1,1.16,.68,"#604339"),t(4.6,9.15,1.1,.68),n(4.6,1.34,9.15,1.2,.1,.8,a.brass);for(let T=0;T<5;T++)n(4.6+T*.03,1.41+T*.025,9.15,.52,.018,.3,"#dac9a1");for(const[T,B]of g)for(const[U,F]of B){const N=new ua(T,U,F.length);F.forEach((W,V)=>{N.setMatrixAt(V,W.matrix),N.setColorAt(V,W.color)}),N.castShadow=N.receiveShadow=!0,e.add(N)}o.push({type:"theater_screen",x:0,z:-5.9,title:"Screen controls",sub:"Press E to run the picture"})}const Xt=[{id:"court",name:"The Rain Court",district:"LOWER DISTRICT / 04",subtitle:"AFTER THE RAIN",color:"#657264",sun:"#ffe0a5",description:"Wet stone, warm windows. Where your journey began."},{id:"canal",name:"The Sluiceworks",district:"WATER DISTRICT / 05",subtitle:"BENEATH THE MIST",color:"#466b70",sun:"#c3e6e1",description:"Cross the canal and wake the sleeping waterworks.",objective:"Open the sluice valve",action:"Turn the sluice valve",done:"Waterworks flowing",message:"Water moves through the old channels again. Somewhere below, a garden drinks.",landmark:[7,-5],note:[-7,5],noteTitle:"A waterkeeper’s promise",noteBody:"“Keep the water moving. The roots above us are still alive.”",spawn:[-9,0]},{id:"garden",name:"The Glass Garden",district:"UPPER TERRACES / 06",subtitle:"WHERE GREEN RETURNS",color:"#78846a",sun:"#ffe6ad",description:"An overgrown greenhouse above the city. Something still grows.",objective:"Wake the seed nursery",action:"Tend the seed nursery",done:"Nursery awakened",message:"The nursery lights up, sheltering a new generation of green. Kiln watches the leaves unfold.",landmark:[4,-5],note:[-6,5],noteTitle:"The last gardener",noteBody:"“A city is not empty while something is growing. Leave a little room for the wild.”",spawn:[-9,0]},{id:"station",name:"The Last Platform",district:"TRANSIT DISTRICT / 07",subtitle:"THE BLUE HOUR",color:"#424d70",sun:"#b4c5fa",description:"An abandoned tram stop, and a signal waiting to be heard.",objective:"Light the signal beacon",action:"Send the home signal",done:"Signal broadcasting",message:"A warm signal reaches across the rooftops. If someone is out there, they know the city is waking.",landmark:[7,5],note:[-6,5],noteTitle:"An unsent timetable",noteBody:"“Last service: whenever you are ready. There will always be a way home.”",spawn:[-9,0]},{id:"aqueduct",name:"The Sunken Aqueduct",district:"AQUEDUCT DISTRICT / 08",subtitle:"DEEP RUNS THE WATER",color:"#384d52",sun:"#9ec4c0",description:"Subterranean stone channels beneath the old city. Clear the silt sluice to let the cisterns breathe.",objective:"Clear the silt sluice",action:"Raise the silt gate",done:"Cisterns breathing",message:"Clear water rushes through the ancient conduit. The subterranean echoing returns to life.",landmark:[6,-4],note:[-6,4],noteTitle:"Cistern Overseer’s Log",noteBody:"“The masonry has held for three centuries. Give it clean water, and it will hold for three more.”",spawn:[-9,0]},{id:"caldera",name:"The Boiler Caldera",district:"GEOTHERMAL DISTRICT / 09",subtitle:"HEAT FROM THE DEEP",color:"#4d3b38",sun:"#f7aa74",description:"Steam vents hiss through dark basalt crevices. Regulate the geothermal manifold.",objective:"Regulate the geothermal manifold",action:"Turn the pressure manifold",done:"Manifold regulated",message:"Steam settles into a steady, resonant rhythm. Warm air rises toward the cold terraces above.",landmark:[5,-4],note:[-6,5],noteTitle:"Thermal Watchman",noteBody:"“Listen to the pressure before you touch a valve. The rock speaks if you have patience.”",spawn:[-9,0]},{id:"understory",name:"The Spore Understory",district:"FUNGAL DISTRICT / 10",subtitle:"LIGHT IN THE DAMP",color:"#3b4737",sun:"#a5d9a0",description:"A cavernous lower rotunda overtaken by luminous fungi. Awaken the bioluminescent mycelium.",objective:"Awaken the mycelium lattice",action:"Energize the mycelial node",done:"Mycelium luminous",message:"Soft green light pulses through the damp loam and ripples across the shelf fungi.",landmark:[6,-5],note:[-7,5],noteTitle:"Fungal Archivist",noteBody:"“Fungi remember where every tree once stood. They do not hurry, and they never forget.”",spawn:[-9,0]},{id:"saltworks",name:"The Bleached Saltworks",district:"MINERAL DISTRICT / 11",subtitle:"WHITE TERRACES OF BRINE",color:"#566668",sun:"#e3f3f7",description:"Blinding white crystalline flats and evaporation pans. Free the stuck brine pump.",objective:"Engage the brine pump",action:"Prime the brine pump",done:"Brine pump turning",message:"Clear brine trickles into the shallow crystallizers. Salt crystals shimmer in the sunlight.",landmark:[7,-4],note:[-6,4],noteTitle:"Salt Harvester’s Tablet",noteBody:"“The tide gives, the wind takes, and the salt remains. A clean basin makes clean bread.”",spawn:[-9,0]},{id:"rooftops",name:"The High Awnings",district:"SKYWARD DISTRICT / 12",subtitle:"WHERE WINDS GATHER",color:"#546370",sun:"#e6d8b8",description:"Wind-beaten scaffolding and catwalks overlooking the expanse. Free the anemometer array.",objective:"Free the anemometer array",action:"Align the wind vanes",done:"Wind array spinning",message:"The brass vanes catch the gusts and sing against the copper eaves. The city knows which way the wind blows.",landmark:[6,-5],note:[-5,5],noteTitle:"Roofkeeper’s Weather Log",noteBody:"“Up here, you feel the city breathing. The high wind is honest; it hides nothing.”",spawn:[-9,0]},{id:"mangrove",name:"The Brackish Basin",district:"ESTUARY DISTRICT / 13",subtitle:"ROOTS IN THE BRINE",color:"#44574c",sun:"#cde4cb",description:"Submerged brickwork laced with tangle roots and stilt boardwalks. Restore the tidal weir.",objective:"Clear the tidal weir",action:"Lower the timber weir",done:"Tidal weir secured",message:"The water slows behind the timber barrier. Small fish dart among the submerged brick columns.",landmark:[6,-4],note:[-6,5],noteTitle:"Estuary Keeper’s Marker",noteBody:"“The tide doesn’t care about our masonry, but the roots hold both together.”",spawn:[-9,0]},{id:"trestle",name:"The Overgrown Trestle",district:"CANOPY DISTRICT / 14",subtitle:"IRON IN THE BOUGHS",color:"#4e5a42",sun:"#dce6b6",description:"A massive iron railway viaduct gripped by ancient boughs. Restore the suspended maintenance crane.",objective:"Anchor the canopy crane",action:"Engage the hoist cable",done:"Canopy crane anchored",message:"Tension locks into the heavy iron cables. Kiln chirps as the suspension bridge stabilizes.",landmark:[7,-4],note:[-5,5],noteTitle:"Viaduct Inspector’s Plaque",noteBody:"“Steel will flex and timber will bend, but together they span the valley.”",spawn:[-9,0]},{id:"foundry",name:"The Rustfall Foundry",district:"SMELTING DISTRICT / 15",subtitle:"HEARTH OF SLAG AND ORE",color:"#4a3832",sun:"#f2a679",description:"Red iron dust and towering crucible furnaces. Ignite the pilot hearth.",objective:"Ignite the pilot hearth",action:"Spark the furnace igniter",done:"Pilot hearth glowing",message:"A warm orange glow spreads through the blast flue. Warmth returns to the cold cast iron.",landmark:[6,-4],note:[-6,5],noteTitle:"Foundry Master’s Inscription",noteBody:"“Cold iron forgets its shape until fire reminds it. Never let the pilot flame die completely.”",spawn:[-9,0]},{id:"frost-spire",name:"The Glacial Glasshouse",district:"ALPINE DISTRICT / 16",subtitle:"ABOVE THE CLOUD LINE",color:"#45596e",sun:"#d6ecff",description:"A fractured glass observatory battered by alpine frost. Clear the ice crystals from the solar collector.",objective:"Clear the solar collector",action:"Sweep the frost collector",done:"Solar collector cleared",message:"Sunlight catches the polished mirror facets. Warmth begins melting the frost along the rim.",landmark:[5,-5],note:[-6,5],noteTitle:"Alpine Observer’s Journal",noteBody:"“The cold is patient, but glass and copper remember the light. Keep looking upward.”",spawn:[-9,0]},{id:"delta",name:"The Reclaimed Marshes",district:"DELTA DISTRICT / 17",subtitle:"WHISPERS IN THE REEDS",color:"#525b45",sun:"#d9e0b2",description:"Shallow sandbars and cattail marshes woven through stranded barges. Realign the channel beacon.",objective:"Light the channel beacon",action:"Strike the marsh beacon",done:"Channel beacon lit",message:"A warm beacon reflects across the delta shallows, cutting through the twilight mist.",landmark:[7,-4],note:[-6,4],noteTitle:"Delta Boatman’s Note",noteBody:"“Follow the reeds when the silt shifts. Where water moves slowly, green things thrive.”",spawn:[-9,0]},{id:"archives",name:"The Paper Catacombs",district:"ARCHIVE DISTRICT / 18",subtitle:"WHISPERING VAULTS",color:"#48444a",sun:"#f5e4bd",description:"Stone shelves holding centuries of water-resistant parchment. Light the reading desk lamp.",objective:"Illuminate the study rotunda",action:"Turn the reading lamp switch",done:"Study rotunda illuminated",message:"A soft amber globe illuminates centuries of hand-bound volumes. The silence feels like peace.",landmark:[5,-4],note:[-6,5],noteTitle:"Chief Archivist’s Dedication",noteBody:"“Words outlive empires, provided someone keeps the rain from dripping on the ink.”",spawn:[-9,0]},{id:"kiln-terrace",name:"The Solar Kiln",district:"TERRACOTTA DISTRICT / 19",subtitle:"BAKED IN WARMTH",color:"#634b3e",sun:"#ffd09e",description:"Baked clay tiles and parabolic sun collectors. Align the solar concentrator.",objective:"Focus the solar concentrator",action:"Calibrate the focal mirror",done:"Concentrator focused",message:"A brilliant point of concentrated sunlight gleams against the terracotta kiln. Warmth radiates.",landmark:[6,-4],note:[-5,5],noteTitle:"Potter’s Credo",noteBody:"“Earth, water, and sun. With these three, a broken city can remake itself cup by cup.”",spawn:[-9,0]},{id:"theater",name:"The Orpheum",district:"CINEMA DISTRICT / 20",subtitle:"PICTURES IN THE DARK",color:"#3a3345",sun:"#e8c9a0",description:"A grand old cinema where the city gathers after dark. Queue a film, take a seat.",objective:"Restore power to the projector",action:"Restore the projector",done:"Projector humming",message:"The marquee blazes and the reel begins to turn. Take a seat — whatever plays here plays for everyone.",landmark:[8,-6],note:[-6,7.2],noteTitle:"The Orpheum’s house rules",noteBody:"“Anyone may change the picture. No one owns the screen. Leave the aisle lamps burning for whoever comes next.”",spawn:[-9,0]}],oh=new Zt(1,1,1),oo=new Map;function Rn(i,e=null,t=0){const n=`${i}_${e||""}_${t}`;return oo.has(n)||oo.set(n,new Je({color:i,roughness:.62,metalness:.2,emissive:e||"#000000",emissiveIntensity:t})),oo.get(n)}function Pn(i,e,t,n,s,r,a,o,l=0,c=0){const d=new re(oh,o);return d.position.set(e,t,n),d.scale.set(s,r,a),d.rotation.z=l,d.rotation.y=c,d.castShadow=d.receiveShadow=!0,i.add(d),d}function F_(i,e){const{group:t,items:n,animated:s}=e,r=L_.filter(l=>l.district===i.id);if(r.length===0)return null;const a=new mt;return a.name="dynamic",t.add(a),{visuals:r.map((l,c)=>{const d=Ul[l.material],[f,h]=l.position,u=new mt;u.position.set(f,0,h),a.add(u),Pn(u,0,.12,0,1.15,.24,1.15,Rn("#3d4547"));const g=new mt;u.add(g),l.material==="copper"?(Pn(g,-.18,.34,.1,.42,.34,.42,Rn(d.color),0,.4),Pn(g,.22,.3,-.14,.34,.26,.34,Rn("#a8663a"),.2,-.5),Pn(g,.05,.54,.02,.2,.22,.2,Rn("#d18b52"),-.3,.9)):l.material==="timber"?(Pn(g,0,.36,.05,1.05,.26,.3,Rn(d.color),0,.18),Pn(g,.06,.6,-.04,.95,.24,.28,Rn("#8a6842"),0,-.32),Pn(g,-.05,.8,.02,.6,.2,.24,Rn("#6b4e30"),0,.62)):(Pn(g,-.16,.4,.08,.16,.5,.4,Rn(d.color),.12,.3),Pn(g,.18,.36,-.1,.14,.44,.34,Rn("#b8d8e8"),-.1,-.6),Pn(g,.02,.52,.12,.12,.62,.3,Rn("#cfe4f0"),.05,1.1));const _=new Je({color:d.glowColor,emissive:d.glowColor,emissiveIntensity:1.2}),m=new re(oh,_);m.scale.set(.12,.12,.12),m.position.y=.95,u.add(m);const p={type:"material_node",nodeId:l.id,material:l.material,x:f,z:h,title:`${d.name} cache`,sub:"Press E to gather materials"};n.push(p);const E={def:l,nodeGroup:u,rich:g,spark:m,sparkMat:_,item:p,depleted:!1,phase:c*1.7};return s.push(b=>{m.position.y=.95+Math.sin(b*2+E.phase)*.07,m.rotation.y=b*.8+E.phase,_.emissiveIntensity=1.1+Math.sin(b*2.6+E.phase)*.35}),E}),dynamic:a}}function O_(i,e){i.depleted=!e.available,i.rich.visible=e.available,i.spark.visible=e.available,i.item&&(i.item.sub=e.available?"Press E to gather materials":"Picked clean — it will regrow in time")}function ld(i){return{current:Xt.some(e=>e.id===i?.current)?i.current:"court",visited:[...new Set(["court",...Array.isArray(i?.visited)?i.visited.filter(e=>Xt.some(t=>t.id===e)):[]])],completed:[...new Set(Array.isArray(i?.completed)?i.completed.filter(e=>Xt.slice(1).some(t=>t.id===e)):[])]}}function B_(i){const{group:e,block:t,box:n,glow:s,material:r,colors:a,random:o,animated:l,geometry:c}=i;n(0,.17,0,5.8,.08,21,"#143c46");const d=new re(new An(5.6,20.8),new Je({color:"#367c88",transparent:!0,opacity:.8,roughness:.13,metalness:.65}));d.rotation.x=-Math.PI/2,d.position.y=.23,e.add(d);for(const u of[-6.15,6.65])t(0,u,5.5,u<0?8.5:7.5);n(0,.21,0,7,.2,3.8,"#8b8d77");for(let u=-3.5;u<4;u+=.6){n(u,.34,0,.54,.09,3.7,"#6d807d");for(const g of[-1.85,1.85])n(u,.85,g,.08,1.1,.08,a.brass)}for(const u of[-1.85,1.85])n(0,1.4,u,7.5,.09,.09,a.brass);for(let u=-9;u<10;u+=.65)for(const g of[-3.1,3.1])n(g,.45,u,.35,.55,.6,"#a6a28b");for(const u of[-8,8]){n(u,1.2,-8,3,2.4,2.2,a.dark),t(u,-8,3,2.2);for(let g=0;g<6;g++)n(u,.5+g*.28,-6.86,2.5,.08,.1,a.brass);n(u,3,-8,.5,2,.5,a.brass)}for(let u=-9;u<10;u+=1.5){const g=s((o()-.5)*4,.245,u,1+o(),.015,.045,"#72b7bd",.35);l.push(_=>{g.position.x=Math.sin(_*.45+u)*1.2})}const f=new mt;f.position.set(7,1.6,-5);const h=new re(new fa(.55,.07,6,24),r("#c0995d"));f.add(h);for(let u=0;u<6;u++){const g=new re(c,r("#c0995d"));g.scale.set(.95,.055,.07),g.rotation.z=u*Math.PI/3,f.add(g)}e.add(f),l.push((u,g)=>{f.rotation.z=g?u*.4:0})}function k_(i){const{group:e,block:t,box:n,glow:s,random:r,animated:a}=i,o=new Je({color:"#b7d9b3",transparent:!0,opacity:.13,metalness:.1,roughness:.3,depthWrite:!1,side:sn});for(const l of[-1,7])for(let c=-9;c<=-2;c+=1.4)n(l,2.1,c,.1,4.2,.1,"#789184");for(let l=-9;l<=-2;l+=1.4){const c=n(1,4.8,l,4.5,.12,.12,"#96a58b");c.rotation.z=.35;const d=n(5,4.8,l,4.5,.12,.12,"#96a58b");d.rotation.z=-.35}for(const l of[1,5]){const c=n(l,4.8,-5.5,4.25,.03,7.4);c.material=o,c.rotation.z=l===1?.35:-.35}for(const[l,c,d,f]of[[-6,-5,3,5],[3,3.5,5,2],[8,6,2,4]]){n(l,.35,c,d,.6,f,"#9b9270"),n(l,.68,c,d-.2,.1,f-.2,"#414b32"),t(l,c,d,f);for(let h=0;h<50;h++){const u=l+(r()-.5)*(d-.4),g=c+(r()-.5)*(f-.4),_=.4+r()*.7;n(u,.7+_/2,g,.045,_,.045,"#627347");const m=n(u,.8+_,g,.3,.12,.45,["#779455","#94a86a","#536f42"][h%3]);m.rotation.z=r(),h%8===0&&n(u,1+_,g,.16,.14,.16,"#d2b28a")}}for(const l of[-9,9]){n(l,1.1,-7,.35,2.2,.35,"#6b5942"),t(l,-7,1.5,1.5);for(let c=0;c<25;c++)n(l+(r()-.5)*2.5,2+r()*1.7,-7+(r()-.5)*2,.7,.5,.7,["#667c49","#819258","#4e6b47"][c%3])}n(4,.75,-5,2,1.4,1.2,"#a09776"),t(4,-5,2,1.2);for(let l=0;l<6;l++){const c=s(3.3+l*.28,1.55,-5,.1,.18,.2,"#b7ce86",.5);a.push((d,f)=>{c.material.emissiveIntensity=f?1.8+Math.sin(d+l)*.25:.3,c.scale.y=f?.35:.18})}}function H_(i){const{group:e,block:t,box:n,glow:s,material:r,colors:a,animated:o}=i;for(const c of[-5,-7])n(0,.25,c,23,.12,.12,"#9aa5a2");for(let c=-11;c<12;c+=.8)n(c,.17,-6,.24,.16,3.5,"#67584a");n(1,1.65,-6,8,2.7,2.6,"#485e62"),t(1,-6,8,2.6),n(1,3.15,-6,8.4,.3,2.8,"#9b9c87"),n(1,.75,-4.66,8,.27,.08,a.brass);for(let c=-2;c<5;c+=1.25)s(c,2.15,-4.66,.85,.95,.04,"#f3ce89",.5),n(c,2.15,-4.61,.045,.95,.05,a.dark);for(const c of[-2,4])for(const d of[-7.1,-4.9]){const f=new re(new ti(.45,.45,.2,12),r("#23363c"));f.rotation.x=Math.PI/2,f.position.set(c,.55,d),e.add(f)}for(const c of[-8,8])n(c,1.85,-2,.18,3.7,.18,a.brass),t(c,-2,.2,.2);n(0,3.8,-2,18,.22,2.4,"#35494f");for(const c of[-5,1]){n(c,.65,3,2.8,.16,.7,"#9b8966"),n(c,1.15,3.35,2.8,.75,.12,"#9b8966");for(const d of[-1,1])n(c+d,.3,3,.12,.6,.6,a.dark);t(c,3,2.8,.9)}n(7,2.3,5,.18,4.6,.18,a.dark),t(7,5,.3,.3);const l=s(7,4.7,5,.7,.65,.7,"#e2b67b",.2);o.push((c,d)=>{l.material.emissiveIntensity=d?2+Math.sin(c*2):.2})}function z_(i){const{group:e,block:t,box:n,glow:s,colors:r,animated:a}=i;for(const c of[-7,-2,3,8])n(c,2.5,-6.5,1.2,5,1.2,"#3b4b4e"),t(c,-6.5,1.2,1.2),n(c,5.2,-6.5,3.6,.6,1.4,"#495f63");n(0,.18,-6.5,22,.12,2,"#182b2e");const o=new re(new An(21.8,1.8),new Je({color:"#2a555e",transparent:!0,opacity:.82,roughness:.15,metalness:.6}));o.rotation.x=-Math.PI/2,o.position.set(0,.24,-6.5),e.add(o),n(6,1.4,-4,2,2.8,1.4,r.dark),t(6,-4,2,1.4);const l=n(6,.8,-3.2,1.2,1.4,.2,r.brass);a.push((c,d)=>{l.position.y=d?1.5+Math.sin(c*.5)*.05:.8});for(const c of[-6,0])n(c,.6,6,2.5,1.2,1.8,"#34474a"),t(c,6,2.5,1.8),n(c,1.3,6,2.2,.2,.2,r.brass)}function V_(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const[o,l,c,d]of[[-7,-6,3.2,2.6],[-1,-7,2.8,2.2],[8,-7,3,2.4],[-8,6.5,3,2.5],[2,6.5,3.5,2.2]])t(o,1.1,l,c,2.2,d,"#252528"),e(o,l,c,d),t(o,2.3,l,c*.7,.6,d*.7,"#383230"),n(o,2.65,l,c*.35,.1,d*.35,"#f5a438",1.2);t(5,1.2,-4,2.2,2.4,1.6,s.dark),e(5,-4,2.2,1.6);const a=n(5,2.5,-4,.7,.7,.7,"#f7aa74",.8);r.push((o,l)=>{a.material.emissiveIntensity=l?2.5+Math.sin(o*3)*.5:.6,a.rotation.y=l?o*1.5:0})}function G_(i){const{block:e,box:t,glow:n,random:s,animated:r}=i;for(const[o,l,c,d]of[[-7,-6,2.8,2.5],[1,-6.5,3.5,2.2],[-7,6,2.5,2.5],[3,6,3,2]]){t(o,.9,l,c,1.8,d,"#2d271e"),e(o,l,c,d);for(let f=0;f<3;f++){const h=1.2+f*.6;t(o+(f%2===0?.6:-.6),h,l,1.8,.15,1.4,"#5e4334");const u=n(o+(f%2===0?.6:-.6),h+.1,l,1.2,.08,.9,"#7ee8b0",.4);r.push((g,_)=>{u.material.emissiveIntensity=_?1.8+Math.sin(g*2+f)*.4:.4})}}t(6,.8,-5,2,1.6,1.8,"#322d25"),e(6,-5,2,1.8);const a=n(6,1.8,-5,.8,.8,.8,"#85f5bc",.5);r.push((o,l)=>{a.material.emissiveIntensity=l?2.8+Math.sin(o*2.5)*.6:.5,a.scale.setScalar(l?1+Math.sin(o*3)*.08:1)})}function W_(i){const{group:e,block:t,box:n,glow:s,colors:r,animated:a}=i;for(let l=-8;l<=4;l+=3.5){n(l,.28,-6.5,3.2,.3,2.5,"#9ea8ab"),t(l,-6.5,3.2,2.5);const c=new re(new An(2.8,2.1),new Je({color:"#7cd4e2",transparent:!0,opacity:.75,roughness:.1}));c.rotation.x=-Math.PI/2,c.position.set(l,.45,-6.5),e.add(c),n(l,.48,-6.5,1.2,.08,1,"#f0f6f7")}for(const l of[-6,0]){n(l,1.2,6,3,2.4,1.4,"#7a6a57"),t(l,6,3,1.4);for(let c=.5;c<2.2;c+=.5)n(l,c,6,2.8,.08,1.2,"#ded7cb")}n(7,1.2,-4,1.8,2.4,1.8,r.dark),t(7,-4,1.8,1.8);const o=n(7,2.7,-4,.3,.25,2.2,r.brass);a.push((l,c)=>{o.rotation.x=c?Math.sin(l*3)*.2:0})}function X_(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-8,-2,4])t(o,1.8,-6.5,4.5,3.2,2.6,"#48555e"),e(o,-6.5,4.5,2.6),t(o,3.5,-6.5,4.8,.2,2.8,"#70828c"),t(o,4.2,-6.5,.15,1.2,.15,s.brass);for(const o of[-6,1])t(o,.9,6,3.8,1.8,1.6,"#6b5845"),e(o,6,3.8,1.6),t(o,1.9,5.3,3.8,.8,.08,s.brass);t(6,1.8,-5,.3,3.6,.3,s.dark),e(6,-5,.8,.8);const a=n(6,3.7,-5,1.4,.12,.12,"#e6c883",1.2);r.push((o,l)=>{a.rotation.y=l?o*4.5:o*.4})}function q_(i){const{group:e,block:t,box:n,colors:s,animated:r}=i,a=new re(new An(23,8),new Je({color:"#254238",transparent:!0,opacity:.8,roughness:.2}));a.rotation.x=-Math.PI/2,a.position.set(0,.22,-6),e.add(a);for(const[l,c]of[[-8,-6],[-2,-6.5],[3,-6.5]]){n(l,1.2,c,2.4,2.4,2.2,"#3d3226"),t(l,c,2.4,2.2);for(let d=0;d<4;d++){const f=n(l+(d-1.5)*.5,.8,c,.18,1.6,.18,"#4f4030");f.rotation.z=(d-1.5)*.3}}for(const l of[-5,2])n(l,.8,6,3.2,1.6,2,"#485244"),t(l,6,3.2,2);n(6,1.4,-4,2,2.8,1.4,s.dark),t(6,-4,2,1.4);const o=n(6,1.8,-3.2,1.4,1.6,.2,"#7a5a3a");r.push((l,c)=>{o.position.y=c?.8:1.8+Math.sin(l)*.05})}function $_(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-8,-2,4])t(o,2.2,-6.5,1.2,4.4,1.2,"#5e3428"),e(o,-6.5,1.2,1.2);t(0,4.5,-6.5,22,.5,1.6,"#3a2018");for(let o=-10;o<=10;o+=1.2)t(o,4.8,-6.5,.3,.2,2.2,"#483c34");for(const o of[-6,0])t(o,.9,6,3.4,1.8,1.8,"#443b35"),e(o,6,3.4,1.8);t(7,2,-4,.4,4,.4,s.dark),e(7,-4,1,1),t(7,4.1,-4,1.8,.3,.3,s.brass);const a=n(7.6,3.2,-4,.08,1.6,.08,"#d9bf82",.6);r.push((o,l)=>{a.rotation.z=l?0:Math.sin(o*1.5)*.06})}function Y_(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-7,-1])t(o,2.4,-6.5,3.5,4.8,2.8,"#2d2d33"),e(o,-6.5,3.5,2.8),t(o,4.9,-6.5,2,1.2,2,"#45454d"),n(o,1.1,-5,1.4,.8,.2,"#ff6622",1.8);for(const o of[-6,1])t(o,.7,6,3.6,1.4,1.8,"#3c2b28"),e(o,6,3.6,1.8),n(o,.8,6,2.8,.1,.8,"#8c3d23",.4);t(6,1.1,-4,2.2,2.2,2.2,s.dark),e(6,-4,2.2,2.2);const a=n(6,1.8,-4,1.2,.8,1.2,"#ff8033",.5);r.push((o,l)=>{a.material.emissiveIntensity=l?2.8+Math.sin(o*5)*.4:.5})}function K_(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-8,-2,4])t(o,2.6,-6.5,.35,5.2,.35,"#627585"),e(o,-6.5,1,1),t(o,5.1,-6.5,3.8,.2,.2,"#8ea3b5");for(const o of[-6,0])t(o,1,6,3.2,2,2,"#667480"),e(o,6,3.2,2),t(o,2.05,6,2.8,.12,1.6,"#d8e5ed");t(5,1.4,-5,1.6,2.8,1.6,s.dark),e(5,-5,1.6,1.6);const a=n(5,3,-5,1.4,1.4,.2,"#cce6f5",1.2);r.push((o,l)=>{a.material.emissiveIntensity=l?2.6+Math.sin(o*2)*.4:.6,a.rotation.y=l?o*.5:0})}function Z_(i){const{group:e,block:t,box:n,glow:s,colors:r,animated:a}=i,o=new re(new An(22,5.5),new Je({color:"#2d4345",transparent:!0,opacity:.8,roughness:.2}));o.rotation.x=-Math.PI/2,o.position.set(0,.22,-6.5),e.add(o),n(-4,.8,-6.5,5.5,1.4,2.2,"#483e32"),t(-4,-6.5,5.5,2.2);for(const c of[-6,0])n(c,.7,6,3.4,1.4,1.8,"#594d3f"),t(c,6,3.4,1.8);n(7,2,-4,.4,4,.4,r.dark),t(7,-4,1,1),n(7,4.1,-4,1.2,.2,1.2,r.brass);const l=s(7,4.5,-4,.7,.7,.7,"#e8ca76",.4);a.push((c,d)=>{l.material.emissiveIntensity=d?2.8+Math.sin(c*2)*.5:.4})}function j_(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-8,-2,4]){t(o,2.5,-6.5,3.6,5,1.6,"#35363b"),e(o,-6.5,3.6,1.6);for(let l=1;l<4.8;l+=.9){t(o,l,-5.6,3.2,.06,.2,s.brass);for(let c=-1.3;c<1.4;c+=.45)t(o+c,l+.35,-5.6,.35,.65,.15,["#574636","#6e5643","#434739"][c*10%3>>>0])}}for(const o of[-6,1])t(o,.8,6,3.2,1.6,1.8,"#524335"),e(o,6,3.2,1.8),t(o,1.65,6,2.8,.1,1.4,"#7a6652");t(5,1.1,-4,1.6,2.2,1.6,"#42372c"),e(5,-4,1.6,1.6),t(5,2.3,-4,.1,.6,.1,s.brass);const a=n(5,2.8,-4,.6,.6,.6,"#ffd580",.3);r.push((o,l)=>{a.material.emissiveIntensity=l?2.5+Math.sin(o*1.5)*.2:.3})}function J_(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-7,-1])t(o,1.8,-6.5,3.4,3.6,2.8,"#8c4832"),e(o,-6.5,3.4,2.8),t(o,3.8,-6.5,2,.8,1.8,"#aa583e"),n(o,1.2,-5,.8,.8,.2,"#ffaa44",.6);for(const o of[-6,1]){t(o,.8,6,3.2,1.6,1.8,"#9c5a43"),e(o,6,3.2,1.8);for(let l=-1;l<=1;l+=.8)t(o+l,1.8,6,.45,.6,.45,"#bd6b51")}t(6,1.2,-4,1.8,2.4,1.8,s.dark),e(6,-4,1.8,1.8);const a=n(6,2.7,-4,1.4,1.4,.18,"#ffe0a0",.6);r.push((o,l)=>{a.rotation.x=l?Math.sin(o*.4)*.2:0,a.material.emissiveIntensity=l?2.8+Math.sin(o*2)*.4:.6})}function Q_(i){const{group:e,block:t,box:n,glow:s,lamp:r,random:a}=i;for(const[l,c]of[[-4,-4],[4,3]]){n(l,.45,c,2.6,.12,.8,"#5d6658"),t(l,c,2.6,.8),n(l,.85,c+.42,2.6,.55,.1,"#5d6658");for(const d of[-1.05,1.05])n(l+d,.2,c,.12,.45,.7,"#3d463f")}r(-7,6);for(const[l,c,d,f]of[[-2,2,2.2,1.4],[5,-2,1.6,2.4],[-6,-1,1.3,1.1]]){const h=new re(new An(d,f),new Je({color:"#367c88",transparent:!0,opacity:.5,roughness:.12,metalness:.6}));h.rotation.x=-Math.PI/2,h.position.set(l,.17,c),e.add(h)}const o=["#58734c","#47603f","#6b8156"];for(const l of[-8.5,8])for(let c=0;c<5;c++)n(l+(a()-.5)*1.2,1+c*.5,-10.1,1.5,.42,.45,o[c%3]);for(const[l,c]of[[-9,3.6],[3,4.5],[7.5,3.2]])s(l,c,-10.96,.5,.8,.05,"#e8b06a",.6)}const ev={court:Q_,canal:B_,garden:k_,station:H_,aqueduct:z_,caldera:V_,understory:G_,saltworks:W_,rooftops:X_,mangrove:q_,trestle:$_,foundry:Y_,"frost-spire":K_,delta:Z_,archives:j_,"kiln-terrace":J_,theater:N_};function tv(i,e=!1){const t=new mt;t.name=i.id;const n=[],s=[],r=[],a=new Zt(1,1,1),o={stone:"#6b776c",dark:"#233c3e",brass:"#b78d50",green:"#58734c"},l=new Map,c=v=>(l.has(v)||l.set(v,new Je({color:v,roughness:.62,metalness:.2})),l.get(v));function d(v,y,C,T,B,U,F=o.stone){const N=new re(a,c(F));return N.position.set(v,y,C),N.scale.set(T,B,U),N.castShadow=N.receiveShadow=!0,t.add(N),N}function f(v,y,C,T){n.push({x:v,z:y,w:C/2+.38,d:T/2+.38})}function h(v,y,C,T,B,U,F,N=1.5){const W=d(v,y,C,T,B,U,F);return W.material=new Je({color:F,emissive:F,emissiveIntensity:N}),W}function u(v,y,C="#ffcb79"){d(v,1.8,y,.12,3.6,.12,o.dark),h(v,3.6,y,.35,.5,.35,C,2),d(v,3.92,y,.6,.12,.6,o.dark);const T=new Il(C,7,7,2);T.position.set(v,3.4,y),t.add(T),f(v,y,.25,.25)}let g=Xt.indexOf(i)*37;function _(){return g=g*1664525+1013904223>>>0,g/4294967296}d(0,-.55,0,25,1,22,"#263638");for(let v=-12;v<12;v++)for(let y=-10;y<11;y++){const C=i.id==="garden"?["#7b816a","#8b8b70","#64745e"]:["#586b6d","#657373","#475b61"];d(v+.5,.06,y+.5,.96,.15,.96,C[Math.floor(_()*3)])}for(let v=-12;v<=12;v+=.8)for(let y=.4;y<3;y+=.4)d(v,y,-10.5,.76,.37,.65,y>2.6?"#a0a18a":"#4d6561");for(let v=-10;v<11;v+=.8)for(const y of[-12,12])Math.abs(v)<2||(d(y,.65,v,.5,1.3,.76,o.dark),d(y,1.35,v,.7,.15,.78,o.stone));for(const v of[-9,-3,3,9]){d(v,4,-13,5,8,4,"#2b4145");for(let y=-1.5;y<2;y+=1)for(let C=3;C<7;C+=1.5)h(v+y,C,-10.96,.45,.7,.04,"#91b4ab",.25)}u(-10,-7),u(10,8);const m=ev[i.id];if(!m)throw new Error(`Unknown district id: ${i.id}`);const p={group:t,obstacles:n,items:s,animated:r,geometry:a,colors:o,material:c,box:d,block:f,glow:h,lamp:u,random:_,def:i,completed:e};m(p);let E=null,b=null;if(i.note){const[v,y]=i.note;d(v,.6,y,.8,1.2,.6,o.dark),f(v,y,.8,.6),h(v,1.24,y,.5,.035,.4,"#d4c9a1",.4),s.push({type:"field-note",x:v,z:y,title:"Read the field note",sub:i.noteTitle,body:i.noteBody})}if(i.landmark){const[v,y]=i.landmark;E=h(v,2.5,y,.13,.13,.13,"#ffe0a0",2),b=new re(new sr(.8,.84,32),new xs({color:"#e7c889",side:sn,transparent:!0,opacity:.65})),b.rotation.x=-Math.PI/2,b.position.set(v,.25,y),t.add(b),s.push({type:"landmark",x:v,z:y,title:i.action,sub:"A small act of restoration"})}const M=F_(i,{group:t,items:s,animated:r});function R(v){if(!(!M||!Array.isArray(v)))for(const y of v){const C=M.visuals.find(T=>T.def.id===y.nodeId);C&&O_(C,y)}}function w(v,y){E&&(E.position.y=2.5+Math.sin(v*2)*.12,E.material.emissive.set(y?"#93e9b6":"#ffe0a0")),b&&b.material.color.set(y?"#93e9b6":"#e7c889"),r.forEach(C=>C(v,y))}w(0,e);const I=t.children.filter(v=>v.isMesh&&v.geometry===a&&!v.material.transparent&&v.material.emissive?.getHex()===0),L=new ua(a,new Je({color:"#ffffff",roughness:.62,metalness:.2}),I.length);return I.forEach((v,y)=>{v.updateMatrix(),L.setMatrixAt(y,v.matrix),L.setColorAt(y,v.material.color),t.remove(v)}),L.castShadow=L.receiveShadow=!0,t.add(L),{group:t,obstacles:n,items:s,update:w,setNodeStates:R,screenQuad:p.screenQuad||null}}const Or={market:{id:"market",minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3,spawn:[0,3],exitGarden:[10.7,0]},garden:{id:"garden",minX:-11.5,maxX:11.5,minZ:-10,maxZ:10.5,spawn:[-9.5,0],exitMarket:[-10.7,0]}};function jr(i){return!i||i==="market"?Or.market:i.startsWith("garden:")||i==="garden"?Or.garden:Or[i]?Or[i]:{id:i,minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3,spawn:[-9,0],exitWest:[-10.7,0],exitEast:[10.7,0]}}function oa(i,e,t,n){if(t<=i.minX||t>=i.maxX||n<=i.minZ||n>=i.maxZ)return!1;for(let s=0;s<e.length;s++){const r=e[s];if(Math.abs(t-r.x)<r.w&&Math.abs(n-r.z)<r.d)return!1}return!0}function nv(i,e,t){return{x:Math.max(i.minX+.35,Math.min(i.maxX-.35,e)),z:Math.max(i.minZ+.35,Math.min(i.maxZ-.35,t))}}function iv(i,e,t,n={x:24,y:24,w:106,h:72}){const s=(e-i.minX)/(i.maxX-i.minX),r=(t-i.minZ)/(i.maxZ-i.minZ);return{cx:n.x+Math.max(0,Math.min(1,s))*n.w,cy:n.y+Math.max(0,Math.min(1,r))*n.h}}function sv(i){return _n[i]||Ai[i]||null}function rv(i,e="B",t=1){const n=sv(i);if(!n)return 0;const s=C_[e]??1;return Math.max(1,Math.round(n.basePrice*t*s*.85))}function av(i,e=1){const t=_n[i];if(!t)return 0;const n=1+(e-1)*.4;return Math.max(1,Math.round(t.seedCost*n))}class ov{constructor(e,t={}){this.client=e,this.onAction=t,this.selectedCropId="radish",this.activeTool="hands",this.selectedSeed="radish",this.lastMachines={mill:{status:"broken",required:{...ah},contributed:{copper:0,timber:0,glass:0},restoredAt:null}},this.initDOM()}initDOM(){this.createMarketDialog(),this.createSeedDialog(),this.createContractDialog(),this.createInventoryDialog(),this.createProfileDialog(),this.createMachineShopDialog(),this.setupEventListeners()}createMarketDialog(){const e=document.createElement("dialog");e.id="market-dialog",e.className="game-modal",e.innerHTML=`
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
    `,document.body.append(e)}setupEventListeners(){const e=document.getElementById("market-crop-tabs");e.innerHTML="";const t=[...ll,...I_];for(const n of t){const s=document.createElement("button");s.className=`crop-tab ${n.id===this.selectedCropId?"active":""}`,s.textContent=n.name,s.onclick=()=>{this.selectedCropId=n.id,document.querySelectorAll(".crop-tab").forEach(r=>r.classList.remove("active")),s.classList.add("active"),this.updateMarketView()},e.append(s)}document.querySelectorAll("#sell-quality-selector button").forEach(n=>{n.onclick=()=>{document.querySelectorAll("#sell-quality-selector button").forEach(s=>s.classList.remove("active")),n.classList.add("active"),this.updateMarketView()}}),document.getElementById("btn-instant-sell").onclick=()=>{const n=!!Ai[this.selectedCropId],s=document.querySelector("#sell-quality-selector button.active"),r=n?"B":s?s.dataset.qual:"B",a=parseInt(document.getElementById("sell-qty-input").value,10)||1;this.client.sendMarketSell(this.selectedCropId,r,a)},document.getElementById("btn-create-order").onclick=()=>{const n=document.getElementById("order-side").value,s=parseFloat(document.getElementById("order-price").value)||10,r=parseInt(document.getElementById("order-qty").value,10)||1;this.client.sendOrderPlace(n,this.selectedCropId,s,r,"B")},document.getElementById("close-market").onclick=()=>document.getElementById("market-dialog").close(),document.getElementById("close-seed-dialog").onclick=()=>document.getElementById("seed-dialog").close(),document.getElementById("close-contracts").onclick=()=>document.getElementById("contract-dialog").close(),document.getElementById("close-inventory").onclick=()=>document.getElementById("inventory-dialog").close(),document.getElementById("close-profile").onclick=()=>document.getElementById("profile-dialog").close(),document.getElementById("close-machine-shop").onclick=()=>document.getElementById("machine-shop-dialog").close(),document.getElementById("btn-save-nickname").onclick=()=>{const n=document.getElementById("profile-nick-input").value.trim();n&&(this.client.setNickname(n),document.getElementById("profile-dialog").close())}}openMarket(){this.updateMarketView(),document.getElementById("market-dialog").showModal()}openSeedVendor(){this.updateSeedVendorView(),document.getElementById("seed-dialog").showModal()}openContracts(){this.updateContractsView(),document.getElementById("contract-dialog").showModal()}openInventory(){this.updateInventoryView(),document.getElementById("inventory-dialog").showModal()}openProfile(){document.getElementById("profile-nick-input").value=this.client.nickname,document.getElementById("profile-dialog").showModal()}updateMachineShopView(e=null){e&&(this.lastMachines=e);const t=this.lastMachines?.mill,n=document.getElementById("mill-progress-summary"),s=document.getElementById("mill-material-rows"),r=document.getElementById("mill-flour-box"),a=document.getElementById("sprinkler-craft-box");if(!n||!s||!t)return;const o=this.lastPlayer,l=o?.materials||{};if(t.status==="restored")n.innerHTML=`
        <strong class="mill-restored-line">✦ The Great Mill is turning.</strong>
        <p>Restored by the community. It grinds wheat into flour for everyone, permanently.</p>
      `,s.innerHTML="";else{let u=0,g=0,_="";for(const m of od){const p=t.required?.[m.id]||0,E=Math.min(t.contributed?.[m.id]||0,p);u+=E,g+=p;const b=l[m.id]||0,M=p-E,R=b>0&&M>0?`<button class="btn-contribute" data-material="${m.id}" data-qty="1">Give 1</button>
             <button class="btn-contribute" data-material="${m.id}" data-qty="${Math.min(b,M)}">Give all</button>`:"";_+=`
          <div class="mill-material-row">
            <span class="mill-mat-name">${m.name}</span>
            <span class="mill-mat-count">${E} / ${p}</span>
            <span class="mill-mat-held">satchel: ${b}</span>
            ${R}
          </div>`}n.innerHTML=`
        <strong>The Great Mill is broken.</strong>
        <p>Community restoration: ${u} / ${g} materials delivered.</p>
      `,s.innerHTML=_}if(s.querySelectorAll(".btn-contribute").forEach(u=>{u.onclick=()=>{this.client.send(ge.MACHINE_CONTRIBUTE,{actionId:this.nextActionId(),material:u.dataset.material,quantity:parseInt(u.dataset.qty,10)||1})}}),t.status==="restored"){const g=["C","B","A","A+"].reduce((p,E)=>p+(o?.inventory?.produce?.[`wheat_${E}`]||0),0),_=o?.inventory?.produce?.flour_B||0;r.innerHTML=`
        <div class="micro">MILLING · WHEAT → FLOUR (1:1)</div>
        <p class="machine-hint">Wheat in satchel: ${g} · Flour: ${_}</p>
        <div class="order-form-row">
          <input type="number" id="mill-qty-input" min="1" max="99" value="1">
          <button id="btn-mill-flour" class="action-btn"${g<=0?" disabled":""}>Mill Flour</button>
        </div>
      `;const m=r.querySelector("#btn-mill-flour");m&&(m.onclick=()=>{const p=parseInt(document.getElementById("mill-qty-input").value,10)||1;this.client.send(ge.MACHINE_MILL,{actionId:this.nextActionId(),quantity:p})})}else r.innerHTML=`
        <div class="micro">MILLING</div>
        <p class="machine-hint">The millstones wait. Restore the mill to grind wheat into flour.</p>
      `;const c=Object.entries(is.cost).map(([u,g])=>`${g}× ${Ul[u].name}`).join(" + "),d=Object.entries(is.cost).map(([u,g])=>`${l[u]||0}/${g}`).join(" · "),f=Object.entries(is.cost).every(([u,g])=>(l[u]||0)>=g);a.innerHTML=`
      <div class="micro">CRAFT · ${is.name}</div>
      <p class="machine-hint">Cost: ${c}. Keeps covered beds watered on their own. (satchel: ${d})</p>
      <button id="btn-craft-sprinkler" class="action-btn"${f?"":" disabled"}>Craft Sprinkler Kit</button>
    `;const h=a.querySelector("#btn-craft-sprinkler");h&&(h.onclick=()=>{this.client.send(ge.MACHINE_CRAFT,{actionId:this.nextActionId(),fixture:is.id})})}nextActionId(){return`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`}updateMarketView(e=null,t=null){e&&(this.lastPrices=e),t&&(this.lastOrderBook=t);const n=_n[this.selectedCropId]||Ai[this.selectedCropId];if(!n)return;const s=!!Ai[this.selectedCropId];document.getElementById("spot-crop-name").textContent=n.name,document.getElementById("spot-crop-tagline").textContent=n.tagline;const r=this.lastPrices?this.lastPrices[n.id]:null,a=r?r.multiplier:1,o=document.querySelector("#sell-quality-selector button.active"),l=s?"B":o?o.dataset.qual:"B",c=rv(n.id,l,a);document.getElementById("spot-instant-bid").textContent=`${c} ⛁`,document.getElementById("spot-base-price").textContent=`${n.basePrice} ⛁`,document.getElementById("spot-multiplier").textContent=`${a.toFixed(2)}x`;const d=this.lastPlayer;let f=0;d&&d.inventory&&d.inventory.produce&&(f=d.inventory.produce[`${n.id}_${l}`]||0),document.getElementById("sell-owned-qty").textContent=f;const h=document.getElementById("orderbook-asks"),u=document.getElementById("orderbook-bids");if(h.innerHTML="",u.innerHTML="",this.lastOrderBook){const g=this.lastOrderBook.asks?.filter(m=>m.cropId===n.id)||[],_=this.lastOrderBook.bids?.filter(m=>m.cropId===n.id)||[];if(g.length===0)h.innerHTML='<div class="empty-book">No active asks</div>';else for(const m of g){const p=document.createElement("div");p.className="book-row ask-row",p.innerHTML=`<span>${m.quantity}x</span> <strong>${m.price} ⛁</strong>`,h.append(p)}if(_.length===0)u.innerHTML='<div class="empty-book">No active bids</div>';else for(const m of _){const p=document.createElement("div");p.className="book-row bid-row",p.innerHTML=`<span>${m.quantity}x</span> <strong>${m.price} ⛁</strong>`,u.append(p)}}}updateSeedVendorView(){const e=document.getElementById("seed-catalog-list");e.innerHTML="";for(const t of ll){const n=document.createElement("div");n.className="seed-card panel";const s=this.lastPrices&&this.lastPrices[t.id]?this.lastPrices[t.id].multiplier:1,r=av(t.id,s);n.innerHTML=`
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
      `,r.querySelector(".btn-fulfill-contract").onclick=()=>{this.client.sendContractComplete(s.id)},t.append(r)}}updateInventoryView(e=null){e&&(this.lastPlayer=e);const t=document.getElementById("inv-seeds-list"),n=document.getElementById("inv-produce-list"),s=document.getElementById("inv-materials-list");t.innerHTML="",n.innerHTML="",s.innerHTML="";const r=this.lastPlayer;if(!r||!r.inventory)return;const a=r.inventory.seeds||{},o=Object.entries(a).filter(([u,g])=>g>0);if(o.length===0)t.innerHTML='<div class="empty-msg">No seeds in satchel</div>';else for(const[u,g]of o){const _=_n[u],m=document.createElement("div");m.className="inv-item",m.innerHTML=`<strong>${_?.name||u}</strong> <span>${g} packets</span>`,m.onclick=()=>{this.selectedSeed=u,this.activeTool="seed",this.onAction.onSelectTool?.("seed",u),document.getElementById("inventory-dialog").close()},t.append(m)}const l=r.inventory.produce||{},c=Object.entries(l).filter(([u,g])=>g>0);if(c.length===0)n.innerHTML='<div class="empty-msg">No harvested produce</div>';else for(const[u,g]of c){const[_,m]=u.split("_"),p=_n[_]||Ai[_],E=!!Ai[_],b=document.createElement("div");b.className="inv-item",b.innerHTML=`<strong>${p?.name||_}</strong> ${E?"":`<span class="badge-grade">Grade ${m}</span>`} <span>${g} units</span>`,n.append(b)}const d=r.materials||{},f=od.map(u=>[u,d[u.id]||0]).filter(([,u])=>u>0),h=r.inventory.sprinklers||0;if(f.length===0&&h<=0)s.innerHTML='<div class="empty-msg">No materials yet — gather them in the outer districts</div>';else{for(const[u,g]of f){const _=document.createElement("div");_.className="inv-item",_.innerHTML=`<strong>${u.name}</strong> <span>${g} units</span>`,s.append(_)}if(h>0){const u=document.createElement("div");u.className="inv-item",u.innerHTML=`<strong>${is.name} kit</strong> <span>${h} ready — place on a bed (tool 6)</span>`,s.append(u)}}}updatePlayerHUD(e){this.lastPlayer=e;const t=document.getElementById("hud-coins"),n=document.getElementById("hud-rep"),s=document.getElementById("hud-xp"),r=document.getElementById("hud-nick");t&&(t.textContent=`${e.coins} ⛁`),n&&(n.textContent=`${e.reputation||10} ★`),s&&(s.textContent=`Lvl ${e.level||1} · ${e.xp||0} XP`),r&&(r.textContent=e.nickname)}}const lv=200,lo="afterlight-chat-size",co=280,ho=120,cv=640,dv=560;function ss(i,e,t){return Math.max(e,Math.min(t,i))}class hv{constructor(e,{onFocusChange:t=null}={}){this.net=e,this.onFocusChange=t,this.collapsed=!1,this.unread=0,this.panel=document.getElementById("chat-panel"),this.log=document.getElementById("chat-log"),this.toggle=document.getElementById("chat-toggle"),this.unreadBadge=document.getElementById("chat-unread"),this.form=document.getElementById("chat-form"),this.input=document.getElementById("chat-input"),this.sendBtn=document.getElementById("chat-send"),this.handle=document.getElementById("chat-resize"),this.connected=!1,!(!this.panel||!this.log)&&(this.toggle.addEventListener("click",()=>this.setCollapsed(!this.collapsed)),this.input.addEventListener("focus",()=>this.onFocusChange?.(!0)),this.input.addEventListener("blur",()=>this.onFocusChange?.(!1)),this.input.addEventListener("keydown",n=>{if(n.stopPropagation(),n.code==="Escape"){n.preventDefault(),this.input.blur();return}n.code==="Enter"&&(n.preventDefault(),this.submit(n.shiftKey))}),this.form.addEventListener("submit",n=>{n.preventDefault(),this.submit(n.shiftKey||document.activeElement!==this.input)}),this.net.on(ge.CHAT_HISTORY,n=>this.setHistory(n.messages||[])),this.net.on(ge.CHAT_MESSAGE,n=>this.addMessage(n)),this.net.on(ge.CHAT_DM,n=>this.addDM(n)),this.net.on(ge.CHAT_PRESENCE,n=>this.addPresence(n)),this.net.on(ge.CHAT_ERROR,n=>this.addError(n)),this.net.onDisconnect(()=>this.setConnected(!1)),this.net.onConnect(()=>this.setConnected(!0)),this.setConnected(this.net.connected),this.#d())}setConnected(e){this.connected=e,this.input&&(this.input.disabled=!e,this.sendBtn.disabled=!e,this.input.placeholder=e?"Say hello… (Enter to chat, Esc to release)":"The relay is quiet — reconnecting…",e||this.addSystemLine("The town relay is out of reach."))}setCollapsed(e){this.collapsed=e,this.panel.classList.toggle("collapsed",e),this.toggle.setAttribute("aria-expanded",String(!e)),e||this.#p()}focusInput(e=""){if(!this.connected){this.setCollapsed(!1),this.input.focus();return}this.setCollapsed(!1),e&&(this.input.value=e),this.input.focus()}submit(e=!1){const t=this.input.value.trim();this.input.value="",t&&this.connected&&(this.net.sendChat(t),e||this.input.blur())}setHistory(e){this.log.textContent="";for(const t of e)this.addMessage(t,{fromHistory:!0});this.#c(!0)}addMessage(e){if((e.fromKind||"player")==="system"){this.addSystemLine(e.text);return}const n=this.#t(e);e.action?n.appendChild(this.#e("chat-body chat-action",`${e.from} ${cd(e.text)}`)):(n.appendChild(this.#e("chat-nick",e.from)),n.appendChild(this.#e("chat-body",e.text))),this.#n(n,e.from===this.net.nickname)}addDM(e){const t=this.#t(e),n=e.echo||e.from===this.net.nickname,s=n?e.to:e.from;t.appendChild(this.#e("chat-nick",n?`to ${s}`:`from ${s}`)),t.appendChild(this.#e("chat-body",e.action?`${e.from} ${cd(e.text)}`:e.text)),this.#n(t,n,"dm")}addPresence(e){const t=e.event==="join"?"steps into the town channel":" drifts away from it",n=e.fromKind==="irc"?" (relay)":"";this.addSystemLine(`${e.who}${n}${t}.`)}addError(e){const t=this.#t({ts:Date.now()});t.appendChild(this.#e("chat-body chat-error",e.message)),this.#n(t,!1,"error")}addSystemLine(e){const t=this.#t({ts:Date.now()});t.appendChild(this.#e("chat-body chat-system",e)),this.#n(t,!1,"system")}#d(){if(!this.handle)return;this.sizeMedia=window.matchMedia("(max-width: 900px)"),this.#o(),this.sizeMedia.addEventListener("change",()=>this.#o()),window.addEventListener("resize",()=>this.#o());let e=null;const t=s=>{if(!e)return;s.preventDefault();const r=ss(e.w-(s.clientX-e.x),co,this.#i()),a=ss(e.h-(s.clientY-e.y),ho,this.#s());this.#r(r,a)},n=()=>{e&&(e=null,window.removeEventListener("pointermove",t),window.removeEventListener("pointerup",n),window.removeEventListener("pointercancel",n),this.#l(this.#a()))};this.handle.addEventListener("pointerdown",s=>{if(!(this.sizeMedia.matches||this.collapsed)){s.preventDefault(),e={x:s.clientX,y:s.clientY,w:this.panel.getBoundingClientRect().width,h:this.log.getBoundingClientRect().height};try{this.handle.setPointerCapture(s.pointerId)}catch{}window.addEventListener("pointermove",t),window.addEventListener("pointerup",n),window.addEventListener("pointercancel",n)}}),this.handle.addEventListener("dblclick",()=>this.#u()),this.handle.addEventListener("keydown",s=>{if(this.sizeMedia.matches||this.collapsed)return;const r=s.shiftKey?8:28,a=this.#a();let o=a.w,l=a.h;if(s.code==="ArrowLeft")o+=r;else if(s.code==="ArrowRight")o-=r;else if(s.code==="ArrowUp")l+=r;else if(s.code==="ArrowDown")l-=r;else return;s.preventDefault(),this.#r(ss(o,co,this.#i()),ss(l,ho,this.#s())),this.#l(this.#a())})}#i(){return Math.min(cv,window.innerWidth-380)}#s(){return Math.min(dv,window.innerHeight-260)}#r(e,t){this.panel.style.width=`${Math.round(e)}px`,this.log.style.height=`${Math.round(t)}px`}#a(){return{w:this.panel.getBoundingClientRect().width,h:this.log.getBoundingClientRect().height}}#o(){const e=this.#h();if(this.sizeMedia.matches||!e){this.panel.style.width="",this.log.style.height="";return}this.#r(ss(e.w,co,this.#i()),ss(e.h,ho,this.#s()))}#h(){try{const e=localStorage.getItem(lo);if(!e)return null;const t=JSON.parse(e);return!t||!Number.isFinite(t.w)||!Number.isFinite(t.h)?null:t}catch{return null}}#l(e){try{localStorage.setItem(lo,JSON.stringify({w:Math.round(e.w),h:Math.round(e.h)}))}catch{}}#u(){try{localStorage.removeItem(lo)}catch{}this.panel.style.width="",this.log.style.height=""}#t(e={}){const t=document.createElement("div");t.className="chat-line";const n=e.ts?new Date(e.ts):new Date,s=String(n.getHours()).padStart(2,"0"),r=String(n.getMinutes()).padStart(2,"0");return t.appendChild(this.#e("chat-time",`${s}:${r}`)),t}#e(e,t){const n=document.createElement("span");return n.className=e,n.textContent=t,n}#n(e,t,n=""){for(n&&e.classList.add(n),t&&e.classList.add("self"),this.log.appendChild(e);this.log.childElementCount>lv;)this.log.firstChild.remove();this.#c(),this.collapsed&&this.#f()}#c(e=!1){const t=this.log.scrollHeight-this.log.scrollTop-this.log.clientHeight<48;(e||t)&&(this.log.scrollTop=this.log.scrollHeight)}#f(){this.unread+=1,this.unreadBadge.hidden=!1,this.unreadBadge.textContent=String(this.unread)}#p(){this.unread=0,this.unreadBadge.hidden=!0,this.unreadBadge.textContent=""}}function cd(i){return String(i??"").replace(/^\u0001ACTION /,"").replace(/\u0001$/,"")}const uv="modulepreload",fv=function(i){return"/"+i},dd={},pv=function(e,t,n){let s=Promise.resolve();if(t&&t.length>0){let c=function(d){return Promise.all(d.map(f=>Promise.resolve(f).then(h=>({status:"fulfilled",value:h}),h=>({status:"rejected",reason:h}))))};var a=c;document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),l=o?.nonce||o?.getAttribute("nonce");s=c(t.map(d=>{if(d=fv(d),d in dd)return;dd[d]=!0;const f=d.endsWith(".css"),h=f?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${d}"]${h}`))return;const u=document.createElement("link");if(u.rel=f?"stylesheet":uv,f||(u.as="script"),u.crossOrigin="",u.href=d,l&&u.setAttribute("nonce",l),document.head.appendChild(u),f)return new Promise((g,_)=>{u.addEventListener("load",g),u.addEventListener("error",()=>_(new Error(`Unable to preload CSS for ${d}`)))})}))}function r(o){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=o,window.dispatchEvent(l),!l.defaultPrevented)throw o}return s.then(o=>{for(const l of o||[])l.status==="rejected"&&r(l.reason);return e().catch(r)})},mv=2048,gv={RESOLVE_TIMEOUT_MS:45e3},_v=/^[0-9a-fA-F]{40}$/,vv=/^[A-Z2-7]{32}$/;function yv(i){if(typeof i!="string")return null;const e=i.trim();if(!e||e.length>mv||!e.toLowerCase().startsWith("magnet:?"))return null;let t;try{t=new URL(e)}catch{return null}if(t.protocol!=="magnet:")return null;for(const n of t.searchParams.getAll("xt")){const s=/^urn:btih:(.+)$/i.exec(n.trim());if(!s)continue;const r=s[1];if(_v.test(r))return{url:e,infohash:r.toLowerCase()};if(vv.test(r)){const a="0123456789abcdef";let o=0,l=0,c="";for(const d of r.toUpperCase())if(l=l<<5|"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(d),o+=5,o>=8){const f=l>>o-8&255;c+=a[f>>4&15]+a[f&15],o-=8}return{url:e,infohash:c}}}return null}function xv(i,e,t=120){const n=String(i||"").replace(/\s+/g," ").trim(),s=String(e||"").split("/").pop().replace(/\s+/g," ").trim();return(n&&s&&s.toLowerCase()!==n.toLowerCase()?`${n} — ${s}`:n||s||"A torrent stream").slice(0,t)}function Mv(i){if(!i||typeof i!="object")return null;const e=typeof i.infohash=="string"&&/^[0-9a-f]{40}$/.test(i.infohash)?i.infohash:null;if(!e)return null;const t=Number(i.progress),n=Number(i.peers),s=Number(i.downloaded);return{infohash:e,progress:Number.isFinite(t)?Math.min(1,Math.max(0,t)):0,peers:Number.isInteger(n)&&n>=0?n:0,downloaded:Number.isFinite(s)&&s>=0?s:0,ready:i.ready===!0}}function Sv(i){switch(i){case"engine_unavailable":return"The projector’s torrent engine is unavailable right now.";case"invalid_magnet":return"That does not look like a magnet link (magnet:?xt=urn:btih:…).";case"resolve_timeout":return"The swarm never answered in time. Check the torrent has seeders and try again.";case"resolve_failed":return"The torrent could not be resolved. It may have no seeders.";case"metadata_timeout":return"The torrent’s file list is taking too long to arrive. Try again.";case"file_not_streamable":return"That file is not something the projector can stream from the torrent.";case"resolve_in_flight":return"Hold on — one torrent is still being looked up.";case"no_file_chosen":return"Pick a file from the torrent first.";default:return"The torrent reel jams; try that magnet again."}}const Jr={URL_MAX:2048,QUEUE_MAX:50},hd={youtube:"YouTube",youtubePlaylist:"YouTube playlist",vimeo:"Vimeo",file:"Video file",hls:"Live stream (HLS)",torrent:"Torrent stream"};function Ev(i){switch(i){case"youtube":return"A YouTube video";case"vimeo":return"A Vimeo video";case"hls":return"Live channel";case"file":return"A video link";case"torrent":return"A torrent stream";default:return"Something to watch"}}const bv=new Set(["youtube.com","www.youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com","youtu.be","www.youtu.be"]),Tv=/\.(mp4|webm|m4v|mov|ogv|ogg)$/i;function ud(i){if(typeof i!="string")return null;const e=i.trim();if(!e||e.length>Jr.URL_MAX)return null;let t;try{t=new URL(e)}catch{return null}const n=yv(e);if(n)return{kind:"torrent",url:n.url,infohash:n.infohash};if(t.protocol!=="http:"&&t.protocol!=="https:")return null;const s=t.hostname.toLowerCase(),r=t.pathname;if(bv.has(s)){let a=null,o;if(s.endsWith("youtu.be")?(o=r.match(/^\/([\w-]{6,})/),a=o?o[1]:null):(o=r.match(/^\/(?:watch\/)?(?:\?v=)?\/?$/))&&t.searchParams.has("v"),!a&&t.searchParams.has("v")){const d=t.searchParams.get("v");/^[\w-]{6,}$/.test(d)&&(a=d)}a||(o=r.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/),o&&(a=o[1]));const l=t.searchParams.get("list"),c=l&&/^[\w-]{12,}$/.test(l)?l:null;return a?c?{kind:"youtube",url:e,videoId:a,listId:c}:{kind:"youtube",url:e,videoId:a}:c?{kind:"youtubePlaylist",listId:c,url:e}:null}if(s==="vimeo.com"||s==="www.vimeo.com"||s==="player.vimeo.com"){const a=r.match(/^\/(?:video\/)?(\d{6,})(?:[/?]|$)/);return a?{kind:"vimeo",url:e,videoId:a[1]}:null}return r.toLowerCase().endsWith(".m3u8")?{kind:"hls",url:e}:Tv.test(r)?{kind:"file",url:e}:null}function wv(i,e){return e?`https://player.vimeo.com/video/${e}?autoplay=1&controls=0&enablejsapi=1`:null}function Av(i,e){return i?i.playing?i.positionSec+Math.max(0,(e-i.updatedAt)/1e3):i.positionSec:0}function fd(i){switch(i){case"invalid_url":return"That link is not something the projector can play. Try YouTube, Vimeo, a direct video file, or an .m3u8 stream.";case"no_file_chosen":return"Pick a file from that torrent first — paste the magnet and choose from its file list.";case"url_too_long":return"That link is far too long to pin to the marquee.";case"queue_full":return"The queue reel is full. Remove something first.";case"item_not_found":return"That item is no longer on the bill.";case"nothing_playing":return"Nothing is on the screen right now.";case"item_mismatch":return"The screen has moved on to something else.";case"invalid_position":return"That timestamp does not make sense.";case"seek_unsupported":return"Live channels cannot be rewound.";case"invalid_action":return"The projector does not understand that request.";case"use_import":return"That link is a whole playlist — import it and its videos come to the reel together.";case"is_mix":return"Radio mixes never end, so the projector cannot pin them down — add the video itself instead.";case"playlist_not_public":return"That playlist is private or no longer exists — the projector can only read public playlists.";case"playlist_unreadable":return"The projector could not read that playlist just now. Give it a moment and try again.";case"resolve_in_flight":return"Hold on — one playlist is still being read.";case"resolve_cooldown":return"Give the projector a breath — try that playlist again in a moment.";default:return"The projector ignores that."}}const Ln={LISTS_MAX:24,LIST_TEXT_MAX:8*1024*1024,CHANNELS_MAX:2e4,CHANNEL_NAME_MAX:200,GROUP_MAX:120,EPG_LOOKUP_MAX:300};function Cv(i,e=Ln.CHANNELS_MAX){const t=[];if(!Array.isArray(i))return t;const n=Number.isFinite(e)&&e>0?e:Ln.CHANNELS_MAX;for(const s of i){if(t.length>=n)break;if(!s||typeof s!="object")continue;const r=typeof s.url=="string"?s.url.trim():"";if(!/^https?:\/\//i.test(r))continue;const a=typeof s.tvgId=="string"?s.tvgId.trim().slice(0,Ln.GROUP_MAX):"";t.push({url:r,name:typeof s.name=="string"&&s.name.trim()?s.name.trim().slice(0,Ln.CHANNEL_NAME_MAX):`Channel ${t.length+1}`,group:typeof s.group=="string"&&s.group.trim()?s.group.trim().slice(0,Ln.GROUP_MAX):null,logo:typeof s.logo=="string"&&/^https?:\/\//i.test(s.logo.trim())?s.logo.trim():null,tvgId:a||null})}return t}function Rv(i){switch(i){case"too_many_lists":return`The theater's channel shelf is full (${Ln.LISTS_MAX} lists). Remove one to make room.`;case"text_too_large":return"That playlist text is too large to file — trim it or split it into a couple of lists.";case"too_many_channels":return`That playlist carries more than ${Ln.CHANNELS_MAX} channels — more than the guide can hold.`;case"no_channels":return"No playable channels were found in that playlist.";case"not_a_playlist":return"That does not look like an M3U/M3U8 playlist — it should start with #EXTM3U or contain channel URLs, one per line.";case"list_not_found":return"That list is no longer in the theater library.";default:return"The theater could not accept that."}}function Br(i){return String(i).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function Pv(i){let e=`#EXTM3U
`;for(const t of Array.isArray(i)?i:[]){if(!t?.url||!/^https?:\/\//i.test(t.url))continue;const n=[];t.tvgId&&n.push(`tvg-id="${Br(t.tvgId)}"`),t.name&&n.push(`tvg-name="${Br(t.name)}"`),t.group&&n.push(`group-title="${Br(t.group)}"`),t.logo&&n.push(`tvg-logo="${Br(t.logo)}"`),e+=`#EXTINF:-1 ${n.join(" ")},${t.name||"Channel"}
${t.url}
`}return e}const kr=100,Iv=1.5,Lv=2e3,lh=8e3,Dv=3e3,Uv=2e4,uo=5,pd="afterlight-iptv-lists",Nv=12,Fv=5e3,Ov=6e4;function Bv(i,e){const t=[1,0,0,0,1,0,0,0,1];if(!Array.isArray(i)||!Array.isArray(e)||i.length<4||e.length<4)return t;const n=[];for(let a=0;a<4;a++){const o=i[a]||{},l=e[a]||{},c=Number(o.x),d=Number(o.y),f=Number(l.x),h=Number(l.y);if(![c,d,f,h].every(Number.isFinite))return t;n.push([c,d,1,0,0,0,-f*c,-f*d,f]),n.push([0,0,0,c,d,1,-h*c,-h*d,h])}const s=8;for(let a=0;a<s;a++){let o=a;for(let c=a+1;c<n.length;c++)Math.abs(n[c][a])>Math.abs(n[o][a])&&(o=c);if(Math.abs(n[o][a])<1e-12)return t;if(o!==a){const c=n[o];n[o]=n[a],n[a]=c}const l=n[a][a];for(let c=a;c<=s;c++)n[a][c]/=l;for(let c=0;c<n.length;c++){if(c===a)continue;const d=n[c][a];if(d!==0)for(let f=a;f<=s;f++)n[c][f]-=d*n[a][f]}}const r=[];for(let a=0;a<s;a++)r.push(n[a][s]);return r.push(1),r}function kv(i){const e=(t,n=0)=>{const s=Number(i?.[t]);return Number.isFinite(s)?s:t===8?1:n};return`matrix3d(${e(0)}, ${e(3)}, 0, ${e(6)}, ${e(1)}, ${e(4)}, 0, ${e(7)}, 0, 0, 1, 0, ${e(2)}, ${e(5)}, 0, ${e(8)})`}const Qr="Other";function ch(i){const e=typeof i=="string"?i.trim():"";if(!e)return{country:null,category:null};const t=e.indexOf("|");return t<0?{country:e,category:null}:{country:e.slice(0,t).trim()||null,category:e.slice(t+1).trim()||null}}function Hv(i){const e=new Map;let t=0,n=0;for(const s of Array.isArray(i)?i:[]){const{country:r,category:a}=ch(s?.group);if(!r&&!a){n+=1;continue}t+=1;const o=r||Qr;e.has(o)||e.set(o,new Set),a&&e.get(o).add(a)}return t>0&&n>0&&e.set(Qr,e.get(Qr)||new Set),{countries:[...e.keys()].sort((s,r)=>s.localeCompare(r)),categoriesFor(s){const r=s==="All"?[...e.values()]:[e.get(s)].filter(Boolean),a=new Set;for(const o of r)for(const l of o)a.add(l);return[...a].sort((o,l)=>o.localeCompare(l))}}}function md(i,e,t){const{country:n,category:s}=ch(i?.group);return!(e&&e!=="All"&&(n||Qr)!==e||t&&t!=="All"&&(s||"")!==t)}function gd(i,e=0){const t=[];if(!Array.isArray(i))return t;const n=Number.isFinite(Number(e))?Number(e):0;for(const s of i){if(t.length>=Nv)break;if(!s||typeof s!="object")continue;const r=[];if(Array.isArray(s.channels))for(const a of s.channels){if(r.length>=Fv)break;if(!a||typeof a!="object")continue;const o=typeof a.url=="string"?a.url.trim():"";if(!/^https?:\/\//i.test(o))continue;const l=typeof a.logo=="string"?a.logo.trim():"";r.push({url:o,name:typeof a.name=="string"&&a.name.trim()?a.name.trim().slice(0,200):`Channel ${r.length+1}`,group:typeof a.group=="string"&&a.group.trim()?a.group.trim().slice(0,120):null,logo:/^https?:\/\//i.test(l)?l:null})}r.length!==0&&t.push({id:typeof s.id=="string"&&s.id?s.id:`iptv_${t.length}_${n}`,name:typeof s.name=="string"&&s.name.trim()?s.name.trim().slice(0,80):"Untitled list",savedAt:Number.isFinite(Number(s.savedAt))?Number(s.savedAt):n,channels:r})}return t}const Hr=new Map;function dh(i,e=lh){if(typeof document>"u")return Promise.reject(new Error("no document"));if(Hr.has(i))return Hr.get(i);const t=new Promise((n,s)=>{const r=document.createElement("script"),a=setTimeout(()=>s(new Error(`Timed out loading ${i}`)),e);r.src=i,r.async=!0,r.onload=()=>{clearTimeout(a),n()},r.onerror=()=>{clearTimeout(a),Hr.delete(i),s(new Error(`Failed to load ${i}`))},document.head.append(r)});return Hr.set(i,t),t}let Os=null;function zv(){return typeof window>"u"?Promise.reject(new Error("no window")):window.YT&&window.YT.Player?Promise.resolve(window.YT):(Os||(Os=new Promise((i,e)=>{const t=setTimeout(()=>e(new Error("YouTube IFrame API timed out")),lh),n=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(clearTimeout(t),typeof n=="function")try{n()}catch{}window.YT&&window.YT.Player?i(window.YT):e(new Error("YouTube IFrame API missing after load"))},dh("https://www.youtube.com/iframe_api").catch(s=>{clearTimeout(t),e(s)})}),Os.catch(()=>{Os=null})),Os)}async function Vv(){if(typeof window>"u")throw new Error("no window");if(window.Vimeo&&window.Vimeo.Player||(await dh("https://player.vimeo.com/api/player.js"),window.Vimeo&&window.Vimeo.Player))return window.Vimeo;throw new Error("Vimeo player SDK missing after load")}class Gv{constructor(e=null){this.net=e,this.state=null,this.serverDelta=0,this.roomActive=!1,this.quad=null,this.engine=null,this.loadedItemId=null,this.reportedForId=null,this.overlayState="idle",this.errorTitle=null,this.awaitingGesture=!1,this.lastDriftCheckMs=0,this.loadToken=0,this.volume=1,this.watching=!1,this.onStandUpRequest=null,this.seatedInWorld=!1,this.savedLists=[],this.sharedCatalog={lists:[],epg:null},this.sharedChannels=new Map,this.pendingFlip=0,this.epgSchedule=new Map,this.epgTimer=null,this.activeListId=null,this.activeChannelIndex=-1,this.guideCountry="All",this.guideCategory="All",this.guideListId=null,this.torrentPending=null,this.torrentPick=null,this.torrentStatuses=new Map,this.playlistPending=null,this.playlistChoice=null,this.playlistPreview=null,this.overlayW=kr,this.overlayH=kr,this.dom=null,typeof document<"u"&&(this.dom={},this.buildOverlay(),this.buildControlsButton(),this.buildDialogs(),this.buildWatchBar(),this.savedLists=this.loadSavedLists(),this.syncOverlay()),e&&typeof e.on=="function"&&(e.on(ge.THEATER_STATE,t=>this.applyState(t?.theater,t?.serverNow||Date.now())),e.on(ge.IPTV_STATE,t=>this.applyIptvState(t?.iptv)),e.on(ge.IPTV_LIST,t=>this.applySharedList(t)),e.on(ge.EPG_SCHEDULE,t=>this.applyEpgSchedule(t)),e.on(ge.TORRENT_FILES,t=>this.applyTorrentFiles(t)),e.on(ge.TORRENT_STATE,t=>this.applyTorrentStatus(t)),e.on(ge.THEATER_PLAYLIST_RESOLVED,t=>this.applyPlaylistResolved(t)),e.on(ge.THEATER_IMPORT_RESULT,t=>this.applyImportResult(t)))}setRoomActive(e){this.roomActive=!!e,this.roomActive?this.state?.now?(this.loadedItemId=null,this.loadCurrent()):this.setOverlayState("idle"):(this.teardownEngine(),this.loadedItemId=null,this.awaitingGesture=!1,this.cancelTorrentResolve(),this.torrentPick=null,this.torrentStatuses.clear(),this.cancelPlaylistResolve(),this.playlistChoice=null,this.playlistPreview=null,this.dom?.playlistDialog?.open&&this.dom.playlistDialog.close(),this.dom?.playlistChoiceDialog?.open&&this.dom.playlistChoiceDialog.close(),this.setOverlayState("idle")),this.dom?.controlsBtn&&(this.dom.controlsBtn.hidden=!this.roomActive),this.syncOverlay()}applyState(e,t=null){const n=e&&typeof e=="object"?e:{now:null,queue:[]};this.state={now:n.now&&typeof n.now=="object"?n.now:null,queue:Array.isArray(n.queue)?n.queue:[]};const s=Number(t);if(Number.isFinite(s)&&s>0&&(this.serverDelta=s-Date.now()),this.dom?.controlsDialog?.open&&this.renderControls(),this.dom?.guideDialog?.open&&this.renderGuide(),this.watching&&this.updateWatchBar(),!this.roomActive)return;const r=this.state.now;if(!r){(this.engine||this.loadedItemId!==null)&&this.teardownEngine(),this.loadedItemId=null,this.reportedForId=null,this.setOverlayState("idle"),this.syncOverlay();return}this.rememberChannelFor(r.url),r.id!==this.loadedItemId?(this.reportedForId=null,this.loadCurrent()):this.enforceSync(),this.syncOverlay()}updateScreenQuad(e,t=1){if(this.quad=Array.isArray(e)&&e.length>=4?e:null,this.dom?.overlay&&this.quad&&!this.watching){const n=this.quad.map(h=>h.x),s=this.quad.map(h=>h.y),r=Math.max(0,Math.max(...n)-Math.min(...n))*Math.max(0,Math.max(...s)-Math.min(...s)),a=Number.isFinite(t)&&t>0?t:1,o=Math.min(Math.max(Math.sqrt(Math.max(r,1)*a),kr),2400),l=Math.round(o),c=Math.max(1,Math.round(o/a));if(Math.abs(l-this.overlayW)>2||Math.abs(c-this.overlayH)>2){this.overlayW=l,this.overlayH=c;const h=this.dom.overlay.style;h.width=`${l}px`,h.height=`${c}px`,h.setProperty("--ts-scale",(c/kr).toFixed(3))}const d=[{x:0,y:0},{x:l,y:0},{x:l,y:c},{x:0,y:c}],f=[this.quad[3],this.quad[2],this.quad[1],this.quad[0]];this.dom.overlay.style.transform=kv(Bv(d,f))}this.syncOverlay(),this.tickDriftCheck()}openControls(){this.dom?.controlsDialog&&(this.renderControls(),this.dom.controlsDialog.open||this.dom.controlsDialog.showModal())}isWatching(){return!!this.watching}setWatchMode(e){if(typeof document>"u")return;const t=!!e;t!==this.watching&&(this.watching=t,document.body.classList.toggle("theater-watching",this.watching),document.activeElement?.id==="chat-input"&&document.activeElement.blur(),this.dom?.overlay&&(this.watching?(this.dom.overlay.style.transform="",this.dom.overlay.style.width="",this.dom.overlay.style.height="",this.dom.overlay.style.removeProperty("--ts-scale")):this.dom.overlay.style.aspectRatio=""),this.watching&&this.dockChatForWatch(),this.updateWatchBar(),this.syncOverlay())}dockChatForWatch(){const e=document.getElementById("chat-panel");if(!e){document.body.style.setProperty("--theater-chat-gutter","0px");return}e.classList.contains("collapsed")&&document.getElementById("chat-toggle")?.click(),requestAnimationFrame(()=>{if(!this.watching)return;const t=e.getBoundingClientRect(),n=t.width>0?Math.ceil(t.width+Math.max(0,window.innerWidth-t.right)):0;document.body.style.setProperty("--theater-chat-gutter",`${n}px`)})}buildWatchBar(){const e=document.createElement("div");e.id="theater-watchbar",e.hidden=!0,e.innerHTML=`
      <span class="theater-watchbar-title" id="theater-watchbar-title">The Orpheum</span>
      <span class="theater-watchbar-state micro" id="theater-watchbar-state"></span>
      <button type="button" id="theater-watchbar-controls" title="Open the projection booth (G)">▣ Booth</button>
      <button type="button" id="theater-watchbar-leave" title="Stand up and return to the game (Esc)">⤺ Stand up</button>
    `,document.body.append(e),e.querySelector("#theater-watchbar-controls").addEventListener("click",()=>this.openControls()),e.querySelector("#theater-watchbar-leave").addEventListener("click",()=>{this.onStandUpRequest?.(),this.setWatchMode(!1)}),this.watchbar=e,this.watchbarTitle=e.querySelector("#theater-watchbar-title"),this.watchbarState=e.querySelector("#theater-watchbar-state")}updateWatchBar(){if(!this.watchbar||(this.watchbar.hidden=!this.watching,!this.watching))return;const e=this.state?.now;this.watchbarTitle.textContent=e?`Now playing · ${e.title}`:"The Orpheum · the screen sleeps",this.watchbarState.textContent=e?e.playing?"▶":"⏸":"";const t=this.watchbar.querySelector("#theater-watchbar-leave");t&&(t.textContent=this.seatedInWorld?"⤺ Stand up":"⤺ Back to the world",t.title=this.seatedInWorld?"Stand up and return to the game (Esc)":"Step out of the cinema view and walk the aisles (Esc)")}setSeated(e){this.seatedInWorld=!!e,this.watching&&this.updateWatchBar()}openGuide(){this.dom?.guideDialog&&(this.renderGuide(),this.dom.guideDialog.open||this.dom.guideDialog.showModal(),this.requestEpgSchedule(),this.startEpgRefresh())}targetPosition(e=Date.now()){return this.state?.now?Av(this.state.now,e+this.serverDelta):0}tickDriftCheck(){const e=this.state?.now;if(!this.roomActive||!e||!this.engine||this.engine.degraded||!this.engine.ready)return;const t=Date.now();t-this.lastDriftCheckMs<Lv||(this.lastDriftCheckMs=t,this.enforceSync())}enforceSync(){if(!this.engine||this.engine.degraded||!this.engine.ready)return;const e=this.state?.now;if(!e)return;const t=this.engine.getTime?this.engine.getTime():null,n=this.targetPosition();Number.isFinite(t)&&Number.isFinite(n)&&Math.abs(t-n)>Iv&&e.kind!=="hls"&&this.engine.seek(Math.max(0,n)),e.playing?this.awaitingGesture||this.engine.play():this.engine.pause()}teardownEngine(){const e=this.engine;if(this.engine=null,this.awaitingGesture=!1,this.hideGestureBadge(),e)try{e.destroy?.()}catch{}this.dom?.mediaHost&&(this.dom.mediaHost.innerHTML="")}loadCurrent(){const e=this.state?.now;if(!e||!this.dom)return;const t=++this.loadToken;switch(this.teardownEngine(),this.loadedItemId=e.id,this.errorTitle=null,this.setOverlayState("loading"),e.kind){case"file":this.startFileEngine(e,t,!1);break;case"hls":this.startFileEngine(e,t,!0);break;case"torrent":this.startFileEngine(e,t,!1);break;case"youtube":this.startYouTubeEngine(e,t);break;case"vimeo":this.startVimeoEngine(e,t);break;default:this.failItem()}}startFileEngine(e,t,n){const s=document.createElement("video");s.autoplay=!0,s.setAttribute("playsinline",""),s.preload="auto",s.volume=this.volume,this.dom.mediaHost.append(s);const r={kind:e.kind,video:s,hls:null,degraded:!1,ready:!1,getTime:()=>Number.isFinite(s.currentTime)?s.currentTime:null,seek:o=>{try{s.currentTime=o}catch{}},play:()=>{s.paused&&this.playVideoElement(s)},pause:()=>{s.paused||s.pause()},setVolume:o=>{s.volume=o},destroy:()=>{if(r.hls){try{r.hls.destroy()}catch{}r.hls=null}try{s.pause()}catch{}try{s.removeAttribute("src"),s.load()}catch{}}};this.engine=r,s.addEventListener("playing",()=>{this.engine===r&&(this.hideGestureBadge(),this.setOverlayState("playing"))}),s.addEventListener("waiting",()=>{this.engine===r&&this.overlayState==="playing"&&this.setOverlayState("loading")}),s.addEventListener("ended",()=>this.reportEnded()),s.addEventListener("error",()=>{this.engine===r&&this.failItem()});const a=()=>{if(this.engine!==r||t!==this.loadToken)return;r.ready=!0;const o=this.targetPosition();o>.5&&e.kind!=="hls"&&r.seek(o),this.state?.now?.playing!==!1?this.playVideoElement(s):r.pause()};s.readyState>=1?a():s.addEventListener("loadedmetadata",a,{once:!0}),n?this.attachHls(s,e,r,t):s.src=e.kind==="torrent"?this.torrentStreamUrl(e):e.url}async attachHls(e,t,n,s){let r=null;try{const a=await pv(()=>import("./hls-BOLXTnjL.js"),[]);r=a?.default??a}catch(a){console.warn("theater: hls.js unavailable, trying native HLS playback",a)}if(!(this.engine!==n||s!==this.loadToken))if(r&&typeof r.isSupported=="function"&&r.isSupported()){const a=new r;n.hls=a,a.on(r.Events.ERROR,(o,l)=>{if(!(!l?.fatal||this.engine!==n)){try{a.destroy()}catch{}n.hls===a&&(n.hls=null),this.failItem()}}),a.loadSource(t.url),a.attachMedia(e)}else e.src=t.url}async startYouTubeEngine(e,t){let n=null;try{n=await zv()}catch(l){console.warn("theater: YouTube API unavailable",l),t===this.loadToken&&this.failItem();return}if(t!==this.loadToken)return;const s=document.createElement("div");this.dom.mediaHost.append(s);const r={kind:"youtube",player:null,mount:s,degraded:!1,ready:!1,unstartedTimer:null};this.engine=r;const a=()=>{try{return r.player?.getPlayerState?.()}catch{return null}};let o;try{o=new n.Player(s,{width:"100%",height:"100%",videoId:e.videoId,playerVars:{autoplay:1,playsinline:1,controls:0,rel:0,disablekb:1},events:{onReady:()=>{if(this.engine!==r||t!==this.loadToken)return;r.ready=!0,r.player=o;try{o.setVolume(Math.round(this.volume*100))}catch{}const l=this.targetPosition();if(l>.5)try{o.seekTo(l,!0)}catch{}if(this.state?.now?.playing!==!1)try{o.playVideo()}catch{}r.unstartedTimer=setTimeout(()=>{if(r.unstartedTimer=null,this.engine!==r)return;const c=a();this.state?.now?.playing!==!1&&(c===-1||c===5)&&this.showGestureBadge()},Dv)},onStateChange:l=>{if(this.engine!==r)return;const c=l?.data;c===1?(this.hideGestureBadge(),this.setOverlayState("playing")):c===0&&this.reportEnded()},onError:()=>{this.engine===r&&this.failItem()}}})}catch(l){console.warn("theater: YouTube player creation failed",l),t===this.loadToken&&this.failItem();return}r.player=o,r.getTime=()=>{try{const l=o.getCurrentTime?.();return Number.isFinite(l)?l:null}catch{return null}},r.seek=l=>{try{o.seekTo(l,!0)}catch{}},r.play=()=>{try{o.playVideo()}catch{}},r.pause=()=>{try{o.pauseVideo()}catch{}},r.setVolume=l=>{try{o.setVolume(Math.round(l*100))}catch{}},r.destroy=()=>{r.unstartedTimer&&(clearTimeout(r.unstartedTimer),r.unstartedTimer=null);try{o.destroy?.()}catch{}}}async startVimeoEngine(e,t){const n=document.createElement("iframe");n.src=wv("vimeo",e.videoId)||e.url,n.setAttribute("allow","autoplay; fullscreen; picture-in-picture"),n.setAttribute("allowfullscreen",""),this.dom.mediaHost.append(n);const s={kind:"vimeo",iframe:n,player:null,degraded:!0,ready:!0,time:null,getTime:()=>s.degraded?null:s.time,seek:r=>{try{s.player?.setCurrentTime?.(r)}catch{}},play:()=>{try{s.player?.play?.()}catch{}},pause:()=>{try{s.player?.pause?.()}catch{}},setVolume:r=>{try{s.player?.setVolume?.(r)}catch{}},destroy:()=>{try{s.player?.destroy?.()}catch{}}};this.engine=s,this.setOverlayState("loading");try{const r=await Vv();if(this.engine!==s||t!==this.loadToken)return;const a=new r.Player(n);s.player=a,s.degraded=!1,a.on("playing",()=>{this.engine===s&&(this.hideGestureBadge(),this.setOverlayState("playing"))}),a.on("timeupdate",l=>{this.engine===s&&(s.time=Number.isFinite(l?.seconds)?l.seconds:s.time)}),a.on("ended",()=>this.reportEnded()),a.on("error",()=>{this.engine===s&&this.failItem()});const o=this.targetPosition();if(o>.5)try{await a.setCurrentTime(o)}catch{}try{await a.setVolume(this.volume)}catch{}try{await a.play()}catch{this.showGestureBadge()}}catch(r){console.warn("theater: Vimeo SDK unavailable, iframe runs unsynced",r),s.degraded=!0}}playVideoElement(e){try{const t=e.play();t&&typeof t.catch=="function"&&t.catch(n=>{this.engine?.video===e&&(console.warn("theater: autoplay blocked",n?.name||n),this.showGestureBadge())})}catch{this.showGestureBadge()}}setOverlayState(e){this.overlayState=e;const t=this.dom?.overlay;t&&(t.classList.remove("ts-state-idle","ts-state-loading","ts-state-playing","ts-state-error"),t.classList.add(`ts-state-${e}`),this.renderCaption())}renderCaption(){const e=this.dom?.caption;if(!e)return;const t=this.state?.now;let n="";if(this.overlayState==="idle")n="The screen sleeps — open the Screen controls to queue something";else if(this.overlayState==="loading"){const s=t?.kind==="torrent"?this.torrentStatusText(t.infohash):"";n=s?`${s} — ${t.title}`:t?`Warming up the projector… ${t.title}`:"Warming up the projector…"}else this.overlayState==="error"?n=`Couldn't play: ${this.errorTitle||t?.title||"unknown item"}`:n=t?t.title:"";e.textContent=n}syncOverlay(){const e=this.dom?.overlay;e&&e.classList.toggle("ts-hidden",!(this.roomActive&&(this.quad||this.watching)))}showGestureBadge(){this.awaitingGesture=!0,this.dom?.playBadge&&(this.dom.playBadge.hidden=!1)}hideGestureBadge(){this.awaitingGesture=!1,this.dom?.playBadge&&(this.dom.playBadge.hidden=!0)}resumeFromGesture(){this.hideGestureBadge();const e=this.engine;e&&(e.video?this.playVideoElement(e.video):e.play?.())}reportEnded(){this.sendItemReport("ended")}failItem(){const e=this.state?.now;this.errorTitle=e?.title||"the current item",this.teardownEngine(),this.setOverlayState("error"),this.sendItemReport("failed")}sendItemReport(e){const t=this.state?.now?.id;!t||this.reportedForId===t||(this.reportedForId=t,this.sendControl({op:e,itemId:t}))}sendControl(e){typeof this.net?.sendTheaterControl=="function"?this.net.sendTheaterControl(e):this.net?.send?.(ge.THEATER_CONTROL,e)}sendQueue(e){typeof this.net?.sendTheaterQueue=="function"?this.net.sendTheaterQueue(e):this.net?.send?.(ge.THEATER_QUEUE,e)}sendChannel(e,t){typeof this.net?.sendTheaterChannel=="function"?this.net.sendTheaterChannel(e,t):this.net?.send?.(ge.THEATER_CHANNEL,{url:e,title:t})}buildOverlay(){const e=document.createElement("div");e.id="theater-screen",e.className="ts-hidden ts-state-idle",e.innerHTML=`
      <div class="ts-media"></div>
      <div class="ts-state-layer"></div>
      <div class="ts-caption"><span class="ts-caption-text"></span></div>
      <button type="button" class="ts-play-badge" hidden>▶ Tap to start</button>
    `,this.dom.overlay=e,this.dom.mediaHost=e.querySelector(".ts-media"),this.dom.caption=e.querySelector(".ts-caption-text"),this.dom.playBadge=e.querySelector(".ts-play-badge"),this.dom.playBadge.addEventListener("click",()=>this.resumeFromGesture()),document.body.append(e)}buildControlsButton(){const e=document.createElement("button");e.type="button",e.id="theater-controls-btn",e.textContent="▣ Screen",e.title="Screen controls (G)",e.hidden=!0,e.addEventListener("click",()=>this.openControls()),(document.querySelector("footer .actions")||document.body).append(e),this.dom.controlsBtn=e}buildDialogs(){this.buildControlsDialog(),this.buildGuideDialog(),this.buildTorrentDialog(),this.buildPlaylistDialogs()}buildControlsDialog(){const e=document.createElement("dialog");e.id="theater-dialog",e.className="game-modal",e.innerHTML=`
      <div class="micro modal-header-tag">THE ORPHEUM · PROJECTION BOOTH</div>
      <h2>Screen Controls</h2>
      <p class="modal-sub">Anyone in the auditorium may run the projector — everyone watching sees the same thing at the same time.</p>

      <div class="panel theater-now-panel" id="theater-now-panel"></div>

      <label class="micro" for="theater-url-input">ADD BY URL (YOUTUBE · PLAYLIST · VIMEO · .MP4 · .M3U8 · MAGNET)</label>
      <div class="theater-add-row">
        <input type="text" id="theater-url-input" maxlength="${Jr.URL_MAX}"
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
    `,document.body.append(e),e.addEventListener("cancel",t=>{t.preventDefault(),e.close()}),this.dom.controlsDialog=e,this.dom.nowPanel=e.querySelector("#theater-now-panel"),this.dom.urlInput=e.querySelector("#theater-url-input"),this.dom.addStatus=e.querySelector("#theater-add-status"),this.dom.queueList=e.querySelector("#theater-queue-list"),this.dom.btnToggle=e.querySelector("#theater-btn-toggle"),this.dom.btnSkip=e.querySelector("#theater-btn-skip"),this.dom.btnBack=e.querySelector("#theater-btn-back"),this.dom.btnFwd=e.querySelector("#theater-btn-fwd"),this.dom.btnClear=e.querySelector("#theater-btn-clear"),this.dom.volumeInput=e.querySelector("#theater-volume"),this.dom.iptvSelect=e.querySelector("#theater-iptv-select"),this.dom.iptvCurrent=e.querySelector("#theater-iptv-current"),this.dom.iptvStatus=e.querySelector("#theater-iptv-status"),this.dom.iptvPush=e.querySelector("#theater-btn-push-list"),this.dom.iptvPaste=e.querySelector("#theater-iptv-paste"),this.dom.iptvFile=e.querySelector("#theater-iptv-file"),this.dom.iptvUrl=e.querySelector("#theater-iptv-url"),this.dom.epgFile=e.querySelector("#theater-epg-file"),this.dom.epgStatus=e.querySelector("#theater-epg-status"),e.querySelector("#close-theater-dialog").addEventListener("click",()=>e.close()),e.querySelector("#theater-btn-add").addEventListener("click",()=>this.onAddClicked(!1)),e.querySelector("#theater-btn-play-url").addEventListener("click",()=>this.onAddClicked(!0)),this.dom.urlInput.addEventListener("keydown",t=>{t.key==="Enter"&&(t.preventDefault(),this.onAddClicked(!1))}),this.dom.urlInput.addEventListener("input",()=>this.recognizeAddInput()),this.dom.btnToggle.addEventListener("click",()=>{const t=this.state?.now;t&&this.sendControl(t.playing?{op:"pause",itemId:t.id}:{op:"resume",itemId:t.id})}),this.dom.btnSkip.addEventListener("click",()=>this.sendQueue({op:"skip"})),this.dom.btnBack.addEventListener("click",()=>this.nudgeSeek(-30)),this.dom.btnFwd.addEventListener("click",()=>this.nudgeSeek(30)),this.dom.btnClear.addEventListener("click",()=>this.sendQueue({op:"clear"})),this.dom.volumeInput.addEventListener("input",()=>{const t=Number(this.dom.volumeInput.value);this.volume=Number.isFinite(t)?Math.min(1,Math.max(0,t/100)):1,this.engine?.setVolume?.(this.volume)}),this.dom.iptvSelect.addEventListener("change",()=>{this.activeListId=this.dom.iptvSelect.value||null,this.activeChannelIndex=-1,this.renderIptvSection()}),e.querySelector("#theater-btn-open-guide").addEventListener("click",()=>this.openGuide()),e.querySelector("#theater-btn-delete-list").addEventListener("click",()=>this.deleteActiveList()),this.dom.iptvPush.addEventListener("click",()=>this.pushActivePersonalList()),e.querySelector("#theater-btn-prev").addEventListener("click",()=>this.flipChannel(-1)),e.querySelector("#theater-btn-next").addEventListener("click",()=>this.flipChannel(1)),e.querySelector("#theater-btn-import-paste").addEventListener("click",()=>{this.uploadPlaylistText(this.dom.iptvPaste.value,null),this.dom.iptvPaste.value=""}),this.dom.iptvFile.addEventListener("change",()=>{const t=this.dom.iptvFile.files?.[0];this.dom.iptvFile.value="",this.importPlaylistFile(t)}),e.querySelector("#theater-btn-import-url").addEventListener("click",()=>this.importPlaylistUrl()),this.dom.epgFile.addEventListener("change",()=>{const t=this.dom.epgFile.files?.[0];this.dom.epgFile.value="",this.uploadEpgFile(t)})}buildGuideDialog(){const e=document.createElement("dialog");e.id="theater-guide-dialog",e.className="game-modal game-modal--wide",e.innerHTML=`
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
    `,document.body.append(t),t.addEventListener("cancel",n=>{n.preventDefault(),this.playlistPreview=null,t.close()}),t.querySelector("#theater-playlist-cancel").addEventListener("click",()=>{this.playlistPreview=null,t.close()}),t.querySelector("#theater-playlist-confirm").addEventListener("click",()=>this.confirmPlaylistImport()),this.dom.playlistDialog=t}nudgeSeek(e){const t=this.state?.now;if(!t)return;const n=Math.max(0,Math.round((this.targetPosition()+e)*10)/10);this.sendControl({op:"seek",positionSec:n,itemId:t.id})}setAddStatus(e,t=!1){const n=this.dom?.addStatus;n&&(n.hidden=!e,n.textContent=e||"",n.classList.toggle("is-error",!!t))}setIptvStatus(e,t=!1){const n=this.dom?.iptvStatus;n&&(n.hidden=!e,n.textContent=e||"",n.classList.toggle("is-error",!!t))}setEpgStatus(e,t=!1){const n=this.dom?.epgStatus;n&&(n.hidden=!e,n.textContent=e||"",n.classList.toggle("is-error",!!t))}async uploadEpgFile(e){if(e){if(!this.net?.uploadEpg){this.setEpgStatus("Multiplayer is offline — the theater cannot store guides right now.",!0);return}this.setEpgStatus("Uploading the program guide…");try{const t=await this.net.uploadEpg(e,e.name.replace(/\.(epg|xml|xmltv|gz)$/i,"")),n=t.epg||{};this.setEpgStatus(`Guide active: ${n.name||"Program guide"} — ${n.channels||0} channels with listings${t.truncated?" (the file was larger than the guide shelf, so it was trimmed)":""}. Everyone in the auditorium now sees now/next in the guide.`)}catch(t){this.setEpgStatus(t.message||"Could not upload that guide.",!0)}}}recognizeAddInput(){const e=this.dom?.urlInput,t=ud((e?.value||"").trim());t?.kind==="youtubePlaylist"?this.setAddStatus("A YouTube playlist — Add reads it and queues its videos together."):t?.kind==="youtube"&&t.listId&&this.setAddStatus("A YouTube video that belongs to a playlist — Add will ask which one you want.")}beginPlaylistResolve(e,t){if(!this.net?.send){this.setAddStatus("Multiplayer is offline — playlists cannot be imported right now.",!0);return}if(this.playlistPending){this.setAddStatus(fd("resolve_in_flight"),!0);return}const n=`plreq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,s=setTimeout(()=>{this.playlistPending?.requestId===n&&(this.playlistPending=null,this.setAddStatus("That playlist took too long to read. Try again in a moment.",!0))},Uv);this.playlistPending={requestId:n,playNow:t,timer:s},this.setAddStatus("Reading the playlist…"),typeof this.net.sendPlaylistResolve=="function"?this.net.sendPlaylistResolve(n,e):this.net.send(ge.THEATER_PLAYLIST_RESOLVE,{requestId:n,listId:e})}cancelPlaylistResolve(){this.playlistPending?.timer&&clearTimeout(this.playlistPending.timer),this.playlistPending=null}applyPlaylistResolved(e){const t=this.playlistPending;if(!t||!e||String(e.requestId||"")!==t.requestId||(clearTimeout(t.timer),this.playlistPending=null,!this.roomActive))return;const n=(Array.isArray(e.videos)?e.videos:[]).filter(s=>s&&typeof s.videoId=="string"&&/^[\w-]{6,}$/.test(s.videoId));if(!n.length){this.setAddStatus("That playlist had no videos the projector could read.",!0);return}this.setAddStatus(""),this.openPlaylistPreview(String(e.title||"A YouTube playlist"),n,t.playNow)}importCapacity(){return this.state?Math.max(0,Jr.QUEUE_MAX-(this.state.queue?.length||0))+(this.state.now?0:1):Jr.QUEUE_MAX}openPlaylistPreview(e,t,n){const s=this.dom?.playlistDialog;if(!s)return;this.playlistPreview={title:e,videos:t,playNow:n},s.querySelector("#theater-playlist-name").textContent=e;const r=Math.min(this.importCapacity(),t.length);s.querySelector("#theater-playlist-sub").textContent=`${t.length} video${t.length===1?"":"s"} resolved — `+(r>=t.length?"they all fit on the reel right now.":`the reel can take ${r} more right now; the rest would be left off.`);const a=s.querySelector("#theater-playlist-videos");a.innerHTML="";for(const l of t.slice(0,uo)){const c=document.createElement("div");c.className="theater-playlist-video",c.textContent=l.title||"Untitled video",a.append(c)}if(t.length>uo){const l=document.createElement("div");l.className="theater-playlist-video theater-playlist-more",l.textContent=`… and ${t.length-uo} more`,a.append(l)}const o=s.querySelector("#theater-playlist-confirm");o.textContent=r>0?`Add ${r} video${r===1?"":"s"} to the reel`:"The reel is full",o.disabled=r===0,s.open||s.showModal()}confirmPlaylistImport(){const e=this.playlistPreview;this.playlistPreview=null;const t=this.dom?.playlistDialog;if(t?.open&&t.close(),!e?.videos?.length)return;const n=e.videos.map(s=>({url:`https://www.youtube.com/watch?v=${encodeURIComponent(s.videoId)}`,title:s.title||""}));this.sendQueue({op:"addMany",items:n}),this.setAddStatus(`Pinning ${n.length} videos from "${e.title}" to the reel…`)}applyImportResult(e){const t=Math.max(0,Number(e?.queued)||0),n=Math.max(0,Number(e?.skipped)||0),s=Math.max(0,Number(e?.didNotFit)||0);if(!t&&!n&&!s)return;const r=[`Queued ${t} video${t===1?"":"s"}`];s&&r.push(`${s} didn't fit — the reel is full`),n&&r.push(`${n} skipped`),this.setAddStatus(`${r.join(" · ")}.`)}onAddClicked(e){const t=this.dom?.urlInput,n=(t?.value||"").trim(),s=ud(n);if(!s){this.setAddStatus(fd("invalid_url"),!0);return}if(s.kind==="torrent"){t.value="",this.beginTorrentResolve(s.url,e);return}if(s.kind==="youtubePlaylist"){t.value="",this.beginPlaylistResolve(s.listId,e);return}if(s.kind==="youtube"&&s.listId){this.openPlaylistChoice(s,e);return}this.addSingleVideo(s,e),t.value=""}openPlaylistChoice(e,t){const n=this.dom?.playlistChoiceDialog;n&&(this.playlistChoice={classified:e,playNow:t},n.open||n.showModal())}addSingleVideo(e,t){this.setAddStatus(""),t?this.sendChannel(e.url,Ev(e.kind)):this.sendQueue({op:"add",url:e.url})}torrentStreamUrl(e){return`${typeof this.net?.apiBase=="string"?this.net.apiBase.replace(/\/+$/,""):""}/api/theater/torrent/${e.infohash}/${e.fileIndex}`}beginTorrentResolve(e,t){if(!this.net?.send){this.setAddStatus("Multiplayer is offline — the torrent reel is unreachable.",!0);return}if(this.torrentPending){this.setAddStatus("Hold on — one torrent is still being looked up.",!0);return}const n=`treq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,s=setTimeout(()=>{this.torrentPending?.requestId===n&&(this.torrentPending=null,this.setAddStatus(Sv("resolve_timeout"),!0))},gv.RESOLVE_TIMEOUT_MS+5e3);this.torrentPending={requestId:n,magnet:e,playNow:t,timer:s},this.setAddStatus("Reaching the swarm for that torrent…"),typeof this.net.sendTorrentResolve=="function"?this.net.sendTorrentResolve(n,e):this.net.send(ge.TORRENT_RESOLVE,{requestId:n,magnet:e})}cancelTorrentResolve(){this.torrentPending?.timer&&clearTimeout(this.torrentPending.timer),this.torrentPending=null}applyTorrentFiles(e){const t=this.torrentPending;if(!t||!e||String(e.requestId||"")!==t.requestId||(clearTimeout(t.timer),this.torrentPending=null,!this.roomActive))return;const n=Array.isArray(e.files)?e.files:[];if(!n.length){this.setAddStatus("That torrent has no video files the projector can play.",!0);return}this.setAddStatus(""),this.openTorrentPicker(String(e.name||"Unnamed torrent"),n,t.magnet,t.playNow)}openTorrentPicker(e,t,n,s){const r=this.dom?.torrentDialog;if(!r)return;this.torrentPick={magnet:n,name:e,playNow:s},r.querySelector("#theater-torrent-name").textContent=e;const a=r.querySelector("#theater-torrent-files");a.innerHTML="";for(const o of t){const l=document.createElement("button");l.type="button",l.className="theater-torrent-file";const c=document.createElement("span");c.className="theater-torrent-file-path",c.textContent=o.path;const d=document.createElement("span");if(d.className="theater-torrent-file-meta",d.textContent=this.formatBytes(o.bytes),!o.playable){const f=document.createElement("span");f.className="theater-kind-tag",f.textContent="may not play",d.append(" · ",f)}l.append(c,d),l.addEventListener("click",()=>{r.close(),this.sendTorrentPick(o)}),a.append(l)}r.open||r.showModal()}sendTorrentPick(e){const t=this.torrentPick;if(this.torrentPick=null,!t)return;const n={url:t.magnet,title:xv(t.name,e.path),torrentName:t.name,fileIndex:e.index,filePath:e.path,fileBytes:e.bytes};t.playNow?(this.net?.send?.(ge.THEATER_CHANNEL,n),this.setAddStatus(`Starting “${n.title}” on the screen…`)):(this.sendQueue({op:"add",...n}),this.setAddStatus(`“${n.title}” is on the reel — it starts for everyone.`))}torrentStatusText(e){const t=this.torrentStatuses.get(e);return!t||t.ready&&t.progress>=1?"":t.ready?`Downloading… ${Math.round(t.progress*100)}% · ${t.peers} peer${t.peers===1?"":"s"}`:t.peers>0||t.progress>0?`Fetching reels… ${Math.round(t.progress*100)}% · ${t.peers} peer${t.peers===1?"":"s"}`:"Reaching the swarm…"}applyTorrentStatus(e){const t=Array.isArray(e?.items)?e.items:[];if(t.length){const s=new Map;for(const r of t){const a=Mv(r);a&&s.set(a.infohash,a)}this.torrentStatuses=s}this.state?.now?.kind==="torrent"&&this.overlayState==="loading"&&this.renderCaption(),this.dom?.controlsDialog?.open&&this.renderControls()}formatBytes(e){const t=Number(e);if(!Number.isFinite(t)||t<=0)return"unknown size";const n=["B","KB","MB","GB","TB"];let s=t,r=0;for(;s>=1e3&&r<n.length-1;)s/=1e3,r+=1;return`${s>=100||r===0?Math.round(s):s.toFixed(1)} ${n[r]}`}renderControls(){if(!this.dom?.controlsDialog)return;const e=this.state?.now,t=this.state?.queue||[],n=this.dom.nowPanel;if(n.innerHTML="",e){const o=document.createElement("div");o.className="theater-now-head";const l=document.createElement("strong");l.className="theater-now-title",l.textContent=e.title||"Untitled";const c=document.createElement("span");c.className="theater-kind-tag",c.textContent=hd[e.kind]||e.kind||"media";const d=document.createElement("span");d.className=`theater-badge ${e.playing?"is-playing":"is-paused"}`,d.textContent=e.playing?"▶ PLAYING":"❚❚ PAUSED",o.append(l,c,d);const f=document.createElement("div");if(f.className="micro theater-now-by",f.textContent=`queued/changed by ${e.queuedBy||e.by||"Someone"}`,n.append(o,f),e.kind==="torrent"){const h=this.torrentStatusText(e.infohash);if(h){const u=document.createElement("div");u.className="micro theater-torrent-status",u.textContent=h,n.append(u)}}}else{const o=document.createElement("div");o.className="theater-empty",o.textContent="Nothing on the screen. Queue something below — it starts for everyone.",n.append(o)}const s=this.dom.queueList;if(s.innerHTML="",!t.length){const o=document.createElement("div");o.className="theater-empty",o.textContent="The queue is empty.",s.append(o)}for(const o of t){const l=document.createElement("div");l.className="theater-queue-row";const c=document.createElement("span");c.className="theater-queue-title",c.textContent=o.title||"Untitled";const d=document.createElement("span");d.className="theater-kind-tag",d.textContent=hd[o.kind]||o.kind||"media";const f=document.createElement("span");f.className="theater-queued-by",f.textContent=`· ${o.queuedBy||"Someone"}`;const h=document.createElement("button");h.type="button",h.textContent="Play now",h.addEventListener("click",()=>this.sendQueue({op:"playNow",itemId:o.id}));const u=document.createElement("button");u.type="button",u.textContent="Remove",u.addEventListener("click",()=>this.sendQueue({op:"remove",itemId:o.id})),l.append(c,d,f,h,u),s.append(l)}const r=!!e;this.dom.btnToggle.textContent=e?.playing?"Pause":"Resume",this.dom.btnToggle.disabled=!r,this.dom.btnSkip.disabled=!r;const a=r&&e.kind!=="hls";this.dom.btnBack.disabled=!a,this.dom.btnFwd.disabled=!a,this.dom.btnClear.disabled=!r&&!t.length,this.dom.volumeInput.value=String(Math.round(this.volume*100)),this.renderIptvSection()}getActiveListMeta(){const e=(this.sharedCatalog?.lists||[]).find(n=>n.id===this.activeListId);if(e)return{...e,shared:!0};const t=this.savedLists.find(n=>n.id===this.activeListId);return t?{...t,shared:!1}:null}getActiveList(){const e=this.getActiveListMeta();return e?e.shared?{id:e.id,name:e.name,addedBy:e.addedBy,shared:!0,channelCount:e.channelCount,channels:this.sharedChannels.get(e.id)||null}:e:null}loadSavedLists(){try{const e=JSON.parse(localStorage.getItem(pd)||"[]");return gd(e,Date.now())}catch{return[]}}saveSavedLists(){try{localStorage.setItem(pd,JSON.stringify(gd(this.savedLists,Date.now())))}catch{}}applyIptvState(e){const t=(Array.isArray(e?.lists)?e.lists:[]).filter(s=>s&&typeof s.id=="string").map(s=>({id:s.id,name:typeof s.name=="string"&&s.name?s.name:"Untitled list",addedBy:typeof s.addedBy=="string"&&s.addedBy?s.addedBy:"Someone",channelCount:Number(s.channelCount)||0})),n=e?.epg&&typeof e.epg=="object"?e.epg:null;this.sharedCatalog={lists:t,epg:n?{name:typeof n.name=="string"&&n.name?n.name:"Program guide",updatedAt:Number(n.updatedAt)||0,channelCount:Number(n.channels)||0,programmes:Number(n.programmes)||0}:null};for(const s of[...this.sharedChannels.keys()])t.some(r=>r.id===s)||this.sharedChannels.delete(s);this.activeListId&&!this.getActiveListMeta()&&(this.activeListId=t[0]?.id||this.savedLists[0]?.id||null,this.activeChannelIndex=-1),this.dom?.iptvSelect&&this.renderIptvSection(),this.dom?.guideDialog?.open&&this.renderGuide(),this.dom?.controlsDialog?.open&&this.renderControls()}applySharedList(e){const t=String(e?.listId||""),n=Cv(e?.channels,Ln.CHANNELS_MAX);if(!(!t||!n.length)){if(this.sharedChannels.set(t,n),this.pendingFlip&&t===this.activeListId){const s=this.pendingFlip;this.pendingFlip=0,this.flipChannel(s);return}this.dom?.guideDialog?.open&&this.guideListId===t&&this.renderGuide(),this.dom?.controlsDialog?.open&&this.renderIptvSection()}}requestSharedChannels(e){!e||this.sharedChannels.has(e)||(typeof this.net?.sendIptvListGet=="function"?this.net.sendIptvListGet(e):this.net?.send?.(ge.IPTV_LIST_GET,{listId:e}))}async uploadPlaylistText(e,t){if(!e||!e.trim()){this.setIptvStatus("Nothing to add — paste playlist text or choose a file first.",!0);return}if(!this.net?.uploadPlaylistText){this.setIptvStatus("Multiplayer is offline — the theater cannot store lists right now.",!0);return}if(e.length>Ln.LIST_TEXT_MAX){this.setIptvStatus(Rv("text_too_large"),!0);return}this.setIptvStatus("Adding to the theater library…");try{const n=await this.net.uploadPlaylistText(e,t,this.net.nickname);this.setIptvStatus(`"${n.list.name}" added to the theater library — ${n.list.channelCount} channels for everyone in the auditorium.`)}catch(n){this.setIptvStatus(n.message||"The theater could not accept that playlist.",!0)}}async importPlaylistFile(e){if(e)try{const t=new FileReader;t.onload=()=>{const n=e.name.replace(/\.(m3u8?|txt)$/i,"");this.uploadPlaylistText(String(t.result||""),n)},t.onerror=()=>this.setIptvStatus("Could not read that file.",!0),t.readAsText(e)}catch{this.setIptvStatus("Could not read that file.",!0)}}async importPlaylistUrl(){const e=(this.dom?.iptvUrl?.value||"").trim();if(!/^https?:\/\//i.test(e)){this.setIptvStatus("Enter an http(s) URL pointing at an .m3u / .m3u8 playlist.",!0);return}if(!this.net?.importPlaylistFromUrl){this.setIptvStatus("Multiplayer is offline — the theater cannot fetch lists right now.",!0);return}this.setIptvStatus("Fetching the playlist for the whole auditorium…");try{const t=await this.net.importPlaylistFromUrl(e,null,this.net.nickname);this.setIptvStatus(`"${t.list.name}" added to the theater library — ${t.list.channelCount} channels for everyone in the auditorium.`)}catch(t){this.setIptvStatus(t.message||"Could not fetch that playlist.",!0)}}async pushActivePersonalList(){const e=this.getActiveListMeta();if(!e||e.shared){this.setIptvStatus("Select one of your own lists to add it to the theater library.",!0);return}const t=Pv(e.channels);await this.uploadPlaylistText(t,e.name)}deleteActiveList(){const e=this.getActiveListMeta();if(!e){this.setIptvStatus("Select a list to remove.",!0);return}if(e.shared){typeof this.net?.sendIptvListRemove=="function"?this.net.sendIptvListRemove(e.id):this.net?.send?.(ge.IPTV_LIST_REMOVE,{listId:e.id}),this.setIptvStatus(`Removing "${e.name}" from the theater library…`);return}this.savedLists=this.savedLists.filter(t=>t.id!==e.id),this.saveSavedLists(),this.activeListId===e.id&&(this.activeListId=this.getActiveListMeta()?this.activeListId:this.sharedCatalog?.lists?.[0]?.id||this.savedLists[0]?.id||null,this.activeChannelIndex=-1),this.renderIptvSection(),this.setIptvStatus(`Deleted "${e.name}" from your saved lists.`)}renderIptvSection(){if(!this.dom?.iptvSelect)return;const e=this.dom.iptvSelect,t=this.sharedCatalog?.lists||[],n=this.savedLists;if(e.innerHTML="",!t.length&&!n.length){const a=document.createElement("option");a.value="",a.textContent="No channel lists yet — add one below",e.append(a),e.disabled=!0,this.activeListId=null}else{if(e.disabled=!1,t.length){const o=document.createElement("optgroup");o.label="Theater library — everyone can browse";for(const l of t){const c=document.createElement("option");c.value=l.id,c.textContent=`${l.name} (${l.channelCount})`,o.append(c)}e.append(o)}if(n.length){const o=document.createElement("optgroup");o.label="Your lists — private until added";for(const l of n){const c=document.createElement("option");c.value=l.id,c.textContent=`${l.name} (${l.channels.length})`,o.append(c)}e.append(o)}this.getActiveListMeta()||(this.activeListId=t[0]?.id||n[0].id,this.activeChannelIndex=-1),e.value=this.activeListId;const a=this.getActiveListMeta();a?.shared&&this.requestSharedChannels(a.id)}const s=this.getActiveList(),r=s?.channels?.[this.activeChannelIndex];this.dom.iptvCurrent.textContent=r?`Tuned: ${r.name}`:this.state?.now?`On screen: ${this.state.now.title}`:"No channel tuned",this.dom.iptvPush&&(this.dom.iptvPush.hidden=!(s&&!s.shared))}rememberChannelFor(e){if(!e)return;const t=this.getActiveList();if(!t?.channels)return;const n=t.channels.findIndex(s=>s.url===e);n!==-1&&(this.activeChannelIndex=n)}flipChannel(e){const t=this.getActiveList();if(!t||!t.channels||!t.channels.length){if(t?.shared){this.pendingFlip=e,this.requestSharedChannels(t.id),this.setIptvStatus("Fetching the theater channel list…");return}this.setIptvStatus("No channel list available — add a playlist to the theater library (paste text, file, or URL) to start flipping.",!0),this.openControls();return}const n=t.channels.length;let s=this.activeChannelIndex;s<0||s>=n?s=e>0?0:n-1:s=(s+e+n)%n,this.tuneChannel(t,s)}tuneChannel(e,t){const n=e?.channels?.[t];n&&(this.activeListId=e.id,this.activeChannelIndex=t,this.sendChannel(n.url,n.name),this.renderIptvSection(),this.dom?.guideDialog?.open&&this.renderGuide())}channelKey(e){return(e?.tvgId||e?.name||"").trim()}formatGuideTime(e){if(!Number.isFinite(e))return"";try{return new Date(e).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}catch{return""}}scheduleTextFor(e){const t=this.epgSchedule.get(this.channelKey(e));if(!t)return null;const n=[];return t.now&&n.push(`Now ${this.formatGuideTime(t.now.start)}–${this.formatGuideTime(t.now.stop)} · ${t.now.title}`),t.next&&n.push(`Next ${this.formatGuideTime(t.next.start)} · ${t.next.title}`),n.join("   ·   ")||null}requestEpgSchedule(){if(!this.dom?.guideDialog?.open||!this.sharedCatalog?.epg)return;const e=this.getActiveList();if(!e?.channels)return;const t=[],n=new Set;for(const s of e.channels){if(!md(s,this.guideCountry,this.guideCategory))continue;const r=this.channelKey(s);if(!(!r||n.has(r))&&(n.add(r),t.push(r),t.length>=Ln.EPG_LOOKUP_MAX))break}t.length&&(typeof this.net?.sendEpgLookup=="function"?this.net.sendEpgLookup(t):this.net?.send?.(ge.EPG_LOOKUP,{keys:t}))}startEpgRefresh(){this.stopEpgRefresh(),this.epgTimer=setInterval(()=>{if(!this.dom?.guideDialog?.open){this.stopEpgRefresh();return}this.requestEpgSchedule()},Ov)}stopEpgRefresh(){this.epgTimer&&(clearInterval(this.epgTimer),this.epgTimer=null)}applyEpgSchedule(e){const t=Array.isArray(e?.entries)?e.entries:[];for(const n of t)typeof n?.key=="string"&&this.epgSchedule.set(n.key,{now:n.now||null,next:n.next||null});!this.dom?.guideDialog?.open||!t.length||this.dom.guideList.querySelectorAll("[data-epg-key]").forEach(n=>{const s=this.channelByKey?.get(n.dataset.epgKey),r=s?this.scheduleTextFor(s):null;r!==null&&(n.textContent=r)})}renderGuide(){if(!this.dom?.guideDialog)return;const e=this.getActiveListMeta(),t=this.getActiveList();this.guideListId!==(e?.id||null)&&(this.guideListId=e?.id||null,this.guideCountry="All",this.guideCategory="All"),this.dom.guideTitle.textContent=e?`${e.name}${e.shared?" · theater library":" · your list"}`:"Channel Guide";const n=this.sharedCatalog?.epg;this.dom.guideEpg.textContent=n?`Program guide: ${n.name} — ${n.channelCount} channels with listings${e?.shared?"":" (matching may be limited on private lists)"}`:"No program guide uploaded — rows show channels only.",e?.shared&&!t?.channels&&this.requestSharedChannels(e.id);const s=t?.channels||[],r=Hv(s),a=r.countries.length>0;if(this.dom.guideCountryRow.hidden=!a,this.dom.guideGroups.hidden=!0,t?.channels&&a){r.countries.includes(this.guideCountry)||(this.guideCountry="All");const d=this.dom.guideCountrySelect;d.innerHTML="";for(const u of["All countries",...r.countries]){const g=document.createElement("option");g.value=u==="All countries"?"All":u,g.textContent=u,d.append(g)}d.value=this.guideCountry;const f=r.categoriesFor(this.guideCountry);f.includes(this.guideCategory)||(this.guideCategory="All");const h=this.dom.guideGroups;if(h.innerHTML="",f.length){h.hidden=!1;for(const u of["All categories",...f]){const g=u==="All categories"?"All":u,_=document.createElement("button");_.type="button",_.className=`theater-chip ${g===this.guideCategory?"active":""}`,_.textContent=u,_.addEventListener("click",()=>{this.guideCategory=g,this.renderGuide(),this.requestEpgSchedule()}),h.append(_)}}this.guideCountry!=="All"||this.guideCategory}const o=this.dom.guideList;if(o.innerHTML="",this.channelByKey=new Map,!e){this.dom.guideCount.textContent="No list loaded";const d=document.createElement("div");d.className="theater-empty",d.textContent="The theater has no channel lists yet — open the Screen controls and add a playlist (paste text, upload a file, or fetch a URL). Everyone here will be able to browse it.",o.append(d);return}if(!t?.channels){this.dom.guideCount.textContent="Fetching the theater channel list…";const d=document.createElement("div");d.className="theater-empty",d.textContent="Fetching the theater channel list…",o.append(d);return}let l=0;if(t.channels.forEach((d,f)=>{if(!md(d,this.guideCountry,this.guideCategory))return;l+=1;const h=this.channelKey(d);this.channelByKey.set(h,d);const u=document.createElement("div");if(u.className=`theater-channel-row ${f===this.activeChannelIndex?"current":""}`,d.logo&&/^https?:\/\//i.test(d.logo)){const _=document.createElement("img");_.src=d.logo,_.alt="",_.loading="lazy",_.addEventListener("error",()=>{_.hidden=!0}),u.append(_)}const g=document.createElement("span");if(g.className="theater-channel-name",g.textContent=d.name||"Channel",u.append(g),d.group){const _=document.createElement("span");_.className="theater-group-tag",_.textContent=d.group,u.append(_)}if(this.sharedCatalog?.epg){const _=document.createElement("span");_.className="theater-channel-epg",_.dataset.epgKey=h,_.textContent=this.scheduleTextFor(d)||"",u.append(_)}u.addEventListener("click",()=>{this.tuneChannel(t,f),this.dom.guideDialog.close()}),o.append(u)}),!l){const d=document.createElement("div");d.className="theater-empty",d.textContent="No channels match this country and category.",o.append(d)}const c=e.shared?"theater library":"your lists";this.dom.guideCount.textContent=`${t.channels.length} channels · showing ${l}${this.state?.now?` · on screen: ${this.state.now.title}`:""} · ${c}`,this.requestEpgSchedule()}}const Yn=3,Wv=4,Xv=6,qv=-.9,$v=.7,Yv=[Math.PI/4,0,-Math.PI/4];function Kv(i){return(i+1)%Wv}function Zv(i){return Math.min($v,Math.max(qv,i))}function jv(i,e,t,n){if(i===Yn){const r=Math.sin(e),a=Math.cos(e),o=-r,l=-a,c=a,d=-r;return{x:c*t+o*-n,z:d*t+l*-n}}const s=Yv[i]??0;return{x:t*Math.cos(s)+n*Math.sin(s),z:-t*Math.sin(s)+n*Math.cos(s)}}function Jv(i,e,t,n,s){return s||Math.hypot(t-i,n-e)>Xv}const pe=i=>document.getElementById(i),Ct=new sf;Ct.background=new Fe("#222d2a");Ct.fog=new bl("#54645d",.018);const Ht=new r_({canvas:pe("world"),antialias:!0});Ht.setPixelRatio(Math.min(devicePixelRatio,1.5));Ht.setSize(innerWidth,innerHeight);Ht.shadowMap.enabled=!0;Ht.shadowMap.type=Ed;Ht.toneMapping=Td;Ht.toneMappingExposure=1.15;const pn=new pa,Qv=1.55,ey=1.05,ty=.005,ny=.004,js=new nn(58,1,.1,150);let Js=pn,Dn=0,Qs=0,la=0,os=24;const ga=new h_(Ht),Fl=new u_(Ct,pn);ga.addPass(Fl);const iy=new _s(new Ae(innerWidth,innerHeight),.25,.65,1.05);ga.addPass(iy);Ct.add(new gf("#c5d9d4","#343a2b",2.2));const Fn=new yf("#ffe0a5",3);Fn.position.set(-14,24,7);Fn.castShadow=!0;Fn.shadow.mapSize.set(2048,2048);Object.assign(Fn.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:80});Fn.shadow.normalBias=.035;Fn.shadow.bias=-1e-4;Ct.add(Fn);const wn=new re(new sr(.25,.29,32),new xs({color:"#e0d49b",transparent:!0,opacity:.8,side:sn}));wn.rotation.x=-Math.PI/2;wn.visible=!1;Ct.add(wn);const hh=120,uh=new Ft,ea=new Float32Array(hh*3);for(let i=0;i<hh;i++)ea[i*3]=(Math.random()-.5)*26,ea[i*3+1]=Math.random()*6+.3,ea[i*3+2]=(Math.random()-.5)*24;uh.setAttribute("position",new an(ea,3));const Ol=new uf(uh,new qd({color:"#e3d7a7",size:.035,transparent:!0,opacity:.5}));Ct.add(Ol);const qe=new __,Ss=new b_(Ct);let di="hands",hs=0;const er=ll.map(i=>i.id),xt=new ov(qe,{onSelectTool:(i,e)=>{kl(i),e&&(hs=er.indexOf(e),pe("active-seed-label").textContent=_n[e]?.name||e)}}),fh=new hv(qe,{onFocusChange:i=>{i&&(Ut.clear(),fi())}}),St=new Gv(qe);St.onStandUpRequest=()=>Ui();const Ve=ih(qe.guestId,qe.nickname);Ve.position.set(0,0,3);Ct.add(Ve);const wt=T_();wt.position.set(.8,0,4);Ct.add(wt);const cl="afterlight-save";function sy(){try{const i=localStorage.getItem(cl),e=i?JSON.parse(i):{};return ld(e.exploration)}catch{return ld({})}}function ph(i){try{const e=localStorage.getItem(cl),t=e?JSON.parse(e):{};t.exploration=i,localStorage.setItem(cl,JSON.stringify(t))}catch{}}let bn=sy();const tr=A_(),nr=U_();Ct.add(tr.group);Ct.add(nr.group);const zs=new Map,zr={market:"M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24",garden:"M24 24H130V96H24Z M38 36H116V84H38Z M65 24V96",court:"M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24",canal:"M24 24H130V96H24Z M24 60H130 M70 24V96 M84 24V96",station:"M24 24H130V96H24Z M24 40H130 M24 75H130 M65 40V75",aqueduct:"M24 24H130V96H24Z M24 35H130 M45 24V96 M80 24V96 M105 24V96",caldera:"M24 24H130V96H24Z M50 35H100V80H50Z M75 35V80 M24 60H50 M100 60H130",understory:"M24 24H130V96H24Z M35 40H65V75H35Z M90 40H120V75H90Z M65 60H90",saltworks:"M24 24H130V96H24Z M35 30H115V55H35Z M35 65H115V90H35Z M75 24V96",rooftops:"M24 24H130V96H24Z M40 45H110 M75 24V96 M40 30L75 60L110 30 M40 90L75 60L110 90",mangrove:"M24 24H130V96H24Z M24 50Q75 20 130 50 M24 70Q75 100 130 70 M75 35V85",trestle:"M24 24H130V96H24Z M24 35H130 M24 85H130 M35 35L55 85 M55 35L75 85 M75 35L95 85 M95 35L115 85",foundry:"M24 24H130V96H24Z M40 35H70V65H40Z M85 35H115V65H85Z M24 75H130","frost-spire":"M24 24H130V96H24Z M75 25L115 60L75 95L35 60Z M75 25V95 M35 60H115",delta:"M24 24H130V96H24Z M24 45C55 40 85 75 130 55 M24 75C60 70 90 90 130 85 M70 24V96",archives:"M24 24H130V96H24Z M35 35H115 M35 50H115 M35 65H115 M35 80H115 M75 24V96","kiln-terrace":"M24 24H130V96H24Z M45 35H105V85H45Z M75 45A15 15 0 1 0 75 75A15 15 0 1 0 75 45 M24 60H45 M105 60H130",theater:"M24 24H130V96H24Z M42 34H112 M42 38H112 M34 52H62 M70 52H120 M34 68H62 M70 68H120 M34 84H120"};function ry(i){if(zs.has(i))return zs.get(i);const e=Xt.find(h=>h.id===i);if(!e)return null;const t=bn.completed.includes(i),n=tv(e,t),s=Xt.findIndex(h=>h.id===i),r=Xt[(s-1+Xt.length)%Xt.length],a=Xt[(s+1)%Xt.length];n.items.push({type:"district_gate",x:-10.7,z:0,targetDistrict:r.id,title:`Gate to ${r.name}`,sub:`Westbound: ${r.district}`}),n.items.push({type:"district_gate",x:10.7,z:0,targetDistrict:a.id,title:`Gate to ${a.name}`,sub:`Eastbound: ${a.district}`}),n.items.push({type:"market_gate",x:0,z:8.8,targetDistrict:"market",title:"Return to Market Court",sub:"Trade produce & visit your garden"});const o=new Zt(1,1,1),l=new Je({color:"#c5b478",emissive:"#857545",emissiveIntensity:.6}),c=new Je({color:"#2b3d3e",roughness:.6});for(const h of[-10.7,10.7]){const u=new re(o,c);u.position.set(h,2.5,0),u.scale.set(.6,5,2.4),n.group.add(u);const g=new re(o,l);g.position.set(h,1.8,0),g.scale.set(.1,3.4,1.8),n.group.add(g)}const d=new re(o,c);d.position.set(0,2.5,8.8),d.scale.set(2.4,5,.6),n.group.add(d);const f=new re(o,l);return f.position.set(0,1.8,8.8),f.scale.set(1.8,3.4,.1),n.group.add(f),Ct.add(n.group),zs.set(i,n),dl.has(i)&&n.setNodeStates?.(dl.get(i)),n}let st=null,mn=null,vt=null,_a=null,on=!1,$n=0,_d=null;const Ut=new Set,ay=2.8,vd=5,bi=x_();let Vs=!1;function fi(){_a?.close(),ar(Ve),nh(bi),Vs=!1}const yd=new Sf,oy=new li(new D(0,1,0),0),fo=new D;function Nt(i,e,t="FIELD NOTE"){const n=pe("toast-title"),s=pe("toast-body"),r=pe("toast-type"),a=pe("toast");n&&(n.textContent=i),s&&(s.textContent=e),r&&(r.textContent=t),a&&(a.style.opacity="1"),clearTimeout(_d),_d=setTimeout(()=>{a&&(a.style.opacity="0")},5e3)}let At=qt.MARKET,tn=tr,Qn=jr("market"),ca=null;const dl=new Map;let Ci={mill:{status:"broken",required:{...ah},contributed:{copper:0,timber:0,glass:0},restoredAt:null}};function Ii(i){Ui(),At=i;const e=qt.isGarden(i),t=i===qt.MARKET,n=Xt.find(s=>s.id===i);if(tr.group.visible=t,nr.group.visible=e,zs.forEach((s,r)=>{s.group.visible=r===i}),n){tn=ry(i),Qn=jr(i),bn.visited.includes(i)||bn.visited.push(i),bn.current=i,ph(bn),Ct.fog.color.set(n.color),Ct.background.set(n.color).multiplyScalar(.45),Fn.color.set(n.sun);const r=n.spawn||[-9,0];Ve.position.set(r[0],0,r[1]),wt.position.set(r[0]+.8,0,r[1]+1),pe("location-title").textContent=n.name,pe("district-tag").textContent=n.district,pe("map-label").textContent="• "+n.subtitle,pe("map-path").setAttribute("d",zr[i]||zr.court),Nt(n.name,n.description,"ARRIVED IN DISTRICT")}else e?(tn=nr,Qn=jr(i),Ve.position.set(-9.5,0,0),wt.position.set(-8.7,0,1),Ct.fog.color.set("#54645d"),Ct.background.set("#222d2a"),Fn.color.set("#ffe0a5"),pe("location-title").textContent="Your Market Garden",pe("district-tag").textContent="CULTIVATION DISTRICT / 02",pe("map-label").textContent="• MARKET GARDEN 02",pe("map-path").setAttribute("d",zr.garden),Nt("Your Garden Plot","Tend your garden beds and harvest fresh crops.")):(tn=tr,Qn=jr("market"),Ve.position.set(0,0,3),wt.position.set(.8,0,4),Ct.fog.color.set("#54645d"),Ct.background.set("#222d2a"),Fn.color.set("#ffe0a5"),pe("location-title").textContent="The Market Court",pe("district-tag").textContent="MARKET SOCIAL DISTRICT / 01",pe("map-label").textContent="• MARKET COURT 01",pe("map-path").setAttribute("d",zr.market),Nt("The Market Court","Trade produce, buy seeds, and fulfill contracts."));mn=null,wn.visible=!1,fi(),Ss.clear(),St.setWatchMode(!1),qe.joinRoom(i),St.setRoomActive(i===qt.THEATER),i===qt.THEATER&&St.setWatchMode(!0)}const po=new URLSearchParams(window.location.search).get("room");let hl=qt.THEATER;po==="garden"?hl=qt.gardenFor(qe.guestId):po&&(hl=po);Ii(hl);qe.on(ge.WELCOME,i=>{pe("net-indicator").textContent="● ONLINE",pe("net-indicator").style.color="#85e0a3",i.player&&(xt.updatePlayerHUD(i.player),Ve.userData.updateNickname(i.player.nickname)),i.weather&&_h(i.weather),i.prices&&xt.updateMarketView(i.prices),i.orderBook&&xt.updateMarketView(null,i.orderBook),i.contracts&&xt.updateContractsView(i.contracts),i.theater&&St.applyState(i.theater,i.serverNow||Date.now())});qe.on(ge.PRESENCE_JOIN,i=>{i.player&&i.player.id!==qe.guestId&&(Ss.setPlayer(i.player),Nt("Gardener Arrived",`${i.player.nickname} entered the area.`))});qe.on(ge.PRESENCE_LEAVE,i=>{i.playerId&&Ss.removePlayer(i.playerId)});qe.on(ge.PRESENCE_UPDATE,i=>{if(Array.isArray(i.players))for(const e of i.players)e.id!==qe.guestId&&Ss.setPlayer(e)});qe.on(ge.GARDEN_STATE,i=>{ca=i.beds,nr.setFixtures?.(i.fixtures||[]),nr.update(0,i.beds)});qe.on(ge.INVENTORY_STATE,i=>{i.player&&(xt.updatePlayerHUD(i.player),xt.updateInventoryView(i.player),xt.updateMarketView(),xt.updateMachineShopView())});qe.on(ge.MARKET_UPDATE,i=>{i.prices&&xt.updateMarketView(i.prices),i.orderBook&&xt.updateMarketView(null,i.orderBook)});qe.on(ge.CONTRACT_UPDATE,i=>{i.contracts&&xt.updateContractsView(i.contracts)});qe.on(ge.NODE_STATE,i=>{!i.roomId||!Array.isArray(i.nodes)||(dl.set(i.roomId,i.nodes),zs.get(i.roomId)?.setNodeStates?.(i.nodes))});qe.on(ge.THEATER_STATE,i=>{i.theater&&St.applyState(i.theater,i.serverNow||Date.now())});qe.on(ge.MACHINE_UPDATE,i=>{if(!i.machines?.mill)return;const e=Ci?.mill?.status;Ci=i.machines,xt.updateMachineShopView(Ci),tr.setMachineState?.(Ci),gh(),e==="broken"&&Ci.mill.status==="restored"&&(Bl([523,659,784,1046]),Nt("The Great Mill Restored","The sails turn above the court. Wheat becomes flour for everyone.","RESTORATION COMPLETE"))});qe.on(ge.TRADE_FILLED,i=>{const e=i.trade;Bl([523,659,784]),Nt("Order Filled!",`Traded ${e.quantity}x ${e.cropId} @ ${e.price} ⛁`)});qe.on(ge.WEATHER_UPDATE,i=>{_h(i.weather)});qe.on(ge.ACTION_RESULT,i=>{i.success?(Bl([440,554]),Nt(i.title||"Garden",i.message)):i.message&&Nt(i.title||"Notice",i.message)});let mh=null;function gh(){const i=pe("mill-panel");if(!i)return;const e=At===qt.MARKET;if(i.style.display=e?"block":"none",mh=At,!e)return;const t=Ci?.mill,n=pe("mill-status-tag"),s=pe("mill-progress-lines");if(!t)return;if(t.status==="restored"){n.textContent="RESTORED",n.className="mill-tag restored",s.innerHTML='<div class="mill-line">✦ The sails are turning. It grinds wheat into flour for everyone.</div>';return}n.textContent="BROKEN",n.className="mill-tag broken";let r=0,a=0,o="";for(const[l,c]of Object.entries(t.required||{})){const d=Math.min(t.contributed?.[l]||0,c);r+=d,a+=c,o+=`<div class="mill-line"><span>${l}</span><b>${d}/${c}</b></div>`}o=`<div class="mill-line mill-total"><span>restoration</span><b>${r}/${a}</b></div>`+o,s.innerHTML=o}qe.on(ge.EMOTE_BROADCAST,i=>{i.playerId===qe.guestId||!Md(i.emote)||sh(Ss.players.get(i.playerId)?.avatar,i.emote)});qe.on(ge.WELCOME,()=>fh.setConnected(!0));function _h(i){const e=i==="rain"?"☔":i==="drizzle"?"☂":"☼",t=i==="rain"?"HEAVY RAIN":i==="drizzle"?"RAINY MIST":"CLEAR AFTER RAIN";pe("weather-icon").textContent=e,pe("weather-text").textContent=t,Ct.fog.density=i==="rain"?.026:i==="drizzle"?.022:.016}qe.connect();let et=null,ls=!0,ei=.7,Li=null,da=null,Vr=0,mo=1;const vh="afterlight-footsteps";try{const i=localStorage.getItem(vh);if(i!==null&&i!==""){const e=Number(i);Number.isFinite(e)&&e>=0&&e<=100&&(ei=e/100)}}catch{}function ly(){try{localStorage.setItem(vh,String(Math.round(ei*100)))}catch{}}function Bl(i=[440,554,660]){!et||ls||i.forEach((e,t)=>{const n=et.createOscillator(),s=et.createGain();n.type="sine",n.frequency.value=e,s.gain.setValueAtTime(0,et.currentTime+t*.08),s.gain.linearRampToValueAtTime(.04,et.currentTime+.02+t*.08),s.gain.exponentialRampToValueAtTime(.001,et.currentTime+.8+t*.08),n.connect(s).connect(et.destination),n.start(et.currentTime+t*.08),n.stop(et.currentTime+.9+t*.08)})}function cy(){if(!et||ls||ei<=0||!da)return;const i=et.createBufferSource();i.buffer=da,i.playbackRate.value=.85+Math.random()*.35;const e=et.createBiquadFilter();e.type="lowpass",e.frequency.value=380+Math.random()*220;const t=et.createGain(),n=et.currentTime;if(t.gain.setValueAtTime(1e-4,n),t.gain.exponentialRampToValueAtTime(.5+Math.random()*.2,n+.012),t.gain.exponentialRampToValueAtTime(1e-4,n+.09),i.connect(e).connect(t),et.createStereoPanner){const s=et.createStereoPanner();s.pan.value=.22*mo,mo=-mo,t.connect(s).connect(Li)}else t.connect(Li);i.start(n),i.stop(n+.1)}pe("sound").onclick=async()=>{if(ls=!ls,!et){et=new AudioContext,Li=et.createGain(),Li.gain.value=ei,Li.connect(et.destination),da=et.createBuffer(1,Math.floor(et.sampleRate*.09),et.sampleRate);const i=da.getChannelData(0);for(let r=0;r<i.length;r++)i[r]=(Math.random()*2-1)*Math.pow(1-r/i.length,2);const e=et.createBuffer(1,et.sampleRate*2,et.sampleRate),t=e.getChannelData(0);for(let r=0;r<t.length;r++)t[r]=(Math.random()*2-1)*.04;const n=et.createBufferSource();n.buffer=e,n.loop=!0;const s=et.createBiquadFilter();s.type="lowpass",s.frequency.value=320,n.connect(s).connect(et.destination),n.start()}await(ls?et.suspend():et.resume()),pe("sound").textContent=ls?"♫  Sound off":"♫  Sound on"};pe("footsteps").value=String(Math.round(ei*100));pe("footsteps-value").textContent=`${Math.round(ei*100)}%`;pe("footsteps").oninput=()=>{ei=Number(pe("footsteps").value)/100,pe("footsteps-value").textContent=`${Math.round(ei*100)}%`,Li&&(Li.gain.value=ei),ly()};function kl(i){di=i,document.querySelectorAll(".tool-btn").forEach(t=>{t.classList.toggle("active",t.dataset.tool===i)}),Ve.userData.setWateringCan(i==="water");const e={hands:"Tool: Hands & Inspect · Read crop stats",hoe:"Tool: Hoe · Till uncultivated beds",seed:`Tool: Seeds (${_n[er[hs]].name}) · Plant in tilled beds`,water:"Tool: Watering Can · Replenish soil moisture",harvest:"Tool: Harvest Shears · Collect mature produce",sprinkler:"Tool: Sprinkler Kit · Press E on a bed to place (waters it + neighbors)"};pe("hud-tool-hint").textContent=e[i]||i}document.querySelectorAll(".tool-btn").forEach(i=>{i.onclick=()=>{const e=i.dataset.tool;e==="seed"&&di==="seed"&&(hs=(hs+1)%er.length,pe("active-seed-label").textContent=_n[er[hs]].name),kl(e)}});function dy(i){vt||(vt={x:i.x,z:i.z-.08,standZ:i.z-.8,rotY:Math.PI},document.activeElement?.id==="chat-input"&&document.activeElement.blur(),Ve.position.set(vt.x,0,vt.z),Ve.rotation.y=vt.rotY,Dn===Yn&&(Qs=vt.rotY+Math.PI),Ve.userData.legs.forEach(e=>{e.rotation.x=-1.35}),mn=null,wn.visible=!1,fi(),qe.sendMovement(Ve.position.x,Ve.position.z,Ve.rotation.y,!1,!0),Nt("Take a Seat","You settle into the velvet. Press E or a movement key to stand.","THE ORPHEUM"),St.setSeated(!0),St.setWatchMode(!0))}function Ui(){vt&&(Ve.position.set(vt.x,0,vt.standZ),vt=null,fi(),Ve.userData.legs.forEach(i=>{i.rotation.x=0}),qe.sendMovement(Ve.position.x,Ve.position.z,Ve.rotation.y,!1,!1),St.setSeated(!1),St.setWatchMode(!1))}function yh(){if(!on){if(vt){Ui();return}if(!st){Nt("No Target Nearby","Approach a garden bed, market stall, or gateway to interact.");return}if(st.type==="garden_gate"){Ii(qt.gardenFor(qe.guestId));return}if(st.type==="market_gate"){Ii(qt.MARKET);return}if(st.type==="district_gate"){Ii(st.targetDistrict);return}if(st.type==="landmark"){const i=Xt.find(e=>e.id===At);i&&(bn.completed.includes(At)?Nt(i.done,"This sector has already been restored.","RESTORATION ACTIVE"):(bn.completed.push(At),ph(bn),tn.update?.($n,!0),Nt(i.done,i.message,"RESTORATION COMPLETE")));return}if(st.type==="field-note"){Nt(st.sub,st.body,"FIELD NOTE");return}if(st.type==="seat"){dy(st);return}if(st.type==="theater_screen"){St.openControls();return}if(st.type==="market_board"){xt.openMarket();return}if(st.type==="seed_vendor"){xt.openSeedVendor();return}if(st.type==="contracts_board"){xt.openContracts();return}if(st.type==="material_node"){qe.send(ge.NODE_HARVEST,{actionId:`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,nodeId:st.nodeId});return}if(st.type==="mill"){Ci?.mill?.status==="restored"?qe.send(ge.MACHINE_MILL,{actionId:`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,quantity:1}):xt.openMachineShop();return}if(st.type==="machine_bench"){xt.openMachineShop();return}if(st.type==="bed"){const i=st.bedIndex,e=ca?ca[i]:null;if(di==="hoe"){qe.sendGardenAction("till",i);return}if(di==="seed"){const t=er[hs];qe.sendGardenAction("plant",i,t);return}if(di==="water"){qe.sendGardenAction("water",i);return}if(di==="harvest"){qe.sendGardenAction("harvest",i);return}if(di==="sprinkler"){qe.sendGardenAction("place_sprinkler",i);return}if(!e||e.stage===qn.EMPTY)Nt(`Bed #${i+1}`,"Unprepared soil. Select your Hoe (2) to till.");else if(e.stage===qn.PREPARED)Nt(`Bed #${i+1}`,"Prepared soil. Select Seeds (3) to sow.");else{const t=_n[e.cropId],n=["Empty","Prepared","Seed","Sprout","Juvenile","Mature","Harvestable"];Nt(`${t?.name||"Crop"} (Bed #${i+1})`,`Stage: ${n[e.stage]||"Growing"} · Moisture: ${Math.round((e.moisture||0)*100)}% · Health: ${Math.round((e.health||1)*100)}%`)}}}}pe("interact").onclick=yh;pe("btn-inventory").onclick=()=>xt.openInventory();pe("btn-market").onclick=()=>xt.openMarket();function xh(){on=!0,Ut.clear(),fi(),hy(),pe("district-dialog").showModal()}function Gs(){on=!1,pe("district-dialog").close()}function hy(){const i=pe("district-list");i.innerHTML="";const e=document.createElement("button");e.className="district-choice"+(At==="market"?" active":""),e.innerHTML=`
    <div>
      <span class="micro">SOCIAL TRADING HUB</span>
      <strong>The Market Court</strong>
    </div>
    <span class="desc">Exchange harvests, buy seeds, and fulfill town contracts.</span>
    <span class="status-badge ${At==="market"?"current":"visited"}">${At==="market"?"CURRENT":"CIVIC HUB"}</span>
  `,e.onclick=()=>{Gs(),Ii("market")},i.appendChild(e);const t=qt.gardenFor(qe.guestId),n=document.createElement("button");n.className="district-choice"+(At===t?" active":""),n.innerHTML=`
    <div>
      <span class="micro">CULTIVATION PLOT</span>
      <strong>Your Market Garden</strong>
    </div>
    <span class="desc">Till soil, sow crops, water, and harvest fresh produce.</span>
    <span class="status-badge ${At===t?"current":"visited"}">${At===t?"CURRENT":"PERSONAL PLOT"}</span>
  `,n.onclick=()=>{Gs(),Ii(t)},i.appendChild(n),Xt.forEach(s=>{const r=At===s.id,a=bn.completed.includes(s.id),o=bn.visited.includes(s.id),l=document.createElement("button");l.className="district-choice"+(r?" active":"");let c="unexplored",d="UNEXPLORED";r?(c="current",d="CURRENT"):a?(c="restored",d="✦ RESTORED"):o&&(c="visited",d="VISITED"),l.innerHTML=`
      <div>
        <span class="micro">${s.district}</span>
        <strong>${s.name}</strong>
      </div>
      <span class="desc">${s.description}</span>
      <span class="status-badge ${c}">${d}</span>
    `,l.onclick=()=>{Gs(),Ii(s.id)},i.appendChild(l)})}pe("btn-travel").onclick=xh;pe("close-districts").onclick=Gs;pe("district-dialog").addEventListener("cancel",i=>{i.preventDefault(),Gs()});_a=Rh({canOpen:()=>!on&&!document.querySelector("dialog[open]"),onOpen:()=>{Ut.clear(),fi(),mn=null,wn.visible=!1,Wt=null,St.setWatchMode(!1)},onChoose:i=>{sh(Ve,i),qe.sendEmote(i),Nt(rs.find(e=>e.id===i).label,"Move to finish your emote.","EMOTE")}});pe("btn-emote").onclick=()=>_a.open();pe("btn-edit-nick").onclick=()=>xt.openProfile();function va(){on=!on,Ut.clear(),fi(),on?pe("settings-dialog").showModal():pe("settings-dialog").close()}pe("settings").onclick=va;pe("resume").onclick=va;pe("settings-dialog").addEventListener("cancel",i=>{i.preventDefault(),va()});function uy(i){Dn=i,Js=i===Yn?js:pn,Fl.camera=Js,i===Yn&&(Qs=Ve.rotation.y+Math.PI,la=0),Ve.visible=i!==Yn,Ht.domElement.style.cursor=i===Yn?"grab":""}pe("camera").onclick=()=>uy(Kv(Dn));pe("quality").onchange=()=>{Ht.setPixelRatio(Math.min(devicePixelRatio,Number(pe("quality").value))),ya()};pe("atmosphere").onchange=()=>{Ol.visible=pe("atmosphere").checked};window.addEventListener("keydown",i=>{if(!(i.target.closest('input,select,textarea,[contenteditable="true"]')&&i.code!=="Escape")){if(vt&&["KeyE","KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(i.code)){if(Ui(),i.code!=="KeyE"){i.preventDefault();return}return}if(i.code==="KeyT"){xh();return}if((i.code==="Enter"||i.code==="Slash")&&!document.querySelector("dialog[open]")){i.preventDefault(),fh.focusInput(i.code==="Slash"?"/":"");return}if(["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6"].includes(i.code)){kl({Digit1:"hands",Digit2:"hoe",Digit3:"seed",Digit4:"water",Digit5:"harvest",Digit6:"sprinkler"}[i.code]);return}["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(i.code)&&i.preventDefault(),Ut.add(i.code),!i.repeat&&(i.code==="Space"&&!on&&!vt&&(Vs=!0),i.code==="KeyE"&&yh(),i.code==="KeyI"&&xt.openInventory(),i.code==="KeyM"&&xt.openMarket(),i.code==="KeyG"&&At===qt.THEATER&&!document.querySelector("dialog[open]")&&(i.preventDefault(),St.openControls()),i.code==="KeyC"&&pe("camera").click(),i.code==="Escape"&&(vt?Ui():on||(St.isWatching()?St.setWatchMode(!1):va())))}});window.addEventListener("keyup",i=>Ut.delete(i.code));window.addEventListener("blur",()=>{Ut.clear(),fi()});let Wt=null;Ht.domElement.addEventListener("pointerdown",i=>{on||_a?.isOpen||(Wt={x:i.clientX,y:i.clientY,lastX:i.clientX,lastY:i.clientY,dragging:!1},Ht.domElement.setPointerCapture(i.pointerId))});Ht.domElement.addEventListener("pointermove",i=>{if(!Wt||on)return;const e=i.clientX-Wt.lastX,t=i.clientY-Wt.lastY;Wt.lastX=i.clientX,Wt.lastY=i.clientY,Wt.dragging=Jv(Wt.x,Wt.y,i.clientX,i.clientY,Wt.dragging),Wt.dragging&&Dn===Yn&&(Qs-=e*ty,la=Zv(la-t*ny))});function fy(i){const e=Wt;if(Wt=null,!(!e||on||e.dragging)&&(vt?Ui():St.isWatching()&&St.setWatchMode(!1),yd.setFromCamera(new Ae(i.clientX/innerWidth*2-1,-(i.clientY/innerHeight)*2+1),Js),yd.ray.intersectPlane(oy,fo))){const t=nv(Qn,fo.x,fo.z);mn=new D(t.x,0,t.z),wn.position.set(mn.x,.24,mn.z),wn.visible=!0}}Ht.domElement.addEventListener("pointerup",fy);Ht.domElement.addEventListener("pointercancel",()=>{Wt=null});Ht.domElement.addEventListener("wheel",i=>{i.preventDefault(),Dn!==Yn&&(os=Iu.clamp(os+i.deltaY*.015,18,34),ya())},{passive:!1});function py(i,e,t,n){const s=i.position.x,r=i.position.z;oa(Qn,tn.obstacles,s+e,r)&&(i.position.x+=e),oa(Qn,tn.obstacles,i.position.x,r+t)&&(i.position.z+=t);const a=Math.hypot(i.position.x-s,i.position.z-r)>1e-4;return a?(i.rotation.y=Math.atan2(e,t),i.position.y=Math.sin($n*13)*.025,i.userData.legs.forEach((o,l)=>{o.rotation.x=Math.sin($n*13+l*Math.PI)*.45})):(i.position.y=0,i.userData.legs.forEach(o=>{o.rotation.x*=.8})),a}function ya(){const i=innerWidth/innerHeight;pn.left=-os*i/2,pn.right=os*i/2,pn.top=os/2,pn.bottom=-os/2,pn.near=.1,pn.far=150,pn.updateProjectionMatrix(),js.aspect=i,js.updateProjectionMatrix(),Ht.setSize(innerWidth,innerHeight),ga.setSize(innerWidth,innerHeight)}window.addEventListener("resize",ya);ya();const Gr=new D(0,0,0);let xd=performance.now();function Mh(i){requestAnimationFrame(Mh);const e=Math.min((i-xd)/1e3,.04);if(xd=i,!on){$n+=e;let t=0,n=0;(Ut.has("KeyW")||Ut.has("ArrowUp"))&&n--,(Ut.has("KeyS")||Ut.has("ArrowDown"))&&n++,(Ut.has("KeyA")||Ut.has("ArrowLeft"))&&t--,(Ut.has("KeyD")||Ut.has("ArrowRight"))&&t++,vt&&(t||n)?(Ui(),t=0,n=0):!vt&&(t||n)&&St.isWatching()&&St.setWatchMode(!1);let s=new D(0,0,0);if(t||n){mn=null,wn.visible=!1;const h=jv(Dn,Qs,t,n);s.set(h.x,0,h.z)}else mn&&(s.subVectors(mn,Ve.position),s.y=0,s.length()<.15&&(mn=null,wn.visible=!1,s.set(0,0,0)));(s.lengthSq()>0||Vs)&&ar(Ve);const r=Ut.has("ShiftLeft")||Ut.has("ShiftRight"),a=r?vd:ay;vt||(M_(bi,{jumpPressed:Vs,jumpHeld:Ut.has("Space"),moving:s.lengthSq()>0,speed:a,cap:vd*y_},e),Vs=!1),s.normalize().multiplyScalar(e*S_(bi,a));const o=vt?!1:py(Ve,s.x,s.z);mn&&!o&&(mn=null,wn.visible=!1),!vt&&bi.airborne&&(Ve.position.y=bi.y,Ve.userData.legs.forEach(h=>{h.rotation.x=-.8})),rh(Ve,e),o&&!bi.airborne?(Vr-=e,Vr<=0&&(cy(),Vr=r?.29:.42)):Vr=0,qe.sendMovement(Ve.position.x,Ve.position.z,Ve.rotation.y,o,!!vt,!vt&&bi.airborne);const l=new D().subVectors(Ve.position,wt.position);if(l.y=0,l.length()>1.3){l.normalize().multiplyScalar(e*3.5);const h=wt.position.x,u=wt.position.z;oa(Qn,tn.obstacles||[],h+l.x,u)&&(wt.position.x+=l.x),oa(Qn,tn.obstacles||[],wt.position.x,u+l.z)&&(wt.position.z+=l.z),Math.hypot(wt.position.x-h,wt.position.z-u)>1e-4?(wt.rotation.y=Math.atan2(l.x,l.z),wt.position.y=Math.sin($n*12)*.025,wt.userData.legs?.forEach((_,m)=>_.rotation.x=Math.sin($n*12+m*Math.PI)*.45)):(wt.position.y=0,wt.userData.legs?.forEach(_=>_.rotation.x*=.8))}else wt.position.y=0,wt.userData.legs?.forEach(h=>h.rotation.x*=.8);Ss.update(e,$n);const c=bn.completed.includes(At);tn.update($n,ca||c),st=null;let d=2.4;for(const h of tn.items||[]){const u=Math.hypot(Ve.position.x-h.x,Ve.position.z-h.z);u<d&&(st=h,d=u)}if(st)pe("action-title").textContent=st.title,pe("action-sub").textContent=st.sub,pe("interact").style.borderColor="#c6b47a99";else{const h=Xt.find(u=>u.id===At);h?(pe("action-title").textContent=h.name,pe("action-sub").textContent="Explore sector with Kiln · Press T to travel"):(pe("action-title").textContent=At===qt.MARKET?"Market Court":"Your Market Garden",pe("action-sub").textContent=At===qt.MARKET?"Explore stalls or travel to outer districts":"Approach beds to till, plant, water, and harvest"),pe("interact").style.borderColor="#9faa9240"}tn.previewCoverage?.(di==="sprinkler"&&st?.type==="bed"?st.bedIndex:null),At!==mh&&gh();const f=iv(Qn,Ve.position.x,Ve.position.z);pe("map-player").setAttribute("cx",f.cx),pe("map-player").setAttribute("cy",f.cy),Ol.rotation.y=Math.sin($n*.03)*.04}if(Dn===Yn){const t=vt?ey:Qv;js.position.set(Ve.position.x,Ve.position.y+t,Ve.position.z),js.rotation.set(la,Qs,0,"YXZ")}else{const t=[[21,25,26],[0,29,31],[-23,27,25]];Gr.lerp(new D(Ve.position.x*.14,.1,Ve.position.z*.14),.025),pn.position.set(Gr.x+t[Dn][0],t[Dn][1],Gr.z+t[Dn][2]),pn.lookAt(Gr)}if(Fl.camera=Js,ga.render(),At===qt.THEATER&&tn?.screenQuad){const t=tn.screenQuad,n=t.map(a=>{const o=a.clone().project(Js);return{x:(o.x*.5+.5)*innerWidth,y:(-o.y*.5+.5)*innerHeight,z:o.z}}),s=n.every(a=>a.z>-1&&a.z<1)&&n.every(a=>a.x>-innerWidth&&a.x<innerWidth*2&&a.y>-innerHeight&&a.y<innerHeight*2),r=s?t[1].distanceTo(t[0])/Math.max(.01,t[3].distanceTo(t[0])):void 0;St.updateScreenQuad(s?n.map(({x:a,y:o})=>({x:a,y:o})):null,r)}else St.updateScreenQuad(null)}requestAnimationFrame(Mh);pe("loading").style.opacity="0";setTimeout(()=>pe("loading").remove(),800);
