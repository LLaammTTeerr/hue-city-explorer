import { KIND, hex, shade, inRing } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { fence, roadsNear, leaves, FENCE } from '../enclosure.ts';

// Trường Quốc Học (founded 1896; the campus rebuilt in brick, lime and tile from 1915) as it stands in 2026:
// the dark-red ("đỏ sẫm") two-storey blocks with their arched verandas and tiled hip roofs, the tam quan gate on
// Lê Lợi, the walled campus with its iron railing, the bình phong long mã inside the gate, the statue of
// Nguyễn Tất Thành on the circle in the yard, and the phượng trees. Sources and estimates: docs/places/quochoc.md.
//
// Frame: metres, x east, z south (scripts/build-data.mjs). Geometry from OpenStreetMap: campus way 695775622,
// the building ways listed in BLD, circle drive 835629406, service drive 828329033.

export const id = 'quochoc';

// campus wall, OSM way 695775622 (5.6 ha). Re-framed here: OSM draws the Lê Lợi frontage about 3.4 m out toward the
// street, on the kerb side of the pavement and the planted verge; the satellite (the gate's roof) and the Street View
// panoramas on Lê Lợi, Nguyễn Trường Tộ and Phan Bội Châu put the wall that far back. The four frontage points move
// (+2.23, +2.56), square to Lê Lợi; the two corner points slide along the side walls, which keep their line.
const LELOI = [2.23, 2.56];
const RING = [[-501, 1197], [-495.8, 1199.4], [-486.9, 1195.2], [-383.6, 1100.1], [-383, 1087.1], [-571.6, 872.4],
  [-579.2, 870.7], [-639.6, 923.5], [-697.6, 974.1], [-696.9, 983.1], [-540, 1155.6]]
  .map(([x, z], i) => (i >= 5 && i <= 8 ? [x + LELOI[0], z + LELOI[1]] : [x, z]));
// the gate on the Lê Lợi frontage (hue.json quocHocGate, moved back with the wall) and the line of the campus axis
const GATE = { c: [-637.8 + LELOI[0], 921.9 + LELOI[1]], a: 2.424 };
const CIRCLE = { c: [-569.9, 1001.2], r: 11.5 }; // OSM 835629406: the statue stands in its middle

// The buildings, as oriented rectangles: [osmId, colonial (1: 1915 block with an arcaded gallery facing the yard;
// 2: the same walls without the gallery), height to the ridge (survey, hue.json b[5]),
// centre x, centre z, angle (rad), parts [[u0, u1, v0, v1], ...] in the building's own frame, and optionally link:
// true for a short link block, butted at both ends of its length against other buildings, whose roof and cornice
// stop at those end walls instead of overhanging them], and optionally gable: [u- end, u+ end] of the first part,
// 1 where that end is a gable with a pediment (Street View: the 1915 blocks' ends on Phan Bội Châu, Nguyễn Trường
// Tộ and Ngô Quyền) instead of a hip].
// The two link blocks each join a 1915 wing to the old hall (OSM relation 9669095). OSM draws that hall as one ring
// round two courtyards, and city.js would roof the courtyards over; the satellite shows three hipped blocks across
// the width (NE, middle, SW) joined along both long sides by low covered corridors, with the two paved courts between,
// so it is drawn here (frame from the relation's outer ring; the courts are its inner rings).
// Outlines of more than one rectangle (the front pavilions, the L- and T-shaped blocks) are split into parts.
const PAV = [[-5.2, 5.2, -6.3, 4.0], [-7.5, 7.5, -4.0, 1.85], [-2.3, 2.5, 4.0, 6.3]];
const BLD = [
  [118542427, 1, 13.0, -564.6, 904.8, -2.282, PAV],
  [695770486, 0, 12.5, -520.6, 942.5, 0.853, null],
  [695770487, 1, 13.0, -533.8, 967.1, 0.839, null, false, [0, 1]], // SE end: pediment toward Nguyễn Trường Tộ
  [695775624, 0, 10.0, -524.0, 1131.8, 2.408, [[10.7, 24.4, -12, 12], [-24.4, 10.7, -8.6, 3.45]]],
  [695775625, 0, 4.6, -573.4, 1110.3, 0.831, null],
  [695775626, 2, 13.0, -559.8, 1102.8, 0.828, null, false, [1, 0]], // Street View (Phan Bội Châu): 1915 walls, arched upper windows, NW pediment
  [695775628, 1, 13.0, -452.4, 1043.3, -2.301, [[-19.6, 15, -13.7, 13.7], [15, 19.6, -11.2, 10.3]], false, [1, 0]], // pediment to the pitch
  [695775629, 0, 5.0, -529.1, 1044.3, 0.835, null, true],
  [695775630, 0, 5.0, -507.3, 1069.4, 3.980, null, true],
  [695775634, 1, 9.0, -494.8, 1082.0, 2.400, [[-17.9, 17.9, -11.6, 3.0], [-6.8, 6.4, 3.0, 11.6]]],
  [695775635, 0, 4.6, -674.9, 999.2, -2.319, null],
  [695775636, 1, 10.5, -665.6, 988.3, 0.833, PAV],
  [695775637, 1, 8.0, -637.4, 952.2, 2.419, null],
  [695775638, 1, 8.5, -608.1, 926.2, -0.719, null],
  // the hội trường: one main roof on the satellite, about 5 m north-west of the OSM outline's middle (the outline
  // sits that far toward the yard), with a low veranda along its south-east side and a terrace at its north-east end
  [695775639, 1, 13.0, -537.3, 1033.7, -0.711, [[-15.6, 17.0, -13.7, 3.7]], false, [1, 0]], // SW pediment (satellite)
  [695775639, 2, 5.0, -537.3, 1033.7, -0.711, [[-15.6, 13.6, 3.7, 6.6]]],
  [9669095, 2, 6.0, -518.3, 1055.9, -0.703, [[17.2, 30.9, -11.5, 11.5], [-8.0, 6.5, -11.5, 11.5], [-30.9, -18.6, -11.5, 11.5]]],
  [9669095, 2, 4.2, -518.3, 1055.9, -0.703, [[6.5, 17.2, 7.4, 11.5], [6.5, 17.2, -11.5, -7.4], [-18.6, -8.0, 7.4, 11.5], [-18.6, -8.0, -11.5, -7.4]], true],
  [695775640, 1, 13.0, -602.9, 1029.2, -2.293, null],
  [695775641, 0, 12.5, -627.0, 1040.4, 0.833, null],
  [1377968893, 1, 5.5, -489.7, 1017.2, 0.836, null],
];
const DIMS = { 695770486: [62.6, 13.7], 695770487: [82.1, 15.5], 695775623: [44.6, 5.5], 695775625: [40.2, 9.3],
  695775626: [57.6, 14.0], 695775629: [8.6, 4.3], 695775630: [12.1, 4.0], 695775635: [36.2, 7.9], 695775637: [24.1, 14.7],
  695775638: [18.3, 15.1], 695775640: [81.5, 15.4], 695775641: [62.7, 14.1], 1377968893: [32.1, 6.6] };

// colours: the walls the school's own dark red, cream for cornices, string courses and balustrades
const RED = hex('#a23d33'), RED_D = hex('#85302a'), CREAM = hex('#eee0c0'), ROOF = hex('#8c4c3b'), RIDGE = hex('#d9c9a4');
const YELLOW = hex('#d8a52c'), IRON = hex('#24302b'), BRONZE = hex('#5b4a35'), BOARD = hex('#1f2f4a'), GOLD = hex('#d9b14a');

const gY = (x, z) => LAND_Y + rise(x, z);

export function build({ data, S, group }) {
  // a point in a building frame: c + u*a + v*b, with v = (-sin, cos) as Buf.box uses
  const at = (c, ang, u, v): [number, number] => [c[0] + u * Math.cos(ang) - v * Math.sin(ang), c[1] + u * Math.sin(ang) + v * Math.cos(ang)];
  const lampPos = [], lampCol = [];
  const lampAt = (x, y, z, col = [1, 0.85, 0.58]) => { lampPos.push(x, y, z); lampCol.push(col[0], col[1], col[2]); };

  // ---- the blocks ----
  for (const [osm, colonial, top, cx, cz, ang, parts0, link = false, gable = null] of BLD as any[]) {
    const dims = DIMS[osm];
    const parts = parts0 || [[-dims[0] / 2, dims[0] / 2, -dims[1] / 2, dims[1] / 2]];
    const c = [cx, cz];
    // the floor stands at the highest ground under the outline
    let floor = -Infinity;
    for (const [u0, u1, v0, v1] of parts) for (const [u, v] of ([[u0, v0], [u1, v0], [u1, v1], [u0, v1]] as any[])) { const p = at(c, ang, u, v); floor = Math.max(floor, rise(p[0], p[1])); }
    const y0 = LAND_Y + floor;
    S.base = floor;
    const wall = colonial ? RED : shade(RED, 1.04);
    parts.forEach(([u0, u1, v0, v1], pi) => {
      const w = u1 - u0, d = v1 - v0, pc = at(c, ang, (u0 + u1) / 2, (v0 + v1) / 2);
      const rh = Math.min(4.2, Math.max(1.6, Math.min(w, d) * 0.24));
      const eave = y0 + Math.max(2.8, top - rh - 0.3);
      const twoStorey = top >= 8;
      const storey = twoStorey ? (eave - y0 - 0.5) / 2 : eave - y0 - 0.5;
      // a gallery along the long side that faces the yard: the long wings of 1915 have arcades on both floors
      const long = w >= d;
      const gal = colonial === 1 && Math.max(w, d) >= 20 && Math.min(w, d) >= 9;
      const G = 2.6;
      let side = 0;
      if (gal) {
        const nrm = long ? [-Math.sin(ang), Math.cos(ang)] : [Math.cos(ang), Math.sin(ang)];
        side = (CIRCLE.c[0] - pc[0]) * nrm[0] + (CIRCLE.c[1] - pc[1]) * nrm[1] >= 0 ? 1 : -1;
      }
      // plinth
      S.kind = KIND.MASONRY;
      S.box(pc[0], pc[1], y0 - 0.6, y0 + 0.5, w + 0.2, d + 0.2, ang, shade(CREAM, 0.86), { topKind: KIND.ROAD });
      // walls: plain render, the windows drawn one storey at a time (the 1915 blocks have two storeys of about 4.5 m:
      // the facade shaders' 3.4 m floors would read as three)
      S.kind = KIND.PLAIN;
      let wc = pc, ww = w, wd = d;
      if (gal) {
        wc = long ? at(pc, ang, 0, -side * G / 2) : at(pc, ang, -side * G / 2, 0);
        if (long) wd = d - G; else ww = w - G;
      }
      S.box(wc[0], wc[1], y0 + 0.5, eave, ww, wd, ang, wall);
      facade(S, wc, ang, ww, wd, y0 + 0.5, storey, twoStorey ? 2 : 1, colonial ? 'arch' : 'rect', wall, link);
      // cornice and (two storeys) string course
      S.box(pc[0], pc[1], eave - 0.45, eave, link ? w : w + 0.3, d + 0.3, ang, CREAM);
      if (twoStorey && !gal) S.box(pc[0], pc[1], y0 + 0.5 + storey - 0.1, y0 + 0.5 + storey + 0.15, w + 0.12, d + 0.12, ang, CREAM);
      if (gal) gallery(S, pc, ang, w, d, long, side, G, y0 + 0.5, storey, twoStorey ? 2 : 1, eave - 0.45, wall);
      // roof: a hip, or with a gable and pediment at one or both ends
      const g = pi === 0 && gable && long ? gable : [0, 0];
      roof(S, pc, ang, link ? w - 1.8 : w, d, eave, rh, g);
      for (const [k, sg] of ([[0, -1], [1, 1]] as any[])) if (g[k]) pediment(S, at(pc, ang, sg * w / 2, 0), ang, sg, d, eave, rh, 0.9, wall);
    });
  }
  S.base = 0;

  // ---- the hội trường's terrace: a cream balustraded platform at the north-east end of the veranda ----
  {
    const c = [-537.3, 1033.7], a = -0.711, q = at(c, a, 15.8, 6.3), y = gY(q[0], q[1]);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], y - 0.4, y + 1.1, 4.6, 5.4, a, shade(CREAM, 0.9), { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const [u, v, len, ang] of ([[15.8, 8.95, 4.6, a], [18.05, 6.3, 5.4, a + Math.PI / 2]] as any[])) {
      const p = at(c, a, u, v);
      S.box(p[0], p[1], y + 1.1, y + 1.95, len, 0.22, ang, CREAM);
    }
  }

  // ---- the old hall's two courts, paved ----
  for (const [u0, u1] of ([[6.5, 17.2], [-18.6, -8.0]] as any[])) {
    const q = at([-518.3, 1055.9], -0.703, (u0 + u1) / 2, 0), y = gY(q[0], q[1]);
    S.kind = KIND.PLAIN;
    S.box(q[0], q[1], y - 0.3, y + 0.08, u1 - u0, 14.8, -0.703, hex('#bdb3a0'), { topKind: KIND.ROAD });
  }

  // ---- the sports ground (satellite): the swimming pool north-east of the hội trường, the football pitch and the
  // red running track beside it toward Ngô Quyền ----
  {
    const pc = [-480.8, 1007.6], pa = 0.84, y = gY(pc[0], pc[1]);
    S.kind = KIND.PLAIN;
    S.box(pc[0], pc[1], y - 0.3, y + 0.25, 27.5, 18.2, pa, hex('#d9d2c2'), { topKind: KIND.ROAD }); // the deck
    S.box(pc[0], pc[1], y - 0.3, y + 0.27, 23.0, 13.7, pa, hex('#5fa9c4')); // the water
    const fc = [-459.4, 1127.4], fa = -0.71;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { // in tiles, each on the ground under it
      const p = at(fc, fa, -38 + (i + 0.5) * 9.5, -19.5 + (j + 0.5) * 9.75), ty = gY(p[0], p[1]);
      S.box(p[0], p[1], ty - 0.4, ty + 0.06, 9.52, 9.77, fa, hex('#4f8a3c'), { topKind: KIND.GROUND });
    }
    for (const [u, v, w, d] of ([[0, -19.2, 76, 0.18], [0, 19.2, 76, 0.18], [-37.7, 0, 0.18, 39], [37.7, 0, 0.18, 39], [0, 0, 0.18, 39]] as any[])) {
      const p = at(fc, fa, u, v), e0 = at(fc, fa, u - w / 2, v - d / 2), e1 = at(fc, fa, u + w / 2, v + d / 2);
      const ly = Math.max(gY(p[0], p[1]), gY(e0[0], e0[1]), gY(e1[0], e1[1]));
      S.box(p[0], p[1], ly - 0.2, ly + 0.08, w, d, fa, hex('#e8eee0')); // the lines
    }
    for (let i = 0; i < 10; i++) {
      const tc = at(fc, fa, 3 - 50 + (i + 0.5) * 10, -25.5), ty = gY(tc[0], tc[1]);
      S.box(tc[0], tc[1], ty - 0.4, ty + 0.07, 10.02, 8.6, fa, hex('#a3483a'), { topKind: KIND.ROAD });
    }
  }

  // ---- the grandstand by the track, the tennis court toward Nguyễn Trường Tộ and the basketball court at the pitch's
  // south-west end (satellite) ----
  grandstand(S);
  {
    const tc = [-418.1, 1092.3], ta = 0.86, L = 23.77, Wd = 10.97, ws = 8.23, sv = 6.4;
    const lines = [[0, -Wd / 2, L, 0.06], [0, Wd / 2, L, 0.06], [0, -ws / 2, L, 0.06], [0, ws / 2, L, 0.06], [-L / 2, 0, 0.06, Wd], [L / 2, 0, 0.06, Wd],
      [-sv, 0, 0.06, ws], [sv, 0, 0.06, ws], [0, 0, sv * 2, 0.06]];
    const { y, P } = court(S, tc, ta, [36, 18], [L + 1.2, Wd + 1.2], lines, hex('#8a5444'), hex('#4c6176'));
    for (const s of [-1, 1]) { const p = P(0, s * (Wd / 2 + 0.5)); S.cyl(p[0], p[1], y, y + 1.07, 0.05, 0.05, 5, IRON); }
    S.box(tc[0], tc[1], y + 0.6, y + 0.95, 0.03, Wd + 1, ta, shade(IRON, 1.4));
    // the tall netting posts round it
    for (const [u, v] of ([[-18, -9], [-18, 9], [18, -9], [18, 9], [0, -9], [0, 9], [-18, 0], [18, 0]] as any[])) { const p = P(u, v); S.cyl(p[0], p[1], y, y + 4, 0.05, 0.05, 5, shade(IRON, 1.3)); }
  }
  {
    const bc = [-499.4, 1164.5], ba = 0.86, L = 28, Wd = 15;
    const lines = [[0, -Wd / 2, L, 0.06], [0, Wd / 2, L, 0.06], [-L / 2, 0, 0.06, Wd], [L / 2, 0, 0.06, Wd], [0, 0, 0.06, Wd],
      [-L / 2 + 2.9, 0, 5.8, 4.9], [L / 2 - 2.9, 0, 5.8, 4.9]];
    const { y, P } = court(S, bc, ba, [32, 18], null, [], hex('#8f9393'));
    for (const [u, v, l, wd] of lines) {
      const p = P(u, v);
      if (l > 5 && wd > 4) { S.box(p[0], p[1], y - 0.1, y + 0.105, l, wd, ba, hex('#a35a48')); continue; } // the keys, painted
      S.box(p[0], p[1], y - 0.1, y + 0.115, l, wd, ba, hex('#eef0ea'));
    }
    for (const s of [-1, 1]) { // the hoops
      const p = P(s * (L / 2 + 0.9), 0), bd = P(s * (L / 2 - 1.2), 0);
      S.cyl(p[0], p[1], y, y + 3.4, 0.08, 0.08, 6, hex('#3c4a54'));
      S.box(bd[0], bd[1], y + 2.9, y + 3.95, 0.05, 1.8, ba, hex('#f2f2f0'));
      const pc = P(s * (L / 2 - 1.2) + s * 0.6, 0);
      S.box((p[0] + bd[0]) / 2, (p[1] + bd[1]) / 2, y + 3.3, y + 3.38, 2.1, 0.1, ba, hex('#3c4a54'));
      S.cyl(pc[0], pc[1], y + 3.03, y + 3.05, 0.23, 0.23, 8, hex('#d0602e'), { cap: false });
    }
  }

  // ---- the pavilion on Phan Bội Châu ----
  pavilion(S);

  // ---- the campus wall and railing; the gate opening ----
  const roads = roadsNear(data, [-540, 1035], 260);
  fence(S, RING, FENCE.quochoc, { roads, openings: [[GATE.c[0], GATE.c[1], 4.75]] });

  // ---- the gate ----
  gate(S, lampAt);

  // ---- the yard: the drive to the circle, the circle, the bình phong and the statue ----
  const inward = [Math.sin(GATE.a), -Math.cos(GATE.a)]; // into the campus: the gate frame's v points out to Lê Lợi
  const axisAt = (s, t = 0): [number, number] => [GATE.c[0] + inward[0] * s - inward[1] * t, GATE.c[1] + inward[1] * s + inward[0] * t];
  const axLen = Math.hypot(CIRCLE.c[0] - GATE.c[0], CIRCLE.c[1] - GATE.c[1]);
  const axAng = Math.atan2(inward[1], inward[0]);
  S.kind = KIND.PLAIN;
  // the drive, lying on the ground
  const PAVE = hex('#bdb3a0');
  drape(S, axisAt(1.5), axisAt(axLen - CIRCLE.r - 0.5), 6.5, PAVE);
  // the ring round the circle, and its lawn
  for (let k = 0; k < 24; k++) {
    const a0 = (k - 0.06) / 24 * Math.PI * 2, a1 = (k + 1.06) / 24 * Math.PI * 2, rr = CIRCLE.r + 2.6;
    drape(S, [CIRCLE.c[0] + Math.cos(a0) * rr, CIRCLE.c[1] + Math.sin(a0) * rr], [CIRCLE.c[0] + Math.cos(a1) * rr, CIRCLE.c[1] + Math.sin(a1) * rr], 5.2, PAVE, 0.075);
  }
  const cy = gY(CIRCLE.c[0], CIRCLE.c[1]);
  S.kind = KIND.MASONRY;
  S.cyl(CIRCLE.c[0], CIRCLE.c[1], cy - 0.3, cy + 0.25, CIRCLE.r, CIRCLE.r, 28, shade(CREAM, 0.8), { cap: false });
  S.kind = KIND.GROUND;
  S.cyl(CIRCLE.c[0], CIRCLE.c[1], cy - 0.3, cy + 0.2, CIRCLE.r - 0.25, CIRCLE.r - 0.25, 28, hex('#5f7f3c'));
  // the statue of Nguyễn Tất Thành as a pupil (1990, bronze), facing the gate on a stepped pedestal
  statue(S, CIRCLE.c, cy + 0.2, axAng + Math.PI);
  for (const t of [-1, 1]) { const q = axisAt(axLen - CIRCLE.r - 0.5, t * 3.6); lampAt(q[0], gY(q[0], q[1]) + 4.2, q[1]); }

  // the bình phong long mã with its stele, on the axis just inside the gate (position estimated)
  {
    const q = axisAt(11), y = gY(q[0], q[1]), a = GATE.a;
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], y - 0.3, y + 0.45, 5.6, 1.3, a, PAL.stone, { topKind: KIND.ROAD });
    S.box(q[0], q[1], y + 0.45, y + 2.7, 4.6, 0.6, a, RED_D);
    S.kind = KIND.PLAIN;
    for (const sg of [-1, 1]) {
      const p = at(q, a, sg * 2.45, 0);
      S.box(p[0], p[1], y + 0.45, y + 3.0, 0.5, 0.75, a, CREAM);
      S.cyl(p[0], p[1], y + 3.0, y + 3.45, 0.22, 0.06, 6, CREAM);
      const f = at(q, a, 0, sg * 0.31);
      S.box(f[0], f[1], y + 0.85, y + 2.3, 3.0, 0.04, a, hex('#4e7a63')); // the long mã in glazed shards
      S.box(f[0], f[1], y + 2.3, y + 2.42, 3.4, 0.05, a, CREAM);
    }
    S.box(q[0], q[1], y + 2.7, y + 2.85, 4.9, 0.8, a, CREAM);
    S.hip(q[0], q[1], 4.6, 0.6, a, y + 2.85, 0.45, YELLOW, { over: 0.2, glazed: true });
    const st = at(q, a, 0, -2.2); // the stele behind it, on the campus side
    S.kind = KIND.MASONRY;
    S.box(st[0], st[1], y - 0.2, y + 0.5, 1.6, 0.9, a, PAL.stone);
    S.box(st[0], st[1], y + 0.5, y + 2.2, 0.95, 0.25, a, hex('#59564f'));
    S.kind = KIND.PLAIN;
  }

  // ---- the trees the yard is known for: phượng (flamboyants) along the drive and round the circle ----
  const trees = [];
  for (let s = 22; s < axLen - CIRCLE.r - 6; s += 13) for (const t of [-1, 1]) trees.push(axisAt(s, t * 7.5));
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * Math.PI * 2; trees.push([CIRCLE.c[0] + Math.cos(a) * (CIRCLE.r + 8), CIRCLE.c[1] + Math.sin(a) * (CIRCLE.r + 8)]); }
  // between the long wings, inside the courtyards
  trees.push([-585, 1020], [-548, 1012], [-600, 990], [-520, 990], [-505, 1040], [-470, 1070], [-560, 1070], [-600, 1070], [-640, 1000]);
  if (Array.isArray(data.trees)) {
    let k = 0;
    for (const [x, z] of trees) {
      if (!inRing(x, z, RING)) continue;
      data.trees.push(Math.round(x * 10), Math.round(z * 10), 9 + (k++ % 4), 2); // scale 0.9-1.2, kind 2: flamboyant
    }
    // the rest of the canopy (satellite: most of the open ground between the blocks is under trees): a loose grid of
    // shade trees wherever there is no building, court, pitch, paving or wall within a few metres
    const hash = (i, j) => { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); };
    for (let i = -16; i <= 16; i++) for (let j = -16; j <= 16; j++) {
      const x = -540 + i * 12 + (hash(i, j) - 0.5) * 7, z = 1035 + j * 12 + (hash(j, i) - 0.5) * 7;
      if (!inRing(x, z, RING) || !openGround(x, z, axisAt, axLen)) continue;
      data.trees.push(Math.round(x * 10), Math.round(z * 10), 9 + Math.floor(hash(i + 3, j) * 5), hash(i, j + 5) < 0.3 ? 2 : hash(i, j + 9) < 0.5 ? 1 : 0);
    }
  }

  // ---- no generated houses inside the walls: the campus is buildings, yard and trees ----
  if (Array.isArray(data.infill)) {
    const a = data.infill, R = 8, keep = [];
    let near = data.meta?.counts?.infillNear ?? a.length / R, nearKept = 0;
    for (let i = 0; i < a.length / R; i++) {
      if (inRing(a[i * R] / 10, a[i * R + 1] / 10, RING)) continue;
      if (i < near) nearKept++;
      for (let j = 0; j < R; j++) keep.push(a[i * R + j]);
    }
    if (keep.length !== a.length) {
      a.length = 0;
      for (const v of keep) a.push(v);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }

  // ---- after dark: lamps on the gate, along the drive and round the circle ----
  for (let s = 18; s < axLen - CIRCLE.r - 4; s += 18) for (const t of [-1, 1]) { const q = axisAt(s, t * 4.2); lampAt(q[0], gY(q[0], q[1]) + 3.6, q[1]); }
  S.kind = KIND.PLAIN;
  for (let i = 0; i < lampPos.length; i += 3) {
    const x = lampPos[i], z = lampPos[i + 2], y = gY(x, z);
    if (lampPos[i + 1] - y > 3 && lampPos[i + 1] - y < 4.5) S.cyl(x, z, y, lampPos[i + 1] - 0.2, 0.07, 0.05, 5, IRON); // lamp posts in the yard
  }
  const pts = glowPoints(lampPos, lampCol, 4);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
  S.kind = KIND.PLAIN;
  S.base = 0;
}

// The arcaded veranda of a 1915 block: square piers on the outer line, a slab and balustrade at the upper floor,
// segmental arches between the piers on each floor. Built inside the mapped outline, under the main roof.
function gallery(S, pc, ang, w, d, long, side, G, y0, storey, floors, ceil, wall) {
  const L = long ? w : d, D = long ? d : w;
  const a = long ? ang : ang + Math.PI / 2;
  const sg = long ? side : -side; // in the frame turned by 90°, the v axis is the old -u
  const P = (u, v): [number, number] => [pc[0] + u * Math.cos(a) - v * Math.sin(a), pc[1] + u * Math.sin(a) + v * Math.cos(a)];
  const edge = sg * (D / 2 - 0.3), mid = sg * (D / 2 - G / 2);
  const bays = Math.max(3, Math.round((L - 0.6) / 3.4)), bay = (L - 0.6) / bays;
  S.kind = KIND.PLAIN;
  for (let k = 0; k <= bays; k++) {
    const p = P(-L / 2 + 0.3 + k * bay, edge);
    S.box(p[0], p[1], y0, ceil, 0.55, 0.55, a, wall);
    S.box(p[0], p[1], y0, y0 + 0.35, 0.7, 0.7, a, CREAM);
  }
  // the gallery's back wall is the main wall; its floor and ceiling slabs
  for (let f = 1; f < floors; f++) {
    const yf = y0 + storey * f, q = P(0, mid);
    S.box(q[0], q[1], yf - 0.3, yf, L, G, a, CREAM, { bottom: true });
    const e = P(0, sg * (D / 2 - 0.12));
    S.box(e[0], e[1], yf, yf + 0.9, L - 0.2, 0.16, a, CREAM); // balustrade
    S.box(e[0], e[1], yf + 0.9, yf + 1.0, L - 0.1, 0.26, a, shade(CREAM, 0.92));
  }
  // arches: the spandrel over each opening, a segmental arch drawn as a fan up to the ceiling of the floor
  const face = sg * (D / 2), N = 6;
  for (let f = 0; f < floors; f++) {
    const top = f + 1 < floors ? y0 + storey * (f + 1) - 0.3 : ceil;
    const spring = top - Math.min(1.25, storey * 0.32), rise = Math.min(0.75, bay * 0.22);
    for (let k = 0; k < bays; k++) {
      const u0 = -L / 2 + 0.3 + k * bay + 0.275, u1 = u0 + bay - 0.55;
      for (let j = 0; j < N; j++) {
        const t0 = j / N, t1 = (j + 1) / N;
        const ya = spring + rise * Math.sin(Math.PI * t0), yb = spring + rise * Math.sin(Math.PI * t1);
        const ua = u0 + (u1 - u0) * t0, ub = u0 + (u1 - u0) * t1;
        for (const off of [0, -sg * 0.35]) {
          const pa = P(ua, face + off), pb = P(ub, face + off);
          const nrm = off === 0 ? [-Math.sin(a) * sg, 0, Math.cos(a) * sg] : [Math.sin(a) * sg, 0, -Math.cos(a) * sg];
          S.quad([pa[0], ya, pa[1]], [pb[0], yb, pb[1]], [pb[0], top, pb[1]], [pa[0], top, pa[1]], wall, nrm);
        }
      }
      // the soffit under the arch, so it reads as thick
      const m = P((u0 + u1) / 2, face - sg * 0.175);
      S.box(m[0], m[1], spring - 0.05, spring + 0.02, u1 - u0, 0.35, a, shade(CREAM, 0.9));
    }
  }
}

// The tam quan gate on Lê Lợi, after Nguyễn Ngọc Tùng et al. (2021): 9.1 m wide, 2.2 m deep, 7.3 m tall; eight
// concrete columns 0.55 × 0.672 m; a middle opening of 4.3 m with two iron leaves and side doors of 1.2 m with one;
// 2.4 m from the ground to the upper floor and 1.5 m from it to the roof; an upper gallery (vọng lâu) with a
// balustrade, the name board and the bell; two tiers of imperial-yellow glazed tile with the ridge ornaments.
function gate(S, lampAt) {
  const c = GATE.c, a = GATE.a;
  const P = (u, v = 0): [number, number] => [c[0] + u * Math.cos(a) - v * Math.sin(a), c[1] + u * Math.sin(a) + v * Math.cos(a)];
  const y = gY(c[0], c[1]);
  S.base = y - LAND_Y;
  const W = 9.1, D = 2.2;
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], y - 0.4, y + 0.15, W + 1.0, D + 1.4, a, PAL.stone, { topKind: KIND.ROAD });
  const y1 = y + 0.15, yF = y1 + 2.4;
  // the eight columns, four in each row
  const cols = [-4.175, -2.425, 2.425, 4.175];
  S.kind = KIND.PLAIN;
  for (const u of cols) for (const v of [-0.764, 0.764]) {
    const p = P(u, v);
    S.box(p[0], p[1], y1, yF, 0.55, 0.672, a, RED);
    S.box(p[0], p[1], y1, y1 + 0.45, 0.68, 0.8, a, CREAM);
  }
  // the upper floor: a slab with a cream edge over the columns, wider over the middle opening
  S.box(c[0], c[1], yF, yF + 0.3, W + 0.3, D + 0.3, a, CREAM, { bottom: true });
  // lintels over the side doors and the middle
  for (const v of [-0.764, 0.764]) {
    const p = P(0, v);
    S.box(p[0], p[1], yF - 0.35, yF, W, 0.5, a, RED_D);
  }
  // the gate leaves: two over the middle opening, one in each side door (iron, closed)
  leaves(S, P(-2.15), P(2.15), y1, 2.0, IRON);
  for (const sg of [-1, 1]) leaves(S, P(sg * 2.7), P(sg * 3.9), y1, 1.9, IRON);
  // the balustrade round the upper floor: red, with white chữ thọ panels
  const yB = yF + 0.3;
  for (const [u, v, len, ang] of ([[0, D / 2 + 0.05, W + 0.2, a], [0, -D / 2 - 0.05, W + 0.2, a], [W / 2 + 0.05, 0, D + 0.2, a + Math.PI / 2], [-W / 2 - 0.05, 0, D + 0.2, a + Math.PI / 2]] as any[])) {
    const p = P(u, v);
    S.box(p[0], p[1], yB, yB + 0.75, len, 0.16, ang, RED);
    S.box(p[0], p[1], yB + 0.75, yB + 0.85, len + 0.1, 0.24, ang, CREAM);
    if (len > 5) for (let k = -3; k <= 3; k++) { const q = P(u + k * 1.15, v + Math.sign(v) * 0.09); S.box(q[0], q[1], yB + 0.2, yB + 0.6, 0.55, 0.02, a, CREAM); }
  }
  // the vọng lâu: columns of 1.5 m over the middle bay, carrying the two roof tiers
  const yR = yB + 1.5;
  for (const u of [-2.425, 2.425]) for (const v of [-0.764, 0.764]) {
    const p = P(u, v);
    S.box(p[0], p[1], yB, yR, 0.4, 0.45, a, RED);
  }
  // the name board QUỐC HỌC on both faces of the upper storey, and the bell inside
  for (const sg of [-1, 1]) {
    const q = P(0, sg * 0.82);
    S.box(q[0], q[1], yR - 0.85, yR - 0.05, 2.9, 0.06, a, GOLD);
    const q2 = P(0, sg * 0.86);
    S.box(q2[0], q2[1], yR - 0.8, yR - 0.1, 2.7, 0.04, a, BOARD);
  }
  S.box(c[0], c[1], yR - 0.15, yR, 5.4, 1.9, a, RED_D);
  S.cyl(c[0], c[1], yB + 0.35, yB + 1.2, 0.3, 0.38, 8, BRONZE);
  // the side bays: low hipped covers over the side doors at the floor
  for (const sg of [-1, 1]) {
    const q = P(sg * 3.4);
    S.hip(q[0], q[1], 2.0, D, a, yB + 0.85, 0.35, YELLOW, { over: 0.25, glazed: true });
  }
  // lower tier (eave over the vọng lâu) and upper tier with its ridge, to 7.3 m
  S.hip(c[0], c[1], 5.6, D, a, yR, 0.85, YELLOW, { over: 0.55, flare: 0.25, glazed: true, ridgeCol: YELLOW });
  S.kind = KIND.PLAIN;
  S.box(c[0], c[1], yR + 0.6, yR + 1.25, 4.0, 1.3, a, RED);
  S.hip(c[0], c[1], 4.0, 1.3, a, yR + 1.25, 0.95, YELLOW, { over: 0.5, flare: 0.3, glazed: true, ridgeCol: YELLOW });
  // the mặt nguyệt (sun disc) on the ridge and the dragon ends
  const yt = yR + 2.2;
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], yt - 0.05, yt + 0.12, 0.22, 0.22, 8, YELLOW);
  const disc = P(0);
  S.box(disc[0], disc[1], yt + 0.1, yt + 0.95, 0.65, 0.08, a, YELLOW, { taper: 0.6 });
  for (const sg of [-1, 1]) { const q = P(sg * 1.6); S.box(q[0], q[1], yt - 0.1, yt + 0.4, 0.5, 0.12, a, YELLOW, { taper: 0.5 }); }
  // lanterns at the columns of the front
  for (const u of [-4.175, 4.175]) { const p = P(u, -1.3); lampAt(p[0], yF + 0.1, p[1], [1, 0.84, 0.55]); }
  for (const sg of [-1, 1]) { const p = P(0, sg * 1.0); lampAt(p[0], yR - 0.3, p[1], [1, 0.9, 0.7]); }
  S.base = 0;
}

// The statue: a stepped stone pedestal, the figure in bronze (estimate: 3 m on a 2.6 m pedestal)
function statue(S, c, y, ang) {
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], y - 0.2, y + 0.45, 4.2, 4.2, ang, PAL.stone, { topKind: KIND.ROAD });
  S.box(c[0], c[1], y + 0.45, y + 0.9, 3.2, 3.2, ang, PAL.stone, { topKind: KIND.ROAD });
  S.box(c[0], c[1], y + 0.9, y + 2.9, 2.0, 2.0, ang, shade(PAL.stone, 0.9));
  S.box(c[0], c[1], y + 2.9, y + 3.15, 2.3, 2.3, ang, PAL.stone);
  S.kind = KIND.PLAIN;
  const y0 = y + 3.15;
  const P = (u, v): [number, number] => [c[0] + u * Math.cos(ang) - v * Math.sin(ang), c[1] + u * Math.sin(ang) + v * Math.cos(ang)];
  for (const sg of [-1, 1]) { const l = P(sg * 0.17, 0); S.cyl(l[0], l[1], y0, y0 + 1.45, 0.14, 0.17, 6, BRONZE); }
  S.cyl(c[0], c[1], y0 + 1.35, y0 + 2.3, 0.3, 0.27, 8, BRONZE); // the tunic
  for (const sg of [-1, 1]) { const h = P(sg * 0.38, 0); S.cyl(h[0], h[1], y0 + 1.5, y0 + 2.25, 0.07, 0.09, 5, BRONZE); }
  S.cyl(c[0], c[1], y0 + 2.3, y0 + 2.42, 0.09, 0.09, 6, BRONZE);
  S.cyl(c[0], c[1], y0 + 2.42, y0 + 2.75, 0.14, 0.12, 8, BRONZE); // the head
  S.cyl(c[0], c[1], y0 + 2.75, y0 + 2.86, 0.12, 0.03, 8, BRONZE);
}

// A block's roof. A plain hip, or (g: [u- end, u+ end]) one with gable ends: the hip is drawn longer past each gable
// end, so its ridge runs out through that end, and is cut square a little outside the end wall. The cut leaves the
// two slopes and the triangle that the pediment fills.
function roof(S, pc, ang, w, d, eave, rh, g) {
  const o = 0.9, opts = { over: o, fascia: 0.22, fasciaCol: CREAM, ridgeCol: RIDGE };
  if (!g[0] && !g[1]) { S.hip(pc[0], pc[1], w, d, ang, eave, rh, ROOF, opts); return; }
  const ext = (d / 2 + o) * 0.92 + 0.3, GO = 0.3; // GO: the roof's overhang past the gable wall
  const ua = -w / 2 - (g[0] ? ext : 0), ub = w / 2 + (g[1] ? ext : 0), m = (ua + ub) / 2;
  const rc = [pc[0] + m * Math.cos(ang), pc[1] + m * Math.sin(ang)];
  const clip = { u0: g[0] ? -w / 2 - GO - m : -1e9, u1: g[1] ? w / 2 + GO - m : 1e9, v0: -1e9, v1: 1e9 };
  S.hip(rc[0], rc[1], ub - ua, d, ang, eave, rh, ROOF, { ...opts, clip });
}

// The pediment on a gable end (Street View: Phan Bội Châu, Nguyễn Trường Tộ, Ngô Quyền): the end wall carried up
// into the gable, a cream cornice along its foot and up both rakes under the roof's edge, and a cream inner triangle
// with a lozenge in the tympanum. e: the middle of the end wall's foot line; sg: which way the end faces along ang.
function pediment(S, e, ang, sg, d, eave, rh, o, wall) {
  const n = [sg * Math.cos(ang), sg * Math.sin(ang)], b = [-Math.sin(ang), Math.cos(ang)];
  const W = (v, y, off): [number, number, number] => [e[0] + b[0] * v + n[0] * off, y, e[1] + b[1] * v + n[1] * off];
  const hint = [n[0], 0, n[1]];
  const hd = d / 2 + o, slope = rh / hd, yAt = (v) => eave + rh - Math.abs(v) * slope;
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  // the tympanum, just under the roof
  const yw = yAt(d / 2) - 0.08, ya = eave + rh - 0.08;
  S.quad(W(-d / 2, eave - 0.45, 0), W(d / 2, eave - 0.45, 0), W(d / 2, yw, 0), W(-d / 2, yw, 0), wall, hint);
  S.tri(W(-d / 2, yw, 0), W(d / 2, yw, 0), W(0, ya, 0), wall, hint);
  // the cornice at its foot and the raking cornices
  const f = W(0, 0, 0.12);
  S.box(f[0], f[2], eave - 0.05, eave + 0.22, d + 0.5, 0.45, ang + Math.PI / 2, CREAM);
  for (const s of [-1, 1]) S.beam(W(s * (hd - 0.1), eave - 0.12, 0.16), W(0, eave + rh - 0.12, 0.16), 0.34, 0.32, CREAM);
  // the inner triangle: a cream band round a red field, and the lozenge
  const yb = eave + 0.65, hb = d / 2 * 0.62, yt = yb + hb * slope * 0.85;
  S.tri(W(-hb, yb, 0.05), W(hb, yb, 0.05), W(0, yt, 0.05), CREAM, hint);
  const k = 0.26, yb2 = yb + k * 0.8, hb2 = hb - k * 2.2, yt2 = yb2 + hb2 * (yt - yb) / hb;
  if (hb2 > 0.5) S.tri(W(-hb2, yb2, 0.08), W(hb2, yb2, 0.08), W(0, yt2, 0.08), wall, hint);
  const ym = (yb2 + yt2) / 2 - 0.1, r = Math.min(0.55, (yt2 - yb2) * 0.3);
  S.quad(W(0, ym - r, 0.1), W(r, ym, 0.1), W(0, ym + r, 0.1), W(-r, ym, 0.1), CREAM, hint);
  S.kind = keep;
}

// The windows of a block, drawn on its four walls storey by storey (the 1915 blocks: an arcaded ground floor and one
// row of arched windows with shutters above, cream surrounds and sills, cream brackets at the piers). A link block
// has no windows on its butted ends. c, ang, w, d: the wall box; y0: the floor; style: 'arch' (1915) or 'rect'.
const DARK = hex('#2e2522'), SHUT = hex('#4a3a2b'), GLASS = hex('#2b3138');
function facade(S, c, ang, w, d, y0, storey, floors, style, wall, link) {
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (const [nu, nv] of ([[1, 0], [-1, 0], [0, 1], [0, -1]] as any[])) {
    if (link && nu) continue;
    const L = nu ? d : w;
    if (L < 2.4) continue;
    const n = [nu * ca - nv * sa, nu * sa + nv * ca], t = [-n[1], n[0]];
    const fc = [c[0] + n[0] * (nu ? w / 2 : d / 2), c[1] + n[1] * (nu ? w / 2 : d / 2)];
    const W = (s, y, off): [number, number, number] => [fc[0] + t[0] * s + n[0] * off, y, fc[1] + t[1] * s + n[1] * off];
    const hint = [n[0], 0, n[1]];
    const rect = (s0, s1, ya, yb, off, col) => S.quad(W(s0, ya, off), W(s1, ya, off), W(s1, yb, off), W(s0, yb, off), col, hint);
    const arch = (s, hw, yb, ys, off, col?) => {
      rect(s - hw, s + hw, yb, ys, off, col);
      for (let j = 0; j < 6; j++) {
        const a0 = Math.PI * j / 6, a1 = Math.PI * (j + 1) / 6;
        S.tri(W(s, ys, off), W(s + hw * Math.cos(a0), ys + hw * Math.sin(a0), off), W(s + hw * Math.cos(a1), ys + hw * Math.sin(a1), off), col, hint);
      }
    };
    const bays = Math.max(1, Math.round(L / 3.6)), bay = L / bays;
    for (let f = 0; f < floors; f++) {
      const base = y0 + f * storey;
      for (let k = 0; k < bays; k++) {
        const s = -L / 2 + (k + 0.5) * bay;
        if (style === 'arch' && floors === 2 && f === 0) {
          // the ground floor's arcade openings
          const hw = Math.min(0.85, bay * 0.27), ys = base + storey * 0.62;
          arch(s, hw + 0.14, base + 0.02, ys, 0.06, CREAM);
          arch(s, hw, base + 0.02, ys, 0.1, DARK);
        } else if (style === 'arch') {
          const hw = Math.min(0.7, bay * 0.22), yb = base + storey * 0.24, ys = base + storey * 0.66;
          arch(s, hw + 0.14, yb, ys, 0.06, CREAM);
          arch(s, hw, yb, ys, 0.1, SHUT);
          rect(s - hw - 0.25, s + hw + 0.25, yb - 0.18, yb, 0.12, CREAM);
        } else {
          const hw = Math.min(0.65, bay * 0.2), yb = base + storey * 0.3, yt = base + storey * 0.78;
          rect(s - hw - 0.12, s + hw + 0.12, yb - 0.12, yt + 0.12, 0.06, CREAM);
          rect(s - hw, s + hw, yb, yt, 0.1, GLASS);
        }
      }
      // brackets at the piers between the bays, under the string course or the cornice
      if (style === 'arch') for (let k = 1; k < bays; k++) {
        const s = -L / 2 + k * bay;
        rect(s - 0.24, s + 0.24, base + storey - 0.62, base + storey - 0.3, 0.08, CREAM);
      }
    }
  }
  S.kind = keep;
}

// The grandstand beside the running track (OSM 695775623; the satellite shows grey concrete steps, no roof): tiers
// rising away from the track, a back wall and end walls.
function grandstand(S) {
  const c = [-480.7, 1099.0], ang = 2.415, [L, D] = DIMS[695775623];
  const P = (u, v): [number, number] => [c[0] + u * Math.cos(ang) - v * Math.sin(ang), c[1] + u * Math.sin(ang) + v * Math.cos(ang)];
  let y = -Infinity;
  for (const [u, v] of ([[-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [-L / 2, D / 2]] as any[])) { const p = P(u, v); y = Math.max(y, gY(p[0], p[1])); }
  const CON = hex('#a7a49b');
  S.kind = KIND.MASONRY;
  // the track is on the stand's v- side
  const N = 6, td = (D - 0.4) / N;
  for (let i = 0; i < N; i++) {
    const v0 = -D / 2 + i * td, q = P(0, (v0 + D / 2 - 0.4) / 2);
    S.box(q[0], q[1], y - 0.4, y + 0.45 + i * 0.48, L, D / 2 - 0.4 - v0, ang, shade(CON, 1 - (i % 2) * 0.06), { topKind: KIND.ROAD });
  }
  const bw = P(0, D / 2 - 0.2);
  S.box(bw[0], bw[1], y - 0.4, y + 0.45 + N * 0.48 + 1.0, L, 0.4, ang, shade(CON, 0.9));
  for (const s of [-1, 1]) {
    const e = P(s * (L / 2 - 0.15), 0.4);
    S.box(e[0], e[1], y - 0.4, y + 0.45 + N * 0.48 + 0.5, 0.3, D - 0.8, ang, shade(CON, 0.9));
  }
  S.kind = KIND.PLAIN;
  // a rail along the back
  const r = P(0, D / 2 - 0.2);
  S.box(r[0], r[1], y + 0.45 + N * 0.48 + 1.0, y + 0.45 + N * 0.48 + 1.06, L, 0.08, ang, IRON);
}

// The small two-storey pavilion just inside the wall on Phan Bội Châu, north-west of the side gate (Street View: red
// walls, cream bands, arched windows, a flat ornamental parapet; the satellite: a tan roof about 6.5 m square).
// Height estimated from the photograph against the wall: two storeys of about 3.6 m and a parapet.
function pavilion(S) {
  const c = [-602.0, 1077.0], ang = 0.833, w = 6.5, d = 6.5;
  const P = (u, v): [number, number] => [c[0] + u * Math.cos(ang) - v * Math.sin(ang), c[1] + u * Math.sin(ang) + v * Math.cos(ang)];
  let fl = -Infinity;
  for (const [u, v] of ([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] as any[])) { const p = P(u, v); fl = Math.max(fl, rise(p[0], p[1])); }
  const y0 = LAND_Y + fl, storey = 3.6, top = y0 + 0.4 + storey * 2;
  S.base = fl;
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], y0 - 0.5, y0 + 0.4, w + 0.2, d + 0.2, ang, shade(CREAM, 0.86), { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  S.box(c[0], c[1], y0 + 0.4, top, w, d, ang, RED, { top: hex('#b49a76') });
  facade(S, c, ang, w, d, y0 + 0.4, storey, 2, 'arch', RED, false);
  // cream bands: the string course with an ochre frieze, the cornice
  S.box(c[0], c[1], y0 + 0.4 + storey - 0.15, y0 + 0.4 + storey + 0.35, w + 0.14, d + 0.14, ang, CREAM);
  S.box(c[0], c[1], y0 + 0.4 + storey - 0.02, y0 + 0.4 + storey + 0.22, w + 0.18, d + 0.18, ang, hex('#c99a4a'));
  S.box(c[0], c[1], top - 0.3, top + 0.1, w + 0.4, d + 0.4, ang, CREAM);
  // the parapet: a low red wall with a cream coping, corner posts with finials and a raised crest in each face
  for (const [u, v, len, a] of ([[0, d / 2, w, ang], [0, -d / 2, w, ang], [w / 2, 0, d, ang + Math.PI / 2], [-w / 2, 0, d, ang + Math.PI / 2]] as any[])) {
    const p = P(u, v);
    S.box(p[0], p[1], top + 0.1, top + 0.8, len, 0.2, a, RED);
    S.box(p[0], p[1], top + 0.8, top + 0.9, len + 0.1, 0.28, a, CREAM);
    S.box(p[0], p[1], top + 0.9, top + 1.4, 1.4, 0.22, a, CREAM, { taper: 0.6 });
  }
  for (const [u, v] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as any[])) {
    const p = P(u * w / 2, v * d / 2);
    S.box(p[0], p[1], top + 0.1, top + 1.15, 0.45, 0.45, ang, RED);
    S.box(p[0], p[1], top + 1.15, top + 1.3, 0.55, 0.55, ang, CREAM);
    S.cyl(p[0], p[1], top + 1.3, top + 1.7, 0.16, 0.05, 6, CREAM);
  }
  S.base = 0;
}

// Paving that lies on the ground: a strip from a to b, `w` wide, in pieces about 2 m long whose corners each sit on
// the ground under them (boxes stepped along a slope stood up out of the grass in teeth at their edges).
function drape(S, a, b, w, col, lift = 0.07) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 2));
  const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], nr = [-t[1], t[0]];
  const pt = (s, o) => { const x = a[0] + t[0] * s + nr[0] * o, z = a[1] + t[1] * s + nr[1] * o; return [x, gY(x, z) + lift, z]; };
  const keep = S.kind;
  S.kind = KIND.ROAD;
  const cols = 3;
  for (let i = 0; i < n; i++) {
    const s0 = (L * i) / n, s1 = (L * (i + 1)) / n;
    for (let j = 0; j < cols; j++) {
      const o0 = -w / 2 + (w * j) / cols, o1 = -w / 2 + (w * (j + 1)) / cols;
      S.quad(pt(s0, o0), pt(s1, o0), pt(s1, o1), pt(s0, o1), col, [0, 1, 0]);
    }
  }
  // a kerb along both edges, down into the ground
  S.kind = KIND.PLAIN;
  for (const o of [-w / 2, w / 2]) for (let i = 0; i < n; i++) {
    const p = pt((L * i) / n, o), q = pt((L * (i + 1)) / n, o);
    S.quad([p[0], p[1] - 0.3, p[2]], [q[0], q[1] - 0.3, q[2]], q, p, shade(col, 0.82), [nr[0] * Math.sign(o), 0, nr[1] * Math.sign(o)]);
  }
  S.kind = keep;
}

// A flat court on the ground: a slab, its surface, white lines given as [u, v, length, width] in the court's frame.
function court(S, c, ang, slab, surf, lines, slabCol, surfCol?) {
  const P = (u, v): [number, number] => [c[0] + u * Math.cos(ang) - v * Math.sin(ang), c[1] + u * Math.sin(ang) + v * Math.cos(ang)];
  let y = -Infinity;
  for (const [u, v] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as any[])) { const p = P(u * slab[0] / 2, v * slab[1] / 2); y = Math.max(y, gY(p[0], p[1])); }
  S.kind = KIND.PLAIN;
  S.box(c[0], c[1], y - 0.5, y + 0.08, slab[0], slab[1], ang, slabCol, { topKind: KIND.ROAD });
  if (surf) S.box(c[0], c[1], y - 0.5, y + 0.1, surf[0], surf[1], ang, surfCol);
  for (const [u, v, l, wd] of lines) { const p = P(u, v); S.box(p[0], p[1], y - 0.1, y + 0.115, l, wd, ang, hex('#eef0ea')); }
  return { y, P };
}

// Whether a tree may stand at (x, z): clear of the blocks, the courts, the pitch and track, the pool, the drive, the
// circle, the gate and the wall by a few metres.
function openGround(x, z, axisAt, axLen) {
  const inRect = (c, ang, u0, u1, v0, v1, m) => {
    const dx = x - c[0], dz = z - c[1], u = dx * Math.cos(ang) + dz * Math.sin(ang), v = -dx * Math.sin(ang) + dz * Math.cos(ang);
    return u > u0 - m && u < u1 + m && v > v0 - m && v < v1 + m;
  };
  for (const [osm, , , cx, cz, ang, parts0] of BLD as any[]) {
    const dims = DIMS[osm];
    for (const [u0, u1, v0, v1] of parts0 || [[-dims[0] / 2, dims[0] / 2, -dims[1] / 2, dims[1] / 2]]) if (inRect([cx, cz], ang, u0, u1, v0, v1, 4.5)) return false;
  }
  if (inRect([-518.3, 1055.9], -0.703, -30.9, 30.9, -11.5, 11.5, 4)) return false; // the old hall and its courts
  if (inRect([-459.4, 1127.4], -0.71, -52, 52, -31, 21, 2)) return false; // pitch and track
  if (inRect([-480.8, 1007.6], 0.84, -14, 14, -9, 9, 3)) return false; // pool
  if (inRect([-418.1, 1092.3], 0.86, -18, 18, -9, 9, 2)) return false; // tennis
  if (inRect([-499.4, 1164.5], 0.86, -16, 16, -9, 9, 2)) return false; // basketball
  if (inRect([-480.7, 1099.0], 2.415, -22.3, 22.3, -2.75, 2.75, 3)) return false; // grandstand
  if (inRect([-602.0, 1077.0], 0.833, -3.25, 3.25, -3.25, 3.25, 4)) return false; // pavilion
  if (Math.hypot(x - CIRCLE.c[0], z - CIRCLE.c[1]) < CIRCLE.r + 9) return false;
  if (Math.hypot(x - GATE.c[0], z - GATE.c[1]) < 16) return false;
  const a = axisAt(0), b = axisAt(axLen), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const s = ((x - a[0]) * (b[0] - a[0]) + (z - a[1]) * (b[1] - a[1])) / L, t = Math.abs((x - a[0]) * (b[1] - a[1]) - (z - a[1]) * (b[0] - a[0])) / L;
  if (s > -2 && s < L && t < 6) return false;
  for (let i = 0; i < RING.length; i++) {
    const p = RING[i], q = RING[(i + 1) % RING.length], dx = q[0] - p[0], dz = q[1] - p[1], l2 = dx * dx + dz * dz;
    const k = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / l2));
    if (Math.hypot(x - p[0] - dx * k, z - p[1] - dz * k) < 3.5) return false;
  }
  return true;
}
