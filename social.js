// Startup City networking: profiles with roles, nearby players, connections, private chat, meet-ups, billboard.
// Data lives in Supabase (tables sc_profiles, sc_connections, sc_messages, sc_billboard, all with row-level security).
// Guests can make a profile and browse; connecting and messaging need an email or Google account.
import {getSupa} from './auth.js?v=3';

export const ROLES = [
  ['Founder', '🚀', '#ff8a2a'], ['Co-founder', '🤝', '#ffb020'], ['Developer', '💻', '#37b6ff'], ['Designer', '🎨', '#ff6fb1'],
  ['Marketer', '📣', '#2ecc71'], ['Product', '🧭', '#b07cff'], ['Investor', '💰', '#f5d33b'], ['Mentor', '🧠', '#2fd6c0'],
  ['Student', '🎓', '#8f9bff'], ['Job seeker', '🔎', '#c0c6cc'], ['Explorer', '🗺️', '#d9dde2'],
];
export const roleInfo = r => ROLES.find(x => x[0] === r) || ROLES[ROLES.length - 1];
const STAGES = ['Idea', 'MVP', 'Revenue', 'Funded'];
const LOOKING = ['Co-founder', 'Developer', 'Designer', 'Funding', 'Mentor', 'Users', 'Job'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const ago = t => { const s = (Date.now() - new Date(t)) / 1000; return s < 60 ? 'now' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd' };

export function initSocial(G) {
  // G: {toast(t), net() -> NETAPI|null, setGPS(x,z,label), local() -> {name, role}, onProfile(p), rerender()}
  const S = {sb: null, uid: null, guest: true, me: null, cache: new Map(), conns: [], threads: new Map(), unread: new Map(), chatWith: null, ch: null, busy: false, err: ''};
  const api = {S, ROLES, roleInfo};
  const sb = async () => S.sb || (S.sb = await getSupa());
  const mustReal = () => { if (!S.uid) throw new Error('Log in first (Menu → Change character)'); if (S.guest) throw new Error('Guests can look around. Log in with email or Google to connect and chat.') };

  // ---------- account ----------
  api.setUser = async auth => {
    const s = await sb(); if (!s) return;
    const uid = auth && (auth.kind === 'guest' || auth.kind === 'google' || auth.kind === 'email') ? auth.id : null;
    if (uid === S.uid) return; S.uid = uid; S.guest = auth && auth.kind === 'guest'; S.me = null; S.conns = []; S.threads.clear(); S.unread.clear();
    if (S.ch) { s.removeChannel(S.ch); S.ch = null }
    if (!uid) { G.rerender(); return }
    const {data} = await s.from('sc_profiles').select('*').eq('id', uid).maybeSingle();
    S.me = data || null; if (S.me) { S.cache.set(uid, S.me); G.onProfile(S.me) }
    await loadConns(); await loadUnread(); listen(); G.rerender();
  };
  api.saveProfile = async f => {
    const s = await sb(); if (!s || !S.uid) throw new Error('Log in first to save your profile');
    const row = {id: S.uid, name: String(f.name || 'Player').trim().slice(0, 40) || 'Player', role: roleInfo(f.role)[0], startup: (f.startup || '').trim().slice(0, 60) || null,
      pitch: (f.pitch || '').trim().slice(0, 160) || null, stage: STAGES.includes(f.stage) ? f.stage : null,
      skills: String(f.skills || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 10).map(x => x.slice(0, 24)),
      looking_for: (f.looking || []).filter(x => LOOKING.includes(x)).slice(0, 6),
      linkedin: /^https?:\/\//i.test((f.linkedin || '').trim()) ? f.linkedin.trim().slice(0, 200) : null, look: f.look || {}, updated_at: new Date().toISOString()};
    const {data, error} = await s.from('sc_profiles').upsert(row).select().single();
    if (error) throw new Error(error.message);
    S.me = data; S.cache.set(S.uid, data); G.onProfile(data); return data;
  };
  // keep the role in sync when it is picked on the start screen
  api.quickRole = async (role, name, look) => { if (!S.uid) return; try { await api.saveProfile(Object.assign({}, S.me || {}, {role, name, look, looking: (S.me && S.me.looking_for) || [], skills: ((S.me && S.me.skills) || []).join(', ')})) } catch (e) { console.warn('[social] role', e.message) } };

  async function profiles(uids) {
    const need = [...new Set(uids)].filter(u => u && !S.cache.has(u)); const s = await sb();
    if (need.length && s && S.uid) { const {data} = await s.from('sc_profiles').select('*').in('id', need.slice(0, 100)); for (const p of data || []) S.cache.set(p.id, p) }
    return uids.map(u => S.cache.get(u)).filter(Boolean);
  }
  api.profile = uid => S.cache.get(uid);

  // ---------- connections ----------
  async function loadConns() { const s = await sb(); if (!s || !S.uid) return; const {data} = await s.from('sc_connections').select('*').order('created_at', {ascending: false}); S.conns = data || []; await profiles(S.conns.map(c => c.requester === S.uid ? c.addressee : c.requester)) }
  const other = c => c.requester === S.uid ? c.addressee : c.requester;
  const connWith = uid => S.conns.find(c => other(c) === uid);
  api.status = uid => { const c = connWith(uid); return !c ? 'none' : c.status === 'accepted' ? 'connected' : c.requester === S.uid ? 'sent' : 'incoming' };
  api.connect = async uid => { mustReal(); const s = await sb(); const {error} = await s.from('sc_connections').insert({requester: S.uid, addressee: uid}); if (error) throw new Error(/sc_profiles|foreign key/i.test(error.message) ? 'They have not saved a profile yet' : /duplicate|unique/i.test(error.message) ? 'Already requested' : error.message); await loadConns(); G.toast('🤝 Connection request sent') };
  api.accept = async id => { const s = await sb(); const {error} = await s.from('sc_connections').update({status: 'accepted'}).eq('id', id); if (error) throw new Error(error.message); await loadConns(); G.toast('🤝 Connected!') };
  api.remove = async id => { const s = await sb(); await s.from('sc_connections').delete().eq('id', id); await loadConns() };

  // ---------- messages ----------
  async function loadUnread() { const s = await sb(); if (!s || !S.uid) return; const {data} = await s.from('sc_messages').select('sender').eq('receiver', S.uid).is('read_at', null).limit(200); S.unread.clear(); for (const m of data || []) S.unread.set(m.sender, (S.unread.get(m.sender) || 0) + 1) }
  api.unreadTotal = () => { let n = 0; for (const v of S.unread.values()) n += v; return n };
  async function loadThread(uid) {
    const s = await sb(); const {data} = await s.from('sc_messages').select('*').or(`and(sender.eq.${S.uid},receiver.eq.${uid}),and(sender.eq.${uid},receiver.eq.${S.uid})`).order('created_at', {ascending: false}).limit(60);
    S.threads.set(uid, (data || []).reverse());
    if (S.unread.get(uid)) { S.unread.delete(uid); s.from('sc_messages').update({read_at: new Date().toISOString()}).eq('receiver', S.uid).eq('sender', uid).is('read_at', null).then(() => {}) }
  }
  api.send = async (uid, body) => {
    mustReal(); body = String(body || '').trim().slice(0, 500); if (!body) return;
    if (api.status(uid) !== 'connected') throw new Error('Connect first to send messages');
    const s = await sb(); const {data, error} = await s.from('sc_messages').insert({sender: S.uid, receiver: uid, body}).select().single();
    if (error) throw new Error(/slow down/i.test(error.message) ? 'Too many messages, slow down' : error.message);
    (S.threads.get(uid) || S.threads.set(uid, []).get(uid)).push(data);
  };
  function listen() {
    if (!S.sb || !S.uid) return;
    S.ch = S.sb.channel('sc-inbox-' + S.uid)
      .on('postgres_changes', {event: 'INSERT', schema: 'public', table: 'sc_messages', filter: `receiver=eq.${S.uid}`}, async ({new: m}) => {
        const t = S.threads.get(m.sender); if (t) t.push(m);
        if (S.chatWith === m.sender && G.phoneApp() === 'thread') { S.sb.from('sc_messages').update({read_at: new Date().toISOString()}).eq('id', m.id).then(() => {}) }
        else S.unread.set(m.sender, (S.unread.get(m.sender) || 0) + 1);
        const [p] = await profiles([m.sender]); G.toast('💬 ' + (p ? p.name : 'New message') + ': ' + String(m.body).slice(0, 40)); G.rerender();
      })
      .on('postgres_changes', {event: '*', schema: 'public', table: 'sc_connections', filter: `addressee=eq.${S.uid}`}, async ev => { await loadConns(); if (ev.eventType === 'INSERT') { const [p] = await profiles([ev.new.requester]); G.toast('🤝 ' + (p ? p.name : 'Someone') + ' wants to connect') } G.rerender() })
      .on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'sc_connections', filter: `requester=eq.${S.uid}`}, async ev => { await loadConns(); if (ev.new.status === 'accepted') { const [p] = await profiles([ev.new.addressee]); G.toast('🤝 ' + (p ? p.name : 'Someone') + ' accepted your request') } G.rerender() })
      .subscribe();
  }

  // ---------- billboard ----------
  api.billboard = async () => { const s = await sb(); if (!s) return []; const {data} = await s.from('sc_billboard').select('title,tagline,url,image_url,bg,fg').eq('active', true).order('sort').limit(20); return data || [] };

  // ---------- phone apps ----------
  const chip = r => { const [n, e, c] = roleInfo(r); return `<span class="rchip" style="--rc:${c}">${e} ${esc(n)}</span>` };
  const card = (p, extra = '') => `<div class="pcard"><div class="pav" style="--rc:${roleInfo(p.role)[2]}">${esc((p.name || '?')[0].toUpperCase())}</div><div class="pinfo"><b>${esc(p.name)}</b> ${chip(p.role)}${p.startup ? `<div class="pst">${esc(p.startup)}${p.stage ? ` · <i>${esc(p.stage)}</i>` : ''}</div>` : ''}${p.pitch ? `<div class="ppitch">${esc(p.pitch)}</div>` : ''}${extra}</div></div>`;
  const loginNote = () => !S.uid ? '<p class="note">🔐 Log in (Menu → Change character) to save a profile, connect and chat.</p>' : S.guest ? '<p class="note">👤 You are a guest. Log in with email or Google to connect and chat.</p>' : '';

  api.render = async (app, el) => {
    if (app === 'profile') {
      const p = S.me || {name: G.local().name, role: G.local().role, looking_for: [], skills: []};
      el.innerHTML = `${loginNote()}<form class="pform" data-s="saveProfile">
        <label>Name<input name="name" maxlength="40" value="${esc(p.name)}"></label>
        <label>Your role</label><div class="rpick">${ROLES.map(([n, e, c]) => `<button type="button" data-s="pickRole" data-v="${esc(n)}" style="--rc:${c}" aria-pressed="${p.role === n}">${e} ${esc(n)}</button>`).join('')}</div><input type="hidden" name="role" value="${esc(p.role || 'Explorer')}">
        <label>Startup name<input name="startup" maxlength="60" value="${esc(p.startup || '')}" placeholder="e.g. ChaiPay"></label>
        <label>One-line pitch<textarea name="pitch" maxlength="160" rows="2" placeholder="What are you building?">${esc(p.pitch || '')}</textarea></label>
        <label>Stage<select name="stage"><option value="">—</option>${STAGES.map(s => `<option ${p.stage === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label>Skills (comma separated)<input name="skills" maxlength="200" value="${esc((p.skills || []).join(', '))}" placeholder="React, sales, design"></label>
        <label>Looking for</label><div class="lpick">${LOOKING.map(l => `<label class="tick"><input type="checkbox" name="looking" value="${l}" ${(p.looking_for || []).includes(l) ? 'checked' : ''}>${l}</label>`).join('')}</div>
        <label>LinkedIn / website<input name="linkedin" maxlength="200" value="${esc(p.linkedin || '')}" placeholder="https://"></label>
        <button type="submit" ${S.uid ? '' : 'disabled'}>💾 Save profile</button></form>`;
      return;
    }
    if (app === 'nearby') {
      const net = G.net(), list = net && net.nearby ? net.nearby() : [];
      await profiles(list.map(r => r.uid));
      el.innerHTML = loginNote() + (list.length ? list.map(r => { const p = S.cache.get(r.uid) || {name: r.name, role: r.role, startup: r.startup}; const st = r.uid ? api.status(r.uid) : 'none';
        const btns = `<div class="pbtns"><button data-s="meet" data-id="${esc(r.id)}">📍 Meet</button><button data-s="wave" data-id="${esc(r.id)}">👋</button>${r.uid && r.uid !== S.uid ? (st === 'connected' ? `<button data-s="chat" data-id="${esc(r.uid)}">💬 Chat</button>` : st === 'sent' ? '<button disabled>Requested</button>' : st === 'incoming' ? `<button data-s="accept" data-id="${esc(connWith(r.uid).id)}">✅ Accept</button>` : `<button data-s="connect" data-id="${esc(r.uid)}">🤝 Connect</button>`) : ''}</div>`;
        return card(p, `<div class="pdist">${Math.round(r.d)} m away</div>${btns}`) }).join('') : '<p class="empty">Nobody nearby yet.<br>Walk around the city or visit the <b>Startup Café</b> to meet people.</p><button data-s="cafe">☕ Go to the Startup Café</button>');
      return;
    }
    if (app === 'network') {
      if (!S.uid || S.guest) { el.innerHTML = loginNote(); return }
      await loadConns();
      const inc = S.conns.filter(c => c.status === 'pending' && c.addressee === S.uid), out = S.conns.filter(c => c.status === 'pending' && c.requester === S.uid), ok = S.conns.filter(c => c.status === 'accepted');
      const near = new Map(((G.net() && G.net().nearby && G.net().nearby()) || []).filter(r => r.uid).map(r => [r.uid, r]));
      const row = (c, btns) => { const p = S.cache.get(other(c)) || {name: 'Player', role: 'Explorer'}; const n = near.get(other(c)); return card(p, `${n ? `<div class="pdist">🟢 In the city · ${Math.round(n.d)} m</div>` : ''}<div class="pbtns">${btns(n)}</div>`) };
      el.innerHTML = (inc.length ? `<h4>Requests</h4>` + inc.map(c => row(c, () => `<button data-s="accept" data-id="${c.id}">✅ Accept</button><button class="ghost" data-s="remove" data-id="${c.id}">Decline</button>`)).join('') : '')
        + `<h4>My network (${ok.length})</h4>` + (ok.length ? ok.map(c => row(c, n => `<button data-s="chat" data-id="${other(c)}">💬 Chat</button>${n ? `<button data-s="meet" data-id="${esc(n.id)}">📍 Meet</button>` : ''}`)).join('') : '<p class="empty">No connections yet. Open <b>Nearby</b> and tap Connect.</p>')
        + (out.length ? `<h4>Sent</h4>` + out.map(c => row(c, () => `<button class="ghost" data-s="remove" data-id="${c.id}">Cancel</button>`)).join('') : '');
      return;
    }
    if (app === 'chats') {
      if (!S.uid || S.guest) { el.innerHTML = loginNote(); return }
      await loadConns(); const ok = S.conns.filter(c => c.status === 'accepted');
      el.innerHTML = ok.length ? ok.map(c => { const u = other(c), p = S.cache.get(u) || {name: 'Player', role: 'Explorer'}, n = S.unread.get(u) || 0;
        return `<button class="crow" data-s="chat" data-id="${u}"><span class="pav sm" style="--rc:${roleInfo(p.role)[2]}">${esc((p.name || '?')[0].toUpperCase())}</span><span class="cname"><b>${esc(p.name)}</b><small>${roleInfo(p.role)[1]} ${esc(p.role)}${p.startup ? ' · ' + esc(p.startup) : ''}</small></span>${n ? `<span class="badge">${n}</span>` : ''}</button>` }).join('') : '<p class="empty">Chats appear here once you connect with someone.</p>';
      return;
    }
    if (app === 'thread') {
      const u = S.chatWith; if (!u) { el.innerHTML = ''; return }
      const keep = (el.querySelector('.msgform input') || {}).value || ''; await loadThread(u); const p = S.cache.get(u) || {name: 'Player'}, msgs = S.threads.get(u) || [];
      el.innerHTML = `<div class="thread">${msgs.length ? msgs.map(m => `<div class="msg ${m.sender === S.uid ? 'me' : ''}"><span>${esc(m.body)}</span><small>${ago(m.created_at)}</small></div>`).join('') : `<p class="empty">Say hi to ${esc(p.name)} 👋</p>`}</div>
        <form class="msgform" data-s="sendMsg"><input name="body" maxlength="500" placeholder="Message ${esc(p.name)}…" autocomplete="off"><button type="submit" aria-label="Send">➤</button></form>`;
      const t = el.querySelector('.thread'); t.scrollTop = t.scrollHeight; const inp = el.querySelector('.msgform input'); inp.value = keep; inp.focus();
      return;
    }
  };
  api.title = app => ({profile: 'My Profile', nearby: 'Nearby', network: 'My Network', chats: 'Chats', thread: (S.cache.get(S.chatWith) || {}).name || 'Chat'})[app];
  api.isApp = app => ['profile', 'nearby', 'network', 'chats', 'thread'].includes(app);

  // clicks and form submits inside the phone
  api.handle = async (e, go) => {
    const t = e.target.closest('[data-s]'); if (!t) return false;
    const a = t.dataset.s, id = t.dataset.id;
    if (e.type === 'click' && t.tagName === 'FORM') return false;
    try {
      if (a === 'pickRole') { const f = t.closest('form'); f.role.value = t.dataset.v; f.querySelectorAll('.rpick button').forEach(b => b.setAttribute('aria-pressed', b === t)); return true }
      if (a === 'saveProfile') { e.preventDefault(); const f = t; await api.saveProfile({name: f.name.value, role: f.role.value, startup: f.startup.value, pitch: f.pitch.value, stage: f.stage.value, skills: f.skills.value, looking: [...f.querySelectorAll('input[name=looking]:checked')].map(x => x.value), linkedin: f.linkedin.value, look: G.local().look}); G.toast('✅ Profile saved'); return true }
      if (a === 'sendMsg') { e.preventDefault(); const v = t.body.value; t.body.value = ''; await api.send(S.chatWith, v); go('thread'); return true }
      if (a === 'connect') { await api.connect(id); go(); return true }
      if (a === 'accept') { await api.accept(+id); go(); return true }
      if (a === 'remove') { await api.remove(+id); go(); return true }
      if (a === 'chat') { S.chatWith = id; go('thread'); return true }
      if (a === 'meet') { const n = G.net(); const r = n && n.nearby().find(x => x.id === id); if (r) { G.setGPS(r.x, r.z, r.name); n.meet(id); G.toast('📍 GPS set to ' + r.name + ' — they got your meet request') } return true }
      if (a === 'wave') { const n = G.net(); if (n) n.emote('wave'); G.wave(); return true }
      if (a === 'cafe') { G.cafe(); return true }
    } catch (err) { G.toast(err.message || String(err)) }
    return true;
  };
  return api;
}
