import { Buf, KIND, hex, shade, unflat, obb } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';

// Phu Văn Lâu (1819, Gia Long; blown down 1904 and rebuilt as before under Thành Thái; restored 2014–2016), the
// riverside pavilion where royal edicts and exam results were posted, on the Citadel's axis between Kỳ Đài and
// Nghênh Lương Đình. Sources and estimates: docs/places/phuvanlau.md.
//   - a two-storey timber lầu on 16 dark-red ironwood columns (4 × 4); the four middle ones rise through both floors
//   - ground floor open all round on a tall grey stone platform (about 1.2 m), stairs in the middle of all four sides,
//     a 65 cm balustrade washed pale yellow round the platform's edge, open at the stairs
//   - eight roof slopes in two tiers (two hipped roofs), yellow glazed tubular tiles (hoàng lưu ly), the corners
//     turned up only a little; ceramic crests on the ridges, dragons on the upper ridge
//   - upper floor on the four inner columns, a wooden balcony rail round it on the lower roof; one wide window on the
//     front and back under the gilt red-lacquered "Phu Văn Lâu" board, round windows on the two sides
//   - 11.8 m to the top (docs/heights-reference.json; vinwonders gives 11.67 m)
//   - in the yard: two small bronze cannons facing each other near the road, the two "khuynh cái hạ mã" stelae
//     farther out on either flank, and Thiệu Trị's 1843 stele house for the poem Hương Giang hiểu phiếm in the lawn
//     about 43 m to the right (south-west), on its own OSM footprint.
// Proportions and positions follow the 2026 satellite and Google's car Street View from Lê Duẩn (2026 rebuild,
// docs/places/phuvanlau.md). The OSM outline (way 531031520, 13.6 × 13.1 m) gives the axis; it lies about 1.6 m
// east and 0.8 m north of the building on the satellite and the car panoramas, so the centre is moved by that much.
export const id = 'phuvanlau';

const RED = hex('#8a2a1e'); // dark-red lacquered columns and timber
const CREAM = hex('#eadfc0'); // the upper floor's pale panels
const LIME = hex('#e4d08f'); // the pale yellow balustrade
const BALUSTER = hex('#efe6cc');
const MARBLE = hex('#d9d3c6');
const PLINTH = hex('#a39c8e'); // the platform's weathered grey stone face
const YARD = hex('#9a9086'); // terracotta-grey pavers
const ROOF = hex('#c9822a'); // 2016 tiles read burnt orange in the panoramas, duller than the shared imperial gold
const RIDGE = hex('#ddd5c0'); // ceramic-clad ridges
const GOLD = hex('#d8b04a');
const GLASS = hex('#2c2a2c'); // the dark wide window
const LATTICE = hex('#4a3524');
const BRONZE = hex('#5d4a2e');
const OFFSET = [-1.4, 0.8]; // scene x, z: from the OSM outline's centre to the building's (see above)

export function build({ data, S, group, place, THREE }) {
  const ring = data.special?.phuvanlau?.ring ? unflat(data.special.phuvanlau.ring) : null;
  if (!ring && !place) return null;
  const o = ring ? obb(ring) : { c: [place.x, place.z], w: 13.6, d: 13.1, a: 0 };
  // the axis: from Kỳ Đài out to the river (f); u runs across the front, v along f
  let f = [0.58, 0.817];
  if (data.special?.kydai) {
    const k = unflat(data.special.kydai.ring), kc = k.reduce((s, p) => [s[0] + p[0] / k.length, s[1] + p[1] / k.length], [0, 0]);
    const l = Math.hypot(o.c[0] - kc[0], o.c[1] - kc[1]) || 1; f = [(o.c[0] - kc[0]) / l, (o.c[1] - kc[1]) / l];
  }
  // square the axis to the mapped outline's nearer side
  { const ux = Math.cos(o.a), uz = Math.sin(o.a); const cands = [[ux, uz], [-ux, -uz], [-uz, ux], [uz, -ux]]; f = cands.sort((a, b) => (b[0] * f[0] + b[1] * f[1]) - (a[0] * f[0] + a[1] * f[1]))[0]; }
  const ang = Math.atan2(-f[0], f[1]); // so that P(0, v) runs along f
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const cx = o.c[0] + (ring ? OFFSET[0] : 0), cz = o.c[1] + (ring ? OFFSET[1] : 0);
  const P = (u, v) => [cx + u * ux - v * uz, cz + u * uz + v * ux];
  const P3 = (u, y, v) => { const q = P(u, v); return [q[0], y, q[1]]; };
  const box = (u, v, y0, y1, su, sv, col, opt) => { const q = P(u, v); S.box(q[0], q[1], y0, y1, su, sv, ang, col, opt); };
  const gy = LAND_Y + rise(cx, cz);

  const L = group && THREE ? new Buf(600) : null; // night: strips under the eaves
  const lamp = [], lampCol = [];

  // ---- the yard: paved from the moat path out to the footway along Lê Duẩn, past the stelae on either side ----
  S.kind = KIND.ROAD;
  box(0, 0.4, gy - 0.3, gy + 0.05, 30, 22.8, YARD, { topKind: KIND.ROAD });
  for (let i = -6; i <= 6; i++) box(i * 2.3, 0.4, gy + 0.05, gy + 0.06, 0.08, 22.8, shade(YARD, 0.9));

  // ---- platform: about 1.2 m of grey stone under a marble floor ----
  const pH = 1.2, yP = gy + pH;
  const PU = 6.0, PV = 5.8; // half sizes
  const CU = [-4.75, -2.1, 2.1, 4.75], CV = [-4.5, -2.0, 2.0, 4.5]; // column lines (bays 2.65 / 4.2 / 2.65 m)
  S.kind = KIND.MASONRY;
  box(0, 0, gy - 0.3, yP - 0.08, PU * 2, PV * 2, PLINTH, { topKind: KIND.ROAD });
  box(0, 0, yP - 0.08, yP, PU * 2 + 0.1, PV * 2 + 0.1, MARBLE, { topKind: KIND.ROAD });
  // stairs in the middle of each side, six steps between low stone cheek walls: 4.4 m wide front and back, 2.6 m on
  // the sides (both sides show in the car panoramas; the back one is not seen and kept as before)
  const NS = 6, tread = 0.32;
  const stair = (side, wide) => { // side: 0 front (+v), 1 back (-v), 2 left (+u), 3 right (-u)
    const sg = side === 0 || side === 2 ? 1 : -1, alongV = side < 2, half = (alongV ? PV : PU);
    const W = wide, at = (s, t) => (alongV ? [t, sg * s] : [sg * s, t]);
    for (let k = 1; k <= NS; k++) {
      const s = half + (k - 0.5) * tread, [u, v] = at(s, 0);
      box(u, v, gy - 0.3, yP - k * (pH / (NS + 1)), alongV ? W : tread, alongV ? tread : W, shade(MARBLE, 0.93), { topKind: KIND.ROAD });
    }
    for (const e of [-1, 1]) { // the cheeks: a sloping coping on a low wall
      const a = at(half - 0.1, e * (W / 2 + 0.18)), b = at(half + NS * tread + 0.15, e * (W / 2 + 0.18));
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], len = NS * tread + 0.25;
      box(m[0], m[1], gy - 0.3, gy + 0.35, alongV ? 0.36 : len, alongV ? len : 0.36, PLINTH);
      S.beam(P3(a[0], yP + 0.62, a[1]), P3(b[0], gy + 0.55, b[1]), 0.36, 0.3, shade(LIME, 0.92));
      box(b[0], b[1], gy, gy + 0.75, 0.42, 0.42, LIME);
    }
  };
  stair(0, 4.0); stair(1, 4.0); stair(2, 2.4); stair(3, 2.4);

  // ---- ground floor: 16 columns, open all round ----
  const yE1 = gy + 4.2; // lower eave
  const yD = gy + 6.0; // upper floor
  const yE2 = gy + 8.3; // upper eave
  S.kind = KIND.TIMBER;
  for (const u of CU) for (const v of CV) {
    const inner = Math.abs(u) < 3 && Math.abs(v) < 3;
    const q = P(u, v), r = inner ? 0.2 : 0.17;
    S.cyl(q[0], q[1], yP, yP + 0.22, r * 1.7, r * 1.5, 8, shade(PAL.stone, 0.95), { cap: false, rot: ang });
    S.cyl(q[0], q[1], yP + 0.22, inner ? yD : yE1 - 0.1, r, r * 0.94, 8, RED, { cap: false, rot: ang });
  }
  // tie beams round the outer column heads and from the outer to the inner columns
  const ty = yE1 - 0.35;
  const C = [[CU[0], CV[0]], [CU[3], CV[0]], [CU[3], CV[3]], [CU[0], CV[3]]];
  for (let i = 0; i < 4; i++) S.beam(P3(C[i][0], ty, C[i][1]), P3(C[(i + 1) % 4][0], ty, C[(i + 1) % 4][1]), 0.22, 0.32, shade(RED, 0.85));
  for (const u of CU) for (const v of CV) {
    if (Math.abs(u) < 3 && Math.abs(v) < 3) continue;
    const iu = Math.max(-2.1, Math.min(2.1, u)), iv = Math.max(-2.0, Math.min(2.0, v));
    S.beam(P3(u, ty, v), P3(iu, ty + 0.25, iv), 0.18, 0.26, shade(RED, 0.8));
  }
  // the ceiling of the ground floor, seen from below between the column lines
  box(0, 0, yE1 - 0.12, yE1 - 0.02, 9.7, 9.2, shade(RED, 0.5), { bottom: true });

  // ---- balustrade round the platform's edge: lime-washed piers, pale balusters, a coping; open at the stairs ----
  S.kind = KIND.MASONRY;
  const BU = PU - 0.2, BV = PV - 0.2;
  const rail = (a, b) => { // a, b: (u, v) ends of a straight run
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.3) return;
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const along = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
    const W = (t, l) => (along ? [l, t] : [t, l]);
    box(m[0], m[1], yP, yP + 0.14, ...W(0.26, len), LIME);
    box(m[0], m[1], yP + 0.14, yP + 0.55, ...W(0.14, len), BALUSTER);
    box(m[0], m[1], yP + 0.55, yP + 0.65, ...W(0.3, len + 0.04), shade(LIME, 0.95));
  };
  const pier = (u, v) => box(u, v, yP, yP + 0.85, 0.36, 0.36, LIME, { top: shade(LIME, 0.9) });
  for (const sv of [-1, 1]) { rail([-BU, sv * BV], [-2.2, sv * BV]); rail([2.2, sv * BV], [BU, sv * BV]); pier(-2.2, sv * BV); pier(2.2, sv * BV); }
  for (const su of [-1, 1]) { rail([su * BU, -BV], [su * BU, -1.4]); rail([su * BU, 1.4], [su * BU, BV]); pier(su * BU, -1.4); pier(su * BU, 1.4); }
  for (const su of [-1, 1]) for (const sv of [-1, 1]) pier(su * BU, sv * BV);

  // ---- lower roof: the first tier of four slopes, its top hidden in the upper floor ----
  const eave = { fascia: 0.28, fasciaCol: shade(RED, 0.8), hips: true, glazed: true, segs: 3, horns: false };
  S.kind = KIND.TIMBER;
  S.hip(cx, cz, 9.5, 9.0, ang, yE1, 3.0, ROOF, { flare: 0.2, over: 1.4, ...eave, ridgeCol: RIDGE });
  const lowEave = { w: 9.5, d: 9.0, over: 1.4, y: yE1 };

  // ---- upper floor: balcony deck and rail, the walls on the inner columns, windows, the name board ----
  // a painted frieze where the floor meets the lower roof
  box(0, 0, yD - 0.4, yD, 5.1, 4.9, shade(RED, 0.7), { top: shade(RED, 0.6) });
  box(0, 0, yD - 0.36, yD - 0.08, 5.14, 4.94, shade(GOLD, 0.85));
  const RU = 2.5, RV = 2.4;
  for (let i = 0; i <= 8; i++) { // rail posts and the top rail, all round
    const s = (i / 8) * 2 - 1;
    for (const q of [[s * RU, -RV], [s * RU, RV], [-RU, s * RV], [RU, s * RV]]) box(q[0], q[1], yD, yD + 0.68, 0.09, 0.09, RED);
  }
  const R4 = [[-RU, -RV], [RU, -RV], [RU, RV], [-RU, RV]];
  for (let i = 0; i < 4; i++) for (const yy of [yD + 0.66, yD + 0.3]) S.beam(P3(R4[i][0], yy, R4[i][1]), P3(R4[(i + 1) % 4][0], yy, R4[(i + 1) % 4][1]), 0.08, yy > yD + 0.5 ? 0.09 : 0.06, shade(RED, 1.1));
  S.kind = KIND.TIMBER;
  box(0, 0, yD, yE2, 4.2, 4.0, RED, { top: shade(ROOF, 0.8) });
  for (const u of [-2.1, 2.1]) for (const v of [-2.0, 2.0]) box(u, v, yD, yE2, 0.32, 0.32, RED); // the inner columns, proud of the walls
  box(0, 2.02, yE2 - 0.45, yE2 - 0.15, 4.0, 0.04, shade(RED, 1.1));
  box(0, -2.02, yE2 - 0.45, yE2 - 0.15, 4.0, 0.04, shade(RED, 1.1));
  S.kind = KIND.PLAIN;
  // front and back: one wide dark window between pale panels, the name board above it on the front
  for (const sg of [-1, 1]) {
    box(0, sg * 2.02, yD + 0.15, yD + 1.62, 2.5, 0.04, GOLD);
    box(0, sg * 2.04, yD + 0.2, yD + 1.57, 2.36, 0.04, GLASS);
    for (const su of [-1, 1]) box(su * 1.55, sg * 2.03, yD + 0.15, yE2 - 0.5, 0.42, 0.04, CREAM);
  }
  // the two sides: a round window each (a 16-gon of lattice in a gold ring) in a dark square, pale panels beside it
  for (const sg of [-1, 1]) {
    box(sg * 2.02, 0, yD + 0.45, yD + 1.95, 0.04, 1.6, GLASS);
    for (const sv of [-1, 1]) box(sg * 2.03, sv * 1.35, yD + 0.15, yE2 - 0.5, 0.04, 0.8, CREAM);
    for (const [rad, col, off] of [[0.62, GOLD, 2.05], [0.52, LATTICE, 2.07]]) {
      const c = [sg * off, yD + 1.2, 0];
      for (let k = 0; k < 16; k++) {
        const a0 = (k / 16) * Math.PI * 2, a1 = ((k + 1) / 16) * Math.PI * 2;
        const A = P3(c[0], c[1] + Math.sin(a0) * rad, Math.cos(a0) * rad), B = P3(c[0], c[1] + Math.sin(a1) * rad, Math.cos(a1) * rad);
        const n = P(sg, 0); S.tri(P3(c[0], c[1], 0), A, B, col, [n[0] - cx, 0, n[1] - cz]);
      }
    }
  }
  // the name board over the front window: red lacquer, a gilt frame
  box(0, 2.06, yD + 1.7, yD + 2.12, 1.45, 0.05, GOLD);
  box(0, 2.1, yD + 1.74, yD + 2.08, 1.3, 0.04, hex('#a3241b'));

  // ---- upper roof: the second tier, a ceramic crest along the top with a dragon at each end and a pearl between ----
  S.kind = KIND.TIMBER;
  const hU = 1.9, overU = 0.6;
  S.hip(cx, cz, 4.2, 4.0, ang, yE2, hU, ROOF, { flare: 0.2, over: overU, ...eave, ridgeCol: RIDGE });
  const yTop = yE2 + hU;
  S.kind = KIND.PLAIN;
  { // the crest stands on the slopes of the two side faces: its foot follows them down from the top
    const hw = 2.1 + overU, n = 7, L2 = 1.3;
    for (let k = 0; k < n; k++) {
      const u0 = -L2 + (2 * L2 * (k + 0.5)) / n, foot = yTop - hU * (Math.abs(u0) / hw) * 1.25;
      box(u0, 0, foot - 0.05, yTop + 0.32, (2 * L2) / n + 0.01, 0.16, RIDGE);
    }
    for (const sg of [-1, 1]) { // the dragons: a raised head curling in toward the middle
      const a = P3(sg * L2, yTop + 0.1, 0), b = P3(sg * (L2 - 0.15), yTop + 0.7, 0), c = P3(sg * (L2 - 0.45), yTop + 0.62, 0);
      S.beam(a, b, 0.2, 0.26, RIDGE); S.beam(b, c, 0.16, 0.2, shade(RIDGE, 0.9));
    }
    const q = P(0, 0); // the pearl (or sun) on a small stand, the top of the building
    S.cyl(q[0], q[1], yTop + 0.3, yTop + 0.6, 0.12, 0.18, 8, RIDGE);
    S.cyl(q[0], q[1], yTop + 0.6, gy + 11.8, 0.2, 0.06, 8, GOLD);
  }

  // ---- the yard: cannons near the road, the two dismount stelae ----
  for (const su of [-1, 1]) { // small bronze cannons on carved stone carriages, facing each other across the axis
    const u0 = su * 6.5, v0 = 10.9;
    S.kind = KIND.MASONRY;
    box(u0, v0, gy + 0.05, gy + 0.45, 1.1, 0.5, shade(PAL.stone, 0.75));
    S.kind = KIND.PLAIN;
    S.beam(P3(u0 + su * 0.6, gy + 0.55, v0), P3(u0 - su * 1.0, gy + 0.68, v0), 0.24, 0.24, BRONZE);
  }
  S.kind = KIND.MASONRY;
  for (const su of [-1, 1]) { // "khuynh cái hạ mã": a slender stone post on a plinth under a small stone cap
    const u0 = su * 13.4, v0 = 9.6;
    box(u0, v0, gy, gy + 0.25, 0.75, 0.6, PAL.stone, { topKind: KIND.ROAD });
    box(u0, v0, gy + 0.25, gy + 1.25, 0.36, 0.22, shade(PAL.stone, 0.88));
    box(u0, v0, gy + 1.25, gy + 1.4, 0.46, 0.32, shade(PAL.stone, 0.8), { taper: 0.6 });
  }
  // ---- the stele house: four posts and a hipped roof over the poem stele, on OSM's footprint in the lawn ----
  {
    // fallback: where OSM has it, 42.6 m to the right of the outline's centre and 4.3 m forward
    let sc = [o.c[0] - 42.6 * ux - 4.3 * uz, o.c[1] - 42.6 * uz + 4.3 * ux];
    for (const b of data.bld || []) { // the mapped footprint itself, when it is there
      const r = b[0], n = r.length / 2; let x = 0, z = 0;
      for (let i = 0; i < r.length; i += 2) { x += r[i] / 10 / n; z += r[i + 1] / 10 / n; }
      if (Math.hypot(x - sc[0], z - sc[1]) < 4) { sc = [x, z]; break; }
    }
    const g2 = LAND_Y + rise(sc[0], sc[1]);
    const Q = (u, v) => [sc[0] + u * ux - v * uz, sc[1] + u * uz + v * ux];
    const bx = (u, v, y0, y1, su, sv, col, opt) => { const q = Q(u, v); S.box(q[0], q[1], y0, y1, su, sv, ang, col, opt); };
    S.kind = KIND.MASONRY;
    bx(0, 0, g2 - 0.2, g2 + 0.18, 3.6, 3.6, shade(PAL.stone, 0.85), { topKind: KIND.ROAD });
    bx(0, 0, g2 + 0.18, g2 + 0.36, 3.2, 3.2, PAL.stone, { topKind: KIND.ROAD });
    bx(0, 0, g2 + 0.36, g2 + 0.66, 1.2, 0.7, shade(PAL.stone, 0.9));
    bx(0, 0, g2 + 0.66, g2 + 2.1, 0.85, 0.2, shade(PAL.stone, 0.72));
    S.kind = KIND.TIMBER;
    for (const du of [-1.2, 1.2]) for (const dv of [-1.2, 1.2]) { const q = Q(du, dv); S.cyl(q[0], q[1], g2 + 0.36, g2 + 2.75, 0.12, 0.11, 8, shade(RED, 0.8), { cap: false, rot: ang }); }
    S.hip(sc[0], sc[1], 2.4, 2.4, ang, g2 + 2.75, 1.25, hex('#a2683c'), { flare: 0.3, over: 0.65, fascia: 0.18, fasciaCol: shade(RED, 0.7), hips: true, segs: 2, ridgeCol: RIDGE });
  }
  S.kind = KIND.PLAIN;

  // ---- night: the eave lines lit on both tiers, lamps at the front steps, uplights at the platform corners ----
  if (L) {
    const strip = (e, y) => {
      const hu = e.w / 2 + e.over - 0.3, hv = e.d / 2 + e.over - 0.3;
      const K = [[-hu, -hv], [hu, -hv], [hu, hv], [-hu, hv]];
      for (let i = 0; i < 4; i++) L.beam(P3(K[i][0], y, K[i][1]), P3(K[(i + 1) % 4][0], y, K[(i + 1) % 4][1]), 0.13, 0.09, [1, 1, 1]);
    };
    strip(lowEave, yE1 - 0.28 - 0.07);
    strip({ w: 4.2, d: 4.0, over: overU }, yE2 - 0.28 - 0.07);
    // the column-head beam, washed from below
    for (let i = 0; i < 4; i++) L.beam(P3(C[i][0], ty - 0.2, C[i][1]), P3(C[(i + 1) % 4][0], ty - 0.2, C[(i + 1) % 4][1]), 0.1, 0.08, [1, 1, 1]);
    const mesh = new THREE.Mesh(L.geometry(), lightMaterial(0xffae42, 1.2));
    mesh.renderOrder = 19;
    mesh.userData.landmark = id;
    group.add(mesh);
    for (const sv of [-1, 1]) for (const su of [-1, 1]) { const q = P(su * 2.2, sv * BV); lamp.push(q[0], yP + 1.1, q[1]); lampCol.push(1.0, 0.72, 0.34); }
    for (const su of [-1, 1]) for (const sv of [-1, 1]) { const q = P(su * (PU + 0.4), sv * (PV + 0.4)); lamp.push(q[0], gy + 0.3, q[1]); lampCol.push(1.0, 0.8, 0.45); }
    const pts = glowPoints(lamp, lampCol, 7);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
  return null;
}
