// Multiplayer over Supabase Realtime: city rooms of NET.roomSize players.
// Presence = who is in the room (name + look). Broadcast = positions ('p'), chat ('c'), emotes ('e').
// Remote players are drawn as the light procedural characters (cheap on low-end GPUs), with a
// name tag, smoothed movement, sit / ride / metro states and speech bubbles for chat.
import * as T from 'three';
import {NET} from './net-config.js?v=2';

const ID = (() => { try { const k = 'mn_net_id'; let v = sessionStorage.getItem(k); if (!v) { v = Math.random().toString(36).slice(2, 10); sessionStorage.setItem(k, v) } return v } catch (e) { return Math.random().toString(36).slice(2, 10) } })();

function nameTag(text) {
  const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = '700 34px "Baloo 2",sans-serif';
  const w = Math.ceil(x.measureText(text).width) + 28; c.width = w; c.height = 48;
  x.fillStyle = 'rgba(15,15,20,.72)'; x.beginPath(); x.roundRect ? x.roundRect(0, 0, w, 48, 16) : x.rect(0, 0, w, 48); x.fill();
  x.fillStyle = '#ffd21f'; x.font = '700 34px "Baloo 2",sans-serif'; x.textBaseline = 'middle'; x.fillText(text, 14, 26);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  const s = new T.Sprite(new T.SpriteMaterial({map: t, depthTest: true, fog: false})); s.scale.set(w / 48 * .34, .34, 1); return s;
}
const wrapPI = a => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

export function startNet(G) {
  // G: {scene, makeAvatar(look), animH(g, speed, dt, state), bubble(text), vehicle(type), local(), onChat(name, text, mine), onStatus(text)}
  const st = {online: false, room: null, channel: null, peers: new Map(), sendT: 0, keepT: 0, last: null, count: 1};
  const api = {
    get online() { return st.online }, get room() { return st.room }, get count() { return st.count }, id: ID,
    update(dt) {}, chat() {}, emote() {}, retrack() {},
  };
  if (!NET.url || !NET.key) { G.onStatus('Offline · akele khel rahe ho'); api.chat = t => { t = String(t || '').trim().slice(0, 140); if (t) G.onChat(G.local().name, t, true) }; return api }

  let supa = null;
  async function connect() {
    try {
      const {createClient} = await import('@supabase/supabase-js');
      supa = createClient(NET.url, NET.key, {realtime: {params: {eventsPerSecond: Math.max(10, NET.rate * 3)}}});
    } catch (e) { console.warn('supabase', e); G.onStatus('Online nahi ho paaye'); return }
    // while the tab is hidden the render loop stops; keep sending our position slowly so others still see us
    setInterval(() => { if (st.online && document.hidden) { const L = G.local(); st.channel.send({type: 'broadcast', event: 'p', payload: {i: ID, x: +L.x.toFixed(2), y: +L.y.toFixed(2), z: +L.z.toFixed(2), r: +L.yaw.toFixed(2), s: 0, a: L.state}}) } }, 2000);
    for (let n = 1; n <= NET.maxRooms; n++) { if (await tryRoom(n)) return }
    G.onStatus('Saare rooms full hain · offline');
  }
  function tryRoom(n) {
    return new Promise(resolve => {
      const ch = supa.channel('navapur-room-' + n, {config: {broadcast: {self: false, ack: false}, presence: {key: ID}}});
      let decided = false;
      ch.on('presence', {event: 'sync'}, () => {
        const state = ch.presenceState(), ids = Object.keys(state);
        if (!decided) { decided = true; if (ids.length > NET.roomSize) { ch.unsubscribe(); resolve(false); return } st.channel = ch; st.room = n; st.online = true; resolve(true) }
        st.count = Math.max(1, ids.length);
        for (const id of ids) { if (id === ID) continue; const meta = state[id][0]; if (meta) peer(id, meta) }
        for (const id of [...st.peers.keys()]) if (!state[id]) drop(id);
        G.onStatus(`Online · Room ${st.room} · ${st.count} log`);
      });
      ch.on('broadcast', {event: 'p'}, ({payload: p}) => { const r = st.peers.get(p.i); if (!r) return; r.tx = p.x; r.ty = p.y; r.tz = p.z; r.tr = p.r; r.spd = p.s; r.state = p.a || ''; r.seen = performance.now(); if (!r.placed) { r.g.position.set(p.x, p.y, p.z); r.g.rotation.y = p.r; r.placed = true } });
      ch.on('broadcast', {event: 'c'}, ({payload: p}) => { const r = st.peers.get(p.i); G.onChat(p.n || 'Koi', String(p.t).slice(0, 140), false); if (r) say(r, String(p.t).slice(0, 60)) });
      ch.on('broadcast', {event: 'e'}, ({payload: p}) => { const r = st.peers.get(p.i); if (r && p.e === 'wave') r.g.userData.wave = 1.6 });
      ch.subscribe(async status => {
        if (status === 'SUBSCRIBED') { const L = G.local(); await ch.track({name: L.name, look: L.look}); setTimeout(() => { if (!decided) { decided = true; st.channel = ch; st.room = n; st.online = true; resolve(true); G.onStatus(`Online · Room ${n}`) } }, 2500) }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { if (!decided) { decided = true; resolve(false) } G.onStatus('Connection toota · dobara try ho raha hai'); }
      });
    });
  }
  function peer(id, meta) {
    let r = st.peers.get(id);
    const key = JSON.stringify(meta.look || {});
    if (r && r.key === key) { if (r.name !== meta.name) { r.g.remove(r.tag); r.tag = nameTag(meta.name || 'Player'); r.tag.position.y = 2.25; r.g.add(r.tag); r.name = meta.name } return }
    const pos = r ? r.g.position.clone() : null, rot = r ? r.g.rotation.y : 0;
    if (r) drop(id, true);
    const g = G.makeAvatar(meta.look || {}); G.scene.add(g);
    const tag = nameTag(meta.name || 'Player'); tag.position.y = 2.25; g.add(tag);
    r = {g, tag, key, name: meta.name, tx: 0, ty: 0, tz: 0, tr: 0, spd: 0, state: '', seen: performance.now(), placed: false, veh: null, vehType: '', bub: null, bt: 0};
    if (pos) { r.g.position.copy(pos); r.g.rotation.y = rot; r.tx = pos.x; r.ty = pos.y; r.tz = pos.z; r.tr = rot; r.placed = true } else g.visible = false;
    st.peers.set(id, r);
  }
  function drop(id, keepEntry) { const r = st.peers.get(id); if (!r) return; G.scene.remove(r.g); if (r.veh) G.scene.remove(r.veh.g); if (!keepEntry) st.peers.delete(id) }
  function say(r, text) { if (r.bub) r.g.remove(r.bub); r.bub = G.bubble(text); r.bub.position.y = 2.75; r.g.add(r.bub); r.bt = 5 }

  api.update = dt => {
    if (!st.online) return;
    // send our state (throttled; only when something changed, plus a slow keep-alive)
    const L = G.local(); st.sendT -= dt; st.keepT -= dt;
    const cur = {i: ID, x: +L.x.toFixed(2), y: +L.y.toFixed(2), z: +L.z.toFixed(2), r: +L.yaw.toFixed(2), s: +L.speed.toFixed(1), a: L.state};
    const moved = !st.last || Math.abs(cur.x - st.last.x) + Math.abs(cur.z - st.last.z) > .05 || Math.abs(wrapPI(cur.r - st.last.r)) > .06 || cur.a !== st.last.a || (cur.s > 0) !== (st.last.s > 0);
    if ((moved && st.sendT <= 0) || st.keepT <= 0) { st.channel.send({type: 'broadcast', event: 'p', payload: cur}); st.last = cur; st.sendT = 1 / NET.rate; st.keepT = 3 }
    // draw everyone else
    const k = 1 - Math.exp(-dt * 8), now = performance.now();
    for (const [id, r] of st.peers) {
      if (!r.placed) continue;
      const far = Math.hypot(r.tx - L.x, r.tz - L.z) > 180;
      r.g.position.x += (r.tx - r.g.position.x) * k; r.g.position.y += (r.ty - r.g.position.y) * k; r.g.position.z += (r.tz - r.g.position.z) * k;
      r.g.rotation.y += wrapPI(r.tr - r.g.rotation.y) * k;
      const ride = r.state.startsWith('ride:') ? r.state.slice(5) : '';
      if (ride !== r.vehType) { if (r.veh) { G.scene.remove(r.veh.g); r.veh = null } r.vehType = ride; if (ride) r.veh = G.vehicle(ride) }
      if (r.veh) { r.veh.g.position.set(r.g.position.x, 0, r.g.position.z); r.veh.g.rotation.y = r.g.rotation.y; r.veh.g.visible = !far }
      r.g.visible = !far && !ride;
      if (r.g.visible) G.animH(r.g, r.spd, dt, r.state === 'sit' || r.state === 'metro' ? 'sit' : undefined);
      if (r.bub) { r.bt -= dt; if (r.bt <= 0) { r.g.remove(r.bub); r.bub = null } }
      if (now - r.seen > 60000 && !r.placed) drop(id);
    }
  };
  api.chat = text => { text = String(text || '').trim().slice(0, 140); if (!text) return; const L = G.local(); G.onChat(L.name, text, true); if (st.online) st.channel.send({type: 'broadcast', event: 'c', payload: {i: ID, n: L.name, t: text}}) };
  api.emote = e => { if (st.online) st.channel.send({type: 'broadcast', event: 'e', payload: {i: ID, e}}) };
  api.retrack = () => { if (st.online) { const L = G.local(); st.channel.track({name: L.name, look: L.look}) } };
  api.debug = () => [...st.peers].map(([id, r]) => ({id, name: r.name, placed: r.placed, visible: r.g.visible, x: +r.g.position.x.toFixed(1), z: +r.g.position.z.toFixed(1), state: r.state}));
  api.positions = () => [...st.peers.values()].filter(r => r.placed).map(r => ({x: r.g.position.x, z: r.g.position.z, name: r.name}));
  window.__mnNet = api;
  connect();
  return api;
}
