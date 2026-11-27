// Moved out of game.js unchanged; shared names arrive through the context object C (see game.js).
export function makeLogin(C) {
const {$,K,P,PI,SOC,ST,audioInit,backToCreator,blocked,currentUser,groundY,isAdmin,loadSpots,loginEmail,logout,lookPayload,onAuth,playerStatus,resetPassword,sTab,save,setMenu,setNewPassword,showTour,signUpEmail,startMultiplayer,store,toast} = C;
let LG_MODE='in';
function showAuth(u,ev){const wasIn=C.AUTH.kind==='email'||C.AUTH.kind==='google';C.AUTH=u&&u.kind!=='guest'?u:{kind:'none'}; // old guest sessions count as logged out
 SOC.setUser(C.AUTH);showContinue();const k=C.AUTH.kind,inn=k==='google'||k==='email';
 $('lgState').textContent=k==='google'?'✅ Logged in: '+(C.AUTH.email||''):k==='email'?'✅ Logged in: '+C.AUTH.email:k==='offline'?'Offline mode (net-config.js is empty)':'Log in or create an account to enter the city';
 $('lgForm').hidden=inn||k==='offline';$('lgOut').hidden=k==='none'||k==='offline';
 if(inn&&C.AUTH.name&&(!$('nm').value||$('nm').value==='Satish'))$('nm').value=C.AUTH.name.split(' ')[0].slice(0,16);
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
// everyone arrives in the same place, the square in front of the Startup Café, so new players find each other
function randomSpawn(){const opts=SPAWNS.filter(s=>s.n==='Startup Café');
 for(let k=0;k<30;k++){const s=opts[Math.floor(Math.random()*opts.length)],x=s.x+(Math.random()-.5)*9,z=s.z+(Math.random()-.5)*9;if(blocked(x,z,.6))continue;
  P.x=x;P.z=z;P.y=groundY(x,z);P.vy=0;P.yaw=Math.random()*PI*2;C.camYaw=P.yaw+PI;C.me.position.set(P.x,P.y,P.z);C.me.rotation.y=P.yaw;return s.n}return null}
function showContinue(){const b=$('cont');if(!b)return;const ok=C.AUTH&&(C.AUTH.kind==='google'||C.AUTH.kind==='email')&&!SPAWNED;b.hidden=!ok;if(ok)$('contName').textContent=ST.name||'Player'}
$('cont').onclick=()=>$('go').click();
// ---- admin: the same login as everyone; if the account is an admin, an extra button opens the panel inside the game
let ADMIN_ID=null;
function checkAdmin(){const id=C.AUTH.kind==='email'||C.AUTH.kind==='google'?C.AUTH.id:'';if(id===ADMIN_ID)return;ADMIN_ID=id;
 const show=v=>{$('sAdmin').hidden=$('pmAdmin').hidden=!v;if(!v)closeAdmin()};show(false);
 if(id)isAdmin().then(ok=>{if(ADMIN_ID===id)show(ok)}).catch(()=>{ADMIN_ID=null})}
function openAdmin(){if(C.MENU)setMenu(false);for(const k in K)K[k]=false;$('adminFrame').src='admin.html';$('adminView').hidden=false}
function closeAdmin(){if($('adminView').hidden)return;$('adminView').hidden=true;$('adminFrame').removeAttribute('src');if(typeof loadSpots==='function')loadSpots()}
$('sAdmin').onclick=$('pmAdmin').onclick=openAdmin;$('adminClose').onclick=closeAdmin;
// ---- only accounts the admin has approved may enter
let APPROVED='',CHECKING=false; // holds the account id that has been approved
const WAIT_TEXT={pending:'Your account is waiting for the admin to approve it. Press Start again after approval.',blocked:'This account is not allowed to play.',login:'Log in with email to enter the city',error:'Could not check your approval. Check your internet and try again.'};
async function askApproval(){if(CHECKING)return;CHECKING=true;lgErr('');lgMsg('Checking your account…');
 const s=await playerStatus($('nm').value).catch(()=>'error');CHECKING=false;lgMsg('');
 if(s==='approved'){APPROVED=C.AUTH.id;$('go').click()}else{sTab('account');lgErr(WAIT_TEXT[s]||WAIT_TEXT.error)}}
// if the admin blocks someone who is already playing, send them back to the start screen
setInterval(async()=>{if(!APPROVED||!C.started||C.creating||document.hidden)return;const s=await playerStatus(ST.name).catch(()=>'error');
 if(s==='blocked'||s==='pending'){APPROVED='';backToCreator();sTab('account');lgErr(WAIT_TEXT[s])}},60000);
$('go').onclick=()=>{if(C.AUTH.kind==='none'){sTab('account');lgErr('Log in or sign up to enter the city');return}
 if(C.AUTH.kind!=='offline'&&APPROVED!==C.AUTH.id){askApproval();return}ST.name=($('nm').value||'Satish').trim().slice(0,16);if(!SPAWNED){SPAWNED=true;if(!AT_PARAM){const n=randomSpawn();if(n)setTimeout(()=>toast('📍 You arrived at '+n),2600)}}$('cont').hidden=true;if(SOC.S.uid&&(!SOC.S.me||SOC.S.me.name!==ST.name||SOC.S.me.role!==ST.role))SOC.quickRole(ST.role||'Explorer',ST.name,lookPayload());if(C.NETAPI)C.NETAPI.retrack();setTimeout(startMultiplayer,300);C.creating=false;C.started=true;document.body.classList.remove('creating');$('start').style.display='none';audioInit();save();toast('Welcome '+ST.name+'! Open the phone (P) to pick a job');if(!store.get('mn2_tour'))setTimeout(()=>showTour(0),2200)};
return {showAuth,AT_PARAM};
}
