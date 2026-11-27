// Moved out of game.js unchanged; shared names arrive through the context object C (see game.js).
export function makeInstall(C) {
const {$,backToCreator,logout,setMenu,showAuth,store,toast} = C;
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
return {doInstall};
}
