import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {startNet} from './net.js?v=8';
import {buildMetro} from './metro.js?v=1';
import {makeFacades} from './facades.js?v=1';
import {makeTrees} from './trees.js?v=1';
import {dressCity,HINDI_SHOPS} from './dressing.js?v=4';
import {buildNavapur,navapurGround,ringLane,WORLD} from './navapur.js?v=6';
import {vehicle as VEH,initVehicles} from './vehicles.js?v=2';
import {loadVRM,attachVRM,driveVRM,recolor,vrmSlots} from './vrm.js?v=15';
{
const T=THREE,$=id=>document.getElementById(id),R=Math.random,PI=Math.PI;
const TOUCH=matchMedia('(pointer:coarse)').matches;
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const QS={low:{pr:1,shadow:false,smap:1024,bloom:false,npc:16},med:{pr:1,shadow:true,smap:1024,bloom:true,npc:26},high:{pr:Math.min(devicePixelRatio,2),shadow:true,smap:2048,bloom:true,npc:38}};
let Q=store.get('mn2_q')||(TOUCH?'low':'med');if(!QS[Q])Q='med';
// ================= renderer =================
const renderer=new T.WebGLRenderer({canvas:$('c'),antialias:true,powerPreference:'high-performance'});
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.72;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const ANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const scene=new T.Scene();scene.fog=new T.FogExp2(0xc8dbe8,.0018);
const camera=new T.PerspectiveCamera(62,1,.1,2500);
const crt=new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType,samples:4});const composer=new EffectComposer(renderer,crt);composer.addPass(new RenderPass(scene,camera));
const gtao=new GTAOPass(scene,camera,innerWidth,innerHeight);gtao.updateGtaoMaterial({radius:1.6,distanceExponent:1.6,thickness:1.4,scale:1.15});gtao.blendIntensity=.9;gtao.overrideVisibility=function(){const c=this._visibilityCache;this.scene.traverse(o=>{c.set(o,o.visible);if(o.isPoints||o.isLine||o.isSprite||(o.material&&o.material.transparent))o.visible=false})};composer.addPass(gtao);
const bloom=new UnrealBloomPass(new T.Vector2(512,512),.3,.45,1.0);composer.addPass(bloom);composer.addPass(new OutputPass());
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},vig:{value:.22},sat:{value:1.28},con:{value:1.08},warm:{value:.03}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform sampler2D tDiffuse;uniform float vig,sat,con,warm;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec3 col=c.rgb;float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,sat);col=(col-.5)*con+.5;col.r+=warm;col.b-=warm*.7;float d=distance(vUv,vec2(.5));col*=1.-vig*smoothstep(.3,.9,d);gl_FragColor=vec4(clamp(col,0.,1.),c.a);}'});composer.addPass(grade);
function resize(){renderer.setSize(innerWidth,innerHeight,false);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);
// ================= lights + sky =================
const hemi=new T.HemisphereLight(0xcfe6ff,0x5a4a35,.6);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff0d8,2.6);sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:400});scene.add(sun,sun.target);
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
 grass:ctex(256,256,(x,w,h)=>{x.fillStyle='#5d8a3a';x.fillRect(0,0,w,h);speck(x,w,h,16000,['#4a7a2c','#76a24a','#3e6a26','#8aa85a'],2.5,.5);for(let i=0;i<10;i++){x.globalAlpha=.18;x.fillStyle='#9b8a5a';x.beginPath();x.arc(R()*w,R()*h,6+R()*16,0,7);x.fill()}x.globalAlpha=1}),
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
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:t,fog:false}));s.scale.set(w/64*.45,.45,1);return s}
const SIGNMATS=[];
// ================= world layout =================
const ROADS=[-120,-40,40,120],RW=14,LIM=170,SEA=165;
const EDGES=[[-LIM,-127],[-113,-47],[-33,33],[47,113],[127,SEA]];
const COLL=[],OCOLL=[],LOTS=[],LAMPS=[],TREES=[],BLOCKS=[];
const addColl=(x0,x1,z0,z1,h=3)=>COLL.push({x0,x1,z0,z1,h});
const ground=mesh(new T.PlaneGeometry(1200,606+SEA),mat(0x9a8f7c,1),0,-.02,(-600+SEA+6)/2,scene,false);ground.rotation.x=-PI/2;
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
const SHOPS_EN=['Sharma General Store','Irani Cafe','Bombay Tailors','Laxmi Medical','Pav Bhaji Corner','Cyber Cafe','Ganesh Sweets','Mobile Repair','Kohinoor Hotel','Patel Kirana','Joshi Clinic','Om Sai Xerox','New Fashion','Hari Om Bhaji','Royal Saloon','Amrut Dairy'];
const SHOPS=HINDI_SHOPS;
const SIGNCOL=['#c0392b','#1e5fa8','#127a5a','#7b2d8b','#d35400','#141414'];
let shopIdx=0;
function slab(x0,x1,z0,z1){const w=x1-x0,d=z1-z0;const g=uvBox(new T.BoxGeometry(w,.25,d),w,.25,d,2,2);mesh(g,tileMat,(x0+x1)/2,.125,(z0+z1)/2,scene,false)}
function building(cx,cz,w,d,floors,pi,frontSign){const fm=FACADE[Math.floor(R()*FACADE.length)],H=floors*3.2;
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
const POOL=[];for(let i=0;i<8;i++){const l=new T.PointLight(0xffa64d,0,26,1.6);l.position.y=7.5;scene.add(l);POOL.push(l)}
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
const stS=sign('NAGRI JUNCTION','#ffd21f','#141414',1.3,.5);stS.position.set(-128.4,4.8,0);stS.rotation.y=PI/2;scene.add(stS);
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
 const s=sign('Raju ki Tapri','#ffd21f','#141414',.9,.5);s.position.set(0,3.2,27.2);scene.add(s)}
const VADA={x:72,z:28.5};{bx(3.2,1,1.6,mat(0xc0392b,.7),72,1.05,28.5);for(const dx of[-1.2,1.2])mesh(new T.CylinderGeometry(.3,.3,.12,12),mat(0x222222,.8),72+dx,.4,29.3).rotation.z=PI/2;
 const um=mesh(new T.ConeGeometry(2.4,.9,12),mat(0xf39c12,.8),72,3.5,28.5);bx(.08,2.6,.08,mat(0x444444),72,2.3,28.5,scene,false);addColl(70.4,73.6,27.7,29.3);
 const s=sign('Vada Pav Center','#e67e22','#fff',.8,.6);s.position.set(72,1.4,29.32);scene.add(s)}
const FLAT={x:-65.5,z:109.5};{const s=sign('Tumhara Ghar · Flat 302','#19a7a0','#fff',.7,.6);s.position.set(FLAT.x,2.2,107.2);scene.add(s);bx(1.8,2.6,.25,mat(0x5b3a1e,.7),FLAT.x,1.55,106.6,scene,false)}
const GAR={x:-96,z:110.5};
// ================= Navapur districts (see navapur.js) =================
const TICK=[],DMAP={zones:[],lines:[],land:null},EXTRA_PLACES=[];
buildNavapur({scene,ctex,mat,TEX,FACADE,sign,addColl,addOColl,seaMat,roadMat,interMat,R,TICK,DMAP,PLACES:EXTRA_PLACES,ground,sea,LOTS,tileMat});
// light-blue gradient sky dome (replaces the physical sky's look; the physical sky still lights the scene)
const SKY_TOP=new T.Color(0x3d9be6),SKY_HZ=new T.Color(0xa9d6f7);
const skyDome=new T.Mesh(new T.SphereGeometry(2000,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:SKY_TOP},hz:{value:SKY_HZ},sun:{value:new T.Vector3(0,1,0)}},
 vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top,hz,sun;varying vec3 vD;void main(){float h=clamp(vD.y,0.,1.);vec3 c=mix(hz,top,pow(h,.55));float s=max(dot(normalize(vD),normalize(sun)),0.);c+=vec3(1.,.95,.82)*(pow(s,300.)*1.2+pow(s,12.)*.12);if(vD.y<0.)c=hz*.96;gl_FragColor=vec4(c,1.);}'}));
skyDome.renderOrder=-1;skyDome.frustumCulled=false;scene.add(skyDome);sky.visible=false;
TICK.push(()=>{skyDome.position.copy(camera.position);skyDome.material.uniforms.sun.value.copy(sunDir)});
const BENCHES=dressCity({scene,ctex,mat,TEX,sign,addColl,LOTS,ROADS,LIM,SEA,R,TICK})||[];
// ================= people =================
const SKINS=[0x8d5524,0xa8693a,0xc68642,0x6f4521,0xe0ac69];
const TOPS=[0xf5f5f0,0x2c5fa8,0xc0392b,0x1e7b4a,0xf2c94c,0x7b2d8b,0xe67e22,0x2b2b2b,0x8fb8c9,0xe84393];
const BOTS=[0x22324a,0x1b1b1b,0x8c7a5b,0x4a5a6a,0xe9e4d8];
const GEO={};const gcap=(r,l)=>GEO['c'+r+l]||(GEO['c'+r+l]=new T.CapsuleGeometry(r,l,4,10));const gsph=(r)=>GEO['s'+r]||(GEO['s'+r]=new T.SphereGeometry(r,16,12));
const VCM=new T.MeshPhysicalMaterial({vertexColors:true,roughness:.6,metalness:0,sheen:.55,sheenRoughness:.5,sheenColor:new T.Color(0xffd9b8)});
// warm rim light so skin/cloth pick up the sodium-lamp glow at grazing angles
VCM.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{float rim=pow(1.-saturate(dot(normalize(normal),normalize(vViewPosition))),3.);totalEmissiveRadiance+=vec3(1.,.62,.35)*rim*.09;}')};
const PHONE_G=new T.BoxGeometry(.05,.095,.009),PHONE_M=new T.MeshStandardMaterial({color:0x111111,emissive:0x4aa8ff,emissiveIntensity:.9,roughness:.3});
const _m4=new T.Matrix4(),_q4=new T.Quaternion(),_e4=new T.Euler(),_s4=new T.Vector3(),_p4=new T.Vector3();
const HG={sph:new T.SphereGeometry(1,18,14),cap:new T.SphereGeometry(1,18,10,0,PI*2,0,PI*.56),box:new T.BoxGeometry(1,1,1),tor:new T.TorusGeometry(1,.12,8,24)};
const cyl=(a,b)=>HG['c'+a+b]||(HG['c'+a+b]=new T.CylinderGeometry(a,b,1,14));
const lathe=(pts,k)=>HG['l'+k]||(HG['l'+k]=new T.LatheGeometry(pts.map(p=>new T.Vector2(p[0],p[1])),18));
function pc(geo,col,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){const g=geo.clone();g.applyMatrix4(_m4.compose(_p4.set(x,y,z),_q4.setFromEuler(_e4.set(rx,ry,rz)),_s4.set(sx,sy,sz)));const c=new T.Color(col),n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b}g.setAttribute('color',new T.BufferAttribute(a,3));return g}
function part(list,parent){const m=new T.Mesh(mergeGeometries(list),VCM);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
const shade=(c,f)=>{const k=new T.Color(c);k.multiplyScalar(f);return k};
const TORSO_M=[[.001,0],[.15,0],[.152,.07],[.148,.15],[.162,.25],[.186,.35],[.192,.41],[.17,.47],[.1,.515],[.001,.53]],TORSO_F=[[.001,0],[.155,0],[.14,.08],[.128,.16],[.15,.26],[.175,.33],[.168,.4],[.15,.46],[.09,.505],[.001,.52]];
const PELVIS=[[.001,-.12],[.13,-.115],[.158,-.06],[.156,.03],[.148,.1],[.001,.1]];
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
 const phone=new T.Mesh(PHONE_G,PHONE_M);phone.position.set(0,-.3,.045);phone.rotation.x=-.9;phone.visible=false;arms[1].el.add(phone);
 const t0=performance.now();
 root.userData={hips,spine,head,arms,legs,ph:R()*6,wave:0,pupils,lidG,phone,sa:0,rs:0,ss:0,pw:0,pc:0,yv:0,ly:0,gx:0,gy:0,tgx:0,tgy:0,gt:t0+1000+Math.random()*2000,nb:t0+1500+Math.random()*3500,bs:-1e9,dbl:false,np:t0+6000+Math.random()*18000,ep:0};root.scale.setScalar(o.h||1);return root}
// ===== hero: detailed anime-style male player (black hoodie-jacket, cargo pants, high-tops) =====
// Same rig layout as human(), so animH() drives it unchanged.
HG.cone=new T.ConeGeometry(1,1,7);HG.ring=new T.TorusGeometry(1,.05,6,32);HG.col=new T.TorusGeometry(1,.32,8,24,PI*2-1.3);const HEAD_P=[[.001,-.118],[.03,-.113],[.055,-.095],[.075,-.065],[.09,-.03],[.099,.01],[.101,.045],[.096,.085],[.083,.118],[.058,.142],[.03,.154],[.001,.157]];
const _up=new T.Vector3(0,1,0),_qd=new T.Quaternion(),_ed=new T.Euler(),_dv=new T.Vector3();
function spike(list,col,cx,cy,cz,dx,dy,dz,r,len,inset=0){_dv.set(dx,dy,dz).normalize();_ed.setFromQuaternion(_qd.setFromUnitVectors(_up,_dv));const o=inset+len/2;list.push(pc(HG.cone,col,cx+_dv.x*o,cy+_dv.y*o,cz+_dv.z*o,r,len,r,_ed.x,_ed.y,_ed.z))}
function hero(o){const root=new T.Group(),sk=o.skin,jk=o.top,pn=o.bottom,hr=0x1b1d2b,tee=0xd8d8d4,red=0xb3122a,sil=0xc9ccd1,brn=0x5b3a22,rib=shade(jk,.78),dark=shade(sk,.85),lip=shade(sk,.78).lerp(new T.Color(0x9a4a48),.3),shoe=0x17171a,wht=0xf2f2f2;
 const hips=new T.Group();hips.position.y=.95;root.add(hips);
 // pelvis: cargo pants, leather belt + buckle, wallet chain
 part([pc(lathe(PELVIS,'p'),pn,0,0,0,1.0,1,.66),pc(cyl(.158,.16),brn,0,.06,0,1,.035,.7),pc(HG.box,sil,0,.06,.112,.04,.03,.012),pc(HG.box,shade(sil,.45),0,.06,.118,.022,.014,.006),
  pc(HG.ring,sil,-.15,-.02,.055,.035,.055,.035,.2,1.1,0)],hips);
 const spine=new T.Group();spine.position.y=.08;hips.add(spine);
 const jkG=HG.jko||(HG.jko=new T.LatheGeometry(TORSO_M.map(p=>new T.Vector2(p[0],p[1])),24,.42,PI*2-.84));
 const sp=[pc(jkG,jk,0,0,0,1.04,1,.74),pc(lathe(TORSO_M,'tm'),tee,0,0,0,1.0,.99,.71),pc(cyl(.152,.152),rib,0,.02,0,1.06,.05,.76),
  pc(cyl(.052,.06),sk,0,.6,0,1,.16,1),
  // hood down at the back with red lining, collar ring
  pc(HG.sph,jk,0,.5,-.1,.12,.1,.07),pc(HG.sph,red,0,.55,-.085,.085,.05,.045),pc(HG.col,jk,0,.56,-.012,.085,.08,.065,PI/2-.3,0,PI/2+.65),pc(HG.col,red,0,.575,-.018,.07,.066,.055,PI/2-.3,0,PI/2+.65),
  // necklace + pendant
  pc(HG.ring,sil,0,.52,.04,.07,.08,.07,PI/2+.75),pc(HG.box,sil,0,.43,.137,.014,.02,.006,0,0,PI/4)];
 for(const s of[-1,1])sp.push(
  pc(HG.box,shade(tee,.55),s*.022,.43,.132,.008,.07,.006,0,0,s*-.45),       // V-neck
  pc(HG.box,rib,s*.078,.25,.122,.018,.44,.016),pc(HG.box,sil,s*.07,.25,.131,.004,.42,.004), // open zip edges
  pc(HG.box,sil,s*.12,.36,.112,.05,.006,.006),                               // chest pocket zips
  pc(cyl(.004,.004),0xdedede,s*.045,.39,.142,1,.16,1),pc(HG.sph,sil,s*.045,.305,.142,.006,.01,.006)); // hood strings
 part(sp,spine);
 const head=new T.Group();head.position.y=.7;spine.add(head);
 const hd=[pc(lathe(HEAD_P,'hd'),sk,0,0,0,1,1,1.08),pc(HG.sph,dark,.1,0,-.005,.014,.028,.02),pc(HG.sph,dark,-.1,0,-.005,.014,.028,.02),
  pc(HG.sph,dark,0,-.026,.099,.0055,.009,.007),pc(HG.box,lip,0,-.062,.079,.022,.0045,.008)];
 // big anime eyes: sclera, lash line, brow, highlight (static); iris+pupil (moves); lids (blink)
 const iris=new T.Color(o.eye||0x3d2c26),pu=[],ld=[],EY=.002;
 for(const s of[-1,1]){const x=s*.04;
  hd.push(pc(HG.sph,0xf3f0ea,x,EY,.086,.022,.017,.01),pc(HG.box,0x14110f,x,EY+.017,.094,.05,.005,.006,0,0,s*-.12),pc(HG.box,hr,x,EY+.037,.095,.034,.006,.007,0,0,s*-.14),pc(HG.sph,0xffffff,x+.006,EY+.006,.0995,.0035,.0035,.002));
  pu.push(pc(HG.sph,iris,x,EY-.001,.0945,.012,.0145,.005),pc(HG.sph,0x080808,x,EY-.001,.0972,.0055,.0065,.003));
  ld.push(pc(HG.sph,sk,x,0,.089,.026,.021,.014))}
 // spiky hair: base volume + radiating spikes (deterministic, so the look never changes)
 hd.push(pc(HG.cap,hr,0,.04,-.008,.116,.142,.126),pc(HG.sph,hr,0,.005,-.045,.108,.12,.1));
 const C=[0,.03,-.01];let n=0;const vr=()=>{n++;return(Math.sin(n*12.9898)*43758.5453)%1};
 for(const el of[.2,.6,1.0])for(let i=0;i<12;i++){const az=i/12*PI*2+el;const cz=Math.cos(az);if(cz>.45&&el<.7)continue;const ce=Math.cos(el);
  spike(hd,hr,C[0],C[1],C[2],Math.sin(az)*ce,Math.sin(el)+.15,cz*ce-.25,.03+Math.abs(vr())*.012,.07+Math.abs(vr())*.05,.085)}
 for(let i=0;i<4;i++)spike(hd,hr,C[0],C[1],C[2],(i-1.5)*.35,1,-.35-i%2*.2,.032,.09,.09);
 for(const[x,l,t]of[[-.07,.05,-.5],[-.045,.068,-.2],[-.018,.06,.1],[.008,.074,-.05],[.034,.058,.25],[.058,.066,.4],[.078,.045,.7]])spike(hd,hr,x,.092,.09,x*3+t*.3,-1,.42,.021,l)   // bangs, uneven like the sheet
 for(const s of[-1,1]){spike(hd,hr,s*.094,.045,.025,s*.3,-1,.1,.024,.075);spike(hd,hr,s*.085,.06,-.03,s*.35,-1,-.2,.026,.08)} // side locks
 part(hd,head);
 const pupils=part(pu,head),lidG=new T.Group();lidG.position.y=EY;lidG.visible=false;head.add(lidG);part(ld,lidG);
 const arms=[],legs=[];
 for(const s of[-1,1]){const shd=new T.Group();shd.position.set(s*.19,.43,0);spine.add(shd);
  part([pc(HG.sph,jk,0,0,0,.054,.054,.056),pc(cyl(.055,.049),jk,0,-.15,0,1,.28,1),pc(HG.box,red,s*.055,-.1,0,.004,.035,.02)],shd);
  const el=new T.Group();el.position.y=-.29;shd.add(el);
  part([pc(HG.sph,jk,0,0,0,.05,.05,.05),pc(cyl(.05,.044),jk,0,-.1,0,1,.2,1),pc(cyl(.043,.043),rib,0,-.215,0,1,.05,1),pc(cyl(.037,.037),0x18181a,0,-.25,0,1,.035,1),
   pc(HG.sph,sk,0,-.29,.004,.033,.045,.02),pc(HG.sph,sk,0,-.333,.01,.03,.03,.016,.3),pc(cyl(.011,.009),sk,-s*.028,-.28,.016,1,.05,1,.4,0,s*.5)],el);arms.push({sh:shd,el,s});
  const hp=new T.Group();hp.position.set(s*.088,0,0);hips.add(hp);
  part([pc(cyl(.088,.07),pn,0,-.215,0,1,.43,1),pc(HG.box,shade(pn,1.15),s*.078,-.29,0,.02,.12,.095),pc(HG.box,shade(pn,.8),s*.089,-.235,0,.022,.012,.097)],hp);
  const kn=new T.Group();kn.position.y=-.43;hp.add(kn);
  part([pc(HG.sph,pn,0,0,0,.07,.07,.07),pc(cyl(.07,.056),pn,0,-.17,0,1,.34,1),pc(cyl(.05,.052),shade(pn,.75),0,-.355,0,1,.05,1),
   pc(cyl(.052,.058),shoe,0,-.395,.005,1,.06,1.05),pc(HG.box,shoe,0,-.43,.045,.094,.06,.2),pc(HG.sph,shoe,0,-.435,.135,.047,.03,.045),
   pc(HG.box,wht,0,-.468,.045,.1,.026,.235),pc(HG.box,wht,0,-.425,.03,.096,.014,.1,-.35),pc(HG.tor,wht,0,-.368,.005,.054,.054,.054,PI/2),
   pc(HG.box,0x9a9a9a,0,-.405,.1,.04,.006,.05,.5)],kn);legs.push({hp,kn,s})}
 root.userData={hips,spine,head,arms,legs,ph:R()*6,wave:0};
 const phone=new T.Mesh(PHONE_G,PHONE_M);phone.position.set(0,-.3,.045);phone.rotation.x=-.9;phone.visible=false;arms[1].el.add(phone);
 const t0=performance.now();
 Object.assign(root.userData,{pupils,lidG,phone,sa:0,rs:0,ss:0,pw:0,pc:0,yv:0,ly:0,gx:0,gy:0,tgx:0,tgy:0,gt:t0+1000+Math.random()*2000,nb:t0+1500+Math.random()*3500,bs:-1e9,dbl:false,np:t0+6000+Math.random()*18000,ep:0});
 root.scale.setScalar(o.h||.97);return root}
const sit0=s=>s==='sit';
function animH(g,speed,dt,state){g.userData.spd=sit0(state)?0:speed;const u=g.userData,now=performance.now(),mv=speed>.2,sit=state==='sit',lp=(a,b,k)=>a+(b-a)*Math.min(1,k);
 if(mv)u.ph+=dt*(3.1+speed*1.12);
 // smoothed blend weights: stride amplitude, run, sit, phone-check
 u.sa=lp(u.sa,Math.min(1,speed/1.6),dt*6);u.rs=lp(u.rs,speed>4.5?1:0,dt*5);u.ss=lp(u.ss,sit?1:0,dt*6);
 const rs=u.rs,a=u.sa*(.78+.47*rs),p=u.ph,idle=(1-Math.min(1,u.sa*3))*(1-u.ss),ss=u.ss;
 // lean into turns
 let dy=g.rotation.y-u.ly;dy=((dy+PI*3)%(PI*2))-PI;u.ly=g.rotation.y;if(dt>0)u.yv=lp(u.yv,Math.max(-3,Math.min(3,dy/dt)),dt*6);
 // phone check: occasionally pull out a phone when standing around
 if(u.forcePhone&&!sit){u.pc=1;u.fp=1;u.ep=now+1e9}else if(u.fp){u.fp=0;u.pc=0;u.np=now+15000+Math.random()*15000}
 else if(!mv&&!sit&&u.wave<=0){if(!u.pc&&now>u.np){u.pc=1;u.ep=now+3500+Math.random()*3500;u.np=u.ep+9000+Math.random()*22000}else if(u.pc&&now>u.ep)u.pc=0}else u.pc=0;
 u.pw=lp(u.pw,u.pc,dt*4);const pw=u.pw;
 for(const L of u.legs){const q=p+(L.s>0?PI:0),hx=-Math.sin(q)*.52*a,kx=Math.max(0,Math.sin(q-1.25))*(1+.55*rs)*a;
  L.hp.rotation.x=lp(hx,-1.45,ss);L.kn.rotation.x=lp(kx,1.5,ss);L.hp.rotation.z=L.s*.02+L.s*Math.sin(now/2300+u.ph)*.012*idle}
 for(const A of u.arms){const q=p+(A.s>0?0:PI);A.sh.rotation.x=-Math.sin(q)*.5*a*(1+.25*rs);A.el.rotation.x=-(.12+.55*a*(.6+.8*rs));A.sh.rotation.z=A.s*(.06+a*.03)}
 const R1=u.arms[1];
 if(pw>.01){R1.sh.rotation.x=lp(R1.sh.rotation.x,-.75,pw);R1.el.rotation.x=lp(R1.el.rotation.x,-1.75,pw);R1.sh.rotation.z=lp(R1.sh.rotation.z,.05,pw)}
 u.phone.visible=pw>.05&&!u.vrm;
 if(u.wave>0&&speed<.2){u.wave-=dt;R1.sh.rotation.x=-2.5;R1.sh.rotation.z=.25;R1.el.rotation.x=-.6+Math.sin(now/120)*.35}
 u.hips.position.y=.95+Math.abs(Math.sin(p))*.032*a-.04*rs-.42*ss;u.hips.rotation.y=Math.sin(p)*.09*a;u.spine.rotation.y=-Math.sin(p)*.13*a;u.spine.rotation.x=.035+.125*rs+.04*pw;u.hips.rotation.z=Math.cos(p)*.025*a+Math.sin(now/2300+u.ph)*.022*idle;
 u.spine.rotation.z=lp(u.spine.rotation.z,-u.yv*.045*Math.min(1,u.sa*1.5),dt*8);
 const b=Math.sin(now/750+u.ph)*.012;u.spine.scale.y=1+b*.35*(1-u.sa);
 // head: slow look-around when idle, face forward when moving, look down at the phone
 const hy=(Math.sin(now/2600+u.ph)*.35)*idle*(1-pw)+u.gx*.0,hx2=Math.sin(now/3100+u.ph)*.06*idle+.42*pw;
 u.head.rotation.y=lp(u.head.rotation.y,hy,dt*5);u.head.rotation.x=lp(u.head.rotation.x,hx2,dt*5);
 // eyes: saccades + blinking (lids are a thin skin-coloured shell that scales shut)
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
 for(const L of LOTS){const fz=L.z+L.front*(L.d/2),bays=Math.floor(L.w/4);
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
// distant skyline
{const byM=FACADE.map(()=>[]);for(let i=0;i<70;i++){const a=R()*PI*2,rad=270+R()*200,x=Math.cos(a)*rad,z=Math.sin(a)*rad;if(z>140)continue;const w=16+Math.floor(R()*3)*8,d=16+Math.floor(R()*3)*8,h=40+Math.floor(R()*30)*3.2;const g=uvBox(new T.BoxGeometry(w,h,d),w,h,d,16,12.8);g.translate(x,h/2,z);byM[i%FACADE.length].push(g)}
 byM.forEach((gs,i)=>{if(gs.length)scene.add(new T.Mesh(mergeGeometries(gs),FACADE[i]))})}
// ================= vehicles =================
const glass=new T.MeshStandardMaterial({color:0x10161c,roughness:.05,metalness:.9}),chrome=mat(0xd0d4d8,.15,1),tyre=mat(0x161616,.9),rimM=mat(0x9aa0a6,.3,.9);
const headMat=new T.MeshStandardMaterial({color:0xffffff,emissive:0xfff3d0,emissiveIntensity:.2}),tailMat=new T.MeshStandardMaterial({color:0x550000,emissive:0xff2020,emissiveIntensity:.15});
function extr(pts,depth,m,parent,bevel=.05){const s=new T.Shape();s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],pts[i][1]);const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:6});g.rotateY(-PI/2);g.translate(depth/2,0,0);return mesh(g,m,0,0,0,parent)}
function wheel(parent,x,y,z,r=.33,w=.22){const g=new T.Group();g.position.set(x,y,z);parent.add(g);const t=mesh(new T.CylinderGeometry(r,r,w,18),tyre,0,0,0,g);t.rotation.z=PI/2;const rm=mesh(new T.CylinderGeometry(r*.6,r*.6,w+.02,12),rimM,0,0,0,g,false);rm.rotation.z=PI/2;return g}
// vehicles are built in vehicles.js (sedan, Padmini taxi, auto, BEST bus, scooter)
function vehicle(type,color){return VEH(type,color)}
initVehicles({scene});
// ================= colliders + helpers =================
function blocked(x,z,r){for(const c of COLL)if(x+r>c.x0&&x-r<c.x1&&z+r>c.z0&&z-r<c.z1)return true;
 for(const o of OCOLL){const dx=x-o.x,dz=z-o.z;if(dx*dx+dz*dz>o.rr)continue;const lx=dx*o.c-dz*o.s,lz=dx*o.s+dz*o.c;if(Math.abs(lx)<o.hw+r&&Math.abs(lz)<o.hd+r)return true}return false}
// rotated building footprints (centre, size, yaw) for the organic districts
function addOColl(x,z,w,d,ry,h=4){const hw=w/2,hd=d/2;OCOLL.push({x,z,hw,hd,c:Math.cos(ry),s:Math.sin(ry),rr:(hw+3)*(hw+3)+(hd+3)*(hd+3),h})}
function groundY(x,z){{const n=navapurGround(x,z);if(n!==null)return n}if(x>-143&&x<-137&&z>-47&&z<47)return 1.25;for(const r of ROADS)if(Math.abs(x-r)<RW/2||Math.abs(z-r)<RW/2)return 0;if(x<-143&&x>-158)return .27;return .25}
// ================= traffic =================
function loopPts(s,o,cw){const a=s+o;const p=[[-a,-a],[a,-a],[a,a],[-a,a]];return cw?p:p.reverse()}
function rectPts(x0,x1,z0,z1,o,cw){const p=[[x0-o,z0-o],[x1+o,z0-o],[x1+o,z1+o],[x0-o,z1+o]];return cw?p:p.reverse()}
const LOOPS=[loopPts(40,-3.5,true),loopPts(40,3.5,false),loopPts(120,-3.5,true),loopPts(120,3.5,false),ringLane(-3.5,true),ringLane(3.5,false)].map(p=>{const L={p,seg:[],len:0};for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);L.seg.push({a,b,l,s:L.len,ax:a[0]!==b[0]?'x':'z'});L.len+=l}return L});
function loopAt(L,d){d=((d%L.len)+L.len)%L.len;for(const s of L.seg)if(d<=s.s+s.l){const t=(d-s.s)/s.l;return{x:s.a[0]+(s.b[0]-s.a[0])*t,z:s.a[1]+(s.b[1]-s.a[1])*t,yaw:Math.atan2(s.b[0]-s.a[0],s.b[1]-s.a[1]),seg:s,t}}}
const CARC=[0xf2f2f2,0x9aa3ad,0x2c5fa8,0x7a1f1f,0x1b1b1b,0x3d6b4a,0xd9d2c2];
const TRAFFIC=[];LOOPS.forEach((L,li)=>{const n=li<2?4:li<4?6:8;for(let k=0;k<n;k++){const type=li===2&&k===0?'bus':['taxi','car','auto','car','taxi','car'][(k+li)%6];const v=vehicle(type,CARC[(k*3+li)%CARC.length]);TRAFFIC.push({L,d:L.len*k/n+R()*5,v:type==='bus'?8:type==='auto'?10:12+R()*3,cur:0,type,veh:v})}});
// ================= player state =================
let SAVE=store.get('mn2_save')||{};
const ST={money:SAVE.money??800,tx:SAVE.tx||[],hunger:SAVE.hunger??80,energy:SAVE.energy??90,owned:SAVE.owned||[],look:SAVE.look||{female:false,skin:SKINS[2],top:0x2c5fa8,bottom:0x22324a,longSleeve:true},name:SAVE.name||'Satish',time:SAVE.time??(9/24),day:SAVE.day||1};
const DAY_LOCK=9/24; // always subah (9 AM): bright daylight, no night
let TIME=DAY_LOCK;
function save(){ST.time=TIME;store.set('mn2_save',ST)}setInterval(save,10000);
if(!ST.look.v2){ST.look.top=0x2b2b2b;ST.look.bottom=0x1b1b1b;ST.look.v2=1}
let PV=null,CHARS=null,outTok=0;
const makeMe=()=>{const g=ST.look.female?human(ST.look):hero(ST.look);if(PV)attachVRM(g,PV);return g};
let me=makeMe();
// the metro: new coaches + passengers (needs human() from the people section)
const METRO=buildMetro(TRAIN,()=>human(randLook()),(p,st)=>{for(let i=0;i<3;i++)animH(p,0,1,st)});let ONTRAIN=null;
const nearMetro=()=>!P.ride&&!ONTRAIN&&train.wait>0&&P.x>-146&&P.x<-134&&Math.abs(P.z-train.z)<42;scene.add(me);
const P={x:FLAT.x,z:FLAT.z+1.5,y:.25,vy:0,yaw:0,ride:null};
const RIDES=[['auto',-70,47.5,0],['auto',10,33.5,PI/2],['taxi',-52,110.5,PI/2],['auto',60,47.5,0],['taxi',-129.5,-30,0]].map(([t,x,z,r])=>{const v=vehicle(t);v.g.position.set(x,0,z);v.g.rotation.y=r;return v});
function spawnOwned(){ST.owned.forEach((t,i)=>{if(RIDES.some(r=>r.own===t))return;const v=vehicle(t==='car'?'car':'scooter',t==='car'?0xe8e8e8:0x19a7a0);v.own=t;v.g.position.set(GAR.x+i*5,0,GAR.z);v.g.rotation.y=PI/2;RIDES.push(v)})}spawnOwned();
// ================= pedestrians =================
const LINES=['Bhai, train phir late hai!','Aaj baarish hogi kya?','Cutting chai peeni hai yaar','Traffic ne jaan le li','Mumbai meri jaan!','Vada pav khaya kya?','Kal se gym pakka','Society meeting hai, bhaago!','Meter se chalega na?','Ganpati aane wale hain!','Signal hara hai, chalo','Bhaiya, Dadar kitna door?'];
const WB=BLOCKS.filter(b=>b.i>0);const bAt=(i,j)=>WB.find(b=>b.i===i&&b.j===j);
const corner=(b,c)=>[[b.x0+1.6,b.z0+1.6],[b.x1-1.6,b.z0+1.6],[b.x1-1.6,b.z1-1.6],[b.x0+1.6,b.z1-1.6]][c];
const XMAP={0:[[-1,0,1,'x'],[0,-1,3,'z']],1:[[1,0,0,'x'],[0,-1,2,'z']],2:[[1,0,3,'x'],[0,1,1,'z']],3:[[-1,0,2,'x'],[0,1,0,'z']]};
const PEDS=[];for(let k=0;k<38;k++){const b=WB[(k*7)%WB.length],look=randLook();const g=human(look);scene.add(g);const c=k%4,p=corner(b,c);g.position.set(p[0],.25,p[1]);PEDS.push({g,b,c,dir:R()<.5?1:-1,mode:'walk',tgt:null,sp:1.1+R()*.6,bub:null,bt:0,t:0,active:true})}
for(const p of PEDS){const n=corner(p.b,(p.c+p.dir+4)%4);p.tgt={x:n[0],z:n[1]};p.next=(p.c+p.dir+4)%4}
// a few sitting at tapri bench + waiting at station
for(const[x,z,ry]of[[-1,31.5,PI],[1,31.5,PI],[-140,10,PI/2],[-140,-14,PI/2],[-139.5,22,-PI/2]]){const g=human(randLook());g.position.set(x,z>30?.25:1.25,z);g.rotation.y=ry;scene.add(g);PEDS.push({g,mode:'idle',sit:z>30,active:true,static:true})}
// ================= roadside vendors =================
const VT={panipuri:{n:'Pani Puri',price:20,h:18,e:0,call:'Pani puri! Teekha-meetha!',col:'#e67e22'},bhutta:{n:'Garam Bhutta',price:15,h:15,e:0,call:'Garam bhutta, nimbu masala!',col:'#f1c40f'},fruit:{n:'Fruit Wala',price:30,h:22,e:5,call:'Taaze aam, kele, chikoo!',col:'#27ae60'},juice:{n:'Ganne ka Ras',price:25,h:8,e:25,call:'Thanda ganne ka ras!',col:'#16a085'},sandwich:{n:'Bombay Sandwich',price:40,h:35,e:0,call:'Grill sandwich, cheese extra!',col:'#c0392b'},flower:{n:'Phool Wali',price:10,h:0,e:8,call:'Gajra le lo, mogra!',col:'#e84393'},paper:{n:'Akhbaar Stall',price:5,h:0,e:3,call:'Aaj ki taaza khabar!',col:'#95a5a6'}};
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
function buyVendor(v){const t=VT[v.type];if(ST.money<t.price)return toast('Paisa kam hai bhai');ST.hunger=Math.min(100,ST.hunger+t.h);ST.energy=Math.min(100,ST.energy+t.e);pay(-t.price,t.n);vsay(v,['Shukriya, phir aana!','Ekdum mast hai na?','Aur kuch chahiye?'][Math.floor(R()*3)]);v.man.userData.wave=1.2;if(v.type==='paper')setTimeout(()=>toast('Khabar: '+['Local train 2 min late, yatri hairaan','Monsoon jaldi aayega, chhata taiyaar rakho','Vada pav ne burger ko phir haraya','Marine Drive par aaj sunset ekdum jhakaas'][Math.floor(R()*4)]),1500)}
// ================= full map overlay =================
let mapOn=false,MZ=1.15,MC={x:0,z:0},WP=null,mdrag=null;const mapc=$('mapc');
const gpsMarker=new T.Group();{const beam=new T.Mesh(new T.CylinderGeometry(1.6,1.6,60,20,1,true),new T.MeshBasicMaterial({color:0xa66bff,transparent:true,opacity:.25,side:T.DoubleSide,depthWrite:false,fog:false}));beam.position.y=30;gpsMarker.add(beam);const ring=new T.Mesh(new T.TorusGeometry(2,.12,8,40),new T.MeshBasicMaterial({color:0xa66bff}));ring.rotation.x=PI/2;ring.position.y=.35;gpsMarker.add(ring)}gpsMarker.visible=false;scene.add(gpsMarker);
function toggleMap(v){mapOn=v===undefined?!mapOn:v;$('mapov').hidden=!mapOn;if(mapOn){const h=here();MC={x:h.x,z:h.z};togglePhone(false);sizeMap()}}
function sizeMap(){const r=mapc.getBoundingClientRect();mapc.width=Math.max(1,r.width*devicePixelRatio);mapc.height=Math.max(1,r.height*devicePixelRatio)}addEventListener('resize',()=>{if(mapOn)sizeMap()});
const mapScale=()=>MZ*Math.min(mapc.width,mapc.height)/360;
function toWorld(cx,cy){const r=mapc.getBoundingClientRect(),s=mapScale();return{x:MC.x+((cx-r.left)*devicePixelRatio-mapc.width/2)/s,z:MC.z+((cy-r.top)*devicePixelRatio-mapc.height/2)/s}}
mapc.addEventListener('pointerdown',e=>{mdrag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY};mapc.setPointerCapture(e.pointerId)});
mapc.addEventListener('pointermove',e=>{if(!mdrag)return;const s=mapScale()/devicePixelRatio;MC.x-=(e.clientX-mdrag.x)/s;MC.z-=(e.clientY-mdrag.y)/s;mdrag.x=e.clientX;mdrag.y=e.clientY});
mapc.addEventListener('pointerup',e=>{if(mdrag&&Math.hypot(e.clientX-mdrag.sx,e.clientY-mdrag.sy)<6){const w=toWorld(e.clientX,e.clientY);if(w.x>WORLD.x0&&w.x<WORLD.x1&&w.z>WORLD.z0&&w.z<SEA+100){WP=w;gpsMarker.position.set(w.x,0,w.z);gpsMarker.visible=true;toast('GPS laga diya! Baingani roshni ki taraf chalo')}}mdrag=null});
mapc.addEventListener('wheel',e=>{e.preventDefault();MZ=Math.max(.28,Math.min(6,MZ*(e.deltaY<0?1.15:1/1.15)))},{passive:false});
$('mzi').onclick=()=>MZ=Math.min(6,MZ*1.3);$('mzo').onclick=()=>MZ=Math.max(.28,MZ/1.3);$('mcl').onclick=()=>toggleMap(false);$('mapBtn').onclick=()=>toggleMap(true);
$('mwp').onclick=()=>{WP=null;gpsMarker.visible=false;toast('GPS hata diya')};$('mme').onclick=()=>{const h=here();MC={x:h.x,z:h.z}};
$('leg').innerHTML=[['#ffd21f','Tum'],['#2ecc71','Kaam / manzil'],['#a66bff','GPS'],['#e74c3c','Gaadiyan'],['#ffffff','Jagah']].map(([c,n])=>`<span><i style="background:${c}"></i>${n}</span>`).join('')+Object.values(VT).map(v=>`<span><i style="background:${v.col}"></i>${v.n}</span>`).join('');
function drawBigMap(){const x=mapc.getContext('2d'),W=mapc.width,H=mapc.height,s=mapScale(),dp=devicePixelRatio;x.setTransform(1,0,0,1,0,0);x.fillStyle='#22252b';x.fillRect(0,0,W,H);
 x.save();x.translate(W/2,H/2);x.scale(s,s);x.translate(-MC.x,-MC.z);drawWorld(x,false);x.fillStyle='rgba(255,255,255,.1)';for(const v of TRAFFIC){x.fillStyle='#e74c3c';x.fillRect(v.veh.g.position.x-1.6,v.veh.g.position.z-1.6,3.2,3.2)}x.fillStyle='#eceae4';x.fillRect(-151.3,train.z-58,3.6,116);if(NETAPI&&NETAPI.positions){x.fillStyle='#37b6ff';for(const q of NETAPI.positions()){x.beginPath();x.arc(q.x,q.z,4,0,7);x.fill()}}x.restore();
 const S=(wx,wz)=>[W/2+(wx-MC.x)*s,H/2+(wz-MC.z)*s];x.textBaseline='middle';
 x.textAlign='center';x.font=`800 ${13*dp}px "Baloo 2",sans-serif`;for(const p of EXTRA_PLACES){const[a2,b2]=S(p.x,p.z);x.lineWidth=4*dp;x.strokeStyle='rgba(10,12,16,.85)';x.strokeText(p.n,a2,b2);x.fillStyle='#fffaf0';x.fillText(p.n,a2,b2)}x.textAlign='start';
 for(const v of VENDORS){const[a,b]=S(v.x,v.z);x.fillStyle=VT[v.type].col;x.strokeStyle='#141414';x.lineWidth=2*dp;x.beginPath();x.arc(a,b,(MZ>2?7:5)*dp,0,7);x.fill();x.stroke()}
 for(const r of RIDES){const[a,b]=S(r.g.position.x,r.g.position.z);x.fillStyle=r.own?'#19a7a0':'#ffd21f';x.fillRect(a-4*dp,b-4*dp,8*dp,8*dp)}
 x.font=`700 ${13*dp}px "Baloo 2",sans-serif`;for(const p of PLACES){const[a,b]=S(p.x,p.z);const tw=x.measureText(p.n).width+12*dp;x.fillStyle='rgba(20,20,20,.85)';x.fillRect(a-tw/2,b-11*dp,tw,22*dp);x.fillStyle='#fff';x.textAlign='center';x.fillText(p.n,a,b+1*dp)}
 if(MZ>2.2){x.font=`600 ${11*dp}px "Baloo 2",sans-serif`;for(const v of VENDORS){const[a,b]=S(v.x,v.z);x.fillStyle='#fff';x.textAlign='left';x.fillText(VT[v.type].n,a+9*dp,b)}}
 const pin=(wx,wz,c)=>{const[a,b]=S(wx,wz);x.fillStyle=c;x.strokeStyle='#141414';x.lineWidth=2*dp;x.beginPath();x.arc(a,b-14*dp,8*dp,PI,0);x.lineTo(a,b);x.closePath();x.fill();x.stroke()};
 if(marker.visible)pin(marker.position.x,marker.position.z,'#2ecc71');if(WP)pin(WP.x,WP.z,'#a66bff');
 const h=here(),[a,b]=S(h.x,h.z);x.save();x.translate(a,b);x.rotate(PI-(P.ride?P.ride.g.rotation.y:P.yaw));x.fillStyle='#ffd21f';x.strokeStyle='#141414';x.lineWidth=3*dp;x.beginPath();x.moveTo(0,-14*dp);x.lineTo(10*dp,11*dp);x.lineTo(-10*dp,11*dp);x.closePath();x.fill();x.stroke();x.restore()}
// ================= UI / audio =================
let tt=0;function toast(m){$('toast').textContent=m;$('toast').classList.add('on');clearTimeout(tt);tt=setTimeout(()=>$('toast').classList.remove('on'),2400)}
function hudMoney(){$('money').textContent='₹'+Math.floor(ST.money).toLocaleString('en-IN');$('lv').textContent='Lv. '+(1+Math.floor((ST.day-1)/2));$('avHair').setAttribute('d',ST.look.female?'M16 40c-3-17 4-28 16-28s19 11 16 28c-1-9-3-14-7-17-3 3-9 4-15 3-4 2-7 7-10 14z':'M17 31c-2-11 5-19 15-19 11 0 17 7 15 19-2-5-4-8-7-9 1 3 0 5-2 6-1-4-4-6-6-6-1 3-4 5-9 5 1-2 1-3 0-4-3 2-5 5-6 8z')}
function clockText(){const h=Math.floor(TIME*24),m=Math.floor((TIME*24-h)*60);const part=h<5?'raat':h<12?'subah':h<16?'dopahar':h<19?'shaam':'raat';return`Din ${ST.day} · ${(h%12)||12}:${String(m).padStart(2,'0')} ${part}`}
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
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();K[k]=true;if(!started)return;if(k==='e')act();if(k==='x')toggleSit();if(k==='t'||k==='enter'){e.preventDefault();openChat()}if(k==='g'&&!P.ride){me.userData.wave=1.6;if(NETAPI)NETAPI.emote('wave')}if(k==='p')togglePhone();if(k==='h')horn();if(k==='c')setPhoto(!photo);if(k==='m')toggleMap();if(k==='escape'&&mapOn)toggleMap(false);if(['1','2','3'].includes(k)&&JOB&&JOB.type==='chai')serve(+k-1);if(k===' ')e.preventDefault()});
addEventListener('keyup',e=>{K[e.key.toLowerCase()]=false});
// seats the player can use (X): the chai tapri bench, between the two regulars
const SEATS=[{x:0,z:31.5,y:.25,ry:PI}],FOOT_CAM=4.8;let SIT=null;SEATS.push(...BENCHES);
const nearSeat=()=>SEATS.find(s=>Math.hypot(s.x-P.x,s.z-P.z)<3);
function standUp(){if(!SIT)return;const s=SIT;SIT=null;P.x=s.x+Math.sin(s.ry)*.95;P.z=s.z+Math.cos(s.ry)*.95;P.y=groundY(P.x,P.z)}
function toggleSit(){if(P.ride)return;if(SIT){standUp();return}const s=nearSeat();if(!s)return toast('Baithne ke liye kisi bench ke paas jao');SIT=s;toast('Baith gaye · X ya chalo to utho')}
let camYaw=PI/2+.35,camPitch=.28,camDist=FOOT_CAM,camP=.28,drag=null;
$('c').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,id:e.pointerId}});
addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;camYaw-=(e.clientX-drag.x)*.006;camPitch=Math.max(.02,Math.min(1.25,camPitch+(e.clientY-drag.y)*.004));drag.x=e.clientX;drag.y=e.clientY});
addEventListener('pointerup',e=>{if(drag&&drag.id===e.pointerId)drag=null});
$('c').addEventListener('wheel',e=>{camDist=Math.max(3,Math.min(25,camDist+e.deltaY*.01))},{passive:true});
const joy={x:0,y:0,id:null},jb=$('joy');
jb.addEventListener('pointerdown',e=>{joy.id=e.pointerId;jb.setPointerCapture(e.pointerId);mj(e);e.stopPropagation()});jb.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)mj(e)});jb.addEventListener('pointerup',()=>{joy.id=null;joy.x=joy.y=0;$('knob').style.transform=''});
function mj(e){const r=jb.getBoundingClientRect();let dx=e.clientX-r.left-65,dy=e.clientY-r.top-65;const l=Math.hypot(dx,dy);if(l>50){dx*=50/l;dy*=50/l}joy.x=dx/50;joy.y=dy/50;$('knob').style.transform=`translate(${dx}px,${dy}px)`}
let runT=false;$('tE').onclick=()=>act();$('tJ').onpointerdown=()=>{K[' ']=true;setTimeout(()=>K[' ']=false,150)};$('tR').onclick=()=>{runT=!runT;$('tR').textContent=runT?'Walk':'Run'};$('tH').onclick=()=>horn();
function setPhoto(v){photo=v;document.body.classList.toggle('photo',v);if(v)togglePhone(false)}
// ================= marker =================
const marker=new T.Group();{const beam=new T.Mesh(new T.CylinderGeometry(2,2,40,24,1,true),new T.MeshBasicMaterial({color:0xffd21f,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false,fog:false}));beam.position.y=20;marker.add(beam);const ring=new T.Mesh(new T.TorusGeometry(2.4,.12,8,40),new T.MeshBasicMaterial({color:0xffd21f}));ring.rotation.x=PI/2;ring.position.y=.35;marker.add(ring)}scene.add(marker);marker.visible=false;
function setMarker(x,z,c){marker.visible=true;marker.position.set(x,0,z);marker.children.forEach(m=>m.material.color.set(c))}
// ================= jobs =================
const PLACES=[{n:'Nagri Junction',x:-124,z:20},{n:'Raju ki Tapri',x:0,z:34},{n:'Market',x:84,z:34},{n:'Marine Drive',x:20,z:160},{n:'Tumhara Ghar',x:FLAT.x,z:115},{n:'Hospital',x:80,z:-46},{n:'College',x:-80,z:-112},{n:'Mall',x:80,z:126},{n:'Maidan',x:-34,z:0}];
const JOBS={auto:{name:'Auto / Taxi driver',desc:'Sawaari uthao, manzil tak chhodo. Doori ke hisaab se kiraaya.'},delivery:{name:'Food delivery',desc:'Vada Pav Center se order uthao, 90 second mein pahunchao.'},chai:{name:'Chaiwala',desc:'Raju ki tapri sambhalo. Order dekho, sahi cheez do (1/2/3).'},police:{name:'Traffic police',desc:'Signal todne wali laal car ka peecha karo aur paas jaake pakdo.'}};
let JOB=null;
function sidewalkSpot(minD){for(let k=0;k<60;k++){const b=WB[Math.floor(R()*WB.length)],s=Math.floor(R()*4),t=.1+R()*.8;const x=s===1?b.x1-1.4:s===3?b.x0+1.4:b.x0+(b.x1-b.x0)*t,z=s===0?b.z0+1.4:s===2?b.z1-1.4:b.z0+(b.z1-b.z0)*t;if(z<SEA-3&&!blocked(x,z,.6)&&Math.hypot(x-P.x,z-P.z)>minD)return{x,z}}return{x:0,z:34}}
function startJob(k){endJob(true);JOB={type:k,stage:0};if(k==='auto')nextRide();if(k==='delivery')JOB.stage=0;if(k==='police')newSpeeder();toast(JOBS[k].name+' shuru!');togglePhone(false)}
function endJob(silent){if(JOB){if(JOB.pass&&JOB.pass.parent)JOB.pass.parent.remove(JOB.pass);if(JOB.cust)scene.remove(JOB.cust.g);if(JOB.sp){JOB.sp.speeder=false;JOB.sp.v=12}}JOB=null;marker.visible=false;$('chai').style.display='none';if(!silent)toast('Kaam khatam. Aaram karo!');renderApp()}
function nextRide(){const s=sidewalkSpot(50);const g=human(randLook());g.position.set(s.x,.25,s.z);scene.add(g);if(JOB.pass&&JOB.pass.parent)JOB.pass.parent.remove(JOB.pass);JOB.pass=g;JOB.stage=0;JOB.from=s;setMarker(s.x,s.z,0x2ecc71)}
function newSpeeder(){const cands=TRAFFIC.filter(t=>t.type==='car');const t=cands[Math.floor(R()*cands.length)];t.speeder=true;t.v=19;JOB.sp=t;JOB.catch=0;toast('Laal batti todne wali gaadi! Peecha karo')}
const ORDERS=['Cutting chai','Masala chai','Vada pav'];
function serve(o){if(!JOB||JOB.type!=='chai'||!JOB.cust||!JOB.cust.arrived)return;const c=JOB.cust;if(o===c.order){const tip=c.wait<6?10:0;pay(20+tip,ORDERS[o]+(tip?' + tip':''));ding()}else toast('Arey bhai, maine '+ORDERS[c.order]+' bola tha!');scene.remove(c.g);JOB.cust=null;JOB.next=1.5}
function here(){return P.ride?P.ride.g.position:{x:P.x,z:P.z}}
function updateJob(dt){if(!JOB){$('obj').innerHTML='';return}let o='';const h=here();
 if(JOB.type==='auto'){const cab=P.ride&&(P.ride.type==='auto'||P.ride.type==='taxi');
  if(!cab)o='<b>Auto driver:</b> pehle kisi auto ya taxi mein baitho (E)';
  else if(JOB.stage===0){o='<b>Sawaari</b> hari roshni par khadi hai. Paas jaake ruko.';JOB.pass.lookAt(h.x,.25,h.z);animH(JOB.pass,0,dt);if(Math.hypot(h.x-JOB.from.x,h.z-JOB.from.z)<7&&Math.abs(P.ride.speed)<2.5){JOB.stage=1;scene.remove(JOB.pass);P.ride.g.add(JOB.pass);JOB.pass.position.set(0,.35,-.55);JOB.pass.rotation.set(0,0,0);animH(JOB.pass,0,0,'sit');let d;do{d=PLACES[Math.floor(R()*PLACES.length)]}while(Math.hypot(d.x-h.x,d.z-h.z)<70);JOB.dest=d;JOB.dist=Math.hypot(d.x-h.x,d.z-h.z);setMarker(d.x,d.z,0xffd21f);toast('"Bhaiya, '+d.n+' chalo!"')}}
  else{o=`<b>Sawaari:</b> ${JOB.dest.n} tak chhodo`;if(Math.hypot(h.x-JOB.dest.x,h.z-JOB.dest.z)<9&&Math.abs(P.ride.speed)<2.5){P.ride.g.remove(JOB.pass);JOB.pass=null;pay(Math.round(30+JOB.dist*.6),'Kiraaya: '+JOB.dest.n);ding();nextRide()}}}
 if(JOB.type==='delivery'){if(JOB.stage===0){o='<b>Delivery:</b> Vada Pav Center se order uthao';setMarker(VADA.x,VADA.z+3,0xe67e22);if(Math.hypot(h.x-VADA.x,h.z-VADA.z-3)<6){JOB.stage=1;JOB.time=0;const lot=LOTS[Math.floor(R()*LOTS.length)];JOB.dest={x:lot.x,z:lot.z+lot.front*(lot.d/2+2.2)};setMarker(JOB.dest.x,JOB.dest.z,0xe67e22);toast('Order mila! 90 second mein pahunchao')}}
  else{JOB.time+=dt;const left=Math.max(0,90-JOB.time);o=`<b>Delivery:</b> garam vada pav pahunchao · ${Math.ceil(left)}s`;if(Math.hypot(h.x-JOB.dest.x,h.z-JOB.dest.z)<6){pay(left>0?Math.round(40+left*.6):20,left>0?'Delivery + tip':'Late delivery');ding();JOB.stage=0}}}
 if(JOB.type==='police'){const sp=JOB.sp;if(!sp){JOB.wait=(JOB.wait||0)-dt;o='<b>Traffic police:</b> agle case ka intezaar…';if(JOB.wait<=0)newSpeeder()}else{const p=sp.veh.g.position;setMarker(p.x,p.z,0xff3b30);const d=Math.hypot(p.x-h.x,p.z-h.z);if(d<10)JOB.catch+=dt;else JOB.catch=Math.max(0,JOB.catch-dt*.5);o=`<b>Traffic police:</b> laal gaadi ke paas raho · ${Math.round(Math.min(100,JOB.catch/2.5*100))}% pakda`;if(JOB.catch>=2.5){pay(150,'Challan vasool');ding();sp.speeder=false;sp.v=12;JOB.sp=null;JOB.wait=6}}}
 if(JOB.type==='chai'){const near=!P.ride&&Math.hypot(P.x-TAPRI.x,P.z-23.5)<3.5;
  if(JOB.stage===0){o='<b>Chaiwala:</b> Raju ki tapri ke counter ke peeche jao';setMarker(0,23.5,0x19a7a0);if(near){JOB.stage=1;marker.visible=false;JOB.next=1;toast('Dukaan khul gayi!')}}
  else if(!near){o='<b>Chaiwala:</b> wapas counter par aao';$('chai').style.display='none'}
  else if(!JOB.cust){JOB.next-=dt;o='<b>Chaiwala:</b> agle grahak ka intezaar…';$('chai').style.display='none';if(JOB.next<=0){const g=human(randLook());g.position.set(16,.25,36);scene.add(g);JOB.cust={g,order:Math.floor(R()*3),arrived:false,wait:0}}}
  else{const c=JOB.cust,dx=0-c.g.position.x,dz=29.6-c.g.position.z,l=Math.hypot(dx,dz);if(l>.3){c.g.position.x+=dx/l*1.6*dt;c.g.position.z+=dz/l*1.6*dt;c.g.rotation.y=Math.atan2(dx,dz);animH(c.g,1.6,dt);o='<b>Chaiwala:</b> grahak aa raha hai…'}else{c.arrived=true;c.wait+=dt;c.g.rotation.y=PI;animH(c.g,0,dt);o=`<b>Grahak:</b> "Ek <b>${ORDERS[c.order]}</b> dena!" (dabao ${c.order+1})`;$('chai').style.display='flex'}}}
 $('obj').innerHTML=o}
// ================= interactions =================
function nearRide(){const r=RIDES.find(v=>Math.hypot(v.g.position.x-P.x,v.g.position.z-P.z)<(v.type==='scooter'?2.5:3.6));if(r)return r;
 const t=TRAFFIC.find(t=>Math.hypot(t.veh.g.position.x-P.x,t.veh.g.position.z-P.z)<(t.type==='bus'?6.5:4));if(t){t.veh._traffic=t;return t.veh}return null}
function takeRide(r){if(r._traffic){const i=TRAFFIC.indexOf(r._traffic);if(i>=0)TRAFFIC.splice(i,1);delete r._traffic;r.speed=0;RIDES.push(r)}}
function act(){if(ONTRAIN){if(train.wait>0){ONTRAIN=null;P.x=-140;P.z=Math.max(-44,Math.min(44,P.z));P.y=1.25;P.vy=0;camDist=FOOT_CAM;toast('Station par utar gaye')}else toast('Metro chal rahi hai — station par utarna');return}
 if(nearMetro()){ONTRAIN=METRO.seat;SIT=null;camDist=3.4;toast('Metro mein baith gaye! Station aane par E dabake utro');return}
const h=here();
 if(P.ride){const g=P.ride.g;if(Math.abs(P.ride.speed)>3){toast('Pehle gaadi roko!');return}const side=new T.Vector3(-2.2,0,0).applyAxisAngle(new T.Vector3(0,1,0),g.rotation.y);let nx=g.position.x+side.x,nz=g.position.z+side.z;if(blocked(nx,nz,.5)){nx=g.position.x-side.x;nz=g.position.z-side.z}P.x=nx;P.z=nz;P.ride.speed=0;P.ride=null;me.visible=true;camDist=FOOT_CAM;return}
 const r=nearRide();if(r){takeRide(r);P.ride=r;me.visible=false;camDist=r.type==='bus'?16:r.type==='scooter'?6:9;toast({auto:'Auto chalu!',taxi:'Kaali-peeli chalu!',scooter:'Scooter chalu!',car:'Gaadi chalu!'}[r.type]||'Chalo!');return}
 const vd=nearVendor();if(vd){buyVendor(vd);return}
 if(Math.hypot(P.x-FLAT.x,P.z-FLAT.z)<3){sleep();return}
 if(Math.hypot(P.x-VADA.x,P.z-VADA.z-1.6)<3){if(ST.money<15)return toast('Paisa kam hai');ST.hunger=Math.min(100,ST.hunger+35);pay(-15,'Vada pav');return}
 if(Math.hypot(P.x-TAPRI.x,P.z-29.5)<2.6&&!(JOB&&JOB.type==='chai')){if(ST.money<10)return toast('Paisa kam hai');ST.hunger=Math.min(100,ST.hunger+10);ST.energy=Math.min(100,ST.energy+20);pay(-10,'Cutting chai');return}
 const p=PEDS.find(q=>q.active&&q.mode!=='fall'&&q.g.position.distanceTo(me.position)<3);if(p){say(p,LINES[Math.floor(R()*LINES.length)]);if(!p.static){p.mode='talk';p.t=3.5}}}
function say(p,t){if(p.bub)p.g.remove(p.bub);const s=bubble(t);s.position.y=2.25;p.g.add(s);p.bub=s;p.bt=3.5}
function sleep(){$('fade').textContent='Zzz… subah ho gayi';$('fade').classList.add('on');setTimeout(()=>{if(TIME>7/24)ST.day++;TIME=7/24;ST.energy=100;ST.hunger=Math.max(0,ST.hunger-20);save();$('fade').classList.remove('on')},1300)}
function hintText(){if(ONTRAIN)return train.wait>0?'E: metro se utro':'Metro chal rahi hai… agle stop ka intezaar';if(nearMetro())return'E: metro mein baitho';if(SIT)return'X: utho';if(!P.ride&&nearSeat())return'X: bench par baitho';if(P.ride)return Math.abs(P.ride.speed)<3?'E: utro · H: horn':'';const r=nearRide();if(r)return'E: '+({auto:'auto',taxi:'taxi',scooter:'scooter',car:'apni car',bus:'bus'}[r.type])+' chalao';{const vd=nearVendor();if(vd)return'E: '+VT[vd.type].n+' (₹'+VT[vd.type].price+')'}if(Math.hypot(P.x-FLAT.x,P.z-FLAT.z)<3)return'E: so jao (subah tak)';if(Math.hypot(P.x-VADA.x,P.z-VADA.z-1.6)<3)return'E: vada pav khao (₹15)';if(Math.hypot(P.x-TAPRI.x,P.z-29.5)<2.6&&!(JOB&&JOB.type==='chai'))return'E: cutting chai (₹10)';if(PEDS.some(q=>q.active&&q.g.position.distanceTo(me.position)<3))return'E: baat karo';return''}
// ================= phone =================
let APP='jobs';const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function togglePhone(v){phoneOn=v===undefined?!phoneOn:v;$('phone').classList.toggle('on',phoneOn);if(phoneOn)renderApp()}
$('phoneBtn').onclick=()=>togglePhone();$('closePhone').onclick=()=>togglePhone(false);
document.querySelector('.tabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;APP=b.dataset.a;document.querySelectorAll('.tabs button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderApp()};
let WEATHER=store.get('mn2_w')||'auto';
function renderApp(){if(!phoneOn)return;const a=$('app');
 if(APP==='jobs')a.innerHTML=(JOB?`<div class="job"><h3>Abhi: ${JOBS[JOB.type].name}</h3><button class="ghost" data-end>Kaam chhodo</button></div>`:'')+Object.entries(JOBS).map(([k,j])=>`<div class="job"><h3>${j.name}</h3><p>${j.desc}</p><button data-job="${k}">${JOB&&JOB.type===k?'Chal raha hai':'Shuru karo'}</button></div>`).join('');
 if(APP==='map'){a.innerHTML='<canvas id="bigmap" width="600" height="600"></canvas><p style="font-size:14px;margin:8px 0">Peela = tum · hara = kaam/manzil</p><button data-home>Ghar teleport (₹20)</button> <button data-bigmap>Bada map (M)</button>';drawMap($('bigmap'),true)}
 if(APP==='upi')a.innerHTML=`<div class="job"><h3>${esc(ST.name)} · ₹${Math.floor(ST.money).toLocaleString('en-IN')}</h3><p>Nagri UPI · sab lena-dena yahan</p></div>`+(ST.tx.length?ST.tx.map(t=>`<div class="tx"><span>${esc(t.why)} <small style="opacity:.6">${esc(t.t)}</small></span><span style="color:${t.n>=0?'#2ecc71':'#ff6b6b'}">${t.n>=0?'+':'-'}₹${Math.abs(t.n)}</span></div>`).join(''):'<p>Abhi koi transaction nahi. Kaam karo!</p>');
 if(APP==='shop')a.innerHTML=[['scooter','Scooter',1500,'Tez aur sasta. Ghar ke bahar milega.'],['car','Hatchback car',6000,'AC wali apni gaadi.']].map(([k,n,c,d])=>`<div class="job"><h3>${n} · ₹${c.toLocaleString('en-IN')}</h3><p>${d}</p>${ST.owned.includes(k)?'<button class="ghost" disabled>Tumhari hai</button>':`<button data-buy="${k}" data-c="${c}">Kharido</button>`}</div>`).join('')+`<div class="job"><h3>Naye kapde · ₹200</h3><p>Rang badlo, naya look.</p><button data-cloth>Badlo</button></div>`;
 if(APP==='set')a.innerHTML=`<div class="job"><h3>Graphics</h3><div class="seg">${['low','med','high'].map(q=>`<button data-q="${q}" aria-pressed="${Q===q}">${{low:'Low',med:'Medium',high:'High'}[q]}</button>`).join('')}</div>
  <h3>Mausam</h3><div class="seg">${[['auto','Auto'],['clear','Saaf'],['rain','Baarish']].map(([k,n])=>`<button data-w="${k}" aria-pressed="${WEATHER===k}">${n}</button>`).join('')}</div>
  <h3>Awaaz</h3><div class="seg"><button data-mute aria-pressed="${!muted}">${muted?'Off':'On'}</button></div>
  <h3>Photo mode</h3><div class="seg"><button data-photo>Kholo (C)</button></div></div>
  <div class="job"><h3>Help</h3><p>WASD chalo, Shift daudo, Space jump, mouse drag camera. Gaadi ke paas E. Ghar ke darwaze par E = so jao. Vada pav / chai se bhook mitao. Energy kam ho to daud nahi paoge.</p></div>
  <div class="job"><button class="ghost" data-reset>Naya game (sab reset)</button></div>`}
$('app').onclick=e=>{const t=e.target.closest('button');if(!t)return;const d=t.dataset;
 if(d.job)startJob(d.job);if('end' in d)endJob();if('home' in d){if(ST.money<20)return toast('Paisa kam hai');if(P.ride){P.ride.speed=0;P.ride=null;me.visible=true}pay(-20,'Ghar teleport');P.x=FLAT.x;P.z=FLAT.z+1.5;togglePhone(false)}
 if(d.buy){const c=+d.c;if(ST.money<c)return toast('Paisa kam hai bhai');ST.owned.push(d.buy);pay(-c,d.buy==='car'?'Car kharidi':'Scooter kharida');spawnOwned();renderApp();toast('Ghar ke bahar khadi hai!')}
 if('cloth' in d){if(ST.money<200)return toast('Paisa kam hai');if(outfitList().length>1){ST.look.outfit=((ST.look.outfit|0)+1)%outfitList().length;applyOutfit();outfitSw();pay(-200,'Naye kapde');return}ST.look.top=TOPS[Math.floor(R()*TOPS.length)];ST.look.bottom=BOTS[Math.floor(R()*BOTS.length)];rebuildMe();pay(-200,'Naye kapde')}
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
 x.fillStyle='#e74c3c';for(const t of TRAFFIC)x.fillRect(t.veh.g.position.x-1.5,t.veh.g.position.z-1.5,3,3);if(NETAPI&&NETAPI.positions){x.fillStyle='#37b6ff';x.strokeStyle='#fff';x.lineWidth=.8;for(const q of NETAPI.positions()){x.beginPath();x.arc(q.x,q.z,3.2,0,7);x.fill();x.stroke()}}if(marker.visible){x.fillStyle='#2ecc71';x.beginPath();x.arc(marker.position.x,marker.position.z,4,0,7);x.fill()}x.restore();
 x.save();x.translate(150,150);x.rotate(PI-(P.ride?P.ride.g.rotation.y:P.yaw)+camYaw);x.fillStyle='#ffd21f';x.strokeStyle='#141414';x.lineWidth=3;x.beginPath();x.moveTo(0,-12);x.lineTo(9,10);x.lineTo(-9,10);x.closePath();x.fill();x.stroke();x.restore()}
// ================= rain =================
const RN=3500,rainGeo=new T.BufferGeometry(),rainPos=new Float32Array(RN*6);for(let i=0;i<RN;i++){const x=(R()-.5)*80,y=R()*40,z=(R()-.5)*80;rainPos.set([x,y,z,x+.05,y-.7,z],i*6)}rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));
const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:0xaabbcc,transparent:true,opacity:.0,fog:false,depthWrite:false}));rain.frustumCulled=false;scene.add(rain);
let wet=0,rainAmt=0,rainTarget=0,weatherT=0;
// ================= character creator =================
let creating=true;const CLOSE=new URLSearchParams(location.search).get('closeup'),CYAW=new URLSearchParams(location.search).get('yaw'),CWALK=+new URLSearchParams(location.search).get('walk')||0,CPHONE=new URLSearchParams(location.search).has('phone');if(CLOSE)document.getElementById('start').style.display='none';const SKINSW=SKINS,TOPSW=TOPS.slice(0,8),BOTSW=BOTS;
function swatches(id,list,key){$(id).innerHTML=list.map((c,i)=>`<button aria-label="rang ${i+1}" data-i="${i}" style="background:#${c.toString(16).padStart(6,'0')}" aria-pressed="${ST.look[key]===c}"></button>`).join('');$(id).onclick=e=>{const b=e.target.closest('button');if(!b)return;ST.look[key]=list[+b.dataset.i];rebuildMe();swatches(id,list,key)}}
function genderSw(){$('sG').innerHTML=['Ladka','Ladki'].map((n,i)=>`<button style="width:auto;padding:0 14px;border-radius:12px;background:#2a2a2a;color:#fff" data-i="${i}" aria-pressed="${!!ST.look.female===!!i}">${n}</button>`).join('');$('sG').onclick=e=>{const b=e.target.closest('button');if(!b)return;ST.look.female=b.dataset.i==='1';ST.look.kurti=ST.look.female;ST.look.outfit=0;rebuildMe();genderSw();outfitSw();applyOutfit()}}
// ---- multiplayer (Supabase Realtime, see net.js / net-config.js)
let NETAPI=null;
function lookPayload(){const l=ST.look;return{female:!!l.female,skin:l.skin,top:l.top,bottom:l.bottom,outfit:l.outfit|0}}
function chatLine(n,t,mine){const d=document.createElement('div');if(mine)d.className='me';const b=document.createElement('b');b.textContent=n+': ';d.append(b,document.createTextNode(t));const L=$('chatLog');L.append(d);while(L.children.length>7)L.firstChild.remove();setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),900)},14000);if(mine){if(me.userData._bub)me.remove(me.userData._bub);const s=bubble(t.slice(0,60));s.position.y=2.75;me.add(s);me.userData._bub=s;setTimeout(()=>{if(me.userData._bub===s){me.remove(s);me.userData._bub=null}},5000)}}
function startMultiplayer(){if(NETAPI)return;NETAPI=startNet({scene,animH,bubble,vehicle:t=>vehicle(t),makeAvatar:l=>{const o=Object.assign({skin:0xc68642,top:0x2b2b2b,bottom:0x1b1b1b},l);return o.female?human(o):hero(o)},
 local:()=>({x:P.x,y:P.y,z:P.z,yaw:P.ride?P.ride.g.rotation.y:P.yaw,speed:P.ride?Math.abs(P.ride.speed):(me.userData.spd||0),state:SIT?'sit':ONTRAIN?'metro':P.ride?'ride:'+P.ride.type:'',name:ST.name,look:lookPayload()}),
 onChat:chatLine,onStatus:t=>{$('online').textContent=(t.startsWith('Online')?'🟢 ':'⚪ ')+t}})}
function openChat(){const i=$('chatIn');i.hidden=false;i.focus()}
$('chatBtn').onclick=openChat;
$('chatIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){if(NETAPI)NETAPI.chat(e.target.value);else chatLine(ST.name,e.target.value,true);e.target.value='';e.target.hidden=true;e.target.blur()}if(e.key==='Escape'){e.target.value='';e.target.hidden=true;e.target.blur()}});
// ---- VRoid characters: models/characters.json lists outfits per gender (each outfit = one .vrm export)
const VQ=new URLSearchParams(location.search).get('vrm');
function outfitList(){return(CHARS&&CHARS[ST.look.female?'female':'male'])||[]}
function vrmUrl(f){return /^(https?:)?\/\//.test(f)?f:'models/'+f}
const VC_ROWS=[['hair','Baal (hair)',[0x1a1a1a,0x3b2314,0x8a5a2b,0xc9a26b,0x7a1f2b,0x2d3e8f,0xd77fa1]],['top','Top',[0xf2f2f2,0xe84393,0x2c5fa8,0xf2c94c,0x1e7b4a,0xc0392b,0x2b2b2b,0x8fb8c9]],['bottom','Shorts / pant',[0x1b1b1b,0x22324a,0x4a6fa5,0xd9c7a8,0x7b2d8b,0xc0392b,0xf2f2f2]],['shoes','Joote (shoes)',[0xf2f2f2,0x1b1b1b,0xc0392b,0x2c5fa8,0xf2c94c]],['skin','Skin tone',[0xf4ddc8,0xe2b897,0xc99470,0xa87250,0x8a5a3c]],['eyes','Aankhen (eyes)',[0x3b2314,0x1a1a1a,0x2d6a8f,0x2e7d32,0x8a5a2b]]];
function curFile(){const L=outfitList();return L.length?L[Math.min(ST.look.outfit|0,L.length-1)].file:''}
function vcGet(){ST.look.vc=ST.look.vc||{};return ST.look.vc[curFile()]||(ST.look.vc[curFile()]={})}
function applyColors(){if(!PV)return;const c=vcGet();for(const[k]of VC_ROWS)recolor(PV,k,c[k]??null)}
function colorRows(){const el=$('vcRows');if(!PV||!outfitList().length){el.style.display='none';el.innerHTML='';return}const have=vrmSlots(PV),c=vcGet();el.style.display='';
 el.innerHTML=VC_ROWS.filter(([k])=>have.includes(k)).map(([k,n,list])=>`<label>${n}</label><div class="sw" data-slot="${k}"><button aria-label="asli rang" data-c="" aria-pressed="${c[k]==null}" style="background:#2a2a2a;color:#fff;font-size:13px">↺</button>${list.map(v=>`<button aria-label="rang" data-c="${v}" aria-pressed="${c[k]===v}" style="background:#${v.toString(16).padStart(6,'0')}"></button>`).join('')}</div>`).join('');
 el.onclick=e=>{const b=e.target.closest('button'),row=e.target.closest('[data-slot]');if(!b||!row)return;const k=row.dataset.slot,v=b.dataset.c===''?null:+b.dataset.c;const cc=vcGet();if(v==null)delete cc[k];else cc[k]=v;recolor(PV,k,v);save();colorRows()}}
let CHAR_WAIT=true; // until we know whether a VRoid character is coming, keep the old model + rows hidden
function setCreatorMode(){const v=CHAR_WAIT||outfitList().length>0;for(const id of['sS','sT','sB']){$(id).style.display=v?'none':'';$(id).previousElementSibling.style.display=v?'none':''}$('lO').style.display=$('sO').style.display=v?'':'none'}
function outfitSw(){const L=outfitList();setCreatorMode();if(!L.length)return;$('sO').innerHTML=L.map((o,i)=>`<button style="width:auto;padding:0 14px;border-radius:12px;background:#2a2a2a;color:#fff" data-i="${i}" aria-pressed="${(ST.look.outfit|0)===i}">${o.name}</button>`).join('');$('sO').onclick=e=>{const b=e.target.closest('button');if(!b)return;ST.look.outfit=+b.dataset.i;outfitSw();applyOutfit()}}
function charReady(){CHAR_WAIT=false;$('lO').textContent='Kapde (outfit)';if(!P.ride)me.visible=true;setCreatorMode()}
async function applyOutfit(){const L=outfitList(),tok=++outTok;if(!L.length){if(PV){PV=null;rebuildMe()}charReady();colorRows();return}
 const o=L[Math.min(ST.look.outfit|0,L.length-1)];let v;
 if(creating){me.visible=false;CHAR_WAIT=true;setCreatorMode();$('lO').textContent='Kapde (load ho raha hai…)';$('vcRows').style.display='none'}else toast('Character load ho raha hai…');
 try{v=await loadVRM(vrmUrl(o.file))}catch(e){console.warn('VRM load failed',e);if(tok===outTok){PV=null;rebuildMe();charReady();colorRows();toast('Character file load nahi hui')}return}
 if(tok!==outTok)return;PV=v;rebuildMe();charReady();applyColors();colorRows();if(!creating)toast(o.name+' pehen liya!')}
async function initChars(){me.visible=false;setCreatorMode();try{if(VQ)CHARS={male:[{name:'Test',file:VQ}],female:[{name:'Test',file:VQ}]};else{const r=await fetch('models/characters.json',{cache:'no-cache'});if(!r.ok){charReady();return}CHARS=await r.json()}outfitSw();await applyOutfit()}catch(e){console.warn('characters.json',e);charReady()}}
function rebuildMe(){const v=me.visible,pos=me.position.clone(),ry=me.rotation.y;scene.remove(me);me=makeMe();me.position.copy(pos);me.rotation.y=ry;me.visible=v;scene.add(me);save()}
genderSw();swatches('sS',SKINSW,'skin');swatches('sT',TOPSW,'top');swatches('sB',BOTSW,'bottom');$('nm').value=ST.name;
$('go').onclick=()=>{ST.name=($('nm').value||'Satish').trim().slice(0,16);setTimeout(startMultiplayer,500);creating=false;started=true;document.body.classList.remove('creating');$('start').style.display='none';audioInit();save();toast('Welcome '+ST.name+'! Phone (P) se kaam chuno')};
// ================= quality =================
function applyQ(){const q=QS[Q];renderer.setPixelRatio(q.pr);renderer.shadowMap.enabled=q.shadow;sun.castShadow=q.shadow;sun.shadow.mapSize.set(q.smap,q.smap);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}bloom.enabled=q.bloom;gtao.enabled=Q==='high';resize();
 PEDS.forEach((p,i)=>{p.active=p.static||i<q.npc;p.g.visible=p.active});scene.traverse(o=>{if(o.material)[].concat(o.material).forEach(m=>m.needsUpdate=true)})}
applyQ();
// ================= main loop =================
const clock=new T.Clock();let hintT=0,lightT=0,el=0;const tgtV=new T.Vector3(),camPos=new T.Vector3(),sunDir=new T.Vector3();
function sigState(){const c=el%28;return{x:c<12?'g':c<14?'y':'r',z:c>=14&&c<26?'g':c>=26?'y':'r'}}
// dynamic resolution: keep weak GPUs (Intel UHD) near 30+ fps by scaling the render size
let DRS=1,drsT=0,drsN=0;
function drsTick(dt){drsT+=dt;drsN++;if(drsT<2)return;const fps=drsN/drsT;drsT=0;drsN=0;const old=DRS;if(fps<24)DRS=Math.max(.8,DRS-.1);else if(fps>45)DRS=Math.min(1,DRS+.05);if(DRS!==old){const pr=QS[Q].pr*DRS;renderer.setPixelRatio(pr);if(composer.setPixelRatio)composer.setPixelRatio(pr);resize()}}
function step(){const dt=Math.min(.05,clock.getDelta());el+=dt;if(!document.hidden)drsTick(clock.elapsedTime>0?dt:0);
 const sig=sigState();
 // ---- player
 me.userData.forcePhone=phoneOn||(creating&&CPHONE);
 const act2=started&&!phoneOn&&!creating&&!photo&&!mapOn;
 const fwd=act2?(K.w||K.arrowup?1:0)-(K.s||K.arrowdown?1:0)-joy.y:0,side=act2?(K.d||K.arrowright?1:0)-(K.a||K.arrowleft?1:0)+joy.x:0;
 if(SIT&&(Math.abs(fwd)>.1||Math.abs(side)>.1||P.ride))standUp();
 if(ONTRAIN){const s=ONTRAIN;P.x=TRAIN.position.x+s.x;P.z=TRAIN.position.z+s.z;P.y=s.y-.53;P.vy=0;P.yaw=s.ry;me.position.set(P.x,P.y,P.z);me.rotation.y=P.yaw;animH(me,0,dt,'sit')}
 else if(SIT){P.x=SIT.x;P.z=SIT.z;P.y=SIT.y;P.vy=0;P.yaw=SIT.ry;me.position.set(P.x,P.y,P.z);me.rotation.y=P.yaw;animH(me,0,dt,'sit');ST.energy=Math.min(100,ST.energy+dt*.3)}
 else if(!P.ride){const tired=ST.energy<8,hungry=ST.hunger<10,run=(K.shift||runT),sp=(run?(tired?7.5:12):3.4)*(hungry?.7:1);let mx=0,mz=0;const len=Math.hypot(fwd,side);
  if(len>.1){const fx=-Math.sin(camYaw),fz=-Math.cos(camYaw),rx=Math.cos(camYaw),rz=-Math.sin(camYaw);mx=(fx*fwd+rx*side)/Math.max(1,len);mz=(fz*fwd+rz*side)/Math.max(1,len);const ty=Math.atan2(mx,mz);let d=((ty-P.yaw+PI*3)%(PI*2))-PI;P.yaw+=d*Math.min(1,dt*12)}
  const nx=P.x+mx*sp*dt,nz=P.z+mz*sp*dt,stuck=blocked(P.x,P.z,.35);if(stuck||!blocked(nx,P.z,.35))P.x=nx;if(stuck||!blocked(P.x,nz,.35))P.z=nz;
  if(Math.abs(P.x+149.5)<2.5&&Math.abs(P.z-train.z)<62)P.x=-146;
  const gy=groundY(P.x,P.z);if(K[' ']&&P.y<=gy+.01&&act2)P.vy=4.6;P.vy-=14*dt;P.y=Math.max(gy,P.y+P.vy*dt);if(P.y>gy+1.5&&P.vy<0&&gy>P.y)P.y=gy;
  me.position.set(P.x,P.y,P.z);me.rotation.y=P.yaw;animH(me,len>.1?sp*Math.min(1,len):0,dt);
  ST.energy=len>.1&&run?Math.max(0,ST.energy-dt*.35):Math.min(100,ST.energy+dt*(len>.1?.12:.35))}
 else{const v=P.ride,g=v.g,max={auto:16,taxi:24,car:28,scooter:20,bus:15}[v.type]||22,acc={auto:7,taxi:9,car:11,scooter:9,bus:4}[v.type]||9;
  if(fwd>0)v.speed+=acc*fwd*dt*(1-v.speed/max);else if(fwd<0)v.speed+=(v.speed>0?-22:-5)*-fwd*dt;else v.speed*=1-.8*dt;v.speed=Math.max(-6,Math.min(max,v.speed));
  const steer=side*Math.min(1,Math.abs(v.speed)/3)*(1.6/(1+Math.abs(v.speed)*.04));g.rotation.y-=steer*dt*Math.sign(v.speed||1);
  const dx=Math.sin(g.rotation.y)*v.speed*dt,dz=Math.cos(g.rotation.y)*v.speed*dt,rad=v.type==='bus'?2:v.type==='scooter'?.6:1.3;
  if(!blocked(g.position.x+dx,g.position.z+dz,rad)&&!TRAFFIC.some(t=>Math.hypot(t.veh.g.position.x-g.position.x-dx,t.veh.g.position.z-g.position.z-dz)<3.4)){g.position.x+=dx;g.position.z+=dz}else{if(Math.abs(v.speed)>8)tone([90],.2,'sawtooth',.06);v.speed*=-.3}
  g.position.y=groundY(g.position.x,g.position.z)*.9;if(Math.abs(g.position.x+149.5)<3&&Math.abs(g.position.z-train.z)<62){g.position.x=-145;v.speed=0;toast('Train se door raho!')}
  P.x=g.position.x;P.z=g.position.z;P.yaw=g.rotation.y;me.position.set(P.x,0,P.z);
  if(v.brake)v.brake.forEach(b=>b.material=fwd<0&&v.speed>0?BRAKE:tailMat);
  for(const p of PEDS)if(p.active&&p.mode!=='fall'&&!p.static&&Math.abs(v.speed)>3&&Math.hypot(p.g.position.x-g.position.x,p.g.position.z-g.position.z)<rad+.6){p.mode='fall';p.t=3;p.g.rotation.x=-PI/2;p.g.position.y=.45;v.speed*=.4;pay(-100,'Challan: pedestrian ko takkar');}
 }
 for(const v of RIDES)for(const w of v.wheels)w.rotation.x+=v.speed*dt/.33;
 // needs
 if(started&&!creating){ST.hunger=Math.max(0,ST.hunger-dt*.045);ST.energy=Math.max(0,ST.energy-dt*.012);if(ST.hunger<10&&Math.random()<dt*.05)toast('Bhook lagi hai! Vada pav khao');}
 $('bHun').style.width=ST.hunger+'%';$('bEn').style.width=ST.energy+'%';
 // ---- traffic
 const pp=P.ride?P.ride.g.position:me.position;
 for(const t of TRAFFIC){const cur=loopAt(t.L,t.d),ah=loopAt(t.L,t.d+8),hx=ah.x-cur.x,hz=ah.z-cur.z;let go=true;
  const blk=(x,z,w=2.4)=>{const vx=x-cur.x,vz=z-cur.z,dot=(vx*hx+vz*hz)/8;return dot>0&&dot<10&&Math.abs(vx*hz-vz*hx)/8<w};
  if(blk(pp.x,pp.z))go=false;for(const o of TRAFFIC)if(o!==t&&o.L===t.L&&blk(o.veh.g.position.x,o.veh.g.position.z,1.8))go=false;
  if(!t.speeder){for(const q of PEDS)if(q.active&&q.mode==='cross'&&blk(q.g.position.x,q.g.position.z,3))go=false;
   const s=cur.seg,ax=s.ax,pos=ax==='x'?cur.x:cur.z,dir=ax==='x'?Math.sign(s.b[0]-s.a[0]):Math.sign(s.b[1]-s.a[1]);for(const c of ROADS){const dist=(c-pos)*dir-9.5;if(dist>0&&dist<5){const st=sig[ax];if(st==='r'||(st==='y'&&dist>2))go=false}}}
  t.cur+=((go?t.v:0)-t.cur)*Math.min(1,dt*(go?1.5:4));t.d+=t.cur*dt;const p=loopAt(t.L,t.d);t.veh.g.position.set(p.x,0,p.z);let dy=((p.yaw-t.veh.g.rotation.y+PI*3)%(PI*2))-PI;t.veh.g.rotation.y+=dy*Math.min(1,dt*5);for(const w of t.veh.wheels)w.rotation.x+=t.cur*dt/.33;
  if(t.veh.brake)t.veh.brake.forEach(b=>b.material=!go?BRAKE:tailMat)}
 // ---- pedestrians
 for(const p of PEDS){if(!p.active)continue;if(p.bt>0){p.bt-=dt;if(p.bt<=0&&p.bub){p.g.remove(p.bub);p.bub=null}}
  if(p.g.position.y>.26&&p.mode!=='fall'&&!p.static)p.g.position.y=Math.max(.25,p.g.position.y-dt*2);
  if(p.static){animH(p.g,0,dt,p.sit?'sit':undefined);continue}
  if(p.mode==='fall'){p.t-=dt;if(p.t<=0){p.mode='walk';p.g.rotation.x=0;p.g.position.y=.25;say(p,'Dhyan se chalao bhai!')}continue}
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
 const night=1-day;sun.intensity=(day>0?3.3*day:0)+(el2<0?.25:0);sun.color.setHSL(.095,.78+dusk*.2,.78-dusk*.15);if(el2<0)sun.color.set(0x8fa6d8);sun.intensity*=1-rainAmt*.6;
 hemi.intensity=.15+day*.62;hemi.groundColor.set(0x9a7a55);hemi.color.setHSL(.58,.5,.55+day*.2);
 const lp=el2>0?sunDir:sunDir.clone().negate();sun.position.set(pp.x+lp.x*120,lp.y*120+10,pp.z+lp.z*120);sun.target.position.set(pp.x,0,pp.z);
 moon.position.set(camera.position.x-sunDir.x*1700,camera.position.y-sunDir.y*1700,camera.position.z-sunDir.z*1700);moon.visible=el2<.1;
 stars.material.opacity=T.MathUtils.clamp(night*1.2-.3,0,1)*(1-rainAmt);stars.position.copy(camera.position);
 const fogC=new T.Color(0x0b1424).lerp(new T.Color(0xb4dcf8),day).lerp(new T.Color(0xe8a070),dusk*.45).lerp(new T.Color(0x6b7580).multiplyScalar(.3+day*.7),rainAmt*.7);scene.fog.color.copy(fogC);scene.fog.density=.001+rainAmt*.006+(1-day)*.001;
 SU.rayleigh.value=3+rainAmt*1.5;SU.turbidity.value=2.2+rainAmt*12;renderer.toneMappingExposure=.84+night*.2-rainAmt*.12;
 if(Math.abs(el-envT)>4){envT=el;sky2.material.uniforms.rayleigh.value=SU.rayleigh.value;sky2.material.uniforms.turbidity.value=SU.turbidity.value;const old=envRT;envRT=pmrem.fromScene(envScene,0,1,3000);scene.environment=envRT.texture;scene.environmentIntensity=.35+day*.65;if(old)old.dispose()}
 const lamps=night>.55;lampHeadMat.emissiveIntensity=lamps?6:0;headMat.emissiveIntensity=lamps?5:.3;tailMat.emissiveIntensity=lamps?2:.2;
 for(const m of FACADE)m.emissiveIntensity=night>.5?1.1*night:0;for(const m of SHOPMATS)m.emissiveIntensity=.15+night*.9;for(const m of SIGNMATS)m.emissiveIntensity=.25+night*.9;
 bloom.strength=.16+night*.3;
 for(const[k,m]of Object.entries(SIGM))m.emissiveIntensity=(sig[k[0]]==='g'&&k[1]==='g')||(sig[k[0]]!=='g'&&k[1]==='r')?4:0;
 lightT-=dt;if(lightT<=0){lightT=.4;const near=LAMPS.map(l=>[l,(l[0]-pp.x)**2+(l[1]-pp.z)**2]).sort((a,b)=>a[1]-b[1]);POOL.forEach((L,i)=>{const l=near[i][0];L.position.set(l[0],7.6,l[1]);L.intensity=lamps?14:0})}
 roadMat.roughness=interMat.roughness=.9-wet*.62;tileMat.roughness=.92-wet*.4;const dk=1-wet*.35;roadMat.color.setScalar(dk);interMat.color.setScalar(dk);
 rain.material.opacity=rainAmt*.55;rain.position.set(camera.position.x,camera.position.y-20,camera.position.z);if(rainAmt>.02){const a=rainGeo.attributes.position.array;for(let i=0;i<RN;i++){let y=a[i*6+1]-dt*28;if(y<0)y+=40;a[i*6+1]=y;a[i*6+4]=y-.7}rainGeo.attributes.position.needsUpdate=true}
 WN.offset.x+=dt*.004;WN.offset.y+=dt*.002;
 if(amb&&AC){const m=muted?0:1;amb.cg.gain.value=.05*m*(1-rainAmt*.4);amb.rg.gain.value=.11*rainAmt*m;const sp=P.ride?Math.abs(P.ride.speed):0;amb.eng.frequency.value=38+sp*4.5;amb.eg.gain.value=P.ride?(.018+sp*.0012)*m:0}
 marker.rotation.y+=dt;gpsMarker.rotation.y+=dt;
 for(const v of VENDORS){const d=Math.hypot(v.x-pp.x,v.z-pp.z);if(d>120)continue;animH(v.man,0,dt);if(v.bt>0){v.bt-=dt;if(v.bt<=0&&v.bub){v.man.remove(v.bub);v.bub=null}}v.t-=dt;if(v.t<=0&&d<15&&started){v.t=8+R()*7;vsay(v,VT[v.type].call);v.man.userData.wave=1.6}}
 for(const sm of SMOKE){sm.t+=dt;const a=sm.pt.geometry.attributes.position;for(let i=0;i<7;i++){const t=(sm.t+i*.43)%3;a.setXYZ(i,Math.sin(t*2.3+i)*.15*t,.7+t*.6,Math.cos(t*1.7+i)*.1*t)}a.needsUpdate=true;sm.pt.material.opacity=.3*(1-rainAmt*.5)}
 for(const m of COALS)m.emissiveIntensity=1.3+Math.sin(el*7)*.25+night*1.6;puddleMat.opacity=wet*.85;
 if(WP&&Math.hypot(WP.x-pp.x,WP.z-pp.z)<9){WP=null;gpsMarker.visible=false;toast('GPS: pahunch gaye!');ding()}
 if(mapOn)drawBigMap();
 if(started&&!creating)updateJob(dt);
 // ---- camera
 if(creating&&CLOSE){me.rotation.y=CYAW!==null?+CYAW:Math.sin(el*.6)*.9;if(CWALK)animH(me,CWALK,dt);tgtV.set(me.position.x,me.position.y+(CLOSE==='body'?1.0:1.62),me.position.z);camera.position.set(tgtV.x,tgtV.y+.05,me.position.z+(CLOSE==='body'?2.4:.75));camera.lookAt(tgtV);camera.fov=50}
 else if(creating){const k=innerWidth>700?1:0;me.rotation.y=Math.sin(el*.6)*.7;tgtV.set(me.position.x-.75*k,me.position.y+1.05,me.position.z);camera.position.set(tgtV.x,tgtV.y+.25,me.position.z+3.4);camera.lookAt(tgtV);camera.fov=50}
 else{const ride=P.ride;tgtV.set(pp.x,(ride?1.2:P.y)+(ride?1.6:1.55),pp.z);if(ride&&Math.abs(ride.speed)>2.5&&!drag){let d=((ride.g.rotation.y+PI-camYaw+PI*3)%(PI*2))-PI;camYaw+=d*Math.min(1,dt*2.2)}
  else if(!ride&&!drag&&!SIT&&fwd>.1){let d=((P.yaw+PI-camYaw+PI*3)%(PI*2))-PI;camYaw+=d*Math.min(1,dt*2.5*fwd)}
  const hitAt=(pt,dist)=>{for(let st=1.2;st<=dist;st+=.4){const cx=tgtV.x+Math.sin(camYaw)*Math.cos(pt)*st,cz=tgtV.z+Math.cos(camYaw)*Math.cos(pt)*st,cy=tgtV.y+Math.sin(pt)*st;if(COLL.some(c=>c.h>3.5&&cy<c.h+.8&&cx>c.x0-.3&&cx<c.x1+.3&&cz>c.z0-.3&&cz<c.z1+.3))return st}return 0};
  let cd=camDist,pitch=camPitch;for(let k=0;k<10;k++){const hh=hitAt(pitch,camDist);if(!hh)break;if(pitch>=1.2){cd=Math.max(2.2,hh-.5);break}pitch=Math.min(1.2,pitch+.1)}camP+=(pitch-camP)*Math.min(1,dt*5);
  camPos.set(tgtV.x+Math.sin(camYaw)*Math.cos(camP)*cd,tgtV.y+Math.sin(camP)*cd,tgtV.z+Math.cos(camYaw)*Math.cos(camP)*cd);if(camPos.y<groundY(camPos.x,camPos.z)+.4)camPos.y=groundY(camPos.x,camPos.z)+.4;camera.position.lerp(camPos,Math.min(1,dt*10));camera.lookAt(tgtV);
  camera.fov+=((ride?62+Math.abs(ride.speed)*.45:62)-camera.fov)*Math.min(1,dt*3)}
 camera.updateProjectionMatrix();
 // ---- HUD
 $('clock').textContent=clockText();{const pt=$('pTime');if(pt)pt.textContent=(clockText().split('·')[1]||'').trim()}hintT-=dt;if(hintT<=0){hintT=.2;$('hint').textContent=started&&!creating?hintText():'';hudMoney()}
 $('speedo').innerHTML=P.ride?`${Math.round(Math.abs(P.ride.speed)*3.6)}<small>km/h</small>`:'';
 const TG=marker.visible?marker.position:(WP?gpsMarker.position:null);if(TG&&started){const ang=Math.atan2(TG.x-pp.x,TG.z-pp.z);$('arrow').style.display='block';$('arrow').querySelector('path').setAttribute('fill',marker.visible?'#ffd21f':'#a66bff');$('arrow').style.transform=`rotate(${(camYaw+PI-ang)*180/PI}deg)`;$('dist').textContent=Math.round(Math.hypot(TG.x-pp.x,TG.z-pp.z))+' m'}else{$('arrow').style.display='none';$('dist').textContent=''}
 if(started)drawMini();
 if(PV&&me.userData.vrm===PV)driveVRM(PV,me.userData,dt);
 for(const f of TICK)f(dt,el);if(NETAPI)NETAPI.update(dt);
 composer.render();requestAnimationFrame(step)}
const BRAKE=new T.MeshStandardMaterial({color:0x880000,emissive:0xff1a1a,emissiveIntensity:4});
$('chai').onclick=e=>{const b=e.target.closest('button');if(b)serve(+b.dataset.o)};
{const at=new URLSearchParams(location.search).get('at');if(at){const[ax,az]=at.split(',').map(Number);if(isFinite(ax)&&isFinite(az)){P.x=ax;P.z=az}}} // dev aid: ?at=x,z start position
me.position.set(P.x,P.y,P.z);me.rotation.y=PI;if(new URLSearchParams(location.search).has('cars'))['car','taxi','auto','bus','scooter'].forEach((t,i)=>{const v=vehicle(t,[0xc0392b,0,0,0,0x2c5fa8][i]);const a=-PI/2+i*.55;v.g.position.set(P.x+Math.sin(a)*9,0,P.z+Math.cos(a)*9);v.g.rotation.y=a+PI/2}); // dev aid: ?cars
// loading screen: wait for the character and precompile every shader so the first seconds aren't a slideshow
async function bootFinish(){const set=(p,t)=>{$('ldFill').style.width=p+'%';$('ldText').textContent=t};
 set(55,'Character aa raha hai…');await Promise.race([CHAR_PROMISE,new Promise(r=>setTimeout(r,25000))]);
 set(82,'Graphics taiyaar ho rahe hain…');await new Promise(r=>setTimeout(r,50));try{if(renderer.compileAsync)await renderer.compileAsync(scene,camera);else renderer.compile(scene,camera)}catch(e){console.warn(e)}
 set(100,'Chalo!');await new Promise(r=>setTimeout(r,350));$('loading').classList.add('done');setTimeout(()=>{$('loading').hidden=true},650)}

const CHAR_PROMISE=initChars();hudMoney();resize();bootFinish();requestAnimationFrame(step);
}
