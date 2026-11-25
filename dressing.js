// Street dressing for the "sunny Indian city" look: Hindi shop signs, striped awnings,
// yellow-black bollards, terracotta/grey pavers, flower pots, painted wall murals, flowering
// trees, drifting clouds, a Shaniwar-Wada-style fort gate and a Pune-style railway station.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const PI = Math.PI;

export function dressCity(C) {
  const {scene, ctex, mat, TEX, sign, addColl, LOTS, ROADS, LIM, SEA, R, TICK} = C;
  const rnd = (a, b) => a + R() * (b - a);
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new T.Vector3(), _p = new T.Vector3();
  const BATCH = new Map();
  function put(geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)));
    if (!BATCH.has(m)) BATCH.set(m, []); BATCH.get(m).push(g);
  }
  function flush() { for (const [m, list] of BATCH) { const o = new T.Mesh(mergeGeometries(list, false), m); o.castShadow = true; o.receiveShadow = true; scene.add(o) } BATCH.clear() }
  const BOX = new T.BoxGeometry(1, 1, 1);
  const cube = (m, x, y, z, w, h, d, rx = 0, ry = 0) => put(BOX, m, x, y, z, rx, ry, 0, w, h, d);

  // ---------- pavers: terracotta / grey brick pattern (replaces the plain sidewalk tile) ----------
  {
    const c = TEX.tile.image, x = c.getContext('2d'), w = c.width, h = c.height, cols = ['#b5776a', '#c99a86', '#9c8f85', '#c7b8a6', '#a8695c', '#bfaea0'];
    x.fillStyle = '#7d6f66'; x.fillRect(0, 0, w, h);
    const bw = w / 8, bh = h / 16;
    for (let r = 0; r < 16; r++) for (let k = -1; k < 9; k++) { const ox = (r % 2) * bw / 2; x.fillStyle = cols[Math.floor(R() * cols.length)]; x.fillRect(k * bw + ox + 1, r * bh + 1, bw - 2, bh - 2);
      x.globalAlpha = .15; x.fillStyle = '#000'; x.fillRect(k * bw + ox + 1, r * bh + bh - 3, bw - 2, 2); x.globalAlpha = 1 }
    for (let i = 0; i < 2500; i++) { x.globalAlpha = .12; x.fillStyle = R() < .5 ? '#3d322c' : '#e8dccd'; x.fillRect(R() * w, R() * h, 2, 2) } x.globalAlpha = 1;
    TEX.tile.needsUpdate = true;
  }

  // ---------- striped shop awnings, flower pots, wall murals on the old-city buildings ----------
  const stripes = [['#c0392b', '#f5f0e1'], ['#1e5fa8', '#f5f0e1'], ['#1e7b4a', '#f2c94c'], ['#e8742a', '#fff4dc'], ['#7b2d8b', '#f5f0e1']].map(([a, b]) =>
    new T.MeshStandardMaterial({map: ctex(64, 32, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * 8, 0, 8, h) } x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, h - 4, w, 4) }), roughness: .8, side: T.DoubleSide}));
  const potM = mat(0xb5643a, .85), plantM = mat(0x3f8a36, .85), plantM2 = mat(0x56a040, .85);
  const muralCanvas = (txt, hue) => ctex(512, 384, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `hsl(${hue},70%,62%)`); g.addColorStop(.55, `hsl(${hue + 25},80%,58%)`); g.addColorStop(1, `hsl(${hue + 40},70%,40%)`); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,230,160,.85)'; x.beginPath(); x.arc(w * .68, h * .36, 62, 0, 7); x.fill();
    x.fillStyle = `hsla(${hue - 20},45%,22%,.9)`; x.beginPath(); x.moveTo(0, h * .66);                     // fort silhouette
    for (const [px, py] of [[40, .66], [40, .5], [70, .5], [70, .44], [100, .44], [100, .5], [150, .5], [150, .4], [170, .34], [190, .4], [190, .5], [250, .5], [250, .42], [280, .42], [280, .5], [330, .5], [330, .45], [360, .45], [360, .55], [w, .58], [w, h]]) x.lineTo(px, typeof py === 'number' && py <= 1 ? h * py : py);
    x.lineTo(0, h); x.closePath(); x.fill();
    x.fillStyle = '#fff8e8'; x.font = '800 92px "Baloo 2",sans-serif'; x.textAlign = 'center'; x.fillText(txt, w / 2, h * .9);
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
  });
  const MURALS = [new T.MeshStandardMaterial({map: muralCanvas('Navapur', 20), roughness: .8}), new T.MeshStandardMaterial({map: muralCanvas('नवापुर', 280), roughness: .8}), new T.MeshStandardMaterial({map: muralCanvas('Mumbai Nagri', 200), roughness: .8})];
  const pots = [];
  LOTS.forEach((L, i) => {
    const f = L.front, zf = L.z + f * (L.d / 2);
    put(BOX, stripes[i % stripes.length], L.x, 3.9, zf + f * 1.05, f * .3, 0, 0, L.w - 1, .06, 2.2);                  // awning
    for (let x = L.x - L.w / 2 + 2; x < L.x + L.w / 2 - 1; x += 5.5) pots.push([x, zf + f * 2.6]);
    if (i % 3 === 0 && L.H > 12) { const m = new T.Mesh(new T.PlaneGeometry(L.d * .8, Math.min(L.H - 6, L.d * .6)), MURALS[i % 3]); const s = i % 2 ? 1 : -1;
      m.position.set(L.x + s * (L.w / 2 + .05), 4.6 + Math.min(L.H - 6, L.d * .6) / 2 + 1, L.z); m.rotation.y = s * PI / 2; scene.add(m) }
  });
  for (const [x, z] of pots) { put(new T.CylinderGeometry(.45, .32, .7, 10), potM, x, .6, z); put(new T.IcosahedronGeometry(.6, 1), R() < .5 ? plantM : plantM2, x, 1.35, z, 0, 0, 0, 1, rnd(.9, 1.4), 1) }

  // ---------- yellow-black bollards along the footpath edges ----------
  {
    const pts = [], skip = s => ROADS.some(r => Math.abs(s - r) < 13);
    for (const r of ROADS) for (let s = -LIM + 6; s < SEA - 4; s += 7) { if (skip(s)) continue; for (const e of [-1, 1]) { pts.push([r + e * 7.9, s]); if (s < LIM - 6) pts.push([s, r + e * 7.9]) } }
    const poleG = new T.CylinderGeometry(.13, .15, 1, 10), bandG = new T.CylinderGeometry(.155, .155, .18, 10), capG = new T.SphereGeometry(.13, 10, 6, 0, PI * 2, 0, PI / 2);
    const pI = new T.InstancedMesh(poleG, mat(0x222326, .5, .4), pts.length), bI = new T.InstancedMesh(bandG, mat(0xf2c21f, .5), pts.length), cI = new T.InstancedMesh(capG, mat(0x222326, .4, .5), pts.length), o = new T.Object3D();
    pts.forEach(([x, z], i) => { o.position.set(x, .75, z); o.updateMatrix(); pI.setMatrixAt(i, o.matrix); o.position.y = 1.05; o.updateMatrix(); bI.setMatrixAt(i, o.matrix); o.position.y = 1.25; o.updateMatrix(); cI.setMatrixAt(i, o.matrix) });
    pI.castShadow = true; scene.add(pI, bI, cI);
  }

  // ---------- Shaniwar-Wada-style fort gate on the avenue leading north ----------
  {
    const gx = 40, gz = -188, stone = new T.MeshStandardMaterial({map: ctex(256, 256, (x, w, h) => { x.fillStyle = '#8a7258'; x.fillRect(0, 0, w, h); for (let r = 0; r < 10; r++) for (let c = 0; c < 5; c++) { x.fillStyle = `hsl(28,${18 + R() * 10}%,${34 + R() * 12}%)`; x.fillRect(c * 52 + (r % 2) * 26 + 2, r * 26 + 2, 48, 22) } }), roughness: .95});
    for (const s of [-1, 1]) {                                                       // twin bastions
      put(new T.CylinderGeometry(6.2, 7.2, 20, 20), stone, gx + s * 13, 10, gz); put(new T.CylinderGeometry(6.8, 6.8, 1.2, 20), stone, gx + s * 13, 20.6, gz);
      for (let k = 0; k < 14; k++) { const a = k / 14 * PI * 2; cube(stone, gx + s * 13 + Math.cos(a) * 6.4, 21.8, gz + Math.sin(a) * 6.4, 1.2, 1.4, 1.2, 0, -a) }
      addColl(gx + s * 13 - 7, gx + s * 13 + 7, gz - 7, gz + 7, 21);
      cube(stone, gx + s * 30, 7, gz, 22, 14, 4); addColl(gx + s * 30 - 11, gx + s * 30 + 11, gz - 2, gz + 2, 14);   // curtain walls
    }
    cube(stone, gx, 17, gz, 20, 8, 6); for (let k = 0; k < 8; k++) cube(stone, gx - 8.75 + k * 2.5, 21.7, gz, 1.2, 1.4, 6.2);   // wall over the arch
    const arch = new T.Shape(); arch.moveTo(-10, 0); arch.lineTo(-10, 13); arch.lineTo(10, 13); arch.lineTo(10, 0); arch.lineTo(5, 0); arch.lineTo(5, 7); arch.absarc(0, 7, 5, 0, PI, false); arch.lineTo(-5, 0); arch.closePath();
    const ag = new T.ExtrudeGeometry(arch, {depth: 6, bevelEnabled: false, curveSegments: 16}); ag.translate(0, 0, -3); put(ag, stone, gx, 0, gz);
    // pavilion with arches on top + flag
    cube(mat(0xe9dcc0, .8), gx, 24.2, gz, 12, 3.4, 5); put(new T.ConeGeometry(7.5, 2.4, 4), mat(0x8b2d2d, .7), gx, 27.2, gz, 0, PI / 4, 0, 1.1, 1, .55);
    put(new T.CylinderGeometry(.1, .1, 8, 6), mat(0x666666, .4, .6), gx, 31, gz);
    const flag = new T.Mesh(new T.PlaneGeometry(3.6, 2.4), new T.MeshStandardMaterial({map: ctex(96, 64, (x, w, h) => { x.fillStyle = '#ff9933'; x.fillRect(0, 0, w, h / 3); x.fillStyle = '#ffffff'; x.fillRect(0, h / 3, w, h / 3); x.fillStyle = '#138808'; x.fillRect(0, 2 * h / 3, w, h / 3); x.strokeStyle = '#000080'; x.lineWidth = 2; x.beginPath(); x.arc(w / 2, h / 2, 8, 0, 7); x.stroke() }), side: T.DoubleSide}));
    flag.position.set(gx + 1.8, 33.6, gz); scene.add(flag); TICK.push((dt, t) => { flag.rotation.y = Math.sin(t * 2.2) * .22 });
    const s = sign('नवापुर द्वार · Navapur Darwaza', '#5b2a1a', '#ffe7b0', 1.2, .5); s.position.set(gx, 15.5, gz + 3.05); scene.add(s);
  }

  // ---------- Pune-style railway station front (red + cream, clock tower, cupolas) ----------
  {
    const cx = -132.5, cz = 0, fx = cx + 4.8, cream = mat(0xeadcc0, .8), redM = mat(0xa8322a, .75), roofM = mat(0x8b3a2a, .8), dark = mat(0x2a2522, .9);
    cube(cream, cx, 5, cz, 9.6, 10, 26); cube(redM, cx, 1, cz, 9.8, 2, 26.2); cube(redM, cx, 10.2, cz, 10, .5, 26.4); cube(redM, cx, 6.2, cz, 9.8, .35, 26.2);
    for (let i = -2; i <= 2; i++) { if (!i) continue; const z = cz + i * 4.8;                                              // arched openings on the facade
      cube(dark, fx + .02, 2.6, z, .1, 3.2, 2.6); put(new T.CylinderGeometry(1.3, 1.3, .1, 16, 1, false, 0, PI), dark, fx + .02, 4.2, z, 0, 0, PI / 2);
      cube(redM, fx + .06, 4.2, z - 1.6, .12, 5, .4); cube(redM, fx + .06, 4.2, z + 1.6, .12, 5, .4) }
    put(new T.ConeGeometry(15, 3.2, 4), roofM, cx, 12, cz, 0, PI / 4, 0, .5, 1, 1.25);
    // central clock tower with cupola
    cube(cream, fx - 1.5, 9, cz, 6, 18, 6); cube(redM, fx - 1.5, 18.2, cz, 6.6, .6, 6.6); put(new T.SphereGeometry(3, 16, 8, 0, PI * 2, 0, PI / 2), cream, fx - 1.5, 18.5, cz);
    put(new T.CylinderGeometry(.08, .08, 3, 6), mat(0x555555, .4, .6), fx - 1.5, 22.5, cz);
    const clock = new T.Mesh(new T.CircleGeometry(1.6, 32), new T.MeshStandardMaterial({map: ctex(128, 128, (x, w, h) => { x.fillStyle = '#fdf8ea'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#222'; x.lineWidth = 5; x.stroke(); x.lineWidth = 4; for (let k = 0; k < 12; k++) { const a = k / 12 * PI * 2; x.beginPath(); x.moveTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50); x.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); x.stroke() } x.lineWidth = 6; x.beginPath(); x.moveTo(64, 64); x.lineTo(64, 26); x.moveTo(64, 64); x.lineTo(92, 64); x.stroke() }), roughness: .5}));
    clock.position.set(fx + 1.52, 14.5, cz); clock.rotation.y = PI / 2; scene.add(clock);
    for (const s of [-1, 1]) { const z = cz + s * 12; cube(cream, fx - .6, 7, z, 3.4, 14, 3.4); put(new T.SphereGeometry(1.9, 12, 8, 0, PI * 2, 0, PI / 2), redM, fx - .6, 14, z) }
    const st = sign('नगरी जंक्शन · NAGRI JUNCTION', '#1e4fa8', '#fff', 1.3, .6); st.position.set(fx + .12, 8.2, cz); st.rotation.y = PI / 2; scene.add(st);
    addColl(cx - 5, cx + 5, cz - 13.2, cz + 13.2, 12);
  }

  // ---------- roadside benches (wood slats on iron frames) along the old-city footpaths ----------
  const BENCHES = [];
  {
    const wood = mat(0x8a5a32, .8), iron = mat(0x2b2d30, .5, .5), blockC = [-148, -80, 0, 80, 146];
    for (const r of ROADS) for (const s of blockC) {
      for (const [x, z, ry] of [[r + 9.6, s + 5, -PI / 2], [r - 9.6, s - 5, PI / 2], [s + 5, r + 9.6, PI], [s - 5, r - 9.6, 0]]) {
        if (Math.abs(x) > LIM - 2 || z < -LIM + 2 || z > SEA - 4) continue;
        const c = Math.cos(ry), sn = Math.sin(ry), P = (lx, lz) => [x + lx * c + lz * sn, z - lx * sn + lz * c];
        for (let k = 0; k < 3; k++) { const [a, b] = P(0, -.16 + k * .16); cube(wood, a, .25 + .45, b, 1.8, .05, .13, 0, ry) }
        for (let k = 0; k < 2; k++) { const [a, b] = P(0, -.28); cube(wood, a, .25 + .62 + k * .18, b, 1.8, .12, .04, 0, ry) }
        for (const e of [-.75, .75]) { const [a, b] = P(e, 0); cube(iron, a, .25 + .22, b, .06, .44, .46, 0, ry); const [a2, b2] = P(e, -.28); cube(iron, a2, .25 + .55, b2, .06, .66, .05, 0, ry) }
        { const along = Math.abs(Math.sin(ry)) > .5; const hx = along ? .3 : .9, hz = along ? .9 : .3; const [cx, cz] = P(0, -.12); addColl(cx - hx, cx + hx, cz - hz, cz + hz, .9) }
        const [sx, sz] = P(0, .06); BENCHES.push({x: sx, z: sz, y: .25, ry});
      }
    }
  }

  // ---------- soft clouds ----------
  {
    const cloudT = ctex(256, 128, (x, w, h) => { for (let i = 0; i < 26; i++) { const cx = 40 + R() * 176, cy = 50 + R() * 40, r = 18 + R() * 30; const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill() } });
    const cm = new T.SpriteMaterial({map: cloudT, transparent: true, depthWrite: false, fog: false, opacity: .92});
    const clouds = []; for (let i = 0; i < 14; i++) { const s = new T.Sprite(cm); const a = R() * PI * 2, r = rnd(350, 1100); s.position.set(Math.cos(a) * r, rnd(220, 380), Math.sin(a) * r); s.scale.set(rnd(220, 420), rnd(90, 150), 1); scene.add(s); clouds.push(s) }
    TICK.push(dt => { for (const c of clouds) { c.position.x += dt * 2.5; if (c.position.x > 1300) c.position.x = -1300 } });
  }

  flush();
  return BENCHES;
}

// Hindi / Marathi shop names for the old city's signboards
export const HINDI_SHOPS = ['शर्मा चाय स्टॉल', 'पुस्तक भंडार', 'मोबाइल सेंटर', 'लक्ष्मी मेडिकल', 'पाव भाजी कॉर्नर', 'सायबर कैफे', 'गणेश स्वीट्स', 'किराना स्टोर', 'कोहिनूर होटल', 'पटेल किराना', 'जोशी क्लिनिक', 'ओम साई झेरॉक्स', 'न्यू फैशन', 'हरि ओम भाजी', 'रॉयल सलून', 'अमृत डेयरी'];
