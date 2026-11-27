// Navapur: an uneven island city around the old-city street grid.
// The land is one irregular island (noisy coastline); roads are smooth curves; districts are organic
// blobs; buildings sit at angles along winding lanes and carry balconies, sunshades, AC units,
// water tanks, stair rooms and tiled roofs. Static geometry is merged per material.
import * as T from 'three';
import {makeKit} from './citykit.js?v=6';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeTrees} from './trees.js?v=1';

// the Startup Café: walk-in meeting place between the old city and the ring road (entrance faces east)
export const CAFE = {x: -213, z: -80, w: 34, d: 26, door: {x: -191, z: -80}, seats: []};
export const WORLD = {x0: -505, x1: 505, z0: -470, coast: 165};
const PI = Math.PI;
const LOW = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);   // phones: lighter world

// fixed (non-random) ring road so traffic and the road mesh agree on every load
const RING_CTRL = [[170, 120], [215, 116], [252, 92], [262, 30], [246, -40], [262, -110], [250, -175], [210, -238], [120, -258], [40, -246],
  [-40, -252], [-120, -262], [-205, -244], [-252, -180], [-266, -100], [-250, -20], [-262, 50], [-238, 104], [-205, 120], [-170, 120], [0, 120]];
function sampleCurve(ctrl, closed, step = 4) {
  const c = new T.CatmullRomCurve3(ctrl.map(([x, z]) => new T.Vector3(x, 0, z)), closed, 'centripetal', .5);
  const n = Math.max(8, Math.round(c.getLength() / step));
  const pts = c.getSpacedPoints(n).map(p => [p.x, p.z]);
  return closed ? pts.slice(0, n) : pts;
}
const RING_PTS = sampleCurve(RING_CTRL, true, 5);
function offsetLine(pts, o, closed) {
  return pts.map((p, i) => { const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
    const A = closed || i > 0 ? a : p, B = closed || i < pts.length - 1 ? b : p; let tx = B[0] - A[0], tz = B[1] - A[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; return [p[0] - tz * o, p[1] + tx * o] });
}
// traffic lane around the curvy ring (o: lane offset from the centre line)
export function ringLane(o, cw) { const p = offsetLine(RING_PTS, o, true); return cw ? p : p.slice().reverse() }

export function buildNavapur(C) {
  const {scene, ctex, mat, TEX, FACADE, sign, addColl, addOColl, seaMat, roadMat, R, TICK, DMAP, PLACES, ground, sea, LOTS} = C;
  const rnd = (a, b) => a + R() * (b - a);
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new T.Vector3(), _p = new T.Vector3();

  // ---------- batching ----------
  const BATCH = new Map();
  function put(geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)));
    if (!BATCH.has(m)) BATCH.set(m, []); BATCH.get(m).push(g);
  }
  function flush() {
    for (const [m, list] of BATCH) for (let i = 0; i < list.length; i += 500) {
      const o = new T.Mesh(mergeGeometries(list.slice(i, i + 500), false), m); o.castShadow = !m.userData.noShadow; o.receiveShadow = true; scene.add(o);
    }
    BATCH.clear();
  }
  function boxUV(w, h, d, su, sv) {
    const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / su, uv.getY(i) * dims[f][1] / sv) }
    return g;
  }
  const BOX = new T.BoxGeometry(1, 1, 1);
  const cube = (m, x, y, z, w, h, d, ry = 0) => put(BOX, m, x, y, z, 0, ry, 0, w, h, d);
  const label = (n, x, z) => PLACES.push({n, x, z});
  // organic shapes
  function blob(cx, cz, rx, rz, irr = .22, n = 28, rot = 0) {
    const ph = [R() * 6, R() * 6, R() * 6], pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * PI * 2, k = 1 + irr * (Math.sin(a * 2 + ph[0]) * .6 + Math.sin(a * 3 + ph[1]) * .3 + Math.sin(a * 5 + ph[2]) * .2);
      const x = Math.cos(a) * rx * k, z = Math.sin(a) * rz * k; pts.push([cx + x * Math.cos(rot) - z * Math.sin(rot), cz + x * Math.sin(rot) + z * Math.cos(rot)]) }
    return pts;
  }
  function inPoly(pts, x, z) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c } return c }
  function shapeGeo(pts, tile, y = 0) {
    const s = new T.Shape(pts.map(([x, z]) => new T.Vector2(x, -z))); const g = new T.ShapeGeometry(s, 4); g.rotateX(-PI / 2); g.translate(0, y, 0);
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile); return g;
  }
  // district ground is pushed back in depth so roads and paths on top of it never flicker, even far away
  const areaMats = new Map(), areaMat = m => { let c = areaMats.get(m); if (!c) { c = m.clone(); c.userData = m.userData; areaMats.set(m, c) } return c };
  const area = (pts, m, tile, y, col) => { const o = new T.Mesh(shapeGeo(pts, tile, y), areaMat(m)); stampGeometry(o.geometry, y); o.receiveShadow = true; scene.add(o); if (col) DMAP.zones.push({pts, c: col}); return o };
  // flat ribbon along a polyline (roads, kerbs, lanes)
  function ribbon(pts, w, m, y, closed = false, vScale = 14) {
    const pos = [], uv = [], idx = [], L = offsetLine(pts, -w / 2, closed), Rr = offsetLine(pts, w / 2, closed); let d = 0;
    for (let i = 0; i < pts.length; i++) { if (i) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); pos.push(L[i][0], y, L[i][1], Rr[i][0], y, Rr[i][1]); uv.push(0, d / vScale, 1, d / vScale) }
    const n = pts.length; for (let i = 0; i < n - 1 + (closed ? 1 : 0); i++) { const a = i * 2, b = ((i + 1) % n) * 2; idx.push(a, b, a + 1, a + 1, b, b + 1) }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) { const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0); g.setIndex(idx.map((v, i) => idx[i - i % 3 + (2 - i % 3)])) }
    stampGeometry(g, y);
    const o = new T.Mesh(g, m); o.receiveShadow = true; scene.add(o); return o;
  }

  // ---------- materials ----------
  function glassTex(tint, band) {
    return ctex(256, 512, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, tint[0]); g.addColorStop(1, tint[1]); x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (let r = 0; r < 16; r++) for (let c = 0; c < 4; c++) { x.globalAlpha = .08 + R() * .18; x.fillStyle = R() < .5 ? '#ffffff' : '#000814'; x.fillRect(c * 64 + 3, r * 32 + 3, 58, 26) }
      x.globalAlpha = 1; x.fillStyle = band || 'rgba(30,38,46,.9)';
      for (let r = 0; r <= 16; r++) x.fillRect(0, r * 32 - 2, w, band ? 6 : 3); for (let c = 0; c <= 4; c++) x.fillRect(c * 64 - 1, 0, 3, h);
    });
  }
  // each curtain-wall style has its own colours and window pattern, so neighbouring towers never match
  function styledGlass(top, low, frame, style) {
    return ctex(256, 512, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, top); g.addColorStop(1, low); x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) { x.globalAlpha = .06 + R() * .2; x.fillStyle = R() < .5 ? '#ffffff' : '#000814'; x.fillRect(c * 32 + 2, r * 32 + 3, 28, 26) }
      x.globalAlpha = 1; x.fillStyle = frame;
      if (style === 'grid') { for (let r = 0; r <= 16; r++) x.fillRect(0, r * 32 - 2, w, 4); for (let c = 0; c <= 4; c++) x.fillRect(c * 64 - 2, 0, 4, h) }
      else if (style === 'bands') { for (let r = 0; r <= 16; r += 1) x.fillRect(0, r * 32 - 5, w, 10); x.globalAlpha = .5; for (let c = 0; c <= 8; c++) x.fillRect(c * 32 - 1, 0, 2, h) }
      else if (style === 'fins') { for (let c = 0; c <= 8; c++) x.fillRect(c * 32 - 4, 0, 8, h); x.globalAlpha = .45; for (let r = 0; r <= 16; r++) x.fillRect(0, r * 32 - 1, w, 2) }
      else { for (let r = 0; r <= 16; r += 2) x.fillRect(0, r * 32 - 7, w, 14); for (let c = 0; c <= 2; c++) x.fillRect(c * 128 - 6, 0, 12, h) }
      x.globalAlpha = 1;
    });
  }
  const glassM = (top, low, frame, style, metal = .45) => new T.MeshStandardMaterial({map: styledGlass(top, low, frame, style), roughness: .26, metalness: metal, envMapIntensity: .85});
  const GLASS = [glassM('#4f93c4', '#143452', '#1f2a36', 'grid', .55), glassM('#35b3a4', '#0f4a47', '#e8f2ef', 'fins'), glassM('#d9a25c', '#5a3416', '#3b2a1c', 'grid', .6),
    glassM('#6b7890', '#1c2230', '#f0c14b', 'fins'), glassM('#d98a9c', '#5b2640', '#f6e9e4', 'bands'), glassM('#8fbf6a', '#22462a', '#f4f1e6', 'wide'),
    glassM('#8f84d6', '#2b2360', '#dcd8f5', 'grid'), glassM('#f1ede4', '#b9b2a4', '#2f4858', 'wide', .15)];
  const OFFICE = new T.MeshStandardMaterial({map: glassTex(['#7fb0c4', '#2e4a5a'], 'rgba(225,228,230,.95)'), roughness: .3, metalness: .32});
  const OFFICES = [glassM('#5fb7d4', '#1d4f6b', '#f4f7f8', 'bands'), glassM('#d8c8a8', '#8a6a48', '#6b3f2a', 'wide', .2), glassM('#58a889', '#17483a', '#e9efe9', 'fins'),
    glassM('#e0775a', '#7a2f22', '#f7e6d8', 'bands', .25), glassM('#4a5a78', '#161d2c', '#7fe0d0', 'grid', .6)];
  const CROWN = [0xf0b429, 0x18a999, 0xe4572e, 0x7b61ff, 0xf2f2ee].map(c => new T.MeshStandardMaterial({color: c, roughness: .45, metalness: .25, emissive: c, emissiveIntensity: .12}));
  const concrete = mat(0xc4bdb1, .9), darkConcrete = mat(0x6f6b65, .9), trimM = mat(0xe9e3d6, .8);
  const neonP = new T.MeshStandardMaterial({color: 0x9b4dff, emissive: 0x9b4dff, emissiveIntensity: 1.4}), neonB = new T.MeshStandardMaterial({color: 0x37b6ff, emissive: 0x37b6ff, emissiveIntensity: 1.4});
  const sandTex = ctex(256, 256, (x, w, h) => { x.fillStyle = '#c9b27f'; x.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { x.globalAlpha = .1 + R() * .25; x.fillStyle = ['#ad9563', '#dcc89a', '#9c8352'][i % 3]; x.fillRect(R() * w, R() * h, 2, 2) } x.globalAlpha = 1 });
  const sand = new T.MeshStandardMaterial({map: sandTex, roughness: 1}), wetSand = mat(0xa8925f, .6);
  const grass = new T.MeshStandardMaterial({map: TEX.grass, roughness: 1}), dirt = new T.MeshStandardMaterial({map: TEX.gravel, roughness: 1});
  const paved = new T.MeshStandardMaterial({map: TEX.tile, roughness: .92}), kerbM = paved, asphaltM = new T.MeshStandardMaterial({map: TEX.inter, roughness: .9});
  const corrTex = ctex(128, 128, (x, w, h) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#9aa1a6' : '#b8bec2'; x.fillRect(i * 8, 0, 8, h) } for (let i = 0; i < 1500; i++) { x.globalAlpha = .15; x.fillStyle = '#6b5a48'; x.fillRect(R() * w, R() * h, 2, 3) } x.globalAlpha = 1 });
  const corr = new T.MeshStandardMaterial({map: corrTex, roughness: .6, metalness: .4});
  const stoneTex = ctex(256, 256, (x, w, h) => { x.fillStyle = '#8b7d68'; x.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { x.fillStyle = `hsl(32,${12 + R() * 10}%,${36 + R() * 14}%)`; x.fillRect(c * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28) } });
  const stone = new T.MeshStandardMaterial({map: stoneTex, roughness: .95}), rock = mat(0x6e675d, .95);
  const tileTex = ctex(128, 128, (x, w, h) => { x.fillStyle = '#9c3f25'; x.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) { x.fillStyle = 'rgba(60,20,10,.45)'; x.fillRect(0, r * 16 + 13, w, 3); for (let c = 0; c < 8; c++) { x.fillStyle = `rgba(${150 + R() * 40},${60 + R() * 20},40,.35)`; x.fillRect(c * 16 + (r % 2) * 8, r * 16, 14, 13) } } });
  const roofTile = new T.MeshStandardMaterial({map: tileTex, roughness: .85});
  const white = mat(0xf2f2ee, .5), red = mat(0xc0392b, .6), steel = mat(0x8d949b, .35, .8), yellowM = mat(0xf2c21f, .55), orangeM = mat(0xe8742a, .55);
  const railM = mat(0x2f3236, .4, .7), acM = mat(0xe8e8e4, .5), tankBlack = mat(0x222222, .7), tankBlue = mat(0x2e5d9a, .6);
  const leafM = mat(0x3f7a2e, .9), leafM2 = mat(0x4f8f36, .9), trunkM = mat(0x5b4330, .95), palmLeaf = mat(0x3f8a3a, .8, 0, {side: T.DoubleSide});
  for (const m of [sand, grass, dirt, asphaltM, wetSand, paved]) m.userData.noShadow = true;
  // roads sit above every district ground (areas are at y <= .03) so they never disappear under a plaza or lawn;
  // kerbs are built at the end and cut away where another road crosses, so junctions stay open
  const KERBQ = [];
  const road = (pts, closed, w = 14, y = .06) => { ribbon(pts, w, roadMat, y, closed); KERBQ.push({pts, w, y, closed}); DMAP.lines.push({pts, w, closed}) };
  function buildKerbs() {
    for (const q of KERBQ) for (const sd of [-1, 1]) {
      const off = offsetLine(q.pts, sd * (q.w / 2 + 1.6), q.closed), keep = off.map(([x, z]) => {
        for (const L of DMAP.lines) { if (L.pts === q.pts) continue; const r = L.w / 2 + 3.5; for (const p of L.pts) if (Math.abs(p[0] - x) < r && Math.abs(p[1] - z) < r && Math.hypot(p[0] - x, p[1] - z) < r) return false }
        return true });
      if (keep.every(Boolean)) { ribbon(off, 3.2, kerbM, q.y + .08, q.closed, 3); continue }
      let run = [];
      const out = () => { if (run.length > 1) ribbon(run, 3.2, kerbM, q.y + .08, false, 3); run = [] };
      off.forEach((p, i) => { if (keep[i]) run.push(p); else out() }); out();
    }
  }
  // building placement: nudge a footprint off the roads, or give up (null) if there's no room nearby
  function hitsRoad(x, z, w, d, ry, m) {
    const c = Math.cos(ry), sn = Math.sin(ry), R0 = Math.hypot(w, d) / 2 + m;
    for (const L of DMAP.lines) { const hw = L.w / 2 + m; for (const p of L.pts) { const dx = p[0] - x, dz = p[1] - z; if (Math.abs(dx) > R0 + hw || Math.abs(dz) > R0 + hw) continue;
      const lx = dx * c - dz * sn, lz = dx * sn + dz * c; if (Math.abs(lx) < w / 2 + hw && Math.abs(lz) < d / 2 + hw) return p } }
    return null;
  }
  function placeClear(x, z, w, d, ry, m = 2.5) {
    let p = hitsRoad(x, z, w, d, ry, m); if (!p) return [x, z];
    let dx = x - p[0], dz = z - p[1], l = Math.hypot(dx, dz); if (l < .01) { dx = 1; dz = 0; l = 1 } dx /= l; dz /= l;
    for (let st = 3; st <= 48; st += 3) { const nx = x + dx * st, nz = z + dz * st; if (!hitsRoad(nx, nz, w, d, ry, m)) return [nx, nz] }
    return null;
  }

  // ---------- the island ----------
  // coastline: noisy west / north / east edges, the fort headland, the Bandra Bay crescent,
  // the straight Marine Drive sea wall of the old city, and the port quays
  const coast = [];
  const nz = (a, s) => Math.sin(a * .021 + s) * 9 + Math.sin(a * .055 + s * 2) * 5 + Math.sin(a * .13 + s) * 2;
  for (let z = -470; z <= 150; z += 12) coast.push([-510 + Math.abs(nz(z, 1)), z]);
  for (let a = PI * .95; a >= PI * .02; a -= .1) coast.push([-430 + Math.cos(a) * 62 * (1 + Math.sin(a * 5) * .06), 215 + Math.sin(a) * 58 * (1 + Math.cos(a * 4) * .06)]);
  for (let t = 0; t <= 1; t += .05) { const x = -366 + t * 194, z = 170 + Math.sin(t * PI) * 44 + Math.sin(t * 13) * 2; coast.push([x, z]) }
  coast.push([-172, 171], [186, 171]);
  for (const [x, z] of [[190, 200], [200, 258], [262, 266], [330, 262], [402, 268], [470, 258], [482, 200], [492, 160]]) coast.push([x, z]);
  for (let z = 150; z >= -470; z -= 12) coast.push([508 - Math.abs(nz(z, 4)), z]);
  for (let x = 500; x >= -500; x -= 20) coast.push([x, -470 - Math.abs(nz(x, 7)) * .5]);
  DMAP.land = coast;
  ground.geometry.dispose(); ground.geometry = shapeGeo(coast, 1, 0); ground.position.set(0, -.02, 0); ground.rotation.set(0, 0, 0);
  sea.geometry.dispose(); sea.geometry = new T.PlaneGeometry(3200, 3200); sea.position.set(0, -.4, 0); if (seaMat.normalMap) seaMat.normalMap.repeat.set(90, 90);
  ribbon(coast, 9, wetSand, .005, true, 9);
  for (let i = 0; i < coast.length; i += 2) { const [x, z] = coast[i]; if (z > 160 && x > -175 && x < 500) continue; if (R() < .55) put(new T.DodecahedronGeometry(rnd(1.5, 4), 0), rock, x + rnd(-4, 4), rnd(-1.5, .2), z + rnd(-4, 4), R() * 3, R() * 3, R() * 3) }

  // ---------- buildings ----------
  const ROOMS = [];
  // decorates a box building: floor bands, window sunshades, balconies on the front, AC units,
  // a parapet, water tank and stair room (or a tiled gable roof for low houses)
  function details(x, z, ry, w, d, y0, fh, floors, H, opts = {}) {
    const c = Math.cos(ry), s = Math.sin(ry), W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const front = opts.front || 1;
    for (let f = 0; f < floors; f++) {
      const y = y0 + f * fh;
      if (f > 0) cube(trimM, x, y - .06, z, w + .28, .22, d + .28, ry);
      for (const sd of [front, -front]) { const [a, b] = W(0, sd * (d / 2 + .32)); cube(concrete, a, y + fh * .78, b, w - .4, .1, .62, ry) }
      if (opts.balcony !== false && f >= (opts.skipGround ? 1 : 0)) {
        const nb = Math.max(1, Math.floor(w / 6.5));
        for (let i = 0; i < nb; i++) { if ((i + f) % 3 === 2 && nb > 1) continue;
          const lx = -w / 2 + (i + .5) * w / nb, [a, b] = W(lx, front * (d / 2 + .6)), bw = Math.min(3.2, w / nb - .6);
          cube(concrete, a, y + .08, b, bw, .16, 1.2, ry);
          const [ra, rb] = W(lx, front * (d / 2 + 1.18)); cube(railM, ra, y + 1.02, rb, bw, .06, .06, ry); cube(railM, ra, y + .55, rb, bw, .04, .04, ry);
          for (let k = 0; k <= 5; k++) { const [pa, pb] = W(lx - bw / 2 + k * bw / 5, front * (d / 2 + 1.18)); cube(railM, pa, y + .55, pb, .04, .95, .04, ry) }
          for (const e of [-1, 1]) { const [ea, eb] = W(lx + e * bw / 2, front * (d / 2 + .6)); cube(railM, ea, y + 1.02, eb, .05, .05, 1.15, ry) }
        }
      }
      if (R() < .45) { const sx = R() < .5 ? -1 : 1, [a, b] = W(sx * (w / 2 + .2), rnd(-d / 3, d / 3)); cube(acM, a, y + fh * .45, b, .32, .55, .85, ry) }
    }
    if (opts.gable) {
      const sh = new T.Shape(); sh.moveTo(-d / 2 - .5, 0); sh.lineTo(0, Math.min(4, d * .35)); sh.lineTo(d / 2 + .5, 0); sh.closePath();
      const g = new T.ExtrudeGeometry(sh, {depth: w + .6, bevelEnabled: false}); g.rotateY(PI / 2); g.translate(-(w + .6) / 2, 0, 0);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
      put(g, roofTile, x, H, z, 0, ry, 0);
    } else {
      for (const [lx, lz, ww, dd] of [[0, d / 2, w + .3, .25], [0, -d / 2, w + .3, .25], [w / 2, 0, .25, d], [-w / 2, 0, .25, d]]) { const [a, b] = W(lx, lz); cube(trimM, a, H + .45, b, ww, .9, dd, ry) }
      const [ta, tb] = W(w / 2 - 2.2, -d / 2 + 2.2); put(new T.CylinderGeometry(1.05, 1.05, 1.5, 14), R() < .6 ? tankBlack : tankBlue, ta, H + .75, tb);
      if (w > 9) { const [sa, sb] = W(-w / 2 + 2.4, -d / 2 + 2.2); cube(concrete, sa, H + 1.3, sb, 3.2, 2.6, 3.2, ry); cube(darkConcrete, sa, H + 2.65, sb, 3.6, .15, 3.6, ry) }
      if (R() < .3) { const [da, db] = W(0, d / 4); put(new T.CylinderGeometry(.5, .05, .25, 12, 1, true), white, da, H + 1.4, db, .6, ry, 0) }
    }
  }
  const KIT = makeKit({scene, R}), RESERVED = [];
  const reserved = (x, z, r) => RESERVED.some(q => Math.hypot(q.x - x, q.z - z) < q.r + r);
  function building(x, z, ry, w, d, floors, opts = {}) {
    { const c = placeClear(x, z, w + 1, d + 2.6, ry); if (!c) return; [x, z] = c }
    if (reserved(x, z, Math.max(w, d) / 2)) return;
    const f = KIT.frame(x, z, (opts.front || 1) > 0 ? ry : ry + PI), roll = R();
    let H;
    if (roll > .82 && floors > 2) H = KIT.roundHall(f, Math.min(w, 13), Math.min(d + 1, 13), Math.min(floors - 1, 5));
    else if (floors <= 3) H = roll < .62 || w < 9 ? KIT.house(f, Math.min(w, 13), Math.min(d, 11), 2) : KIT.townhouses(f, w, Math.min(d, 10), floors);
    else if (roll < .34 && w >= 11) H = KIT.manor(f, w, Math.min(d, 13), Math.min(floors - 1, 4));
    else if (roll < .6) H = KIT.townhouses(f, w, Math.min(d, 11), Math.min(floors, 4));
    else H = KIT.apartments(f, w, d, floors - 1);
    addOColl(x, z, w + 1, d + 2.6, ry, H);
    ROOMS.push({x, z, ry, w, d, H});
  }
  // the old city's box buildings get the same detailing (they face their street: front = ±1 on z)
  for (const L of LOTS) L.fresh ? KIT.newBlock(L) : KIT.oldCity(L);
  // tower with setbacks so the skyline isn't a set of plain boxes
  function tower(x, z, w, d, h, m, ry, opts = {}) {
    { const c = placeClear(x, z, w + 4, d + 4, ry); if (!c) return; [x, z] = c }
    if (reserved(x, z, Math.max(w, d) / 2)) return;
    const h1 = h * .62, h2 = h * .26, h3 = h - h1 - h2, kind = opts.kind | 0, crown = CROWN[(opts.kind * 3 + Math.round(h)) % CROWN.length];
    const C = Math.cos(ry), S = Math.sin(ry), at = (lx, lz) => [x + lx * C + lz * S, z - lx * S + lz * C];
    put(boxUV(w + 3, 6, d + 3, 8, 4), concrete, x, 3, z, 0, ry, 0); cube(crown, x, 6.15, z, w + 3.4, .45, d + 3.4, ry);
    if (kind === 1) { // round tower with sky-garden rings
      const r = Math.min(w, d) / 2 + 1, g = new T.CylinderGeometry(r, r, h, 24, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.round(r * .4), uv.getY(i) * h / 32);
      put(g, m, x, 6 + h / 2, z); for (const k of [.34, .67, 1]) put(new T.CylinderGeometry(r + .45, r + .45, .7, 24), k === 1 ? crown : trimM, x, 6 + h * k + .3, z);
      put(new T.CylinderGeometry(r * .55, r * .7, 3, 24), crown, x, 6 + h + 2, z);
    } else if (kind === 2) { // slim slab with a coloured spine and a sloped cap
      put(boxUV(w, h, d * .72, 16, 32), m, x, 6 + h / 2, z, 0, ry, 0);
      const [fx, fz] = at(w * .5 + .35, 0); cube(crown, fx, 6 + h * .55, fz, .9, h * 1.1, d * .5, ry);
      cube(trimM, x, 6 + h + .3, z, w + .8, .6, d * .72 + .8, ry); const [cx2, cz2] = at(-w * .18, 0); put(boxUV(w * .55, 5, d * .6, 16, 32), m, cx2, 6 + h + 3, cz2, 0, ry, .12);
    } else if (kind === 3) { // two offset blocks of different height, joined
      const [ax, az] = at(-w * .22, 0), [bx2, bz2] = at(w * .27, d * .08);
      put(boxUV(w * .56, h, d, 16, 32), m, ax, 6 + h / 2, az, 0, ry, 0); put(boxUV(w * .46, h * .72, d * .8, 16, 32), m, bx2, 6 + h * .36, bz2, 0, ry, 0);
      cube(crown, ax, 6 + h + .5, az, w * .56 + .7, 1, d + .7, ry); cube(crown, bx2, 6 + h * .72 + .35, bz2, w * .46 + .6, .7, d * .8 + .6, ry);
    } else { // stepped tower
      put(boxUV(w, h1, d, 16, 32), m, x, 6 + h1 / 2, z, 0, ry, 0); cube(trimM, x, 6 + h1 + .3, z, w + .8, .6, d + .8, ry);
      put(boxUV(w * .82, h2, d * .82, 16, 32), m, x, 6 + h1 + h2 / 2, z, 0, ry, 0); cube(trimM, x, 6 + h1 + h2 + .3, z, w * .82 + .8, .6, d * .82 + .8, ry);
      put(boxUV(w * .58, h3, d * .58, 16, 32), m, x, 6 + h1 + h2 + h3 / 2, z, 0, ry, 0); cube(crown, x, 6 + h + .4, z, w * .58 + .7, .8, d * .58 + .7, ry);
    }
    put(new T.CylinderGeometry(.25, .4, h * .1, 6), steel, x, 6 + h + h * .05, z);
    if (opts.neon) { const c = Math.cos(ry), s = Math.sin(ry); for (const e of [-1, 1]) cube(opts.neon, x + e * (w / 2 + .1) * c + (d / 2 + .1) * s, 6 + h1 / 2, z - e * (w / 2 + .1) * s + (d / 2 + .1) * c, .35, h1 * .9, .35, ry) }
    addOColl(x, z, w + 4, d + 4, ry, h); ROOMS.push({x, z, w: w + 4, d: d + 4});
  }

  // ---------- roads ----------
  road(RING_PTS.filter(([x, z]) => !(x > -168 && x < 168 && z > 100)), false);
  // spoke ends that stop near the ring are snapped onto its centre line, so every junction actually connects
  const snapRing = p => { let best = null, bd = 30; for (const q of RING_PTS) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q } } return best ? [best[0], best[1]] : p };
  const spoke = (ctrl) => { ctrl = ctrl.slice(); ctrl[0] = snapRing(ctrl[0]); ctrl[ctrl.length - 1] = snapRing(ctrl[ctrl.length - 1]); road(sampleCurve(ctrl, false, 4), false, 14, .056) };
  spoke([[40, -246], [30, -300], [-5, -350], [-20, -400], [-10, -445]]);
  spoke([[262, 30], [320, 38], [380, 30], [440, 44], [492, 40]]);
  spoke([[250, -175], [310, -190], [370, -170], [430, -195], [490, -185]]);
  spoke([[-250, -20], [-310, -40], [-370, -22], [-430, -48], [-495, -36]]);
  spoke([[120, -258], [150, -300], [165, -350], [190, -410]]);
  spoke([[-205, -244], [-215, -300], [-198, -350]]);
  for (const x of [-120, -40, 40, 120]) spoke([[x, -170], [x + 3, -205], [x, -246]]);
  spoke([[-238, 104], [-270, 132], [-300, 150]]);
  spoke([[215, 116], [228, 145], [240, 172]]);
  // the old city's east-west streets used to stop dead at its edge: run each one out to the ring road
  for (const z of [-120, -40, 40, 120]) for (const sg of [-1, 1]) {
    const p0 = [sg * 170, z]; let q = null, bd = 1e9;
    for (const p of RING_PTS) { if (Math.sign(p[0]) !== sg) continue; const d = Math.abs(p[1] - z) * 3 + Math.abs(p[0] - p0[0]); if (d < bd) { bd = d; q = p } }
    if (q && Math.hypot(q[0] - p0[0], q[1] - p0[1]) > 14) road(sampleCurve([p0, [(p0[0] + q[0]) / 2, (z + q[1]) / 2], [q[0], q[1]]], false, 4), false, 14, .056);
  }

  // ---------- trees / palms ----------
  const TREES = [], PALMS = [];
  const nearRoad = (x, z, r) => { for (const L of DMAP.lines) for (let i = 0; i < L.pts.length; i += 2) { const p = L.pts[i]; if (Math.abs(p[0] - x) < r + L.w / 2 + 2 && Math.abs(p[1] - z) < r + L.w / 2 + 2) return true } return false };
  const free = (x, z, r) => { for (const b of ROOMS) if (Math.hypot(b.x - x, b.z - z) < Math.max(b.w, b.d) / 2 + r) return false; return !nearRoad(x, z, r) };
  function treesIn(pts, n) { for (let i = 0; i < n * 4 && n > 0; i++) { const x = rnd(-500, 500), z = rnd(-470, 270); if (!inPoly(pts, x, z) || !free(x, z, 2)) continue; TREES.push([x, z, rnd(.8, 1.4)]); n-- } }

  // ======================= LANDMARKS =======================
  {
    // nearest open ground to where we'd like it: clear of roads, the old city, the sea edge and other landmarks
    const open = (x, z, r) => {
      if (x > -185 - r && x < 185 + r && z > -185 - r) return false;
      if (reserved(x, z, r + 3)) return false;
      for (let a = 0; a < 6.28; a += .4) if (!inPoly(coast, x + Math.cos(a) * (r + 4), z + Math.sin(a) * (r + 4))) return false;
      for (const L of DMAP.lines) for (const p of L.pts) if (Math.hypot(p[0] - x, p[1] - z) < r + L.w / 2 + 4) return false;
      return true;
    };
    const place = (name, wantX, wantZ, r, halfW, halfD, make, ry) => {
      for (let ring = 0; ring <= 130; ring += 5) for (let a = 0; a < 6.28; a += ring ? 5 / ring : 7) {
        const x = wantX + Math.cos(a) * ring, z = wantZ + Math.sin(a) * ring;
        if (!open(x, z, r)) continue;
        // face the old city, which is where players come from
        const face = ry !== undefined ? ry : Math.round(Math.atan2(-x, -z) / (PI / 2)) * (PI / 2);
        // a paved square with flower beds and clipped hedges around every landmark
        stampDisc(x, z, r + 1.5, .06); stampDisc(x, z, r - .5, .07);
        { const g = KIT.frame(x, z, 0); g.cyl(r + 1.5, r + 1.5, .05, 0xd8c7a4, 0, .03, 0, 40); g.cyl(r - .5, r - .5, .05, 0xe8dcc0, 0, .045, 0, 40);
          for (let a = 0; a < 6.28; a += 4.2 / r) { const lx = Math.sin(a) * (r + .6), lz = Math.cos(a) * (r + .6); if (Math.abs(((a - face + PI * 3) % (PI * 2)) - PI) < .35) continue; g.ball(.75, 0x4c9a3a, lx, .5, lz); if (R() < .4) g.ball(.3, [0xff6f91, 0xffd23f, 0xb98cff][Math.floor(R() * 3)], lx, 1.2, lz) } }
        const H = make(KIT.frame(x, z, face), x, z, face) || 8;
        RESERVED.push({x, z, r}); ROOMS.push({x, z, w: r * 2, d: r * 2}); if (halfW) addOColl(x, z, halfW * 2, halfD * 2, face, H);
        if (name) label(name, x, z);
        return;
      }
      console.warn('no room for', name);
    };
    place('Clock Tower', -230, -175, 21, 18, 7, f => KIT.clockTower(f));
    place('City Hall', -60, -225, 16, 11, 9, f => KIT.civic(f, 20, 16));
    place('Stadium', -300, -300, 31, 29, 23.5, f => KIT.stadium(f), 0);
    place('Giant Wheel', -245, 60, 14, 7, 3, (f, x, z, face) => { KIT.ferrisWheel(x, z, face, TICK); return 34 });
    place('Pagoda Market', 255, -95, 16, 13, 9, f => KIT.market(f));
    place('Grand Museum', -250, -60, 17, 12, 10, f => KIT.civic(f, 22, 18));
    place('Royal Hall', 250, -250, 18, 15, 8, f => KIT.manor(f, 28, 14, 3));
    place('Rose Garden', -215, -120, 12, 0, 0, f => KIT.fountainGarden(f));
    place('', 245, 60, 12, 0, 0, f => KIT.fountainGarden(f));
    place('', -230, 25, 15, 13, 6, f => KIT.manor(f, 24, 11, 2));
  }

  // ======================= CITY CENTRE (CBD) =======================
  {
    const zone = blob(-40, -350, 125, 88, .18); area(zone, paved, 3, .02, '#7d8fa8'); label('City Center (CBD)', -60, -350);
    const cx = -40, cz = -350;
    const spots = [[-140, -300, 22, 22, 70], [-112, -318, 18, 26, 95], [-150, -352, 20, 18, 55], [-112, -385, 24, 20, 120], [-128, -420, 22, 22, 80],
      [-72, -300, 20, 20, 140], [-68, -410, 26, 22, 105], [32, -296, 22, 20, 65], [58, -340, 20, 26, 100], [36, -395, 22, 22, 130], [74, -405, 16, 16, 60], [-20, -430, 18, 18, 75]];
    spots.forEach(([x, z, w, d, h], i) => tower(x + rnd(-4, 4), z + rnd(-4, 4), w, d, h * .5, GLASS[(i * 3) % GLASS.length], rnd(-.45, .45), {kind: i % 4, neon: i % 6 === 0 ? (i % 12 ? neonB : neonP) : null}));
    put(new T.CylinderGeometry(22, 22, .3, 40), paved, cx, .15, cz); put(new T.CylinderGeometry(9, 9.5, .9, 32), stone, cx, .55, cz);
    const wtr = new T.Mesh(new T.CylinderGeometry(8.6, 8.6, .1, 32), seaMat); wtr.position.set(cx, 1, cz); scene.add(wtr); put(new T.CylinderGeometry(.6, 1, 3, 12), stone, cx, 2.2, cz);
    const jet = new T.Mesh(new T.ConeGeometry(1.2, 6, 12, 1, true), new T.MeshStandardMaterial({color: 0xdff4ff, transparent: true, opacity: .45, roughness: .1})); jet.position.set(cx, 6.5, cz); scene.add(jet);
    TICK.push((dt, t) => { jet.scale.y = 1 + Math.sin(t * 3) * .12 }); addColl(cx - 9.5, cx + 9.5, cz - 9.5, cz + 9.5, 2);
    { const mx = 76, mz = -280, ry = -.35; put(new T.CylinderGeometry(24, 24, 16, 32, 1, false, PI, PI), OFFICE, mx, 8, mz, 0, ry, 0); put(new T.CylinderGeometry(24.5, 24.5, .8, 32, 1, false, PI, PI), concrete, mx, 16.4, mz, 0, ry, 0); addOColl(mx, mz, 50, 26, ry, 16); ROOMS.push({x: mx, z: mz, w: 50, d: 26});
      const ms = sign('STARTUP MALL', '#141414', '#ffd21f', 3, .9); ms.position.set(mx - 22 * Math.sin(ry), 13, mz - 22 * Math.cos(ry)); ms.rotation.y = ry + PI; scene.add(ms) }
    for (let i = 0; i < 18; i++) { const a = i / 18 * PI * 2; TREES.push([cx + Math.cos(a) * 30, cz + Math.sin(a) * 30, 1]) }
  }

  // ======================= IT PARK =======================
  {
    const zone = blob(180, -360, 70, 82, .2, 28, .3); area(zone, grass, 6, .018, '#5f8fa0'); label('IT Park', 180, -360);
    [[150, -315, 34, 18, 34], [215, -318, 30, 18, 42], [150, -372, 30, 22, 48], [215, -380, 34, 20, 30], [168, -425, 28, 18, 38]].forEach(([x, z, w, d, h], bi) => {
      h *= .7; const ry = rnd(-.6, .6); { const c = placeClear(x, z, w + 1, d + 1, ry); if (!c) return; [x, z] = c } const skin = OFFICES[bi % OFFICES.length], cap = CROWN[bi % CROWN.length]; put(boxUV(w, h, d, 16, 32), skin, x, h / 2, z, 0, ry, 0); cube(cap, x, h + .4, z, w + .8, .8, d + .8, ry); if (bi % 2) put(boxUV(w * .6, 7, d * .7, 16, 32), skin, x, h + 4, z, 0, ry, 0); else cube(white, x, h * .5, z, w + .3, .35, d + .3, ry); cube(cap, x, 2.2, z, w + 1.1, .5, d + 1.1, ry); addOColl(x, z, w + 1, d + 1, ry, h); ROOMS.push({x, z, w, d}) });
    const s = sign('Startup IT Park', '#127a5a', '#fff', 1.8, .7); s.position.set(150, 4, -296); s.rotation.y = -.5; scene.add(s); treesIn(zone, 50);
  }

  // ======================= UNIVERSITY =======================
  {
    const zone = blob(-205, -390, 40, 50, .18); area(zone, grass, 6, .018, '#8aa070'); label('University', -205, -392);
    put(boxUV(40, 14, 16, 16, 12.8), FACADE[1], -205, 7, -380); put(new T.SphereGeometry(7, 20, 12, 0, PI * 2, 0, PI / 2), mat(0xd9d2c2, .5), -205, 14, -380);
    for (let i = 0; i < 6; i++) put(new T.CylinderGeometry(.6, .6, 9, 12), white, -219 + i * 5.6, 4.5, -371.5);
    addColl(-226, -184, -389, -371, 14); ROOMS.push({x: -205, z: -380, w: 40, d: 16});
    const s = sign('Startup City University', '#7b2d8b', '#fff', 1.4, .6); s.position.set(-205, 11.5, -371.9); scene.add(s); treesIn(zone, 22);
  }

  // ======================= RESIDENTIAL: winding lanes with houses at angles =======================
  {
    const zone = blob(-385, -120, 112, 215, .14); area(zone, grass, 6, .016, '#c9b48f'); label('Residential Area', -400, -150);
    const lanes = [[[-262, -150], [-300, -175], [-345, -150], [-390, -185], [-440, -160], [-480, -190]],
      [[-262, 60], [-305, 85], [-350, 60], [-400, 92], [-450, 70], [-485, 90]],
      [[-310, -40], [-330, -95], [-318, -150]], [[-430, -48], [-420, 10], [-438, 70]], [[-350, -150], [-360, -230], [-330, -290]], [[-440, -160], [-455, -250], [-420, -300]]];
    const names = ['Shanti Kunj CHS', 'Sai Darshan', 'Gokul Dham', 'Prem Nagar CHS', 'Om Shanti Apts', 'Laxmi Niwas', 'Ganga Vihar'];
    let k = 0;
    for (const ctrl of lanes) { const pts = sampleCurve(ctrl, false, 4); ribbon(pts, 8, asphaltM, .05, false, 8); DMAP.lines.push({pts, w: 8}) }
    for (const ctrl of lanes) {
      const pts = sampleCurve(ctrl, false, 4);
      for (let i = 4; i < pts.length - 2; i += 6) for (const side of [-1, 1]) {
        const a = pts[i - 1], b = pts[i + 1], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz), nx = -tz / l, nzz = tx / l;
        const low = R() < .55, w = low ? rnd(9, 13) : rnd(16, 22), d = low ? rnd(9, 12) : rnd(13, 17), off = 7 + d / 2 + rnd(0, 4);
        const x = pts[i][0] + nx * side * off, z = pts[i][1] + nzz * side * off;
        if (!inPoly(zone, x, z) || !free(x, z, Math.max(w, d) / 2)) continue;
        const ry = Math.atan2(nx * side, nzz * side) + PI + rnd(-.12, .12);
        building(x, z, ry, w, d, low ? 2 + Math.floor(R() * 2) : 4 + Math.floor(R() * 4), {gable: low && R() < .7, front: 1});
        if (!low && k++ % 3 === 0) { const s = sign(names[k % names.length], '#19a7a0', '#fff', .9, .5); s.position.set(x - nx * side * (d / 2 + 2.5), 2.6, z - nzz * side * (d / 2 + 2.5)); s.rotation.y = ry; scene.add(s) }
      }
    }
    treesIn(zone, 130);
  }

  // ======================= SLUMS: dense irregular huts =======================
  {
    const zone = blob(205, -20, 26, 125, .2); area(zone, dirt, 4, .016, '#b5875f'); label('Old Town', 200, -20);
    const cols = [0xd96a5a, 0x5aa0d9, 0xe0c25a, 0x7cc47a, 0xc98ad9, 0xe8e0d0, 0x8d7a66], hm = new T.InstancedMesh(BOX, mat(0xffffff, .9), 1100), tm = new T.InstancedMesh(new T.BoxGeometry(1, .08, 1), mat(0xffffff, .7), LOW ? 500 : 1100), o = new T.Object3D();
    let n = 0;
    for (let i = 0; i < 4000 && n < (LOW ? 500 : 1100); i++) {
      const x = rnd(170, 240), z = rnd(-150, 110); if (!inPoly(zone, x, z) || Math.abs(x - 205 - Math.sin(z * .05) * 6) < 1.8) continue;
      const h = rnd(2.4, 3.6) * (R() < .22 ? 1.7 : 1), ry = rnd(-.5, .5), sx = rnd(2.4, 3.2), sz = rnd(2.6, 3.4); if (hitsRoad(x, z, sx, sz, ry, 1.5) || reserved(x, z, 2.5)) continue;
      o.position.set(x, h / 2, z); o.scale.set(sx, h, sz); o.rotation.set(0, ry, 0); o.updateMatrix(); hm.setMatrixAt(n, o.matrix); hm.setColorAt(n, new T.Color(cols[n % cols.length]));
      o.position.y = h + .05; o.scale.set(sx + .5, 1, sz + .5); o.rotation.set(rnd(-.06, .06), ry, rnd(-.08, .08)); o.updateMatrix(); tm.setMatrixAt(n, o.matrix); tm.setColorAt(n, new T.Color(R() < .6 ? 0x2f6fd0 : (R() < .5 ? 0x8d8d8d : 0xb44a3a))); n++;
      addOColl(x, z, sx, sz, ry, h);
    }
    hm.count = tm.count = n; hm.castShadow = tm.castShadow = true; hm.receiveShadow = true; scene.add(hm, tm);
  }

  // ======================= AIRPORT =======================
  {
    const zone = blob(380, 70, 125, 75, .1); area(zone, grass, 8, .016, '#9aa3ad'); label('Airport', 380, 95);
    const rwTex = ctex(1024, 128, (x, w, h) => { x.fillStyle = '#2f3033'; x.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { x.globalAlpha = .2; x.fillStyle = R() < .5 ? '#202022' : '#45464a'; x.fillRect(R() * w, R() * h, 2, 2) } x.globalAlpha = 1; x.fillStyle = '#f2f2ee';
      for (let i = 0; i < 24; i++) x.fillRect(80 + i * 36, 60, 20, 6); for (const e of [10, w - 60]) for (let i = 0; i < 8; i++) x.fillRect(e, 14 + i * 13, 44, 7); x.fillRect(0, 4, w, 3); x.fillRect(0, h - 7, w, 3) });
    const rw = new T.Mesh(new T.PlaneGeometry(230, 30), new T.MeshStandardMaterial({map: rwTex, roughness: .9})); rw.rotation.x = -PI / 2; rw.position.set(385, .03, 112); rw.receiveShadow = true; scene.add(rw);
    area(blob(380, 74, 105, 13, .05, 24), asphaltM, 10, .025);
    put(boxUV(120, 12, 26, 16, 32), OFFICE, 375, 6, 12); addColl(315, 435, -1, 25, 12);
    const roofS = new T.Shape(); roofS.moveTo(-14, 0); roofS.quadraticCurveTo(0, 7, 14, 0); roofS.lineTo(14, -.8); roofS.quadraticCurveTo(0, 6, -14, -.8); roofS.closePath();
    put(new T.ExtrudeGeometry(roofS, {depth: 126, bevelEnabled: false}), white, 312, 12.4, 12, 0, PI / 2, 0);
    const ts = sign('STARTUP CITY INTERNATIONAL AIRPORT', '#141414', '#fff', 2.2, .8); ts.position.set(375, 9.5, 25.2); scene.add(ts);
    put(new T.CylinderGeometry(2.2, 3, 34, 16), concrete, 455, 17, 14); put(new T.CylinderGeometry(6, 4.5, 5, 16), GLASS[1], 455, 36.5, 14); put(new T.CylinderGeometry(6.4, 6.4, .8, 16), white, 455, 39.4, 14); addColl(452, 458, 11, 17, 40);
    function plane3(px, pz, ry, livery) {
      const g = new T.Group(), body = mat(0xf4f4f2, .35, .2), liv = mat(livery, .4, .2);
      const f = new T.Mesh(new T.CapsuleGeometry(2, 26, 6, 16), body); f.rotation.z = PI / 2; g.add(f);
      const nose = new T.Mesh(new T.SphereGeometry(2, 16, 12), body); nose.scale.set(1.6, 1, 1); nose.position.x = 14; g.add(nose);
      const stripe = new T.Mesh(new T.BoxGeometry(28, .5, 4.1), liv); stripe.position.y = -.4; g.add(stripe);
      const wing = new T.Mesh(new T.BoxGeometry(6, .5, 30), body); wing.position.set(1, -.6, 0); wing.rotation.y = .25; g.add(wing);
      const tw = new T.Mesh(new T.BoxGeometry(3, .4, 11), body); tw.position.set(-13, .8, 0); g.add(tw);
      const fin = new T.Mesh(new T.BoxGeometry(4.5, 7, .4), liv); fin.position.set(-13, 4, 0); fin.rotation.z = -.35; g.add(fin);
      for (const s of [-1, 1]) { const en = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 3.5, 14), mat(0xb9bdc2, .3, .7)); en.rotation.z = PI / 2; en.position.set(2.5, -1.8, s * 6.5); g.add(en) }
      for (let i = 0; i < 12; i++) { const w = new T.Mesh(new T.BoxGeometry(.6, .5, .1), mat(0x1d2733, .2)); w.position.set(9 - i * 1.8, .7, 2.02); g.add(w); const w2 = w.clone(); w2.position.z = -2.02; g.add(w2) }
      for (const [gx, gz] of [[10, 0], [0, 2.6], [0, -2.6]]) { const wh = new T.Mesh(new T.CylinderGeometry(.5, .5, .5, 10), mat(0x161616, .9)); wh.rotation.x = PI / 2; wh.position.set(gx, -2.6, gz); g.add(wh) }
      g.traverse(o => { if (o.isMesh) o.castShadow = true }); g.position.set(px, 3.1, pz); g.rotation.y = ry; scene.add(g); return g;
    }
    plane3(300, 74, PI / 2 + .3, 0xd35400); plane3(345, 72, PI / 2, 0x1e5fa8); plane3(422, 75, PI / 2 - .25, 0x7b2d8b);
    addColl(285, 315, 58, 90, 6); addColl(330, 360, 56, 88, 6); addColl(407, 437, 59, 91, 6);
    const fly = plane3(380, 3.1, 112, 0xc0392b); let ft = 0;
    TICK.push(dt => { ft = (ft + dt) % 60;
      if (ft < 12) { const k = ft / 12; fly.position.set(272 + k * 230, 3.1 + Math.max(0, k - .55) * 120, 112); fly.rotation.set(0, 0, Math.max(0, k - .55) * .35) }
      else { const a = (ft - 12) / 48 * PI * 2; fly.position.set(380 + Math.cos(a) * 560, 60 + Math.sin(a * 2) * 10, 60 + Math.sin(a) * 420); fly.rotation.set(0, -a, -.25) } });
  }

  // ======================= INDUSTRIAL ZONE =======================
  {
    const zone = blob(380, -210, 120, 110, .2); area(zone, dirt, 5, .016, '#8a7a6a'); label('Industrial Zone', 360, -255);
    [[300, -125, 40, 26, 11], [360, -128, 46, 26, 13], [430, -120, 40, 30, 12], [305, -235, 36, 30, 14], [462, -245, 34, 50, 12]].forEach(([x, z, w, d, h]) => {
      const ry = rnd(-.35, .35); { const c = placeClear(x, z, w, d, ry); if (!c) return; [x, z] = c } put(boxUV(w, h, d, 4, 4), corr, x, h / 2, z, 0, ry, 0); const rs = new T.Shape(); rs.moveTo(-d / 2, 0); rs.lineTo(0, 3.5); rs.lineTo(d / 2, 0); rs.closePath();
      const g = new T.ExtrudeGeometry(rs, {depth: w, bevelEnabled: false}); g.rotateY(PI / 2); g.translate(-w / 2, 0, 0); put(g, mat(0x7d8489, .5, .6), x, h, z, 0, ry, 0); addOColl(x, z, w, d, ry, h + 3); ROOMS.push({x, z, w, d}) });
    for (const [x, z, h] of [[382, -232, 48], [398, -244, 56], [412, -228, 44]]) {
      for (let i = 0; i < 6; i++) put(new T.CylinderGeometry(2.4 - i * .12, 2.6 - i * .12, h / 6, 16), i % 2 ? white : red, x, h / 12 + i * h / 6, z);
      addColl(x - 3, x + 3, z - 3, z + 3, h);
      const puffs = []; for (let k = 0; k < 6; k++) { const p = new T.Mesh(new T.SphereGeometry(3, 10, 8), new T.MeshStandardMaterial({color: 0xe8e8e8, transparent: true, opacity: .5, roughness: 1, depthWrite: false})); scene.add(p); puffs.push({p, t: k * 1.3}) }
      TICK.push(dt => { for (const q of puffs) { q.t = (q.t + dt) % 8; const k = q.t / 8; q.p.position.set(x + k * 22, h + 2 + k * 26, z - k * 8); q.p.scale.setScalar(.6 + k * 2.2); q.p.material.opacity = .55 * (1 - k) } });
    }
    for (let i = 0; i < 6; i++) { const x = 292 + (i % 3) * 22 + rnd(-3, 3), z = -292 + Math.floor(i / 3) * 24 + rnd(-3, 3); put(new T.CylinderGeometry(9, 9, 12, 24), mat(0xdcdcd6, .5, .3), x, 6, z); put(new T.SphereGeometry(9, 24, 8, 0, PI * 2, 0, PI / 2), mat(0xc8c8c2, .5, .3), x, 12, z); addColl(x - 9, x + 9, z - 9, z + 9, 14) }
  }

  // ======================= BANDRA BAY (crescent beach) =======================
  {
    const beach = []; for (let t = 0; t <= 1.0001; t += .05) beach.push([-366 + t * 194, 150 + Math.sin(t * PI) * 10]);
    for (let t = 1; t >= -.0001; t -= .05) beach.push([-366 + t * 194, 170 + Math.sin(t * PI) * 44 + Math.sin(t * 13) * 2]);
    area(beach, sand, 8, .03, '#e3cf9c'); label('Bandra Bay', -280, 185);
    ribbon(sampleCurve([[-366, 148], [-300, 156], [-230, 156], [-172, 150]], false, 4), 7, paved, .12, false, 3);
    for (let i = 0; i < 18; i++) { const t = rnd(.05, .95); PALMS.push([-366 + t * 194 + rnd(-3, 3), 160 + Math.sin(t * PI) * 10 + rnd(0, 6)]) }
    for (let i = 0; i < 16; i++) { const t = rnd(.1, .9), x = -366 + t * 194, z = 170 + Math.sin(t * PI) * rnd(14, 34), c = [0xe84393, 0x2c5fa8, 0xf2c94c, 0x1e7b4a, 0xe8742a][i % 5];
      put(new T.CylinderGeometry(.05, .05, 2.6, 6), white, x, 1.3, z); put(new T.ConeGeometry(1.8, .7, 10), mat(c, .7), x, 2.7, z) }
    const fw = new T.Group(); fw.position.set(-215, 0, 185); fw.rotation.y = .35; scene.add(fw);
    const rim = new T.Group(); rim.position.y = 24; fw.add(rim); const tub = mat(0xdfe6ec, .35, .7);
    rim.add(new T.Mesh(new T.TorusGeometry(20, .35, 8, 64), tub)); rim.add(new T.Mesh(new T.TorusGeometry(17, .25, 8, 64), tub)); const cabs = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; const sp = new T.Mesh(new T.BoxGeometry(.25, 20, .25), tub); sp.position.set(Math.cos(a) * 10, Math.sin(a) * 10, 0); sp.rotation.z = a + PI / 2; rim.add(sp);
      const cab = new T.Mesh(new T.BoxGeometry(2, 2.4, 1.8), mat([0xc0392b, 0xf2c94c, 0x2c5fa8, 0x1e7b4a][i % 4], .5)); cab.position.set(Math.cos(a) * 20, Math.sin(a) * 20 - 1.6, 0); rim.add(cab); cabs.push(cab) }
    for (const s of [-1, 1]) { const leg = new T.Mesh(new T.CylinderGeometry(.4, .6, 27, 8), tub); leg.position.set(s * 6, 12.5, 0); leg.rotation.z = s * .24; fw.add(leg); const leg2 = leg.clone(); leg2.position.z = 2; fw.add(leg2) }
    fw.traverse(o => { if (o.isMesh) o.castShadow = true }); TICK.push(dt => { rim.rotation.z += dt * .08; for (const c of cabs) c.rotation.z = -rim.rotation.z });
    addColl(-224, -206, 180, 190, 30);
    put(new T.BoxGeometry(5, .4, 40), mat(0x7a5a3a, .9), -320, .1, 218, 0, .25, 0);
  }

  // ======================= NAVAPUR FORT =======================
  {
    const cx = -430, cz = 215;
    for (let i = 0; i < 26; i++) { const a = R() * PI * 2, r = rnd(10, 60); put(new T.DodecahedronGeometry(rnd(8, 18), 0), rock, cx + Math.cos(a) * r, rnd(-6, 2), cz + Math.sin(a) * r * .8, R() * 3, R() * 3, R() * 3) }
    put(new T.CylinderGeometry(56, 64, 4, 24), rock, cx, 0, cz); area(blob(cx, cz, 44, 40, .12), grass, 6, 2.05, '#8b7d68'); label('Old Fort', cx, cz);
    const W = 64, D = 52, H = 9, ry = .18, c = Math.cos(ry), s = Math.sin(ry), P = (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
    for (const [w, d, lx, lz] of [[W, 2.5, 0, -D / 2], [W, 2.5, 0, D / 2], [2.5, D, -W / 2, 0], [2.5, D, W / 2, 0]]) {
      const [x, z] = P(lx, lz); put(boxUV(w, H, d, 4, 4), stone, x, 2 + H / 2, z, 0, ry, 0); addOColl(x, z, w, d, ry, H + 2);
      const n = Math.floor(Math.max(w, d) / 3); for (let i = 0; i < n; i++) { const [mx, mz] = P(w > d ? lx - w / 2 + 1.5 + i * 3 : lx, w > d ? lz : lz - d / 2 + 1.5 + i * 3); cube(stone, mx, 2 + H + .7, mz, w > d ? 1.4 : 2.6, 1.4, w > d ? 2.6 : 1.4, ry) }
    }
    for (const [lx, lz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) { const [x, z] = P(lx, lz); put(new T.CylinderGeometry(6, 7, 13, 18), stone, x, 8.5, z); addColl(x - 6, x + 6, z - 6, z + 6, 15) }
    { const [x, z] = P(W / 2, 0); cube(stone, x, 8, z, 3.5, 12, 10, ry) }
    { const [x, z] = P(-8, -4); cube(stone, x, 7, z, 14, 10, 14, ry); put(new T.ConeGeometry(9, 6, 4), mat(0x7a3a2a, .8), x, 15, z, 0, PI / 4 + ry, 0); addOColl(x, z, 14, 14, ry, 12);
      put(new T.CylinderGeometry(.15, .15, 10, 6), steel, x, 23, z); const flag = new T.Mesh(new T.PlaneGeometry(4, 2.4), mat(0xff7a1a, .7, 0, {side: T.DoubleSide})); flag.position.set(x + 2, 26.5, z); scene.add(flag);
      TICK.push((dt, t) => { flag.rotation.y = Math.sin(t * 2.4) * .25 }) }
    for (let i = 0; i < 6; i++) put(new T.CylinderGeometry(2.6 - i * .18, 2.8 - i * .18, 4, 16), i % 2 ? white : red, cx - 46, 4 + i * 4, cz + 34);
    const lamp = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 2.2, 12), new T.MeshStandardMaterial({color: 0xfff2c0, emissive: 0xffe08a, emissiveIntensity: 1.2})); lamp.position.set(cx - 46, 27, cz + 34); scene.add(lamp);
    put(new T.BoxGeometry(26, 1.6, 8), stone, cx + 61, .3, cz - 30); put(new T.BoxGeometry(26, .2, 8), paved, cx + 61, 1.12, cz - 30);
  }

  // ======================= PORT & DOCKS =======================
  {
    const quay = [[188, 171], [192, 200], [202, 256], [262, 263], [330, 259], [402, 265], [468, 255], [480, 200], [488, 160], [300, 150], [200, 160]];
    area(quay, asphaltM, 10, .03, '#6f7a85'); label('Port & Docks', 330, 215);
    ribbon(quay.slice(2, 7), 1.2, yellowM, .06, false, 2);
    const cG = new T.BoxGeometry(6, 2.6, 2.5), cols = [0xc0392b, 0x1e5fa8, 0x1e7b4a, 0xe8742a, 0x7a7f86, 0xf2c94c, 0x6a2a5e, 0x2a8a8a];
    const cI = new T.InstancedMesh(cG, mat(0xffffff, .6, .3), 560), o = new T.Object3D(); let n = 0;
    for (let bI = 0; bI < 6; bI++) for (let zI = 0; zI < 3; zI++) { const bx0 = 215 + bI * 42 + rnd(-4, 4), bz0 = 178 + zI * 22 + rnd(-2, 2), ry = rnd(-.12, .12);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { const hgt = 1 + Math.floor(R() * 4); for (let l = 0; l < hgt && n < 560; l++) { const lx = r * 6.4, lz = c * 2.7; o.position.set(bx0 + lx * Math.cos(ry) + lz * Math.sin(ry), 1.3 + l * 2.6, bz0 - lx * Math.sin(ry) + lz * Math.cos(ry)); o.rotation.set(0, ry, 0); o.updateMatrix(); cI.setMatrixAt(n, o.matrix); cI.setColorAt(n, new T.Color(cols[(n * 7 + l) % cols.length])); n++ } }
      addOColl(bx0 + 13 * Math.cos(ry) + 7 * Math.sin(ry), bz0 + 7 * Math.cos(ry) - 13 * Math.sin(ry), 32, 17, ry, 10) }
    cI.count = n; cI.castShadow = cI.receiveShadow = true; scene.add(cI);
    for (const x of [232, 302, 372, 440]) { const ze = 260;
      for (const sx of [-6, 6]) for (const sz of [-10, 10]) put(new T.BoxGeometry(1.2, 38, 1.2), orangeM, x + sx, 19, ze - 12 + sz);
      put(new T.BoxGeometry(14, 2, 2), orangeM, x, 38, ze - 22); put(new T.BoxGeometry(14, 2, 2), orangeM, x, 38, ze - 2); put(new T.BoxGeometry(3, 2.4, 70), orangeM, x, 40, ze + 10); put(new T.BoxGeometry(5, 4, 6), white, x, 42, ze - 4);
      addColl(x - 7, x + 7, ze - 23, ze - 1, 40) }
    const ship = new T.Group(); ship.position.set(335, 0, 290); ship.rotation.y = -.04; scene.add(ship);
    const hs = new T.Shape(); hs.moveTo(-90, 0); hs.lineTo(80, 0); hs.quadraticCurveTo(100, 0, 104, 10); hs.lineTo(-92, 10); hs.closePath();
    const hull = new T.Mesh(new T.ExtrudeGeometry(hs, {depth: 26, bevelEnabled: false}), mat(0x2b3a55, .6, .2)); hull.position.set(0, -4, -13); ship.add(hull);
    const band = new T.Mesh(new T.BoxGeometry(190, 2, 26.2), mat(0xa8322a, .6)); band.position.set(5, -3, 0); ship.add(band);
    const br = new T.Mesh(new T.BoxGeometry(14, 16, 22), white); br.position.set(-80, 14, 0); ship.add(br); const fun = new T.Mesh(new T.CylinderGeometry(2.4, 2.6, 8, 12), red); fun.position.set(-86, 24, 0); ship.add(fun);
    const sc = new T.InstancedMesh(cG, mat(0xffffff, .6, .3), 260); n = 0;
    for (let i = 0; i < 26; i++) for (let j = 0; j < 8; j++) for (let l = 0; l < 1 + (i * 3 + j) % 3 && n < 260; l++) { o.position.set(-66 + i * 6.3, 7.3 + l * 2.6, -9.5 + j * 2.7); o.rotation.set(0, 0, 0); o.updateMatrix(); sc.setMatrixAt(n, o.matrix); sc.setColorAt(n, new T.Color(cols[(i + j * 3 + l) % cols.length])); n++ }
    sc.count = n; ship.add(sc); ship.traverse(q => { if (q.isMesh) q.castShadow = true });
    const s = sign('STARTUP CITY PORT TRUST', '#1e5fa8', '#fff', 2, .7); s.position.set(206, 5, 172); s.rotation.y = PI; scene.add(s);
  }

  // ======================= SEA LINK bridge =======================
  {
    const pts = sampleCurve([[-180, 285], [-60, 310], [70, 312], [190, 290]], false, 6), y = 14;
    for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
      cube(concrete, (ax + bx) / 2, y, (az + bz) / 2, 18, 1.6, l + .3, ry); for (const e of [-1, 1]) cube(white, (ax + bx) / 2 + Math.cos(ry) * 8.8 * e, y + 1.4, (az + bz) / 2 - Math.sin(ry) * 8.8 * e, .5, 1.2, l + .3, ry);
      if (i % 5 === 0) put(new T.CylinderGeometry(1.4, 1.8, y + 10, 10), concrete, ax, (y - 10) / 2, az) }
    ribbon(pts, 15, roadMat, y + .82, false);
    const cableM = new T.LineBasicMaterial({color: 0xe8e8e8});
    for (const k of [.3, .68]) { const [px, pz] = pts[Math.round(k * (pts.length - 1))];
      for (const e of [-1, 1]) put(new T.BoxGeometry(2.6, 70, 2.6), concrete, px, y + 30, pz + e * 7, e * .14, 0, 0); put(new T.BoxGeometry(3, 12, 3), concrete, px, y + 66, pz);
      const cp = []; for (let i = 1; i <= 10; i++) for (const d of [-1, 1]) for (const e of [-1, 1]) { cp.push(px, y + 52 + i * 1.2, pz); cp.push(px + d * i * 9, y + 1.6, pz + e * 8 + d * i * .4) }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(cp, 3)); scene.add(new T.LineSegments(g, cableM)) }
    label('Sea Link', 0, 318);
  }

  // ======================= SAHYADRI HILLS, DAM, WINDMILLS =======================
  {
    const W = 1300, D = 360, g = new T.PlaneGeometry(W, D, 120, 40); g.rotateX(-PI / 2); const p = g.attributes.position, col = [];
    const hAt0 = (x, zz) => { const north = (D / 2 - zz) / D; let h = north * north * 120 + (Math.sin(x * .012) * 18 + Math.sin(x * .031 + zz * .02) * 10 + Math.sin(x * .07 - zz * .05) * 4) * north;
      if (x > 120 && x < 420 && north > .18 && north < .55) h = Math.min(h, 2 + (Math.abs(x - 270) / 150) * 40); return h };
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), north = (D / 2 - z) / D, h = hAt0(x, z); p.setY(i, Math.max(.3, h));
      const c = new T.Color().setHSL(.27 - north * .06, .38, .3 + Math.min(.1, h * .0008)); if (h > 95) c.lerp(new T.Color(0x8a7d68), .5); col.push(c.r, c.g, c.b) }
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const hills = new T.Mesh(g, new T.MeshStandardMaterial({vertexColors: true, roughness: .95})); hills.position.set(0, 0, -470 - D / 2 + 8); hills.receiveShadow = true; scene.add(hills);
    
    const hAt = (x, z) => Math.max(.3, hAt0(x, z - hills.position.z));
    const fG = new T.ConeGeometry(2.4, 7, 7); fG.translate(0, 3.5, 0); const fI = new T.InstancedMesh(fG, leafM, LOW ? 300 : 900), o = new T.Object3D(); let n = 0;
    for (let i = 0; i < 1400 && n < (LOW ? 300 : 900); i++) { const x = rnd(-600, 600), z = rnd(-640, -480), h = hAt(x, z); if (h < 4 || h > 100 || (x > 150 && x < 400 && z > -560 && z < -480)) continue; o.position.set(x, h - .5, z); o.scale.setScalar(rnd(.8, 1.6)); o.rotation.y = R() * 6; o.updateMatrix(); fI.setMatrixAt(n++, o.matrix) }
    fI.count = n; fI.castShadow = true; scene.add(fI);
    const lake = new T.Mesh(new T.PlaneGeometry(220, 80), seaMat); lake.rotation.x = -PI / 2; lake.position.set(275, 6, -530); scene.add(lake);
    put(new T.BoxGeometry(240, 22, 8), concrete, 275, 0, -488); for (let i = 0; i < 8; i++) put(new T.BoxGeometry(6, 14, 2), mat(0xdfeff7, .2, 0, {transparent: true, opacity: .7}), 205 + i * 20, 2, -483);
    
    const blades = [];
    for (const [x, z] of [[-60, -560], [-20, -575], [25, -560]]) { const y = hAt(x, z); put(new T.CylinderGeometry(.9, 1.6, 40, 10), white, x, y + 20, z);
      const hub = new T.Group(); hub.position.set(x, y + 40, z + 1.6); scene.add(hub); for (let b = 0; b < 3; b++) { const bl = new T.Mesh(new T.BoxGeometry(1.4, 18, .3), white); bl.position.y = 9; const arm = new T.Group(); arm.rotation.z = b * PI * 2 / 3; arm.add(bl); hub.add(arm) } blades.push(hub) }
    TICK.push(dt => { for (const b of blades) b.rotation.z += dt * .9 }); 
    { const x = -300, z = -560, y = hAt(x, z); put(new T.BoxGeometry(10, 6, 10), mat(0xf2e9d8, .7), x, y + 3, z); put(new T.ConeGeometry(5, 12, 8), orangeM, x, y + 12, z) }
  }

  // ======================= STARTUP CAFÉ (walk-in meeting place) =======================
  // every chair, sofa place and bar stool is pushed to CAFE.seats so players can sit (X)
  {
    const {x: CX, z: CZ, w: CW, d: CD} = CAFE, x0 = CX - CW / 2, x1 = CX + CW / 2, z0 = CZ - CD / 2, z1 = CZ + CD / 2, WH = 6.2, SEATS = CAFE.seats = [];
    const seat = (x, z, top, ry, back = true) => SEATS.push({x, z, y: top - .475, ry, back}); // back: stand up behind the chair (the table is in front)
    // ---- textures
    const plankT = ctex(512, 512, (x, w, h) => { for (let r = 0; r < 16; r++) { const y = r * 32; for (let c = -1; c < 4; c++) { const off = (r % 2) * 80 + c * 160; x.fillStyle = `hsl(${26 + R() * 6},${38 + R() * 10}%,${36 + R() * 9}%)`; x.fillRect(off, y, 158, 30);
      for (let g = 0; g < 6; g++) { x.strokeStyle = 'rgba(40,20,8,.18)'; x.beginPath(); x.moveTo(off, y + 4 + g * 4.5 + R() * 2); x.bezierCurveTo(off + 50, y + R() * 30, off + 100, y + R() * 30, off + 158, y + 4 + g * 4.5); x.stroke() } }
      x.fillStyle = 'rgba(20,10,4,.55)'; x.fillRect(0, y + 30, w, 2) } });
    plankT.wrapS = plankT.wrapT = T.RepeatWrapping;
    const brickT = ctex(512, 512, (x, w, h) => { x.fillStyle = '#d9d0c4'; x.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let c = -1; c < 5; c++) { const off = (r % 2) * 56 + c * 112; x.fillStyle = `hsl(${12 + R() * 8},${42 + R() * 14}%,${38 + R() * 12}%)`; x.fillRect(off + 2, r * 32 + 2, 108, 28) } });
    brickT.wrapS = brickT.wrapT = T.RepeatWrapping;
    const slatT = ctex(256, 256, (x, w, h) => { x.fillStyle = '#3a2a1f'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(28,40%,${42 + R() * 8}%)`; x.fillRect(i * 32 + 3, 0, 26, h) } });
    slatT.wrapS = slatT.wrapT = T.RepeatWrapping;
    const marbleT = ctex(256, 256, (x, w, h) => { x.fillStyle = '#f2f0ec'; x.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { x.strokeStyle = `rgba(120,120,130,${.12 + R() * .2})`; x.lineWidth = .5 + R() * 1.5; x.beginPath(); x.moveTo(R() * w, 0); x.bezierCurveTo(R() * w, h * .3, R() * w, h * .7, R() * w, h); x.stroke() } });
    const chalk = ctex(512, 256, (x, w, h) => { x.fillStyle = '#1f2622'; x.fillRect(0, 0, w, h); x.strokeStyle = '#8a6a44'; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, h - 14); x.fillStyle = '#f4efe2'; x.font = '700 34px "Baloo 2",sans-serif'; x.fillText('MENU', 30, 52);
      x.font = '600 24px "Baloo 2",sans-serif'; [['Filter coffee', '₹30'], ['Masala chai', '₹15'], ['Cold brew', '₹60'], ['Pitch + coffee', '₹40'], ['Vada pav', '₹20']].forEach(([a, b], i) => { x.fillText(a, 34, 92 + i * 32); x.fillText(b, w - 110, 92 + i * 32) }); x.fillStyle = '#ffd21f'; x.fillText('★ Free Wi-Fi for founders', 260, 52) });
    const neonT = ctex(1024, 192, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = '900 104px "Baloo 2",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ff3fa4'; x.shadowBlur = 28; x.fillStyle = '#ffd3ec'; x.fillText('BUILD · MEET · SHIP', w / 2, h / 2) });
    const muralT = ctex(1024, 384, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1f6f5c'); g.addColorStop(1, '#0f3d52'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(255,210,31,${.08 + R() * .1})`; x.beginPath(); x.arc(R() * w, R() * h, 30 + R() * 90, 0, 7); x.fill() }
      x.fillStyle = '#ffd21f'; x.font = '900 120px "Baloo 2",sans-serif'; x.fillText('STARTUP CAFÉ', 50, 170); x.fillStyle = '#ffffff'; x.font = '700 54px "Baloo 2",sans-serif'; x.fillText('☕ Coffee · 💻 Code · 🤝 Co-founders', 54, 280) });
    const awnT = ctex(256, 64, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f4efe2' : '#1f6f5c'; x.fillRect(i * 32, 0, 32, h) } });
    awnT.wrapS = T.RepeatWrapping;
    const glowT = ctex(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,214,140,.55)'); g.addColorStop(1, 'rgba(255,214,140,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h) });
    // ---- materials
    const M = o => new T.MeshStandardMaterial(o), plankM = M({map: plankT, roughness: .62}), brickM = M({map: brickT, roughness: .9}), slatM = M({map: slatT, roughness: .7}), marbleM = M({map: marbleT, roughness: .25});
    const wood = mat(0x7a4b2c, .65), woodL = mat(0xc89a6a, .6), cream = mat(0xf3ead8, .85), dark = mat(0x26221f, .55), brass = mat(0xc9a25a, .3, .75), steelC = mat(0xb9bec4, .3, .8);
    const glassC = M({color: 0xcfeaff, transparent: true, opacity: .2, roughness: .03, metalness: .3, depthWrite: false});
    const leather = mat(0x7a3f2a, .55), fabric = mat(0x2f5d73, .8), green = mat(0x3f8a36, .85), green2 = mat(0x2f7a3a, .85), potC = mat(0xe4ddd0, .7), terra = mat(0xb5643a, .8);
    const warm = M({color: 0xfff1c9, emissive: 0xffd58a, emissiveIntensity: 1.3}), screenM = M({color: 0x0b1a2a, emissive: 0x3aa0ff, emissiveIntensity: .7}), cupM = mat(0xffffff, .4);
    const neonM = new T.MeshBasicMaterial({map: neonT, transparent: true, depthWrite: false}), glowM = new T.MeshBasicMaterial({map: glowT, transparent: true, depthWrite: false, blending: T.AdditiveBlending});
    // ---- ground: paved plaza around it
    area(blob(CX + 7, CZ, 31, 23, .1), paved, 3, .035);
    // ---- floor, walls, ceiling
    { const g = boxUV(CW, .08, CD, 4, 4); put(g, plankM, CX, .04, CZ) } stampRect(CX - CW / 2, CX + CW / 2, CZ - CD / 2, CZ + CD / 2, .08);
    cube(cream, x0 + .3, WH / 2, CZ, .6, WH, CD); addColl(x0, x0 + .6, z0, z1, WH);
    { const p = new T.PlaneGeometry(CD - 1.2, WH - .2); const uv = p.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5, uv.getY(i) * 1.3); put(p, brickM, x0 + .62, WH / 2, CZ, 0, PI / 2, 0) } // exposed brick inside
    for (const zz of [z0 + .3, z1 - .3]) { cube(cream, CX, WH / 2, zz, CW, WH, .6); addColl(x0, x1, zz - .3, zz + .3, WH); cube(wood, CX, .55, zz + (zz < CZ ? .32 : -.32), CW - 1.4, 1.1, .06) } // + wood wainscot
    { const p = new T.PlaneGeometry(CW - 1.2, CD - 1.2); const uv = p.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9, uv.getY(i) * 6); put(p, slatM, CX, WH - .05, CZ, PI / 2, 0, 0) } // wooden slat ceiling
    // glass front with wood-clad pillars and a 7 m entrance
    const door = 7, seg = (CD - door) / 2;
    for (const e of [-1, 1]) { const zc = CZ + e * (door / 2 + seg / 2); put(BOX, glassC, x1 - .1, WH / 2, zc, 0, 0, 0, .1, WH - .4, seg); addColl(x1 - .3, x1 + .1, zc - seg / 2, zc + seg / 2, WH);
      for (let k = 0; k <= 3; k++) cube(k === 0 || k === 3 ? wood : dark, x1 - .1, WH / 2, zc - seg / 2 + k * seg / 3, k === 0 || k === 3 ? .5 : .12, WH, k === 0 || k === 3 ? .5 : .1);
      cube(dark, x1 - .1, 2.4, zc, .12, .08, seg) }
    cube(wood, x1 - .1, WH - .35, CZ, .4, .7, door + .6);
    // roof with wood fascia
    put(boxUV(CW + 2, .5, CD + 2, 4, 4), concrete, CX, WH + .25, CZ); cube(wood, CX, WH + .62, CZ, CW + 2.4, .3, CD + 2.4);
    // striped awning over the terrace + posts + string lights
    { const aw = new T.BoxGeometry(8.6, .12, CD - 2); const uv = aw.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i)); put(aw, M({map: awnT, roughness: .8}), x1 + 4.1, WH - .9, CZ, 0, 0, -.12) }
    for (const zz of [z0 + 1.5, z1 - 1.5]) cube(dark, x1 + 8.2, (WH - 1.4) / 2, zz, .18, WH - 1.4, .18);
    for (let i = 0; i <= 18; i++) { const t = i / 18, zz = z0 + 1.5 + t * (CD - 3), sag = Math.sin(t * PI) * .5; put(new T.SphereGeometry(.09, 8, 6), warm, x1 + 8.1, WH - 1.5 - sag, zz) }
    // big signs: roof sign, door sign, mural on the street side
    const s1 = sign('STARTUP CAFÉ', '#1f6f5c', '#ffd21f', 3.2, 1); s1.position.set(x1 + 1.3, WH + 1.9, CZ); s1.rotation.y = PI / 2; scene.add(s1);
    const s2 = sign('☕ Meet founders here', '#141414', '#ffffff', 1.2, .5); s2.position.set(x1 + .2, 2.9, CZ - door / 2 - 1.6); s2.rotation.y = PI / 2; scene.add(s2);
    { const mu = new T.Mesh(new T.PlaneGeometry(CW - 4, 7.8), M({map: muralT, roughness: .8})); mu.position.set(CX, 3.3, z0 - .02); mu.rotation.y = PI; scene.add(mu) }
    // ---- counter: slatted front, marble top, machines, back bar with chalkboard menu and shelves
    { const f = new T.BoxGeometry(1.6, 1.15, 12); put(f, slatM, x0 + 3.2, .6, CZ); put(new T.BoxGeometry(2, .08, 12.4), marbleM, x0 + 3.2, 1.22, CZ); addColl(x0 + 2.3, x0 + 4.1, CZ - 6.2, CZ + 6.2, 1.3) }
    for (const zz of [CZ - 3.5, CZ + 1, CZ + 4]) { cube(steelC, x0 + 3.0, 1.58, zz, .62, .62, .78); cube(dark, x0 + 3.0, 1.92, zz, .64, .08, .8); put(new T.CylinderGeometry(.05, .05, .2, 8), steelC, x0 + 3.4, 1.4, zz) }
    for (let i = 0; i < 6; i++) put(new T.CylinderGeometry(.06, .05, .14, 10), cupM, x0 + 3.5, 1.33, CZ - 2 + i * .28);
    cube(wood, x0 + 1.0, 1.0, CZ, .7, 2, 11); cube(marbleM, x0 + 1.0, 2.04, CZ, .8, .06, 11.2);
    { const cb = new T.Mesh(new T.PlaneGeometry(4.6, 2.3), M({map: chalk, roughness: .9})); cb.position.set(x0 + .66, 4.0, CZ - 2.6); cb.rotation.y = PI / 2; scene.add(cb) }
    for (let i = 0; i < 2; i++) { cube(wood, x0 + .9, 3.2 + i * .9, CZ + 3.4, .45, .06, 4); for (let j = 0; j < 7; j++) put(new T.CylinderGeometry(.11, .1, .3, 10), [mat(0x8a5a36, .5), mat(0xdcd3c3, .4), mat(0x2f5d73, .5)][(i + j) % 3], x0 + .9, 3.4 + i * .9, CZ + 1.7 + j * .55) }
    // bar stools in front of the counter (sittable, facing the counter)
    for (let i = 0; i < 4; i++) { const sz = CZ - 4.5 + i * 3, sx = x0 + 4.9; put(new T.CylinderGeometry(.26, .26, .08, 16), leather, sx, .82, sz); put(new T.CylinderGeometry(.04, .04, .8, 8), steelC, sx, .41, sz); put(new T.TorusGeometry(.18, .02, 6, 16), steelC, sx, .3, sz, PI / 2); seat(sx, sz, .86, -PI / 2) }
    // neon sign on the brick-side wall
    { const n = new T.Mesh(new T.PlaneGeometry(8, 1.5), neonM); n.position.set(CX + 2, 4.4, z0 + .64); scene.add(n) }
    // pendant lamps with soft light pools on the floor
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const lx = x0 + 9 + i * 5.2, lz = CZ - 7 + j * 7;
      put(new T.CylinderGeometry(.015, .015, 1.4, 4), dark, lx, WH - .75, lz); put(new T.ConeGeometry(.42, .38, 16, 1, true), brass, lx, WH - 1.6, lz); put(new T.SphereGeometry(.15, 10, 8), warm, lx, WH - 1.75, lz);
      const gl = new T.Mesh(new T.PlaneGeometry(4.5, 4.5), glowM); gl.rotation.x = -PI / 2; gl.position.set(lx, .1, lz); scene.add(gl) }
    // ---- tables with chairs, laptops and coffee cups (all chairs sittable)
    const tableG = new T.CylinderGeometry(.75, .75, .06, 24), legG = new T.CylinderGeometry(.05, .09, .74, 10), footG = new T.CylinderGeometry(.32, .36, .04, 16);
    const seatG = new T.BoxGeometry(.5, .07, .48), backG = new T.BoxGeometry(.5, .52, .06), cLegG = new T.CylinderGeometry(.025, .025, .48, 5);
    const laptop = (x, z, ry) => { put(new T.BoxGeometry(.42, .025, .3), steelC, x, .83, z, 0, ry, 0); const bx = x - Math.sin(ry) * .15, bz = z - Math.cos(ry) * .15; put(new T.BoxGeometry(.42, .28, .02), steelC, bx, .97, bz, -.25, ry, 0); put(new T.PlaneGeometry(.38, .24), screenM, bx + Math.sin(ry) * .012, .97, bz + Math.cos(ry) * .012, -.25, ry, 0) };
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const tx = x0 + 10 + i * 5.1, tz = CZ + (j ? 5.6 : -5.6);
      put(tableG, marbleM, tx, .8, tz); put(legG, dark, tx, .41, tz); put(footG, dark, tx, .03, tz); addColl(tx - .55, tx + .55, tz - .55, tz + .55, .9);
      for (let k = 0; k < 4; k++) { const a = k * PI / 2 + .4, cx = tx + Math.cos(a) * 1.15, cz = tz + Math.sin(a) * 1.15, face = Math.atan2(-Math.cos(a), -Math.sin(a));
        put(seatG, wood, cx, .5, cz, 0, face, 0); put(backG, wood, cx + Math.cos(a) * .23, .8, cz + Math.sin(a) * .23, 0, face, 0); for (const [lx, lz] of [[-.2, -.18], [.2, -.18], [-.2, .18], [.2, .18]]) put(cLegG, dark, cx + lx, .25, cz + lz);
        seat(cx, cz, .54, face) }
      if ((i + j) % 2 === 0) laptop(tx + .25, tz - .1, Math.atan2(-1, 0)); put(new T.CylinderGeometry(.05, .04, .1, 10), cupM, tx - .3, .88, tz + .2) }
    // ---- lounge: rug, two sofas (3 places each), coffee table, floor lamp
    { const rugT = ctex(128, 128, (x, w, h) => { x.fillStyle = '#7b3b2a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8c98a'; x.lineWidth = 6; x.strokeRect(10, 10, w - 20, h - 20); x.strokeStyle = '#2f5d73'; x.lineWidth = 3; x.strokeRect(24, 24, w - 48, h - 48) });
      const rug = new T.Mesh(new T.PlaneGeometry(5.5, 6.5), M({map: rugT, roughness: 1})); rug.rotation.x = -PI / 2; rug.position.set(x0 + 26, .09, CZ); scene.add(rug) }
    for (const e of [-1, 1]) { const sz = CZ + e * 2.2, sx = x0 + 26;
      cube(fabric, sx, .3, sz, 3.4, .36, 1); cube(fabric, sx, .55, sz - e * .05, 3.2, .18, .9); cube(fabric, sx, .95, sz + e * .45, 3.4, .8, .22); for (const s of [-1, 1]) cube(fabric, sx + s * 1.6, .6, sz, .22, .6, 1);
      addColl(sx - 1.75, sx + 1.75, sz - .55, sz + .55, .9);
      for (const k of [-1, 0, 1]) seat(sx + k * 1.0, sz - e * .12, .66, e < 0 ? 0 : PI, false) }
    cube(woodL, x0 + 26, .38, CZ, 1.8, .07, 1.2); for (const [a, b] of [[-.8, -.5], [.8, -.5], [-.8, .5], [.8, .5]]) cube(dark, x0 + 26 + a, .19, CZ + b, .06, .36, .06);
    put(new T.CylinderGeometry(.05, .04, .1, 10), cupM, x0 + 25.7, .47, CZ); put(new T.CylinderGeometry(.05, .04, .1, 10), cupM, x0 + 26.3, .47, CZ + .2);
    put(new T.CylinderGeometry(.03, .03, 1.8, 6), brass, x0 + 28.3, .9, CZ + 3.4); put(new T.ConeGeometry(.35, .4, 14, 1, true), cream, x0 + 28.3, 1.9, CZ + 3.4); put(new T.SphereGeometry(.12, 8, 6), warm, x0 + 28.3, 1.8, CZ + 3.4);
    // ---- plants: big pots in the corners + hanging planters by the glass
    for (const [px, pz] of [[x0 + 1.4, z0 + 1.4], [x0 + 1.4, z1 - 1.4], [x1 - 1.4, z0 + 1.4], [x1 - 1.4, z1 - 1.4], [x0 + 7.4, z0 + 1.3], [x0 + 7.4, z1 - 1.3]]) {
      put(new T.CylinderGeometry(.5, .38, .9, 14), potC, px, .5, pz); for (let k = 0; k < 4; k++) put(new T.IcosahedronGeometry(.55, 1), k % 2 ? green : green2, px + Math.cos(k * 1.7) * .3, 1.4 + k * .35, pz + Math.sin(k * 1.7) * .3, 0, 0, 0, 1, 1.2, 1); addColl(px - .55, px + .55, pz - .55, pz + .55, 1.2) }
    for (let i = 0; i < 5; i++) { const hz = z0 + 2.5 + i * (CD - 5) / 4; if (Math.abs(hz - CZ) < door / 2) continue; put(new T.CylinderGeometry(.008, .008, 1.2, 4), dark, x1 - .9, WH - .7, hz); put(new T.SphereGeometry(.28, 10, 8), terra, x1 - .9, WH - 1.4, hz); put(new T.IcosahedronGeometry(.4, 1), green, x1 - .9, WH - 1.65, hz, 0, 0, 0, 1, 1.3, 1) }
    // ---- pitch stage + screen + podium
    cube(dark, x0 + 18, .3, z1 - 2.4, 8, .45, 3.2); cube(wood, x0 + 18, .55, z1 - 2.4, 8.1, .06, 3.3); addColl(x0 + 14, x0 + 22, z1 - 4, z1 - .6, .6);
    const scr = sign('PITCH NIGHT · FRIDAY 8 PM', '#0f2740', '#7fd0ff', 1.4, .6); scr.position.set(x0 + 18, 3.6, z1 - .65); scr.rotation.y = PI; scene.add(scr);
    cube(wood, x0 + 15.2, 1.1, z1 - 2.2, .6, 1.1, .5); put(new T.CylinderGeometry(.015, .015, .4, 4), dark, x0 + 15.2, 1.85, z1 - 2.3, .5);
    // ---- terrace: planter boxes along the edge, tables with two chairs each (sittable)
    for (const e of [-1, 1]) { cube(wood, x1 + 8.6, .4, CZ + e * 8.5, .6, .8, 6); put(new T.BoxGeometry(.5, .3, 5.8), green2, x1 + 8.6, .95, CZ + e * 8.5); addColl(x1 + 8.3, x1 + 8.9, CZ + e * 8.5 - 3, CZ + e * 8.5 + 3, .9) }
    for (const e of [-1, 1]) for (const k of [0, 1]) { const tx = x1 + 3 + k * 3.4, tz = CZ + e * (door / 2 + 2.6);
      put(tableG, cream, tx, .8, tz, 0, 0, 0, .7, 1, .7); put(legG, dark, tx, .41, tz); put(new T.CylinderGeometry(.035, .035, 2.6, 6), dark, tx, 1.5, tz); put(new T.ConeGeometry(1.5, .5, 12), mat([0xe8742a, 0x1f6f5c][(k + (e > 0 ? 1 : 0)) % 2], .7), tx, 2.85, tz); addColl(tx - .45, tx + .45, tz - .45, tz + .45, .9);
      for (const s of [-1, 1]) { const cx = tx + s * .95, face = s > 0 ? -PI / 2 : PI / 2; put(seatG, wood, cx, .5, tz, 0, face, 0); put(backG, wood, cx + s * .23, .8, tz, 0, face, 0); seat(cx, tz, .54, face) } }
    ROOMS.push({x: CX + 4, z: CZ, w: CW + 10, d: CD + 4});
    label('Startup Café', CX, CZ);
  }

  // ---------- scattered trees over the rest of the island ----------
  for (let i = 0; i < 900 && TREES.length < (LOW ? 550 : 1400); i++) { const x = rnd(-495, 495), z = rnd(-460, 140); if ((x > -175 && x < 175 && z > -175) || !inPoly(coast, x, z) || !free(x, z, 3)) continue; TREES.push([x, z, rnd(.8, 1.5)]) }
  {
    makeTrees(scene, TREES.map(([x, z, s]) => [x, 0, z, s]), {rnd: R, onTree: (x, z) => addColl(x - .35, x + .35, z - .35, z + .35, 3)}); /* solid trunks */ const o = new T.Object3D();

    const pT = new T.CylinderGeometry(.22, .32, 9, 7); pT.translate(0, 4.5, 0); const fr = new T.PlaneGeometry(1.4, 6); fr.translate(0, 3, 0);
    const pI = new T.InstancedMesh(pT, mat(0x8a6a48, .9), PALMS.length), fI = new T.InstancedMesh(fr, palmLeaf, PALMS.length * 7);
    PALMS.forEach(([x, z], i) => { o.position.set(x, 0, z); o.rotation.set(rnd(-.15, .15), R() * 6, 0); o.scale.setScalar(1); o.updateMatrix(); pI.setMatrixAt(i, o.matrix);
      for (let k = 0; k < 7; k++) { o.position.set(x, 8.8, z); o.rotation.set(-1.0 - R() * .4, k / 7 * PI * 2, 0, 'YXZ'); o.updateMatrix(); fI.setMatrixAt(i * 7 + k, o.matrix) } addColl(x - .4, x + .4, z - .4, z + .4, 3) });
    pI.castShadow = fI.castShadow = true; scene.add(pI, fI);
  }

  // ---------- district boards ----------
  for (const [t, x, z, ry, c] of [['City Center ↑', 46, -238, PI, '#1e5fa8'], ['Airport →', 268, 44, -PI / 2, '#141414'], ['Industrial Zone →', 258, -160, -PI / 2, '#8a5a2b'], ['← Residential', -258, -6, PI / 2, '#19a7a0'], ['Bandra Bay ↓', -226, 112, PI, '#e8742a'], ['Port & Docks ↓', 226, 110, PI, '#1e5fa8']]) {
    const s = sign(t, c, '#fff', 1.3, .6); s.position.set(x, 5.4, z); s.rotation.y = ry; scene.add(s); put(new T.BoxGeometry(.25, 5, .25), steel, x, 2.5, z);
  }

  // ---------- keep the player on the island ----------
  addColl(-700, -500, -900, 900, 60); addColl(500, 700, -900, 900, 60); addColl(-700, 700, -900, -470, 60);
  addColl(-500, -490, 166, 700, 4); addColl(-490, -365, 275, 700, 4); addColl(-365, -172, 216, 700, 4);
  addColl(-172, 186, 170.6, 700, 4); addColl(186, 480, 268, 700, 4); addColl(480, 500, 166, 700, 4);

  buildKerbs();
  flush(); KIT.flush();
}

// Walking height outside the old-city core. Roads, pavements and squares sit a few centimetres above zero, so their
// tops are written into a half-metre grid and characters stand on what they can see (not inside it).
const GX = -520, GZ = -490, CELL = .5, GW = 2080, GH = 1600;
const heights = new Uint8Array(GW * GH); // centimetres
function stampTriangle(ax, az, bx, bz, cx, cz, cm) {
  const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(det) < 1e-9) return;
  const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - GX) / CELL)), i1 = Math.min(GW - 1, Math.floor((Math.max(ax, bx, cx) - GX) / CELL));
  const j0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - GZ) / CELL)), j1 = Math.min(GH - 1, Math.floor((Math.max(az, bz, cz) - GZ) / CELL));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = GX + (i + .5) * CELL, z = GZ + (j + .5) * CELL;
    const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
    if (u >= -.02 && v >= -.02 && u + v <= 1.02 && cm > heights[j * GW + i]) heights[j * GW + i] = cm;
  }
}
function stampGeometry(g, y) {
  if (y <= 0 || y > .3) return; // raised places (fort, bridges) have their own rules below
  const p = g.attributes.position, idx = g.index, n = idx ? idx.count : p.count, at = k => idx ? idx.getX(k) : k;
  for (let k = 0; k + 2 < n; k += 3) { const a = at(k), b = at(k + 1), c = at(k + 2); stampTriangle(p.getX(a), p.getZ(a), p.getX(b), p.getZ(b), p.getX(c), p.getZ(c), Math.round(y * 100)) }
}
function stampDisc(x, z, r, y) { for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, b = (k + 1) / 24 * Math.PI * 2; stampTriangle(x, z, x + Math.cos(a) * r, z + Math.sin(a) * r, x + Math.cos(b) * r, z + Math.sin(b) * r, Math.round(y * 100)) } }
function stampRect(x0, x1, z0, z1, y) { const cm = Math.round(y * 100); stampTriangle(x0, z0, x1, z0, x1, z1, cm); stampTriangle(x0, z0, x1, z1, x0, z1, cm) }
function surfaceHeight(x, z) {
  const i = Math.floor((x - GX) / CELL), j = Math.floor((z - GZ) / CELL);
  return i < 0 || j < 0 || i >= GW || j >= GH ? 0 : heights[j * GW + i] / 100;
}

export function navapurGround(x, z) {
  if (Math.hypot(x + 430, z - 215) < 54) return 2.05;
  if (x > -382 && x < -356 && z > 181 && z < 189) return 1.12;
  return x < -172 || x > 172 || z < -172 ? surfaceHeight(x, z) : null;
}
