// Moved out of game.js unchanged; shared names arrive through the context object C (see game.js).
export function makePeople(C) {
const {MOBILE,MX,PI,R,T,mergeGeometries,mocapPose} = C;
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
return {SKINS,TOPS,BOTS,gsph,HG,pc,human,HAIR_STYLES,TOP_STYLES,BOT_STYLES,hero,npc,GREET,animH,randLook};
}
