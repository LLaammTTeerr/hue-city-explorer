import { Buf, KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';
import { pavilion } from '../citadel.js';

// Ngọ Môn (Noon Gate, 1833), the south gate of the Imperial City. Notes and sources: docs/places/ngomon.md.
//
// Plan from the OSM outline (way 172657562), squared up and made symmetric: a U whose body runs 55.8 m along the
// front (sources: 57.77-57.96 m) and whose wings reach 25.3 m in all (sources: 27.06-27.5 m) toward Kỳ Đài. The
// body's back face projects 4.3 m between u = ±21.1; the two ends behind the wings are set back.
// Local frame: u along the front (east-north-east), v out of the Imperial City (south-south-east, toward the flag).
export const id = 'ngomon';

const C = [-1033.95, 132.78]; // centre of the outline's bounding box, metres in the model frame
const A = -0.633; // direction of u
const ux = Math.cos(A), uz = Math.sin(A);
const P = (u, v) => [C[0] + u * ux - v * uz, C[1] + u * uz + v * ux];
const ring = (pts) => pts.map(([u, v]) => P(u, v));
const mirror = (pts) => pts.map(([u, v]) => [-u, v]).reverse();

// the outline, local metres
const BACK = -12.7, BACK_END = -8.4, FRONT = 3.0, WING = 12.05, HALF = 27.9, INNER = 13.5, PROJ = 21.1;
const OUTLINE = [[-PROJ, BACK], [PROJ, BACK], [PROJ, BACK_END], [HALF, BACK_END], [HALF, WING], [INNER, WING], [INNER, FRONT],
  [-INNER, FRONT], [-INNER, WING], [-HALF, WING], [-HALF, BACK_END], [-PROJ, BACK_END]];

const TOP = 5.0; // the base: "nearly 5 m" / "over 5 m"; 21 steps of 22 cm reach 4.62 m, plus the sill
const PARA = 0.9; // the parapet (nữ tường) with its band of glazed openwork tiles
const NEN = 1.14; // the pavilion's own plinth on the base
// the three gateways through the body (rectangular mouths under bronze-beam lintels): Ngọ Môn for the emperor,
// Tả / Hữu Giáp Môn for the mandarins. Sizes keep the ratios of the recorded thước figures (13.3 × 8.2 and
// 12.45 × 6.3 thước); the Dịch gates through the wings (7.6 × 6.3) are arched.
const GATES = [{ u: 0, w: 3.0, h: 4.1 }, { u: -6.1, w: 2.3, h: 3.85 }, { u: 6.1, w: 2.3, h: 3.85 }];
const DICH = { w: 2.3, h: 2.8, v: 7.5, uBack: 24.5 };

const WALL = hex('#7d746a'); // weathered grey brick and bluestone, darker in the rain streaks
const WALL_TOP = hex('#8f857a');
const TERRACE = hex('#a3927b');
const FRAME = hex('#c9bfab');
const DARK = hex('#211b19');
const GLAZE = hex('#5d8a6a'); // the green glazed openwork tiles in the parapet
const GOLD = hex('#d8b25a');

export function build({ S, group, THREE }) {
  const y0 = LAND_Y - 0.6, yT = LAND_Y + TOP;
  const L = new Buf(1200); // night uplighting: strips of additive light along stone and under the eaves
  const lamps = [];
  const W1 = [1, 1, 1];
  const box = (u, v, a, b, su, sv, col, opts) => { const p = P(u, v); S.box(p[0], p[1], a, b, su, sv, A, col, opts); };
  const pt = (u, v, y) => { const p = P(u, v); return [p[0], y, p[1]]; };

  // ---- the masonry base: solid blocks either side of the three gateways, lintels over them ----
  S.kind = KIND.MASONRY;
  const g0 = GATES[1], g1 = GATES[0]; // left Giáp, centre
  const gl = (g) => g.u - g.w / 2, gr = (g) => g.u + g.w / 2;
  const left = [[gl(g0), BACK], [gl(g0), FRONT], [-INNER, FRONT], [-INNER, WING], [-HALF, WING], [-HALF, BACK_END], [-PROJ, BACK_END], [-PROJ, BACK]];
  for (const half of [left, mirror(left)]) S.prism(ring(half), y0, yT, WALL, TERRACE, { topKind: KIND.ROAD });
  for (const s of [-1, 1]) { // the two piers between the centre gateway and the Giáp gates
    const a = s < 0 ? gr(g0) : gr(g1), b = s < 0 ? gl(g1) : gl(GATES[2]);
    box((a + b) / 2, (BACK + FRONT) / 2, y0, yT, b - a, FRONT - BACK, WALL, { top: TERRACE, topKind: KIND.ROAD });
  }
  const depth = FRONT - BACK, vm = (BACK + FRONT) / 2;
  for (const g of GATES) {
    const yc = LAND_Y + g.h;
    box(g.u, vm, yc, yT, g.w + 0.02, depth, WALL, { top: TERRACE, topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    // the dark tunnel: lining on both sides and the ceiling, set in from each mouth so the reveals stay light
    for (const s of [-1, 1]) box(g.u + s * (g.w / 2 - 0.03), vm, LAND_Y, yc, 0.04, depth - 0.8, DARK);
    box(g.u, vm, yc - 0.06, yc - 0.02, g.w, depth - 0.8, DARK, { bottom: true });
    box(g.u, vm, LAND_Y - 0.1, LAND_Y + 0.04, g.w, depth, shade(PAL.stone, 0.85));
    // a proud bluestone surround at each mouth
    for (const v of [BACK - 0.06, FRONT + 0.06]) {
      for (const s of [-1, 1]) box(g.u + s * (g.w / 2 + 0.2), v, LAND_Y, yc + 0.4, 0.4, 0.14, FRAME);
      box(g.u, v, yc, yc + 0.4, g.w + 0.8, 0.14, FRAME);
    }
    S.kind = KIND.MASONRY;
  }
  S.kind = KIND.PLAIN;
  // the plaque over the emperor's gateway, on the face toward the flag: two bronze characters, once gilded
  box(0, FRONT + 0.08, LAND_Y + 4.28, LAND_Y + 4.88, 2.2, 0.1, hex('#2d3b45'));
  for (const s of [-1, 1]) box(s * 0.45, FRONT + 0.14, LAND_Y + 4.38, LAND_Y + 4.78, 0.42, 0.04, GOLD);

  // ---- the Dịch gates: an arched mouth in the inner face of each wing, the bent tunnel coming out at the back ----
  const arch = (cu, cv, nu, nv, w, h, col, out) => {
    // a flat arched panel standing just proud of a face; (nu, nv) its outward normal in local terms
    const tu = -nv, tv = nu, r = w / 2, base = h - r, k = 8;
    const at = (s, y) => pt(cu + tu * s + nu * out, cv + tv * s + nv * out, LAND_Y + y);
    const n = P(nu, nv), hint = [n[0] - C[0], 0, n[1] - C[1]];
    S.quad(at(-r, 0), at(r, 0), at(r, base), at(-r, base), col, hint);
    for (let i = 0; i < k; i++) {
      const a0 = (Math.PI * i) / k, a1 = (Math.PI * (i + 1)) / k;
      S.tri(at(0, base), at(Math.cos(a0) * r, base + Math.sin(a0) * r), at(Math.cos(a1) * r, base + Math.sin(a1) * r), col, hint);
    }
  };
  for (const s of [-1, 1]) {
    arch(s * INNER, DICH.v, -s, 0, DICH.w + 0.7, DICH.h + 0.35, FRAME, 0.03);
    arch(s * INNER, DICH.v, -s, 0, DICH.w, DICH.h, DARK, 0.06);
    arch(s * DICH.uBack, BACK_END, 0, -1, DICH.w + 0.7, DICH.h + 0.35, FRAME, 0.03);
    arch(s * DICH.uBack, BACK_END, 0, -1, DICH.w, DICH.h, DARK, 0.06);
    // the round window with a stylised Thọ on each wing's outer face, lighting the bend of the tunnel
    const c = [s * (HALF + 0.05), DICH.v + 1.4], yw = LAND_Y + 3.0, k = 10;
    const ring2 = (r, out) => Array.from({ length: k }, (_, i) => { const t = (i / k) * Math.PI * 2; return pt(c[0] + s * out, c[1] + Math.cos(t) * r, yw + Math.sin(t) * r); });
    const o = ring2(0.62, 0.02), inn = ring2(0.42, 0.06), mid = pt(c[0] + s * 0.06, c[1], yw), hint = (() => { const n = P(s, 0); return [n[0] - C[0], 0, n[1] - C[1]]; })();
    for (let i = 0; i < k; i++) { const j = (i + 1) % k; S.quad(o[i], o[j], inn[j], inn[i], FRAME, hint); S.tri(mid, inn[i], inn[j], DARK, hint); }
  }

  // ---- the parapet round the top, with its glazed band, broken at the two stair heads ----
  const STAIR = { u0: 13.9, u1: 20.7, w: 2.62, n: 21 }; // two open flights, 5.25 m together, 21 bluestone steps each
  const gap = (a, b) => { // the stair heads are on the back face, at the outer end of each flight
    if (Math.abs(a[1] - BACK) > 0.01 || Math.abs(b[1] - BACK) > 0.01) return null;
    return [[-PROJ, -(STAIR.u1 - 2.6)], [STAIR.u1 - 2.6, PROJ]].map(([p, q]) => [Math.min(p, q), Math.max(p, q)]);
  };
  const pts = OUTLINE;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    let spans = [[0, 1]];
    const gp = gap(a, b);
    if (gp) {
      const lo = Math.min(a[0], b[0]), len0 = Math.abs(b[0] - a[0]), f = (u) => (a[0] < b[0] ? (u - lo) / len0 : 1 - (u - lo) / len0);
      const cut = gp.map(([p, q]) => [f(p), f(q)].sort((x, y) => x - y));
      spans = [];
      let t = 0;
      for (const [p, q] of cut.sort((x, y) => x[0] - y[0])) { if (p > t) spans.push([t, p]); t = Math.max(t, q); }
      if (t < 1) spans.push([t, 1]);
    }
    const du = b[0] - a[0], dv = b[1] - a[1], len = Math.hypot(du, dv), nu = dv / len, nv = -du / len; // outward (ring is clockwise in u, v)
    for (const [t0, t1] of spans) {
      if ((t1 - t0) * len < 0.3) continue;
      const m = [a[0] + du * (t0 + t1) / 2 - nu * 0.22, a[1] + dv * (t0 + t1) / 2 - nv * 0.22];
      const ang = A + Math.atan2(dv, du), p = P(m[0], m[1]), l = (t1 - t0) * len;
      S.kind = KIND.MASONRY;
      S.box(p[0], p[1], yT, yT + PARA, l + 0.44, 0.44, ang, WALL_TOP, { top: shade(WALL_TOP, 1.1) });
      S.kind = KIND.PLAIN;
      const q = P(m[0] + nu * 0.24, m[1] + nv * 0.24);
      S.box(q[0], q[1], yT + 0.3, yT + 0.68, l - 0.3, 0.04, ang, GLAZE);
      // night: a strip along the parapet's outer top edge, washing the face below
      const e0 = [a[0] + du * t0 + nu * 0.14, a[1] + dv * t0 + nv * 0.14], e1 = [a[0] + du * t1 + nu * 0.14, a[1] + dv * t1 + nv * 0.14];
      L.beam(pt(e0[0], e0[1], yT + PARA - 0.14), pt(e1[0], e1[1], yT + PARA - 0.14), 0.18, 0.26, W1);
    }
  }
  // a string course along the foot of the parapet
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], du = b[0] - a[0], dv = b[1] - a[1], len = Math.hypot(du, dv), nu = dv / len, nv = -du / len;
    const p = P((a[0] + b[0]) / 2 + nu * 0.06, (a[1] + b[1]) / 2 + nv * 0.06);
    S.box(p[0], p[1], yT - 0.22, yT, len + 0.12, 0.12, A + Math.atan2(dv, du), shade(WALL_TOP, 1.12));
  }

  // ---- the two open stairs against the back face, rising outward to the terrace ----
  for (const s of [-1, 1]) {
    const run = STAIR.u1 - STAIR.u0, tread = run / STAIR.n, rise = TOP / (STAIR.n + 1), vc = BACK - STAIR.w / 2;
    S.kind = KIND.MASONRY;
    for (let k = 0; k < STAIR.n; k++) {
      const u = s * (STAIR.u0 + tread * (k + 0.5));
      box(u, vc, y0, LAND_Y + rise * (k + 1), tread + 0.01, STAIR.w, shade(PAL.stone, 0.9), { topKind: KIND.ROAD });
    }
    box(s * (STAIR.u1 + 0.2), vc, y0, yT, 0.4, STAIR.w, shade(PAL.stone, 0.9), { topKind: KIND.ROAD }); // the landing
    // the stair's outer cheek wall and its balustrade
    S.kind = KIND.PLAIN;
    const vb = BACK - STAIR.w - 0.12;
    S.beam(pt(s * (STAIR.u0 - 0.1), vb, LAND_Y + 0.5), pt(s * (STAIR.u1 + 0.4), vb, yT + 0.75), 0.26, 0.22, shade(PAL.stone, 0.8));
    for (let k = 0; k <= 4; k++) {
      const f = k / 4, u = s * (STAIR.u0 + (STAIR.u1 + 0.3 - STAIR.u0) * f), yb = LAND_Y + (TOP) * f;
      box(u, vb, yb - 0.3, yb + 0.85, 0.3, 0.3, shade(PAL.stone, 0.85));
    }
  }

  // ---- Lầu Ngũ Phụng: the U-shaped plinth, then nine roofs over a two-storey timber frame ----
  const yN = yT + NEN;
  const lau = [[-26.3, -6.8], [-19.6, -6.8], [-19.6, -10.9], [19.6, -10.9], [19.6, -6.8], [26.3, -6.8], [26.3, 10.5], [15.1, 10.5],
    [15.1, 1.4], [-15.1, 1.4], [-15.1, 10.5], [-26.3, 10.5]];
  S.kind = KIND.MASONRY;
  S.prism(ring(lau), yT - 0.1, yN, shade(PAL.stone, 0.92), hex('#b5a58a'), { topKind: KIND.ROAD });
  // three steps up the plinth before the centre hall, toward the flag
  for (let k = 0; k < 4; k++) box(0, 1.4 + 0.3 * (k + 0.5), yT, yN - (NEN / 4) * (k + 1) + 0.02, 4.2, 0.3, shade(PAL.stone, 0.95), { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  // Nine roof units along the U (five main halls, four linking ones): the centre hall in yellow glazed tiles (the
  // emperor's), the other eight in green. Lower storeys share one eave height so their skirts read as one.
  const eaves = [];
  const unit = (u0, u1, v0, v1, roof, rh, upper = true) => {
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, su = u1 - u0, sv = v1 - v0, p = P(cu, cv);
    const along = su >= sv;
    pavilion(S, p[0], p[1], along ? su : sv, along ? sv : su, along ? A : A + Math.PI / 2, yN,
      { tiers: upper ? 2 : 1, wallH: 3.2, roof, wall: PAL.lacquer, over: 1.05, rh, eaves, colonnade: true, segs: 3 });
  };
  unit(-6.2, 6.2, -10.3, 0.8, PAL.imperialRoof, 3.0); // centre: about 15 m over the ground at the ridge ("under 15 m")
  for (const s of [-1, 1]) {
    const U = (a, b) => (s < 0 ? [-b, -a] : [a, b]);
    unit(...U(6.2, 9.6), -9.7, 0.2, PAL.jadeRoof, 1.6); // link
    unit(...U(9.6, 15.9), -10.3, 0.8, PAL.jadeRoof, 2.2); // side hall
    unit(...U(15.9, 25.8), -6.3, 3.6, PAL.jadeRoof, 1.7); // corner link over the wing's root
    unit(...U(15.6, 25.8), 3.6, 10.0, PAL.jadeRoof, 2.3); // wing hall on the arm of the U
  }
  // upper-storey wall panels with their round windows, dark timber between the red columns (one per main hall face)
  for (const e of eaves) {
    const ex = Math.cos(e.ang), ez = Math.sin(e.ang);
    const hl = e.y - e.fascia - 0.07;
    const Q = (u, v) => [e.cx + u * ex - v * ez, hl, e.cz + u * ez + v * ex];
    const hu = e.w / 2 + e.over - 0.3, hv = e.d / 2 + e.over - 0.3;
    for (const sg of [-1, 1]) { L.beam(Q(-hu, sg * hv), Q(hu, sg * hv), 0.14, 0.1, W1); L.beam(Q(sg * hu, -hv), Q(sg * hu, hv), 0.14, 0.1, W1); }
  }

  // lamps in the court and behind the gates, just outside each gateway
  for (const g of GATES) for (const v of [FRONT + 5.0, BACK - 4.0]) lamps.push(...pt(g.u, v, LAND_Y + (g.u === 0 ? 2.5 : 2.2)));

  S.kind = KIND.PLAIN;
  if (!group) return null;
  // night: the warm wash along the parapet and under every eave (shared uGlow), and the lamps before the gateways
  const mesh = new THREE.Mesh(L.geometry(), lightMaterial(0xffb64c, 1.4));
  mesh.renderOrder = 19;
  mesh.userData.landmark = id;
  group.add(mesh);
  const pts2 = glowPoints(lamps, lamps.map((_, i) => [1.0, 0.72, 0.34][i % 3]), 7);
  pts2.userData.glow = true;
  pts2.userData.landmark = id;
  group.add(pts2);
  return null;
}
