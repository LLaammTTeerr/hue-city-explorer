import { KIND, hex, shade, mix, rand } from '../../geo/buf.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';

// Quan Tượng Đài (觀象臺, "Nam Đài"), the Nguyễn observatory, built 1827 (Minh Mạng 8) on the Nam Minh bastion at the
// Citadel's south-west corner (the corner over Bạch Hổ bridge). Restored Oct 2012 - Sep 2013. Sources and estimates:
// docs/places/quantuong.md.
//
// Sourced: a solid brick platform (nền đài) faced with gạch vồ under a lime render, about 5.9 m high, reading as a
// truncated pyramid; a brick-paved deck with a railing (lan can) round it and posts at the four corners; in the middle
// the Bát Phong pavilion, octagonal, open, with 12 columns and two roof tiers (8 slopes below, 4 above) in green
// glazed tiles. The approach is from inside the Citadel: a solid stepped ramp 8.2 m wide, 51 steps of 75-80 cm,
// đá gan gà treads in the middle and brick-paved slopes either side. A stone plaque "Quan Tượng Đài" on the outward
// (south-west) face. War-time bunkers still stand on the bastion.
// Placed from OSM: node 11212153237 (the platform), the footway 39414010 (the ramp, from the corner of Ông Ích Khiêm
// and Tôn Thất Thiệp into the bastion) and the bunker node 13673950594 at the bastion's tip. The bastion itself
// (rampart, walk, parapet) is the kinhthanh replica's and is not drawn here.
export const id = 'quantuong';

// the ramp's axis, from its foot inside the bastion's gorge toward the bastion's tip (OSM footway 39414010, averaged
// with the bastion's bisector)
const HEAD = [-1933.3, 740.0]; // the head of the ramp, at the platform's inner edge (footway's end)
const U = (() => { const dx = -0.33, dz = 0.944, l = Math.hypot(dx, dz); return [dx / l, dz / l]; })();
const BUNKER = [-1946.9, 788.0];

const SIDE = 20.0; // deck side (estimate, scaled to the bastion's hollow and photos)
const BATTER = 0.94; // the faces lean in: deck side / foot side
const DECK = LAND_Y + WALL_H + 0.8; // deck stands a little proud of the rampart walk (5.9 m sourced is from the court)
const STEPS = 51, TREAD = 0.78, RAMP_W = 8.2, MID_W = 5.0; // sourced: 51 steps, 75-80 cm, ramp 8.2 m wide

const BRICK = hex('#6c665c'); // gạch vồ under a worn lime render, grey with the warmth gone
const RENDER = hex('#8a857a'); // patches of the 2013 lime render
const DAMP = hex('#45433d');
const FLOOR = hex('#a27a5f'); // gạch bát, the deck's square floor bricks
const GANGA = hex('#8b6a50'); // đá gan gà: brown, pitted laterite-like stone
const SLOPE = hex('#94705a'); // the brick-paved side slopes
const RAIL = hex('#7b7468'), RAILTOP = hex('#b0a998');
const ROOF = hex('#2f7c68'); // ngói thanh lưu ly: blue-green glazed tiles
const RIDGE = hex('#bccbb3');
const LAC = PAL.lacquer;
const STONE = shade(PAL.stone, 0.9);
const CONCRETE = hex('#8e8c84');

export function build({ S }) {
  const [fx, fz] = U, px = -fz, pz = fx; // f: up the ramp toward the bastion's tip; p: across it
  const fa = Math.atan2(fz, fx);
  const at = (a, b) => [HEAD[0] + fx * a + px * b, HEAD[1] + fz * a + pz * b];
  const C = at(SIDE / 2, 0); // the platform's centre
  const cAt = (a, b) => [C[0] + fx * a + px * b, C[1] + fz * a + pz * b];
  const y0 = LAND_Y - 0.4, foot = SIDE / BATTER;
  const n0 = S.n;

  // ---- the platform: a truncated pyramid of brick, a damp foot, render patches, a stone cornice under the deck ----
  S.kind = KIND.MASONRY;
  S.box(C[0], C[1], y0, DECK - 0.35, foot, foot, fa, BRICK, { taper: (SIDE - 0.1) / foot, top: FLOOR });
  S.box(C[0], C[1], DECK - 0.35, DECK, SIDE + 0.25, SIDE + 0.25, fa, shade(STONE, 0.85), { top: FLOOR, topKind: KIND.ROAD });
  // the faces as they read: dark damp foot, lighter render patches high up (thin plates just proud of the batter)
  const lean = (foot - SIDE) / 2 / (DECK - 0.35 - y0); // horizontal in-step per metre of height
  for (let side = 0; side < 4; side++) {
    const ang = fa + side * Math.PI / 2, ox = Math.cos(ang), oz = Math.sin(ang), tx = -oz, tz = ox;
    const face = (s0, s1, h0, h1, col) => {
      const d0 = foot / 2 - lean * (h0 - y0) + 0.04, d1 = foot / 2 - lean * (h1 - y0) + 0.04;
      const P = (s, d, y) => [C[0] + ox * d + tx * s, y, C[1] + oz * d + tz * s];
      S.quad(P(s0, d0, h0), P(s1, d0, h0), P(s1, d1, h1), P(s0, d1, h1), col, [ox, 0.15, oz]);
    };
    const half = (h) => foot / 2 - lean * (h - y0) - 0.3;
    face(-half(LAND_Y + 0.9), half(LAND_Y + 0.9), y0 + 0.4, LAND_Y + 0.6 + rand(side, 1) * 0.4, DAMP);
    for (let k = 0; k < 4; k++) {
      const s = (rand(side * 7 + k, 2) - 0.5) * (SIDE - 6), w = 2 + rand(side * 7 + k, 3) * 3.5, h = LAND_Y + 2 + rand(side * 7 + k, 4) * 3;
      face(s - w / 2, s + w / 2, h, Math.min(DECK - 0.6, h + 1 + rand(side, k + 5) * 1.5), mix(RENDER, BRICK, rand(side, k) * 0.4));
    }
  }
  // the plaque "Quan Tượng Đài" on the outward face, under the cornice
  {
    const d = SIDE / 2 + 0.2, q = cAt(d, 0);
    // (the deck stands only 0.8 m over the walk here, so the plaque shows as a band just under the cornice)
    S.box(q[0], q[1], DECK - 0.8, DECK - 0.4, 0.14, 2.0, fa, hex('#3f4342'));
    S.box(q[0], q[1], DECK - 0.85, DECK - 0.36, 0.08, 2.24, fa, STONE);
  }

  // ---- the railing (lan can): a low brick balustrade with pierced panels, posts at the corners, open at the ramp ----
  S.kind = KIND.MASONRY;
  const RH = 0.85, RT = 0.32, inset = 0.25;
  const railRun = (a0, b0, a1, b1) => {
    const p = cAt(a0, b0), q = cAt(a1, b1), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 0.2) return;
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    S.box(m[0], m[1], DECK, DECK + 0.32, len, RT, ang, RAIL);
    S.box(m[0], m[1], DECK + 0.32, DECK + RH - 0.1, len, RT * 0.55, ang, shade(RAILTOP, 0.82)); // the pierced band
    S.box(m[0], m[1], DECK + RH - 0.1, DECK + RH, len + 0.05, RT + 0.06, ang, RAIL, { top: RAILTOP });
    const nP = Math.max(1, Math.round(len / 2.2));
    for (let i = 1; i < nP; i++) { const t = i / nP; S.box(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, DECK, DECK + RH + 0.05, 0.34, 0.34, ang, RAIL, { top: RAILTOP }); }
  };
  const e = SIDE / 2 - inset;
  railRun(e, -e, e, e); // outward face
  railRun(-e, e, e, e); railRun(-e, -e, e, -e); // the two sides
  railRun(-e, -e, -e, -RAMP_W / 2); railRun(-e, RAMP_W / 2, -e, e); // the ramp face, open in the middle
  for (const a of [-e, e]) for (const b of [-e, e]) { // bổ trụ: the four corner posts
    const q = cAt(a, b);
    S.box(q[0], q[1], DECK, DECK + 1.25, 0.6, 0.6, fa, RAIL, { top: RAILTOP });
    S.box(q[0], q[1], DECK + 1.25, DECK + 1.45, 0.42, 0.42, fa, RAILTOP, { taper: 0.4 });
  }
  for (const b of [-RAMP_W / 2, RAMP_W / 2]) { // and the posts flanking the ramp's head
    const q = cAt(-e, b);
    S.box(q[0], q[1], DECK, DECK + 1.1, 0.5, 0.5, fa, RAIL, { top: RAILTOP });
  }

  // ---- the ramp: 51 solid steps of đá gan gà, brick-paved slopes either side, built up from the court ----
  const rise = (DECK - LAND_Y) / STEPS, run = STEPS * TREAD;
  for (let k = 0; k < STEPS; k++) {
    const q = at(-run + TREAD * (k + 0.5), 0);
    const col = shade(GANGA, 0.92 + rand(k, 9) * 0.16);
    S.box(q[0], q[1], y0, LAND_Y + rise * (k + 1), TREAD + 0.02, MID_W, fa, col, { topKind: KIND.ROAD });
  }
  const sw = (RAMP_W - MID_W) / 2;
  for (const sg of [-1, 1]) {
    const b0 = sg * MID_W / 2, b1 = sg * RAMP_W / 2;
    const P = (a, b, y) => { const q = at(a, b); return [q[0], y, q[1]]; };
    const yTop = DECK + 0.02, yFoot = LAND_Y + 0.04;
    // the sloping brick top, the outer side wall and the end at the foot
    const A = P(-run, b0, yFoot), B = P(-run, b1, yFoot), Cc = P(0.3, b1, yTop), D = P(0.3, b0, yTop);
    S.kind = KIND.ROAD;
    if (sg > 0) S.quad(A, B, Cc, D, SLOPE, [0, 1, 0]); else S.quad(B, A, D, Cc, SLOPE, [0, 1, 0]);
    S.kind = KIND.MASONRY;
    const Bl = P(-run, b1, y0), Cl = P(0.3, b1, y0);
    S.quad(Bl, Cl, Cc, B, BRICK, [px * sg, 0.05, pz * sg]);
    S.quad(B, Cc, Cl, Bl, BRICK, [px * sg, 0.05, pz * sg]); // both windings: seen from either side of the edge
    // a brick kerb along the outer edge
    const k0 = P(-run, b1 - sg * 0.18, yFoot + 0.18), k1 = P(0.3, b1 - sg * 0.18, yTop + 0.18);
    S.beam(k0, k1, 0.36, 0.36, RAIL);
    // the side slope's solid body under it, stepped like the treads
    for (let k = 0; k < STEPS; k += 3) {
      const q = at(-run + TREAD * (k + 1.5), sg * (MID_W / 2 + sw / 2));
      S.box(q[0], q[1], y0, LAND_Y + rise * (k + 0.6), TREAD * 3, sw - 0.05, fa, BRICK);
    }
  }
  // a paved landing at the ramp's foot
  { const q = at(-run - 1.5, 0); S.box(q[0], q[1], y0, LAND_Y + 0.08, 3.0, RAMP_W + 1, fa, shade(SLOPE, 0.9), { topKind: KIND.ROAD }); }

  // ---- đình Bát Phong: octagonal, open, 8 outer columns and 4 inner, two roof tiers in green glazed tile ----
  const yP = DECK + 0.45, R0 = 3.4; // its own low octagonal plinth; outer columns on a 3.4 m radius (estimates)
  const rot = fa + Math.PI / 8; // a flat side faces the ramp
  S.kind = KIND.MASONRY;
  S.cyl(C[0], C[1], DECK - 0.05, yP, 4.75, 4.6, 8, shade(STONE, 0.95), { rot });
  S.cyl(C[0], C[1], DECK - 0.05, DECK + 0.02, 5.2, 5.2, 8, shade(FLOOR, 0.9), { rot }); // a brick apron round it
  for (const b of [0]) { const q = cAt(-4.75 - 0.4, b); S.box(q[0], q[1], DECK - 0.05, yP - 0.2, 0.8, 2.2, fa, STONE); }
  S.kind = KIND.TIMBER;
  const hOut = 2.9, hIn = 4.6;
  const oct = (r, k) => { const a = rot + k * Math.PI / 4; return [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]; };
  for (let k = 0; k < 8; k++) {
    const q = oct(R0, k);
    S.cyl(q[0], q[1], yP, yP + 0.22, 0.28, 0.24, 6, STONE, { cap: false });
    S.cyl(q[0], q[1], yP + 0.22, yP + hOut, 0.15, 0.14, 8, LAC, { cap: false });
  }
  const IN = 1.6;
  for (const a of [-IN, IN]) for (const b of [-IN, IN]) {
    const q = cAt(a, b);
    S.cyl(q[0], q[1], yP, yP + 0.22, 0.3, 0.26, 6, STONE, { cap: false });
    S.cyl(q[0], q[1], yP + 0.22, yP + hIn, 0.17, 0.16, 8, LAC, { cap: false });
  }
  // the ring beam on the outer columns, with a carved valance under it, and tie beams to the inner columns
  const lb = shade(LAC, 0.78);
  for (let k = 0; k < 8; k++) {
    const p = oct(R0, k), q = oct(R0, k + 1);
    S.beam([p[0], yP + hOut - 0.12, p[1]], [q[0], yP + hOut - 0.12, q[1]], 0.22, 0.26, lb);
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    S.box(m[0], m[1], yP + hOut - 0.6, yP + hOut - 0.25, Math.hypot(q[0] - p[0], q[1] - p[1]) - 0.35, 0.06, Math.atan2(q[1] - p[1], q[0] - p[0]), shade(LAC, 0.6));
  }
  for (const a of [-IN, IN]) for (const b of [-IN, IN]) {
    const q = cAt(a, b), o = cAt(a * R0 / Math.hypot(IN, IN) * 0.98, b * R0 / Math.hypot(IN, IN) * 0.98);
    S.beam([q[0], yP + hOut - 0.3, q[1]], [o[0], yP + hOut - 0.3, o[1]], 0.16, 0.2, lb);
  }
  for (const sg of [-1, 1]) {
    let p = cAt(-IN, sg * IN), q = cAt(IN, sg * IN);
    S.beam([p[0], yP + hIn - 0.15, p[1]], [q[0], yP + hIn - 0.15, q[1]], 0.24, 0.28, lb);
    p = cAt(sg * IN, -IN); q = cAt(sg * IN, IN);
    S.beam([p[0], yP + hIn - 0.15, p[1]], [q[0], yP + hIn - 0.15, q[1]], 0.24, 0.28, lb);
  }
  // lower tier: an eight-sloped skirt from the outer columns up to the inner square
  octRoof(S, C, rot, R0 + 1.25, IN * 1.25, yP + hOut, yP + hOut + 1.35, 0.32, ROOF, RIDGE, shade(LAC, 0.6));
  // the chồng diêm: dark boards between the tiers
  S.kind = KIND.TIMBER;
  S.box(C[0], C[1], yP + hOut + 1.05, yP + hIn, IN * 2 + 0.3, IN * 2 + 0.3, fa, shade(LAC, 0.62), { top: shade(ROOF, 0.8) });
  // upper tier: four slopes, a short ridge
  S.hip(C[0], C[1], IN * 2 + 0.5, IN * 2 + 0.1, fa + Math.PI / 2, yP + hIn, 1.45, ROOF, { flare: 0.35, over: 0.85, fascia: 0.2, fasciaCol: shade(LAC, 0.6), glazed: true, segs: 3, ridgeCol: RIDGE, hips: true });
  // a lightning rod on the ridge
  S.kind = KIND.PLAIN;
  S.box(C[0], C[1], yP + hIn + 1.5, yP + hIn + 2.6, 0.05, 0.05, fa, hex('#3a3a38'));
  S.cyl(C[0], C[1], yP + hIn + 1.45, yP + hIn + 1.85, 0.16, 0.06, 6, RIDGE, { rot });

  // ---- the war-time bunker on the bastion's tip (OSM 13673950594): squat concrete, a dark firing slit ----
  {
    const yb = LAND_Y + WALL_H - 0.05, ang = fa;
    S.kind = KIND.MASONRY;
    S.box(BUNKER[0], BUNKER[1], yb, yb + 1.5, 3.4, 3.0, ang, CONCRETE, { top: shade(CONCRETE, 0.85), taper: 0.92 });
    const q = [BUNKER[0] + fx * 1.58, BUNKER[1] + fz * 1.58];
    S.box(q[0], q[1], yb + 0.8, yb + 1.05, 0.06, 1.6, ang, hex('#1d1d1b'));
  }

  S.kind = KIND.PLAIN;
  S.base = 0;
  (S.paved = S.paved || []).push([n0, S.n]); // the deck, the ramp and its landing: keep trees and houses off
  return null;
}

// An octagonal hip skirt: eave ring radius r0 at y0 rising to r1 at y1, a slight sag-and-lift at the corners, a
// fascia under the eave and hip ridges ending in small upturned horns. rot is the angle of the first corner.
function octRoof(S, C, rot, r0, r1, y0, y1, lift, col, ridgeCol, fasciaCol) {
  const keep = S.kind;
  const P = (r, k, y) => { const a = rot + k * Math.PI / 4; return [C[0] + Math.cos(a) * r, y, C[1] + Math.sin(a) * r]; };
  // three rows from eave to top, concave; the corners lifted
  const rows = 3, cols = 2;
  const pt = (k, s, t) => { // side k, s along it (0..1), t eave -> top (0..1)
    const a = P(1, k, 0), b = P(1, k + 1, 0);
    const ux = a[0] - C[0] + (b[0] - a[0]) * s, uz = a[2] - C[1] + (b[2] - a[2]) * s; // a point on the unit octagon
    const r = r0 + (r1 - r0) * t;
    const y = y0 + (y1 - y0) * t ** 1.5 + lift * Math.abs(2 * s - 1) ** 2 * (1 - t) ** 2;
    return [C[0] + ux * r, y, C[1] + uz * r];
  };
  S.kind = KIND.GLAZED;
  for (let k = 0; k < 8; k++) {
    const mid = P(1, k + 0.5, 0), hint = [mid[0] - C[0], 0.9, mid[2] - C[1]];
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      S.quad(pt(k, j / cols, i / rows), pt(k, (j + 1) / cols, i / rows), pt(k, (j + 1) / cols, (i + 1) / rows), pt(k, j / cols, (i + 1) / rows), col, hint);
    }
  }
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 8; k++) {
    const mid = P(1, k + 0.5, 0), hint = [mid[0] - C[0], 0, mid[2] - C[1]];
    for (let j = 0; j < cols; j++) {
      const a = pt(k, j / cols, 0), b = pt(k, (j + 1) / cols, 0);
      S.quad([a[0], a[1] - 0.2, a[2]], [b[0], b[1] - 0.2, b[2]], b, a, fasciaCol, hint);
    }
    // hip ridge and horn
    let prev = null;
    for (let i = rows; i >= 0; i--) { const p = pt(k, 0, i / rows); const q = [p[0], p[1] + 0.12, p[2]]; if (prev) S.beam(prev, q, 0.2, 0.22, ridgeCol); prev = q; }
    const dx = prev[0] - C[0], dz = prev[2] - C[1], l = Math.hypot(dx, dz);
    S.beam(prev, [prev[0] + dx / l * 0.5, prev[1] + 0.45, prev[2] + dz / l * 0.5], 0.16, 0.18, ridgeCol);
  }
  // the top ring where the skirt meets the chồng diêm
  for (let k = 0; k < 8; k++) { const a = pt(k, 0, 1), b = pt(k + 1, 0, 1); S.beam([a[0], a[1] + 0.08, a[2]], [b[0], b[1] + 0.08, b[2]], 0.18, 0.18, ridgeCol); }
  S.kind = keep;
}
