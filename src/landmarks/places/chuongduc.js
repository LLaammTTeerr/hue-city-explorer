import { KIND, hex, shade, obb } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';

// Cửa Chương Đức (彰德門), the west gate of the Imperial City (Hoàng thành), the gate of the palace women.
// Built 1804 under Gia Long as a plain three-passage gate (tam quan) with no tower; rebuilt in 1921 under Khải Định
// in brick and concrete, three storeys, every pier cut into panels of glass-and-porcelain mosaic (khảm sành sứ),
// roofed in yellow glazed tiles (hoàng lưu ly) whose round tile ends carry 壽 and the lower ends bats; badly damaged
// by war after 1945 and restored to its 1921 form in 2003–2004. Sources and estimates: docs/places/chuongduc.md.
//   - footprint: OSM way 531016858, 12.7 × 5.4 m, long side on the line of the Imperial City wall (hard-coded below)
//   - three arched passages, the middle one wider and taller (proportions estimated from photographs)
//   - the side bays carry one roof each; the middle bay rises to a skirt roof and a small upper storey under the top
//     roof, so three storeys in all and about 11 m to the ridge finial (estimate)
//   - four pilasters on each face, between and outside the bays, panelled in mosaic, with lotus caps
// The Imperial City's wall (places/dainoi.js) stops at this footprint; this file adds the short brick stubs that
// butt the wall against the gate's flanks, and the paved way through the passages.
export const id = 'chuongduc';

// OSM way 531016858, metres in the model frame (scripts/frame.json)
const RING = [[-1406.29, 170.68], [-1404.67, 169.47], [-1401.99, 167.45], [-1394.33, 177.62], [-1396.38, 179.22], [-1398.52, 180.79]];

const WALL = hex('#d9c38c'); // lime render washed ochre-yellow, as restored
const TRIM = hex('#efe4c4'); // pale mouldings, arch rings, cornices
const PIER = hex('#c9ae72');
const ROOF = PAL.imperialRoof;
const RIDGE = hex('#f1d77a');
const MOSAIC = [hex('#3f7290'), hex('#4f8a5c'), hex('#b0482f'), hex('#e9e2cf')]; // blue, green, red, white sherds
const DOOR = hex('#7c2a1f');
const PLAQUE = hex('#3a2a22'), GOLD = hex('#d6ad48');
const PAVE = hex('#bdb5a4');

export function build({ data, S }) {
  const o = obb(RING);
  const [cx, cz] = o.c;
  // u along the wall (the outline's long side), v through it, +v outward (away from the Imperial City's middle)
  let ang = o.w >= o.d ? o.a : o.a + Math.PI / 2;
  const len = Math.max(o.w, o.d), dep = Math.min(o.w, o.d);
  const C = data.imperial ? [data.imperial.c[0] / 10, data.imperial.c[1] / 10] : [cx + 200, cz - 280];
  { const nx = -Math.sin(ang), nz = Math.cos(ang); if (nx * (cx - C[0]) + nz * (cz - C[1]) < 0) ang += Math.PI; }
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const P = (u, v) => [cx + u * ux - v * uz, cz + u * uz + v * ux];
  const P3 = (u, y, v) => { const q = P(u, v); return [q[0], y, q[1]]; };
  const box = (u, v, y0, y1, su, sv, col, opt) => { const q = P(u, v); S.box(q[0], q[1], y0, y1, su, sv, ang, col, opt); };
  const G = LAND_Y + rise(cx, cz);
  const keep = S.kind;

  const L2 = len / 2, D2 = dep / 2; // 6.35, 2.7
  const BU = 2.35; // the middle bay runs |u| < BU
  const yS = G + 4.6, yC = G + 6.0; // tops of the side bays and of the middle bay

  // ---- ground: a stone plinth and the paved way through the three passages -----------------------------------
  S.kind = KIND.ROAD;
  box(0, 0, G - 0.3, G + 0.04, len + 0.6, dep + 7, PAVE, { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  box(0, 0, G - 0.3, G + 0.22, len + 0.5, dep + 0.5, shade(PAL.stone, 0.92), { topKind: KIND.ROAD });
  const g0 = G + 0.22;

  // ---- the three bays, each a masonry block with its arched passage ------------------------------------------
  // a block from u0 to u1, depth d, up to y1, with an arch of width aw springing at ys
  const bay = (u0, u1, d, y1, aw, ys) => {
    const uc = (u0 + u1) / 2, r = aw / 2;
    S.kind = KIND.PLAIN; // smooth lime render, not bare brick
    box((u0 + uc - r) / 2, 0, g0, y1, uc - r - u0, d, WALL, { top: TRIM });
    box((u1 + uc + r) / 2, 0, g0, y1, u1 - uc - r, d, WALL, { top: TRIM });
    const n = 8;
    for (let k = 0; k < n; k++) {
      const x = -r + (aw * (k + 0.5)) / n;
      box(uc + x, 0, ys + Math.sqrt(Math.max(0, r * r - x * x)), y1, aw / n + 0.01, d, WALL, { top: TRIM });
    }
    // the passage's floor and its half-open red doors folded back against the jambs, at mid-depth
    S.kind = KIND.PLAIN;
    box(uc, 0, g0 - 0.2, g0 + 0.02, aw, d + 0.4, shade(PAVE, 0.9));
    for (const s of [-1, 1]) box(uc + s * (r - 0.06), -0.6, g0, ys + r * 0.55, 0.1, aw * 0.5, DOOR);
    // on each face: a pale moulded arch ring and jambs, and a keystone panel
    for (const sv of [-1, 1]) {
      const v = sv * (d / 2 + 0.05);
      const m = 10, R = r + 0.14;
      for (let k = 0; k < m; k++) {
        const t0 = (Math.PI * k) / m, t1 = (Math.PI * (k + 1)) / m;
        S.beam(P3(uc + Math.cos(t0) * R, ys + Math.sin(t0) * R, v), P3(uc + Math.cos(t1) * R, ys + Math.sin(t1) * R, v), 0.12, 0.26, TRIM);
      }
      for (const s of [-1, 1]) box(uc + s * R, v, g0, ys, 0.26, 0.12, TRIM);
      box(uc, v + sv * 0.02, ys + R, ys + R + 0.42, 0.5, 0.12, MOSAIC[2]);
    }
  };
  bay(-L2, -BU, dep, yS, 1.9, G + 2.3);
  bay(BU, L2, dep, yS, 1.9, G + 2.3);
  bay(-BU, BU, dep + 0.2, yC, 2.6, G + 2.75);

  // cornices: a pale moulded band at the top of each block
  S.kind = KIND.PLAIN; // smooth lime render, not bare brick
  for (const s of [-1, 1]) box(s * (BU + L2) / 2, 0, yS - 0.3, yS, L2 - BU + 0.2, dep + 0.3, TRIM);
  box(0, 0, yC - 0.3, yC, 2 * BU + 0.3, dep + 0.5, TRIM);

  // the name board over the middle arch, on both faces: 彰德門 in gilt on a dark ground, in a pale frame
  S.kind = KIND.PLAIN;
  for (const sv of [-1, 1]) {
    const v = sv * ((dep + 0.2) / 2 + 0.06);
    box(0, v, G + 4.45, G + 5.55, 2.5, 0.12, TRIM);
    box(0, v + sv * 0.05, G + 4.6, G + 5.4, 2.1, 0.08, PLAQUE);
    for (let k = -1; k <= 1; k++) box(k * 0.62, v + sv * 0.09, G + 4.75, G + 5.25, 0.36, 0.03, GOLD);
  }

  // ---- pilasters: four on each face, panelled in porcelain mosaic, with lotus caps ---------------------------
  for (const sv of [-1, 1]) for (const u of [-L2 + 0.3, -BU, BU, L2 - 0.3]) {
    const mid = Math.abs(u) < BU + 0.01, d = mid ? (dep + 0.2) / 2 : dep / 2, top = mid ? yC + 0.35 : yS + 0.35;
    const v = sv * (d + 0.12);
    S.kind = KIND.PLAIN; // smooth lime render, not bare brick
    box(u, v, g0, top, 0.62, 0.3, PIER, { top: TRIM });
    S.kind = KIND.PLAIN;
    // stacked mosaic panels down the shaft
    const n = mid ? 4 : 3, h0 = g0 + 0.5, h1 = top - 0.6, step = (h1 - h0) / n;
    for (let k = 0; k < n; k++) box(u, v + sv * 0.16, h0 + step * k + 0.08, h0 + step * (k + 1) - 0.08, 0.42, 0.04, MOSAIC[(k + (mid ? 1 : 0)) % 3]);
    // the lotus cap
    const q = P(u, v);
    S.cyl(q[0], q[1], top, top + 0.22, 0.3, 0.38, 8, TRIM);
    S.cyl(q[0], q[1], top + 0.22, top + 0.62, 0.26, 0.08, 8, MOSAIC[1]);
  }

  // ---- roofs --------------------------------------------------------------------------------------------------
  const eave = { flare: 0.5, ridgeCol: RIDGE, hips: true, glazed: true, fascia: 0.25, fasciaCol: shade(DOOR, 1.1), segs: 2 };
  // side bays: one roof each, long along the wall, its inner end running into the middle bay
  for (const s of [-1, 1]) {
    const q = P(s * (BU + L2 + 0.4) / 2, 0);
    S.hip(q[0], q[1], L2 - BU + 0.4, dep - 0.3, ang, yS, 1.25, ROOF, { ...eave, over: 0.55 });
  }
  // the middle bay: a skirt roof, the small upper storey, and the top roof
  const q0 = P(0, 0);
  S.hip(q0[0], q0[1], 2 * BU, dep + 0.2, ang, yC, 1.0, ROOF, { ...eave, ridgeCol: null, over: 0.7 });
  const y2 = yC + 0.55, y3 = y2 + 2.1, uw = 3.3, vd = 3.5;
  S.kind = KIND.PLAIN; // smooth lime render, not bare brick
  box(0, 0, y2, y3, uw, vd, WALL, { top: TRIM });
  box(0, 0, y3 - 0.25, y3, uw + 0.2, vd + 0.2, TRIM);
  S.kind = KIND.PLAIN;
  // round windows on the front and back, mosaic panels on the flanks, corner piers
  for (const sv of [-1, 1]) {
    const v = sv * (vd / 2 + 0.03), yc = (y2 + y3) / 2 + 0.05;
    const m = 10, R = 0.55;
    for (let k = 0; k < m; k++) {
      const t0 = (2 * Math.PI * k) / m, t1 = (2 * Math.PI * (k + 1)) / m;
      S.beam(P3(Math.cos(t0) * R, yc + Math.sin(t0) * R, v), P3(Math.cos(t1) * R, yc + Math.sin(t1) * R, v), 0.08, 0.18, TRIM);
    }
    box(0, v, yc - 0.42, yc + 0.42, 0.7, 0.05, shade(DOOR, 0.6));
    for (const s of [-1, 1]) box(s * (uw / 2 + 0.03), v * 0.0 + sv * 0.6, y2 + 0.4, y3 - 0.5, 0.05, 0.8, shade(MOSAIC[sv > 0 ? 0 : 1], 0.8));
  }
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    S.kind = KIND.PLAIN; // smooth lime render, not bare brick
    box(su * (uw / 2), sv * (vd / 2), y2, y3, 0.36, 0.36, PIER, { top: TRIM });
  }
  S.hip(q0[0], q0[1], uw, vd, ang, y3, 1.45, ROOF, { ...eave, over: 0.75 });

  // ridge ornament: a mosaic gourd on a lotus in the middle of the top ridge, curled dragon ends at each end
  const yr = y3 + 1.45;
  S.kind = KIND.PLAIN;
  S.cyl(q0[0], q0[1], yr - 0.1, yr + 0.15, 0.22, 0.3, 8, MOSAIC[1]);
  S.cyl(q0[0], q0[1], yr + 0.15, yr + 0.45, 0.3, 0.22, 8, GOLD);
  S.cyl(q0[0], q0[1], yr + 0.45, yr + 0.8, 0.16, 0.04, 8, GOLD);
  const rl = Math.max(0.3, (uw + 1.5) / 2 - ((vd + 1.5) / 2) * 0.92);
  for (const s of [-1, 1]) {
    box(s * rl, 0, yr - 0.1, yr + 0.35, 0.22, 0.2, RIDGE);
    box(s * (rl + 0.12), 0, yr + 0.2, yr + 0.5, 0.18, 0.18, MOSAIC[1]);
  }

  // ---- wall stubs: where the Imperial City's wall butts against the gate's flanks ----------------------------
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) {
    box(s * (L2 + 0.35), 0, G - 0.2, G + 3.95, 0.7, 1.45, shade(hex('#837a6c'), 1.02), { top: hex('#6b5d4f') });
    S.kind = KIND.TILE;
    box(s * (L2 + 0.35), 0, G + 3.95, G + 4.3, 0.8, 1.6, hex('#6b5d4f'), { taper: 0.6 });
    S.kind = KIND.MASONRY;
  }

  S.kind = keep;
  return null;
}
