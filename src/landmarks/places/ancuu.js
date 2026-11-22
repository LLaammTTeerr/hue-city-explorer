import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial } from '../../geo/materials.js';

// Chợ An Cựu, 89 Hùng Vương (Phú Nhuận), on the south bank a block north of sông An Cựu. See docs/places/ancuu.md.
//
// Confirmed: the lot is OSM way 118541113 (amenity=marketplace, building=yes, addr 89 Hùng Vương), a seven-sided
// block of about 2,300 m² between Hùng Vương (west), Đặng Văn Ngữ (south) and the service lane that wraps its north
// and east sides (way 895581674). The satellite puts the lot within about 2 m of this outline. The city's drone
// survey (GISHue) gives the block one height, 12 m; the Open Buildings 2.5D raster about 10-11 m on the street side.
// Seen in Street View (2024-25) and on the satellite:
//   - a two-storey perimeter block, about 7 m deep, on Hùng Vương, the cut corner facing the Hùng Vương - Đặng Văn
//     Ngữ junction and Đặng Văn Ngữ: shops under striped awnings below, an upper floor of pierced concrete
//     breeze-block panels between white piers, a flat roof slab cantilevered well out over the street, at about
//     10 m; the upper floor of the south-east corner is painted blue, with windows; the corner where the cut front
//     meets Đặng Văn Ngữ is rounded, its slabs curved, with a tall white blade standing over it;
//   - red letters CHỢ AN CỰU on a frame on the roof over the cut corner, a large billboard on the roof of the south
//     front;
//   - inside, pale grey sheet roofs: long sheds along the fronts and a square pyramid-roofed hall in the middle;
//     a flat-roofed block east of the hall; a two-level wing (shops and a gallery) on the east lane behind the blue
//     corner; an open yard in the north-east corner; low kiosks on the north lane.
// Not visible (kept from the earlier estimate): the passage into the market from Hùng Vương, the kiosks' shutters,
// the umbrella stalls in the yard.
//
// Frame: u along the north edge (east-north-east), v at right angles to it (south-south-east), from the lot's
// north-west corner on Hùng Vương. The fronts are drawn along their own edges of the lot (strip()).
export const id = 'ancuu';

const A = [1230.4, 1246.2];
const T = [0.976, -0.218], N = [0.218, 0.976];
const ANG = Math.atan2(T[1], T[0]);
const P = (u, v) => [A[0] + T[0] * u + N[0] * v, A[1] + T[1] * u + N[1] * v];
// the lot (OSM way 118541113, model metres)
const RING = [[1230.4, 1246.2], [1279.2, 1235.3], [1285.4, 1239.1], [1289.6, 1244.1], [1284.0, 1292.7], [1253.3, 1287.5], [1238.2, 1272.7]];
const MID = [0.5 * (RING[0][0] + RING[4][0]), 0.5 * (RING[0][1] + RING[4][1])];

const WHITE = hex('#ebe8df'), SLAB = hex('#dcd9d0'), CONC = hex('#b9b6ad'), LATT = hex('#8c9090'), BLUEW = hex('#8b9fd9');
const CREAM = hex('#e6dfcc'), DARK = hex('#2c2825'), SHUTTER = hex('#8d8f8c'), GLASS = hex('#3d4a52');
const ROOF = hex('#b4b8b8'), ROOF_LT = hex('#d2d3cf'), ROOF_DK = hex('#9a9fa1'), LOUVRE = hex('#4a4e50');
const PAVE = hex('#a8a49b'), POST = hex('#5b6062'), AWN = hex('#4a6aa0'), RED = hex('#c3161c'), GOLD = hex('#e3c047');
const WOOD = hex('#7a5a3e'), BOARD = hex('#b4362b');
const CANVAS = ['#c8352b', '#2f6db0', '#e0a526', '#3f8f4f', '#e8e2d2', '#d0612b'].map(hex);
const W1 = [1, 1, 1];

// the perimeter block: depth, ground floor, the slab over it, upper floor, roof slab
const D = 7.0, G1 = 4.0, F1 = 4.6, U1 = 9.4, R1 = 10.2, OUT = 1.4;

let Y0 = LAND_Y;
function boxUV(S, u0, u1, v0, v1, a, b, col, opt) {
  const p = P((u0 + u1) / 2, (v0 + v1) / 2);
  S.box(p[0], p[1], Y0 + a, Y0 + b, u1 - u0, v1 - v0, ANG, col, opt);
}
function hipUV(S, u0, u1, v0, v1, a, h, col, opt) {
  const p = P((u0 + u1) / 2, (v0 + v1) / 2), w = u1 - u0, d = v1 - v0;
  if (w >= d) S.hip(p[0], p[1], w, d, ANG, Y0 + a, h, col, opt);
  else S.hip(p[0], p[1], d, w, ANG + Math.PI / 2, Y0 + a, h, col, opt);
}
const inward = (a, b) => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let n = [-t[1], t[0]];
  if ((MID[0] - c[0]) * n[0] + (MID[1] - c[1]) * n[1] < 0) n = [-n[0], -n[1]];
  return { L, t, n };
};
// a strip along the world segment a→b, from s0 to s1 metres along it and d0 to d1 metres in from it (n: inward)
function strip(a, b) {
  const { L, t, n } = inward(a, b);
  const at = (s, d) => [a[0] + t[0] * s + n[0] * d, a[1] + t[1] * s + n[1] * d];
  const ang = Math.atan2(t[1], t[0]);
  return {
    L, t, n, at,
    box(S, s0, s1, d0, d1, y0, y1, col, opt) { const p = at((s0 + s1) / 2, (d0 + d1) / 2); S.box(p[0], p[1], Y0 + y0, Y0 + y1, s1 - s0, d1 - d0, ang, col, opt); },
    hip(S, s0, s1, d0, d1, y0, h, col, opt) { const p = at((s0 + s1) / 2, (d0 + d1) / 2); S.hip(p[0], p[1], s1 - s0, d1 - d0, ang, Y0 + y0, h, col, opt); },
  };
}
// the polyline pts offset d metres inward, mitred at the bends
function offset(pts, d) {
  const segs = pts.slice(1).map((b, i) => inward(pts[i], b).n);
  return pts.map((p, i) => {
    const a = segs[Math.max(0, i - 1)], b = segs[Math.min(segs.length - 1, i)];
    const k = d / (1 + a[0] * b[0] + a[1] * b[1]);
    return [p[0] + (a[0] + b[0]) * k, p[1] + (a[1] + b[1]) * k];
  });
}
// the band between offsets d0 and d1, as one convex quad per segment (mitred, so they meet without gaps)
const band = (pts, d0, d1) => { const a = offset(pts, d0), b = offset(pts, d1); return a.slice(1).map((p, i) => [a[i], p, b[i + 1], b[i]]); };

// shop bays along the outer face of a front: openings and shutters, a signboard over each, the striped awning,
// goods tables pushed out onto the walk (jewellers' red-and-gold counters where jewel = true)
function shops(S, st, s0, s1, seed, jewel = false) {
  S.kind = KIND.PLAIN;
  const n = Math.max(1, Math.round((s1 - s0) / 3.3)), w = (s1 - s0) / n;
  for (let i = 0; i < n; i++) {
    const a = s0 + i * w + 0.2, b = s0 + (i + 1) * w - 0.2, open = (i * 7 + seed) % 4 !== 0;
    st.box(S, a, b, -0.04, 0.02, 0.1, 2.9, open ? DARK : SHUTTER);
    const sc = (i + seed) % 3 === 0 ? BOARD : GOLD;
    st.box(S, a, b, -0.3, -0.04, 3.1, 3.85, sc, { top: WHITE });
    st.box(S, a + 0.1, b - 0.1, -0.33, -0.3, 3.2, 3.3, sc === GOLD ? RED : GOLD);
    if (!open) continue;
    if (jewel) { st.box(S, a + 0.2, b - 0.2, -1.3, -0.4, 0, 0.95, BOARD, { top: GOLD }); continue; }
    st.box(S, a + 0.2, b - 0.2, -1.1, -0.3, 0.1, 0.85, WOOD);
    st.box(S, a + 0.3, b - 0.3, -1.05, -0.35, 0.85, 1.05, CANVAS[(i * 5 + seed) % CANVAS.length]); // goods on the table
  }
  // the awning, in blue and white stripes a metre wide
  for (let s = s0, k = 0; s < s1 - 0.05; s += 1.0, k++) {
    const e = Math.min(s + 1.0, s1), c = k % 2 ? hex('#d8dbe0') : AWN;
    st.box(S, s, e, -1.1, -0.05, 2.95, 3.05, c);
    st.box(S, s, e, -2.0, -1.1, 2.6, 2.7, c);
    st.box(S, s, e, -2.0, -1.95, 2.35, 2.7, c); // the valance
  }
}

// the upper floor's breeze-block panels between white piers: a dark backing behind a grid of white bars
function lattice(S, st, s0, s1) {
  const n = Math.max(1, Math.round((s1 - s0) / 6)), w = (s1 - s0) / n, y0 = F1 + 0.3, y1 = U1 - 0.2;
  for (let i = 0; i <= n; i++) st.box(S, s0 + i * w - 0.25, s0 + i * w + 0.25, 0.1, 0.45, F1, U1, WHITE);
  for (let i = 0; i < n; i++) {
    const a = s0 + i * w + 0.25, b = s0 + (i + 1) * w - 0.25;
    st.box(S, a, b, 0.36, 0.42, y0, y1, LATT);
    for (let y = y0; y <= y1 + 0.01; y += 0.55) st.box(S, a, b, 0.28, 0.36, y - 0.11, y + 0.11, WHITE);
    const m = Math.round((b - a) / 0.55), q = (b - a) / m;
    for (let k = 0; k <= m; k++) st.box(S, a + k * q - 0.11, a + k * q + 0.11, 0.28, 0.36, y0, y1, WHITE);
  }
}

// the upper floor as plain wall with windows (col: the wall's paint)
function windows(S, st, s0, s1, col) {
  if (col !== WHITE) st.box(S, s0, s1, 0.34, 0.4, F1, U1, col);
  const n = Math.max(1, Math.round((s1 - s0) / 3.4)), w = (s1 - s0) / n;
  for (let i = 0; i < n; i++) {
    const c = s0 + (i + 0.5) * w;
    st.box(S, c - 0.8, c + 0.8, 0.3, 0.34, 5.6, 8.3, WHITE);
    st.box(S, c - 0.65, c + 0.65, 0.27, 0.3, 5.75, 8.15, GLASS);
  }
}

// the name: red letters on a clear ground, for the frame on the roof
function signTexture(THREE) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 192;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 1024, 192);
  const text = 'CHỢ AN CỰU'.normalize('NFC');
  let px = 150;
  const font = () => `900 ${px}px "Helvetica Neue", Arial, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
  g.font = font();
  const tw = g.measureText(text).width;
  if (tw > 980) { px *= 980 / tw; g.font = font(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = '#f4ecd6'; g.strokeText(text, 512, 104);
  g.fillStyle = '#c3161c'; g.fillText(text, 512, 104);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// a market umbrella: pole, canvas cone, a trestle table under it
function umbrella(S, x, z, r, col, k) {
  const y = Y0;
  S.cyl(x, z, y, y + 2.5, 0.04, 0.04, 4, POST, { cap: false });
  S.cyl(x, z, y + 2.05, y + 2.65, r, 0.05, 8, col, { rot: k * 0.4 });
  S.box(x, z, y + 0.7, y + 0.8, 1.6, 0.9, ANG + k * 0.3, WOOD);
  S.box(x, z, y, y + 0.7, 1.3, 0.6, ANG + k * 0.3, shade(WOOD, 0.7));
}

// a row of single-storey kiosks along a strip: rendered piers, roller shutters (some open, dark), a sheet lean-to
function kiosks(S, st, s0, s1, d, h, roof, seed) {
  S.kind = KIND.PLAIN;
  st.box(S, s0, s1, 0.1, d, 0, h, CREAM, { top: shade(CREAM, 0.8) });
  const n = Math.max(1, Math.round((s1 - s0) / 3.4)), w = (s1 - s0) / n;
  for (let i = 0; i < n; i++) {
    const a = s0 + i * w + 0.25, b = s0 + (i + 1) * w - 0.25, open = (i * 7 + seed) % 3 !== 0;
    st.box(S, a, b, 0.0, 0.12, 0.1, h - 0.9, open ? DARK : SHUTTER);
    if (open) st.box(S, a + 0.2, b - 0.2, -0.9, -0.1, 0.1, 0.85, WOOD);
  }
  st.box(S, s0, s1, -1.4, 0.1, h - 0.75, h - 0.6, roof);
  st.hip(S, s0, s1, 0.1, d, h, 0.7, roof, { over: 0.3 });
}

export function build({ data, S, group, THREE }) {
  const c = P(28, 28);
  Y0 = LAND_Y + rise(c[0], c[1]);

  // the mapped outline is the whole lot, drawn here: take it out of data.bld so the city builder leaves it alone
  if (Array.isArray(data.bld)) {
    for (let i = data.bld.length - 1; i >= 0; i--) {
      const f = data.bld[i][0];
      let sx = 0, sz = 0;
      for (let k = 0; k < f.length; k += 2) { sx += f[k]; sz += f[k + 1]; }
      if (inRing(sx / (f.length / 2) / 10, sz / (f.length / 2) / 10, RING)) data.bld.splice(i, 1);
    }
  }

  // ---- the paved lot: concrete, a kerb all round ----
  const paved0 = S.n;
  S.kind = KIND.PLAIN;
  S.prism(RING, Y0 - 1.2, Y0 + 0.12, shade(PAVE, 0.85), PAVE);

  // ---- the perimeter block: Hùng Vương, the cut corner, Đặng Văn Ngữ, and ten metres back up the east lane ----
  const east = strip(RING[3], RING[4]);
  const E10 = east.at(east.L - 10, 0);
  const PER = [RING[0], RING[6], RING[5], RING[4], E10];
  // each piece is convex, so a fan closes its underside: the cantilevered slabs are seen from the street below
  const lift = (r, y0, y1, wall, top, opt) => {
    for (const q of Array.isArray(r[0][0]) ? r : [r]) {
      S.prism(q, Y0 + y0, Y0 + y1, wall, top, opt);
      if (y0 > 1) for (let i = 1; i + 1 < q.length; i++) S.tri([q[0][0], Y0 + y0, q[0][1]], [q[i][0], Y0 + y0, q[i][1]], [q[i + 1][0], Y0 + y0, q[i + 1][1]], hex(y0 > 5 ? '#a19f98' : '#b5b2aa'), [0, -1, 0]);
    }
  };
  S.kind = KIND.CIVIC;
  lift(band(PER, 0, D), 0.12, G1, WHITE, CONC);
  lift(band(PER, -0.4, D), G1, F1, SLAB, CONC);
  lift(band(PER, 0.4, D), F1, U1, WHITE, CONC);
  lift(band(PER, -OUT, D + 0.3), U1, R1, SLAB, ROOF_LT);
  lift(band(PER, -OUT, -OUT + 0.15), R1, R1 + 0.25, SLAB, CONC); // the upturned lip of the slab
  S.kind = KIND.PLAIN;
  const west = strip(RING[0], RING[6]), cut = strip(RING[6], RING[5]), south = strip(RING[5], RING[4]), ret = strip(RING[4], E10);
  // ground floor: shops all round, the passage in from Hùng Vương, a second one at the west end of the south front
  const GA = 12.0, GB = 16.0;
  shops(S, west, 0.6, GA, 1);
  shops(S, west, GB, west.L - 0.4, 2);
  west.box(S, GA, GB, -0.04, D + 0.1, 0.12, 3.6, DARK);
  shops(S, cut, 0.6, cut.L - 3.2, 3);
  south.box(S, 0.8, 3.6, -0.04, D + 0.1, 0.12, 3.6, DARK);
  shops(S, south, 3.8, south.L - 0.4, 0, true);
  shops(S, ret, 0.4, ret.L, 5);
  // upper floor: breeze-block on Hùng Vương and the west part of the south front; windows on the cut corner;
  // the blue corner at the south-east
  const BLUE0 = south.L - 12;
  lattice(S, west, 0.3, west.L - 0.3);
  windows(S, cut, 0.5, cut.L - 3.4, WHITE);
  lattice(S, south, 3.0, BLUE0);
  windows(S, south, BLUE0, south.L + 0.4, BLUEW);
  windows(S, ret, -0.4, ret.L, BLUEW);
  // the rounded corner where the cut front meets Đặng Văn Ngữ: curved slabs at each floor, a white blade above
  {
    const k = inward(RING[6], RING[5]).n, m = inward(RING[5], RING[4]).n, b = [k[0] + m[0], k[1] + m[1]], bl = Math.hypot(...b);
    const o = [RING[5][0] + b[0] / bl * 1.6, RING[5][1] + b[1] / bl * 1.6];
    const disc = (r) => Array.from({ length: 20 }, (_, i) => [o[0] + r * Math.cos(i * Math.PI / 10), o[1] + r * Math.sin(i * Math.PI / 10)]);
    S.kind = KIND.CIVIC;
    lift(disc(2.6), 0.12, G1, WHITE, CONC);
    lift(disc(3.2), G1, F1, SLAB, CONC);
    lift(disc(2.2), F1, U1, WHITE, CONC);
    lift(disc(3.4), 6.9, 7.15, SLAB, CONC);
    lift(disc(3.6), U1, R1, SLAB, CONC);
    lift(disc(3.0), R1, R1 + 1.1, WHITE, CONC); // the curved parapet over the corner
    S.kind = KIND.PLAIN;
    const ang = Math.atan2(b[1], b[0]), f = [o[0] + b[0] / bl * 0.6, o[1] + b[1] / bl * 0.6];
    S.box(f[0], f[1], Y0 + R1, Y0 + 16.5, 2.6, 0.45, ang, WHITE, { top: CONC });
    S.box(f[0] - b[1] / bl * 0.24, f[1] + b[0] / bl * 0.24, Y0 + 11.5, Y0 + 16.0, 1.9, 0.04, ang, BOARD);
  }
  // the billboard on the roof of the south front, on a steel frame, facing the street
  {
    const s0 = 6.0, s1 = 18.0, d = 2.2;
    for (let s = s0 + 0.5; s <= s1 - 0.4; s += (s1 - s0 - 1) / 3) south.box(S, s - 0.12, s + 0.12, d - 0.12, d + 0.9, R1, 11.2, POST);
    south.box(S, s0, s1, d + 0.1, d + 0.4, 11.0, 15.0, ROOF_DK);
    south.box(S, s0 + 0.15, s1 - 0.15, d, d + 0.1, 11.15, 14.85, BOARD);
    south.box(S, s0 + 0.15, s1 - 0.15, d - 0.02, d, 11.4, 12.2, GOLD);
  }
  // the frame on the roof over the cut corner for the red letters
  const SG0 = 4.0, SG1 = 15.5, SGD = 2.0;
  for (let s = SG0; s <= SG1 + 0.01; s += (SG1 - SG0) / 4) cut.box(S, s - 0.07, s + 0.07, SGD + 0.05, SGD + 0.2, R1, 13.0, POST);
  cut.box(S, SG0, SG1, SGD + 0.05, SGD + 0.2, 11.0, 11.1, POST);

  // ---- the east lane behind the blue corner: a two-level wing, shops below, a gallery of openings above ----
  S.kind = KIND.CIVIC;
  east.box(S, 25.0, east.L - 10, 0, D, 0.12, 3.6, WHITE, { top: CONC });
  east.box(S, 25.0, east.L - 10, -0.4, D, 3.6, 4.1, SLAB, { top: CONC });
  east.box(S, 25.0, east.L - 10, 0.5, D, 4.1, 6.0, CONC, { top: CONC });
  east.box(S, 25.0, east.L - 10, -0.8, D, 6.0, 6.5, SLAB, { top: CONC });
  S.kind = KIND.PLAIN;
  shops(S, east, 25.4, east.L - 10.2, 4);
  for (let s = 26.0; s < east.L - 11; s += 2.6) east.box(S, s, s + 1.8, 0.44, 0.5, 4.4, 5.7, DARK);

  // ---- inside: pale sheet roofs. The hall in the middle under a square pyramid roof, clerestory vents round it ----
  const H0 = 25.0, H1 = 41.0, HV0 = 11.0, HV1 = 27.0, EAVE = 8.6;
  S.kind = KIND.CIVIC;
  boxUV(S, H0, H1, HV0, HV1, 0, EAVE, CREAM, { top: ROOF_DK });
  S.kind = KIND.PLAIN;
  for (const [u0, u1, v0, v1] of [[H0 - 0.08, H0, HV0 + 1, HV1 - 1], [H1, H1 + 0.08, HV0 + 1, HV1 - 1], [H0 + 1, H1 - 1, HV0 - 0.08, HV0], [H0 + 1, H1 - 1, HV1, HV1 + 0.08]]) boxUV(S, u0, u1, v0, v1, 6.9, 8.1, LOUVRE);
  hipUV(S, H0, H1, HV0, HV1, EAVE, 4.4, ROOF, { over: 0.9 });
  // the long sheds: two behind the Hùng Vương front, two behind Đặng Văn Ngữ, one on the north side of the hall
  S.kind = KIND.CIVIC;
  const shed = (draw, wall, a, b, c2, d2, y, h) => { draw.box(S, a + 0.4, b - 0.4, c2 + 0.4, d2 - 0.4, 0, y, wall, { top: ROOF_DK }); draw.hip(S, a, b, c2, d2, y, h, ROOF, { over: 0.3 }); };
  const uv = { box: (S2, a, b, c2, d2, y0, y1, col, opt) => boxUV(S2, a, b, c2, d2, y0, y1, col, opt), hip: (S2, a, b, c2, d2, y0, h, col, opt) => hipUV(S2, a, b, c2, d2, y0, h, col, opt) };
  shed(uv, CREAM, 8.6, 15.8, 4.0, 27.0, 6.4, 1.7);
  shed(uv, CREAM, 16.4, 24.4, 4.0, 27.0, 6.0, 1.7);
  shed(uv, CREAM, 25.0, 41.0, 4.0, 10.4, 5.4, 1.4);
  shed(south, CREAM, 2.0, 24.0, D + 0.3, D + 7.6, 6.6, 1.7);
  shed(south, CREAM, 5.0, 22.0, D + 8.2, D + 14.6, 6.0, 1.6);
  // the flat-roofed block east of the hall
  S.kind = KIND.CIVIC;
  boxUV(S, 41.8, 50.4, 14.0, 30.0, 0.12, 6.6, CREAM, { top: shade(ROOF, 1.08) });
  boxUV(S, 41.6, 50.6, 13.8, 30.2, 6.6, 6.85, SLAB, { top: shade(ROOF, 1.08) });

  // ---- kiosks on the north lane, between the Hùng Vương front and the yard ----
  const north = strip(RING[0], RING[1]);
  kiosks(S, north, D + 1.0, 41.0, 3.4, 3.9, ROOF_DK, 1);

  // ---- the open yard at the north-east corner: umbrella stalls ----
  const spots = [[44.0, 5.5], [47.5, 3.2], [50.5, 6.2], [53.2, 9.0], [47.5, 9.5], [44.5, 11.0], [51.0, 12.0]];
  spots.forEach(([u, v], k) => { const p = P(u, v); if (inRing(p[0], p[1], RING)) umbrella(S, p[0], p[1], 1.25, CANVAS[k % CANVAS.length], k); });
  (S.paved = S.paved || []).push([paved0, S.n]);
  S.kind = KIND.PLAIN;

  if (!group) return null;
  // the red letters on their frame over the cut corner, facing the junction
  const tex = signTexture(THREE);
  const sp = cut.at((SG0 + SG1) / 2, SGD), SW = SG1 - SG0, SH = SW * 192 / 1024;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
  m.position.set(sp[0], Y0 + 11.1 + SH / 2, sp[1]);
  m.rotation.y = Math.atan2(-cut.n[0], -cut.n[1]);
  m.userData.landmark = 'ancuu';
  group.add(m);
  // after dark: tube lights under the awnings, lamps over the yard
  const L = new Buf(200);
  const line = (st, s0, s1, d, y) => { const a = st.at(s0, d), b = st.at(s1, d); L.beam([a[0], Y0 + y, a[1]], [b[0], Y0 + y, b[1]], 0.1, 0.1, W1); };
  line(west, 1, GA - 0.5, -0.5, 3.0);
  line(west, GB + 0.5, west.L - 1, -0.5, 3.0);
  line(cut, 1, cut.L - 3.5, -0.5, 3.0);
  line(south, 4, south.L - 1, -0.5, 3.0);
  line(east, 26, east.L - 11, -0.5, 3.0);
  for (const [u, v] of [[47, 6], [50, 10], [45, 9]]) { const p = P(u, v); L.box(p[0], p[1], Y0 + 2.9, Y0 + 3.1, 0.3, 0.3, 0, W1); }
  const lm = new THREE.Mesh(L.geometry(), lightMaterial(0xfff0d0, 1.4));
  lm.renderOrder = 19;
  lm.userData.landmark = 'ancuu';
  group.add(lm);
  return null;
}
