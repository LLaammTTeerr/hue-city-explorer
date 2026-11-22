import { KIND, Buf, hex, shade, inRing, unflat } from '../../geo/buf.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { LAND_Y, PAL } from '../../config.js';

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
const P = (s, v) => [B0[0] + U[0] * s + W[0] * v, B0[1] + U[1] * s + W[1] * v];
const gY = (x, z) => LAND_Y + rise(x, z);

const EDGE = 0.55, S0 = 2, S1 = BL + 2.5; // walk band v ∈ [EDGE, vIn(s)]
const S_DPT = 66; // up to here the Điềm Phùng Thị garden lies behind the walk, and the paving is narrower
const vIn = (s) => (s < S_DPT ? 12.0 : 13.8); // inland edge of the paving (satellite)
const PAVE_Y = 0.1;
const ROUND_W = { c: [-62.15, 294.55], r: 8.45 }; // OSM 1167513743, at the boardwalk stairs
const ROUND_E = { c: [56.45, 237.7], r: 6.5 }; // OSM 1167513766
const SPURS = [[[23.5, 204.5], [52.2, 232.7]], [[60.5, 242.8], [74.6, 257.8]]];
const WEST = [[-67.8, 300.9], [-154.4, 394.3], [-161.1, 401.5]]; // OSM 1167513730
const CANNONS = [[14.9, 301.3], [32.2, 285.6]];
// Điềm Phùng Thị's mapped garden (OSM 239566225): someone else's; kept out of lawn and trees
const DPT = [[63.5, 180.9], [84.1, 162.3], [113.4, 135.7], [154.6, 180.6], [104.7, 225.8]];

const C = {
  pave: hex('#b3b0a9'), band: hex('#9d9992'), kerb: hex('#cdc6b8'), granite: hex('#a9a39a'), graniteTop: hex('#c4bfb5'),
  balus: hex('#bdb9af'), pole: hex('#8c9196'), disc: hex('#e9e6dc'), trunk: hex('#7d6e5d'), frond: hex('#577a3e'),
  path: hex('#c2b5a2'), lawn: hex(PAL.green.park), bed: hex('#5f7d45'), flower: hex('#c8564a'),
  wood: hex('#8a5a34'), bronze: hex('#5d4a35'), plinth: hex('#d2ccc0'),
  canopy: hex('#ece5d3'), counter: hex('#9a6b45'), cannon: hex('#3a3a36'),
};

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
  // light grey stone slabs, a faint joint line every 6 m
  for (let s = S0; s < S1 - 1e-6; s += 6) {
    const e = Math.min(S1, s + 6, s < S_DPT && s + 6 > S_DPT ? S_DPT : Infinity), m = Math.min(e, s + 0.3), v1 = vIn(s);
    quadSV(s, m, v0, v1, PAVE_Y + 0.004, C.band);
    if (e > m) quadSV(m, e, v0, v1, PAVE_Y, C.pave);
    if (e < s + 6) s = e - 6; // restart the bands at the step in width
  }
  S.kind = KIND.MASONRY;
  // kerb on the park side, stepping out where the art centre's garden ends (kept under 0.2 m: inside the paved range a
  // taller face would keep the shade trees off the edge of the walk, src/geo/city.js coverOf)
  for (const [sa, sb] of [[S0, S_DPT], [S_DPT, S1]]) {
    for (let s = sa; s < sb - 1e-6; s += 12) {
      const e = Math.min(sb, s + 12), c = P((s + e) / 2, vIn(s) + 0.15);
      S.box(c[0], c[1], gY(c[0], c[1]), gY(c[0], c[1]) + PAVE_Y + 0.09, e - s, 0.3, ANG, C.kerb);
    }
  }
  {
    const a = P(S_DPT, vIn(0)), b = P(S_DPT, vIn(S1)), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    S.box(c[0], c[1], gY(c[0], c[1]), gY(c[0], c[1]) + PAVE_Y + 0.09, 0.3, vIn(S1) - vIn(0) + 0.3, ANG, C.kerb);
  }
  // the stone balustrade on the embankment, from the bridge foot to the boardwalk head: a plinth, square piers every
  // 3 m, turned balusters between them, a flat coping rail (Street View)
  for (let s = 0; s < BL - 1e-6; s += 6) {
    const e = Math.min(BL, s + 6), c = P((s + e) / 2, EDGE / 2);
    const y = gY(c[0], c[1]);
    S.box(c[0], c[1], y - 0.3, y + 0.22, e - s - 0.02, EDGE, ANG, C.granite, { top: C.graniteTop });
  }
  {
    const n = Math.round(BL / 3), step = BL / n;
    for (let k = 0; k <= n; k++) {
      const [x, z] = P(k * step, EDGE / 2), y = gY(x, z);
      S.box(x, z, y + 0.22, y + 1.02, 0.42, 0.42, ANG, C.balus, { top: C.graniteTop });
      S.box(x, z, y + 1.02, y + 1.1, 0.5, 0.5, ANG, C.graniteTop);
      if (k === n) break;
      const c = P((k + 0.5) * step, EDGE / 2), yc = gY(c[0], c[1]);
      S.box(c[0], c[1], yc + 0.84, yc + 0.94, step - 0.42, 0.34, ANG, C.balus, { top: C.graniteTop });
      for (let b = 0.45; b < step - 0.4; b += 0.32) {
        const [bx, bz] = P(k * step + b, EDGE / 2), by = gY(bx, bz);
        S.cyl(bx, bz, by + 0.22, by + 0.5, 0.05, 0.085, 6, C.balus, { cap: false });
        S.cyl(bx, bz, by + 0.5, by + 0.84, 0.085, 0.045, 6, C.balus, { cap: false });
      }
    }
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
  figure(S, ROUND_E.c[0], ROUND_E.c[1], gY(...ROUND_E.c) + 0.38, 1.1);

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
    palm(S, x, z, y + 0.12, 10.5 + ((k * 7) % 5) * 0.7, k);
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

  // ---- café parasols in the park behind the tree line at the Tứ Tượng end (satellite, Street View) ----
  for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) {
    const [x, z] = P(111 + a * 4.2 + b * 2.1, 18.5 + b * 4.2);
    if (nearBld(x, z, 2.5)) continue;
    parasol(S, x, z, gY(x, z), ANG, lampAt);
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
      if (s < -4 || s > S1 + 4 || v < -3 || v > 30) continue;
      if (v < vIn(s) + 1) T[i + 2] = 0;
      else if (T[i + 3] === 0 || T[i + 3] === 1) T[i + 3] = 4;
    }
    // the big shade trees along the inland edge of the paving (kind 4: broad crowns, never drawn as willows)
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
      data.trees.push(Math.round(x * 10), Math.round(z * 10), 17 + (i % 3) * 2, 4);
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
    const p = (a, r) => [cx + Math.cos(a) * r, yy, cz + Math.sin(a) * r];
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
  S.cyl(x, z, y + 5.6, y + 5.75, 0.12, 0.36, 12, C.disc);
  S.cyl(x, z, y + 5.75, y + 5.85, 0.4, 0.3, 12, C.pole);
  lampAt(x, y + 5.55, z, [1, 0.92, 0.78]);
  S.kind = keep;
}

// the taller pole (~9 m) with small bracket lamps up one side
function tallPole(S, x, z, y, ang, lampAt) {
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 9, 0.13, 0.08, 8, shade(C.disc, 0.85));
  const nx = -Math.sin(ang), nz = Math.cos(ang);
  for (let k = 0; k < 7; k++) {
    const yy = y + 3 + k * 0.9, side = k % 2 ? 1 : -1, ux = Math.cos(ang) * side, uz = Math.sin(ang) * side;
    S.beam([x, yy, z], [x + ux * 0.32 + nx * 0.05, yy + 0.08, z + uz * 0.32 + nz * 0.05], 0.05, 0.05, C.pole);
    if (k % 2 === 0) lampAt(x + ux * 0.34, yy + 0.05, z + uz * 0.34, [0.9, 0.95, 1]);
  }
  S.kind = keep;
}

// a tall palm: a slim ringed trunk with a slight lean and a crown of arching fronds
function palm(S, x, z, y, h, k) {
  const keep = S.kind;
  S.kind = KIND.TIMBER;
  const la = k * 2.4, lx = Math.cos(la) * 0.35, lz = Math.sin(la) * 0.35;
  S.cyl(x, z, y, y + h * 0.5, 0.2, 0.17, 6, C.trunk, { cap: false });
  S.beam([x, y + h * 0.5, z], [x + lx, y + h, z + lz], 0.32, 0.28, C.trunk);
  const top = [x + lx, y + h, z + lz];
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + k, dx = Math.cos(a), dz = Math.sin(a), up = i % 2 ? 0.2 : 0.55;
    const mid = [top[0] + dx * 1.5, top[1] + up, top[2] + dz * 1.5], tip = [top[0] + dx * 2.9, top[1] - 1.3 + up, top[2] + dz * 2.9];
    S.beam(top, mid, 0.5, 0.05, C.frond);
    S.beam(mid, tip, 0.38, 0.04, shade(C.frond, 0.88));
  }
  S.kind = keep;
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
  S.cyl(x, z, y, y + 2.5, 0.05, 0.05, 6, C.wood);
  S.hip(x, z, 3.0, 3.0, ang, y + 2.25, 0.55, C.canopy, { over: 0 });
  S.cyl(x, z, y, y + 0.74, 0.35, 0.35, 10, shade(C.counter, 1.1));
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
