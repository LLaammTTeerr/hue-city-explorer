import { KIND, hex, shade, mix, rand } from '../../geo/buf.ts';
import { LAND_Y, WALL_H, PAL } from '../../config.ts';

// the deck over the street the ramp starts from: Street View from Tôn Thất Thiệp and Ông Ích Khiêm puts the ramp's
// head about 9.5 m over the pavement (the sourced 5.9 m is the platform over the bastion's terreplein)
const DECK_H = 9.5;

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
// Placed from OSM and aligned to the Google satellite (see U below): node 11212153237 (the platform), the footway 39414010 (the ramp, from the corner of Ông Ích Khiêm
// and Tôn Thất Thiệp into the bastion) and the bunker node 13673950594 at the bastion's tip. The bastion itself
// (rampart, walk, parapet) is the kinhthanh replica's and is not drawn here.
export const id = 'quantuong';

// the ramp's axis, from its foot at Tôn Thất Thiệp toward the bastion's tip: bearing 199° (the ramp climbs SSW; seen
// from the platform it runs NNE). The OSM footway 39414010 averaged with the bastion's bisector gave this axis and the
// Google satellite agrees to within 1°. The OSM node and footway's end put the platform ~10 m too far south: the
// satellite puts the platform's centre at x -1931.7, z 740.8 (corrected for the lean of its 6 m faces) and the ramp's
// foot at the street, x -1917.2, z 698.0. HEAD is set from those, the whole 1.1 m further up the axis so the first
// steps stop at the mapped street's kerb instead of standing in the carriageway (check:overlap).
const U = (() => { const dx = -0.33, dz = 0.944, l = Math.hypot(dx, dz); return [dx / l, dz / l]; })();
const SA = 14.5, SB = 16.5; // deck along the ramp axis x across it (satellite; the deck is not square)
const HEAD = [-1931.7 + U[0] * (1.1 - SA / 2), 740.8 + U[1] * (1.1 - SA / 2)]; // the head of the ramp, at the deck's inner edge
const BUNKER = [-1946.9, 788.0];

const BATTER = 0.88; // the faces lean in: deck / foot (satellite: about 1.1 m of face shows outside the deck)
const DECK = LAND_Y + DECK_H; // see DECK_H
const STEPS = 51, TREAD = 0.75, RAMP_W = 8.2, MID_W = 6.4; // sourced: 51 steps, 75-80 cm, ramp 8.2 m wide; the
// satellite's 38 m ramp asks for the short end of the tread; Street View shows narrow sloping bands beside the steps

const FORE = 1.2; // depth of the paved forecourt in front of the first step, as far as the street's kerb allows

const BRICK = hex('#4f4b44'); // gạch vồ under a worn lime render, dark grey and mossy as Street View shows it
const RENDER = hex('#6e695f'); // patches of the 2013 lime render
const DAMP = hex('#35342f');
const FLOOR = hex('#7d6a5a'); // gạch bát, the deck's square floor bricks
const GANGA = hex('#5e564d'); // đá gan gà: pitted laterite-like stone, weathered dark grey-brown
const SLOPE = hex('#a08766'); // the side slopes and copings, pale ochre render
const RAIL = hex('#7b7468'), RAILTOP = hex('#b0a998');
const ROOF = hex('#5d6c5f'); // ngói thanh lưu ly: green glaze, weathered grey-green as Street View shows it
const RIDGE = hex('#bccbb3');
const LAC = hex('#7a7468'); // the columns read grey in Street View, not red lacquer
const STONE = shade(PAL.stone, 0.9);
const CONCRETE = hex('#8e8c84');
const IRON = hex('#26282a');

export function build({ S }) {
  const [fx, fz] = U, px = -fz, pz = fx; // f: up the ramp toward the bastion's tip; p: across it
  const fa = Math.atan2(fz, fx);
  const at = (a, b): [number, number] => [HEAD[0] + fx * a + px * b, HEAD[1] + fz * a + pz * b];
  const C = at(SA / 2, 0); // the platform's centre
  const cAt = (a, b): [number, number] => [C[0] + fx * a + px * b, C[1] + fz * a + pz * b];
  const y0 = LAND_Y - 0.4, footA = SA / BATTER, footB = SB / BATTER;
  const n0 = S.n;

  // ---- Nam Minh bastion terreplein: fill the hollow interior of the OSM rampart ring up to the bastion's
  // terreplein (LAND_Y + 3.6 m, so the 5.9 m observatory platform stands on solid earth rather than a sunken pit),
  // with a paved stone perimeter walkway and low brick retaining wall along the inner gorge facing Tôn Thất Thiệp ----
  {
    const TERRE = LAND_Y + 4.8;
    // keep the gorge edge cleanly south of Tôn Thất Thiệp (ramp foot at -1917.2, 698.0) so no masonry touches the road
    const BASTION_IN = [[-1955.0, 706.0], [-1962.7, 709.7], [-1937.6, 761.4], [-1887.6, 737.1], [-1890.0, 715.0], [-1919.5, 707.5]];
    S.kind = KIND.MASONRY;
    S.prism(BASTION_IN, LAND_Y - 0.5, TERRE, shade(BRICK, 1.05), PAL.moss, { topKind: KIND.GROUND });
    // stepped stone walkways crossing the terreplein around the observatory, as seen in the satellite & photo
    S.kind = KIND.ROAD;
    for (const s of [-1, 1]) {
      const q = cAt(0, s * (SB / 2 + 5.0));
      S.box(q[0], q[1], TERRE - 0.1, TERRE + 0.08, SA + 14, 2.2, fa, STONE, { topKind: KIND.ROAD });
    }
    const qOut = cAt(SA / 2 + 5.5, 0);
    S.box(qOut[0], qOut[1], TERRE - 0.1, TERRE + 0.08, 2.4, SB + 12, fa, STONE, { topKind: KIND.ROAD });
    // low stone curb/parapet flanking the bastion's outer terreplein edges (keep the gorge open at the ramp)
    S.kind = KIND.MASONRY;
    for (let i = 0; i < 4; i++) {
      const a = BASTION_IN[i], b = BASTION_IN[i + 1];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      S.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, TERRE, TERRE + 0.45, len, 0.5, Math.atan2(dz, dx), shade(STONE, 0.88), { top: RAILTOP });
    }
  }

  // ---- the platform: a truncated pyramid of brick, a damp foot, render patches, a stone cornice under the deck ----
  S.kind = KIND.MASONRY;
  S.box(C[0], C[1], y0, DECK - 0.35, footA, footB, fa, BRICK, { taper: BATTER * (1 - 0.1 / SB), top: FLOOR });
  S.box(C[0], C[1], DECK - 0.35, DECK, SA + 0.25, SB + 0.25, fa, shade(STONE, 0.85), { top: FLOOR, topKind: KIND.ROAD });
  // the faces as they read: dark damp foot, lighter render patches high up (thin plates just proud of the batter)
  for (let side = 0; side < 4; side++) {
    const ang = fa + side * Math.PI / 2, ox = Math.cos(ang), oz = Math.sin(ang), tx = -oz, tz = ox;
    const foot = side % 2 ? footB : footA, along = side % 2 ? SA : SB; // depth to this face; the face's own width
    const lean = (foot - foot * BATTER) / 2 / (DECK - 0.35 - y0); // horizontal in-step per metre of height
    const face = (s0, s1, h0, h1, col) => {
      const d0 = foot / 2 - lean * (h0 - y0) + 0.04, d1 = foot / 2 - lean * (h1 - y0) + 0.04;
      const P = (s, d, y): [number, number, number] => [C[0] + ox * d + tx * s, y, C[1] + oz * d + tz * s];
      S.quad(P(s0, d0, h0), P(s1, d0, h0), P(s1, d1, h1), P(s0, d1, h1), col, [ox, 0.15, oz]);
    };
    const half = (h) => (along / BATTER) / 2 - (along / BATTER) * (1 - BATTER) / 2 * (h - y0) / (DECK - 0.35 - y0) - 0.3;
    face(-half(LAND_Y + 0.9), half(LAND_Y + 0.9), y0 + 0.4, LAND_Y + 0.6 + rand(side, 1) * 0.4, DAMP);
    for (let k = 0; k < 4; k++) {
      const s = (rand(side * 7 + k, 2) - 0.5) * (along - 6), w = 2 + rand(side * 7 + k, 3) * 3.5, h = LAND_Y + 2 + rand(side * 7 + k, 4) * (DECK_H - 4.5);
      face(s - w / 2, s + w / 2, h, Math.min(DECK - 0.6, h + 1 + rand(side, k + 5) * 1.5), mix(RENDER, BRICK, rand(side, k) * 0.4));
    }
  }
  // the plaque "Quan Tượng Đài" on the outward face, under the cornice
  {
    const d = SA / 2 + 0.2, q = cAt(d, 0);
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
  const e = SA / 2 - inset, g = SB / 2 - inset;
  railRun(e, -g, e, g); // outward face
  railRun(-e, g, e, g); railRun(-e, -g, e, -g); // the two sides
  railRun(-e, -g, -e, -RAMP_W / 2); railRun(-e, RAMP_W / 2, -e, g); // the ramp face, open in the middle
  for (const a of [-e, e]) for (const b of [-g, g]) { // bổ trụ: the four corner posts
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
    // creeper on the outer wall's upper end and a few dark streaks lower down (Street View)
    S.kind = KIND.PLAIN;
    for (let k = 0; k < 7; k++) {
      const a0 = -run * (0.02 + rand(k + sg * 9, 21) * 0.28), w = 1.6 + rand(k, 22) * 2.4, hh = 1.2 + rand(k + sg, 23) * 2.2;
      const ya = (a) => LAND_Y + (DECK - LAND_Y) * (1 + a / run);
      const g = mix(hex('#3f5a2e'), hex('#5f7a3a'), rand(k, 24));
      const n = [px * sg, 0.05, pz * sg], o = 0.05;
      const Q = (a, y) => { const q = at(a, b1); return [q[0] + px * sg * o, y, q[1] + pz * sg * o]; };
      S.quad(Q(a0 - w, ya(a0 - w) - hh), Q(a0, ya(a0) - hh), Q(a0, ya(a0)), Q(a0 - w, ya(a0 - w)), g, n);
      S.quad(Q(a0, ya(a0) - hh), Q(a0 - w, ya(a0 - w) - hh), Q(a0 - w, ya(a0 - w)), Q(a0, ya(a0)), g, [-n[0], n[1], -n[2]]);
    }
    S.kind = KIND.MASONRY;
    // a brick kerb along the outer edge
    const k0 = P(-run, b1 - sg * 0.18, yFoot + 0.18), k1 = P(0.3, b1 - sg * 0.18, yTop + 0.18);
    S.beam(k0, k1, 0.36, 0.36, shade(SLOPE, 1.08));
    // the iron pipe railing along the steps' edge (Street View), on posts every ~2.5 m
    S.kind = KIND.PLAIN;
    const r0 = P(-run + 0.4, b0 + sg * 0.12, yFoot), r1 = P(-0.2, b0 + sg * 0.12, yTop);
    const up = (q, h): [number, number, number] => [q[0], q[1] + h, q[2]];
    S.beam(up(r0, 0.95), up(r1, 0.95), 0.06, 0.06, IRON);
    S.beam(up(r0, 0.5), up(r1, 0.5), 0.04, 0.04, IRON);
    for (let i = 0; i <= 15; i++) { const t = i / 15, q = [r0[0] + (r1[0] - r0[0]) * t, r0[1] + (r1[1] - r0[1]) * t, r0[2] + (r1[2] - r0[2]) * t]; S.beam(q, up(q, 0.95), 0.06, 0.06, IRON); }
    S.kind = KIND.MASONRY;
    // the side slope's solid body under it, stepped like the treads
    for (let k = 0; k < STEPS; k += 3) {
      const q = at(-run + TREAD * (k + 1.5), sg * (MID_W / 2 + sw / 2));
      S.box(q[0], q[1], y0, LAND_Y + rise * (k + 0.6), TREAD * 3, sw - 0.05, fa, BRICK);
    }
  }
  // the forecourt at the ramp's foot (Street View from Ông Ích Khiêm): a flat paved court before the first step,
  // wider on the side away from Ông Ích Khiêm, closed by a tall ornate iron fence (about 1.8 m: pickets with spear
  // tips, a lattice band, heavier posts) with a stone pier at its front corners carrying a lamp post
  {
    const P = (a, b, y) => { const q = at(a, b); return [q[0], y, q[1]]; };
    const a0 = -run - FORE, a1 = -run + 2.0, bL = -(RAMP_W / 2 + 0.4), bR = RAMP_W / 2 + 2.6;
    S.kind = KIND.ROAD; // the paving, a hair above the ground
    S.quad(P(a0, bL, LAND_Y + 0.05), P(a0, bR, LAND_Y + 0.05), P(-run, bR, LAND_Y + 0.05), P(-run, bL, LAND_Y + 0.05), hex('#7a7268'), [0, 1, 0]);
    S.quad(P(-run, bR, LAND_Y + 0.05), P(a0, bR, LAND_Y + 0.05), P(a0, bL, LAND_Y + 0.05), P(-run, bL, LAND_Y + 0.05), hex('#7a7268'), [0, 1, 0]);
    S.kind = KIND.PLAIN;
    const FH = 1.8;
    const fence = (pa, pb) => {
      const len = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]), L = (t, h) => P(pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, LAND_Y + h);
      for (const h of [0.12, 0.55, 1.35, FH - 0.12]) S.beam(L(0, h), L(1, h), 0.05, 0.05, IRON);
      const n = Math.max(2, Math.round(len / 0.16));
      for (let i = 0; i <= n; i++) { const t = i / n; S.beam(L(t, 0), L(t, FH), 0.025, 0.025, IRON); S.beam(L(t, FH), L(t, FH + 0.12), 0.05, 0.01, IRON); }
      const bays = Math.max(1, Math.round(len / 1.9));
      for (let j = 0; j < bays; j++) { // the post, and a lattice of crossing bars in the band between the rails
        const t0 = j / bays, t1 = (j + 1) / bays, m = 6;
        S.beam(L(t0, 0), L(t0, FH + 0.25), 0.1, 0.1, IRON);
        for (let i = 0; i < m; i++) {
          const s0 = t0 + (t1 - t0) * i / m, s1 = t0 + (t1 - t0) * (i + 1) / m;
          S.beam(L(s0, 0.55), L(s1, 1.35), 0.02, 0.02, IRON); S.beam(L(s1, 0.55), L(s0, 1.35), 0.02, 0.02, IRON);
        }
      }
      S.beam(L(1, 0), L(1, FH + 0.25), 0.1, 0.1, IRON);
    };
    fence([a0, bL], [a0, bR]); fence([a0, bL], [a1, bL]); fence([a0, bR], [a1, bR]);
    for (const b of [bL, bR]) { // the stone piers and their lamp posts
      const q = at(a0, b);
      S.kind = KIND.MASONRY;
      S.box(q[0], q[1], LAND_Y - 0.1, LAND_Y + 1.2, 0.55, 0.55, fa, shade(STONE, 0.8), { top: STONE });
      S.kind = KIND.PLAIN;
      S.cyl(q[0], q[1], LAND_Y + 1.2, LAND_Y + 3.6, 0.07, 0.05, 6, IRON);
      S.box(q[0], q[1], LAND_Y + 3.6, LAND_Y + 3.9, 0.2, 0.2, fa, hex('#e8e2cc'), { taper: 1.25 });
      S.cyl(q[0], q[1], LAND_Y + 3.9, LAND_Y + 4.05, 0.17, 0.03, 6, IRON);
    }
  }

  // ---- đình Bát Phong: octagonal, open, 8 outer columns and 4 inner, two roof tiers in green glazed tile ----
  // sized from Street View against the 8.2 m ramp (eaves about 6.2 m across, nearly as tall as wide; the satellite's
  // dark octagon, about 7 m, includes its shadow); K scales the earlier plan (outer columns on a 3.4 m radius) down to
  // that, KH the heights
  const K = 0.66, KH = 0.74;
  const yP = DECK + 0.45 * K, R0 = 3.4 * K; // its own low octagonal plinth
  const rot = fa + Math.PI / 8; // a flat side faces the ramp
  S.kind = KIND.MASONRY;
  S.cyl(C[0], C[1], DECK - 0.05, yP, 4.75 * K, 4.6 * K, 8, shade(STONE, 0.95), { rot });
  S.cyl(C[0], C[1], DECK - 0.05, DECK + 0.02, 5.2 * K, 5.2 * K, 8, shade(FLOOR, 0.9), { rot }); // a brick apron round it
  for (const b of [0]) { const q = cAt(-4.75 * K - 0.4, b); S.box(q[0], q[1], DECK - 0.05, yP - 0.15, 0.8, 2.2 * K, fa, STONE); }
  S.kind = KIND.TIMBER;
  const hOut = 2.9 * KH, hIn = 4.6 * KH;
  const oct = (r, k) => { const a = rot + k * Math.PI / 4; return [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]; };
  for (let k = 0; k < 8; k++) {
    const q = oct(R0, k);
    S.cyl(q[0], q[1], yP, yP + 0.22, 0.28, 0.24, 6, STONE, { cap: false });
    S.cyl(q[0], q[1], yP + 0.22, yP + hOut, 0.15, 0.14, 8, LAC, { cap: false });
  }
  const IN = 1.6 * K;
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
  octRoof(S, C, rot, R0 + 1.25 * K, IN * 1.25, yP + hOut, yP + hOut + 1.35 * K, 0.1 * K, ROOF, RIDGE, shade(LAC, 0.6));
  // the chồng diêm: dark boards between the tiers
  S.kind = KIND.TIMBER;
  S.box(C[0], C[1], yP + hOut + 1.05 * K, yP + hIn, IN * 2 + 0.3, IN * 2 + 0.3, fa, shade(LAC, 0.62), { top: shade(ROOF, 0.8) });
  // upper tier: a steep four-sloped pyramid with straight, nearly flat eaves (Street View, close up: about half the
  // lower tier's width, its slopes meeting at a gourd finial; the corners end in small scrolls, not long horns), so a
  // plain hip without flare, its hip ridges and corner scrolls drawn here at the pavilion's own scale
  const UW = IN * 2 + 0.3, UO = 0.35 * K, UH = 1.9 * K, yU = yP + hIn, ang = fa + Math.PI / 2;
  S.hip(C[0], C[1], UW, UW, ang, yU, UH, ROOF, { over: UO, fascia: 0.16, fasciaCol: shade(LAC, 0.6), glazed: true, ridgeCol: RIDGE });
  S.kind = KIND.PLAIN;
  const apex = [C[0], yU + UH + 0.04, C[1]];
  for (const [su, sv] of ([[1, 1], [1, -1], [-1, -1], [-1, 1]] as any[])) {
    const u = su * (UW / 2 + UO), v = sv * (UW / 2 + UO);
    const e = [C[0] + u * Math.cos(ang) - v * Math.sin(ang), yU + 0.06, C[1] + u * Math.sin(ang) + v * Math.cos(ang)];
    S.beam(e, apex, 0.12, 0.14, RIDGE);
    const dx = e[0] - C[0], dz = e[2] - C[1], l = Math.hypot(dx, dz);
    S.beam(e, [e[0] + dx / l * 0.25, e[1] + 0.2, e[2] + dz / l * 0.25], 0.1, 0.12, RIDGE);
  }
  // the gourd finial and a lightning rod
  const yR = yU + UH;
  S.cyl(C[0], C[1], yR - 0.05, yR + 0.25, 0.2, 0.12, 6, RIDGE, { rot });
  S.cyl(C[0], C[1], yR + 0.25, yR + 0.55, 0.12, 0.03, 6, RIDGE, { rot });
  S.box(C[0], C[1], yR + 0.55, yR + 1.4, 0.05, 0.05, fa, hex('#3a3a38'));

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
  // three rows from eave to top, only slightly concave (Street View: a nearly straight skirt); the corners barely lifted
  const rows = 3, cols = 2;
  const pt = (k, s, t) => { // side k, s along it (0..1), t eave -> top (0..1)
    const a = P(1, k, 0), b = P(1, k + 1, 0);
    const ux = a[0] - C[0] + (b[0] - a[0]) * s, uz = a[2] - C[1] + (b[2] - a[2]) * s; // a point on the unit octagon
    const r = r0 + (r1 - r0) * t;
    const y = y0 + (y1 - y0) * t ** 1.15 + lift * Math.abs(2 * s - 1) ** 2 * (1 - t) ** 2;
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
    S.beam(prev, [prev[0] + dx / l * 0.35, prev[1] + 0.12, prev[2] + dz / l * 0.35], 0.16, 0.18, ridgeCol); // a short, low horn: the real eaves are nearly flat
  }
  // the top ring where the skirt meets the chồng diêm
  for (let k = 0; k < 8; k++) { const a = pt(k, 0, 1), b = pt(k + 1, 0, 1); S.beam([a[0], a[1] + 0.08, a[2]], [b[0], b[1] + 0.08, b[2]], 0.18, 0.18, ridgeCol); }
  S.kind = keep;
}
