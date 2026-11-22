import { KIND, hex, shade, inRing, rand, signedArea } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { pavilion } from '../citadel.js';
import { LANDINGS } from '../conhen-landings.js';
import { lamp, flushLamps } from '../enclosure.js';

// Cồn Hến, the islet in the Hương River off Vỹ Dạ, as it stands in 2026. Sources and estimates: docs/places/conhen.md.
//
//   shore     the island outline from OSM (the land ring in hue.json, ~1.6 km x 230 m; sources give 1.5 km, widest
//             230 m, 23.9-24.6 ha of land). The 3.2 km precast embankment planned in 2025 has not been built: the banks
//             are drawn as they are, sloping earth and sand down to the water, with concrete bến nước steps here and
//             there (planned kè: thuonghieucongluan.com.vn 2025-08-15, 24hmoney.vn 2025-09-12).
//   village   the houses, lanes and Cầu Phú Lưu come from the shared data (OSM lanes, illustrated infill houses); this
//             file adds the gardens' trees, coconut palms and bamboo along the banks.
//   fields    the lower sandbar to the north (Bồi Thành), about a fifth of the island, is farmed: corn for chè bắp
//             Cồn and vegetable beds (OSM residential landuse 586296682 marks where the village stops).
//   đình      Đình làng Bồi Thành, the communal house, on the frontage of Ưng Bình (position on the street estimated).
//   chùa      Chùa Pháp Hải (7/12 Ưng Bình) at the OSM Buddhist place of worship, with the white Quan Âm statue of
//             OSM node 5314360729 in its riverside court (identification of the OSM node with Pháp Hải estimated).
//   boats     the clam-rakers' sampans (ghe cào hến) tied up at the landings, and white heaps of hến shells.
export const id = 'conhen';
// how far from the place point this builder reads data.trees / data.infill (the island is 1.7 km long); build-data.mjs
// keeps every record within it in hue.json, out of the tiles (default 520 m)
export const dataReach = 880;

// shoreline (metres, x east, z south), from hue.json land[25] (OSM)
const SHORE = [[351, -1464], [358, -1716], [368, -1855], [382, -1966], [394, -2022], [406, -2059], [418, -2106], [429, -2170], [433, -2185], [439, -2187], [445, -2183], [449, -2165], [454, -2138], [477, -2034], [514, -1857], [557, -1637], [564, -1572], [574, -1506], [578, -1468], [578, -1455], [579, -1448], [583, -1363], [583, -1239], [579, -1180], [560, -1011], [551, -944], [546, -832], [540, -794], [532, -760], [514, -695], [506, -669], [493, -647], [463, -609], [440, -576], [434, -563], [430, -561], [428, -564], [429, -570], [438, -587], [442, -603], [445, -618], [443, -632], [436, -651], [421, -682], [411, -717], [392, -782], [385, -816], [382, -850], [387, -904], [384, -934], [381, -947], [378, -964], [376, -988], [377, -1059], [365, -1202]];
// the village (OSM landuse=residential 586296682); north and east of it lie the fields
const VILLAGE = [[377.5, -1883.6], [423.9, -1877.9], [411.3, -1718.1], [443.4, -1715.2], [441.7, -1687.4], [484.6, -1684.5], [493.8, -1661.8], [498.9, -1506.5], [567.4, -1501], [575.9, -1239.7], [539.6, -1243.7], [532.7, -1194.8], [571.1, -1187.4], [569.4, -1173.7], [562.5, -1129.4], [554.5, -1128.2], [543.6, -1083.3], [551.6, -1080.5], [529.3, -959.9], [527.5, -945.7], [550.9, -944.4], [545.7, -832.2], [540.2, -794.4], [531.9, -759.8], [514.2, -694.8], [506.1, -668.6], [493.4, -647.1], [454.3, -649.9], [436, -650.9], [420.8, -681.9], [411, -716.6], [392.1, -782.2], [384.9, -815.6], [382.4, -850.2], [387, -903.5], [384, -933.6], [380.5, -947], [377.7, -964.3], [376.1, -988], [404.4, -990], [403.9, -1050.9], [382.1, -1050.9], [389.5, -1061.1], [407.3, -1064.5], [405.6, -1078.7], [378.1, -1217.5], [369.5, -1314.8], [365.5, -1441.6], [362.6, -1684], [366.1, -1794.9]];

const C = {
  bankTop: hex('#8f7c5c'), bankWet: hex('#5f5545'), sand: hex('#b7a684'),
  concrete: hex('#a39e92'), concreteD: hex('#7d786d'), shell: hex('#e4e0d4'),
  hull: hex('#4f3a2a'), hullBlue: hex('#3e5a6e'), deck: hex('#7d6247'), mat: hex('#b39463'), matD: hex('#977a4e'), pole: hex('#6b5a44'),
  trunk: hex('#857560'), frond: hex('#567536'), frondD: hex('#46632d'), culm: hex('#7f8a3c'), bambooLeaf: hex('#5f7a35'), bambooLeafD: hex('#4c6a2e'),
  soil: hex('#87704f'), corn: hex('#8fa245'), cornD: hex('#6d8a37'), veg: hex('#4f7a3a'), vegD: hex('#3f6430'),
  // đình and chùa
  roof: hex('#8a4a32'), roofP: hex('#7c4a34'), ridge: hex('#d6cbb2'), ochre: hex('#cfa955'), yellow: hex('#dcb64e'), lime: hex('#ece6d6'),
  pave: hex('#b2aa98'), stone: hex('#9a948a'), red: hex('#9b2f22'), white: hex('#efebe2'), lotus: hex('#e8c9c0'), gold: hex('#d8b04a'),
};

const gY = (x, z) => LAND_Y + rise(x, z);
const WATER = 0; // the river surface (boats ride at y 0)

export function build({ data, S }) {
  const ring = SHORE;
  const sgn = signedArea(ring) > 0 ? 1 : -1;
  // outward normal at each shore vertex (mean of the two edges' normals)
  const nrm = ring.map((p, i) => {
    const a = ring[(i + ring.length - 1) % ring.length], b = ring[(i + 1) % ring.length];
    let nx = 0, nz = 0;
    for (const [p0, p1] of [[a, p], [p, b]]) {
      const tx = p1[0] - p0[0], tz = p1[1] - p0[1], l = Math.hypot(tx, tz) || 1;
      nx += (tz * sgn) / l; nz += (-tx * sgn) / l;
    }
    const l = Math.hypot(nx, nz) || 1;
    return [nx / l, nz / l];
  });
  // a point on the shore nearest (x, z): its position, outward normal and tangent
  const shoreAt = (x, z) => {
    let best = null;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const tx = b[0] - a[0], tz = b[1] - a[1], l2 = tx * tx + tz * tz;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * tx + (z - a[1]) * tz) / l2));
      const px = a[0] + tx * t, pz = a[1] + tz * t, d = Math.hypot(px - x, pz - z);
      if (!best || d < best.d) {
        const l = Math.sqrt(l2);
        best = { d, p: [px, pz], n: [(tz * sgn) / l, (-tx * sgn) / l], t: [tx / l, tz / l] };
      }
    }
    return best;
  };
  const shoreDist = (x, z) => shoreAt(x, z).d;

  // ---- the banks: earth and sand sloping from the island's edge into the river, all round ----
  S.kind = KIND.GROUND;
  const BW = 4.5;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length, a = ring[i], b = ring[j], na = nrm[i], nb = nrm[j];
    const ya = gY(a[0], a[1]), yb = gY(b[0], b[1]);
    const mid = (p, n, k) => [p[0] + n[0] * BW * k, p[1] + n[1] * BW * k];
    const a1 = mid(a, na, 0.45), b1 = mid(b, nb, 0.45), a2 = mid(a, na, 1), b2 = mid(b, nb, 1);
    const up = [(na[0] + nb[0]) * 0.4, 1, (na[1] + nb[1]) * 0.4];
    S.quad([a[0], ya + 0.02, a[1]], [b[0], yb + 0.02, b[1]], [b1[0], 1.0, b1[1]], [a1[0], 1.0, a1[1]], C.bankTop, up);
    S.quad([a1[0], 1.0, a1[1]], [b1[0], 1.0, b1[1]], [b2[0], WATER - 0.5, b2[1]], [a2[0], WATER - 0.5, a2[1]], C.bankWet, up);
  }

  // ---- the landings: concrete bến nước steps down the bank, sampans tied up off them, heaps of hến shells ----
  // (positions estimated: the clam boats lie mostly in the narrow eastern arm by Cầu Phú Lưu and round the north end)
  let bi = 0;
  for (const [lx, lz, nBoats, shells] of LANDINGS) {
    const s = shoreAt(lx, lz), [px, pz] = s.p, [nx, nz] = s.n, [tx, tz] = s.t;
    const y0 = gY(px, pz), ang = Math.atan2(nz, nx); // local x points out over the water
    // the steps: eight treads from the top of the bank to the water, between two low cheek walls
    S.kind = KIND.MASONRY;
    const steps = 8, run = BW + 0.6;
    for (let k = 0; k < steps; k++) {
      const u = -0.6 + (run * (k + 0.5)) / steps, yt = y0 - ((y0 - WATER - 0.15) * (k + 1)) / steps;
      S.box(px + nx * u, pz + nz * u, WATER - 0.6, yt, run / steps + 0.02, 2.4, ang, C.concrete, { top: shade(C.concrete, 1.06) });
    }
    for (const sd of [-1, 1]) {
      const a = [px - nx * 0.6 + tx * sd * 1.35, pz - nz * 0.6 + tz * sd * 1.35], b = [px + nx * run + tx * sd * 1.35, pz + nz * run + tz * sd * 1.35];
      S.beam([a[0], y0 + 0.3, a[1]], [b[0], WATER + 0.25, b[1]], 0.3, 0.6, C.concreteD);
    }
    // the shell heap beside the landing, where the clams are boiled and shelled
    if (shells) {
      S.kind = KIND.PLAIN;
      const hx = px - nx * 4 + tx * 4.5, hz = pz - nz * 4 + tz * 4.5;
      S.cyl(hx, hz, gY(hx, hz) - 0.1, gY(hx, hz) + 0.9, 2.2, 0.5, 7, C.shell);
      S.cyl(hx + tx * 2.6, hz + tz * 2.6, gY(hx, hz) - 0.1, gY(hx, hz) + 0.55, 1.5, 0.3, 6, shade(C.shell, 0.94));
    }
    // the boats: side by side off the steps, bows to the bank
    for (let k = 0; k < nBoats; k++, bi++) {
      const off = (k - (nBoats - 1) / 2) * 2.6, out = BW + 4.6 + rand(bi, 3) * 0.8;
      const bx = px + nx * out + tx * off, bz = pz + nz * out + tz * off;
      sampan(S, bx, bz, ang + (rand(bi, 4) - 0.5) * 0.25, bi);
    }
    lamp(px - nx * 1.2 + tx * 1.8, y0 + 3.2, pz - nz * 1.2 + tz * 1.8, [1, 0.78, 0.45], 3);
  }
  // a few more boats strung along the eastern arm, moored singly
  for (const [x, z] of [[586, -1340], [584, -1460], [575, -1560], [559, -1700], [545, -1760], [587, -1220], [576, -1160], [356, -1420], [360, -1640]]) {
    const s = shoreAt(x, z);
    const ang = Math.atan2(s.t[1], s.t[0]) + (rand(bi, 5) < 0.5 ? 0 : Math.PI);
    sampan(S, s.p[0] + s.n[0] * (BW + 3), s.p[1] + s.n[1] * (BW + 3), ang, bi++);
  }

  // ---- what the generated village must keep clear of ----
  const roads = [];
  for (const r of data.roads || []) {
    const pts = r[2];
    if (!pts) continue;
    let on = false;
    for (let i = 0; i < pts.length; i += 2) if (inRing(pts[i] / 10, pts[i + 1] / 10, ring)) { on = true; break; }
    if (on) roads.push({ w: r[0] >= 5 ? 2.2 : r[0] >= 4 ? 4 : 6.5, pts });
  }
  const nearRoad = (x, z, m) => roads.some(({ w, pts }) => {
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i] / 10, az = pts[i + 1] / 10, bx = pts[i + 2] / 10, bz = pts[i + 3] / 10;
      const tx = bx - ax, tz = bz - az, l2 = tx * tx + tz * tz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * tx + (z - az) * tz) / l2));
      if (Math.hypot(ax + tx * t - x, az + tz * t - z) < w / 2 + m) return true;
    }
    return false;
  });
  const houses = [];
  const a = data.infill || [];
  for (let i = 0; i + 7 < a.length; i += 8) {
    const x = a[i] / 10, z = a[i + 1] / 10;
    if (x > 330 && x < 610 && z > -2200 && z < -540 && inRing(x, z, ring)) houses.push([x, z, Math.max(a[i + 2], a[i + 3]) / 20]);
  }
  for (const b of data.bld || []) {
    const r = b[0];
    let cx = 0, cz = 0, n = r.length / 2;
    for (let i = 0; i < r.length; i += 2) { cx += r[i] / 10 / n; cz += r[i + 1] / 10 / n; }
    if (!inRing(cx, cz, ring)) continue;
    let rr = 0;
    for (let i = 0; i < r.length; i += 2) rr = Math.max(rr, Math.hypot(r[i] / 10 - cx, r[i + 1] / 10 - cz));
    houses.push([cx, cz, rr]);
  }
  const nearHouse = (x, z, m) => houses.some(([hx, hz, r]) => Math.hypot(hx - x, hz - z) < r + m);
  const reserved = []; // [x0, z0, x1, z1] boxes the models below take
  const inReserved = (x, z, m = 0) => reserved.some(([x0, z0, x1, z1]) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m);

  // ---- Đình làng Bồi Thành: communal house on Ưng Bình, facing the street (south) ----
  dinh(S, 425, -1452, reserved);
  // ---- Chùa Pháp Hải with the Quan Âm statue, facing the main river (west) ----
  chua(S, reserved);

  // ---- small shrines (miếu / am) on the banks, as the river villages keep them ----
  S.kind = KIND.PLAIN;
  for (const [x, z] of [[372, -1000], [579, -1350], [440, -598], [366, -1760], [470, -2020]]) {
    const s = shoreAt(x, z), sx = s.p[0] - s.n[0] * 2.2, sz = s.p[1] - s.n[1] * 2.2, y = gY(sx, sz), ang = Math.atan2(s.t[1], s.t[0]);
    S.box(sx, sz, y, y + 0.35, 1.8, 1.6, ang, C.stone);
    S.box(sx, sz, y + 0.35, y + 1.25, 0.45, 0.45, ang, C.lime);
    S.box(sx, sz, y + 1.25, y + 2.1, 1.1, 0.9, ang, C.yellow, { top: C.red });
    S.box(sx - s.n[0] * 0.46, sz - s.n[1] * 0.46, y + 1.4, y + 1.95, 0.5, 0.04, ang, C.red);
    S.hip(sx, sz, 1.1, 0.9, ang, y + 2.1, 0.55, C.roof, { over: 0.25, flare: 0.4 });
    lamp(sx, y + 1.7, sz, [1, 0.55, 0.3], 2);
  }

  // ---- the north sandbar: corn and vegetable plots (Bồi Thành) ----
  S.kind = KIND.GROUND;
  const fields0 = S.n;
  let pk = 0;
  for (let x = 380; x < 580; x += 9) {
    for (let z = -2180; z < -1480; z += 18) {
      const x1 = x + 8, z1 = z + 17, cx = x + 4, cz = z + 8.5;
      const corners = [[x, z], [x1, z], [x1, z1], [x, z1], [cx, cz]];
      if (!corners.every(([u, v]) => inRing(u, v, ring) && !inRing(u, v, VILLAGE) && shoreDist(u, v) > 5)) continue;
      if (corners.some(([u, v]) => nearRoad(u, v, 1.5) || nearHouse(u, v, 2.5))) continue;
      if (nearHouse(cx, cz, 6)) continue;
      const kind = rand(pk++, 11), y = gY(cx, cz);
      S.prism([[x, z], [x1, z], [x1, z1], [x, z1]], y - 0.2, y + 0.06, C.soil, shade(C.soil, 0.95 + rand(pk, 12) * 0.1));
      if (kind < 0.55) {
        // corn in rows along the plot, ~1.8 m tall
        const hgt = 1.3 + rand(pk, 13) * 0.6;
        for (let u = x + 1.0; u < x1 - 0.5; u += 2.0) S.box(u, cz, y + 0.06, y + hgt, 1.2, 16, 0, C.cornD, { top: C.corn });
      } else if (kind < 0.85) {
        // vegetable beds across the plot
        for (let v = z + 1.4; v < z1 - 0.8; v += 2.4) S.box(cx, v, y + 0.06, y + 0.35, 7, 1.4, 0, C.vegD, { top: C.veg });
      }
      reserved.push([x, z, x1, z1]);
    }
  }
  (S.paved = S.paved || []).push([fields0, S.n]); // no generated houses on the fields
  S.kind = KIND.PLAIN;

  // ---- trees: coconut palms leaning over the banks, bamboo clumps, and the gardens' fruit and shade trees ----
  let ti = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    for (let s = 6; s < len - 4; s += 13 + rand(ti, 21) * 14, ti++) {
      const t = s / len, sx = p[0] + (q[0] - p[0]) * t, sz = p[1] + (q[1] - p[1]) * t;
      const sa = shoreAt(sx, sz), back = 1.5 + rand(ti, 22) * 3;
      const x = sx - sa.n[0] * back, z = sz - sa.n[1] * back;
      if (inReserved(x, z, 2) || nearRoad(x, z, 1.2) || nearHouse(x, z, 1.5)) continue;
      const r = rand(ti, 23);
      if (r < 0.42) palm(S, x, z, sa.n, ti);
      else if (r < 0.8) bamboo(S, x, z, ti);
    }
  }
  // gardens: shade and fruit trees between the houses, handed to the shared tree builder (data.trees, decimetres)
  if (Array.isArray(data.trees)) {
    let k = 0;
    for (let n = 0; n < 2600 && k < 900; n++) {
      const x = 352 + rand(n, 31) * 232, z = -2185 + rand(n, 32) * 1625;
      if (!inRing(x, z, ring) || shoreDist(x, z) < 2.5) continue;
      if (inReserved(x, z, 1.5) || nearRoad(x, z, 1.5) || nearHouse(x, z, 2)) continue;
      if (!inRing(x, z, VILLAGE) && rand(n, 33) < 0.6) continue; // thinner over the open sandbar
      data.trees.push(Math.round(x * 10), Math.round(z * 10), 7 + Math.floor(rand(n, 34) * 6), rand(n, 35) < 0.4 ? 1 : 0);
      k++;
    }
  }
  flushLamps();
  S.kind = KIND.PLAIN;
  return null;
}

// A sampan at (x, z), local +x its bow. Some carry the woven arched roof (mui), the clam-rakers' boats the long rake
// poles laid along them.
function sampan(S, x, z, ang, i) {
  const L = 6.5 + rand(i, 1) * 2, W = 1.15 + rand(i, 2) * 0.35;
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const P = (u, v) => [x + u * ux - v * uz, z + u * uz + v * ux];
  const hull = [P(L / 2, 0), P(L * 0.3, W / 2), P(-L * 0.32, W / 2), P(-L / 2, 0.12), P(-L / 2, -0.12), P(-L * 0.32, -W / 2), P(L * 0.3, -W / 2)];
  S.kind = KIND.TIMBER;
  const col = rand(i, 6) < 0.25 ? C.hullBlue : C.hull;
  S.prism(hull, WATER - 0.25, WATER + 0.42, col, C.deck);
  S.kind = KIND.PLAIN;
  if (rand(i, 7) < 0.5) {
    // the arched mat roof over the middle
    const u0 = -L * 0.22, u1 = L * 0.12, r = W * 0.48;
    for (let k = 0; k < 4; k++) {
      const a0 = (k / 4) * Math.PI, a1 = ((k + 1) / 4) * Math.PI;
      const v0 = Math.cos(a0) * r, v1 = Math.cos(a1) * r, y0 = WATER + 0.42 + Math.sin(a0) * r * 1.3, y1 = WATER + 0.42 + Math.sin(a1) * r * 1.3;
      const A = P(u0, v0), B = P(u1, v0), Cc = P(u1, v1), D = P(u0, v1);
      const mid = (a0 + a1) / 2;
      S.quad([A[0], y0, A[1]], [B[0], y0, B[1]], [Cc[0], y1, Cc[1]], [D[0], y1, D[1]], k % 2 ? C.mat : C.matD, [-Math.sin(ang) * Math.cos(mid), Math.sin(mid), Math.cos(ang) * Math.cos(mid)]);
    }
  } else {
    // the clam rake: a long pole and its basket frame, laid fore and aft
    const a = P(-L * 0.45, 0.25), b = P(L * 0.55, 0.3);
    S.beam([a[0], WATER + 0.55, a[1]], [b[0], WATER + 0.9, b[1]], 0.07, 0.07, C.pole);
    const c = P(-L * 0.3, -0.2);
    S.box(c[0], c[1], WATER + 0.42, WATER + 0.75, 0.8, 0.6, ang, C.matD);
  }
}

// A coconut palm leaning out over the water (n: the outward direction).
function palm(S, x, z, n, i) {
  const h = 8 + rand(i, 41) * 5, lean = 0.12 + rand(i, 42) * 0.18, y0 = gY(x, z);
  const pts = [];
  for (let k = 0; k <= 3; k++) {
    const t = k / 3, o = lean * h * t * t;
    pts.push([x + n[0] * o, y0 + h * t, z + n[1] * o]);
  }
  for (let k = 0; k < 3; k++) S.beam(pts[k], pts[k + 1], 0.32 - k * 0.04, 0.32 - k * 0.04, C.trunk);
  const top = pts[3], F = 8, R = 3.4 + rand(i, 43);
  for (let k = 0; k < F; k++) {
    const a = (k / F) * Math.PI * 2 + rand(i, 44), dx = Math.cos(a), dz = Math.sin(a);
    const mid = [top[0] + dx * R * 0.5, top[1] + 0.5, top[2] + dz * R * 0.5], tip = [top[0] + dx * R, top[1] - 1.4, top[2] + dz * R];
    const sx = -dz * 0.45, sz = dx * 0.45, col = k % 2 ? C.frond : C.frondD;
    S.quad(top, [mid[0] + sx, mid[1], mid[2] + sz], [tip[0], tip[1], tip[2]], [mid[0] - sx, mid[1], mid[2] - sz], col, [0, 1, 0]);
    S.quad(top, [mid[0] - sx, mid[1], mid[2] - sz], [tip[0], tip[1], tip[2]], [mid[0] + sx, mid[1], mid[2] + sz], shade(col, 0.8), [0, -1, 0]);
  }
  S.cyl(top[0], top[2], top[1] - 0.6, top[1] + 0.1, 0.45, 0.3, 5, C.frondD); // the nuts and frond bases
}

// A clump of bamboo (tre): culms splaying from one root, their tops arching under feathery leaf masses.
function bamboo(S, x, z, i) {
  const y0 = gY(x, z), n = 5 + Math.floor(rand(i, 51) * 3), H = 7 + rand(i, 52) * 4;
  for (let k = 0; k < n; k++) {
    const a = rand(i * 31 + k, 53) * Math.PI * 2, sp = 0.18 + rand(i * 31 + k, 54) * 0.22, h = H * (0.75 + rand(i * 31 + k, 55) * 0.3);
    const b0 = [x + Math.cos(a) * 0.6, y0, z + Math.sin(a) * 0.6];
    const b1 = [x + Math.cos(a) * (0.6 + sp * h * 0.5), y0 + h * 0.6, z + Math.sin(a) * (0.6 + sp * h * 0.5)];
    const b2 = [x + Math.cos(a) * (0.6 + sp * h * 1.3), y0 + h * 0.95, z + Math.sin(a) * (0.6 + sp * h * 1.3)];
    S.beam(b0, b2, 0.11, 0.11, C.culm);
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + rand(i, 56), r = 1.6 + rand(i, 57) * 1.2;
    const cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r, y = y0 + H * (0.55 + rand(i, 58 + k) * 0.25);
    S.cyl(cx, cz, y, y + H * 0.38, 2.0, 0.25, 5, k % 2 ? C.bambooLeaf : C.bambooLeafD, { rot: a });
  }
  S.cyl(x, z, y0 + H * 0.35, y0 + H * 0.9, 2.3, 0.6, 5, C.bambooLeafD);
}

// Đình làng Bồi Thành. Front edge of the yard on the street at (fx, fz), facing south. A walled court with the gate
// (nghi môn: two tall pillars and two shorter ones), the screen (bình phong) behind it, and the hall: three bays and two
// end bays under a terracotta hip roof with an open front verandah, on a low stone plinth. Sizes estimated from the
// usual Huế village đình (no measured survey found).
function dinh(S, fx, fz, reserved) {
  const x0 = fx - 15, x1 = fx + 15, z0 = fz - 36, z1 = fz - 1.5; // yard (z1: the street side)
  reserved.push([x0, z0, x1, z1]);
  const y = gY(fx, fz - 18);
  const n0 = S.n;
  S.kind = KIND.GROUND;
  S.prism([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y - 0.3, y + 0.1, C.stone, C.pave, { topKind: KIND.ROAD });
  // the yard wall, lime-washed with a tiled coping
  S.kind = KIND.MASONRY;
  const wall = (ax, az, bx, bz) => {
    const l = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
    S.box((ax + bx) / 2, (az + bz) / 2, y, y + 1.3, l, 0.3, ang, C.lime, { top: C.roof });
  };
  wall(x0, z0, x1, z0); wall(x0, z0, x0, z1); wall(x1, z0, x1, z1);
  wall(x0, z1, fx - 5.2, z1); wall(fx + 5.2, z1, x1, z1);
  // nghi môn: pillars with lantern heads and phoenix-crest tops
  S.kind = KIND.PLAIN;
  for (const [u, h] of [[-5, 4.2], [-2, 5.6], [2, 5.6], [5, 4.2]]) {
    const px = fx + u, pz = z1;
    S.box(px, pz, y, y + h, 0.7, 0.7, 0, C.ochre, { top: C.lime });
    S.box(px, pz, y + h - 1.0, y + h - 0.3, 0.9, 0.9, 0, C.lime);
    S.cyl(px, pz, y + h, y + h + 0.7, 0.32, 0.05, 6, C.gold);
  }
  S.box(fx - 3.5, z1, y + 2.6, y + 3.0, 2.6, 0.3, 0, C.ochre); // the low panels between the pillars
  S.box(fx + 3.5, z1, y + 2.6, y + 3.0, 2.6, 0.3, 0, C.ochre);
  S.box(fx, z1, y + 4.0, y + 4.6, 3.6, 0.35, 0, C.ochre, { top: C.roof }); // the lintel over the middle opening
  // bình phong
  S.kind = KIND.MASONRY;
  S.box(fx, z1 - 6, y, y + 2.2, 4.6, 0.45, 0, C.lime, { top: C.roof });
  S.box(fx, z1 - 6.25, y + 0.5, y + 1.9, 2.2, 0.06, 0, hex('#5f8a6a')); // the mosaic panel (dragon-horse), green
  // the incense urn in the court
  S.kind = KIND.PLAIN;
  S.cyl(fx, z1 - 12, y + 0.1, y + 0.9, 0.5, 0.6, 8, hex('#5a4a38'));
  // the hall
  const hz = z0 + 10;
  const top = pavilion(S, fx, hz, 14, 9, 0, y + 0.1, { platform: 0.6, wallH: 3.0, roof: C.roof, wall: C.ochre, rh: 3.4, ridge: C.ridge, colonnade: true, over: 1.3, segs: 3 });
  // ridge ornament: two dragons facing a pearl (lưỡng long tranh châu), and the pearl itself
  S.kind = KIND.PLAIN;
  S.cyl(fx, hz, top, top + 0.7, 0.25, 0.25, 6, C.gold);
  for (const s of [-1, 1]) S.beam([fx + s * 0.6, top + 0.1, hz], [fx + s * 2.2, top + 0.55, hz], 0.25, 0.35, C.ridge);
  (S.paved = S.paved || []).push([n0, S.n]);
  lamp(fx - 2, y + 5, z1 + 0.6, [1, 0.75, 0.42], 4);
  lamp(fx + 2, y + 5, z1 + 0.6, [1, 0.75, 0.42], 4);
  lamp(fx, y + 3, hz + 6, [1, 0.7, 0.4], 4);
}

// Chùa Pháp Hải: a walled court on the island's west bank, gate (tam quan) toward the river, the white Quan Âm on her
// lotus in the front court (OSM node 5314360729) and the main hall behind under a two-tier roof. Sizes estimated.
function chua(S, reserved) {
  // the block between the west lane (OSM 39411183), the lane on the north (39418673) and the lane on the south
  const ring = [[396.5, -1144.5], [446, -1140.5], [446, -1098], [402.5, -1098]];
  reserved.push([394, -1147, 448, -1096]);
  const zc = -1121, y = gY(424, zc);
  const n0 = S.n;
  S.kind = KIND.GROUND;
  S.prism(ring, y - 0.3, y + 0.1, C.stone, C.pave, { topKind: KIND.ROAD });
  // the court wall, yellow with a tiled coping, gate gap on the west
  S.kind = KIND.MASONRY;
  for (let i = 0; i < 4; i++) {
    const a = ring[i], b = ring[(i + 1) % 4];
    const seg = (p, q) => {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      S.box((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, y, y + 1.6, l, 0.3, ang, C.yellow, { top: C.roofP });
    };
    if (i === 3) { // the west side: leave the gate's width open in the middle
      const m = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], L = Math.hypot(b[0] - a[0], b[1] - a[1]), g = 5 / L;
      seg(a, m(0.5 - g)); seg(m(0.5 + g), b);
    } else seg(a, b);
  }
  // tam quan: three openings under small tiled roofs, the middle one higher. The west lane's carriageway comes to
  // within 0.7 m of the court wall here, so the gate stands 0.7 m back inside the gap, and its eaves (1.1 m out from
  // the gate's axis) stop over the kerb instead of reaching out over the lane.
  const gx = (ring[3][0] + ring[0][0]) / 2 + 0.7, gz = (ring[3][1] + ring[0][1]) / 2, ANG = Math.PI / 2;
  S.kind = KIND.PLAIN;
  for (const v of [-4.6, -1.6, 1.6, 4.6]) S.box(gx, gz + v, y, y + (Math.abs(v) < 2 ? 4.4 : 3.4), 0.7, 0.7, 0, C.yellow, { top: C.lime });
  S.box(gx, gz, y + 3.5, y + 4.4, 0.5, 3.6, 0, C.yellow);
  S.hip(gx, gz, 4.2, 1.4, ANG, y + 4.4, 1.1, C.roofP, { over: 0.4, flare: 0.5, hips: true, ridgeCol: C.ridge });
  for (const s of [-1, 1]) {
    S.box(gx, gz + s * 3.1, y + 2.7, y + 3.4, 0.5, 2.4, 0, C.yellow);
    S.hip(gx, gz + s * 3.1, 3.0, 1.2, ANG, y + 3.4, 0.8, C.roofP, { over: 0.3, flare: 0.5, hips: true });
  }
  // Quan Âm on a lotus, on an octagonal plinth (OSM node 5314360729)
  const qx = 404, qz = -1136; // ~5 m inside the wall from the OSM point (399.3, -1140.9)
  S.kind = KIND.MASONRY;
  S.cyl(qx, qz, y, y + 1.2, 1.7, 1.6, 8, C.stone);
  S.kind = KIND.PLAIN;
  S.cyl(qx, qz, y + 1.2, y + 1.9, 1.0, 1.4, 10, C.lotus);
  S.cyl(qx, qz, y + 1.9, y + 4.6, 0.62, 0.34, 8, C.white);
  S.cyl(qx, qz, y + 4.6, y + 5.15, 0.24, 0.2, 8, C.white);
  S.cyl(qx, qz, y + 5.15, y + 5.4, 0.2, 0.05, 6, C.white);
  // the main hall: five bays under a two-tier (chồng diêm) roof, facing west; a smaller hall behind it
  const ang = Math.PI / 2; // local +v (front) points west
  pavilion(S, 424, zc, 13, 9.5, ang, y + 0.1, { tiers: 2, platform: 0.7, wallH: 3.4, roof: C.roofP, wall: C.yellow, rh: 3.6, ridge: C.ridge, colonnade: true, over: 1.3, segs: 3 });
  pavilion(S, 439.5, zc, 10, 6, ang, y + 0.1, { platform: 0.4, wallH: 3.0, roof: C.roofP, wall: C.yellow, rh: 2.6, ridge: C.ridge, over: 1.0 });
  (S.paved = S.paved || []).push([n0, S.n]);
  lamp(gx - 0.8, y + 3.2, gz - 2.4, [1, 0.75, 0.42], 4);
  lamp(gx - 0.8, y + 3.2, gz + 2.4, [1, 0.75, 0.42], 4);
  lamp(qx + 1.8, y + 1.5, qz, [0.95, 0.9, 0.8], 5);
}
