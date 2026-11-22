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
const T0 = -8.3, TI = 3.5, T1 = 9.6, HW = 8.8; // outer face, inner face, rampart's inner face; half width of the block
const FRONT = 7.0; // half width of the frontispiece that stands 0.25 m proud on each face
const YB = LAND_Y + 8.0; // block's flat top (estimate: about 1.4 m over the 6.6 m rampart, as the photo shows)
const PW = CITADEL_PASSAGE.w, PH = CITADEL_PASSAGE.h, SLOT = CITADEL_PASSAGE.slot; // passage 4.2 m wide, crown 5.4 m
const TT = -4.0; // the vọng lâu's centre on the passage axis

const BRICK = hex('#76604f'); // weathered grey-brown brick (sunlit in the 2024 Street View: about #89765f)
const BRICK_DARK = hex('#4c3f36'), BRICK_RED = hex('#8a5e48'), DAMP = hex('#3d352f');
const GREY = hex('#8a857b'), GREY_LIGHT = hex('#a49f92'), TABLET = hex('#7d7c74'), CARVE = hex('#56554f');
const PLASTER = hex('#d3ccb6'), PLASTER_DARK = hex('#b6ae97'), TILE = hex('#8e4f3a'), KNOB = hex('#e4e0d6');
const DARK = hex('#1f1a18');

export function build({ S }) {
  const keep = S.kind, n0 = S.n;
  const box = (s, t, y0, y1, ss, st, col, opts) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, opts); };
  const Y = LAND_Y, K = 10;
  const tc = (T0 + TI) / 2, D = TI - T0;
  // the passage in sections, [t0, t1, half width, crown], should a section ever be wider (one for now)
  const SECS = [[T0, TI, PW / 2, Y + PH]];
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
  const FACES = [[T0, -1, PW / 2, Y + PH], [TI, 1, PW / 2, Y + PH]]; // [face t, outward, arch half width, crown]
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

  // ---- the passage: barrel vaults, dark lining, the step where it narrows, paved floor ----------------------
  S.kind = KIND.PLAIN;
  SECS.forEach(([t0, t1, r, crown], i) => {
    const first = i === 0, last = i === SECS.length - 1;
    const tA = first ? t0 - 0.24 : t0, tB = last ? t1 + 0.24 : t1; // through the frontispiece on the faces
    const parts = [];
    if (first) parts.push([tA, t0 + 0.25, 0.7, 0.75]);
    parts.push([first ? t0 + 0.25 : t0, last ? t1 - 0.25 : t1, 0.32, 0]);
    if (last) parts.push([t1 - 0.25, tB, 0.7, 0.75]);
    const spring = crown - r;
    for (const [a0, a1, vs, ws] of parts) {
      for (let k = 0; k < K; k++) {
        const [sa, ya] = arc(k, r, crown), [sb, yb] = arc(k + 1, r, crown);
        S.quad(V(sa, a0, ya), V(sb, a0, yb), V(sb, a1, yb), V(sa, a1, ya), shade(BRICK, vs), N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
      }
      for (const sg of [-1, 1]) {
        const s = sg * (r - 0.01);
        S.quad(V(s, a0, Y), V(s, a1, Y), V(s, a1, spring), V(s, a0, spring), ws ? shade(BRICK, ws) : DARK, N(-sg, 0));
      }
    }
  });
  for (let i = 0; i + 1 < SECS.length; i++) { // the step face, looking back towards the wider section
    const [, t, r0, c0] = SECS[i], [, , r1, c1] = SECS[i + 1], tt = t - 0.01;
    for (let k = 0; k < K + 2; k++) {
      const [oa, yoa] = prof(k, r0, c0), [ob, yob] = prof(k + 1, r0, c0), [ia, yia] = prof(k, r1, c1), [ib, yib] = prof(k + 1, r1, c1);
      S.quad(V(oa, tt, yoa), V(ob, tt, yob), V(ib, tt, yib), V(ia, tt, yia), shade(BRICK, 0.45), N(0, -1));
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

  // ---- each face: the brick arch ring, the ledge, the tablet (blank on the city side), the damp and streaks --
  S.kind = KIND.PLAIN;
  for (const [tf, dt, r, crown] of FACES) {
    const t = tf + dt * 0.25; // the frontispiece's face
    const ring = 0.48;
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
    for (let i = 0; i < 9; i++) {
      const seed = i * 17 + (dt > 0 ? 5 : 0);
      const s = -FRONT + 0.4 + rand(seed, 1) * (2 * FRONT - 1.2), w = 0.3 + rand(seed, 2) * 0.7;
      if (Math.abs(s + w / 2) < r + 1.0) continue; // keep the arch and its ring clear
      const y0 = Y + 2.5 + rand(seed, 3) * 3.5;
      S.quad(V(s, t + dt * 0.03, y0), V(s + w, t + dt * 0.03, y0), V(s + w, t + dt * 0.03, YB - 0.35), V(s, t + dt * 0.03, YB - 0.35), mix(BRICK_DARK, BRICK, 0.45 + rand(seed, 4) * 0.35), N(0, dt));
    }
    // the grey cornice ledge over the arch; outside, the tablet with its three carved characters, inside a blank panel
    const yl = Math.min(crown + 1.0, YB - 1.6);
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
  // plans from Street View on Thái Phiên (the tower's width against the 4.2 m arch below it); the satellite's tile
  // roofs read a little larger, eaves and shadow included
  const L1 = { w: 7.7, d: 5.4, h: 3.4 }, L2 = { w: 3.9, d: 2.8, h: 2.3 };
  const y1 = YB;
  const tb = (s, t, ...rest) => box(s, t + TT, ...rest); // the tower stands at t = TT
  S.kind = KIND.MASONRY;
  tb(0, 0, y1, y1 + 0.3, L1.w + 0.5, L1.d + 0.5, shade(GREY, 0.95), { top: GREY_LIGHT, topKind: KIND.ROAD });
  const y1f = y1 + 0.3, yr1 = y1f + L1.h;
  S.kind = KIND.PLAIN; // smooth lime plaster
  tb(0, 0, y1f, yr1, L1.w, L1.d, PLASTER, { top: PLASTER_DARK });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    const t = (dt * L1.d) / 2;
    archOpening(S, 0, t + TT, dt, true, y1f, 2.5, 2.75, true);
    for (const s of [-2.6, 2.6]) archOpening(S, s, t + TT, dt, true, y1f + 0.25, 1.5, 1.95, false);
    tb(0, t + dt * 0.03, y1f, y1f + 0.35, L1.w + 0.02, 0.08, PLASTER_DARK); // stained foot
  }
  for (const sg of [-1, 1]) archOpening(S, (sg * L1.w) / 2, TT, sg, false, y1f, 1.5, 2.3, true);
  tierCap(S, tb, L1.w, L1.d, yr1, 0.55);

  // ---- the upper storey ---------------------------------------------------------------------------------------
  const y2 = yr1 + 0.42, yr2 = y2 + L2.h;
  S.kind = KIND.PLAIN;
  tb(0, 0, yr1, yr2, L2.w, L2.d, PLASTER, { top: PLASTER_DARK });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    const t = (dt * L2.d) / 2;
    tb(0, t + dt * 0.03, y2 + 0.35, y2 + 1.75, 2.3, 0.06, BRICK_RED); // the bare-brick panel
    archOpening(S, 0, t + TT + dt * 0.04, dt, true, y2 + 0.35, 1.5, 1.2, true, BRICK);
  }
  for (const sg of [-1, 1]) tb((sg * L2.w) / 2 + sg * 0.03, 0, y2 + 0.35, y2 + 1.6, 0.06, 1.4, BRICK_RED);
  tierCap(S, tb, L2.w, L2.d, yr2, 0.7);

  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = keep;
}

// A storey's cap: a plaster cornice, a low tiled hip edged with a row of standing tiles, a white knob on each corner.
function tierCap(S, box, w, d, y, rh) {
  S.kind = KIND.PLAIN;
  box(0, 0, y, y + 0.14, w + 0.3, d + 0.3, PLASTER_DARK);
  box(0, 0, y + 0.14, y + 0.32, w + 0.55, d + 0.55, PLASTER, { top: PLASTER });
  const yr = y + 0.32;
  S.kind = KIND.TILE;
  const c = P(0, TT);
  S.hip(c[0], c[1], w + 0.4, d + 0.4, A, yr, rh, TILE, { over: 0.0, ridgeCol: shade(TILE, 0.85) });
  // the row of standing tiles along the eave, and the corner knobs
  S.kind = KIND.PLAIN;
  const W = w + 0.5, Dd = d + 0.5;
  for (const [len, along, off] of [[W, true, Dd / 2], [W, true, -Dd / 2], [Dd, false, W / 2], [Dd, false, -W / 2]]) {
    const n = Math.round(len / 0.45);
    for (let k = 0; k < n; k++) {
      const u = -len / 2 + (len * (k + 0.5)) / n;
      if (along) box(u, off, yr, yr + 0.2, (len / n) * 0.62, 0.12, TILE, { top: shade(TILE, 1.1) });
      else box(off, u, yr, yr + 0.2, 0.12, (len / n) * 0.62, TILE, { top: shade(TILE, 1.1) });
    }
  }
  for (const si of [-1, 1]) for (const ti of [-1, 1]) {
    const p = P((si * W) / 2, TT + (ti * Dd) / 2);
    // the upswept corner (đao) of the eave, a curled tile ridge rising out along the diagonal
    S.kind = KIND.TILE;
    const q0 = V((si * W) / 2, TT + (ti * Dd) / 2, yr + 0.05), q1 = V((si * (W + 0.7)) / 2, TT + (ti * (Dd + 0.7)) / 2, yr + 0.6);
    const q2 = V((si * (W - 0.6)) / 2, TT + (ti * (Dd - 0.6)) / 2, yr + 0.28);
    S.tri(q0, q1, q2, shade(TILE, 0.9), [0, 1, 0]); S.tri(q0, q2, q1, shade(TILE, 0.9), [0, -1, 0]);
    S.kind = KIND.PLAIN;
    S.cyl(p[0], p[1], yr, yr + 0.22, 0.13, 0.13, 6, KNOB);
    S.cyl(p[0], p[1], yr + 0.22, yr + 0.45, 0.16, 0.05, 6, KNOB);
  }
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
