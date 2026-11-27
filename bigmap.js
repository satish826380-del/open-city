// Moved out of game.js unchanged; shared names arrive through the context object C (see game.js).
export function makeBigMap(C) {
const {$,CAFE,DMAP,EXTRA_PLACES,GAR,LIM,LOTS,OCOLL,P,PI,R,RIDES,ROADS,RW,SEA,SPOTS,ST,T,TRAFFIC,VADA,VENDORS,VT,WORLD,bubble,here,pay,scene,toast,togglePhone,train} = C;
function vsay(v,t){if(v.bub)v.man.remove(v.bub);const s=bubble(t);s.position.y=2.3;v.man.add(s);v.bub=s;v.bt=3.2}
function nearVendor(){return VENDORS.find(v=>Math.hypot(v.fx-P.x,v.fz-P.z)<1.9)}
function buyVendor(v){const t=VT[v.type];if(ST.money<t.price)return toast('Not enough money');ST.hunger=Math.min(100,ST.hunger+t.h);ST.energy=Math.min(100,ST.energy+t.e);pay(-t.price,t.n);vsay(v,['Thank you, come again!','Tastes great, right?','Anything else?'][Math.floor(R()*3)]);v.man.userData.wave=1.2;if(v.type==='paper')setTimeout(()=>toast('News: '+['Local train 2 min late, commuters annoyed','Monsoon arrives early, keep an umbrella ready','Vada pav beats burger again','Stunning sunset at Marine Drive today'][Math.floor(R()*4)]),1500)}
// ================= full map overlay =================
let MZ=1.15,MC={x:0,z:0},mdrag=null;const mapc=$('mapc');
const gpsMarker=new T.Group();{const beam=new T.Mesh(new T.CylinderGeometry(1.6,1.6,60,20,1,true),new T.MeshBasicMaterial({color:0xa66bff,transparent:true,opacity:.25,side:T.DoubleSide,depthWrite:false,fog:false}));beam.position.y=30;gpsMarker.add(beam);const ring=new T.Mesh(new T.TorusGeometry(2,.12,8,40),new T.MeshBasicMaterial({color:0xa66bff}));ring.rotation.x=PI/2;ring.position.y=.35;gpsMarker.add(ring)}gpsMarker.visible=false;scene.add(gpsMarker);
function toggleMap(v){C.mapOn=v===undefined?!C.mapOn:v;$('mapov').hidden=!C.mapOn;document.body.classList.toggle('mapOn',C.mapOn);if(C.mapOn){const h=here();MC={x:h.x,z:h.z};togglePhone(false);sizeMap()}}
function sizeMap(){const r=mapc.getBoundingClientRect();mapc.width=Math.max(1,r.width*devicePixelRatio);mapc.height=Math.max(1,r.height*devicePixelRatio)}addEventListener('resize',()=>{if(C.mapOn)sizeMap()});
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
 if(e.type==='pointerup'&&!pinched&&mdrag&&Math.hypot(e.clientX-mdrag.sx,e.clientY-mdrag.sy)<6){const w=toWorld(e.clientX,e.clientY);if(w.x>WORLD.x0&&w.x<WORLD.x1&&w.z>WORLD.z0&&w.z<SEA+100){C.WP=w;gpsMarker.position.set(w.x,0,w.z);gpsMarker.visible=true;toast('GPS set! Follow the purple light')}}mdrag=null};
mapc.addEventListener('pointerup',mapUp);mapc.addEventListener('pointercancel',mapUp);
mapc.addEventListener('wheel',e=>{e.preventDefault();MZ=Math.max(.28,Math.min(6,MZ*(e.deltaY<0?1.15:1/1.15)))},{passive:false});
$('mzi').onclick=()=>MZ=Math.min(6,MZ*1.3);$('mzo').onclick=()=>MZ=Math.max(.28,MZ/1.3);$('mcl').onclick=()=>toggleMap(false);$('mapBtn').onclick=()=>toggleMap(true);
$('mwp').onclick=()=>{C.WP=null;gpsMarker.visible=false;toast('GPS cleared')};$('mme').onclick=()=>{const h=here();MC={x:h.x,z:h.z}};
$('leg').innerHTML=[['#ffd21f','You'],['#ff2d78','Real players'],['#1f6f5c','☕ Startup Café'],['#e8742a','📢 Billboard'],['#7a6bd8','🚇 Metro'],['#2ecc71','Job / destination'],['#a66bff','GPS'],['#e74c3c','Traffic']].map(([c,n])=>`<span><i style="background:${c}"></i>${n}</span>`).join('')+Object.values(VT).map(v=>`<span><i style="background:${v.col}"></i>${v.n}</span>`).join('');
// extra names shown on the maps (job destinations stay in PLACES)
const ROAD_NAMES=['Station Road','M.G. Road','Linking Road','Hill Road'],CROSS_NAMES=['Gandhi Marg','Nehru Street','Tilak Road','Sea View Road'];
let MAP_EXTRA=null;const mapExtra=()=>MAP_EXTRA||(MAP_EXTRA=[{n:'Vada Pav Center',x:VADA.x,z:VADA.z},{n:'Garage',x:GAR.x,z:GAR.z},{n:'Metro Station',x:-150,z:-14},{n:'City Center Plaza',x:-35,z:-345},{n:'Billboard',x:-40,z:-308},{n:'Dam & Lake',x:275,z:-505},{n:'Runway',x:385,z:112}]);
const PLAYER_COL='#ff2d78';
const allPlayers=()=>C.NETAPI&&C.NETAPI.positions?C.NETAPI.positions():[];
// players too far away to draw get a floating name marker with the distance, so you can find each other
const BEACONS=[];let beaconT=0;
function beaconTick(dt){beaconT-=dt;if(beaconT>0)return;beaconT=.5;const far=C.started&&!C.creating?allPlayers().filter(q=>!q.near):[];
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
 if(DMAP.land){x.save();x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=24;x.fillStyle=MAPK.land;C.polyPath(x,DMAP.land);x.fill();x.restore();x.strokeStyle=MAPK.beach;x.lineWidth=7;C.polyPath(x,DMAP.land);x.stroke()}
 x.globalAlpha=.42;for(const z of DMAP.zones){x.fillStyle=z.c;C.polyPath(x,z.pts);x.fill()}x.globalAlpha=1;
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
 if(C.WP){const[a,b]=S(h.x,h.z),[c,d]=S(C.WP.x,C.WP.z);x.strokeStyle='#a66bff';x.lineWidth=4*dp;x.setLineDash([10*dp,8*dp]);x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();x.setLineDash([])}
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
 if(MZ>.75){x.font=`700 ${12*dp}px "Baloo 2",sans-serif`;for(const p of C.PLACES){const[a,b]=S(p.x,p.z);const tw=x.measureText(p.n).width+14*dp;if(!fits(a,b,tw,22*dp))continue;x.fillStyle='rgba(25,28,34,.86)';x.beginPath();x.roundRect?x.roundRect(a-tw/2,b-11*dp,tw,22*dp,11*dp):x.rect(a-tw/2,b-11*dp,tw,22*dp);x.fill();x.fillStyle='#fff';x.fillText(p.n,a,b+1*dp)}}
 // 2. districts and landmarks, larger when zoomed out
 const big=MZ<.75?13:15;for(const p of EXTRA_PLACES)txt(p.n,p.x,p.z,big,800,'#2b3a4a');
 // 3. smaller landmarks, 4. stalls, only when zoomed in enough to have room
 if(MZ>1.1)for(const p of mapExtra())txt(p.n,p.x,p.z,11,700,'#5b3f8c',14*dp);
 if(MZ>2.2)for(const v of VENDORS)txt(VT[v.type].n,v.x,v.z,11,600,'#2b3a4a',-12*dp);
 // road names along the old-city streets
 if(MZ>1.6){x.font=`700 ${10*dp}px "Baloo 2",sans-serif`;x.lineWidth=3*dp;const road=(n,wx,wz,rot)=>{const[a,b]=S(wx,wz),w=x.measureText(n).width,hh=12*dp;if(!(rot?fits(a,b,hh,w):fits(a,b,w,hh)))return;x.save();x.translate(a,b);x.rotate(rot);x.strokeStyle='rgba(255,255,255,.95)';x.strokeText(n,0,0);x.fillStyle='#6a5f4e';x.fillText(n,0,0);x.restore()};
  ROADS.forEach((r,i)=>{road(ROAD_NAMES[i],r,-80,-PI/2);road(CROSS_NAMES[i],-80,r,0)})}
 // billboard spot numbers
 if(MZ>.9){x.font=`800 ${10*dp}px "Baloo 2",sans-serif`;for(const sp of SPOTS){if(sp.type==='lamp'&&MZ<2.2)continue;const[a,b]=S(sp.x,sp.z);x.fillStyle=C.BOARDS.taken(sp.code)?'#0f766e':'#e8742a';x.fillRect(a-9*dp,b-7*dp,18*dp,14*dp);x.fillStyle='#fff';x.fillText(sp.code,a,b+dp)}}
 // every real player online: a small pink dot (no names on the map)
 for(const q of allPlayers()){const[a,b]=S(q.x,q.z);x.fillStyle=PLAYER_COL;x.strokeStyle='#fff';x.lineWidth=2*dp;x.beginPath();x.arc(a,b,5*dp,0,7);x.fill();x.stroke()}
 const pin=(wx,wz,c)=>{const[a,b]=S(wx,wz);x.fillStyle=c;x.strokeStyle='#fff';x.lineWidth=2.5*dp;x.beginPath();x.arc(a,b-16*dp,9*dp,PI,0);x.lineTo(a,b);x.closePath();x.fill();x.stroke();x.fillStyle='#fff';x.beginPath();x.arc(a,b-16*dp,3.5*dp,0,7);x.fill()};
 if(C.marker.visible)pin(C.marker.position.x,C.marker.position.z,'#2ecc71');if(C.WP)pin(C.WP.x,C.WP.z,'#a66bff');
 // you: arrow with a soft halo
 {const[a,b]=S(h.x,h.z);x.fillStyle='rgba(255,210,31,.25)';x.beginPath();x.arc(a,b,20*dp,0,7);x.fill();x.save();x.translate(a,b);x.rotate(PI-(P.ride?P.ride.g.rotation.y:P.yaw));x.fillStyle='#ffd21f';x.strokeStyle='#141414';x.lineWidth=3*dp;x.beginPath();x.moveTo(0,-14*dp);x.lineTo(10*dp,11*dp);x.lineTo(0,5*dp);x.lineTo(-10*dp,11*dp);x.closePath();x.fill();x.stroke();x.restore()}
 // compass + scale bar
 {const cx=W-34*dp,cy=H-34*dp;x.fillStyle='rgba(20,22,28,.85)';x.beginPath();x.arc(cx,cy,20*dp,0,7);x.fill();x.fillStyle='#ff5a4f';x.beginPath();x.moveTo(cx,cy-15*dp);x.lineTo(cx+6*dp,cy);x.lineTo(cx-6*dp,cy);x.fill();x.fillStyle='#fff';x.beginPath();x.moveTo(cx,cy+15*dp);x.lineTo(cx+6*dp,cy);x.lineTo(cx-6*dp,cy);x.fill();x.font=`800 ${10*dp}px sans-serif`;x.fillText('N',cx,cy-27*dp)}
 {const nice=[10,20,50,100,200,500],m=nice.find(v=>v*s>70*dp)||500,len=m*s,bx=16*dp,by=H-20*dp;x.fillStyle='rgba(20,22,28,.85)';x.fillRect(bx-6*dp,by-18*dp,len+56*dp,28*dp);x.strokeStyle='#fff';x.lineWidth=3*dp;x.beginPath();x.moveTo(bx,by-6*dp);x.lineTo(bx,by);x.lineTo(bx+len,by);x.lineTo(bx+len,by-6*dp);x.stroke();x.font=`700 ${11*dp}px sans-serif`;x.textAlign='left';x.fillStyle='#fff';x.fillText(m+' m',bx+len+6*dp,by-3*dp);x.textAlign='center'}}
return {vsay,nearVendor,buyVendor,gpsMarker,toggleMap,mapExtra,PLAYER_COL,allPlayers,beaconTick,drawBigMap};
}
