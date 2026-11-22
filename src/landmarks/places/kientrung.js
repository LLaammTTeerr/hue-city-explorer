import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints } from '../../geo/materials.js';
import { cannon, vac } from '../props.js';

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
// blocks, colours (walls golden yellow after OSM building:colour=gold and photographs, ivory trim), the east-end stair
// (mapped only on the west), and the layout of the parterres, fountains and cannons in the narrow forecourt.
//
// Google satellite and Street View (2025-26; captures kept outside the repo, notes in docs/places/kientrung.md): the
// OSM base sits where the satellite's stairs and terrace are (the roofs lean about 6 m north in that image), and the
// axis agrees to a degree. But the four corner towers stand 38.5 m apart centre to centre, against OSM's 39.5 m hall,
// and the end flights land under the end bays' porches: the hall is drawn 44 m long (end bays 5.6 m square towers
// rising a tier above the wings, a porch before each), OSM's depth and terrace kept. Street View also shows no upper
// tier over the middle and the wing roofs hidden behind a crested parapet, red shutters in every opening, a white
// rendered terrace and grey stone dragons, and a plain lawn strip, not parterres, between the terrace and the paving.
//
// Frame: u along the front (west to east), v out of the front (south-south-east), from the hall's centre C.
export const id = 'kientrung';

const C = [-1316.98, -243.15];
const ANG = Math.atan2(-0.59674, 0.80243);
const UX = Math.cos(ANG), UZ = Math.sin(ANG);
const P = (u, v) => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];

const ROOF = PAL.imperialRoof, RIDGE = hex('#f1d77a');
const WALL = hex('#dcb66a'); // golden yellow render
const TRIM = hex('#efe4c6'); // ivory pilasters, cornices, balusters
const STONE = PAL.stone, GLASS = hex('#2c3438'), WOOD = hex('#7a2f22'), GOLD = hex('#d9a93a');
const SHUTTER = hex('#a3302a'); // the red-lacquered leaves in every door and window
const RENDER = hex('#e4ded0'); // the terrace's whitewashed face
// porcelain mosaic: mostly grey-blue and white sherds, with green, blue and red
const MOSAIC = [hex('#8e9ca6'), hex('#3f6f8f'), hex('#dfe3e4'), hex('#4f8a62'), hex('#b0433a'), hex('#7d8b94')];
const LAWN = hex('#5f8a45'), HEDGE = hex('#365a2c'), PAVING = hex('#9a6a5a'), BRONZE = hex('#4a4a3c');

const tile = (k) => MOSAIC[((k % MOSAIC.length) + MOSAIC.length) % MOSAIC.length];
const gy = (u, v) => { const p = P(u, v); return LAND_Y + rise(p[0], p[1]); };
function fbox(S, u, v, y0, y1, su, sv, col, opts) { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ANG, col, opts); }
function fcyl(S, u, v, y0, y1, r0, r1, n, col, opts) { const p = P(u, v); S.cyl(p[0], p[1], y0, y1, r0, r1, n, col, { rot: ANG, ...opts }); }

// a run of French balusters with a rail and plinth, from (u0, v0) to (u1, v1), standing on y
function balustrade(S, u0, v0, u1, v1, y, h = 0.9) {
  const len = Math.hypot(u1 - u0, v1 - v0), a = ANG + Math.atan2(v1 - v0, u1 - u0);
  const n = Math.max(2, Math.round(len / 0.45));
  const at = (t) => P(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t);
  const m = at(0.5);
  S.kind = KIND.MASONRY;
  S.box(m[0], m[1], y, y + 0.14, len, 0.32, a, TRIM);
  S.box(m[0], m[1], y + h - 0.12, y + h, len + 0.1, 0.3, a, TRIM);
  S.kind = KIND.PLAIN;
  for (let i = 0; i <= n; i++) {
    const q = at(i / n);
    if (i % 8 === 0) { S.box(q[0], q[1], y, y + h - 0.12, 0.34, 0.34, a, TRIM); continue; } // a pier every few balusters
    S.cyl(q[0], q[1], y + 0.14, y + h * 0.48, 0.06, 0.12, 5, TRIM, { cap: false, rot: a });
    S.cyl(q[0], q[1], y + h * 0.48, y + h - 0.12, 0.12, 0.06, 5, TRIM, { cap: false, rot: a });
  }
}

// a straight flight of steps climbing from the ground at v = va to the top y1 at v = vb (along v), width w at u
function flight(S, u, va, vb, y0, y1, n, w, dragons) {
  const run = (vb - va) / n, rise1 = (y1 - y0) / n;
  S.kind = KIND.MASONRY;
  for (let k = 0; k < n; k++) fbox(S, u, va + run * (k + 0.5), y0 - 0.2, y0 + rise1 * (k + 1), w, Math.abs(run), shade(STONE, 1.06), { topKind: KIND.ROAD });
  // the cheek walls, each carrying a dragon (rồng) whose body runs down the slope, its head reared at the foot
  for (const s of [-1, 1]) {
    const cu = u + s * (w / 2 + 0.25);
    S.kind = KIND.MASONRY;
    const a = P(cu, vb), b = P(cu, va);
    S.beam([a[0], y1 + 0.35, a[1]], [b[0], y0 + 0.35, b[1]], 0.5, 0.7, STONE);
    if (!dragons) continue;
    S.kind = KIND.PLAIN;
    S.beam([a[0], y1 + 0.75, a[1]], [b[0], y0 + 0.75, b[1]], 0.26, 0.22, shade(STONE, 0.85));
    const hb = P(cu, va + Math.sign(va - vb) * -0.2);
    S.box(hb[0], hb[1], y0, y0 + 1.25, 0.55, 0.8, ANG, STONE);
    S.box(hb[0], hb[1], y0 + 1.25, y0 + 1.7, 0.42, 0.7, ANG, shade(STONE, 0.85));
  }
}

// the same, climbing along u (the end stairs)
function flightU(S, v, ua, ub, y0, y1, n, w) {
  const run = (ub - ua) / n, rise1 = (y1 - y0) / n;
  S.kind = KIND.MASONRY;
  for (let k = 0; k < n; k++) fbox(S, ua + run * (k + 0.5), v, y0 - 0.2, y0 + rise1 * (k + 1), Math.abs(run), w, shade(STONE, 1.06), { topKind: KIND.ROAD });
  for (const s of [-1, 1]) {
    const a = P(ub, v + s * (w / 2 + 0.25)), b = P(ua, v + s * (w / 2 + 0.25));
    S.beam([a[0], y1 + 0.35, a[1]], [b[0], y0 + 0.35, b[1]], 0.5, 0.7, STONE);
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
  for (const [a, b] of [[-23.6, -21.8], [-18.0, -4.6], [4.6, 18.0], [21.8, 23.6]]) balustrade(S, a, fr, b, fr, yt);
  for (const [a, b] of [[-4.4, -2.6], [2.6, 4.4]]) balustrade(S, a, 17.55, b, 17.55, yt);
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
    // ground storey: a tall arched door, glazed leaves in a lacquered frame under a fanlight
    S.kind = KIND.PLAIN;
    fbox(S, u, f, fl + 0.6, y1 - 0.9, ow + 0.4, 0.08, TRIM);
    fbox(S, u, f + 0.02, fl + 0.6, y1 - 1.05, ow, 0.08, WOOD);
    fbox(S, u, f + 0.04, fl + 0.8, y1 - 1.6, ow - 0.4, 0.08, SHUTTER);
    fcyl(S, u, f + 0.03, y1 - 1.3, y1 - 0.95, ow / 2, ow / 2 * 0.4, 6, GOLD); // the fanlight's gilt ring, read from afar
    // upper storey: a window with a carved frame and a small pediment
    const wy0 = y2 + 0.9, wy1 = y3 - 1.0;
    fbox(S, u, f, wy0 - 0.15, wy1 + 0.15, ow + 0.35, 0.1, TRIM);
    fbox(S, u, f + 0.03, wy0, wy1, ow - 0.1, 0.08, SHUTTER);
    fcyl(S, u, f + 0.02, wy1 - 0.05, wy1 + 0.12, (ow - 0.1) / 2, (ow - 0.1) / 2 * 0.5, 6, SHUTTER); // the arched head
    fbox(S, u, f + 0.05, wy1 + 0.18, wy1 + 0.5, ow + 0.6, 0.18, TRIM, { taper: 0.75 });
    // mosaic panels: under each upper window and in the frieze over each door
    mosaic(S, u - ow / 2, u + ow / 2, f + 0.06, wy0 - 0.65, wy0 - 0.25, Math.round(u * 3));
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
    for (const [a, b] of [[fl + 1.4, y1 - 1.0], [y2 + 0.9, y3 - 1.0]]) fbox(S, u, -10.34, a, b, 1.2, 0.08, GLASS);
  }
  for (let i = -3; i <= 3; i++) for (const [a, b] of [[fl + 1.4, y1 - 1.0], [y2 + 0.9, y3 - 1.0]]) fbox(S, i * 2.9 + 0.6, -14.14, a, b, 1.2, 0.08, GLASS);
  for (const s of [-1, 1]) for (const vv of [-7.5, -3, 3, 7.5]) for (const [a, b] of [[fl + 1.4, y1 - 1.0], [y2 + 0.9, y3 - 1.0]]) fbox(S, s * (E + 0.04), vv, a, b, 0.08, 1.2, SHUTTER);

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
  // 0.5 m, a low pyramid roof and a crest
  const yt1 = yr + 1.3, yt2 = yt1 + 2.2;
  for (const s of [-1, 1]) for (const tv of [7.45, -7.45]) {
    const tu = s * EM, tw = E - E0, td = 5.7;
    S.kind = KIND.PLAIN;
    fbox(S, tu, tv, y3 - 0.1, yt1, tw, td, WALL, { top: shade(WALL, 0.7) });
    fbox(S, tu, tv, yt1 - 0.1, yt1 + 0.3, tw + 0.5, td + 0.5, TRIM);
    fbox(S, tu, tv, yt1 + 0.3, yt2, tw - 1.0, td - 1.0, WALL, { top: shade(WALL, 0.7) });
    fbox(S, tu, tv, yt2 - 0.1, yt2 + 0.3, tw - 0.4, td - 0.4, TRIM);
    // the tower's face toward the front or back: a round window in a tiled frame on the attic
    const fv = tv + Math.sign(tv) * ((td - 1.0) / 2 + 0.03);
    fbox(S, tu, fv, yt1 + 0.6, yt2 - 0.4, 2.2, 0.08, tile(2 + s));
    fcyl(S, tu, fv + Math.sign(tv) * 0.05, yt1 + 0.9, yt2 - 0.7, 0.45, 0.45, 8, SHUTTER);
    const tp = P(tu, tv);
    S.hip(tp[0], tp[1], tw - 0.4, td - 0.4, ANG, yt2 + 0.3, 1.3, ROOF, { flare: 0.2, over: 0.35, ...eave });
    S.kind = KIND.PLAIN;
    S.cyl(tp[0], tp[1], yt2 + 1.5, yt2 + 2.2, 0.26, 0.06, 6, GOLD);
    // crest blocks at the corners of the attic cornice
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
  // a stone kerb, a few clipped shrubs, a bronze cannon on its stone carriage beside the middle flight's foot
  const g = gy(0, 20);
  S.base = g - LAND_Y;
  S.kind = KIND.ROAD;
  fbox(S, 0, 22.4, g - 0.15, g + 0.04, 48, 6.2, PAVING); // the paving along the road
  for (const s of [-1, 1]) {
    const cu = s * 11.0, w = 12.6;
    S.kind = KIND.GROUND;
    fbox(S, cu, 16.8, g - 0.15, g + 0.06, w, 5.0, LAWN);
    S.kind = KIND.MASONRY;
    fbox(S, cu, 19.35, g - 0.1, g + 0.18, w, 0.22, shade(STONE, 1.05)); // the kerb
    S.kind = KIND.PLAIN;
    for (const du of [-4.2, 1.4, 4.6]) {
      const q = P(cu + du * s, 17.6);
      S.cyl(q[0], q[1], g + 0.05, g + 0.9, 0.38, 0.08, 6, HEDGE);
    }
    // a bronze cannon on its carriage either side of the middle flight's foot, the muzzle to the road
    const q = P(s * 4.0, 17.4);
    cannon(S, q[0], g + 0.06, q[1], ANG + Math.PI / 2, { len: 2.4, col: BRONZE, wood: shade(STONE, 0.9) });
  }
  // the bronze cauldron cast for the court before Kiến Trung's predecessor (vạc đồng, 1659), on the axis in front of
  // the middle flight (its place here estimated; Street View does not show it in the lawn strip)
  { const q = P(0, 24.2); vac(S, q[0], g, q[1], ANG, { d: 1.9, col: BRONZE }); }
}

export function build({ S, group }) {
  const lamps = [];
  hall(S, lamps);
  forecourt(S);
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
