import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { kylan } from '../props.ts';

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
// Matched to Google imagery (satellite + two car panoramas, 2024): the terrace, inner platform and trụ biểu layout,
// the screen's width and tier proportions, the orientation (the satellite's walls agree with the gate normal to <1°).
// Colours follow the panoramas (weathered ochre, dark aged roofs, grey stone lan can), not the 2017 "bright yellow".
// Estimated: bay widths within the matched overall width, tile colour (only "glazed" is known), the pillar heads,
// the stairs at the back and ends, and the heights (the documented 10.95 m is kept from the plaza; the panorama reads
// ~15% taller, see the notes).

export const id = 'biaquochoc';

const ROW = [-675.1, 879.2]; // OSM memorial node (the satellite's terrace centre within ~1.5 m), metres (x east, z south), used if the place record is missing

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
  const at = (a, b = 0): [number, number] => [c[0] + f[0] * a + p[0] * b, c[1] + f[1] * a + p[1] * b];

  // Plan (from the Google satellite and two car panoramas, 2024; docs/places/biaquochoc.md):
  //  - an outer raised terrace ~31.4 m along the screen × 18.3 m deep, centred on the place point, lan can along its
  //    edge, stairs at the front middle and at both ends;
  //  - an inner platform ~19 × 7.5 m at the back of it carrying the screen, whose face stands ~2.5 m behind the
  //    centre;
  //  - the two trụ biểu outside the terrace's front corners, ~36 m apart and ~10 m in front of the centre.
  const TA = 9.15, TB = 15.7; // outer terrace half depth / half length
  const aS = -2.5; // the screen's line
  const PA0 = -6.5, PA1 = 1.0, PB = 9.5; // inner platform: back, front, half length
  const pA = 10.3, pB = 18.3; // trụ biểu

  // bed the whole precinct on the lowest ground under it; the paving tops clear the highest
  let lo = Infinity, hi = -Infinity;
  for (let a = -10; a <= 36; a += 4) for (let b = -18; b <= 18; b += 4.5) { const q = at(a, b), r = rise(q[0], q[1]); lo = Math.min(lo, r); hi = Math.max(hi, r); }
  if (!Number.isFinite(lo)) return;
  const y0 = LAND_Y + lo, yTop = LAND_Y + hi + 0.12;
  S.base = lo;

  // Weathered limestone-ochre / pale stone finish with deep cobalt-blue ceramic panels and grey stone lan can
  const yellow = hex('#c9be9e'), yellowD = hex('#aea386'), trim = hex('#ded6c0'), panel = hex('#b8ad90');
  const roof = hex('#6e5546'), ridge = hex('#947d64'), slab = hex('#685649'), tablet = hex('#cfc6b0'), dark = hex('#3a302a');
  const pillar = hex('#cbc1a4'), blue = hex('#3c6692'), pave = hex('#d2cdc0'), bronze = hex('#9a7e45');
  const railStone = hex('#aba69c'), railPanel = hex('#5c5952');

  const box = (a, b, ya, yb, da, db, col, o?) => { const q = at(a, b); S.box(q[0], q[1], ya, yb, da, db, A, col, o); };
  const hipAt = (a, b, wb, da, y, h, col, o) => { const q = at(a, b); S.hip(q[0], q[1], wb, da, A + Math.PI / 2, y, h, col, o); };

  const paved0 = S.n;
  // ---- the plaza: one light paving round the terrace and out to the Lê Lợi sidewalk (37 m in front) ----
  S.kind = KIND.ROAD;
  box(0, 0, y0 - 0.3, yTop, 2 * TA + 4, 2 * pB + 3, pave, { topKind: KIND.ROAD });
  box(22.5, 0, y0 - 0.3, yTop - 0.01, 27, 2 * pB + 3, pave, { topKind: KIND.ROAD });

  // ---- the outer terrace (top 1.2 m over the plaza) and its stairs ----
  const yT = yTop + 1.2, yP = yT + 0.7;
  box(0, 0, y0 - 0.2, yT, 2 * TA, 2 * TB, PAL.stone, { topKind: KIND.ROAD });
  const stairs = (a, b, run, w, yA, yB, n, along) => { // n steps from yB down to yA, running out from (a, b)
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, top = yB - ((yB - yA) * (i + 1)) / n;
      if (along === 'a') box(a + Math.sign(run) * Math.abs(run) * t, b, y0 - 0.2, top + (yB - yA) / n, Math.abs(run) / n + 0.02, w, PAL.stone, { topKind: KIND.ROAD });
      else box(a, b + Math.sign(run) * Math.abs(run) * t, y0 - 0.2, top + (yB - yA) / n, w, Math.abs(run) / n + 0.02, PAL.stone, { topKind: KIND.ROAD });
    }
  };
  stairs(TA, 0, 2.4, 6, yTop, yT, 7, 'a'); // front, toward the street
  for (const s of [-1, 1]) stairs(0, s * TB, s * 2.0, 4, yTop, yT, 6, 'b'); // the ends
  // ---- the inner platform under the screen ----
  box((PA0 + PA1) / 2, 0, yT - 0.1, yP, PA1 - PA0, 2 * PB, shade(PAL.stone, 1.06), { topKind: KIND.ROAD });
  stairs(PA1, 0, 1.2, 5, yT, yP, 4, 'a');
  stairs(PA0, 0, -1.0, 3.6, yT, yP, 4, 'a');
  (S.paved = S.paved || []).push([paved0, S.n]);

  // ---- a low kerb wall ~3.5 m behind the terrace, ~41 m long (the satellite's line toward the riverside path) ----
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) { // two halves, each bedded on its own ground
    const q = at(-TA - 3.5, s * 10.25), g = LAND_Y + rise(q[0], q[1]);
    if (Number.isFinite(g)) S.box(q[0], q[1], g - 0.2, Math.max(g, yTop) + 0.45, 0.4, 20.5, A, railStone);
  }
  // ---- guardian beasts on plinths flanking the foot of the front stairs (stone; the species is an estimate) ----
  for (const s of [-1, 1]) { const q = at(TA + 2.9, s * 3.9); kylan(S, q[0], yTop, q[1], A, { s: 0.9, plinth: 0.5 }); }
  S.base = lo;

  // ---- the lan can (~1.3 m) along the terrace edge, open at the stairs; a low rail round the inner platform ----
  S.kind = KIND.MASONRY;
  const rail = (a0, b0, a1, b1, ya, h, posts) => { // a straight run from (a0, b0) to (a1, b1)
    const alongA = Math.abs(a1 - a0) > Math.abs(b1 - b0), len = alongA ? Math.abs(a1 - a0) : Math.abs(b1 - b0);
    const am = (a0 + a1) / 2, bm = (b0 + b1) / 2, da = alongA ? len : 0.3, db = alongA ? 0.3 : len;
    box(am, bm, ya + h - 0.16, ya + h, da, db, railStone);
    box(am, bm, ya, ya + 0.16, alongA ? len : 0.34, alongA ? 0.34 : len, railStone);
    box(am, bm, ya + 0.16, ya + h - 0.16, alongA ? len : 0.12, alongA ? 0.12 : len, railPanel); // pierced panel, as a thin wall
    const n = Math.max(1, Math.round(len / posts));
    for (let i = 0; i <= n; i++) {
      const t = i / n, end = i === 0 || i === n;
      box(a0 + (a1 - a0) * t, b0 + (b1 - b0) * t, ya, ya + h + (end ? 0.3 : 0.05), 0.36, 0.36, railStone);
    }
  };
  const e = 0.2, H = 1.3;
  for (const s of [-1, 1]) {
    rail(TA - e, s * 3.2, TA - e, s * (TB - e), yT, H, 1.8); // front, either side of the stairs
    rail(-TA + e, s * 2.0, -TA + e, s * (TB - e), yT, H, 1.8); // back (open in the middle to the riverside path)
    rail(TA - e, s * (TB - e), 2.2, s * (TB - e), yT, H, 1.8); // ends, either side of the end stairs
    rail(-2.2, s * (TB - e), -TA + e, s * (TB - e), yT, H, 1.8);
    rail(PA1 - 0.15, s * 2.7, PA1 - 0.15, s * (PB - 0.15), yP, 0.75, 1.6); // inner platform, front
    rail(PA1 - 0.15, s * (PB - 0.15), PA0 + 0.15, s * (PB - 0.15), yP, 0.75, 1.6);
  }

  // ---- the screen ----
  const y = yP, T = 1.1, PL = 0.95; // PL: the plinth with its fretwork band
  S.kind = KIND.MASONRY;
  box(aS, 0, y, y + PL, T + 0.5, 15.6, slab);

  // side bays: lower walls under one tiled roof each
  const sbW = 4.4, sbH = 3.8, sbB = 3.0 + sbW / 2;
  for (const s of [-1, 1]) {
    S.kind = KIND.CIVIC;
    box(aS, s * sbB, y + PL, y + sbH, T, sbW, yellow, { top: shade(roof, 0.8) });
    S.kind = KIND.PLAIN;
    box(aS, s * sbB, y + sbH - 0.4, y + sbH, T + 0.3, sbW + 0.2, trim);
    for (const k of [-1, 1]) {
      box(aS + k * (T / 2 + 0.03), s * sbB, y + PL + 0.35, y + sbH - 0.7, 0.06, sbW - 0.9, panel); // framed panel
      box(aS + k * (T / 2 + 0.06), s * (sbB + 0.75), y + PL + 0.7, y + sbH - 1.05, 0.06, 1.5, blue); // glazed tile panel
      box(aS + k * (T / 2 + 0.06), s * (sbB - 1.0), y + PL + 0.7, y + sbH - 1.05, 0.06, 0.8, dark); // pierced lattice window
    }
    box(aS, s * (sbB + sbW / 2 + 0.5), y + PL, y + 2.5, T + 0.2, 1.0, yellowD, { top: trim }); // stepped buttress
    box(aS, s * (sbB + sbW / 2 + 0.5), y + 2.5, y + 2.8, T + 0.4, 1.2, trim);
    hipAt(aS, s * sbB, sbW, T, y + sbH, 1.0, roof, { flare: 0.3, over: 0.55, fascia: 0.18, fasciaCol: trim, ridgeCol: ridge, hips: true, glazed: true });
  }

  // central bay, lower tier
  const cW = 6.0, cH = 4.1;
  S.kind = KIND.CIVIC;
  box(aS, 0, y + PL, y + cH, T + 0.2, cW, yellow, { top: shade(roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const k of [-1, 1]) {
    const a = aS + k * (T / 2 + 0.1);
    for (const s of [-1, 1]) box(a + k * 0.02, s * (cW / 2 - 0.3), y + PL, y + cH - 0.4, 0.2, 0.6, trim); // pilasters
    box(a + k * 0.03, 0, y + PL + 0.3, y + cH - 0.6, 0.06, cW - 1.8, panel);
    box(a + k * 0.06, 0, y + PL + 0.6, y + cH - 1.2, 0.06, cW - 2.2, tablet); // the big tablet, names chiselled off
    const q = at(a + k * 0.1, 0); // the kim khánh plaque and the medal hanging below it
    S.box(q[0], q[1], y + cH - 1.05, y + cH - 0.7, 0.08, 1.6, A, bronze);
    S.box(q[0], q[1], y + cH - 0.7, y + cH - 0.55, 0.08, 0.8, A, bronze);
  }
  box(aS, 0, y + cH - 0.45, y + cH, T + 0.6, cW + 0.3, trim);
  hipAt(aS, 0, cW, T + 0.2, y + cH, 0.9, roof, { flare: 0.3, over: 0.7, fascia: 0.2, fasciaCol: trim, ridgeCol: null, glazed: true });

  // upper tier: a narrower panel rising out of the lower roof, under the top roof
  const uW = 3.2, uY = y + cH + 0.5, uH = 1.8;
  S.kind = KIND.CIVIC;
  box(aS, 0, uY - 0.4, uY + uH, T * 0.85, uW, yellow, { top: shade(roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const k of [-1, 1]) {
    box(aS + k * (T * 0.425 + 0.03), 0, uY + 0.2, uY + uH - 0.35, 0.06, uW - 0.8, panel);
    const q = at(aS + k * (T * 0.425 + 0.07), 0); // the round 壽 medallion
    S.box(q[0], q[1], uY + 0.5, uY + 1.3, 0.06, 0.55, A, dark);
    S.box(q[0], q[1], uY + 0.62, uY + 1.18, 0.06, 0.8, A, dark);
  }
  box(aS, 0, uY + uH - 0.3, uY + uH, T + 0.3, uW + 0.3, trim);
  const topY = uY + uH;
  hipAt(aS, 0, uW, T * 0.85, topY, 1.2, roof, { flare: 0.3, over: 0.6, fascia: 0.2, fasciaCol: trim, ridgeCol: ridge, hips: true, glazed: true });
  // ridge crown: a gourd on a lotus seat, its top at the sourced 10.95 m over the plaza
  const cs = at(aS, 0), r0 = topY + 1.2 + 0.15, rH = yTop + 10.95 - r0;
  S.cyl(cs[0], cs[1], r0, r0 + rH * 0.24, 0.35, 0.45, 6, ridge, { cap: false });
  S.cyl(cs[0], cs[1], r0 + rH * 0.24, r0 + rH * 0.48, 0.45, 0.28, 6, ridge, { cap: false });
  S.cyl(cs[0], cs[1], r0 + rH * 0.48, r0 + rH, 0.28, 0.04, 6, ridge);

  // ---- the two trụ biểu on the plaza outside the terrace's front corners: shafts, lantern heads, finials (9.85 m) ----
  const pY = yTop, hd = pY + 7.35;
  for (const s of [-1, 1]) {
    const q = at(pA, s * pB);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], y0 - 0.2, pY + 0.9, 1.6, 1.6, A, slab);
    S.box(q[0], q[1], pY + 0.9, pY + 1.1, 1.75, 1.75, A, trim);
    S.kind = KIND.CIVIC;
    S.box(q[0], q[1], pY + 1.1, hd, 0.95, 0.95, A, pillar, { taper: 0.94 });
    S.kind = KIND.PLAIN;
    S.box(q[0], q[1], pY + 2.4, hd - 0.7, 1.0, 0.6, A, panel); // couplet panels front/back
    S.box(q[0], q[1], hd, hd + 0.3, 1.25, 1.25, A, trim);
    for (const [k, w] of ([[1.5, 1.1], [3.2, 1.0], [5.0, 0.98]] as any[])) S.box(q[0], q[1], pY + k, pY + k + 0.14, w, w, A, trim); // banding on the shaft
    // the head: four stacked, flaring tiers narrowing upward, then a lotus seat and bud (as in sv-B and sv-C)
    let ty = hd + 0.3;
    for (const w of [1.08, 0.92, 0.76, 0.6]) {
      S.box(q[0], q[1], ty, ty + 0.12, w * 0.72, w * 0.72, A, yellowD); // neck
      S.kind = KIND.GLAZED;
      S.box(q[0], q[1], ty + 0.12, ty + 0.41, w, w, A, roof, { taper: 0.78 }); // flared, dark-glazed cornice
      S.kind = KIND.PLAIN;
      ty += 0.41;
    }
    S.cyl(q[0], q[1], ty, ty + 0.22, 0.18, 0.36, 8, ridge, { cap: false, rot: A }); // lotus seat
    S.cyl(q[0], q[1], ty + 0.22, hd + 2.5, 0.36, 0.04, 8, ridge, { rot: A }); // bud, its tip at 9.85 m
  }

  // ---- after dark ("67 lamps on roof, walls, pillars" since the restoration) ----
  const pos = [], col = [];
  const lampAt = (q, yy, cc = [1, 0.8, 0.45]) => { pos.push(q[0], yy, q[1]); col.push(cc[0], cc[1], cc[2]); };
  const eave = (b0, b1, yy, dd, n) => { for (let i = 0; i <= n; i++) for (const k of [-1, 1]) lampAt(at(aS + k * dd, b0 + ((b1 - b0) * i) / n), yy); };
  eave(-cW / 2 - 0.6, cW / 2 + 0.6, y + cH - 0.15, T / 2 + 0.8, 4);
  eave(-uW / 2 - 0.5, uW / 2 + 0.5, topY - 0.15, T * 0.425 + 0.7, 3);
  for (const s of [-1, 1]) eave(s * (sbB - sbW / 2 - 0.4), s * (sbB + sbW / 2 + 0.4), y + sbH - 0.15, T / 2 + 0.7, 3);
  for (const s of [-1, 1]) for (const k of [-1, 1]) lampAt(at(pA + k * 0.6, s * pB), hd + 0.5, [1, 0.85, 0.55]); // under the heads' first tier
  lampAt(cs, r0 + rH * 0.85);
  const pts = glowPoints(pos, col, 3);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);

  S.kind = KIND.PLAIN;
  S.base = 0;
}
