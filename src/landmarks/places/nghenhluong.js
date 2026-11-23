import { Buf, KIND, hex, shade, hipShape, unflat } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';

// Nghênh Lương Đình (迎涼亭), the royal river pavilion on the Kỳ Đài – Phu Văn Lâu axis, at the Hương River bank.
// Built 1852 (Tự Đức 5), restored 1903 (Thành Thái 15) after storm damage, rebuilt 1918 (Khải Định 3) and joined
// to the boat landing. Sources and estimates: docs/places/nghenhluong.md.
//
// Plan (sourced): a "phương đình 1 gian 4 chái" (a square open pavilion, one central bay ringed by four aisles) on
// 16 wooden columns, open on all four sides, with a "nhà vỏ cua" (crab-shell porch) before and behind joined to it
// by gutters. Main roof two-tiered (chồng diêm) in yellow glazed tubular tiles, the porch roofs in yellow glazed
// flat tiles; on the main ridge two dragons facing the sun. Platform 0.9 m, brick and bluestone kerbs; on the river
// side 13 steps down to a corridor at the water.
// Footprint: OSM way 239568224, 14.7 m along the axis × 11.1 m across, is the pavilion under its roofs (the satellite
// roof measures 15.0 × 11.9 m). The pavilion stands on a square terrace about 17.7 × 18 m (satellite), reached from
// the plaza by a flight about 8 m wide between low ochre parapets (Street View from Lê Duẩn), with a brick-paved
// apron about 9 m deep and 28 m wide before it. The column grid, tier heights and the porch depth are estimates from
// photos, scaled to the OSM outline.
export const id = 'nghenhluong';

// the centre and long axis (metres, model frame: x east, z south), the axis pointing to the river. OSM's outline
// centre is (-796.33, 453.15); on the satellite (z20, measured on the terrace and on the roof, which agree) the
// pavilion stands 1.8 m north-east of it across the axis and 0.4 m toward the river, so the outline is re-framed here.
// The axis (145.4°) matches the satellite to within a degree.
const C0 = [-794.62, 452.46];
const AX = (() => { const dx = 8.3 + 8.4, dz = 12.1 + 12.1, l = Math.hypot(dx, dz); return [dx / l, dz / l]; })();

// the glazed yellow tiles have weathered to a dull ochre-brown (Street View) that reads tan from above (satellite)
const ROOF = hex('#a98252');
const RIDGE = hex('#4f453c'); // the ridges and crest: dark, almost charcoal (Street View)
const CREST = hex('#3f3a33');
const LAC = PAL.lacquer; // red lacquered columns and beams
const GOLD = hex('#c9a13b');
const KERB = hex('#7d817f'); // đá thanh, the grey-blue bluestone of the kerbs and steps
const OCHRE = hex('#c4a067'); // the terrace's plastered face and parapets, a weathered ochre (Street View)
const PANEL = hex('#c9a65a'); // the yellow panels on the porch piers
const PAVE = hex('#a3735c'); // the brick-paved apron toward the plaza (satellite)
const FLOOR = hex('#b8ab95');
const LANTERN = [1.0, 0.72, 0.34];

export function build({ data, S, group, place, THREE }) {
  const c = place ? [place.x, place.z] : C0;
  // keep the OSM outline's centre when the place record sits a little off it (its label point)
  const cx = Math.hypot(c[0] - C0[0], c[1] - C0[1]) < 6 ? C0[0] : c[0], cz = Math.hypot(c[0] - C0[0], c[1] - C0[1]) < 6 ? C0[1] : c[1];
  const [fx, fz] = AX, px = -fz, pz = fx; // f: along the axis toward the river; p: across it
  const fa = Math.atan2(fz, fx), pa = fa + Math.PI / 2;
  const at = (a, b) => [cx + fx * a + px * b, cz + fz * a + pz * b];
  const L = new Buf(400); // night light strips under the eaves
  const lan = [], lanC = [];
  const lantern = (q, y) => { lan.push(q[0], y, q[1]); lanC.push(...LANTERN); };

  // ---- the brick-paved apron between the plaza and the terrace (satellite: about 9 m deep, 28 m wide) ----
  const PL = 17.7, PW = 18.0, PH = 0.9, y0 = LAND_Y + PH; // the terrace (satellite)
  const n = 5, rise = PH / n, tread = 0.3;
  S.kind = KIND.MASONRY;
  {
    const a0 = -(PL / 2 + tread * (n - 1)), a1 = -18.0, q = at((a0 + a1) / 2, 0);
    S.box(q[0], q[1], LAND_Y - 0.2, LAND_Y + 0.05, a0 - a1, 28.0, fa, PAVE, { topKind: KIND.ROAD });
  }

  // ---- the terrace (0.9 m): an ochre plastered face on a bluestone plinth, a bluestone kerb round the floor ----
  S.box(cx, cz, LAND_Y - 0.3, LAND_Y + 0.18, PL + 0.2, PW + 0.2, fa, KERB, { topKind: KIND.ROAD });
  S.box(cx, cz, LAND_Y + 0.18, y0 - 0.14, PL, PW, fa, OCHRE);
  S.box(cx, cz, y0 - 0.14, y0, PL + 0.12, PW + 0.12, fa, KERB, { top: FLOOR, topKind: KIND.ROAD });

  // a flight up the middle of the plaza (front) face, about 8 m wide (Street View), and a narrower one on the
  // river face (not visible in the imagery; kept from the earlier estimate)
  for (const sg of [-1, 1]) {
    const sw = sg < 0 ? 8.0 : 3.4;
    S.kind = KIND.MASONRY;
    for (let k = 1; k < n; k++) {
      const q = at(sg * (PL / 2 + tread * (k - 0.5)), 0);
      S.box(q[0], q[1], LAND_Y - 0.2, y0 - rise * k, tread, sw, fa, shade(KERB, 1.08), { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    for (const s2 of [-1, 1]) {
      const a = at(sg * (PL / 2 - 0.2), s2 * (sw / 2 + 0.2)), b = at(sg * (PL / 2 + tread * (n - 1) + 0.1), s2 * (sw / 2 + 0.2));
      S.beam([a[0], y0 + 0.1, a[1]], [b[0], LAND_Y + 0.12, b[1]], 0.36, 0.34, KERB);
    }
  }
  // the low parapets round the terrace, broken by the two flights: ochre balustrades with a band of sunk panels on
  // both faces and a dark coping (Street View from the plaza; the satellite shows the rim on all four sides)
  const parapet = (a0, b0, a1, b1) => { // from (a0, b0) to (a1, b1) in the terrace's frame, straight along a or b
    const len = Math.hypot(a1 - a0, b1 - b0), alongA = Math.abs(a1 - a0) > Math.abs(b1 - b0), ang = alongA ? fa : pa;
    const q = at((a0 + a1) / 2, (b0 + b1) / 2);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], y0, y0 + 0.08, len, 0.46, ang, shade(OCHRE, 0.9)); // the plinth
    S.box(q[0], q[1], y0 + 0.08, y0 + 0.52, len, 0.4, ang, OCHRE);
    S.box(q[0], q[1], y0 + 0.52, y0 + 0.64, len + 0.06, 0.5, ang, shade(KERB, 0.62)); // the coping
    S.kind = KIND.PLAIN;
    const np = Math.max(1, Math.round(len / 0.75)), pl = len / np;
    for (let k = 0; k < np; k++) {
      const t = (k + 0.5) / np, m = at(a0 + (a1 - a0) * t, b0 + (b1 - b0) * t);
      S.box(m[0], m[1], y0 + 0.17, y0 + 0.43, pl - 0.2, 0.43, ang, shade(OCHRE, 0.58)); // sunk panels, both faces
    }
  };
  const ea = PL / 2 - 0.2, eb = PW / 2 - 0.2;
  for (const s2 of [-1, 1]) {
    parapet(-ea, s2 * 4.3, -ea, s2 * (eb - 0.2)); // plaza front, either side of the 8 m flight
    parapet(ea, s2 * 1.95, ea, s2 * (eb - 0.2)); // river front, either side of the 3.4 m flight
    parapet(-ea, s2 * eb, ea, s2 * eb); // the two sides
  }

  // ---- the open pavilion: 16 columns in a 4 × 4 grid (one bay and four aisles), porches before and behind ----
  const G = [-4.0, -1.6, 1.6, 4.0]; // column lines, both ways (estimated: 8 m square at the outer columns)
  const PD = 2.4; // depth of each crab-shell porch
  // column heights above the floor: the lower eave about 3.3 m up, the porch eave just under it so the two read
  // as one line from the plaza, the inner columns rising to the upper tier (Street View, scaled to the satellite
  // eave width)
  const hOut = 3.2, hIn = 4.6, hPorch = 3.0;
  const col = (a, b, h, r) => {
    const q = at(a, b);
    S.cyl(q[0], q[1], y0, y0 + 0.24, r * 1.8, r * 1.55, 6, shade(PAL.stone, 0.95), { cap: false, rot: fa });
    S.cyl(q[0], q[1], y0 + 0.24, y0 + h, r, r * 0.93, 8, LAC, { cap: false, rot: fa });
  };
  S.kind = KIND.TIMBER;
  for (const a of G) for (const b of G) {
    const inner = Math.abs(a) < 2 && Math.abs(b) < 2;
    col(a, b, inner ? hIn : hOut, inner ? 0.2 : 0.17);
  }

  // beams on the column heads, with the carved fretwork (liên ba) hung between the outer columns
  const beam = (a0, b0, a1, b1, y, w, h, colr) => { const p = at(a0, b0), q = at(a1, b1); S.beam([p[0], y, p[1]], [q[0], y, q[1]], w, h, colr); };
  const lb = shade(LAC, 0.8);
  for (const sg of [-1, 1]) {
    beam(-4, sg * 4, 4, sg * 4, y0 + hOut - 0.12, 0.26, 0.3, lb); // the sides of the main square
    beam(sg * 4, -4, sg * 4, 4, y0 + hOut - 0.12, 0.26, 0.3, lb);
    for (const b of [-4, 4]) beam(sg * 4, b, sg * (4 + PD), b, y0 + hPorch - 0.12, 0.2, 0.24, lb);
    beam(-1.6, sg * 1.6, 1.6, sg * 1.6, y0 + hIn - 0.15, 0.28, 0.34, lb); // the inner square
    beam(sg * 1.6, -1.6, sg * 1.6, 1.6, y0 + hIn - 0.15, 0.28, 0.34, lb);
    for (const b of G) beam(sg * 1.6, Math.abs(b) < 2 ? b : b * 0.4, sg * 4, b, y0 + hOut - 0.35, 0.18, 0.22, lb); // tie beams out to the aisle
  }
  S.kind = KIND.PLAIN;
  const fret = (a, b, ang, len, yTop, h) => { const q = at(a, b); S.box(q[0], q[1], yTop - h, yTop, len, 0.07, ang, shade(LAC, 0.62)); S.box(q[0], q[1], yTop - 0.06, yTop, len, 0.1, ang, GOLD); };
  for (const sg of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const m = (G[i] + G[i + 1]) / 2, len = G[i + 1] - G[i] - 0.36;
      fret(sg * 4, m, pa, len, y0 + hOut - 0.27, 0.42); // main square, front/back faces (inside the porch)
      fret(m, sg * 4, fa, len, y0 + hOut - 0.27, 0.42); // main square, the open sides
    }
  }
  // the porch fronts (Street View): solid red piers with yellow panels, a round-headed opening in each side bay, a
  // wide plain opening in the middle, and over all three a deep dark-red lintel band up to the eave
  for (const sg of [-1, 1]) {
    const a = sg * (4 + PD), dep = 0.55, yL = y0 + hPorch - 0.82, front = a + sg * (dep / 2 + 0.02);
    S.kind = KIND.TIMBER;
    const lin = at(a, 0);
    S.box(lin[0], lin[1], yL, y0 + hPorch + 0.02, 8.6, dep, pa, shade(LAC, 0.62));
    S.kind = KIND.PLAIN;
    let q = at(front, 0);
    S.box(q[0], q[1], yL + 0.1, yL + 0.16, 8.4, 0.04, pa, GOLD); // a thin gilt line along it
    S.box(q[0], q[1], yL + 0.3, y0 + hPorch - 0.12, 7.6, 0.04, pa, shade(LAC, 0.45)); // its sunk board
    for (const [bc, bw] of [[-3.85, 0.8], [-1.75, 0.7], [1.75, 0.7], [3.85, 0.8]]) {
      S.kind = KIND.TIMBER;
      q = at(a, bc);
      S.box(q[0], q[1], y0, yL, bw, dep, pa, LAC);
      S.kind = KIND.PLAIN;
      q = at(front, bc);
      S.box(q[0], q[1], y0 + 0.35, yL - 0.9, bw - 0.28, 0.04, pa, PANEL); // a tall yellow panel
      S.box(q[0], q[1], yL - 0.75, yL - 0.2, bw - 0.28, 0.04, pa, PANEL); // a short one above
    }
    // the side bays: a spandrel filled down to a round-headed arch between the piers
    for (const s2 of [-1, 1]) {
      const b0 = 2.1, b1 = 3.45, ySpring = y0 + 1.55, yCrown = yL - 0.12, N = 8;
      const arch = (t) => ySpring + (yCrown - ySpring) * Math.sin(Math.PI * t);
      for (let k = 0; k < N; k++) {
        const t0 = k / N, t1 = (k + 1) / N, bm = s2 * (b0 + (b1 - b0) * (t0 + t1) / 2), ym = Math.min(arch(t0), arch(t1));
        q = at(a, bm);
        S.kind = KIND.TIMBER;
        S.box(q[0], q[1], ym, yL, (b1 - b0) / N + 0.01, dep * 0.7, pa, shade(LAC, 0.9));
        const p0 = at(front - sg * 0.1, s2 * (b0 + (b1 - b0) * t0)), p1 = at(front - sg * 0.1, s2 * (b0 + (b1 - b0) * t1));
        S.kind = KIND.PLAIN;
        S.beam([p0[0], arch(t0), p0[1]], [p1[0], arch(t1), p1[1]], 0.08, 0.07, GOLD);
      }
    }
  }

  // ---- roofs ----
  // Nearly straight eaves (Street View): a slight sweep, small corner ornaments instead of upturned horns, dark ridges
  const eave = { flare: 0.12, fascia: 0.24, fasciaCol: shade(LAC, 0.62), glazed: true, segs: 3, horns: false, tip: 0.35 };
  const lights = [];
  // the porches: a lower hip roof each, ridge across the axis, its inner slope running into the main roof's gutter
  for (const sg of [-1, 1]) {
    const q = at(sg * (4.0 + PD / 2), 0);
    S.kind = KIND.TIMBER;
    S.box(q[0], q[1], y0 + hPorch - 0.1, y0 + hPorch + 0.02, 8.0, PD, pa, shade(LAC, 0.5), { top: shade(ROOF, 0.8), bottom: true });
    S.hip(q[0], q[1], 8.0, PD, pa, y0 + hPorch, 0.75, ROOF, { ...eave, flare: 0.08, over: 0.9, ridgeCol: RIDGE, hips: true, segs: 2 });
    lights.push({ q, w: 8.0, d: PD, ang: pa, y: y0 + hPorch, over: 0.9, fascia: 0.24, sides: [sg > 0 ? 'v+' : 'v-', 'u-', 'u+'] });
  }
  // the main roof, first tier: a skirt of tiles all round the 8 m square from the outer column heads
  const h1 = 1.6;
  {
    S.kind = KIND.TIMBER;
    S.box(cx, cz, y0 + hOut - 0.1, y0 + hOut + 0.02, 8.0, 8.0, pa, shade(LAC, 0.5), { top: shade(ROOF, 0.8), bottom: true });
    S.hip(cx, cz, 8.0, 8.0, pa, y0 + hOut, h1, ROOF, { ...eave, over: 1.15, hips: true, ridgeCol: RIDGE });
    lights.push({ q: [cx, cz], w: 8.0, d: 8.0, ang: pa, y: y0 + hOut, over: 1.15, fascia: 0.24, sides: ['u-', 'u+', 'v-', 'v+'] });
  }
  // the chồng diêm: a thin dark band over the inner columns between the two tiers; the upper roof sits almost on the
  // lower one (Street View: about 0.4 m of band shows above the lower tiles)
  const yb0 = y0 + hOut + 0.7, yb1 = y0 + hIn;
  S.kind = KIND.TIMBER;
  S.box(cx, cz, yb0, yb1, 3.6, 3.4, pa, hex('#3d2a22'), { top: shade(ROOF, 0.8) });
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) { // a fine gilt bead along its top
    let q = at(sg * 1.71, 0); S.box(q[0], q[1], yb1 - 0.12, yb1 - 0.07, 3.5, 0.03, pa, GOLD);
    q = at(0, sg * 1.81); S.box(q[0], q[1], yb1 - 0.12, yb1 - 0.07, 3.3, 0.03, fa, GOLD);
  }
  // second tier: the upper hip roof, its ridge across the axis (parallel to the river); its eave about 55% as wide as
  // the lower one's (Street View)
  const y2 = yb1, h2 = 1.6, w2 = 4.0, d2 = 3.4, o2 = 0.85;
  S.hip(cx, cz, w2, d2, pa, y2, h2, ROOF, { ...eave, over: o2, ridgeCol: RIDGE, hips: true });
  lights.push({ q: [cx, cz], w: w2, d: d2, ang: pa, y: y2, over: o2, fascia: 0.24, sides: ['u-', 'u+', 'v-', 'v+'] });

  // the crest: a heavy dark ridge wall running on down the hips, tall curled ornaments at its ends and in the middle
  // the lưỡng long chầu nhật (two dragons rising to a flaming disc) (Street View: the crest dominates the silhouette)
  {
    const sh = hipShape(w2 + o2 * 2, d2 + o2 * 2, eave.flare, true, RIDGE, eave.segs);
    const ySurf = (b) => y2 + h2 * Math.min(1, Math.max(0, (sh.hw - Math.abs(b)) / (sh.hw - sh.rl))) ** sh.gamma;
    const yt = y2 + h2 + 0.45, CL = 1.45, N = 6;
    S.kind = KIND.GLAZED;
    for (let k = 0; k < N; k++) {
      const b0 = -CL + (2 * CL * k) / N, b1 = b0 + (2 * CL) / N, q = at(0, (b0 + b1) / 2);
      S.box(q[0], q[1], Math.min(ySurf(b0), ySurf(b1)) - 0.05, yt, b1 - b0 + 0.01, 0.34, pa, CREST);
    }
    let q = at(0, 0);
    S.box(q[0], q[1], yt - 0.24, yt - 0.14, 2 * CL - 0.3, 0.37, pa, shade(RIDGE, 1.35)); // a paler moulding along it
    for (const sg of [-1, 1]) {
      // the end ornaments: a block rising off the crest and curling outward
      const e0 = at(0, sg * (CL - 0.2)), e1 = at(0, sg * (CL + 0.05)), e2 = at(0, sg * (CL + 0.3));
      S.beam([e0[0], yt - 0.1, e0[1]], [e1[0], yt + 0.42, e1[1]], 0.34, 0.36, CREST);
      S.beam([e1[0], yt + 0.42, e1[1]], [e2[0], yt + 0.5, e2[1]], 0.26, 0.28, CREST);
      // a dragon either side of the middle, rising toward it
      const a = at(0, sg * 1.0), b = at(0, sg * 0.6), t = at(0, sg * 0.32);
      S.beam([a[0], yt - 0.05, a[1]], [b[0], yt + 0.35, b[1]], 0.22, 0.24, hex('#4a5442'));
      S.beam([b[0], yt + 0.35, b[1]], [t[0], yt + 0.45, t[1]], 0.18, 0.2, hex('#4a5442'));
    }
    q = at(0, 0);
    S.cyl(q[0], q[1], yt, yt + 0.25, 0.14, 0.22, 6, CREST, { cap: true, rot: fa });
    S.cyl(q[0], q[1], yt + 0.25, yt + 0.7, 0.26, 0.05, 8, hex('#8a6a3a'), { cap: true, rot: fa });
    S.kind = KIND.PLAIN;
  }

  // ---- toward the river: a paved strip to the bank, 13 steps down it, a small landing at the water and a short jetty
  // The model's bank (the land polygon) runs about 18 m out along the axis from the centre. The satellite shows only a
  // modest paved strip from the terrace to the bank and one short jetty about 21 m out; the real flight starts at
  // the platform, but the model's land fills the space where it drops, so the 13 steps are laid down the bank face.
  const bank = 18.0, wl = 0.45, sw2 = 3.6; // river surface is y = 0; the landing stands just above it
  S.kind = KIND.MASONRY;
  const r = at((PL / 2 + tread * (n - 1) + bank) / 2, 0);
  S.box(r[0], r[1], LAND_Y - 0.25, LAND_Y + 0.12, bank - PL / 2 - tread * (n - 1), 5.0, fa, shade(FLOOR, 0.95), { topKind: KIND.ROAD });
  const N = 13, sr = (LAND_Y + 0.12 - wl) / N, st = 0.3;
  for (let k = 1; k <= N; k++) {
    const q = at(bank + st * (k - 0.5), 0);
    S.box(q[0], q[1], wl - 0.6, LAND_Y + 0.12 - sr * k, st, sw2, fa, shade(KERB, k % 2 ? 1.05 : 1.0), { topKind: KIND.ROAD });
  }
  const run = st * N, cw = sw2 / 2 + 0.2;
  S.kind = KIND.PLAIN;
  for (const s2 of [-1, 1]) { // the cheek walls down the flight
    const a = at(bank - 0.3, s2 * cw), b = at(bank + run, s2 * cw);
    S.beam([a[0], LAND_Y + 0.3, a[1]], [b[0], wl + 0.35, b[1]], 0.4, 0.45, KERB);
    const q = at(bank + run / 2, s2 * cw);
    S.box(q[0], q[1], wl - 0.6, wl + 0.1, run + 0.6, 0.4, fa, KERB);
  }
  S.kind = KIND.MASONRY;
  const lw = 1.8; // the landing at the foot of the flight
  let q = at(bank + run + lw / 2, 0);
  S.box(q[0], q[1], wl - 0.9, wl, lw, sw2 + 1.2, fa, shade(KERB, 0.95), { topKind: KIND.ROAD });
  // a short jetty, a deck on piles
  const j0 = bank + run + lw, j1 = j0 + 3.5;
  q = at((j0 + j1) / 2, 0);
  S.kind = KIND.PLAIN;
  S.box(q[0], q[1], wl - 0.12, wl, j1 - j0, 1.4, fa, hex('#a59d90'));
  for (let a = j0 + 1.0; a < j1; a += 2) for (const b of [-0.55, 0.55]) { const p = at(a, b); S.box(p[0], p[1], -0.8, wl - 0.12, 0.16, 0.16, fa, hex('#6d6a64')); }

  // ---- the trees that frame it: Nghênh Lương Đình stands closely flanked by big shade trees (satellite, Street View).
  // The shared planting keeps a 46 m circle round the axis monuments bare; this pavilion's open court is only the
  // terrace with its landing and the plaza in front (data.courts, read by geo/foliage.js), and two trees are added
  // where the satellite shows the densest crowns against the terrace's flanks.
  if (data) {
    const inv = (x, z) => { const dx = x - cx, dz = z - cz; return [dx * fx + dz * fz, dx * px + dz * pz]; };
    (data.courts ||= {})[id] = (x, z) => {
      const [a, b] = inv(x, z);
      return (a > -PL / 2 - 3 && a < 40 && Math.abs(b) < PW / 2 + 1.5) || (a <= -PL / 2 - 3 && a > -80 && Math.abs(b) < 22);
    };
    if (Array.isArray(data.trees)) {
      const near = [];
      for (const r2 of data.roads || []) {
        const pts = unflat(r2[2]);
        for (let k = 0; k + 1 < pts.length; k++) if (Math.hypot(pts[k][0] - cx, pts[k][1] - cz) < 90) near.push([pts[k], pts[k + 1]]);
      }
      const dSeg = (x, z, p0, p1) => {
        const dx = p1[0] - p0[0], dz = p1[1] - p0[1], l2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - p0[0]) * dx + (z - p0[1]) * dz) / l2));
        return Math.hypot(x - p0[0] - dx * t, z - p0[1] - dz * t);
      };
      for (const [a, b, sc] of [[-6.5, 14.5, 1.3], [-6.0, -14.0, 1.25]]) {
        const [x, z] = at(a, b);
        if (near.some(([p0, p1]) => dSeg(x, z, p0, p1) < 4)) continue;
        data.trees.push(Math.round(x * 10), Math.round(z * 10), Math.round(sc * 10), 0);
      }
    }
  }

  // ---- night: light under every eave and lanterns at the four corners of the platform and the river steps ----
  for (const e of lights) strip(L, e);
  // (low lamp posts: the floodlights that light the pavilion from its platform corners and the foot of the flight)
  S.kind = KIND.PLAIN;
  const post = (p, yb, h) => { S.box(p[0], p[1], yb, yb + h, 0.22, 0.22, fa, hex('#3a3633')); lantern(p, yb + h + 0.12); };
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) post(at(sa * (PL / 2 - 0.85), sb * (PW / 2 - 0.85)), y0, 0.5);
  for (const sb of [-1, 1]) post(at(bank + run + 0.7, sb * (cw + 0.1)), wl, 0.7);

  if (group && THREE) {
    const m = new THREE.Mesh(L.geometry(), lightMaterial(0xffae42, 1.2)); // the shared night glow drives it
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
    const g = glowPoints(lan, lanC, 6);
    g.userData.glow = true; // main.js sizes it and hides it by day
    g.userData.landmark = id;
    group.add(g);
  }
  return null;
}

// a strip of light just under the soffit of a roof's eave, near its edge (sides: 'v-'/'v+' the long sides along
// the ridge, 'u-'/'u+' the ends), as citadel.js does for the other pavilions
function strip(L, e) {
  const ux = Math.cos(e.ang), uz = Math.sin(e.ang);
  const y = e.y - e.fascia - 0.07;
  const P = (u, v) => [e.q[0] + u * ux - v * uz, y, e.q[1] + u * uz + v * ux];
  const hu = e.w / 2 + e.over - 0.3, hv = e.d / 2 + e.over - 0.3;
  for (const sd of e.sides) {
    const sg = sd[1] === '+' ? 1 : -1;
    if (sd[0] === 'v') L.beam(P(-hu, sg * hv), P(hu, sg * hv), 0.12, 0.09, [1, 1, 1]);
    else L.beam(P(sg * hu, -hv), P(sg * hu, hv), 0.12, 0.09, [1, 1, 1]);
  }
}
