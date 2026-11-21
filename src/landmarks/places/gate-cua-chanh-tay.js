import { KIND, hex, shade, mix, rand } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
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
// The moat in front of this gate has been filled in (the bridge way crosses dry land, scripts/build-data.mjs), so
// there is no bridge to draw: the street runs straight up to the arch.
//
// Frame: s along the wall (the OSM footprint's long side, 19.6 m), t along the passage, t > 0 into the city.
export const id = 'gate:Cửa Chánh Tây';

const C = [-2921.5, -633.0]; // footprint centre (hue.json gates, from OSM)
const A = -2.197; // the footprint's long axis (along the wall)
const ux = Math.cos(A), uz = Math.sin(A);
const P = (s, t) => [C[0] + s * ux - t * uz, C[1] + s * uz + t * ux];
const V = (s, t, y) => { const p = P(s, t); return [p[0], y, p[1]]; };
const N = (ds, dt, dy = 0) => [ds * ux - dt * uz, dy, ds * uz + dt * ux];

// the block reaches both faces of the rampart (outer face at t = -8.15, inner at +9.5, the notch at the gate +6.4)
const T0 = -8.3, T1 = 9.7, HW = 10.3; // t extent and half width of the block (footprint 19.6 m + the slot's lap)
const FRONT = 7.0; // half width of the frontispiece that stands 0.25 m proud on each face
const YB = LAND_Y + 8.0; // block's flat top (estimate: about 1.4 m over the 6.6 m rampart, as the photo shows)
const PW = CITADEL_PASSAGE.w, PH = CITADEL_PASSAGE.h; // the passage: 4.2 m wide, crown 5.4 m

const BRICK = hex('#74503f'); // weathered red-brown brick
const BRICK_DARK = hex('#4c3a32'), BRICK_RED = hex('#9a5a42'), DAMP = hex('#3d332d');
const GREY = hex('#8f8b80'), GREY_LIGHT = hex('#a9a497'), TABLET = hex('#7d7c74'), CARVE = hex('#56554f');
const PLASTER = hex('#d3ccb6'), PLASTER_DARK = hex('#b6ae97'), TILE = hex('#8e4f3a'), KNOB = hex('#e4e0d6');
const DARK = hex('#1f1a18');

export function build({ S }) {
  const keep = S.kind, n0 = S.n;
  const box = (s, t, y0, y1, ss, st, col, opts) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, opts); };
  const Y = LAND_Y, r = PW / 2, crown = Y + PH, spring = crown - r, K = 10;
  const tc = (T0 + T1) / 2, D = T1 - T0;

  // ---- the block: two brick piers either side of the passage, the masonry over the crown ---------------------
  S.kind = KIND.MASONRY;
  for (const sg of [-1, 1]) box(sg * (HW + r) / 2, tc, Y - 0.5, YB, HW - r, D, BRICK, { top: GREY_LIGHT, topKind: KIND.ROAD });
  box(0, tc, crown, YB, PW + 0.02, D, BRICK, { top: GREY_LIGHT, topKind: KIND.ROAD });
  // the frontispiece on each face, the spandrels of the arch on it
  const arc = (k, rr = r) => { const th = Math.PI - (Math.PI * k) / K; return [rr * Math.cos(th), spring + rr * Math.sin(th)]; };
  for (const [tf, dt] of [[T0, -1], [T1, 1]]) {
    const tp = tf + dt * 0.125;
    for (const sg of [-1, 1]) box(sg * (FRONT + r) / 2, tp, Y - 0.5, YB, FRONT - r, 0.25, BRICK);
    box(0, tp, crown, YB, PW + 0.02, 0.25, BRICK);
    const tfo = tf + dt * 0.25;
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
      S.quad(V(sa, tfo, ya), V(sb, tfo, yb), V(sb, tfo, crown), V(sa, tfo, crown), BRICK, N(0, dt));
    }
    // the frontispiece's returns, so its sides read
    for (const sg of [-1, 1]) {
      const s = sg * FRONT;
      S.quad(V(s, tf, Y - 0.5), V(s, tfo, Y - 0.5), V(s, tfo, YB), V(s, tf, YB), BRICK, N(sg, 0));
    }
  }

  // ---- the passage: barrel vault, dark lining, paved floor ----------------------------------------------------
  S.kind = KIND.PLAIN;
  const ta = T0 + 0.25, tb = T1 - 0.25, tA = T0 - 0.24, tB = T1 + 0.24;
  for (let k = 0; k < K; k++) {
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    for (const [t0, t1, col] of [[tA, ta, shade(BRICK, 0.7)], [ta, tb, shade(BRICK, 0.32)], [tb, tB, shade(BRICK, 0.7)]]) {
      S.quad(V(sa, t0, ya), V(sb, t0, yb), V(sb, t1, yb), V(sa, t1, ya), col, N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
    }
  }
  for (const sg of [-1, 1]) {
    const s = sg * (r - 0.01);
    for (const [t0, t1, col] of [[tA, ta, shade(BRICK, 0.75)], [ta, tb, DARK], [tb, tB, shade(BRICK, 0.75)]]) {
      S.quad(V(s, t0, Y), V(s, t1, Y), V(s, t1, spring), V(s, t0, spring), col, N(-sg, 0));
    }
  }
  S.kind = KIND.ROAD;
  S.quad(V(-r, tA - 0.3, Y + 0.02), V(r, tA - 0.3, Y + 0.02), V(r, tB + 0.3, Y + 0.02), V(-r, tB + 0.3, Y + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);

  // ---- each face: the brick arch ring, the ledge, the name tablet, the damp and the streaks ------------------
  S.kind = KIND.PLAIN;
  for (const [tf, dt] of [[T0, -1], [T1, 1]]) {
    const t = tf + dt * 0.25; // the frontispiece's face
    // two rings of brick voussoirs, the outer one a little proud
    for (const [r0, r1, d, col] of [[r, r + 0.48, 0.06, BRICK_RED], [r + 0.48, r + 0.9, 0.1, shade(BRICK_RED, 0.9)]]) {
      for (let k = 0; k < K; k++) {
        const [ia, ya] = arc(k, r0), [ib, yb] = arc(k + 1, r0), [oa, yoa] = arc(k, r1), [ob, yob] = arc(k + 1, r1);
        S.quad(V(ia, t + dt * d, ya), V(ib, t + dt * d, yb), V(ob, t + dt * d, yob), V(oa, t + dt * d, yoa), col, N(0, dt));
      }
    }
    // a damp band at the foot
    for (const sg of [-1, 1]) {
      const s0 = sg * (r + 0.02), s1 = sg * FRONT;
      S.quad(V(Math.min(s0, s1), t + dt * 0.02, Y), V(Math.max(s0, s1), t + dt * 0.02, Y), V(Math.max(s0, s1), t + dt * 0.02, Y + 0.9), V(Math.min(s0, s1), t + dt * 0.02, Y + 0.9), DAMP, N(0, dt));
    }
    // dark streaks of lichen and soot from the top down
    for (let i = 0; i < 9; i++) {
      const seed = i * 17 + (dt > 0 ? 5 : 0);
      const s = -FRONT + 0.4 + rand(seed, 1) * (2 * FRONT - 1.2), w = 0.3 + rand(seed, 2) * 0.7;
      if (Math.abs(s + w / 2) < r + 1.0) continue; // keep the arch and its ring clear
      const y0 = Y + 2.5 + rand(seed, 3) * 3.5;
      S.quad(V(s, t + dt * 0.03, y0), V(s + w, t + dt * 0.03, y0), V(s + w, t + dt * 0.03, YB - 0.35), V(s, t + dt * 0.03, YB - 0.35), mix(BRICK_DARK, BRICK, 0.45 + rand(seed, 4) * 0.35), N(0, dt));
    }
    // the grey cornice ledge over the arch, and the tablet with its three carved characters
    const yl = crown + 1.0;
    box(0, t + dt * 0.12, yl, yl + 0.22, 6.6, 0.24, GREY, { top: GREY_LIGHT });
    box(0, t + dt * 0.07, yl + 0.22, yl + 0.34, 6.2, 0.14, shade(GREY, 0.85));
    const yt = yl + 0.45;
    box(0, t + dt * 0.09, yt, yt + 1.15, 3.1, 0.18, GREY_LIGHT);
    box(0, t + dt * 0.15, yt + 0.12, yt + 1.03, 2.75, 0.06, TABLET);
    for (const k of [-1, 0, 1]) box(k * 0.82, t + dt * 0.19, yt + 0.22, yt + 0.93, 0.58, 0.04, CARVE);
  }

  // ---- the cornice and the panelled parapet round the flat top ------------------------------------------------
  S.kind = KIND.MASONRY;
  box(0, tc, YB - 0.35, YB, 2 * HW + 0.2, D + 0.7, GREY, { top: GREY_LIGHT, topKind: KIND.ROAD });
  const PH2 = 0.95, PT = 0.45;
  const edges = [ // [s or t centre, along s?, length, outward sign]
    [T0 - 0.35 + PT / 2, true, 2 * HW + 0.2, -1], [T1 + 0.35 - PT / 2, true, 2 * HW + 0.2, 1],
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
  const L1 = { w: 9.4, d: 6.2, h: 3.4 }, L2 = { w: 4.8, d: 3.4, h: 2.3 };
  const y1 = YB;
  S.kind = KIND.MASONRY;
  box(0, 0, y1, y1 + 0.3, L1.w + 0.5, L1.d + 0.5, shade(GREY, 0.95), { top: GREY_LIGHT, topKind: KIND.ROAD });
  const y1f = y1 + 0.3, yr1 = y1f + L1.h;
  S.kind = KIND.PLAIN; // smooth lime plaster
  box(0, 0, y1f, yr1, L1.w, L1.d, PLASTER, { top: PLASTER_DARK });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    const t = (dt * L1.d) / 2;
    archOpening(S, 0, t, dt, true, y1f, 2.5, 2.75, true);
    for (const s of [-3.2, 3.2]) archOpening(S, s, t, dt, true, y1f + 0.25, 1.5, 1.95, false);
    box(0, t + dt * 0.03, y1f, y1f + 0.35, L1.w + 0.02, 0.08, PLASTER_DARK); // stained foot
  }
  for (const sg of [-1, 1]) archOpening(S, (sg * L1.w) / 2, 0, sg, false, y1f, 1.5, 2.3, true);
  tierCap(S, box, L1.w, L1.d, yr1, 0.55);

  // ---- the upper storey ---------------------------------------------------------------------------------------
  const y2 = yr1 + 0.42, yr2 = y2 + L2.h;
  S.kind = KIND.PLAIN;
  box(0, 0, yr1, yr2, L2.w, L2.d, PLASTER, { top: PLASTER_DARK });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    const t = (dt * L2.d) / 2;
    box(0, t + dt * 0.03, y2 + 0.35, y2 + 1.75, 2.7, 0.06, BRICK_RED); // the bare-brick panel
    archOpening(S, 0, t + dt * 0.04, dt, true, y2 + 0.35, 1.7, 1.05, false, BRICK);
  }
  for (const sg of [-1, 1]) box((sg * L2.w) / 2 + sg * 0.03, 0, y2 + 0.35, y2 + 1.6, 0.06, 1.6, BRICK_RED);
  tierCap(S, box, L2.w, L2.d, yr2, 0.7);

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
  const c = P(0, 0);
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
    const p = P((si * W) / 2, (ti * Dd) / 2);
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
