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
// Estimated: the lower tier stops short of the Xã Tắc lane on the south (q = 24.5 m: the south band of the 73 m tier is
// under the lane and houses today); the line, height and colours of the low wall; railing form; step counts.

// the upper tier's OSM square, model metres; its first edge runs along the north (back) face
const TOP = [[-1901.7, 424.0], [-1877.1, 406.1], [-1859.3, 430.1], [-1883.9, 448.1]];

const H1 = 1.2, H2 = 1.6; // tier heights
const A1 = 36.5, Q0 = -36.5, Q1 = 24.5; // lower tier: half-width across, north and south edges (q toward the south)
const A2 = 15.2; // upper tier half-side
const LAWN = hex('#8fa461'), LAWN2 = hex('#9aae6a');
const BRICK = hex('#857668'), LATERITE = hex('#8d6449'), COPE = hex('#b8ad98');
const RED = hex('#9b3f2f'), YELLOW = hex('#d6ad45'), PAVE = hex('#c9bfac'), STEP = hex('#b3a993');
const WALL = hex('#cfc4ab'), WALLCAP = hex('#6f6458');

export const id = 'xatac';

export function build({ S }) {
  const c = TOP.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
  const ex = TOP[1][0] - TOP[0][0], ez = TOP[1][1] - TOP[0][1], el = Math.hypot(ex, ez);
  const ux = ex / el, uz = ez / el, ang = Math.atan2(uz, ux);
  // a across (east-north-east), q toward the citadel's south (south-south-east); the altar faces -q (north)
  const P = (a, q) => [c[0] + a * ux - q * uz, c[1] + a * uz + q * ux];
  const gY = (a, q) => { const p = P(a, q); return LAND_Y + rise(p[0], p[1]); };
  let yb = Infinity;
  for (let a = -A1; a <= A1; a += 12) for (let q = Q0; q <= Q1; q += 12) yb = Math.min(yb, gY(a, q));
  const y1 = yb + H1, y2 = y1 + H2;
  const box = (a, q, ya, yy, w, d, col, o) => { const p = P(a, q); S.box(p[0], p[1], ya, yy, w, d, ang, col, o); };
  // a box given by its local extents
  const span = (a0, a1, q0, q1, ya, yy, col, o) => box((a0 + a1) / 2, (q0 + q1) / 2, ya, yy, a1 - a0, q1 - q0, col, o);
  const keep = S.kind;

  // ---- the two tiers ----
  S.kind = KIND.MASONRY;
  span(-A1, A1, Q0, Q1, yb - 0.6, y1, BRICK, { top: LAWN, topKind: KIND.GROUND });
  span(-A1 - 0.1, A1 + 0.1, Q0 - 0.1, Q1 + 0.1, y1 - 0.14, y1 - 0.02, COPE); // coping band under the railing
  span(-A2, A2, -A2, A2, y1 - 0.05, y2, LATERITE, { top: LAWN2, topKind: KIND.GROUND });
  span(-A2 - 0.1, A2 + 0.1, -A2 - 0.1, A2 + 0.1, y2 - 0.16, y2 - 0.02, COPE);

  // ---- paved walks on the lower tier: the ring round the upper tier's foot and the four walks out to the edges ----
  S.kind = KIND.ROAD;
  const pv = (a0, a1, q0, q1) => span(a0, a1, q0, q1, y1, y1 + 0.03, PAVE);
  pv(-A2 - 2.2, A2 + 2.2, -A2 - 2.2, -A2); pv(-A2 - 2.2, A2 + 2.2, A2, A2 + 2.2);
  pv(-A2 - 2.2, -A2, -A2, A2); pv(A2, A2 + 2.2, -A2, A2);
  const W = 3.8; // walk and stair width
  pv(-W / 2, W / 2, Q0, -A2 - 2.2); pv(-W / 2, W / 2, A2 + 2.2, Q1);
  pv(-A1, -A2 - 2.2, -W / 2, W / 2); pv(A2 + 2.2, A1, -W / 2, W / 2);

  // ---- railings: piers, a top rail and a plinth, opened at the stairs ----
  const railing = (a0, q0, a1, q1, y, col, gaps) => {
    const L = Math.hypot(a1 - a0, q1 - q0), da = (a1 - a0) / L, dq = (q1 - q0) / L;
    const segs = [];
    let t = 0;
    for (const [g0, g1] of gaps) { segs.push([t, g0]); t = g1; }
    segs.push([t, L]);
    for (const [s0, s1] of segs) {
      if (s1 - s0 < 0.3) continue;
      const m = (s0 + s1) / 2, l = s1 - s0, ma = a0 + da * m, mq = q0 + dq * m;
      const w = Math.abs(da) > 0.5 ? l : 0.2, d = Math.abs(da) > 0.5 ? 0.2 : l;
      S.kind = KIND.MASONRY;
      box(ma, mq, y, y + 0.22, w, d, col);
      box(ma, mq, y + 0.72, y + 0.88, Math.abs(da) > 0.5 ? l : 0.26, Math.abs(da) > 0.5 ? 0.26 : l, shade(col, 1.08));
      const k = Math.max(1, Math.round(l / 1.6));
      for (let i = 0; i <= k; i++) {
        const s = s0 + (l * i) / k;
        box(a0 + da * s, q0 + dq * s, y + 0.22, y + 0.72, 0.24, 0.24, shade(col, 0.92));
      }
    }
  };
  const mid = (L) => [[L / 2 - W / 2, L / 2 + W / 2]];
  const r1 = 0.15, r2 = 0.15;
  railing(-A1 + r1, Q0 + r1, A1 - r1, Q0 + r1, y1, RED, mid(2 * A1 - 2 * r1)); // north
  railing(-A1 + r1, Q1 - r1, A1 - r1, Q1 - r1, y1, RED, mid(2 * A1 - 2 * r1)); // south
  const g = -Q0 - r1; // the side gaps sit on the altar's axis (q = 0)
  railing(-A1 + r1, Q0 + r1, -A1 + r1, Q1 - r1, y1, RED, [[g - W / 2, g + W / 2]]);
  railing(A1 - r1, Q0 + r1, A1 - r1, Q1 - r1, y1, RED, [[g - W / 2, g + W / 2]]);
  const L2 = 2 * A2 - 2 * r2;
  railing(-A2 + r2, -A2 + r2, A2 - r2, -A2 + r2, y2, YELLOW, mid(L2));
  railing(-A2 + r2, A2 - r2, A2 - r2, A2 - r2, y2, YELLOW, mid(L2));
  railing(-A2 + r2, -A2 + r2, -A2 + r2, A2 - r2, y2, YELLOW, mid(L2));
  railing(A2 - r2, -A2 + r2, A2 - r2, A2 - r2, y2, YELLOW, mid(L2));

  // ---- stairs: a flight in the middle of each side of each tier, between low cheek walls ----
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
        box(a + da * o + ca, q + dq * o + cq, ya - 0.3, ya + rise1 * (i + 1) + 0.35, w, d, BRICK, { top: COPE });
      }
    }
  };
  flight(0, -A2, 0, -1, y1, y2, 7, 2.1); flight(0, A2, 0, 1, y1, y2, 7, 2.1);
  flight(-A2, 0, -1, 0, y1, y2, 7, 2.1); flight(A2, 0, 1, 0, y1, y2, 7, 2.1);
  flight(0, Q0, 0, -1, yb, y1, 6, 1.8); flight(0, Q1, 0, 1, yb, y1, 6, 1.8);
  flight(-A1, 0, -1, 0, yb, y1, 6, 1.8); flight(A1, 0, 1, 0, yb, y1, 6, 1.8);

  // ---- the low enclosing wall, gates north, east and west; the south side is the Xã Tắc lane ----
  const WA = 42.5, WQ0 = -46, WQ1 = 25, WH = 1.1, gate = 4.4;
  const wall = (a0, q0, a1, q1) => {
    const L = Math.hypot(a1 - a0, q1 - q0), n = Math.max(1, Math.round(L / 10));
    for (let i = 0; i < n; i++) { // in pieces, so the wall follows the ground
      const ta = a0 + ((a1 - a0) * (i + 0.5)) / n, tq = q0 + ((q1 - q0) * (i + 0.5)) / n, y = gY(ta, tq);
      const across = Math.abs(a1 - a0) > Math.abs(q1 - q0);
      S.kind = KIND.MASONRY;
      box(ta, tq, y - 0.4, y + WH, across ? L / n + 0.02 : 0.4, across ? 0.4 : L / n + 0.02, WALL);
      box(ta, tq, y + WH, y + WH + 0.12, across ? L / n + 0.02 : 0.52, across ? 0.52 : L / n + 0.02, WALLCAP);
    }
  };
  wall(-WA, WQ0, -gate / 2, WQ0); wall(gate / 2, WQ0, WA, WQ0);
  wall(-WA, WQ0, -WA, -gate / 2); wall(-WA, gate / 2, -WA, WQ1);
  wall(WA, WQ0, WA, -gate / 2); wall(WA, gate / 2, WA, WQ1);
  // gate posts (trụ): square brick piers with a moulded cap and a small lotus finial
  const post = (a, q) => {
    const y = gY(a, q);
    S.kind = KIND.MASONRY;
    box(a, q, y - 0.3, y + 2.6, 0.75, 0.75, WALL);
    box(a, q, y + 2.6, y + 2.8, 0.95, 0.95, WALLCAP);
    box(a, q, y + 2.8, y + 3.1, 0.55, 0.55, WALL, { taper: 0.6 });
    box(a, q, y + 3.1, y + 3.35, 0.3, 0.3, WALLCAP, { taper: 0.3 });
  };
  for (const s of [-1, 1]) {
    post(s * (gate / 2 + 0.3), WQ0); // north gate
    post(-WA, s * (gate / 2 + 0.3)); // east and west gates
    post(WA, s * (gate / 2 + 0.3));
  }
  // walks from the gates to the lower stairs
  S.kind = KIND.ROAD;
  const walk = (a0, a1, q0, q1) => { const y = gY((a0 + a1) / 2, (q0 + q1) / 2); span(a0, a1, q0, q1, y - 0.1, y + 0.04, PAVE); };
  walk(-W / 2, W / 2, WQ0 - 0.2, Q0 - 1.8);
  walk(-WA - 0.2, -A1 - 1.8, -W / 2, W / 2); walk(A1 + 1.8, WA + 0.2, -W / 2, W / 2);

  S.kind = keep;
}
