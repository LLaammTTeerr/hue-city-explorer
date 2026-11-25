import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { fence, offStreets } from '../enclosure.ts';
import { ridgeDragons, ridgeGourd } from '../ornaments.ts';

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
//  - Google satellite and Street View (Nov 2026 check, captures kept out of the repo): the hall's roof reaches about
//    39.5 x 30 m at the eaves, matching the OSM outline, so the hip ends overhang the 35.7 m platform by about 1.9 m;
//    behind the hall (annex 695810709) stands a long ochre hall under a two-tier red corrugated-metal roof with dragon
//    finials, a pair of small brown-tiled pavilions beyond its north-east end and one beyond its south-west end;
//    north-east of the hall (695810708) a long shed under a green metal gable roof. The street fronts (Lê Trực, Đinh
//    Tiên Hoàng) are a weathered grey balustrade under an iron railing between ochre piers; the gate piers carry a
//    lotus finial and a small tiled ticket house with a two-tier roof stands beside the gate; on Đinh Công Tráng the
//    grounds are closed by a grey concrete wall (about 2.6 m) with a wire fence on Y-posts above it behind the annex,
//    and by the street balustrade from the north-east pavilions to the Đinh Tiên Hoàng corner.
// Estimated: the depth split between the two houses, eave and tier heights, the gate's form, the fence, the
// outdoor exhibits (two bronze cauldrons and stone pieces in the front court) and the path.

export const id = 'baotangcovat';

// the hall's mapped outline (OSM 695810710, main rectangle only), model metres
const HALL = [[-731.0, -290.6], [-713.0, -266.3], [-745.2, -242.7], [-763.5, -267.3]];
// the museum grounds (OSM 695810697); the back (Đinh Công Tráng) runs from GROUNDS[3] to GROUNDS[0]
const GROUNDS = [[-689.2, -347.4], [-642.3, -282.0], [-741.5, -209.5], [-792.9, -270.2]];

const TILE = hex('#c28e3c'), TILE2 = hex('#a87832'), RIDGE = hex('#e5cc7e');
const WOOD = hex('#6f4a2e'), WOOD_D = hex('#4a3020'), WOOD_L = hex('#8a6240');
const STONE = PAL.stone, BRICK = hex('#a5715a'), OCHRE = hex('#d6ae5e'), CREAM = hex('#efe4c8'), IRON = hex('#2c2a26');
const BRONZE = hex('#4f5446'), GLASS = hex('#2c3a40');
const RENDER = hex('#c9a55a'), REDTIN = hex('#8a3b33'), GREENTIN = hex('#6f8a6a'), BTILE = hex('#7a4a36');
const MOSS = hex('#8c8a72'), CONCRETE = hex('#6c6e66'), WIRE = hex('#3a3c3a'), FINIAL = hex('#4a4a44');
const gY = (x, z) => LAND_Y + rise(x, z);

export function build({ data, S }) {
  const c = HALL.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
  // u along the front (east-north-east), v toward the front (south-south-east, to Lê Trực)
  const ex = HALL[1][0] - HALL[2][0], ez = HALL[1][1] - HALL[2][1], el = Math.hypot(ex, ez);
  const ux = ex / el, uz = ez / el, ang = Math.atan2(uz, ux);
  const P = (u, v): [number, number] => [c[0] + u * ux - v * uz, c[1] + u * uz + v * ux];
  const y0 = gY(c[0], c[1]);
  const box = (u, v, ya, yb, w, d, col, o?) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ang, col, o); };
  const hip = (u, v, w, d, ya, h, col, o?) => { const q = P(u, v); S.hip(q[0], q[1], w, d, ang, ya, h, col, { flare: 0.45, fascia: 0.26, fasciaCol: WOOD_D, hips: true, glazed: true, segs: 4, ridgeCol: RIDGE, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o?) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ang, ...o }); };
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
  for (const [u, w] of ([[0, 7.8], [-12.6, 3.4], [12.6, 3.4]] as any[])) {
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
  // front house: from the eave to its own ridge, its back running under the rear house's skirt
  // the hip ends reach out past the platform: the eaves measure about 39.5 m on the satellite (and the OSM outline)
  const ends = 3.7;
  // in two tiers (as seen from Lê Trực): the lower skirt, a pale plastered band (cổ diêm), then the upper slope
  const wF = W + 0.2 + ends, dF2 = dF + 0.7, inF = 2.2;
  hip(0, vF + 0.35, wF, dF2, eaveF, 1.7, TILE, { over: 1.25, ridgeCol: null });
  S.kind = KIND.MASONRY;
  box(0, vF + 0.35, eaveF + 0.75, eaveF + 1.35, wF - 2 * inF, dF2 - 2 * inF, CREAM, { top: TILE2 });
  S.kind = KIND.PLAIN;
  hip(0, vF + 0.35, wF - 2 * inF, dF2 - 2 * inF, eaveF + 1.3, 1.0, TILE, { over: 0.6, flare: 0.35 });
  // rear house: the lower skirt round all four sides, a short upright wall, then the high hipped roof
  hip(0, vR, W + 0.2 + ends, dR, eaveR, 1.2, TILE2, { over: 1.3, flare: 0.3, ridgeCol: null });
  S.kind = KIND.TIMBER;
  box(0, vR, eaveR + 1.05, eaveR + 2.0, W - 7.4, dR - 5.2, WOOD_D, { top: TILE2 });
  const yU = eaveR + 1.95, hU = yp + 7.9 - yU; // ridge 9.0 m above the court (city survey)
  hip(0, vR, W - 7.4, dR - 5.2, yU, hU, TILE, { over: 1.15, flare: 0.5 });
  // the valley gutter between the two houses
  S.kind = KIND.PLAIN;
  box(0, vR + dR / 2 + 0.15, eaveF + 0.15, eaveF + 0.35, W + 0.6 + ends, 0.5, shade(TILE2, 0.7));
  // the main ridge: ornate lưỡng long chầu nhật (twin dragons facing the sun) + gourd on front ridge
  const ridgeY = yU + hU;
  ridgeDragons(S, P(0, vR), ridgeY + 0.08, ang, { span: 7.4, scale: 1.0 });
  const yRF = eaveF + 2.3;
  const fC = P(0, vF + 0.35);
  ridgeGourd(S, fC[0], fC[1], yRF + 0.06, 0.9, RIDGE);

  // ---- the gate on Lê Trực: two tall ochre piers with cream caps and a lotus finial, iron leaves folded back ----
  const gw = 6.0;
  {
    S.base = 0;
    const g = P(0, gateV), yg = gY(g[0], g[1]);
    S.base = yg - LAND_Y;
    for (const s of [-1, 1]) {
      S.kind = KIND.MASONRY;
      box(s * (gw / 2 + 0.55), gateV, yg - 0.3, yg + 3.6, 1.1, 1.1, OCHRE, { top: CREAM });
      S.kind = KIND.PLAIN;
      box(s * (gw / 2 + 0.55), gateV, yg + 3.6, yg + 3.85, 1.35, 1.35, CREAM);
      cyl(s * (gw / 2 + 0.55), gateV, yg + 3.85, yg + 4.15, 0.42, 0.5, 8, FINIAL, { cap: false }); // the lotus finial
      cyl(s * (gw / 2 + 0.55), gateV, yg + 4.15, yg + 4.65, 0.5, 0.08, 8, FINIAL);
      // the open iron leaves folded back inside
      box(s * (gw / 2 - 0.1), gateV - 1.4, yg, yg + 2.2, 0.08, 2.6, IRON);
    }
  }

  // ---- the ticket house beside the gate (south-west of it, in the fence line): ochre walls, two tiers of brown tile ----
  const TH = { u: -(gw / 2 + 1.1 + 0.9 + 1.9), v: gateV - 1.5, w: 3.8, d: 3.6 };
  {
    const q = P(TH.u, TH.v), yt = gY(q[0], q[1]);
    S.base = yt - LAND_Y;
    S.kind = KIND.MASONRY;
    box(TH.u, TH.v, yt - 0.3, yt + 0.3, TH.w + 0.4, TH.d + 0.4, STONE);
    box(TH.u, TH.v, yt + 0.3, yt + 3.1, TH.w, TH.d, RENDER, { top: TILE2 });
    for (const a of [-1, 1]) for (const b of [-1, 1]) box(TH.u + a * (TH.w / 2 - 0.1), TH.v + b * (TH.d / 2 - 0.1), yt + 0.3, yt + 3.1, 0.24, 0.24, WOOD_D); // corner posts
    S.kind = KIND.PLAIN;
    box(TH.u + 0.7, TH.v + TH.d / 2 + 0.03, yt + 0.3, yt + 2.5, 1.2, 0.06, WOOD_D); // the door, facing the street
    box(TH.u - 0.9, TH.v + TH.d / 2 + 0.03, yt + 1.0, yt + 2.3, 1.0, 0.06, CREAM); // the notice board by the window
    S.kind = KIND.TILE;
    hip(TH.u, TH.v, TH.w, TH.d, yt + 3.1, 0.9, BTILE, { over: 1.05, flare: 0.15, hips: false, glazed: false, ridgeCol: null, segs: 2 });
    S.kind = KIND.MASONRY;
    box(TH.u, TH.v, yt + 3.85, yt + 4.35, 2.3, 2.0, RENDER, { top: TILE2 });
    S.kind = KIND.TILE;
    hip(TH.u, TH.v, 2.3, 2.0, yt + 4.3, 0.7, BTILE, { over: 0.4, flare: 0.2, hips: false, glazed: false, ridgeCol: null, segs: 2 });
    // small merlon blocks at the corners of the upper tier, as on the real roof
    S.kind = KIND.MASONRY;
    for (const a of [-1, 1]) for (const b of [-1, 1]) box(TH.u + a * 1.2, TH.v + b * 1.05, yt + 4.3, yt + 4.75, 0.3, 0.3, RENDER, { top: TILE2 });
    // a dark name board over the door, a cream notice panel beside it, and a low balustrade stub either side
    S.kind = KIND.PLAIN;
    box(TH.u + 0.7, TH.v + TH.d / 2 + 0.04, yt + 2.55, yt + 2.9, 1.3, 0.06, WOOD_D);
    box(TH.u + 0.7, TH.v + TH.d / 2 + 0.07, yt + 2.62, yt + 2.82, 0.9, 0.04, CREAM);
    S.kind = KIND.MASONRY;
    for (const a of [-1, 1]) box(TH.u + a * (TH.w / 2 + 0.9), TH.v + TH.d / 2 + 0.2, yt - 0.1, yt + 0.95, 1.2, 0.35, STONE, { top: shade(STONE, 1.15) });
  }
  const thRing = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => P(TH.u + a * (TH.w / 2 + 0.3), TH.v + b * (TH.d / 2 + 0.3)));

  // ---- the fence round the grounds ----
  // the street fronts (Lê Trực, Đinh Tiên Hoàng, and the unseen south-west side alike): a weathered grey balustrade
  // under an iron railing, between ochre piers; the back on Đinh Công Tráng: a grey concrete wall about 2.6 m high
  // (its top at a street-level eye, car pano) with a wire fence on posts above it, but only behind the red annex and
  // the south-west pavilion; from the north-east pavilions to the Đinh Tiên Hoàng corner the back is the front's
  // balustrade again (car pano at that junction). The mapped grounds less the side streets OSM draws into them.
  {
    S.base = 0;
    const front = { h: 2.0, plinth: 1.15, rail: true, t: 0.34, every: 3.0, postW: 0.5, postUp: 0.25, wall: MOSS, cap: shade(MOSS, 1.12), postCol: OCHRE, iron: IRON, pierW: 1.1, pierUp: 1.4 };
    const WH = 2.6, BACK_U = 23.5; // wall height; the wall ends here along u (between the annex and the NE pavilions)
    const back = { h: WH, rail: false, t: 0.3, every: 3.2, postW: 0.34, postUp: 0.04, wall: CONCRETE, cap: shade(CONCRETE, 1.12) };
    // OSM draws the back of the grounds to the kerb of Đinh Công Tráng; the wall stands behind a pavement about 2.5 m
    // wide (the street pano), 6 m from the street's middle, so the back edge is brought in 2.1 m toward the hall
    const inV = (p): [number, number] => [p[0] - uz * 2.1, p[1] + ux * 2.1];
    const yard = [inV(GROUNDS[0]), GROUNDS[1], GROUNDS[2], inV(GROUNDS[3])];
    const g = P(0, gateV), ring = offStreets(data, yard), n = ring.length;
    const B0 = yard[3], B1 = yard[0], bl = Math.hypot(B1[0] - B0[0], B1[1] - B0[1]), bx = (B1[0] - B0[0]) / bl, bz = (B1[1] - B0[1]) / bl;
    const isBack = (a, b) => Math.abs(((a[0] + b[0]) / 2 - B0[0]) * bz - ((a[1] + b[1]) / 2 - B0[1]) * bx) < 5;
    // split the back edges where they cross u = BACK_U, so the wall stops there and the balustrade takes over
    const uOf = (p) => (p[0] - c[0]) * ux + (p[1] - c[1]) * uz;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n];
      pts.push(a);
      const ua = uOf(a) - BACK_U, ub = uOf(b) - BACK_U;
      if (isBack(a, b) && ua * ub < 0) { const t = ua / (ua - ub); pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    const m = pts.length;
    const tag = pts.map((p, i) => { const q = pts[(i + 1) % m]; return isBack(p, q) && (uOf(p) + uOf(q)) / 2 < BACK_U; });
    const s0 = tag.findIndex((t, i) => t !== tag[(i + m - 1) % m]), runs = [];
    if (s0 < 0) runs.push({ back: tag[0], pts, closed: true });
    else for (let k = 0, cur = null; k < m; k++) {
      const i = (s0 + k) % m;
      if (!cur || cur.back !== tag[i]) { cur = { back: tag[i], pts: [pts[i]], closed: false }; runs.push(cur); }
      cur.pts.push(pts[(i + 1) % m]);
    }
    for (const r of runs) {
      if (!r.back) { fence(S, r.pts, front, { closed: r.closed, openings: [[g[0], g[1], 4.1]], solid: [thRing] }); continue; }
      fence(S, r.pts, back, { closed: r.closed });
      // the wire fence on the wall: posts every 2.8 m leaning out at the top, four wires
      for (let i = 0; i + 1 < r.pts.length; i++) {
        const a = r.pts[i], b = r.pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 0.5) continue;
        const ang2 = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
        const out = (c[0] - a[0]) * nx + (c[1] - a[1]) * nz > 0 ? -1 : 1; // away from the hall, toward the street
        const nb = Math.max(1, Math.round(len / 2.8));
        for (let k = 0; k <= nb; k++) {
          const px = a[0] + ((b[0] - a[0]) * k) / nb, pz = a[1] + ((b[1] - a[1]) * k) / nb, y = gY(px, pz) + WH;
          S.base = y - WH - LAND_Y;
          S.kind = KIND.PLAIN;
          S.box(px, pz, y, y + 1.45, 0.07, 0.07, ang2, WIRE);
          S.beam([px, y + 1.4, pz], [px + nx * out * 0.35, y + 1.85, pz + nz * out * 0.35], 0.05, 0.05, WIRE);
        }
        const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, y = gY(mx, mz) + WH;
        for (const h of [0.45, 0.9, 1.35]) S.box(mx, mz, y + h, y + h + 0.03, len, 0.03, ang2, WIRE);
        S.box(mx + nx * out * 0.3, mz + nz * out * 0.3, y + 1.78, y + 1.81, len, 0.03, ang2, WIRE);
      }
    }
  }

  // ---- the buildings behind and beside the hall (OSM 695810709 and 695810708, set on the satellite) ----
  S.base = y0 - LAND_Y;
  // the court between the hall and the rear annex: paved (no trees, no mapped house drawn over it)
  const paved1 = S.n;
  S.kind = KIND.MASONRY;
  box(0, -17.3, y0 - 0.2, y0 + 0.24, 37.5, 4.2, shade(STONE, 0.9), { topKind: KIND.ROAD });
  S.paved.push([paved1, S.n]);
  // the rear annex: a long ochre hall, eaves about 36.7 x 12.5 m, under a two-tier red corrugated-metal roof: a broad
  // lean-to lower roof, a narrow vented clerestory band, a low upper roof (proportions from the Đinh Công Tráng pano)
  {
    const v = -25.45, w = 34.9, d = 10.7, ye = y0 + 3.6, wi = w - 6, di = d - 5.4;
    S.kind = KIND.MASONRY;
    box(0, v, y0 - 0.2, y0 + 0.35, w + 0.4, d + 0.4, shade(STONE, 0.85));
    box(0, v, y0 + 0.35, ye, w, d, RENDER, { top: TILE2 });
    S.kind = KIND.PLAIN;
    for (let i = -6; i <= 6; i++) box(i * 2.6, v + d / 2 + 0.04, y0 + 0.9, y0 + 3.1, 1.3, 0.06, WOOD_D); // doors on the court side
    S.kind = KIND.TILE;
    hip(0, v, w, d, ye, 2.15, REDTIN, { over: 1.0, flare: 0.05, glazed: false, ridgeCol: null, fasciaCol: CREAM, fascia: 0.2 });
    S.kind = KIND.MASONRY;
    box(0, v, ye + 1.0, ye + 1.95, wi, di, RENDER, { top: TILE2 });
    S.kind = KIND.PLAIN;
    for (let i = -11; i <= 11; i++) for (const sg of [-1, 1]) box(i * 1.2, v + sg * (di / 2 + 0.03), ye + 1.45, ye + 1.65, 0.5, 0.06, shade(RENDER, 0.45)); // the vents in the band
    S.kind = KIND.TILE;
    const yu = ye + 1.9, hu = 1.2;
    hip(0, v, wi, di, yu, hu, REDTIN, { over: 0.7, flare: 0.05, glazed: false, ridgeCol: shade(REDTIN, 0.8), fasciaCol: CREAM, fascia: 0.2 });
    // the ridge: a sun disc at the middle, a dragon finial at each end
    S.kind = KIND.PLAIN;
    const ry = yu + hu, re = (wi - di) / 2;
    cyl(0, v, ry, ry + 0.75, 0.35, 0.3, 8, FINIAL);
    for (const s2 of [-1, 1]) {
      const a = P(s2 * re, v), b = P(s2 * (re - 0.6), v), t = P(s2 * (re - 1.1), v);
      S.beam([a[0], ry, a[1]], [b[0], ry + 1.0, b[1]], 0.22, 0.3, FINIAL);
      S.beam([b[0], ry + 1.0, b[1]], [t[0], ry + 0.75, t[1]], 0.18, 0.26, FINIAL);
    }
  }
  // the small brown-tiled pavilions beyond the annex's ends: two to the north-east, one to the south-west
  for (const [u, v, w] of ([[29.5, -24.8, 9.6], [41.4, -24.8, 9.6], [-29.0, -24.8, 10.2]] as any[])) {
    const ye = y0 + 3.6;
    S.kind = KIND.MASONRY;
    box(u, v, y0 - 0.2, y0 + 0.35, w + 0.4, w + 0.4, shade(STONE, 0.85));
    box(u, v, y0 + 0.35, ye, w, w, RENDER, { top: TILE2 });
    S.kind = KIND.TILE;
    hip(u, v, w, w, ye, 1.0, BTILE, { over: 0.8, flare: 0.35, glazed: false, ridgeCol: null, segs: 3 });
    S.kind = KIND.MASONRY;
    box(u, v, ye + 0.85, ye + 1.4, w - 3.6, w - 3.6, RENDER, { top: TILE2 });
    S.kind = KIND.TILE;
    hip(u, v, w - 3.6, w - 3.6, ye + 1.35, 1.5, BTILE, { over: 0.6, flare: 0.4, glazed: false, ridgeCol: shade(BTILE, 0.8), segs: 3 });
  }
  // the long shed north-east of the hall, square to it: ochre walls under a green metal gable roof, about 34 x 11.3 m at the eaves
  {
    const u = 37.6, v = 2.1, w = 10.3, L = 33.0, ye = y0 + 3.4, rh = 2.4, o = 0.5;
    S.kind = KIND.MASONRY;
    box(u, v, y0 - 0.2, y0 + 0.3, w + 0.3, L + 0.3, shade(STONE, 0.85));
    box(u, v, y0 + 0.3, ye, w, L, RENDER, { top: TILE2 });
    S.kind = KIND.PLAIN;
    for (let i = -5; i <= 5; i++) box(u - w / 2 - 0.04, v + i * 2.9, y0 + 1.2, y0 + 2.6, 0.06, 1.4, GLASS); // windows to the hall
    const W3 = (uu, vv, y) => { const q = P(uu, vv); return [q[0], y, q[1]]; };
    const v0 = v - L / 2 - o, v1 = v + L / 2 + o, yl = ye - o * (rh / (w / 2));
    S.kind = KIND.TILE;
    for (const s2 of [-1, 1]) {
      const n = P(s2, 0), cn = [n[0] - c[0], 1.6, n[1] - c[1]];
      S.quad(W3(u + s2 * (w / 2 + o), v0, yl), W3(u + s2 * (w / 2 + o), v1, yl), W3(u, v1, ye + rh), W3(u, v0, ye + rh), shade(GREENTIN, s2 < 0 ? 1 : 0.94), cn);
    }
    S.kind = KIND.MASONRY;
    for (const [vv, sg] of ([[v - L / 2, -1], [v + L / 2, 1]] as any[])) {
      const n = P(0, sg);
      S.tri(W3(u - w / 2, vv, ye), W3(u + w / 2, vv, ye), W3(u, vv, ye + rh), RENDER, [n[0] - c[0], 0, n[1] - c[1]]);
    }
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
