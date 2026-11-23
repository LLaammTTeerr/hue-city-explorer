import { KIND, Buf, hex, shade, obb, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { leaves, offStreets, clipTo } from '../enclosure.js';

// ---- Chùa Từ Đàm, 1 Sư Liễu Quán, Huế: the precinct as it stands today (see docs/places/tudam.md) ----
//
// Sources:
//  - OSM way 631871502 (the precinct, amenity=place_of_worship) and its buildings: 631871505 (chánh điện with the
//    two side towers), 631871504 (the two-storey hall on the east of the yard), 631871503 (the quarters behind it),
//    967195652 (tháp Ấn Tôn, man_made=tower, tower:type=pagoda), 1443606690/1443606691 (annexes).
//  - vi.wikipedia.org/wiki/Chùa_Từ_Đàm: tam quan built 1965; Bodhi tree (from Bodh Gaya, planted 1939) on the right
//    of the yard coming in from the gate, the seven-storey Ấn Tôn stupa (about 27 m, a bronze Buddha on each storey)
//    on the left; chánh điện rebuilt 2006-2010, 42 m x 35.9 m, two levels (an assembly hall in the raised basement,
//    the sanctuary above), "trùng thiềm điệp ốc" with three central bays and two wings; bell and drum towers either
//    side; a two-storey hall of ten rooms on the right of the yard.
//  - vietnamplus.vn (2023 photo set): the stupa is octagonal, seven storeys.
//  - Wikimedia Commons photos ("2024 Huế - Tu Dam Temple (Chùa Từ Đàm) - img 01..09", "Chùa Từ Đàm 1..5", "Chùa Từ Đàm ở
//    Huế ngày 20 tháng 8 năm 2017"): the gate is a three-opening concrete tam quan, grey piers edged in ochre, a green
//    name board "CHÙA TỪ ĐÀM", tiled roofs on brackets, black iron leaves; the street wall is cream with grey key-fret
//    panels between pilasters, on a dark stone base; the hall stands on a grey granite podium with a broad stair the
//    width of the front, red-brown columns round a verandah, cream walls, terracotta tiles in two tiers with a band of
//    painted panels between them and white ceramic dragons on the ridges; the stupa is red-brown brick with cream
//    balustrades and brown tiled eaves on every storey, ringed by slender Ashoka trees; the forecourt is red brick.
// Estimated: every height but the stupa's, column spacing, the tower sizes beyond the OSM wings, the gate's widths,
// where the forecourt paving ends, the trees other than the Bodhi tree and the stupa's ring.

export const id = 'tudam';

// the precinct, OSM way 631871502 (model metres)
const SITE = [[-795.1, 1958.7], [-803.1, 1853.6], [-742.9, 1850.0], [-739.8, 1879.9], [-738.3, 1886.7], [-729.7, 1905.3],
  [-713.5, 1901.1], [-710.8, 1903.8], [-710.7, 1931.2], [-713.6, 1936.3], [-784.8, 1965.2], [-790.0, 1964.9], [-793.9, 1962.0]];
const EAST_HALL = [[-759.1, 1892.7], [-740.3, 1936.0], [-725.6, 1929.7], [-744.4, 1886.4]]; // 631871504
const QUARTERS = [[-741.8, 1880.9], [-752.3, 1862.7], [-766.8, 1870.9], [-756.4, 1889.1]]; // 631871503
const ANNEX_N = [[-799.1, 1871.0], [-795.6, 1879.5], [-776.2, 1871.7], [-779.7, 1863.2]]; // 1443606691
const ANNEX_E = [[-729.9, 1907.4], [-727.6, 1916.2], [-712.3, 1912.3], [-714.6, 1903.4]]; // 1443606690
const STUPA = [-784.3, 1947.0]; // centroid of 967195652 (an octagon about 7.6 m across)

// The hall's frame: origin in the hall, u along the facade (east-north-east), v toward the front (south-south-east,
// the street). Read off the OSM outline of 631871505.
const O = [-778, 1900], ANG = Math.atan2(-0.376, 0.927);
const UX = Math.cos(ANG), UZ = Math.sin(ANG);
const P = (u, v) => [O[0] + u * UX - v * UZ, O[1] + u * UZ + v * UX];

const C = {
  granite: hex('#9d9a92'), graniteDark: hex('#7c7a74'), step: hex('#b3afa6'),
  wall: hex('#e6cd84'), wallLight: hex('#efe1b8'), column: hex('#6e2a20'), door: hex('#5a2c1e'),
  tile: hex('#a04f38'), tileDark: hex('#7d3b29'), ceramic: hex('#ebe7dc'), crest: hex('#c9c3b2'), panel: hex('#5e6c68'), panelFrame: hex('#6b3a26'),
  brick: hex('#a45138'), brickDark: hex('#7e3b2a'), rail: hex('#eadbb6'),
  pier: hex('#bdbfba'), ochre: hex('#b9864f'), board: hex('#2f5c4c'), letters: hex('#efe4c2'), iron: hex('#24262a'),
  fenceWall: hex('#ead9a6'), fret: hex('#f2ecdc'), fretCut: hex('#4a4943'), coping: hex('#8a4a36'), base: hex('#a7a59b'),
  pave: hex('#aba69b'), redBrick: hex('#a4533f'), lawn: hex('#5f7f3c'),
  mosaic: hex('#7d9a9c'), bronze: hex('#5b4630'), lantern: hex('#f0dfb0'), rubble: hex('#77776f'), rubble2: hex('#45463f'),
  soffit: hex('#6b3a26'),
  leaf: hex('#4b7631'), leaf2: hex('#5f8a3a'), leafDark: hex('#3c6229'), trunk: hex('#6a5442'), gold: hex('#d9a93a'),
};

function inset(ring, d) {
  // pull a ring in by d (edge by edge, mitred), whichever way it winds
  const n = ring.length;
  let a2 = 0;
  for (let i = 0; i < n; i++) { const p = ring[i], q = ring[(i + 1) % n]; a2 += p[0] * q[1] - q[0] * p[1]; }
  const s = a2 > 0 ? 1 : -1, lines = [];
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (-(b[1] - a[1]) / L) * s, nz = ((b[0] - a[0]) / L) * s; // inward normal
    lines.push([[a[0] + nx * d, a[1] + nz * d], [b[0] + nx * d, b[1] + nz * d]]);
  }
  return lines.map((l, i) => {
    const [p1, p2] = lines[(i + n - 1) % n], [p3, p4] = l;
    const d1 = [p2[0] - p1[0], p2[1] - p1[1]], d2 = [p4[0] - p3[0], p4[1] - p3[1]], den = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(den) < 1e-6) return p3;
    const t = ((p3[0] - p1[0]) * d2[1] - (p3[1] - p1[1]) * d2[0]) / den;
    return [p1[0] + d1[0] * t, p1[1] + d1[1] * t];
  });
}

// hall frame from scene x, z
const UV = (x, z) => [(x - O[0]) * UX + (z - O[1]) * UZ, -(x - O[0]) * UZ + (z - O[1]) * UX];
// The lower court in the south-east corner and the strip along Phan Bội Châu (hall frame). Google Street View from
// Sư Liễu Quán at Phan Bội Châu (2025, car) shows the side gate there opening onto paving barely above the pavement, the
// fret wall on a plinth under 1 m, and a long stair up to the porch at the south end of the east hall; from Phan Bội
// Châu the base is about 1.1 m. The main yard stands about 3 m higher, at the level of Điện Biên Phủ.
const isLow = (x, z) => { const [u, v] = UV(x, z); return (u > 37.6 && v > 0) || (u > 21 && v > 49); };
const SIDE_GATE = [29.4, 56.9]; // the side gate on Sư Liễu Quán, on the east hall's axis (u, v)

export function build({ data, S, group, THREE }) {
  const n0 = S.n;
  // the precinct less the streets OSM draws into it (Điện Biên Phủ runs a few metres inside the mapped west side):
  // the wall stands at the kerb
  const site = offStreets(data, inset(SITE, 1.0));
  // the main yard: one level above its highest ground, on a rubble-stone base about 1.3 m high along Điện Biên Phủ
  // (Google Street View from the street, 2025), more toward Sư Liễu Quán where the ground falls away
  let top = -Infinity;
  for (let x = -803; x <= -710; x += 3) for (let z = 1850; z <= 1966; z += 3) if (inRing(x, z, site) && !isLow(x, z)) top = Math.max(top, rise(x, z));
  for (const p of site) if (!isLow(p[0], p[1])) top = Math.max(top, rise(p[0], p[1]));
  const Y = LAND_Y + top + 1.4;
  // the lower court: a short brick ramp (about 0.6 m) up from the pavement through the side gate
  const sgOut = P(SIDE_GATE[0], SIDE_GATE[1] + 1.3), yStreet = LAND_Y + rise(sgOut[0], sgOut[1]);
  const YL = yStreet + 0.6;
  const yAt = (x, z) => (isLow(x, z) ? YL : Y);
  const low = LAND_Y + Math.min(...site.map((p) => rise(p[0], p[1]))) - 0.4;
  S.base = Y - LAND_Y;
  const lamps = [], lampCol = [];
  const lamp = (x, y, z, c = [1, 0.84, 0.55]) => { lamps.push(x, y, z); lampCol.push(...c); };
  const L = new Buf(512); // warm night strips

  // ---------------- the yard: two terraces on a rubble base, grey paving, the red-brick forecourt, lawns ----------------
  const paved0 = S.n;
  const quad = (u0, u1, v0, v1) => [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
  S.kind = KIND.PLAIN;
  for (const [q, y] of [[quad(-90, 21, -90, 90), Y], [quad(21, 90, -90, 0), Y], [quad(21, 37.6, 0, 49), Y], [quad(37.6, 90, 0, 90), YL], [quad(21, 37.6, 49, 90), YL]]) {
    const r = clipTo(q, site);
    if (r) S.prism(r, low, y, C.base, C.pave, { topKind: KIND.ROAD });
  }
  rubble(S, site, yAt);
  // red-brick forecourt from the hall's stair to the gate
  S.prism(quad(-14, 12, 19.4, 55.6), Y, Y + 0.03, C.redBrick, C.redBrick, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([paved0, S.n]); // paving: no trees, no houses (src/geo/city.js coverOf)
  // the upper yard's edge over the lower court: a cream retaining wall with a balustrade
  for (const [a, b] of [[[21, 49.1], [26.7, 49.1]], [[32.1, 49.1], [37.6, 49.1]], [[21.1, 49.1], [21.1, 56.5]]]) {
    const p = P(...a), q = P(...b), m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    S.box(m[0], m[1], YL - 0.05, Y + 0.05, Math.hypot(q[0] - p[0], q[1] - p[1]), 0.3, ang, C.wallLight);
    S.beam([p[0], Y + 0.45, p[1]], [q[0], Y + 0.45, q[1]], 0.14, 0.8, C.rail);
    S.beam([p[0], Y + 0.88, p[1]], [q[0], Y + 0.88, q[1]], 0.24, 0.08, C.coping);
  }
  // lawns: round the stupa, along the west wall, and the bed under the Bodhi tree
  for (const q of [quad(-33, -16, 30, 55), quad(-30, -16, -30, 14), quad(13, 19.5, 30, 50)]) {
    const bed = clipTo(q, site); // inside the precinct wall (its west side is not square to the hall)
    if (bed) S.prism(bed, Y, Y + 0.06, C.lawn, C.lawn, { topKind: KIND.GROUND });
  }

  // ---------------- chánh điện: podium, three roofs one behind the other, side towers ----------------
  const cu = -1.25, PW = 24.1, PH = 1.9; // podium centre along u, width, height
  const v0 = -18.9, v1 = 15.5; // podium back and front
  S.kind = KIND.MASONRY;
  {
    const c = P(cu, (v0 + v1) / 2);
    S.box(c[0], c[1], Y - 0.1, Y + PH, PW, v1 - v0, ANG, C.granite, { top: C.step, topKind: KIND.ROAD });
    S.box(c[0], c[1], Y - 0.1, Y + 0.35, PW + 0.2, v1 - v0 + 0.2, ANG, C.graniteDark);
  }
  // the front stair, all but the width of the podium: ten steps up to the verandah, a red runner up the middle
  {
    const n = 10, sh = PH / n, tread = 0.4, sw = 20;
    for (let k = 1; k <= n; k++) {
      const q = P(cu, v1 + tread * (n - k + 0.5));
      S.box(q[0], q[1], Y - 0.1, Y + sh * k, sw, tread, ANG, C.step, { topKind: KIND.ROAD });
    }
    const r0 = P(cu, v1 + 0.1), r1 = P(cu, v1 + tread * n);
    S.kind = KIND.PLAIN;
    S.beam([r0[0], Y + PH + 0.02, r0[1]], [r1[0], Y + 0.06, r1[1]], 3.2, 0.04, hex('#a3262a'));
    for (const s of [-1, 1]) { // stone cheeks with a white dragon each
      const a = P(cu + s * (sw / 2 + 0.3), v1 - 0.2), b = P(cu + s * (sw / 2 + 0.3), v1 + tread * n);
      S.beam([a[0], Y + PH + 0.4, a[1]], [b[0], Y + 0.45, b[1]], 0.6, 0.9, C.granite);
      S.beam([a[0], Y + PH + 0.95, a[1]], [b[0], Y + 0.95, b[1]], 0.3, 0.3, C.ceramic);
    }
  }
  S.kind = KIND.PLAIN;
  for (const [a, b] of [[[cu - PW / 2 + 0.2, v1], [cu - PW / 2 + 0.2, v0 + 0.2]], [[cu - PW / 2 + 0.2, v0 + 0.2], [cu + PW / 2 - 0.2, v0 + 0.2]], [[cu + PW / 2 - 0.2, v0 + 0.2], [cu + PW / 2 - 0.2, v1]]]) {
    const p = P(...a), q = P(...b);
    S.beam([p[0], Y + PH + 0.42, p[1]], [q[0], Y + PH + 0.42, q[1]], 0.16, 0.84, C.rail);
  }
  const yF = Y + PH;
  // Three transverse roofs, as the satellite shows them: the rear hall, the tall chánh điện in the middle and a shallow
  // tiền đường in front whose ridge runs on the line of the two towers. Street View from Điện Biên Phủ (two car
  // panoramas) puts the big pediment with the standing figure over the middle of the podium (v about 0) and the
  // front crest at v about 11.5.
  hall(S, P(cu, -12.6), 22.6, 11.0, yF, { wallH: 4.8, rLow: 3.0, clere: 2.4, rTop: 3.0, doors: 'back', ped: 1, lamp, L });
  hall(S, P(cu, 0), 22.6, 12.0, yF, { wallH: 5.2, rLow: 3.2, clere: 2.8, rTop: 3.4, doors: 'none', ped: 2, lamp, L });
  hall(S, P(cu, 11.25), 22.6, 7.5, yF, { wallH: 4.5, rLow: 2.4, clere: 2.2, rTop: 2.4, doors: 'front', ped: 1, lamp, L });
  // the Buddhist flags hung from the front columns (yard panorama)
  for (const u of [-8.5, -3.6, 3.6, 8.5]) {
    const a = P(cu + u, 15.0), b = P(cu + u, 16.2);
    S.beam([a[0], yF + 2.6, a[1]], [b[0], yF + 4.0, b[1]], 0.05, 0.05, C.trunk);
    const cols = [hex('#2a4fa0'), hex('#e0b52c'), hex('#b8322a'), hex('#f1ece0'), hex('#dc7a2a')];
    cols.forEach((col, i) => { const f = P(cu + u - 0.28 + i * 0.14, 16.0); S.box(f[0], f[1], yF + 2.6, yF + 3.85, 0.14, 0.03, ANG, col); });
  }

  // lầu chuông (east, the Buddha's left) and lầu trống (west): the two wings at the front corners in OSM, low against
  // the hall (from the yard their tops sit under the front hall's upper eave)
  for (const u of [13.6, -15.4]) tower(S, u, 13.8, Y, yF);

  // ---------------- tháp Ấn Tôn: octagonal, seven storeys, about 27 m ----------------
  stupa(S, STUPA[0], STUPA[1], Y, lamp);

  // ---------------- the Bodhi tree, and the other trees of the yard ----------------
  tree(S, ...P(15.5, 42), Y, 15, 5.5, 5, [C.leaf, C.leafDark, C.leaf2]); // cây bồ đề, planted 1939: a tall trunk, a high crown
  // slender Ashoka trees in ring planters along the east hall (yard panorama)
  for (const v of [8, 16, 24, 32]) ashoka(S, ...P(17.6, v), Y, 7.5);
  // Ashoka trees ringing the stupa
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.3;
    if (Math.abs(Math.sin(a - ANG) - 1) < 0.3) continue; // leave the path from the yard open
    ashoka(S, STUPA[0] + Math.cos(a) * 7.2, STUPA[1] + Math.sin(a) * 7.2, Y, 9, false);
  }
  // frangipani and round shade trees along the west wall (on Điện Biên Phủ) and by the gate
  for (const [u, v, h, r] of [[-24, -22, 6.5, 3.6], [-26, -8, 7, 3.8], [-24, 6, 6.5, 3.6], [-30, 24, 7.5, 4], [-12, 52, 5.5, 3], [9, 52, 5.5, 3], [-18, -36, 8, 4.5]]) {
    const q = P(u, v);
    if (inRing(q[0], q[1], site)) tree(S, q[0], q[1], Y, h, r, 3, [C.leaf2, C.leaf, C.leafDark]);
  }
  // potted bonsai along the foot of the stair, and the bronze incense urn on the axis
  S.kind = KIND.PLAIN;
  for (let u = -11; u <= 11; u += 4.4) { const q = P(cu + u, 20.4); S.cyl(q[0], q[1], Y, Y + 0.6, 0.35, 0.45, 6, hex('#7b5a46')); S.cyl(q[0], q[1], Y + 0.6, Y + 1.5, 0.55, 0.15, 6, C.leaf); }
  {
    const q = P(cu + 3, 26);
    S.cyl(q[0], q[1], Y, Y + 0.45, 0.35, 0.3, 8, C.granite);
    S.cyl(q[0], q[1], Y + 0.45, Y + 0.95, 0.42, 0.6, 8, C.bronze);
    S.cyl(q[0], q[1], Y + 0.95, Y + 1.05, 0.62, 0.62, 8, C.bronze);
  }

  // ---------------- the hall on the east of the yard, its porch and side gate, the buildings behind ----------------
  const g = gallery(S, EAST_HALL, Y, YL, lamp);
  porch(S, YL, g, lamp);
  sideGate(S, YL, yStreet, lamp);
  block(S, QUARTERS, Y, 2, 3.2);
  block(S, ANNEX_N, Y, 2, 3.4);
  annex(S, ANNEX_E, YL);

  // ---------------- the tam quan (1965) on Sư Liễu Quán, on the hall's axis ----------------
  const gv = 56.9; // the front of the yard
  gate(S, cu, gv, Y, lamp, L);
  // steps down from the gate to the pavement
  {
    const gy = rise(...P(cu, gv + 3.5)) + LAND_Y, drop = Y - gy;
    if (drop > 0.12) {
      const n = Math.max(1, Math.ceil(drop / 0.18)), sh = drop / n, tr = Math.min(0.34, 4.0 / n); // kept off the street
      S.kind = KIND.MASONRY;
      for (let k = 0; k < n; k++) { const q = P(cu, gv + 0.35 + tr * (k + 0.5)); S.box(q[0], q[1], gy - 0.2, Y - sh * (k + 1) + sh, 12.4, tr, ANG, C.step, { topKind: KIND.ROAD }); }
    }
  }

  // ---------------- the wall round the precinct ----------------
  wall(S, site, yAt, [[P(cu - 6.6, gv), P(cu + 6.6, gv)], [P(SIDE_GATE[0] - 2.75, SIDE_GATE[1]), P(SIDE_GATE[0] + 2.75, SIDE_GATE[1])]], lamp);

  // ---------------- night ----------------
  if (lamps.length) {
    const pts = glowPoints(lamps, lampCol, 4.5);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
  if (L.n) {
    const m = new THREE.Mesh(L.geometry(), lightMaterial(0xffc879, 1.1));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
  }
  if (S.n - n0 > 3 * 40000) console.warn('tudam: heavy model', (S.n - n0) / 3);
  S.kind = KIND.PLAIN;
  S.base = 0;
}

// the modest Huế eave: a slight lift at the corners, no long horns (Street View: the real eaves are barely curved)
const EAVE = { flare: 0.22, fascia: 0.3, fasciaCol: null, ridgeCol: null, hips: true, segs: 2, horns: false };

// A hall of the trùng thiềm điệp ốc kind: a closed plastered core inside a verandah of red-brown columns, a lower roof
// all round, a clerestory band of painted panels, and the upper roof with a ceramic crest along the ridge and a tall
// pale pediment (ceramic and mosaic, dragons on it) standing at each end of the ridge.
// c: centre, w along u (the facade) and d along v at the column line, y0: floor. ped: 1 a pediment, 2 the big one with
// the standing figure.
function hall(S, c, w, d, y0, { wallH, rLow, clere, rTop, doors, ped, lamp, L }) {
  const [cx, cz] = c;
  const Q = (u, v) => [cx + u * UX - v * UZ, cz + u * UZ + v * UX];
  const cw = w - 4.6, cd = d - 4.2; // the core
  S.kind = KIND.PLAIN;
  S.box(cx, cz, y0, y0 + wallH, cw, cd, ANG, C.wall, { top: C.tileDark });
  const front = doors === 'front';
  if (doors !== 'none') {
    const bays = front ? 7 : 3;
    for (let i = 0; i < bays; i++) {
      const u = -cw / 2 + (cw * (i + 0.5)) / bays, sg = front ? 1 : -1;
      const q = Q(u, sg * (cd / 2 + 0.03));
      S.box(q[0], q[1], y0, y0 + 3.4, Math.min(2.0, cw / bays - 0.6), 0.08, ANG, C.door);
      const t = Q(u, sg * (cd / 2 + 0.05));
      S.box(t[0], t[1], y0 + 3.7, y0 + Math.min(4.5, wallH - 0.2), Math.min(2.0, cw / bays - 0.6), 0.06, ANG, C.panel);
      if (front) lamp(t[0], y0 + 2.2, t[1], [1, 0.78, 0.45]);
    }
  }
  // side windows: lattice in a dark frame
  const nw = Math.max(1, Math.round(cd / 2.6));
  for (const sg of [-1, 1]) for (let i = 0; i < nw; i++) {
    const q = Q(sg * (cw / 2 + 0.03), -cd / 2 + (cd * (i + 0.5)) / nw);
    S.box(q[0], q[1], y0 + 1.0, y0 + 3.4, 0.08, 1.5, ANG, C.door);
  }
  // the verandah: ceiling, columns on stone bases, the beam along their heads
  const lid = y0 + wallH;
  S.box(cx, cz, lid - 0.25, lid, w, d, ANG, shade(C.column, 0.8), { top: C.tileDark, bottom: true });
  const nu = Math.round(w / 3.2), nv = Math.max(1, Math.round(d / 3.4)), posts = [];
  for (let i = 0; i <= nu; i++) for (const sg of [-1, 1]) posts.push([-w / 2 + (w * i) / nu, (sg * d) / 2]);
  for (let i = 1; i < nv; i++) for (const sg of [-1, 1]) posts.push([(sg * w) / 2, -d / 2 + (d * i) / nv]);
  for (const [u, v] of posts) {
    const q = Q(u, v);
    S.cyl(q[0], q[1], y0, y0 + 0.3, 0.42, 0.36, 6, C.granite, { cap: false, rot: ANG });
    S.cyl(q[0], q[1], y0 + 0.3, lid - 0.2, 0.25, 0.23, 6, C.column, { cap: false, rot: ANG });
  }
  const K = [Q(-w / 2, -d / 2), Q(w / 2, -d / 2), Q(w / 2, d / 2), Q(-w / 2, d / 2)];
  for (let i = 0; i < 4; i++) { const a = K[i], b = K[(i + 1) % 4]; S.beam([a[0], lid - 0.35, a[1]], [b[0], lid - 0.35, b[1]], 0.3, 0.4, C.column); }
  if (front) { const a = Q(-w / 2, d / 2 + 0.05), b = Q(w / 2, d / 2 + 0.05); S.beam([a[0], lid - 0.75, a[1]], [b[0], lid - 0.75, b[1]], 0.06, 0.35, C.gold); }
  // roofs
  S.hip(cx, cz, w, d, ANG, lid, rLow, C.tile, { ...EAVE, over: 1.3, fasciaCol: C.tileDark });
  const w2 = w * 0.74, d2 = d * 0.56, y2 = lid + rLow * 0.45;
  S.kind = KIND.PLAIN;
  S.box(cx, cz, y2, y2 + clere, w2, d2, ANG, C.wallLight);
  for (const sg of [-1, 1]) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const q = Q(-w2 / 2 + (w2 * (i + 0.5)) / n, sg * (d2 / 2 + 0.03));
      S.box(q[0], q[1], y2 + 0.35, y2 + clere - 0.3, w2 / n - 0.5, 0.06, ANG, C.panel);
    }
    const q = Q(sg * (w2 / 2 + 0.03), 0);
    S.box(q[0], q[1], y2 + 0.35, y2 + clere - 0.3, 0.06, d2 - 1.0, ANG, C.panel);
    const a = Q(-w2 / 2, sg * (d2 / 2 + 0.02)), b = Q(w2 / 2, sg * (d2 / 2 + 0.02));
    S.beam([a[0], y2 + 0.18, a[1]], [b[0], y2 + 0.18, b[1]], 0.08, 0.3, C.panelFrame);
    S.beam([a[0], y2 + clere - 0.12, a[1]], [b[0], y2 + clere - 0.12, b[1]], 0.08, 0.24, C.panelFrame);
  }
  const y3 = y2 + clere;
  S.hip(cx, cz, w2, d2, ANG, y3, rTop, C.tile, { ...EAVE, over: 1.2, fasciaCol: C.tileDark, ridgeCol: C.crest });
  S.kind = KIND.PLAIN;
  const ry = y3 + rTop + 0.25, hd = (d2 + 2.4) / 2, hr = Math.max(0, (w2 + 2.4) / 2 - hd * 0.92);
  // the crest along the ridge: moulded panels in grey-white mortar and ceramic
  S.box(cx, cz, ry - 0.3, ry + 0.45, 2 * hr, 0.4, ANG, C.crest, { top: C.ceramic });
  for (let i = -2; i <= 2; i++) {
    const q = Q((i * hr) / 3, 0);
    S.box(q[0], q[1], ry - 0.15, ry + 0.3, Math.min(2.2, hr / 2), 0.46, ANG, C.mosaic);
  }
  // the end pediments: their foot buried in the hip slopes
  const big = ped === 2, k = rTop / hd, pu = hr + (big ? 1.2 : 0.6), wb = big ? 5.0 : Math.min(3.4, d2 * 0.75);
  const yb = ry - 0.25 - Math.max(pu - hr, wb / 2) * k - 0.4, ph = ry + (big ? 2.4 : 1.3) - yb;
  for (const sg of [-1, 1]) pediment(S, Q, sg * pu, sg, yb, wb, ph, big);
  if (front) {
    // the dharma wheel between two dragons in the middle of the ridge
    const m = Q(0, 0);
    S.cyl(m[0], m[1], ry, ry + 0.5, 0.5, 0.3, 6, C.ceramic);
    S.box(m[0], m[1], ry + 0.5, ry + 1.7, 1.2, 0.15, ANG, C.ceramic);
    S.box(m[0], m[1], ry + 0.85, ry + 1.35, 0.6, 0.18, ANG, C.gold);
    for (const sg of [-1, 1]) {
      const a = Q(sg * 0.9, 0), b = Q(sg * 3.2, 0);
      S.beam([a[0], ry + 0.6, a[1]], [b[0], ry + 0.25, b[1]], 0.3, 0.45, C.ceramic);
    }
    const a = Q(-w / 2 - 0.8, d / 2 + 1.0), b = Q(w / 2 + 0.8, d / 2 + 1.0);
    L.beam([a[0], lid - 0.15, a[1]], [b[0], lid - 0.15, b[1]], 0.12, 0.1, [1, 1, 1]);
  }
}

// a tall pale pediment across the end of a ridge, stepping in toward the top, a mosaic panel on its outer face, a
// ceramic dragon rearing at each shoulder and on the big one a standing figure
function pediment(S, Q, u, sg, yb, wb, h, big) {
  const n = 4;
  for (let k = 0; k < n; k++) {
    const q = Q(u, 0), wk = wb * (1 - (k / n) * 0.5);
    S.box(q[0], q[1], yb + (h * k) / n, yb + (h * (k + 1)) / n + 0.02, 0.42, wk, ANG, k === n - 1 ? C.ceramic : C.crest, { top: C.ceramic });
  }
  const f = Q(u + sg * 0.23, 0);
  S.box(f[0], f[1], yb + h * 0.45, yb + h * 0.86, 0.05, wb * 0.5, ANG, C.mosaic);
  for (const s of [-1, 1]) {
    const a = Q(u, s * wb * 0.2), b = Q(u, s * wb * 0.36);
    S.beam([a[0], yb + h, a[1]], [b[0], yb + h + (big ? 0.8 : 0.6), b[1]], 0.26, 0.36, C.ceramic);
  }
  const t = Q(u, 0);
  if (big) {
    S.cyl(t[0], t[1], yb + h, yb + h + 0.95, 0.3, 0.18, 6, C.ceramic);
    S.cyl(t[0], t[1], yb + h + 0.95, yb + h + 1.3, 0.17, 0.1, 6, C.ceramic);
  } else S.cyl(t[0], t[1], yb + h, yb + h + 0.5, 0.25, 0.08, 6, C.ceramic);
}

// a bell or drum tower: a plastered lower storey with a lattice window in each face, a low upper storey of panels,
// two modest tiled roofs and a gourd
function tower(S, u, v, Y, yF) {
  const c = P(u, v);
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], Y - 0.1, yF, 5.4, 5.4, ANG, C.granite, { top: C.step, topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  const s1 = 4.4, y1 = yF + 3.4, s2 = 3.0, y3 = y1 + 2.0;
  S.box(c[0], c[1], yF, y1, s1, s1, ANG, C.wall, { top: C.tileDark });
  for (const [du, dv, a] of [[0, s1 / 2 + 0.03, ANG], [0, -s1 / 2 - 0.03, ANG], [s1 / 2 + 0.03, 0, ANG + Math.PI / 2], [-s1 / 2 - 0.03, 0, ANG + Math.PI / 2]]) {
    const w = P(u + du, v + dv);
    S.box(w[0], w[1], yF + 0.8, yF + 2.9, 1.6, 0.06, a, C.panelFrame);
    const g = P(u + du * 1.01, v + dv * 1.01);
    S.box(g[0], g[1], yF + 0.95, yF + 2.75, 1.3, 0.06, a, C.panel);
  }
  S.hip(c[0], c[1], s1, s1, ANG, y1, 1.2, C.tile, { ...EAVE, over: 0.8, fascia: 0.22, fasciaCol: C.tileDark, ridgeCol: C.crest });
  S.kind = KIND.PLAIN;
  S.box(c[0], c[1], y1 + 0.3, y3, s2, s2, ANG, C.wallLight, { top: C.tileDark });
  for (const [du, dv, a] of [[0, s2 / 2 + 0.03, ANG], [0, -s2 / 2 - 0.03, ANG], [s2 / 2 + 0.03, 0, ANG + Math.PI / 2], [-s2 / 2 - 0.03, 0, ANG + Math.PI / 2]]) {
    const w = P(u + du, v + dv);
    S.box(w[0], w[1], y1 + 0.9, y3 - 0.25, 1.8, 0.06, a, C.panel);
  }
  S.hip(c[0], c[1], s2, s2, ANG, y3, 1.5, C.tile, { ...EAVE, over: 0.8, fascia: 0.2, fasciaCol: C.tileDark, ridgeCol: C.crest });
  S.kind = KIND.PLAIN;
  const t = y3 + 1.5;
  S.cyl(c[0], c[1], t - 0.1, t + 0.35, 0.28, 0.12, 6, C.ceramic);
  S.cyl(c[0], c[1], t + 0.35, t + 0.6, 0.14, 0.04, 6, C.ceramic);
}

// an Ashoka tree (Polyalthia longifolia): a slim column of drooping leaves, in a ring planter when it stands in the yard
function ashoka(S, x, z, y0, h, planter = true) {
  S.kind = KIND.PLAIN;
  if (planter) {
    S.cyl(x, z, y0, y0 + 0.3, 1.1, 1.1, 10, C.granite);
    S.cyl(x, z, y0 + 0.3, y0 + 0.5, 1.0, 0.95, 10, C.leafDark);
  }
  S.cyl(x, z, y0, y0 + h * 0.2, 0.12, 0.1, 5, C.trunk, { cap: false });
  S.cyl(x, z, y0 + h * 0.15, y0 + h * 0.6, 0.55, 0.85, 7, C.leafDark, { cap: false });
  S.cyl(x, z, y0 + h * 0.6, y0 + h, 0.85, 0.06, 7, C.leaf);
}

// tháp Ấn Tôn: an octagonal brick tower of seven storeys stepping in, a tiled eave and a cream balustrade on each
function stupa(S, x, z, y0, lamp) {
  const oct = (r, rot = Math.PI / 8 + ANG) => Array.from({ length: 8 }, (_, i) => [x + Math.cos(rot + (i * Math.PI) / 4) * r, z + Math.sin(rot + (i * Math.PI) / 4) * r]);
  S.kind = KIND.MASONRY;
  S.prism(oct(5.4), y0, y0 + 0.35, C.granite, C.step, { topKind: KIND.ROAD });
  S.prism(oct(4.5), y0 + 0.35, y0 + 0.9, C.step, C.step, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  S.prism(oct(5.25), y0 + 0.35, y0 + 1.0, C.rail, C.rail, { holes: [oct(5.05)] });
  let y = y0 + 0.9;
  const R = (i) => 3.8 - i * 0.27, H = (i) => 3.2 - i * 0.1;
  for (let i = 0; i < 7; i++) {
    const r = R(i), h = H(i);
    S.kind = KIND.MASONRY;
    S.prism(oct(r), y, y + h, C.brick, C.brick, { top: false });
    // a pilaster at each corner and an arched opening on each face
    S.kind = KIND.PLAIN;
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + ANG + (k * Math.PI) / 4, ac = a + Math.PI / 8, rf = r * Math.cos(Math.PI / 8);
      const px = x + Math.cos(a) * (r + 0.02), pz = z + Math.sin(a) * (r + 0.02);
      S.box(px, pz, y, y + h, 0.3, 0.3, a, C.brickDark);
      const fx = x + Math.cos(ac) * (rf + 0.03), fz = z + Math.sin(ac) * (rf + 0.03);
      S.box(fx, fz, y + 0.5, y + h * 0.72, r * 0.32, 0.06, ac + Math.PI / 2, k % 2 ? C.brickDark : hex('#3b2a22'));
    }
    // the eave: a flared tiled skirt, then the balcony floor and balustrade of the storey above
    const ye = y + h;
    S.kind = KIND.TILE;
    S.prism(oct(r + 1.15), ye - 0.12, ye + 0.5, C.tileDark, C.tile, { scaleTop: (r + 0.35) / (r + 1.15), centre: [x, z], top: false });
    S.kind = KIND.PLAIN;
    S.prism(oct(r + 1.15), ye - 0.3, ye - 0.12, C.rail, C.rail, { top: false });
    for (let k = 0; k < 8; k += 2) { const a = Math.PI / 8 + ANG + (k * Math.PI) / 4; lamp(x + Math.cos(a) * (r + 1.2), ye - 0.2, z + Math.sin(a) * (r + 1.2), [1, 0.86, 0.6]); }
    y = ye + 0.5;
    if (i < 6) {
      const rn = R(i + 1);
      S.prism(oct(rn + 0.55), y - 0.05, y + 0.08, C.rail, C.rail);
      S.prism(oct(rn + 0.55), y + 0.08, y + 0.75, C.rail, C.rail, { holes: [oct(rn + 0.42)], top: true });
    }
  }
  // the top: an octagonal tiled cap, a lotus drum and the spire
  const rt = R(6);
  S.kind = KIND.TILE;
  S.prism(oct(rt + 0.6), y - 0.1, y + 1.4, C.tile, C.tile, { scaleTop: 0.12, centre: [x, z] });
  S.kind = KIND.PLAIN;
  y += 1.3;
  S.cyl(x, z, y, y + 0.5, 0.55, 0.45, 8, C.rail);
  S.cyl(x, z, y + 0.5, y + 1.1, 0.45, 0.6, 8, C.gold);
  S.cyl(x, z, y + 1.1, y + 3.4, 0.22, 0.04, 6, C.gold);
  for (let k = 0; k < 4; k++) S.cyl(x, z, y + 1.4 + k * 0.42, y + 1.55 + k * 0.42, 0.34 - k * 0.05, 0.34 - k * 0.05, 6, C.gold);
}

// a broad-leaved tree: a trunk and a few overlapping crowns
function tree(S, x, z, y0, h, r, lumps, cols) {
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y0, y0 + h * 0.45, r * 0.09, r * 0.07, 6, C.trunk, { cap: false });
  const seed = Math.abs(Math.sin(x * 12.9898 + z * 78.233)) * 43758.5;
  for (let k = 0; k < lumps; k++) {
    const a = ((seed + k * 2.39996) % 6.283), d = k === 0 ? 0 : r * 0.45;
    const lx = x + Math.cos(a) * d, lz = z + Math.sin(a) * d, lr = r * (k === 0 ? 0.8 : 0.6), yb = y0 + h * (k === 0 ? 0.42 : 0.36), yt = y0 + h * (k === 0 ? 1 : 0.85);
    const ym = yb + (yt - yb) * 0.45, col = cols[k % cols.length];
    S.cyl(lx, lz, yb, ym, lr * 0.55, lr, 8, shade(col, 0.85), { cap: false, rot: a });
    S.cyl(lx, lz, ym, yt, lr, lr * 0.25, 8, col, { rot: a });
  }
}

// the tam quan: three openings between four grey piers edged in ochre, the middle one higher under the name board,
// each under its own tiled roof on brackets, black iron leaves
function gate(S, cu, v, y0, lamp, L) {
  const piers = [[-6.2, 0.8, 4.6], [-2.65, 0.95, 6.4], [2.65, 0.95, 6.4], [6.2, 0.8, 4.6]]; // u, width, height
  for (const [u, pw, ph] of piers) {
    const q = P(cu + u, v);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], y0, y0 + ph, pw, 1.1, ANG, C.pier, { top: C.pier });
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) { const e = P(cu + u + s * (pw / 2 - 0.08), v + 0.56); S.box(e[0], e[1], y0, y0 + ph, 0.16, 0.04, ANG, C.ochre); }
    S.box(q[0], q[1], y0, y0 + 0.45, pw + 0.15, 1.25, ANG, C.ochre);
  }
  S.kind = KIND.PLAIN;
  // lintels: the high middle one carries the name board, the side ones are lower
  const mid = P(cu, v);
  S.box(mid[0], mid[1], y0 + 5.0, y0 + 6.4, 6.2, 0.8, ANG, C.pier);
  for (const sg of [-1, 1]) {
    const b = P(cu, v + sg * 0.42);
    S.box(b[0], b[1], y0 + 5.15, y0 + 6.15, 4.2, 0.05, ANG, C.board);
    const t = P(cu, v + sg * 0.45);
    S.box(t[0], t[1], y0 + 5.5, y0 + 5.8, 3.2, 0.03, ANG, C.letters);
  }
  for (const sg of [-1, 1]) {
    const s = P(cu + sg * 4.42, v);
    S.box(s[0], s[1], y0 + 3.4, y0 + 4.6, 2.75, 0.75, ANG, C.pier);
    for (const fs of [-1, 1]) { const f = P(cu + sg * 4.42, v + fs * 0.39); S.box(f[0], f[1], y0 + 3.6, y0 + 4.4, 1.6, 0.04, ANG, C.fret); }
  }
  // roofs on brackets: the middle one over the board, a lower one over each side opening
  S.kind = KIND.TIMBER;
  const eave = { fascia: 0.18, fasciaCol: C.tileDark, ridgeCol: C.ceramic, hips: true, segs: 3 };
  S.hip(mid[0], mid[1], 6.6, 1.6, ANG, y0 + 6.4, 1.0, C.tile, { flare: 0.3, over: 0.7, ...eave });
  for (const sg of [-1, 1]) {
    const s = P(cu + sg * 4.6, v);
    S.hip(s[0], s[1], 3.6, 1.4, ANG, y0 + 4.6, 0.8, C.tile, { flare: 0.25, over: 0.6, ...eave });
  }
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) for (const u of [-2.6, -1.3, 0, 1.3, 2.6]) { // brackets under the middle eave
    const a = P(cu + u, v + sg * 0.4), b = P(cu + u, v + sg * 1.1);
    S.beam([a[0], y0 + 6.0, a[1]], [b[0], y0 + 6.42, b[1]], 0.14, 0.16, C.tileDark);
  }
  const top = P(cu, v);
  S.box(top[0], top[1], y0 + 7.4, y0 + 8.2, 0.7, 0.12, ANG, C.ceramic); // the jewel on the middle ridge
  // the iron leaves, closed
  leaves(S, P(cu - 2.17, v), P(cu + 2.17, v), y0, 3.4, C.iron);
  for (const sg of [-1, 1]) leaves(S, P(cu + sg * 3.13, v), P(cu + sg * 5.8, v), y0, 2.6, C.iron);
  for (const [u] of piers) { const q = P(cu + u, v + 0.7); lamp(q[0], y0 + 4.2, q[1], [1, 0.82, 0.5]); }
  const a = P(cu - 2.1, v + 0.5), b = P(cu + 2.1, v + 0.5);
  L.beam([a[0], y0 + 5.05, a[1]], [b[0], y0 + 5.05, b[1]], 0.1, 0.08, [1, 1, 1]);
}


// the rubble-stone face of the yard's base: rows of rough grey stones on the outside of the precinct, from the
// pavement up to the yard (or the lower court) where the wall stands on it
function rubble(S, ring, yAt) {
  let a2 = 0;
  for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; a2 += p[0] * q[1] - q[0] * p[1]; }
  const s = a2 > 0 ? -1 : 1; // outward
  const hash = (i, j) => { const t = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return t - Math.floor(t); };
  S.kind = KIND.PLAIN;
  let k = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.5) continue;
    const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, nx = -dz * s, nz = dx * s, hint = [nx, 0, nz];
    const A = (t, y) => [a[0] + dx * t + nx * 0.03, y, a[1] + dz * t + nz * 0.03];
    const at = (t) => { const x = a[0] + dx * t, z = a[1] + dz * t; return [LAND_Y + rise(x, z) - 0.1, yAt(x - nx * 0.6, z - nz * 0.6) - 0.02]; };
    let lo = Infinity, hi = -Infinity;
    for (let t = 0; t <= len; t += 1) { const [g, y] = at(t); lo = Math.min(lo, g); hi = Math.max(hi, y); }
    const rh = 0.36;
    for (let r = 0; lo + r * rh < hi; r++, k++) {
      // rough stones of uneven length in each course, the mortar of the base showing between them
      for (let t = 0, m = 0; t < len; m++) {
        const sl = 0.3 + hash(k, m) * 0.55, t1 = Math.min(len, t + sl), [g, y] = at((t + t1) / 2);
        const y0 = Math.max(g, lo + r * rh + 0.03 + hash(m, k) * 0.09), y1 = Math.min(y, lo + (r + 1) * rh - 0.03 - hash(k + 3, m) * 0.09);
        if (t1 - t > 0.14 && y1 - y0 > 0.08) {
          const h = hash(k * 5 + 1, m), col = shade(h > 0.55 ? C.rubble2 : C.rubble, 0.7 + hash(m * 3, k) * 0.6);
          const e0 = 0.04 + hash(m, k + 9) * 0.05, e1 = 0.04 + hash(m + 9, k) * 0.05;
          S.quad(A(t + e0, y0), A(t1 - e1, y0 + (hash(k, m + 5) - 0.5) * 0.06), A(t1 - e1 * 0.5, y1), A(t + e0 * 0.5, y1 + (hash(k + 5, m) - 0.5) * 0.06), col, hint);
        }
        t = t1;
      }
    }
  }
}

// the two-storey hall of ten rooms on the east of the yard (OSM 631871504): a closed plastered block on a plinth,
// doors with transoms on the ground floor and windows above, a first-floor balcony on the yard side under a tiled pent
// eave, a modest hip roof. Its back stands on the lower strip along Phan Bội Châu, so the plinth runs down to it.
function gallery(S, ring, Y, YL, lamp) {
  const uv = ring.map((p) => UV(p[0], p[1]));
  const u0 = Math.min(...uv.map((q) => q[0])), u1 = Math.max(...uv.map((q) => q[0]));
  const v0 = Math.min(...uv.map((q) => q[1])), v1 = Math.max(...uv.map((q) => q[1]));
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, w = u1 - u0, d = v1 - v0, c = P(cu, cv);
  const pl = 0.5, h1 = 3.8, h2 = 3.6, floor = Y + pl, yS = floor + h1, yE = yS + h2, bal = 1.7;
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], YL - 0.1, floor, w, d, ANG, C.granite, { top: C.step, topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  const cw = cu + bal / 2, fu = u0 + bal; // the core's centre along u and its yard face
  S.box(...P(cw, cv), floor, yE, w - bal, d, ANG, C.wall, { top: C.tileDark });
  const n = 10;
  for (let i = 0; i < n; i++) {
    const v = v0 + 0.6 + ((d - 1.2) * (i + 0.5)) / n;
    const q = P(fu - 0.03, v);
    S.box(q[0], q[1], floor, floor + 2.5, 0.06, 1.3, ANG, C.door); // door
    S.box(q[0], q[1], floor + 2.7, floor + 3.3, 0.06, 1.3, ANG, C.panel); // transom
    S.box(q[0], q[1], yS + 0.5, yS + 2.8, 0.06, 1.2, ANG, C.door); // upper door to the balcony
    const b = P(u1 + 0.03, v);
    for (const yb of [floor + 1.0, yS + 0.9]) S.box(b[0], b[1], yb, yb + 1.5, 0.06, 1.2, ANG, C.door);
    if (i % 3 === 1) { const l = P(fu - 0.6, v); lamp(l[0], yS - 0.4, l[1], [1, 0.8, 0.5]); }
  }
  for (const sv of [-1, 1]) for (const du of [-4, 0, 4]) { // the ends
    const q = P(cw + du * (w - bal) / 12, cv + sv * (d / 2 + 0.03));
    for (const yb of [floor + 1.0, yS + 0.9]) S.box(q[0], q[1], yb, yb + 1.5, 1.2, 0.06, ANG, C.door);
  }
  // the balcony: slab, slim columns, cream balustrade, the tiled pent eave over the ground-floor doors
  const sl = P(u0 + bal / 2, cv);
  S.box(sl[0], sl[1], yS - 0.22, yS, bal, d, ANG, C.wallLight, { bottom: true });
  const ra = P(u0 + 0.1, v0), rb = P(u0 + 0.1, v1);
  S.beam([ra[0], yS + 0.5, ra[1]], [rb[0], yS + 0.5, rb[1]], 0.12, 1.0, C.rail);
  for (let i = 0; i <= 12; i++) {
    const q = P(u0 + 0.15, v0 + 0.2 + ((d - 0.4) * i) / 12);
    S.cyl(q[0], q[1], floor, yE, 0.17, 0.15, 6, C.column, { cap: false, rot: ANG });
  }
  for (const [ua, ya, ub, yb] of [[fu, yS - 0.3, u0 - 0.6, yS - 1.0]]) {
    const A = P(ua, v0), B = P(ua, v1), Cc = P(ub, v1), D = P(ub, v0);
    S.kind = KIND.TILE;
    S.quad([A[0], ya, A[1]], [B[0], ya, B[1]], [Cc[0], yb, Cc[1]], [D[0], yb, D[1]], C.tile, [0, 1, 0]);
    S.quad([A[0], ya - 0.04, A[1]], [B[0], ya - 0.04, B[1]], [Cc[0], yb - 0.04, Cc[1]], [D[0], yb - 0.04, D[1]], C.tileDark, [0, -1, 0]);
    S.kind = KIND.PLAIN;
  }
  soffit(S, P(cu, cv), w, d, ANG, yE, 1.0);
  S.hip(...P(cu, cv), d, w, ANG + Math.PI / 2, yE, 3.0, C.tile, { ...EAVE, over: 1.0, fasciaCol: C.tileDark, ridgeCol: C.crest });
  return { floor, yS, yE, u0, u1, v1 };
}

// the porch at the south end of the east hall, over the stair down to the lower court and the side gate: two-storey
// red columns, a balcony at the first floor under a tiled pent eave, a small hip roof (Street View from Sư Liễu Quán)
function porch(S, YL, g, lamp) {
  const { floor, yS, yE, v1 } = g, pu0 = 25.4, pu1 = 33.4, pv1 = 49.0, pc = (pu0 + pu1) / 2;
  S.kind = KIND.MASONRY;
  const b = P(pc, (v1 + pv1) / 2);
  S.box(b[0], b[1], YL - 0.1, floor, pu1 - pu0, pv1 - v1, ANG, C.granite, { top: C.step, topKind: KIND.ROAD });
  // the stair down to the court, between cream cheeks
  const drop = floor - YL, n = Math.max(2, Math.ceil(drop / 0.18)), sh = drop / n, tr = 0.27, sw = 5.0;
  for (let k = 1; k <= n; k++) {
    const q = P(pc, pv1 + tr * (k - 0.5));
    S.box(q[0], q[1], YL - 0.1, floor - sh * k + 0.001, sw, tr, ANG, C.step, { topKind: KIND.ROAD });
  }
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) {
    const a = P(pc + s * (sw / 2 + 0.2), pv1), e = P(pc + s * (sw / 2 + 0.2), pv1 + tr * n);
    S.beam([a[0], floor + 0.3, a[1]], [e[0], YL + 0.3, e[1]], 0.4, 1.0, C.wallLight);
    S.beam([a[0], floor + 0.84, a[1]], [e[0], YL + 0.84, e[1]], 0.5, 0.08, C.coping);
  }
  // columns, the balcony slab and its railing
  for (const u of [pu0 + 0.3, pc - 1.4, pc + 1.4, pu1 - 0.3]) {
    const q = P(u, pv1 - 0.3);
    S.cyl(q[0], q[1], floor, yE - 0.1, 0.2, 0.18, 6, C.column, { cap: false, rot: ANG });
  }
  const s0 = P(pc, (v1 + pv1) / 2);
  S.box(s0[0], s0[1], yS - 0.22, yS, pu1 - pu0, pv1 - v1, ANG, C.wallLight, { bottom: true });
  const ra = P(pu0, pv1 - 0.15), rb = P(pu1, pv1 - 0.15);
  S.beam([ra[0], yS + 0.5, ra[1]], [rb[0], yS + 0.5, rb[1]], 0.12, 1.0, C.rail);
  { // the pent eave over the stair head
    const A = P(pu0 - 0.4, pv1 - 0.1), B = P(pu1 + 0.4, pv1 - 0.1), Cc = P(pu1 + 0.4, pv1 + 0.8), D = P(pu0 - 0.4, pv1 + 0.8), ya = yS - 0.3, yb = yS - 0.8;
    S.kind = KIND.TILE;
    S.quad([A[0], ya, A[1]], [B[0], ya, B[1]], [Cc[0], yb, Cc[1]], [D[0], yb, D[1]], C.tile, [0, 1, 0]);
    S.quad([A[0], ya - 0.04, A[1]], [B[0], ya - 0.04, B[1]], [Cc[0], yb - 0.04, Cc[1]], [D[0], yb - 0.04, D[1]], C.tileDark, [0, -1, 0]);
  }
  const r = P(pc, (v1 + pv1) / 2 + 0.2);
  S.hip(r[0], r[1], pu1 - pu0 + 0.4, pv1 - v1 + 0.8, ANG, yE - 0.5, 1.4, C.tile, { ...EAVE, over: 0.6, fascia: 0.22, fasciaCol: C.tileDark, ridgeCol: C.crest });
  S.kind = KIND.PLAIN;
  const l = P(pc, pv1 - 0.5);
  lamp(l[0], yS - 0.5, l[1], [1, 0.8, 0.5]);
}

// the side gate on Sư Liễu Quán: two square cream pillars with lanterns, black iron grille leaves standing open, and a
// short brick ramp up from the pavement
function sideGate(S, YL, yStreet, lamp) {
  const [gu, gv] = SIDE_GATE;
  S.kind = KIND.PLAIN;
  const r0 = P(gu, gv + 1.3), r1 = P(gu, gv);
  S.beam([r0[0], yStreet - 0.15, r0[1]], [r1[0], YL - 0.15, r1[1]], 5.2, 0.3, C.pave);
  for (const s of [-1, 1]) {
    const u = gu + s * 3.25, q = P(u, gv), h = 3.6;
    S.box(q[0], q[1], YL - 0.4, YL + h, 0.95, 0.95, ANG, C.fenceWall, { top: C.wallLight });
    for (const [du, dv, a] of [[0, 0.5, ANG], [0, -0.5, ANG], [0.5, 0, ANG + Math.PI / 2], [-0.5, 0, ANG + Math.PI / 2]]) {
      const f = P(u + du, gv + dv);
      S.box(f[0], f[1], YL + 0.6, YL + h - 0.7, 0.55, 0.04, a, C.wallLight);
    }
    S.box(q[0], q[1], YL + h, YL + h + 0.18, 1.15, 1.15, ANG, C.coping);
    S.box(q[0], q[1], YL + h + 0.18, YL + h + 0.65, 0.5, 0.5, ANG, C.lantern);
    S.cyl(q[0], q[1], YL + h + 0.65, YL + h + 0.95, 0.45, 0.05, 4, C.coping, { rot: ANG + Math.PI / 4 });
    lamp(q[0], YL + h + 0.42, q[1], [1, 0.86, 0.6]);
    // the leaf, swung in against the court
    leaves(S, P(u - s * 0.5, gv - 0.1), P(u - s * 0.5, gv - 2.6), YL, 2.4, C.iron);
  }
}

// the underside of an eave, so a roof seen from close below is not open
function soffit(S, c, w, d, ang, y, over) {
  S.kind = KIND.PLAIN;
  S.box(c[0], c[1], y - 0.12, y - 0.02, w + 2 * over - 0.2, d + 2 * over - 0.2, ang, C.soffit, { bottom: true });
}

// a plain two-storey block of the monastery: cream walls, rows of brown windows, a modest tiled hip roof
function block(S, ring, y0, storeys, sh) {
  const o = obb(ring);
  const ux = Math.cos(o.a), uz = Math.sin(o.a);
  const Q = (u, v) => [o.c[0] + u * ux - v * uz, o.c[1] + u * uz + v * ux];
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y0 - 0.1, y0 + 0.4, o.w + 0.4, o.d + 0.4, o.a, C.granite, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  const yt = y0 + 0.4 + storeys * sh;
  S.box(o.c[0], o.c[1], y0 + 0.4, yt, o.w, o.d, o.a, C.wall, { top: C.tileDark });
  const n = Math.max(2, Math.round(o.w / 3.2));
  for (let s = 0; s < storeys; s++) for (let i = 0; i < n; i++) for (const sg of [-1, 1]) {
    const q = Q(-o.w / 2 + (o.w * (i + 0.5)) / n, sg * (o.d / 2 + 0.03));
    S.box(q[0], q[1], y0 + 0.4 + s * sh + 0.9, y0 + 0.4 + s * sh + 2.4, 1.1, 0.06, o.a, C.door);
  }
  soffit(S, o.c, o.w, o.d, o.a, yt, 0.9);
  S.hip(o.c[0], o.c[1], o.w, o.d, o.a, yt, Math.min(2.6, o.d * 0.25), C.tile, { ...EAVE, flare: 0.15, over: 0.9, fascia: 0.25, fasciaCol: C.tileDark, ridgeCol: C.tileDark });
}

// the annex on Phan Bội Châu (OSM 1443606690), on the lower strip: two storeys, its street end with a recessed loggia
// upstairs (columns, a cream balustrade), a lattice vent and windows below, a low hip roof (Street View, 2025, car).
// The plinth stays inside the outline (no slab out onto the pavement).
function annex(S, ring, y0) {
  const o = obb(ring);
  const ux = Math.cos(o.a), uz = Math.sin(o.a);
  const Q = (u, v) => [o.c[0] + u * ux - v * uz, o.c[1] + u * uz + v * ux];
  const e = ux > 0 ? 1 : -1; // the end toward the street (east)
  const w = o.w, d = o.d, sh = 3.3, pl = 0.3, y1 = y0 + pl + sh, yt = y1 + sh, lg = 1.8;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y0 - 0.3, y0 + pl, w, d, o.a, C.granite, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  S.box(o.c[0], o.c[1], y0 + pl, y1, w, d, o.a, C.wall, { top: C.wallLight });
  const up = Q(-e * lg / 2, 0);
  S.box(up[0], up[1], y1, yt, w - lg, d, o.a, C.wall, { top: C.tileDark });
  // the loggia: floor is the ground storey's roof; columns and a balustrade along the street end
  for (const v of [-d / 2 + 0.3, -d / 6, d / 6, d / 2 - 0.3]) {
    const q = Q(e * (w / 2 - 0.3), v);
    S.cyl(q[0], q[1], y1, yt, 0.2, 0.18, 6, C.wallLight, { cap: false, rot: o.a });
  }
  const ba = Q(e * (w / 2 - 0.2), -d / 2), bb = Q(e * (w / 2 - 0.2), d / 2);
  S.beam([ba[0], y1 + 0.5, ba[1]], [bb[0], y1 + 0.5, bb[1]], 0.14, 1.0, C.rail);
  S.beam([ba[0], y1 + 1.04, ba[1]], [bb[0], y1 + 1.04, bb[1]], 0.24, 0.08, C.coping);
  for (const v of [-d / 4, d / 4]) { const q = Q(e * (w / 2 - lg - 0.03), v); S.box(q[0], q[1], y1 + 0.2, y1 + 2.6, 0.06, 1.4, o.a + Math.PI / 2, C.door); }
  // the street end below: a lattice vent between two windows
  {
    const q = Q(e * (w / 2 + 0.03), 0);
    S.box(q[0], q[1], y0 + pl + 1.0, y0 + pl + 2.6, 0.06, 2.2, o.a, C.fret);
    const f = Q(e * (w / 2 + 0.05), 0);
    for (let i = -2; i <= 2; i++) { const g = Q(e * (w / 2 + 0.05), i * 0.4); S.box(g[0], g[1], y0 + pl + 1.05, y0 + pl + 2.55, 0.04, 0.06, o.a, C.fretCut); }
    S.box(f[0], f[1], y0 + pl + 1.78, y0 + pl + 1.82, 0.04, 2.1, o.a, C.fretCut);
    for (const v of [-d / 2 + 1.6, d / 2 - 1.6]) { const g = Q(e * (w / 2 + 0.03), v); S.box(g[0], g[1], y0 + pl + 1.0, y0 + pl + 2.5, 0.06, 1.1, o.a, C.door); }
  }
  const n = Math.max(2, Math.round(w / 3.2));
  for (let s = 0; s < 2; s++) for (let i = 0; i < n; i++) for (const sg of [-1, 1]) {
    const u = -w / 2 + (w * (i + 0.5)) / n;
    if (s === 1 && e * u > w / 2 - lg - 0.8) continue;
    const q = Q(u, sg * (d / 2 + 0.03));
    S.box(q[0], q[1], y0 + pl + s * sh + 0.9, y0 + pl + s * sh + 2.4, 1.1, 0.06, o.a, C.door);
  }
  soffit(S, o.c, w, d, o.a, yt, 0.7);
  S.hip(o.c[0], o.c[1], w, d, o.a, yt, Math.min(2.2, d * 0.22), C.tile, { ...EAVE, flare: 0.1, over: 0.7, fascia: 0.22, fasciaCol: C.tileDark, ridgeCol: C.tileDark, hips: false });
}

// the precinct wall: a balustrade on the yard's rubble-stone base, at the level of the yard or the lower court behind
// it. Google Street View along Điện Biên Phủ shows cream bays of pierced interlocking key-fret blocks between pilasters
// with ball finials, a red-brown tile coping, about 0.95 m above the yard.
function wall(S, ring, yAt, gates, lamp) {
  const h = 0.95, every = 3.4;
  const inGate = (x, z) => gates.some(([g0, g1]) => {
    const ax = g1[0] - g0[0], az = g1[1] - g0[1], L2 = ax * ax + az * az;
    const t = ((x - g0[0]) * ax + (z - g0[1]) * az) / L2, px = g0[0] + ax * t, pz = g0[1] + az * t;
    return t > 0 && t < 1 && Math.hypot(x - px, z - pz) < 2.5;
  });
  let k = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.5) continue;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), nb = Math.max(1, Math.round(len / every));
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let j = 0; j < nb; j++) {
      const p = [a[0] + ((b[0] - a[0]) * j) / nb, a[1] + ((b[1] - a[1]) * j) / nb];
      const q = [a[0] + ((b[0] - a[0]) * (j + 1)) / nb, a[1] + ((b[1] - a[1]) * (j + 1)) / nb];
      const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, bl = len / nb;
      const y0 = yAt(mx, mz);
      if (!inGate(mx, mz)) {
        S.kind = KIND.MASONRY;
        S.box(mx, mz, y0 - 0.05, y0 + 0.15, bl, 0.32, ang, C.fenceWall); // plinth
        S.kind = KIND.PLAIN;
        S.box(mx, mz, y0 + 0.15, y0 + 0.74, bl - 0.4, 0.1, ang, C.fret); // the fret blocks
        // the interlocking key-fret through the blocks, drawn on both faces: a spine along the middle, and from it
        // hooks rising and falling in turn, each turning back at its end
        const fw = bl - 0.4, nm = Math.max(1, Math.round(fw / 0.55)), mw = fw / nm, yc = y0 + 0.445, t2 = 0.035;
        for (const side of [-1, 1]) {
          const nx = -sa * side * 0.056, nz = ca * side * 0.056, hint = [-sa * side, 0, ca * side];
          const R = (u0, u1, ya, yb) => {
            const A = (u, y) => [mx + u * ca + nx, y, mz + u * sa + nz];
            S.quad(A(u0, ya), A(u1, ya), A(u1, yb), A(u0, yb), C.fretCut, hint);
          };
          R(-fw / 2 + 0.03, fw / 2 - 0.03, yc - t2, yc + t2);
          for (let m = 0; m < nm; m++) {
            const t = -fw / 2 + mw * (m + 0.5), sg = m % 2 ? -1 : 1, yE = yc + sg * 0.2;
            R(t - t2, t + t2, Math.min(yc, yE), Math.max(yc, yE)); // the riser
            R(t - t2, t + mw * 0.3, Math.min(yE, yE - sg * 2 * t2), Math.max(yE, yE - sg * 2 * t2)); // the turn
            R(t + mw * 0.3 - 2 * t2, t + mw * 0.3, Math.min(yE, yE - sg * 0.11), Math.max(yE, yE - sg * 0.11)); // the hook
          }
        }
        S.box(mx, mz, y0 + 0.74, y0 + h - 0.1, bl, 0.26, ang, C.fenceWall);
        S.box(mx, mz, y0 + h - 0.1, y0 + h, bl + 0.05, 0.4, ang, C.coping, { top: C.coping });
      }
      if (!inGate(p[0], p[1])) {
        // the pilaster stands at the higher of the two bays either side, its foot at the lower
        const ya = yAt(p[0] - ca * 0.6, p[1] - sa * 0.6), yb = yAt(p[0] + ca * 0.6, p[1] + sa * 0.6);
        const lo = Math.min(ya, yb), hi = Math.max(ya, yb);
        S.kind = KIND.MASONRY;
        S.box(p[0], p[1], lo - 0.05, hi + h + 0.25, 0.44, 0.44, ang, C.fenceWall, { top: C.wallLight });
        S.kind = KIND.PLAIN;
        S.box(p[0], p[1], hi + h + 0.15, hi + h + 0.3, 0.52, 0.52, ang, C.wallLight);
        // the ball finial on a short neck
        S.cyl(p[0], p[1], hi + h + 0.3, hi + h + 0.4, 0.09, 0.07, 6, C.wallLight, { cap: false });
        S.cyl(p[0], p[1], hi + h + 0.4, hi + h + 0.53, 0.07, 0.15, 8, C.wallLight, { cap: false });
        S.cyl(p[0], p[1], hi + h + 0.53, hi + h + 0.68, 0.15, 0.03, 8, C.wallLight);
        if (k++ % 4 === 0) lamp(p[0], hi + h + 0.5, p[1], [1, 0.84, 0.58]);
      }
    }
  }
}
