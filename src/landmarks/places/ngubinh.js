import { KIND, hex, shade, mix, rand, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';

// ---- Núi Ngự Bình, the "royal screen": the flat-topped hill 4 km south of the Citadel, on its axis ----
//
// Sources (docs/places/ngubinh.md has the full list):
//  - vi.wikipedia.org/wiki/Núi_Ngự_Bình: 103 m (some sources 105 m), trapezoidal, symmetrical from the front, flat top
//    ("đỉnh bằng phẳng"); pines planted from Gia Long's reign; two small flanking hills, Tả Bật and Hữu Bật.
//  - OpenStreetMap: natural=peak ele=103 at 16.4418 N 107.59613 E (data/control-points.json); the pine wood
//    (way 588726451, natural=wood, needleleaved); the footpath up (way 631812146: along the west ridge to the top and
//    down the north face); the graveyards round the foot (ways 1180918090, 1180918092, ...; read here from data.green).
//  - tuoitre.vn "Giải cứu núi Ngự Bình" (2021): about 100,000 graves on 38.4 ha round the foot on all four sides; pine
//    forest replanted in 1976, thinned by seven fires in ten years (patchy cover, bare soil on the top and slopes).
//  - mia.vn travel guide: stone steps (bậc đá) on the climb; the top flat enough that people camp there.
// The terrain grid (25 m, scripts/build-data.mjs §9) already stands the hill at the right height (rise 101 m on a
// floor of about 3 m: 104 m) but peaks it on a single node. Here a local cap levels the crest into the flat top.
// Estimated: the size and line of the flat top (a stadium about 130 x 40 m along the crest the grid shows, nearly level,
// standing up to about 9 m over the grid's slopes), the bare clearing on it, path width, tomb sizes and colours. The
// data's trees on the cap are kept off it by geo/city.js (paved) and drawn again here at the cap's height. Tả Bật / Hữu Bật are not drawn: no source places them.

export const id = 'ngubinh';

const O = [774.2, 2997.7]; // the place's summit point, model metres; everything below is relative to it
// the flat top: a stadium round the crest from A (north-east) to B (west-south-west), half-width W; M is the shoulder
const A = [28, -38], B = [-42, 22], W = 20, M = 30, WC = 13; // WC: half-width of the bare clearing
// OSM way 631812146, relative metres: up the west ridge, over the top, down the north face (cut where the town starts)
const PATH = [[-340, 141], [-332, 80], [-256, 60], [-224, 47], [-184, 35], [-156, 27], [-143, 29], [-93, 49], [-31, 37], [-6, 23], [5, 12], [20, -6], [28, -19], [32, -29], [34, -40], [34, -47], [32, -55], [30, -63], [24, -69], [12, -79], [-4, -91], [-14, -96], [-20, -101], [-22, -106], [-22, -130], [-23, -154], [-22, -167], [-21, -177], [-14, -210], [-8, -224], [-8, -235], [-4, -244], [1, -249], [10, -254]];

const BARE = hex('#b4a17a'), BARE2 = hex('#a8986f'), RIM = hex('#8fa262'), SKIRT = hex('#86a062'), TURF = hex('#a3b077');
const BARK = hex('#5b4b3d'), PINE = ['#2f5040', '#345644', '#3c5c42', '#2b4a3a', '#445f3c'].map(hex); // foliage.js pine colours
const DIRT = hex('#a48d6a'), STONE = hex('#9d978a'), STONE2 = hex('#8c877c');
const TOMB = ['#d8d4ca', '#cfcabd', '#e2ddd0', '#bfbab0', '#d9cfae', '#c9d0d0', '#b5b0a5'].map(hex), BIA = hex('#6d6a66');

export function build({ data, S }) {
  const keep = S.kind;
  const ax = B[0] - A[0], az = B[1] - A[1], L = Math.hypot(ax, az), ux = ax / L, uz = az / L;
  const ang = Math.atan2(uz, ux);
  const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  // relative point -> (s along the crest, t across)
  const st = (x, z) => { const dx = x - mid[0], dz = z - mid[1]; return [dx * ux + dz * uz, -dx * uz + dz * ux]; };
  const out = (x, z, w = W) => { const [s, t] = st(x, z); const e = Math.max(0, Math.abs(s) - L / 2); return Math.hypot(e, t) - w; };
  const r0 = (x, z) => rise(O[0] + x, O[1] + z);
  // the top: level across, and very nearly level along the crest (it eases down a few metres from the summit to the
  // west end, where the grid's ridge is lower), so the cap never stands more than a few metres proud of the hillside
  const maxNear = (p, R) => { let m = -Infinity; for (let dx = -R; dx <= R; dx += 2) for (let dz = -R; dz <= R; dz += 2) if (dx * dx + dz * dz <= R * R) m = Math.max(m, r0(p[0] + dx, p[1] + dz)); return m; };
  const g = (maxNear(B, W) - maxNear(A, W)) / L;
  const sC = (x, z) => Math.max(-L / 2, Math.min(L / 2, st(x, z)[0]));
  let t0 = -Infinity;
  for (let s = -L / 2 - W; s <= L / 2 + W; s += 2) for (let t = -W; t <= W; t += 2) {
    const x = mid[0] + s * ux - t * uz, z = mid[1] + s * uz + t * ux;
    if (out(x, z) <= 0) t0 = Math.max(t0, r0(x, z) - g * sC(x, z));
  }
  t0 += 0.2;
  const topAt = (x, z) => t0 + g * sC(x, z);
  // ground height (rise) with the cap: flat on top, a rounded shoulder down to the hillside over M metres
  const capH = (x, z) => {
    const d = out(x, z), r = r0(x, z);
    if (d >= M) return r;
    const top = topAt(x, z);
    const h = d <= 0 ? top : top - (top - r) * (1 - Math.cos((Math.PI * d) / M)) / 2;
    return Math.max(h, r);
  };
  const gY = (x, z) => LAND_Y + capH(x, z);

  // ---- the flat top: a smooth-shaded grid over the cap, only where it stands clear of the terrain ----
  S.kind = KIND.GROUND;
  const G = 3, smin = -L / 2 - W - M, smax = L / 2 + W + M, tmax = W + M;
  const ns = Math.ceil((smax - smin) / G), nt = Math.ceil((2 * tmax) / G);
  const V = [];
  for (let j = 0; j <= nt; j++) for (let i = 0; i <= ns; i++) {
    const s = smin + i * G, t = -tmax + j * G;
    const x = mid[0] + s * ux - t * uz, z = mid[1] + s * uz + t * ux, r = r0(x, z), h = capH(x, z), d = out(x, z), k = i * 7919 + j * 104729;
    // a bare, trodden clearing in the middle with grass worn through; grass at the rim; the hillside's green on the shoulder
    const c = d < WC - W ? (rand(k, 3) < 0.3 ? mix(BARE2, RIM, 0.4) : shade(BARE, 0.95 + rand(k, 4) * 0.1)) : d < WC - W + 3 ? mix(BARE, RIM, 0.6) : mix(d < 0 ? mix(RIM, BARE2, rand(k, 5) * 0.3) : mix(RIM, SKIRT, Math.min(1, d / (M * 0.6))), TURF, rand(k, 6) < 0.35 ? 0.5 : 0);
    V.push({ x: O[0] + x, z: O[1] + z, lift: h - r, y: LAND_Y + (h - r > 0.05 ? h : r - 0.3), d, c });
  }
  const at = (i, j) => V[Math.min(nt, Math.max(0, j)) * (ns + 1) + Math.min(ns, Math.max(0, i))];
  for (let j = 0; j <= nt; j++) for (let i = 0; i <= ns; i++) { // normals from the cap's own heights
    const v = at(i, j), e = at(i + 1, j), w = at(i - 1, j), n = at(i, j + 1), so = at(i, j - 1);
    const sx = e.x - w.x, sy = e.y - w.y, sz = e.z - w.z, tx = n.x - so.x, ty = n.y - so.y, tz = n.z - so.z;
    let nx = sy * tz - sz * ty, ny = sz * tx - sx * tz, nz = sx * ty - sy * tx;
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    v.n = [nx, ny, nz];
  }
  const tri3 = (a, b, c) => {
    if ((b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z) < 0) { const q = b; b = c; c = q; } // face up
    S.smoothTri([[a.x, a.y, a.z], [b.x, b.y, b.z], [c.x, c.y, c.z]], [a.n, b.n, c.n], [a.c, b.c, c.c]);
  };
  const cells = [[], []]; // clearing, rest
  for (let j = 0; j < nt; j++) for (let i = 0; i < ns; i++) {
    const q = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
    if (!q.some((v) => v.lift > 0.05)) continue;
    cells[q.every((v) => v.d < WC - W) ? 0 : 1].push(q);
  }
  // the whole cap is marked paved: no houses, and the data's trees kept off it (they would stand sunk in the raised
  // ground); the ones off the clearing are planted again below at the cap's height
  const cap0 = S.n;
  for (const q of cells[0].concat(cells[1])) { tri3(q[0], q[1], q[2]); tri3(q[0], q[2], q[3]); }
  (S.paved = S.paved || []).push([cap0, S.n]);

  // ---- the footpath: trodden earth on the ridge, stone steps where it climbs steeply (the north face) ----
  S.kind = KIND.ROAD;
  const PW = 2.7, D = 0.6;
  const onPath = [];
  for (let i = 0; i + 1 < PATH.length; i++) {
    const [x0, z0] = PATH[i], [x1, z1] = PATH[i + 1], l = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(l / D));
    const a = Math.atan2(z1 - z0, x1 - x0);
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n, x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f;
      const fa = Math.max(0, f - 1.5 / l), fb = Math.min(1, f + 1.5 / l);
      const slope = Math.abs(capH(x0 + (x1 - x0) * fb, z0 + (z1 - z0) * fb) - capH(x0 + (x1 - x0) * fa, z0 + (z1 - z0) * fa)) / ((fb - fa) * l);
      const y = gY(x, z), steep = slope > 0.2, kk = i * 1000 + k;
      const col = steep ? (rand(kk, 11) < 0.5 ? STONE : STONE2) : shade(DIRT, 0.95 + rand(kk, 13) * 0.1);
      S.box(O[0] + x, O[1] + z, y - 0.6, y + (steep ? 0.2 : 0.14), l / n + 0.04, steep ? PW - 0.2 : PW, a, col);
      if (k % 4 === 0) onPath.push([x, z]);
    }
  }

  // ---- the pines on the cap: the data's own trees (OSM wood 588726451 is needleleaved), raised onto the new ground ----
  S.kind = KIND.PLAIN;
  const tr0 = data.trees || [];
  let replanted = 0;
  for (let i = 0; i < tr0.length; i += 4) {
    const x = tr0[i] / 10 - O[0], z = tr0[i + 1] / 10 - O[1];
    if (Math.abs(x) > 200 || Math.abs(z) > 200) continue;
    const d = out(x, z);
    if (d >= M + 6 || d < WC - W + 1) continue; // off the cap (city.js may still clear a few at its edge), or on the clearing
    if (onPath.some((p) => Math.hypot(p[0] - x, p[1] - z) < 2.5)) continue;
    const k = i / 4, sc = tr0[i + 2] / 10;
    const r = 3.3 * sc * (0.75 + rand(k, 41) * 0.5), hg = r * 1.42 * (0.95 + rand(k, 42) * 0.45);
    const X = O[0] + x, Z = O[1] + z, y = gY(x, z), a = rand(k, 43) * 6.28, col = PINE[Math.floor(rand(k, 49) * PINE.length)];
    S.box(X, Z, y - 0.3, y + hg * 1.55, 0.35 * sc, 0.35 * sc, a, BARK, { taper: 0.6 }); // the tall bare trunk
    S.box(X, Z, y + hg * 1.2, y + hg * 1.75, r * 1.15, r * 1.0, a, col, { taper: 0.7, top: shade(col, 1.1) }); // needle tiers
    S.box(X, Z, y + hg * 1.75, y + hg * 2.15, r * 0.8, r * 0.7, a + 0.6, shade(col, 1.05), { taper: 0.5, top: shade(col, 1.15) });
    replanted++;
  }

  // ---- graves round the foot: the graveyards OSM maps on the slopes (data.green), thinned to what reads ----
  const near = (x, z, R) => Math.hypot(x, z) < R;
  const yards = [];
  for (const [k, rings] of data.green || []) {
    if (k !== 'cemetery') continue;
    for (const f of rings) {
      const r = [];
      for (let i = 0; i < f.length; i += 2) r.push([f[i] / 10 - O[0], f[i + 1] / 10 - O[1]]);
      if (r.some((p) => near(p[0], p[1], 450))) yards.push(r);
    }
  }
  // things a tomb must keep off: trees' trunks, houses, mapped buildings, streets, the path
  const keepOff = [];
  const tr = data.trees || [];
  for (let i = 0; i < tr.length; i += 4) { const x = tr[i] / 10 - O[0], z = tr[i + 1] / 10 - O[1]; if (near(x, z, 470)) keepOff.push([x, z, 1.6]); }
  const inf = data.infill || [];
  for (let i = 0; i < inf.length; i += 8) { const x = inf[i] / 10 - O[0], z = inf[i + 1] / 10 - O[1]; if (near(x, z, 470)) keepOff.push([x, z, Math.max(inf[i + 2], inf[i + 3]) / 20 + 1.5]); }
  for (const b of data.bld || []) {
    const f = b[0], c = [0, 0];
    for (let i = 0; i < f.length; i += 2) { c[0] += f[i] / 10 / (f.length / 2); c[1] += f[i + 1] / 10 / (f.length / 2); }
    let R = 0;
    for (let i = 0; i < f.length; i += 2) R = Math.max(R, Math.hypot(f[i] / 10 - c[0], f[i + 1] / 10 - c[1]));
    if (near(c[0] - O[0], c[1] - O[1], 500)) keepOff.push([c[0] - O[0], c[1] - O[1], R + 1.5]);
  }
  for (const p of onPath) keepOff.push([p[0], p[1], 2.6]);
  const segs = [];
  for (const [, , f] of data.roads || []) for (let i = 0; i + 3 < f.length; i += 2) {
    const a = [f[i] / 10 - O[0], f[i + 1] / 10 - O[1]], b = [f[i + 2] / 10 - O[0], f[i + 3] / 10 - O[1]];
    if (near(a[0], a[1], 600) || near(b[0], b[1], 600)) segs.push([a, b]);
  }
  const segD = (p, [a, b]) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
    return Math.hypot(p[0] - a[0] - dx * u, p[1] - a[1] - dz * u);
  };
  // a hashed grid so the tests stay cheap
  const cellOf = (x, z) => `${Math.floor(x / 8)},${Math.floor(z / 8)}`;
  const grid = new Map();
  const put = (o) => { const k = cellOf(o[0], o[1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o); };
  keepOff.forEach(put);
  const clash = (x, z, r) => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const o of grid.get(`${Math.floor(x / 8) + dx},${Math.floor(z / 8) + dz}`) || []) if (Math.hypot(o[0] - x, o[1] - z) < o[2] + r) return true;
    }
    return false;
  };
  S.kind = KIND.MASONRY;
  let placed = 0;
  const MAX = 1000;
  for (let k = 0; k < 9000 && placed < MAX; k++) {
    const x = (rand(k, 21) - 0.5) * 900, z = (rand(k, 22) - 0.5) * 900;
    if (!near(x, z, 440) || out(x, z) < M + 4) continue;
    if (!yards.some((r) => inRing(x, z, r))) continue;
    if (clash(x, z, 1.6)) continue;
    if (segs.some((s) => segD([x, z], s) < 5)) continue;
    // head uphill, feet down the slope, as on the hillside graves
    const gx = r0(x + 2, z) - r0(x - 2, z), gz = r0(x, z + 2) - r0(x, z - 2);
    const a = Math.hypot(gx, gz) > 0.05 ? Math.atan2(gz, gx) : rand(k, 23) * 6.28;
    const big = rand(k, 24) < 0.18; // a family tomb: walled plot, larger mound
    const w = big ? 4.2 + rand(k, 25) * 1.6 : 2.2 + rand(k, 26) * 0.4, d = big ? 3.2 + rand(k, 27) * 1.2 : 1.3 + rand(k, 28) * 0.2;
    const y = LAND_Y + r0(x, z), col = TOMB[Math.floor(rand(k, 29) * TOMB.length)];
    const X = O[0] + x, Z = O[1] + z, ca = Math.cos(a), sa = Math.sin(a);
    if (big) {
      S.box(X, Z, y - 0.5, y + 0.45, w, d, a, col, { top: shade(col, 0.9) }); // the plot's kerb, read as one block
      S.box(X - ca * 0.3, Z - sa * 0.3, y + 0.45, y + 0.85, w * 0.55, d * 0.55, a, shade(col, 1.05), { taper: 0.8 });
    } else {
      S.box(X, Z, y - 0.5, y + 0.55, w, d, a, col, { taper: 0.9 });
    }
    // the headstone (bia) at the uphill end
    S.box(X + ca * (w / 2 - 0.15), Z + sa * (w / 2 - 0.15), y, y + (big ? 1.5 : 1.05), 0.22, big ? 1.2 : 0.75, a, rand(k, 30) < 0.5 ? BIA : shade(col, 0.85));
    put([x, z, big ? 2.8 : 1.4]);
    placed++;
  }
  S.kind = keep;
}
