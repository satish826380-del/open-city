// Navapur Metro: 4 stainless-steel coaches with see-through windows, a rounded cab, sliding-door
// panels, blue/magenta livery, a pantograph, and a lit interior (longitudinal benches, grab poles,
// handles, ceiling light strips) with seated and standing passengers.
import * as T from 'three';

const PI = Math.PI;
export const COACH_LEN = 19, COACH_GAP = 19.6, COACHES = 4, FLOOR_Y = .82;

function sideTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, '#e9edf0'); g.addColorStop(.5, '#c9d0d6'); g.addColorStop(1, '#aeb6bd'); x.fillStyle = g; x.fillRect(0, 0, 1024, 160);
  for (let i = 0; i < 1024; i += 6) { x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(i, 0, 2, 160) }        // brushed steel
  x.fillStyle = '#1e5fa8'; x.fillRect(0, 118, 1024, 12); x.fillStyle = '#c2187a'; x.fillRect(0, 132, 1024, 6);
  const doors = [150, 470, 790];
  for (const d of doors) { x.fillStyle = '#8f99a3'; x.fillRect(d, 18, 84, 124); x.fillStyle = '#6d7780'; x.fillRect(d + 41, 18, 2, 124);
    x.clearRect(d + 10, 26, 26, 50); x.clearRect(d + 48, 26, 26, 50); x.fillStyle = '#f2c21f'; x.fillRect(d, 140, 84, 4) }
  for (let wx = 20; wx < 1010; wx += 56) { if (doors.some(d => wx + 46 > d - 6 && wx < d + 90)) continue; x.clearRect(wx, 30, 44, 56); x.strokeStyle = '#3a4048'; x.lineWidth = 3; x.strokeRect(wx - 1.5, 28.5, 47, 59) }
  x.fillStyle = '#1e3f78'; x.font = '800 20px sans-serif'; x.fillText('NAVAPUR METRO  ·  नवापुर मेट्रो', 300, 112);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
function ledTexture(txt) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48; const x = c.getContext('2d'); x.fillStyle = '#120800'; x.fillRect(0, 0, 256, 48);
  x.fillStyle = '#ff9a1a'; x.font = '800 26px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 25);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

// builds the metro into `group`; returns seat slots (local coordinates) for passengers and the player
export function buildMetro(group, makePerson, posePerson) {
  group.clear();
  const steel = new T.MeshStandardMaterial({color: 0xcfd5da, metalness: .7, roughness: .3}), dark = new T.MeshStandardMaterial({color: 0x2a2d31, roughness: .7});
  const side = new T.MeshStandardMaterial({map: sideTexture(), alphaTest: .5, side: T.DoubleSide, metalness: .55, roughness: .35});
  const inner = new T.MeshStandardMaterial({color: 0xe8ecee, roughness: .6, side: T.DoubleSide}), floorM = new T.MeshStandardMaterial({color: 0x5a6068, roughness: .8});
  const seatM = new T.MeshStandardMaterial({color: 0x2c5fa8, roughness: .5}), poleM = new T.MeshStandardMaterial({color: 0xf2c21f, metalness: .6, roughness: .3});
  const lightM = new T.MeshStandardMaterial({color: 0xffffff, emissive: 0xfff6e0, emissiveIntensity: 1.6}), glassM = new T.MeshStandardMaterial({color: 0x0d151c, metalness: .3, roughness: .05});
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, parent = group) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o };
  const W = 3.2, H = 2.9, L = COACH_LEN, seats = [];
  for (let k = 0; k < COACHES; k++) {
    const z0 = (k - (COACHES - 1) / 2) * COACH_GAP, c = new T.Group(); c.position.z = z0; group.add(c);
    for (const s of [-1, 1]) add(new T.PlaneGeometry(L, H), side, s * W / 2, FLOOR_Y + H / 2, 0, 0, s * PI / 2, 0, c);       // see-through sides
    const roof = add(new T.CylinderGeometry(W / 2, W / 2, L, 20, 1, false, -PI / 2, PI), steel, 0, FLOOR_Y + H, 0, -PI / 2, 0, 0, c); roof.scale.set(1, 1, .32);
    add(new T.BoxGeometry(W, .12, L), floorM, 0, FLOOR_Y, 0, 0, 0, 0, c); add(new T.BoxGeometry(W - .2, .6, L - 1), dark, 0, FLOOR_Y - .38, 0, 0, 0, 0, c);
    for (const bz of [-6.6, 6.6]) { add(new T.BoxGeometry(2.4, .5, 2.8), dark, 0, .5, bz, 0, 0, 0, c); for (const s of [-1, 1]) for (const wz of [-.8, .8]) add(new T.CylinderGeometry(.42, .42, .14, 16), steel, s * .78, .45, bz + wz, 0, 0, PI / 2, c) }
    // interior: benches along both walls, poles, grab rail, light strips
    for (const s of [-1, 1]) for (const [a, b] of [[-8.6, -3.6], [-1.6, 1.6], [3.6, 8.6]]) {
      add(new T.BoxGeometry(.5, .1, b - a), seatM, s * (W / 2 - .38), FLOOR_Y + .48, (a + b) / 2, 0, 0, 0, c); add(new T.BoxGeometry(.08, .5, b - a), seatM, s * (W / 2 - .12), FLOOR_Y + .78, (a + b) / 2, 0, 0, 0, c);
      add(new T.BoxGeometry(.4, .42, b - a), inner, s * (W / 2 - .38), FLOOR_Y + .22, (a + b) / 2, 0, 0, 0, c);
      for (let z = a + .4; z < b; z += .7) seats.push({k, x: s * (W / 2 - .55), y: FLOOR_Y + .53, z: z0 + z, ry: s > 0 ? -PI / 2 : PI / 2});
    }
    for (const z of [-5.5, -2.6, 2.6, 5.5]) add(new T.CylinderGeometry(.03, .03, H, 8), poleM, 0, FLOOR_Y + H / 2, z, 0, 0, 0, c);
    for (const s of [-1, 1]) { add(new T.CylinderGeometry(.025, .025, L - 1, 6), steel, s * .55, FLOOR_Y + H - .35, 0, PI / 2, 0, 0, c); for (let z = -8; z <= 8; z += 1.1) add(new T.TorusGeometry(.07, .015, 5, 10), poleM, s * .55, FLOOR_Y + H - .5, z, 0, PI / 2, 0, c) }
    for (const s of [-1, 1]) add(new T.BoxGeometry(.2, .05, L - 2), lightM, s * .9, FLOOR_Y + H - .02, 0, 0, 0, 0, c);
    // end walls (gangways), cab on the two outer ends
    for (const e of [-1, 1]) {
      const outer = (k === 0 && e < 0) || (k === COACHES - 1 && e > 0), ez = e * L / 2;
      if (!outer) { add(new T.BoxGeometry(W, H, .08), inner, 0, FLOOR_Y + H / 2, ez, 0, 0, 0, c); add(new T.BoxGeometry(1.1, 2.2, .1), dark, 0, FLOOR_Y + 1.1, ez, 0, 0, 0, c); continue }
      add(new T.BoxGeometry(W, H * .55, 1.4), steel, 0, FLOOR_Y + H * .28, ez + e * .6, 0, 0, 0, c);
      const nose = add(new T.CylinderGeometry(W / 2, W / 2, 1.2, 20, 1, false, 0, PI), steel, 0, FLOOR_Y + H * .3, ez + e * 1.3, 0, e > 0 ? 0 : PI, PI / 2, c); nose.scale.set(.5, 1, 1);
      add(new T.BoxGeometry(W - .3, 1.25, .08), glassM, 0, FLOOR_Y + H * .72, ez + e * .95, e * -.35, 0, 0, c);
      const led = new T.Mesh(new T.PlaneGeometry(1.6, .3), new T.MeshStandardMaterial({map: ledTexture('नवापुर मेट्रो'), emissive: 0xffffff, emissiveMap: ledTexture('नवापुर मेट्रो'), emissiveIntensity: 1.2})); led.position.set(0, FLOOR_Y + H - .05, ez + e * .78); led.rotation.y = e > 0 ? 0 : PI; c.add(led);
      for (const s of [-1, 1]) add(new T.CylinderGeometry(.14, .14, .06, 14), new T.MeshStandardMaterial({color: 0xffffff, emissive: 0xfff3d0, emissiveIntensity: 1}), s * 1.0, FLOOR_Y + .55, ez + e * 1.95, PI / 2, 0, 0, c);
      add(new T.BoxGeometry(W, .2, .3), new T.MeshStandardMaterial({color: 0x1e5fa8}), 0, FLOOR_Y + .25, ez + e * 1.85, 0, 0, 0, c);
    }
    if (k === 1) { const pg = new T.Group(); pg.position.set(0, FLOOR_Y + H + .55, 0); c.add(pg);                         // pantograph
      for (const s of [-1, 1]) { const a = add(new T.BoxGeometry(.06, .06, 2.2), dark, 0, .4, s * .5, s * .7, 0, 0, pg); void a } add(new T.BoxGeometry(1.8, .05, .08), steel, 0, .85, 0, 0, 0, 0, pg) }
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
