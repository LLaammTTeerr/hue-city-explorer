import { KIND, hex, shade, mix, unflat, hipShape } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';

// Cửa Nhà Đồ, officially Chánh Nam môn (正南門), a south gate of the Kinh thành (Huế Citadel), west of Kỳ Đài.
// Notes and sources: docs/places/gate-cua-nha-do.md.
//
// The arched passage dates from 1809 (Gia Long), the watch tower (vọng lâu) on top from Minh Mạng's reign (1829).
// Arch and tower fell in the 1953 flood and were rebuilt later. The popular name comes from the Gia Long-era
// arsenal and workshop (Võ khố, Đồ gia) that stood by it. Today Nguyễn Trãi street runs one way through the single
// passage, out over the moat on Cầu Nhà Đồ (drawn as the shared citadel bridge, geo/citadel-bridge.js).
//
// Form, as the gate stands today (street-level photographs from the causeway, docs/places/gate-cua-nha-do.md):
// a bare red-brown brick block the full thickness of the rampart, rising about 1.4 m over the wall top, with
// shallow pilasters at its corners and a raised brick frame round one round-arched passage (brick voussoirs, no
// plaster surround). Over the frame a grey lime cornice, the name panel above it, a grey cornice round the top of
// the block and a low plastered parapet with panels and posts (not crenellated). On the terrace the vọng lâu is
// masonry, not timber: a lime-plastered storey with three brick-ringed arches on the front (a tall one between two
// smaller), a skirt of tiled roof round a flat deck with a balustrade, a small upper storey with one arch, and a
// small tiled hip roof on top, white ridges ending in upturned horns.
// Plan: OSM way 617748935 (17.7 m along the wall × 12.5 m), centre and axis below; the satellite agrees with both
// (within about 2 m and 1°). The block reaches the rampart's mapped faces: outer face 8.1 m out of the centre,
// inner face 6.3 m in (the wall band's inner notch at the gate).
// Heights are photogrammetric estimates from the matched causeway photographs (no published drawing): cornice 8.0 m
// over the ground, parapet 8.8 m, tower cornice 12.5 m, top ridge about 17.2 m. Passage 4.0 m wide, crown 4.8 m.
// Local frame: s along the wall (the outline's long axis), t through it, + out of the Citadel (south-south-east).
export const id = 'gate:Cửa Nhà Đồ';

const C = [-1428.75, 535.6]; // centre of the OSM outline, metres in the model frame
const A = -0.473; // direction of s (the outline's long axis, along the rampart)
const ux = Math.cos(A), uz = Math.sin(A);
const P = (s, t): [number, number] => [C[0] + s * ux - t * uz, C[1] + s * uz + t * ux];
const V = (s, t, y?) => { const p = P(s, t); return [p[0], y, p[1]]; };
const N = (ds, dt, dy = 0): [number, number, number] => [ds * ux - dt * uz, dy, ds * uz + dt * ux];

const L = 17.7; // the block along the wall (OSM)
const T0 = -6.45, T1 = 8.25; // its inner and outer faces, a hand's breadth proud of the rampart's
const TC = (T0 + T1) / 2, D = T1 - T0;
const HC = 8.0; // top of the block's cornice = the terrace, above LAND_Y
const PW = 4.0, PH = 4.8; // the passage (narrower and lower than the shared CITADEL_PASSAGE, as photographed)
const FRAME = { w: 6.4, h: 6.2 }; // the raised brick frame round the arch
const TW = { w: 9.6, d: 7.0, h: 4.2 }; // vọng lâu, lower storey (front width from the photographs, depth estimated)
const UP = { w: 4.6, d: 3.6, h: 2.5 }; // upper storey
const DECK = { w: 7.2, d: 5.0 }; // flat deck over the lower storey, inside the tiled skirt

// The block is the same weathered red-brown brick as the rampart either side of it (one material in the photographs),
// so it takes the rampart's own brick colour (kinhthanh.js, matched to Street View) and the same MASONRY shading.
const BRICK = mix(PAL.brick, hex('#8a6a58'), 0.75);
const BRICK2 = mix(BRICK, hex('#8c5e4a'), 0.2); // the pilasters, arch voussoirs and frame, a shade redder
const DAMP = shade(BRICK, 0.78), STREAK = shade(BRICK, 0.88), RELAID = mix(BRICK, hex('#9a8070'), 0.4);
const LIME = hex('#66645d'); // dark grey weathered lime: cornices, parapet, lintel (it reads dark in the photographs)
const LIME_D = hex('#53524c'); // the parapet's recessed panels, the stains
const SLAB = hex('#76736c'), RIM = hex('#97938a'), INK = hex('#4e4b45'); // the name tablet: grey stone, thin pale border
const DARK = hex('#1f1a18');
const TOWER = hex('#837d6f'); // the tower's weathered lime plaster
const TILE = hex('#a39a84'); // the tower's tiles, weathered to a pale yellow-grey
const RIDGE = hex('#c9c2b2'); // lime-mortared ridges and the small curled ends
const FASCIA = hex('#8e8879'); // the eave's edge and its underside, light lime as photographed (no dark soffit)

export function build({ data, S }) {
  const Y = LAND_Y, keep = S.kind, n0 = S.n;
  const box = (s, t, y0, y1, ss, st, col, opts?) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, opts); };
  // the wall must be where this model expects it: the rampart band crosses the axis near both faces
  if (!(data.wall || []).length) throw new Error('no rampart in data.wall');
  if (!(data.wall[0] || []).some((r) => unflat(r).some(([x, z]) => Math.hypot(x - C[0], z - C[1]) < 60))) throw new Error('rampart not near Cửa Nhà Đồ');

  // ---- the block: two piers either side of the passage, the arch and the masonry over it ----------------------
  S.kind = KIND.MASONRY;
  const yTop = Y + HC;
  for (const sg of [-1, 1]) {
    const w = L / 2 - PW / 2;
    box(sg * (PW / 2 + w / 2), TC, Y - 0.5, yTop - 0.4, w, D, BRICK, { top: PAL.stone, topKind: KIND.ROAD });
  }
  archPassage(S, Y, yTop - 0.4);

  // corner pilasters on both faces, and the raised frame round the arch with its lime lintel
  for (const dt of [-1, 1]) {
    const t = dt > 0 ? T1 : T0;
    for (const sg of [-1, 1]) {
      box(sg * (L / 2 - 0.7), t + dt * 0.12, Y - 0.5, yTop - 0.75, 1.4, 0.24, BRICK2);
      S.kind = KIND.PLAIN;
      box(sg * (L / 2 - 0.7), t + dt * 0.16, yTop - 0.75, yTop - 0.4, 1.6, 0.32, LIME);
      S.kind = KIND.MASONRY;
    }
    // the frame stands 0.35 m proud: two piers from the ground to the lintel and the brick over the arch between them
    for (const sg of [-1, 1]) box(sg * (FRAME.w / 2 - (FRAME.w - PW) / 4), t + dt * 0.175, Y - 0.5, Y + FRAME.h - 0.3, (FRAME.w - PW) / 2, 0.35, BRICK2);
    box(0, t + dt * 0.175, Y + PH + 0.05, Y + FRAME.h - 0.3, PW + 0.02, 0.35, BRICK2);
    S.kind = KIND.PLAIN;
    box(0, t + dt * 0.22, Y + FRAME.h - 0.3, Y + FRAME.h, FRAME.w + 0.3, 0.44, LIME);
    // the voussoir ring: a band of redder brick round the mouth
    const r = PW / 2, spring = Y + PH - r, K = 12;
    for (let k = 0; k < K; k++) {
      const a0 = Math.PI - (Math.PI * k) / K, a1 = Math.PI - (Math.PI * (k + 1)) / K, R = r + 0.3;
      S.beam(V(R * Math.cos(a0), t + dt * 0.36, spring + R * Math.sin(a0)), V(R * Math.cos(a1), t + dt * 0.36, spring + R * Math.sin(a1)), 0.05, 0.6, shade(BRICK2, 1.08));
    }
  }

  // weathering on both faces: a damp foot, grey streaks from the cornice down, relaid patches
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    const t = dt > 0 ? T1 + 0.03 : T0 - 0.03, n = N(0, dt);
    const face = (s0, s1, y0, y1, col) => S.quad(V(s0, t, y0), V(s1, t, y0), V(s1, t, y1), V(s0, t, y1), col, n);
    for (const [a, b] of ([[-L / 2 + 1.4, -FRAME.w / 2], [FRAME.w / 2, L / 2 - 1.4]] as any[])) face(a, b, Y - 0.5, Y + 0.8, DAMP);
    for (const [s, w, y0, col] of ([[-7.0, 1.2, 2.4, STREAK], [-4.6, 0.9, 4.0, STREAK], [4.4, 1.4, 2.0, STREAK], [6.9, 0.8, 3.4, STREAK], [-5.9, 1.3, 1.2, RELAID], [5.6, 1.1, 4.4, RELAID]] as any[])) {
      face(s - w / 2, s + w / 2, Y + y0, col === RELAID ? Y + y0 + 1.5 : yTop - 0.45, col);
    }
  }

  // ---- name tablet between the frame and the cornice: a grey stone set flush in the brick, a thin pale border,
  // 正南門 cut in three dark characters (drawn as a few strokes each, not blocks) ------------------------------------
  const yb = Y + FRAME.h + 0.35;
  for (const dt of [-1, 1]) {
    const t = dt > 0 ? T1 : T0;
    box(0, t + dt * 0.02, yb, yb + 0.95, 2.4, 0.04, RIM);
    box(0, t + dt * 0.04, yb + 0.07, yb + 0.88, 2.26, 0.04, SLAB);
    for (const k of [-1, 0, 1]) {
      const s = k * 0.62 * -dt; // read left to right from either side
      for (const [ds, y, w, h] of ([[0, 0.68, 0.36, 0.035], [0, 0.48, 0.3, 0.035], [0, 0.26, 0.38, 0.035], [0, 0.47, 0.035, 0.42], [-0.13, 0.4, 0.035, 0.26], [0.13, 0.4, 0.035, 0.26]] as any[])) {
        box(s + ds, t + dt * 0.065, yb + y - h / 2, yb + y + h / 2, w, 0.012, INK);
      }
    }
  }

  // ---- cornice round the top of the block and the low plastered parapet ------------------------------------------
  box(0, TC, yTop - 0.4, yTop, L + 0.5, D + 0.5, LIME, { top: PAL.stone, topKind: KIND.ROAD });
  const PH2 = 0.6, PT = 0.25; // parapet height and thickness: a low panelled balustrade, as photographed
  const ring: [number, boolean, number][] = [[L, true, T1 + 0.05], [L, true, T0 - 0.05], [D, false, L / 2 + 0.05], [D, false, -L / 2 - 0.05]];
  for (const [len, along, off] of ring) {
    const inset = Math.sign(off - (along ? TC : 0)) * PT / 2;
    const c = along ? [0, off - inset] : [off - inset, TC];
    box(c[0], c[1], yTop, yTop + PH2, along ? len + 0.1 : PT, along ? PT : len + 0.1, LIME, { top: shade(LIME, 1.08) });
    // posts with a cap, at both ends and about every 2.6 m; recessed panels between them on the outer face
    const n = Math.max(2, Math.round(len / 2.6));
    for (let k = 0; k <= n; k++) {
      const u = -len / 2 + (len * k) / n, end = k === 0 || k === n;
      const s = along ? u : c[0], tt = along ? c[1] : TC + u;
      box(s, tt, yTop, yTop + PH2 + 0.14, 0.36, 0.36, shade(LIME, 1.04), { top: shade(LIME, 1.1) });
      if (end) S.cyl(...P(s, tt), yTop + PH2 + 0.14, yTop + PH2 + 0.34, 0.15, 0.09, 8, shade(LIME, 1.1));
      if (k < n) {
        const um = -len / 2 + (len * (k + 0.5)) / n, side = Math.sign(off - (along ? TC : 0));
        const ps = along ? um : c[0] + side * (PT / 2 + 0.01), pt = along ? c[1] + side * (PT / 2 + 0.01) : TC + um;
        box(ps, pt, yTop + 0.12, yTop + PH2 - 0.12, along ? len / n - 0.6 : 0.02, along ? 0.02 : len / n - 0.6, LIME_D);
      }
    }
  }

  // ---- the vọng lâu ------------------------------------------------------------------------------------------------
  tower(S, yTop);

  // two small lamp standards on the parapet either side of the tower, and the red-and-white bollards at the passage mouth
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    const p = P(sg * 6.6, TC + 3.0);
    S.cyl(p[0], p[1], yTop + PH2, yTop + PH2 + 1.7, 0.05, 0.04, 6, hex('#3b3a38'), { cap: false });
    S.cyl(p[0], p[1], yTop + PH2 + 1.7, yTop + PH2 + 1.95, 0.12, 0.08, 6, hex('#3b3a38'));
  }
  for (const sg of [-1, 1]) {
    const p = P(sg * (PW / 2 + 0.5), T1 + 1.6);
    S.cyl(p[0], p[1], Y, Y + 0.7, 0.07, 0.07, 6, hex('#b8352e'), { cap: false });
    S.cyl(p[0], p[1], Y + 0.25, Y + 0.45, 0.075, 0.075, 6, hex('#e8e4da'), { cap: false });
  }

  // the terrace and the passage are built ground: trees and houses keep off it
  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = keep;
}

// An arched opening on a face of a box centred at s = sc, face plane t, facing dt: a dark recess and a brick ring.
function archOpening(S, along, sc, t, dn, w, y0, crown, ring = true) {
  const r = w / 2, spring = crown - r, K = 8;
  const at = (u, y) => (along ? V(sc + u, t, y) : V(t, sc + u, y));
  const nrm = along ? N(0, dn) : N(dn, 0);
  S.kind = KIND.PLAIN;
  S.quad(at(-r, y0), at(r, y0), at(r, spring), at(-r, spring), DARK, nrm);
  for (let k = 0; k < K; k++) {
    const a0 = Math.PI - (Math.PI * k) / K, a1 = Math.PI - (Math.PI * (k + 1)) / K;
    S.quad(at(r * Math.cos(a0), spring), at(r * Math.cos(a0), spring + r * Math.sin(a0)), at(r * Math.cos(a1), spring + r * Math.sin(a1)), at(r * Math.cos(a1), spring), DARK, nrm);
  }
  if (!ring) return;
  const off = along ? (u, y) => at(u, y) : at;
  for (let k = 0; k < K; k++) {
    const a0 = Math.PI - (Math.PI * k) / K, a1 = Math.PI - (Math.PI * (k + 1)) / K, R = r + 0.17;
    const p = off(R * Math.cos(a0), spring + R * Math.sin(a0)), q = off(R * Math.cos(a1), spring + R * Math.sin(a1));
    S.beam(p, q, 0.04, 0.34, BRICK2);
  }
  for (const sg of [-1, 1]) { const p = off(sg * (r + 0.17), y0), q = off(sg * (r + 0.17), spring); S.beam(p, q, 0.04, 0.34, BRICK2); }
}

// The masonry tower: plastered lower storey with three arches front and back and one on each end, a tiled skirt round
// a flat deck with a balustrade, the upper storey with one arch on each side, and a small tiled hip on top.
function tower(S, y0) {
  const pc = P(0, TC), keep = S.kind;
  const box = (s, t, a, b, ss, st, col, opts?) => { const p = P(s, t); S.box(p[0], p[1], a, b, ss, st, A, col, opts); };
  const y1 = y0 + TW.h; // lower storey's cornice
  S.kind = KIND.PLAIN;
  box(0, TC, y0, y1, TW.w, TW.d, TOWER, { top: shade(TOWER, 0.8) });
  // stains down the plaster
  for (const dt of [-1, 1]) {
    const t = TC + dt * (TW.d / 2 + 0.01);
    for (const [s, w] of ([[-4.1, 0.7], [-1.6, 0.4], [1.9, 0.5], [4.0, 0.8]] as any[])) S.quad(V(s - w / 2, t, y1 - 2.2), V(s + w / 2, t, y1 - 2.2), V(s + w / 2, t, y1 - 0.05), V(s - w / 2, t, y1 - 0.05), shade(TOWER, 0.78), N(0, dt));
  }
  for (const dt of [-1, 1]) {
    const t = TC + dt * (TW.d / 2 + 0.02);
    archOpening(S, true, 0, t, dt, 2.3, y0, y0 + 3.6);
    for (const sg of [-1, 1]) archOpening(S, true, sg * 3.1, t, dt, 1.5, y0 + 0.9, y0 + 2.9);
  }
  for (const sg of [-1, 1]) archOpening(S, false, TC, sg * (TW.w / 2 + 0.02), sg, 1.8, y0, y0 + 3.2);
  // cornice: two lime courses, the upper one wider
  box(0, TC, y1 - 0.35, y1, TW.w + 0.3, TW.d + 0.3, LIME);
  box(0, TC, y1, y1 + 0.25, TW.w + 0.6, TW.d + 0.6, shade(LIME, 0.92));
  // the tiled skirt: a low hip whose middle the deck covers
  const ys = y1 + 0.25, sh = 0.7;
  shallowHip(S, pc, TW.w + 0.6, TW.d + 0.6, ys, sh, 0.3);
  S.kind = KIND.PLAIN;
  const yd = ys + sh + 0.3;
  box(0, TC, ys + 0.2, yd, DECK.w, DECK.d, LIME, { top: shade(LIME, 0.9) });
  // balustrade round the deck: a low wall with posts
  for (const [len, along, off] of ([[DECK.w, true, TC + DECK.d / 2 - 0.12], [DECK.w, true, TC - DECK.d / 2 + 0.12], [DECK.d, false, DECK.w / 2 - 0.12], [DECK.d, false, -DECK.w / 2 + 0.12]] as any[])) {
    box(along ? 0 : off, along ? off : TC, yd, yd + 0.45, along ? len : 0.22, along ? 0.22 : len, shade(LIME, 0.95));
    const n = Math.max(2, Math.round(len / 1.8));
    for (let k = 0; k <= n; k++) {
      const u = -len / 2 + (len * k) / n;
      box(along ? u : off, along ? off : TC + u, yd, yd + 0.75, 0.3, 0.3, LIME);
    }
  }
  // upper storey
  const yu = yd + UP.h;
  box(0, TC, yd, yu, UP.w, UP.d, TOWER, { top: shade(TOWER, 0.8) });
  for (const dt of [-1, 1]) archOpening(S, true, 0, TC + dt * (UP.d / 2 + 0.02), dt, 1.5, yd + 0.2, yd + 2.1);
  for (const sg of [-1, 1]) archOpening(S, false, TC, sg * (UP.w / 2 + 0.02), sg, 1.0, yd + 0.6, yd + 1.9, false);
  box(0, TC, yu - 0.25, yu, UP.w + 0.3, UP.d + 0.3, LIME);
  // top roof
  const hr = 0.75;
  shallowHip(S, pc, UP.w + 0.3, UP.d + 0.3, yu, hr, 0.3);
  // a flagstaff on the ridge, as photographed
  S.kind = KIND.PLAIN;
  S.cyl(pc[0], pc[1], yu + hr - 0.1, yu + hr + 1.4, 0.035, 0.03, 5, hex('#5a5753'), { cap: false });
  S.kind = keep;
}

// The vọng lâu's roofs as photographed: a shallow straight hip of pale tiles with a thin light eave (no flying eave,
// no dark soffit), white hip ridges and only a small curled end at each corner, drawn here rather than with hip()'s
// đầu đao horns, which are far larger than these.
function shallowHip(S, pc, w, d, y0, h, over) {
  S.hip(pc[0], pc[1], w, d, A, y0, h, TILE, { flare: 0, over, ridgeCol: RIDGE, fascia: 0.14, fasciaCol: FASCIA });
  // the four hip ridges, straight from the ridge's ends down to the eave corners, each ending in a small curl
  const { hw, hd, rl } = hipShape(w + over * 2, d + over * 2, 0, false, RIDGE);
  const t = 0.2, keep = S.kind;
  const at = (u, v, y): [number, number, number] => [pc[0] + u * ux - v * uz, y, pc[1] + u * uz + v * ux];
  S.kind = KIND.PLAIN;
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    const top = at(su * rl, 0, y0 + h + t * 0.4), e = at(su * hw, sv * hd, y0 + t * 0.4);
    S.beam(top, e, t * 0.9, t, RIDGE);
    const dx = su * ux - sv * uz, dz = su * uz + sv * ux, dl = Math.hypot(dx, dz);
    const m = [e[0] + (dx / dl) * 0.18, e[1] + 0.1, e[2] + (dz / dl) * 0.18];
    S.beam(e, m, t * 0.8, t * 0.9, RIDGE);
    S.beam(m, [m[0] + (dx / dl) * 0.06, m[1] + 0.2, m[2] + (dz / dl) * 0.06], t * 0.6, t * 0.7, RIDGE);
  }
  S.kind = keep;
}

// The arched passage through the block along t, centred at s = 0: masonry over the crown, the spandrels on both
// faces, a dark barrel vault, a paved floor.
function archPassage(S, y0, y1) {
  const r = PW / 2, fl = y0, crown = y0 + PH, spring = crown - r, K = 10;
  const box = (s, t, a, b, ss, st, col, opts?) => { const p = P(s, t); S.box(p[0], p[1], a, b, ss, st, A, col, opts); };
  S.kind = KIND.MASONRY;
  box(0, TC, crown, y1, PW + 0.02, D, BRICK, { top: PAL.stone, topKind: KIND.ROAD });
  const arc = (k) => { const th = Math.PI - (Math.PI * k) / K; return [r * Math.cos(th), spring + r * Math.sin(th)]; };
  for (const dt of [-1, 1]) {
    const t = dt > 0 ? T1 : T0;
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
      S.quad(V(sa, t, ya), V(sb, t, yb), V(sb, t, crown), V(sa, t, crown), BRICK, N(0, dt));
    }
  }
  S.kind = KIND.PLAIN;
  for (let k = 0; k < K; k++) {
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    S.quad(V(sa, T0 + 0.01, ya), V(sb, T0 + 0.01, yb), V(sb, T1 - 0.01, yb), V(sa, T1 - 0.01, ya), shade(BRICK, 0.5), N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
  }
  for (const sg of [-1, 1]) {
    const s = sg * (r - 0.02);
    S.quad(V(s, T0 + 0.5, fl), V(s, T1 - 0.5, fl), V(s, T1 - 0.5, spring), V(s, T0 + 0.5, spring), DARK, N(-sg, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(V(-r, T0 - 0.3, fl + 0.01), V(r, T0 - 0.3, fl + 0.01), V(r, T1 + 0.3, fl + 0.01), V(-r, T1 + 0.3, fl + 0.01), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.kind = KIND.PLAIN;
}
