import * as THREE from 'three';
import { Buf, KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { bridgeProfiles } from '../../geo/bridges.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';
import { landTest } from '../boats.js';

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
// Estimated: the number of road spans (8 over the north channel; the press "five spans" cannot fit the photos'
// pier count), truss height and panel count, rail span count (5 + 2), pavilion size and placement (three a side,
// over every second pier), the motorbike lane on the rail bridge's west side.
// The decks themselves (carriageways, pavements) stay the generic slabs of geo/city.js, which traffic rides.
export const id = 'bachho';

// OSM geometry, in model metres (way 1431132252 for the road bridge outline, ways 126788031 / 1111678123 /
// 316199964 for the rail bridges)
const ROAD_A = [-1958, 895], ROAD_B = [-1834, 1142.5]; // centreline over the north channel, bank to islet
const ROAD_W = 24.5;
const RAIL_N = [[-1983, 906], [-1964, 942], [-1931, 1009], [-1875, 1122], [-1848, 1176]]; // Bạch Hổ
const RAIL_S = [[-1767, 1275], [-1692, 1350]]; // Dã Viên rail bridge
const RAIL_S2 = [[-1692, 1350], [-1674, 1365]]; // the short girder span onto the south bank

const WHITE = hex('#e4e6e2'), WHITE_D = hex('#c3c8c6');
const CONC = hex('#c9c3b6'), CONC_D = hex('#a69f92');
const YELLOW = hex('#dba52a'), RIDGE = hex('#f1d77a'), POST = hex('#9c2f22');
const RAILING = hex('#7d8a92');

export function build({ data, S, group }) {
  const rail = LAND_Y + 0.5; // the rail deck top geo/city.js and the trains have always used
  // road deck top: the level of the generic carriageway slabs over this span
  let top = LAND_Y + 0.42;
  const prof = bridgeProfiles(data);
  for (const r of data.roads || []) {
    if (!r[1]) continue;
    const P = prof.get(r[2]);
    const mx = (r[2][0] + r[2][r[2].length - 2]) / 20, mz = (r[2][1] + r[2][r[2].length - 1]) / 20;
    if (P && Math.hypot(mx - (ROAD_A[0] + ROAD_B[0]) / 2, mz - (ROAD_A[1] + ROAD_B[1]) / 2) < 60) { top = P.y(P.len / 2); break; }
  }
  const L = new Buf(4096); // light strips
  const warm = [], warmC = [];

  // ---------- the road bridge: piers, haunched girders, balconies and pavilions ----------
  const ang = Math.atan2(ROAD_B[1] - ROAD_A[1], ROAD_B[0] - ROAD_A[0]);
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const len = Math.hypot(ROAD_B[0] - ROAD_A[0], ROAD_B[1] - ROAD_A[1]);
  const at = (s, v) => [ROAD_A[0] + ux * s - uz * v, ROAD_A[1] + uz * s + ux * v];
  const spans = 8, sl = len / spans;
  const deckBot = top - 1.3; // under the generic slab
  const haunch = Math.max(0.4, Math.min(1.2, deckBot - 0.6));
  const pierW = ROAD_W - 3.5;
  S.kind = KIND.MASONRY;
  for (let k = 1; k < spans; k++) {
    const [x, z] = at(k * sl, 0);
    S.box(x, z, -3, deckBot - haunch + 0.05, 1.8, pierW, ang, CONC, { taper: 0.96 });
    S.box(x, z, deckBot - haunch - 0.4, deckBot - haunch + 0.05, 2.4, pierW + 0.8, ang, CONC_D); // pier cap
    // floodlights wash both faces of every pier
    for (const sg of [-1, 1]) {
      const p = at(k * sl + sg * 1.0, 0);
      L.box(p[0], p[1], 0.05, 0.25, 0.25, pierW * 0.9, ang, [1, 1, 1]);
    }
  }
  // the girders deepen towards each pier: a soffit that reads as a row of shallow arches from the water. The end
  // spans meet the banks, where the girder sits on its abutment: no haunch is drawn over the mapped land
  S.kind = KIND.PLAIN;
  const N = 10, isLand = landTest(data), hw = (ROAD_W - 1.2) / 2;
  for (let k = 0; k < spans; k++) {
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, t = 2 * u - 1;
      const d = haunch * (1 - Math.sqrt(Math.max(0, 1 - t * t)));
      if (d < 0.05) continue;
      const s = k * sl + u * sl;
      if ([-hw, 0, hw].some((v) => isLand(...at(s, v)))) continue;
      const [x, z] = at(s, 0);
      S.box(x, z, deckBot - d, deckBot + 0.02, sl / N + 0.02, ROAD_W - 1.2, ang, CONC, { bottom: true });
    }
  }
  // six lookout pavilions, three a side over every second pier, each on a balcony and a pier column of its own
  for (const k of [2, 4, 6]) for (const side of [-1, 1]) {
    const s = k * sl, off = side * (ROAD_W / 2 + 2.7);
    const [x, z] = at(s, off);
    S.kind = KIND.MASONRY;
    S.box(x, z, -3, top - 0.9, 3.2, 3.4, ang, CONC, { taper: 0.94 }); // the column under the balcony
    S.kind = KIND.PLAIN;
    S.box(x, z, top - 1.0, top, 6.2, 6.0, ang, CONC_D, { top: hex('#b9b2a4'), bottom: true }); // balcony slab
    // balustrade round the three open sides
    const bp = (a, b) => { const p = at(s + a, off + side * b); return p; };
    for (const [a0, b0, a1, b1] of [[-3, 2.9, 3, 2.9], [-3, -0.4, -3, 2.9], [3, -0.4, 3, 2.9]]) {
      const p0 = bp(a0, b0), p1 = bp(a1, b1);
      S.beam([p0[0], top + 0.95, p0[1]], [p1[0], top + 0.95, p1[1]], 0.14, 0.12, RAILING);
      S.beam([p0[0], top + 0.2, p0[1]], [p1[0], top + 0.2, p1[1]], 0.1, 0.4, CONC);
    }
    lookout(S, x, z, ang, top, L);
    warm.push(x, top + 3.4, z); warmC.push(1.0, 0.75, 0.4);
  }

  // ---------- the railway bridges: Warren through trusses ----------
  S.kind = KIND.PLAIN;
  truss(S, RAIL_N, 5, rail);
  truss(S, RAIL_S, 2, rail);
  girder(S, RAIL_S2, rail);

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
  const P = (u, v) => [x + u * ux - v * uz, z + u * uz + v * ux];
  S.kind = KIND.MASONRY;
  S.box(x, z, y0, y0 + 0.3, w + 0.6, w + 0.6, ang, PAL.stone);
  S.kind = KIND.PLAIN;
  const y1 = y0 + 0.3, postH = 2.9;
  for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const q = P((u * w) / 2, (v * w) / 2);
    S.cyl(q[0], q[1], y1, y1 + postH, 0.17, 0.15, 6, POST, { cap: false, rot: ang });
  }
  // a low bench rail between the posts, and the frieze under the eaves
  S.box(x, z, y1 + postH - 0.45, y1 + postH, w + 0.3, w + 0.3, ang, shade(POST, 0.8), { bottom: true });
  for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]]]) {
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
  for (const [hw, yy] of [[w / 2 + 0.7, yr - 0.3], [w2 / 2 + 0.5, y2 + 0.85]]) {
    const C = [P(-hw, -hw), P(hw, -hw), P(hw, hw), P(-hw, hw)];
    for (let i = 0; i < 4; i++) { const a = C[i], b = C[(i + 1) % 4]; L.beam([a[0], yy, a[1]], [b[0], yy, b[1]], 0.12, 0.1, [1, 0.78, 0.42]); }
  }
  S.kind = KIND.PLAIN;
}

function polyLen(pts) { let s = 0; for (let i = 0; i + 1 < pts.length; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return s; }
function along(pts, d) {
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
// verticals at the top nodes, cross girders and lateral bracing overhead. A motorbike lane is hung on the west side.
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
      B(S, b[0], b[P], 0.4, 0.55, WHITE_D); // bottom chord
      B(S, t[1], t[P - 1], 0.42, 0.45, WHITE); // top chord
      B(S, b[0], t[1], 0.42, 0.45, WHITE); B(S, t[P - 1], b[P], 0.42, 0.45, WHITE); // raked end posts
      for (let i = 1; i < P; i++) {
        B(S, t[i], b[i], 0.16, 0.2, WHITE_D); // verticals (hangers)
        // Warren diagonals: down from the top node to the next bottom node, up again
        if (i < P - 1) { if (i % 2) B(S, t[i], b[i + 1], 0.28, 0.3, WHITE); else B(S, b[i], t[i + 1], 0.28, 0.3, WHITE); }
      }
    }
    // overhead: a cross strut at every top node, X bracing between, a portal at each end
    for (let i = 1; i < P; i++) {
      const l = node(s0 + i * pl, -1, yt), r = node(s0 + i * pl, 1, yt);
      B(S, l, r, 0.2, 0.3, WHITE_D);
      if (i < P - 1) { B(S, l, node(s0 + (i + 1) * pl, 1, yt), 0.1, 0.1, WHITE_D); B(S, r, node(s0 + (i + 1) * pl, -1, yt), 0.1, 0.1, WHITE_D); }
    }
    for (const i of [1, P - 1]) {
      const l = node(s0 + i * pl, -1, yt - 1.1), r = node(s0 + i * pl, 1, yt - 1.1);
      B(S, l, r, 0.25, 0.5, WHITE);
    }
  }
}
const B = (S, a, b, w, h, col) => S.beam(a, b, w, h, col);

// a plain plate-girder span on the south-bank end
function girder(S, pts, deck) {
  const a = pts[0], b = pts[1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), an = Math.atan2(b[1] - a[1], b[0] - a[0]);
  S.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, deck - 1.4, deck, l, 5.6, an, WHITE_D, { top: hex('#6d6670'), bottom: true });
  S.kind = KIND.MASONRY;
  S.box(a[0], a[1], -3, deck - 1.4, 3.2, 8.2, an, CONC, { taper: 0.9 });
  S.kind = KIND.PLAIN;
}
