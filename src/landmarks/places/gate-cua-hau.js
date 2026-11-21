import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';

// Cửa Hậu (Chánh Bắc Môn), the north gate of the Huế Citadel (Kinh thành). Notes and sources: docs/places/gate-cua-hau.md.
//
// The arched gate was built in 1809 under Gia Long and the watch tower (vọng lâu) on it in 1831 under Minh Mạng. It was
// walled up after 1885 when the French set up the Mang Cá post, opened again in 2004, and since 2012 Đinh Tiên Hoàng runs
// through it to Cầu Cửa Hậu over the moat. As it stands (Commons, Cửa_Chánh_Bắc.jpg): a single arched passage through a
// block of near-black weathered brick and stucco that stands a little proud of the rampart, a framed name tablet over
// the arch inside a raised central bay, a cornice and a low balustrade with posts round the flat top; on it a masonry
// tower in two storeys — the lower one with three arches on the long faces, the upper one with one — each under a
// skirt of terracotta tiles edged in yellow, ridge beasts on top.
//
// Plan: the OSM outline (way 367959063), 18.1 m along the wall. Through the wall the block runs from the rampart's inner
// face (OSM) to 1 m proud of its outer face (the rampart band in hue.json is 14.4 m thick here), so the passage goes
// right through. The road (OSM 367959074) runs along the passage axis.
// Local frame: s along the wall, t through it, + out of the Citadel (north-west, towards the moat and the bridge).
export const id = 'gate:Cửa Hậu';

const C = [-1910.8, -1980.5]; // centre of the OSM outline, metres in the model frame
const PA = -2.2137; // passage direction (outward), the bearing of Đinh Tiên Hoàng through the gate
const A = PA - Math.PI / 2; // direction of s
const ux = Math.cos(A), uz = Math.sin(A);
const P = (s, t) => [C[0] + s * ux - t * uz, C[1] + s * uz + t * ux];
const V = (s, t, y) => { const p = P(s, t); return [p[0], y, p[1]]; };
const N = (ds, dt, dy = 0) => [ds * ux - dt * uz, dy, ds * uz + dt * ux];

const L = 18.1; // block along the wall (OSM)
const T0 = -6.6, T1 = 9.3; // block faces through the wall: rampart inner face -6.05, outer face +8.34 (hue.json band)
const TC = (T0 + T1) / 2, D = T1 - T0;
const HB = 8.4; // block to the top of its frieze (estimate: in the photo the block stands ~1.3× the rampart beside it)
const ARCH = { s: 0, w: 4.0, h: 4.8 }; // the passage (estimate from the photo: ~4 m wide)
const BAY = 3.3; // half-width of the raised central bay, between its pilasters
const UP1 = { w: 8.6, d: 6.2, h: 3.4 }; // tower, lower storey (estimates)
const UP2 = { w: 4.0, d: 3.0, h: 1.85 }; // tower, upper storey

const BODY = hex('#5b5953'); // brick and stucco gone near-black with damp and lichen
const BODY_UP = hex('#67655e');
const DAMP = hex('#3f3d38');
const TRIM = hex('#77746b'); // cornices, pilasters and frames, slightly lighter where the stucco has held
const BAND = hex('#525c60'); // the blue-grey band between the two storeys
const ARCHIN = hex('#7e5442'); // the passage lining: bare red brick
const DARK = hex('#1c1917');
const TILE = hex('#b4653f'); // terracotta tiles
const FASCIA = hex('#d3a24c'); // the yellow eave band
const CREST = hex('#8f8c84');
const TABLET = hex('#9a958a'), FIELD = hex('#2c2a27'), CHAR = hex('#b9b1a0');

export function build({ S }) {
  const Y = LAND_Y, keep = S.kind, n0 = S.n;
  const box = (s, t, y0, y1, ss, st, col, opts) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, opts); };

  // ---- the block: two piers and the mass over the arch, the passage driven right through --------------------------
  S.kind = KIND.MASONRY;
  const r = ARCH.w / 2;
  for (const sg of [-1, 1]) {
    const a = r, b = L / 2;
    box(sg * (a + b) / 2, TC, Y - 0.5, Y + HB, b - a, D, BODY, { top: BODY });
    box(sg * (a + b) / 2, TC, Y - 0.5, Y + 0.7, b - a + 0.12, D + 0.12, DAMP, { top: DAMP }); // damp band at the foot
  }
  archPassage(S, ARCH, Y, Y + HB, T0, T1);

  // the two faces: raised central bay with pilasters, a cornice band over the arch, the name tablet
  S.kind = KIND.PLAIN;
  for (const [t, dt] of [[T1, 1], [T0, -1]]) {
    for (const sg of [-1, 1]) {
      box(sg * (BAY + 0.35), t + dt * 0.1, Y + 0.7, Y + HB - 0.1, 0.7, 0.2, TRIM); // pilasters framing the bay
      box(sg * (L / 2 - 0.35), t + dt * 0.06, Y + 0.7, Y + HB - 0.1, 0.7, 0.12, shade(TRIM, 0.92)); // corner pilasters
      box(sg * (BAY + r) / 2 + sg * 0.15, t + dt * 0.04, Y + 0.7, Y + HB - 0.1, BAY - r - 0.4, 0.08, shade(BODY, 1.06)); // the bay stands proud
    }
    box(0, t + dt * 0.12, Y + 6.1, Y + 6.45, 2 * BAY + 1.2, 0.26, TRIM); // cornice band under the tablet
    box(0, t + dt * 0.08, Y + 6.45, Y + HB - 0.1, 2 * BAY, 0.1, shade(BODY, 1.06)); // the bay's upper panel
    // the tablet: a moulded frame, a dark field, three characters
    box(0, t + dt * 0.16, Y + 6.65, Y + 7.95, 3.3, 0.14, TABLET);
    box(0, t + dt * 0.22, Y + 6.8, Y + 7.8, 2.8, 0.06, FIELD);
    for (const k of [-1, 0, 1]) box(k * 0.8, t + dt * 0.26, Y + 6.95, Y + 7.65, 0.5, 0.04, CHAR);
  }

  // cornice and the balustrade round the flat top
  S.kind = KIND.MASONRY;
  box(0, TC, Y + HB, Y + HB + 0.35, L + 0.3, D + 0.3, TRIM, { top: shade(TRIM, 0.85), topKind: KIND.ROAD });
  const yb = Y + HB + 0.35;
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) { // a solid low wall, posts along it, a bigger post with a finial at each corner
    box(0, TC + sg * (D / 2 - 0.1), yb, yb + 0.55, L + 0.1, 0.3, BODY_UP, { top: TRIM });
    box(sg * (L / 2 - 0.1), TC, yb, yb + 0.55, 0.3, D - 0.3, BODY_UP, { top: TRIM });
    for (let k = 1; k < 8; k++) box(-L / 2 + (L * k) / 8, TC + sg * (D / 2 - 0.1), yb, yb + 0.8, 0.38, 0.38, TRIM);
    for (let k = 1; k < 7; k++) box(sg * (L / 2 - 0.1), T0 + (D * k) / 7, yb, yb + 0.8, 0.38, 0.38, TRIM);
  }
  for (const ss of [-1, 1]) for (const st of [-1, 1]) {
    const s = ss * (L / 2 - 0.1), t = TC + st * (D / 2 - 0.1), p = P(s, t);
    box(s, t, yb, yb + 1.05, 0.6, 0.6, TRIM);
    S.cyl(p[0], p[1], yb + 1.05, yb + 1.45, 0.22, 0.08, 6, TRIM);
  }

  // ---- the tower, lower storey --------------------------------------------------------------------------------------
  const y1 = yb;
  S.kind = KIND.MASONRY;
  box(0, TC, y1, y1 + 0.2, UP1.w + 0.5, UP1.d + 0.5, TRIM, { topKind: KIND.ROAD });
  const y1f = y1 + 0.2;
  box(0, TC, y1f, y1f + UP1.h, UP1.w, UP1.d, BODY_UP, { top: TILE });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    for (const [s, w, h] of [[0, 1.9, 2.5], [-2.8, 1.3, 1.8], [2.8, 1.3, 1.8]]) archPanel(S, s, TC + (dt * UP1.d) / 2, dt, true, y1f, w, h);
    for (const s of [-UP1.w / 2 + 0.2, UP1.w / 2 - 0.2]) box(s, TC + dt * (UP1.d / 2 + 0.04), y1f, y1f + UP1.h, 0.4, 0.1, TRIM);
  }
  for (const sg of [-1, 1]) archPanel(S, (sg * UP1.w) / 2, TC, sg, false, y1f, 1.3, 1.8);
  box(0, TC, y1f + UP1.h - 0.35, y1f + UP1.h, UP1.w + 0.12, UP1.d + 0.12, TRIM); // frieze under the eave
  const yr1 = y1f + UP1.h;
  S.kind = KIND.TILE;
  const c = P(0, TC);
  S.hip(c[0], c[1], UP1.w, UP1.d, A, yr1, 1.0, TILE, { flare: 0.35, over: 0.85, fascia: 0.25, fasciaCol: FASCIA, hips: true, segs: 2 });

  // ---- the band and the upper storey, under its own tiled roof with the ridge beasts --------------------------------
  S.kind = KIND.MASONRY;
  box(0, TC, yr1 + 0.1, yr1 + 1.15, UP2.w + 1.0, UP2.d + 0.8, BAND, { top: TRIM });
  for (const ss of [-1, 1]) for (const st of [-1, 1]) { // corner posts with finials on the band
    const s = ss * (UP2.w / 2 + 0.5), t = TC + st * (UP2.d / 2 + 0.4), p = P(s, t);
    box(s, t, yr1 + 0.1, yr1 + 1.35, 0.32, 0.32, TRIM);
    S.cyl(p[0], p[1], yr1 + 1.35, yr1 + 1.6, 0.13, 0.05, 5, TRIM);
  }
  const y2 = yr1 + 1.15;
  box(0, TC, y2, y2 + UP2.h, UP2.w, UP2.d, BODY_UP, { top: TILE });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) archPanel(S, 0, TC + (dt * UP2.d) / 2, dt, true, y2 + 0.1, 1.25, 1.55);
  for (const sg of [-1, 1]) archPanel(S, (sg * UP2.w) / 2, TC, sg, false, y2 + 0.2, 0.8, 1.2);
  box(0, TC, y2 + UP2.h - 0.28, y2 + UP2.h, UP2.w + 0.1, UP2.d + 0.1, TRIM);
  const yr2 = y2 + UP2.h, rh2 = 1.05;
  S.kind = KIND.TILE;
  S.hip(c[0], c[1], UP2.w, UP2.d, A, yr2, rh2, TILE, { flare: 0.4, over: 0.75, fascia: 0.22, fasciaCol: FASCIA, ridgeCol: CREST, hips: true, segs: 2 });
  // on the short ridge: a beast at each end and a gourd between
  const rl = Math.max(0.3, (UP2.w + 1.5) / 2 - ((UP2.d + 1.5) / 2) * 0.92);
  const yt = yr2 + rh2;
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    S.beam(V(sg * rl, TC, yt), V(sg * (rl + 0.1), TC, yt + 0.55), 0.18, 0.22, CREST);
    S.beam(V(sg * (rl + 0.1), TC, yt + 0.55), V(sg * (rl - 0.25), TC, yt + 0.7), 0.14, 0.18, CREST);
  }
  S.cyl(c[0], c[1], yt, yt + 0.3, 0.16, 0.2, 6, CREST);
  S.cyl(c[0], c[1], yt + 0.3, yt + 0.62, 0.2, 0.06, 6, CREST);

  (S.paved = S.paved || []).push([n0, S.n]); // the gate's top and the ground under it keep trees and houses off
  S.kind = keep;
}

// An arched passage through the block from t0 to t1: the mass over the crown, the spandrels on both faces, a vault and
// reveals of bare brick, the road floor, and a stucco surround on each mouth.
function archPassage(S, o, y0, y1, t0, t1) {
  const r = o.w / 2, fl = y0, crown = y0 + o.h, spring = crown - r, K = 8, depth = t1 - t0, tc = (t0 + t1) / 2;
  const box = (s, t, a, b, ss, st, col, opts) => { const p = P(s, t); S.box(p[0], p[1], a, b, ss, st, A, col, opts); };
  S.kind = KIND.MASONRY;
  box(o.s, tc, crown, y1, o.w + 0.02, depth, BODY, { top: BODY });
  const arc = (k) => { const th = Math.PI - (Math.PI * k) / K; return [o.s + r * Math.cos(th), spring + r * Math.sin(th)]; };
  for (const [t, dt] of [[t0, -1], [t1, 1]]) {
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
      S.quad(V(sa, t, ya), V(sb, t, yb), V(sb, t, crown), V(sa, t, crown), BODY, N(0, dt));
    }
  }
  S.kind = KIND.PLAIN;
  for (let k = 0; k < K; k++) {
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    S.quad(V(sa, t0 + 0.01, ya), V(sb, t0 + 0.01, yb), V(sb, t1 - 0.01, yb), V(sa, t1 - 0.01, ya), shade(ARCHIN, 0.55), N(o.s - (sa + sb) / 2, 0, spring - (ya + yb) / 2));
  }
  for (const sg of [-1, 1]) {
    const s = o.s + sg * (r - 0.02);
    S.quad(V(s, t0 + 0.01, fl), V(s, t1 - 0.01, fl), V(s, t1 - 0.01, spring), V(s, t0 + 0.01, spring), ARCHIN, N(-sg, 0));
    S.quad(V(s, t0 + 0.01, fl), V(s, t1 - 0.01, fl), V(s, t1 - 0.01, fl + 0.6), V(s, t0 + 0.01, fl + 0.6), DAMP, N(-sg, 0, 0.01));
  }
  S.kind = KIND.ROAD;
  S.quad(V(o.s - r, t0 - 0.3, fl + 0.02), V(o.s + r, t0 - 0.3, fl + 0.02), V(o.s + r, t1 + 0.3, fl + 0.02), V(o.s - r, t1 + 0.3, fl + 0.02), hex('#55534f'), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  for (const [t, dt] of [[t0, -1], [t1, 1]]) {
    const tt = t + dt * 0.07;
    for (const sg of [-1, 1]) {
      const pa = P(o.s + sg * (r + 0.2), tt);
      S.box(pa[0], pa[1], fl, spring, 0.4, 0.14, A, TRIM);
    }
    for (let k = 0; k < K; k++) {
      const th0 = Math.PI - (Math.PI * k) / K, th1 = Math.PI - (Math.PI * (k + 1)) / K, R2 = r + 0.2;
      S.beam(V(o.s + R2 * Math.cos(th0), tt, spring + R2 * Math.sin(th0)), V(o.s + R2 * Math.cos(th1), tt, spring + R2 * Math.sin(th1)), 0.14, 0.4, TRIM);
    }
  }
}

// A dark arched opening drawn flat on a face, inside a light frame. along: the face is at constant t (the opening is
// centred at s); otherwise at constant s.
function archPanel(S, s, t, sg, along, y0, w, h) {
  const r = w / 2, spring = y0 + h - r, K = 7;
  const at = (u, y, d) => (along ? V(s + u, t + sg * d, y) : V(s + sg * d, t + u, y));
  const n = along ? N(0, sg) : N(sg, 0);
  for (const [rr, d, col] of [[r + 0.16, 0.03, TRIM], [r, 0.05, DARK]]) {
    S.quad(at(-rr, y0, d), at(rr, y0, d), at(rr, spring, d), at(-rr, spring, d), col, n);
    for (let k = 0; k < K; k++) {
      const a0 = Math.PI - (Math.PI * k) / K, a1 = Math.PI - (Math.PI * (k + 1)) / K;
      S.tri(at(0, spring, d), at(rr * Math.cos(a0), spring + rr * Math.sin(a0), d), at(rr * Math.cos(a1), spring + rr * Math.sin(a1), d), col, n);
    }
  }
}
