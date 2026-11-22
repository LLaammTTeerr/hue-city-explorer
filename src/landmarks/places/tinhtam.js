import { KIND, Buf, hex, shade, unflat, inRing, pathLength, rand } from '../../geo/buf.js';
import { LAND_Y, POND_Y, quality, roadWidth } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { bridgeProfiles } from '../../geo/bridges.js';
import { cityMaterial, enc } from '../../geo/materials.js';

// ---- Hồ Tịnh Tâm: the Nguyễn court's lotus lake inside the Kinh Thành (Thuận Thành ward), as it stands in 2026 ----
//
// Sources (fetched Nov 2026; notes in docs/places/tinhtam.md):
//  - OSM (data/raw extract): relation 1843591 "Hồ Tịnh Tâm" (south basin, two holes: Bồng Lai and Doanh Châu) and
//    relation 7102838 (north basin, hole: Phương Trượng); the Kim Oanh dyke between them is now đường Lê Văn Hưu.
//    Footbridges 1489091245 (concrete) to Bồng Lai and 1489091232 (wood) to Phương Trượng, outlines
//    1432251331/1432251332; the octagonal roof 1568327411 (amenity=shelter, building=roof) on Bồng Lai.
//  - vi.wikipedia.org/wiki/Hồ_Tịnh_Tâm: area 107,553 m², perimeter nearly 1,500 m, rectangular, white lotus,
//    willows and bamboo; Bồng Lai (south) with điện Bồng Doanh, Phương Trượng (north), Doanh Châu (south-west);
//    Kim Oanh dyke east–west across the lake; the wall pulled down in 1946. The two OSM basins add up to 102.5k m²
//    plus the dyke, which matches.
//  - baophapluat.vn (4 Sep 2020), news.huengaynay.vn (Sep 2020), baovanhoa.vn (27 May 2020): 2020 restoration — a
//    concrete bridge (1960) joins Bồng Lai to the Kim Oanh dyke; the small octagonal house (first built 1960 on the
//    Bồng Doanh site) rebuilt "modelled on the original"; a bamboo-and-timber bridge to Phương Trượng; bamboo
//    revetment and bamboo planted along the Kim Oanh dyke; rockeries, flowers and ornamental trees on both islands;
//    the bridge to Bồng Lai has bamboo railings.
// Estimated: the pavilion's sizes beyond the OSM roof outline (≈6.7 m eave radius), roof colour, column count,
// the bridges' widths and pier spacing, the stone facing of the banks, where the lotus drifts are.
// Nothing of the old halls, corridors or the four gates stands today, so none is drawn.

export const id = 'tinhtam';

const C = {
  face: hex('#7f7a6d'), // weathered stone revetment
  moss: hex('#5a5e48'),
  coping: hex('#b4ab98'),
  timber: hex('#7b5a3e'),
  timberDark: hex('#4f3b2a'),
  bamboo: hex('#b7a465'),
  bambooOld: hex('#8f8150'),
  concrete: hex('#b3ada0'),
  lacquer: hex('#8e3424'),
  roof: hex('#8c4a36'),
  roofDark: hex('#6e3a2c'),
  ridge: hex('#d8cdb4'),
  plinth: hex('#a8a090'),
  rock: hex('#6e6c66'),
  leaf: hex('#4f7a3c'),
  leaf2: hex('#6b8f45'),
};

// the Kim Oanh dyke (Lê Văn Hưu): OSM way 39416158 + 1489626239, model metres
const DYKE = [[-1584, -903.6], [-1435.1, -1016.8], [-1350.8, -1079.2], [-1275.4, -1136]];
// the two bridges, OSM footways (model metres): to Bồng Lai (concrete, 1960) and to Phương Trượng (bamboo and timber, 2020)
const BR_BONGLAI = [[-1346.4, -1073.5], [-1312.9, -1030.4]];
const BR_PHUONG = [[-1382.7, -1120.5], [-1360.7, -1092.1]];
const PAVILION = [-1291.2, -1001.6]; // centroid of OSM way 1568327411 (within ~1 m of the satellite's roof, Nov 2026)
// Read off Google satellite imagery (Nov 2026, visual reference only; scratch/rebuild/tinhtam/refs):
// where the brick path from the terrace meets the south-west bank of Bồng Lai
const SW_PATH_END = [-1316.5, -979];
// the big shade-tree canopies on Bồng Lai, 12–20 m across (OSM maps none there)
const ISLAND_TREES = [[-1325.2, -1016], [-1318, -1004.6], [-1298, -1030.3], [-1286.5, -1026.9], [-1265, -996], [-1255.9, -987.4],
  [-1296.5, -970.2], [-1269.3, -973.6], [-1284.5, -1043], [-1275.9, -1031.8]];
// đường Tịnh Tâm along the south-east bank (OSM road centreline, class 3), where a low concrete parapet stands at the
// road's lake-side edge with a row of big trees on the grass bank below it (Street View, car pano on Tịnh Tâm)
const TINHTAM_RD = [[-1212, -946], [-1262, -909], [-1275, -899], [-1288, -890], [-1312, -872], [-1337, -853], [-1359, -837], [-1372, -828]];
// đường Đinh Tiên Hoàng along the east bank (class 1): a continuous tree row on the bank in the satellite
const DTH_RD = [[-1275, -1136], [-1217, -1058], [-1167, -991]];

function distSeg(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const distLine = (x, z, pts) => { let m = Infinity; for (let i = 0; i + 1 < pts.length; i++) m = Math.min(m, distSeg(x, z, pts[i], pts[i + 1])); return m; };

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// The generic road-bridge slab (geo/city.js) for one of the mapped footbridges: collapse its triangles so the
// hand-made bridge takes its place on the same deck profile.
function knockOut(S, n0, pts, half, yHi) {
  const P = S.pos, a = pts[0], b = pts[pts.length - 1];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
  const inside = (k) => {
    const x = P[k] - a[0], y = P[k + 1], z = P[k + 2] - a[1];
    const s = x * ux + z * uz, t = -x * uz + z * ux;
    return s > -0.6 && s < L + 0.6 && Math.abs(t) < half && y > -6 && y < yHi;
  };
  let n = 0;
  for (let i = 0; i < n0; i += 3) {
    const k = i * 3;
    if (!inside(k) || !inside(k + 3) || !inside(k + 6)) continue;
    for (const j of [k + 3, k + 6]) { P[j] = P[k]; P[j + 1] = P[k + 1]; P[j + 2] = P[k + 2]; }
    n++;
  }
  return n;
}

function findRoad(data, seg) {
  const [a, b] = seg;
  for (const r of data.roads || []) {
    if (!r || !r[1] || !Array.isArray(r[2])) continue;
    const p = unflat(r[2]), p0 = p[0], p1 = p[p.length - 1];
    const d1 = Math.hypot(p0[0] - a[0], p0[1] - a[1]) + Math.hypot(p1[0] - b[0], p1[1] - b[1]);
    const d2 = Math.hypot(p0[0] - b[0], p0[1] - b[1]) + Math.hypot(p1[0] - a[0], p1[1] - a[1]);
    if (Math.min(d1, d2) < 3) return { r, pts: p };
  }
  return null;
}

export function build({ data, S, group, THREE }) {
  const n0 = S.n;
  const groundY = (x, z) => LAND_Y + rise(x, z);

  // ---------------- the two basins and their islands ----------------
  const basins = [];
  for (const test of [[-1400, -950], [-1500, -1240]]) {
    const poly = (data.ponds || []).find((pl) => inRing(test[0], test[1], unflat(pl[0])));
    if (poly) basins.push(poly.map(unflat));
  }
  if (!basins.length) throw new Error('Tịnh Tâm basins not found in data.ponds');

  // ---------------- banks: stone revetment, moss line, coping; bamboo stakes along the dyke ----------------
  S.kind = KIND.MASONRY;
  for (const rings of basins) {
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 0.3) continue;
        const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
        // the normal that points into the water, found by testing the basin itself
        let nx = -uz, nz = ux;
        { const tx = (a[0] + b[0]) / 2 + nx * 0.8, tz = (a[1] + b[1]) / 2 + nz * 0.8;
          if (!(inRing(tx, tz, rings[0]) && !rings.slice(1).some((h) => inRing(tx, tz, h)))) { nx = -nx; nz = -nz; } }
        // (nx, nz) now points into the water
        const ang = Math.atan2(uz, ux);
        const dyke = ri === 0 && distLine(a[0], a[1], DYKE) < 14 && distLine(b[0], b[1], DYKE) < 14;
        const steps = Math.max(1, Math.ceil(L / 18));
        for (let k = 0; k < steps; k++) {
          const t0 = k / steps, t1 = (k + 1) / steps, len = L / steps + 0.25;
          const mx = a[0] + (b[0] - a[0]) * (t0 + t1) / 2, mz = a[1] + (b[1] - a[1]) * (t0 + t1) / 2;
          const g = groundY(mx - nx * 1.5, mz - nz * 1.5);
          const at = (o) => [mx + nx * o, mz + nz * o];
          let q = at(0.12);
          S.box(q[0], q[1], POND_Y - 0.5, g - 0.02, len, 0.32, ang, C.face);
          q = at(0.3);
          S.box(q[0], q[1], POND_Y - 0.2, POND_Y + 0.32, len, 0.06, ang, C.moss);
          q = at(-0.25);
          S.box(q[0], q[1], g - 0.12, g + 0.1, len, 0.85, ang, C.coping, { topKind: KIND.ROAD });
          if (dyke) {
            // the 2020 bamboo revetment (kè tre) in front of the dyke's foot
            q = at(0.42);
            S.kind = KIND.TIMBER;
            S.box(q[0], q[1], POND_Y - 0.3, POND_Y + 0.55, len, 0.1, ang, C.bambooOld);
            S.kind = KIND.MASONRY;
          }
        }
      }
    });
  }

  // ---------------- bridges on the deck profile of the mapped footways ----------------
  const profiles = bridgeProfiles(data);
  const bridge = (seg, opt) => {
    const f = findRoad(data, seg);
    const prof = f && profiles.get(f.r[2]);
    let pts = f ? f.pts : seg;
    if (f && Math.hypot(pts[0][0] - seg[0][0], pts[0][1] - seg[0][1]) > 3) pts = [...pts].reverse(); // keep shore → island order
    const len = pathLength(pts);
    const yAt = prof ? (s) => prof.y(f.pts[0] === pts[0] ? s : len - s) : (s) => LAND_Y + 0.42 + 0.8 * Math.sin(Math.PI * s / len);
    if (prof) knockOut(S, n0, pts, 2.6, LAND_Y + 4);
    const a = pts[0], b = pts[pts.length - 1];
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, ang = Math.atan2(uz, ux);
    const P = (s, t) => [a[0] + ux * s - uz * t, a[1] + uz * s + ux * t];
    const W = opt.width, segL = 1.5, n = Math.ceil(len / segL);
    // deck in short pieces following the hump
    for (let i = 0; i < n; i++) {
      const s0 = (i * len) / n, s1 = ((i + 1) * len) / n, y0 = yAt(s0), y1 = yAt(s1), m = P((s0 + s1) / 2, 0);
      const pa = P(s0, 0), pb = P(s1, 0);
      S.kind = opt.concrete ? KIND.PLAIN : KIND.TIMBER;
      // the deck board as a beam between the two ends, so it climbs with the curve
      S.beam([pa[0], y0 - opt.thick / 2, pa[1]], [pb[0], y1 - opt.thick / 2, pb[1]], W, opt.thick, opt.concrete ? C.concrete : C.timberDark);
      S.kind = KIND.TIMBER;
      S.beam([pa[0], y0 + 0.02, pa[1]], [pb[0], y1 + 0.02, pb[1]], W - 0.2, 0.05, C.timber); // plank surface
      void m;
    }
    // supports: concrete piers or timber pile bents
    const nb = Math.max(2, Math.round(len / opt.span));
    for (let i = 1; i < nb; i++) {
      const s = (i * len) / nb, y = yAt(s) - opt.thick;
      if (opt.concrete) {
        const q = P(s, 0);
        S.kind = KIND.PLAIN;
        S.box(q[0], q[1], POND_Y - 1.5, y + 0.02, 0.6, W - 0.4, ang, shade(C.concrete, 0.9));
      } else {
        S.kind = KIND.TIMBER;
        for (const t of [-W / 2 + 0.2, W / 2 - 0.2]) { const q = P(s, t); S.box(q[0], q[1], POND_Y - 1.5, y + 0.02, 0.2, 0.2, ang, C.timberDark); }
        const q = P(s, 0);
        S.box(q[0], q[1], y - 0.2, y + 0.02, 0.2, W, ang, C.timberDark); // cap beam
      }
    }
    // bamboo railings: posts every 1.5 m, a top rail and a mid rail following the deck
    S.kind = KIND.TIMBER;
    for (const t of [-W / 2 + 0.06, W / 2 - 0.06]) {
      for (let i = 0; i <= n; i++) {
        const s = (i * len) / n, q = P(s, t), y = yAt(s);
        S.box(q[0], q[1], y, y + 0.95, 0.09, 0.09, ang, C.bambooOld);
      }
      for (const h of [0.9, 0.5]) {
        for (let i = 0; i < n; i++) {
          const s0 = (i * len) / n, s1 = ((i + 1) * len) / n, qa = P(s0, t), qb = P(s1, t);
          S.beam([qa[0], yAt(s0) + h, qa[1]], [qb[0], yAt(s1) + h, qb[1]], 0.07, 0.07, C.bamboo);
        }
      }
    }
    return { pts, len, yAt, P, ang };
  };
  bridge(BR_BONGLAI, { width: 3.0, thick: 0.45, span: 6, concrete: true });
  bridge(BR_PHUONG, { width: 2.0, thick: 0.25, span: 3.2, concrete: false });

  // ---------------- nhà bát giác on Bồng Lai (1960, rebuilt 2020) ----------------
  {
    const [cx, cz] = PAVILION, y0 = groundY(cx, cz);
    const toBridge = Math.atan2(BR_BONGLAI[1][1] - cz, BR_BONGLAI[1][0] - cx);
    const rot = toBridge - Math.PI / 8; // a face (not a corner) turned to the bridge
    const ring = (r, a = 0) => Array.from({ length: 8 }, (_, i) => [cx + r * Math.cos(rot + a + (i * Math.PI) / 4), cz + r * Math.sin(rot + a + (i * Math.PI) / 4)]);
    S.base = y0 - LAND_Y;
    S.kind = KIND.MASONRY;
    // two-step platform: a wide paved octagonal terrace (the satellite shows it as a pale ring about 16 m across,
    // well outside the eaves) and the raised floor under the columns
    S.prism(ring(8.2), y0 - 0.3, y0 + 0.2, C.plinth, shade(C.plinth, 1.05), { topKind: KIND.ROAD });
    S.prism(ring(4.9), y0 + 0.2, y0 + 0.55, C.plinth, shade(C.plinth, 1.1), { topKind: KIND.ROAD });
    // steps toward the bridge: one off the terrace, one up to the floor
    const f = [Math.cos(toBridge), Math.sin(toBridge)];
    S.box(cx + f[0] * 8.05, cz + f[1] * 8.05, y0 - 0.3, y0 + 0.05, 0.6, 2.6, toBridge, shade(C.plinth, 1.03), { topKind: KIND.ROAD });
    S.box(cx + f[0] * 4.95, cz + f[1] * 4.95, y0 + 0.1, y0 + 0.38, 0.5, 2.2, toBridge, shade(C.plinth, 1.03), { topKind: KIND.ROAD });
    const yF = y0 + 0.55, colR = 3.7, colH = 3.0;
    // eight lacquered columns on stone bases, one at each corner
    S.kind = KIND.TIMBER;
    for (const [x, z] of ring(colR)) {
      S.box(x, z, yF, yF + 0.18, 0.42, 0.42, rot, C.plinth);
      S.cyl(x, z, yF + 0.18, yF + colH, 0.15, 0.13, 6, C.lacquer, { cap: false });
    }
    // low balustrade between columns, open on the bridge side
    const cr = ring(colR);
    for (let i = 0; i < 8; i++) {
      const p = cr[i], q = cr[(i + 1) % 8];
      const mid = Math.atan2((p[1] + q[1]) / 2 - cz, (p[0] + q[0]) / 2 - cx);
      let d = mid - toBridge; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < 0.3) continue;
      S.beam([p[0], yF + 0.55, p[1]], [q[0], yF + 0.55, q[1]], 0.14, 0.1, C.lacquer);
      S.beam([p[0], yF + 0.1, p[1]], [q[0], yF + 0.1, q[1]], 0.12, 0.12, C.lacquer);
    }
    // ring beam on the column heads
    for (let i = 0; i < 8; i++) { const p = cr[i], q = cr[(i + 1) % 8]; S.beam([p[0], yF + colH - 0.12, p[1]], [q[0], yF + colH - 0.12, q[1]], 0.2, 0.28, shade(C.lacquer, 0.8)); }
    // the roof: one tier, eight concave slopes (steeper above), eaves at the OSM roof outline
    const yE = yF + colH, R = 6.5;
    S.kind = KIND.TILE;
    S.cyl(cx, cz, yE - 0.18, yE, R, R - 0.05, 8, C.roofDark, { cap: false, rot });
    S.cyl(cx, cz, yE, yE + 1.0, R - 0.05, 3.6, 8, C.roof, { cap: false, rot });
    S.cyl(cx, cz, yE + 1.0, yE + 2.9, 3.6, 0.35, 8, C.roof, { cap: false, rot });
    S.cyl(cx, cz, yE - 0.18, yE - 0.17, R, 0.01, 8, shade(C.roofDark, 0.6), { cap: false, rot }); // soffit, seen from below
    // hip ridges with upturned tips (đầu đao), plaster-white as on Huế roofs
    S.kind = KIND.PLAIN;
    for (let i = 0; i < 8; i++) {
      const a = rot + (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
      const p0 = [cx + c * 0.4, yE + 2.9, cz + s * 0.4], p1 = [cx + c * 3.6, yE + 1.05, cz + s * 3.6], p2 = [cx + c * (R + 0.1), yE + 0.08, cz + s * (R + 0.1)];
      S.beam(p0, p1, 0.2, 0.2, C.ridge);
      S.beam(p1, p2, 0.2, 0.2, C.ridge);
      S.beam(p2, [cx + c * (R + 0.75), yE + 0.75, cz + s * (R + 0.75)], 0.16, 0.16, C.ridge);
    }
    // finial: a gourd on a lotus seat
    S.cyl(cx, cz, yE + 2.85, yE + 3.15, 0.45, 0.3, 8, C.ridge);
    S.cyl(cx, cz, yE + 3.15, yE + 3.55, 0.32, 0.22, 8, C.ridge);
    S.cyl(cx, cz, yE + 3.55, yE + 3.95, 0.24, 0.02, 8, C.ridge);
    S.base = 0;

    // the brick path from the terrace south-west to the island's south-west bank (pale line on the satellite)
    {
      const end = SW_PATH_END, dx = end[0] - cx, dz = end[1] - cz, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
      const a = 8.2, b = L, steps = Math.ceil((b - a) / 3);
      S.kind = KIND.MASONRY;
      for (let k = 0; k < steps; k++) {
        const s0 = a + ((b - a) * k) / steps, s1 = a + ((b - a) * (k + 1)) / steps, sm = (s0 + s1) / 2;
        const x = cx + ux * sm, z = cz + uz * sm, g = groundY(x, z);
        S.box(x, z, g - 0.1, g + 0.05, s1 - s0 + 0.05, 1.8, Math.atan2(uz, ux), shade(C.plinth, 0.95), { topKind: KIND.ROAD });
      }
    }

    // rockeries (hòn non bộ) set in the lawns either side of the path
    S.kind = KIND.MASONRY;
    const rr = rng(1838);
    for (const [ox, oz] of [[9.5, 4], [-6, 10]]) {
      const bx = cx + ox, bz = cz + oz, by = groundY(bx, bz);
      S.cyl(bx, bz, by - 0.1, by + 0.25, 1.8, 1.6, 7, shade(C.plinth, 0.9));
      for (let k = 0; k < 5; k++) {
        const h = 0.6 + rr() * 1.1, r = 0.35 + rr() * 0.45;
        S.box(bx + (rr() - 0.5) * 1.8, bz + (rr() - 0.5) * 1.8, by + 0.2, by + 0.2 + h, r * 2, r * 1.6, rr() * 3, shade(C.rock, 0.85 + rr() * 0.3), { taper: 0.45 });
      }
    }
  }

  // ---------------- bamboo along the Kim Oanh dyke (planted 2020), trees on the other banks ----------------
  // Street View (car pano at the Tố Ngọc Vân corner) shows the 2020 bamboo as a hedge of vase-shaped clumps on the
  // dyke's north side; the satellite shows single trees spaced along its south side, a belt of broadleaf trees on the
  // north-west bank (Lê Văn Hưu west of the dyke, car pano) and on the Tịnh Tâm and Đinh Tiên Hoàng banks, and big
  // canopies on Bồng Lai. The trees join data.trees (city.js plants them, off the models), so they are the city's own.
  const wet = (x, z) => basins.some((rings) => inRing(x, z, rings[0]) && !rings.slice(1).some((h) => inRing(x, z, h)));
  const roadsNear = [];
  for (const r of data.roads || []) {
    if (!r || !Array.isArray(r[2])) continue;
    const p = unflat(r[2]);
    if (p.some((q) => q[0] > -1650 && q[0] < -1100 && q[1] > -1250 && q[1] < -750)) roadsNear.push([p, roadWidth(r) / 2 + (r[0] <= 2 ? 3.6 : r[0] <= 3 ? 2.4 : 0.6) / 2 + 1.2]);
  }
  const onRoad = (x, z) => roadsNear.some(([p, hw]) => distLine(x, z, p) < hw);
  const trees = Array.isArray(data.trees) ? data.trees : null, have = [];
  if (trees) for (let k = 0; k < trees.length; k += 4) { const x = trees[k] / 10, z = trees[k + 1] / 10; if (x > -1650 && x < -1100 && z > -1250 && z < -750) have.push([x, z]); }
  // city.js turns about half the shade trees near water into willows, chosen by their index in data.trees. The
  // imagery shows round broadleaf canopies on Bồng Lai and the Tịnh Tâm bank, so those (broad) take the slots that
  // stay broadleaf and the rest, where a willow is plausible (the dyke, the other banks), take the others.
  const broad = [], any = [];
  const addTree = (x, z, sc, kind, gap = 6, mustBroad = false) => {
    if (!trees || wet(x, z) || onRoad(x, z) || have.some((q) => Math.hypot(q[0] - x, q[1] - z) < gap)) return false;
    if (distLine(x, z, BR_BONGLAI) < 5 || distLine(x, z, BR_PHUONG) < 5) return false;
    (mustBroad ? broad : any).push([Math.round(x * 10), Math.round(z * 10), Math.round(sc * 10), kind]);
    have.push([x, z]);
    return true;
  };
  const walker = (pts) => {
    const total = pathLength(pts);
    const along = (s) => {
      let acc = 0;
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (acc + L >= s) { const t = (s - acc) / L; return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], u: [(b[0] - a[0]) / L, (b[1] - a[1]) / L], i }; }
        acc += L;
      }
      return null;
    };
    return { total, along };
  };
  // from a point on a road, walk out to one side until the water; return the bank point `back` metres short of it
  const toBank = (A, side, back, from = 3.5, to = 24) => {
    for (let o = from; o < to; o += 0.25) {
      const tx = A.p[0] - A.u[1] * side * o, tz = A.p[1] + A.u[0] * side * o;
      if (wet(tx, tz)) { const ob = side * Math.max(from - 0.5, o - back); return [A.p[0] - A.u[1] * ob, A.p[1] + A.u[0] * ob]; }
    }
    return null;
  };
  {
    const rr = rng(2020);
    const { total, along } = walker(DYKE);
    const L0 = Math.hypot(DYKE[1][0] - DYKE[0][0], DYKE[1][1] - DYKE[0][1]); // the first leg is the north-west bank, not the dyke
    // side -1 is the dyke's north (left, walking north-east), side 1 its south
    for (let s = L0 + 4; s < total; s += 8.5) {
      const A = along(s);
      if (!A) break;
      const q = toBank(A, -1, 1.0 + rr() * 0.4, 3.5, 12);
      if (!q) continue;
      const [x, z] = q;
      if (distLine(x, z, BR_BONGLAI) < 6 || distLine(x, z, BR_PHUONG) < 6) continue;
      if (roadsNear.some(([p, hw]) => distLine(x, z, p) < hw + 1.2)) continue; // the crown stays off the carriageway
      const y = groundY(x, z);
      // lean the clump out over the water
      const lx = -A.u[1] * -1, lz = A.u[0] * -1;
      const h = 6 + rr() * 2, top = 1.5 + rr() * 0.4, lean = 0.6 + rr() * 0.3;
      S.kind = KIND.TIMBER;
      for (let k = 0; k < 7; k++) { // the culms, splaying out of the clump's foot
        const a = (k / 7) * 6.28 + rr() * 0.6, d = 0.15 + rr() * 0.35;
        S.beam([x + Math.cos(a) * d, y - 0.1, z + Math.sin(a) * d], [x + Math.cos(a) * (d + 0.5) + lx * 0.3, y + 2.6, z + Math.sin(a) * (d + 0.5) + lz * 0.3], 0.09, 0.09, k % 3 ? C.bambooOld : C.bamboo);
      }
      S.kind = KIND.PLAIN;
      const rot = rr() * 6.28;
      // a vase of feathery leaves: narrow at the foot, widest high up, drooping to a soft tip
      S.cyl(x + lx * 0.3, z + lz * 0.3, y + 1.8, y + h * 0.62, 0.7, top, 7, C.leaf2, { cap: false, rot });
      S.cyl(x + lx * lean, z + lz * lean, y + h * 0.62, y + h, top, 0.35, 7, C.leaf, { cap: false, rot: rot + 0.4 });
      S.cyl(x + lx * lean, z + lz * lean, y + h * 0.62 - 0.01, y + h * 0.62, top * 0.98, 0.7, 7, shade(C.leaf, 0.7), { cap: false, rot }); // underside
    }
    // single trees along the dyke's south side
    for (let s = L0 + 10; s < total; s += 17) { const A = along(s); const q = A && toBank(A, 1, 1.4, 3.5, 12); if (q) addTree(q[0], q[1], 1.0 + rr() * 0.3, 0); }
    // the broadleaf belt on the north-west bank (first leg)
    for (let s = 4; s < L0 - 4; s += 9) { const A = along(s); const q = A && toBank(A, 1, 1.6, 3.5, 14); if (q) addTree(q[0], q[1], 1.1 + rr() * 0.4, rr() < 0.5 ? 1 : 0); }
  }
  // the parapet on Tịnh Tâm and the tree rows on the Tịnh Tâm and Đinh Tiên Hoàng banks
  {
    const rr = rng(1946);
    const { total, along } = walker(TINHTAM_RD);
    // which side of the road the lake is on, found by walking out from its middle
    const mid = along(total / 2);
    const lakeSide = toBank(mid, 1, 0, 3.5, 30) ? 1 : -1;
    const EDGE = 6.5 / 2 + 2.4 / 2 + 0.35; // carriageway and pavement (city.js pavW), the wall just beyond
    S.kind = KIND.MASONRY;
    const step = 2.5;
    for (let s = 0; s < total - step; s += step) {
      const A = along(s + step / 2);
      if (!A || !toBank(A, lakeSide, 0, 3.5, 26)) continue; // only where the bank runs beside the road
      const o = lakeSide * EDGE, x = A.p[0] - A.u[1] * o, z = A.p[1] + A.u[0] * o, g = groundY(x, z);
      const ang = Math.atan2(A.u[1], A.u[0]);
      S.box(x, z, g - 0.2, g + 0.62, step + 0.02, 0.28, ang, C.concrete, { top: shade(C.concrete, 1.05) });
      S.box(x, z, g + 0.62, g + 0.72, step + 0.02, 0.36, ang, shade(C.concrete, 0.92)); // coping
      S.box(x - A.u[1] * lakeSide * 0.15, z + A.u[0] * lakeSide * 0.15, g - 0.2, g + 0.12, step + 0.02, 0.06, ang, C.moss); // damp foot
    }
    for (let s = 5; s < total; s += 8 + rr() * 3) { const A = along(s); const q = A && toBank(A, lakeSide, 2.8 + rr(), 3.5, 26); if (q) addTree(q[0], q[1], 1.4 + rr() * 0.5, rr() < 0.4 ? 1 : 0, 6, true); }
    const D = walker(DTH_RD);
    const midD = D.along(D.total / 2), sideD = toBank(midD, 1, 0, 3.5, 30) ? 1 : -1;
    for (let s = 4; s < D.total; s += 8 + rr() * 3) { const A = D.along(s); const q = A && toBank(A, sideD, 2.5 + rr(), 7, 26); if (q) addTree(q[0], q[1], 1.3 + rr() * 0.5, rr() < 0.4 ? 1 : 0); }
  }
  // Bồng Lai's canopies
  ISLAND_TREES.forEach(([x, z], k) => addTree(x, z, 2.3 + ((k * 7) % 5) * 0.1, k % 3 ? 0 : 1, 3, true));
  if (trees) {
    while (broad.length || any.length) {
      const j = trees.length / 4, willowSlot = rand(j, 71) < 0.5;
      const t = (willowSlot ? any.shift() : broad.shift()) || broad.shift() || any.shift();
      trees.push(...t);
    }
  }
  S.kind = KIND.PLAIN;

  // ---------------- white lotus (sen trắng) over both basins ----------------
  // The satellite and Street View (Nov 2026) show the lotus as a near-continuous mat, with a few open patches in the
  // south basin: leaves held 0.2–0.9 m above the water on their stalks over a floor of floating ones.
  {
    const rnd = rng(1838_2020);
    const pads = [], blooms = [];
    const MAX = quality.low ? 2400 : 6000, MAT = quality.low ? 2000 : 5000;
    basins.forEach((rings, bi) => {
      const outer = rings[0];
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const p of outer) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
      const want = (MAX + MAT) / 2;
      for (let k = 0, tries = 0; k < want && tries < want * 8; tries++) {
        const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
        if (Math.sin(x * 0.06 + bi) * Math.cos(z * 0.05) + Math.sin((x - z) * 0.027) < -1.15 - rnd() * 0.5) continue; // the open patches
        if (!inRing(x, z, outer) || rings.slice(1).some((h) => inRing(x, z, h))) continue;
        if (distLine(x, z, [...outer, outer[0]]) < 1.6) continue;
        if (rings.slice(1).some((h) => distLine(x, z, [...h, h[0]]) < 1.6)) continue;
        if (distLine(x, z, BR_BONGLAI) < 2.6 || distLine(x, z, BR_PHUONG) < 2.2) continue;
        const floating = k < MAT / 2;
        const r = floating ? 1.8 + rnd() * 1.2 : 0.75 + rnd() * 0.8, h = floating ? 0.05 + rnd() * 0.03 : 0.2 + rnd() * 0.7;
        pads.push([x, z, r, rnd() * 6.28, h]);
        if (!floating && rnd() < 0.08) blooms.push([x + (rnd() - 0.5), z + (rnd() - 0.5), 1.1 + rnd() * 0.6, h]);
        k++;
      }
    });
    const mat = cityMaterial();
    // a leaf (unit radius, at y 1, a shallow cup) on its stalk from the water (y 0); instances scale x/z by the leaf's
    // radius and y by its height, so a floating leaf is the same leaf with a stalk too short to see
    const padGeo = new Buf(24);
    for (let i = 0; i < 7; i++) {
      const a0 = 0.35 + (i / 7) * (Math.PI * 2 - 0.7), a1 = 0.35 + ((i + 1) / 7) * (Math.PI * 2 - 0.7);
      padGeo.tri([0, 0.96, 0], [Math.cos(a0), 1, Math.sin(a0)], [Math.cos(a1), 1, Math.sin(a1)], i % 2 ? [1, 1, 1] : [0.86, 0.86, 0.86], [0, 1, 0]);
    }
    padGeo.cyl(0, 0, 0, 0.97, 0.025, 0.025, 3, [0.55, 0.62, 0.45], { cap: false });
    // a white bloom held above the leaves on its stalk
    const bloomGeo = new Buf(40);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, b = a + 0.62;
      bloomGeo.tri([0, 0.55, 0], [Math.cos(a) * 0.4, 1.05, Math.sin(a) * 0.4], [Math.cos(b) * 0.4, 1.05, Math.sin(b) * 0.4], [1, 1, 1], [Math.cos(a), 0.6, Math.sin(a)]);
      bloomGeo.tri([0, 0.55, 0], [Math.cos(b) * 0.4, 1.05, Math.sin(b) * 0.4], [Math.cos(a) * 0.4, 1.05, Math.sin(a) * 0.4], [0.82, 0.82, 0.8], [-Math.cos(a), 0.3, -Math.sin(a)]);
    }
    bloomGeo.cyl(0, 0, 0, 0.58, 0.03, 0.03, 4, [0.35, 0.5, 0.3], { cap: false });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    const greens = ['#4f8a4a', '#5f9a52', '#6a9e58', '#47804a', '#7aa660'].map(hex), whites = ['#fbfaf2', '#f6f2e4', '#fffdf6', '#f3e9e4'].map(hex);
    const padMesh = new THREE.InstancedMesh(padGeo.geometry(), mat, Math.max(1, pads.length));
    padMesh.count = pads.length;
    pads.forEach(([x, z, r, a], i) => {
      q.setFromAxisAngle(up, a); p.set(x, POND_Y, z); s.set(r, pads[i][4], r);
      padMesh.setMatrixAt(i, m.compose(p, q, s));
      padMesh.setColorAt(i, enc(shade(greens[i % greens.length], 0.85 + ((i * 7) % 10) / 33), c));
    });
    const bloomMesh = new THREE.InstancedMesh(bloomGeo.geometry(), mat, Math.max(1, blooms.length));
    bloomMesh.count = blooms.length;
    blooms.forEach(([x, z, r, h], i) => {
      q.setFromAxisAngle(up, i); p.set(x, POND_Y + Math.max(0.05, h - 0.35), z); s.set(r, r, r);
      bloomMesh.setMatrixAt(i, m.compose(p, q, s));
      bloomMesh.setColorAt(i, enc(whites[i % whites.length], c));
    });
    for (const mesh of [padMesh, bloomMesh]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.layers.set(1);
      mesh.userData.landmark = id;
      group.add(mesh);
    }
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
