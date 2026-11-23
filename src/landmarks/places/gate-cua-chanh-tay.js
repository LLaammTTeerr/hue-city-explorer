import { KIND, hex, shade, mix, rand } from '../../geo/buf.js';
import { LAND_Y, PAL, WALL_H } from '../../config.js';
import { CITADEL_PASSAGE } from '../../geo/gates.js';

// Cửa Chánh Tây (正西門), the main west gate of the Huế Citadel, on Thái Phiên street. Sources and estimates:
// docs/places/gate-cua-chanh-tay.md.
//
// The arched passage dates from 1809 (Gia Long), the watch tower (vọng lâu) from 1829 (Minh Mạng). The tower was
// lost in the 20th century (the 1953 flood or the 1968 fighting, the sources disagree) and has been rebuilt; the gate
// was reopened to traffic in 2004. As it stands (photo of 2014 on Wikimedia Commons, "Cổng Chánh Tây"):
//   - a bare red-brown brick front, streaked dark with damp, flush with the rampart, one round-arched passage ringed
//     in brick voussoirs; a grey cornice ledge over the arch and above it the grey stone tablet "正西門";
//   - a grey plaster cornice and a parapet of recessed panels between posts round the gate's flat top;
//   - the vọng lâu in masonry, not timber: two storeys of lime-plastered brick, the lower one with a large open arch
//     in the middle of each long face and a smaller brick-rimmed arch either side, the upper a small block with a
//     bare-brick panel; each storey under a plaster cornice edged with a row of tiles, little ornaments on the corners.
// The moat in front of the gate (a lotus field on the satellite) is drawn by scripts/build-data.mjs and the street
// crosses it on the mapped cầu Chánh Tây; both belong to the rampart and the city, not to this file.
// Street View (2024, Thái Phiên both sides and through the passage) adds: on the city side the gate's front stands back in a notch of the
// rampart, behind a short open forecourt whose mouth is marked by two brick piers with stepped grey caps, and its
// panel over the arch is blank; the vọng lâu's eaves curl up at the corners and its upper storey has an open arch.
//
// Frame: s along the wall (the OSM footprint's long axis, which matches the satellite), t along the
// passage, t > 0 into the city.
export const id = 'gate:Cửa Chánh Tây';

const C = [-2921.5, -633.0]; // footprint centre (hue.json gates, from OSM)
const A = -2.197; // the footprint's long axis (along the wall)
const ux = Math.cos(A), uz = Math.sin(A);
const P = (s, t) => [C[0] + s * ux - t * uz, C[1] + s * uz + t * ux];
const V = (s, t, y) => { const p = P(s, t); return [p[0], y, p[1]]; };
const N = (ds, dt, dy = 0) => [ds * ux - dt * uz, dy, ds * uz + dt * ux];

// The block runs from the rampart's outer face (t = -8.15) to t = +3.5; from there to the rampart's inner face (+9.5)
// the passage runs on through an open forecourt between the slot's walls, capped piers at its mouth. The inner face's
// place is an estimate from Street View on Thái Phiên (2024: the 4.2 m arch seen about 15 m from the car, the
// rampart's face about 10 m) and the satellite (allowing for the image's lean, which shifts tops about 0.34 m per metre
// of height towards the city, the flat top spans t -8.8 to +2.6 and about 17 m along the wall, against the OSM
// footprint's 12.8 x 19.6 m). Satellite and Street View both put the vọng lâu over the outer half of the block: the
// satellite (lean allowed for) at t ~ -2.4, bearings from two car panos at t ~ -5.7.
// The passage in stages (Street View through it, car pano 2024): a wide outer vault where the door leaves stood
// open, about 5.4 m across and 5 m deep, then the narrower brick arch the doors hung in (about 4.7 m, seen 5-6 m
// from the outer mouth), then the 4.2 m vault on to the inner face. The outer face stands at the satellite's
// lean-corrected -8.8. From the outer mouth the inner mouth looks further away (25-30 m) than the 12 m block allows;
// the inner face's place is held by the city-side pano and the satellite (docs/places/gate-cua-chanh-tay.md).
const T0 = -8.8, TI = 3.5, T1 = 9.6, HW = 8.8; // outer face, inner face, rampart's inner face; half width of the block
const TD = T0 + 5.0, TD1 = TD + 0.8; // the door arch
const FRONT = 7.0; // half width of the frontispiece that stands 0.25 m proud on each face
const YB = LAND_Y + 8.0; // block's flat top (estimate: about 1.4 m over the 6.6 m rampart, as the photo shows)
const PW = CITADEL_PASSAGE.w, PH = CITADEL_PASSAGE.h, SLOT = CITADEL_PASSAGE.slot; // passage 4.2 m wide, crown 5.4 m
// The vọng lâu's centre: the satellite (lean allowed for) puts it about t -1 and 2-3 m NW (+s) of the passage
// axis; pano b sees it right of the inner arch by an offset that gives s +1.5 at that depth; s +2 drawn.
const TT = -1.5, TS = 2.0;

const BRICK = hex('#76604f'); // weathered grey-brown brick (sunlit in the 2024 Street View: about #89765f)
const BRICK_DARK = hex('#4c3f36'), BRICK_RED = hex('#8a5e48'), DAMP = hex('#3d352f');
const GREY = hex('#8a857b'), GREY_LIGHT = hex('#a49f92'), TABLET = hex('#7d7c74'), CARVE = hex('#56554f');
// the tower's lime plaster weathered grey (panos b and f), its roofs in orange-tan tile
const PLASTER = hex('#9d988b'), PLASTER_DARK = hex('#848074'), TILE = hex('#b4774c');
const LINING = hex('#7e5c4c'); // the passage's red brick lining, lit from the mouths
const DARK = hex('#1f1a18');

export function build({ S }) {
  const keep = S.kind, n0 = S.n;
  const box = (s, t, y0, y1, ss, st, col, opts) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, opts); };
  const Y = LAND_Y, K = 10;
  const tc = (T0 + TI) / 2, D = TI - T0;
  // the passage in sections, [t0, t1, half width, crown, light]: outer vault, door arch, inner vault
  const SECS = [[T0, TD, 2.7, Y + 5.7, 0.95], [TD, TD1, 2.35, Y + 5.5, 0.8], [TD1, TI, PW / 2, Y + PH, 0.66]];
  // a point on an arch profile: k = 0..K+2 runs up the left jamb, over the arch, down the right jamb
  const prof = (k, r, crown) => {
    const spring = crown - r;
    if (k === 0) return [-r, Y];
    if (k === K + 2) return [r, Y];
    const th = Math.PI - (Math.PI * (k - 1)) / K;
    return [r * Math.cos(th), spring + r * Math.sin(th)];
  };
  const arc = (k, r, crown) => prof(k + 1, r, crown);

  // ---- the block: brick piers either side of each section of the passage, masonry over its crown ---------------
  S.kind = KIND.MASONRY;
  for (const [t0, t1, r, crown] of SECS) {
    const tm = (t0 + t1) / 2, d = t1 - t0;
    for (const sg of [-1, 1]) box(sg * (HW + r) / 2, tm, Y - 0.5, YB, HW - r, d, BRICK, { top: GREY_LIGHT, topKind: KIND.ROAD });
    box(0, tm, crown, YB, 2 * r + 0.02, d, BRICK, { top: GREY_LIGHT, topKind: KIND.ROAD });
  }
  const FACES = [[T0, -1, 2.7, Y + 5.7], [TI, 1, PW / 2, Y + PH]]; // [face t, outward, arch half width, crown]
  // the frontispiece on each face, the spandrels of the arch on it
  for (const [tf, dt, r, crown] of FACES) {
    const tp = tf + dt * 0.125;
    for (const sg of [-1, 1]) box(sg * (FRONT + r) / 2, tp, Y - 0.5, YB, FRONT - r, 0.25, BRICK);
    box(0, tp, crown, YB, 2 * r + 0.02, 0.25, BRICK);
    const tfo = tf + dt * 0.25;
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arc(k, r, crown), [sb, yb] = arc(k + 1, r, crown);
      S.quad(V(sa, tfo, ya), V(sb, tfo, yb), V(sb, tfo, crown), V(sa, tfo, crown), BRICK, N(0, dt));
    }
    for (const sg of [-1, 1]) {
      const s = sg * FRONT;
      S.quad(V(s, tf, Y - 0.5), V(s, tfo, Y - 0.5), V(s, tfo, YB), V(s, tf, YB), BRICK, N(sg, 0));
    }
  }

  // ---- the passage: barrel vaults lined in red brick, mottled course by course, the steps where it narrows ----
  S.kind = KIND.PLAIN;
  const KV = 14;
  const arcV = (k, r, crown) => { const th = Math.PI - (Math.PI * k) / KV, sp = crown - r; return [r * Math.cos(th), sp + r * Math.sin(th)]; };
  SECS.forEach(([t0, t1, r, crown, light], i) => {
    const first = i === 0, last = i === SECS.length - 1;
    const tA = first ? t0 - 0.24 : t0, tB = last ? t1 + 0.24 : t1; // through the frontispiece on the faces
    const spring = crown - r, n = Math.max(1, Math.round((tB - tA) / 0.55));
    for (let j = 0; j < n; j++) {
      const a0 = tA + ((tB - tA) * j) / n, a1 = tA + ((tB - tA) * (j + 1)) / n;
      // light falls off from the nearer mouth of the passage
      const f = light * (0.82 + 0.18 * Math.abs((a0 + a1) / 2 - (T0 + TI) / 2) / ((TI - T0) / 2));
      for (let k = 0; k < KV; k++) {
        const [sa, ya] = arcV(k, r, crown), [sb, yb] = arcV(k + 1, r, crown);
        const c = shade(LINING, f * (0.86 + 0.24 * rand(i * 997 + j * 31 + k, 3)));
        S.quad(V(sa, a0, ya), V(sb, a0, yb), V(sb, a1, yb), V(sa, a1, ya), c, N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
      }
      for (const sg of [-1, 1]) {
        const s = sg * (r - 0.01);
        for (let b = 0; b < 3; b++) { // the wall in three bands, the lowest one damp
          const y0 = Y + ((spring - Y) * b) / 3, y1 = Y + ((spring - Y) * (b + 1)) / 3;
          const c = b === 0 ? mix(DAMP, LINING, 0.45 + 0.2 * rand(j * 7 + i, 5)) : shade(LINING, f * 0.92 * (0.86 + 0.24 * rand(i * 991 + j * 13 + b * 5 + (sg > 0 ? 50 : 0), 4)));
          S.quad(V(s, a0, y0), V(s, a1, y0), V(s, a1, y1), V(s, a0, y1), c, N(-sg, 0));
        }
        // the course of stone at the springing
        const sc = sg * (r - 0.03);
        S.quad(V(sc, a0, spring - 0.14), V(sc, a1, spring - 0.14), V(sc, a1, spring), V(sc, a0, spring), shade(GREY, f * 0.8), N(-sg, 0));
      }
    }
  });
  for (let i = 0; i + 1 < SECS.length; i++) { // the step face, looking back towards the wider section
    const [, t, r0, c0] = SECS[i], [, , r1, c1] = SECS[i + 1], tt = t - 0.01;
    for (let k = 0; k < K + 2; k++) {
      const [oa, yoa] = prof(k, r0, c0), [ob, yob] = prof(k + 1, r0, c0), [ia, yia] = prof(k, r1, c1), [ib, yib] = prof(k + 1, r1, c1);
      S.quad(V(oa, tt, yoa), V(ob, tt, yob), V(ib, tt, yib), V(ia, tt, yia), shade(LINING, 0.62 - 0.1 * i), N(0, -1));
    }
  }

  // ---- the forecourt inside: the slot's walls from the inner face to the rampart's, capped piers at its mouth --
  S.kind = KIND.MASONRY;
  const yW = Y + WALL_H;
  for (const sg of [-1, 1]) {
    box(sg * (SLOT / 2 + 0.45), (TI + T1) / 2, Y - 0.5, yW, 0.9, T1 - TI, BRICK, { top: GREY_LIGHT });
    S.quad(V(sg * SLOT / 2, TI, Y + 0.02), V(sg * SLOT / 2, T1, Y + 0.02), V(sg * SLOT / 2, T1, Y + 0.9), V(sg * SLOT / 2, TI, Y + 0.9), DAMP, N(-sg, 0));
    // the pier at the forecourt's mouth, standing a little proud of the rampart's face; its cap about 5.5 m up
    const sp = sg * (SLOT / 2 + 0.55), tp = T1 - 0.3, yc = Y + 4.3;
    box(sp, tp, Y - 0.5, yc, 1.3, 1.2, BRICK, { top: GREY_LIGHT });
    box(sp, tp, yc, yc + 0.25, 1.6, 1.5, GREY, { top: GREY_LIGHT });
    box(sp, tp, yc + 0.25, yc + 0.8, 1.1, 1.0, GREY_LIGHT, { taper: 1.3 });
    box(sp, tp, yc + 0.8, yc + 1.05, 1.7, 1.6, GREY, { top: GREY_LIGHT });
    box(sp, tp, yc + 1.05, yc + 1.25, 0.9, 0.8, GREY_LIGHT, { taper: 0.6 });
  }
  S.kind = KIND.ROAD;
  S.quad(V(-PW / 2, T0 - 0.55, Y + 0.02), V(PW / 2, T0 - 0.55, Y + 0.02), V(PW / 2, T1 + 0.3, Y + 0.02), V(-PW / 2, T1 + 0.3, Y + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);
  for (const sg of [-1, 1]) { // the floor of the wider stages either side of the roadway
    const s0 = sg * PW / 2, s1 = sg * 2.7;
    S.quad(V(Math.min(s0, s1), T0 - 0.3, Y + 0.02), V(Math.max(s0, s1), T0 - 0.3, Y + 0.02), V(Math.max(s0, s1), TD1, Y + 0.02), V(Math.min(s0, s1), TD1, Y + 0.02), shade(PAL.stone, 0.55), [0, 1, 0]);
  }

  // ---- each face: the brick arch ring, the ledge, the tablet (blank on the city side), the damp and streaks --
  S.kind = KIND.PLAIN;
  for (const [tf, dt, r, crown] of FACES) {
    const t = tf + dt * 0.25; // the frontispiece's face
    const ring = dt < 0 ? 0.42 : 0.48; // the wider outer arch has a slimmer ring, to leave room for the tablet
    for (const [r0, r1, d, col] of [[r, r + ring, 0.06, BRICK_RED], [r + ring, r + 2 * ring - 0.06, 0.1, shade(BRICK_RED, 0.9)]]) {
      for (let k = 0; k < K; k++) {
        const [ia, ya] = arc(k, r0, crown - r + r0), [ib, yb] = arc(k + 1, r0, crown - r + r0), [oa, yoa] = arc(k, r1, crown - r + r1), [ob, yob] = arc(k + 1, r1, crown - r + r1);
        S.quad(V(ia, t + dt * d, ya), V(ib, t + dt * d, yb), V(ob, t + dt * d, yob), V(oa, t + dt * d, yoa), col, N(0, dt));
      }
    }
    for (const sg of [-1, 1]) {
      const s0 = sg * (r + 0.02), s1 = sg * FRONT;
      S.quad(V(Math.min(s0, s1), t + dt * 0.02, Y), V(Math.max(s0, s1), t + dt * 0.02, Y), V(Math.max(s0, s1), t + dt * 0.02, Y + 0.9), V(Math.min(s0, s1), t + dt * 0.02, Y + 0.9), DAMP, N(0, dt));
    }
    box(0, t + dt * 0.1, YB - 1.15, YB - 0.95, 2 * FRONT + 0.4, 0.2, GREY, { top: GREY_LIGHT }); // the string course
    // damp streaks running down from the cornice, tapering as they fade, and patches of moss under the string
    // course: soft and close to the brick's colour, so they read as weathering rather than panels
    const streak = (s0, w, yTop, yBot, col, d) => {
      const sb = s0 + w * (0.3 + 0.4 * rand(Math.round(s0 * 100), 9)), td = t + dt * d;
      S.quad(V(s0, td, yTop), V(s0 + w, td, yTop), V(sb + w * 0.12, td, yBot), V(sb - w * 0.12, td, yBot), col, N(0, dt));
    };
    for (let i = 0; i < 14; i++) {
      const seed = i * 17 + (dt > 0 ? 5 : 0);
      const s = -FRONT + 0.4 + rand(seed, 1) * (2 * FRONT - 1.2), w = 0.25 + rand(seed, 2) * 0.55;
      if (Math.abs(s + w / 2) < r + 1.1) continue; // keep the arch and its ring clear
      const yBot = Y + 1.2 + rand(seed, 3) * 4.0;
      streak(s, w, YB - 1.2, yBot, mix(BRICK_DARK, BRICK, 0.62 + rand(seed, 4) * 0.22), 0.03);
    }
    for (let i = 0; i < 7; i++) {
      const seed = i * 11 + (dt > 0 ? 3 : 0);
      const s0 = -FRONT + 0.5 + rand(seed, 7) * (2 * FRONT - 1.6), w0 = 0.4 + rand(seed, 8) * 0.9;
      if (Math.abs(s0 + w0 / 2) < r + 1.1) continue;
      streak(s0, w0, YB - 1.18, YB - 1.5 - rand(seed, 6) * 0.9, mix(BRICK, hex('#5c6340'), 0.3 + rand(seed, 5) * 0.15), 0.035);
    }
    // the grey cornice ledge over the arch; outside, the tablet with its three carved characters, inside a blank panel
    const yl = Math.max(crown + 2 * ring - 0.04, Math.min(crown + 1.0, YB - 1.6));
    box(0, t + dt * 0.12, yl, yl + 0.22, 6.6, 0.24, GREY, { top: GREY_LIGHT });
    box(0, t + dt * 0.07, yl + 0.22, yl + 0.34, 6.2, 0.14, shade(GREY, 0.85));
    const yt = yl + 0.42, th = Math.min(1.15, YB - 0.4 - yt);
    if (dt < 0) {
      box(0, t + dt * 0.09, yt, yt + th, 3.1, 0.18, GREY_LIGHT);
      box(0, t + dt * 0.15, yt + 0.1, yt + th - 0.1, 2.75, 0.06, TABLET);
      for (const k of [-1, 0, 1]) box(k * 0.82, t + dt * 0.19, yt + 0.18, yt + th - 0.18, 0.58, 0.04, CARVE);
    } else {
      box(0, t + dt * 0.06, yt, yt + th, 4.4, 0.12, GREY_LIGHT);
      box(0, t + dt * 0.09, yt + 0.12, yt + th - 0.12, 4.0, 0.04, shade(GREY, 0.82));
    }
  }

  // ---- the cornice and the panelled parapet round the flat top ------------------------------------------------
  S.kind = KIND.MASONRY;
  box(0, tc, YB - 0.35, YB, 2 * HW + 0.2, D + 0.7, GREY, { top: GREY_LIGHT, topKind: KIND.ROAD });
  const PH2 = 0.95, PT = 0.45;
  const edges = [ // [s or t centre, along s?, length, outward sign]
    [T0 - 0.35 + PT / 2, true, 2 * HW + 0.2, -1], [TI + 0.35 - PT / 2, true, 2 * HW + 0.2, 1],
    [-HW - 0.1 + PT / 2, false, D + 0.7, -1], [HW + 0.1 - PT / 2, false, D + 0.7, 1],
  ];
  for (const [c, along, len, sg] of edges) {
    const bx = (u, y0, y1, l, th, col, o) => along ? box(u, c + sg * (o || 0), y0, y1, l, th, col, { top: GREY_LIGHT }) : box(c + sg * (o || 0), tc + u, y0, y1, th, l, col, { top: GREY_LIGHT });
    bx(0, YB, YB + PH2, len, PT, GREY);
    bx(0, YB + PH2, YB + PH2 + 0.12, len + 0.1, PT + 0.14, GREY_LIGHT);
    const n = Math.max(2, Math.round(len / 2.2));
    for (let k = 0; k <= n; k++) bx(-len / 2 + 0.25 + ((len - 0.5) * k) / n, YB, YB + PH2 + 0.22, 0.42, PT + 0.12, GREY_LIGHT); // posts
    for (let k = 0; k < n; k++) bx(-len / 2 + 0.25 + ((len - 0.5) * (k + 0.5)) / n, YB + 0.18, YB + PH2 - 0.16, (len - 0.5) / n - 0.75, PT + 0.04, shade(GREY, 0.8), 0); // recessed panels, darker
  }

  // ---- the vọng lâu, lower storey ----------------------------------------------------------------------------
  // sizes from the car panos: from Lương Ngọc Quyền (b, about 21 m away) the lower roof spans about 7 m and the upper
  // about 3.2 m; from the NW (f, about 33 m, seen 36 degrees off the end) the lower roof reads 8.4 m across, which
  // fits a plan of about 7 x 5.4 m over the eaves. The satellite's 10.6 x 6.8 m outline includes the image's lean.
  const L1 = { w: 6.3, d: 4.8, h: 2.1 }, L2 = { w: 2.7, d: 2.2, h: 1.9 };
  const y1 = YB;
  const tb = (s, t, ...rest) => box(s + TS, t + TT, ...rest); // the tower stands at s = TS, t = TT
  S.kind = KIND.MASONRY;
  tb(0, 0, y1, y1 + 0.3, L1.w + 0.5, L1.d + 0.5, shade(GREY, 0.95), { top: GREY_LIGHT, topKind: KIND.ROAD });
  const y1f = y1 + 0.3, yr1 = y1f + L1.h;
  S.kind = KIND.PLAIN; // lime plaster, weathered grey
  tb(0, 0, y1f, yr1, L1.w, L1.d, PLASTER, { top: PLASTER_DARK });
  for (const dt of [-1, 1]) {
    const t = (dt * L1.d) / 2;
    archOpening(S, TS, t + TT, dt, true, y1f, 1.8, 1.8, true);
    for (const s of [-2.05, 2.05]) archOpening(S, s + TS, t + TT, dt, true, y1f + 0.2, 1.0, 1.3, false);
    tb(0, t + dt * 0.03, y1f, y1f + 0.35, L1.w + 0.02, 0.08, PLASTER_DARK); // stained foot
  }
  for (const sg of [-1, 1]) archOpening(S, TS + (sg * L1.w) / 2, TT, sg, false, y1f, 1.2, 1.6, true);
  tierCap(S, tb, L1.w, L1.d, yr1, 0.85, 0.3);

  // ---- the upper storey ---------------------------------------------------------------------------------------
  const y2 = yr1 + 0.3, yr2 = y2 + L2.h;
  S.kind = KIND.PLAIN;
  tb(0, 0, yr1, yr2, L2.w, L2.d, PLASTER, { top: PLASTER_DARK });
  for (const dt of [-1, 1]) {
    const t = (dt * L2.d) / 2;
    tb(0, t + dt * 0.03, y2 + 0.45, y2 + 1.6, 1.7, 0.06, BRICK_RED); // the bare-brick panel
    archOpening(S, TS, t + TT + dt * 0.04, dt, true, y2 + 0.5, 1.0, 0.95, true, BRICK);
  }
  for (const sg of [-1, 1]) tb((sg * L2.w) / 2 + sg * 0.03, 0, y2 + 0.5, y2 + 1.5, 0.06, 1.1, BRICK_RED);
  tierCap(S, tb, L2.w, L2.d, yr2, 0.8, 0.28);

  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = keep;
}

// A storey's cap: a plaster cornice and a pitched hip of orange-tan tile, its eaves curling up at the corners into
// short upturned hip ends (Buf.hip, slight flare, no long horns), a small ornament on the ridge.
function tierCap(S, box, w, d, y, rh, over) {
  S.kind = KIND.PLAIN;
  box(0, 0, y, y + 0.12, w + 0.2, d + 0.2, PLASTER_DARK);
  box(0, 0, y + 0.12, y + 0.26, w + 0.36, d + 0.36, PLASTER, { top: PLASTER });
  const yr = y + 0.26;
  const c = P(TS, TT);
  S.hip(c[0], c[1], w, d, A, yr, rh, TILE, { over, flare: 0.1, segs: 3, ridgeCol: shade(TILE, 0.8) });
  // a small ornament curling up from each corner of the eave
  S.kind = KIND.TILE;
  const W = w + 2 * over, D = d + 2 * over;
  for (const si of [-1, 1]) for (const ti of [-1, 1]) {
    const q0 = V(TS + (si * (W - 0.5)) / 2, TT + (ti * (D - 0.5)) / 2, yr + 0.12);
    const q1 = V(TS + (si * (W + 0.25)) / 2, TT + (ti * (D + 0.25)) / 2, yr + 0.42);
    const q2 = V(TS + (si * W) / 2, TT + (ti * D) / 2, yr + 0.05);
    S.tri(q0, q1, q2, shade(TILE, 0.8), [0, 1, 0]); S.tri(q0, q2, q1, shade(TILE, 0.8), [0, -1, 0]);
  }
  S.kind = KIND.PLAIN;
  const rl = Math.max(0.1, (w - d) / 2) * 0.6, top = yr + rh;
  for (const u of [-rl, rl]) { const p = P(TS + u, TT); S.cyl(p[0], p[1], top - 0.05, top + 0.22, 0.09, 0.04, 6, PLASTER_DARK); }
}

// An arched opening on a face: open (a dark recess) or blind (plaster fill), framed by a brick-red rim.
// along: the face is at constant t, the opening centred at s; otherwise the face is at constant s, centred at t.
function archOpening(S, s, t, sg, along, y0, w, h, open, rim = BRICK_RED) {
  const r = w / 2, spring = y0 + h - r, K = 8;
  const at = (u, y, d) => (along ? V(s + u, t + sg * d, y) : V(s + sg * d, t + u, y));
  const n = along ? N(0, sg) : N(sg, 0);
  for (const [rr, d, col] of [[r + 0.2, 0.03, rim], [r, 0.05, open ? DARK : PLASTER_DARK]]) {
    S.quad(at(-rr, y0, d), at(rr, y0, d), at(rr, spring, d), at(-rr, spring, d), col, n);
    for (let k = 0; k < K; k++) {
      const a0 = Math.PI - (Math.PI * k) / K, a1 = Math.PI - (Math.PI * (k + 1)) / K;
      S.tri(at(0, spring, d), at(rr * Math.cos(a0), spring + rr * Math.sin(a0), d), at(rr * Math.cos(a1), spring + rr * Math.sin(a1), d), col, n);
    }
  }
}
