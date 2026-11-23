import { KIND, hex, shade, obb } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { OUTER } from '../hoangthanh.js';

// Cửa Chương Đức (彰德門), the west gate of the Imperial City (Hoàng thành), the gate of the palace women.
// Built 1804 under Gia Long as a plain three-passage gate (tam quan) with no tower; rebuilt in 1921 under Khải Định
// in brick and concrete, three storeys, every pier cut into panels of glass-and-porcelain mosaic (khảm sành sứ),
// roofed in yellow glazed tiles (hoàng lưu ly) whose round tile ends carry 壽 and the lower ends bats; badly damaged
// by war after 1945 and restored to its 1921 form in 2003–2004. Sources and estimates: docs/places/chuongduc.md.
//   - footprint: OSM way 531016858, 12.7 × 5.4 m, long side on the line of the Imperial City wall (hard-coded below);
//     it takes in the gate block (about 10.8 m) and a lower flanking pier at each end (Street View, car pano)
//   - one lower block of even height with three arched passages of nearly one size, crowns level, and a tall
//     panelled frieze between the arch crowns and the cornice (Street View)
//   - a deep tiled roof tier over the whole block, level along the eaves with only the corners turned up, and a small
//     upper storey under a plain hipped top roof rising through its middle: three storeys, about 9.4 m to the finial
//   - four pilasters on each face, between and outside the bays, panelled in mosaic that reads pale and grey from the
//     road; the render weathered grey-cream; colour only in the red doors and soft ochre arch surrounds
//   - a stone balustrade along the forecourt's edge on the moat side
// The Imperial City's wall (places/dainoi.js) stops at this footprint; this file adds the short brick stubs that
// butt the wall against the gate's flanks, and the paved way through the passages.
export const id = 'chuongduc';

// OSM way 531016858, metres in the model frame (scripts/frame.json)
const RING = [[-1406.29, 170.68], [-1404.67, 169.47], [-1401.99, 167.45], [-1394.33, 177.62], [-1396.38, 179.22], [-1398.52, 180.79]];

const WALL = hex('#c9c3b2'); // weathered grey-cream lime render, as both Street View panos show it
const RING_COL = hex('#c4ab78'); // soft ochre arch surrounds and jambs
const TRIM = hex('#dcd6c4'); // pale mouldings and cornices
const PIER = hex('#c3bba6');
const RELIEF = hex('#b8b1a0'); // the frieze's relief panels, in shadow
const ROOF = shade(PAL.imperialRoof, 0.66); // old glaze, weathered brown-ochre as Street View shows it
const TILE_END = hex('#a88f5c'); // the row of round tile ends along the eave: weathered ochre, not a painted band
const STAIN = hex('#a9a28f'); // damp skirting
const RIDGE = hex('#c9ad6a');
// glass and porcelain sherds, blue, green, red, white: weathered and fine-grained, they read pale grey from the road
const MOSAIC = [hex('#a8b0ad'), hex('#aab09e'), hex('#bba497'), hex('#d8d3c4')];
const DOOR = hex('#80301f');
const PLAQUE = hex('#5a4a3c'), GOLD = hex('#b99a58');
const PAVE = hex('#bdb5a4');
const STONE = shade(PAL.stone, 0.92);

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

  const OL2 = len / 2; // 6.35: half the outline
  // The car pano on Trần Nguyễn Hãn (84 m off, its position good to a metre or two) sees the block 4.65 m high with
  // its arches 3.1 m apart, the block itself about 10.8 m across, and a lower pier standing at each end: together
  // they fill the 12.7 m outline. Arch crowns about 3.0–3.1 m, the frieze from there to the cornice.
  const L2 = 5.4; // half the block
  const FW = OL2 - L2; // the flanking piers' width, 0.95
  // Both panos put the Imperial City wall's top at about 0.6–0.7 of the block's height, and the user pano shows the
  // gate standing on a terrace behind a balustrade with a stone face under it: the gate's floor stands some 0.9 m
  // over the moat bank, so the wall (4.17 m, hoangthanh.js) meets the gate near its arch crowns.
  const GT = G + 0.85; // the terrace
  const g0 = GT + 0.12; // the gate's floor, one step up
  const yS = g0 + 4.38; // top of the lower block
  const AU = 3.1; // side arches' centres
  const ARCH = [{ uc: -AU, aw: 1.5, ys: g0 + 2.08 }, { uc: 0, aw: 1.6, ys: g0 + 2.1 }, { uc: AU, aw: 1.5, ys: g0 + 2.08 }];
  const yF0 = g0 + 3.1, yF1 = g0 + 4.04; // the frieze, between the arch crowns and the cornice

  // ---- ground: the raised terrace out to the balustrade on the moat side, retained in stone, with steps down at
  // its two ends; the gate's stone plinth; steps down from the passages on the inner side to the paved way --------
  const vB = dep / 2 + 6.6; // the balustrade's line, on the moat side
  const TW = 20.4; // the terrace's length along the wall
  const TV0 = 0.85; // the terrace starts clear of the wall body (its centre line wanders a few decimetres off this outline)
  S.kind = KIND.ROAD;
  box(0, -(dep + 7) / 4 - dep / 4, G - 0.3, G + 0.04, len + 0.6, (dep + 7) / 2 - dep / 2, PAVE, { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  box(0, (vB + 0.2 + TV0) / 2, G - 0.3, GT, TW, vB + 0.2 - TV0, shade(STONE, 0.9), { top: PAVE, topKind: KIND.ROAD }); // from just off the wall's outer face out
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
    const h = GT - ((k + 1) * (GT - G)) / 5;
    box(s * (TW / 2 + 0.17 + k * 0.34), vB - 1.5, G - 0.3, h + 0.01, 0.34, 2.6, STONE, { topKind: KIND.ROAD });
  }
  box(0, 0, G - 0.3, g0, 2 * L2 + 0.5, dep + 0.5, STONE, { topKind: KIND.ROAD });
  for (let k = 0; k < 5; k++) {
    const h = g0 - ((k + 1) * (g0 - G)) / 6;
    box(0, -(dep / 2 + 0.25 + 0.17 + k * 0.34), G - 0.3, h, 2 * L2 - 0.4, 0.34, STONE, { topKind: KIND.ROAD });
  }

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
    // on each face: a moulded arch surround in soft ochre and its jambs
    for (const sv of [-1, 1]) {
      const v = sv * (dep / 2 + 0.04);
      const m = 10, R = r + 0.12;
      for (let k = 0; k < m; k++) {
        const t0 = (Math.PI * k) / m, t1 = (Math.PI * (k + 1)) / m;
        S.beam(P3(uc + Math.cos(t0) * R, ys + Math.sin(t0) * R, v), P3(uc + Math.cos(t1) * R, ys + Math.sin(t1) * R, v), 0.08, 0.2, RING_COL);
      }
      for (const s of [-1, 1]) box(uc + s * R, v, g0, ys, 0.2, 0.08, RING_COL);
    }
  });

  // a damp-stained skirting along the foot of the block, both faces
  for (const sv of [-1, 1]) box(0, sv * (dep / 2 + 0.01), g0, g0 + 0.5, 2 * L2 + 0.04, 0.06, STAIN);

  // ---- the frieze: a tall band of framed relief panels across the whole width, between moulded bands -----------
  S.kind = KIND.PLAIN;
  box(0, 0, yF0 - 0.08, yF0, 2 * L2 + 0.1, dep + 0.1, TRIM); // the moulding under the frieze
  box(0, 0, yF1, yF1 + 0.08, 2 * L2 + 0.14, dep + 0.14, TRIM); // and over it
  box(0, 0, yS - 0.26, yS, 2 * L2 + 0.3, dep + 0.3, TRIM); // the cornice, projecting
  box(0, 0, yF1 + 0.08, yS - 0.26, 2 * L2 + 0.06, dep + 0.06, shade(TRIM, 0.95));
  // panels: one over each arch, one over each pier, and one at each end; the middle one carries the name board
  const PU = (ARCH[1].aw / 2 + AU - ARCH[0].aw / 2) / 2; // midway along the pier between middle and side arches
  const panels = [[-AU, 1.25], [0, 1.4], [AU, 1.25], [-PU, 0.62], [PU, 0.62], [-(L2 - 0.3), 0.36], [L2 - 0.3, 0.36]];
  for (const sv of [-1, 1]) {
    const v = sv * (dep / 2 + 0.035);
    for (const [u, w] of panels) {
      box(u, v, yF0 + 0.1, yF1 - 0.1, w, 0.04, TRIM); // the raised frame
      box(u, v + sv * 0.015, yF0 + 0.17, yF1 - 0.17, w - 0.14, 0.04, w > 1 ? RELIEF : MOSAIC[3]); // the relief inside
    }
    // over the side arches, a band of mosaic roundels in the relief
    for (const u0 of [-AU, AU]) for (let k = -1; k <= 1; k++) {
      const q = P(u0 + k * 0.36, v + sv * 0.04);
      S.cyl(q[0], q[1], yF0 + 0.36, yF0 + 0.62, 0.11, 0.11, 6, MOSAIC[k + 1]);
    }
    // the name board over the middle arch, 彰德門 in faded gilt on a dark ground
    box(0, v + sv * 0.04, yF0 + 0.24, yF1 - 0.24, 1.0, 0.05, PLAQUE);
    for (let k = -1; k <= 1; k++) box(k * 0.28, v + sv * 0.07, yF0 + 0.32, yF1 - 0.32, 0.18, 0.02, GOLD);
  }

  // ---- pilasters: four on each face, outside and between the passages, panelled in mosaic, with lotus caps --
  for (const sv of [-1, 1]) for (const u of [-L2 + 0.3, -PU, PU, L2 - 0.3]) {
    const top = yS + 0.3, v = sv * (dep / 2 + 0.1);
    S.kind = KIND.PLAIN; // smooth lime render, not bare brick
    box(u, v, g0, top, 0.56, 0.24, PIER, { top: TRIM });
    const n = 3, h0 = g0 + 0.55, h1 = yF0 - 0.15, step = (h1 - h0) / n;
    for (let k = 0; k < n; k++) box(u, v + sv * 0.13, h0 + step * k + 0.07, h0 + step * (k + 1) - 0.07, 0.38, 0.03, MOSAIC[(k + (Math.abs(u) < 2 ? 1 : 0)) % 4]);
    const q = P(u, v);
    S.cyl(q[0], q[1], top, top + 0.16, 0.26, 0.32, 8, TRIM);
    S.cyl(q[0], q[1], top + 0.16, top + 0.48, 0.22, 0.06, 8, MOSAIC[1]);
  }

  // ---- the flanking piers: lower blocks at each end of the outline, between the gate and the wall ---------------
  const yW = LAND_Y + OUTER.h + OUTER.capH; // the Imperial City wall's coping, as hoangthanh.js draws it
  for (const s of [-1, 1]) {
    const u = s * (L2 + FW / 2), top = yW + 0.15;
    S.kind = KIND.MASONRY;
    box(u, 0, G - 0.2, GT, FW + 0.2, 2.6, STONE, { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    box(u, 0, GT, top, FW, 2.4, PIER, { top: TRIM });
    box(u, 0, top - 0.22, top, FW + 0.14, 2.54, TRIM);
    for (const sv of [-1, 1]) box(u, sv * 1.215, GT + 0.6, top - 0.5, FW - 0.3, 0.03, MOSAIC[(s + 1) / 2 + 1]);
    const q = P(u, 0);
    S.cyl(q[0], q[1], top, top + 0.2, 0.3, 0.36, 8, TRIM);
    S.cyl(q[0], q[1], top + 0.2, top + 0.6, 0.26, 0.06, 8, MOSAIC[1]);
  }

  // ---- roofs --------------------------------------------------------------------------------------------------
  // The lower tier: a deep skirt of tiles 1.7 m high over the cornice, its eaves level along the faces and turned up
  // only at the corners (many segments, so the lift stays near the corners), a thin ochre row of tile ends.
  const q0 = P(0, 0);
  const tiles = { hips: true, glazed: true, fascia: 0.1, fasciaCol: TILE_END };
  S.hip(q0[0], q0[1], 2 * L2, dep, ang, yS, 1.7, ROOF, { ...tiles, flare: 0.4, segs: 6, ridgeCol: null, over: 0.4 });
  const y2 = yS + 0.2, y3 = yS + 2.95, uw = 3.4, vd = 3.5;
  S.kind = KIND.PLAIN; // smooth lime render, not bare brick
  box(0, 0, y2, y3, uw, vd, WALL, { top: TRIM });
  box(0, 0, y3 - 0.22, y3, uw + 0.18, vd + 0.18, TRIM);
  // round windows on the front and back, mosaic panels on the flanks, corner piers (the part above the roof tier)
  const yw = yS + 1.5;
  for (const sv of [-1, 1]) {
    const v = sv * (vd / 2 + 0.03), yc = (yw + y3) / 2;
    const m = 10, R = 0.45;
    for (let k = 0; k < m; k++) {
      const t0 = (2 * Math.PI * k) / m, t1 = (2 * Math.PI * (k + 1)) / m;
      S.beam(P3(Math.cos(t0) * R, yc + Math.sin(t0) * R, v), P3(Math.cos(t1) * R, yc + Math.sin(t1) * R, v), 0.07, 0.16, TRIM);
    }
    box(0, v, yc - 0.34, yc + 0.34, 0.58, 0.05, shade(DOOR, 0.55));
    for (const s of [-1, 1]) box(s * (uw / 2 + 0.03), sv * 0.6, yw - 0.1, y3 - 0.4, 0.05, 0.8, MOSAIC[sv > 0 ? 0 : 1]);
  }
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    S.kind = KIND.PLAIN; // smooth lime render, not bare brick
    box(su * (uw / 2), sv * (vd / 2), y2, y3, 0.32, 0.32, PIER, { top: TRIM });
  }
  // the top roof: small and plainly hipped, a modest upturn at the corners, no horns
  const hTop = 1.25;
  S.hip(q0[0], q0[1], uw, vd, ang, y3, hTop, ROOF, { ...tiles, hips: false, flare: 0.22, segs: 4, ridgeCol: RIDGE, over: 0.55 });

  // ridge ornament: a mosaic gourd on a lotus in the middle of the top ridge
  const yr = y3 + hTop;
  S.kind = KIND.PLAIN;
  S.cyl(q0[0], q0[1], yr - 0.1, yr + 0.12, 0.2, 0.26, 8, MOSAIC[1]);
  S.cyl(q0[0], q0[1], yr + 0.12, yr + 0.4, 0.26, 0.2, 8, GOLD);
  S.cyl(q0[0], q0[1], yr + 0.4, yr + 0.72, 0.14, 0.03, 8, GOLD);

  // ---- the balustrade along the forecourt's edge on the moat side: a stone plinth, balusters, a rail, posts -------
  {
    const BL = TW, y0 = GT, yb = y0 + 0.22, yt = y0 + 0.82;
    S.kind = KIND.MASONRY;
    box(0, vB, y0 - 0.1, yb, BL, 0.42, STONE, { top: shade(STONE, 1.05) });
    box(0, vB, yt - 0.1, yt, BL, 0.3, shade(STONE, 1.06));
    const posts = 9;
    for (let k = 0; k < posts; k++) {
      const u = -BL / 2 + 0.2 + (k * (BL - 0.4)) / (posts - 1);
      box(u, vB, yb, yt + 0.18, 0.34, 0.34, shade(STONE, 0.97), { top: shade(STONE, 1.05) });
      if (k === posts - 1) break;
      const u1 = -BL / 2 + 0.2 + ((k + 1) * (BL - 0.4)) / (posts - 1), nb = 9;
      for (let j = 1; j <= nb; j++) box(u + ((u1 - u) * j) / (nb + 1), vB, yb, yt - 0.1, 0.1, 0.12, shade(STONE, 0.9));
    }
  }

  // ---- wall stubs: where the Imperial City's wall butts against the gate's flanks, at the wall's own height ------
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) {
    box(s * (OL2 + 0.35), 0, G - 0.2, LAND_Y + OUTER.h, 0.7, OUTER.t + 0.1, OUTER.body, { top: OUTER.cap });
    S.kind = KIND.TILE;
    box(s * (OL2 + 0.35), 0, LAND_Y + OUTER.h, yW, 0.8, OUTER.capW, OUTER.cap, { taper: 0.45 });
    S.kind = KIND.MASONRY;
  }

  S.kind = keep;
  return null;
}
