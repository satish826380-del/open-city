// City-builder style architecture: houses, townhouses, brick halls with turrets, apartment blocks, domed civic
// buildings and landmarks. Everything is made from simple shapes with painted vertices and merged per area,
// so a whole district costs only a few draw calls. No textures or downloads needed.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const PI = Math.PI;
// windows that glow after dark; game.js sets the strength
export const windowGlow = new T.MeshStandardMaterial({color: 0x39506b, emissive: 0xffc873, emissiveIntensity: 0, roughness: .15, metalness: .55});

const C = {
  cream: 0xf3e6c8, white: 0xf7f4ec, stone: 0xd9cbb0, darkStone: 0x8f8374, brick: 0xb5533c, brickDeep: 0x93402f, terracotta: 0xd0623b,
  sand: 0xe6b873, ochre: 0xd99a3d, rose: 0xdb8f86, sage: 0x9dbd8c, sky: 0x8fbfd9, lilac: 0xb7a3d6, teal: 0x3f9e94,
  roofRed: 0xb4402f, roofBlue: 0x2f6fb0, roofGreen: 0x2f8a6c, roofSlate: 0x4a5568, roofTeal: 0x3a9ea5, roofOrange: 0xe0752c,
  wood: 0x7a4b2b, door: 0x4a2c1c, iron: 0x2b2f36, gold: 0xe9b949, grass: 0x5f9e3f, leaf: 0x3f8a36, water: 0x4fb3d9,
};
const WALLS = [C.brick, C.cream, C.sand, C.rose, C.sage, C.sky, C.terracotta, C.ochre, C.lilac, C.white, C.brickDeep];
const ROOFS = [C.roofRed, C.roofBlue, C.roofGreen, C.roofSlate, C.roofTeal, C.roofOrange];

export function makeKit({scene, R}) {
  const pick = a => a[Math.floor(R() * a.length)];
  const rnd = (a, b) => a + R() * (b - a);
  // light grey patterns that the painted colour is multiplied with: brick courses, roof tiles, plaster
  function pattern(size, draw) {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); draw(x, size);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t;
  }
  const grain = (x, s, n, a) => { for (let i = 0; i < n; i++) { x.globalAlpha = R() * a; x.fillStyle = R() < .5 ? '#000' : '#fff'; x.fillRect(R() * s, R() * s, 2, 2) } x.globalAlpha = 1 };
  const brickTex = pattern(256, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    for (let r = 0; r < 16; r++) for (let c = -1; c < 8; c++) { const v = 196 + R() * 52; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(c * 32 + (r % 2) * 16 + 1, r * 16 + 1, 30, 14) }
    grain(x, s, 1500, .12);
  });
  const tileTex = pattern(256, (x, s) => {
    x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, s, s);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 9; c++) {
      const px = c * 32 + (r % 2) * 16, py = r * 32, v = 210 + R() * 45, g = x.createLinearGradient(0, py, 0, py + 32);
      g.addColorStop(0, `rgb(${v * .62},${v * .62},${v * .62})`); g.addColorStop(.45, `rgb(${v},${v},${v})`); g.addColorStop(1, '#fff');
      x.fillStyle = g; x.beginPath(); x.moveTo(px + 1, py); x.lineTo(px + 31, py); x.lineTo(px + 31, py + 22); x.quadraticCurveTo(px + 16, py + 38, px + 1, py + 22); x.closePath(); x.fill();
    }
  });
  const plasterTex = pattern(256, (x, s) => {
    x.fillStyle = '#f4f4f4'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) { x.globalAlpha = .05; x.fillStyle = R() < .5 ? '#6d6d6d' : '#ffffff'; x.beginPath(); x.ellipse(R() * s, R() * s, 10 + R() * 40, 8 + R() * 26, R() * 3, 0, 7); x.fill() }
    grain(x, s, 2600, .1);
  });
  const paneTex = pattern(64, (x, s) => {
    const g = x.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#a9d8f5'); g.addColorStop(.45, '#4f86ad'); g.addColorStop(1, '#1d3a52'); x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.fillStyle = 'rgba(255,255,255,.28)'; x.beginPath(); x.moveTo(0, s * .55); x.lineTo(s * .5, 0); x.lineTo(s * .75, 0); x.lineTo(0, s * .85); x.fill();
  });
  const surf = (map, rough) => new T.MeshStandardMaterial({map, vertexColors: true, roughness: rough, metalness: .02});
  const paint = surf(plasterTex, .8), brickM = surf(brickTex, .86), tileM = surf(tileTex, .55);
  const gloss = new T.MeshStandardMaterial({vertexColors: true, roughness: .26, metalness: .4});
  const pane = new T.MeshStandardMaterial({map: paneTex, roughness: .08, metalness: .55, envMapIntensity: 1.2});
  const TILED = new Set([C.roofRed, C.roofBlue, C.roofGreen, C.roofSlate, C.roofTeal, C.roofOrange]);
  const BRICKED = new Set([C.brick, C.brickDeep, C.terracotta, C.darkStone, C.stone]);
  const glass = new T.MeshStandardMaterial({color: 0x4d7ea8, roughness: .08, metalness: .75, envMapIntensity: 1.1});
  const bins = new Map();
  const cache = new Map();
  const geo = (key, make) => cache.get(key) || cache.set(key, make()).get(key);
  const BOX = new T.BoxGeometry(1, 1, 1).toNonIndexed(), PLANE = new T.PlaneGeometry(1, 1).toNonIndexed();
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3(), _c = new T.Color(), _w = new T.Matrix4();

  function push(mat, g, world) {
    const e = world.elements, key = mat.uuid + '|' + Math.floor(e[12] / 110) + '|' + Math.floor(e[14] / 110);
    let b = bins.get(key); if (!b) bins.set(key, b = {mat, list: []});
    b.list.push(g);
  }
  const LOWPOLY = !!window.__MN_LOW, f1 = v => Math.round(v * 10) / 10;
  // a box with soft, rounded edges (walls, chimneys, pillars)
  const softBox = (w, h, d, r) => geo(`s${f1(w)}_${f1(h)}_${f1(d)}_${f1(r)}`, () => new RoundedBoxGeometry(f1(w), f1(h), f1(d), LOWPOLY ? 2 : 3, r));
  // a flat band with rounded corners seen from above, so ledges follow the rounded walls
  const softSlab = (w, h, d) => geo(`b${f1(w)}_${f1(h)}_${f1(d)}`, () => {
    const W = f1(w) / 2, D = f1(d) / 2, r = Math.min(.6, W * .5, D * .5), s = new T.Shape();
    s.moveTo(-W + r, -D); s.lineTo(W - r, -D); s.absarc(W - r, -D + r, r, -PI / 2, 0); s.lineTo(W, D - r); s.absarc(W - r, D - r, r, 0, PI / 2);
    s.lineTo(-W + r, D); s.absarc(-W + r, D - r, r, PI / 2, PI); s.lineTo(-W, -D + r); s.absarc(-W + r, -D + r, r, PI, PI * 1.5);
    const g = new T.ExtrudeGeometry(s, {depth: Math.max(.04, f1(h)), bevelEnabled: false, curveSegments: LOWPOLY ? 3 : 6}); g.rotateX(-PI / 2); g.translate(0, -Math.max(.04, f1(h)) / 2, 0); return g;
  });
  // roof with rounded corners and a gentle sweep from the eaves to the top
  const softHip = () => geo('softhip', () => {
    const g = new T.CylinderGeometry(1, 1, 1, LOWPOLY ? 20 : 32, 7), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), t = p.getY(i) + .5, r = Math.hypot(x, z), a = Math.atan2(z, x), c = Math.cos(a), s = Math.sin(a);
      const half = .5 * (1 - .9 * Math.pow(t, .78)) * (r > .01 ? 1 : 0);
      p.setXYZ(i, Math.sign(c) * Math.pow(Math.abs(c), .36) * half, t - .5 + (t > .99 ? .02 : 0), Math.sign(s) * Math.pow(Math.abs(s), .36) * half);
    }
    g.computeVertexNormals(); return g;
  });
  // a building's own frame: x to its right, z out of its front, y up
  function frame(x, z, ry, y0 = 0) {
    const base = new T.Matrix4().compose(new T.Vector3(x, y0, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(1, 1, 1));
    function add(src, color, lx, ly, lz, sx = 1, sy = 1, sz = 1, rx = 0, ly2 = 0, rz = 0, mat = paint) {
      const g = src.index ? src.toNonIndexed() : src.clone();
      if (mat === paint) mat = TILED.has(color) ? tileM : BRICKED.has(color) ? brickM : paint;
      const isPane = mat === pane || mat === windowGlow;
      if (!isPane) g.deleteAttribute('uv');
      _m.compose(_p.set(lx, ly, lz), _q.setFromEuler(_e.set(rx, ly2, rz)), _s.set(sx, sy, sz)); _w.multiplyMatrices(base, _m); g.applyMatrix4(_w);
      if (!isPane) {
        const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count, col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
        _c.set(color).multiplyScalar(.9); _c.offsetHSL(0, .08, 0);
        for (let i = 0; i < n; i++) {
          const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i), nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
          // soft shading: darker where a wall meets the ground and underneath ledges
          const shade = ny < -.5 ? .55 : py < .9 ? .72 : py < 3 ? .9 : 1;
          col[i * 3] = _c.r * shade; col[i * 3 + 1] = _c.g * shade; col[i * 3 + 2] = _c.b * shade;
          // patterns are laid in world metres so they never stretch
          if (Math.abs(ny) > .92) { uv[i * 2] = px / 2; uv[i * 2 + 1] = pz / 2 }
          else { const l = Math.hypot(nx, nz) || 1; uv[i * 2] = (px * -nz + pz * nx) / l / 2; uv[i * 2 + 1] = py / (2 * Math.max(.45, l)) }
        }
        g.setAttribute('color', new T.BufferAttribute(col, 3));
        g.setAttribute('uv', new T.BufferAttribute(uv, 2));
      }
      push(mat, g, _w);
    }
    const f = {
      add,
      box(w, h, d, color, lx, ly, lz, turn = 0, mat) {
        const thin = Math.min(w, h, d);
        if (h < .6 && w > 2.6 && d > 2.6) return add(softSlab(w, h, d), color, lx, ly, lz, 1, 1, 1, 0, turn, 0, mat);
        if (thin >= .45 && Math.max(w, h, d) >= 1.1) return add(softBox(w, h, d, Math.min(.55, thin * .3)), color, lx, ly, lz, 1, 1, 1, 0, turn, 0, mat);
        add(BOX, color, lx, ly, lz, w, h, d, 0, turn, 0, mat);
      },
      cyl: (rt, rb, h, color, lx, ly, lz, seg = 14, mat) => add(geo(`c${rt}_${rb}_${seg}`, () => new T.CylinderGeometry(rt, rb, 1, LOWPOLY ? seg : Math.max(16, Math.round(seg * 1.5)))), color, lx, ly, lz, 1, h, 1, 0, 0, 0, mat),
      cone: (r, h, color, lx, ly, lz, seg = 12) => add(geo(`k${seg}`, () => new T.ConeGeometry(1, 1, seg === 4 || LOWPOLY ? seg : 20)), color, lx, ly + h / 2, lz, r, h, r, 0, seg === 4 ? PI / 4 : 0),
      dome: (r, color, lx, ly, lz, tall = 1) => add(geo('dome', () => new T.SphereGeometry(1, 20, 10, 0, PI * 2, 0, PI / 2)), color, lx, ly, lz, r, r * tall, r, 0, 0, 0, gloss),
      ball: (r, color, lx, ly, lz) => add(geo('ball', () => new T.SphereGeometry(1, 10, 7)), color, lx, ly, lz, r, r, r),
      // ridge roof running along x: width w, depth d, rise h
      gable(w, d, h, color, lx, ly, lz, turn = 0, wall) {
        const s = new T.Shape(); s.moveTo(-.52, 0); s.lineTo(.52, 0); s.quadraticCurveTo(.24, .36, .1, .9); s.quadraticCurveTo(0, 1.08, -.1, .9); s.quadraticCurveTo(-.24, .36, -.52, 0);
        const g = geo('gable', () => { const e = new T.ExtrudeGeometry(s, {depth: 1, bevelEnabled: false, curveSegments: 8}); e.translate(0, 0, -.5); e.rotateY(PI / 2); return e });
        add(g, color, lx, ly, lz, turn ? d : w, h, turn ? w : d, 0, turn ? PI / 2 : 0, 0);
        if (w > 2.5) { const a = turn ? PI / 2 : 0, ox = turn ? d / 2 : 0, oz = turn ? 0 : d / 2; for (const e of [-1, 1]) add(BOX, C.white, lx + e * ox, ly + .06, lz + e * oz, w + .1, .16, .14, 0, a, 0); add(BOX, C.cream, lx, ly + h, lz, w + .12, .14, .26, 0, a, 0) }
        if (wall !== undefined) for (const e of [-1, 1]) add(g, wall, lx + (turn ? 0 : e * w / 2), ly, lz + (turn ? e * w / 2 : 0), turn ? d * .86 : .12, h * .86, turn ? .12 : d * .86, 0, turn ? PI / 2 : 0);
      },
      // four-sided roof with a flat ridge
      hip(w, d, h, color, lx, ly, lz) {
        add(softHip(), color, lx, ly + h / 2, lz, w, h, d);
        f.box(w + .18, .18, d + .18, C.white, lx, ly + .07, lz);
      },
      barrel(w, d, h, color, lx, ly, lz, wall) {
        const half = geo('barrel', () => { const s = new T.Shape(); s.absarc(0, 0, .5, 0, PI, false); const g = new T.ExtrudeGeometry(s, {depth: 1, bevelEnabled: false, curveSegments: LOWPOLY ? 8 : 16}); g.translate(0, 0, -.5); return g });
        add(half, color, lx, ly, lz, w + .3, h * 2, d + .3);
        if (wall !== undefined) for (const e of [-1, 1]) { add(half, C.white, lx, ly, lz + e * (d / 2 + .16), w + .1, h * 1.9, .08); add(half, wall, lx, ly, lz + e * (d / 2 + .2), w - .3, h * 1.55, .08) }
      },
      // a framed window on a wall that faces `turn` (0 = front, PI = back, ±PI/2 = sides)
      window(lx, ly, lz, w, h, turn, trim = C.white, arch = false) {
        const nx = Math.sin(turn), nz = Math.cos(turn), at = d => [lx + nx * d, lz + nz * d];
        const [ax, az] = at(.03); add(PLANE, trim, ax, ly, az, w + .26, h + .26, 1, 0, turn);
        if (LOWPOLY) { const [bx, bz] = at(.05); add(PLANE, 0, bx, ly, bz, w, h, 1, 0, turn, 0, R() < .4 ? windowGlow : pane); return }
        const [bx, bz] = at(.055); const lit = R() < .4; add(PLANE, 0, bx, ly, bz, w, h, 1, 0, turn, 0, lit ? windowGlow : pane);
        const [cx, cz] = at(.075); add(PLANE, trim, cx, ly, cz, .07, h, 1, 0, turn); add(PLANE, trim, cx, ly + h * .12, cz, w, .07, 1, 0, turn);
        const [sx, sz] = at(.12); add(BOX, trim, sx, ly - h / 2 - .14, sz, w + .4, .1, .24, 0, turn);
        if (arch) { const [hx, hz] = at(.04); add(geo('arch', () => new T.CircleGeometry(.5, 12, 0, PI)), trim, hx, ly + h / 2 + .1, hz, w + .26, w * .8, 1, 0, turn) }
        else add(BOX, trim, sx, ly + h / 2 + .16, sz, w + .3, .12, .2, 0, turn);
      },
      // rows of windows around all four walls of a block
      windows(w, d, y0, floors, fh, trim, arch, skipDoor) {
        for (const [turn, len, off] of [[0, w, d / 2], [PI, w, d / 2], [PI / 2, d, w / 2], [-PI / 2, d, w / 2]]) {
          const n = Math.max(1, Math.floor(len / 2.7)), step = len / n;
          for (let fl = 0; fl < floors; fl++) for (let i = 0; i < n; i++) {
            if (skipDoor && turn === 0 && fl === 0 && Math.abs((i + .5) * step - len / 2) < 1.4) continue;
            const t = -len / 2 + (i + .5) * step, nx = Math.sin(turn), nz = Math.cos(turn);
            f.window(nx * off + nz * t, y0 + fl * fh + fh * .52, nz * off - nx * t, Math.min(1.35, step * .55), fh * .56, turn, trim, arch && fl === floors - 1);
          }
        }
      },
      door(lz, trim = C.white, w = 1.5) {
        f.box(w + .5, 2.9, .16, trim, 0, 1.45, lz + .05); f.box(w, 2.55, .12, C.door, 0, 1.28, lz + .12); f.box(.08, .08, .08, C.gold, w * .3, 1.25, lz + .22);
        f.box(w + 1, .22, .9, C.stone, 0, .11, lz + .45); f.box(w + .5, .2, .55, C.stone, 0, .32, lz + .28);
      },
      shrub(lx, lz, r = .45) { f.ball(r, C.leaf, lx, r * .8, lz) },
      chimney(lx, ly, lz) { f.box(.62, 1.7, .62, C.brickDeep, lx, ly + .85, lz); f.box(.82, .18, .82, C.stone, lx, ly + 1.75, lz); f.cyl(.14, .14, .4, C.terracotta, lx, ly + 2, lz, 8) },
      dormer(lx, ly, lz, turn, roof, wall) {
        const nz = Math.cos(turn), nx = Math.sin(turn);
        f.box(1.25, 1.1, 1, wall, lx, ly + .55, lz, turn); f.window(lx + nx * .5, ly + .56, lz + nz * .5, .7, .7, turn);
        f.gable(1.3, 1.55, .65, roof, lx, ly + 1.1, lz, 1);
      },
      turret(lx, lz, r, h, wall, roof, trim = C.cream) {
        f.cyl(r, r * 1.06, h, wall, lx, h / 2, lz, 10);
        for (let y = 3.1; y < h; y += 3.1) { f.cyl(r + .1, r + .1, .18, trim, lx, y, lz, 10); for (let a = 0; a < 6.2; a += PI / 2) f.window(lx + Math.sin(a) * r, y - 1.4, lz + Math.cos(a) * r, .5, 1.2, a, trim, true) }
        f.cyl(r + .28, r + .2, .4, trim, lx, h + .2, lz, 10); f.cone(r + .35, r * 2.6, roof, lx, h + .4, lz, 10); f.ball(.18, C.gold, lx, h + .5 + r * 2.6, lz);
      },
      columns(n, span, lz, h, y0 = 0, color = C.white) {
        for (let i = 0; i < n; i++) { const x = -span / 2 + i * span / (n - 1); f.cyl(.24, .3, h, color, x, y0 + h / 2, lz, 12); f.box(.75, .22, .75, color, x, y0 + h + .1, lz); f.box(.75, .2, .75, color, x, y0 + .1, lz) }
      },
    };
    return f;
  }

  // ---------- building types (w along the front, d deep; returns the height) ----------
  function house(f, w, d, floors, wall = pick(WALLS), roof = pick(ROOFS)) {
    const fh = 2.9, H = floors * fh;
    f.box(w + .3, .45, d + .3, C.darkStone, 0, .22, 0);
    f.box(w, H, d, wall, 0, H / 2 + .2, 0);
    for (const x of [-w / 2 + .12, w / 2 - .12]) for (const z of [-d / 2 + .12, d / 2 - .12]) f.cyl(.2, .2, H, C.white, x, H / 2 + .2, z, 10);
    // some houses get a round corner tower
    if (R() < .35) { const x = (R() < .5 ? -1 : 1) * (w / 2 - .3); f.turret(x, d / 2 - .3, 1.25, H + .6, wall, roof, C.white) }
    f.windows(w, d, .2, floors, fh, C.white, R() < .5, true);
    { const n = Math.max(1, Math.floor(w / 2.7)), step = w / n, ww = Math.min(1.35, step * .55), shutter = pick([C.roofGreen, C.roofBlue, C.door, C.roofRed]);
      for (let fl = 0; fl < floors; fl++) for (let i = 0; i < n; i++) {
        const t = -w / 2 + (i + .5) * step, y = .2 + fl * fh + fh * .52; if (fl === 0 && Math.abs((i + .5) * step - w / 2) < 1.4) continue;
        for (const s of [-1, 1]) f.box(.28, fh * .56, .08, shutter, t + s * (ww / 2 + .3), y, d / 2 + .06);
        f.box(ww + .2, .22, .3, C.wood, t, y - fh * .28 - .34, d / 2 + .2); for (let q = -1; q <= 1; q++) f.ball(.14, [0xff5d7a, 0xffd23f, 0xffffff][(q + i + 3) % 3], t + q * ww * .34, y - fh * .28 - .16, d / 2 + .22) } }
    // front garden: lawn, path and picket fence
    f.box(w + 1.6, .04, 2.6, C.grass, 0, .01, d / 2 + 1.4); f.box(1.5, .04, 2.7, C.stone, 0, .02, d / 2 + 1.4);
    for (let x = -w / 2 - .6; x <= w / 2 + .7; x += .42) if (Math.abs(x) > 1) f.box(.1, .72, .08, C.white, x, .44, d / 2 + 2.65);
    for (const s of [-1, 1]) f.box(w / 2 - .3, .08, .06, C.white, s * (w / 4 + .65), .58, d / 2 + 2.65);
    f.door(d / 2);
    // lanterns by the door, a drainpipe, a cornice with small brackets under the roof
    for (const s of [-1, 1]) { f.box(.16, .3, .16, C.iron, s * 1.15, 2.3, d / 2 + .16); f.add(geo('lamp', () => new T.SphereGeometry(1, 8, 6)), 0, s * 1.15, 2.18, d / 2 + .16, .1, .12, .1, 0, 0, 0, windowGlow) }
    f.cyl(.07, .07, H, C.iron, w / 2 - .12, H / 2 + .2, d / 2 + .1, 6);
    f.box(w + .35, .22, d + .35, C.white, 0, H + .25, 0);
    for (let x = -w / 2 + .3; x <= w / 2 - .2; x += .55) f.box(.14, .2, .2, C.cream, x, H + .04, d / 2 + .12);
    const rise = Math.min(3.4, Math.min(w, d) * .42);
    if (R() < .55) { f.hip(w + .9, d + .9, rise, roof, 0, H + .34, 0); f.dormer(0, H + .35, d / 2 - .55, 0, roof, wall) }
    else { f.gable(w + .7, d + .8, rise, roof, 0, H + .34, 0, 0, wall); f.window(w / 2 + .05, H + rise * .4, 0, .8, .8, PI / 2) }
    f.chimney(w * .28, H + .5, -d * .18);
    // porch roof on two posts, and a planted front
    f.gable(2.9, 1.5, .55, roof, 0, 2.95, d / 2 + .75, 1); for (const e of [-1, 1]) f.box(.14, 2.75, .14, C.white, e * 1.2, 1.5, d / 2 + 1.3);
    for (let x = -w / 2 + .6; x <= w / 2 - .5; x += 1.15) if (Math.abs(x) > 1.7) f.shrub(x, d / 2 + .6, .32 + R() * .14);
    return H + rise + 1.5;
  }

  function townhouses(f, w, d, floors) {
    const n = Math.max(2, Math.round(w / 5.2)), bw = w / n, fh = 3; let top = 0;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + .5) * bw, wall = WALLS[(i * 3 + Math.floor(R() * 3)) % WALLS.length], roof = pick(ROOFS), fl = Math.max(2, floors - (i % 2)), H = fl * fh;
      f.box(bw - .06, H, d, wall, x, H / 2, 0);
      for (const s of [-1, 1]) f.box(.22, H, .14, C.cream, x + s * (bw / 2 - .14), H / 2, d / 2 + .04); // pilasters between the houses
      for (let k = 0; k < fl; k++) {
        for (const s of [-1, 1]) { if (!(k === 0 && s === -1)) f.window(x + s * bw * .23, k * fh + 1.6, d / 2, bw * .24, 1.55, 0, C.cream, k === fl - 1); f.window(x + s * bw * .23, k * fh + 1.6, -d / 2, bw * .24, 1.5, PI) }
        f.box(bw, .16, d + .18, C.cream, x, (k + 1) * fh - .02, 0);
      }
      // shop front or door with a striped awning
      f.box(bw * .3, 2.3, .14, C.door, x - bw * .23, 1.15, d / 2 + .08);
      if (R() < .7) for (let s = 0; s < 4; s++) f.add(BOX, s % 2 ? C.white : roof, x - bw * .36 + s * bw * .24, 2.75, d / 2 + .55, bw * .24, .1, 1.1, .35);
      const rise = bw * .62;
      if (i % 3 === 1) f.barrel(bw - .1, d, rise * .8, roof, x, H, 0, wall); else f.gable(d + .5, bw + .1, rise, roof, x, H, 0, 1, wall);
      f.window(x, H + rise * .34, d / 2 + .02, .8, .8, 0, C.cream, true);
      f.chimney(x + bw * .3, H + rise * .2, -d * .28);
      top = Math.max(top, H + rise);
    }
    return top + 1;
  }

  function manor(f, w, d, floors, wall = R() < .65 ? pick([C.brick, C.brickDeep, C.terracotta]) : pick([C.sand, C.cream]), roof = pick([C.roofRed, C.roofRed, C.roofSlate, C.roofBlue, C.roofGreen])) {
    const fh = 3.2, H = floors * fh, bay = Math.min(6, w * .34);
    f.box(w + .5, .7, d + .5, C.stone, 0, .35, 0);
    f.box(w, H, d, wall, 0, H / 2 + .4, 0);
    f.windows(w, d, .4, floors, fh, C.cream, true, true);
    for (let k = 1; k <= floors; k++) f.box(w + .3, .24, d + .3, C.cream, 0, k * fh + .4, 0);
    const rise = Math.min(4.6, d * .5);
    f.gable(w + .6, d + .9, rise, roof, 0, H + .5, 0, 0, wall);
    f.box(w + .7, .16, .22, C.gold, 0, H + .5 + rise, 0);
    for (let x = -w / 2 + 2.2; x <= w / 2 - 2; x += 3.4) if (Math.abs(x) > bay / 2 + .6) { f.dormer(x, H + .7, d / 2 - .75, 0, roof, wall); f.dormer(x, H + .7, -d / 2 + .75, PI, roof, wall) }
    // central gabled entrance bay
    f.box(bay, H + 1.4, 1.2, wall, 0, (H + 1.4) / 2 + .4, d / 2 + .3);
    for (let k = 1; k < floors; k++) for (const s of [-1, 0, 1]) f.window(s * bay * .3, k * fh + 2, d / 2 + .9, bay * .17, 1.9, 0, C.cream, true);
    for (const e of [-1, 1]) f.box(.4, H + 1.4, .4, C.cream, e * bay / 2, (H + 1.4) / 2 + .4, d / 2 + .9);
    f.gable(2.2, bay + .5, bay * .55, roof, 0, H + 1.8, d / 2 + .2, 1, wall);
    f.add(geo('clock', () => new T.CircleGeometry(.5, 20)), C.white, 0, H + 1.8 + bay * .2, d / 2 + 1.36, 1.2, 1.2, 1);
    f.box(2.8, 3.1, .3, C.cream, 0, 1.95, d / 2 + .95); f.box(1.9, 2.7, .16, C.door, 0, 1.75, d / 2 + 1.12);
    f.gable(.8, 3.4, 1, C.cream, 0, 3.5, d / 2 + 1.15, 1);
    for (const s of [0, 1, 2]) f.box(3.6 + s * .7, .22, .6, C.stone, 0, .55 - s * .2, d / 2 + 1.3 + s * .4);
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) f.turret(x, z, 1.15, H + 2.2, wall, roof);
    for (const x of [-w * .25, w * .25]) f.chimney(x, H + .6 + rise * .45, -d * .12);
    return H + rise + 4;
  }

  function apartments(f, w, d, floors) {
    const fh = 3, H = floors * fh, wall = pick([C.terracotta, C.sand, C.cream, C.sky, C.rose, C.white]), trim = wall === C.white || wall === C.cream ? C.teal : C.white, roof = pick([C.roofBlue, C.roofTeal, C.roofSlate]);
    f.box(w + .6, 3.3, d + .6, C.darkStone, 0, 1.65, 0);
    for (let x = -w / 2 + 1.6; x <= w / 2 - 1.4; x += 3) { f.box(2.2, 2.2, .1, 0x35607f, x, 1.4, d / 2 + .34, 0, gloss); f.add(BOX, pick(ROOFS), x, 2.85, d / 2 + .8, 2.5, .1, 1.1, .3) }
    f.box(w, H, d, wall, 0, 3.3 + H / 2, 0);
    f.windows(w, d, 3.3, floors, fh, trim, false, false);
    for (let k = 0; k < floors; k++) {
      f.box(w + .24, .2, d + .24, trim, 0, 3.3 + k * fh, 0);
      for (let x = -w / 2 + 2; x <= w / 2 - 1.8; x += 5.4) if ((k + Math.round(x)) % 3 !== 0) { f.box(2.4, .14, 1, trim, x, 3.4 + k * fh, d / 2 + .5); f.box(2.4, .75, .08, wall === C.white ? C.teal : C.iron, x, 3.85 + k * fh, d / 2 + 1) }
    }
    // rounded ends with wrap-around bands, and a curved central bay
    for (const x of [-w / 2, w / 2]) { f.cyl(d * .27, d * .27, H + .6, trim, x, 3.3 + H / 2 + .3, 0, 18); for (let q = 0; q < floors; q++) for (const a of [-.9, 0, .9]) { const turn = (x > 0 ? PI / 2 : -PI / 2) + a; f.window(x + Math.sin(turn) * d * .27, 3.3 + q * fh + 1.6, Math.cos(turn) * d * .27, .8, 1.6, turn, trim) } f.dome(d * .29, roof, x, 3.3 + H + .6, 0, .7) }
    { const r = Math.min(2.2, w * .16); f.cyl(r, r, H, wall, 0, 3.3 + H / 2, d / 2 - r * .35, 20); for (let q = 0; q < floors; q++) { for (const a of [-.75, 0, .75]) f.window(Math.sin(a) * r, 3.3 + q * fh + 1.6, d / 2 - r * .35 + Math.cos(a) * r, .8, 1.65, a, trim); f.cyl(r + .18, r + .18, .18, trim, 0, 3.3 + q * fh, d / 2 - r * .35, 20) } f.dome(r + .15, roof, 0, 3.3 + H + .1, d / 2 - r * .35, 1) }
    const top = 3.3 + H;
    f.box(w + .7, .5, d + .7, trim, 0, top + .2, 0); if (R() < .45) f.barrel(w * .62, d * .82, 2.6, roof, 0, top + .4, 0, wall); else f.hip(w * .8, d * .8, 1.9, roof, 0, top + .4, 0);
    for (let x = -w * .22; x <= w * .22; x += 1.7) f.add(BOX, 0x1d3f6e, x, top + 1.55, d * .28, 1.4, .08, 1.6, .5, 0, 0, gloss);
    f.cyl(.9, .9, 1.4, C.darkStone, -w * .25, top + 2.8, -d * .15); f.cone(1, .7, roof, -w * .25, top + 3.5, -d * .15);
    return top + 4;
  }

  function roundHall(f, w, d, floors) {
    const r = Math.min(w, d) * .5, fh = 3.1, H = floors * fh, wall = pick([C.cream, C.sand, C.rose, C.sky, C.white, C.terracotta]), roof = pick(ROOFS), trim = wall === C.white || wall === C.cream ? C.teal : C.white;
    f.cyl(r + .35, r + .45, .6, C.darkStone, 0, .3, 0, 28); f.cyl(r, r, H, wall, 0, .6 + H / 2, 0, 28);
    const n = Math.max(8, Math.floor(PI * 2 * r / 2.5));
    for (let q = 0; q < floors; q++) { for (let i = 0; i < n; i++) { const a = i / n * PI * 2; if (q === 0 && i === 0) continue; f.window(Math.sin(a) * r, .6 + q * fh + 1.55, Math.cos(a) * r, 1.05, 1.7, a, trim, q === floors - 1) } f.cyl(r + .22, r + .22, .24, trim, 0, .6 + (q + 1) * fh, 0, 28) }
    f.door(r - .05);
    f.cyl(r + .45, r + .3, .45, trim, 0, H + .85, 0, 28);
    f.cyl(r * .72, r * .72, 1.4, wall, 0, H + 1.7, 0, 24); for (let a = 0; a < 6.2; a += PI / 4) f.window(Math.sin(a) * r * .72, H + 1.75, Math.cos(a) * r * .72, .6, .85, a, trim, true);
    f.dome(r * .82, roof, 0, H + 2.4, 0, .85); f.cyl(.5, .5, .9, C.white, 0, H + 2.4 + r * .7, 0, 12); f.dome(.62, C.gold, 0, H + 2.85 + r * .7, 0);
    for (let a = .7; a < 5.7; a += .75) f.shrub(Math.sin(a) * (r + .8), Math.cos(a) * (r + .8), .42);
    return H + 4 + r * .7;
  }

  function civic(f, w, d, domeColor = pick([C.roofGreen, C.roofBlue, C.roofTeal])) {
    const H = 7.4;
    for (let s = 0; s < 4; s++) f.box(w + 3.4 - s * .8, .32, d + 3.4 - s * .8, C.stone, 0, .16 + s * .3, 0);
    f.box(w - 1.2, H, d - 2.6, C.cream, 0, 1.2 + H / 2, -.8);
    f.windows(w - 1.2, d - 2.6, 1.4, 2, 3.4, C.white, true, false);
    f.columns(8, w - 2.4, d / 2 - .2, H - .4, 1.2);
    f.box(w, .8, d, C.white, 0, 1.2 + H + .35, 0); f.box(w + .4, .22, d + .4, C.stone, 0, 1.2 + H + .85, 0);
    f.gable(d * .35, w * .72, 2.5, C.white, 0, H + 2.15, d / 2 - d * .18, 1, C.cream);
    const base = H + 2.2, r = Math.min(w, d) * .26;
    f.cyl(r * 1.08, r * 1.12, 2.6, C.cream, 0, base + 1.3, -1, 20);
    for (let a = 0; a < 6.28; a += PI / 6) { f.window(Math.sin(a) * r * 1.09, base + 1.35, -1 + Math.cos(a) * r * 1.09, .55, 1.4, a, C.white, true); f.cyl(.14, .14, 2.4, C.white, Math.sin(a + .26) * r * 1.18, base + 1.3, -1 + Math.cos(a + .26) * r * 1.18, 8) }
    f.cyl(r * 1.25, r * 1.25, .35, C.white, 0, base + 2.75, -1, 20);
    f.dome(r * 1.05, domeColor, 0, base + 2.9, -1, 1.15);
    f.cyl(r * .22, r * .22, 1.3, C.white, 0, base + 2.9 + r * 1.25, -1, 10); f.dome(r * .27, C.gold, 0, base + 3.55 + r * 1.25, -1); f.cyl(.05, .05, 1.4, C.gold, 0, base + 4.4 + r * 1.25, -1, 6);
    return base + 5 + r * 1.3;
  }

  // ---------- landmarks ----------
  function clockTower(f) {
    const stone = 0xd9a45c;
    manor(f, 22, 11, 2, stone, C.roofSlate);
    const x = 14.2;
    f.box(6.4, 28, 6.4, stone, x, 14, 0);
    for (const e of [-3.2, 3.2]) for (const g of [-3.2, 3.2]) { f.box(.8, 30, .8, 0xc08a45, x + e, 15, g); f.cone(.65, 2.8, C.roofSlate, x + e, 30, g, 8) }
    for (let y = 4; y < 22; y += 3.4) for (const [turn, ox, oz] of [[0, 0, 3.2], [PI, 0, -3.2], [PI / 2, 3.2, 0], [-PI / 2, -3.2, 0]]) for (const s of [-1.1, 1.1]) f.window(x + ox + Math.cos(turn) * s, y, oz - Math.sin(turn) * s, .8, 2.2, turn, C.cream, true);
    f.box(7.2, 6, 7.2, stone, x, 25.4, 0); f.box(7.6, .4, 7.6, C.gold, x, 22.4, 0); f.box(7.6, .4, 7.6, C.gold, x, 28.5, 0);
    for (const [turn, ox, oz] of [[0, 0, 3.66], [PI, 0, -3.66], [PI / 2, 3.66, 0], [-PI / 2, -3.66, 0]]) {
      const nx = Math.sin(turn), nz = Math.cos(turn), disc = geo('clock', () => new T.CircleGeometry(.5, 20));
      f.add(disc, C.gold, x + ox, 25.5, oz, 5, 5, 1, 0, turn); f.add(disc, C.white, x + ox + nx * .04, 25.5, oz + nz * .04, 4.4, 4.4, 1, 0, turn);
      f.box(.18, 1.7, .08, C.iron, x + ox + nx * .1, 26.2, oz + nz * .1, turn); f.add(BOX, C.iron, x + ox + nx * .12 + nz * .55, 25.5, oz + nz * .12 - nx * .55, 1.2, .16, .08, 0, turn);
    }
    f.cone(5, 8, C.roofSlate, x, 28.7, 0, 4); f.cyl(.12, .12, 3, C.gold, x, 37.5, 0, 6); f.ball(.4, C.gold, x, 39, 0);
    return 40;
  }

  function stadium(f) {
    const ring = (r0, r1, y0, y1, color, seg = 36) => {
      const g = new T.LatheGeometry([new T.Vector2(r0, y0), new T.Vector2(r1, y1)], seg);
      f.add(g, color, 0, 0, 0, 1.25, 1, 1); f.add(g, color, 0, -.12, 0, 1.25, 1, 1);
      const flip = g.index.array; for (let i = 0; i < flip.length; i += 3) { const t = flip[i]; flip[i] = flip[i + 2]; flip[i + 2] = t } g.computeVertexNormals(); f.add(g, color, 0, 0, 0, 1.25, 1, 1);
    };
    f.cyl(15, 15, .3, C.grass, 0, .15, 0, 36);
    f.box(22, .06, .14, C.white, 0, .33, 0); f.box(.14, .06, 18, C.white, 0, .33, 0); for (const e of [-11, 11]) f.box(.14, .06, 18, C.white, e, .33, 0); for (const e of [-9, 9]) f.box(22, .06, .14, C.white, 0, .33, e);
    const seats = [C.roofBlue, C.roofBlue, C.white, C.roofRed, C.roofRed, C.white];
    seats.forEach((c, i) => { ring(15.2 + i * 1.15, 16.35 + i * 1.15, 1 + i * 1.05, 2.05 + i * 1.05, c); ring(15.2 + i * 1.15, 15.2 + i * 1.15, i * 1.05, 1 + i * 1.05, C.stone) });
    ring(22.6, 22.6, 0, 9, C.white); ring(23, 23, 6.6, 7.9, C.roofRed); ring(22.4, 25, 8.9, 10.2, C.white);
    for (let a = 0; a < 6.28; a += PI / 12) { f.box(.6, 9.4, .6, C.cream, Math.sin(a) * 28.6, 4.7, Math.cos(a) * 22.9); f.window(Math.sin(a + .13) * 28.5, 3.2, Math.cos(a + .13) * 22.8, 2.2, 3.4, a + .13, C.white, true) }
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const x = sx * 25, z = sz * 20; f.cyl(.22, .4, 18, C.darkStone, x, 9, z, 8); f.box(3.2, 1.8, .4, C.iron, x, 18.6, z, Math.atan2(-x, -z)); f.box(2.8, 1.4, .1, 0xfff6c8, x - sx * .25, 18.6, z - sz * .2, Math.atan2(-x, -z), windowGlow) }
    return 20;
  }

  function market(f) {
    f.box(26, .18, 22, C.sand, 0, .09, 0);
    const pagoda = (x, z, w, d, tiers) => {
      f.box(w * .82, .5, d * .82, C.darkStone, x, .35, z);
      for (let t = 0; t < tiers; t++) {
        const k = 1 - t * .2, y = .6 + t * 3.1;
        f.box(w * .7 * k, 2.4, d * .7 * k, t ? C.cream : 0xb23a2e, x, y + 1.2, z);
        for (const s of [-1, 1]) for (const g of [-1, 1]) f.cyl(.14, .14, 2.5, C.roofRed, x + s * w * .42 * k, y + 1.25, z + g * d * .42 * k, 8);
        for (const s of [-.2, .2]) f.window(x + s * w * k, y + 1.25, z + d * .35 * k, .8, 1.3, 0, C.gold);
        f.hip(w * 1.22 * k, d * 1.22 * k, 1.35, C.roofOrange, x, y + 2.4, z); f.box(w * 1.2 * k * .72, .14, d * 1.2 * k * .72, C.roofRed, x, y + 2.5, z);
        for (const s of [-1, 1]) for (const g of [-1, 1]) f.cone(.18, .8, C.gold, x + s * w * .6 * k, y + 2.4, z + g * d * .6 * k, 6);
      }
      f.ball(.28, C.gold, x, .6 + tiers * 3.1 + .9, z);
    };
    pagoda(0, -6, 9, 7, 3); pagoda(-8.5, 2, 5.5, 5.5, 2); pagoda(8.5, 2, 5.5, 5.5, 2);
    for (let i = 0; i < 6; i++) { const x = -7.5 + (i % 3) * 7.5, z = 5.5 + Math.floor(i / 3) * 4; f.box(2.6, .9, 1.4, C.wood, x, .6, z); for (const s of [-1.2, 1.2]) f.box(.1, 2.3, .1, C.wood, x + s, 1.3, z); f.gable(3, 2, .8, [C.roofRed, C.roofBlue, C.roofGreen][i % 3], x, 2.4, z); for (let k = -1; k <= 1; k++) f.ball(.28, [C.roofOrange, C.grass, C.roofRed][(k + i + 3) % 3], x + k * .8, 1.25, z) }
    for (let x = -11; x <= 11; x += 2.75) { f.box(.05, .9, .05, C.iron, x, 3.6, 10.6); f.ball(.3, 0xe5402f, x, 3, 10.6) }
    return 12;
  }

  function fountainGarden(f) {
    f.cyl(11, 11, .22, C.stone, 0, .11, 0, 32);
    f.cyl(5, 5.2, .8, C.cream, 0, .5, 0, 28); f.cyl(4.6, 4.6, .12, C.water, 0, .92, 0, 28);
    f.cyl(.5, .7, 2.2, C.white, 0, 1.8, 0); f.cyl(1.9, 1.2, .35, C.cream, 0, 2.9, 0, 20); f.cyl(1.7, 1.7, .08, C.water, 0, 3.12, 0, 20); f.cyl(.28, .4, 1.4, C.white, 0, 3.8, 0); f.cone(.35, 1.8, 0xcdeffc, 0, 4.4, 0, 10);
    for (let a = 0; a < 6.28; a += PI / 6) { const x = Math.sin(a) * 8.4, z = Math.cos(a) * 8.4; f.cyl(.9, .75, .7, C.terracotta, x, .55, z, 10); f.ball(.85, C.leaf, x, 1.4, z); for (let k = 0; k < 4; k++) f.ball(.18, [0xff6f91, 0xffd23f, 0xb98cff][(k + Math.round(a * 2)) % 3], x + Math.cos(k * 1.6) * .6, 1.75, z + Math.sin(k * 1.6) * .6) }
    return 6;
  }

  // the wheel turns, so it is its own object rather than part of the merged scenery
  function ferrisWheel(x, z, ry, tick) {
    const f = frame(x, z, ry, 0), Rw = 15, hub = 18;
    for (const e of [-1.6, 1.6]) for (const s of [-1, 1]) f.add(BOX, C.white, s * 4.5, hub / 2, e, .55, Math.hypot(hub, 9), .55, 0, 0, s * Math.atan2(9, hub));
    f.box(14, .5, 6, C.darkStone, 0, .25, 0); f.add(geo('axle', () => new T.CylinderGeometry(.5, .5, 4, 12)), C.gold, 0, hub, 0, 1, 1, 1, PI / 2);
    const wheel = new T.Group(); wheel.position.set(x, hub, z); wheel.rotation.order = 'YXZ'; wheel.rotation.y = ry; wheel.userData.noCull = true;
    const white = new T.MeshStandardMaterial({color: 0xf4f1ea, roughness: .4, metalness: .3}), parts = [];
    for (const e of [-1, 1]) {
      for (const r of [Rw, Rw * .62]) { const t = new T.TorusGeometry(r, .16, 6, 48); t.translate(0, 0, e); parts.push(t) }
      for (let i = 0; i < 16; i++) { const s = new T.BoxGeometry(.14, Rw, .14); s.translate(0, Rw / 2, e); s.rotateZ(i / 16 * PI * 2); parts.push(s) }
    }
    wheel.add(new T.Mesh(mergeGeometries(parts), white));
    const cars = [], tub = new T.CylinderGeometry(1.15, .85, 1.4, 10), cap = new T.ConeGeometry(1.35, .8, 10);
    const mats = [0xe5484d, 0xf5b83d, 0x37a6e6, 0x42b883, 0x9b6ad6, 0xf2789f].map(c => new T.MeshStandardMaterial({color: c, roughness: .45}));
    for (let i = 0; i < 12; i++) { const c = new T.Group(), a = new T.Mesh(tub, mats[i % 6]), b = new T.Mesh(cap, mats[(i + 3) % 6]); a.position.y = -1.7; b.position.y = -.35; c.add(a, b); wheel.add(c); cars.push([c, i / 12 * PI * 2]) }
    scene.add(wheel);
    let turn = 0;
    tick.push(dt => { turn += dt * .09; wheel.rotation.z = turn; for (const [c, a] of cars) { c.position.set(Math.cos(a) * Rw, Math.sin(a) * Rw, 0); c.rotation.z = -turn } });
  }

  // a brand-new building standing on an old shop plot (stays inside the plot's collision box)
  let plot = 0;
  function newBlock(L) {
    const f = frame(L.x, L.z, L.front > 0 ? 0 : PI, .25), kind = plot++ % 4, floors = Math.max(2, Math.min(5, L.floors));
    if (kind === 1 && L.w >= 16) manor(f, L.w - 2.8, L.d - 4.5, Math.min(3, floors));
    else if (kind === 2) { const side = Math.min(L.w / 2 - .4, L.d - 2); if (side >= 7) { for (const s of [-1, 1]) roundHall(frame(L.x + s * L.w / 4 * (L.front > 0 ? 1 : -1), L.z, L.front > 0 ? 0 : PI, .25), side, side, floors) } else townhouses(f, L.w - .4, L.d - 2.2, 3) }
    else if (kind === 3) apartments(f, L.w - 1.2, L.d - 1.8, floors);
    else townhouses(f, L.w - .4, L.d - 2.2, Math.max(3, Math.min(4, floors)));
    f.box(L.w, .08, L.d, C.stone, 0, .04, 0);
    for (const s of [-1, 1]) { const x = s * (L.w / 2 - .8), z = L.d / 2 - .5; f.cyl(.42, .32, .6, C.terracotta, x, .35, z, 10); f.ball(.55, C.leaf, x, 1.05, z) }
  }

  // extra architecture on top of the old-city shop blocks, which keep their shops and signs
  function oldCity(L) {
    const f = frame(L.x, L.z, L.front > 0 ? 0 : PI, 0), w = L.w, d = L.d, H = L.H, roof = pick([C.roofRed, C.roofRed, C.roofBlue, C.roofGreen, C.roofSlate, C.roofOrange]), wall = pick([C.cream, C.sand, C.rose, C.brick, C.white]), trim = C.cream;
    f.box(w + .7, .5, d + .7, trim, 0, H + .15, 0); f.box(w + .35, .22, d + .35, trim, 0, 4.4, 0);
    // round corner pillars soften the square shop blocks, with a curved bay above the shop front
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) { f.cyl(.62, .62, H - 4.2, wall, x, 4.4 + (H - 4.4) / 2, z, 14); for (let y = 7.4; y < H; y += 3.2) f.cyl(.74, .74, .2, trim, x, y, z, 14); f.dome(.74, roof, x, H + .35, z, 1.1) }
    if (w >= 10 && H > 9) { const r = 1.8, bz = d / 2 - .9, bh = H - 7.2; f.cyl(r, r, bh, wall, 0, 7.2 + bh / 2, bz, 20);
      for (let y = 7.2; y < H - 1; y += 3.2) { for (const a of [-.65, 0, .65]) f.window(Math.sin(a) * r, y + 1.6, bz + Math.cos(a) * r, .7, 1.7, a, trim); f.cyl(r + .22, r + .22, .22, trim, 0, y, bz, 20) }
      f.cyl(r + .25, r + .25, .3, trim, 0, H + .1, bz, 20); f.cone(r + .3, 2.2, roof, 0, H + .2, bz, 20) }
    const style = Math.floor(R() * 4), rise = Math.min(4.2, d * .36);
    if (style === 0) { // steep ridge roof with dormers
      f.gable(w + .8, d + .8, rise, roof, 0, H + .4, 0, 0, wall);
      for (let x = -w / 2 + 2; x <= w / 2 - 1.8; x += 3.4) f.dormer(x, H + .6, d / 2 - .8, 0, roof, wall);
      for (const x of [-w * .3, w * .3]) f.chimney(x, H + .4 + rise * .4, -d * .2);
    } else if (style === 1) { // row of front gables
      const n = Math.max(2, Math.round(w / 6)), bw = w / n;
      for (let i = 0; i < n; i++) { const x = -w / 2 + (i + .5) * bw, c = pick([roof, roof, C.roofSlate]); f.gable(d + .6, bw + .1, bw * .55, c, x, H + .4, 0, 1, wall); f.window(x, H + .4 + bw * .17, d / 2 + .05, .9, .9, 0, trim, true) }
      f.chimney(w * .35, H + 1.2, -d * .3);
    } else if (style === 2) { // mansard with corner turrets
      f.hip(w + .6, d + .6, rise * .8, roof, 0, H + .4, 0);
      for (const x of [-w / 2, w / 2]) { f.cyl(1.2, 1.2, 3.4, wall, x, H + 1.4, d / 2, 10); f.window(x, H + 1.5, d / 2 + 1.2, .7, 1.4, 0, trim, true); f.cyl(1.45, 1.45, .3, trim, x, H + 3.2, d / 2, 10); f.cone(1.55, 3, roof, x, H + 3.3, d / 2, 10); f.ball(.16, C.gold, x, H + 6.4, d / 2) }
      for (let x = -w / 2 + 3.2; x <= w / 2 - 3; x += 3.2) f.dormer(x, H + .55, d / 2 - .5, 0, roof, wall);
    } else { // domed corner house with a roof garden
      for (const [lx, lz, ww, dd] of [[0, d / 2, w, .2], [0, -d / 2, w, .2], [w / 2, 0, .2, d], [-w / 2, 0, .2, d]]) f.box(ww, .9, dd, trim, lx, H + .85, lz);
      const r = Math.min(3, d * .28);
      f.cyl(r, r, 2.2, wall, 0, H + 1.5, d * .12, 16); for (let a = 0; a < 6.2; a += PI / 4) f.window(Math.sin(a) * r, H + 1.5, d * .12 + Math.cos(a) * r, .6, 1.2, a, trim, true);
      f.cyl(r + .25, r + .25, .3, trim, 0, H + 2.75, d * .12, 16); f.dome(r, roof, 0, H + 2.85, d * .12, 1.1); f.cyl(.07, .07, 1.2, C.gold, 0, H + 3.4 + r, d * .12, 6);
      for (let i = 0; i < 8; i++) f.ball(.5 + R() * .3, C.leaf, rnd(-w / 2 + 1, w / 2 - 1), H + .85, rnd(-d / 2 + 1, -d * .15));
    }
  }

  function flush() {
    for (const b of bins.values()) {
      const g = mergeGeometries(b.list, false); if (!g) continue;
      g.computeBoundingSphere();
      const m = new T.Mesh(g, b.mat); m.castShadow = b.mat === paint; m.receiveShadow = true; m.matrixAutoUpdate = false; m.userData.kit = true; scene.add(m);
    }
    bins.clear();
  }

  return {frame, roundHall, house, townhouses, manor, apartments, civic, clockTower, stadium, market, fountainGarden, ferrisWheel, oldCity, newBlock, flush, glass, pick};
}
