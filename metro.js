// Startup City Metro: 4 stainless-steel coaches with see-through tinted windows, livery stripes, doors with windows,
// roof AC units, side skirts, gangway bellows between coaches, detailed bogies, a shaped driver's cab with a raked
// windscreen, LED destination board and headlight strips, and a lit interior (benches, poles, grab handles,
// light strips, startup ad panels) with seated and standing passengers.
import * as T from 'three';

const PI = Math.PI;
export const COACH_LEN = 19, COACH_GAP = 19.6, COACHES = 4, FLOOR_Y = .82;

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t }
const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath() };
// coach side: brushed steel, teal/blue livery band + magenta accent, rounded windows (transparent), doors with windows
function sideTexture(k) {
  return canvasTex(2048, 320, (x, W, H) => {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f1f4f6'); g.addColorStop(.45, '#d5dbe0'); g.addColorStop(1, '#b4bcc3'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < W; i += 5) { x.fillStyle = `rgba(255,255,255,${.03 + (i % 15 === 0 ? .04 : 0)})`; x.fillRect(i, 0, 2, H) }            // brushed steel
    x.fillStyle = '#0f7c86'; x.fillRect(0, 226, W, 34); x.fillStyle = '#1e5fa8'; x.fillRect(0, 260, W, 14); x.fillStyle = '#d4207f'; x.fillRect(0, 276, W, 8);
    x.fillStyle = '#0f7c86'; x.fillRect(0, 22, W, 8);                                                                                          // roof line
    const doors = [300, 940, 1580];
    // windows: rounded, black frame, transparent glass area
    for (let wx = 40; wx < W - 120; wx += 118) { if (doors.some(d => wx + 104 > d - 14 && wx < d + 184)) continue;
      x.fillStyle = '#20262d'; rr(x, wx - 6, 52, 108, 128, 16); x.fill(); x.save(); x.globalCompositeOperation = 'destination-out'; rr(x, wx, 58, 96, 116, 12); x.fill(); x.restore() }
    for (const d of doors) {
      x.fillStyle = '#9aa4ad'; x.fillRect(d, 40, 170, 236); x.fillStyle = '#7b858e'; x.fillRect(d + 84, 40, 3, 236);
      x.fillStyle = '#f2c21f'; x.fillRect(d - 6, 40, 6, 236); x.fillRect(d + 170, 40, 6, 236);                                           // yellow door edges
      for (const o of [14, 100]) { x.fillStyle = '#20262d'; rr(x, d + o - 4, 58, 64, 112, 10); x.fill(); x.save(); x.globalCompositeOperation = 'destination-out'; rr(x, d + o, 62, 56, 104, 8); x.fill(); x.restore() }
      x.fillStyle = '#ffffff'; x.font = '700 18px sans-serif'; x.textAlign = 'center'; x.fillText('◄ ►', d + 86, 200) }
    // logo + coach number
    x.textAlign = 'left'; x.fillStyle = '#ffffff'; x.font = '900 26px sans-serif'; x.fillText('STARTUP CITY METRO', 560, 252);
    x.beginPath(); x.arc(530, 243, 16, 0, 7); x.fillStyle = '#ffd21f'; x.fill(); x.fillStyle = '#0f7c86'; x.font = '900 20px sans-serif'; x.fillText('M', 520, 250);
    x.fillStyle = '#41484f'; x.font = '700 18px sans-serif'; x.fillText('C' + (k + 1) + ' · 2026', 1830, 214);
  });
}
function ledTexture(txt) {
  return canvasTex(512, 64, (x, W, H) => { x.fillStyle = '#0c0600'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffa21a'; x.font = '800 38px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, W / 2, H / 2 + 2);
    x.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < W; i += 4) x.fillRect(i, 0, 1, H); for (let j = 0; j < H; j += 4) x.fillRect(0, j, W, 1) });
}
const ADS = [['Your startup here', '#ffd21f', '#141414'], ['Hiring? Post in the Jobs app', '#2ecc71', '#0d2a1a'], ['Pitch Night · Startup Café', '#ff8a2a', '#2a1406'], ['Find your co-founder', '#37b6ff', '#081c2c']];
function adTexture(i) { const [t, fg, bg] = ADS[i % ADS.length]; return canvasTex(512, 128, (x, W, H) => { x.fillStyle = bg; x.fillRect(0, 0, W, H); x.fillStyle = fg; x.fillRect(0, 0, 10, H); x.font = '800 40px sans-serif'; x.textBaseline = 'middle'; x.fillText(t, 30, H / 2 - 8); x.fillStyle = 'rgba(255,255,255,.6)'; x.font = '600 20px sans-serif'; x.fillText('STARTUP CITY', 30, H - 22) }) }

// builds the metro into `group`; returns seat slots (local coordinates) for passengers and the player
export function buildMetro(group, makePerson, posePerson) {
  group.clear();
  const M = (o) => new T.MeshStandardMaterial(o);
  const steel = M({color: 0xd6dce1, metalness: .75, roughness: .28}), dark = M({color: 0x24272b, roughness: .7}), black = M({color: 0x121416, roughness: .6, metalness: .3});
  const inner = M({color: 0xeef1f3, roughness: .6, side: T.DoubleSide}), floorM = M({color: 0x4f565e, roughness: .85}), stripY = M({color: 0xf2c21f, roughness: .5});
  const seatM = M({color: 0x1f6fb8, roughness: .5}), seatM2 = M({color: 0x0f7c86, roughness: .5}), poleM = M({color: 0xf2c21f, metalness: .6, roughness: .3});
  const lightM = M({color: 0xffffff, emissive: 0xfff6e0, emissiveIntensity: 1.6}), teal = M({color: 0x0f7c86, roughness: .45, metalness: .2}), blue = M({color: 0x1e5fa8, roughness: .45});
  const glass = M({color: 0x7fa6b8, transparent: true, opacity: .22, roughness: .04, metalness: .4, depthWrite: false}), wind = M({color: 0x0b1218, metalness: .4, roughness: .06});
  const headM = M({color: 0xffffff, emissive: 0xfff3d0, emissiveIntensity: 1.4}), tailM = M({color: 0x550000, emissive: 0xff2a2a, emissiveIntensity: .9}), bellowM = M({color: 0x1b1d20, roughness: .95});
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, parent = group) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o };
  const W = 3.2, H = 2.9, L = COACH_LEN, seats = [];
  const wheelG = new T.CylinderGeometry(.42, .42, .14, 20), discG = new T.CylinderGeometry(.3, .3, .05, 16);
  for (let k = 0; k < COACHES; k++) {
    const z0 = (k - (COACHES - 1) / 2) * COACH_GAP, c = new T.Group(); c.position.z = z0; group.add(c);
    const side = M({map: sideTexture(k), alphaTest: .5, side: T.DoubleSide, metalness: .55, roughness: .32});
    for (const s of [-1, 1]) {
      add(new T.PlaneGeometry(L, H), side, s * W / 2, FLOOR_Y + H / 2, 0, 0, s * PI / 2, 0, c);                                         // body side (windows cut out)
      add(new T.PlaneGeometry(L - .2, H * .42), glass, s * (W / 2 + .012), FLOOR_Y + H * .61, 0, 0, s * PI / 2, 0, c);                   // tinted glass over the window band
      add(new T.BoxGeometry(.1, .5, L - .4), teal, s * (W / 2 - .02), FLOOR_Y - .32, 0, 0, 0, 0, c);                                      // side skirt
      add(new T.BoxGeometry(.08, .06, L), steel, s * (W / 2 + .02), FLOOR_Y + H - .02, 0, 0, 0, 0, c);                                  // rain gutter
    }
    const roof = add(new T.CylinderGeometry(W / 2, W / 2, L, 24, 1, false, -PI / 2, PI), steel, 0, FLOOR_Y + H, 0, -PI / 2, 0, 0, c); roof.scale.set(1, 1, .32);
    for (const az of [-5.5, 5.5]) { add(new T.BoxGeometry(1.9, .32, 3.2), steel, 0, FLOOR_Y + H + .58, az, 0, 0, 0, c); for (let g = -1; g <= 1; g++) add(new T.BoxGeometry(1.5, .02, .12), dark, 0, FLOOR_Y + H + .75, az + g * .9, 0, 0, 0, c) } // roof AC units
    add(new T.BoxGeometry(W, .12, L), floorM, 0, FLOOR_Y, 0, 0, 0, 0, c); add(new T.BoxGeometry(W - .3, .55, L - 1.2), dark, 0, FLOOR_Y - .36, 0, 0, 0, 0, c);
    for (const dz of [-6.35, 0, 6.35]) for (const s of [-1, 1]) add(new T.BoxGeometry(.5, .012, 1.6), stripY, s * (W / 2 - .35), FLOOR_Y + .065, dz, 0, 0, 0, c); // yellow floor strips at the doors
    // bogies: frame, wheels with brake discs, springs
    for (const bz of [-6.6, 6.6]) { add(new T.BoxGeometry(2.3, .35, 3), black, 0, .62, bz, 0, 0, 0, c);
      for (const s of [-1, 1]) { add(new T.BoxGeometry(.12, .28, 3.2), dark, s * 1.05, .48, bz, 0, 0, 0, c); for (const wz of [-.85, .85]) { add(wheelG, steel, s * .78, .42, bz + wz, 0, 0, PI / 2, c); add(discG, dark, s * .66, .42, bz + wz, 0, 0, PI / 2, c); add(new T.CylinderGeometry(.08, .08, .3, 8), poleM, s * .95, .72, bz + wz * .5, 0, 0, 0, c) } } }
    // interior: two-tone benches along both walls, poles, grab rails + handles, light strips, ad panels
    for (const s of [-1, 1]) for (const [a, b] of [[-8.6, -3.6], [-1.6, 1.6], [3.6, 8.6]]) {
      add(new T.BoxGeometry(.5, .1, b - a), seatM, s * (W / 2 - .38), FLOOR_Y + .48, (a + b) / 2, 0, 0, 0, c); add(new T.BoxGeometry(.08, .5, b - a), seatM2, s * (W / 2 - .12), FLOOR_Y + .78, (a + b) / 2, 0, 0, 0, c);
      add(new T.BoxGeometry(.4, .42, b - a), inner, s * (W / 2 - .38), FLOOR_Y + .22, (a + b) / 2, 0, 0, 0, c);
      for (let z = a + .4; z < b; z += .7) seats.push({k, x: s * (W / 2 - .55), y: FLOOR_Y + .53, z: z0 + z, ry: s > 0 ? -PI / 2 : PI / 2});
    }
    for (const z of [-5.5, -2.6, 2.6, 5.5]) add(new T.CylinderGeometry(.03, .03, H, 8), poleM, 0, FLOOR_Y + H / 2, z, 0, 0, 0, c);
    for (const s of [-1, 1]) { add(new T.CylinderGeometry(.025, .025, L - 1, 6), steel, s * .55, FLOOR_Y + H - .35, 0, PI / 2, 0, 0, c); for (let z = -8; z <= 8; z += 1.1) add(new T.TorusGeometry(.07, .015, 5, 10), poleM, s * .55, FLOOR_Y + H - .5, z, 0, PI / 2, 0, c) }
    for (const s of [-1, 1]) add(new T.BoxGeometry(.2, .05, L - 2), lightM, s * .9, FLOOR_Y + H - .02, 0, 0, 0, 0, c);
    for (const s of [-1, 1]) for (const [i, az] of [[0, -6.1], [1, 0], [2, 6.1]]) { const ad = new T.Mesh(new T.PlaneGeometry(1.9, .45), M({map: adTexture(i + k + (s > 0 ? 1 : 0)), roughness: .5})); ad.position.set(s * (W / 2 - .06), FLOOR_Y + H - .4, az); ad.rotation.y = -s * PI / 2; c.add(ad) }
    // ends: gangway (with bellows to the next coach) or a driver's cab
    for (const e of [-1, 1]) {
      const outer = (k === 0 && e < 0) || (k === COACHES - 1 && e > 0), ez = e * L / 2;
      if (!outer) { add(new T.BoxGeometry(W, H, .08), inner, 0, FLOOR_Y + H / 2, ez, 0, 0, 0, c); add(new T.BoxGeometry(1.1, 2.2, .1), dark, 0, FLOOR_Y + 1.1, ez, 0, 0, 0, c);
        if (e > 0) { const gap = COACH_GAP - L; add(new T.BoxGeometry(2.1, 2.5, gap + .1), bellowM, 0, FLOOR_Y + 1.25, ez + gap / 2, 0, 0, 0, c); for (let r = 0; r < 4; r++) add(new T.BoxGeometry(2.2, 2.6, .04), dark, 0, FLOOR_Y + 1.25, ez + (r + .5) * gap / 4, 0, 0, 0, c) }
        continue }
      const cab = new T.Group(); cab.position.z = ez; if (e < 0) cab.rotation.y = PI; c.add(cab);
      add(new T.BoxGeometry(W, H * .5, 1.2), teal, 0, FLOOR_Y + H * .25, .6, 0, 0, 0, cab);                                               // lower front in livery colour
      add(new T.BoxGeometry(W - .1, .16, 1.3), blue, 0, FLOOR_Y + H * .5 + .02, .62, 0, 0, 0, cab);
      const nose = add(new T.CylinderGeometry(W / 2, W / 2, 1.1, 24, 1, false, 0, PI), teal, 0, FLOOR_Y + H * .25, 1.2, 0, 0, PI / 2, cab); nose.scale.set(.42, 1, 1); nose.rotation.set(0, PI / 2, PI / 2);
      add(new T.BoxGeometry(W - .2, H * .48, .1), wind, 0, FLOOR_Y + H * .74, .82, -.32, 0, 0, cab);                                  // raked windscreen
      add(new T.BoxGeometry(W, .12, 1.0), steel, 0, FLOOR_Y + H - .02, .45, 0, 0, 0, cab);
      const led = new T.Mesh(new T.PlaneGeometry(1.8, .26), M({map: ledTexture('CITY JUNCTION'), emissive: 0xffffff, emissiveMap: ledTexture('CITY JUNCTION'), emissiveIntensity: 1.2})); led.position.set(0, FLOOR_Y + H - .2, .97); cab.add(led);
      for (const s of [-1, 1]) { add(new T.BoxGeometry(.7, .09, .05), headM, s * 1.0, FLOOR_Y + .78, 1.66, 0, 0, 0, cab); add(new T.BoxGeometry(.18, .09, .05), tailM, s * 1.42, FLOOR_Y + .78, 1.62, 0, 0, 0, cab) }
      add(new T.BoxGeometry(.5, .32, .5), black, 0, FLOOR_Y - .2, 1.55, 0, 0, 0, cab);                                                   // coupler
      const lg = new T.Mesh(new T.CircleGeometry(.2, 20), M({color: 0xffd21f, roughness: .4})); lg.position.set(0, FLOOR_Y + 1.18, 1.62); cab.add(lg);
    }
    if (k === 1) { const pg = new T.Group(); pg.position.set(0, FLOOR_Y + H + .55, 0); c.add(pg);                         // pantograph
      add(new T.BoxGeometry(1.2, .12, .9), black, 0, 0, 0, 0, 0, 0, pg);
      for (const s of [-1, 1]) add(new T.BoxGeometry(.05, .05, 1.6), dark, 0, .45, s * .32, s * .9, 0, 0, pg);
      add(new T.BoxGeometry(1.9, .05, .1), steel, 0, .88, 0, 0, 0, 0, pg) }
  }
  // passengers: a few seated in every coach, one or two standing at the poles
  const people = [];
  const taken = new Set();
  seats.forEach((s, i) => { if (s.k === 1 && Math.abs(s.z - (1 - (COACHES - 1) / 2) * COACH_GAP) < 1.2 && s.x < 0) s.reserved = true });
  for (let i = 0; i < seats.length; i++) { const s = seats[i]; if (s.reserved || Math.random() > .3 || taken.has(i - 1)) continue; taken.add(i);
    const p = makePerson(); p.position.set(s.x, s.y - .53, s.z); p.rotation.y = s.ry; group.add(p); posePerson(p, 'sit'); people.push(p) }
  for (let k = 0; k < COACHES; k++) for (const z of [-2.6, 5.5]) { if (Math.random() < .35) continue; const p = makePerson(); p.position.set(.35, FLOOR_Y + .02, (k - (COACHES - 1) / 2) * COACH_GAP + z + .3); p.rotation.y = Math.random() * PI * 2; group.add(p); posePerson(p); people.push(p) }
  const mine = seats.find(s => s.reserved) || seats[0];
  return {seat: mine, people};
}
