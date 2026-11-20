import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { fence } from '../enclosure.js';

// ---- Bảo tàng Cổ vật Cung đình Huế (Huế Museum of Royal Antiquities): điện Long An, 3 Lê Trực ----
//
// Sources (fetched Nov 2026; notes in docs/places/baotangcovat.md):
//  - vi.wikipedia.org/wiki/Điện_Long_An: built 1845 (Thiệu Trị) in cung Bảo Định, moved here 1909 as Tân Thơ Viện,
//    Musée Khải Định from 1923; rectangular, 35.70 m long and 28 m wide on a 1.1 m stone-faced platform; a double
//    house (trùng thiềm điệp ốc) on 128 lim columns; roof area 1,750 m²; front house 7 bays (8 trusses), rear house
//    5 bays (6 trusses); the timber left bare, not lacquered or gilded.
//  - mia.vn (Điện Long An Huế): yellow-glazed yin-yang tiles (ngói âm dương tráng men vàng); front house 7 bays +
//    2 single chái, rear house 5 bays + 2 double chái; platform 1.1 m; eave columns run down toward the court.
//  - baotanglichsu.vn: "3 layers of tiles" (three roof tiers), 128 ironwood columns.
//  - OpenStreetMap: the hall way 695810710 (its 40 x 30 m outline takes in the eaves), the museum grounds way
//    695810697 between Lê Trực (front, south-east) and Đinh Công Tráng (back); the annexes 695810708/09 are left to
//    the mapped-building pass.
//  - The city height survey reads the hall at 9.0 m to the ridge.
// Estimated: the depth split between the two houses, eave and tier heights, the gate's form, the fence, the
// outdoor exhibits (two bronze cauldrons and stone pieces in the front court) and the path.

export const id = 'baotangcovat';

// the hall's mapped outline (OSM 695810710, main rectangle only), model metres
const HALL = [[-731.0, -290.6], [-713.0, -266.3], [-745.2, -242.7], [-763.5, -267.3]];
// the museum grounds (OSM 695810697)
const GROUNDS = [[-689.2, -347.4], [-642.3, -282.0], [-741.5, -209.5], [-792.9, -270.2]];

const TILE = PAL.imperialRoof, TILE2 = shade(PAL.imperialRoof2, 0.95), RIDGE = hex('#f0d27a');
const WOOD = hex('#6f4a2e'), WOOD_D = hex('#4a3020'), WOOD_L = hex('#8a6240');
const STONE = PAL.stone, BRICK = hex('#a5715a'), OCHRE = hex('#d6ae5e'), CREAM = hex('#efe4c8'), IRON = hex('#2c2a26');
const BRONZE = hex('#4f5446'), GLASS = hex('#2c3a40');
const gY = (x, z) => LAND_Y + rise(x, z);

export function build({ S }) {
  const c = HALL.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
  // u along the front (east-north-east), v toward the front (south-south-east, to Lê Trực)
  const ex = HALL[1][0] - HALL[2][0], ez = HALL[1][1] - HALL[2][1], el = Math.hypot(ex, ez);
  const ux = ex / el, uz = ez / el, ang = Math.atan2(uz, ux);
  const P = (u, v) => [c[0] + u * ux - v * uz, c[1] + u * uz + v * ux];
  const y0 = gY(c[0], c[1]);
  const box = (u, v, ya, yb, w, d, col, o) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ang, col, o); };
  const hip = (u, v, w, d, ya, h, col, o) => { const q = P(u, v); S.hip(q[0], q[1], w, d, ang, ya, h, col, { flare: 0.45, fascia: 0.26, fasciaCol: WOOD_D, hips: true, glazed: true, segs: 4, ridgeCol: RIDGE, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ang, ...o }); };
  S.base = y0 - LAND_Y;

  // where the axis meets the front fence (the gate)
  let gateV = 44;
  {
    const [a, b] = [GROUNDS[1], GROUNDS[2]], dx = b[0] - a[0], dz = b[1] - a[1];
    const vx = -uz, vz = ux, den = vx * dz - vz * dx;
    if (Math.abs(den) > 1e-6) gateV = ((a[0] - c[0]) * dz - (a[1] - c[1]) * dx) / den;
  }

  // ---- the front court: a brick path on the axis from the gate to the steps (paved: no trees on it) ----
  const L = 35.7, D = 28, pt = 1.1, yp = y0 + pt;
  const paved0 = S.n;
  S.kind = KIND.MASONRY;
  box(0, (D / 2 + 1.8 + gateV) / 2, y0 - 0.2, y0 + 0.24, 5.0, gateV - D / 2 - 1.8, BRICK, { topKind: KIND.ROAD });
  box(0, D / 2 + 3.2, y0 - 0.2, y0 + 0.24, 22, 3.2, shade(BRICK, 0.95), { topKind: KIND.ROAD }); // apron before the steps
  box(0, 0, y0 - 0.2, y0 + 0.22, L + 3.0, D + 2.6, shade(STONE, 0.9), { topKind: KIND.ROAD }); // pavement round the platform
  (S.paved = S.paved || []).push([paved0, S.n]);

  // ---- the platform: 35.7 x 28 m, 1.1 m, faced in stone; three flights on the front ----
  box(0, 0, y0 - 0.3, yp, L, D, STONE, { taper: 0.99, topKind: KIND.ROAD });
  box(0, 0, yp - 0.12, yp, L + 0.2, D + 0.2, shade(STONE, 1.08), { topKind: KIND.ROAD }); // the coping
  const steps = 6, sd = 0.32;
  for (const [u, w] of [[0, 7.8], [-12.6, 3.4], [12.6, 3.4]]) {
    for (let k = 1; k <= steps; k++) box(u, D / 2 + sd * (k - 0.5), y0 - 0.2, yp - (pt / (steps + 1)) * k, w, sd, shade(STONE, 1.04), { topKind: KIND.ROAD });
    for (const s of [-1, 1]) box(u + s * (w / 2 + 0.25), D / 2 + (steps * sd) / 2, y0 - 0.2, yp - 0.1, 0.5, steps * sd, shade(STONE, 0.92)); // the cheek walls
  }

  // ---- the double house: front house (tiền điện) 7 bays + 2 chái, rear house (chính điện) 5 bays + 2 double chái ----
  // both nine spans wide; the front house is the shallower, the rear house carries the high two-tier roof
  const span = 3.7, W = span * 9; // 33.3 m between the corner columns
  const vF = 7.9, dF = 10.6; // front house centre and depth (column lines)
  const vR = -5.9, dR = 15.0; // rear house
  const eaveF = yp + 3.0, eaveR = yp + 3.3;

  // the walls: bare lim panels (doors and lattice) between the columns, set in from the verandah on the front
  S.kind = KIND.TIMBER;
  box(0, vF - 1.0, yp, eaveF, W - 1.2, dF - 2.6, WOOD, { top: TILE2 });
  box(0, vR, yp, eaveR, W - 0.4, dR - 0.6, shade(WOOD, 0.92), { top: TILE2 });
  // the front: a door leaf in each of the seven bays, a glazed lattice transom over it; the chái closed
  S.kind = KIND.PLAIN;
  const fz = vF - 1.0 + (dF - 2.6) / 2 + 0.04;
  for (let i = -3; i <= 3; i++) {
    box(i * span, fz, yp, yp + 2.35, span - 0.7, 0.08, WOOD_D);
    box(i * span, fz + 0.01, yp + 2.45, yp + 2.85, span - 0.6, 0.08, WOOD_L);
    box(i * span, fz + 0.02, yp + 2.52, yp + 2.78, span - 1.0, 0.08, GLASS);
  }
  // the verandah: ten free columns on stone bases along the front (the eave line), beam over them
  for (let i = 0; i <= 9; i++) {
    const u = (i - 4.5) * span;
    cyl(u, vF + dF / 2 - 0.4, yp, yp + 0.22, 0.38, 0.34, 6, shade(STONE, 0.95), { cap: false });
    cyl(u, vF + dF / 2 - 0.4, yp + 0.22, eaveF, 0.2, 0.18, 7, WOOD, { cap: false });
  }
  S.kind = KIND.TIMBER;
  box(0, vF + dF / 2 - 0.4, eaveF - 0.32, eaveF, W + 0.4, 0.3, WOOD_D);
  S.kind = KIND.PLAIN;
  box(0, vF + dF / 2 - 1.2, eaveF - 0.3, eaveF - 0.22, W, 1.9, shade(WOOD, 0.55), { bottom: true }); // verandah ceiling

  // ---- the roofs: three tiers of yellow glazed tiles (front house; rear house skirt; rear house upper roof) ----
  // front house: one sweep from the eave to its own ridge, its back running under the rear house's skirt
  hip(0, vF + 0.35, W + 0.2, dF + 0.7, eaveF, 1.7, TILE, { over: 1.25 });
  // rear house: the lower skirt round all four sides, a short upright wall, then the high hipped roof
  hip(0, vR, W + 0.2, dR, eaveR, 1.2, TILE2, { over: 1.3, flare: 0.3, ridgeCol: null });
  S.kind = KIND.TIMBER;
  box(0, vR, eaveR + 1.05, eaveR + 2.0, W - 7.4, dR - 5.2, WOOD_D, { top: TILE2 });
  const yU = eaveR + 1.95, hU = yp + 7.9 - yU; // ridge 9.0 m above the court (city survey)
  hip(0, vR, W - 7.4, dR - 5.2, yU, hU, TILE, { over: 1.15, flare: 0.5 });
  // the valley gutter between the two houses
  S.kind = KIND.PLAIN;
  box(0, vR + dR / 2 + 0.15, eaveF + 0.15, eaveF + 0.35, W + 0.6, 0.5, shade(TILE2, 0.7));
  // the main ridge: a sun disc between two dragons (lưỡng long triều nhật), the ridge ends turned up
  const ridgeY = yU + hU;
  cyl(0, vR, ridgeY + 0.15, ridgeY + 0.85, 0.34, 0.14, 8, RIDGE);
  for (const s of [-1, 1]) {
    const a = P(s * 0.7, vR), b = P(s * 2.8, vR);
    S.beam([a[0], ridgeY + 0.7, a[1]], [b[0], ridgeY + 0.3, b[1]], 0.22, 0.32, RIDGE);
  }
  // the front house's ridge ornament: a small gourd at the middle
  const yRF = eaveF + 1.7;
  cyl(0, vF + 0.35, yRF + 0.1, yRF + 0.6, 0.24, 0.1, 8, RIDGE);

  // ---- the gate on Lê Trực: two tall ochre piers with cream caps, iron leaves, a name board over the opening ----
  {
    const gw = 6.0;
    S.base = 0;
    const g = P(0, gateV), yg = gY(g[0], g[1]);
    S.base = yg - LAND_Y;
    for (const s of [-1, 1]) {
      S.kind = KIND.MASONRY;
      box(s * (gw / 2 + 0.55), gateV, yg - 0.3, yg + 3.6, 1.1, 1.1, OCHRE, { top: CREAM });
      S.kind = KIND.PLAIN;
      box(s * (gw / 2 + 0.55), gateV, yg + 3.6, yg + 3.85, 1.35, 1.35, CREAM);
      box(s * (gw / 2 + 0.55), gateV, yg + 3.85, yg + 4.4, 0.7, 0.7, CREAM, { taper: 0.4 });
      // the open iron leaves folded back inside
      box(s * (gw / 2 - 0.1), gateV - 1.4, yg, yg + 2.2, 0.08, 2.6, IRON);
    }
    S.kind = KIND.PLAIN;
    box(0, gateV, yg + 3.0, yg + 3.55, gw + 0.2, 0.25, shade(WOOD, 0.8)); // the name board between the piers
    box(0, gateV + 0.14, yg + 3.08, yg + 3.47, gw - 0.6, 0.04, hex('#c9a34a'));
  }

  // ---- the fence round the grounds: ochre wall below an iron railing, opening at the gate ----
  {
    S.base = 0;
    const st = { h: 2.0, plinth: 0.7, rail: true, t: 0.34, every: 3.4, postW: 0.48, postUp: 0.2, wall: OCHRE, cap: CREAM, iron: IRON, pierW: 1.0, pierUp: 1.2 };
    const g = P(0, gateV);
    fence(S, GROUNDS, st, { openings: [[g[0], g[1], 4.1]] });
  }

  // ---- outdoor exhibits in the front court: two bronze cauldrons on stone plinths flanking the path, and a row of
  //      stone pieces (mortars, a stele, column bases) on the lawn either side ----
  S.base = y0 - LAND_Y;
  for (const s of [-1, 1]) {
    const u = s * 6.5, v = D / 2 + 11;
    S.kind = KIND.MASONRY;
    box(u, v, y0 - 0.2, y0 + 0.55, 2.0, 2.0, STONE);
    S.kind = KIND.PLAIN;
    cyl(u, v, y0 + 0.55, y0 + 0.75, 0.55, 0.62, 10, BRONZE, { cap: false });
    cyl(u, v, y0 + 0.75, y0 + 1.55, 0.95, 0.82, 12, BRONZE);
    cyl(u, v, y0 + 1.5, y0 + 1.62, 1.0, 1.0, 12, shade(BRONZE, 1.2));
    for (const k of [-1, 1]) box(u + k * 0.85, v, y0 + 1.55, y0 + 2.0, 0.12, 0.5, BRONZE); // the ear handles
    // stone pieces on the lawn
    for (let j = 0; j < 3; j++) {
      const uu = s * (13 + j * 3.2), vv = D / 2 + 8.5;
      S.kind = KIND.MASONRY;
      box(uu, vv, y0 - 0.1, y0 + 0.35, 1.3, 1.3, shade(STONE, 0.95));
      S.kind = KIND.PLAIN;
      if (j === 1) box(uu, vv, y0 + 0.35, y0 + 1.9, 0.9, 0.25, shade(STONE, 0.78), { top: shade(STONE, 0.7) }); // a stele
      else cyl(uu, vv, y0 + 0.35, y0 + 0.95, 0.5, 0.42, 8, shade(STONE, 0.72)); // a stone mortar / column base
    }
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
