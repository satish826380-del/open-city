// Code-built vehicles: Maruti-style sedan, Premier Padmini kaali-peeli taxi, Bajaj-style auto
// rickshaw, BEST-style bus and an Activa-style scooter. Clear-coat paint reflects the sky
// environment map; every vehicle is baked into a few merged meshes so traffic stays cheap.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const PI = Math.PI;
let ctx = null;
export function initVehicles(c) { ctx = c }

// ---------- materials ----------
const PAINT = new Map();
const paint = c => { if (!PAINT.has(c)) PAINT.set(c, window.__MN_LOW ? new T.MeshStandardMaterial({color: c, metalness: .1, roughness: .45}) : new T.MeshPhysicalMaterial({color: c, metalness: .1, roughness: .42, clearcoat: .4, clearcoatRoughness: .2, envMapIntensity: .45})); return PAINT.get(c) };
const glass = new T.MeshStandardMaterial({color: 0x0a1016, metalness: .3, roughness: .08, envMapIntensity: .5});
const chrome = new T.MeshStandardMaterial({color: 0xe4e8ec, metalness: 1, roughness: .12});
const plastic = new T.MeshStandardMaterial({color: 0x141414, roughness: .7});
const rubber = new T.MeshStandardMaterial({color: 0x161616, roughness: .92});
const alloy = new T.MeshStandardMaterial({color: 0xb7bcc2, metalness: .9, roughness: .25});
const seatM = new T.MeshStandardMaterial({color: 0x3a2a22, roughness: .8});
export const headMat = new T.MeshStandardMaterial({color: 0xffffff, emissive: 0xfff3d0, emissiveIntensity: .35, roughness: .1});
export const tailMat = new T.MeshStandardMaterial({color: 0x6a0000, emissive: 0xff2020, emissiveIntensity: .25, roughness: .2});
const amber = new T.MeshStandardMaterial({color: 0xff9a1a, emissive: 0xff8a00, emissiveIntensity: .2, roughness: .2});
function plateTex(bg, fg, txt) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 256, 64); x.strokeStyle = fg; x.lineWidth = 4; x.strokeRect(3, 3, 250, 58);
  x.fillStyle = fg; x.font = '800 38px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 34);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return new T.MeshStandardMaterial({map: t, roughness: .5});
}
const PLATE = {white: plateTex('#f4f4f0', '#111', 'MH 01 AB 4521'), yellow: plateTex('#f2c21f', '#111', 'MH 01 T 7788')};

// ---------- geometry helpers ----------
function add(parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; parent.add(o); return o }
const box = (p, w, h, d, m, x, y, z, rx, ry, rz) => add(p, new T.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz);
// side-profile shape (x = forward, y = up) extruded across the width and centred
function profile(p, draw, width, m, bevel = .06, y = 0) {
  const s = new T.Shape(); draw(s);
  const g = new T.ExtrudeGeometry(s, {depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 10});
  g.rotateY(-PI / 2); g.translate((width - bevel * 2) / 2, y, 0); return add(p, g, m);
}
// tyre (rounded torus) + alloy rim with five spokes, axle along X; the group spins on X
function wheel(parent, x, y, z, r = .33, w = .22, rimM = alloy) {
  const g = new T.Group(); g.position.set(x, y, z); parent.add(g);
  const t = add(g, new T.TorusGeometry(r * .74, r * .26, 10, 28), rubber); t.rotation.y = PI / 2; t.scale.set(1, 1, (w / 2) / (r * .26));
  const rim = add(g, new T.CylinderGeometry(r * .56, r * .56, w * .7, 20), rimM, 0, 0, 0, 0, 0, PI / 2);
  add(g, new T.CylinderGeometry(r * .18, r * .18, w * .78, 12), chrome, 0, 0, 0, 0, 0, PI / 2);
  for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; add(g, new T.BoxGeometry(w * .74, r * .5, r * .1), plastic, 0, Math.cos(a) * r * .3, Math.sin(a) * r * .3, a, 0, 0) }
  void rim; bake(g); return g;
}
// merge child meshes per material (keeps wheels / brake lights as live objects)
function bake(g, keep = new Set()) {
  g.updateMatrixWorld(true); const inv = new T.Matrix4().copy(g.matrixWorld).invert(), groups = new Map(), drop = [];
  g.traverse(o => {
    if (!o.isMesh || o === g || keep.has(o) || Array.isArray(o.material)) return; let p = o.parent; while (p && p !== g) { if (keep.has(p)) return; p = p.parent }
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv) geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!groups.has(o.material)) groups.set(o.material, []); groups.get(o.material).push(geo); drop.push(o);
  });
  for (const o of drop) o.parent.remove(o);
  for (const [m, list] of groups) { const o = new T.Mesh(mergeGeometries(list, false), m); o.castShadow = true; o.receiveShadow = true; g.add(o) }
}

// ======================= vehicles =======================
export function vehicle(type, color) {
  const g = new T.Group(), v = {g, type, wheels: [], speed: 0, brake: []}, keep = new Set();
  const tail = (w, h, d, x, y, z) => { const t = box(g, w, h, d, tailMat, x, y, z); keep.add(t); v.brake.push(t); return t };
  if (type === 'auto') buildAuto(g, v, tail);
  else if (type === 'scooter') buildScooter(g, v, color);
  else if (type === 'bus') buildBus(g, v, tail);
  else if (type === 'taxi') buildPadmini(g, v, tail);
  else buildSedan(g, v, tail, color);
  for (const w of v.wheels) keep.add(w);
  bake(g, keep);
  ctx.scene.add(g);
  return v;
}

// ---------- modern sedan (length 4.2 m) ----------
function buildSedan(g, v, tail, color) {
  const P = paint(color || 0x9aa3ad), W = 1.74, WB = 1.32, R = .34;
  profile(g, s => {                                                          // lower body with cut wheel arches
    s.moveTo(2.08, .38); s.lineTo(2.14, .62); s.quadraticCurveTo(2.14, .86, 1.9, .9); s.lineTo(1.2, 1.0); s.lineTo(-1.45, 1.04);
    s.lineTo(-1.95, 1.0); s.quadraticCurveTo(-2.14, .98, -2.15, .8); s.lineTo(-2.12, .4); s.lineTo(-WB - R - .1, .34);
    s.absarc(-WB, .34, R + .1, PI, 0, true); s.lineTo(WB - R - .1, .34); s.absarc(WB, .34, R + .1, PI, 0, true); s.lineTo(2.08, .38);
  }, W, P, .07);
  profile(g, s => { s.moveTo(1.2, .98); s.quadraticCurveTo(.8, 1.3, .55, 1.42); s.lineTo(-.85, 1.45); s.quadraticCurveTo(-1.2, 1.36, -1.5, 1.02); s.closePath() }, W - .16, glass, .03);
  profile(g, s => { s.moveTo(.6, 1.41); s.lineTo(-.86, 1.44); s.lineTo(-.84, 1.5); s.lineTo(.56, 1.47); s.closePath() }, W - .2, P, .03);
  for (const sx of [-1, 1]) {
    box(g, .04, .44, .08, P, sx * (W / 2 - .1), 1.2, -.2);                                   // B-pillar
    box(g, .01, .5, .012, plastic, sx * (W / 2 + .005), .72, .1); box(g, .01, .5, .012, plastic, sx * (W / 2 + .005), .74, -1.0);   // door shut lines
    box(g, .03, .04, .16, chrome, sx * (W / 2 + .01), .86, -.15); box(g, .03, .04, .16, chrome, sx * (W / 2 + .01), .88, -1.15); // handles
    box(g, .2, .13, .1, P, sx * (W / 2 + .08), 1.08, .98); box(g, .12, .03, .1, plastic, sx * (W / 2 - .02), 1.03, .98);   // mirrors
    box(g, .02, .1, 2.4, plastic, sx * (W / 2 + .01), .45, 0);                                // side skirts
    box(g, .36, .12, .08, headMat, sx * .58, .74, 2.11, 0, sx * .25, 0); box(g, .06, .05, .06, amber, sx * .82, .72, 2.06);   // headlamps + indicators
    tail(.34, .14, .06, sx * .6, .84, -2.13); box(g, .04, .14, .3, tailMat, sx * (W / 2 - .04), .84, -2.0);
  }
  box(g, .9, .16, .05, plastic, 0, .62, 2.13); box(g, .9, .03, .06, chrome, 0, .68, 2.14);    // grille
  box(g, W - .1, .16, .1, plastic, 0, .42, 2.12); box(g, W - .1, .14, .1, plastic, 0, .44, -2.12);   // bumpers
  box(g, .5, .12, .02, PLATE.white, 0, .5, 2.18); box(g, .5, .12, .02, PLATE.white, 0, .6, -2.18, 0, PI, 0);
  box(g, W - .3, .55, 1.6, seatM, 0, .95, -.3);                                              // cabin interior silhouette
  for (const z of [WB, -WB]) for (const sx of [-1, 1]) v.wheels.push(wheel(g, sx * (W / 2 - .12), R, z, R, .22));
}

// ---------- Premier Padmini kaali-peeli taxi (length 4.0 m) ----------
function buildPadmini(g, v, tail) {
  const B = paint(0x121212), Y = paint(0xf2c21f), W = 1.6, WB = 1.22, R = .32;
  profile(g, s => {
    s.moveTo(1.98, .4); s.quadraticCurveTo(2.04, .62, 1.96, .78); s.quadraticCurveTo(1.75, .9, 1.0, .94); s.lineTo(-1.25, .96);
    s.quadraticCurveTo(-1.85, .95, -1.98, .78); s.quadraticCurveTo(-2.04, .55, -1.96, .4); s.lineTo(-WB - R - .1, .36);
    s.absarc(-WB, .34, R + .1, PI, 0, true); s.lineTo(WB - R - .1, .36); s.absarc(WB, .34, R + .1, PI, 0, true); s.lineTo(1.98, .4);
  }, W, B, .09);
  profile(g, s => { s.moveTo(.98, .93); s.lineTo(.62, 1.36); s.quadraticCurveTo(0, 1.42, -.75, 1.4); s.lineTo(-1.2, .95); s.closePath() }, W - .14, glass, .03);
  profile(g, s => { s.moveTo(.64, 1.35); s.quadraticCurveTo(0, 1.42, -.76, 1.39); s.lineTo(-.74, 1.47); s.quadraticCurveTo(0, 1.5, .6, 1.43); s.closePath() }, W - .12, Y, .05);  // yellow roof
  for (const sx of [-1, 1]) {
    box(g, .04, .4, .07, B, sx * (W / 2 - .08), 1.16, -.1); box(g, .01, .48, .012, plastic, sx * (W / 2 + .005), .7, .05);
    box(g, .025, .035, .12, chrome, sx * (W / 2 + .01), .86, -.1); box(g, .02, .02, 3.5, chrome, sx * (W / 2 + .005), .8, 0);   // chrome side trim
    const hl = add(g, new T.CylinderGeometry(.12, .12, .06, 18), headMat, sx * .55, .72, 2.0, PI / 2, 0, 0); void hl;
    add(g, new T.TorusGeometry(.12, .02, 6, 18), chrome, sx * .55, .72, 2.03);
    box(g, .05, .05, .05, amber, sx * .55, .52, 2.02); tail(.12, .2, .05, sx * .62, .74, -1.99);
    add(g, new T.CylinderGeometry(.06, .04, .12, 8), chrome, sx * .74, 1.0, .95, 0, 0, PI / 2);    // fender mirror stalk
  }
  box(g, .7, .2, .05, chrome, 0, .64, 2.01); for (let i = 0; i < 6; i++) box(g, .7, .015, .06, plastic, 0, .56 + i * .03, 2.02);   // grille
  box(g, W + .02, .1, .12, chrome, 0, .46, 2.06); box(g, W + .02, .1, .12, chrome, 0, .48, -2.06);   // chrome bumpers
  box(g, .5, .12, .02, PLATE.yellow, 0, .36, 2.12); box(g, .5, .12, .02, PLATE.yellow, 0, .62, -2.08, 0, PI, 0);
  box(g, W - .3, .5, 1.5, seatM, 0, .95, -.2);
  for (const z of [WB, -WB]) for (const sx of [-1, 1]) v.wheels.push(wheel(g, sx * (W / 2 - .1), R, z, R, .2, chrome));
}

// ---------- Bajaj-style auto rickshaw (length 2.65 m) ----------
function buildAuto(g, v, tail) {
  const B = paint(0x141414), Y = paint(0xf6c400), G = paint(0x1f7a3a);
  profile(g, s => { s.moveTo(-1.3, .34); s.lineTo(.15, .34); s.lineTo(.2, .72); s.lineTo(-1.25, .78); s.quadraticCurveTo(-1.36, .6, -1.3, .34) }, 1.32, B, .05);   // rear body
  profile(g, s => { s.moveTo(.15, .3); s.lineTo(1.1, .3); s.quadraticCurveTo(1.32, .42, 1.3, .7); s.lineTo(1.18, 1.02); s.lineTo(.78, 1.06); s.lineTo(.42, .74); s.closePath() }, .86, B, .06);  // front cowl
  profile(g, s => { s.moveTo(1.12, .5); s.quadraticCurveTo(1.3, .55, 1.29, .66); s.lineTo(1.2, .9); s.lineTo(1.1, .9); s.closePath() }, .9, G, .03);   // green stripe on the nose
  box(g, 1.3, .06, 1.6, plastic, 0, .34, -.45);                                                   // floor
  box(g, 1.2, .14, .5, seatM, 0, .72, -.95); box(g, 1.2, .5, .12, seatM, 0, 1.0, -1.2);           // rear bench
  box(g, .55, .14, .32, seatM, 0, .9, .25);                                                        // driver seat
  // windscreen + frame
  box(g, 1.1, .62, .02, glass, 0, 1.38, .78, -.18, 0, 0); for (const sx of [-1, 1]) box(g, .04, .66, .04, B, sx * .56, 1.38, .78, -.18, 0, 0);
  // canopy: rexine half-cylinder over a tube frame
  const can = add(g, new T.CylinderGeometry(.7, .7, 2.05, 22, 1, true, -PI / 2, PI), Y, 0, 1.68, -.25, -PI / 2, 0, 0); can.scale.set(1, 1, .5);
  add(g, new T.CylinderGeometry(.7, .7, .04, 22, 1, false, -PI / 2, PI), B, 0, 1.68, .78, -PI / 2, 0, 0).scale.set(1, 1, .5);
  for (const sx of [-1, 1]) for (const z of [.7, -.3, -1.25]) box(g, .035, .95, .035, B, sx * .66, 1.18, z);
  box(g, 1.32, .05, .05, B, 0, .72, .7);
  // handlebar, headlamp, mudguard, mirrors
  box(g, .7, .03, .03, chrome, 0, 1.16, .74); for (const sx of [-1, 1]) { box(g, .05, .05, .14, plastic, sx * .36, 1.16, .7); add(g, new T.CylinderGeometry(.05, .05, .02, 10), chrome, sx * .58, 1.5, .8, PI / 2, 0, 0) }
  add(g, new T.CylinderGeometry(.11, .11, .08, 16), headMat, 0, 1.02, 1.2, PI / 2 - .3, 0, 0); add(g, new T.TorusGeometry(.11, .02, 6, 16), chrome, 0, 1.03, 1.23, -.3, 0, 0);
  for (const sx of [-1, 1]) box(g, .05, .05, .05, amber, sx * .34, .98, 1.18);
  add(g, new T.CylinderGeometry(.36, .36, .2, 16, 1, true, 0, PI), B, 0, .36, 1.05, 0, 0, PI / 2);
  for (const sx of [-1, 1]) tail(.1, .14, .04, sx * .55, .62, -1.33);
  box(g, .4, .1, .02, PLATE.yellow, 0, .5, -1.34, 0, PI, 0);
  v.wheels.push(wheel(g, 0, .28, 1.05, .28, .14), wheel(g, -.6, .28, -.85, .28, .16), wheel(g, .6, .28, -.85, .28, .16));
}

// ---------- BEST-style city bus (length 11 m) ----------
let BUS_TEX = null;
function busTex() {
  if (BUS_TEX) return BUS_TEX;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#b3261e'; x.fillRect(0, 0, 1024, 256);
  const gl = x.createLinearGradient(0, 40, 0, 130); gl.addColorStop(0, '#5a7488'); gl.addColorStop(.5, '#1b2a36'); gl.addColorStop(1, '#0f1820');
  x.fillStyle = gl; x.fillRect(20, 40, 984, 92); x.fillStyle = '#8c1c16'; for (let i = 0; i < 12; i++) x.fillRect(20 + i * 82, 40, 6, 92);
  x.fillStyle = 'rgba(255,255,255,.16)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(30 + i * 82, 128); x.lineTo(70 + i * 82, 44); x.lineTo(84 + i * 82, 44); x.lineTo(44 + i * 82, 128); x.fill() }
  x.fillStyle = '#efe7d4'; x.fillRect(0, 142, 1024, 16); x.fillStyle = '#efe7d4'; x.font = '800 40px sans-serif'; x.fillText('STARTUP CITY TRANSPORT', 160, 205);
  x.fillStyle = '#2a2a2a'; x.fillRect(860, 40, 110, 200); x.fillStyle = '#4a5560'; x.fillRect(868, 48, 44, 120); x.fillRect(918, 48, 44, 120);
  BUS_TEX = new T.CanvasTexture(c); BUS_TEX.colorSpace = T.SRGBColorSpace; return BUS_TEX;
}
function buildBus(g, v, tail) {
  const side = new T.MeshPhysicalMaterial({map: busTex(), roughness: .35, metalness: .3, clearcoat: .6}), P = paint(0xb3261e), cream = paint(0xefe7d4);
  const sideR = side, sideL = side;
  add(g, new T.BoxGeometry(2.55, 2.7, 11), [sideL, sideR, P, plastic, P, P], 0, 1.78, 0);
  // rounded roof
  const roof = add(g, new T.CylinderGeometry(1.275, 1.275, 11, 20, 1, false, -PI / 2, PI), P, 0, 3.13, 0, PI / 2, 0, 0); roof.scale.set(1, 1, .22);
  box(g, 1.5, .25, 3, plastic, 0, 3.45, -1.5);                                                    // roof AC unit
  box(g, 2.4, 1.3, .06, glass, 0, 2.35, 5.52); box(g, 2.5, .08, .1, plastic, 0, 1.66, 5.52);     // windscreen
  const led = box(g, 1.6, .26, .05, new T.MeshStandardMaterial({color: 0x221100, emissive: 0xff8a00, emissiveIntensity: .9}), 0, 3.12, 5.53); void led;
  box(g, 2.6, .3, .2, plastic, 0, .62, 5.5); box(g, 2.6, .3, .2, plastic, 0, .62, -5.5);         // bumpers
  box(g, 2.56, .14, 11.02, cream, 0, 1.1, 0);                                                     // cream skirt band
  for (const sx of [-1, 1]) {
    box(g, .36, .18, .06, headMat, sx * .9, 1.0, 5.53); box(g, .1, .1, .06, amber, sx * 1.15, 1.0, 5.53);
    tail(.3, .3, .06, sx * .95, 1.05, -5.53);
    box(g, .05, .05, .5, plastic, sx * 1.4, 2.8, 5.3); box(g, .08, .35, .18, plastic, sx * 1.62, 2.55, 5.05);   // mirrors on arms
    box(g, .03, .9, .06, plastic, sx * .5, 2.3, 5.56, 0, 0, sx * .4);                                         // wipers
  }
  box(g, .6, .14, .02, PLATE.white, 0, .78, 5.62); box(g, .6, .14, .02, PLATE.white, 0, .8, -5.62, 0, PI, 0);
  for (const z of [-3.6, 3.6]) for (const sx of [-1, 1]) v.wheels.push(wheel(g, sx * 1.12, .5, z, .5, .3));
}

// ---------- Activa-style scooter (length 1.8 m) ----------
function buildScooter(g, v, color) {
  const P = paint(color || 0x2c5fa8);
  profile(g, s => { s.moveTo(.45, .3); s.quadraticCurveTo(.62, .55, .66, 1.08); s.lineTo(.52, 1.12); s.quadraticCurveTo(.45, .62, .3, .36); s.closePath() }, .5, P, .05);   // front apron
  box(g, .36, .06, .7, plastic, 0, .34, -.02);                                                           // floorboard
  profile(g, s => { s.moveTo(-.1, .34); s.quadraticCurveTo(-.25, .78, -.55, .8); s.quadraticCurveTo(-.92, .8, -.95, .55); s.quadraticCurveTo(-.9, .34, -.6, .3); s.closePath() }, .44, P, .07);  // rear body
  box(g, .34, .1, .66, seatM, 0, .86, -.5);
  add(g, new T.CylinderGeometry(.025, .025, .5, 8), chrome, 0, .9, .52, -.35, 0, 0);
  box(g, .66, .05, .05, plastic, 0, 1.18, .62); const hl = box(g, .22, .14, .14, P, 0, 1.12, .7); void hl;
  add(g, new T.CylinderGeometry(.06, .06, .03, 12), headMat, 0, 1.12, .78, PI / 2, 0, 0);
  for (const sx of [-1, 1]) { add(g, new T.CylinderGeometry(.012, .012, .25, 6), plastic, sx * .22, 1.3, .6); add(g, new T.CylinderGeometry(.05, .05, .02, 10), chrome, sx * .22, 1.43, .6, PI / 2, 0, 0) }
  add(g, new T.CylinderGeometry(.28, .28, .14, 14, 1, true, 0, PI), P, 0, .28, .66, 0, 0, PI / 2);     // front mudguard
  box(g, .14, .07, .04, tailMat, 0, .62, -.96); box(g, .22, .06, .02, PLATE.white, 0, .5, -.96, 0, PI, 0);
  v.wheels.push(wheel(g, 0, .26, .66, .26, .12), wheel(g, 0, .26, -.62, .26, .14));
}
