import * as THREE from 'three';
import { KIND, hex, shade, inRing } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';

// ---- Trung tâm Nghệ thuật Điềm Phùng Thị (Điềm Phùng Thị Art Centre), 17 Lê Lợi, on the Hương river bank ----
//
// Sources (fetched Nov 2026; notes in docs/places/diemphungthi.md):
//  - huengaynay.vn (Báo Thừa Thiên Huế), "Trung tâm nghệ thuật Điềm Phùng Thị về nhà mới" and the English "Diem Phung
//    Thi Arts Center reopens to visitors" (2018): moved in April 2018 from 1 Phan Bội Châu to 17 Lê Lợi, the former
//    Festival Centre office; a two-storey French-style building whose inside, tiled roof, garden and paths were
//    renovated; the fence round it was taken down to open the view; two floors inside plus an outdoor display that
//    keeps the works shown outside at Phan Bội Châu ("Chào đón", "Lớn và nhỏ", "Trẻ em").
//  - hanhtrinhdulich.vn, luhanhvietnam.com.vn: a French villa built in 1940, one of the 27 listed French buildings
//    of Huế; over 400 m² indoors on two floors; an outdoor court of about 1,500 m² with 15 works and groups in stone,
//    concrete, bronze and composite, and stone benches cut to the sculptor's modules.
//  - OpenStreetMap way 118540998 (the building, tourism=museum) and the footways round it (the park path on the
//    north-east, the riverside walk, the diagonal path with its round plot on the south-west), which bound the garden.
//    The way is offset and too wide; the footprint below is re-fitted (see the frame).
//  - Google satellite view and the car Street View pano on Lê Lợi (2025), as visual reference only (Nov 2026): an
//    18 x 7.7 m two-storey body running from the river to Lê Lợi, a street wing 7 m deep standing 1.2 m out on the
//    north-east, a one-storey flat-roofed annex across the river end; white walls with white trim, small windows
//    with pale yellow shutters; a street front 13.9 m wide in three bays between full-height pilasters (a narrow
//    south-west bay, the door under a small tiled awning in the centre bay with a raised shouldered gable over it, two
//    windows a floor on the right); hipped red-tile roofs; no columned porch; a bare gravel forecourt round the
//    river end, the park side and the street front, with white works and park benches at the street door.
//  - The city height survey: 12.0 m to the ridge (public/data/hue.json).
// Estimated: the exact window count and sizes on the long sides, the annex front, the chimneys, the path layout,
// and the form and placing of the sculptures (abstractions of her seven modules: half-discs, arcs, quarter-discs
// and bars).

export const id = 'diemphungthi';

// the outline in its own frame. OSM way 118540998 sits about 4 m south-east of the building and is drawn 2 m too wide
// and 7 deg off its axis; this frame is re-fitted to the roof on Google's satellite view (Nov 2026; checked against
// Lê Lợi and the riverside walk, which line up with the satellite to within a metre here) and to the car Street View
// pano on Lê Lợi. F (67.33, 205.3) is the west wall corner of the main body; u runs along the long side toward Lê
// Lợi (bearing 131 deg), v along the river end toward the park (north-east).
const F0 = [67.33, 205.3];
const U = [0.7547, 0.6561], V = [0.6561, -0.7547];
// the main body u 0 .. LEN, v 0 .. WID; the street wing u BAY0 .. LEN, v SW0 .. WID + BAYW (it stands 1.2 m out on the
// north-east, a little proud on the south-west); the one-storey annex across the river end u -ANX .. 0
const LEN = 18.15, WID = 7.7, BAY0 = 11.0, BAYW = 1.2, SW0 = -0.25, ANX = 4.2;
// the street front (Lê Lợi car pano, 2025; its corners and pilasters solved for v along the front from the pano's image
// columns) is 13.9 m wide, three bays between full-height pilasters: on the south-west a narrow bay (v LB0 .. CB0) with
// one window; the centre bay (v CB0 .. C1) with the door and a raised shouldered gable over it; the right bay (v C1 ..
// WID + BAYW) with two windows on each floor. The part south-west of the main roof (v LB0 .. SW0) stands under its own
// lower roof; the satellite cannot show its edge, as canopy covers it.
const LB0 = -5.0, CB0 = -3.0, C1 = 1.95;
// the mapped outline as OSM draws it (model metres), for dropping the mapped building
const OSM_RING = [[71.5, 202.0], [80.1, 211.6], [81.6, 210.4], [86.1, 215.5], [77.0, 223.6], [63.8, 208.8]];
// the garden, inside the footways that bound it (model metres)
const GARDEN = [
  [25.0, 204.4], [54.4, 178.9], [66.4, 192.6], [76.2, 184.4], [95.6, 206.8], [105.6, 218.0], [99.0, 224.4],
  [94.6, 229.2], [99.2, 234.4], [75.2, 255.4], [62.0, 241.6], [63.6, 239.0], [63.8, 235.6], [62.4, 232.4],
  [59.6, 230.2], [56.2, 229.6], [53.0, 230.6],
];

const WALL = hex('#ece8dd'), TRIM = hex('#f6f3ea'), SHUT = hex('#e2d6a0'), PLINTH = hex('#9d968a'), ROOF = PAL.indochineRoof[0];
const DOOR = hex('#3b3631'), GLASS = hex('#80878a'), IRON = hex('#2c2a27');
const LAWN = hex('#93ab66'), PATH = hex('#cfc4ae'), GRAVEL = hex('#c9bfa8'), BENCH = hex('#3c4a3a');
const WHITE = hex('#e8e4da'), GREY = hex('#a7a49c'), BRONZE = hex('#4e4a3c'), LATERITE = hex('#9a5a3e'), BLACK = hex('#2f2e2c');
// the bare gravel forecourt that wraps the villa on the river end, the park side and the street front (satellite and
// the Lê Lợi pano), clipped to the garden; the south-west side stays lawn under the trees
const FORECOURT = [
  [60.6, 205.1], [60.1, 190.5], [68.0, 179.4], [76.6, 177.9], [89.5, 180.8], [92.6, 190.5], [97.4, 198.0],
  [100.7, 203.1], [96.9, 207.7], [100.4, 222.0], [96.9, 228.6], [89.5, 228.6], [85.2, 222.0], [80.6, 223.4], [73.6, 214.2], [66.3, 206.6],
];
const gY = (x, z) => LAND_Y + rise(x, z);

export function build({ data, S, group }) {
  const P = (u, v): [number, number] => [F0[0] + u * U[0] + v * V[0], F0[1] + u * U[1] + v * V[1]];
  const ang = Math.atan2(U[1], U[0]); // box/hip local x = u
  const cM = P(LEN / 2, WID / 2);
  const y0 = gY(cM[0], cM[1]);
  const box = (u, v, ya, yb, w, d, col, o?) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ang, col, o); };
  const lamps = [];

  // ---- no generated houses in the garden: it is lawn, paths and sculptures (one filler house stood there) ----
  if (Array.isArray(data.infill)) {
    const a = data.infill, R = 8, keep = [];
    const near = data.meta?.counts?.infillNear ?? a.length / R;
    let nearKept = 0;
    for (let i = 0; i < a.length / R; i++) {
      if (inRing(a[i * R] / 10, a[i * R + 1] / 10, GARDEN)) continue;
      if (i < near) nearKept++;
      for (let j = 0; j < R; j++) keep.push(a[i * R + j]);
    }
    if (keep.length !== a.length) {
      a.length = 0;
      for (const v of keep) a.push(v);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }

  // ---- the mapped outline (OSM way 118540998) lies about 4 m south-east of the real villa, so the model does not
  //      cover it and populate would draw it as a second house: drop it here (its centre inside the old outline) ----
  if (Array.isArray(data.bld)) {
    for (let i = data.bld.length - 1; i >= 0; i--) {
      const r = data.bld[i][0];
      let cx = 0, cz = 0;
      for (let k = 0; k < r.length; k += 2) { cx += r[k] / 10; cz += r[k + 1] / 10; }
      cx /= r.length / 2; cz /= r.length / 2;
      if (inRing(cx, cz, OSM_RING)) data.bld.splice(i, 1);
    }
  }

  // ---- the garden: a lawn over the whole court, the paths on it (paved, so trees keep off) ----
  S.base = 0;
  S.kind = KIND.GROUND;
  {
    const ring = GARDEN.map((p) => new THREE.Vector2(p[0], p[1]));
    for (const f of THREE.ShapeUtils.triangulateShape(ring, [])) {
      const t = f.map((i) => { const p = GARDEN[i]; return [p[0], gY(p[0], p[1]) + 0.05, p[1]]; });
      S.tri(t[0], t[1], t[2], LAWN, [0, 1, 0]);
    }
  }
  const paved0 = S.n;
  S.kind = KIND.ROAD;
  const walk = (a, b, w, col = PATH) => { // a straight paved walk between two model points, on its own ground
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const yy = Math.max(gY(a[0], a[1]), gY(b[0], b[1]));
    S.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, yy - 0.1, yy + 0.1, l, w, Math.atan2(dz, dx), col);
  };
  // the gravel forecourt: the forecourt ring cut to the garden (each triangle of it clips the garden ring)
  for (const f of THREE.ShapeUtils.triangulateShape(FORECOURT.map((p) => new THREE.Vector2(p[0], p[1])), [])) {
    const tri = f.map((i) => FORECOURT[i]);
    const part = clipConvex(GARDEN, tri);
    if (part.length < 3) continue;
    for (const g of THREE.ShapeUtils.triangulateShape(part.map((p) => new THREE.Vector2(p[0], p[1])), [])) {
      const t = g.map((i) => { const p = part[i]; return [p[0], gY(p[0], p[1]) + 0.1, p[1]]; });
      S.tri(t[0], t[1], t[2], GRAVEL, [0, 1, 0]);
    }
  }
  // the walk down the south-west side, round the side bay, and from the river end out to the riverside walk
  walk(P(-ANX - 1.4, -1.6), P(BAY0 - 1.0, -1.6), 1.8);
  walk(P(BAY0 - 1.0, -1.6), P(BAY0 - 1.0, LB0 - 1.2), 1.8);
  walk(P(BAY0 - 1.0, LB0 - 1.2), P(LEN + 1.6, LB0 - 1.2), 1.8);
  walk(P(-ANX - 1.4, WID / 2), [45.0, 190.0], 2.2);
  // a gravel walk through the sculpture garden on the south-west, from the river walk to the street apron
  walk([33.0, 205.5], [50.0, 220.5], 1.6);
  walk([50.0, 220.5], P(LEN * 0.55, -1.6), 1.6);
  walk([52.0, 233.0], P(LEN + 1.6, LB0 - 1.2), 1.6);
  (S.paved = S.paved || []).push([paved0, S.n]);

  // ---- the villa: a low plinth, two white-rendered storeys with pale yellow shutters, a cornice, Marseille-tile roofs ----
  // (Street View, 2025: white walls, small windows with pale yellow louvred shutters, a string course between the floors;
  //  the street front in three bays between full-height pilasters: a narrow south-west bay with one small window, the
  //  door under a small tiled awning in the centre bay with a raised shouldered gable over it, two windows a floor in
  //  the right bay; a one-storey flat-roofed annex with a balustrade on the river end)
  const pl = 0.6, yp = y0 + pl;
  const wallH = 7.9, yc = yp + wallH, ys = yp + 3.8; // cornice 8.5 m, string course 4.4 m above the ground
  const WW = WID + BAYW, WD = LEN - BAY0; // the street wing's outer edge (v) and depth (u)
  const wingV = (SW0 + WW) / 2, wingW = WW - SW0;
  const sideV = (LB0 + SW0) / 2, sideW = SW0 - LB0; // the south-west side bay
  S.kind = KIND.MASONRY;
  box(LEN / 2, WID / 2, y0 - 0.3, yp, LEN + 0.3, WID + 0.3, PLINTH);
  box((BAY0 + LEN) / 2, (LB0 + WW) / 2, y0 - 0.3, yp, WD + 0.3, WW - LB0 + 0.3, PLINTH);
  box(-ANX / 2, WID / 2, y0 - 0.3, yp, ANX + 0.3, WID + 0.6, PLINTH);
  S.base = yp - LAND_Y;
  S.kind = KIND.PLAIN;
  box(LEN / 2, WID / 2, yp, yc, LEN, WID, WALL);
  box((BAY0 + LEN) / 2, wingV, yp, yc, WD, wingW, WALL);
  box((BAY0 + LEN) / 2, sideV, yp, yc, WD, sideW + 0.02, WALL);
  // the annex: one storey, a flat roof behind a balustrade
  const ya = yp + 3.9;
  box(-ANX / 2, WID / 2, yp, ya, ANX, WID + 0.3, WALL, { top: shade(TRIM, 0.85) });
  box(-ANX / 2, WID / 2, ya, ya + 0.2, ANX + 0.25, WID + 0.55, TRIM);
  for (const [u0, v0, u1, v1] of ([[-ANX, -0.1, -ANX, WID + 0.4], [-ANX, -0.1, 0, -0.1], [-ANX, WID + 0.4, 0, WID + 0.4]] as any[])) {
    const l = Math.hypot(u1 - u0, v1 - v0), n = Math.max(2, Math.round(l / 0.32));
    const along = u0 === u1;
    box((u0 + u1) / 2, (v0 + v1) / 2, ya + 0.85, ya + 0.97, along ? 0.2 : l, along ? l : 0.2, TRIM);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      box(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, ya + 0.2, ya + 0.85, 0.11, 0.11, TRIM);
    }
  }
  // string course, cornice, pilasters at the corners and between the street bays
  const ring1 = (y, h, grow, col) => {
    box(LEN / 2, WID / 2, y, y + h, LEN + grow, WID + grow, col);
    box((BAY0 + LEN) / 2, (LB0 + WW) / 2, y, y + h, WD + grow, WW - LB0 + grow, col);
  };
  ring1(ys, 0.22, 0.14, TRIM);
  ring1(yc - 0.15, 0.4, 0.36, TRIM);
  for (const [u, v] of ([[0, 0], [0, WID], [BAY0, WID], [BAY0, WW], [LEN, WW], [LEN, LB0], [BAY0, LB0], [BAY0, 0]] as any[])) box(u, v, yp, yc - 0.15, 0.45, 0.45, TRIM);
  for (const v of [CB0, C1]) box(LEN, v, yp, yc - 0.15, 0.3, 0.5, TRIM); // the pilasters dividing the street front

  // windows: grey glass in a white surround, two pale yellow louvred leaves folded back beside it, a moulded hood
  // face: 'se' (street, u = LEN), 'sw' (v = v0), 'ne' (v = v0), 'nw' (u = u0); s = position along the face
  const win = (face, s, f0, ya_, h, w = 0.9, door = false) => {
    const o = 0.06, sh = w / 2;
    const at = (d, a) => face === 'se' ? [LEN + d, a] : face === 'nw' ? [f0 - d, a] : face === 'sw' ? [a, f0 - d] : [a, f0 + d];
    const put = (d, a, ww, y1, y2, col) => {
      const [u, v] = at(d, a), alongU = face === 'sw' || face === 'ne';
      box(u, v, y1, y2, alongU ? ww : 0.1, alongU ? 0.1 : ww, col);
    };
    put(o * 0.5, s, w + 0.24, ya_ - 0.1, ya_ + h + 0.12, TRIM);
    put(o, s, w, ya_, ya_ + h, door ? DOOR : GLASS);
    for (const k of [-1, 1]) put(o * 1.5, s + k * (w / 2 + 0.12 + sh / 2), sh, ya_, ya_ + h, SHUT);
    if (door) put(o, s, w + 0.1, ya_ + h + 0.15, ya_ + h + 0.7, SHUT); // the louvred transom over the door
    else put(o * 2, s, w + 0.5, ya_ + h + 0.18, ya_ + h + 0.32, TRIM); // the hood
  };
  // the street front: the side bay's window, the door and one window over it, two windows a floor on the right
  const DV = (CB0 + C1) / 2, RV = [3.9, 6.4];
  win('se', DV, 0, yp, 1.85, 1.3, true);
  win('se', (LB0 + CB0) / 2, 0, yp + 0.5, 1.8, 0.8);
  win('se', (LB0 + CB0) / 2, 0, ys + 1.3, 1.8, 0.8);
  for (const v of RV) win('se', v, 0, yp + 0.5, 1.9);
  for (const v of [DV, ...RV]) win('se', v, 0, ys + 1.3, 2.0);
  // the gable over the centre bay: a parapet with two shoulders and a raised middle, standing in front of the eave
  {
    const cv = DV, cw = C1 - CB0, gu = LEN + 0.12, gd = 0.9;
    box(gu, cv, yc - 0.35, yc - 0.15, gd - 0.1, cw + 0.3, TRIM);
    box(gu, cv, yc - 0.15, yc + 1.0, gd, cw, WALL);
    box(gu, cv, yc + 1.0, yc + 1.14, gd + 0.12, cw + 0.18, TRIM);
    box(gu, cv, yc + 1.0, yc + 2.0, gd, cw * 0.56, WALL);
    box(gu, cv, yc + 2.0, yc + 2.16, gd + 0.12, cw * 0.56 + 0.18, TRIM);
    box(gu + gd / 2, cv, yc + 1.25, yc + 1.75, 0.06, 0.5, GLASS); // a small vent in the raised middle
  }
  // two low steps up to the door, with a landing the width of the awning
  {
    S.kind = KIND.MASONRY;
    box(LEN + 0.45, DV, y0, yp + 0.05, 0.9, 2.2, PLINTH);
    box(LEN + 0.95, DV, y0, yp - 0.25, 0.7, 2.0, shade(PLINTH, 1.06));
    S.kind = KIND.PLAIN;
  }
  // the awning over the door: a short tiled slope on two pale yellow cast brackets (an arm, a post on the wall, a strut)
  {
    const q = P(LEN + 0.7, DV);
    S.hip(q[0], q[1], 2.4, 1.3, ang + Math.PI / 2, yp + 3.45, 0.25, shade(ROOF, 0.85), { over: 0.05 });
    for (const k of [-1, 1]) {
      const v = DV + k * 1.05;
      box(LEN + 0.4, v, yp + 3.33, yp + 3.45, 0.7, 0.06, SHUT);
      box(LEN + 0.1, v, yp + 2.55, yp + 3.45, 0.12, 0.06, SHUT);
      for (let i = 1; i <= 3; i++) box(LEN + 0.1 + i * 0.14, v, yp + 2.55 + i * 0.22, yp + 2.75 + i * 0.22, 0.14, 0.05, SHUT);
    }
  }
  // the long south-west side: four bays on the body, two on the side bay
  for (const u of [1.6, 4.4, 7.2, 9.6]) { win('sw', u, 0, yp + 0.5, 1.9); win('sw', u, 0, ys + 1.3, 2.0); }
  for (const u of [12.9, 16.2]) { win('sw', u, LB0, yp + 0.5, 1.9); win('sw', u, LB0, ys + 1.3, 2.0); }
  // the park side (north-east)
  for (const u of [1.6, 4.4, 7.2, 9.6]) { win('ne', u, WID, yp + 0.5, 1.9); win('ne', u, WID, ys + 1.3, 2.0); }
  for (const u of [12.9, 16.2]) { win('ne', u, WW, yp + 0.5, 1.9); win('ne', u, WW, ys + 1.3, 2.0); }
  // the river end: the annex's doors below, three windows upstairs
  for (const v of [1.6, WID / 2, WID - 1.6]) { win('nw', v, -ANX, yp + 0.05, 2.6, 1.2, v === WID / 2); win('nw', v, 0, ys + 1.3, 2.0); }
  for (const v of [-0.1, WID + 0.4]) { const ua = -ANX / 2; win(v < 0 ? 'sw' : 'ne', ua, v, yp + 0.5, 1.9); }
  for (const s of [-1, 1]) { const q = P(LEN + 0.3, DV + s * 1.3); lamps.push([q[0], yp + 3.2, q[1]]); }

  // ---- the roofs: a hipped roof over the body (ridge along the long side), a cross-hipped roof over the street wing
  //      meeting it, ridge 12.0 m above the ground (city survey); a lower hipped roof over the side bay ----
  const ye = yc + 0.25, ridge = y0 + 12.0;
  {
    const q = P(BAY0 / 2 + 0.6, WID / 2);
    S.hip(q[0], q[1], BAY0 + 1.2, WID, ang, ye, ridge - ye, ROOF, { over: 0.5 });
    const r = P((BAY0 + LEN) / 2, wingV);
    S.hip(r[0], r[1], wingW, WD, ang + Math.PI / 2, ye, ridge - ye - 0.1, shade(ROOF, 0.97), { over: 0.5 });
    const t = P((BAY0 + LEN) / 2, sideV - 0.1);
    S.hip(t[0], t[1], WD, sideW + 0.2, ang, ye, 1.4, shade(ROOF, 0.94), { over: 0.4 });
  }
  // chimneys: one on the main roof (seen on the satellite), one on the wing
  S.kind = KIND.MASONRY;
  for (const [u, v] of ([[6.8, WID / 2 - 0.8], [14.6, WW - 2.4]] as any[])) box(u, v, ridge - 2.2, ridge + 0.7, 0.7, 0.9, TRIM, { top: shade(PLINTH, 0.7) });
  S.kind = KIND.PLAIN;

  // ---- the sculpture garden: works built from her seven modules (half-discs, arcs, quarter-discs, bars), in white
  //      concrete, grey stone, laterite and bronze, on low plinths across the lawn; module-shaped stone benches ----
  S.base = 0;
  const works = [
    // [x, z, kind, size, heading, colour]
    [44.0, 199.0, 'arch', 2.6, 0.75, WHITE], // "Chào đón": an open arch facing the river walk
    [37.5, 207.5, 'stack', 2.2, 0.2, WHITE],
    [52.5, 210.5, 'pair', 1.8, 1.4, BRONZE], // "Lớn và nhỏ": a large and a small half-disc
    [46.5, 220.0, 'ring', 1.6, 0.75, GREY],
    [59.0, 222.0, 'kids', 1.1, 2.3, LATERITE], // "Trẻ em": a ring of small figures
    [57.0, 197.0, 'stack', 1.6, 1.1, GREY],
    [66.0, 228.5, 'arch', 1.7, 2.3, BLACK],
    [70.8, 241.0, 'pair', 1.4, 0.2, WHITE],
    [88.0, 204.0, 'ring', 1.3, 2.4, WHITE],
    [97.0, 216.0, 'stack', 1.4, 0.75, LATERITE],
    [69.0, 192.5, 'pair', 1.2, 2.0, GREY],
    [32.0, 203.0, 'kids', 0.9, 0.3, GREY],
  ];
  for (const [x, z, k, s, h, col] of works) sculpture(S, x, z, k, s, h, col);
  // at the street door (Lê Lợi pano): small white works against the front either side of the door and before the side
  // bay, and two dark green park benches on the forecourt facing the door
  for (const [u, v, k, s] of ([[LEN + 0.9, DV - 1.6, 'stack', 0.75], [LEN + 0.9, RV[0], 'pair', 0.8], [LEN + 2.2, (LB0 + CB0) / 2, 'stack', 0.7]] as any[])) {
    const q = P(u, v);
    sculpture(S, q[0], q[1], k, s, ang + Math.PI / 2, WHITE);
  }
  for (const v of [DV + 0.2, DV + 2.8]) {
    const q = P(LEN + 4.8, v), yy = gY(q[0], q[1]);
    S.kind = KIND.PLAIN;
    for (const k of [-0.7, 0.7]) box(LEN + 4.8, v + k, yy, yy + 0.42, 0.42, 0.06, IRON);
    box(LEN + 4.8, v, yy + 0.42, yy + 0.48, 0.45, 1.7, BENCH);
    box(LEN + 5.0, v, yy + 0.55, yy + 0.85, 0.05, 1.7, BENCH);
  }
  for (const [x, z, h] of ([[41.0, 211.5, 0.75], [49.0, 203.0, 2.3], [62.0, 214.0, 2.3], [80.0, 238.0, 0.75], [92.0, 225.0, 2.3]] as any[])) {
    const yy = gY(x, z);
    vslab(S, x, z, yy, h, half(0.55, 7), 1.8, shade(GREY, 1.08)); // a half-cylinder bench, lying
  }
  // garden lamps along the street apron and the river walk
  for (const [u, v] of ([[LEN + 1.2, -2.0], [LEN + 1.2, WID + BAYW + 2.0], [-ANX - 1.4, -2.0], [-ANX - 1.4, WID + 2.0]] as any[])) {
    const q = P(u, v), yy = gY(q[0], q[1]);
    S.cyl(q[0], q[1], yy, yy + 3.2, 0.07, 0.06, 6, IRON, { cap: false });
    S.cyl(q[0], q[1], yy + 3.2, yy + 3.55, 0.18, 0.14, 6, TRIM);
    lamps.push([q[0], yy + 3.4, q[1]]);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;

  if (lamps.length) {
    const pos = [], col = [];
    for (const p of lamps) { pos.push(...p); col.push(1, 0.8, 0.52); }
    const pts = glowPoints(pos, col, 5);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
}

// ---- helpers ----

// a polygon [[x, z], ...] cut to a convex polygon (Sutherland-Hodgman; either winding)
function clipConvex(subject, clip) {
  let area = 0;
  for (let i = 0; i < clip.length; i++) { const a = clip[i], b = clip[(i + 1) % clip.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const sg = Math.sign(area);
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const side = (p) => sg * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const inp = out;
    out = [];
    for (let k = 0; k < inp.length; k++) {
      const p = inp[k], q = inp[(k + 1) % inp.length], dp = side(p), dq = side(q);
      if (dp >= 0) out.push(p);
      if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) {
        const t = dp / (dp - dq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
  }
  return out;
}

// a half-disc profile [a, y] standing on y = 0 (radius r, n segments)
function half(r, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = Math.PI * (i / n); pts.push([r * Math.cos(t), r * Math.sin(t)]); }
  return pts;
}

// a convex profile [[a, y], ...] in the vertical plane through (x, y0, z) along heading h, extruded `t` thick
function vslab(S, x, z, y0, h, prof, t, col) {
  const ca = Math.cos(h), sa = Math.sin(h), nx = -sa, nz = ca;
  const pt = (p, o): [number, number, number] => [x + p[0] * ca + nx * o, y0 + p[1], z + p[0] * sa + nz * o];
  let cx = 0, cy = 0;
  for (const p of prof) { cx += p[0] / prof.length; cy += p[1] / prof.length; }
  const n = prof.length;
  for (const o of [-t / 2, t / 2]) {
    const c = pt([cx, cy], o), hint = [nx * Math.sign(o), 0, nz * Math.sign(o)];
    for (let i = 0; i < n; i++) S.tri(c, pt(prof[i], o), pt(prof[(i + 1) % n], o), col, hint);
  }
  for (let i = 0; i < n; i++) {
    const a = prof[i], b = prof[(i + 1) % n];
    const ox = (a[0] + b[0]) / 2 - cx, oy = (a[1] + b[1]) / 2 - cy;
    S.quad(pt(a, -t / 2), pt(b, -t / 2), pt(b, t / 2), pt(a, t / 2), shade(col, 0.94), [ox * ca, oy, ox * sa]);
  }
}

// an arc (part of an annulus, radii r0..r1, angles a0..a1) standing in the vertical plane along heading h
function arc(S, x, z, y0, h, r0, r1, a0, a1, n, t, col) {
  for (let i = 0; i < n; i++) {
    const p = a0 + (a1 - a0) * (i / n), q = a0 + (a1 - a0) * ((i + 1) / n);
    vslab(S, x, z, y0, h, [[r0 * Math.cos(p), r0 * Math.sin(p)], [r1 * Math.cos(p), r1 * Math.sin(p)], [r1 * Math.cos(q), r1 * Math.sin(q)], [r0 * Math.cos(q), r0 * Math.sin(q)]], t, col);
  }
}

// one of the module sculptures on a low plinth
function sculpture(S, x, z, kind, s, h, col) {
  const y0 = gY(x, z), ca = Math.cos(h), sa = Math.sin(h);
  S.kind = KIND.MASONRY;
  S.box(x, z, y0 - 0.1, y0 + 0.3, s * 1.9, s * 1.0, h, shade(GREY, 0.9));
  S.kind = KIND.PLAIN;
  const yb = y0 + 0.3;
  const at = (a): [number, number] => [x + a * ca, z + a * sa];
  if (kind === 'arch') {
    // two bars carrying a half-ring: the open gesture of welcome
    for (const sg of [-1, 1]) { const q = at(sg * s * 0.62); S.box(q[0], q[1], yb, yb + s * 0.55, s * 0.24, s * 0.3, h, col); }
    arc(S, x, z, yb + s * 0.55, h, s * 0.5, s * 0.74, 0, Math.PI, 7, s * 0.3, col);
  } else if (kind === 'stack') {
    // a block, a half-disc on it, a quarter-disc turned on top
    S.box(x, z, yb, yb + s * 0.45, s * 1.2, s * 0.4, h, col);
    vslab(S, x, z, yb + s * 0.45, h, half(s * 0.55, 8), s * 0.36, col);
    const q = at(s * 0.1);
    vslab(S, q[0], q[1], yb + s * 1.0, h + Math.PI / 2, [[0, 0], ...half(s * 0.45, 8).slice(0, 5)], s * 0.3, shade(col, 0.95));
  } else if (kind === 'pair') {
    const a = at(-s * 0.4), b = at(s * 0.55);
    vslab(S, a[0], a[1], yb, h, half(s * 0.6, 9), s * 0.28, col);
    vslab(S, b[0], b[1], yb, h, half(s * 0.3, 7), s * 0.28, col);
  } else if (kind === 'ring') {
    arc(S, x, z, yb + s * 0.62, h, s * 0.42, s * 0.62, 0, Math.PI * 2, 12, s * 0.3, col);
  } else if (kind === 'kids') {
    // small round-headed figures in a ring
    for (let i = 0; i < 5; i++) {
      const t = h + (i / 5) * Math.PI * 2, px = x + Math.cos(t) * s * 0.6, pz = z + Math.sin(t) * s * 0.3;
      S.cyl(px, pz, yb, yb + s * 0.7, s * 0.15, s * 0.12, 6, col, { cap: false });
      S.cyl(px, pz, yb + s * 0.7, yb + s * 0.95, s * 0.14, s * 0.06, 6, col);
    }
  }
}
