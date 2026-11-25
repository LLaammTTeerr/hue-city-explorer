import * as THREE from 'three';
import { Buf, KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { bridgeProfiles } from '../../geo/bridges.ts';
import { lightMaterial, glowPoints } from '../../geo/materials.ts';
import { landTest } from '../boats.ts';

// Cầu Dã Viên and the railway bridges beside it (docs/places/bachho.md).
//
// What stands here (2026): two separate crossings side by side.
//  - Cầu Dã Viên, the road bridge, begun Dec 2009 and opened 31 Aug / 2 Sep 2012 as "cầu đường bộ Bạch Hổ", renamed
//    Dã Viên in Dec 2012: 542.5 m with its approaches, 24.5 m wide, four lanes and two pavements, six lookout
//    pavilions (vietnamplus.vn, dtinews.vn, mytour.vn). Structurae files it as a girder bridge; OSM tags the
//    north-channel span bridge:structure=beam. Night photo (Commons, 2013): wall piers, haunched girders that read as
//    shallow arches, floodlit piers, each pavilion on a balcony carried by a pier column outboard of the deck.
//    Day photos (Commons, 2013 and 2018): two-tier square pavilions under yellow glazed tiles, red posts.
//  - The 1908 railway bridges, still in service (trains were parked on them as ballast in the Nov 2025 flood,
//    vietbao.vn): Bạch Hổ, 302.1 m, north bank to Cồn Dã Viên, and Dã Viên, 102.7 m, islet to the south bank.
//    Commons photos show white-painted, parallel-chord Warren through trusses with raked end posts on concrete piers.
//    The earlier model's bowed top chords were wrong.
// Placed from the satellite (Google, Nov 2026; docs/places/bachho.md): the six pavilions stand in three facing pairs,
// two pairs over the north channel near each end (55 m and 237 m from the north abutment) and the third where the
// deck leaves Cồn Dã Viên for the south channel; none in mid-channel. Each sits on a ~6.4 m square balcony against
// the deck edge, its centre ~15.8 m off the bridge axis. The bridge and rail lines themselves already matched the
// satellite to ~1 m.
// Estimated: the road piers between the pavilion piers (five equal spans of ~36 m between them, the press "five
// spans", plus one pier near the north bank), truss height and panel count, rail span count (5 + 2), pavilion
// size, the motorbike lane on the rail bridge's west side.
// The road deck over the north channel is drawn here, not by geo/city.js (which leaves the two OSM carriageways' slabs
// and lamps to this file, ownRoads): one undivided four-lane carriageway with a double yellow line, raised
// pavements, a white concrete balustrade and white twin-lantern lamp standards along both edges (Street View, 2025),
// 24.5 m wide on the axis the satellite gives. Its level is the carriageways' profile from geo/bridges.js, which the
// traffic in landmarks/life.js rides: about 2 m above the rail deck beside it, as the Street View shows (the truss's
// top chord stands ~1.5-2 m above a car's camera, its bottom chord hidden below the parapet). Estimated: the lane,
// pavement and balustrade sizes, the lamp spacing and lantern heights (from the two Google-car panos).
export const id = 'bachho';

// the two OSM carriageways of the north-channel span (bridge ways, class 0-1, middle vertex near the span's middle),
// whose generic deck slabs and lamps geo/city.js and landmarks/life.js leave to this file
const own = new WeakMap();
export function ownRoads(data) {
  if (own.has(data)) return own.get(data);
  const out = new Set();
  own.set(data, out);
  for (const r of data.roads || []) {
    if (!Array.isArray(r) || !r[1] || !Array.isArray(r[2]) || r[2].length < 4 || (r[0] | 0) > 1) continue;
    const f = r[2], n = f.length; // the north-channel carriageways are single bank-to-islet chords: their midpoint
    if (Math.hypot((f[0] + f[n - 2]) / 20 + 1896, (f[1] + f[n - 1]) / 20 - 1019) < 40) out.add(f);
  }
  return out;
}

// OSM geometry, in model metres (way 1431132252 for the road bridge outline, ways 126788031 / 1111678123 /
// 316199964 for the rail bridges)
const ROAD_A = [-1958, 895], ROAD_B = [-1834, 1142.5]; // centreline over the north channel, bank to islet
const ROAD_W = 24.5;
const RAIL_N = [[-1983, 906], [-1964, 942], [-1931, 1009], [-1875, 1122], [-1848, 1176]]; // Bạch Hổ
const RAIL_S = [[-1767, 1275], [-1692, 1350]]; // Dã Viên rail bridge (the OSM bridge way)
// the satellite puts the Dã Viên trusses ~10 m further up this line than the OSM way: their north portal stands on
// the islet and their south end at the bank, where a short plate girder carries the track the rest of the way
const RAIL_S_TRUSS = [-11, 94]; // metres along RAIL_S
const RAIL_S2 = [[-1692, 1350], [-1674, 1365]]; // the short girder span onto the south bank (way 316199964)

const WHITE = hex('#e4e6e2'), WHITE_D = hex('#c3c8c6');
const CONC = hex('#c9c3b6'), CONC_D = hex('#a69f92');
const YELLOW = hex('#dba52a'), RIDGE = hex('#f1d77a'), POST = hex('#9c2f22');
// pavilion piers along ROAD_A→ROAD_B (satellite), the river piers between them, and the third pavilion pair where
// the deck leaves the islet (centre and axis from the satellite: the deck's heading there, not this span's)
const PAV_S = [55.5, 237.3];
const PIERS = [19.1, ...Array.from({ length: 6 }, (_, i) => PAV_S[0] + (i * (PAV_S[1] - PAV_S[0])) / 5)];
const PAV_OFF = 15.8; // pavilion centre off the bridge axis
const PAV_AXIS = 1.8; // m east (across the deck) of ROAD_A→ROAD_B: the pavilions' centre line and the deck's real edges
const DECK_T = 1.3; // deck slab under the carriageway (the generic slab's thickness)
const CARR = 15.5, PAVE = 0.22; // carriageway width (four lanes); the pavements' rise above it, each (ROAD_W - CARR) / 2 wide
const ASPHALT = hex('#6f6b68'), PAVEMENT = hex('#bdb9b0'), KERB = hex('#a9a59c');
const PAINT = hex('#f1eee4'), YELLOW_LINE = hex('#e0b43c');
const LAMP = hex('#dcdedb'), LAMP_D = hex('#5d625f'), GLASS = hex('#f4f0e2');
const TRUSS = hex('#d8d4c6'), TRUSS_D = hex('#b7b3a6'); // the trusses' cream-grey paint
const PAV3 = { x: -1760.5, z: 1239.2, ang: Math.atan2(0.699, 0.715) };

export function build({ data, S, group }) {
  const rail = LAND_Y + 0.5; // the rail deck top geo/city.js and the trains have always used
  const L = new Buf(8192); // light strips
  const warm = [], warmC = [];

  // ---------- the road bridge: one deck, piers, haunched girders, balconies and pavilions ----------
  const ang = Math.atan2(ROAD_B[1] - ROAD_A[1], ROAD_B[0] - ROAD_A[0]);
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const len = Math.hypot(ROAD_B[0] - ROAD_A[0], ROAD_B[1] - ROAD_A[1]);
  const at = (s, v): [number, number] => [ROAD_A[0] + ux * s - uz * v, ROAD_A[1] + uz * s + ux * v]; // v > 0 west of ROAD_A→ROAD_B
  const ax = (s, v) => at(s, v - PAV_AXIS); // across the real deck, from its axis
  // the deck's level along the span: the profile geo/bridges.js gives the two OSM carriageways (the same curve the
  // traffic in landmarks/life.js rides), measured along ROAD_A→ROAD_B from where the way starts
  const prof = bridgeProfiles(data);
  const proj = (p) => (p[0] - ROAD_A[0]) * ux + (p[1] - ROAD_A[1]) * uz;
  let deck = null;
  for (const f of ownRoads(data)) {
    const P = prof.get(f);
    if (!P) continue;
    const s0 = proj([f[0] / 10, f[1] / 10]), s1 = proj([f[f.length - 2] / 10, f[f.length - 1] / 10]);
    if (s1 > s0) { deck = { P, s0, s1 }; break; }
  }
  if (!deck) throw new Error('Dã Viên carriageways not found');
  const deckY = (s) => deck.P.y(Math.max(0, Math.min(deck.P.len, s - deck.s0)));
  const sA = deck.s0, sB = deck.s1;
  const sup = [0, ...PIERS, len]; // supports: abutments and piers
  const deckBot = (s) => deckY(s) - DECK_T;
  const haunch = 1.2;
  const pierW = ROAD_W - 3.5;
  const isLand = landTest(data);

  // the deck itself (Street View, the satellite): one four-lane carriageway with a double yellow centre line, raised
  // pavements and a white balustrade along both edges, ROAD_W wide on the bridge's real axis
  const st = [];
  for (let n = Math.max(2, Math.ceil((sB - sA) / 2)), i = 0; i <= n; i++) st.push(sA + ((sB - sA) * i) / n);
  const P3 = (s, v, dy) => { const [x, z] = ax(s, v); return [x, deckY(s) + dy, z]; };
  const strip = (v0, v1, dy, col, from = sA, to = sB) => { // a level band across [v0, v1], dy above the carriageway
    for (let i = 0; i + 1 < st.length; i++) {
      const a = Math.max(st[i], from), b = Math.min(st[i + 1], to);
      if (b - a < 0.01) continue;
      S.quad(P3(a, v0, dy), P3(a, v1, dy), P3(b, v1, dy), P3(b, v0, dy), col, [0, 1, 0]);
    }
  };
  const wall = (v, dy0, dy1, col, out) => { // a face along the deck at v, facing out (+1 west, -1 east)
    const n = [-uz * out, 0, ux * out];
    for (let i = 0; i + 1 < st.length; i++) { const a = st[i], b = st[i + 1]; S.quad(P3(a, v, dy0), P3(b, v, dy0), P3(b, v, dy1), P3(a, v, dy1), col, n); }
  };
  const hw = ROAD_W / 2;
  S.kind = KIND.ROAD;
  strip(-CARR / 2, CARR / 2, 0, ASPHALT);
  strip(-hw, -CARR / 2, PAVE, PAVEMENT); strip(CARR / 2, hw, PAVE, PAVEMENT);
  // markings: the double yellow line, white lane dashes and edge lines
  strip(-0.27, -0.12, 0.012, YELLOW_LINE); strip(0.12, 0.27, 0.012, YELLOW_LINE);
  for (const v of [-CARR / 2 + 0.35, CARR / 2 - 0.35]) strip(v - 0.08, v + 0.08, 0.012, PAINT);
  for (let s = sA + 6; s + 3 < sB - 4; s += 9) for (const v of [-CARR / 4, CARR / 4]) strip(v - 0.08, v + 0.08, 0.012, PAINT, s, s + 3);
  S.kind = KIND.PLAIN;
  wall(-CARR / 2, 0, PAVE, KERB, 1); wall(CARR / 2, 0, PAVE, KERB, -1); // kerbs
  wall(-hw, -DECK_T, -0.35, CONC, -1); wall(hw, -DECK_T, -0.35, CONC, 1);
  wall(-hw, -0.35, PAVE, WHITE_D, -1); wall(hw, -0.35, PAVE, WHITE_D, 1); // the white edge beam
  // the soffit, facing down; none where the deck's ends run onto the banks and its underside is in the ground
  for (let i = 0; i + 1 < st.length; i++) { const a = st[i], b = st[i + 1]; if (Math.min(deckBot(a), deckBot(b)) < LAND_Y - 0.5) continue; S.quad(P3(a, -hw, -DECK_T), P3(a, hw, -DECK_T), P3(b, hw, -DECK_T), P3(b, -hw, -DECK_T), CONC_D, [0, -1, 0]); }
  for (const [s, o] of ([[sA, -1], [sB, 1]] as any[])) S.quad(P3(s, -hw, -DECK_T), P3(s, hw, -DECK_T), P3(s, hw, PAVE), P3(s, -hw, PAVE), CONC, [ux * o, 0, uz * o]);
  // the balustrade: square posts every ~3 m, balusters between, a capped rail; open to each pavilion's balcony
  const open = (s) => PAV_S.some((p) => Math.abs(s - p) < 3.2);
  for (const side of [-1, 1]) {
    const v = side * (hw - 0.2);
    const n = Math.round((sB - sA - 1) / 3);
    const posts = Array.from({ length: n + 1 }, (_, i) => sA + 0.5 + ((sB - sA - 1) * i) / n);
    for (let i = 0; i < posts.length; i++) {
      const s = posts[i];
      if (!open(s)) S.box(...ax(s, v), deckY(s) + PAVE, deckY(s) + PAVE + 1.15, 0.34, 0.34, ang, WHITE, { top: WHITE });
      if (i + 1 === posts.length) break;
      const s2 = posts[i + 1];
      if (open(s) || open(s2)) continue;
      const p = P3(s, v, PAVE), q = P3(s2, v, PAVE);
      S.beam([p[0], p[1] + 0.15, p[2]], [q[0], q[1] + 0.15, q[2]], 0.3, 0.3, WHITE_D); // the base
      S.beam([p[0], p[1] + 1.02, p[2]], [q[0], q[1] + 1.02, q[2]], 0.26, 0.14, WHITE); // the rail
      for (let k = 1; k < 6; k++) {
        const t = k / 6, b = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
        S.beam([b[0], b[1] + 0.3, b[2]], [b[0], b[1] + 0.95, b[2]], 0.09, 0.09, WHITE);
      }
    }
  }
  // lamp standards in facing pairs on both pavements, near the kerb: a white pole on a fluted base, one lantern on a
  // scrolled arm over the road and a lower one over the pavement (Street View, 2025)
  for (let k = -2; k < 9; k++) {
    const s = PAV_S[0] + (k + 0.5) * ((PAV_S[1] - PAV_S[0]) / 6);
    if (s < sA + 8 || s > sB - 8 || PAV_S.some((p) => Math.abs(s - p) < 6)) continue;
    for (const side of [-1, 1]) lamp(S, ax(s, side * (CARR / 2 + 0.7)), deckY(s) + PAVE, [-uz * side, ux * side], L, warm, warmC);
  }

  S.kind = KIND.MASONRY;
  for (const sp of PIERS) {
    const [x, z] = ax(sp, 0);
    if (isLand(x, z)) continue; // the mapped bank reaches further out than the real one here: no pier on land
    const yb = deckBot(sp) - haunch;
    S.box(x, z, -3, yb + 0.05, 1.8, pierW, ang, CONC, { taper: 0.96 });
    S.box(x, z, yb - 0.4, yb + 0.05, 2.4, pierW + 0.8, ang, CONC_D); // pier cap
    // floodlights wash both faces of every pier
    for (const sg of [-1, 1]) {
      const p = ax(sp + sg * 1.0, 0);
      L.box(p[0], p[1], 0.05, 0.25, 0.25, pierW * 0.9, ang, [1, 1, 1]);
    }
  }
  // the girders deepen towards each pier under the whole width of the deck: a soffit that reads as a row of shallow
  // arches from the water. The end spans meet the banks, where the girder sits on its abutment: no haunch over land
  S.kind = KIND.PLAIN;
  const N = 10, gw = ROAD_W - 1.2;
  for (let k = 0; k + 1 < sup.length; k++) {
    const sl = sup[k + 1] - sup[k];
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, t = 2 * u - 1;
      const d = haunch * (1 - Math.sqrt(Math.max(0, 1 - t * t)));
      if (d < 0.05) continue;
      const s = sup[k] + u * sl;
      if ([-gw / 2, 0, gw / 2].some((v) => isLand(...ax(s, v)))) continue;
      const [x, z] = ax(s, 0);
      S.box(x, z, deckBot(s) - d, deckBot(s) + 0.02, sl / N + 0.02, gw, ang, CONC, { bottom: true });
    }
  }
  // six lookout pavilions in facing pairs, each on a balcony and a pier column of its own: two pairs over the north
  // channel, the third where the deck leaves the islet (its deck height from that span's own profile)
  let top3 = LAND_Y + 0.42;
  for (const r of data.roads || []) {
    const P = r[1] && prof.get(r[2]);
    if (!P) continue;
    const f = r[2], i = f.length - 2;
    for (const [k, s] of ([[0, 0], [i, P.len]] as any[])) {
      const d = Math.hypot(f[k] / 10 - PAV3.x, f[k + 1] / 10 - PAV3.z);
      if (d < 12) { top3 = Math.max(LAND_Y + 0.42, P.y(Math.abs(s - Math.min(P.len, d)))); }
    }
  }
  // pairs 1-2 stand on the deck's real axis (PAV_AXIS east of ROAD_A→ROAD_B), their balconies level with the
  // pavement and open to it from the deck edge out
  const pavs = [];
  for (const s of PAV_S) for (const side of [-1, 1]) pavs.push({ c: ax(s, 0), a: ang, side, top: deckY(s) + PAVE, inner: hw });
  for (const side of [-1, 1]) pavs.push({ c: [PAV3.x, PAV3.z], a: PAV3.ang, side, top: top3, inner: PAV_OFF - 3.2 });
  for (const { c, a, side, top, inner } of pavs) {
    const vx = -Math.sin(a), vz = Math.cos(a), ax = Math.cos(a), az = Math.sin(a);
    const at = (s, v): [number, number] => [c[0] + ax * s + vx * v, c[1] + az * s + vz * v];
    const off = side * PAV_OFF, ang = a;
    const [x, z] = at(0, off);
    const outer = PAV_OFF + 3.2, depth = outer - inner, [bx, bz] = at(0, side * (inner + outer) / 2);
    S.kind = KIND.MASONRY;
    S.box(x, z, -3, top - 0.9, 3.2, 3.4, ang, CONC, { taper: 0.94 }); // the column under the balcony
    S.kind = KIND.PLAIN;
    S.box(bx, bz, top - 1.0, top, 6.4, depth, ang, CONC_D, { top: hex('#b9b2a4'), bottom: true }); // balcony slab
    S.box(bx, bz, top - 1.0, top - 0.8, 6.7, depth + 0.3, ang, WHITE_D, { bottom: true }); // projecting white fascia
    // balustrade round the three open sides
    const bp = (a, b) => at(a, off + side * b);
    const b0 = inner - PAV_OFF + 0.2, b1 = 2.95;
    for (const [a0, c0, a1, c1] of ([[-3.05, b1, 3.05, b1], [-3.05, b0, -3.05, b1], [3.05, b0, 3.05, b1]] as any[])) {
      const p0 = bp(a0, c0), p1 = bp(a1, c1);
      // white concrete balustrade as on the deck (Street View): capped top rail, low solid base, posts every ~1.2 m
      S.beam([p0[0], top + 1.0, p0[1]], [p1[0], top + 1.0, p1[1]], 0.2, 0.12, WHITE);
      S.beam([p0[0], top + 0.3, p0[1]], [p1[0], top + 0.3, p1[1]], 0.14, 0.4, WHITE_D);
      const n = Math.max(1, Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 1.2));
      for (let i = 0; i <= n; i++) {
        const q = [p0[0] + ((p1[0] - p0[0]) * i) / n, p0[1] + ((p1[1] - p0[1]) * i) / n];
        S.cyl(q[0], q[1], top, top + 1.0, 0.09, 0.08, 6, WHITE, { cap: false });
      }
    }
    lookout(S, x, z, ang, top, L);
    warm.push(x, top + 3.4, z); warmC.push(1.0, 0.75, 0.4);
  }

  // ---------- the railway bridges: Warren through trusses ----------
  S.kind = KIND.PLAIN;
  truss(S, RAIL_N, 5, rail);
  const railS = [null, along(RAIL_S, RAIL_S_TRUSS[0], true).p, along(RAIL_S, RAIL_S_TRUSS[1], true).p];
  truss(S, [railS[1], railS[2]], 2, rail);
  girder(S, [railS[2], RAIL_S[1]], rail); // the track from the trusses' south end over the bank to the end of the way
  // the short span onto the south bank only while the data has it as a bridge: it crosses no water, and
  // build-data now lays such a rail way at grade, a level crossing rather than a girder on the street it meets
  const near = (f, k, p) => Math.hypot(f[k] / 10 - p[0], f[k + 1] / 10 - p[1]) < 3;
  const s2 = (data.rails || []).some(([, br, f]) => br && f.length === 4 && ((near(f, 0, RAIL_S2[0]) && near(f, 2, RAIL_S2[1])) || (near(f, 0, RAIL_S2[1]) && near(f, 2, RAIL_S2[0]))));
  if (s2) girder(S, RAIL_S2, rail);

  if (L.n) {
    const mesh = new THREE.Mesh(L.geometry(), lightMaterial(0xfff4e0, 1.5));
    mesh.renderOrder = 19;
    mesh.userData.landmark = id;
    group.add(mesh);
  }
  if (warm.length) {
    const g = glowPoints(warm, warmC, 7);
    g.userData.glow = true;
    g.userData.landmark = id;
    group.add(g);
  }
  S.kind = KIND.PLAIN;
}

// An open square lookout: four red posts on a low stone base, two tiers of yellow glazed roof with gilt ridges.
function lookout(S, x, z, ang, y0, L) {
  const w = 4.4, ux = Math.cos(ang), uz = Math.sin(ang);
  const P = (u, v): [number, number] => [x + u * ux - v * uz, z + u * uz + v * ux];
  S.kind = KIND.MASONRY;
  S.box(x, z, y0, y0 + 0.15, w + 1.2, w + 1.2, ang, PAL.stone);
  S.box(x, z, y0 + 0.15, y0 + 0.3, w + 0.6, w + 0.6, ang, PAL.stone);
  S.kind = KIND.PLAIN;
  const y1 = y0 + 0.3, postH = 2.9;
  for (const [u, v] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as any[])) {
    const q = P((u * w) / 2, (v * w) / 2);
    S.cyl(q[0], q[1], y1, y1 + postH, 0.17, 0.15, 6, POST, { cap: false, rot: ang });
  }
  // a low bench rail between the posts, and the frieze under the eaves
  S.box(x, z, y1 + postH - 0.45, y1 + postH, w + 0.3, w + 0.3, ang, shade(POST, 0.8), { bottom: true });
  for (const [a, b] of ([[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]]] as any[])) {
    const p = P((a[0] * w) / 2, (a[1] * w) / 2), q = P((b[0] * w) / 2, (b[1] * w) / 2);
    S.beam([p[0], y1 + 0.5, p[1]], [q[0], y1 + 0.5, q[1]], 0.14, 0.1, shade(POST, 0.85));
  }
  S.kind = KIND.TIMBER;
  const yr = y1 + postH;
  const eave = { fascia: 0.25, fasciaCol: shade(POST, 0.75), ridgeCol: RIDGE, hips: true, glazed: true, segs: 2 };
  S.hip(x, z, w, w, ang, yr, 1.3, YELLOW, { flare: 0.55, over: 1.0, ...eave, ridgeCol: null });
  const w2 = w * 0.62, y2 = yr + 0.75;
  S.box(x, z, y2, y2 + 1.1, w2, w2, ang, POST);
  S.hip(x, z, w2, w2, ang, y2 + 1.1, 1.5, YELLOW, { flare: 0.55, over: 0.8, ...eave });
  // a gilt finial on the top
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y2 + 2.5, y2 + 3.2, 0.22, 0.05, 6, RIDGE);
  // night: a warm line under each eave
  for (const [hw, yy] of ([[w / 2 + 0.7, yr - 0.3], [w2 / 2 + 0.5, y2 + 0.85]] as any[])) {
    const C = [P(-hw, -hw), P(hw, -hw), P(hw, hw), P(-hw, hw)];
    for (let i = 0; i < 4; i++) { const a = C[i], b = C[(i + 1) % 4]; L.beam([a[0], yy, a[1]], [b[0], yy, b[1]], 0.12, 0.1, [1, 0.78, 0.42]); }
  }
  S.kind = KIND.PLAIN;
}

// A lamp standard on the deck: a fluted base, a slim white pole ~7.6 m tall, a cross-arm with a scrolled bracket
// carrying a bell lantern out over the road, and a lower bracket with a second lantern over the pavement.
// out: unit vector across the deck towards the balustrade.
function lamp(S, [x, z], y, out, L, warm, warmC) {
  const [ox, oz] = out, P = (d, h) => [x + ox * d, y + h, z + oz * d];
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 1.1, 0.26, 0.2, 8, LAMP);
  S.cyl(x, z, y + 1.1, y + 7.6, 0.13, 0.075, 6, LAMP, { cap: false });
  S.beam(P(-1.35, 6.95), P(0.45, 6.95), 0.08, 0.1, LAMP); // cross-arm
  S.beam(P(-0.75, 6.95), P(0, 6.3), 0.05, 0.05, LAMP); // its bracket
  S.beam(P(0, 4.5), P(0.95, 4.5), 0.07, 0.08, LAMP); // the lower arm
  S.beam(P(0.55, 4.5), P(0, 4.0), 0.05, 0.05, LAMP);
  for (const [d, h] of ([[-1.35, 6.95], [0.95, 4.5]] as any[])) {
    const [lx, , lz] = P(d, 0);
    S.cyl(lx, lz, y + h - 0.35, y + h - 0.05, 0.36, 0.08, 8, LAMP_D); // bell
    S.cyl(lx, lz, y + h - 0.6, y + h - 0.35, 0.16, 0.2, 6, GLASS);
    L.box(lx, lz, y + h - 0.6, y + h - 0.36, 0.3, 0.3, 0, [1, 0.86, 0.6]);
    warm.push(lx, y + h - 0.5, lz); warmC.push(1.0, 0.8, 0.5);
  }
}

function polyLen(pts) { let s = 0; for (let i = 0; i + 1 < pts.length; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return s; }
function along(pts, d, extend = false) {
  if (extend && (d < 0 || d > polyLen(pts))) { // past either end: straight on along the end segment
    const [a, b] = d < 0 ? [pts[0], pts[1]] : [pts[pts.length - 2], pts[pts.length - 1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]), an = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const o = d < 0 ? a : b, t = d < 0 ? d : d - polyLen(pts);
    return { p: [o[0] + Math.cos(an) * t, o[1] + Math.sin(an) * t], a: an, l };
  }
  let s = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s + l >= d && l > 0) { const t = (d - s) / l; return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], a: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    s += l;
  }
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  return { p: b, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

// The 1908 truss spans: deck slab, piers, and one parallel-chord Warren truss a side per span, with raked end posts,
// a vertical at every panel point, laced built-up diagonals, cross girders and X bracing overhead. A motorbike lane is hung on the west side.
function truss(S, pts, spans, deck) {
  const len = polyLen(pts), sl = len / spans, half = 2.6, H = 6.0;
  const node = (s, side, y) => { const { p, a } = along(pts, Math.min(len - 0.01, Math.max(0.01, s))); return [p[0] - Math.sin(a) * side * half, y, p[1] + Math.cos(a) * side * half]; };
  // the deck and the lane, piece by piece along the line
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), an = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    S.box(cx, cz, deck - 1.2, deck, l + 0.1, 5.6, an, hex(PAL.rail), { top: hex('#6d6670'), bottom: true });
    const ox = -Math.sin(an) * 3.7, oz = Math.cos(an) * 3.7; // west of a line heading south-east
    S.box(cx + ox, cz + oz, deck - 0.5, deck - 0.2, l + 0.1, 1.8, an, CONC, { bottom: true });
    const rx = -Math.sin(an) * 4.55, rz = Math.cos(an) * 4.55;
    S.beam([a[0] + rx, deck + 0.75, a[1] + rz], [b[0] + rx, deck + 0.75, b[1] + rz], 0.08, 0.08, WHITE_D);
  }
  for (let k = 0; k <= spans; k++) {
    const { p, a } = along(pts, Math.min(len - 0.01, Math.max(0.01, k * sl)));
    S.kind = KIND.MASONRY;
    if (k > 0 && k < spans) {
      // a pier under the meeting of two trusses: a tapered shaft with a rounded-off cap
      S.box(p[0], p[1], -3, deck - 1.2, 3.2, 8.2, a, CONC, { taper: 0.9 });
      S.box(p[0], p[1], deck - 1.6, deck - 1.2, 3.8, 8.8, a, CONC_D);
    }
    S.kind = KIND.PLAIN;
  }
  const P = 2 * Math.max(3, Math.round(sl / 12)); // panels per span, ~6 m each, an even count for the Warren pattern
  for (let k = 0; k < spans; k++) {
    const s0 = k * sl + 0.6, pl = (sl - 1.2) / P;
    const yb = deck + 0.2, yt = deck + H;
    for (const side of [-1, 1]) {
      const b = [], t = [];
      for (let i = 0; i <= P; i++) { b.push(node(s0 + i * pl, side, yb)); t.push(node(s0 + i * pl, side, yt)); }
      B(S, b[0], b[P], 0.5, 0.75, TRUSS_D); // bottom chord
      B(S, t[1], t[P - 1], 0.55, 0.65, TRUSS); // top chord
      laced(S, b[0], t[1]); laced(S, t[P - 1], b[P]); // raked end posts
      for (let i = 1; i < P; i++) {
        B(S, t[i], b[i], 0.34, 0.4, TRUSS_D); // a vertical at every panel point
        // Warren diagonals: down from the top node to the next bottom node, up again
        if (i < P - 1) { if (i % 2) laced(S, t[i], b[i + 1]); else laced(S, b[i], t[i + 1]); }
      }
    }
    // overhead: a cross strut at every top node, X bracing between, a portal at each end
    for (let i = 1; i < P; i++) {
      const l = node(s0 + i * pl, -1, yt), r = node(s0 + i * pl, 1, yt);
      B(S, l, r, 0.25, 0.35, TRUSS_D);
      if (i < P - 1) { B(S, l, node(s0 + (i + 1) * pl, 1, yt), 0.18, 0.18, TRUSS_D); B(S, r, node(s0 + (i + 1) * pl, -1, yt), 0.18, 0.18, TRUSS_D); }
    }
    for (const i of [1, P - 1]) {
      const l = node(s0 + i * pl, -1, yt - 1.1), r = node(s0 + i * pl, 1, yt - 1.1);
      B(S, l, r, 0.3, 0.6, TRUSS);
    }
  }
}
// a built-up laced member in the truss's plane: two flanges ~0.6 m apart with zigzag lacing bars between them
function laced(S, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz);
  const hl = Math.hypot(dx, dz) || 1;
  // in-plane normal to the member: perpendicular to it within the vertical plane through a and b
  const n = [(-dx / hl) * (dy / l), hl / l, (-dz / hl) * (dy / l)], o = 0.3;
  const off = (p, k): [number, number, number] => [p[0] + n[0] * o * k, p[1] + n[1] * o * k, p[2] + n[2] * o * k];
  B(S, off(a, -1), off(b, -1), 0.36, 0.12, TRUSS);
  B(S, off(a, 1), off(b, 1), 0.36, 0.12, TRUSS);
  const m = Math.max(2, Math.round(l / 0.9));
  for (let i = 0; i < m; i++) {
    const p = (t): [number, number, number] => [a[0] + dx * t, a[1] + dy * t, a[2] + dz * t];
    B(S, off(p(i / m), i % 2 ? 1 : -1), off(p((i + 1) / m), i % 2 ? -1 : 1), 0.07, 0.05, TRUSS_D);
  }
}
const B = (S, a, b, w, h, col?) => S.beam(a, b, w, h, col);

// a plain plate-girder span on the south-bank end
function girder(S, pts, deck) {
  const a = pts[0], b = pts[1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), an = Math.atan2(b[1] - a[1], b[0] - a[0]);
  S.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, deck - 1.4, deck, l, 5.6, an, WHITE_D, { top: hex('#6d6670'), bottom: true });
  S.kind = KIND.MASONRY;
  S.box(a[0], a[1], -3, deck - 1.4, 3.2, 8.2, an, CONC, { taper: 0.9 });
  S.kind = KIND.PLAIN;
}
