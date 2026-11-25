import { KIND, hex, shade, mix } from '../../geo/buf.ts';
import { rectRing } from '../../geo/gates.ts';
import { LAND_Y, PAL } from '../../config.ts';

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
// ornaments. The text source gives each gate "3 tầng, cao chừng 16m" (nghiencuulichsu); the car Street View panos
// measure this one lower, and the model follows them: block 6.9 m, ridge about 14 m above the ground (see the notes).
// The outer face is two-stepped (a wider arch in a shallow recess before the passage); the inner face has the
// lime-rendered band and raised panel above the moulding, and a projecting pier with a stepped stone cap on its
// south-east side.
//
// Plan: the OSM outline (way 367959068) is 19.7 m along the wall; through the wall the block is drawn from just
// inside the rampart's inner notch (t -7.35) to 0.4 m beyond its outer face in data.wall (t +9.4), so the passage
// runs the whole thickness and the slot kinhthanh.js cuts is closed at both ends. Local frame: s along the wall, t
// through it, + out towards the moat (west-south-west).
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
const P = (s, t): [number, number] => [G0[0] + s * ux - t * uz, G0[1] + s * uz + t * ux];
const V = (s, t, y?) => { const p = P(s, t); return [p[0], y, p[1]]; };
const N = (ds, dt, dy = 0): [number, number, number] => [ds * ux - dt * uz, dy, ds * uz + dt * ux];

const L = 19.8; // block length along the wall (OSM 19.7)
// Through the wall: from 0.25 m inside the notch the rampart band leaves for the gate on the city side (t -7.1, the
// OSM outline's inner face) to 0.4 m beyond the band's outer face (t +9.0; the real face is at +7.1, see above).
const T0 = -7.35, T1 = 9.4;
const TC = (T0 + T1) / 2, D = T1 - T0;
const HB = 6.9; // block to the cornice (car Street View from Tôn Thất Thiệp: the inner face's top ~1.4 × the arch crown)
const ARCH = { w: 3.8, h: 4.8 }; // the passage (Street View from the bridge, scaled by the riders in it)
const RING = 0.6; // the passage's brick ring, radially
// The outer face is two-stepped (bridge pano): a wider, higher arch in a shallow recess, and the passage behind it.
// The recess can only be as deep as the block stands proud of the rampart band (0.4 m) without opening onto it.
const OUT = { w: 4.8, h: 5.1, d: 0.4, ring: 0.5 };
const T1R = T1 - OUT.d;
const MO = ARCH.h + RING; // the inner face's moulding foot
const MOO = OUT.h + OUT.ring; // the outer face's moulding foot
// The tower as the car panos and the satellite measure it (see the notes): smaller than scaling the Commons photo by
// the block's length gave (9.0 m wide, 16 m high).
const LOW = { w: 7.0, d: 5.6, h: 3.0 }; // tower, lower storey

const UP = { w: 3.6, d: 2.8, h: 2.0 }; // tower, upper storey
// The tower's centre in the block frame: over the passage's axis in s, about the OSM outline's centre in t (the car
// panos from Tôn Thất Thiệp and Yết Kiêu put it there; see the notes for the satellite's roof offset).
const TS = 0.3, TT = -0.2;

const BRICK = hex('#76625b'); // bare, weathered red-brown brick (mid tone, as it reads in shade on the Street View)
const BRICK2 = hex('#7f665c'); // the arch rings and frame, a shade brighter
const BRICK_D = hex('#5e4a40'); // damp and soot streaks
const RELAID = hex('#8f6f5f'); // relaid patches
const STONE = hex('#9c988a'); // grey rendered mouldings and balustrade
const RENDER = hex('#a19e8b'); // lime render, weathered grey-ochre
const TOPC = hex('#6b6a5e'); // the flat top, dark and weathered from above
const MOSS = hex('#7e7c68');
const DARK = hex('#211c19');
const TILE = hex('#b0603d'); // terracotta tiles
const TILE_D = hex('#7d4a33');

export function build({ S }) {
  const Y = LAND_Y, keep = S.kind, n0 = S.n;
  const box = (s, t, y0, y1, ss, st, col, opts?) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, opts); };
  const bx = (s0, s1, t0, t1, y0, y1, col, opts?) => box((s0 + s1) / 2, (t0 + t1) / 2, y0, y1, s1 - s0, t1 - t0, col, opts);
  const ring = (s, t, w, d?) => { const p = P(s, t); return rectRing(p[0], p[1], w, d, A); };
  const K = 24; // segments of a half arch
  const ang = (k) => Math.PI - (Math.PI * k) / K;

  // ---- the block: the passage, and on the outer face the wider recessed arch in front of it --------------------
  const r = ARCH.w / 2, crown = Y + ARCH.h, spring = crown - r;
  const ro = OUT.w / 2, crownO = Y + OUT.h, springO = crownO - ro;
  S.kind = KIND.MASONRY;
  for (const sg of [-1, 1]) {
    const a = sg * ro, b = (sg * L) / 2;
    bx(Math.min(a, b), Math.max(a, b), T0, T1, Y - 0.5, Y + HB, BRICK, { top: TOPC });
    const c = sg * r;
    bx(Math.min(a, c), Math.max(a, c), T0, T1R, Y - 0.5, crownO, BRICK); // the passage's cheeks behind the recess
  }
  bx(-ro, ro, T0, T1, crownO, Y + HB, BRICK, { top: TOPC });
  bx(-r, r, T0, T1R, crown, crownO, BRICK);
  // spandrels between each arch and the course above it: the passage at the inner face and at the recess's back,
  // the recess arch at the outer face
  const spandrel = (t, dt, rr, sy, top) => {
    for (let k = 0; k < K; k++) {
      const a0 = ang(k), a1 = ang(k + 1);
      S.quad(V(rr * Math.cos(a0), t, sy + rr * Math.sin(a0)), V(rr * Math.cos(a1), t, sy + rr * Math.sin(a1)), V(rr * Math.cos(a1), t, top), V(rr * Math.cos(a0), t, top), BRICK, N(0, dt));
    }
  };
  spandrel(T0, -1, r, spring, crown);
  spandrel(T1R, 1, r, spring, crown);
  spandrel(T1, 1, ro, springO, crownO);
  // vaults and jambs, dark inside
  S.kind = KIND.PLAIN;
  const vault = (t0, t1, rr, sy, col) => {
    for (let k = 0; k < K; k++) {
      const a0 = ang(k), a1 = ang(k + 1), sa = rr * Math.cos(a0), sb = rr * Math.cos(a1), ya = sy + rr * Math.sin(a0), yb = sy + rr * Math.sin(a1);
      S.quad(V(sa, t0, ya), V(sb, t0, yb), V(sb, t1, yb), V(sa, t1, ya), col, N(-(sa + sb) / 2, 0, sy - (ya + yb) / 2));
    }
    for (const sg of [-1, 1]) {
      const s = sg * rr;
      S.quad(V(s, t0, Y), V(s, t1, Y), V(s, t1, sy), V(s, t0, sy), shade(col, 0.9), N(-sg, 0));
    }
  };
  vault(T0 + 0.01, T1R + 0.01, r, spring, shade(BRICK, 0.4));
  S.kind = KIND.MASONRY;
  vault(T1R, T1 - 0.01, ro, springO, shade(BRICK2, 0.85));
  S.kind = KIND.PLAIN;
  S.kind = KIND.ROAD;
  S.quad(V(-r, T0 - 0.3, Y + 0.02), V(r, T0 - 0.3, Y + 0.02), V(r, T1 + 0.3, Y + 0.02), V(-r, T1 + 0.3, Y + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.quad(V(-ro, T1R, Y + 0.025), V(-r, T1R, Y + 0.025), V(-r, T1 + 0.3, Y + 0.025), V(-ro, T1 + 0.3, Y + 0.025), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.quad(V(r, T1R, Y + 0.025), V(ro, T1R, Y + 0.025), V(ro, T1 + 0.3, Y + 0.025), V(r, T1 + 0.3, Y + 0.025), shade(PAL.stone, 0.62), [0, 1, 0]);

  // ---- the arch rings: smooth brick annuli flush on the face, running down into the jambs, two courses each ------
  S.kind = KIND.MASONRY;
  const annulus = (t, dt, r0, r1, sy, col) => {
    const tt = t + dt * 0.03;
    for (let k = 0; k < K; k++) {
      const a0 = ang(k), a1 = ang(k + 1), c0 = Math.cos(a0), c1 = Math.cos(a1), s0 = Math.sin(a0), s1 = Math.sin(a1);
      S.quad(V(r0 * c0, tt, sy + r0 * s0), V(r1 * c0, tt, sy + r1 * s0), V(r1 * c1, tt, sy + r1 * s1), V(r0 * c1, tt, sy + r0 * s1), col, N(0, dt));
    }
    for (const sg of [-1, 1]) S.quad(V(sg * r0, tt, Y - 0.2), V(sg * r1, tt, Y - 0.2), V(sg * r1, tt, sy), V(sg * r0, tt, sy), col, N(0, dt));
  };
  const rings = (t, dt, rr, w, sy) => {
    annulus(t, dt, rr, rr + w * 0.55, sy, BRICK2);
    annulus(t, dt, rr + w * 0.55, rr + w, sy, shade(BRICK2, 0.9));
    S.kind = KIND.PLAIN; // a thin shadowed lip at the intrados
    annulus(t, dt, rr, rr + 0.07, sy, shade(BRICK2, 0.7));
    S.kind = KIND.MASONRY;
  };
  rings(T0, -1, r, RING, spring);
  rings(T1R, 1, r, 0.35, spring);
  rings(T1, 1, ro, OUT.ring, springO);

  // ---- outer face: pilasters, the frame, the moulding on the ring, the name tablet ------------------------------
  const fo = ro + OUT.ring + 0.4; // the frame's inner edge
  for (const sg of [-1, 1]) {
    box(sg * (L / 2 - 1.0), T1 + 0.12, Y - 0.3, Y + HB - 0.5, 2.0, 0.24, BRICK);
    box(sg * (L / 2 - 1.0), T1 + 0.2, Y + HB - 0.6, Y + HB, 2.25, 0.4, STONE);
    box(sg * (fo + 0.35), T1 + 0.05, Y - 0.2, Y + MOO, 0.7, 0.1, BRICK2);
  }
  box(0, T1 + 0.12, Y + MOO, Y + MOO + 0.28, 2 * fo + 1.0, 0.24, STONE);
  const yt0 = Y + MOO + 0.36, yt1 = Y + HB - 0.08; // the tablet, between the moulding and the cornice
  box(0, T1 + 0.1, yt0, yt1, 2.75, 0.2, hex('#8f8b7f'));
  box(0, T1 + 0.2, yt0 + 0.1, yt1 - 0.1, 2.45, 0.06, hex('#a8a496'));
  for (const k of [-1, 0, 1]) box(k * 0.72, T1 + 0.24, yt0 + 0.2, yt1 - 0.2, 0.56, 0.04, hex('#3a3430'));
  // weathering on the bare brick: a damp foot, soot and lichen streaks from the cornice down, relaid patches
  const patch = (t, dt, s0, s1, y0, y1, col) => S.quad(V(s0, t + dt * 0.02, y0), V(s1, t + dt * 0.02, y0), V(s1, t + dt * 0.02, y1), V(s0, t + dt * 0.02, y1), col, N(0, dt));
  for (const sg of [-1, 1]) patch(T1, 1, sg * (fo + 0.7), (sg * L) / 2, Y + 0.4, Y + 1.0 + 0.2 * sg, mix(BRICK, BRICK_D, 0.7));
  for (const [s0, s1, y0, col] of ([[-8.6, -7.6, 3.4, BRICK_D], [-6.4, -5.3, 4.8, mix(BRICK_D, MOSS, 0.4)], [-4.9, -4.2, 2.2, RELAID], [4.3, 5.4, 4.2, BRICK_D], [5.9, 6.9, 1.8, RELAID], [7.4, 8.1, 3.0, mix(BRICK_D, MOSS, 0.5)]] as any[])) {
    if (col === RELAID) patch(T1, 1, s0, s1, Y + y0, Y + y0 + 1.6, col);
    else patch(T1, 1, s0, s1, Y + y0, Y + HB - 0.05, col);
  }

  // ---- inner face: the passage ring, a frame on its north-west side, the moulding, a lime-rendered band across the
  // whole face above with a long raised panel, and the massive capped brick pier south-east of the passage --------
  for (const sg of [-1, 1]) {
    box(sg * (L / 2 - 1.0), T0 - 0.12, Y - 0.3, Y + HB - 0.5, 2.0, 0.24, BRICK);
    box(sg * (L / 2 - 1.0), T0 - 0.2, Y + HB - 0.6, Y + HB, 2.25, 0.4, STONE);
  }
  box(-2.95, T0 - 0.05, Y - 0.2, Y + MO, 0.7, 0.1, BRICK2);
  S.kind = KIND.PLAIN;
  box(0, T0 - 0.04, Y + MO + 0.2, Y + HB, L - 0.05, 0.08, RENDER);
  box(0, T0 - 0.12, Y + MO, Y + MO + 0.28, 7.2, 0.24, STONE);
  box(0, T0 - 0.14, Y + MO + 0.62, Y + MO + 1.3, 8.4, 0.2, STONE); // the long raised panel
  box(0, T0 - 0.26, Y + MO + 0.74, Y + MO + 1.18, 7.8, 0.06, shade(RENDER, 0.9));
  S.kind = KIND.MASONRY;
  { // the pier: brick shaft, then a stepped grey stone cap
    const s0 = 2.75, s1 = 4.55, tf = T0 - 1.1;
    bx(s0, s1, tf, T0, Y - 0.3, Y + 4.3, BRICK);
    bx(s0 - 0.15, s1 + 0.15, tf - 0.15, T0, Y + 4.3, Y + 4.55, STONE);
    bx(s0 - 0.05, s1 + 0.05, tf - 0.05, T0, Y + 4.55, Y + 5.0, shade(STONE, 0.92));
    bx(s0 + 0.1, s1 - 0.1, tf + 0.1, T0, Y + 5.0, Y + 5.2, STONE);
    bx(s0 + 0.35, s1 - 0.35, tf + 0.35, T0 - 0.25, Y + 5.2, Y + 5.75, shade(STONE, 0.95), { top: shade(STONE, 1.05) });
    bx(s0, s1, tf - 0.01, T0, Y - 0.3, Y + 0.45, shade(STONE, 0.85)); // its footing
  }

  // a low grey stone footing course under each face, as in the bridge Street View
  S.kind = KIND.MASONRY;
  for (const [t, dt, inner] of ([[T0, -1, r], [T1, 1, ro]] as any[])) {
    for (const sg of [-1, 1]) {
      const a = sg * inner, b = (sg * L) / 2;
      box((a + b) / 2, t + dt * 0.06, Y - 0.3, Y + 0.45, Math.abs(b - a) + 0.1, 0.14, shade(STONE, 0.85));
    }
  }

  // ---- cornice and the balustrade round the flat top ----------------------------------------------------------
  S.kind = KIND.MASONRY;
  box(0, TC, Y + HB, Y + HB + 0.35, L + 0.35, D + 0.35, STONE, { top: TOPC, topKind: KIND.ROAD });
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
  box(TS, TT, y1, y1 + 0.25, LOW.w + 0.4, LOW.d + 0.4, MOSS, { top: shade(PAL.stone, 0.85), topKind: KIND.ROAD }); // plinth
  const yf = y1 + 0.25, ye = yf + LOW.h;
  box(TS, TT, yf, ye, LOW.w, LOW.d, RENDER, { top: STONE });
  box(TS, TT, yf, yf + 0.7, LOW.w + 0.02, LOW.d + 0.02, MOSS); // damp, darkened foot
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) for (const [s, w, h] of ([[0, 1.6, 2.4], [-2.3, 1.05, 1.8], [2.3, 1.05, 1.8]] as any[])) opening(S, TS + s, TT + (dt * LOW.d) / 2, dt, true, yf, w, h);
  for (const sg of [-1, 1]) opening(S, TS + (sg * LOW.w) / 2, TT, sg, false, yf, 1.05, 1.75);
  // the cornice and the skirt of tiles with up-turned corners
  S.kind = KIND.MASONRY;
  box(TS, TT, ye - 0.05, ye + 0.22, LOW.w + 0.35, LOW.d + 0.35, STONE);
  const ys = ye + 0.22;
  S.kind = KIND.TILE;
  S.prism(ring(TS, TT, LOW.w + 1.5, LOW.d + 1.5), ys - 0.12, ys + 0.42, TILE, TILE, { scaleTop: 0.86, top: false });
  S.kind = KIND.PLAIN;
  box(TS, TT, ys - 0.3, ys - 0.12, LOW.w + 1.5, LOW.d + 1.5, TILE_D); // the eave board under the tile edge
  for (const a of [-1, 1]) for (const b of [-1, 1]) { // corner horns
    const s = TS + a * (LOW.w / 2 + 0.75), t = TT + b * (LOW.d / 2 + 0.75), p0 = V(s, t, ys - 0.05), p1 = V(s + a * 0.3, t + b * 0.3, ys + 0.45);
    S.beam(p0, p1, 0.22, 0.22, TILE_D);
  }
  // the terrace on it, and its balustrade
  S.kind = KIND.MASONRY;
  box(TS, TT, ys, ys + 0.42, LOW.w - 0.05, LOW.d - 0.05, STONE, { top: shade(PAL.stone, 0.85), topKind: KIND.ROAD });
  const yt = ys + 0.42;
  S.kind = KIND.PLAIN;
  const bo = ring(TS, TT, LOW.w - 0.2, LOW.d - 0.2), bi = ring(TS, TT, LOW.w - 0.5, LOW.d - 0.5);
  S.prism(bo, yt, yt + 0.5, shade(STONE, 0.95), shade(STONE, 1.05), { holes: [bi.slice().reverse()] });
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(TS + a * (LOW.w / 2 - 0.25), TT + b * (LOW.d / 2 - 0.25), yt, yt + 0.8, 0.36, 0.36, STONE);
  for (const sg of [-1, 1]) for (const s of [-1.2, 1.2]) box(TS + s, TT + sg * (LOW.d / 2 - 0.25), yt, yt + 0.7, 0.3, 0.3, STONE);

  // ---- the upper storey and its roof ---------------------------------------------------------------------------
  S.kind = KIND.MASONRY;
  const yu = yt + UP.h;
  box(TS, TT, yt, yu, UP.w, UP.d, RENDER, { top: STONE });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) opening(S, TS, TT + (dt * UP.d) / 2, dt, true, yt + 0.15, 1.1, 1.45);
  for (const sg of [-1, 1]) opening(S, TS + (sg * UP.w) / 2, TT, sg, false, yt + 0.25, 0.7, 1.0);
  S.kind = KIND.MASONRY;
  box(TS, TT, yu - 0.05, yu + 0.2, UP.w + 0.3, UP.d + 0.3, STONE);
  const pc = P(TS, TT), rh = 0.75;
  S.hip(pc[0], pc[1], UP.w, UP.d, A, yu + 0.2, rh, TILE, { flare: 0.3, over: 0.55, fascia: 0.18, fasciaCol: TILE_D, ridgeCol: hex('#c99060'), hips: true, segs: 2 });
  // ridge ornaments: curled ends on the ridge and the four hips, a small finial and the lightning rod
  S.kind = KIND.PLAIN;
  const yr = yu + 0.2 + rh, rl = Math.max(0, (UP.w + 1.1) / 2 - ((UP.d + 1.1) / 2) * 0.92), ORN = hex('#d8d2c0');
  for (const sg of [-1, 1]) box(TS + sg * rl, TT, yr, yr + 0.45, 0.3, 0.25, ORN);
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(TS + a * (UP.w / 2 + 0.45), TT + b * (UP.d / 2 + 0.45), yu + 0.3, yu + 0.62, 0.22, 0.22, ORN);
  box(TS, TT, yr, yr + 0.35, 0.35, 0.3, ORN);
  box(TS, TT, yr + 0.35, yr + 1.6, 0.05, 0.05, hex('#4a4a48'));

  S.kind = keep;
  S.base = 0;
}

// An arched opening drawn on a face: a brick ring round a dark recess (a rectangle up to the spring and a half-disc
// above). along: the face is at constant t (the opening is centred at s); otherwise at constant s.
function opening(S, s, t, sg, along, y0, w, h) {
  const r = w / 2, spring = y0 + h - r, K = 7;
  const at = (u, y, d) => (along ? V(s + u, t + sg * d, y) : V(s + sg * d, t + u, y));
  const n = along ? N(0, sg) : N(sg, 0);
  for (const [rr, d, col] of ([[r + 0.22, 0.03, BRICK2], [r, 0.05, DARK]] as any[])) {
    S.quad(at(-rr, y0, d), at(rr, y0, d), at(rr, spring, d), at(-rr, spring, d), col, n);
    for (let k = 0; k < K; k++) {
      const a0 = Math.PI - (Math.PI * k) / K, a1 = Math.PI - (Math.PI * (k + 1)) / K;
      S.tri(at(0, spring, d), at(rr * Math.cos(a0), spring + rr * Math.sin(a0), d), at(rr * Math.cos(a1), spring + rr * Math.sin(a1), d), col, n);
    }
  }
}
