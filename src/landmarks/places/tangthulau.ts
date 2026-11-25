import { KIND, hex, shade, unflat, inRing, obb } from '../../geo/buf.ts';
import { LAND_Y, POND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { bridgeProfiles } from '../../geo/bridges.ts';
import { glowPoints } from '../../geo/materials.ts';

// ---- Tàng Thư Lâu: the Nguyễn archive of land registers on its island in hồ Học Hải (Thuận Lộc), as restored ----
//
// Built 1825-26 under Minh Mạng; used until 1945; after 1975 split into housing; restored by the Huế Monuments
// Conservation Centre from 2014 (VND 24.8 bn) and opened as an exhibition library in March 2021.
// Sources and estimates: docs/places/tangthulau.md.
//  - vi.wikipedia (Tàng Thư lâu): two storeys of brick and stone; lower floor 11 bays (gian), upper floor 7 bays and
//    2 end bays (chái); island about 45 x 65 m in the middle of Học Hải; one stone bridge to the shore.
//  - Đại Nam thực lục via kienthuc.net.vn and hue.gov.vn: railings (lan can) all round; the upper floor has many
//    doors and open railings for air; walls about 0.4 m thick; tile roof; the bridge on the west side.
//  - vietnamnet / heritagevietnamairlines: plastered brick, terracotta tile roof, golden-yellow walls.
//  - OSM (data/raw/hue-osm.json): building way 173151284 (building:colour #ffe0a0), 40.0 x 15.1 m; a layer-1 footway
//    ring (1346839069) about 1.1 m inside the outline: the upper gallery; two flights of steps (1346839061,
//    1346839062) along the long sides and up the east end to a landing in its middle; island garden 1346839222;
//    bridge outline 1431132265 (beam bridge, 38.6 x 4.6 m) carrying the service way 372295922; a memorial node
//    (12458493990) on the north tip of the island.
// Estimated: the storey heights (ridge kept at the survey's 11.5 m), the gallery width, column and door counts on
// the short ends, the bridge's piers and parapets, the colours of joinery and tiles, the stele.

export const id = 'tangthulau';

// OSM way 173151284, re-framed (REFRAME) to the Google satellite (north up, 0.14 m/px). The image leans: the roof's
// ridge sits ~1.5 m north-west of the middle of its eaves (~0.44 m of lean per metre of height), so the roof and the
// terrace edge read 3.4 m and 2.1 m north-west of their footings. Corrected for that, the base stands ~2.2 m north-west
// and ~1.1 m north-east of this outline, its long axis ~2.3° nearer east-west (bearing ~58°, OSM ~56°). The island,
// the bridge and the streets round the lake match OSM there, so only the building moves; it keeps the mapped
// 40.0 x 15.1 m. (The OSM gallery ring and steps the city draws as footways stay where OSM has them.)
const REFRAME = { dx: -0.4, dz: -2.4, rot: -2.3 * Math.PI / 180 };
const OUTLINE = [[-1326.1, -1324.5], [-1323.2, -1326.4], [-1292.9, -1346.6], [-1288.8, -1340.6], [-1284.4, -1334.1], [-1314.7, -1313.9], [-1317.6, -1311.9]];
const BRIDGE = [[-1364.3, -1288], [-1331, -1311.8]]; // OSM way 372295922, shore (west) → island
const STELE = [-1318.5, -1301]; // OSM node 12458493990 (historic=memorial)
// OSM way 1346839070 (building, 9.8 x 4.3 m) by the archive's north-west side: the satellite shows a low tiled shed under
// the trees there, so it is drawn single-storey here (the city's survey height of 8 m made it a white two-storey block)
const SHED = [[-1315, -1346.5], [-1312.5, -1343], [-1320.6, -1337.5], [-1323.1, -1341.1]];
// The island's trees, in the archive's own frame (u along it toward the stairs, v toward the south-east; metres from
// its middle) and crown scale: the large shade trees along the north-west side and at the north tip, smaller ones on
// the south-east court and by the bridge landing, read off the satellite (z19/z20, its ~0.44 m/m lean taken out).
const TREES = [
  [-28, -14.5, 1.5], [-18, -15, 1.4], [0, -13.5, 1.3], [9, -14, 1.5], [18, -13, 1.4], [26, -12, 1.6], // north-west side, north tip
  [-30, -6, 0.9], [29, 4, 0.9], [27, 15, 1.1], [17, 15, 0.8], // west end, east corner and the south-east court
  [-26, 17, 1.3], [-14, 19, 1.0], [-29, 7, 0.8], // by the bridge landing
];

const C = {
  wall: hex('#e9c87c'), // golden-yellow lime wash (OSM building:colour #ffe0a0, weathered)
  wallLo: hex('#d9b56a'),
  trim: hex('#f1e2b8'), // cornices and pilasters, lighter wash
  door: hex('#6b2f22'), // lacquered jackfruit-wood leaves
  doorDark: hex('#3e1f18'),
  lac: hex('#8e3424'),
  roof: hex('#6f4a3b'), // weathered terracotta: dark brown on the satellite, not new orange tile
  roofDark: hex('#4c3229'),
  ridge: hex('#ddd2b8'),
  stone: PAL.stone,
  face: hex('#7f7a6d'), // weathered revetment stone
  moss: hex('#5a5e48'),
  coping: hex('#b4ab98'),
  plaster: hex('#cfc6b2'), // bridge parapets, grey lime plaster
  court: hex('#a39278'), // the island court: packed earth and worn brick
  brick: hex('#8a6f5c'),
};

const distSeg = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
};

// The generic road-bridge (geo/city.js: slab, piers, parapets) on the mapped bridge: collapse its triangles so the
// hand-made one stands on the same deck profile.
function knockOut(S, n0, a, b, half, yHi) {
  const P = S.pos, L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
  const inside = (k) => {
    const x = P[k] - a[0], y = P[k + 1], z = P[k + 2] - a[1];
    const s = x * ux + z * uz, t = -x * uz + z * ux;
    return s > -0.8 && s < L + 0.8 && Math.abs(t) < half && y > -6 && y < yHi;
  };
  for (let i = 0; i < n0; i += 3) {
    const k = i * 3;
    if (!inside(k) || !inside(k + 3) || !inside(k + 6)) continue;
    for (const j of [k + 3, k + 6]) { P[j] = P[k]; P[j + 1] = P[k + 1]; P[j + 2] = P[k + 2]; }
  }
}

function archive(S, lamps) {
  const o0 = obb(OUTLINE);
  let ang = o0.a;
  if (Math.cos(ang) < 0) ang += Math.PI; // u toward the east end (the stairs)
  ang += REFRAME.rot;
  const o = { ...o0, c: [o0.c[0] + REFRAME.dx, o0.c[1] + REFRAME.dz] };
  const UX = Math.cos(ang), UZ = Math.sin(ang);
  const P = (u, v): [number, number] => [o.c[0] + u * UX - v * UZ, o.c[1] + u * UZ + v * UX];
  const fbox = (u, v, y0, y1, su, sv, col, opts?) => { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ang, col, opts); };
  const W = o.w, D = o.d; // 40.0 x 15.1
  let g = Infinity;
  for (const [u, v] of ([[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]] as any[])) { const q = P(u, v); g = Math.min(g, LAND_Y + rise(q[0], q[1])); }
  S.base = g - LAND_Y;

  const fl = g + 0.6, fl2 = fl + 4.2; // ground floor, upper floor (the gallery)
  const LW = W - 1.0, LD = D - 1.0; // lower storey walls, 0.5 m in from the base edge
  // upper body: 7 bays + 2 chái. The satellite shows its hipped roof about 33.4 x 10.4 m (eave to eave) over an open
  // terrace (the upper gallery, light plaster with its railing at the edge) about 3.5 m wide all round.
  const UW = 31.8, UD = 8.8;
  const eave = fl2 + 3.0, ridgeTop = g + 11.5;

  // base: stone, the mapped outline
  S.kind = KIND.MASONRY;
  fbox(0, 0, g - 0.3, fl, W, D, shade(C.stone, 0.95), { taper: 0.99, topKind: KIND.ROAD });
  // ---- lower storey: 11 bays on each long side, a door in each between pilasters; 3 bays on each end ----
  fbox(0, 0, fl, fl2 - 0.35, LW, LD, C.wall, { top: shade(C.wall, 0.8) });
  fbox(0, 0, fl, fl + 0.35, LW + 0.12, LD + 0.12, C.wallLo); // plinth band
  const bay = LW / 11;
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 11; i++) fbox(-LW / 2 + i * bay, s * (LD / 2 + 0.06), fl, fl2 - 0.35, 0.5, 0.14, C.trim); // pilasters
    for (let i = 0; i < 11; i++) {
      const u = -LW / 2 + (i + 0.5) * bay;
      fbox(u, s * (LD / 2 + 0.03), fl + 0.1, fl + 2.6, 1.5, 0.08, i === 5 ? C.doorDark : C.door); // leaves
      fbox(u, s * (LD / 2 + 0.05), fl + 2.6, fl + 2.8, 1.8, 0.1, C.trim); // lintel
      fbox(u, s * (LD / 2 + 0.2), fl - 0.05, fl + 0.12, 1.7, 0.4, shade(C.stone, 1.0)); // threshold step
      fbox(u, s * (LD / 2 + 0.03), fl + 3.0, fl + 3.55, 1.1, 0.08, C.doorDark); // vent over the door
    }
    const eb = LD / 3;
    for (let i = 0; i < 3; i++) {
      const v = -LD / 2 + (i + 0.5) * eb;
      const p = P(s * (LW / 2 + 0.03), v);
      S.box(p[0], p[1], fl + 0.9, fl + 2.6, 0.08, 1.3, ang, C.door);
    }
  }
  // gallery floor slab: a cornice over the lower walls, the deck of the upper gallery
  S.kind = KIND.MASONRY;
  fbox(0, 0, fl2 - 0.35, fl2, LW + 0.5, LD + 0.5, C.trim, { topKind: KIND.ROAD });

  // ---- the upper gallery's railing (lan can thưa): masonry posts with an open rail, left open at the stair landing ----
  const railH = 0.85;
  S.kind = KIND.MASONRY;
  const railRun = (u0, v0, u1, v1) => {
    const L = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.round(L / 2.4));
    const a = P(u0, v0), b = P(u1, v1);
    for (let k = 0; k <= n; k++) { const q = P(u0 + (u1 - u0) * k / n, v0 + (v1 - v0) * k / n); S.box(q[0], q[1], fl2, fl2 + railH + 0.1, 0.32, 0.32, ang, C.trim); }
    S.kind = KIND.PLAIN;
    S.beam([a[0], fl2 + railH, a[1]], [b[0], fl2 + railH, b[1]], 0.22, 0.12, C.trim);
    S.beam([a[0], fl2 + 0.12, a[1]], [b[0], fl2 + 0.12, b[1]], 0.22, 0.14, C.trim);
    for (let k = 0; k < n * 4; k++) { if (k % 4 === 0) continue; const q = P(u0 + (u1 - u0) * k / (n * 4), v0 + (v1 - v0) * k / (n * 4)); S.box(q[0], q[1], fl2 + 0.19, fl2 + railH - 0.06, 0.08, 0.08, ang, shade(C.trim, 0.92)); }
    S.kind = KIND.MASONRY;
  };
  const eu = LW / 2 + 0.1, ev = LD / 2 + 0.1;
  railRun(-eu, -ev, eu, -ev);
  railRun(-eu, ev, eu, ev);
  railRun(-eu, -ev, -eu, ev);
  railRun(eu, -ev, eu, -1.3);
  railRun(eu, 1.3, eu, ev);

  // ---- upper body: 9 bays (7 + 2 chái) of doors along each side, golden walls, lacquered leaves ----
  S.kind = KIND.MASONRY;
  fbox(0, 0, fl2, eave - 0.1, UW, UD, C.wall, { top: shade(C.roof, 0.6) });
  const ubays = [1, ...Array(7).fill(1.25), 1];
  const tot = ubays.reduce((a, b) => a + b, 0);
  const cols = [-UW / 2];
  for (const b of ubays) cols.push(cols[cols.length - 1] + (b / tot) * UW);
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const u = (cols[i] + cols[i + 1]) / 2, w = cols[i + 1] - cols[i];
      const chai = i === 0 || i === 8;
      fbox(u, s * (UD / 2 + 0.03), fl2 + (chai ? 0.8 : 0.05), fl2 + 2.3, w * (chai ? 0.45 : 0.62), 0.08, C.door);
      fbox(u, s * (UD / 2 + 0.04), fl2 + 2.3, fl2 + 2.42, w * 0.7, 0.08, C.trim);
    }
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) { const p = P(s * (UW / 2 + 0.03), (i - 0.5) * UD * 0.45); S.box(p[0], p[1], fl2 + 0.8, fl2 + 2.3, 0.08, 1.2, ang, C.door); }
  }
  // pilasters on the upper walls, one on each column line, and a cornice under the eave
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) for (const u of cols) fbox(u, s * (UD / 2 + 0.05), fl2, eave - 0.1, 0.4, 0.12, C.trim);
  fbox(0, 0, eave - 0.35, eave - 0.1, UW + 0.25, UD + 0.25, C.trim);

  // ---- roof: one hipped roof over the upper body only (the gallery is an open terrace), terracotta tiles ----
  S.kind = KIND.TIMBER;
  const over = 0.8;
  // The satellite shows straight hips and plain corners: a slight flare, and the hip ridges end in a short upturn, not
  // the palace horn (đầu đao)
  S.hip(o.c[0], o.c[1], UW, UD, ang, eave, ridgeTop - 0.35 - eave, C.roof, { flare: 0.18, over, ridgeCol: C.ridge, fascia: 0.25, fasciaCol: C.roofDark, hips: true, horns: false, segs: 4 });
  // ridge ornament: a low gourd at the middle and raised ends
  S.kind = KIND.PLAIN;
  const rl = Math.max(0, (UW + 2 * over) / 2 - ((UD + 2 * over) / 2) * 0.92);
  const top = ridgeTop - 0.35;
  for (const s of [-1, 1]) { const p = P(s * rl, 0); S.box(p[0], p[1], top, top + 0.75, 0.6, 0.35, ang, C.ridge); S.box(p[0], p[1], top + 0.75, top + 0.95, 0.4, 0.25, ang, shade(C.ridge, 1.1)); }
  { const p = P(0, 0); S.cyl(p[0], p[1], top, top + 0.3, 0.35, 0.3, 6, C.ridge); S.cyl(p[0], p[1], top + 0.3, top + 0.6, 0.22, 0.05, 6, C.ridge); }

  // ---- the stairs: one flight along each long side, a turn at the corner, up the east end to a landing in the middle ----
  S.kind = KIND.MASONRY;
  const SW = 1.3, sv = D / 2 + SW / 2; // stair centre line just outside the base
  const yMid = fl + (fl2 - fl) * 0.5;
  for (const s of [-1, 1]) {
    // run A: along the long side toward the east end, ground → corner landing
    const u0 = W / 2 - 7.6, u1 = W / 2;
    const nA = 12;
    for (let k = 0; k < nA; k++) {
      const u = u0 + (k + 0.5) * (u1 - u0) / nA, y = g + (yMid - g) * (k + 1) / nA;
      fbox(u, s * sv, g - 0.2, y, (u1 - u0) / nA + 0.02, SW, C.wallLo, { top: shade(C.stone, 1.04), topKind: KIND.ROAD });
    }
    // corner landing
    fbox(W / 2 + SW / 2, s * sv, g - 0.2, yMid, SW, SW, C.wallLo, { top: C.stone, topKind: KIND.ROAD });
    // run B: along the east end toward the middle, corner → gallery
    const v0 = D / 2, v1 = 1.3, nB = 12;
    for (let k = 0; k < nB; k++) {
      const v = v0 - (k + 0.5) * (v0 - v1) / nB, y = yMid + (fl2 - yMid) * (k + 1) / nB;
      fbox(W / 2 + SW / 2, s * v, g - 0.2, y, SW, (v0 - v1) / nB + 0.02, C.wallLo, { top: shade(C.stone, 1.04), topKind: KIND.ROAD });
    }
    // outer balustrade: a sloping coping along both runs
    S.kind = KIND.PLAIN;
    const a0 = P(u0, s * (sv + SW / 2)), a1 = P(u1 + SW, s * (sv + SW / 2));
    S.beam([a0[0], g + 0.9, a0[1]], [a1[0], yMid + 0.9, a1[1]], 0.2, 0.2, C.trim);
    const b0 = P(W / 2 + SW, s * (sv + SW / 2)), b1 = P(W / 2 + SW, s * v1);
    S.beam([b0[0], yMid + 0.9, b0[1]], [b1[0], fl2 + 0.9, b1[1]], 0.2, 0.2, C.trim);
    S.kind = KIND.MASONRY;
  }
  // the landing in the middle of the east end
  fbox(W / 2 + SW / 2, 0, g - 0.2, fl2, SW, 2.6, C.wallLo, { top: C.stone, topKind: KIND.ROAD });
  fbox(W / 2 + 0.25, 0, fl, fl2 - 0.35, 0.5, 2.6, C.wall); // fills the gap between base and landing

  // night: lanterns hung in the gallery
  for (const s of [-1, 1]) for (let i = 1; i < 9; i += 2) { const p = P(cols[i], s * (UD / 2 + 0.5)); lamps.push([p[0], eave - 0.6, p[1]]); }
  return { P, ang, g };
}

// The island's paths the model draws itself: the OSM gallery ring and steps (1346839069, 1346839061, 1346839062) and
// the stubs joining them, all footways on the island; the island court (build) is their ground.
const islandOf = (data) => {
  const c = [-1306.8, -1328.3];
  const poly = (data.ponds || []).find((pl) => pl.length > 1 && pl.slice(1).some((h) => inRing(c[0], c[1], unflat(h))));
  return poly && poly.map(unflat).find((r, i) => i > 0 && inRing(c[0], c[1], r));
};
export function ownWays(data) {
  const island = islandOf(data);
  if (!island) return () => false;
  return (r) => !r[1] && (r[0] | 0) >= 4 && unflat(r[2]).every((p) => inRing(p[0], p[1], island));
}

function shed(S) {
  const o = obb(SHED);
  let g = Infinity;
  for (const [x, z] of SHED) g = Math.min(g, LAND_Y + rise(x, z));
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], g - 0.2, g + 0.3, o.w, o.d, o.a, shade(C.stone, 0.9));
  S.box(o.c[0], o.c[1], g + 0.3, g + 2.6, o.w - 0.4, o.d - 0.4, o.a, shade(C.wall, 0.92), { top: C.roofDark });
  const ux = Math.cos(o.a), uz = Math.sin(o.a);
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) for (const u of [-2.6, 0, 2.6]) { // doors and windows on the long sides
    const x = o.c[0] + u * ux - s * (o.d / 2 - 0.17) * uz, z = o.c[1] + u * uz + s * (o.d / 2 - 0.17) * ux;
    S.box(x, z, g + (u === 0 ? 0.35 : 1.1), g + 2.2, u === 0 ? 1.0 : 0.9, 0.06, o.a, C.door);
  }
  S.kind = KIND.TIMBER;
  S.hip(o.c[0], o.c[1], o.w - 0.4, o.d - 0.4, o.a, g + 2.6, 1.5, C.roof, { over: 0.5, ridgeCol: C.ridge });
  S.base = 0;
}

// the island court: packed earth and brick paving round the archive, as the satellite shows it, in place of lawn
function court(S, island) {
  let lo = Infinity, hi = -Infinity;
  for (const [x, z] of island) { const g = LAND_Y + rise(x, z); lo = Math.min(lo, g); hi = Math.max(hi, g); }
  const c = island.reduce((a, p) => [a[0] + p[0] / island.length, a[1] + p[1] / island.length], [0, 0]);
  const ring = island.map(([x, z]) => { const d = Math.hypot(x - c[0], z - c[1]) || 1, k = Math.max(0, d - 0.6) / d; return [c[0] + (x - c[0]) * k, c[1] + (z - c[1]) * k]; });
  S.base = lo - LAND_Y;
  S.kind = KIND.MASONRY;
  S.prism(ring, lo - 0.1, hi + 0.06, C.coping, C.court, { topKind: KIND.ROAD });
  S.base = 0;
}

// the island's trees join data.trees, so populate plants them with the city's (and off the archive's ground)
function plant(data, island, P) {
  if (!Array.isArray(data.trees)) return;
  const dShore = (x, z) => Math.min(...island.map((a, k) => distSeg(x, z, a, island[(k + 1) % island.length])));
  TREES.forEach(([u, v, sc], k) => {
    const [x, z] = P(u, v);
    if (!inRing(x, z, island) || dShore(x, z) < 1.8) return;
    data.trees.push(Math.round(x * 10), Math.round(z * 10), Math.round(sc * 10), k % 3 === 1 ? 1 : 0);
  });
}

export function build({ data, S, group }) {
  const n0 = S.n;
  const lamps = [];
  const groundY = (x, z) => LAND_Y + rise(x, z);

  // ---------------- hồ Học Hải and its island (from data.ponds: the basin with the archive's island as a hole) ----------------
  const c = [-1306.8, -1328.3];
  const poly = (data.ponds || []).find((pl) => pl.length > 1 && pl.slice(1).some((h) => inRing(c[0], c[1], unflat(h))));
  if (!poly) throw new Error('hồ Học Hải not found in data.ponds');
  const rings = poly.map(unflat);
  const island = rings.find((r, i) => i > 0 && inRing(c[0], c[1], r));
  const wet = (x, z) => inRing(x, z, rings[0]) && !rings.slice(1).some((h) => inRing(x, z, h));

  // ---------------- revetment: stone facing, moss line and coping round the lake's shore and the island ----------------
  S.kind = KIND.MASONRY;
  for (const ring of [rings[0], island]) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 0.3) continue;
      const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, ang = Math.atan2(uz, ux);
      let nx = -uz, nz = ux;
      if (!wet((a[0] + b[0]) / 2 + nx * 0.8, (a[1] + b[1]) / 2 + nz * 0.8)) { nx = -nx; nz = -nz; } // into the water
      const steps = Math.max(1, Math.ceil(L / 18));
      for (let k = 0; k < steps; k++) {
        const t = (k + 0.5) / steps, len = L / steps + 0.25;
        const mx = a[0] + (b[0] - a[0]) * t, mz = a[1] + (b[1] - a[1]) * t;
        if (distSeg(mx, mz, BRIDGE[0], BRIDGE[1]) < 3) continue; // the bridge abutments stand here
        const g = groundY(mx - nx * 1.5, mz - nz * 1.5);
        const at = (d): [number, number] => [mx + nx * d, mz + nz * d];
        let q = at(0.12);
        S.box(q[0], q[1], POND_Y - 0.5, g - 0.02, len, 0.32, ang, C.face);
        q = at(0.3);
        S.box(q[0], q[1], POND_Y - 0.2, POND_Y + 0.3, len, 0.06, ang, C.moss);
        q = at(-0.25);
        S.box(q[0], q[1], g - 0.12, g + 0.1, len, 0.85, ang, C.coping, { topKind: KIND.ROAD });
      }
    }
  }

  // ---------------- the bridge: brick-and-stone beam bridge on the mapped deck profile ----------------
  {
    const road = (data.roads || []).find((r) => r && r[1] && Array.isArray(r[2]) && (() => {
      const p = unflat(r[2]), p0 = p[0], p1 = p[p.length - 1];
      return Math.hypot(p0[0] - BRIDGE[0][0], p0[1] - BRIDGE[0][1]) + Math.hypot(p1[0] - BRIDGE[1][0], p1[1] - BRIDGE[1][1]) < 3 ||
        Math.hypot(p1[0] - BRIDGE[0][0], p1[1] - BRIDGE[0][1]) + Math.hypot(p0[0] - BRIDGE[1][0], p0[1] - BRIDGE[1][1]) < 3;
    })());
    const prof = road && bridgeProfiles(data).get(road[2]);
    const a = BRIDGE[0], b = BRIDGE[1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const flip = road && Math.hypot(road[2][0] / 10 - a[0], road[2][1] / 10 - a[1]) > 3;
    const yAt = prof ? (s) => prof.y(flip ? len - s : s) : (s) => LAND_Y + 0.42 + 1.2 * Math.sin(Math.PI * s / len);
    if (prof) knockOut(S, n0, a, b, 3.4, LAND_Y + 5);
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, ang = Math.atan2(uz, ux);
    const P = (s, t): [number, number] => [a[0] + ux * s - uz * t, a[1] + uz * s + ux * t];
    const Wd = 4.6, thick = 0.55, n = Math.ceil(len / 1.6);
    for (let i = 0; i < n; i++) {
      const s0 = (i * len) / n, s1 = ((i + 1) * len) / n, pa = P(s0, 0), pb = P(s1, 0), y0 = yAt(s0), y1 = yAt(s1);
      S.kind = KIND.MASONRY;
      S.beam([pa[0], y0 - thick / 2, pa[1]], [pb[0], y1 - thick / 2, pb[1]], Wd, thick, C.brick);
      S.kind = KIND.ROAD;
      S.beam([pa[0], y0 + 0.01, pa[1]], [pb[0], y1 + 0.01, pb[1]], Wd - 0.6, 0.04, shade(C.stone, 1.02));
      // parapets: solid plastered walls with a coping
      S.kind = KIND.MASONRY;
      for (const t of [-Wd / 2 + 0.15, Wd / 2 - 0.15]) {
        const qa = P(s0, t), qb = P(s1, t);
        S.beam([qa[0], y0 + 0.35, qa[1]], [qb[0], y1 + 0.35, qb[1]], 0.3, 0.7, C.plaster);
        S.beam([qa[0], y0 + 0.75, qa[1]], [qb[0], y1 + 0.75, qb[1]], 0.4, 0.1, C.coping);
      }
    }
    // piers: masonry, five spans between the abutments
    S.kind = KIND.MASONRY;
    const spans = 6;
    for (let i = 1; i < spans; i++) {
      const s = (i * len) / spans, q = P(s, 0);
      if (!wet(q[0], q[1])) continue;
      S.box(q[0], q[1], POND_Y - 1.5, yAt(s) - thick + 0.02, 0.9, Wd - 0.2, ang, shade(C.face, 1.05));
    }
    // abutments and the four end posts
    for (const [s, dir] of ([[0, 1], [len, -1]] as any[])) {
      const q = P(s + dir * 1.2, 0), y = yAt(s);
      S.box(q[0], q[1], POND_Y - 1.5, y - thick + 0.02, 2.4, Wd + 0.4, ang, C.face);
      for (const t of [-Wd / 2 - 0.1, Wd / 2 + 0.1]) {
        const p = P(s, t);
        S.box(p[0], p[1], y - 0.2, y + 1.5, 0.55, 0.55, ang, C.plaster, { top: C.coping });
        S.cyl(p[0], p[1], y + 1.5, y + 1.85, 0.22, 0.08, 6, C.coping);
      }
    }
  }

  // ---------------- the island court, the archive, the shed, the trees ----------------
  court(S, island);
  const { P } = archive(S, lamps);
  shed(S);
  plant(data, island, P);

  // ---------------- the stele on the north tip of the island ----------------
  {
    const [x, z] = STELE, y = groundY(x, z);
    S.base = y - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(x, z, y - 0.1, y + 0.45, 1.6, 1.0, -0.59, C.stone, { topKind: KIND.ROAD });
    S.box(x, z, y + 0.45, y + 2.0, 1.0, 0.22, -0.59, shade(C.stone, 0.85));
    S.box(x, z, y + 2.0, y + 2.2, 1.15, 0.3, -0.59, shade(C.stone, 0.9));
  }

  S.kind = KIND.PLAIN;
  S.base = 0;
  if (lamps.length) {
    const pos = [], col = [];
    for (const p of lamps) { pos.push(...p); col.push(1, 0.62, 0.3); }
    const pts = glowPoints(pos, col, 4);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
}
