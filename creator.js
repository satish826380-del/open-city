// Moved out of game.js unchanged; shared names arrive through the context object C (see game.js).
export function makeCreator(C) {
const {$,BOTS,BOT_STYLES,HAIR_STYLES,P,PI,SKINS,ST,TOPS,TOP_STYLES,animH,bubble,doWave,hero,human,loadVRM,makeMe,recolor,roleSw,save,scene,setGPS,startNet,toast,vehicle,vrmProgress,vrmSlots} = C;
const TOPV=(()=>{const v=(new URLSearchParams(location.search).get('top')||'').split(',').map(Number);return v.length===3&&v.every(isFinite)?v:null})();if(TOPV)document.getElementById('start').style.display='none';
// debug: ?cam=x,y,z,tx,ty,tz fixes the camera (for screenshots of a spot)
const CAMV=(()=>{const v=(new URLSearchParams(location.search).get('cam')||'').split(',').map(Number);return v.length===6&&v.every(isFinite)?v:null})();if(CAMV)document.getElementById('start').style.display='none';
;const CLOSE=new URLSearchParams(location.search).get('closeup'),CYAW=new URLSearchParams(location.search).get('yaw'),CWALK=+new URLSearchParams(location.search).get('walk')||0,CPHONE=new URLSearchParams(location.search).has('phone');if(CLOSE)document.getElementById('start').style.display='none';const SKINSW=SKINS,TOPSW=TOPS.slice(0,8),BOTSW=BOTS;
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
;
function lookPayload(){const l=ST.look;return{female:!!l.female,skin:l.skin,top:l.top,bottom:l.bottom,outfit:l.outfit|0,hairS:l.hairS|0,hairC:l.hairC,tee:l.tee,topS:l.topS|0,botS:l.botS|0,shoes:l.shoes}}
// extra Ladka rows: hair style + colour, top style, inner tee, pant style, shoes
const H_ROWS=[['hairS','Hair style',HAIR_STYLES],['hairC','Hair colour',[0x1b1d2b,0x15110e,0x3b2314,0x7a4a24,0xc9a26b,0x9a9a9a,0x7a1f2b,0x2d3e8f]],['topS','Top style',TOP_STYLES],
 ['tee','Shirt / T-shirt',[0xd8d8d4,0x2b2b2b,0xc0392b,0x2c5fa8,0xf2c94c,0x1e7b4a]],['botS','Pants style',BOT_STYLES],['shoes','Shoes',[0x17171a,0xf2f2f2,0xc0392b,0x2c5fa8,0x6b4a2a]]];
function heroRows(){const el=$('hRows');const hl=$('hLook'),isHair=k=>k==='hairS'||k==='hairC';if(ST.look.female||CHAR_WAIT||outfitList().length){el.style.display=hl.style.display='none';return}el.style.display=hl.style.display='';const l=ST.look;
 const rows=want=>H_ROWS.filter(([k])=>isHair(k)===want&&(k!=='tee'||[0,4,5,6].includes(l.topS|0))).map(([k,n,list])=>`<label>${n}</label><div class="sw" data-k="${k}">${typeof list[0]==='string'?list.map((t,i)=>`<button data-v="${i}" aria-pressed="${(l[k]|0)===i}" style="width:auto;padding:0 12px;border-radius:12px;background:#2a2a2a;color:#fff">${t}</button>`).join(''):list.map(v=>`<button aria-label="colour" data-v="${v}" aria-pressed="${(l[k]??list[0])===v}" style="background:#${v.toString(16).padStart(6,'0')}"></button>`).join('')}</div>`).join('');el.innerHTML=rows(false);hl.innerHTML=rows(true);
 el.onclick=hl.onclick=e=>{const b=e.target.closest('button'),row=e.target.closest('[data-k]');if(!b||!row)return;ST.look[row.dataset.k]=+b.dataset.v;if(row.dataset.k==='topS'&&+b.dataset.v===4){Object.assign(ST.look,{top:0x1b2a4a,bottom:0x1b2a4a,botS:3,shoes:0x17171a,tee:0xd8d8d4});swatches('sT',TOPSW,'top');swatches('sB',BOTSW,'bottom')}rebuildMe();heroRows();presetSw()}}
function chatLine(n,t,mine){const d=document.createElement('div');if(mine)d.className='me';const b=document.createElement('b');b.textContent=n+': ';d.append(b,document.createTextNode(t));const L=$('chatLog');L.append(d);while(L.children.length>7)L.firstChild.remove();setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),900)},14000);if(mine){if(C.me.userData._bub)C.me.remove(C.me.userData._bub);const s=bubble(t.slice(0,60));s.position.y=2.1;C.me.add(s);C.me.userData._bub=s;setTimeout(()=>{if(C.me.userData._bub===s){C.me.remove(s);C.me.userData._bub=null}},5000)}}
function startMultiplayer(){if(C.NETAPI)return;C.NETAPI=startNet({scene,animH,bubble,vehicle:t=>vehicle(t),makeAvatar:l=>{const o=Object.assign({skin:0xc68642,top:0x2b2b2b,bottom:0x1b1b1b},l);return o.female?human(o):hero(o)},
 local:()=>({x:P.x,y:P.y,z:P.z,yaw:P.ride?P.ride.g.rotation.y:P.yaw,speed:P.ride?Math.abs(P.ride.speed):(C.me.userData.spd||0),state:C.SIT?'sit':C.ONTRAIN?'metro':P.ride?'ride:'+P.ride.type:'',name:ST.name,look:lookPayload(),role:ST.role||'Explorer',uid:C.AUTH.id||'',startup:(C.SOC.S.me&&C.SOC.S.me.startup)||''}),onMeet:(n,x,z)=>{setGPS(x,z);toast('📍 '+n+' wants to meet you: follow the purple light')},
 greet:()=>{if(!C.SIT&&!P.ride)doWave()},onChat:chatLine,onNobody:m=>toast('No one within '+m+' m can hear you'),onStatus:t=>{$('online').textContent=(t.startsWith('Online')?'🟢 ':'⚪ ')+t}})}
function openChat(){const i=$('chatIn');i.hidden=false;i.focus()}
$('chatBtn').onclick=openChat;
$('chatIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){if(C.NETAPI)C.NETAPI.chat(e.target.value);else chatLine(ST.name,e.target.value,true);e.target.value='';e.target.hidden=true;e.target.blur()}if(e.key==='Escape'){e.target.value='';e.target.hidden=true;e.target.blur()}});
// ---- VRoid characters: models/characters.json lists outfits per gender (each outfit = one .vrm export)
const VQ=new URLSearchParams(location.search).get('vrm');
function outfitList(){return(C.CHARS&&C.CHARS[ST.look.female?'female':'male'])||[]}
function vrmUrl(f){return /^(https?:)?\/\//.test(f)?f:'models/'+f}
const VC_ROWS=[['hair','Hair',[0x1a1a1a,0x3b2314,0x8a5a2b,0xc9a26b,0x7a1f2b,0x2d3e8f,0xd77fa1]],['top','Top',[0xf2f2f2,0xe84393,0x2c5fa8,0xf2c94c,0x1e7b4a,0xc0392b,0x2b2b2b,0x8fb8c9]],['bottom','Shorts / pants',[0x1b1b1b,0x22324a,0x4a6fa5,0xd9c7a8,0x7b2d8b,0xc0392b,0xf2f2f2]],['shoes','Shoes',[0xf2f2f2,0x1b1b1b,0xc0392b,0x2c5fa8,0xf2c94c]],['skin','Skin tone',[0xf4ddc8,0xe2b897,0xc99470,0xa87250,0x8a5a3c]],['eyes','Eyes',[0x3b2314,0x1a1a1a,0x2d6a8f,0x2e7d32,0x8a5a2b]]];
function curFile(){const L=outfitList();return L.length?L[Math.min(ST.look.outfit|0,L.length-1)].file:''}
function vcGet(){ST.look.vc=ST.look.vc||{};return ST.look.vc[curFile()]||(ST.look.vc[curFile()]={})}
function applyColors(){if(!C.PV)return;const c=vcGet();for(const[k]of VC_ROWS)recolor(C.PV,k,c[k]??null)}
function colorRows(){const el=$('vcRows'),vl=$('vLook'),isFace=k=>k==='hair'||k==='eyes'||k==='skin';if(!C.PV||!outfitList().length){el.style.display=vl.style.display='none';el.innerHTML=vl.innerHTML='';return}const have=vrmSlots(C.PV),c=vcGet();el.style.display=vl.style.display='';
 const rows=want=>VC_ROWS.filter(([k])=>have.includes(k)&&isFace(k)===want).map(([k,n,list])=>`<label>${n}</label><div class="sw" data-slot="${k}"><button aria-label="original colour" data-c="" aria-pressed="${c[k]==null}" style="background:#2a2a2a;color:#fff;font-size:13px">↺</button>${list.map(v=>`<button aria-label="colour" data-c="${v}" aria-pressed="${c[k]===v}" style="background:#${v.toString(16).padStart(6,'0')}"></button>`).join('')}</div>`).join('');el.innerHTML=rows(false);vl.innerHTML=rows(true);
 el.onclick=vl.onclick=e=>{const b=e.target.closest('button'),row=e.target.closest('[data-slot]');if(!b||!row)return;const k=row.dataset.slot,v=b.dataset.c===''?null:+b.dataset.c;const cc=vcGet();if(v==null)delete cc[k];else cc[k]=v;recolor(C.PV,k,v);save();colorRows()}}
let CHAR_WAIT=true; // until we know whether a VRoid character is coming, keep the old model + rows hidden
function setCreatorMode(){const v=CHAR_WAIT||outfitList().length>0;for(const id of['sS','sT','sB']){$(id).style.display=v?'none':'';$(id).previousElementSibling.style.display=v?'none':''}$('lO').style.display=$('sO').style.display=v?'':'none';heroRows()}
function outfitSw(){const L=outfitList();setCreatorMode();if(!L.length)return;$('sO').innerHTML=L.map((o,i)=>`<button style="width:auto;padding:0 14px;border-radius:12px;background:#2a2a2a;color:#fff" data-i="${i}" aria-pressed="${(ST.look.outfit|0)===i}">${o.name}</button>`).join('');$('sO').onclick=e=>{const b=e.target.closest('button');if(!b)return;ST.look.outfit=+b.dataset.i;outfitSw();applyOutfit()}}
// ---- character loading overlay (spinner + percentage while a VRoid model and its animations download)
let CL_T=0;
function charLoading(url){C.CL_URL=url;const el=$('charLoad');if(!el)return;clearInterval(CL_T);if(!url){el.hidden=true;return}el.hidden=false;const tick=()=>{const p=vrmProgress(url);$('clPct').textContent=p?Math.round(p.p*100)+'%':'0%';$('clBar').style.width=(p?p.p*100:3)+'%';$('clText').textContent=p&&p.stage==='anims'?'Getting her moves ready…':'Loading character…';if(p&&p.stage==='done'){clearInterval(CL_T)}};tick();CL_T=setInterval(tick,150)}
function charReady(){CHAR_WAIT=false;charLoading(null);$('lO').textContent='Outfit';if(!P.ride)C.me.visible=true;setCreatorMode()}
async function applyOutfit(){const L=outfitList(),tok=++C.outTok;if(!L.length){if(C.PV){C.PV=null;rebuildMe()}charReady();colorRows();return}
 const o=L[Math.min(ST.look.outfit|0,L.length-1)];let v;
 charLoading(vrmUrl(o.file));if(C.creating){C.me.visible=false;CHAR_WAIT=true;setCreatorMode();$('lO').textContent='Outfit (loading…)';$('vcRows').style.display='none'}else toast('Loading character…');
 try{v=await loadVRM(vrmUrl(o.file))}catch(e){console.warn('VRM load failed',e);if(tok===C.outTok){C.PV=null;rebuildMe();charReady();colorRows();toast('Could not load the character file')}return}
 if(tok!==C.outTok)return;C.PV=v;rebuildMe();charReady();applyColors();colorRows();if(!C.creating)toast(o.name+' equipped!')}
async function initChars(){C.me.visible=false;setCreatorMode();try{if(VQ)C.CHARS={male:[{name:'Test',file:VQ}],female:[{name:'Test',file:VQ}]};else{const r=await fetch('models/characters.json',{cache:'no-cache'});if(!r.ok){charReady();return}C.CHARS=await r.json()}outfitSw();await applyOutfit()}catch(e){console.warn('characters.json',e);charReady()}}
function rebuildMe(){const v=C.me.visible,pos=C.me.position.clone(),ry=C.me.rotation.y;scene.remove(C.me);C.me=makeMe();C.me.position.copy(pos);C.me.rotation.y=ry;C.me.visible=v;scene.add(C.me);save()}
if(!ST.role)ST.role='Explorer';roleSw();genderSw();swatches('sS',SKINSW,'skin');swatches('sT',TOPSW,'top');swatches('sB',BOTSW,'bottom');presetSw();$('sMoney').textContent='₹'+ST.money.toLocaleString('en-IN');$('nm').value=ST.name;
return {TOPV,CAMV,CLOSE,CYAW,CWALK,CPHONE,sTab,CV,setZoom,lookPayload,heroRows,startMultiplayer,openChat,outfitList,outfitSw,applyOutfit,initChars,rebuildMe};
}
