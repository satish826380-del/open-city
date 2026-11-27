import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {startNet} from './net.js?v=17';
import {buildMetro} from './metro.js?v=2';
import {makeFacades} from './facades.js?v=2';
import {makeTrees} from './trees.js?v=1';
import {dressCity,HINDI_SHOPS} from './dressing.js?v=6';
import {buildNavapur,navapurGround,ringLane,WORLD,CAFE} from './navapur.js?v=20';
import {initSocial,ROLES,roleInfo} from './social.js?v=3';
import {vehicle as VEH,initVehicles} from './vehicles.js?v=3';
import {windowGlow} from './citykit.js?v=6';
import {buildBoards} from './boards.js?v=3';
import {SPOTS,spotByCode} from './spots.js?v=2';
import {loadVRM,attachVRM,driveVRM,recolor,vrmSlots,vrmProgress} from './vrm.js?v=19';
import {loadMocap,mocapPose,MX} from './mocap.js?v=5';
import {currentUser,onAuth,logout,loginEmail,signUpEmail,resetPassword,setNewPassword,playerStatus,isAdmin} from './auth.js?v=3';
{
const T=THREE,$=id=>document.getElementById(id),R=Math.random,PI=Math.PI;
const TOUCH=matchMedia('(pointer:coarse)').matches,MOBILE=TOUCH||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const QS={low:{pr:MOBILE?Math.min(devicePixelRatio,1.25):1,shadow:false,smap:1024,bloom:false,npc:MOBILE?10:16,far:MOBILE?560:850,fog:MOBILE?.0032:.0017},med:{pr:MOBILE?Math.min(devicePixelRatio,1.75):Math.min(Math.max(devicePixelRatio,1.25),1.5),shadow:true,smap:2048,bloom:true,npc:26,far:1500,fog:.00085},high:{pr:Math.min(devicePixelRatio,2),shadow:true,smap:2048,bloom:true,npc:38,far:2500,fog:.001}};
let Q=store.get('mn2_q')||(TOUCH?'low':'med');if(!QS[Q])Q='med';
// ================= renderer =================
const renderer=new T.WebGLRenderer({canvas:$('c'),antialias:true,powerPreference:'high-performance'});window.__MN_LOW=MOBILE;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.66;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const ANISO=Math.min(16,renderer.capabilities.getMaxAnisotropy());
const scene=new T.Scene();scene.fog=new T.FogExp2(0xc8dbe8,.0018);
const camera=new T.PerspectiveCamera(62,1,.1,MOBILE?1100:2500);
const crt=new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType,samples:4});const composer=new EffectComposer(renderer,crt);composer.addPass(new RenderPass(scene,camera));
const gtao=new GTAOPass(scene,camera,innerWidth,innerHeight);gtao.updateGtaoMaterial({radius:1.6,distanceExponent:1.6,thickness:1.4,scale:1.15});gtao.blendIntensity=.9;gtao.overrideVisibility=function(){const c=this._visibilityCache;this.scene.traverse(o=>{c.set(o,o.visible);if(o.isPoints||o.isLine||o.isSprite||(o.material&&o.material.transparent))o.visible=false})};composer.addPass(gtao);
const bloom=new UnrealBloomPass(new T.Vector2(512,512),.3,.45,1.0);composer.addPass(bloom);composer.addPass(new OutputPass());
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},vig:{value:.22},sat:{value:1.28},con:{value:1.08},warm:{value:.03}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform sampler2D tDiffuse;uniform float vig,sat,con,warm;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec3 col=c.rgb;float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,sat);col=(col-.5)*con+.5;col.r+=warm;col.b-=warm*.7;float d=distance(vUv,vec2(.5));col*=1.-vig*smoothstep(.3,.9,d);gl_FragColor=vec4(clamp(col,0.,1.),c.a);}'});composer.addPass(grade);
function resize(){renderer.setSize(innerWidth,innerHeight,false);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);
// ================= lights + sky =================
const hemi=new T.HemisphereLight(0xcfe6ff,0x5a4a35,.6);scene.add(hemi);
const sun=new T.DirectionalLight(0xffe9c4,2.6);sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:400});scene.add(sun,sun.target);
const sky=new Sky();sky.scale.setScalar(4000);scene.add(sky);const SU=sky.material.uniforms;SU.turbidity.value=7;SU.rayleigh.value=1.4;SU.mieCoefficient.value=.003;SU.mieDirectionalG.value=.82;
const envScene=new T.Scene();const sky2=new Sky();sky2.scale.setScalar(4000);envScene.add(sky2);const pmrem=new T.PMREMGenerator(renderer);let envRT=null,envT=-10;
const starG=new T.BufferGeometry();{const p=[];for(let i=0;i<1500;i++){const a=R()*PI*2,b=Math.acos(R()*.95);p.push(Math.sin(b)*Math.cos(a)*1800,Math.cos(b)*1800,Math.sin(b)*Math.sin(a)*1800)}starG.setAttribute('position',new T.Float32BufferAttribute(p,3))}
const stars=new T.Points(starG,new T.PointsMaterial({color:0xffffff,size:2.2,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));scene.add(stars);
const moon=new T.Mesh(new T.SphereGeometry(30,24,16),new T.MeshBasicMaterial({color:0xf3efe0,fog:false}));scene.add(moon);
// ================= texture helpers =================
function ctex(w,h,draw,srgb=true){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);if(srgb)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=ANISO;return t}
function speck(x,w,h,n,cols,sz=2,a=.18){for(let i=0;i<n;i++){x.globalAlpha=.05+R()*a;x.fillStyle=cols[i%cols.length];const s=sz*(.4+R()*1.2);x.fillRect(R()*w,R()*h,s,s)}x.globalAlpha=1}
const BUMP=ctex(256,256,(x,w,h)=>{x.fillStyle='#808080';x.fillRect(0,0,w,h);speck(x,w,h,9000,['#000','#fff'],2,.5)},false);
function asphalt(lines){return ctex(512,512,(x,w,h)=>{x.fillStyle='#3a3b3f';x.fillRect(0,0,w,h);speck(x,w,h,14000,['#222','#555','#4a4a4a','#2c2c2c'],2.4,.35);
 for(let i=0;i<6;i++){x.globalAlpha=.12;x.fillStyle=R()<.5?'#1d1d1f':'#4d4d50';x.beginPath();x.ellipse(R()*w,R()*h,20+R()*60,10+R()*30,R()*3,0,7);x.fill()}x.globalAlpha=1;
 x.strokeStyle='rgba(20,20,20,.5)';x.lineWidth=1.2;for(let i=0;i<5;i++){x.beginPath();let px=R()*w,py=R()*h;x.moveTo(px,py);for(let k=0;k<8;k++){px+=(R()-.5)*30;py+=(R()-.5)*30;x.lineTo(px,py)}x.stroke()}
 if(lines){x.fillStyle='rgba(238,238,230,.85)';x.fillRect(250,0,12,170);x.fillRect(250,256,12,170);x.fillStyle='rgba(240,240,232,.7)';x.fillRect(22,0,9,h);x.fillRect(w-31,0,9,h);x.globalAlpha=.25;x.fillStyle='#111';x.fillRect(110,0,40,h);x.fillRect(w-150,0,40,h);x.globalAlpha=1;speck(x,w,h,2500,['#3a3b3f'],3,.6)}})}
const TEX={road:asphalt(true),inter:asphalt(false),
 tile:ctex(256,256,(x,w,h)=>{x.fillStyle='#8f887c';x.fillRect(0,0,w,h);for(let i=0;i<8;i++)for(let j=0;j<8;j++){const s=w/8;x.fillStyle=`hsl(${25+R()*15},${10+R()*10}%,${48+R()*10}%)`;x.fillRect(i*s+1,j*s+1,s-2,s-2)}speck(x,w,h,6000,['#5b564c','#c8c2b6','#3d3a33'],2,.35)}),
 grass:ctex(512,512,(x,w,h)=>{x.fillStyle='#578636';x.fillRect(0,0,w,h);
  for(let i=0;i<46;i++){x.globalAlpha=.32;x.fillStyle=['#3b6823','#78a646','#93a052'][i%3];x.beginPath();x.ellipse(R()*w,R()*h,14+R()*40,10+R()*28,R()*3,0,7);x.fill()}
  x.globalAlpha=.75;x.lineCap='round';for(let i=0;i<9000;i++){const px=R()*w,py=R()*h,l=4+R()*8;x.strokeStyle=['#3d6a23','#6a9a3c','#82ad4c','#4c7c2e','#9cbc63'][i%5];x.lineWidth=1+R()*1.4;x.beginPath();x.moveTo(px,py);x.lineTo(px+(R()-.5)*5,py-l);x.stroke()}x.globalAlpha=1}),
 gravel:ctex(256,256,(x,w,h)=>{x.fillStyle='#6f665b';x.fillRect(0,0,w,h);speck(x,w,h,15000,['#4b443c','#8d857a','#a39a8c','#3a342e'],3,.6)}),
 roof:ctex(256,256,(x,w,h)=>{x.fillStyle='#7d7a74';x.fillRect(0,0,w,h);speck(x,w,h,8000,['#5a5853','#96928a'],3,.4);for(let i=0;i<5;i++){x.globalAlpha=.2;x.fillStyle='#3f3d39';x.fillRect(R()*w,R()*h,40+R()*80,20+R()*50)}x.globalAlpha=1})};
// 20 varied facade textures (colours x window styles), see facades.js
const FACADE=makeFacades(ctex,speck,R);
const SHOPMATS=[0,1,2].map(()=>{const map=ctex(512,256,(x,w,h)=>{x.fillStyle='#d8cfc0';x.fillRect(0,0,w,h);speck(x,w,h,3000,['#000','#fff'],2,.12);
 for(let s=0;s<2;s++){const x0=s*256;x.fillStyle='#6d6a64';x.fillRect(x0+8,40,10,h-40);x.fillRect(x0+238,40,10,h-40);
  const open=R()<.7;if(open){const g=x.createLinearGradient(0,60,0,h);g.addColorStop(0,'#f6d9a0');g.addColorStop(1,'#a3743d');x.fillStyle=g;x.fillRect(x0+18,60,220,h-60);for(let i=0;i<5;i++){x.fillStyle=`hsl(${R()*360},60%,55%)`;x.fillRect(x0+30+i*40,120+R()*40,24,60)}x.fillStyle='#8d8a84';x.fillRect(x0+18,40,220,26);for(let y=42;y<66;y+=4){x.fillStyle='#6c6964';x.fillRect(x0+18,y,220,1)}}
  else{x.fillStyle='#8d8a84';x.fillRect(x0+18,40,220,h-40);for(let y=44;y<h;y+=6){x.fillStyle='#6c6964';x.fillRect(x0+18,y,220,2)}speck(x,256,h,600,['#5b2b1b'],3,.3)}}});
 const emi=ctex(512,256,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);x.fillStyle='#6b4a20';x.fillRect(18,66,220,h-66);x.fillRect(274,66,220,h-66)});
 return new T.MeshStandardMaterial({map,emissiveMap:emi,emissive:0xffffff,emissiveIntensity:.2,roughness:.85})});
const M={};function mat(c,r=.8,m=0,extra){const k=c+'_'+r+'_'+m;if(!extra&&M[k])return M[k];const x=new T.MeshStandardMaterial(Object.assign({color:c,roughness:r,metalness:m},extra||{}));if(!extra)M[k]=x;return x}
function uvBox(g,w,h,d,su,sv){const uv=g.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*dims[f][0]/su,uv.getY(i)*dims[f][1]/sv)}return g}
function mesh(geo,m,x=0,y=0,z=0,parent=scene,cast=true,recv=true){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=recv;parent.add(o);return o}
function bx(w,h,d,m,x,y,z,parent,cast){return mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent,cast)}
function sign(text,bg,fg,h=1.1,emis=.6){const c=document.createElement('canvas'),x=c.getContext('2d');x.font='800 64px "Baloo 2",sans-serif';const tw=Math.ceil(x.measureText(text).width)+60;c.width=tw;c.height=96;x.fillStyle=bg;x.fillRect(0,0,tw,96);x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=4;x.strokeRect(6,6,tw-12,84);x.fillStyle=fg;x.font='800 64px "Baloo 2",sans-serif';x.textBaseline='middle';x.fillText(text,30,52);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=ANISO;const m=new T.MeshStandardMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:emis,roughness:.6});SIGNMATS.push(m);const p=new T.Mesh(new T.PlaneGeometry(h*tw/96,h),m);return p}
function bubble(text){const c=document.createElement('canvas'),x=c.getContext('2d');x.font='700 40px "Baloo 2",sans-serif';const w=Math.ceil(x.measureText(text).width)+40;c.width=w;c.height=64;x.fillStyle='rgba(255,250,240,.95)';x.beginPath();x.roundRect?x.roundRect(0,0,w,64,20):x.rect(0,0,w,64);x.fill();x.fillStyle='#141414';x.font='700 40px "Baloo 2",sans-serif';x.textBaseline='middle';x.fillText(text,20,34);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:t,fog:false}));s.scale.set(w/64*.38,.38,1);return s}
const SIGNMATS=[];
// ================= world layout =================
const ROADS=[-120,-40,40,120],RW=14,LIM=170,SEA=165;
const EDGES=[[-LIM,-127],[-113,-47],[-33,33],[47,113],[127,SEA]];
const COLL=[],OCOLL=[],LOTS=[],LAMPS=[],TREES=[],BLOCKS=[];
const addColl=(x0,x1,z0,z1,h=3)=>COLL.push({x0,x1,z0,z1,h});
// The base ground sits just under the paved areas and lawns. Those used to carry a polygon offset that pushed them
// behind it when seen at a low angle, so paving and grass only appeared as you walked up. Their real height is enough.
const soilTex=ctex(256,256,(x,w,h)=>{x.fillStyle='#6f9248';x.fillRect(0,0,w,h);speck(x,w,h,11000,['#587a36','#86a85a','#a39a68','#4d7030'],3,.5)});soilTex.repeat.set(1/9,1/9);
const groundMat=new T.MeshStandardMaterial({map:soilTex,roughness:1});
const ground=mesh(new T.PlaneGeometry(1200,606+SEA),groundMat,0,-.02,(-600+SEA+6)/2,scene,false);ground.rotation.x=-PI/2;
// roads
const roadMat=new T.MeshStandardMaterial({map:TEX.road,bumpMap:BUMP,bumpScale:.6,roughness:.9}),interMat=new T.MeshStandardMaterial({map:TEX.inter,bumpMap:BUMP,bumpScale:.6,roughness:.9});
for(const r of ROADS){const lenZ=LIM+SEA;const gz=new T.PlaneGeometry(RW,lenZ);gz.attributes.uv.array.forEach((v,i,a)=>{if(i%2)a[i]=v*lenZ/RW});const mz=mesh(gz,roadMat,r,.01,(SEA-LIM)/2,scene,false);mz.rotation.x=-PI/2;
 const gx=new T.PlaneGeometry(RW,2*LIM);gx.attributes.uv.array.forEach((v,i,a)=>{if(i%2)a[i]=v*2*LIM/RW});const mx=mesh(gx,roadMat,0,.012,r,scene,false);mx.rotation.set(-PI/2,0,PI/2)}
for(const c of ROADS)for(const r of ROADS){const q=mesh(new T.PlaneGeometry(RW,RW),interMat,c,.02,r,scene,false);q.rotation.x=-PI/2}
// zebra crossings
{const zg=new T.BoxGeometry(.55,.02,3),zm=mat(0xc9c9c0,.75);const P=[];for(const c of ROADS)for(const r of ROADS){if(c<-130)continue;for(const s of[-1,1]){for(let i=-6;i<=6;i+=1.1){P.push([c+i,r+s*9,0]);P.push([c+s*9,r+i,1])}}}
 const im=new T.InstancedMesh(zg,zm,P.length);const o=new T.Object3D();P.forEach((p,i)=>{o.position.set(p[0],.03,p[1]);o.rotation.y=p[2]?PI/2:0;o.updateMatrix();im.setMatrixAt(i,o.matrix)});im.receiveShadow=true;scene.add(im)}
// blocks / sidewalks
const tileMat=new T.MeshStandardMaterial({map:TEX.tile,bumpMap:BUMP,bumpScale:.4,roughness:.92}),curbMat=mat(0x8f8a80,.9);
const SHOPS_EN=['Sharma General Store','Irani Cafe','Bombay Tailors','Laxmi Medical','Pav Bhaji Corner','Cyber Cafe','Ganesh Sweets','Mobile Repair','Kohinoor Hotel','Patel Grocery','Joshi Clinic','Om Sai Xerox','New Fashion','Hari Om Vegetables','Royal Salon','Amrut Dairy'];
const SHOPS=SHOPS_EN;
const SIGNCOL=['#c0392b','#1e5fa8','#127a5a','#7b2d8b','#d35400','#141414'];
let shopIdx=0;
function slab(x0,x1,z0,z1){const w=x1-x0,d=z1-z0;const g=uvBox(new T.BoxGeometry(w,.25,d),w,.25,d,2,2);mesh(g,tileMat,(x0+x1)/2,.125,(z0+z1)/2,scene,false)}
let plotNo=0;
function building(cx,cz,w,d,floors,pi,frontSign){
 if(plotNo++%2){const H0=Math.max(3,Math.min(5,floors))*3.1+3;addColl(cx-w/2,cx+w/2,cz-d/2,cz+d/2,H0);LOTS.push({x:cx,z:cz,w,d,H:H0,front:frontSign,floors,fresh:true});return}
const fm=FACADE[Math.floor(R()*FACADE.length)],H=floors*3.2;
 {const SM=SHOPMATS[shopIdx%3];mesh(uvBox(new T.BoxGeometry(w,4,d),w,4,d,8,4),[SM,SM,mat(0x6b6760,.9),mat(0x6b6760,.9),SM,SM],cx,2.25,cz)}
 const roofM=new T.MeshStandardMaterial({map:TEX.roof,roughness:.95});
 mesh(uvBox(new T.BoxGeometry(w,H,d),w,H,d,16,12.8),[fm,fm,roofM,roofM,fm,fm],cx,4.25+H/2,cz);
 bx(w+.4,.9,.3,mat(0xb5b0a6,.9),cx,4.25+H+.45,cz-d/2,scene,false);bx(w+.4,.9,.3,mat(0xb5b0a6,.9),cx,4.25+H+.45,cz+d/2,scene,false);
 bx(w+.6,.25,1.6,mat(0x5a5650,.8),cx,4.3,cz+frontSign*(d/2+.8),scene,true);
 addColl(cx-w/2,cx+w/2,cz-d/2,cz+d/2,4.25+H);LOTS.push({x:cx,z:cz,w,d,H:4.25+H,front:frontSign,floors});
 const s=sign(SHOPS[shopIdx%SHOPS.length],SIGNCOL[shopIdx%SIGNCOL.length],'#fff',1);shopIdx++;s.position.set(cx,3.55,cz+frontSign*(d/2+.03));if(frontSign<0)s.rotation.y=PI;s.scale.multiplyScalar(Math.min(1,(w*.8)/s.geometry.parameters.width));scene.add(s)}
EDGES.forEach((ex,i)=>EDGES.forEach((ez,j)=>{const[x0,x1]=ex,[z0,z1]=ez;const b={i,j,x0,x1,z0,z1};BLOCKS.push(b);
 slab(x0,x1,z0,z1);if(i===0)return;
 if(i===2&&j===2){const g=mesh(new T.PlaneGeometry(x1-x0-6,z1-z0-6),new T.MeshStandardMaterial({map:TEX.grass,roughness:1}),0,.26,0,scene,false);g.rotation.x=-PI/2;TEX.grass.repeat.set(12,12);
  const p=mesh(new T.PlaneGeometry(3,20),mat(0xb59b6a,1),-8,.27,-6,scene,false);p.rotation.x=-PI/2;
  for(let k=0;k<16;k++){const a=k/16*PI*2,tx=Math.cos(a)*24,tz=Math.sin(a)*24;if(tz>10&&Math.abs(tx)<12)continue;TREES.push([tx,tz,1+R()*.3])}return}
 if(i===3&&j===2){market(x0,x1,z0,z1);return}
 const nx=(x1-x0)>50?2:1,nz=(z1-z0)>50?2:1,lw=(x1-x0-8)/nx,ld=(j===4?.6:1)*(z1-z0-8)/nz;
 for(let a=0;a<nx;a++)for(let c=0;c<nz;c++){const cx=x0+4+lw*(a+.5),cz=z0+4+ld*(c+.5);const w=Math.max(8,Math.floor((lw-3)/4)*4),d=Math.max(8,Math.floor((ld-3)/4)*4);
  const floors=j===4?2+Math.floor(R()*2):2+Math.floor(R()*6);building(cx,cz,w,d,floors,i*3+j*5+a+c*2,nz===1?(j===4?-1:1):(c===0?-1:1))}
 // road-side trees
 for(const[tx,tz]of[[x0+.8,(z0+z1)/2+4],[x1-.8,(z0+z1)/2-4],[(x0+x1)/2+9,z0+.8],[(x0+x1)/2-9,z1-.8]])if(tz<SEA-3)TREES.push([tx,tz,.85+R()*.35])}));
function market(x0,x1,z0,z1){const stripe=ctex(64,64,(x,w,h)=>{for(let i=0;i<8;i++){x.fillStyle=i%2?'#f5f0e1':['#c0392b','#1e7b4a','#e67e22','#2c5fa8'][Math.floor(R()*4)];x.fillRect(i*8,0,8,h)}});
 const crate=new T.BoxGeometry(.9,.5,.6),fruit=new T.SphereGeometry(.13,8,6);const fruits=[];
 for(let x=x0+10;x<x1-6;x+=14)for(let z=z0+8;z<z1-10;z+=15){bx(7,1,3.4,mat(0x7a5230,.9),x,.75,z);const aw=bx(8.4,.12,4.6,new T.MeshStandardMaterial({map:stripe,roughness:.9}),x,3.3,z+.3);aw.rotation.x=.12;
  for(const dx of[-3.9,3.9])for(const dz of[-1.8,2.2])bx(.12,3.2,.12,mat(0x555555,.5,.6),x+dx,1.85,z+dz,scene,false);
  for(let k=0;k<6;k++){const c=mesh(crate,mat(0xa97c50,.9),x-2.6+k*1.05,1.5,z-.6);const col=[0xd62f2f,0xf29e1f,0x5a9e2f,0xf2d21f,0x7a2a6a][(k+Math.floor(x))%5];for(let f=0;f<6;f++)fruits.push([x-2.6+k*1.05+(f%3-1)*.22,1.82,z-.6+(f<3?-.12:.12),col])}addColl(x-3.5,x+3.5,z-1.7,z+1.7)}
 const im=new T.InstancedMesh(fruit,mat(0xffffff,.5),fruits.length);const o=new T.Object3D();fruits.forEach((f,i)=>{o.position.set(f[0],f[1],f[2]);o.updateMatrix();im.setMatrixAt(i,o.matrix);im.setColorAt(i,new T.Color(f[3]))});im.castShadow=true;scene.add(im)}
// trees: branches + leaf-card crowns, three species (trees.js)
makeTrees(scene,TREES.map(([x,z,s])=>[x,.25,z,s]),{rnd:R,onTree:(x,z)=>addColl(x-.3,x+.3,z-.3,z+.3,2)});
// street lamps (instanced) with sodium light pool
const lampHeadMat=new T.MeshStandardMaterial({color:0x333333,emissive:0xffb35c,emissiveIntensity:0,roughness:.5});
{const P=[];for(const r of ROADS)for(let s=-150;s<=150;s+=40){P.push([r+8.2,s+6,-1]);if(s+26<SEA-2)P.push([s+26,r+8.2,0])}
 const poles=P.filter(p=>p[0]>-140&&p[1]<SEA-1);for(let x=-150;x<=150;x+=22)poles.push([x,SEA+5.2,0]);const pg=new T.CylinderGeometry(.09,.13,8,8);pg.translate(0,4,0);const ag=new T.BoxGeometry(.12,.12,2.2);const hg=new T.BoxGeometry(.5,.18,.9);
 const pI=new T.InstancedMesh(pg,mat(0x3d3f42,.5,.7),poles.length),aI=new T.InstancedMesh(ag,mat(0x3d3f42,.5,.7),poles.length),hI=new T.InstancedMesh(hg,lampHeadMat,poles.length);const o=new T.Object3D();
 poles.forEach(([x,z,ax],i)=>{const rot=ax?-PI/2:PI;o.rotation.set(0,ax?PI/2:0,0);o.position.set(x,.25,z);o.updateMatrix();pI.setMatrixAt(i,o.matrix);const dx=ax?-1:0,dz=ax?0:-1;o.position.set(x+dx*1,8.1,z+dz*1);o.updateMatrix();aI.setMatrixAt(i,o.matrix);o.position.set(x+dx*2,8,z+dz*2);o.updateMatrix();hI.setMatrixAt(i,o.matrix);LAMPS.push([x+dx*2,z+dz*2])});
 pI.castShadow=true;scene.add(pI,aI,hI)}
const POOL=[];for(let i=0;i<(MOBILE?3:6);i++){const l=new T.PointLight(0xffa64d,0,26,1.6);l.position.y=7.5;scene.add(l);POOL.push(l)}
// traffic signals
const SIGM={xg:new T.MeshStandardMaterial({color:0x113311,emissive:0x2ecc71,emissiveIntensity:0}),xr:new T.MeshStandardMaterial({color:0x331111,emissive:0xff3b30,emissiveIntensity:0}),zg:new T.MeshStandardMaterial({color:0x113311,emissive:0x2ecc71,emissiveIntensity:0}),zr:new T.MeshStandardMaterial({color:0x331111,emissive:0xff3b30,emissiveIntensity:0})};
for(const c of ROADS)for(const r of ROADS){if(c<-130)continue;for(const[ox,oz,ax]of[[8.3,8.3,'z'],[-8.3,-8.3,'x']]){const x=c+ox,z=r+oz;bx(.18,5,.18,mat(0x2b2b2b,.5,.6),x,2.75,z,scene,true);const hd=bx(.45,1.1,.4,mat(0x1a1a1a,.6),x,5.4,z,scene,true);
 const sr=new T.SphereGeometry(.13,10,8);const face=ax==='z'?[0,0,-oz/Math.abs(oz)*.22]:[-ox/Math.abs(ox)*.22,0,0];mesh(sr,SIGM[ax+'r'],x+face[0],5.65,z+face[2],scene,false);mesh(sr,SIGM[ax+'g'],x+face[0],5.15,z+face[2],scene,false)}}
// sea, promenade, tetrapods
function waterNormal(){const S=256,d=new Uint8Array(S*S*4);const hgt=(x,y)=>Math.sin(x*2*PI*3/S)+Math.sin(y*2*PI*5/S+x*2*PI*2/S)*.7+Math.sin((x+y)*2*PI*7/S)*.4+Math.sin((x-2*y)*2*PI*4/S)*.3;
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){const dx=hgt(x+1,y)-hgt(x-1,y),dy=hgt(x,y+1)-hgt(x,y-1);const n=new T.Vector3(-dx*2,-dy*2,1).normalize();const i=(y*S+x)*4;d[i]=(n.x*.5+.5)*255;d[i+1]=(n.y*.5+.5)*255;d[i+2]=(n.z*.5+.5)*255;d[i+3]=255}
 const t=new T.DataTexture(d,S,S);t.wrapS=t.wrapT=T.RepeatWrapping;t.needsUpdate=true;t.repeat.set(40,20);return t}
const WN=waterNormal();const seaMat=new T.MeshStandardMaterial({color:0x1a5566,roughness:.08,metalness:.1,normalMap:WN,normalScale:new T.Vector2(.5,.5)});
const sea=mesh(new T.PlaneGeometry(1400,500),seaMat,0,-.4,SEA+252,scene,false);sea.rotation.x=-PI/2;
bx(2*LIM+30,.25,6,tileMat,0,.125,SEA+3,scene,false);
{const pg=new T.CylinderGeometry(.05,.05,1,6);const n=Math.floor((2*LIM+20)/2);const im=new T.InstancedMesh(pg,mat(0x9aa0a6,.3,.9),n);const o=new T.Object3D();for(let i=0;i<n;i++){o.position.set(-LIM-10+i*2,.75,SEA+6);o.updateMatrix();im.setMatrixAt(i,o.matrix)}scene.add(im);
 for(const y of[.75,1.2])bx(2*LIM+20,.06,.06,mat(0x9aa0a6,.3,.9),0,y,SEA+6,scene,false);
 const tg=new T.DodecahedronGeometry(1.1,0);const tn=220;const ti=new T.InstancedMesh(tg,mat(0x8a877f,.95),tn);for(let i=0;i<tn;i++){o.position.set(-LIM-10+R()*(2*LIM+20),-.2+R()*.6,SEA+7.5+R()*5);o.rotation.set(R()*3,R()*3,R()*3);o.scale.setScalar(.7+R()*.5);o.updateMatrix();ti.setMatrixAt(i,o.matrix)}ti.castShadow=ti.receiveShadow=true;scene.add(ti)}
const mdS=sign('Marine Drive','#141414','#ffd21f',1.4,.8);mdS.position.set(0,3.6,SEA+1.6);mdS.rotation.y=PI;scene.add(mdS);bx(.15,3,.15,mat(0x333333),-mdS.geometry.parameters.width/2+.4,1.6,SEA+1.6);
// station, track, train
const gravel=mesh(new T.PlaneGeometry(14,2*LIM),new T.MeshStandardMaterial({map:TEX.gravel,roughness:1}),-150.5,.27,0,scene,false);gravel.rotation.x=-PI/2;TEX.gravel.repeat.set(3,60);
{const sl=new T.BoxGeometry(2.8,.15,.3),n=Math.floor(2*LIM/.75);const im=new T.InstancedMesh(sl,mat(0x6b6258,.9),n);const o=new T.Object3D();for(let i=0;i<n;i++){o.position.set(-149.5,.33,-LIM+i*.75);o.updateMatrix();im.setMatrixAt(i,o.matrix)}im.receiveShadow=true;scene.add(im);
 for(const dx of[-150.25,-148.75])bx(.08,.14,2*LIM,mat(0x8b8f94,.3,.9),dx,.45,0,scene,false);
 const cp=new T.CylinderGeometry(.12,.15,7.5,8);cp.translate(0,3.75,0);const ci=new T.InstancedMesh(cp,mat(0x5a5f63,.5,.7),12);for(let i=0;i<12;i++){o.position.set(-156,.25,-LIM+i*30);o.updateMatrix();ci.setMatrixAt(i,o.matrix)}ci.castShadow=true;scene.add(ci);bx(.03,.03,2*LIM,mat(0x222222),-149.5,6.6,0,scene,false)}
bx(6,1,94,tileMat,-140,.75,0,scene,true);bx(6,.2,96,mat(0x8a8f95,.5,.6),-140,6.3,0,scene,true);for(let z=-44;z<=44;z+=11)bx(.25,5.3,.25,mat(0x5a5f63,.5,.6),-140,3.8,z,scene,true);
bx(.2,.06,94,mat(0xffd21f,.6),-142.9,1.26,0,scene,false);
bx(8,6,22,mat(0xc8a87a,.85),-132.5,3.25,0);bx(8.4,.5,22.4,mat(0x8b2d2d,.7),-132.5,6.4,0);addColl(-136.5,-128.5,-11,11,6.5);
const stS=sign('CITY JUNCTION','#ffd21f','#141414',1.3,.5);stS.position.set(-128.4,4.8,0);stS.rotation.y=PI/2;scene.add(stS);
for(const[z0,z1]of[[-LIM,-127],[-113,-47],[-33,33],[47,113],[127,SEA]])addColl(-158,-143.1,z0,z1,1.5);

const coachTex=ctex(1024,256,(x,w,h)=>{x.fillStyle='#eceae4';x.fillRect(0,0,w,h);x.fillStyle='#6a2a5e';x.fillRect(0,170,w,40);x.fillStyle='#e5b63a';x.fillRect(0,210,w,8);x.fillStyle='#6a2a5e';x.fillRect(0,18,w,14);
 for(let i=0;i<3;i++){const dx=60+i*340;x.fillStyle='#2b2a2a';x.fillRect(dx,60,110,190);x.fillStyle='#f2c94c';x.fillRect(dx,60,4,190);x.fillRect(dx+106,60,4,190)}
 for(let i=0;i<14;i++){const wx=190+i*58;if(wx>1000)break;if([400,740].some(d=>wx>d-70&&wx<d+120))continue;x.fillStyle='#1f2a33';x.fillRect(wx,70,40,52);x.fillStyle='rgba(200,200,200,.6)';for(let k=0;k<4;k++)x.fillRect(wx,78+k*12,40,2)}speck(x,w,h,3000,['#555','#000'],2,.15)});
const TRAIN=new T.Group();{const cm=new T.MeshStandardMaterial({map:coachTex,roughness:.5,metalness:.2}),plain=mat(0xdddbd5,.5,.2),roofM=mat(0x8d9096,.4,.6);
 for(let k=0;k<6;k++){const z=(k-2.5)*19.2;mesh(new T.BoxGeometry(3.6,3.7,18.8),[cm,cm,plain,plain,plain,plain],0,2.55,z,TRAIN);const rf=mesh(new T.CylinderGeometry(1.8,1.8,18.6,16,1,false,0,PI),roofM,0,4.25,z,TRAIN);rf.rotation.set(PI/2,0,PI/2);rf.scale.set(1,1,.25);
  for(const bz of[-6.5,6.5])bx(2.6,.7,3,mat(0x2a2a2a,.7,.4),0,.75,z+bz,TRAIN)}
 for(const s of[-1,1]){const fz=s*(2.5*19.2+9.45);bx(3.5,3.6,.15,mat(0xf2c94c,.5),0,2.55,fz,TRAIN);bx(2.6,1,.18,mat(0x1f2a33,.1,.5),0,3.3,fz+s*.02,TRAIN);const hl=bx(.35,.25,.2,new T.MeshStandardMaterial({color:0xffffff,emissive:0xfff2c8,emissiveIntensity:2}),0,4.1,fz+s*.05,TRAIN)}}
TRAIN.position.set(-149.5,0,-300);scene.add(TRAIN);const train={z:-300,dir:1,wait:0,horned:false};
// tapri, vada pav, flat
const TAPRI={x:0,z:28};{bx(6,1.1,1.6,mat(0x7a5230,.85),0,.8,26);bx(7,3.2,.2,mat(0x2d5d8a,.9),0,1.85,21);const tarp=bx(7.6,.08,6.4,mat(0x1f5fbf,.7),0,3.7,24,scene,true);tarp.rotation.x=-.06;
 for(const sx of[-3.6,3.6])for(const sz of[21.2,26.9])bx(.12,3.4,.12,mat(0x4a4a4a,.5,.6),sx,1.95,sz,scene,false);
 const ket=mesh(new T.CylinderGeometry(.22,.28,.45,14),mat(0xb8bcc2,.25,.9),-1.6,1.6,25.6);for(let i=0;i<6;i++)mesh(new T.CylinderGeometry(.05,.04,.11,8),mat(0xd9c9a0,.2,0,{transparent:true,opacity:.8}),-.4+i*.25,1.42,26.4,scene,false);
 bx(3,.45,.5,mat(0x6b4a2a,.9),0,.55,31.5);addColl(-3,3,25,27);addColl(-3.5,3.5,20.8,21.2);
 const s=sign('Raju\'s Tea Stall','#ffd21f','#141414',.9,.5);s.position.set(0,3.2,27.2);scene.add(s)}
const VADA={x:72,z:28.5};{bx(3.2,1,1.6,mat(0xc0392b,.7),72,1.05,28.5);for(const dx of[-1.2,1.2])mesh(new T.CylinderGeometry(.3,.3,.12,12),mat(0x222222,.8),72+dx,.4,29.3).rotation.z=PI/2;
 const um=mesh(new T.ConeGeometry(2.4,.9,12),mat(0xf39c12,.8),72,3.5,28.5);bx(.08,2.6,.08,mat(0x444444),72,2.3,28.5,scene,false);addColl(70.4,73.6,27.7,29.3);
 const s=sign('Vada Pav Center','#e67e22','#fff',.8,.6);s.position.set(72,1.4,29.32);scene.add(s)}
const FLAT={x:-65.5,z:109.5};{const s=sign('Your Home · Flat 302','#19a7a0','#fff',.7,.6);s.position.set(FLAT.x,2.2,107.2);scene.add(s);bx(1.8,2.6,.25,mat(0x5b3a1e,.7),FLAT.x,1.55,106.6,scene,false)}
const GAR={x:-96,z:110.5};
// ================= Navapur districts (see navapur.js) =================
const TICK=[],DMAP={zones:[],lines:[],land:null},EXTRA_PLACES=[];
buildNavapur({scene,ctex,mat,TEX,FACADE,sign,addColl,addOColl,seaMat,roadMat,interMat,R,TICK,DMAP,PLACES:EXTRA_PLACES,ground,sea,LOTS,tileMat});
// light-blue gradient sky dome (replaces the physical sky's look; the physical sky still lights the scene)
const SKY_TOP=new T.Color(0x3d9be6),SKY_HZ=new T.Color(0xa9d6f7);
const skyDome=new T.Mesh(new T.SphereGeometry(2000,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:SKY_TOP},hz:{value:SKY_HZ},sun:{value:new T.Vector3(0,1,0)}},
 vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top,hz,sun;varying vec3 vD;void main(){float h=clamp(vD.y,0.,1.);vec3 c=mix(hz,top,pow(h,.55));float s=max(dot(normalize(vD),normalize(sun)),0.);c+=vec3(1.,.95,.82)*(pow(s,300.)*1.2+pow(s,12.)*.12);if(vD.y<0.)c=hz*.96;gl_FragColor=vec4(c,1.);}'}));
skyDome.renderOrder=-1;if(MOBILE)skyDome.scale.setScalar(.5);skyDome.frustumCulled=false;scene.add(skyDome);sky.visible=false;
TICK.push(()=>{skyDome.position.copy(camera.position);skyDome.material.uniforms.sun.value.copy(sunDir)});
const BENCHES=dressCity({scene,ctex,mat,TEX,sign,addColl,LOTS,ROADS,LIM,SEA,R,TICK})||[];
// ================= people =================
const SKINS=[0x8d5524,0xa8693a,0xc68642,0x6f4521,0xe0ac69];
const TOPS=[0xf5f5f0,0x2c5fa8,0xc0392b,0x1e7b4a,0xf2c94c,0x7b2d8b,0xe67e22,0x2b2b2b,0x8fb8c9,0xe84393];
const BOTS=[0x22324a,0x1b1b1b,0x8c7a5b,0x4a5a6a,0xe9e4d8];
const GEO={};const gcap=(r,l)=>GEO['c'+r+l]||(GEO['c'+r+l]=new T.CapsuleGeometry(r,l,4,10));const gsph=(r)=>GEO['s'+r]||(GEO['s'+r]=new T.SphereGeometry(r,16,12));
const VCM=MOBILE?new T.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:0}):new T.MeshPhysicalMaterial({vertexColors:true,roughness:.65,metalness:0,sheen:.3,sheenRoughness:.6,sheenColor:new T.Color(0xffd9b8)});
// warm rim light so skin/cloth pick up the sodium-lamp glow at grazing angles
VCM.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{float rim=pow(1.-saturate(dot(normalize(normal),normalize(vViewPosition))),3.);totalEmissiveRadiance+=vec3(1.,.62,.35)*rim*.06;}')};
const PHONE_G=new T.BoxGeometry(.05,.095,.009),PHONE_M=new T.MeshStandardMaterial({color:0x111111,emissive:0x4aa8ff,emissiveIntensity:.9,roughness:.3});
const PH_SG=new T.PlaneGeometry(.044,.088),PH_CG=new T.CylinderGeometry(.006,.006,.003,10),PH_BODY=new T.MeshStandardMaterial({color:0x2a2c30,roughness:.35,metalness:.6}),PH_SCR=new T.MeshBasicMaterial({color:0x8fd0ff}),PH_CAM=new T.MeshStandardMaterial({color:0x0a0a0a,roughness:.2});
const _wq=new T.Quaternion(),_we=new T.Euler(),_hv1=new T.Vector3(),_hv2=new T.Vector3(),_hv3=new T.Vector3();
function makePhone(){const g=new T.Group(),b=new T.Mesh(PHONE_G,PH_BODY),sc=new T.Mesh(PH_SG,PH_SCR),cm=new T.Mesh(PH_CG,PH_CAM);sc.position.z=.0047;cm.rotation.x=Math.PI/2;cm.position.set(-.013,.035,-.005);g.add(b,sc,cm);return g}
const _m4=new T.Matrix4(),_q4=new T.Quaternion(),_e4=new T.Euler(),_s4=new T.Vector3(),_p4=new T.Vector3();
const HG={sph:new T.SphereGeometry(1,18,14),cap:new T.SphereGeometry(1,18,10,0,PI*2,0,PI*.56),box:new T.BoxGeometry(1,1,1),tor:new T.TorusGeometry(1,.12,8,24)};
const cyl=(a,b)=>HG['c'+a+b]||(HG['c'+a+b]=new T.CylinderGeometry(a,b,1,14));
const lathe=(pts,k)=>HG['l'+k]||(HG['l'+k]=new T.LatheGeometry(pts.map(p=>new T.Vector2(p[0],p[1])),18));
function pc(geo,col,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){const g=geo.clone();g.applyMatrix4(_m4.compose(_p4.set(x,y,z),_q4.setFromEuler(_e4.set(rx,ry,rz)),_s4.set(sx,sy,sz)));const c=new T.Color(col),n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b}g.setAttribute('color',new T.BufferAttribute(a,3));return g}
function part(list,parent){const m=new T.Mesh(mergeGeometries(list),VCM);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
const shade=(c,f)=>{const k=new T.Color(c);k.multiplyScalar(f);return k};
const TORSO_M=[[.001,0],[.15,0],[.152,.07],[.148,.15],[.162,.25],[.186,.35],[.192,.41],[.17,.47],[.1,.515],[.001,.53]],TORSO_F=[[.001,0],[.155,0],[.14,.08],[.128,.16],[.15,.26],[.175,.33],[.168,.4],[.15,.46],[.09,.505],[.001,.52]];
const PELVIS=[[.001,-.12],[.13,-.115],[.158,-.06],[.156,.03],[.148,.1],[.001,.1]];
let BLOB=null;
function blobShadow(root){if(!BLOB){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,4,32,32,31);gr.addColorStop(0,'rgba(0,0,0,.45)');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);
  BLOB={g:new T.PlaneGeometry(.95,.95).rotateX(-PI/2),m:new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4})}}
 const b=new T.Mesh(BLOB.g,BLOB.m);b.position.y=.015;b.renderOrder=1;root.add(b)}
// kurta tails: each flap is half a flared tube, open at the sides; animH swings them so the legs never poke through
function kurtaTails(hips,color){const m=new T.MeshStandardMaterial({color,roughness:.72,side:T.DoubleSide}),edge=new T.MeshStandardMaterial({color:shade(color,.75),roughness:.7});
 return[0,PI].map(mid=>{const g=new T.Group();g.position.y=-.04;g.scale.z=.84;hips.add(g);
  const flap=new T.Mesh(new T.CylinderGeometry(.188,.216,.36,20,1,true,mid-PI*.46,PI*.92),m);flap.position.y=-.18;flap.castShadow=true;g.add(flap);
  const hem=new T.Mesh(new T.CylinderGeometry(.2165,.218,.022,20,1,true,mid-PI*.46,PI*.92),m.clone());hem.material.color.copy(edge.color);hem.position.y=-.35;g.add(hem);return g})}
function human(o){const root=new T.Group(),sk=o.skin,tp=o.top,bt=o.bottom,hr=o.hair||0x15110e,sh=o.shoes||0x2a211b,lip=shade(o.skin,.72).lerp(new T.Color(0x8a3a3a),.25),f=!!o.female,dark=shade(o.skin,.85);
 const hips=new T.Group();hips.position.y=.95;root.add(hips);
 const pel=[pc(lathe(PELVIS,'p'),bt,0,0,0,1,1,.74)];if(!o.kurti)pel.push(pc(HG.tor,0x3b2a1e,0,.085,0,.148,.148,.11,PI/2));
 if(o.kurti)pel.push(pc(cyl(.16,f?.27:.24),tp,0,-.2,0,1,f?.62:.82,1));part(pel,hips);
 const spine=new T.Group();spine.position.y=.08;hips.add(spine);
 const sp=[pc(lathe(f?TORSO_F:TORSO_M,f?'tf':'tm'),tp,0,0,0,1,1,.7),pc(HG.tor,tp,0,.51,0,.075,.075,.06,PI/2),pc(cyl(.048,.056),sk,0,.58,0,1,.14,1)];
 if(!f&&!o.vest)for(let i=0;i<4;i++)sp.push(pc(HG.sph,shade(tp,1.25),0,.12+i*.09,.128+(i>1?.006:0),.009,.009,.009));
 if(o.vest)sp.push(pc(HG.box,sk,0,.43,.09,.18,.12,.02));
 if(f&&o.dupatta)sp.push(pc(HG.box,o.dupatta,.02,.3,.13,.07,.5,.012,0,0,.45),pc(HG.box,o.dupatta,-.12,.28,-.1,.07,.55,.012,0,0,-.3));
 if(o.bag)sp.push(pc(HG.box,o.bag,0,.3,-.16,.24,.3,.11),pc(HG.box,shade(o.bag,.7),0,.38,-.1,.25,.04,.04));
 part(sp,spine);
 const head=new T.Group();head.position.y=.7;spine.add(head);
 const hd=[pc(HG.sph,sk,0,.02,0,.096,.118,.106),pc(HG.sph,sk,0,-.045,.018,.078,.072,.085),pc(HG.sph,dark,.098,.005,-.005,.014,.028,.02),pc(HG.sph,dark,-.098,.005,-.005,.014,.028,.02),
  pc(cyl(.004,.019),dark,0,-.005,.104,1,.052,1,1.35),pc(HG.box,lip,0,-.058,.092,.04,.011,.012)];
 const iris=new T.Color(o.eye||0x4a2c17),pu=[],ld=[];
 for(const s of[-1,1]){hd.push(pc(HG.sph,0xf1ede4,s*.037,.017,.088,.016,.012,.01),pc(HG.sph,0xffffff,s*.037+.0035,.0205,.1015,.0017,.0017,.0013),pc(HG.box,hr,s*.037,.044,.098,.034,.007,.008,0,0,s*-.12));
  pu.push(pc(HG.sph,iris,s*.037,.017,.0975,.0098,.0098,.004),pc(HG.sph,0x050505,s*.037,.017,.0995,.0047,.0047,.003));
  ld.push(pc(HG.sph,sk,s*.037,0,.092,.0195,.0145,.011))}
 hd.push(pc(HG.cap,hr,0,.03,-.008,.104,f?.125:.118,.114));if(!f)hd.push(pc(HG.box,hr,0,.075,-.075,.17,.06,.06));
 if(o.stache)hd.push(pc(HG.box,hr,0,-.036,.101,.052,.011,.012));if(o.beard)hd.push(pc(HG.sph,hr,0,-.07,.04,.08,.05,.075));
 if(f){hd.push(pc(HG.sph,hr,0,-.03,-.075,.1,.12,.06));if(o.bun)hd.push(pc(HG.sph,hr,0,.0,-.13,.055,.055,.05));else hd.push(pc(cyl(.07,.04),hr,0,-.22,-.085,1,.28,.45));hd.push(pc(HG.sph,0xc81e5a,0,.06,.1,.006,.006,.004))}
 if(o.cap)hd.push(pc(cyl(.1,.105),o.cap,0,.115,0,1,.07,1.05),pc(HG.box,o.cap,0,.1,.1,.17,.012,.09));
 if(o.topi)hd.push(pc(HG.box,0xf4f4ee,0,.125,0,.2,.06,.1));
 part(hd,head);
 const pupils=part(pu,head),lidG=new T.Group();lidG.position.y=.017;lidG.visible=false;head.add(lidG);part(ld,lidG);
 const arms=[],legs=[];
 for(const s of[-1,1]){const shd=new T.Group();shd.position.set(s*.205,.44,0);spine.add(shd);const sl=o.longSleeve?tp:sk;
  const ua=[pc(HG.sph,tp,0,0,0,.062,.062,.062),pc(cyl(.051,.043),sl,0,-.15,0,1,.27,1)];if(!o.longSleeve&&!o.vest)ua.push(pc(cyl(.064,.058),tp,0,-.07,0,1,.15,1));part(ua,shd);
  const el=new T.Group();el.position.y=-.29;shd.add(el);part([pc(HG.sph,sl,0,0,0,.044,.044,.044),pc(cyl(.041,.032),sl,0,-.125,0,1,.24,1),pc(HG.sph,sk,0,-.29,.006,.034,.055,.022),pc(cyl(.012,.01),sk,-s*.028,-.27,.018,1,.05,1,.4,0,s*.5)],el);arms.push({sh:shd,el,s});
  const hp=new T.Group();hp.position.set(s*.085,0,0);hips.add(hp);part([pc(cyl(.078,.058),bt,0,-.21,0,1,.43,1)],hp);
  const kn=new T.Group();kn.position.y=-.43;hp.add(kn);const sc=f&&o.kurti?o.legging||bt:bt;
  part([pc(HG.sph,sc,0,0,0,.058,.058,.058),pc(cyl(.056,.042),sc,0,-.2,0,1,.4,1),pc(HG.box,sh,0,-.425,.04,.085,.07,.21),pc(HG.box,0x161210,0,-.465,.04,.092,.022,.225),pc(HG.sph,sh,0,-.428,.14,.044,.035,.05)],kn);legs.push({hp,kn,s})}
 const phone=makePhone();phone.position.set(0,-.3,.045);phone.rotation.x=-.9;phone.visible=false;arms[1].el.add(phone);
 const t0=performance.now();
 blobShadow(root);root.userData={hips,spine,head,arms,legs,ph:R()*6,wave:0,pupils,lidG,phone,sa:0,rs:0,ss:0,pw:0,pc:0,yv:0,ly:0,gx:0,gy:0,tgx:0,tgy:0,gt:t0+1000+Math.random()*2000,nb:t0+1500+Math.random()*3500,bs:-1e9,dbl:false,np:t0+6000+Math.random()*18000,ep:0};root.scale.setScalar(o.h||1);return root}
// ===== hero: detailed anime-style male player (black hoodie-jacket, cargo pants, high-tops) =====
// Same rig layout as human(), so animH() drives it unchanged.
HG.cone=new T.ConeGeometry(1,1,7);HG.ring=new T.TorusGeometry(1,.05,6,32);HG.col=new T.TorusGeometry(1,.32,8,24,PI*2-1.3);const HEAD_P=[[.001,-.118],[.03,-.113],[.055,-.095],[.075,-.065],[.09,-.03],[.099,.01],[.101,.045],[.096,.085],[.083,.118],[.058,.142],[.03,.154],[.001,.157]];
const _up=new T.Vector3(0,1,0),_qd=new T.Quaternion(),_ed=new T.Euler(),_dv=new T.Vector3();
// smooth hair lock: an ellipsoid stretched along a direction (no cones, so no spikes)
const HAIR_STYLES=['Soft','Side part','Curly','Long','Buzz cut'],TOP_STYLES=['Hoodie','T-shirt','Shirt','Kurta','Suit','Blazer','Bomber'],BOT_STYLES=['Cargo','Jeans','Shorts','Formal','Joggers'];
function heroHair(hd,hr,st){const E=(x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>hd.push(pc(HG.sph,hr,x,y,z,sx,sy,sz,rx,ry,rz)),hl=shade(hr,1.35);
 if(st===4){hd.push(pc(HG.cap,hr,0,.03,-.006,.105,.132,.116));E(0,0,-.04,.102,.115,.098);return}
 hd.push(pc(HG.cap,hr,0,.04,-.008,.116,.142,.126));E(0,0,-.045,.109,.124,.1);
 if(st===2){for(const el of[.2,.55,.9,1.25,1.5]){const n=Math.max(1,Math.round(13*Math.cos(el)));for(let i=0;i<n;i++){const az=i/n*PI*2+el*.7,ce=Math.cos(el);if(Math.cos(az)>.5&&el<.6)continue;
   E(.118*ce*Math.sin(az),.045+.14*Math.sin(el),-.01+.126*ce*Math.cos(az),.033,.031,.033)}}
  for(let i=0;i<5;i++)E(-.06+i*.03,.1,.088,.027,.025,.023);return}
 E(0,.1,-.014,.114,.068,.12);                                     // smooth rounded crown
 hd.push(pc(HG.sph,hl,-.03,.145,.03,.045,.012,.05,0,0,.25));     // soft shine band
 const sw=st===1?-.45:0,mid=st===3;
 // bangs: flat rounded ellipsoids hugging the forehead, tips ending at the brows
 for(const[x,y,rz,h]of[[-.07,.072,.35,.048],[-.035,.066,.12,.056],[0,.068,-.04,.058],[.035,.066,-.16,.054],[.07,.072,-.36,.048]]){
  const r=mid?(x<0?.25:x>0?-.25:0)+rz*.6:rz+sw;E(x+(st===1?.012:0),y,.094-Math.abs(x)*.28,.031,h,.022,-.28,0,r)}
 if(st===1)E(-.01,.108,.066,.098,.036,.055,-.2,0,-.22);         // swept side-part volume
 for(const s of[-1,1]){E(s*.104,.03,.004,.02,.062,.038,0,0,s*.08);E(s*.095,.055,-.05,.025,.07,.05,0,0,s*.12)} // sideburns + over-ear
 E(0,-.045,-.085,.085,.05,.045);                                  // nape
 if(mid){E(0,-.085,-.075,.112,.16,.072);for(const s of[-1,1])E(s*.098,-.03,-.025,.03,.11,.05,0,0,s*.1)}}
function hero(o){const root=new T.Group(),sk=o.skin,jk=o.top,pn=o.bottom,hr=o.hairC||0x1b1d2b,tee=o.tee||0xd8d8d4,red=0xb3122a,sil=0xc9ccd1,brn=0x5b3a22,rib=shade(jk,.78),dark=shade(sk,.85),lip=shade(sk,.78).lerp(new T.Color(0x9a4a48),.3),shoe=o.shoes||0x17171a,wht=0xf2f2f2,TS=o.topS|0,BS=o.botS|0;
 const hips=new T.Group();hips.position.y=.95;root.add(hips);
 const pel=[pc(lathe(PELVIS,'p'),pn,0,0,0,1.08,1,.72),pc(cyl(.158,.16),brn,0,.06,0,1.08,.035,.76),pc(HG.box,sil,0,.06,.112,.04,.03,.012)];
 if(BS===0)pel.push(pc(HG.ring,sil,-.15,-.02,.055,.035,.055,.035,.2,1.1,0));
 if(TS===3)pel.push(pc(cyl(.166,.188),jk,0,.04,0,1.06,.18,.84),pc(HG.box,shade(jk,.8),0,.04,.152,.018,.17,.006));
 pel.push(pc(HG.sph,pn,0,-.045,-.004,.15,.088,.108)); // seat, so the trousers join smoothly
 part(pel,hips);
 const spine=new T.Group();spine.position.y=.08;hips.add(spine);
 const sp=[pc(cyl(.058,.068),sk,0,.59,0,1,.14,1)];for(const s of[-1,1])sp.push(pc(HG.sph,TS===1?jk:jk,s*.1,.5,-.012,.1,.048,.078,0,0,s*-.35));
 if(TS===0){const jkG=HG.jko||(HG.jko=new T.LatheGeometry(TORSO_M.map(p=>new T.Vector2(p[0],p[1])),24,.42,PI*2-.84));
  sp.push(pc(jkG,jk,0,0,0,1.11,1,.79),pc(lathe(TORSO_M,'tm'),tee,0,0,0,1.07,.99,.76),pc(cyl(.152,.152),rib,0,.02,0,1.13,.05,.81),
   pc(HG.sph,jk,0,.5,-.1,.12,.1,.07),pc(HG.sph,red,0,.55,-.085,.085,.05,.045),pc(HG.col,jk,0,.56,-.012,.085,.08,.065,PI/2-.3,0,PI/2+.65),pc(HG.col,red,0,.575,-.018,.07,.066,.055,PI/2-.3,0,PI/2+.65),
   pc(HG.ring,sil,0,.52,.04,.07,.08,.07,PI/2+.75),pc(HG.box,sil,0,.43,.137,.014,.02,.006,0,0,PI/4));
  for(const s of[-1,1])sp.push(pc(HG.box,shade(tee,.55),s*.022,.43,.132,.008,.07,.006,0,0,s*-.45),pc(HG.box,rib,s*.078,.25,.122,.018,.44,.016),pc(HG.box,sil,s*.07,.25,.131,.004,.42,.004),
   pc(HG.box,sil,s*.12,.36,.112,.05,.006,.006),pc(cyl(.004,.004),0xdedede,s*.045,.39,.142,1,.16,1),pc(HG.sph,sil,s*.045,.305,.142,.006,.01,.006))}
 else if(TS===4||TS===5){ // suit (shirt and tie) or open blazer over a tee
  const inner=TS===4?(o.tee&&o.tee!==0xd8d8d4?o.tee:0xf6f6f2):tee,lapel=shade(jk,1.18),tri=HG.tri||(HG.tri=new T.CylinderGeometry(.001,1,1,3,1));
  sp.push(pc(lathe(TORSO_M,'tm'),jk,0,0,0,1.1,1,.8),pc(cyl(.153,.153),jk,0,-.015,0,1.13,.1,.84));
  const deep=TS===4?.22:.3;sp.push(pc(tri,inner,0,.53-deep/2,.14,TS===4?.062:.075,deep,.034,PI),pc(HG.tor,inner,0,.515,.004,.072,.072,.075,PI/2));
  if(TS===4){const tie=jk===0x7a1f2b?0x1b2a4a:0x8c1c2c;sp.push(pc(HG.box,tie,0,.5,.166,.03,.03,.014),pc(HG.box,tie,0,.41,.171,.027,.15,.008,-.05),pc(tri,tie,0,.322,.171,.02,.035,.006,PI),pc(HG.box,0xf2f2f2,-.085,.38,.158,.045,.012,.006))}
  for(const s of[-1,1])sp.push(pc(HG.box,lapel,s*.056,.43,.158,.036,.2,.008,-.04,0,s*-.34),pc(HG.box,lapel,s*.082,.515,.118,.055,.03,.012,.45,0,s*.4),pc(HG.box,shade(jk,.7),s*.1,.15,.134,.07,.007,.006));
  for(let i=0;i<2;i++)sp.push(pc(HG.sph,0x111114,TS===4?0:.05,.24-i*.075,.15-i*.004,.011,.011,.006))}
 else if(TS===6){ // bomber jacket, half zipped
  const trim=shade(jk,.6);sp.push(pc(lathe(TORSO_M,'tm'),jk,0,0,0,1.15,1,.84),pc(cyl(.16,.152),trim,0,.025,0,1.12,.06,.84),pc(HG.tor,trim,0,.515,.004,.09,.09,.1,PI/2),
   pc(HG.tri||(HG.tri=new T.CylinderGeometry(.001,1,1,3,1)),tee,0,.47,.146,.05,.12,.034,PI),pc(HG.box,sil,0,.23,.166,.008,.36,.006));
  for(const s of[-1,1])sp.push(pc(HG.box,trim,s*.1,.17,.14,.012,.09,.012,0,0,s*.5))}
 else{sp.push(pc(lathe(TORSO_M,'tm'),jk,0,0,0,1.09,1,.77));for(const s of[-1,1])sp.push(pc(HG.sph,shade(jk,1.03),s*.066,.36,.088,.078,.062,.05));
  if(TS===1)sp.push(pc(HG.tor,shade(jk,.82),0,.51,.005,.082,.082,.066,PI/2),pc(cyl(.153,.153),shade(jk,.9),0,.02,0,1.1,.03,.79));
  else{const pl=shade(jk,.88);sp.push(pc(HG.box,pl,0,.27,.13,.026,.42,.006));for(let i=0;i<(TS===3?3:5);i++)sp.push(pc(HG.sph,TS===3?0xd4b26a:0xeeeeee,0,.44-i*.075,.135,.007,.007,.004));
   if(TS===2){for(const s of[-1,1])sp.push(pc(HG.box,jk,s*.035,.53,.07,.06,.035,.012,.5,0,s*.55));sp.push(pc(HG.box,pl,.075,.36,.128,.06,.065,.006))}
   else sp.push(pc(cyl(.058,.062),jk,0,.545,0,1,.045,1))}}
 part(sp,spine);
 const head=new T.Group();head.position.y=.69;head.scale.setScalar(1.05);spine.add(head);
 HG.smile=HG.smile||new T.TorusGeometry(1,.2,6,16,PI*.55);const blush=shade(sk,1).lerp(new T.Color(0xe8837a),.14),hi=shade(sk,1.06);
 const hd=[pc(lathe(HEAD_P,'hd'),sk,0,0,0,1,1,1.08),pc(HG.sph,dark,.1,0,-.005,.014,.028,.02),pc(HG.sph,dark,-.1,0,-.005,.014,.028,.02),

  pc(HG.sph,hi,0,-.016,.1,.006,.016,.008),pc(HG.sph,hi,0,-.03,.1,.009,.007,.008), // nose bridge + tip catch the light
  pc(HG.sph,dark,0,-.037,.097,.011,.0035,.005),                                   // nostril shadow
  pc(HG.smile,lip,0,-.051,.083,.017,.012,.012,0,0,PI*1.225),                      // gentle smile
  pc(HG.sph,blush,.056,-.03,.08,.014,.007,.005),pc(HG.sph,blush,-.056,-.03,.08,.014,.007,.005)];
 const iris=new T.Color(o.eye||0x3d2c26),irisL=iris.clone().lerp(new T.Color(0xc08a52),.45),pu=[],ld=[],EY=.002;
 for(const s of[-1,1]){const x=s*.04;
  hd.push(pc(HG.sph,0xf6f3ee,x,EY,.086,.022,.0175,.01),
   pc(HG.box,0x14110f,x,EY+.0175,.0945,.052,.0065,.006,0,0,s*-.12),pc(HG.box,0x14110f,x+s*.026,EY+.013,.091,.012,.005,.005,0,0,s*-.6), // upper lash + outer flick
   pc(HG.box,shade(sk,.78),x,EY-.0175,.0925,.03,.0022,.004),                       // soft lower lash line
   pc(HG.box,hr,x-s*.004,EY+.039,.095,.026,.008,.007,0,0,s*-.05),pc(HG.box,hr,x+s*.015,EY+.036,.093,.016,.0065,.006,0,0,s*-.42)); // arched brow
  pu.push(pc(HG.sph,iris,x,EY-.001,.0945,.0125,.015,.005),pc(HG.sph,irisL,x,EY-.004,.0962,.008,.009,.003),pc(HG.sph,0x080808,x,EY-.0005,.0975,.0052,.0062,.003),
   pc(HG.sph,0xffffff,x+.0045,EY+.0055,.0995,.0038,.0038,.002),pc(HG.sph,0xffffff,x-.004,EY-.007,.0992,.0018,.0018,.0015));
  ld.push(pc(HG.sph,sk,x,0,.089,.026,.021,.014))}
 if(o.stache)hd.push(pc(HG.box,hr,0,-.04,.093,.046,.009,.01));if(o.beard)hd.push(pc(HG.sph,hr,0,-.075,.035,.078,.05,.07));
 heroHair(hd,hr,o.hairS|0);
 part(hd,head);
 const pupils=part(pu,head),lidG=new T.Group();lidG.position.y=EY;lidG.visible=false;head.add(lidG);part(ld,lidG);
 const arms=[],legs=[],hand=s=>[pc(HG.sph,sk,0,-.297,.004,.027,.05,.04),pc(HG.sph,sk,0,-.34,.01,.024,.038,.036,.22),pc(HG.box,shade(sk,.93),0,-.318,.008,.05,.012,.07,.1),pc(cyl(.013,.01),sk,-s*.006,-.293,.036,1,.052,1,.55,0,0)];
 for(const s of[-1,1]){const shd=new T.Group();shd.position.set(s*.205,.43,0);spine.add(shd);
  if(TS===1)part([pc(HG.sph,jk,0,0,0,.064,.062,.066),pc(cyl(.068,.063),jk,0,-.07,0,1,.15,1),pc(cyl(.054,.046),sk,0,-.17,0,1,.24,1)],shd);
  else part([pc(HG.sph,jk,0,0,0,.063,.061,.065),pc(cyl(.063,.054),jk,0,-.15,0,1,.28,1)].concat(TS===0?[pc(HG.box,red,s*.055,-.1,0,.004,.035,.02)]:[]),shd);
  const el=new T.Group();el.position.y=-.29;shd.add(el);
  if(TS===0)part([pc(HG.sph,jk,0,0,0,.055,.055,.055),pc(cyl(.055,.047),jk,0,-.1,0,1,.2,1),pc(cyl(.043,.043),rib,0,-.215,0,1,.05,1),pc(cyl(.037,.037),0x18181a,0,-.25,0,1,.035,1)].concat(hand(s)),el);
  else if(TS===1)part([pc(HG.sph,sk,0,0,0,.048,.048,.048),pc(cyl(.048,.037),sk,0,-.125,0,1,.24,1),pc(HG.sph,sk,0,-.06,.006,.05,.075,.048)].concat(hand(s)),el);
  else part([pc(HG.sph,jk,0,0,0,.055,.055,.055),pc(cyl(.054,.046),jk,0,-.11,0,1,.22,1),pc(cyl(.044,.044),shade(jk,.88),0,-.225,0,1,.04,1),pc(cyl(.034,.032),sk,0,-.25,0,1,.03,1)].concat(hand(s)),el);
  arms.push({sh:shd,el,s});
  const hp=new T.Group();hp.position.set(s*.094,0,0);hips.add(hp);
  part([pc(HG.sph,pn,-s*.004,-.015,0,.096,.085,.098),pc(HG.box,shade(pn,.82),0,-.215,.087,.005,.38,.006)],hp);
  if(BS===0)part([pc(cyl(.098,.077),pn,0,-.215,0,1,.43,1),pc(HG.box,shade(pn,1.15),s*.078,-.29,0,.02,.12,.095),pc(HG.box,shade(pn,.8),s*.089,-.235,0,.022,.012,.097)],hp);
  else if(BS!==2)part([pc(cyl(.094,.072),pn,0,-.215,0,1,.43,1),pc(HG.box,BS===4?0xf2f2f2:shade(pn,BS===3?1.2:.8),BS===3?0:s*.08,-.215,BS===3?.082:0,BS===4?.012:.004,.42,.006)],hp);
  else part([pc(cyl(.1,.092),pn,0,-.13,0,1,.27,1),pc(cyl(.074,.062),sk,0,-.31,0,1,.24,1)],hp);
  const kn=new T.Group();kn.position.y=-.43;hp.add(kn);
  const foot=[pc(cyl(.052,.058),shoe,0,-.395,.005,1,.06,1.05),pc(HG.box,shoe,0,-.43,.045,.094,.06,.2),pc(HG.sph,shoe,0,-.435,.135,.047,.03,.045),
   pc(HG.box,wht,0,-.468,.045,.1,.026,.235),pc(HG.box,wht,0,-.425,.03,.096,.014,.1,-.35),pc(HG.tor,wht,0,-.368,.005,.054,.054,.054,PI/2),pc(HG.box,0x9a9a9a,0,-.405,.1,.04,.006,.05,.5)];
  if(BS===0)part([pc(HG.sph,pn,0,0,0,.077,.077,.077),pc(cyl(.076,.06),pn,0,-.17,0,1,.34,1),pc(HG.sph,pn,0,-.1,-.018,.072,.1,.066),pc(cyl(.05,.052),shade(pn,.75),0,-.355,0,1,.05,1)],kn);
  else if(BS===3)part([pc(HG.sph,pn,0,0,0,.072,.072,.072),pc(cyl(.071,.056),pn,0,-.19,0,1,.38,1),pc(HG.box,shade(pn,1.2),0,-.19,.064,.004,.36,.006)],kn);
  else if(BS===4)part([pc(HG.sph,pn,0,0,0,.073,.073,.073),pc(cyl(.072,.05),pn,0,-.17,0,1,.34,1),pc(cyl(.052,.047),shade(pn,.7),0,-.355,0,1,.05,1),pc(HG.box,0xf2f2f2,s*.062,-.17,0,.006,.33,.012)],kn);
  else if(BS===1)part([pc(HG.sph,pn,0,0,0,.072,.072,.072),pc(cyl(.071,.058),pn,0,-.17,0,1,.34,1),pc(HG.sph,pn,0,-.1,-.016,.068,.1,.062),pc(cyl(.062,.062),shade(pn,1.12),0,-.35,0,1,.04,1)],kn);
  else part([pc(HG.sph,sk,0,0,0,.063,.063,.063),pc(cyl(.06,.046),sk,0,-.17,0,1,.34,1),pc(HG.sph,sk,0,-.11,-.02,.062,.1,.056),pc(cyl(.046,.048),wht,0,-.345,0,1,.06,1)],kn);
  const ft=new T.Group();ft.position.y=-.39;kn.add(ft);part(foot,ft).geometry.translate(0,.39,0); // ankle joint, so the foot can roll with the Mixamo clip
  legs.push({hp,kn,ft,s})}
 root.userData={male:true,hips,spine,head,arms,legs,ph:R()*6,wave:0};blobShadow(root);
 if(TS===3)root.userData.tails=kurtaTails(hips,jk);
 const phone=makePhone();phone.position.set(0,-.3,.045);phone.rotation.x=-.9;phone.visible=false;arms[1].el.add(phone);
 const t0=performance.now();
 Object.assign(root.userData,{pupils,lidG,phone,sa:0,rs:0,ss:0,pw:0,pc:0,yv:0,ly:0,gx:0,gy:0,tgx:0,tgy:0,gt:t0+1000+Math.random()*2000,nb:t0+1500+Math.random()*3500,bs:-1e9,dbl:false,np:t0+6000+Math.random()*18000,ep:0});
 root.scale.setScalar(o.h||.97);return root}
const sit0=s=>s==='sit';
const NPC_TEE=[0xd8d8d4,0xf2f2ee,0x2c5fa8,0xc0392b,0x1e7b4a,0xf2c94c,0x8e44ad,0x7f8c8d],NPC_JK=[0x2b2b2b,0x3b4a5a,0x6b4a2a,0x22324a,0x8a8f95,0x1e5fa8,0x7a1f2b,0x3d6b4a],NPC_HAIR=[0x15110e,0x1b1d2b,0x3b2314,0x2a1a10,0x9a9a9a];
function npc(look){if(look.female)return human(look);const pick=a=>a[Math.floor(R()*a.length)];const ts=pick([0,1,1,2,2,3,4,5,6]),old=look.hair===0xd0d0d0||look.hair===0xcfcfcf;return hero(Object.assign({},look,{topS:ts,botS:pick([0,1,1,1,2]),hairS:old?4:pick([0,0,1,1,2,4,3]),top:ts===1?pick(NPC_TEE):pick(NPC_JK),tee:pick(NPC_TEE),hairC:look.hair===0xd0d0d0||look.hair===0xcfcfcf?0x9a9a9a:pick(NPC_HAIR),h:(look.h||1)*.97}))}
const GREET=['Namaste! 👋','Hi!','How are you?','Hello!','Good morning! 🙏','What\'s up?','All good?'];
function animH(g,speed,dt,state){g.userData.spd=sit0(state)?0:speed;if(g.userData.far)return;const u=g.userData,now=performance.now(),sit=state==='sit',lp=(a,b,k)=>a+(b-a)*Math.min(1,k);
 // smoothed speed drives everything, so starts, stops and walk<->run blend without snapping
 u.sv=lp(u.sv??speed,speed,dt*7);const sv=u.sv,mv=sv>.15;
 if(mv)u.ph+=dt*(3.3+sv*1.08);
 u.sa=lp(u.sa,Math.min(1,sv/1.6),dt*5);u.rs=lp(u.rs,sv>4.5?1:0,dt*4);u.ss=lp(u.ss,sit?1:0,dt*6);
 const rs=u.rs,a=u.sa*(.8+.45*rs),p=u.ph,idle=(1-Math.min(1,u.sa*3))*(1-u.ss),ss=u.ss;
 let dy=g.rotation.y-u.ly;dy=((dy+PI*3)%(PI*2))-PI;u.ly=g.rotation.y;if(dt>0)u.yv=lp(u.yv,Math.max(-3,Math.min(3,dy/dt)),dt*6);
 if(u.forcePhone&&!sit){u.pc=1;u.fp=1;u.ep=now+1e9}else if(u.fp){u.fp=0;u.pc=0;u.np=now+15000+Math.random()*15000}
 else if(!mv&&!sit&&u.wave<=0){if(!u.pc&&now>u.np){u.pc=1;u.ep=now+3500+Math.random()*3500;u.np=u.ep+9000+Math.random()*22000}else if(u.pc&&now>u.ep)u.pc=0}else u.pc=0;
 u.pw=lp(u.pw,u.pc,dt*4);const pw=u.pw;
 // legs: hip swing + knee that bends smoothly through the swing phase (squared sine, no hard corners)
 for(const L of u.legs){const q=p+(L.s>0?PI:0),hx=-Math.sin(q)*(.5+.12*rs)*a,sw=(Math.sin(q-1.25)+1)/2,kx=a*(.07+(.55+.75*rs)*sw*sw);
  L.hp.rotation.x=lp(hx,-1.45,ss);L.kn.rotation.x=lp(kx,1.5,ss);L.hp.rotation.z=L.s*(.02+.02*rs*a)+L.s*Math.sin(now/2300+u.ph)*.012*idle}
 // arms: counter-swing that trails the legs slightly, elbows relax more on the forward swing
 for(const A of u.arms){const q=p+(A.s>0?0:PI)-.25,f=(Math.sin(q)+1)/2,br=Math.sin(now/1900+u.ph+A.s)*.025*idle;
  A.sh.rotation.x=-Math.sin(q)*.42*a*(1+.35*rs)+br;A.el.rotation.x=-(.16+a*(.22+.85*rs)+.18*a*f);A.sh.rotation.z=A.s*(.075+a*.035+.06*rs)}
 const R1=u.arms[1];
 if(pw>.01){R1.sh.rotation.x=lp(R1.sh.rotation.x,-.75,pw);R1.el.rotation.x=lp(R1.el.rotation.x,-1.75,pw);R1.sh.rotation.z=lp(R1.sh.rotation.z,.05,pw)}
 u.phone.visible=pw>.05&&!u.vrm;
 // wave blends in and out instead of snapping
 if(u.wave>0)u.wave-=dt;u.wv=lp(u.wv||0,u.wave>0?1:0,dt*8);const wv=u.wv;
 if(wv>.01){R1.sh.rotation.x=lp(R1.sh.rotation.x,-2.5,wv);R1.sh.rotation.z=lp(R1.sh.rotation.z,.25,wv);R1.el.rotation.x=lp(R1.el.rotation.x,-.6+Math.sin(now/120)*.35,wv)}
 // body: smooth vertical bob (high at mid-stance), side sway, hip/shoulder counter-twist
 const bob=(1+Math.cos(2*p))/2;
 u.hips.position.y=.95+bob*.03*a*(1+.5*rs)-.015*a-.04*rs-.42*ss;u.hips.position.x=Math.sin(p)*.014*a*(1-.5*rs);
 u.hips.rotation.y=Math.sin(p)*.1*a;u.spine.rotation.y=-Math.sin(p)*.15*a;u.hips.rotation.z=Math.cos(p)*.028*a+Math.sin(now/2300+u.ph)*.022*idle;
 u.spine.rotation.x=lp(u.spine.rotation.x,.035+.15*rs+.04*pw,dt*6);
 u.spine.rotation.z=lp(u.spine.rotation.z,-u.yv*.045*Math.min(1,u.sa*1.5),dt*8);
 const b=Math.sin(now/750+u.ph)*.012;u.spine.scale.y=1+b*.35*(1-u.sa);
 // head stays steady while the body twists; idle look-around; look down at the phone
 const hy=(Math.sin(now/2600+u.ph)*.35)*idle*(1-pw)+Math.sin(p)*.05*a,hx2=Math.sin(now/3100+u.ph)*.06*idle+.42*pw-.6*(u.spine.rotation.x-.035)*(1-pw);
 u.head.rotation.y=lp(u.head.rotation.y,hy,dt*6);u.head.rotation.x=lp(u.head.rotation.x,hx2,dt*6);
 // real Mixamo motion (baked in mocap.js) replaces the procedural body pose once it has loaded
 const mc=!u.vrm&&mocapPose(u,speed,dt,1-u.ss),ph=u.phone;
 if(mc){ph.visible=pw>.05&&!!MX.clips.phone;if(ph.visible){if(ph.parent!==g)g.add(ph);g.updateMatrixWorld(true);
   u.arms[0].el.localToWorld(_hv1.set(0,-.31,.03));u.arms[1].el.localToWorld(_hv2.set(0,-.31,.03));u.head.localToWorld(_hv3.set(0,0,.06));
   _hv1.add(_hv2).multiplyScalar(.5);_hv1.lerp(_hv3,.08);ph.position.copy(g.worldToLocal(_hv2.copy(_hv1)));ph.lookAt(_hv3)}}
 else if(ph.parent===g){u.arms[1].el.add(ph);ph.position.set(0,-.3,.045);ph.rotation.set(-.9,0,0)}
 if(mc&&wv>.01&&speed>=.2){const A=u.arms[1];A.sh.quaternion.slerp(_wq.setFromEuler(_we.set(-2.5,0,.3*A.s)),wv);A.el.quaternion.slerp(_wq.setFromEuler(_we.set(-.6+Math.sin(now/120)*.35,0,0)),wv)}
 if(u.tails){const a=u.legs[0].hp.rotation.x,b=u.legs[1].hp.rotation.x;u.tails[0].rotation.x=Math.min(0,a,b)*.95;u.tails[1].rotation.x=Math.max(0,a,b)*.95}
 if(now>u.gt){u.gt=now+900+Math.random()*2600;u.tgx=Math.random()*2-1;u.tgy=pw>.3?-.8:(Math.random()*2-1)*.6;if(mv){u.tgx*=.3;u.tgy*=.3}}
 u.gx=lp(u.gx,u.tgx,dt*14);u.gy=lp(u.gy,u.tgy,dt*14);u.pupils.position.set(u.gx*.0042,u.gy*.0022,0);
 if(now>u.nb){u.bs=now;u.dbl=!u.dbl&&Math.random()<.18;u.nb=now+(u.dbl?260:2200+Math.random()*4300)}
 const bt=(now-u.bs)/150;if(bt>=0&&bt<=1){u.lidG.visible=true;u.lidG.scale.y=Math.max(.06,Math.sin(bt*PI))}else u.lidG.visible=false}
function randLook(){const f=R()<.45,pick=a=>a[Math.floor(R()*a.length)];return{female:f,skin:pick(SKINS),top:f?pick([0xe84393,0xf2c94c,0x1e7b4a,0xc0392b,0x8fb8c9,0x7b2d8b,0xf39c12,0x16a085]):pick(TOPS),bottom:f?pick([0xf5f5f0,0x1b1b1b,0x22324a,0xe0c9a6]):pick(BOTS),kurti:f&&R()<.8,legging:pick([0xf5f5f0,0x1b1b1b,0xd9c7a8]),dupatta:f&&R()<.55?pick([0xffd21f,0xe74c3c,0xffffff,0x9b59b6]):0,bun:f&&R()<.35,hair:!f&&R()<.14?0xd0d0d0:0x15110e,stache:!f&&R()<.45,beard:!f&&R()<.12,cap:!f&&R()<.1?pick([0xffffff,0x1e5fa8,0xc0392b]):0,bag:R()<.18?pick([0x2b2b2b,0x1e5fa8,0x7a4a2a]):0,longSleeve:R()<.45,shoes:pick([0x2a211b,0x1b1b1b,0x6b4a2a,0xdedede]),h:.93+R()*.1}}
// ================= extra realism: curbs, building details, cables, bikes, puddles, skyline =================
{const curbTex=ctex(128,16,(x,w,h)=>{x.fillStyle='#f2c21b';x.fillRect(0,0,64,h);x.fillStyle='#1b1b1b';x.fillRect(64,0,64,h);speck(x,w,h,400,['#000','#fff'],2,.25)});
 const gs=[];for(const b of BLOCKS){const w=b.x1-b.x0,d=b.z1-b.z0;const add=(gw,gd,x,z,hh=.3)=>{const g=uvBox(new T.BoxGeometry(gw,hh,gd),gw,hh,gd,2,.3);g.translate(x,hh/2,z);gs.push(g)};
  if(b.j>0)add(w+.06,.34,(b.x0+b.x1)/2,b.z0+.13);if(b.j<4)add(w+.06,.34,(b.x0+b.x1)/2,b.z1-.13);if(b.i>0)add(.34,d-.7,b.x0+.13,(b.z0+b.z1)/2,.31);if(b.i<4)add(.34,d-.7,b.x1-.13,(b.z0+b.z1)/2,.31)}
 const cm=new T.Mesh(mergeGeometries(gs),new T.MeshStandardMaterial({map:curbTex,roughness:.8}));cm.receiveShadow=true;scene.add(cm)}
{const o=new T.Object3D(),AC=[],BAL=[],RAIL=[],CL=[],PIPE=[],DISH=[];
 for(const L of LOTS){if(L.fresh)continue;const fz=L.z+L.front*(L.d/2),bays=Math.floor(L.w/4);
  for(let f=0;f<L.floors;f++){const y=4.25+f*3.2;
   if(R()<.45){const b=Math.floor(R()*bays);AC.push([L.x-L.w/2+2+b*4+1.45,y+.75,fz+L.front*.2,L.front])}
   if(f>0&&R()<.3){const b=Math.floor(R()*bays),bxp=L.x-L.w/2+2+b*4;BAL.push([bxp,y+.06,fz+L.front*.55]);RAIL.push([bxp,y+.55,fz+L.front*1.03]);if(R()<.7)for(let k=0;k<3;k++)CL.push([bxp-.8+k*.6,y+.75,fz+L.front*1.07,new T.Color().setHSL(R(),.6,.5)])}}
  PIPE.push([L.x+(R()<.5?-1:1)*(L.w/2-.35),fz+L.front*.12,L.H-4.25]);if(R()<.5)DISH.push([L.x+(R()-.5)*(L.w-2),L.H+.5,L.z+(R()-.5)*(L.d-2)])}
 const mk=(geo,m,list,fn)=>{const im=new T.InstancedMesh(geo,m,list.length);list.forEach((p,i)=>{fn(p);o.updateMatrix();im.setMatrixAt(i,o.matrix);if(p[3]&&p[3].isColor)im.setColorAt(i,p[3])});im.castShadow=true;im.receiveShadow=true;scene.add(im);return im};
 mk(new T.BoxGeometry(.85,.55,.32),mat(0xe8e8e2,.5,.1),AC,p=>{o.position.set(p[0],p[1],p[2]);o.rotation.set(0,p[3]<0?PI:0,0);o.scale.set(1,1,1)});
 mk(new T.BoxGeometry(2.8,.14,1.1),mat(0xa9a49a,.9),BAL,p=>{o.position.set(p[0],p[1],p[2]);o.rotation.set(0,0,0);o.scale.set(1,1,1)});
 mk(new T.BoxGeometry(2.8,.95,.06),mat(0x3b4a55,.5,.6),RAIL,p=>{o.position.set(p[0],p[1],p[2]);o.rotation.set(0,0,0);o.scale.set(1,1,1)});
 mk(new T.BoxGeometry(.38,.55,.02),mat(0xffffff,.9),CL,p=>{o.position.set(p[0],p[1],p[2]);o.rotation.set(0,0,(R()-.5)*.1);o.scale.set(1,1,1)});
 mk(new T.CylinderGeometry(.07,.07,1,8),mat(0x5f6b70,.6,.3),PIPE,p=>{o.position.set(p[0],4.25+p[2]/2,p[1]);o.rotation.set(0,0,0);o.scale.set(1,p[2],1)});
 mk(new T.CylinderGeometry(.42,.12,.12,14),mat(0xdedede,.4,.3),DISH,p=>{o.position.set(p[0],p[1],p[2]);o.rotation.set(.6,R()*6,0);o.scale.set(1,1,1)})}
// overhead cables between lamp poles
{const pts=[],byX={},byZ={};for(const[x,z]of LAMPS){(byX[Math.round(x)]=byX[Math.round(x)]||[]).push([x,z]);(byZ[Math.round(z)]=byZ[Math.round(z)]||[]).push([x,z])}
 const span=(a,b,h,sag)=>{for(let i=0;i<8;i++){const t0=i/8,t1=(i+1)/8,y=t=>h-Math.sin(t*PI)*sag;pts.push(a[0]+(b[0]-a[0])*t0,y(t0),a[1]+(b[1]-a[1])*t0,a[0]+(b[0]-a[0])*t1,y(t1),a[1]+(b[1]-a[1])*t1)}};
 for(const grp of[...Object.values(byX).map(g=>g.sort((a,b)=>a[1]-b[1])),...Object.values(byZ).map(g=>g.sort((a,b)=>a[0]-b[0]))])for(let i=0;i<grp.length-1;i++){const a=grp[i],b=grp[i+1];if(Math.hypot(a[0]-b[0],a[1]-b[1])>45)continue;span(a,b,7.4,.9);span([a[0]+.15,a[1]+.15],[b[0]+.15,b[1]+.15],6.9,1.2);if(R()<.4)span([a[0]-.1,a[1]-.1],[b[0]-.1,b[1]-.1],6.5,1.6)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));scene.add(new T.LineSegments(g,new T.LineBasicMaterial({color:0x111111})))}
// parked two-wheelers
{const parts=[pc(HG.tor,0x1a1a1a,0,.3,.55,.28,.28,.6,0,PI/2),pc(HG.tor,0x1a1a1a,0,.3,-.55,.28,.28,.6,0,PI/2),pc(HG.box,0xffffff,0,.55,0,.3,.35,1),pc(HG.box,0x1a1a1a,0,.8,-.15,.28,.1,.6),pc(HG.box,0xffffff,0,.85,.5,.22,.5,.12,-.3),pc(HG.box,0xbbbbbb,0,1.12,.6,.7,.04,.04)];
 const bg=mergeGeometries(parts);const list=[];for(const b of BLOCKS){if(b.i===0)continue;for(let k=0;k<3;k++){const t=.2+R()*.6;if(b.j<4&&R()<.6)list.push([b.x0+(b.x1-b.x0)*t,b.z1+1.3,(R()-.5)*.5]);else if(b.i<4)list.push([b.x1+1.3,b.z0+(b.z1-b.z0)*t,PI/2+(R()-.5)*.5])}}
 const im=new T.InstancedMesh(bg,new T.MeshStandardMaterial({vertexColors:true,roughness:.45,metalness:.3}),list.length);const o=new T.Object3D();
 list.forEach((p,i)=>{o.position.set(p[0],0,p[1]);o.rotation.set(0,p[2],0);o.updateMatrix();im.setMatrixAt(i,o.matrix);im.setColorAt(i,new T.Color([0xc0392b,0x1e5fa8,0x2b2b2b,0xf2f2f2,0x7f8c8d,0x16a085][i%6]));addColl(p[0]-.5,p[0]+.5,p[1]-.5,p[1]+.5,1.2)});im.castShadow=true;scene.add(im)}
// puddles (show when wet)
const puddleMat=new T.MeshStandardMaterial({color:0x0c0f12,roughness:.02,metalness:.6,transparent:true,opacity:0,depthWrite:false});
{const gs=[];for(let i=0;i<90;i++){const r=ROADS[Math.floor(R()*4)],along=(R()-.5)*300,off=(R()-.5)*10,vert=R()<.5;const g=new T.CircleGeometry(1,16);g.scale(1.2+R()*2.5,.6+R()*1.2,1);g.rotateX(-PI/2);g.translate(vert?r+off:along,.035,vert?Math.min(along,SEA-5):r+off);gs.push(g)}
 const m=new T.Mesh(mergeGeometries(gs),puddleMat);m.receiveShadow=true;scene.add(m)}
// (the old random "distant skyline" boxes were removed: they landed on the island roads and had no collision)
// ================= vehicles =================
const glass=new T.MeshStandardMaterial({color:0x10161c,roughness:.05,metalness:.9}),chrome=mat(0xd0d4d8,.15,1),tyre=mat(0x161616,.9),rimM=mat(0x9aa0a6,.3,.9);
const headMat=new T.MeshStandardMaterial({color:0xffffff,emissive:0xfff3d0,emissiveIntensity:.2}),tailMat=new T.MeshStandardMaterial({color:0x550000,emissive:0xff2020,emissiveIntensity:.15});
function extr(pts,depth,m,parent,bevel=.05){const s=new T.Shape();s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],pts[i][1]);const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:6});g.rotateY(-PI/2);g.translate(depth/2,0,0);return mesh(g,m,0,0,0,parent)}
function wheel(parent,x,y,z,r=.33,w=.22){const g=new T.Group();g.position.set(x,y,z);parent.add(g);const t=mesh(new T.CylinderGeometry(r,r,w,18),tyre,0,0,0,g);t.rotation.z=PI/2;const rm=mesh(new T.CylinderGeometry(r*.6,r*.6,w+.02,12),rimM,0,0,0,g,false);rm.rotation.z=PI/2;return g}
// vehicles are built in vehicles.js (sedan, Padmini taxi, auto, BEST bus, scooter)
function vehicle(type,color){return VEH(type,color)}
initVehicles({scene});
// ================= colliders + helpers =================
// colliders live in a 16 m grid so a check only looks at the few boxes nearby (thousands of trees, huts, buildings)
const CGS=16,CGRID=new Map(),CBIG=[];let cgA=0,cgB=0;
function cgPut(e,x0,x1,z0,z1){const i0=Math.floor(x0/CGS),i1=Math.floor(x1/CGS),j0=Math.floor(z0/CGS),j1=Math.floor(z1/CGS);if((i1-i0+1)*(j1-j0+1)>64){CBIG.push(e);return}for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const k=i*4096+j;let c=CGRID.get(k);if(!c)CGRID.set(k,c=[]);c.push(e)}}
function cgSync(){while(cgA<COLL.length){const c=COLL[cgA++];cgPut(c,c.x0,c.x1,c.z0,c.z1)}while(cgB<OCOLL.length){const o=OCOLL[cgB++],e=Math.sqrt(o.rr);cgPut(o,o.x-e,o.x+e,o.z-e,o.z+e)}}
const hitC=(c,x,z,r)=>c.x0!==undefined?(x+r>c.x0&&x-r<c.x1&&z+r>c.z0&&z-r<c.z1):(()=>{const dx=x-c.x,dz=z-c.z;if(dx*dx+dz*dz>c.rr)return false;const lx=dx*c.c-dz*c.s,lz=dx*c.s+dz*c.c;return Math.abs(lx)<c.hw+r&&Math.abs(lz)<c.hd+r})();
function blocked(x,z,r){cgSync();for(const c of CBIG)if(hitC(c,x,z,r))return true;
 const i0=Math.floor((x-r)/CGS),i1=Math.floor((x+r)/CGS),j0=Math.floor((z-r)/CGS),j1=Math.floor((z+r)/CGS);
 for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const cell=CGRID.get(i*4096+j);if(cell)for(const c of cell)if(hitC(c,x,z,r))return true}return false}
// rotated building footprints (centre, size, yaw) for the organic districts
function addOColl(x,z,w,d,ry,h=4){const hw=w/2,hd=d/2;OCOLL.push({x,z,hw,hd,c:Math.cos(ry),s:Math.sin(ry),rr:(hw+3)*(hw+3)+(hd+3)*(hd+3),h})}
function groundY(x,z){{const n=navapurGround(x,z);if(n!==null)return n}if(x>-143&&x<-137&&z>-47&&z<47)return 1.25;for(const r of ROADS)if(Math.abs(x-r)<RW/2||Math.abs(z-r)<RW/2)return 0;if(x<-143&&x>-158)return .27;return .25}
// ================= traffic =================
function loopPts(s,o,cw){const a=s+o;const p=[[-a,-a],[a,-a],[a,a],[-a,a]];return cw?p:p.reverse()}
function rectPts(x0,x1,z0,z1,o,cw){const p=[[x0-o,z0-o],[x1+o,z0-o],[x1+o,z1+o],[x0-o,z1+o]];return cw?p:p.reverse()}
const LOOPS=[loopPts(40,-3.5,true),loopPts(40,3.5,false),loopPts(120,-3.5,true),loopPts(120,3.5,false),ringLane(-3.5,true),ringLane(3.5,false)].map(p=>{const L={p,seg:[],len:0};for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);L.seg.push({a,b,l,s:L.len,ax:a[0]!==b[0]?'x':'z'});L.len+=l}return L});
function loopAt(L,d){d=((d%L.len)+L.len)%L.len;for(const s of L.seg)if(d<=s.s+s.l){const t=(d-s.s)/s.l;return{x:s.a[0]+(s.b[0]-s.a[0])*t,z:s.a[1]+(s.b[1]-s.a[1])*t,yaw:Math.atan2(s.b[0]-s.a[0],s.b[1]-s.a[1]),seg:s,t}}}
const CARC=[0xf2f2f2,0x9aa3ad,0x2c5fa8,0x7a1f1f,0x1b1b1b,0x3d6b4a,0xd9d2c2];
const TRAFFIC=[];LOOPS.forEach((L,li)=>{const n=MOBILE?(li<2?2:li<4?3:4):(li<2?4:li<4?6:8);for(let k=0;k<n;k++){const type=li===2&&k===0?'bus':['taxi','car','auto','car','taxi','car'][(k+li)%6];const v=vehicle(type,CARC[(k*3+li)%CARC.length]);TRAFFIC.push({L,d:L.len*k/n+R()*5,v:type==='bus'?8:type==='auto'?10:12+R()*3,cur:0,type,veh:v})}});
// ================= player state =================
let SAVE=store.get('mn2_save')||{};
const ST={money:SAVE.money??800,tx:SAVE.tx||[],hunger:SAVE.hunger??80,energy:SAVE.energy??90,owned:SAVE.owned||[],look:SAVE.look||{female:false,skin:SKINS[2],top:0x2c5fa8,bottom:0x22324a,longSleeve:true},name:SAVE.name||'Satish',time:SAVE.time??(9/24),day:SAVE.day||1};
const DAY_LOCK=9/24; // always subah (9 AM): bright daylight, no night
let TIME=DAY_LOCK;
function save(){ST.time=TIME;store.set('mn2_save',ST)}setInterval(save,10000);
if(!ST.look.v2){ST.look.top=0x2b2b2b;ST.look.bottom=0x1b1b1b;ST.look.v2=1}
let PV=null,CHARS=null,outTok=0;
const makeMe=()=>{const g=ST.look.female?human(ST.look):hero(ST.look);if(PV)attachVRM(g,PV);return g};
loadMocap().catch(e=>console.warn("mocap",e));
let me=makeMe();window.__mnDbg={peds:()=>PEDS.map(p=>({x:+p.g.position.x.toFixed(1),z:+p.g.position.z.toFixed(1),greetT:p.greetT,bub:!!p.bub,static:!!p.static})),me:()=>({x:P.x,z:P.z})};
// the metro: new coaches + passengers (needs human() from the people section)
const METRO=buildMetro(TRAIN,()=>npc(randLook()),(p,st)=>{for(let i=0;i<3;i++)animH(p,0,1,st)});let ONTRAIN=null;
const nearMetro=()=>!P.ride&&!ONTRAIN&&train.wait>0&&P.x>-146&&P.x<-134&&Math.abs(P.z-train.z)<42;scene.add(me);
const P={x:FLAT.x,z:FLAT.z+1.5,y:.25,vy:0,yaw:0,ride:null};
const RIDES=[['auto',-70,47.5,0],['auto',10,33.5,PI/2],['taxi',-52,110.5,PI/2],['auto',60,47.5,0],['taxi',-129.5,-30,0]].map(([t,x,z,r])=>{const v=vehicle(t);v.g.position.set(x,0,z);v.g.rotation.y=r;return v});
function spawnOwned(){ST.owned.forEach((t,i)=>{if(RIDES.some(r=>r.own===t))return;const v=vehicle(t==='car'?'car':'scooter',t==='car'?0xe8e8e8:0x19a7a0);v.own=t;v.g.position.set(GAR.x+i*5,0,GAR.z);v.g.rotation.y=PI/2;RIDES.push(v)})}spawnOwned();
// ================= pedestrians =================
const LINES=['The train is late again!','Will it rain today?','I need a cutting chai','This traffic is killing me','I love this city!','Had a vada pav yet?','Gym from tomorrow, promise','Society meeting, run!','You go by the meter, right?','Ganpati festival is coming!','Signal is green, let\'s go','How far is the station?'];
const WB=BLOCKS.filter(b=>b.i>0);const bAt=(i,j)=>WB.find(b=>b.i===i&&b.j===j);
const corner=(b,c)=>[[b.x0+1.6,b.z0+1.6],[b.x1-1.6,b.z0+1.6],[b.x1-1.6,b.z1-1.6],[b.x0+1.6,b.z1-1.6]][c];
const XMAP={0:[[-1,0,1,'x'],[0,-1,3,'z']],1:[[1,0,0,'x'],[0,-1,2,'z']],2:[[1,0,3,'x'],[0,1,1,'z']],3:[[-1,0,2,'x'],[0,1,0,'z']]};
const PEDS=[];for(let k=0;k<(MOBILE?16:38);k++){const b=WB[(k*7)%WB.length],look=randLook();const g=npc(look);scene.add(g);const c=k%4,p=corner(b,c);g.position.set(p[0],.25,p[1]);PEDS.push({g,b,c,dir:R()<.5?1:-1,mode:'walk',tgt:null,sp:1.1+R()*.6,bub:null,bt:0,t:0,active:true})}
for(const p of PEDS){const n=corner(p.b,(p.c+p.dir+4)%4);p.tgt={x:n[0],z:n[1]};p.next=(p.c+p.dir+4)%4}
// a few sitting at tapri bench + waiting at station
for(const[x,z,ry]of[[-1,31.5,PI],[1,31.5,PI],[-140,10,PI/2],[-140,-14,PI/2],[-139.5,22,-PI/2]]){const g=npc(randLook());g.position.set(x,z>30?.25:1.25,z);g.rotation.y=ry;scene.add(g);PEDS.push({g,mode:'idle',sit:z>30,active:true,static:true})}
// ================= roadside vendors =================
const VT={panipuri:{n:'Pani Puri',price:20,h:18,e:0,call:'Pani puri! Spicy and sweet!',col:'#e67e22'},bhutta:{n:'Roasted Corn',price:15,h:15,e:0,call:'Hot roasted corn with lime!',col:'#f1c40f'},fruit:{n:'Fruit Stall',price:30,h:22,e:5,call:'Fresh mangoes, bananas, chikoo!',col:'#27ae60'},juice:{n:'Sugarcane Juice',price:25,h:8,e:25,call:'Cold sugarcane juice!',col:'#16a085'},sandwich:{n:'Bombay Sandwich',price:40,h:35,e:0,call:'Grill sandwich, cheese extra!',col:'#c0392b'},flower:{n:'Flower Seller',price:10,h:0,e:8,call:'Fresh jasmine flowers!',col:'#e84393'},paper:{n:'Newspaper Stall',price:5,h:0,e:3,call:'Today\'s news!',col:'#95a5a6'}};
const VENDORS=[],SMOKE=[],COALS=[];const SMOKETEX=ctex(64,64,(x,w,h)=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h)});
const wood=mat(0x7a5230,.85),steel=mat(0xc9ced3,.25,.9);
function stall(type,x,z,ry){const g=new T.Group();g.position.set(x,.25,z);g.rotation.y=ry;scene.add(g);
 const B=(w,h,d,m,px,py,pz)=>bx(w,h,d,m,px,py,pz,g,true),S=(r,m,px,py,pz)=>mesh(gsph(r),m,px,py,pz,g);
 const legs=(w,d,h)=>{for(const a of[-1,1])for(const b of[-1,1])B(.06,h,.06,mat(0x444444,.5,.6),a*(w/2-.05),h/2,b*(d/2-.05))};
 const wheels=(dx,r)=>{for(const s of[-1,1]){const w=mesh(new T.CylinderGeometry(r,r,.07,16),mat(0x222222,.8),s*dx,r,0,g);w.rotation.z=PI/2}};
 if(type==='panipuri'){legs(1.5,.8,.8);B(1.6,.1,.85,wood,0,.85,0);B(1.6,.55,.05,mat(0xc0392b,.9),0,.55,.42);B(1.1,.5,.6,new T.MeshStandardMaterial({color:0xddeeff,transparent:true,opacity:.25,roughness:.05,metalness:.1}),0,1.15,-.05);
  for(let i=0;i<14;i++)S(.045,mat(0xd9a45b,.7),-.4+(i%7)*.13,.98+Math.floor(i/7)*.08,-.1+(i%2)*.1);for(const px of[-.62,.62])mesh(new T.CylinderGeometry(.14,.12,.25,14),steel,px,1.02,.22,g);wheels(.82,.25)}
 else if(type==='bhutta'){B(.9,.5,.6,mat(0x3a3a3a,.7,.4),0,.25,0);const cm=new T.MeshStandardMaterial({color:0x331100,emissive:0xff4a10,emissiveIntensity:1.5,roughness:.9});COALS.push(cm);B(.8,.06,.5,cm,0,.53,0);
  for(let i=0;i<5;i++){const c=mesh(new T.CylinderGeometry(.04,.035,.24,8),mat(0xe8b923,.6),-.3+i*.15,.6,(i%2)*.1-.05,g);c.rotation.z=PI/2}
  B(.6,.35,.4,mat(0x6b4a2a,.9),.8,.18,0);for(let i=0;i<6;i++){const c=mesh(new T.CylinderGeometry(.045,.04,.26,8),mat(0x7cb342,.8),.65+(i%3)*.12,.42,-.1+Math.floor(i/3)*.18,g);c.rotation.x=PI/2}
  {const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(new Array(21).fill(0),3));const pt=new T.Points(geo,new T.PointsMaterial({map:SMOKETEX,color:0xd0d0d0,size:.9,transparent:true,opacity:.35,depthWrite:false}));pt.frustumCulled=false;g.add(pt);SMOKE.push({pt,t:0})}}
 else if(type==='fruit'){legs(1.8,1,.75);B(1.9,.12,1.05,wood,0,.8,0);const cols=[0xf39c12,0xf1c40f,0xd35400,0x27ae60,0xc0392b];for(let i=0;i<24;i++){const r=i<12?0:i<20?1:2;S(.085,mat(cols[((i+Math.floor(x))%5+5)%5],.55),-.7+(i%6)*.28,.94+r*.13,-.3+Math.floor(i/6)%2*.3+r*.08)}
  B(.05,2.2,.05,mat(0x444444),.8,1.1,-.4);mesh(new T.ConeGeometry(1.3,.5,10),mat(0x1e5fa8,.8),.8,2.35,-.4,g);wheels(.95,.3)}
 else if(type==='juice'){B(1.8,1,.8,mat(0x16a085,.6),0,.5,0);B(.7,.6,.5,mat(0x2e7d32,.5,.4),-.4,1.3,0);const wh=mesh(new T.CylinderGeometry(.3,.3,.06,16),steel,-.4,1.3,.28,g);wh.rotation.x=PI/2;
  for(let i=0;i<5;i++)mesh(new T.CylinderGeometry(.05,.04,.13,10),mat(0xb5d334,.2,0,{transparent:true,opacity:.85}),.2+i*.13,1.07,.15,g);
  for(let i=0;i<6;i++){const c=mesh(new T.CylinderGeometry(.03,.03,2,6),mat(0x8d6e3f,.8),.75+i*.06,1,-.35,g);c.rotation.z=-.12}const s=sign('Ganne ka Ras','#16a085','#fff',.32,.6);s.position.set(0,.65,.41);g.add(s)}
 else if(type==='sandwich'){B(1.6,1,.8,mat(0x8e2a1e,.6),0,.5,0);B(1.6,.05,.8,steel,0,1.02,0);B(.5,.12,.35,mat(0x222222,.4,.7),-.4,1.11,0);B(.35,.18,.25,mat(0xe8c48a,.8),.3,1.13,0);B(.3,.2,.25,steel,.65,1.13,0);
  B(1.7,.05,1,mat(0xf1c40f,.7),0,2.2,0);for(const a of[-1,1])B(.05,1.2,.05,mat(0x444444),a*.8,1.6,-.45);const s=sign('Bombay Sandwich','#c0392b','#fff',.3,.6);s.position.set(0,.7,.41);g.add(s)}
 else if(type==='flower'){mesh(new T.CylinderGeometry(.45,.35,.35,16),mat(0x8d6e3f,.9),0,.18,0,g);for(let i=0;i<30;i++)S(.05,mat(i%3?0xff9f1a:0xfff6e0,.7),(R()-.5)*.65,.38+R()*.06,(R()-.5)*.65);
  B(.05,1.5,.05,mat(0x555555),.6,.75,-.2);for(let i=0;i<4;i++)mesh(new T.TorusGeometry(.12,.025,6,16),mat(i%2?0xff9f1a:0xfff6e0,.7),.6,1.3-i*.2,-.17,g)}
 else{B(1.2,1.4,.5,wood,0,.7,-.1);for(let i=0;i<12;i++){const m=B(.2,.27,.02,mat([0xc0392b,0x2980b9,0xf1c40f,0x27ae60,0xecf0f1,0x8e44ad][i%6],.6),-.45+(i%5)*.22,.45+Math.floor(i/5)*.32,.16);m.rotation.x=-.25}B(1,.08,.4,mat(0xecf0f1,.8),0,1.45,.05)}
 const fem=type==='flower',look={female:fem,skin:SKINS[Math.floor(R()*5)],top:fem?0xe84393:[0xf5f5f0,0x8e6b3d,0x34495e,0x7f8c8d,0x2e86c1][Math.floor(R()*5)],bottom:fem?0x2e7d32:[0x4a6fa5,0x6b4a2a,0xd9d2c2,0x1e7b4a][Math.floor(R()*4)],kurti:fem||R()<.55,legging:0xf5f5f0,vest:type==='bhutta'||type==='juice',longSleeve:false,stache:!fem,beard:!fem&&R()<.2,topi:!fem&&R()<.35,hair:!fem&&R()<.35?0xcfcfcf:0x15110e,bun:true,dupatta:fem?0xffd21f:0,shoes:0x6b4a2a,h:.95};
 const man=human(look);man.position.set(0,0,-.9);g.add(man);
 const front=new T.Vector3(0,0,1).applyAxisAngle(new T.Vector3(0,1,0),ry);
 VENDORS.push({type,g,man,x,z,fx:x+front.x*1.2,fz:z+front.z*1.2,t:3+R()*8,bub:null,bt:0});addColl(x-.95,x+.95,z-.95,z+.95,2)}
{const types=Object.keys(VT);let k=0;for(const b of WB){if((b.i===2||b.i===3)&&b.j===2)continue;const spots=[];if(b.j>0)spots.push([b.x0+(b.x1-b.x0)*.32,b.z0+3,PI]);if(b.j<4)spots.push([b.x0+(b.x1-b.x0)*.68,b.z1-3,0]);
  for(const[x,z,ry]of spots){if(k%3!==2)stall(types[k%types.length],x,z,ry);k++}}
 stall('panipuri',-18,31,0);stall('bhutta',18,31,0);stall('bhutta',-40,SEA+3,PI);stall('flower',30,SEA+3,PI);stall('juice',90,SEA+3,PI)}
function vsay(v,t){if(v.bub)v.man.remove(v.bub);const s=bubble(t);s.position.y=2.3;v.man.add(s);v.bub=s;v.bt=3.2}
function nearVendor(){return VENDORS.find(v=>Math.hypot(v.fx-P.x,v.fz-P.z)<1.9)}
function buyVendor(v){const t=VT[v.type];if(ST.money<t.price)return toast('Not enough money');ST.hunger=Math.min(100,ST.hunger+t.h);ST.energy=Math.min(100,ST.energy+t.e);pay(-t.price,t.n);vsay(v,['Thank you, come again!','Tastes great, right?','Anything else?'][Math.floor(R()*3)]);v.man.userData.wave=1.2;if(v.type==='paper')setTimeout(()=>toast('News: '+['Local train 2 min late, commuters annoyed','Monsoon arrives early, keep an umbrella ready','Vada pav beats burger again','Stunning sunset at Marine Drive today'][Math.floor(R()*4)]),1500)}
// ================= full map overlay =================
let mapOn=false,MZ=1.15,MC={x:0,z:0},WP=null,mdrag=null;const mapc=$('mapc');
const gpsMarker=new T.Group();{const beam=new T.Mesh(new T.CylinderGeometry(1.6,1.6,60,20,1,true),new T.MeshBasicMaterial({color:0xa66bff,transparent:true,opacity:.25,side:T.DoubleSide,depthWrite:false,fog:false}));beam.position.y=30;gpsMarker.add(beam);const ring=new T.Mesh(new T.TorusGeometry(2,.12,8,40),new T.MeshBasicMaterial({color:0xa66bff}));ring.rotation.x=PI/2;ring.position.y=.35;gpsMarker.add(ring)}gpsMarker.visible=false;scene.add(gpsMarker);
function toggleMap(v){mapOn=v===undefined?!mapOn:v;$('mapov').hidden=!mapOn;document.body.classList.toggle('mapOn',mapOn);if(mapOn){const h=here();MC={x:h.x,z:h.z};togglePhone(false);sizeMap()}}
function sizeMap(){const r=mapc.getBoundingClientRect();mapc.width=Math.max(1,r.width*devicePixelRatio);mapc.height=Math.max(1,r.height*devicePixelRatio)}addEventListener('resize',()=>{if(mapOn)sizeMap()});
const mapScale=()=>MZ*Math.min(mapc.width,mapc.height)/360;
function toWorld(cx,cy){const r=mapc.getBoundingClientRect(),s=mapScale();return{x:MC.x+((cx-r.left)*devicePixelRatio-mapc.width/2)/s,z:MC.z+((cy-r.top)*devicePixelRatio-mapc.height/2)/s}}
const MPTR=new Map();let pinch=null,pinched=false;
const pdist=()=>{const[a,b]=[...MPTR.values()];return Math.hypot(a.x-b.x,a.y-b.y)||1};
mapc.addEventListener('pointerdown',e=>{MPTR.set(e.pointerId,{x:e.clientX,y:e.clientY});try{mapc.setPointerCapture(e.pointerId)}catch(_){}
 if(MPTR.size===2){pinch={d:pdist(),z:MZ};mdrag=null;pinched=true}else if(MPTR.size===1){pinched=false;mdrag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY}}});
mapc.addEventListener('pointermove',e=>{const p=MPTR.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;
 if(pinch&&MPTR.size>=2){MZ=Math.max(.28,Math.min(6,pinch.z*pdist()/pinch.d));return}
 if(!mdrag)return;const s=mapScale()/devicePixelRatio;MC.x-=(e.clientX-mdrag.x)/s;MC.z-=(e.clientY-mdrag.y)/s;mdrag.x=e.clientX;mdrag.y=e.clientY});
const mapUp=e=>{MPTR.delete(e.pointerId);if(pinch){if(MPTR.size<2)pinch=null;mdrag=null;return}
 if(e.type==='pointerup'&&!pinched&&mdrag&&Math.hypot(e.clientX-mdrag.sx,e.clientY-mdrag.sy)<6){const w=toWorld(e.clientX,e.clientY);if(w.x>WORLD.x0&&w.x<WORLD.x1&&w.z>WORLD.z0&&w.z<SEA+100){WP=w;gpsMarker.position.set(w.x,0,w.z);gpsMarker.visible=true;toast('GPS set! Follow the purple light')}}mdrag=null};
mapc.addEventListener('pointerup',mapUp);mapc.addEventListener('pointercancel',mapUp);
mapc.addEventListener('wheel',e=>{e.preventDefault();MZ=Math.max(.28,Math.min(6,MZ*(e.deltaY<0?1.15:1/1.15)))},{passive:false});
$('mzi').onclick=()=>MZ=Math.min(6,MZ*1.3);$('mzo').onclick=()=>MZ=Math.max(.28,MZ/1.3);$('mcl').onclick=()=>toggleMap(false);$('mapBtn').onclick=()=>toggleMap(true);
$('mwp').onclick=()=>{WP=null;gpsMarker.visible=false;toast('GPS cleared')};$('mme').onclick=()=>{const h=here();MC={x:h.x,z:h.z}};
$('leg').innerHTML=[['#ffd21f','You'],['#ff2d78','Real players'],['#1f6f5c','☕ Startup Café'],['#e8742a','📢 Billboard'],['#7a6bd8','🚇 Metro'],['#2ecc71','Job / destination'],['#a66bff','GPS'],['#e74c3c','Traffic']].map(([c,n])=>`<span><i style="background:${c}"></i>${n}</span>`).join('')+Object.values(VT).map(v=>`<span><i style="background:${v.col}"></i>${v.n}</span>`).join('');
// extra names shown on the maps (job destinations stay in PLACES)
const ROAD_NAMES=['Station Road','M.G. Road','Linking Road','Hill Road'],CROSS_NAMES=['Gandhi Marg','Nehru Street','Tilak Road','Sea View Road'];
let MAP_EXTRA=null;const mapExtra=()=>MAP_EXTRA||(MAP_EXTRA=[{n:'Vada Pav Center',x:VADA.x,z:VADA.z},{n:'Garage',x:GAR.x,z:GAR.z},{n:'Metro Station',x:-150,z:-14},{n:'City Center Plaza',x:-35,z:-345},{n:'Billboard',x:-40,z:-308},{n:'Dam & Lake',x:275,z:-505},{n:'Runway',x:385,z:112}]);
const PLAYER_COL='#ff2d78';
const allPlayers=()=>NETAPI&&NETAPI.positions?NETAPI.positions():[];
// players too far away to draw get a floating name marker with the distance, so you can find each other
const BEACONS=[];let beaconT=0;
function beaconTick(dt){beaconT-=dt;if(beaconT>0)return;beaconT=.5;const far=started&&!creating?allPlayers().filter(q=>!q.near):[];
 while(BEACONS.length<far.length){const c=document.createElement('canvas');c.width=256;c.height=96;const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
  const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false,fog:false,transparent:true}));s.renderOrder=5;s.userData={c,tex,key:''};
  const beam=new T.Mesh(new T.CylinderGeometry(.6,.6,26,8,1,true),new T.MeshBasicMaterial({color:0xff2d78,transparent:true,opacity:.5,depthWrite:false,fog:false}));beam.userData.noCull=true;
  scene.add(s,beam);BEACONS.push({s,beam})}
 BEACONS.forEach((b,i)=>{const q=far[i];b.s.visible=b.beam.visible=!!q;if(!q)return;const d=Math.round(Math.hypot(q.x-P.x,q.z-P.z)),key=q.name+d;
  b.beam.position.set(q.x,13,q.z);const k=Math.min(6,Math.max(1.4,d/30));b.s.position.set(q.x,27+k,q.z);b.s.scale.set(6*k,2.25*k,1);
  if(b.s.userData.key!==key){b.s.userData.key=key;const x=b.s.userData.c.getContext('2d');x.clearRect(0,0,256,96);x.fillStyle='rgba(20,10,20,.82)';x.beginPath();x.roundRect?x.roundRect(4,4,248,88,22):x.rect(4,4,248,88);x.fill();
   x.fillStyle='#ff2d78';x.fillRect(4,4,10,88);x.textAlign='center';x.fillStyle='#fff';x.font='800 36px "Baloo 2",sans-serif';x.fillText((q.name||'Player').slice(0,12),132,44);x.fillStyle='#ffb3cd';x.font='700 26px "Baloo 2",sans-serif';x.fillText(d+' m away',132,80);b.s.userData.tex.needsUpdate=true}})}
// clean city-map look for the big map (M): beige land, white roads with casing, building footprints, icons, names
const MAPK={sea:'#2a7a96',sea2:'#236a84',land:'#ece5d4',beach:'#e6d3a3',caseC:'#b7ae9c',road:'#fffdf7',lane:'#e8c45a',bld:'#d7cdbb',bldT:'#c6baa4',bldS:'#a89c87',old:'#e2d9c6',park:'#a9cf8e',metro:'#7a6bd8'};
function drawWorldHQ(x,s){
 x.fillStyle=MAPK.sea;x.fillRect(-2400,-2400,4800,4800);x.strokeStyle=MAPK.sea2;x.lineWidth=1.2;for(let i=-1200;i<1200;i+=36){x.beginPath();x.moveTo(-1200,i);x.lineTo(1200,i+40);x.stroke()}
 if(DMAP.land){x.save();x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=24;x.fillStyle=MAPK.land;polyPath(x,DMAP.land);x.fill();x.restore();x.strokeStyle=MAPK.beach;x.lineWidth=7;polyPath(x,DMAP.land);x.stroke()}
 x.globalAlpha=.42;for(const z of DMAP.zones){x.fillStyle=z.c;polyPath(x,z.pts);x.fill()}x.globalAlpha=1;
 x.fillStyle=MAPK.old;x.fillRect(-LIM,-LIM,2*LIM,LIM+SEA);x.fillStyle=MAPK.park;x.fillRect(-30,-30,60,60);
 // roads: casing first, then the white surface, then a centre line when zoomed in
 x.lineJoin=x.lineCap='round';const strokeRoads=(extra,col)=>{x.strokeStyle=col;for(const L of DMAP.lines){x.lineWidth=L.w+extra;x.beginPath();L.pts.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));if(L.closed)x.closePath();x.stroke()}
  x.fillStyle=col;for(const r of ROADS){x.fillRect(-LIM-extra/2,r-7-extra/2,2*LIM+extra,RW+extra);x.fillRect(r-7-extra/2,-LIM-extra/2,RW+extra,LIM+SEA+extra)}};
 strokeRoads(3.5,MAPK.caseC);strokeRoads(0,MAPK.road);
 if(s>2.2){x.strokeStyle=MAPK.lane;x.lineWidth=.6;x.setLineDash([4,4]);for(const L of DMAP.lines){if(L.w<10)continue;x.beginPath();L.pts.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));if(L.closed)x.closePath();x.stroke()}
  for(const r of ROADS){x.beginPath();x.moveTo(-LIM,r);x.lineTo(LIM,r);x.moveTo(r,-LIM);x.lineTo(r,SEA);x.stroke()}x.setLineDash([])}
 // Sea Link bridge over the water
 {const sl=[[-180,285],[-120,300],[-60,310],[5,313],[70,312],[130,303],[190,290]];x.strokeStyle='#8f969e';x.lineWidth=19;x.beginPath();sl.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.stroke();x.strokeStyle=MAPK.road;x.lineWidth=15;x.stroke()}
 // metro line
 x.strokeStyle=MAPK.metro;x.lineWidth=4;x.beginPath();x.moveTo(-150,-300);x.lineTo(-150,SEA);x.stroke();if(s>1.6){x.strokeStyle='#fff';x.lineWidth=1.2;x.setLineDash([3,3]);x.beginPath();x.moveTo(-150,-300);x.lineTo(-150,SEA);x.stroke();x.setLineDash([])}
 // building footprints (old-city lots + every rotated footprint of the districts)
 x.lineWidth=.6;x.strokeStyle=MAPK.bldS;
 for(const l of LOTS){x.fillStyle=l.H>16?MAPK.bldT:MAPK.bld;x.fillRect(l.x-l.w/2,l.z-l.d/2,l.w,l.d);x.strokeRect(l.x-l.w/2,l.z-l.d/2,l.w,l.d)}
 for(const o of OCOLL){if(o.h<2||o.hw>70||o.hd>70)continue;x.save();x.transform(o.c,-o.s,o.s,o.c,o.x,o.z);x.fillStyle=o.h>30?MAPK.bldT:MAPK.bld;x.fillRect(-o.hw,-o.hd,o.hw*2,o.hd*2);x.strokeRect(-o.hw,-o.hd,o.hw*2,o.hd*2);x.restore()}
 x.fillStyle='#a2784e';x.fillRect(CAFE.x-CAFE.w/2,CAFE.z-CAFE.d/2,CAFE.w,CAFE.d)}
function drawBigMap(){const x=mapc.getContext('2d'),W=mapc.width,H=mapc.height,s=mapScale(),dp=devicePixelRatio;x.setTransform(1,0,0,1,0,0);x.fillStyle=MAPK.sea;x.fillRect(0,0,W,H);
 x.save();x.translate(W/2,H/2);x.scale(s,s);x.translate(-MC.x,-MC.z);drawWorldHQ(x,s/dp);
 if(s/dp>1.1){x.fillStyle='rgba(231,76,60,.85)';for(const v of TRAFFIC)x.fillRect(v.veh.g.position.x-1.4,v.veh.g.position.z-1.4,2.8,2.8)}
 x.fillStyle='#f4f2ee';x.strokeStyle=MAPK.metro;x.lineWidth=.8;x.fillRect(-151.6,train.z-58,3.2,116);x.strokeRect(-151.6,train.z-58,3.2,116);x.restore();
 const S=(wx,wz)=>[W/2+(wx-MC.x)*s,H/2+(wz-MC.z)*s],h=here();x.textBaseline='middle';x.textAlign='center';
 // GPS route (straight guide line) + pins
 if(WP){const[a,b]=S(h.x,h.z),[c,d]=S(WP.x,WP.z);x.strokeStyle='#a66bff';x.lineWidth=4*dp;x.setLineDash([10*dp,8*dp]);x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();x.setLineDash([])}
 // round icon badges
 const badge=(wx,wz,ic,bg,r=11)=>{const[a,b]=S(wx,wz);x.fillStyle=bg;x.strokeStyle='#fff';x.lineWidth=2.5*dp;x.beginPath();x.arc(a,b,r*dp,0,7);x.fill();x.stroke();x.font=`${r*1.15*dp}px sans-serif`;x.fillStyle='#fff';x.fillText(ic,a,b+1*dp)};
 const placed=[],fits=(cx,cy,w,h)=>{const r=[cx-w/2-3*dp,cy-h/2-2*dp,cx+w/2+3*dp,cy+h/2+2*dp];if(r[2]<0||r[0]>W||r[3]<0||r[1]>H)return false;for(const q of placed)if(r[0]<q[2]&&r[2]>q[0]&&r[1]<q[3]&&r[3]>q[1])return false;placed.push(r);return true};
 {const[a,b]=S(h.x,h.z);placed.push([a-22*dp,b-22*dp,a+22*dp,b+22*dp])} // keep names off your own arrow
 for(const[wx,wz,r]of[[CAFE.x,CAFE.z-24,14],[-150,0,11]]){const[a,b]=S(wx,wz);placed.push([a-r*dp,b-r*dp,a+r*dp,b+r*dp])}
 badge(CAFE.x,CAFE.z-24,'☕','#1f6f5c',14);badge(CAFE.x+4,CAFE.z-CAFE.d/2-13,'📢','#e8742a',9);badge(-40,-318,'📢','#e8742a',9);badge(-150,0,'🚇','#7a6bd8',11);
 if(MZ>1.4)for(const v of VENDORS){const[a,b]=S(v.x,v.z);x.fillStyle=VT[v.type].col;x.strokeStyle='#fff';x.lineWidth=2*dp;x.beginPath();x.arc(a,b,5*dp,0,7);x.fill();x.stroke()}
 if(MZ>1.4)for(const r of RIDES){const[a,b]=S(r.g.position.x,r.g.position.z);x.fillStyle=r.own?'#19a7a0':'#ffd21f';x.strokeStyle='#141414';x.lineWidth=1.5*dp;x.fillRect(a-4*dp,b-4*dp,8*dp,8*dp);x.strokeRect(a-4*dp,b-4*dp,8*dp,8*dp)}
 const txt=(n,wx,wz,size,weight,fill,dy=0)=>{const[a,b0]=S(wx,wz),b=b0+dy;x.font=`${weight} ${size*dp}px "Baloo 2",sans-serif`;const w=x.measureText(n).width;if(!fits(a,b,w,size*dp*1.1))return;x.lineWidth=Math.max(3,size*.3)*dp;x.strokeStyle='rgba(255,255,255,.95)';x.strokeText(n,a,b);x.fillStyle=fill;x.fillText(n,a,b)};
 // 1. old-city places as dark pills (job destinations)
 if(MZ>.75){x.font=`700 ${12*dp}px "Baloo 2",sans-serif`;for(const p of PLACES){const[a,b]=S(p.x,p.z);const tw=x.measureText(p.n).width+14*dp;if(!fits(a,b,tw,22*dp))continue;x.fillStyle='rgba(25,28,34,.86)';x.beginPath();x.roundRect?x.roundRect(a-tw/2,b-11*dp,tw,22*dp,11*dp):x.rect(a-tw/2,b-11*dp,tw,22*dp);x.fill();x.fillStyle='#fff';x.fillText(p.n,a,b+1*dp)}}
 // 2. districts and landmarks, larger when zoomed out
 const big=MZ<.75?13:15;for(const p of EXTRA_PLACES)txt(p.n,p.x,p.z,big,800,'#2b3a4a');
 // 3. smaller landmarks, 4. stalls, only when zoomed in enough to have room
 if(MZ>1.1)for(const p of mapExtra())txt(p.n,p.x,p.z,11,700,'#5b3f8c',14*dp);
 if(MZ>2.2)for(const v of VENDORS)txt(VT[v.type].n,v.x,v.z,11,600,'#2b3a4a',-12*dp);
 // road names along the old-city streets
 if(MZ>1.6){x.font=`700 ${10*dp}px "Baloo 2",sans-serif`;x.lineWidth=3*dp;const road=(n,wx,wz,rot)=>{const[a,b]=S(wx,wz),w=x.measureText(n).width,hh=12*dp;if(!(rot?fits(a,b,hh,w):fits(a,b,w,hh)))return;x.save();x.translate(a,b);x.rotate(rot);x.strokeStyle='rgba(255,255,255,.95)';x.strokeText(n,0,0);x.fillStyle='#6a5f4e';x.fillText(n,0,0);x.restore()};
  ROADS.forEach((r,i)=>{road(ROAD_NAMES[i],r,-80,-PI/2);road(CROSS_NAMES[i],-80,r,0)})}
 // billboard spot numbers
 if(MZ>.9){x.font=`800 ${10*dp}px "Baloo 2",sans-serif`;for(const sp of SPOTS){if(sp.type==='lamp'&&MZ<2.2)continue;const[a,b]=S(sp.x,sp.z);x.fillStyle=BOARDS.taken(sp.code)?'#0f766e':'#e8742a';x.fillRect(a-9*dp,b-7*dp,18*dp,14*dp);x.fillStyle='#fff';x.fillText(sp.code,a,b+dp)}}
 // every real player online: a small pink dot (no names on the map)
 for(const q of allPlayers()){const[a,b]=S(q.x,q.z);x.fillStyle=PLAYER_COL;x.strokeStyle='#fff';x.lineWidth=2*dp;x.beginPath();x.arc(a,b,5*dp,0,7);x.fill();x.stroke()}
 const pin=(wx,wz,c)=>{const[a,b]=S(wx,wz);x.fillStyle=c;x.strokeStyle='#fff';x.lineWidth=2.5*dp;x.beginPath();x.arc(a,b-16*dp,9*dp,PI,0);x.lineTo(a,b);x.closePath();x.fill();x.stroke();x.fillStyle='#fff';x.beginPath();x.arc(a,b-16*dp,3.5*dp,0,7);x.fill()};
 if(marker.visible)pin(marker.position.x,marker.position.z,'#2ecc71');if(WP)pin(WP.x,WP.z,'#a66bff');
 // you: arrow with a soft halo
 {const[a,b]=S(h.x,h.z);x.fillStyle='rgba(255,210,31,.25)';x.beginPath();x.arc(a,b,20*dp,0,7);x.fill();x.save();x.translate(a,b);x.rotate(PI-(P.ride?P.ride.g.rotation.y:P.yaw));x.fillStyle='#ffd21f';x.strokeStyle='#141414';x.lineWidth=3*dp;x.beginPath();x.moveTo(0,-14*dp);x.lineTo(10*dp,11*dp);x.lineTo(0,5*dp);x.lineTo(-10*dp,11*dp);x.closePath();x.fill();x.stroke();x.restore()}
 // compass + scale bar
 {const cx=W-34*dp,cy=H-34*dp;x.fillStyle='rgba(20,22,28,.85)';x.beginPath();x.arc(cx,cy,20*dp,0,7);x.fill();x.fillStyle='#ff5a4f';x.beginPath();x.moveTo(cx,cy-15*dp);x.lineTo(cx+6*dp,cy);x.lineTo(cx-6*dp,cy);x.fill();x.fillStyle='#fff';x.beginPath();x.moveTo(cx,cy+15*dp);x.lineTo(cx+6*dp,cy);x.lineTo(cx-6*dp,cy);x.fill();x.font=`800 ${10*dp}px sans-serif`;x.fillText('N',cx,cy-27*dp)}
 {const nice=[10,20,50,100,200,500],m=nice.find(v=>v*s>70*dp)||500,len=m*s,bx=16*dp,by=H-20*dp;x.fillStyle='rgba(20,22,28,.85)';x.fillRect(bx-6*dp,by-18*dp,len+56*dp,28*dp);x.strokeStyle='#fff';x.lineWidth=3*dp;x.beginPath();x.moveTo(bx,by-6*dp);x.lineTo(bx,by);x.lineTo(bx+len,by);x.lineTo(bx+len,by-6*dp);x.stroke();x.font=`700 ${11*dp}px sans-serif`;x.textAlign='left';x.fillStyle='#fff';x.fillText(m+' m',bx+len+6*dp,by-3*dp);x.textAlign='center'}}
// ================= UI / audio =================
let tt=0;function toast(m){$('toast').textContent=m;$('toast').classList.add('on');clearTimeout(tt);tt=setTimeout(()=>$('toast').classList.remove('on'),2400)}
function hudMoney(){$('money').textContent='₹'+Math.floor(ST.money).toLocaleString('en-IN');$('lv').textContent='Lv. '+(1+Math.floor((ST.day-1)/2));$('avHair').setAttribute('d',ST.look.female?'M16 40c-3-17 4-28 16-28s19 11 16 28c-1-9-3-14-7-17-3 3-9 4-15 3-4 2-7 7-10 14z':'M17 31c-2-11 5-19 15-19 11 0 17 7 15 19-2-5-4-8-7-9 1 3 0 5-2 6-1-4-4-6-6-6-1 3-4 5-9 5 1-2 1-3 0-4-3 2-5 5-6 8z')}
function clockText(){const h=Math.floor(TIME*24),m=Math.floor((TIME*24-h)*60);const part=h<12?'AM':'PM';return`Day ${ST.day} · ${(h%12)||12}:${String(m).padStart(2,'0')} ${part}`}
function pay(n,why){ST.money+=n;ST.tx.unshift({why,n,t:clockText()});ST.tx=ST.tx.slice(0,40);save();toast((n>=0?'+₹':'-₹')+Math.abs(n)+' · '+why);hudMoney()}
let AC=null,muted=store.get('mn2_mute')||false,amb=null;
function audioInit(){if(AC)return;try{AC=new AudioContext();const mk=(color)=>{const b=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){const w=R()*2-1;l=color?(l+.02*w)/1.02:w;d[i]=color?l*3.5:w}const s=AC.createBufferSource();s.buffer=b;s.loop=true;return s};
 const city=mk(1),cf=AC.createBiquadFilter();cf.type='lowpass';cf.frequency.value=500;const cg=AC.createGain();cg.gain.value=0;city.connect(cf);cf.connect(cg);cg.connect(AC.destination);city.start();
 const rain=mk(0),rf=AC.createBiquadFilter();rf.type='bandpass';rf.frequency.value=1800;rf.Q.value=.4;const rg=AC.createGain();rg.gain.value=0;rain.connect(rf);rf.connect(rg);rg.connect(AC.destination);rain.start();
 const eng=AC.createOscillator();eng.type='sawtooth';const ef=AC.createBiquadFilter();ef.type='lowpass';ef.frequency.value=300;const eg=AC.createGain();eg.gain.value=0;eng.connect(ef);ef.connect(eg);eg.connect(AC.destination);eng.start();
 amb={cg,rg,eng,eg}}catch(e){}}
function tone(fs,dur=.35,type='square',vol=.04){if(!AC||muted)return;try{for(const f of fs){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;g.gain.value=vol;g.gain.setTargetAtTime(0,AC.currentTime+dur*.7,.05);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+dur)}}catch(e){}}
const horn=()=>{tone([392,494]);for(const p of PEDS)if(p.mode==='walk'&&p.g.position.distanceTo(me.position)<12&&P.ride)p.g.position.y=.55};
const ding=()=>tone([880,1320],.4,'triangle',.05);
// ================= input =================
const K={};let started=false,phoneOn=false,photo=false;
addEventListener('keydown',e=>{if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(started&&!creating&&k==='escape'){e.preventDefault();escPressed();return}if(MENU)return;K[k]=true;if(!started)return;if(k==='e')act();if(k==='x')toggleSit();if(k==='t'||k==='enter'){e.preventDefault();openChat()}if((k==='v'||k==='g')&&!P.ride&&!SIT)doWave();if(k==='p')togglePhone();if(k==='h')horn();if(k==='c')setPhoto(!photo);if(k==='m')toggleMap();if(['1','2','3'].includes(k)&&JOB&&JOB.type==='chai')serve(+k-1);if(k===' ')e.preventDefault()});
addEventListener('keyup',e=>{K[e.key.toLowerCase()]=false});
// seats the player can use (X): the chai tapri bench, between the two regulars
const SEATS=[{x:0,z:31.5,y:.25,ry:PI}],FOOT_CAM=4.8;let SIT=null;SEATS.push(...BENCHES,...CAFE.seats);
const nearSeat=()=>{let best=null,bd=2.6;for(const s of SEATS){const d=Math.hypot(s.x-P.x,s.z-P.z);if(d<bd){bd=d;best=s}}return best}; // nearest seat
function standUp(){if(!SIT)return;const s=SIT;SIT=null;const k=s.back?-.8:.95;P.x=s.x+Math.sin(s.ry)*k;P.z=s.z+Math.cos(s.ry)*k;P.y=groundY(P.x,P.z)}
// wave hello (V key, wave button, or automatically near other players); works while walking too
function doWave(){me.userData.wave=1.6;if(NETAPI)NETAPI.emote('wave')}
function toggleSit(){if(P.ride)return;if(SIT){standUp();return}const s=nearSeat();if(!s)return toast('Go near a bench, chair or sofa to sit');SIT=s;toast('Sitting · press X or move to stand up')}
let camYaw=PI/2+.35,camPitch=.28,camDist=FOOT_CAM,camP=.28,drag=null;
$('c').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,id:e.pointerId}});
addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;camYaw-=(e.clientX-drag.x)*.006;camPitch=Math.max(.02,Math.min(1.25,camPitch+(e.clientY-drag.y)*.004));drag.x=e.clientX;drag.y=e.clientY});
addEventListener('pointerup',e=>{if(drag&&drag.id===e.pointerId)drag=null});
$('c').addEventListener('wheel',e=>{camDist=Math.max(3,Math.min(25,camDist+e.deltaY*.01))},{passive:true});
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a)); // shortest turn for any angle (yaws grow without limit)
const joy={x:0,y:0,id:null},jb=$('joy');
jb.addEventListener('pointerdown',e=>{if(joy.id!==null)return;joy.id=e.pointerId;jb.setPointerCapture(e.pointerId);mj(e);e.preventDefault();e.stopPropagation()});jb.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)mj(e)});
function joyEnd(){joy.id=null;joy.x=joy.y=0;$('knob').style.transform=''}
for(const ev of['pointerup','pointercancel','lostpointercapture'])jb.addEventListener(ev,e=>{if(e.pointerId===joy.id)joyEnd()});addEventListener('blur',joyEnd);
// centre and travel come from the real size (the stick is smaller in landscape); small touches are ignored
// and a push within 14 degrees of an axis counts as exactly that axis, so "forward" walks straight
function mj(e){const r=jb.getBoundingClientRect(),max=r.width*.38;let dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;const l=Math.hypot(dx,dy);if(l>max){dx*=max/l;dy*=max/l}$('knob').style.transform=`translate(${dx}px,${dy}px)`;
 const m=Math.min(1,l/max),DEAD=.16;if(m<DEAD){joy.x=joy.y=0;return}let a=Math.atan2(dy,dx);const q=Math.round(a/(PI/2))*(PI/2);if(Math.abs(a-q)<.245)a=q;const k=Math.min(1,(m-DEAD)/(.9-DEAD));joy.x=Math.cos(a)*k;joy.y=Math.sin(a)*k}
// ---- car controls on touch screens: steering buttons on the left, brake and gas pedals on the right
const DRV={l:0,r:0,g:0,b:0};
for(const[id,k]of[['dL','l'],['dR','r'],['dG','g'],['dB','b']]){const el=$(id);
 const on=e=>{e.preventDefault();DRV[k]=1;el.classList.add('down');try{el.setPointerCapture(e.pointerId)}catch(_){}if(navigator.vibrate)navigator.vibrate(8)};
 const off=()=>{DRV[k]=0;el.classList.remove('down')};
 el.addEventListener('pointerdown',on);for(const ev of['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,off)}
addEventListener('blur',()=>{for(const k in DRV)DRV[k]=0});
$('dE').onclick=()=>act();$('dH').onclick=()=>horn();
// stop long-press menus and double-tap zoom on the controls
for(const id of['touch'])$(id).addEventListener('contextmenu',e=>e.preventDefault());
let runT=false;$('tE').onclick=()=>act();{const tS=$('tS'),tW=$('tW');if(tS)tS.onclick=()=>toggleSit();if(tW)tW.onclick=()=>{if(!P.ride&&!SIT)doWave()}}$('tJ').onpointerdown=()=>{K[' ']=true;setTimeout(()=>K[' ']=false,150)};$('tR').onclick=()=>{runT=!runT;$('tR').textContent=runT?'Walk':'Run'};$('tH').onclick=()=>horn();
// ---- pause menu
let MENU=false;
function setMenu(v){MENU=v;$('pmenu').hidden=!v;if(v){for(const k in K)K[k]=false;$('pmResume').focus()}}
function escPressed(){if(MENU)return setMenu(false);if(mapOn)return toggleMap(false);if(phoneOn)return togglePhone(false);if(photo)return setPhoto(false);setMenu(true)}
$('menuBtn').onclick=()=>setMenu(true);
$('pmResume').onclick=()=>setMenu(false);
$('pmSet').onclick=()=>{setMenu(false);APP='set';document.querySelectorAll('.tabs button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.a==='set'));togglePhone(true)};
$('pmHelp').onclick=()=>{const u=$('pmKeys');u.hidden=!u.hidden;$('pmHelp').setAttribute('aria-expanded',!u.hidden)};
function backToCreator(){setMenu(false);togglePhone(false);if(mapOn)toggleMap(false);if(SIT)standUp();if(P.ride){P.ride.speed=0;P.ride=null;me.visible=true}
 creating=true;document.body.classList.add('creating');$('start').style.display='';CV.yaw=0;setZoom(1);$('sMoney').textContent='₹'+ST.money.toLocaleString('en-IN');$('go').textContent='Back to the city';heroRows()}
$('pmChar').onclick=backToCreator;
$('pmOut').onclick=async()=>{await logout();showAuth({kind:'none'});backToCreator()};
$('pmenu').onclick=e=>{if(e.target.id==='pmenu')setMenu(false)};
// ---- install as an app (PWA): Android/desktop Chrome & Edge get the real install prompt, iPhone gets instructions
let INSTALL_EV=null;const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
const IS_IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function showInstall(v){for(const id of['install','pmInstall'])$(id).hidden=!v}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();INSTALL_EV=e;showInstall(!isStandalone())});
addEventListener('appinstalled',()=>{INSTALL_EV=null;showInstall(false);toast('📲 Installed! Open Startup City from your home screen')});
if(IS_IOS&&!isStandalone())showInstall(true);
async function doInstall(){if(INSTALL_EV){INSTALL_EV.prompt();const r=await INSTALL_EV.userChoice;INSTALL_EV=null;if(r.outcome==='accepted')showInstall(false)}else if(IS_IOS)$('iosTip').hidden=false;else toast('Use your browser menu → Install app')}
// popup offering to install, once per three days, with a cross to close it
function maybeInstallPop(){if(isStandalone()||!(INSTALL_EV||IS_IOS))return;const no=store.get('mn2_inst_no')||0;if(Date.now()-no<3*864e5)return;$('installPop').hidden=false}
function closeInstallPop(){$('installPop').hidden=true;store.set('mn2_inst_no',Date.now())}
$('ipClose').onclick=$('ipNo').onclick=closeInstallPop;$('installPop').onclick=e=>{if(e.target.id==='installPop')closeInstallPop()};
$('ipYes').onclick=()=>{$('installPop').hidden=true;doInstall()};
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('installPop').hidden){e.stopImmediatePropagation();closeInstallPop()}},true);
setTimeout(maybeInstallPop,4000);addEventListener('beforeinstallprompt',()=>setTimeout(maybeInstallPop,4000));
$('install').onclick=doInstall;$('pmInstall').onclick=()=>{setMenu(false);doInstall()};$('iosOk').onclick=()=>$('iosTip').hidden=true;
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(e=>console.warn('service worker',e));
function setPhoto(v){photo=v;document.body.classList.toggle('photo',v);if(v)togglePhone(false)}
// ================= marker =================
const marker=new T.Group();{const beam=new T.Mesh(new T.CylinderGeometry(2,2,40,24,1,true),new T.MeshBasicMaterial({color:0xffd21f,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false,fog:false}));beam.position.y=20;marker.add(beam);const ring=new T.Mesh(new T.TorusGeometry(2.4,.12,8,40),new T.MeshBasicMaterial({color:0xffd21f}));ring.rotation.x=PI/2;ring.position.y=.35;marker.add(ring)}scene.add(marker);marker.visible=false;
function setMarker(x,z,c){marker.visible=true;marker.position.set(x,0,z);marker.children.forEach(m=>m.material.color.set(c))}
// ================= jobs =================
const PLACES=[{n:'City Junction',x:-124,z:20},{n:'Raju\'s Tea Stall',x:0,z:34},{n:'Market',x:84,z:34},{n:'Marine Drive',x:20,z:160},{n:'Your Home',x:FLAT.x,z:115},{n:'Hospital',x:80,z:-46},{n:'College',x:-80,z:-112},{n:'Mall',x:80,z:126},{n:'Sports Ground',x:-34,z:0}];
const JOBS={auto:{name:'Auto / Taxi driver',desc:'Pick up passengers and drop them off. Fare depends on distance.'},delivery:{name:'Food delivery',desc:'Pick up the order at Vada Pav Center and deliver it in 90 seconds.'},chai:{name:'Tea seller',desc:'Run Raju\'s tea stall. Read the order and serve the right item (1/2/3).'},police:{name:'Traffic police',desc:'Chase the red car that jumped the signal and stay close to catch it.'}};
let JOB=null;
function sidewalkSpot(minD){for(let k=0;k<60;k++){const b=WB[Math.floor(R()*WB.length)],s=Math.floor(R()*4),t=.1+R()*.8;const x=s===1?b.x1-1.4:s===3?b.x0+1.4:b.x0+(b.x1-b.x0)*t,z=s===0?b.z0+1.4:s===2?b.z1-1.4:b.z0+(b.z1-b.z0)*t;if(z<SEA-3&&!blocked(x,z,.6)&&Math.hypot(x-P.x,z-P.z)>minD)return{x,z}}return{x:0,z:34}}
function startJob(k){endJob(true);JOB={type:k,stage:0};if(k==='auto')nextRide();if(k==='delivery')JOB.stage=0;if(k==='police')newSpeeder();toast(JOBS[k].name+' started!');togglePhone(false)}
function endJob(silent){if(JOB){if(JOB.pass&&JOB.pass.parent)JOB.pass.parent.remove(JOB.pass);if(JOB.cust)scene.remove(JOB.cust.g);if(JOB.sp){JOB.sp.speeder=false;JOB.sp.v=12}}JOB=null;marker.visible=false;$('chai').style.display='none';if(!silent)toast('Job ended. Take a rest!');renderApp()}
function nextRide(){const s=sidewalkSpot(50);const g=npc(randLook());g.position.set(s.x,.25,s.z);scene.add(g);if(JOB.pass&&JOB.pass.parent)JOB.pass.parent.remove(JOB.pass);JOB.pass=g;JOB.stage=0;JOB.from=s;setMarker(s.x,s.z,0x2ecc71)}
function newSpeeder(){const cands=TRAFFIC.filter(t=>t.type==='car');const t=cands[Math.floor(R()*cands.length)];t.speeder=true;t.v=19;JOB.sp=t;JOB.catch=0;toast('A car jumped the red light! Chase it')}
const ORDERS=['Cutting chai','Masala chai','Vada pav'];
function serve(o){if(!JOB||JOB.type!=='chai'||!JOB.cust||!JOB.cust.arrived)return;const c=JOB.cust;if(o===c.order){const tip=c.wait<6?10:0;pay(20+tip,ORDERS[o]+(tip?' + tip':''));ding()}else toast('Hey, I asked for '+ORDERS[c.order]+'!');scene.remove(c.g);JOB.cust=null;JOB.next=1.5}
function here(){return P.ride?P.ride.g.position:{x:P.x,z:P.z}}
function updateJob(dt){if(!JOB){$('obj').innerHTML='';return}let o='';const h=here();
 if(JOB.type==='auto'){const cab=P.ride&&(P.ride.type==='auto'||P.ride.type==='taxi');
  if(!cab)o='<b>Taxi driver:</b> first get into an auto or taxi (E)';
  else if(JOB.stage===0){o='<b>Passenger</b> is waiting at the green light. Stop next to them.';JOB.pass.lookAt(h.x,.25,h.z);animH(JOB.pass,0,dt);if(Math.hypot(h.x-JOB.from.x,h.z-JOB.from.z)<7&&Math.abs(P.ride.speed)<2.5){JOB.stage=1;scene.remove(JOB.pass);P.ride.g.add(JOB.pass);JOB.pass.position.set(0,.35,-.55);JOB.pass.rotation.set(0,0,0);animH(JOB.pass,0,0,'sit');let d;do{d=PLACES[Math.floor(R()*PLACES.length)]}while(Math.hypot(d.x-h.x,d.z-h.z)<70);JOB.dest=d;JOB.dist=Math.hypot(d.x-h.x,d.z-h.z);setMarker(d.x,d.z,0xffd21f);toast('"To '+d.n+', please!"')}}
  else{o=`<b>Passenger:</b> drop off at ${JOB.dest.n}`;if(Math.hypot(h.x-JOB.dest.x,h.z-JOB.dest.z)<9&&Math.abs(P.ride.speed)<2.5){P.ride.g.remove(JOB.pass);JOB.pass=null;pay(Math.round(30+JOB.dist*.6),'Fare: '+JOB.dest.n);ding();nextRide()}}}
 if(JOB.type==='delivery'){if(JOB.stage===0){o='<b>Delivery:</b> pick up the order at Vada Pav Center';setMarker(VADA.x,VADA.z+3,0xe67e22);if(Math.hypot(h.x-VADA.x,h.z-VADA.z-3)<6){JOB.stage=1;JOB.time=0;const lot=LOTS[Math.floor(R()*LOTS.length)];JOB.dest={x:lot.x,z:lot.z+lot.front*(lot.d/2+2.2)};setMarker(JOB.dest.x,JOB.dest.z,0xe67e22);toast('Order picked up! Deliver it within 90 seconds')}}
  else{JOB.time+=dt;const left=Math.max(0,90-JOB.time);o=`<b>Delivery:</b> deliver the hot vada pav · ${Math.ceil(left)}s`;if(Math.hypot(h.x-JOB.dest.x,h.z-JOB.dest.z)<6){pay(left>0?Math.round(40+left*.6):20,left>0?'Delivery + tip':'Late delivery');ding();JOB.stage=0}}}
 if(JOB.type==='police'){const sp=JOB.sp;if(!sp){JOB.wait=(JOB.wait||0)-dt;o='<b>Traffic police:</b> waiting for the next case…';if(JOB.wait<=0)newSpeeder()}else{const p=sp.veh.g.position;setMarker(p.x,p.z,0xff3b30);const d=Math.hypot(p.x-h.x,p.z-h.z);if(d<10)JOB.catch+=dt;else JOB.catch=Math.max(0,JOB.catch-dt*.5);o=`<b>Traffic police:</b> stay close to the red car · ${Math.round(Math.min(100,JOB.catch/2.5*100))}% caught`;if(JOB.catch>=2.5){pay(150,'Fine collected');ding();sp.speeder=false;sp.v=12;JOB.sp=null;JOB.wait=6}}}
 if(JOB.type==='chai'){const near=!P.ride&&Math.hypot(P.x-TAPRI.x,P.z-23.5)<3.5;
  if(JOB.stage===0){o='<b>Tea seller:</b> go behind the counter at Raju\'s Tea Stall';setMarker(0,23.5,0x19a7a0);if(near){JOB.stage=1;marker.visible=false;JOB.next=1;toast('The stall is open!')}}
  else if(!near){o='<b>Tea seller:</b> come back to the counter';$('chai').style.display='none'}
  else if(!JOB.cust){JOB.next-=dt;o='<b>Tea seller:</b> waiting for the next customer…';$('chai').style.display='none';if(JOB.next<=0){const g=npc(randLook());g.position.set(16,.25,36);scene.add(g);JOB.cust={g,order:Math.floor(R()*3),arrived:false,wait:0}}}
  else{const c=JOB.cust,dx=0-c.g.position.x,dz=29.6-c.g.position.z,l=Math.hypot(dx,dz);if(l>.3){c.g.position.x+=dx/l*1.6*dt;c.g.position.z+=dz/l*1.6*dt;c.g.rotation.y=Math.atan2(dx,dz);animH(c.g,1.6,dt);o='<b>Tea seller:</b> a customer is coming…'}else{c.arrived=true;c.wait+=dt;c.g.rotation.y=PI;animH(c.g,0,dt);o=`<b>Customer:</b> "One <b>${ORDERS[c.order]}</b>, please!" (press ${c.order+1})`;$('chai').style.display='flex'}}}
 $('obj').innerHTML=o}
// ================= solid vehicles =================
// every vehicle is a box [half width, half length] that turns with it: traffic, parked ones and other players'
const VHALF={car:[.94,2.18],taxi:[.86,2.12],auto:[.72,1.36],bus:[1.36,5.62],scooter:[.36,.96]};
function solidVehicles(){const L=TRAFFIC.map(t=>t.veh);for(const v of RIDES)if(v!==P.ride)L.push(v);if(NETAPI&&NETAPI.vehicles)L.push(...NETAPI.vehicles());return L}
// is a circle (x,z,r) inside this vehicle? returns the point in the vehicle's own axes
function inVehicle(v,x,z,r){const h=VHALF[v.type]||VHALF.car,p=v.g.position,dx=x-p.x,dz=z-p.z,c=Math.cos(v.g.rotation.y),s=Math.sin(v.g.rotation.y),lx=dx*c-dz*s,lz=dx*s+dz*c,hw=h[0]+r,hl=h[1]+r;return Math.abs(lx)<hw&&Math.abs(lz)<hl?{lx,lz,hw,hl,c,s}:null}
// on foot: move the player back out through the nearest side that is not inside a wall
function pushOutOfVehicles(){for(const v of solidVehicles()){const q=inVehicle(v,P.x,P.z,.3);if(!q)continue;const{lx,lz,hw,hl,c,s}=q,p=v.g.position;
  const out=[[hw-lx,hw,lz],[hw+lx,-hw,lz],[hl-lz,lx,hl],[hl+lz,lx,-hl]].sort((a,b)=>a[0]-b[0]);
  for(const[,ax,az]of out){const nx=p.x+ax*c+az*s,nz=p.z-ax*s+az*c;if(!blocked(nx,nz,.3)){P.x=nx;P.z=nz;break}}}}
// driving: would my vehicle, moved to (x,z), run into another one? Moving away from a vehicle is always allowed.
function carHit(me_,x,z){const h=VHALF[me_.type]||VHALF.car,g=me_.g,fx=Math.sin(g.rotation.y),fz=Math.cos(g.rotation.y),r=h[0],end=h[1]-h[0],n=Math.max(1,Math.ceil(end*2/r));
 return solidVehicles().some(v=>{const p=v.g.position;if(Math.hypot(p.x-x,p.z-z)>12||Math.hypot(p.x-x,p.z-z)>Math.hypot(p.x-g.position.x,p.z-g.position.z))return false;
  for(let i=0;i<=n;i++){const o=-end+2*end*i/n;if(inVehicle(v,x+fx*o,z+fz*o,r))return true}return false})}
// ================= interactions =================
function nearRide(){const r=RIDES.find(v=>Math.hypot(v.g.position.x-P.x,v.g.position.z-P.z)<(v.type==='scooter'?2.5:3.6));if(r)return r;
 const t=TRAFFIC.find(t=>Math.hypot(t.veh.g.position.x-P.x,t.veh.g.position.z-P.z)<(t.type==='bus'?6.5:4));if(t){t.veh._traffic=t;return t.veh}return null}
function takeRide(r){if(r._traffic){const i=TRAFFIC.indexOf(r._traffic);if(i>=0)TRAFFIC.splice(i,1);delete r._traffic;r.speed=0;RIDES.push(r)}}
function act(){if(ONTRAIN){if(train.wait>0){ONTRAIN=null;P.x=-140;P.z=Math.max(-44,Math.min(44,P.z));P.y=1.25;P.vy=0;camDist=FOOT_CAM;toast('You got off at the station')}else toast('The metro is moving — get off at the station');return}
 if(nearMetro()){ONTRAIN=METRO.seat;SIT=null;camDist=3.4;toast('You boarded the metro! Press E at the station to get off');return}
const h=here();
 if(P.ride){const g=P.ride.g;if(Math.abs(P.ride.speed)>3){toast('Stop the vehicle first!');return}const side=new T.Vector3(-2.2,0,0).applyAxisAngle(new T.Vector3(0,1,0),g.rotation.y);let nx=g.position.x+side.x,nz=g.position.z+side.z;if(blocked(nx,nz,.5)){nx=g.position.x-side.x;nz=g.position.z-side.z}P.x=nx;P.z=nz;P.ride.speed=0;P.ride=null;me.visible=true;camDist=FOOT_CAM;return}
 const r=nearRide();if(r){takeRide(r);P.ride=r;me.visible=false;camDist=r.type==='bus'?16:r.type==='scooter'?6:9;toast({auto:'Auto started!',taxi:'Taxi started!',scooter:'Scooter started!',car:'Car started!'}[r.type]||'Let\'s go!');return}
 const vd=nearVendor();if(vd){buyVendor(vd);return}
 {const sp=BOARDS.near(P.x,P.z);if(sp){viewSpot(sp);return}}
 if(Math.hypot(P.x-FLAT.x,P.z-FLAT.z)<3){sleep();return}
 if(Math.hypot(P.x-VADA.x,P.z-VADA.z-1.6)<3){if(ST.money<15)return toast('Not enough money');ST.hunger=Math.min(100,ST.hunger+35);pay(-15,'Vada pav');return}
 if(Math.hypot(P.x-TAPRI.x,P.z-29.5)<2.6&&!(JOB&&JOB.type==='chai')){if(ST.money<10)return toast('Not enough money');ST.hunger=Math.min(100,ST.hunger+10);ST.energy=Math.min(100,ST.energy+20);pay(-10,'Cutting chai');return}
 const p=PEDS.find(q=>q.active&&q.mode!=='fall'&&q.g.position.distanceTo(me.position)<3);if(p){say(p,LINES[Math.floor(R()*LINES.length)]);if(!p.static){p.mode='talk';p.t=3.5}}}
function say(p,t){if(p.bub)p.g.remove(p.bub);const s=bubble(t);s.position.y=2.1;p.g.add(s);p.bub=s;p.bt=3.5}
function sleep(){$('fade').textContent='Zzz… good morning';$('fade').classList.add('on');setTimeout(()=>{if(TIME>7/24)ST.day++;TIME=7/24;ST.energy=100;ST.hunger=Math.max(0,ST.hunger-20);save();$('fade').classList.remove('on')},1300)}
function hintText(){if(ONTRAIN)return train.wait>0?'E: get off the metro':'Metro is moving… wait for the next stop';if(nearMetro())return'E: board the metro';if(SIT)return'X: stand up';if(!P.ride&&nearSeat())return'X: sit';if(!P.ride){const sp=BOARDS.near(P.x,P.z);if(sp){const t=BOARDS.taken(sp.code);return t?'E: view '+t.startup+' (spot '+sp.code+')':'E: view or take billboard spot '+sp.code}}if(P.ride)return Math.abs(P.ride.speed)<3?'E: get out · H: horn':'';const r=nearRide();if(r)return'E: '+({auto:'auto',taxi:'taxi',scooter:'scooter',car:'your car',bus:'bus'}[r.type])+' drive';{const vd=nearVendor();if(vd)return'E: '+VT[vd.type].n+' (₹'+VT[vd.type].price+')'}if(Math.hypot(P.x-FLAT.x,P.z-FLAT.z)<3)return'E: sleep (until morning)';if(Math.hypot(P.x-VADA.x,P.z-VADA.z-1.6)<3)return'E: eat vada pav (₹15)';if(Math.hypot(P.x-TAPRI.x,P.z-29.5)<2.6&&!(JOB&&JOB.type==='chai'))return'E: cutting chai (₹10)';if(PEDS.some(q=>q.active&&q.g.position.distanceTo(me.position)<3))return'E: talk';return''}
// ================= phone =================
let APP='home';const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function togglePhone(v){phoneOn=v===undefined?!phoneOn:v;$('phone').classList.toggle('on',phoneOn);document.body.classList.toggle('phoneOn',phoneOn);if(phoneOn)renderApp()}
$('phoneBtn').onclick=()=>togglePhone();$('closePhone').onclick=()=>togglePhone(false);
document.querySelector('.tabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;phoneGo(b.dataset.a)};
function phoneGo(app){if(app)APP=app;document.querySelectorAll('.tabs button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.a===APP||(APP==='thread'&&x.dataset.a==='chats')));renderApp()}
$('pBack').onclick=()=>phoneGo(APP==='thread'?'chats':'home');
const PH_APPS=[['profile','🪪','Profile','#ff8a2a'],['nearby','📡','Nearby','#37b6ff'],['network','🤝','Network','#2ecc71'],['chats','💬','Chats','#b07cff'],['cafe','☕','Café','#1f6f5c'],['bill','📢','Billboard','#e8742a'],['map','🗺️','Map','#f5a623'],['jobs','💼','Jobs','#e84393'],['upi','💳','UPI','#16a085'],['shop','🛍️','Shop','#ff6b6b'],['set','⚙️','Settings','#7f8c8d']];
const PH_TITLE={home:'Startup City',map:'Map',jobs:'Jobs',upi:'UPI',shop:'Shop',set:'Settings',bill:'Billboard'};
function phoneBadges(){const n=SOC.unreadTotal();const b=$('chatBadge');if(b){b.hidden=!n;b.textContent=n>9?'9+':n}$('phoneBtn').dataset.badge=n?(n>9?'9+':String(n)):''}
function homeHTML(){const p=SOC.S.me,[rn,re,rc]=roleInfo(p?p.role:ST.role),near=NETAPI&&NETAPI.nearby?NETAPI.nearby().length:0,net=SOC.S.conns.filter(c=>c.status==='accepted').length,un=SOC.unreadTotal();
 return `<div class="phello"><div class="pav" style="--rc:${rc}">${esc((ST.name||'?')[0].toUpperCase())}</div><div class="pinfo"><b>Hi, ${esc(ST.name)}</b> <span class="rchip" style="--rc:${rc}">${re} ${rn}</span>${p&&p.startup?`<div class="pst">${esc(p.startup)}</div>`:`<div class="pst dim">Add your startup in Profile</div>`}</div></div>
 <div class="pstats"><div><b>₹${Math.floor(ST.money).toLocaleString('en-IN')}</b><small>Balance</small></div><div><b>${near}</b><small>Nearby</small></div><div><b>${net}</b><small>Network</small></div></div>
 <div class="agrid">${PH_APPS.map(([k,ic,n,c])=>`<button data-open="${k}" style="--ac:${c}"><i>${ic}</i><span>${n}</span>${k==='chats'&&un?`<em>${un>9?'9+':un}</em>`:''}</button>`).join('')}</div>`}
let WEATHER=store.get('mn2_w')||'auto';
function renderApp(){if(!phoneOn)return;const a=$('app');$('pTitle').textContent=SOC.isApp(APP)?SOC.title(APP):(PH_TITLE[APP]||'Startup City');$('pBack').hidden=APP==='home';phoneBadges();
 if(SOC.isApp(APP)){if(!a.dataset.app||a.dataset.app!==APP)a.innerHTML='<p class="empty">Loading…</p>';a.dataset.app=APP;SOC.render(APP,a);return}a.dataset.app=APP;
 if(APP==='home'){a.innerHTML=homeHTML();return}
 if(APP==='bill'){spotApp(a);return}
 if(APP==='jobs')a.innerHTML=(JOB?`<div class="job"><h3>Now: ${JOBS[JOB.type].name}</h3><button class="ghost" data-end>Quit job</button></div>`:'')+Object.entries(JOBS).map(([k,j])=>`<div class="job"><h3>${j.name}</h3><p>${j.desc}</p><button data-job="${k}">${JOB&&JOB.type===k?'In progress':'Start'}</button></div>`).join('');
 if(APP==='map'){a.innerHTML='<canvas id="bigmap" width="600" height="600"></canvas><p style="font-size:14px;margin:8px 0">Yellow = you · green = job/destination</p><button data-home>Teleport home (₹20)</button> <button data-bigmap>Big map (M)</button>';drawMap($('bigmap'),true)}
 if(APP==='upi')a.innerHTML=`<div class="job"><h3>${esc(ST.name)} · ₹${Math.floor(ST.money).toLocaleString('en-IN')}</h3><p>City UPI · all your payments</p></div>`+(ST.tx.length?ST.tx.map(t=>`<div class="tx"><span>${esc(t.why)} <small style="opacity:.6">${esc(t.t)}</small></span><span style="color:${t.n>=0?'#2ecc71':'#ff6b6b'}">${t.n>=0?'+':'-'}₹${Math.abs(t.n)}</span></div>`).join(''):'<p>No transactions yet. Get a job!</p>');
 if(APP==='shop')a.innerHTML=[['scooter','Scooter',1500,'Fast and cheap. Parked outside your home.'],['car','Hatchback car',6000,'Your own car with AC.']].map(([k,n,c,d])=>`<div class="job"><h3>${n} · ₹${c.toLocaleString('en-IN')}</h3><p>${d}</p>${ST.owned.includes(k)?'<button class="ghost" disabled>Owned</button>':`<button data-buy="${k}" data-c="${c}">Buy</button>`}</div>`).join('')+`<div class="job"><h3>New clothes · ₹200</h3><p>New colours, new look.</p><button data-cloth>Change</button></div>`;
 if(APP==='set')a.innerHTML=`<div class="job"><h3>Graphics</h3><div class="seg">${['low','med','high'].map(q=>`<button data-q="${q}" aria-pressed="${Q===q}">${{low:'Low',med:'Medium',high:'High'}[q]}</button>`).join('')}</div>
  <h3>Weather</h3><div class="seg">${[['auto','Auto'],['clear','Clear'],['rain','Rain']].map(([k,n])=>`<button data-w="${k}" aria-pressed="${WEATHER===k}">${n}</button>`).join('')}</div>
  <h3>Sound</h3><div class="seg"><button data-mute aria-pressed="${!muted}">${muted?'Off':'On'}</button></div>
  <h3>Photo mode</h3><div class="seg"><button data-photo>Open (C)</button></div></div>
  <div class="job"><h3>Help</h3><p>WASD to walk, Shift to run, Space to jump, V to wave, drag to move the camera. E near a vehicle to drive. E at your front door to sleep. Eat vada pav or drink chai when hungry. With low energy you can't run.</p></div>
  <div class="job"><button class="ghost" data-reset>New game (reset everything)</button></div>`}
$('app').addEventListener('submit',e=>{if(e.target.closest('[data-s]'))SOC.handle(e,phoneGo)});
$('app').onclick=e=>{{const s=e.target.closest('[data-open],[data-s]');if(s){if(s.dataset.open){if(s.dataset.open==='cafe')goCafe();else phoneGo(s.dataset.open);return}SOC.handle(e,phoneGo);return}}const t=e.target.closest('button');if(!t)return;const d=t.dataset;
 if(d.job)startJob(d.job);if('end' in d)endJob();if('home' in d){if(ST.money<20)return toast('Not enough money');if(P.ride){P.ride.speed=0;P.ride=null;me.visible=true}pay(-20,'Teleport home');P.x=FLAT.x;P.z=FLAT.z+1.5;togglePhone(false)}
 if(d.buy){const c=+d.c;if(ST.money<c)return toast('Not enough money');ST.owned.push(d.buy);pay(-c,d.buy==='car'?'Bought a car':'Bought a scooter');spawnOwned();renderApp();toast('It\'s parked outside your home!')}
 if('cloth' in d){if(ST.money<200)return toast('Not enough money');if(outfitList().length>1){ST.look.outfit=((ST.look.outfit|0)+1)%outfitList().length;applyOutfit();outfitSw();pay(-200,'New clothes');return}ST.look.top=TOPS[Math.floor(R()*TOPS.length)];ST.look.bottom=BOTS[Math.floor(R()*BOTS.length)];rebuildMe();pay(-200,'New clothes')}
 if(d.q){Q=d.q;store.set('mn2_q',Q);applyQ();renderApp()}if(d.w){WEATHER=d.w;store.set('mn2_w',WEATHER);renderApp()}
 if('mute' in d){muted=!muted;store.set('mn2_mute',muted);renderApp()}if('photo' in d)setPhoto(true);if('bigmap' in d)toggleMap(true);
 if('reset' in d){store.set('mn2_save',null);location.reload()}};
// ================= maps =================
const polyPath=(x,pts)=>{x.beginPath();pts.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath()};
function drawWorld(x,big){x.fillStyle='#1a5566';x.fillRect(-1600,-1600,3200,3200);if(DMAP.land){x.fillStyle='#a89f8f';polyPath(x,DMAP.land);x.fill()}
 for(const z of DMAP.zones){x.fillStyle=z.c;polyPath(x,z.pts);x.fill()}x.fillStyle='#b8b1a3';x.fillRect(-LIM,-LIM,2*LIM,LIM+SEA);x.strokeStyle='#3a3b3f';x.lineJoin='round';for(const L of DMAP.lines){x.lineWidth=L.w;x.beginPath();L.pts.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));if(L.closed)x.closePath();x.stroke()}x.fillStyle='#5d8a3a';x.fillStyle='#5d8a3a';x.fillRect(-30,-30,60,60);x.fillStyle='#8a8580';for(const l of LOTS)x.fillRect(l.x-l.w/2,l.z-l.d/2,l.w,l.d);
 x.fillStyle='#3a3b3f';for(const r of ROADS){x.fillRect(-LIM,r-7,2*LIM,RW);x.fillRect(r-7,-LIM,RW,LIM+SEA)}x.fillStyle='#6f665b';x.fillRect(-157,-LIM,14,2*LIM);
 if(big){x.fillStyle='#fff';x.font='700 7px "Baloo 2",sans-serif';for(const p of PLACES)x.fillText(p.n,p.x-12,p.z);x.font='800 12px "Baloo 2",sans-serif';x.fillStyle='#fffaf0';for(const p of EXTRA_PLACES)x.fillText(p.n,p.x-20,p.z)}}
function drawMap(cv,big){const x=cv.getContext('2d'),s=cv.width/360;x.save();x.scale(s,s);x.translate(180,180);drawWorld(x,true);const h=here();if(marker.visible){x.fillStyle='#2ecc71';x.beginPath();x.arc(marker.position.x,marker.position.z,5,0,7);x.fill()}x.fillStyle='#ffd21f';x.strokeStyle='#141414';x.lineWidth=2;x.beginPath();x.arc(h.x,h.z,4,0,7);x.fill();x.stroke();x.restore()}
function drawMini(){const cv=$('mini'),x=cv.getContext('2d'),h=here();x.save();x.clearRect(0,0,300,300);x.beginPath();x.arc(150,150,150,0,7);x.clip();x.translate(150,150);x.rotate(camYaw);x.scale(2.2,2.2);x.translate(-h.x,-h.z);drawWorld(x,false);
 x.fillStyle='#e74c3c';for(const t of TRAFFIC)x.fillRect(t.veh.g.position.x-1.5,t.veh.g.position.z-1.5,3,3);if(marker.visible){x.fillStyle='#2ecc71';x.beginPath();x.arc(marker.position.x,marker.position.z,4,0,7);x.fill()}x.restore();
 // upright overlay: nearby place names, then real players (held on the rim when they are off the map)
 const at=(wx,wz)=>{const dx=(wx-h.x)*2.2,dz=(wz-h.z)*2.2,c=Math.cos(camYaw),s=Math.sin(camYaw);return[dx*c-dz*s,dx*s+dz*c]};
 x.textAlign='center';x.textBaseline='middle';x.font='800 19px "Baloo 2",sans-serif';x.lineWidth=5;
 const near=[...PLACES,...EXTRA_PLACES,...mapExtra()].map(p=>[p,Math.hypot(p.x-h.x,p.z-h.z)]).filter(q=>q[1]<62).sort((a,b)=>a[1]-b[1]),used=[];
 for(const[p]of near){const[a,b]=at(p.x,p.z);if(used.some(u=>Math.abs(u[1]-b)<24&&Math.abs(u[0]-a)<110))continue;used.push([a,b]);x.strokeStyle='rgba(15,15,20,.9)';x.strokeText(p.n,150+a,150+b);x.fillStyle='#fff';x.fillText(p.n,150+a,150+b);if(used.length>=3)break}
 for(const q of allPlayers()){let[a,b]=at(q.x,q.z);const l=Math.hypot(a,b),far=l>132;if(far){a*=132/l;b*=132/l}x.fillStyle=PLAYER_COL;x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(150+a,150+b,far?9:13,0,7);x.fill();x.stroke();
  if(!far){x.fillStyle='#fff';x.font='800 16px "Baloo 2",sans-serif';x.fillText((q.name||'?')[0].toUpperCase(),150+a,151+b)}}
 x.save();x.translate(150,150);x.rotate(PI-(P.ride?P.ride.g.rotation.y:P.yaw)+camYaw);x.fillStyle='#ffd21f';x.strokeStyle='#141414';x.lineWidth=3;x.beginPath();x.moveTo(0,-12);x.lineTo(9,10);x.lineTo(-9,10);x.closePath();x.fill();x.stroke();x.restore()}
// ================= rain =================
const RN=3500,rainGeo=new T.BufferGeometry(),rainPos=new Float32Array(RN*6);for(let i=0;i<RN;i++){const x=(R()-.5)*80,y=R()*40,z=(R()-.5)*80;rainPos.set([x,y,z,x+.05,y-.7,z],i*6)}rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));
const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:0xaabbcc,transparent:true,opacity:.0,fog:false,depthWrite:false}));rain.frustumCulled=false;scene.add(rain);
let wet=0,rainAmt=0,rainTarget=0,weatherT=240;
// ================= character creator =================
// debug: ?top=x,z,height shows the map straight from above (for checking roads and building placement)
const TOPV=(()=>{const v=(new URLSearchParams(location.search).get('top')||'').split(',').map(Number);return v.length===3&&v.every(isFinite)?v:null})();if(TOPV)document.getElementById('start').style.display='none';
// debug: ?cam=x,y,z,tx,ty,tz fixes the camera (for screenshots of a spot)
const CAMV=(()=>{const v=(new URLSearchParams(location.search).get('cam')||'').split(',').map(Number);return v.length===6&&v.every(isFinite)?v:null})();if(CAMV)document.getElementById('start').style.display='none';
let creating=true;const CLOSE=new URLSearchParams(location.search).get('closeup'),CYAW=new URLSearchParams(location.search).get('yaw'),CWALK=+new URLSearchParams(location.search).get('walk')||0,CPHONE=new URLSearchParams(location.search).has('phone');if(CLOSE)document.getElementById('start').style.display='none';const SKINSW=SKINS,TOPSW=TOPS.slice(0,8),BOTSW=BOTS;
function swatches(id,list,key){$(id).innerHTML=list.map((c,i)=>`<button aria-label="colour ${i+1}" data-i="${i}" style="background:#${c.toString(16).padStart(6,'0')}" aria-pressed="${ST.look[key]===c}"></button>`).join('');$(id).onclick=e=>{const b=e.target.closest('button');if(!b)return;ST.look[key]=list[+b.dataset.i];rebuildMe();swatches(id,list,key);presetSw()}}
function genderSw(){$('sG').innerHTML=['♂ Male','♀ Female'].map((n,i)=>`<button type="button" data-i="${i}" aria-pressed="${!!ST.look.female===!!i}">${n}</button>`).join('');$('sG').onclick=e=>{const b=e.target.closest('button');if(!b)return;ST.look.female=b.dataset.i==='1';ST.look.kurti=ST.look.female;ST.look.outfit=0;rebuildMe();genderSw();outfitSw();applyOutfit();presetSw()}}
// ---- start screen: tabs, quick looks, and turning / zooming the character
function sTab(t){$('start').dataset.tab=t;for(const b of $('sTabs').children)b.setAttribute('aria-pressed',b.dataset.t===t)}
$('sTabs').onclick=e=>{const b=e.target.closest('button');if(b)sTab(b.dataset.t)};$('sAcc').onclick=()=>sTab('account');sTab(innerWidth<=760?'me':'look');
const CV={yaw:0,zoom:1,drag:null};
function setZoom(z){CV.zoom=Math.max(1,Math.min(3,z));$('sStage').classList.toggle('zoomed',CV.zoom>1.01)}
$('sStage').addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;CV.drag={x:e.clientX,id:e.pointerId};$('sStage').setPointerCapture(e.pointerId)});
$('sStage').addEventListener('pointermove',e=>{const d=CV.drag;if(!d||d.id!==e.pointerId)return;CV.yaw+=(e.clientX-d.x)*.012;d.x=e.clientX});
for(const ev of['pointerup','pointercancel'])$('sStage').addEventListener(ev,()=>CV.drag=null);
$('sStage').addEventListener('wheel',e=>setZoom(CV.zoom-e.deltaY*.002),{passive:true});
$('sStage').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const v=b.dataset.v;if(v==='turn')CV.yaw+=PI/4;else if(v==='in')setZoom(CV.zoom+.5);else if(v==='out')setZoom(CV.zoom-.5);else{CV.yaw=0;setZoom(1)}});
// quick looks: name, hair style, hair colour, top style, top, inner tee, pant style, pants, shoes
const LOOKS=[['Street',0,0x1b1d2b,0,0x8c1f2c,0xd8d8d4,0,0x1b1b1b,0xf2f2f2],['Office',0,0x1b1d2b,2,0xf5f5f0,0xd8d8d4,1,0x22324a,0x6b4a2a],['Sunny',0,0x1b1d2b,0,0xf2b624,0x2b2b2b,1,0x7d8288,0xf2f2f2],['Suit',0,0x1b1d2b,4,0x1b2a4a,0xd8d8d4,3,0x1b2a4a,0x17171a],['Blazer',0,0x1b1d2b,5,0xb08d63,0xf2f2f2,1,0x22324a,0x6b4a2a],['Bomber',0,0x1b1d2b,6,0x2f4a3a,0xd8d8d4,4,0x1b1b1b,0xf2f2f2],['Night',0,0x1b1d2b,1,0x222224,0xd8d8d4,0,0x1b1b1b,0xf2f2f2],['Fest',0,0x1b1d2b,3,0x0f5c4a,0xd8d8d4,1,0xe9e4d8,0x6b4a2a]];
// the portraits come as one sheet (4 across, 2 down, same order as LOOKS) on white: cut them out once and
// clear the white that is connected to each tile's edge, so white shirts stay solid
let LOOK_ART=[];
{const img=new Image();img.onload=()=>{const cw=img.width/4,ch=img.height/2,w=Math.round(cw*.66),h=Math.round(ch);
  LOOK_ART=LOOKS.map((_,i)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,(i%4)*cw+(cw-w)/2,Math.floor(i/4)*ch,w,h,0,0,w,h);
   const d=x.getImageData(0,0,w,h),p=d.data,seen=new Uint8Array(w*h),todo=[];const white=k=>p[k*4]>243&&p[k*4+1]>243&&p[k*4+2]>243;
   const visit=k=>{if(!seen[k]&&white(k)){seen[k]=1;todo.push(k)}};
   for(let u=0;u<w;u++){visit(u);visit((h-1)*w+u)}for(let v=0;v<h;v++){visit(v*w);visit(v*w+w-1)}
   while(todo.length){const k=todo.pop(),u=k%w;p[k*4+3]=0;if(u>0)visit(k-1);if(u<w-1)visit(k+1);if(k>=w)visit(k-w);if(k<w*(h-1))visit(k+w)}
   // soften the pale fringe left around the cut
   for(let k=0;k<w*h;k++){if(seen[k])continue;const m=Math.min(p[k*4],p[k*4+1],p[k*4+2]);if(m>215&&(seen[k-1]||seen[k+1]||seen[k-w]||seen[k+w]))p[k*4+3]=Math.max(0,(250-m)*7)}
   x.putImageData(d,0,0);return c.toDataURL()});
  presetSw()};img.src='icons/quick-looks.webp'}
const lookNow=()=>{const l=ST.look;return LOOKS.findIndex(([,,,ts,top,,,bot])=>(l.topS|0)===ts&&l.top===top&&l.bottom===bot)};
function presetSw(){const on=lookNow();$('sP').innerHTML=LOOKS.map(([n],i)=>`<button type="button" data-i="${i}" aria-label="${n} look" aria-pressed="${i===on}">${LOOK_ART[i]?`<img src="${LOOK_ART[i]}" alt="">`:'<i></i>'}<span>${n}</span></button>`).join('');
 const face=$('sFace');if(face){const art=LOOK_ART[Math.max(0,on)];face.hidden=!art;if(art)face.src=art}
 // the portraits are of the male character, so they are hidden for the female one
 $('start').classList.toggle('female',!!ST.look.female)}
$('sP').onclick=e=>{const b=e.target.closest('button');if(!b)return;const[,hairS,hairC,topS,top,tee,botS,bottom,shoes]=LOOKS[+b.dataset.i];Object.assign(ST.look,{hairS,hairC,topS,top,tee,botS,bottom,shoes});
 if(outfitList().length){Object.assign(vcGet(),{hair:hairC,top,bottom,shoes});applyColors();colorRows()}
 rebuildMe();presetSw();swatches('sT',TOPSW,'top');swatches('sB',BOTSW,'bottom');heroRows()};
// ---- multiplayer (Supabase Realtime, see net.js / net-config.js)
let NETAPI=null;
function lookPayload(){const l=ST.look;return{female:!!l.female,skin:l.skin,top:l.top,bottom:l.bottom,outfit:l.outfit|0,hairS:l.hairS|0,hairC:l.hairC,tee:l.tee,topS:l.topS|0,botS:l.botS|0,shoes:l.shoes}}
// extra Ladka rows: hair style + colour, top style, inner tee, pant style, shoes
const H_ROWS=[['hairS','Hair style',HAIR_STYLES],['hairC','Hair colour',[0x1b1d2b,0x15110e,0x3b2314,0x7a4a24,0xc9a26b,0x9a9a9a,0x7a1f2b,0x2d3e8f]],['topS','Top style',TOP_STYLES],
 ['tee','Shirt / T-shirt',[0xd8d8d4,0x2b2b2b,0xc0392b,0x2c5fa8,0xf2c94c,0x1e7b4a]],['botS','Pants style',BOT_STYLES],['shoes','Shoes',[0x17171a,0xf2f2f2,0xc0392b,0x2c5fa8,0x6b4a2a]]];
function heroRows(){const el=$('hRows');const hl=$('hLook'),isHair=k=>k==='hairS'||k==='hairC';if(ST.look.female||CHAR_WAIT||outfitList().length){el.style.display=hl.style.display='none';return}el.style.display=hl.style.display='';const l=ST.look;
 const rows=want=>H_ROWS.filter(([k])=>isHair(k)===want&&(k!=='tee'||[0,4,5,6].includes(l.topS|0))).map(([k,n,list])=>`<label>${n}</label><div class="sw" data-k="${k}">${typeof list[0]==='string'?list.map((t,i)=>`<button data-v="${i}" aria-pressed="${(l[k]|0)===i}" style="width:auto;padding:0 12px;border-radius:12px;background:#2a2a2a;color:#fff">${t}</button>`).join(''):list.map(v=>`<button aria-label="colour" data-v="${v}" aria-pressed="${(l[k]??list[0])===v}" style="background:#${v.toString(16).padStart(6,'0')}"></button>`).join('')}</div>`).join('');el.innerHTML=rows(false);hl.innerHTML=rows(true);
 el.onclick=hl.onclick=e=>{const b=e.target.closest('button'),row=e.target.closest('[data-k]');if(!b||!row)return;ST.look[row.dataset.k]=+b.dataset.v;if(row.dataset.k==='topS'&&+b.dataset.v===4){Object.assign(ST.look,{top:0x1b2a4a,bottom:0x1b2a4a,botS:3,shoes:0x17171a,tee:0xd8d8d4});swatches('sT',TOPSW,'top');swatches('sB',BOTSW,'bottom')}rebuildMe();heroRows();presetSw()}}
function chatLine(n,t,mine){const d=document.createElement('div');if(mine)d.className='me';const b=document.createElement('b');b.textContent=n+': ';d.append(b,document.createTextNode(t));const L=$('chatLog');L.append(d);while(L.children.length>7)L.firstChild.remove();setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),900)},14000);if(mine){if(me.userData._bub)me.remove(me.userData._bub);const s=bubble(t.slice(0,60));s.position.y=2.1;me.add(s);me.userData._bub=s;setTimeout(()=>{if(me.userData._bub===s){me.remove(s);me.userData._bub=null}},5000)}}
function startMultiplayer(){if(NETAPI)return;NETAPI=startNet({scene,animH,bubble,vehicle:t=>vehicle(t),makeAvatar:l=>{const o=Object.assign({skin:0xc68642,top:0x2b2b2b,bottom:0x1b1b1b},l);return o.female?human(o):hero(o)},
 local:()=>({x:P.x,y:P.y,z:P.z,yaw:P.ride?P.ride.g.rotation.y:P.yaw,speed:P.ride?Math.abs(P.ride.speed):(me.userData.spd||0),state:SIT?'sit':ONTRAIN?'metro':P.ride?'ride:'+P.ride.type:'',name:ST.name,look:lookPayload(),role:ST.role||'Explorer',uid:AUTH.id||'',startup:(SOC.S.me&&SOC.S.me.startup)||''}),onMeet:(n,x,z)=>{setGPS(x,z);toast('📍 '+n+' wants to meet you: follow the purple light')},
 greet:()=>{if(!SIT&&!P.ride)doWave()},onChat:chatLine,onNobody:m=>toast('No one within '+m+' m can hear you'),onStatus:t=>{$('online').textContent=(t.startsWith('Online')?'🟢 ':'⚪ ')+t}})}
function openChat(){const i=$('chatIn');i.hidden=false;i.focus()}
$('chatBtn').onclick=openChat;
$('chatIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){if(NETAPI)NETAPI.chat(e.target.value);else chatLine(ST.name,e.target.value,true);e.target.value='';e.target.hidden=true;e.target.blur()}if(e.key==='Escape'){e.target.value='';e.target.hidden=true;e.target.blur()}});
// ---- VRoid characters: models/characters.json lists outfits per gender (each outfit = one .vrm export)
const VQ=new URLSearchParams(location.search).get('vrm');
function outfitList(){return(CHARS&&CHARS[ST.look.female?'female':'male'])||[]}
function vrmUrl(f){return /^(https?:)?\/\//.test(f)?f:'models/'+f}
const VC_ROWS=[['hair','Hair',[0x1a1a1a,0x3b2314,0x8a5a2b,0xc9a26b,0x7a1f2b,0x2d3e8f,0xd77fa1]],['top','Top',[0xf2f2f2,0xe84393,0x2c5fa8,0xf2c94c,0x1e7b4a,0xc0392b,0x2b2b2b,0x8fb8c9]],['bottom','Shorts / pants',[0x1b1b1b,0x22324a,0x4a6fa5,0xd9c7a8,0x7b2d8b,0xc0392b,0xf2f2f2]],['shoes','Shoes',[0xf2f2f2,0x1b1b1b,0xc0392b,0x2c5fa8,0xf2c94c]],['skin','Skin tone',[0xf4ddc8,0xe2b897,0xc99470,0xa87250,0x8a5a3c]],['eyes','Eyes',[0x3b2314,0x1a1a1a,0x2d6a8f,0x2e7d32,0x8a5a2b]]];
function curFile(){const L=outfitList();return L.length?L[Math.min(ST.look.outfit|0,L.length-1)].file:''}
function vcGet(){ST.look.vc=ST.look.vc||{};return ST.look.vc[curFile()]||(ST.look.vc[curFile()]={})}
function applyColors(){if(!PV)return;const c=vcGet();for(const[k]of VC_ROWS)recolor(PV,k,c[k]??null)}
function colorRows(){const el=$('vcRows'),vl=$('vLook'),isFace=k=>k==='hair'||k==='eyes'||k==='skin';if(!PV||!outfitList().length){el.style.display=vl.style.display='none';el.innerHTML=vl.innerHTML='';return}const have=vrmSlots(PV),c=vcGet();el.style.display=vl.style.display='';
 const rows=want=>VC_ROWS.filter(([k])=>have.includes(k)&&isFace(k)===want).map(([k,n,list])=>`<label>${n}</label><div class="sw" data-slot="${k}"><button aria-label="original colour" data-c="" aria-pressed="${c[k]==null}" style="background:#2a2a2a;color:#fff;font-size:13px">↺</button>${list.map(v=>`<button aria-label="colour" data-c="${v}" aria-pressed="${c[k]===v}" style="background:#${v.toString(16).padStart(6,'0')}"></button>`).join('')}</div>`).join('');el.innerHTML=rows(false);vl.innerHTML=rows(true);
 el.onclick=vl.onclick=e=>{const b=e.target.closest('button'),row=e.target.closest('[data-slot]');if(!b||!row)return;const k=row.dataset.slot,v=b.dataset.c===''?null:+b.dataset.c;const cc=vcGet();if(v==null)delete cc[k];else cc[k]=v;recolor(PV,k,v);save();colorRows()}}
let CHAR_WAIT=true; // until we know whether a VRoid character is coming, keep the old model + rows hidden
function setCreatorMode(){const v=CHAR_WAIT||outfitList().length>0;for(const id of['sS','sT','sB']){$(id).style.display=v?'none':'';$(id).previousElementSibling.style.display=v?'none':''}$('lO').style.display=$('sO').style.display=v?'':'none';heroRows()}
function outfitSw(){const L=outfitList();setCreatorMode();if(!L.length)return;$('sO').innerHTML=L.map((o,i)=>`<button style="width:auto;padding:0 14px;border-radius:12px;background:#2a2a2a;color:#fff" data-i="${i}" aria-pressed="${(ST.look.outfit|0)===i}">${o.name}</button>`).join('');$('sO').onclick=e=>{const b=e.target.closest('button');if(!b)return;ST.look.outfit=+b.dataset.i;outfitSw();applyOutfit()}}
// ---- character loading overlay (spinner + percentage while a VRoid model and its animations download)
let CL_URL=null,CL_T=0;
function charLoading(url){CL_URL=url;const el=$('charLoad');if(!el)return;clearInterval(CL_T);if(!url){el.hidden=true;return}el.hidden=false;const tick=()=>{const p=vrmProgress(url);$('clPct').textContent=p?Math.round(p.p*100)+'%':'0%';$('clBar').style.width=(p?p.p*100:3)+'%';$('clText').textContent=p&&p.stage==='anims'?'Getting her moves ready…':'Loading character…';if(p&&p.stage==='done'){clearInterval(CL_T)}};tick();CL_T=setInterval(tick,150)}
function charReady(){CHAR_WAIT=false;charLoading(null);$('lO').textContent='Outfit';if(!P.ride)me.visible=true;setCreatorMode()}
async function applyOutfit(){const L=outfitList(),tok=++outTok;if(!L.length){if(PV){PV=null;rebuildMe()}charReady();colorRows();return}
 const o=L[Math.min(ST.look.outfit|0,L.length-1)];let v;
 charLoading(vrmUrl(o.file));if(creating){me.visible=false;CHAR_WAIT=true;setCreatorMode();$('lO').textContent='Outfit (loading…)';$('vcRows').style.display='none'}else toast('Loading character…');
 try{v=await loadVRM(vrmUrl(o.file))}catch(e){console.warn('VRM load failed',e);if(tok===outTok){PV=null;rebuildMe();charReady();colorRows();toast('Could not load the character file')}return}
 if(tok!==outTok)return;PV=v;rebuildMe();charReady();applyColors();colorRows();if(!creating)toast(o.name+' equipped!')}
async function initChars(){me.visible=false;setCreatorMode();try{if(VQ)CHARS={male:[{name:'Test',file:VQ}],female:[{name:'Test',file:VQ}]};else{const r=await fetch('models/characters.json',{cache:'no-cache'});if(!r.ok){charReady();return}CHARS=await r.json()}outfitSw();await applyOutfit()}catch(e){console.warn('characters.json',e);charReady()}}
function rebuildMe(){const v=me.visible,pos=me.position.clone(),ry=me.rotation.y;scene.remove(me);me=makeMe();me.position.copy(pos);me.rotation.y=ry;me.visible=v;scene.add(me);save()}
if(!ST.role)ST.role='Explorer';roleSw();genderSw();swatches('sS',SKINSW,'skin');swatches('sT',TOPSW,'top');swatches('sB',BOTSW,'bottom');presetSw();$('sMoney').textContent='₹'+ST.money.toLocaleString('en-IN');$('nm').value=ST.name;
// ---- networking layer (profiles, roles, connections, chat) — see social.js
function setGPS(x,z){WP={x,z};gpsMarker.position.set(x,0,z);gpsMarker.visible=true}
function goCafe(){setGPS(CAFE.door.x+3,CAFE.door.z);togglePhone(false);toast('☕ GPS set to the Startup Café: follow the purple light')}
const SOC=initSocial({toast:t=>toast(t),net:()=>NETAPI,setGPS,local:()=>({name:ST.name,role:ST.role||'Explorer',look:lookPayload()}),wave:()=>doWave(),cafe:goCafe,phoneApp:()=>phoneOn?APP:'',
 onProfile:p=>{let ch=false;if(p.role&&p.role!==ST.role){ST.role=p.role;ch=true;roleSw()}save();if(NETAPI&&ch)NETAPI.retrack()},
 rerender:()=>{phoneBadges();if(phoneOn&&['home','nearby','network','chats','thread'].includes(APP))renderApp()}});
// role picker on the start screen
function roleSw(){const el=$('sR');if(!el)return;el.innerHTML=ROLES.map(([n,e,c])=>`<button type="button" data-r="${n}" style="--rc:${c}" aria-pressed="${(ST.role||'Explorer')===n}">${e} ${n}</button>`).join('');el.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;ST.role=b.dataset.r;save();roleSw();SOC.quickRole(ST.role,($('nm').value||ST.name).trim(),lookPayload());if(NETAPI)NETAPI.retrack()}}
// ---- startup billboards: rows of the Supabase table sc_billboard (the admin edits them in the dashboard)
let BILL_LIST=[{title:'Startup City',tagline:'Meet founders, co-founders and investors. Your startup here!',bg:'#141414',fg:'#ffd21f'}],BILL_I=0;const BILLS=[],BILL_IMG=new Map();
function makeBillboard(x,z,ry,w=14,h=7){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);
 const cv=document.createElement('canvas');cv.width=1024;cv.height=512;const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
 const face=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:.32,roughness:.55}));face.position.set(0,h/2+4.6,.29);g.add(face);
 const fr=mat(0x23262b,.5,.5);const bk=new T.Mesh(new T.BoxGeometry(w+.6,h+.6,.45),fr);bk.position.set(0,h/2+4.6,0);bk.castShadow=true;g.add(bk);
 const lip=new T.Mesh(new T.BoxGeometry(w+.8,.25,1.1),fr);lip.position.set(0,4.4,.35);g.add(lip);for(let i=0;i<4;i++){const l=new T.Mesh(new T.BoxGeometry(.5,.18,.5),new T.MeshStandardMaterial({color:0xffffff,emissive:0xfff2c0,emissiveIntensity:1}));l.position.set(-w/2+w/8+i*w/4,h+5.2,.7);g.add(l)}
 for(const e of[-1,1]){const p=new T.Mesh(new T.CylinderGeometry(.28,.34,4.8,10),mat(0x6d7278,.4,.7));p.position.set(e*w*.3,2.4,0);p.castShadow=true;g.add(p);const wx=x+Math.cos(ry)*e*w*.3,wz=z-Math.sin(ry)*e*w*.3;addColl(wx-.4,wx+.4,wz-.4,wz+.4,4)}
 const b={cv,tex,face};BILLS.push(b);drawBill(b,BILL_LIST[0]);return g}
function drawBill(b,e){b.entry=e;const x=b.cv.getContext('2d'),W=1024,H=512,bg=/^#[0-9a-f]{6}$/i.test(e.bg||'')?e.bg:'#141414',fg=/^#[0-9a-f]{6}$/i.test(e.fg||'')?e.fg:'#ffd21f';
 x.fillStyle=bg;x.fillRect(0,0,W,H);const gr=x.createLinearGradient(0,0,0,H);gr.addColorStop(0,'rgba(255,255,255,.10)');gr.addColorStop(1,'rgba(0,0,0,.25)');x.fillStyle=gr;x.fillRect(0,0,W,H);
 let tx=60;const img=e.image_url&&BILL_IMG.get(e.image_url);if(img&&img.complete&&img.naturalWidth){try{const s=Math.min(300/img.naturalWidth,300/img.naturalHeight);x.drawImage(img,60,(H-img.naturalHeight*s)/2-20,img.naturalWidth*s,img.naturalHeight*s);tx=400}catch(er){}}
 else if(e.image_url&&!BILL_IMG.has(e.image_url)){const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{for(const bb of BILLS)drawBill(bb,BILL_LIST[BILL_I%BILL_LIST.length])};BILL_IMG.set(e.image_url,im);im.src=e.image_url}
 const maxW=W-tx-60;x.fillStyle=fg;x.textBaseline='alphabetic';let fs=120;x.font=`900 ${fs}px "Baloo 2",sans-serif`;while(x.measureText(e.title).width>maxW&&fs>48){fs-=6;x.font=`900 ${fs}px "Baloo 2",sans-serif`}x.fillText(e.title,tx,210);
 x.fillStyle='#ffffff';x.font='600 44px "Baloo 2",sans-serif';const words=String(e.tagline||'').split(' ');let line='',y=290;for(const wd of words){const t=line?line+' '+wd:wd;if(x.measureText(t).width>maxW){x.fillText(line,tx,y);line=wd;y+=54;if(y>400)break}else line=t}if(line&&y<=400)x.fillText(line,tx,y);
 if(e.url){x.fillStyle=fg;x.font='700 34px "Baloo 2",sans-serif';x.fillText(e.url.replace(/^https?:\/\//,''),tx,H-50)}x.fillStyle='rgba(255,255,255,.55)';x.font='700 26px "Baloo 2",sans-serif';x.textAlign='right';x.fillText('STARTUP CITY',W-40,H-30);x.textAlign='left';b.tex.needsUpdate=true}
makeBillboard(CAFE.x+4,CAFE.z-CAFE.d/2-13,PI);makeBillboard(-40,-318,0,16,8);
SOC.billboard().then(l=>{if(l.length){BILL_LIST=l;for(const b of BILLS)drawBill(b,l[0])}}).catch(()=>{});
setInterval(()=>{if(BILL_LIST.length<2)return;BILL_I++;BILLS.forEach((b,i)=>drawBill(b,BILL_LIST[(BILL_I+i)%BILL_LIST.length]))},9000);
// ---- numbered billboard spots: 01-10 big boards, 11-50 on street lamps
// big boards keep clear of walls and of road surfaces
const BOARDS=buildBoards({scene,addColl,blocked:(x,z,r)=>blocked(x,z,r)||DMAP.lines.some(L=>L.pts.some(p=>Math.hypot(p[0]-x,p[1]-z)<L.w/2+3.5))});let SPOT_PICK='';
// ---- billboard viewer: tap or click a board to see it large and open the startup's website
const safeUrl=u=>{try{const v=new URL(u);return v.protocol==='https:'?v.href:''}catch(e){return''}};
function showBoard({image,title,tagline,url,code}){const link=safeUrl(url||'');
 $('bvHead').textContent=code?'Billboard spot '+code:'Billboard';const cv=$('bvImg');cv.hidden=!image;if(image)image(cv);
 $('bvTitle').textContent=title||'This spot is free';$('bvTag').textContent=tagline||(title?'':'Put your startup here.');
 const a=$('bvLink');a.hidden=!link;if(link){a.href=link;a.textContent='Visit '+new URL(link).hostname.replace(/^www\./,'')+' ↗'}else a.removeAttribute('href');
 const take=$('bvTake');take.hidden=!!title||!code;take.onclick=()=>{closeBoard();openSpot(code)};
 for(const k in K)K[k]=false;$('boardView').hidden=false;$('bvClose').focus()}
function closeBoard(){$('boardView').hidden=true;$('bvLink').removeAttribute('href')}
$('bvClose').onclick=closeBoard;$('boardView').onclick=e=>{if(e.target.id==='boardView')closeBoard()};
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('boardView').hidden){e.stopImmediatePropagation();e.preventDefault();closeBoard()}},true);
function viewSpot(spot){const t=BOARDS.taken(spot.code);showBoard({code:spot.code,image:cv=>BOARDS.snapshot(spot,cv),title:t&&t.startup,tagline:t&&t.tagline,url:t&&t.url})}
// a tap is a press and release in the same place; a drag turns the camera instead
{let down=null;const cv=$('c'),ray=new T.Raycaster(),ndc=new T.Vector2();
 cv.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,id:e.pointerId,t:performance.now()}});
 const at=e=>ndc.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);
 const hitAt=e=>{at(e);const spot=BOARDS.pick(camera,ndc);ray.setFromCamera(ndc,camera);ray.far=55;const old=ray.intersectObjects(BILLS.map(b=>b.face),false)[0];
  if(old&&(!spot||old.distance<spot.distance))return{old:BILLS.find(b=>b.face===old.object)};return spot&&spot.spot?{spot:spot.spot}:null};
 cv.addEventListener('pointerup',e=>{const d=down;down=null;if(!d||d.id!==e.pointerId||!started||creating||phoneOn||MENU||mapOn||photo||Math.hypot(e.clientX-d.x,e.clientY-d.y)>8||performance.now()-d.t>500)return;
  const h=hitAt(e);if(!h)return;if(h.spot)viewSpot(h.spot);else{const en=h.old.entry||{};showBoard({image:to=>{to.width=1024;to.height=512;to.getContext('2d').drawImage(h.old.cv,0,0)},title:en.title,tagline:en.tagline,url:en.url})}});
 let hoverT=0;cv.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||e.buttons||performance.now()-hoverT<120||!started||creating)return;hoverT=performance.now();cv.style.cursor=hitAt(e)?'pointer':''})}
const loadSpots=()=>{if(!document.hidden)SOC.spots().then(r=>BOARDS.update(r)).catch(()=>{})};loadSpots();setInterval(loadSpots,60000);
function openSpot(code){SPOT_PICK=code;APP='bill';togglePhone(true)}
// the phone's Billboard screen: take a spot, see your request, and browse who is where
async function spotApp(a){a.innerHTML='<p class="empty">Loading…</p>';const[rows,mine]=await Promise.all([SOC.spots(),SOC.myRequests()]);if(APP!=='bill'||!phoneOn)return;BOARDS.update(rows);
 const byCode=new Map(rows.map(r=>[r.spot,r])),pending=mine.find(m=>m.status==='pending'),pick=SPOT_PICK||(SPOTS.find(s=>!byCode.has(s.code))||SPOTS[0]).code;
 const label=s=>`${s.code} · ${s.type==='big'?'Big':'Lamp'} · ${s.area}${byCode.has(s.code)?' (taken)':''}`;
 a.innerHTML=`<p class="note">📢 Put your startup on a numbered billboard. The admin checks every request and decides where it goes.</p>
 ${mine.map(m=>`<div class="pcard"><div class="pav">${esc(m.spot)}</div><div class="pinfo"><b>${esc(m.startup)}</b><div class="pst spstat">${m.status==='pending'?'⏳ Waiting for approval':m.status==='approved'?'✅ Live on spot '+esc(m.spot):'✖ Not approved'}</div></div>${m.status==='pending'?`<button class="ghost" data-cancel="${Number(m.id)}">Cancel</button>`:''}</div>`).join('')}
 ${pending?'':`<form id="spotForm" class="spotform"><label>Spot number<select name="spot">${SPOTS.map(s=>`<option value="${s.code}" ${s.code===pick?'selected':''} ${byCode.has(s.code)?'disabled':''}>${esc(label(s))}</option>`).join('')}</select></label>
 <label>Startup name<input name="startup" maxlength="28" required></label><label>Tagline (optional)<input name="tagline" maxlength="60"></label><label>Website (optional)<input name="url" maxlength="120" placeholder="https://"></label>
 <button type="submit">Take this spot</button><p id="spotMsg" class="note" role="status"></p></form>`}
 <button class="ghost" data-spotgps>Show the way to spot ${esc(pick)}</button>
 <p class="note">${rows.length} of ${SPOTS.length} spots taken</p>${rows.slice().sort((x,y)=>x.spot-y.spot).map(r=>`<div class="pcard"><div class="pav">${esc(r.spot)}</div><div class="pinfo"><b>${esc(r.startup)}</b><div class="ppitch">${esc(r.tagline||'')}</div>${safeUrl(r.url)?`<a class="pst" href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.url.replace(/^https:\/\//i,''))} ↗</a>`:''}</div></div>`).join('')}`;
 const f=a.querySelector('#spotForm');
 if(f){for(const el of f.elements){el.addEventListener('keydown',e=>e.stopPropagation());el.addEventListener('keyup',e=>e.stopPropagation())}
  f.spot.onchange=()=>{SPOT_PICK=f.spot.value;a.querySelector('[data-spotgps]').textContent='Show the way to spot '+SPOT_PICK};
  f.onsubmit=async e=>{e.preventDefault();const btn=f.querySelector('button');btn.disabled=true;try{await SOC.requestSpot({spot:f.spot.value,startup:f.startup.value,tagline:f.tagline.value,url:f.url.value});toast('Request sent for spot '+f.spot.value);spotApp(a)}catch(err){a.querySelector('#spotMsg').textContent=err.message;btn.disabled=false}}}
 a.querySelector('[data-spotgps]').onclick=()=>{const s=spotByCode(SPOT_PICK||pick);setGPS(s.x,s.z);togglePhone(false);toast('Follow the purple light to spot '+s.code)};
 for(const b of a.querySelectorAll('[data-cancel]'))b.onclick=async()=>{try{await SOC.cancelRequest(+b.dataset.cancel);spotApp(a)}catch(err){toast(err.message)}}}
// ---- login: email + password (log in / sign up). An account is needed to enter the city.
let AUTH={kind:'none'},LG_MODE='in';
function showAuth(u,ev){const wasIn=AUTH.kind==='email'||AUTH.kind==='google';AUTH=u&&u.kind!=='guest'?u:{kind:'none'}; // old guest sessions count as logged out
 SOC.setUser(AUTH);showContinue();const k=AUTH.kind,inn=k==='google'||k==='email';
 $('lgState').textContent=k==='google'?'✅ Logged in: '+(AUTH.email||''):k==='email'?'✅ Logged in: '+AUTH.email:k==='offline'?'Offline mode (net-config.js is empty)':'Log in or create an account to enter the city';
 $('lgForm').hidden=inn||k==='offline';$('lgOut').hidden=k==='none'||k==='offline';
 if(inn&&AUTH.name&&(!$('nm').value||$('nm').value==='Satish'))$('nm').value=AUTH.name.split(' ')[0].slice(0,16);
 const inAcc=k==='email'||k==='google';setTimeout(checkAdmin,0); // after the login has been stored
 $('sAcc').textContent=inAcc?'✅ Account':'👤 Log in';if(inAcc&&!wasIn&&$('start').dataset.tab==='account')sTab(innerWidth<=760?'me':'look');
 if(ev==='PASSWORD_RECOVERY'){lgMode('new');sTab('account')}}
const lgErr=e=>{$('lgErr').textContent=e?String(e.message||e):'';if(e)$('lgMsg').textContent=''},lgMsg=t=>{$('lgMsg').textContent=t||'';if(t)$('lgErr').textContent=''};
function lgMode(m){LG_MODE=m;lgErr('');document.querySelectorAll('.lgtabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.m===m));
 $('lgSubmit').textContent=m==='up'?'Create account':m==='new'?'Save new password':'Log in';$('lgPass').autocomplete=m==='in'?'current-password':'new-password';
 $('lgEmail').hidden=m==='new';$('lgForgot').hidden=m!=='in';$('lgPass').placeholder=m==='new'?'New password (min 6 characters)':'Password (min 6 characters)';if(m==='new'){$('lgForm').hidden=false;lgMsg('Choose a new password')}}
document.querySelector('.lgtabs').onclick=e=>{const b=e.target.closest('button');if(b)lgMode(b.dataset.m)};
$('lgForm').onsubmit=async e=>{e.preventDefault();lgErr('');const btn=$('lgSubmit'),em=$('lgEmail').value,pw=$('lgPass').value;btn.disabled=true;
 try{if(LG_MODE==='in')showAuth(await loginEmail(em,pw));
  else if(LG_MODE==='up'){const r=await signUpEmail(em,pw,($('nm').value||'').trim());if(r.user)showAuth(r.user);else{lgMode('in');lgMsg('Account created! Check '+em.trim()+' for a confirmation link, then log in.')}}
  else{await setNewPassword(pw);lgMode('in');lgMsg('Password updated. You are logged in.')}
  $('lgPass').value=''}catch(err){lgErr(err)}btn.disabled=false};
$('lgForgot').onclick=async()=>{lgErr('');try{await resetPassword($('lgEmail').value);lgMsg('Password reset link sent to '+$('lgEmail').value.trim())}catch(err){lgErr(err)}};
$('lgOut').onclick=async()=>{lgErr('');lgMsg('');await logout();showAuth({kind:'none'})};
onAuth(showAuth);currentUser().then(u=>showAuth(u)).catch(()=>showAuth({kind:'none'}));
// ---- spawn: every time you enter the city you start at a random safe spot (not when you come back from the character screen)
let SPAWNED=false;const AT_PARAM=new URLSearchParams(location.search).has('at');
const SPAWNS=[{n:'Startup Café',x:-186,z:-74},{n:'Startup Café',x:-186,z:-87},{n:'City Center plaza',x:-12,z:-318},{n:'City Center plaza',x:-62,z:-372},{n:'Marine Drive',x:10,z:158},{n:'Marine Drive',x:70,z:158},{n:'Bandra Bay',x:-270,z:164},{n:'City Junction',x:-133,z:-6},{n:'Sports Ground',x:-20,z:-12},{n:'Market',x:96,z:34},{n:'Raju\'s Tea Stall',x:6,z:40},{n:'IT Park',x:182,z:-344},{n:'Residential Area',x:-300,z:-60}];
function randomSpawn(){const opts=SPAWNS.slice();for(let i=0;i<4;i++){const s=sidewalkSpot(0);opts.push({n:'the old city',x:s.x,z:s.z})}
 for(let k=0;k<20;k++){const s=opts[Math.floor(Math.random()*opts.length)],x=s.x+(Math.random()-.5)*4,z=s.z+(Math.random()-.5)*4;if(blocked(x,z,.6))continue;
  P.x=x;P.z=z;P.y=groundY(x,z);P.vy=0;P.yaw=Math.random()*PI*2;camYaw=P.yaw+PI;me.position.set(P.x,P.y,P.z);me.rotation.y=P.yaw;return s.n}return null}
function showContinue(){const b=$('cont');if(!b)return;const ok=AUTH&&(AUTH.kind==='google'||AUTH.kind==='email')&&!SPAWNED;b.hidden=!ok;if(ok)$('contName').textContent=ST.name||'Player'}
$('cont').onclick=()=>$('go').click();
// ---- admin: the same login as everyone; if the account is an admin, an extra button opens the panel inside the game
let ADMIN_ID=null;
function checkAdmin(){const id=AUTH.kind==='email'||AUTH.kind==='google'?AUTH.id:'';if(id===ADMIN_ID)return;ADMIN_ID=id;
 const show=v=>{$('sAdmin').hidden=$('pmAdmin').hidden=!v;if(!v)closeAdmin()};show(false);
 if(id)isAdmin().then(ok=>{if(ADMIN_ID===id)show(ok)}).catch(()=>{ADMIN_ID=null})}
function openAdmin(){if(MENU)setMenu(false);for(const k in K)K[k]=false;$('adminFrame').src='admin.html';$('adminView').hidden=false}
function closeAdmin(){if($('adminView').hidden)return;$('adminView').hidden=true;$('adminFrame').removeAttribute('src');if(typeof loadSpots==='function')loadSpots()}
$('sAdmin').onclick=$('pmAdmin').onclick=openAdmin;$('adminClose').onclick=closeAdmin;
// ---- only accounts the admin has approved may enter
let APPROVED='',CHECKING=false; // holds the account id that has been approved
const WAIT_TEXT={pending:'Your account is waiting for the admin to approve it. Press Start again after approval.',blocked:'This account is not allowed to play.',login:'Log in with email to enter the city',error:'Could not check your approval. Check your internet and try again.'};
async function askApproval(){if(CHECKING)return;CHECKING=true;lgErr('');lgMsg('Checking your account…');
 const s=await playerStatus($('nm').value).catch(()=>'error');CHECKING=false;lgMsg('');
 if(s==='approved'){APPROVED=AUTH.id;$('go').click()}else{sTab('account');lgErr(WAIT_TEXT[s]||WAIT_TEXT.error)}}
// if the admin blocks someone who is already playing, send them back to the start screen
setInterval(async()=>{if(!APPROVED||!started||creating||document.hidden)return;const s=await playerStatus(ST.name).catch(()=>'error');
 if(s==='blocked'||s==='pending'){APPROVED='';backToCreator();sTab('account');lgErr(WAIT_TEXT[s])}},60000);
$('go').onclick=()=>{if(AUTH.kind==='none'){sTab('account');lgErr('Log in or sign up to enter the city');return}
 if(AUTH.kind!=='offline'&&APPROVED!==AUTH.id){askApproval();return}ST.name=($('nm').value||'Satish').trim().slice(0,16);if(!SPAWNED){SPAWNED=true;if(!AT_PARAM){const n=randomSpawn();if(n)setTimeout(()=>toast('📍 You arrived at '+n),2600)}}$('cont').hidden=true;if(SOC.S.uid&&(!SOC.S.me||SOC.S.me.name!==ST.name||SOC.S.me.role!==ST.role))SOC.quickRole(ST.role||'Explorer',ST.name,lookPayload());if(NETAPI)NETAPI.retrack();setTimeout(startMultiplayer,300);creating=false;started=true;document.body.classList.remove('creating');$('start').style.display='none';audioInit();save();toast('Welcome '+ST.name+'! Open the phone (P) to pick a job')};
// ================= quality =================
function applyQ(){const q=QS[Q];renderer.setPixelRatio(q.pr);composer.setPixelRatio(q.pr);renderer.shadowMap.enabled=q.shadow;sun.castShadow=q.shadow;sun.shadow.mapSize.set(q.smap,q.smap);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}bloom.enabled=q.bloom;gtao.enabled=Q==='high';camera.far=q.far;camera.updateProjectionMatrix();skyDome.scale.setScalar(q.far*.42/2000);resize();
 PEDS.forEach((p,i)=>{p.active=p.static||i<q.npc;p.g.visible=p.active});scene.traverse(o=>{if(o.material)[].concat(o.material).forEach(m=>m.needsUpdate=true)})}
applyQ();
// ---- distance culling
const CULL_AT=MOBILE?70:150;let cullT=0;const _cb=new T.Box3(),_cv=new T.Vector3();
function cullTick(dt){cullT-=dt;if(cullT>0)return;cullT=.4;const c=camera.position;
 for(const o of scene.children){if(!o.isGroup||o.userData.noCull)continue;let u=o.userData.cull;
  if(!u){_cb.setFromObject(o);if(_cb.isEmpty())continue;_cb.getSize(_cv);const rad=Math.hypot(_cv.x,_cv.z)/2;_cb.getCenter(_cv).sub(o.position);u=o.userData.cull={rad,ox:rad>3?_cv.x:0,oz:rad>3?_cv.z:0,far:false}}
   const d=Math.hypot(o.position.x+u.ox-c.x,o.position.z+u.oz-c.z)-u.rad,far=!(CAMV||TOPV)&&d>CULL_AT+(u.far?-8:8);
  if(far!==u.far){u.far=far;o.userData.far=far;o.traverse(m=>m.layers.set(far?1:0))}}}
// ---- merge the static scenery: hundreds of single walls, signs and props become one mesh per material and area.
// The first frames are watched, so anything that moves or hides itself is left alone.
let mergeIn=90,mergeSnap=null;
const plainMat=m=>m&&!m.isShaderMaterial&&!m.transparent;
function mergeTick(){if(mergeIn<0)return;
 if(mergeIn===90){mergeSnap=new Map();for(const o of scene.children){if(!o.isMesh||o.userData.kit||o.isInstancedMesh||o.isSkinnedMesh||!o.visible||o.children.length||o.renderOrder||!o.frustumCulled||o===ground)continue;
   if(![].concat(o.material).every(plainMat)||o.geometry.morphAttributes.position)continue;o.updateMatrixWorld(true);mergeSnap.set(o,o.matrixWorld.clone())}}
 if(mergeIn--)return;
 const sets=new Map(),done=[];
 const put=(o,m,geo,c)=>{const key=[m.uuid,Math.floor(c.x/120),Math.floor(c.z/120),+o.castShadow,+o.receiveShadow,Object.keys(geo.attributes).sort().join()].join('|');
  let e=sets.get(key);if(!e)sets.set(key,e={m,cast:o.castShadow,recv:o.receiveShadow,list:[]});e.list.push(geo)};
 for(const[o,was]of mergeSnap){o.updateMatrixWorld(true);if(!o.visible||o.parent!==scene||!o.matrixWorld.equals(was))continue;
  const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.computeBoundingSphere();const c=g.boundingSphere.center;
  if(Array.isArray(o.material)){ // one piece per face material (walls with different textures on each side)
   for(const part of o.geometry.groups){const sub=new T.BufferGeometry();for(const[n,at]of Object.entries(g.attributes))sub.setAttribute(n,new T.BufferAttribute(at.array.slice(part.start*at.itemSize,(part.start+part.count)*at.itemSize),at.itemSize,at.normalized));
     if(o.material[part.materialIndex])put(o,o.material[part.materialIndex],sub,c)}}
  else{g.clearGroups();put(o,o.material,g,c)}
  done.push(o)}
 const built=[];for(const e of sets.values()){const geo=e.list.length>1?mergeGeometries(e.list,false):e.list[0];if(!geo)return mergeSnap=null; // mismatched shapes: keep the originals
  const m=new T.Mesh(geo,e.m);m.castShadow=e.cast;m.receiveShadow=e.recv;m.matrixAutoUpdate=false;built.push(m)}
 for(const o of done)scene.remove(o);for(const m of built)scene.add(m);mergeSnap=null}
// ================= main loop =================
const clock=new T.Clock();let hintT=0,lightT=0,el=0;const tgtV=new T.Vector3(),camPos=new T.Vector3(),sunDir=new T.Vector3();
function sigState(){const c=el%28;return{x:c<12?'g':c<14?'y':'r',z:c>=14&&c<26?'g':c>=26?'y':'r'}}
// dynamic resolution: keep weak GPUs (Intel UHD) near 30+ fps by scaling the render size
let miniT=0,DRS=1,drsT=0,drsN=0,SLOW=0,LOWFX=false;
function drsTick(dt){drsT+=dt;drsN++;if(drsT<2)return;const fps=drsN/drsT;drsT=0;drsN=0;const old=DRS;if(fps<24){if(DRS<=.81&&Q!=='low'&&!LOWFX&&started&&++SLOW>2){LOWFX=true;bloom.enabled=false;gtao.enabled=false;renderer.shadowMap.enabled=false;sun.castShadow=false;scene.traverse(o=>{if(o.material)[].concat(o.material).forEach(m=>m.needsUpdate=true)})}DRS=Math.max(MOBILE?.7:.8,DRS-.1)}else{SLOW=0;if(fps>45)DRS=Math.min(1,DRS+.05)}if(DRS!==old){const pr=QS[Q].pr*DRS;renderer.setPixelRatio(pr);if(composer.setPixelRatio)composer.setPixelRatio(pr);resize()}}
function step(){const dt=Math.min(.05,clock.getDelta());el+=dt;if(!document.hidden)drsTick(clock.elapsedTime>0?dt:0);
 const sig=sigState();
 // ---- player
 me.userData.forcePhone=phoneOn||(creating&&CPHONE);
 const act2=started&&!phoneOn&&!creating&&!photo&&!mapOn;
 {const drv=!!P.ride;if(drv!==document.body.classList.contains('driving')){document.body.classList.toggle('driving',drv);if(!drv)for(const k in DRV)DRV[k]=0;joy.x=joy.y=0}}
 const fwd=act2?(K.w||K.arrowup?1:0)-(K.s||K.arrowdown?1:0)-joy.y+DRV.g-DRV.b:0,side=act2?(K.d||K.arrowright?1:0)-(K.a||K.arrowleft?1:0)+joy.x+DRV.r-DRV.l:0;
 if(SIT&&(Math.abs(fwd)>.1||Math.abs(side)>.1||P.ride))standUp();
 if(ONTRAIN){const s=ONTRAIN;P.x=TRAIN.position.x+s.x;P.z=TRAIN.position.z+s.z;P.y=s.y-.53;P.vy=0;P.yaw=s.ry;me.position.set(P.x,P.y,P.z);me.rotation.y=P.yaw;animH(me,0,dt,'sit')}
 else if(SIT){P.x=SIT.x;P.z=SIT.z;P.y=SIT.y;P.vy=0;P.yaw=SIT.ry;me.position.set(P.x,P.y,P.z);me.rotation.y=P.yaw;animH(me,0,dt,'sit');ST.energy=Math.min(100,ST.energy+dt*.3)}
 else if(!P.ride){const tired=ST.energy<8,hungry=ST.hunger<10,run=(K.shift||runT),sp=(run?(tired?6.5:9):3.4)*(hungry?.7:1);let mx=0,mz=0;const len=Math.hypot(fwd,side);
  if(len>.1){const fx=-Math.sin(camYaw),fz=-Math.cos(camYaw),rx=Math.cos(camYaw),rz=-Math.sin(camYaw);mx=(fx*fwd+rx*side)/Math.max(1,len);mz=(fz*fwd+rz*side)/Math.max(1,len);const ty=Math.atan2(mx,mz);P.yaw+=wrapA(ty-P.yaw)*Math.min(1,dt*12)}
  const nx=P.x+mx*sp*dt,nz=P.z+mz*sp*dt,stuck=blocked(P.x,P.z,.35);if(stuck||!blocked(nx,P.z,.35))P.x=nx;if(stuck||!blocked(P.x,nz,.35))P.z=nz;
  pushOutOfVehicles();
  if(Math.abs(P.x+149.5)<2.5&&Math.abs(P.z-train.z)<62)P.x=-146;
  const gy=groundY(P.x,P.z);if(K[' ']&&P.y<=gy+.01&&act2)P.vy=4.6;P.vy-=14*dt;P.y=Math.max(gy,P.y+P.vy*dt);if(P.vy<=0&&P.y-gy<.22){P.y=gy;P.vy=0}me.userData.air=P.y>gy+.08;if(P.y>gy+1.5&&P.vy<0&&gy>P.y)P.y=gy;
  me.position.set(P.x,P.y,P.z);me.rotation.y=P.yaw;if(!(creating&&CWALK))animH(me,len>.1?sp*Math.min(1,len):0,dt);
  ST.energy=len>.1&&run?Math.max(0,ST.energy-dt*.35):Math.min(100,ST.energy+dt*(len>.1?.12:.35))}
 else{const v=P.ride,g=v.g,max={auto:16,taxi:24,car:28,scooter:20,bus:15}[v.type]||22,acc={auto:7,taxi:9,car:11,scooter:9,bus:4}[v.type]||9;
  if(fwd>0)v.speed+=acc*fwd*dt*(1-v.speed/max);else if(fwd<0)v.speed+=(v.speed>0?-22:-5)*-fwd*dt;else v.speed*=1-.8*dt;v.speed=Math.max(-6,Math.min(max,v.speed));
  const steer=side*Math.min(1,Math.abs(v.speed)/3)*(1.6/(1+Math.abs(v.speed)*.04));g.rotation.y-=steer*dt*Math.sign(v.speed||1);
  const dx=Math.sin(g.rotation.y)*v.speed*dt,dz=Math.cos(g.rotation.y)*v.speed*dt,rad=v.type==='bus'?2:v.type==='scooter'?.6:1.3;
  if((blocked(g.position.x,g.position.z,rad)||!blocked(g.position.x+dx,g.position.z+dz,rad))&&!carHit(v,g.position.x+dx,g.position.z+dz)) // a vehicle that starts wedged against a kerb or bollard can still drive out
 {g.position.x+=dx;g.position.z+=dz}else{if(Math.abs(v.speed)>8)tone([90],.2,'sawtooth',.06);v.speed*=-.3}
  g.position.y=groundY(g.position.x,g.position.z)*.9;if(Math.abs(g.position.x+149.5)<3&&Math.abs(g.position.z-train.z)<62){g.position.x=-145;v.speed=0;toast('Stay away from the train!')}
  P.x=g.position.x;P.z=g.position.z;P.yaw=g.rotation.y;me.position.set(P.x,0,P.z);
  if(v.brake)v.brake.forEach(b=>b.material=fwd<0&&v.speed>0?BRAKE:tailMat);
  for(const p of PEDS)if(p.active&&p.mode!=='fall'&&!p.static&&Math.abs(v.speed)>3&&Math.hypot(p.g.position.x-g.position.x,p.g.position.z-g.position.z)<rad+.6){p.mode='fall';p.t=3;p.g.rotation.x=-PI/2;p.g.position.y=.45;v.speed*=.4;pay(-100,'Fine: hit a pedestrian');}
 }
 for(const v of RIDES)for(const w of v.wheels)w.rotation.x+=v.speed*dt/.33;
 // needs
 if(started&&!creating){ST.hunger=Math.max(0,ST.hunger-dt*.045);ST.energy=Math.max(0,ST.energy-dt*.012);if(ST.hunger<10&&Math.random()<dt*.05)toast('You are hungry! Eat a vada pav');}
 $('bHun').style.width=ST.hunger+'%';$('bEn').style.width=ST.energy+'%';
 // ---- traffic
 const pp=P.ride?P.ride.g.position:me.position;
 for(const t of TRAFFIC){const cur=loopAt(t.L,t.d),ah=loopAt(t.L,t.d+8),hx=ah.x-cur.x,hz=ah.z-cur.z;let go=true;
  const blk=(x,z,w=2.4)=>{const vx=x-cur.x,vz=z-cur.z,dot=(vx*hx+vz*hz)/8;return dot>0&&dot<10&&Math.abs(vx*hz-vz*hx)/8<w};
  if(blk(pp.x,pp.z))go=false;for(const o of TRAFFIC)if(o!==t&&o.L===t.L&&blk(o.veh.g.position.x,o.veh.g.position.z,1.8))go=false;
  if(!t.speeder){for(const q of PEDS)if(q.active&&q.mode==='cross'&&blk(q.g.position.x,q.g.position.z,3))go=false;
   const s=cur.seg,ax=s.ax,pos=ax==='x'?cur.x:cur.z,dir=ax==='x'?Math.sign(s.b[0]-s.a[0]):Math.sign(s.b[1]-s.a[1]);for(const c of ROADS){const dist=(c-pos)*dir-9.5;if(dist>0&&dist<5){const st=sig[ax];if(st==='r'||(st==='y'&&dist>2))go=false}}}
  t.cur+=((go?t.v:0)-t.cur)*Math.min(1,dt*(go?1.5:4));t.d+=t.cur*dt;const p=loopAt(t.L,t.d);t.veh.g.position.set(p.x,0,p.z);let dy=Math.atan2(Math.sin(p.yaw-t.veh.g.rotation.y),Math.cos(p.yaw-t.veh.g.rotation.y));t.veh.g.rotation.y+=dy*Math.min(1,dt*5);for(const w of t.veh.wheels)w.rotation.x+=t.cur*dt/.33;
  if(t.veh.brake)t.veh.brake.forEach(b=>b.material=!go?BRAKE:tailMat)}
 // ---- pedestrians
 for(const p of PEDS){if(!p.active)continue;if(p.bt>0){p.bt-=dt;if(p.bt<=0&&p.bub){p.g.remove(p.bub);p.bub=null}}
  if(p.g.position.y>.26&&p.mode!=='fall'&&!p.static)p.g.position.y=Math.max(.25,p.g.position.y-dt*2);
  {const gd=Math.hypot(p.g.position.x-P.x,p.g.position.z-P.z);if(started&&!creating&&gd<3.2&&!P.ride&&!ONTRAIN&&!(p.greetT>el)&&(p.static||p.mode==='walk'||p.mode==='wait')){p.greetT=el+25;p.g.userData.wave=1.6;say(p,GREET[Math.floor(R()*GREET.length)]);if(!p.static){p.mode='talk';p.t=2.8}if(!SIT&&!P.ride)doWave()}}
  if(p.static){animH(p.g,0,dt,p.sit?'sit':undefined);continue}
  if(p.mode==='fall'){p.t-=dt;if(p.t<=0){p.mode='walk';p.g.rotation.x=0;p.g.position.y=.25;say(p,'Drive carefully!')}continue}
   if(p.mode==='talk'){p.t-=dt;p.g.lookAt(me.position.x,p.g.position.y,me.position.z);animH(p.g,0,dt);if(p.t<=0)p.mode='walk';continue}
  if(p.mode==='wait'){animH(p.g,0,dt);if(sig[p.ax]==='g'&&(el%28)%14<9){p.mode='cross'}continue}
  const dx=p.tgt.x-p.g.position.x,dz=p.tgt.z-p.g.position.z,l=Math.hypot(dx,dz);
  if(l<.3){if(p.mode==='cross'){p.b=p.nb;p.c=p.nc;p.mode='walk'}else{p.c=p.next}
   const opts=XMAP[p.c].map(([di,dj,nc,ax])=>[bAt(p.b.i+di,p.b.j+dj),nc,ax]).filter(o=>o[0]);
   if(p.mode==='walk'&&opts.length&&R()<.3){const o=opts[Math.floor(R()*opts.length)];p.nb=o[0];p.nc=o[1];p.ax=o[2];const n=corner(o[0],o[1]);p.tgt={x:n[0],z:n[1]};p.mode='wait'}
   else{if(R()<.2)p.dir*=-1;p.next=(p.c+p.dir+4)%4;const n=corner(p.b,p.next);p.tgt={x:n[0],z:n[1]}}}
  else{const sp=p.mode==='cross'?p.sp*1.4:p.sp;p.g.position.x+=dx/l*sp*dt;p.g.position.z+=dz/l*sp*dt;let ry=Math.atan2(dx,dz),d=((ry-p.g.rotation.y+PI*3)%(PI*2))-PI;p.g.rotation.y+=d*Math.min(1,dt*8);if(p.g.position.distanceTo(pp)<90)animH(p.g,sp,dt)}
  if(R()<dt*.008&&!p.bub&&p.g.position.distanceTo(pp)<35)say(p,LINES[Math.floor(R()*LINES.length)])}
 // ---- train
 if(train.wait>0)train.wait-=dt;else{const prev=train.z;train.z+=train.dir*14*dt;if(Math.abs(train.z)<80&&!train.horned){train.horned=true;if(Math.hypot(pp.x+149,pp.z-train.z)<150)tone([311,370],1.2,'sawtooth',.035)}
  if((prev<0&&train.z>=0)||(prev>0&&train.z<=0)){train.wait=14;train.z=0}if(train.z>320){train.dir=-1;train.horned=false}if(train.z<-320){train.dir=1;train.horned=false}}TRAIN.position.z=train.z;
 // ---- time, sky, weather
 {TIME=DAY_LOCK}
 const sa=(TIME-.25)*PI*2,el2=Math.sin(sa),day=T.MathUtils.clamp(el2*2.2+.15,0,1),dusk=T.MathUtils.clamp(1-Math.abs(el2)*4,0,1)*(el2>-.2?1:0);
 sunDir.set(Math.cos(sa)*.8,el2,.45).normalize();SU.sunPosition.value.copy(sunDir);sky2.material.uniforms.sunPosition.value.copy(sunDir);
 weatherT-=dt;if(WEATHER==='auto'&&weatherT<=0){weatherT=90+R()*120;rainTarget=R()<.1?1:0}if(WEATHER==='rain')rainTarget=1;if(WEATHER==='clear')rainTarget=0;
 rainAmt+=(rainTarget-rainAmt)*dt*.15;wet+=((rainAmt>.3?1:0)-wet)*dt*(rainAmt>.3?.08:.02);
 const night=1-day;sun.intensity=(day>0?3.0*day:0)+(el2<0?.25:0);sun.color.setHSL(.095,.78+dusk*.2,.78-dusk*.15);if(el2<0)sun.color.set(0x8fa6d8);sun.intensity*=1-rainAmt*.6;
 hemi.intensity=.15+day*.5;hemi.groundColor.set(0x9a7a55);hemi.color.setHSL(.58,.5,.55+day*.2);
 const lp=el2>0?sunDir:sunDir.clone().negate();sun.position.set(pp.x+lp.x*120,lp.y*120+10,pp.z+lp.z*120);sun.target.position.set(pp.x,0,pp.z);
 moon.position.set(camera.position.x-sunDir.x*1700,camera.position.y-sunDir.y*1700,camera.position.z-sunDir.z*1700);moon.visible=el2<.1;
 stars.material.opacity=T.MathUtils.clamp(night*1.2-.3,0,1)*(1-rainAmt);stars.position.copy(camera.position);
 const fogC=new T.Color(0x0b1424).lerp(new T.Color(0xb4dcf8),day).lerp(new T.Color(0xe8a070),dusk*.45).lerp(new T.Color(0x6b7580).multiplyScalar(.3+day*.7),rainAmt*.7);scene.fog.color.copy(fogC);scene.fog.density=QS[Q].fog+rainAmt*.006+(1-day)*.001;
 SU.rayleigh.value=3+rainAmt*1.5;SU.turbidity.value=2.2+rainAmt*12;renderer.toneMappingExposure=.6+night*.4-rainAmt*.08;
 if(Math.abs(el-envT)>4){envT=el;sky2.material.uniforms.rayleigh.value=SU.rayleigh.value;sky2.material.uniforms.turbidity.value=SU.turbidity.value;const old=envRT;envRT=pmrem.fromScene(envScene,0,1,3000);scene.environment=envRT.texture;scene.environmentIntensity=.3+day*.42;if(old)old.dispose()}
 const lamps=night>.55;lampHeadMat.emissiveIntensity=lamps?6:0;headMat.emissiveIntensity=lamps?5:.3;tailMat.emissiveIntensity=lamps?2:.2;
 BOARDS.night(night);windowGlow.emissiveIntensity=night>.4?night*1.2:0;for(const m of FACADE)m.emissiveIntensity=night>.5?1.1*night:0;for(const m of SHOPMATS)m.emissiveIntensity=.15+night*.9;for(const m of SIGNMATS)m.emissiveIntensity=.25+night*.9;
 bloom.strength=.1+night*.3;
 for(const[k,m]of Object.entries(SIGM))m.emissiveIntensity=(sig[k[0]]==='g'&&k[1]==='g')||(sig[k[0]]!=='g'&&k[1]==='r')?4:0;
 lightT-=dt;if(lightT<=0){lightT=.4;const near=LAMPS.map(l=>[l,(l[0]-pp.x)**2+(l[1]-pp.z)**2]).sort((a,b)=>a[1]-b[1]);POOL.forEach((L,i)=>{const l=near[i][0];L.position.set(l[0],7.6,l[1]);L.intensity=lamps?14:0;L.visible=lamps})}
 roadMat.roughness=interMat.roughness=.9-wet*.62;tileMat.roughness=.92-wet*.4;const dk=1-wet*.35;roadMat.color.setScalar(dk);interMat.color.setScalar(dk);
 rain.material.opacity=rainAmt*.55;rain.position.set(camera.position.x,camera.position.y-20,camera.position.z);if(rainAmt>.02){const a=rainGeo.attributes.position.array;for(let i=0;i<RN;i++){let y=a[i*6+1]-dt*28;if(y<0)y+=40;a[i*6+1]=y;a[i*6+4]=y-.7}rainGeo.attributes.position.needsUpdate=true}
 WN.offset.x+=dt*.004;WN.offset.y+=dt*.002;
 if(amb&&AC){const m=muted?0:1;amb.cg.gain.value=.05*m*(1-rainAmt*.4);amb.rg.gain.value=.11*rainAmt*m;const sp=P.ride?Math.abs(P.ride.speed):0;amb.eng.frequency.value=38+sp*4.5;amb.eg.gain.value=P.ride?(.018+sp*.0012)*m:0}
 marker.rotation.y+=dt;gpsMarker.rotation.y+=dt;
 for(const v of VENDORS){const d=Math.hypot(v.x-pp.x,v.z-pp.z);if(d>120)continue;animH(v.man,0,dt);if(v.bt>0){v.bt-=dt;if(v.bt<=0&&v.bub){v.man.remove(v.bub);v.bub=null}}v.t-=dt;if(v.t<=0&&d<15&&started){v.t=8+R()*7;vsay(v,VT[v.type].call);v.man.userData.wave=1.6}}
 for(const sm of SMOKE){sm.t+=dt;const a=sm.pt.geometry.attributes.position;for(let i=0;i<7;i++){const t=(sm.t+i*.43)%3;a.setXYZ(i,Math.sin(t*2.3+i)*.15*t,.7+t*.6,Math.cos(t*1.7+i)*.1*t)}a.needsUpdate=true;sm.pt.material.opacity=.3*(1-rainAmt*.5)}
 for(const m of COALS)m.emissiveIntensity=1.3+Math.sin(el*7)*.25+night*1.6;puddleMat.opacity=wet*.85;
 if(WP&&Math.hypot(WP.x-pp.x,WP.z-pp.z)<9){WP=null;gpsMarker.visible=false;toast('GPS: you have arrived!');ding()}
 if(mapOn)drawBigMap();
 if(started&&!creating)updateJob(dt);
 // ---- camera
 if(!creating&&camera.view&&camera.view.enabled)camera.clearViewOffset();
 if(CAMV){camera.position.set(CAMV[0],CAMV[1],CAMV[2]);camera.lookAt(CAMV[3],CAMV[4],CAMV[5]);camera.fov=50;camera.updateProjectionMatrix()}
 else if(TOPV){const H=TOPV[2]/Math.tan(7.5*PI/180);camera.up.set(0,0,-1);camera.position.set(TOPV[0],H,TOPV[1]);camera.lookAt(TOPV[0],0,TOPV[1]);camera.fov=15;camera.near=H-250;camera.far=H+60;camera.updateProjectionMatrix();scene.fog.density=0} // third value = half the visible height in metres
 else if(creating&&CLOSE){me.rotation.y=CYAW!==null?+CYAW:Math.sin(el*.6)*.9;if(CWALK)animH(me,CWALK,dt);tgtV.set(me.position.x,me.position.y+(CLOSE==='body'?1.0:1.62),me.position.z);camera.position.set(tgtV.x,tgtV.y+.05,me.position.z+(CLOSE==='body'?2.4:.75));camera.lookAt(tgtV);camera.fov=50}
 else if(creating){const W=innerWidth,H=innerHeight,r=$('sStage').getBoundingClientRect(),sh=Math.max(140,r.height),z=CV.zoom,t=(z-1)/2,dist=2.15*H/sh/(2*Math.tan(25*PI/180))/z;
  me.rotation.y=CV.yaw+(CV.drag?0:Math.sin(el*.6)*.18);tgtV.set(me.position.x,me.position.y+.92+.62*t,me.position.z);camera.position.set(tgtV.x,tgtV.y+.12,me.position.z+dist);camera.lookAt(tgtV);camera.fov=50;
  if(r.width)camera.setViewOffset(W,H,W/2-(r.left+r.width/2),H/2-(r.top+r.height/2),W,H)}
 else{const ride=P.ride;tgtV.set(pp.x,(ride?1.2:P.y)+(ride?1.6:1.55),pp.z);if(ride&&Math.abs(ride.speed)>2.5&&!drag){camYaw+=wrapA(ride.g.rotation.y+PI-camYaw)*Math.min(1,dt*2.2)}
  else if(!ride&&!drag&&!SIT&&joy.id===null&&fwd>.1){camYaw+=wrapA(P.yaw+PI-camYaw)*Math.min(1,dt*2.5*fwd)}
  const hitAt=(pt,dist)=>{for(let st=1.2;st<=dist;st+=.4){const cx=tgtV.x+Math.sin(camYaw)*Math.cos(pt)*st,cz=tgtV.z+Math.cos(camYaw)*Math.cos(pt)*st,cy=tgtV.y+Math.sin(pt)*st;if(COLL.some(c=>c.h>3.5&&cy<c.h+.8&&cx>c.x0-.3&&cx<c.x1+.3&&cz>c.z0-.3&&cz<c.z1+.3))return st}return 0};
  let cd=camDist,pitch=camPitch;for(let k=0;k<10;k++){const hh=hitAt(pitch,camDist);if(!hh)break;if(pitch>=1.2){cd=Math.max(2.2,hh-.5);break}pitch=Math.min(1.2,pitch+.1)}camP+=(pitch-camP)*Math.min(1,dt*5);
  camPos.set(tgtV.x+Math.sin(camYaw)*Math.cos(camP)*cd,tgtV.y+Math.sin(camP)*cd,tgtV.z+Math.cos(camYaw)*Math.cos(camP)*cd);if(camPos.y<groundY(camPos.x,camPos.z)+.4)camPos.y=groundY(camPos.x,camPos.z)+.4;camera.position.lerp(camPos,Math.min(1,dt*10));camera.lookAt(tgtV);
  camera.fov+=((ride?62+Math.abs(ride.speed)*.45:62)-camera.fov)*Math.min(1,dt*3)}
 camera.updateProjectionMatrix();
 // ---- HUD
 $('clock').textContent=clockText();{const pt=$('pTime');if(pt)pt.textContent=(clockText().split('·')[1]||'').trim()}hintT-=dt;if(hintT<=0){hintT=.2;$('hint').textContent=started&&!creating?hintText():'';hudMoney()}
 $('speedo').innerHTML=P.ride?`${Math.round(Math.abs(P.ride.speed)*3.6)}<small>km/h</small>`:'';
 const TG=marker.visible?marker.position:(WP?gpsMarker.position:null);if(TG&&started){const ang=Math.atan2(TG.x-pp.x,TG.z-pp.z);$('arrow').style.display='block';$('arrow').querySelector('path').setAttribute('fill',marker.visible?'#ffd21f':'#a66bff');$('arrow').style.transform=`rotate(${(camYaw+PI-ang)*180/PI}deg)`;$('dist').textContent=Math.round(Math.hypot(TG.x-pp.x,TG.z-pp.z))+' m'}else{$('arrow').style.display='none';$('dist').textContent=''}
 if(started&&(!MOBILE||(miniT=(miniT+1)%3)===0))drawMini();
 if(PV&&me.userData.vrm===PV)driveVRM(PV,me.userData,dt);
 for(const f of TICK)f(dt,el);if(NETAPI){try{NETAPI.update(dt)}catch(e){console.warn('[net]',e)}}cullTick(dt);mergeTick();beaconTick(dt);
 if(MOBILE||Q==='low')renderer.render(scene,camera);else composer.render();requestAnimationFrame(step)}
const BRAKE=new T.MeshStandardMaterial({color:0x880000,emissive:0xff1a1a,emissiveIntensity:4});
$('chai').onclick=e=>{const b=e.target.closest('button');if(b)serve(+b.dataset.o)};
{const at=new URLSearchParams(location.search).get('at');if(at){const[ax,az]=at.split(',').map(Number);if(isFinite(ax)&&isFinite(az)){P.x=ax;P.z=az}}} // dev aid: ?at=x,z start position
if(!AT_PARAM&&!CLOSE){P.x=40;P.z=158;P.y=groundY(P.x,P.z)}
me.position.set(P.x,P.y,P.z);me.rotation.y=PI;if(new URLSearchParams(location.search).has('cars'))['car','taxi','auto','bus','scooter'].forEach((t,i)=>{const v=vehicle(t,[0xc0392b,0,0,0,0x2c5fa8][i]);const a=-PI/2+i*.55;v.g.position.set(P.x+Math.sin(a)*9,0,P.z+Math.cos(a)*9);v.g.rotation.y=a+PI/2}); // dev aid: ?cars
// loading screen: wait for the character and precompile every shader so the first seconds aren't a slideshow
async function bootFinish(){const set=(p,t)=>{$('ldFill').style.width=p+'%';$('ldText').textContent=t};
 set(55,'Loading character…');{const iv=setInterval(()=>{const p=CL_URL&&vrmProgress(CL_URL);if(p){set(55+p.p*25,'Loading character… '+Math.round(p.p*100)+'%')}},200);await Promise.race([CHAR_PROMISE,new Promise(r=>setTimeout(r,25000))]);clearInterval(iv)}
 set(82,'Preparing graphics…');await new Promise(r=>setTimeout(r,50));try{if(renderer.compileAsync)await renderer.compileAsync(scene,camera);else renderer.compile(scene,camera)}catch(e){console.warn(e)}
 set(100,'Ready!');await new Promise(r=>setTimeout(r,350));$('loading').classList.add('done');setTimeout(()=>{$('loading').hidden=true},650)}

const CHAR_PROMISE=initChars();hudMoney();resize();bootFinish();requestAnimationFrame(step);
}
