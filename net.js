// Multiplayer core.
// - Movement: peer-to-peer WebRTC via Trystero. The map is a grid of NET.cell metre cells; you join the
//   Trystero room of your cell and its 8 neighbours. Peers are shared across rooms, so each update is sent
//   once per peer. 10/s to the nearest NET.nearCap players (only when changed), 1/s to the rest.
// - Supabase (never used for normal movement):
//     'mn-online'          presence, join/leave only  -> online count
//     'mn-z-<zone>#<inst>' presence per 150 m zone, updated on cell change -> instances + who should connect
//     'mn-f-<cell>#<inst>' broadcast, only joined while some nearby player can't connect P2P (1 update/s)
// - Remote players are interpolated 100 ms in the past, extrapolated up to 250 ms, then frozen;
//   shown within 60 m, hidden beyond 70 m, faded in/out over 300 ms, removed after 5 s of silence.
import * as T from 'three';
import {NET} from './net-config.js?v=6';
import {getSupa} from './auth.js?v=3';

// ?bgtest keeps a hidden tab sending (only for testing two tabs on one PC)
const BGTEST = new URLSearchParams(location.search).has('bgtest'), NOP2P = BGTEST && new URLSearchParams(location.search).has('nop2p'); // nop2p: simulate a player whose WebRTC fails
const CHAT_RANGE = NET.chatRange || 20; // metres: chat bubbles only reach players this close
const INTERP = 100, EXTRAP = 250, STALE = 5000, FADE = .3, KEEPALIVE = 2000;
const r2 = v => Math.round(v * 100) / 100;
const wrapPI = a => Math.atan2(Math.sin(a), Math.cos(a)); // shortest turn, for any angle
const cellOf = (x, z) => [Math.floor(x / NET.cell), Math.floor(z / NET.cell)];
const zoneOf = (x, z) => `${Math.floor(x / NET.zone)}_${Math.floor(z / NET.zone)}`;

// name tag: name on top, role (emoji + colour) underneath
const ROLE_TAG = {Founder: ['🚀', '#ff8a2a'], 'Co-founder': ['🤝', '#ffb020'], Developer: ['💻', '#37b6ff'], Designer: ['🎨', '#ff6fb1'], Marketer: ['📣', '#2ecc71'], Product: ['🧭', '#b07cff'], Investor: ['💰', '#f5d33b'], Mentor: ['🧠', '#2fd6c0'], Student: ['🎓', '#8f9bff'], 'Job seeker': ['🔎', '#c0c6cc'], Explorer: ['🗺️', '#d9dde2']};
function nameTag(text, role) {
  const c = document.createElement('canvas'), x = c.getContext('2d'), rt = role && ROLE_TAG[role] ? ROLE_TAG[role][0] + ' ' + role : '';
  x.font = '700 34px "Baloo 2",sans-serif'; const w1 = x.measureText(text).width; x.font = '700 24px "Baloo 2",sans-serif'; const w2 = rt ? x.measureText(rt).width : 0;
  const w = Math.ceil(Math.max(w1, w2)) + 28, h = rt ? 74 : 48; c.width = w; c.height = h;
  x.fillStyle = 'rgba(15,15,20,.74)'; x.beginPath(); x.roundRect ? x.roundRect(0, 0, w, h, 16) : x.rect(0, 0, w, h); x.fill();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffffff'; x.font = '700 34px "Baloo 2",sans-serif'; x.fillText(text, w / 2, 26);
  if (rt) { x.fillStyle = ROLE_TAG[role][1]; x.font = '700 24px "Baloo 2",sans-serif'; x.fillText(rt, w / 2, 56) }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  const s = new T.Sprite(new T.SpriteMaterial({map: t, depthTest: true, fog: false})); s.scale.set(w / 48 * .24, h / 48 * .24, 1); return s;
}

export function startNet(G) {
  // G: {scene, makeAvatar(look), animH(g, speed, dt, state), bubble(text), vehicle(type), local(), onChat(name, text, mine), onStatus(text), greet()}
  const st = {
    online: false, count: 1, inst: 1, zone: '', cell: '', rooms: new Map(), peers: new Map(), remotes: new Map(),
    near: new Set(), last: null, lastSent: 0, slowT: 0, checkT: 0, nearT: 0, emoteUntil: 0, emote: '',
    zoneCh: null, onlineCh: null, fb: new Map(), fbPeers: new Set(), fbIdle: 0, fbSendT: 0, firstSeen: new Map(), zoneMeta: new Map(), zoneLists: new Map(), zoneListen: new Map(), chatT: 0, everyone: new Map(), spot: null, joinSeq: 0, joinAt: 0,
  };
  let TR = null, selfId = '', supa = null;
  const api = {
    get online() { return st.online }, get count() { return st.count }, id: '',
    update() {}, chat() {}, emote() {}, retrack() {},
    stats: () => ({cell: st.cell, inst: st.inst, rooms: [...st.rooms.keys()], p2p: st.peers.size, shown: [...st.remotes.values()].filter(r => r.alpha > 0).length, fallback: st.fbPeers.size, fbChannels: st.fb.size, online: st.count}),
  };
  if (!NET.url || !NET.key) { G.onStatus('Offline · single player'); api.chat = t => { t = String(t || '').trim().slice(0, 120); if (t) G.onChat(G.local().name, t, true) }; return api }

  // Supabase hands back the old channel if the same topic is re-opened while it is still closing, and that
  // channel never delivers anything again. So remember what is closing and open it only once it has gone.
  const closing = new Map();
  function drop(ch) {
    const topic = ch.topic.replace(/^realtime:/, '');
    const done = Promise.resolve(supa.removeChannel(ch)).catch(() => {}).then(() => { closing.delete(topic) });
    closing.set(topic, done);
  }

  const exists = name => supa.getChannels().some(c => c.topic === 'realtime:' + name);

  // ---------- remote player records (one per Trystero peer id; fallback data uses the same id) ----------
  function remote(id) {
    let r = st.remotes.get(id);
    if (!r) {
      r = {id, g: null, tag: null, key: '', name: 'Player', look: {}, buf: [], off: null, seen: performance.now(), alpha: 0, shown: false, spd: 0, anim: 'idle', veh: null, vehType: '', bub: null, bt: 0, animAcc: 0, greetT: 0, src: ''};
      st.remotes.set(id, r);
    }
    return r;
  }
  function build(r) {
    const key = JSON.stringify(r.look || {});
    if (r.g && r.key === key) return;
    const pos = r.g ? r.g.position.clone() : null, ry = r.g ? r.g.rotation.y : 0;
    if (r.g) G.scene.remove(r.g);
    const g = G.makeAvatar(r.look || {});
    // own material copies so this avatar can fade without touching everyone else
    g.traverse(o => { if (o.isMesh || o.isSprite) { o.material = o.material.clone(); o.material.userData.op = o.material.opacity; o.material.userData.tr0 = o.material.transparent } });
    r.tag = nameTag(r.name, r.role); r.tag.position.y = r.role ? 2.02 : 1.95; g.add(r.tag);
    if (pos) { g.position.copy(pos); g.rotation.y = ry }
    g.visible = r.alpha > 0; G.scene.add(g); r.g = g; r.key = key; setAlpha(r, r.alpha);
  }
  function retag(r) { if (r.g) { r.g.remove(r.tag); r.tag = nameTag(r.name, r.role); r.tag.position.y = r.role ? 2.02 : 1.95; r.g.add(r.tag) } }
  function rename(r, name) {
    name = String(name || 'Player').slice(0, 16); if (name === r.name) return; r.name = name;
    retag(r);
  }
  function setAlpha(r, a) {
    r.alpha = a; if (!r.g) return;
    r.g.visible = a > .001;
    const fading = a < .999;
    r.g.traverse(o => { if (o.material) { const m = o.material; m.opacity = (m.userData.op ?? 1) * a; const tr = fading || !!m.userData.tr0; if (m.transparent !== tr && !o.isSprite) { m.transparent = tr; m.needsUpdate = true } } });
    if (r.veh) r.veh.g.visible = r.g.visible;
  }
  function forget(id) {
    const r = st.remotes.get(id); if (!r) return;
    if (r.g) G.scene.remove(r.g); if (r.veh) G.scene.remove(r.veh.g);
    st.remotes.delete(id);
  }
  function say(r, text) { if (!r.g) return; if (r.bub) r.g.remove(r.bub); r.bub = G.bubble(text); r.bub.position.y = 2.32; r.g.add(r.bub); r.bt = 5 }

  // snapshot in: {x,y,z,r,a,t}
  function snap(id, p, src) {
    if (!p || typeof p.x !== 'number' || typeof p.t !== 'number') return;
    if (src === 'fb' && st.peers.has(id)) return; // P2P data wins
    const fresh = !st.remotes.has(id), r = remote(id), now = performance.now();
    if (fresh && st.zoneMeta.has(id)) { const m = st.zoneMeta.get(id); r.name = String(m.n || 'Player').slice(0, 16); r.look = m.l || {}; r.role = m.r || ''; r.uid = m.u || ''; r.startup = m.s || '' } // name/look from presence
    r.src = src; r.seen = now;
    const o = now - p.t; r.off = r.off == null || o < r.off ? o : r.off + (o - r.off) * .02; // clock offset, tracks the fastest packets
    const b = r.buf; if (b.length && p.t <= b[b.length - 1].t) return;
    b.push({t: p.t, x: p.x, y: p.y, z: p.z, r: p.r, a: String(p.a || 'idle').slice(0, 24)});
    if (b.length > 30) b.shift();
    if (!r.g) build(r);
    if (b.length === 1) { r.g.position.set(p.x, p.y, p.z); r.g.rotation.y = p.r }
  }
  // where a remote is now: 100 ms in the past, extrapolate up to 250 ms, then freeze
  const _a = {x: 0, y: 0, z: 0, r: 0};
  function sample(r, now) {
    const b = r.buf; if (!b.length) return null;
    const rt = now - r.off - (r.src === 'fb' ? 1000 / NET.fallbackRate + INTERP : INTERP); // backup updates are less frequent, so look a little further back
    let i = b.length - 1;
    if (rt >= b[i].t) {
      const L = b[i], P = b[i - 1];
      const ex = Math.min(rt - L.t, EXTRAP);
      if (P && L.t - P.t < 1500 && ex > 0) { const k = ex / (L.t - P.t); _a.x = L.x + (L.x - P.x) * k; _a.y = L.y + (L.y - P.y) * k; _a.z = L.z + (L.z - P.z) * k }
      else { _a.x = L.x; _a.y = L.y; _a.z = L.z }
      _a.r = L.r; _a.a = L.a; return _a;
    }
    while (i > 0 && b[i - 1].t > rt) i--;
    if (i === 0) { const F = b[0]; _a.x = F.x; _a.y = F.y; _a.z = F.z; _a.r = F.r; _a.a = F.a; return _a }
    const A = b[i - 1], B = b[i], k = (rt - A.t) / Math.max(1, B.t - A.t);
    _a.x = A.x + (B.x - A.x) * k; _a.y = A.y + (B.y - A.y) * k; _a.z = A.z + (B.z - A.z) * k; _a.r = A.r + wrapPI(B.r - A.r) * k; _a.a = k < .5 ? A.a : B.a;
    return _a;
  }

  // a chat line from another player, over either route: only close players hear it
  function hear(id, d) {
    const t = clean(d && d.t); if (!t) return;
    const r = st.remotes.get(id); if (!r || !r.g || distTo(r) > CHAT_RANGE + 5) return;
    G.onChat(r.name, t, false); say(r, t.slice(0, 60));
  }
  const distTo = r => Math.hypot(r.g.position.x - G.local().x, r.g.position.z - G.local().z);

  // ---------- Trystero: cell rooms ----------
  function roomIds() {
    const L = G.local(), [cx, cz] = cellOf(L.x, L.z), ids = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) ids.push(`cell_${cx + dx}_${cz + dz}#${st.inst}`);
    return ids;
  }
  function joinCell(id) {
    const room = TR.joinRoom({appId: NET.appId, relayConfig: {warnOnRelayFailure: false}}, id, {onJoinError: d => console.info('[net] P2P failed with', d.peerId, d.error && d.error.message)});
    const mv = room.makeAction('mv'), hi = room.makeAction('hi'), ch = room.makeAction('ch'), mt = room.makeAction('mt');
    const R = {room, mv, hi, ch, mt};
    mt.onMessage = (d, {peerId}) => { const r = st.remotes.get(peerId); if (r && r.g && G.onMeet) G.onMeet(r.name, r.g.position.x, r.g.position.z) };
    room.onPeerJoin = pid => {
      let p = st.peers.get(pid);
      if (!p) { p = {rooms: new Set()}; st.peers.set(pid, p) }
      const fresh = p.rooms.size === 0; p.rooms.add(id);
      if (fresh) { st.fbPeers.delete(pid); st.near.add(pid); hi.send(hello(), {target: pid}).catch(() => {}); st.last = null } // introduce ourselves once, then send a full state
    };
    room.onPeerLeave = pid => { const p = st.peers.get(pid); if (!p) return; p.rooms.delete(id); if (!p.rooms.size) st.peers.delete(pid) };
    mv.onMessage = (d, {peerId}) => snap(peerId, d, 'p2p');
    hi.onMessage = (d, {peerId}) => { const r = remote(peerId); const role = d && typeof d.r === 'string' ? d.r.slice(0, 20) : ''; const ch = role !== r.role; r.role = role; r.uid = d && typeof d.u === 'string' ? d.u.slice(0, 40) : ''; r.startup = d && typeof d.s === 'string' ? d.s.slice(0, 60) : ''; rename(r, d && d.n); if (ch) retag(r); r.look = (d && d.l) || {}; build(r) };
    ch.onMessage = (d, {peerId}) => hear(peerId, d);
    st.rooms.set(id, R);
  }
  function syncRooms() {
    if (NOP2P) return;
    const want = new Set(roomIds());
    for (const [id, R] of st.rooms) if (!want.has(id)) {
      R.room.leave(); st.rooms.delete(id);
      for (const [pid, p] of st.peers) { p.rooms.delete(id); if (!p.rooms.size) st.peers.delete(pid) }
    }
    for (const id of want) if (!st.rooms.has(id)) joinCell(id);
  }
  // send one message to a set of peers, once each, through a room they share with us
  function sendTo(action, data, pids) {
    const byRoom = new Map();
    for (const pid of pids) { const p = st.peers.get(pid); if (!p) continue; const rid = p.rooms.values().next().value; if (!rid) continue; (byRoom.get(rid) || byRoom.set(rid, []).get(rid)).push(pid) }
    for (const [rid, list] of byRoom) { const R = st.rooms.get(rid); if (R) R[action].send(data, {target: list}).catch(() => {}) }
  }
  const hello = () => { const L = G.local(); return {n: L.name, l: L.look, r: L.role || '', u: L.uid || '', s: L.startup || ''} };

  // ---------- Supabase presence, instances, fallback ----------
  function presenceList(ch) { const s = ch.presenceState(), out = []; for (const k in s) { const m = s[k][0]; if (m) out.push(m) } return out }
  async function joinZone(zone) {
    if (st.zoneCh) { drop(st.zoneCh); st.zoneCh = null }
    st.zone = zone; st.zoneLists.delete('own'); const seq = ++st.joinSeq;
    for (const [n, ch] of st.zoneListen) if (n.startsWith(`mn-z-${zone}#`)) { drop(ch); st.zoneListen.delete(n); st.zoneLists.delete(n) } // same topic twice would clash
    for (let inst = 1; inst <= 20; inst++) {
      const name = `mn-z-${zone}#${inst}`;
      const old = supa.getChannels().find(c => c.topic === 'realtime:' + name); if (old && !closing.has(name)) drop(old);
      await closing.get(name);
      if (seq !== st.joinSeq || exists(name)) return; // a newer join has taken over
      const ch = supa.channel(`mn-z-${zone}#${inst}`, {config: {presence: {key: selfId}}});
      const ok = await new Promise(res => {
        let done = false; const fin = v => { if (!done) { done = true; res(v) } };
        ch.on('presence', {event: 'sync'}, () => {
          const list = presenceList(ch);
          if (!done) { const others = list.filter(m => m.t !== selfId).length; if (others >= NET.maxArea) { fin(false); return } fin(true) }
          st.zoneLists.set('own', new Map(list.filter(m => m.t && m.t !== selfId).map(m => [m.t, m]))); mergeZones();
        });
        ch.subscribe(async s => {
          if (s === 'SUBSCRIBED') { await ch.track(zoneMeta()); setTimeout(() => fin(true), 2500) }
          if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') fin(true);
        });
      });
      if (seq !== st.joinSeq) { drop(ch); return } // moved on while joining
      if (ok) { st.zoneCh = ch; if (st.inst !== inst) { st.inst = inst; console.info('[net] instance', inst, 'for zone', zone) } return }
      drop(ch); // this instance is full, try the next one
    }
  }
  function mergeZones() { st.zoneMeta = new Map(); for (const l of st.zoneLists.values()) for (const [k, m] of l) st.zoneMeta.set(k, m) }
  // also listen (without tracking) to the zones that touch our 9 cells, so players across a zone border still find each other
  function listenZones() {
    const L = G.local(), [cx, cz] = cellOf(L.x, L.z), want = new Set(), C = NET.cell, Z = NET.zone;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const z = `${Math.floor((cx + dx) * C / Z)}_${Math.floor((cz + dz) * C / Z)}`; if (z !== st.zone) want.add(`mn-z-${z}#${st.inst}`) }
    for (const [n, ch] of st.zoneListen) if (!want.has(n)) { drop(ch); st.zoneListen.delete(n); st.zoneLists.delete(n) }
    for (const n of want) if (!st.zoneListen.has(n) && !closing.has(n) && !exists(n)) {
      const ch = supa.channel(n, {config: {presence: {key: 'l_' + selfId}}});
      ch.on('presence', {event: 'sync'}, () => { st.zoneLists.set(n, new Map(presenceList(ch).filter(m => m.t && m.t !== selfId).map(m => [m.t, m]))); mergeZones() });
      ch.subscribe(); st.zoneListen.set(n, ch);
    }
    mergeZones();
  }
  const zoneMeta = () => { const L = G.local(); return {t: selfId, c: st.cell, n: L.name, l: L.look, r: L.role || '', u: L.uid || '', s: L.startup || ''} };
  function checkFallback(now) {
    // players in our zone + neighbouring cells who still have no WebRTC link after NET.p2pTimeout use the fallback
    const [cx, cz] = cellOf(G.local().x, G.local().z), before = st.fbPeers.size;
    for (const [tid, m] of st.zoneMeta) {
      const [mx, mz] = String(m.c || '').split('_').map(Number);
      const near = Math.abs(mx - cx) <= 1 && Math.abs(mz - cz) <= 1;
      if (!near || st.peers.has(tid)) { st.firstSeen.delete(tid); st.fbPeers.delete(tid); continue }
      if (!st.firstSeen.has(tid)) st.firstSeen.set(tid, now);
      if (now - st.firstSeen.get(tid) > NET.p2pTimeout) { if (!st.fbPeers.has(tid)) { st.fbPeers.add(tid); const r = remote(tid); r.role = m.r || ''; r.uid = m.u || ''; r.startup = m.s || ''; rename(r, m.n); r.look = m.l || {}; build(r) } }
    }
    for (const tid of st.fbPeers) if (!st.zoneMeta.has(tid)) st.fbPeers.delete(tid);
    if (st.fbPeers.size !== before) console.info(`[net] players on Supabase fallback: ${st.fbPeers.size}`);
    // join the fallback channels only while needed; leave them after 10 s without fallback peers
    st.fbIdle = st.fbPeers.size ? 0 : st.fbIdle + 1;
    const want = new Set();
    if (st.fbPeers.size || (st.fb.size && st.fbIdle < 10)) for (const id of roomIds()) want.add(id.replace('cell_', 'mn-f-'));
    for (const [id, ch] of st.fb) if (!want.has(id)) { drop(ch); st.fb.delete(id) }
    for (const id of want) if (!st.fb.has(id) && !closing.has(id) && !exists(id)) {
      const ch = supa.channel(id, {config: {broadcast: {self: false, ack: false}}});
      ch.on('broadcast', {event: 'mv'}, ({payload: p}) => { if (p && p.i && p.i !== selfId) snap(p.i, p, 'fb') });
      ch.on('broadcast', {event: 'ch'}, ({payload: p}) => { if (p && p.i && Array.isArray(p.to) && p.to.includes(selfId)) hear(p.i, p) }); // addressed to close players only
      ch.subscribe(); st.fb.set(id, ch);
    }
  }

  // ---------- main loop ----------
  function myState() {
    const L = G.local(), now = performance.now();
    let a = L.state || (L.speed > 4.5 ? 'run' : L.speed > .2 ? 'walk' : 'idle');
    if (now < st.emoteUntil && !L.state) a = a === 'idle' ? st.emote : a + '+' + st.emote; // e.g. 'walk+wave'
    return {i: selfId, x: r2(L.x), y: r2(L.y), z: r2(L.z), r: r2(L.yaw), a, t: Math.round(now)};
  }
  api.update = dt => {
    if (!st.online || (document.hidden && !BGTEST)) return; // paused while the tab is hidden
    const now = performance.now(), L = G.local();
    // cell change check, at most once a second
    st.checkT -= dt;
    if (st.checkT <= 0) {
      st.checkT = 1;
      const [cx, cz] = cellOf(L.x, L.z), cell = `${cx}_${cz}`, zone = zoneOf(L.x, L.z);
      if (cell !== st.cell) { st.cell = cell; if (zone !== st.zone) joinZone(zone).then(() => { syncRooms(); listenZones() }); else { syncRooms(); listenZones(); if (st.zoneCh) st.zoneCh.track(zoneMeta()) } }
      checkFallback(now);
      shareSpot();
      if (st.zoneCh) listenZones(); else if (st.online && now - st.joinAt > 6000) { st.joinAt = now; joinZone(zone).then(() => { syncRooms(); listenZones() }).catch(e => console.warn('[net]', e)) }
      // nearest N peers get full-rate updates
      const ds = [...st.peers.keys()].map(pid => { const r = st.remotes.get(pid), p = r && r.buf[r.buf.length - 1]; return [pid, p ? Math.hypot(p.x - L.x, p.z - L.z) : 0] }).sort((a, b) => a[1] - b[1]);
      st.near = new Set(ds.slice(0, NET.nearCap).map(d => d[0]));
      status();
    }
    // send: 10/s when changed (nearest peers), 1/s to the rest, keep-alive every 2 s
    const cur = myState(), last = st.last;
    const changed = !last || Math.abs(cur.x - last.x) + Math.abs(cur.y - last.y) + Math.abs(cur.z - last.z) > .02 || Math.abs(wrapPI(cur.r - last.r)) > .02 || cur.a !== last.a;
    if (now - st.lastSent >= 1000 / NET.rate && (changed || now - st.lastSent > KEEPALIVE)) {
      sendTo('mv', cur, st.near); st.last = cur; st.lastSent = now;
    }
    st.slowT -= dt;
    if (st.slowT <= 0) { st.slowT = 1; const rest = [...st.peers.keys()].filter(p => !st.near.has(p)); if (rest.length) sendTo('mv', cur, rest) }
    // backup link: several times a second while moving, a keep-alive every second while standing still
    if (st.fb.size) { st.fbSendT -= dt; const fl = st.fbLast, moved = !fl || Math.abs(cur.x - fl.x) + Math.abs(cur.z - fl.z) + Math.abs(cur.y - fl.y) > .03 || Math.abs(wrapPI(cur.r - fl.r)) > .03 || cur.a !== fl.a;
      if (st.fbSendT <= 0 && (moved || now - (st.fbAt || 0) > 1000)) { st.fbSendT = 1 / NET.fallbackRate; st.fbLast = cur; st.fbAt = now; const ch = st.fb.get(`mn-f-${st.cell}#${st.inst}`); if (ch) ch.send({type: 'broadcast', event: 'mv', payload: cur}) } }
    // draw everyone else
    for (const [id, r] of st.remotes) {
      // a player who left is removed; one who is still linked but silent (tab hidden) is only hidden, so their name/role/account stay known
      const linked = st.peers.has(id) || st.fbPeers.has(id);
      if (!linked && now - r.seen > 1500) { forget(id); continue }
      if (now - r.seen > STALE) { r.shown = false; if (r.alpha > 0) setAlpha(r, Math.max(0, r.alpha - dt / FADE)); continue }
      const s = sample(r, now); if (!s || !r.g) continue;
      const g = r.g, px = g.position.x, pz = g.position.z;
      g.position.set(s.x, s.y, s.z); g.rotation.y = s.r;
      const v = dt > 0 ? Math.hypot(s.x - px, s.z - pz) / dt : 0; r.spd += (Math.min(v, 14) - r.spd) * Math.min(1, dt * 6);
      r.anim = s.a;
      const d = Math.hypot(s.x - L.x, s.z - L.z);
      if (!r.shown && d < NET.showAt) r.shown = true; else if (r.shown && d > NET.hideAt) r.shown = false;
      const ta = r.shown ? 1 : 0; if (r.alpha !== ta) setAlpha(r, Math.max(0, Math.min(1, r.alpha + Math.sign(ta - r.alpha) * dt / FADE)));
      const ride = r.anim.startsWith('ride:') ? r.anim.slice(5) : '';
      if (ride !== r.vehType) { if (r.veh) { G.scene.remove(r.veh.g); r.veh = null } r.vehType = ride; if (ride) { r.veh = G.vehicle(ride); r.veh.g.visible = g.visible } }
      if (r.veh) { r.veh.g.position.set(s.x, 0, s.z); r.veh.g.rotation.y = s.r; g.visible = false; r.veh.g.visible = r.alpha > 0 }
      if (r.bub) { r.bt -= dt; if (r.bt <= 0) { g.remove(r.bub); r.bub = null } }
      if (!g.visible) continue;
      // emotes ride on the anim field; players beyond 30 m animate at a third of the rate
      const [base, extra] = r.anim.split('+'), waving = base === 'wave' || extra === 'wave';
      g.userData.wave = waving ? .3 : Math.min(g.userData.wave || 0, .3);
      r.animAcc += dt;
      if (d < 30 || r.animAcc > .1) { G.animH(g, base === 'idle' || base === 'wave' ? 0 : r.spd, r.animAcc, base === 'sit' || base === 'metro' ? 'sit' : undefined); r.animAcc = 0 }
      if (d < 3.2 && !(r.greetT > now) && !ride) { r.greetT = now + 20000; g.userData.wave = 1.6; say(r, '👋 Hi!'); if (G.greet) G.greet() }
    }
  };
  function status() {
    G.onStatus(`Online · ${st.count} ${st.count === 1 ? 'player' : 'players'}`);
  }
  // Where am I, for other players' maps. Whole metres, only after moving 15 m, at most every 8 s: every update is
  // delivered to everyone online, so it has to stay rare.
  function shareSpot(force) {
    const ch = st.onlineCh; if (!ch) return;
    const L = G.local(), now = performance.now(), p = st.spot;
    if (!force && p && (now - p.at < 8000 || (Math.hypot(L.x - p.x, L.z - p.z) < 15 && p.n === L.name))) return;
    st.spot = {x: L.x, z: L.z, n: L.name, at: now};
    ch.track({t: selfId, n: L.name, x: Math.round(L.x), z: Math.round(L.z)});
  }
  // chat for now goes P2P to connected players nearby (Phase 3 adds filters and the cell log)
  const clean = t => String(t || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 120);
  api.chat = text => {
    text = clean(text); if (!text) return; const now = performance.now();
    if (now - st.chatT < 1000) return; st.chatT = now;
    G.onChat(G.local().name, text, true);
    if (!st.online) return;
    const close = [...st.remotes.values()].filter(r => r.g && r.alpha > 0 && distTo(r) < CHAT_RANGE).map(r => r.id);
    sendTo('ch', {t: text}, close.filter(id => st.peers.has(id)));
    const viaBackup = close.filter(id => !st.peers.has(id) && st.fbPeers.has(id));
    const ch = st.fb.get(`mn-f-${st.cell}#${st.inst}`);
    if (viaBackup.length && ch) ch.send({type: 'broadcast', event: 'ch', payload: {i: selfId, t: text, to: viaBackup}});
    if (!close.length && G.onNobody) G.onNobody(CHAT_RANGE);
  };
  api.emote = e => { st.emote = e === 'wave' ? 'wave' : e; st.emoteUntil = performance.now() + 1600 };
  api.retrack = () => { if (!st.online) return; sendTo('hi', hello(), st.peers.keys()); if (st.zoneCh) st.zoneCh.track(zoneMeta()) };
  api.debug = () => [...st.remotes.values()].map(r => ({id: r.id, name: r.name, src: r.src, shown: r.shown, a: +r.alpha.toFixed(2), x: r.g ? +r.g.position.x.toFixed(1) : null, z: r.g ? +r.g.position.z.toFixed(1) : null, anim: r.anim}));
  // players you can see right now, nearest first (for the phone's Nearby app)
  api.nearby = () => { const L = G.local(); return [...st.remotes.values()].filter(r => r.g && r.alpha > 0).map(r => ({id: r.id, name: r.name, role: r.role || 'Explorer', uid: r.uid || '', startup: r.startup || '', x: r.g.position.x, z: r.g.position.z, d: Math.hypot(r.g.position.x - L.x, r.g.position.z - L.z)})).sort((a, b) => a.d - b.d) };
  api.vehicles = () => [...st.remotes.values()].filter(r => r.veh && r.alpha > 0).map(r => ({g: r.veh.g, type: r.vehType}));
  api.meet = pid => { if (st.peers.has(pid)) sendTo('mt', {}, [pid]) };
  // for the maps: players you can see are exact, everyone else online is where they last reported
  api.positions = () => {
    const out = [], seen = new Set([selfId]);
    for (const [id, r] of st.remotes) if (r.g && r.alpha > 0) { seen.add(id); out.push({x: r.g.position.x, z: r.g.position.z, name: r.name, near: true}) }
    for (const [id, m] of st.everyone) if (!seen.has(id)) out.push(m);
    return out;
  };
  if (BGTEST) api._snap = (id, p) => snap(id, p, 'p2p'); // test hook: feed a fake player
  window.__mnNet = api;

  (async () => {
    try {
      [TR, supa] = await Promise.all([import('trystero'), getSupa()]);
      if (!supa) throw new Error('no supabase client');
    } catch (e) { console.warn('[net]', e); G.onStatus('Could not go online · offline'); return }
    selfId = TR.selfId; api.id = selfId;
    // online count: one presence channel, join/leave only
    const oc = supa.channel('mn-online', {config: {presence: {key: selfId}}});
    oc.on('presence', {event: 'sync'}, () => {
      const all = oc.presenceState(), everyone = new Map();
      for (const id in all) { const m = all[id][all[id].length - 1]; if (id !== selfId && m && Number.isFinite(m.x) && Number.isFinite(m.z)) everyone.set(id, {x: m.x, z: m.z, name: String(m.n || 'Player').slice(0, 16)}) }
      st.everyone = everyone; st.count = Math.max(1, Object.keys(all).length); if (st.online) status();
    });
    oc.subscribe(s => { if (s === 'SUBSCRIBED') { st.onlineCh = oc; shareSpot(true) } });
    const L = G.local(), [cx, cz] = cellOf(L.x, L.z); st.cell = `${cx}_${cz}`;
    await joinZone(zoneOf(L.x, L.z));
    syncRooms(); listenZones();
    st.online = true; status();
    if (BGTEST) setInterval(() => { if (document.hidden) api.update(.25) }, 250);
    console.info('[net] online as', selfId, 'cell', st.cell, 'instance', st.inst);
  })();
  return api;
}
