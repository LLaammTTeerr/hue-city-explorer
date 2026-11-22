import { KIND, hex, shade, obb } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';

// Cửa Chương Đức (彰德門), the west gate of the Imperial City (Hoàng thành), the gate of the palace women.
// Built 1804 under Gia Long as a plain three-passage gate (tam quan) with no tower; rebuilt in 1921 under Khải Định
// in brick and concrete, three storeys, every pier cut into panels of glass-and-porcelain mosaic (khảm sành sứ),
// roofed in yellow glazed tiles (hoàng lưu ly) whose round tile ends carry 壽 and the lower ends bats; badly damaged
// by war after 1945 and restored to its 1921 form in 2003–2004. Sources and estimates: docs/places/chuongduc.md.
//   - footprint: OSM way 531016858, 12.7 × 5.4 m, long side on the line of the Imperial City wall (hard-coded below)
//   - one lower block of even height with three arched passages of nearly one size, crowns level (Street View)
//   - a roof tier over the whole block, and a small upper storey under the top roof rising through its middle,
//     so three storeys in all and about 10 m to the ridge finial (estimated from Street View against the footprint)
//   - four pilasters on each face, between and outside the bays, panelled in mosaic, with lotus caps
// The Imperial City's wall (places/dainoi.js) stops at this footprint; this file adds the short brick stubs that
// butt the wall against the gate's flanks, and the paved way through the passages.
export const id = 'chuongduc';

// OSM way 531016858, metres in the model frame (scripts/frame.json)
const RING = [[-1406.29, 170.68], [-1404.67, 169.47], [-1401.99, 167.45], [-1394.33, 177.62], [-1396.38, 179.22], [-1398.52, 180.79]];

const WALL = hex('#d8cfb6'); // weathered pale lime render, as Street View shows it
const RING_COL = hex('#d6b866'); // ochre-yellow arch rings and jambs
const TRIM = hex('#efe4c4'); // pale mouldings, arch rings, cornices
const PIER = hex('#cfc19c');
const ROOF = shade(PAL.imperialRoof, 0.82); // old glaze, weathered brown-ochre as Street View shows it
const STAIN = hex('#b9ad90'); // damp skirting
const RIDGE = hex('#f1d77a');
const MOSAIC = [hex('#5a7f90'), hex('#6a8f6a'), hex('#a65a44'), hex('#e6dfcc')]; // blue, green, red, white sherds, weathered (they read pale from the road)
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

  const L2 = len / 2; // 6.35
  // Street View (Lê Huân lawn, Trần Nguyễn Hãn) shows one block of even height across all three bays, its arches
  // nearly alike with their crowns level, a roof tier over the whole block and a narrow upper storey above the
  // middle; measured against the 12.7 m footprint: block about 4.6 m, arch crowns about 3.1–3.3 m, side arches
  // centred 3.8 m off the middle, the upper storey about 3.4 m wide with its eaves near 8 m.
  const yS = G + 4.6; // top of the lower block
  const AU = 3.8; // side arches' centres
  const ARCH = [{ uc: -AU, aw: 1.7, ys: G + 2.3 }, { uc: 0, aw: 1.9, ys: G + 2.35 }, { uc: AU, aw: 1.7, ys: G + 2.3 }];

  // ---- ground: a stone plinth and the paved way through the three passages -----------------------------------
  S.kind = KIND.ROAD;
  box(0, 0, G - 0.3, G + 0.04, len + 0.6, dep + 7, PAVE, { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  box(0, 0, G - 0.3, G + 0.22, len + 0.5, dep + 0.5, shade(PAL.stone, 0.92), { topKind: KIND.ROAD });
  const g0 = G + 0.22;

  // ---- the lower block: piers between the passages, and the masonry over each arch ----------------------------
  S.kind = KIND.PLAIN; // smooth lime render, not bare brick
  const edges = [-L2];
  for (const a of ARCH) edges.push(a.uc - a.aw / 2, a.uc + a.aw / 2);
  edges.push(L2);
  for (let k = 0; k < edges.length; k += 2) box((edges[k] + edges[k + 1]) / 2, 0, g0, yS, edges[k + 1] - edges[k], dep, WALL, { top: TRIM });
  ARCH.forEach(({ uc, aw, ys }, i) => {
    const r = aw / 2, n = 8;
    S.kind = KIND.PLAIN;
    for (let k = 0; k < n; k++) {
      const x = -r + (aw * (k + 0.5)) / n;
      box(uc + x, 0, ys + Math.sqrt(Math.max(0, r * r - x * x)), yS, aw / n + 0.01, dep, WALL, { top: TRIM });
    }
    box(uc, 0, g0 - 0.2, g0 + 0.02, aw, dep + 0.4, shade(PAVE, 0.9));
    if (i === 1) {
      // the middle passage stands open, its leaves folded back against the jambs
      for (const s of [-1, 1]) box(uc + s * (r - 0.06), -0.6, g0, ys + r * 0.55, 0.1, aw * 0.5, DOOR);
    } else {
      // the side passages are shut: red leaves a little inside each face, filling the arch
      for (const sv of [-1, 1]) {
        const v = sv * (dep / 2 - 0.35);
        box(uc, v, g0, ys, aw, 0.1, DOOR);
        for (let k = 0; k < 6; k++) {
          const x = -r + (aw * (k + 0.5)) / 6;
          box(uc + x, v, ys, ys + Math.sqrt(Math.max(0, r * r - x * x)) - 0.02, aw / 6 + 0.01, 0.1, DOOR);
        }
      }
    }
    // on each face: a moulded arch ring in ochre and its jambs, and a keystone panel
    for (const sv of [-1, 1]) {
      const v = sv * (dep / 2 + 0.05);
      const m = 10, R = r + 0.14;
      for (let k = 0; k < m; k++) {
        const t0 = (Math.PI * k) / m, t1 = (Math.PI * (k + 1)) / m;
        S.beam(P3(uc + Math.cos(t0) * R, ys + Math.sin(t0) * R, v), P3(uc + Math.cos(t1) * R, ys + Math.sin(t1) * R, v), 0.12, 0.26, RING_COL);
      }
      for (const s of [-1, 1]) box(uc + s * R, v, g0, ys, 0.26, 0.12, RING_COL);
      if (i !== 1) box(uc, v + sv * 0.02, ys + R + 0.05, ys + R + 0.4, 0.45, 0.1, MOSAIC[2]);
    }
  });

  // a damp-stained skirting along the foot of the block, both faces
  for (const sv of [-1, 1]) box(0, sv * (dep / 2 + 0.01), g0, g0 + 0.55, len + 0.04, 0.06, STAIN);
  // a recessed relief band under the cornice (the frieze panels), one panel per bay
  for (const sv of [-1, 1]) for (const a of ARCH) box(a.uc, sv * (dep / 2 + 0.03), yS - 0.7, yS - 0.35, a.aw * 1.6, 0.05, shade(WALL, 0.9));

  // the frieze and cornice: one pale moulded band along the whole top of the block
  S.kind = KIND.PLAIN;
  box(0, 0, yS - 0.75, yS - 0.6, len + 0.12, dep + 0.12, TRIM);
  box(0, 0, yS - 0.3, yS, len + 0.3, dep + 0.3, TRIM);

  // the name board over the middle arch, on both faces: 彰德門 in gilt on a dark ground, in a pale frame
  for (const sv of [-1, 1]) {
    const v = sv * (dep / 2 + 0.06);
    box(0, v, G + 3.62, G + 4.3, 2.1, 0.12, TRIM);
    box(0, v + sv * 0.05, G + 3.7, G + 4.22, 1.8, 0.08, PLAQUE);
    for (let k = -1; k <= 1; k++) box(k * 0.52, v + sv * 0.09, G + 3.78, G + 4.14, 0.3, 0.03, GOLD);
  }

  // ---- pilasters: four on each face, outside and between the passages, panelled in mosaic, with lotus caps --
  const PU = (ARCH[1].aw / 2 + AU - ARCH[0].aw / 2) / 2; // midway along the pier between middle and side arches
  for (const sv of [-1, 1]) for (const u of [-L2 + 0.3, -PU, PU, L2 - 0.3]) {
    const top = yS + 0.35, v = sv * (dep / 2 + 0.12);
    S.kind = KIND.PLAIN; // smooth lime render, not bare brick
    box(u, v, g0, top, 0.62, 0.3, PIER, { top: TRIM });
    const n = 3, h0 = g0 + 0.5, h1 = top - 0.6, step = (h1 - h0) / n;
    for (let k = 0; k < n; k++) box(u, v + sv * 0.16, h0 + step * k + 0.08, h0 + step * (k + 1) - 0.08, 0.42, 0.04, MOSAIC[(k + (Math.abs(u) < 2 ? 1 : 0)) % 3]);
    const q = P(u, v);
    S.cyl(q[0], q[1], top, top + 0.22, 0.3, 0.38, 8, TRIM);
    S.cyl(q[0], q[1], top + 0.22, top + 0.62, 0.26, 0.08, 8, MOSAIC[1]);
  }

  // ---- roofs --------------------------------------------------------------------------------------------------
  const eave = { flare: 0.5, ridgeCol: RIDGE, hips: true, glazed: true, fascia: 0.25, fasciaCol: shade(DOOR, 1.1), segs: 2 };
  // the roof tier over the whole lower block, the upper storey rising through its middle
  const q0 = P(0, 0);
  S.hip(q0[0], q0[1], len, dep, ang, yS, 1.3, ROOF, { ...eave, ridgeCol: null, over: 0.6 });
  const y2 = yS + 0.2, y3 = G + 7.9, uw = 3.4, vd = 3.5;
  S.kind = KIND.PLAIN; // smooth lime render, not bare brick
  box(0, 0, y2, y3, uw, vd, WALL, { top: TRIM });
  box(0, 0, y3 - 0.25, y3, uw + 0.2, vd + 0.2, TRIM);
  S.kind = KIND.PLAIN;
  // round windows on the front and back, mosaic panels on the flanks, corner piers (the part above the roof tier)
  const yw = yS + 1.3;
  for (const sv of [-1, 1]) {
    const v = sv * (vd / 2 + 0.03), yc = (yw + y3) / 2 + 0.05;
    const m = 10, R = 0.5;
    for (let k = 0; k < m; k++) {
      const t0 = (2 * Math.PI * k) / m, t1 = (2 * Math.PI * (k + 1)) / m;
      S.beam(P3(Math.cos(t0) * R, yc + Math.sin(t0) * R, v), P3(Math.cos(t1) * R, yc + Math.sin(t1) * R, v), 0.08, 0.18, TRIM);
    }
    box(0, v, yc - 0.38, yc + 0.38, 0.64, 0.05, shade(DOOR, 0.6));
    for (const s of [-1, 1]) box(s * (uw / 2 + 0.03), sv * 0.6, yw - 0.2, y3 - 0.4, 0.05, 0.8, shade(MOSAIC[sv > 0 ? 0 : 1], 0.8));
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
