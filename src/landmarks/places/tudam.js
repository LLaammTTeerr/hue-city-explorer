import { KIND, Buf, hex, shade, obb, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { pavilion } from '../citadel.js';
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
  wall: hex('#e8d08e'), wallLight: hex('#efe1b8'), column: hex('#7d2f22'), door: hex('#5a2c1e'),
  tile: hex('#b25f3a'), tileDark: hex('#8f4a2e'), ceramic: hex('#ebe7dc'), panel: hex('#8fa3a6'), panelFrame: hex('#6b3a26'),
  brick: hex('#a45138'), brickDark: hex('#7e3b2a'), rail: hex('#eadbb6'),
  pier: hex('#bdbfba'), ochre: hex('#b9864f'), board: hex('#2f5c4c'), letters: hex('#efe4c2'), iron: hex('#24262a'),
  fenceWall: hex('#ead9a6'), fret: hex('#8d908c'), base: hex('#5e5a51'),
  pave: hex('#aba69b'), redBrick: hex('#a4533f'), lawn: hex('#5f7f3c'),
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

export function build({ data, S, group, THREE }) {
  const n0 = S.n;
  // the precinct less the streets OSM draws into it (Điện Biên Phủ runs a few metres inside the mapped west side):
  // the wall stands at the kerb
  const site = offStreets(data, inset(SITE, 1.0));
  // one level for the whole precinct, a little above its highest ground (the yard stands over the street on a stone
  // base, as the photos from Điện Biên Phủ and Sư Liễu Quán show)
  let top = -Infinity;
  for (let x = -803; x <= -710; x += 3) for (let z = 1850; z <= 1966; z += 3) if (inRing(x, z, site)) top = Math.max(top, rise(x, z));
  for (const p of site) top = Math.max(top, rise(p[0], p[1]));
  const Y = LAND_Y + top + 0.3;
  const low = LAND_Y + Math.min(...site.map((p) => rise(p[0], p[1]))) - 0.4;
  S.base = Y - LAND_Y;
  const lamps = [], lampCol = [];
  const lamp = (x, y, z, c = [1, 0.84, 0.55]) => { lamps.push(x, y, z); lampCol.push(...c); };
  const L = new Buf(512); // warm night strips

  // ---------------- the yard: stone base, grey paving, the red-brick forecourt, lawns ----------------
  const paved0 = S.n;
  S.kind = KIND.MASONRY;
  S.prism(site, low, Y, C.base, C.pave, { topKind: KIND.ROAD });
  // red-brick forecourt from the hall's stair to the gate
  S.kind = KIND.PLAIN;
  const quad = (u0, u1, v0, v1) => [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
  S.prism(quad(-14, 12, 19.4, 55.6), Y, Y + 0.03, C.redBrick, C.redBrick, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([paved0, S.n]); // paving: no trees, no houses (src/geo/city.js coverOf)
  // lawns: round the stupa, along the west wall, and the bed under the Bodhi tree
  for (const q of [quad(-33, -16, 30, 55), quad(-30, -16, -30, 14), quad(13, 19.5, 30, 50)]) {
    const bed = clipTo(q, site); // inside the precinct wall (its west side is not square to the hall)
    if (bed) S.prism(bed, Y, Y + 0.06, C.lawn, C.lawn, { topKind: KIND.GROUND });
  }

  // ---------------- chánh điện: podium, two halls one behind the other, side towers ----------------
  const cu = -1.25, PW = 24.1, PH = 1.9; // podium centre along u, width, height
  const v0 = -18.9, v1 = 15.5; // podium back and front
  S.kind = KIND.MASONRY;
  {
    const c = P(cu, (v0 + v1) / 2);
    S.box(c[0], c[1], Y - 0.1, Y + PH, PW, v1 - v0, ANG, C.granite, { top: C.step, topKind: KIND.ROAD });
    // a darker base course and a cream balustrade round the edge, broken for the front stair
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
  // balustrade along the sides and back of the podium
  for (const [a, b] of [[[cu - PW / 2 + 0.2, v1], [cu - PW / 2 + 0.2, v0 + 0.2]], [[cu - PW / 2 + 0.2, v0 + 0.2], [cu + PW / 2 - 0.2, v0 + 0.2]], [[cu + PW / 2 - 0.2, v0 + 0.2], [cu + PW / 2 - 0.2, v1]]]) {
    const p = P(...a), q = P(...b);
    S.beam([p[0], Y + PH + 0.42, p[1]], [q[0], Y + PH + 0.42, q[1]], 0.16, 0.84, C.rail);
  }
  const yF = Y + PH;
  // tiền đường (front) and chánh điện (behind): w along u is the column line, d along v
  hall(S, P(cu, 7.75), 22.6, 14.2, yF, { wallH: 5.2, rLow: 2.3, clere: 1.9, rTop: 2.9, front: true, lamp, L });
  hall(S, P(cu, -9.6), 22.6, 17.0, yF, { wallH: 5.5, rLow: 2.5, clere: 2.1, rTop: 3.3, front: false, lamp, L });

  // lầu chuông (east, the Buddha's left) and lầu trống (west): the two wings at the front corners in OSM
  for (const s of [-1, 1]) {
    const u = s > 0 ? 13.6 : -15.4, v = 13.8;
    const c = P(u, v);
    S.kind = KIND.MASONRY;
    S.box(c[0], c[1], Y - 0.1, yF, 5.4, 5.4, ANG, C.granite, { top: C.step, topKind: KIND.ROAD });
    const t = pavilion(S, c[0], c[1], 4.0, 4.0, ANG, yF, { tiers: 2, wallH: 3.3, roof: C.tile, wall: C.wall, over: 0.9, rh: 2.0, ridge: C.ceramic, segs: 3 });
    S.kind = KIND.PLAIN;
    S.cyl(c[0], c[1], t, t + 0.5, 0.28, 0.12, 6, C.ceramic); // a gourd on the pyramid
    // the round window of the upper storey, toward the yard
    const w = P(u, v + 1.43);
    S.box(w[0], w[1], yF + 5.3, yF + 6.3, 0.9, 0.06, ANG, C.door);
  }

  // ---------------- tháp Ấn Tôn: octagonal, seven storeys, about 27 m ----------------
  stupa(S, STUPA[0], STUPA[1], Y, lamp);

  // ---------------- the Bodhi tree, and the other trees of the yard ----------------
  tree(S, ...P(16, 40), Y, 15, 8.5, 6, [C.leaf, C.leafDark, C.leaf2]); // cây bồ đề, planted 1939
  // Ashoka trees ringing the stupa
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.3;
    if (Math.abs(Math.sin(a - ANG) - 1) < 0.3) continue; // leave the path from the yard open
    const x = STUPA[0] + Math.cos(a) * 7.2, z = STUPA[1] + Math.sin(a) * 7.2;
    S.cyl(x, z, Y, Y + 1.2, 0.18, 0.15, 5, C.trunk, { cap: false });
    S.cyl(x, z, Y + 1.0, Y + 5.5, 0.6, 1.05, 7, C.leafDark, { cap: false });
    S.cyl(x, z, Y + 5.5, Y + 9.0, 1.05, 0.08, 7, C.leafDark);
  }
  // frangipani and round shade trees along the west wall (on Điện Biên Phủ) and by the gate
  for (const [u, v, h, r] of [[-24, -22, 6.5, 3.6], [-26, -8, 7, 3.8], [-24, 6, 6.5, 3.6], [-30, 24, 7.5, 4], [-12, 52, 5.5, 3], [9, 52, 5.5, 3], [30, 52, 8, 4.2], [-18, -36, 8, 4.5]]) {
    const q = P(u, v);
    if (inRing(q[0], q[1], site)) tree(S, q[0], q[1], Y, h, r, 3, [C.leaf2, C.leaf, C.leafDark]);
  }
  // potted bonsai along the foot of the stair
  for (let u = -11; u <= 11; u += 4.4) { const q = P(cu + u, 20.4); S.cyl(q[0], q[1], Y, Y + 0.6, 0.35, 0.45, 6, hex('#7b5a46')); S.cyl(q[0], q[1], Y + 0.6, Y + 1.5, 0.55, 0.15, 6, C.leaf); }

  // ---------------- the hall on the east of the yard and the buildings behind ----------------
  gallery(S, EAST_HALL, Y, lamp);
  block(S, QUARTERS, Y, 2, 3.2);
  block(S, ANNEX_N, Y, 2, 3.4);
  block(S, ANNEX_E, Y, 2, 3.4);

  // ---------------- the tam quan (1965) on Sư Liễu Quán, on the hall's axis ----------------
  const gv = 56.9; // the front of the yard
  gate(S, cu, gv, Y, lamp, L);
  // steps down from the gate to the pavement
  {
    const g = rise(...P(cu, gv + 3.5)) + LAND_Y, drop = Y - g;
    if (drop > 0.12) {
      const n = Math.max(1, Math.round(drop / 0.16)), sh = drop / n;
      S.kind = KIND.MASONRY;
      for (let k = 0; k < n; k++) { const q = P(cu, gv + 0.35 + 0.34 * (k + 0.5)); S.box(q[0], q[1], g - 0.2, Y - sh * (k + 1) + sh, 12.4, 0.34, ANG, C.step, { topKind: KIND.ROAD }); }
    }
  }

  // ---------------- the wall round the precinct ----------------
  wall(S, site, Y, [P(cu - 6.6, gv), P(cu + 6.6, gv)], lamp);

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

// A hall of the trùng thiềm điệp ốc kind: a closed cream core inside a verandah of red-brown columns, a lower roof
// all round, a clerestory band of painted panels, and the upper roof with white ceramic dragons on the ridge.
// c: centre, w along u (the facade) and d along v at the column line, y0: floor.
function hall(S, c, w, d, y0, { wallH, rLow, clere, rTop, front, lamp, L }) {
  const [cx, cz] = c;
  const Q = (u, v) => [cx + u * UX - v * UZ, cz + u * UZ + v * UX];
  const cw = w - 4.6, cd = d - 4.2; // the core
  S.kind = KIND.TIMBER;
  S.box(cx, cz, y0, y0 + wallH, cw, cd, ANG, C.wall, { top: C.tileDark });
  // doors: one per bay on the front of the front hall, three at the back
  S.kind = KIND.PLAIN;
  const bays = front ? 7 : 3;
  for (let i = 0; i < bays; i++) {
    const u = -cw / 2 + (cw * (i + 0.5)) / bays, sg = front ? 1 : -1;
    const q = Q(u, sg * (cd / 2 + 0.03));
    S.box(q[0], q[1], y0, y0 + 3.4, Math.min(2.0, cw / bays - 0.6), 0.08, ANG, C.door);
    const t = Q(u, sg * (cd / 2 + 0.05));
    S.box(t[0], t[1], y0 + 3.7, y0 + 4.5, Math.min(2.0, cw / bays - 0.6), 0.06, ANG, C.panel);
    if (front) lamp(t[0] + (t[0] - cx) * 0.001, y0 + 2.2, t[1], [1, 0.78, 0.45]);
  }
  // side windows
  for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) {
    const q = Q(sg * (cw / 2 + 0.03), -cd / 2 + (cd * (i + 0.5)) / 3);
    S.box(q[0], q[1], y0 + 1.0, y0 + 3.4, 0.08, 1.6, ANG, C.door);
  }
  // the verandah: ceiling, columns on stone bases, the beam along their heads
  const lid = y0 + wallH;
  S.box(cx, cz, lid - 0.25, lid, w, d, ANG, shade(C.column, 0.8), { top: C.tileDark, bottom: true });
  const nu = Math.round(w / 3.2), nv = Math.round(d / 3.4), posts = [];
  for (let i = 0; i <= nu; i++) for (const sg of [-1, 1]) posts.push([-w / 2 + (w * i) / nu, (sg * d) / 2]);
  for (let i = 1; i < nv; i++) for (const sg of [-1, 1]) posts.push([(sg * w) / 2, -d / 2 + (d * i) / nv]);
  for (const [u, v] of posts) {
    const q = Q(u, v);
    S.cyl(q[0], q[1], y0, y0 + 0.3, 0.42, 0.36, 6, C.granite, { cap: false, rot: ANG });
    S.cyl(q[0], q[1], y0 + 0.3, lid - 0.2, 0.25, 0.23, 6, C.column, { cap: false, rot: ANG });
  }
  const K = [Q(-w / 2, -d / 2), Q(w / 2, -d / 2), Q(w / 2, d / 2), Q(-w / 2, d / 2)];
  for (let i = 0; i < 4; i++) { const a = K[i], b = K[(i + 1) % 4]; S.beam([a[0], lid - 0.35, a[1]], [b[0], lid - 0.35, b[1]], 0.3, 0.4, C.column); }
  // a gilt frieze under the front eave
  if (front) { const a = Q(-w / 2, d / 2 + 0.05), b = Q(w / 2, d / 2 + 0.05); S.beam([a[0], lid - 0.75, a[1]], [b[0], lid - 0.75, b[1]], 0.06, 0.35, C.gold); }
  // roofs
  S.kind = KIND.TIMBER;
  const eave = { fascia: 0.32, fasciaCol: C.tileDark, ridgeCol: C.ceramic, hips: true, segs: 3 };
  S.hip(cx, cz, w, d, ANG, lid, rLow, C.tile, { flare: 0.5, over: 1.3, ...eave, ridgeCol: null });
  const w2 = w * 0.74, d2 = d * 0.56, y2 = lid + rLow * 0.45;
  S.kind = KIND.PLAIN;
  S.box(cx, cz, y2, y2 + clere, w2, d2, ANG, C.wallLight);
  // the painted panels of the clerestory, framed in brown, on all four sides
  for (const sg of [-1, 1]) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const q = Q(-w2 / 2 + (w2 * (i + 0.5)) / n, sg * (d2 / 2 + 0.03));
      S.box(q[0], q[1], y2 + 0.35, y2 + clere - 0.3, w2 / n - 0.5, 0.06, ANG, C.panel);
    }
    for (let i = 0; i < 3; i++) {
      const q = Q(sg * (w2 / 2 + 0.03), -d2 / 2 + (d2 * (i + 0.5)) / 3);
      S.box(q[0], q[1], y2 + 0.35, y2 + clere - 0.3, 0.06, d2 / 3 - 0.5, ANG, C.panel);
    }
    const a = Q(-w2 / 2, sg * (d2 / 2 + 0.02)), b = Q(w2 / 2, sg * (d2 / 2 + 0.02));
    S.beam([a[0], y2 + 0.18, a[1]], [b[0], y2 + 0.18, b[1]], 0.08, 0.3, C.panelFrame);
    S.beam([a[0], y2 + clere - 0.12, a[1]], [b[0], y2 + clere - 0.12, b[1]], 0.08, 0.24, C.panelFrame);
  }
  const y3 = y2 + clere;
  S.kind = KIND.TIMBER;
  S.hip(cx, cz, w2, d2, ANG, y3, rTop, C.tile, { flare: 0.5, over: 1.2, ...eave });
  // the ridge: a dragon curling up at each end, and on the front hall the dharma wheel between two dragons
  S.kind = KIND.PLAIN;
  const ry = y3 + rTop + 0.25, hr = Math.max(0, (w2 + 2.4) / 2 - ((d2 + 2.4) / 2) * 0.92);
  for (const sg of [-1, 1]) {
    const e = Q(sg * hr, 0), m = Q(sg * (hr - 1.4), 0);
    S.beam([e[0], ry + 0.1, e[1]], [m[0], ry + 0.9, m[1]], 0.35, 0.5, C.ceramic);
    S.beam([e[0], ry, e[1]], [e[0], ry + 1.25, e[1]], 0.4, 0.4, C.ceramic);
  }
  if (front) {
    const m = Q(0, 0);
    S.cyl(m[0], m[1], ry, ry + 0.5, 0.5, 0.3, 6, C.ceramic);
    S.box(m[0], m[1], ry + 0.5, ry + 1.7, 1.2, 0.15, ANG, C.ceramic);
    S.box(m[0], m[1], ry + 0.85, ry + 1.35, 0.6, 0.18, ANG, C.gold);
    for (const sg of [-1, 1]) {
      const a = Q(sg * 0.9, 0), b = Q(sg * 3.2, 0);
      S.beam([a[0], ry + 0.6, a[1]], [b[0], ry + 0.25, b[1]], 0.3, 0.45, C.ceramic);
    }
    // a warm strip under the front eave after dark
    const a = Q(-w / 2 - 0.8, d / 2 + 1.0), b = Q(w / 2 + 0.8, d / 2 + 1.0);
    L.beam([a[0], lid - 0.15, a[1]], [b[0], lid - 0.15, b[1]], 0.12, 0.1, [1, 1, 1]);
  }
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

// the two-storey hall of ten rooms on the east of the yard: a verandah of red-brown columns on both floors facing the
// yard (west), cream walls, a tiled hip roof
function gallery(S, ring, y0, lamp) {
  const o = obb(ring);
  const ux = Math.cos(o.a), uz = Math.sin(o.a);
  const Q = (u, v) => [o.c[0] + u * ux - v * uz, o.c[1] + u * uz + v * ux];
  // which short side of the box faces the yard (toward the hall)
  const toHall = (O[0] - o.c[0]) * -uz + (O[1] - o.c[1]) * ux > 0 ? 1 : -1;
  const w = o.w, d = o.d, ver = 2.4, h1 = 3.6, h2 = 3.4, pl = 0.5;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y0 - 0.1, y0 + pl, w + 0.6, d + 0.6, o.a, C.granite, { top: C.step, topKind: KIND.ROAD });
  const core = Q(0, -toHall * ver / 2);
  S.kind = KIND.TIMBER;
  S.box(core[0], core[1], y0 + pl, y0 + pl + h1 + h2, w - 0.6, d - ver, o.a, C.wall, { top: C.tileDark });
  S.kind = KIND.PLAIN;
  // the upper floor slab over the verandah, its cream balustrade, doors and windows on both floors
  const yS = y0 + pl + h1, fv = toHall * (d / 2 - 0.05);
  const sl = Q(0, toHall * (d / 2 - ver / 2));
  S.box(sl[0], sl[1], yS - 0.25, yS, w, ver, o.a, C.wallLight, { bottom: true });
  const ra = Q(-w / 2, fv), rb = Q(w / 2, fv);
  S.beam([ra[0], yS + 0.45, ra[1]], [rb[0], yS + 0.45, rb[1]], 0.12, 0.9, C.rail);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const u = -w / 2 + 0.3 + ((w - 0.6) * (i + 0.5)) / n;
    for (const yb of [y0 + pl, yS]) {
      const q = Q(u, toHall * (d / 2 - ver + 0.04));
      S.box(q[0], q[1], yb, yb + 2.5, 1.2, 0.06, o.a, C.door);
    }
    const b = Q(u, -toHall * (d / 2 + 0.03));
    for (const yb of [y0 + pl + 1.0, yS + 0.9]) S.box(b[0], b[1], yb, yb + 1.4, 1.1, 0.06, o.a, C.door);
    if (i % 3 === 1) lamp(...[Q(u, fv)].map((p) => [p[0], yS - 0.5, p[1]])[0], [1, 0.8, 0.5]);
  }
  const cols = 12;
  for (let i = 0; i <= cols; i++) {
    const q = Q(-w / 2 + 0.2 + ((w - 0.4) * i) / cols, fv - toHall * 0.25);
    S.cyl(q[0], q[1], y0 + pl, y0 + pl + h1 + h2, 0.2, 0.18, 6, C.column, { cap: false, rot: o.a });
  }
  S.kind = KIND.TIMBER;
  S.hip(o.c[0], o.c[1], w, d, o.a, y0 + pl + h1 + h2, 2.6, C.tile, { flare: 0.4, over: 1.0, fascia: 0.28, fasciaCol: C.tileDark, ridgeCol: C.tileDark, hips: true, segs: 2 });
}

// a plain two-storey block of the monastery: cream walls, rows of brown windows, a tiled hip roof
function block(S, ring, y0, storeys, sh) {
  const o = obb(ring);
  const ux = Math.cos(o.a), uz = Math.sin(o.a);
  const Q = (u, v) => [o.c[0] + u * ux - v * uz, o.c[1] + u * uz + v * ux];
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y0 - 0.1, y0 + 0.4, o.w + 0.4, o.d + 0.4, o.a, C.granite, { topKind: KIND.ROAD });
  S.kind = KIND.TIMBER;
  const yt = y0 + 0.4 + storeys * sh;
  S.box(o.c[0], o.c[1], y0 + 0.4, yt, o.w, o.d, o.a, C.wall, { top: C.tileDark });
  S.kind = KIND.PLAIN;
  const n = Math.max(2, Math.round(o.w / 3.2));
  for (let s = 0; s < storeys; s++) for (let i = 0; i < n; i++) for (const sg of [-1, 1]) {
    const q = Q(-o.w / 2 + (o.w * (i + 0.5)) / n, sg * (o.d / 2 + 0.03));
    S.box(q[0], q[1], y0 + 0.4 + s * sh + 0.9, y0 + 0.4 + s * sh + 2.4, 1.1, 0.06, o.a, C.door);
  }
  S.kind = KIND.TIMBER;
  S.hip(o.c[0], o.c[1], o.w, o.d, o.a, yt, Math.min(3, o.d * 0.28), C.tile, { flare: 0.35, over: 0.9, fascia: 0.25, fasciaCol: C.tileDark, ridgeCol: C.tileDark, hips: true, segs: 2 });
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

// the precinct wall on its stone base: cream bays between pilasters, each with a grey key-fret panel, a cream cap
function wall(S, ring, y0, [g0, g1], lamp) {
  const h = 1.75, every = 3.4;
  const gate = (x, z) => { // inside the gate opening (between the two outer gate piers)
    const ax = g1[0] - g0[0], az = g1[1] - g0[1], L2 = ax * ax + az * az;
    const t = ((x - g0[0]) * ax + (z - g0[1]) * az) / L2, px = g0[0] + ax * t, pz = g0[1] + az * t;
    return t > 0 && t < 1 && Math.hypot(x - px, z - pz) < 2.5;
  };
  let k = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.5) continue;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), nb = Math.max(1, Math.round(len / every));
    for (let j = 0; j < nb; j++) {
      const p = [a[0] + ((b[0] - a[0]) * j) / nb, a[1] + ((b[1] - a[1]) * j) / nb];
      const q = [a[0] + ((b[0] - a[0]) * (j + 1)) / nb, a[1] + ((b[1] - a[1]) * (j + 1)) / nb];
      const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, bl = len / nb;
      if (gate(mx, mz)) continue;
      S.kind = KIND.MASONRY;
      S.box(mx, mz, y0, y0 + 0.55, bl, 0.3, ang, C.fenceWall);
      S.box(mx, mz, y0 + 1.45, y0 + h - 0.1, bl, 0.3, ang, C.fenceWall, { top: C.wallLight });
      S.kind = KIND.PLAIN;
      S.box(mx, mz, y0 + 0.55, y0 + 1.45, bl - 0.4, 0.14, ang, C.fret);
      S.box(mx, mz, y0 + h - 0.1, y0 + h, bl + 0.05, 0.42, ang, C.wallLight);
      if (!gate(p[0], p[1])) {
        S.kind = KIND.MASONRY;
        S.box(p[0], p[1], y0, y0 + h + 0.3, 0.46, 0.46, ang, C.fenceWall, { top: C.wallLight });
        S.kind = KIND.PLAIN;
        S.box(p[0], p[1], y0 + h - 0.2, y0 + h - 0.05, 0.5, 0.5, ang, C.ochre);
        if (k++ % 4 === 0) lamp(p[0], y0 + h + 0.5, p[1], [1, 0.84, 0.58]);
      }
    }
  }
}
