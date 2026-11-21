import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints } from '../../geo/materials.js';

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
const MOSAIC = [hex('#2f6f9c'), hex('#3f8f5a'), hex('#c23b2c'), hex('#e3b43a'), hex('#e9eef0')];
const LAWN = hex('#5f8a45'), HEDGE = hex('#365a2c'), GRAVEL = hex('#cbbd9e'), BRONZE = hex('#4a4a3c');

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
    S.beam([a[0], y1 + 0.75, a[1]], [b[0], y0 + 0.75, b[1]], 0.26, 0.22, shade(MOSAIC[1], 0.9));
    const hb = P(cu, va + Math.sign(va - vb) * -0.2);
    S.box(hb[0], hb[1], y0, y0 + 1.25, 0.55, 0.8, ANG, STONE);
    S.box(hb[0], hb[1], y0 + 1.25, y0 + 1.7, 0.42, 0.7, ANG, shade(MOSAIC[1], 0.9));
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

  // ---- terrace: the surviving 1920s base, stone-faced, with the rear block and the landing before the middle flight
  S.kind = KIND.MASONRY;
  fbox(S, 0, 0, g - 0.4, yt, 47.5, 28.5, shade(STONE, 0.92), { topKind: KIND.ROAD, taper: 0.995 });
  fbox(S, 0.5, -16.1, g - 0.4, yt, 29.2, 3.9, shade(STONE, 0.92), { topKind: KIND.ROAD });
  fbox(S, 0, 16.0, g - 0.4, yt, 9.0, 3.4, shade(STONE, 0.92), { topKind: KIND.ROAD });
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
  fbox(S, 0, 0.65, yt - 0.05, fl, 41.0, 23.3, shade(STONE, 0.98), { topKind: KIND.ROAD }); // the hall's own plinth and porch
  fbox(S, 0.6, -12.4, yt - 0.05, fl, 22.0, 4.4, shade(STONE, 0.98), { topKind: KIND.ROAD });

  // ---- the hall: blocks along the front (u0, u1, front v), back at v = -10.3, and the rear block
  const blocks = [
    { u0: -19.75, u1: -16.2, v: 10.3, end: true },
    { u0: -16.2, u1: -6.5, v: 9.5 },
    { u0: -6.5, u1: 6.5, v: 10.7, mid: true },
    { u0: 6.5, u1: 16.2, v: 9.5 },
    { u0: 16.2, u1: 19.75, v: 10.3, end: true },
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
    const ow = end ? 2.0 : Math.min(1.5, w * 0.55), f = v + 0.04;
    // ground storey: a tall arched door, glazed leaves in a lacquered frame under a fanlight
    S.kind = KIND.PLAIN;
    fbox(S, u, f, fl + 0.6, y1 - 0.9, ow + 0.4, 0.08, TRIM);
    fbox(S, u, f + 0.02, fl + 0.6, y1 - 1.05, ow, 0.08, WOOD);
    fbox(S, u, f + 0.04, fl + 0.8, y1 - 1.6, ow - 0.4, 0.08, GLASS);
    fcyl(S, u, f + 0.03, y1 - 1.3, y1 - 0.95, ow / 2, ow / 2 * 0.4, 6, GOLD); // the fanlight's gilt ring, read from afar
    // upper storey: a window with a carved frame and a small pediment
    const wy0 = y2 + 0.9, wy1 = y3 - 1.0;
    fbox(S, u, f, wy0 - 0.15, wy1 + 0.15, ow + 0.35, 0.1, TRIM);
    fbox(S, u, f + 0.03, wy0, wy1, ow - 0.1, 0.08, end ? WOOD : GLASS);
    fbox(S, u, f + 0.05, wy1 + 0.18, wy1 + 0.5, ow + 0.6, 0.18, TRIM, { taper: 0.75 });
    // mosaic panels: under each upper window and in the frieze over each door
    mosaic(S, u - ow / 2, u + ow / 2, f + 0.06, wy0 - 0.65, wy0 - 0.25, Math.round(u * 3));
    mosaic(S, u - w / 2 + 0.25, u + w / 2 - 0.25, f + 0.12, y1 + 0.15, y2 - 0.15, Math.round(u * 5) + 1);
    if (mid) { // a balcony before each window of the avant-corps
      balustrade(S, u - w / 2 + 0.1, v + 0.55, u + w / 2 - 0.1, v + 0.55, y2 - 0.05, 0.75);
      S.kind = KIND.MASONRY;
      fbox(S, u, v + 0.35, y2 - 0.2, y2, w, 0.8, TRIM);
    }
    { const q = P(u, v + 0.9); lamps.push([q[0], y1 - 0.2, q[1]]); }
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
  for (let i = -6; i <= 6; i++) {
    const u = i * 2.9;
    if (Math.abs(u) < 11) continue;
    for (const [a, b] of [[fl + 1.4, y1 - 1.0], [y2 + 0.9, y3 - 1.0]]) fbox(S, u, -10.34, a, b, 1.2, 0.08, GLASS);
  }
  for (let i = -3; i <= 3; i++) for (const [a, b] of [[fl + 1.4, y1 - 1.0], [y2 + 0.9, y3 - 1.0]]) fbox(S, i * 2.9 + 0.6, -14.14, a, b, 1.2, 0.08, GLASS);
  for (const s of [-1, 1]) for (const vv of [-6, -1.5, 3, 7.5]) for (const [a, b] of [[fl + 1.4, y1 - 1.0], [y2 + 0.9, y3 - 1.0]]) fbox(S, s * 19.79, vv, a, b, 0.08, 1.2, GLASS);

  // ---- roofs: yellow glazed tiles, a separate hip over each block with slightly raised edges, the avant-corps two-tiered
  // and highest; the end bays gabled toward the front; a low ceramic parapet (attic) round the eaves
  const eave = { fascia: 0.3, fasciaCol: TRIM, hips: true, glazed: true, ridgeCol: RIDGE, segs: 2, horns: false };
  const yr = y3 + 0.45;
  // the main roof over the body, its ridge along the front
  const body = P(0, -0.4);
  S.hip(body[0], body[1], 32.4, 19.8, ANG, yr, 2.4, ROOF, { flare: 0.3, over: 0.7, ...eave });
  for (const s of [-1, 1]) {
    // end bays: a hip with its ridge running back from a gable on the front
    const e = P(s * 17.97, 0);
    S.hip(e[0], e[1], 20.6, 3.55, ANG + Math.PI / 2, yr, 2.6, ROOF, { flare: 0.35, over: 0.6, ...eave });
    // the front gable (đầu hồi): an ivory triangle with a mosaic medallion
    const gu = s * 17.97, gv = 10.3 + 0.45, a = P(gu - 2.1, gv), b = P(gu + 2.1, gv), t = P(gu, gv);
    S.kind = KIND.PLAIN;
    S.tri([a[0], yr, a[1]], [b[0], yr, b[1]], [t[0], yr + 2.3, t[1]], TRIM, [-UZ, 0, UX]);
    fcyl(S, gu, gv + 0.08, yr + 0.5, yr + 1.2, 0.36, 0.36, 8, MOSAIC[0]);
  }
  // the avant-corps: a roof running back from the front, standing above the body's, and a small upper tier on a drum
  const mid = P(0, 10.7 - 21.0 / 2);
  S.hip(mid[0], mid[1], 21.0, 13.0, ANG + Math.PI / 2, yr, 2.8, ROOF, { flare: 0.35, over: 0.8, ...eave });
  S.kind = KIND.PLAIN;
  // the drum stands the tier's eave clear of the avant-corps' ridge (yr + 2.8) and the body's (yr + 2.4) under it
  const ytt = yr + 3.0;
  fbox(S, 0, 0.2, yr + 1.2, ytt, 9.0, 7.0, WALL);
  mosaic(S, -4.5, 4.5, 3.74, ytt - 0.65, ytt - 0.15, 2);
  const tt = P(0, 0.2);
  S.hip(tt[0], tt[1], 9.0, 7.0, ANG, ytt, 1.6, ROOF, { flare: 0.45, over: 0.9, ...eave });
  const rb = P(0.6, -12.2);
  S.hip(rb[0], rb[1], 21.2, 3.8, ANG, yr, 1.6, ROOF, { flare: 0.25, over: 0.6, ...eave });
  // ridge ornament on the top tier: a flaming pearl (hỏa châu) between two dragons, in enamel
  S.kind = KIND.PLAIN;
  const top = ytt + 1.6;
  const pc = P(0, 0.2);
  S.cyl(pc[0], pc[1], top + 0.2, top + 0.85, 0.35, 0.12, 8, GOLD);
  for (const s of [-1, 1]) {
    const a = P(s * 0.6, 0.2), b = P(s * 1.9, 0.2);
    S.beam([a[0], top + 0.7, a[1]], [b[0], top + 0.3, b[1]], 0.18, 0.28, MOSAIC[1]);
  }
  // the attic: a low parapet of green-glazed balusters along the front eave of each wing
  for (const s of [-1, 1]) { balustrade(S, s * 6.9, 9.75, s * 15.8, 9.75, y3 + 0.45, 0.55); balustrade(S, s * 6.9, 9.75, s * 6.9, 8.4, y3 + 0.45, 0.55); }
}

function forecourt(S) {
  // between the end flights, the terrace face and the service road: two geometric parterres of lawn and clipped box
  // round a small basin, gravel walks, brick stools with potted trees along the terrace foot, two bronze cannons
  const g = gy(0, 22);
  S.base = g - LAND_Y;
  S.kind = KIND.ROAD;
  fbox(S, 0, 23.3, g - 0.15, g + 0.04, 48, 4.4, GRAVEL); // the walk along the road
  for (const s of [-1, 1]) {
    const cu = s * 10.9;
    S.kind = KIND.GROUND;
    fbox(S, cu, 18.0, g - 0.15, g + 0.06, 12.4, 6.6, LAWN);
    S.kind = KIND.ROAD;
    fbox(S, cu, 18.0, g + 0.06, g + 0.08, 12.4, 0.8, GRAVEL);
    fbox(S, cu, 18.0, g + 0.06, g + 0.08, 0.8, 6.6, GRAVEL);
    S.kind = KIND.PLAIN;
    // clipped box hedges: a frame and a diamond in each half
    for (const [a, b, c, d] of [[-6.1, 15.0, 6.1, 15.0], [-6.1, 21.0, 6.1, 21.0], [-6.1, 15.0, -6.1, 21.0], [6.1, 15.0, 6.1, 21.0]]) {
      const pa = P(cu + a, b), pb = P(cu + c, d);
      S.beam([pa[0], g + 0.25, pa[1]], [pb[0], g + 0.25, pb[1]], 0.4, 0.4, HEDGE);
    }
    for (const h of [-1, 1]) {
      const ox = cu + h * 3.4;
      const pts = [[ox, 15.7], [ox + 2.2, 18.0], [ox, 20.3], [ox - 2.2, 18.0]].map(([u, v]) => P(u, v));
      for (let k = 0; k < 4; k++) { const a = pts[k], b = pts[(k + 1) % 4]; S.beam([a[0], g + 0.22, a[1]], [b[0], g + 0.22, b[1]], 0.3, 0.32, HEDGE); }
    }
    // the basin in the middle of each parterre, a jet of water over it
    S.kind = KIND.MASONRY;
    fcyl(S, cu, 18.0, g, g + 0.45, 1.25, 1.25, 10, TRIM);
    S.kind = KIND.PLAIN;
    fcyl(S, cu, 18.0, g + 0.3, g + 0.4, 1.05, 1.05, 10, hex('#5a8aa0'));
    fcyl(S, cu, 18.0, g + 0.4, g + 1.0, 0.18, 0.12, 6, TRIM);
    // brick stools carrying potted trees, at the foot of the terrace
    for (const du of [-4.5, -1.5, 1.5, 4.5]) {
      S.kind = KIND.MASONRY;
      fbox(S, cu + du, 14.75, g, g + 0.55, 0.6, 0.6, hex('#a4553c'));
      S.kind = KIND.PLAIN;
      fcyl(S, cu + du, 14.75, g + 0.55, g + 0.95, 0.32, 0.24, 6, MOSAIC[0]);
      fcyl(S, cu + du, 14.75, g + 0.95, g + 1.6, 0.45, 0.25, 6, HEDGE);
    }
    // a bronze cannon on its carriage either side of the middle flight's foot, the muzzle to the road
    const cv = 22.6, cx = s * 3.6;
    S.kind = KIND.PLAIN;
    fbox(S, cx, cv, g, g + 0.45, 0.8, 1.6, shade(WOOD, 0.7));
    const a = P(cx, cv - 1.0), b = P(cx, cv + 1.0);
    S.beam([a[0], g + 0.6, a[1]], [b[0], g + 0.7, b[1]], 0.36, 0.36, BRONZE);
  }
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
