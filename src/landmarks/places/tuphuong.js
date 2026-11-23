import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { OUTER, BAC_KHUYET_DAI, wallRun } from '../hoangthanh.js';

// Lầu Tứ Phương Vô Sự (1923, Khải Định; wrecked in 1968, restored 2008–2010) on Bắc Khuyết Đài, the raised bastion at
// the middle of the Imperial City's north wall, just west of Cửa Hòa Bình. Sources and estimates: docs/places/tuphuong.md.
//   - Bắc Khuyết Đài: a rectangular platform 64.6 × 28.5 m on top of the wall, jutting out past its line. This
//     model owns the bastion's three outer sides of the Imperial City wall (hoangthanh.js; dainoi.js draws the rest
//     of the ring and skips them), so the wall, its cap and the brick parapet on it are one model's: the platform's
//     fill stops at the wall's inner face. Also the lawn and terracotta walks, the two flights up from inside, the turtle-shaped
//     flower beds east and west of the pavilion and the frangipani (cây sứ) along the inner edge
//   - the pavilion: brick and cement, two storeys on a 14 × 13 m (182 m²) plan, OSM way 172802373. Ground floor
//     ringed by an arcaded verandah (hàng hiên) under a skirt roof; upper floor smaller, with a balcony all round
//     (ban công vòng quanh); each face of each storey has one door and two windows; walls washed pale yellow,
//     piers and arches cream, joinery dark red-brown, the upper balcony's balusters grey-blue
//   - roofs: sources say yellow glazed tile, but Street View shows them uniformly dark and matte, and so are they
//     drawn; on the ridge a sun disc between two dragons (hồi long), openwork dragons at all eight corners, dark
// Geometry is hard-coded in the bastion's frame: u along its outer face (west → east), v inward (towards the
// Imperial City's centre), metres from the middle of the outer face. Points from OSM (ways 531016856, 172802373).
export const id = 'tuphuong';

// the wall's centre line round the bastion: where the main wall line turns out (J, west and east) and the outer
// face's corners (A, B)
const [J0, A, B, J1] = BAC_KHUYET_DAI;

const WALL = hex('#e8cf92'); // pale yellow wash
const PIER = hex('#f1e7cf'); // cream piers, arches and cornices
const JOIN = hex('#5c2f22'); // dark red-brown doors, shutters and rails
const ROOF = hex('#504640'); // weathered tile, matte: Street View reads the roofs uniformly dark, not yellow
const RIDGE = shade(ROOF, 0.82); // ridges and hips a shade darker than the tile
const ORN = hex('#2f2b29'); // the openwork dragons and ornaments: dark, as the panoramas show them
const UPPER = hex('#4a3426'); // the upper storey's dark timber walls
const PAVE = hex('#b8b0a0'); // stone steps and plinth
const LAWN = hex('#7f9a52'), TERRA = hex('#9c624e'), BED = hex('#5f7d3a'); // the platform's lawn, terracotta walks, planting
const MASON = OUTER.body; // the Imperial City wall's weathered brick
const BAL = shade(MASON, 0.92); // the inner edge's dark stone rail and the stair copings
const RELIEF = hex('#e3cf98'); // the arcade's openwork relief panels, washed like the walls
const BALUS = hex('#7f8b93'); // the upper balcony's grey-blue balusters (visitor's photo sphere)
const LEAF = hex('#5f7f3c'), BARK = hex('#7d7466');
// the pavilion's centre in the bastion's frame (u, v), from the satellite (see the pavilion below)
const PAV = [-0.6, 10.2];

export function build({ data, S }) {
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

  // ---- Bắc Khuyết Đài: the platform fill, from the wall's inner faces inward; lawn on top (the satellite shows it
  // mostly grass under trees) ----
  S.kind = KIND.MASONRY;
  {
    const t = OUTER.t / 2, j0 = L(J0), j1 = L(J1), a = L(A), b = L(B);
    // the side walls' inner faces, carried on to the platform's inner edge at v = D
    const side = (p, q, s) => { const du = q[0] - p[0], dv = q[1] - p[1], n = Math.hypot(du, dv); const o = [p[0] - s * dv / n * t, p[1] + s * du / n * t]; return (v) => [o[0] + (v - o[1]) * du / dv, v]; };
    const w = side(a, j0, -1), e = side(b, j1, 1);
    const ring = [w(t), e(t), e(D), w(D)].map(([u, v]) => P(u, v));
    S.prism(ring, Y - 0.2, yPl, MASON, LAWN, { topKind: KIND.GROUND });
  }
  // the inner face's plinth and a stone coping along its edge
  box(0, D + 0.05, Y - 0.2, Y + 0.5, 2 * H, 0.3, shade(MASON, 0.85));
  box(0, D - 0.15, yPl - 0.05, yPl + 0.12, 2 * H, 0.5, BAL);
  // terracotta walks (the visitor's photo sphere by the pavilion): round the pavilion outside a planted strip against
  // its plinth, along the inner side from one flight's head to the other, and up to each head
  S.kind = KIND.ROAD;
  {
    const yW = yPl + 0.03, pu = PAV[0], pv = PAV[1];
    const ou = 7.0 + 0.9 + 3.0, ov = 6.5 + 0.9 + 3.0; // the ring's outer half sizes
    const v0 = Math.max(1.4, pv - ov), v1 = pv + ov;
    box(pu, (v0 + v1) / 2, yPl, yW, 2 * ou, v1 - v0, TERRA, { topKind: KIND.ROAD });
    const vW0 = pv + 6.5 + 0.9, vW1 = vW0 + 3.6; // the walk along the inner side
    box(0, (vW0 + vW1) / 2, yPl, yW, 2 * 25.6, vW1 - vW0, TERRA, { topKind: KIND.ROAD });
    for (const s of [-1, 1]) box(s * 24.4, (vW1 + D - 0.4) / 2, yPl, yW, 2.6, D - 0.4 - vW1, TERRA, { topKind: KIND.ROAD });
  }
  // the planted strip against the plinth, open at the steps in the middle of each face
  S.kind = KIND.PLAIN;
  for (const [fu, fv] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const half = fu ? 6.5 + 0.9 : 7.0 + 0.9, off = (fu ? 7.0 : 6.5) + 0.45;
    for (const s of [-1, 1]) {
      const c = s * (1.35 + half) / 2, l = half - 1.35;
      box(PAV[0] + (fu ? fu * off : c), PAV[1] + (fv ? fv * off : c), yPl + 0.03, yPl + 0.2, fu ? 0.9 : l, fu ? l : 0.9, BED, { top: shade(BED, 1.08) });
    }
  }

  // ---- the parapet on the wall cap round the three outer sides: solid weathered brick in the wall's own colours,
  // with a coping and low piers (both car panoramas and the photo sphere show no balustrade and no ochre) ----
  const parapet = (a, b, y0, lapA, lapB) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.5) return;
    const a2 = Math.atan2(b[1] - a[1], b[0] - a[0]), dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l;
    const th = 0.62, e0 = lapA ? th / 2 : 0, e1 = lapB ? th / 2 : 0, L2 = l + e0 + e1;
    const mx = a[0] + dx * (L2 / 2 - e0), mz = a[1] + dz * (L2 / 2 - e0);
    S.kind = KIND.MASONRY;
    S.box(mx, mz, y0, y0 + 0.95, L2, th, a2, shade(MASON, 0.96), { top: OUTER.cap });
    S.box(mx, mz, y0 + 0.95, y0 + 1.07, L2 + 0.04, th + 0.1, a2, OUTER.cap);
    const n = Math.max(1, Math.round(l / 4.2));
    for (let i = 0; i <= n; i++) { const x = a[0] + dx * l * i / n, z = a[1] + dz * l * i / n; S.box(x, z, y0, y0 + 1.2, 0.72, 0.72, a2, shade(MASON, 0.88), { top: OUTER.cap }); }
  };
  const cap = Y + OUTER.h + OUTER.capH;
  const capEnd = OUTER.capW / 2, jl = Math.hypot(A[0] - J0[0], A[1] - J0[1]);
  const J0in = [J0[0] + (A[0] - J0[0]) * capEnd / jl, J0[1] + (A[1] - J0[1]) * capEnd / jl]; // the cap's end at J0
  parapet(J0in, A, cap, false, true); parapet(A, B, cap, true, true); parapet(B, J1, cap, true, false);
  // ---- the inner edge: a low dark stone rail (posts and a solid infill), open at the head of each flight ----
  const rail = (a, b, y0) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.5) return;
    const n = Math.max(1, Math.round(l / 2.4)), a2 = Math.atan2(b[1] - a[1], b[0] - a[0]);
    S.kind = KIND.MASONRY;
    for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n; S.box(x, z, y0, y0 + 0.92, 0.32, 0.32, a2, BAL, { top: shade(BAL, 1.1) }); }
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    S.box(mx, mz, y0, y0 + 0.66, l, 0.16, a2, shade(MASON, 0.85));
    S.box(mx, mz, y0 + 0.66, y0 + 0.8, l, 0.24, a2, BAL);
  };
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
    const cu = s * 20.5, cv = 12;
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

  // ---- broadleaf trees on the platform: real instanced foliage lifted onto Bắc Khuyết Đài via S.stand ----
  if (Array.isArray(data?.trees)) {
    for (const [u, v, sc] of [[-15, 2.5, 11], [15.6, 2.2, 9], [21.7, 8.5, 9], [30, 18.5, 10]]) {
      const q = P(u, v);
      data.trees.push(Math.round(q[0] * 10), Math.round(q[1] * 10), sc, 4);
    }
  }
  (S.stand = S.stand || []).push((x, z) => {
    const [u, v] = L([x, z]);
    return Math.abs(u) <= H && v >= 0 && v <= D ? OUTER.h : 0;
  });

  // ---- the pavilion ----
  // OSM way 172802373 centres it at u 0.9, v 14.3, but on the satellite its lower eaves are centred near u 0.9, v 9.5
  // while the bastion's own outline (way 531016856), the Hòa Bình gate and the side walls all sit on the imagery: the
  // pavilion outline alone is drawn ~4.5 m inward. The two car panoramas on Đặng Thái Thân put it 1.5–2.5 m further
  // toward -u than the satellite does, which is the satellite's northward lean on a roof 7–14 m up; PAV splits that.
  // It is re-framed here, keeping its plan and axis (the bastion's).
  const cu = PAV[0], cv = PAV[1];
  const Q = (u, v) => P(cu + u, cv + v), Q3 = (u, y, v) => P3(cu + u, y, cv + v);
  const qb = (u, v, y0, y1, su, sv, col, opt) => box(cu + u, cv + v, y0, y1, su, sv, col, opt);
  const hu = 7.0, hv = 6.5; // half plan: 14 × 13 m
  // heights read off the Street View panoramas on Đặng Thái Thân (docs/places/tuphuong.md)
  const yF = yPl + 0.45; // ground floor on a low plinth
  const yE1 = yPl + 3.5; // lower eave edge
  const yDk = yPl + 5.3; // balcony deck, where the skirt roof ends
  const yE2 = yPl + 7.15; // upper eave edge
  const rh = 3.1; // upper roof rise: ridge 10.25 m over the platform
  const WOOD = shade(JOIN, 1.15);
  // an openwork dragon (the panoramas show dark, many-spined silhouettes at the ridge and all eight corners), drawn
  // in the vertical plane through base along the plan direction dir (pavilion frame): the body leans out along dir
  // and the head curls back over it; s scales it (s 1 ≈ 1.8 m tall)
  const dragon = (base, dir, s) => {
    const dx = dir[0] * ux - dir[1] * uz, dz = dir[0] * uz + dir[1] * ux;
    const at = ([t, h]) => [base[0] + dx * t * s, base[1] + h * s, base[2] + dz * t * s];
    const spine = [[0, 0], [0.3, 0.35], [0.55, 0.75], [0.5, 1.15], [0.28, 1.4], [0.02, 1.32], [0.08, 1.1]];
    const fins = [[1, [0.65, 0.42]], [2, [0.92, 0.92]], [3, [0.85, 1.45]], [4, [0.35, 1.78]], [5, [-0.22, 1.6]], [0, [-0.3, 0.15]], [6, [0.3, 0.35]], [2, [0.3, 0.9]]];
    const keepK = S.kind; S.kind = KIND.PLAIN;
    for (let i = 1; i < spine.length; i++) S.beam(at(spine[i - 1]), at(spine[i]), (i < 4 ? 0.34 : 0.24) * s, (i < 4 ? 0.3 : 0.22) * s, ORN);
    for (const [i, p] of fins) S.beam(at(spine[i]), at(p), 0.16 * s, 0.17 * s, ORN);
    // the body's openwork filled in as a solid fan, faced both ways, so the silhouette reads full from afar
    const hub = at([0.32, 0.92]), nrm = [-dz, 0, dx], back = [dz, 0, -dx];
    for (let i = 1; i < spine.length - 1; i++) {
      const p0 = at(spine[i]), p1 = at(spine[i + 1]);
      S.tri(hub, p0, p1, ORN, nrm); S.tri(hub, p1, p0, ORN, back);
    }
    S.kind = keepK;
  };

  // plinth with three steps at the middle of each face
  S.kind = KIND.MASONRY;
  qb(0, 0, yPl - 0.05, yF, 2 * hu, 2 * hv, shade(PAVE, 0.92), { top: hex('#cfc6b4'), topKind: KIND.ROAD });
  for (const [fu, fv] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (let k = 1; k <= 3; k++) {
    const off = (fu ? hu : hv) + 0.3 * k - 0.15, w = 2.4;
    qb(fu * off, fv * off, yPl - 0.05, yF - 0.15 * k, fu ? 0.3 : w, fu ? w : 0.3, shade(PAVE, 0.95), { topKind: KIND.ROAD });
  }

  // closed core: walls, a door and two windows on each face
  const ku = 4.9, kv = 4.4;
  S.kind = KIND.PLAIN;
  qb(0, 0, yF, yDk - 0.2, 2 * ku, 2 * kv, WALL, { top: shade(WALL, 0.8) });
  const openings = (hU, hV, y0, dh, wh) => { // door in the middle, a louvred window either side
    for (const [fu, fv] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const half = fu ? hV : hU, off = (fu ? hU : hV) + 0.03;
      for (const t of [-0.55, 0, 0.55]) {
        const door = t === 0, w = door ? 1.3 : 1.0, y1 = door ? y0 + dh : y0 + wh + 0.9, ya = door ? y0 : y0 + 0.9;
        const a = t * half;
        qb(fu ? fu * off : a, fv ? fv * off : a, ya - 0.08, y1 + 0.22, fu ? 0.06 : w + 0.3, fu ? w + 0.3 : 0.06, PIER);
        qb(fu ? fu * (off + 0.03) : a, fv ? fv * (off + 0.03) : a, ya, y1, fu ? 0.06 : w, fu ? w : 0.06, JOIN);
      }
    }
  };
  openings(ku, kv, yF, 2.5, 1.5);

  // verandah arcade, after the photos: pale yellow piers with cream bases and capitals; at each end of a face a narrow
  // round-arched bay over an ochre relief panel, then wide flat-headed bays with a white baluster rail; the middle bay
  // open to the steps. A frieze over the piers and a dark timber ceiling.
  {
    const PU = [-6.7, -4.6, -1.5, 1.5, 4.6, 6.7], PV = [-6.2, -4.1, -1.35, 1.35, 4.1, 6.2];
    const pw = 0.55, yFr = yE1 - 0.75; // underside of the frieze
    const faces = []; // [along u?, fixed coordinate, pier positions]
    for (const s of [-1, 1]) { faces.push([true, s * (hv - 0.3), PU]); faces.push([false, s * (hu - 0.3), PV]); }
    const at = (alongU, a, fixed, y0, y1, along, across, col) => alongU ? qb(a, fixed, y0, y1, along, across, col) : qb(fixed, a, y0, y1, across, along, col);
    S.kind = KIND.PLAIN;
    for (const [alongU, fixed, ps] of faces) {
      for (const a of ps) {
        at(alongU, a, fixed, yF, yFr, pw, pw, WALL);
        at(alongU, a, fixed, yF, yF + 0.35, pw + 0.14, pw + 0.14, PIER);
        at(alongU, a, fixed, yFr - 0.28, yFr, pw + 0.12, pw + 0.12, PIER);
      }
      at(alongU, 0, fixed, yFr, yE1 - 0.1, 2 * Math.abs(ps[0]) + pw, pw, WALL); // frieze
      at(alongU, 0, fixed, yFr, yFr + 0.12, 2 * Math.abs(ps[0]) + pw + 0.1, pw + 0.08, PIER);
      at(alongU, 0, fixed, yE1 - 0.28, yE1 - 0.12, 2 * Math.abs(ps[0]) + pw + 0.1, pw + 0.08, PIER);
      for (let i = 0; i < ps.length - 1; i++) {
        const a = ps[i], b = ps[i + 1], span = b - a - pw, mid = (a + b) / 2;
        if (i === 0 || i === ps.length - 2) {
          // the narrow end bay: a round arch (stepped haunches) over a relief panel
          const r = span / 2, yS = yFr - 0.28 - r;
          for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
            const wk = r / 3, d = r - wk * (k + 0.5), yb = yS + Math.sqrt(Math.max(0, r * r - d * d));
            if (yFr - 0.28 - yb > 0.04) at(alongU, mid + s * d, fixed, yb, yFr - 0.28, wk, pw - 0.1, PIER);
          }
          at(alongU, mid, fixed, yF, yF + 0.8, span, 0.2, RELIEF);
          at(alongU, mid, fixed, yF + 0.8, yF + 0.9, span, 0.28, PIER);
        } else if (i !== 2) {
          // a wide bay: white balusters under a coping
          const n = Math.round(span / 0.3);
          for (let k = 0; k < n; k++) at(alongU, a + pw / 2 + span * (k + 0.5) / n, fixed, yF, yF + 0.75, 0.12, 0.12, PIER);
          at(alongU, mid, fixed, yF + 0.75, yF + 0.88, span, 0.26, PIER);
        }
      }
    }
    qb(0, 0, yE1 - 0.14, yE1 - 0.08, 2 * hu - 0.4, 2 * hv - 0.4, WOOD, { bottom: true }); // verandah ceiling
  }

  // skirt roof over the verandah: from the lower eave up to the balcony's edge (four trapezoids, hipped corners)
  const bu = 5.2, bv = 4.7; // balcony edge (half plan)
  {
    const ov = 0.55, eu = hu + ov, ev = hv + ov, yL = yE1 + 0.1;
    const lo = [[-eu, -ev], [eu, -ev], [eu, ev], [-eu, ev]], hi = [[-bu, -bv], [bu, -bv], [bu, bv], [-bu, bv]];
    S.kind = KIND.TILE;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, mu = (lo[i][0] + lo[j][0]) / 2, mv = (lo[i][1] + lo[j][1]) / 2;
      const n = Q(mu, mv), c = Q(0, 0);
      const corner = (p, y) => Q3(p[0], y, p[1]);
      S.quad(corner(lo[i], yL), corner(lo[j], yL), corner(hi[j], yDk - 0.2), corner(hi[i], yDk - 0.2), ROOF, [n[0] - c[0], 1.6, n[1] - c[1]]);
      S.kind = KIND.PLAIN;
      S.beam(corner(lo[i], yL - 0.05), corner(lo[j], yL - 0.05), 0.18, 0.22, shade(ROOF, 0.6)); // fascia
      S.beam(corner(lo[i], yL + 0.1), corner(hi[i], yDk - 0.1), 0.22, 0.2, RIDGE); // hip ridge
      S.kind = KIND.TILE;
    }
    // openwork dragon ornaments at the four lower corners, rising off the hip ends
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) dragon(Q3(su * eu, yL + 0.1, sv * ev), [su * Math.SQRT1_2, sv * Math.SQRT1_2], 0.85);
  }

  // upper floor: a gallery of four light pillars a face at the balcony's edge with a grey-blue baluster rail between them, round a
  // recessed wall with a door and two windows a side
  S.kind = KIND.PLAIN;
  qb(0, 0, yDk - 0.22, yDk, 2 * bu, 2 * bv, shade(PIER, 0.85), { bottom: true });
  const gu = bu - 0.2, gv = bv - 0.2; // the pillar line
  {
    const R = [[-gu, -gv], [gu, -gv], [gu, gv], [-gu, gv]];
    for (let i = 0; i < 4; i++) {
      const a = R[i], b = R[(i + 1) % 4], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let p = 0; p < 3; p++) { // three bays a face, a rail of grey-blue balusters in each
        const t0 = p / 3, t1 = (p + 1) / 3, n = Math.round(l / 3 / 0.4);
        for (let k = 1; k < n; k++) { const t = t0 + (t1 - t0) * k / n; qb(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, yDk, yDk + 0.9, 0.09, 0.09, BALUS); }
      }
      S.beam(Q3(a[0], yDk + 0.95, a[1]), Q3(b[0], yDk + 0.95, b[1]), 0.14, 0.12, shade(BALUS, 0.85));
      S.beam(Q3(a[0], yDk + 0.08, a[1]), Q3(b[0], yDk + 0.08, b[1]), 0.12, 0.12, shade(BALUS, 0.85));
      for (const t of [0, 1 / 3, 2 / 3]) { // pillars: the corner one and the two between
        const pu = a[0] + (b[0] - a[0]) * t, pv = a[1] + (b[1] - a[1]) * t;
        qb(pu, pv, yDk, yE2 + 0.4, 0.4, 0.4, WALL);
        qb(pu, pv, yDk, yDk + 0.25, 0.5, 0.5, PIER);
        qb(pu, pv, yE2 + 0.15, yE2 + 0.4, 0.5, 0.5, PIER);
      }
    }
    // the lintel round the pillar heads and the gallery's timber ceiling
    for (const s of [-1, 1]) { qb(0, s * gv, yE2 + 0.4, yE2 + 0.65, 2 * gu + 0.4, 0.4, PIER); qb(s * gu, 0, yE2 + 0.4, yE2 + 0.65, 0.4, 2 * gv - 0.4, PIER); }
    qb(0, 0, yE2 + 0.6, yE2 + 0.66, 2 * gu, 2 * gv, WOOD, { bottom: true });
  }
  const wu = 3.9, wv = 3.4;
  S.kind = KIND.PLAIN;
  qb(0, 0, yDk, yE2 + 0.62, 2 * wu, 2 * wv, UPPER, { top: shade(ROOF, 0.6) });
  openings(wu, wv, yDk, 2.2, 1.2);

  // upper roof: steep, hipped, matte weathered tile, flared, with openwork dragons at the corners
  S.kind = KIND.TILE;
  { const c = Q(0, 0); S.hip(c[0], c[1], 2 * bu, 2 * bv, ang, yE2, rh, ROOF, { flare: 0.5, over: 0.9, hips: true, glazed: false, segs: 3, fascia: 0.24, fasciaCol: shade(ROOF, 0.6), ridgeCol: RIDGE }); }
  {
    const eu = bu + 0.9, ev = bv + 0.9;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) dragon(Q3(su * (eu - 0.3), yE2 + 0.55, sv * (ev - 0.3)), [su * Math.SQRT1_2, sv * Math.SQRT1_2], 1.15);
  }
  // ridge ornament: a disc with a flame tip in the middle between two dragons facing it, all dark like the roof
  {
    const yR = yE2 + rh + 0.15, rd = 0.5, n = 12, c = Q3(0, yR + rd + 0.1, 0);
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const pA = Q3(Math.cos(a0) * rd, yR + rd + 0.1 + Math.sin(a0) * rd, s * 0.08), pB = Q3(Math.cos(a1) * rd, yR + rd + 0.1 + Math.sin(a1) * rd, s * 0.08);
      const nv = Q(0, s), c0 = Q(0, 0);
      S.tri([c[0] + (nv[0] - c0[0]) * 0.08, c[1], c[2] + (nv[1] - c0[1]) * 0.08], pA, pB, ORN, [nv[0] - c0[0], 0, nv[1] - c0[1]]);
    }
    S.beam(Q3(0, yR + 2 * rd, 0), Q3(0, yR + 2 * rd + 0.55, 0), 0.16, 0.16, ORN); // the flame tip
    qb(0, 0, yR - 0.2, yR + 0.12, 0.5, 0.36, ORN);
    for (const s of [-1, 1]) dragon(Q3(s * 1.5, yR - 0.25, 0), [s, 0], 1.25);
  }

  // café parasols, grey, tall market umbrellas whose canopies show over the parapet: a row of six between the pavilion and the outer parapet (seen over it from Đặng Thái
  // Thân) and a row along the inner edge east of the pavilion (the satellite)
  S.kind = KIND.PLAIN;
  const UMB = hex('#7a7975');
  for (const [u, v] of [...[-10, -6.2, -2.2, 2.2, 6.2, 10].map((u) => [u + PAV[0], 2.4]), ...[-1, 2.8, 6.6, 13.75, 20.8].map((u) => [u, 24.4])]) {
    const q = P(u, v);
    S.cyl(q[0], q[1], yPl, yPl + 2.6, 0.05, 0.05, 5, hex('#4a4a48'), { cap: false });
    S.cyl(q[0], q[1], yPl + 2.6, yPl + 3.05, 1.6, 0.1, 10, UMB, { rot: u });
    S.cyl(q[0], q[1], yPl + 0.7, yPl + 0.74, 0.5, 0.5, 8, hex('#4f4740'));
  }
  S.kind = keep;
  return null;
}

// a broad-leaved tree: a trunk and a few overlapping crowns (as in tudam.js)
function tree(S, x, z, y0, h, r, lumps, cols) {
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y0, y0 + h * 0.45, r * 0.09, r * 0.07, 6, BARK, { cap: false });
  const seed = Math.abs(Math.sin(x * 12.9898 + z * 78.233)) * 43758.5;
  for (let k = 0; k < lumps; k++) {
    const a = ((seed + k * 2.39996) % 6.283), d = k === 0 ? 0 : r * 0.45;
    const lx = x + Math.cos(a) * d, lz = z + Math.sin(a) * d, lr = r * (k === 0 ? 0.8 : 0.6), yb = y0 + h * (k === 0 ? 0.42 : 0.36), yt = y0 + h * (k === 0 ? 1 : 0.85);
    const ym = yb + (yt - yb) * 0.45, col = cols[k % cols.length];
    S.cyl(lx, lz, yb, ym, lr * 0.55, lr, 8, shade(col, 0.85), { cap: false, rot: a });
    S.cyl(lx, lz, ym, yt, lr, lr * 0.25, 8, col, { rot: a });
  }
}
