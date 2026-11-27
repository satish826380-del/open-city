import {makeCreator} from './creator.js?v=1';
import {makeBigMap} from './bigmap.js?v=1';
import {makeInstall} from './install.js?v=1';
import {makeMinimap} from './minimap.js?v=1';
import {makeOverlays} from './overlays.js?v=1';
import {makeLogin} from './login.js?v=1';
import {makePeople} from './characters.js?v=1';
import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {startNet} from './net.js?v=19';
import {buildMetro} from './metro.js?v=2';
import {makeFacades} from './facades.js?v=2';
import {makeTrees} from './trees.js?v=1';
import {dressCity,HINDI_SHOPS} from './dressing.js?v=6';
import {buildNavapur,navapurGround,ringLane,WORLD,CAFE} from './navapur.js?v=20';
import {initSocial,ROLES,roleInfo} from './social.js?v=4';
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
const _makePeople=makePeople({MOBILE,MX,PI,R,T,mergeGeometries,mocapPose});const {SKINS,TOPS,BOTS,gsph,HG,HAIR_STYLES,TOP_STYLES,BOT_STYLES,GREET}=_makePeople;function pc(...a){return _makePeople.pc(...a)}function human(...a){return _makePeople.human(...a)}function hero(...a){return _makePeople.hero(...a)}function npc(...a){return _makePeople.npc(...a)}function animH(...a){return _makePeople.animH(...a)}function randLook(...a){return _makePeople.randLook(...a)}
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
let mapOn=false;let WP=null;const _makeBigMap=makeBigMap({$,CAFE,DMAP,EXTRA_PLACES,GAR,LIM,LOTS,OCOLL,P,PI,R,RIDES,ROADS,RW,SEA,SPOTS,ST,T,TRAFFIC,VADA,VENDORS,VT,WORLD,bubble,here,pay,scene,toast,togglePhone,train,get BOARDS(){return BOARDS},get NETAPI(){return NETAPI},set NETAPI(v){NETAPI=v},get PLACES(){return PLACES},get WP(){return WP},set WP(v){WP=v},get creating(){return creating},set creating(v){creating=v},get mapOn(){return mapOn},set mapOn(v){mapOn=v},get marker(){return marker},get polyPath(){return polyPath},get started(){return started},set started(v){started=v}});const {gpsMarker,mapExtra,PLAYER_COL,allPlayers}=_makeBigMap;function vsay(...a){return _makeBigMap.vsay(...a)}function nearVendor(...a){return _makeBigMap.nearVendor(...a)}function buyVendor(...a){return _makeBigMap.buyVendor(...a)}function toggleMap(...a){return _makeBigMap.toggleMap(...a)}function beaconTick(...a){return _makeBigMap.beaconTick(...a)}function drawBigMap(...a){return _makeBigMap.drawBigMap(...a)}
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
const _makeInstall=makeInstall({$,backToCreator,logout,setMenu,showAuth,store,toast});function doInstall(...a){return _makeInstall.doInstall(...a)}
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
const _makeMinimap=makeMinimap({$,DMAP,EXTRA_PLACES,LIM,LOTS,P,PI,PLACES,PLAYER_COL,ROADS,RW,SEA,TRAFFIC,allPlayers,here,mapExtra,marker,get camYaw(){return camYaw},set camYaw(v){camYaw=v}});const {polyPath}=_makeMinimap;function drawMap(...a){return _makeMinimap.drawMap(...a)}function drawMini(...a){return _makeMinimap.drawMini(...a)}
// ================= rain =================
const RN=3500,rainGeo=new T.BufferGeometry(),rainPos=new Float32Array(RN*6);for(let i=0;i<RN;i++){const x=(R()-.5)*80,y=R()*40,z=(R()-.5)*80;rainPos.set([x,y,z,x+.05,y-.7,z],i*6)}rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));
const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:0xaabbcc,transparent:true,opacity:.0,fog:false,depthWrite:false}));rain.frustumCulled=false;scene.add(rain);
let wet=0,rainAmt=0,rainTarget=0,weatherT=240;
// ================= character creator =================
// debug: ?top=x,z,height shows the map straight from above (for checking roads and building placement)
let creating=true;let NETAPI=null;let CL_URL=null;const _makeCreator=makeCreator({$,BOTS,BOT_STYLES,HAIR_STYLES,P,PI,SKINS,ST,TOPS,TOP_STYLES,animH,bubble,doWave,hero,human,loadVRM,makeMe,recolor,roleSw,save,scene,setGPS,startNet,toast,vehicle,vrmProgress,vrmSlots,get AUTH(){return AUTH},set AUTH(v){AUTH=v},get CHARS(){return CHARS},set CHARS(v){CHARS=v},get CL_URL(){return CL_URL},set CL_URL(v){CL_URL=v},get NETAPI(){return NETAPI},set NETAPI(v){NETAPI=v},get ONTRAIN(){return ONTRAIN},set ONTRAIN(v){ONTRAIN=v},get PV(){return PV},set PV(v){PV=v},get SIT(){return SIT},set SIT(v){SIT=v},get SOC(){return SOC},get creating(){return creating},set creating(v){creating=v},get me(){return me},set me(v){me=v},get outTok(){return outTok},set outTok(v){outTok=v}});const {TOPV,CAMV,CLOSE,CYAW,CWALK,CPHONE,CV}=_makeCreator;function sTab(...a){return _makeCreator.sTab(...a)}function setZoom(...a){return _makeCreator.setZoom(...a)}function lookPayload(...a){return _makeCreator.lookPayload(...a)}function heroRows(...a){return _makeCreator.heroRows(...a)}function startMultiplayer(...a){return _makeCreator.startMultiplayer(...a)}function openChat(...a){return _makeCreator.openChat(...a)}function outfitList(...a){return _makeCreator.outfitList(...a)}function outfitSw(...a){return _makeCreator.outfitSw(...a)}function applyOutfit(...a){return _makeCreator.applyOutfit(...a)}function initChars(...a){return _makeCreator.initChars(...a)}function rebuildMe(...a){return _makeCreator.rebuildMe(...a)}
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
const _makeOverlays=makeOverlays({$,BILLS,DMAP,K,SOC,SPOTS,T,addColl,blocked,buildBoards,camera,doWave,esc,roleInfo,scene,setGPS,setMenu,spotByCode,store,toast,togglePhone,get APP(){return APP},set APP(v){APP=v},get AUTH(){return AUTH},set AUTH(v){AUTH=v},get MENU(){return MENU},set MENU(v){MENU=v},get NETAPI(){return NETAPI},set NETAPI(v){NETAPI=v},get creating(){return creating},set creating(v){creating=v},get mapOn(){return mapOn},set mapOn(v){mapOn=v},get phoneOn(){return phoneOn},set phoneOn(v){phoneOn=v},get photo(){return photo},set photo(v){photo=v},get started(){return started},set started(v){started=v}});const {BOARDS,loadSpots}=_makeOverlays;function showTour(...a){return _makeOverlays.showTour(...a)}function viewSpot(...a){return _makeOverlays.viewSpot(...a)}function spotApp(...a){return _makeOverlays.spotApp(...a)}
// ---- login: email + password (log in / sign up). An account is needed to enter the city.
let AUTH={kind:'none'};const _makeLogin=makeLogin({$,K,P,PI,SOC,ST,audioInit,backToCreator,blocked,currentUser,groundY,isAdmin,loadSpots,loginEmail,logout,lookPayload,onAuth,playerStatus,resetPassword,sTab,save,setMenu,setNewPassword,showTour,signUpEmail,startMultiplayer,store,toast,get AUTH(){return AUTH},set AUTH(v){AUTH=v},get MENU(){return MENU},set MENU(v){MENU=v},get NETAPI(){return NETAPI},set NETAPI(v){NETAPI=v},get camYaw(){return camYaw},set camYaw(v){camYaw=v},get creating(){return creating},set creating(v){creating=v},get me(){return me},set me(v){me=v},get started(){return started},set started(v){started=v}});const {AT_PARAM}=_makeLogin;function showAuth(...a){return _makeLogin.showAuth(...a)}
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
const STAGE_RING=new T.Mesh(new T.RingGeometry(.62,.7,64).rotateX(-PI/2),new T.MeshBasicMaterial({color:0x2dd4bf,transparent:true,opacity:.9,fog:false,depthWrite:false}));
STAGE_RING.renderOrder=2;STAGE_RING.userData.noCull=true;scene.add(STAGE_RING);
const STAGE_GLOW=new T.Mesh(new T.CircleGeometry(.7,48).rotateX(-PI/2),new T.MeshBasicMaterial({color:0x2dd4bf,transparent:true,opacity:.14,fog:false,depthWrite:false}));STAGE_GLOW.renderOrder=1;scene.add(STAGE_GLOW);
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
 STAGE_RING.visible=STAGE_GLOW.visible=creating&&!CLOSE;if(STAGE_RING.visible){STAGE_RING.position.set(me.position.x,me.position.y+.03,me.position.z);STAGE_GLOW.position.set(me.position.x,me.position.y+.02,me.position.z)}
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
