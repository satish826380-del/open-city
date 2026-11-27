// Billboard admin page. Nothing links here from the game. Hiding it is not the protection: the database's
// row-level security refuses every change unless the signed-in user is listed in sc_admins.
import {getSupa, loginEmail, logout} from './auth.js?v=3';
import {SPOTS, spotByCode} from './spots.js?v=2';

const $ = id => document.getElementById(id);
const say = t => { $('msg').textContent = t || '' };
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e }; // text only, never HTML
let sb = null, rows = [];

const spotName = s => `${s.code} · ${s.type === 'big' ? 'Big' : 'Lamp'} · ${s.area}`;
const takenBy = (code, exceptId) => rows.find(r => r.status === 'approved' && r.spot === code && r.id !== exceptId);
function spotSelect(value, ownId) {
  const sel = el('select', {ariaLabel: 'Spot'});
  for (const s of SPOTS) { const t = takenBy(s.code, ownId); sel.append(el('option', {value: s.code, disabled: !!t, textContent: spotName(s) + (t ? ` (taken: ${t.startup})` : '')})) }
  sel.value = value; if (takenBy(value, ownId)) { const free = SPOTS.find(s => !takenBy(s.code, ownId)); sel.value = free ? free.code : '' }
  return sel;
}

async function run(query, done) {
  const {data, error} = await query.select('id');
  if (error) say(/sc_spot_one_per_spot|duplicate/i.test(error.message) ? 'That spot is already taken' : error.message);
  else if (!data.length) say('Nothing changed: this account is not allowed to do that');
  else say(done);
  await load();
}
const table = () => sb.from('sc_spot_requests');

function card(r) {
  const sel = spotSelect(r.spot, r.id);
  const info = el('div', {className: 'grow'}, el('b', {textContent: r.startup}), el('small', {textContent: [r.tagline, r.url, `asked for spot ${r.spot}`].filter(Boolean).join(' · ')}));
  const pending = r.status === 'pending';
  const ok = el('button', {textContent: pending ? 'Approve' : 'Move', onclick: () => run(table().update({status: 'approved', spot: sel.value}).eq('id', r.id), `${r.startup} is on spot ${sel.value}`)});
  const no = el('button', {className: 'no', textContent: pending ? 'Reject' : 'Remove', onclick: () => {
    if (pending) run(table().update({status: 'rejected'}).eq('id', r.id), 'Request rejected');
    else if (confirm(`Remove ${r.startup} from spot ${r.spot}?`)) run(table().delete().eq('id', r.id), 'Removed');
  }});
  return el('div', {className: 'row'}, info, sel, ok, no);
}

function drawMap() {
  const c = $('map'), x = c.getContext('2d'), X = wx => (wx + 340) * 640 / 720, Y = wz => (wz + 420) * 640 / 720;
  x.clearRect(0, 0, 640, 640);
  x.strokeStyle = '#33505a'; x.lineWidth = 6;
  for (const r of [-120, -40, 40, 120]) { x.beginPath(); x.moveTo(X(r), Y(-170)); x.lineTo(X(r), Y(165)); x.moveTo(X(-170), Y(r)); x.lineTo(X(170), Y(r)); x.stroke() }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 11px system-ui';
  for (const s of SPOTS) {
    x.fillStyle = takenBy(s.code) ? '#0f766e' : '#e8742a'; const big = s.type === 'big', w = big ? 24 : 16, h = big ? 18 : 13;
    x.fillRect(X(s.x) - w / 2, Y(s.z) - h / 2, w, h); x.fillStyle = '#fff'; x.fillText(s.code, X(s.x), Y(s.z));
  }
  c.onclick = e => {
    const b = c.getBoundingClientRect(), px = (e.clientX - b.left) * 640 / b.width, py = (e.clientY - b.top) * 640 / b.height;
    const s = SPOTS.map(s => [s, Math.hypot(X(s.x) - px, Y(s.z) - py)]).sort((a, b) => a[1] - b[1])[0];
    if (s[1] > 18) return;
    const t = takenBy(s[0].code);
    if (t) return say(`Spot ${s[0].code}: ${t.startup}`);
    $('aSpot').value = s[0].code; say(`Spot ${spotName(s[0])} selected`);
  };
}

// ---------- players ----------
function playerCard(p) {
  const info = el('div', {className: 'grow'}, el('b', {textContent: p.email || '(no email)'}), el('small', {textContent: `${p.name || 'no name'} · ${p.status} · joined ${new Date(p.created_at).toLocaleDateString()}`}));
  const set = (status, label, cls) => el('button', {textContent: label, className: cls || '', onclick: () => {
    sb.from('sc_players').update({status}).eq('user_id', p.user_id).select('user_id').then(({data, error}) => {
      say(error ? error.message : data.length ? `${p.email} is now ${status}` : 'Nothing changed'); loadPlayers();
    });
  }});
  return el('div', {className: 'row'}, info, ...(p.status !== 'approved' ? [set('approved', 'Approve')] : []), ...(p.status !== 'blocked' ? [set('blocked', 'Block', 'no')] : []));
}
async function loadPlayers() {
  const {data, error} = await sb.from('sc_players').select('user_id,email,name,status,created_at').order('created_at', {ascending: false}).limit(500);
  if (error) return $('players').replaceChildren(el('p', {textContent: /does not exist|schema cache/i.test(error.message) ? 'Player approval is not set up yet: run supabase/players.sql' : error.message}));
  const group = (title, status) => { const list = data.filter(p => p.status === status); return list.length ? [el('h3', {textContent: `${title} (${list.length})`}), ...list.map(playerCard)] : [] };
  const all = [...group('Waiting', 'pending'), ...group('Approved', 'approved'), ...group('Blocked', 'blocked')];
  $('players').replaceChildren(...(all.length ? all : [el('p', {textContent: 'No players have signed in yet.'})]));
}

async function load() {
  loadPlayers();
  const {data, error} = await table().select('id,spot,startup,tagline,url,status').in('status', ['pending', 'approved']).order('id');
  if (error) return say(/does not exist|schema cache/i.test(error.message) ? 'The database is not set up yet: run supabase/billboards.sql' : error.message);
  rows = data;
  const fill = (id, list, none) => $(id).replaceChildren(...(list.length ? list.map(card) : [el('p', {textContent: none})]));
  fill('pending', rows.filter(r => r.status === 'pending'), 'No requests waiting.');
  fill('live', rows.filter(r => r.status === 'approved').sort((a, b) => a.spot - b.spot), 'No startups yet.');
  const chosen = $('aSpot').value; const fresh = spotSelect(chosen || SPOTS[0].code); $('aSpot').replaceChildren(...fresh.children); $('aSpot').value = fresh.value;
  drawMap();
}

async function show() {
  $('panel').hidden = true; $('login').hidden = true;
  const {data: {session}} = await sb.auth.getSession();
  if (!session) { $('login').hidden = false; return }
  const {data: isAdmin, error} = await sb.rpc('sc_is_admin');
  if (error || isAdmin !== true) {
    say(error ? 'The database is not set up yet: run supabase/billboards.sql' : 'This account is not an admin.');
    $('login').hidden = false; return;
  }
  say(''); $('panel').hidden = false; await load();
}

$('login').onsubmit = async e => {
  e.preventDefault(); say('Logging in…');
  try { await loginEmail($('email').value, $('pass').value); $('pass').value = ''; say(''); await show() }
  catch (err) { say(err.message) }
};
$('out').onclick = async () => { await logout(); say('Logged out'); await show() };
$('add').onsubmit = e => {
  e.preventDefault();
  const url = $('aUrl').value.trim();
  if (url && !/^https:\/\/[^\s<>"]+$/i.test(url)) return say('The website must start with https://');
  run(table().insert({spot: $('aSpot').value, startup: $('aName').value.trim(), tagline: $('aTag').value.trim(), url, status: 'approved'}), 'Added to the billboard').then(() => e.target.reset());
};

sb = await getSupa();
if (!sb) say('Supabase is not configured (net-config.js).'); else show();
