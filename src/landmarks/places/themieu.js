import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints } from '../../geo/materials.js';
import { pavilion } from '../citadel.js';
import { fence, roadsNear, buildingsNear, FENCE } from '../enclosure.js';
import { REAR_GATE_CUTS } from './hungmieu.js';

// Thế Miếu (Thế Tổ Miếu), the dynastic temple of the Nguyễn emperors in the south-west of the Imperial City, built
// 1821-22 under Minh Mạng. Sources and estimates: docs/places/themieu.md.
//
// The hall is a trùng thiềm điệp ốc: a front hall (tiền điện) of 11 bays and 2 single wings and, joined to it under
// a valley, the main hall (chính điện) of 9 bays and 2 double wings, together 54.60 x 27.70 m on a base of nearly
// 1 m (vi.wikipedia), roofed in yellow glazed tiles (hoàng lưu ly) with a pháp lam disc on the ridge. Before it the
// court of Bát Tràng brick with a row of 14 stone stools carrying potted trees and a pair of bronze kỳ lân; Thổ Công
// từ stands to the west, Canh Y điện (a ruin, only its base) to the east; behind, the wall to Hưng Miếu's court with
// the gates Hiển Hựu and Đốc Hựu; in the side walls Khải Địch and Sùng Thành; in the front wall Miếu Môn; outside the
// cross wall the two shrines Tả and Hữu Tùng tự. Hiển Lâm Các, its towers, gates and cross wall, and the nine urns
// are modelled by places/hienlam (civic.js before); Hưng Miếu by its own place.
//
// Frame: the mapped hall (OSM way 172657567, 55.9 x 29.0 m with its base) centred at C, u along the facade (toward
// the north-east end), v out of the front (toward Hiển Lâm Các, south-east).
export const id = 'themieu';

const C = [-1293.6, 191.8];
const ANG = Math.atan2(-0.592, 0.806);
const UX = Math.cos(ANG), UZ = Math.sin(ANG);
const P = (u, v) => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];

// the compound wall (OSM barrier=wall 695810851) and the wall between the courts of Thế Miếu and Hưng Miếu
// (695810842), in metres; drawn here instead of civic.js once this place is built
const OUTER = [[-1246.8, 263.2], [-1292.4, 297.1], [-1312.7, 270.1], [-1354.6, 214.3], [-1386.8, 171.6], [-1356.9, 149.4], [-1316.0, 119.1], [-1287.5, 97.9], [-1255.3, 140.7], [-1213.7, 196.0], [-1193.4, 223.0], [-1238.4, 256.4]];
const DIVIDE = [[-1335.2, 199.9], [-1325.1, 192.3], [-1283.5, 161.5], [-1272.8, 153.6]];

const ROOF = PAL.imperialRoof, RIDGE = hex('#f1d77a'), LAC = PAL.lacquer, GOLD = hex('#d9a93a');
const WALL = hex('#d8c48e'); // lime-washed brick of the end and back walls
const STONE = PAL.stone, BRICK = hex('#9c7a64'), BRONZE = hex('#4f5446');
const ENAMEL = [hex('#2f7d8c'), hex('#3f8f4f'), hex('#e0b23a')]; // pháp lam blues, greens and yellow

const gy = (p) => LAND_Y + rise(p[0], p[1]);

// a box in the frame: centre (u, v), size along u and v
function fbox(S, u, v, y0, y1, su, sv, col, opts) { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ANG, col, opts); }

// a small brick gate with a tiled hip roof, standing across a wall: centre q, opening along `a` (the wall's angle)
function gate(S, q, a, len, thick, y) {
  const ux = Math.cos(a), uz = Math.sin(a);
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) S.box(q[0] + ux * s * (len / 2 - 0.55), q[1] + uz * s * (len / 2 - 0.55), y - 0.3, y + 3.2, 1.1, thick, a, WALL, { top: shade(WALL, 0.9) });
  S.box(q[0], q[1], y + 2.7, y + 3.4, len, thick, a, WALL);
  S.kind = KIND.PLAIN;
  S.box(q[0], q[1], y, y + 2.6, len - 2.2, 0.12, a, shade(LAC, 0.8)); // the leaves, shut
  S.hip(q[0], q[1], len, thick, a, y + 3.4, 1.2, ROOF, { flare: 0.25, over: 0.5, ridgeCol: RIDGE, fascia: 0.15, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true });
}

function hall(S, group, lamps) {
  const g = gy(C), fl = g + 1.0;
  const W = 52.6, VF = 12.9, VB = -12.9, VJ = 2.7; // outer column lines; VJ: the valley between the two halls
  S.base = g - LAND_Y;
  // the base: stone-faced, 1.0 m, the mapped outline
  S.kind = KIND.MASONRY;
  fbox(S, 0, 0, g - 0.3, fl, 55.9, 29.0, STONE, { taper: 0.985, topKind: KIND.ROAD });
  // three flights up the front (the middle one between dragon balustrades) and one at each end
  for (const [u, w] of [[0, 4.3], [-17.2, 3.4], [17.2, 3.4]]) {
    for (let k = 1; k <= 4; k++) fbox(S, u, 14.5 + 0.32 * k - 0.16, g - 0.3, fl - 0.2 * k, w, 0.32, shade(STONE, 1.05), { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) { const a = P(u + s * (w / 2 + 0.2), 14.4), b = P(u + s * (w / 2 + 0.2), 15.9); S.beam([a[0], fl + 0.3, a[1]], [b[0], g + 0.25, b[1]], 0.36, 0.4, shade(STONE, 0.9)); }
    S.kind = KIND.MASONRY;
  }
  for (const s of [-1, 1]) for (let k = 1; k <= 4; k++) fbox(S, s * (27.95 + 0.32 * k - 0.16), 0, g - 0.3, fl - 0.2 * k, 0.32, 3.4, shade(STONE, 1.05), { topKind: KIND.ROAD });

  // walls: brick at the back and the two ends, the front a row of lacquered door panels behind the verandah
  S.kind = KIND.MASONRY;
  fbox(S, 0, VB + 0.3, fl, fl + 4.6, W, 0.6, WALL);
  for (const s of [-1, 1]) fbox(S, s * (W / 2 - 0.3), (VB + 10.8) / 2, fl, fl + 4.4, 0.6, 10.8 - VB, WALL);
  // the dark interior seen through nothing: a closed core so the roofs have something under them
  S.kind = KIND.TIMBER;
  fbox(S, 0, (VB + 10.8) / 2, fl, fl + 4.3, W - 1.2, 10.8 - VB - 0.8, shade(LAC, 0.7), { top: shade(ROOF, 0.7) });
  // the front: 11 bays of doors (bức bàn) in the front hall, a gilt frieze over them, the wing bays walled
  const spans = [2.65, ...Array(11).fill(4.3), 2.65];
  const cols = [-W / 2];
  for (const s of spans) cols.push(cols[cols.length - 1] + s);
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 13; i++) {
    const u0 = cols[i], u1 = cols[i + 1], um = (u0 + u1) / 2, w = u1 - u0;
    if (i === 0 || i === 12) { S.kind = KIND.MASONRY; fbox(S, um, 10.85, fl, fl + 3.6, w, 0.3, WALL); S.kind = KIND.PLAIN; continue; }
    fbox(S, um, 10.82, fl, fl + 2.85, w - 0.5, 0.2, i === 6 ? shade(LAC, 0.62) : shade(LAC, 0.78));
    fbox(S, um, 10.86, fl + 2.85, fl + 3.55, w - 0.3, 0.18, GOLD); // the lattice transom, gilt
  }
  // verandah: 14 red columns on stone bases, beams along their heads, a dark ceiling over the gallery
  const yb = fl + 3.6;
  for (const u of cols) {
    const p = P(u, VF);
    S.cyl(p[0], p[1], fl, fl + 0.3, 0.42, 0.36, 6, shade(STONE, 0.95), { cap: false, rot: ANG });
    S.cyl(p[0], p[1], fl + 0.3, yb, 0.24, 0.22, 6, LAC, { cap: false, rot: ANG });
  }
  fbox(S, 0, VF, yb - 0.4, yb, W + 0.4, 0.34, shade(LAC, 0.75));
  fbox(S, 0, (VF + 10.8) / 2, yb - 0.05, yb, W, VF - 10.8, shade(LAC, 0.45), { bottom: true });

  // roofs: the front hall's lower roof and the main hall's higher one behind it, both hipped with curved eaves
  S.kind = KIND.TIMBER;
  const eave = { fascia: 0.32, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, ridgeCol: RIDGE, segs: 4 };
  const mf = P(0, (VJ + VF) / 2), mb = P(0, (VB + VJ) / 2);
  S.hip(mb[0], mb[1], W, VJ - VB, ANG, fl + 4.6, 5.9, ROOF, { flare: 0.5, over: 1.7, ...eave }); // ridge 10.5 m over the floor
  S.hip(mf[0], mf[1], W, VF - VJ, ANG, yb, 3.3, ROOF, { flare: 0.45, over: 1.6, ...eave });
  // ridge ornament: on each ridge a pháp lam disc (mặt nhật) on a flame-shaped base, and enamel panels along it
  S.kind = KIND.PLAIN;
  for (const [m, top, dz] of [[mb, fl + 10.5, VJ - VB], [mf, yb + 3.3, VF - VJ]]) {
    const t = Math.max(0.3, Math.min(0.6, (dz + 3.3) * 0.035)), y = top + t * 1.6;
    const big = m === mb ? 1 : 0.75;
    S.box(m[0], m[1], y - 0.2, y + 0.5 * big, 1.4 * big, 0.35, ANG, ENAMEL[0]);
    S.cyl(m[0], m[1], y + 0.5 * big, y + 1.0 * big, 0.55 * big, 0.25 * big, 8, ENAMEL[2]);
    S.cyl(m[0], m[1], y + 1.0 * big, y + 1.5 * big, 0.25 * big, 0.04, 6, ENAMEL[1]);
    const rl = W / 2 + 1.6 - (dz + 3.4) / 2 * 0.92;
    for (let k = -3; k <= 3; k++) {
      if (!k) continue;
      const q = [m[0] + UX * (k * rl) / 3.6, m[1] + UZ * (k * rl) / 3.6];
      S.box(q[0], q[1], top + t * 0.6, top + t * 1.4, 0.9, t * 1.05, ANG, ENAMEL[Math.abs(k) % 2]);
    }
  }
  // night: lanterns along the verandah
  for (let i = 1; i < 13; i += 2) { const p = P((cols[i] + cols[i + 1]) / 2, VF - 0.4); lamps.push([p[0], yb - 0.7, p[1]]); }
}

function court(S) {
  const g = gy(P(0, 30));
  S.base = g - LAND_Y;
  // Bát Tràng brick from the hall to the cross wall of Hiển Lâm Các, and a stone walk on the axis
  S.kind = KIND.ROAD;
  fbox(S, 0, 32.5, g - 0.2, g + 0.06, 68, 36, BRICK);
  fbox(S, 0, 32.5, g + 0.06, g + 0.1, 4.3, 36, shade(STONE, 1.08));
  // the 14 stone stools (đôn) in a row before the hall, each carrying a pot with a clipped tree
  for (let i = 0; i < 14; i++) {
    const u = (i - 6.5) * 4.3, p = P(u, 19.5);
    if (Math.abs(u) < 3) continue;
    S.kind = KIND.MASONRY;
    S.cyl(p[0], p[1], g, g + 0.55, 0.32, 0.36, 6, shade(STONE, 0.95));
    S.kind = KIND.PLAIN;
    S.cyl(p[0], p[1], g + 0.55, g + 0.95, 0.36, 0.26, 6, hex('#3e6f8c'));
    S.cyl(p[0], p[1], g + 0.95, g + 1.45, 0.55, 0.35, 6, hex('#3c5a2e'));
  }
  // a pair of bronze kỳ lân on plinths either side of the walk
  for (const s of [-1, 1]) {
    const p = P(s * 6, 26);
    S.kind = KIND.MASONRY;
    S.box(p[0], p[1], g, g + 0.9, 1.5, 2.2, ANG, STONE);
    S.kind = KIND.PLAIN;
    const b = P(s * 6, 25.8), h = P(s * 6, 26.6);
    S.box(b[0], b[1], g + 0.9, g + 1.6, 0.8, 1.5, ANG, BRONZE);
    S.box(h[0], h[1], g + 1.4, g + 2.3, 0.7, 0.7, ANG, shade(BRONZE, 1.1));
  }
  // the old pine by the west end of the hall
  const t = P(-33, 4), y = gy(t);
  S.kind = KIND.PLAIN;
  S.cyl(t[0], t[1], y, y + 9, 0.38, 0.22, 6, hex('#5a4535'));
  for (const [y0, y1, r] of [[5.5, 8.5, 3.6], [8, 11, 3.0], [10.5, 13, 2.3], [12.5, 14.5, 1.4]]) S.cyl(t[0], t[1], y + y0, y + y1, r, r * 0.45, 7, hex('#2f4d2b'));
}

function sides(S) {
  // Thổ Công từ to the west of the hall (OSM 16 x 16 m with its terrace); Canh Y điện to the east, now a ruined base
  const tc = P(-50.7, -1.7);
  S.base = gy(tc) - LAND_Y;
  pavilion(S, tc[0], tc[1], 11.0, 10.5, ANG, gy(tc), { wallH: 3.0, roof: ROOF, wall: LAC, over: 1.2, rh: 2.4, platform: 0.6, colonnade: true, segs: 3 });
  const cy = P(50.7, -1.7), y = gy(cy);
  S.base = y - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(cy[0], cy[1], y - 0.3, y + 0.5, 12.4, 11.4, ANG, shade(STONE, 0.85), { taper: 0.98, topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { if (i % 3 && j % 3) continue; const q = P(50.7 - 4.5 + i * 3, -1.7 - 4.5 + j * 3); S.cyl(q[0], q[1], y + 0.5, y + 0.72, 0.38, 0.32, 6, shade(STONE, 0.75)); }
  // Tả and Hữu Tùng tự, outside the cross wall, facing each other across the yard before Hiển Lâm Các
  for (const [u, v] of [[43.7, 67.0], [-45.0, 69.2]]) {
    const q = P(u, v), yq = gy(q);
    S.base = yq - LAND_Y;
    pavilion(S, q[0], q[1], 9.0, 13.0, ANG, yq, { wallH: 3.0, roof: ROOF, wall: LAC, over: 1.2, rh: 2.2, platform: 0.5, colonnade: true, segs: 3 });
  }
}

function walls(S, data) {
  const roads = roadsNear(data, C, 220), solid = buildingsNear(data, C, 200);
  // gates: Khải Địch and Sùng Thành in the side walls on the axis of the court, Miếu Môn in the front wall,
  // Hiển Hựu and Đốc Hựu at the ends of the wall behind the hall
  const side = [P(62.1, 11.3), P(-62.1, 11.5)];
  const front = [-1243.2, 259.3];
  // Hưng Miếu's two rear gates stand in this wall (hungmieu.js draws them): it stops clear of their roofs
  fence(S, OUTER, FENCE.imperial, { closed: true, roads, solid: [...solid, ...REAR_GATE_CUTS], openings: [[side[0][0], side[0][1], 2.6], [side[1][0], side[1][1], 2.6], [front[0], front[1], 4.8]] });
  fence(S, DIVIDE, FENCE.imperial, { closed: false, roads, solid });
  const along = Math.atan2(UZ, UX) + Math.PI / 2; // the side walls run along v
  for (const q of side) gate(S, q, along, 5.4, 2.4, gy(q));
  gate(S, front, ANG, 10.0, 2.6, gy(front));
  for (const q of [P(41.8, -18.6), P(-40.8, -18.4)]) gate(S, q, ANG, 5.2, 1.6, gy(q));
}

export function build({ data, S, group }) {
  const lamps = [];
  hall(S, group, lamps);
  court(S);
  sides(S);
  walls(S, data);
  S.kind = KIND.PLAIN;
  S.base = 0;
  if (lamps.length) {
    const pos = [], col = [];
    for (const p of lamps) { pos.push(...p); col.push(1, 0.62, 0.3); }
    const pts = glowPoints(pos, col, 4);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
}
