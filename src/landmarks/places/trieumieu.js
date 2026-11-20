import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints } from '../../geo/materials.js';
import { pavilion } from '../citadel.js';
import { fence, roadsNear, buildingsNear, FENCE } from '../enclosure.js';

// Triệu Miếu (Triệu Tổ miếu), the temple of Nguyễn Kim, father of lord Nguyễn Hoàng: built 1804 (the first building of
// the Imperial City), in the south-east corner of the Hoàng Thành behind (north-west of) Thái Miếu, restored 2014-16.
// Sources and estimates: docs/places/trieumieu.md.
//
// The hall is a trùng thiềm điệp ốc like Hưng Miếu's: a front hall (tiền điện) of 5 bays and 2 single wings joined
// under a valley to the main hall (chính điện) of 3 bays and 2 wings, about 540 m² (vi.wikipedia), yellow glazed
// tiles (hoàng lưu ly), ridges and gable ends inlaid with porcelain, columns lacquered red and the ornament gilt. Before
// it a court of about 300 m² of Bát Tràng brick. The precinct (0.541 ha) is closed on its four sides by low walls,
// about 1.2 m, with the gates where OSM maps them; Thần Khố stands to the east, Thần Trù to the west.
//
// Frame: the mapped hall (OSM way 172657570, 24.05 x 23.6 m with its base) centred at C, u along the facade (toward
// the north-east end), v out of the front (south-east, toward Thái Miếu).
export const id = 'trieumieu';

const C = [-935.675, -144.1];
const ANG = Math.atan2(-0.574, 0.819);
const UX = Math.cos(ANG), UZ = Math.sin(ANG);
const P = (u, v) => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];

// the precinct wall: OSM barrier=wall 695810745 from the corner by Thần Trù round the back to its east corner, the
// east side 695810746, and the wall shared with Thái Miếu's court (1346838355), in metres
const RING = [[-971.9, -84.4], [-998.6, -118.3], [-967.5, -140.1], [-923.1, -171.2], [-892.2, -192.8], [-867.4, -160.0], [-952.3, -98.4]];
// the gates OSM maps (barrier=gate): two in the back wall, one in the wall to Thái Miếu
const GATES = [[-967.5, -140.1, 0], [-923.1, -171.2, 0], [-952.3, -98.4, 1]];

const ROOF = PAL.imperialRoof, RIDGE = hex('#f1d77a'), LAC = hex('#b0291c'), GOLD = hex('#e0b03c');
const WALL = hex('#d8c48e'), WOOD = hex('#7a4a2c');
const STONE = PAL.stone, BRICK = hex('#a37a62');
const MOSAIC = [hex('#2f7d8c'), hex('#3f8f4f'), hex('#e8e2d0')]; // sành sứ inlay: blues, greens and white
const LOW = { ...FENCE.imperial, h: 1.3, plinth: 1.3, t: 0.45, every: 4.5, postW: 0.6, postUp: 0.2, wall: hex('#c9a46a'), pierW: 0.9, pierUp: 0.9 };

const gy = (p) => LAND_Y + rise(p[0], p[1]);
function fbox(S, u, v, y0, y1, su, sv, col, opts) { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ANG, col, opts); }

function hall(S, lamps) {
  const g = gy(C), fl = g + 0.7;
  const W = 22.0, VF = 10.4, VB = -10.4, VJ = 1.4; // outer column lines; VJ: the valley between the two halls
  S.base = g - LAND_Y;
  // the base: Thanh stone-faced, 0.7 m, the mapped outline
  S.kind = KIND.MASONRY;
  fbox(S, 0, 0, g - 0.3, fl, 24.05, 23.6, STONE, { taper: 0.985, topKind: KIND.ROAD });
  // three flights up the front (the middle between dragon balustrades), one at each end
  for (const [u, w] of [[0, 3.6], [-7.5, 2.6], [7.5, 2.6]]) {
    for (let k = 1; k <= 3; k++) fbox(S, u, 11.8 + 0.32 * k - 0.16, g - 0.3, fl - 0.18 * k, w, 0.32, shade(STONE, 1.05), { topKind: KIND.ROAD });
    if (u) continue;
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) { const a = P(u + s * (w / 2 + 0.2), 11.6), b = P(u + s * (w / 2 + 0.2), 12.9); S.beam([a[0], fl + 0.3, a[1]], [b[0], g + 0.2, b[1]], 0.34, 0.38, shade(STONE, 0.9)); }
    S.kind = KIND.MASONRY;
  }
  for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) fbox(S, s * (12.03 + 0.32 * k - 0.16), 0, g - 0.3, fl - 0.18 * k, 0.32, 2.6, shade(STONE, 1.05), { topKind: KIND.ROAD });

  // walls: brick at the back and the two ends (the main hall's back stained wood-tone inside, brick outside)
  S.kind = KIND.MASONRY;
  fbox(S, 0, VB + 0.3, fl, fl + 4.0, W, 0.6, WALL);
  for (const s of [-1, 1]) fbox(S, s * (W / 2 - 0.3), (VB + 8.6) / 2, fl, fl + 3.9, 0.6, 8.6 - VB, WALL);
  S.kind = KIND.TIMBER;
  fbox(S, 0, (VB + 8.6) / 2, fl, fl + 3.8, W - 1.2, 8.6 - VB - 0.8, shade(WOOD, 0.7), { top: shade(ROOF, 0.7) });
  // the front: 5 bays of lacquered doors (the middle three the main doors), a gilt transom, the wings walled
  const spans = [2.25, 3.5, 3.5, 4.0, 3.5, 3.5, 2.25].map((s) => s * (W / 22.5));
  const cols = [-W / 2];
  for (const s of spans) cols.push(cols[cols.length - 1] + s);
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 7; i++) {
    const u0 = cols[i], u1 = cols[i + 1], um = (u0 + u1) / 2, w = u1 - u0;
    if (i === 0 || i === 6) { S.kind = KIND.MASONRY; fbox(S, um, 8.65, fl, fl + 3.0, w, 0.3, WALL); S.kind = KIND.PLAIN; continue; }
    fbox(S, um, 8.62, fl, fl + 2.4, w - 0.45, 0.2, i >= 2 && i <= 4 ? shade(LAC, 0.62) : shade(LAC, 0.8));
    fbox(S, um, 8.66, fl + 2.4, fl + 2.95, w - 0.3, 0.18, GOLD); // the lattice transom, gilt
  }
  // verandah: 8 red columns on stone bases (six free-standing, as at Hưng Miếu), a beam along their heads, a dark ceiling
  const yb = fl + 3.0;
  for (const u of cols) {
    const p = P(u, VF);
    S.cyl(p[0], p[1], fl, fl + 0.28, 0.38, 0.33, 6, shade(STONE, 0.95), { cap: false, rot: ANG });
    S.cyl(p[0], p[1], fl + 0.28, yb, 0.21, 0.19, 6, LAC, { cap: false, rot: ANG });
  }
  fbox(S, 0, VF, yb - 0.38, yb, W + 0.4, 0.3, shade(LAC, 0.8));
  fbox(S, 0, VF - 0.02, yb - 0.6, yb - 0.38, W - 0.4, 0.12, GOLD); // the gilt liên ba frieze under it
  fbox(S, 0, (VF + 8.6) / 2, yb - 0.05, yb, W, VF - 8.6, shade(LAC, 0.45), { bottom: true });

  // roofs: the front hall's lower roof and the main hall's higher one behind it, both hipped with curved eaves
  S.kind = KIND.TIMBER;
  const eave = { fascia: 0.28, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, ridgeCol: RIDGE, segs: 4 };
  const mf = P(0, (VJ + VF) / 2), mb = P(0, (VB + VJ) / 2);
  S.hip(mb[0], mb[1], W, VJ - VB, ANG, fl + 4.0, 4.0, ROOF, { flare: 0.45, over: 1.4, ...eave }); // ridge 8.0 m over the floor
  S.hip(mf[0], mf[1], W, VF - VJ, ANG, yb, 2.6, ROOF, { flare: 0.4, over: 1.3, ...eave });
  // ridge ornament: porcelain-inlaid panels along each ridge, a gourd (hồ lô) on a flaming base at the main ridge's middle
  S.kind = KIND.PLAIN;
  for (const [m, top, dz, big] of [[mb, fl + 8.0, VJ - VB, 1], [mf, yb + 2.6, VF - VJ, 0.7]]) {
    const t = Math.max(0.3, Math.min(0.55, (dz + 2.7) * 0.035)), y = top + t * 1.5;
    S.box(m[0], m[1], y - 0.2, y + 0.45 * big, 1.2 * big, 0.32, ANG, MOSAIC[0]);
    S.cyl(m[0], m[1], y + 0.45 * big, y + 0.85 * big, 0.42 * big, 0.2 * big, 8, GOLD);
    S.cyl(m[0], m[1], y + 0.85 * big, y + 1.3 * big, 0.26 * big, 0.04, 6, MOSAIC[1]);
    const rl = W / 2 + 1.4 - (dz + 2.8) / 2 * 0.92;
    for (let k = -2; k <= 2; k++) {
      if (!k) continue;
      const q = [m[0] + UX * (k * rl) / 2.6, m[1] + UZ * (k * rl) / 2.6];
      S.box(q[0], q[1], top + t * 0.6, top + t * 1.35, 0.8, t * 1.05, ANG, MOSAIC[(Math.abs(k) + 1) % 3]);
    }
  }
  // night: lanterns along the verandah
  for (let i = 1; i < 6; i++) { const p = P((cols[i] + cols[i + 1]) / 2, VF - 0.4); lamps.push([p[0], yb - 0.6, p[1]]); }
}

function court(S) {
  // the front court, about 300 m² of Bát Tràng brick from the steps toward the wall to Thái Miếu's court, a stone walk
  // on the axis
  let g = -1e9; // the highest ground under the court, so the paving is not buried where the land rises
  for (const u of [-11, 0, 11]) for (const v of [12.3, 19, 25.7]) g = Math.max(g, gy(P(u, v)));
  S.base = g - LAND_Y;
  S.kind = KIND.ROAD;
  fbox(S, 0, 19.0, g - 0.5, g + 0.12, 22, 13.4, BRICK);
  fbox(S, 0, 18.0, g + 0.12, g + 0.16, 2.15, 11.4, shade(STONE, 1.08));
  // six porcelain planters on stone stools along the front, as at Hưng Miếu, and a bronze urn to the right of the walk
  for (const u of [-9.5, -6.5, -3.5, 3.5, 6.5, 9.5]) {
    const p = P(u, 14.4);
    S.kind = KIND.MASONRY;
    S.cyl(p[0], p[1], g, g + 0.5, 0.3, 0.34, 6, shade(STONE, 0.95));
    S.kind = KIND.PLAIN;
    S.cyl(p[0], p[1], g + 0.5, g + 0.85, 0.34, 0.25, 6, hex('#3e6f8c'));
    S.cyl(p[0], p[1], g + 0.85, g + 1.35, 0.5, 0.32, 6, hex('#3c5a2e'));
  }
  const ur = P(3.6, 19.5);
  S.kind = KIND.MASONRY;
  S.box(ur[0], ur[1], g, g + 0.5, 1.1, 1.1, ANG, STONE);
  S.kind = KIND.PLAIN;
  S.cyl(ur[0], ur[1], g + 0.5, g + 1.3, 0.42, 0.5, 8, hex('#4f5446'));
}

function sides(S) {
  // Thần Khố (east, OSM 619851654, 12.6 x 17.2 m) and Thần Trù (west, OSM 695810748, 10.3 x 18.7 m): long side halls
  // facing the axis, drawn as small yellow-roofed houses on low bases
  for (const [c, w, d] of [[[-888.0, -171.3], 9.4, 13.8], [[-976.6, -107.0], 7.2, 15.2]]) {
    const y = gy(c);
    S.base = y - LAND_Y;
    pavilion(S, c[0], c[1], w, d, ANG, y, { wallH: 3.0, roof: ROOF, wall: LAC, over: 1.0, rh: 2.4, platform: 0.35, steps: false, colonnade: true, segs: 3 });
  }
}

// a small brick gate in the low wall: two piers, a lintel and a tiled hip roof; `big` for the gate to Thái Miếu
function gate(S, q, a, big) {
  const len = big ? 4.2 : 3.4, thick = big ? 1.6 : 1.3, y = gy(q), h = big ? 2.8 : 2.4;
  const ux = Math.cos(a), uz = Math.sin(a);
  S.base = y - LAND_Y;
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) S.box(q[0] + ux * s * (len / 2 - 0.4), q[1] + uz * s * (len / 2 - 0.4), y - 0.3, y + h, 0.8, thick, a, LOW.wall, { top: shade(LOW.wall, 0.9) });
  S.box(q[0], q[1], y + h - 0.45, y + h + 0.25, len, thick, a, LOW.wall);
  S.kind = KIND.PLAIN;
  S.box(q[0], q[1], y, y + h - 0.5, len - 1.6, 0.1, a, shade(LAC, 0.8)); // the leaves, shut
  S.hip(q[0], q[1], len, thick, a, y + h + 0.25, big ? 1.0 : 0.8, ROOF, { flare: 0.2, over: 0.45, ridgeCol: RIDGE, fascia: 0.12, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true });
}

function walls(S, data) {
  const roads = roadsNear(data, C, 160), solid = buildingsNear(data, C, 120);
  fence(S, RING, LOW, { closed: true, roads, solid, openings: GATES.map(([x, z, big]) => [x, z, big ? 2.0 : 1.6]) });
  for (const [x, z, big] of GATES) {
    // the wall segment through the gate gives its angle
    let a = 0, bd = 1e9;
    for (let i = 0; i < RING.length; i++) {
      const p = RING[i], r = RING[(i + 1) % RING.length], dx = r[0] - p[0], dz = r[1] - p[1];
      const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / (dx * dx + dz * dz)));
      const d = Math.hypot(p[0] + dx * t - x, p[1] + dz * t - z);
      if (d < bd) { bd = d; a = Math.atan2(dz, dx); }
    }
    gate(S, [x, z], a, big);
  }
}

export function build({ data, S, group }) {
  const lamps = [];
  hall(S, lamps);
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
