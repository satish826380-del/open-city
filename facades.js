// Facade textures for Indian city buildings: 20 variants mixing wall colours with five window styles
// (sliding + grill, French windows with balcony rails, arched windows with wooden shutters,
// modern glass strips, Mumbai box grills with plants) plus AC units, ventilators, laundry,
// rain stains and posters. Each texture is 4 bays x 4 floors (one bay = 4 m, one floor = 3.2 m).
import * as T from 'three';

const WALLS = [['#c75f48', '#f6e7cf'], ['#e6a15a', '#fff3e0'], ['#f0c75e', '#fff6dc'], ['#7fbf9a', '#f4f7ef'], ['#6fa8d0', '#f4f7fb'], ['#a88fcc', '#f6f0fa'],
  ['#efe0bf', '#a8643c'], ['#b9573f', '#f4e4d2'], ['#f2efe8', '#4f86a8'], ['#c9a27a', '#fbf3e4'], ['#d9728f', '#fbeef3'], ['#4fa89a', '#eef6f1'],
  ['#e8864a', '#fdf0e2'], ['#9fb868', '#f7f8ee'], ['#a65a48', '#efe0cc'], ['#5f94c4', '#eef5fa'], ['#f3dfb7', '#a8432f'], ['#8f7bbd', '#ffffff'], ['#d8e3c2', '#4f7a3a'], ['#d9604f', '#fff']];
const SHUTTER = ['#2f6b4a', '#7a4a2a', '#2c5f8a', '#8a3a2a'];
const GLASS = ['#5b7186', '#4c6478', '#6a8296'];

export function makeFacades(ctex, speck, R, anisotropy = 8) {
  const out = [];
  WALLS.forEach(([wall, trim], vi) => {
    const style = vi % 5, lit = [], shut = SHUTTER[vi % SHUTTER.length];
    const glassGrad = (x, y0, y1) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, GLASS[vi % 3]); g.addColorStop(1, '#1b2530'); return g };
    const map = ctex(512, 512, (x, w, h) => {
      x.fillStyle = wall; x.fillRect(0, 0, w, h); speck(x, w, h, 9000, ['#000', '#fff', '#7a6a55'], 2.5, .12);
      for (let i = 0; i < 14; i++) { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(50,40,30,.2)'); x.fillStyle = g; x.fillRect(R() * w, R() * h * .4, 6 + R() * 22, h) }   // rain streaks
      for (let f = 0; f < 4; f++) {
        const y0 = f * 128; x.fillStyle = trim; x.fillRect(0, y0 + 116, w, 12);                                          // floor band
        for (let b = 0; b < 4; b++) {
          const x0 = b * 128, on = R() < .35; lit.push(on);
          const odd = R();
          if (odd < .1) {                                                                                                   // ventilator + AC unit bay
            x.fillStyle = trim; x.fillRect(x0 + 40, y0 + 30, 48, 30); x.fillStyle = '#2a3036'; x.fillRect(x0 + 44, y0 + 34, 40, 22);
            x.fillStyle = '#e8e8e4'; x.fillRect(x0 + 30, y0 + 70, 66, 36); x.fillStyle = '#9aa0a4'; for (let k = 0; k < 7; k++) x.fillRect(x0 + 34 + k * 9, y0 + 74, 4, 28);
            continue;
          }
          if (style === 0 || style === 4) {                                                                                 // sliding window with grill
            x.fillStyle = trim; x.fillRect(x0 + 18, y0 + 20, 92, 76); x.fillStyle = glassGrad(x, y0 + 26, y0 + 90); x.fillRect(x0 + 24, y0 + 26, 80, 64);
            x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(x0 + 24, y0 + 26, 38, 64);
            x.fillStyle = 'rgba(25,25,25,.85)'; for (let gx = x0 + 30; gx < x0 + 104; gx += (style === 4 ? 10 : 8)) x.fillRect(gx, y0 + 26, 2, 64); x.fillRect(x0 + 24, y0 + 56, 80, 2);
            if (style === 4) { x.fillStyle = 'rgba(30,30,30,.9)'; x.fillRect(x0 + 16, y0 + 92, 96, 6); for (let k = 0; k < 4; k++) { x.fillStyle = ['#3f8a36', '#e8452a', '#56a040', '#f2c94c'][k]; x.beginPath(); x.arc(x0 + 30 + k * 22, y0 + 88, 6, 0, 7); x.fill() } }
            x.fillStyle = 'rgba(60,55,50,.75)'; x.fillRect(x0 + 12, y0 + 12, 104, 9);                                       // chhajja shadow
          } else if (style === 1) {                                                                                         // French window + balcony rail
            x.fillStyle = trim; x.fillRect(x0 + 34, y0 + 10, 60, 106); x.fillStyle = glassGrad(x, y0 + 16, y0 + 112); x.fillRect(x0 + 40, y0 + 16, 48, 96);
            x.fillStyle = shut; x.fillRect(x0 + 18, y0 + 16, 20, 96); x.fillRect(x0 + 90, y0 + 16, 20, 96);
            x.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 10; k++) { x.fillRect(x0 + 18, y0 + 20 + k * 9, 20, 2); x.fillRect(x0 + 90, y0 + 20 + k * 9, 20, 2) }
            x.fillStyle = '#2a2a2a'; x.fillRect(x0 + 10, y0 + 84, 108, 4); x.fillRect(x0 + 10, y0 + 110, 108, 4); for (let k = 0; k < 13; k++) x.fillRect(x0 + 12 + k * 8.5, y0 + 86, 2, 26);
          } else if (style === 2) {                                                                                         // arched colonial window, wooden shutters
            x.fillStyle = trim; x.beginPath(); x.moveTo(x0 + 28, y0 + 104); x.lineTo(x0 + 28, y0 + 48); x.arc(x0 + 64, y0 + 48, 36, PI, 0); x.lineTo(x0 + 100, y0 + 104); x.fill();
            x.fillStyle = glassGrad(x, y0 + 20, y0 + 100); x.beginPath(); x.moveTo(x0 + 34, y0 + 100); x.lineTo(x0 + 34, y0 + 50); x.arc(x0 + 64, y0 + 50, 30, PI, 0); x.lineTo(x0 + 94, y0 + 100); x.fill();
            if (R() < .6) { x.fillStyle = shut; x.fillRect(x0 + 34, y0 + 52, 30, 48); x.fillRect(x0 + 64, y0 + 52, 30, 48); x.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 6; k++) x.fillRect(x0 + 34, y0 + 56 + k * 7, 60, 2) }
            x.fillStyle = trim; x.fillRect(x0 + 22, y0 + 100, 84, 8);
          } else {                                                                                                          // modern glass strip
            x.fillStyle = glassGrad(x, y0 + 24, y0 + 96); x.fillRect(x0, y0 + 24, 128, 72); x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(x0 + 10, y0 + 24, 30, 72);
            x.fillStyle = 'rgba(210,214,218,.95)'; x.fillRect(x0, y0 + 22, 128, 4); x.fillRect(x0, y0 + 94, 128, 4); x.fillRect(x0 + 62, y0 + 24, 4, 72);
          }
          if (on) { x.fillStyle = ['#c96a4a', '#3e6fa8', '#d6b25a', '#7a4a8a'][b]; x.globalAlpha = .45; x.fillRect(x0 + 40, y0 + 30, 14, 58); x.globalAlpha = 1 }    // curtains
          if (R() < .12) { x.strokeStyle = '#555'; x.lineWidth = 1; x.beginPath(); x.moveTo(x0 + 14, y0 + 100); x.lineTo(x0 + 114, y0 + 100); x.stroke();     // laundry line
            for (let k = 0; k < 5; k++) { x.fillStyle = ['#e74c3c', '#f2c94c', '#3e6fa8', '#ffffff', '#8e44ad'][(k + b) % 5]; x.fillRect(x0 + 20 + k * 18, y0 + 100, 12, 14) } }
          const st = x.createLinearGradient(0, y0 + 96, 0, y0 + 128); st.addColorStop(0, 'rgba(50,40,30,.22)'); st.addColorStop(1, 'rgba(50,40,30,0)'); x.fillStyle = st; x.fillRect(x0 + 40 + R() * 30, y0 + 96, 10, 30);
        }
      }
      if (R() < .4) { const px = R() * 380, py = 300 + R() * 150; x.fillStyle = ['#c0392b', '#2c5fa8', '#f2c94c'][Math.floor(R() * 3)]; x.fillRect(px, py, 60, 80); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(px + 8, py + 10, 44, 8); x.fillRect(px + 8, py + 26, 30, 6) }   // poster
    });
    let k = 0;
    const emi = ctex(512, 512, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) if (lit[k++]) { x.fillStyle = R() < .7 ? '#ffbf73' : '#dfe9ff'; x.fillRect(b * 128 + 30, f * 128 + 28, 68, 60) } });
    const rough = ctex(512, 512, (x, w, h) => { x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, w, h); for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) { x.fillStyle = '#3a3a3a'; x.fillRect(b * 128 + 26, f * 128 + 24, 76, 70) } }, false);
    out.push(new T.MeshStandardMaterial({map, emissiveMap: emi, emissive: 0xffffff, emissiveIntensity: 0, roughnessMap: rough, roughness: 1, metalness: 0}));
  });
  return out;
}
const PI = Math.PI;
