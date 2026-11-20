import { Buf, KIND, hex, shade, unflat, obb } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';

// Phu Văn Lâu (1819, Gia Long; blown down 1904 and rebuilt as before under Thành Thái; restored 2014–2016), the
// riverside pavilion where royal edicts and exam results were posted, on the Citadel's axis between Kỳ Đài and
// Nghênh Lương Đình. Sources and estimates: docs/places/phuvanlau.md.
//   - a two-storey timber lầu on 16 dark-red ironwood columns (4 × 4); the four middle ones rise through both floors
//   - ground floor open all round, closed only by a 65 cm balustrade washed pale yellow, on a marble-paved platform
//   - eight roof slopes in two tiers (two hipped roofs), yellow glazed tubular tiles (hoàng lưu ly)
//   - upper floor walled in timber boards, a wooden balcony rail round it; square windows on the front and back,
//     round ones on the two sides, and the gilt red-lacquered "Phu Văn Lâu" board over the front windows
//   - 11.8 m to the top (docs/heights-reference.json; vinwonders gives 11.67 m)
//   - in the yard: two small bronze cannons facing each other before the front, the two "khuynh cái hạ mã" stelae on
//     either flank, and Thiệu Trị's 1843 stele house for the poem Hương Giang hiểu phiếm on the right-hand side.
// The OSM outline (way 531031520, 13.6 × 13.1 m) is taken as the lower roof's eave line.
export const id = 'phuvanlau';

const RED = hex('#7a2a20'); // dark-red lacquered columns and timber
const BOARD = hex('#8c3a28'); // the upper floor's plank walls
const LIME = hex('#e4d08f'); // the pale yellow balustrade
const MARBLE = hex('#d9d3c6');
const ROOF = PAL.imperialRoof;
const RIDGE = hex('#f1d77a');
const GOLD = hex('#d8b04a');
const LATTICE = hex('#4a3524');
const BRONZE = hex('#5d4a2e');

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
  const [cx, cz] = o.c;
  const P = (u, v) => [cx + u * ux - v * uz, cz + u * uz + v * ux];
  const P3 = (u, y, v) => { const q = P(u, v); return [q[0], y, q[1]]; };
  const box = (u, v, y0, y1, su, sv, col, opt) => { const q = P(u, v); S.box(q[0], q[1], y0, y1, su, sv, ang, col, opt); };
  const gy = LAND_Y + rise(cx, cz);

  const L = group && THREE ? new Buf(600) : null; // night: strips under the eaves
  const lamp = [], lampCol = [];

  // ---- the yard: cement chequer tiles round the platform ----
  S.kind = KIND.ROAD;
  box(0, 0.5, gy - 0.3, gy + 0.05, 25, 21, hex('#bdb6a8'), { topKind: KIND.ROAD });
  for (let i = -5; i <= 5; i++) box(i * 2.3, 0.5, gy + 0.05, gy + 0.06, 0.08, 21, hex('#a9a293'));

  // ---- platform: 0.55 m, marble top, three steps up the middle of the front and back ----
  const pH = 0.55, yP = gy + pH;
  const CU = [-5.0, -2.3, 2.3, 5.0], CV = [-4.75, -2.2, 2.2, 4.75]; // column lines (bays 2.7 / 4.6 / 2.7 m)
  S.kind = KIND.MASONRY;
  box(0, 0, gy - 0.3, yP, 11.9, 11.4, PAL.stone, { top: MARBLE, topKind: KIND.ROAD });
  for (const sg of [-1, 1]) for (let k = 1; k <= 3; k++) {
    box(0, sg * (5.7 + k * 0.32 - 0.16), gy - 0.3, yP - k * (pH / 4), 4.0, 0.32, shade(MARBLE, 0.96), { topKind: KIND.ROAD });
  }

  // ---- ground floor: 16 columns, the 65 cm lime-washed balustrade between the outer ones ----
  const yE1 = yP + 3.5; // lower eave
  const yD = gy + 5.55; // upper floor
  const yE2 = yD + 2.75; // upper eave
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
    const iu = Math.max(-2.3, Math.min(2.3, u)), iv = Math.max(-2.2, Math.min(2.2, v));
    S.beam(P3(u, ty, v), P3(iu, ty + 0.25, iv), 0.18, 0.26, shade(RED, 0.8));
  }
  // the ceiling of the ground floor, seen from below between the column lines
  box(0, 0, yE1 - 0.12, yE1 - 0.02, 10.2, 9.7, shade(RED, 0.5), { bottom: true });
  // balustrade: solid lime-washed masonry with a coping, open at the central bay front and back
  S.kind = KIND.MASONRY;
  const rail = (a, b) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.3) return;
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const along = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
    box(m[0], m[1], yP, yP + 0.58, along ? len : 0.24, along ? 0.24 : len, LIME);
    box(m[0], m[1], yP + 0.58, yP + 0.65, along ? len + 0.06 : 0.32, along ? 0.32 : len + 0.06, shade(LIME, 0.9));
  };
  for (let i = 0; i < 3; i++) {
    for (const sv of [-1, 1]) { if (i !== 1) rail([CU[i] + 0.17, sv * 4.75], [CU[i + 1] - 0.17, sv * 4.75]); }
    for (const su of [-1, 1]) rail([su * 5.0, CV[i] + 0.17], [su * 5.0, CV[i + 1] - 0.17]);
  }

  // ---- lower roof: the first tier of four slopes, its top hidden in the upper floor ----
  const eave = { fascia: 0.28, fasciaCol: shade(RED, 0.8), hips: true, glazed: true, segs: 3 };
  S.kind = KIND.TIMBER;
  S.hip(cx, cz, 10.0, 9.5, ang, yE1, 2.7, ROOF, { flare: 0.5, over: 1.8, ...eave, ridgeCol: RIDGE });
  const lowEave = { w: 10.0, d: 9.5, over: 1.8, y: yE1 };

  // ---- upper floor: balcony deck and rail, plank walls, windows, the name board ----
  box(0, 0, yD - 0.18, yD, 6.4, 6.2, shade(RED, 0.7));
  for (let i = 0; i <= 8; i++) { // rail posts and the top rail, all round at ±3.1
    const s = -3.1 + (6.2 * i) / 8;
    for (const q of [[s, -3.0], [s, 3.0], [-3.1, s * 0.97], [3.1, s * 0.97]]) box(q[0], q[1], yD, yD + 0.72, 0.1, 0.1, RED);
  }
  const R4 = [[-3.1, -3.0], [3.1, -3.0], [3.1, 3.0], [-3.1, 3.0]];
  for (let i = 0; i < 4; i++) for (const yy of [yD + 0.7, yD + 0.32]) S.beam(P3(R4[i][0], yy, R4[i][1]), P3(R4[(i + 1) % 4][0], yy, R4[(i + 1) % 4][1]), 0.09, yy > yD + 0.5 ? 0.1 : 0.06, shade(RED, 1.1));
  S.kind = KIND.TIMBER;
  box(0, 0, yD, yE2, 4.6, 4.4, BOARD, { top: shade(ROOF, 0.8) });
  for (const u of [-2.3, 2.3]) for (const v of [-2.2, 2.2]) box(u, v, yD, yE2, 0.3, 0.3, RED); // the inner columns, proud of the boards
  S.kind = KIND.PLAIN;
  // front and back: three square lattice windows each
  for (const sg of [-1, 1]) for (const u of [-1.35, 0, 1.35]) {
    box(u, sg * 2.23, yD + 0.85, yD + 1.95, 1.0, 0.04, GOLD);
    box(u, sg * 2.25, yD + 0.9, yD + 1.9, 0.86, 0.04, LATTICE);
  }
  // the two sides: one round window each (a 16-gon of lattice in a gold ring)
  for (const sg of [-1, 1]) for (const [rad, col, off] of [[0.62, GOLD, 2.33], [0.52, LATTICE, 2.35]]) {
    const c = [sg * off, yD + 1.4, 0];
    for (let k = 0; k < 16; k++) {
      const a0 = (k / 16) * Math.PI * 2, a1 = ((k + 1) / 16) * Math.PI * 2;
      const A = P3(c[0], c[1] + Math.sin(a0) * rad, Math.cos(a0) * rad), B = P3(c[0], c[1] + Math.sin(a1) * rad, Math.cos(a1) * rad);
      const n = P(sg, 0); S.tri(P3(c[0], c[1], 0), A, B, col, [n[0] - cx, 0, n[1] - cz]);
    }
  }
  // the name board over the front windows: red lacquer, a gilt frame
  box(0, 2.26, yD + 2.02, yD + 2.6, 1.9, 0.05, GOLD);
  box(0, 2.3, yD + 2.07, yD + 2.55, 1.7, 0.04, hex('#a3241b'));

  // ---- upper roof: the second tier, horns at the corners, a gourd finial on the short ridge ----
  S.kind = KIND.TIMBER;
  S.hip(cx, cz, 4.6, 4.4, ang, yE2, 3.05, ROOF, { flare: 0.5, over: 1.5, ...eave, ridgeCol: RIDGE });
  const yTop = yE2 + 3.05;
  S.kind = KIND.PLAIN;
  { const q = P(0, 0); S.cyl(q[0], q[1], yTop - 0.05, yTop + 0.18, 0.22, 0.2, 8, RIDGE); S.cyl(q[0], q[1], yTop + 0.18, gy + 11.8, 0.16, 0.02, 8, GOLD); }

  // ---- the yard: cannons, the two dismount stelae, Thiệu Trị's stele house (right-hand side, u < 0) ----
  for (const su of [-1, 1]) { // small bronze cannons on low carriages, facing each other across the front
    const u0 = su * 3.6, v0 = 7.9;
    box(u0, v0, gy + 0.05, gy + 0.35, 0.7, 0.55, shade(RED, 0.7));
    S.beam(P3(u0 + su * 0.55, gy + 0.5, v0), P3(u0 - su * 0.85, gy + 0.55, v0), 0.24, 0.24, BRONZE);
  }
  S.kind = KIND.MASONRY;
  for (const su of [-1, 1]) { // "khuynh cái hạ mã": a stone slab on a plinth under a small tiled cap
    const u0 = su * 10.2, v0 = 7.5;
    box(u0, v0, gy, gy + 0.45, 1.3, 0.7, PAL.stone, { topKind: KIND.ROAD });
    box(u0, v0, gy + 0.45, gy + 2.0, 0.78, 0.24, shade(PAL.stone, 0.88));
    box(u0, v0, gy + 2.0, gy + 2.12, 0.98, 0.42, shade(PAL.stone, 0.8));
    const q = P(u0, v0); S.hip(q[0], q[1], 0.9, 0.36, ang, gy + 2.12, 0.28, ROOF, { over: 0.08, glazed: true });
  }
  { // the stele house: a square masonry pavilion on a low base, open front and back, the poem stele inside
    const u0 = -10.6, v0 = -1.5, s = 3.6;
    box(u0, v0, gy - 0.2, gy + 0.4, s + 1.0, s + 1.0, PAL.stone, { topKind: KIND.ROAD });
    for (const du of [-1, 1]) box(u0 + du * (s / 2 - 0.25), v0, gy + 0.4, gy + 3.1, 0.5, s, hex('#d8c99a'));
    box(u0, v0, gy + 3.1, gy + 3.4, s + 0.2, s + 0.2, shade(RED, 0.75));
    box(u0, v0, gy + 0.4, gy + 0.8, 1.4, 0.8, shade(PAL.stone, 0.9));
    box(u0, v0, gy + 0.8, gy + 2.6, 1.0, 0.26, shade(PAL.stone, 0.75));
    const q = P(u0, v0);
    S.kind = KIND.TIMBER;
    S.hip(q[0], q[1], s, s, ang, gy + 3.4, 1.6, ROOF, { flare: 0.5, over: 0.7, ...eave, segs: 2, ridgeCol: RIDGE });
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
    strip({ w: 4.6, d: 4.4, over: 1.5 }, yE2 - 0.28 - 0.07);
    // the balustrade's coping and the inner column heads, washed from below
    for (let i = 0; i < 4; i++) L.beam(P3(C[i][0], ty - 0.2, C[i][1]), P3(C[(i + 1) % 4][0], ty - 0.2, C[(i + 1) % 4][1]), 0.1, 0.08, [1, 1, 1]);
    const mesh = new THREE.Mesh(L.geometry(), lightMaterial(0xffae42, 1.2));
    mesh.renderOrder = 19;
    mesh.userData.landmark = id;
    group.add(mesh);
    for (const sv of [-1, 1]) for (const su of [-1, 1]) { const q = P(su * 1.6, sv * 6.9); lamp.push(q[0], yP + 1.5, q[1]); lampCol.push(1.0, 0.72, 0.34); }
    for (const [u, v] of C) { const q = P(u * 1.12, v * 1.12); lamp.push(q[0], gy + 0.3, q[1]); lampCol.push(1.0, 0.8, 0.45); }
    const pts = glowPoints(lamp, lampCol, 7);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
  return null;
}
