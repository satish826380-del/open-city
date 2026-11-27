// Moved out of game.js unchanged; shared names arrive through the context object C (see game.js).
export function makeOverlays(C) {
const {$,BILLS,DMAP,K,SOC,SPOTS,T,addColl,blocked,buildBoards,camera,doWave,esc,roleInfo,scene,setGPS,setMenu,spotByCode,store,toast,togglePhone} = C;
const BOARDS=buildBoards({scene,addColl,blocked:(x,z,r)=>blocked(x,z,r)||DMAP.lines.some(L=>L.pts.some(p=>Math.hypot(p[0]-x,p[1]-z)<L.w/2+3.5))});let SPOT_PICK='';
// ---- player card: tap another player to see who they are and connect
let CARD=null;
async function showPlayer(p){CARD=p;for(const k in K)K[k]=false;const [,emo,col]=roleInfo(p.role);
 $('pcAv').textContent=(p.name||'?')[0].toUpperCase();$('pcAv').style.background=col;$('pcName').textContent=p.name||'Player';
 $('pcRole').textContent=emo+' '+(p.role||'Explorer');$('pcRole').style.setProperty('--rc',col);$('pcStartup').textContent=p.startup?'🚀 '+p.startup:'';$('pcPitch').textContent='';$('pcMsg').textContent='';
 const b=$('pcConnect');b.hidden=!p.uid||p.uid===C.AUTH.id;b.disabled=true;b.textContent='…';$('playerCard').hidden=false;
 if(!p.uid){$('pcMsg').textContent='This player is not logged in.';return}
 try{const [prof]=await Promise.all([SOC.peek(p.uid),SOC.refreshConns()]);if(CARD!==p)return;
  if(prof){$('pcPitch').textContent=prof.pitch||'';if(prof.startup)$('pcStartup').textContent='🚀 '+prof.startup+(prof.stage?' · '+prof.stage:'');if(prof.looking_for&&prof.looking_for.length)$('pcMsg').textContent='Looking for: '+prof.looking_for.join(', ')}
  const st=SOC.status(p.uid);b.disabled=st==='sent'||st==='connected';b.textContent={none:'🤝 Connect',sent:'⏳ Request sent',incoming:'✅ Accept request',connected:'✔ Connected'}[st]||'🤝 Connect';b.dataset.st=st}
 catch(err){b.disabled=false;b.textContent='🤝 Connect';b.dataset.st='none'}}
function closePlayer(){$('playerCard').hidden=true;CARD=null}
$('pcClose').onclick=closePlayer;$('playerCard').onclick=e=>{if(e.target.id==='playerCard')closePlayer()};
$('pcConnect').onclick=async()=>{const p=CARD;if(!p)return;const b=$('pcConnect');
 if(b.dataset.st==='incoming'){closePlayer();C.APP='network';togglePhone(true);return}
 b.disabled=true;try{await SOC.connect(p.uid);b.textContent='⏳ Request sent';b.dataset.st='sent'}catch(err){$('pcMsg').textContent=err.message;b.disabled=false}};
$('pcMeet').onclick=()=>{if(CARD&&C.NETAPI)C.NETAPI.meet(CARD.id);toast('📍 Asked '+(CARD?CARD.name:'them')+' to meet');closePlayer()};
$('pcWave').onclick=()=>{doWave();closePlayer()};
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('playerCard').hidden){e.stopImmediatePropagation();closePlayer()}},true);
// ---- first-time walkthrough
const TOUR=[['👋','Welcome to Startup City','Everyone arrives here at the Startup Café, the place to meet founders, developers and investors.'],
 ['🕹️','Moving around','Walk with WASD or the joystick, run with Shift or Run, and drag the screen to look around. Press E next to a car or auto to drive it.'],
 ['📱','Your phone','Press P or tap Phone. Fill in your Profile with your startup, then open Nearby to see who is close to you.'],
 ['🤝','Meet people','Tap another player to see their card and Connect. Network suggests people who match what you are looking for.'],
 ['📢','Billboards','Tap any billboard to see the startup and its website. Free boards say "Take this spot": request one for your startup.']];
let tourI=0;
function showTour(i){tourI=i;const [ic,t,d]=TOUR[i];$('tIcon').textContent=ic;$('tTitle').textContent=t;$('tText').textContent=d;$('tStep').textContent=(i+1)+' / '+TOUR.length;$('tNext').textContent=i===TOUR.length-1?"Let's go!":'Next →';$('tourBox').hidden=false}
function endTour(){$('tourBox').hidden=true;store.set('mn2_tour',1)}
$('tNext').onclick=()=>tourI<TOUR.length-1?showTour(tourI+1):endTour();$('tSkip').onclick=endTour;
$('pmTour').onclick=()=>{setMenu(false);showTour(0)};
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
  const pl=C.NETAPI&&C.NETAPI.pick?C.NETAPI.pick(ray):null;if(pl&&(!spot||pl.d<spot.distance)&&(!old||pl.d<old.distance))return{player:pl};
  if(old&&(!spot||old.distance<spot.distance))return{old:BILLS.find(b=>b.face===old.object)};return spot&&spot.spot?{spot:spot.spot}:null};
 cv.addEventListener('pointerup',e=>{const d=down;down=null;if(!d||d.id!==e.pointerId||!C.started||C.creating||C.phoneOn||C.MENU||C.mapOn||C.photo||Math.hypot(e.clientX-d.x,e.clientY-d.y)>8||performance.now()-d.t>500)return;
  const h=hitAt(e);if(!h)return;if(h.player){showPlayer(h.player);return}if(h.spot)viewSpot(h.spot);else{const en=h.old.entry||{};showBoard({image:to=>{to.width=1024;to.height=512;to.getContext('2d').drawImage(h.old.cv,0,0)},title:en.title,tagline:en.tagline,url:en.url})}});
 let hoverT=0;cv.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||e.buttons||performance.now()-hoverT<120||!C.started||C.creating)return;hoverT=performance.now();cv.style.cursor=hitAt(e)?'pointer':''})}
const loadSpots=()=>{if(!document.hidden)SOC.spots().then(r=>BOARDS.update(r)).catch(()=>{})};loadSpots();setInterval(loadSpots,60000);
function openSpot(code){SPOT_PICK=code;C.APP='bill';togglePhone(true)}
// the phone's Billboard screen: take a spot, see your request, and browse who is where
async function spotApp(a){a.innerHTML='<p class="empty">Loading…</p>';const[rows,mine]=await Promise.all([SOC.spots(),SOC.myRequests()]);if(C.APP!=='bill'||!C.phoneOn)return;BOARDS.update(rows);
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
return {BOARDS,showTour,viewSpot,loadSpots,spotApp};
}
