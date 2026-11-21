// Hoàng thành · Đại Nội: the Imperial City as a whole, as it stands in 2026. This file draws its two rings of
// wall (Hoàng thành outside, Tử Cấm Thành inside), the Đông and Tây Khuyết Đài, Cửa Hòa Bình, the Tả Vu and
// Hữu Vu halls, the covered galleries that are left around the Forbidden City, and the bare foundation of
// Đại Cung Môn. Its single buildings (Ngọ Môn, Thái Hòa, the temples, ...) belong to their own place files.
//
// Sources: OpenStreetMap (walls, building outlines, cached in data/raw); vi/en Wikipedia "Hoàng thành Huế" /
// "Imperial City of Huế"; dtinews (Tử Cấm Thành wall dimensions); baovanhoa.vn and daibieunhandan.vn (Đại Cung
// Môn still unrestored, works planned 2026-2030); vinwonders / vietnamplus (Tả/Hữu Vu, glazed corridors).
// Confirmed: Hoàng thành wall ~600 m a side, brick, ~4 m high, ~1 m thick, four gates, khuyết đài at the middle of
// the sides; Đông Khuyết Đài restored (2023); Tử Cấm Thành wall 3.72 m high, 0.72 m thick, ~1,230 m round;
// Đại Cung Môn destroyed 1947, only its foundation left; Tả/Hữu Vu glazed yellow, corridors glazed green.
// Estimates: the form of the khuyết đài pavilions, Cửa Hòa Bình's upper storey, the Tả/Hữu Vu section (drawn as
// a pair of parallel halls), gallery widths, the missing Tử Cấm Thành wall lines (east, south-east, west).
//
// Geometry is hard-coded in the Imperial City's own frame: u across (towards Thái Miếu), v towards Ngọ Môn,
// metres from data.imperial's centre.
import { KIND, hex, shade, unflat, obb } from '../../geo/buf.js';
import { gateAxis, rectRing, inRing } from '../../geo/gates.js';
import { LAND_Y, PAL } from '../../config.js';
import { pavilion } from '../citadel.js';

export const id = 'dainoi';

// Tử Cấm Thành wall lines OSM leaves out (u, v)
const INNER_ADD = [
  [[170, -23], [170.5, 41], [172, 100]], // east side
  [[67, 99], [172, 100]], // south-east, from Tả Vu's corridor to the corner
  [[-175, -202], [-174.4, -175]], // west side, north of Trường An Môn
  [[-174.2, -159], [-171, -47]], // west side, south of it
];

// covered galleries: centre line (u, v) and width
const GALLERIES = [
  [[[-41, 100.5], [-13.5, 100.5]], 5], // Đại Cung Môn's flanking corridors
  [[[13.5, 99.5], [40, 99.5]], 5],
  [[[-51, 63.5], [-23, 63.5]], 4.5], // in front of the Vu halls
  [[[22.6, 62], [40, 62]], 4.5], // from the face of Cần Chánh's platform plinth (u 22.45; places/canchanh.js)
  [[[-33.5, -90], [-33.5, 40]], 6], // the long corridors either side of the inner courts
  [[[28.5, -14], [30.5, 29]], 6],
  [[[22.6, 33], [34, 33]], 8], // the wide end in front of Điện Cần Chánh's east side, from its plinth face
  [[[28, -91], [28, -14]], 6],
  [[[31, -51], [91, -51], [91, 22]], 5], // Tả Trường Lang
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
  if (data.special && data.special.ngomon) { const o = obb(unflat(data.special.ngomon.ring)); clear.push(rectRing(o.c[0], o.c[1], o.w + 0.4, o.d + 0.4, o.a)); }
  const outer = { h: 3.75, t: 1.05, capH: 0.42, capW: 1.45, body: hex('#837a6c'), cap: hex('#6b5d4f') };
  const inner = { h: 3.36, t: 0.72, capH: 0.36, capW: 1.05, body: hex('#a39482'), cap: hex('#6a5546') };
  const wallLine = (pts, k) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.3) continue;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const n = Math.max(1, Math.ceil(len / 0.4)), runs = [];
      let from = null;
      for (let j = 0; j <= n; j++) {
        const t = j / n, out = !clear.some((r) => inRing(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r));
        if (out && from === null) from = t;
        if ((!out || j === n) && from !== null) { runs.push([from, out ? t : (j - 1) / n]); from = null; }
      }
      for (const [t0, t1] of runs) {
        const whole = t0 === 0 && t1 === 1, l = len * (t1 - t0);
        if (!whole && l < 0.6) continue;
        const tm = (t0 + t1) / 2, cx = a[0] + (b[0] - a[0]) * tm, cz = a[1] + (b[1] - a[1]) * tm;
        // weathered lime-washed brick, darker in long patches of moss and rain streaks
        const tone = 0.9 + 0.12 * Math.abs(Math.sin(cx * 0.37 + cz * 0.21));
        S.kind = KIND.MASONRY;
        S.box(cx, cz, Y - 0.2, Y + k.h, l + (whole ? k.t : 0), k.t, ang, shade(k.body, tone), { top: k.cap });
        S.kind = KIND.TILE;
        S.box(cx, cz, Y + k.h, Y + k.h + k.capH, l + (whole ? k.capW : 0), k.capW, ang, k.cap, { taper: 0.45 });
      }
    }
  };
  for (const flat of data.iwalls || []) {
    const pts = unflat(flat), loc = pts.map(L);
    wallLine(pts, loc.every(([u, v]) => Math.abs(u) < 200 && Math.abs(v) < 215) ? inner : outer);
  }
  for (const line of INNER_ADD) wallLine(line.map(([u, v]) => W(u, v)), inner);

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
  for (const [line, w] of GALLERIES) {
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
      S.hip(m[0], m[1], len + ext, w, ang, Y + 3.1, Math.min(1.9, w * 0.32), PAL.jadeRoof, { over: 0.8, glazed: true });
    }
  }

  // ---- Đại Cung Môn: destroyed in 1947, still only its stone floor and column bases ---------------------------
  {
    const c = W(0, 100.5);
    S.kind = KIND.MASONRY;
    S.box(c[0], c[1], Y - 0.2, Y + 0.7, 27, 11.5, A, shade(PAL.stone, 0.85), { topKind: KIND.ROAD });
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
      const p = W(-11 + i * 4.4, 96.5 + j * 2.7);
      S.box(p[0], p[1], Y + 0.7, Y + 0.95, 0.75, 0.75, A, shade(PAL.stone, 1.08));
    }
    for (const sv of [1, -1]) for (let k = 1; k <= 3; k++) {
      const p = W(0, 100.5 + sv * (5.75 + 0.3 * k));
      S.box(p[0], p[1], Y - 0.2, Y + 0.7 - 0.2 * k, 8, 0.3, A, shade(PAL.stone, 0.9), { topKind: KIND.ROAD });
    }
  }
  S.kind = keep;
}
