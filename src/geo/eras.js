import { unflat } from './buf.js';

// Where and when the city was built up, for the era switcher. The mapped city is today's; for the two earlier
// moments each plot is given the first era it was built on, by district. These shares are an illustration of how
// Huế grew (the Citadel wards and the old town first, the south bank under the French, the outskirts last), not a
// survey: no historical cadastre is bundled.
let wall = null, axis = [0, 1], mid = [0, 0];

const inRing = (x, z, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if (r[i][1] > z !== r[j][1] > z && x < ((r[j][0] - r[i][0]) * (z - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
};
const ringArea = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };

export function initEras(data) {
  const outers = (data.wall || []).map((poly) => unflat(poly[0]));
  wall = outers.sort((a, b) => ringArea(b) - ringArea(a))[0] || null;
  const tt = data.truongtien;
  if (tt) {
    const a = [tt.a[0] / 10, tt.a[1] / 10], b = [tt.b[0] / 10, tt.b[1] / 10], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    axis = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; // across the river, north bank → south bank
    mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }
}
export const inCitadel = (x, z) => !!wall && inRing(x, z, wall);
// which side of the river, judged across the line of Trường Tiền (good near the centre, where it matters)
export const southBank = (x, z) => (x - mid[0]) * axis[0] + (z - mid[1]) * axis[1] > 0;
export const inHills = (x, z) => z > 2600;

const h2 = (i, j) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x, z) => { const i = Math.floor(x), j = Math.floor(z); let fx = x - i, fz = z - j; fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz); return (h2(i, j) * (1 - fx) + h2(i + 1, j) * fx) * (1 - fz) + (h2(i, j + 1) * (1 - fx) + h2(i + 1, j + 1) * fx) * fz; };

// The French quarter proper: the south bank within reach of Lê Lợi.
export const frenchQuarter = (x, z) => southBank(x, z) && !inHills(x, z) && Math.hypot(x - mid[0], z - mid[1]) < 1700;

// First era (0, 1 or 2) in which the plot at (x, z) is built on. Clumped, so whole lanes fill in together.
export function plotBorn(x, z, salt = 0) {
  const k = vnoise(x / 130 + 11.3, z / 130 + 4.9) * 0.62 + h2(Math.round(x * 2.3) + salt, Math.round(z * 2.3)) * 0.38;
  const d = Math.hypot(x - mid[0], z - mid[1]);
  let p0, p1; // share built by 1885, by 1935
  if (inCitadel(x, z)) { p0 = 0.5; p1 = 0.78; }
  else if (inHills(x, z)) { p0 = 0.07; p1 = 0.16; }
  else if (!southBank(x, z)) { if (d < 2500) { p0 = 0.36; p1 = 0.7; } else { p0 = 0.14; p1 = 0.32; } }
  else if (d < 1700) { p0 = 0.05; p1 = 0.58; }
  else if (d < 3200) { p0 = 0.08; p1 = 0.32; }
  else { p0 = 0.1; p1 = 0.26; }
  return k < p0 ? 0 : k < p1 ? 1 : 2;
}
