import { unflat } from './buf.js';

// Rough districts of the city, for the things that differ by district (which trees flower where).
let wall = null;

const inRing = (x, z, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if (r[i][1] > z !== r[j][1] > z && x < ((r[j][0] - r[i][0]) * (z - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
};
const ringArea = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };

export function initDistricts(data) {
  const outers = (data.wall || []).map((poly) => unflat(poly[0]));
  wall = outers.sort((a, b) => ringArea(b) - ringArea(a))[0] || null;
}
export const inCitadel = (x, z) => !!wall && inRing(x, z, wall);
export const inHills = (x, z) => z > 2600;
