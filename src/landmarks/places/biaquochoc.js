import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints } from '../../geo/materials.js';

// ---- Bia Quốc Học: Đài tưởng niệm Chiến sĩ trận vong (1920), on the south bank opposite Trường Quốc Học ----
// Replaces buildBiaQuocHoc (landmarks/memorial.js). Sources and estimates: docs/places/biaquochoc.md.
//
// Confirmed:
//  - a large roofed screen (bình phong), two tiers, on a base of two steps; a kim khánh plaque with a hanging medal
//    at the centre; dragon, qilin, 壽, tứ quý and fretwork in Nguyễn style (vi.wikipedia.org/wiki/Bia_Quốc_Học);
//  - one trụ biểu on each side (kienthuc.net.vn); a lan can round the base, steps, the trụ biểu restored 2016-17
//    (vietnamplus.vn, post415775);
//  - after restoration: painted a bright yellow, glazed tubular tiles, 67 lamps on roof, walls and pillars
//    (thuonghieucongluan.com.vn, a33134);
//  - 10.95 m overall, the trụ biểu 9.85 m, balustrade nearly 1.4 m (Tạp chí Sông Hương, as cited in the older
//    builder; the page has since moved);
//  - place: OSM node 5299153429, exactly on the axis of the school gate across Lê Lợi (the node → gate vector is the
//    gate's normal to within 1°), 37 m from the Lê Lợi sidewalk and 12 m in front of the riverside footway.
// Estimated: the plan (central bay 6 m, side bays 4.4 m, ~20 m across the pillars), tier heights, the tile colour
// (only "glazed" is known), the pillar heads, the balustrade layout, and the paved forecourt toward Lê Lợi (the
// space used as the festival stage).

export const id = 'biaquochoc';

const ROW = [-675.1, 879.2]; // OSM memorial node, metres (x east, z south), used if the place record is missing

export function build({ data, S, group, place }) {
  const c = place && Number.isFinite(place.x) && Number.isFinite(place.z) ? [place.x, place.z] : ROW.slice();

  // Facing: toward the school gate (the river behind), square to the gate's facade when the two roughly agree.
  let f = [-Math.sin(Math.PI / 8), Math.cos(Math.PI / 8)];
  const g = data?.quocHocGate;
  if (g && Array.isArray(g.c) && Number.isFinite(g.c[0]) && Number.isFinite(g.c[1])) {
    const v = [g.c[0] / 10 - c[0], g.c[1] / 10 - c[1]], vl = Math.hypot(v[0], v[1]);
    if (vl > 1) {
      f = [v[0] / vl, v[1] / vl];
      if (Number.isFinite(g.a)) {
        const ga = g.a / 1000, n = [-Math.sin(ga), Math.cos(ga)];
        const d = n[0] * f[0] + n[1] * f[1];
        if (Math.abs(d) > 0.5) f = d >= 0 ? n : [-n[0], -n[1]];
      }
    }
  }
  const p = [-f[1], f[0]], A = Math.atan2(f[1], f[0]);
  const at = (a, b = 0) => [c[0] + f[0] * a + p[0] * b, c[1] + f[1] * a + p[1] * b];

  // bed the whole precinct on the lowest ground under it; the paving tops clear the highest
  let lo = Infinity, hi = -Infinity;
  for (let a = -8; a <= 36; a += 4) for (let b = -15; b <= 15; b += 5) { const q = at(a, b), r = rise(q[0], q[1]); lo = Math.min(lo, r); hi = Math.max(hi, r); }
  if (!Number.isFinite(lo)) return;
  const y0 = LAND_Y + lo, yTop = LAND_Y + hi + 0.12;
  S.base = lo;

  const yellow = hex('#e8bf4a'), yellowD = hex('#d3a83c'), trim = hex('#f3e6c4'), panel = hex('#dcb04a');
  const roof = hex('#b8862c'), ridge = hex('#f0d27a'), slab = hex('#6d655c'), tablet = hex('#9b8f7c'), dark = hex('#3a302a');
  const pave = hex('#cfc6b4'), pave2 = hex('#bdb3a0'), stoneL = shade(PAL.stone, 1.06), bronze = hex('#c9a040');

  const box = (a, b, ya, yb, da, db, col, o) => { const q = at(a, b); S.box(q[0], q[1], ya, yb, da, db, A, col, o); };
  const hipAt = (a, b, wb, da, y, h, col, o) => { const q = at(a, b); S.hip(q[0], q[1], wb, da, A + Math.PI / 2, y, h, col, o); };

  const paved0 = S.n;
  // ---- the paving: round the platform, and the forecourt out to the Lê Lợi sidewalk (37 m in front) ----
  S.kind = KIND.ROAD;
  box(0, 0, y0 - 0.3, yTop, 14, 30, pave, { topKind: KIND.ROAD });
  box(21, 0, y0 - 0.3, yTop - 0.01, 28, 22, pave, { topKind: KIND.ROAD });
  // a darker band down the axis, from the stairs to the street
  box(21, 0, yTop - 0.01, yTop + 0.01, 28, 7, pave2, { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) box(21, s * 11.1, yTop - 0.05, yTop + 0.2, 28, 0.25, stoneL); // kerbs along the forecourt

  // ---- the platform: two steps ----
  const yb0 = yTop, H1 = 0.45, H2 = 0.9;
  box(0, 0, y0 - 0.2, yb0 + H1, 9.2, 23, PAL.stone, { topKind: KIND.ROAD });
  box(0, 0, yb0 + H1, yb0 + H2, 6.4, 20.4, stoneL, { topKind: KIND.ROAD });
  // stairs at the middle, front and back (front wider: it faces the forecourt)
  for (const [s, w] of [[1, 7], [-1, 4.4]]) {
    for (let i = 0; i < 2; i++) box(s * (4.6 + 0.2 + i * 0.4), 0, y0 - 0.2, yb0 + H1 - (i + 1) * 0.15, 0.4, w + 1.2 - i * 0.2, PAL.stone, { topKind: KIND.ROAD });
    box(s * 3.5, 0, yb0 + H1, yb0 + H2 - 0.22, 0.6, w, PAL.stone, { topKind: KIND.ROAD });
  }
  (S.paved = S.paved || []).push([paved0, S.n]);

  // ---- the lan can: a balustrade along the edge of the lower step, open at the stairs (~1.4 m above the paving) ----
  S.kind = KIND.MASONRY;
  const yb = yb0 + H1, rail = 0.9;
  const runs = [];
  for (const s of [-1, 1]) runs.push([s * 4.45, -11.3, -4.6], [s * 4.45, 4.6, 11.3]);
  for (const [a, b0, b1] of runs) {
    const len = b1 - b0, mid = (b0 + b1) / 2;
    box(a, mid, yb + rail - 0.16, yb + rail, 0.3, len, trim);
    box(a, mid, yb, yb + 0.14, 0.32, len, trim);
    box(a, mid, yb + 0.14, yb + rail - 0.16, 0.12, len, yellowD); // the pierced panel between rail and plinth, as a thin wall
    const n = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i <= n; i++) { const b = b0 + (len * i) / n, end = i === 0 || i === n; box(a, b, yb, yb + rail + (end ? 0.3 : 0.05), 0.34, 0.34, end ? trim : yellowD); }
  }
  for (const s of [-1, 1]) {
    box(0, s * 11.3, yb + rail - 0.16, yb + rail, 8.9, 0.3, trim);
    box(0, s * 11.3, yb, yb + 0.14, 8.9, 0.32, trim);
    box(0, s * 11.3, yb + 0.14, yb + rail - 0.16, 8.9, 0.12, yellowD);
    for (const a of [-2.2, 0, 2.2]) box(a, s * 11.3, yb, yb + rail + 0.05, 0.34, 0.34, yellowD);
  }

  // ---- the screen ----
  const y = yb0 + H2, T = 1.1;
  S.kind = KIND.MASONRY;
  box(0, 0, y, y + 0.6, T + 0.5, 15.6, slab);

  // side bays: lower walls under one tiled roof each
  const sbW = 4.4, sbH = 4.1, sbB = 3.0 + sbW / 2;
  for (const s of [-1, 1]) {
    S.kind = KIND.CIVIC;
    box(0, s * sbB, y + 0.6, y + sbH, T, sbW, yellow, { top: shade(roof, 0.8) });
    S.kind = KIND.PLAIN;
    box(0, s * sbB, y + sbH - 0.45, y + sbH, T + 0.3, sbW + 0.2, trim);
    for (const k of [-1, 1]) {
      box(k * (T / 2 + 0.03), s * sbB, y + 1.0, y + sbH - 0.8, 0.06, sbW - 1.2, panel); // framed panel
      box(k * (T / 2 + 0.06), s * sbB, y + 1.35, y + sbH - 1.15, 0.06, sbW - 2.0, tablet); // name tablet, names chiselled off
    }
    box(0, s * (sbB + sbW / 2 + 0.5), y + 0.6, y + 2.6, T + 0.2, 1.0, yellowD, { top: trim }); // stepped buttress
    box(0, s * (sbB + sbW / 2 + 0.5), y + 2.6, y + 2.9, T + 0.4, 1.2, trim);
    hipAt(0, s * sbB, sbW, T, y + sbH, 1.1, roof, { flare: 0.25, over: 0.55, fascia: 0.18, fasciaCol: trim, ridgeCol: ridge, hips: true, glazed: true });
  }

  // central bay, lower tier
  const cW = 6.0, cH = 5.0;
  S.kind = KIND.CIVIC;
  box(0, 0, y + 0.6, y + cH, T + 0.2, cW, yellow, { top: shade(roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const k of [-1, 1]) {
    for (const s of [-1, 1]) box(k * (T / 2 + 0.12), s * (cW / 2 - 0.3), y + 0.6, y + cH - 0.4, 0.2, 0.6, trim); // pilasters
    box(k * (T / 2 + 0.13), 0, y + 1.0, y + cH - 0.9, 0.06, cW - 1.8, panel);
    box(k * (T / 2 + 0.16), 0, y + 1.2, y + 2.9, 0.06, cW - 2.6, tablet);
    const q = at(k * (T / 2 + 0.2), 0); // the kim khánh plaque and the medal hanging below it
    S.box(q[0], q[1], y + 3.4, y + 3.9, 0.08, 1.9, A, bronze);
    S.box(q[0], q[1], y + 3.9, y + 4.1, 0.08, 1.0, A, bronze);
    const m = at(k * (T / 2 + 0.24), 0);
    S.cyl(m[0], m[1], y + 3.0, y + 3.35, 0.2, 0.22, 6, bronze);
  }
  box(0, 0, y + cH - 0.5, y + cH, T + 0.6, cW + 0.3, trim);
  hipAt(0, 0, cW, T + 0.2, y + cH, 1.0, roof, { flare: 0.3, over: 0.75, fascia: 0.2, fasciaCol: trim, ridgeCol: null, glazed: true });

  // upper tier: a narrower panel rising out of the lower roof, under the top roof
  const uW = 3.8, uY = y + cH + 0.5, uH = 1.9;
  S.kind = KIND.CIVIC;
  box(0, 0, uY - 0.4, uY + uH, T * 0.85, uW, yellow, { top: shade(roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const k of [-1, 1]) {
    box(k * (T * 0.425 + 0.03), 0, uY + 0.25, uY + uH - 0.35, 0.06, uW - 1.0, panel);
    const q = at(k * (T * 0.425 + 0.07), 0); // the round 壽 medallion
    S.box(q[0], q[1], uY + 0.55, uY + 1.45, 0.06, 0.62, A, dark);
    S.box(q[0], q[1], uY + 0.69, uY + 1.31, 0.06, 0.9, A, dark);
  }
  box(0, 0, uY + uH - 0.3, uY + uH, T + 0.3, uW + 0.3, trim);
  const topY = uY + uH;
  hipAt(0, 0, uW, T * 0.85, topY, 1.25, roof, { flare: 0.3, over: 0.75, fascia: 0.2, fasciaCol: trim, ridgeCol: ridge, hips: true, glazed: true });
  // ridge crown: a gourd on a lotus seat (top at 10.95 m above the paving)
  const r0 = topY + 1.25 + 0.15;
  S.cyl(c[0], c[1], r0, r0 + 0.3, 0.35, 0.45, 6, ridge, { cap: false });
  S.cyl(c[0], c[1], r0 + 0.3, r0 + 0.6, 0.45, 0.28, 6, ridge, { cap: false });
  S.cyl(c[0], c[1], r0 + 0.6, r0 + 1.25, 0.28, 0.04, 6, ridge);

  // ---- the two trụ biểu at the ends: square shafts, lantern heads, lotus-bud finials (9.85 m) ----
  const pB = 9.5, pY = y, hd = pY + 6.45;
  for (const s of [-1, 1]) {
    const q = at(0.3, s * pB);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], pY, pY + 0.7, 1.35, 1.35, A, slab);
    S.kind = KIND.CIVIC;
    S.box(q[0], q[1], pY + 0.7, hd, 0.95, 0.95, A, yellow, { taper: 0.94 });
    S.kind = KIND.PLAIN;
    S.box(q[0], q[1], pY + 2.0, hd - 0.7, 1.0, 0.6, A, panel); // couplet panels front/back
    S.box(q[0], q[1], hd, hd + 0.3, 1.25, 1.25, A, trim);
    S.box(q[0], q[1], hd + 0.3, hd + 1.1, 0.85, 0.85, A, yellowD); // the lantern
    for (const k of [-1, 1]) {
      S.box(q[0] + f[0] * k * 0.44, q[1] + f[1] * k * 0.44, hd + 0.45, hd + 0.95, 0.04, 0.45, A, dark);
      S.box(q[0] + p[0] * k * 0.44, q[1] + p[1] * k * 0.44, hd + 0.45, hd + 0.95, 0.45, 0.04, A, dark);
    }
    S.kind = KIND.GLAZED;
    S.box(q[0], q[1], hd + 1.1, hd + 1.35, 1.2, 1.2, A, roof, { taper: 0.6 });
    S.kind = KIND.PLAIN;
    S.cyl(q[0], q[1], hd + 1.35, hd + 1.7, 0.22, 0.42, 6, trim, { cap: false, rot: A });
    S.cyl(q[0], q[1], hd + 1.7, hd + 2.5, 0.42, 0.05, 6, trim, { rot: A });
  }

  // ---- two lamp posts flanking the front stairs ----
  for (const s of [-1, 1]) {
    const q = at(5.6, s * 4.8);
    S.cyl(q[0], q[1], yTop, yTop + 2.6, 0.07, 0.06, 5, dark, { cap: false });
    S.box(q[0], q[1], yTop + 2.6, yTop + 3.0, 0.3, 0.3, A, trim);
  }

  // ---- after dark ("67 lamps on roof, walls, pillars" since the restoration) ----
  const pos = [], col = [];
  const lampAt = (q, yy, cc = [1, 0.8, 0.45]) => { pos.push(q[0], yy, q[1]); col.push(cc[0], cc[1], cc[2]); };
  const eave = (b0, b1, yy, dd, n) => { for (let i = 0; i <= n; i++) for (const k of [-1, 1]) lampAt(at(k * dd, b0 + ((b1 - b0) * i) / n), yy); };
  eave(-cW / 2 - 0.6, cW / 2 + 0.6, y + cH - 0.15, T / 2 + 0.85, 4);
  eave(-uW / 2 - 0.6, uW / 2 + 0.6, topY - 0.15, T * 0.425 + 0.85, 3);
  for (const s of [-1, 1]) eave(s * (sbB - sbW / 2 - 0.4), s * (sbB + sbW / 2 + 0.4), y + sbH - 0.15, T / 2 + 0.75, 3);
  for (const s of [-1, 1]) {
    for (const k of [-1, 1]) lampAt(at(0.3 + k * 0.5, s * pB), hd + 0.7, [1, 0.85, 0.55]); // the lantern's front and back openings
    lampAt(at(5.6, s * 4.8), yTop + 3.15, [1, 0.9, 0.7]);
  }
  lampAt(c, r0 + 1.1);
  const pts = glowPoints(pos, col, 3);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);

  S.kind = KIND.PLAIN;
  S.base = 0;
}
