(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();const Ao="180",xu=0,il=1,Mu=2,Sc=1,yc=2,On=3,ii=0,Wt=1,Kt=2,kn=0,Ki=1,Da=2,rl=3,sl=4,Su=5,pi=100,yu=101,Eu=102,Tu=103,bu=104,wu=200,Au=201,Ru=202,Cu=203,Ia=204,La=205,Pu=206,Du=207,Iu=208,Lu=209,Uu=210,Nu=211,Fu=212,Ou=213,Bu=214,Ua=0,Na=1,Fa=2,Ji=3,Oa=4,Ba=5,za=6,ka=7,Ec=0,zu=1,ku=2,ni=0,Hu=1,Vu=2,Gu=3,Tc=4,Wu=5,Xu=6,qu=7,bc=300,Qi=301,er=302,Ha=303,Va=304,Fs=306,Ga=1e3,vi=1001,Wa=1002,Zt=1003,Yu=1004,Vr=1005,pn=1006,Xs=1007,xi=1008,Rn=1009,wc=1010,Ac=1011,Ar=1012,Ro=1013,Si=1014,bn=1015,Hn=1016,Co=1017,Po=1018,Rr=1020,Rc=35902,Cc=35899,Pc=1021,Dc=1022,mn=1023,Cr=1026,Pr=1027,Do=1028,Io=1029,Ic=1030,Lo=1031,Uo=1033,xs=33776,Ms=33777,Ss=33778,ys=33779,Xa=35840,qa=35841,Ya=35842,$a=35843,Ka=36196,Za=37492,ja=37496,Ja=37808,Qa=37809,eo=37810,to=37811,no=37812,io=37813,ro=37814,so=37815,ao=37816,oo=37817,lo=37818,co=37819,uo=37820,ho=37821,fo=36492,po=36494,mo=36495,go=36283,_o=36284,vo=36285,xo=36286,$u=3200,Ku=3201,Lc=0,Zu=1,ei="",tn="srgb",tr="srgb-linear",Rs="linear",tt="srgb",wi=7680,al=519,ju=512,Ju=513,Qu=514,Uc=515,ed=516,td=517,nd=518,id=519,Mo=35044,ol="300 es",wn=2e3,Cs=2001;class rr{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const r=n[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const r=n.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,e);e.target=null}}}const It=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let ll=1234567;const Er=Math.PI/180,Dr=180/Math.PI;function Vn(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(It[i&255]+It[i>>8&255]+It[i>>16&255]+It[i>>24&255]+"-"+It[e&255]+It[e>>8&255]+"-"+It[e>>16&15|64]+It[e>>24&255]+"-"+It[t&63|128]+It[t>>8&255]+"-"+It[t>>16&255]+It[t>>24&255]+It[n&255]+It[n>>8&255]+It[n>>16&255]+It[n>>24&255]).toLowerCase()}function Xe(i,e,t){return Math.max(e,Math.min(t,i))}function No(i,e){return(i%e+e)%e}function rd(i,e,t,n,r){return n+(i-e)*(r-n)/(t-e)}function sd(i,e,t){return i!==e?(t-i)/(e-i):0}function Tr(i,e,t){return(1-t)*i+t*e}function ad(i,e,t,n){return Tr(i,e,1-Math.exp(-t*n))}function od(i,e=1){return e-Math.abs(No(i,e*2)-e)}function ld(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function cd(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function ud(i,e){return i+Math.floor(Math.random()*(e-i+1))}function dd(i,e){return i+Math.random()*(e-i)}function hd(i){return i*(.5-Math.random())}function fd(i){i!==void 0&&(ll=i);let e=ll+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function pd(i){return i*Er}function md(i){return i*Dr}function gd(i){return(i&i-1)===0&&i!==0}function _d(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function vd(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function xd(i,e,t,n,r){const s=Math.cos,o=Math.sin,a=s(t/2),l=o(t/2),c=s((e+n)/2),u=o((e+n)/2),d=s((e-n)/2),p=o((e-n)/2),f=s((n-e)/2),g=o((n-e)/2);switch(r){case"XYX":i.set(a*u,l*d,l*p,a*c);break;case"YZY":i.set(l*p,a*u,l*d,a*c);break;case"ZXZ":i.set(l*d,l*p,a*u,a*c);break;case"XZX":i.set(a*u,l*g,l*f,a*c);break;case"YXY":i.set(l*f,a*u,l*g,a*c);break;case"ZYZ":i.set(l*g,l*f,a*u,a*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function hn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Qe(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const Md={DEG2RAD:Er,RAD2DEG:Dr,generateUUID:Vn,clamp:Xe,euclideanModulo:No,mapLinear:rd,inverseLerp:sd,lerp:Tr,damp:ad,pingpong:od,smoothstep:ld,smootherstep:cd,randInt:ud,randFloat:dd,randFloatSpread:hd,seededRandom:fd,degToRad:pd,radToDeg:md,isPowerOfTwo:gd,ceilPowerOfTwo:_d,floorPowerOfTwo:vd,setQuaternionFromProperEuler:xd,normalize:Qe,denormalize:hn};class we{constructor(e=0,t=0){we.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Xe(this.x,e.x,t.x),this.y=Xe(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Xe(this.x,e,t),this.y=Xe(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Xe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Xe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),r=Math.sin(t),s=this.x-e.x,o=this.y-e.y;return this.x=s*n-o*r+e.x,this.y=s*r+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Fr{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,s,o,a){let l=n[r+0],c=n[r+1],u=n[r+2],d=n[r+3];const p=s[o+0],f=s[o+1],g=s[o+2],_=s[o+3];if(a===0){e[t+0]=l,e[t+1]=c,e[t+2]=u,e[t+3]=d;return}if(a===1){e[t+0]=p,e[t+1]=f,e[t+2]=g,e[t+3]=_;return}if(d!==_||l!==p||c!==f||u!==g){let m=1-a;const h=l*p+c*f+u*g+d*_,T=h>=0?1:-1,b=1-h*h;if(b>Number.EPSILON){const P=Math.sqrt(b),w=Math.atan2(P,h*T);m=Math.sin(m*w)/P,a=Math.sin(a*w)/P}const y=a*T;if(l=l*m+p*y,c=c*m+f*y,u=u*m+g*y,d=d*m+_*y,m===1-a){const P=1/Math.sqrt(l*l+c*c+u*u+d*d);l*=P,c*=P,u*=P,d*=P}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,r,s,o){const a=n[r],l=n[r+1],c=n[r+2],u=n[r+3],d=s[o],p=s[o+1],f=s[o+2],g=s[o+3];return e[t]=a*g+u*d+l*f-c*p,e[t+1]=l*g+u*p+c*d-a*f,e[t+2]=c*g+u*f+a*p-l*d,e[t+3]=u*g-a*d-l*p-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,r=e._y,s=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),u=a(r/2),d=a(s/2),p=l(n/2),f=l(r/2),g=l(s/2);switch(o){case"XYZ":this._x=p*u*d+c*f*g,this._y=c*f*d-p*u*g,this._z=c*u*g+p*f*d,this._w=c*u*d-p*f*g;break;case"YXZ":this._x=p*u*d+c*f*g,this._y=c*f*d-p*u*g,this._z=c*u*g-p*f*d,this._w=c*u*d+p*f*g;break;case"ZXY":this._x=p*u*d-c*f*g,this._y=c*f*d+p*u*g,this._z=c*u*g+p*f*d,this._w=c*u*d-p*f*g;break;case"ZYX":this._x=p*u*d-c*f*g,this._y=c*f*d+p*u*g,this._z=c*u*g-p*f*d,this._w=c*u*d+p*f*g;break;case"YZX":this._x=p*u*d+c*f*g,this._y=c*f*d+p*u*g,this._z=c*u*g-p*f*d,this._w=c*u*d-p*f*g;break;case"XZY":this._x=p*u*d-c*f*g,this._y=c*f*d-p*u*g,this._z=c*u*g+p*f*d,this._w=c*u*d+p*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],r=t[4],s=t[8],o=t[1],a=t[5],l=t[9],c=t[2],u=t[6],d=t[10],p=n+a+d;if(p>0){const f=.5/Math.sqrt(p+1);this._w=.25/f,this._x=(u-l)*f,this._y=(s-c)*f,this._z=(o-r)*f}else if(n>a&&n>d){const f=2*Math.sqrt(1+n-a-d);this._w=(u-l)/f,this._x=.25*f,this._y=(r+o)/f,this._z=(s+c)/f}else if(a>d){const f=2*Math.sqrt(1+a-n-d);this._w=(s-c)/f,this._x=(r+o)/f,this._y=.25*f,this._z=(l+u)/f}else{const f=2*Math.sqrt(1+d-n-a);this._w=(o-r)/f,this._x=(s+c)/f,this._y=(l+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Xe(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,r=e._y,s=e._z,o=e._w,a=t._x,l=t._y,c=t._z,u=t._w;return this._x=n*u+o*a+r*c-s*l,this._y=r*u+o*l+s*a-n*c,this._z=s*u+o*c+n*l-r*a,this._w=o*u-n*a-r*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,r=this._y,s=this._z,o=this._w;let a=o*e._w+n*e._x+r*e._y+s*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=n,this._y=r,this._z=s,this;const l=1-a*a;if(l<=Number.EPSILON){const f=1-t;return this._w=f*o+t*this._w,this._x=f*n+t*this._x,this._y=f*r+t*this._y,this._z=f*s+t*this._z,this.normalize(),this}const c=Math.sqrt(l),u=Math.atan2(c,a),d=Math.sin((1-t)*u)/c,p=Math.sin(t*u)/c;return this._w=o*d+this._w*p,this._x=n*d+this._x*p,this._y=r*d+this._y*p,this._z=s*d+this._z*p,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class U{constructor(e=0,t=0,n=0){U.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(cl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(cl.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*r,this.y=s[1]*t+s[4]*n+s[7]*r,this.z=s[2]*t+s[5]*n+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=e.elements,o=1/(s[3]*t+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*r+s[12])*o,this.y=(s[1]*t+s[5]*n+s[9]*r+s[13])*o,this.z=(s[2]*t+s[6]*n+s[10]*r+s[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,r=this.z,s=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*r-a*n),u=2*(a*t-s*r),d=2*(s*n-o*t);return this.x=t+l*c+o*d-a*u,this.y=n+l*u+a*c-s*d,this.z=r+l*d+s*u-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*r,this.y=s[1]*t+s[5]*n+s[9]*r,this.z=s[2]*t+s[6]*n+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Xe(this.x,e.x,t.x),this.y=Xe(this.y,e.y,t.y),this.z=Xe(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Xe(this.x,e,t),this.y=Xe(this.y,e,t),this.z=Xe(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Xe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,r=e.y,s=e.z,o=t.x,a=t.y,l=t.z;return this.x=r*l-s*a,this.y=s*o-n*l,this.z=n*a-r*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return qs.copy(this).projectOnVector(e),this.sub(qs)}reflect(e){return this.sub(qs.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Xe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const qs=new U,cl=new Fr;class ke{constructor(e,t,n,r,s,o,a,l,c){ke.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,o,a,l,c)}set(e,t,n,r,s,o,a,l,c){const u=this.elements;return u[0]=e,u[1]=r,u[2]=a,u[3]=t,u[4]=s,u[5]=l,u[6]=n,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],u=n[4],d=n[7],p=n[2],f=n[5],g=n[8],_=r[0],m=r[3],h=r[6],T=r[1],b=r[4],y=r[7],P=r[2],w=r[5],D=r[8];return s[0]=o*_+a*T+l*P,s[3]=o*m+a*b+l*w,s[6]=o*h+a*y+l*D,s[1]=c*_+u*T+d*P,s[4]=c*m+u*b+d*w,s[7]=c*h+u*y+d*D,s[2]=p*_+f*T+g*P,s[5]=p*m+f*b+g*w,s[8]=p*h+f*y+g*D,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return t*o*u-t*a*c-n*s*u+n*a*l+r*s*c-r*o*l}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],d=u*o-a*c,p=a*l-u*s,f=c*s-o*l,g=t*d+n*p+r*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return e[0]=d*_,e[1]=(r*c-u*n)*_,e[2]=(a*n-r*o)*_,e[3]=p*_,e[4]=(u*t-r*l)*_,e[5]=(r*s-a*t)*_,e[6]=f*_,e[7]=(n*l-c*t)*_,e[8]=(o*t-n*s)*_,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-r*c,r*l,-r*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Ys.makeScale(e,t)),this}rotate(e){return this.premultiply(Ys.makeRotation(-e)),this}translate(e,t){return this.premultiply(Ys.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<9;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Ys=new ke;function Nc(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Ps(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Sd(){const i=Ps("canvas");return i.style.display="block",i}const ul={};function Ir(i){i in ul||(ul[i]=!0,console.warn(i))}function yd(i,e,t){return new Promise(function(n,r){function s(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}const dl=new ke().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),hl=new ke().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Ed(){const i={enabled:!0,workingColorSpace:tr,spaces:{},convert:function(r,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===tt&&(r.r=Gn(r.r),r.g=Gn(r.g),r.b=Gn(r.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===tt&&(r.r=Zi(r.r),r.g=Zi(r.g),r.b=Zi(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===ei?Rs:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,o){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return Ir("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return Ir("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(r,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[tr]:{primaries:e,whitePoint:n,transfer:Rs,toXYZ:dl,fromXYZ:hl,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:tn},outputColorSpaceConfig:{drawingBufferColorSpace:tn}},[tn]:{primaries:e,whitePoint:n,transfer:tt,toXYZ:dl,fromXYZ:hl,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:tn}}}),i}const Ke=Ed();function Gn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Zi(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ai;class Td{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Ai===void 0&&(Ai=Ps("canvas")),Ai.width=e.width,Ai.height=e.height;const r=Ai.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),n=Ai}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Ps("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const r=n.getImageData(0,0,e.width,e.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=Gn(s[o]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Gn(t[n]/255)*255):t[n]=Gn(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let bd=0;class Fo{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:bd++}),this.uuid=Vn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push($s(r[o].image)):s.push($s(r[o]))}else s=$s(r);n.url=s}return t||(e.images[this.uuid]=n),n}}function $s(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Td.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let wd=0;const Ks=new U;class Nt extends rr{constructor(e=Nt.DEFAULT_IMAGE,t=Nt.DEFAULT_MAPPING,n=vi,r=vi,s=pn,o=xi,a=mn,l=Rn,c=Nt.DEFAULT_ANISOTROPY,u=ei){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:wd++}),this.uuid=Vn(),this.name="",this.source=new Fo(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new we(0,0),this.repeat=new we(1,1),this.center=new we(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new ke,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Ks).x}get height(){return this.source.getSize(Ks).y}get depth(){return this.source.getSize(Ks).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==bc)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ga:e.x=e.x-Math.floor(e.x);break;case vi:e.x=e.x<0?0:1;break;case Wa:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Ga:e.y=e.y-Math.floor(e.y);break;case vi:e.y=e.y<0?0:1;break;case Wa:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Nt.DEFAULT_IMAGE=null;Nt.DEFAULT_MAPPING=bc;Nt.DEFAULT_ANISOTROPY=1;class nt{constructor(e=0,t=0,n=0,r=1){nt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*r+o[12]*s,this.y=o[1]*t+o[5]*n+o[9]*r+o[13]*s,this.z=o[2]*t+o[6]*n+o[10]*r+o[14]*s,this.w=o[3]*t+o[7]*n+o[11]*r+o[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,s;const l=e.elements,c=l[0],u=l[4],d=l[8],p=l[1],f=l[5],g=l[9],_=l[2],m=l[6],h=l[10];if(Math.abs(u-p)<.01&&Math.abs(d-_)<.01&&Math.abs(g-m)<.01){if(Math.abs(u+p)<.1&&Math.abs(d+_)<.1&&Math.abs(g+m)<.1&&Math.abs(c+f+h-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const b=(c+1)/2,y=(f+1)/2,P=(h+1)/2,w=(u+p)/4,D=(d+_)/4,L=(g+m)/4;return b>y&&b>P?b<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(b),r=w/n,s=D/n):y>P?y<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(y),n=w/r,s=L/r):P<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(P),n=D/s,r=L/s),this.set(n,r,s,t),this}let T=Math.sqrt((m-g)*(m-g)+(d-_)*(d-_)+(p-u)*(p-u));return Math.abs(T)<.001&&(T=1),this.x=(m-g)/T,this.y=(d-_)/T,this.z=(p-u)/T,this.w=Math.acos((c+f+h-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Xe(this.x,e.x,t.x),this.y=Xe(this.y,e.y,t.y),this.z=Xe(this.z,e.z,t.z),this.w=Xe(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Xe(this.x,e,t),this.y=Xe(this.y,e,t),this.z=Xe(this.z,e,t),this.w=Xe(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Xe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Ad extends rr{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:pn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new nt(0,0,e,t),this.scissorTest=!1,this.viewport=new nt(0,0,e,t);const r={width:e,height:t,depth:n.depth},s=new Nt(r);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:pn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isArrayTexture=this.textures[r].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new Fo(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class _n extends Ad{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Fc extends Nt{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Zt,this.minFilter=Zt,this.wrapR=vi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Rd extends Nt{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Zt,this.minFilter=Zt,this.wrapR=vi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class yi{constructor(e=new U(1/0,1/0,1/0),t=new U(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(ln.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(ln.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=ln.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,ln):ln.fromBufferAttribute(s,o),ln.applyMatrix4(e.matrixWorld),this.expandByPoint(ln);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Gr.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Gr.copy(n.boundingBox)),Gr.applyMatrix4(e.matrixWorld),this.union(Gr)}const r=e.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,ln),ln.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(cr),Wr.subVectors(this.max,cr),Ri.subVectors(e.a,cr),Ci.subVectors(e.b,cr),Pi.subVectors(e.c,cr),Yn.subVectors(Ci,Ri),$n.subVectors(Pi,Ci),ai.subVectors(Ri,Pi);let t=[0,-Yn.z,Yn.y,0,-$n.z,$n.y,0,-ai.z,ai.y,Yn.z,0,-Yn.x,$n.z,0,-$n.x,ai.z,0,-ai.x,-Yn.y,Yn.x,0,-$n.y,$n.x,0,-ai.y,ai.x,0];return!Zs(t,Ri,Ci,Pi,Wr)||(t=[1,0,0,0,1,0,0,0,1],!Zs(t,Ri,Ci,Pi,Wr))?!1:(Xr.crossVectors(Yn,$n),t=[Xr.x,Xr.y,Xr.z],Zs(t,Ri,Ci,Pi,Wr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,ln).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(ln).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(In[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),In[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),In[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),In[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),In[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),In[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),In[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),In[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(In),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const In=[new U,new U,new U,new U,new U,new U,new U,new U],ln=new U,Gr=new yi,Ri=new U,Ci=new U,Pi=new U,Yn=new U,$n=new U,ai=new U,cr=new U,Wr=new U,Xr=new U,oi=new U;function Zs(i,e,t,n,r){for(let s=0,o=i.length-3;s<=o;s+=3){oi.fromArray(i,s);const a=r.x*Math.abs(oi.x)+r.y*Math.abs(oi.y)+r.z*Math.abs(oi.z),l=e.dot(oi),c=t.dot(oi),u=n.dot(oi);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}const Cd=new yi,ur=new U,js=new U;class sr{constructor(e=new U,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):Cd.setFromPoints(e).getCenter(n);let r=0;for(let s=0,o=e.length;s<o;s++)r=Math.max(r,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;ur.subVectors(e,this.center);const t=ur.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),r=(n-this.radius)*.5;this.center.addScaledVector(ur,r/n),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(js.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(ur.copy(e.center).add(js)),this.expandByPoint(ur.copy(e.center).sub(js))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const Ln=new U,Js=new U,qr=new U,Kn=new U,Qs=new U,Yr=new U,ea=new U;class Oo{constructor(e=new U,t=new U(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ln)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Ln.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ln.copy(this.origin).addScaledVector(this.direction,t),Ln.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Js.copy(e).add(t).multiplyScalar(.5),qr.copy(t).sub(e).normalize(),Kn.copy(this.origin).sub(Js);const s=e.distanceTo(t)*.5,o=-this.direction.dot(qr),a=Kn.dot(this.direction),l=-Kn.dot(qr),c=Kn.lengthSq(),u=Math.abs(1-o*o);let d,p,f,g;if(u>0)if(d=o*l-a,p=o*a-l,g=s*u,d>=0)if(p>=-g)if(p<=g){const _=1/u;d*=_,p*=_,f=d*(d+o*p+2*a)+p*(o*d+p+2*l)+c}else p=s,d=Math.max(0,-(o*p+a)),f=-d*d+p*(p+2*l)+c;else p=-s,d=Math.max(0,-(o*p+a)),f=-d*d+p*(p+2*l)+c;else p<=-g?(d=Math.max(0,-(-o*s+a)),p=d>0?-s:Math.min(Math.max(-s,-l),s),f=-d*d+p*(p+2*l)+c):p<=g?(d=0,p=Math.min(Math.max(-s,-l),s),f=p*(p+2*l)+c):(d=Math.max(0,-(o*s+a)),p=d>0?s:Math.min(Math.max(-s,-l),s),f=-d*d+p*(p+2*l)+c);else p=o>0?-s:s,d=Math.max(0,-(o*p+a)),f=-d*d+p*(p+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),r&&r.copy(Js).addScaledVector(qr,p),f}intersectSphere(e,t){Ln.subVectors(e.center,this.origin);const n=Ln.dot(this.direction),r=Ln.dot(Ln)-n*n,s=e.radius*e.radius;if(r>s)return null;const o=Math.sqrt(s-r),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,s,o,a,l;const c=1/this.direction.x,u=1/this.direction.y,d=1/this.direction.z,p=this.origin;return c>=0?(n=(e.min.x-p.x)*c,r=(e.max.x-p.x)*c):(n=(e.max.x-p.x)*c,r=(e.min.x-p.x)*c),u>=0?(s=(e.min.y-p.y)*u,o=(e.max.y-p.y)*u):(s=(e.max.y-p.y)*u,o=(e.min.y-p.y)*u),n>o||s>r||((s>n||isNaN(n))&&(n=s),(o<r||isNaN(r))&&(r=o),d>=0?(a=(e.min.z-p.z)*d,l=(e.max.z-p.z)*d):(a=(e.max.z-p.z)*d,l=(e.min.z-p.z)*d),n>l||a>r)||((a>n||n!==n)&&(n=a),(l<r||r!==r)&&(r=l),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Ln)!==null}intersectTriangle(e,t,n,r,s){Qs.subVectors(t,e),Yr.subVectors(n,e),ea.crossVectors(Qs,Yr);let o=this.direction.dot(ea),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Kn.subVectors(this.origin,e);const l=a*this.direction.dot(Yr.crossVectors(Kn,Yr));if(l<0)return null;const c=a*this.direction.dot(Qs.cross(Kn));if(c<0||l+c>o)return null;const u=-a*Kn.dot(ea);return u<0?null:this.at(u/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class rt{constructor(e,t,n,r,s,o,a,l,c,u,d,p,f,g,_,m){rt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,o,a,l,c,u,d,p,f,g,_,m)}set(e,t,n,r,s,o,a,l,c,u,d,p,f,g,_,m){const h=this.elements;return h[0]=e,h[4]=t,h[8]=n,h[12]=r,h[1]=s,h[5]=o,h[9]=a,h[13]=l,h[2]=c,h[6]=u,h[10]=d,h[14]=p,h[3]=f,h[7]=g,h[11]=_,h[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new rt().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,r=1/Di.setFromMatrixColumn(e,0).length(),s=1/Di.setFromMatrixColumn(e,1).length(),o=1/Di.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,r=e.y,s=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(r),c=Math.sin(r),u=Math.cos(s),d=Math.sin(s);if(e.order==="XYZ"){const p=o*u,f=o*d,g=a*u,_=a*d;t[0]=l*u,t[4]=-l*d,t[8]=c,t[1]=f+g*c,t[5]=p-_*c,t[9]=-a*l,t[2]=_-p*c,t[6]=g+f*c,t[10]=o*l}else if(e.order==="YXZ"){const p=l*u,f=l*d,g=c*u,_=c*d;t[0]=p+_*a,t[4]=g*a-f,t[8]=o*c,t[1]=o*d,t[5]=o*u,t[9]=-a,t[2]=f*a-g,t[6]=_+p*a,t[10]=o*l}else if(e.order==="ZXY"){const p=l*u,f=l*d,g=c*u,_=c*d;t[0]=p-_*a,t[4]=-o*d,t[8]=g+f*a,t[1]=f+g*a,t[5]=o*u,t[9]=_-p*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const p=o*u,f=o*d,g=a*u,_=a*d;t[0]=l*u,t[4]=g*c-f,t[8]=p*c+_,t[1]=l*d,t[5]=_*c+p,t[9]=f*c-g,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const p=o*l,f=o*c,g=a*l,_=a*c;t[0]=l*u,t[4]=_-p*d,t[8]=g*d+f,t[1]=d,t[5]=o*u,t[9]=-a*u,t[2]=-c*u,t[6]=f*d+g,t[10]=p-_*d}else if(e.order==="XZY"){const p=o*l,f=o*c,g=a*l,_=a*c;t[0]=l*u,t[4]=-d,t[8]=c*u,t[1]=p*d+_,t[5]=o*u,t[9]=f*d-g,t[2]=g*d-f,t[6]=a*u,t[10]=_*d+p}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Pd,e,Dd)}lookAt(e,t,n){const r=this.elements;return Yt.subVectors(e,t),Yt.lengthSq()===0&&(Yt.z=1),Yt.normalize(),Zn.crossVectors(n,Yt),Zn.lengthSq()===0&&(Math.abs(n.z)===1?Yt.x+=1e-4:Yt.z+=1e-4,Yt.normalize(),Zn.crossVectors(n,Yt)),Zn.normalize(),$r.crossVectors(Yt,Zn),r[0]=Zn.x,r[4]=$r.x,r[8]=Yt.x,r[1]=Zn.y,r[5]=$r.y,r[9]=Yt.y,r[2]=Zn.z,r[6]=$r.z,r[10]=Yt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],u=n[1],d=n[5],p=n[9],f=n[13],g=n[2],_=n[6],m=n[10],h=n[14],T=n[3],b=n[7],y=n[11],P=n[15],w=r[0],D=r[4],L=r[8],M=r[12],S=r[1],R=r[5],C=r[9],B=r[13],N=r[2],z=r[6],F=r[10],q=r[14],V=r[3],j=r[7],ee=r[11],ue=r[15];return s[0]=o*w+a*S+l*N+c*V,s[4]=o*D+a*R+l*z+c*j,s[8]=o*L+a*C+l*F+c*ee,s[12]=o*M+a*B+l*q+c*ue,s[1]=u*w+d*S+p*N+f*V,s[5]=u*D+d*R+p*z+f*j,s[9]=u*L+d*C+p*F+f*ee,s[13]=u*M+d*B+p*q+f*ue,s[2]=g*w+_*S+m*N+h*V,s[6]=g*D+_*R+m*z+h*j,s[10]=g*L+_*C+m*F+h*ee,s[14]=g*M+_*B+m*q+h*ue,s[3]=T*w+b*S+y*N+P*V,s[7]=T*D+b*R+y*z+P*j,s[11]=T*L+b*C+y*F+P*ee,s[15]=T*M+b*B+y*q+P*ue,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],r=e[8],s=e[12],o=e[1],a=e[5],l=e[9],c=e[13],u=e[2],d=e[6],p=e[10],f=e[14],g=e[3],_=e[7],m=e[11],h=e[15];return g*(+s*l*d-r*c*d-s*a*p+n*c*p+r*a*f-n*l*f)+_*(+t*l*f-t*c*p+s*o*p-r*o*f+r*c*u-s*l*u)+m*(+t*c*d-t*a*f-s*o*d+n*o*f+s*a*u-n*c*u)+h*(-r*a*u-t*l*d+t*a*p+r*o*d-n*o*p+n*l*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],d=e[9],p=e[10],f=e[11],g=e[12],_=e[13],m=e[14],h=e[15],T=d*m*c-_*p*c+_*l*f-a*m*f-d*l*h+a*p*h,b=g*p*c-u*m*c-g*l*f+o*m*f+u*l*h-o*p*h,y=u*_*c-g*d*c+g*a*f-o*_*f-u*a*h+o*d*h,P=g*d*l-u*_*l-g*a*p+o*_*p+u*a*m-o*d*m,w=t*T+n*b+r*y+s*P;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const D=1/w;return e[0]=T*D,e[1]=(_*p*s-d*m*s-_*r*f+n*m*f+d*r*h-n*p*h)*D,e[2]=(a*m*s-_*l*s+_*r*c-n*m*c-a*r*h+n*l*h)*D,e[3]=(d*l*s-a*p*s-d*r*c+n*p*c+a*r*f-n*l*f)*D,e[4]=b*D,e[5]=(u*m*s-g*p*s+g*r*f-t*m*f-u*r*h+t*p*h)*D,e[6]=(g*l*s-o*m*s-g*r*c+t*m*c+o*r*h-t*l*h)*D,e[7]=(o*p*s-u*l*s+u*r*c-t*p*c-o*r*f+t*l*f)*D,e[8]=y*D,e[9]=(g*d*s-u*_*s-g*n*f+t*_*f+u*n*h-t*d*h)*D,e[10]=(o*_*s-g*a*s+g*n*c-t*_*c-o*n*h+t*a*h)*D,e[11]=(u*a*s-o*d*s-u*n*c+t*d*c+o*n*f-t*a*f)*D,e[12]=P*D,e[13]=(u*_*r-g*d*r+g*n*p-t*_*p-u*n*m+t*d*m)*D,e[14]=(g*a*r-o*_*r-g*n*l+t*_*l+o*n*m-t*a*m)*D,e[15]=(o*d*r-u*a*r+u*n*l-t*d*l-o*n*p+t*a*p)*D,this}scale(e){const t=this.elements,n=e.x,r=e.y,s=e.z;return t[0]*=n,t[4]*=r,t[8]*=s,t[1]*=n,t[5]*=r,t[9]*=s,t[2]*=n,t[6]*=r,t[10]*=s,t[3]*=n,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),r=Math.sin(t),s=1-n,o=e.x,a=e.y,l=e.z,c=s*o,u=s*a;return this.set(c*o+n,c*a-r*l,c*l+r*a,0,c*a+r*l,u*a+n,u*l-r*o,0,c*l-r*a,u*l+r*o,s*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,s,o){return this.set(1,n,s,0,e,1,o,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){const r=this.elements,s=t._x,o=t._y,a=t._z,l=t._w,c=s+s,u=o+o,d=a+a,p=s*c,f=s*u,g=s*d,_=o*u,m=o*d,h=a*d,T=l*c,b=l*u,y=l*d,P=n.x,w=n.y,D=n.z;return r[0]=(1-(_+h))*P,r[1]=(f+y)*P,r[2]=(g-b)*P,r[3]=0,r[4]=(f-y)*w,r[5]=(1-(p+h))*w,r[6]=(m+T)*w,r[7]=0,r[8]=(g+b)*D,r[9]=(m-T)*D,r[10]=(1-(p+_))*D,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){const r=this.elements;let s=Di.set(r[0],r[1],r[2]).length();const o=Di.set(r[4],r[5],r[6]).length(),a=Di.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],cn.copy(this);const c=1/s,u=1/o,d=1/a;return cn.elements[0]*=c,cn.elements[1]*=c,cn.elements[2]*=c,cn.elements[4]*=u,cn.elements[5]*=u,cn.elements[6]*=u,cn.elements[8]*=d,cn.elements[9]*=d,cn.elements[10]*=d,t.setFromRotationMatrix(cn),n.x=s,n.y=o,n.z=a,this}makePerspective(e,t,n,r,s,o,a=wn,l=!1){const c=this.elements,u=2*s/(t-e),d=2*s/(n-r),p=(t+e)/(t-e),f=(n+r)/(n-r);let g,_;if(l)g=s/(o-s),_=o*s/(o-s);else if(a===wn)g=-(o+s)/(o-s),_=-2*o*s/(o-s);else if(a===Cs)g=-o/(o-s),_=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=p,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,s,o,a=wn,l=!1){const c=this.elements,u=2/(t-e),d=2/(n-r),p=-(t+e)/(t-e),f=-(n+r)/(n-r);let g,_;if(l)g=1/(o-s),_=o/(o-s);else if(a===wn)g=-2/(o-s),_=-(o+s)/(o-s);else if(a===Cs)g=-1/(o-s),_=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=0,c[12]=p,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<16;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Di=new U,cn=new rt,Pd=new U(0,0,0),Dd=new U(1,1,1),Zn=new U,$r=new U,Yt=new U,fl=new rt,pl=new Fr;class Cn{constructor(e=0,t=0,n=0,r=Cn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const r=e.elements,s=r[0],o=r[4],a=r[8],l=r[1],c=r[5],u=r[9],d=r[2],p=r[6],f=r[10];switch(t){case"XYZ":this._y=Math.asin(Xe(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(p,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Xe(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(Xe(p,-1,1)),Math.abs(p)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-Xe(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(p,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Xe(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-Xe(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(p,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return fl.makeRotationFromQuaternion(e),this.setFromRotationMatrix(fl,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return pl.setFromEuler(this),this.setFromQuaternion(pl,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Cn.DEFAULT_ORDER="XYZ";class Bo{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Id=0;const ml=new U,Ii=new Fr,Un=new rt,Kr=new U,dr=new U,Ld=new U,Ud=new Fr,gl=new U(1,0,0),_l=new U(0,1,0),vl=new U(0,0,1),xl={type:"added"},Nd={type:"removed"},Li={type:"childadded",child:null},ta={type:"childremoved",child:null};class wt extends rr{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Id++}),this.uuid=Vn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=wt.DEFAULT_UP.clone();const e=new U,t=new Cn,n=new Fr,r=new U(1,1,1);function s(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new rt},normalMatrix:{value:new ke}}),this.matrix=new rt,this.matrixWorld=new rt,this.matrixAutoUpdate=wt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=wt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Bo,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ii.setFromAxisAngle(e,t),this.quaternion.multiply(Ii),this}rotateOnWorldAxis(e,t){return Ii.setFromAxisAngle(e,t),this.quaternion.premultiply(Ii),this}rotateX(e){return this.rotateOnAxis(gl,e)}rotateY(e){return this.rotateOnAxis(_l,e)}rotateZ(e){return this.rotateOnAxis(vl,e)}translateOnAxis(e,t){return ml.copy(e).applyQuaternion(this.quaternion),this.position.add(ml.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(gl,e)}translateY(e){return this.translateOnAxis(_l,e)}translateZ(e){return this.translateOnAxis(vl,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Un.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Kr.copy(e):Kr.set(e,t,n);const r=this.parent;this.updateWorldMatrix(!0,!1),dr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Un.lookAt(dr,Kr,this.up):Un.lookAt(Kr,dr,this.up),this.quaternion.setFromRotationMatrix(Un),r&&(Un.extractRotation(r.matrixWorld),Ii.setFromRotationMatrix(Un),this.quaternion.premultiply(Ii.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(xl),Li.child=e,this.dispatchEvent(Li),Li.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Nd),ta.child=e,this.dispatchEvent(ta),ta.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Un.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Un.multiply(e.parent.matrixWorld)),e.applyMatrix4(Un),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(xl),Li.child=e,this.dispatchEvent(Li),Li.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(dr,e,Ld),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(dr,Ud,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(a=>({...a})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const d=l[c];s(e.shapes,d)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(e.materials,this.material[l]));r.material=a}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];r.animations.push(s(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),u=o(e.images),d=o(e.shapes),p=o(e.skeletons),f=o(e.animations),g=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),u.length>0&&(n.images=u),d.length>0&&(n.shapes=d),p.length>0&&(n.skeletons=p),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=r,n;function o(a){const l=[];for(const c in a){const u=a[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const r=e.children[n];this.add(r.clone())}return this}}wt.DEFAULT_UP=new U(0,1,0);wt.DEFAULT_MATRIX_AUTO_UPDATE=!0;wt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const un=new U,Nn=new U,na=new U,Fn=new U,Ui=new U,Ni=new U,Ml=new U,ia=new U,ra=new U,sa=new U,aa=new nt,oa=new nt,la=new nt;class sn{constructor(e=new U,t=new U,n=new U){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),un.subVectors(e,t),r.cross(un);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,n,r,s){un.subVectors(r,t),Nn.subVectors(n,t),na.subVectors(e,t);const o=un.dot(un),a=un.dot(Nn),l=un.dot(na),c=Nn.dot(Nn),u=Nn.dot(na),d=o*c-a*a;if(d===0)return s.set(0,0,0),null;const p=1/d,f=(c*l-a*u)*p,g=(o*u-a*l)*p;return s.set(1-f-g,g,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,Fn)===null?!1:Fn.x>=0&&Fn.y>=0&&Fn.x+Fn.y<=1}static getInterpolation(e,t,n,r,s,o,a,l){return this.getBarycoord(e,t,n,r,Fn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,Fn.x),l.addScaledVector(o,Fn.y),l.addScaledVector(a,Fn.z),l)}static getInterpolatedAttribute(e,t,n,r,s,o){return aa.setScalar(0),oa.setScalar(0),la.setScalar(0),aa.fromBufferAttribute(e,t),oa.fromBufferAttribute(e,n),la.fromBufferAttribute(e,r),o.setScalar(0),o.addScaledVector(aa,s.x),o.addScaledVector(oa,s.y),o.addScaledVector(la,s.z),o}static isFrontFacing(e,t,n,r){return un.subVectors(n,t),Nn.subVectors(e,t),un.cross(Nn).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return un.subVectors(this.c,this.b),Nn.subVectors(this.a,this.b),un.cross(Nn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return sn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return sn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,r,s){return sn.getInterpolation(e,this.a,this.b,this.c,t,n,r,s)}containsPoint(e){return sn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return sn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,r=this.b,s=this.c;let o,a;Ui.subVectors(r,n),Ni.subVectors(s,n),ia.subVectors(e,n);const l=Ui.dot(ia),c=Ni.dot(ia);if(l<=0&&c<=0)return t.copy(n);ra.subVectors(e,r);const u=Ui.dot(ra),d=Ni.dot(ra);if(u>=0&&d<=u)return t.copy(r);const p=l*d-u*c;if(p<=0&&l>=0&&u<=0)return o=l/(l-u),t.copy(n).addScaledVector(Ui,o);sa.subVectors(e,s);const f=Ui.dot(sa),g=Ni.dot(sa);if(g>=0&&f<=g)return t.copy(s);const _=f*c-l*g;if(_<=0&&c>=0&&g<=0)return a=c/(c-g),t.copy(n).addScaledVector(Ni,a);const m=u*g-f*d;if(m<=0&&d-u>=0&&f-g>=0)return Ml.subVectors(s,r),a=(d-u)/(d-u+(f-g)),t.copy(r).addScaledVector(Ml,a);const h=1/(m+_+p);return o=_*h,a=p*h,t.copy(n).addScaledVector(Ui,o).addScaledVector(Ni,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Oc={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},jn={h:0,s:0,l:0},Zr={h:0,s:0,l:0};function ca(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class Ne{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=tn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ke.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Ke.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ke.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Ke.workingColorSpace){if(e=No(e,1),t=Xe(t,0,1),n=Xe(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,o=2*n-s;this.r=ca(o,s,e+1/3),this.g=ca(o,s,e),this.b=ca(o,s,e-1/3)}return Ke.colorSpaceToWorking(this,r),this}setStyle(e,t=tn){function n(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=tn){const n=Oc[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Gn(e.r),this.g=Gn(e.g),this.b=Gn(e.b),this}copyLinearToSRGB(e){return this.r=Zi(e.r),this.g=Zi(e.g),this.b=Zi(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=tn){return Ke.workingToColorSpace(Lt.copy(this),e),Math.round(Xe(Lt.r*255,0,255))*65536+Math.round(Xe(Lt.g*255,0,255))*256+Math.round(Xe(Lt.b*255,0,255))}getHexString(e=tn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ke.workingColorSpace){Ke.workingToColorSpace(Lt.copy(this),t);const n=Lt.r,r=Lt.g,s=Lt.b,o=Math.max(n,r,s),a=Math.min(n,r,s);let l,c;const u=(a+o)/2;if(a===o)l=0,c=0;else{const d=o-a;switch(c=u<=.5?d/(o+a):d/(2-o-a),o){case n:l=(r-s)/d+(r<s?6:0);break;case r:l=(s-n)/d+2;break;case s:l=(n-r)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=Ke.workingColorSpace){return Ke.workingToColorSpace(Lt.copy(this),t),e.r=Lt.r,e.g=Lt.g,e.b=Lt.b,e}getStyle(e=tn){Ke.workingToColorSpace(Lt.copy(this),e);const t=Lt.r,n=Lt.g,r=Lt.b;return e!==tn?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(e,t,n){return this.getHSL(jn),this.setHSL(jn.h+e,jn.s+t,jn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(jn),e.getHSL(Zr);const n=Tr(jn.h,Zr.h,t),r=Tr(jn.s,Zr.s,t),s=Tr(jn.l,Zr.l,t);return this.setHSL(n,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*r,this.g=s[1]*t+s[4]*n+s[7]*r,this.b=s[2]*t+s[5]*n+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Lt=new Ne;Ne.NAMES=Oc;let Fd=0;class Ei extends rr{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Fd++}),this.uuid=Vn(),this.name="",this.type="Material",this.blending=Ki,this.side=ii,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ia,this.blendDst=La,this.blendEquation=pi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ne(0,0,0),this.blendAlpha=0,this.depthFunc=Ji,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=al,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=wi,this.stencilZFail=wi,this.stencilZPass=wi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Ki&&(n.blending=this.blending),this.side!==ii&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Ia&&(n.blendSrc=this.blendSrc),this.blendDst!==La&&(n.blendDst=this.blendDst),this.blendEquation!==pi&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Ji&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==al&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==wi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==wi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==wi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(t){const s=r(e.textures),o=r(e.images);s.length>0&&(n.textures=s),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const r=t.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class ar extends Ei{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ne(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Cn,this.combine=Ec,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Mt=new U,jr=new we;let Od=0;class jt{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Od++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Mo,this.updateRanges=[],this.gpuType=bn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)jr.fromBufferAttribute(this,t),jr.applyMatrix3(e),this.setXY(t,jr.x,jr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Mt.fromBufferAttribute(this,t),Mt.applyMatrix3(e),this.setXYZ(t,Mt.x,Mt.y,Mt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Mt.fromBufferAttribute(this,t),Mt.applyMatrix4(e),this.setXYZ(t,Mt.x,Mt.y,Mt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Mt.fromBufferAttribute(this,t),Mt.applyNormalMatrix(e),this.setXYZ(t,Mt.x,Mt.y,Mt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Mt.fromBufferAttribute(this,t),Mt.transformDirection(e),this.setXYZ(t,Mt.x,Mt.y,Mt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=hn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Qe(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=hn(t,this.array)),t}setX(e,t){return this.normalized&&(t=Qe(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=hn(t,this.array)),t}setY(e,t){return this.normalized&&(t=Qe(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=hn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Qe(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=hn(t,this.array)),t}setW(e,t){return this.normalized&&(t=Qe(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Qe(t,this.array),n=Qe(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Qe(t,this.array),n=Qe(n,this.array),r=Qe(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e*=this.itemSize,this.normalized&&(t=Qe(t,this.array),n=Qe(n,this.array),r=Qe(r,this.array),s=Qe(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Mo&&(e.usage=this.usage),e}}class Bc extends jt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class zc extends jt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class ht extends jt{constructor(e,t,n){super(new Float32Array(e),t,n)}}let Bd=0;const en=new rt,ua=new wt,Fi=new U,$t=new yi,hr=new yi,Pt=new U;class Ft extends rr{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Bd++}),this.uuid=Vn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Nc(e)?zc:Bc)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new ke().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return en.makeRotationFromQuaternion(e),this.applyMatrix4(en),this}rotateX(e){return en.makeRotationX(e),this.applyMatrix4(en),this}rotateY(e){return en.makeRotationY(e),this.applyMatrix4(en),this}rotateZ(e){return en.makeRotationZ(e),this.applyMatrix4(en),this}translate(e,t,n){return en.makeTranslation(e,t,n),this.applyMatrix4(en),this}scale(e,t,n){return en.makeScale(e,t,n),this.applyMatrix4(en),this}lookAt(e){return ua.lookAt(e),ua.updateMatrix(),this.applyMatrix4(ua.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Fi).negate(),this.translate(Fi.x,Fi.y,Fi.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let r=0,s=e.length;r<s;r++){const o=e[r];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ht(n,3))}else{const n=Math.min(e.length,t.count);for(let r=0;r<n;r++){const s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new yi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new U(-1/0,-1/0,-1/0),new U(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,r=t.length;n<r;n++){const s=t[n];$t.setFromBufferAttribute(s),this.morphTargetsRelative?(Pt.addVectors(this.boundingBox.min,$t.min),this.boundingBox.expandByPoint(Pt),Pt.addVectors(this.boundingBox.max,$t.max),this.boundingBox.expandByPoint(Pt)):(this.boundingBox.expandByPoint($t.min),this.boundingBox.expandByPoint($t.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new sr);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new U,1/0);return}if(e){const n=this.boundingSphere.center;if($t.setFromBufferAttribute(e),t)for(let s=0,o=t.length;s<o;s++){const a=t[s];hr.setFromBufferAttribute(a),this.morphTargetsRelative?(Pt.addVectors($t.min,hr.min),$t.expandByPoint(Pt),Pt.addVectors($t.max,hr.max),$t.expandByPoint(Pt)):($t.expandByPoint(hr.min),$t.expandByPoint(hr.max))}$t.getCenter(n);let r=0;for(let s=0,o=e.count;s<o;s++)Pt.fromBufferAttribute(e,s),r=Math.max(r,n.distanceToSquared(Pt));if(t)for(let s=0,o=t.length;s<o;s++){const a=t[s],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)Pt.fromBufferAttribute(a,c),l&&(Fi.fromBufferAttribute(e,c),Pt.add(Fi)),r=Math.max(r,n.distanceToSquared(Pt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new jt(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let L=0;L<n.count;L++)a[L]=new U,l[L]=new U;const c=new U,u=new U,d=new U,p=new we,f=new we,g=new we,_=new U,m=new U;function h(L,M,S){c.fromBufferAttribute(n,L),u.fromBufferAttribute(n,M),d.fromBufferAttribute(n,S),p.fromBufferAttribute(s,L),f.fromBufferAttribute(s,M),g.fromBufferAttribute(s,S),u.sub(c),d.sub(c),f.sub(p),g.sub(p);const R=1/(f.x*g.y-g.x*f.y);isFinite(R)&&(_.copy(u).multiplyScalar(g.y).addScaledVector(d,-f.y).multiplyScalar(R),m.copy(d).multiplyScalar(f.x).addScaledVector(u,-g.x).multiplyScalar(R),a[L].add(_),a[M].add(_),a[S].add(_),l[L].add(m),l[M].add(m),l[S].add(m))}let T=this.groups;T.length===0&&(T=[{start:0,count:e.count}]);for(let L=0,M=T.length;L<M;++L){const S=T[L],R=S.start,C=S.count;for(let B=R,N=R+C;B<N;B+=3)h(e.getX(B+0),e.getX(B+1),e.getX(B+2))}const b=new U,y=new U,P=new U,w=new U;function D(L){P.fromBufferAttribute(r,L),w.copy(P);const M=a[L];b.copy(M),b.sub(P.multiplyScalar(P.dot(M))).normalize(),y.crossVectors(w,M);const R=y.dot(l[L])<0?-1:1;o.setXYZW(L,b.x,b.y,b.z,R)}for(let L=0,M=T.length;L<M;++L){const S=T[L],R=S.start,C=S.count;for(let B=R,N=R+C;B<N;B+=3)D(e.getX(B+0)),D(e.getX(B+1)),D(e.getX(B+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new jt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let p=0,f=n.count;p<f;p++)n.setXYZ(p,0,0,0);const r=new U,s=new U,o=new U,a=new U,l=new U,c=new U,u=new U,d=new U;if(e)for(let p=0,f=e.count;p<f;p+=3){const g=e.getX(p+0),_=e.getX(p+1),m=e.getX(p+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,_),o.fromBufferAttribute(t,m),u.subVectors(o,s),d.subVectors(r,s),u.cross(d),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,m),a.add(u),l.add(u),c.add(u),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let p=0,f=t.count;p<f;p+=3)r.fromBufferAttribute(t,p+0),s.fromBufferAttribute(t,p+1),o.fromBufferAttribute(t,p+2),u.subVectors(o,s),d.subVectors(r,s),u.cross(d),n.setXYZ(p+0,u.x,u.y,u.z),n.setXYZ(p+1,u.x,u.y,u.z),n.setXYZ(p+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Pt.fromBufferAttribute(e,t),Pt.normalize(),e.setXYZ(t,Pt.x,Pt.y,Pt.z)}toNonIndexed(){function e(a,l){const c=a.array,u=a.itemSize,d=a.normalized,p=new c.constructor(l.length*u);let f=0,g=0;for(let _=0,m=l.length;_<m;_++){a.isInterleavedBufferAttribute?f=l[_]*a.data.stride+a.offset:f=l[_]*u;for(let h=0;h<u;h++)p[g++]=c[f++]}return new jt(p,u,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Ft,n=this.index.array,r=this.attributes;for(const a in r){const l=r[a],c=e(l,n);t.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let u=0,d=c.length;u<d;u++){const p=c[u],f=e(p,n);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let d=0,p=c.length;d<p;d++){const f=c[d];u.push(f.toJSON(e.data))}u.length>0&&(r[l]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const r=e.attributes;for(const c in r){const u=r[c];this.setAttribute(c,u.clone(t))}const s=e.morphAttributes;for(const c in s){const u=[],d=s[c];for(let p=0,f=d.length;p<f;p++)u.push(d[p].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,u=o.length;c<u;c++){const d=o[c];this.addGroup(d.start,d.count,d.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Sl=new rt,li=new Oo,Jr=new sr,yl=new U,Qr=new U,es=new U,ts=new U,da=new U,ns=new U,El=new U,is=new U;class ae extends wt{constructor(e=new Ft,t=new ar){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){const n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(r,e);const a=this.morphTargetInfluences;if(s&&a){ns.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const u=a[l],d=s[l];u!==0&&(da.fromBufferAttribute(d,e),o?ns.addScaledVector(da,u):ns.addScaledVector(da.sub(t),u))}t.add(ns)}return t}raycast(e,t){const n=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Jr.copy(n.boundingSphere),Jr.applyMatrix4(s),li.copy(e.ray).recast(e.near),!(Jr.containsPoint(li.origin)===!1&&(li.intersectSphere(Jr,yl)===null||li.origin.distanceToSquared(yl)>(e.far-e.near)**2))&&(Sl.copy(s).invert(),li.copy(e.ray).applyMatrix4(Sl),!(n.boundingBox!==null&&li.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,li)))}_computeIntersections(e,t,n){let r;const s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,d=s.attributes.normal,p=s.groups,f=s.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,_=p.length;g<_;g++){const m=p[g],h=o[m.materialIndex],T=Math.max(m.start,f.start),b=Math.min(a.count,Math.min(m.start+m.count,f.start+f.count));for(let y=T,P=b;y<P;y+=3){const w=a.getX(y),D=a.getX(y+1),L=a.getX(y+2);r=rs(this,h,e,n,c,u,d,w,D,L),r&&(r.faceIndex=Math.floor(y/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,f.start),_=Math.min(a.count,f.start+f.count);for(let m=g,h=_;m<h;m+=3){const T=a.getX(m),b=a.getX(m+1),y=a.getX(m+2);r=rs(this,o,e,n,c,u,d,T,b,y),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,_=p.length;g<_;g++){const m=p[g],h=o[m.materialIndex],T=Math.max(m.start,f.start),b=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let y=T,P=b;y<P;y+=3){const w=y,D=y+1,L=y+2;r=rs(this,h,e,n,c,u,d,w,D,L),r&&(r.faceIndex=Math.floor(y/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,f.start),_=Math.min(l.count,f.start+f.count);for(let m=g,h=_;m<h;m+=3){const T=m,b=m+1,y=m+2;r=rs(this,o,e,n,c,u,d,T,b,y),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}}}function zd(i,e,t,n,r,s,o,a){let l;if(e.side===Wt?l=n.intersectTriangle(o,s,r,!0,a):l=n.intersectTriangle(r,s,o,e.side===ii,a),l===null)return null;is.copy(a),is.applyMatrix4(i.matrixWorld);const c=t.ray.origin.distanceTo(is);return c<t.near||c>t.far?null:{distance:c,point:is.clone(),object:i}}function rs(i,e,t,n,r,s,o,a,l,c){i.getVertexPosition(a,Qr),i.getVertexPosition(l,es),i.getVertexPosition(c,ts);const u=zd(i,e,t,n,Qr,es,ts,El);if(u){const d=new U;sn.getBarycoord(El,Qr,es,ts,d),r&&(u.uv=sn.getInterpolatedAttribute(r,a,l,c,d,new we)),s&&(u.uv1=sn.getInterpolatedAttribute(s,a,l,c,d,new we)),o&&(u.normal=sn.getInterpolatedAttribute(o,a,l,c,d,new U),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));const p={a,b:l,c,normal:new U,materialIndex:0};sn.getNormal(Qr,es,ts,p.normal),u.face=p,u.barycoord=d}return u}class on extends Ft{constructor(e=1,t=1,n=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:s,depthSegments:o};const a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],u=[],d=[];let p=0,f=0;g("z","y","x",-1,-1,n,t,e,o,s,0),g("z","y","x",1,-1,n,t,-e,o,s,1),g("x","z","y",1,1,e,n,t,r,o,2),g("x","z","y",1,-1,e,n,-t,r,o,3),g("x","y","z",1,-1,e,t,n,r,s,4),g("x","y","z",-1,-1,e,t,-n,r,s,5),this.setIndex(l),this.setAttribute("position",new ht(c,3)),this.setAttribute("normal",new ht(u,3)),this.setAttribute("uv",new ht(d,2));function g(_,m,h,T,b,y,P,w,D,L,M){const S=y/D,R=P/L,C=y/2,B=P/2,N=w/2,z=D+1,F=L+1;let q=0,V=0;const j=new U;for(let ee=0;ee<F;ee++){const ue=ee*R-B;for(let Ce=0;Ce<z;Ce++){const qe=Ce*S-C;j[_]=qe*T,j[m]=ue*b,j[h]=N,c.push(j.x,j.y,j.z),j[_]=0,j[m]=0,j[h]=w>0?1:-1,u.push(j.x,j.y,j.z),d.push(Ce/D),d.push(1-ee/L),q+=1}}for(let ee=0;ee<L;ee++)for(let ue=0;ue<D;ue++){const Ce=p+ue+z*ee,qe=p+ue+z*(ee+1),Ze=p+(ue+1)+z*(ee+1),Q=p+(ue+1)+z*ee;l.push(Ce,qe,Q),l.push(qe,Ze,Q),V+=6}a.addGroup(f,V,M),f+=V,p+=q}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new on(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function nr(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const r=i[t][n];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=r.clone():Array.isArray(r)?e[t][n]=r.slice():e[t][n]=r}}return e}function zt(i){const e={};for(let t=0;t<i.length;t++){const n=nr(i[t]);for(const r in n)e[r]=n[r]}return e}function kd(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function kc(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Ke.workingColorSpace}const Ds={clone:nr,merge:zt};var Hd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Vd=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Gt extends Ei{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Hd,this.fragmentShader=Vd,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=nr(e.uniforms),this.uniformsGroups=kd(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const o=this.uniforms[r].value;o&&o.isTexture?t.uniforms[r]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[r]={type:"m4",value:o.toArray()}:t.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class Hc extends wt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new rt,this.projectionMatrix=new rt,this.projectionMatrixInverse=new rt,this.coordinateSystem=wn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Jn=new U,Tl=new we,bl=new we;class rn extends Hc{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Dr*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Er*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Dr*2*Math.atan(Math.tan(Er*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Jn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Jn.x,Jn.y).multiplyScalar(-e/Jn.z),Jn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Jn.x,Jn.y).multiplyScalar(-e/Jn.z)}getViewSize(e,t){return this.getViewBounds(e,Tl,bl),t.subVectors(bl,Tl)}setViewOffset(e,t,n,r,s,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Er*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,s=-.5*r;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*r/l,t-=o.offsetY*n/c,r*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const Oi=-90,Bi=1;class Gd extends wt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new rn(Oi,Bi,e,t);r.layers=this.layers,this.add(r);const s=new rn(Oi,Bi,e,t);s.layers=this.layers,this.add(s);const o=new rn(Oi,Bi,e,t);o.layers=this.layers,this.add(o);const a=new rn(Oi,Bi,e,t);a.layers=this.layers,this.add(a);const l=new rn(Oi,Bi,e,t);l.layers=this.layers,this.add(l);const c=new rn(Oi,Bi,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,r,s,o,a,l]=t;for(const c of t)this.remove(c);if(e===wn)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Cs)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,l,c,u]=this.children,d=e.getRenderTarget(),p=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,r),e.render(t,s),e.setRenderTarget(n,1,r),e.render(t,o),e.setRenderTarget(n,2,r),e.render(t,a),e.setRenderTarget(n,3,r),e.render(t,l),e.setRenderTarget(n,4,r),e.render(t,c),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,r),e.render(t,u),e.setRenderTarget(d,p,f),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class Vc extends Nt{constructor(e=[],t=Qi,n,r,s,o,a,l,c,u){super(e,t,n,r,s,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Wd extends _n{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new Vc(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},r=new on(5,5,5),s=new Gt({name:"CubemapFromEquirect",uniforms:nr(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Wt,blending:kn});s.uniforms.tEquirect.value=t;const o=new ae(r,s),a=t.minFilter;return t.minFilter===xi&&(t.minFilter=pn),new Gd(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){const s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,r);e.setRenderTarget(s)}}class gt extends wt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Xd={type:"move"};class ha{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new gt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new gt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new U,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new U),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new gt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new U,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new U),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const _ of e.hand.values()){const m=t.getJointPose(_,n),h=this._getHandJoint(c,_);m!==null&&(h.matrix.fromArray(m.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,h.jointRadius=m.radius),h.visible=m!==null}const u=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],p=u.position.distanceTo(d.position),f=.02,g=.005;c.inputState.pinching&&p>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&p<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Xd)))}return a!==null&&(a.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new gt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class zo{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new Ne(e),this.density=t}clone(){return new zo(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class qd extends wt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Cn,this.environmentIntensity=1,this.environmentRotation=new Cn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Yd{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Mo,this.updateRanges=[],this.version=0,this.uuid=Vn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,s=this.stride;r<s;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Vn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Vn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Bt=new U;class Is{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Bt.fromBufferAttribute(this,t),Bt.applyMatrix4(e),this.setXYZ(t,Bt.x,Bt.y,Bt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Bt.fromBufferAttribute(this,t),Bt.applyNormalMatrix(e),this.setXYZ(t,Bt.x,Bt.y,Bt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Bt.fromBufferAttribute(this,t),Bt.transformDirection(e),this.setXYZ(t,Bt.x,Bt.y,Bt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=hn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Qe(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=Qe(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=Qe(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=Qe(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=Qe(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=hn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=hn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=hn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=hn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=Qe(t,this.array),n=Qe(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=Qe(t,this.array),n=Qe(n,this.array),r=Qe(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=Qe(t,this.array),n=Qe(n,this.array),r=Qe(r,this.array),s=Qe(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=s,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const r=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[r+s])}return new jt(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new Is(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const r=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[r+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}class Gc extends Ei{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Ne(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let zi;const fr=new U,ki=new U,Hi=new U,Vi=new we,pr=new we,Wc=new rt,ss=new U,mr=new U,as=new U,wl=new we,fa=new we,Al=new we;class $d extends wt{constructor(e=new Gc){if(super(),this.isSprite=!0,this.type="Sprite",zi===void 0){zi=new Ft;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Yd(t,5);zi.setIndex([0,1,2,0,2,3]),zi.setAttribute("position",new Is(n,3,0,!1)),zi.setAttribute("uv",new Is(n,2,3,!1))}this.geometry=zi,this.material=e,this.center=new we(.5,.5),this.count=1}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),ki.setFromMatrixScale(this.matrixWorld),Wc.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),Hi.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&ki.multiplyScalar(-Hi.z);const n=this.material.rotation;let r,s;n!==0&&(s=Math.cos(n),r=Math.sin(n));const o=this.center;os(ss.set(-.5,-.5,0),Hi,o,ki,r,s),os(mr.set(.5,-.5,0),Hi,o,ki,r,s),os(as.set(.5,.5,0),Hi,o,ki,r,s),wl.set(0,0),fa.set(1,0),Al.set(1,1);let a=e.ray.intersectTriangle(ss,mr,as,!1,fr);if(a===null&&(os(mr.set(-.5,.5,0),Hi,o,ki,r,s),fa.set(0,1),a=e.ray.intersectTriangle(ss,as,mr,!1,fr),a===null))return;const l=e.ray.origin.distanceTo(fr);l<e.near||l>e.far||t.push({distance:l,point:fr.clone(),uv:sn.getInterpolation(fr,ss,mr,as,wl,fa,Al,new we),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function os(i,e,t,n,r,s){Vi.subVectors(i,t).addScalar(.5).multiply(n),r!==void 0?(pr.x=s*Vi.x-r*Vi.y,pr.y=r*Vi.x+s*Vi.y):pr.copy(Vi),i.copy(e),i.x+=pr.x,i.y+=pr.y,i.applyMatrix4(Wc)}class Kd extends Nt{constructor(e=null,t=1,n=1,r,s,o,a,l,c=Zt,u=Zt,d,p){super(null,o,a,l,c,u,r,s,d,p),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Rl extends jt{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const Gi=new rt,Cl=new rt,ls=[],Pl=new yi,Zd=new rt,gr=new ae,_r=new sr;class ko extends ae{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Rl(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let r=0;r<n;r++)this.setMatrixAt(r,Zd)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new yi),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Gi),Pl.copy(e.boundingBox).applyMatrix4(Gi),this.boundingBox.union(Pl)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new sr),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Gi),_r.copy(e.boundingSphere).applyMatrix4(Gi),this.boundingSphere.union(_r)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,s=n.length+1,o=e*s+1;for(let a=0;a<n.length;a++)n[a]=r[o+a]}raycast(e,t){const n=this.matrixWorld,r=this.count;if(gr.geometry=this.geometry,gr.material=this.material,gr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),_r.copy(this.boundingSphere),_r.applyMatrix4(n),e.ray.intersectsSphere(_r)!==!1))for(let s=0;s<r;s++){this.getMatrixAt(s,Gi),Cl.multiplyMatrices(n,Gi),gr.matrixWorld=Cl,gr.raycast(e,ls);for(let o=0,a=ls.length;o<a;o++){const l=ls[o];l.instanceId=s,l.object=this,t.push(l)}ls.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Rl(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new Kd(new Float32Array(r*this.count),r,this.count,Do,bn));const s=this.morphTexture.source.data.data;let o=0;for(let c=0;c<n.length;c++)o+=n[c];const a=this.geometry.morphTargetsRelative?1:1-o,l=r*e;s[l]=a,s.set(n,l+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const pa=new U,jd=new U,Jd=new ke;class Qn{constructor(e=new U(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const r=pa.subVectors(n,t).cross(jd.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(pa),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Jd.getNormalMatrix(e),r=this.coplanarPoint(pa).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const ci=new sr,Qd=new we(.5,.5),cs=new U;class Ho{constructor(e=new Qn,t=new Qn,n=new Qn,r=new Qn,s=new Qn,o=new Qn){this.planes=[e,t,n,r,s,o]}set(e,t,n,r,s,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=wn,n=!1){const r=this.planes,s=e.elements,o=s[0],a=s[1],l=s[2],c=s[3],u=s[4],d=s[5],p=s[6],f=s[7],g=s[8],_=s[9],m=s[10],h=s[11],T=s[12],b=s[13],y=s[14],P=s[15];if(r[0].setComponents(c-o,f-u,h-g,P-T).normalize(),r[1].setComponents(c+o,f+u,h+g,P+T).normalize(),r[2].setComponents(c+a,f+d,h+_,P+b).normalize(),r[3].setComponents(c-a,f-d,h-_,P-b).normalize(),n)r[4].setComponents(l,p,m,y).normalize(),r[5].setComponents(c-l,f-p,h-m,P-y).normalize();else if(r[4].setComponents(c-l,f-p,h-m,P-y).normalize(),t===wn)r[5].setComponents(c+l,f+p,h+m,P+y).normalize();else if(t===Cs)r[5].setComponents(l,p,m,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ci.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ci.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ci)}intersectsSprite(e){ci.center.set(0,0,0);const t=Qd.distanceTo(e.center);return ci.radius=.7071067811865476+t,ci.applyMatrix4(e.matrixWorld),this.intersectsSphere(ci)}intersectsSphere(e){const t=this.planes,n=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const r=t[n];if(cs.x=r.normal.x>0?e.max.x:e.min.x,cs.y=r.normal.y>0?e.max.y:e.min.y,cs.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(cs)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Xc extends Ei{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ne(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Dl=new rt,So=new Oo,us=new sr,ds=new U;class eh extends wt{constructor(e=new Ft,t=new Xc){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,r=this.matrixWorld,s=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),us.copy(n.boundingSphere),us.applyMatrix4(r),us.radius+=s,e.ray.intersectsSphere(us)===!1)return;Dl.copy(r).invert(),So.copy(e.ray).applyMatrix4(Dl);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,d=n.attributes.position;if(c!==null){const p=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let g=p,_=f;g<_;g++){const m=c.getX(g);ds.fromBufferAttribute(d,m),Il(ds,m,l,r,e,t,this)}}else{const p=Math.max(0,o.start),f=Math.min(d.count,o.start+o.count);for(let g=p,_=f;g<_;g++)ds.fromBufferAttribute(d,g),Il(ds,g,l,r,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function Il(i,e,t,n,r,s,o){const a=So.distanceSqToPoint(i);if(a<t){const l=new U;So.closestPointToPoint(i,l),l.applyMatrix4(n);const c=r.ray.origin.distanceTo(l);if(c<r.near||c>r.far)return;s.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class th extends Nt{constructor(e,t,n,r,s,o,a,l,c){super(e,t,n,r,s,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class qc extends Nt{constructor(e,t,n=Si,r,s,o,a=Zt,l=Zt,c,u=Cr,d=1){if(u!==Cr&&u!==Pr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const p={width:e,height:t,depth:d};super(p,r,s,o,a,l,u,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Fo(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Yc extends Nt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Vo extends Ft{constructor(e=1,t=32,n=0,r=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:r},t=Math.max(3,t);const s=[],o=[],a=[],l=[],c=new U,u=new we;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let d=0,p=3;d<=t;d++,p+=3){const f=n+d/t*r;c.x=e*Math.cos(f),c.y=e*Math.sin(f),o.push(c.x,c.y,c.z),a.push(0,0,1),u.x=(o[p]/e+1)/2,u.y=(o[p+1]/e+1)/2,l.push(u.x,u.y)}for(let d=1;d<=t;d++)s.push(d,d+1,0);this.setIndex(s),this.setAttribute("position",new ht(o,3)),this.setAttribute("normal",new ht(a,3)),this.setAttribute("uv",new ht(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Vo(e.radius,e.segments,e.thetaStart,e.thetaLength)}}class Ti extends Ft{constructor(e=1,t=1,n=1,r=32,s=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:l};const c=this;r=Math.floor(r),s=Math.floor(s);const u=[],d=[],p=[],f=[];let g=0;const _=[],m=n/2;let h=0;T(),o===!1&&(e>0&&b(!0),t>0&&b(!1)),this.setIndex(u),this.setAttribute("position",new ht(d,3)),this.setAttribute("normal",new ht(p,3)),this.setAttribute("uv",new ht(f,2));function T(){const y=new U,P=new U;let w=0;const D=(t-e)/n;for(let L=0;L<=s;L++){const M=[],S=L/s,R=S*(t-e)+e;for(let C=0;C<=r;C++){const B=C/r,N=B*l+a,z=Math.sin(N),F=Math.cos(N);P.x=R*z,P.y=-S*n+m,P.z=R*F,d.push(P.x,P.y,P.z),y.set(z,D,F).normalize(),p.push(y.x,y.y,y.z),f.push(B,1-S),M.push(g++)}_.push(M)}for(let L=0;L<r;L++)for(let M=0;M<s;M++){const S=_[M][L],R=_[M+1][L],C=_[M+1][L+1],B=_[M][L+1];(e>0||M!==0)&&(u.push(S,R,B),w+=3),(t>0||M!==s-1)&&(u.push(R,C,B),w+=3)}c.addGroup(h,w,0),h+=w}function b(y){const P=g,w=new we,D=new U;let L=0;const M=y===!0?e:t,S=y===!0?1:-1;for(let C=1;C<=r;C++)d.push(0,m*S,0),p.push(0,S,0),f.push(.5,.5),g++;const R=g;for(let C=0;C<=r;C++){const N=C/r*l+a,z=Math.cos(N),F=Math.sin(N);D.x=M*F,D.y=m*S,D.z=M*z,d.push(D.x,D.y,D.z),p.push(0,S,0),w.x=z*.5+.5,w.y=F*.5*S+.5,f.push(w.x,w.y),g++}for(let C=0;C<r;C++){const B=P+C,N=R+C;y===!0?u.push(N,N+1,B):u.push(N+1,N,B),L+=3}c.addGroup(h,L,y===!0?1:2),h+=L}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ti(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Pn extends Ft{constructor(e=1,t=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};const s=e/2,o=t/2,a=Math.floor(n),l=Math.floor(r),c=a+1,u=l+1,d=e/a,p=t/l,f=[],g=[],_=[],m=[];for(let h=0;h<u;h++){const T=h*p-o;for(let b=0;b<c;b++){const y=b*d-s;g.push(y,-T,0),_.push(0,0,1),m.push(b/a),m.push(1-h/l)}}for(let h=0;h<l;h++)for(let T=0;T<a;T++){const b=T+c*h,y=T+c*(h+1),P=T+1+c*(h+1),w=T+1+c*h;f.push(b,y,w),f.push(y,P,w)}this.setIndex(f),this.setAttribute("position",new ht(g,3)),this.setAttribute("normal",new ht(_,3)),this.setAttribute("uv",new ht(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Pn(e.width,e.height,e.widthSegments,e.heightSegments)}}class Or extends Ft{constructor(e=.5,t=1,n=32,r=1,s=0,o=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:r,thetaStart:s,thetaLength:o},n=Math.max(3,n),r=Math.max(1,r);const a=[],l=[],c=[],u=[];let d=e;const p=(t-e)/r,f=new U,g=new we;for(let _=0;_<=r;_++){for(let m=0;m<=n;m++){const h=s+m/n*o;f.x=d*Math.cos(h),f.y=d*Math.sin(h),l.push(f.x,f.y,f.z),c.push(0,0,1),g.x=(f.x/t+1)/2,g.y=(f.y/t+1)/2,u.push(g.x,g.y)}d+=p}for(let _=0;_<r;_++){const m=_*(n+1);for(let h=0;h<n;h++){const T=h+m,b=T,y=T+n+1,P=T+n+2,w=T+1;a.push(b,y,w),a.push(y,P,w)}}this.setIndex(a),this.setAttribute("position",new ht(l,3)),this.setAttribute("normal",new ht(c,3)),this.setAttribute("uv",new ht(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Or(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}}class Go extends Ft{constructor(e=1,t=32,n=16,r=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:s,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(o+a,Math.PI);let c=0;const u=[],d=new U,p=new U,f=[],g=[],_=[],m=[];for(let h=0;h<=n;h++){const T=[],b=h/n;let y=0;h===0&&o===0?y=.5/t:h===n&&l===Math.PI&&(y=-.5/t);for(let P=0;P<=t;P++){const w=P/t;d.x=-e*Math.cos(r+w*s)*Math.sin(o+b*a),d.y=e*Math.cos(o+b*a),d.z=e*Math.sin(r+w*s)*Math.sin(o+b*a),g.push(d.x,d.y,d.z),p.copy(d).normalize(),_.push(p.x,p.y,p.z),m.push(w+y,1-b),T.push(c++)}u.push(T)}for(let h=0;h<n;h++)for(let T=0;T<t;T++){const b=u[h][T+1],y=u[h][T],P=u[h+1][T],w=u[h+1][T+1];(h!==0||o>0)&&f.push(b,y,w),(h!==n-1||l<Math.PI)&&f.push(y,P,w)}this.setIndex(f),this.setAttribute("position",new ht(g,3)),this.setAttribute("normal",new ht(_,3)),this.setAttribute("uv",new ht(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Go(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Wo extends Ft{constructor(e=1,t=.4,n=12,r=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:r,arc:s},n=Math.floor(n),r=Math.floor(r);const o=[],a=[],l=[],c=[],u=new U,d=new U,p=new U;for(let f=0;f<=n;f++)for(let g=0;g<=r;g++){const _=g/r*s,m=f/n*Math.PI*2;d.x=(e+t*Math.cos(m))*Math.cos(_),d.y=(e+t*Math.cos(m))*Math.sin(_),d.z=t*Math.sin(m),a.push(d.x,d.y,d.z),u.x=e*Math.cos(_),u.y=e*Math.sin(_),p.subVectors(d,u).normalize(),l.push(p.x,p.y,p.z),c.push(g/r),c.push(f/n)}for(let f=1;f<=n;f++)for(let g=1;g<=r;g++){const _=(r+1)*f+g-1,m=(r+1)*(f-1)+g-1,h=(r+1)*(f-1)+g,T=(r+1)*f+g;o.push(_,m,T),o.push(m,h,T)}this.setIndex(o),this.setAttribute("position",new ht(a,3)),this.setAttribute("normal",new ht(l,3)),this.setAttribute("uv",new ht(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Wo(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class it extends Ei{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ne(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ne(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Lc,this.normalScale=new we(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Cn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class nh extends Ei{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=$u,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class ih extends Ei{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class Xo extends wt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ne(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class rh extends Xo{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(wt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ne(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const ma=new rt,Ll=new U,Ul=new U;class $c{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new we(512,512),this.mapType=Rn,this.map=null,this.mapPass=null,this.matrix=new rt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ho,this._frameExtents=new we(1,1),this._viewportCount=1,this._viewports=[new nt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Ll.setFromMatrixPosition(e.matrixWorld),t.position.copy(Ll),Ul.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Ul),t.updateMatrixWorld(),ma.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ma,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(ma)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Nl=new rt,vr=new U,ga=new U;class sh extends $c{constructor(){super(new rn(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new we(4,2),this._viewportCount=6,this._viewports=[new nt(2,1,1,1),new nt(0,1,1,1),new nt(3,1,1,1),new nt(1,1,1,1),new nt(3,0,1,1),new nt(1,0,1,1)],this._cubeDirections=[new U(1,0,0),new U(-1,0,0),new U(0,0,1),new U(0,0,-1),new U(0,1,0),new U(0,-1,0)],this._cubeUps=[new U(0,1,0),new U(0,1,0),new U(0,1,0),new U(0,1,0),new U(0,0,1),new U(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,r=this.matrix,s=e.distance||n.far;s!==n.far&&(n.far=s,n.updateProjectionMatrix()),vr.setFromMatrixPosition(e.matrixWorld),n.position.copy(vr),ga.copy(n.position),ga.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(ga),n.updateMatrixWorld(),r.makeTranslation(-vr.x,-vr.y,-vr.z),Nl.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Nl,n.coordinateSystem,n.reversedDepth)}}class qo extends Xo{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=r,this.shadow=new sh}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class Os extends Hc{constructor(e=-1,t=1,n=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=n-e,o=n+e,a=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class ah extends $c{constructor(){super(new Os(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class oh extends Xo{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(wt.DEFAULT_UP),this.updateMatrix(),this.target=new wt,this.shadow=new ah}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class lh extends rn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class ch{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const Fl=new rt;class uh{constructor(e,t,n=0,r=1/0){this.ray=new Oo(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new Bo,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Fl.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Fl),this}intersectObject(e,t=!0,n=[]){return yo(e,this,n,t),n.sort(Ol),n}intersectObjects(e,t=!0,n=[]){for(let r=0,s=e.length;r<s;r++)yo(e[r],this,n,t);return n.sort(Ol),n}}function Ol(i,e){return i.distance-e.distance}function yo(i,e,t,n){let r=!0;if(i.layers.test(e.layers)&&i.raycast(e,t)===!1&&(r=!1),r===!0&&n===!0){const s=i.children;for(let o=0,a=s.length;o<a;o++)yo(s[o],e,t,!0)}}function Bl(i,e,t,n){const r=dh(n);switch(t){case Pc:return i*e;case Do:return i*e/r.components*r.byteLength;case Io:return i*e/r.components*r.byteLength;case Ic:return i*e*2/r.components*r.byteLength;case Lo:return i*e*2/r.components*r.byteLength;case Dc:return i*e*3/r.components*r.byteLength;case mn:return i*e*4/r.components*r.byteLength;case Uo:return i*e*4/r.components*r.byteLength;case xs:case Ms:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Ss:case ys:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case qa:case $a:return Math.max(i,16)*Math.max(e,8)/4;case Xa:case Ya:return Math.max(i,8)*Math.max(e,8)/2;case Ka:case Za:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case ja:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ja:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Qa:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case eo:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case to:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case no:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case io:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case ro:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case so:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case ao:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case oo:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case lo:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case co:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case uo:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case ho:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case fo:case po:case mo:return Math.ceil(i/4)*Math.ceil(e/4)*16;case go:case _o:return Math.ceil(i/4)*Math.ceil(e/4)*8;case vo:case xo:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function dh(i){switch(i){case Rn:case wc:return{byteLength:1,components:1};case Ar:case Ac:case Hn:return{byteLength:2,components:1};case Co:case Po:return{byteLength:2,components:4};case Si:case Ro:case bn:return{byteLength:4,components:1};case Rc:case Cc:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ao}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ao);function Kc(){let i=null,e=!1,t=null,n=null;function r(s,o){t(s,o),n=i.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(r),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){i=s}}}function hh(i){const e=new WeakMap;function t(a,l){const c=a.array,u=a.usage,d=c.byteLength,p=i.createBuffer();i.bindBuffer(l,p),i.bufferData(l,c,u),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:p,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,c){const u=l.array,d=l.updateRanges;if(i.bindBuffer(c,a),d.length===0)i.bufferSubData(c,0,u);else{d.sort((f,g)=>f.start-g.start);let p=0;for(let f=1;f<d.length;f++){const g=d[p],_=d[f];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++p,d[p]=_)}d.length=p+1;for(let f=0,g=d.length;f<g;f++){const _=d[f];i.bufferSubData(c,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(i.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:r,remove:s,update:o}}var fh=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ph=`#ifdef USE_ALPHAHASH
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
#endif`,mh=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,gh=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,_h=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,vh=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,xh=`#ifdef USE_AOMAP
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
#endif`,Mh=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Sh=`#ifdef USE_BATCHING
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
#endif`,yh=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Eh=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Th=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bh=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,wh=`#ifdef USE_IRIDESCENCE
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
#endif`,Ah=`#ifdef USE_BUMPMAP
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
#endif`,Rh=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Ch=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Ph=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Dh=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ih=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Lh=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Uh=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Nh=`#if defined( USE_COLOR_ALPHA )
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
#endif`,Fh=`#define PI 3.141592653589793
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
} // validated`,Oh=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Bh=`vec3 transformedNormal = objectNormal;
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
#endif`,zh=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,kh=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Hh=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Vh=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Gh="gl_FragColor = linearToOutputTexel( gl_FragColor );",Wh=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Xh=`#ifdef USE_ENVMAP
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
#endif`,qh=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Yh=`#ifdef USE_ENVMAP
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
#endif`,$h=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Kh=`#ifdef USE_ENVMAP
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
#endif`,Zh=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,jh=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Jh=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Qh=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ef=`#ifdef USE_GRADIENTMAP
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
}`,tf=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,nf=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,rf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,sf=`uniform bool receiveShadow;
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
#endif`,af=`#ifdef USE_ENVMAP
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
#endif`,of=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,cf=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,uf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,df=`PhysicalMaterial material;
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
#endif`,hf=`struct PhysicalMaterial {
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
}`,ff=`
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
#endif`,pf=`#if defined( RE_IndirectDiffuse )
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
#endif`,mf=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,gf=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,_f=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,vf=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,xf=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Mf=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Sf=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,yf=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Ef=`#if defined( USE_POINTS_UV )
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
#endif`,Tf=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,bf=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,wf=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Af=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Rf=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Cf=`#ifdef USE_MORPHTARGETS
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
#endif`,Pf=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Df=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,If=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Lf=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Uf=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Nf=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Ff=`#ifdef USE_NORMALMAP
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
#endif`,Of=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Bf=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,zf=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,kf=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Hf=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Vf=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,Gf=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Wf=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Xf=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,qf=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Yf=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,$f=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Kf=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Zf=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,jf=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Jf=`float getShadowMask() {
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
}`,Qf=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,ep=`#ifdef USE_SKINNING
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
#endif`,tp=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,np=`#ifdef USE_SKINNING
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
#endif`,ip=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,rp=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,sp=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,ap=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,op=`#ifdef USE_TRANSMISSION
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
#endif`,lp=`#ifdef USE_TRANSMISSION
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
#endif`,cp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,up=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,dp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,hp=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const fp=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,pp=`uniform sampler2D t2D;
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
}`,mp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,gp=`#ifdef ENVMAP_TYPE_CUBE
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
}`,_p=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,vp=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xp=`#include <common>
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
}`,Mp=`#if DEPTH_PACKING == 3200
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
}`,Sp=`#define DISTANCE
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
}`,yp=`#define DISTANCE
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
}`,Ep=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Tp=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,bp=`uniform float scale;
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
}`,wp=`uniform vec3 diffuse;
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
}`,Ap=`#include <common>
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
}`,Rp=`uniform vec3 diffuse;
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
}`,Cp=`#define LAMBERT
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
}`,Pp=`#define LAMBERT
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
}`,Dp=`#define MATCAP
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
}`,Ip=`#define MATCAP
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
}`,Lp=`#define NORMAL
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
}`,Up=`#define NORMAL
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
}`,Np=`#define PHONG
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
}`,Fp=`#define PHONG
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
}`,Op=`#define STANDARD
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
}`,Bp=`#define STANDARD
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
}`,zp=`#define TOON
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
}`,kp=`#define TOON
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
}`,Hp=`uniform float size;
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
}`,Vp=`uniform vec3 diffuse;
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
}`,Gp=`#include <common>
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
}`,Wp=`uniform vec3 color;
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
}`,Xp=`uniform float rotation;
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
}`,qp=`uniform vec3 diffuse;
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
}`,Ve={alphahash_fragment:fh,alphahash_pars_fragment:ph,alphamap_fragment:mh,alphamap_pars_fragment:gh,alphatest_fragment:_h,alphatest_pars_fragment:vh,aomap_fragment:xh,aomap_pars_fragment:Mh,batching_pars_vertex:Sh,batching_vertex:yh,begin_vertex:Eh,beginnormal_vertex:Th,bsdfs:bh,iridescence_fragment:wh,bumpmap_pars_fragment:Ah,clipping_planes_fragment:Rh,clipping_planes_pars_fragment:Ch,clipping_planes_pars_vertex:Ph,clipping_planes_vertex:Dh,color_fragment:Ih,color_pars_fragment:Lh,color_pars_vertex:Uh,color_vertex:Nh,common:Fh,cube_uv_reflection_fragment:Oh,defaultnormal_vertex:Bh,displacementmap_pars_vertex:zh,displacementmap_vertex:kh,emissivemap_fragment:Hh,emissivemap_pars_fragment:Vh,colorspace_fragment:Gh,colorspace_pars_fragment:Wh,envmap_fragment:Xh,envmap_common_pars_fragment:qh,envmap_pars_fragment:Yh,envmap_pars_vertex:$h,envmap_physical_pars_fragment:af,envmap_vertex:Kh,fog_vertex:Zh,fog_pars_vertex:jh,fog_fragment:Jh,fog_pars_fragment:Qh,gradientmap_pars_fragment:ef,lightmap_pars_fragment:tf,lights_lambert_fragment:nf,lights_lambert_pars_fragment:rf,lights_pars_begin:sf,lights_toon_fragment:of,lights_toon_pars_fragment:lf,lights_phong_fragment:cf,lights_phong_pars_fragment:uf,lights_physical_fragment:df,lights_physical_pars_fragment:hf,lights_fragment_begin:ff,lights_fragment_maps:pf,lights_fragment_end:mf,logdepthbuf_fragment:gf,logdepthbuf_pars_fragment:_f,logdepthbuf_pars_vertex:vf,logdepthbuf_vertex:xf,map_fragment:Mf,map_pars_fragment:Sf,map_particle_fragment:yf,map_particle_pars_fragment:Ef,metalnessmap_fragment:Tf,metalnessmap_pars_fragment:bf,morphinstance_vertex:wf,morphcolor_vertex:Af,morphnormal_vertex:Rf,morphtarget_pars_vertex:Cf,morphtarget_vertex:Pf,normal_fragment_begin:Df,normal_fragment_maps:If,normal_pars_fragment:Lf,normal_pars_vertex:Uf,normal_vertex:Nf,normalmap_pars_fragment:Ff,clearcoat_normal_fragment_begin:Of,clearcoat_normal_fragment_maps:Bf,clearcoat_pars_fragment:zf,iridescence_pars_fragment:kf,opaque_fragment:Hf,packing:Vf,premultiplied_alpha_fragment:Gf,project_vertex:Wf,dithering_fragment:Xf,dithering_pars_fragment:qf,roughnessmap_fragment:Yf,roughnessmap_pars_fragment:$f,shadowmap_pars_fragment:Kf,shadowmap_pars_vertex:Zf,shadowmap_vertex:jf,shadowmask_pars_fragment:Jf,skinbase_vertex:Qf,skinning_pars_vertex:ep,skinning_vertex:tp,skinnormal_vertex:np,specularmap_fragment:ip,specularmap_pars_fragment:rp,tonemapping_fragment:sp,tonemapping_pars_fragment:ap,transmission_fragment:op,transmission_pars_fragment:lp,uv_pars_fragment:cp,uv_pars_vertex:up,uv_vertex:dp,worldpos_vertex:hp,background_vert:fp,background_frag:pp,backgroundCube_vert:mp,backgroundCube_frag:gp,cube_vert:_p,cube_frag:vp,depth_vert:xp,depth_frag:Mp,distanceRGBA_vert:Sp,distanceRGBA_frag:yp,equirect_vert:Ep,equirect_frag:Tp,linedashed_vert:bp,linedashed_frag:wp,meshbasic_vert:Ap,meshbasic_frag:Rp,meshlambert_vert:Cp,meshlambert_frag:Pp,meshmatcap_vert:Dp,meshmatcap_frag:Ip,meshnormal_vert:Lp,meshnormal_frag:Up,meshphong_vert:Np,meshphong_frag:Fp,meshphysical_vert:Op,meshphysical_frag:Bp,meshtoon_vert:zp,meshtoon_frag:kp,points_vert:Hp,points_frag:Vp,shadow_vert:Gp,shadow_frag:Wp,sprite_vert:Xp,sprite_frag:qp},le={common:{diffuse:{value:new Ne(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new ke},alphaMap:{value:null},alphaMapTransform:{value:new ke},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new ke}},envmap:{envMap:{value:null},envMapRotation:{value:new ke},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new ke}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new ke}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new ke},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new ke},normalScale:{value:new we(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new ke},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new ke}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new ke}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new ke}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ne(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ne(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new ke},alphaTest:{value:0},uvTransform:{value:new ke}},sprite:{diffuse:{value:new Ne(16777215)},opacity:{value:1},center:{value:new we(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new ke},alphaMap:{value:null},alphaMapTransform:{value:new ke},alphaTest:{value:0}}},En={basic:{uniforms:zt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.fog]),vertexShader:Ve.meshbasic_vert,fragmentShader:Ve.meshbasic_frag},lambert:{uniforms:zt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Ne(0)}}]),vertexShader:Ve.meshlambert_vert,fragmentShader:Ve.meshlambert_frag},phong:{uniforms:zt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Ne(0)},specular:{value:new Ne(1118481)},shininess:{value:30}}]),vertexShader:Ve.meshphong_vert,fragmentShader:Ve.meshphong_frag},standard:{uniforms:zt([le.common,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.roughnessmap,le.metalnessmap,le.fog,le.lights,{emissive:{value:new Ne(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ve.meshphysical_vert,fragmentShader:Ve.meshphysical_frag},toon:{uniforms:zt([le.common,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.gradientmap,le.fog,le.lights,{emissive:{value:new Ne(0)}}]),vertexShader:Ve.meshtoon_vert,fragmentShader:Ve.meshtoon_frag},matcap:{uniforms:zt([le.common,le.bumpmap,le.normalmap,le.displacementmap,le.fog,{matcap:{value:null}}]),vertexShader:Ve.meshmatcap_vert,fragmentShader:Ve.meshmatcap_frag},points:{uniforms:zt([le.points,le.fog]),vertexShader:Ve.points_vert,fragmentShader:Ve.points_frag},dashed:{uniforms:zt([le.common,le.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ve.linedashed_vert,fragmentShader:Ve.linedashed_frag},depth:{uniforms:zt([le.common,le.displacementmap]),vertexShader:Ve.depth_vert,fragmentShader:Ve.depth_frag},normal:{uniforms:zt([le.common,le.bumpmap,le.normalmap,le.displacementmap,{opacity:{value:1}}]),vertexShader:Ve.meshnormal_vert,fragmentShader:Ve.meshnormal_frag},sprite:{uniforms:zt([le.sprite,le.fog]),vertexShader:Ve.sprite_vert,fragmentShader:Ve.sprite_frag},background:{uniforms:{uvTransform:{value:new ke},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ve.background_vert,fragmentShader:Ve.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new ke}},vertexShader:Ve.backgroundCube_vert,fragmentShader:Ve.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ve.cube_vert,fragmentShader:Ve.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ve.equirect_vert,fragmentShader:Ve.equirect_frag},distanceRGBA:{uniforms:zt([le.common,le.displacementmap,{referencePosition:{value:new U},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ve.distanceRGBA_vert,fragmentShader:Ve.distanceRGBA_frag},shadow:{uniforms:zt([le.lights,le.fog,{color:{value:new Ne(0)},opacity:{value:1}}]),vertexShader:Ve.shadow_vert,fragmentShader:Ve.shadow_frag}};En.physical={uniforms:zt([En.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new ke},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new ke},clearcoatNormalScale:{value:new we(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new ke},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new ke},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new ke},sheen:{value:0},sheenColor:{value:new Ne(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new ke},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new ke},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new ke},transmissionSamplerSize:{value:new we},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new ke},attenuationDistance:{value:0},attenuationColor:{value:new Ne(0)},specularColor:{value:new Ne(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new ke},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new ke},anisotropyVector:{value:new we},anisotropyMap:{value:null},anisotropyMapTransform:{value:new ke}}]),vertexShader:Ve.meshphysical_vert,fragmentShader:Ve.meshphysical_frag};const hs={r:0,b:0,g:0},ui=new Cn,Yp=new rt;function $p(i,e,t,n,r,s,o){const a=new Ne(0);let l=s===!0?0:1,c,u,d=null,p=0,f=null;function g(b){let y=b.isScene===!0?b.background:null;return y&&y.isTexture&&(y=(b.backgroundBlurriness>0?t:e).get(y)),y}function _(b){let y=!1;const P=g(b);P===null?h(a,l):P&&P.isColor&&(h(P,1),y=!0);const w=i.xr.getEnvironmentBlendMode();w==="additive"?n.buffers.color.setClear(0,0,0,1,o):w==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(i.autoClear||y)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(b,y){const P=g(y);P&&(P.isCubeTexture||P.mapping===Fs)?(u===void 0&&(u=new ae(new on(1,1,1),new Gt({name:"BackgroundCubeMaterial",uniforms:nr(En.backgroundCube.uniforms),vertexShader:En.backgroundCube.vertexShader,fragmentShader:En.backgroundCube.fragmentShader,side:Wt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(w,D,L){this.matrixWorld.copyPosition(L.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),ui.copy(y.backgroundRotation),ui.x*=-1,ui.y*=-1,ui.z*=-1,P.isCubeTexture&&P.isRenderTargetTexture===!1&&(ui.y*=-1,ui.z*=-1),u.material.uniforms.envMap.value=P,u.material.uniforms.flipEnvMap.value=P.isCubeTexture&&P.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(Yp.makeRotationFromEuler(ui)),u.material.toneMapped=Ke.getTransfer(P.colorSpace)!==tt,(d!==P||p!==P.version||f!==i.toneMapping)&&(u.material.needsUpdate=!0,d=P,p=P.version,f=i.toneMapping),u.layers.enableAll(),b.unshift(u,u.geometry,u.material,0,0,null)):P&&P.isTexture&&(c===void 0&&(c=new ae(new Pn(2,2),new Gt({name:"BackgroundMaterial",uniforms:nr(En.background.uniforms),vertexShader:En.background.vertexShader,fragmentShader:En.background.fragmentShader,side:ii,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=P,c.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,c.material.toneMapped=Ke.getTransfer(P.colorSpace)!==tt,P.matrixAutoUpdate===!0&&P.updateMatrix(),c.material.uniforms.uvTransform.value.copy(P.matrix),(d!==P||p!==P.version||f!==i.toneMapping)&&(c.material.needsUpdate=!0,d=P,p=P.version,f=i.toneMapping),c.layers.enableAll(),b.unshift(c,c.geometry,c.material,0,0,null))}function h(b,y){b.getRGB(hs,kc(i)),n.buffers.color.setClear(hs.r,hs.g,hs.b,y,o)}function T(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(b,y=1){a.set(b),l=y,h(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(b){l=b,h(a,l)},render:_,addToRenderList:m,dispose:T}}function Kp(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=p(null);let s=r,o=!1;function a(S,R,C,B,N){let z=!1;const F=d(B,C,R);s!==F&&(s=F,c(s.object)),z=f(S,B,C,N),z&&g(S,B,C,N),N!==null&&e.update(N,i.ELEMENT_ARRAY_BUFFER),(z||o)&&(o=!1,y(S,R,C,B),N!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(N).buffer))}function l(){return i.createVertexArray()}function c(S){return i.bindVertexArray(S)}function u(S){return i.deleteVertexArray(S)}function d(S,R,C){const B=C.wireframe===!0;let N=n[S.id];N===void 0&&(N={},n[S.id]=N);let z=N[R.id];z===void 0&&(z={},N[R.id]=z);let F=z[B];return F===void 0&&(F=p(l()),z[B]=F),F}function p(S){const R=[],C=[],B=[];for(let N=0;N<t;N++)R[N]=0,C[N]=0,B[N]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:R,enabledAttributes:C,attributeDivisors:B,object:S,attributes:{},index:null}}function f(S,R,C,B){const N=s.attributes,z=R.attributes;let F=0;const q=C.getAttributes();for(const V in q)if(q[V].location>=0){const ee=N[V];let ue=z[V];if(ue===void 0&&(V==="instanceMatrix"&&S.instanceMatrix&&(ue=S.instanceMatrix),V==="instanceColor"&&S.instanceColor&&(ue=S.instanceColor)),ee===void 0||ee.attribute!==ue||ue&&ee.data!==ue.data)return!0;F++}return s.attributesNum!==F||s.index!==B}function g(S,R,C,B){const N={},z=R.attributes;let F=0;const q=C.getAttributes();for(const V in q)if(q[V].location>=0){let ee=z[V];ee===void 0&&(V==="instanceMatrix"&&S.instanceMatrix&&(ee=S.instanceMatrix),V==="instanceColor"&&S.instanceColor&&(ee=S.instanceColor));const ue={};ue.attribute=ee,ee&&ee.data&&(ue.data=ee.data),N[V]=ue,F++}s.attributes=N,s.attributesNum=F,s.index=B}function _(){const S=s.newAttributes;for(let R=0,C=S.length;R<C;R++)S[R]=0}function m(S){h(S,0)}function h(S,R){const C=s.newAttributes,B=s.enabledAttributes,N=s.attributeDivisors;C[S]=1,B[S]===0&&(i.enableVertexAttribArray(S),B[S]=1),N[S]!==R&&(i.vertexAttribDivisor(S,R),N[S]=R)}function T(){const S=s.newAttributes,R=s.enabledAttributes;for(let C=0,B=R.length;C<B;C++)R[C]!==S[C]&&(i.disableVertexAttribArray(C),R[C]=0)}function b(S,R,C,B,N,z,F){F===!0?i.vertexAttribIPointer(S,R,C,N,z):i.vertexAttribPointer(S,R,C,B,N,z)}function y(S,R,C,B){_();const N=B.attributes,z=C.getAttributes(),F=R.defaultAttributeValues;for(const q in z){const V=z[q];if(V.location>=0){let j=N[q];if(j===void 0&&(q==="instanceMatrix"&&S.instanceMatrix&&(j=S.instanceMatrix),q==="instanceColor"&&S.instanceColor&&(j=S.instanceColor)),j!==void 0){const ee=j.normalized,ue=j.itemSize,Ce=e.get(j);if(Ce===void 0)continue;const qe=Ce.buffer,Ze=Ce.type,Q=Ce.bytesPerElement,H=Ze===i.INT||Ze===i.UNSIGNED_INT||j.gpuType===Ro;if(j.isInterleavedBufferAttribute){const $=j.data,de=$.stride,Ae=j.offset;if($.isInstancedInterleavedBuffer){for(let xe=0;xe<V.locationSize;xe++)h(V.location+xe,$.meshPerAttribute);S.isInstancedMesh!==!0&&B._maxInstanceCount===void 0&&(B._maxInstanceCount=$.meshPerAttribute*$.count)}else for(let xe=0;xe<V.locationSize;xe++)m(V.location+xe);i.bindBuffer(i.ARRAY_BUFFER,qe);for(let xe=0;xe<V.locationSize;xe++)b(V.location+xe,ue/V.locationSize,Ze,ee,de*Q,(Ae+ue/V.locationSize*xe)*Q,H)}else{if(j.isInstancedBufferAttribute){for(let $=0;$<V.locationSize;$++)h(V.location+$,j.meshPerAttribute);S.isInstancedMesh!==!0&&B._maxInstanceCount===void 0&&(B._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let $=0;$<V.locationSize;$++)m(V.location+$);i.bindBuffer(i.ARRAY_BUFFER,qe);for(let $=0;$<V.locationSize;$++)b(V.location+$,ue/V.locationSize,Ze,ee,ue*Q,ue/V.locationSize*$*Q,H)}}else if(F!==void 0){const ee=F[q];if(ee!==void 0)switch(ee.length){case 2:i.vertexAttrib2fv(V.location,ee);break;case 3:i.vertexAttrib3fv(V.location,ee);break;case 4:i.vertexAttrib4fv(V.location,ee);break;default:i.vertexAttrib1fv(V.location,ee)}}}}T()}function P(){L();for(const S in n){const R=n[S];for(const C in R){const B=R[C];for(const N in B)u(B[N].object),delete B[N];delete R[C]}delete n[S]}}function w(S){if(n[S.id]===void 0)return;const R=n[S.id];for(const C in R){const B=R[C];for(const N in B)u(B[N].object),delete B[N];delete R[C]}delete n[S.id]}function D(S){for(const R in n){const C=n[R];if(C[S.id]===void 0)continue;const B=C[S.id];for(const N in B)u(B[N].object),delete B[N];delete C[S.id]}}function L(){M(),o=!0,s!==r&&(s=r,c(s.object))}function M(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:L,resetDefaultState:M,dispose:P,releaseStatesOfGeometry:w,releaseStatesOfProgram:D,initAttributes:_,enableAttribute:m,disableUnusedAttributes:T}}function Zp(i,e,t){let n;function r(c){n=c}function s(c,u){i.drawArrays(n,c,u),t.update(u,n,1)}function o(c,u,d){d!==0&&(i.drawArraysInstanced(n,c,u,d),t.update(u,n,d))}function a(c,u,d){if(d===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,u,0,d);let f=0;for(let g=0;g<d;g++)f+=u[g];t.update(f,n,1)}function l(c,u,d,p){if(d===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<c.length;g++)o(c[g],u[g],p[g]);else{f.multiDrawArraysInstancedWEBGL(n,c,0,u,0,p,0,d);let g=0;for(let _=0;_<d;_++)g+=u[_]*p[_];t.update(g,n,1)}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function jp(i,e,t,n){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const D=e.get("EXT_texture_filter_anisotropic");r=i.getParameter(D.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(D){return!(D!==mn&&n.convert(D)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(D){const L=D===Hn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(D!==Rn&&n.convert(D)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&D!==bn&&!L)}function l(D){if(D==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";D="mediump"}return D==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const u=l(c);u!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const d=t.logarithmicDepthBuffer===!0,p=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),h=i.getParameter(i.MAX_VERTEX_ATTRIBS),T=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),b=i.getParameter(i.MAX_VARYING_VECTORS),y=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),P=g>0,w=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:p,maxTextures:f,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:m,maxAttributes:h,maxVertexUniforms:T,maxVaryings:b,maxFragmentUniforms:y,vertexTextures:P,maxSamples:w}}function Jp(i){const e=this;let t=null,n=0,r=!1,s=!1;const o=new Qn,a=new ke,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,p){const f=d.length!==0||p||n!==0||r;return r=p,n=d.length,f},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,p){t=u(d,p,0)},this.setState=function(d,p,f){const g=d.clippingPlanes,_=d.clipIntersection,m=d.clipShadows,h=i.get(d);if(!r||g===null||g.length===0||s&&!m)s?u(null):c();else{const T=s?0:n,b=T*4;let y=h.clippingState||null;l.value=y,y=u(g,p,b,f);for(let P=0;P!==b;++P)y[P]=t[P];h.clippingState=y,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=T}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(d,p,f,g){const _=d!==null?d.length:0;let m=null;if(_!==0){if(m=l.value,g!==!0||m===null){const h=f+_*4,T=p.matrixWorldInverse;a.getNormalMatrix(T),(m===null||m.length<h)&&(m=new Float32Array(h));for(let b=0,y=f;b!==_;++b,y+=4)o.copy(d[b]).applyMatrix4(T,a),o.normal.toArray(m,y),m[y+3]=o.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,m}}function Qp(i){let e=new WeakMap;function t(o,a){return a===Ha?o.mapping=Qi:a===Va&&(o.mapping=er),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===Ha||a===Va)if(e.has(o)){const l=e.get(o).texture;return t(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new Wd(l.height);return c.fromEquirectangularTexture(i,o),e.set(o,c),o.addEventListener("dispose",r),t(c.texture,o.mapping)}else return null}}return o}function r(o){const a=o.target;a.removeEventListener("dispose",r);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}const qi=4,zl=[.125,.215,.35,.446,.526,.582],mi=20,_a=new Os,kl=new Ne;let va=null,xa=0,Ma=0,Sa=!1;const fi=(1+Math.sqrt(5))/2,Wi=1/fi,Hl=[new U(-fi,Wi,0),new U(fi,Wi,0),new U(-Wi,0,fi),new U(Wi,0,fi),new U(0,fi,-Wi),new U(0,fi,Wi),new U(-1,1,-1),new U(1,1,-1),new U(-1,1,1),new U(1,1,1)],em=new U;class Vl{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,r=100,s={}){const{size:o=256,position:a=em}=s;va=this._renderer.getRenderTarget(),xa=this._renderer.getActiveCubeFace(),Ma=this._renderer.getActiveMipmapLevel(),Sa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,r,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Xl(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Wl(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(va,xa,Ma),this._renderer.xr.enabled=Sa,e.scissorTest=!1,fs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Qi||e.mapping===er?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),va=this._renderer.getRenderTarget(),xa=this._renderer.getActiveCubeFace(),Ma=this._renderer.getActiveMipmapLevel(),Sa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:pn,minFilter:pn,generateMipmaps:!1,type:Hn,format:mn,colorSpace:tr,depthBuffer:!1},r=Gl(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Gl(e,t,n);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=tm(s)),this._blurMaterial=nm(s,e,t)}return r}_compileMaterial(e){const t=new ae(this._lodPlanes[0],e);this._renderer.compile(t,_a)}_sceneToCubeUV(e,t,n,r,s){const l=new rn(90,1,t,n),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],d=this._renderer,p=d.autoClear,f=d.toneMapping;d.getClearColor(kl),d.toneMapping=ni,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(r),d.clearDepth(),d.setRenderTarget(null));const _=new ar({name:"PMREM.Background",side:Wt,depthWrite:!1,depthTest:!1}),m=new ae(new on,_);let h=!1;const T=e.background;T?T.isColor&&(_.color.copy(T),e.background=null,h=!0):(_.color.copy(kl),h=!0);for(let b=0;b<6;b++){const y=b%3;y===0?(l.up.set(0,c[b],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+u[b],s.y,s.z)):y===1?(l.up.set(0,0,c[b]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+u[b],s.z)):(l.up.set(0,c[b],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+u[b]));const P=this._cubeSize;fs(r,y*P,b>2?P:0,P,P),d.setRenderTarget(r),h&&d.render(m,l),d.render(e,l)}m.geometry.dispose(),m.material.dispose(),d.toneMapping=f,d.autoClear=p,e.background=T}_textureToCubeUV(e,t){const n=this._renderer,r=e.mapping===Qi||e.mapping===er;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Xl()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Wl());const s=r?this._cubemapMaterial:this._equirectMaterial,o=new ae(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=e;const l=this._cubeSize;fs(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,_a)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=Hl[(r-s-1)%Hl.length];this._blur(e,s-1,s,o,a)}t.autoClear=n}_blur(e,t,n,r,s){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,r,"latitudinal",s),this._halfBlur(o,e,n,n,r,"longitudinal",s)}_halfBlur(e,t,n,r,s,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,d=new ae(this._lodPlanes[r],c),p=c.uniforms,f=this._sizeLods[n]-1,g=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*mi-1),_=s/g,m=isFinite(s)?1+Math.floor(u*_):mi;m>mi&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${mi}`);const h=[];let T=0;for(let D=0;D<mi;++D){const L=D/_,M=Math.exp(-L*L/2);h.push(M),D===0?T+=M:D<m&&(T+=2*M)}for(let D=0;D<h.length;D++)h[D]=h[D]/T;p.envMap.value=e.texture,p.samples.value=m,p.weights.value=h,p.latitudinal.value=o==="latitudinal",a&&(p.poleAxis.value=a);const{_lodMax:b}=this;p.dTheta.value=g,p.mipInt.value=b-n;const y=this._sizeLods[r],P=3*y*(r>b-qi?r-b+qi:0),w=4*(this._cubeSize-y);fs(t,P,w,3*y,2*y),l.setRenderTarget(t),l.render(d,_a)}}function tm(i){const e=[],t=[],n=[];let r=i;const s=i-qi+1+zl.length;for(let o=0;o<s;o++){const a=Math.pow(2,r);t.push(a);let l=1/a;o>i-qi?l=zl[o-i+qi-1]:o===0&&(l=0),n.push(l);const c=1/(a-2),u=-c,d=1+c,p=[u,u,d,u,d,d,u,u,d,d,u,d],f=6,g=6,_=3,m=2,h=1,T=new Float32Array(_*g*f),b=new Float32Array(m*g*f),y=new Float32Array(h*g*f);for(let w=0;w<f;w++){const D=w%3*2/3-1,L=w>2?0:-1,M=[D,L,0,D+2/3,L,0,D+2/3,L+1,0,D,L,0,D+2/3,L+1,0,D,L+1,0];T.set(M,_*g*w),b.set(p,m*g*w);const S=[w,w,w,w,w,w];y.set(S,h*g*w)}const P=new Ft;P.setAttribute("position",new jt(T,_)),P.setAttribute("uv",new jt(b,m)),P.setAttribute("faceIndex",new jt(y,h)),e.push(P),r>qi&&r--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function Gl(i,e,t){const n=new _n(i,e,t);return n.texture.mapping=Fs,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function fs(i,e,t,n,r){i.viewport.set(e,t,n,r),i.scissor.set(e,t,n,r)}function nm(i,e,t){const n=new Float32Array(mi),r=new U(0,1,0);return new Gt({name:"SphericalGaussianBlur",defines:{n:mi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Yo(),fragmentShader:`

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
		`,blending:kn,depthTest:!1,depthWrite:!1})}function Wl(){return new Gt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Yo(),fragmentShader:`

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
		`,blending:kn,depthTest:!1,depthWrite:!1})}function Xl(){return new Gt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Yo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:kn,depthTest:!1,depthWrite:!1})}function Yo(){return`

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
	`}function im(i){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===Ha||l===Va,u=l===Qi||l===er;if(c||u){let d=e.get(a);const p=d!==void 0?d.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==p)return t===null&&(t=new Vl(i)),d=c?t.fromEquirectangular(a,d):t.fromCubemap(a,d),d.texture.pmremVersion=a.pmremVersion,e.set(a,d),d.texture;if(d!==void 0)return d.texture;{const f=a.image;return c&&f&&f.height>0||u&&f&&r(f)?(t===null&&(t=new Vl(i)),d=c?t.fromEquirectangular(a):t.fromCubemap(a),d.texture.pmremVersion=a.pmremVersion,e.set(a,d),a.addEventListener("dispose",s),d.texture):null}}}return a}function r(a){let l=0;const c=6;for(let u=0;u<c;u++)a[u]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:o}}function rm(i){const e={};function t(n){if(e[n]!==void 0)return e[n];let r;switch(n){case"WEBGL_depth_texture":r=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=i.getExtension(n)}return e[n]=r,r}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const r=t(n);return r===null&&Ir("THREE.WebGLRenderer: "+n+" extension not supported."),r}}}function sm(i,e,t,n){const r={},s=new WeakMap;function o(d){const p=d.target;p.index!==null&&e.remove(p.index);for(const g in p.attributes)e.remove(p.attributes[g]);p.removeEventListener("dispose",o),delete r[p.id];const f=s.get(p);f&&(e.remove(f),s.delete(p)),n.releaseStatesOfGeometry(p),p.isInstancedBufferGeometry===!0&&delete p._maxInstanceCount,t.memory.geometries--}function a(d,p){return r[p.id]===!0||(p.addEventListener("dispose",o),r[p.id]=!0,t.memory.geometries++),p}function l(d){const p=d.attributes;for(const f in p)e.update(p[f],i.ARRAY_BUFFER)}function c(d){const p=[],f=d.index,g=d.attributes.position;let _=0;if(f!==null){const T=f.array;_=f.version;for(let b=0,y=T.length;b<y;b+=3){const P=T[b+0],w=T[b+1],D=T[b+2];p.push(P,w,w,D,D,P)}}else if(g!==void 0){const T=g.array;_=g.version;for(let b=0,y=T.length/3-1;b<y;b+=3){const P=b+0,w=b+1,D=b+2;p.push(P,w,w,D,D,P)}}else return;const m=new(Nc(p)?zc:Bc)(p,1);m.version=_;const h=s.get(d);h&&e.remove(h),s.set(d,m)}function u(d){const p=s.get(d);if(p){const f=d.index;f!==null&&p.version<f.version&&c(d)}else c(d);return s.get(d)}return{get:a,update:l,getWireframeAttribute:u}}function am(i,e,t){let n;function r(p){n=p}let s,o;function a(p){s=p.type,o=p.bytesPerElement}function l(p,f){i.drawElements(n,f,s,p*o),t.update(f,n,1)}function c(p,f,g){g!==0&&(i.drawElementsInstanced(n,f,s,p*o,g),t.update(f,n,g))}function u(p,f,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,s,p,0,g);let m=0;for(let h=0;h<g;h++)m+=f[h];t.update(m,n,1)}function d(p,f,g,_){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let h=0;h<p.length;h++)c(p[h]/o,f[h],_[h]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,s,p,0,_,0,g);let h=0;for(let T=0;T<g;T++)h+=f[T]*_[T];t.update(h,n,1)}}this.setMode=r,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u,this.renderMultiDrawInstances=d}function om(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(s/3);break;case i.LINES:t.lines+=a*(s/2);break;case i.LINE_STRIP:t.lines+=a*(s-1);break;case i.LINE_LOOP:t.lines+=a*s;break;case i.POINTS:t.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:n}}function lm(i,e,t){const n=new WeakMap,r=new nt;function s(o,a,l){const c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=u!==void 0?u.length:0;let p=n.get(a);if(p===void 0||p.count!==d){let S=function(){L.dispose(),n.delete(a),a.removeEventListener("dispose",S)};var f=S;p!==void 0&&p.texture.dispose();const g=a.morphAttributes.position!==void 0,_=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,h=a.morphAttributes.position||[],T=a.morphAttributes.normal||[],b=a.morphAttributes.color||[];let y=0;g===!0&&(y=1),_===!0&&(y=2),m===!0&&(y=3);let P=a.attributes.position.count*y,w=1;P>e.maxTextureSize&&(w=Math.ceil(P/e.maxTextureSize),P=e.maxTextureSize);const D=new Float32Array(P*w*4*d),L=new Fc(D,P,w,d);L.type=bn,L.needsUpdate=!0;const M=y*4;for(let R=0;R<d;R++){const C=h[R],B=T[R],N=b[R],z=P*w*4*R;for(let F=0;F<C.count;F++){const q=F*M;g===!0&&(r.fromBufferAttribute(C,F),D[z+q+0]=r.x,D[z+q+1]=r.y,D[z+q+2]=r.z,D[z+q+3]=0),_===!0&&(r.fromBufferAttribute(B,F),D[z+q+4]=r.x,D[z+q+5]=r.y,D[z+q+6]=r.z,D[z+q+7]=0),m===!0&&(r.fromBufferAttribute(N,F),D[z+q+8]=r.x,D[z+q+9]=r.y,D[z+q+10]=r.z,D[z+q+11]=N.itemSize===4?r.w:1)}}p={count:d,texture:L,size:new we(P,w)},n.set(a,p),a.addEventListener("dispose",S)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,t);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const _=a.morphTargetsRelative?1:1-g;l.getUniforms().setValue(i,"morphTargetBaseInfluence",_),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",p.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",p.size)}return{update:s}}function cm(i,e,t,n){let r=new WeakMap;function s(l){const c=n.render.frame,u=l.geometry,d=e.get(l,u);if(r.get(d)!==c&&(e.update(d),r.set(d,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),r.get(l)!==c&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const p=l.skeleton;r.get(p)!==c&&(p.update(),r.set(p,c))}return d}function o(){r=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:o}}const Zc=new Nt,ql=new qc(1,1),jc=new Fc,Jc=new Rd,Qc=new Vc,Yl=[],$l=[],Kl=new Float32Array(16),Zl=new Float32Array(9),jl=new Float32Array(4);function or(i,e,t){const n=i[0];if(n<=0||n>0)return i;const r=e*t;let s=Yl[r];if(s===void 0&&(s=new Float32Array(r),Yl[r]=s),e!==0){n.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(s,a)}return s}function At(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Rt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Bs(i,e){let t=$l[e];t===void 0&&(t=new Int32Array(e),$l[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function um(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function dm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(At(t,e))return;i.uniform2fv(this.addr,e),Rt(t,e)}}function hm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(At(t,e))return;i.uniform3fv(this.addr,e),Rt(t,e)}}function fm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(At(t,e))return;i.uniform4fv(this.addr,e),Rt(t,e)}}function pm(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(At(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Rt(t,e)}else{if(At(t,n))return;jl.set(n),i.uniformMatrix2fv(this.addr,!1,jl),Rt(t,n)}}function mm(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(At(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Rt(t,e)}else{if(At(t,n))return;Zl.set(n),i.uniformMatrix3fv(this.addr,!1,Zl),Rt(t,n)}}function gm(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(At(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Rt(t,e)}else{if(At(t,n))return;Kl.set(n),i.uniformMatrix4fv(this.addr,!1,Kl),Rt(t,n)}}function _m(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function vm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(At(t,e))return;i.uniform2iv(this.addr,e),Rt(t,e)}}function xm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(At(t,e))return;i.uniform3iv(this.addr,e),Rt(t,e)}}function Mm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(At(t,e))return;i.uniform4iv(this.addr,e),Rt(t,e)}}function Sm(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function ym(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(At(t,e))return;i.uniform2uiv(this.addr,e),Rt(t,e)}}function Em(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(At(t,e))return;i.uniform3uiv(this.addr,e),Rt(t,e)}}function Tm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(At(t,e))return;i.uniform4uiv(this.addr,e),Rt(t,e)}}function bm(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let s;this.type===i.SAMPLER_2D_SHADOW?(ql.compareFunction=Uc,s=ql):s=Zc,t.setTexture2D(e||s,r)}function wm(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture3D(e||Jc,r)}function Am(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTextureCube(e||Qc,r)}function Rm(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture2DArray(e||jc,r)}function Cm(i){switch(i){case 5126:return um;case 35664:return dm;case 35665:return hm;case 35666:return fm;case 35674:return pm;case 35675:return mm;case 35676:return gm;case 5124:case 35670:return _m;case 35667:case 35671:return vm;case 35668:case 35672:return xm;case 35669:case 35673:return Mm;case 5125:return Sm;case 36294:return ym;case 36295:return Em;case 36296:return Tm;case 35678:case 36198:case 36298:case 36306:case 35682:return bm;case 35679:case 36299:case 36307:return wm;case 35680:case 36300:case 36308:case 36293:return Am;case 36289:case 36303:case 36311:case 36292:return Rm}}function Pm(i,e){i.uniform1fv(this.addr,e)}function Dm(i,e){const t=or(e,this.size,2);i.uniform2fv(this.addr,t)}function Im(i,e){const t=or(e,this.size,3);i.uniform3fv(this.addr,t)}function Lm(i,e){const t=or(e,this.size,4);i.uniform4fv(this.addr,t)}function Um(i,e){const t=or(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function Nm(i,e){const t=or(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function Fm(i,e){const t=or(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Om(i,e){i.uniform1iv(this.addr,e)}function Bm(i,e){i.uniform2iv(this.addr,e)}function zm(i,e){i.uniform3iv(this.addr,e)}function km(i,e){i.uniform4iv(this.addr,e)}function Hm(i,e){i.uniform1uiv(this.addr,e)}function Vm(i,e){i.uniform2uiv(this.addr,e)}function Gm(i,e){i.uniform3uiv(this.addr,e)}function Wm(i,e){i.uniform4uiv(this.addr,e)}function Xm(i,e,t){const n=this.cache,r=e.length,s=Bs(t,r);At(n,s)||(i.uniform1iv(this.addr,s),Rt(n,s));for(let o=0;o!==r;++o)t.setTexture2D(e[o]||Zc,s[o])}function qm(i,e,t){const n=this.cache,r=e.length,s=Bs(t,r);At(n,s)||(i.uniform1iv(this.addr,s),Rt(n,s));for(let o=0;o!==r;++o)t.setTexture3D(e[o]||Jc,s[o])}function Ym(i,e,t){const n=this.cache,r=e.length,s=Bs(t,r);At(n,s)||(i.uniform1iv(this.addr,s),Rt(n,s));for(let o=0;o!==r;++o)t.setTextureCube(e[o]||Qc,s[o])}function $m(i,e,t){const n=this.cache,r=e.length,s=Bs(t,r);At(n,s)||(i.uniform1iv(this.addr,s),Rt(n,s));for(let o=0;o!==r;++o)t.setTexture2DArray(e[o]||jc,s[o])}function Km(i){switch(i){case 5126:return Pm;case 35664:return Dm;case 35665:return Im;case 35666:return Lm;case 35674:return Um;case 35675:return Nm;case 35676:return Fm;case 5124:case 35670:return Om;case 35667:case 35671:return Bm;case 35668:case 35672:return zm;case 35669:case 35673:return km;case 5125:return Hm;case 36294:return Vm;case 36295:return Gm;case 36296:return Wm;case 35678:case 36198:case 36298:case 36306:case 35682:return Xm;case 35679:case 36299:case 36307:return qm;case 35680:case 36300:case 36308:case 36293:return Ym;case 36289:case 36303:case 36311:case 36292:return $m}}class Zm{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Cm(t.type)}}class jm{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Km(t.type)}}class Jm{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const r=this.seq;for(let s=0,o=r.length;s!==o;++s){const a=r[s];a.setValue(e,t[a.id],n)}}}const ya=/(\w+)(\])?(\[|\.)?/g;function Jl(i,e){i.seq.push(e),i.map[e.id]=e}function Qm(i,e,t){const n=i.name,r=n.length;for(ya.lastIndex=0;;){const s=ya.exec(n),o=ya.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===r){Jl(t,c===void 0?new Zm(a,i,e):new jm(a,i,e));break}else{let d=t.map[a];d===void 0&&(d=new Jm(a),Jl(t,d)),t=d}}}class Es{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const s=e.getActiveUniform(t,r),o=e.getUniformLocation(t,s.name);Qm(s,o,this)}}setValue(e,t,n,r){const s=this.map[t];s!==void 0&&s.setValue(e,n,r)}setOptional(e,t,n){const r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let s=0,o=t.length;s!==o;++s){const a=t[s],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,r)}}static seqWithValue(e,t){const n=[];for(let r=0,s=e.length;r!==s;++r){const o=e[r];o.id in t&&n.push(o)}return n}}function Ql(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const eg=37297;let tg=0;function ng(i,e){const t=i.split(`
`),n=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let o=r;o<s;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const ec=new ke;function ig(i){Ke._getMatrix(ec,Ke.workingColorSpace,i);const e=`mat3( ${ec.elements.map(t=>t.toFixed(4))} )`;switch(Ke.getTransfer(i)){case Rs:return[e,"LinearTransferOETF"];case tt:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function tc(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),s=(i.getShaderInfoLog(e)||"").trim();if(n&&s==="")return"";const o=/ERROR: 0:(\d+)/.exec(s);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+s+`

`+ng(i.getShaderSource(e),a)}else return s}function rg(i,e){const t=ig(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function sg(i,e){let t;switch(e){case Hu:t="Linear";break;case Vu:t="Reinhard";break;case Gu:t="Cineon";break;case Tc:t="ACESFilmic";break;case Xu:t="AgX";break;case qu:t="Neutral";break;case Wu:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const ps=new U;function ag(){Ke.getLuminanceCoefficients(ps);const i=ps.x.toFixed(4),e=ps.y.toFixed(4),t=ps.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function og(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Sr).join(`
`)}function lg(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function cg(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const s=i.getActiveAttrib(e,r),o=s.name;let a=1;s.type===i.FLOAT_MAT2&&(a=2),s.type===i.FLOAT_MAT3&&(a=3),s.type===i.FLOAT_MAT4&&(a=4),t[o]={type:s.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}function Sr(i){return i!==""}function nc(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function ic(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const ug=/^[ \t]*#include +<([\w\d./]+)>/gm;function Eo(i){return i.replace(ug,hg)}const dg=new Map;function hg(i,e){let t=Ve[e];if(t===void 0){const n=dg.get(e);if(n!==void 0)t=Ve[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Eo(t)}const fg=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function rc(i){return i.replace(fg,pg)}function pg(i,e,t,n){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function sc(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}function mg(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===Sc?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===yc?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===On&&(e="SHADOWMAP_TYPE_VSM"),e}function gg(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case Qi:case er:e="ENVMAP_TYPE_CUBE";break;case Fs:e="ENVMAP_TYPE_CUBE_UV";break}return e}function _g(i){let e="ENVMAP_MODE_REFLECTION";return i.envMap&&i.envMapMode===er&&(e="ENVMAP_MODE_REFRACTION"),e}function vg(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Ec:e="ENVMAP_BLENDING_MULTIPLY";break;case zu:e="ENVMAP_BLENDING_MIX";break;case ku:e="ENVMAP_BLENDING_ADD";break}return e}function xg(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function Mg(i,e,t,n){const r=i.getContext(),s=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=mg(t),c=gg(t),u=_g(t),d=vg(t),p=xg(t),f=og(t),g=lg(s),_=r.createProgram();let m,h,T=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Sr).join(`
`),m.length>0&&(m+=`
`),h=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Sr).join(`
`),h.length>0&&(h+=`
`)):(m=[sc(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Sr).join(`
`),h=[sc(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+d:"",p?"#define CUBEUV_TEXEL_WIDTH "+p.texelWidth:"",p?"#define CUBEUV_TEXEL_HEIGHT "+p.texelHeight:"",p?"#define CUBEUV_MAX_MIP "+p.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==ni?"#define TONE_MAPPING":"",t.toneMapping!==ni?Ve.tonemapping_pars_fragment:"",t.toneMapping!==ni?sg("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ve.colorspace_pars_fragment,rg("linearToOutputTexel",t.outputColorSpace),ag(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Sr).join(`
`)),o=Eo(o),o=nc(o,t),o=ic(o,t),a=Eo(a),a=nc(a,t),a=ic(a,t),o=rc(o),a=rc(a),t.isRawShaderMaterial!==!0&&(T=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,h=["#define varying in",t.glslVersion===ol?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===ol?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+h);const b=T+m+o,y=T+h+a,P=Ql(r,r.VERTEX_SHADER,b),w=Ql(r,r.FRAGMENT_SHADER,y);r.attachShader(_,P),r.attachShader(_,w),t.index0AttributeName!==void 0?r.bindAttribLocation(_,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(_,0,"position"),r.linkProgram(_);function D(R){if(i.debug.checkShaderErrors){const C=r.getProgramInfoLog(_)||"",B=r.getShaderInfoLog(P)||"",N=r.getShaderInfoLog(w)||"",z=C.trim(),F=B.trim(),q=N.trim();let V=!0,j=!0;if(r.getProgramParameter(_,r.LINK_STATUS)===!1)if(V=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,_,P,w);else{const ee=tc(r,P,"vertex"),ue=tc(r,w,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(_,r.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+z+`
`+ee+`
`+ue)}else z!==""?console.warn("THREE.WebGLProgram: Program Info Log:",z):(F===""||q==="")&&(j=!1);j&&(R.diagnostics={runnable:V,programLog:z,vertexShader:{log:F,prefix:m},fragmentShader:{log:q,prefix:h}})}r.deleteShader(P),r.deleteShader(w),L=new Es(r,_),M=cg(r,_)}let L;this.getUniforms=function(){return L===void 0&&D(this),L};let M;this.getAttributes=function(){return M===void 0&&D(this),M};let S=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return S===!1&&(S=r.getProgramParameter(_,eg)),S},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=tg++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=P,this.fragmentShader=w,this}let Sg=0;class yg{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new Eg(e),t.set(e,n)),n}}class Eg{constructor(e){this.id=Sg++,this.code=e,this.usedTimes=0}}function Tg(i,e,t,n,r,s,o){const a=new Bo,l=new yg,c=new Set,u=[],d=r.logarithmicDepthBuffer,p=r.vertexTextures;let f=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(M){return c.add(M),M===0?"uv":`uv${M}`}function m(M,S,R,C,B){const N=C.fog,z=B.geometry,F=M.isMeshStandardMaterial?C.environment:null,q=(M.isMeshStandardMaterial?t:e).get(M.envMap||F),V=q&&q.mapping===Fs?q.image.height:null,j=g[M.type];M.precision!==null&&(f=r.getMaxPrecision(M.precision),f!==M.precision&&console.warn("THREE.WebGLProgram.getParameters:",M.precision,"not supported, using",f,"instead."));const ee=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,ue=ee!==void 0?ee.length:0;let Ce=0;z.morphAttributes.position!==void 0&&(Ce=1),z.morphAttributes.normal!==void 0&&(Ce=2),z.morphAttributes.color!==void 0&&(Ce=3);let qe,Ze,Q,H;if(j){const Je=En[j];qe=Je.vertexShader,Ze=Je.fragmentShader}else qe=M.vertexShader,Ze=M.fragmentShader,l.update(M),Q=l.getVertexShaderID(M),H=l.getFragmentShaderID(M);const $=i.getRenderTarget(),de=i.state.buffers.depth.getReversed(),Ae=B.isInstancedMesh===!0,xe=B.isBatchedMesh===!0,Oe=!!M.map,xt=!!M.matcap,A=!!q,ut=!!M.aoMap,Be=!!M.lightMap,Le=!!M.bumpMap,Me=!!M.normalMap,dt=!!M.displacementMap,Se=!!M.emissiveMap,He=!!M.metalnessMap,Ct=!!M.roughnessMap,vt=M.anisotropy>0,E=M.clearcoat>0,v=M.dispersion>0,G=M.iridescence>0,K=M.sheen>0,J=M.transmission>0,Y=vt&&!!M.anisotropyMap,be=E&&!!M.clearcoatMap,se=E&&!!M.clearcoatNormalMap,ye=E&&!!M.clearcoatRoughnessMap,Ee=G&&!!M.iridescenceMap,ie=G&&!!M.iridescenceThicknessMap,fe=K&&!!M.sheenColorMap,Ie=K&&!!M.sheenRoughnessMap,Te=!!M.specularMap,ce=!!M.specularColorMap,ze=!!M.specularIntensityMap,I=J&&!!M.transmissionMap,re=J&&!!M.thicknessMap,oe=!!M.gradientMap,me=!!M.alphaMap,te=M.alphaTest>0,Z=!!M.alphaHash,ve=!!M.extensions;let Fe=ni;M.toneMapped&&($===null||$.isXRRenderTarget===!0)&&(Fe=i.toneMapping);const at={shaderID:j,shaderType:M.type,shaderName:M.name,vertexShader:qe,fragmentShader:Ze,defines:M.defines,customVertexShaderID:Q,customFragmentShaderID:H,isRawShaderMaterial:M.isRawShaderMaterial===!0,glslVersion:M.glslVersion,precision:f,batching:xe,batchingColor:xe&&B._colorsTexture!==null,instancing:Ae,instancingColor:Ae&&B.instanceColor!==null,instancingMorph:Ae&&B.morphTexture!==null,supportsVertexTextures:p,outputColorSpace:$===null?i.outputColorSpace:$.isXRRenderTarget===!0?$.texture.colorSpace:tr,alphaToCoverage:!!M.alphaToCoverage,map:Oe,matcap:xt,envMap:A,envMapMode:A&&q.mapping,envMapCubeUVHeight:V,aoMap:ut,lightMap:Be,bumpMap:Le,normalMap:Me,displacementMap:p&&dt,emissiveMap:Se,normalMapObjectSpace:Me&&M.normalMapType===Zu,normalMapTangentSpace:Me&&M.normalMapType===Lc,metalnessMap:He,roughnessMap:Ct,anisotropy:vt,anisotropyMap:Y,clearcoat:E,clearcoatMap:be,clearcoatNormalMap:se,clearcoatRoughnessMap:ye,dispersion:v,iridescence:G,iridescenceMap:Ee,iridescenceThicknessMap:ie,sheen:K,sheenColorMap:fe,sheenRoughnessMap:Ie,specularMap:Te,specularColorMap:ce,specularIntensityMap:ze,transmission:J,transmissionMap:I,thicknessMap:re,gradientMap:oe,opaque:M.transparent===!1&&M.blending===Ki&&M.alphaToCoverage===!1,alphaMap:me,alphaTest:te,alphaHash:Z,combine:M.combine,mapUv:Oe&&_(M.map.channel),aoMapUv:ut&&_(M.aoMap.channel),lightMapUv:Be&&_(M.lightMap.channel),bumpMapUv:Le&&_(M.bumpMap.channel),normalMapUv:Me&&_(M.normalMap.channel),displacementMapUv:dt&&_(M.displacementMap.channel),emissiveMapUv:Se&&_(M.emissiveMap.channel),metalnessMapUv:He&&_(M.metalnessMap.channel),roughnessMapUv:Ct&&_(M.roughnessMap.channel),anisotropyMapUv:Y&&_(M.anisotropyMap.channel),clearcoatMapUv:be&&_(M.clearcoatMap.channel),clearcoatNormalMapUv:se&&_(M.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ye&&_(M.clearcoatRoughnessMap.channel),iridescenceMapUv:Ee&&_(M.iridescenceMap.channel),iridescenceThicknessMapUv:ie&&_(M.iridescenceThicknessMap.channel),sheenColorMapUv:fe&&_(M.sheenColorMap.channel),sheenRoughnessMapUv:Ie&&_(M.sheenRoughnessMap.channel),specularMapUv:Te&&_(M.specularMap.channel),specularColorMapUv:ce&&_(M.specularColorMap.channel),specularIntensityMapUv:ze&&_(M.specularIntensityMap.channel),transmissionMapUv:I&&_(M.transmissionMap.channel),thicknessMapUv:re&&_(M.thicknessMap.channel),alphaMapUv:me&&_(M.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&(Me||vt),vertexColors:M.vertexColors,vertexAlphas:M.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,pointsUvs:B.isPoints===!0&&!!z.attributes.uv&&(Oe||me),fog:!!N,useFog:M.fog===!0,fogExp2:!!N&&N.isFogExp2,flatShading:M.flatShading===!0&&M.wireframe===!1,sizeAttenuation:M.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:de,skinning:B.isSkinnedMesh===!0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:ue,morphTextureStride:Ce,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:M.dithering,shadowMapEnabled:i.shadowMap.enabled&&R.length>0,shadowMapType:i.shadowMap.type,toneMapping:Fe,decodeVideoTexture:Oe&&M.map.isVideoTexture===!0&&Ke.getTransfer(M.map.colorSpace)===tt,decodeVideoTextureEmissive:Se&&M.emissiveMap.isVideoTexture===!0&&Ke.getTransfer(M.emissiveMap.colorSpace)===tt,premultipliedAlpha:M.premultipliedAlpha,doubleSided:M.side===Kt,flipSided:M.side===Wt,useDepthPacking:M.depthPacking>=0,depthPacking:M.depthPacking||0,index0AttributeName:M.index0AttributeName,extensionClipCullDistance:ve&&M.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ve&&M.extensions.multiDraw===!0||xe)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:M.customProgramCacheKey()};return at.vertexUv1s=c.has(1),at.vertexUv2s=c.has(2),at.vertexUv3s=c.has(3),c.clear(),at}function h(M){const S=[];if(M.shaderID?S.push(M.shaderID):(S.push(M.customVertexShaderID),S.push(M.customFragmentShaderID)),M.defines!==void 0)for(const R in M.defines)S.push(R),S.push(M.defines[R]);return M.isRawShaderMaterial===!1&&(T(S,M),b(S,M),S.push(i.outputColorSpace)),S.push(M.customProgramCacheKey),S.join()}function T(M,S){M.push(S.precision),M.push(S.outputColorSpace),M.push(S.envMapMode),M.push(S.envMapCubeUVHeight),M.push(S.mapUv),M.push(S.alphaMapUv),M.push(S.lightMapUv),M.push(S.aoMapUv),M.push(S.bumpMapUv),M.push(S.normalMapUv),M.push(S.displacementMapUv),M.push(S.emissiveMapUv),M.push(S.metalnessMapUv),M.push(S.roughnessMapUv),M.push(S.anisotropyMapUv),M.push(S.clearcoatMapUv),M.push(S.clearcoatNormalMapUv),M.push(S.clearcoatRoughnessMapUv),M.push(S.iridescenceMapUv),M.push(S.iridescenceThicknessMapUv),M.push(S.sheenColorMapUv),M.push(S.sheenRoughnessMapUv),M.push(S.specularMapUv),M.push(S.specularColorMapUv),M.push(S.specularIntensityMapUv),M.push(S.transmissionMapUv),M.push(S.thicknessMapUv),M.push(S.combine),M.push(S.fogExp2),M.push(S.sizeAttenuation),M.push(S.morphTargetsCount),M.push(S.morphAttributeCount),M.push(S.numDirLights),M.push(S.numPointLights),M.push(S.numSpotLights),M.push(S.numSpotLightMaps),M.push(S.numHemiLights),M.push(S.numRectAreaLights),M.push(S.numDirLightShadows),M.push(S.numPointLightShadows),M.push(S.numSpotLightShadows),M.push(S.numSpotLightShadowsWithMaps),M.push(S.numLightProbes),M.push(S.shadowMapType),M.push(S.toneMapping),M.push(S.numClippingPlanes),M.push(S.numClipIntersection),M.push(S.depthPacking)}function b(M,S){a.disableAll(),S.supportsVertexTextures&&a.enable(0),S.instancing&&a.enable(1),S.instancingColor&&a.enable(2),S.instancingMorph&&a.enable(3),S.matcap&&a.enable(4),S.envMap&&a.enable(5),S.normalMapObjectSpace&&a.enable(6),S.normalMapTangentSpace&&a.enable(7),S.clearcoat&&a.enable(8),S.iridescence&&a.enable(9),S.alphaTest&&a.enable(10),S.vertexColors&&a.enable(11),S.vertexAlphas&&a.enable(12),S.vertexUv1s&&a.enable(13),S.vertexUv2s&&a.enable(14),S.vertexUv3s&&a.enable(15),S.vertexTangents&&a.enable(16),S.anisotropy&&a.enable(17),S.alphaHash&&a.enable(18),S.batching&&a.enable(19),S.dispersion&&a.enable(20),S.batchingColor&&a.enable(21),S.gradientMap&&a.enable(22),M.push(a.mask),a.disableAll(),S.fog&&a.enable(0),S.useFog&&a.enable(1),S.flatShading&&a.enable(2),S.logarithmicDepthBuffer&&a.enable(3),S.reversedDepthBuffer&&a.enable(4),S.skinning&&a.enable(5),S.morphTargets&&a.enable(6),S.morphNormals&&a.enable(7),S.morphColors&&a.enable(8),S.premultipliedAlpha&&a.enable(9),S.shadowMapEnabled&&a.enable(10),S.doubleSided&&a.enable(11),S.flipSided&&a.enable(12),S.useDepthPacking&&a.enable(13),S.dithering&&a.enable(14),S.transmission&&a.enable(15),S.sheen&&a.enable(16),S.opaque&&a.enable(17),S.pointsUvs&&a.enable(18),S.decodeVideoTexture&&a.enable(19),S.decodeVideoTextureEmissive&&a.enable(20),S.alphaToCoverage&&a.enable(21),M.push(a.mask)}function y(M){const S=g[M.type];let R;if(S){const C=En[S];R=Ds.clone(C.uniforms)}else R=M.uniforms;return R}function P(M,S){let R;for(let C=0,B=u.length;C<B;C++){const N=u[C];if(N.cacheKey===S){R=N,++R.usedTimes;break}}return R===void 0&&(R=new Mg(i,S,M,s),u.push(R)),R}function w(M){if(--M.usedTimes===0){const S=u.indexOf(M);u[S]=u[u.length-1],u.pop(),M.destroy()}}function D(M){l.remove(M)}function L(){l.dispose()}return{getParameters:m,getProgramCacheKey:h,getUniforms:y,acquireProgram:P,releaseProgram:w,releaseShaderCache:D,programs:u,dispose:L}}function bg(){let i=new WeakMap;function e(o){return i.has(o)}function t(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function r(o,a,l){i.get(o)[a]=l}function s(){i=new WeakMap}return{has:e,get:t,remove:n,update:r,dispose:s}}function wg(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function ac(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function oc(){const i=[];let e=0;const t=[],n=[],r=[];function s(){e=0,t.length=0,n.length=0,r.length=0}function o(d,p,f,g,_,m){let h=i[e];return h===void 0?(h={id:d.id,object:d,geometry:p,material:f,groupOrder:g,renderOrder:d.renderOrder,z:_,group:m},i[e]=h):(h.id=d.id,h.object=d,h.geometry=p,h.material=f,h.groupOrder=g,h.renderOrder=d.renderOrder,h.z=_,h.group=m),e++,h}function a(d,p,f,g,_,m){const h=o(d,p,f,g,_,m);f.transmission>0?n.push(h):f.transparent===!0?r.push(h):t.push(h)}function l(d,p,f,g,_,m){const h=o(d,p,f,g,_,m);f.transmission>0?n.unshift(h):f.transparent===!0?r.unshift(h):t.unshift(h)}function c(d,p){t.length>1&&t.sort(d||wg),n.length>1&&n.sort(p||ac),r.length>1&&r.sort(p||ac)}function u(){for(let d=e,p=i.length;d<p;d++){const f=i[d];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:r,init:s,push:a,unshift:l,finish:u,sort:c}}function Ag(){let i=new WeakMap;function e(n,r){const s=i.get(n);let o;return s===void 0?(o=new oc,i.set(n,[o])):r>=s.length?(o=new oc,s.push(o)):o=s[r],o}function t(){i=new WeakMap}return{get:e,dispose:t}}function Rg(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new U,color:new Ne};break;case"SpotLight":t={position:new U,direction:new U,color:new Ne,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new U,color:new Ne,distance:0,decay:0};break;case"HemisphereLight":t={direction:new U,skyColor:new Ne,groundColor:new Ne};break;case"RectAreaLight":t={color:new Ne,position:new U,halfWidth:new U,halfHeight:new U};break}return i[e.id]=t,t}}}function Cg(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let Pg=0;function Dg(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function Ig(i){const e=new Rg,t=Cg(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new U);const r=new U,s=new rt,o=new rt;function a(c){let u=0,d=0,p=0;for(let M=0;M<9;M++)n.probe[M].set(0,0,0);let f=0,g=0,_=0,m=0,h=0,T=0,b=0,y=0,P=0,w=0,D=0;c.sort(Dg);for(let M=0,S=c.length;M<S;M++){const R=c[M],C=R.color,B=R.intensity,N=R.distance,z=R.shadow&&R.shadow.map?R.shadow.map.texture:null;if(R.isAmbientLight)u+=C.r*B,d+=C.g*B,p+=C.b*B;else if(R.isLightProbe){for(let F=0;F<9;F++)n.probe[F].addScaledVector(R.sh.coefficients[F],B);D++}else if(R.isDirectionalLight){const F=e.get(R);if(F.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const q=R.shadow,V=t.get(R);V.shadowIntensity=q.intensity,V.shadowBias=q.bias,V.shadowNormalBias=q.normalBias,V.shadowRadius=q.radius,V.shadowMapSize=q.mapSize,n.directionalShadow[f]=V,n.directionalShadowMap[f]=z,n.directionalShadowMatrix[f]=R.shadow.matrix,T++}n.directional[f]=F,f++}else if(R.isSpotLight){const F=e.get(R);F.position.setFromMatrixPosition(R.matrixWorld),F.color.copy(C).multiplyScalar(B),F.distance=N,F.coneCos=Math.cos(R.angle),F.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),F.decay=R.decay,n.spot[_]=F;const q=R.shadow;if(R.map&&(n.spotLightMap[P]=R.map,P++,q.updateMatrices(R),R.castShadow&&w++),n.spotLightMatrix[_]=q.matrix,R.castShadow){const V=t.get(R);V.shadowIntensity=q.intensity,V.shadowBias=q.bias,V.shadowNormalBias=q.normalBias,V.shadowRadius=q.radius,V.shadowMapSize=q.mapSize,n.spotShadow[_]=V,n.spotShadowMap[_]=z,y++}_++}else if(R.isRectAreaLight){const F=e.get(R);F.color.copy(C).multiplyScalar(B),F.halfWidth.set(R.width*.5,0,0),F.halfHeight.set(0,R.height*.5,0),n.rectArea[m]=F,m++}else if(R.isPointLight){const F=e.get(R);if(F.color.copy(R.color).multiplyScalar(R.intensity),F.distance=R.distance,F.decay=R.decay,R.castShadow){const q=R.shadow,V=t.get(R);V.shadowIntensity=q.intensity,V.shadowBias=q.bias,V.shadowNormalBias=q.normalBias,V.shadowRadius=q.radius,V.shadowMapSize=q.mapSize,V.shadowCameraNear=q.camera.near,V.shadowCameraFar=q.camera.far,n.pointShadow[g]=V,n.pointShadowMap[g]=z,n.pointShadowMatrix[g]=R.shadow.matrix,b++}n.point[g]=F,g++}else if(R.isHemisphereLight){const F=e.get(R);F.skyColor.copy(R.color).multiplyScalar(B),F.groundColor.copy(R.groundColor).multiplyScalar(B),n.hemi[h]=F,h++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=le.LTC_FLOAT_1,n.rectAreaLTC2=le.LTC_FLOAT_2):(n.rectAreaLTC1=le.LTC_HALF_1,n.rectAreaLTC2=le.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=d,n.ambient[2]=p;const L=n.hash;(L.directionalLength!==f||L.pointLength!==g||L.spotLength!==_||L.rectAreaLength!==m||L.hemiLength!==h||L.numDirectionalShadows!==T||L.numPointShadows!==b||L.numSpotShadows!==y||L.numSpotMaps!==P||L.numLightProbes!==D)&&(n.directional.length=f,n.spot.length=_,n.rectArea.length=m,n.point.length=g,n.hemi.length=h,n.directionalShadow.length=T,n.directionalShadowMap.length=T,n.pointShadow.length=b,n.pointShadowMap.length=b,n.spotShadow.length=y,n.spotShadowMap.length=y,n.directionalShadowMatrix.length=T,n.pointShadowMatrix.length=b,n.spotLightMatrix.length=y+P-w,n.spotLightMap.length=P,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=D,L.directionalLength=f,L.pointLength=g,L.spotLength=_,L.rectAreaLength=m,L.hemiLength=h,L.numDirectionalShadows=T,L.numPointShadows=b,L.numSpotShadows=y,L.numSpotMaps=P,L.numLightProbes=D,n.version=Pg++)}function l(c,u){let d=0,p=0,f=0,g=0,_=0;const m=u.matrixWorldInverse;for(let h=0,T=c.length;h<T;h++){const b=c[h];if(b.isDirectionalLight){const y=n.directional[d];y.direction.setFromMatrixPosition(b.matrixWorld),r.setFromMatrixPosition(b.target.matrixWorld),y.direction.sub(r),y.direction.transformDirection(m),d++}else if(b.isSpotLight){const y=n.spot[f];y.position.setFromMatrixPosition(b.matrixWorld),y.position.applyMatrix4(m),y.direction.setFromMatrixPosition(b.matrixWorld),r.setFromMatrixPosition(b.target.matrixWorld),y.direction.sub(r),y.direction.transformDirection(m),f++}else if(b.isRectAreaLight){const y=n.rectArea[g];y.position.setFromMatrixPosition(b.matrixWorld),y.position.applyMatrix4(m),o.identity(),s.copy(b.matrixWorld),s.premultiply(m),o.extractRotation(s),y.halfWidth.set(b.width*.5,0,0),y.halfHeight.set(0,b.height*.5,0),y.halfWidth.applyMatrix4(o),y.halfHeight.applyMatrix4(o),g++}else if(b.isPointLight){const y=n.point[p];y.position.setFromMatrixPosition(b.matrixWorld),y.position.applyMatrix4(m),p++}else if(b.isHemisphereLight){const y=n.hemi[_];y.direction.setFromMatrixPosition(b.matrixWorld),y.direction.transformDirection(m),_++}}}return{setup:a,setupView:l,state:n}}function lc(i){const e=new Ig(i),t=[],n=[];function r(u){c.camera=u,t.length=0,n.length=0}function s(u){t.push(u)}function o(u){n.push(u)}function a(){e.setup(t)}function l(u){e.setupView(t,u)}const c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:o}}function Lg(i){let e=new WeakMap;function t(r,s=0){const o=e.get(r);let a;return o===void 0?(a=new lc(i),e.set(r,[a])):s>=o.length?(a=new lc(i),o.push(a)):a=o[s],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const Ug=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Ng=`uniform sampler2D shadow_pass;
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
}`;function Fg(i,e,t){let n=new Ho;const r=new we,s=new we,o=new nt,a=new nh({depthPacking:Ku}),l=new ih,c={},u=t.maxTextureSize,d={[ii]:Wt,[Wt]:ii,[Kt]:Kt},p=new Gt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new we},radius:{value:4}},vertexShader:Ug,fragmentShader:Ng}),f=p.clone();f.defines.HORIZONTAL_PASS=1;const g=new Ft;g.setAttribute("position",new jt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new ae(g,p),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Sc;let h=this.type;this.render=function(w,D,L){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||w.length===0)return;const M=i.getRenderTarget(),S=i.getActiveCubeFace(),R=i.getActiveMipmapLevel(),C=i.state;C.setBlending(kn),C.buffers.depth.getReversed()===!0?C.buffers.color.setClear(0,0,0,0):C.buffers.color.setClear(1,1,1,1),C.buffers.depth.setTest(!0),C.setScissorTest(!1);const B=h!==On&&this.type===On,N=h===On&&this.type!==On;for(let z=0,F=w.length;z<F;z++){const q=w[z],V=q.shadow;if(V===void 0){console.warn("THREE.WebGLShadowMap:",q,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;r.copy(V.mapSize);const j=V.getFrameExtents();if(r.multiply(j),s.copy(V.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/j.x),r.x=s.x*j.x,V.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/j.y),r.y=s.y*j.y,V.mapSize.y=s.y)),V.map===null||B===!0||N===!0){const ue=this.type!==On?{minFilter:Zt,magFilter:Zt}:{};V.map!==null&&V.map.dispose(),V.map=new _n(r.x,r.y,ue),V.map.texture.name=q.name+".shadowMap",V.camera.updateProjectionMatrix()}i.setRenderTarget(V.map),i.clear();const ee=V.getViewportCount();for(let ue=0;ue<ee;ue++){const Ce=V.getViewport(ue);o.set(s.x*Ce.x,s.y*Ce.y,s.x*Ce.z,s.y*Ce.w),C.viewport(o),V.updateMatrices(q,ue),n=V.getFrustum(),y(D,L,V.camera,q,this.type)}V.isPointLightShadow!==!0&&this.type===On&&T(V,L),V.needsUpdate=!1}h=this.type,m.needsUpdate=!1,i.setRenderTarget(M,S,R)};function T(w,D){const L=e.update(_);p.defines.VSM_SAMPLES!==w.blurSamples&&(p.defines.VSM_SAMPLES=w.blurSamples,f.defines.VSM_SAMPLES=w.blurSamples,p.needsUpdate=!0,f.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new _n(r.x,r.y)),p.uniforms.shadow_pass.value=w.map.texture,p.uniforms.resolution.value=w.mapSize,p.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(D,null,L,p,_,null),f.uniforms.shadow_pass.value=w.mapPass.texture,f.uniforms.resolution.value=w.mapSize,f.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(D,null,L,f,_,null)}function b(w,D,L,M){let S=null;const R=L.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(R!==void 0)S=R;else if(S=L.isPointLight===!0?l:a,i.localClippingEnabled&&D.clipShadows===!0&&Array.isArray(D.clippingPlanes)&&D.clippingPlanes.length!==0||D.displacementMap&&D.displacementScale!==0||D.alphaMap&&D.alphaTest>0||D.map&&D.alphaTest>0||D.alphaToCoverage===!0){const C=S.uuid,B=D.uuid;let N=c[C];N===void 0&&(N={},c[C]=N);let z=N[B];z===void 0&&(z=S.clone(),N[B]=z,D.addEventListener("dispose",P)),S=z}if(S.visible=D.visible,S.wireframe=D.wireframe,M===On?S.side=D.shadowSide!==null?D.shadowSide:D.side:S.side=D.shadowSide!==null?D.shadowSide:d[D.side],S.alphaMap=D.alphaMap,S.alphaTest=D.alphaToCoverage===!0?.5:D.alphaTest,S.map=D.map,S.clipShadows=D.clipShadows,S.clippingPlanes=D.clippingPlanes,S.clipIntersection=D.clipIntersection,S.displacementMap=D.displacementMap,S.displacementScale=D.displacementScale,S.displacementBias=D.displacementBias,S.wireframeLinewidth=D.wireframeLinewidth,S.linewidth=D.linewidth,L.isPointLight===!0&&S.isMeshDistanceMaterial===!0){const C=i.properties.get(S);C.light=L}return S}function y(w,D,L,M,S){if(w.visible===!1)return;if(w.layers.test(D.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&S===On)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,w.matrixWorld);const B=e.update(w),N=w.material;if(Array.isArray(N)){const z=B.groups;for(let F=0,q=z.length;F<q;F++){const V=z[F],j=N[V.materialIndex];if(j&&j.visible){const ee=b(w,j,M,S);w.onBeforeShadow(i,w,D,L,B,ee,V),i.renderBufferDirect(L,null,B,ee,w,V),w.onAfterShadow(i,w,D,L,B,ee,V)}}}else if(N.visible){const z=b(w,N,M,S);w.onBeforeShadow(i,w,D,L,B,z,null),i.renderBufferDirect(L,null,B,z,w,null),w.onAfterShadow(i,w,D,L,B,z,null)}}const C=w.children;for(let B=0,N=C.length;B<N;B++)y(C[B],D,L,M,S)}function P(w){w.target.removeEventListener("dispose",P);for(const L in c){const M=c[L],S=w.target.uuid;S in M&&(M[S].dispose(),delete M[S])}}}const Og={[Ua]:Na,[Fa]:za,[Oa]:ka,[Ji]:Ba,[Na]:Ua,[za]:Fa,[ka]:Oa,[Ba]:Ji};function Bg(i,e){function t(){let I=!1;const re=new nt;let oe=null;const me=new nt(0,0,0,0);return{setMask:function(te){oe!==te&&!I&&(i.colorMask(te,te,te,te),oe=te)},setLocked:function(te){I=te},setClear:function(te,Z,ve,Fe,at){at===!0&&(te*=Fe,Z*=Fe,ve*=Fe),re.set(te,Z,ve,Fe),me.equals(re)===!1&&(i.clearColor(te,Z,ve,Fe),me.copy(re))},reset:function(){I=!1,oe=null,me.set(-1,0,0,0)}}}function n(){let I=!1,re=!1,oe=null,me=null,te=null;return{setReversed:function(Z){if(re!==Z){const ve=e.get("EXT_clip_control");Z?ve.clipControlEXT(ve.LOWER_LEFT_EXT,ve.ZERO_TO_ONE_EXT):ve.clipControlEXT(ve.LOWER_LEFT_EXT,ve.NEGATIVE_ONE_TO_ONE_EXT),re=Z;const Fe=te;te=null,this.setClear(Fe)}},getReversed:function(){return re},setTest:function(Z){Z?$(i.DEPTH_TEST):de(i.DEPTH_TEST)},setMask:function(Z){oe!==Z&&!I&&(i.depthMask(Z),oe=Z)},setFunc:function(Z){if(re&&(Z=Og[Z]),me!==Z){switch(Z){case Ua:i.depthFunc(i.NEVER);break;case Na:i.depthFunc(i.ALWAYS);break;case Fa:i.depthFunc(i.LESS);break;case Ji:i.depthFunc(i.LEQUAL);break;case Oa:i.depthFunc(i.EQUAL);break;case Ba:i.depthFunc(i.GEQUAL);break;case za:i.depthFunc(i.GREATER);break;case ka:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}me=Z}},setLocked:function(Z){I=Z},setClear:function(Z){te!==Z&&(re&&(Z=1-Z),i.clearDepth(Z),te=Z)},reset:function(){I=!1,oe=null,me=null,te=null,re=!1}}}function r(){let I=!1,re=null,oe=null,me=null,te=null,Z=null,ve=null,Fe=null,at=null;return{setTest:function(Je){I||(Je?$(i.STENCIL_TEST):de(i.STENCIL_TEST))},setMask:function(Je){re!==Je&&!I&&(i.stencilMask(Je),re=Je)},setFunc:function(Je,Dn,Mn){(oe!==Je||me!==Dn||te!==Mn)&&(i.stencilFunc(Je,Dn,Mn),oe=Je,me=Dn,te=Mn)},setOp:function(Je,Dn,Mn){(Z!==Je||ve!==Dn||Fe!==Mn)&&(i.stencilOp(Je,Dn,Mn),Z=Je,ve=Dn,Fe=Mn)},setLocked:function(Je){I=Je},setClear:function(Je){at!==Je&&(i.clearStencil(Je),at=Je)},reset:function(){I=!1,re=null,oe=null,me=null,te=null,Z=null,ve=null,Fe=null,at=null}}}const s=new t,o=new n,a=new r,l=new WeakMap,c=new WeakMap;let u={},d={},p=new WeakMap,f=[],g=null,_=!1,m=null,h=null,T=null,b=null,y=null,P=null,w=null,D=new Ne(0,0,0),L=0,M=!1,S=null,R=null,C=null,B=null,N=null;const z=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let F=!1,q=0;const V=i.getParameter(i.VERSION);V.indexOf("WebGL")!==-1?(q=parseFloat(/^WebGL (\d)/.exec(V)[1]),F=q>=1):V.indexOf("OpenGL ES")!==-1&&(q=parseFloat(/^OpenGL ES (\d)/.exec(V)[1]),F=q>=2);let j=null,ee={};const ue=i.getParameter(i.SCISSOR_BOX),Ce=i.getParameter(i.VIEWPORT),qe=new nt().fromArray(ue),Ze=new nt().fromArray(Ce);function Q(I,re,oe,me){const te=new Uint8Array(4),Z=i.createTexture();i.bindTexture(I,Z),i.texParameteri(I,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(I,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let ve=0;ve<oe;ve++)I===i.TEXTURE_3D||I===i.TEXTURE_2D_ARRAY?i.texImage3D(re,0,i.RGBA,1,1,me,0,i.RGBA,i.UNSIGNED_BYTE,te):i.texImage2D(re+ve,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,te);return Z}const H={};H[i.TEXTURE_2D]=Q(i.TEXTURE_2D,i.TEXTURE_2D,1),H[i.TEXTURE_CUBE_MAP]=Q(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),H[i.TEXTURE_2D_ARRAY]=Q(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),H[i.TEXTURE_3D]=Q(i.TEXTURE_3D,i.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),$(i.DEPTH_TEST),o.setFunc(Ji),Le(!1),Me(il),$(i.CULL_FACE),ut(kn);function $(I){u[I]!==!0&&(i.enable(I),u[I]=!0)}function de(I){u[I]!==!1&&(i.disable(I),u[I]=!1)}function Ae(I,re){return d[I]!==re?(i.bindFramebuffer(I,re),d[I]=re,I===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=re),I===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=re),!0):!1}function xe(I,re){let oe=f,me=!1;if(I){oe=p.get(re),oe===void 0&&(oe=[],p.set(re,oe));const te=I.textures;if(oe.length!==te.length||oe[0]!==i.COLOR_ATTACHMENT0){for(let Z=0,ve=te.length;Z<ve;Z++)oe[Z]=i.COLOR_ATTACHMENT0+Z;oe.length=te.length,me=!0}}else oe[0]!==i.BACK&&(oe[0]=i.BACK,me=!0);me&&i.drawBuffers(oe)}function Oe(I){return g!==I?(i.useProgram(I),g=I,!0):!1}const xt={[pi]:i.FUNC_ADD,[yu]:i.FUNC_SUBTRACT,[Eu]:i.FUNC_REVERSE_SUBTRACT};xt[Tu]=i.MIN,xt[bu]=i.MAX;const A={[wu]:i.ZERO,[Au]:i.ONE,[Ru]:i.SRC_COLOR,[Ia]:i.SRC_ALPHA,[Uu]:i.SRC_ALPHA_SATURATE,[Iu]:i.DST_COLOR,[Pu]:i.DST_ALPHA,[Cu]:i.ONE_MINUS_SRC_COLOR,[La]:i.ONE_MINUS_SRC_ALPHA,[Lu]:i.ONE_MINUS_DST_COLOR,[Du]:i.ONE_MINUS_DST_ALPHA,[Nu]:i.CONSTANT_COLOR,[Fu]:i.ONE_MINUS_CONSTANT_COLOR,[Ou]:i.CONSTANT_ALPHA,[Bu]:i.ONE_MINUS_CONSTANT_ALPHA};function ut(I,re,oe,me,te,Z,ve,Fe,at,Je){if(I===kn){_===!0&&(de(i.BLEND),_=!1);return}if(_===!1&&($(i.BLEND),_=!0),I!==Su){if(I!==m||Je!==M){if((h!==pi||y!==pi)&&(i.blendEquation(i.FUNC_ADD),h=pi,y=pi),Je)switch(I){case Ki:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Da:i.blendFunc(i.ONE,i.ONE);break;case rl:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case sl:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}else switch(I){case Ki:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Da:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case rl:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case sl:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}T=null,b=null,P=null,w=null,D.set(0,0,0),L=0,m=I,M=Je}return}te=te||re,Z=Z||oe,ve=ve||me,(re!==h||te!==y)&&(i.blendEquationSeparate(xt[re],xt[te]),h=re,y=te),(oe!==T||me!==b||Z!==P||ve!==w)&&(i.blendFuncSeparate(A[oe],A[me],A[Z],A[ve]),T=oe,b=me,P=Z,w=ve),(Fe.equals(D)===!1||at!==L)&&(i.blendColor(Fe.r,Fe.g,Fe.b,at),D.copy(Fe),L=at),m=I,M=!1}function Be(I,re){I.side===Kt?de(i.CULL_FACE):$(i.CULL_FACE);let oe=I.side===Wt;re&&(oe=!oe),Le(oe),I.blending===Ki&&I.transparent===!1?ut(kn):ut(I.blending,I.blendEquation,I.blendSrc,I.blendDst,I.blendEquationAlpha,I.blendSrcAlpha,I.blendDstAlpha,I.blendColor,I.blendAlpha,I.premultipliedAlpha),o.setFunc(I.depthFunc),o.setTest(I.depthTest),o.setMask(I.depthWrite),s.setMask(I.colorWrite);const me=I.stencilWrite;a.setTest(me),me&&(a.setMask(I.stencilWriteMask),a.setFunc(I.stencilFunc,I.stencilRef,I.stencilFuncMask),a.setOp(I.stencilFail,I.stencilZFail,I.stencilZPass)),Se(I.polygonOffset,I.polygonOffsetFactor,I.polygonOffsetUnits),I.alphaToCoverage===!0?$(i.SAMPLE_ALPHA_TO_COVERAGE):de(i.SAMPLE_ALPHA_TO_COVERAGE)}function Le(I){S!==I&&(I?i.frontFace(i.CW):i.frontFace(i.CCW),S=I)}function Me(I){I!==xu?($(i.CULL_FACE),I!==R&&(I===il?i.cullFace(i.BACK):I===Mu?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):de(i.CULL_FACE),R=I}function dt(I){I!==C&&(F&&i.lineWidth(I),C=I)}function Se(I,re,oe){I?($(i.POLYGON_OFFSET_FILL),(B!==re||N!==oe)&&(i.polygonOffset(re,oe),B=re,N=oe)):de(i.POLYGON_OFFSET_FILL)}function He(I){I?$(i.SCISSOR_TEST):de(i.SCISSOR_TEST)}function Ct(I){I===void 0&&(I=i.TEXTURE0+z-1),j!==I&&(i.activeTexture(I),j=I)}function vt(I,re,oe){oe===void 0&&(j===null?oe=i.TEXTURE0+z-1:oe=j);let me=ee[oe];me===void 0&&(me={type:void 0,texture:void 0},ee[oe]=me),(me.type!==I||me.texture!==re)&&(j!==oe&&(i.activeTexture(oe),j=oe),i.bindTexture(I,re||H[I]),me.type=I,me.texture=re)}function E(){const I=ee[j];I!==void 0&&I.type!==void 0&&(i.bindTexture(I.type,null),I.type=void 0,I.texture=void 0)}function v(){try{i.compressedTexImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function G(){try{i.compressedTexImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function K(){try{i.texSubImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function J(){try{i.texSubImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Y(){try{i.compressedTexSubImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function be(){try{i.compressedTexSubImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function se(){try{i.texStorage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ye(){try{i.texStorage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Ee(){try{i.texImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ie(){try{i.texImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function fe(I){qe.equals(I)===!1&&(i.scissor(I.x,I.y,I.z,I.w),qe.copy(I))}function Ie(I){Ze.equals(I)===!1&&(i.viewport(I.x,I.y,I.z,I.w),Ze.copy(I))}function Te(I,re){let oe=c.get(re);oe===void 0&&(oe=new WeakMap,c.set(re,oe));let me=oe.get(I);me===void 0&&(me=i.getUniformBlockIndex(re,I.name),oe.set(I,me))}function ce(I,re){const me=c.get(re).get(I);l.get(re)!==me&&(i.uniformBlockBinding(re,me,I.__bindingPointIndex),l.set(re,me))}function ze(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),u={},j=null,ee={},d={},p=new WeakMap,f=[],g=null,_=!1,m=null,h=null,T=null,b=null,y=null,P=null,w=null,D=new Ne(0,0,0),L=0,M=!1,S=null,R=null,C=null,B=null,N=null,qe.set(0,0,i.canvas.width,i.canvas.height),Ze.set(0,0,i.canvas.width,i.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:$,disable:de,bindFramebuffer:Ae,drawBuffers:xe,useProgram:Oe,setBlending:ut,setMaterial:Be,setFlipSided:Le,setCullFace:Me,setLineWidth:dt,setPolygonOffset:Se,setScissorTest:He,activeTexture:Ct,bindTexture:vt,unbindTexture:E,compressedTexImage2D:v,compressedTexImage3D:G,texImage2D:Ee,texImage3D:ie,updateUBOMapping:Te,uniformBlockBinding:ce,texStorage2D:se,texStorage3D:ye,texSubImage2D:K,texSubImage3D:J,compressedTexSubImage2D:Y,compressedTexSubImage3D:be,scissor:fe,viewport:Ie,reset:ze}}function zg(i,e,t,n,r,s,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new we,u=new WeakMap;let d;const p=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(E,v){return f?new OffscreenCanvas(E,v):Ps("canvas")}function _(E,v,G){let K=1;const J=vt(E);if((J.width>G||J.height>G)&&(K=G/Math.max(J.width,J.height)),K<1)if(typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&E instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&E instanceof ImageBitmap||typeof VideoFrame<"u"&&E instanceof VideoFrame){const Y=Math.floor(K*J.width),be=Math.floor(K*J.height);d===void 0&&(d=g(Y,be));const se=v?g(Y,be):d;return se.width=Y,se.height=be,se.getContext("2d").drawImage(E,0,0,Y,be),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+J.width+"x"+J.height+") to ("+Y+"x"+be+")."),se}else return"data"in E&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+J.width+"x"+J.height+")."),E;return E}function m(E){return E.generateMipmaps}function h(E){i.generateMipmap(E)}function T(E){return E.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:E.isWebGL3DRenderTarget?i.TEXTURE_3D:E.isWebGLArrayRenderTarget||E.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function b(E,v,G,K,J=!1){if(E!==null){if(i[E]!==void 0)return i[E];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+E+"'")}let Y=v;if(v===i.RED&&(G===i.FLOAT&&(Y=i.R32F),G===i.HALF_FLOAT&&(Y=i.R16F),G===i.UNSIGNED_BYTE&&(Y=i.R8)),v===i.RED_INTEGER&&(G===i.UNSIGNED_BYTE&&(Y=i.R8UI),G===i.UNSIGNED_SHORT&&(Y=i.R16UI),G===i.UNSIGNED_INT&&(Y=i.R32UI),G===i.BYTE&&(Y=i.R8I),G===i.SHORT&&(Y=i.R16I),G===i.INT&&(Y=i.R32I)),v===i.RG&&(G===i.FLOAT&&(Y=i.RG32F),G===i.HALF_FLOAT&&(Y=i.RG16F),G===i.UNSIGNED_BYTE&&(Y=i.RG8)),v===i.RG_INTEGER&&(G===i.UNSIGNED_BYTE&&(Y=i.RG8UI),G===i.UNSIGNED_SHORT&&(Y=i.RG16UI),G===i.UNSIGNED_INT&&(Y=i.RG32UI),G===i.BYTE&&(Y=i.RG8I),G===i.SHORT&&(Y=i.RG16I),G===i.INT&&(Y=i.RG32I)),v===i.RGB_INTEGER&&(G===i.UNSIGNED_BYTE&&(Y=i.RGB8UI),G===i.UNSIGNED_SHORT&&(Y=i.RGB16UI),G===i.UNSIGNED_INT&&(Y=i.RGB32UI),G===i.BYTE&&(Y=i.RGB8I),G===i.SHORT&&(Y=i.RGB16I),G===i.INT&&(Y=i.RGB32I)),v===i.RGBA_INTEGER&&(G===i.UNSIGNED_BYTE&&(Y=i.RGBA8UI),G===i.UNSIGNED_SHORT&&(Y=i.RGBA16UI),G===i.UNSIGNED_INT&&(Y=i.RGBA32UI),G===i.BYTE&&(Y=i.RGBA8I),G===i.SHORT&&(Y=i.RGBA16I),G===i.INT&&(Y=i.RGBA32I)),v===i.RGB&&(G===i.UNSIGNED_INT_5_9_9_9_REV&&(Y=i.RGB9_E5),G===i.UNSIGNED_INT_10F_11F_11F_REV&&(Y=i.R11F_G11F_B10F)),v===i.RGBA){const be=J?Rs:Ke.getTransfer(K);G===i.FLOAT&&(Y=i.RGBA32F),G===i.HALF_FLOAT&&(Y=i.RGBA16F),G===i.UNSIGNED_BYTE&&(Y=be===tt?i.SRGB8_ALPHA8:i.RGBA8),G===i.UNSIGNED_SHORT_4_4_4_4&&(Y=i.RGBA4),G===i.UNSIGNED_SHORT_5_5_5_1&&(Y=i.RGB5_A1)}return(Y===i.R16F||Y===i.R32F||Y===i.RG16F||Y===i.RG32F||Y===i.RGBA16F||Y===i.RGBA32F)&&e.get("EXT_color_buffer_float"),Y}function y(E,v){let G;return E?v===null||v===Si||v===Rr?G=i.DEPTH24_STENCIL8:v===bn?G=i.DEPTH32F_STENCIL8:v===Ar&&(G=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===Si||v===Rr?G=i.DEPTH_COMPONENT24:v===bn?G=i.DEPTH_COMPONENT32F:v===Ar&&(G=i.DEPTH_COMPONENT16),G}function P(E,v){return m(E)===!0||E.isFramebufferTexture&&E.minFilter!==Zt&&E.minFilter!==pn?Math.log2(Math.max(v.width,v.height))+1:E.mipmaps!==void 0&&E.mipmaps.length>0?E.mipmaps.length:E.isCompressedTexture&&Array.isArray(E.image)?v.mipmaps.length:1}function w(E){const v=E.target;v.removeEventListener("dispose",w),L(v),v.isVideoTexture&&u.delete(v)}function D(E){const v=E.target;v.removeEventListener("dispose",D),S(v)}function L(E){const v=n.get(E);if(v.__webglInit===void 0)return;const G=E.source,K=p.get(G);if(K){const J=K[v.__cacheKey];J.usedTimes--,J.usedTimes===0&&M(E),Object.keys(K).length===0&&p.delete(G)}n.remove(E)}function M(E){const v=n.get(E);i.deleteTexture(v.__webglTexture);const G=E.source,K=p.get(G);delete K[v.__cacheKey],o.memory.textures--}function S(E){const v=n.get(E);if(E.depthTexture&&(E.depthTexture.dispose(),n.remove(E.depthTexture)),E.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(v.__webglFramebuffer[K]))for(let J=0;J<v.__webglFramebuffer[K].length;J++)i.deleteFramebuffer(v.__webglFramebuffer[K][J]);else i.deleteFramebuffer(v.__webglFramebuffer[K]);v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer[K])}else{if(Array.isArray(v.__webglFramebuffer))for(let K=0;K<v.__webglFramebuffer.length;K++)i.deleteFramebuffer(v.__webglFramebuffer[K]);else i.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&i.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let K=0;K<v.__webglColorRenderbuffer.length;K++)v.__webglColorRenderbuffer[K]&&i.deleteRenderbuffer(v.__webglColorRenderbuffer[K]);v.__webglDepthRenderbuffer&&i.deleteRenderbuffer(v.__webglDepthRenderbuffer)}const G=E.textures;for(let K=0,J=G.length;K<J;K++){const Y=n.get(G[K]);Y.__webglTexture&&(i.deleteTexture(Y.__webglTexture),o.memory.textures--),n.remove(G[K])}n.remove(E)}let R=0;function C(){R=0}function B(){const E=R;return E>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+E+" texture units while this GPU supports only "+r.maxTextures),R+=1,E}function N(E){const v=[];return v.push(E.wrapS),v.push(E.wrapT),v.push(E.wrapR||0),v.push(E.magFilter),v.push(E.minFilter),v.push(E.anisotropy),v.push(E.internalFormat),v.push(E.format),v.push(E.type),v.push(E.generateMipmaps),v.push(E.premultiplyAlpha),v.push(E.flipY),v.push(E.unpackAlignment),v.push(E.colorSpace),v.join()}function z(E,v){const G=n.get(E);if(E.isVideoTexture&&He(E),E.isRenderTargetTexture===!1&&E.isExternalTexture!==!0&&E.version>0&&G.__version!==E.version){const K=E.image;if(K===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(K.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{H(G,E,v);return}}else E.isExternalTexture&&(G.__webglTexture=E.sourceTexture?E.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,G.__webglTexture,i.TEXTURE0+v)}function F(E,v){const G=n.get(E);if(E.isRenderTargetTexture===!1&&E.version>0&&G.__version!==E.version){H(G,E,v);return}t.bindTexture(i.TEXTURE_2D_ARRAY,G.__webglTexture,i.TEXTURE0+v)}function q(E,v){const G=n.get(E);if(E.isRenderTargetTexture===!1&&E.version>0&&G.__version!==E.version){H(G,E,v);return}t.bindTexture(i.TEXTURE_3D,G.__webglTexture,i.TEXTURE0+v)}function V(E,v){const G=n.get(E);if(E.version>0&&G.__version!==E.version){$(G,E,v);return}t.bindTexture(i.TEXTURE_CUBE_MAP,G.__webglTexture,i.TEXTURE0+v)}const j={[Ga]:i.REPEAT,[vi]:i.CLAMP_TO_EDGE,[Wa]:i.MIRRORED_REPEAT},ee={[Zt]:i.NEAREST,[Yu]:i.NEAREST_MIPMAP_NEAREST,[Vr]:i.NEAREST_MIPMAP_LINEAR,[pn]:i.LINEAR,[Xs]:i.LINEAR_MIPMAP_NEAREST,[xi]:i.LINEAR_MIPMAP_LINEAR},ue={[ju]:i.NEVER,[id]:i.ALWAYS,[Ju]:i.LESS,[Uc]:i.LEQUAL,[Qu]:i.EQUAL,[nd]:i.GEQUAL,[ed]:i.GREATER,[td]:i.NOTEQUAL};function Ce(E,v){if(v.type===bn&&e.has("OES_texture_float_linear")===!1&&(v.magFilter===pn||v.magFilter===Xs||v.magFilter===Vr||v.magFilter===xi||v.minFilter===pn||v.minFilter===Xs||v.minFilter===Vr||v.minFilter===xi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(E,i.TEXTURE_WRAP_S,j[v.wrapS]),i.texParameteri(E,i.TEXTURE_WRAP_T,j[v.wrapT]),(E===i.TEXTURE_3D||E===i.TEXTURE_2D_ARRAY)&&i.texParameteri(E,i.TEXTURE_WRAP_R,j[v.wrapR]),i.texParameteri(E,i.TEXTURE_MAG_FILTER,ee[v.magFilter]),i.texParameteri(E,i.TEXTURE_MIN_FILTER,ee[v.minFilter]),v.compareFunction&&(i.texParameteri(E,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(E,i.TEXTURE_COMPARE_FUNC,ue[v.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===Zt||v.minFilter!==Vr&&v.minFilter!==xi||v.type===bn&&e.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||n.get(v).__currentAnisotropy){const G=e.get("EXT_texture_filter_anisotropic");i.texParameterf(E,G.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,r.getMaxAnisotropy())),n.get(v).__currentAnisotropy=v.anisotropy}}}function qe(E,v){let G=!1;E.__webglInit===void 0&&(E.__webglInit=!0,v.addEventListener("dispose",w));const K=v.source;let J=p.get(K);J===void 0&&(J={},p.set(K,J));const Y=N(v);if(Y!==E.__cacheKey){J[Y]===void 0&&(J[Y]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,G=!0),J[Y].usedTimes++;const be=J[E.__cacheKey];be!==void 0&&(J[E.__cacheKey].usedTimes--,be.usedTimes===0&&M(v)),E.__cacheKey=Y,E.__webglTexture=J[Y].texture}return G}function Ze(E,v,G){return Math.floor(Math.floor(E/G)/v)}function Q(E,v,G,K){const Y=E.updateRanges;if(Y.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,v.width,v.height,G,K,v.data);else{Y.sort((ie,fe)=>ie.start-fe.start);let be=0;for(let ie=1;ie<Y.length;ie++){const fe=Y[be],Ie=Y[ie],Te=fe.start+fe.count,ce=Ze(Ie.start,v.width,4),ze=Ze(fe.start,v.width,4);Ie.start<=Te+1&&ce===ze&&Ze(Ie.start+Ie.count-1,v.width,4)===ce?fe.count=Math.max(fe.count,Ie.start+Ie.count-fe.start):(++be,Y[be]=Ie)}Y.length=be+1;const se=i.getParameter(i.UNPACK_ROW_LENGTH),ye=i.getParameter(i.UNPACK_SKIP_PIXELS),Ee=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,v.width);for(let ie=0,fe=Y.length;ie<fe;ie++){const Ie=Y[ie],Te=Math.floor(Ie.start/4),ce=Math.ceil(Ie.count/4),ze=Te%v.width,I=Math.floor(Te/v.width),re=ce,oe=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,ze),i.pixelStorei(i.UNPACK_SKIP_ROWS,I),t.texSubImage2D(i.TEXTURE_2D,0,ze,I,re,oe,G,K,v.data)}E.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,se),i.pixelStorei(i.UNPACK_SKIP_PIXELS,ye),i.pixelStorei(i.UNPACK_SKIP_ROWS,Ee)}}function H(E,v,G){let K=i.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(K=i.TEXTURE_2D_ARRAY),v.isData3DTexture&&(K=i.TEXTURE_3D);const J=qe(E,v),Y=v.source;t.bindTexture(K,E.__webglTexture,i.TEXTURE0+G);const be=n.get(Y);if(Y.version!==be.__version||J===!0){t.activeTexture(i.TEXTURE0+G);const se=Ke.getPrimaries(Ke.workingColorSpace),ye=v.colorSpace===ei?null:Ke.getPrimaries(v.colorSpace),Ee=v.colorSpace===ei||se===ye?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ee);let ie=_(v.image,!1,r.maxTextureSize);ie=Ct(v,ie);const fe=s.convert(v.format,v.colorSpace),Ie=s.convert(v.type);let Te=b(v.internalFormat,fe,Ie,v.colorSpace,v.isVideoTexture);Ce(K,v);let ce;const ze=v.mipmaps,I=v.isVideoTexture!==!0,re=be.__version===void 0||J===!0,oe=Y.dataReady,me=P(v,ie);if(v.isDepthTexture)Te=y(v.format===Pr,v.type),re&&(I?t.texStorage2D(i.TEXTURE_2D,1,Te,ie.width,ie.height):t.texImage2D(i.TEXTURE_2D,0,Te,ie.width,ie.height,0,fe,Ie,null));else if(v.isDataTexture)if(ze.length>0){I&&re&&t.texStorage2D(i.TEXTURE_2D,me,Te,ze[0].width,ze[0].height);for(let te=0,Z=ze.length;te<Z;te++)ce=ze[te],I?oe&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,ce.width,ce.height,fe,Ie,ce.data):t.texImage2D(i.TEXTURE_2D,te,Te,ce.width,ce.height,0,fe,Ie,ce.data);v.generateMipmaps=!1}else I?(re&&t.texStorage2D(i.TEXTURE_2D,me,Te,ie.width,ie.height),oe&&Q(v,ie,fe,Ie)):t.texImage2D(i.TEXTURE_2D,0,Te,ie.width,ie.height,0,fe,Ie,ie.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){I&&re&&t.texStorage3D(i.TEXTURE_2D_ARRAY,me,Te,ze[0].width,ze[0].height,ie.depth);for(let te=0,Z=ze.length;te<Z;te++)if(ce=ze[te],v.format!==mn)if(fe!==null)if(I){if(oe)if(v.layerUpdates.size>0){const ve=Bl(ce.width,ce.height,v.format,v.type);for(const Fe of v.layerUpdates){const at=ce.data.subarray(Fe*ve/ce.data.BYTES_PER_ELEMENT,(Fe+1)*ve/ce.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,Fe,ce.width,ce.height,1,fe,at)}v.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,ce.width,ce.height,ie.depth,fe,ce.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,te,Te,ce.width,ce.height,ie.depth,0,ce.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else I?oe&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,ce.width,ce.height,ie.depth,fe,Ie,ce.data):t.texImage3D(i.TEXTURE_2D_ARRAY,te,Te,ce.width,ce.height,ie.depth,0,fe,Ie,ce.data)}else{I&&re&&t.texStorage2D(i.TEXTURE_2D,me,Te,ze[0].width,ze[0].height);for(let te=0,Z=ze.length;te<Z;te++)ce=ze[te],v.format!==mn?fe!==null?I?oe&&t.compressedTexSubImage2D(i.TEXTURE_2D,te,0,0,ce.width,ce.height,fe,ce.data):t.compressedTexImage2D(i.TEXTURE_2D,te,Te,ce.width,ce.height,0,ce.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):I?oe&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,ce.width,ce.height,fe,Ie,ce.data):t.texImage2D(i.TEXTURE_2D,te,Te,ce.width,ce.height,0,fe,Ie,ce.data)}else if(v.isDataArrayTexture)if(I){if(re&&t.texStorage3D(i.TEXTURE_2D_ARRAY,me,Te,ie.width,ie.height,ie.depth),oe)if(v.layerUpdates.size>0){const te=Bl(ie.width,ie.height,v.format,v.type);for(const Z of v.layerUpdates){const ve=ie.data.subarray(Z*te/ie.data.BYTES_PER_ELEMENT,(Z+1)*te/ie.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Z,ie.width,ie.height,1,fe,Ie,ve)}v.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ie.width,ie.height,ie.depth,fe,Ie,ie.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Te,ie.width,ie.height,ie.depth,0,fe,Ie,ie.data);else if(v.isData3DTexture)I?(re&&t.texStorage3D(i.TEXTURE_3D,me,Te,ie.width,ie.height,ie.depth),oe&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ie.width,ie.height,ie.depth,fe,Ie,ie.data)):t.texImage3D(i.TEXTURE_3D,0,Te,ie.width,ie.height,ie.depth,0,fe,Ie,ie.data);else if(v.isFramebufferTexture){if(re)if(I)t.texStorage2D(i.TEXTURE_2D,me,Te,ie.width,ie.height);else{let te=ie.width,Z=ie.height;for(let ve=0;ve<me;ve++)t.texImage2D(i.TEXTURE_2D,ve,Te,te,Z,0,fe,Ie,null),te>>=1,Z>>=1}}else if(ze.length>0){if(I&&re){const te=vt(ze[0]);t.texStorage2D(i.TEXTURE_2D,me,Te,te.width,te.height)}for(let te=0,Z=ze.length;te<Z;te++)ce=ze[te],I?oe&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,fe,Ie,ce):t.texImage2D(i.TEXTURE_2D,te,Te,fe,Ie,ce);v.generateMipmaps=!1}else if(I){if(re){const te=vt(ie);t.texStorage2D(i.TEXTURE_2D,me,Te,te.width,te.height)}oe&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,fe,Ie,ie)}else t.texImage2D(i.TEXTURE_2D,0,Te,fe,Ie,ie);m(v)&&h(K),be.__version=Y.version,v.onUpdate&&v.onUpdate(v)}E.__version=v.version}function $(E,v,G){if(v.image.length!==6)return;const K=qe(E,v),J=v.source;t.bindTexture(i.TEXTURE_CUBE_MAP,E.__webglTexture,i.TEXTURE0+G);const Y=n.get(J);if(J.version!==Y.__version||K===!0){t.activeTexture(i.TEXTURE0+G);const be=Ke.getPrimaries(Ke.workingColorSpace),se=v.colorSpace===ei?null:Ke.getPrimaries(v.colorSpace),ye=v.colorSpace===ei||be===se?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ye);const Ee=v.isCompressedTexture||v.image[0].isCompressedTexture,ie=v.image[0]&&v.image[0].isDataTexture,fe=[];for(let Z=0;Z<6;Z++)!Ee&&!ie?fe[Z]=_(v.image[Z],!0,r.maxCubemapSize):fe[Z]=ie?v.image[Z].image:v.image[Z],fe[Z]=Ct(v,fe[Z]);const Ie=fe[0],Te=s.convert(v.format,v.colorSpace),ce=s.convert(v.type),ze=b(v.internalFormat,Te,ce,v.colorSpace),I=v.isVideoTexture!==!0,re=Y.__version===void 0||K===!0,oe=J.dataReady;let me=P(v,Ie);Ce(i.TEXTURE_CUBE_MAP,v);let te;if(Ee){I&&re&&t.texStorage2D(i.TEXTURE_CUBE_MAP,me,ze,Ie.width,Ie.height);for(let Z=0;Z<6;Z++){te=fe[Z].mipmaps;for(let ve=0;ve<te.length;ve++){const Fe=te[ve];v.format!==mn?Te!==null?I?oe&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve,0,0,Fe.width,Fe.height,Te,Fe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve,ze,Fe.width,Fe.height,0,Fe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):I?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve,0,0,Fe.width,Fe.height,Te,ce,Fe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve,ze,Fe.width,Fe.height,0,Te,ce,Fe.data)}}}else{if(te=v.mipmaps,I&&re){te.length>0&&me++;const Z=vt(fe[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,me,ze,Z.width,Z.height)}for(let Z=0;Z<6;Z++)if(ie){I?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,fe[Z].width,fe[Z].height,Te,ce,fe[Z].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,ze,fe[Z].width,fe[Z].height,0,Te,ce,fe[Z].data);for(let ve=0;ve<te.length;ve++){const at=te[ve].image[Z].image;I?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve+1,0,0,at.width,at.height,Te,ce,at.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve+1,ze,at.width,at.height,0,Te,ce,at.data)}}else{I?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,Te,ce,fe[Z]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,ze,Te,ce,fe[Z]);for(let ve=0;ve<te.length;ve++){const Fe=te[ve];I?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve+1,0,0,Te,ce,Fe.image[Z]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve+1,ze,Te,ce,Fe.image[Z])}}}m(v)&&h(i.TEXTURE_CUBE_MAP),Y.__version=J.version,v.onUpdate&&v.onUpdate(v)}E.__version=v.version}function de(E,v,G,K,J,Y){const be=s.convert(G.format,G.colorSpace),se=s.convert(G.type),ye=b(G.internalFormat,be,se,G.colorSpace),Ee=n.get(v),ie=n.get(G);if(ie.__renderTarget=v,!Ee.__hasExternalTextures){const fe=Math.max(1,v.width>>Y),Ie=Math.max(1,v.height>>Y);J===i.TEXTURE_3D||J===i.TEXTURE_2D_ARRAY?t.texImage3D(J,Y,ye,fe,Ie,v.depth,0,be,se,null):t.texImage2D(J,Y,ye,fe,Ie,0,be,se,null)}t.bindFramebuffer(i.FRAMEBUFFER,E),Se(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,K,J,ie.__webglTexture,0,dt(v)):(J===i.TEXTURE_2D||J>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&J<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,K,J,ie.__webglTexture,Y),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Ae(E,v,G){if(i.bindRenderbuffer(i.RENDERBUFFER,E),v.depthBuffer){const K=v.depthTexture,J=K&&K.isDepthTexture?K.type:null,Y=y(v.stencilBuffer,J),be=v.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,se=dt(v);Se(v)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,se,Y,v.width,v.height):G?i.renderbufferStorageMultisample(i.RENDERBUFFER,se,Y,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,Y,v.width,v.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,be,i.RENDERBUFFER,E)}else{const K=v.textures;for(let J=0;J<K.length;J++){const Y=K[J],be=s.convert(Y.format,Y.colorSpace),se=s.convert(Y.type),ye=b(Y.internalFormat,be,se,Y.colorSpace),Ee=dt(v);G&&Se(v)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ee,ye,v.width,v.height):Se(v)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ee,ye,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,ye,v.width,v.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function xe(E,v){if(v&&v.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,E),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const K=n.get(v.depthTexture);K.__renderTarget=v,(!K.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),z(v.depthTexture,0);const J=K.__webglTexture,Y=dt(v);if(v.depthTexture.format===Cr)Se(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,J,0,Y):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,J,0);else if(v.depthTexture.format===Pr)Se(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,J,0,Y):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,J,0);else throw new Error("Unknown depthTexture format")}function Oe(E){const v=n.get(E),G=E.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==E.depthTexture){const K=E.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),K){const J=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,K.removeEventListener("dispose",J)};K.addEventListener("dispose",J),v.__depthDisposeCallback=J}v.__boundDepthTexture=K}if(E.depthTexture&&!v.__autoAllocateDepthBuffer){if(G)throw new Error("target.depthTexture not supported in Cube render targets");const K=E.texture.mipmaps;K&&K.length>0?xe(v.__webglFramebuffer[0],E):xe(v.__webglFramebuffer,E)}else if(G){v.__webglDepthbuffer=[];for(let K=0;K<6;K++)if(t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[K]),v.__webglDepthbuffer[K]===void 0)v.__webglDepthbuffer[K]=i.createRenderbuffer(),Ae(v.__webglDepthbuffer[K],E,!1);else{const J=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Y=v.__webglDepthbuffer[K];i.bindRenderbuffer(i.RENDERBUFFER,Y),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,Y)}}else{const K=E.texture.mipmaps;if(K&&K.length>0?t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=i.createRenderbuffer(),Ae(v.__webglDepthbuffer,E,!1);else{const J=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Y=v.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Y),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,Y)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function xt(E,v,G){const K=n.get(E);v!==void 0&&de(K.__webglFramebuffer,E,E.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),G!==void 0&&Oe(E)}function A(E){const v=E.texture,G=n.get(E),K=n.get(v);E.addEventListener("dispose",D);const J=E.textures,Y=E.isWebGLCubeRenderTarget===!0,be=J.length>1;if(be||(K.__webglTexture===void 0&&(K.__webglTexture=i.createTexture()),K.__version=v.version,o.memory.textures++),Y){G.__webglFramebuffer=[];for(let se=0;se<6;se++)if(v.mipmaps&&v.mipmaps.length>0){G.__webglFramebuffer[se]=[];for(let ye=0;ye<v.mipmaps.length;ye++)G.__webglFramebuffer[se][ye]=i.createFramebuffer()}else G.__webglFramebuffer[se]=i.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){G.__webglFramebuffer=[];for(let se=0;se<v.mipmaps.length;se++)G.__webglFramebuffer[se]=i.createFramebuffer()}else G.__webglFramebuffer=i.createFramebuffer();if(be)for(let se=0,ye=J.length;se<ye;se++){const Ee=n.get(J[se]);Ee.__webglTexture===void 0&&(Ee.__webglTexture=i.createTexture(),o.memory.textures++)}if(E.samples>0&&Se(E)===!1){G.__webglMultisampledFramebuffer=i.createFramebuffer(),G.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,G.__webglMultisampledFramebuffer);for(let se=0;se<J.length;se++){const ye=J[se];G.__webglColorRenderbuffer[se]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,G.__webglColorRenderbuffer[se]);const Ee=s.convert(ye.format,ye.colorSpace),ie=s.convert(ye.type),fe=b(ye.internalFormat,Ee,ie,ye.colorSpace,E.isXRRenderTarget===!0),Ie=dt(E);i.renderbufferStorageMultisample(i.RENDERBUFFER,Ie,fe,E.width,E.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+se,i.RENDERBUFFER,G.__webglColorRenderbuffer[se])}i.bindRenderbuffer(i.RENDERBUFFER,null),E.depthBuffer&&(G.__webglDepthRenderbuffer=i.createRenderbuffer(),Ae(G.__webglDepthRenderbuffer,E,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Y){t.bindTexture(i.TEXTURE_CUBE_MAP,K.__webglTexture),Ce(i.TEXTURE_CUBE_MAP,v);for(let se=0;se<6;se++)if(v.mipmaps&&v.mipmaps.length>0)for(let ye=0;ye<v.mipmaps.length;ye++)de(G.__webglFramebuffer[se][ye],E,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+se,ye);else de(G.__webglFramebuffer[se],E,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+se,0);m(v)&&h(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(be){for(let se=0,ye=J.length;se<ye;se++){const Ee=J[se],ie=n.get(Ee);let fe=i.TEXTURE_2D;(E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(fe=E.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(fe,ie.__webglTexture),Ce(fe,Ee),de(G.__webglFramebuffer,E,Ee,i.COLOR_ATTACHMENT0+se,fe,0),m(Ee)&&h(fe)}t.unbindTexture()}else{let se=i.TEXTURE_2D;if((E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(se=E.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(se,K.__webglTexture),Ce(se,v),v.mipmaps&&v.mipmaps.length>0)for(let ye=0;ye<v.mipmaps.length;ye++)de(G.__webglFramebuffer[ye],E,v,i.COLOR_ATTACHMENT0,se,ye);else de(G.__webglFramebuffer,E,v,i.COLOR_ATTACHMENT0,se,0);m(v)&&h(se),t.unbindTexture()}E.depthBuffer&&Oe(E)}function ut(E){const v=E.textures;for(let G=0,K=v.length;G<K;G++){const J=v[G];if(m(J)){const Y=T(E),be=n.get(J).__webglTexture;t.bindTexture(Y,be),h(Y),t.unbindTexture()}}}const Be=[],Le=[];function Me(E){if(E.samples>0){if(Se(E)===!1){const v=E.textures,G=E.width,K=E.height;let J=i.COLOR_BUFFER_BIT;const Y=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,be=n.get(E),se=v.length>1;if(se)for(let Ee=0;Ee<v.length;Ee++)t.bindFramebuffer(i.FRAMEBUFFER,be.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ee,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,be.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ee,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,be.__webglMultisampledFramebuffer);const ye=E.texture.mipmaps;ye&&ye.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,be.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,be.__webglFramebuffer);for(let Ee=0;Ee<v.length;Ee++){if(E.resolveDepthBuffer&&(E.depthBuffer&&(J|=i.DEPTH_BUFFER_BIT),E.stencilBuffer&&E.resolveStencilBuffer&&(J|=i.STENCIL_BUFFER_BIT)),se){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,be.__webglColorRenderbuffer[Ee]);const ie=n.get(v[Ee]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,ie,0)}i.blitFramebuffer(0,0,G,K,0,0,G,K,J,i.NEAREST),l===!0&&(Be.length=0,Le.length=0,Be.push(i.COLOR_ATTACHMENT0+Ee),E.depthBuffer&&E.resolveDepthBuffer===!1&&(Be.push(Y),Le.push(Y),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Le)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Be))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),se)for(let Ee=0;Ee<v.length;Ee++){t.bindFramebuffer(i.FRAMEBUFFER,be.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ee,i.RENDERBUFFER,be.__webglColorRenderbuffer[Ee]);const ie=n.get(v[Ee]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,be.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ee,i.TEXTURE_2D,ie,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,be.__webglMultisampledFramebuffer)}else if(E.depthBuffer&&E.resolveDepthBuffer===!1&&l){const v=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[v])}}}function dt(E){return Math.min(r.maxSamples,E.samples)}function Se(E){const v=n.get(E);return E.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function He(E){const v=o.render.frame;u.get(E)!==v&&(u.set(E,v),E.update())}function Ct(E,v){const G=E.colorSpace,K=E.format,J=E.type;return E.isCompressedTexture===!0||E.isVideoTexture===!0||G!==tr&&G!==ei&&(Ke.getTransfer(G)===tt?(K!==mn||J!==Rn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",G)),v}function vt(E){return typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement?(c.width=E.naturalWidth||E.width,c.height=E.naturalHeight||E.height):typeof VideoFrame<"u"&&E instanceof VideoFrame?(c.width=E.displayWidth,c.height=E.displayHeight):(c.width=E.width,c.height=E.height),c}this.allocateTextureUnit=B,this.resetTextureUnits=C,this.setTexture2D=z,this.setTexture2DArray=F,this.setTexture3D=q,this.setTextureCube=V,this.rebindTextures=xt,this.setupRenderTarget=A,this.updateRenderTargetMipmap=ut,this.updateMultisampleRenderTarget=Me,this.setupDepthRenderbuffer=Oe,this.setupFrameBufferTexture=de,this.useMultisampledRTT=Se}function kg(i,e){function t(n,r=ei){let s;const o=Ke.getTransfer(r);if(n===Rn)return i.UNSIGNED_BYTE;if(n===Co)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Po)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Rc)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Cc)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===wc)return i.BYTE;if(n===Ac)return i.SHORT;if(n===Ar)return i.UNSIGNED_SHORT;if(n===Ro)return i.INT;if(n===Si)return i.UNSIGNED_INT;if(n===bn)return i.FLOAT;if(n===Hn)return i.HALF_FLOAT;if(n===Pc)return i.ALPHA;if(n===Dc)return i.RGB;if(n===mn)return i.RGBA;if(n===Cr)return i.DEPTH_COMPONENT;if(n===Pr)return i.DEPTH_STENCIL;if(n===Do)return i.RED;if(n===Io)return i.RED_INTEGER;if(n===Ic)return i.RG;if(n===Lo)return i.RG_INTEGER;if(n===Uo)return i.RGBA_INTEGER;if(n===xs||n===Ms||n===Ss||n===ys)if(o===tt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===xs)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Ms)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Ss)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ys)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===xs)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Ms)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Ss)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ys)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Xa||n===qa||n===Ya||n===$a)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===Xa)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===qa)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Ya)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===$a)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Ka||n===Za||n===ja)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===Ka||n===Za)return o===tt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===ja)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Ja||n===Qa||n===eo||n===to||n===no||n===io||n===ro||n===so||n===ao||n===oo||n===lo||n===co||n===uo||n===ho)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===Ja)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Qa)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===eo)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===to)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===no)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===io)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===ro)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===so)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===ao)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===oo)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===lo)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===co)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===uo)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===ho)return o===tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===fo||n===po||n===mo)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===fo)return o===tt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===po)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===mo)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===go||n===_o||n===vo||n===xo)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===go)return s.COMPRESSED_RED_RGTC1_EXT;if(n===_o)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===vo)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===xo)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Rr?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const Hg=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Vg=`
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

}`;class Gg{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Yc(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Gt({vertexShader:Hg,fragmentShader:Vg,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new ae(new Pn(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Wg extends rr{constructor(e,t){super();const n=this;let r=null,s=1,o=null,a="local-floor",l=1,c=null,u=null,d=null,p=null,f=null,g=null;const _=typeof XRWebGLBinding<"u",m=new Gg,h={},T=t.getContextAttributes();let b=null,y=null;const P=[],w=[],D=new we;let L=null;const M=new rn;M.viewport=new nt;const S=new rn;S.viewport=new nt;const R=[M,S],C=new lh;let B=null,N=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(H){let $=P[H];return $===void 0&&($=new ha,P[H]=$),$.getTargetRaySpace()},this.getControllerGrip=function(H){let $=P[H];return $===void 0&&($=new ha,P[H]=$),$.getGripSpace()},this.getHand=function(H){let $=P[H];return $===void 0&&($=new ha,P[H]=$),$.getHandSpace()};function z(H){const $=w.indexOf(H.inputSource);if($===-1)return;const de=P[$];de!==void 0&&(de.update(H.inputSource,H.frame,c||o),de.dispatchEvent({type:H.type,data:H.inputSource}))}function F(){r.removeEventListener("select",z),r.removeEventListener("selectstart",z),r.removeEventListener("selectend",z),r.removeEventListener("squeeze",z),r.removeEventListener("squeezestart",z),r.removeEventListener("squeezeend",z),r.removeEventListener("end",F),r.removeEventListener("inputsourceschange",q);for(let H=0;H<P.length;H++){const $=w[H];$!==null&&(w[H]=null,P[H].disconnect($))}B=null,N=null,m.reset();for(const H in h)delete h[H];e.setRenderTarget(b),f=null,p=null,d=null,r=null,y=null,Q.stop(),n.isPresenting=!1,e.setPixelRatio(L),e.setSize(D.width,D.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(H){s=H,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(H){a=H,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(H){c=H},this.getBaseLayer=function(){return p!==null?p:f},this.getBinding=function(){return d===null&&_&&(d=new XRWebGLBinding(r,t)),d},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(H){if(r=H,r!==null){if(b=e.getRenderTarget(),r.addEventListener("select",z),r.addEventListener("selectstart",z),r.addEventListener("selectend",z),r.addEventListener("squeeze",z),r.addEventListener("squeezestart",z),r.addEventListener("squeezeend",z),r.addEventListener("end",F),r.addEventListener("inputsourceschange",q),T.xrCompatible!==!0&&await t.makeXRCompatible(),L=e.getPixelRatio(),e.getSize(D),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let de=null,Ae=null,xe=null;T.depth&&(xe=T.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,de=T.stencil?Pr:Cr,Ae=T.stencil?Rr:Si);const Oe={colorFormat:t.RGBA8,depthFormat:xe,scaleFactor:s};d=this.getBinding(),p=d.createProjectionLayer(Oe),r.updateRenderState({layers:[p]}),e.setPixelRatio(1),e.setSize(p.textureWidth,p.textureHeight,!1),y=new _n(p.textureWidth,p.textureHeight,{format:mn,type:Rn,depthTexture:new qc(p.textureWidth,p.textureHeight,Ae,void 0,void 0,void 0,void 0,void 0,void 0,de),stencilBuffer:T.stencil,colorSpace:e.outputColorSpace,samples:T.antialias?4:0,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}else{const de={antialias:T.antialias,alpha:!0,depth:T.depth,stencil:T.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(r,t,de),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new _n(f.framebufferWidth,f.framebufferHeight,{format:mn,type:Rn,colorSpace:e.outputColorSpace,stencilBuffer:T.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await r.requestReferenceSpace(a),Q.setContext(r),Q.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function q(H){for(let $=0;$<H.removed.length;$++){const de=H.removed[$],Ae=w.indexOf(de);Ae>=0&&(w[Ae]=null,P[Ae].disconnect(de))}for(let $=0;$<H.added.length;$++){const de=H.added[$];let Ae=w.indexOf(de);if(Ae===-1){for(let Oe=0;Oe<P.length;Oe++)if(Oe>=w.length){w.push(de),Ae=Oe;break}else if(w[Oe]===null){w[Oe]=de,Ae=Oe;break}if(Ae===-1)break}const xe=P[Ae];xe&&xe.connect(de)}}const V=new U,j=new U;function ee(H,$,de){V.setFromMatrixPosition($.matrixWorld),j.setFromMatrixPosition(de.matrixWorld);const Ae=V.distanceTo(j),xe=$.projectionMatrix.elements,Oe=de.projectionMatrix.elements,xt=xe[14]/(xe[10]-1),A=xe[14]/(xe[10]+1),ut=(xe[9]+1)/xe[5],Be=(xe[9]-1)/xe[5],Le=(xe[8]-1)/xe[0],Me=(Oe[8]+1)/Oe[0],dt=xt*Le,Se=xt*Me,He=Ae/(-Le+Me),Ct=He*-Le;if($.matrixWorld.decompose(H.position,H.quaternion,H.scale),H.translateX(Ct),H.translateZ(He),H.matrixWorld.compose(H.position,H.quaternion,H.scale),H.matrixWorldInverse.copy(H.matrixWorld).invert(),xe[10]===-1)H.projectionMatrix.copy($.projectionMatrix),H.projectionMatrixInverse.copy($.projectionMatrixInverse);else{const vt=xt+He,E=A+He,v=dt-Ct,G=Se+(Ae-Ct),K=ut*A/E*vt,J=Be*A/E*vt;H.projectionMatrix.makePerspective(v,G,K,J,vt,E),H.projectionMatrixInverse.copy(H.projectionMatrix).invert()}}function ue(H,$){$===null?H.matrixWorld.copy(H.matrix):H.matrixWorld.multiplyMatrices($.matrixWorld,H.matrix),H.matrixWorldInverse.copy(H.matrixWorld).invert()}this.updateCamera=function(H){if(r===null)return;let $=H.near,de=H.far;m.texture!==null&&(m.depthNear>0&&($=m.depthNear),m.depthFar>0&&(de=m.depthFar)),C.near=S.near=M.near=$,C.far=S.far=M.far=de,(B!==C.near||N!==C.far)&&(r.updateRenderState({depthNear:C.near,depthFar:C.far}),B=C.near,N=C.far),C.layers.mask=H.layers.mask|6,M.layers.mask=C.layers.mask&3,S.layers.mask=C.layers.mask&5;const Ae=H.parent,xe=C.cameras;ue(C,Ae);for(let Oe=0;Oe<xe.length;Oe++)ue(xe[Oe],Ae);xe.length===2?ee(C,M,S):C.projectionMatrix.copy(M.projectionMatrix),Ce(H,C,Ae)};function Ce(H,$,de){de===null?H.matrix.copy($.matrixWorld):(H.matrix.copy(de.matrixWorld),H.matrix.invert(),H.matrix.multiply($.matrixWorld)),H.matrix.decompose(H.position,H.quaternion,H.scale),H.updateMatrixWorld(!0),H.projectionMatrix.copy($.projectionMatrix),H.projectionMatrixInverse.copy($.projectionMatrixInverse),H.isPerspectiveCamera&&(H.fov=Dr*2*Math.atan(1/H.projectionMatrix.elements[5]),H.zoom=1)}this.getCamera=function(){return C},this.getFoveation=function(){if(!(p===null&&f===null))return l},this.setFoveation=function(H){l=H,p!==null&&(p.fixedFoveation=H),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=H)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(C)},this.getCameraTexture=function(H){return h[H]};let qe=null;function Ze(H,$){if(u=$.getViewerPose(c||o),g=$,u!==null){const de=u.views;f!==null&&(e.setRenderTargetFramebuffer(y,f.framebuffer),e.setRenderTarget(y));let Ae=!1;de.length!==C.cameras.length&&(C.cameras.length=0,Ae=!0);for(let A=0;A<de.length;A++){const ut=de[A];let Be=null;if(f!==null)Be=f.getViewport(ut);else{const Me=d.getViewSubImage(p,ut);Be=Me.viewport,A===0&&(e.setRenderTargetTextures(y,Me.colorTexture,Me.depthStencilTexture),e.setRenderTarget(y))}let Le=R[A];Le===void 0&&(Le=new rn,Le.layers.enable(A),Le.viewport=new nt,R[A]=Le),Le.matrix.fromArray(ut.transform.matrix),Le.matrix.decompose(Le.position,Le.quaternion,Le.scale),Le.projectionMatrix.fromArray(ut.projectionMatrix),Le.projectionMatrixInverse.copy(Le.projectionMatrix).invert(),Le.viewport.set(Be.x,Be.y,Be.width,Be.height),A===0&&(C.matrix.copy(Le.matrix),C.matrix.decompose(C.position,C.quaternion,C.scale)),Ae===!0&&C.cameras.push(Le)}const xe=r.enabledFeatures;if(xe&&xe.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&_){d=n.getBinding();const A=d.getDepthInformation(de[0]);A&&A.isValid&&A.texture&&m.init(A,r.renderState)}if(xe&&xe.includes("camera-access")&&_){e.state.unbindTexture(),d=n.getBinding();for(let A=0;A<de.length;A++){const ut=de[A].camera;if(ut){let Be=h[ut];Be||(Be=new Yc,h[ut]=Be);const Le=d.getCameraImage(ut);Be.sourceTexture=Le}}}}for(let de=0;de<P.length;de++){const Ae=w[de],xe=P[de];Ae!==null&&xe!==void 0&&xe.update(Ae,$,c||o)}qe&&qe(H,$),$.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:$}),g=null}const Q=new Kc;Q.setAnimationLoop(Ze),this.setAnimationLoop=function(H){qe=H},this.dispose=function(){}}}const di=new Cn,Xg=new rt;function qg(i,e){function t(m,h){m.matrixAutoUpdate===!0&&m.updateMatrix(),h.value.copy(m.matrix)}function n(m,h){h.color.getRGB(m.fogColor.value,kc(i)),h.isFog?(m.fogNear.value=h.near,m.fogFar.value=h.far):h.isFogExp2&&(m.fogDensity.value=h.density)}function r(m,h,T,b,y){h.isMeshBasicMaterial||h.isMeshLambertMaterial?s(m,h):h.isMeshToonMaterial?(s(m,h),d(m,h)):h.isMeshPhongMaterial?(s(m,h),u(m,h)):h.isMeshStandardMaterial?(s(m,h),p(m,h),h.isMeshPhysicalMaterial&&f(m,h,y)):h.isMeshMatcapMaterial?(s(m,h),g(m,h)):h.isMeshDepthMaterial?s(m,h):h.isMeshDistanceMaterial?(s(m,h),_(m,h)):h.isMeshNormalMaterial?s(m,h):h.isLineBasicMaterial?(o(m,h),h.isLineDashedMaterial&&a(m,h)):h.isPointsMaterial?l(m,h,T,b):h.isSpriteMaterial?c(m,h):h.isShadowMaterial?(m.color.value.copy(h.color),m.opacity.value=h.opacity):h.isShaderMaterial&&(h.uniformsNeedUpdate=!1)}function s(m,h){m.opacity.value=h.opacity,h.color&&m.diffuse.value.copy(h.color),h.emissive&&m.emissive.value.copy(h.emissive).multiplyScalar(h.emissiveIntensity),h.map&&(m.map.value=h.map,t(h.map,m.mapTransform)),h.alphaMap&&(m.alphaMap.value=h.alphaMap,t(h.alphaMap,m.alphaMapTransform)),h.bumpMap&&(m.bumpMap.value=h.bumpMap,t(h.bumpMap,m.bumpMapTransform),m.bumpScale.value=h.bumpScale,h.side===Wt&&(m.bumpScale.value*=-1)),h.normalMap&&(m.normalMap.value=h.normalMap,t(h.normalMap,m.normalMapTransform),m.normalScale.value.copy(h.normalScale),h.side===Wt&&m.normalScale.value.negate()),h.displacementMap&&(m.displacementMap.value=h.displacementMap,t(h.displacementMap,m.displacementMapTransform),m.displacementScale.value=h.displacementScale,m.displacementBias.value=h.displacementBias),h.emissiveMap&&(m.emissiveMap.value=h.emissiveMap,t(h.emissiveMap,m.emissiveMapTransform)),h.specularMap&&(m.specularMap.value=h.specularMap,t(h.specularMap,m.specularMapTransform)),h.alphaTest>0&&(m.alphaTest.value=h.alphaTest);const T=e.get(h),b=T.envMap,y=T.envMapRotation;b&&(m.envMap.value=b,di.copy(y),di.x*=-1,di.y*=-1,di.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(di.y*=-1,di.z*=-1),m.envMapRotation.value.setFromMatrix4(Xg.makeRotationFromEuler(di)),m.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=h.reflectivity,m.ior.value=h.ior,m.refractionRatio.value=h.refractionRatio),h.lightMap&&(m.lightMap.value=h.lightMap,m.lightMapIntensity.value=h.lightMapIntensity,t(h.lightMap,m.lightMapTransform)),h.aoMap&&(m.aoMap.value=h.aoMap,m.aoMapIntensity.value=h.aoMapIntensity,t(h.aoMap,m.aoMapTransform))}function o(m,h){m.diffuse.value.copy(h.color),m.opacity.value=h.opacity,h.map&&(m.map.value=h.map,t(h.map,m.mapTransform))}function a(m,h){m.dashSize.value=h.dashSize,m.totalSize.value=h.dashSize+h.gapSize,m.scale.value=h.scale}function l(m,h,T,b){m.diffuse.value.copy(h.color),m.opacity.value=h.opacity,m.size.value=h.size*T,m.scale.value=b*.5,h.map&&(m.map.value=h.map,t(h.map,m.uvTransform)),h.alphaMap&&(m.alphaMap.value=h.alphaMap,t(h.alphaMap,m.alphaMapTransform)),h.alphaTest>0&&(m.alphaTest.value=h.alphaTest)}function c(m,h){m.diffuse.value.copy(h.color),m.opacity.value=h.opacity,m.rotation.value=h.rotation,h.map&&(m.map.value=h.map,t(h.map,m.mapTransform)),h.alphaMap&&(m.alphaMap.value=h.alphaMap,t(h.alphaMap,m.alphaMapTransform)),h.alphaTest>0&&(m.alphaTest.value=h.alphaTest)}function u(m,h){m.specular.value.copy(h.specular),m.shininess.value=Math.max(h.shininess,1e-4)}function d(m,h){h.gradientMap&&(m.gradientMap.value=h.gradientMap)}function p(m,h){m.metalness.value=h.metalness,h.metalnessMap&&(m.metalnessMap.value=h.metalnessMap,t(h.metalnessMap,m.metalnessMapTransform)),m.roughness.value=h.roughness,h.roughnessMap&&(m.roughnessMap.value=h.roughnessMap,t(h.roughnessMap,m.roughnessMapTransform)),h.envMap&&(m.envMapIntensity.value=h.envMapIntensity)}function f(m,h,T){m.ior.value=h.ior,h.sheen>0&&(m.sheenColor.value.copy(h.sheenColor).multiplyScalar(h.sheen),m.sheenRoughness.value=h.sheenRoughness,h.sheenColorMap&&(m.sheenColorMap.value=h.sheenColorMap,t(h.sheenColorMap,m.sheenColorMapTransform)),h.sheenRoughnessMap&&(m.sheenRoughnessMap.value=h.sheenRoughnessMap,t(h.sheenRoughnessMap,m.sheenRoughnessMapTransform))),h.clearcoat>0&&(m.clearcoat.value=h.clearcoat,m.clearcoatRoughness.value=h.clearcoatRoughness,h.clearcoatMap&&(m.clearcoatMap.value=h.clearcoatMap,t(h.clearcoatMap,m.clearcoatMapTransform)),h.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=h.clearcoatRoughnessMap,t(h.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),h.clearcoatNormalMap&&(m.clearcoatNormalMap.value=h.clearcoatNormalMap,t(h.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(h.clearcoatNormalScale),h.side===Wt&&m.clearcoatNormalScale.value.negate())),h.dispersion>0&&(m.dispersion.value=h.dispersion),h.iridescence>0&&(m.iridescence.value=h.iridescence,m.iridescenceIOR.value=h.iridescenceIOR,m.iridescenceThicknessMinimum.value=h.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=h.iridescenceThicknessRange[1],h.iridescenceMap&&(m.iridescenceMap.value=h.iridescenceMap,t(h.iridescenceMap,m.iridescenceMapTransform)),h.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=h.iridescenceThicknessMap,t(h.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),h.transmission>0&&(m.transmission.value=h.transmission,m.transmissionSamplerMap.value=T.texture,m.transmissionSamplerSize.value.set(T.width,T.height),h.transmissionMap&&(m.transmissionMap.value=h.transmissionMap,t(h.transmissionMap,m.transmissionMapTransform)),m.thickness.value=h.thickness,h.thicknessMap&&(m.thicknessMap.value=h.thicknessMap,t(h.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=h.attenuationDistance,m.attenuationColor.value.copy(h.attenuationColor)),h.anisotropy>0&&(m.anisotropyVector.value.set(h.anisotropy*Math.cos(h.anisotropyRotation),h.anisotropy*Math.sin(h.anisotropyRotation)),h.anisotropyMap&&(m.anisotropyMap.value=h.anisotropyMap,t(h.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=h.specularIntensity,m.specularColor.value.copy(h.specularColor),h.specularColorMap&&(m.specularColorMap.value=h.specularColorMap,t(h.specularColorMap,m.specularColorMapTransform)),h.specularIntensityMap&&(m.specularIntensityMap.value=h.specularIntensityMap,t(h.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,h){h.matcap&&(m.matcap.value=h.matcap)}function _(m,h){const T=e.get(h).light;m.referencePosition.value.setFromMatrixPosition(T.matrixWorld),m.nearDistance.value=T.shadow.camera.near,m.farDistance.value=T.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function Yg(i,e,t,n){let r={},s={},o=[];const a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(T,b){const y=b.program;n.uniformBlockBinding(T,y)}function c(T,b){let y=r[T.id];y===void 0&&(g(T),y=u(T),r[T.id]=y,T.addEventListener("dispose",m));const P=b.program;n.updateUBOMapping(T,P);const w=e.render.frame;s[T.id]!==w&&(p(T),s[T.id]=w)}function u(T){const b=d();T.__bindingPointIndex=b;const y=i.createBuffer(),P=T.__size,w=T.usage;return i.bindBuffer(i.UNIFORM_BUFFER,y),i.bufferData(i.UNIFORM_BUFFER,P,w),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,b,y),y}function d(){for(let T=0;T<a;T++)if(o.indexOf(T)===-1)return o.push(T),T;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function p(T){const b=r[T.id],y=T.uniforms,P=T.__cache;i.bindBuffer(i.UNIFORM_BUFFER,b);for(let w=0,D=y.length;w<D;w++){const L=Array.isArray(y[w])?y[w]:[y[w]];for(let M=0,S=L.length;M<S;M++){const R=L[M];if(f(R,w,M,P)===!0){const C=R.__offset,B=Array.isArray(R.value)?R.value:[R.value];let N=0;for(let z=0;z<B.length;z++){const F=B[z],q=_(F);typeof F=="number"||typeof F=="boolean"?(R.__data[0]=F,i.bufferSubData(i.UNIFORM_BUFFER,C+N,R.__data)):F.isMatrix3?(R.__data[0]=F.elements[0],R.__data[1]=F.elements[1],R.__data[2]=F.elements[2],R.__data[3]=0,R.__data[4]=F.elements[3],R.__data[5]=F.elements[4],R.__data[6]=F.elements[5],R.__data[7]=0,R.__data[8]=F.elements[6],R.__data[9]=F.elements[7],R.__data[10]=F.elements[8],R.__data[11]=0):(F.toArray(R.__data,N),N+=q.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,C,R.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(T,b,y,P){const w=T.value,D=b+"_"+y;if(P[D]===void 0)return typeof w=="number"||typeof w=="boolean"?P[D]=w:P[D]=w.clone(),!0;{const L=P[D];if(typeof w=="number"||typeof w=="boolean"){if(L!==w)return P[D]=w,!0}else if(L.equals(w)===!1)return L.copy(w),!0}return!1}function g(T){const b=T.uniforms;let y=0;const P=16;for(let D=0,L=b.length;D<L;D++){const M=Array.isArray(b[D])?b[D]:[b[D]];for(let S=0,R=M.length;S<R;S++){const C=M[S],B=Array.isArray(C.value)?C.value:[C.value];for(let N=0,z=B.length;N<z;N++){const F=B[N],q=_(F),V=y%P,j=V%q.boundary,ee=V+j;y+=j,ee!==0&&P-ee<q.storage&&(y+=P-ee),C.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),C.__offset=y,y+=q.storage}}}const w=y%P;return w>0&&(y+=P-w),T.__size=y,T.__cache={},this}function _(T){const b={boundary:0,storage:0};return typeof T=="number"||typeof T=="boolean"?(b.boundary=4,b.storage=4):T.isVector2?(b.boundary=8,b.storage=8):T.isVector3||T.isColor?(b.boundary=16,b.storage=12):T.isVector4?(b.boundary=16,b.storage=16):T.isMatrix3?(b.boundary=48,b.storage=48):T.isMatrix4?(b.boundary=64,b.storage=64):T.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",T),b}function m(T){const b=T.target;b.removeEventListener("dispose",m);const y=o.indexOf(b.__bindingPointIndex);o.splice(y,1),i.deleteBuffer(r[b.id]),delete r[b.id],delete s[b.id]}function h(){for(const T in r)i.deleteBuffer(r[T]);o=[],r={},s={}}return{bind:l,update:c,dispose:h}}class $g{constructor(e={}){const{canvas:t=Sd(),context:n=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:p=!1}=e;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=o;const g=new Uint32Array(4),_=new Int32Array(4);let m=null,h=null;const T=[],b=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=ni,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const y=this;let P=!1;this._outputColorSpace=tn;let w=0,D=0,L=null,M=-1,S=null;const R=new nt,C=new nt;let B=null;const N=new Ne(0);let z=0,F=t.width,q=t.height,V=1,j=null,ee=null;const ue=new nt(0,0,F,q),Ce=new nt(0,0,F,q);let qe=!1;const Ze=new Ho;let Q=!1,H=!1;const $=new rt,de=new U,Ae=new nt,xe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Oe=!1;function xt(){return L===null?V:1}let A=n;function ut(x,O){return t.getContext(x,O)}try{const x={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ao}`),t.addEventListener("webglcontextlost",oe,!1),t.addEventListener("webglcontextrestored",me,!1),t.addEventListener("webglcontextcreationerror",te,!1),A===null){const O="webgl2";if(A=ut(O,x),A===null)throw ut(O)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(x){throw console.error("THREE.WebGLRenderer: "+x.message),x}let Be,Le,Me,dt,Se,He,Ct,vt,E,v,G,K,J,Y,be,se,ye,Ee,ie,fe,Ie,Te,ce,ze;function I(){Be=new rm(A),Be.init(),Te=new kg(A,Be),Le=new jp(A,Be,e,Te),Me=new Bg(A,Be),Le.reversedDepthBuffer&&p&&Me.buffers.depth.setReversed(!0),dt=new om(A),Se=new bg,He=new zg(A,Be,Me,Se,Le,Te,dt),Ct=new Qp(y),vt=new im(y),E=new hh(A),ce=new Kp(A,E),v=new sm(A,E,dt,ce),G=new cm(A,v,E,dt),ie=new lm(A,Le,He),se=new Jp(Se),K=new Tg(y,Ct,vt,Be,Le,ce,se),J=new qg(y,Se),Y=new Ag,be=new Lg(Be),Ee=new $p(y,Ct,vt,Me,G,f,l),ye=new Fg(y,G,Le),ze=new Yg(A,dt,Le,Me),fe=new Zp(A,Be,dt),Ie=new am(A,Be,dt),dt.programs=K.programs,y.capabilities=Le,y.extensions=Be,y.properties=Se,y.renderLists=Y,y.shadowMap=ye,y.state=Me,y.info=dt}I();const re=new Wg(y,A);this.xr=re,this.getContext=function(){return A},this.getContextAttributes=function(){return A.getContextAttributes()},this.forceContextLoss=function(){const x=Be.get("WEBGL_lose_context");x&&x.loseContext()},this.forceContextRestore=function(){const x=Be.get("WEBGL_lose_context");x&&x.restoreContext()},this.getPixelRatio=function(){return V},this.setPixelRatio=function(x){x!==void 0&&(V=x,this.setSize(F,q,!1))},this.getSize=function(x){return x.set(F,q)},this.setSize=function(x,O,W=!0){if(re.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}F=x,q=O,t.width=Math.floor(x*V),t.height=Math.floor(O*V),W===!0&&(t.style.width=x+"px",t.style.height=O+"px"),this.setViewport(0,0,x,O)},this.getDrawingBufferSize=function(x){return x.set(F*V,q*V).floor()},this.setDrawingBufferSize=function(x,O,W){F=x,q=O,V=W,t.width=Math.floor(x*W),t.height=Math.floor(O*W),this.setViewport(0,0,x,O)},this.getCurrentViewport=function(x){return x.copy(R)},this.getViewport=function(x){return x.copy(ue)},this.setViewport=function(x,O,W,X){x.isVector4?ue.set(x.x,x.y,x.z,x.w):ue.set(x,O,W,X),Me.viewport(R.copy(ue).multiplyScalar(V).round())},this.getScissor=function(x){return x.copy(Ce)},this.setScissor=function(x,O,W,X){x.isVector4?Ce.set(x.x,x.y,x.z,x.w):Ce.set(x,O,W,X),Me.scissor(C.copy(Ce).multiplyScalar(V).round())},this.getScissorTest=function(){return qe},this.setScissorTest=function(x){Me.setScissorTest(qe=x)},this.setOpaqueSort=function(x){j=x},this.setTransparentSort=function(x){ee=x},this.getClearColor=function(x){return x.copy(Ee.getClearColor())},this.setClearColor=function(){Ee.setClearColor(...arguments)},this.getClearAlpha=function(){return Ee.getClearAlpha()},this.setClearAlpha=function(){Ee.setClearAlpha(...arguments)},this.clear=function(x=!0,O=!0,W=!0){let X=0;if(x){let k=!1;if(L!==null){const ne=L.texture.format;k=ne===Uo||ne===Lo||ne===Io}if(k){const ne=L.texture.type,he=ne===Rn||ne===Si||ne===Ar||ne===Rr||ne===Co||ne===Po,_e=Ee.getClearColor(),pe=Ee.getClearAlpha(),De=_e.r,Ue=_e.g,Re=_e.b;he?(g[0]=De,g[1]=Ue,g[2]=Re,g[3]=pe,A.clearBufferuiv(A.COLOR,0,g)):(_[0]=De,_[1]=Ue,_[2]=Re,_[3]=pe,A.clearBufferiv(A.COLOR,0,_))}else X|=A.COLOR_BUFFER_BIT}O&&(X|=A.DEPTH_BUFFER_BIT),W&&(X|=A.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),A.clear(X)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",oe,!1),t.removeEventListener("webglcontextrestored",me,!1),t.removeEventListener("webglcontextcreationerror",te,!1),Ee.dispose(),Y.dispose(),be.dispose(),Se.dispose(),Ct.dispose(),vt.dispose(),G.dispose(),ce.dispose(),ze.dispose(),K.dispose(),re.dispose(),re.removeEventListener("sessionstart",Mn),re.removeEventListener("sessionend",jo),ri.stop()};function oe(x){x.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),P=!0}function me(){console.log("THREE.WebGLRenderer: Context Restored."),P=!1;const x=dt.autoReset,O=ye.enabled,W=ye.autoUpdate,X=ye.needsUpdate,k=ye.type;I(),dt.autoReset=x,ye.enabled=O,ye.autoUpdate=W,ye.needsUpdate=X,ye.type=k}function te(x){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",x.statusMessage)}function Z(x){const O=x.target;O.removeEventListener("dispose",Z),ve(O)}function ve(x){Fe(x),Se.remove(x)}function Fe(x){const O=Se.get(x).programs;O!==void 0&&(O.forEach(function(W){K.releaseProgram(W)}),x.isShaderMaterial&&K.releaseShaderCache(x))}this.renderBufferDirect=function(x,O,W,X,k,ne){O===null&&(O=xe);const he=k.isMesh&&k.matrixWorld.determinant()<0,_e=fu(x,O,W,X,k);Me.setMaterial(X,he);let pe=W.index,De=1;if(X.wireframe===!0){if(pe=v.getWireframeAttribute(W),pe===void 0)return;De=2}const Ue=W.drawRange,Re=W.attributes.position;let We=Ue.start*De,et=(Ue.start+Ue.count)*De;ne!==null&&(We=Math.max(We,ne.start*De),et=Math.min(et,(ne.start+ne.count)*De)),pe!==null?(We=Math.max(We,0),et=Math.min(et,pe.count)):Re!=null&&(We=Math.max(We,0),et=Math.min(et,Re.count));const mt=et-We;if(mt<0||mt===1/0)return;ce.setup(k,X,_e,W,pe);let lt,st=fe;if(pe!==null&&(lt=E.get(pe),st=Ie,st.setIndex(lt)),k.isMesh)X.wireframe===!0?(Me.setLineWidth(X.wireframeLinewidth*xt()),st.setMode(A.LINES)):st.setMode(A.TRIANGLES);else if(k.isLine){let Pe=X.linewidth;Pe===void 0&&(Pe=1),Me.setLineWidth(Pe*xt()),k.isLineSegments?st.setMode(A.LINES):k.isLineLoop?st.setMode(A.LINE_LOOP):st.setMode(A.LINE_STRIP)}else k.isPoints?st.setMode(A.POINTS):k.isSprite&&st.setMode(A.TRIANGLES);if(k.isBatchedMesh)if(k._multiDrawInstances!==null)Ir("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),st.renderMultiDrawInstances(k._multiDrawStarts,k._multiDrawCounts,k._multiDrawCount,k._multiDrawInstances);else if(Be.get("WEBGL_multi_draw"))st.renderMultiDraw(k._multiDrawStarts,k._multiDrawCounts,k._multiDrawCount);else{const Pe=k._multiDrawStarts,ft=k._multiDrawCounts,$e=k._multiDrawCount,Xt=pe?E.get(pe).bytesPerElement:1,bi=Se.get(X).currentProgram.getUniforms();for(let qt=0;qt<$e;qt++)bi.setValue(A,"_gl_DrawID",qt),st.render(Pe[qt]/Xt,ft[qt])}else if(k.isInstancedMesh)st.renderInstances(We,mt,k.count);else if(W.isInstancedBufferGeometry){const Pe=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,ft=Math.min(W.instanceCount,Pe);st.renderInstances(We,mt,ft)}else st.render(We,mt)};function at(x,O,W){x.transparent===!0&&x.side===Kt&&x.forceSinglePass===!1?(x.side=Wt,x.needsUpdate=!0,Hr(x,O,W),x.side=ii,x.needsUpdate=!0,Hr(x,O,W),x.side=Kt):Hr(x,O,W)}this.compile=function(x,O,W=null){W===null&&(W=x),h=be.get(W),h.init(O),b.push(h),W.traverseVisible(function(k){k.isLight&&k.layers.test(O.layers)&&(h.pushLight(k),k.castShadow&&h.pushShadow(k))}),x!==W&&x.traverseVisible(function(k){k.isLight&&k.layers.test(O.layers)&&(h.pushLight(k),k.castShadow&&h.pushShadow(k))}),h.setupLights();const X=new Set;return x.traverse(function(k){if(!(k.isMesh||k.isPoints||k.isLine||k.isSprite))return;const ne=k.material;if(ne)if(Array.isArray(ne))for(let he=0;he<ne.length;he++){const _e=ne[he];at(_e,W,k),X.add(_e)}else at(ne,W,k),X.add(ne)}),h=b.pop(),X},this.compileAsync=function(x,O,W=null){const X=this.compile(x,O,W);return new Promise(k=>{function ne(){if(X.forEach(function(he){Se.get(he).currentProgram.isReady()&&X.delete(he)}),X.size===0){k(x);return}setTimeout(ne,10)}Be.get("KHR_parallel_shader_compile")!==null?ne():setTimeout(ne,10)})};let Je=null;function Dn(x){Je&&Je(x)}function Mn(){ri.stop()}function jo(){ri.start()}const ri=new Kc;ri.setAnimationLoop(Dn),typeof self<"u"&&ri.setContext(self),this.setAnimationLoop=function(x){Je=x,re.setAnimationLoop(x),x===null?ri.stop():ri.start()},re.addEventListener("sessionstart",Mn),re.addEventListener("sessionend",jo),this.render=function(x,O){if(O!==void 0&&O.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;if(x.matrixWorldAutoUpdate===!0&&x.updateMatrixWorld(),O.parent===null&&O.matrixWorldAutoUpdate===!0&&O.updateMatrixWorld(),re.enabled===!0&&re.isPresenting===!0&&(re.cameraAutoUpdate===!0&&re.updateCamera(O),O=re.getCamera()),x.isScene===!0&&x.onBeforeRender(y,x,O,L),h=be.get(x,b.length),h.init(O),b.push(h),$.multiplyMatrices(O.projectionMatrix,O.matrixWorldInverse),Ze.setFromProjectionMatrix($,wn,O.reversedDepth),H=this.localClippingEnabled,Q=se.init(this.clippingPlanes,H),m=Y.get(x,T.length),m.init(),T.push(m),re.enabled===!0&&re.isPresenting===!0){const ne=y.xr.getDepthSensingMesh();ne!==null&&Gs(ne,O,-1/0,y.sortObjects)}Gs(x,O,0,y.sortObjects),m.finish(),y.sortObjects===!0&&m.sort(j,ee),Oe=re.enabled===!1||re.isPresenting===!1||re.hasDepthSensing()===!1,Oe&&Ee.addToRenderList(m,x),this.info.render.frame++,Q===!0&&se.beginShadows();const W=h.state.shadowsArray;ye.render(W,x,O),Q===!0&&se.endShadows(),this.info.autoReset===!0&&this.info.reset();const X=m.opaque,k=m.transmissive;if(h.setupLights(),O.isArrayCamera){const ne=O.cameras;if(k.length>0)for(let he=0,_e=ne.length;he<_e;he++){const pe=ne[he];Qo(X,k,x,pe)}Oe&&Ee.render(x);for(let he=0,_e=ne.length;he<_e;he++){const pe=ne[he];Jo(m,x,pe,pe.viewport)}}else k.length>0&&Qo(X,k,x,O),Oe&&Ee.render(x),Jo(m,x,O);L!==null&&D===0&&(He.updateMultisampleRenderTarget(L),He.updateRenderTargetMipmap(L)),x.isScene===!0&&x.onAfterRender(y,x,O),ce.resetDefaultState(),M=-1,S=null,b.pop(),b.length>0?(h=b[b.length-1],Q===!0&&se.setGlobalState(y.clippingPlanes,h.state.camera)):h=null,T.pop(),T.length>0?m=T[T.length-1]:m=null};function Gs(x,O,W,X){if(x.visible===!1)return;if(x.layers.test(O.layers)){if(x.isGroup)W=x.renderOrder;else if(x.isLOD)x.autoUpdate===!0&&x.update(O);else if(x.isLight)h.pushLight(x),x.castShadow&&h.pushShadow(x);else if(x.isSprite){if(!x.frustumCulled||Ze.intersectsSprite(x)){X&&Ae.setFromMatrixPosition(x.matrixWorld).applyMatrix4($);const he=G.update(x),_e=x.material;_e.visible&&m.push(x,he,_e,W,Ae.z,null)}}else if((x.isMesh||x.isLine||x.isPoints)&&(!x.frustumCulled||Ze.intersectsObject(x))){const he=G.update(x),_e=x.material;if(X&&(x.boundingSphere!==void 0?(x.boundingSphere===null&&x.computeBoundingSphere(),Ae.copy(x.boundingSphere.center)):(he.boundingSphere===null&&he.computeBoundingSphere(),Ae.copy(he.boundingSphere.center)),Ae.applyMatrix4(x.matrixWorld).applyMatrix4($)),Array.isArray(_e)){const pe=he.groups;for(let De=0,Ue=pe.length;De<Ue;De++){const Re=pe[De],We=_e[Re.materialIndex];We&&We.visible&&m.push(x,he,We,W,Ae.z,Re)}}else _e.visible&&m.push(x,he,_e,W,Ae.z,null)}}const ne=x.children;for(let he=0,_e=ne.length;he<_e;he++)Gs(ne[he],O,W,X)}function Jo(x,O,W,X){const k=x.opaque,ne=x.transmissive,he=x.transparent;h.setupLightsView(W),Q===!0&&se.setGlobalState(y.clippingPlanes,W),X&&Me.viewport(R.copy(X)),k.length>0&&kr(k,O,W),ne.length>0&&kr(ne,O,W),he.length>0&&kr(he,O,W),Me.buffers.depth.setTest(!0),Me.buffers.depth.setMask(!0),Me.buffers.color.setMask(!0),Me.setPolygonOffset(!1)}function Qo(x,O,W,X){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;h.state.transmissionRenderTarget[X.id]===void 0&&(h.state.transmissionRenderTarget[X.id]=new _n(1,1,{generateMipmaps:!0,type:Be.has("EXT_color_buffer_half_float")||Be.has("EXT_color_buffer_float")?Hn:Rn,minFilter:xi,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ke.workingColorSpace}));const ne=h.state.transmissionRenderTarget[X.id],he=X.viewport||R;ne.setSize(he.z*y.transmissionResolutionScale,he.w*y.transmissionResolutionScale);const _e=y.getRenderTarget(),pe=y.getActiveCubeFace(),De=y.getActiveMipmapLevel();y.setRenderTarget(ne),y.getClearColor(N),z=y.getClearAlpha(),z<1&&y.setClearColor(16777215,.5),y.clear(),Oe&&Ee.render(W);const Ue=y.toneMapping;y.toneMapping=ni;const Re=X.viewport;if(X.viewport!==void 0&&(X.viewport=void 0),h.setupLightsView(X),Q===!0&&se.setGlobalState(y.clippingPlanes,X),kr(x,W,X),He.updateMultisampleRenderTarget(ne),He.updateRenderTargetMipmap(ne),Be.has("WEBGL_multisampled_render_to_texture")===!1){let We=!1;for(let et=0,mt=O.length;et<mt;et++){const lt=O[et],st=lt.object,Pe=lt.geometry,ft=lt.material,$e=lt.group;if(ft.side===Kt&&st.layers.test(X.layers)){const Xt=ft.side;ft.side=Wt,ft.needsUpdate=!0,el(st,W,X,Pe,ft,$e),ft.side=Xt,ft.needsUpdate=!0,We=!0}}We===!0&&(He.updateMultisampleRenderTarget(ne),He.updateRenderTargetMipmap(ne))}y.setRenderTarget(_e,pe,De),y.setClearColor(N,z),Re!==void 0&&(X.viewport=Re),y.toneMapping=Ue}function kr(x,O,W){const X=O.isScene===!0?O.overrideMaterial:null;for(let k=0,ne=x.length;k<ne;k++){const he=x[k],_e=he.object,pe=he.geometry,De=he.group;let Ue=he.material;Ue.allowOverride===!0&&X!==null&&(Ue=X),_e.layers.test(W.layers)&&el(_e,O,W,pe,Ue,De)}}function el(x,O,W,X,k,ne){x.onBeforeRender(y,O,W,X,k,ne),x.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,x.matrixWorld),x.normalMatrix.getNormalMatrix(x.modelViewMatrix),k.onBeforeRender(y,O,W,X,x,ne),k.transparent===!0&&k.side===Kt&&k.forceSinglePass===!1?(k.side=Wt,k.needsUpdate=!0,y.renderBufferDirect(W,O,X,k,x,ne),k.side=ii,k.needsUpdate=!0,y.renderBufferDirect(W,O,X,k,x,ne),k.side=Kt):y.renderBufferDirect(W,O,X,k,x,ne),x.onAfterRender(y,O,W,X,k,ne)}function Hr(x,O,W){O.isScene!==!0&&(O=xe);const X=Se.get(x),k=h.state.lights,ne=h.state.shadowsArray,he=k.state.version,_e=K.getParameters(x,k.state,ne,O,W),pe=K.getProgramCacheKey(_e);let De=X.programs;X.environment=x.isMeshStandardMaterial?O.environment:null,X.fog=O.fog,X.envMap=(x.isMeshStandardMaterial?vt:Ct).get(x.envMap||X.environment),X.envMapRotation=X.environment!==null&&x.envMap===null?O.environmentRotation:x.envMapRotation,De===void 0&&(x.addEventListener("dispose",Z),De=new Map,X.programs=De);let Ue=De.get(pe);if(Ue!==void 0){if(X.currentProgram===Ue&&X.lightsStateVersion===he)return nl(x,_e),Ue}else _e.uniforms=K.getUniforms(x),x.onBeforeCompile(_e,y),Ue=K.acquireProgram(_e,pe),De.set(pe,Ue),X.uniforms=_e.uniforms;const Re=X.uniforms;return(!x.isShaderMaterial&&!x.isRawShaderMaterial||x.clipping===!0)&&(Re.clippingPlanes=se.uniform),nl(x,_e),X.needsLights=mu(x),X.lightsStateVersion=he,X.needsLights&&(Re.ambientLightColor.value=k.state.ambient,Re.lightProbe.value=k.state.probe,Re.directionalLights.value=k.state.directional,Re.directionalLightShadows.value=k.state.directionalShadow,Re.spotLights.value=k.state.spot,Re.spotLightShadows.value=k.state.spotShadow,Re.rectAreaLights.value=k.state.rectArea,Re.ltc_1.value=k.state.rectAreaLTC1,Re.ltc_2.value=k.state.rectAreaLTC2,Re.pointLights.value=k.state.point,Re.pointLightShadows.value=k.state.pointShadow,Re.hemisphereLights.value=k.state.hemi,Re.directionalShadowMap.value=k.state.directionalShadowMap,Re.directionalShadowMatrix.value=k.state.directionalShadowMatrix,Re.spotShadowMap.value=k.state.spotShadowMap,Re.spotLightMatrix.value=k.state.spotLightMatrix,Re.spotLightMap.value=k.state.spotLightMap,Re.pointShadowMap.value=k.state.pointShadowMap,Re.pointShadowMatrix.value=k.state.pointShadowMatrix),X.currentProgram=Ue,X.uniformsList=null,Ue}function tl(x){if(x.uniformsList===null){const O=x.currentProgram.getUniforms();x.uniformsList=Es.seqWithValue(O.seq,x.uniforms)}return x.uniformsList}function nl(x,O){const W=Se.get(x);W.outputColorSpace=O.outputColorSpace,W.batching=O.batching,W.batchingColor=O.batchingColor,W.instancing=O.instancing,W.instancingColor=O.instancingColor,W.instancingMorph=O.instancingMorph,W.skinning=O.skinning,W.morphTargets=O.morphTargets,W.morphNormals=O.morphNormals,W.morphColors=O.morphColors,W.morphTargetsCount=O.morphTargetsCount,W.numClippingPlanes=O.numClippingPlanes,W.numIntersection=O.numClipIntersection,W.vertexAlphas=O.vertexAlphas,W.vertexTangents=O.vertexTangents,W.toneMapping=O.toneMapping}function fu(x,O,W,X,k){O.isScene!==!0&&(O=xe),He.resetTextureUnits();const ne=O.fog,he=X.isMeshStandardMaterial?O.environment:null,_e=L===null?y.outputColorSpace:L.isXRRenderTarget===!0?L.texture.colorSpace:tr,pe=(X.isMeshStandardMaterial?vt:Ct).get(X.envMap||he),De=X.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Ue=!!W.attributes.tangent&&(!!X.normalMap||X.anisotropy>0),Re=!!W.morphAttributes.position,We=!!W.morphAttributes.normal,et=!!W.morphAttributes.color;let mt=ni;X.toneMapped&&(L===null||L.isXRRenderTarget===!0)&&(mt=y.toneMapping);const lt=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,st=lt!==void 0?lt.length:0,Pe=Se.get(X),ft=h.state.lights;if(Q===!0&&(H===!0||x!==S)){const Ot=x===S&&X.id===M;se.setState(X,x,Ot)}let $e=!1;X.version===Pe.__version?(Pe.needsLights&&Pe.lightsStateVersion!==ft.state.version||Pe.outputColorSpace!==_e||k.isBatchedMesh&&Pe.batching===!1||!k.isBatchedMesh&&Pe.batching===!0||k.isBatchedMesh&&Pe.batchingColor===!0&&k.colorTexture===null||k.isBatchedMesh&&Pe.batchingColor===!1&&k.colorTexture!==null||k.isInstancedMesh&&Pe.instancing===!1||!k.isInstancedMesh&&Pe.instancing===!0||k.isSkinnedMesh&&Pe.skinning===!1||!k.isSkinnedMesh&&Pe.skinning===!0||k.isInstancedMesh&&Pe.instancingColor===!0&&k.instanceColor===null||k.isInstancedMesh&&Pe.instancingColor===!1&&k.instanceColor!==null||k.isInstancedMesh&&Pe.instancingMorph===!0&&k.morphTexture===null||k.isInstancedMesh&&Pe.instancingMorph===!1&&k.morphTexture!==null||Pe.envMap!==pe||X.fog===!0&&Pe.fog!==ne||Pe.numClippingPlanes!==void 0&&(Pe.numClippingPlanes!==se.numPlanes||Pe.numIntersection!==se.numIntersection)||Pe.vertexAlphas!==De||Pe.vertexTangents!==Ue||Pe.morphTargets!==Re||Pe.morphNormals!==We||Pe.morphColors!==et||Pe.toneMapping!==mt||Pe.morphTargetsCount!==st)&&($e=!0):($e=!0,Pe.__version=X.version);let Xt=Pe.currentProgram;$e===!0&&(Xt=Hr(X,O,k));let bi=!1,qt=!1,lr=!1;const pt=Xt.getUniforms(),Jt=Pe.uniforms;if(Me.useProgram(Xt.program)&&(bi=!0,qt=!0,lr=!0),X.id!==M&&(M=X.id,qt=!0),bi||S!==x){Me.buffers.depth.getReversed()&&x.reversedDepth!==!0&&(x._reversedDepth=!0,x.updateProjectionMatrix()),pt.setValue(A,"projectionMatrix",x.projectionMatrix),pt.setValue(A,"viewMatrix",x.matrixWorldInverse);const Vt=pt.map.cameraPosition;Vt!==void 0&&Vt.setValue(A,de.setFromMatrixPosition(x.matrixWorld)),Le.logarithmicDepthBuffer&&pt.setValue(A,"logDepthBufFC",2/(Math.log(x.far+1)/Math.LN2)),(X.isMeshPhongMaterial||X.isMeshToonMaterial||X.isMeshLambertMaterial||X.isMeshBasicMaterial||X.isMeshStandardMaterial||X.isShaderMaterial)&&pt.setValue(A,"isOrthographic",x.isOrthographicCamera===!0),S!==x&&(S=x,qt=!0,lr=!0)}if(k.isSkinnedMesh){pt.setOptional(A,k,"bindMatrix"),pt.setOptional(A,k,"bindMatrixInverse");const Ot=k.skeleton;Ot&&(Ot.boneTexture===null&&Ot.computeBoneTexture(),pt.setValue(A,"boneTexture",Ot.boneTexture,He))}k.isBatchedMesh&&(pt.setOptional(A,k,"batchingTexture"),pt.setValue(A,"batchingTexture",k._matricesTexture,He),pt.setOptional(A,k,"batchingIdTexture"),pt.setValue(A,"batchingIdTexture",k._indirectTexture,He),pt.setOptional(A,k,"batchingColorTexture"),k._colorsTexture!==null&&pt.setValue(A,"batchingColorTexture",k._colorsTexture,He));const Qt=W.morphAttributes;if((Qt.position!==void 0||Qt.normal!==void 0||Qt.color!==void 0)&&ie.update(k,W,Xt),(qt||Pe.receiveShadow!==k.receiveShadow)&&(Pe.receiveShadow=k.receiveShadow,pt.setValue(A,"receiveShadow",k.receiveShadow)),X.isMeshGouraudMaterial&&X.envMap!==null&&(Jt.envMap.value=pe,Jt.flipEnvMap.value=pe.isCubeTexture&&pe.isRenderTargetTexture===!1?-1:1),X.isMeshStandardMaterial&&X.envMap===null&&O.environment!==null&&(Jt.envMapIntensity.value=O.environmentIntensity),qt&&(pt.setValue(A,"toneMappingExposure",y.toneMappingExposure),Pe.needsLights&&pu(Jt,lr),ne&&X.fog===!0&&J.refreshFogUniforms(Jt,ne),J.refreshMaterialUniforms(Jt,X,V,q,h.state.transmissionRenderTarget[x.id]),Es.upload(A,tl(Pe),Jt,He)),X.isShaderMaterial&&X.uniformsNeedUpdate===!0&&(Es.upload(A,tl(Pe),Jt,He),X.uniformsNeedUpdate=!1),X.isSpriteMaterial&&pt.setValue(A,"center",k.center),pt.setValue(A,"modelViewMatrix",k.modelViewMatrix),pt.setValue(A,"normalMatrix",k.normalMatrix),pt.setValue(A,"modelMatrix",k.matrixWorld),X.isShaderMaterial||X.isRawShaderMaterial){const Ot=X.uniformsGroups;for(let Vt=0,Ws=Ot.length;Vt<Ws;Vt++){const si=Ot[Vt];ze.update(si,Xt),ze.bind(si,Xt)}}return Xt}function pu(x,O){x.ambientLightColor.needsUpdate=O,x.lightProbe.needsUpdate=O,x.directionalLights.needsUpdate=O,x.directionalLightShadows.needsUpdate=O,x.pointLights.needsUpdate=O,x.pointLightShadows.needsUpdate=O,x.spotLights.needsUpdate=O,x.spotLightShadows.needsUpdate=O,x.rectAreaLights.needsUpdate=O,x.hemisphereLights.needsUpdate=O}function mu(x){return x.isMeshLambertMaterial||x.isMeshToonMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isShadowMaterial||x.isShaderMaterial&&x.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return D},this.getRenderTarget=function(){return L},this.setRenderTargetTextures=function(x,O,W){const X=Se.get(x);X.__autoAllocateDepthBuffer=x.resolveDepthBuffer===!1,X.__autoAllocateDepthBuffer===!1&&(X.__useRenderToTexture=!1),Se.get(x.texture).__webglTexture=O,Se.get(x.depthTexture).__webglTexture=X.__autoAllocateDepthBuffer?void 0:W,X.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(x,O){const W=Se.get(x);W.__webglFramebuffer=O,W.__useDefaultFramebuffer=O===void 0};const gu=A.createFramebuffer();this.setRenderTarget=function(x,O=0,W=0){L=x,w=O,D=W;let X=!0,k=null,ne=!1,he=!1;if(x){const pe=Se.get(x);if(pe.__useDefaultFramebuffer!==void 0)Me.bindFramebuffer(A.FRAMEBUFFER,null),X=!1;else if(pe.__webglFramebuffer===void 0)He.setupRenderTarget(x);else if(pe.__hasExternalTextures)He.rebindTextures(x,Se.get(x.texture).__webglTexture,Se.get(x.depthTexture).__webglTexture);else if(x.depthBuffer){const Re=x.depthTexture;if(pe.__boundDepthTexture!==Re){if(Re!==null&&Se.has(Re)&&(x.width!==Re.image.width||x.height!==Re.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");He.setupDepthRenderbuffer(x)}}const De=x.texture;(De.isData3DTexture||De.isDataArrayTexture||De.isCompressedArrayTexture)&&(he=!0);const Ue=Se.get(x).__webglFramebuffer;x.isWebGLCubeRenderTarget?(Array.isArray(Ue[O])?k=Ue[O][W]:k=Ue[O],ne=!0):x.samples>0&&He.useMultisampledRTT(x)===!1?k=Se.get(x).__webglMultisampledFramebuffer:Array.isArray(Ue)?k=Ue[W]:k=Ue,R.copy(x.viewport),C.copy(x.scissor),B=x.scissorTest}else R.copy(ue).multiplyScalar(V).floor(),C.copy(Ce).multiplyScalar(V).floor(),B=qe;if(W!==0&&(k=gu),Me.bindFramebuffer(A.FRAMEBUFFER,k)&&X&&Me.drawBuffers(x,k),Me.viewport(R),Me.scissor(C),Me.setScissorTest(B),ne){const pe=Se.get(x.texture);A.framebufferTexture2D(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_CUBE_MAP_POSITIVE_X+O,pe.__webglTexture,W)}else if(he){const pe=O;for(let De=0;De<x.textures.length;De++){const Ue=Se.get(x.textures[De]);A.framebufferTextureLayer(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0+De,Ue.__webglTexture,W,pe)}}else if(x!==null&&W!==0){const pe=Se.get(x.texture);A.framebufferTexture2D(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,pe.__webglTexture,W)}M=-1},this.readRenderTargetPixels=function(x,O,W,X,k,ne,he,_e=0){if(!(x&&x.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let pe=Se.get(x).__webglFramebuffer;if(x.isWebGLCubeRenderTarget&&he!==void 0&&(pe=pe[he]),pe){Me.bindFramebuffer(A.FRAMEBUFFER,pe);try{const De=x.textures[_e],Ue=De.format,Re=De.type;if(!Le.textureFormatReadable(Ue)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Le.textureTypeReadable(Re)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}O>=0&&O<=x.width-X&&W>=0&&W<=x.height-k&&(x.textures.length>1&&A.readBuffer(A.COLOR_ATTACHMENT0+_e),A.readPixels(O,W,X,k,Te.convert(Ue),Te.convert(Re),ne))}finally{const De=L!==null?Se.get(L).__webglFramebuffer:null;Me.bindFramebuffer(A.FRAMEBUFFER,De)}}},this.readRenderTargetPixelsAsync=async function(x,O,W,X,k,ne,he,_e=0){if(!(x&&x.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let pe=Se.get(x).__webglFramebuffer;if(x.isWebGLCubeRenderTarget&&he!==void 0&&(pe=pe[he]),pe)if(O>=0&&O<=x.width-X&&W>=0&&W<=x.height-k){Me.bindFramebuffer(A.FRAMEBUFFER,pe);const De=x.textures[_e],Ue=De.format,Re=De.type;if(!Le.textureFormatReadable(Ue))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Le.textureTypeReadable(Re))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const We=A.createBuffer();A.bindBuffer(A.PIXEL_PACK_BUFFER,We),A.bufferData(A.PIXEL_PACK_BUFFER,ne.byteLength,A.STREAM_READ),x.textures.length>1&&A.readBuffer(A.COLOR_ATTACHMENT0+_e),A.readPixels(O,W,X,k,Te.convert(Ue),Te.convert(Re),0);const et=L!==null?Se.get(L).__webglFramebuffer:null;Me.bindFramebuffer(A.FRAMEBUFFER,et);const mt=A.fenceSync(A.SYNC_GPU_COMMANDS_COMPLETE,0);return A.flush(),await yd(A,mt,4),A.bindBuffer(A.PIXEL_PACK_BUFFER,We),A.getBufferSubData(A.PIXEL_PACK_BUFFER,0,ne),A.deleteBuffer(We),A.deleteSync(mt),ne}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(x,O=null,W=0){const X=Math.pow(2,-W),k=Math.floor(x.image.width*X),ne=Math.floor(x.image.height*X),he=O!==null?O.x:0,_e=O!==null?O.y:0;He.setTexture2D(x,0),A.copyTexSubImage2D(A.TEXTURE_2D,W,0,0,he,_e,k,ne),Me.unbindTexture()};const _u=A.createFramebuffer(),vu=A.createFramebuffer();this.copyTextureToTexture=function(x,O,W=null,X=null,k=0,ne=null){ne===null&&(k!==0?(Ir("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ne=k,k=0):ne=0);let he,_e,pe,De,Ue,Re,We,et,mt;const lt=x.isCompressedTexture?x.mipmaps[ne]:x.image;if(W!==null)he=W.max.x-W.min.x,_e=W.max.y-W.min.y,pe=W.isBox3?W.max.z-W.min.z:1,De=W.min.x,Ue=W.min.y,Re=W.isBox3?W.min.z:0;else{const Qt=Math.pow(2,-k);he=Math.floor(lt.width*Qt),_e=Math.floor(lt.height*Qt),x.isDataArrayTexture?pe=lt.depth:x.isData3DTexture?pe=Math.floor(lt.depth*Qt):pe=1,De=0,Ue=0,Re=0}X!==null?(We=X.x,et=X.y,mt=X.z):(We=0,et=0,mt=0);const st=Te.convert(O.format),Pe=Te.convert(O.type);let ft;O.isData3DTexture?(He.setTexture3D(O,0),ft=A.TEXTURE_3D):O.isDataArrayTexture||O.isCompressedArrayTexture?(He.setTexture2DArray(O,0),ft=A.TEXTURE_2D_ARRAY):(He.setTexture2D(O,0),ft=A.TEXTURE_2D),A.pixelStorei(A.UNPACK_FLIP_Y_WEBGL,O.flipY),A.pixelStorei(A.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),A.pixelStorei(A.UNPACK_ALIGNMENT,O.unpackAlignment);const $e=A.getParameter(A.UNPACK_ROW_LENGTH),Xt=A.getParameter(A.UNPACK_IMAGE_HEIGHT),bi=A.getParameter(A.UNPACK_SKIP_PIXELS),qt=A.getParameter(A.UNPACK_SKIP_ROWS),lr=A.getParameter(A.UNPACK_SKIP_IMAGES);A.pixelStorei(A.UNPACK_ROW_LENGTH,lt.width),A.pixelStorei(A.UNPACK_IMAGE_HEIGHT,lt.height),A.pixelStorei(A.UNPACK_SKIP_PIXELS,De),A.pixelStorei(A.UNPACK_SKIP_ROWS,Ue),A.pixelStorei(A.UNPACK_SKIP_IMAGES,Re);const pt=x.isDataArrayTexture||x.isData3DTexture,Jt=O.isDataArrayTexture||O.isData3DTexture;if(x.isDepthTexture){const Qt=Se.get(x),Ot=Se.get(O),Vt=Se.get(Qt.__renderTarget),Ws=Se.get(Ot.__renderTarget);Me.bindFramebuffer(A.READ_FRAMEBUFFER,Vt.__webglFramebuffer),Me.bindFramebuffer(A.DRAW_FRAMEBUFFER,Ws.__webglFramebuffer);for(let si=0;si<pe;si++)pt&&(A.framebufferTextureLayer(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,Se.get(x).__webglTexture,k,Re+si),A.framebufferTextureLayer(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,Se.get(O).__webglTexture,ne,mt+si)),A.blitFramebuffer(De,Ue,he,_e,We,et,he,_e,A.DEPTH_BUFFER_BIT,A.NEAREST);Me.bindFramebuffer(A.READ_FRAMEBUFFER,null),Me.bindFramebuffer(A.DRAW_FRAMEBUFFER,null)}else if(k!==0||x.isRenderTargetTexture||Se.has(x)){const Qt=Se.get(x),Ot=Se.get(O);Me.bindFramebuffer(A.READ_FRAMEBUFFER,_u),Me.bindFramebuffer(A.DRAW_FRAMEBUFFER,vu);for(let Vt=0;Vt<pe;Vt++)pt?A.framebufferTextureLayer(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,Qt.__webglTexture,k,Re+Vt):A.framebufferTexture2D(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,Qt.__webglTexture,k),Jt?A.framebufferTextureLayer(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,Ot.__webglTexture,ne,mt+Vt):A.framebufferTexture2D(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,Ot.__webglTexture,ne),k!==0?A.blitFramebuffer(De,Ue,he,_e,We,et,he,_e,A.COLOR_BUFFER_BIT,A.NEAREST):Jt?A.copyTexSubImage3D(ft,ne,We,et,mt+Vt,De,Ue,he,_e):A.copyTexSubImage2D(ft,ne,We,et,De,Ue,he,_e);Me.bindFramebuffer(A.READ_FRAMEBUFFER,null),Me.bindFramebuffer(A.DRAW_FRAMEBUFFER,null)}else Jt?x.isDataTexture||x.isData3DTexture?A.texSubImage3D(ft,ne,We,et,mt,he,_e,pe,st,Pe,lt.data):O.isCompressedArrayTexture?A.compressedTexSubImage3D(ft,ne,We,et,mt,he,_e,pe,st,lt.data):A.texSubImage3D(ft,ne,We,et,mt,he,_e,pe,st,Pe,lt):x.isDataTexture?A.texSubImage2D(A.TEXTURE_2D,ne,We,et,he,_e,st,Pe,lt.data):x.isCompressedTexture?A.compressedTexSubImage2D(A.TEXTURE_2D,ne,We,et,lt.width,lt.height,st,lt.data):A.texSubImage2D(A.TEXTURE_2D,ne,We,et,he,_e,st,Pe,lt);A.pixelStorei(A.UNPACK_ROW_LENGTH,$e),A.pixelStorei(A.UNPACK_IMAGE_HEIGHT,Xt),A.pixelStorei(A.UNPACK_SKIP_PIXELS,bi),A.pixelStorei(A.UNPACK_SKIP_ROWS,qt),A.pixelStorei(A.UNPACK_SKIP_IMAGES,lr),ne===0&&O.generateMipmaps&&A.generateMipmap(ft),Me.unbindTexture()},this.initRenderTarget=function(x){Se.get(x).__webglFramebuffer===void 0&&He.setupRenderTarget(x)},this.initTexture=function(x){x.isCubeTexture?He.setTextureCube(x,0):x.isData3DTexture?He.setTexture3D(x,0):x.isDataArrayTexture||x.isCompressedArrayTexture?He.setTexture2DArray(x,0):He.setTexture2D(x,0),Me.unbindTexture()},this.resetState=function(){w=0,D=0,L=null,Me.reset(),ce.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return wn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Ke._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ke._getUnpackColorSpace()}}const Ts={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class Br{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Kg=new Os(-1,1,1,-1,0,1);class Zg extends Ft{constructor(){super(),this.setAttribute("position",new ht([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ht([0,2,0,0,2,0],2))}}const jg=new Zg;class eu{constructor(e){this._mesh=new ae(jg,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Kg)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class Jg extends Br{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Gt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Ds.clone(e.uniforms),this.material=new Gt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new eu(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class cc extends Br{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){const r=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),s.buffers.stencil.setFunc(r.ALWAYS,o,4294967295),s.buffers.stencil.setClear(a),s.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(r.EQUAL,1,4294967295),s.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),s.buffers.stencil.setLocked(!0)}}class Qg extends Br{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class e0{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const n=e.getSize(new we);this._width=n.width,this._height=n.height,t=new _n(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Hn}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Jg(Ts),this.copyPass.material.blending=kn,this.clock=new ch}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let n=!1;for(let r=0,s=this.passes.length;r<s;r++){const o=this.passes[r];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),o.needsSwap){if(n){const a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}cc!==void 0&&(o instanceof cc?n=!0:o instanceof Qg&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new we);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class t0 extends Br{constructor(e,t,n=null,r=null,s=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Ne}render(e,t,n){const r=e.autoClear;e.autoClear=!1;let s,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=r}}const n0={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ne(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class ir extends Br{constructor(e,t=1,n,r){super(),this.strength=t,this.radius=n,this.threshold=r,this.resolution=e!==void 0?new we(e.x,e.y):new we(256,256),this.clearColor=new Ne(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new _n(s,o,{type:Hn}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let u=0;u<this.nMips;u++){const d=new _n(s,o,{type:Hn});d.texture.name="UnrealBloomPass.h"+u,d.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(d);const p=new _n(s,o,{type:Hn});p.texture.name="UnrealBloomPass.v"+u,p.texture.generateMipmaps=!1,this.renderTargetsVertical.push(p),s=Math.round(s/2),o=Math.round(o/2)}const a=n0;this.highPassUniforms=Ds.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Gt({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let u=0;u<this.nMips;u++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[u])),this.separableBlurMaterials[u].uniforms.invSize.value=new we(1/s,1/o),s=Math.round(s/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Ds.clone(Ts.uniforms),this.blendMaterial=new Gt({uniforms:this.copyUniforms,vertexShader:Ts.vertexShader,fragmentShader:Ts.fragmentShader,blending:Da,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Ne,this._oldClearAlpha=1,this._basic=new ar,this._fsQuad=new eu(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(n,r),this.renderTargetsVertical[s].setSize(n,r),this.separableBlurMaterials[s].uniforms.invSize.value=new we(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(e,t,n,r,s){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=ir.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=ir.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this._fsQuad.render(e),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=o}_getSeparableBlurMaterial(e){const t=[];for(let n=0;n<e;n++)t.push(.39894*Math.exp(-.5*n*n/(e*e))/e);return new Gt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new we(.5,.5)},direction:{value:new we(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
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
				}`})}_getCompositeMaterial(e){return new Gt({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
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
				}`})}}ir.BlurDirectionX=new we(1,0);ir.BlurDirectionY=new we(0,1);const je={HELLO:"hello",SET_NICKNAME:"set_nickname",JOIN_ROOM:"join_room",MOVEMENT:"movement",GARDEN_ACTION:"garden_action",MARKET_BUY:"market_buy",MARKET_SELL:"market_sell",ORDER_PLACE:"order_place",ORDER_CANCEL:"order_cancel",CONTRACT_COMPLETE:"contract_complete",NODE_HARVEST:"node_harvest",MACHINE_CONTRIBUTE:"machine_contribute",MACHINE_MILL:"machine_mill",MACHINE_CRAFT:"machine_craft",EMOTE:"emote",WELCOME:"welcome",PRESENCE_JOIN:"presence_join",PRESENCE_LEAVE:"presence_leave",PRESENCE_UPDATE:"presence_update",GARDEN_STATE:"garden_state",INVENTORY_STATE:"inventory_state",MARKET_UPDATE:"market_update",CONTRACT_UPDATE:"contract_update",NODE_STATE:"node_state",MACHINE_UPDATE:"machine_update",WEATHER_UPDATE:"weather_update",ACTION_RESULT:"action_result",TRADE_FILLED:"trade_filled",EMOTE_BROADCAST:"emote_broadcast"},vn={MARKET:"market",gardenFor:i=>`garden:${i}`,isGarden:i=>i?.startsWith("garden:"),gardenOwner:i=>i?.startsWith("garden:")?i.slice(7):null};function i0(i){return JSON.stringify(i)}function r0(i){try{return JSON.parse(i)}catch{return null}}const uc=["Mossy","Quiet","Copper","Rainy","Amber","Misty","Rust","Golden","Silver","Fern","Bramble","Cobble","Thistle","Breezy","Dusky","Dappled","Dewy","Hedge","Orchard","Verdant","Gilded","Pebble","Autumnal","Gleaming"],dc=["Radish","Turnip","Basil","Leek","Carrot","Kale","Tomato","Berry","Sorrel","Chive","Sprout","Fennel","Parsnip","Pepper","Clover","Borage","Sage","Mint","Beet","Chard"];function Ls(i=Math.random()){const e=Math.floor(Math.abs(Math.sin(i*999))*uc.length),t=Math.floor(Math.abs(Math.cos(i*888))*dc.length),n=Math.floor(Math.abs(Math.sin(i*777))*90)+10;return`${uc[e]}${dc[t]}${n}`}function hc(i){if(typeof i!="string")return Ls();let e=i.replace(/<[^>]*>/g,"").replace(/[\x00-\x1F\x7F-\x9F]/g,"").trim();return e=e.replace(/[^\w\s-]/g,"").replace(/\s+/g," "),e.length>20&&(e=e.slice(0,20).trim()),e.length<3?Ls():e}function s0(i=""){let e=0;for(let n=0;n<i.length;n++)e=e*31+i.charCodeAt(n)>>>0;const t=[{coat:"#7a4e32",apron:"#b8a682",hat:"#473d32",boots:"#2b231c"},{coat:"#3a5449",apron:"#c2bca3",hat:"#2d3f37",boots:"#202924"},{coat:"#3d4b60",apron:"#b5b29c",hat:"#2a3547",boots:"#1c222e"},{coat:"#634b6b",apron:"#bfb5a3",hat:"#44324a",boots:"#251c29"},{coat:"#806835",apron:"#ccc4a7",hat:"#544320",boots:"#2e2411"},{coat:"#445e38",apron:"#b8b498",hat:"#314427",boots:"#1f2b18"}];return t[e%t.length]}const a0={},fc="afterlight-gardener-guest-id",Ea="afterlight-gardener-nickname";class o0{constructor(e=null){this.wsUrl=e||this.getDefaultUrl(),this.guestId=this.getOrCreateGuestId(),this.nickname=this.getOrCreateNickname(),this.ws=null,this.connected=!1,this.handlers=new Map,this.connectListeners=[],this.disconnectListeners=[],this.reconnectAttempts=0,this.reconnectTimer=null,this.lastMovementSend=0,this.desiredRoom=null}getDefaultUrl(){const e=a0?.VITE_WS_URL;if(e)return e;const t=window.location,n=t.protocol==="https:"?"wss:":"ws:",r=t.port==="5173"||t.port==="4173"?"3001":t.port;return`${n}//${t.hostname}:${r}/ws`}getOrCreateGuestId(){try{let e=localStorage.getItem(fc);return(!e||typeof e!="string")&&(e="guest_"+Math.random().toString(36).substring(2,11)+"_"+Date.now().toString(36),localStorage.setItem(fc,e)),e}catch{return"guest_"+Math.random().toString(36).substring(2,11)}}getOrCreateNickname(){try{let e=localStorage.getItem(Ea);return e||(e=Ls(),localStorage.setItem(Ea,e)),hc(e)}catch{return Ls()}}setStoredNickname(e){this.nickname=hc(e);try{localStorage.setItem(Ea,this.nickname)}catch{}}connect(){if(!(this.ws&&(this.ws.readyState===WebSocket.OPEN||this.ws.readyState===WebSocket.CONNECTING))){try{this.ws=new WebSocket(this.wsUrl)}catch(e){console.warn("WebSocket init failed, scheduling reconnect:",e.message),this.scheduleReconnect();return}this.ws.onopen=()=>{this.connected=!0,this.reconnectAttempts=0,this.send(je.HELLO,{guestId:this.guestId,nickname:this.nickname}),this.desiredRoom&&this.send(je.JOIN_ROOM,{roomId:this.desiredRoom}),this.connectListeners.forEach(e=>e())},this.ws.onmessage=e=>{const t=r0(e.data);if(!t||!t.type)return;const n=this.handlers.get(t.type);n&&n.forEach(r=>r(t))},this.ws.onclose=()=>{this.connected=!1,this.disconnectListeners.forEach(e=>e()),this.scheduleReconnect()},this.ws.onerror=e=>{console.warn("NetworkClient socket error:",e)}}}scheduleReconnect(){if(this.reconnectTimer)return;const e=Math.min(1e4,1e3*Math.pow(1.5,this.reconnectAttempts));this.reconnectAttempts++,this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect()},e)}on(e,t){this.handlers.has(e)||this.handlers.set(e,[]),this.handlers.get(e).push(t)}onConnect(e){this.connectListeners.push(e)}onDisconnect(e){this.disconnectListeners.push(e)}send(e,t={}){this.ws&&this.ws.readyState===WebSocket.OPEN&&this.ws.send(i0({type:e,...t}))}sendMovement(e,t,n,r){const s=performance.now();s-this.lastMovementSend<80||(this.lastMovementSend=s,this.send(je.MOVEMENT,{x:e,z:t,rotY:n,walking:r}))}sendGardenAction(e,t,n=null){const r=`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;return this.send(je.GARDEN_ACTION,{actionId:r,action:e,bedIndex:t,seedCropId:n}),r}sendMarketBuy(e,t){this.send(je.MARKET_BUY,{cropId:e,quantity:t})}sendMarketSell(e,t,n){this.send(je.MARKET_SELL,{cropId:e,quality:t,quantity:n})}sendOrderPlace(e,t,n,r,s="B"){const o=`ord_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;return this.send(je.ORDER_PLACE,{orderId:o,side:e,cropId:t,price:n,quantity:r,quality:s}),o}sendOrderCancel(e){this.send(je.ORDER_CANCEL,{orderId:e})}sendContractComplete(e){this.send(je.CONTRACT_COMPLETE,{contractId:e})}sendEmote(e="wave"){this.send(je.EMOTE,{emote:e})}setNickname(e){this.setStoredNickname(e),this.send(je.SET_NICKNAME,{nickname:this.nickname})}joinRoom(e){this.desiredRoom=e,this.send(je.JOIN_ROOM,{roomId:e})}}const ot=new on(1,1,1),bs=new Ti(1,1,1,8),Ta=new Map;function nn(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return Ta.has(n)||Ta.set(n,new it({color:i,roughness:e,metalness:t})),Ta.get(n)}function pc(i){const e=document.createElement("canvas");e.width=256,e.height=64;const t=e.getContext("2d");t.fillStyle="rgba(23, 33, 32, 0.85)",t.beginPath(),t.roundRect(8,8,240,48,12),t.fill(),t.strokeStyle="#c6b47a",t.lineWidth=2.5,t.stroke(),t.fillStyle="#e8d8b5",t.font='bold 24px "Space Mono", monospace, sans-serif',t.textAlign="center",t.textBaseline="middle",t.fillText(i,128,32);const n=new th(e);n.minFilter=pn;const r=new Gc({map:n,transparent:!0,depthTest:!1}),s=new $d(r);return s.scale.set(2.2,.55,1),s.position.set(0,2.3,0),s}function tu(i,e="Gardener"){const t=new gt,n=s0(i),r=nn(n.coat,.7,.1),s=nn(n.apron,.8,.05),o=nn(n.hat,.75,.1),a=nn(n.boots,.65,.3),l=nn("#563a24",.6,.2),c=nn("#b78d50",.45,.6),u=new it({color:"#d8f8e3",emissive:"#acf7d5",emissiveIntensity:2.2}),d=new ae(ot,r);d.position.set(0,.9,0),d.scale.set(.64,.75,.48),d.castShadow=!0,t.add(d);const p=new ae(ot,s);p.position.set(0,.86,.25),p.scale.set(.48,.68,.05),t.add(p);for(const M of[-.16,.16]){const S=new ae(ot,l);S.position.set(M,1.15,.22),S.scale.set(.06,.25,.04),t.add(S)}const f=new ae(ot,l);f.position.set(.34,.75,.08),f.scale.set(.16,.28,.24),f.castShadow=!0,t.add(f);const g=new ae(ot,l);g.position.set(.08,.96,.15),g.rotation.z=-.65,g.scale.set(.68,.05,.04),t.add(g);const _=new ae(ot,r);_.position.set(0,1.45,0),_.scale.set(.72,.46,.54),_.castShadow=!0,t.add(_);const m=new ae(ot,nn("#1c2828",.5,.5));m.position.set(0,1.45,.28),m.scale.set(.58,.28,.05),t.add(m);for(const M of[-.17,.17]){const S=new ae(ot,u);S.position.set(M,1.46,.31),S.scale.set(.1,.08,.04),t.add(S)}const h=new ae(bs,o);h.position.set(0,1.7,0),h.scale.set(.65,.06,.65),t.add(h);const T=new ae(ot,o);T.position.set(0,1.84,0),T.scale.set(.5,.24,.44),t.add(T);const b=new ae(ot,l);b.position.set(0,1.75,0),b.scale.set(.52,.05,.46),t.add(b);for(const M of[-.38,.38]){const S=new ae(ot,r);S.position.set(M,.96,0),S.scale.set(.14,.5,.2),t.add(S);const R=new ae(ot,l);R.position.set(M,.66,0),R.scale.set(.13,.16,.18),t.add(R)}const y=new gt;y.position.set(.42,.65,.2);const P=new ae(bs,c);P.scale.set(.12,.25,.12),y.add(P);const w=new ae(bs,c);w.position.set(0,.12,.16),w.rotation.x=.6,w.scale.set(.03,.22,.03),y.add(w),y.visible=!1,t.add(y);const D=[];for(const M of[-.18,.18]){const S=new gt;S.position.set(M,.5,0);const R=new ae(ot,r);R.position.set(0,-.14,0),R.scale.set(.18,.32,.2),S.add(R);const C=new ae(ot,a);C.position.set(0,-.36,.06),C.scale.set(.2,.18,.34),C.castShadow=!0,S.add(C),t.add(S),D.push(S)}const L=pc(e);return t.add(L),t.userData={playerId:i,nickname:e,legs:D,canGroup:y,nameSprite:L,setWateringCan(M){y.visible=M},updateNickname(M){t.remove(L);const S=pc(M);t.add(S),t.userData.nameSprite=S,t.userData.nickname=M}},t}class l0{constructor(e){this.scene=e,this.players=new Map}setPlayer(e){if(!e||!e.id)return;let t=this.players.get(e.id);if(t)t.targetX=e.x,t.targetZ=e.z,t.targetRotY=e.rotY,t.walking=!!e.walking,e.nickname&&e.nickname!==t.avatar.userData.nickname&&t.avatar.userData.updateNickname(e.nickname);else{const n=tu(e.id,e.nickname||"Gardener");n.position.set(e.x??0,0,e.z??0),n.rotation.y=e.rotY??0,this.scene.add(n),t={avatar:n,targetX:e.x??0,targetZ:e.z??0,targetRotY:e.rotY??0,walking:!!e.walking},this.players.set(e.id,t)}}removePlayer(e){const t=this.players.get(e);t&&(this.scene.remove(t.avatar),this.players.delete(e))}clear(){for(const e of this.players.values())this.scene.remove(e.avatar);this.players.clear()}update(e,t){const n=Math.min(1,e*12);for(const r of this.players.values()){const{avatar:s,targetX:o,targetZ:a,targetRotY:l,walking:c}=r;s.position.x+=(o-s.position.x)*n,s.position.z+=(a-s.position.z)*n;let u=l-s.rotation.y;for(;u<-Math.PI;)u+=Math.PI*2;for(;u>Math.PI;)u-=Math.PI*2;s.rotation.y+=u*n,c?(s.position.y=Math.sin(t*12)*.025,s.userData.legs.forEach((d,p)=>{d.rotation.x=Math.sin(t*12+p*Math.PI)*.45})):(s.position.y=0,s.userData.legs.forEach(d=>{d.rotation.x*=.8}))}}}function c0(){const i=new gt,e=nn("#e6e0cc",.65,.2),t=nn("#233c3e",.6,.3),n=nn("#9c5838",.7,.2),r=nn("#b78d50",.5,.4),s=nn("#455759",.6,.3),o=new it({color:"#d8f8e3",emissive:"#acf7d5",emissiveIntensity:2}),a=new ae(ot,e);a.position.set(0,.85,0),a.scale.set(.62,.7,.48),i.add(a);const l=new ae(ot,t);l.position.set(0,.92,.265),l.scale.set(.38,.35,.07),i.add(l);for(let m=0;m<3;m++){const h=new ae(ot,n);h.position.set(0,.8+m*.095,.31),h.scale.set(.27,.035,.025),i.add(h)}const c=new ae(ot,e);c.position.set(0,1.4,0),c.scale.set(.78,.46,.58),i.add(c);const u=new ae(ot,t);u.position.set(0,1.4,.303),u.scale.set(.66,.3,.055),i.add(u);for(const m of[-.2,.2]){const h=new ae(ot,o);h.position.set(m,1.43,.34),h.scale.set(.12,.1,.045),i.add(h)}const d=new ae(ot,s);d.position.set(0,1.66,0),d.scale.set(.87,.08,.65),i.add(d);const p=new ae(bs,n);p.position.set(.23,1.85,0),p.scale.set(.025,.3,.025),i.add(p);const f=new ae(ot,r);f.position.set(.23,2.01,0),f.scale.set(.075,.075,.075),i.add(f);const g=new ae(ot,s);g.position.set(0,.93,-.34),g.scale.set(.48,.53,.25),i.add(g);const _=[];for(const m of[-.22,.22]){const h=new gt;h.position.set(m,.52,0);const T=new ae(ot,s);T.position.set(0,-.15,0),T.scale.set(.17,.33,.19),h.add(T);const b=new ae(ot,e);b.position.set(0,-.34,.09),b.scale.set(.24,.16,.38),h.add(b),i.add(h),_.push(h);const y=new ae(ot,e);y.position.set(m*1.9,.86,0),y.scale.set(.18,.53,.22),i.add(y)}return i.scale.setScalar(.68),i.userData.legs=_,i.castShadow=!0,i}const ba=new on(1,1,1),u0=new Ti(1,1,1,8),wa=new Map;function Ge(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return wa.has(n)||wa.set(n,new it({color:i,roughness:e,metalness:t})),wa.get(n)}function d0(){const i=new gt;i.name="market";const e=[],t=[],n=[];function r(Q,H,$,de,Ae,xe,Oe,xt=i){const A=new ae(ba,typeof Oe=="string"?Ge(Oe):Oe);return A.position.set(Q,H,$),A.scale.set(de,Ae,xe),A.castShadow=!0,A.receiveShadow=!0,xt.add(A),A}function s(Q,H,$,de){e.push({x:Q,z:H,w:$/2+.38,d:de/2+.38})}function o(Q,H,$,de,Ae,xe,Oe,xt=1.5){const A=r(Q,H,$,de,Ae,xe,Oe);return A.material=new it({color:Oe,emissive:Oe,emissiveIntensity:xt}),A}function a(Q,H,$,de="#ffc775"){r(Q,H,$,.3,.48,.3,new it({color:"#fff2c6",emissive:de,emissiveIntensity:2.5})),r(Q,H+.28,$,.46,.1,.44,Ge("#192d2d")),r(Q,H-.28,$,.36,.1,.35,Ge("#192d2d"));const Ae=new qo(de,6,7,2);return Ae.position.set(Q,H-.1,$+.2),i.add(Ae),Ae}r(0,-.6,0,28,1,25,Ge("#242f2b")),r(0,-.12,0,24,.4,21,Ge("#3d4944",.27,.32));const l=["#485450","#535e55","#647065","#70776a","#3a4845","#7b7e6d"];let c=42;function u(){return c=c*1664525+1013904223>>>0,c/4294967296}for(let Q=-12;Q<12;Q++)for(let H=-10;H<11;H++){const $=new Ne(l[Math.floor(u()*l.length)]).multiplyScalar(.75+u()*.25);r(Q+.49+H%2*.05,.06+u()*.03,H+.47,.96,.16,.96,Ge("#"+$.getHexString(),.3+u()*.3,.2))}for(let Q=0;Q<40;Q++){const H=new ae(new Vo(.4+u()*.9,9),Ge("#516564",.07,.62));H.rotation.x=-Math.PI/2,H.position.set((u()-.5)*22,.183,(u()-.5)*19),H.scale.y=.4+u()*.4,i.add(H)}for(let Q=-12;Q<=12;Q+=.8)for(let H=.4;H<3;H+=.4)r(Q,H,-10.5,.76,.37,.65,H>2.6?"#a0a18a":"#4d6561");for(let Q=-10;Q<11;Q+=.8)for(const H of[-12,12])Math.abs(Q)<2||(r(H,.65,Q,.5,1.3,.76,Ge("#192d2d")),r(H,1.35,Q,.7,.15,.78,Ge("#485450")));const d=0,p=-7.5;r(d,1.5,p,5.5,3,1.4,Ge("#3f3224")),s(d,p,5.5,1.4);for(const Q of[-2.5,2.5]){const H=new ae(u0,Ge("#2d241c"));H.position.set(d+Q,2.2,p+.9),H.scale.set(.08,3.4,.08),i.add(H)}const f=r(d,3.6,p+.4,6,.25,2.4,Ge("#7b4c34",.8));f.rotation.x=.18,r(d,1.8,p+.72,4.4,1.8,.08,Ge("#1a2422",.9,.1)),a(d-1.8,2.8,p+.8),a(d+1.8,2.8,p+.8),t.push({type:"market_board",x:d,z:p+1.5,title:"Market Exchange Board",sub:"Press E to view spot prices, create orders, and trade"});const g=-6.5,_=-4.5;r(g,.9,_,3.6,1.8,2,Ge("#4a3b2b")),s(g,_,3.6,2),r(g,1.85,_,3.8,.1,2.2,Ge("#63523f"));for(let Q=-1;Q<=1;Q++)r(g+Q*.9,2.1,_,.6,.5,.6,Ge(["#b8aa83","#a29571","#c4b693"][Q+1]));a(g,2.8,_+.8,"#ffdf96"),t.push({type:"seed_vendor",x:g,z:_+1.6,title:"Town Seed Merchant",sub:"Press E to browse seeds, tubers, and planting starts"});const m=6.5,h=-4.5;r(m,1.4,h,3.4,2.8,1,Ge("#2d3c39")),s(m,h,3.4,1),r(m,1.6,h+.52,2.8,1.6,.06,Ge("#d0c5a0",.85,.05)),a(m,2.9,h+.6,"#ffd580"),t.push({type:"contracts_board",x:m,z:h+1.5,title:"Restaurant & Café Noticeboard",sub:"Press E to fulfill delivery contracts for coins and reputation"});for(const[Q,H,$]of[[-8,4,1.1],[-9.2,4.2,.9],[8.5,5,1],[9.5,5.4,.9],[-3,-3,.8],[3,-3,.8],[-8.5,-8,1.2],[8.5,-8,1.2]])r(Q,$*.5,H,$,$,$,Ge("#634932")),s(Q,H,$,$);const T=10.7,b=0;for(const Q of[-1.5,1.5])r(T,1.8,Q,.6,3.6,.6,Ge("#273d3d")),o(T,3.6,Q,.8,.3,.8,"#74d0bd",2);r(T,3.8,0,.8,.35,3.6,Ge("#273d3d")),t.push({type:"garden_gate",x:T,z:b,title:"Travel to Your Market Garden",sub:"Press E to walk the path to your personal plot"});const y=-10.7,P=0;for(const Q of[-1.5,1.5])r(y,1.8,Q,.6,3.6,.6,Ge("#273d3d")),o(y,3.6,Q,.8,.3,.8,"#e0c889",2);r(y,3.8,0,.8,.35,3.6,Ge("#273d3d")),t.push({type:"district_gate",targetDistrict:"canal",x:y,z:P,title:"The Outer Districts Gateway",sub:"Press E to venture into the ancient city biomes"});const w=new gt;w.name="dynamic",i.add(w);const D={restored:!1},L=3,M=7.6;r(L,1.6,M,2.6,3.2,2.6,Ge("#5a5f58",.75,.12),w),r(L,3.3,M,2.9,.28,2.9,Ge("#6d7268"),w),r(L,.35,M,3,.7,3,Ge("#454a44"),w),s(L,M,2.6,2.6),r(L,.75,M-1.32,.9,1.5,.12,Ge("#2c2620"),w);const S=o(L,1,M-1.36,.7,1,.05,"#e0a865",.4);w.add(S);const R=new gt;w.add(R);const C=r(L,3.8,M,2.2,.5,2.2,Ge("#4a3b2b"),R);C.rotation.z=.28;const B=r(L-1.9,.5,M-1.7,2.4,.16,.22,Ge("#6b5845"),R);B.rotation.z=.1;const N=r(L+1.75,.55,M-1.5,1,1,.35,Ge("#7d827a"),R);N.rotation.z=.35;const z=new gt;w.add(z),r(L,3.85,M,2.5,.55,2.5,Ge("#63513a"),z),r(L,4.25,M,1.4,.35,1.4,Ge("#54452f"),z);const F=new gt;F.position.set(L,3.6,M-1.42),z.add(F),r(L,3.6,M-1.35,.5,.5,.4,Ge("#8a744f"),F);for(let Q=0;Q<4;Q++){const H=r(0,0,0,2.3,.5,.08,Ge("#a08a5f",.7),F);H.position.set(Math.cos(Q*Math.PI/2)*1.35,Math.sin(Q*Math.PI/2)*1.35,-.18),H.rotation.z=Q*Math.PI/2}const q=o(L+1,1.9,M-1.36,.2,.3,.08,"#ffcb79",1.4);z.add(q);const V=o(L,1.05,M-1.38,.8,.5,.05,"#f0b060",.8);z.add(V),t.push({type:"mill",x:L,z:5.6,title:"The Great Mill (broken)",sub:"Press E to help restore it with materials"});const j=5.8,ee=7.4;r(j,.55,ee,1.5,.9,1.1,Ge("#4a3b2b"),w),r(j,1.05,ee,1.6,.12,1.2,Ge("#5f4d36"),w),s(j,ee,1.5,1.1),r(j-.35,1.25,ee,.5,.3,.5,Ge("#7d827a"),w),r(j+.4,1.22,ee-.15,.3,.24,.3,Ge("#c07840"),w),t.push({type:"machine_bench",x:j,z:6.2,title:"Machine Shop Workbench",sub:"Press E to contribute materials & craft garden tools"});function ue(Q){const H=Q?.mill?.status==="restored";D.restored=H,R.visible=!H,z.visible=H;const $=t.find(de=>de.type==="mill");$&&($.title=H?"The Great Mill":"The Great Mill (broken)",$.sub=H?"Press E to mill wheat into flour":"Press E to help restore it with materials")}ue(null);const Ce=i.children.filter(Q=>Q.isMesh&&Q.geometry===ba&&!Q.material.transparent&&Q.material.emissive?.getHex()===0),qe=new ko(ba,new it({color:16777215,roughness:.62,metalness:.2}),Ce.length);Ce.forEach((Q,H)=>{Q.updateMatrix(),qe.setMatrixAt(H,Q.matrix),qe.setColorAt(H,Q.material.color),i.remove(Q)}),qe.castShadow=!0,qe.receiveShadow=!0,i.add(qe);function Ze(Q){n.forEach(H=>H(Q)),D.restored&&(F.rotation.z=Q*.55)}return{group:i,obstacles:e,items:t,update:Ze,setMachineState:ue}}const an={radish:{id:"radish",name:"Red Radish",tagline:"Crisp peppery roots, fast to harvest.",seedCost:4,basePrice:8,growDuration:25,waterDemand:1,yield:2,repeatHarvest:!1,color:"#4d8050",produceColor:"#c93b4a",xp:12,unlockLevel:1},lettuce:{id:"lettuce",name:"Rain Crisp Lettuce",tagline:"Tender layered greens favored by market cafes.",seedCost:6,basePrice:12,growDuration:40,waterDemand:1.2,yield:2,repeatHarvest:!1,color:"#65a759",produceColor:"#83cf72",xp:18,unlockLevel:1},carrot:{id:"carrot",name:"Amber Carrot",tagline:"Deep sweet orange taproots grown in dark tilled soil.",seedCost:8,basePrice:17,growDuration:60,waterDemand:.9,yield:2,repeatHarvest:!1,color:"#498845",produceColor:"#e07a2a",xp:25,unlockLevel:1},kale:{id:"kale",name:"Winter Kale",tagline:"Hearty ruffled brassica that thrives in cold rain.",seedCost:12,basePrice:24,growDuration:80,waterDemand:.8,yield:3,repeatHarvest:!1,color:"#2d6148",produceColor:"#3d785a",xp:32,unlockLevel:2},basil:{id:"basil",name:"Copper Basil",tagline:"Aromatic dark purple-green leaves prized by the apothecary.",seedCost:15,basePrice:32,growDuration:100,waterDemand:1.3,yield:3,repeatHarvest:!1,color:"#425a40",produceColor:"#7b3e64",xp:40,unlockLevel:2},tomato:{id:"tomato",name:"Lantern Tomato",tagline:"Heavy climbing vine with glowing scarlet fruit. Continues bearing.",seedCost:22,basePrice:28,growDuration:120,waterDemand:1.1,yield:3,repeatHarvest:!0,regrowDuration:45,color:"#3f7842",produceColor:"#d6422f",xp:50,unlockLevel:3},strawberry:{id:"strawberry",name:"Dew Strawberry",tagline:"Low creeping runners with bright sweet red berries.",seedCost:28,basePrice:38,growDuration:140,waterDemand:1.4,yield:4,repeatHarvest:!0,regrowDuration:50,color:"#39784b",produceColor:"#e6324b",xp:65,unlockLevel:3},wheat:{id:"wheat",name:"Hearth Wheat",tagline:"Golden milling grain. The Great Mill grinds it into flour.",seedCost:4,basePrice:9,growDuration:30,waterDemand:1,yield:2,repeatHarvest:!1,color:"#8a8a3d",produceColor:"#d9b45a",xp:14,unlockLevel:1}},To=Object.values(an),Bn={EMPTY:0,PREPARED:1,SEED:2,SPROUT:3,JUVENILE:4,MATURE:5,HARVESTABLE:6},h0={C:.8,B:1,A:1.35,"A+":1.8},xr=new on(1,1,1),mc=new Go(1,6,6),ms=new Ti(1,1,1,6),Aa=new Map;function Mr(i,e=.65,t=.1,n=0,r=0){const s=`${i}_${e}_${t}_${n}_${r}`;return Aa.has(s)||Aa.set(s,new it({color:i,roughness:e,metalness:t,emissive:n,emissiveIntensity:r})),Aa.get(s)}function f0(i,e,t){for(;i.children.length>0;)i.remove(i.children[0]);if(!e||t<=Bn.PREPARED)return;const n=an[e]??an.radish,r=Mr(n.color,.6,.1),s=Mr(n.produceColor,.4,.15,n.produceColor,.25);if(t===Bn.SEED){for(const[o,a]of[[-.2,-.15],[.2,.15],[0,0]]){const l=new ae(xr,Mr("#829b65",.8));l.position.set(o,.08,a),l.scale.set(.06,.08,.06),l.castShadow=!0,i.add(l)}return}if(t===Bn.SPROUT){const o=new ae(ms,Mr("#55864e",.7));o.position.set(0,.15,0),o.scale.set(.025,.25,.025),i.add(o);for(let a=0;a<2;a++){const l=new ae(xr,r);l.position.set(a===0?-.07:.07,.24,0),l.scale.set(.12,.03,.08),l.rotation.z=(a===0?-1:1)*.4,i.add(l)}return}if(t===Bn.JUVENILE){for(let o=0;o<3;o++){const a=o*Math.PI*2/3,l=new ae(ms,r);l.position.set(Math.cos(a)*.08,.25,Math.sin(a)*.08),l.scale.set(.035,.45,.035),l.rotation.z=Math.cos(a)*.25,l.rotation.x=Math.sin(a)*.25,i.add(l);const c=new ae(xr,r);c.position.set(Math.cos(a)*.16,.45,Math.sin(a)*.16),c.scale.set(.22,.06,.16),c.rotation.y=a,i.add(c)}return}if(t===Bn.MATURE||t===Bn.HARVESTABLE){const o=t===Bn.HARVESTABLE,a=o?1:.85;if(e==="tomato"){const l=new ae(ms,Mr("#5b4834",.8));l.position.set(0,.5,0),l.scale.set(.04,1,.04),i.add(l)}for(let l=0;l<5;l++){const c=l*Math.PI*2/5,u=new ae(xr,r);u.position.set(Math.cos(c)*.2*a,.35+l%2*.15,Math.sin(c)*.2*a),u.scale.set(.3*a,.1,.22*a),u.rotation.set(Math.sin(c)*.3,c,Math.cos(c)*.3),u.castShadow=!0,i.add(u)}if(o)if(e==="radish"||e==="carrot")for(let l=0;l<3;l++){const c=(l-1)*.18,u=new ae(e==="carrot"?ms:mc,s);u.position.set(c,e==="carrot"?.2:.16,0),u.scale.set(.12,.22,.12),u.castShadow=!0,i.add(u)}else if(e==="tomato"||e==="strawberry")for(let l=0;l<4;l++){const c=l*Math.PI*2/4+.3,u=new ae(mc,s);u.position.set(Math.cos(c)*.25,.38+l%2*.15,Math.sin(c)*.25),u.scale.set(.13,.14,.13),u.castShadow=!0,i.add(u)}else for(let l=0;l<4;l++){const c=l*Math.PI*2/4,u=new ae(xr,s);u.position.set(Math.cos(c)*.15,.55,Math.sin(c)*.15),u.scale.set(.24,.08,.18),u.rotation.set(.2,c+.4,.2),u.castShadow=!0,i.add(u)}}}function p0(i,e=4){const t=[];if(!Number.isInteger(i)||i<0)return t;const n=i%e;return i-e>=0&&t.push(i-e),n>0&&t.push(i-1),t.push(i),n<e-1&&t.push(i+1),t.push(i+e),t}const $o={copper:{id:"copper",name:"Copper Scrap",tagline:"Pipe stubs and verdigris sheeting pried from the foundry floor.",color:"#c07840",glowColor:"#e8934a",district:"foundry"},timber:{id:"timber",name:"Trestle Timber",tagline:"Sound oak beams cut free of the overgrown viaduct.",color:"#7a5a38",glowColor:"#c9a05e",district:"trestle"},glass:{id:"glass",name:"Glass Shards",tagline:"Thick panes of uncracked glass swept from the frost-line benches.",color:"#9fc4d8",glowColor:"#cfeaf7",district:"frost-spire"}},gc=Object.values($o),gi={flour:{id:"flour",name:"Stone-Ground Flour",tagline:"Fine milled flour from the Great Mill. Bakers pay a premium.",basePrice:14}},m0=Object.values(gi),nu={copper:4,timber:4,glass:4},Xi={id:"sprinkler",name:"Garden Sprinkler",cost:{copper:2,glass:2}},g0=[{id:"foundry_copper_1",district:"foundry",material:"copper",position:[4,2.5],respawnMs:18e4},{id:"foundry_copper_2",district:"foundry",material:"copper",position:[8.5,1],respawnMs:18e4},{id:"foundry_copper_3",district:"foundry",material:"copper",position:[-3.5,2.5],respawnMs:18e4},{id:"trestle_timber_1",district:"trestle",material:"timber",position:[6.5,2],respawnMs:18e4},{id:"trestle_timber_2",district:"trestle",material:"timber",position:[2.5,-2],respawnMs:18e4},{id:"trestle_timber_3",district:"trestle",material:"timber",position:[-3.5,-2],respawnMs:18e4},{id:"glasshouse_glass_1",district:"frost-spire",material:"glass",position:[8.5,2.5],respawnMs:18e4},{id:"glasshouse_glass_2",district:"frost-spire",material:"glass",position:[-3,.5],respawnMs:18e4},{id:"glasshouse_glass_3",district:"frost-spire",material:"glass",position:[2.5,3.5],respawnMs:18e4}],hi=new on(1,1,1),_0=new Ti(1,1,1,8),Ra=new Map;function St(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return Ra.has(n)||Ra.set(n,new it({color:i,roughness:e,metalness:t})),Ra.get(n)}function v0(){const i=new gt;i.name="garden";const e=[],t=[],n=[];function r(N,z,F,q,V,j,ee,ue=i){const Ce=new ae(hi,typeof ee=="string"?St(ee):ee);return Ce.position.set(N,z,F),Ce.scale.set(q,V,j),Ce.castShadow=!0,Ce.receiveShadow=!0,ue.add(Ce),Ce}function s(N,z,F,q){e.push({x:N,z,w:F/2+.38,d:q/2+.38})}function o(N,z,F,q,V,j,ee,ue=1.5){const Ce=r(N,z,F,q,V,j,ee);return Ce.material=new it({color:ee,emissive:ee,emissiveIntensity:ue}),Ce}function a(N,z,F,q="#ffdf96"){r(N,z,F,.25,.4,.25,new it({color:"#fff2c6",emissive:q,emissiveIntensity:2.5})),r(N,z+.22,F,.38,.08,.38,St("#232a28"));const V=new qo(q,5,6,2);return V.position.set(N,z,F),i.add(V),V}r(0,-.6,0,28,1,26,St("#272b22")),r(0,-.12,0,25,.4,23,St("#383e2f",.85,.1));const l=St("#565b4c",.8,.1);r(0,.07,0,24,.12,2.5,l),r(0,.07,0,2.5,.12,20,l);for(let N=-12;N<=12;N+=.8)r(N,.6,-10.5,.76,1.2,.65,St("#414b38")),r(N,.6,10.5,.76,1.2,.65,St("#414b38"));for(let N=-10;N<=10;N+=.8)for(const z of[-12,12])Math.abs(N)<2||r(z,.6,N,.65,1.2,.76,St("#414b38"));const c=-10.7,u=0;for(const N of[-1.4,1.4])r(c,1.8,N,.5,3.4,.5,St("#2d3835")),o(c,3.4,N,.7,.25,.7,"#74d0bd",2);r(c,3.6,0,.7,.3,3.3,St("#2d3835")),t.push({type:"market_gate",x:c,z:u,title:"Return to Market Court",sub:"Press E to walk back to the town market square"});const d=[[-6,-7],[-2,-7],[2,-7],[6,-7],[-6,-4],[-2,-4],[2,-4],[6,-4],[-6,4],[-2,4],[2,4],[6,4]];for(let N=0;N<d.length;N++){const[z,F]=d[N],q=2.4,V=1.6;r(z,.25,F,q+.2,.35,V+.2,St("#4d3e2c",.8,.1));const j=new Ne("#382c1e"),ee=new ae(hi,new it({color:j.clone(),roughness:.85,metalness:.05}));ee.position.set(z,.35,F),ee.scale.set(q,.15,V),ee.castShadow=!0,ee.receiveShadow=!0,i.add(ee),s(z,F,q*.7,V*.7);const ue=new gt;ue.position.set(z,.42,F),i.add(ue),n.push({bedIndex:N,soilMesh:ee,plantGroup:ue,x:z,z:F,renderedCrop:null,renderedStage:-1}),t.push({type:"bed",bedIndex:N,x:z,z:F,title:`Garden Bed #${N+1}`,sub:"Empty. Select Hoe to prepare or Seed to plant."})}const p=-8.8,f=-8;r(p,1.8,f,3.2,3.2,2.6,St("#3f3323")),s(p,f,3.2,2.6);const g=r(p,3.5,f,3.6,.15,3,St("#52605f",.4,.5));g.rotation.z=-.15,a(p+1.2,2.6,f+1.4);const _=-8.5,m=-2.5;r(_,.45,m,1.4,.8,2,St("#443727")),s(_,m,1.4,2);const h=new ae(new Pn(1.1,1.7),new it({color:"#346d78",roughness:.1,metalness:.7,transparent:!0,opacity:.85}));h.rotation.x=-Math.PI/2,h.position.set(_,.82,m),i.add(h),t.push({type:"water_source",x:_+.8,z:m,title:"Rainwater Cistern",sub:"Clean water caught from the greenhouse gutters"});const T=9,b=-7.5;r(T,.6,b,2.4,1,2.2,St("#403425")),s(T,b,2.4,2.2),r(T,.9,b,2,.5,1.8,St("#261e14",.9));const y=9,P=5;r(y,.6,P,2.5,.9,3.2,St("#54432f")),s(y,P,2.5,3.2);const w=new ae(_0,St("#707b78",.3,.6));w.position.set(y,1.2,P-.6),w.scale.set(.45,.45,.45),i.add(w),a(y-.8,2.4,P);const D=[],L=new Or(.62,.72,24);for(let N=0;N<5;N++){const z=new ae(L,new ar({color:"#7fd0e8",side:Kt,transparent:!0,opacity:.55}));z.rotation.x=-Math.PI/2,z.position.y=.3,z.visible=!1,i.add(z),D.push(z)}function M(N){const z=Number.isInteger(N)&&N>=0?p0(N).filter(F=>n[F]):[];D.forEach((F,q)=>{const V=z[q];if(V===void 0){F.visible=!1;return}const j=n[V];F.position.set(j.x,.3,j.z),F.visible=!0})}function S(N){const z=new Map((N||[]).map(F=>[F.bedIndex,F]));for(const F of n){const q=z.get(F.bedIndex);if(q&&!F.fixtureGroup){const V=new gt;V.position.set(F.x,.42,F.z);const j=new ae(hi,St("#8a6844",.6,.3));j.scale.set(.1,.55,.1),j.position.y=.27,j.castShadow=!0,V.add(j);const ee=St("#b0784a",.5,.5);for(const[Ce,qe]of[[.24,0],[-.24,0],[0,.24],[0,-.24]]){const Ze=new ae(hi,ee);Ze.scale.set(.34,.07,.07),Ze.position.set(Ce*.9,.52,qe*.9),Ze.rotation.y=qe!==0?Math.PI/2:0,V.add(Ze)}const ue=new ae(hi,new it({color:"#aedff2",emissive:"#7fd0e8",emissiveIntensity:.9,transparent:!0,opacity:.85,roughness:.2,metalness:.1}));ue.scale.setScalar(.16),ue.position.y=.62,V.add(ue),F.fixtureGroup=V,F.fixtureGlobe=ue,i.add(V)}else!q&&F.fixtureGroup&&(i.remove(F.fixtureGroup),F.fixtureGroup=null,F.fixtureGlobe=null)}}const R=i.children.filter(N=>N.isMesh&&N.geometry===hi&&!N.material.transparent&&!N.material.emissive?.getHex()),C=new ko(hi,new it({color:16777215,roughness:.65,metalness:.15}),R.length);R.forEach((N,z)=>{N.updateMatrix(),C.setMatrixAt(z,N.matrix),C.setColorAt(z,N.material.color),i.remove(N)}),C.castShadow=!0,C.receiveShadow=!0,i.add(C);function B(N,z=null){if(z)for(const F of n){const q=z[F.bedIndex];if(!q)continue;F.fixtureGlobe&&(F.fixtureGlobe.rotation.y=N*1.2+F.bedIndex,F.fixtureGlobe.position.y=.62+Math.sin(N*3+F.bedIndex)*.03);const V=F.soilMesh.material;if(!q.prepared)V.color.set("#483d2f");else{const j=q.moisture||0,ee=new Ne("#352a1c"),ue=new Ne("#161009");V.color.copy(ee).lerp(ue,j)}(F.renderedCrop!==q.cropId||F.renderedStage!==q.stage)&&(F.renderedCrop=q.cropId,F.renderedStage=q.stage,f0(F.plantGroup,q.cropId,q.stage))}}return{group:i,obstacles:e,items:t,bedVisuals:n,update:B,setFixtures:S,previewCoverage:M}}const Ht=[{id:"court",name:"The Rain Court",district:"LOWER DISTRICT / 04",subtitle:"AFTER THE RAIN",color:"#657264",sun:"#ffe0a5",description:"Wet stone, warm windows. Where your journey began."},{id:"canal",name:"The Sluiceworks",district:"WATER DISTRICT / 05",subtitle:"BENEATH THE MIST",color:"#466b70",sun:"#c3e6e1",description:"Cross the canal and wake the sleeping waterworks.",objective:"Open the sluice valve",action:"Turn the sluice valve",done:"Waterworks flowing",message:"Water moves through the old channels again. Somewhere below, a garden drinks.",landmark:[7,-5],note:[-7,5],noteTitle:"A waterkeeper’s promise",noteBody:"“Keep the water moving. The roots above us are still alive.”",spawn:[-9,0]},{id:"garden",name:"The Glass Garden",district:"UPPER TERRACES / 06",subtitle:"WHERE GREEN RETURNS",color:"#78846a",sun:"#ffe6ad",description:"An overgrown greenhouse above the city. Something still grows.",objective:"Wake the seed nursery",action:"Tend the seed nursery",done:"Nursery awakened",message:"The nursery lights up, sheltering a new generation of green. Kiln watches the leaves unfold.",landmark:[4,-5],note:[-6,5],noteTitle:"The last gardener",noteBody:"“A city is not empty while something is growing. Leave a little room for the wild.”",spawn:[-9,0]},{id:"station",name:"The Last Platform",district:"TRANSIT DISTRICT / 07",subtitle:"THE BLUE HOUR",color:"#424d70",sun:"#b4c5fa",description:"An abandoned tram stop, and a signal waiting to be heard.",objective:"Light the signal beacon",action:"Send the home signal",done:"Signal broadcasting",message:"A warm signal reaches across the rooftops. If someone is out there, they know the city is waking.",landmark:[7,5],note:[-6,5],noteTitle:"An unsent timetable",noteBody:"“Last service: whenever you are ready. There will always be a way home.”",spawn:[-9,0]},{id:"aqueduct",name:"The Sunken Aqueduct",district:"AQUEDUCT DISTRICT / 08",subtitle:"DEEP RUNS THE WATER",color:"#384d52",sun:"#9ec4c0",description:"Subterranean stone channels beneath the old city. Clear the silt sluice to let the cisterns breathe.",objective:"Clear the silt sluice",action:"Raise the silt gate",done:"Cisterns breathing",message:"Clear water rushes through the ancient conduit. The subterranean echoing returns to life.",landmark:[6,-4],note:[-6,4],noteTitle:"Cistern Overseer’s Log",noteBody:"“The masonry has held for three centuries. Give it clean water, and it will hold for three more.”",spawn:[-9,0]},{id:"caldera",name:"The Boiler Caldera",district:"GEOTHERMAL DISTRICT / 09",subtitle:"HEAT FROM THE DEEP",color:"#4d3b38",sun:"#f7aa74",description:"Steam vents hiss through dark basalt crevices. Regulate the geothermal manifold.",objective:"Regulate the geothermal manifold",action:"Turn the pressure manifold",done:"Manifold regulated",message:"Steam settles into a steady, resonant rhythm. Warm air rises toward the cold terraces above.",landmark:[5,-4],note:[-6,5],noteTitle:"Thermal Watchman",noteBody:"“Listen to the pressure before you touch a valve. The rock speaks if you have patience.”",spawn:[-9,0]},{id:"understory",name:"The Spore Understory",district:"FUNGAL DISTRICT / 10",subtitle:"LIGHT IN THE DAMP",color:"#3b4737",sun:"#a5d9a0",description:"A cavernous lower rotunda overtaken by luminous fungi. Awaken the bioluminescent mycelium.",objective:"Awaken the mycelium lattice",action:"Energize the mycelial node",done:"Mycelium luminous",message:"Soft green light pulses through the damp loam and ripples across the shelf fungi.",landmark:[6,-5],note:[-7,5],noteTitle:"Fungal Archivist",noteBody:"“Fungi remember where every tree once stood. They do not hurry, and they never forget.”",spawn:[-9,0]},{id:"saltworks",name:"The Bleached Saltworks",district:"MINERAL DISTRICT / 11",subtitle:"WHITE TERRACES OF BRINE",color:"#566668",sun:"#e3f3f7",description:"Blinding white crystalline flats and evaporation pans. Free the stuck brine pump.",objective:"Engage the brine pump",action:"Prime the brine pump",done:"Brine pump turning",message:"Clear brine trickles into the shallow crystallizers. Salt crystals shimmer in the sunlight.",landmark:[7,-4],note:[-6,4],noteTitle:"Salt Harvester’s Tablet",noteBody:"“The tide gives, the wind takes, and the salt remains. A clean basin makes clean bread.”",spawn:[-9,0]},{id:"rooftops",name:"The High Awnings",district:"SKYWARD DISTRICT / 12",subtitle:"WHERE WINDS GATHER",color:"#546370",sun:"#e6d8b8",description:"Wind-beaten scaffolding and catwalks overlooking the expanse. Free the anemometer array.",objective:"Free the anemometer array",action:"Align the wind vanes",done:"Wind array spinning",message:"The brass vanes catch the gusts and sing against the copper eaves. The city knows which way the wind blows.",landmark:[6,-5],note:[-5,5],noteTitle:"Roofkeeper’s Weather Log",noteBody:"“Up here, you feel the city breathing. The high wind is honest; it hides nothing.”",spawn:[-9,0]},{id:"mangrove",name:"The Brackish Basin",district:"ESTUARY DISTRICT / 13",subtitle:"ROOTS IN THE BRINE",color:"#44574c",sun:"#cde4cb",description:"Submerged brickwork laced with tangle roots and stilt boardwalks. Restore the tidal weir.",objective:"Clear the tidal weir",action:"Lower the timber weir",done:"Tidal weir secured",message:"The water slows behind the timber barrier. Small fish dart among the submerged brick columns.",landmark:[6,-4],note:[-6,5],noteTitle:"Estuary Keeper’s Marker",noteBody:"“The tide doesn’t care about our masonry, but the roots hold both together.”",spawn:[-9,0]},{id:"trestle",name:"The Overgrown Trestle",district:"CANOPY DISTRICT / 14",subtitle:"IRON IN THE BOUGHS",color:"#4e5a42",sun:"#dce6b6",description:"A massive iron railway viaduct gripped by ancient boughs. Restore the suspended maintenance crane.",objective:"Anchor the canopy crane",action:"Engage the hoist cable",done:"Canopy crane anchored",message:"Tension locks into the heavy iron cables. Kiln chirps as the suspension bridge stabilizes.",landmark:[7,-4],note:[-5,5],noteTitle:"Viaduct Inspector’s Plaque",noteBody:"“Steel will flex and timber will bend, but together they span the valley.”",spawn:[-9,0]},{id:"foundry",name:"The Rustfall Foundry",district:"SMELTING DISTRICT / 15",subtitle:"HEARTH OF SLAG AND ORE",color:"#4a3832",sun:"#f2a679",description:"Red iron dust and towering crucible furnaces. Ignite the pilot hearth.",objective:"Ignite the pilot hearth",action:"Spark the furnace igniter",done:"Pilot hearth glowing",message:"A warm orange glow spreads through the blast flue. Warmth returns to the cold cast iron.",landmark:[6,-4],note:[-6,5],noteTitle:"Foundry Master’s Inscription",noteBody:"“Cold iron forgets its shape until fire reminds it. Never let the pilot flame die completely.”",spawn:[-9,0]},{id:"frost-spire",name:"The Glacial Glasshouse",district:"ALPINE DISTRICT / 16",subtitle:"ABOVE THE CLOUD LINE",color:"#45596e",sun:"#d6ecff",description:"A fractured glass observatory battered by alpine frost. Clear the ice crystals from the solar collector.",objective:"Clear the solar collector",action:"Sweep the frost collector",done:"Solar collector cleared",message:"Sunlight catches the polished mirror facets. Warmth begins melting the frost along the rim.",landmark:[5,-5],note:[-6,5],noteTitle:"Alpine Observer’s Journal",noteBody:"“The cold is patient, but glass and copper remember the light. Keep looking upward.”",spawn:[-9,0]},{id:"delta",name:"The Reclaimed Marshes",district:"DELTA DISTRICT / 17",subtitle:"WHISPERS IN THE REEDS",color:"#525b45",sun:"#d9e0b2",description:"Shallow sandbars and cattail marshes woven through stranded barges. Realign the channel beacon.",objective:"Light the channel beacon",action:"Strike the marsh beacon",done:"Channel beacon lit",message:"A warm beacon reflects across the delta shallows, cutting through the twilight mist.",landmark:[7,-4],note:[-6,4],noteTitle:"Delta Boatman’s Note",noteBody:"“Follow the reeds when the silt shifts. Where water moves slowly, green things thrive.”",spawn:[-9,0]},{id:"archives",name:"The Paper Catacombs",district:"ARCHIVE DISTRICT / 18",subtitle:"WHISPERING VAULTS",color:"#48444a",sun:"#f5e4bd",description:"Stone shelves holding centuries of water-resistant parchment. Light the reading desk lamp.",objective:"Illuminate the study rotunda",action:"Turn the reading lamp switch",done:"Study rotunda illuminated",message:"A soft amber globe illuminates centuries of hand-bound volumes. The silence feels like peace.",landmark:[5,-4],note:[-6,5],noteTitle:"Chief Archivist’s Dedication",noteBody:"“Words outlive empires, provided someone keeps the rain from dripping on the ink.”",spawn:[-9,0]},{id:"kiln-terrace",name:"The Solar Kiln",district:"TERRACOTTA DISTRICT / 19",subtitle:"BAKED IN WARMTH",color:"#634b3e",sun:"#ffd09e",description:"Baked clay tiles and parabolic sun collectors. Align the solar concentrator.",objective:"Focus the solar concentrator",action:"Calibrate the focal mirror",done:"Concentrator focused",message:"A brilliant point of concentrated sunlight gleams against the terracotta kiln. Warmth radiates.",landmark:[6,-4],note:[-5,5],noteTitle:"Potter’s Credo",noteBody:"“Earth, water, and sun. With these three, a broken city can remake itself cup by cup.”",spawn:[-9,0]}],iu=new on(1,1,1),Ca=new Map;function Sn(i,e=null,t=0){const n=`${i}_${e||""}_${t}`;return Ca.has(n)||Ca.set(n,new it({color:i,roughness:.62,metalness:.2,emissive:e||"#000000",emissiveIntensity:t})),Ca.get(n)}function yn(i,e,t,n,r,s,o,a,l=0,c=0){const u=new ae(iu,a);return u.position.set(e,t,n),u.scale.set(r,s,o),u.rotation.z=l,u.rotation.y=c,u.castShadow=u.receiveShadow=!0,i.add(u),u}function x0(i,e){const{group:t,items:n,animated:r}=e,s=g0.filter(l=>l.district===i.id);if(s.length===0)return null;const o=new gt;return o.name="dynamic",t.add(o),{visuals:s.map((l,c)=>{const u=$o[l.material],[d,p]=l.position,f=new gt;f.position.set(d,0,p),o.add(f),yn(f,0,.12,0,1.15,.24,1.15,Sn("#3d4547"));const g=new gt;f.add(g),l.material==="copper"?(yn(g,-.18,.34,.1,.42,.34,.42,Sn(u.color),0,.4),yn(g,.22,.3,-.14,.34,.26,.34,Sn("#a8663a"),.2,-.5),yn(g,.05,.54,.02,.2,.22,.2,Sn("#d18b52"),-.3,.9)):l.material==="timber"?(yn(g,0,.36,.05,1.05,.26,.3,Sn(u.color),0,.18),yn(g,.06,.6,-.04,.95,.24,.28,Sn("#8a6842"),0,-.32),yn(g,-.05,.8,.02,.6,.2,.24,Sn("#6b4e30"),0,.62)):(yn(g,-.16,.4,.08,.16,.5,.4,Sn(u.color),.12,.3),yn(g,.18,.36,-.1,.14,.44,.34,Sn("#b8d8e8"),-.1,-.6),yn(g,.02,.52,.12,.12,.62,.3,Sn("#cfe4f0"),.05,1.1));const _=new it({color:u.glowColor,emissive:u.glowColor,emissiveIntensity:1.2}),m=new ae(iu,_);m.scale.set(.12,.12,.12),m.position.y=.95,f.add(m);const h={type:"material_node",nodeId:l.id,material:l.material,x:d,z:p,title:`${u.name} cache`,sub:"Press E to gather materials"};n.push(h);const T={def:l,nodeGroup:f,rich:g,spark:m,sparkMat:_,item:h,depleted:!1,phase:c*1.7};return r.push(b=>{m.position.y=.95+Math.sin(b*2+T.phase)*.07,m.rotation.y=b*.8+T.phase,_.emissiveIntensity=1.1+Math.sin(b*2.6+T.phase)*.35}),T}),dynamic:o}}function M0(i,e){i.depleted=!e.available,i.rich.visible=e.available,i.spark.visible=e.available,i.item&&(i.item.sub=e.available?"Press E to gather materials":"Picked clean — it will regrow in time")}function _c(i){return{current:Ht.some(e=>e.id===i?.current)?i.current:"court",visited:[...new Set(["court",...Array.isArray(i?.visited)?i.visited.filter(e=>Ht.some(t=>t.id===e)):[]])],completed:[...new Set(Array.isArray(i?.completed)?i.completed.filter(e=>Ht.slice(1).some(t=>t.id===e)):[])]}}function S0(i){const{group:e,block:t,box:n,glow:r,material:s,colors:o,random:a,animated:l,geometry:c}=i;n(0,.17,0,5.8,.08,21,"#143c46");const u=new ae(new Pn(5.6,20.8),new it({color:"#367c88",transparent:!0,opacity:.8,roughness:.13,metalness:.65}));u.rotation.x=-Math.PI/2,u.position.y=.23,e.add(u);for(const f of[-6.15,6.65])t(0,f,5.5,f<0?8.5:7.5);n(0,.21,0,7,.2,3.8,"#8b8d77");for(let f=-3.5;f<4;f+=.6){n(f,.34,0,.54,.09,3.7,"#6d807d");for(const g of[-1.85,1.85])n(f,.85,g,.08,1.1,.08,o.brass)}for(const f of[-1.85,1.85])n(0,1.4,f,7.5,.09,.09,o.brass);for(let f=-9;f<10;f+=.65)for(const g of[-3.1,3.1])n(g,.45,f,.35,.55,.6,"#a6a28b");for(const f of[-8,8]){n(f,1.2,-8,3,2.4,2.2,o.dark),t(f,-8,3,2.2);for(let g=0;g<6;g++)n(f,.5+g*.28,-6.86,2.5,.08,.1,o.brass);n(f,3,-8,.5,2,.5,o.brass)}for(let f=-9;f<10;f+=1.5){const g=r((a()-.5)*4,.245,f,1+a(),.015,.045,"#72b7bd",.35);l.push(_=>{g.position.x=Math.sin(_*.45+f)*1.2})}const d=new gt;d.position.set(7,1.6,-5);const p=new ae(new Wo(.55,.07,6,24),s("#c0995d"));d.add(p);for(let f=0;f<6;f++){const g=new ae(c,s("#c0995d"));g.scale.set(.95,.055,.07),g.rotation.z=f*Math.PI/3,d.add(g)}e.add(d),l.push((f,g)=>{d.rotation.z=g?f*.4:0})}function y0(i){const{group:e,block:t,box:n,glow:r,random:s,animated:o}=i,a=new it({color:"#b7d9b3",transparent:!0,opacity:.13,metalness:.1,roughness:.3,depthWrite:!1,side:Kt});for(const l of[-1,7])for(let c=-9;c<=-2;c+=1.4)n(l,2.1,c,.1,4.2,.1,"#789184");for(let l=-9;l<=-2;l+=1.4){const c=n(1,4.8,l,4.5,.12,.12,"#96a58b");c.rotation.z=.35;const u=n(5,4.8,l,4.5,.12,.12,"#96a58b");u.rotation.z=-.35}for(const l of[1,5]){const c=n(l,4.8,-5.5,4.25,.03,7.4);c.material=a,c.rotation.z=l===1?.35:-.35}for(const[l,c,u,d]of[[-6,-5,3,5],[3,3.5,5,2],[8,6,2,4]]){n(l,.35,c,u,.6,d,"#9b9270"),n(l,.68,c,u-.2,.1,d-.2,"#414b32"),t(l,c,u,d);for(let p=0;p<50;p++){const f=l+(s()-.5)*(u-.4),g=c+(s()-.5)*(d-.4),_=.4+s()*.7;n(f,.7+_/2,g,.045,_,.045,"#627347");const m=n(f,.8+_,g,.3,.12,.45,["#779455","#94a86a","#536f42"][p%3]);m.rotation.z=s(),p%8===0&&n(f,1+_,g,.16,.14,.16,"#d2b28a")}}for(const l of[-9,9]){n(l,1.1,-7,.35,2.2,.35,"#6b5942"),t(l,-7,1.5,1.5);for(let c=0;c<25;c++)n(l+(s()-.5)*2.5,2+s()*1.7,-7+(s()-.5)*2,.7,.5,.7,["#667c49","#819258","#4e6b47"][c%3])}n(4,.75,-5,2,1.4,1.2,"#a09776"),t(4,-5,2,1.2);for(let l=0;l<6;l++){const c=r(3.3+l*.28,1.55,-5,.1,.18,.2,"#b7ce86",.5);o.push((u,d)=>{c.material.emissiveIntensity=d?1.8+Math.sin(u+l)*.25:.3,c.scale.y=d?.35:.18})}}function E0(i){const{group:e,block:t,box:n,glow:r,material:s,colors:o,animated:a}=i;for(const c of[-5,-7])n(0,.25,c,23,.12,.12,"#9aa5a2");for(let c=-11;c<12;c+=.8)n(c,.17,-6,.24,.16,3.5,"#67584a");n(1,1.65,-6,8,2.7,2.6,"#485e62"),t(1,-6,8,2.6),n(1,3.15,-6,8.4,.3,2.8,"#9b9c87"),n(1,.75,-4.66,8,.27,.08,o.brass);for(let c=-2;c<5;c+=1.25)r(c,2.15,-4.66,.85,.95,.04,"#f3ce89",.5),n(c,2.15,-4.61,.045,.95,.05,o.dark);for(const c of[-2,4])for(const u of[-7.1,-4.9]){const d=new ae(new Ti(.45,.45,.2,12),s("#23363c"));d.rotation.x=Math.PI/2,d.position.set(c,.55,u),e.add(d)}for(const c of[-8,8])n(c,1.85,-2,.18,3.7,.18,o.brass),t(c,-2,.2,.2);n(0,3.8,-2,18,.22,2.4,"#35494f");for(const c of[-5,1]){n(c,.65,3,2.8,.16,.7,"#9b8966"),n(c,1.15,3.35,2.8,.75,.12,"#9b8966");for(const u of[-1,1])n(c+u,.3,3,.12,.6,.6,o.dark);t(c,3,2.8,.9)}n(7,2.3,5,.18,4.6,.18,o.dark),t(7,5,.3,.3);const l=r(7,4.7,5,.7,.65,.7,"#e2b67b",.2);a.push((c,u)=>{l.material.emissiveIntensity=u?2+Math.sin(c*2):.2})}function T0(i){const{group:e,block:t,box:n,glow:r,colors:s,animated:o}=i;for(const c of[-7,-2,3,8])n(c,2.5,-6.5,1.2,5,1.2,"#3b4b4e"),t(c,-6.5,1.2,1.2),n(c,5.2,-6.5,3.6,.6,1.4,"#495f63");n(0,.18,-6.5,22,.12,2,"#182b2e");const a=new ae(new Pn(21.8,1.8),new it({color:"#2a555e",transparent:!0,opacity:.82,roughness:.15,metalness:.6}));a.rotation.x=-Math.PI/2,a.position.set(0,.24,-6.5),e.add(a),n(6,1.4,-4,2,2.8,1.4,s.dark),t(6,-4,2,1.4);const l=n(6,.8,-3.2,1.2,1.4,.2,s.brass);o.push((c,u)=>{l.position.y=u?1.5+Math.sin(c*.5)*.05:.8});for(const c of[-6,0])n(c,.6,6,2.5,1.2,1.8,"#34474a"),t(c,6,2.5,1.8),n(c,1.3,6,2.2,.2,.2,s.brass)}function b0(i){const{block:e,box:t,glow:n,colors:r,animated:s}=i;for(const[a,l,c,u]of[[-7,-6,3.2,2.6],[-1,-7,2.8,2.2],[8,-7,3,2.4],[-8,6.5,3,2.5],[2,6.5,3.5,2.2]])t(a,1.1,l,c,2.2,u,"#252528"),e(a,l,c,u),t(a,2.3,l,c*.7,.6,u*.7,"#383230"),n(a,2.65,l,c*.35,.1,u*.35,"#f5a438",1.2);t(5,1.2,-4,2.2,2.4,1.6,r.dark),e(5,-4,2.2,1.6);const o=n(5,2.5,-4,.7,.7,.7,"#f7aa74",.8);s.push((a,l)=>{o.material.emissiveIntensity=l?2.5+Math.sin(a*3)*.5:.6,o.rotation.y=l?a*1.5:0})}function w0(i){const{block:e,box:t,glow:n,random:r,animated:s}=i;for(const[a,l,c,u]of[[-7,-6,2.8,2.5],[1,-6.5,3.5,2.2],[-7,6,2.5,2.5],[3,6,3,2]]){t(a,.9,l,c,1.8,u,"#2d271e"),e(a,l,c,u);for(let d=0;d<3;d++){const p=1.2+d*.6;t(a+(d%2===0?.6:-.6),p,l,1.8,.15,1.4,"#5e4334");const f=n(a+(d%2===0?.6:-.6),p+.1,l,1.2,.08,.9,"#7ee8b0",.4);s.push((g,_)=>{f.material.emissiveIntensity=_?1.8+Math.sin(g*2+d)*.4:.4})}}t(6,.8,-5,2,1.6,1.8,"#322d25"),e(6,-5,2,1.8);const o=n(6,1.8,-5,.8,.8,.8,"#85f5bc",.5);s.push((a,l)=>{o.material.emissiveIntensity=l?2.8+Math.sin(a*2.5)*.6:.5,o.scale.setScalar(l?1+Math.sin(a*3)*.08:1)})}function A0(i){const{group:e,block:t,box:n,glow:r,colors:s,animated:o}=i;for(let l=-8;l<=4;l+=3.5){n(l,.28,-6.5,3.2,.3,2.5,"#9ea8ab"),t(l,-6.5,3.2,2.5);const c=new ae(new Pn(2.8,2.1),new it({color:"#7cd4e2",transparent:!0,opacity:.75,roughness:.1}));c.rotation.x=-Math.PI/2,c.position.set(l,.45,-6.5),e.add(c),n(l,.48,-6.5,1.2,.08,1,"#f0f6f7")}for(const l of[-6,0]){n(l,1.2,6,3,2.4,1.4,"#7a6a57"),t(l,6,3,1.4);for(let c=.5;c<2.2;c+=.5)n(l,c,6,2.8,.08,1.2,"#ded7cb")}n(7,1.2,-4,1.8,2.4,1.8,s.dark),t(7,-4,1.8,1.8);const a=n(7,2.7,-4,.3,.25,2.2,s.brass);o.push((l,c)=>{a.rotation.x=c?Math.sin(l*3)*.2:0})}function R0(i){const{block:e,box:t,glow:n,colors:r,animated:s}=i;for(const a of[-8,-2,4])t(a,1.8,-6.5,4.5,3.2,2.6,"#48555e"),e(a,-6.5,4.5,2.6),t(a,3.5,-6.5,4.8,.2,2.8,"#70828c"),t(a,4.2,-6.5,.15,1.2,.15,r.brass);for(const a of[-6,1])t(a,.9,6,3.8,1.8,1.6,"#6b5845"),e(a,6,3.8,1.6),t(a,1.9,5.3,3.8,.8,.08,r.brass);t(6,1.8,-5,.3,3.6,.3,r.dark),e(6,-5,.8,.8);const o=n(6,3.7,-5,1.4,.12,.12,"#e6c883",1.2);s.push((a,l)=>{o.rotation.y=l?a*4.5:a*.4})}function C0(i){const{group:e,block:t,box:n,colors:r,animated:s}=i,o=new ae(new Pn(23,8),new it({color:"#254238",transparent:!0,opacity:.8,roughness:.2}));o.rotation.x=-Math.PI/2,o.position.set(0,.22,-6),e.add(o);for(const[l,c]of[[-8,-6],[-2,-6.5],[3,-6.5]]){n(l,1.2,c,2.4,2.4,2.2,"#3d3226"),t(l,c,2.4,2.2);for(let u=0;u<4;u++){const d=n(l+(u-1.5)*.5,.8,c,.18,1.6,.18,"#4f4030");d.rotation.z=(u-1.5)*.3}}for(const l of[-5,2])n(l,.8,6,3.2,1.6,2,"#485244"),t(l,6,3.2,2);n(6,1.4,-4,2,2.8,1.4,r.dark),t(6,-4,2,1.4);const a=n(6,1.8,-3.2,1.4,1.6,.2,"#7a5a3a");s.push((l,c)=>{a.position.y=c?.8:1.8+Math.sin(l)*.05})}function P0(i){const{block:e,box:t,glow:n,colors:r,animated:s}=i;for(const a of[-8,-2,4])t(a,2.2,-6.5,1.2,4.4,1.2,"#5e3428"),e(a,-6.5,1.2,1.2);t(0,4.5,-6.5,22,.5,1.6,"#3a2018");for(let a=-10;a<=10;a+=1.2)t(a,4.8,-6.5,.3,.2,2.2,"#483c34");for(const a of[-6,0])t(a,.9,6,3.4,1.8,1.8,"#443b35"),e(a,6,3.4,1.8);t(7,2,-4,.4,4,.4,r.dark),e(7,-4,1,1),t(7,4.1,-4,1.8,.3,.3,r.brass);const o=n(7.6,3.2,-4,.08,1.6,.08,"#d9bf82",.6);s.push((a,l)=>{o.rotation.z=l?0:Math.sin(a*1.5)*.06})}function D0(i){const{block:e,box:t,glow:n,colors:r,animated:s}=i;for(const a of[-7,-1])t(a,2.4,-6.5,3.5,4.8,2.8,"#2d2d33"),e(a,-6.5,3.5,2.8),t(a,4.9,-6.5,2,1.2,2,"#45454d"),n(a,1.1,-5,1.4,.8,.2,"#ff6622",1.8);for(const a of[-6,1])t(a,.7,6,3.6,1.4,1.8,"#3c2b28"),e(a,6,3.6,1.8),n(a,.8,6,2.8,.1,.8,"#8c3d23",.4);t(6,1.1,-4,2.2,2.2,2.2,r.dark),e(6,-4,2.2,2.2);const o=n(6,1.8,-4,1.2,.8,1.2,"#ff8033",.5);s.push((a,l)=>{o.material.emissiveIntensity=l?2.8+Math.sin(a*5)*.4:.5})}function I0(i){const{block:e,box:t,glow:n,colors:r,animated:s}=i;for(const a of[-8,-2,4])t(a,2.6,-6.5,.35,5.2,.35,"#627585"),e(a,-6.5,1,1),t(a,5.1,-6.5,3.8,.2,.2,"#8ea3b5");for(const a of[-6,0])t(a,1,6,3.2,2,2,"#667480"),e(a,6,3.2,2),t(a,2.05,6,2.8,.12,1.6,"#d8e5ed");t(5,1.4,-5,1.6,2.8,1.6,r.dark),e(5,-5,1.6,1.6);const o=n(5,3,-5,1.4,1.4,.2,"#cce6f5",1.2);s.push((a,l)=>{o.material.emissiveIntensity=l?2.6+Math.sin(a*2)*.4:.6,o.rotation.y=l?a*.5:0})}function L0(i){const{group:e,block:t,box:n,glow:r,colors:s,animated:o}=i,a=new ae(new Pn(22,5.5),new it({color:"#2d4345",transparent:!0,opacity:.8,roughness:.2}));a.rotation.x=-Math.PI/2,a.position.set(0,.22,-6.5),e.add(a),n(-4,.8,-6.5,5.5,1.4,2.2,"#483e32"),t(-4,-6.5,5.5,2.2);for(const c of[-6,0])n(c,.7,6,3.4,1.4,1.8,"#594d3f"),t(c,6,3.4,1.8);n(7,2,-4,.4,4,.4,s.dark),t(7,-4,1,1),n(7,4.1,-4,1.2,.2,1.2,s.brass);const l=r(7,4.5,-4,.7,.7,.7,"#e8ca76",.4);o.push((c,u)=>{l.material.emissiveIntensity=u?2.8+Math.sin(c*2)*.5:.4})}function U0(i){const{block:e,box:t,glow:n,colors:r,animated:s}=i;for(const a of[-8,-2,4]){t(a,2.5,-6.5,3.6,5,1.6,"#35363b"),e(a,-6.5,3.6,1.6);for(let l=1;l<4.8;l+=.9){t(a,l,-5.6,3.2,.06,.2,r.brass);for(let c=-1.3;c<1.4;c+=.45)t(a+c,l+.35,-5.6,.35,.65,.15,["#574636","#6e5643","#434739"][c*10%3>>>0])}}for(const a of[-6,1])t(a,.8,6,3.2,1.6,1.8,"#524335"),e(a,6,3.2,1.8),t(a,1.65,6,2.8,.1,1.4,"#7a6652");t(5,1.1,-4,1.6,2.2,1.6,"#42372c"),e(5,-4,1.6,1.6),t(5,2.3,-4,.1,.6,.1,r.brass);const o=n(5,2.8,-4,.6,.6,.6,"#ffd580",.3);s.push((a,l)=>{o.material.emissiveIntensity=l?2.5+Math.sin(a*1.5)*.2:.3})}function N0(i){const{block:e,box:t,glow:n,colors:r,animated:s}=i;for(const a of[-7,-1])t(a,1.8,-6.5,3.4,3.6,2.8,"#8c4832"),e(a,-6.5,3.4,2.8),t(a,3.8,-6.5,2,.8,1.8,"#aa583e"),n(a,1.2,-5,.8,.8,.2,"#ffaa44",.6);for(const a of[-6,1]){t(a,.8,6,3.2,1.6,1.8,"#9c5a43"),e(a,6,3.2,1.8);for(let l=-1;l<=1;l+=.8)t(a+l,1.8,6,.45,.6,.45,"#bd6b51")}t(6,1.2,-4,1.8,2.4,1.8,r.dark),e(6,-4,1.8,1.8);const o=n(6,2.7,-4,1.4,1.4,.18,"#ffe0a0",.6);s.push((a,l)=>{o.rotation.x=l?Math.sin(a*.4)*.2:0,o.material.emissiveIntensity=l?2.8+Math.sin(a*2)*.4:.6})}const F0={canal:S0,garden:y0,station:E0,aqueduct:T0,caldera:b0,understory:w0,saltworks:A0,rooftops:R0,mangrove:C0,trestle:P0,foundry:D0,"frost-spire":I0,delta:L0,archives:U0,"kiln-terrace":N0};function O0(i,e=!1){const t=new gt;t.name=i.id;const n=[],r=[],s=[],o=new on(1,1,1),a={stone:"#6b776c",dark:"#233c3e",brass:"#b78d50",green:"#58734c"},l=new Map,c=C=>(l.has(C)||l.set(C,new it({color:C,roughness:.62,metalness:.2})),l.get(C));function u(C,B,N,z,F,q,V=a.stone){const j=new ae(o,c(V));return j.position.set(C,B,N),j.scale.set(z,F,q),j.castShadow=j.receiveShadow=!0,t.add(j),j}function d(C,B,N,z){n.push({x:C,z:B,w:N/2+.38,d:z/2+.38})}function p(C,B,N,z,F,q,V,j=1.5){const ee=u(C,B,N,z,F,q,V);return ee.material=new it({color:V,emissive:V,emissiveIntensity:j}),ee}function f(C,B,N="#ffcb79"){u(C,1.8,B,.12,3.6,.12,a.dark),p(C,3.6,B,.35,.5,.35,N,2),u(C,3.92,B,.6,.12,.6,a.dark);const z=new qo(N,7,7,2);z.position.set(C,3.4,B),t.add(z),d(C,B,.25,.25)}let g=Ht.indexOf(i)*37;function _(){return g=g*1664525+1013904223>>>0,g/4294967296}u(0,-.55,0,25,1,22,"#263638");for(let C=-12;C<12;C++)for(let B=-10;B<11;B++){const N=i.id==="garden"?["#7b816a","#8b8b70","#64745e"]:["#586b6d","#657373","#475b61"];u(C+.5,.06,B+.5,.96,.15,.96,N[Math.floor(_()*3)])}for(let C=-12;C<=12;C+=.8)for(let B=.4;B<3;B+=.4)u(C,B,-10.5,.76,.37,.65,B>2.6?"#a0a18a":"#4d6561");for(let C=-10;C<11;C+=.8)for(const B of[-12,12])Math.abs(C)<2||(u(B,.65,C,.5,1.3,.76,a.dark),u(B,1.35,C,.7,.15,.78,a.stone));for(const C of[-9,-3,3,9]){u(C,4,-13,5,8,4,"#2b4145");for(let B=-1.5;B<2;B+=1)for(let N=3;N<7;N+=1.5)p(C+B,N,-10.96,.45,.7,.04,"#91b4ab",.25)}f(-10,-7),f(10,8);const m=F0[i.id];if(!m)throw new Error(`Unknown district id: ${i.id}`);m({group:t,obstacles:n,items:r,animated:s,geometry:o,colors:a,material:c,box:u,block:d,glow:p,lamp:f,random:_,def:i,completed:e});const[h,T]=i.note;u(h,.6,T,.8,1.2,.6,a.dark),d(h,T,.8,.6),p(h,1.24,T,.5,.035,.4,"#d4c9a1",.4),r.push({type:"field-note",x:h,z:T,title:"Read the field note",sub:i.noteTitle,body:i.noteBody});const[b,y]=i.landmark,P=p(b,2.5,y,.13,.13,.13,"#ffe0a0",2),w=new ae(new Or(.8,.84,32),new ar({color:"#e7c889",side:Kt,transparent:!0,opacity:.65}));w.rotation.x=-Math.PI/2,w.position.set(b,.25,y),t.add(w),r.push({type:"landmark",x:b,z:y,title:i.action,sub:"A small act of restoration"});const D=x0(i,{group:t,items:r,animated:s});function L(C){if(!(!D||!Array.isArray(C)))for(const B of C){const N=D.visuals.find(z=>z.def.id===B.nodeId);N&&M0(N,B)}}function M(C,B){P.position.y=2.5+Math.sin(C*2)*.12,P.material.emissive.set(B?"#93e9b6":"#ffe0a0"),w.material.color.set(B?"#93e9b6":"#e7c889"),s.forEach(N=>N(C,B))}M(0,e);const S=t.children.filter(C=>C.isMesh&&C.geometry===o&&!C.material.transparent&&C.material.emissive?.getHex()===0),R=new ko(o,new it({color:"#ffffff",roughness:.62,metalness:.2}),S.length);return S.forEach((C,B)=>{C.updateMatrix(),R.setMatrixAt(B,C.matrix),R.setColorAt(B,C.material.color),t.remove(C)}),R.castShadow=R.receiveShadow=!0,t.add(R),{group:t,obstacles:n,items:r,update:M,setNodeStates:L}}const gs={market:{id:"market",minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3,spawn:[0,3],exitGarden:[10.7,0]},garden:{id:"garden",minX:-11.5,maxX:11.5,minZ:-10,maxZ:10.5,spawn:[-9.5,0],exitMarket:[-10.7,0]}};function ws(i){return!i||i==="market"?gs.market:i.startsWith("garden:")||i==="garden"?gs.garden:gs[i]?gs[i]:{id:i,minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3,spawn:[-9,0],exitWest:[-10.7,0],exitEast:[10.7,0]}}function Us(i,e,t,n){if(t<=i.minX||t>=i.maxX||n<=i.minZ||n>=i.maxZ)return!1;for(let r=0;r<e.length;r++){const s=e[r];if(Math.abs(t-s.x)<s.w&&Math.abs(n-s.z)<s.d)return!1}return!0}function B0(i,e,t){return{x:Math.max(i.minX+.35,Math.min(i.maxX-.35,e)),z:Math.max(i.minZ+.35,Math.min(i.maxZ-.35,t))}}function z0(i,e,t,n={x:24,y:24,w:106,h:72}){const r=(e-i.minX)/(i.maxX-i.minX),s=(t-i.minZ)/(i.maxZ-i.minZ);return{cx:n.x+Math.max(0,Math.min(1,r))*n.w,cy:n.y+Math.max(0,Math.min(1,s))*n.h}}function k0(i){return an[i]||gi[i]||null}function H0(i,e="B",t=1){const n=k0(i);if(!n)return 0;const r=h0[e]??1;return Math.max(1,Math.round(n.basePrice*t*r*.85))}function V0(i,e=1){const t=an[i];if(!t)return 0;const n=1+(e-1)*.4;return Math.max(1,Math.round(t.seedCost*n))}class G0{constructor(e,t={}){this.client=e,this.onAction=t,this.selectedCropId="radish",this.activeTool="hands",this.selectedSeed="radish",this.lastMachines={mill:{status:"broken",required:{...nu},contributed:{copper:0,timber:0,glass:0},restoredAt:null}},this.initDOM()}initDOM(){this.createMarketDialog(),this.createSeedDialog(),this.createContractDialog(),this.createInventoryDialog(),this.createProfileDialog(),this.createMachineShopDialog(),this.setupEventListeners()}createMarketDialog(){const e=document.createElement("dialog");e.id="market-dialog",e.className="game-modal",e.innerHTML=`
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
    `,document.body.append(e)}setupEventListeners(){const e=document.getElementById("market-crop-tabs");e.innerHTML="";const t=[...To,...m0];for(const n of t){const r=document.createElement("button");r.className=`crop-tab ${n.id===this.selectedCropId?"active":""}`,r.textContent=n.name,r.onclick=()=>{this.selectedCropId=n.id,document.querySelectorAll(".crop-tab").forEach(s=>s.classList.remove("active")),r.classList.add("active"),this.updateMarketView()},e.append(r)}document.querySelectorAll("#sell-quality-selector button").forEach(n=>{n.onclick=()=>{document.querySelectorAll("#sell-quality-selector button").forEach(r=>r.classList.remove("active")),n.classList.add("active"),this.updateMarketView()}}),document.getElementById("btn-instant-sell").onclick=()=>{const n=!!gi[this.selectedCropId],r=document.querySelector("#sell-quality-selector button.active"),s=n?"B":r?r.dataset.qual:"B",o=parseInt(document.getElementById("sell-qty-input").value,10)||1;this.client.sendMarketSell(this.selectedCropId,s,o)},document.getElementById("btn-create-order").onclick=()=>{const n=document.getElementById("order-side").value,r=parseFloat(document.getElementById("order-price").value)||10,s=parseInt(document.getElementById("order-qty").value,10)||1;this.client.sendOrderPlace(n,this.selectedCropId,r,s,"B")},document.getElementById("close-market").onclick=()=>document.getElementById("market-dialog").close(),document.getElementById("close-seed-dialog").onclick=()=>document.getElementById("seed-dialog").close(),document.getElementById("close-contracts").onclick=()=>document.getElementById("contract-dialog").close(),document.getElementById("close-inventory").onclick=()=>document.getElementById("inventory-dialog").close(),document.getElementById("close-profile").onclick=()=>document.getElementById("profile-dialog").close(),document.getElementById("close-machine-shop").onclick=()=>document.getElementById("machine-shop-dialog").close(),document.getElementById("btn-save-nickname").onclick=()=>{const n=document.getElementById("profile-nick-input").value.trim();n&&(this.client.setNickname(n),document.getElementById("profile-dialog").close())}}openMarket(){this.updateMarketView(),document.getElementById("market-dialog").showModal()}openSeedVendor(){this.updateSeedVendorView(),document.getElementById("seed-dialog").showModal()}openContracts(){this.updateContractsView(),document.getElementById("contract-dialog").showModal()}openInventory(){this.updateInventoryView(),document.getElementById("inventory-dialog").showModal()}openProfile(){document.getElementById("profile-nick-input").value=this.client.nickname,document.getElementById("profile-dialog").showModal()}updateMachineShopView(e=null){e&&(this.lastMachines=e);const t=this.lastMachines?.mill,n=document.getElementById("mill-progress-summary"),r=document.getElementById("mill-material-rows"),s=document.getElementById("mill-flour-box"),o=document.getElementById("sprinkler-craft-box");if(!n||!r||!t)return;const a=this.lastPlayer,l=a?.materials||{};if(t.status==="restored")n.innerHTML=`
        <strong class="mill-restored-line">✦ The Great Mill is turning.</strong>
        <p>Restored by the community. It grinds wheat into flour for everyone, permanently.</p>
      `,r.innerHTML="";else{let f=0,g=0,_="";for(const m of gc){const h=t.required?.[m.id]||0,T=Math.min(t.contributed?.[m.id]||0,h);f+=T,g+=h;const b=l[m.id]||0,y=h-T,P=b>0&&y>0?`<button class="btn-contribute" data-material="${m.id}" data-qty="1">Give 1</button>
             <button class="btn-contribute" data-material="${m.id}" data-qty="${Math.min(b,y)}">Give all</button>`:"";_+=`
          <div class="mill-material-row">
            <span class="mill-mat-name">${m.name}</span>
            <span class="mill-mat-count">${T} / ${h}</span>
            <span class="mill-mat-held">satchel: ${b}</span>
            ${P}
          </div>`}n.innerHTML=`
        <strong>The Great Mill is broken.</strong>
        <p>Community restoration: ${f} / ${g} materials delivered.</p>
      `,r.innerHTML=_}if(r.querySelectorAll(".btn-contribute").forEach(f=>{f.onclick=()=>{this.client.send(je.MACHINE_CONTRIBUTE,{actionId:this.nextActionId(),material:f.dataset.material,quantity:parseInt(f.dataset.qty,10)||1})}}),t.status==="restored"){const g=["C","B","A","A+"].reduce((h,T)=>h+(a?.inventory?.produce?.[`wheat_${T}`]||0),0),_=a?.inventory?.produce?.flour_B||0;s.innerHTML=`
        <div class="micro">MILLING · WHEAT → FLOUR (1:1)</div>
        <p class="machine-hint">Wheat in satchel: ${g} · Flour: ${_}</p>
        <div class="order-form-row">
          <input type="number" id="mill-qty-input" min="1" max="99" value="1">
          <button id="btn-mill-flour" class="action-btn"${g<=0?" disabled":""}>Mill Flour</button>
        </div>
      `;const m=s.querySelector("#btn-mill-flour");m&&(m.onclick=()=>{const h=parseInt(document.getElementById("mill-qty-input").value,10)||1;this.client.send(je.MACHINE_MILL,{actionId:this.nextActionId(),quantity:h})})}else s.innerHTML=`
        <div class="micro">MILLING</div>
        <p class="machine-hint">The millstones wait. Restore the mill to grind wheat into flour.</p>
      `;const c=Object.entries(Xi.cost).map(([f,g])=>`${g}× ${$o[f].name}`).join(" + "),u=Object.entries(Xi.cost).map(([f,g])=>`${l[f]||0}/${g}`).join(" · "),d=Object.entries(Xi.cost).every(([f,g])=>(l[f]||0)>=g);o.innerHTML=`
      <div class="micro">CRAFT · ${Xi.name}</div>
      <p class="machine-hint">Cost: ${c}. Keeps covered beds watered on their own. (satchel: ${u})</p>
      <button id="btn-craft-sprinkler" class="action-btn"${d?"":" disabled"}>Craft Sprinkler Kit</button>
    `;const p=o.querySelector("#btn-craft-sprinkler");p&&(p.onclick=()=>{this.client.send(je.MACHINE_CRAFT,{actionId:this.nextActionId(),fixture:Xi.id})})}nextActionId(){return`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`}updateMarketView(e=null,t=null){e&&(this.lastPrices=e),t&&(this.lastOrderBook=t);const n=an[this.selectedCropId]||gi[this.selectedCropId];if(!n)return;const r=!!gi[this.selectedCropId];document.getElementById("spot-crop-name").textContent=n.name,document.getElementById("spot-crop-tagline").textContent=n.tagline;const s=this.lastPrices?this.lastPrices[n.id]:null,o=s?s.multiplier:1,a=document.querySelector("#sell-quality-selector button.active"),l=r?"B":a?a.dataset.qual:"B",c=H0(n.id,l,o);document.getElementById("spot-instant-bid").textContent=`${c} ⛁`,document.getElementById("spot-base-price").textContent=`${n.basePrice} ⛁`,document.getElementById("spot-multiplier").textContent=`${o.toFixed(2)}x`;const u=this.lastPlayer;let d=0;u&&u.inventory&&u.inventory.produce&&(d=u.inventory.produce[`${n.id}_${l}`]||0),document.getElementById("sell-owned-qty").textContent=d;const p=document.getElementById("orderbook-asks"),f=document.getElementById("orderbook-bids");if(p.innerHTML="",f.innerHTML="",this.lastOrderBook){const g=this.lastOrderBook.asks?.filter(m=>m.cropId===n.id)||[],_=this.lastOrderBook.bids?.filter(m=>m.cropId===n.id)||[];if(g.length===0)p.innerHTML='<div class="empty-book">No active asks</div>';else for(const m of g){const h=document.createElement("div");h.className="book-row ask-row",h.innerHTML=`<span>${m.quantity}x</span> <strong>${m.price} ⛁</strong>`,p.append(h)}if(_.length===0)f.innerHTML='<div class="empty-book">No active bids</div>';else for(const m of _){const h=document.createElement("div");h.className="book-row bid-row",h.innerHTML=`<span>${m.quantity}x</span> <strong>${m.price} ⛁</strong>`,f.append(h)}}}updateSeedVendorView(){const e=document.getElementById("seed-catalog-list");e.innerHTML="";for(const t of To){const n=document.createElement("div");n.className="seed-card panel";const r=this.lastPrices&&this.lastPrices[t.id]?this.lastPrices[t.id].multiplier:1,s=V0(t.id,r);n.innerHTML=`
        <div class="micro">GROWTH: ${t.growDuration}S · YIELD: ${t.yield}x</div>
        <strong>${t.name}</strong>
        <p>${t.tagline}</p>
        <div class="seed-card-footer">
          <b>${s} ⛁</b>
          <button data-crop="${t.id}" class="btn-buy-seed">Buy Seed Packet</button>
        </div>
      `,n.querySelector(".btn-buy-seed").onclick=()=>{this.client.sendMarketBuy(t.id,1)},e.append(n)}}updateContractsView(e=null){e&&(this.lastContracts=e);const t=document.getElementById("contracts-container");t.innerHTML="";const n=this.lastContracts||[];if(n.length===0){t.innerHTML="<p>No active restaurant contracts at this moment. Check back soon!</p>";return}for(const r of n){const s=document.createElement("div");s.className="contract-card panel",s.innerHTML=`
        <div class="contract-head">
          <span class="micro">${r.client.toUpperCase()}</span>
          <span class="contract-reward">+${r.reward} ⛁ · +${r.reputation} ★ · +${r.xp} XP</span>
        </div>
        <strong>Order: ${r.quantity}x ${r.cropName} (Min Grade ${r.minQuality})</strong>
        <button data-id="${r.id}" class="btn-fulfill-contract">Deliver Order →</button>
      `,s.querySelector(".btn-fulfill-contract").onclick=()=>{this.client.sendContractComplete(r.id)},t.append(s)}}updateInventoryView(e=null){e&&(this.lastPlayer=e);const t=document.getElementById("inv-seeds-list"),n=document.getElementById("inv-produce-list"),r=document.getElementById("inv-materials-list");t.innerHTML="",n.innerHTML="",r.innerHTML="";const s=this.lastPlayer;if(!s||!s.inventory)return;const o=s.inventory.seeds||{},a=Object.entries(o).filter(([f,g])=>g>0);if(a.length===0)t.innerHTML='<div class="empty-msg">No seeds in satchel</div>';else for(const[f,g]of a){const _=an[f],m=document.createElement("div");m.className="inv-item",m.innerHTML=`<strong>${_?.name||f}</strong> <span>${g} packets</span>`,m.onclick=()=>{this.selectedSeed=f,this.activeTool="seed",this.onAction.onSelectTool?.("seed",f),document.getElementById("inventory-dialog").close()},t.append(m)}const l=s.inventory.produce||{},c=Object.entries(l).filter(([f,g])=>g>0);if(c.length===0)n.innerHTML='<div class="empty-msg">No harvested produce</div>';else for(const[f,g]of c){const[_,m]=f.split("_"),h=an[_]||gi[_],T=!!gi[_],b=document.createElement("div");b.className="inv-item",b.innerHTML=`<strong>${h?.name||_}</strong> ${T?"":`<span class="badge-grade">Grade ${m}</span>`} <span>${g} units</span>`,n.append(b)}const u=s.materials||{},d=gc.map(f=>[f,u[f.id]||0]).filter(([,f])=>f>0),p=s.inventory.sprinklers||0;if(d.length===0&&p<=0)r.innerHTML='<div class="empty-msg">No materials yet — gather them in the outer districts</div>';else{for(const[f,g]of d){const _=document.createElement("div");_.className="inv-item",_.innerHTML=`<strong>${f.name}</strong> <span>${g} units</span>`,r.append(_)}if(p>0){const f=document.createElement("div");f.className="inv-item",f.innerHTML=`<strong>${Xi.name} kit</strong> <span>${p} ready — place on a bed (tool 6)</span>`,r.append(f)}}}updatePlayerHUD(e){this.lastPlayer=e;const t=document.getElementById("hud-coins"),n=document.getElementById("hud-rep"),r=document.getElementById("hud-xp"),s=document.getElementById("hud-nick");t&&(t.textContent=`${e.coins} ⛁`),n&&(n.textContent=`${e.reputation||10} ★`),r&&(r.textContent=`Lvl ${e.level||1} · ${e.xp||0} XP`),s&&(s.textContent=e.nickname)}}const ge=i=>document.getElementById(i),Et=new qd;Et.background=new Ne("#222d2a");Et.fog=new zo("#54645d",.018);const xn=new $g({canvas:ge("world"),antialias:!0});xn.setPixelRatio(Math.min(devicePixelRatio,1.5));xn.setSize(innerWidth,innerHeight);xn.shadowMap.enabled=!0;xn.shadowMap.type=yc;xn.toneMapping=Tc;xn.toneMappingExposure=1.15;const dn=new Os;let Yi=0,$i=24;const zs=new e0(xn);zs.addPass(new t0(Et,dn));const W0=new ir(new we(innerWidth,innerHeight),.25,.65,1.05);zs.addPass(W0);Et.add(new rh("#c5d9d4","#343a2b",2.2));const An=new oh("#ffe0a5",3);An.position.set(-14,24,7);An.castShadow=!0;An.shadow.mapSize.set(2048,2048);Object.assign(An.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:80});An.shadow.normalBias=.035;An.shadow.bias=-1e-4;Et.add(An);const Wn=new ae(new Or(.25,.29,32),new ar({color:"#e0d49b",transparent:!0,opacity:.8,side:Kt}));Wn.rotation.x=-Math.PI/2;Wn.visible=!1;Et.add(Wn);const ru=120,su=new Ft,As=new Float32Array(ru*3);for(let i=0;i<ru;i++)As[i*3]=(Math.random()-.5)*26,As[i*3+1]=Math.random()*6+.3,As[i*3+2]=(Math.random()-.5)*24;su.setAttribute("position",new jt(As,3));const Ko=new eh(su,new Xc({color:"#e3d7a7",size:.035,transparent:!0,opacity:.5}));Et.add(Ko);const Ye=new o0,zr=new l0(Et);let ti="hands",ji=0;const Lr=To.map(i=>i.id),_t=new G0(Ye,{onSelectTool:(i,e)=>{Zo(i),e&&(ji=Lr.indexOf(e),ge("active-seed-label").textContent=an[e]?.name||e)}}),Tt=tu(Ye.guestId,Ye.nickname);Tt.position.set(0,0,3);Et.add(Tt);const yt=c0();yt.position.set(.8,0,4);Et.add(yt);const bo="afterlight-save";function X0(){try{const i=localStorage.getItem(bo),e=i?JSON.parse(i):{};return _c(e.exploration)}catch{return _c({})}}function au(i){try{const e=localStorage.getItem(bo),t=e?JSON.parse(e):{};t.exploration=i,localStorage.setItem(bo,JSON.stringify(t))}catch{}}let gn=X0();const Ur=d0(),Nr=v0();Et.add(Ur.group);Et.add(Nr.group);const br=new Map,_s={market:"M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24",garden:"M24 24H130V96H24Z M38 36H116V84H38Z M65 24V96",court:"M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24",canal:"M24 24H130V96H24Z M24 60H130 M70 24V96 M84 24V96",station:"M24 24H130V96H24Z M24 40H130 M24 75H130 M65 40V75",aqueduct:"M24 24H130V96H24Z M24 35H130 M45 24V96 M80 24V96 M105 24V96",caldera:"M24 24H130V96H24Z M50 35H100V80H50Z M75 35V80 M24 60H50 M100 60H130",understory:"M24 24H130V96H24Z M35 40H65V75H35Z M90 40H120V75H90Z M65 60H90",saltworks:"M24 24H130V96H24Z M35 30H115V55H35Z M35 65H115V90H35Z M75 24V96",rooftops:"M24 24H130V96H24Z M40 45H110 M75 24V96 M40 30L75 60L110 30 M40 90L75 60L110 90",mangrove:"M24 24H130V96H24Z M24 50Q75 20 130 50 M24 70Q75 100 130 70 M75 35V85",trestle:"M24 24H130V96H24Z M24 35H130 M24 85H130 M35 35L55 85 M55 35L75 85 M75 35L95 85 M95 35L115 85",foundry:"M24 24H130V96H24Z M40 35H70V65H40Z M85 35H115V65H85Z M24 75H130","frost-spire":"M24 24H130V96H24Z M75 25L115 60L75 95L35 60Z M75 25V95 M35 60H115",delta:"M24 24H130V96H24Z M24 45C55 40 85 75 130 55 M24 75C60 70 90 90 130 85 M70 24V96",archives:"M24 24H130V96H24Z M35 35H115 M35 50H115 M35 65H115 M35 80H115 M75 24V96","kiln-terrace":"M24 24H130V96H24Z M45 35H105V85H45Z M75 45A15 15 0 1 0 75 75A15 15 0 1 0 75 45 M24 60H45 M105 60H130"};function q0(i){if(br.has(i))return br.get(i);const e=Ht.find(p=>p.id===i);if(!e)return null;const t=gn.completed.includes(i),n=O0(e,t),r=Ht.findIndex(p=>p.id===i),s=Ht[(r-1+Ht.length)%Ht.length],o=Ht[(r+1)%Ht.length];n.items.push({type:"district_gate",x:-10.7,z:0,targetDistrict:s.id,title:`Gate to ${s.name}`,sub:`Westbound: ${s.district}`}),n.items.push({type:"district_gate",x:10.7,z:0,targetDistrict:o.id,title:`Gate to ${o.name}`,sub:`Eastbound: ${o.district}`}),n.items.push({type:"market_gate",x:0,z:8.8,targetDistrict:"market",title:"Return to Market Court",sub:"Trade produce & visit your garden"});const a=new on(1,1,1),l=new it({color:"#c5b478",emissive:"#857545",emissiveIntensity:.6}),c=new it({color:"#2b3d3e",roughness:.6});for(const p of[-10.7,10.7]){const f=new ae(a,c);f.position.set(p,2.5,0),f.scale.set(.6,5,2.4),n.group.add(f);const g=new ae(a,l);g.position.set(p,1.8,0),g.scale.set(.1,3.4,1.8),n.group.add(g)}const u=new ae(a,c);u.position.set(0,2.5,8.8),u.scale.set(2.4,5,.6),n.group.add(u);const d=new ae(a,l);return d.position.set(0,1.8,8.8),d.scale.set(1.8,3.4,.1),n.group.add(d),Et.add(n.group),br.set(i,n),wo.has(i)&&n.setNodeStates?.(wo.get(i)),n}let ct=null,Tn=null,Xn=!1,zn=0,vc=null;const kt=new Set,xc=new uh,Y0=new Qn(new U(0,1,0),0),Pa=new U;function Ut(i,e,t="FIELD NOTE"){const n=ge("toast-title"),r=ge("toast-body"),s=ge("toast-type"),o=ge("toast");n&&(n.textContent=i),r&&(r.textContent=e),s&&(s.textContent=t),o&&(o.style.opacity="1"),clearTimeout(vc),vc=setTimeout(()=>{o&&(o.style.opacity="0")},5e3)}let Dt=vn.MARKET,fn=Ur,qn=ws("market"),Ns=null;const wo=new Map;let _i={mill:{status:"broken",required:{...nu},contributed:{copper:0,timber:0,glass:0},restoredAt:null}};function Mi(i){Dt=i;const e=vn.isGarden(i),t=i===vn.MARKET,n=Ht.find(r=>r.id===i);if(Ur.group.visible=t,Nr.group.visible=e,br.forEach((r,s)=>{r.group.visible=s===i}),n){fn=q0(i),qn=ws(i),gn.visited.includes(i)||gn.visited.push(i),gn.current=i,au(gn),Et.fog.color.set(n.color),Et.background.set(n.color).multiplyScalar(.45),An.color.set(n.sun);const s=n.spawn||[-9,0];Tt.position.set(s[0],0,s[1]),yt.position.set(s[0]+.8,0,s[1]+1),ge("location-title").textContent=n.name,ge("district-tag").textContent=n.district,ge("map-label").textContent="• "+n.subtitle,ge("map-path").setAttribute("d",_s[i]||_s.court),Ut(n.name,n.description,"ARRIVED IN DISTRICT")}else e?(fn=Nr,qn=ws(i),Tt.position.set(-9.5,0,0),yt.position.set(-8.7,0,1),Et.fog.color.set("#54645d"),Et.background.set("#222d2a"),An.color.set("#ffe0a5"),ge("location-title").textContent="Your Market Garden",ge("district-tag").textContent="CULTIVATION DISTRICT / 02",ge("map-label").textContent="• MARKET GARDEN 02",ge("map-path").setAttribute("d",_s.garden),Ut("Your Garden Plot","Tend your garden beds and harvest fresh crops.")):(fn=Ur,qn=ws("market"),Tt.position.set(0,0,3),yt.position.set(.8,0,4),Et.fog.color.set("#54645d"),Et.background.set("#222d2a"),An.color.set("#ffe0a5"),ge("location-title").textContent="The Market Court",ge("district-tag").textContent="MARKET SOCIAL DISTRICT / 01",ge("map-label").textContent="• MARKET COURT 01",ge("map-path").setAttribute("d",_s.market),Ut("The Market Court","Trade produce, buy seeds, and fulfill contracts."));Tn=null,Wn.visible=!1,zr.clear(),Ye.joinRoom(i)}const $0=new URLSearchParams(window.location.search).get("room");Mi($0==="garden"?vn.gardenFor(Ye.guestId):vn.MARKET);Ye.on(je.WELCOME,i=>{ge("net-indicator").textContent="● ONLINE",ge("net-indicator").style.color="#85e0a3",i.player&&(_t.updatePlayerHUD(i.player),Tt.userData.updateNickname(i.player.nickname)),i.weather&&cu(i.weather),i.prices&&_t.updateMarketView(i.prices),i.orderBook&&_t.updateMarketView(null,i.orderBook),i.contracts&&_t.updateContractsView(i.contracts)});Ye.on(je.PRESENCE_JOIN,i=>{i.player&&i.player.id!==Ye.guestId&&(zr.setPlayer(i.player),Ut("Gardener Arrived",`${i.player.nickname} entered the area.`))});Ye.on(je.PRESENCE_LEAVE,i=>{i.playerId&&zr.removePlayer(i.playerId)});Ye.on(je.PRESENCE_UPDATE,i=>{if(Array.isArray(i.players))for(const e of i.players)e.id!==Ye.guestId&&zr.setPlayer(e)});Ye.on(je.GARDEN_STATE,i=>{Ns=i.beds,Nr.setFixtures?.(i.fixtures||[]),Nr.update(0,i.beds)});Ye.on(je.INVENTORY_STATE,i=>{i.player&&(_t.updatePlayerHUD(i.player),_t.updateInventoryView(i.player),_t.updateMarketView(),_t.updateMachineShopView())});Ye.on(je.MARKET_UPDATE,i=>{i.prices&&_t.updateMarketView(i.prices),i.orderBook&&_t.updateMarketView(null,i.orderBook)});Ye.on(je.CONTRACT_UPDATE,i=>{i.contracts&&_t.updateContractsView(i.contracts)});Ye.on(je.NODE_STATE,i=>{!i.roomId||!Array.isArray(i.nodes)||(wo.set(i.roomId,i.nodes),br.get(i.roomId)?.setNodeStates?.(i.nodes))});Ye.on(je.MACHINE_UPDATE,i=>{if(!i.machines?.mill)return;const e=_i?.mill?.status;_i=i.machines,_t.updateMachineShopView(_i),Ur.setMachineState?.(_i),lu(),e==="broken"&&_i.mill.status==="restored"&&(ks([523,659,784,1046]),Ut("The Great Mill Restored","The sails turn above the court. Wheat becomes flour for everyone.","RESTORATION COMPLETE"))});Ye.on(je.TRADE_FILLED,i=>{const e=i.trade;ks([523,659,784]),Ut("Order Filled!",`Traded ${e.quantity}x ${e.cropId} @ ${e.price} ⛁`)});Ye.on(je.WEATHER_UPDATE,i=>{cu(i.weather)});Ye.on(je.ACTION_RESULT,i=>{i.success?(ks([440,554]),Ut(i.title||"Garden",i.message)):i.message&&Ut(i.title||"Notice",i.message)});let ou=null;function lu(){const i=ge("mill-panel");if(!i)return;const e=Dt===vn.MARKET;if(i.style.display=e?"block":"none",ou=Dt,!e)return;const t=_i?.mill,n=ge("mill-status-tag"),r=ge("mill-progress-lines");if(!t)return;if(t.status==="restored"){n.textContent="RESTORED",n.className="mill-tag restored",r.innerHTML='<div class="mill-line">✦ The sails are turning. It grinds wheat into flour for everyone.</div>';return}n.textContent="BROKEN",n.className="mill-tag broken";let s=0,o=0,a="";for(const[l,c]of Object.entries(t.required||{})){const u=Math.min(t.contributed?.[l]||0,c);s+=u,o+=c,a+=`<div class="mill-line"><span>${l}</span><b>${u}/${c}</b></div>`}a=`<div class="mill-line mill-total"><span>restoration</span><b>${s}/${o}</b></div>`+a,r.innerHTML=a}Ye.on(je.EMOTE_BROADCAST,i=>{Ut("Emote",`${i.nickname} waves warmly! 👋`),ks([659,880])});function cu(i){const e=i==="rain"?"☔":i==="drizzle"?"☂":"☼",t=i==="rain"?"HEAVY RAIN":i==="drizzle"?"RAINY MIST":"CLEAR AFTER RAIN";ge("weather-icon").textContent=e,ge("weather-text").textContent=t,Et.fog.density=i==="rain"?.026:i==="drizzle"?.022:.016}Ye.connect();let bt=null,yr=!0;function ks(i=[440,554,660]){!bt||yr||i.forEach((e,t)=>{const n=bt.createOscillator(),r=bt.createGain();n.type="sine",n.frequency.value=e,r.gain.setValueAtTime(0,bt.currentTime+t*.08),r.gain.linearRampToValueAtTime(.04,bt.currentTime+.02+t*.08),r.gain.exponentialRampToValueAtTime(.001,bt.currentTime+.8+t*.08),n.connect(r).connect(bt.destination),n.start(bt.currentTime+t*.08),n.stop(bt.currentTime+.9+t*.08)})}ge("sound").onclick=async()=>{if(yr=!yr,!bt){bt=new AudioContext;const i=bt.createBuffer(1,bt.sampleRate*2,bt.sampleRate),e=i.getChannelData(0);for(let r=0;r<e.length;r++)e[r]=(Math.random()*2-1)*.04;const t=bt.createBufferSource();t.buffer=i,t.loop=!0;const n=bt.createBiquadFilter();n.type="lowpass",n.frequency.value=320,t.connect(n).connect(bt.destination),t.start()}await(yr?bt.suspend():bt.resume()),ge("sound").textContent=yr?"♫  Sound off":"♫  Sound on"};function Zo(i){ti=i,document.querySelectorAll(".tool-btn").forEach(t=>{t.classList.toggle("active",t.dataset.tool===i)}),Tt.userData.setWateringCan(i==="water");const e={hands:"Tool: Hands & Inspect · Read crop stats",hoe:"Tool: Hoe · Till uncultivated beds",seed:`Tool: Seeds (${an[Lr[ji]].name}) · Plant in tilled beds`,water:"Tool: Watering Can · Replenish soil moisture",harvest:"Tool: Harvest Shears · Collect mature produce",sprinkler:"Tool: Sprinkler Kit · Press E on a bed to place (waters it + neighbors)"};ge("hud-tool-hint").textContent=e[i]||i}document.querySelectorAll(".tool-btn").forEach(i=>{i.onclick=()=>{const e=i.dataset.tool;e==="seed"&&ti==="seed"&&(ji=(ji+1)%Lr.length,ge("active-seed-label").textContent=an[Lr[ji]].name),Zo(e)}});function uu(){if(!Xn){if(!ct){Ut("No Target Nearby","Approach a garden bed, market stall, or gateway to interact.");return}if(ct.type==="garden_gate"){Mi(vn.gardenFor(Ye.guestId));return}if(ct.type==="market_gate"){Mi(vn.MARKET);return}if(ct.type==="district_gate"){Mi(ct.targetDistrict);return}if(ct.type==="landmark"){const i=Ht.find(e=>e.id===Dt);i&&(gn.completed.includes(Dt)?Ut(i.done,"This sector has already been restored.","RESTORATION ACTIVE"):(gn.completed.push(Dt),au(gn),fn.update?.(zn,!0),Ut(i.done,i.message,"RESTORATION COMPLETE")));return}if(ct.type==="field-note"){Ut(ct.sub,ct.body,"FIELD NOTE");return}if(ct.type==="market_board"){_t.openMarket();return}if(ct.type==="seed_vendor"){_t.openSeedVendor();return}if(ct.type==="contracts_board"){_t.openContracts();return}if(ct.type==="material_node"){Ye.send(je.NODE_HARVEST,{actionId:`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,nodeId:ct.nodeId});return}if(ct.type==="mill"){_i?.mill?.status==="restored"?Ye.send(je.MACHINE_MILL,{actionId:`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,quantity:1}):_t.openMachineShop();return}if(ct.type==="machine_bench"){_t.openMachineShop();return}if(ct.type==="bed"){const i=ct.bedIndex,e=Ns?Ns[i]:null;if(ti==="hoe"){Ye.sendGardenAction("till",i);return}if(ti==="seed"){const t=Lr[ji];Ye.sendGardenAction("plant",i,t);return}if(ti==="water"){Ye.sendGardenAction("water",i);return}if(ti==="harvest"){Ye.sendGardenAction("harvest",i);return}if(ti==="sprinkler"){Ye.sendGardenAction("place_sprinkler",i);return}if(!e||e.stage===Bn.EMPTY)Ut(`Bed #${i+1}`,"Unprepared soil. Select your Hoe (2) to till.");else if(e.stage===Bn.PREPARED)Ut(`Bed #${i+1}`,"Prepared soil. Select Seeds (3) to sow.");else{const t=an[e.cropId],n=["Empty","Prepared","Seed","Sprout","Juvenile","Mature","Harvestable"];Ut(`${t?.name||"Crop"} (Bed #${i+1})`,`Stage: ${n[e.stage]||"Growing"} · Moisture: ${Math.round((e.moisture||0)*100)}% · Health: ${Math.round((e.health||1)*100)}%`)}}}}ge("interact").onclick=uu;ge("btn-inventory").onclick=()=>_t.openInventory();ge("btn-market").onclick=()=>_t.openMarket();function du(){Xn=!0,kt.clear(),K0(),ge("district-dialog").showModal()}function wr(){Xn=!1,ge("district-dialog").close()}function K0(){const i=ge("district-list");i.innerHTML="";const e=document.createElement("button");e.className="district-choice"+(Dt==="market"?" active":""),e.innerHTML=`
    <div>
      <span class="micro">SOCIAL TRADING HUB</span>
      <strong>The Market Court</strong>
    </div>
    <span class="desc">Exchange harvests, buy seeds, and fulfill town contracts.</span>
    <span class="status-badge ${Dt==="market"?"current":"visited"}">${Dt==="market"?"CURRENT":"CIVIC HUB"}</span>
  `,e.onclick=()=>{wr(),Mi("market")},i.appendChild(e);const t=vn.gardenFor(Ye.guestId),n=document.createElement("button");n.className="district-choice"+(Dt===t?" active":""),n.innerHTML=`
    <div>
      <span class="micro">CULTIVATION PLOT</span>
      <strong>Your Market Garden</strong>
    </div>
    <span class="desc">Till soil, sow crops, water, and harvest fresh produce.</span>
    <span class="status-badge ${Dt===t?"current":"visited"}">${Dt===t?"CURRENT":"PERSONAL PLOT"}</span>
  `,n.onclick=()=>{wr(),Mi(t)},i.appendChild(n),Ht.forEach(r=>{const s=Dt===r.id,o=gn.completed.includes(r.id),a=gn.visited.includes(r.id),l=document.createElement("button");l.className="district-choice"+(s?" active":"");let c="unexplored",u="UNEXPLORED";s?(c="current",u="CURRENT"):o?(c="restored",u="✦ RESTORED"):a&&(c="visited",u="VISITED"),l.innerHTML=`
      <div>
        <span class="micro">${r.district}</span>
        <strong>${r.name}</strong>
      </div>
      <span class="desc">${r.description}</span>
      <span class="status-badge ${c}">${u}</span>
    `,l.onclick=()=>{wr(),Mi(r.id)},i.appendChild(l)})}ge("btn-travel").onclick=du;ge("close-districts").onclick=wr;ge("district-dialog").addEventListener("cancel",i=>{i.preventDefault(),wr()});ge("btn-emote").onclick=()=>Ye.sendEmote("wave");ge("btn-edit-nick").onclick=()=>_t.openProfile();function Hs(){Xn=!Xn,kt.clear(),Xn?ge("settings-dialog").showModal():ge("settings-dialog").close()}ge("settings").onclick=Hs;ge("resume").onclick=Hs;ge("settings-dialog").addEventListener("cancel",i=>{i.preventDefault(),Hs()});ge("camera").onclick=()=>{Yi=(Yi+1)%3};ge("quality").onchange=()=>{xn.setPixelRatio(Math.min(devicePixelRatio,Number(ge("quality").value))),Vs()};ge("atmosphere").onchange=()=>{Ko.visible=ge("atmosphere").checked};window.addEventListener("keydown",i=>{if(!(i.target.matches("input,select,textarea")&&i.code!=="Escape")){if(i.code==="KeyT"){du();return}if(["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6"].includes(i.code)){Zo({Digit1:"hands",Digit2:"hoe",Digit3:"seed",Digit4:"water",Digit5:"harvest",Digit6:"sprinkler"}[i.code]);return}["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(i.code)&&i.preventDefault(),kt.add(i.code),!i.repeat&&(i.code==="KeyE"&&uu(),i.code==="KeyI"&&_t.openInventory(),i.code==="KeyM"&&_t.openMarket(),i.code==="KeyV"&&Ye.sendEmote("wave"),i.code==="KeyC"&&ge("camera").click(),i.code==="Escape"&&!Xn&&Hs())}});window.addEventListener("keyup",i=>kt.delete(i.code));window.addEventListener("blur",()=>kt.clear());xn.domElement.addEventListener("pointerdown",i=>{if(!Xn&&(xc.setFromCamera(new we(i.clientX/innerWidth*2-1,-(i.clientY/innerHeight)*2+1),dn),xc.ray.intersectPlane(Y0,Pa))){const e=B0(qn,Pa.x,Pa.z);Tn=new U(e.x,0,e.z),Wn.position.set(Tn.x,.24,Tn.z),Wn.visible=!0}});xn.domElement.addEventListener("wheel",i=>{i.preventDefault(),$i=Md.clamp($i+i.deltaY*.015,18,34),Vs()},{passive:!1});function Z0(i,e,t,n){const r=i.position.x,s=i.position.z;Us(qn,fn.obstacles,r+e,s)&&(i.position.x+=e),Us(qn,fn.obstacles,i.position.x,s+t)&&(i.position.z+=t);const o=Math.hypot(i.position.x-r,i.position.z-s)>1e-4;return o?(i.rotation.y=Math.atan2(e,t),i.position.y=Math.sin(zn*13)*.025,i.userData.legs.forEach((a,l)=>{a.rotation.x=Math.sin(zn*13+l*Math.PI)*.45})):(i.position.y=0,i.userData.legs.forEach(a=>{a.rotation.x*=.8})),o}function Vs(){const i=innerWidth/innerHeight;dn.left=-$i*i/2,dn.right=$i*i/2,dn.top=$i/2,dn.bottom=-$i/2,dn.near=.1,dn.far=150,dn.updateProjectionMatrix(),xn.setSize(innerWidth,innerHeight),zs.setSize(innerWidth,innerHeight)}window.addEventListener("resize",Vs);Vs();const vs=new U(0,0,0);let Mc=performance.now();function hu(i){requestAnimationFrame(hu);const e=Math.min((i-Mc)/1e3,.04);if(Mc=i,!Xn){zn+=e;let n=0,r=0;(kt.has("KeyW")||kt.has("ArrowUp"))&&r--,(kt.has("KeyS")||kt.has("ArrowDown"))&&r++,(kt.has("KeyA")||kt.has("ArrowLeft"))&&n--,(kt.has("KeyD")||kt.has("ArrowRight"))&&n++;let s=new U(n,0,r);s.lengthSq()>0?(Tn=null,Wn.visible=!1,s.applyAxisAngle(new U(0,1,0),[Math.PI/4,0,-Math.PI/4][Yi])):Tn&&(s.subVectors(Tn,Tt.position),s.y=0,s.length()<.15&&(Tn=null,Wn.visible=!1,s.set(0,0,0))),s.normalize().multiplyScalar(e*(kt.has("ShiftLeft")||kt.has("ShiftRight")?5:2.8));const o=Z0(Tt,s.x,s.z);Tn&&!o&&(Tn=null,Wn.visible=!1),Ye.sendMovement(Tt.position.x,Tt.position.z,Tt.rotation.y,o);const a=new U().subVectors(Tt.position,yt.position);if(a.y=0,a.length()>1.3){a.normalize().multiplyScalar(e*3.5);const d=yt.position.x,p=yt.position.z;Us(qn,fn.obstacles||[],d+a.x,p)&&(yt.position.x+=a.x),Us(qn,fn.obstacles||[],yt.position.x,p+a.z)&&(yt.position.z+=a.z),Math.hypot(yt.position.x-d,yt.position.z-p)>1e-4?(yt.rotation.y=Math.atan2(a.x,a.z),yt.position.y=Math.sin(zn*12)*.025,yt.userData.legs?.forEach((g,_)=>g.rotation.x=Math.sin(zn*12+_*Math.PI)*.45)):(yt.position.y=0,yt.userData.legs?.forEach(g=>g.rotation.x*=.8))}else yt.position.y=0,yt.userData.legs?.forEach(d=>d.rotation.x*=.8);zr.update(e,zn);const l=gn.completed.includes(Dt);fn.update(zn,Ns||l),ct=null;let c=2.4;for(const d of fn.items||[]){const p=Math.hypot(Tt.position.x-d.x,Tt.position.z-d.z);p<c&&(ct=d,c=p)}if(ct)ge("action-title").textContent=ct.title,ge("action-sub").textContent=ct.sub,ge("interact").style.borderColor="#c6b47a99";else{const d=Ht.find(p=>p.id===Dt);d?(ge("action-title").textContent=d.name,ge("action-sub").textContent="Explore sector with Kiln · Press T to travel"):(ge("action-title").textContent=Dt===vn.MARKET?"Market Court":"Your Market Garden",ge("action-sub").textContent=Dt===vn.MARKET?"Explore stalls or travel to outer districts":"Approach beds to till, plant, water, and harvest"),ge("interact").style.borderColor="#9faa9240"}fn.previewCoverage?.(ti==="sprinkler"&&ct?.type==="bed"?ct.bedIndex:null),Dt!==ou&&lu();const u=z0(qn,Tt.position.x,Tt.position.z);ge("map-player").setAttribute("cx",u.cx),ge("map-player").setAttribute("cy",u.cy),Ko.rotation.y=Math.sin(zn*.03)*.04}const t=[[21,25,26],[0,29,31],[-23,27,25]];vs.lerp(new U(Tt.position.x*.14,.1,Tt.position.z*.14),.025),dn.position.set(vs.x+t[Yi][0],t[Yi][1],vs.z+t[Yi][2]),dn.lookAt(vs),zs.render()}requestAnimationFrame(hu);ge("loading").style.opacity="0";setTimeout(()=>ge("loading").remove(),800);
