import * as THREE from 'three';
import { Buf, KIND, hex, shade, mix, unflat, obb, signedArea } from './buf.js';
import { cityMaterial, landMaterial, enc, glowPoints } from './materials.js';
import { LAND_Y, WALL_H, PAL, quality } from '../config.js';

const rand = (i, salt = 0) => {
  let h = ((i + 1) * 2654435761 + salt * 40503) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
const pick = (arr, i, salt = 0) => arr[Math.floor(rand(i, salt) * arr.length) % arr.length];
const ROAD_W = [15, 12, 9.5, 6.5, 4, 2.2];
// Bucket instances into ~900 m tiles so each tile can be frustum-culled (and skipped by the shadow pass) as one unit.
function chunked(items, size = 900) {
  const map = new Map();
  for (const it of items) {
    const key = Math.floor(it.x / size) + ',' + Math.floor(it.z / size);
    let list = map.get(key);
    if (!list) map.set(key, (list = []));
    list.push(it);
  }
  return map.values();
}

// ---------- land ----------
function buildLand(data, group) {
  const top = landMaterial(PAL.land, true);
  const side = landMaterial(PAL.bank);
  for (const poly of data.land) {
    const rings = poly.map(unflat);
    const shape = new THREE.Shape(rings[0].map((p) => new THREE.Vector2(p[0], p[1])));
    for (let i = 1; i < rings.length; i++) shape.holes.push(new THREE.Path(rings[i].map((p) => new THREE.Vector2(p[0], p[1]))));
    const g = new THREE.ExtrudeGeometry(shape, { depth: LAND_Y + 1.2, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(Math.PI / 2);
    g.translate(0, LAND_Y, 0);
    const m = new THREE.Mesh(g, [top, side]);
    m.receiveShadow = true;
    m.castShadow = true; // banks shade the water's edge
    m.name = 'land';
    group.add(m);
  }
  // the block the diorama stands on: the city is one slab, cut clean at the edge of the bundled data
  const b = data.meta.bounds.map((v) => v / 10);
  const base = new THREE.Mesh(new THREE.BoxGeometry(b[2] - b[0], 90, b[3] - b[1]), landMaterial(PAL.base));
  base.position.set((b[0] + b[2]) / 2, -0.6 - 45, (b[1] + b[3]) / 2);
  base.name = 'base';
  group.add(base);
}

// flat polygon layers painted onto the land (no depth write, drawn in order)
function overlayMaterial(order) {
  const m = cityMaterial({ depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 - order, polygonOffsetUnits: -2 - order * 2 });
  return m;
}

function buildGreen(data, group) {
  const B = new Buf(20000);
  B.kind = KIND.GROUND;
  const y = LAND_Y + 0.03;
  for (const [k, poly] of data.green) {
    const col = hex(PAL.green[k] || PAL.green.grass);
    const rings = poly.map(unflat);
    const contour = rings[0].map((p) => new THREE.Vector2(p[0], p[1]));
    const holes = rings.slice(1).map((r) => r.map((p) => new THREE.Vector2(p[0], p[1])));
    let faces;
    try { faces = THREE.ShapeUtils.triangulateShape(contour, holes); } catch { continue; }
    const pts = contour.concat(...holes);
    for (const f of faces) B.tri([pts[f[0]].x, y, pts[f[0]].y], [pts[f[1]].x, y, pts[f[1]].y], [pts[f[2]].x, y, pts[f[2]].y], col, [0, 1, 0]);
  }
  const mesh = new THREE.Mesh(B.geometry(), overlayMaterial(0));
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  group.add(mesh);
}

// ---------- roads ----------
function ribbonPoints(pts, width) {
  const n = pts.length;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let d1x = p[0] - a[0], d1z = p[1] - a[1], d2x = b[0] - p[0], d2z = b[1] - p[1];
    let l1 = Math.hypot(d1x, d1z), l2 = Math.hypot(d2x, d2z);
    if (l1 < 1e-6) { d1x = d2x; d1z = d2z; l1 = l2; }
    if (l2 < 1e-6) { d2x = d1x; d2z = d1z; l2 = l1; }
    if (l1 < 1e-6) { L.push(p); R.push(p); continue; }
    d1x /= l1; d1z /= l1; d2x /= l2; d2z /= l2;
    let tx = d1x + d2x, tz = d1z + d2z;
    const tl = Math.hypot(tx, tz);
    if (tl < 1e-6) { tx = d1x; tz = d1z; } else { tx /= tl; tz /= tl; }
    const nx = -tz, nz = tx;
    const k = (width / 2) / Math.max(0.55, nx * -d1z + nz * d1x);
    L.push([p[0] + nx * k, p[1] + nz * k]);
    R.push([p[0] - nx * k, p[1] - nz * k]);
  }
  return [L, R];
}
function ribbon(B, pts, width, y, col) {
  const [L, R] = ribbonPoints(pts, width);
  for (let i = 0; i + 1 < pts.length; i++) B.quad([L[i][0], y, L[i][1]], [R[i][0], y, R[i][1]], [R[i + 1][0], y, R[i + 1][1]], [L[i + 1][0], y, L[i + 1][1]], col, [0, 1, 0]);
}
function slab(B, pts, width, yTop, thick, col, sideCol, parapet = 0) {
  const [L, R] = ribbonPoints(pts, width);
  const yb = yTop - thick;
  for (let i = 0; i + 1 < pts.length; i++) {
    const j = i + 1;
    B.quad([L[i][0], yTop, L[i][1]], [R[i][0], yTop, R[i][1]], [R[j][0], yTop, R[j][1]], [L[j][0], yTop, L[j][1]], col, [0, 1, 0]);
    B.quad([L[i][0], yb, L[i][1]], [R[i][0], yb, R[i][1]], [R[j][0], yb, R[j][1]], [L[j][0], yb, L[j][1]], sideCol, [0, -1, 0]);
    const nx = L[i][0] - R[i][0], nz = L[i][1] - R[i][1];
    B.quad([L[i][0], yb, L[i][1]], [L[j][0], yb, L[j][1]], [L[j][0], yTop + parapet, L[j][1]], [L[i][0], yTop + parapet, L[i][1]], sideCol, [nx, 0, nz]);
    B.quad([R[i][0], yb, R[i][1]], [R[j][0], yb, R[j][1]], [R[j][0], yTop + parapet, R[j][1]], [R[i][0], yTop + parapet, R[i][1]], sideCol, [-nx, 0, -nz]);
    if (parapet) {
      B.quad([L[i][0], yTop + parapet, L[i][1]], [L[j][0], yTop + parapet, L[j][1]], [L[j][0], yTop, L[j][1]], [L[i][0], yTop, L[i][1]], sideCol, [-nx, 0, -nz]);
      B.quad([R[i][0], yTop + parapet, R[i][1]], [R[j][0], yTop + parapet, R[j][1]], [R[j][0], yTop, R[j][1]], [R[i][0], yTop, R[i][1]], sideCol, [nx, 0, nz]);
    }
  }
}
function pathLength(pts) { let s = 0; for (let i = 0; i + 1 < pts.length; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return s; }
function along(pts, dist) {
  let s = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s + l >= dist && l > 0) { const t = (dist - s) / l; return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], a: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    s += l;
  }
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  return { p: b, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

function buildRoads(data, group, structures) {
  const B = new Buf(160000);
  B.kind = KIND.ROAD;
  const roads = data.roads.map(([c, bridge, flat]) => ({ c, bridge, pts: unflat(flat) }));
  const casing = hex(PAL.casing);
  const cols = PAL.road.map(hex);
  const y = LAND_Y + 0.05;
  // painter's order: pavements, then minor → major carriageways, then lane markings
  for (const r of roads) if (!r.bridge && r.c <= 3) ribbon(B, r.pts, ROAD_W[r.c] + (r.c <= 2 ? 3.6 : 2.4), y, casing);
  for (let c = 5; c >= 0; c--) for (const r of roads) if (r.c === c && !r.bridge) ribbon(B, r.pts, ROAD_W[c], y + 0.01, cols[c]);
  const paint = hex('#f4eedd');
  for (const r of roads) {
    if (r.bridge || r.c > 1) continue;
    const len = pathLength(r.pts);
    for (let s0 = 4; s0 + 5 < len; s0 += 13) {
      const p0 = along(r.pts, s0).p, p1 = along(r.pts, s0 + 5).p;
      ribbon(B, [p0, p1], 0.32, y + 0.02, paint);
    }
  }
  for (const [main, bridge, flat] of data.rails) {
    const pts = unflat(flat);
    if (bridge) continue;
    ribbon(B, pts, main ? 5.4 : 4, y + 0.02, hex(PAL.ballast));
    ribbon(B, pts, main ? 1.9 : 1.4, y + 0.03, hex(PAL.rail));
  }
  const mesh = new THREE.Mesh(B.geometry(), overlayMaterial(1));
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;
  group.add(mesh);

  // bridges: real slabs with piers, so they read from the water as well as from above
  const pier = PAL.pier, deckSide = hex('#a59c8b');
  for (const r of roads) {
    if (!r.bridge) continue;
    const w = ROAD_W[r.c] + (r.c <= 2 ? 3 : 1.5);
    const top = LAND_Y + 0.42;
    slab(structures, r.pts, w, top, r.c <= 2 ? 1.3 : 0.7, cols[Math.min(r.c, 3)], deckSide, r.c <= 4 ? 0.9 : 0.5);
    const len = pathLength(r.pts);
    if (len > 42 && r.c <= 3) {
      const n = Math.max(1, Math.round(len / 30) - 1);
      for (let i = 1; i <= n; i++) {
        const { p, a } = along(r.pts, (len * i) / (n + 1));
        structures.box(p[0], p[1], -3, top - 1.2, 2.2, w - 2.5, a, pier);
      }
    }
  }
  for (const [main, bridge, flat] of data.rails) {
    if (!bridge) continue;
    const pts = unflat(flat);
    slab(structures, pts, 5.5, LAND_Y + 0.5, 1.4, hex(PAL.rail), hex('#6d6670'), 1.6);
    const len = pathLength(pts);
    const n = Math.round(len / 34) - 1;
    for (let i = 1; i <= n; i++) { const { p, a } = along(pts, (len * i) / (n + 1)); structures.box(p[0], p[1], -3, LAND_Y - 0.9, 2.4, 6, a, pier); }
  }

  // street lamps along the main streets (drawn only when the mood calls for light)
  const lp = [], lc = [];
  for (const r of roads) {
    if (r.c > 2) continue;
    const len = pathLength(r.pts);
    const step = r.c === 0 ? 30 : 36;
    for (let s = step / 2, k = 0; s < len; s += step, k++) {
      const { p, a } = along(r.pts, s);
      const off = (ROAD_W[r.c] / 2 + 0.5) * (k % 2 ? 1 : -1);
      lp.push(p[0] - Math.sin(a) * off, LAND_Y + (r.bridge ? 8 : 7.5), p[1] + Math.cos(a) * off);
      const warm = 0.85 + rand(k, r.c) * 0.3;
      lc.push(1.0 * warm, 0.74 * warm, 0.42 * warm);
    }
  }
  const lamps = glowPoints(lp, lc, 7);
  lamps.material.uniforms.uBoost.value = 0.6;
  group.add(lamps);
  return { lamps };
}

// ---------- buildings from OSM footprints ----------
const SILVER = hex('#c9ced1'), SILVER_D = hex('#8f979c');
function waterTank(B, x, z, y, ang, s = 1) {
  // the stainless roof tank on its frame: as much a part of a Vietnamese roofscape as the tiles
  const k = B.kind;
  B.kind = KIND.PLAIN;
  B.box(x, z, y, y + 0.7 * s, 1.1 * s, 1.1 * s, ang, SILVER_D, { taper: 0.9 });
  B.cyl(x, z, y + 0.7 * s, y + 2.0 * s, 0.58 * s, 0.58 * s, 8, SILVER);
  B.cyl(x, z, y + 2.0 * s, y + 2.22 * s, 0.58 * s, 0.2 * s, 8, hex('#dfe3e5'));
  B.kind = k;
}

function buildBuildings(data, group) {
  const B = new Buf(420000);
  const P = PAL;
  const ridgeGold = hex('#f1d77a'), ridgeGrey = hex('#cfc4a4');
  data.bld.forEach((b, i) => {
    const ring = unflat(b[0]);
    const h = b[1] / 10, kind = b[2];
    const y0 = LAND_Y, y1 = y0 + h;
    const area = Math.abs(signedArea(ring));
    const o = obb(ring);
    const rectness = area / Math.max(1, o.w * o.d);
    let wall, roof, pitched = false, flare = 0, over = 0.5, rh = 0, ridge = null, hips = false;
    const jitter = 0.92 + rand(i, 7) * 0.16;
    switch (kind) {
      case 2: // inside the Imperial City: glazed yellow, a few jade
        wall = P.lacquer; roof = rand(i, 3) < 0.22 ? P.jadeRoof : rand(i, 4) < 0.5 ? P.imperialRoof : P.imperialRoof2;
        pitched = rectness > 0.72 && o.d < 34; flare = 0.5; over = 1.3; rh = Math.min(6, Math.max(2, o.d * 0.3)); ridge = ridgeGold; hips = true;
        break;
      case 3: wall = P.templeWall; roof = P.templeRoof; pitched = rectness > 0.72 && o.d < 28; flare = 0.4; over = 0.9; rh = Math.min(5, Math.max(1.8, o.d * 0.3)); ridge = ridgeGrey; hips = true; break;
      case 4: wall = P.church; roof = P.slate; pitched = rectness > 0.75 && o.d < 26; rh = Math.min(8, o.d * 0.45); break;
      case 5: wall = pick(P.modernWall, i, 1); roof = rand(i, 2) < 0.45 ? pick(P.roofs, i, 5) : pick(P.concrete, i, 2); pitched = rectness > 0.86 && o.d < 17 && rand(i, 2) < 0.45; rh = Math.min(3.6, o.d * 0.24); break;
      case 6: wall = P.marketWall; roof = P.marketRoof; pitched = rectness > 0.8; rh = Math.min(3.5, Math.max(1.2, o.d * 0.26)); break;
      case 7: wall = P.glass; roof = shade(P.glass, 0.82); break;
      case 8: wall = shade(P.concrete[0], 0.9); roof = pick(P.roofs, i, 2); break;
      case 1: wall = pick(P.modernWall, i, 1); roof = pick(P.concrete, i, 2); break;
      default:
        wall = pick(P.walls, i, 1); roof = pick(P.roofs, i, 2);
        pitched = rectness > 0.8 && o.d < 15.5 && area < 520; rh = Math.min(3.6, Math.max(1.1, o.d * 0.26));
    }
    wall = shade(wall, jitter);
    roof = shade(roof, 0.9 + rand(i, 9) * 0.2);
    if (b[4] === 1) {
      // mapped over the water: stand it on a deck carried by piles
      B.kind = KIND.PLAIN;
      const cx = o.c[0], cz = o.c[1];
      const deck = ring.map((pt) => [cx + (pt[0] - cx) * 1.12, cz + (pt[1] - cz) * 1.12]);
      B.prism(deck, LAND_Y - 0.7, LAND_Y - 0.02, hex('#8a7a66'), hex('#b3a48c'), { topKind: KIND.ROAD });
      const step = Math.max(1, Math.round(ring.length / 10));
      for (let k = 0; k < ring.length; k += step) B.cyl(cx + (ring[k][0] - cx) * 0.94, cz + (ring[k][1] - cz) * 0.94, -2, LAND_Y - 0.7, 0.42, 0.42, 6, hex('#9c9488'), { cap: false });
      B.cyl(cx, cz, -2, LAND_Y - 0.7, 0.6, 0.6, 6, hex('#9c9488'), { cap: false });
    }
    B.kind = kind === 8 ? KIND.PLAIN : kind === 2 ? KIND.TIMBER : KIND.FACADE;
    if (pitched) {
      B.prism(ring, y0, y1, wall, shade(roof, 0.85), { top: rectness < 0.96, topKind: KIND.TILE });
      B.hip(o.c[0], o.c[1], o.w, o.d, o.a, y1 + 0.02, rh, roof, { flare, over, fascia: flare ? 0.34 : 0.24, fasciaCol: flare ? shade(wall, 0.7) : shade(wall, 0.86), ridgeCol: ridge, hips });
    } else {
      // tiled lid for small irregular houses; a concrete tray with a parapet for everything else
      const tiled = (kind === 0 && area < 300 && rand(i, 16) < 0.6) || kind === 8 || kind === 6 || kind === 2 || kind === 3 || kind === 4;
      if (tiled) B.prism(ring, y0, y1, wall, roof, { topKind: KIND.TILE });
      else {
        const lid = kind === 7 ? roof : pick(P.concrete, i, 17);
        B.prism(ring, y0, y1, wall, shade(lid, 0.92), { topKind: KIND.FLAT, parapet: kind === 7 ? 1.6 : 0.8 });
        if (area > 70 && kind !== 7) {
          const ux = Math.cos(o.a), uz = Math.sin(o.a);
          if (area > 140 && rand(i, 11) < 0.65) {
            // stair head
            const s = 2.6 + rand(i, 12) * 2.2;
            const dx = (rand(i, 13) - 0.5) * o.w * 0.3, dz = (rand(i, 14) - 0.5) * o.d * 0.3;
            B.box(o.c[0] + ux * dx - uz * dz, o.c[1] + uz * dx + ux * dz, y1, y1 + 2.3 + rand(i, 15), s, s * 0.8, o.a, shade(wall, 0.94), { top: shade(lid, 0.85), topKind: KIND.FLAT });
          }
          const tanks = area > 400 ? 2 : rand(i, 18) < 0.7 ? 1 : 0;
          for (let k = 0; k < tanks; k++) {
            const dx = (rand(i, 19 + k) - 0.5) * o.w * 0.45, dz = (rand(i, 23 + k) - 0.5) * o.d * 0.45;
            waterTank(B, o.c[0] + ux * dx - uz * dz, o.c[1] + uz * dx + ux * dz, y1, o.a, 0.9 + rand(i, 27 + k) * 0.4);
          }
        }
      }
    }
  });
  const mesh = new THREE.Mesh(B.geometry(), cityMaterial({ windows: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'buildings';
  group.add(mesh);
  return mesh;
}

// ---------- illustrated infill houses (instanced) ----------
// Records arrive with the near-water ones first; those are also drawn into the river's reflection (layer 0),
// the rest only into the main view (layer 1). Houses on main streets mostly become row houses: gable roofs
// with the ridge running along the street, so a block reads as one long tiled roofline.
function buildInfill(data, group) {
  const a = data.infill, S = 7;
  const n = a.length / S;
  const nearCount = data.meta.counts.infillNear ?? n;
  const W = [1, 1, 1];

  const wallGeo = new Buf(16);
  wallGeo.kind = KIND.FACADE;
  wallGeo.box(0, 0, 0, 1, 1, 1, 0, W, { top: [0.72, 0.72, 0.72], topKind: KIND.FLAT });

  const hipGeo = new Buf(24);
  {
    hipGeo.kind = KIND.TILE;
    const e = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]];
    const r0 = [-0.28, 1, 0], r1 = [0.28, 1, 0];
    hipGeo.quad(e[0], e[1], r1, r0, W, [0, 1, -1]);
    hipGeo.quad(e[2], e[3], r0, r1, W, [0, 1, 1]);
    hipGeo.tri(e[1], e[2], r1, W, [1, 1, 0]);
    hipGeo.tri(e[3], e[0], r0, W, [-1, 1, 0]);
    hipGeo.kind = KIND.PLAIN;
    const lo = e.map((p) => [p[0], -0.1, p[2]]);
    const f = [0.62, 0.62, 0.62];
    const hints = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; hipGeo.quad(lo[i], lo[j], e[j], e[i], f, hints[i]); }
    hipGeo.quad(lo[0], lo[1], lo[2], lo[3], [0.45, 0.45, 0.45], [0, -1, 0]);
  }
  const gableGeo = new Buf(16);
  {
    gableGeo.kind = KIND.TILE;
    gableGeo.quad([-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 1, 0], [-0.5, 1, 0], W, [0, 1, -1]);
    gableGeo.quad([0.5, 0, 0.5], [-0.5, 0, 0.5], [-0.5, 1, 0], [0.5, 1, 0], W, [0, 1, 1]);
    gableGeo.kind = KIND.PLAIN;
    const f = [0.6, 0.6, 0.6];
    gableGeo.quad([-0.5, -0.12, -0.5], [0.5, -0.12, -0.5], [0.5, 0, -0.5], [-0.5, 0, -0.5], f, [0, 0, -1]);
    gableGeo.quad([-0.5, -0.12, 0.5], [0.5, -0.12, 0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], f, [0, 0, 1]);
    gableGeo.quad([-0.5, -0.12, -0.5], [0.5, -0.12, -0.5], [0.5, -0.12, 0.5], [-0.5, -0.12, 0.5], [0.42, 0.42, 0.42], [0, -1, 0]);
  }
  const endGeo = new Buf(4); // the two gable walls under a gable roof
  endGeo.kind = KIND.PLAIN;
  endGeo.tri([-0.5, -0.12, -0.5], [-0.5, -0.12, 0.5], [-0.5, 1, 0], W, [-1, 0, 0]);
  endGeo.tri([0.5, -0.12, -0.5], [0.5, -0.12, 0.5], [0.5, 1, 0], W, [1, 0, 0]);
  const tankGeo = new Buf(64);
  waterTank(tankGeo, 0, 0, 0, 0, 1);

  const geos = { wall: wallGeo.geometry(), hip: hipGeo.geometry(), gable: gableGeo.geometry(), end: endGeo.geometry() };
  const wallMat = cityMaterial({ windows: true }), roofMat = cityMaterial(), tankMat = cityMaterial();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const meshes = [];
  const tanks = [];

  const collect = (start, end) => {
    // break up the monotony of one box per plot: about half the houses get a lower rear wing
    const parts = [];
    for (let i = start; i < end; i++) {
      const x = a[i * S] / 10, z = a[i * S + 1] / 10;
      const w = a[i * S + 2] / 10, d = a[i * S + 3] / 10, ang = a[i * S + 4] / 1000, h = a[i * S + 5] / 10, main = a[i * S + 6] === 1;
      const wallCol = shade(mix(pick(PAL.walls, i, 31), [0.86, 0.8, 0.68], 0.08), 0.9 + rand(i, 32) * 0.18);
      const roofCol = shade(pick(PAL.roofs, i, 34), 0.84 + rand(i, 35) * 0.28);
      if (d > 9.5 && rand(i, 50) < 0.55) {
        const vx = -Math.sin(ang), vz = Math.cos(ang);
        const fd = d * (0.5 + rand(i, 51) * 0.14), rd = d - fd, sgn = rand(i, 52) < 0.5 ? 1 : -1;
        const o1 = sgn * (d / 2 - fd / 2), o2 = -sgn * (d / 2 - rd / 2);
        parts.push({ i, x: x + vx * o1, z: z + vz * o1, w, d: fd, ang, h, wallCol, roofCol, salt: 0, main });
        const h2 = Math.max(3.3, h - 3.4 * (rand(i, 53) < 0.7 ? 1 : 2));
        const w2 = w * (0.72 + rand(i, 54) * 0.28);
        parts.push({ i, x: x + vx * o2, z: z + vz * o2, w: w2, d: rd, ang, h: h2, wallCol: shade(wallCol, 0.95), roofCol: shade(roofCol, 0.92), salt: 7, main });
      } else parts.push({ i, x, z, w, d, ang, h, wallCol, roofCol, salt: 0, main });
    }
    return parts;
  };

  const place = (parts, layer) => {
    const count = parts.length;
    const walls = new THREE.InstancedMesh(geos.wall, wallMat, count);
    const hips = new THREE.InstancedMesh(geos.hip, roofMat, count);
    const gables = new THREE.InstancedMesh(geos.gable, roofMat, count);
    const ends = new THREE.InstancedMesh(geos.end, roofMat, count);
    parts.forEach((pt, k) => {
      const { i, x, z, salt } = pt;
      let { w, d, ang, h } = pt;
      const flatRoof = rand(i, 21 + salt) < 0.2;
      const gable = !flatRoof && salt === 0 && rand(i, 60) < (pt.main ? 0.88 : 0.5);
      if (flatRoof) h += 0.7;
      // walls keep the plot's own axes (width along the street)
      q.setFromAxisAngle(up, -ang);
      p.set(x, LAND_Y, z); s.set(w, h, d);
      walls.setMatrixAt(k, m.compose(p, q, s));
      walls.setColorAt(k, enc(pt.wallCol, c));
      hips.setMatrixAt(k, zero); gables.setMatrixAt(k, zero); ends.setMatrixAt(k, zero);
      hips.setColorAt(k, enc(pt.roofCol, c)); gables.setColorAt(k, enc(pt.roofCol, c)); ends.setColorAt(k, enc(shade(pt.wallCol, 0.97), c));
      if (gable) {
        const rh = Math.min(3.4, Math.max(1.2, d * (0.2 + rand(i, 37) * 0.07)));
        p.set(x, LAND_Y + h + 0.12, z); s.set(w + 0.24, rh, d + 1.1);
        gables.setMatrixAt(k, m.compose(p, q, s));
        s.set(w, rh, d + 1.1);
        ends.setMatrixAt(k, m.compose(p, q, s));
      } else if (!flatRoof) {
        if (d > w) { [w, d] = [d, w]; q.setFromAxisAngle(up, -(ang + Math.PI / 2)); }
        const rh = Math.min(3.2, Math.max(1.0, d * (0.24 + rand(i, 37 + salt) * 0.08)));
        p.set(x, LAND_Y + h + 0.02, z); s.set(w + 0.9, rh, d + 0.9);
        hips.setMatrixAt(k, m.compose(p, q, s));
      } else if (rand(i, 38 + salt) < 0.75) tanks.push([x + (rand(i, 39) - 0.5) * w * 0.3, LAND_Y + h, z + (rand(i, 40) - 0.5) * d * 0.3, ang, 0.85 + rand(i, 41) * 0.3]);
    });
    for (const mesh of [walls, hips, gables, ends]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = !quality.low || mesh === walls;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      mesh.layers.set(layer);
      group.add(mesh);
      meshes.push(mesh);
    }
  };
  for (const list of chunked(collect(0, nearCount))) place(list, 0);
  for (const list of chunked(collect(nearCount, n))) place(list, 1);

  if (tanks.length) {
    const tm = new THREE.InstancedMesh(tankGeo.geometry(), tankMat, tanks.length);
    tanks.forEach(([x, y, z, ang, sc], k) => {
      q.setFromAxisAngle(up, -ang); p.set(x, y, z); s.set(sc, sc, sc);
      tm.setMatrixAt(k, m.compose(p, q, s));
    });
    tm.instanceMatrix.needsUpdate = true;
    tm.castShadow = !quality.low;
    tm.frustumCulled = false;
    tm.layers.set(1);
    group.add(tm);
    meshes.push(tm);
  }
  return meshes;
}

// ---------- illustrated trees (instanced) ----------
function treeGeometry() {
  const B = new Buf(128);
  const lump = (d) => 1 + 0.26 * (Math.sin(d[0] * 7.3 + d[1] * 3.1) * Math.cos(d[2] * 5.7 + d[1] * 2.3));
  // soft, lumpy canopy blob: smooth normals, darker toward its underside
  const blob = (geo, cx, cy, cz, r, squash, lo, hi) => {
    const pos = geo.toNonIndexed ? (geo.index ? geo.toNonIndexed() : geo).attributes.position.array : geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 9) {
      const v = [], nr = [], cl = [];
      for (let k = 0; k < 3; k++) {
        const d = [pos[i + k * 3], pos[i + k * 3 + 1], pos[i + k * 3 + 2]];
        const l = Math.hypot(d[0], d[1], d[2]) || 1;
        d[0] /= l; d[1] /= l; d[2] /= l;
        const rr = r * lump(d);
        v.push([cx + d[0] * rr, cy + d[1] * rr * squash, cz + d[2] * rr]);
        nr.push([d[0], d[1] * 1.15 + 0.12, d[2]]);
        const t = Math.max(0, Math.min(1, d[1] * 0.55 + 0.5));
        const g = lo + (hi - lo) * t;
        cl.push([g, g, g]);
      }
      B.smoothTri(v, nr, cl);
    }
  };
  blob(new THREE.OctahedronGeometry(1, 1), 0, 0.15, 0, 1.0, 0.82, 0.42, 1.0);
  blob(new THREE.IcosahedronGeometry(1, 0), 0.62, -0.12, 0.28, 0.62, 0.8, 0.4, 0.92);
  B.cyl(0, 0, -1.75, -0.35, 0.12, 0.085, 5, [0.16, 0.12, 0.1], { cap: false });
  return B.geometry();
}

function buildTrees(data, group) {
  const a = data.trees;
  const total = a.length / 4;
  const nearCount = data.meta.counts.treesNear ?? total;
  const geo = treeGeometry();
  const mat = cityMaterial({ foliage: true });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  const greens = ['#6f9a55', '#63914f', '#7ba65c', '#5c8a50', '#86a85a'].map(hex), dark = ['#4c7a4a', '#527f4c', '#467249'].map(hex), flame = ['#d9482f', '#e0572f', '#cf4a38'].map(hex);
  const meshes = [];
  const range = (start, end, layer) => {
    const span = end - start;
    const n = Math.floor(span * quality.treeShare);
    if (n <= 0) return;
    const stride = span / n;
    const items = [];
    for (let k = 0; k < n; k++) { const i = start + Math.floor(k * stride); items.push({ i, x: a[i * 4] / 10, z: a[i * 4 + 1] / 10 }); }
    for (const list of chunked(items)) {
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach(({ i, x, z }, k) => {
        const j = i * 4;
        const sc = a[j + 2] / 10, kind = a[j + 3];
        const r = 3.1 * sc * (0.75 + rand(i, 41) * 0.5);
        const hgt = r * (0.95 + rand(i, 42) * 0.45);
        q.setFromAxisAngle(up, rand(i, 43) * 6.28);
        p.set(x, LAND_Y + hgt * 1.7, z);
        s.set(r, hgt, r);
        mesh.setMatrixAt(k, m.compose(p, q, s));
        const col = kind === 2 ? pick(flame, i, 44) : kind === 1 ? pick(dark, i, 45) : pick(greens, i, 46);
        mesh.setColorAt(k, enc(shade(col, 0.84 + rand(i, 47) * 0.3), c));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = !quality.low;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      mesh.layers.set(layer);
      mesh.name = 'trees';
      group.add(mesh);
      meshes.push(mesh);
    }
  };
  range(0, nearCount, 0);
  range(nearCount, total, 1);
  return meshes;
}

// ---------- Citadel wall & Imperial City enclosure ----------
function buildWalls(data, structures) {
  const P = PAL;
  structures.kind = KIND.MASONRY;
  for (const poly of data.wall) {
    const rings = poly.map(unflat);
    structures.prism(rings[0], LAND_Y - 0.5, LAND_Y + WALL_H, P.brick, P.moss, { holes: rings.slice(1), topKind: KIND.GROUND, parapet: 0.9 });
  }
  // the Imperial City's own wall is mapped as lines: brick, with a tiled coping
  const cap = hex('#7a5a45'), body = hex('#8f7c69');
  for (const flat of data.iwalls) {
    const pts = unflat(flat);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.3) continue;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
      structures.box(cx, cz, LAND_Y, LAND_Y + 4.0, len + 1.5, 1.7, ang, body, { top: cap });
      structures.kind = KIND.TILE;
      structures.box(cx, cz, LAND_Y + 4.0, LAND_Y + 4.5, len + 1.9, 2.5, ang, cap, { taper: 0.5 });
      structures.kind = KIND.MASONRY;
    }
  }
  structures.kind = KIND.PLAIN;
}

export function buildCity(data) {
  const group = new THREE.Group();
  const structures = new Buf(160000); // walls, bridges, landmarks: one mesh, no window lights
  buildLand(data, group);
  buildGreen(data, group);
  const { lamps } = buildRoads(data, group, structures);
  const buildings = buildBuildings(data, group);
  const infill = buildInfill(data, group);
  const trees = buildTrees(data, group);
  buildWalls(data, structures);
  return { group, structures, lamps, buildings, infill, trees };
}

export function finishStructures(structures, group) {
  const mesh = new THREE.Mesh(structures.geometry(), cityMaterial({ windows: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'structures';
  group.add(mesh);
  return mesh;
}
