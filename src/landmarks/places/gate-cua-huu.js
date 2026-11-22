import { KIND, hex, shade } from '../../geo/buf.js';
import { rectRing } from '../../geo/gates.js';
import { LAND_Y, PAL } from '../../config.js';

// Cửa Hữu (右門), the Tây Nam (south-west) gate of the Huế Citadel (Kinh thành). Notes and sources:
// docs/places/gate-cua-huu.md.
//
// The gate's arch was built in 1809 with the other Kinh thành gates; its watch tower (vọng lâu) in 1829. It stands on
// the citadel's west front near the south-west corner, on the axis of Yết Kiêu street, and cầu Cửa Hữu crosses the moat
// in front of it (drawn by city.js as a generic road bridge, with its parapets). As it stands (photo, Commons
// "Cửa Hữu.jpg", 2018): a bare red-brick block a little higher than the rampart, its ends stepped out as pilasters with
// cap blocks, one round-headed passage with a deep brick arch ring inside a framed panel, a stone moulding sitting on the ring
// and above it the grey stone name tablet (西南門); a cornice and a grey rendered balustrade with posts round its flat
// top. On it a masonry tower of two storeys, lime-rendered and weathered grey-ochre: the lower one with three arched
// openings on the long faces (the middle one larger) under a short skirt of terracotta tiles with up-turned corners,
// a balustraded terrace, and the small upper storey with one arched opening under a low tiled hip roof with ridge
// ornaments. About 16 m to the roof (nghiencuulichsu: each gate "3 tầng, cao chừng 16m").
//
// Plan: the OSM outline (way 367959068) is 19.7 m along the wall; through the wall the block is drawn from the
// rampart's inner face to its outer face (16.0 m in data.wall here) and 0.5 m proud of each, so the passage runs the
// whole thickness and the slot kinhthanh.js cuts is closed at both ends. Local frame: s along the wall, t through it,
// + out towards the moat (west-south-west).
export const id = 'gate:Cửa Hữu';

const A = Math.atan2(0.80662, 0.59107); // direction of s (along the rampart); t = (-sin A, cos A) points out of the city
const ux = Math.cos(A), uz = Math.sin(A);
// The gate's centre: the OSM outline's (data.gates, x -2235.1 z 293.3) moved 0.8 m along the wall to the north-west.
// On Google's satellite the moat bridge and Yết Kiêu meet the face about 1.8 m north-west of the outline's centre,
// and the car Street View panos on the bridge and in Yết Kiêu put the passage 1-2 m that way too; the model's own
// road runs about 1 m north-west of the outline's centre. 0.8 m is as far as the move can go with the 3.8 m passage
// still inside the 5.6 m slot city.js cuts at the outline's centre. The outline's outer face (t +7.1) matches the
// satellite; the block runs on to t +9.4 only because the rampart in data.wall stands 1.8 m proud of the real one.
const SHIFT = -0.8;
const G0 = [-2235.1 + SHIFT * ux, 293.3 + SHIFT * uz];
const P = (s, t) => [G0[0] + s * ux - t * uz, G0[1] + s * uz + t * ux];
const V = (s, t, y) => { const p = P(s, t); return [p[0], y, p[1]]; };
const N = (ds, dt, dy = 0) => [ds * ux - dt * uz, dy, ds * uz + dt * ux];

const L = 19.8; // block length along the wall (OSM 19.7)
const T0 = -7.6, T1 = 9.4; // block from 0.5 m inside the rampart's inner face to 0.5 m beyond its outer face
const TC = (T0 + T1) / 2, D = T1 - T0;
const HB = 8.3; // block to the cornice (photo: ~1.7 m over the 6.6 m rampart)
const ARCH = { w: 3.8, h: 4.8 }; // the passage (Street View from the bridge, scaled by the riders in it)
const RING = 0.75; // the arch ring's depth (Street View: a deep brick ring with the moulding right on it)
const MO = ARCH.h + RING; // the moulding's foot
const LOW = { w: 9.0, d: 6.6, h: 3.4 }; // tower, lower storey (photo; depth estimated)
const UP = { w: 4.6, d: 3.4, h: 2.2 }; // tower, upper storey (photo; depth estimated)

const BRICK = hex('#7d5a4d'); // bare, weathered red brick
const BRICK2 = hex('#8a5f4e'); // the arch ring and frame, a shade brighter
const STONE = hex('#9c988a'); // grey rendered mouldings and balustrade
const RENDER = hex('#a19e8b'); // the tower's lime render, weathered grey-ochre
const MOSS = hex('#7e7c68');
const DARK = hex('#211c19');
const TILE = hex('#b0603d'); // terracotta tiles
const TILE_D = hex('#7d4a33');

export function build({ S }) {
  const Y = LAND_Y, keep = S.kind, n0 = S.n;
  const box = (s, t, y0, y1, ss, st, col, opts) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, opts); };
  const ring = (s, t, w, d) => { const p = P(s, t); return rectRing(p[0], p[1], w, d, A); };

  // ---- the block, with its passage --------------------------------------------------------------------------
  S.kind = KIND.MASONRY;
  const r = ARCH.w / 2, crown = Y + ARCH.h, spring = crown - r;
  for (const sg of [-1, 1]) box(sg * (L / 2 + r) / 2, TC, Y - 0.5, Y + HB, L / 2 - r, D, BRICK, { top: STONE });
  box(0, TC, crown, Y + HB, ARCH.w + 0.02, D, BRICK, { top: STONE });
  const K = 9;
  const arc = (k, rr = r) => { const th = Math.PI - (Math.PI * k) / K; return [rr * Math.cos(th), spring + rr * Math.sin(th)]; };
  for (const t of [T0, T1]) { // spandrels between the arch and the crown course
    const dt = Math.sign(t);
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
      S.quad(V(sa, t, ya), V(sb, t, yb), V(sb, t, crown), V(sa, t, crown), BRICK, N(0, dt));
    }
  }
  S.kind = KIND.PLAIN;
  for (let k = 0; k < K; k++) { // the vault, dark inside
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    S.quad(V(sa, T0 + 0.01, ya), V(sb, T0 + 0.01, yb), V(sb, T1 - 0.01, yb), V(sa, T1 - 0.01, ya), shade(BRICK, 0.4), N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
  }
  for (const sg of [-1, 1]) {
    const s = sg * (r - 0.01);
    S.quad(V(s, T0 + 0.6, Y), V(s, T1 - 0.6, Y), V(s, T1 - 0.6, spring), V(s, T0 + 0.6, spring), shade(BRICK, 0.35), N(-sg, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(V(-r, T0 - 0.3, Y + 0.02), V(r, T0 - 0.3, Y + 0.02), V(r, T1 + 0.3, Y + 0.02), V(-r, T1 + 0.3, Y + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);

  // ---- the faces: corner pilasters, the framed arch, the moulding, the name tablet --------------------------
  S.kind = KIND.MASONRY;
  for (const t of [T0, T1]) {
    const dt = Math.sign(t);
    for (const sg of [-1, 1]) { // pilasters at the ends, capped under the cornice
      box(sg * (L / 2 - 1.0), t + dt * 0.12, Y - 0.3, Y + HB - 0.5, 2.0, 0.24, BRICK);
      box(sg * (L / 2 - 1.0), t + dt * 0.2, Y + HB - 0.6, Y + HB, 2.25, 0.4, STONE);
    }
    for (const sg of [-1, 1]) box(sg * 2.95, t + dt * 0.05, Y - 0.2, Y + MO, 0.7, 0.1, BRICK2); // the frame
    box(0, t + dt * 0.12, Y + MO, Y + MO + 0.3, 6.7, 0.24, STONE); // the moulding, sitting on the arch ring
  }
  { // the inner face above the moulding is lime-rendered, with a raised panel (Street View from Yết Kiêu)
    const t = T0 - 0.03;
    box(0, t, Y + MO + 0.3, Y + HB, 7.4, 0.06, RENDER);
    box(0, t - 0.1, Y + MO + 0.9, Y + MO + 1.7, 5.2, 0.16, STONE);
    box(0, t - 0.2, Y + MO + 1.05, Y + MO + 1.55, 4.4, 0.06, shade(RENDER, 0.9));
  }
  S.kind = KIND.PLAIN;
  for (const t of [T0, T1]) { // the arch ring: radial brick voussoirs standing proud
    const dt = Math.sign(t), tt = t + dt * 0.08, R2 = r + RING / 2;
    for (let k = 0; k < K; k++) {
      const th0 = Math.PI - (Math.PI * k) / K, th1 = Math.PI - (Math.PI * (k + 1)) / K;
      S.beam(V(R2 * Math.cos(th0), tt, spring + R2 * Math.sin(th0)), V(R2 * Math.cos(th1), tt, spring + R2 * Math.sin(th1)), 0.16, RING, BRICK2);
    }
    for (const sg of [-1, 1]) box(sg * R2, tt, Y - 0.2, spring, RING, 0.16, BRICK2);
  }
  // the tablet (outer face only): grey stone frame, paler field, the three characters 西南門
  const yt0 = Y + MO + 0.4;
  box(0, T1 + 0.1, yt0, yt0 + 1.15, 2.75, 0.2, hex('#8f8b7f'));
  box(0, T1 + 0.2, yt0 + 0.12, yt0 + 1.03, 2.45, 0.06, hex('#a8a496'));
  for (const k of [-1, 0, 1]) box(k * 0.72, T1 + 0.24, yt0 + 0.25, yt0 + 0.9, 0.56, 0.04, hex('#3a3430'));

  // ---- cornice and the balustrade round the flat top ----------------------------------------------------------
  S.kind = KIND.MASONRY;
  box(0, TC, Y + HB, Y + HB + 0.35, L + 0.35, D + 0.35, STONE, { top: shade(PAL.stone, 0.9), topKind: KIND.ROAD });
  const yb = Y + HB + 0.35;
  S.kind = KIND.PLAIN;
  const outer = ring(0, TC, L + 0.1, D + 0.1), inner = ring(0, TC, L - 0.4, D - 0.4);
  S.prism(outer, yb, yb + 0.25, STONE, STONE, { holes: [inner.slice().reverse()] }); // base course
  const mid = ring(0, TC, L - 0.05, D - 0.05), midIn = ring(0, TC, L - 0.3, D - 0.3);
  S.prism(mid, yb + 0.25, yb + 0.62, shade(STONE, 0.72), shade(STONE, 0.72), { holes: [midIn.slice().reverse()] }); // pierced panels, shadowed
  S.prism(outer, yb + 0.62, yb + 0.8, STONE, shade(STONE, 1.08), { holes: [inner.slice().reverse()] }); // top rail
  const post = (s, t, h = 0.95) => box(s, t, yb + 0.2, yb + h, 0.34, 0.34, STONE);
  for (let k = 1; k < 8; k++) for (const sg of [-1, 1]) post(-L / 2 + 0.12 + ((L - 0.24) * k) / 8, TC + sg * (D / 2 - 0.12));
  for (let k = 1; k < 7; k++) for (const sg of [-1, 1]) post(sg * (L / 2 - 0.12), TC - D / 2 + 0.12 + ((D - 0.24) * k) / 7);
  for (const a of [-1, 1]) for (const b of [-1, 1]) { // corner posts, taller, with a ball
    const s = a * (L / 2 - 0.15), t = TC + b * (D / 2 - 0.15), p = P(s, t);
    box(s, t, yb, yb + 1.25, 0.5, 0.5, STONE);
    S.cyl(p[0], p[1], yb + 1.25, yb + 1.55, 0.2, 0.12, 6, STONE);
  }
  (S.paved = S.paved || []).push([n0, S.n]);

  // ---- the tower, lower storey ---------------------------------------------------------------------------------
  const y1 = yb;
  S.kind = KIND.MASONRY;
  box(0, TC, y1, y1 + 0.25, LOW.w + 0.4, LOW.d + 0.4, MOSS, { top: shade(PAL.stone, 0.85), topKind: KIND.ROAD }); // plinth
  const yf = y1 + 0.25, ye = yf + LOW.h;
  box(0, TC, yf, ye, LOW.w, LOW.d, RENDER, { top: STONE });
  box(0, TC, yf, yf + 0.7, LOW.w + 0.02, LOW.d + 0.02, MOSS); // damp, darkened foot
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) for (const [s, w, h] of [[0, 1.9, 2.75], [-2.9, 1.3, 2.05], [2.9, 1.3, 2.05]]) opening(S, s, TC + (dt * LOW.d) / 2, dt, true, yf, w, h);
  for (const sg of [-1, 1]) opening(S, (sg * LOW.w) / 2, TC, sg, false, yf, 1.2, 1.95);
  // the cornice and the skirt of tiles with up-turned corners
  S.kind = KIND.MASONRY;
  box(0, TC, ye - 0.05, ye + 0.22, LOW.w + 0.35, LOW.d + 0.35, STONE);
  const ys = ye + 0.22;
  S.kind = KIND.TILE;
  S.prism(ring(0, TC, LOW.w + 1.5, LOW.d + 1.5), ys - 0.12, ys + 0.42, TILE, TILE, { scaleTop: 0.86, top: false });
  S.kind = KIND.PLAIN;
  box(0, TC, ys - 0.3, ys - 0.12, LOW.w + 1.5, LOW.d + 1.5, TILE_D); // the eave board under the tile edge
  for (const a of [-1, 1]) for (const b of [-1, 1]) { // corner horns
    const s = a * (LOW.w / 2 + 0.75), t = TC + b * (LOW.d / 2 + 0.75), p0 = V(s, t, ys - 0.05), p1 = V(s + a * 0.3, t + b * 0.3, ys + 0.45);
    S.beam(p0, p1, 0.22, 0.22, TILE_D);
  }
  // the terrace on it, and its balustrade
  S.kind = KIND.MASONRY;
  box(0, TC, ys, ys + 0.42, LOW.w - 0.05, LOW.d - 0.05, STONE, { top: shade(PAL.stone, 0.85), topKind: KIND.ROAD });
  const yt = ys + 0.42;
  S.kind = KIND.PLAIN;
  const bo = ring(0, TC, LOW.w - 0.2, LOW.d - 0.2), bi = ring(0, TC, LOW.w - 0.5, LOW.d - 0.5);
  S.prism(bo, yt, yt + 0.5, shade(STONE, 0.95), shade(STONE, 1.05), { holes: [bi.slice().reverse()] });
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(a * (LOW.w / 2 - 0.25), TC + b * (LOW.d / 2 - 0.25), yt, yt + 0.8, 0.36, 0.36, STONE);
  for (const sg of [-1, 1]) for (const s of [-1.6, 1.6]) box(s, TC + sg * (LOW.d / 2 - 0.25), yt, yt + 0.7, 0.3, 0.3, STONE);

  // ---- the upper storey and its roof ---------------------------------------------------------------------------
  S.kind = KIND.MASONRY;
  const yu = yt + UP.h;
  box(0, TC, yt, yu, UP.w, UP.d, RENDER, { top: STONE });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) opening(S, 0, TC + (dt * UP.d) / 2, dt, true, yt + 0.15, 1.3, 1.65);
  for (const sg of [-1, 1]) opening(S, (sg * UP.w) / 2, TC, sg, false, yt + 0.25, 0.8, 1.2);
  S.kind = KIND.MASONRY;
  box(0, TC, yu - 0.05, yu + 0.2, UP.w + 0.3, UP.d + 0.3, STONE);
  const pc = P(0, TC), rh = 0.75;
  S.hip(pc[0], pc[1], UP.w, UP.d, A, yu + 0.2, rh, TILE, { flare: 0.3, over: 0.55, fascia: 0.18, fasciaCol: TILE_D, ridgeCol: hex('#c99060'), hips: true, segs: 2 });
  // ridge ornaments: curled ends on the ridge and the four hips, a small finial and the lightning rod
  S.kind = KIND.PLAIN;
  const yr = yu + 0.2 + rh, rl = Math.max(0, (UP.w + 1.1) / 2 - ((UP.d + 1.1) / 2) * 0.92), ORN = hex('#d8d2c0');
  for (const sg of [-1, 1]) box(sg * rl, TC, yr, yr + 0.45, 0.3, 0.25, ORN);
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(a * (UP.w / 2 + 0.45), TC + b * (UP.d / 2 + 0.45), yu + 0.3, yu + 0.62, 0.22, 0.22, ORN);
  box(0, TC, yr, yr + 0.35, 0.35, 0.3, ORN);
  box(0, TC, yr + 0.35, yr + 1.6, 0.05, 0.05, hex('#4a4a48'));

  S.kind = keep;
  S.base = 0;
}

// An arched opening drawn on a face: a brick ring round a dark recess (a rectangle up to the spring and a half-disc
// above). along: the face is at constant t (the opening is centred at s); otherwise at constant s.
function opening(S, s, t, sg, along, y0, w, h) {
  const r = w / 2, spring = y0 + h - r, K = 7;
  const at = (u, y, d) => (along ? V(s + u, t + sg * d, y) : V(s + sg * d, t + u, y));
  const n = along ? N(0, sg) : N(sg, 0);
  for (const [rr, d, col] of [[r + 0.22, 0.03, BRICK2], [r, 0.05, DARK]]) {
    S.quad(at(-rr, y0, d), at(rr, y0, d), at(rr, spring, d), at(-rr, spring, d), col, n);
    for (let k = 0; k < K; k++) {
      const a0 = Math.PI - (Math.PI * k) / K, a1 = Math.PI - (Math.PI * (k + 1)) / K;
      S.tri(at(0, spring, d), at(rr * Math.cos(a0), spring + rr * Math.sin(a0), d), at(rr * Math.cos(a1), spring + rr * Math.sin(a1), d), col, n);
    }
  }
}
