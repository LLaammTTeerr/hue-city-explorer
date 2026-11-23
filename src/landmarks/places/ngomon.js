import { Buf, KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';
import { ridgeDragons, ridgeGourd } from '../ornaments.js';
import polygonClipping from 'polygon-clipping';

// Ngọ Môn (Noon Gate, 1833), the south gate of the Imperial City. Notes and sources: docs/places/ngomon.md.
//
// Plan: the OSM outline (way 172657562), squared up and made symmetric, then brought to the published size (Phan
// Thanh Hải 2015, cited by vi.wikipedia: base 57.96 m along the front, each wing 27.50 m). OSM draws it 55.8 m wide
// and 24.75-25.3 m deep, 4 % and 9 % short; the back face stays on OSM's line (the Imperial City wall), the wings
// reach further toward Kỳ Đài and the ends grow outward. The whole outline then sits 2 m behind OSM's (SHIFT). The body's back face projects 4.3 m between u = ±21.1; the
// two ends behind the wings are set back.
// Local frame: u along the front (east-north-east), v out of the Imperial City (south-south-east, toward the flag).
export const id = 'ngomon';

// centre of the outline's bounding box, metres in the model frame: OSM's centre (-1033.95, 132.78) moved 2 m back
// (-v) into the Imperial City, where the 2026-11 z20 satellite puts the base once its lean is allowed for (the
// published 27.5 m wing then ends where the satellite shows the tips, not 3 m out toward Kỳ Đài)
const SHIFT = -2.0;
const C = [-1033.95 - SHIFT * Math.sin(-0.633), 132.78 + SHIFT * Math.cos(-0.633)];
const A = -0.633; // direction of u
const ux = Math.cos(A), uz = Math.sin(A);
const P = (u, v) => [C[0] + u * ux - v * uz, C[1] + u * uz + v * ux];
const ring = (pts) => pts.map(([u, v]) => P(u, v));
const mirror = (pts) => pts.map(([u, v]) => [-u, v]).reverse();

// the outline, local metres
const BACK = -12.7, BACK_END = -8.4, FRONT = 3.0, INNER = 13.5, PROJ = 21.1;
const HALF = 57.96 / 2, WING = BACK + 27.5; // published size; OSM has HALF 27.9, WING 12.05
const dU = HALF - 27.9, dV = WING - 12.05; // how far the ends and the wing tips moved out from the OSM outline
const OUTLINE = [[-PROJ, BACK], [PROJ, BACK], [PROJ, BACK_END], [HALF, BACK_END], [HALF, WING], [INNER, WING], [INNER, FRONT],
  [-INNER, FRONT], [-INNER, WING], [-HALF, WING], [-HALF, BACK_END], [-PROJ, BACK_END]];

const TOP = 5.0; // the base: "nearly 5 m" / "over 5 m"; 21 steps of 22 cm reach 4.62 m, plus the sill
const PARA = 0.9; // the parapet (nữ tường) with its band of glazed openwork tiles
const NEN = 1.14; // the pavilion's own plinth on the base
// the three gateways through the body (rectangular mouths under bronze-beam lintels): Ngọ Môn for the emperor,
// Tả / Hữu Giáp Môn for the mandarins. Sizes keep the ratios of the recorded thước figures (13.3 × 8.2 and
// 12.45 × 6.3 thước); the Dịch gates through the wings (7.6 × 6.3) are vaulted ("vòm cuốn") and bent ("lối đi gấp
// khúc trong lòng hai cánh"): in from the forecourt through the wing's inner face, a right-angle turn, out at the back.
const GATES = [{ u: 0, w: 3.0, h: 4.1 }, { u: -6.1, w: 2.3, h: 3.85 }, { u: 6.1, w: 2.3, h: 3.85 }];
const DICH = { w: 2.3, h: 2.8, v: (FRONT + WING) / 2, uBack: (PROJ + HALF) / 2 };

const WALL = hex('#6f695f'); // weathered grey brick and bluestone, darker in the rain streaks
const WALL_TOP = hex('#8f857a');
const TERRACE = hex('#a3927b');
const FRAME = hex('#c9bfab');
const DARK = hex('#211b19');
const GLAZE = hex('#5d8a6a'); // the green glazed openwork tiles in the parapet
const GOLD = hex('#d8b25a');
// thanh lưu ly, the green glazed tiles: dark bottle-green, nearly black in shade, in every photograph and the satellite
// (PAL.jadeRoof, the light jade of other halls, reads far too bright here)
const GREEN = hex('#2a4c37');
// low eave curl: Ngọ Môn's eaves run nearly straight, lifting only a little at the corners
const FLARE = 0.22;

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
  // the bent Dịch tunnel in plan, for side sd: in from the wing's inner face along u, then along v out the back
  const dichPlan = (sd) => {
    const r = DICH.w / 2, uI = INNER - 0.01, uB = DICH.uBack, v = DICH.v, vB = BACK_END - 0.01;
    return [[uI, v - r], [uB - r, v - r], [uB - r, vB], [uB + r, vB], [uB + r, v + r], [uI, v + r]].map(([a, b]) => [sd * a, b]);
  };
  // the wings are solid up to the Dịch tunnels' crown with the bent tunnel cut out of them, solid above it
  const yD = LAND_Y + DICH.h;
  for (const [sd, half] of [[-1, left], [1, mirror(left)]]) {
    const close = (r) => [...r, r[0]];
    let parts = [[half]];
    try { parts = polygonClipping.difference([close(half)], [close(dichPlan(sd))]).map((pg) => pg.map((r) => r.slice(0, -1))); } catch { /* keep it whole */ }
    for (const pg of parts) S.prism(ring(pg[0]), y0, yD, WALL, WALL, { holes: pg.slice(1).map(ring), top: false });
    S.prism(ring(half), yD, yT, WALL, TERRACE, { topKind: KIND.ROAD });
  }
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
  // the leaves of the emperor's door, gilded timber set back in the mouth (yellow in Street View), with a dark stile
  box(0, FRONT - 0.9, LAND_Y, LAND_Y + 3.1, 2.9, 0.12, hex('#b8923c'));
  box(0, FRONT - 0.84, LAND_Y, LAND_Y + 3.1, 0.06, 0.06, DARK);
  // the plaque over the emperor's gateway, on the face toward the flag: two bronze characters, once gilded
  box(0, FRONT + 0.08, LAND_Y + 4.28, LAND_Y + 4.88, 2.2, 0.1, hex('#2d3b45'));
  for (const s of [-1, 1]) box(s * 0.45, FRONT + 0.14, LAND_Y + 4.38, LAND_Y + 4.78, 0.42, 0.04, GOLD);

  // ---- the Dịch gates: a vaulted tunnel in from the forecourt through each wing's inner face, a right-angle turn,
  // and out through the back face of the set-back end behind it ----
  const r = DICH.w / 2, ys = LAND_Y + DICH.h - r, K = 8; // springing of the vault; the crown is at yD
  const dirW = (nu, nv, ny = 0) => [nu * ux - nv * uz, ny, nu * uz + nv * ux];
  // the face of an opening: (cu, cv) the middle of its foot, (nu, nv) the outward normal, in local terms
  const face = (cu, cv, nu, nv) => {
    const tu = -nv, tv = nu, hint = dirW(nu, nv);
    const at = (t, y, out = 0) => pt(cu + tu * t + nu * out, cv + tv * t + nv * out, y);
    const arc = (a, rr, out) => at(Math.cos(a) * rr, ys + Math.sin(a) * rr, out);
    S.kind = KIND.MASONRY; // the spandrels between the vault and the square cut through the masonry
    for (let i = 0; i < K; i++) {
      const a0 = (Math.PI * i) / K, a1 = (Math.PI * (i + 1)) / K, c = at(i < K / 2 ? r : -r, yD);
      S.tri(c, arc(a0, r, 0), arc(a1, r, 0), WALL, hint);
    }
    S.kind = KIND.PLAIN; // a proud bluestone surround: jambs and an arched band
    const R = r + 0.35, o = 0.06;
    for (const sg of [-1, 1]) S.quad(at(sg * r, LAND_Y, o), at(sg * R, LAND_Y, o), at(sg * R, ys, o), at(sg * r, ys, o), FRAME, hint);
    for (let i = 0; i < K; i++) {
      const a0 = (Math.PI * i) / K, a1 = (Math.PI * (i + 1)) / K;
      S.quad(arc(a0, r, o), arc(a0, R, o), arc(a1, R, o), arc(a1, r, o), FRAME, hint);
    }
    // the reveal of the surround (its thickness), so it reads proud from the side
    for (let i = 0; i < K; i++) {
      const a0 = (Math.PI * i) / K, a1 = (Math.PI * (i + 1)) / K;
      S.quad(arc(a0, R, 0), arc(a1, R, 0), arc(a1, R, o), arc(a0, R, o), FRAME, dirW(nu, nv, 1));
    }
  };
  // a run of vault from local (u0, v0) to (u1, v1) along one axis, spanning 2r across it; dark inside
  const vault = (u0, v0, u1, v1) => {
    const alongU = Math.abs(u1 - u0) > Math.abs(v1 - v0), mu = (u0 + u1) / 2, mv = (v0 + v1) / 2;
    const at = (t, a, k) => { const c = Math.cos(a) * r, y = ys + Math.sin(a) * r; return alongU ? pt(k ? u1 : u0, mv + c, y) : pt(mu + c, k ? v1 : v0, y); };
    for (let i = 0; i < K; i++) {
      const a0 = (Math.PI * i) / K, a1 = (Math.PI * (i + 1)) / K, am = (a0 + a1) / 2;
      const hint = alongU ? dirW(0, -Math.cos(am), -Math.sin(am)) : dirW(-Math.cos(am), 0, -Math.sin(am));
      S.quad(at(0, a0, 0), at(0, a1, 0), at(0, a1, 1), at(0, a0, 1), DARK, hint);
    }
  };
  for (const s of [-1, 1]) {
    const uI = s * INNER, uB = s * DICH.uBack, v = DICH.v;
    face(uI, v, -s, 0); // into the forecourt
    face(uB, BACK_END, 0, -1); // out at the back, into the Imperial City
    S.kind = KIND.PLAIN;
    // leg 1 along u from the mouth to the turn, leg 2 along v from the turn to the back; the turn under a flat ceiling
    vault(uI, v, uB - s * r, v);
    vault(uB, BACK_END, uB, v - r);
    box(uB, v, yD - 0.06, yD - 0.02, DICH.w, DICH.w, DARK, { bottom: true });
    // the ends of the two vaults where they open into the turn, closed up to the ceiling
    const endFace = (cu, cv, nu, nv) => {
      const tu = -nv, tv = nu, hint = dirW(nu, nv);
      const at = (t, y) => pt(cu + tu * t, cv + tv * t, y);
      for (let i = 0; i < K; i++) {
        const a0 = (Math.PI * i) / K, a1 = (Math.PI * (i + 1)) / K;
        S.tri(at(i < K / 2 ? r : -r, yD), at(Math.cos(a0) * r, ys + Math.sin(a0) * r), at(Math.cos(a1) * r, ys + Math.sin(a1) * r), DARK, hint);
      }
    };
    endFace(uB - s * r, v, s, 0);
    endFace(uB, v - r, 0, 1);
    // dark lining on the walls past the first 0.5 m in from each mouth (the reveals stay lit), and the stone floor
    const lin = (u0, v0, u1, v1) => box((u0 + u1) / 2, (v0 + v1) / 2, LAND_Y, ys, Math.max(0.04, Math.abs(u1 - u0)), Math.max(0.04, Math.abs(v1 - v0)), DARK);
    const e = 0.03, m0 = 0.5;
    lin(uI + s * m0, v - r + e, uB - s * (r - e), v - r + e); // leg 1, toward the back
    lin(uI + s * m0, v + r - e, uB + s * (r - e), v + r - e); // leg 1, toward the front, on round the turn
    lin(uB + s * (r - e), v + r - e, uB + s * (r - e), BACK_END + m0); // the outer wall of the turn and leg 2
    lin(uB - s * (r - e), v - r + e, uB - s * (r - e), BACK_END + m0); // the inner wall of leg 2
    const floor = shade(PAL.stone, 0.85);
    box((uI + uB + s * r) / 2, v, LAND_Y - 0.1, LAND_Y + 0.04, Math.abs(uB + s * r - uI), DICH.w, floor);
    box(uB, (BACK_END + v - r) / 2, LAND_Y - 0.1, LAND_Y + 0.04, DICH.w, v - r - BACK_END, floor);
    // the round window with a stylised Thọ, centred on each wing's front face toward the flag (Street View from the
    // plaza shows one in the middle of each wing tip, about halfway up the base)
    const c = [s * (INNER + HALF) / 2, WING + 0.05], yw = LAND_Y + 2.8, k = 10;
    const ring2 = (r, out) => Array.from({ length: k }, (_, i) => { const t = (i / k) * Math.PI * 2; return pt(c[0] + Math.cos(t) * r, c[1] + out, yw + Math.sin(t) * r); });
    const o = ring2(0.62, 0.02), inn = ring2(0.42, 0.06), mid = pt(c[0], c[1] + 0.06, yw), hint = (() => { const n = P(0, 1); return [n[0] - C[0], 0, n[1] - C[1]]; })();
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
  const lE = 25.6, lW = 10.5 + dV; // the plinth runs 1 m past the wing halls; the terrace beyond it is open (photo audit)
  const lau = [[-lE, -6.8], [-19.6, -6.8], [-19.6, -12.0], [19.6, -12.0], [19.6, -6.8], [lE, -6.8], [lE, lW], [15.1, lW],
    [15.1, 1.4], [-15.1, 1.4], [-15.1, lW], [-lE, lW]];
  S.kind = KIND.MASONRY;
  S.prism(ring(lau), yT - 0.1, yN, shade(PAL.stone, 0.92), hex('#b5a58a'), { topKind: KIND.ROAD });
  // three steps up the plinth before the centre hall, toward the flag
  for (let k = 0; k < 4; k++) box(0, 1.4 + 0.3 * (k + 0.5), yT, yN - (NEN / 4) * (k + 1) + 0.02, 4.2, 0.3, shade(PAL.stone, 0.95), { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  // Nine roof units along the U (five main halls, four linking ones): the centre hall in yellow glazed tiles (the
  // emperor's), the other eight in green. Lower storeys share one eave height so their skirts read as one.
  // Proportions from the 2026-11 satellite and front-photo audit (docs/places/ngomon.md): the yellow centre hall is
  // about 20 m along the front at its eave and its upper storey nearly as wide as the lower one (a pent skirt round a
  // full-width upper floor, not a small top pavilion); the wing halls are about 9 m square with an open terrace
  // between them and the parapet. Review of the front view (2026-11): the roofs are low hip-and-gable roofs with long
  // ridges along the front (a wing-end upper roof reads as a trapezoid whose ridge is about 60 % of its width) and
  // nearly straight eaves; the pavilion stands about 1.6 times the base's height over the parapet. The wing halls' and corner links' lower storeys are open colonnades (sky shows through them from
  // the front); the centre and side halls keep a closed lacquered core.
  const eaves = [];
  const WALLH = 3.1;
  // one two-storey (or one-storey) unit on the plinth; k / kd: the upper storey's share of the lower's width / depth,
  // core: the closed core's share of the colonnade (0 for an open hall)
  const hall = (w, d, ang, cx, cz, { roof, rh, tiers = 2, k = 0.68, kd = 0.62, core = 0.8, ridge = 0.6 }) => {
    const ex = Math.cos(ang), ez = Math.sin(ang), Q = (u, v) => [cx + u * ex - v * ez, cz + u * ez + v * ex];
    const wall = shade(PAL.lacquer, 0.82), over = 1.05, y = yN, lidY = y + WALLH - 0.2;
    const eave = { fascia: 0.3, fasciaCol: shade(wall, 0.75), ridgeCol: hex('#f1d77a'), hips: true, glazed: true, segs: 3, ridge, horns: false };
    S.kind = KIND.TIMBER;
    if (core > 0) {
      const cw = w * core, cd = d * core;
      S.box(cx, cz, y, lidY, cw, cd, ang, wall, { top: shade(roof, 0.8) });
      S.kind = KIND.PLAIN;
      const dw = Math.min(cw * 0.3, 3.2), dh = Math.min(WALLH * 0.78, 2.2);
      for (const sg of [-1, 1]) { const q = Q(0, sg * (cd / 2 + 0.04)); S.box(q[0], q[1], y, y + dh, dw, 0.08, ang, shade(wall, 0.55)); }
    }
    S.kind = KIND.TIMBER;
    S.box(cx, cz, lidY, y + WALLH, w, d, ang, shade(wall, 0.5), { top: shade(roof, 0.8), bottom: true }); // verandah ceiling
    S.kind = KIND.PLAIN;
    const r = 0.2, nu = Math.max(2, Math.round(w / 3.0)), nv = Math.max(2, Math.round(d / 3.0)), posts = [];
    for (let i = 0; i <= nu; i++) for (const sg of [-1, 1]) posts.push([-w / 2 + (w * i) / nu, (sg * d) / 2]);
    for (let i = 1; i < nv; i++) for (const sg of [-1, 1]) posts.push([(sg * w) / 2, -d / 2 + (d * i) / nv]);
    for (const [u, v] of posts) {
      const q = Q(u, v);
      S.cyl(q[0], q[1], y, y + 0.22, r * 1.8, r * 1.55, 6, shade(PAL.stone, 0.95), { cap: false, rot: ang });
      S.cyl(q[0], q[1], y + 0.22, lidY, r, r * 0.92, 6, shade(wall, 0.92), { cap: false, rot: ang });
    }
    const Cn = [Q(-w / 2, -d / 2), Q(w / 2, -d / 2), Q(w / 2, d / 2), Q(-w / 2, d / 2)], ty = lidY - 0.3;
    for (let i = 0; i < 4; i++) { const a = Cn[i], b = Cn[(i + 1) % 4]; S.beam([a[0], ty, a[1]], [b[0], ty, b[1]], 0.26, 0.3, shade(wall, 0.7)); }
    S.kind = KIND.TIMBER;
    const y1 = y + WALLH;
    if (tiers === 1) {
      S.hip(cx, cz, w, d, ang, y1, rh, roof, { flare: FLARE, over, ...eave });
      eaves.push({ cx, cz, w, d, ang, y: y1, over, fascia: eave.fascia });
      return;
    }
    S.hip(cx, cz, w, d, ang, y1, rh * 0.5, roof, { flare: FLARE, over, ...eave, ridgeCol: null, ridge: 0.75 });
    const Q2 = (t, a) => [cx + t * Math.cos(a), cz + t * Math.sin(a)];
    const w2 = w * k, d2 = d * kd, y2 = y1 + rh * 0.34, y3 = y2 + WALLH * 0.85;
    S.box(cx, cz, y2, y3, w2, d2, ang, wall);
    S.kind = KIND.PLAIN; // a gilded cornice band under the upper eave and the ridge finials
    S.box(cx, cz, y3 - 0.45, y3 - 0.2, w2 + 0.1, d2 + 0.1, ang, hex('#c79a45'));
    const half = (w2 / 2 + over * 0.9) * ridge, ra = 0; // at the two ends of the ridge, which runs along the front
    for (const sg of [-1, 1]) { const q = Q2(sg * half * 1, ang + ra); ridgeGourd(S, q[0], q[1], y3 + rh * 0.92, 0.85, hex('#e5c46a')); }
    if (w > 15) ridgeDragons(S, [cx, cz], y3 + rh + 0.08, ang, { span: Math.min(8.0, w2 * 0.55), scale: 1.05 });
    else ridgeGourd(S, cx, cz, y3 + rh + 0.04, 0.9, hex('#e5c46a'));
    S.kind = KIND.TIMBER;
    S.hip(cx, cz, w2, d2, ang, y3, rh, roof, { flare: FLARE, over: over * 0.9, ...eave });
    eaves.push({ cx, cz, w, d, ang, y: y1, over, fascia: eave.fascia }, { cx, cz, w: w2, d: d2, ang, y: y3, over: over * 0.9, fascia: eave.fascia });
  };
  const unit = (u0, u1, v0, v1, opts) => {
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, su = u1 - u0, sv = v1 - v0, p = P(cu, cv);
    hall(su, sv, A, p[0], p[1], opts); // every ridge runs along the front (u), as the front photographs show
  };
  const CU = 8.8, WU0 = 15.6, WU1 = 24.6; // centre hall half-width; wing hall from the arm's inner face outward
  unit(-CU, CU, -11.6, 0.8, { roof: PAL.imperialRoof, rh: 3.2, k: 0.9, kd: 0.8 }); // ridge about 16 m over the ground
  for (const s of [-1, 1]) {
    const U = (a, b) => (s < 0 ? [-b, -a] : [a, b]);
    unit(...U(CU - 0.3, 10.4), -9.7, 0.2, { roof: GREEN, rh: 1.3, tiers: 1, ridge: 0.8 }); // link, low between the halls
    unit(...U(10.4, 15.9), -10.0, 0.5, { roof: GREEN, rh: 2.3, k: 0.88, kd: 0.78, ridge: 0.45 }); // side hall
    unit(...U(15.9, WU1), -6.3, 3.6, { roof: GREEN, rh: 1.8, core: 0, ridge: 0.5 }); // corner link over the wing's root
    unit(...U(WU0, WU1), 3.6, 10.0 + dV, { roof: GREEN, rh: 2.8, core: 0 }); // wing hall on the arm of the U
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
