// Hoàng thành · Đại Nội: the Imperial City as a whole, as it stands in 2026. This file draws its two rings of
// wall (Hoàng thành outside, Tử Cấm Thành inside), the Đông and Tây Khuyết Đài, Cửa Hòa Bình, the Tả Vu and
// Hữu Vu halls, the covered galleries that are left around the Forbidden City, and Đại Cung Môn, drawn whole as
// it stood before 1947 (places being rebuilt are drawn finished). Its single buildings (Ngọ Môn, Thái Hòa, the
// temples, ...) belong to their own place files.
//
// Sources: OpenStreetMap (walls, building outlines, cached in data/raw); vi/en Wikipedia "Hoàng thành Huế" /
// "Imperial City of Huế"; dtinews (Tử Cấm Thành wall dimensions); baovanhoa.vn, khamphahue.com.vn, huengaynay.vn
// (Đại Cung Môn: 5 bays, 3 doors, yellow glazed roof; docs/places/daicungmon.md); vinwonders / vietnamplus
// (Tả/Hữu Vu, glazed corridors).
// Confirmed: Hoàng thành wall ~600 m a side, brick, ~4 m high, ~1 m thick, four gates, khuyết đài at the middle of
// the sides; Đông Khuyết Đài restored (2023); Tử Cấm Thành wall 3.72 m high, 0.72 m thick, ~1,230 m round;
// Đại Cung Môn built 1833, burnt 1947, being rebuilt from 2026; Tả/Hữu Vu glazed yellow, corridors glazed green.
// Estimates: the form of the khuyết đài pavilions, Cửa Hòa Bình's upper storey, the Tả/Hữu Vu section (drawn as
// a pair of parallel halls), gallery widths, Đại Cung Môn's section, heights and hip-and-gable roof, the missing
// Tử Cấm Thành wall lines (east, south-east, west).
//
// Geometry is hard-coded in the Imperial City's own frame: u across (towards Thái Miếu), v towards Ngọ Môn,
// metres from data.imperial's centre.
import { KIND, hex, shade, unflat, obb } from '../../geo/buf.js';
import { gateAxis, rectRing, inRing } from '../../geo/gates.js';
import { LAND_Y, PAL } from '../../config.js';
import { pavilion } from '../citadel.js';
import { OUTER, INNER, BAC_KHUYET_DAI, wallRun } from '../hoangthanh.js';

export const id = 'dainoi';

// Tử Cấm Thành wall lines OSM leaves out (u, v)
const INNER_ADD = [
  [[170, -23], [170.5, 41], [172, 100]], // east side
  [[67, 99], [172, 100]], // south-east, from Tả Vu's corridor to the corner
  [[-175, -202], [-174.4, -175], [-174.2, -159], [-171, -47]], // west side, through Tây An Môn (TAY_AN), facing Trường An Môn
];

// Tây An Môn, the Forbidden City's west gate, across the lane from Trường Sanh's Trường An Môn (places/truongsanh.js):
// centre (u, v), width along the wall, depth through it. Street-level photos (2024) show it standing: one round-arched
// passage with an iron grille, grey plaster over brick, recessed panels and a plaque 西安門 over the arch, a cornice and
// a raised middle parapet. Its sizes are estimates from those photos, scaled by the 3.72 m wall beside it.
const TAY_AN = { u: -174.3, v: -167, w: 8.6, d: 2.6 };

// covered galleries: centre line (u, v), width between the post lines, and optionally { over, butt }: how far the
// roof's eave runs past the posts (0.8 by default), and butt when the line starts at another building's face, where
// the roof stops at that face instead of running its eave into it
const GALLERIES = [
  [[[-41, 100.5], [-13.5, 100.5]], 5], // Đại Cung Môn's flanking corridors
  [[[13.5, 99.5], [40, 99.5]], 5],
  [[[-51, 63.5], [-23, 63.5]], 4.5], // in front of the Vu halls
  [[[22.6, 62], [40, 62]], 4.5, { butt: true }], // from the face of Cần Chánh's platform plinth (u 22.45; places/canchanh.js)
  [[[-33.5, -90], [-33.5, 40]], 6], // the long corridors either side of the inner courts
  [[[28.5, -14], [30.5, 29]], 6],
  [[[22.6, 33], [34, 33]], 8, { butt: true }], // the wide end in front of Điện Cần Chánh's east side, from its plinth face
  [[[28, -91], [28, -14]], 6],
  // Tả Trường Lang, as OSM maps it (way 531031529): a narrow corridor, 3.5 m to the eaves, whose east leg runs
  // along the back of Duyệt Thị Đường (places/duyetthi.js), its eave stopping at the theatre's roof line
  [[[31.3, -51], [90.5, -51], [91.85, 22.2]], 2.4, { over: 0.45 }],
  [[[80, -53], [80, -61]], 4], // its spur to Thái Bình Lâu
  [[[-171, -46], [-38, -46]], 6], // Hữu Trường Lang
  [[[-169, -32], [-169, -6]], 5],
];

// the Imperial City's frame, set once build() has run
let frame = null;

// True for a mapped building this model draws itself (a gallery or a Vu hall): every corner lies within a gallery's
// strip or a hall's plan. city.js's buildBuildings leaves these out; its own cover test misses L-shaped galleries,
// whose middle falls in the court they wrap.
export function owns(ring) {
  if (!frame) return false;
  const { C, ca, sa } = frame;
  const inStrip = ([u, v]) => GALLERIES.some(([line, w]) => line.slice(1).some(([ub, vb], i) => {
    const [ua, va] = line[i], lu = ub - ua, lv = vb - va, len = Math.hypot(lu, lv);
    const s = ((u - ua) * lu + (v - va) * lv) / len, t = Math.abs((u - ua) * lv - (v - va) * lu) / len;
    return s > -3.5 && s < len + 3.5 && t < w / 2 + 2.5;
  })) || VU.some(([u0, u1, v0, v1]) => u > u0 - 2 && u < u1 + 2 && v > v0 - 2 && v < v1 + 2);
  return ring.every(([x, z]) => { const dx = x - C[0], dz = z - C[1]; return inStrip([dx * ca + dz * sa, -dx * sa + dz * ca]); });
}

const VU = [[35, 54, 66, 95], [-52, -33, 67.5, 97.5]]; // Tả Vu, Hữu Vu: u0, u1, v0, v1

export function build({ data, S }) {
  if (!data.imperial) return;
  const C = [data.imperial.c[0] / 10, data.imperial.c[1] / 10], A = data.imperial.a / 1000;
  const ca = Math.cos(A), sa = Math.sin(A);
  frame = { C, ca, sa };
  const W = (u, v) => [C[0] + u * ca - v * sa, C[1] + u * sa + v * ca];
  const L = ([x, z]) => { const dx = x - C[0], dz = z - C[1]; return [dx * ca + dz * sa, -dx * sa + dz * ca]; };
  const Y = LAND_Y, keep = S.kind;

  // ---- walls -----------------------------------------------------------------------------------------------
  // they stop at the gates' footprints (the gate models carry the passage) and at Ngọ Môn's whole box
  const clear = [];
  for (const g of data.gates || []) if (g.k !== 'citadel') { const t = gateAxis(g, C); clear.push(rectRing(t.cx, t.cz, t.w + 0.3, Math.max(t.d, 4) + 0.3, t.a)); }
  { const p = W(TAY_AN.u, TAY_AN.v); clear.push(rectRing(p[0], p[1], TAY_AN.d + 0.2, TAY_AN.w + 0.2, A)); }
  if (data.special && data.special.ngomon) { const o = obb(unflat(data.special.ngomon.ring)); clear.push(rectRing(o.c[0], o.c[1], o.w + 0.4, o.d + 0.4, o.a)); }
  const outer = OUTER, inner = INNER;
  // Bắc Khuyết Đài's three outer sides are places/tuphuong.js's: it draws that wall with the bastion's paving and
  // balustrade on top (hoangthanh.js)
  // (a stretch of mapped wall lies on one of those sides: both its ends within a metre of it)
  const onSide = (p, [qa, qb]) => {
    const lx = qb[0] - qa[0], lz = qb[1] - qa[1], len = Math.hypot(lx, lz);
    const s = ((p[0] - qa[0]) * lx + (p[1] - qa[1]) * lz) / len, t = ((p[0] - qa[0]) * lz - (p[1] - qa[1]) * lx) / len;
    return s > -1 && s < len + 1 && Math.abs(t) < 1;
  };
  const bastion = (a, b) => BAC_KHUYET_DAI.some((q, i) => i > 0 && onSide(a, [BAC_KHUYET_DAI[i - 1], q]) && onSide(b, [BAC_KHUYET_DAI[i - 1], q]));
  const wallLine = (pts, k) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.3 || bastion(a, b)) continue;
      const n = Math.max(1, Math.ceil(len / 0.4)), runs = [];
      let from = null;
      for (let j = 0; j <= n; j++) {
        const t = j / n, out = !clear.some((r) => inRing(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r));
        if (out && from === null) from = t;
        if ((!out || j === n) && from !== null) { runs.push([from, out ? t : (j - 1) / n]); from = null; }
      }
      for (const [t0, t1] of runs) {
        const whole = t0 === 0 && t1 === 1;
        if (!whole && len * (t1 - t0) < 0.6) continue;
        const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        wallRun(S, at(t0), at(t1), k, whole ? [1, 1] : [0, 0]);
      }
    }
  };
  for (const flat of data.iwalls || []) {
    const pts = unflat(flat), loc = pts.map(L);
    wallLine(pts, loc.every(([u, v]) => Math.abs(u) < 200 && Math.abs(v) < 215) ? inner : outer);
  }
  for (const line of INNER_ADD) wallLine(line.map(([u, v]) => W(u, v)), inner);

  // ---- Tây An Môn: an arched masonry gate in the west wall of the Forbidden City ------------------------------
  {
    const { u: gu, v: gv, w: gw, d: gd } = TAY_AN;
    const g = (u, v, y0, y1, su, sv, col, o) => { const p = W(gu + u, gv + v); S.box(p[0], p[1], y0, y1, su, sv, A, col, o); };
    const PL = hex('#7c7d79'), PL_DK = shade(PL, 0.78), ARCH = 3.0, SPRING = 2.9, CROWN = 4.4, H = 5.3;
    S.kind = KIND.FLAT; // lime plaster over the brick, not bare courses
    const pier = (gw - ARCH) / 2;
    for (const s of [-1, 1]) g(0, s * (ARCH / 2 + pier / 2), Y - 0.2, Y + H, gd, pier, PL);
    g(0, 0, Y + CROWN, Y + H, gd, ARCH, PL, { bottom: true }); // over the arch
    // the round head of the arch, in steps
    for (let k = 1; k < 8; k++) {
      const R = ARCH / 2, h = (k * R) / 8, hw = R - Math.sqrt(R * R - h * h);
      for (const s of [-1, 1]) g(0, s * (R - hw / 2), Y + SPRING + h, Y + SPRING + h + R / 8, gd, hw, PL, { bottom: true });
    }
    // plinth, recessed panels and the plaque on both faces
    for (const f of [-1, 1]) {
      const fu = f * (gd / 2 + 0.03);
      for (const s of [-1, 1]) {
        g(f * (gd / 2 + 0.06), s * (ARCH / 2 + pier / 2), Y - 0.2, Y + 0.5, 0.12, pier + 0.1, PL_DK);
        g(fu, s * (ARCH / 2 + pier / 2), Y + 1.2, Y + 3.4, 0.06, pier * 0.6, PL_DK);
      }
      g(fu, 0, Y + CROWN + 0.15, Y + H - 0.2, 0.06, 2.4, shade(PL, 0.62)); // the plaque
    }
    // cornice, the raised middle parapet with its own cornice, and low end parapets
    g(0, 0, Y + H, Y + H + 0.25, gd + 0.5, gw + 0.4, PL_DK, { bottom: true });
    g(0, 0, Y + H + 0.25, Y + H + 1.35, gd - 0.4, 4.2, PL);
    g(0, 0, Y + H + 1.35, Y + H + 1.55, gd, 4.8, PL_DK, { bottom: true });
    for (const s of [-1, 1]) g(0, s * (gw / 2 - 1), Y + H + 0.25, Y + H + 0.7, gd - 0.4, 1.8, PL);
    for (const f of [-1, 1]) g(f * ((gd - 0.4) / 2 + 0.03), 0, Y + H + 0.45, Y + H + 1.15, 0.06, 2.6, shade(PL, 0.62)); // the name board 西安門
    // the iron grille in the passage
    S.kind = KIND.TIMBER;
    const grille = hex('#2b2a28');
    for (let k = 0; k <= 8; k++) { const q = W(gu, gv - ARCH / 2 + 0.15 + (k * (ARCH - 0.3)) / 8); S.cyl(q[0], q[1], Y, Y + SPRING + 0.4, 0.025, 0.025, 4, grille); }
    for (const y of [0.15, 1.6, SPRING + 0.35]) g(0, 0, Y + y, Y + y + 0.06, 0.06, ARCH - 0.2, grille);
  }

  // ---- Đông and Tây Khuyết Đài: raised bastions at the middle of the east and west sides -------------------
  for (const sg of [1, -1]) {
    const c = W(sg * 330, 2);
    S.kind = KIND.MASONRY;
    S.box(c[0], c[1], Y - 0.2, Y + 3.6, 22, 76, A, shade(outer.body, 0.95), { topKind: KIND.ROAD });
    // a ramp up from the inside of the wall
    const r = W(sg * 312, 30);
    S.box(r[0], r[1], Y - 0.2, Y + 1.8, 5, 16, A, shade(PAL.stone, 0.9), { topKind: KIND.ROAD });
    if (sg > 0) {
      // Đông Khuyết Đài, rebuilt in 2023: a lookout pavilion on the bastion
      const p = W(331, -4);
      pavilion(S, p[0], p[1], 14, 14, A, Y + 3.6, { tiers: 2, wallH: 2.8, roof: PAL.imperialRoof, platform: 0.5, colonnade: true });
    } else {
      // Tây Khuyết Đài: only the stone base of its pavilion is left (estimate)
      const p = W(-330, 8);
      S.kind = KIND.MASONRY;
      S.box(p[0], p[1], Y + 3.6, Y + 4.2, 13, 13, A, shade(PAL.stone, 0.8), { topKind: KIND.ROAD });
    }
  }

  // ---- Cửa Hòa Bình, the north gate: a masonry gateway with one arched passage and a small storey on top --------
  {
    const g = (u, v, y0, y1, su, sv, col) => { const p = W(u, v); S.box(p[0], p[1], y0, y1, su, sv, A, col); };
    S.kind = KIND.MASONRY;
    const stone = shade(outer.body, 1.05);
    g(31.9, -283, Y - 0.2, Y + 4.6, 4.6, 8.4, stone);
    g(42.1, -283, Y - 0.2, Y + 4.6, 4.6, 8.4, stone);
    g(37, -283, Y + 3.2, Y + 4.6, 5.6, 8.4, stone); // over the arch
    S.kind = KIND.TILE;
    g(37, -283, Y + 4.6, Y + 4.9, 15, 9.2, outer.cap);
    const p = W(37, -283);
    pavilion(S, p[0], p[1], 8, 5, A, Y + 4.9, { wallH: 2.2, roof: PAL.imperialRoof, over: 1.1, steps: false });
  }

  // ---- Tả Vu and Hữu Vu: each a pair of parallel halls under yellow glazed roofs, long along v ---------------
  for (const [u0, u1, v0, v1] of VU) {
    const um = (u0 + u1) / 2, vm = (v0 + v1) / 2, len = v1 - v0 - 3.4, half = (u1 - u0 - 3.4) / 2;
    const base = W(um, vm);
    S.kind = KIND.MASONRY;
    S.box(base[0], base[1], Y - 0.2, Y + 0.6, len + 3.4, u1 - u0, A + Math.PI / 2, PAL.stone, { topKind: KIND.ROAD });
    for (const s of [-0.5, 0.5]) {
      const p = W(um + s * half, vm);
      pavilion(S, p[0], p[1], len, half, A + Math.PI / 2, Y + 0.6, { wallH: 3.6, roof: PAL.imperialRoof, over: 1.0, steps: false });
    }
  }

  // ---- covered galleries: red posts, low parapet, green glazed roof -------------------------------------------
  const post = PAL.lacquer, floor = shade(PAL.stone, 0.95);
  for (const [line, w, { over = 0.8, butt = false } = {}] of GALLERIES) {
    for (let i = 0; i + 1 < line.length; i++) {
      const [ua, va] = line[i], [ub, vb] = line[i + 1];
      const lu = ub - ua, lv = vb - va, len = Math.hypot(lu, lv), du = lu / len, dv = lv / len;
      const a = W(ua, va), b = W(ub, vb), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const m = W((ua + ub) / 2, (va + vb) / 2);
      // laps the next leg at an elbow
      const ext = i + 2 < line.length || i > 0 ? w / 2 : 0;
      S.kind = KIND.MASONRY;
      S.box(m[0], m[1], Y - 0.2, Y + 0.45, len + ext, w + 0.6, ang, floor, { topKind: KIND.ROAD });
      S.kind = KIND.TIMBER;
      const n = Math.max(1, Math.round(len / 3.2));
      for (let k = 0; k <= n; k++) {
        const t = k / n, cu = ua + lu * t, cv = va + lv * t;
        for (const s of [-1, 1]) {
          const q = W(cu - dv * s * (w / 2 - 0.3), cv + du * s * (w / 2 - 0.3));
          S.cyl(q[0], q[1], Y + 0.45, Y + 3.1, 0.16, 0.15, 6, post);
        }
      }
      for (const s of [-1, 1]) {
        const p0 = W(ua - dv * s * (w / 2 - 0.3), va + du * s * (w / 2 - 0.3)), p1 = W(ub - dv * s * (w / 2 - 0.3), vb + du * s * (w / 2 - 0.3));
        S.beam([p0[0], Y + 3.0, p0[1]], [p1[0], Y + 3.0, p1[1]], 0.22, 0.3, shade(post, 0.85));
      }
      S.kind = KIND.GLAZED;
      // a butted start: the roof is shortened there by its overhang, so its eave ends at the line's first point
      const cut = butt && i === 0 ? over : 0, r = W((ua + ub) / 2 + du * cut / 2, (va + vb) / 2 + dv * cut / 2);
      S.hip(r[0], r[1], len + ext - cut, w, ang, Y + 3.1, Math.min(1.9, w * 0.32), PAL.jadeRoof, { over, glazed: true });
    }
  }

  // ---- Đại Cung Môn, as it stood before 1947 (docs/places/daicungmon.md) ----------------------------------------
  // Minh Mạng's gate of 1833 into the Forbidden City: one storey, 5 bays (5 gian) on the old foundation, 6 × 4 lacquered
  // columns, 3 doors in the middle bays (the middle one the emperor's), the end bays panelled; the front, toward Thái
  // Hòa, all red lacquer and gilt, its panels "one poem, one picture"; a hip-and-gable roof of yellow glazed tiles with
  // enamel (pháp lam) figures on the ridge and mosaic gable panels; boards "Đại Cung Môn" in front, "Càn Thành Cung"
  // behind. The front faces +v. Bay count, doors, finish, tiles and ridge work are sourced; the section, heights and
  // roof form are estimates.
  {
    const box = (u, v, y0, y1, w, d, col, o) => { const p = W(u, v); S.box(p[0], p[1], y0, y1, w, d, A, col, o); };
    const P3 = (u, y, v) => { const p = W(u, v); return [p[0], y, p[1]]; };
    const RED = hex('#9a2a1e'), RED_DK = hex('#6e1f17'), GOLD = hex('#d2a43c'), STONE = hex('#9b998f');
    const WALLC = hex('#c9a36a'), IVORY = hex('#e6dcc4'), RIDGE = hex('#f1d77a');
    const ENAMEL = [hex('#2f6aa3'), hex('#3d8a5c'), hex('#d8b23a'), hex('#e6dcc4')];
    const vc = 100.5, FL = Y + 0.7;
    // the foundation (brick, Thanh stone coping) and its front and back steps
    S.kind = KIND.MASONRY;
    box(0, vc, Y - 0.2, FL - 0.15, 27, 11.5, shade(PAL.stone, 0.85), { topKind: KIND.ROAD });
    box(0, vc, FL - 0.17, FL, 27.3, 11.8, shade(STONE, 1.08), { topKind: KIND.ROAD });
    for (const sv of [1, -1]) for (let k = 1; k <= 3; k++) {
      box(0, vc + sv * (5.75 + 0.3 * k), Y - 0.2, FL - 0.2 * k, 8, 0.3, shade(PAL.stone, 0.9), { topKind: KIND.ROAD });
    }
    // columns on the old bases: 5 bays across (4.4 m), 3 deep (2.7 m)
    const cu = [-11, -6.6, -2.2, 2.2, 6.6, 11], cv = [96.5, 99.2, 101.9, 104.6];
    const CH = 4.2; // floor to the eave plate
    S.kind = KIND.TIMBER;
    for (const u of cu) for (const v of cv) {
      const p = W(u, v), inner = v > 97 && v < 104 && Math.abs(u) < 10; // the inner rows rise to the upper plates
      S.box(p[0], p[1], FL, FL + 0.25, 0.75, 0.75, A, shade(STONE, 1.08)); // chân tảng
      S.cyl(p[0], p[1], FL + 0.25, FL + CH + (inner ? 0.9 : 0), 0.24, 0.22, 8, RED, { cap: false });
      S.cyl(p[0], p[1], FL + 2.0, FL + 2.25, 0.245, 0.24, 8, GOLD, { cap: false });
    }
    const yE = FL + CH - 0.15;
    for (const v of [cv[0], cv[3]]) S.beam(P3(cu[0], yE, v), P3(cu[5], yE, v), 0.3, 0.36, RED_DK);
    for (const u of [cu[0], cu[5]]) S.beam(P3(u, yE, cv[0]), P3(u, yE, cv[3]), 0.3, 0.36, RED_DK);
    for (const v of [cv[1], cv[2]]) S.beam(P3(cu[1], FL + CH + 0.7, v), P3(cu[4], FL + CH + 0.7, v), 0.28, 0.34, RED_DK);
    // the door screen on the front inner row: 3 doors in the middle bays, the middle one taller; panelled end bays.
    // Behind it the gate passage; the back row stands open to the court.
    const sv = cv[2];
    for (let i = 0; i < 5; i++) {
      const u0 = cu[i] + 0.26, u1 = cu[i + 1] - 0.26, w = u1 - u0, uc = (u0 + u1) / 2, door = i > 0 && i < 4;
      const dh = i === 2 ? 3.2 : 2.9;
      if (door) {
        box(uc, sv, FL, FL + dh, w * 0.62, 0.16, shade(RED, 0.75)); // the two leaves
        box(uc, sv + 0.09, FL, FL + dh, 0.05, 0.04, RED_DK);
        for (const s of [-1, 1]) for (const y of [0.9, 1.6, 2.3]) box(uc + s * w * 0.155, sv + 0.1, FL + y, FL + y + 0.12, w * 0.24, 0.03, GOLD); // gilt studs in rows
        for (const s of [-1, 1]) box(uc + s * (w * 0.405), sv, FL, FL + dh, w * 0.19, 0.14, RED); // the fixed side panels
        box(uc, sv, FL + dh, FL + CH - 0.25, w, 0.14, RED_DK);
      } else {
        box(uc, sv, FL, FL + CH - 0.25, w, 0.16, RED);
        // liên ba panels, "nhất thi nhất họa": a gilt poem panel over a painted one
        for (const [y0, y1, c] of [[1.0, 1.9, ENAMEL[0]], [2.1, 3.0, GOLD]]) box(uc, sv + 0.09, FL + y0, FL + y1, w * 0.7, 0.03, c);
      }
      box(uc, sv + 0.09, FL + CH - 0.75, FL + CH - 0.45, w, 0.04, GOLD); // the gilt rail of the transom
    }
    // the gable walls between the outer columns at the ends
    for (const s of [-1, 1]) box(s * 11, (cv[0] + cv[3]) / 2, FL, FL + CH - 0.25, 0.3, cv[3] - cv[0], WALLC);
    // the name boards under the eaves, over the middle bay: Đại Cung Môn in front, Càn Thành Cung behind
    box(0, cv[3] + 0.2, yE - 1.0, yE - 0.25, 2.6, 0.12, RED_DK);
    box(0, cv[3] + 0.28, yE - 0.92, yE - 0.33, 2.3, 0.04, GOLD);
    box(0, cv[0] - 0.2, yE - 1.0, yE - 0.25, 2.6, 0.12, RED_DK);
    box(0, cv[0] - 0.28, yE - 0.92, yE - 0.33, 2.3, 0.04, GOLD);
    // a dark lid under the roof (seen through the doors and from under the eaves)
    box(0, vc, FL + CH - 0.3, FL + CH - 0.1, 22, 8.1, shade(RED_DK, 0.6), { bottom: true });

    // ---- the roof: a hip roof with a small gable (ô hồi) high on each end, yellow glazed tiles ----
    S.kind = KIND.PLAIN;
    const rw = 22, rd = cv[3] - cv[0], over = 1.6, rh = 3.1, y0 = FL + CH;
    { const p = W(0, vc); S.hip(p[0], p[1], rw, rd, A, y0, rh, PAL.imperialRoof, { flare: 0.5, fascia: 0.3, fasciaCol: RED_DK, ridgeCol: RIDGE, hips: true, glazed: true, segs: 3, over }); }
    // the gable: the side slopes carried on past the hip's top to a vertical triangle with a mosaic medallion
    const hw = rw / 2 + over, hd = rd / 2 + over, rl = Math.max(0, hw - hd * 0.92), yR = y0 + rh;
    const gT = 0.38, gu = rl + (hw - rl) * gT, gv = hd * gT, gy = yR - rh * gT;
    for (const s of [-1, 1]) {
      const nrm = [s * ca, 0, s * sa];
      S.tri(P3(s * gu, gy, vc - gv), P3(s * gu, gy, vc + gv), P3(s * gu, yR, vc), IVORY, nrm);
      S.kind = KIND.GLAZED;
      for (const t of [-1, 1]) {
        const a = P3(s * (rl - 0.2), yR + 0.05, vc), b = P3(s * (gu + 0.35), yR + 0.05, vc);
        const c = P3(s * (gu + 0.35), gy - 0.02, vc + t * (gv + 0.1)), d = P3(s * (rl - 0.2), gy - 0.02, vc + t * (gv + 0.1));
        S.quad(a, b, c, d, PAL.imperialRoof, [0, 1, 0]);
        S.beam(P3(s * gu, gy + 0.02, vc + t * gv), P3(s * (gu + 0.35), yR + 0.06, vc), 0.18, 0.16, RIDGE); // the barge edge
      }
      S.kind = KIND.PLAIN;
      const m = W(s * (gu + 0.04), vc);
      S.box(m[0], m[1], gy + 0.25, gy + 0.85, 0.05, 0.6, A, ENAMEL[(s + 1) / 2]);
    }
    // the ridge work: a flaming pearl (hỏa châu) at the middle, enamel dragons and curled ridge ends (kìm)
    S.beam(P3(-(gu + 0.3), yR + 0.18, vc), P3(gu + 0.3, yR + 0.18, vc), 0.34, 0.36, RIDGE);
    const yr = yR + 0.36;
    S.cyl(...W(0, vc), yr, yr + 0.22, 0.28, 0.2, 8, GOLD);
    S.cyl(...W(0, vc), yr + 0.22, yr + 0.85, 0.3, 0.05, 8, GOLD);
    for (const s of [-1, 1]) {
      let prev = null;
      for (let k = 0; k <= 6; k++) {
        const q = P3(s * (0.7 + k * 0.4), yr + 0.18 + 0.2 * Math.sin(k * 1.3) + (k === 0 ? 0.3 : 0), vc);
        if (prev) S.beam(prev, q, 0.18, 0.2, k < 2 ? GOLD : ENAMEL[1]);
        prev = q;
      }
      S.beam(P3(s * (gu + 0.1), yr - 0.1, vc), P3(s * (gu + 0.45), yr + 0.6, vc), 0.24, 0.24, ENAMEL[1]);
      S.beam(P3(s * (gu + 0.45), yr + 0.6, vc), P3(s * (gu + 0.15), yr + 0.95, vc), 0.2, 0.2, ENAMEL[1]);
    }
  }
  S.kind = keep;
}
