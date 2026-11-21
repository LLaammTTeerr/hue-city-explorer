import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { OUTER, BAC_KHUYET_DAI, wallRun } from '../hoangthanh.js';

// Lầu Tứ Phương Vô Sự (1923, Khải Định; wrecked in 1968, restored 2008–2010) on Bắc Khuyết Đài, the raised bastion at
// the middle of the Imperial City's north wall, just west of Cửa Hòa Bình. Sources and estimates: docs/places/tuphuong.md.
//   - Bắc Khuyết Đài: a rectangular platform 64.6 × 28.5 m on top of the wall, jutting out past its line. This
//     model owns the bastion's three outer sides of the Imperial City wall (hoangthanh.js; dainoi.js draws the rest
//     of the ring and skips them), so the wall, its cap and the balustrade on it are one model's: the platform's
//     fill stops at the wall's inner face. Also the paving, the two flights up from inside, the turtle-shaped
//     flower beds east and west of the pavilion and the frangipani (cây sứ) along the inner edge
//   - the pavilion: brick and cement, two storeys on a 14 × 13 m (182 m²) plan, OSM way 172802373. Ground floor
//     ringed by an arcaded verandah (hàng hiên) under a skirt roof; upper floor smaller, with a balcony all round
//     (ban công vòng quanh); each face of each storey has one door and two windows; walls washed pale yellow,
//     piers and arches cream, rails and joinery dark red-brown
//   - roofs of yellow glazed tile; on the ridge a sun disc between two dragons (hồi long), dragons on the four
//     corner ridges (bờ quyết)
// Geometry is hard-coded in the bastion's frame: u along its outer face (west → east), v inward (towards the
// Imperial City's centre), metres from the middle of the outer face. Points from OSM (ways 531016856, 172802373).
export const id = 'tuphuong';

// the wall's centre line round the bastion: where the main wall line turns out (J, west and east) and the outer
// face's corners (A, B)
const [J0, A, B, J1] = BAC_KHUYET_DAI;

const WALL = hex('#e8cf92'); // pale yellow wash
const PIER = hex('#f1e7cf'); // cream piers, arches and cornices
const JOIN = hex('#5c2f22'); // dark red-brown doors, shutters and rails
const ROOF = hex('#d99a22'); // yellow glazed tile, gone orange in the sun
const RIDGE = hex('#f0d27a');
const PAVE = hex('#b8b0a0');
const MASON = OUTER.body; // the Imperial City wall's weathered brick
const BAL = hex('#aaa496'), PANEL = hex('#c39554'); // balustrade posts and their ochre panels
const LEAF = hex('#5f7f3c'), BARK = hex('#7d7466');

export function build({ S }) {
  const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const ux = (B[0] - A[0]) / len, uz = (B[1] - A[1]) / len;
  const ang = Math.atan2(uz, ux);
  const P = (u, v) => [M[0] + u * ux - v * uz, M[1] + u * uz + v * ux];
  const P3 = (u, y, v) => { const q = P(u, v); return [q[0], y, q[1]]; };
  const box = (u, v, y0, y1, su, sv, col, opt) => { const q = P(u, v); S.box(q[0], q[1], y0, y1, su, sv, ang, col, opt); };
  const L = ([x, z]) => { const dx = x - M[0], dz = z - M[1]; return [dx * ux + dz * uz, -dx * uz + dz * ux]; };
  const keep = S.kind;

  const Y = LAND_Y;
  const yPl = Y + OUTER.h; // platform floor, level with the top of the wall body (under its 0.42 m cap)
  const D = 28.5, H = len / 2 - 0.6; // platform depth inward; half length inside the side walls

  // ---- the Imperial City wall round the bastion's three outer sides: laps its corners at A and B, ends at J0
  // against the face of the north wall coming in from the west (dainoi.js); at J1 the wall stops short of Cửa Hòa
  // Bình's gap, as dainoi.js ends it ----
  wallRun(S, J0, A, OUTER, [-1, 1]);
  wallRun(S, A, B, OUTER, [1, 1]);
  wallRun(S, B, J1, OUTER, [1, 1]);

  // ---- Bắc Khuyết Đài: the platform fill, paved on top, from the wall's inner faces inward ----
  S.kind = KIND.MASONRY;
  {
    const t = OUTER.t / 2, j0 = L(J0), j1 = L(J1), a = L(A), b = L(B);
    // the side walls' inner faces, carried on to the platform's inner edge at v = D
    const side = (p, q, s) => { const du = q[0] - p[0], dv = q[1] - p[1], n = Math.hypot(du, dv); const o = [p[0] - s * dv / n * t, p[1] + s * du / n * t]; return (v) => [o[0] + (v - o[1]) * du / dv, v]; };
    const w = side(a, j0, -1), e = side(b, j1, 1);
    const ring = [w(t), e(t), e(D), w(D)].map(([u, v]) => P(u, v));
    S.prism(ring, Y - 0.2, yPl, MASON, PAVE, { topKind: KIND.ROAD });
  }
  // the inner face's plinth and a coping along its edge
  box(0, D + 0.05, Y - 0.2, Y + 0.5, 2 * H, 0.3, shade(MASON, 0.85));
  box(0, D - 0.15, yPl - 0.05, yPl + 0.12, 2 * H, 0.5, shade(PAVE, 0.9));
  // a paved walk round the pavilion, a shade lighter
  S.kind = KIND.ROAD;
  box(0.6, 14.3, yPl, yPl + 0.03, 22, 20, shade(PAVE, 1.07), { topKind: KIND.ROAD });

  // ---- balustrade on the wall cap round the three outer sides, and along the inner edge ----
  const rail = (a, b, y0) => { // posts every ~2.4 m, a low ochre-panelled infill and a coping rail
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.5) return;
    const n = Math.max(1, Math.round(l / 2.4)), a2 = Math.atan2(b[1] - a[1], b[0] - a[0]);
    S.kind = KIND.MASONRY;
    for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n; S.box(x, z, y0, y0 + 0.92, 0.32, 0.32, a2, BAL, { top: shade(BAL, 1.1) }); }
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    S.box(mx, mz, y0, y0 + 0.16, l, 0.26, a2, BAL);
    S.box(mx, mz, y0 + 0.16, y0 + 0.66, l, 0.12, a2, PANEL);
    S.box(mx, mz, y0 + 0.66, y0 + 0.8, l, 0.24, a2, BAL);
  };
  const cap = Y + OUTER.h + OUTER.capH;
  const capEnd = OUTER.capW / 2, jl = Math.hypot(A[0] - J0[0], A[1] - J0[1]);
  const J0in = [J0[0] + (A[0] - J0[0]) * capEnd / jl, J0[1] + (A[1] - J0[1]) * capEnd / jl]; // the cap's end at J0
  rail(J0in, A, cap); rail(A, B, cap); rail(B, J1, cap);
  // inner edge: open at the head of each flight
  const sx = 24.4; // where each flight comes up (|u|)
  rail(P(-H, D - 0.2), P(-sx - 1.6, D - 0.2), yPl);
  rail(P(-sx + 0.6, D - 0.2), P(sx - 0.6, D - 0.2), yPl);
  rail(P(sx + 1.6, D - 0.2), P(H, D - 0.2), yPl);

  // ---- the two flights up from inside the Imperial City, against the inner face, climbing toward the middle ----
  {
    const n = 22, sh = (yPl - Y) / n, tr = 0.3, w = 2.2;
    for (const s of [-1, 1]) {
      S.kind = KIND.MASONRY;
      for (let k = 0; k < n; k++) {
        const u = s * (sx + 1.0 + (n - 1 - k) * tr);
        box(u, D + w / 2, Y - 0.2, Y + sh * (k + 1), tr + 0.02, w, shade(PAVE, 0.96 + 0.04 * (k % 2)), { topKind: KIND.ROAD });
      }
      // top landing, then a cheek wall with a sloping coping on the open side
      box(s * (sx - 0.2), D + w / 2, Y - 0.2, yPl, 2.4, w, shade(PAVE, 0.98), { topKind: KIND.ROAD });
      const u0 = s * (sx + 1.0 + n * tr + 0.2), u1 = s * (sx - 1.4);
      box((u0 + u1) / 2, D + w + 0.15, Y - 0.2, Y + 0.5, Math.abs(u0 - u1), 0.3, shade(MASON, 0.9));
      S.beam(P3(u0, Y + 0.7, D + w + 0.15), P3(s * (sx + 1.0), yPl + 0.75, D + w + 0.15), 0.3, 0.3, BAL);
      S.beam(P3(s * (sx + 1.0), yPl + 0.75, D + w + 0.15), P3(u1, yPl + 0.75, D + w + 0.15), 0.3, 0.3, BAL);
      // the cheek wall's fill below the coping
      for (let k = 0; k < 6; k++) {
        const t0 = k / 6, t1 = (k + 1) / 6, ua = u0 + (s * (sx + 1.0) - u0) * t0, ub = u0 + (s * (sx + 1.0) - u0) * t1;
        box((ua + ub) / 2, D + w + 0.15, Y + 0.4, Y + 0.6 + (yPl - Y) * (t0 + t1) / 2, Math.abs(ub - ua), 0.22, shade(MASON, 0.95));
      }
      box((s * (sx + 1.0) + u1) / 2, D + w + 0.15, Y + 0.4, yPl + 0.6, Math.abs(s * (sx + 1.0) - u1), 0.22, shade(MASON, 0.95));
    }
  }

  // ---- turtle-shaped flower beds east and west of the pavilion ----
  for (const s of [-1, 1]) {
    const cu = s * 19.5, cv = 14.5;
    const ell = (u0, v0, ru, rv, nseg = 14) => { const r = []; for (let i = 0; i < nseg; i++) { const t = (i / nseg) * Math.PI * 2; r.push(P(u0 + Math.cos(t) * ru, v0 + Math.sin(t) * rv)); } return r; };
    S.kind = KIND.MASONRY;
    S.prism(ell(cu, cv, 4.6, 3.4), yPl, yPl + 0.28, shade(PAVE, 0.85), hex('#5b7a37'));
    S.prism(ell(cu + s * 5.2, cv, 1.1, 0.9, 8), yPl, yPl + 0.28, shade(PAVE, 0.85), hex('#5b7a37')); // head, facing out
    for (const [du, dv] of [[2.8, 3.1], [-2.8, 3.1], [2.8, -3.1], [-2.8, -3.1]]) S.prism(ell(cu + du, cv + dv, 0.9, 0.7, 6), yPl, yPl + 0.25, shade(PAVE, 0.85), hex('#5b7a37'));
    S.kind = KIND.PLAIN;
    S.prism(ell(cu, cv, 2.6, 1.9, 10), yPl + 0.28, yPl + 0.62, hex('#6f8c3d'), hex('#b24a5a')); // the shell planted in flowers
  }

  // ---- frangipani along the inner edge: squat forked trunks, flat sparse crowns ----
  for (const u of [-28, -17, -10.5, 10.5, 17, 28]) {
    const v = D - 2.2, q = P(u, v);
    S.kind = KIND.PLAIN;
    S.cyl(q[0], q[1], yPl, yPl + 1.4, 0.2, 0.16, 5, BARK, { cap: false });
    for (const [du, dv] of [[0.9, 0.3], [-0.8, 0.5], [0.1, -0.9]]) {
      S.beam(P3(u, yPl + 1.3, v), P3(u + du, yPl + 2.4, v + dv), 0.14, 0.14, BARK);
      const t = P(u + du * 1.2, v + dv * 1.2);
      S.cyl(t[0], t[1], yPl + 2.2, yPl + 2.9, 1.1, 0.7, 6, LEAF);
    }
  }

  // ---- the pavilion ----
  const pc = L([-1384.45, -335.6]); // OSM outline's centre
  const cu = pc[0], cv = pc[1];
  const Q = (u, v) => P(cu + u, cv + v), Q3 = (u, y, v) => P3(cu + u, y, cv + v);
  const qb = (u, v, y0, y1, su, sv, col, opt) => box(cu + u, cv + v, y0, y1, su, sv, col, opt);
  const hu = 7.3, hv = 6.7; // half plan along u and v (14.6 × 13.4 m mapped)
  const yF = yPl + 0.6; // ground floor on a 0.6 m plinth
  const yE1 = yF + 3.7; // lower eave
  const yDk = yF + 4.55; // balcony deck
  const yE2 = yDk + 3.25; // upper eave
  const rh = 2.75; // upper roof

  // plinth with three steps at the middle of each face
  S.kind = KIND.MASONRY;
  qb(0, 0, yPl - 0.05, yF, 2 * hu, 2 * hv, shade(PAVE, 0.92), { top: hex('#cfc6b4'), topKind: KIND.ROAD });
  for (const [fu, fv] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (let k = 1; k <= 3; k++) {
    const off = (fu ? hu : hv) + 0.3 * k - 0.15, w = 2.6;
    qb(fu * off, fv * off, yPl - 0.05, yF - 0.15 * k, fu ? 0.3 : w, fu ? w : 0.3, shade(PAVE, 0.95), { topKind: KIND.ROAD });
  }

  // closed core: walls, a door and two windows on each face
  const ku = 5.5, kv = 4.9;
  S.kind = KIND.PLAIN;
  qb(0, 0, yF, yDk - 0.2, 2 * ku, 2 * kv, WALL, { top: shade(WALL, 0.8) });
  S.kind = KIND.PLAIN;
  const openings = (hU, hV, y0, dh, wh, side) => { // door in the middle, a window either side
    for (const [fu, fv] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const half = fu ? hV : hU, off = (fu ? hU : hV) + 0.03;
      for (const t of [-0.55, 0, 0.55]) {
        const door = t === 0, w = door ? 1.3 : 1.0, y1 = door ? y0 + dh : y0 + wh + 0.9, ya = door ? y0 : y0 + 0.9;
        const a = t * half;
        qb(fu ? fu * off : a, fv ? fv * off : a, ya - 0.08, y1 + 0.22, fu ? 0.06 : w + 0.3, fu ? w + 0.3 : 0.06, PIER);
        qb(fu ? fu * (off + 0.03) : a, fv ? fv * (off + 0.03) : a, ya, y1, fu ? 0.06 : w, fu ? w : 0.06, JOIN);
        if (side) for (const s of [-1, 1]) { // open shutters folded back either side of the upper windows
          const b = a + s * (w / 2 + 0.25);
          qb(fu ? fu * (off + 0.05) : b, fv ? fv * (off + 0.05) : b, ya, y1, fu ? 0.05 : 0.45, fu ? 0.45 : 0.05, shade(JOIN, 1.25));
        }
      }
    }
  };
  openings(ku, kv, yF, 2.7, 1.6, false);

  // verandah arcade: square cream piers, round-headed arches between them (stepped), a cornice band over them
  {
    const nu = 5, nv = 5, pw = 0.5, yFr = yE1 - 0.8; // underside of the frieze, where the arch crowns touch
    const pts = [];
    for (let i = 0; i <= nu; i++) for (const s of [-1, 1]) pts.push([-hu + 0.3 + (2 * hu - 0.6) * i / nu, s * (hv - 0.3)]);
    for (let i = 1; i < nv; i++) for (const s of [-1, 1]) pts.push([s * (hu - 0.3), -hv + 0.3 + (2 * hv - 0.6) * i / nv]);
    S.kind = KIND.PLAIN;
    for (const [u, v] of pts) { qb(u, v, yF, yE1 - 0.35, pw, pw, PIER); qb(u, v, yF, yF + 0.3, pw + 0.16, pw + 0.16, shade(PIER, 0.92)); }
    // the frieze over the arcade, round all four sides
    for (const s of [-1, 1]) { qb(0, s * (hv - 0.3), yFr, yE1, 2 * hu, 0.5, PIER); qb(s * (hu - 0.3), 0, yFr, yE1, 0.5, 2 * hv - 0.6, PIER); }
    // arch haunches: three stepped blocks in each upper corner of each bay
    const haunch = (a, b, fixed, alongU) => {
      const span = b - a - pw, r = span / 2, mid = (a + b) / 2;
      // the arch is a half circle springing at yS; its crown touches the frieze
      const yS = yFr - r;
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        const wk = r / 3, d = r - wk * (k + 0.5), at = mid + s * d; // block k's centre, d from the arch's middle
        const yb = yS + Math.sqrt(Math.max(0, r * r - d * d)); // the intrados over that point
        const ytop = yFr;
        if (ytop - yb < 0.04) continue;
        if (alongU) qb(at, fixed, yb, ytop, wk, 0.44, PIER);
        else qb(fixed, at, yb, ytop, 0.44, wk, PIER);
      }
    };
    for (const s of [-1, 1]) {
      for (let i = 0; i < nu; i++) { const a = -hu + 0.3 + (2 * hu - 0.6) * i / nu, b = -hu + 0.3 + (2 * hu - 0.6) * (i + 1) / nu; haunch(a, b, s * (hv - 0.3), true); }
      for (let i = 0; i < nv; i++) { const a = -hv + 0.3 + (2 * hv - 0.6) * i / nv, b = -hv + 0.3 + (2 * hv - 0.6) * (i + 1) / nv; haunch(a, b, s * (hu - 0.3), false); }
    }
    // a low balustrade between the piers, open at the middle bay of each face
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) {
      for (let i = 0; i < nu; i++) if (i !== 2) { const a = -hu + 0.3 + (2 * hu - 0.6) * (i + 0.5) / nu; qb(a, s * (hv - 0.3), yF, yF + 0.75, (2 * hu - 0.6) / nu - pw, 0.22, PIER); }
      for (let i = 0; i < nv; i++) if (i !== 2) { const a = -hv + 0.3 + (2 * hv - 0.6) * (i + 0.5) / nv; qb(s * (hu - 0.3), a, yF, yF + 0.75, 0.22, (2 * hv - 0.6) / nv - pw, PIER); }
    }
    // verandah ceiling
    qb(0, 0, yE1 - 0.1, yE1, 2 * hu - 0.4, 2 * hv - 0.4, shade(PIER, 0.7), { bottom: true });
  }

  // skirt roof over the verandah: from the lower eave up to the balcony's edge (four trapezoids, hipped corners)
  const bu = ku + 0.15, bv = kv + 0.15; // balcony edge (half plan)
  {
    const ov = 0.75, eu = hu + ov, ev = hv + ov;
    const lo = [[-eu, -ev], [eu, -ev], [eu, ev], [-eu, ev]], hi = [[-bu, -bv], [bu, -bv], [bu, bv], [-bu, bv]];
    S.kind = KIND.GLAZED;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, mu = (lo[i][0] + lo[j][0]) / 2, mv = (lo[i][1] + lo[j][1]) / 2;
      const n = Q(mu, mv), c = Q(0, 0);
      const corner = (p, y, lift) => Q3(p[0], y + lift, p[1]);
      S.quad(corner(lo[i], yE1, 0.25), corner(lo[j], yE1, 0.25), corner(hi[j], yDk - 0.2, 0), corner(hi[i], yDk - 0.2, 0), ROOF, [n[0] - c[0], 1.6, n[1] - c[1]]);
      // fascia under the eave
      S.kind = KIND.PLAIN;
      S.beam(corner(lo[i], yE1 - 0.05, 0.25), corner(lo[j], yE1 - 0.05, 0.25), 0.18, 0.22, shade(ROOF, 0.6));
      // the hip ridge up each corner, in the ridge tile colour
      S.beam(corner(lo[i], yE1 + 0.1, 0.25), corner(hi[i], yDk - 0.1, 0), 0.2, 0.18, RIDGE);
      S.kind = KIND.GLAZED;
    }
    // little upturned horns at the four lower corners
    S.kind = KIND.PLAIN;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) S.beam(Q3(su * eu, yE1 + 0.3, sv * ev), Q3(su * (eu + 0.35), yE1 + 0.75, sv * (ev + 0.35)), 0.16, 0.16, RIDGE);
  }

  // upper floor: the balcony deck, its dark baluster rail, the walls with a door and two windows a side
  S.kind = KIND.PLAIN;
  qb(0, 0, yDk - 0.22, yDk, 2 * bu, 2 * bv, shade(PIER, 0.85), { bottom: true });
  {
    const R = [[-bu + 0.1, -bv + 0.1], [bu - 0.1, -bv + 0.1], [bu - 0.1, bv - 0.1], [-bu + 0.1, bv - 0.1]];
    for (let i = 0; i < 4; i++) {
      const a = R[i], b = R[(i + 1) % 4], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(l / 0.45);
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; qb(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, yDk, yDk + 0.95, 0.09, 0.09, JOIN); }
      S.beam(Q3(a[0], yDk + 0.98, a[1]), Q3(b[0], yDk + 0.98, b[1]), 0.14, 0.12, JOIN);
      S.beam(Q3(a[0], yDk + 0.08, a[1]), Q3(b[0], yDk + 0.08, b[1]), 0.12, 0.12, JOIN);
      qb(a[0], a[1], yDk, yDk + 1.1, 0.24, 0.24, JOIN); // corner newels
    }
  }
  const wu = 4.4, wv = 3.85;
  S.kind = KIND.PLAIN;
  qb(0, 0, yDk, yE2, 2 * wu, 2 * wv, WALL, { top: shade(ROOF, 0.7) });
  for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) qb(su * wu, sv * wv, yDk, yE2, 0.42, 0.42, PIER); // corner pilasters
  qb(0, 0, yE2 - 0.35, yE2, 2 * wu + 0.3, 2 * wv + 0.3, PIER); // cornice
  S.kind = KIND.PLAIN;
  openings(wu, wv, yDk, 2.3, 1.3, false);
  // slim posts at the balcony corners carrying the upper eave
  S.kind = KIND.TIMBER;
  for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const q = Q(su * (bu - 0.25), sv * (bv - 0.25)); S.cyl(q[0], q[1], yDk, yE2, 0.11, 0.1, 6, JOIN, { cap: false }); }

  // upper roof: hipped, yellow glazed tile, flared with horns at the corners
  S.kind = KIND.GLAZED;
  { const c = Q(0, 0); S.hip(c[0], c[1], 2 * wu, 2 * wv, ang, yE2, rh, ROOF, { flare: 0.45, over: 1.25, hips: true, glazed: true, segs: 3, fascia: 0.24, fasciaCol: shade(ROOF, 0.6), ridgeCol: RIDGE }); }
  // ridge ornament: a sun disc in the middle between two dragons rising from the ridge
  S.kind = KIND.PLAIN;
  {
    const yR = yE2 + rh + 0.15, rd = 0.42, n = 12, c = Q3(0, yR + rd + 0.1, 0);
    for (const s of [-1, 1]) for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const pA = Q3(Math.cos(a0) * rd, yR + rd + 0.1 + Math.sin(a0) * rd, s * 0.06), pB = Q3(Math.cos(a1) * rd, yR + rd + 0.1 + Math.sin(a1) * rd, s * 0.06);
      const nv = Q(0, s), c0 = Q(0, 0);
      S.tri([c[0] + (nv[0] - c0[0]) * 0.06, c[1], c[2] + (nv[1] - c0[1]) * 0.06], pA, pB, hex('#e9b62f'), [nv[0] - c0[0], 0, nv[1] - c0[1]]);
    }
    qb(0, 0, yR - 0.2, yR + 0.12, 0.35, 0.3, RIDGE);
    for (const s of [-1, 1]) { // each dragon: a body arching from the ridge end toward the disc, head raised
      S.beam(Q3(s * 1.6, yR - 0.1, 0), Q3(s * 1.1, yR + 0.45, 0), 0.2, 0.2, RIDGE);
      S.beam(Q3(s * 1.1, yR + 0.45, 0), Q3(s * 0.65, yR + 0.25, 0), 0.18, 0.18, RIDGE);
      S.beam(Q3(s * 0.65, yR + 0.25, 0), Q3(s * 0.55, yR + 0.7, 0), 0.2, 0.2, RIDGE);
    }
  }
  S.kind = keep;
  return null;
}
