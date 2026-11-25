import { KIND, Buf, hex, shade, inRing, unflat } from '../../geo/buf.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints, lightMaterial } from '../../geo/materials.ts';
import { LAND_Y, PAL } from '../../config.ts';

// Phố đi bộ Nguyễn Đình Chiểu — the riverside walking street on the south bank of the Hương, running upstream from
// the foot of cầu Trường Tiền to the head of the ironwood boardwalk, with the park strip between it and Lê Lợi.
// docs/places/ndchieu.md has the sources.
//
// Confirmed:
//  - plan: OSM way 39418535 (highway=footway, name Nguyễn Đình Chiểu, surface=paving_stones, smoothness=excellent),
//    ~215 m from the bridge foot to a round footway (OSM 1167513743) at the boardwalk stairs; a second round footway
//    (OSM 1167513766) with two spurs (1167513765, 1167513764) in the park towards Lê Lợi; a park path (1167513730)
//    carries on upstream behind the boardwalk to Bà Huyện Thanh Quan. Two cannons mapped in the strip
//    (OSM nodes 13653718203, 13653730801). The mapped riverbank here is one straight edge (hue.json land ring).
//  - brick/stone-paved, lit every night, food and souvenir stalls, open 16:00–22:00 (all day Sunday), closed to
//    motorbikes (mia.vn, vinwonders.com); "genre sculptures" and benches facing the river, LED lights that change
//    colour (travel listings via search summaries, not read in full).
//  - seen on the Google satellite and Street View (2026 rebuild, scratch/rebuild/ndchieu): the paving runs from the
//    bank ~12 m inland along the Điềm Phùng Thị garden and ~13–14 m beyond it, light grey stone slabs; a stone
//    balustrade (turned balusters between square piers, ~1 m) on the bank; a row of tall palms in small grass squares
//    a couple of metres in from it; big shade trees (banyan-like, trunks whitewashed) along the inland edge of the
//    paving; grey lamp posts with a flat disc lantern near the bank and along the tree line, and a taller pole with
//    small bracket lamps among them; café parasols (cream canvas, timber poles) in the park behind the tree line at
//    the Tứ Tượng end. No fixed kiosk row shows on the satellite, so none is drawn (the stalls are evening carts).
// Estimated (no drawing or survey found):
//  - spacing: palms every 9 m, lamps every 18 m on each side, a tall pole every 54 m, shade trees every 12 m, a
//    bench between each pair of bank lamps; a colour-changing LED line along the bank edge; two figure sculptures
//    on plinths and one in the middle of the inner roundel; the strip beyond planted as lawn with shade trees.
// Not drawn here: the boardwalk (golim, boardwalk.js), cầu Trường Tiền (truongtien.js), the villas and the Điềm
// Phùng Thị art centre with its mapped garden (the OSM park 239566225 by the bridge foot), Lê Lợi itself.
export const id = 'ndchieu';

// the riverbank, straight between these two mapped land-ring vertices (m); u runs upstream, w inland
const B0 = [104.4, 128.2], B1 = [-59.6, 274.3];
const BL = Math.hypot(B1[0] - B0[0], B1[1] - B0[1]);
const U = [(B1[0] - B0[0]) / BL, (B1[1] - B0[1]) / BL], W = [U[1], -U[0]]; // W = (0.665, 0.747): inland
const ANG = Math.atan2(U[1], U[0]);
const P = (s, v): [number, number] => [B0[0] + U[0] * s + W[0] * v, B0[1] + U[1] * s + W[1] * v];
const gY = (x, z) => LAND_Y + rise(x, z);

const EDGE = 0.55, S0 = 0, S1 = BL + 2.5; // walk band v ∈ [EDGE, vIn(s)]
const S_DPT = 66; // up to here the Điềm Phùng Thị garden lies behind the walk, and the paving is narrower
const vIn = (s) => (s < S_DPT ? 12.0 : 13.8); // inland edge of the paving (satellite)
const PAVE_Y = 0.1;
const ROUND_W = { c: [-62.15, 294.55], r: 8.45 }; // OSM 1167513743, at the boardwalk stairs
const ROUND_E = { c: [56.45, 237.7], r: 6.5 }; // OSM 1167513766
const SPURS = [[[23.5, 204.5], [52.2, 232.7]], [[60.5, 242.8], [74.6, 257.8]]];
const WEST = [[-67.8, 300.9], [-154.4, 394.3], [-161.1, 401.5]]; // OSM 1167513730
const CANNONS = [[14.9, 301.3], [32.2, 285.6]];
// at the bridge end the bank turns north to cầu Trường Tiền: the walk runs on along it to the bridge's upstream side
// (the satellite shows the paving and a stepped quay reaching the abutment)
const BR = [125.3, 100.8]; // the next land-ring vertex
const E2 = [(BR[0] - B0[0]) / Math.hypot(BR[0] - B0[0], BR[1] - B0[1]), (BR[1] - B0[1]) / Math.hypot(BR[0] - B0[0], BR[1] - B0[1])];
const N2 = [-E2[1], E2[0]]; // inland of that stretch
const TT = [0.7311, 0.6823]; // cầu Trường Tiền's axis (hue.json truongtien a→b), through the origin
const TT_KEEP = 6.6; // the deck's half width (5.7 m) and a margin: the apron stops at this offset from the axis
const APRON_L = (() => { // along the bank stretch from B0 to where it meets that offset
  const off = (p) => -TT[1] * p[0] + TT[0] * p[1];
  return (off(B0) - TT_KEEP) / (off(B0) - off(BR)) * Math.hypot(BR[0] - B0[0], BR[1] - B0[1]);
})();
const Q = (t, n): [number, number] => [B0[0] + E2[0] * t + N2[0] * n, B0[1] + E2[1] * t + N2[1] * n];
// Điềm Phùng Thị's mapped garden (OSM 239566225): someone else's; kept out of lawn and trees
const DPT = [[63.5, 180.9], [84.1, 162.3], [113.4, 135.7], [154.6, 180.6], [104.7, 225.8]];

const C = {
  pave: hex('#cdc2b0'), band: hex('#a89e8f'), kerb: hex('#cdc6b8'), granite: hex('#a9a39a'), graniteTop: hex('#c4bfb5'),
  balus: hex('#bdb9af'), pole: hex('#8c9196'), disc: hex('#e9e6dc'), trunk: hex('#7d6e5d'), frond: hex('#577a3e'),
  path: hex('#c2b5a2'), lawn: hex(PAL.green.park), bed: hex('#5f7d45'), flower: hex('#c8564a'),
  wood: hex('#8a5a34'), bronze: hex('#5d4a35'), plinth: hex('#d2ccc0'),
  canopy: hex('#ece5d3'), counter: hex('#9a6b45'), cannon: hex('#3a3a36'),
  brick: hex('#8e4a34'), brickTop: hex('#a35a40'), terrace: hex('#c9bba6'), joint: hex('#a69c8d'),
  steel: hex('#c9ccce'), crownshaft: hex('#6f7d4a'), dead: hex('#8a7550'),
};
const CAFE = [138, 168]; // the café terrace at the inland edge of the walk (sv-ndc-south: parasols, brick edge)

// the generic riverside lamps stay off the walk: it has its own (places/index.js lightAreas)
export function lightAreas() {
  const v1 = 15.5;
  const walk = [P(S1 + 12, -2), P(-1, -2), Q(APRON_L + 1, -2), apronCorner(v1), P(-1, v1), P(S1 + 12, v1)];
  const west = WEST.slice(1).map((b, i) => {
    const a = WEST[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l, h = 4;
    return [[a[0] - ux * h - uz * h, a[1] - uz * h + ux * h], [b[0] + ux * h - uz * h, b[1] + uz * h + ux * h], [b[0] + ux * h + uz * h, b[1] + uz * h - ux * h], [a[0] - ux * h + uz * h, a[1] - uz * h - ux * h]];
  });
  const r = ROUND_W.r + 4, round = Array.from({ length: 12 }, (_, k) => [ROUND_W.c[0] + Math.cos(k * Math.PI / 6) * r, ROUND_W.c[1] + Math.sin(k * Math.PI / 6) * r]);
  return [walk, round, ...west];
}
// the apron's inland corner: from the bank at the bridge's upstream side, inland parallel to the bridge, to the line
// v = v1 of the walk
function apronCorner(v1) {
  const b = Q(APRON_L, EDGE), dv = TT[0] * W[0] + TT[1] * W[1];
  const vb = (b[0] - B0[0]) * W[0] + (b[1] - B0[1]) * W[1], t = (v1 - vb) / dv;
  return [b[0] + TT[0] * t, b[1] + TT[1] * t];
}

export function build({ data, S, group, THREE }) {
  const lampPos = [], lampCol = [];
  const lampAt = (x, y, z, c = [1, 0.84, 0.6]) => { lampPos.push(x, y, z); lampCol.push(...c); };
  S.kind = KIND.PLAIN;
  S.base = 0;

  // keep-outs for the trees: mapped buildings and roads nearby
  const blds = [];
  for (const b of data.bld || []) {
    const r = unflat(Array.isArray(b[0]) ? b[0] : b);
    if (r.length && Math.hypot(r[0][0] - 20, r[0][1] - 260) < 220) blds.push(r);
  }
  const nearBld = (x, z, m) => blds.some((r) => inRing(x, z, r) || r.some((q, i) => segD([x, z], r[(i || r.length) - 1], q) < m));

  // ---- the lawn of the park strip (under the paving, behind it to the Lê Lợi pavement) ----
  S.kind = KIND.GROUND;
  const lawn = (sa, sb, va, vb) => {
    for (let s = sa; s < sb - 1e-6; s += 10) for (let v = va; v < vb - 1e-6; v += 10) {
      const s2 = Math.min(sb, s + 10), v2 = Math.min(vb, v + 10);
      const q = [P(s, v), P(s2, v), P(s2, v2), P(s, v2)].map((p) => [p[0], gY(p[0], p[1]) + 0.03, p[1]]);
      S.quad(q[0], q[3], q[2], q[1], C.lawn, [0, 1, 0]);
    }
  };
  lawn(S0, S_DPT, vIn(0), 15); // by the bridge only a verge: the art centre's garden lies behind
  lawn(S_DPT, S1 + 14, vIn(S1), 73);

  // ---- the walking street: paving, banding, kerb, sitting edge on the bank ----
  const n0 = S.n;
  S.kind = KIND.ROAD;
  const v0 = EDGE;
  const quadSV = (sa, sb, va, vb, y, col) => {
    const q = [P(sa, va), P(sb, va), P(sb, vb), P(sa, vb)].map((p) => [p[0], gY(p[0], p[1]) + y, p[1]]);
    S.quad(q[0], q[3], q[2], q[1], col, [0, 1, 0]);
  };
  // warm light-grey stone slabs (Street View) with a darker band every 6 m, laid in a 1.2 m grid of joints
  for (let s = S0; s < S1 - 1e-6; s += 6) {
    const e = Math.min(S1, s + 6, s < S_DPT && s + 6 > S_DPT ? S_DPT : Infinity), m = Math.min(e, s + 0.3), v1 = vIn(s);
    quadSV(s, m, v0, v1, PAVE_Y + 0.004, C.band);
    if (e > m) quadSV(m, e, v0, v1, PAVE_Y, C.pave);
    for (let v = v0 + 1.2; v < v1 - 0.3; v += 1.2) quadSV(m, e, v - 0.03, v + 0.03, PAVE_Y + 0.003, C.joint);
    for (let t = m + 1.2; t < e - 0.3; t += 1.2) quadSV(t - 0.03, t + 0.03, v0, v1, PAVE_Y + 0.003, C.joint);
    if (e < s + 6) s = e - 6; // restart the bands at the step in width
  }
  // the apron at the bridge end, out to the bridge's upstream side
  {
    const A = P(S0, v0), B = Q(APRON_L, EDGE), Cc = apronCorner(vIn(0)), D = P(S0, vIn(0));
    const q = [A, B, Cc, D].map((p) => [p[0], gY(p[0], p[1]) + PAVE_Y, p[1]]);
    S.quad(q[0], q[1], q[2], q[3], C.pave, [0, 1, 0]);
    const L = Math.hypot(Cc[0] - B[0], Cc[1] - B[1]);
    for (let t = 1.2; t < APRON_L - 0.3; t += 1.2) { // joints across the apron, parallel to the bank stretch
      const a = Q(t, EDGE), bb = [a[0] + (D[0] - A[0]), a[1] + (D[1] - A[1])];
      const ux = E2[0] * 0.03, uz = E2[1] * 0.03;
      const qq = [[a[0] - ux, a[1] - uz], [a[0] + ux, a[1] + uz], [bb[0] + ux, bb[1] + uz], [bb[0] - ux, bb[1] - uz]].map((p) => [p[0], gY(p[0], p[1]) + PAVE_Y + 0.003, p[1]]);
      if (L > 0) S.quad(qq[0], qq[1], qq[2], qq[3], C.joint, [0, 1, 0]);
    }
  }
  S.kind = KIND.MASONRY;
  // kerb on the park side, stepping out where the art centre's garden ends (kept under 0.2 m: inside the paved range a
  // taller face would keep the shade trees off the edge of the walk, src/geo/city.js coverOf)
  for (const [sa, sb] of ([[S0, S_DPT], [S_DPT, S1]] as any[])) {
    for (let s = sa; s < sb - 1e-6; s += 12) {
      const e = Math.min(sb, s + 12), c = P((s + e) / 2, vIn(s) + 0.15);
      S.box(c[0], c[1], gY(c[0], c[1]), gY(c[0], c[1]) + PAVE_Y + 0.09, e - s, 0.3, ANG, C.kerb);
    }
  }
  {
    const a = P(S_DPT, vIn(0)), b = P(S_DPT, vIn(S1)), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    S.box(c[0], c[1], gY(c[0], c[1]), gY(c[0], c[1]) + PAVE_Y + 0.09, 0.3, vIn(S1) - vIn(0) + 0.3, ANG, C.kerb);
  }
  // the stone balustrade on the embankment, from the bridge's upstream side to the boardwalk head (Street View)
  balustrade(S, Q(APRON_L, EDGE / 2), Q(0, EDGE / 2));
  balustrade(S, P(0, EDGE / 2), P(BL, EDGE / 2));
  // and below it at the bridge end, the stepped quay down toward the water (satellite)
  for (let k = 1; k <= 3; k++) {
    const c = Q(APRON_L / 2, -0.45 * k + 0.2), y = gY(c[0], c[1]);
    S.box(c[0], c[1], y - 0.3 - 0.5 * k - 0.4, y - 0.3 - 0.5 * (k - 1), APRON_L, 0.45, Math.atan2(E2[1], E2[0]), C.granite, { top: C.graniteTop });
  }
  // the walk turns inland at its upstream end to the roundel at the boardwalk stairs
  S.kind = KIND.ROAD;
  {
    const a = P(S1 - 4, v0 + 4), b = ROUND_W.c, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    S.box(c[0], c[1], gY(c[0], c[1]) - 0.2, gY(c[0], c[1]) + PAVE_Y, len, 6, ang, C.pave);
  }
  roundel(S, ROUND_W, 2.6, PAVE_Y + 0.01);
  // the park paths: spurs to the inner roundel, and the path upstream behind the boardwalk
  for (const sp of SPURS) path(S, sp, 3, PAVE_Y - 0.02);
  roundel(S, ROUND_E, 2.2, PAVE_Y - 0.01);
  path(S, WEST, 3, PAVE_Y - 0.02);
  (S.paved = S.paved || []).push([n0, S.n]);

  // ---- roundel middles: planted beds; a figure on a plinth in the inner one ----
  S.kind = KIND.GROUND;
  for (const R of [ROUND_W, ROUND_E]) {
    const ri = R.r - (R === ROUND_W ? 2.6 : 2.2) / 2 - 0.15, [x, z] = R.c, y = gY(x, z);
    S.kind = KIND.MASONRY;
    S.cyl(x, z, y, y + 0.32, ri, ri, 20, C.kerb);
    S.kind = KIND.GROUND;
    S.cyl(x, z, y + 0.32, y + 0.38, ri - 0.15, ri - 0.25, 20, C.bed);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2, rr = ri * 0.62;
      S.cyl(x + Math.cos(a) * rr, z + Math.sin(a) * rr, y + 0.38, y + 0.7, 0.45, 0.2, 6, C.flower);
    }
  }
  S.kind = KIND.PLAIN;
  figure(S, ROUND_E.c[0], ROUND_E.c[1], gY(...(ROUND_E.c as [number, number])) + 0.38, 1.1);

  // ---- disc lamps by the bank and along the tree line, a tall pole every third bank lamp, benches between the bank
  // lamps facing the river, palms in grass squares near the bank ----
  for (let s = S0 + 6, k = 0; s < S1 - 2; s += 18, k++) {
    const [x, z] = P(s, EDGE + 1.0), y = gY(x, z) + PAVE_Y;
    lampPost(S, x, z, y, ANG, lampAt);
    if (k % 3 === 1) { const [tx, tz] = P(s + 2.2, EDGE + 1.0); tallPole(S, tx, tz, gY(tx, tz) + PAVE_Y, ANG, lampAt); }
    const [bx, bz] = P(s + 9, EDGE + 1.4);
    if (s + 9 < S1 - 2) bench(S, bx, bz, gY(bx, bz) + PAVE_Y, ANG + Math.PI);
    const si = s + 9;
    if (si < S1 - 3) { const [ix, iz] = P(si, vIn(si) - 0.9); lampPost(S, ix, iz, gY(ix, iz) + PAVE_Y, ANG, lampAt); }
  }
  for (let s = S0 + 2.5, k = 0; s < S1 - 3; s += 9, k++) {
    const [x, z] = P(s, EDGE + 2.6), y = gY(x, z) + PAVE_Y;
    S.kind = KIND.MASONRY;
    S.box(x, z, y - 0.05, y + 0.12, 1.5, 1.5, ANG, C.kerb);
    S.kind = KIND.GROUND;
    S.box(x, z, y + 0.12, y + 0.14, 1.26, 1.26, ANG, C.lawn);
    palm(S, x, z, y + 0.12, 11.5 + ((k * 7) % 5) * 0.7, k);
  }
  // round the stair roundel, and along the upstream park path
  for (let k = 0; k < 4; k++) {
    const a = ANG + Math.PI / 4 + (k * Math.PI) / 2, [cx, cz] = ROUND_W.c, r = ROUND_W.r + 0.7;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    lampPost(S, x, z, gY(x, z), a, lampAt);
  }
  {
    const L = segs(WEST);
    for (let d = 10, k = 0; d < L.total - 4; d += 20, k++) {
      const { p, a } = L.at(d), nx = -Math.sin(a), nz = Math.cos(a);
      const x = p[0] + nx * 2.1, z = p[1] + nz * 2.1;
      lampPost(S, x, z, gY(x, z), a, lampAt);
      const q = L.at(Math.min(L.total - 2, d + 10));
      const bx = q.p[0] - Math.sin(q.a) * -2.0, bz = q.p[1] + Math.cos(q.a) * -2.0;
      bench(S, bx, bz, gY(bx, bz), q.a);
    }
  }

  // ---- the café terrace at the inland edge of the walk, opposite the Tứ Tượng park (satellite: HUE riverside;
  // sv-ndc-south: cream parasols on timber poles right at the walk's edge, a red-brown brick edge) ----
  {
    const [sa, sb] = CAFE, va = vIn(sa) + 0.3, vb = 20.5;
    S.kind = KIND.ROAD;
    const n1 = S.n;
    quadSV(sa, sb, va, vb, 0.06, C.terrace);
    (S.paved = S.paved || []).push([n1, S.n]);
    S.kind = KIND.MASONRY;
    // a low brick edge round its inland side and ends, open to the walk
    const wall = (a, b?) => {
      const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], l = Math.hypot(b[0] - a[0], b[1] - a[1]), y = gY(c[0], c[1]);
      S.box(c[0], c[1], y - 0.1, y + 0.45, l, 0.3, Math.atan2(b[1] - a[1], b[0] - a[0]), C.brick, { top: C.brickTop });
    };
    wall(P(sa, vb), P(sb, vb));
    wall(P(sa, va + 1.5), P(sa, vb));
    wall(P(sb, va + 1.5), P(sb, vb));
    S.kind = KIND.PLAIN;
    for (const [s, v] of ([[144.5, 12.9], [156.5, 12.9], [141, 16.4], [146, 17.8], [152, 16.6], [157, 18.2], [162.5, 16.6], [149.5, 19.4], [165, 19.2]] as any[])) {
      const [x, z] = P(s, v);
      if (nearBld(x, z, 2)) continue;
      parasol(S, x, z, gY(x, z) + (v > vIn(s) ? 0.06 : PAVE_Y), ANG + s, lampAt);
    }
  }

  // ---- sculptures on the lawn by the walk, and the two mapped cannons ----
  for (const s of [92, 216]) {
    const [x, z] = P(s, vIn(s) + 3.5), y = gY(x, z);
    S.kind = KIND.MASONRY;
    S.box(x, z, y, y + 1.1, 1.3, 1.3, ANG, C.plinth);
    S.kind = KIND.PLAIN;
    figure(S, x, z, y + 1.1, s > 150 ? 1.2 : 1.0);
  }
  for (const [x, z] of CANNONS) cannon(S, x, z, gY(x, z), ANG + Math.PI / 2);

  // ---- shade trees: a row behind the walk and loose groups on the lawn (pushed into data.trees for populate) ----
  if (Array.isArray(data.trees)) {
    // the city's generated planting (build-data fills the park green, which takes in the walk: the footway is only a
    // line in OSM): none on the paving or the bank, and broad shade trees rather than willows in the strip behind.
    // Records are emptied (scale 0) or retyped in place, never removed, so every other tree keeps its index and look.
    const T = data.trees, n0 = T.length;
    for (let i = 0; i < n0; i += 4) {
      const dx = T[i] / 10 - B0[0], dz = T[i + 1] / 10 - B0[1], s = dx * U[0] + dz * U[1], v = dx * W[0] + dz * W[1];
      if (s < -24 || s > S1 + 4 || v < -3 || v > 30) continue;
      if (v < vIn(s) + 1 || (s > CAFE[0] - 1 && s < CAFE[1] + 1 && v < 21.5)) T[i + 2] = 0;
      else if (T[i + 3] === 0 || T[i + 3] === 1) T[i + 3] = 4;
    }
    // the big old banyans along the inland edge of the paving (kind 5, foliage.js: wide low crowns over half the walk,
    // whitewashed feet)
    const row = [];
    for (let s = 7; s < S1 - 2; s += 12) row.push(P(s, vIn(s) - 1.6));
    const pts = [];
    let k = 0;
    for (let s = 70; s < S1 + 10; s += 14) for (let v = 22; v < 70; v += 13) {
      const j = Math.sin(s * 12.9898 + v * 78.233) * 43758.5453, f = j - Math.floor(j);
      pts.push(P(s + (f - 0.5) * 8, v + (f - 0.5) * 6));
    }
    const roads = (data.roads || []).filter((r) => !r[1]).map((r) => unflat(r[2]));
    const onRoad = (x, z) => roads.some((pl) => pl.some((q, i) => i > 0 && segD([x, z], pl[i - 1], q) < 3.2));
    row.forEach(([x, z], i) => {
      if (nearBld(x, z, 6.5) || onRoad(x, z)) return;
      data.trees.push(Math.round(x * 10), Math.round(z * 10), 17 + (i % 3) * 2, 5);
    });
    for (const [x, z] of pts) {
      if (inRing(x, z, DPT) || nearBld(x, z, 6.5) || onRoad(x, z)) continue;
      if (Math.hypot(x - ROUND_E.c[0], z - ROUND_E.c[1]) < ROUND_E.r + 3) continue;
      data.trees.push(Math.round(x * 10), Math.round(z * 10), 11 + (k % 4), k % 3 === 0 ? 2 : 4);
      k++;
    }
  }

  // ---- after dark: lamps and stalls glow; a colour-changing LED line runs along the bank edge ----
  const pts = glowPoints(lampPos, lampCol, 4);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
  const L = new Buf(256);
  for (let s = 0; s < BL - 1e-6; s += 12) {
    const e = Math.min(BL, s + 12), a = P(s, -0.02), b = P(e, -0.02);
    const ya = gY(a[0], a[1]) + 0.3, yb = gY(b[0], b[1]) + 0.3;
    L.quad([a[0], ya - 0.06, a[1]], [b[0], yb - 0.06, b[1]], [b[0], yb + 0.06, b[1]], [a[0], ya + 0.06, a[1]], [1, 1, 1], [-W[0], 0, -W[1]]);
  }
  const mat = lightMaterial(0x66ccff, 1.5);
  const led = new THREE.Mesh(L.geometry(), mat);
  led.renderOrder = 19;
  led.userData.landmark = id;
  group.add(led);
  S.kind = KIND.PLAIN;
  // the LED line drifts slowly through the hues
  return {
    update(time) { mat.uniforms.uColor.value.setHSL((time * 0.02) % 1, 0.75, 0.6); },
  };
}

// ------------------------------------------------------------------ helpers

function segD(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
}

// a polyline's arc-length lookup
function segs(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return {
    total: acc[acc.length - 1],
    at(d) {
      let i = 1;
      while (i < pts.length - 1 && acc[i] < d) i++;
      const a = pts[i - 1], b = pts[i], t = (d - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
      return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    },
  };
}

// a paved path of width w along a polyline (one slab per segment, round joints)
function path(S, pts, w, y) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    S.box(c[0], c[1], gY(c[0], c[1]) - 0.2, gY(c[0], c[1]) + y, len, w, Math.atan2(b[1] - a[1], b[0] - a[0]), C.path);
    if (i < pts.length - 1) S.cyl(b[0], b[1], gY(b[0], b[1]) - 0.2, gY(b[0], b[1]) + y, w / 2, w / 2, 10, C.path);
  }
}

// a ring path of width w round a centre
function roundel(S, R, w, y) {
  const [cx, cz] = R.c, r0 = R.r - w / 2, r1 = R.r + w / 2, N = 28, yy = gY(cx, cz) + y;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    const p = (a, r): [number, number, number] => [cx + Math.cos(a) * r, yy, cz + Math.sin(a) * r];
    S.quad(p(a0, r0), p(a1, r0), p(a1, r1), p(a0, r1), C.pave, [0, 1, 0]);
    S.quad(p(a0, r1), p(a1, r1), [cx + Math.cos(a1) * r1, yy - 0.25, cz + Math.sin(a1) * r1], [cx + Math.cos(a0) * r1, yy - 0.25, cz + Math.sin(a0) * r1], C.kerb, [Math.cos(a0), 0, Math.sin(a0)]);
  }
}

// a grey steel lamp post with a flat disc lantern on top (~6 m), as Street View shows along the walk
function lampPost(S, x, z, y, ang, lampAt) {
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 0.6, 0.14, 0.12, 8, C.pole);
  S.cyl(x, z, y + 0.6, y + 5.7, 0.085, 0.06, 8, C.pole, { cap: false });
  S.cyl(x, z, y + 5.5, y + 5.68, 0.14, 0.62, 14, C.disc);
  S.cyl(x, z, y + 5.68, y + 5.8, 0.62, 0.55, 14, C.pole);
  S.cyl(x, z, y + 5.8, y + 5.9, 0.5, 0.2, 14, C.disc);
  lampAt(x, y + 5.55, z, [1, 0.92, 0.78]);
  S.kind = keep;
}

// the tall steel pole (~12.5 m, about as high as the palm crowns, sv-ndc-north) with small bracket lamps up both sides
function tallPole(S, x, z, y, ang, lampAt) {
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 0.5, 0.2, 0.18, 8, C.steel);
  S.cyl(x, z, y + 0.5, y + 12.5, 0.15, 0.09, 8, C.steel, { cap: false });
  S.cyl(x, z, y + 12.5, y + 12.7, 0.12, 0.04, 8, C.steel);
  const nx = -Math.sin(ang), nz = Math.cos(ang);
  for (let k = 0; k < 12; k++) {
    const yy = y + 4 + k * 0.72, side = k % 2 ? 1 : -1, ux = Math.cos(ang) * side, uz = Math.sin(ang) * side;
    S.beam([x, yy, z], [x + ux * 0.32 + nx * 0.05, yy + 0.08, z + uz * 0.32 + nz * 0.05], 0.05, 0.05, C.pole);
    if (k % 2 === 0) lampAt(x + ux * 0.34, yy + 0.05, z + uz * 0.34, [0.9, 0.95, 1]);
  }
  S.kind = keep;
}

// a tall palm: a ringed grey-brown trunk swelling a little at the foot, a green crownshaft, and a full crown of
// long arching fronds (each a broad tapering blade in three bends), a few dead ones hanging under it
function palm(S, x, z, y, h, k) {
  const keep = S.kind;
  S.kind = KIND.TIMBER;
  const la = k * 2.4, lx = Math.cos(la) * 0.35, lz = Math.sin(la) * 0.35;
  const N = 6;
  for (let i = 0; i < N; i++) { // ringed: alternate shades, tapering from 0.34 to 0.24 m
    const t0 = i / N, t1 = (i + 1) / N, f = (t) => t * t;
    S.cyl(x + lx * f(t0), z + lz * f(t0), y + h * 0.9 * t0, y + h * 0.9 * t1, 0.34 - 0.1 * t0, 0.34 - 0.1 * t1, 7, shade(C.trunk, i % 2 ? 0.92 : 1.05), { cap: false });
  }
  S.kind = KIND.PLAIN;
  const top = [x + lx, y + h, z + lz];
  S.cyl(top[0], top[2], y + h * 0.9, top[1], 0.25, 0.2, 7, C.crownshaft);
  const NF = 18;
  for (let i = 0; i < NF; i++) {
    const a = (i / NF) * Math.PI * 2 + k * 0.7, dx = Math.cos(a), dz = Math.sin(a), tier = i % 3;
    const up = [0.9, 0.45, 0.0][tier], L = 3.1 + (tier === 1 ? 0.3 : 0);
    const p1 = [top[0] + dx * L * 0.35, top[1] + up + 0.25, top[2] + dz * L * 0.35];
    const p2 = [top[0] + dx * L * 0.7, top[1] + up * 0.6 - 0.35, top[2] + dz * L * 0.7];
    const p3 = [top[0] + dx * L, top[1] - 0.6 - (2 - tier) * 0.35, top[2] + dz * L];
    S.beam(top, p1, 0.75, 0.04, C.frond);
    S.beam(p1, p2, 0.85, 0.04, shade(C.frond, 0.94));
    S.beam(p2, p3, 0.5, 0.03, shade(C.frond, 0.86));
  }
  for (let i = 0; i < 3; i++) { // dead fronds hanging against the trunk
    const a = (i / 3) * Math.PI * 2 + k, dx = Math.cos(a), dz = Math.sin(a);
    S.beam([top[0] + dx * 0.2, top[1] - 0.2, top[2] + dz * 0.2], [top[0] + dx * 0.7, top[1] - 2.2, top[2] + dz * 0.7], 0.45, 0.03, C.dead);
  }
  S.kind = keep;
}

// the stone balustrade along a bank line a→b (its centreline): a plinth, square piers about every 3 m, turned
// balusters between them and a flat coping rail (Street View)
function balustrade(S, a, b) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, ang = Math.atan2(uz, ux);
  const at = (t): [number, number] => [a[0] + ux * t, a[1] + uz * t];
  for (let s = 0; s < L - 1e-6; s += 6) {
    const e = Math.min(L, s + 6), c = at((s + e) / 2), y = gY(c[0], c[1]);
    S.box(c[0], c[1], y - 0.3, y + 0.22, e - s - 0.02, EDGE, ang, C.granite, { top: C.graniteTop });
  }
  const n = Math.max(1, Math.round(L / 3)), step = L / n;
  for (let k = 0; k <= n; k++) {
    const [x, z] = at(k * step), y = gY(x, z);
    S.box(x, z, y + 0.22, y + 1.02, 0.42, 0.42, ang, C.balus, { top: C.graniteTop });
    S.box(x, z, y + 1.02, y + 1.1, 0.5, 0.5, ang, C.graniteTop);
    if (k === n) break;
    const c = at((k + 0.5) * step), yc = gY(c[0], c[1]);
    S.box(c[0], c[1], yc + 0.84, yc + 0.94, step - 0.42, 0.34, ang, C.balus, { top: C.graniteTop });
    for (let t = 0.45; t < step - 0.4; t += 0.32) {
      const [bx, bz] = at(k * step + t), by = gY(bx, bz);
      S.cyl(bx, bz, by + 0.22, by + 0.5, 0.05, 0.085, 6, C.balus, { cap: false });
      S.cyl(bx, bz, by + 0.5, by + 0.84, 0.085, 0.045, 6, C.balus, { cap: false });
    }
  }
}

// a granite-legged bench with a timber seat and back; `ang` is the bench's length direction rotated so the back is
// on the +v side of the local frame (sitters face -v)
function bench(S, x, z, y, ang) {
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  const ux = Math.cos(ang), uz = Math.sin(ang), nx = -uz, nz = ux;
  for (const t of [-0.7, 0.7]) S.box(x + ux * t, z + uz * t, y, y + 0.42, 0.14, 0.5, ang, C.granite);
  S.box(x, z, y + 0.42, y + 0.48, 1.8, 0.5, ang, C.wood);
  S.box(x - nx * 0.24, z - nz * 0.24, y + 0.5, y + 0.85, 1.8, 0.06, ang, C.wood);
  S.kind = keep;
}

// a café parasol: a timber pole, a square cream canopy, a small table; a lamp under it after dark
function parasol(S, x, z, y, ang, lampAt) {
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 2.75, 0.05, 0.05, 6, C.wood);
  S.hip(x, z, 3.2, 3.2, ang, y + 2.3, 0.6, C.canopy, { over: 0 });
  const ox = Math.cos(ang) * 0.9, oz = Math.sin(ang) * 0.9; // a small café table beside the pole
  S.cyl(x + ox, z + oz, y, y + 0.7, 0.04, 0.04, 6, C.pole, { cap: false });
  S.cyl(x + ox, z + oz, y + 0.7, y + 0.74, 0.35, 0.35, 10, shade(C.counter, 1.1));
  lampAt(x, y + 2.1, z, [1, 0.78, 0.5]);
  S.kind = keep;
}

// a bronze figure (standing person, scale k ≈ 1 → 1.7 m)
function figure(S, x, z, y, k) {
  const h = 1.7 * k;
  S.cyl(x, z, y, y + h * 0.5, 0.3 * k, 0.22 * k, 8, C.bronze);
  S.cyl(x, z, y + h * 0.5, y + h * 0.82, 0.2 * k, 0.26 * k, 8, C.bronze);
  S.cyl(x, z, y + h * 0.84, y + h, 0.13 * k, 0.1 * k, 8, C.bronze);
}

// a muzzle-loading cannon on a low stone plinth
function cannon(S, x, z, y, ang) {
  const keep = S.kind;
  S.kind = KIND.MASONRY;
  S.box(x, z, y, y + 0.4, 3.0, 1.2, ang, C.plinth);
  S.kind = KIND.PLAIN;
  S.box(x, z, y + 0.4, y + 0.75, 1.6, 0.7, ang, shade(C.cannon, 1.2));
  const ux = Math.cos(ang), uz = Math.sin(ang);
  S.beam([x - ux * 1.3, y + 0.95, z - uz * 1.3], [x + ux * 1.4, y + 1.0, z + uz * 1.4], 0.42, 0.42, C.cannon);
  S.kind = keep;
}
