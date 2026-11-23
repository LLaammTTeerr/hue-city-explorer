import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';

// ---- Đàn Xã Tắc, the Nguyễn altar to the gods of Soil and Grain (1806), west of the Imperial City ----
//
// Sources (docs/places/xatac.md has the full list):
//  - vi.wikipedia.org/wiki/Đàn_Xã_Tắc_(Huế): two square open-air tiers; the lower about 73 m a side and 1.23 m high on
//    a brick base, the upper about 30 m a side and 1.6 m high on a laterite (đá gan gà) base; railings about 0.9 m,
//    red on the lower tier and yellow on the upper; four stairs in the middle of each side; a low wall round the
//    altar with gates on the north, east and west (none on the south). Restored from 2007, rites revived 2008.
//  - kienthuc.net.vn: the altar faces north; tiers 1.20 m and 1.6 m.
//  - OpenStreetMap: the upper tier as grassland (way 695810888, 30.4 m square), the walk round its foot (695810875),
//    the four upper stairs (695810876/77/78/79), the paved walks across the lower tier (695810884/85/86/87), the
//    restored lawn (695810866) and the Xã Tắc lane, which ends at the north gate and runs across the old south band.
// Google satellite and car Street View (2024-26, checked in the rebuild of this place): the upper tier sits where OSM
// puts it (within about 1 m, edges about 36 degrees off the grid). Today it is the only raised part: the lawn around it
// is flush with its foot and with the lanes, there is no 1.2 m lower tier, no red railing and no enclosing wall or gate
// posts. The upper tier's base reads as dark red-brown brick and its balustrade as weathered grey stone with openwork
// panels; the walks are grey stone. So the model draws today's site: one raised tier, the lower tier only as its flush
// lawn and the four grey walks out to its documented edges (73 m; the south walk stops at 27 m, as on the satellite).
// Estimated: step counts, balustrade detail, colours.

// the upper tier's OSM square, model metres; its first edge runs along the north (back) face
const TOP = [[-1901.7, 424.0], [-1877.1, 406.1], [-1859.3, 430.1], [-1883.9, 448.1]];

const H2 = 1.6; // upper tier height
const A1 = 36.5, Q0 = -36.5, Q1 = 27; // lower tier (flush today): half-width across, north and south edges (q toward the south)
const A2 = 15.2; // upper tier half-side
const LAWN = hex('#8b9f5e'), LAWN2 = hex('#93a764');
const BRICK = hex('#57453b'), COPE = hex('#8f8a7e');
const STONE = hex('#a7a499'), PAVE = hex('#7f878f'), RING = hex('#6c7176'), STEP = hex('#a19d91'), DINH_C = hex('#9a978d');
const BATTER = 0.09; // the brick base leans in this much (m) from footing to cope

export const id = 'xatac';

// the altar's frame: a across (east-north-east), q toward the citadel's south (south-south-east); it faces -q (north)
const c = TOP.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
const ex = TOP[1][0] - TOP[0][0], ez = TOP[1][1] - TOP[0][1], el = Math.hypot(ex, ez);
const ux = ex / el, uz = ez / el, ang = Math.atan2(uz, ux);
const P = (a, q) => [c[0] + a * ux - q * uz, c[1] + a * uz + q * ux];

// The lawn square and its walks are this file's own ground: the city draws none of its footways or lawn patches on
// it (OSM maps the walks as footways 695810875, 695810884-87 and paved areas, the lawn as 695810866) and plants no
// trees or houses there; the satellite and the car panos show bare lawn with the stone walks across it.
export function clearings() {
  return [[P(-A1, Q0), P(A1, Q0), P(A1, Q1), P(-A1, Q1)]];
}

// the stone incense burner (đỉnh) on the lawn north-west of the tier, 5.5 m south of the west car pano (refs2/sv-west-south):
// square, on four curled feet, two tall upright ears; width estimated from the pano at about 1 m
const DINH = [-1916.6, 416.4];

export function build({ S }) {
  const gY = (a, q) => { const p = P(a, q); return LAND_Y + rise(p[0], p[1]); };
  let yb = Infinity;
  for (let a = -A2; a <= A2; a += 5) for (let q = -A2; q <= A2; q += 5) yb = Math.min(yb, gY(a, q));
  const y2 = yb + H2;
  const box = (a, q, ya, yy, w, d, col, o) => { const p = P(a, q); S.box(p[0], p[1], ya, yy, w, d, ang, col, o); };
  // a box given by its local extents
  const span = (a0, a1, q0, q1, ya, yy, col, o) => box((a0 + a1) / 2, (q0 + q1) / 2, ya, yy, a1 - a0, q1 - q0, col, o);
  // a flush patch over [a0,a1]x[q0,q1], in tiles that follow the ground
  const flush = (a0, a1, q0, q1, h, col, kind, o) => {
    const na = Math.max(1, Math.round((a1 - a0) / 8)), nq = Math.max(1, Math.round((q1 - q0) / 8));
    const sa = (a1 - a0) / na, sq = (q1 - q0) / nq;
    for (let i = 0; i < na; i++) for (let j = 0; j < nq; j++) {
      const ta = a0 + sa * (i + 0.5), tq = q0 + sq * (j + 0.5), y = gY(ta, tq);
      S.kind = kind;
      box(ta, tq, y - 0.3, y + h, sa + 0.01, sq + 0.01, col, o);
    }
  };
  const keep = S.kind;

  // ---- the lower tier, flush with the ground today: a lawn square ----
  flush(-A1, A1, Q0, Q1, 0.03, LAWN, KIND.GROUND);

  // ---- the upper tier: brick base with a slight batter, grass top ----
  S.kind = KIND.MASONRY;
  const n0 = S.n, y0 = yb - 0.4;
  span(-A2, A2, -A2, A2, y0, y2, BRICK, { top: LAWN2, topKind: KIND.GROUND, taper: 1 - BATTER / A2 });
  (S.paved = S.paved || []).push([n0, S.n]); // its lawn is bare on the satellite: no trees, no houses (geo/city.js coverOf)
  const face = (y) => A2 - (BATTER * (y - y0)) / (y2 - y0); // the battered face's half-side at height y
  span(-face(y2) - 0.12, face(y2) + 0.12, -face(y2) - 0.12, face(y2) + 0.12, y2 - 0.16, y2 - 0.02, COPE);
  span(-A2 - 0.12, A2 + 0.12, -A2 - 0.12, A2 + 0.12, yb - 0.2, yb + 0.2, shade(BRICK, 0.88)); // footing course
  // weathered brick: faint mortar-stained courses, a lighter band under the cope, and mottled patches of darker and
  // paler brick (the reference reads mottled, not striped), each a couple of cm proud of the battered face
  for (const [f, k] of [[0.35, 0.93], [0.7, 0.95]]) {
    const yy = yb + (y2 - yb) * f, h = face(yy) + 0.02;
    span(-h, h, -h, h, yy, yy + 0.1, shade(BRICK, k));
  }
  { const h = face(y2 - 0.2) + 0.03; span(-h, h, -h, h, y2 - 0.4, y2 - 0.2, shade(BRICK, 1.06)); }
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 46; i++) {
      const t = -A2 + 0.6 + rnd() * (2 * A2 - 1.2), w = 0.5 + rnd() * 1.6, hh = 0.15 + rnd() * 0.4;
      const ya = yb + 0.2 + rnd() * (y2 - yb - 0.7 - hh), d = face(ya + hh) + 0.015;
      const k = rnd() < 0.5 ? 0.8 + rnd() * 0.1 : 1.08 + rnd() * 0.1;
      // side 0 north (-q), 1 south, 2 west (-a), 3 east
      const [a, q, sw, sd] = side < 2 ? [t, side ? d : -d, w, 0.04] : [side === 3 ? d : -d, t, 0.04, w];
      box(a, q, ya, ya + hh, sw, sd, shade(BRICK, k));
    }
  }

  // ---- slate walks: a narrow dark strip at the tier's foot (the panos show grass nearly up to the wall) and the four
  // blue-grey walks, about 4.4 m wide, out to the lower tier's edges (the south one stops at 27 m, as on the satellite)
  const W = 3.8; // walk and stair width
  const R = 0.9; // the strip at the foot
  const pv = (a0, a1, q0, q1, col = PAVE, h = 0.06) => flush(a0, a1, q0, q1, h, col, KIND.ROAD);
  pv(-A2 - R, A2 + R, -A2 - R, -A2, RING, 0.04); pv(-A2 - R, A2 + R, A2, A2 + R, RING, 0.04);
  pv(-A2 - R, -A2, -A2, A2, RING, 0.04); pv(A2, A2 + R, -A2, A2, RING, 0.04);
  pv(-W / 2 - 0.3, W / 2 + 0.3, Q0, -A2 - R); pv(-W / 2 - 0.3, W / 2 + 0.3, A2 + R, Q1);
  pv(-A1, -A2 - R, -W / 2 - 0.3, W / 2 + 0.3); pv(A2 + R, A1, -W / 2 - 0.3, W / 2 + 0.3);

  // ---- the balustrade: weathered grey stone, a plinth, square piers, openwork panels and a top rail, opened at the stairs ----
  const railing = (a0, q0, a1, q1, y, col, gaps) => {
    const L = Math.hypot(a1 - a0, q1 - q0), da = (a1 - a0) / L, dq = (q1 - q0) / L;
    const along = Math.abs(da) > 0.5;
    const wd = (l, t) => (along ? [l, t] : [t, l]);
    const segs = [];
    let t = 0;
    for (const [g0, g1] of gaps) { segs.push([t, g0]); t = g1; }
    segs.push([t, L]);
    S.kind = KIND.MASONRY;
    for (const [s0, s1] of segs) {
      if (s1 - s0 < 0.3) continue;
      const m = (s0 + s1) / 2, l = s1 - s0, ma = a0 + da * m, mq = q0 + dq * m;
      box(ma, mq, y, y + 0.2, ...wd(l, 0.34), col);
      box(ma, mq, y + 0.7, y + 0.88, ...wd(l, 0.32), shade(col, 1.06));
      // openwork panels: a frame and a lattice of upright and cross bars, open between them (the dark openings are
      // the gaps, as on the reference), in a slightly darker weathered grey
      const lat = shade(col, 0.86);
      box(ma, mq, y + 0.2, y + 0.26, ...wd(l, 0.12), lat);
      box(ma, mq, y + 0.44, y + 0.49, ...wd(l, 0.1), lat);
      box(ma, mq, y + 0.64, y + 0.7, ...wd(l, 0.12), lat);
      const k = Math.max(1, Math.round(l / 1.8));
      for (let i = 0; i <= k; i++) {
        const s = s0 + (l * i) / k;
        box(a0 + da * s, q0 + dq * s, y + 0.2, y + 0.94, 0.3, 0.3, col);
        if (i === k) break;
        const bay = l / k, nb = Math.max(2, Math.round(bay / 0.26));
        for (let j = 1; j < nb; j++) {
          const sb = s + 0.15 + ((bay - 0.3) * j) / nb;
          box(a0 + da * sb, q0 + dq * sb, y + 0.26, y + 0.64, ...wd(0.06, 0.09), lat);
        }
      }
    }
  };
  const mid = (L) => [[L / 2 - W / 2 - 0.3, L / 2 + W / 2 + 0.3]];
  const r2 = 0.2, L2 = 2 * A2 - 2 * r2;
  railing(-A2 + r2, -A2 + r2, A2 - r2, -A2 + r2, y2, STONE, mid(L2));
  railing(-A2 + r2, A2 - r2, A2 - r2, A2 - r2, y2, STONE, mid(L2));
  railing(-A2 + r2, -A2 + r2, -A2 + r2, A2 - r2, y2, STONE, mid(L2));
  railing(A2 - r2, -A2 + r2, A2 - r2, A2 - r2, y2, STONE, mid(L2));

  // ---- stairs: a grey stone flight in the middle of each side, between low brick cheek walls ----
  // (a, q): foot of the tier wall on the axis; (da, dq): outward; from ya up to yy
  const flight = (a, q, da, dq, ya, yy, n, run) => {
    const rise1 = (yy - ya) / n, tread = run / n;
    const across = Math.abs(da) > 0.5;
    S.kind = KIND.MASONRY;
    for (let i = 0; i < n; i++) {
      const o = run - tread * (i + 0.5); // step i (from the bottom) stands this far out
      const w = across ? tread : W, d = across ? W : tread;
      box(a + da * o, q + dq * o, ya - 0.3, ya + rise1 * (i + 1), w, d, STEP);
    }
    // cheek walls, sloped as a stack of short blocks
    for (const s of [-1, 1]) {
      const ca = across ? 0 : s * (W / 2 + 0.25), cq = across ? s * (W / 2 + 0.25) : 0;
      for (let i = 0; i < n; i++) {
        const o = run - tread * (i + 0.5);
        const w = across ? tread + 0.02 : 0.5, d = across ? 0.5 : tread + 0.02;
        box(a + da * o + ca, q + dq * o + cq, ya - 0.3, ya + rise1 * (i + 1) + 0.2, w, d, BRICK, { top: COPE });
      }
    }
  };
  flight(0, -A2, 0, -1, yb, y2, 7, 2.3); flight(0, A2, 0, 1, yb, y2, 7, 2.3);
  flight(-A2, 0, -1, 0, yb, y2, 7, 2.3); flight(A2, 0, 1, 0, yb, y2, 7, 2.3);

  // ---- the stone incense burner (đỉnh) on the lawn ----
  {
    const [x, z] = DINH, g = LAND_Y + rise(x, z), cs = Math.cos(ang), sn = Math.sin(ang);
    const at = (u, v) => [x + u * cs - v * sn, z + u * sn + v * cs];
    const b = (u, v, ya, yy, w, d, col, o) => { const p = at(u, v); S.box(p[0], p[1], ya, yy, w, d, ang, col, o); };
    S.kind = KIND.MASONRY;
    for (const [u, v] of [[-0.38, -0.38], [0.38, -0.38], [0.38, 0.38], [-0.38, 0.38]]) b(u, v, g - 0.1, g + 0.5, 0.16, 0.16, shade(DINH_C, 0.9));
    b(0, 0, g + 0.4, g + 0.5, 0.96, 0.96, shade(DINH_C, 0.95)); // apron over the feet
    b(0, 0, g + 0.5, g + 1.25, 0.9, 0.9, DINH_C, { taper: 1.1 });
    b(0, 0, g + 1.25, g + 1.33, 1.06, 1.06, shade(DINH_C, 1.06), { top: shade(DINH_C, 0.45) }); // the rim, dark ash inside
    for (const s of [-1, 1]) { // the two upright ears, leaning out a little at the top
      b(s * 0.42, 0, g + 1.2, g + 1.72, 0.1, 0.32, DINH_C);
      b(s * 0.47, 0, g + 1.62, g + 1.78, 0.18, 0.36, shade(DINH_C, 1.04));
    }
  }

  S.kind = keep;
}
