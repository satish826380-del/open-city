// Realistic-looking street trees for low-end GPUs: a tapered, slightly bent trunk with branches,
// and a crown made of crossed leaf "cards" (alpha-cut leaf-cluster textures) with spherical normals
// so the crown shades softly like real foliage. Three species: neem (green), gulmohar
// (green with orange-red flowers) and jacaranda (purple). Each species is one instanced mesh.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const PI = Math.PI;
let RND = Math.random;

function leafTexture(leaf, flower, flowerShare) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const n = 520;
  for (let i = 0; i < n; i++) {
    const a = RND() * PI * 2, r = Math.pow(RND(), .6) * 118, px = 128 + Math.cos(a) * r, py = 128 + Math.sin(a) * r;
    const isF = flower && RND() < flowerShare, col = isF ? flower[Math.floor(RND() * flower.length)] : leaf[Math.floor(RND() * leaf.length)];
    const shade = .7 + (1 - r / 118) * .35 + (py < 128 ? .08 : -.05);
    x.save(); x.translate(px, py); x.rotate(RND() * PI * 2); x.fillStyle = col; x.globalAlpha = 1;
    x.filter = `brightness(${shade.toFixed(2)})`;
    if (isF) { x.beginPath(); x.arc(0, 0, 4 + RND() * 3, 0, 7); x.fill() }
    else { x.beginPath(); x.ellipse(0, 0, 7 + RND() * 5, 3 + RND() * 2, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(20,40,10,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-7, 0); x.lineTo(7, 0); x.stroke() }
    x.restore();
  }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}

const SPECIES = {
  neem: {leaf: ['#3f7a2e', '#4f8f36', '#2f6526', '#5e9a3c', '#6ea844'], flower: null, share: 0, spread: 1, height: 1, bark: 0x5b4330},
  gulmohar: {leaf: ['#3f7a2e', '#4f8f36', '#5e9a3c'], flower: ['#e8452a', '#f2662f', '#d8321e', '#f5823a'], share: .45, spread: 1.35, height: .85, bark: 0x5a4434},
  jacaranda: {leaf: ['#5e8a3a', '#4f7a30'], flower: ['#9b6fd6', '#8a5fc8', '#b088e8', '#7a55b8'], share: .75, spread: 1.15, height: .95, bark: 0x6a5444},
};

function trunkGeo(sp) {
  const parts = [], H = 3.4 * sp.height;
  // trunk in three slightly offset segments (a gentle bend)
  let x = 0, z = 0, y = 0;
  for (let i = 0; i < 3; i++) { const h = H / 3, r0 = .3 - i * .07, r1 = .3 - (i + 1) * .07, g = new T.CylinderGeometry(r1, r0, h, 8); const nx = x + (RND() - .5) * .25, nz = z + (RND() - .5) * .25;
    g.translate(0, h / 2, 0); g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler((nz - z) / h, 0, -(nx - x) / h))); g.translate(x, y, z); parts.push(g); x = nx; z = nz; y += h }
  const tips = [];
  for (let i = 0; i < 4; i++) {                                      // branches fanning out of the trunk top
    const a = i / 4 * PI * 2 + RND() * .6, tilt = .7 + RND() * .35, L = (1.6 + RND() * .9) * sp.spread, g = new T.CylinderGeometry(.06, .13, L, 6);
    g.translate(0, L / 2, 0); g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt))); g.translate(x, y - .4, z); parts.push(g);
    tips.push([x + Math.cos(a) * Math.sin(tilt) * L, y - .4 + Math.cos(tilt) * L, z + Math.sin(a) * Math.sin(tilt) * L]);
  }
  tips.push([x, y + .9 * sp.height, z]);
  const g = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p), false);
  return {g, tips, top: [x, y, z]};
}

function crownGeo(sp, tips, top) {
  const cards = [], cy = top[1] + 1.2 * sp.height, cx = top[0], cz = top[2];
  const clusters = tips.concat([[cx + .9, cy + .3, cz], [cx - .9, cy + .4, cz + .3], [cx, cy + 1.1, cz - .6]]);
  for (const [px, py, pz] of clusters) {
    const s = (2.3 + RND() * .9) * (sp.spread > 1.2 ? 1.15 : 1);
    for (let k = 0; k < 3; k++) { const g = new T.PlaneGeometry(s * 1.15, s); g.rotateY(k / 3 * PI + RND() * .3); g.rotateX((RND() - .5) * .5); if (k === 2) g.rotateX(PI / 2.4); g.translate(px, py + s * .1, pz); cards.push(g.toNonIndexed()) }
  }
  const g = mergeGeometries(cards, false);
  // spherical normals around the crown centre: soft, volumetric shading
  const p = g.attributes.position, nrm = g.attributes.normal, c = new T.Vector3(cx, cy - .3, cz), v = new T.Vector3();
  for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)).sub(c).normalize(); v.y = v.y * .8 + .25; v.normalize(); nrm.setXYZ(i, v.x, v.y, v.z) }
  return g;
}

// list: [x, y, z, scale]; opts.species(i) -> 'neem' | 'gulmohar' | 'jacaranda'; opts.onTree(x, z, s) for colliders
export function makeTrees(scene, list, opts = {}) {
  if (opts.rnd) RND = opts.rnd;
  const groups = {neem: [], gulmohar: [], jacaranda: []};
  list.forEach((t, i) => { const r = RND(); const s = opts.species ? opts.species(i) : (r < .16 ? 'gulmohar' : r < .3 ? 'jacaranda' : 'neem'); groups[s].push(t); if (opts.onTree) opts.onTree(t[0], t[2], t[3]) });
  const o = new T.Object3D();
  for (const [name, items] of Object.entries(groups)) {
    if (!items.length) continue;
    const sp = SPECIES[name];
    // two shape variants per species so neighbouring trees differ
    for (let v = 0; v < 2; v++) {
      const sub = items.filter((_, i) => i % 2 === v); if (!sub.length) continue;
      const {g: tg, tips, top} = trunkGeo(sp), cg = crownGeo(sp, tips, top);
      const tex = leafTexture(sp.leaf, sp.flower, sp.share);
      const leafM = new T.MeshStandardMaterial({map: tex, alphaTest: .42, side: T.DoubleSide, roughness: .85});
      const depth = new T.MeshDepthMaterial({depthPacking: T.RGBADepthPacking, map: tex, alphaTest: .42});
      const tI = new T.InstancedMesh(tg, new T.MeshStandardMaterial({color: sp.bark, roughness: .95}), sub.length), cI = new T.InstancedMesh(cg, leafM, sub.length);
      cI.customDepthMaterial = depth;
      sub.forEach(([x, y, z, s], i) => { o.position.set(x, y, z); o.rotation.set(0, RND() * PI * 2, 0); o.scale.set(s, s * (.9 + RND() * .25), s); o.updateMatrix(); tI.setMatrixAt(i, o.matrix); cI.setMatrixAt(i, o.matrix);
        const c = new T.Color().setHSL(0, 0, .85 + RND() * .3); c.r *= .95 + RND() * .1; cI.setColorAt(i, c) });
      tI.castShadow = cI.castShadow = true; cI.receiveShadow = true; scene.add(tI, cI);
    }
  }
}
