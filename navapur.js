// Navapur: an uneven island city around the old-city street grid.
// The land is one irregular island (noisy coastline); roads are smooth curves; districts are organic
// blobs; buildings sit at angles along winding lanes and carry balconies, sunshades, AC units,
// water tanks, stair rooms and tiled roofs. Static geometry is merged per material.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeTrees} from './trees.js?v=1';

export const WORLD = {x0: -505, x1: 505, z0: -470, coast: 165};
const PI = Math.PI;

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
  const area = (pts, m, tile, y, col) => { const o = new T.Mesh(shapeGeo(pts, tile, y), m); o.receiveShadow = true; scene.add(o); if (col) DMAP.zones.push({pts, c: col}); return o };
  // flat ribbon along a polyline (roads, kerbs, lanes)
  function ribbon(pts, w, m, y, closed = false, vScale = 14) {
    const pos = [], uv = [], idx = [], L = offsetLine(pts, -w / 2, closed), Rr = offsetLine(pts, w / 2, closed); let d = 0;
    for (let i = 0; i < pts.length; i++) { if (i) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); pos.push(L[i][0], y, L[i][1], Rr[i][0], y, Rr[i][1]); uv.push(0, d / vScale, 1, d / vScale) }
    const n = pts.length; for (let i = 0; i < n - 1 + (closed ? 1 : 0); i++) { const a = i * 2, b = ((i + 1) % n) * 2; idx.push(a, b, a + 1, a + 1, b, b + 1) }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) { const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0); g.setIndex(idx.map((v, i) => idx[i - i % 3 + (2 - i % 3)])) }
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
  const GLASS = [['#5b86a8', '#1d3348'], ['#6fa3a8', '#20393d'], ['#8a9db8', '#2a3550'], ['#4f6f8f', '#14202e']].map(t => new T.MeshStandardMaterial({map: glassTex(t), roughness: .12, metalness: .75, envMapIntensity: 1.2}));
  const OFFICE = new T.MeshStandardMaterial({map: glassTex(['#7fb0c4', '#2e4a5a'], 'rgba(225,228,230,.95)'), roughness: .2, metalness: .5});
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
  const road = (pts, closed, w = 14, y = .014) => { ribbon(pts, w, roadMat, y, closed); for (const s of [-1, 1]) ribbon(offsetLine(pts, s * (w / 2 + 1.6), closed), 3.2, kerbM, y + .08, closed, 3); DMAP.lines.push({pts, w, closed}) };

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
  function building(x, z, ry, w, d, floors, opts = {}) {
    const fh = 3.1, H = floors * fh + .2, fac = opts.fac || FACADE[Math.floor(R() * FACADE.length)];
    put(boxUV(w, H, d, 16, 12.8), fac, x, H / 2, z, 0, ry, 0);
    cube(darkConcrete, x, .15, z, w + .6, .3, d + .6, ry);
    details(x, z, ry, w, d, .2, fh, floors, H, opts);
    addOColl(x, z, w + 1, d + 2.6, ry, H);
    ROOMS.push({x, z, ry, w, d, H});
  }
  // the old city's box buildings get the same detailing (they face their street: front = ±1 on z)
  for (const L of LOTS) { details(L.x, L.z, 0, L.w, L.d, 4.25, 3.2, L.floors, L.H, {front: L.front});
    const r = R();
    if (r < .3 && L.w > 10) { const pw = L.w * rnd(.45, .6), pd = L.d * rnd(.45, .6), px = L.x + (L.w - pw) / 2 * (R() < .5 ? -1 : 1) * .8; put(boxUV(pw, 3.1, pd, 16, 12.8), FACADE[Math.floor(R() * FACADE.length)], px, L.H + 1.55, L.z); cube(trimM, px, L.H + 3.2, L.z, pw + .4, .35, pd + .4) }
    else if (r < .5) { const sh = new T.Shape(); sh.moveTo(-L.d / 2 - .4, 0); sh.lineTo(0, Math.min(3.5, L.d * .3)); sh.lineTo(L.d / 2 + .4, 0); sh.closePath(); const gg = new T.ExtrudeGeometry(sh, {depth: L.w * .5, bevelEnabled: false}); gg.rotateY(PI / 2); gg.translate(-L.w * .25, 0, 0); const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3); put(gg, roofTile, L.x - L.w * .2, L.H + .9, L.z) }
  }
  // tower with setbacks so the skyline isn't a set of plain boxes
  function tower(x, z, w, d, h, m, ry, opts = {}) {
    const h1 = h * .62, h2 = h * .26, h3 = h - h1 - h2;
    put(boxUV(w + 3, 6, d + 3, 8, 4), concrete, x, 3, z, 0, ry, 0);
    put(boxUV(w, h1, d, 16, 32), m, x, 6 + h1 / 2, z, 0, ry, 0); cube(trimM, x, 6 + h1 + .3, z, w + .8, .6, d + .8, ry);
    put(boxUV(w * .82, h2, d * .82, 16, 32), m, x, 6 + h1 + h2 / 2, z, 0, ry, 0); cube(trimM, x, 6 + h1 + h2 + .3, z, w * .82 + .8, .6, d * .82 + .8, ry);
    put(boxUV(w * .58, h3, d * .58, 16, 32), m, x, 6 + h1 + h2 + h3 / 2, z, 0, ry, 0);
    put(new T.CylinderGeometry(.25, .4, h * .1, 6), steel, x, 6 + h + h * .05, z);
    if (opts.neon) { const c = Math.cos(ry), s = Math.sin(ry); for (const e of [-1, 1]) cube(opts.neon, x + e * (w / 2 + .1) * c + (d / 2 + .1) * s, 6 + h1 / 2, z - e * (w / 2 + .1) * s + (d / 2 + .1) * c, .35, h1 * .9, .35, ry) }
    addOColl(x, z, w + 4, d + 4, ry, h); ROOMS.push({x, z, w: w + 4, d: d + 4});
  }

  // ---------- roads ----------
  road(RING_PTS.filter(([x, z]) => !(x > -168 && x < 168 && z > 100)), false);
  const spoke = (ctrl) => road(sampleCurve(ctrl, false, 4), false);
  spoke([[40, -246], [30, -300], [-5, -350], [-20, -400], [-10, -445]]);
  spoke([[262, 30], [320, 38], [380, 30], [440, 44], [492, 40]]);
  spoke([[250, -175], [310, -190], [370, -170], [430, -195], [490, -185]]);
  spoke([[-250, -20], [-310, -40], [-370, -22], [-430, -48], [-495, -36]]);
  spoke([[120, -258], [150, -300], [165, -350], [190, -410]]);
  spoke([[-205, -244], [-215, -300], [-198, -350]]);
  for (const x of [-120, -40, 40, 120]) spoke([[x, -170], [x + 3, -205], [x, -246]]);
  spoke([[-238, 104], [-270, 132], [-300, 150]]);
  spoke([[215, 116], [228, 145], [240, 172]]);

  // ---------- trees / palms ----------
  const TREES = [], PALMS = [];
  const nearRoad = (x, z, r) => { for (const L of DMAP.lines) for (let i = 0; i < L.pts.length; i += 2) { const p = L.pts[i]; if (Math.abs(p[0] - x) < r + L.w / 2 + 2 && Math.abs(p[1] - z) < r + L.w / 2 + 2) return true } return false };
  const free = (x, z, r) => { for (const b of ROOMS) if (Math.hypot(b.x - x, b.z - z) < Math.max(b.w, b.d) / 2 + r) return false; return !nearRoad(x, z, r) };
  function treesIn(pts, n) { for (let i = 0; i < n * 4 && n > 0; i++) { const x = rnd(-500, 500), z = rnd(-470, 270); if (!inPoly(pts, x, z) || !free(x, z, 2)) continue; TREES.push([x, z, rnd(.8, 1.4)]); n-- } }

  // ======================= CITY CENTRE (CBD) =======================
  {
    const zone = blob(-40, -350, 125, 88, .18); area(zone, paved, 3, .02, '#7d8fa8'); label('City Center (CBD)', -60, -350);
    const cx = -40, cz = -350;
    const spots = [[-140, -300, 22, 22, 70], [-112, -318, 18, 26, 95], [-150, -352, 20, 18, 55], [-112, -385, 24, 20, 120], [-128, -420, 22, 22, 80],
      [-72, -300, 20, 20, 140], [-68, -410, 26, 22, 105], [32, -296, 22, 20, 65], [58, -340, 20, 26, 100], [36, -395, 22, 22, 130], [74, -405, 16, 16, 60], [-20, -430, 18, 18, 75]];
    spots.forEach(([x, z, w, d, h], i) => tower(x + rnd(-4, 4), z + rnd(-4, 4), w, d, h * .5, GLASS[i % 4], rnd(-.45, .45), {neon: i % 3 === 0 ? (i % 2 ? neonB : neonP) : null}));
    put(new T.CylinderGeometry(22, 22, .3, 40), paved, cx, .15, cz); put(new T.CylinderGeometry(9, 9.5, .9, 32), stone, cx, .55, cz);
    const wtr = new T.Mesh(new T.CylinderGeometry(8.6, 8.6, .1, 32), seaMat); wtr.position.set(cx, 1, cz); scene.add(wtr); put(new T.CylinderGeometry(.6, 1, 3, 12), stone, cx, 2.2, cz);
    const jet = new T.Mesh(new T.ConeGeometry(1.2, 6, 12, 1, true), new T.MeshStandardMaterial({color: 0xdff4ff, transparent: true, opacity: .45, roughness: .1})); jet.position.set(cx, 6.5, cz); scene.add(jet);
    TICK.push((dt, t) => { jet.scale.y = 1 + Math.sin(t * 3) * .12 }); addColl(cx - 9.5, cx + 9.5, cz - 9.5, cz + 9.5, 2);
    { const mx = 76, mz = -280, ry = -.35; put(new T.CylinderGeometry(24, 24, 16, 32, 1, false, PI, PI), OFFICE, mx, 8, mz, 0, ry, 0); put(new T.CylinderGeometry(24.5, 24.5, .8, 32, 1, false, PI, PI), concrete, mx, 16.4, mz, 0, ry, 0); addOColl(mx, mz, 50, 26, ry, 16); ROOMS.push({x: mx, z: mz, w: 50, d: 26});
      const ms = sign('NAVAPUR MALL', '#141414', '#ffd21f', 3, .9); ms.position.set(mx - 22 * Math.sin(ry), 13, mz - 22 * Math.cos(ry)); ms.rotation.y = ry + PI; scene.add(ms) }
    for (let i = 0; i < 18; i++) { const a = i / 18 * PI * 2; TREES.push([cx + Math.cos(a) * 30, cz + Math.sin(a) * 30, 1]) }
  }

  // ======================= IT PARK =======================
  {
    const zone = blob(180, -360, 70, 82, .2, 28, .3); area(zone, grass, 6, .018, '#5f8fa0'); label('IT Park', 180, -360);
    [[150, -315, 34, 18, 34], [215, -318, 30, 18, 42], [150, -372, 30, 22, 48], [215, -380, 34, 20, 30], [168, -425, 28, 18, 38]].forEach(([x, z, w, d, h]) => {
      h *= .7; const ry = rnd(-.6, .6); put(boxUV(w, h, d, 16, 32), OFFICE, x, h / 2, z, 0, ry, 0); cube(trimM, x, h + .3, z, w + .6, .6, d + .6, ry); cube(white, x, h * .5, z, w + .3, .35, d + .3, ry); addOColl(x, z, w + 1, d + 1, ry, h); ROOMS.push({x, z, w, d}) });
    const s = sign('Navapur IT Park', '#127a5a', '#fff', 1.8, .7); s.position.set(150, 4, -296); s.rotation.y = -.5; scene.add(s); treesIn(zone, 50);
  }

  // ======================= UNIVERSITY =======================
  {
    const zone = blob(-205, -390, 40, 50, .18); area(zone, grass, 6, .018, '#8aa070'); label('University', -205, -392);
    put(boxUV(40, 14, 16, 16, 12.8), FACADE[1], -205, 7, -380); put(new T.SphereGeometry(7, 20, 12, 0, PI * 2, 0, PI / 2), mat(0xd9d2c2, .5), -205, 14, -380);
    for (let i = 0; i < 6; i++) put(new T.CylinderGeometry(.6, .6, 9, 12), white, -219 + i * 5.6, 4.5, -371.5);
    addColl(-226, -184, -389, -371, 14); ROOMS.push({x: -205, z: -380, w: 40, d: 16});
    const s = sign('Navapur University', '#7b2d8b', '#fff', 1.4, .6); s.position.set(-205, 11.5, -371.9); scene.add(s); treesIn(zone, 22);
  }

  // ======================= RESIDENTIAL: winding lanes with houses at angles =======================
  {
    const zone = blob(-385, -120, 112, 215, .14); area(zone, grass, 6, .016, '#c9b48f'); label('Residential Area', -400, -150);
    const lanes = [[[-262, -150], [-300, -175], [-345, -150], [-390, -185], [-440, -160], [-480, -190]],
      [[-262, 60], [-305, 85], [-350, 60], [-400, 92], [-450, 70], [-485, 90]],
      [[-310, -40], [-330, -95], [-318, -150]], [[-430, -48], [-420, 10], [-438, 70]], [[-350, -150], [-360, -230], [-330, -290]], [[-440, -160], [-455, -250], [-420, -300]]];
    const names = ['Shanti Kunj CHS', 'Sai Darshan', 'Gokul Dham', 'Prem Nagar CHS', 'Om Shanti Apts', 'Laxmi Niwas', 'Ganga Vihar'];
    let k = 0;
    for (const ctrl of lanes) { const pts = sampleCurve(ctrl, false, 4); ribbon(pts, 8, asphaltM, .016, false, 8); DMAP.lines.push({pts, w: 8}) }
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
    const zone = blob(205, -20, 26, 125, .2); area(zone, dirt, 4, .016, '#b5875f'); label('Slums', 200, -20);
    const cols = [0xd96a5a, 0x5aa0d9, 0xe0c25a, 0x7cc47a, 0xc98ad9, 0xe8e0d0, 0x8d7a66], hm = new T.InstancedMesh(BOX, mat(0xffffff, .9), 1100), tm = new T.InstancedMesh(new T.BoxGeometry(1, .08, 1), mat(0xffffff, .7), 1100), o = new T.Object3D();
    let n = 0;
    for (let i = 0; i < 4000 && n < 1100; i++) {
      const x = rnd(170, 240), z = rnd(-150, 110); if (!inPoly(zone, x, z) || Math.abs(x - 205 - Math.sin(z * .05) * 6) < 1.8) continue;
      const h = rnd(2.4, 3.6) * (R() < .22 ? 1.7 : 1), ry = rnd(-.5, .5), sx = rnd(2.4, 3.2), sz = rnd(2.6, 3.4);
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
    const ts = sign('NAVAPUR INTERNATIONAL AIRPORT', '#141414', '#fff', 2.2, .8); ts.position.set(375, 9.5, 25.2); scene.add(ts);
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
      const ry = rnd(-.35, .35); put(boxUV(w, h, d, 4, 4), corr, x, h / 2, z, 0, ry, 0); const rs = new T.Shape(); rs.moveTo(-d / 2, 0); rs.lineTo(0, 3.5); rs.lineTo(d / 2, 0); rs.closePath();
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
    put(new T.CylinderGeometry(56, 64, 4, 24), rock, cx, 0, cz); area(blob(cx, cz, 44, 40, .12), grass, 6, 2.05, '#8b7d68'); label('Navapur Fort', cx, cz);
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
    const s = sign('NAVAPUR PORT TRUST', '#1e5fa8', '#fff', 2, .7); s.position.set(206, 5, 172); s.rotation.y = PI; scene.add(s);
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
    { const hp = []; for (let x = -540; x <= 540; x += 30) hp.push([x, -455 - Math.abs(Math.sin(x * .013) * 22 + Math.sin(x * .041) * 9)]); hp.push([560, -700], [-560, -700]); DMAP.zones.push({pts: hp, c: '#4f7a3a'}) } label('Sahyadri Hills', -260, -500);
    const hAt = (x, z) => Math.max(.3, hAt0(x, z - hills.position.z));
    const fG = new T.ConeGeometry(2.4, 7, 7); fG.translate(0, 3.5, 0); const fI = new T.InstancedMesh(fG, leafM, 900), o = new T.Object3D(); let n = 0;
    for (let i = 0; i < 1400 && n < 900; i++) { const x = rnd(-600, 600), z = rnd(-640, -480), h = hAt(x, z); if (h < 4 || h > 100 || (x > 150 && x < 400 && z > -560 && z < -480)) continue; o.position.set(x, h - .5, z); o.scale.setScalar(rnd(.8, 1.6)); o.rotation.y = R() * 6; o.updateMatrix(); fI.setMatrixAt(n++, o.matrix) }
    fI.count = n; fI.castShadow = true; scene.add(fI);
    const lake = new T.Mesh(new T.PlaneGeometry(220, 80), seaMat); lake.rotation.x = -PI / 2; lake.position.set(275, 6, -530); scene.add(lake);
    put(new T.BoxGeometry(240, 22, 8), concrete, 275, 0, -488); for (let i = 0; i < 8; i++) put(new T.BoxGeometry(6, 14, 2), mat(0xdfeff7, .2, 0, {transparent: true, opacity: .7}), 205 + i * 20, 2, -483);
    label('Khadak Dam', 250, -520);
    const blades = [];
    for (const [x, z] of [[-60, -560], [-20, -575], [25, -560]]) { const y = hAt(x, z); put(new T.CylinderGeometry(.9, 1.6, 40, 10), white, x, y + 20, z);
      const hub = new T.Group(); hub.position.set(x, y + 40, z + 1.6); scene.add(hub); for (let b = 0; b < 3; b++) { const bl = new T.Mesh(new T.BoxGeometry(1.4, 18, .3), white); bl.position.y = 9; const arm = new T.Group(); arm.rotation.z = b * PI * 2 / 3; arm.add(bl); hub.add(arm) } blades.push(hub) }
    TICK.push(dt => { for (const b of blades) b.rotation.z += dt * .9 }); label('Windmill Point', -60, -555);
    { const x = -300, z = -560, y = hAt(x, z); put(new T.BoxGeometry(10, 6, 10), mat(0xf2e9d8, .7), x, y + 3, z); put(new T.ConeGeometry(5, 12, 8), orangeM, x, y + 12, z) }
  }

  // ---------- scattered trees over the rest of the island ----------
  for (let i = 0; i < 900 && TREES.length < 1400; i++) { const x = rnd(-495, 495), z = rnd(-460, 140); if ((x > -175 && x < 175 && z > -175) || !inPoly(coast, x, z) || !free(x, z, 3)) continue; TREES.push([x, z, rnd(.8, 1.5)]) }
  {
    makeTrees(scene, TREES.map(([x, z, s]) => [x, 0, z, s]), {rnd: R}); const o = new T.Object3D();

    const pT = new T.CylinderGeometry(.22, .32, 9, 7); pT.translate(0, 4.5, 0); const fr = new T.PlaneGeometry(1.4, 6); fr.translate(0, 3, 0);
    const pI = new T.InstancedMesh(pT, mat(0x8a6a48, .9), PALMS.length), fI = new T.InstancedMesh(fr, palmLeaf, PALMS.length * 7);
    PALMS.forEach(([x, z], i) => { o.position.set(x, 0, z); o.rotation.set(rnd(-.15, .15), R() * 6, 0); o.scale.setScalar(1); o.updateMatrix(); pI.setMatrixAt(i, o.matrix);
      for (let k = 0; k < 7; k++) { o.position.set(x, 8.8, z); o.rotation.set(-1.0 - R() * .4, k / 7 * PI * 2, 0, 'YXZ'); o.updateMatrix(); fI.setMatrixAt(i * 7 + k, o.matrix) } addColl(x - .4, x + .4, z - .4, z + .4, 3) });
    pI.castShadow = fI.castShadow = true; scene.add(pI, fI);
  }

  // ---------- district boards ----------
  for (const [t, x, z, ry, c] of [['Navapur CBD ↑', 46, -238, PI, '#1e5fa8'], ['Airport →', 268, 44, -PI / 2, '#141414'], ['Industrial Zone →', 258, -160, -PI / 2, '#8a5a2b'], ['← Residential', -258, -6, PI / 2, '#19a7a0'], ['Bandra Bay ↓', -226, 112, PI, '#e8742a'], ['Port & Docks ↓', 226, 110, PI, '#1e5fa8']]) {
    const s = sign(t, c, '#fff', 1.3, .6); s.position.set(x, 5.4, z); s.rotation.y = ry; scene.add(s); put(new T.BoxGeometry(.25, 5, .25), steel, x, 2.5, z);
  }

  // ---------- keep the player on the island ----------
  addColl(-700, -500, -900, 900, 60); addColl(500, 700, -900, 900, 60); addColl(-700, 700, -900, -470, 60);
  addColl(-500, -490, 166, 700, 4); addColl(-490, -365, 275, 700, 4); addColl(-365, -172, 216, 700, 4);
  addColl(-172, 186, 170.6, 700, 4); addColl(186, 480, 268, 700, 4); addColl(480, 500, 166, 700, 4);

  flush();
}

// ground height outside the old-city core: everything new is built at y = 0
export function navapurGround(x, z) {
  if (Math.hypot(x + 430, z - 215) < 54) return 2.05;
  if (x > -382 && x < -356 && z > 181 && z < 189) return 1.12;
  return x < -172 || x > 172 || z < -172 ? 0 : null;
}
