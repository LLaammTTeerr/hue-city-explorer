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
//     Ngữ junction and Đặng Văn Ngữ: shops under deep striped awnings below, an upper floor of pierced concrete
//     breeze-block panels between white piers, a flat roof slab cantilevered well out over the street, at about
//     10 m; the cut front's upper floor is plain white wall with a row of small windows and banners;
//   - where the cut front meets Đặng Văn Ngữ, an open corner with three thin curved slabs sweeping round it, the
//     roof slab the top one; the car pano on Đặng Văn Ngữ and the satellite put this corner about 3 m west of the
//     OSM vertex, so the corner is drawn there (C below) and the lot's own outline is otherwise kept;
//   - two blue upper-floor blocks: at the south-east corner, set back on a broad grey ledge with a deep fascia that
//     runs on over the lower east wing, windows with blue hoods and A/C units; and at the north end of the Hùng
//     Vương front, flush, with two windows and a mural (user photosphere on Hùng Vương looking north);
//   - red letters CHỢ AN CỰU on a frame on the roof over the cut corner; a large tilted hoarding on a steel frame
//     with a row of lamps on the roof of the south front, just east of the curved corner;
//   - inside, pale sheet roofs: two bands of long sheds following the fronts behind the perimeter block, a square
//     pyramid-roofed hall of about 14 m in the middle, a flat-roofed block east of it, a two-level wing on the east
//     lane behind the blue corner, an open yard in the north-east corner, low kiosks on the north lane.
// Not visible (kept from the earlier estimate): the passage into the market from Hùng Vương, the kiosks' shutters,
// the umbrella stalls in the yard.
//
// Frame: u along the north edge (east-north-east), v at right angles to it (south-south-east), from the lot's
// north-west corner on Hùng Vương. The fronts are drawn along their own edges (strip()).
export const id = 'ancuu';

const A = [1230.4, 1246.2];
const T = [0.976, -0.218], N = [0.218, 0.976];
const ANG = Math.atan2(T[1], T[0]);
const P = (u, v) => [A[0] + T[0] * u + N[0] * v, A[1] + T[1] * u + N[1] * v];
// the lot (OSM way 118541113, model metres)
const RING = [[1230.4, 1246.2], [1279.2, 1235.3], [1285.4, 1239.1], [1289.6, 1244.1], [1284.0, 1292.7], [1253.3, 1287.5], [1238.2, 1272.7]];
// the corner where the cut front meets Đặng Văn Ngữ, on the line of the south front, 2.7 m west of the OSM vertex
// RING[5] (which lies between it and RING[4]): car pano Q4ckrkA2 sees it about 31° left of north, the satellite agrees
const C = [1250.6, 1287.05];
const LOT = [RING[0], RING[1], RING[2], RING[3], RING[4], C, RING[6]];
const MID = [0.5 * (RING[0][0] + RING[4][0]), 0.5 * (RING[0][1] + RING[4][1])];

const WHITE = hex('#ebe8df'), SLAB = hex('#dcd9d0'), CONC = hex('#b9b6ad'), LATT = hex('#8c9090'), BLUEW = hex('#8b9fd9');
const BLUE_DK = hex('#6d84c4'), CEIL = hex('#d6d3cb'), FASCIA = hex('#a9a69d');
const CREAM = hex('#e6dfcc'), DARK = hex('#2c2825'), SHUTTER = hex('#8d8f8c'), GLASS = hex('#5a6870');
const SHEET = hex('#d3d0c6'), SHEET_DK = hex('#c3c0b6'), LOUVRE = hex('#4a4e50'), ROOF_LT = hex('#c9c8c2');
const PAVE = hex('#a8a49b'), POST = hex('#5b6062'), AWN = hex('#3f63a3'), AWN_W = hex('#dfe1e4'), RED = hex('#c3161c'), GOLD = hex('#e3c047');
const WOOD = hex('#7a5a3e'), BOARD = hex('#b4362b'), ACU = hex('#d9dadb');
const CANVAS = ['#c8352b', '#2f6db0', '#e0a526', '#3f8f4f', '#e8e2d2', '#d0612b'].map(hex);
const TARP = ['#2f8f86', '#4f9a45', '#3a7fa8', '#7d6aa8'].map(hex);
const W1 = [1, 1, 1];

// the perimeter block: depth, ground floor, the slab over it, upper floor, roof slab, the roof slab's overhang
const D = 7.0, G1 = 4.0, F1 = 4.6, U1 = 9.4, R1 = 10.2, OUT = 1.4;
// the corner chamfer (how far back from C along each front the walls cut across), the blue blocks' extents
const CH = 3.5, NB = 11.5, SEB = 12.0, SEBACK = 1.4;

let Y0 = LAND_Y;
function boxUV(S, u0, u1, v0, v1, a, b, col, opt) {
  const p = P((u0 + u1) / 2, (v0 + v1) / 2);
  S.box(p[0], p[1], Y0 + a, Y0 + b, u1 - u0, v1 - v0, ANG, col, opt);
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
    L, t, n, at, ang,
    box(S, s0, s1, d0, d1, y0, y1, col, opt) { const p = at((s0 + s1) / 2, (d0 + d1) / 2); S.box(p[0], p[1], Y0 + y0, Y0 + y1, s1 - s0, d1 - d0, ang, col, opt); },
  };
}
// the polyline pts offset inward, mitred at the bends; d a number, or one per point
function offset(pts, d) {
  const segs = pts.slice(1).map((b, i) => inward(pts[i], b).n);
  return pts.map((p, i) => {
    const a = segs[Math.max(0, i - 1)], b = segs[Math.min(segs.length - 1, i)];
    const k = (Array.isArray(d) ? d[i] : d) / (1 + a[0] * b[0] + a[1] * b[1]);
    return [p[0] + (a[0] + b[0]) * k, p[1] + (a[1] + b[1]) * k];
  });
}
// the band between offsets d0 and d1, as one convex quad per segment (mitred, so they meet without gaps)
const band = (pts, d0, d1) => { const a = offset(pts, d0), b = offset(pts, d1); return a.slice(1).map((p, i) => [a[i], p, b[i + 1], b[i]]); };

// a ceiling: a downward face lit as the real slab undersides are, by the pale street and pavement bouncing light up
// into them (a face whose normal points down only sees the brown ground fill here and renders chocolate)
function ceil(S, q, y, col = CEIL) {
  for (let i = 1; i + 1 < q.length; i++) {
    const n0 = S.n;
    S.tri([q[0][0], y, q[0][1]], [q[i][0], y, q[i][1]], [q[i + 1][0], y, q[i + 1][1]], col, [0, -1, 0]);
    if (S.n > n0) for (let k = 0; k < 3; k++) { const j = (n0 + k) * 3; S.nrm[j] = 0; S.nrm[j + 1] = 127; S.nrm[j + 2] = 0; }
  }
}
// convex pieces raised from y0 to y1 over the lot's ground; raised ones get their ceiling
function lift(S, r, y0, y1, wall, top) {
  for (const q of Array.isArray(r[0][0]) ? r : [r]) {
    S.prism(q, Y0 + y0, Y0 + y1, wall, top);
    if (y0 > 1) ceil(S, q, Y0 + y0);
  }
}
// a sloping sheet (an awning, a tarp), seen from above and below: along the strip s0..s1, from (d0, y0) to (d1, y1)
function sheet(S, st, s0, s1, d0, y0, d1, y1, col, under = null) {
  const a = st.at(s0, d0), b = st.at(s1, d0), c = st.at(s1, d1), e = st.at(s0, d1);
  const A3 = [a[0], Y0 + y0, a[1]], B3 = [b[0], Y0 + y0, b[1]], C3 = [c[0], Y0 + y1, c[1]], E3 = [e[0], Y0 + y1, e[1]];
  S.quad(A3, B3, C3, E3, col, [0, 1, 0]);
  S.quad(A3, B3, C3, E3, under || shade(col, 0.9), [0, -1, 0]);
}
// a box from eight corners (bottom four, top four, in order round), its faces wound outward
function box8(S, b, t, col) {
  const c = [0, 0, 0];
  for (const p of [...b, ...t]) { c[0] += p[0] / 8; c[1] += p[1] / 8; c[2] += p[2] / 8; }
  const out = (ps) => { const m = [0, 0, 0]; for (const p of ps) { m[0] += p[0] / ps.length; m[1] += p[1] / ps.length; m[2] += p[2] / ps.length; } return [m[0] - c[0], m[1] - c[1], m[2] - c[2]]; };
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4, f = [b[i], b[j], t[j], t[i]]; S.quad(...f, col, out(f)); }
  S.quad(t[0], t[1], t[2], t[3], col, out(t));
  S.quad(b[0], b[1], b[2], b[3], col, out(b));
}
// long sheds along a band of quads (outer edge a, inner edge b): walls to y, a sheet gable over each quad, ridge in
// the middle of the band, the eaves out by `over`; the gable ends closed at both ends of the run
function shedBand(S, pts, d0, d1, y, h, wall, roof) {
  S.kind = KIND.PLAIN;
  for (const q of band(pts, d0 + 0.3, d1 - 0.3)) S.prism(q, Y0 + 0.12, Y0 + y, wall, wall);
  const a = offset(pts, d0), b = offset(pts, d1), m = offset(pts, (d0 + d1) / 2);
  const V = (p, yy) => [p[0], Y0 + yy, p[1]];
  S.kind = KIND.FLAT;
  for (let i = 0; i + 1 < pts.length; i++) {
    S.quad(V(a[i], y), V(a[i + 1], y), V(m[i + 1], y + h), V(m[i], y + h), roof, [0, 1, 0]);
    S.quad(V(m[i], y + h), V(m[i + 1], y + h), V(b[i + 1], y), V(b[i], y), shade(roof, 0.94), [0, 1, 0]);
    ceil(S, [a[i], a[i + 1], b[i + 1], b[i]], Y0 + y - 0.02, SHEET_DK);
  }
  S.kind = KIND.PLAIN;
  for (const i of [0, pts.length - 1]) {
    const o = i ? [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]] : [pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]];
    S.tri(V(a[i], y), V(m[i], y + h), V(b[i], y), wall, [o[0], 0, o[1]]);
  }
}
// a pyramid of sheet roofing over the quad q, eaves at y, apex h above, a small vent box at the top
function pyramid(S, q, y, h, col) {
  const c = [0, 0];
  for (const p of q) { c[0] += p[0] / 4; c[1] += p[1] / 4; }
  S.kind = KIND.FLAT;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    S.tri([q[i][0], Y0 + y, q[i][1]], [q[j][0], Y0 + y, q[j][1]], [c[0], Y0 + y + h, c[1]], i % 2 ? shade(col, 0.95) : col, [0, 1, 0]);
  }
  ceil(S, q, Y0 + y - 0.02, SHEET_DK);
  S.kind = KIND.PLAIN;
}

// shop bays along the outer face of a front: openings and shutters, a signboard over each, a deep striped awning
// sloping out over the walk with tarps hung under its edge, goods tables pushed out (jewellers' counters where
// jewel = true: a red base lettered in gold, a glass case on top)
function shops(S, st, s0, s1, seed, jewel = false) {
  S.kind = KIND.PLAIN;
  const n = Math.max(1, Math.round((s1 - s0) / 3.3)), w = (s1 - s0) / n;
  for (let i = 0; i < n; i++) {
    const a = s0 + i * w + 0.2, b = s0 + (i + 1) * w - 0.2, open = (i * 7 + seed) % 4 !== 0;
    st.box(S, a, b, -0.04, 0.02, 0.1, 2.9, open ? DARK : SHUTTER);
    const sc = (i + seed) % 3 === 0 ? BOARD : GOLD;
    st.box(S, a, b, -0.3, -0.04, 3.2, 3.95, sc, { top: WHITE });
    st.box(S, a + 0.1, b - 0.1, -0.33, -0.3, 3.35, 3.5, sc === GOLD ? RED : GOLD);
    // a tarp hung under the awning's edge, on most bays
    if ((i + seed) % 3 !== 1) st.box(S, a - 0.1, b + 0.1, -3.05, -3.0, 1.75, 2.3, TARP[(i * 3 + seed) % TARP.length]);
    if (!open) continue;
    if (jewel) {
      st.box(S, a + 0.15, b - 0.15, -1.5, -0.5, 0, 0.8, BOARD, { top: GOLD });
      st.box(S, a + 0.4, b - 0.4, -1.53, -1.5, 0.3, 0.55, GOLD);
      st.box(S, a + 0.2, b - 0.2, -1.45, -0.55, 0.8, 1.15, GLASS, { top: hex('#9fb0b6') });
      continue;
    }
    st.box(S, a + 0.2, b - 0.2, -1.4, -0.3, 0.1, 0.8, WOOD);
    // goods heaped on the table: crates, sacks and baskets of different colours and heights
    for (let k = 0; k < 3; k++) {
      const g0 = a + 0.3 + k * (b - a - 0.6) / 3, g1 = g0 + (b - a - 0.6) / 3 - 0.08;
      st.box(S, g0, g1, -1.3, -0.4, 0.8, 0.95 + 0.25 * ((i + k + seed) % 3), CANVAS[(i * 5 + k * 2 + seed) % CANVAS.length]);
    }
  }
  // the awning: canvas in blue and white stripes, a metre wide, from under the signboards out to a valance
  for (let s = s0, k = 0; s < s1 - 0.05; s += 1.0, k++) {
    const e = Math.min(s + 1.0, s1), c = k % 2 ? AWN_W : AWN;
    sheet(S, st, s, e, -0.05, 3.15, -3.2, 2.3, c, shade(c, 0.8));
    st.box(S, s, e, -3.25, -3.18, 2.0, 2.32, c);
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

// windows in a blue wall whose face is d in from the strip: white frame, pale glass with a mullion, a projecting blue
// hood over each, an A/C unit beside some
function blueWindows(S, st, cs, d, seed) {
  cs.forEach((c, i) => {
    st.box(S, c - 0.75, c + 0.75, d - 0.05, d + 0.02, 5.7, 7.9, WHITE);
    st.box(S, c - 0.62, c + 0.62, d - 0.08, d - 0.05, 5.85, 7.75, GLASS);
    st.box(S, c - 0.03, c + 0.03, d - 0.1, d - 0.08, 5.85, 7.75, WHITE);
    st.box(S, c - 0.62, c + 0.62, d - 0.1, d - 0.08, 6.95, 7.0, WHITE);
    st.box(S, c - 0.85, c + 0.85, d - 0.45, d, 7.95, 8.12, BLUE_DK);
    if ((i + seed) % 2 === 0) st.box(S, c + 0.95, c + 1.75, d - 0.32, d, 7.3, 7.85, ACU);
  });
}

// the cut front's upper floor: a row of small windows high in the white wall, white banners lower down
function cutWall(S, st, s0, s1) {
  for (let s = s0 + 1.0; s < s1 - 0.6; s += 2.3) {
    st.box(S, s - 0.45, s + 0.45, 0.33, 0.4, 7.35, 8.45, WHITE);
    st.box(S, s - 0.36, s + 0.36, 0.31, 0.33, 7.45, 8.35, GLASS);
  }
  for (const [a, b] of [[s0 + 1.2, s0 + 5.8], [s0 + 8.0, s0 + 12.4]]) {
    st.box(S, a, b, 0.3, 0.4, 5.3, 6.7, hex('#f2f2ee'));
    st.box(S, a + 0.3, b - 0.3, 0.28, 0.3, 5.75, 6.15, hex('#2f5fa8'));
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
function kiosks(S, st, s0, s1, d, h, seed) {
  S.kind = KIND.PLAIN;
  st.box(S, s0, s1, 0.1, d, 0, h, CREAM, { top: shade(CREAM, 0.8) });
  const n = Math.max(1, Math.round((s1 - s0) / 3.4)), w = (s1 - s0) / n;
  for (let i = 0; i < n; i++) {
    const a = s0 + i * w + 0.25, b = s0 + (i + 1) * w - 0.25, open = (i * 7 + seed) % 3 !== 0;
    st.box(S, a, b, 0.0, 0.12, 0.1, h - 0.9, open ? DARK : SHUTTER);
    if (open) st.box(S, a + 0.2, b - 0.2, -0.9, -0.1, 0.1, 0.85, WOOD);
  }
  S.kind = KIND.FLAT;
  sheet(S, st, s0 - 0.2, s1 + 0.2, -1.4, h - 0.5, d + 0.3, h + 0.5, SHEET, SHEET_DK);
  S.kind = KIND.PLAIN;
}

export function build({ data, S, group, THREE }) {
  const c0 = P(28, 28);
  Y0 = LAND_Y + rise(c0[0], c0[1]);

  // the mapped outline is the whole lot, drawn here: take it out of data.bld so the city builder leaves it alone
  if (Array.isArray(data.bld)) {
    for (let i = data.bld.length - 1; i >= 0; i--) {
      const f = data.bld[i][0];
      let sx = 0, sz = 0;
      for (let k = 0; k < f.length; k += 2) { sx += f[k]; sz += f[k + 1]; }
      if (inRing(sx / (f.length / 2) / 10, sz / (f.length / 2) / 10, LOT)) data.bld.splice(i, 1);
    }
  }

  // ---- the paved lot: concrete, a kerb all round ----
  const paved0 = S.n;
  S.kind = KIND.PLAIN;
  S.prism(LOT, Y0 - 1.2, Y0 + 0.12, shade(PAVE, 0.85), PAVE);

  // ---- the fronts ----
  const west = strip(RING[0], RING[6]), cut = strip(RING[6], C), south = strip(C, RING[4]);
  const east = strip(RING[3], RING[4]);
  const E10 = east.at(east.L - 10, 0), ret = strip(RING[4], E10);
  const Pc = cut.at(cut.L - CH, 0), Ps = south.at(CH, 0), ch = strip(Pc, Ps);
  const NBP = west.at(NB, 0), SB = south.at(south.L - SEB, 0);
  // walls: the corner cut across (Pc-Ps), so the curved slabs sweep round an open corner
  const WALL = [RING[0], RING[6], Pc, Ps, RING[4], E10];
  const PW = [RING[0], RING[6], Pc, Ps, SB], PSE = [SB, RING[4], E10];

  // ---- the perimeter block, the walls themselves in their paint (white, the two blue blocks) ----
  S.kind = KIND.PLAIN;
  lift(S, band(WALL, 0, D), 0.12, G1, WHITE, CONC);
  lift(S, band(PW, -0.4, D), G1, F1, SLAB, CONC);
  // the south-east corner: a broad grey ledge with a deep fascia, out 1.6 m, the blue box set back on it
  lift(S, band(PSE, -1.6, D), G1 - 0.1, F1 + 0.25, FASCIA, CONC);
  lift(S, band([NBP, RING[6], Pc, Ps, SB], 0.4, D), F1, U1, WHITE, CONC);
  lift(S, band([RING[0], NBP], 0.4, D), F1, U1, BLUEW, CONC);
  lift(S, band(PSE, SEBACK, D), F1 + 0.25, U1, BLUEW, CONC);
  // the roof slab, cantilevered out over the street all round, past the free north end of the Hùng Vương front too
  const ROOFL = [west.at(-1.2, 0), RING[6], Pc, Ps, RING[4], E10];
  lift(S, band(ROOFL, -OUT, D + 0.3), U1, R1, SLAB, ROOF_LT);
  lift(S, band(ROOFL, -OUT, -OUT + 0.15), R1, R1 + 0.25, SLAB, CONC); // the upturned lip of the slab

  // ---- the curved corner: three thin slabs sweeping round it, the roof slab the top one ----
  {
    // the wall line round the corner, filleted (radius R), out further at the nose than along the fronts
    const R = 5.0, t1 = cut.t, t2 = south.t, turn = Math.acos(Math.min(1, t1[0] * t2[0] + t1[1] * t2[1]));
    const td = R * Math.tan(turn / 2), T1 = cut.at(cut.L - td, 0), O = cut.at(cut.L - td, R);
    const a1 = Math.atan2(T1[1] - O[1], T1[0] - O[0]), T2 = south.at(td, 0);
    let a2 = Math.atan2(T2[1] - O[1], T2[0] - O[0]);
    if (a2 - a1 > Math.PI) a2 -= 2 * Math.PI; else if (a1 - a2 > Math.PI) a2 += 2 * Math.PI;
    const path = [cut.at(cut.L - 7, 0)], e = [OUT];
    for (let i = 0; i <= 8; i++) { const a = a1 + (a2 - a1) * i / 8; path.push([O[0] + R * Math.cos(a), O[1] + R * Math.sin(a)]); e.push(-(OUT + 1.4 * Math.sin(Math.PI * i / 8))); }
    path.push(south.at(7, 0)); e.push(-OUT);
    e[0] = -OUT;
    const ribbon = (dOut, dIn) => { const a = offset(path, dOut), b = offset(path, dIn); return a.slice(1).map((p, i) => [a[i], p, b[i + 1], b[i]]); };
    lift(S, ribbon(e.map((x) => x * 0.75), 2.6), G1 + 0.3, G1 + 0.52, SLAB, CONC);
    lift(S, ribbon(e.map((x) => x * 0.9), 2.6), 6.9, 7.12, SLAB, CONC);
    lift(S, ribbon(e, 2.6), U1, R1 + 0.03, SLAB, ROOF_LT);
    lift(S, ribbon(e, e.map((x) => x + 0.15)), R1 + 0.03, R1 + 0.7, SLAB, CONC); // the curved parapet of the roof slab
  }

  // ---- ground floor: shops all round, the passage in from Hùng Vương, the open corner a way in too ----
  const GA = 12.0, GB = 16.0;
  shops(S, west, 0.6, GA, 1);
  shops(S, west, GB, west.L - 0.4, 2);
  west.box(S, GA, GB, -0.04, D + 0.1, 0.12, 3.6, DARK);
  shops(S, cut, 0.6, cut.L - CH - 0.3, 3);
  ch.box(S, 0.4, ch.L - 0.4, -0.04, D + 0.1, 0.12, 3.6, DARK);
  shops(S, south, CH + 0.3, south.L - 0.4, 0, true);
  shops(S, ret, 0.4, ret.L, 5);
  // ---- upper floor ----
  lattice(S, west, NB + 0.3, west.L - 0.3);
  cutWall(S, cut, 0.3, cut.L - CH);
  ch.box(S, ch.L * 0.3, ch.L * 0.7, 0.3, 0.4, 7.6, 8.4, hex('#2f5fa8')); // the small blue board on the open corner
  lattice(S, south, CH + 0.4, south.L - SEB);
  // the north blue block: two windows, a mural at its south end
  blueWindows(S, west, [2.6, 6.0], 0.4, 1);
  west.box(S, 7.6, 11.0, 0.36, 0.4, 5.4, 8.6, hex('#a9bce8'));
  west.box(S, 8.1, 9.4, 0.34, 0.36, 5.9, 8.1, hex('#e9ecf2'));
  west.box(S, 9.7, 10.6, 0.34, 0.36, 6.4, 7.8, hex('#6f7fb8'));
  // the south-east blue block, on its ledge
  blueWindows(S, south, [south.L - SEB + 2.2, south.L - SEB + 5.6, south.L - SEB + 9.0], SEBACK, 0);
  blueWindows(S, ret, [3.2, 7.0], SEBACK, 1);

  // ---- the hoarding on the roof of the south front, just east of the corner: tilted, on a steel frame, lamps ----
  {
    const s0 = 1.5, s1 = 11.5, d = 2.4, y0 = R1 + 1.4, y1 = y0 + 5.0, lean = 1.0; // top 1 m further in than the foot
    const V = (s, dd, y) => { const p = south.at(s, dd); return [p[0], Y0 + y, p[1]]; };
    box8(S, [V(s0, d, y0), V(s1, d, y0), V(s1, d + 0.3, y0), V(s0, d + 0.3, y0)], [V(s0, d + lean, y1), V(s1, d + lean, y1), V(s1, d + lean + 0.3, y1), V(s0, d + lean + 0.3, y1)], hex('#d8d8d4'));
    box8(S, [V(s0 + 0.2, d - 0.04, y0 + 0.2), V(s1 - 0.2, d - 0.04, y0 + 0.2), V(s1 - 0.2, d, y0 + 0.2), V(s0 + 0.2, d, y0 + 0.2)], [V(s0 + 0.2, d + lean - 0.04, y1 - 0.2), V(s1 - 0.2, d + lean - 0.04, y1 - 0.2), V(s1 - 0.2, d + lean, y1 - 0.2), V(s0 + 0.2, d + lean, y1 - 0.2)], BOARD);
    const k = (y) => (y - y0) / (y1 - y0) * lean;
    box8(S, [V(s0 + 0.6, d - 0.07, y0 + 0.8), V(s0 + 4.2, d - 0.07, y0 + 0.8), V(s0 + 4.2, d - 0.04, y0 + 0.8), V(s0 + 0.6, d - 0.04, y0 + 0.8)], [V(s0 + 0.6, d + k(y1 - 0.8) - 0.07, y1 - 0.8), V(s0 + 4.2, d + k(y1 - 0.8) - 0.07, y1 - 0.8), V(s0 + 4.2, d + k(y1 - 0.8) - 0.04, y1 - 0.8), V(s0 + 0.6, d + k(y1 - 0.8) - 0.04, y1 - 0.8)], GOLD);
    box8(S, [V(s0 + 5.0, d - 0.07, y0 + 0.6), V(s1 - 0.6, d - 0.07, y0 + 0.6), V(s1 - 0.6, d - 0.04, y0 + 0.6), V(s0 + 5.0, d - 0.04, y0 + 0.6)], [V(s0 + 5.0, d + k(y0 + 1.6) - 0.07, y0 + 1.6), V(s1 - 0.6, d + k(y0 + 1.6) - 0.07, y0 + 1.6), V(s1 - 0.6, d + k(y0 + 1.6) - 0.04, y0 + 1.6), V(s0 + 5.0, d + k(y0 + 1.6) - 0.04, y0 + 1.6)], hex('#f1ede2'));
    // the frame: posts from the roof, raking struts behind
    for (let s = s0 + 0.6; s <= s1 - 0.5; s += (s1 - s0 - 1.1) / 3) {
      south.box(S, s - 0.1, s + 0.1, d + 0.3, d + 0.5, R1 + 0.25, y0 + 0.1, POST);
      S.beam(V(s, d + 3.2, R1 + 0.25), V(s, d + lean + 0.4, y1 - 0.4), 0.12, 0.12, POST);
      S.beam(V(s, d + 0.4, R1 + 0.25), V(s, d + 3.2, R1 + 0.25), 0.1, 0.1, POST);
    }
    // the lamps: arms out over the face from its top edge
    for (let i = 0; i < 6; i++) {
      const s = s0 + 0.9 + i * (s1 - s0 - 1.8) / 5;
      S.beam(V(s, d + lean - 0.05, y1 - 0.1), V(s, d + lean - 1.3, y1 + 0.35), 0.06, 0.06, POST);
      south.box(S, s - 0.18, s + 0.18, d + lean - 1.5, d + lean - 1.15, y1 + 0.2, y1 + 0.42, hex('#cfd3d6'));
    }
  }
  // the frame on the roof over the cut corner for the red letters
  const SG0 = 3.6, SG1 = 15.1, SGD = 2.0;
  for (let s = SG0; s <= SG1 + 0.01; s += (SG1 - SG0) / 4) cut.box(S, s - 0.07, s + 0.07, SGD + 0.05, SGD + 0.2, R1, 13.0, POST);
  cut.box(S, SG0, SG1, SGD + 0.05, SGD + 0.2, 11.0, 11.1, POST);

  // ---- the east lane behind the blue corner: a two-level wing, shops below, a gallery of openings above; its ledge
  // runs on from the blue corner's ----
  S.kind = KIND.PLAIN;
  east.box(S, 25.0, east.L - 10, 0, D, 0.12, G1, WHITE, { top: CONC });
  {
    const q = band([east.at(25.0, 0), E10], -1.6, D);
    lift(S, q, G1 - 0.1, F1 + 0.25, FASCIA, CONC);
  }
  east.box(S, 25.0, east.L - 10, 0.5, D, F1 + 0.25, 6.4, CONC, { top: CONC });
  lift(S, band([east.at(25.0, 0), E10], -0.8, D), 6.4, 6.9, SLAB, CONC);
  shops(S, east, 25.4, east.L - 10.2, 4);
  for (let s = 26.0; s < east.L - 11; s += 2.6) east.box(S, s, s + 1.8, 0.44, 0.5, F1 + 0.5, 6.1, DARK);

  // ---- inside: pale sheet roofs. Two bands of long sheds following the fronts behind the perimeter block ----
  const SHEDS = [west.at(4.0, 0), RING[6], C, south.at(south.L - 10, 0)];
  shedBand(S, SHEDS, D + 0.2, D + 6.4, 6.2, 1.3, CREAM, SHEET);
  shedBand(S, SHEDS, D + 6.7, D + 12.6, 5.8, 1.2, CREAM, shade(SHEET, 0.97));
  // the hall in the middle under a square pyramid roof, clerestory vents round it
  const H0 = 26.0, H1 = 40.0, HV0 = 12.0, HV1 = 26.0, EAVE = 8.6;
  S.kind = KIND.PLAIN;
  boxUV(S, H0, H1, HV0, HV1, 0, EAVE, CREAM, { top: SHEET_DK });
  for (const [u0, u1, v0, v1] of [[H0 - 0.08, H0, HV0 + 1, HV1 - 1], [H1, H1 + 0.08, HV0 + 1, HV1 - 1], [H0 + 1, H1 - 1, HV0 - 0.08, HV0], [H0 + 1, H1 - 1, HV1, HV1 + 0.08]]) boxUV(S, u0, u1, v0, v1, 6.9, 8.1, LOUVRE);
  pyramid(S, [P(H0 - 0.5, HV0 - 0.5), P(H1 + 0.5, HV0 - 0.5), P(H1 + 0.5, HV1 + 0.5), P(H0 - 0.5, HV1 + 0.5)], EAVE, 4.0, SHEET);
  boxUV(S, 32.4, 33.6, 18.4, 19.6, EAVE + 3.3, EAVE + 4.3, SHEET_DK);
  // the shed on the north side of the hall
  shedBand(S, [P(25.0, 7.2), P(41.0, 7.2)], -3.2, 3.2, 5.4, 1.1, CREAM, SHEET);
  // the flat-roofed block east of the hall
  S.kind = KIND.PLAIN;
  boxUV(S, 41.8, 50.4, 14.0, 30.0, 0.12, 6.6, CREAM, { top: ROOF_LT });
  boxUV(S, 41.6, 50.6, 13.8, 30.2, 6.6, 6.85, SLAB, { top: ROOF_LT });

  // ---- kiosks on the north lane, between the Hùng Vương front and the yard ----
  const north = strip(RING[0], RING[1]);
  kiosks(S, north, D + 1.0, 41.0, 3.4, 3.9, 1);

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
  // after dark: tube lights under the awnings, the hoarding's lamps, lamps over the yard
  const L = new Buf(200);
  const line = (st, s0, s1, d, y) => { const a = st.at(s0, d), b = st.at(s1, d); L.beam([a[0], Y0 + y, a[1]], [b[0], Y0 + y, b[1]], 0.1, 0.1, W1); };
  line(west, 1, GA - 0.5, -0.5, 3.0);
  line(west, GB + 0.5, west.L - 1, -0.5, 3.0);
  line(cut, 1, cut.L - CH - 0.5, -0.5, 3.0);
  line(south, CH + 0.5, south.L - 1, -0.5, 3.0);
  line(east, 26, east.L - 11, -0.5, 3.0);
  for (let i = 0; i < 6; i++) { const p = south.at(1.5 + 0.9 + i * 8.2 / 5, 2.4 + 1.0 - 1.33); L.box(p[0], p[1], Y0 + R1 + 6.4 + 0.12, Y0 + R1 + 6.4 + 0.22, 0.3, 0.3, south.ang, W1); }
  for (const [u, v] of [[47, 6], [50, 10], [45, 9]]) { const p = P(u, v); L.box(p[0], p[1], Y0 + 2.9, Y0 + 3.1, 0.3, 0.3, 0, W1); }
  const lm = new THREE.Mesh(L.geometry(), lightMaterial(0xfff0d0, 1.4));
  lm.renderOrder = 19;
  lm.userData.landmark = 'ancuu';
  group.add(lm);
  return null;
}
