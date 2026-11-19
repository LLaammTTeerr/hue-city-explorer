import * as THREE from 'three';
import { Buf, hex, shade, mix, unflat, obb, signedArea } from './buf.js';
import { cityMaterial, enc, glowPoints } from './materials.js';
import { LAND_Y, WALL_H, PAL, quality } from '../config.js';

const rand = (i, salt = 0) => {
  let h = ((i + 1) * 2654435761 + salt * 40503) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
const pick = (arr, i, salt = 0) => arr[Math.floor(rand(i, salt) * arr.length) % arr.length];
const ROAD_W = [15, 12, 9.5, 6.5, 4, 2.2];

// ---------- land ----------
function buildLand(data, group) {
  const top = new THREE.MeshLambertMaterial({ color: PAL.land });
  const side = new THREE.MeshLambertMaterial({ color: PAL.bank });
  for (const poly of data.land) {
    const rings = poly.map(unflat);
    const shape = new THREE.Shape(rings[0].map((p) => new THREE.Vector2(p[0], p[1])));
    for (let i = 1; i < rings.length; i++) shape.holes.push(new THREE.Path(rings[i].map((p) => new THREE.Vector2(p[0], p[1]))));
    const g = new THREE.ExtrudeGeometry(shape, { depth: LAND_Y + 4, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(Math.PI / 2);
    g.translate(0, LAND_Y, 0);
    const m = new THREE.Mesh(g, [top, side]);
    m.receiveShadow = true;
    m.name = 'land';
    group.add(m);
  }
}

// flat polygon layers painted onto the land (no depth write, drawn in order)
function overlayMaterial(order) {
  const m = cityMaterial({ depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 - order, polygonOffsetUnits: -2 - order * 2 });
  return m;
}

function buildGreen(data, group) {
  const B = new Buf(20000);
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
  const B = new Buf(120000);
  const roads = data.roads.map(([c, bridge, flat]) => ({ c, bridge, pts: unflat(flat) }));
  const casing = hex(PAL.casing);
  const cols = PAL.road.map(hex);
  const y = LAND_Y + 0.05;
  // painter's order: casings, then minor → major fills
  for (const r of roads) if (!r.bridge && r.c <= 3) ribbon(B, r.pts, ROAD_W[r.c] + 2.2, y, casing);
  for (let c = 5; c >= 0; c--) for (const r of roads) if (r.c === c && !r.bridge) ribbon(B, r.pts, ROAD_W[c], y + 0.01, cols[c]);
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
function buildBuildings(data, group) {
  const B = new Buf(260000);
  const P = PAL;
  data.bld.forEach((b, i) => {
    const ring = unflat(b[0]);
    const h = b[1] / 10, kind = b[2];
    const y0 = LAND_Y, y1 = y0 + h;
    const area = Math.abs(signedArea(ring));
    const o = obb(ring);
    const rectness = area / Math.max(1, o.w * o.d);
    let wall, roof, pitched = false, flare = 0, over = 0.45, rh = 0;
    const jitter = 0.92 + rand(i, 7) * 0.16;
    switch (kind) {
      case 2: // inside the Imperial City: glazed yellow, a few jade
        wall = P.lacquer; roof = rand(i, 3) < 0.22 ? P.jadeRoof : rand(i, 4) < 0.5 ? P.imperialRoof : P.imperialRoof2;
        pitched = rectness > 0.72 && o.d < 34; flare = 0.5; over = 1.3; rh = Math.min(6, Math.max(2, o.d * 0.3));
        break;
      case 3: wall = P.templeWall; roof = P.templeRoof; pitched = rectness > 0.72 && o.d < 28; flare = 0.4; over = 0.9; rh = Math.min(5, Math.max(1.8, o.d * 0.3)); break;
      case 4: wall = P.church; roof = P.slate; pitched = rectness > 0.75 && o.d < 26; rh = Math.min(8, o.d * 0.45); break;
      case 5: wall = pick(P.modernWall, i, 1); roof = rand(i, 2) < 0.45 ? pick(P.roofs, i, 5) : pick(P.concrete, i, 2); pitched = roof.length && rectness > 0.86 && o.d < 17 && rand(i, 2) < 0.45; rh = Math.min(3.6, o.d * 0.24); break;
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
    if (pitched) {
      B.prism(ring, y0, y1, wall, shade(roof, 0.85), { top: rectness < 0.96 });
      B.hip(o.c[0], o.c[1], o.w, o.d, o.a, y1, rh, roof, { flare, over });
    } else {
      // flat roof with a low parapet feel: slightly raised, darker lid
      B.prism(ring, y0, y1, wall, roof);
      if ((kind === 1 || kind === 5 || kind === 0) && area > 140 && rand(i, 11) < 0.6) {
        const s = 2.4 + rand(i, 12) * 2.2;
        const dx = (rand(i, 13) - 0.5) * o.d * 0.3, dz = (rand(i, 14) - 0.5) * o.d * 0.3;
        B.box(o.c[0] + dx, o.c[1] + dz, y1, y1 + 2.2 + rand(i, 15), s, s * 0.8, o.a, shade(wall, 0.92), { top: shade(roof, 0.9) });
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
function buildInfill(data, group) {
  const a = data.infill;
  const n = a.length / 6;
  const wallGeo = new Buf(16);
  wallGeo.box(0, 0, 0, 1, 1, 1, 0, [1, 1, 1], { top: [0.7, 0.7, 0.7] });
  const ridge = new Buf(16);
  // hand-built unit hip roof with a ridge (apex spread to ±0.24 along x)
  const e = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]];
  const r0 = [-0.24, 1, 0], r1 = [0.24, 1, 0];
  ridge.quad(e[0], e[1], r1, r0, [1, 1, 1], [0, 1, -1]);
  ridge.quad(e[2], e[3], r0, r1, [1, 1, 1], [0, 1, 1]);
  ridge.tri(e[1], e[2], r1, [1, 1, 1], [1, 1, 0]);
  ridge.tri(e[3], e[0], r0, [1, 1, 1], [-1, 1, 0]);

  const walls = new THREE.InstancedMesh(wallGeo.geometry(), cityMaterial({ windows: true }), n);
  const roofs = new THREE.InstancedMesh(ridge.geometry(), cityMaterial(), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = a[i * 6] / 10, z = a[i * 6 + 1] / 10;
    let w = a[i * 6 + 2] / 10, d = a[i * 6 + 3] / 10, ang = a[i * 6 + 4] / 1000;
    const h = a[i * 6 + 5] / 10;
    if (d > w) { [w, d] = [d, w]; ang += Math.PI / 2; }
    q.setFromAxisAngle(up, -ang);
    p.set(x, LAND_Y, z); s.set(w, h, d);
    walls.setMatrixAt(i, m.compose(p, q, s));
    const flatRoof = rand(i, 21) < 0.14;
    const rh = flatRoof ? 0.35 : Math.min(3.2, Math.max(1.1, d * 0.27));
    p.set(x, LAND_Y + h, z); s.set(w + 0.7, rh, d + 0.7);
    roofs.setMatrixAt(i, m.compose(p, q, s));
    // a touch paler than surveyed buildings, so the mapped footprints stay the stronger voice
    walls.setColorAt(i, enc(shade(mix(pick(PAL.walls, i, 31), [0.86, 0.8, 0.68], 0.12), 0.92 + rand(i, 32) * 0.14), c));
    const rc = flatRoof ? pick(PAL.concrete, i, 33) : mix(pick(PAL.roofs, i, 34), [0.72, 0.5, 0.38], 0.2);
    roofs.setColorAt(i, enc(shade(rc, 0.9 + rand(i, 35) * 0.2), c));
  }
  for (const mesh of [walls, roofs]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = !quality.low || mesh === walls;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return [walls, roofs];
}

// ---------- illustrated trees (instanced) ----------
function buildTrees(data, group) {
  const a = data.trees;
  const total = a.length / 4;
  const n = Math.floor(total * quality.treeShare);
  const B = new Buf(64);
  // canopy: squashed icosahedron
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const ip = ico.attributes.position.array;
  for (let i = 0; i < ip.length; i += 9) {
    const v = [0, 1, 2].map((k) => [ip[i + k * 3], ip[i + k * 3 + 1] * 0.85 + 0.2, ip[i + k * 3 + 2]]);
    const cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cy = (v[0][1] + v[1][1] + v[2][1]) / 3 - 0.2, cz = (v[0][2] + v[1][2] + v[2][2]) / 3;
    const l = 0.82 + 0.18 * Math.max(0, cy);
    B.tri(v[0], v[1], v[2], [l, l, l], [cx, cy, cz]);
  }
  B.cyl(0, 0, -1.6, -0.5, 0.13, 0.1, 4, [0.2, 0.15, 0.12], { cap: false });
  const mesh = new THREE.InstancedMesh(B.geometry(), cityMaterial(), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  const greens = ['#6f9a55', '#63914f', '#7ba65c', '#5c8a50'].map(hex), dark = ['#4c7a4a', '#527f4c', '#467249'].map(hex), flame = ['#d9482f', '#e0572f', '#cf3f38'].map(hex);
  const stride = total / n;
  for (let i = 0; i < n; i++) {
    const j = Math.floor(i * stride) * 4;
    const sc = a[j + 2] / 10, kind = a[j + 3];
    const r = 2.9 * sc * (0.8 + rand(i, 41) * 0.4);
    const hgt = r * (1.05 + rand(i, 42) * 0.4);
    q.setFromAxisAngle(up, rand(i, 43) * 6.28);
    p.set(a[j] / 10, LAND_Y + hgt * 1.55, a[j + 1] / 10);
    s.set(r, hgt, r);
    mesh.setMatrixAt(i, m.compose(p, q, s));
    const col = kind === 2 ? pick(flame, i, 44) : kind === 1 ? pick(dark, i, 45) : pick(greens, i, 46);
    mesh.setColorAt(i, enc(shade(col, 0.88 + rand(i, 47) * 0.24), c));
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = !quality.low;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.name = 'trees';
  group.add(mesh);
  return mesh;
}

// ---------- Citadel wall & Imperial City enclosure ----------
function buildWalls(data, structures) {
  const P = PAL;
  for (const poly of data.wall) {
    const rings = poly.map(unflat);
    structures.prism(rings[0], LAND_Y - 0.5, LAND_Y + WALL_H, P.brick, P.moss, { holes: rings.slice(1) });
  }
  // the Imperial City's own wall is mapped as lines
  const top = hex('#6b5a4d'), body = hex('#8a7867');
  for (const flat of data.iwalls) {
    const pts = unflat(flat);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.3) continue;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      structures.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, LAND_Y, LAND_Y + 4.3, len + 1.5, 1.7, ang, body, { top });
    }
  }
}

export function buildCity(data) {
  const group = new THREE.Group();
  const structures = new Buf(120000); // walls, bridges, landmarks: one mesh, no window lights
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
  const mesh = new THREE.Mesh(structures.geometry(), cityMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'structures';
  group.add(mesh);
  return mesh;
}
