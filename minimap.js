// Moved out of game.js unchanged; shared names arrive through the context object C (see game.js).
export function makeMinimap(C) {
const {$,DMAP,EXTRA_PLACES,LIM,LOTS,P,PI,PLACES,PLAYER_COL,ROADS,RW,SEA,TRAFFIC,allPlayers,here,mapExtra,marker} = C;
const polyPath=(x,pts)=>{x.beginPath();pts.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath()};
function drawWorld(x,big){x.fillStyle='#1a5566';x.fillRect(-1600,-1600,3200,3200);if(DMAP.land){x.fillStyle='#a89f8f';polyPath(x,DMAP.land);x.fill()}
 for(const z of DMAP.zones){x.fillStyle=z.c;polyPath(x,z.pts);x.fill()}x.fillStyle='#b8b1a3';x.fillRect(-LIM,-LIM,2*LIM,LIM+SEA);x.strokeStyle='#3a3b3f';x.lineJoin='round';for(const L of DMAP.lines){x.lineWidth=L.w;x.beginPath();L.pts.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));if(L.closed)x.closePath();x.stroke()}x.fillStyle='#5d8a3a';x.fillStyle='#5d8a3a';x.fillRect(-30,-30,60,60);x.fillStyle='#8a8580';for(const l of LOTS)x.fillRect(l.x-l.w/2,l.z-l.d/2,l.w,l.d);
 x.fillStyle='#3a3b3f';for(const r of ROADS){x.fillRect(-LIM,r-7,2*LIM,RW);x.fillRect(r-7,-LIM,RW,LIM+SEA)}x.fillStyle='#6f665b';x.fillRect(-157,-LIM,14,2*LIM);
 if(big){x.fillStyle='#fff';x.font='700 7px "Baloo 2",sans-serif';for(const p of PLACES)x.fillText(p.n,p.x-12,p.z);x.font='800 12px "Baloo 2",sans-serif';x.fillStyle='#fffaf0';for(const p of EXTRA_PLACES)x.fillText(p.n,p.x-20,p.z)}}
function drawMap(cv,big){const x=cv.getContext('2d'),s=cv.width/360;x.save();x.scale(s,s);x.translate(180,180);drawWorld(x,true);const h=here();if(marker.visible){x.fillStyle='#2ecc71';x.beginPath();x.arc(marker.position.x,marker.position.z,5,0,7);x.fill()}x.fillStyle='#ffd21f';x.strokeStyle='#141414';x.lineWidth=2;x.beginPath();x.arc(h.x,h.z,4,0,7);x.fill();x.stroke();x.restore()}
function drawMini(){const cv=$('mini'),x=cv.getContext('2d'),h=here();x.save();x.clearRect(0,0,300,300);x.beginPath();x.arc(150,150,150,0,7);x.clip();x.translate(150,150);x.rotate(C.camYaw);x.scale(2.2,2.2);x.translate(-h.x,-h.z);drawWorld(x,false);
 x.fillStyle='#e74c3c';for(const t of TRAFFIC)x.fillRect(t.veh.g.position.x-1.5,t.veh.g.position.z-1.5,3,3);if(marker.visible){x.fillStyle='#2ecc71';x.beginPath();x.arc(marker.position.x,marker.position.z,4,0,7);x.fill()}x.restore();
 // upright overlay: nearby place names, then real players (held on the rim when they are off the map)
 const at=(wx,wz)=>{const dx=(wx-h.x)*2.2,dz=(wz-h.z)*2.2,c=Math.cos(C.camYaw),s=Math.sin(C.camYaw);return[dx*c-dz*s,dx*s+dz*c]};
 x.textAlign='center';x.textBaseline='middle';x.font='800 19px "Baloo 2",sans-serif';x.lineWidth=5;
 const near=[...PLACES,...EXTRA_PLACES,...mapExtra()].map(p=>[p,Math.hypot(p.x-h.x,p.z-h.z)]).filter(q=>q[1]<62).sort((a,b)=>a[1]-b[1]),used=[];
 for(const[p]of near){const[a,b]=at(p.x,p.z);if(used.some(u=>Math.abs(u[1]-b)<24&&Math.abs(u[0]-a)<110))continue;used.push([a,b]);x.strokeStyle='rgba(15,15,20,.9)';x.strokeText(p.n,150+a,150+b);x.fillStyle='#fff';x.fillText(p.n,150+a,150+b);if(used.length>=3)break}
 for(const q of allPlayers()){let[a,b]=at(q.x,q.z);const l=Math.hypot(a,b),far=l>132;if(far){a*=132/l;b*=132/l}x.fillStyle=PLAYER_COL;x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(150+a,150+b,far?9:13,0,7);x.fill();x.stroke();
  if(!far){x.fillStyle='#fff';x.font='800 16px "Baloo 2",sans-serif';x.fillText((q.name||'?')[0].toUpperCase(),150+a,151+b)}}
 x.save();x.translate(150,150);x.rotate(PI-(P.ride?P.ride.g.rotation.y:P.yaw)+C.camYaw);x.fillStyle='#ffd21f';x.strokeStyle='#141414';x.lineWidth=3;x.beginPath();x.moveTo(0,-12);x.lineTo(9,10);x.lineTo(-9,10);x.closePath();x.fill();x.stroke();x.restore()}
return {polyPath,drawMap,drawMini};
}
