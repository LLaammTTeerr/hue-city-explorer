import * as THREE from 'three';
import { KIND, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints } from '../../geo/materials.js';

// ---- Trung tâm Nghệ thuật Điềm Phùng Thị (Điềm Phùng Thị Art Centre), 17 Lê Lợi, on the Hương river bank ----
//
// Sources (fetched Nov 2026; notes in docs/places/diemphungthi.md):
//  - huengaynay.vn (Báo Thừa Thiên Huế), "Trung tâm nghệ thuật Điềm Phùng Thị về nhà mới" and the English "Diem Phung
//    Thi Arts Center reopens to visitors" (2018): moved in April 2018 from 1 Phan Bội Châu to 17 Lê Lợi, the former
//    Festival Centre office; a two-storey French-style building whose inside, tiled roof, garden and paths were
//    renovated; the fence round it was taken down to open the view; two floors inside plus an outdoor display that
//    keeps the works shown outside at Phan Bội Châu ("Chào đón", "Lớn và nhỏ", "Trẻ em").
//  - hanhtrinhdulich.vn, luhanhvietnam.com.vn: a French villa built in 1940, one of the 27 listed French buildings
//    of Huế; over 400 m² indoors on two floors; an outdoor court of about 1,500 m² with 15 works and groups in stone,
//    concrete, bronze and composite, and stone benches cut to the sculptor's modules.
//  - OpenStreetMap way 118540998 (the building, tourism=museum): a 19.8 x 10.3 m body running from the river to
//    Lê Lợi, 12.3 m wide at the street end where a 2 m bay projects on the north-east side. The footways round it
//    (the park path on the north-east, the riverside walk, the diagonal path with its round plot on the south-west)
//    bound the garden.
//  - The city height survey: 12.0 m to the ridge (public/data/hue.json).
// Estimated: wall colour (Huế lime-wash ochre with white trim, as the town's other French buildings), the roof
// layout (a hipped main roof and a cross-hipped street pavilion), the porch and balcony, the window bays, the
// path layout, and the form and placing of the sculptures (abstractions of her seven modules: half-discs, arcs,
// quarter-discs and bars).

export const id = 'diemphungthi';

// the outline in its own frame: F (63.8, 208.8) is the west corner; u runs along the long side toward Lê Lợi
// (south-east), v along the river end toward the park (north-east)
const F0 = [63.8, 208.8];
const U = [0.6657, 0.7463], V = [0.7497, -0.662];
const LEN = 19.85, WID = 10.3, BAY0 = 13.0, BAYW = 2.0; // the north-east bay: u 13.0 .. 19.85, v 10.3 .. 12.3
// the garden, inside the footways that bound it (model metres)
const GARDEN = [
  [25.0, 204.4], [54.4, 178.9], [66.4, 192.6], [76.2, 184.4], [95.6, 206.8], [105.6, 218.0], [99.0, 224.4],
  [94.6, 229.2], [99.2, 234.4], [75.2, 255.4], [62.0, 241.6], [63.6, 239.0], [63.8, 235.6], [62.4, 232.4],
  [59.6, 230.2], [56.2, 229.6], [53.0, 230.6],
];

const WALL = hex('#e2bf6c'), TRIM = hex('#f1ead8'), PLINTH = hex('#9d968a'), ROOF = PAL.indochineRoof[0];
const DOOR = hex('#4a3626'), GLASS = hex('#26313a'), IRON = hex('#2c2a27');
const LAWN = hex('#93ab66'), PATH = hex('#cfc4ae');
const WHITE = hex('#e8e4da'), GREY = hex('#a7a49c'), BRONZE = hex('#4e4a3c'), LATERITE = hex('#9a5a3e'), BLACK = hex('#2f2e2c');
const gY = (x, z) => LAND_Y + rise(x, z);

export function build({ data, S, group }) {
  const P = (u, v) => [F0[0] + u * U[0] + v * V[0], F0[1] + u * U[1] + v * V[1]];
  const ang = Math.atan2(U[1], U[0]); // box/hip local x = u
  const cM = P(LEN / 2, WID / 2);
  const y0 = gY(cM[0], cM[1]);
  const box = (u, v, ya, yb, w, d, col, o) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ang, col, o); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, o); };
  const lamps = [];

  // ---- no generated houses in the garden: it is lawn, paths and sculptures (one filler house stood there) ----
  if (Array.isArray(data.infill)) {
    const a = data.infill, R = 8, keep = [];
    const near = data.meta?.counts?.infillNear ?? a.length / R;
    let nearKept = 0;
    for (let i = 0; i < a.length / R; i++) {
      if (inRing(a[i * R] / 10, a[i * R + 1] / 10, GARDEN)) continue;
      if (i < near) nearKept++;
      for (let j = 0; j < R; j++) keep.push(a[i * R + j]);
    }
    if (keep.length !== a.length) {
      a.length = 0;
      for (const v of keep) a.push(v);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }

  // ---- the garden: a lawn over the whole court, the paths on it (paved, so trees keep off) ----
  S.base = 0;
  S.kind = KIND.GROUND;
  {
    const ring = GARDEN.map((p) => new THREE.Vector2(p[0], p[1]));
    for (const f of THREE.ShapeUtils.triangulateShape(ring, [])) {
      const t = f.map((i) => { const p = GARDEN[i]; return [p[0], gY(p[0], p[1]) + 0.05, p[1]]; });
      S.tri(t[0], t[1], t[2], LAWN, [0, 1, 0]);
    }
  }
  const paved0 = S.n;
  S.kind = KIND.ROAD;
  const walk = (a, b, w, col = PATH) => { // a straight paved walk between two model points, on its own ground
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const yy = Math.max(gY(a[0], a[1]), gY(b[0], b[1]));
    S.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, yy - 0.1, yy + 0.1, l, w, Math.atan2(dz, dx), col);
  };
  // the forecourt on Lê Lợi and the walk round the building
  walk(P(LEN + 1.2, -2.2), P(LEN + 1.2, WID + BAYW + 2.2), 3.0); // apron along the street front
  walk(P(-1.4, -2.2), P(-1.4, WID + 2.2), 2.4); // the river end
  walk(P(-1.4, -1.6), P(LEN + 1.2, -1.6), 1.8); // south-west side
  walk(P(-1.4, WID + 1.6), P(BAY0, WID + 1.6), 1.8); // north-east side
  walk(P(BAY0 - 0.9, WID + 1.6), P(BAY0 - 0.9, WID + BAYW + 1.6), 1.8);
  walk(P(BAY0 - 0.9, WID + BAYW + 1.6), P(LEN + 1.2, WID + BAYW + 1.6), 1.8);
  // from the street (Lê Lợi pavement) to the door, and from the river end out to the riverside walk
  walk(P(LEN + 1.2, WID / 2 + 1.0), [85.6, 243.0], 3.2);
  walk(P(-1.4, WID / 2), [45.0, 190.0], 2.2);
  // a gravel walk through the sculpture garden on the south-west, from the river walk to the street apron
  walk([33.0, 205.5], [50.0, 220.5], 1.6);
  walk([50.0, 220.5], P(LEN * 0.55, -1.6), 1.6);
  walk([52.0, 233.0], P(LEN + 1.2, -2.2), 1.6);
  (S.paved = S.paved || []).push([paved0, S.n]);

  // ---- the villa: a stone plinth, two lime-washed storeys, a white cornice, Marseille-tile hipped roofs ----
  const pl = 0.7, yp = y0 + pl;
  S.kind = KIND.MASONRY;
  box(LEN / 2, WID / 2, y0 - 0.3, yp, LEN + 0.5, WID + 0.5, PLINTH);
  box((BAY0 + LEN) / 2, WID + BAYW / 2, y0 - 0.3, yp, LEN - BAY0 + 0.5, BAYW + 0.5, PLINTH);
  // walls: the shader draws the arched windows, white surrounds and louvred shutters of KIND.COLONIAL
  const wallH = 7.0, yc = yp + wallH;
  S.base = yp - LAND_Y;
  S.kind = KIND.COLONIAL;
  box(LEN / 2, WID / 2, yp, yc, LEN, WID, WALL);
  box((BAY0 + LEN) / 2, WID + BAYW / 2, yp, yc, LEN - BAY0, BAYW, WALL);
  // the street pavilion stands a little proud of the body on the south-west too
  box((BAY0 + LEN) / 2, -0.25, yp, yc, LEN - BAY0, 0.5, WALL);
  S.kind = KIND.PLAIN;
  // white string course between the storeys, corner quoins, the cornice
  const ring1 = (y, h, grow, col) => {
    box(LEN / 2, WID / 2, y, y + h, LEN + grow, WID + grow, col);
    box((BAY0 + LEN) / 2, WID + BAYW / 2, y, y + h, LEN - BAY0 + grow, BAYW + grow, col);
    box((BAY0 + LEN) / 2, -0.25, y, y + h, LEN - BAY0 + grow, 0.5 + grow, col);
  };
  ring1(yp + 3.4, 0.22, 0.14, TRIM);
  ring1(yc - 0.1, 0.45, 0.4, TRIM);
  for (const [u, v] of [[0, 0], [0, WID], [BAY0, WID], [LEN, WID + BAYW], [LEN, -0.5], [BAY0, -0.5]]) box(u, v, yp, yc - 0.1, 0.55, 0.55, TRIM);

  // ---- the entrance on the street front: steps, a porch on two columns, a balcony with a railing over it ----
  {
    const vu = WID / 2 + 1.0, pw = 4.2, pd = 2.4;
    S.kind = KIND.MASONRY;
    box(LEN + pd / 2, vu, y0 - 0.2, yp, pd, pw, PLINTH, { top: TRIM });
    for (let k = 1; k <= 3; k++) box(LEN + pd + 0.3 * (k - 0.5), vu, y0 - 0.2, yp - (pl / 4) * k, 0.3, pw - 0.6, shade(TRIM, 0.95));
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) cyl(LEN + pd - 0.3, vu + s * (pw / 2 - 0.35), yp, yp + 3.3, 0.2, 0.18, 8, TRIM);
    box(LEN + pd / 2, vu, yp + 3.3, yp + 3.6, pd + 0.2, pw + 0.2, TRIM); // the balcony slab
    // the balcony's balustrade
    box(LEN + pd + 0.02, vu, yp + 3.6, yp + 3.7, 0.12, pw, TRIM);
    box(LEN + pd + 0.02, vu, yp + 4.5, yp + 4.62, 0.16, pw + 0.1, TRIM);
    for (let i = -6; i <= 6; i++) box(LEN + pd + 0.02, vu + i * (pw / 13), yp + 3.7, yp + 4.5, 0.1, 0.1, TRIM);
    for (const s of [-1, 1]) {
      box(LEN + pd / 2, vu + s * pw / 2, yp + 4.5, yp + 4.62, pd, 0.16, TRIM);
      for (let i = 0; i < 6; i++) box(LEN + 0.2 + i * (pd / 6), vu + s * pw / 2, yp + 3.7, yp + 4.5, 0.1, 0.1, TRIM);
    }
    // the door (double leaves under a fanlight) and the French window onto the balcony
    box(LEN + 0.03, vu, yp, yp + 2.7, 0.08, 1.8, DOOR);
    box(LEN + 0.04, vu, yp + 2.7, yp + 3.2, 0.08, 1.8, GLASS);
    box(LEN + 0.03, vu, yp + 3.6, yp + 6.0, 0.08, 1.6, shade(DOOR, 1.2));
    box(LEN + 0.04, vu, yp + 6.0, yp + 6.35, 0.08, 1.9, TRIM);
    // the name board over the porch
    box(LEN + pd + 0.12, vu, yp + 3.32, yp + 3.58, 0.06, pw - 0.6, hex('#8a2e24'));
    for (const s of [-1, 1]) { const q = P(LEN + pd + 0.2, vu + s * (pw / 2 - 0.35)); lamps.push([q[0], yp + 3.1, q[1]]); }
  }

  // ---- the roofs: a hipped roof over the body (ridge along the long side), a cross-hipped roof over the street
  //      pavilion meeting it, ridge 12.0 m above the ground (city survey) ----
  const ye = yc + 0.35, ridge = y0 + 12.0;
  {
    const q = P(BAY0 / 2 + 0.2, WID / 2);
    S.hip(q[0], q[1], BAY0 + 3.0, WID, ang, ye, ridge - ye, ROOF, { over: 0.75 });
    const r = P((BAY0 + LEN) / 2, (WID + BAYW - 0.5) / 2);
    const pw = WID + BAYW + 0.5, pd = LEN - BAY0;
    S.hip(r[0], r[1], pw, pd, ang + Math.PI / 2, ye, ridge - ye - 0.15, shade(ROOF, 0.97), { over: 0.75 });
  }
  // two chimneys on the main roof
  S.kind = KIND.MASONRY;
  for (const u of [3.4, 9.6]) box(u, WID / 2 + 1.6, ridge - 2.2, ridge + 0.9, 0.7, 1.0, TRIM, { top: shade(PLINTH, 0.7) });
  S.kind = KIND.PLAIN;

  // ---- the sculpture garden: works built from her seven modules (half-discs, arcs, quarter-discs, bars), in white
  //      concrete, grey stone, laterite and bronze, on low plinths across the lawn; module-shaped stone benches ----
  S.base = 0;
  const works = [
    // [x, z, kind, size, heading, colour]
    [44.0, 199.0, 'arch', 2.6, 0.75, WHITE], // "Chào đón": an open arch facing the river walk
    [37.5, 207.5, 'stack', 2.2, 0.2, WHITE],
    [52.5, 210.5, 'pair', 1.8, 1.4, BRONZE], // "Lớn và nhỏ": a large and a small half-disc
    [46.5, 220.0, 'ring', 1.6, 0.75, GREY],
    [59.0, 222.0, 'kids', 1.1, 2.3, LATERITE], // "Trẻ em": a ring of small figures
    [57.0, 197.0, 'stack', 1.6, 1.1, GREY],
    [66.0, 228.5, 'arch', 1.7, 2.3, BLACK],
    [70.8, 241.0, 'pair', 1.4, 0.2, WHITE],
    [88.0, 204.0, 'ring', 1.3, 2.4, WHITE],
    [97.0, 216.0, 'stack', 1.4, 0.75, LATERITE],
    [69.0, 192.5, 'pair', 1.2, 2.0, GREY],
    [32.0, 203.0, 'kids', 0.9, 0.3, GREY],
  ];
  for (const [x, z, k, s, h, col] of works) sculpture(S, x, z, k, s, h, col);
  for (const [x, z, h] of [[41.0, 211.5, 0.75], [49.0, 203.0, 2.3], [62.0, 214.0, 2.3], [80.0, 238.0, 0.75], [92.0, 225.0, 2.3]]) {
    const yy = gY(x, z);
    vslab(S, x, z, yy, h, half(0.55, 7), 1.8, shade(GREY, 1.08)); // a half-cylinder bench, lying
  }
  // garden lamps along the street apron and the river walk
  for (const [u, v] of [[LEN + 1.2, -2.0], [LEN + 1.2, WID + BAYW + 2.0], [-1.4, -2.0], [-1.4, WID + 2.0]]) {
    const q = P(u, v), yy = gY(q[0], q[1]);
    S.cyl(q[0], q[1], yy, yy + 3.2, 0.07, 0.06, 6, IRON, { cap: false });
    S.cyl(q[0], q[1], yy + 3.2, yy + 3.55, 0.18, 0.14, 6, TRIM);
    lamps.push([q[0], yy + 3.4, q[1]]);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;

  if (lamps.length) {
    const pos = [], col = [];
    for (const p of lamps) { pos.push(...p); col.push(1, 0.8, 0.52); }
    const pts = glowPoints(pos, col, 5);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
}

// ---- helpers ----

// a half-disc profile [a, y] standing on y = 0 (radius r, n segments)
function half(r, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = Math.PI * (i / n); pts.push([r * Math.cos(t), r * Math.sin(t)]); }
  return pts;
}

// a convex profile [[a, y], ...] in the vertical plane through (x, y0, z) along heading h, extruded `t` thick
function vslab(S, x, z, y0, h, prof, t, col) {
  const ca = Math.cos(h), sa = Math.sin(h), nx = -sa, nz = ca;
  const pt = (p, o) => [x + p[0] * ca + nx * o, y0 + p[1], z + p[0] * sa + nz * o];
  let cx = 0, cy = 0;
  for (const p of prof) { cx += p[0] / prof.length; cy += p[1] / prof.length; }
  const n = prof.length;
  for (const o of [-t / 2, t / 2]) {
    const c = pt([cx, cy], o), hint = [nx * Math.sign(o), 0, nz * Math.sign(o)];
    for (let i = 0; i < n; i++) S.tri(c, pt(prof[i], o), pt(prof[(i + 1) % n], o), col, hint);
  }
  for (let i = 0; i < n; i++) {
    const a = prof[i], b = prof[(i + 1) % n];
    const ox = (a[0] + b[0]) / 2 - cx, oy = (a[1] + b[1]) / 2 - cy;
    S.quad(pt(a, -t / 2), pt(b, -t / 2), pt(b, t / 2), pt(a, t / 2), shade(col, 0.94), [ox * ca, oy, ox * sa]);
  }
}

// an arc (part of an annulus, radii r0..r1, angles a0..a1) standing in the vertical plane along heading h
function arc(S, x, z, y0, h, r0, r1, a0, a1, n, t, col) {
  for (let i = 0; i < n; i++) {
    const p = a0 + (a1 - a0) * (i / n), q = a0 + (a1 - a0) * ((i + 1) / n);
    vslab(S, x, z, y0, h, [[r0 * Math.cos(p), r0 * Math.sin(p)], [r1 * Math.cos(p), r1 * Math.sin(p)], [r1 * Math.cos(q), r1 * Math.sin(q)], [r0 * Math.cos(q), r0 * Math.sin(q)]], t, col);
  }
}

// one of the module sculptures on a low plinth
function sculpture(S, x, z, kind, s, h, col) {
  const y0 = gY(x, z), ca = Math.cos(h), sa = Math.sin(h);
  S.kind = KIND.MASONRY;
  S.box(x, z, y0 - 0.1, y0 + 0.3, s * 1.9, s * 1.0, h, shade(GREY, 0.9));
  S.kind = KIND.PLAIN;
  const yb = y0 + 0.3;
  const at = (a) => [x + a * ca, z + a * sa];
  if (kind === 'arch') {
    // two bars carrying a half-ring: the open gesture of welcome
    for (const sg of [-1, 1]) { const q = at(sg * s * 0.62); S.box(q[0], q[1], yb, yb + s * 0.55, s * 0.24, s * 0.3, h, col); }
    arc(S, x, z, yb + s * 0.55, h, s * 0.5, s * 0.74, 0, Math.PI, 7, s * 0.3, col);
  } else if (kind === 'stack') {
    // a block, a half-disc on it, a quarter-disc turned on top
    S.box(x, z, yb, yb + s * 0.45, s * 1.2, s * 0.4, h, col);
    vslab(S, x, z, yb + s * 0.45, h, half(s * 0.55, 8), s * 0.36, col);
    const q = at(s * 0.1);
    vslab(S, q[0], q[1], yb + s * 1.0, h + Math.PI / 2, [[0, 0], ...half(s * 0.45, 8).slice(0, 5)], s * 0.3, shade(col, 0.95));
  } else if (kind === 'pair') {
    const a = at(-s * 0.4), b = at(s * 0.55);
    vslab(S, a[0], a[1], yb, h, half(s * 0.6, 9), s * 0.28, col);
    vslab(S, b[0], b[1], yb, h, half(s * 0.3, 7), s * 0.28, col);
  } else if (kind === 'ring') {
    arc(S, x, z, yb + s * 0.62, h, s * 0.42, s * 0.62, 0, Math.PI * 2, 12, s * 0.3, col);
  } else if (kind === 'kids') {
    // small round-headed figures in a ring
    for (let i = 0; i < 5; i++) {
      const t = h + (i / 5) * Math.PI * 2, px = x + Math.cos(t) * s * 0.6, pz = z + Math.sin(t) * s * 0.3;
      S.cyl(px, pz, yb, yb + s * 0.7, s * 0.15, s * 0.12, 6, col, { cap: false });
      S.cyl(px, pz, yb + s * 0.7, yb + s * 0.95, s * 0.14, s * 0.06, 6, col);
    }
  }
}
