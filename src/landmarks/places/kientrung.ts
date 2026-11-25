import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { cannon, vac } from '../props.ts';

// Điện Kiến Trung, the last palace of the Forbidden Purple City (Tử Cấm Thành), at the north end of the Imperial
// City's axis behind Khôn Thái. Built 1921-23 under Khải Định, destroyed 1947 (only the base and its balustrade were
// left), rebuilt 2019-23 and opened to visitors in 2024. Sources and estimates: docs/places/kientrung.md.
//
// Confirmed: two storeys about 14 m high; a long south front of 13 openings on each floor (a projecting middle
// avant-corps of 5, recessed wings of 3, and a projecting end bay at each corner carrying a large door, a large window
// and an Asian-style gable); yellow glazed roof tiles with slightly raised edges and a Vietnamese-style parapet; the
// front faced in multicoloured porcelain mosaic (sành sứ); French balusters along the whole front; a raised terrace
// reached by three dragon-flanked stairs; a geometric (Art Deco) garden in front, with a fountain, cannons and brick
// stools in the precinct.
// OSM (hard-coded below, metres in the model frame): the hall way 285990348 (39.5 x 20.6 m, with a 21 x 3.8 m block
// out of the middle of the back), the terrace walk round it (1570130367), the stairs 695949052 (7 steps, hall to
// terrace), 619851645 (13, the middle flight), 619851643/619851644 (14 each, the end flights) and 1570130366 (14, the
// west end); the precinct lawn 619851627 and the service road 39415484 bound the forecourt.
// Estimated: storey heights, the terrace height (from the step counts, 0.15 m risers), the roof forms of the five
// blocks, the east-end stair (mapped only on the west), and the layout of the parterres, fountains and cannons in the
// narrow forecourt. Colours follow Street View, not OSM's building:colour=gold: the front reads grey-blue and white
// (relief and mosaic), yellow only in the upper band's panels and the towers' attics.
//
// Google satellite and Street View (2025-26; captures kept outside the repo, notes in docs/places/kientrung.md): the
// OSM base sits where the satellite's stairs and terrace are (the roofs lean about 6 m north in that image), and the
// axis agrees to a degree. But the four corner towers stand 38.5 m apart centre to centre, against OSM's 39.5 m hall,
// and the end flights land under the end bays' porches: the hall is drawn 44 m long (end bays 5.6 m square towers
// rising a tier above the wings, a porch before each), OSM's depth and terrace kept. Street View also shows no upper
// tier over the middle and the wing roofs hidden behind a crested parapet, red shutters in every opening, a white
// rendered terrace and grey stone dragons, and a plain lawn strip, not parterres, between the terrace and the paving;
// round-arched windows and doors; the towers' attics under small roofs with little overhang and dense crests.
// The satellite adds a paved court behind the hall's east half with garden beds, a guard kiosk at each corner of the
// precinct, and the paved square in front running out to the two octagonal pavilions (Lầu Bát Giác, OSM buildings
// 'Lầu bát giác'), which are drawn here so the city's generic boxes give way to them.
//
// Frame: u along the front (west to east), v out of the front (south-south-east), from the hall's centre C.
export const id = 'kientrung';

const C = [-1316.98, -243.15];
const ANG = Math.atan2(-0.59674, 0.80243);
const UX = Math.cos(ANG), UZ = Math.sin(ANG);
const P = (u, v): [number, number] => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];

const ROOF = PAL.imperialRoof, RIDGE = hex('#f1d77a');
// The front reads mostly grey-blue and white (the relief and the porcelain mosaic cover nearly all of it); the yellow
// render shows only in the panels of the upper band and the towers' upper faces (Street View).
const WALL = hex('#b8bdb9'); // the relief-covered wall: grey-white
const RELIEF = hex('#7f8f99'); // grey-blue relief: window surrounds, pilaster shafts, panels
const YELLOW = hex('#d6b25a'); // the yellow-rendered panels of the upper band
const TRIM = hex('#e6e2d6'); // white pilasters, cornices, balusters
const STONE = PAL.stone, GLASS = hex('#2c3438'), WOOD = hex('#7a2f22'), GOLD = hex('#d9a93a');
const SHUTTER = hex('#a3302a'); // the red-lacquered leaves in every door and window
const RENDER = hex('#e4ded0'); // the terrace's whitewashed face, the stair cheeks
const DRAGON = hex('#8b908c'); // the grey stone dragons on the stair cheeks
// porcelain mosaic: mostly grey-blue and white sherds, a few green, blue and red
const MOSAIC = [hex('#8e9ca6'), hex('#dfe3e4'), hex('#6f8594'), hex('#e9ecea'), hex('#3f6f8f'), hex('#a7b2b8'), hex('#4f8a62'), hex('#d4d9da'), hex('#b0433a'), hex('#7d8b94')];
const LAWN = hex('#5f8a45'), SHRUB = hex('#7ea456'), PAVING = hex('#9a6a5a'), BRONZE = hex('#4a4a3c');
const LACQUER = hex('#5a2a22'), KIOSK = hex('#d9b354');
const SQUARE = hex('#a89c8a'), GREY = hex('#8e8d86'); // the paved square's grey-beige slabs; the pavilions' grey stone

const tile = (k) => MOSAIC[((k % MOSAIC.length) + MOSAIC.length) % MOSAIC.length];
const gy = (u, v) => { const p = P(u, v); return LAND_Y + rise(p[0], p[1]); };
function fbox(S, u, v, y0, y1, su, sv, col, opts?) { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ANG, col, opts); }
function fcyl(S, u, v, y0, y1, r0, r1, n, col, opts?) { const p = P(u, v); S.cyl(p[0], p[1], y0, y1, r0, r1, n, col, { rot: ANG, ...opts }); }

// a run of French balusters with a rail and plinth between two world points a, b ([x, z]), standing on y
function rail(S, a0, b0, y, h = 0.9, col = TRIM) {
  const len = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]), a = Math.atan2(b0[1] - a0[1], b0[0] - a0[0]);
  const n = Math.max(2, Math.round(len / 0.45));
  const at = (t): [number, number] => [a0[0] + (b0[0] - a0[0]) * t, a0[1] + (b0[1] - a0[1]) * t];
  const m = at(0.5);
  S.kind = KIND.MASONRY;
  S.box(m[0], m[1], y, y + 0.14, len, 0.32, a, col);
  S.box(m[0], m[1], y + h - 0.12, y + h, len + 0.1, 0.3, a, col);
  S.kind = KIND.PLAIN;
  for (let i = 0; i <= n; i++) {
    const q = at(i / n);
    if (i % 8 === 0) { S.box(q[0], q[1], y, y + h - 0.12, 0.34, 0.34, a, col); continue; } // a pier every few balusters
    S.cyl(q[0], q[1], y + 0.14, y + h * 0.48, 0.06, 0.12, 5, col, { cap: false, rot: a });
    S.cyl(q[0], q[1], y + h * 0.48, y + h - 0.12, 0.12, 0.06, 5, col, { cap: false, rot: a });
  }
}
// the same from (u0, v0) to (u1, v1) in the hall's frame
const balustrade = (S, u0, v0, u1, v1, y, h = 0.9) => rail(S, P(u0, v0), P(u1, v1), y, h);

// a dragon (rồng) in grey stone lying along a stair cheek from its tail at the top a to its head reared at the foot b
// (points [x, y, z] on the cheek's coping): the body rises and dips in three coils, a crest of fins along it
function dragon(S, a, b) {
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  const N = 9, pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, lift = 0.22 + 0.2 * Math.abs(Math.sin(t * Math.PI * 3));
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + lift, a[2] + (b[2] - a[2]) * t]);
  }
  for (let i = 0; i < N; i++) S.beam(pts[i], pts[i + 1], 0.24, 0.26, DRAGON);
  for (let i = 1; i < N; i += 2) S.cyl(pts[i][0], pts[i][2], pts[i][1] + 0.1, pts[i][1] + 0.3, 0.1, 0.02, 4, shade(DRAGON, 0.85)); // fins
  // the head over the foot: a block of a skull raised on the neck, the snout thrust forward and down the slope
  const d = [b[0] - a[0], b[2] - a[2]], dl = Math.hypot(d[0], d[1]), f = [d[0] / dl, d[1] / dl];
  const hb = [b[0], b[1] + 0.95, b[2]];
  S.beam(pts[N], hb, 0.3, 0.34, DRAGON);
  S.box(hb[0], hb[2], hb[1] - 0.2, hb[1] + 0.3, 0.55, 0.42, Math.atan2(f[1], f[0]), DRAGON);
  S.beam([hb[0], hb[1], hb[2]], [hb[0] + f[0] * 0.6, hb[1] - 0.12, hb[2] + f[1] * 0.6], 0.26, 0.22, shade(DRAGON, 0.92));
  for (const s of [-1, 1]) S.beam([hb[0], hb[1] + 0.25, hb[2]], [hb[0] - f[0] * 0.35 - f[1] * s * 0.18, hb[1] + 0.6, hb[2] - f[1] * 0.35 + f[0] * s * 0.18], 0.07, 0.07, shade(DRAGON, 0.8)); // horns
  S.kind = keep;
}

// a straight flight of steps climbing from the ground at v = va to the top y1 at v = vb (along v), width w at u
function flight(S, u, va, vb, y0, y1, n, w, dragons) {
  const run = (vb - va) / n, rise1 = (y1 - y0) / n;
  S.kind = KIND.MASONRY;
  for (let k = 0; k < n; k++) fbox(S, u, va + run * (k + 0.5), y0 - 0.2, y0 + rise1 * (k + 1), w, Math.abs(run), shade(STONE, 1.06), { topKind: KIND.ROAD });
  // the cheek walls, white-rendered, each carrying a grey stone dragon whose body runs down the slope, its head reared
  // over a newel block at the foot
  for (const s of [-1, 1]) {
    const cu = u + s * (w / 2 + 0.25);
    S.kind = KIND.PLAIN;
    const a = P(cu, vb), b = P(cu, va);
    S.beam([a[0], y1 + 0.35, a[1]], [b[0], y0 + 0.35, b[1]], 0.5, 0.7, RENDER);
    if (!dragons) continue;
    const hb = P(cu, va + Math.sign(va - vb) * -0.2);
    S.box(hb[0], hb[1], y0, y0 + 0.95, 0.6, 0.8, ANG, RENDER);
    S.box(hb[0], hb[1], y0 + 0.95, y0 + 1.05, 0.7, 0.9, ANG, shade(RENDER, 0.92));
    dragon(S, [a[0], y1 + 0.7, a[1]], [hb[0], y0 + 1.05, hb[1]]);
  }
}

// the same, climbing along u (the end stairs)
function flightU(S, v, ua, ub, y0, y1, n, w) {
  const run = (ub - ua) / n, rise1 = (y1 - y0) / n;
  S.kind = KIND.MASONRY;
  for (let k = 0; k < n; k++) fbox(S, ua + run * (k + 0.5), v, y0 - 0.2, y0 + rise1 * (k + 1), Math.abs(run), w, shade(STONE, 1.06), { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) {
    const a = P(ub, v + s * (w / 2 + 0.25)), b = P(ua, v + s * (w / 2 + 0.25));
    S.beam([a[0], y1 + 0.35, a[1]], [b[0], y0 + 0.35, b[1]], 0.5, 0.7, RENDER);
  }
}

// a round head over an opening: a half disc of radius r standing on y, built of thin horizontal slabs
function roundHead(S, u, v, y, r, col, n = 7, dv = 0.08) {
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    fbox(S, u, v, y + (r * k) / n, y + (r * (k + 1)) / n, 2 * r * Math.sqrt(1 - t * t), dv, col);
  }
}

// a mosaic strip: alternating coloured tiles in a band (u0..u1 at face v) between y0 and y1
function mosaic(S, u0, u1, v, y0, y1, k0 = 0) {
  const n = Math.max(1, Math.round((u1 - u0) / 0.7));
  const w = (u1 - u0) / n;
  for (let i = 0; i < n; i++) fbox(S, u0 + w * (i + 0.5), v, y0, y1, w * 0.86, 0.06, tile(i + k0));
}

function hall(S, lamps) {
  const g = gy(0, 0), yt = g + 2.0, fl = yt + 0.9; // terrace top, hall floor
  const y1 = fl + 4.4, y2 = y1 + 0.5, y3 = y2 + 3.6; // ground storey, entablature, upper storey (to the cornice)
  S.base = g - LAND_Y;

  // ---- terrace: the surviving 1920s base, rendered white, with the rear block and the landing before the middle flight
  S.kind = KIND.PLAIN; // a whitewashed render, not coursed stone (Street View)
  fbox(S, 0, 0, g - 0.4, yt, 47.5, 28.5, RENDER, { topKind: KIND.ROAD, taper: 0.995 });
  fbox(S, 0.5, -16.1, g - 0.4, yt, 29.2, 3.9, RENDER, { topKind: KIND.ROAD });
  fbox(S, 0, 16.0, g - 0.4, yt, 9.0, 3.4, RENDER, { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  fbox(S, 0, 0, yt - 0.02, yt + 0.03, 46.5, 27.5, hex('#c9b48e')); // the paving of the walk
  // a band of darker stone along the foot, and ivory coping under the balustrade
  fbox(S, 0, 14.26, g - 0.2, g + 0.5, 47.6, 0.1, shade(STONE, 0.75));
  // the balustrade round the terrace, broken by the stairs
  const fr = 14.1;
  for (const [a, b] of ([[-23.6, -21.8], [-18.0, -4.6], [4.6, 18.0], [21.8, 23.6]] as any[])) balustrade(S, a, fr, b, fr, yt);
  for (const [a, b] of ([[-4.4, -2.6], [2.6, 4.4]] as any[])) balustrade(S, a, 17.55, b, 17.55, yt);
  for (const s of [-1, 1]) {
    balustrade(S, s * 4.4, 14.3, s * 4.4, 15.6, yt);
    balustrade(S, s * 23.6, fr, s * 23.6, 2.0, yt);
    balustrade(S, s * 23.6, -1.2, s * 23.6, -14.0, yt);
  }
  balustrade(S, -23.6, -14.0, -14.3, -14.0, yt);
  balustrade(S, 14.9, -14.0, 23.6, -14.0, yt);
  balustrade(S, -14.0, -17.9, 15.0, -17.9, yt);
  balustrade(S, -14.0, -14.0, -14.0, -17.9, yt);
  balustrade(S, 15.0, -14.0, 15.0, -17.9, yt);

  // ---- stairs: the middle flight (13 steps) from the landing, the two end flights (14), one at each end (14)
  flight(S, 0, 21.5, 17.7, g, yt, 13, 4.4, true);
  for (const s of [-1, 1]) flight(S, s * 19.9, 21.5, 14.3, g, yt, 14, 3.4, true);
  flightU(S, 0.4, -33.0, -23.75, g, yt, 14, 2.8);
  flightU(S, 0.4, 33.0, 23.75, g, yt, 14, 2.8);
  // the seven steps from the walk up to the hall's porch in front of the middle avant-corps
  S.kind = KIND.MASONRY;
  for (let k = 0; k < 7; k++) fbox(S, 0, 14.15 - 0.3 * k, yt - 0.05, yt + (0.9 / 7) * (k + 1), 7.4, 0.32, shade(STONE, 1.06), { topKind: KIND.ROAD });
  fbox(S, 0, 0.65, yt - 0.05, fl, 45.0, 23.3, shade(STONE, 0.98), { topKind: KIND.ROAD }); // the hall's own plinth and porch
  fbox(S, 0.6, -12.4, yt - 0.05, fl, 22.0, 4.4, shade(STONE, 0.98), { topKind: KIND.ROAD });

  // ---- the hall: blocks along the front (u0, u1, front v), back at v = -10.3, and the rear block; the hall's ends at
  // u = ±E (OSM: ±19.75; the satellite's corner towers put them at about ±22), the end bays from ±E0
  const E = 22.0, E0 = 16.4, EM = (E + E0) / 2;
  const blocks = [
    { u0: -E, u1: -E0, v: 10.3, end: true },
    { u0: -E0, u1: -6.5, v: 9.5 },
    { u0: -6.5, u1: 6.5, v: 10.7, mid: true },
    { u0: 6.5, u1: E0, v: 9.5 },
    { u0: E0, u1: E, v: 10.3, end: true },
  ];
  S.kind = KIND.PLAIN;
  for (const b of blocks) {
    const um = (b.u0 + b.u1) / 2, w = b.u1 - b.u0, d = b.v + 10.3;
    fbox(S, um, b.v - d / 2, fl, y3, w, d, WALL, { top: shade(WALL, 0.7) });
    // the floor band and the cornice, in ivory, a little proud of the wall
    fbox(S, um, b.v - d / 2, y1, y2, w + 0.3, d + 0.3, TRIM);
    fbox(S, um, b.v - d / 2, y3 - 0.1, y3 + 0.45, w + 0.6, d + 0.6, TRIM);
    fbox(S, um, b.v - d / 2, fl, fl + 0.6, w + 0.12, d + 0.12, shade(TRIM, 0.85)); // the socle
  }
  fbox(S, 0.6, -12.2, fl, y3, 21.2, 3.8, WALL, { top: shade(WALL, 0.7) });
  fbox(S, 0.6, -12.2, y3 - 0.1, y3 + 0.45, 21.8, 4.4, TRIM);
  fbox(S, 0.6, -12.2, y1, y2, 21.5, 4.1, TRIM);

  // ---- the front: 13 openings on each floor, pilasters between them faced in mosaic
  const bays = []; // [u, front v, width, end?]
  for (const b of blocks) {
    const n = b.end ? 1 : b.mid ? 5 : 3, w = (b.u1 - b.u0) / n;
    for (let i = 0; i < n; i++) bays.push([b.u0 + w * (i + 0.5), b.v, w, !!b.end, !!b.mid]);
  }
  for (const [u, v, w, end, mid] of bays) {
    const ow = end ? 2.3 : Math.min(1.5, w * 0.55), f = v + 0.04;
    // ground storey: a tall round-arched door, red leaves in a lacquered frame, a grey-blue relief surround
    S.kind = KIND.PLAIN;
    const dr = (ow - 0.4) / 2, dy = y1 - 1.05 - dr; // the leaves' springing line
    fbox(S, u, f - 0.01, fl + 0.6, dy, ow + 0.4, 0.08, RELIEF);
    roundHead(S, u, f - 0.01, dy, dr + 0.4, RELIEF, 7, 0.08);
    fbox(S, u, f + 0.02, fl + 0.6, dy, ow, 0.08, WOOD);
    roundHead(S, u, f + 0.02, dy, dr + 0.2, WOOD, 7, 0.08);
    fbox(S, u, f + 0.04, fl + 0.8, dy, ow - 0.4, 0.08, SHUTTER);
    roundHead(S, u, f + 0.04, dy, dr, SHUTTER, 7, 0.08);
    fcyl(S, u, f + 0.03, dy + dr + 0.42, dy + dr + 0.57, ow / 2 * 0.4, ow / 2 * 0.16, 6, GOLD); // a gilt boss over the arch
    // porcelain mosaic in the dado either side of the door
    const side = (w - ow - 0.4) / 2 - 0.35;
    if (side > 0.3) for (const sd of [-1, 1]) {
      const c0 = u + sd * (ow / 2 + 0.35 + side / 2);
      mosaic(S, c0 - side / 2, c0 + side / 2, f + 0.02, fl + 0.8, fl + 1.5, Math.round(u * 7) + sd);
      mosaic(S, c0 - side / 2, c0 + side / 2, f + 0.02, fl + 2.1, y1 - 1.2, Math.round(u * 11) + sd + 3);
    }
    // upper storey: a yellow-rendered panel in the bay, a round-arched window in a white frame, grey-blue relief jambs
    const wr = (ow - 0.1) / 2, wy0 = y2 + 0.75, wy1 = y3 - 0.35 - wr - 0.18;
    fbox(S, u, v + 0.02, y2 + 0.15, y3 - 0.15, w - 0.55, 0.06, YELLOW);
    fbox(S, u, f, wy0 - 0.15, wy1, ow + 0.35, 0.1, TRIM);
    roundHead(S, u, f, wy1, wr + 0.18, TRIM, 7, 0.1);
    fbox(S, u, f + 0.03, wy0, wy1, ow - 0.1, 0.08, SHUTTER);
    roundHead(S, u, f + 0.03, wy1, wr, SHUTTER, 7, 0.08);
    fbox(S, u - ow / 2 - 0.12, f + 0.03, wy0 - 0.15, wy1 + 0.1, 0.22, 0.1, RELIEF); // grey-blue carved jambs
    fbox(S, u + ow / 2 + 0.12, f + 0.03, wy0 - 0.15, wy1 + 0.1, 0.22, 0.1, RELIEF);
    fcyl(S, u, f + 0.06, wy1 + wr + 0.1, wy1 + wr + 0.3, 0.16, 0.08, 6, RELIEF); // the keystone boss
    // mosaic panels: under each upper window and in the frieze over each door
    mosaic(S, u - ow / 2, u + ow / 2, f + 0.06, wy0 - 0.55, wy0 - 0.22, Math.round(u * 3));
    mosaic(S, u - w / 2 + 0.25, u + w / 2 - 0.25, f + 0.12, y1 + 0.15, y2 - 0.15, Math.round(u * 5) + 1);
    if (mid) { // a balcony before each window of the avant-corps
      balustrade(S, u - w / 2 + 0.1, v + 0.55, u + w / 2 - 0.1, v + 0.55, y2 - 0.05, 0.75);
      S.kind = KIND.MASONRY;
      fbox(S, u, v + 0.35, y2 - 0.2, y2, w, 0.8, TRIM);
    }
    { const q = P(u, v + (end ? 3.0 : 0.9)); lamps.push([q[0], y1 - 0.2, q[1]]); }
  }
  // pilasters at the block corners and between the bays, their shafts set with coloured tiles
  S.kind = KIND.PLAIN;
  const edges = new Set();
  for (const b of blocks) { edges.add(b.u0.toFixed(2)); edges.add(b.u1.toFixed(2)); }
  for (const [u, v, w] of bays) for (const s of [-1, 1]) edges.add((u + s * w / 2).toFixed(2));
  for (const e of edges) {
    const u = +e;
    const v = Math.max(...blocks.filter((b) => u >= b.u0 - 0.01 && u <= b.u1 + 0.01).map((b) => b.v));
    fbox(S, u, v + 0.08, fl + 0.6, y3 - 0.1, 0.5, 0.18, TRIM);
    fbox(S, u, v + 0.14, fl + 0.7, y3 - 0.3, 0.34, 0.1, RELIEF); // the grey-blue mosaic shaft
    for (let k = 0; k < 4; k++) fbox(S, u, v + 0.18, fl + 1.2 + k * 2.2, fl + 2.0 + k * 2.2, 0.28, 0.06, tile(k + Math.round(u)));
  }
  // the name board over the middle door
  S.kind = KIND.PLAIN;
  fbox(S, 0, 10.9, y2 + 0.2, y2 + 0.85, 3.0, 0.1, shade(WOOD, 0.8));
  fbox(S, 0, 10.96, y2 + 0.3, y2 + 0.75, 2.6, 0.06, GOLD);
  // the back and the ends: plain windows in two rows
  for (let i = -7; i <= 7; i++) {
    const u = i * 2.9;
    if (Math.abs(u) < 11 || Math.abs(u) > E - 0.8) continue;
    for (const [a, b] of ([[fl + 1.4, y1 - 1.0], [y2 + 0.9, y3 - 1.0]] as any[])) fbox(S, u, -10.34, a, b, 1.2, 0.08, GLASS);
  }
  for (let i = -3; i <= 3; i++) for (const [a, b] of ([[fl + 1.4, y1 - 1.0], [y2 + 0.9, y3 - 1.0]] as any[])) fbox(S, i * 2.9 + 0.6, -14.14, a, b, 1.2, 0.08, GLASS);
  for (const s of [-1, 1]) for (const vv of [-7.5, -3, 3, 7.5]) for (const [a, b] of ([[fl + 1.4, y1 - 1.0], [y2 + 0.9, y3 - 1.0]] as any[])) fbox(S, s * (E + 0.04), vv, a, b, 0.08, 1.2, SHUTTER);

  // ---- the porches before the end bays: four columns carrying a balcony at the upper floor, at the head of the end
  // flights (Street View: the visitors' entrance is the east one)
  for (const sg of [-1, 1]) {
    const pu = sg * EM, pv0 = 10.3, pv1 = 12.6, pw = 4.6;
    S.kind = KIND.PLAIN;
    for (const du of [-pw / 2 + 0.3, -0.75, 0.75, pw / 2 - 0.3]) {
      fbox(S, pu + du, pv1 - 0.3, fl, fl + 0.5, 0.6, 0.6, TRIM);
      fbox(S, pu + du, pv1 - 0.3, fl + 0.5, y1 - 0.3, 0.42, 0.42, shade(TRIM, 0.95));
      for (let k = 0; k < 3; k++) fbox(S, pu + du, pv1 - 0.08, fl + 1.2 + k * 1.0, fl + 1.6 + k * 1.0, 0.24, 0.06, tile(k + 3));
    }
    for (const dv of [pv0 + 0.3]) for (const s2 of [-1, 1]) fbox(S, pu + s2 * (pw / 2 - 0.3), dv, fl + 0.5, y1 - 0.3, 0.42, 0.42, shade(TRIM, 0.95));
    S.kind = KIND.MASONRY;
    fbox(S, pu, (pv0 + pv1) / 2, y1 - 0.3, y1 + 0.25, pw + 0.3, pv1 - pv0 + 0.2, TRIM);
    mosaic(S, pu - pw / 2, pu + pw / 2, pv1 + 0.12, y1 - 0.25, y1 + 0.2, sg > 0 ? 2 : 4);
    balustrade(S, pu - pw / 2, pv1 - 0.1, pu + pw / 2, pv1 - 0.1, y1 + 0.25, 0.8);
    for (const s2 of [-1, 1]) balustrade(S, pu + s2 * pw / 2, pv1 - 0.1, pu + s2 * pw / 2, pv0 + 0.2, y1 + 0.25, 0.8);
  }

  // ---- roofs: yellow glazed tiles. Over the wings and the middle a long low hip (the satellite's one ridge), its
  // eaves hidden behind a crested parapet; the four corner towers of the end bays rise a tier above it, each with a
  // recessed attic and a low pyramid roof (the satellite's four small hips), crests on top.
  const eave = { fascia: 0.2, fasciaCol: TRIM, hips: true, glazed: true, ridgeCol: RIDGE, segs: 2, horns: false };
  const yr = y3 + 0.45;
  const body = P(0, -0.4);
  S.hip(body[0], body[1], 2 * E0 + 2.0, 19.8, ANG, yr, 2.4, ROOF, { flare: 0.1, over: 0.15, ...eave });
  const rb = P(0.6, -12.2);
  S.hip(rb[0], rb[1], 21.2, 3.8, ANG, yr, 1.2, ROOF, { flare: 0.1, over: 0.15, ...eave });
  // the parapet along the front and the back of the wings and the middle: a solid band with tiles and a cresting of
  // small finials, about 1.2 m over the cornice
  const crest = (u0, v0, u1, v1, y, h, k0) => {
    const len = Math.hypot(u1 - u0, v1 - v0), a = ANG + Math.atan2(v1 - v0, u1 - u0), m = P((u0 + u1) / 2, (v0 + v1) / 2);
    S.kind = KIND.MASONRY;
    S.box(m[0], m[1], y, y + h * 0.55, len, 0.35, a, TRIM);
    S.kind = KIND.PLAIN;
    const n = Math.max(1, Math.round(len / 1.1));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, q = P(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t);
      S.box(q[0], q[1], y + h * 0.15, y + h * 0.42, 0.6, 0.38, a, tile(i + k0));
      S.cyl(q[0], q[1], y + h * 0.55, y + h, 0.16, 0.04, 4, i % 2 ? shade(TRIM, 0.85) : tile(i + k0 + 2), { rot: a });
    }
  };
  for (const b of blocks.filter((x) => !x.end)) crest(b.u0, b.v + 0.1, b.u1, b.v + 0.1, yr, 1.2, Math.round(b.u0));
  crest(-E0, -10.2, E0, -10.2, yr, 1.2, 1);
  // a raised crest over the middle of the front: a tiled panel with a flaming pearl (hỏa châu) between two dragons
  S.kind = KIND.MASONRY;
  fbox(S, 0, 10.6, yr + 0.6, yr + 1.9, 4.4, 0.4, TRIM);
  mosaic(S, -2.0, 2.0, 10.84, yr + 0.85, yr + 1.6, 1);
  S.kind = KIND.PLAIN;
  { const pc = P(0, 10.6); S.cyl(pc[0], pc[1], yr + 1.9, yr + 2.6, 0.32, 0.1, 8, GOLD); }
  for (const s of [-1, 1]) {
    const a = P(s * 0.5, 10.6), b = P(s * 2.0, 10.6);
    S.beam([a[0], yr + 2.25, a[1]], [b[0], yr + 1.95, b[1]], 0.16, 0.26, MOSAIC[3]);
  }
  // the corner towers: the end bay's walls carried 1.3 m over the cornice at the front and the back, an attic set in
  // 0.5 m with yellow-rendered faces under a dense crest frieze, and a small low roof with little overhang and no
  // upturned corners, a dragon crest along its ridge (Street View)
  const yt1 = yr + 1.3, yt2 = yt1 + 2.2;
  for (const s of [-1, 1]) for (const tv of [7.45, -7.45]) {
    const tu = s * EM, tw = E - E0, td = 5.7, aw = tw - 1.0, ad = td - 1.0;
    S.kind = KIND.PLAIN;
    fbox(S, tu, tv, y3 - 0.1, yt1, tw, td, WALL, { top: shade(WALL, 0.7) });
    fbox(S, tu, tv, yt1 - 0.1, yt1 + 0.3, tw + 0.5, td + 0.5, TRIM);
    fbox(S, tu, tv, yt1 + 0.3, yt2, aw, ad, YELLOW, { top: shade(YELLOW, 0.7) });
    fbox(S, tu, tv, yt2 - 0.1, yt2 + 0.3, tw - 0.4, td - 0.4, TRIM);
    // the tower's face toward the front or back: a round window in a grey-blue relief frame on the attic
    const fv = tv + Math.sign(tv) * (ad / 2 + 0.03);
    fbox(S, tu, fv, yt1 + 0.6, yt2 - 0.4, 2.2, 0.08, RELIEF);
    fcyl(S, tu, fv + Math.sign(tv) * 0.05, yt1 + 0.9, yt2 - 0.7, 0.45, 0.45, 8, SHUTTER);
    // the crest frieze on the attic cornice: close-set tiled blocks and finials all round
    for (const [du0, dv0, du1, dv1] of ([[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]] as any[])) {
      const hu = (tw - 0.5) / 2, hv = (td - 0.5) / 2, len = Math.hypot((du1 - du0) * hu, (dv1 - dv0) * hv);
      const n = Math.round(len / 0.5);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, q = P(tu + (du0 + (du1 - du0) * t) * hu, tv + (dv0 + (dv1 - dv0) * t) * hv);
        S.box(q[0], q[1], yt2 + 0.3, yt2 + 0.55, 0.36, 0.36, ANG, tile(i + s));
        S.cyl(q[0], q[1], yt2 + 0.55, yt2 + 0.85, 0.1, 0.03, 4, i % 2 ? GOLD : shade(TRIM, 0.85), { rot: ANG });
      }
    }
    const tp = P(tu, tv);
    S.hip(tp[0], tp[1], tw - 0.9, td - 0.9, ANG, yt2 + 0.45, 0.95, ROOF, { flare: 0, over: 0.08, ...eave });
    // the ridge crest: a dragon either side of a pearl on a short tiled ridge
    S.kind = KIND.PLAIN;
    const ry = yt2 + 1.4;
    for (const sd of [-1, 1]) {
      const r0 = P(tu, tv + sd * 0.15), r1 = P(tu, tv + sd * 0.95);
      S.beam([r0[0], ry + 0.35, r0[1]], [r1[0], ry + 0.15, r1[1]], 0.12, 0.22, MOSAIC[6]);
      S.beam([r1[0], ry + 0.15, r1[1]], [r1[0], ry + 0.5, r1[1]], 0.1, 0.1, MOSAIC[6]);
    }
    S.cyl(tp[0], tp[1], ry, ry + 0.6, 0.2, 0.06, 6, GOLD);
    // crest blocks at the corners of the lower cornice
    for (const du of [-1, 1]) for (const dv of [-1, 1]) {
      const q = P(tu + du * (tw / 2 - 0.2), tv + dv * (td / 2 - 0.2));
      S.cyl(q[0], q[1], yt1 + 0.3, yt1 + 1.0, 0.2, 0.06, 4, tile(du + dv + 3), { rot: ANG });
    }
  }
  // between the two towers of each end, a low hip over the end bay's middle
  for (const s of [-1, 1]) {
    const e = P(s * EM, 0);
    S.hip(e[0], e[1], E - E0, 9.2, ANG, yr, 1.2, ROOF, { flare: 0.1, over: 0.15, ...eave });
  }
}

function forecourt(S) {
  // between the stairs, the terrace face and the brick paving (Street View): a plain lawn strip about 5 m deep behind
  // a stone kerb, a few small clipped shrubs, a bronze cannon on its stone carriage and plinth beside the middle
  // flight's foot
  const g = gy(0, 20);
  S.base = g - LAND_Y;
  S.kind = KIND.ROAD;
  fbox(S, 0, 22.4, g - 0.15, g + 0.04, 48, 6.2, PAVING); // the paving along the road
  // beyond the road the satellite shows the paved square running out to the two pavilions: laid a kerb's height up,
  // and marked paved so the city plants no trees on it (src/geo/city.js coverOf)
  { const n0 = S.n;
    S.kind = KIND.ROAD;
    fbox(S, 3.0, 30.45, g - 0.15, g + 0.24, 54, 8.1, SQUARE);
    (S.paved = S.paved || []).push([n0, S.n]); }
  for (const s of [-1, 1]) {
    const cu = s * 11.0, w = 12.6;
    S.kind = KIND.GROUND;
    fbox(S, cu, 16.8, g - 0.15, g + 0.06, w, 5.0, LAWN);
    S.kind = KIND.MASONRY;
    fbox(S, cu, 19.35, g - 0.1, g + 0.18, w, 0.22, shade(STONE, 1.05)); // the kerb
    S.kind = KIND.PLAIN;
    for (const du of [-4.2, 1.4, 4.6]) {
      const q = P(cu + du * s, 17.6);
      S.cyl(q[0], q[1], g + 0.05, g + 0.35, 0.34, 0.38, 6, SHRUB);
      S.cyl(q[0], q[1], g + 0.35, g + 0.65, 0.38, 0.12, 6, shade(SHRUB, 1.08));
    }
    // a bronze cannon on its stone carriage, raised on a grey plinth, either side of the middle flight's foot, the
    // muzzle to the road
    const q = P(s * 4.6, 17.4);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], g, g + 0.55, 1.3, 3.4, ANG, shade(STONE, 0.92), { topKind: KIND.ROAD });
    S.box(q[0], q[1], g + 0.55, g + 0.65, 1.45, 3.55, ANG, shade(STONE, 0.98));
    cannon(S, q[0], g + 0.65, q[1], ANG + Math.PI / 2, { len: 3.0, col: BRONZE, wood: shade(STONE, 0.85) });
  }
  // the bronze cauldron cast for the court before Kiến Trung's predecessor (vạc đồng, 1659), on the axis in front of
  // the middle flight (its place here estimated; Street View does not show it in the lawn strip)
  { const q = P(0, 24.2); vac(S, q[0], g, q[1], ANG, { d: 1.9, col: BRONZE }); }
}

// the precinct round the hall (satellite): a paved court behind the hall's east half with low garden beds in it, a
// paved apron about the west stair, and a small yellow guard kiosk at each corner of the precinct
function precinct(S) {
  const g = gy(0, -20);
  S.base = g - LAND_Y;
  S.kind = KIND.ROAD;
  { const n0 = S.n; // a low step up, marked paved so no tree is planted on the court (src/geo/city.js coverOf)
    fbox(S, 21.0, -23.2, g - 0.15, g + 0.22, 32.0, 9.6, shade(PAVING, 1.1));
    fbox(S, 30.6, -14.2, g - 0.15, g + 0.22, 12.8, 8.4, shade(PAVING, 1.1));
    (S.paved = S.paved || []).push([n0, S.n]); }
  fbox(S, -28.5, 0.4, g - 0.15, g + 0.05, 10.5, 13.0, shade(PAVING, 1.1));
  // the garden beds: low rendered kerbs round planted plots
  for (const [bu, bv, bw, bd] of ([[10.5, -23.6, 6.0, 4.6], [18.5, -23.6, 6.0, 4.6], [26.5, -23.6, 6.0, 4.6], [31.0, -14.6, 6.0, 4.0]] as any[])) {
    S.kind = KIND.MASONRY;
    fbox(S, bu, bv, g + 0.1, g + 0.45, bw, bd, RENDER);
    S.kind = KIND.GROUND;
    fbox(S, bu, bv, g + 0.3, g + 0.48, bw - 0.4, bd - 0.4, LAWN);
    S.kind = KIND.PLAIN;
    for (const du of [-1, 1]) { const q = P(bu + du * bw * 0.25, bv); S.cyl(q[0], q[1], g + 0.48, g + 0.95, 0.4, 0.15, 6, SHRUB); }
  }
  // the guard kiosks: about 2.4 m square, yellow-rendered, a door and a window, under a little glazed hip with
  // upturned corners (Street View beside the east flight; the north-west one hidden by trees, placed by symmetry)
  for (const [ku, kv] of ([[-24.0, 19.2], [24.8, 18.8], [39.0, -24.0], [-33.0, -25.0]] as any[])) {
    const kg = gy(ku, kv), out = kv > 0 ? 1 : -1;
    S.base = kg - LAND_Y;
    S.kind = KIND.MASONRY;
    fbox(S, ku, kv, kg - 0.2, kg + 0.2, 2.8, 2.8, shade(STONE, 1.02), { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    fbox(S, ku, kv, kg + 0.2, kg + 2.6, 2.3, 2.3, KIOSK, { top: shade(KIOSK, 0.7) });
    fbox(S, ku, kv, kg + 2.45, kg + 2.7, 2.5, 2.5, TRIM);
    fbox(S, ku, kv + out * 1.17, kg + 0.25, kg + 2.0, 0.8, 0.06, LACQUER);
    for (const sd of [-1, 1]) fbox(S, ku + sd * 1.17, kv, kg + 1.1, kg + 1.9, 0.06, 0.7, SHUTTER);
    const kp = P(ku, kv);
    S.hip(kp[0], kp[1], 2.5, 2.5, ANG, kg + 2.7, 1.1, ROOF, { flare: 0.25, over: 0.4, fascia: 0.12, fasciaCol: TRIM, hips: true, glazed: true, ridgeCol: RIDGE, segs: 2 });
    S.cyl(kp[0], kp[1], kg + 3.75, kg + 4.15, 0.14, 0.04, 6, GOLD);
  }
}

// a cone roof over an n-sided plan in two slopes (steep above, flatter at the eaves), ridges and upturned tips at the
// corners (the pattern of dieude.js's polyRoof)
function polyRoof(S, c, n, rot, y, r0, h, r1) {
  const keep = S.kind;
  S.kind = KIND.TILE;
  const rm = r1 + (r0 - r1) * 0.42, ym = y + h * 0.62;
  S.cyl(c[0], c[1], y - 0.1, ym, r0, rm, n, ROOF, { rot, cap: false });
  S.cyl(c[0], c[1], ym, y + h, rm, r1, n, ROOF, { rot, cap: r1 > 0.06 });
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], y - 0.3, y - 0.1, r0 - 0.05, r0, n, RIDGE, { rot, cap: false }); // fascia
  for (let i = 0; i < n; i++) {
    const t = rot + (i / n) * Math.PI * 2, d = [Math.cos(t), Math.sin(t)];
    const pe = [c[0] + d[0] * r0, y, c[1] + d[1] * r0], pm = [c[0] + d[0] * rm, ym + 0.05, c[1] + d[1] * rm], pt = [c[0] + d[0] * r1, y + h + 0.05, c[1] + d[1] * r1];
    S.beam(pe, pm, 0.16, 0.16, RIDGE);
    S.beam(pm, pt, 0.14, 0.14, RIDGE);
    S.beam(pe, [pe[0] + d[0] * 0.3, y + 0.38, pe[2] + d[1] * 0.3], 0.14, 0.12, RIDGE); // the upturned tip
    S.box(pm[0], pm[2], pm[1] + 0.05, pm[1] + 0.35, 0.18, 0.18, t, MOSAIC[6]); // a dragon crest on the ridge
  }
  S.kind = keep;
}

// Lầu Bát Giác: an open octagonal pavilion (OSM ways 1753/1754 in the city data, about 11 m across) on a grey stone
// base about 1.4 m high with a balustrade, eight dark lacquered columns and a two-tier roof of yellow glazed tiles with
// dragon crests; a stair with curving balustraded cheeks climbs to it from the side toward the hall, where the
// satellite's white apron and the mapped path meet the base (Street View)
function pavilion(S, c, lamps) {
  const g = LAND_Y + Math.max(...[[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]].map(([dx, dz]) => rise(c[0] + dx, c[1] + dz)));
  const yb = g + 1.4, R = 4.9, n = 8;
  const toward = Math.atan2(-UX, UZ); // the direction -v in the world (toward the hall)
  const rot = toward + Math.PI / n; // a flat side faces the hall
  const d = [Math.cos(toward), Math.sin(toward)], pp = [-d[1], d[0]];
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(c[0], c[1], g - 0.3, yb - 0.15, R, R - 0.05, n, GREY, { rot, cap: false });
  S.cyl(c[0], c[1], yb - 0.15, yb, R + 0.12, R + 0.12, n, shade(GREY, 1.12), { rot });
  S.kind = KIND.PLAIN;
  // the balustrade round the edge, open at the stair
  const vtx = (i, r) => { const t = rot + (i / n) * Math.PI * 2; return [c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]; };
  const ap = R * Math.cos(Math.PI / n), sw = 2.0; // the stair's width
  for (let i = 0; i < n; i++) {
    const a = vtx(i, R - 0.2), b = vtx(i + 1, R - 0.2);
    const mid = [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1]];
    if (mid[0] * d[0] + mid[1] * d[1] > ap * 0.9) { // the side the stair climbs to: two short runs either side of it
      const m = [c[0] + d[0] * (ap - 0.2), c[1] + d[1] * (ap - 0.2)];
      for (const sd of [-1, 1]) {
        const e = [m[0] + pp[0] * sd * (sw / 2 + 0.15), m[1] + pp[1] * sd * (sw / 2 + 0.15)];
        rail(S, sd < 0 ? a : e, sd < 0 ? e : b, yb, 0.85, shade(GREY, 1.25));
      }
      continue;
    }
    rail(S, a, b, yb, 0.85, shade(GREY, 1.25));
  }
  // the stair: nine steps straight out from the flat side, its cheeks flaring outward toward the foot
  const ns = 9, run = 0.32, out0 = ap;
  S.kind = KIND.MASONRY;
  for (let k = 0; k < ns; k++) {
    const r = out0 + run * (ns - k - 0.5), q = [c[0] + d[0] * r, c[1] + d[1] * r];
    S.box(q[0], q[1], g - 0.2, g + (1.4 * (k + 1)) / ns, run, sw + 0.2 * (ns - k) / ns, toward, shade(GREY, 1.15), { topKind: KIND.ROAD });
  }
  S.kind = KIND.PLAIN;
  for (const sd of [-1, 1]) {
    const top = [c[0] + d[0] * out0 + pp[0] * sd * (sw / 2 + 0.15), c[1] + d[1] * out0 + pp[1] * sd * (sw / 2 + 0.15)];
    const mid = [c[0] + d[0] * (out0 + 1.6) + pp[0] * sd * (sw / 2 + 0.3), c[1] + d[1] * (out0 + 1.6) + pp[1] * sd * (sw / 2 + 0.3)];
    const foot = [c[0] + d[0] * (out0 + run * ns + 0.2) + pp[0] * sd * (sw / 2 + 0.8), c[1] + d[1] * (out0 + run * ns + 0.2) + pp[1] * sd * (sw / 2 + 0.8)];
    S.beam([top[0], yb + 0.3, top[1]], [mid[0], g + 0.95, mid[1]], 0.26, 0.6, GREY);
    S.beam([mid[0], g + 0.95, mid[1]], [foot[0], g + 0.4, foot[1]], 0.26, 0.6, GREY);
    S.beam([top[0], yb + 0.85, top[1]], [mid[0], g + 1.65, mid[1]], 0.24, 0.12, shade(GREY, 1.15)); // the rail
    S.beam([mid[0], g + 1.65, mid[1]], [foot[0], g + 1.05, foot[1]], 0.24, 0.12, shade(GREY, 1.15));
    S.box(foot[0], foot[1], g, g + 1.2, 0.5, 0.5, toward, shade(GREY, 0.95)); // the newel at the foot
  }
  // eight columns, a lintel ring, and the two-tier roof with a crest on top
  const Rc = 3.2, yc = yb + 3.1;
  S.kind = KIND.TIMBER;
  for (let i = 0; i < n; i++) { const q = vtx(i, Rc); S.cyl(q[0], q[1], yb, yc, 0.17, 0.15, 6, LACQUER, { cap: false }); }
  S.kind = KIND.PLAIN;
  for (let i = 0; i < n; i++) { const a = vtx(i, Rc), b = vtx(i + 1, Rc); S.beam([a[0], yc - 0.1, a[1]], [b[0], yc - 0.1, b[1]], 0.18, 0.35, LACQUER); }
  polyRoof(S, c, n, rot, yc, R - 0.2, 1.5, Rc * 0.62);
  S.kind = KIND.TIMBER;
  S.cyl(c[0], c[1], yc + 1.0, yc + 1.8, Rc * 0.66, Rc * 0.66, n, shade(LACQUER, 1.3), { rot });
  polyRoof(S, c, n, rot, yc + 1.8, Rc * 0.66 + 0.9, 2.0, 0.05);
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], yc + 3.8, yc + 4.1, 0.18, 0.28, 6, TRIM);
  S.cyl(c[0], c[1], yc + 4.1, yc + 4.65, 0.28, 0.05, 6, GOLD);
  lamps.push([c[0], yb + 2.6, c[1]]);
}

export function build({ S, group }) {
  const lamps = [];
  hall(S, lamps);
  forecourt(S);
  precinct(S);
  // the two octagonal pavilions on the square in front (OSM buildings 'Lầu bát giác')
  for (const c of [[-1265.8, -232.6], [-1318.9, -193.0]]) pavilion(S, c, lamps);
  S.kind = KIND.PLAIN;
  S.base = 0;
  // night: warm light in the ground-floor doors and lamps along the terrace balustrade
  const g = gy(0, 0);
  for (const u of [-21.0, -4.4, 4.4, 21.0]) { const p = P(u, 14.1); lamps.push([p[0], g + 3.1, p[1]]); }
  if (lamps.length) {
    const pos = [], col = [];
    for (const p of lamps) { pos.push(...p); col.push(1, 0.72, 0.38); }
    const pts = glowPoints(pos, col, 4);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
}
