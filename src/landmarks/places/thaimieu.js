import { KIND, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints } from '../../geo/materials.js';
import { pavilion } from '../citadel.js';
import { fence, roadsNear, FENCE } from '../enclosure.js';

// Thái Miếu (Thái Tổ Miếu), the temple of the nine Nguyễn lords in the south-east of the Imperial City, built 1804
// under Gia Long, as it stands in 2026. Sources and estimates: docs/places/thaimieu.md.
//
// The great double hall (tiền điện 15 bays + 2 wings, chính điện 13 + 2, 71 x 27 m, the largest timber building of
// the Imperial City) burned in 1947; the small 5-bay hall put up on its base in 1971-72 was taken down for the
// 2021- project. Today the main hall is its restored foundation only, and the timber hall is phase 2 (from 2027).
// Standing round it: Thái Miếu Môn in the front wall, the bình phong and Tuy Thành Các with its flanking gates
// Quang Hy and Diên Hy, Chiêu Kính điện and Long Đức điện on the east, Thần Khố and Thần Trù in the back yard. Mục Tư
// điện, Thổ Công từ and the Tả / Hữu Tùng tự are only their bases. Triệu Miếu, behind the back wall, is its own place.
//
// Frame: centre C on the mapped hall (OSM way 172657566), u along the facade (toward the east end), v out of the front
// (south-south-east, toward the Imperial City's south wall). Positions below are OSM outlines in that frame.
export const id = 'thaimieu';

const C = [-910.9, -111.3];
const ANG = Math.atan2(-0.6, 0.8);
const UX = Math.cos(ANG), UZ = Math.sin(ANG);
const P = (u, v) => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];
const ACROSS = ANG + Math.PI / 2; // halls whose long side runs along v

// the compound wall (OSM barrier=wall 695810745 + 695810746) and the cross wall to the back yard (1346838355)
const OUTER = [[-63.1, 101.9], [-64.9, -15.1], [-65.9, -58.2], [-28, -57], [26.1, -55.2], [63.9, -54], [64, -12.9], [64.3, 101.7]];
const CROSS = [[-64.9, -15.1], [-40.8, -14.5], [64, -12.9]];

// ground kept clear of the mapped trees: [u, v, size u, size v] (the bases, halls, gates and the walk, with margin)
const CLEAR = [[0, 1.5, 76, 32], [0, 39.5, 52, 24], [2.5, 83, 6, 32], [2.9, 100.6, 17, 7], [2.7, 89, 11, 3], [2.1, 65.7, 25, 8],
  [51, 43.8, 16, 17], [51.3, 1.4, 16, 17], [-51, 43.8, 15, 17], [-53.5, 0.4, 11, 14], [31, 37, 10, 15], [-31, 37, 10, 15],
  [54.4, -34.2, 15, 20], [-55.1, -36, 13, 21]];

const ROOF = PAL.imperialRoof, RIDGE = hex('#f1d77a'), LAC = PAL.lacquer;
const WALL = hex('#d8c48e'), STONE = PAL.stone, BRICK = hex('#9c7a64'), NEWSTONE = hex('#c9bfa9');
const ENAMEL = [hex('#2f7d8c'), hex('#3f8f4f'), hex('#e0b23a')];

const gy = (p) => LAND_Y + rise(p[0], p[1]);
const at = (u, v, y) => { const p = P(u, v); return [p[0], y, p[1]]; };
function fbox(S, u, v, y0, y1, su, sv, col, opts) { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ANG, col, opts); }

// a brick gate across a wall: centre (u, v) in the frame, `len` along the wall at angle a
function gate(S, q, a, len, thick, y, { h = 3.2, doors = 1 } = {}) {
  const ux = Math.cos(a), uz = Math.sin(a);
  S.kind = KIND.MASONRY;
  const n = doors, pier = 1.0, open = (len - pier * (n + 1)) / n;
  for (let i = 0; i <= n; i++) {
    const t = -len / 2 + pier / 2 + i * (open + pier);
    S.box(q[0] + ux * t, q[1] + uz * t, y - 0.3, y + h, pier, thick, a, WALL, { top: shade(WALL, 0.9) });
  }
  S.box(q[0], q[1], y + h - 0.5, y + h + 0.3, len, thick, a, WALL);
  S.kind = KIND.PLAIN;
  for (let i = 0; i < n; i++) {
    const t = -len / 2 + pier + open / 2 + i * (open + pier);
    S.box(q[0] + ux * t, q[1] + uz * t, y, y + h - 0.6, open, 0.12, a, shade(LAC, i === (n - 1) / 2 ? 0.7 : 0.8));
  }
  S.hip(q[0], q[1], len, thick, a, y + h + 0.3, Math.min(1.6, thick * 0.55 + 0.3), ROOF, { flare: 0.3, over: 0.6, ridgeCol: RIDGE, fascia: 0.18, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, segs: 3 });
}

// a restored base of a vanished hall: stone kerb, brick top, the column stones in their grid
function ruinBase(S, u, v, su, sv, h, nu, nv) {
  const p = P(u, v), y = gy(p);
  S.base = y - LAND_Y;
  S.kind = KIND.MASONRY;
  fbox(S, u, v, y - 0.3, y + h, su, sv, NEWSTONE, { taper: 0.985, top: BRICK, topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const q = P(u - su / 2 + 1 + ((su - 2) * i) / nu, v - sv / 2 + 1 + ((sv - 2) * j) / nv);
    S.cyl(q[0], q[1], y + h, y + h + 0.18, 0.36, 0.3, 6, shade(STONE, 0.8), { cap: true, rot: ANG });
  }
  return y + h;
}

function foundation(S) {
  // Thái Tổ Miếu: 71 x 27 m (1,917 m2), restored 2024-26 as a bare base; ~1 m like Thế Miếu's
  const V = 1.5, W = 71, D = 27, H = 1.0;
  const g = gy(P(0, V)), fl = g + H;
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  fbox(S, 0, V, g - 0.3, fl, W, D, NEWSTONE, { taper: 0.99, top: BRICK, topKind: KIND.ROAD });
  // a stone kerb round the top edge
  fbox(S, 0, V + D / 2 - 0.3, fl, fl + 0.12, W, 0.6, STONE);
  fbox(S, 0, V - D / 2 + 0.3, fl, fl + 0.12, W, 0.6, STONE);
  for (const s of [-1, 1]) fbox(S, s * (W / 2 - 0.3), V, fl, fl + 0.12, 0.6, D, STONE);
  // flights: three up the front (5 steps) and one at each end (the back stands close to the cross wall)
  for (const [u, w] of [[0, 5.0], [-21, 3.6], [21, 3.6]]) {
    for (let k = 1; k <= 5; k++) fbox(S, u, V + D / 2 + 0.32 * k - 0.16, g - 0.3, fl - 0.2 * k, w, 0.32, shade(STONE, 1.05), { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) { const a = P(u + s * (w / 2 + 0.22), V + D / 2 - 0.1), b = P(u + s * (w / 2 + 0.22), V + D / 2 + 1.7); S.beam([a[0], fl + 0.35, a[1]], [b[0], g + 0.25, b[1]], 0.4, 0.42, shade(STONE, 0.9)); }
    S.kind = KIND.MASONRY;
  }
  for (const s of [-1, 1]) for (let k = 1; k <= 5; k++) fbox(S, s * (W / 2 + 0.32 * k - 0.16), V, g - 0.3, fl - 0.2 * k, 0.32, 3.6, shade(STONE, 1.05), { topKind: KIND.ROAD });
  // column stones: the front hall 15 bays + 2 wings (18 lines, 4 rows), the main hall 13 + 2 (16 lines, 5 rows)
  S.kind = KIND.PLAIN;
  const lines = (bays, bay, wing) => { const a = [-(bays * bay) / 2 - wing]; for (let i = 0; i < bays + 2; i++) a.push(a[a.length - 1] + (i === 0 || i === bays + 1 ? wing : bay)); return a; };
  const front = lines(15, 4.2, 2.9), main = lines(13, 4.2, 3.6);
  const rows = [[front, [V + 12.4, V + 9.6, V + 6.6, V + 3.8]], [main, [V + 1.6, V - 1.6, V - 5.0, V - 8.4, V - 11.8]]];
  for (const [us, vs] of rows) for (const u of us) for (const v of vs) {
    const q = P(u, v);
    S.cyl(q[0], q[1], fl, fl + 0.2, 0.42, 0.36, 6, shade(STONE, 0.82), { cap: true, rot: ANG });
  }
  // the brick-paved court before it, with a stone walk on the axis to Tuy Thành Các
  const c = P(0, 40), y = gy(c);
  S.base = y - LAND_Y;
  S.kind = KIND.ROAD;
  fbox(S, 0, 39.5, y - 0.2, y + 0.14, 52, 24, BRICK);
  fbox(S, 0, 51.5, y + 0.14, y + 0.2, 4.6, 24, shade(STONE, 1.08));
  fbox(S, 2.5, 83, y - 0.2, y + 0.16, 4.6, 32, shade(STONE, 1.05));
}

function front(S, lamps) {
  // Thái Miếu Môn in the front wall (OSM "Miếu Môn", ~54 m2): three doors under a yellow glazed roof
  const tm = P(2.9, 100.6), y = gy(tm);
  S.base = y - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(tm[0], tm[1], y - 0.3, y + 0.35, 15.2, 5.6, ANG, STONE, { topKind: KIND.ROAD });
  gate(S, tm, ANG, 13.8, 4.0, y + 0.35, { h: 3.9, doors: 3 });
  // a second, smaller roof tier over the middle door, its eave clear of the gate roof's ridge (y + 5.8) under it
  const m = P(2.9, 100.6);
  S.kind = KIND.MASONRY;
  S.box(m[0], m[1], y + 4.5, y + 6.0, 5.0, 2.2, ANG, WALL);
  S.hip(m[0], m[1], 5.0, 2.2, ANG, y + 6.0, 1.3, ROOF, { flare: 0.35, over: 0.6, ridgeCol: RIDGE, fascia: 0.16, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, segs: 3 });
  S.kind = KIND.PLAIN;
  S.box(m[0], m[1], y + 7.5, y + 8.1, 0.9, 0.3, ANG, ENAMEL[2]);
  lamps.push(at(2.9, 103.3, y + 3.6));

  // the bình phong (screen wall) inside the gate, restored 2025: plastered brick, tile coping, an enamel medallion
  const bp = P(2.7, 89), yb = gy(bp);
  S.base = yb - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(bp[0], bp[1], yb - 0.3, yb + 0.4, 9.4, 1.4, ANG, STONE, { topKind: KIND.ROAD });
  S.box(bp[0], bp[1], yb + 0.4, yb + 2.7, 8.6, 0.7, ANG, WALL, { top: shade(WALL, 0.9) });
  for (const s of [-1, 1]) { const q = P(2.7 + s * 4.6, 89); S.box(q[0], q[1], yb + 0.4, yb + 3.3, 0.9, 0.9, ANG, shade(WALL, 0.95)); }
  S.kind = KIND.TILE;
  S.box(bp[0], bp[1], yb + 2.7, yb + 3.05, 8.8, 1.1, ANG, ROOF, { taper: 0.6 });
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) { const q = P(2.7, 89 + s * 0.37); S.cyl(q[0], q[1], yb + 1.2, yb + 1.21, 0.75, 0.75, 8, ENAMEL[0]); }

  // Tuy Thành Các (OSM 22.8 x 5.4 m, restored 2025): a two-storey gate pavilion on the court's front
  const tt = P(2.1, 65.7), yt = gy(tt);
  S.base = yt - LAND_Y;
  pavilion(S, tt[0], tt[1], 20.6, 4.4, ANG, yt, { tiers: 2, wallH: 3.4, roof: ROOF, wall: LAC, over: 1.3, rh: 2.6, platform: 0.5, ridge: RIDGE, colonnade: false, segs: 3 });
  lamps.push([tt[0], yt + 3.2, tt[1]]);
  // and the cross wall it stands in, with Quang Hy Môn (west) and Diên Hy Môn (east)
  for (const [u, v] of [[-27.95, 67.4], [30.35, 68.5]]) { const q = P(u, v); gate(S, q, ANG, 7.9, 2.5, gy(q), { h: 3.0 }); }
}

function halls(S, lamps) {
  // Chiêu Kính điện (OSM 13.1 x 14.6 m) on the east of the court, facing it; Long Đức điện (13.0 x 14.4 m) east
  // of the main base. Both restored, yellow glazed roofs, red lacquered timber.
  const ck = P(51, 43.8), yc = gy(ck);
  S.base = yc - LAND_Y;
  pavilion(S, ck[0], ck[1], 13.4, 11.4, ACROSS, yc, { wallH: 3.0, roof: ROOF, wall: LAC, over: 1.2, rh: 2.4, platform: 0.6, colonnade: true, segs: 3 });
  const ld = P(51.3, 1.4), yl = gy(ld);
  S.base = yl - LAND_Y;
  pavilion(S, ld[0], ld[1], 11.4, 11.6, ANG, yl, { wallH: 2.9, roof: ROOF, wall: LAC, over: 1.2, rh: 2.3, platform: 0.6, colonnade: true, segs: 3 });
  lamps.push(at(51.3, 8.2, yl + 3.0));
  lamps.push(at(44.6, 43.8, yc + 3.1));

  // only their bases: Mục Tư điện (mirroring Chiêu Kính), Thổ Công từ (OSM 9 x 12 m), Tả and Hữu Tùng tự
  ruinBase(S, -51, 43.8, 13.1, 14.6, 0.6, 4, 4);
  ruinBase(S, -53.5, 0.4, 9.0, 12.0, 0.5, 3, 3);
  for (const s of [-1, 1]) ruinBase(S, s * 31, 37, 8.6, 13.0, 0.4, 2, 3);

  // the back yard's Thần Khố and Thần Trù are drawn by trieumieu.js, whose precinct they stand in (as its walls)
}

function walls(S, data) {
  const roads = roadsNear(data, C, 200);
  const X = CROSS.map(([u, v]) => P(u, v));
  const tm = P(2.9, 100.6);
  // gates in the cross wall to the back yard: Hiển Thừa Môn (east) and Túc Tướng Môn (west), positions estimated
  const back = [P(40, -13.3), P(-40, -14.5)];
  // the back yard's walls (OUTER between the two ends of CROSS) are Triệu Miếu's, drawn by trieumieu.js with its gates
  const front = [[64, -12.9], [64.3, 101.7], [-63.1, 101.9], [-64.9, -15.1]].map(([u, v]) => P(u, v));
  fence(S, front, FENCE.imperial, { closed: false, roads, openings: [[tm[0], tm[1], 13.6]] });
  fence(S, X, FENCE.imperial, { closed: false, roads, openings: back.map((q) => [q[0], q[1], 4.6]) });
  for (const q of back) gate(S, q, ANG, 5.0, 1.6, gy(q));
  // the cross wall of Tuy Thành Các, between the gates
  const line = [[[-64.6, 67.4], [-31.9, 67.4]], [[-24, 67.4], [-8.6, 66.2]], [[12.8, 66.2], [26.4, 68.5]], [[34.3, 68.5], [64.2, 68.5]]];
  for (const [a, b] of line) fence(S, [P(...a), P(...b)], FENCE.imperial, { closed: false, roads });
}

export function build({ data, S, group }) {
  // the mapped outlines inside the compound are all drawn here (or are gone: the 1972 hall, a site shed); take them
  // out of data.bld so the city builder leaves the ground to this model
  const ring = OUTER.map(([u, v]) => P(u, v));
  if (Array.isArray(data.bld)) {
    for (let i = data.bld.length - 1; i >= 0; i--) {
      const f = data.bld[i][0];
      let sx = 0, sz = 0;
      const n = f.length / 2;
      for (let k = 0; k < f.length; k += 2) { sx += f[k]; sz += f[k + 1]; }
      if (inRing(sx / n / 10, sz / n / 10, ring)) data.bld.splice(i, 1);
    }
  }
  // no tree grows out of a base, a hall or the paved walk: the mapped trees standing on one are taken out
  if (Array.isArray(data.trees)) {
    const t = data.trees, near = data.meta?.counts?.treesNear;
    for (let i = t.length / 4 - 1; i >= 0; i--) {
      const dx = t[i * 4] / 10 - C[0], dz = t[i * 4 + 1] / 10 - C[1];
      const u = dx * UX + dz * UZ, v = -dx * UZ + dz * UX;
      if (!CLEAR.some(([cu, cv, su, sv]) => Math.abs(u - cu) < su / 2 && Math.abs(v - cv) < sv / 2)) continue;
      t.splice(i * 4, 4);
      if (near != null && i < near) data.meta.counts.treesNear--;
    }
  }
  const lamps = [];
  foundation(S);
  front(S, lamps);
  halls(S, lamps);
  walls(S, data);
  S.kind = KIND.PLAIN;
  S.base = 0;
  const pos = [], col = [];
  for (const p of lamps) { pos.push(...p); col.push(1, 0.62, 0.3); }
  const pts = glowPoints(pos, col, 4);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
}
