// Draws every numbered billboard. All big boards share one texture and one mesh, and so do all lamp boards,
// so fifty billboards cost only a handful of draw calls.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SPOTS} from './spots.js?v=2';

const COLORS = [['#0f3d3e', '#5eead4'], ['#2b1d4f', '#ffd166'], ['#4a1420', '#ff9f7a'], ['#102a56', '#8fd0ff'], ['#1f3a1c', '#c7f284'], ['#3d2a0d', '#ffd9a0']];

function atlas(list, cols, cw, ch, scale) {
  const rows = Math.ceil(list.length / cols), cv = document.createElement('canvas');
  cv.width = cols * cw * scale; cv.height = rows * ch * scale;
  const x = cv.getContext('2d'), tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 16;
  const cell = i => ({cx: (i % cols) * cw, cy: Math.floor(i / cols) * ch});
  // point one face's UVs at its cell
  const uvFor = (g, i) => {
    const uv = g.attributes.uv, u0 = (i % cols) / cols, v0 = 1 - (Math.floor(i / cols) + 1) / rows;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / cols, v0 + uv.getY(k) / rows);
    return g;
  };
  function paint(i, entry) {
    const {cx, cy} = cell(i), spot = list[i], small = ch < 200;
    const [bg, fg] = COLORS[i % COLORS.length];
    x.save(); x.setTransform(scale, 0, 0, scale, 0, 0); x.translate(cx, cy);
    x.beginPath(); x.rect(0, 0, cw, ch); x.clip();
    x.fillStyle = entry ? bg : '#0b0e14'; x.fillRect(0, 0, cw, ch);
    x.strokeStyle = entry ? fg : '#ffc14d'; x.lineWidth = ch * .06; x.strokeRect(ch * .03, ch * .03, cw - ch * .06, ch - ch * .06);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    // as large as fits the width
    const fit = (text, size, y, color, width = cw * .9) => {
      let s = size; x.font = `800 ${s}px "Baloo 2",Arial,sans-serif`;
      while (x.measureText(text).width > width && s > 10) { s -= 1; x.font = `800 ${s}px "Baloo 2",Arial,sans-serif` }
      x.fillStyle = color; x.fillText(text, cw / 2, y);
    };
    // a long name goes on two lines instead of shrinking
    const lines = text => {
      const words = text.split(' '); if (text.length <= 11 || words.length < 2) return [text];
      let best = 1, gap = 1e9; for (let k = 1; k < words.length; k++) { const d = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length); if (d < gap) { gap = d; best = k } }
      return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    };
    // the spot number, on its own strip along the top so it never covers the words
    const strip = ch * (small ? .26 : .2);
    x.fillStyle = entry ? fg : '#ffc14d'; x.fillRect(0, 0, cw, strip);
    fit(entry ? 'SPOT ' + spot.code : 'FREE  ·  SPOT ' + spot.code, strip * .82, strip * .56, '#0b0e14');
    const name = entry ? lines(entry.startup) : ['YOUR', 'STARTUP HERE'];
    // small boards show only the name; the tagline and website are in the viewer when tapped
    const extra = !small && entry && entry.tagline;
    const area = ch - strip - (extra ? ch * .2 : 0), each = area / name.length, size = Math.min(each * .86, ch * (small ? .34 : .28));
    name.forEach((t, k) => fit(t, size, strip + each * (k + .5), entry ? fg : '#ffffff'));
    if (extra) fit(entry.tagline, ch * .12, ch * .87, '#ffffff');
    x.restore();
  }
  // a copy of one board's picture, for the viewer card
  const snapshot = (i, to) => { const {cx, cy} = cell(i); to.width = cw * 2; to.height = ch * 2; to.getContext('2d').drawImage(cv, cx * scale, cy * scale, cw * scale, ch * scale, 0, 0, to.width, to.height) };
  return {tex, paint, uvFor, snapshot};
}

export function buildBoards({scene, addColl, blocked}) {
  const big = SPOTS.filter(s => s.type === 'big'), lamp = SPOTS.filter(s => s.type === 'lamp');
  // as much detail as a 4096 px texture holds
  const A = atlas(big, 4, 512, 256, window.__MN_LOW ? 1.25 : 2), B = atlas(lamp, 8, 256, 160, window.__MN_LOW ? 1.25 : 2);
  const frame = new T.MeshStandardMaterial({color: 0x23262b, roughness: .5, metalness: .5});
  const frames = [], bigFaces = [], lampFaces = [];
  const place = (geo, x, y, z, ry, dz = 0) => { geo.translate(0, 0, dz); geo.rotateY(ry); geo.translate(x, y, z); return geo };
  // two faces back to back, so a board reads correctly from both sides
  const faces = (list, a, i, w, h, x, y, z, ry, depth) => {
    for (const turn of [0, Math.PI]) list.push(place(a.uvFor(new T.PlaneGeometry(w, h), i), x, y, z, ry + turn, depth));
  };

  big.forEach((s, i) => {
    // move a big board off anything solid, spiralling outwards from its intended place
    for (let r = 0; r <= 45 && blocked(s.x, s.z, 5.4); r += 3) for (let a = 0; a < 6.28 && blocked(s.x, s.z, 5.4); a += .8) {
      const nx = s.x + Math.cos(a) * r, nz = s.z + Math.sin(a) * r;
      if (!blocked(nx, nz, 5.4)) { s.x = nx; s.z = nz }
    }
    const w = 10, h = 5;
    frames.push(place(new T.BoxGeometry(w + .4, h + .4, .36), s.x, 6.6, s.z, s.ry));
    faces(bigFaces, A, i, w, h, s.x, 6.6, s.z, s.ry, .19);
    for (const e of [-1, 1]) {
      const px = s.x + Math.cos(s.ry) * e * 3.4, pz = s.z - Math.sin(s.ry) * e * 3.4;
      frames.push(place(new T.CylinderGeometry(.18, .24, 4.1, 8), px, 2.05, pz, 0));
      addColl(px - .35, px + .35, pz - .35, pz + .35, 4);
    }
  });
  lamp.forEach((s, i) => {
    // beside the pole at second-storey height
    const x = s.x + Math.cos(s.ry) * 1.35 * s.side, z = s.z - Math.sin(s.ry) * 1.35 * s.side;
    frames.push(place(new T.BoxGeometry(2.52, 1.62, .08), x, 4.2, z, s.ry));
    faces(lampFaces, B, i, 2.4, 1.5, x, 4.2, z, s.ry, .045);
  });

  const add = (geos, mat, shadow) => { const m = new T.Mesh(mergeGeometries(geos), mat); m.castShadow = shadow; m.userData.kit = true; scene.add(m); return m };
  const lit = tex => new T.MeshBasicMaterial({map: tex, toneMapped: false, fog: false});
  const bigMat = lit(A.tex), lampMat = lit(B.tex);
  add(frames, frame, true);
  const bigMesh = add(bigFaces, bigMat, false), lampMesh = add(lampFaces, lampMat, false);
  const ray = new T.Raycaster();

  let current = new Map();
  function update(rows) {
    current = new Map(rows.map(r => [r.spot, r]));
    big.forEach((s, i) => A.paint(i, current.get(s.code)));
    lamp.forEach((s, i) => B.paint(i, current.get(s.code)));
    A.tex.needsUpdate = B.tex.needsUpdate = true;
  }
  update([]);
  document.fonts && document.fonts.ready.then(() => update([...current.values()]));

  return {
    update,
    taken: code => current.get(code),
    // the board under a tap or click (screen position in -1..1), within walking distance
    pick(camera, ndc, reach = 55) {
      ray.setFromCamera(ndc, camera); ray.far = reach;
      const hit = ray.intersectObjects([bigMesh, lampMesh], false)[0];
      if (!hit) return null;
      // every board is two faces of two triangles, merged in list order
      return {spot: (hit.object === bigMesh ? big : lamp)[Math.floor(hit.faceIndex / 4)], distance: hit.distance};
    },
    snapshot(spot, canvas) { const i = big.indexOf(spot); if (i >= 0) A.snapshot(i, canvas); else B.snapshot(lamp.indexOf(spot), canvas) },
    // the billboard the player is standing at, if any
    near(x, z) {
      let best = null, bd = 1e9;
      for (const s of SPOTS) { const d = Math.hypot(s.x - x, s.z - z), reach = s.type === 'big' ? 9 : 3.2; if (d < reach && d < bd) { best = s; bd = d } }
      return best;
    },
    night() {},
  };
}
