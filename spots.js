// The numbered billboard spots, shared by the game and the admin page.
// Big stand-alone billboards: 01-10 and 51-60. Small boards on street lamps: 11-50 and 61-100.
const two = n => String(n).padStart(2, '0');

const BIG = [ // x, z, facing (radians), where it is
  [-14, -262, 0, 'City Center, north road'], [-62, -318, 0, 'City Center plaza'], [140, -268, .3, 'IT Park gate'], [-176, -352, 1.2, 'University'],
  [-300, -60, 1.57, 'Residential Area'], [262, -4, -1.57, 'Old Town'], [356, 38, 0, 'Airport road'], [330, -150, 0, 'Industrial Zone'],
  [-262, 128, .5, 'Bandra Bay road'], [-196, -70, 1.57, 'Startup Café']];
const BIG2 = [
  [-208, -176, 1.57, 'Clock Tower'], [-30, -226, 0, 'City Hall'], [-262, -300, 1.57, 'Stadium'], [-226, 52, 1.57, 'Giant Wheel'], [-228, -62, 1.57, 'Grand Museum'],
  [228, -96, -1.57, 'Pagoda Market'], [222, -246, 0, 'Royal Hall'], [76, -250, 0, 'Startup Mall'], [250, 150, -.6, 'Port road'], [-150, -420, 0, 'University north']];

// the same lamp positions the game builds along the old-city roads, with the direction each lamp arm points
function lampPoles() {
  const poles = [];
  for (const r of [-120, -40, 40, 120]) for (let s = -150; s <= 150; s += 40) {
    poles.push([r + 8.2, s + 6, -1]);
    if (s + 26 < 163) poles.push([s + 26, r + 8.2, 0]);
  }
  return poles.filter(([x, z]) => x > -140 && z < 164);
}
const street = (x, z, alongZ) => {
  const names = alongZ ? ['Station Road', 'M.G. Road', 'Linking Road', 'Hill Road'] : ['Gandhi Marg', 'Nehru Street', 'Tilak Road', 'Sea View Road'];
  const v = alongZ ? x - 8.2 : z - 8.2, i = [-120, -40, 40, 120].findIndex(r => Math.abs(r - v) < 1);
  return names[i] || 'Old city';
};

const poles = lampPoles(), step = poles.length / 40;
const first = Array.from({length: 40}, (_, i) => Math.floor(i * step));
const lampAt = ([x, z, ax], side) => ({type: 'lamp', x, z, side, ry: ax ? 0 : Math.PI / 2, area: z > 168 ? 'Marine Drive' : street(x, z, ax !== 0)});
// the second forty: lamps without a board yet, the Marine Drive lamps, then the other side of a few poles
const seaLamps = [];
for (let x = -150; x <= 150; x += 22) if (x > -140) seaLamps.push([x, 170.2, 0]);
const second = [...poles.filter((_, i) => !first.includes(i)), ...seaLamps].map(p => lampAt(p, 1));
for (let i = 0; second.length < 40; i++) second.push(lampAt(poles[first[i]], -1));

const numbered = (list, from) => list.map((s, i) => ({code: two(from + i), ...s}));
const big = list => list.map(([x, z, ry, area]) => ({type: 'big', x, z, ry, area}));
export const SPOTS = [
  ...numbered(big(BIG), 1),
  // a lamp on a north-south road faces north and south, one on an east-west road faces east and west
  ...numbered(first.map(i => lampAt(poles[i], 1)), 11),
  ...numbered(big(BIG2), 51),
  ...numbered(second.slice(0, 40), 61),
];
export const spotByCode = c => SPOTS.find(s => s.code === c);
