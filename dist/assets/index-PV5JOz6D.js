(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=t(s);fetch(s.href,r)}})();const Ho="180",Hd=0,_l=1,zd=2,kc=1,Hc=2,Hn=3,ri=0,qt=1,Jt=2,Gn=0,Ji=1,Ga=2,vl=3,xl=4,Vd=5,_i=100,Gd=101,Wd=102,Xd=103,qd=104,Yd=200,$d=201,Kd=202,Zd=203,Wa=204,Xa=205,jd=206,Jd=207,Qd=208,eu=209,tu=210,nu=211,iu=212,su=213,ru=214,qa=0,Ya=1,$a=2,ts=3,Ka=4,Za=5,ja=6,Ja=7,zc=0,au=1,ou=2,si=0,lu=1,cu=2,du=3,Vc=4,uu=5,hu=6,fu=7,Gc=300,ns=301,is=302,Qa=303,eo=304,Gr=306,to=1e3,yi=1001,no=1002,en=1003,pu=1004,Ys=1005,xn=1006,Jr=1007,Si=1008,Ln=1009,Wc=1010,Xc=1011,Is=1012,zo=1013,bi=1014,Cn=1015,Wn=1016,Vo=1017,Go=1018,Ls=1020,qc=35902,Yc=35899,$c=1021,Kc=1022,Mn=1023,Ds=1026,Us=1027,Wo=1028,Xo=1029,Zc=1030,qo=1031,Yo=1033,wr=33776,Ar=33777,Cr=33778,Rr=33779,io=35840,so=35841,ro=35842,ao=35843,oo=36196,lo=37492,co=37496,uo=37808,ho=37809,fo=37810,po=37811,mo=37812,go=37813,_o=37814,vo=37815,xo=37816,Mo=37817,yo=37818,So=37819,Eo=37820,bo=37821,To=36492,wo=36494,Ao=36495,Co=36283,Ro=36284,Po=36285,Io=36286,mu=3200,gu=3201,jc=0,_u=1,ni="",an="srgb",ss="srgb-linear",Nr="linear",st="srgb",Ci=7680,Ml=519,vu=512,xu=513,Mu=514,Jc=515,yu=516,Su=517,Eu=518,bu=519,Lo=35044,yl="300 es",Rn=2e3,Fr=2001;class os{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const s=n[e];if(s!==void 0){const r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,e);e.target=null}}}const Ut=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Sl=1234567;const As=Math.PI/180,Ns=180/Math.PI;function Xn(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ut[i&255]+Ut[i>>8&255]+Ut[i>>16&255]+Ut[i>>24&255]+"-"+Ut[e&255]+Ut[e>>8&255]+"-"+Ut[e>>16&15|64]+Ut[e>>24&255]+"-"+Ut[t&63|128]+Ut[t>>8&255]+"-"+Ut[t>>16&255]+Ut[t>>24&255]+Ut[n&255]+Ut[n>>8&255]+Ut[n>>16&255]+Ut[n>>24&255]).toLowerCase()}function Ye(i,e,t){return Math.max(e,Math.min(t,i))}function $o(i,e){return(i%e+e)%e}function Tu(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function wu(i,e,t){return i!==e?(t-i)/(e-i):0}function Cs(i,e,t){return(1-t)*i+t*e}function Au(i,e,t,n){return Cs(i,e,1-Math.exp(-t*n))}function Cu(i,e=1){return e-Math.abs($o(i,e*2)-e)}function Ru(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Pu(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Iu(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Lu(i,e){return i+Math.random()*(e-i)}function Du(i){return i*(.5-Math.random())}function Uu(i){i!==void 0&&(Sl=i);let e=Sl+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Nu(i){return i*As}function Fu(i){return i*Ns}function Ou(i){return(i&i-1)===0&&i!==0}function Bu(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function ku(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Hu(i,e,t,n,s){const r=Math.cos,a=Math.sin,o=r(t/2),l=a(t/2),c=r((e+n)/2),d=a((e+n)/2),u=r((e-n)/2),f=a((e-n)/2),p=r((n-e)/2),g=a((n-e)/2);switch(s){case"XYX":i.set(o*d,l*u,l*f,o*c);break;case"YZY":i.set(l*f,o*d,l*u,o*c);break;case"ZXZ":i.set(l*u,l*f,o*d,o*c);break;case"XZX":i.set(o*d,l*g,l*p,o*c);break;case"YXY":i.set(l*p,o*d,l*g,o*c);break;case"ZYZ":i.set(l*g,l*p,o*d,o*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function vn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function tt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const zu={DEG2RAD:As,RAD2DEG:Ns,generateUUID:Xn,clamp:Ye,euclideanModulo:$o,mapLinear:Tu,inverseLerp:wu,lerp:Cs,damp:Au,pingpong:Cu,smoothstep:Ru,smootherstep:Pu,randInt:Iu,randFloat:Lu,randFloatSpread:Du,seededRandom:Uu,degToRad:Nu,radToDeg:Fu,isPowerOfTwo:Ou,ceilPowerOfTwo:Bu,floorPowerOfTwo:ku,setQuaternionFromProperEuler:Hu,normalize:tt,denormalize:vn};class we{constructor(e=0,t=0){we.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ye(this.x,e.x,t.x),this.y=Ye(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ye(this.x,e,t),this.y=Ye(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ye(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ye(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*n-a*s+e.x,this.y=r*s+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Hs{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,a,o){let l=n[s+0],c=n[s+1],d=n[s+2],u=n[s+3];const f=r[a+0],p=r[a+1],g=r[a+2],x=r[a+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=d,e[t+3]=u;return}if(o===1){e[t+0]=f,e[t+1]=p,e[t+2]=g,e[t+3]=x;return}if(u!==x||l!==f||c!==p||d!==g){let m=1-o;const h=l*f+c*p+d*g+u*x,E=h>=0?1:-1,b=1-h*h;if(b>Number.EPSILON){const R=Math.sqrt(b),w=Math.atan2(R,h*E);m=Math.sin(m*w)/R,o=Math.sin(o*w)/R}const S=o*E;if(l=l*m+f*S,c=c*m+p*S,d=d*m+g*S,u=u*m+x*S,m===1-o){const R=1/Math.sqrt(l*l+c*c+d*d+u*u);l*=R,c*=R,d*=R,u*=R}}e[t]=l,e[t+1]=c,e[t+2]=d,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,s,r,a){const o=n[s],l=n[s+1],c=n[s+2],d=n[s+3],u=r[a],f=r[a+1],p=r[a+2],g=r[a+3];return e[t]=o*g+d*u+l*p-c*f,e[t+1]=l*g+d*f+c*u-o*p,e[t+2]=c*g+d*p+o*f-l*u,e[t+3]=d*g-o*u-l*f-c*p,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,s=e._y,r=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(n/2),d=o(s/2),u=o(r/2),f=l(n/2),p=l(s/2),g=l(r/2);switch(a){case"XYZ":this._x=f*d*u+c*p*g,this._y=c*p*u-f*d*g,this._z=c*d*g+f*p*u,this._w=c*d*u-f*p*g;break;case"YXZ":this._x=f*d*u+c*p*g,this._y=c*p*u-f*d*g,this._z=c*d*g-f*p*u,this._w=c*d*u+f*p*g;break;case"ZXY":this._x=f*d*u-c*p*g,this._y=c*p*u+f*d*g,this._z=c*d*g+f*p*u,this._w=c*d*u-f*p*g;break;case"ZYX":this._x=f*d*u-c*p*g,this._y=c*p*u+f*d*g,this._z=c*d*g-f*p*u,this._w=c*d*u+f*p*g;break;case"YZX":this._x=f*d*u+c*p*g,this._y=c*p*u+f*d*g,this._z=c*d*g-f*p*u,this._w=c*d*u-f*p*g;break;case"XZY":this._x=f*d*u-c*p*g,this._y=c*p*u-f*d*g,this._z=c*d*g+f*p*u,this._w=c*d*u+f*p*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],s=t[4],r=t[8],a=t[1],o=t[5],l=t[9],c=t[2],d=t[6],u=t[10],f=n+o+u;if(f>0){const p=.5/Math.sqrt(f+1);this._w=.25/p,this._x=(d-l)*p,this._y=(r-c)*p,this._z=(a-s)*p}else if(n>o&&n>u){const p=2*Math.sqrt(1+n-o-u);this._w=(d-l)/p,this._x=.25*p,this._y=(s+a)/p,this._z=(r+c)/p}else if(o>u){const p=2*Math.sqrt(1+o-n-u);this._w=(r-c)/p,this._x=(s+a)/p,this._y=.25*p,this._z=(l+d)/p}else{const p=2*Math.sqrt(1+u-n-o);this._w=(a-s)/p,this._x=(r+c)/p,this._y=(l+d)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ye(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,s=e._y,r=e._z,a=e._w,o=t._x,l=t._y,c=t._z,d=t._w;return this._x=n*d+a*o+s*c-r*l,this._y=s*d+a*l+r*o-n*c,this._z=r*d+a*c+n*l-s*o,this._w=a*d-n*o-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,s=this._y,r=this._z,a=this._w;let o=a*e._w+n*e._x+s*e._y+r*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=s,this._z=r,this;const l=1-o*o;if(l<=Number.EPSILON){const p=1-t;return this._w=p*a+t*this._w,this._x=p*n+t*this._x,this._y=p*s+t*this._y,this._z=p*r+t*this._z,this.normalize(),this}const c=Math.sqrt(l),d=Math.atan2(c,o),u=Math.sin((1-t)*d)/c,f=Math.sin(t*d)/c;return this._w=a*u+this._w*f,this._x=n*u+this._x*f,this._y=s*u+this._y*f,this._z=r*u+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class D{constructor(e=0,t=0,n=0){D.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(El.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(El.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=e.elements,a=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(e){const t=this.x,n=this.y,s=this.z,r=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*s-o*n),d=2*(o*t-r*s),u=2*(r*n-a*t);return this.x=t+l*c+a*u-o*d,this.y=n+l*d+o*c-r*u,this.z=s+l*u+r*d-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ye(this.x,e.x,t.x),this.y=Ye(this.y,e.y,t.y),this.z=Ye(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ye(this.x,e,t),this.y=Ye(this.y,e,t),this.z=Ye(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ye(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,s=e.y,r=e.z,a=t.x,o=t.y,l=t.z;return this.x=s*l-r*o,this.y=r*a-n*l,this.z=n*o-s*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Qr.copy(this).projectOnVector(e),this.sub(Qr)}reflect(e){return this.sub(Qr.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ye(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Qr=new D,El=new Hs;class ze{constructor(e,t,n,s,r,a,o,l,c){ze.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,l,c)}set(e,t,n,s,r,a,o,l,c){const d=this.elements;return d[0]=e,d[1]=s,d[2]=o,d[3]=t,d[4]=r,d[5]=l,d[6]=n,d[7]=a,d[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],d=n[4],u=n[7],f=n[2],p=n[5],g=n[8],x=s[0],m=s[3],h=s[6],E=s[1],b=s[4],S=s[7],R=s[2],w=s[5],P=s[8];return r[0]=a*x+o*E+l*R,r[3]=a*m+o*b+l*w,r[6]=a*h+o*S+l*P,r[1]=c*x+d*E+u*R,r[4]=c*m+d*b+u*w,r[7]=c*h+d*S+u*P,r[2]=f*x+p*E+g*R,r[5]=f*m+p*b+g*w,r[8]=f*h+p*S+g*P,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],d=e[8];return t*a*d-t*o*c-n*r*d+n*o*l+s*r*c-s*a*l}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],d=e[8],u=d*a-o*c,f=o*l-d*r,p=c*r-a*l,g=t*u+n*f+s*p;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/g;return e[0]=u*x,e[1]=(s*c-d*n)*x,e[2]=(o*n-s*a)*x,e[3]=f*x,e[4]=(d*t-s*l)*x,e[5]=(s*r-o*t)*x,e[6]=p*x,e[7]=(n*l-c*t)*x,e[8]=(a*t-n*r)*x,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,a,o){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+e,-s*c,s*l,-s*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(ea.makeScale(e,t)),this}rotate(e){return this.premultiply(ea.makeRotation(-e)),this}translate(e,t){return this.premultiply(ea.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const ea=new ze;function Qc(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Or(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Vu(){const i=Or("canvas");return i.style.display="block",i}const bl={};function Fs(i){i in bl||(bl[i]=!0,console.warn(i))}function Gu(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}const Tl=new ze().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),wl=new ze().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Wu(){const i={enabled:!0,workingColorSpace:ss,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===st&&(s.r=qn(s.r),s.g=qn(s.g),s.b=qn(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===st&&(s.r=Qi(s.r),s.g=Qi(s.g),s.b=Qi(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===ni?Nr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Fs("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Fs("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[ss]:{primaries:e,whitePoint:n,transfer:Nr,toXYZ:Tl,fromXYZ:wl,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:an},outputColorSpaceConfig:{drawingBufferColorSpace:an}},[an]:{primaries:e,whitePoint:n,transfer:st,toXYZ:Tl,fromXYZ:wl,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:an}}}),i}const Ze=Wu();function qn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Qi(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ri;class Xu{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Ri===void 0&&(Ri=Or("canvas")),Ri.width=e.width,Ri.height=e.height;const s=Ri.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=Ri}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Or("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=qn(r[a]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(qn(t[n]/255)*255):t[n]=qn(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let qu=0;class Ko{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:qu++}),this.uuid=Xn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(ta(s[a].image)):r.push(ta(s[a]))}else r=ta(s);n.url=r}return t||(e.images[this.uuid]=n),n}}function ta(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Xu.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Yu=0;const na=new D;class Ot extends os{constructor(e=Ot.DEFAULT_IMAGE,t=Ot.DEFAULT_MAPPING,n=yi,s=yi,r=xn,a=Si,o=Mn,l=Ln,c=Ot.DEFAULT_ANISOTROPY,d=ni){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Yu++}),this.uuid=Xn(),this.name="",this.source=new Ko(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new we(0,0),this.repeat=new we(1,1),this.center=new we(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new ze,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=d,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(na).x}get height(){return this.source.getSize(na).y}get depth(){return this.source.getSize(na).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Gc)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case to:e.x=e.x-Math.floor(e.x);break;case yi:e.x=e.x<0?0:1;break;case no:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case to:e.y=e.y-Math.floor(e.y);break;case yi:e.y=e.y<0?0:1;break;case no:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Ot.DEFAULT_IMAGE=null;Ot.DEFAULT_MAPPING=Gc;Ot.DEFAULT_ANISOTROPY=1;class rt{constructor(e=0,t=0,n=0,s=1){rt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*t+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*t+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*t+a[7]*n+a[11]*s+a[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r;const l=e.elements,c=l[0],d=l[4],u=l[8],f=l[1],p=l[5],g=l[9],x=l[2],m=l[6],h=l[10];if(Math.abs(d-f)<.01&&Math.abs(u-x)<.01&&Math.abs(g-m)<.01){if(Math.abs(d+f)<.1&&Math.abs(u+x)<.1&&Math.abs(g+m)<.1&&Math.abs(c+p+h-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const b=(c+1)/2,S=(p+1)/2,R=(h+1)/2,w=(d+f)/4,P=(u+x)/4,I=(g+m)/4;return b>S&&b>R?b<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(b),s=w/n,r=P/n):S>R?S<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(S),n=w/s,r=I/s):R<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(R),n=P/r,s=I/r),this.set(n,s,r,t),this}let E=Math.sqrt((m-g)*(m-g)+(u-x)*(u-x)+(f-d)*(f-d));return Math.abs(E)<.001&&(E=1),this.x=(m-g)/E,this.y=(u-x)/E,this.z=(f-d)/E,this.w=Math.acos((c+p+h-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ye(this.x,e.x,t.x),this.y=Ye(this.y,e.y,t.y),this.z=Ye(this.z,e.z,t.z),this.w=Ye(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ye(this.x,e,t),this.y=Ye(this.y,e,t),this.z=Ye(this.z,e,t),this.w=Ye(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ye(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class $u extends os{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:xn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new rt(0,0,e,t),this.scissorTest=!1,this.viewport=new rt(0,0,e,t);const s={width:e,height:t,depth:n.depth},r=new Ot(s);this.textures=[];const a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:xn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isArrayTexture=this.textures[s].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const s=Object.assign({},e.textures[t].image);this.textures[t].source=new Ko(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Sn extends $u{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class ed extends Ot{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=en,this.minFilter=en,this.wrapR=yi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Ku extends Ot{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=en,this.minFilter=en,this.wrapR=yi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ti{constructor(e=new D(1/0,1/0,1/0),t=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(pn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(pn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=pn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,pn):pn.fromBufferAttribute(r,a),pn.applyMatrix4(e.matrixWorld),this.expandByPoint(pn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),$s.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),$s.copy(n.boundingBox)),$s.applyMatrix4(e.matrixWorld),this.union($s)}const s=e.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,pn),pn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(hs),Ks.subVectors(this.max,hs),Pi.subVectors(e.a,hs),Ii.subVectors(e.b,hs),Li.subVectors(e.c,hs),Kn.subVectors(Ii,Pi),Zn.subVectors(Li,Ii),ci.subVectors(Pi,Li);let t=[0,-Kn.z,Kn.y,0,-Zn.z,Zn.y,0,-ci.z,ci.y,Kn.z,0,-Kn.x,Zn.z,0,-Zn.x,ci.z,0,-ci.x,-Kn.y,Kn.x,0,-Zn.y,Zn.x,0,-ci.y,ci.x,0];return!ia(t,Pi,Ii,Li,Ks)||(t=[1,0,0,0,1,0,0,0,1],!ia(t,Pi,Ii,Li,Ks))?!1:(Zs.crossVectors(Kn,Zn),t=[Zs.x,Zs.y,Zs.z],ia(t,Pi,Ii,Li,Ks))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,pn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(pn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Nn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Nn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Nn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Nn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Nn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Nn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Nn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Nn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Nn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Nn=[new D,new D,new D,new D,new D,new D,new D,new D],pn=new D,$s=new Ti,Pi=new D,Ii=new D,Li=new D,Kn=new D,Zn=new D,ci=new D,hs=new D,Ks=new D,Zs=new D,di=new D;function ia(i,e,t,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){di.fromArray(i,r);const o=s.x*Math.abs(di.x)+s.y*Math.abs(di.y)+s.z*Math.abs(di.z),l=e.dot(di),c=t.dot(di),d=n.dot(di);if(Math.max(-Math.max(l,c,d),Math.min(l,c,d))>o)return!1}return!0}const Zu=new Ti,fs=new D,sa=new D;class ls{constructor(e=new D,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):Zu.setFromPoints(e).getCenter(n);let s=0;for(let r=0,a=e.length;r<a;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;fs.subVectors(e,this.center);const t=fs.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(fs,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(sa.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(fs.copy(e.center).add(sa)),this.expandByPoint(fs.copy(e.center).sub(sa))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const Fn=new D,ra=new D,js=new D,jn=new D,aa=new D,Js=new D,oa=new D;class Zo{constructor(e=new D,t=new D(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Fn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Fn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Fn.copy(this.origin).addScaledVector(this.direction,t),Fn.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){ra.copy(e).add(t).multiplyScalar(.5),js.copy(t).sub(e).normalize(),jn.copy(this.origin).sub(ra);const r=e.distanceTo(t)*.5,a=-this.direction.dot(js),o=jn.dot(this.direction),l=-jn.dot(js),c=jn.lengthSq(),d=Math.abs(1-a*a);let u,f,p,g;if(d>0)if(u=a*l-o,f=a*o-l,g=r*d,u>=0)if(f>=-g)if(f<=g){const x=1/d;u*=x,f*=x,p=u*(u+a*f+2*o)+f*(a*u+f+2*l)+c}else f=r,u=Math.max(0,-(a*f+o)),p=-u*u+f*(f+2*l)+c;else f=-r,u=Math.max(0,-(a*f+o)),p=-u*u+f*(f+2*l)+c;else f<=-g?(u=Math.max(0,-(-a*r+o)),f=u>0?-r:Math.min(Math.max(-r,-l),r),p=-u*u+f*(f+2*l)+c):f<=g?(u=0,f=Math.min(Math.max(-r,-l),r),p=f*(f+2*l)+c):(u=Math.max(0,-(a*r+o)),f=u>0?r:Math.min(Math.max(-r,-l),r),p=-u*u+f*(f+2*l)+c);else f=a>0?-r:r,u=Math.max(0,-(a*f+o)),p=-u*u+f*(f+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(ra).addScaledVector(js,f),p}intersectSphere(e,t){Fn.subVectors(e.center,this.origin);const n=Fn.dot(this.direction),s=Fn.dot(Fn)-n*n,r=e.radius*e.radius;if(s>r)return null;const a=Math.sqrt(r-s),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,a,o,l;const c=1/this.direction.x,d=1/this.direction.y,u=1/this.direction.z,f=this.origin;return c>=0?(n=(e.min.x-f.x)*c,s=(e.max.x-f.x)*c):(n=(e.max.x-f.x)*c,s=(e.min.x-f.x)*c),d>=0?(r=(e.min.y-f.y)*d,a=(e.max.y-f.y)*d):(r=(e.max.y-f.y)*d,a=(e.min.y-f.y)*d),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),u>=0?(o=(e.min.z-f.z)*u,l=(e.max.z-f.z)*u):(o=(e.max.z-f.z)*u,l=(e.min.z-f.z)*u),n>l||o>s)||((o>n||n!==n)&&(n=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,Fn)!==null}intersectTriangle(e,t,n,s,r){aa.subVectors(t,e),Js.subVectors(n,e),oa.crossVectors(aa,Js);let a=this.direction.dot(oa),o;if(a>0){if(s)return null;o=1}else if(a<0)o=-1,a=-a;else return null;jn.subVectors(this.origin,e);const l=o*this.direction.dot(Js.crossVectors(jn,Js));if(l<0)return null;const c=o*this.direction.dot(aa.cross(jn));if(c<0||l+c>a)return null;const d=-o*jn.dot(oa);return d<0?null:this.at(d/a,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class at{constructor(e,t,n,s,r,a,o,l,c,d,u,f,p,g,x,m){at.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,l,c,d,u,f,p,g,x,m)}set(e,t,n,s,r,a,o,l,c,d,u,f,p,g,x,m){const h=this.elements;return h[0]=e,h[4]=t,h[8]=n,h[12]=s,h[1]=r,h[5]=a,h[9]=o,h[13]=l,h[2]=c,h[6]=d,h[10]=u,h[14]=f,h[3]=p,h[7]=g,h[11]=x,h[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new at().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,s=1/Di.setFromMatrixColumn(e,0).length(),r=1/Di.setFromMatrixColumn(e,1).length(),a=1/Di.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,s=e.y,r=e.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(s),c=Math.sin(s),d=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){const f=a*d,p=a*u,g=o*d,x=o*u;t[0]=l*d,t[4]=-l*u,t[8]=c,t[1]=p+g*c,t[5]=f-x*c,t[9]=-o*l,t[2]=x-f*c,t[6]=g+p*c,t[10]=a*l}else if(e.order==="YXZ"){const f=l*d,p=l*u,g=c*d,x=c*u;t[0]=f+x*o,t[4]=g*o-p,t[8]=a*c,t[1]=a*u,t[5]=a*d,t[9]=-o,t[2]=p*o-g,t[6]=x+f*o,t[10]=a*l}else if(e.order==="ZXY"){const f=l*d,p=l*u,g=c*d,x=c*u;t[0]=f-x*o,t[4]=-a*u,t[8]=g+p*o,t[1]=p+g*o,t[5]=a*d,t[9]=x-f*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){const f=a*d,p=a*u,g=o*d,x=o*u;t[0]=l*d,t[4]=g*c-p,t[8]=f*c+x,t[1]=l*u,t[5]=x*c+f,t[9]=p*c-g,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){const f=a*l,p=a*c,g=o*l,x=o*c;t[0]=l*d,t[4]=x-f*u,t[8]=g*u+p,t[1]=u,t[5]=a*d,t[9]=-o*d,t[2]=-c*d,t[6]=p*u+g,t[10]=f-x*u}else if(e.order==="XZY"){const f=a*l,p=a*c,g=o*l,x=o*c;t[0]=l*d,t[4]=-u,t[8]=c*d,t[1]=f*u+x,t[5]=a*d,t[9]=p*u-g,t[2]=g*u-p,t[6]=o*d,t[10]=x*u+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(ju,e,Ju)}lookAt(e,t,n){const s=this.elements;return Kt.subVectors(e,t),Kt.lengthSq()===0&&(Kt.z=1),Kt.normalize(),Jn.crossVectors(n,Kt),Jn.lengthSq()===0&&(Math.abs(n.z)===1?Kt.x+=1e-4:Kt.z+=1e-4,Kt.normalize(),Jn.crossVectors(n,Kt)),Jn.normalize(),Qs.crossVectors(Kt,Jn),s[0]=Jn.x,s[4]=Qs.x,s[8]=Kt.x,s[1]=Jn.y,s[5]=Qs.y,s[9]=Kt.y,s[2]=Jn.z,s[6]=Qs.z,s[10]=Kt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],d=n[1],u=n[5],f=n[9],p=n[13],g=n[2],x=n[6],m=n[10],h=n[14],E=n[3],b=n[7],S=n[11],R=n[15],w=s[0],P=s[4],I=s[8],_=s[12],v=s[1],A=s[5],N=s[9],X=s[13],O=s[2],k=s[6],U=s[10],q=s[14],V=s[3],J=s[7],ee=s[11],de=s[15];return r[0]=a*w+o*v+l*O+c*V,r[4]=a*P+o*A+l*k+c*J,r[8]=a*I+o*N+l*U+c*ee,r[12]=a*_+o*X+l*q+c*de,r[1]=d*w+u*v+f*O+p*V,r[5]=d*P+u*A+f*k+p*J,r[9]=d*I+u*N+f*U+p*ee,r[13]=d*_+u*X+f*q+p*de,r[2]=g*w+x*v+m*O+h*V,r[6]=g*P+x*A+m*k+h*J,r[10]=g*I+x*N+m*U+h*ee,r[14]=g*_+x*X+m*q+h*de,r[3]=E*w+b*v+S*O+R*V,r[7]=E*P+b*A+S*k+R*J,r[11]=E*I+b*N+S*U+R*ee,r[15]=E*_+b*X+S*q+R*de,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],a=e[1],o=e[5],l=e[9],c=e[13],d=e[2],u=e[6],f=e[10],p=e[14],g=e[3],x=e[7],m=e[11],h=e[15];return g*(+r*l*u-s*c*u-r*o*f+n*c*f+s*o*p-n*l*p)+x*(+t*l*p-t*c*f+r*a*f-s*a*p+s*c*d-r*l*d)+m*(+t*c*u-t*o*p-r*a*u+n*a*p+r*o*d-n*c*d)+h*(-s*o*d-t*l*u+t*o*f+s*a*u-n*a*f+n*l*d)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],d=e[8],u=e[9],f=e[10],p=e[11],g=e[12],x=e[13],m=e[14],h=e[15],E=u*m*c-x*f*c+x*l*p-o*m*p-u*l*h+o*f*h,b=g*f*c-d*m*c-g*l*p+a*m*p+d*l*h-a*f*h,S=d*x*c-g*u*c+g*o*p-a*x*p-d*o*h+a*u*h,R=g*u*l-d*x*l-g*o*f+a*x*f+d*o*m-a*u*m,w=t*E+n*b+s*S+r*R;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const P=1/w;return e[0]=E*P,e[1]=(x*f*r-u*m*r-x*s*p+n*m*p+u*s*h-n*f*h)*P,e[2]=(o*m*r-x*l*r+x*s*c-n*m*c-o*s*h+n*l*h)*P,e[3]=(u*l*r-o*f*r-u*s*c+n*f*c+o*s*p-n*l*p)*P,e[4]=b*P,e[5]=(d*m*r-g*f*r+g*s*p-t*m*p-d*s*h+t*f*h)*P,e[6]=(g*l*r-a*m*r-g*s*c+t*m*c+a*s*h-t*l*h)*P,e[7]=(a*f*r-d*l*r+d*s*c-t*f*c-a*s*p+t*l*p)*P,e[8]=S*P,e[9]=(g*u*r-d*x*r-g*n*p+t*x*p+d*n*h-t*u*h)*P,e[10]=(a*x*r-g*o*r+g*n*c-t*x*c-a*n*h+t*o*h)*P,e[11]=(d*o*r-a*u*r-d*n*c+t*u*c+a*n*p-t*o*p)*P,e[12]=R*P,e[13]=(d*x*s-g*u*s+g*n*f-t*x*f-d*n*m+t*u*m)*P,e[14]=(g*o*s-a*x*s-g*n*l+t*x*l+a*n*m-t*o*m)*P,e[15]=(a*u*s-d*o*s+d*n*l-t*u*l-a*n*f+t*o*f)*P,this}scale(e){const t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),s=Math.sin(t),r=1-n,a=e.x,o=e.y,l=e.z,c=r*a,d=r*o;return this.set(c*a+n,c*o-s*l,c*l+s*o,0,c*o+s*l,d*o+n,d*l-s*a,0,c*l-s*o,d*l+s*a,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,a){return this.set(1,n,r,0,e,1,a,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){const s=this.elements,r=t._x,a=t._y,o=t._z,l=t._w,c=r+r,d=a+a,u=o+o,f=r*c,p=r*d,g=r*u,x=a*d,m=a*u,h=o*u,E=l*c,b=l*d,S=l*u,R=n.x,w=n.y,P=n.z;return s[0]=(1-(x+h))*R,s[1]=(p+S)*R,s[2]=(g-b)*R,s[3]=0,s[4]=(p-S)*w,s[5]=(1-(f+h))*w,s[6]=(m+E)*w,s[7]=0,s[8]=(g+b)*P,s[9]=(m-E)*P,s[10]=(1-(f+x))*P,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){const s=this.elements;let r=Di.set(s[0],s[1],s[2]).length();const a=Di.set(s[4],s[5],s[6]).length(),o=Di.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],mn.copy(this);const c=1/r,d=1/a,u=1/o;return mn.elements[0]*=c,mn.elements[1]*=c,mn.elements[2]*=c,mn.elements[4]*=d,mn.elements[5]*=d,mn.elements[6]*=d,mn.elements[8]*=u,mn.elements[9]*=u,mn.elements[10]*=u,t.setFromRotationMatrix(mn),n.x=r,n.y=a,n.z=o,this}makePerspective(e,t,n,s,r,a,o=Rn,l=!1){const c=this.elements,d=2*r/(t-e),u=2*r/(n-s),f=(t+e)/(t-e),p=(n+s)/(n-s);let g,x;if(l)g=r/(a-r),x=a*r/(a-r);else if(o===Rn)g=-(a+r)/(a-r),x=-2*a*r/(a-r);else if(o===Fr)g=-a/(a-r),x=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=d,c[4]=0,c[8]=f,c[12]=0,c[1]=0,c[5]=u,c[9]=p,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,a,o=Rn,l=!1){const c=this.elements,d=2/(t-e),u=2/(n-s),f=-(t+e)/(t-e),p=-(n+s)/(n-s);let g,x;if(l)g=1/(a-r),x=a/(a-r);else if(o===Rn)g=-2/(a-r),x=-(a+r)/(a-r);else if(o===Fr)g=-1/(a-r),x=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=d,c[4]=0,c[8]=0,c[12]=f,c[1]=0,c[5]=u,c[9]=0,c[13]=p,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Di=new D,mn=new at,ju=new D(0,0,0),Ju=new D(1,1,1),Jn=new D,Qs=new D,Kt=new D,Al=new at,Cl=new Hs;class Dn{constructor(e=0,t=0,n=0,s=Dn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const s=e.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],d=s[9],u=s[2],f=s[6],p=s[10];switch(t){case"XYZ":this._y=Math.asin(Ye(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-d,p),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(f,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ye(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(o,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ye(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-u,p),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ye(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(f,p),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Ye(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-d,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(o,p));break;case"XZY":this._z=Math.asin(-Ye(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(f,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-d,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Al.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Al,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Cl.setFromEuler(this),this.setFromQuaternion(Cl,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Dn.DEFAULT_ORDER="XYZ";class jo{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Qu=0;const Rl=new D,Ui=new Hs,On=new at,er=new D,ps=new D,eh=new D,th=new Hs,Pl=new D(1,0,0),Il=new D(0,1,0),Ll=new D(0,0,1),Dl={type:"added"},nh={type:"removed"},Ni={type:"childadded",child:null},la={type:"childremoved",child:null};class Ct extends os{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Qu++}),this.uuid=Xn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ct.DEFAULT_UP.clone();const e=new D,t=new Dn,n=new Hs,s=new D(1,1,1);function r(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new at},normalMatrix:{value:new ze}}),this.matrix=new at,this.matrixWorld=new at,this.matrixAutoUpdate=Ct.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Ct.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new jo,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ui.setFromAxisAngle(e,t),this.quaternion.multiply(Ui),this}rotateOnWorldAxis(e,t){return Ui.setFromAxisAngle(e,t),this.quaternion.premultiply(Ui),this}rotateX(e){return this.rotateOnAxis(Pl,e)}rotateY(e){return this.rotateOnAxis(Il,e)}rotateZ(e){return this.rotateOnAxis(Ll,e)}translateOnAxis(e,t){return Rl.copy(e).applyQuaternion(this.quaternion),this.position.add(Rl.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Pl,e)}translateY(e){return this.translateOnAxis(Il,e)}translateZ(e){return this.translateOnAxis(Ll,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(On.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?er.copy(e):er.set(e,t,n);const s=this.parent;this.updateWorldMatrix(!0,!1),ps.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?On.lookAt(ps,er,this.up):On.lookAt(er,ps,this.up),this.quaternion.setFromRotationMatrix(On),s&&(On.extractRotation(s.matrixWorld),Ui.setFromRotationMatrix(On),this.quaternion.premultiply(Ui.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Dl),Ni.child=e,this.dispatchEvent(Ni),Ni.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(nh),la.child=e,this.dispatchEvent(la),la.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),On.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),On.multiply(e.parent.matrixWorld)),e.applyMatrix4(On),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Dl),Ni.child=e,this.dispatchEvent(Ni),Ni.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){const a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ps,e,eh),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ps,th,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,d=l.length;c<d;c++){const u=l[c];r(e.shapes,u)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(e.materials,this.material[l]));s.material=o}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];s.animations.push(r(e.animations,l))}}if(t){const o=a(e.geometries),l=a(e.materials),c=a(e.textures),d=a(e.images),u=a(e.shapes),f=a(e.skeletons),p=a(e.animations),g=a(e.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),d.length>0&&(n.images=d),u.length>0&&(n.shapes=u),f.length>0&&(n.skeletons=f),p.length>0&&(n.animations=p),g.length>0&&(n.nodes=g)}return n.object=s,n;function a(o){const l=[];for(const c in o){const d=o[c];delete d.metadata,l.push(d)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const s=e.children[n];this.add(s.clone())}return this}}Ct.DEFAULT_UP=new D(0,1,0);Ct.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ct.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const gn=new D,Bn=new D,ca=new D,kn=new D,Fi=new D,Oi=new D,Ul=new D,da=new D,ua=new D,ha=new D,fa=new rt,pa=new rt,ma=new rt;class dn{constructor(e=new D,t=new D,n=new D){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),gn.subVectors(e,t),s.cross(gn);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){gn.subVectors(s,t),Bn.subVectors(n,t),ca.subVectors(e,t);const a=gn.dot(gn),o=gn.dot(Bn),l=gn.dot(ca),c=Bn.dot(Bn),d=Bn.dot(ca),u=a*c-o*o;if(u===0)return r.set(0,0,0),null;const f=1/u,p=(c*l-o*d)*f,g=(a*d-o*l)*f;return r.set(1-p-g,g,p)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,kn)===null?!1:kn.x>=0&&kn.y>=0&&kn.x+kn.y<=1}static getInterpolation(e,t,n,s,r,a,o,l){return this.getBarycoord(e,t,n,s,kn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,kn.x),l.addScaledVector(a,kn.y),l.addScaledVector(o,kn.z),l)}static getInterpolatedAttribute(e,t,n,s,r,a){return fa.setScalar(0),pa.setScalar(0),ma.setScalar(0),fa.fromBufferAttribute(e,t),pa.fromBufferAttribute(e,n),ma.fromBufferAttribute(e,s),a.setScalar(0),a.addScaledVector(fa,r.x),a.addScaledVector(pa,r.y),a.addScaledVector(ma,r.z),a}static isFrontFacing(e,t,n,s){return gn.subVectors(n,t),Bn.subVectors(e,t),gn.cross(Bn).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return gn.subVectors(this.c,this.b),Bn.subVectors(this.a,this.b),gn.cross(Bn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return dn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return dn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return dn.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return dn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return dn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,s=this.b,r=this.c;let a,o;Fi.subVectors(s,n),Oi.subVectors(r,n),da.subVectors(e,n);const l=Fi.dot(da),c=Oi.dot(da);if(l<=0&&c<=0)return t.copy(n);ua.subVectors(e,s);const d=Fi.dot(ua),u=Oi.dot(ua);if(d>=0&&u<=d)return t.copy(s);const f=l*u-d*c;if(f<=0&&l>=0&&d<=0)return a=l/(l-d),t.copy(n).addScaledVector(Fi,a);ha.subVectors(e,r);const p=Fi.dot(ha),g=Oi.dot(ha);if(g>=0&&p<=g)return t.copy(r);const x=p*c-l*g;if(x<=0&&c>=0&&g<=0)return o=c/(c-g),t.copy(n).addScaledVector(Oi,o);const m=d*g-p*u;if(m<=0&&u-d>=0&&p-g>=0)return Ul.subVectors(r,s),o=(u-d)/(u-d+(p-g)),t.copy(s).addScaledVector(Ul,o);const h=1/(m+x+f);return a=x*h,o=f*h,t.copy(n).addScaledVector(Fi,a).addScaledVector(Oi,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const td={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Qn={h:0,s:0,l:0},tr={h:0,s:0,l:0};function ga(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class Fe{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=an){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ze.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=Ze.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ze.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=Ze.workingColorSpace){if(e=$o(e,1),t=Ye(t,0,1),n=Ye(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,a=2*n-r;this.r=ga(a,r,e+1/3),this.g=ga(a,r,e),this.b=ga(a,r,e-1/3)}return Ze.colorSpaceToWorking(this,s),this}setStyle(e,t=an){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=an){const n=td[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=qn(e.r),this.g=qn(e.g),this.b=qn(e.b),this}copyLinearToSRGB(e){return this.r=Qi(e.r),this.g=Qi(e.g),this.b=Qi(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=an){return Ze.workingToColorSpace(Nt.copy(this),e),Math.round(Ye(Nt.r*255,0,255))*65536+Math.round(Ye(Nt.g*255,0,255))*256+Math.round(Ye(Nt.b*255,0,255))}getHexString(e=an){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ze.workingColorSpace){Ze.workingToColorSpace(Nt.copy(this),t);const n=Nt.r,s=Nt.g,r=Nt.b,a=Math.max(n,s,r),o=Math.min(n,s,r);let l,c;const d=(o+a)/2;if(o===a)l=0,c=0;else{const u=a-o;switch(c=d<=.5?u/(a+o):u/(2-a-o),a){case n:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-n)/u+2;break;case r:l=(n-s)/u+4;break}l/=6}return e.h=l,e.s=c,e.l=d,e}getRGB(e,t=Ze.workingColorSpace){return Ze.workingToColorSpace(Nt.copy(this),t),e.r=Nt.r,e.g=Nt.g,e.b=Nt.b,e}getStyle(e=an){Ze.workingToColorSpace(Nt.copy(this),e);const t=Nt.r,n=Nt.g,s=Nt.b;return e!==an?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(Qn),this.setHSL(Qn.h+e,Qn.s+t,Qn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Qn),e.getHSL(tr);const n=Cs(Qn.h,tr.h,t),s=Cs(Qn.s,tr.s,t),r=Cs(Qn.l,tr.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Nt=new Fe;Fe.NAMES=td;let ih=0;class wi extends os{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:ih++}),this.uuid=Xn(),this.name="",this.type="Material",this.blending=Ji,this.side=ri,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Wa,this.blendDst=Xa,this.blendEquation=_i,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Fe(0,0,0),this.blendAlpha=0,this.depthFunc=ts,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Ml,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ci,this.stencilZFail=Ci,this.stencilZPass=Ci,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Ji&&(n.blending=this.blending),this.side!==ri&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Wa&&(n.blendSrc=this.blendSrc),this.blendDst!==Xa&&(n.blendDst=this.blendDst),this.blendEquation!==_i&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==ts&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Ml&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ci&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Ci&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Ci&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const a=[];for(const o in r){const l=r[o];delete l.metadata,a.push(l)}return a}if(t){const r=s(e.textures),a=s(e.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class cs extends wi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Fe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Dn,this.combine=zc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const yt=new D,nr=new we;let sh=0;class tn{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:sh++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Lo,this.updateRanges=[],this.gpuType=Cn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)nr.fromBufferAttribute(this,t),nr.applyMatrix3(e),this.setXY(t,nr.x,nr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)yt.fromBufferAttribute(this,t),yt.applyMatrix3(e),this.setXYZ(t,yt.x,yt.y,yt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)yt.fromBufferAttribute(this,t),yt.applyMatrix4(e),this.setXYZ(t,yt.x,yt.y,yt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)yt.fromBufferAttribute(this,t),yt.applyNormalMatrix(e),this.setXYZ(t,yt.x,yt.y,yt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)yt.fromBufferAttribute(this,t),yt.transformDirection(e),this.setXYZ(t,yt.x,yt.y,yt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=vn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=tt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=vn(t,this.array)),t}setX(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=vn(t,this.array)),t}setY(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=vn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=vn(t,this.array)),t}setW(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array),r=tt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Lo&&(e.usage=this.usage),e}}class nd extends tn{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class id extends tn{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class ft extends tn{constructor(e,t,n){super(new Float32Array(e),t,n)}}let rh=0;const rn=new at,_a=new Ct,Bi=new D,Zt=new Ti,ms=new Ti,Lt=new D;class Bt extends os{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:rh++}),this.uuid=Xn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Qc(e)?id:nd)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new ze().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return rn.makeRotationFromQuaternion(e),this.applyMatrix4(rn),this}rotateX(e){return rn.makeRotationX(e),this.applyMatrix4(rn),this}rotateY(e){return rn.makeRotationY(e),this.applyMatrix4(rn),this}rotateZ(e){return rn.makeRotationZ(e),this.applyMatrix4(rn),this}translate(e,t,n){return rn.makeTranslation(e,t,n),this.applyMatrix4(rn),this}scale(e,t,n){return rn.makeScale(e,t,n),this.applyMatrix4(rn),this}lookAt(e){return _a.lookAt(e),_a.updateMatrix(),this.applyMatrix4(_a.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Bi).negate(),this.translate(Bi.x,Bi.y,Bi.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let s=0,r=e.length;s<r;s++){const a=e[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ft(n,3))}else{const n=Math.min(e.length,t.count);for(let s=0;s<n;s++){const r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ti);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){const r=t[n];Zt.setFromBufferAttribute(r),this.morphTargetsRelative?(Lt.addVectors(this.boundingBox.min,Zt.min),this.boundingBox.expandByPoint(Lt),Lt.addVectors(this.boundingBox.max,Zt.max),this.boundingBox.expandByPoint(Lt)):(this.boundingBox.expandByPoint(Zt.min),this.boundingBox.expandByPoint(Zt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ls);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(e){const n=this.boundingSphere.center;if(Zt.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const o=t[r];ms.setFromBufferAttribute(o),this.morphTargetsRelative?(Lt.addVectors(Zt.min,ms.min),Zt.expandByPoint(Lt),Lt.addVectors(Zt.max,ms.max),Zt.expandByPoint(Lt)):(Zt.expandByPoint(ms.min),Zt.expandByPoint(ms.max))}Zt.getCenter(n);let s=0;for(let r=0,a=e.count;r<a;r++)Lt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Lt));if(t)for(let r=0,a=t.length;r<a;r++){const o=t[r],l=this.morphTargetsRelative;for(let c=0,d=o.count;c<d;c++)Lt.fromBufferAttribute(o,c),l&&(Bi.fromBufferAttribute(e,c),Lt.add(Bi)),s=Math.max(s,n.distanceToSquared(Lt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new tn(new Float32Array(4*n.count),4));const a=this.getAttribute("tangent"),o=[],l=[];for(let I=0;I<n.count;I++)o[I]=new D,l[I]=new D;const c=new D,d=new D,u=new D,f=new we,p=new we,g=new we,x=new D,m=new D;function h(I,_,v){c.fromBufferAttribute(n,I),d.fromBufferAttribute(n,_),u.fromBufferAttribute(n,v),f.fromBufferAttribute(r,I),p.fromBufferAttribute(r,_),g.fromBufferAttribute(r,v),d.sub(c),u.sub(c),p.sub(f),g.sub(f);const A=1/(p.x*g.y-g.x*p.y);isFinite(A)&&(x.copy(d).multiplyScalar(g.y).addScaledVector(u,-p.y).multiplyScalar(A),m.copy(u).multiplyScalar(p.x).addScaledVector(d,-g.x).multiplyScalar(A),o[I].add(x),o[_].add(x),o[v].add(x),l[I].add(m),l[_].add(m),l[v].add(m))}let E=this.groups;E.length===0&&(E=[{start:0,count:e.count}]);for(let I=0,_=E.length;I<_;++I){const v=E[I],A=v.start,N=v.count;for(let X=A,O=A+N;X<O;X+=3)h(e.getX(X+0),e.getX(X+1),e.getX(X+2))}const b=new D,S=new D,R=new D,w=new D;function P(I){R.fromBufferAttribute(s,I),w.copy(R);const _=o[I];b.copy(_),b.sub(R.multiplyScalar(R.dot(_))).normalize(),S.crossVectors(w,_);const A=S.dot(l[I])<0?-1:1;a.setXYZW(I,b.x,b.y,b.z,A)}for(let I=0,_=E.length;I<_;++I){const v=E[I],A=v.start,N=v.count;for(let X=A,O=A+N;X<O;X+=3)P(e.getX(X+0)),P(e.getX(X+1)),P(e.getX(X+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new tn(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let f=0,p=n.count;f<p;f++)n.setXYZ(f,0,0,0);const s=new D,r=new D,a=new D,o=new D,l=new D,c=new D,d=new D,u=new D;if(e)for(let f=0,p=e.count;f<p;f+=3){const g=e.getX(f+0),x=e.getX(f+1),m=e.getX(f+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,x),a.fromBufferAttribute(t,m),d.subVectors(a,r),u.subVectors(s,r),d.cross(u),o.fromBufferAttribute(n,g),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,m),o.add(d),l.add(d),c.add(d),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let f=0,p=t.count;f<p;f+=3)s.fromBufferAttribute(t,f+0),r.fromBufferAttribute(t,f+1),a.fromBufferAttribute(t,f+2),d.subVectors(a,r),u.subVectors(s,r),d.cross(u),n.setXYZ(f+0,d.x,d.y,d.z),n.setXYZ(f+1,d.x,d.y,d.z),n.setXYZ(f+2,d.x,d.y,d.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Lt.fromBufferAttribute(e,t),Lt.normalize(),e.setXYZ(t,Lt.x,Lt.y,Lt.z)}toNonIndexed(){function e(o,l){const c=o.array,d=o.itemSize,u=o.normalized,f=new c.constructor(l.length*d);let p=0,g=0;for(let x=0,m=l.length;x<m;x++){o.isInterleavedBufferAttribute?p=l[x]*o.data.stride+o.offset:p=l[x]*d;for(let h=0;h<d;h++)f[g++]=c[p++]}return new tn(f,d,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Bt,n=this.index.array,s=this.attributes;for(const o in s){const l=s[o],c=e(l,n);t.setAttribute(o,c)}const r=this.morphAttributes;for(const o in r){const l=[],c=r[o];for(let d=0,u=c.length;d<u;d++){const f=c[d],p=e(f,n);l.push(p)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],d=[];for(let u=0,f=c.length;u<f;u++){const p=c[u];d.push(p.toJSON(e.data))}d.length>0&&(s[l]=d,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const s=e.attributes;for(const c in s){const d=s[c];this.setAttribute(c,d.clone(t))}const r=e.morphAttributes;for(const c in r){const d=[],u=r[c];for(let f=0,p=u.length;f<p;f++)d.push(u[f].clone(t));this.morphAttributes[c]=d}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let c=0,d=a.length;c<d;c++){const u=a[c];this.addGroup(u.start,u.count,u.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Nl=new at,ui=new Zo,ir=new ls,Fl=new D,sr=new D,rr=new D,ar=new D,va=new D,or=new D,Ol=new D,lr=new D;class re extends Ct{constructor(e=new Bt,t=new cs){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(s,e);const o=this.morphTargetInfluences;if(r&&o){or.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const d=o[l],u=r[l];d!==0&&(va.fromBufferAttribute(u,e),a?or.addScaledVector(va,d):or.addScaledVector(va.sub(t),d))}t.add(or)}return t}raycast(e,t){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ir.copy(n.boundingSphere),ir.applyMatrix4(r),ui.copy(e.ray).recast(e.near),!(ir.containsPoint(ui.origin)===!1&&(ui.intersectSphere(ir,Fl)===null||ui.origin.distanceToSquared(Fl)>(e.far-e.near)**2))&&(Nl.copy(r).invert(),ui.copy(e.ray).applyMatrix4(Nl),!(n.boundingBox!==null&&ui.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,ui)))}_computeIntersections(e,t,n){let s;const r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,d=r.attributes.uv1,u=r.attributes.normal,f=r.groups,p=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,x=f.length;g<x;g++){const m=f[g],h=a[m.materialIndex],E=Math.max(m.start,p.start),b=Math.min(o.count,Math.min(m.start+m.count,p.start+p.count));for(let S=E,R=b;S<R;S+=3){const w=o.getX(S),P=o.getX(S+1),I=o.getX(S+2);s=cr(this,h,e,n,c,d,u,w,P,I),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const g=Math.max(0,p.start),x=Math.min(o.count,p.start+p.count);for(let m=g,h=x;m<h;m+=3){const E=o.getX(m),b=o.getX(m+1),S=o.getX(m+2);s=cr(this,a,e,n,c,d,u,E,b,S),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,x=f.length;g<x;g++){const m=f[g],h=a[m.materialIndex],E=Math.max(m.start,p.start),b=Math.min(l.count,Math.min(m.start+m.count,p.start+p.count));for(let S=E,R=b;S<R;S+=3){const w=S,P=S+1,I=S+2;s=cr(this,h,e,n,c,d,u,w,P,I),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const g=Math.max(0,p.start),x=Math.min(l.count,p.start+p.count);for(let m=g,h=x;m<h;m+=3){const E=m,b=m+1,S=m+2;s=cr(this,a,e,n,c,d,u,E,b,S),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}}function ah(i,e,t,n,s,r,a,o){let l;if(e.side===qt?l=n.intersectTriangle(a,r,s,!0,o):l=n.intersectTriangle(s,r,a,e.side===ri,o),l===null)return null;lr.copy(o),lr.applyMatrix4(i.matrixWorld);const c=t.ray.origin.distanceTo(lr);return c<t.near||c>t.far?null:{distance:c,point:lr.clone(),object:i}}function cr(i,e,t,n,s,r,a,o,l,c){i.getVertexPosition(o,sr),i.getVertexPosition(l,rr),i.getVertexPosition(c,ar);const d=ah(i,e,t,n,sr,rr,ar,Ol);if(d){const u=new D;dn.getBarycoord(Ol,sr,rr,ar,u),s&&(d.uv=dn.getInterpolatedAttribute(s,o,l,c,u,new we)),r&&(d.uv1=dn.getInterpolatedAttribute(r,o,l,c,u,new we)),a&&(d.normal=dn.getInterpolatedAttribute(a,o,l,c,u,new D),d.normal.dot(n.direction)>0&&d.normal.multiplyScalar(-1));const f={a:o,b:l,c,normal:new D,materialIndex:0};dn.getNormal(sr,rr,ar,f.normal),d.face=f,d.barycoord=u}return d}class hn extends Bt{constructor(e=1,t=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};const o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);const l=[],c=[],d=[],u=[];let f=0,p=0;g("z","y","x",-1,-1,n,t,e,a,r,0),g("z","y","x",1,-1,n,t,-e,a,r,1),g("x","z","y",1,1,e,n,t,s,a,2),g("x","z","y",1,-1,e,n,-t,s,a,3),g("x","y","z",1,-1,e,t,n,s,r,4),g("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new ft(c,3)),this.setAttribute("normal",new ft(d,3)),this.setAttribute("uv",new ft(u,2));function g(x,m,h,E,b,S,R,w,P,I,_){const v=S/P,A=R/I,N=S/2,X=R/2,O=w/2,k=P+1,U=I+1;let q=0,V=0;const J=new D;for(let ee=0;ee<U;ee++){const de=ee*A-X;for(let Re=0;Re<k;Re++){const $e=Re*v-N;J[x]=$e*E,J[m]=de*b,J[h]=O,c.push(J.x,J.y,J.z),J[x]=0,J[m]=0,J[h]=w>0?1:-1,d.push(J.x,J.y,J.z),u.push(Re/P),u.push(1-ee/I),q+=1}}for(let ee=0;ee<I;ee++)for(let de=0;de<P;de++){const Re=f+de+k*ee,$e=f+de+k*(ee+1),je=f+(de+1)+k*(ee+1),Q=f+(de+1)+k*ee;l.push(Re,$e,Q),l.push($e,je,Q),V+=6}o.addGroup(p,V,_),p+=V,f+=q}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new hn(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function rs(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const s=i[t][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone():Array.isArray(s)?e[t][n]=s.slice():e[t][n]=s}}return e}function zt(i){const e={};for(let t=0;t<i.length;t++){const n=rs(i[t]);for(const s in n)e[s]=n[s]}return e}function oh(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function sd(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Ze.workingColorSpace}const Br={clone:rs,merge:zt};var lh=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,ch=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Wt extends wi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=lh,this.fragmentShader=ch,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=rs(e.uniforms),this.uniformsGroups=oh(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const s in this.uniforms){const a=this.uniforms[s].value;a&&a.isTexture?t.uniforms[s]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[s]={type:"m4",value:a.toArray()}:t.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class rd extends Ct{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new at,this.projectionMatrix=new at,this.projectionMatrixInverse=new at,this.coordinateSystem=Rn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const ei=new D,Bl=new we,kl=new we;class cn extends rd{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Ns*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(As*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Ns*2*Math.atan(Math.tan(As*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){ei.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ei.x,ei.y).multiplyScalar(-e/ei.z),ei.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ei.x,ei.y).multiplyScalar(-e/ei.z)}getViewSize(e,t){return this.getViewBounds(e,Bl,kl),t.subVectors(kl,Bl)}setViewOffset(e,t,n,s,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(As*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,t-=a.offsetY*n/c,s*=a.width/l,n*=a.height/c}const o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const ki=-90,Hi=1;class dh extends Ct{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new cn(ki,Hi,e,t);s.layers=this.layers,this.add(s);const r=new cn(ki,Hi,e,t);r.layers=this.layers,this.add(r);const a=new cn(ki,Hi,e,t);a.layers=this.layers,this.add(a);const o=new cn(ki,Hi,e,t);o.layers=this.layers,this.add(o);const l=new cn(ki,Hi,e,t);l.layers=this.layers,this.add(l);const c=new cn(ki,Hi,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,s,r,a,o,l]=t;for(const c of t)this.remove(c);if(e===Rn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Fr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,a,o,l,c,d]=this.children,u=e.getRenderTarget(),f=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,s),e.render(t,r),e.setRenderTarget(n,1,s),e.render(t,a),e.setRenderTarget(n,2,s),e.render(t,o),e.setRenderTarget(n,3,s),e.render(t,l),e.setRenderTarget(n,4,s),e.render(t,c),n.texture.generateMipmaps=x,e.setRenderTarget(n,5,s),e.render(t,d),e.setRenderTarget(u,f,p),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class ad extends Ot{constructor(e=[],t=ns,n,s,r,a,o,l,c,d){super(e,t,n,s,r,a,o,l,c,d),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class uh extends Sn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new ad(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new hn(5,5,5),r=new Wt({name:"CubemapFromEquirect",uniforms:rs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:qt,blending:Gn});r.uniforms.tEquirect.value=t;const a=new re(s,r),o=t.minFilter;return t.minFilter===Si&&(t.minFilter=xn),new dh(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){const r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,s);e.setRenderTarget(r)}}class _t extends Ct{constructor(){super(),this.isGroup=!0,this.type="Group"}}const hh={type:"move"};class xa{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new _t,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new _t,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new _t,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(const x of e.hand.values()){const m=t.getJointPose(x,n),h=this._getHandJoint(c,x);m!==null&&(h.matrix.fromArray(m.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,h.jointRadius=m.radius),h.visible=m!==null}const d=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],f=d.position.distanceTo(u.position),p=.02,g=.005;c.inputState.pinching&&f>p+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&f<=p-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(hh)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new _t;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class Jo{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new Fe(e),this.density=t}clone(){return new Jo(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class fh extends Ct{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Dn,this.environmentIntensity=1,this.environmentRotation=new Dn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class ph{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Lo,this.updateRanges=[],this.version=0,this.uuid=Xn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Xn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Xn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Ht=new D;class kr{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Ht.fromBufferAttribute(this,t),Ht.applyMatrix4(e),this.setXYZ(t,Ht.x,Ht.y,Ht.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Ht.fromBufferAttribute(this,t),Ht.applyNormalMatrix(e),this.setXYZ(t,Ht.x,Ht.y,Ht.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Ht.fromBufferAttribute(this,t),Ht.transformDirection(e),this.setXYZ(t,Ht.x,Ht.y,Ht.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=vn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=tt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=vn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=vn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=vn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=vn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array),r=tt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new tn(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new kr(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}class od extends wi{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Fe(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let zi;const gs=new D,Vi=new D,Gi=new D,Wi=new we,_s=new we,ld=new at,dr=new D,vs=new D,ur=new D,Hl=new we,Ma=new we,zl=new we;class mh extends Ct{constructor(e=new od){if(super(),this.isSprite=!0,this.type="Sprite",zi===void 0){zi=new Bt;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new ph(t,5);zi.setIndex([0,1,2,0,2,3]),zi.setAttribute("position",new kr(n,3,0,!1)),zi.setAttribute("uv",new kr(n,2,3,!1))}this.geometry=zi,this.material=e,this.center=new we(.5,.5),this.count=1}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),Vi.setFromMatrixScale(this.matrixWorld),ld.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),Gi.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Vi.multiplyScalar(-Gi.z);const n=this.material.rotation;let s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));const a=this.center;hr(dr.set(-.5,-.5,0),Gi,a,Vi,s,r),hr(vs.set(.5,-.5,0),Gi,a,Vi,s,r),hr(ur.set(.5,.5,0),Gi,a,Vi,s,r),Hl.set(0,0),Ma.set(1,0),zl.set(1,1);let o=e.ray.intersectTriangle(dr,vs,ur,!1,gs);if(o===null&&(hr(vs.set(-.5,.5,0),Gi,a,Vi,s,r),Ma.set(0,1),o=e.ray.intersectTriangle(dr,ur,vs,!1,gs),o===null))return;const l=e.ray.origin.distanceTo(gs);l<e.near||l>e.far||t.push({distance:l,point:gs.clone(),uv:dn.getInterpolation(gs,dr,vs,ur,Hl,Ma,zl,new we),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function hr(i,e,t,n,s,r){Wi.subVectors(i,t).addScalar(.5).multiply(n),s!==void 0?(_s.x=r*Wi.x-s*Wi.y,_s.y=s*Wi.x+r*Wi.y):_s.copy(Wi),i.copy(e),i.x+=_s.x,i.y+=_s.y,i.applyMatrix4(ld)}class gh extends Ot{constructor(e=null,t=1,n=1,s,r,a,o,l,c=en,d=en,u,f){super(null,a,o,l,c,d,s,r,u,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Vl extends tn{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const Xi=new at,Gl=new at,fr=[],Wl=new Ti,_h=new at,xs=new re,Ms=new ls;class Qo extends re{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Vl(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,_h)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Ti),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Xi),Wl.copy(e.boundingBox).applyMatrix4(Xi),this.boundingBox.union(Wl)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new ls),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Xi),Ms.copy(e.boundingSphere).applyMatrix4(Xi),this.boundingSphere.union(Ms)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=e*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(e,t){const n=this.matrixWorld,s=this.count;if(xs.geometry=this.geometry,xs.material=this.material,xs.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ms.copy(this.boundingSphere),Ms.applyMatrix4(n),e.ray.intersectsSphere(Ms)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Xi),Gl.multiplyMatrices(n,Xi),xs.matrixWorld=Gl,xs.raycast(e,fr);for(let a=0,o=fr.length;a<o;a++){const l=fr[a];l.instanceId=r,l.object=this,t.push(l)}fr.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Vl(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new gh(new Float32Array(s*this.count),s,this.count,Wo,Cn));const r=this.morphTexture.source.data.data;let a=0;for(let c=0;c<n.length;c++)a+=n[c];const o=this.geometry.morphTargetsRelative?1:1-a,l=s*e;r[l]=o,r.set(n,l+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const ya=new D,vh=new D,xh=new ze;class ti{constructor(e=new D(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const s=ya.subVectors(n,t).cross(vh.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(ya),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||xh.getNormalMatrix(e),s=this.coplanarPoint(ya).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const hi=new ls,Mh=new we(.5,.5),pr=new D;class el{constructor(e=new ti,t=new ti,n=new ti,s=new ti,r=new ti,a=new ti){this.planes=[e,t,n,s,r,a]}set(e,t,n,s,r,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Rn,n=!1){const s=this.planes,r=e.elements,a=r[0],o=r[1],l=r[2],c=r[3],d=r[4],u=r[5],f=r[6],p=r[7],g=r[8],x=r[9],m=r[10],h=r[11],E=r[12],b=r[13],S=r[14],R=r[15];if(s[0].setComponents(c-a,p-d,h-g,R-E).normalize(),s[1].setComponents(c+a,p+d,h+g,R+E).normalize(),s[2].setComponents(c+o,p+u,h+x,R+b).normalize(),s[3].setComponents(c-o,p-u,h-x,R-b).normalize(),n)s[4].setComponents(l,f,m,S).normalize(),s[5].setComponents(c-l,p-f,h-m,R-S).normalize();else if(s[4].setComponents(c-l,p-f,h-m,R-S).normalize(),t===Rn)s[5].setComponents(c+l,p+f,h+m,R+S).normalize();else if(t===Fr)s[5].setComponents(l,f,m,S).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),hi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),hi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(hi)}intersectsSprite(e){hi.center.set(0,0,0);const t=Mh.distanceTo(e.center);return hi.radius=.7071067811865476+t,hi.applyMatrix4(e.matrixWorld),this.intersectsSphere(hi)}intersectsSphere(e){const t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const s=t[n];if(pr.x=s.normal.x>0?e.max.x:e.min.x,pr.y=s.normal.y>0?e.max.y:e.min.y,pr.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(pr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class cd extends wi{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Fe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Xl=new at,Do=new Zo,mr=new ls,gr=new D;class yh extends Ct{constructor(e=new Bt,t=new cd){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),mr.copy(n.boundingSphere),mr.applyMatrix4(s),mr.radius+=r,e.ray.intersectsSphere(mr)===!1)return;Xl.copy(s).invert(),Do.copy(e.ray).applyMatrix4(Xl);const o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=n.index,u=n.attributes.position;if(c!==null){const f=Math.max(0,a.start),p=Math.min(c.count,a.start+a.count);for(let g=f,x=p;g<x;g++){const m=c.getX(g);gr.fromBufferAttribute(u,m),ql(gr,m,l,s,e,t,this)}}else{const f=Math.max(0,a.start),p=Math.min(u.count,a.start+a.count);for(let g=f,x=p;g<x;g++)gr.fromBufferAttribute(u,g),ql(gr,g,l,s,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}}function ql(i,e,t,n,s,r,a){const o=Do.distanceSqToPoint(i);if(o<t){const l=new D;Do.closestPointToPoint(i,l),l.applyMatrix4(n);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}class Sh extends Ot{constructor(e,t,n,s,r,a,o,l,c){super(e,t,n,s,r,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class dd extends Ot{constructor(e,t,n=bi,s,r,a,o=en,l=en,c,d=Ds,u=1){if(d!==Ds&&d!==Us)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const f={width:e,height:t,depth:u};super(f,s,r,a,o,l,d,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ko(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class ud extends Ot{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class tl extends Bt{constructor(e=1,t=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:s},t=Math.max(3,t);const r=[],a=[],o=[],l=[],c=new D,d=new we;a.push(0,0,0),o.push(0,0,1),l.push(.5,.5);for(let u=0,f=3;u<=t;u++,f+=3){const p=n+u/t*s;c.x=e*Math.cos(p),c.y=e*Math.sin(p),a.push(c.x,c.y,c.z),o.push(0,0,1),d.x=(a[f]/e+1)/2,d.y=(a[f+1]/e+1)/2,l.push(d.x,d.y)}for(let u=1;u<=t;u++)r.push(u,u+1,0);this.setIndex(r),this.setAttribute("position",new ft(a,3)),this.setAttribute("normal",new ft(o,3)),this.setAttribute("uv",new ft(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new tl(e.radius,e.segments,e.thetaStart,e.thetaLength)}}class ai extends Bt{constructor(e=1,t=1,n=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};const c=this;s=Math.floor(s),r=Math.floor(r);const d=[],u=[],f=[],p=[];let g=0;const x=[],m=n/2;let h=0;E(),a===!1&&(e>0&&b(!0),t>0&&b(!1)),this.setIndex(d),this.setAttribute("position",new ft(u,3)),this.setAttribute("normal",new ft(f,3)),this.setAttribute("uv",new ft(p,2));function E(){const S=new D,R=new D;let w=0;const P=(t-e)/n;for(let I=0;I<=r;I++){const _=[],v=I/r,A=v*(t-e)+e;for(let N=0;N<=s;N++){const X=N/s,O=X*l+o,k=Math.sin(O),U=Math.cos(O);R.x=A*k,R.y=-v*n+m,R.z=A*U,u.push(R.x,R.y,R.z),S.set(k,P,U).normalize(),f.push(S.x,S.y,S.z),p.push(X,1-v),_.push(g++)}x.push(_)}for(let I=0;I<s;I++)for(let _=0;_<r;_++){const v=x[_][I],A=x[_+1][I],N=x[_+1][I+1],X=x[_][I+1];(e>0||_!==0)&&(d.push(v,A,X),w+=3),(t>0||_!==r-1)&&(d.push(A,N,X),w+=3)}c.addGroup(h,w,0),h+=w}function b(S){const R=g,w=new we,P=new D;let I=0;const _=S===!0?e:t,v=S===!0?1:-1;for(let N=1;N<=s;N++)u.push(0,m*v,0),f.push(0,v,0),p.push(.5,.5),g++;const A=g;for(let N=0;N<=s;N++){const O=N/s*l+o,k=Math.cos(O),U=Math.sin(O);P.x=_*U,P.y=m*v,P.z=_*k,u.push(P.x,P.y,P.z),f.push(0,v,0),w.x=k*.5+.5,w.y=U*.5*v+.5,p.push(w.x,w.y),g++}for(let N=0;N<s;N++){const X=R+N,O=A+N;S===!0?d.push(O,O+1,X):d.push(O+1,O,X),I+=3}c.addGroup(h,I,S===!0?1:2),h+=I}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ai(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class fn extends Bt{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};const r=e/2,a=t/2,o=Math.floor(n),l=Math.floor(s),c=o+1,d=l+1,u=e/o,f=t/l,p=[],g=[],x=[],m=[];for(let h=0;h<d;h++){const E=h*f-a;for(let b=0;b<c;b++){const S=b*u-r;g.push(S,-E,0),x.push(0,0,1),m.push(b/o),m.push(1-h/l)}}for(let h=0;h<l;h++)for(let E=0;E<o;E++){const b=E+c*h,S=E+c*(h+1),R=E+1+c*(h+1),w=E+1+c*h;p.push(b,S,w),p.push(S,R,w)}this.setIndex(p),this.setAttribute("position",new ft(g,3)),this.setAttribute("normal",new ft(x,3)),this.setAttribute("uv",new ft(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new fn(e.width,e.height,e.widthSegments,e.heightSegments)}}class zs extends Bt{constructor(e=.5,t=1,n=32,s=1,r=0,a=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:s,thetaStart:r,thetaLength:a},n=Math.max(3,n),s=Math.max(1,s);const o=[],l=[],c=[],d=[];let u=e;const f=(t-e)/s,p=new D,g=new we;for(let x=0;x<=s;x++){for(let m=0;m<=n;m++){const h=r+m/n*a;p.x=u*Math.cos(h),p.y=u*Math.sin(h),l.push(p.x,p.y,p.z),c.push(0,0,1),g.x=(p.x/t+1)/2,g.y=(p.y/t+1)/2,d.push(g.x,g.y)}u+=f}for(let x=0;x<s;x++){const m=x*(n+1);for(let h=0;h<n;h++){const E=h+m,b=E,S=E+n+1,R=E+n+2,w=E+1;o.push(b,S,w),o.push(S,R,w)}}this.setIndex(o),this.setAttribute("position",new ft(l,3)),this.setAttribute("normal",new ft(c,3)),this.setAttribute("uv",new ft(d,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new zs(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}}class nl extends Bt{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(a+o,Math.PI);let c=0;const d=[],u=new D,f=new D,p=[],g=[],x=[],m=[];for(let h=0;h<=n;h++){const E=[],b=h/n;let S=0;h===0&&a===0?S=.5/t:h===n&&l===Math.PI&&(S=-.5/t);for(let R=0;R<=t;R++){const w=R/t;u.x=-e*Math.cos(s+w*r)*Math.sin(a+b*o),u.y=e*Math.cos(a+b*o),u.z=e*Math.sin(s+w*r)*Math.sin(a+b*o),g.push(u.x,u.y,u.z),f.copy(u).normalize(),x.push(f.x,f.y,f.z),m.push(w+S,1-b),E.push(c++)}d.push(E)}for(let h=0;h<n;h++)for(let E=0;E<t;E++){const b=d[h][E+1],S=d[h][E],R=d[h+1][E],w=d[h+1][E+1];(h!==0||a>0)&&p.push(b,S,w),(h!==n-1||l<Math.PI)&&p.push(S,R,w)}this.setIndex(p),this.setAttribute("position",new ft(g,3)),this.setAttribute("normal",new ft(x,3)),this.setAttribute("uv",new ft(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new nl(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class il extends Bt{constructor(e=1,t=.4,n=12,s=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:s,arc:r},n=Math.floor(n),s=Math.floor(s);const a=[],o=[],l=[],c=[],d=new D,u=new D,f=new D;for(let p=0;p<=n;p++)for(let g=0;g<=s;g++){const x=g/s*r,m=p/n*Math.PI*2;u.x=(e+t*Math.cos(m))*Math.cos(x),u.y=(e+t*Math.cos(m))*Math.sin(x),u.z=t*Math.sin(m),o.push(u.x,u.y,u.z),d.x=e*Math.cos(x),d.y=e*Math.sin(x),f.subVectors(u,d).normalize(),l.push(f.x,f.y,f.z),c.push(g/s),c.push(p/n)}for(let p=1;p<=n;p++)for(let g=1;g<=s;g++){const x=(s+1)*p+g-1,m=(s+1)*(p-1)+g-1,h=(s+1)*(p-1)+g,E=(s+1)*p+g;a.push(x,m,E),a.push(m,h,E)}this.setIndex(a),this.setAttribute("position",new ft(o,3)),this.setAttribute("normal",new ft(l,3)),this.setAttribute("uv",new ft(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new il(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class et extends wi{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Fe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Fe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=jc,this.normalScale=new we(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Dn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Eh extends wi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=mu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class bh extends wi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class sl extends Ct{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Fe(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class Th extends sl{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Ct.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Fe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const Sa=new at,Yl=new D,$l=new D;class hd{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new we(512,512),this.mapType=Ln,this.map=null,this.mapPass=null,this.matrix=new at,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new el,this._frameExtents=new we(1,1),this._viewportCount=1,this._viewports=[new rt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Yl.setFromMatrixPosition(e.matrixWorld),t.position.copy(Yl),$l.setFromMatrixPosition(e.target.matrixWorld),t.lookAt($l),t.updateMatrixWorld(),Sa.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Sa,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Sa)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Kl=new at,ys=new D,Ea=new D;class wh extends hd{constructor(){super(new cn(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new we(4,2),this._viewportCount=6,this._viewports=[new rt(2,1,1,1),new rt(0,1,1,1),new rt(3,1,1,1),new rt(1,1,1,1),new rt(3,0,1,1),new rt(1,0,1,1)],this._cubeDirections=[new D(1,0,0),new D(-1,0,0),new D(0,0,1),new D(0,0,-1),new D(0,1,0),new D(0,-1,0)],this._cubeUps=[new D(0,1,0),new D(0,1,0),new D(0,1,0),new D(0,1,0),new D(0,0,1),new D(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,s=this.matrix,r=e.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),ys.setFromMatrixPosition(e.matrixWorld),n.position.copy(ys),Ea.copy(n.position),Ea.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Ea),n.updateMatrixWorld(),s.makeTranslation(-ys.x,-ys.y,-ys.z),Kl.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Kl,n.coordinateSystem,n.reversedDepth)}}class rl extends sl{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new wh}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class Wr extends rd{constructor(e=-1,t=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-e,a=n+e,o=s+t,l=s-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,d=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=d*this.view.offsetY,l=o-d*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Ah extends hd{constructor(){super(new Wr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Ch extends sl{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ct.DEFAULT_UP),this.updateMatrix(),this.target=new Ct,this.shadow=new Ah}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class Rh extends cn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Ph{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const Zl=new at;class Ih{constructor(e,t,n=0,s=1/0){this.ray=new Zo(e,t),this.near=n,this.far=s,this.camera=null,this.layers=new jo,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Zl.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Zl),this}intersectObject(e,t=!0,n=[]){return Uo(e,this,n,t),n.sort(jl),n}intersectObjects(e,t=!0,n=[]){for(let s=0,r=e.length;s<r;s++)Uo(e[s],this,n,t);return n.sort(jl),n}}function jl(i,e){return i.distance-e.distance}function Uo(i,e,t,n){let s=!0;if(i.layers.test(e.layers)&&i.raycast(e,t)===!1&&(s=!1),s===!0&&n===!0){const r=i.children;for(let a=0,o=r.length;a<o;a++)Uo(r[a],e,t,!0)}}function Jl(i,e,t,n){const s=Lh(n);switch(t){case $c:return i*e;case Wo:return i*e/s.components*s.byteLength;case Xo:return i*e/s.components*s.byteLength;case Zc:return i*e*2/s.components*s.byteLength;case qo:return i*e*2/s.components*s.byteLength;case Kc:return i*e*3/s.components*s.byteLength;case Mn:return i*e*4/s.components*s.byteLength;case Yo:return i*e*4/s.components*s.byteLength;case wr:case Ar:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Cr:case Rr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case so:case ao:return Math.max(i,16)*Math.max(e,8)/4;case io:case ro:return Math.max(i,8)*Math.max(e,8)/2;case oo:case lo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case co:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case uo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case ho:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case fo:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case po:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case mo:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case go:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case _o:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case vo:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case xo:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Mo:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case yo:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case So:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Eo:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case bo:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case To:case wo:case Ao:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Co:case Ro:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Po:case Io:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Lh(i){switch(i){case Ln:case Wc:return{byteLength:1,components:1};case Is:case Xc:case Wn:return{byteLength:2,components:1};case Vo:case Go:return{byteLength:2,components:4};case bi:case zo:case Cn:return{byteLength:4,components:1};case qc:case Yc:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ho}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ho);function fd(){let i=null,e=!1,t=null,n=null;function s(r,a){t(r,a),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function Dh(i){const e=new WeakMap;function t(o,l){const c=o.array,d=o.usage,u=c.byteLength,f=i.createBuffer();i.bindBuffer(l,f),i.bufferData(l,c,d),o.onUploadCallback();let p;if(c instanceof Float32Array)p=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)p=i.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?p=i.HALF_FLOAT:p=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=i.SHORT;else if(c instanceof Uint32Array)p=i.UNSIGNED_INT;else if(c instanceof Int32Array)p=i.INT;else if(c instanceof Int8Array)p=i.BYTE;else if(c instanceof Uint8Array)p=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)p=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:f,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:u}}function n(o,l,c){const d=l.array,u=l.updateRanges;if(i.bindBuffer(c,o),u.length===0)i.bufferSubData(c,0,d);else{u.sort((p,g)=>p.start-g.start);let f=0;for(let p=1;p<u.length;p++){const g=u[f],x=u[p];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++f,u[f]=x)}u.length=f+1;for(let p=0,g=u.length;p<g;p++){const x=u[p];i.bufferSubData(c,x.start*d.BYTES_PER_ELEMENT,d,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=e.get(o);l&&(i.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const d=e.get(o);(!d||d.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var Uh=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Nh=`#ifdef USE_ALPHAHASH
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
#endif`,Fh=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Oh=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Bh=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,kh=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Hh=`#ifdef USE_AOMAP
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
#endif`,zh=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Vh=`#ifdef USE_BATCHING
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
#endif`,Gh=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Wh=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Xh=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,qh=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Yh=`#ifdef USE_IRIDESCENCE
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
#endif`,$h=`#ifdef USE_BUMPMAP
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
#endif`,Kh=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Zh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,jh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Jh=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Qh=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,ef=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,tf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,nf=`#if defined( USE_COLOR_ALPHA )
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
#endif`,sf=`#define PI 3.141592653589793
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
} // validated`,rf=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,af=`vec3 transformedNormal = objectNormal;
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
#endif`,of=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,lf=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,cf=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,df=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,uf="gl_FragColor = linearToOutputTexel( gl_FragColor );",hf=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,ff=`#ifdef USE_ENVMAP
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
#endif`,pf=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,mf=`#ifdef USE_ENVMAP
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
#endif`,gf=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,_f=`#ifdef USE_ENVMAP
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
#endif`,vf=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,xf=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Mf=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,yf=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Sf=`#ifdef USE_GRADIENTMAP
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
}`,Ef=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,bf=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Tf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,wf=`uniform bool receiveShadow;
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
#endif`,Af=`#ifdef USE_ENVMAP
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
#endif`,Cf=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Rf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Pf=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,If=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Lf=`PhysicalMaterial material;
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
#endif`,Df=`struct PhysicalMaterial {
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
}`,Uf=`
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
#endif`,Nf=`#if defined( RE_IndirectDiffuse )
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
#endif`,Ff=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Of=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Bf=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,kf=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Hf=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,zf=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Vf=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Gf=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Wf=`#if defined( USE_POINTS_UV )
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
#endif`,Xf=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,qf=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Yf=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,$f=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Kf=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Zf=`#ifdef USE_MORPHTARGETS
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
#endif`,jf=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Jf=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Qf=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,ep=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,tp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,np=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,ip=`#ifdef USE_NORMALMAP
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
#endif`,sp=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,rp=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,ap=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,op=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,lp=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,cp=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,dp=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,up=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,hp=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,fp=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,pp=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,mp=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,gp=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,_p=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,vp=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,xp=`float getShadowMask() {
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
}`,Mp=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,yp=`#ifdef USE_SKINNING
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
#endif`,Sp=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Ep=`#ifdef USE_SKINNING
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
#endif`,bp=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Tp=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,wp=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Ap=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Cp=`#ifdef USE_TRANSMISSION
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
#endif`,Rp=`#ifdef USE_TRANSMISSION
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
#endif`,Pp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Ip=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Lp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Dp=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Up=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Np=`uniform sampler2D t2D;
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
}`,Fp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Op=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Bp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,kp=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Hp=`#include <common>
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
}`,zp=`#if DEPTH_PACKING == 3200
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
}`,Vp=`#define DISTANCE
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
}`,Gp=`#define DISTANCE
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
}`,Wp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Xp=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,qp=`uniform float scale;
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
}`,Yp=`uniform vec3 diffuse;
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
}`,$p=`#include <common>
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
}`,Kp=`uniform vec3 diffuse;
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
}`,Zp=`#define LAMBERT
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
}`,jp=`#define LAMBERT
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
}`,Jp=`#define MATCAP
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
}`,Qp=`#define MATCAP
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
}`,em=`#define NORMAL
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
}`,tm=`#define NORMAL
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
}`,nm=`#define PHONG
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
}`,im=`#define PHONG
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
}`,sm=`#define STANDARD
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
}`,rm=`#define STANDARD
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
}`,am=`#define TOON
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
}`,om=`#define TOON
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
}`,lm=`uniform float size;
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
}`,cm=`uniform vec3 diffuse;
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
}`,dm=`#include <common>
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
}`,um=`uniform vec3 color;
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
}`,hm=`uniform float rotation;
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
}`,fm=`uniform vec3 diffuse;
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
}`,Ge={alphahash_fragment:Uh,alphahash_pars_fragment:Nh,alphamap_fragment:Fh,alphamap_pars_fragment:Oh,alphatest_fragment:Bh,alphatest_pars_fragment:kh,aomap_fragment:Hh,aomap_pars_fragment:zh,batching_pars_vertex:Vh,batching_vertex:Gh,begin_vertex:Wh,beginnormal_vertex:Xh,bsdfs:qh,iridescence_fragment:Yh,bumpmap_pars_fragment:$h,clipping_planes_fragment:Kh,clipping_planes_pars_fragment:Zh,clipping_planes_pars_vertex:jh,clipping_planes_vertex:Jh,color_fragment:Qh,color_pars_fragment:ef,color_pars_vertex:tf,color_vertex:nf,common:sf,cube_uv_reflection_fragment:rf,defaultnormal_vertex:af,displacementmap_pars_vertex:of,displacementmap_vertex:lf,emissivemap_fragment:cf,emissivemap_pars_fragment:df,colorspace_fragment:uf,colorspace_pars_fragment:hf,envmap_fragment:ff,envmap_common_pars_fragment:pf,envmap_pars_fragment:mf,envmap_pars_vertex:gf,envmap_physical_pars_fragment:Af,envmap_vertex:_f,fog_vertex:vf,fog_pars_vertex:xf,fog_fragment:Mf,fog_pars_fragment:yf,gradientmap_pars_fragment:Sf,lightmap_pars_fragment:Ef,lights_lambert_fragment:bf,lights_lambert_pars_fragment:Tf,lights_pars_begin:wf,lights_toon_fragment:Cf,lights_toon_pars_fragment:Rf,lights_phong_fragment:Pf,lights_phong_pars_fragment:If,lights_physical_fragment:Lf,lights_physical_pars_fragment:Df,lights_fragment_begin:Uf,lights_fragment_maps:Nf,lights_fragment_end:Ff,logdepthbuf_fragment:Of,logdepthbuf_pars_fragment:Bf,logdepthbuf_pars_vertex:kf,logdepthbuf_vertex:Hf,map_fragment:zf,map_pars_fragment:Vf,map_particle_fragment:Gf,map_particle_pars_fragment:Wf,metalnessmap_fragment:Xf,metalnessmap_pars_fragment:qf,morphinstance_vertex:Yf,morphcolor_vertex:$f,morphnormal_vertex:Kf,morphtarget_pars_vertex:Zf,morphtarget_vertex:jf,normal_fragment_begin:Jf,normal_fragment_maps:Qf,normal_pars_fragment:ep,normal_pars_vertex:tp,normal_vertex:np,normalmap_pars_fragment:ip,clearcoat_normal_fragment_begin:sp,clearcoat_normal_fragment_maps:rp,clearcoat_pars_fragment:ap,iridescence_pars_fragment:op,opaque_fragment:lp,packing:cp,premultiplied_alpha_fragment:dp,project_vertex:up,dithering_fragment:hp,dithering_pars_fragment:fp,roughnessmap_fragment:pp,roughnessmap_pars_fragment:mp,shadowmap_pars_fragment:gp,shadowmap_pars_vertex:_p,shadowmap_vertex:vp,shadowmask_pars_fragment:xp,skinbase_vertex:Mp,skinning_pars_vertex:yp,skinning_vertex:Sp,skinnormal_vertex:Ep,specularmap_fragment:bp,specularmap_pars_fragment:Tp,tonemapping_fragment:wp,tonemapping_pars_fragment:Ap,transmission_fragment:Cp,transmission_pars_fragment:Rp,uv_pars_fragment:Pp,uv_pars_vertex:Ip,uv_vertex:Lp,worldpos_vertex:Dp,background_vert:Up,background_frag:Np,backgroundCube_vert:Fp,backgroundCube_frag:Op,cube_vert:Bp,cube_frag:kp,depth_vert:Hp,depth_frag:zp,distanceRGBA_vert:Vp,distanceRGBA_frag:Gp,equirect_vert:Wp,equirect_frag:Xp,linedashed_vert:qp,linedashed_frag:Yp,meshbasic_vert:$p,meshbasic_frag:Kp,meshlambert_vert:Zp,meshlambert_frag:jp,meshmatcap_vert:Jp,meshmatcap_frag:Qp,meshnormal_vert:em,meshnormal_frag:tm,meshphong_vert:nm,meshphong_frag:im,meshphysical_vert:sm,meshphysical_frag:rm,meshtoon_vert:am,meshtoon_frag:om,points_vert:lm,points_frag:cm,shadow_vert:dm,shadow_frag:um,sprite_vert:hm,sprite_frag:fm},le={common:{diffuse:{value:new Fe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new ze},alphaMap:{value:null},alphaMapTransform:{value:new ze},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new ze}},envmap:{envMap:{value:null},envMapRotation:{value:new ze},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new ze}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new ze}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new ze},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new ze},normalScale:{value:new we(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new ze},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new ze}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new ze}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new ze}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Fe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Fe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new ze},alphaTest:{value:0},uvTransform:{value:new ze}},sprite:{diffuse:{value:new Fe(16777215)},opacity:{value:1},center:{value:new we(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new ze},alphaMap:{value:null},alphaMapTransform:{value:new ze},alphaTest:{value:0}}},An={basic:{uniforms:zt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.fog]),vertexShader:Ge.meshbasic_vert,fragmentShader:Ge.meshbasic_frag},lambert:{uniforms:zt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Fe(0)}}]),vertexShader:Ge.meshlambert_vert,fragmentShader:Ge.meshlambert_frag},phong:{uniforms:zt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Fe(0)},specular:{value:new Fe(1118481)},shininess:{value:30}}]),vertexShader:Ge.meshphong_vert,fragmentShader:Ge.meshphong_frag},standard:{uniforms:zt([le.common,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.roughnessmap,le.metalnessmap,le.fog,le.lights,{emissive:{value:new Fe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ge.meshphysical_vert,fragmentShader:Ge.meshphysical_frag},toon:{uniforms:zt([le.common,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.gradientmap,le.fog,le.lights,{emissive:{value:new Fe(0)}}]),vertexShader:Ge.meshtoon_vert,fragmentShader:Ge.meshtoon_frag},matcap:{uniforms:zt([le.common,le.bumpmap,le.normalmap,le.displacementmap,le.fog,{matcap:{value:null}}]),vertexShader:Ge.meshmatcap_vert,fragmentShader:Ge.meshmatcap_frag},points:{uniforms:zt([le.points,le.fog]),vertexShader:Ge.points_vert,fragmentShader:Ge.points_frag},dashed:{uniforms:zt([le.common,le.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ge.linedashed_vert,fragmentShader:Ge.linedashed_frag},depth:{uniforms:zt([le.common,le.displacementmap]),vertexShader:Ge.depth_vert,fragmentShader:Ge.depth_frag},normal:{uniforms:zt([le.common,le.bumpmap,le.normalmap,le.displacementmap,{opacity:{value:1}}]),vertexShader:Ge.meshnormal_vert,fragmentShader:Ge.meshnormal_frag},sprite:{uniforms:zt([le.sprite,le.fog]),vertexShader:Ge.sprite_vert,fragmentShader:Ge.sprite_frag},background:{uniforms:{uvTransform:{value:new ze},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ge.background_vert,fragmentShader:Ge.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new ze}},vertexShader:Ge.backgroundCube_vert,fragmentShader:Ge.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ge.cube_vert,fragmentShader:Ge.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ge.equirect_vert,fragmentShader:Ge.equirect_frag},distanceRGBA:{uniforms:zt([le.common,le.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ge.distanceRGBA_vert,fragmentShader:Ge.distanceRGBA_frag},shadow:{uniforms:zt([le.lights,le.fog,{color:{value:new Fe(0)},opacity:{value:1}}]),vertexShader:Ge.shadow_vert,fragmentShader:Ge.shadow_frag}};An.physical={uniforms:zt([An.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new ze},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new ze},clearcoatNormalScale:{value:new we(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new ze},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new ze},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new ze},sheen:{value:0},sheenColor:{value:new Fe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new ze},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new ze},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new ze},transmissionSamplerSize:{value:new we},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new ze},attenuationDistance:{value:0},attenuationColor:{value:new Fe(0)},specularColor:{value:new Fe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new ze},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new ze},anisotropyVector:{value:new we},anisotropyMap:{value:null},anisotropyMapTransform:{value:new ze}}]),vertexShader:Ge.meshphysical_vert,fragmentShader:Ge.meshphysical_frag};const _r={r:0,b:0,g:0},fi=new Dn,pm=new at;function mm(i,e,t,n,s,r,a){const o=new Fe(0);let l=r===!0?0:1,c,d,u=null,f=0,p=null;function g(b){let S=b.isScene===!0?b.background:null;return S&&S.isTexture&&(S=(b.backgroundBlurriness>0?t:e).get(S)),S}function x(b){let S=!1;const R=g(b);R===null?h(o,l):R&&R.isColor&&(h(R,1),S=!0);const w=i.xr.getEnvironmentBlendMode();w==="additive"?n.buffers.color.setClear(0,0,0,1,a):w==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||S)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(b,S){const R=g(S);R&&(R.isCubeTexture||R.mapping===Gr)?(d===void 0&&(d=new re(new hn(1,1,1),new Wt({name:"BackgroundCubeMaterial",uniforms:rs(An.backgroundCube.uniforms),vertexShader:An.backgroundCube.vertexShader,fragmentShader:An.backgroundCube.fragmentShader,side:qt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),d.geometry.deleteAttribute("normal"),d.geometry.deleteAttribute("uv"),d.onBeforeRender=function(w,P,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(d.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(d)),fi.copy(S.backgroundRotation),fi.x*=-1,fi.y*=-1,fi.z*=-1,R.isCubeTexture&&R.isRenderTargetTexture===!1&&(fi.y*=-1,fi.z*=-1),d.material.uniforms.envMap.value=R,d.material.uniforms.flipEnvMap.value=R.isCubeTexture&&R.isRenderTargetTexture===!1?-1:1,d.material.uniforms.backgroundBlurriness.value=S.backgroundBlurriness,d.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,d.material.uniforms.backgroundRotation.value.setFromMatrix4(pm.makeRotationFromEuler(fi)),d.material.toneMapped=Ze.getTransfer(R.colorSpace)!==st,(u!==R||f!==R.version||p!==i.toneMapping)&&(d.material.needsUpdate=!0,u=R,f=R.version,p=i.toneMapping),d.layers.enableAll(),b.unshift(d,d.geometry,d.material,0,0,null)):R&&R.isTexture&&(c===void 0&&(c=new re(new fn(2,2),new Wt({name:"BackgroundMaterial",uniforms:rs(An.background.uniforms),vertexShader:An.background.vertexShader,fragmentShader:An.background.fragmentShader,side:ri,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=R,c.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,c.material.toneMapped=Ze.getTransfer(R.colorSpace)!==st,R.matrixAutoUpdate===!0&&R.updateMatrix(),c.material.uniforms.uvTransform.value.copy(R.matrix),(u!==R||f!==R.version||p!==i.toneMapping)&&(c.material.needsUpdate=!0,u=R,f=R.version,p=i.toneMapping),c.layers.enableAll(),b.unshift(c,c.geometry,c.material,0,0,null))}function h(b,S){b.getRGB(_r,sd(i)),n.buffers.color.setClear(_r.r,_r.g,_r.b,S,a)}function E(){d!==void 0&&(d.geometry.dispose(),d.material.dispose(),d=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(b,S=1){o.set(b),l=S,h(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(b){l=b,h(o,l)},render:x,addToRenderList:m,dispose:E}}function gm(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=f(null);let r=s,a=!1;function o(v,A,N,X,O){let k=!1;const U=u(X,N,A);r!==U&&(r=U,c(r.object)),k=p(v,X,N,O),k&&g(v,X,N,O),O!==null&&e.update(O,i.ELEMENT_ARRAY_BUFFER),(k||a)&&(a=!1,S(v,A,N,X),O!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(O).buffer))}function l(){return i.createVertexArray()}function c(v){return i.bindVertexArray(v)}function d(v){return i.deleteVertexArray(v)}function u(v,A,N){const X=N.wireframe===!0;let O=n[v.id];O===void 0&&(O={},n[v.id]=O);let k=O[A.id];k===void 0&&(k={},O[A.id]=k);let U=k[X];return U===void 0&&(U=f(l()),k[X]=U),U}function f(v){const A=[],N=[],X=[];for(let O=0;O<t;O++)A[O]=0,N[O]=0,X[O]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:A,enabledAttributes:N,attributeDivisors:X,object:v,attributes:{},index:null}}function p(v,A,N,X){const O=r.attributes,k=A.attributes;let U=0;const q=N.getAttributes();for(const V in q)if(q[V].location>=0){const ee=O[V];let de=k[V];if(de===void 0&&(V==="instanceMatrix"&&v.instanceMatrix&&(de=v.instanceMatrix),V==="instanceColor"&&v.instanceColor&&(de=v.instanceColor)),ee===void 0||ee.attribute!==de||de&&ee.data!==de.data)return!0;U++}return r.attributesNum!==U||r.index!==X}function g(v,A,N,X){const O={},k=A.attributes;let U=0;const q=N.getAttributes();for(const V in q)if(q[V].location>=0){let ee=k[V];ee===void 0&&(V==="instanceMatrix"&&v.instanceMatrix&&(ee=v.instanceMatrix),V==="instanceColor"&&v.instanceColor&&(ee=v.instanceColor));const de={};de.attribute=ee,ee&&ee.data&&(de.data=ee.data),O[V]=de,U++}r.attributes=O,r.attributesNum=U,r.index=X}function x(){const v=r.newAttributes;for(let A=0,N=v.length;A<N;A++)v[A]=0}function m(v){h(v,0)}function h(v,A){const N=r.newAttributes,X=r.enabledAttributes,O=r.attributeDivisors;N[v]=1,X[v]===0&&(i.enableVertexAttribArray(v),X[v]=1),O[v]!==A&&(i.vertexAttribDivisor(v,A),O[v]=A)}function E(){const v=r.newAttributes,A=r.enabledAttributes;for(let N=0,X=A.length;N<X;N++)A[N]!==v[N]&&(i.disableVertexAttribArray(N),A[N]=0)}function b(v,A,N,X,O,k,U){U===!0?i.vertexAttribIPointer(v,A,N,O,k):i.vertexAttribPointer(v,A,N,X,O,k)}function S(v,A,N,X){x();const O=X.attributes,k=N.getAttributes(),U=A.defaultAttributeValues;for(const q in k){const V=k[q];if(V.location>=0){let J=O[q];if(J===void 0&&(q==="instanceMatrix"&&v.instanceMatrix&&(J=v.instanceMatrix),q==="instanceColor"&&v.instanceColor&&(J=v.instanceColor)),J!==void 0){const ee=J.normalized,de=J.itemSize,Re=e.get(J);if(Re===void 0)continue;const $e=Re.buffer,je=Re.type,Q=Re.bytesPerElement,H=je===i.INT||je===i.UNSIGNED_INT||J.gpuType===zo;if(J.isInterleavedBufferAttribute){const $=J.data,ue=$.stride,Ae=J.offset;if($.isInstancedInterleavedBuffer){for(let xe=0;xe<V.locationSize;xe++)h(V.location+xe,$.meshPerAttribute);v.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=$.meshPerAttribute*$.count)}else for(let xe=0;xe<V.locationSize;xe++)m(V.location+xe);i.bindBuffer(i.ARRAY_BUFFER,$e);for(let xe=0;xe<V.locationSize;xe++)b(V.location+xe,de/V.locationSize,je,ee,ue*Q,(Ae+de/V.locationSize*xe)*Q,H)}else{if(J.isInstancedBufferAttribute){for(let $=0;$<V.locationSize;$++)h(V.location+$,J.meshPerAttribute);v.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let $=0;$<V.locationSize;$++)m(V.location+$);i.bindBuffer(i.ARRAY_BUFFER,$e);for(let $=0;$<V.locationSize;$++)b(V.location+$,de/V.locationSize,je,ee,de*Q,de/V.locationSize*$*Q,H)}}else if(U!==void 0){const ee=U[q];if(ee!==void 0)switch(ee.length){case 2:i.vertexAttrib2fv(V.location,ee);break;case 3:i.vertexAttrib3fv(V.location,ee);break;case 4:i.vertexAttrib4fv(V.location,ee);break;default:i.vertexAttrib1fv(V.location,ee)}}}}E()}function R(){I();for(const v in n){const A=n[v];for(const N in A){const X=A[N];for(const O in X)d(X[O].object),delete X[O];delete A[N]}delete n[v]}}function w(v){if(n[v.id]===void 0)return;const A=n[v.id];for(const N in A){const X=A[N];for(const O in X)d(X[O].object),delete X[O];delete A[N]}delete n[v.id]}function P(v){for(const A in n){const N=n[A];if(N[v.id]===void 0)continue;const X=N[v.id];for(const O in X)d(X[O].object),delete X[O];delete N[v.id]}}function I(){_(),a=!0,r!==s&&(r=s,c(r.object))}function _(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:I,resetDefaultState:_,dispose:R,releaseStatesOfGeometry:w,releaseStatesOfProgram:P,initAttributes:x,enableAttribute:m,disableUnusedAttributes:E}}function _m(i,e,t){let n;function s(c){n=c}function r(c,d){i.drawArrays(n,c,d),t.update(d,n,1)}function a(c,d,u){u!==0&&(i.drawArraysInstanced(n,c,d,u),t.update(d,n,u))}function o(c,d,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,d,0,u);let p=0;for(let g=0;g<u;g++)p+=d[g];t.update(p,n,1)}function l(c,d,u,f){if(u===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let g=0;g<c.length;g++)a(c[g],d[g],f[g]);else{p.multiDrawArraysInstancedWEBGL(n,c,0,d,0,f,0,u);let g=0;for(let x=0;x<u;x++)g+=d[x]*f[x];t.update(g,n,1)}}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function vm(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){const P=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(P.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(P){return!(P!==Mn&&n.convert(P)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(P){const I=P===Wn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(P!==Ln&&n.convert(P)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&P!==Cn&&!I)}function l(P){if(P==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";P="mediump"}return P==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const d=l(c);d!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",d,"instead."),c=d);const u=t.logarithmicDepthBuffer===!0,f=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),p=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),h=i.getParameter(i.MAX_VERTEX_ATTRIBS),E=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),b=i.getParameter(i.MAX_VARYING_VECTORS),S=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),R=g>0,w=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:m,maxAttributes:h,maxVertexUniforms:E,maxVaryings:b,maxFragmentUniforms:S,vertexTextures:R,maxSamples:w}}function xm(i){const e=this;let t=null,n=0,s=!1,r=!1;const a=new ti,o=new ze,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,f){const p=u.length!==0||f||n!==0||s;return s=f,n=u.length,p},this.beginShadows=function(){r=!0,d(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,f){t=d(u,f,0)},this.setState=function(u,f,p){const g=u.clippingPlanes,x=u.clipIntersection,m=u.clipShadows,h=i.get(u);if(!s||g===null||g.length===0||r&&!m)r?d(null):c();else{const E=r?0:n,b=E*4;let S=h.clippingState||null;l.value=S,S=d(g,f,b,p);for(let R=0;R!==b;++R)S[R]=t[R];h.clippingState=S,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=E}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function d(u,f,p,g){const x=u!==null?u.length:0;let m=null;if(x!==0){if(m=l.value,g!==!0||m===null){const h=p+x*4,E=f.matrixWorldInverse;o.getNormalMatrix(E),(m===null||m.length<h)&&(m=new Float32Array(h));for(let b=0,S=p;b!==x;++b,S+=4)a.copy(u[b]).applyMatrix4(E,o),a.normal.toArray(m,S),m[S+3]=a.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,m}}function Mm(i){let e=new WeakMap;function t(a,o){return o===Qa?a.mapping=ns:o===eo&&(a.mapping=is),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===Qa||o===eo)if(e.has(a)){const l=e.get(a).texture;return t(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const c=new uh(l.height);return c.fromEquirectangularTexture(i,a),e.set(a,c),a.addEventListener("dispose",s),t(c.texture,a.mapping)}else return null}}return a}function s(a){const o=a.target;o.removeEventListener("dispose",s);const l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}const Ki=4,Ql=[.125,.215,.35,.446,.526,.582],vi=20,ba=new Wr,ec=new Fe;let Ta=null,wa=0,Aa=0,Ca=!1;const gi=(1+Math.sqrt(5))/2,qi=1/gi,tc=[new D(-gi,qi,0),new D(gi,qi,0),new D(-qi,0,gi),new D(qi,0,gi),new D(0,gi,-qi),new D(0,gi,qi),new D(-1,1,-1),new D(1,1,-1),new D(-1,1,1),new D(1,1,1)],ym=new D;class nc{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,s=100,r={}){const{size:a=256,position:o=ym}=r;Ta=this._renderer.getRenderTarget(),wa=this._renderer.getActiveCubeFace(),Aa=this._renderer.getActiveMipmapLevel(),Ca=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,s,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=rc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=sc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Ta,wa,Aa),this._renderer.xr.enabled=Ca,e.scissorTest=!1,vr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ns||e.mapping===is?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Ta=this._renderer.getRenderTarget(),wa=this._renderer.getActiveCubeFace(),Aa=this._renderer.getActiveMipmapLevel(),Ca=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:xn,minFilter:xn,generateMipmaps:!1,type:Wn,format:Mn,colorSpace:ss,depthBuffer:!1},s=ic(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ic(e,t,n);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Sm(r)),this._blurMaterial=Em(r,e,t)}return s}_compileMaterial(e){const t=new re(this._lodPlanes[0],e);this._renderer.compile(t,ba)}_sceneToCubeUV(e,t,n,s,r){const l=new cn(90,1,t,n),c=[1,-1,1,1,1,1],d=[1,1,1,-1,-1,-1],u=this._renderer,f=u.autoClear,p=u.toneMapping;u.getClearColor(ec),u.toneMapping=si,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null));const x=new cs({name:"PMREM.Background",side:qt,depthWrite:!1,depthTest:!1}),m=new re(new hn,x);let h=!1;const E=e.background;E?E.isColor&&(x.color.copy(E),e.background=null,h=!0):(x.color.copy(ec),h=!0);for(let b=0;b<6;b++){const S=b%3;S===0?(l.up.set(0,c[b],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+d[b],r.y,r.z)):S===1?(l.up.set(0,0,c[b]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+d[b],r.z)):(l.up.set(0,c[b],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+d[b]));const R=this._cubeSize;vr(s,S*R,b>2?R:0,R,R),u.setRenderTarget(s),h&&u.render(m,l),u.render(e,l)}m.geometry.dispose(),m.material.dispose(),u.toneMapping=p,u.autoClear=f,e.background=E}_textureToCubeUV(e,t){const n=this._renderer,s=e.mapping===ns||e.mapping===is;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=rc()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=sc());const r=s?this._cubemapMaterial:this._equirectMaterial,a=new re(this._lodPlanes[0],r),o=r.uniforms;o.envMap.value=e;const l=this._cubeSize;vr(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(a,ba)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const s=this._lodPlanes.length;for(let r=1;r<s;r++){const a=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),o=tc[(s-r-1)%tc.length];this._blur(e,r-1,r,a,o)}t.autoClear=n}_blur(e,t,n,s,r){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,s,"latitudinal",r),this._halfBlur(a,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,a,o){const l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const d=3,u=new re(this._lodPlanes[s],c),f=c.uniforms,p=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*p):2*Math.PI/(2*vi-1),x=r/g,m=isFinite(r)?1+Math.floor(d*x):vi;m>vi&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${vi}`);const h=[];let E=0;for(let P=0;P<vi;++P){const I=P/x,_=Math.exp(-I*I/2);h.push(_),P===0?E+=_:P<m&&(E+=2*_)}for(let P=0;P<h.length;P++)h[P]=h[P]/E;f.envMap.value=e.texture,f.samples.value=m,f.weights.value=h,f.latitudinal.value=a==="latitudinal",o&&(f.poleAxis.value=o);const{_lodMax:b}=this;f.dTheta.value=g,f.mipInt.value=b-n;const S=this._sizeLods[s],R=3*S*(s>b-Ki?s-b+Ki:0),w=4*(this._cubeSize-S);vr(t,R,w,3*S,2*S),l.setRenderTarget(t),l.render(u,ba)}}function Sm(i){const e=[],t=[],n=[];let s=i;const r=i-Ki+1+Ql.length;for(let a=0;a<r;a++){const o=Math.pow(2,s);t.push(o);let l=1/o;a>i-Ki?l=Ql[a-i+Ki-1]:a===0&&(l=0),n.push(l);const c=1/(o-2),d=-c,u=1+c,f=[d,d,u,d,u,u,d,d,u,u,d,u],p=6,g=6,x=3,m=2,h=1,E=new Float32Array(x*g*p),b=new Float32Array(m*g*p),S=new Float32Array(h*g*p);for(let w=0;w<p;w++){const P=w%3*2/3-1,I=w>2?0:-1,_=[P,I,0,P+2/3,I,0,P+2/3,I+1,0,P,I,0,P+2/3,I+1,0,P,I+1,0];E.set(_,x*g*w),b.set(f,m*g*w);const v=[w,w,w,w,w,w];S.set(v,h*g*w)}const R=new Bt;R.setAttribute("position",new tn(E,x)),R.setAttribute("uv",new tn(b,m)),R.setAttribute("faceIndex",new tn(S,h)),e.push(R),s>Ki&&s--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function ic(i,e,t){const n=new Sn(i,e,t);return n.texture.mapping=Gr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function vr(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function Em(i,e,t){const n=new Float32Array(vi),s=new D(0,1,0);return new Wt({name:"SphericalGaussianBlur",defines:{n:vi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:al(),fragmentShader:`

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
		`,blending:Gn,depthTest:!1,depthWrite:!1})}function sc(){return new Wt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:al(),fragmentShader:`

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
		`,blending:Gn,depthTest:!1,depthWrite:!1})}function rc(){return new Wt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:al(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Gn,depthTest:!1,depthWrite:!1})}function al(){return`

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
	`}function bm(i){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){const l=o.mapping,c=l===Qa||l===eo,d=l===ns||l===is;if(c||d){let u=e.get(o);const f=u!==void 0?u.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==f)return t===null&&(t=new nc(i)),u=c?t.fromEquirectangular(o,u):t.fromCubemap(o,u),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),u.texture;if(u!==void 0)return u.texture;{const p=o.image;return c&&p&&p.height>0||d&&p&&s(p)?(t===null&&(t=new nc(i)),u=c?t.fromEquirectangular(o):t.fromCubemap(o),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),o.addEventListener("dispose",r),u.texture):null}}}return o}function s(o){let l=0;const c=6;for(let d=0;d<c;d++)o[d]!==void 0&&l++;return l===c}function r(o){const l=o.target;l.removeEventListener("dispose",r);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function Tm(i){const e={};function t(n){if(e[n]!==void 0)return e[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const s=t(n);return s===null&&Fs("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function wm(i,e,t,n){const s={},r=new WeakMap;function a(u){const f=u.target;f.index!==null&&e.remove(f.index);for(const g in f.attributes)e.remove(f.attributes[g]);f.removeEventListener("dispose",a),delete s[f.id];const p=r.get(f);p&&(e.remove(p),r.delete(f)),n.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function o(u,f){return s[f.id]===!0||(f.addEventListener("dispose",a),s[f.id]=!0,t.memory.geometries++),f}function l(u){const f=u.attributes;for(const p in f)e.update(f[p],i.ARRAY_BUFFER)}function c(u){const f=[],p=u.index,g=u.attributes.position;let x=0;if(p!==null){const E=p.array;x=p.version;for(let b=0,S=E.length;b<S;b+=3){const R=E[b+0],w=E[b+1],P=E[b+2];f.push(R,w,w,P,P,R)}}else if(g!==void 0){const E=g.array;x=g.version;for(let b=0,S=E.length/3-1;b<S;b+=3){const R=b+0,w=b+1,P=b+2;f.push(R,w,w,P,P,R)}}else return;const m=new(Qc(f)?id:nd)(f,1);m.version=x;const h=r.get(u);h&&e.remove(h),r.set(u,m)}function d(u){const f=r.get(u);if(f){const p=u.index;p!==null&&f.version<p.version&&c(u)}else c(u);return r.get(u)}return{get:o,update:l,getWireframeAttribute:d}}function Am(i,e,t){let n;function s(f){n=f}let r,a;function o(f){r=f.type,a=f.bytesPerElement}function l(f,p){i.drawElements(n,p,r,f*a),t.update(p,n,1)}function c(f,p,g){g!==0&&(i.drawElementsInstanced(n,p,r,f*a,g),t.update(p,n,g))}function d(f,p,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,p,0,r,f,0,g);let m=0;for(let h=0;h<g;h++)m+=p[h];t.update(m,n,1)}function u(f,p,g,x){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let h=0;h<f.length;h++)c(f[h]/a,p[h],x[h]);else{m.multiDrawElementsInstancedWEBGL(n,p,0,r,f,0,x,0,g);let h=0;for(let E=0;E<g;E++)h+=p[E]*x[E];t.update(h,n,1)}}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=d,this.renderMultiDrawInstances=u}function Cm(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(r/3);break;case i.LINES:t.lines+=o*(r/2);break;case i.LINE_STRIP:t.lines+=o*(r-1);break;case i.LINE_LOOP:t.lines+=o*r;break;case i.POINTS:t.points+=o*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function Rm(i,e,t){const n=new WeakMap,s=new rt;function r(a,o,l){const c=a.morphTargetInfluences,d=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=d!==void 0?d.length:0;let f=n.get(o);if(f===void 0||f.count!==u){let v=function(){I.dispose(),n.delete(o),o.removeEventListener("dispose",v)};var p=v;f!==void 0&&f.texture.dispose();const g=o.morphAttributes.position!==void 0,x=o.morphAttributes.normal!==void 0,m=o.morphAttributes.color!==void 0,h=o.morphAttributes.position||[],E=o.morphAttributes.normal||[],b=o.morphAttributes.color||[];let S=0;g===!0&&(S=1),x===!0&&(S=2),m===!0&&(S=3);let R=o.attributes.position.count*S,w=1;R>e.maxTextureSize&&(w=Math.ceil(R/e.maxTextureSize),R=e.maxTextureSize);const P=new Float32Array(R*w*4*u),I=new ed(P,R,w,u);I.type=Cn,I.needsUpdate=!0;const _=S*4;for(let A=0;A<u;A++){const N=h[A],X=E[A],O=b[A],k=R*w*4*A;for(let U=0;U<N.count;U++){const q=U*_;g===!0&&(s.fromBufferAttribute(N,U),P[k+q+0]=s.x,P[k+q+1]=s.y,P[k+q+2]=s.z,P[k+q+3]=0),x===!0&&(s.fromBufferAttribute(X,U),P[k+q+4]=s.x,P[k+q+5]=s.y,P[k+q+6]=s.z,P[k+q+7]=0),m===!0&&(s.fromBufferAttribute(O,U),P[k+q+8]=s.x,P[k+q+9]=s.y,P[k+q+10]=s.z,P[k+q+11]=O.itemSize===4?s.w:1)}}f={count:u,texture:I,size:new we(R,w)},n.set(o,f),o.addEventListener("dispose",v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const x=o.morphTargetsRelative?1:1-g;l.getUniforms().setValue(i,"morphTargetBaseInfluence",x),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",f.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",f.size)}return{update:r}}function Pm(i,e,t,n){let s=new WeakMap;function r(l){const c=n.render.frame,d=l.geometry,u=e.get(l,d);if(s.get(u)!==c&&(e.update(u),s.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),s.get(l)!==c&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){const f=l.skeleton;s.get(f)!==c&&(f.update(),s.set(f,c))}return u}function a(){s=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:r,dispose:a}}const pd=new Ot,ac=new dd(1,1),md=new ed,gd=new Ku,_d=new ad,oc=[],lc=[],cc=new Float32Array(16),dc=new Float32Array(9),uc=new Float32Array(4);function ds(i,e,t){const n=i[0];if(n<=0||n>0)return i;const s=e*t;let r=oc[s];if(r===void 0&&(r=new Float32Array(s),oc[s]=r),e!==0){n.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(r,o)}return r}function Rt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Pt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Xr(i,e){let t=lc[e];t===void 0&&(t=new Int32Array(e),lc[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function Im(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function Lm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;i.uniform2fv(this.addr,e),Pt(t,e)}}function Dm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Rt(t,e))return;i.uniform3fv(this.addr,e),Pt(t,e)}}function Um(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;i.uniform4fv(this.addr,e),Pt(t,e)}}function Nm(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Rt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Pt(t,e)}else{if(Rt(t,n))return;uc.set(n),i.uniformMatrix2fv(this.addr,!1,uc),Pt(t,n)}}function Fm(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Rt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Pt(t,e)}else{if(Rt(t,n))return;dc.set(n),i.uniformMatrix3fv(this.addr,!1,dc),Pt(t,n)}}function Om(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Rt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Pt(t,e)}else{if(Rt(t,n))return;cc.set(n),i.uniformMatrix4fv(this.addr,!1,cc),Pt(t,n)}}function Bm(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function km(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;i.uniform2iv(this.addr,e),Pt(t,e)}}function Hm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Rt(t,e))return;i.uniform3iv(this.addr,e),Pt(t,e)}}function zm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;i.uniform4iv(this.addr,e),Pt(t,e)}}function Vm(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function Gm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;i.uniform2uiv(this.addr,e),Pt(t,e)}}function Wm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Rt(t,e))return;i.uniform3uiv(this.addr,e),Pt(t,e)}}function Xm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;i.uniform4uiv(this.addr,e),Pt(t,e)}}function qm(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(ac.compareFunction=Jc,r=ac):r=pd,t.setTexture2D(e||r,s)}function Ym(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||gd,s)}function $m(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||_d,s)}function Km(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||md,s)}function Zm(i){switch(i){case 5126:return Im;case 35664:return Lm;case 35665:return Dm;case 35666:return Um;case 35674:return Nm;case 35675:return Fm;case 35676:return Om;case 5124:case 35670:return Bm;case 35667:case 35671:return km;case 35668:case 35672:return Hm;case 35669:case 35673:return zm;case 5125:return Vm;case 36294:return Gm;case 36295:return Wm;case 36296:return Xm;case 35678:case 36198:case 36298:case 36306:case 35682:return qm;case 35679:case 36299:case 36307:return Ym;case 35680:case 36300:case 36308:case 36293:return $m;case 36289:case 36303:case 36311:case 36292:return Km}}function jm(i,e){i.uniform1fv(this.addr,e)}function Jm(i,e){const t=ds(e,this.size,2);i.uniform2fv(this.addr,t)}function Qm(i,e){const t=ds(e,this.size,3);i.uniform3fv(this.addr,t)}function eg(i,e){const t=ds(e,this.size,4);i.uniform4fv(this.addr,t)}function tg(i,e){const t=ds(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function ng(i,e){const t=ds(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function ig(i,e){const t=ds(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function sg(i,e){i.uniform1iv(this.addr,e)}function rg(i,e){i.uniform2iv(this.addr,e)}function ag(i,e){i.uniform3iv(this.addr,e)}function og(i,e){i.uniform4iv(this.addr,e)}function lg(i,e){i.uniform1uiv(this.addr,e)}function cg(i,e){i.uniform2uiv(this.addr,e)}function dg(i,e){i.uniform3uiv(this.addr,e)}function ug(i,e){i.uniform4uiv(this.addr,e)}function hg(i,e,t){const n=this.cache,s=e.length,r=Xr(t,s);Rt(n,r)||(i.uniform1iv(this.addr,r),Pt(n,r));for(let a=0;a!==s;++a)t.setTexture2D(e[a]||pd,r[a])}function fg(i,e,t){const n=this.cache,s=e.length,r=Xr(t,s);Rt(n,r)||(i.uniform1iv(this.addr,r),Pt(n,r));for(let a=0;a!==s;++a)t.setTexture3D(e[a]||gd,r[a])}function pg(i,e,t){const n=this.cache,s=e.length,r=Xr(t,s);Rt(n,r)||(i.uniform1iv(this.addr,r),Pt(n,r));for(let a=0;a!==s;++a)t.setTextureCube(e[a]||_d,r[a])}function mg(i,e,t){const n=this.cache,s=e.length,r=Xr(t,s);Rt(n,r)||(i.uniform1iv(this.addr,r),Pt(n,r));for(let a=0;a!==s;++a)t.setTexture2DArray(e[a]||md,r[a])}function gg(i){switch(i){case 5126:return jm;case 35664:return Jm;case 35665:return Qm;case 35666:return eg;case 35674:return tg;case 35675:return ng;case 35676:return ig;case 5124:case 35670:return sg;case 35667:case 35671:return rg;case 35668:case 35672:return ag;case 35669:case 35673:return og;case 5125:return lg;case 36294:return cg;case 36295:return dg;case 36296:return ug;case 35678:case 36198:case 36298:case 36306:case 35682:return hg;case 35679:case 36299:case 36307:return fg;case 35680:case 36300:case 36308:case 36293:return pg;case 36289:case 36303:case 36311:case 36292:return mg}}class _g{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Zm(t.type)}}class vg{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=gg(t.type)}}class xg{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const s=this.seq;for(let r=0,a=s.length;r!==a;++r){const o=s[r];o.setValue(e,t[o.id],n)}}}const Ra=/(\w+)(\])?(\[|\.)?/g;function hc(i,e){i.seq.push(e),i.map[e.id]=e}function Mg(i,e,t){const n=i.name,s=n.length;for(Ra.lastIndex=0;;){const r=Ra.exec(n),a=Ra.lastIndex;let o=r[1];const l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){hc(t,c===void 0?new _g(o,i,e):new vg(o,i,e));break}else{let u=t.map[o];u===void 0&&(u=new xg(o),hc(t,u)),t=u}}}class Pr{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){const r=e.getActiveUniform(t,s),a=e.getUniformLocation(t,r.name);Mg(r,a,this)}}setValue(e,t,n,s){const r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){const s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,a=t.length;r!==a;++r){const o=t[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,s)}}static seqWithValue(e,t){const n=[];for(let s=0,r=e.length;s!==r;++s){const a=e[s];a.id in t&&n.push(a)}return n}}function fc(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const yg=37297;let Sg=0;function Eg(i,e){const t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=s;a<r;a++){const o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}const pc=new ze;function bg(i){Ze._getMatrix(pc,Ze.workingColorSpace,i);const e=`mat3( ${pc.elements.map(t=>t.toFixed(4))} )`;switch(Ze.getTransfer(i)){case Nr:return[e,"LinearTransferOETF"];case st:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function mc(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const a=/ERROR: 0:(\d+)/.exec(r);if(a){const o=parseInt(a[1]);return t.toUpperCase()+`

`+r+`

`+Eg(i.getShaderSource(e),o)}else return r}function Tg(i,e){const t=bg(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function wg(i,e){let t;switch(e){case lu:t="Linear";break;case cu:t="Reinhard";break;case du:t="Cineon";break;case Vc:t="ACESFilmic";break;case hu:t="AgX";break;case fu:t="Neutral";break;case uu:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const xr=new D;function Ag(){Ze.getLuminanceCoefficients(xr);const i=xr.x.toFixed(4),e=xr.y.toFixed(4),t=xr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Cg(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ts).join(`
`)}function Rg(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Pg(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(e,s),a=r.name;let o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function Ts(i){return i!==""}function gc(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function _c(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Ig=/^[ \t]*#include +<([\w\d./]+)>/gm;function No(i){return i.replace(Ig,Dg)}const Lg=new Map;function Dg(i,e){let t=Ge[e];if(t===void 0){const n=Lg.get(e);if(n!==void 0)t=Ge[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return No(t)}const Ug=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function vc(i){return i.replace(Ug,Ng)}function Ng(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function xc(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}function Fg(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===kc?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===Hc?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===Hn&&(e="SHADOWMAP_TYPE_VSM"),e}function Og(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case ns:case is:e="ENVMAP_TYPE_CUBE";break;case Gr:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Bg(i){let e="ENVMAP_MODE_REFLECTION";return i.envMap&&i.envMapMode===is&&(e="ENVMAP_MODE_REFRACTION"),e}function kg(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case zc:e="ENVMAP_BLENDING_MULTIPLY";break;case au:e="ENVMAP_BLENDING_MIX";break;case ou:e="ENVMAP_BLENDING_ADD";break}return e}function Hg(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function zg(i,e,t,n){const s=i.getContext(),r=t.defines;let a=t.vertexShader,o=t.fragmentShader;const l=Fg(t),c=Og(t),d=Bg(t),u=kg(t),f=Hg(t),p=Cg(t),g=Rg(r),x=s.createProgram();let m,h,E=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Ts).join(`
`),m.length>0&&(m+=`
`),h=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Ts).join(`
`),h.length>0&&(h+=`
`)):(m=[xc(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+d:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ts).join(`
`),h=[xc(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+d:"",t.envMap?"#define "+u:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==si?"#define TONE_MAPPING":"",t.toneMapping!==si?Ge.tonemapping_pars_fragment:"",t.toneMapping!==si?wg("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ge.colorspace_pars_fragment,Tg("linearToOutputTexel",t.outputColorSpace),Ag(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ts).join(`
`)),a=No(a),a=gc(a,t),a=_c(a,t),o=No(o),o=gc(o,t),o=_c(o,t),a=vc(a),o=vc(o),t.isRawShaderMaterial!==!0&&(E=`#version 300 es
`,m=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,h=["#define varying in",t.glslVersion===yl?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===yl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+h);const b=E+m+a,S=E+h+o,R=fc(s,s.VERTEX_SHADER,b),w=fc(s,s.FRAGMENT_SHADER,S);s.attachShader(x,R),s.attachShader(x,w),t.index0AttributeName!==void 0?s.bindAttribLocation(x,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(x,0,"position"),s.linkProgram(x);function P(A){if(i.debug.checkShaderErrors){const N=s.getProgramInfoLog(x)||"",X=s.getShaderInfoLog(R)||"",O=s.getShaderInfoLog(w)||"",k=N.trim(),U=X.trim(),q=O.trim();let V=!0,J=!0;if(s.getProgramParameter(x,s.LINK_STATUS)===!1)if(V=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,x,R,w);else{const ee=mc(s,R,"vertex"),de=mc(s,w,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(x,s.VALIDATE_STATUS)+`

Material Name: `+A.name+`
Material Type: `+A.type+`

Program Info Log: `+k+`
`+ee+`
`+de)}else k!==""?console.warn("THREE.WebGLProgram: Program Info Log:",k):(U===""||q==="")&&(J=!1);J&&(A.diagnostics={runnable:V,programLog:k,vertexShader:{log:U,prefix:m},fragmentShader:{log:q,prefix:h}})}s.deleteShader(R),s.deleteShader(w),I=new Pr(s,x),_=Pg(s,x)}let I;this.getUniforms=function(){return I===void 0&&P(this),I};let _;this.getAttributes=function(){return _===void 0&&P(this),_};let v=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return v===!1&&(v=s.getProgramParameter(x,yg)),v},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(x),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Sg++,this.cacheKey=e,this.usedTimes=1,this.program=x,this.vertexShader=R,this.fragmentShader=w,this}let Vg=0;class Gg{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(s)===!1&&(a.add(s),s.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new Wg(e),t.set(e,n)),n}}class Wg{constructor(e){this.id=Vg++,this.code=e,this.usedTimes=0}}function Xg(i,e,t,n,s,r,a){const o=new jo,l=new Gg,c=new Set,d=[],u=s.logarithmicDepthBuffer,f=s.vertexTextures;let p=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(_){return c.add(_),_===0?"uv":`uv${_}`}function m(_,v,A,N,X){const O=N.fog,k=X.geometry,U=_.isMeshStandardMaterial?N.environment:null,q=(_.isMeshStandardMaterial?t:e).get(_.envMap||U),V=q&&q.mapping===Gr?q.image.height:null,J=g[_.type];_.precision!==null&&(p=s.getMaxPrecision(_.precision),p!==_.precision&&console.warn("THREE.WebGLProgram.getParameters:",_.precision,"not supported, using",p,"instead."));const ee=k.morphAttributes.position||k.morphAttributes.normal||k.morphAttributes.color,de=ee!==void 0?ee.length:0;let Re=0;k.morphAttributes.position!==void 0&&(Re=1),k.morphAttributes.normal!==void 0&&(Re=2),k.morphAttributes.color!==void 0&&(Re=3);let $e,je,Q,H;if(J){const Je=An[J];$e=Je.vertexShader,je=Je.fragmentShader}else $e=_.vertexShader,je=_.fragmentShader,l.update(_),Q=l.getVertexShaderID(_),H=l.getFragmentShaderID(_);const $=i.getRenderTarget(),ue=i.state.buffers.depth.getReversed(),Ae=X.isInstancedMesh===!0,xe=X.isBatchedMesh===!0,Be=!!_.map,Mt=!!_.matcap,C=!!q,ut=!!_.aoMap,ke=!!_.lightMap,De=!!_.bumpMap,Me=!!_.normalMap,ht=!!_.displacementMap,ye=!!_.emissiveMap,Ve=!!_.metalnessMap,It=!!_.roughnessMap,xt=_.anisotropy>0,T=_.clearcoat>0,M=_.dispersion>0,z=_.iridescence>0,K=_.sheen>0,j=_.transmission>0,Y=xt&&!!_.anisotropyMap,Te=T&&!!_.clearcoatMap,ae=T&&!!_.clearcoatNormalMap,Se=T&&!!_.clearcoatRoughnessMap,Ee=z&&!!_.iridescenceMap,ie=z&&!!_.iridescenceThicknessMap,fe=K&&!!_.sheenColorMap,Le=K&&!!_.sheenRoughnessMap,be=!!_.specularMap,ce=!!_.specularColorMap,He=!!_.specularIntensityMap,L=j&&!!_.transmissionMap,se=j&&!!_.thicknessMap,oe=!!_.gradientMap,me=!!_.alphaMap,te=_.alphaTest>0,Z=!!_.alphaHash,ve=!!_.extensions;let Oe=si;_.toneMapped&&($===null||$.isXRRenderTarget===!0)&&(Oe=i.toneMapping);const lt={shaderID:J,shaderType:_.type,shaderName:_.name,vertexShader:$e,fragmentShader:je,defines:_.defines,customVertexShaderID:Q,customFragmentShaderID:H,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:p,batching:xe,batchingColor:xe&&X._colorsTexture!==null,instancing:Ae,instancingColor:Ae&&X.instanceColor!==null,instancingMorph:Ae&&X.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:$===null?i.outputColorSpace:$.isXRRenderTarget===!0?$.texture.colorSpace:ss,alphaToCoverage:!!_.alphaToCoverage,map:Be,matcap:Mt,envMap:C,envMapMode:C&&q.mapping,envMapCubeUVHeight:V,aoMap:ut,lightMap:ke,bumpMap:De,normalMap:Me,displacementMap:f&&ht,emissiveMap:ye,normalMapObjectSpace:Me&&_.normalMapType===_u,normalMapTangentSpace:Me&&_.normalMapType===jc,metalnessMap:Ve,roughnessMap:It,anisotropy:xt,anisotropyMap:Y,clearcoat:T,clearcoatMap:Te,clearcoatNormalMap:ae,clearcoatRoughnessMap:Se,dispersion:M,iridescence:z,iridescenceMap:Ee,iridescenceThicknessMap:ie,sheen:K,sheenColorMap:fe,sheenRoughnessMap:Le,specularMap:be,specularColorMap:ce,specularIntensityMap:He,transmission:j,transmissionMap:L,thicknessMap:se,gradientMap:oe,opaque:_.transparent===!1&&_.blending===Ji&&_.alphaToCoverage===!1,alphaMap:me,alphaTest:te,alphaHash:Z,combine:_.combine,mapUv:Be&&x(_.map.channel),aoMapUv:ut&&x(_.aoMap.channel),lightMapUv:ke&&x(_.lightMap.channel),bumpMapUv:De&&x(_.bumpMap.channel),normalMapUv:Me&&x(_.normalMap.channel),displacementMapUv:ht&&x(_.displacementMap.channel),emissiveMapUv:ye&&x(_.emissiveMap.channel),metalnessMapUv:Ve&&x(_.metalnessMap.channel),roughnessMapUv:It&&x(_.roughnessMap.channel),anisotropyMapUv:Y&&x(_.anisotropyMap.channel),clearcoatMapUv:Te&&x(_.clearcoatMap.channel),clearcoatNormalMapUv:ae&&x(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Se&&x(_.clearcoatRoughnessMap.channel),iridescenceMapUv:Ee&&x(_.iridescenceMap.channel),iridescenceThicknessMapUv:ie&&x(_.iridescenceThicknessMap.channel),sheenColorMapUv:fe&&x(_.sheenColorMap.channel),sheenRoughnessMapUv:Le&&x(_.sheenRoughnessMap.channel),specularMapUv:be&&x(_.specularMap.channel),specularColorMapUv:ce&&x(_.specularColorMap.channel),specularIntensityMapUv:He&&x(_.specularIntensityMap.channel),transmissionMapUv:L&&x(_.transmissionMap.channel),thicknessMapUv:se&&x(_.thicknessMap.channel),alphaMapUv:me&&x(_.alphaMap.channel),vertexTangents:!!k.attributes.tangent&&(Me||xt),vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!k.attributes.color&&k.attributes.color.itemSize===4,pointsUvs:X.isPoints===!0&&!!k.attributes.uv&&(Be||me),fog:!!O,useFog:_.fog===!0,fogExp2:!!O&&O.isFogExp2,flatShading:_.flatShading===!0&&_.wireframe===!1,sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:ue,skinning:X.isSkinnedMesh===!0,morphTargets:k.morphAttributes.position!==void 0,morphNormals:k.morphAttributes.normal!==void 0,morphColors:k.morphAttributes.color!==void 0,morphTargetsCount:de,morphTextureStride:Re,numDirLights:v.directional.length,numPointLights:v.point.length,numSpotLights:v.spot.length,numSpotLightMaps:v.spotLightMap.length,numRectAreaLights:v.rectArea.length,numHemiLights:v.hemi.length,numDirLightShadows:v.directionalShadowMap.length,numPointLightShadows:v.pointShadowMap.length,numSpotLightShadows:v.spotShadowMap.length,numSpotLightShadowsWithMaps:v.numSpotLightShadowsWithMaps,numLightProbes:v.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:_.dithering,shadowMapEnabled:i.shadowMap.enabled&&A.length>0,shadowMapType:i.shadowMap.type,toneMapping:Oe,decodeVideoTexture:Be&&_.map.isVideoTexture===!0&&Ze.getTransfer(_.map.colorSpace)===st,decodeVideoTextureEmissive:ye&&_.emissiveMap.isVideoTexture===!0&&Ze.getTransfer(_.emissiveMap.colorSpace)===st,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===Jt,flipSided:_.side===qt,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:ve&&_.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ve&&_.extensions.multiDraw===!0||xe)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return lt.vertexUv1s=c.has(1),lt.vertexUv2s=c.has(2),lt.vertexUv3s=c.has(3),c.clear(),lt}function h(_){const v=[];if(_.shaderID?v.push(_.shaderID):(v.push(_.customVertexShaderID),v.push(_.customFragmentShaderID)),_.defines!==void 0)for(const A in _.defines)v.push(A),v.push(_.defines[A]);return _.isRawShaderMaterial===!1&&(E(v,_),b(v,_),v.push(i.outputColorSpace)),v.push(_.customProgramCacheKey),v.join()}function E(_,v){_.push(v.precision),_.push(v.outputColorSpace),_.push(v.envMapMode),_.push(v.envMapCubeUVHeight),_.push(v.mapUv),_.push(v.alphaMapUv),_.push(v.lightMapUv),_.push(v.aoMapUv),_.push(v.bumpMapUv),_.push(v.normalMapUv),_.push(v.displacementMapUv),_.push(v.emissiveMapUv),_.push(v.metalnessMapUv),_.push(v.roughnessMapUv),_.push(v.anisotropyMapUv),_.push(v.clearcoatMapUv),_.push(v.clearcoatNormalMapUv),_.push(v.clearcoatRoughnessMapUv),_.push(v.iridescenceMapUv),_.push(v.iridescenceThicknessMapUv),_.push(v.sheenColorMapUv),_.push(v.sheenRoughnessMapUv),_.push(v.specularMapUv),_.push(v.specularColorMapUv),_.push(v.specularIntensityMapUv),_.push(v.transmissionMapUv),_.push(v.thicknessMapUv),_.push(v.combine),_.push(v.fogExp2),_.push(v.sizeAttenuation),_.push(v.morphTargetsCount),_.push(v.morphAttributeCount),_.push(v.numDirLights),_.push(v.numPointLights),_.push(v.numSpotLights),_.push(v.numSpotLightMaps),_.push(v.numHemiLights),_.push(v.numRectAreaLights),_.push(v.numDirLightShadows),_.push(v.numPointLightShadows),_.push(v.numSpotLightShadows),_.push(v.numSpotLightShadowsWithMaps),_.push(v.numLightProbes),_.push(v.shadowMapType),_.push(v.toneMapping),_.push(v.numClippingPlanes),_.push(v.numClipIntersection),_.push(v.depthPacking)}function b(_,v){o.disableAll(),v.supportsVertexTextures&&o.enable(0),v.instancing&&o.enable(1),v.instancingColor&&o.enable(2),v.instancingMorph&&o.enable(3),v.matcap&&o.enable(4),v.envMap&&o.enable(5),v.normalMapObjectSpace&&o.enable(6),v.normalMapTangentSpace&&o.enable(7),v.clearcoat&&o.enable(8),v.iridescence&&o.enable(9),v.alphaTest&&o.enable(10),v.vertexColors&&o.enable(11),v.vertexAlphas&&o.enable(12),v.vertexUv1s&&o.enable(13),v.vertexUv2s&&o.enable(14),v.vertexUv3s&&o.enable(15),v.vertexTangents&&o.enable(16),v.anisotropy&&o.enable(17),v.alphaHash&&o.enable(18),v.batching&&o.enable(19),v.dispersion&&o.enable(20),v.batchingColor&&o.enable(21),v.gradientMap&&o.enable(22),_.push(o.mask),o.disableAll(),v.fog&&o.enable(0),v.useFog&&o.enable(1),v.flatShading&&o.enable(2),v.logarithmicDepthBuffer&&o.enable(3),v.reversedDepthBuffer&&o.enable(4),v.skinning&&o.enable(5),v.morphTargets&&o.enable(6),v.morphNormals&&o.enable(7),v.morphColors&&o.enable(8),v.premultipliedAlpha&&o.enable(9),v.shadowMapEnabled&&o.enable(10),v.doubleSided&&o.enable(11),v.flipSided&&o.enable(12),v.useDepthPacking&&o.enable(13),v.dithering&&o.enable(14),v.transmission&&o.enable(15),v.sheen&&o.enable(16),v.opaque&&o.enable(17),v.pointsUvs&&o.enable(18),v.decodeVideoTexture&&o.enable(19),v.decodeVideoTextureEmissive&&o.enable(20),v.alphaToCoverage&&o.enable(21),_.push(o.mask)}function S(_){const v=g[_.type];let A;if(v){const N=An[v];A=Br.clone(N.uniforms)}else A=_.uniforms;return A}function R(_,v){let A;for(let N=0,X=d.length;N<X;N++){const O=d[N];if(O.cacheKey===v){A=O,++A.usedTimes;break}}return A===void 0&&(A=new zg(i,v,_,r),d.push(A)),A}function w(_){if(--_.usedTimes===0){const v=d.indexOf(_);d[v]=d[d.length-1],d.pop(),_.destroy()}}function P(_){l.remove(_)}function I(){l.dispose()}return{getParameters:m,getProgramCacheKey:h,getUniforms:S,acquireProgram:R,releaseProgram:w,releaseShaderCache:P,programs:d,dispose:I}}function qg(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,l){i.get(a)[o]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function Yg(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function Mc(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function yc(){const i=[];let e=0;const t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function a(u,f,p,g,x,m){let h=i[e];return h===void 0?(h={id:u.id,object:u,geometry:f,material:p,groupOrder:g,renderOrder:u.renderOrder,z:x,group:m},i[e]=h):(h.id=u.id,h.object=u,h.geometry=f,h.material=p,h.groupOrder=g,h.renderOrder=u.renderOrder,h.z=x,h.group=m),e++,h}function o(u,f,p,g,x,m){const h=a(u,f,p,g,x,m);p.transmission>0?n.push(h):p.transparent===!0?s.push(h):t.push(h)}function l(u,f,p,g,x,m){const h=a(u,f,p,g,x,m);p.transmission>0?n.unshift(h):p.transparent===!0?s.unshift(h):t.unshift(h)}function c(u,f){t.length>1&&t.sort(u||Yg),n.length>1&&n.sort(f||Mc),s.length>1&&s.sort(f||Mc)}function d(){for(let u=e,f=i.length;u<f;u++){const p=i[u];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:o,unshift:l,finish:d,sort:c}}function $g(){let i=new WeakMap;function e(n,s){const r=i.get(n);let a;return r===void 0?(a=new yc,i.set(n,[a])):s>=r.length?(a=new yc,r.push(a)):a=r[s],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function Kg(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new D,color:new Fe};break;case"SpotLight":t={position:new D,direction:new D,color:new Fe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new D,color:new Fe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new D,skyColor:new Fe,groundColor:new Fe};break;case"RectAreaLight":t={color:new Fe,position:new D,halfWidth:new D,halfHeight:new D};break}return i[e.id]=t,t}}}function Zg(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let jg=0;function Jg(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function Qg(i){const e=new Kg,t=Zg(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new D);const s=new D,r=new at,a=new at;function o(c){let d=0,u=0,f=0;for(let _=0;_<9;_++)n.probe[_].set(0,0,0);let p=0,g=0,x=0,m=0,h=0,E=0,b=0,S=0,R=0,w=0,P=0;c.sort(Jg);for(let _=0,v=c.length;_<v;_++){const A=c[_],N=A.color,X=A.intensity,O=A.distance,k=A.shadow&&A.shadow.map?A.shadow.map.texture:null;if(A.isAmbientLight)d+=N.r*X,u+=N.g*X,f+=N.b*X;else if(A.isLightProbe){for(let U=0;U<9;U++)n.probe[U].addScaledVector(A.sh.coefficients[U],X);P++}else if(A.isDirectionalLight){const U=e.get(A);if(U.color.copy(A.color).multiplyScalar(A.intensity),A.castShadow){const q=A.shadow,V=t.get(A);V.shadowIntensity=q.intensity,V.shadowBias=q.bias,V.shadowNormalBias=q.normalBias,V.shadowRadius=q.radius,V.shadowMapSize=q.mapSize,n.directionalShadow[p]=V,n.directionalShadowMap[p]=k,n.directionalShadowMatrix[p]=A.shadow.matrix,E++}n.directional[p]=U,p++}else if(A.isSpotLight){const U=e.get(A);U.position.setFromMatrixPosition(A.matrixWorld),U.color.copy(N).multiplyScalar(X),U.distance=O,U.coneCos=Math.cos(A.angle),U.penumbraCos=Math.cos(A.angle*(1-A.penumbra)),U.decay=A.decay,n.spot[x]=U;const q=A.shadow;if(A.map&&(n.spotLightMap[R]=A.map,R++,q.updateMatrices(A),A.castShadow&&w++),n.spotLightMatrix[x]=q.matrix,A.castShadow){const V=t.get(A);V.shadowIntensity=q.intensity,V.shadowBias=q.bias,V.shadowNormalBias=q.normalBias,V.shadowRadius=q.radius,V.shadowMapSize=q.mapSize,n.spotShadow[x]=V,n.spotShadowMap[x]=k,S++}x++}else if(A.isRectAreaLight){const U=e.get(A);U.color.copy(N).multiplyScalar(X),U.halfWidth.set(A.width*.5,0,0),U.halfHeight.set(0,A.height*.5,0),n.rectArea[m]=U,m++}else if(A.isPointLight){const U=e.get(A);if(U.color.copy(A.color).multiplyScalar(A.intensity),U.distance=A.distance,U.decay=A.decay,A.castShadow){const q=A.shadow,V=t.get(A);V.shadowIntensity=q.intensity,V.shadowBias=q.bias,V.shadowNormalBias=q.normalBias,V.shadowRadius=q.radius,V.shadowMapSize=q.mapSize,V.shadowCameraNear=q.camera.near,V.shadowCameraFar=q.camera.far,n.pointShadow[g]=V,n.pointShadowMap[g]=k,n.pointShadowMatrix[g]=A.shadow.matrix,b++}n.point[g]=U,g++}else if(A.isHemisphereLight){const U=e.get(A);U.skyColor.copy(A.color).multiplyScalar(X),U.groundColor.copy(A.groundColor).multiplyScalar(X),n.hemi[h]=U,h++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=le.LTC_FLOAT_1,n.rectAreaLTC2=le.LTC_FLOAT_2):(n.rectAreaLTC1=le.LTC_HALF_1,n.rectAreaLTC2=le.LTC_HALF_2)),n.ambient[0]=d,n.ambient[1]=u,n.ambient[2]=f;const I=n.hash;(I.directionalLength!==p||I.pointLength!==g||I.spotLength!==x||I.rectAreaLength!==m||I.hemiLength!==h||I.numDirectionalShadows!==E||I.numPointShadows!==b||I.numSpotShadows!==S||I.numSpotMaps!==R||I.numLightProbes!==P)&&(n.directional.length=p,n.spot.length=x,n.rectArea.length=m,n.point.length=g,n.hemi.length=h,n.directionalShadow.length=E,n.directionalShadowMap.length=E,n.pointShadow.length=b,n.pointShadowMap.length=b,n.spotShadow.length=S,n.spotShadowMap.length=S,n.directionalShadowMatrix.length=E,n.pointShadowMatrix.length=b,n.spotLightMatrix.length=S+R-w,n.spotLightMap.length=R,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=P,I.directionalLength=p,I.pointLength=g,I.spotLength=x,I.rectAreaLength=m,I.hemiLength=h,I.numDirectionalShadows=E,I.numPointShadows=b,I.numSpotShadows=S,I.numSpotMaps=R,I.numLightProbes=P,n.version=jg++)}function l(c,d){let u=0,f=0,p=0,g=0,x=0;const m=d.matrixWorldInverse;for(let h=0,E=c.length;h<E;h++){const b=c[h];if(b.isDirectionalLight){const S=n.directional[u];S.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),S.direction.sub(s),S.direction.transformDirection(m),u++}else if(b.isSpotLight){const S=n.spot[p];S.position.setFromMatrixPosition(b.matrixWorld),S.position.applyMatrix4(m),S.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),S.direction.sub(s),S.direction.transformDirection(m),p++}else if(b.isRectAreaLight){const S=n.rectArea[g];S.position.setFromMatrixPosition(b.matrixWorld),S.position.applyMatrix4(m),a.identity(),r.copy(b.matrixWorld),r.premultiply(m),a.extractRotation(r),S.halfWidth.set(b.width*.5,0,0),S.halfHeight.set(0,b.height*.5,0),S.halfWidth.applyMatrix4(a),S.halfHeight.applyMatrix4(a),g++}else if(b.isPointLight){const S=n.point[f];S.position.setFromMatrixPosition(b.matrixWorld),S.position.applyMatrix4(m),f++}else if(b.isHemisphereLight){const S=n.hemi[x];S.direction.setFromMatrixPosition(b.matrixWorld),S.direction.transformDirection(m),x++}}}return{setup:o,setupView:l,state:n}}function Sc(i){const e=new Qg(i),t=[],n=[];function s(d){c.camera=d,t.length=0,n.length=0}function r(d){t.push(d)}function a(d){n.push(d)}function o(){e.setup(t)}function l(d){e.setupView(t,d)}const c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:o,setupLightsView:l,pushLight:r,pushShadow:a}}function e0(i){let e=new WeakMap;function t(s,r=0){const a=e.get(s);let o;return a===void 0?(o=new Sc(i),e.set(s,[o])):r>=a.length?(o=new Sc(i),a.push(o)):o=a[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}const t0=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,n0=`uniform sampler2D shadow_pass;
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
}`;function i0(i,e,t){let n=new el;const s=new we,r=new we,a=new rt,o=new Eh({depthPacking:gu}),l=new bh,c={},d=t.maxTextureSize,u={[ri]:qt,[qt]:ri,[Jt]:Jt},f=new Wt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new we},radius:{value:4}},vertexShader:t0,fragmentShader:n0}),p=f.clone();p.defines.HORIZONTAL_PASS=1;const g=new Bt;g.setAttribute("position",new tn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new re(g,f),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=kc;let h=this.type;this.render=function(w,P,I){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||w.length===0)return;const _=i.getRenderTarget(),v=i.getActiveCubeFace(),A=i.getActiveMipmapLevel(),N=i.state;N.setBlending(Gn),N.buffers.depth.getReversed()===!0?N.buffers.color.setClear(0,0,0,0):N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);const X=h!==Hn&&this.type===Hn,O=h===Hn&&this.type!==Hn;for(let k=0,U=w.length;k<U;k++){const q=w[k],V=q.shadow;if(V===void 0){console.warn("THREE.WebGLShadowMap:",q,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;s.copy(V.mapSize);const J=V.getFrameExtents();if(s.multiply(J),r.copy(V.mapSize),(s.x>d||s.y>d)&&(s.x>d&&(r.x=Math.floor(d/J.x),s.x=r.x*J.x,V.mapSize.x=r.x),s.y>d&&(r.y=Math.floor(d/J.y),s.y=r.y*J.y,V.mapSize.y=r.y)),V.map===null||X===!0||O===!0){const de=this.type!==Hn?{minFilter:en,magFilter:en}:{};V.map!==null&&V.map.dispose(),V.map=new Sn(s.x,s.y,de),V.map.texture.name=q.name+".shadowMap",V.camera.updateProjectionMatrix()}i.setRenderTarget(V.map),i.clear();const ee=V.getViewportCount();for(let de=0;de<ee;de++){const Re=V.getViewport(de);a.set(r.x*Re.x,r.y*Re.y,r.x*Re.z,r.y*Re.w),N.viewport(a),V.updateMatrices(q,de),n=V.getFrustum(),S(P,I,V.camera,q,this.type)}V.isPointLightShadow!==!0&&this.type===Hn&&E(V,I),V.needsUpdate=!1}h=this.type,m.needsUpdate=!1,i.setRenderTarget(_,v,A)};function E(w,P){const I=e.update(x);f.defines.VSM_SAMPLES!==w.blurSamples&&(f.defines.VSM_SAMPLES=w.blurSamples,p.defines.VSM_SAMPLES=w.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new Sn(s.x,s.y)),f.uniforms.shadow_pass.value=w.map.texture,f.uniforms.resolution.value=w.mapSize,f.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(P,null,I,f,x,null),p.uniforms.shadow_pass.value=w.mapPass.texture,p.uniforms.resolution.value=w.mapSize,p.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(P,null,I,p,x,null)}function b(w,P,I,_){let v=null;const A=I.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(A!==void 0)v=A;else if(v=I.isPointLight===!0?l:o,i.localClippingEnabled&&P.clipShadows===!0&&Array.isArray(P.clippingPlanes)&&P.clippingPlanes.length!==0||P.displacementMap&&P.displacementScale!==0||P.alphaMap&&P.alphaTest>0||P.map&&P.alphaTest>0||P.alphaToCoverage===!0){const N=v.uuid,X=P.uuid;let O=c[N];O===void 0&&(O={},c[N]=O);let k=O[X];k===void 0&&(k=v.clone(),O[X]=k,P.addEventListener("dispose",R)),v=k}if(v.visible=P.visible,v.wireframe=P.wireframe,_===Hn?v.side=P.shadowSide!==null?P.shadowSide:P.side:v.side=P.shadowSide!==null?P.shadowSide:u[P.side],v.alphaMap=P.alphaMap,v.alphaTest=P.alphaToCoverage===!0?.5:P.alphaTest,v.map=P.map,v.clipShadows=P.clipShadows,v.clippingPlanes=P.clippingPlanes,v.clipIntersection=P.clipIntersection,v.displacementMap=P.displacementMap,v.displacementScale=P.displacementScale,v.displacementBias=P.displacementBias,v.wireframeLinewidth=P.wireframeLinewidth,v.linewidth=P.linewidth,I.isPointLight===!0&&v.isMeshDistanceMaterial===!0){const N=i.properties.get(v);N.light=I}return v}function S(w,P,I,_,v){if(w.visible===!1)return;if(w.layers.test(P.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&v===Hn)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(I.matrixWorldInverse,w.matrixWorld);const X=e.update(w),O=w.material;if(Array.isArray(O)){const k=X.groups;for(let U=0,q=k.length;U<q;U++){const V=k[U],J=O[V.materialIndex];if(J&&J.visible){const ee=b(w,J,_,v);w.onBeforeShadow(i,w,P,I,X,ee,V),i.renderBufferDirect(I,null,X,ee,w,V),w.onAfterShadow(i,w,P,I,X,ee,V)}}}else if(O.visible){const k=b(w,O,_,v);w.onBeforeShadow(i,w,P,I,X,k,null),i.renderBufferDirect(I,null,X,k,w,null),w.onAfterShadow(i,w,P,I,X,k,null)}}const N=w.children;for(let X=0,O=N.length;X<O;X++)S(N[X],P,I,_,v)}function R(w){w.target.removeEventListener("dispose",R);for(const I in c){const _=c[I],v=w.target.uuid;v in _&&(_[v].dispose(),delete _[v])}}}const s0={[qa]:Ya,[$a]:ja,[Ka]:Ja,[ts]:Za,[Ya]:qa,[ja]:$a,[Ja]:Ka,[Za]:ts};function r0(i,e){function t(){let L=!1;const se=new rt;let oe=null;const me=new rt(0,0,0,0);return{setMask:function(te){oe!==te&&!L&&(i.colorMask(te,te,te,te),oe=te)},setLocked:function(te){L=te},setClear:function(te,Z,ve,Oe,lt){lt===!0&&(te*=Oe,Z*=Oe,ve*=Oe),se.set(te,Z,ve,Oe),me.equals(se)===!1&&(i.clearColor(te,Z,ve,Oe),me.copy(se))},reset:function(){L=!1,oe=null,me.set(-1,0,0,0)}}}function n(){let L=!1,se=!1,oe=null,me=null,te=null;return{setReversed:function(Z){if(se!==Z){const ve=e.get("EXT_clip_control");Z?ve.clipControlEXT(ve.LOWER_LEFT_EXT,ve.ZERO_TO_ONE_EXT):ve.clipControlEXT(ve.LOWER_LEFT_EXT,ve.NEGATIVE_ONE_TO_ONE_EXT),se=Z;const Oe=te;te=null,this.setClear(Oe)}},getReversed:function(){return se},setTest:function(Z){Z?$(i.DEPTH_TEST):ue(i.DEPTH_TEST)},setMask:function(Z){oe!==Z&&!L&&(i.depthMask(Z),oe=Z)},setFunc:function(Z){if(se&&(Z=s0[Z]),me!==Z){switch(Z){case qa:i.depthFunc(i.NEVER);break;case Ya:i.depthFunc(i.ALWAYS);break;case $a:i.depthFunc(i.LESS);break;case ts:i.depthFunc(i.LEQUAL);break;case Ka:i.depthFunc(i.EQUAL);break;case Za:i.depthFunc(i.GEQUAL);break;case ja:i.depthFunc(i.GREATER);break;case Ja:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}me=Z}},setLocked:function(Z){L=Z},setClear:function(Z){te!==Z&&(se&&(Z=1-Z),i.clearDepth(Z),te=Z)},reset:function(){L=!1,oe=null,me=null,te=null,se=!1}}}function s(){let L=!1,se=null,oe=null,me=null,te=null,Z=null,ve=null,Oe=null,lt=null;return{setTest:function(Je){L||(Je?$(i.STENCIL_TEST):ue(i.STENCIL_TEST))},setMask:function(Je){se!==Je&&!L&&(i.stencilMask(Je),se=Je)},setFunc:function(Je,Un,bn){(oe!==Je||me!==Un||te!==bn)&&(i.stencilFunc(Je,Un,bn),oe=Je,me=Un,te=bn)},setOp:function(Je,Un,bn){(Z!==Je||ve!==Un||Oe!==bn)&&(i.stencilOp(Je,Un,bn),Z=Je,ve=Un,Oe=bn)},setLocked:function(Je){L=Je},setClear:function(Je){lt!==Je&&(i.clearStencil(Je),lt=Je)},reset:function(){L=!1,se=null,oe=null,me=null,te=null,Z=null,ve=null,Oe=null,lt=null}}}const r=new t,a=new n,o=new s,l=new WeakMap,c=new WeakMap;let d={},u={},f=new WeakMap,p=[],g=null,x=!1,m=null,h=null,E=null,b=null,S=null,R=null,w=null,P=new Fe(0,0,0),I=0,_=!1,v=null,A=null,N=null,X=null,O=null;const k=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let U=!1,q=0;const V=i.getParameter(i.VERSION);V.indexOf("WebGL")!==-1?(q=parseFloat(/^WebGL (\d)/.exec(V)[1]),U=q>=1):V.indexOf("OpenGL ES")!==-1&&(q=parseFloat(/^OpenGL ES (\d)/.exec(V)[1]),U=q>=2);let J=null,ee={};const de=i.getParameter(i.SCISSOR_BOX),Re=i.getParameter(i.VIEWPORT),$e=new rt().fromArray(de),je=new rt().fromArray(Re);function Q(L,se,oe,me){const te=new Uint8Array(4),Z=i.createTexture();i.bindTexture(L,Z),i.texParameteri(L,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(L,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let ve=0;ve<oe;ve++)L===i.TEXTURE_3D||L===i.TEXTURE_2D_ARRAY?i.texImage3D(se,0,i.RGBA,1,1,me,0,i.RGBA,i.UNSIGNED_BYTE,te):i.texImage2D(se+ve,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,te);return Z}const H={};H[i.TEXTURE_2D]=Q(i.TEXTURE_2D,i.TEXTURE_2D,1),H[i.TEXTURE_CUBE_MAP]=Q(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),H[i.TEXTURE_2D_ARRAY]=Q(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),H[i.TEXTURE_3D]=Q(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),$(i.DEPTH_TEST),a.setFunc(ts),De(!1),Me(_l),$(i.CULL_FACE),ut(Gn);function $(L){d[L]!==!0&&(i.enable(L),d[L]=!0)}function ue(L){d[L]!==!1&&(i.disable(L),d[L]=!1)}function Ae(L,se){return u[L]!==se?(i.bindFramebuffer(L,se),u[L]=se,L===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=se),L===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=se),!0):!1}function xe(L,se){let oe=p,me=!1;if(L){oe=f.get(se),oe===void 0&&(oe=[],f.set(se,oe));const te=L.textures;if(oe.length!==te.length||oe[0]!==i.COLOR_ATTACHMENT0){for(let Z=0,ve=te.length;Z<ve;Z++)oe[Z]=i.COLOR_ATTACHMENT0+Z;oe.length=te.length,me=!0}}else oe[0]!==i.BACK&&(oe[0]=i.BACK,me=!0);me&&i.drawBuffers(oe)}function Be(L){return g!==L?(i.useProgram(L),g=L,!0):!1}const Mt={[_i]:i.FUNC_ADD,[Gd]:i.FUNC_SUBTRACT,[Wd]:i.FUNC_REVERSE_SUBTRACT};Mt[Xd]=i.MIN,Mt[qd]=i.MAX;const C={[Yd]:i.ZERO,[$d]:i.ONE,[Kd]:i.SRC_COLOR,[Wa]:i.SRC_ALPHA,[tu]:i.SRC_ALPHA_SATURATE,[Qd]:i.DST_COLOR,[jd]:i.DST_ALPHA,[Zd]:i.ONE_MINUS_SRC_COLOR,[Xa]:i.ONE_MINUS_SRC_ALPHA,[eu]:i.ONE_MINUS_DST_COLOR,[Jd]:i.ONE_MINUS_DST_ALPHA,[nu]:i.CONSTANT_COLOR,[iu]:i.ONE_MINUS_CONSTANT_COLOR,[su]:i.CONSTANT_ALPHA,[ru]:i.ONE_MINUS_CONSTANT_ALPHA};function ut(L,se,oe,me,te,Z,ve,Oe,lt,Je){if(L===Gn){x===!0&&(ue(i.BLEND),x=!1);return}if(x===!1&&($(i.BLEND),x=!0),L!==Vd){if(L!==m||Je!==_){if((h!==_i||S!==_i)&&(i.blendEquation(i.FUNC_ADD),h=_i,S=_i),Je)switch(L){case Ji:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Ga:i.blendFunc(i.ONE,i.ONE);break;case vl:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case xl:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}else switch(L){case Ji:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Ga:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case vl:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case xl:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}E=null,b=null,R=null,w=null,P.set(0,0,0),I=0,m=L,_=Je}return}te=te||se,Z=Z||oe,ve=ve||me,(se!==h||te!==S)&&(i.blendEquationSeparate(Mt[se],Mt[te]),h=se,S=te),(oe!==E||me!==b||Z!==R||ve!==w)&&(i.blendFuncSeparate(C[oe],C[me],C[Z],C[ve]),E=oe,b=me,R=Z,w=ve),(Oe.equals(P)===!1||lt!==I)&&(i.blendColor(Oe.r,Oe.g,Oe.b,lt),P.copy(Oe),I=lt),m=L,_=!1}function ke(L,se){L.side===Jt?ue(i.CULL_FACE):$(i.CULL_FACE);let oe=L.side===qt;se&&(oe=!oe),De(oe),L.blending===Ji&&L.transparent===!1?ut(Gn):ut(L.blending,L.blendEquation,L.blendSrc,L.blendDst,L.blendEquationAlpha,L.blendSrcAlpha,L.blendDstAlpha,L.blendColor,L.blendAlpha,L.premultipliedAlpha),a.setFunc(L.depthFunc),a.setTest(L.depthTest),a.setMask(L.depthWrite),r.setMask(L.colorWrite);const me=L.stencilWrite;o.setTest(me),me&&(o.setMask(L.stencilWriteMask),o.setFunc(L.stencilFunc,L.stencilRef,L.stencilFuncMask),o.setOp(L.stencilFail,L.stencilZFail,L.stencilZPass)),ye(L.polygonOffset,L.polygonOffsetFactor,L.polygonOffsetUnits),L.alphaToCoverage===!0?$(i.SAMPLE_ALPHA_TO_COVERAGE):ue(i.SAMPLE_ALPHA_TO_COVERAGE)}function De(L){v!==L&&(L?i.frontFace(i.CW):i.frontFace(i.CCW),v=L)}function Me(L){L!==Hd?($(i.CULL_FACE),L!==A&&(L===_l?i.cullFace(i.BACK):L===zd?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):ue(i.CULL_FACE),A=L}function ht(L){L!==N&&(U&&i.lineWidth(L),N=L)}function ye(L,se,oe){L?($(i.POLYGON_OFFSET_FILL),(X!==se||O!==oe)&&(i.polygonOffset(se,oe),X=se,O=oe)):ue(i.POLYGON_OFFSET_FILL)}function Ve(L){L?$(i.SCISSOR_TEST):ue(i.SCISSOR_TEST)}function It(L){L===void 0&&(L=i.TEXTURE0+k-1),J!==L&&(i.activeTexture(L),J=L)}function xt(L,se,oe){oe===void 0&&(J===null?oe=i.TEXTURE0+k-1:oe=J);let me=ee[oe];me===void 0&&(me={type:void 0,texture:void 0},ee[oe]=me),(me.type!==L||me.texture!==se)&&(J!==oe&&(i.activeTexture(oe),J=oe),i.bindTexture(L,se||H[L]),me.type=L,me.texture=se)}function T(){const L=ee[J];L!==void 0&&L.type!==void 0&&(i.bindTexture(L.type,null),L.type=void 0,L.texture=void 0)}function M(){try{i.compressedTexImage2D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function z(){try{i.compressedTexImage3D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function K(){try{i.texSubImage2D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function j(){try{i.texSubImage3D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Y(){try{i.compressedTexSubImage2D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Te(){try{i.compressedTexSubImage3D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function ae(){try{i.texStorage2D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Se(){try{i.texStorage3D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Ee(){try{i.texImage2D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function ie(){try{i.texImage3D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function fe(L){$e.equals(L)===!1&&(i.scissor(L.x,L.y,L.z,L.w),$e.copy(L))}function Le(L){je.equals(L)===!1&&(i.viewport(L.x,L.y,L.z,L.w),je.copy(L))}function be(L,se){let oe=c.get(se);oe===void 0&&(oe=new WeakMap,c.set(se,oe));let me=oe.get(L);me===void 0&&(me=i.getUniformBlockIndex(se,L.name),oe.set(L,me))}function ce(L,se){const me=c.get(se).get(L);l.get(se)!==me&&(i.uniformBlockBinding(se,me,L.__bindingPointIndex),l.set(se,me))}function He(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),d={},J=null,ee={},u={},f=new WeakMap,p=[],g=null,x=!1,m=null,h=null,E=null,b=null,S=null,R=null,w=null,P=new Fe(0,0,0),I=0,_=!1,v=null,A=null,N=null,X=null,O=null,$e.set(0,0,i.canvas.width,i.canvas.height),je.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:$,disable:ue,bindFramebuffer:Ae,drawBuffers:xe,useProgram:Be,setBlending:ut,setMaterial:ke,setFlipSided:De,setCullFace:Me,setLineWidth:ht,setPolygonOffset:ye,setScissorTest:Ve,activeTexture:It,bindTexture:xt,unbindTexture:T,compressedTexImage2D:M,compressedTexImage3D:z,texImage2D:Ee,texImage3D:ie,updateUBOMapping:be,uniformBlockBinding:ce,texStorage2D:ae,texStorage3D:Se,texSubImage2D:K,texSubImage3D:j,compressedTexSubImage2D:Y,compressedTexSubImage3D:Te,scissor:fe,viewport:Le,reset:He}}function a0(i,e,t,n,s,r,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new we,d=new WeakMap;let u;const f=new WeakMap;let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(T,M){return p?new OffscreenCanvas(T,M):Or("canvas")}function x(T,M,z){let K=1;const j=xt(T);if((j.width>z||j.height>z)&&(K=z/Math.max(j.width,j.height)),K<1)if(typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&T instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&T instanceof ImageBitmap||typeof VideoFrame<"u"&&T instanceof VideoFrame){const Y=Math.floor(K*j.width),Te=Math.floor(K*j.height);u===void 0&&(u=g(Y,Te));const ae=M?g(Y,Te):u;return ae.width=Y,ae.height=Te,ae.getContext("2d").drawImage(T,0,0,Y,Te),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+j.width+"x"+j.height+") to ("+Y+"x"+Te+")."),ae}else return"data"in T&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+j.width+"x"+j.height+")."),T;return T}function m(T){return T.generateMipmaps}function h(T){i.generateMipmap(T)}function E(T){return T.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:T.isWebGL3DRenderTarget?i.TEXTURE_3D:T.isWebGLArrayRenderTarget||T.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function b(T,M,z,K,j=!1){if(T!==null){if(i[T]!==void 0)return i[T];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+T+"'")}let Y=M;if(M===i.RED&&(z===i.FLOAT&&(Y=i.R32F),z===i.HALF_FLOAT&&(Y=i.R16F),z===i.UNSIGNED_BYTE&&(Y=i.R8)),M===i.RED_INTEGER&&(z===i.UNSIGNED_BYTE&&(Y=i.R8UI),z===i.UNSIGNED_SHORT&&(Y=i.R16UI),z===i.UNSIGNED_INT&&(Y=i.R32UI),z===i.BYTE&&(Y=i.R8I),z===i.SHORT&&(Y=i.R16I),z===i.INT&&(Y=i.R32I)),M===i.RG&&(z===i.FLOAT&&(Y=i.RG32F),z===i.HALF_FLOAT&&(Y=i.RG16F),z===i.UNSIGNED_BYTE&&(Y=i.RG8)),M===i.RG_INTEGER&&(z===i.UNSIGNED_BYTE&&(Y=i.RG8UI),z===i.UNSIGNED_SHORT&&(Y=i.RG16UI),z===i.UNSIGNED_INT&&(Y=i.RG32UI),z===i.BYTE&&(Y=i.RG8I),z===i.SHORT&&(Y=i.RG16I),z===i.INT&&(Y=i.RG32I)),M===i.RGB_INTEGER&&(z===i.UNSIGNED_BYTE&&(Y=i.RGB8UI),z===i.UNSIGNED_SHORT&&(Y=i.RGB16UI),z===i.UNSIGNED_INT&&(Y=i.RGB32UI),z===i.BYTE&&(Y=i.RGB8I),z===i.SHORT&&(Y=i.RGB16I),z===i.INT&&(Y=i.RGB32I)),M===i.RGBA_INTEGER&&(z===i.UNSIGNED_BYTE&&(Y=i.RGBA8UI),z===i.UNSIGNED_SHORT&&(Y=i.RGBA16UI),z===i.UNSIGNED_INT&&(Y=i.RGBA32UI),z===i.BYTE&&(Y=i.RGBA8I),z===i.SHORT&&(Y=i.RGBA16I),z===i.INT&&(Y=i.RGBA32I)),M===i.RGB&&(z===i.UNSIGNED_INT_5_9_9_9_REV&&(Y=i.RGB9_E5),z===i.UNSIGNED_INT_10F_11F_11F_REV&&(Y=i.R11F_G11F_B10F)),M===i.RGBA){const Te=j?Nr:Ze.getTransfer(K);z===i.FLOAT&&(Y=i.RGBA32F),z===i.HALF_FLOAT&&(Y=i.RGBA16F),z===i.UNSIGNED_BYTE&&(Y=Te===st?i.SRGB8_ALPHA8:i.RGBA8),z===i.UNSIGNED_SHORT_4_4_4_4&&(Y=i.RGBA4),z===i.UNSIGNED_SHORT_5_5_5_1&&(Y=i.RGB5_A1)}return(Y===i.R16F||Y===i.R32F||Y===i.RG16F||Y===i.RG32F||Y===i.RGBA16F||Y===i.RGBA32F)&&e.get("EXT_color_buffer_float"),Y}function S(T,M){let z;return T?M===null||M===bi||M===Ls?z=i.DEPTH24_STENCIL8:M===Cn?z=i.DEPTH32F_STENCIL8:M===Is&&(z=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===bi||M===Ls?z=i.DEPTH_COMPONENT24:M===Cn?z=i.DEPTH_COMPONENT32F:M===Is&&(z=i.DEPTH_COMPONENT16),z}function R(T,M){return m(T)===!0||T.isFramebufferTexture&&T.minFilter!==en&&T.minFilter!==xn?Math.log2(Math.max(M.width,M.height))+1:T.mipmaps!==void 0&&T.mipmaps.length>0?T.mipmaps.length:T.isCompressedTexture&&Array.isArray(T.image)?M.mipmaps.length:1}function w(T){const M=T.target;M.removeEventListener("dispose",w),I(M),M.isVideoTexture&&d.delete(M)}function P(T){const M=T.target;M.removeEventListener("dispose",P),v(M)}function I(T){const M=n.get(T);if(M.__webglInit===void 0)return;const z=T.source,K=f.get(z);if(K){const j=K[M.__cacheKey];j.usedTimes--,j.usedTimes===0&&_(T),Object.keys(K).length===0&&f.delete(z)}n.remove(T)}function _(T){const M=n.get(T);i.deleteTexture(M.__webglTexture);const z=T.source,K=f.get(z);delete K[M.__cacheKey],a.memory.textures--}function v(T){const M=n.get(T);if(T.depthTexture&&(T.depthTexture.dispose(),n.remove(T.depthTexture)),T.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(M.__webglFramebuffer[K]))for(let j=0;j<M.__webglFramebuffer[K].length;j++)i.deleteFramebuffer(M.__webglFramebuffer[K][j]);else i.deleteFramebuffer(M.__webglFramebuffer[K]);M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer[K])}else{if(Array.isArray(M.__webglFramebuffer))for(let K=0;K<M.__webglFramebuffer.length;K++)i.deleteFramebuffer(M.__webglFramebuffer[K]);else i.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&i.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let K=0;K<M.__webglColorRenderbuffer.length;K++)M.__webglColorRenderbuffer[K]&&i.deleteRenderbuffer(M.__webglColorRenderbuffer[K]);M.__webglDepthRenderbuffer&&i.deleteRenderbuffer(M.__webglDepthRenderbuffer)}const z=T.textures;for(let K=0,j=z.length;K<j;K++){const Y=n.get(z[K]);Y.__webglTexture&&(i.deleteTexture(Y.__webglTexture),a.memory.textures--),n.remove(z[K])}n.remove(T)}let A=0;function N(){A=0}function X(){const T=A;return T>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+T+" texture units while this GPU supports only "+s.maxTextures),A+=1,T}function O(T){const M=[];return M.push(T.wrapS),M.push(T.wrapT),M.push(T.wrapR||0),M.push(T.magFilter),M.push(T.minFilter),M.push(T.anisotropy),M.push(T.internalFormat),M.push(T.format),M.push(T.type),M.push(T.generateMipmaps),M.push(T.premultiplyAlpha),M.push(T.flipY),M.push(T.unpackAlignment),M.push(T.colorSpace),M.join()}function k(T,M){const z=n.get(T);if(T.isVideoTexture&&Ve(T),T.isRenderTargetTexture===!1&&T.isExternalTexture!==!0&&T.version>0&&z.__version!==T.version){const K=T.image;if(K===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(K.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{H(z,T,M);return}}else T.isExternalTexture&&(z.__webglTexture=T.sourceTexture?T.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,z.__webglTexture,i.TEXTURE0+M)}function U(T,M){const z=n.get(T);if(T.isRenderTargetTexture===!1&&T.version>0&&z.__version!==T.version){H(z,T,M);return}t.bindTexture(i.TEXTURE_2D_ARRAY,z.__webglTexture,i.TEXTURE0+M)}function q(T,M){const z=n.get(T);if(T.isRenderTargetTexture===!1&&T.version>0&&z.__version!==T.version){H(z,T,M);return}t.bindTexture(i.TEXTURE_3D,z.__webglTexture,i.TEXTURE0+M)}function V(T,M){const z=n.get(T);if(T.version>0&&z.__version!==T.version){$(z,T,M);return}t.bindTexture(i.TEXTURE_CUBE_MAP,z.__webglTexture,i.TEXTURE0+M)}const J={[to]:i.REPEAT,[yi]:i.CLAMP_TO_EDGE,[no]:i.MIRRORED_REPEAT},ee={[en]:i.NEAREST,[pu]:i.NEAREST_MIPMAP_NEAREST,[Ys]:i.NEAREST_MIPMAP_LINEAR,[xn]:i.LINEAR,[Jr]:i.LINEAR_MIPMAP_NEAREST,[Si]:i.LINEAR_MIPMAP_LINEAR},de={[vu]:i.NEVER,[bu]:i.ALWAYS,[xu]:i.LESS,[Jc]:i.LEQUAL,[Mu]:i.EQUAL,[Eu]:i.GEQUAL,[yu]:i.GREATER,[Su]:i.NOTEQUAL};function Re(T,M){if(M.type===Cn&&e.has("OES_texture_float_linear")===!1&&(M.magFilter===xn||M.magFilter===Jr||M.magFilter===Ys||M.magFilter===Si||M.minFilter===xn||M.minFilter===Jr||M.minFilter===Ys||M.minFilter===Si)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(T,i.TEXTURE_WRAP_S,J[M.wrapS]),i.texParameteri(T,i.TEXTURE_WRAP_T,J[M.wrapT]),(T===i.TEXTURE_3D||T===i.TEXTURE_2D_ARRAY)&&i.texParameteri(T,i.TEXTURE_WRAP_R,J[M.wrapR]),i.texParameteri(T,i.TEXTURE_MAG_FILTER,ee[M.magFilter]),i.texParameteri(T,i.TEXTURE_MIN_FILTER,ee[M.minFilter]),M.compareFunction&&(i.texParameteri(T,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(T,i.TEXTURE_COMPARE_FUNC,de[M.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===en||M.minFilter!==Ys&&M.minFilter!==Si||M.type===Cn&&e.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||n.get(M).__currentAnisotropy){const z=e.get("EXT_texture_filter_anisotropic");i.texParameterf(T,z.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,s.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy}}}function $e(T,M){let z=!1;T.__webglInit===void 0&&(T.__webglInit=!0,M.addEventListener("dispose",w));const K=M.source;let j=f.get(K);j===void 0&&(j={},f.set(K,j));const Y=O(M);if(Y!==T.__cacheKey){j[Y]===void 0&&(j[Y]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,z=!0),j[Y].usedTimes++;const Te=j[T.__cacheKey];Te!==void 0&&(j[T.__cacheKey].usedTimes--,Te.usedTimes===0&&_(M)),T.__cacheKey=Y,T.__webglTexture=j[Y].texture}return z}function je(T,M,z){return Math.floor(Math.floor(T/z)/M)}function Q(T,M,z,K){const Y=T.updateRanges;if(Y.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,M.width,M.height,z,K,M.data);else{Y.sort((ie,fe)=>ie.start-fe.start);let Te=0;for(let ie=1;ie<Y.length;ie++){const fe=Y[Te],Le=Y[ie],be=fe.start+fe.count,ce=je(Le.start,M.width,4),He=je(fe.start,M.width,4);Le.start<=be+1&&ce===He&&je(Le.start+Le.count-1,M.width,4)===ce?fe.count=Math.max(fe.count,Le.start+Le.count-fe.start):(++Te,Y[Te]=Le)}Y.length=Te+1;const ae=i.getParameter(i.UNPACK_ROW_LENGTH),Se=i.getParameter(i.UNPACK_SKIP_PIXELS),Ee=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,M.width);for(let ie=0,fe=Y.length;ie<fe;ie++){const Le=Y[ie],be=Math.floor(Le.start/4),ce=Math.ceil(Le.count/4),He=be%M.width,L=Math.floor(be/M.width),se=ce,oe=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,He),i.pixelStorei(i.UNPACK_SKIP_ROWS,L),t.texSubImage2D(i.TEXTURE_2D,0,He,L,se,oe,z,K,M.data)}T.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,ae),i.pixelStorei(i.UNPACK_SKIP_PIXELS,Se),i.pixelStorei(i.UNPACK_SKIP_ROWS,Ee)}}function H(T,M,z){let K=i.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(K=i.TEXTURE_2D_ARRAY),M.isData3DTexture&&(K=i.TEXTURE_3D);const j=$e(T,M),Y=M.source;t.bindTexture(K,T.__webglTexture,i.TEXTURE0+z);const Te=n.get(Y);if(Y.version!==Te.__version||j===!0){t.activeTexture(i.TEXTURE0+z);const ae=Ze.getPrimaries(Ze.workingColorSpace),Se=M.colorSpace===ni?null:Ze.getPrimaries(M.colorSpace),Ee=M.colorSpace===ni||ae===Se?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ee);let ie=x(M.image,!1,s.maxTextureSize);ie=It(M,ie);const fe=r.convert(M.format,M.colorSpace),Le=r.convert(M.type);let be=b(M.internalFormat,fe,Le,M.colorSpace,M.isVideoTexture);Re(K,M);let ce;const He=M.mipmaps,L=M.isVideoTexture!==!0,se=Te.__version===void 0||j===!0,oe=Y.dataReady,me=R(M,ie);if(M.isDepthTexture)be=S(M.format===Us,M.type),se&&(L?t.texStorage2D(i.TEXTURE_2D,1,be,ie.width,ie.height):t.texImage2D(i.TEXTURE_2D,0,be,ie.width,ie.height,0,fe,Le,null));else if(M.isDataTexture)if(He.length>0){L&&se&&t.texStorage2D(i.TEXTURE_2D,me,be,He[0].width,He[0].height);for(let te=0,Z=He.length;te<Z;te++)ce=He[te],L?oe&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,ce.width,ce.height,fe,Le,ce.data):t.texImage2D(i.TEXTURE_2D,te,be,ce.width,ce.height,0,fe,Le,ce.data);M.generateMipmaps=!1}else L?(se&&t.texStorage2D(i.TEXTURE_2D,me,be,ie.width,ie.height),oe&&Q(M,ie,fe,Le)):t.texImage2D(i.TEXTURE_2D,0,be,ie.width,ie.height,0,fe,Le,ie.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){L&&se&&t.texStorage3D(i.TEXTURE_2D_ARRAY,me,be,He[0].width,He[0].height,ie.depth);for(let te=0,Z=He.length;te<Z;te++)if(ce=He[te],M.format!==Mn)if(fe!==null)if(L){if(oe)if(M.layerUpdates.size>0){const ve=Jl(ce.width,ce.height,M.format,M.type);for(const Oe of M.layerUpdates){const lt=ce.data.subarray(Oe*ve/ce.data.BYTES_PER_ELEMENT,(Oe+1)*ve/ce.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,Oe,ce.width,ce.height,1,fe,lt)}M.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,ce.width,ce.height,ie.depth,fe,ce.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,te,be,ce.width,ce.height,ie.depth,0,ce.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else L?oe&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,ce.width,ce.height,ie.depth,fe,Le,ce.data):t.texImage3D(i.TEXTURE_2D_ARRAY,te,be,ce.width,ce.height,ie.depth,0,fe,Le,ce.data)}else{L&&se&&t.texStorage2D(i.TEXTURE_2D,me,be,He[0].width,He[0].height);for(let te=0,Z=He.length;te<Z;te++)ce=He[te],M.format!==Mn?fe!==null?L?oe&&t.compressedTexSubImage2D(i.TEXTURE_2D,te,0,0,ce.width,ce.height,fe,ce.data):t.compressedTexImage2D(i.TEXTURE_2D,te,be,ce.width,ce.height,0,ce.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):L?oe&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,ce.width,ce.height,fe,Le,ce.data):t.texImage2D(i.TEXTURE_2D,te,be,ce.width,ce.height,0,fe,Le,ce.data)}else if(M.isDataArrayTexture)if(L){if(se&&t.texStorage3D(i.TEXTURE_2D_ARRAY,me,be,ie.width,ie.height,ie.depth),oe)if(M.layerUpdates.size>0){const te=Jl(ie.width,ie.height,M.format,M.type);for(const Z of M.layerUpdates){const ve=ie.data.subarray(Z*te/ie.data.BYTES_PER_ELEMENT,(Z+1)*te/ie.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Z,ie.width,ie.height,1,fe,Le,ve)}M.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ie.width,ie.height,ie.depth,fe,Le,ie.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,be,ie.width,ie.height,ie.depth,0,fe,Le,ie.data);else if(M.isData3DTexture)L?(se&&t.texStorage3D(i.TEXTURE_3D,me,be,ie.width,ie.height,ie.depth),oe&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ie.width,ie.height,ie.depth,fe,Le,ie.data)):t.texImage3D(i.TEXTURE_3D,0,be,ie.width,ie.height,ie.depth,0,fe,Le,ie.data);else if(M.isFramebufferTexture){if(se)if(L)t.texStorage2D(i.TEXTURE_2D,me,be,ie.width,ie.height);else{let te=ie.width,Z=ie.height;for(let ve=0;ve<me;ve++)t.texImage2D(i.TEXTURE_2D,ve,be,te,Z,0,fe,Le,null),te>>=1,Z>>=1}}else if(He.length>0){if(L&&se){const te=xt(He[0]);t.texStorage2D(i.TEXTURE_2D,me,be,te.width,te.height)}for(let te=0,Z=He.length;te<Z;te++)ce=He[te],L?oe&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,fe,Le,ce):t.texImage2D(i.TEXTURE_2D,te,be,fe,Le,ce);M.generateMipmaps=!1}else if(L){if(se){const te=xt(ie);t.texStorage2D(i.TEXTURE_2D,me,be,te.width,te.height)}oe&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,fe,Le,ie)}else t.texImage2D(i.TEXTURE_2D,0,be,fe,Le,ie);m(M)&&h(K),Te.__version=Y.version,M.onUpdate&&M.onUpdate(M)}T.__version=M.version}function $(T,M,z){if(M.image.length!==6)return;const K=$e(T,M),j=M.source;t.bindTexture(i.TEXTURE_CUBE_MAP,T.__webglTexture,i.TEXTURE0+z);const Y=n.get(j);if(j.version!==Y.__version||K===!0){t.activeTexture(i.TEXTURE0+z);const Te=Ze.getPrimaries(Ze.workingColorSpace),ae=M.colorSpace===ni?null:Ze.getPrimaries(M.colorSpace),Se=M.colorSpace===ni||Te===ae?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Se);const Ee=M.isCompressedTexture||M.image[0].isCompressedTexture,ie=M.image[0]&&M.image[0].isDataTexture,fe=[];for(let Z=0;Z<6;Z++)!Ee&&!ie?fe[Z]=x(M.image[Z],!0,s.maxCubemapSize):fe[Z]=ie?M.image[Z].image:M.image[Z],fe[Z]=It(M,fe[Z]);const Le=fe[0],be=r.convert(M.format,M.colorSpace),ce=r.convert(M.type),He=b(M.internalFormat,be,ce,M.colorSpace),L=M.isVideoTexture!==!0,se=Y.__version===void 0||K===!0,oe=j.dataReady;let me=R(M,Le);Re(i.TEXTURE_CUBE_MAP,M);let te;if(Ee){L&&se&&t.texStorage2D(i.TEXTURE_CUBE_MAP,me,He,Le.width,Le.height);for(let Z=0;Z<6;Z++){te=fe[Z].mipmaps;for(let ve=0;ve<te.length;ve++){const Oe=te[ve];M.format!==Mn?be!==null?L?oe&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve,0,0,Oe.width,Oe.height,be,Oe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve,He,Oe.width,Oe.height,0,Oe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):L?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve,0,0,Oe.width,Oe.height,be,ce,Oe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve,He,Oe.width,Oe.height,0,be,ce,Oe.data)}}}else{if(te=M.mipmaps,L&&se){te.length>0&&me++;const Z=xt(fe[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,me,He,Z.width,Z.height)}for(let Z=0;Z<6;Z++)if(ie){L?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,fe[Z].width,fe[Z].height,be,ce,fe[Z].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,He,fe[Z].width,fe[Z].height,0,be,ce,fe[Z].data);for(let ve=0;ve<te.length;ve++){const lt=te[ve].image[Z].image;L?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve+1,0,0,lt.width,lt.height,be,ce,lt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve+1,He,lt.width,lt.height,0,be,ce,lt.data)}}else{L?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,be,ce,fe[Z]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,He,be,ce,fe[Z]);for(let ve=0;ve<te.length;ve++){const Oe=te[ve];L?oe&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve+1,0,0,be,ce,Oe.image[Z]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ve+1,He,be,ce,Oe.image[Z])}}}m(M)&&h(i.TEXTURE_CUBE_MAP),Y.__version=j.version,M.onUpdate&&M.onUpdate(M)}T.__version=M.version}function ue(T,M,z,K,j,Y){const Te=r.convert(z.format,z.colorSpace),ae=r.convert(z.type),Se=b(z.internalFormat,Te,ae,z.colorSpace),Ee=n.get(M),ie=n.get(z);if(ie.__renderTarget=M,!Ee.__hasExternalTextures){const fe=Math.max(1,M.width>>Y),Le=Math.max(1,M.height>>Y);j===i.TEXTURE_3D||j===i.TEXTURE_2D_ARRAY?t.texImage3D(j,Y,Se,fe,Le,M.depth,0,Te,ae,null):t.texImage2D(j,Y,Se,fe,Le,0,Te,ae,null)}t.bindFramebuffer(i.FRAMEBUFFER,T),ye(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,K,j,ie.__webglTexture,0,ht(M)):(j===i.TEXTURE_2D||j>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&j<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,K,j,ie.__webglTexture,Y),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Ae(T,M,z){if(i.bindRenderbuffer(i.RENDERBUFFER,T),M.depthBuffer){const K=M.depthTexture,j=K&&K.isDepthTexture?K.type:null,Y=S(M.stencilBuffer,j),Te=M.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ae=ht(M);ye(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ae,Y,M.width,M.height):z?i.renderbufferStorageMultisample(i.RENDERBUFFER,ae,Y,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,Y,M.width,M.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Te,i.RENDERBUFFER,T)}else{const K=M.textures;for(let j=0;j<K.length;j++){const Y=K[j],Te=r.convert(Y.format,Y.colorSpace),ae=r.convert(Y.type),Se=b(Y.internalFormat,Te,ae,Y.colorSpace),Ee=ht(M);z&&ye(M)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ee,Se,M.width,M.height):ye(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ee,Se,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,Se,M.width,M.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function xe(T,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,T),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const K=n.get(M.depthTexture);K.__renderTarget=M,(!K.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),k(M.depthTexture,0);const j=K.__webglTexture,Y=ht(M);if(M.depthTexture.format===Ds)ye(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,j,0,Y):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,j,0);else if(M.depthTexture.format===Us)ye(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,j,0,Y):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,j,0);else throw new Error("Unknown depthTexture format")}function Be(T){const M=n.get(T),z=T.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==T.depthTexture){const K=T.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),K){const j=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,K.removeEventListener("dispose",j)};K.addEventListener("dispose",j),M.__depthDisposeCallback=j}M.__boundDepthTexture=K}if(T.depthTexture&&!M.__autoAllocateDepthBuffer){if(z)throw new Error("target.depthTexture not supported in Cube render targets");const K=T.texture.mipmaps;K&&K.length>0?xe(M.__webglFramebuffer[0],T):xe(M.__webglFramebuffer,T)}else if(z){M.__webglDepthbuffer=[];for(let K=0;K<6;K++)if(t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[K]),M.__webglDepthbuffer[K]===void 0)M.__webglDepthbuffer[K]=i.createRenderbuffer(),Ae(M.__webglDepthbuffer[K],T,!1);else{const j=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Y=M.__webglDepthbuffer[K];i.bindRenderbuffer(i.RENDERBUFFER,Y),i.framebufferRenderbuffer(i.FRAMEBUFFER,j,i.RENDERBUFFER,Y)}}else{const K=T.texture.mipmaps;if(K&&K.length>0?t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=i.createRenderbuffer(),Ae(M.__webglDepthbuffer,T,!1);else{const j=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Y=M.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Y),i.framebufferRenderbuffer(i.FRAMEBUFFER,j,i.RENDERBUFFER,Y)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function Mt(T,M,z){const K=n.get(T);M!==void 0&&ue(K.__webglFramebuffer,T,T.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),z!==void 0&&Be(T)}function C(T){const M=T.texture,z=n.get(T),K=n.get(M);T.addEventListener("dispose",P);const j=T.textures,Y=T.isWebGLCubeRenderTarget===!0,Te=j.length>1;if(Te||(K.__webglTexture===void 0&&(K.__webglTexture=i.createTexture()),K.__version=M.version,a.memory.textures++),Y){z.__webglFramebuffer=[];for(let ae=0;ae<6;ae++)if(M.mipmaps&&M.mipmaps.length>0){z.__webglFramebuffer[ae]=[];for(let Se=0;Se<M.mipmaps.length;Se++)z.__webglFramebuffer[ae][Se]=i.createFramebuffer()}else z.__webglFramebuffer[ae]=i.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){z.__webglFramebuffer=[];for(let ae=0;ae<M.mipmaps.length;ae++)z.__webglFramebuffer[ae]=i.createFramebuffer()}else z.__webglFramebuffer=i.createFramebuffer();if(Te)for(let ae=0,Se=j.length;ae<Se;ae++){const Ee=n.get(j[ae]);Ee.__webglTexture===void 0&&(Ee.__webglTexture=i.createTexture(),a.memory.textures++)}if(T.samples>0&&ye(T)===!1){z.__webglMultisampledFramebuffer=i.createFramebuffer(),z.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,z.__webglMultisampledFramebuffer);for(let ae=0;ae<j.length;ae++){const Se=j[ae];z.__webglColorRenderbuffer[ae]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,z.__webglColorRenderbuffer[ae]);const Ee=r.convert(Se.format,Se.colorSpace),ie=r.convert(Se.type),fe=b(Se.internalFormat,Ee,ie,Se.colorSpace,T.isXRRenderTarget===!0),Le=ht(T);i.renderbufferStorageMultisample(i.RENDERBUFFER,Le,fe,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ae,i.RENDERBUFFER,z.__webglColorRenderbuffer[ae])}i.bindRenderbuffer(i.RENDERBUFFER,null),T.depthBuffer&&(z.__webglDepthRenderbuffer=i.createRenderbuffer(),Ae(z.__webglDepthRenderbuffer,T,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Y){t.bindTexture(i.TEXTURE_CUBE_MAP,K.__webglTexture),Re(i.TEXTURE_CUBE_MAP,M);for(let ae=0;ae<6;ae++)if(M.mipmaps&&M.mipmaps.length>0)for(let Se=0;Se<M.mipmaps.length;Se++)ue(z.__webglFramebuffer[ae][Se],T,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Se);else ue(z.__webglFramebuffer[ae],T,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0);m(M)&&h(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Te){for(let ae=0,Se=j.length;ae<Se;ae++){const Ee=j[ae],ie=n.get(Ee);let fe=i.TEXTURE_2D;(T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(fe=T.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(fe,ie.__webglTexture),Re(fe,Ee),ue(z.__webglFramebuffer,T,Ee,i.COLOR_ATTACHMENT0+ae,fe,0),m(Ee)&&h(fe)}t.unbindTexture()}else{let ae=i.TEXTURE_2D;if((T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(ae=T.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ae,K.__webglTexture),Re(ae,M),M.mipmaps&&M.mipmaps.length>0)for(let Se=0;Se<M.mipmaps.length;Se++)ue(z.__webglFramebuffer[Se],T,M,i.COLOR_ATTACHMENT0,ae,Se);else ue(z.__webglFramebuffer,T,M,i.COLOR_ATTACHMENT0,ae,0);m(M)&&h(ae),t.unbindTexture()}T.depthBuffer&&Be(T)}function ut(T){const M=T.textures;for(let z=0,K=M.length;z<K;z++){const j=M[z];if(m(j)){const Y=E(T),Te=n.get(j).__webglTexture;t.bindTexture(Y,Te),h(Y),t.unbindTexture()}}}const ke=[],De=[];function Me(T){if(T.samples>0){if(ye(T)===!1){const M=T.textures,z=T.width,K=T.height;let j=i.COLOR_BUFFER_BIT;const Y=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Te=n.get(T),ae=M.length>1;if(ae)for(let Ee=0;Ee<M.length;Ee++)t.bindFramebuffer(i.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ee,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Te.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ee,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Te.__webglMultisampledFramebuffer);const Se=T.texture.mipmaps;Se&&Se.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Te.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Te.__webglFramebuffer);for(let Ee=0;Ee<M.length;Ee++){if(T.resolveDepthBuffer&&(T.depthBuffer&&(j|=i.DEPTH_BUFFER_BIT),T.stencilBuffer&&T.resolveStencilBuffer&&(j|=i.STENCIL_BUFFER_BIT)),ae){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Te.__webglColorRenderbuffer[Ee]);const ie=n.get(M[Ee]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,ie,0)}i.blitFramebuffer(0,0,z,K,0,0,z,K,j,i.NEAREST),l===!0&&(ke.length=0,De.length=0,ke.push(i.COLOR_ATTACHMENT0+Ee),T.depthBuffer&&T.resolveDepthBuffer===!1&&(ke.push(Y),De.push(Y),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,De)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ke))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ae)for(let Ee=0;Ee<M.length;Ee++){t.bindFramebuffer(i.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ee,i.RENDERBUFFER,Te.__webglColorRenderbuffer[Ee]);const ie=n.get(M[Ee]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Te.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ee,i.TEXTURE_2D,ie,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Te.__webglMultisampledFramebuffer)}else if(T.depthBuffer&&T.resolveDepthBuffer===!1&&l){const M=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[M])}}}function ht(T){return Math.min(s.maxSamples,T.samples)}function ye(T){const M=n.get(T);return T.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function Ve(T){const M=a.render.frame;d.get(T)!==M&&(d.set(T,M),T.update())}function It(T,M){const z=T.colorSpace,K=T.format,j=T.type;return T.isCompressedTexture===!0||T.isVideoTexture===!0||z!==ss&&z!==ni&&(Ze.getTransfer(z)===st?(K!==Mn||j!==Ln)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",z)),M}function xt(T){return typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement?(c.width=T.naturalWidth||T.width,c.height=T.naturalHeight||T.height):typeof VideoFrame<"u"&&T instanceof VideoFrame?(c.width=T.displayWidth,c.height=T.displayHeight):(c.width=T.width,c.height=T.height),c}this.allocateTextureUnit=X,this.resetTextureUnits=N,this.setTexture2D=k,this.setTexture2DArray=U,this.setTexture3D=q,this.setTextureCube=V,this.rebindTextures=Mt,this.setupRenderTarget=C,this.updateRenderTargetMipmap=ut,this.updateMultisampleRenderTarget=Me,this.setupDepthRenderbuffer=Be,this.setupFrameBufferTexture=ue,this.useMultisampledRTT=ye}function o0(i,e){function t(n,s=ni){let r;const a=Ze.getTransfer(s);if(n===Ln)return i.UNSIGNED_BYTE;if(n===Vo)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Go)return i.UNSIGNED_SHORT_5_5_5_1;if(n===qc)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Yc)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Wc)return i.BYTE;if(n===Xc)return i.SHORT;if(n===Is)return i.UNSIGNED_SHORT;if(n===zo)return i.INT;if(n===bi)return i.UNSIGNED_INT;if(n===Cn)return i.FLOAT;if(n===Wn)return i.HALF_FLOAT;if(n===$c)return i.ALPHA;if(n===Kc)return i.RGB;if(n===Mn)return i.RGBA;if(n===Ds)return i.DEPTH_COMPONENT;if(n===Us)return i.DEPTH_STENCIL;if(n===Wo)return i.RED;if(n===Xo)return i.RED_INTEGER;if(n===Zc)return i.RG;if(n===qo)return i.RG_INTEGER;if(n===Yo)return i.RGBA_INTEGER;if(n===wr||n===Ar||n===Cr||n===Rr)if(a===st)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===wr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Ar)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Cr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Rr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===wr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Ar)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Cr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Rr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===io||n===so||n===ro||n===ao)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===io)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===so)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===ro)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ao)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===oo||n===lo||n===co)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===oo||n===lo)return a===st?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===co)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===uo||n===ho||n===fo||n===po||n===mo||n===go||n===_o||n===vo||n===xo||n===Mo||n===yo||n===So||n===Eo||n===bo)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===uo)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===ho)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===fo)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===po)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===mo)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===go)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===_o)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===vo)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===xo)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Mo)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===yo)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===So)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Eo)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===bo)return a===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===To||n===wo||n===Ao)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===To)return a===st?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===wo)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Ao)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Co||n===Ro||n===Po||n===Io)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===Co)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Ro)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Po)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Io)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Ls?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const l0=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,c0=`
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

}`;class d0{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new ud(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Wt({vertexShader:l0,fragmentShader:c0,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new re(new fn(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class u0 extends os{constructor(e,t){super();const n=this;let s=null,r=1,a=null,o="local-floor",l=1,c=null,d=null,u=null,f=null,p=null,g=null;const x=typeof XRWebGLBinding<"u",m=new d0,h={},E=t.getContextAttributes();let b=null,S=null;const R=[],w=[],P=new we;let I=null;const _=new cn;_.viewport=new rt;const v=new cn;v.viewport=new rt;const A=[_,v],N=new Rh;let X=null,O=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(H){let $=R[H];return $===void 0&&($=new xa,R[H]=$),$.getTargetRaySpace()},this.getControllerGrip=function(H){let $=R[H];return $===void 0&&($=new xa,R[H]=$),$.getGripSpace()},this.getHand=function(H){let $=R[H];return $===void 0&&($=new xa,R[H]=$),$.getHandSpace()};function k(H){const $=w.indexOf(H.inputSource);if($===-1)return;const ue=R[$];ue!==void 0&&(ue.update(H.inputSource,H.frame,c||a),ue.dispatchEvent({type:H.type,data:H.inputSource}))}function U(){s.removeEventListener("select",k),s.removeEventListener("selectstart",k),s.removeEventListener("selectend",k),s.removeEventListener("squeeze",k),s.removeEventListener("squeezestart",k),s.removeEventListener("squeezeend",k),s.removeEventListener("end",U),s.removeEventListener("inputsourceschange",q);for(let H=0;H<R.length;H++){const $=w[H];$!==null&&(w[H]=null,R[H].disconnect($))}X=null,O=null,m.reset();for(const H in h)delete h[H];e.setRenderTarget(b),p=null,f=null,u=null,s=null,S=null,Q.stop(),n.isPresenting=!1,e.setPixelRatio(I),e.setSize(P.width,P.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(H){r=H,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(H){o=H,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(H){c=H},this.getBaseLayer=function(){return f!==null?f:p},this.getBinding=function(){return u===null&&x&&(u=new XRWebGLBinding(s,t)),u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(H){if(s=H,s!==null){if(b=e.getRenderTarget(),s.addEventListener("select",k),s.addEventListener("selectstart",k),s.addEventListener("selectend",k),s.addEventListener("squeeze",k),s.addEventListener("squeezestart",k),s.addEventListener("squeezeend",k),s.addEventListener("end",U),s.addEventListener("inputsourceschange",q),E.xrCompatible!==!0&&await t.makeXRCompatible(),I=e.getPixelRatio(),e.getSize(P),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let ue=null,Ae=null,xe=null;E.depth&&(xe=E.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ue=E.stencil?Us:Ds,Ae=E.stencil?Ls:bi);const Be={colorFormat:t.RGBA8,depthFormat:xe,scaleFactor:r};u=this.getBinding(),f=u.createProjectionLayer(Be),s.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),S=new Sn(f.textureWidth,f.textureHeight,{format:Mn,type:Ln,depthTexture:new dd(f.textureWidth,f.textureHeight,Ae,void 0,void 0,void 0,void 0,void 0,void 0,ue),stencilBuffer:E.stencil,colorSpace:e.outputColorSpace,samples:E.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{const ue={antialias:E.antialias,alpha:!0,depth:E.depth,stencil:E.stencil,framebufferScaleFactor:r};p=new XRWebGLLayer(s,t,ue),s.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),S=new Sn(p.framebufferWidth,p.framebufferHeight,{format:Mn,type:Ln,colorSpace:e.outputColorSpace,stencilBuffer:E.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),Q.setContext(s),Q.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function q(H){for(let $=0;$<H.removed.length;$++){const ue=H.removed[$],Ae=w.indexOf(ue);Ae>=0&&(w[Ae]=null,R[Ae].disconnect(ue))}for(let $=0;$<H.added.length;$++){const ue=H.added[$];let Ae=w.indexOf(ue);if(Ae===-1){for(let Be=0;Be<R.length;Be++)if(Be>=w.length){w.push(ue),Ae=Be;break}else if(w[Be]===null){w[Be]=ue,Ae=Be;break}if(Ae===-1)break}const xe=R[Ae];xe&&xe.connect(ue)}}const V=new D,J=new D;function ee(H,$,ue){V.setFromMatrixPosition($.matrixWorld),J.setFromMatrixPosition(ue.matrixWorld);const Ae=V.distanceTo(J),xe=$.projectionMatrix.elements,Be=ue.projectionMatrix.elements,Mt=xe[14]/(xe[10]-1),C=xe[14]/(xe[10]+1),ut=(xe[9]+1)/xe[5],ke=(xe[9]-1)/xe[5],De=(xe[8]-1)/xe[0],Me=(Be[8]+1)/Be[0],ht=Mt*De,ye=Mt*Me,Ve=Ae/(-De+Me),It=Ve*-De;if($.matrixWorld.decompose(H.position,H.quaternion,H.scale),H.translateX(It),H.translateZ(Ve),H.matrixWorld.compose(H.position,H.quaternion,H.scale),H.matrixWorldInverse.copy(H.matrixWorld).invert(),xe[10]===-1)H.projectionMatrix.copy($.projectionMatrix),H.projectionMatrixInverse.copy($.projectionMatrixInverse);else{const xt=Mt+Ve,T=C+Ve,M=ht-It,z=ye+(Ae-It),K=ut*C/T*xt,j=ke*C/T*xt;H.projectionMatrix.makePerspective(M,z,K,j,xt,T),H.projectionMatrixInverse.copy(H.projectionMatrix).invert()}}function de(H,$){$===null?H.matrixWorld.copy(H.matrix):H.matrixWorld.multiplyMatrices($.matrixWorld,H.matrix),H.matrixWorldInverse.copy(H.matrixWorld).invert()}this.updateCamera=function(H){if(s===null)return;let $=H.near,ue=H.far;m.texture!==null&&(m.depthNear>0&&($=m.depthNear),m.depthFar>0&&(ue=m.depthFar)),N.near=v.near=_.near=$,N.far=v.far=_.far=ue,(X!==N.near||O!==N.far)&&(s.updateRenderState({depthNear:N.near,depthFar:N.far}),X=N.near,O=N.far),N.layers.mask=H.layers.mask|6,_.layers.mask=N.layers.mask&3,v.layers.mask=N.layers.mask&5;const Ae=H.parent,xe=N.cameras;de(N,Ae);for(let Be=0;Be<xe.length;Be++)de(xe[Be],Ae);xe.length===2?ee(N,_,v):N.projectionMatrix.copy(_.projectionMatrix),Re(H,N,Ae)};function Re(H,$,ue){ue===null?H.matrix.copy($.matrixWorld):(H.matrix.copy(ue.matrixWorld),H.matrix.invert(),H.matrix.multiply($.matrixWorld)),H.matrix.decompose(H.position,H.quaternion,H.scale),H.updateMatrixWorld(!0),H.projectionMatrix.copy($.projectionMatrix),H.projectionMatrixInverse.copy($.projectionMatrixInverse),H.isPerspectiveCamera&&(H.fov=Ns*2*Math.atan(1/H.projectionMatrix.elements[5]),H.zoom=1)}this.getCamera=function(){return N},this.getFoveation=function(){if(!(f===null&&p===null))return l},this.setFoveation=function(H){l=H,f!==null&&(f.fixedFoveation=H),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=H)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(N)},this.getCameraTexture=function(H){return h[H]};let $e=null;function je(H,$){if(d=$.getViewerPose(c||a),g=$,d!==null){const ue=d.views;p!==null&&(e.setRenderTargetFramebuffer(S,p.framebuffer),e.setRenderTarget(S));let Ae=!1;ue.length!==N.cameras.length&&(N.cameras.length=0,Ae=!0);for(let C=0;C<ue.length;C++){const ut=ue[C];let ke=null;if(p!==null)ke=p.getViewport(ut);else{const Me=u.getViewSubImage(f,ut);ke=Me.viewport,C===0&&(e.setRenderTargetTextures(S,Me.colorTexture,Me.depthStencilTexture),e.setRenderTarget(S))}let De=A[C];De===void 0&&(De=new cn,De.layers.enable(C),De.viewport=new rt,A[C]=De),De.matrix.fromArray(ut.transform.matrix),De.matrix.decompose(De.position,De.quaternion,De.scale),De.projectionMatrix.fromArray(ut.projectionMatrix),De.projectionMatrixInverse.copy(De.projectionMatrix).invert(),De.viewport.set(ke.x,ke.y,ke.width,ke.height),C===0&&(N.matrix.copy(De.matrix),N.matrix.decompose(N.position,N.quaternion,N.scale)),Ae===!0&&N.cameras.push(De)}const xe=s.enabledFeatures;if(xe&&xe.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&x){u=n.getBinding();const C=u.getDepthInformation(ue[0]);C&&C.isValid&&C.texture&&m.init(C,s.renderState)}if(xe&&xe.includes("camera-access")&&x){e.state.unbindTexture(),u=n.getBinding();for(let C=0;C<ue.length;C++){const ut=ue[C].camera;if(ut){let ke=h[ut];ke||(ke=new ud,h[ut]=ke);const De=u.getCameraImage(ut);ke.sourceTexture=De}}}}for(let ue=0;ue<R.length;ue++){const Ae=w[ue],xe=R[ue];Ae!==null&&xe!==void 0&&xe.update(Ae,$,c||a)}$e&&$e(H,$),$.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:$}),g=null}const Q=new fd;Q.setAnimationLoop(je),this.setAnimationLoop=function(H){$e=H},this.dispose=function(){}}}const pi=new Dn,h0=new at;function f0(i,e){function t(m,h){m.matrixAutoUpdate===!0&&m.updateMatrix(),h.value.copy(m.matrix)}function n(m,h){h.color.getRGB(m.fogColor.value,sd(i)),h.isFog?(m.fogNear.value=h.near,m.fogFar.value=h.far):h.isFogExp2&&(m.fogDensity.value=h.density)}function s(m,h,E,b,S){h.isMeshBasicMaterial||h.isMeshLambertMaterial?r(m,h):h.isMeshToonMaterial?(r(m,h),u(m,h)):h.isMeshPhongMaterial?(r(m,h),d(m,h)):h.isMeshStandardMaterial?(r(m,h),f(m,h),h.isMeshPhysicalMaterial&&p(m,h,S)):h.isMeshMatcapMaterial?(r(m,h),g(m,h)):h.isMeshDepthMaterial?r(m,h):h.isMeshDistanceMaterial?(r(m,h),x(m,h)):h.isMeshNormalMaterial?r(m,h):h.isLineBasicMaterial?(a(m,h),h.isLineDashedMaterial&&o(m,h)):h.isPointsMaterial?l(m,h,E,b):h.isSpriteMaterial?c(m,h):h.isShadowMaterial?(m.color.value.copy(h.color),m.opacity.value=h.opacity):h.isShaderMaterial&&(h.uniformsNeedUpdate=!1)}function r(m,h){m.opacity.value=h.opacity,h.color&&m.diffuse.value.copy(h.color),h.emissive&&m.emissive.value.copy(h.emissive).multiplyScalar(h.emissiveIntensity),h.map&&(m.map.value=h.map,t(h.map,m.mapTransform)),h.alphaMap&&(m.alphaMap.value=h.alphaMap,t(h.alphaMap,m.alphaMapTransform)),h.bumpMap&&(m.bumpMap.value=h.bumpMap,t(h.bumpMap,m.bumpMapTransform),m.bumpScale.value=h.bumpScale,h.side===qt&&(m.bumpScale.value*=-1)),h.normalMap&&(m.normalMap.value=h.normalMap,t(h.normalMap,m.normalMapTransform),m.normalScale.value.copy(h.normalScale),h.side===qt&&m.normalScale.value.negate()),h.displacementMap&&(m.displacementMap.value=h.displacementMap,t(h.displacementMap,m.displacementMapTransform),m.displacementScale.value=h.displacementScale,m.displacementBias.value=h.displacementBias),h.emissiveMap&&(m.emissiveMap.value=h.emissiveMap,t(h.emissiveMap,m.emissiveMapTransform)),h.specularMap&&(m.specularMap.value=h.specularMap,t(h.specularMap,m.specularMapTransform)),h.alphaTest>0&&(m.alphaTest.value=h.alphaTest);const E=e.get(h),b=E.envMap,S=E.envMapRotation;b&&(m.envMap.value=b,pi.copy(S),pi.x*=-1,pi.y*=-1,pi.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(pi.y*=-1,pi.z*=-1),m.envMapRotation.value.setFromMatrix4(h0.makeRotationFromEuler(pi)),m.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=h.reflectivity,m.ior.value=h.ior,m.refractionRatio.value=h.refractionRatio),h.lightMap&&(m.lightMap.value=h.lightMap,m.lightMapIntensity.value=h.lightMapIntensity,t(h.lightMap,m.lightMapTransform)),h.aoMap&&(m.aoMap.value=h.aoMap,m.aoMapIntensity.value=h.aoMapIntensity,t(h.aoMap,m.aoMapTransform))}function a(m,h){m.diffuse.value.copy(h.color),m.opacity.value=h.opacity,h.map&&(m.map.value=h.map,t(h.map,m.mapTransform))}function o(m,h){m.dashSize.value=h.dashSize,m.totalSize.value=h.dashSize+h.gapSize,m.scale.value=h.scale}function l(m,h,E,b){m.diffuse.value.copy(h.color),m.opacity.value=h.opacity,m.size.value=h.size*E,m.scale.value=b*.5,h.map&&(m.map.value=h.map,t(h.map,m.uvTransform)),h.alphaMap&&(m.alphaMap.value=h.alphaMap,t(h.alphaMap,m.alphaMapTransform)),h.alphaTest>0&&(m.alphaTest.value=h.alphaTest)}function c(m,h){m.diffuse.value.copy(h.color),m.opacity.value=h.opacity,m.rotation.value=h.rotation,h.map&&(m.map.value=h.map,t(h.map,m.mapTransform)),h.alphaMap&&(m.alphaMap.value=h.alphaMap,t(h.alphaMap,m.alphaMapTransform)),h.alphaTest>0&&(m.alphaTest.value=h.alphaTest)}function d(m,h){m.specular.value.copy(h.specular),m.shininess.value=Math.max(h.shininess,1e-4)}function u(m,h){h.gradientMap&&(m.gradientMap.value=h.gradientMap)}function f(m,h){m.metalness.value=h.metalness,h.metalnessMap&&(m.metalnessMap.value=h.metalnessMap,t(h.metalnessMap,m.metalnessMapTransform)),m.roughness.value=h.roughness,h.roughnessMap&&(m.roughnessMap.value=h.roughnessMap,t(h.roughnessMap,m.roughnessMapTransform)),h.envMap&&(m.envMapIntensity.value=h.envMapIntensity)}function p(m,h,E){m.ior.value=h.ior,h.sheen>0&&(m.sheenColor.value.copy(h.sheenColor).multiplyScalar(h.sheen),m.sheenRoughness.value=h.sheenRoughness,h.sheenColorMap&&(m.sheenColorMap.value=h.sheenColorMap,t(h.sheenColorMap,m.sheenColorMapTransform)),h.sheenRoughnessMap&&(m.sheenRoughnessMap.value=h.sheenRoughnessMap,t(h.sheenRoughnessMap,m.sheenRoughnessMapTransform))),h.clearcoat>0&&(m.clearcoat.value=h.clearcoat,m.clearcoatRoughness.value=h.clearcoatRoughness,h.clearcoatMap&&(m.clearcoatMap.value=h.clearcoatMap,t(h.clearcoatMap,m.clearcoatMapTransform)),h.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=h.clearcoatRoughnessMap,t(h.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),h.clearcoatNormalMap&&(m.clearcoatNormalMap.value=h.clearcoatNormalMap,t(h.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(h.clearcoatNormalScale),h.side===qt&&m.clearcoatNormalScale.value.negate())),h.dispersion>0&&(m.dispersion.value=h.dispersion),h.iridescence>0&&(m.iridescence.value=h.iridescence,m.iridescenceIOR.value=h.iridescenceIOR,m.iridescenceThicknessMinimum.value=h.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=h.iridescenceThicknessRange[1],h.iridescenceMap&&(m.iridescenceMap.value=h.iridescenceMap,t(h.iridescenceMap,m.iridescenceMapTransform)),h.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=h.iridescenceThicknessMap,t(h.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),h.transmission>0&&(m.transmission.value=h.transmission,m.transmissionSamplerMap.value=E.texture,m.transmissionSamplerSize.value.set(E.width,E.height),h.transmissionMap&&(m.transmissionMap.value=h.transmissionMap,t(h.transmissionMap,m.transmissionMapTransform)),m.thickness.value=h.thickness,h.thicknessMap&&(m.thicknessMap.value=h.thicknessMap,t(h.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=h.attenuationDistance,m.attenuationColor.value.copy(h.attenuationColor)),h.anisotropy>0&&(m.anisotropyVector.value.set(h.anisotropy*Math.cos(h.anisotropyRotation),h.anisotropy*Math.sin(h.anisotropyRotation)),h.anisotropyMap&&(m.anisotropyMap.value=h.anisotropyMap,t(h.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=h.specularIntensity,m.specularColor.value.copy(h.specularColor),h.specularColorMap&&(m.specularColorMap.value=h.specularColorMap,t(h.specularColorMap,m.specularColorMapTransform)),h.specularIntensityMap&&(m.specularIntensityMap.value=h.specularIntensityMap,t(h.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,h){h.matcap&&(m.matcap.value=h.matcap)}function x(m,h){const E=e.get(h).light;m.referencePosition.value.setFromMatrixPosition(E.matrixWorld),m.nearDistance.value=E.shadow.camera.near,m.farDistance.value=E.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function p0(i,e,t,n){let s={},r={},a=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(E,b){const S=b.program;n.uniformBlockBinding(E,S)}function c(E,b){let S=s[E.id];S===void 0&&(g(E),S=d(E),s[E.id]=S,E.addEventListener("dispose",m));const R=b.program;n.updateUBOMapping(E,R);const w=e.render.frame;r[E.id]!==w&&(f(E),r[E.id]=w)}function d(E){const b=u();E.__bindingPointIndex=b;const S=i.createBuffer(),R=E.__size,w=E.usage;return i.bindBuffer(i.UNIFORM_BUFFER,S),i.bufferData(i.UNIFORM_BUFFER,R,w),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,b,S),S}function u(){for(let E=0;E<o;E++)if(a.indexOf(E)===-1)return a.push(E),E;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(E){const b=s[E.id],S=E.uniforms,R=E.__cache;i.bindBuffer(i.UNIFORM_BUFFER,b);for(let w=0,P=S.length;w<P;w++){const I=Array.isArray(S[w])?S[w]:[S[w]];for(let _=0,v=I.length;_<v;_++){const A=I[_];if(p(A,w,_,R)===!0){const N=A.__offset,X=Array.isArray(A.value)?A.value:[A.value];let O=0;for(let k=0;k<X.length;k++){const U=X[k],q=x(U);typeof U=="number"||typeof U=="boolean"?(A.__data[0]=U,i.bufferSubData(i.UNIFORM_BUFFER,N+O,A.__data)):U.isMatrix3?(A.__data[0]=U.elements[0],A.__data[1]=U.elements[1],A.__data[2]=U.elements[2],A.__data[3]=0,A.__data[4]=U.elements[3],A.__data[5]=U.elements[4],A.__data[6]=U.elements[5],A.__data[7]=0,A.__data[8]=U.elements[6],A.__data[9]=U.elements[7],A.__data[10]=U.elements[8],A.__data[11]=0):(U.toArray(A.__data,O),O+=q.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,N,A.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function p(E,b,S,R){const w=E.value,P=b+"_"+S;if(R[P]===void 0)return typeof w=="number"||typeof w=="boolean"?R[P]=w:R[P]=w.clone(),!0;{const I=R[P];if(typeof w=="number"||typeof w=="boolean"){if(I!==w)return R[P]=w,!0}else if(I.equals(w)===!1)return I.copy(w),!0}return!1}function g(E){const b=E.uniforms;let S=0;const R=16;for(let P=0,I=b.length;P<I;P++){const _=Array.isArray(b[P])?b[P]:[b[P]];for(let v=0,A=_.length;v<A;v++){const N=_[v],X=Array.isArray(N.value)?N.value:[N.value];for(let O=0,k=X.length;O<k;O++){const U=X[O],q=x(U),V=S%R,J=V%q.boundary,ee=V+J;S+=J,ee!==0&&R-ee<q.storage&&(S+=R-ee),N.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),N.__offset=S,S+=q.storage}}}const w=S%R;return w>0&&(S+=R-w),E.__size=S,E.__cache={},this}function x(E){const b={boundary:0,storage:0};return typeof E=="number"||typeof E=="boolean"?(b.boundary=4,b.storage=4):E.isVector2?(b.boundary=8,b.storage=8):E.isVector3||E.isColor?(b.boundary=16,b.storage=12):E.isVector4?(b.boundary=16,b.storage=16):E.isMatrix3?(b.boundary=48,b.storage=48):E.isMatrix4?(b.boundary=64,b.storage=64):E.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",E),b}function m(E){const b=E.target;b.removeEventListener("dispose",m);const S=a.indexOf(b.__bindingPointIndex);a.splice(S,1),i.deleteBuffer(s[b.id]),delete s[b.id],delete r[b.id]}function h(){for(const E in s)i.deleteBuffer(s[E]);a=[],s={},r={}}return{bind:l,update:c,dispose:h}}class m0{constructor(e={}){const{canvas:t=Vu(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:d="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:f=!1}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=n.getContextAttributes().alpha}else p=a;const g=new Uint32Array(4),x=new Int32Array(4);let m=null,h=null;const E=[],b=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=si,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const S=this;let R=!1;this._outputColorSpace=an;let w=0,P=0,I=null,_=-1,v=null;const A=new rt,N=new rt;let X=null;const O=new Fe(0);let k=0,U=t.width,q=t.height,V=1,J=null,ee=null;const de=new rt(0,0,U,q),Re=new rt(0,0,U,q);let $e=!1;const je=new el;let Q=!1,H=!1;const $=new at,ue=new D,Ae=new rt,xe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Be=!1;function Mt(){return I===null?V:1}let C=n;function ut(y,F){return t.getContext(y,F)}try{const y={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:d,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ho}`),t.addEventListener("webglcontextlost",oe,!1),t.addEventListener("webglcontextrestored",me,!1),t.addEventListener("webglcontextcreationerror",te,!1),C===null){const F="webgl2";if(C=ut(F,y),C===null)throw ut(F)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(y){throw console.error("THREE.WebGLRenderer: "+y.message),y}let ke,De,Me,ht,ye,Ve,It,xt,T,M,z,K,j,Y,Te,ae,Se,Ee,ie,fe,Le,be,ce,He;function L(){ke=new Tm(C),ke.init(),be=new o0(C,ke),De=new vm(C,ke,e,be),Me=new r0(C,ke),De.reversedDepthBuffer&&f&&Me.buffers.depth.setReversed(!0),ht=new Cm(C),ye=new qg,Ve=new a0(C,ke,Me,ye,De,be,ht),It=new Mm(S),xt=new bm(S),T=new Dh(C),ce=new gm(C,T),M=new wm(C,T,ht,ce),z=new Pm(C,M,T,ht),ie=new Rm(C,De,Ve),ae=new xm(ye),K=new Xg(S,It,xt,ke,De,ce,ae),j=new f0(S,ye),Y=new $g,Te=new e0(ke),Ee=new mm(S,It,xt,Me,z,p,l),Se=new i0(S,z,De),He=new p0(C,ht,De,Me),fe=new _m(C,ke,ht),Le=new Am(C,ke,ht),ht.programs=K.programs,S.capabilities=De,S.extensions=ke,S.properties=ye,S.renderLists=Y,S.shadowMap=Se,S.state=Me,S.info=ht}L();const se=new u0(S,C);this.xr=se,this.getContext=function(){return C},this.getContextAttributes=function(){return C.getContextAttributes()},this.forceContextLoss=function(){const y=ke.get("WEBGL_lose_context");y&&y.loseContext()},this.forceContextRestore=function(){const y=ke.get("WEBGL_lose_context");y&&y.restoreContext()},this.getPixelRatio=function(){return V},this.setPixelRatio=function(y){y!==void 0&&(V=y,this.setSize(U,q,!1))},this.getSize=function(y){return y.set(U,q)},this.setSize=function(y,F,G=!0){if(se.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}U=y,q=F,t.width=Math.floor(y*V),t.height=Math.floor(F*V),G===!0&&(t.style.width=y+"px",t.style.height=F+"px"),this.setViewport(0,0,y,F)},this.getDrawingBufferSize=function(y){return y.set(U*V,q*V).floor()},this.setDrawingBufferSize=function(y,F,G){U=y,q=F,V=G,t.width=Math.floor(y*G),t.height=Math.floor(F*G),this.setViewport(0,0,y,F)},this.getCurrentViewport=function(y){return y.copy(A)},this.getViewport=function(y){return y.copy(de)},this.setViewport=function(y,F,G,W){y.isVector4?de.set(y.x,y.y,y.z,y.w):de.set(y,F,G,W),Me.viewport(A.copy(de).multiplyScalar(V).round())},this.getScissor=function(y){return y.copy(Re)},this.setScissor=function(y,F,G,W){y.isVector4?Re.set(y.x,y.y,y.z,y.w):Re.set(y,F,G,W),Me.scissor(N.copy(Re).multiplyScalar(V).round())},this.getScissorTest=function(){return $e},this.setScissorTest=function(y){Me.setScissorTest($e=y)},this.setOpaqueSort=function(y){J=y},this.setTransparentSort=function(y){ee=y},this.getClearColor=function(y){return y.copy(Ee.getClearColor())},this.setClearColor=function(){Ee.setClearColor(...arguments)},this.getClearAlpha=function(){return Ee.getClearAlpha()},this.setClearAlpha=function(){Ee.setClearAlpha(...arguments)},this.clear=function(y=!0,F=!0,G=!0){let W=0;if(y){let B=!1;if(I!==null){const ne=I.texture.format;B=ne===Yo||ne===qo||ne===Xo}if(B){const ne=I.texture.type,he=ne===Ln||ne===bi||ne===Is||ne===Ls||ne===Vo||ne===Go,_e=Ee.getClearColor(),pe=Ee.getClearAlpha(),Ie=_e.r,Ue=_e.g,Ce=_e.b;he?(g[0]=Ie,g[1]=Ue,g[2]=Ce,g[3]=pe,C.clearBufferuiv(C.COLOR,0,g)):(x[0]=Ie,x[1]=Ue,x[2]=Ce,x[3]=pe,C.clearBufferiv(C.COLOR,0,x))}else W|=C.COLOR_BUFFER_BIT}F&&(W|=C.DEPTH_BUFFER_BIT),G&&(W|=C.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),C.clear(W)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",oe,!1),t.removeEventListener("webglcontextrestored",me,!1),t.removeEventListener("webglcontextcreationerror",te,!1),Ee.dispose(),Y.dispose(),Te.dispose(),ye.dispose(),It.dispose(),xt.dispose(),z.dispose(),ce.dispose(),He.dispose(),K.dispose(),se.dispose(),se.removeEventListener("sessionstart",bn),se.removeEventListener("sessionend",ul),oi.stop()};function oe(y){y.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),R=!0}function me(){console.log("THREE.WebGLRenderer: Context Restored."),R=!1;const y=ht.autoReset,F=Se.enabled,G=Se.autoUpdate,W=Se.needsUpdate,B=Se.type;L(),ht.autoReset=y,Se.enabled=F,Se.autoUpdate=G,Se.needsUpdate=W,Se.type=B}function te(y){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",y.statusMessage)}function Z(y){const F=y.target;F.removeEventListener("dispose",Z),ve(F)}function ve(y){Oe(y),ye.remove(y)}function Oe(y){const F=ye.get(y).programs;F!==void 0&&(F.forEach(function(G){K.releaseProgram(G)}),y.isShaderMaterial&&K.releaseShaderCache(y))}this.renderBufferDirect=function(y,F,G,W,B,ne){F===null&&(F=xe);const he=B.isMesh&&B.matrixWorld.determinant()<0,_e=Ud(y,F,G,W,B);Me.setMaterial(W,he);let pe=G.index,Ie=1;if(W.wireframe===!0){if(pe=M.getWireframeAttribute(G),pe===void 0)return;Ie=2}const Ue=G.drawRange,Ce=G.attributes.position;let qe=Ue.start*Ie,nt=(Ue.start+Ue.count)*Ie;ne!==null&&(qe=Math.max(qe,ne.start*Ie),nt=Math.min(nt,(ne.start+ne.count)*Ie)),pe!==null?(qe=Math.max(qe,0),nt=Math.min(nt,pe.count)):Ce!=null&&(qe=Math.max(qe,0),nt=Math.min(nt,Ce.count));const gt=nt-qe;if(gt<0||gt===1/0)return;ce.setup(B,W,_e,G,pe);let dt,ot=fe;if(pe!==null&&(dt=T.get(pe),ot=Le,ot.setIndex(dt)),B.isMesh)W.wireframe===!0?(Me.setLineWidth(W.wireframeLinewidth*Mt()),ot.setMode(C.LINES)):ot.setMode(C.TRIANGLES);else if(B.isLine){let Pe=W.linewidth;Pe===void 0&&(Pe=1),Me.setLineWidth(Pe*Mt()),B.isLineSegments?ot.setMode(C.LINES):B.isLineLoop?ot.setMode(C.LINE_LOOP):ot.setMode(C.LINE_STRIP)}else B.isPoints?ot.setMode(C.POINTS):B.isSprite&&ot.setMode(C.TRIANGLES);if(B.isBatchedMesh)if(B._multiDrawInstances!==null)Fs("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),ot.renderMultiDrawInstances(B._multiDrawStarts,B._multiDrawCounts,B._multiDrawCount,B._multiDrawInstances);else if(ke.get("WEBGL_multi_draw"))ot.renderMultiDraw(B._multiDrawStarts,B._multiDrawCounts,B._multiDrawCount);else{const Pe=B._multiDrawStarts,pt=B._multiDrawCounts,Ke=B._multiDrawCount,Yt=pe?T.get(pe).bytesPerElement:1,Ai=ye.get(W).currentProgram.getUniforms();for(let $t=0;$t<Ke;$t++)Ai.setValue(C,"_gl_DrawID",$t),ot.render(Pe[$t]/Yt,pt[$t])}else if(B.isInstancedMesh)ot.renderInstances(qe,gt,B.count);else if(G.isInstancedBufferGeometry){const Pe=G._maxInstanceCount!==void 0?G._maxInstanceCount:1/0,pt=Math.min(G.instanceCount,Pe);ot.renderInstances(qe,gt,pt)}else ot.render(qe,gt)};function lt(y,F,G){y.transparent===!0&&y.side===Jt&&y.forceSinglePass===!1?(y.side=qt,y.needsUpdate=!0,qs(y,F,G),y.side=ri,y.needsUpdate=!0,qs(y,F,G),y.side=Jt):qs(y,F,G)}this.compile=function(y,F,G=null){G===null&&(G=y),h=Te.get(G),h.init(F),b.push(h),G.traverseVisible(function(B){B.isLight&&B.layers.test(F.layers)&&(h.pushLight(B),B.castShadow&&h.pushShadow(B))}),y!==G&&y.traverseVisible(function(B){B.isLight&&B.layers.test(F.layers)&&(h.pushLight(B),B.castShadow&&h.pushShadow(B))}),h.setupLights();const W=new Set;return y.traverse(function(B){if(!(B.isMesh||B.isPoints||B.isLine||B.isSprite))return;const ne=B.material;if(ne)if(Array.isArray(ne))for(let he=0;he<ne.length;he++){const _e=ne[he];lt(_e,G,B),W.add(_e)}else lt(ne,G,B),W.add(ne)}),h=b.pop(),W},this.compileAsync=function(y,F,G=null){const W=this.compile(y,F,G);return new Promise(B=>{function ne(){if(W.forEach(function(he){ye.get(he).currentProgram.isReady()&&W.delete(he)}),W.size===0){B(y);return}setTimeout(ne,10)}ke.get("KHR_parallel_shader_compile")!==null?ne():setTimeout(ne,10)})};let Je=null;function Un(y){Je&&Je(y)}function bn(){oi.stop()}function ul(){oi.start()}const oi=new fd;oi.setAnimationLoop(Un),typeof self<"u"&&oi.setContext(self),this.setAnimationLoop=function(y){Je=y,se.setAnimationLoop(y),y===null?oi.stop():oi.start()},se.addEventListener("sessionstart",bn),se.addEventListener("sessionend",ul),this.render=function(y,F){if(F!==void 0&&F.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(R===!0)return;if(y.matrixWorldAutoUpdate===!0&&y.updateMatrixWorld(),F.parent===null&&F.matrixWorldAutoUpdate===!0&&F.updateMatrixWorld(),se.enabled===!0&&se.isPresenting===!0&&(se.cameraAutoUpdate===!0&&se.updateCamera(F),F=se.getCamera()),y.isScene===!0&&y.onBeforeRender(S,y,F,I),h=Te.get(y,b.length),h.init(F),b.push(h),$.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),je.setFromProjectionMatrix($,Rn,F.reversedDepth),H=this.localClippingEnabled,Q=ae.init(this.clippingPlanes,H),m=Y.get(y,E.length),m.init(),E.push(m),se.enabled===!0&&se.isPresenting===!0){const ne=S.xr.getDepthSensingMesh();ne!==null&&Zr(ne,F,-1/0,S.sortObjects)}Zr(y,F,0,S.sortObjects),m.finish(),S.sortObjects===!0&&m.sort(J,ee),Be=se.enabled===!1||se.isPresenting===!1||se.hasDepthSensing()===!1,Be&&Ee.addToRenderList(m,y),this.info.render.frame++,Q===!0&&ae.beginShadows();const G=h.state.shadowsArray;Se.render(G,y,F),Q===!0&&ae.endShadows(),this.info.autoReset===!0&&this.info.reset();const W=m.opaque,B=m.transmissive;if(h.setupLights(),F.isArrayCamera){const ne=F.cameras;if(B.length>0)for(let he=0,_e=ne.length;he<_e;he++){const pe=ne[he];fl(W,B,y,pe)}Be&&Ee.render(y);for(let he=0,_e=ne.length;he<_e;he++){const pe=ne[he];hl(m,y,pe,pe.viewport)}}else B.length>0&&fl(W,B,y,F),Be&&Ee.render(y),hl(m,y,F);I!==null&&P===0&&(Ve.updateMultisampleRenderTarget(I),Ve.updateRenderTargetMipmap(I)),y.isScene===!0&&y.onAfterRender(S,y,F),ce.resetDefaultState(),_=-1,v=null,b.pop(),b.length>0?(h=b[b.length-1],Q===!0&&ae.setGlobalState(S.clippingPlanes,h.state.camera)):h=null,E.pop(),E.length>0?m=E[E.length-1]:m=null};function Zr(y,F,G,W){if(y.visible===!1)return;if(y.layers.test(F.layers)){if(y.isGroup)G=y.renderOrder;else if(y.isLOD)y.autoUpdate===!0&&y.update(F);else if(y.isLight)h.pushLight(y),y.castShadow&&h.pushShadow(y);else if(y.isSprite){if(!y.frustumCulled||je.intersectsSprite(y)){W&&Ae.setFromMatrixPosition(y.matrixWorld).applyMatrix4($);const he=z.update(y),_e=y.material;_e.visible&&m.push(y,he,_e,G,Ae.z,null)}}else if((y.isMesh||y.isLine||y.isPoints)&&(!y.frustumCulled||je.intersectsObject(y))){const he=z.update(y),_e=y.material;if(W&&(y.boundingSphere!==void 0?(y.boundingSphere===null&&y.computeBoundingSphere(),Ae.copy(y.boundingSphere.center)):(he.boundingSphere===null&&he.computeBoundingSphere(),Ae.copy(he.boundingSphere.center)),Ae.applyMatrix4(y.matrixWorld).applyMatrix4($)),Array.isArray(_e)){const pe=he.groups;for(let Ie=0,Ue=pe.length;Ie<Ue;Ie++){const Ce=pe[Ie],qe=_e[Ce.materialIndex];qe&&qe.visible&&m.push(y,he,qe,G,Ae.z,Ce)}}else _e.visible&&m.push(y,he,_e,G,Ae.z,null)}}const ne=y.children;for(let he=0,_e=ne.length;he<_e;he++)Zr(ne[he],F,G,W)}function hl(y,F,G,W){const B=y.opaque,ne=y.transmissive,he=y.transparent;h.setupLightsView(G),Q===!0&&ae.setGlobalState(S.clippingPlanes,G),W&&Me.viewport(A.copy(W)),B.length>0&&Xs(B,F,G),ne.length>0&&Xs(ne,F,G),he.length>0&&Xs(he,F,G),Me.buffers.depth.setTest(!0),Me.buffers.depth.setMask(!0),Me.buffers.color.setMask(!0),Me.setPolygonOffset(!1)}function fl(y,F,G,W){if((G.isScene===!0?G.overrideMaterial:null)!==null)return;h.state.transmissionRenderTarget[W.id]===void 0&&(h.state.transmissionRenderTarget[W.id]=new Sn(1,1,{generateMipmaps:!0,type:ke.has("EXT_color_buffer_half_float")||ke.has("EXT_color_buffer_float")?Wn:Ln,minFilter:Si,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ze.workingColorSpace}));const ne=h.state.transmissionRenderTarget[W.id],he=W.viewport||A;ne.setSize(he.z*S.transmissionResolutionScale,he.w*S.transmissionResolutionScale);const _e=S.getRenderTarget(),pe=S.getActiveCubeFace(),Ie=S.getActiveMipmapLevel();S.setRenderTarget(ne),S.getClearColor(O),k=S.getClearAlpha(),k<1&&S.setClearColor(16777215,.5),S.clear(),Be&&Ee.render(G);const Ue=S.toneMapping;S.toneMapping=si;const Ce=W.viewport;if(W.viewport!==void 0&&(W.viewport=void 0),h.setupLightsView(W),Q===!0&&ae.setGlobalState(S.clippingPlanes,W),Xs(y,G,W),Ve.updateMultisampleRenderTarget(ne),Ve.updateRenderTargetMipmap(ne),ke.has("WEBGL_multisampled_render_to_texture")===!1){let qe=!1;for(let nt=0,gt=F.length;nt<gt;nt++){const dt=F[nt],ot=dt.object,Pe=dt.geometry,pt=dt.material,Ke=dt.group;if(pt.side===Jt&&ot.layers.test(W.layers)){const Yt=pt.side;pt.side=qt,pt.needsUpdate=!0,pl(ot,G,W,Pe,pt,Ke),pt.side=Yt,pt.needsUpdate=!0,qe=!0}}qe===!0&&(Ve.updateMultisampleRenderTarget(ne),Ve.updateRenderTargetMipmap(ne))}S.setRenderTarget(_e,pe,Ie),S.setClearColor(O,k),Ce!==void 0&&(W.viewport=Ce),S.toneMapping=Ue}function Xs(y,F,G){const W=F.isScene===!0?F.overrideMaterial:null;for(let B=0,ne=y.length;B<ne;B++){const he=y[B],_e=he.object,pe=he.geometry,Ie=he.group;let Ue=he.material;Ue.allowOverride===!0&&W!==null&&(Ue=W),_e.layers.test(G.layers)&&pl(_e,F,G,pe,Ue,Ie)}}function pl(y,F,G,W,B,ne){y.onBeforeRender(S,F,G,W,B,ne),y.modelViewMatrix.multiplyMatrices(G.matrixWorldInverse,y.matrixWorld),y.normalMatrix.getNormalMatrix(y.modelViewMatrix),B.onBeforeRender(S,F,G,W,y,ne),B.transparent===!0&&B.side===Jt&&B.forceSinglePass===!1?(B.side=qt,B.needsUpdate=!0,S.renderBufferDirect(G,F,W,B,y,ne),B.side=ri,B.needsUpdate=!0,S.renderBufferDirect(G,F,W,B,y,ne),B.side=Jt):S.renderBufferDirect(G,F,W,B,y,ne),y.onAfterRender(S,F,G,W,B,ne)}function qs(y,F,G){F.isScene!==!0&&(F=xe);const W=ye.get(y),B=h.state.lights,ne=h.state.shadowsArray,he=B.state.version,_e=K.getParameters(y,B.state,ne,F,G),pe=K.getProgramCacheKey(_e);let Ie=W.programs;W.environment=y.isMeshStandardMaterial?F.environment:null,W.fog=F.fog,W.envMap=(y.isMeshStandardMaterial?xt:It).get(y.envMap||W.environment),W.envMapRotation=W.environment!==null&&y.envMap===null?F.environmentRotation:y.envMapRotation,Ie===void 0&&(y.addEventListener("dispose",Z),Ie=new Map,W.programs=Ie);let Ue=Ie.get(pe);if(Ue!==void 0){if(W.currentProgram===Ue&&W.lightsStateVersion===he)return gl(y,_e),Ue}else _e.uniforms=K.getUniforms(y),y.onBeforeCompile(_e,S),Ue=K.acquireProgram(_e,pe),Ie.set(pe,Ue),W.uniforms=_e.uniforms;const Ce=W.uniforms;return(!y.isShaderMaterial&&!y.isRawShaderMaterial||y.clipping===!0)&&(Ce.clippingPlanes=ae.uniform),gl(y,_e),W.needsLights=Fd(y),W.lightsStateVersion=he,W.needsLights&&(Ce.ambientLightColor.value=B.state.ambient,Ce.lightProbe.value=B.state.probe,Ce.directionalLights.value=B.state.directional,Ce.directionalLightShadows.value=B.state.directionalShadow,Ce.spotLights.value=B.state.spot,Ce.spotLightShadows.value=B.state.spotShadow,Ce.rectAreaLights.value=B.state.rectArea,Ce.ltc_1.value=B.state.rectAreaLTC1,Ce.ltc_2.value=B.state.rectAreaLTC2,Ce.pointLights.value=B.state.point,Ce.pointLightShadows.value=B.state.pointShadow,Ce.hemisphereLights.value=B.state.hemi,Ce.directionalShadowMap.value=B.state.directionalShadowMap,Ce.directionalShadowMatrix.value=B.state.directionalShadowMatrix,Ce.spotShadowMap.value=B.state.spotShadowMap,Ce.spotLightMatrix.value=B.state.spotLightMatrix,Ce.spotLightMap.value=B.state.spotLightMap,Ce.pointShadowMap.value=B.state.pointShadowMap,Ce.pointShadowMatrix.value=B.state.pointShadowMatrix),W.currentProgram=Ue,W.uniformsList=null,Ue}function ml(y){if(y.uniformsList===null){const F=y.currentProgram.getUniforms();y.uniformsList=Pr.seqWithValue(F.seq,y.uniforms)}return y.uniformsList}function gl(y,F){const G=ye.get(y);G.outputColorSpace=F.outputColorSpace,G.batching=F.batching,G.batchingColor=F.batchingColor,G.instancing=F.instancing,G.instancingColor=F.instancingColor,G.instancingMorph=F.instancingMorph,G.skinning=F.skinning,G.morphTargets=F.morphTargets,G.morphNormals=F.morphNormals,G.morphColors=F.morphColors,G.morphTargetsCount=F.morphTargetsCount,G.numClippingPlanes=F.numClippingPlanes,G.numIntersection=F.numClipIntersection,G.vertexAlphas=F.vertexAlphas,G.vertexTangents=F.vertexTangents,G.toneMapping=F.toneMapping}function Ud(y,F,G,W,B){F.isScene!==!0&&(F=xe),Ve.resetTextureUnits();const ne=F.fog,he=W.isMeshStandardMaterial?F.environment:null,_e=I===null?S.outputColorSpace:I.isXRRenderTarget===!0?I.texture.colorSpace:ss,pe=(W.isMeshStandardMaterial?xt:It).get(W.envMap||he),Ie=W.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,Ue=!!G.attributes.tangent&&(!!W.normalMap||W.anisotropy>0),Ce=!!G.morphAttributes.position,qe=!!G.morphAttributes.normal,nt=!!G.morphAttributes.color;let gt=si;W.toneMapped&&(I===null||I.isXRRenderTarget===!0)&&(gt=S.toneMapping);const dt=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,ot=dt!==void 0?dt.length:0,Pe=ye.get(W),pt=h.state.lights;if(Q===!0&&(H===!0||y!==v)){const kt=y===v&&W.id===_;ae.setState(W,y,kt)}let Ke=!1;W.version===Pe.__version?(Pe.needsLights&&Pe.lightsStateVersion!==pt.state.version||Pe.outputColorSpace!==_e||B.isBatchedMesh&&Pe.batching===!1||!B.isBatchedMesh&&Pe.batching===!0||B.isBatchedMesh&&Pe.batchingColor===!0&&B.colorTexture===null||B.isBatchedMesh&&Pe.batchingColor===!1&&B.colorTexture!==null||B.isInstancedMesh&&Pe.instancing===!1||!B.isInstancedMesh&&Pe.instancing===!0||B.isSkinnedMesh&&Pe.skinning===!1||!B.isSkinnedMesh&&Pe.skinning===!0||B.isInstancedMesh&&Pe.instancingColor===!0&&B.instanceColor===null||B.isInstancedMesh&&Pe.instancingColor===!1&&B.instanceColor!==null||B.isInstancedMesh&&Pe.instancingMorph===!0&&B.morphTexture===null||B.isInstancedMesh&&Pe.instancingMorph===!1&&B.morphTexture!==null||Pe.envMap!==pe||W.fog===!0&&Pe.fog!==ne||Pe.numClippingPlanes!==void 0&&(Pe.numClippingPlanes!==ae.numPlanes||Pe.numIntersection!==ae.numIntersection)||Pe.vertexAlphas!==Ie||Pe.vertexTangents!==Ue||Pe.morphTargets!==Ce||Pe.morphNormals!==qe||Pe.morphColors!==nt||Pe.toneMapping!==gt||Pe.morphTargetsCount!==ot)&&(Ke=!0):(Ke=!0,Pe.__version=W.version);let Yt=Pe.currentProgram;Ke===!0&&(Yt=qs(W,F,B));let Ai=!1,$t=!1,us=!1;const mt=Yt.getUniforms(),nn=Pe.uniforms;if(Me.useProgram(Yt.program)&&(Ai=!0,$t=!0,us=!0),W.id!==_&&(_=W.id,$t=!0),Ai||v!==y){Me.buffers.depth.getReversed()&&y.reversedDepth!==!0&&(y._reversedDepth=!0,y.updateProjectionMatrix()),mt.setValue(C,"projectionMatrix",y.projectionMatrix),mt.setValue(C,"viewMatrix",y.matrixWorldInverse);const Gt=mt.map.cameraPosition;Gt!==void 0&&Gt.setValue(C,ue.setFromMatrixPosition(y.matrixWorld)),De.logarithmicDepthBuffer&&mt.setValue(C,"logDepthBufFC",2/(Math.log(y.far+1)/Math.LN2)),(W.isMeshPhongMaterial||W.isMeshToonMaterial||W.isMeshLambertMaterial||W.isMeshBasicMaterial||W.isMeshStandardMaterial||W.isShaderMaterial)&&mt.setValue(C,"isOrthographic",y.isOrthographicCamera===!0),v!==y&&(v=y,$t=!0,us=!0)}if(B.isSkinnedMesh){mt.setOptional(C,B,"bindMatrix"),mt.setOptional(C,B,"bindMatrixInverse");const kt=B.skeleton;kt&&(kt.boneTexture===null&&kt.computeBoneTexture(),mt.setValue(C,"boneTexture",kt.boneTexture,Ve))}B.isBatchedMesh&&(mt.setOptional(C,B,"batchingTexture"),mt.setValue(C,"batchingTexture",B._matricesTexture,Ve),mt.setOptional(C,B,"batchingIdTexture"),mt.setValue(C,"batchingIdTexture",B._indirectTexture,Ve),mt.setOptional(C,B,"batchingColorTexture"),B._colorsTexture!==null&&mt.setValue(C,"batchingColorTexture",B._colorsTexture,Ve));const sn=G.morphAttributes;if((sn.position!==void 0||sn.normal!==void 0||sn.color!==void 0)&&ie.update(B,G,Yt),($t||Pe.receiveShadow!==B.receiveShadow)&&(Pe.receiveShadow=B.receiveShadow,mt.setValue(C,"receiveShadow",B.receiveShadow)),W.isMeshGouraudMaterial&&W.envMap!==null&&(nn.envMap.value=pe,nn.flipEnvMap.value=pe.isCubeTexture&&pe.isRenderTargetTexture===!1?-1:1),W.isMeshStandardMaterial&&W.envMap===null&&F.environment!==null&&(nn.envMapIntensity.value=F.environmentIntensity),$t&&(mt.setValue(C,"toneMappingExposure",S.toneMappingExposure),Pe.needsLights&&Nd(nn,us),ne&&W.fog===!0&&j.refreshFogUniforms(nn,ne),j.refreshMaterialUniforms(nn,W,V,q,h.state.transmissionRenderTarget[y.id]),Pr.upload(C,ml(Pe),nn,Ve)),W.isShaderMaterial&&W.uniformsNeedUpdate===!0&&(Pr.upload(C,ml(Pe),nn,Ve),W.uniformsNeedUpdate=!1),W.isSpriteMaterial&&mt.setValue(C,"center",B.center),mt.setValue(C,"modelViewMatrix",B.modelViewMatrix),mt.setValue(C,"normalMatrix",B.normalMatrix),mt.setValue(C,"modelMatrix",B.matrixWorld),W.isShaderMaterial||W.isRawShaderMaterial){const kt=W.uniformsGroups;for(let Gt=0,jr=kt.length;Gt<jr;Gt++){const li=kt[Gt];He.update(li,Yt),He.bind(li,Yt)}}return Yt}function Nd(y,F){y.ambientLightColor.needsUpdate=F,y.lightProbe.needsUpdate=F,y.directionalLights.needsUpdate=F,y.directionalLightShadows.needsUpdate=F,y.pointLights.needsUpdate=F,y.pointLightShadows.needsUpdate=F,y.spotLights.needsUpdate=F,y.spotLightShadows.needsUpdate=F,y.rectAreaLights.needsUpdate=F,y.hemisphereLights.needsUpdate=F}function Fd(y){return y.isMeshLambertMaterial||y.isMeshToonMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isShadowMaterial||y.isShaderMaterial&&y.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return P},this.getRenderTarget=function(){return I},this.setRenderTargetTextures=function(y,F,G){const W=ye.get(y);W.__autoAllocateDepthBuffer=y.resolveDepthBuffer===!1,W.__autoAllocateDepthBuffer===!1&&(W.__useRenderToTexture=!1),ye.get(y.texture).__webglTexture=F,ye.get(y.depthTexture).__webglTexture=W.__autoAllocateDepthBuffer?void 0:G,W.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(y,F){const G=ye.get(y);G.__webglFramebuffer=F,G.__useDefaultFramebuffer=F===void 0};const Od=C.createFramebuffer();this.setRenderTarget=function(y,F=0,G=0){I=y,w=F,P=G;let W=!0,B=null,ne=!1,he=!1;if(y){const pe=ye.get(y);if(pe.__useDefaultFramebuffer!==void 0)Me.bindFramebuffer(C.FRAMEBUFFER,null),W=!1;else if(pe.__webglFramebuffer===void 0)Ve.setupRenderTarget(y);else if(pe.__hasExternalTextures)Ve.rebindTextures(y,ye.get(y.texture).__webglTexture,ye.get(y.depthTexture).__webglTexture);else if(y.depthBuffer){const Ce=y.depthTexture;if(pe.__boundDepthTexture!==Ce){if(Ce!==null&&ye.has(Ce)&&(y.width!==Ce.image.width||y.height!==Ce.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Ve.setupDepthRenderbuffer(y)}}const Ie=y.texture;(Ie.isData3DTexture||Ie.isDataArrayTexture||Ie.isCompressedArrayTexture)&&(he=!0);const Ue=ye.get(y).__webglFramebuffer;y.isWebGLCubeRenderTarget?(Array.isArray(Ue[F])?B=Ue[F][G]:B=Ue[F],ne=!0):y.samples>0&&Ve.useMultisampledRTT(y)===!1?B=ye.get(y).__webglMultisampledFramebuffer:Array.isArray(Ue)?B=Ue[G]:B=Ue,A.copy(y.viewport),N.copy(y.scissor),X=y.scissorTest}else A.copy(de).multiplyScalar(V).floor(),N.copy(Re).multiplyScalar(V).floor(),X=$e;if(G!==0&&(B=Od),Me.bindFramebuffer(C.FRAMEBUFFER,B)&&W&&Me.drawBuffers(y,B),Me.viewport(A),Me.scissor(N),Me.setScissorTest(X),ne){const pe=ye.get(y.texture);C.framebufferTexture2D(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_CUBE_MAP_POSITIVE_X+F,pe.__webglTexture,G)}else if(he){const pe=F;for(let Ie=0;Ie<y.textures.length;Ie++){const Ue=ye.get(y.textures[Ie]);C.framebufferTextureLayer(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0+Ie,Ue.__webglTexture,G,pe)}}else if(y!==null&&G!==0){const pe=ye.get(y.texture);C.framebufferTexture2D(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,pe.__webglTexture,G)}_=-1},this.readRenderTargetPixels=function(y,F,G,W,B,ne,he,_e=0){if(!(y&&y.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let pe=ye.get(y).__webglFramebuffer;if(y.isWebGLCubeRenderTarget&&he!==void 0&&(pe=pe[he]),pe){Me.bindFramebuffer(C.FRAMEBUFFER,pe);try{const Ie=y.textures[_e],Ue=Ie.format,Ce=Ie.type;if(!De.textureFormatReadable(Ue)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!De.textureTypeReadable(Ce)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}F>=0&&F<=y.width-W&&G>=0&&G<=y.height-B&&(y.textures.length>1&&C.readBuffer(C.COLOR_ATTACHMENT0+_e),C.readPixels(F,G,W,B,be.convert(Ue),be.convert(Ce),ne))}finally{const Ie=I!==null?ye.get(I).__webglFramebuffer:null;Me.bindFramebuffer(C.FRAMEBUFFER,Ie)}}},this.readRenderTargetPixelsAsync=async function(y,F,G,W,B,ne,he,_e=0){if(!(y&&y.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let pe=ye.get(y).__webglFramebuffer;if(y.isWebGLCubeRenderTarget&&he!==void 0&&(pe=pe[he]),pe)if(F>=0&&F<=y.width-W&&G>=0&&G<=y.height-B){Me.bindFramebuffer(C.FRAMEBUFFER,pe);const Ie=y.textures[_e],Ue=Ie.format,Ce=Ie.type;if(!De.textureFormatReadable(Ue))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!De.textureTypeReadable(Ce))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const qe=C.createBuffer();C.bindBuffer(C.PIXEL_PACK_BUFFER,qe),C.bufferData(C.PIXEL_PACK_BUFFER,ne.byteLength,C.STREAM_READ),y.textures.length>1&&C.readBuffer(C.COLOR_ATTACHMENT0+_e),C.readPixels(F,G,W,B,be.convert(Ue),be.convert(Ce),0);const nt=I!==null?ye.get(I).__webglFramebuffer:null;Me.bindFramebuffer(C.FRAMEBUFFER,nt);const gt=C.fenceSync(C.SYNC_GPU_COMMANDS_COMPLETE,0);return C.flush(),await Gu(C,gt,4),C.bindBuffer(C.PIXEL_PACK_BUFFER,qe),C.getBufferSubData(C.PIXEL_PACK_BUFFER,0,ne),C.deleteBuffer(qe),C.deleteSync(gt),ne}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(y,F=null,G=0){const W=Math.pow(2,-G),B=Math.floor(y.image.width*W),ne=Math.floor(y.image.height*W),he=F!==null?F.x:0,_e=F!==null?F.y:0;Ve.setTexture2D(y,0),C.copyTexSubImage2D(C.TEXTURE_2D,G,0,0,he,_e,B,ne),Me.unbindTexture()};const Bd=C.createFramebuffer(),kd=C.createFramebuffer();this.copyTextureToTexture=function(y,F,G=null,W=null,B=0,ne=null){ne===null&&(B!==0?(Fs("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ne=B,B=0):ne=0);let he,_e,pe,Ie,Ue,Ce,qe,nt,gt;const dt=y.isCompressedTexture?y.mipmaps[ne]:y.image;if(G!==null)he=G.max.x-G.min.x,_e=G.max.y-G.min.y,pe=G.isBox3?G.max.z-G.min.z:1,Ie=G.min.x,Ue=G.min.y,Ce=G.isBox3?G.min.z:0;else{const sn=Math.pow(2,-B);he=Math.floor(dt.width*sn),_e=Math.floor(dt.height*sn),y.isDataArrayTexture?pe=dt.depth:y.isData3DTexture?pe=Math.floor(dt.depth*sn):pe=1,Ie=0,Ue=0,Ce=0}W!==null?(qe=W.x,nt=W.y,gt=W.z):(qe=0,nt=0,gt=0);const ot=be.convert(F.format),Pe=be.convert(F.type);let pt;F.isData3DTexture?(Ve.setTexture3D(F,0),pt=C.TEXTURE_3D):F.isDataArrayTexture||F.isCompressedArrayTexture?(Ve.setTexture2DArray(F,0),pt=C.TEXTURE_2D_ARRAY):(Ve.setTexture2D(F,0),pt=C.TEXTURE_2D),C.pixelStorei(C.UNPACK_FLIP_Y_WEBGL,F.flipY),C.pixelStorei(C.UNPACK_PREMULTIPLY_ALPHA_WEBGL,F.premultiplyAlpha),C.pixelStorei(C.UNPACK_ALIGNMENT,F.unpackAlignment);const Ke=C.getParameter(C.UNPACK_ROW_LENGTH),Yt=C.getParameter(C.UNPACK_IMAGE_HEIGHT),Ai=C.getParameter(C.UNPACK_SKIP_PIXELS),$t=C.getParameter(C.UNPACK_SKIP_ROWS),us=C.getParameter(C.UNPACK_SKIP_IMAGES);C.pixelStorei(C.UNPACK_ROW_LENGTH,dt.width),C.pixelStorei(C.UNPACK_IMAGE_HEIGHT,dt.height),C.pixelStorei(C.UNPACK_SKIP_PIXELS,Ie),C.pixelStorei(C.UNPACK_SKIP_ROWS,Ue),C.pixelStorei(C.UNPACK_SKIP_IMAGES,Ce);const mt=y.isDataArrayTexture||y.isData3DTexture,nn=F.isDataArrayTexture||F.isData3DTexture;if(y.isDepthTexture){const sn=ye.get(y),kt=ye.get(F),Gt=ye.get(sn.__renderTarget),jr=ye.get(kt.__renderTarget);Me.bindFramebuffer(C.READ_FRAMEBUFFER,Gt.__webglFramebuffer),Me.bindFramebuffer(C.DRAW_FRAMEBUFFER,jr.__webglFramebuffer);for(let li=0;li<pe;li++)mt&&(C.framebufferTextureLayer(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,ye.get(y).__webglTexture,B,Ce+li),C.framebufferTextureLayer(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,ye.get(F).__webglTexture,ne,gt+li)),C.blitFramebuffer(Ie,Ue,he,_e,qe,nt,he,_e,C.DEPTH_BUFFER_BIT,C.NEAREST);Me.bindFramebuffer(C.READ_FRAMEBUFFER,null),Me.bindFramebuffer(C.DRAW_FRAMEBUFFER,null)}else if(B!==0||y.isRenderTargetTexture||ye.has(y)){const sn=ye.get(y),kt=ye.get(F);Me.bindFramebuffer(C.READ_FRAMEBUFFER,Bd),Me.bindFramebuffer(C.DRAW_FRAMEBUFFER,kd);for(let Gt=0;Gt<pe;Gt++)mt?C.framebufferTextureLayer(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,sn.__webglTexture,B,Ce+Gt):C.framebufferTexture2D(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,sn.__webglTexture,B),nn?C.framebufferTextureLayer(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,kt.__webglTexture,ne,gt+Gt):C.framebufferTexture2D(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,kt.__webglTexture,ne),B!==0?C.blitFramebuffer(Ie,Ue,he,_e,qe,nt,he,_e,C.COLOR_BUFFER_BIT,C.NEAREST):nn?C.copyTexSubImage3D(pt,ne,qe,nt,gt+Gt,Ie,Ue,he,_e):C.copyTexSubImage2D(pt,ne,qe,nt,Ie,Ue,he,_e);Me.bindFramebuffer(C.READ_FRAMEBUFFER,null),Me.bindFramebuffer(C.DRAW_FRAMEBUFFER,null)}else nn?y.isDataTexture||y.isData3DTexture?C.texSubImage3D(pt,ne,qe,nt,gt,he,_e,pe,ot,Pe,dt.data):F.isCompressedArrayTexture?C.compressedTexSubImage3D(pt,ne,qe,nt,gt,he,_e,pe,ot,dt.data):C.texSubImage3D(pt,ne,qe,nt,gt,he,_e,pe,ot,Pe,dt):y.isDataTexture?C.texSubImage2D(C.TEXTURE_2D,ne,qe,nt,he,_e,ot,Pe,dt.data):y.isCompressedTexture?C.compressedTexSubImage2D(C.TEXTURE_2D,ne,qe,nt,dt.width,dt.height,ot,dt.data):C.texSubImage2D(C.TEXTURE_2D,ne,qe,nt,he,_e,ot,Pe,dt);C.pixelStorei(C.UNPACK_ROW_LENGTH,Ke),C.pixelStorei(C.UNPACK_IMAGE_HEIGHT,Yt),C.pixelStorei(C.UNPACK_SKIP_PIXELS,Ai),C.pixelStorei(C.UNPACK_SKIP_ROWS,$t),C.pixelStorei(C.UNPACK_SKIP_IMAGES,us),ne===0&&F.generateMipmaps&&C.generateMipmap(pt),Me.unbindTexture()},this.initRenderTarget=function(y){ye.get(y).__webglFramebuffer===void 0&&Ve.setupRenderTarget(y)},this.initTexture=function(y){y.isCubeTexture?Ve.setTextureCube(y,0):y.isData3DTexture?Ve.setTexture3D(y,0):y.isDataArrayTexture||y.isCompressedArrayTexture?Ve.setTexture2DArray(y,0):Ve.setTexture2D(y,0),Me.unbindTexture()},this.resetState=function(){w=0,P=0,I=null,Me.reset(),ce.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Rn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Ze._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ze._getUnpackColorSpace()}}const Ir={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class Vs{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const g0=new Wr(-1,1,1,-1,0,1);class _0 extends Bt{constructor(){super(),this.setAttribute("position",new ft([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ft([0,2,0,0,2,0],2))}}const v0=new _0;class vd{constructor(e){this._mesh=new re(v0,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,g0)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class x0 extends Vs{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Wt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Br.clone(e.uniforms),this.material=new Wt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new vd(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class Ec extends Vs{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){const s=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,a,4294967295),r.buffers.stencil.setClear(o),r.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}}class M0 extends Vs{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class y0{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const n=e.getSize(new we);this._width=n.width,this._height=n.height,t=new Sn(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Wn}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new x0(Ir),this.copyPass.material.blending=Gn,this.clock=new Ph}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let n=!1;for(let s=0,r=this.passes.length;s<r;s++){const a=this.passes[s];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),a.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),a.needsSwap){if(n){const o=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(o.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(o.EQUAL,1,4294967295)}this.swapBuffers()}Ec!==void 0&&(a instanceof Ec?n=!0:a instanceof M0&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new we);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class S0 extends Vs{constructor(e,t,n=null,s=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Fe}render(e,t,n){const s=e.autoClear;e.autoClear=!1;let r,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=s}}const E0={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Fe(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class as extends Vs{constructor(e,t=1,n,s){super(),this.strength=t,this.radius=n,this.threshold=s,this.resolution=e!==void 0?new we(e.x,e.y):new we(256,256),this.clearColor=new Fe(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new Sn(r,a,{type:Wn}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let d=0;d<this.nMips;d++){const u=new Sn(r,a,{type:Wn});u.texture.name="UnrealBloomPass.h"+d,u.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(u);const f=new Sn(r,a,{type:Wn});f.texture.name="UnrealBloomPass.v"+d,f.texture.generateMipmaps=!1,this.renderTargetsVertical.push(f),r=Math.round(r/2),a=Math.round(a/2)}const o=E0;this.highPassUniforms=Br.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Wt({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let d=0;d<this.nMips;d++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[d])),this.separableBlurMaterials[d].uniforms.invSize.value=new we(1/r,1/a),r=Math.round(r/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Br.clone(Ir.uniforms),this.blendMaterial=new Wt({uniforms:this.copyUniforms,vertexShader:Ir.vertexShader,fragmentShader:Ir.fragmentShader,blending:Ga,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Fe,this._oldClearAlpha=1,this._basic=new cs,this._fsQuad=new vd(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),s=Math.round(t/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new we(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(e,t,n,s,r){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();const a=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let o=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=o.texture,this.separableBlurMaterials[l].uniforms.direction.value=as.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=as.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this._fsQuad.render(e),o=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=a}_getSeparableBlurMaterial(e){const t=[];for(let n=0;n<e;n++)t.push(.39894*Math.exp(-.5*n*n/(e*e))/e);return new Wt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new we(.5,.5)},direction:{value:new we(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
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
				}`})}_getCompositeMaterial(e){return new Wt({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
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
				}`})}}as.BlurDirectionX=new we(1,0);as.BlurDirectionY=new we(0,1);const Ne={HELLO:"hello",SET_NICKNAME:"set_nickname",JOIN_ROOM:"join_room",MOVEMENT:"movement",GARDEN_ACTION:"garden_action",MARKET_BUY:"market_buy",MARKET_SELL:"market_sell",ORDER_PLACE:"order_place",ORDER_CANCEL:"order_cancel",CONTRACT_COMPLETE:"contract_complete",NODE_HARVEST:"node_harvest",MACHINE_CONTRIBUTE:"machine_contribute",MACHINE_MILL:"machine_mill",MACHINE_CRAFT:"machine_craft",THEATER_QUEUE:"theater_queue",THEATER_CONTROL:"theater_control",THEATER_CHANNEL:"theater_channel",EMOTE:"emote",CHAT_SEND:"chat_send",WELCOME:"welcome",PRESENCE_JOIN:"presence_join",PRESENCE_LEAVE:"presence_leave",PRESENCE_UPDATE:"presence_update",GARDEN_STATE:"garden_state",INVENTORY_STATE:"inventory_state",MARKET_UPDATE:"market_update",CONTRACT_UPDATE:"contract_update",NODE_STATE:"node_state",MACHINE_UPDATE:"machine_update",THEATER_STATE:"theater_state",WEATHER_UPDATE:"weather_update",ACTION_RESULT:"action_result",TRADE_FILLED:"trade_filled",EMOTE_BROADCAST:"emote_broadcast",CHAT_HISTORY:"chat_history",CHAT_MESSAGE:"chat_message",CHAT_DM:"chat_dm",CHAT_PRESENCE:"chat_presence",CHAT_ERROR:"chat_error"},Xt={MARKET:"market",THEATER:"theater",gardenFor:i=>`garden:${i}`,isGarden:i=>i?.startsWith("garden:"),gardenOwner:i=>i?.startsWith("garden:")?i.slice(7):null};function b0(i){return JSON.stringify(i)}function T0(i){try{return JSON.parse(i)}catch{return null}}const bc=["Mossy","Quiet","Copper","Rainy","Amber","Misty","Rust","Golden","Silver","Fern","Bramble","Cobble","Thistle","Breezy","Dusky","Dappled","Dewy","Hedge","Orchard","Verdant","Gilded","Pebble","Autumnal","Gleaming"],Tc=["Radish","Turnip","Basil","Leek","Carrot","Kale","Tomato","Berry","Sorrel","Chive","Sprout","Fennel","Parsnip","Pepper","Clover","Borage","Sage","Mint","Beet","Chard"];function Hr(i=Math.random()){const e=Math.floor(Math.abs(Math.sin(i*999))*bc.length),t=Math.floor(Math.abs(Math.cos(i*888))*Tc.length),n=Math.floor(Math.abs(Math.sin(i*777))*90)+10;return`${bc[e]}${Tc[t]}${n}`}function wc(i){if(typeof i!="string")return Hr();let e=i.replace(/<[^>]*>/g,"").replace(/[\x00-\x1F\x7F-\x9F]/g,"").trim();return e=e.replace(/[^\w\s-]/g,"").replace(/\s+/g," "),e.length>20&&(e=e.slice(0,20).trim()),e.length<3?Hr():e}function w0(i=""){let e=0;for(let n=0;n<i.length;n++)e=e*31+i.charCodeAt(n)>>>0;const t=[{coat:"#7a4e32",apron:"#b8a682",hat:"#473d32",boots:"#2b231c"},{coat:"#3a5449",apron:"#c2bca3",hat:"#2d3f37",boots:"#202924"},{coat:"#3d4b60",apron:"#b5b29c",hat:"#2a3547",boots:"#1c222e"},{coat:"#634b6b",apron:"#bfb5a3",hat:"#44324a",boots:"#251c29"},{coat:"#806835",apron:"#ccc4a7",hat:"#544320",boots:"#2e2411"},{coat:"#445e38",apron:"#b8b498",hat:"#314427",boots:"#1f2b18"}];return t[e%t.length]}const Ac="afterlight-gardener-guest-id",Pa="afterlight-gardener-nickname";class A0{constructor(e=null){this.wsUrl=e||this.getDefaultUrl(),this.guestId=this.getOrCreateGuestId(),this.nickname=this.getOrCreateNickname(),this.ws=null,this.connected=!1,this.handlers=new Map,this.connectListeners=[],this.disconnectListeners=[],this.reconnectAttempts=0,this.reconnectTimer=null,this.lastMovementSend=0,this.desiredRoom=null}getDefaultUrl(){return"wss://racknerd-3941d39-1.<TAILNET_DNS>/ws"}getOrCreateGuestId(){try{let e=localStorage.getItem(Ac);return(!e||typeof e!="string")&&(e="guest_"+Math.random().toString(36).substring(2,11)+"_"+Date.now().toString(36),localStorage.setItem(Ac,e)),e}catch{return"guest_"+Math.random().toString(36).substring(2,11)}}getOrCreateNickname(){try{let e=localStorage.getItem(Pa);return e||(e=Hr(),localStorage.setItem(Pa,e)),wc(e)}catch{return Hr()}}setStoredNickname(e){this.nickname=wc(e);try{localStorage.setItem(Pa,this.nickname)}catch{}}connect(){if(!(this.ws&&(this.ws.readyState===WebSocket.OPEN||this.ws.readyState===WebSocket.CONNECTING))){try{this.ws=new WebSocket(this.wsUrl)}catch(e){console.warn("WebSocket init failed, scheduling reconnect:",e.message),this.scheduleReconnect();return}this.ws.onopen=()=>{this.connected=!0,this.reconnectAttempts=0,this.send(Ne.HELLO,{guestId:this.guestId,nickname:this.nickname}),this.desiredRoom&&this.send(Ne.JOIN_ROOM,{roomId:this.desiredRoom}),this.connectListeners.forEach(e=>e())},this.ws.onmessage=e=>{const t=T0(e.data);if(!t||!t.type)return;const n=this.handlers.get(t.type);n&&n.forEach(s=>s(t))},this.ws.onclose=()=>{this.connected=!1,this.disconnectListeners.forEach(e=>e()),this.scheduleReconnect()},this.ws.onerror=e=>{console.warn("NetworkClient socket error:",e)}}}scheduleReconnect(){if(this.reconnectTimer)return;const e=Math.min(1e4,1e3*Math.pow(1.5,this.reconnectAttempts));this.reconnectAttempts++,this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect()},e)}on(e,t){this.handlers.has(e)||this.handlers.set(e,[]),this.handlers.get(e).push(t)}onConnect(e){this.connectListeners.push(e)}onDisconnect(e){this.disconnectListeners.push(e)}send(e,t={}){this.ws&&this.ws.readyState===WebSocket.OPEN&&this.ws.send(b0({type:e,...t}))}sendMovement(e,t,n,s,r=!1){const a=performance.now();a-this.lastMovementSend<80||(this.lastMovementSend=a,this.send(Ne.MOVEMENT,{x:e,z:t,rotY:n,walking:s,sitting:!!r}))}sendTheaterQueue(e){this.send(Ne.THEATER_QUEUE,e)}sendTheaterControl(e){this.send(Ne.THEATER_CONTROL,e)}sendTheaterChannel(e,t){this.send(Ne.THEATER_CHANNEL,{url:e,title:t})}sendGardenAction(e,t,n=null){const s=`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;return this.send(Ne.GARDEN_ACTION,{actionId:s,action:e,bedIndex:t,seedCropId:n}),s}sendMarketBuy(e,t){this.send(Ne.MARKET_BUY,{cropId:e,quantity:t})}sendMarketSell(e,t,n){this.send(Ne.MARKET_SELL,{cropId:e,quality:t,quantity:n})}sendOrderPlace(e,t,n,s,r="B"){const a=`ord_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;return this.send(Ne.ORDER_PLACE,{orderId:a,side:e,cropId:t,price:n,quantity:s,quality:r}),a}sendOrderCancel(e){this.send(Ne.ORDER_CANCEL,{orderId:e})}sendContractComplete(e){this.send(Ne.CONTRACT_COMPLETE,{contractId:e})}sendEmote(e="wave"){this.send(Ne.EMOTE,{emote:e})}sendChat(e){this.send(Ne.CHAT_SEND,{text:e})}setNickname(e){this.setStoredNickname(e),this.send(Ne.SET_NICKNAME,{nickname:this.nickname})}joinRoom(e){this.desiredRoom=e,this.send(Ne.JOIN_ROOM,{roomId:e})}}const ct=new hn(1,1,1),Lr=new ai(1,1,1,8),Ia=new Map;function on(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return Ia.has(n)||Ia.set(n,new et({color:i,roughness:e,metalness:t})),Ia.get(n)}function Cc(i){const e=document.createElement("canvas");e.width=256,e.height=64;const t=e.getContext("2d");t.fillStyle="rgba(23, 33, 32, 0.85)",t.beginPath(),t.roundRect(8,8,240,48,12),t.fill(),t.strokeStyle="#c6b47a",t.lineWidth=2.5,t.stroke(),t.fillStyle="#e8d8b5",t.font='bold 24px "Space Mono", monospace, sans-serif',t.textAlign="center",t.textBaseline="middle",t.fillText(i,128,32);const n=new Sh(e);n.minFilter=xn;const s=new od({map:n,transparent:!0,depthTest:!1}),r=new mh(s);return r.scale.set(2.2,.55,1),r.position.set(0,2.3,0),r}function xd(i,e="Gardener"){const t=new _t,n=w0(i),s=on(n.coat,.7,.1),r=on(n.apron,.8,.05),a=on(n.hat,.75,.1),o=on(n.boots,.65,.3),l=on("#563a24",.6,.2),c=on("#b78d50",.45,.6),d=new et({color:"#d8f8e3",emissive:"#acf7d5",emissiveIntensity:2.2}),u=new re(ct,s);u.position.set(0,.9,0),u.scale.set(.64,.75,.48),u.castShadow=!0,t.add(u);const f=new re(ct,r);f.position.set(0,.86,.25),f.scale.set(.48,.68,.05),t.add(f);for(const _ of[-.16,.16]){const v=new re(ct,l);v.position.set(_,1.15,.22),v.scale.set(.06,.25,.04),t.add(v)}const p=new re(ct,l);p.position.set(.34,.75,.08),p.scale.set(.16,.28,.24),p.castShadow=!0,t.add(p);const g=new re(ct,l);g.position.set(.08,.96,.15),g.rotation.z=-.65,g.scale.set(.68,.05,.04),t.add(g);const x=new re(ct,s);x.position.set(0,1.45,0),x.scale.set(.72,.46,.54),x.castShadow=!0,t.add(x);const m=new re(ct,on("#1c2828",.5,.5));m.position.set(0,1.45,.28),m.scale.set(.58,.28,.05),t.add(m);for(const _ of[-.17,.17]){const v=new re(ct,d);v.position.set(_,1.46,.31),v.scale.set(.1,.08,.04),t.add(v)}const h=new re(Lr,a);h.position.set(0,1.7,0),h.scale.set(.65,.06,.65),t.add(h);const E=new re(ct,a);E.position.set(0,1.84,0),E.scale.set(.5,.24,.44),t.add(E);const b=new re(ct,l);b.position.set(0,1.75,0),b.scale.set(.52,.05,.46),t.add(b);for(const _ of[-.38,.38]){const v=new re(ct,s);v.position.set(_,.96,0),v.scale.set(.14,.5,.2),t.add(v);const A=new re(ct,l);A.position.set(_,.66,0),A.scale.set(.13,.16,.18),t.add(A)}const S=new _t;S.position.set(.42,.65,.2);const R=new re(Lr,c);R.scale.set(.12,.25,.12),S.add(R);const w=new re(Lr,c);w.position.set(0,.12,.16),w.rotation.x=.6,w.scale.set(.03,.22,.03),S.add(w),S.visible=!1,t.add(S);const P=[];for(const _ of[-.18,.18]){const v=new _t;v.position.set(_,.5,0);const A=new re(ct,s);A.position.set(0,-.14,0),A.scale.set(.18,.32,.2),v.add(A);const N=new re(ct,o);N.position.set(0,-.36,.06),N.scale.set(.2,.18,.34),N.castShadow=!0,v.add(N),t.add(v),P.push(v)}const I=Cc(e);return t.add(I),t.userData={playerId:i,nickname:e,legs:P,canGroup:S,nameSprite:I,setWateringCan(_){S.visible=_},updateNickname(_){t.remove(I);const v=Cc(_);t.add(v),t.userData.nameSprite=v,t.userData.nickname=_}},t}class C0{constructor(e){this.scene=e,this.players=new Map}setPlayer(e){if(!e||!e.id)return;let t=this.players.get(e.id);if(t)t.targetX=e.x,t.targetZ=e.z,t.targetRotY=e.rotY,t.walking=!!e.walking,t.sitting=!!e.sitting,e.nickname&&e.nickname!==t.avatar.userData.nickname&&t.avatar.userData.updateNickname(e.nickname);else{const n=xd(e.id,e.nickname||"Gardener");n.position.set(e.x??0,0,e.z??0),n.rotation.y=e.rotY??0,this.scene.add(n),t={avatar:n,targetX:e.x??0,targetZ:e.z??0,targetRotY:e.rotY??0,walking:!!e.walking,sitting:!!e.sitting},this.players.set(e.id,t)}}removePlayer(e){const t=this.players.get(e);t&&(this.scene.remove(t.avatar),this.players.delete(e))}clear(){for(const e of this.players.values())this.scene.remove(e.avatar);this.players.clear()}update(e,t){const n=Math.min(1,e*12);for(const s of this.players.values()){const{avatar:r,targetX:a,targetZ:o,targetRotY:l,walking:c,sitting:d}=s;r.position.x+=(a-r.position.x)*n,r.position.z+=(o-r.position.z)*n;let u=l-r.rotation.y;for(;u<-Math.PI;)u+=Math.PI*2;for(;u>Math.PI;)u-=Math.PI*2;r.rotation.y+=u*n,d?(r.position.y=0,r.userData.legs.forEach(f=>{f.rotation.x=-1.35})):c?(r.position.y=Math.sin(t*12)*.025,r.userData.legs.forEach((f,p)=>{f.rotation.x=Math.sin(t*12+p*Math.PI)*.45})):(r.position.y=0,r.userData.legs.forEach(f=>{f.rotation.x*=.8}))}}}function R0(){const i=new _t,e=on("#e6e0cc",.65,.2),t=on("#233c3e",.6,.3),n=on("#9c5838",.7,.2),s=on("#b78d50",.5,.4),r=on("#455759",.6,.3),a=new et({color:"#d8f8e3",emissive:"#acf7d5",emissiveIntensity:2}),o=new re(ct,e);o.position.set(0,.85,0),o.scale.set(.62,.7,.48),i.add(o);const l=new re(ct,t);l.position.set(0,.92,.265),l.scale.set(.38,.35,.07),i.add(l);for(let m=0;m<3;m++){const h=new re(ct,n);h.position.set(0,.8+m*.095,.31),h.scale.set(.27,.035,.025),i.add(h)}const c=new re(ct,e);c.position.set(0,1.4,0),c.scale.set(.78,.46,.58),i.add(c);const d=new re(ct,t);d.position.set(0,1.4,.303),d.scale.set(.66,.3,.055),i.add(d);for(const m of[-.2,.2]){const h=new re(ct,a);h.position.set(m,1.43,.34),h.scale.set(.12,.1,.045),i.add(h)}const u=new re(ct,r);u.position.set(0,1.66,0),u.scale.set(.87,.08,.65),i.add(u);const f=new re(Lr,n);f.position.set(.23,1.85,0),f.scale.set(.025,.3,.025),i.add(f);const p=new re(ct,s);p.position.set(.23,2.01,0),p.scale.set(.075,.075,.075),i.add(p);const g=new re(ct,r);g.position.set(0,.93,-.34),g.scale.set(.48,.53,.25),i.add(g);const x=[];for(const m of[-.22,.22]){const h=new _t;h.position.set(m,.52,0);const E=new re(ct,r);E.position.set(0,-.15,0),E.scale.set(.17,.33,.19),h.add(E);const b=new re(ct,e);b.position.set(0,-.34,.09),b.scale.set(.24,.16,.38),h.add(b),i.add(h),x.push(h);const S=new re(ct,e);S.position.set(m*1.9,.86,0),S.scale.set(.18,.53,.22),i.add(S)}return i.scale.setScalar(.68),i.userData.legs=x,i.castShadow=!0,i}const La=new hn(1,1,1),P0=new ai(1,1,1,8),Da=new Map;function Xe(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return Da.has(n)||Da.set(n,new et({color:i,roughness:e,metalness:t})),Da.get(n)}function I0(){const i=new _t;i.name="market";const e=[],t=[],n=[];function s(Q,H,$,ue,Ae,xe,Be,Mt=i){const C=new re(La,typeof Be=="string"?Xe(Be):Be);return C.position.set(Q,H,$),C.scale.set(ue,Ae,xe),C.castShadow=!0,C.receiveShadow=!0,Mt.add(C),C}function r(Q,H,$,ue){e.push({x:Q,z:H,w:$/2+.38,d:ue/2+.38})}function a(Q,H,$,ue,Ae,xe,Be,Mt=1.5){const C=s(Q,H,$,ue,Ae,xe,Be);return C.material=new et({color:Be,emissive:Be,emissiveIntensity:Mt}),C}function o(Q,H,$,ue="#ffc775"){s(Q,H,$,.3,.48,.3,new et({color:"#fff2c6",emissive:ue,emissiveIntensity:2.5})),s(Q,H+.28,$,.46,.1,.44,Xe("#192d2d")),s(Q,H-.28,$,.36,.1,.35,Xe("#192d2d"));const Ae=new rl(ue,6,7,2);return Ae.position.set(Q,H-.1,$+.2),i.add(Ae),Ae}s(0,-.6,0,28,1,25,Xe("#242f2b")),s(0,-.12,0,24,.4,21,Xe("#3d4944",.27,.32));const l=["#485450","#535e55","#647065","#70776a","#3a4845","#7b7e6d"];let c=42;function d(){return c=c*1664525+1013904223>>>0,c/4294967296}for(let Q=-12;Q<12;Q++)for(let H=-10;H<11;H++){const $=new Fe(l[Math.floor(d()*l.length)]).multiplyScalar(.75+d()*.25);s(Q+.49+H%2*.05,.06+d()*.03,H+.47,.96,.16,.96,Xe("#"+$.getHexString(),.3+d()*.3,.2))}for(let Q=0;Q<40;Q++){const H=new re(new tl(.4+d()*.9,9),Xe("#516564",.07,.62));H.rotation.x=-Math.PI/2,H.position.set((d()-.5)*22,.183,(d()-.5)*19),H.scale.y=.4+d()*.4,i.add(H)}for(let Q=-12;Q<=12;Q+=.8)for(let H=.4;H<3;H+=.4)s(Q,H,-10.5,.76,.37,.65,H>2.6?"#a0a18a":"#4d6561");for(let Q=-10;Q<11;Q+=.8)for(const H of[-12,12])Math.abs(Q)<2||(s(H,.65,Q,.5,1.3,.76,Xe("#192d2d")),s(H,1.35,Q,.7,.15,.78,Xe("#485450")));const u=0,f=-7.5;s(u,1.5,f,5.5,3,1.4,Xe("#3f3224")),r(u,f,5.5,1.4);for(const Q of[-2.5,2.5]){const H=new re(P0,Xe("#2d241c"));H.position.set(u+Q,2.2,f+.9),H.scale.set(.08,3.4,.08),i.add(H)}const p=s(u,3.6,f+.4,6,.25,2.4,Xe("#7b4c34",.8));p.rotation.x=.18,s(u,1.8,f+.72,4.4,1.8,.08,Xe("#1a2422",.9,.1)),o(u-1.8,2.8,f+.8),o(u+1.8,2.8,f+.8),t.push({type:"market_board",x:u,z:f+1.5,title:"Market Exchange Board",sub:"Press E to view spot prices, create orders, and trade"});const g=-6.5,x=-4.5;s(g,.9,x,3.6,1.8,2,Xe("#4a3b2b")),r(g,x,3.6,2),s(g,1.85,x,3.8,.1,2.2,Xe("#63523f"));for(let Q=-1;Q<=1;Q++)s(g+Q*.9,2.1,x,.6,.5,.6,Xe(["#b8aa83","#a29571","#c4b693"][Q+1]));o(g,2.8,x+.8,"#ffdf96"),t.push({type:"seed_vendor",x:g,z:x+1.6,title:"Town Seed Merchant",sub:"Press E to browse seeds, tubers, and planting starts"});const m=6.5,h=-4.5;s(m,1.4,h,3.4,2.8,1,Xe("#2d3c39")),r(m,h,3.4,1),s(m,1.6,h+.52,2.8,1.6,.06,Xe("#d0c5a0",.85,.05)),o(m,2.9,h+.6,"#ffd580"),t.push({type:"contracts_board",x:m,z:h+1.5,title:"Restaurant & Café Noticeboard",sub:"Press E to fulfill delivery contracts for coins and reputation"});for(const[Q,H,$]of[[-8,4,1.1],[-9.2,4.2,.9],[8.5,5,1],[9.5,5.4,.9],[-3,-3,.8],[3,-3,.8],[-8.5,-8,1.2],[8.5,-8,1.2]])s(Q,$*.5,H,$,$,$,Xe("#634932")),r(Q,H,$,$);const E=10.7,b=0;for(const Q of[-1.5,1.5])s(E,1.8,Q,.6,3.6,.6,Xe("#273d3d")),a(E,3.6,Q,.8,.3,.8,"#74d0bd",2);s(E,3.8,0,.8,.35,3.6,Xe("#273d3d")),t.push({type:"garden_gate",x:E,z:b,title:"Travel to Your Market Garden",sub:"Press E to walk the path to your personal plot"});const S=-10.7,R=0;for(const Q of[-1.5,1.5])s(S,1.8,Q,.6,3.6,.6,Xe("#273d3d")),a(S,3.6,Q,.8,.3,.8,"#e0c889",2);s(S,3.8,0,.8,.35,3.6,Xe("#273d3d")),t.push({type:"district_gate",targetDistrict:"canal",x:S,z:R,title:"The Outer Districts Gateway",sub:"Press E to venture into the ancient city biomes"});const w=new _t;w.name="dynamic",i.add(w);const P={restored:!1},I=3,_=7.6;s(I,1.6,_,2.6,3.2,2.6,Xe("#5a5f58",.75,.12),w),s(I,3.3,_,2.9,.28,2.9,Xe("#6d7268"),w),s(I,.35,_,3,.7,3,Xe("#454a44"),w),r(I,_,2.6,2.6),s(I,.75,_-1.32,.9,1.5,.12,Xe("#2c2620"),w);const v=a(I,1,_-1.36,.7,1,.05,"#e0a865",.4);w.add(v);const A=new _t;w.add(A);const N=s(I,3.8,_,2.2,.5,2.2,Xe("#4a3b2b"),A);N.rotation.z=.28;const X=s(I-1.9,.5,_-1.7,2.4,.16,.22,Xe("#6b5845"),A);X.rotation.z=.1;const O=s(I+1.75,.55,_-1.5,1,1,.35,Xe("#7d827a"),A);O.rotation.z=.35;const k=new _t;w.add(k),s(I,3.85,_,2.5,.55,2.5,Xe("#63513a"),k),s(I,4.25,_,1.4,.35,1.4,Xe("#54452f"),k);const U=new _t;U.position.set(I,3.6,_-1.42),k.add(U),s(I,3.6,_-1.35,.5,.5,.4,Xe("#8a744f"),U);for(let Q=0;Q<4;Q++){const H=s(0,0,0,2.3,.5,.08,Xe("#a08a5f",.7),U);H.position.set(Math.cos(Q*Math.PI/2)*1.35,Math.sin(Q*Math.PI/2)*1.35,-.18),H.rotation.z=Q*Math.PI/2}const q=a(I+1,1.9,_-1.36,.2,.3,.08,"#ffcb79",1.4);k.add(q);const V=a(I,1.05,_-1.38,.8,.5,.05,"#f0b060",.8);k.add(V),t.push({type:"mill",x:I,z:5.6,title:"The Great Mill (broken)",sub:"Press E to help restore it with materials"});const J=5.8,ee=7.4;s(J,.55,ee,1.5,.9,1.1,Xe("#4a3b2b"),w),s(J,1.05,ee,1.6,.12,1.2,Xe("#5f4d36"),w),r(J,ee,1.5,1.1),s(J-.35,1.25,ee,.5,.3,.5,Xe("#7d827a"),w),s(J+.4,1.22,ee-.15,.3,.24,.3,Xe("#c07840"),w),t.push({type:"machine_bench",x:J,z:6.2,title:"Machine Shop Workbench",sub:"Press E to contribute materials & craft garden tools"});function de(Q){const H=Q?.mill?.status==="restored";P.restored=H,A.visible=!H,k.visible=H;const $=t.find(ue=>ue.type==="mill");$&&($.title=H?"The Great Mill":"The Great Mill (broken)",$.sub=H?"Press E to mill wheat into flour":"Press E to help restore it with materials")}de(null);const Re=i.children.filter(Q=>Q.isMesh&&Q.geometry===La&&!Q.material.transparent&&Q.material.emissive?.getHex()===0),$e=new Qo(La,new et({color:16777215,roughness:.62,metalness:.2}),Re.length);Re.forEach((Q,H)=>{Q.updateMatrix(),$e.setMatrixAt(H,Q.matrix),$e.setColorAt(H,Q.material.color),i.remove(Q)}),$e.castShadow=!0,$e.receiveShadow=!0,i.add($e);function je(Q){n.forEach(H=>H(Q)),P.restored&&(U.rotation.z=Q*.55)}return{group:i,obstacles:e,items:t,update:je,setMachineState:de}}const un={radish:{id:"radish",name:"Red Radish",tagline:"Crisp peppery roots, fast to harvest.",seedCost:4,basePrice:8,growDuration:25,waterDemand:1,yield:2,repeatHarvest:!1,color:"#4d8050",produceColor:"#c93b4a",xp:12,unlockLevel:1},lettuce:{id:"lettuce",name:"Rain Crisp Lettuce",tagline:"Tender layered greens favored by market cafes.",seedCost:6,basePrice:12,growDuration:40,waterDemand:1.2,yield:2,repeatHarvest:!1,color:"#65a759",produceColor:"#83cf72",xp:18,unlockLevel:1},carrot:{id:"carrot",name:"Amber Carrot",tagline:"Deep sweet orange taproots grown in dark tilled soil.",seedCost:8,basePrice:17,growDuration:60,waterDemand:.9,yield:2,repeatHarvest:!1,color:"#498845",produceColor:"#e07a2a",xp:25,unlockLevel:1},kale:{id:"kale",name:"Winter Kale",tagline:"Hearty ruffled brassica that thrives in cold rain.",seedCost:12,basePrice:24,growDuration:80,waterDemand:.8,yield:3,repeatHarvest:!1,color:"#2d6148",produceColor:"#3d785a",xp:32,unlockLevel:2},basil:{id:"basil",name:"Copper Basil",tagline:"Aromatic dark purple-green leaves prized by the apothecary.",seedCost:15,basePrice:32,growDuration:100,waterDemand:1.3,yield:3,repeatHarvest:!1,color:"#425a40",produceColor:"#7b3e64",xp:40,unlockLevel:2},tomato:{id:"tomato",name:"Lantern Tomato",tagline:"Heavy climbing vine with glowing scarlet fruit. Continues bearing.",seedCost:22,basePrice:28,growDuration:120,waterDemand:1.1,yield:3,repeatHarvest:!0,regrowDuration:45,color:"#3f7842",produceColor:"#d6422f",xp:50,unlockLevel:3},strawberry:{id:"strawberry",name:"Dew Strawberry",tagline:"Low creeping runners with bright sweet red berries.",seedCost:28,basePrice:38,growDuration:140,waterDemand:1.4,yield:4,repeatHarvest:!0,regrowDuration:50,color:"#39784b",produceColor:"#e6324b",xp:65,unlockLevel:3},wheat:{id:"wheat",name:"Hearth Wheat",tagline:"Golden milling grain. The Great Mill grinds it into flour.",seedCost:4,basePrice:9,growDuration:30,waterDemand:1,yield:2,repeatHarvest:!1,color:"#8a8a3d",produceColor:"#d9b45a",xp:14,unlockLevel:1}},Fo=Object.values(un),zn={EMPTY:0,PREPARED:1,SEED:2,SPROUT:3,JUVENILE:4,MATURE:5,HARVESTABLE:6},L0={C:.8,B:1,A:1.35,"A+":1.8},Ss=new hn(1,1,1),Rc=new nl(1,6,6),Mr=new ai(1,1,1,6),Ua=new Map;function Es(i,e=.65,t=.1,n=0,s=0){const r=`${i}_${e}_${t}_${n}_${s}`;return Ua.has(r)||Ua.set(r,new et({color:i,roughness:e,metalness:t,emissive:n,emissiveIntensity:s})),Ua.get(r)}function D0(i,e,t){for(;i.children.length>0;)i.remove(i.children[0]);if(!e||t<=zn.PREPARED)return;const n=un[e]??un.radish,s=Es(n.color,.6,.1),r=Es(n.produceColor,.4,.15,n.produceColor,.25);if(t===zn.SEED){for(const[a,o]of[[-.2,-.15],[.2,.15],[0,0]]){const l=new re(Ss,Es("#829b65",.8));l.position.set(a,.08,o),l.scale.set(.06,.08,.06),l.castShadow=!0,i.add(l)}return}if(t===zn.SPROUT){const a=new re(Mr,Es("#55864e",.7));a.position.set(0,.15,0),a.scale.set(.025,.25,.025),i.add(a);for(let o=0;o<2;o++){const l=new re(Ss,s);l.position.set(o===0?-.07:.07,.24,0),l.scale.set(.12,.03,.08),l.rotation.z=(o===0?-1:1)*.4,i.add(l)}return}if(t===zn.JUVENILE){for(let a=0;a<3;a++){const o=a*Math.PI*2/3,l=new re(Mr,s);l.position.set(Math.cos(o)*.08,.25,Math.sin(o)*.08),l.scale.set(.035,.45,.035),l.rotation.z=Math.cos(o)*.25,l.rotation.x=Math.sin(o)*.25,i.add(l);const c=new re(Ss,s);c.position.set(Math.cos(o)*.16,.45,Math.sin(o)*.16),c.scale.set(.22,.06,.16),c.rotation.y=o,i.add(c)}return}if(t===zn.MATURE||t===zn.HARVESTABLE){const a=t===zn.HARVESTABLE,o=a?1:.85;if(e==="tomato"){const l=new re(Mr,Es("#5b4834",.8));l.position.set(0,.5,0),l.scale.set(.04,1,.04),i.add(l)}for(let l=0;l<5;l++){const c=l*Math.PI*2/5,d=new re(Ss,s);d.position.set(Math.cos(c)*.2*o,.35+l%2*.15,Math.sin(c)*.2*o),d.scale.set(.3*o,.1,.22*o),d.rotation.set(Math.sin(c)*.3,c,Math.cos(c)*.3),d.castShadow=!0,i.add(d)}if(a)if(e==="radish"||e==="carrot")for(let l=0;l<3;l++){const c=(l-1)*.18,d=new re(e==="carrot"?Mr:Rc,r);d.position.set(c,e==="carrot"?.2:.16,0),d.scale.set(.12,.22,.12),d.castShadow=!0,i.add(d)}else if(e==="tomato"||e==="strawberry")for(let l=0;l<4;l++){const c=l*Math.PI*2/4+.3,d=new re(Rc,r);d.position.set(Math.cos(c)*.25,.38+l%2*.15,Math.sin(c)*.25),d.scale.set(.13,.14,.13),d.castShadow=!0,i.add(d)}else for(let l=0;l<4;l++){const c=l*Math.PI*2/4,d=new re(Ss,r);d.position.set(Math.cos(c)*.15,.55,Math.sin(c)*.15),d.scale.set(.24,.08,.18),d.rotation.set(.2,c+.4,.2),d.castShadow=!0,i.add(d)}}}function U0(i,e=4){const t=[];if(!Number.isInteger(i)||i<0)return t;const n=i%e;return i-e>=0&&t.push(i-e),n>0&&t.push(i-1),t.push(i),n<e-1&&t.push(i+1),t.push(i+e),t}const ol={copper:{id:"copper",name:"Copper Scrap",tagline:"Pipe stubs and verdigris sheeting pried from the foundry floor.",color:"#c07840",glowColor:"#e8934a",district:"foundry"},timber:{id:"timber",name:"Trestle Timber",tagline:"Sound oak beams cut free of the overgrown viaduct.",color:"#7a5a38",glowColor:"#c9a05e",district:"trestle"},glass:{id:"glass",name:"Glass Shards",tagline:"Thick panes of uncracked glass swept from the frost-line benches.",color:"#9fc4d8",glowColor:"#cfeaf7",district:"frost-spire"}},Pc=Object.values(ol),xi={flour:{id:"flour",name:"Stone-Ground Flour",tagline:"Fine milled flour from the Great Mill. Bakers pay a premium.",basePrice:14}},N0=Object.values(xi),Md={copper:4,timber:4,glass:4},Yi={id:"sprinkler",name:"Garden Sprinkler",cost:{copper:2,glass:2}},F0=[{id:"foundry_copper_1",district:"foundry",material:"copper",position:[4,2.5],respawnMs:18e4},{id:"foundry_copper_2",district:"foundry",material:"copper",position:[8.5,1],respawnMs:18e4},{id:"foundry_copper_3",district:"foundry",material:"copper",position:[-3.5,2.5],respawnMs:18e4},{id:"trestle_timber_1",district:"trestle",material:"timber",position:[6.5,2],respawnMs:18e4},{id:"trestle_timber_2",district:"trestle",material:"timber",position:[2.5,-2],respawnMs:18e4},{id:"trestle_timber_3",district:"trestle",material:"timber",position:[-3.5,-2],respawnMs:18e4},{id:"glasshouse_glass_1",district:"frost-spire",material:"glass",position:[8.5,2.5],respawnMs:18e4},{id:"glasshouse_glass_2",district:"frost-spire",material:"glass",position:[-3,.5],respawnMs:18e4},{id:"glasshouse_glass_3",district:"frost-spire",material:"glass",position:[2.5,3.5],respawnMs:18e4}],mi=new hn(1,1,1),O0=new ai(1,1,1,8),Na=new Map;function St(i,e=.7,t=.15){const n=`${i}_${e}_${t}`;return Na.has(n)||Na.set(n,new et({color:i,roughness:e,metalness:t})),Na.get(n)}function B0(){const i=new _t;i.name="garden";const e=[],t=[],n=[];function s(O,k,U,q,V,J,ee,de=i){const Re=new re(mi,typeof ee=="string"?St(ee):ee);return Re.position.set(O,k,U),Re.scale.set(q,V,J),Re.castShadow=!0,Re.receiveShadow=!0,de.add(Re),Re}function r(O,k,U,q){e.push({x:O,z:k,w:U/2+.38,d:q/2+.38})}function a(O,k,U,q,V,J,ee,de=1.5){const Re=s(O,k,U,q,V,J,ee);return Re.material=new et({color:ee,emissive:ee,emissiveIntensity:de}),Re}function o(O,k,U,q="#ffdf96"){s(O,k,U,.25,.4,.25,new et({color:"#fff2c6",emissive:q,emissiveIntensity:2.5})),s(O,k+.22,U,.38,.08,.38,St("#232a28"));const V=new rl(q,5,6,2);return V.position.set(O,k,U),i.add(V),V}s(0,-.6,0,28,1,26,St("#272b22")),s(0,-.12,0,25,.4,23,St("#383e2f",.85,.1));const l=St("#565b4c",.8,.1);s(0,.07,0,24,.12,2.5,l),s(0,.07,0,2.5,.12,20,l);for(let O=-12;O<=12;O+=.8)s(O,.6,-10.5,.76,1.2,.65,St("#414b38")),s(O,.6,10.5,.76,1.2,.65,St("#414b38"));for(let O=-10;O<=10;O+=.8)for(const k of[-12,12])Math.abs(O)<2||s(k,.6,O,.65,1.2,.76,St("#414b38"));const c=-10.7,d=0;for(const O of[-1.4,1.4])s(c,1.8,O,.5,3.4,.5,St("#2d3835")),a(c,3.4,O,.7,.25,.7,"#74d0bd",2);s(c,3.6,0,.7,.3,3.3,St("#2d3835")),t.push({type:"market_gate",x:c,z:d,title:"Return to Market Court",sub:"Press E to walk back to the town market square"});const u=[[-6,-7],[-2,-7],[2,-7],[6,-7],[-6,-4],[-2,-4],[2,-4],[6,-4],[-6,4],[-2,4],[2,4],[6,4]];for(let O=0;O<u.length;O++){const[k,U]=u[O],q=2.4,V=1.6;s(k,.25,U,q+.2,.35,V+.2,St("#4d3e2c",.8,.1));const J=new Fe("#382c1e"),ee=new re(mi,new et({color:J.clone(),roughness:.85,metalness:.05}));ee.position.set(k,.35,U),ee.scale.set(q,.15,V),ee.castShadow=!0,ee.receiveShadow=!0,i.add(ee),r(k,U,q*.7,V*.7);const de=new _t;de.position.set(k,.42,U),i.add(de),n.push({bedIndex:O,soilMesh:ee,plantGroup:de,x:k,z:U,renderedCrop:null,renderedStage:-1}),t.push({type:"bed",bedIndex:O,x:k,z:U,title:`Garden Bed #${O+1}`,sub:"Empty. Select Hoe to prepare or Seed to plant."})}const f=-8.8,p=-8;s(f,1.8,p,3.2,3.2,2.6,St("#3f3323")),r(f,p,3.2,2.6);const g=s(f,3.5,p,3.6,.15,3,St("#52605f",.4,.5));g.rotation.z=-.15,o(f+1.2,2.6,p+1.4);const x=-8.5,m=-2.5;s(x,.45,m,1.4,.8,2,St("#443727")),r(x,m,1.4,2);const h=new re(new fn(1.1,1.7),new et({color:"#346d78",roughness:.1,metalness:.7,transparent:!0,opacity:.85}));h.rotation.x=-Math.PI/2,h.position.set(x,.82,m),i.add(h),t.push({type:"water_source",x:x+.8,z:m,title:"Rainwater Cistern",sub:"Clean water caught from the greenhouse gutters"});const E=9,b=-7.5;s(E,.6,b,2.4,1,2.2,St("#403425")),r(E,b,2.4,2.2),s(E,.9,b,2,.5,1.8,St("#261e14",.9));const S=9,R=5;s(S,.6,R,2.5,.9,3.2,St("#54432f")),r(S,R,2.5,3.2);const w=new re(O0,St("#707b78",.3,.6));w.position.set(S,1.2,R-.6),w.scale.set(.45,.45,.45),i.add(w),o(S-.8,2.4,R);const P=[],I=new zs(.62,.72,24);for(let O=0;O<5;O++){const k=new re(I,new cs({color:"#7fd0e8",side:Jt,transparent:!0,opacity:.55}));k.rotation.x=-Math.PI/2,k.position.y=.3,k.visible=!1,i.add(k),P.push(k)}function _(O){const k=Number.isInteger(O)&&O>=0?U0(O).filter(U=>n[U]):[];P.forEach((U,q)=>{const V=k[q];if(V===void 0){U.visible=!1;return}const J=n[V];U.position.set(J.x,.3,J.z),U.visible=!0})}function v(O){const k=new Map((O||[]).map(U=>[U.bedIndex,U]));for(const U of n){const q=k.get(U.bedIndex);if(q&&!U.fixtureGroup){const V=new _t;V.position.set(U.x,.42,U.z);const J=new re(mi,St("#8a6844",.6,.3));J.scale.set(.1,.55,.1),J.position.y=.27,J.castShadow=!0,V.add(J);const ee=St("#b0784a",.5,.5);for(const[Re,$e]of[[.24,0],[-.24,0],[0,.24],[0,-.24]]){const je=new re(mi,ee);je.scale.set(.34,.07,.07),je.position.set(Re*.9,.52,$e*.9),je.rotation.y=$e!==0?Math.PI/2:0,V.add(je)}const de=new re(mi,new et({color:"#aedff2",emissive:"#7fd0e8",emissiveIntensity:.9,transparent:!0,opacity:.85,roughness:.2,metalness:.1}));de.scale.setScalar(.16),de.position.y=.62,V.add(de),U.fixtureGroup=V,U.fixtureGlobe=de,i.add(V)}else!q&&U.fixtureGroup&&(i.remove(U.fixtureGroup),U.fixtureGroup=null,U.fixtureGlobe=null)}}const A=i.children.filter(O=>O.isMesh&&O.geometry===mi&&!O.material.transparent&&!O.material.emissive?.getHex()),N=new Qo(mi,new et({color:16777215,roughness:.65,metalness:.15}),A.length);A.forEach((O,k)=>{O.updateMatrix(),N.setMatrixAt(k,O.matrix),N.setColorAt(k,O.material.color),i.remove(O)}),N.castShadow=!0,N.receiveShadow=!0,i.add(N);function X(O,k=null){if(k)for(const U of n){const q=k[U.bedIndex];if(!q)continue;U.fixtureGlobe&&(U.fixtureGlobe.rotation.y=O*1.2+U.bedIndex,U.fixtureGlobe.position.y=.62+Math.sin(O*3+U.bedIndex)*.03);const V=U.soilMesh.material;if(!q.prepared)V.color.set("#483d2f");else{const J=q.moisture||0,ee=new Fe("#352a1c"),de=new Fe("#161009");V.color.copy(ee).lerp(de,J)}(U.renderedCrop!==q.cropId||U.renderedStage!==q.stage)&&(U.renderedCrop=q.cropId,U.renderedStage=q.stage,D0(U.plantGroup,q.cropId,q.stage))}}return{group:i,obstacles:e,items:t,bedVisuals:n,update:X,setFixtures:v,previewCoverage:_}}function k0(i){const{group:e,block:t,box:n,glow:s,material:r,colors:a,items:o,animated:l}=i;n(0,.25,-8.3,14,.5,2.4,"#3a3134"),t(0,-8.3,14,2.4);const c=s(0,3.1,-8.35,13,4,.15,"#101418",.12);n(0,5.25,-8.3,13.6,.3,.34,a.brass),n(0,.95,-8.3,13.6,.3,.34,a.brass);for(const E of[-6.65,6.65])n(E,3.1,-8.3,.3,4.6,.34,a.brass);i.screenQuad=[new D(-6.5,1.1,-8.28),new D(6.5,1.1,-8.28),new D(6.5,5.1,-8.28),new D(-6.5,5.1,-8.28)],l.push((E,b)=>{c.material.emissiveIntensity=b?.45+Math.sin(E*2)*.08:.12});for(const E of[-1,1]){const b=n(E*7.3,2.7,-8.1,1.1,5.4,2.8,"#5a2029");b.rotation.z=-E*.035,t(E*7.3,-8.1,1.1,2.8)}n(0,6.2,-8.1,15.8,.5,1.2,"#4a1b22"),n(0,5.75,-7.7,13.4,.55,.5,"#2c2226");const d=[];for(let E=-6;E<=6;E+=.75)d.push(s(E,5.75,-7.42,.16,.16,.12,"#ffd9a0",.15));l.push((E,b)=>{d.forEach((S,R)=>{S.material.emissiveIntensity=b?1.6+Math.sin(E*3+R)*.5:.15})}),n(8,1.5,-6,1.8,3,1.6,a.dark),t(8,-6,1.8,1.6),n(8,3.15,-6.1,.6,.3,.6,"#33393c"),n(8,3.55,-6.1,.55,.5,.8,"#22282b");const u=new re(new ai(.14,.14,.45,10),r(a.brass));u.rotation.x=Math.PI/2,u.position.set(8,3.55,-6.65),e.add(u);const f=s(4.6,3.33,-7.58,.1,.1,6.95,"#ffe9c0",0);f.rotation.y=Math.atan2(-6.8,-1.35),l.push((E,b)=>{f.material.emissiveIntensity=b?.9+Math.sin(E*7)*.15:0});const p=[];for(const E of[-3.5,3.5])for(const b of[1.4,3.6])p.push(s(E,.1,b,.18,.1,.18,"#ffca7a",.15));l.push((E,b)=>{p.forEach((S,R)=>{S.material.emissiveIntensity=b?1.7+Math.sin(E*2+R)*.3:.15})});const g=[-2.75,-1.65,-.55,.55,1.65,2.75],x=[3.9,5,6.1,7.2,8.3],m=[...g,...x,...x.map(E=>-E)];for(const[E,b]of[[.3,1],[2.5,2],[4.7,3]])for(const S of m){t(S,E,.55,.6),n(S,.22,E,.52,.12,.5,"#63212c"),n(S,.56,E+.26,.52,.62,.1,"#6b2733");for(const R of[-.19,.19])n(S+R,.07,E,.07,.14,.07,a.dark);o.push({type:"seat",x:S,z:E,title:"Take a seat",sub:`Row ${b} · The Orpheum`})}for(const[E,b]of[[-5,"#c9a86a"],[5,"#8fa8b0"]])n(11.5,2.1,E,.16,2,1.3,a.dark),s(11.4,2.1,E,.05,1.6,1.05,b,.35);n(-7.5,.5,9.2,3.4,1,1.4,"#4a3830"),t(-7.5,9.2,3.4,1.4),n(-7.5,1.05,9.2,3.6,.12,1.6,"#8a7057"),s(-7.5,1.35,9.2,1.8,.12,.5,"#ffca7a",.5);const h=new re(new fn(1.7,3),new et({color:"#6e2430",transparent:!0,opacity:.92,roughness:.9}));h.rotation.x=-Math.PI/2,h.position.set(0,.16,7.1),e.add(h),o.push({type:"theater_screen",x:0,z:-5.9,title:"Screen controls",sub:"Press E to run the picture"})}const Vt=[{id:"court",name:"The Rain Court",district:"LOWER DISTRICT / 04",subtitle:"AFTER THE RAIN",color:"#657264",sun:"#ffe0a5",description:"Wet stone, warm windows. Where your journey began."},{id:"canal",name:"The Sluiceworks",district:"WATER DISTRICT / 05",subtitle:"BENEATH THE MIST",color:"#466b70",sun:"#c3e6e1",description:"Cross the canal and wake the sleeping waterworks.",objective:"Open the sluice valve",action:"Turn the sluice valve",done:"Waterworks flowing",message:"Water moves through the old channels again. Somewhere below, a garden drinks.",landmark:[7,-5],note:[-7,5],noteTitle:"A waterkeeper’s promise",noteBody:"“Keep the water moving. The roots above us are still alive.”",spawn:[-9,0]},{id:"garden",name:"The Glass Garden",district:"UPPER TERRACES / 06",subtitle:"WHERE GREEN RETURNS",color:"#78846a",sun:"#ffe6ad",description:"An overgrown greenhouse above the city. Something still grows.",objective:"Wake the seed nursery",action:"Tend the seed nursery",done:"Nursery awakened",message:"The nursery lights up, sheltering a new generation of green. Kiln watches the leaves unfold.",landmark:[4,-5],note:[-6,5],noteTitle:"The last gardener",noteBody:"“A city is not empty while something is growing. Leave a little room for the wild.”",spawn:[-9,0]},{id:"station",name:"The Last Platform",district:"TRANSIT DISTRICT / 07",subtitle:"THE BLUE HOUR",color:"#424d70",sun:"#b4c5fa",description:"An abandoned tram stop, and a signal waiting to be heard.",objective:"Light the signal beacon",action:"Send the home signal",done:"Signal broadcasting",message:"A warm signal reaches across the rooftops. If someone is out there, they know the city is waking.",landmark:[7,5],note:[-6,5],noteTitle:"An unsent timetable",noteBody:"“Last service: whenever you are ready. There will always be a way home.”",spawn:[-9,0]},{id:"aqueduct",name:"The Sunken Aqueduct",district:"AQUEDUCT DISTRICT / 08",subtitle:"DEEP RUNS THE WATER",color:"#384d52",sun:"#9ec4c0",description:"Subterranean stone channels beneath the old city. Clear the silt sluice to let the cisterns breathe.",objective:"Clear the silt sluice",action:"Raise the silt gate",done:"Cisterns breathing",message:"Clear water rushes through the ancient conduit. The subterranean echoing returns to life.",landmark:[6,-4],note:[-6,4],noteTitle:"Cistern Overseer’s Log",noteBody:"“The masonry has held for three centuries. Give it clean water, and it will hold for three more.”",spawn:[-9,0]},{id:"caldera",name:"The Boiler Caldera",district:"GEOTHERMAL DISTRICT / 09",subtitle:"HEAT FROM THE DEEP",color:"#4d3b38",sun:"#f7aa74",description:"Steam vents hiss through dark basalt crevices. Regulate the geothermal manifold.",objective:"Regulate the geothermal manifold",action:"Turn the pressure manifold",done:"Manifold regulated",message:"Steam settles into a steady, resonant rhythm. Warm air rises toward the cold terraces above.",landmark:[5,-4],note:[-6,5],noteTitle:"Thermal Watchman",noteBody:"“Listen to the pressure before you touch a valve. The rock speaks if you have patience.”",spawn:[-9,0]},{id:"understory",name:"The Spore Understory",district:"FUNGAL DISTRICT / 10",subtitle:"LIGHT IN THE DAMP",color:"#3b4737",sun:"#a5d9a0",description:"A cavernous lower rotunda overtaken by luminous fungi. Awaken the bioluminescent mycelium.",objective:"Awaken the mycelium lattice",action:"Energize the mycelial node",done:"Mycelium luminous",message:"Soft green light pulses through the damp loam and ripples across the shelf fungi.",landmark:[6,-5],note:[-7,5],noteTitle:"Fungal Archivist",noteBody:"“Fungi remember where every tree once stood. They do not hurry, and they never forget.”",spawn:[-9,0]},{id:"saltworks",name:"The Bleached Saltworks",district:"MINERAL DISTRICT / 11",subtitle:"WHITE TERRACES OF BRINE",color:"#566668",sun:"#e3f3f7",description:"Blinding white crystalline flats and evaporation pans. Free the stuck brine pump.",objective:"Engage the brine pump",action:"Prime the brine pump",done:"Brine pump turning",message:"Clear brine trickles into the shallow crystallizers. Salt crystals shimmer in the sunlight.",landmark:[7,-4],note:[-6,4],noteTitle:"Salt Harvester’s Tablet",noteBody:"“The tide gives, the wind takes, and the salt remains. A clean basin makes clean bread.”",spawn:[-9,0]},{id:"rooftops",name:"The High Awnings",district:"SKYWARD DISTRICT / 12",subtitle:"WHERE WINDS GATHER",color:"#546370",sun:"#e6d8b8",description:"Wind-beaten scaffolding and catwalks overlooking the expanse. Free the anemometer array.",objective:"Free the anemometer array",action:"Align the wind vanes",done:"Wind array spinning",message:"The brass vanes catch the gusts and sing against the copper eaves. The city knows which way the wind blows.",landmark:[6,-5],note:[-5,5],noteTitle:"Roofkeeper’s Weather Log",noteBody:"“Up here, you feel the city breathing. The high wind is honest; it hides nothing.”",spawn:[-9,0]},{id:"mangrove",name:"The Brackish Basin",district:"ESTUARY DISTRICT / 13",subtitle:"ROOTS IN THE BRINE",color:"#44574c",sun:"#cde4cb",description:"Submerged brickwork laced with tangle roots and stilt boardwalks. Restore the tidal weir.",objective:"Clear the tidal weir",action:"Lower the timber weir",done:"Tidal weir secured",message:"The water slows behind the timber barrier. Small fish dart among the submerged brick columns.",landmark:[6,-4],note:[-6,5],noteTitle:"Estuary Keeper’s Marker",noteBody:"“The tide doesn’t care about our masonry, but the roots hold both together.”",spawn:[-9,0]},{id:"trestle",name:"The Overgrown Trestle",district:"CANOPY DISTRICT / 14",subtitle:"IRON IN THE BOUGHS",color:"#4e5a42",sun:"#dce6b6",description:"A massive iron railway viaduct gripped by ancient boughs. Restore the suspended maintenance crane.",objective:"Anchor the canopy crane",action:"Engage the hoist cable",done:"Canopy crane anchored",message:"Tension locks into the heavy iron cables. Kiln chirps as the suspension bridge stabilizes.",landmark:[7,-4],note:[-5,5],noteTitle:"Viaduct Inspector’s Plaque",noteBody:"“Steel will flex and timber will bend, but together they span the valley.”",spawn:[-9,0]},{id:"foundry",name:"The Rustfall Foundry",district:"SMELTING DISTRICT / 15",subtitle:"HEARTH OF SLAG AND ORE",color:"#4a3832",sun:"#f2a679",description:"Red iron dust and towering crucible furnaces. Ignite the pilot hearth.",objective:"Ignite the pilot hearth",action:"Spark the furnace igniter",done:"Pilot hearth glowing",message:"A warm orange glow spreads through the blast flue. Warmth returns to the cold cast iron.",landmark:[6,-4],note:[-6,5],noteTitle:"Foundry Master’s Inscription",noteBody:"“Cold iron forgets its shape until fire reminds it. Never let the pilot flame die completely.”",spawn:[-9,0]},{id:"frost-spire",name:"The Glacial Glasshouse",district:"ALPINE DISTRICT / 16",subtitle:"ABOVE THE CLOUD LINE",color:"#45596e",sun:"#d6ecff",description:"A fractured glass observatory battered by alpine frost. Clear the ice crystals from the solar collector.",objective:"Clear the solar collector",action:"Sweep the frost collector",done:"Solar collector cleared",message:"Sunlight catches the polished mirror facets. Warmth begins melting the frost along the rim.",landmark:[5,-5],note:[-6,5],noteTitle:"Alpine Observer’s Journal",noteBody:"“The cold is patient, but glass and copper remember the light. Keep looking upward.”",spawn:[-9,0]},{id:"delta",name:"The Reclaimed Marshes",district:"DELTA DISTRICT / 17",subtitle:"WHISPERS IN THE REEDS",color:"#525b45",sun:"#d9e0b2",description:"Shallow sandbars and cattail marshes woven through stranded barges. Realign the channel beacon.",objective:"Light the channel beacon",action:"Strike the marsh beacon",done:"Channel beacon lit",message:"A warm beacon reflects across the delta shallows, cutting through the twilight mist.",landmark:[7,-4],note:[-6,4],noteTitle:"Delta Boatman’s Note",noteBody:"“Follow the reeds when the silt shifts. Where water moves slowly, green things thrive.”",spawn:[-9,0]},{id:"archives",name:"The Paper Catacombs",district:"ARCHIVE DISTRICT / 18",subtitle:"WHISPERING VAULTS",color:"#48444a",sun:"#f5e4bd",description:"Stone shelves holding centuries of water-resistant parchment. Light the reading desk lamp.",objective:"Illuminate the study rotunda",action:"Turn the reading lamp switch",done:"Study rotunda illuminated",message:"A soft amber globe illuminates centuries of hand-bound volumes. The silence feels like peace.",landmark:[5,-4],note:[-6,5],noteTitle:"Chief Archivist’s Dedication",noteBody:"“Words outlive empires, provided someone keeps the rain from dripping on the ink.”",spawn:[-9,0]},{id:"kiln-terrace",name:"The Solar Kiln",district:"TERRACOTTA DISTRICT / 19",subtitle:"BAKED IN WARMTH",color:"#634b3e",sun:"#ffd09e",description:"Baked clay tiles and parabolic sun collectors. Align the solar concentrator.",objective:"Focus the solar concentrator",action:"Calibrate the focal mirror",done:"Concentrator focused",message:"A brilliant point of concentrated sunlight gleams against the terracotta kiln. Warmth radiates.",landmark:[6,-4],note:[-5,5],noteTitle:"Potter’s Credo",noteBody:"“Earth, water, and sun. With these three, a broken city can remake itself cup by cup.”",spawn:[-9,0]},{id:"theater",name:"The Orpheum",district:"CINEMA DISTRICT / 20",subtitle:"PICTURES IN THE DARK",color:"#3a3345",sun:"#e8c9a0",description:"A grand old cinema where the city gathers after dark. Queue a film, take a seat.",objective:"Restore power to the projector",action:"Restore the projector",done:"Projector humming",message:"The marquee blazes and the reel begins to turn. Take a seat — whatever plays here plays for everyone.",landmark:[8,-6],note:[-6,7.2],noteTitle:"The Orpheum’s house rules",noteBody:"“Anyone may change the picture. No one owns the screen. Leave the aisle lamps burning for whoever comes next.”",spawn:[-9,0]}],yd=new hn(1,1,1),Fa=new Map;function Tn(i,e=null,t=0){const n=`${i}_${e||""}_${t}`;return Fa.has(n)||Fa.set(n,new et({color:i,roughness:.62,metalness:.2,emissive:e||"#000000",emissiveIntensity:t})),Fa.get(n)}function wn(i,e,t,n,s,r,a,o,l=0,c=0){const d=new re(yd,o);return d.position.set(e,t,n),d.scale.set(s,r,a),d.rotation.z=l,d.rotation.y=c,d.castShadow=d.receiveShadow=!0,i.add(d),d}function H0(i,e){const{group:t,items:n,animated:s}=e,r=F0.filter(l=>l.district===i.id);if(r.length===0)return null;const a=new _t;return a.name="dynamic",t.add(a),{visuals:r.map((l,c)=>{const d=ol[l.material],[u,f]=l.position,p=new _t;p.position.set(u,0,f),a.add(p),wn(p,0,.12,0,1.15,.24,1.15,Tn("#3d4547"));const g=new _t;p.add(g),l.material==="copper"?(wn(g,-.18,.34,.1,.42,.34,.42,Tn(d.color),0,.4),wn(g,.22,.3,-.14,.34,.26,.34,Tn("#a8663a"),.2,-.5),wn(g,.05,.54,.02,.2,.22,.2,Tn("#d18b52"),-.3,.9)):l.material==="timber"?(wn(g,0,.36,.05,1.05,.26,.3,Tn(d.color),0,.18),wn(g,.06,.6,-.04,.95,.24,.28,Tn("#8a6842"),0,-.32),wn(g,-.05,.8,.02,.6,.2,.24,Tn("#6b4e30"),0,.62)):(wn(g,-.16,.4,.08,.16,.5,.4,Tn(d.color),.12,.3),wn(g,.18,.36,-.1,.14,.44,.34,Tn("#b8d8e8"),-.1,-.6),wn(g,.02,.52,.12,.12,.62,.3,Tn("#cfe4f0"),.05,1.1));const x=new et({color:d.glowColor,emissive:d.glowColor,emissiveIntensity:1.2}),m=new re(yd,x);m.scale.set(.12,.12,.12),m.position.y=.95,p.add(m);const h={type:"material_node",nodeId:l.id,material:l.material,x:u,z:f,title:`${d.name} cache`,sub:"Press E to gather materials"};n.push(h);const E={def:l,nodeGroup:p,rich:g,spark:m,sparkMat:x,item:h,depleted:!1,phase:c*1.7};return s.push(b=>{m.position.y=.95+Math.sin(b*2+E.phase)*.07,m.rotation.y=b*.8+E.phase,x.emissiveIntensity=1.1+Math.sin(b*2.6+E.phase)*.35}),E}),dynamic:a}}function z0(i,e){i.depleted=!e.available,i.rich.visible=e.available,i.spark.visible=e.available,i.item&&(i.item.sub=e.available?"Press E to gather materials":"Picked clean — it will regrow in time")}function Ic(i){return{current:Vt.some(e=>e.id===i?.current)?i.current:"court",visited:[...new Set(["court",...Array.isArray(i?.visited)?i.visited.filter(e=>Vt.some(t=>t.id===e)):[]])],completed:[...new Set(Array.isArray(i?.completed)?i.completed.filter(e=>Vt.slice(1).some(t=>t.id===e)):[])]}}function V0(i){const{group:e,block:t,box:n,glow:s,material:r,colors:a,random:o,animated:l,geometry:c}=i;n(0,.17,0,5.8,.08,21,"#143c46");const d=new re(new fn(5.6,20.8),new et({color:"#367c88",transparent:!0,opacity:.8,roughness:.13,metalness:.65}));d.rotation.x=-Math.PI/2,d.position.y=.23,e.add(d);for(const p of[-6.15,6.65])t(0,p,5.5,p<0?8.5:7.5);n(0,.21,0,7,.2,3.8,"#8b8d77");for(let p=-3.5;p<4;p+=.6){n(p,.34,0,.54,.09,3.7,"#6d807d");for(const g of[-1.85,1.85])n(p,.85,g,.08,1.1,.08,a.brass)}for(const p of[-1.85,1.85])n(0,1.4,p,7.5,.09,.09,a.brass);for(let p=-9;p<10;p+=.65)for(const g of[-3.1,3.1])n(g,.45,p,.35,.55,.6,"#a6a28b");for(const p of[-8,8]){n(p,1.2,-8,3,2.4,2.2,a.dark),t(p,-8,3,2.2);for(let g=0;g<6;g++)n(p,.5+g*.28,-6.86,2.5,.08,.1,a.brass);n(p,3,-8,.5,2,.5,a.brass)}for(let p=-9;p<10;p+=1.5){const g=s((o()-.5)*4,.245,p,1+o(),.015,.045,"#72b7bd",.35);l.push(x=>{g.position.x=Math.sin(x*.45+p)*1.2})}const u=new _t;u.position.set(7,1.6,-5);const f=new re(new il(.55,.07,6,24),r("#c0995d"));u.add(f);for(let p=0;p<6;p++){const g=new re(c,r("#c0995d"));g.scale.set(.95,.055,.07),g.rotation.z=p*Math.PI/3,u.add(g)}e.add(u),l.push((p,g)=>{u.rotation.z=g?p*.4:0})}function G0(i){const{group:e,block:t,box:n,glow:s,random:r,animated:a}=i,o=new et({color:"#b7d9b3",transparent:!0,opacity:.13,metalness:.1,roughness:.3,depthWrite:!1,side:Jt});for(const l of[-1,7])for(let c=-9;c<=-2;c+=1.4)n(l,2.1,c,.1,4.2,.1,"#789184");for(let l=-9;l<=-2;l+=1.4){const c=n(1,4.8,l,4.5,.12,.12,"#96a58b");c.rotation.z=.35;const d=n(5,4.8,l,4.5,.12,.12,"#96a58b");d.rotation.z=-.35}for(const l of[1,5]){const c=n(l,4.8,-5.5,4.25,.03,7.4);c.material=o,c.rotation.z=l===1?.35:-.35}for(const[l,c,d,u]of[[-6,-5,3,5],[3,3.5,5,2],[8,6,2,4]]){n(l,.35,c,d,.6,u,"#9b9270"),n(l,.68,c,d-.2,.1,u-.2,"#414b32"),t(l,c,d,u);for(let f=0;f<50;f++){const p=l+(r()-.5)*(d-.4),g=c+(r()-.5)*(u-.4),x=.4+r()*.7;n(p,.7+x/2,g,.045,x,.045,"#627347");const m=n(p,.8+x,g,.3,.12,.45,["#779455","#94a86a","#536f42"][f%3]);m.rotation.z=r(),f%8===0&&n(p,1+x,g,.16,.14,.16,"#d2b28a")}}for(const l of[-9,9]){n(l,1.1,-7,.35,2.2,.35,"#6b5942"),t(l,-7,1.5,1.5);for(let c=0;c<25;c++)n(l+(r()-.5)*2.5,2+r()*1.7,-7+(r()-.5)*2,.7,.5,.7,["#667c49","#819258","#4e6b47"][c%3])}n(4,.75,-5,2,1.4,1.2,"#a09776"),t(4,-5,2,1.2);for(let l=0;l<6;l++){const c=s(3.3+l*.28,1.55,-5,.1,.18,.2,"#b7ce86",.5);a.push((d,u)=>{c.material.emissiveIntensity=u?1.8+Math.sin(d+l)*.25:.3,c.scale.y=u?.35:.18})}}function W0(i){const{group:e,block:t,box:n,glow:s,material:r,colors:a,animated:o}=i;for(const c of[-5,-7])n(0,.25,c,23,.12,.12,"#9aa5a2");for(let c=-11;c<12;c+=.8)n(c,.17,-6,.24,.16,3.5,"#67584a");n(1,1.65,-6,8,2.7,2.6,"#485e62"),t(1,-6,8,2.6),n(1,3.15,-6,8.4,.3,2.8,"#9b9c87"),n(1,.75,-4.66,8,.27,.08,a.brass);for(let c=-2;c<5;c+=1.25)s(c,2.15,-4.66,.85,.95,.04,"#f3ce89",.5),n(c,2.15,-4.61,.045,.95,.05,a.dark);for(const c of[-2,4])for(const d of[-7.1,-4.9]){const u=new re(new ai(.45,.45,.2,12),r("#23363c"));u.rotation.x=Math.PI/2,u.position.set(c,.55,d),e.add(u)}for(const c of[-8,8])n(c,1.85,-2,.18,3.7,.18,a.brass),t(c,-2,.2,.2);n(0,3.8,-2,18,.22,2.4,"#35494f");for(const c of[-5,1]){n(c,.65,3,2.8,.16,.7,"#9b8966"),n(c,1.15,3.35,2.8,.75,.12,"#9b8966");for(const d of[-1,1])n(c+d,.3,3,.12,.6,.6,a.dark);t(c,3,2.8,.9)}n(7,2.3,5,.18,4.6,.18,a.dark),t(7,5,.3,.3);const l=s(7,4.7,5,.7,.65,.7,"#e2b67b",.2);o.push((c,d)=>{l.material.emissiveIntensity=d?2+Math.sin(c*2):.2})}function X0(i){const{group:e,block:t,box:n,glow:s,colors:r,animated:a}=i;for(const c of[-7,-2,3,8])n(c,2.5,-6.5,1.2,5,1.2,"#3b4b4e"),t(c,-6.5,1.2,1.2),n(c,5.2,-6.5,3.6,.6,1.4,"#495f63");n(0,.18,-6.5,22,.12,2,"#182b2e");const o=new re(new fn(21.8,1.8),new et({color:"#2a555e",transparent:!0,opacity:.82,roughness:.15,metalness:.6}));o.rotation.x=-Math.PI/2,o.position.set(0,.24,-6.5),e.add(o),n(6,1.4,-4,2,2.8,1.4,r.dark),t(6,-4,2,1.4);const l=n(6,.8,-3.2,1.2,1.4,.2,r.brass);a.push((c,d)=>{l.position.y=d?1.5+Math.sin(c*.5)*.05:.8});for(const c of[-6,0])n(c,.6,6,2.5,1.2,1.8,"#34474a"),t(c,6,2.5,1.8),n(c,1.3,6,2.2,.2,.2,r.brass)}function q0(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const[o,l,c,d]of[[-7,-6,3.2,2.6],[-1,-7,2.8,2.2],[8,-7,3,2.4],[-8,6.5,3,2.5],[2,6.5,3.5,2.2]])t(o,1.1,l,c,2.2,d,"#252528"),e(o,l,c,d),t(o,2.3,l,c*.7,.6,d*.7,"#383230"),n(o,2.65,l,c*.35,.1,d*.35,"#f5a438",1.2);t(5,1.2,-4,2.2,2.4,1.6,s.dark),e(5,-4,2.2,1.6);const a=n(5,2.5,-4,.7,.7,.7,"#f7aa74",.8);r.push((o,l)=>{a.material.emissiveIntensity=l?2.5+Math.sin(o*3)*.5:.6,a.rotation.y=l?o*1.5:0})}function Y0(i){const{block:e,box:t,glow:n,random:s,animated:r}=i;for(const[o,l,c,d]of[[-7,-6,2.8,2.5],[1,-6.5,3.5,2.2],[-7,6,2.5,2.5],[3,6,3,2]]){t(o,.9,l,c,1.8,d,"#2d271e"),e(o,l,c,d);for(let u=0;u<3;u++){const f=1.2+u*.6;t(o+(u%2===0?.6:-.6),f,l,1.8,.15,1.4,"#5e4334");const p=n(o+(u%2===0?.6:-.6),f+.1,l,1.2,.08,.9,"#7ee8b0",.4);r.push((g,x)=>{p.material.emissiveIntensity=x?1.8+Math.sin(g*2+u)*.4:.4})}}t(6,.8,-5,2,1.6,1.8,"#322d25"),e(6,-5,2,1.8);const a=n(6,1.8,-5,.8,.8,.8,"#85f5bc",.5);r.push((o,l)=>{a.material.emissiveIntensity=l?2.8+Math.sin(o*2.5)*.6:.5,a.scale.setScalar(l?1+Math.sin(o*3)*.08:1)})}function $0(i){const{group:e,block:t,box:n,glow:s,colors:r,animated:a}=i;for(let l=-8;l<=4;l+=3.5){n(l,.28,-6.5,3.2,.3,2.5,"#9ea8ab"),t(l,-6.5,3.2,2.5);const c=new re(new fn(2.8,2.1),new et({color:"#7cd4e2",transparent:!0,opacity:.75,roughness:.1}));c.rotation.x=-Math.PI/2,c.position.set(l,.45,-6.5),e.add(c),n(l,.48,-6.5,1.2,.08,1,"#f0f6f7")}for(const l of[-6,0]){n(l,1.2,6,3,2.4,1.4,"#7a6a57"),t(l,6,3,1.4);for(let c=.5;c<2.2;c+=.5)n(l,c,6,2.8,.08,1.2,"#ded7cb")}n(7,1.2,-4,1.8,2.4,1.8,r.dark),t(7,-4,1.8,1.8);const o=n(7,2.7,-4,.3,.25,2.2,r.brass);a.push((l,c)=>{o.rotation.x=c?Math.sin(l*3)*.2:0})}function K0(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-8,-2,4])t(o,1.8,-6.5,4.5,3.2,2.6,"#48555e"),e(o,-6.5,4.5,2.6),t(o,3.5,-6.5,4.8,.2,2.8,"#70828c"),t(o,4.2,-6.5,.15,1.2,.15,s.brass);for(const o of[-6,1])t(o,.9,6,3.8,1.8,1.6,"#6b5845"),e(o,6,3.8,1.6),t(o,1.9,5.3,3.8,.8,.08,s.brass);t(6,1.8,-5,.3,3.6,.3,s.dark),e(6,-5,.8,.8);const a=n(6,3.7,-5,1.4,.12,.12,"#e6c883",1.2);r.push((o,l)=>{a.rotation.y=l?o*4.5:o*.4})}function Z0(i){const{group:e,block:t,box:n,colors:s,animated:r}=i,a=new re(new fn(23,8),new et({color:"#254238",transparent:!0,opacity:.8,roughness:.2}));a.rotation.x=-Math.PI/2,a.position.set(0,.22,-6),e.add(a);for(const[l,c]of[[-8,-6],[-2,-6.5],[3,-6.5]]){n(l,1.2,c,2.4,2.4,2.2,"#3d3226"),t(l,c,2.4,2.2);for(let d=0;d<4;d++){const u=n(l+(d-1.5)*.5,.8,c,.18,1.6,.18,"#4f4030");u.rotation.z=(d-1.5)*.3}}for(const l of[-5,2])n(l,.8,6,3.2,1.6,2,"#485244"),t(l,6,3.2,2);n(6,1.4,-4,2,2.8,1.4,s.dark),t(6,-4,2,1.4);const o=n(6,1.8,-3.2,1.4,1.6,.2,"#7a5a3a");r.push((l,c)=>{o.position.y=c?.8:1.8+Math.sin(l)*.05})}function j0(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-8,-2,4])t(o,2.2,-6.5,1.2,4.4,1.2,"#5e3428"),e(o,-6.5,1.2,1.2);t(0,4.5,-6.5,22,.5,1.6,"#3a2018");for(let o=-10;o<=10;o+=1.2)t(o,4.8,-6.5,.3,.2,2.2,"#483c34");for(const o of[-6,0])t(o,.9,6,3.4,1.8,1.8,"#443b35"),e(o,6,3.4,1.8);t(7,2,-4,.4,4,.4,s.dark),e(7,-4,1,1),t(7,4.1,-4,1.8,.3,.3,s.brass);const a=n(7.6,3.2,-4,.08,1.6,.08,"#d9bf82",.6);r.push((o,l)=>{a.rotation.z=l?0:Math.sin(o*1.5)*.06})}function J0(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-7,-1])t(o,2.4,-6.5,3.5,4.8,2.8,"#2d2d33"),e(o,-6.5,3.5,2.8),t(o,4.9,-6.5,2,1.2,2,"#45454d"),n(o,1.1,-5,1.4,.8,.2,"#ff6622",1.8);for(const o of[-6,1])t(o,.7,6,3.6,1.4,1.8,"#3c2b28"),e(o,6,3.6,1.8),n(o,.8,6,2.8,.1,.8,"#8c3d23",.4);t(6,1.1,-4,2.2,2.2,2.2,s.dark),e(6,-4,2.2,2.2);const a=n(6,1.8,-4,1.2,.8,1.2,"#ff8033",.5);r.push((o,l)=>{a.material.emissiveIntensity=l?2.8+Math.sin(o*5)*.4:.5})}function Q0(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-8,-2,4])t(o,2.6,-6.5,.35,5.2,.35,"#627585"),e(o,-6.5,1,1),t(o,5.1,-6.5,3.8,.2,.2,"#8ea3b5");for(const o of[-6,0])t(o,1,6,3.2,2,2,"#667480"),e(o,6,3.2,2),t(o,2.05,6,2.8,.12,1.6,"#d8e5ed");t(5,1.4,-5,1.6,2.8,1.6,s.dark),e(5,-5,1.6,1.6);const a=n(5,3,-5,1.4,1.4,.2,"#cce6f5",1.2);r.push((o,l)=>{a.material.emissiveIntensity=l?2.6+Math.sin(o*2)*.4:.6,a.rotation.y=l?o*.5:0})}function e_(i){const{group:e,block:t,box:n,glow:s,colors:r,animated:a}=i,o=new re(new fn(22,5.5),new et({color:"#2d4345",transparent:!0,opacity:.8,roughness:.2}));o.rotation.x=-Math.PI/2,o.position.set(0,.22,-6.5),e.add(o),n(-4,.8,-6.5,5.5,1.4,2.2,"#483e32"),t(-4,-6.5,5.5,2.2);for(const c of[-6,0])n(c,.7,6,3.4,1.4,1.8,"#594d3f"),t(c,6,3.4,1.8);n(7,2,-4,.4,4,.4,r.dark),t(7,-4,1,1),n(7,4.1,-4,1.2,.2,1.2,r.brass);const l=s(7,4.5,-4,.7,.7,.7,"#e8ca76",.4);a.push((c,d)=>{l.material.emissiveIntensity=d?2.8+Math.sin(c*2)*.5:.4})}function t_(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-8,-2,4]){t(o,2.5,-6.5,3.6,5,1.6,"#35363b"),e(o,-6.5,3.6,1.6);for(let l=1;l<4.8;l+=.9){t(o,l,-5.6,3.2,.06,.2,s.brass);for(let c=-1.3;c<1.4;c+=.45)t(o+c,l+.35,-5.6,.35,.65,.15,["#574636","#6e5643","#434739"][c*10%3>>>0])}}for(const o of[-6,1])t(o,.8,6,3.2,1.6,1.8,"#524335"),e(o,6,3.2,1.8),t(o,1.65,6,2.8,.1,1.4,"#7a6652");t(5,1.1,-4,1.6,2.2,1.6,"#42372c"),e(5,-4,1.6,1.6),t(5,2.3,-4,.1,.6,.1,s.brass);const a=n(5,2.8,-4,.6,.6,.6,"#ffd580",.3);r.push((o,l)=>{a.material.emissiveIntensity=l?2.5+Math.sin(o*1.5)*.2:.3})}function n_(i){const{block:e,box:t,glow:n,colors:s,animated:r}=i;for(const o of[-7,-1])t(o,1.8,-6.5,3.4,3.6,2.8,"#8c4832"),e(o,-6.5,3.4,2.8),t(o,3.8,-6.5,2,.8,1.8,"#aa583e"),n(o,1.2,-5,.8,.8,.2,"#ffaa44",.6);for(const o of[-6,1]){t(o,.8,6,3.2,1.6,1.8,"#9c5a43"),e(o,6,3.2,1.8);for(let l=-1;l<=1;l+=.8)t(o+l,1.8,6,.45,.6,.45,"#bd6b51")}t(6,1.2,-4,1.8,2.4,1.8,s.dark),e(6,-4,1.8,1.8);const a=n(6,2.7,-4,1.4,1.4,.18,"#ffe0a0",.6);r.push((o,l)=>{a.rotation.x=l?Math.sin(o*.4)*.2:0,a.material.emissiveIntensity=l?2.8+Math.sin(o*2)*.4:.6})}function i_(i){const{group:e,block:t,box:n,glow:s,lamp:r,random:a}=i;for(const[l,c]of[[-4,-4],[4,3]]){n(l,.45,c,2.6,.12,.8,"#5d6658"),t(l,c,2.6,.8),n(l,.85,c+.42,2.6,.55,.1,"#5d6658");for(const d of[-1.05,1.05])n(l+d,.2,c,.12,.45,.7,"#3d463f")}r(-7,6);for(const[l,c,d,u]of[[-2,2,2.2,1.4],[5,-2,1.6,2.4],[-6,-1,1.3,1.1]]){const f=new re(new fn(d,u),new et({color:"#367c88",transparent:!0,opacity:.5,roughness:.12,metalness:.6}));f.rotation.x=-Math.PI/2,f.position.set(l,.17,c),e.add(f)}const o=["#58734c","#47603f","#6b8156"];for(const l of[-8.5,8])for(let c=0;c<5;c++)n(l+(a()-.5)*1.2,1+c*.5,-10.1,1.5,.42,.45,o[c%3]);for(const[l,c]of[[-9,3.6],[3,4.5],[7.5,3.2]])s(l,c,-10.96,.5,.8,.05,"#e8b06a",.6)}const s_={court:i_,canal:V0,garden:G0,station:W0,aqueduct:X0,caldera:q0,understory:Y0,saltworks:$0,rooftops:K0,mangrove:Z0,trestle:j0,foundry:J0,"frost-spire":Q0,delta:e_,archives:t_,"kiln-terrace":n_,theater:k0};function r_(i,e=!1){const t=new _t;t.name=i.id;const n=[],s=[],r=[],a=new hn(1,1,1),o={stone:"#6b776c",dark:"#233c3e",brass:"#b78d50",green:"#58734c"},l=new Map,c=_=>(l.has(_)||l.set(_,new et({color:_,roughness:.62,metalness:.2})),l.get(_));function d(_,v,A,N,X,O,k=o.stone){const U=new re(a,c(k));return U.position.set(_,v,A),U.scale.set(N,X,O),U.castShadow=U.receiveShadow=!0,t.add(U),U}function u(_,v,A,N){n.push({x:_,z:v,w:A/2+.38,d:N/2+.38})}function f(_,v,A,N,X,O,k,U=1.5){const q=d(_,v,A,N,X,O,k);return q.material=new et({color:k,emissive:k,emissiveIntensity:U}),q}function p(_,v,A="#ffcb79"){d(_,1.8,v,.12,3.6,.12,o.dark),f(_,3.6,v,.35,.5,.35,A,2),d(_,3.92,v,.6,.12,.6,o.dark);const N=new rl(A,7,7,2);N.position.set(_,3.4,v),t.add(N),u(_,v,.25,.25)}let g=Vt.indexOf(i)*37;function x(){return g=g*1664525+1013904223>>>0,g/4294967296}d(0,-.55,0,25,1,22,"#263638");for(let _=-12;_<12;_++)for(let v=-10;v<11;v++){const A=i.id==="garden"?["#7b816a","#8b8b70","#64745e"]:["#586b6d","#657373","#475b61"];d(_+.5,.06,v+.5,.96,.15,.96,A[Math.floor(x()*3)])}for(let _=-12;_<=12;_+=.8)for(let v=.4;v<3;v+=.4)d(_,v,-10.5,.76,.37,.65,v>2.6?"#a0a18a":"#4d6561");for(let _=-10;_<11;_+=.8)for(const v of[-12,12])Math.abs(_)<2||(d(v,.65,_,.5,1.3,.76,o.dark),d(v,1.35,_,.7,.15,.78,o.stone));for(const _ of[-9,-3,3,9]){d(_,4,-13,5,8,4,"#2b4145");for(let v=-1.5;v<2;v+=1)for(let A=3;A<7;A+=1.5)f(_+v,A,-10.96,.45,.7,.04,"#91b4ab",.25)}p(-10,-7),p(10,8);const m=s_[i.id];if(!m)throw new Error(`Unknown district id: ${i.id}`);const h={group:t,obstacles:n,items:s,animated:r,geometry:a,colors:o,material:c,box:d,block:u,glow:f,lamp:p,random:x,def:i,completed:e};m(h);let E=null,b=null;if(i.note){const[_,v]=i.note;d(_,.6,v,.8,1.2,.6,o.dark),u(_,v,.8,.6),f(_,1.24,v,.5,.035,.4,"#d4c9a1",.4),s.push({type:"field-note",x:_,z:v,title:"Read the field note",sub:i.noteTitle,body:i.noteBody})}if(i.landmark){const[_,v]=i.landmark;E=f(_,2.5,v,.13,.13,.13,"#ffe0a0",2),b=new re(new zs(.8,.84,32),new cs({color:"#e7c889",side:Jt,transparent:!0,opacity:.65})),b.rotation.x=-Math.PI/2,b.position.set(_,.25,v),t.add(b),s.push({type:"landmark",x:_,z:v,title:i.action,sub:"A small act of restoration"})}const S=H0(i,{group:t,items:s,animated:r});function R(_){if(!(!S||!Array.isArray(_)))for(const v of _){const A=S.visuals.find(N=>N.def.id===v.nodeId);A&&z0(A,v)}}function w(_,v){E&&(E.position.y=2.5+Math.sin(_*2)*.12,E.material.emissive.set(v?"#93e9b6":"#ffe0a0")),b&&b.material.color.set(v?"#93e9b6":"#e7c889"),r.forEach(A=>A(_,v))}w(0,e);const P=t.children.filter(_=>_.isMesh&&_.geometry===a&&!_.material.transparent&&_.material.emissive?.getHex()===0),I=new Qo(a,new et({color:"#ffffff",roughness:.62,metalness:.2}),P.length);return P.forEach((_,v)=>{_.updateMatrix(),I.setMatrixAt(v,_.matrix),I.setColorAt(v,_.material.color),t.remove(_)}),I.castShadow=I.receiveShadow=!0,t.add(I),{group:t,obstacles:n,items:s,update:w,setNodeStates:R,screenQuad:h.screenQuad||null}}const yr={market:{id:"market",minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3,spawn:[0,3],exitGarden:[10.7,0]},garden:{id:"garden",minX:-11.5,maxX:11.5,minZ:-10,maxZ:10.5,spawn:[-9.5,0],exitMarket:[-10.7,0]}};function Dr(i){return!i||i==="market"?yr.market:i.startsWith("garden:")||i==="garden"?yr.garden:yr[i]?yr[i]:{id:i,minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3,spawn:[-9,0],exitWest:[-10.7,0],exitEast:[10.7,0]}}function zr(i,e,t,n){if(t<=i.minX||t>=i.maxX||n<=i.minZ||n>=i.maxZ)return!1;for(let s=0;s<e.length;s++){const r=e[s];if(Math.abs(t-r.x)<r.w&&Math.abs(n-r.z)<r.d)return!1}return!0}function a_(i,e,t){return{x:Math.max(i.minX+.35,Math.min(i.maxX-.35,e)),z:Math.max(i.minZ+.35,Math.min(i.maxZ-.35,t))}}function o_(i,e,t,n={x:24,y:24,w:106,h:72}){const s=(e-i.minX)/(i.maxX-i.minX),r=(t-i.minZ)/(i.maxZ-i.minZ);return{cx:n.x+Math.max(0,Math.min(1,s))*n.w,cy:n.y+Math.max(0,Math.min(1,r))*n.h}}function l_(i){return un[i]||xi[i]||null}function c_(i,e="B",t=1){const n=l_(i);if(!n)return 0;const s=L0[e]??1;return Math.max(1,Math.round(n.basePrice*t*s*.85))}function d_(i,e=1){const t=un[i];if(!t)return 0;const n=1+(e-1)*.4;return Math.max(1,Math.round(t.seedCost*n))}class u_{constructor(e,t={}){this.client=e,this.onAction=t,this.selectedCropId="radish",this.activeTool="hands",this.selectedSeed="radish",this.lastMachines={mill:{status:"broken",required:{...Md},contributed:{copper:0,timber:0,glass:0},restoredAt:null}},this.initDOM()}initDOM(){this.createMarketDialog(),this.createSeedDialog(),this.createContractDialog(),this.createInventoryDialog(),this.createProfileDialog(),this.createMachineShopDialog(),this.setupEventListeners()}createMarketDialog(){const e=document.createElement("dialog");e.id="market-dialog",e.className="game-modal",e.innerHTML=`
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
    `,document.body.append(e)}setupEventListeners(){const e=document.getElementById("market-crop-tabs");e.innerHTML="";const t=[...Fo,...N0];for(const n of t){const s=document.createElement("button");s.className=`crop-tab ${n.id===this.selectedCropId?"active":""}`,s.textContent=n.name,s.onclick=()=>{this.selectedCropId=n.id,document.querySelectorAll(".crop-tab").forEach(r=>r.classList.remove("active")),s.classList.add("active"),this.updateMarketView()},e.append(s)}document.querySelectorAll("#sell-quality-selector button").forEach(n=>{n.onclick=()=>{document.querySelectorAll("#sell-quality-selector button").forEach(s=>s.classList.remove("active")),n.classList.add("active"),this.updateMarketView()}}),document.getElementById("btn-instant-sell").onclick=()=>{const n=!!xi[this.selectedCropId],s=document.querySelector("#sell-quality-selector button.active"),r=n?"B":s?s.dataset.qual:"B",a=parseInt(document.getElementById("sell-qty-input").value,10)||1;this.client.sendMarketSell(this.selectedCropId,r,a)},document.getElementById("btn-create-order").onclick=()=>{const n=document.getElementById("order-side").value,s=parseFloat(document.getElementById("order-price").value)||10,r=parseInt(document.getElementById("order-qty").value,10)||1;this.client.sendOrderPlace(n,this.selectedCropId,s,r,"B")},document.getElementById("close-market").onclick=()=>document.getElementById("market-dialog").close(),document.getElementById("close-seed-dialog").onclick=()=>document.getElementById("seed-dialog").close(),document.getElementById("close-contracts").onclick=()=>document.getElementById("contract-dialog").close(),document.getElementById("close-inventory").onclick=()=>document.getElementById("inventory-dialog").close(),document.getElementById("close-profile").onclick=()=>document.getElementById("profile-dialog").close(),document.getElementById("close-machine-shop").onclick=()=>document.getElementById("machine-shop-dialog").close(),document.getElementById("btn-save-nickname").onclick=()=>{const n=document.getElementById("profile-nick-input").value.trim();n&&(this.client.setNickname(n),document.getElementById("profile-dialog").close())}}openMarket(){this.updateMarketView(),document.getElementById("market-dialog").showModal()}openSeedVendor(){this.updateSeedVendorView(),document.getElementById("seed-dialog").showModal()}openContracts(){this.updateContractsView(),document.getElementById("contract-dialog").showModal()}openInventory(){this.updateInventoryView(),document.getElementById("inventory-dialog").showModal()}openProfile(){document.getElementById("profile-nick-input").value=this.client.nickname,document.getElementById("profile-dialog").showModal()}updateMachineShopView(e=null){e&&(this.lastMachines=e);const t=this.lastMachines?.mill,n=document.getElementById("mill-progress-summary"),s=document.getElementById("mill-material-rows"),r=document.getElementById("mill-flour-box"),a=document.getElementById("sprinkler-craft-box");if(!n||!s||!t)return;const o=this.lastPlayer,l=o?.materials||{};if(t.status==="restored")n.innerHTML=`
        <strong class="mill-restored-line">✦ The Great Mill is turning.</strong>
        <p>Restored by the community. It grinds wheat into flour for everyone, permanently.</p>
      `,s.innerHTML="";else{let p=0,g=0,x="";for(const m of Pc){const h=t.required?.[m.id]||0,E=Math.min(t.contributed?.[m.id]||0,h);p+=E,g+=h;const b=l[m.id]||0,S=h-E,R=b>0&&S>0?`<button class="btn-contribute" data-material="${m.id}" data-qty="1">Give 1</button>
             <button class="btn-contribute" data-material="${m.id}" data-qty="${Math.min(b,S)}">Give all</button>`:"";x+=`
          <div class="mill-material-row">
            <span class="mill-mat-name">${m.name}</span>
            <span class="mill-mat-count">${E} / ${h}</span>
            <span class="mill-mat-held">satchel: ${b}</span>
            ${R}
          </div>`}n.innerHTML=`
        <strong>The Great Mill is broken.</strong>
        <p>Community restoration: ${p} / ${g} materials delivered.</p>
      `,s.innerHTML=x}if(s.querySelectorAll(".btn-contribute").forEach(p=>{p.onclick=()=>{this.client.send(Ne.MACHINE_CONTRIBUTE,{actionId:this.nextActionId(),material:p.dataset.material,quantity:parseInt(p.dataset.qty,10)||1})}}),t.status==="restored"){const g=["C","B","A","A+"].reduce((h,E)=>h+(o?.inventory?.produce?.[`wheat_${E}`]||0),0),x=o?.inventory?.produce?.flour_B||0;r.innerHTML=`
        <div class="micro">MILLING · WHEAT → FLOUR (1:1)</div>
        <p class="machine-hint">Wheat in satchel: ${g} · Flour: ${x}</p>
        <div class="order-form-row">
          <input type="number" id="mill-qty-input" min="1" max="99" value="1">
          <button id="btn-mill-flour" class="action-btn"${g<=0?" disabled":""}>Mill Flour</button>
        </div>
      `;const m=r.querySelector("#btn-mill-flour");m&&(m.onclick=()=>{const h=parseInt(document.getElementById("mill-qty-input").value,10)||1;this.client.send(Ne.MACHINE_MILL,{actionId:this.nextActionId(),quantity:h})})}else r.innerHTML=`
        <div class="micro">MILLING</div>
        <p class="machine-hint">The millstones wait. Restore the mill to grind wheat into flour.</p>
      `;const c=Object.entries(Yi.cost).map(([p,g])=>`${g}× ${ol[p].name}`).join(" + "),d=Object.entries(Yi.cost).map(([p,g])=>`${l[p]||0}/${g}`).join(" · "),u=Object.entries(Yi.cost).every(([p,g])=>(l[p]||0)>=g);a.innerHTML=`
      <div class="micro">CRAFT · ${Yi.name}</div>
      <p class="machine-hint">Cost: ${c}. Keeps covered beds watered on their own. (satchel: ${d})</p>
      <button id="btn-craft-sprinkler" class="action-btn"${u?"":" disabled"}>Craft Sprinkler Kit</button>
    `;const f=a.querySelector("#btn-craft-sprinkler");f&&(f.onclick=()=>{this.client.send(Ne.MACHINE_CRAFT,{actionId:this.nextActionId(),fixture:Yi.id})})}nextActionId(){return`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`}updateMarketView(e=null,t=null){e&&(this.lastPrices=e),t&&(this.lastOrderBook=t);const n=un[this.selectedCropId]||xi[this.selectedCropId];if(!n)return;const s=!!xi[this.selectedCropId];document.getElementById("spot-crop-name").textContent=n.name,document.getElementById("spot-crop-tagline").textContent=n.tagline;const r=this.lastPrices?this.lastPrices[n.id]:null,a=r?r.multiplier:1,o=document.querySelector("#sell-quality-selector button.active"),l=s?"B":o?o.dataset.qual:"B",c=c_(n.id,l,a);document.getElementById("spot-instant-bid").textContent=`${c} ⛁`,document.getElementById("spot-base-price").textContent=`${n.basePrice} ⛁`,document.getElementById("spot-multiplier").textContent=`${a.toFixed(2)}x`;const d=this.lastPlayer;let u=0;d&&d.inventory&&d.inventory.produce&&(u=d.inventory.produce[`${n.id}_${l}`]||0),document.getElementById("sell-owned-qty").textContent=u;const f=document.getElementById("orderbook-asks"),p=document.getElementById("orderbook-bids");if(f.innerHTML="",p.innerHTML="",this.lastOrderBook){const g=this.lastOrderBook.asks?.filter(m=>m.cropId===n.id)||[],x=this.lastOrderBook.bids?.filter(m=>m.cropId===n.id)||[];if(g.length===0)f.innerHTML='<div class="empty-book">No active asks</div>';else for(const m of g){const h=document.createElement("div");h.className="book-row ask-row",h.innerHTML=`<span>${m.quantity}x</span> <strong>${m.price} ⛁</strong>`,f.append(h)}if(x.length===0)p.innerHTML='<div class="empty-book">No active bids</div>';else for(const m of x){const h=document.createElement("div");h.className="book-row bid-row",h.innerHTML=`<span>${m.quantity}x</span> <strong>${m.price} ⛁</strong>`,p.append(h)}}}updateSeedVendorView(){const e=document.getElementById("seed-catalog-list");e.innerHTML="";for(const t of Fo){const n=document.createElement("div");n.className="seed-card panel";const s=this.lastPrices&&this.lastPrices[t.id]?this.lastPrices[t.id].multiplier:1,r=d_(t.id,s);n.innerHTML=`
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
      `,r.querySelector(".btn-fulfill-contract").onclick=()=>{this.client.sendContractComplete(s.id)},t.append(r)}}updateInventoryView(e=null){e&&(this.lastPlayer=e);const t=document.getElementById("inv-seeds-list"),n=document.getElementById("inv-produce-list"),s=document.getElementById("inv-materials-list");t.innerHTML="",n.innerHTML="",s.innerHTML="";const r=this.lastPlayer;if(!r||!r.inventory)return;const a=r.inventory.seeds||{},o=Object.entries(a).filter(([p,g])=>g>0);if(o.length===0)t.innerHTML='<div class="empty-msg">No seeds in satchel</div>';else for(const[p,g]of o){const x=un[p],m=document.createElement("div");m.className="inv-item",m.innerHTML=`<strong>${x?.name||p}</strong> <span>${g} packets</span>`,m.onclick=()=>{this.selectedSeed=p,this.activeTool="seed",this.onAction.onSelectTool?.("seed",p),document.getElementById("inventory-dialog").close()},t.append(m)}const l=r.inventory.produce||{},c=Object.entries(l).filter(([p,g])=>g>0);if(c.length===0)n.innerHTML='<div class="empty-msg">No harvested produce</div>';else for(const[p,g]of c){const[x,m]=p.split("_"),h=un[x]||xi[x],E=!!xi[x],b=document.createElement("div");b.className="inv-item",b.innerHTML=`<strong>${h?.name||x}</strong> ${E?"":`<span class="badge-grade">Grade ${m}</span>`} <span>${g} units</span>`,n.append(b)}const d=r.materials||{},u=Pc.map(p=>[p,d[p.id]||0]).filter(([,p])=>p>0),f=r.inventory.sprinklers||0;if(u.length===0&&f<=0)s.innerHTML='<div class="empty-msg">No materials yet — gather them in the outer districts</div>';else{for(const[p,g]of u){const x=document.createElement("div");x.className="inv-item",x.innerHTML=`<strong>${p.name}</strong> <span>${g} units</span>`,s.append(x)}if(f>0){const p=document.createElement("div");p.className="inv-item",p.innerHTML=`<strong>${Yi.name} kit</strong> <span>${f} ready — place on a bed (tool 6)</span>`,s.append(p)}}}updatePlayerHUD(e){this.lastPlayer=e;const t=document.getElementById("hud-coins"),n=document.getElementById("hud-rep"),s=document.getElementById("hud-xp"),r=document.getElementById("hud-nick");t&&(t.textContent=`${e.coins} ⛁`),n&&(n.textContent=`${e.reputation||10} ★`),s&&(s.textContent=`Lvl ${e.level||1} · ${e.xp||0} XP`),r&&(r.textContent=e.nickname)}}const h_=200,Oa="afterlight-chat-size",Ba=280,ka=120,f_=640,p_=560;function $i(i,e,t){return Math.max(e,Math.min(t,i))}class m_{constructor(e,{onFocusChange:t=null}={}){this.net=e,this.onFocusChange=t,this.collapsed=!1,this.unread=0,this.panel=document.getElementById("chat-panel"),this.log=document.getElementById("chat-log"),this.toggle=document.getElementById("chat-toggle"),this.unreadBadge=document.getElementById("chat-unread"),this.form=document.getElementById("chat-form"),this.input=document.getElementById("chat-input"),this.sendBtn=document.getElementById("chat-send"),this.handle=document.getElementById("chat-resize"),this.connected=!1,!(!this.panel||!this.log)&&(this.toggle.addEventListener("click",()=>this.setCollapsed(!this.collapsed)),this.input.addEventListener("focus",()=>this.onFocusChange?.(!0)),this.input.addEventListener("blur",()=>this.onFocusChange?.(!1)),this.input.addEventListener("keydown",n=>{if(n.stopPropagation(),n.code==="Escape"){n.preventDefault(),this.input.blur();return}n.code==="Enter"&&(n.preventDefault(),this.submit(n.shiftKey))}),this.form.addEventListener("submit",n=>{n.preventDefault(),this.submit(n.shiftKey||document.activeElement!==this.input)}),this.net.on(Ne.CHAT_HISTORY,n=>this.setHistory(n.messages||[])),this.net.on(Ne.CHAT_MESSAGE,n=>this.addMessage(n)),this.net.on(Ne.CHAT_DM,n=>this.addDM(n)),this.net.on(Ne.CHAT_PRESENCE,n=>this.addPresence(n)),this.net.on(Ne.CHAT_ERROR,n=>this.addError(n)),this.net.onDisconnect(()=>this.setConnected(!1)),this.net.onConnect(()=>this.setConnected(!0)),this.setConnected(this.net.connected),this.#d())}setConnected(e){this.connected=e,this.input&&(this.input.disabled=!e,this.sendBtn.disabled=!e,this.input.placeholder=e?"Say hello… (Enter to chat, Esc to release)":"The relay is quiet — reconnecting…",e||this.addSystemLine("The town relay is out of reach."))}setCollapsed(e){this.collapsed=e,this.panel.classList.toggle("collapsed",e),this.toggle.setAttribute("aria-expanded",String(!e)),e||this.#p()}focusInput(e=""){if(!this.connected){this.setCollapsed(!1),this.input.focus();return}this.setCollapsed(!1),e&&(this.input.value=e),this.input.focus()}submit(e=!1){const t=this.input.value.trim();this.input.value="",t&&this.connected&&(this.net.sendChat(t),e||this.input.blur())}setHistory(e){this.log.textContent="";for(const t of e)this.addMessage(t,{fromHistory:!0});this.#c(!0)}addMessage(e){if((e.fromKind||"player")==="system"){this.addSystemLine(e.text);return}const n=this.#t(e);e.action?n.appendChild(this.#e("chat-body chat-action",`${e.from} ${Lc(e.text)}`)):(n.appendChild(this.#e("chat-nick",e.from)),n.appendChild(this.#e("chat-body",e.text))),this.#n(n,e.from===this.net.nickname)}addDM(e){const t=this.#t(e),n=e.echo||e.from===this.net.nickname,s=n?e.to:e.from;t.appendChild(this.#e("chat-nick",n?`to ${s}`:`from ${s}`)),t.appendChild(this.#e("chat-body",e.action?`${e.from} ${Lc(e.text)}`:e.text)),this.#n(t,n,"dm")}addPresence(e){const t=e.event==="join"?"steps into the town channel":" drifts away from it",n=e.fromKind==="irc"?" (relay)":"";this.addSystemLine(`${e.who}${n}${t}.`)}addError(e){const t=this.#t({ts:Date.now()});t.appendChild(this.#e("chat-body chat-error",e.message)),this.#n(t,!1,"error")}addSystemLine(e){const t=this.#t({ts:Date.now()});t.appendChild(this.#e("chat-body chat-system",e)),this.#n(t,!1,"system")}#d(){if(!this.handle)return;this.sizeMedia=window.matchMedia("(max-width: 900px)"),this.#o(),this.sizeMedia.addEventListener("change",()=>this.#o()),window.addEventListener("resize",()=>this.#o());let e=null;const t=s=>{if(!e)return;s.preventDefault();const r=$i(e.w-(s.clientX-e.x),Ba,this.#i()),a=$i(e.h-(s.clientY-e.y),ka,this.#s());this.#r(r,a)},n=()=>{e&&(e=null,window.removeEventListener("pointermove",t),window.removeEventListener("pointerup",n),window.removeEventListener("pointercancel",n),this.#l(this.#a()))};this.handle.addEventListener("pointerdown",s=>{if(!(this.sizeMedia.matches||this.collapsed)){s.preventDefault(),e={x:s.clientX,y:s.clientY,w:this.panel.getBoundingClientRect().width,h:this.log.getBoundingClientRect().height};try{this.handle.setPointerCapture(s.pointerId)}catch{}window.addEventListener("pointermove",t),window.addEventListener("pointerup",n),window.addEventListener("pointercancel",n)}}),this.handle.addEventListener("dblclick",()=>this.#h()),this.handle.addEventListener("keydown",s=>{if(this.sizeMedia.matches||this.collapsed)return;const r=s.shiftKey?8:28,a=this.#a();let o=a.w,l=a.h;if(s.code==="ArrowLeft")o+=r;else if(s.code==="ArrowRight")o-=r;else if(s.code==="ArrowUp")l+=r;else if(s.code==="ArrowDown")l-=r;else return;s.preventDefault(),this.#r($i(o,Ba,this.#i()),$i(l,ka,this.#s())),this.#l(this.#a())})}#i(){return Math.min(f_,window.innerWidth-380)}#s(){return Math.min(p_,window.innerHeight-260)}#r(e,t){this.panel.style.width=`${Math.round(e)}px`,this.log.style.height=`${Math.round(t)}px`}#a(){return{w:this.panel.getBoundingClientRect().width,h:this.log.getBoundingClientRect().height}}#o(){const e=this.#u();if(this.sizeMedia.matches||!e){this.panel.style.width="",this.log.style.height="";return}this.#r($i(e.w,Ba,this.#i()),$i(e.h,ka,this.#s()))}#u(){try{const e=localStorage.getItem(Oa);if(!e)return null;const t=JSON.parse(e);return!t||!Number.isFinite(t.w)||!Number.isFinite(t.h)?null:t}catch{return null}}#l(e){try{localStorage.setItem(Oa,JSON.stringify({w:Math.round(e.w),h:Math.round(e.h)}))}catch{}}#h(){try{localStorage.removeItem(Oa)}catch{}this.panel.style.width="",this.log.style.height=""}#t(e={}){const t=document.createElement("div");t.className="chat-line";const n=e.ts?new Date(e.ts):new Date,s=String(n.getHours()).padStart(2,"0"),r=String(n.getMinutes()).padStart(2,"0");return t.appendChild(this.#e("chat-time",`${s}:${r}`)),t}#e(e,t){const n=document.createElement("span");return n.className=e,n.textContent=t,n}#n(e,t,n=""){for(n&&e.classList.add(n),t&&e.classList.add("self"),this.log.appendChild(e);this.log.childElementCount>h_;)this.log.firstChild.remove();this.#c(),this.collapsed&&this.#f()}#c(e=!1){const t=this.log.scrollHeight-this.log.scrollTop-this.log.clientHeight<48;(e||t)&&(this.log.scrollTop=this.log.scrollHeight)}#f(){this.unread+=1,this.unreadBadge.hidden=!1,this.unreadBadge.textContent=String(this.unread)}#p(){this.unread=0,this.unreadBadge.hidden=!0,this.unreadBadge.textContent=""}}function Lc(i){return String(i??"").replace(/^\u0001ACTION /,"").replace(/\u0001$/,"")}const g_="modulepreload",__=function(i){return"/"+i},Dc={},v_=function(e,t,n){let s=Promise.resolve();if(t&&t.length>0){let c=function(d){return Promise.all(d.map(u=>Promise.resolve(u).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};var a=c;document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),l=o?.nonce||o?.getAttribute("nonce");s=c(t.map(d=>{if(d=__(d),d in Dc)return;Dc[d]=!0;const u=d.endsWith(".css"),f=u?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${d}"]${f}`))return;const p=document.createElement("link");if(p.rel=u?"stylesheet":g_,u||(p.as="script"),p.crossOrigin="",p.href=d,l&&p.setAttribute("nonce",l),document.head.appendChild(p),u)return new Promise((g,x)=>{p.addEventListener("load",g),p.addEventListener("error",()=>x(new Error(`Unable to preload CSS for ${d}`)))})}))}function r(o){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=o,window.dispatchEvent(l),!l.defaultPrevented)throw o}return s.then(o=>{for(const l of o||[])l.status==="rejected"&&r(l.reason);return e().catch(r)})},ll={URL_MAX:2048,TITLE_MAX:120},Uc={youtube:"YouTube",vimeo:"Vimeo",file:"Video file",hls:"Live stream (HLS)"};function x_(i){switch(i){case"youtube":return"A YouTube video";case"vimeo":return"A Vimeo video";case"hls":return"Live channel";case"file":return"A video link";default:return"Something to watch"}}const M_=new Set(["youtube.com","www.youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com","youtu.be","www.youtu.be"]),y_=/\.(mp4|webm|m4v|mov|ogv|ogg)$/i;function S_(i){if(typeof i!="string")return null;const e=i.trim();if(!e||e.length>ll.URL_MAX)return null;let t;try{t=new URL(e)}catch{return null}if(t.protocol!=="http:"&&t.protocol!=="https:")return null;const n=t.hostname.toLowerCase(),s=t.pathname;if(M_.has(n)){let r=null,a;if(n.endsWith("youtu.be")?(a=s.match(/^\/([\w-]{6,})/),r=a?a[1]:null):(a=s.match(/^\/(?:watch\/)?(?:\?v=)?\/?$/))&&t.searchParams.has("v"),!r&&t.searchParams.has("v")){const o=t.searchParams.get("v");/^[\w-]{6,}$/.test(o)&&(r=o)}return r||(a=s.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/),a&&(r=a[1])),r?{kind:"youtube",url:e,videoId:r}:null}if(n==="vimeo.com"||n==="www.vimeo.com"||n==="player.vimeo.com"){const r=s.match(/^\/(?:video\/)?(\d{6,})(?:[/?]|$)/);return r?{kind:"vimeo",url:e,videoId:r[1]}:null}return s.toLowerCase().endsWith(".m3u8")?{kind:"hls",url:e}:y_.test(s)?{kind:"file",url:e}:null}function E_(i,e){return e?`https://player.vimeo.com/video/${e}?autoplay=1&controls=0&enablejsapi=1`:null}function b_(i,e=ll.TITLE_MAX){return typeof i!="string"?"":i.replace(/\s+/g," ").trim().slice(0,e)}function T_(i,e){return i?i.playing?i.positionSec+Math.max(0,(e-i.updatedAt)/1e3):i.positionSec:0}function w_(i){switch(i){case"invalid_url":return"That link is not something the projector can play. Try YouTube, Vimeo, a direct video file, or an .m3u8 stream.";case"url_too_long":return"That link is far too long to pin to the marquee.";case"queue_full":return"The queue reel is full. Remove something first.";case"item_not_found":return"That item is no longer on the bill.";case"nothing_playing":return"Nothing is on the screen right now.";case"item_mismatch":return"The screen has moved on to something else.";case"invalid_position":return"That timestamp does not make sense.";case"seek_unsupported":return"Live channels cannot be rewound.";case"invalid_action":return"The projector does not understand that request.";default:return"The projector ignores that."}}function A_(i){const e=i.slice(i.indexOf(":")+1),t=e.lastIndexOf(","),n=t===-1?e:e.slice(0,t),r={name:(t===-1?"":e.slice(t+1).trim())||null,group:null,logo:null},a=n.match(/group-title="([^"]*)"/i);a&&(r.group=a[1].trim()||null);const o=n.match(/tvg-logo="([^"]*)"/i);o&&(r.logo=o[1].trim()||null);const l=n.match(/tvg-name="([^"]*)"/i);return!r.name&&l&&(r.name=l[1].trim()||null),r}function C_(i){const e=[];let t=0,n=!1;if(typeof i!="string"||!i.trim())return{entries:e,skipped:t,recognized:n};let s=null,r=0;for(const a of i.split(/\r?\n/)){const o=a.trim();if(o){if(o.toUpperCase().startsWith("#EXTM3U")){n=!0;continue}if(o.startsWith("#")){o.toUpperCase().startsWith("#EXTINF")&&(s=A_(o));continue}if(!/^https?:\/\//i.test(o)){t++,s=null;continue}n=!0,r++,e.push({url:o,name:b_(s?.name)||`Channel ${r}`,group:s?.group||null,logo:s?.logo||null}),s=null}}return{entries:e,skipped:t,recognized:n}}const Sr=100,R_=1.5,P_=2e3,Sd=8e3,I_=3e3,Nc="afterlight-iptv-lists",L_=12,D_=5e3,U_=[{x:0,y:0},{x:Sr,y:0},{x:Sr,y:Sr},{x:0,y:Sr}];function N_(i,e){const t=[1,0,0,0,1,0,0,0,1];if(!Array.isArray(i)||!Array.isArray(e)||i.length<4||e.length<4)return t;const n=[];for(let a=0;a<4;a++){const o=i[a]||{},l=e[a]||{},c=Number(o.x),d=Number(o.y),u=Number(l.x),f=Number(l.y);if(![c,d,u,f].every(Number.isFinite))return t;n.push([c,d,1,0,0,0,-u*c,-u*d,u]),n.push([0,0,0,c,d,1,-f*c,-f*d,f])}const s=8;for(let a=0;a<s;a++){let o=a;for(let c=a+1;c<n.length;c++)Math.abs(n[c][a])>Math.abs(n[o][a])&&(o=c);if(Math.abs(n[o][a])<1e-12)return t;if(o!==a){const c=n[o];n[o]=n[a],n[a]=c}const l=n[a][a];for(let c=a;c<=s;c++)n[a][c]/=l;for(let c=0;c<n.length;c++){if(c===a)continue;const d=n[c][a];if(d!==0)for(let u=a;u<=s;u++)n[c][u]-=d*n[a][u]}}const r=[];for(let a=0;a<s;a++)r.push(n[a][s]);return r.push(1),r}function F_(i){const e=(t,n=0)=>{const s=Number(i?.[t]);return Number.isFinite(s)?s:t===8?1:n};return`matrix3d(${e(0)}, ${e(3)}, 0, ${e(6)}, ${e(1)}, ${e(4)}, 0, ${e(7)}, 0, 0, 1, 0, ${e(2)}, ${e(5)}, 0, ${e(8)})`}function Ha(i,e=0){const t=[];if(!Array.isArray(i))return t;const n=Number.isFinite(Number(e))?Number(e):0;for(const s of i){if(t.length>=L_)break;if(!s||typeof s!="object")continue;const r=[];if(Array.isArray(s.channels))for(const a of s.channels){if(r.length>=D_)break;if(!a||typeof a!="object")continue;const o=typeof a.url=="string"?a.url.trim():"";if(!/^https?:\/\//i.test(o))continue;const l=typeof a.logo=="string"?a.logo.trim():"";r.push({url:o,name:typeof a.name=="string"&&a.name.trim()?a.name.trim().slice(0,200):`Channel ${r.length+1}`,group:typeof a.group=="string"&&a.group.trim()?a.group.trim().slice(0,120):null,logo:/^https?:\/\//i.test(l)?l:null})}r.length!==0&&t.push({id:typeof s.id=="string"&&s.id?s.id:`iptv_${t.length}_${n}`,name:typeof s.name=="string"&&s.name.trim()?s.name.trim().slice(0,80):"Untitled list",savedAt:Number.isFinite(Number(s.savedAt))?Number(s.savedAt):n,channels:r})}return t}const Er=new Map;function Ed(i,e=Sd){if(typeof document>"u")return Promise.reject(new Error("no document"));if(Er.has(i))return Er.get(i);const t=new Promise((n,s)=>{const r=document.createElement("script"),a=setTimeout(()=>s(new Error(`Timed out loading ${i}`)),e);r.src=i,r.async=!0,r.onload=()=>{clearTimeout(a),n()},r.onerror=()=>{clearTimeout(a),Er.delete(i),s(new Error(`Failed to load ${i}`))},document.head.append(r)});return Er.set(i,t),t}let bs=null;function O_(){return typeof window>"u"?Promise.reject(new Error("no window")):window.YT&&window.YT.Player?Promise.resolve(window.YT):(bs||(bs=new Promise((i,e)=>{const t=setTimeout(()=>e(new Error("YouTube IFrame API timed out")),Sd),n=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(clearTimeout(t),typeof n=="function")try{n()}catch{}window.YT&&window.YT.Player?i(window.YT):e(new Error("YouTube IFrame API missing after load"))},Ed("https://www.youtube.com/iframe_api").catch(s=>{clearTimeout(t),e(s)})}),bs.catch(()=>{bs=null})),bs)}async function B_(){if(typeof window>"u")throw new Error("no window");if(window.Vimeo&&window.Vimeo.Player||(await Ed("https://player.vimeo.com/api/player.js"),window.Vimeo&&window.Vimeo.Player))return window.Vimeo;throw new Error("Vimeo player SDK missing after load")}class k_{constructor(e=null){this.net=e,this.state=null,this.serverDelta=0,this.roomActive=!1,this.quad=null,this.engine=null,this.loadedItemId=null,this.reportedForId=null,this.overlayState="idle",this.errorTitle=null,this.awaitingGesture=!1,this.lastDriftCheckMs=0,this.loadToken=0,this.volume=1,this.watching=!1,this.onStandUpRequest=null,this.seatedInWorld=!1,this.savedLists=[],this.activeListId=null,this.activeChannelIndex=-1,this.guideGroupFilter="All",this.guideListId=null,this.dom=null,typeof document<"u"&&(this.dom={},this.buildOverlay(),this.buildControlsButton(),this.buildDialogs(),this.buildWatchBar(),this.savedLists=this.loadSavedLists(),this.syncOverlay()),e&&typeof e.on=="function"&&e.on(Ne.THEATER_STATE,t=>this.applyState(t?.theater,t?.serverNow||Date.now()))}setRoomActive(e){this.roomActive=!!e,this.roomActive?this.state?.now?(this.loadedItemId=null,this.loadCurrent()):this.setOverlayState("idle"):(this.teardownEngine(),this.loadedItemId=null,this.awaitingGesture=!1,this.setOverlayState("idle")),this.dom?.controlsBtn&&(this.dom.controlsBtn.hidden=!this.roomActive),this.syncOverlay()}applyState(e,t=null){const n=e&&typeof e=="object"?e:{now:null,queue:[]};this.state={now:n.now&&typeof n.now=="object"?n.now:null,queue:Array.isArray(n.queue)?n.queue:[]};const s=Number(t);if(Number.isFinite(s)&&s>0&&(this.serverDelta=s-Date.now()),this.dom?.controlsDialog?.open&&this.renderControls(),this.dom?.guideDialog?.open&&this.renderGuide(),this.watching&&this.updateWatchBar(),!this.roomActive)return;const r=this.state.now;if(!r){(this.engine||this.loadedItemId!==null)&&this.teardownEngine(),this.loadedItemId=null,this.reportedForId=null,this.setOverlayState("idle"),this.syncOverlay();return}this.rememberChannelFor(r.url),r.id!==this.loadedItemId?(this.reportedForId=null,this.loadCurrent()):this.enforceSync(),this.syncOverlay()}updateScreenQuad(e){if(this.quad=Array.isArray(e)&&e.length>=4?e:null,this.dom?.overlay&&this.quad&&!this.watching){const t=[this.quad[3],this.quad[2],this.quad[1],this.quad[0]],n=N_(U_,t);this.dom.overlay.style.transform=F_(n)}this.syncOverlay(),this.tickDriftCheck()}openControls(){this.dom?.controlsDialog&&(this.renderControls(),this.dom.controlsDialog.open||this.dom.controlsDialog.showModal())}isWatching(){return!!this.watching}setWatchMode(e){if(typeof document>"u")return;const t=!!e;t!==this.watching&&(this.watching=t,document.body.classList.toggle("theater-watching",this.watching),document.activeElement?.id==="chat-input"&&document.activeElement.blur(),this.dom?.overlay&&(this.watching?this.dom.overlay.style.transform="":this.dom.overlay.style.aspectRatio=""),this.watching&&this.dockChatForWatch(),this.updateWatchBar(),this.syncOverlay())}dockChatForWatch(){const e=document.getElementById("chat-panel");if(!e){document.body.style.setProperty("--theater-chat-gutter","0px");return}e.classList.contains("collapsed")&&document.getElementById("chat-toggle")?.click(),requestAnimationFrame(()=>{if(!this.watching)return;const t=e.getBoundingClientRect(),n=t.width>0?Math.ceil(t.width+Math.max(0,window.innerWidth-t.right)):0;document.body.style.setProperty("--theater-chat-gutter",`${n}px`)})}buildWatchBar(){const e=document.createElement("div");e.id="theater-watchbar",e.hidden=!0,e.innerHTML=`
      <span class="theater-watchbar-title" id="theater-watchbar-title">The Orpheum</span>
      <span class="theater-watchbar-state micro" id="theater-watchbar-state"></span>
      <button type="button" id="theater-watchbar-controls" title="Open the projection booth">▣ Booth</button>
      <button type="button" id="theater-watchbar-leave" title="Stand up and return to the game (Esc)">⤺ Stand up</button>
    `,document.body.append(e),e.querySelector("#theater-watchbar-controls").addEventListener("click",()=>this.openControls()),e.querySelector("#theater-watchbar-leave").addEventListener("click",()=>{this.onStandUpRequest?.(),this.setWatchMode(!1)}),this.watchbar=e,this.watchbarTitle=e.querySelector("#theater-watchbar-title"),this.watchbarState=e.querySelector("#theater-watchbar-state")}updateWatchBar(){if(!this.watchbar||(this.watchbar.hidden=!this.watching,!this.watching))return;const e=this.state?.now;this.watchbarTitle.textContent=e?`Now playing · ${e.title}`:"The Orpheum · the screen sleeps",this.watchbarState.textContent=e?e.playing?"▶":"⏸":"";const t=this.watchbar.querySelector("#theater-watchbar-leave");t&&(t.textContent=this.seatedInWorld?"⤺ Stand up":"⤺ Back to the world",t.title=this.seatedInWorld?"Stand up and return to the game (Esc)":"Step out of the cinema view and walk the aisles (Esc)")}setSeated(e){this.seatedInWorld=!!e,this.watching&&this.updateWatchBar()}openGuide(){this.dom?.guideDialog&&(this.renderGuide(),this.dom.guideDialog.open||this.dom.guideDialog.showModal())}targetPosition(e=Date.now()){return this.state?.now?T_(this.state.now,e+this.serverDelta):0}tickDriftCheck(){const e=this.state?.now;if(!this.roomActive||!e||!this.engine||this.engine.degraded||!this.engine.ready)return;const t=Date.now();t-this.lastDriftCheckMs<P_||(this.lastDriftCheckMs=t,this.enforceSync())}enforceSync(){if(!this.engine||this.engine.degraded||!this.engine.ready)return;const e=this.state?.now;if(!e)return;const t=this.engine.getTime?this.engine.getTime():null,n=this.targetPosition();Number.isFinite(t)&&Number.isFinite(n)&&Math.abs(t-n)>R_&&e.kind!=="hls"&&this.engine.seek(Math.max(0,n)),e.playing?this.awaitingGesture||this.engine.play():this.engine.pause()}teardownEngine(){const e=this.engine;if(this.engine=null,this.awaitingGesture=!1,this.hideGestureBadge(),e)try{e.destroy?.()}catch{}this.dom?.mediaHost&&(this.dom.mediaHost.innerHTML="")}loadCurrent(){const e=this.state?.now;if(!e||!this.dom)return;const t=++this.loadToken;switch(this.teardownEngine(),this.loadedItemId=e.id,this.errorTitle=null,this.setOverlayState("loading"),e.kind){case"file":this.startFileEngine(e,t,!1);break;case"hls":this.startFileEngine(e,t,!0);break;case"youtube":this.startYouTubeEngine(e,t);break;case"vimeo":this.startVimeoEngine(e,t);break;default:this.failItem()}}startFileEngine(e,t,n){const s=document.createElement("video");s.autoplay=!0,s.setAttribute("playsinline",""),s.preload="auto",s.volume=this.volume,this.dom.mediaHost.append(s);const r={kind:e.kind,video:s,hls:null,degraded:!1,ready:!1,getTime:()=>Number.isFinite(s.currentTime)?s.currentTime:null,seek:o=>{try{s.currentTime=o}catch{}},play:()=>{s.paused&&this.playVideoElement(s)},pause:()=>{s.paused||s.pause()},setVolume:o=>{s.volume=o},destroy:()=>{if(r.hls){try{r.hls.destroy()}catch{}r.hls=null}try{s.pause()}catch{}try{s.removeAttribute("src"),s.load()}catch{}}};this.engine=r,s.addEventListener("playing",()=>{this.engine===r&&(this.hideGestureBadge(),this.setOverlayState("playing"))}),s.addEventListener("waiting",()=>{this.engine===r&&this.overlayState==="playing"&&this.setOverlayState("loading")}),s.addEventListener("ended",()=>this.reportEnded()),s.addEventListener("error",()=>{this.engine===r&&this.failItem()});const a=()=>{if(this.engine!==r||t!==this.loadToken)return;r.ready=!0;const o=this.targetPosition();o>.5&&e.kind!=="hls"&&r.seek(o),this.state?.now?.playing!==!1?this.playVideoElement(s):r.pause()};s.readyState>=1?a():s.addEventListener("loadedmetadata",a,{once:!0}),n?this.attachHls(s,e,r,t):s.src=e.url}async attachHls(e,t,n,s){let r=null;try{const a=await v_(()=>import("./hls-BOLXTnjL.js"),[]);r=a?.default??a}catch(a){console.warn("theater: hls.js unavailable, trying native HLS playback",a)}if(!(this.engine!==n||s!==this.loadToken))if(r&&typeof r.isSupported=="function"&&r.isSupported()){const a=new r;n.hls=a,a.on(r.Events.ERROR,(o,l)=>{if(!(!l?.fatal||this.engine!==n)){try{a.destroy()}catch{}n.hls===a&&(n.hls=null),this.failItem()}}),a.loadSource(t.url),a.attachMedia(e)}else e.src=t.url}async startYouTubeEngine(e,t){let n=null;try{n=await O_()}catch(l){console.warn("theater: YouTube API unavailable",l),t===this.loadToken&&this.failItem();return}if(t!==this.loadToken)return;const s=document.createElement("div");this.dom.mediaHost.append(s);const r={kind:"youtube",player:null,mount:s,degraded:!1,ready:!1,unstartedTimer:null};this.engine=r;const a=()=>{try{return r.player?.getPlayerState?.()}catch{return null}};let o;try{o=new n.Player(s,{width:"100%",height:"100%",videoId:e.videoId,playerVars:{autoplay:1,playsinline:1,controls:0,rel:0,disablekb:1},events:{onReady:()=>{if(this.engine!==r||t!==this.loadToken)return;r.ready=!0,r.player=o;try{o.setVolume(Math.round(this.volume*100))}catch{}const l=this.targetPosition();if(l>.5)try{o.seekTo(l,!0)}catch{}if(this.state?.now?.playing!==!1)try{o.playVideo()}catch{}r.unstartedTimer=setTimeout(()=>{if(r.unstartedTimer=null,this.engine!==r)return;const c=a();this.state?.now?.playing!==!1&&(c===-1||c===5)&&this.showGestureBadge()},I_)},onStateChange:l=>{if(this.engine!==r)return;const c=l?.data;c===1?(this.hideGestureBadge(),this.setOverlayState("playing")):c===0&&this.reportEnded()},onError:()=>{this.engine===r&&this.failItem()}}})}catch(l){console.warn("theater: YouTube player creation failed",l),t===this.loadToken&&this.failItem();return}r.player=o,r.getTime=()=>{try{const l=o.getCurrentTime?.();return Number.isFinite(l)?l:null}catch{return null}},r.seek=l=>{try{o.seekTo(l,!0)}catch{}},r.play=()=>{try{o.playVideo()}catch{}},r.pause=()=>{try{o.pauseVideo()}catch{}},r.setVolume=l=>{try{o.setVolume(Math.round(l*100))}catch{}},r.destroy=()=>{r.unstartedTimer&&(clearTimeout(r.unstartedTimer),r.unstartedTimer=null);try{o.destroy?.()}catch{}}}async startVimeoEngine(e,t){const n=document.createElement("iframe");n.src=E_("vimeo",e.videoId)||e.url,n.setAttribute("allow","autoplay; fullscreen; picture-in-picture"),n.setAttribute("allowfullscreen",""),this.dom.mediaHost.append(n);const s={kind:"vimeo",iframe:n,player:null,degraded:!0,ready:!0,time:null,getTime:()=>s.degraded?null:s.time,seek:r=>{try{s.player?.setCurrentTime?.(r)}catch{}},play:()=>{try{s.player?.play?.()}catch{}},pause:()=>{try{s.player?.pause?.()}catch{}},setVolume:r=>{try{s.player?.setVolume?.(r)}catch{}},destroy:()=>{try{s.player?.destroy?.()}catch{}}};this.engine=s,this.setOverlayState("loading");try{const r=await B_();if(this.engine!==s||t!==this.loadToken)return;const a=new r.Player(n);s.player=a,s.degraded=!1,a.on("playing",()=>{this.engine===s&&(this.hideGestureBadge(),this.setOverlayState("playing"))}),a.on("timeupdate",l=>{this.engine===s&&(s.time=Number.isFinite(l?.seconds)?l.seconds:s.time)}),a.on("ended",()=>this.reportEnded()),a.on("error",()=>{this.engine===s&&this.failItem()});const o=this.targetPosition();if(o>.5)try{await a.setCurrentTime(o)}catch{}try{await a.setVolume(this.volume)}catch{}try{await a.play()}catch{this.showGestureBadge()}}catch(r){console.warn("theater: Vimeo SDK unavailable, iframe runs unsynced",r),s.degraded=!0}}playVideoElement(e){try{const t=e.play();t&&typeof t.catch=="function"&&t.catch(n=>{this.engine?.video===e&&(console.warn("theater: autoplay blocked",n?.name||n),this.showGestureBadge())})}catch{this.showGestureBadge()}}setOverlayState(e){this.overlayState=e;const t=this.dom?.overlay;t&&(t.classList.remove("ts-state-idle","ts-state-loading","ts-state-playing","ts-state-error"),t.classList.add(`ts-state-${e}`),this.renderCaption())}renderCaption(){const e=this.dom?.caption;if(!e)return;const t=this.state?.now;let n="";this.overlayState==="idle"?n="The screen sleeps — open the Screen controls to queue something":this.overlayState==="loading"?n=t?`Warming up the projector… ${t.title}`:"Warming up the projector…":this.overlayState==="error"?n=`Couldn't play: ${this.errorTitle||t?.title||"unknown item"}`:n=t?t.title:"",e.textContent=n}syncOverlay(){const e=this.dom?.overlay;e&&e.classList.toggle("ts-hidden",!(this.roomActive&&(this.quad||this.watching)))}showGestureBadge(){this.awaitingGesture=!0,this.dom?.playBadge&&(this.dom.playBadge.hidden=!1)}hideGestureBadge(){this.awaitingGesture=!1,this.dom?.playBadge&&(this.dom.playBadge.hidden=!0)}resumeFromGesture(){this.hideGestureBadge();const e=this.engine;e&&(e.video?this.playVideoElement(e.video):e.play?.())}reportEnded(){this.sendItemReport("ended")}failItem(){const e=this.state?.now;this.errorTitle=e?.title||"the current item",this.teardownEngine(),this.setOverlayState("error"),this.sendItemReport("failed")}sendItemReport(e){const t=this.state?.now?.id;!t||this.reportedForId===t||(this.reportedForId=t,this.sendControl({op:e,itemId:t}))}sendControl(e){typeof this.net?.sendTheaterControl=="function"?this.net.sendTheaterControl(e):this.net?.send?.(Ne.THEATER_CONTROL,e)}sendQueue(e){typeof this.net?.sendTheaterQueue=="function"?this.net.sendTheaterQueue(e):this.net?.send?.(Ne.THEATER_QUEUE,e)}sendChannel(e,t){typeof this.net?.sendTheaterChannel=="function"?this.net.sendTheaterChannel(e,t):this.net?.send?.(Ne.THEATER_CHANNEL,{url:e,title:t})}buildOverlay(){const e=document.createElement("div");e.id="theater-screen",e.className="ts-hidden ts-state-idle",e.innerHTML=`
      <div class="ts-media"></div>
      <div class="ts-state-layer"></div>
      <div class="ts-caption"><span class="ts-caption-text"></span></div>
      <button type="button" class="ts-play-badge" hidden>▶ Tap to start</button>
    `,this.dom.overlay=e,this.dom.mediaHost=e.querySelector(".ts-media"),this.dom.caption=e.querySelector(".ts-caption-text"),this.dom.playBadge=e.querySelector(".ts-play-badge"),this.dom.playBadge.addEventListener("click",()=>this.resumeFromGesture()),document.body.append(e)}buildControlsButton(){const e=document.createElement("button");e.type="button",e.id="theater-controls-btn",e.textContent="▣ Screen",e.hidden=!0,e.addEventListener("click",()=>this.openControls()),(document.querySelector("footer .actions")||document.body).append(e),this.dom.controlsBtn=e}buildDialogs(){this.buildControlsDialog(),this.buildGuideDialog()}buildControlsDialog(){const e=document.createElement("dialog");e.id="theater-dialog",e.className="game-modal",e.innerHTML=`
      <div class="micro modal-header-tag">THE ORPHEUM · PROJECTION BOOTH</div>
      <h2>Screen Controls</h2>
      <p class="modal-sub">Anyone in the auditorium may run the projector — everyone watching sees the same thing at the same time.</p>

      <div class="panel theater-now-panel" id="theater-now-panel"></div>

      <label class="micro" for="theater-url-input">ADD BY URL (YOUTUBE · VIMEO · .MP4 · .M3U8)</label>
      <div class="theater-add-row">
        <input type="text" id="theater-url-input" maxlength="${ll.URL_MAX}"
          placeholder="Paste a video or stream link…" autocomplete="off" spellcheck="false">
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
        <div class="theater-iptv-saved">
          <select id="theater-iptv-select" aria-label="Saved IPTV lists"></select>
          <button type="button" id="theater-btn-open-guide" class="action-btn">Open guide</button>
          <button type="button" id="theater-btn-delete-list" class="btn-secondary">Delete list</button>
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
        </div>
        <p class="theater-status-line" id="theater-iptv-status" hidden></p>
      </div>

      <div class="modal-footer">
        <button type="button" id="close-theater-dialog" class="btn-secondary">Leave the booth →</button>
      </div>
    `,document.body.append(e),e.addEventListener("cancel",t=>{t.preventDefault(),e.close()}),this.dom.controlsDialog=e,this.dom.nowPanel=e.querySelector("#theater-now-panel"),this.dom.urlInput=e.querySelector("#theater-url-input"),this.dom.addStatus=e.querySelector("#theater-add-status"),this.dom.queueList=e.querySelector("#theater-queue-list"),this.dom.btnToggle=e.querySelector("#theater-btn-toggle"),this.dom.btnSkip=e.querySelector("#theater-btn-skip"),this.dom.btnBack=e.querySelector("#theater-btn-back"),this.dom.btnFwd=e.querySelector("#theater-btn-fwd"),this.dom.btnClear=e.querySelector("#theater-btn-clear"),this.dom.volumeInput=e.querySelector("#theater-volume"),this.dom.iptvSelect=e.querySelector("#theater-iptv-select"),this.dom.iptvCurrent=e.querySelector("#theater-iptv-current"),this.dom.iptvStatus=e.querySelector("#theater-iptv-status"),this.dom.iptvPaste=e.querySelector("#theater-iptv-paste"),this.dom.iptvFile=e.querySelector("#theater-iptv-file"),this.dom.iptvUrl=e.querySelector("#theater-iptv-url"),e.querySelector("#close-theater-dialog").addEventListener("click",()=>e.close()),e.querySelector("#theater-btn-add").addEventListener("click",()=>this.onAddClicked(!1)),e.querySelector("#theater-btn-play-url").addEventListener("click",()=>this.onAddClicked(!0)),this.dom.urlInput.addEventListener("keydown",t=>{t.key==="Enter"&&(t.preventDefault(),this.onAddClicked(!1))}),this.dom.btnToggle.addEventListener("click",()=>{const t=this.state?.now;t&&this.sendControl(t.playing?{op:"pause",itemId:t.id}:{op:"resume",itemId:t.id})}),this.dom.btnSkip.addEventListener("click",()=>this.sendQueue({op:"skip"})),this.dom.btnBack.addEventListener("click",()=>this.nudgeSeek(-30)),this.dom.btnFwd.addEventListener("click",()=>this.nudgeSeek(30)),this.dom.btnClear.addEventListener("click",()=>this.sendQueue({op:"clear"})),this.dom.volumeInput.addEventListener("input",()=>{const t=Number(this.dom.volumeInput.value);this.volume=Number.isFinite(t)?Math.min(1,Math.max(0,t/100)):1,this.engine?.setVolume?.(this.volume)}),this.dom.iptvSelect.addEventListener("change",()=>{this.activeListId=this.dom.iptvSelect.value||null,this.activeChannelIndex=-1,this.renderIptvSection()}),e.querySelector("#theater-btn-open-guide").addEventListener("click",()=>this.openGuide()),e.querySelector("#theater-btn-delete-list").addEventListener("click",()=>this.deleteActiveList()),e.querySelector("#theater-btn-prev").addEventListener("click",()=>this.flipChannel(-1)),e.querySelector("#theater-btn-next").addEventListener("click",()=>this.flipChannel(1)),e.querySelector("#theater-btn-import-paste").addEventListener("click",()=>{this.importPlaylistText(this.dom.iptvPaste.value,null),this.dom.iptvPaste.value=""}),this.dom.iptvFile.addEventListener("change",()=>{const t=this.dom.iptvFile.files?.[0];this.dom.iptvFile.value="",this.importPlaylistFile(t)}),e.querySelector("#theater-btn-import-url").addEventListener("click",()=>this.importPlaylistUrl())}buildGuideDialog(){const e=document.createElement("dialog");e.id="theater-guide-dialog",e.className="game-modal game-modal--wide",e.innerHTML=`
      <div class="micro modal-header-tag">THE ORPHEUM · CHANNEL GUIDE</div>
      <h2 id="theater-guide-title">Channel Guide</h2>
      <div class="theater-guide-top">
        <button type="button" id="theater-guide-prev" class="btn-secondary">◂ Prev</button>
        <button type="button" id="theater-guide-next" class="btn-secondary">Next ▸</button>
        <span id="theater-guide-count" class="micro"></span>
      </div>
      <div id="theater-guide-groups" class="theater-chip-row"></div>
      <div id="theater-guide-list" class="theater-guide-list"></div>
      <div class="modal-footer">
        <button type="button" id="close-theater-guide" class="btn-secondary">Close guide →</button>
      </div>
    `,document.body.append(e),e.addEventListener("cancel",t=>{t.preventDefault(),e.close()}),this.dom.guideDialog=e,this.dom.guideTitle=e.querySelector("#theater-guide-title"),this.dom.guideCount=e.querySelector("#theater-guide-count"),this.dom.guideGroups=e.querySelector("#theater-guide-groups"),this.dom.guideList=e.querySelector("#theater-guide-list"),e.querySelector("#theater-guide-prev").addEventListener("click",()=>this.flipChannel(-1)),e.querySelector("#theater-guide-next").addEventListener("click",()=>this.flipChannel(1)),e.querySelector("#close-theater-guide").addEventListener("click",()=>e.close())}nudgeSeek(e){const t=this.state?.now;if(!t)return;const n=Math.max(0,Math.round((this.targetPosition()+e)*10)/10);this.sendControl({op:"seek",positionSec:n,itemId:t.id})}setAddStatus(e,t=!1){const n=this.dom?.addStatus;n&&(n.hidden=!e,n.textContent=e||"",n.classList.toggle("is-error",!!t))}setIptvStatus(e,t=!1){const n=this.dom?.iptvStatus;n&&(n.hidden=!e,n.textContent=e||"",n.classList.toggle("is-error",!!t))}onAddClicked(e){const t=this.dom?.urlInput,n=(t?.value||"").trim(),s=S_(n);if(!s){this.setAddStatus(w_("invalid_url"),!0);return}this.setAddStatus(""),e?this.sendChannel(s.url,x_(s.kind)):this.sendQueue({op:"add",url:s.url}),t.value=""}renderControls(){if(!this.dom?.controlsDialog)return;const e=this.state?.now,t=this.state?.queue||[],n=this.dom.nowPanel;if(n.innerHTML="",e){const o=document.createElement("div");o.className="theater-now-head";const l=document.createElement("strong");l.className="theater-now-title",l.textContent=e.title||"Untitled";const c=document.createElement("span");c.className="theater-kind-tag",c.textContent=Uc[e.kind]||e.kind||"media";const d=document.createElement("span");d.className=`theater-badge ${e.playing?"is-playing":"is-paused"}`,d.textContent=e.playing?"▶ PLAYING":"❚❚ PAUSED",o.append(l,c,d);const u=document.createElement("div");u.className="micro theater-now-by",u.textContent=`queued/changed by ${e.queuedBy||e.by||"Someone"}`,n.append(o,u)}else{const o=document.createElement("div");o.className="theater-empty",o.textContent="Nothing on the screen. Queue something below — it starts for everyone.",n.append(o)}const s=this.dom.queueList;if(s.innerHTML="",!t.length){const o=document.createElement("div");o.className="theater-empty",o.textContent="The queue is empty.",s.append(o)}for(const o of t){const l=document.createElement("div");l.className="theater-queue-row";const c=document.createElement("span");c.className="theater-queue-title",c.textContent=o.title||"Untitled";const d=document.createElement("span");d.className="theater-kind-tag",d.textContent=Uc[o.kind]||o.kind||"media";const u=document.createElement("span");u.className="theater-queued-by",u.textContent=`· ${o.queuedBy||"Someone"}`;const f=document.createElement("button");f.type="button",f.textContent="Play now",f.addEventListener("click",()=>this.sendQueue({op:"playNow",itemId:o.id}));const p=document.createElement("button");p.type="button",p.textContent="Remove",p.addEventListener("click",()=>this.sendQueue({op:"remove",itemId:o.id})),l.append(c,d,u,f,p),s.append(l)}const r=!!e;this.dom.btnToggle.textContent=e?.playing?"Pause":"Resume",this.dom.btnToggle.disabled=!r,this.dom.btnSkip.disabled=!r;const a=r&&e.kind!=="hls";this.dom.btnBack.disabled=!a,this.dom.btnFwd.disabled=!a,this.dom.btnClear.disabled=!r&&!t.length,this.dom.volumeInput.value=String(Math.round(this.volume*100)),this.renderIptvSection()}getActiveList(){return this.savedLists.find(e=>e.id===this.activeListId)||null}loadSavedLists(){try{const e=JSON.parse(localStorage.getItem(Nc)||"[]");return Ha(e,Date.now())}catch{return[]}}saveSavedLists(){try{localStorage.setItem(Nc,JSON.stringify(Ha(this.savedLists,Date.now())))}catch{}}renderIptvSection(){if(!this.dom?.iptvSelect)return;const e=this.dom.iptvSelect;if(e.innerHTML="",this.savedLists.length){e.disabled=!1;for(const s of this.savedLists){const r=document.createElement("option");r.value=s.id,r.textContent=`${s.name} (${s.channels.length})`,e.append(r)}this.getActiveList()||(this.activeListId=this.savedLists[0].id,this.activeChannelIndex=-1),e.value=this.activeListId}else{const s=document.createElement("option");s.value="",s.textContent="No saved lists — import one below",e.append(s),e.disabled=!0,this.activeListId=null}const n=this.getActiveList()?.channels?.[this.activeChannelIndex];this.dom.iptvCurrent.textContent=n?`Tuned: ${n.name}`:this.state?.now?`On screen: ${this.state.now.title}`:"No channel tuned"}importPlaylistText(e,t){const n=C_(e);if(!n.recognized){this.setIptvStatus("That does not look like an M3U/M3U8 playlist — it should start with #EXTM3U or contain channel URLs, one per line.",!0);return}if(!n.entries.length){this.setIptvStatus(`0 channels loaded (${n.skipped} lines skipped).`,!0);return}const s={id:`iptv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,name:t||`Imported ${new Date().toLocaleDateString()}`,savedAt:Date.now(),channels:n.entries};this.savedLists=Ha([s,...this.savedLists],Date.now()),this.saveSavedLists(),this.activeListId=s.id,this.activeChannelIndex=-1,this.renderIptvSection(),this.setIptvStatus(`${n.entries.length} channels loaded (${n.skipped} lines skipped).`)}importPlaylistFile(e){if(e)try{const t=new FileReader;t.onload=()=>{const n=e.name.replace(/\.(m3u8?|txt)$/i,"");this.importPlaylistText(String(t.result||""),n)},t.onerror=()=>this.setIptvStatus("Could not read that file.",!0),t.readAsText(e)}catch{this.setIptvStatus("Could not read that file.",!0)}}async importPlaylistUrl(){const e=(this.dom?.iptvUrl?.value||"").trim();if(!/^https?:\/\//i.test(e)){this.setIptvStatus("Enter an http(s) URL pointing at an .m3u / .m3u8 playlist.",!0);return}this.setIptvStatus("Fetching playlist…");let t="Imported list";try{t=new URL(e).hostname}catch{}try{const n=await fetch(e);if(!n.ok)throw new Error(`HTTP ${n.status}`);const s=await n.text();this.importPlaylistText(s,t)}catch{this.setIptvStatus("Could not fetch that playlist — many hosts do not allow direct browser access (CORS). Download it and use paste or file import instead.",!0)}}deleteActiveList(){const e=this.getActiveList();if(!e){this.setIptvStatus("Select a saved list to delete.",!0);return}this.savedLists=this.savedLists.filter(t=>t.id!==e.id),this.saveSavedLists(),this.activeListId===e.id&&(this.activeListId=this.savedLists[0]?.id||null,this.activeChannelIndex=-1),this.renderIptvSection(),this.setIptvStatus(`Deleted "${e.name}".`)}rememberChannelFor(e){if(!e)return;const t=this.getActiveList();if(!t)return;const n=t.channels.findIndex(s=>s.url===e);n!==-1&&(this.activeChannelIndex=n)}flipChannel(e){const t=this.getActiveList();if(!t||!t.channels.length){this.setIptvStatus("No IPTV list loaded — import one below (paste text, file, or URL) to start flipping.",!0),this.openControls();return}const n=t.channels.length;let s=this.activeChannelIndex;s<0||s>=n?s=e>0?0:n-1:s=(s+e+n)%n,this.tuneChannel(t,s)}tuneChannel(e,t){const n=e?.channels?.[t];n&&(this.activeListId=e.id,this.activeChannelIndex=t,this.sendChannel(n.url,n.name),this.renderIptvSection(),this.dom?.guideDialog?.open&&this.renderGuide())}renderGuide(){if(!this.dom?.guideDialog)return;const e=this.getActiveList();this.guideListId!==(e?.id||null)&&(this.guideListId=e?.id||null,this.guideGroupFilter="All"),this.dom.guideTitle.textContent=e?e.name:"Channel Guide",this.dom.guideCount.textContent=e?`${e.channels.length} channels${this.state?.now?` · on screen: ${this.state.now.title}`:""}`:"No list loaded";const t=[];if(e)for(const a of e.channels)a.group&&!t.includes(a.group)&&t.push(a.group);const n=this.dom.guideGroups;if(n.innerHTML="",e&&t.length){t.includes(this.guideGroupFilter)||(this.guideGroupFilter="All");for(const a of["All",...t]){const o=document.createElement("button");o.type="button",o.className=`theater-chip ${a===this.guideGroupFilter?"active":""}`,o.textContent=a,o.addEventListener("click",()=>{this.guideGroupFilter=a,this.renderGuide()}),n.append(o)}}const s=this.dom.guideList;if(s.innerHTML="",!e||!e.channels.length){const a=document.createElement("div");a.className="theater-empty",a.textContent="No IPTV list yet — open the Screen controls and import one (paste text, upload a file, or fetch a URL).",s.append(a);return}const r=this.guideGroupFilter;e.channels.forEach((a,o)=>{if(r!=="All"&&(a.group||"")!==r)return;const l=document.createElement("div");if(l.className=`theater-channel-row ${o===this.activeChannelIndex?"current":""}`,a.logo&&/^https?:\/\//i.test(a.logo)){const d=document.createElement("img");d.src=a.logo,d.alt="",d.loading="lazy",d.addEventListener("error",()=>{d.hidden=!0}),l.append(d)}const c=document.createElement("span");if(c.className="theater-channel-name",c.textContent=a.name||"Channel",l.append(c),a.group){const d=document.createElement("span");d.className="theater-group-tag",d.textContent=a.group,l.append(d)}l.addEventListener("click",()=>{this.tuneChannel(e,o),this.dom.guideDialog.close()}),s.append(l)})}}const ge=i=>document.getElementById(i),bt=new fh;bt.background=new Fe("#222d2a");bt.fog=new Jo("#54645d",.018);const En=new m0({canvas:ge("world"),antialias:!0});En.setPixelRatio(Math.min(devicePixelRatio,1.5));En.setSize(innerWidth,innerHeight);En.shadowMap.enabled=!0;En.shadowMap.type=Hc;En.toneMapping=Vc;En.toneMappingExposure=1.15;const ln=new Wr;let Zi=0,ji=24;const qr=new y0(En);qr.addPass(new S0(bt,ln));const H_=new as(new we(innerWidth,innerHeight),.25,.65,1.05);qr.addPass(H_);bt.add(new Th("#c5d9d4","#343a2b",2.2));const Pn=new Ch("#ffe0a5",3);Pn.position.set(-14,24,7);Pn.castShadow=!0;Pn.shadow.mapSize.set(2048,2048);Object.assign(Pn.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:80});Pn.shadow.normalBias=.035;Pn.shadow.bias=-1e-4;bt.add(Pn);const In=new re(new zs(.25,.29,32),new cs({color:"#e0d49b",transparent:!0,opacity:.8,side:Jt}));In.rotation.x=-Math.PI/2;In.visible=!1;bt.add(In);const bd=120,Td=new Bt,Ur=new Float32Array(bd*3);for(let i=0;i<bd;i++)Ur[i*3]=(Math.random()-.5)*26,Ur[i*3+1]=Math.random()*6+.3,Ur[i*3+2]=(Math.random()-.5)*24;Td.setAttribute("position",new tn(Ur,3));const cl=new yh(Td,new cd({color:"#e3d7a7",size:.035,transparent:!0,opacity:.5}));bt.add(cl);const We=new A0,Gs=new C0(bt);let ii="hands",es=0;const Os=Fo.map(i=>i.id),vt=new u_(We,{onSelectTool:(i,e)=>{dl(i),e&&(es=Os.indexOf(e),ge("active-seed-label").textContent=un[e]?.name||e)}}),wd=new m_(We,{onFocusChange:i=>{i&&Ft.clear()}}),At=new k_(We);At.onStandUpRequest=()=>Ws();const Qe=xd(We.guestId,We.nickname);Qe.position.set(0,0,3);bt.add(Qe);const Et=R0();Et.position.set(.8,0,4);bt.add(Et);const Oo="afterlight-save";function z_(){try{const i=localStorage.getItem(Oo),e=i?JSON.parse(i):{};return Ic(e.exploration)}catch{return Ic({})}}function Ad(i){try{const e=localStorage.getItem(Oo),t=e?JSON.parse(e):{};t.exploration=i,localStorage.setItem(Oo,JSON.stringify(t))}catch{}}let yn=z_();const Bs=I0(),ks=B0();bt.add(Bs.group);bt.add(ks.group);const Rs=new Map,br={market:"M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24",garden:"M24 24H130V96H24Z M38 36H116V84H38Z M65 24V96",court:"M24 24H130V96H24Z M130 49H160V76H130 M65 24V13H87V24",canal:"M24 24H130V96H24Z M24 60H130 M70 24V96 M84 24V96",station:"M24 24H130V96H24Z M24 40H130 M24 75H130 M65 40V75",aqueduct:"M24 24H130V96H24Z M24 35H130 M45 24V96 M80 24V96 M105 24V96",caldera:"M24 24H130V96H24Z M50 35H100V80H50Z M75 35V80 M24 60H50 M100 60H130",understory:"M24 24H130V96H24Z M35 40H65V75H35Z M90 40H120V75H90Z M65 60H90",saltworks:"M24 24H130V96H24Z M35 30H115V55H35Z M35 65H115V90H35Z M75 24V96",rooftops:"M24 24H130V96H24Z M40 45H110 M75 24V96 M40 30L75 60L110 30 M40 90L75 60L110 90",mangrove:"M24 24H130V96H24Z M24 50Q75 20 130 50 M24 70Q75 100 130 70 M75 35V85",trestle:"M24 24H130V96H24Z M24 35H130 M24 85H130 M35 35L55 85 M55 35L75 85 M75 35L95 85 M95 35L115 85",foundry:"M24 24H130V96H24Z M40 35H70V65H40Z M85 35H115V65H85Z M24 75H130","frost-spire":"M24 24H130V96H24Z M75 25L115 60L75 95L35 60Z M75 25V95 M35 60H115",delta:"M24 24H130V96H24Z M24 45C55 40 85 75 130 55 M24 75C60 70 90 90 130 85 M70 24V96",archives:"M24 24H130V96H24Z M35 35H115 M35 50H115 M35 65H115 M35 80H115 M75 24V96","kiln-terrace":"M24 24H130V96H24Z M45 35H105V85H45Z M75 45A15 15 0 1 0 75 75A15 15 0 1 0 75 45 M24 60H45 M105 60H130",theater:"M24 24H130V96H24Z M42 34H112 M42 38H112 M34 52H62 M70 52H120 M34 68H62 M70 68H120 M34 84H120"};function V_(i){if(Rs.has(i))return Rs.get(i);const e=Vt.find(f=>f.id===i);if(!e)return null;const t=yn.completed.includes(i),n=r_(e,t),s=Vt.findIndex(f=>f.id===i),r=Vt[(s-1+Vt.length)%Vt.length],a=Vt[(s+1)%Vt.length];n.items.push({type:"district_gate",x:-10.7,z:0,targetDistrict:r.id,title:`Gate to ${r.name}`,sub:`Westbound: ${r.district}`}),n.items.push({type:"district_gate",x:10.7,z:0,targetDistrict:a.id,title:`Gate to ${a.name}`,sub:`Eastbound: ${a.district}`}),n.items.push({type:"market_gate",x:0,z:8.8,targetDistrict:"market",title:"Return to Market Court",sub:"Trade produce & visit your garden"});const o=new hn(1,1,1),l=new et({color:"#c5b478",emissive:"#857545",emissiveIntensity:.6}),c=new et({color:"#2b3d3e",roughness:.6});for(const f of[-10.7,10.7]){const p=new re(o,c);p.position.set(f,2.5,0),p.scale.set(.6,5,2.4),n.group.add(p);const g=new re(o,l);g.position.set(f,1.8,0),g.scale.set(.1,3.4,1.8),n.group.add(g)}const d=new re(o,c);d.position.set(0,2.5,8.8),d.scale.set(2.4,5,.6),n.group.add(d);const u=new re(o,l);return u.position.set(0,1.8,8.8),u.scale.set(1.8,3.4,.1),n.group.add(u),bt.add(n.group),Rs.set(i,n),Bo.has(i)&&n.setNodeStates?.(Bo.get(i)),n}let it=null,_n=null,Qt=null,Yn=!1,Vn=0,Fc=null;const Ft=new Set,Oc=new Ih,G_=new ti(new D(0,1,0),0),za=new D;function Dt(i,e,t="FIELD NOTE"){const n=ge("toast-title"),s=ge("toast-body"),r=ge("toast-type"),a=ge("toast");n&&(n.textContent=i),s&&(s.textContent=e),r&&(r.textContent=t),a&&(a.style.opacity="1"),clearTimeout(Fc),Fc=setTimeout(()=>{a&&(a.style.opacity="0")},5e3)}let wt=Xt.MARKET,jt=Bs,$n=Dr("market"),Vr=null;const Bo=new Map;let Mi={mill:{status:"broken",required:{...Md},contributed:{copper:0,timber:0,glass:0},restoredAt:null}};function Ei(i){Ws(),wt=i;const e=Xt.isGarden(i),t=i===Xt.MARKET,n=Vt.find(s=>s.id===i);if(Bs.group.visible=t,ks.group.visible=e,Rs.forEach((s,r)=>{s.group.visible=r===i}),n){jt=V_(i),$n=Dr(i),yn.visited.includes(i)||yn.visited.push(i),yn.current=i,Ad(yn),bt.fog.color.set(n.color),bt.background.set(n.color).multiplyScalar(.45),Pn.color.set(n.sun);const r=n.spawn||[-9,0];Qe.position.set(r[0],0,r[1]),Et.position.set(r[0]+.8,0,r[1]+1),ge("location-title").textContent=n.name,ge("district-tag").textContent=n.district,ge("map-label").textContent="• "+n.subtitle,ge("map-path").setAttribute("d",br[i]||br.court),Dt(n.name,n.description,"ARRIVED IN DISTRICT")}else e?(jt=ks,$n=Dr(i),Qe.position.set(-9.5,0,0),Et.position.set(-8.7,0,1),bt.fog.color.set("#54645d"),bt.background.set("#222d2a"),Pn.color.set("#ffe0a5"),ge("location-title").textContent="Your Market Garden",ge("district-tag").textContent="CULTIVATION DISTRICT / 02",ge("map-label").textContent="• MARKET GARDEN 02",ge("map-path").setAttribute("d",br.garden),Dt("Your Garden Plot","Tend your garden beds and harvest fresh crops.")):(jt=Bs,$n=Dr("market"),Qe.position.set(0,0,3),Et.position.set(.8,0,4),bt.fog.color.set("#54645d"),bt.background.set("#222d2a"),Pn.color.set("#ffe0a5"),ge("location-title").textContent="The Market Court",ge("district-tag").textContent="MARKET SOCIAL DISTRICT / 01",ge("map-label").textContent="• MARKET COURT 01",ge("map-path").setAttribute("d",br.market),Dt("The Market Court","Trade produce, buy seeds, and fulfill contracts."));_n=null,In.visible=!1,Gs.clear(),At.setWatchMode(!1),We.joinRoom(i),At.setRoomActive(i===Xt.THEATER),i===Xt.THEATER&&At.setWatchMode(!0)}const Va=new URLSearchParams(window.location.search).get("room");let ko=Xt.THEATER;Va==="garden"?ko=Xt.gardenFor(We.guestId):Va&&(ko=Va);Ei(ko);We.on(Ne.WELCOME,i=>{ge("net-indicator").textContent="● ONLINE",ge("net-indicator").style.color="#85e0a3",i.player&&(vt.updatePlayerHUD(i.player),Qe.userData.updateNickname(i.player.nickname)),i.weather&&Pd(i.weather),i.prices&&vt.updateMarketView(i.prices),i.orderBook&&vt.updateMarketView(null,i.orderBook),i.contracts&&vt.updateContractsView(i.contracts),i.theater&&At.applyState(i.theater,i.serverNow||Date.now())});We.on(Ne.PRESENCE_JOIN,i=>{i.player&&i.player.id!==We.guestId&&(Gs.setPlayer(i.player),Dt("Gardener Arrived",`${i.player.nickname} entered the area.`))});We.on(Ne.PRESENCE_LEAVE,i=>{i.playerId&&Gs.removePlayer(i.playerId)});We.on(Ne.PRESENCE_UPDATE,i=>{if(Array.isArray(i.players))for(const e of i.players)e.id!==We.guestId&&Gs.setPlayer(e)});We.on(Ne.GARDEN_STATE,i=>{Vr=i.beds,ks.setFixtures?.(i.fixtures||[]),ks.update(0,i.beds)});We.on(Ne.INVENTORY_STATE,i=>{i.player&&(vt.updatePlayerHUD(i.player),vt.updateInventoryView(i.player),vt.updateMarketView(),vt.updateMachineShopView())});We.on(Ne.MARKET_UPDATE,i=>{i.prices&&vt.updateMarketView(i.prices),i.orderBook&&vt.updateMarketView(null,i.orderBook)});We.on(Ne.CONTRACT_UPDATE,i=>{i.contracts&&vt.updateContractsView(i.contracts)});We.on(Ne.NODE_STATE,i=>{!i.roomId||!Array.isArray(i.nodes)||(Bo.set(i.roomId,i.nodes),Rs.get(i.roomId)?.setNodeStates?.(i.nodes))});We.on(Ne.THEATER_STATE,i=>{i.theater&&At.applyState(i.theater,i.serverNow||Date.now())});We.on(Ne.MACHINE_UPDATE,i=>{if(!i.machines?.mill)return;const e=Mi?.mill?.status;Mi=i.machines,vt.updateMachineShopView(Mi),Bs.setMachineState?.(Mi),Rd(),e==="broken"&&Mi.mill.status==="restored"&&(Yr([523,659,784,1046]),Dt("The Great Mill Restored","The sails turn above the court. Wheat becomes flour for everyone.","RESTORATION COMPLETE"))});We.on(Ne.TRADE_FILLED,i=>{const e=i.trade;Yr([523,659,784]),Dt("Order Filled!",`Traded ${e.quantity}x ${e.cropId} @ ${e.price} ⛁`)});We.on(Ne.WEATHER_UPDATE,i=>{Pd(i.weather)});We.on(Ne.ACTION_RESULT,i=>{i.success?(Yr([440,554]),Dt(i.title||"Garden",i.message)):i.message&&Dt(i.title||"Notice",i.message)});let Cd=null;function Rd(){const i=ge("mill-panel");if(!i)return;const e=wt===Xt.MARKET;if(i.style.display=e?"block":"none",Cd=wt,!e)return;const t=Mi?.mill,n=ge("mill-status-tag"),s=ge("mill-progress-lines");if(!t)return;if(t.status==="restored"){n.textContent="RESTORED",n.className="mill-tag restored",s.innerHTML='<div class="mill-line">✦ The sails are turning. It grinds wheat into flour for everyone.</div>';return}n.textContent="BROKEN",n.className="mill-tag broken";let r=0,a=0,o="";for(const[l,c]of Object.entries(t.required||{})){const d=Math.min(t.contributed?.[l]||0,c);r+=d,a+=c,o+=`<div class="mill-line"><span>${l}</span><b>${d}/${c}</b></div>`}o=`<div class="mill-line mill-total"><span>restoration</span><b>${r}/${a}</b></div>`+o,s.innerHTML=o}We.on(Ne.EMOTE_BROADCAST,i=>{Dt("Emote",`${i.nickname} waves warmly! 👋`),Yr([659,880])});We.on(Ne.WELCOME,()=>wd.setConnected(!0));function Pd(i){const e=i==="rain"?"☔":i==="drizzle"?"☂":"☼",t=i==="rain"?"HEAVY RAIN":i==="drizzle"?"RAINY MIST":"CLEAR AFTER RAIN";ge("weather-icon").textContent=e,ge("weather-text").textContent=t,bt.fog.density=i==="rain"?.026:i==="drizzle"?.022:.016}We.connect();let Tt=null,ws=!0;function Yr(i=[440,554,660]){!Tt||ws||i.forEach((e,t)=>{const n=Tt.createOscillator(),s=Tt.createGain();n.type="sine",n.frequency.value=e,s.gain.setValueAtTime(0,Tt.currentTime+t*.08),s.gain.linearRampToValueAtTime(.04,Tt.currentTime+.02+t*.08),s.gain.exponentialRampToValueAtTime(.001,Tt.currentTime+.8+t*.08),n.connect(s).connect(Tt.destination),n.start(Tt.currentTime+t*.08),n.stop(Tt.currentTime+.9+t*.08)})}ge("sound").onclick=async()=>{if(ws=!ws,!Tt){Tt=new AudioContext;const i=Tt.createBuffer(1,Tt.sampleRate*2,Tt.sampleRate),e=i.getChannelData(0);for(let s=0;s<e.length;s++)e[s]=(Math.random()*2-1)*.04;const t=Tt.createBufferSource();t.buffer=i,t.loop=!0;const n=Tt.createBiquadFilter();n.type="lowpass",n.frequency.value=320,t.connect(n).connect(Tt.destination),t.start()}await(ws?Tt.suspend():Tt.resume()),ge("sound").textContent=ws?"♫  Sound off":"♫  Sound on"};function dl(i){ii=i,document.querySelectorAll(".tool-btn").forEach(t=>{t.classList.toggle("active",t.dataset.tool===i)}),Qe.userData.setWateringCan(i==="water");const e={hands:"Tool: Hands & Inspect · Read crop stats",hoe:"Tool: Hoe · Till uncultivated beds",seed:`Tool: Seeds (${un[Os[es]].name}) · Plant in tilled beds`,water:"Tool: Watering Can · Replenish soil moisture",harvest:"Tool: Harvest Shears · Collect mature produce",sprinkler:"Tool: Sprinkler Kit · Press E on a bed to place (waters it + neighbors)"};ge("hud-tool-hint").textContent=e[i]||i}document.querySelectorAll(".tool-btn").forEach(i=>{i.onclick=()=>{const e=i.dataset.tool;e==="seed"&&ii==="seed"&&(es=(es+1)%Os.length,ge("active-seed-label").textContent=un[Os[es]].name),dl(e)}});function W_(i){Qt||(Qt={x:i.x,z:i.z+.55,rotY:Math.PI},Qe.position.set(Qt.x,0,Qt.z),Qe.rotation.y=Qt.rotY,Qe.userData.legs.forEach(e=>{e.rotation.x=-1.35}),_n=null,In.visible=!1,We.sendMovement(Qe.position.x,Qe.position.z,Qe.rotation.y,!1,!0),Dt("Take a Seat","You settle into the velvet. Press E or a movement key to stand.","THE ORPHEUM"),At.setSeated(!0),At.setWatchMode(!0))}function Ws(){Qt&&(Qt=null,Qe.position.y=0,Qe.userData.legs.forEach(i=>{i.rotation.x=0}),We.sendMovement(Qe.position.x,Qe.position.z,Qe.rotation.y,!1,!1),At.setSeated(!1),At.setWatchMode(!1))}function Id(){if(!Yn){if(Qt){Ws();return}if(!it){Dt("No Target Nearby","Approach a garden bed, market stall, or gateway to interact.");return}if(it.type==="garden_gate"){Ei(Xt.gardenFor(We.guestId));return}if(it.type==="market_gate"){Ei(Xt.MARKET);return}if(it.type==="district_gate"){Ei(it.targetDistrict);return}if(it.type==="landmark"){const i=Vt.find(e=>e.id===wt);i&&(yn.completed.includes(wt)?Dt(i.done,"This sector has already been restored.","RESTORATION ACTIVE"):(yn.completed.push(wt),Ad(yn),jt.update?.(Vn,!0),Dt(i.done,i.message,"RESTORATION COMPLETE")));return}if(it.type==="field-note"){Dt(it.sub,it.body,"FIELD NOTE");return}if(it.type==="seat"){W_(it);return}if(it.type==="theater_screen"){At.openControls();return}if(it.type==="market_board"){vt.openMarket();return}if(it.type==="seed_vendor"){vt.openSeedVendor();return}if(it.type==="contracts_board"){vt.openContracts();return}if(it.type==="material_node"){We.send(Ne.NODE_HARVEST,{actionId:`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,nodeId:it.nodeId});return}if(it.type==="mill"){Mi?.mill?.status==="restored"?We.send(Ne.MACHINE_MILL,{actionId:`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,quantity:1}):vt.openMachineShop();return}if(it.type==="machine_bench"){vt.openMachineShop();return}if(it.type==="bed"){const i=it.bedIndex,e=Vr?Vr[i]:null;if(ii==="hoe"){We.sendGardenAction("till",i);return}if(ii==="seed"){const t=Os[es];We.sendGardenAction("plant",i,t);return}if(ii==="water"){We.sendGardenAction("water",i);return}if(ii==="harvest"){We.sendGardenAction("harvest",i);return}if(ii==="sprinkler"){We.sendGardenAction("place_sprinkler",i);return}if(!e||e.stage===zn.EMPTY)Dt(`Bed #${i+1}`,"Unprepared soil. Select your Hoe (2) to till.");else if(e.stage===zn.PREPARED)Dt(`Bed #${i+1}`,"Prepared soil. Select Seeds (3) to sow.");else{const t=un[e.cropId],n=["Empty","Prepared","Seed","Sprout","Juvenile","Mature","Harvestable"];Dt(`${t?.name||"Crop"} (Bed #${i+1})`,`Stage: ${n[e.stage]||"Growing"} · Moisture: ${Math.round((e.moisture||0)*100)}% · Health: ${Math.round((e.health||1)*100)}%`)}}}}ge("interact").onclick=Id;ge("btn-inventory").onclick=()=>vt.openInventory();ge("btn-market").onclick=()=>vt.openMarket();function Ld(){Yn=!0,Ft.clear(),X_(),ge("district-dialog").showModal()}function Ps(){Yn=!1,ge("district-dialog").close()}function X_(){const i=ge("district-list");i.innerHTML="";const e=document.createElement("button");e.className="district-choice"+(wt==="market"?" active":""),e.innerHTML=`
    <div>
      <span class="micro">SOCIAL TRADING HUB</span>
      <strong>The Market Court</strong>
    </div>
    <span class="desc">Exchange harvests, buy seeds, and fulfill town contracts.</span>
    <span class="status-badge ${wt==="market"?"current":"visited"}">${wt==="market"?"CURRENT":"CIVIC HUB"}</span>
  `,e.onclick=()=>{Ps(),Ei("market")},i.appendChild(e);const t=Xt.gardenFor(We.guestId),n=document.createElement("button");n.className="district-choice"+(wt===t?" active":""),n.innerHTML=`
    <div>
      <span class="micro">CULTIVATION PLOT</span>
      <strong>Your Market Garden</strong>
    </div>
    <span class="desc">Till soil, sow crops, water, and harvest fresh produce.</span>
    <span class="status-badge ${wt===t?"current":"visited"}">${wt===t?"CURRENT":"PERSONAL PLOT"}</span>
  `,n.onclick=()=>{Ps(),Ei(t)},i.appendChild(n),Vt.forEach(s=>{const r=wt===s.id,a=yn.completed.includes(s.id),o=yn.visited.includes(s.id),l=document.createElement("button");l.className="district-choice"+(r?" active":"");let c="unexplored",d="UNEXPLORED";r?(c="current",d="CURRENT"):a?(c="restored",d="✦ RESTORED"):o&&(c="visited",d="VISITED"),l.innerHTML=`
      <div>
        <span class="micro">${s.district}</span>
        <strong>${s.name}</strong>
      </div>
      <span class="desc">${s.description}</span>
      <span class="status-badge ${c}">${d}</span>
    `,l.onclick=()=>{Ps(),Ei(s.id)},i.appendChild(l)})}ge("btn-travel").onclick=Ld;ge("close-districts").onclick=Ps;ge("district-dialog").addEventListener("cancel",i=>{i.preventDefault(),Ps()});ge("btn-emote").onclick=()=>We.sendEmote("wave");ge("btn-edit-nick").onclick=()=>vt.openProfile();function $r(){Yn=!Yn,Ft.clear(),Yn?ge("settings-dialog").showModal():ge("settings-dialog").close()}ge("settings").onclick=$r;ge("resume").onclick=$r;ge("settings-dialog").addEventListener("cancel",i=>{i.preventDefault(),$r()});ge("camera").onclick=()=>{Zi=(Zi+1)%3};ge("quality").onchange=()=>{En.setPixelRatio(Math.min(devicePixelRatio,Number(ge("quality").value))),Kr()};ge("atmosphere").onchange=()=>{cl.visible=ge("atmosphere").checked};window.addEventListener("keydown",i=>{if(!(i.target.matches("input,select,textarea")&&i.code!=="Escape")){if(i.code==="KeyT"){Ld();return}if((i.code==="Enter"||i.code==="Slash")&&!document.querySelector("dialog[open]")){i.preventDefault(),wd.focusInput(i.code==="Slash"?"/":"");return}if(["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6"].includes(i.code)){dl({Digit1:"hands",Digit2:"hoe",Digit3:"seed",Digit4:"water",Digit5:"harvest",Digit6:"sprinkler"}[i.code]);return}["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(i.code)&&i.preventDefault(),Ft.add(i.code),!i.repeat&&(i.code==="KeyE"&&Id(),i.code==="KeyI"&&vt.openInventory(),i.code==="KeyM"&&vt.openMarket(),i.code==="KeyV"&&We.sendEmote("wave"),i.code==="KeyC"&&ge("camera").click(),i.code==="Escape"&&!Yn&&(At.isWatching()?At.setWatchMode(!1):$r()))}});window.addEventListener("keyup",i=>Ft.delete(i.code));window.addEventListener("blur",()=>Ft.clear());En.domElement.addEventListener("pointerdown",i=>{if(!Yn&&(Qt?Ws():At.isWatching()&&At.setWatchMode(!1),Oc.setFromCamera(new we(i.clientX/innerWidth*2-1,-(i.clientY/innerHeight)*2+1),ln),Oc.ray.intersectPlane(G_,za))){const e=a_($n,za.x,za.z);_n=new D(e.x,0,e.z),In.position.set(_n.x,.24,_n.z),In.visible=!0}});En.domElement.addEventListener("wheel",i=>{i.preventDefault(),ji=zu.clamp(ji+i.deltaY*.015,18,34),Kr()},{passive:!1});function q_(i,e,t,n){const s=i.position.x,r=i.position.z;zr($n,jt.obstacles,s+e,r)&&(i.position.x+=e),zr($n,jt.obstacles,i.position.x,r+t)&&(i.position.z+=t);const a=Math.hypot(i.position.x-s,i.position.z-r)>1e-4;return a?(i.rotation.y=Math.atan2(e,t),i.position.y=Math.sin(Vn*13)*.025,i.userData.legs.forEach((o,l)=>{o.rotation.x=Math.sin(Vn*13+l*Math.PI)*.45})):(i.position.y=0,i.userData.legs.forEach(o=>{o.rotation.x*=.8})),a}function Kr(){const i=innerWidth/innerHeight;ln.left=-ji*i/2,ln.right=ji*i/2,ln.top=ji/2,ln.bottom=-ji/2,ln.near=.1,ln.far=150,ln.updateProjectionMatrix(),En.setSize(innerWidth,innerHeight),qr.setSize(innerWidth,innerHeight)}window.addEventListener("resize",Kr);Kr();const Tr=new D(0,0,0);let Bc=performance.now();function Dd(i){requestAnimationFrame(Dd);const e=Math.min((i-Bc)/1e3,.04);if(Bc=i,!Yn){Vn+=e;let n=0,s=0;(Ft.has("KeyW")||Ft.has("ArrowUp"))&&s--,(Ft.has("KeyS")||Ft.has("ArrowDown"))&&s++,(Ft.has("KeyA")||Ft.has("ArrowLeft"))&&n--,(Ft.has("KeyD")||Ft.has("ArrowRight"))&&n++,Qt&&(n||s)?(Ws(),n=0,s=0):!Qt&&(n||s)&&At.isWatching()&&At.setWatchMode(!1);let r=new D(n,0,s);r.lengthSq()>0?(_n=null,In.visible=!1,r.applyAxisAngle(new D(0,1,0),[Math.PI/4,0,-Math.PI/4][Zi])):_n&&(r.subVectors(_n,Qe.position),r.y=0,r.length()<.15&&(_n=null,In.visible=!1,r.set(0,0,0))),r.normalize().multiplyScalar(e*(Ft.has("ShiftLeft")||Ft.has("ShiftRight")?5:2.8));const a=Qt?!1:q_(Qe,r.x,r.z);_n&&!a&&(_n=null,In.visible=!1),We.sendMovement(Qe.position.x,Qe.position.z,Qe.rotation.y,a,!!Qt);const o=new D().subVectors(Qe.position,Et.position);if(o.y=0,o.length()>1.3){o.normalize().multiplyScalar(e*3.5);const u=Et.position.x,f=Et.position.z;zr($n,jt.obstacles||[],u+o.x,f)&&(Et.position.x+=o.x),zr($n,jt.obstacles||[],Et.position.x,f+o.z)&&(Et.position.z+=o.z),Math.hypot(Et.position.x-u,Et.position.z-f)>1e-4?(Et.rotation.y=Math.atan2(o.x,o.z),Et.position.y=Math.sin(Vn*12)*.025,Et.userData.legs?.forEach((g,x)=>g.rotation.x=Math.sin(Vn*12+x*Math.PI)*.45)):(Et.position.y=0,Et.userData.legs?.forEach(g=>g.rotation.x*=.8))}else Et.position.y=0,Et.userData.legs?.forEach(u=>u.rotation.x*=.8);Gs.update(e,Vn);const l=yn.completed.includes(wt);jt.update(Vn,Vr||l),it=null;let c=2.4;for(const u of jt.items||[]){const f=Math.hypot(Qe.position.x-u.x,Qe.position.z-u.z);f<c&&(it=u,c=f)}if(it)ge("action-title").textContent=it.title,ge("action-sub").textContent=it.sub,ge("interact").style.borderColor="#c6b47a99";else{const u=Vt.find(f=>f.id===wt);u?(ge("action-title").textContent=u.name,ge("action-sub").textContent="Explore sector with Kiln · Press T to travel"):(ge("action-title").textContent=wt===Xt.MARKET?"Market Court":"Your Market Garden",ge("action-sub").textContent=wt===Xt.MARKET?"Explore stalls or travel to outer districts":"Approach beds to till, plant, water, and harvest"),ge("interact").style.borderColor="#9faa9240"}jt.previewCoverage?.(ii==="sprinkler"&&it?.type==="bed"?it.bedIndex:null),wt!==Cd&&Rd();const d=o_($n,Qe.position.x,Qe.position.z);ge("map-player").setAttribute("cx",d.cx),ge("map-player").setAttribute("cy",d.cy),cl.rotation.y=Math.sin(Vn*.03)*.04}const t=[[21,25,26],[0,29,31],[-23,27,25]];if(Tr.lerp(new D(Qe.position.x*.14,.1,Qe.position.z*.14),.025),ln.position.set(Tr.x+t[Zi][0],t[Zi][1],Tr.z+t[Zi][2]),ln.lookAt(Tr),qr.render(),wt===Xt.THEATER&&jt?.screenQuad){const n=jt.screenQuad.map(r=>{const a=r.clone().project(ln);return{x:(a.x*.5+.5)*innerWidth,y:(-a.y*.5+.5)*innerHeight,z:a.z}}),s=n.every(r=>r.z>-1&&r.z<1)&&n.every(r=>r.x>-innerWidth&&r.x<innerWidth*2&&r.y>-innerHeight&&r.y<innerHeight*2);At.updateScreenQuad(s?n.map(({x:r,y:a})=>({x:r,y:a})):null)}else At.updateScreenQuad(null)}requestAnimationFrame(Dd);ge("loading").style.opacity="0";setTimeout(()=>ge("loading").remove(),800);
