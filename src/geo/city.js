import * as THREE from 'three';
import { Buf, KIND, KIND_FLOOD, hex, shade, mix, unflat, obb, signedArea, ringCentre, pathLength, chunked, rand, pick } from './buf.js';
import { cityMaterial, landMaterial, enc, glowPoints } from './materials.js';
import { initDistricts } from './districts.js';
import { LAND_Y, WALL_H, PAL, quality, ROAD_W, ROAD_MAX, roadWidth } from '../config.js';
import polygonClipping from 'polygon-clipping';
import { gateAxis, rectRing, inRing, CITADEL_PASSAGE } from './gates.js';
import { initTerrain, buildTerrainMesh, rise, baseUnder, drape } from './terrain.js';
import { treePlanter } from './foliage.js';
import { lodAdd, lodUpdate } from './lod.js';
import { pavilion } from '../landmarks/citadel.js';
import { bridgeProfiles, resample, subPath, LAND_RAMP } from './bridges.js';
import { bridgeJoints, handDeckJoints } from './joints.js';
import { citadelBridge } from './citadel-bridge.js';
import { thuyTienBridgeRoads } from '../landmarks/thuytien.js';
import { replaced, placeDeckEnds } from '../landmarks/places/index.js';
import { ownRoads as giaHoiRoads } from '../landmarks/places/giahoi.js';
import { owns as dainoiOwns } from '../landmarks/places/dainoi.js';
import { junctionHoles, holeRects, markingGuard, inPoly, slivers } from './junctions.js';

// Bucket instances into ~1.3 km tiles (chunked() in buf.js) so each tile can be frustum-culled (and skipped by the shadow pass) as one unit.
// Small things (awnings, balconies, roof tanks) are only drawn near the camera: beyond that they are a pixel or
// less. Whole chunks of houses and trees drop out much farther away, where the river mist has taken them anyway.
export function updateDetail(camera, reach = 1500) {
  lodUpdate(camera, reach / 1500);
}

// ---------- land ----------
function buildLand(data, group) {
  const top = landMaterial(PAL.land, true);
  const side = landMaterial(PAL.bank, false, true);
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
  // The model's base: a section of earth under the city, standing on a dark timber plinth, with a soft shadow
  // beneath so the whole thing sits on something rather than floating.
  if (!data.meta?.bounds) return; // a trimmed data file without its extent: no base to size
  const b = data.meta.bounds.map((v) => v / 10);
  const w = b[2] - b[0], d = b[3] - b[1], cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2;
  const earth = new THREE.Mesh(new THREE.BoxGeometry(w, 46, d), landMaterial(PAL.base));
  earth.position.set(cx, -0.6 - 23, cz);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 44, 7, d + 44), new THREE.MeshLambertMaterial({ color: '#4a3528' }));
  lip.position.set(cx, -46.6 - 3.5, cz);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 150, 62, d + 150), new THREE.MeshLambertMaterial({ color: '#2f211a' }));
  plinth.position.set(cx, -53.6 - 31, cz);
  for (const m of [earth, lip, plinth]) { m.receiveShadow = true; m.name = 'base'; group.add(m); }
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g2 = cv.getContext('2d'), grad = g2.createRadialGradient(128, 128, 30, 128, 128, 128);
  grad.addColorStop(0, 'rgba(30,22,30,0.5)'); grad.addColorStop(0.55, 'rgba(30,22,30,0.28)'); grad.addColorStop(1, 'rgba(30,22,30,0)');
  g2.fillStyle = grad; g2.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry((w + 150) * 1.9, (d + 150) * 1.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(cx, -116, cz);
  shadow.renderOrder = -5;
  group.add(shadow);
}

// flat polygon layers painted onto the land (no depth write, drawn in order)
function overlayMaterial(order) {
  const m = cityMaterial({ overlay: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 - order, polygonOffsetUnits: -2 - order * 2 });
  return m;
}

function buildGreen(data, group) {
  const B = new Buf(20000);
  B.kind = KIND.GROUND;
  const y = LAND_Y + 0.03;
  for (const [k, poly] of data.green || []) {
    const col = hex(PAL.green[k] || PAL.green.grass);
    B.kind = k === 'paved' ? KIND.ROAD : KIND.GROUND; // a paved yard is laid as paving, not planted ground
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
// ends: [before, after], points just beyond the path's first and last points on the way that continues it (or null).
// Without them each end is cut square to its own last segment; with them it is cut on the bisector of the joint, as
// an inner vertex is, so two ribbons that meet end to end at an angle share one cut line and leave no wedge between.
// width: one width, or one per point (a tapering strip)
function ribbonPoints(pts, width, ends = null) {
  const n = pts.length;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const end = i === 0 ? ends?.[0] : i === n - 1 ? ends?.[1] : null, cut = end && end.dir; // a hand deck's end line
    const a = i === 0 && end && !cut ? end : pts[Math.max(0, i - 1)], b = i === n - 1 && end && !cut ? end : pts[Math.min(n - 1, i + 1)];
    let d1x = p[0] - a[0], d1z = p[1] - a[1], d2x = b[0] - p[0], d2z = b[1] - p[1];
    let l1 = Math.hypot(d1x, d1z), l2 = Math.hypot(d2x, d2z);
    if (l1 < 1e-6) { d1x = d2x; d1z = d2z; l1 = l2; }
    if (l2 < 1e-6) { d2x = d1x; d2z = d1z; l2 = l1; }
    if (l1 < 1e-6) { L.push(p); R.push(p); continue; }
    d1x /= l1; d1z /= l1; d2x /= l2; d2z /= l2;
    let tx = d1x + d2x, tz = d1z + d2z;
    const tl = Math.hypot(tx, tz);
    if (tl < 1e-6) { tx = d1x; tz = d1z; } else { tx /= tl; tz /= tl; }
    if (cut) { const sg = cut[0] * d1x + cut[1] * d1z < 0 ? -1 : 1; tx = cut[0] * sg; tz = cut[1] * sg; } // cut square to the deck
    const nx = -tz, nz = tx;
    const k = ((Array.isArray(width) ? width[i] : width) / 2) / Math.max(0.55, nx * -d1z + nz * d1x);
    L.push([p[0] + nx * k, p[1] + nz * k]);
    R.push([p[0] - nx * k, p[1] - nz * k]);
  }
  return [L, R];
}
// a path whose end is cut on a hand deck's end line (ends[k].line) starts on that line: its end point is moved along
// its own end segment onto it (a little out or back), so a street mapped a metre or two short of the deck reaches it
function snapEnds(pts, ends) {
  if (!ends || !(ends[0]?.line || ends[1]?.line)) return pts;
  const out = pts.slice();
  for (const k of [0, 1]) {
    const L = ends[k]?.line;
    if (!L || out.length < 2) continue;
    const i = k ? out.length - 1 : 0, P = out[i], Q = out[k ? i - 1 : 1];
    const len = Math.hypot(P[0] - Q[0], P[1] - Q[1]), dx = (P[0] - Q[0]) / len, dz = (P[1] - Q[1]) / len;
    const du = dx * L.u[0] + dz * L.u[1];
    if (!(len > 0.5) || Math.abs(du) < 0.3) continue;
    const lam = -((P[0] - L.p[0]) * L.u[0] + (P[1] - L.p[1]) * L.u[1]) / du;
    if (lam < -(len - 0.3) || lam > 8) continue;
    out[i] = [P[0] + dx * lam, P[1] + dz * lam];
  }
  return out;
}
function ribbon(B, pts0, width, y, col, ends = null) {
  const pts = drape(snapEnds(pts0, ends));
  // per-point widths follow the points drape adds on raised ground
  if (Array.isArray(width) && pts.length !== pts0.length) width = pts.map((p) => widthAt(pts0, width, p));
  const [L, R] = ribbonPoints(pts, width, ends);
  // y is the height above the flat floor; on raised ground each edge point takes the terrain's own height
  const lift = pts === pts0 ? 0 : 0.12;
  const yL = L.map((p) => y + rise(p[0], p[1]) + lift), yR = R.map((p) => y + rise(p[0], p[1]) + lift);
  for (let i = 0; i + 1 < pts.length; i++) B.quad([L[i][0], yL[i], L[i][1]], [R[i][0], yR[i], R[i][1]], [R[i + 1][0], yR[i + 1], R[i + 1][1]], [L[i + 1][0], yL[i + 1], L[i + 1][1]], col, [0, 1, 0]);
}
// yTop: one height for a level deck, [start, end] for a deck that climbs from one bank to the other, or a function
// of the distance along the path (a humped deck: pass points dense enough to follow it). bottom(s, top), if given,
// is the underside instead of top - thick: a vaulted bridge's arches.
// opt.ends: as ribbonPoints. opt.lane { w, col }: a carriageway of that width laid along the middle of the top, the
// rest of the top (col) being the footways, so the deck carries on the street's own pavement and carriageway.
function slab(B, pts, width, yTop, thick, col, sideCol, parapet = 0, bottom = null, opt = {}) {
  const [L, R] = ribbonPoints(pts, width, opt.ends);
  const lane = opt.lane && opt.lane.w < width - 0.2 ? ribbonPoints(pts, opt.lane.w, opt.ends) : null;
  const ys = pts.map(() => yTop), bs = [];
  const len = pathLength(pts) || 1;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (typeof yTop === 'function') ys[i] = yTop(s);
    else if (Array.isArray(yTop)) ys[i] = yTop[0] + ((yTop[1] - yTop[0]) * s) / len;
    bs[i] = bottom ? bottom(s, ys[i]) : ys[i] - thick;
  }
  // opt.tilt(s, p, c): extra height at deck point p across from centreline point c (a landing on a hillside)
  const sAt = [];
  for (let i = 0, a = 0; i < pts.length; i++) { if (i) a += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); sAt.push(a); }
  const ty = (i, q) => ys[i] + (opt.tilt ? opt.tilt(sAt[i], q, pts[i]) : 0);
  for (let i = 0; i + 1 < pts.length; i++) {
    const j = i + 1, bi = bs[i], bj = bs[j];
    const Li = ty(i, L[i]), Ri = ty(i, R[i]), Lj = ty(j, L[j]), Rj = ty(j, R[j]);
    B.quad([L[i][0], Li, L[i][1]], [R[i][0], Ri, R[i][1]], [R[j][0], Rj, R[j][1]], [L[j][0], Lj, L[j][1]], col, [0, 1, 0]);
    if (lane) {
      const [l, r] = lane, e = 0.012;
      B.quad([l[i][0], ty(i, l[i]) + e, l[i][1]], [r[i][0], ty(i, r[i]) + e, r[i][1]], [r[j][0], ty(j, r[j]) + e, r[j][1]], [l[j][0], ty(j, l[j]) + e, l[j][1]], opt.lane.col, [0, 1, 0]);
    }
    B.quad([L[i][0], bi, L[i][1]], [R[i][0], bi, R[i][1]], [R[j][0], bj, R[j][1]], [L[j][0], bj, L[j][1]], sideCol, [0, -1, 0]);
    const nx = L[i][0] - R[i][0], nz = L[i][1] - R[i][1];
    B.quad([L[i][0], bi, L[i][1]], [L[j][0], bj, L[j][1]], [L[j][0], Lj + parapet, L[j][1]], [L[i][0], Li + parapet, L[i][1]], sideCol, [nx, 0, nz]);
    B.quad([R[i][0], bi, R[i][1]], [R[j][0], bj, R[j][1]], [R[j][0], Rj + parapet, R[j][1]], [R[i][0], Ri + parapet, R[i][1]], sideCol, [-nx, 0, -nz]);
    if (parapet) {
      B.quad([L[i][0], Li + parapet, L[i][1]], [L[j][0], Lj + parapet, L[j][1]], [L[j][0], Lj, L[j][1]], [L[i][0], Li, L[i][1]], sideCol, [-nx, 0, -nz]);
      B.quad([R[i][0], Ri + parapet, R[i][1]], [R[j][0], Rj + parapet, R[j][1]], [R[j][0], Rj, R[j][1]], [R[i][0], Ri, R[i][1]], sideCol, [nx, 0, nz]);
    }
  }
}
const ss01 = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
// The lean a level deck needs at its ends to meet a street laid on a cross-slope, or null where neither end needs it.
function landingTilt(pts, len, w) {
  const R = Math.min(LAND_RAMP, len * 0.2), ends = [pts[0], pts[pts.length - 1]];
  const lean = ends.map((p, k) => {
    const q = pts[k ? pts.length - 2 : 1], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, nx = -(q[1] - p[1]) / l, nz = (q[0] - p[0]) / l;
    return Math.abs(rise(p[0] + nx * w / 2, p[1] + nz * w / 2) - rise(p[0] - nx * w / 2, p[1] - nz * w / 2)) > 0.1;
  });
  if (!lean[0] && !lean[1]) return null;
  return (s, p, c) => {
    const f = Math.max(lean[0] ? 1 - ss01(s / R) : 0, lean[1] ? 1 - ss01((len - s) / R) : 0);
    return f ? f * (rise(p[0], p[1]) - rise(c[0], c[1])) : 0;
  };
}
// Cầu Bạch Hổ, the 1908 railway bridge: steel through-trusses with a bowed top chord, one per span.
function railTruss(B, pts, len, deck, pier) {
  const spans = Math.max(2, Math.round(len / 58)), sl = len / spans, N = 8, half = 3.1;
  const steel = hex('#8f979b'), steelD = hex('#737b80');
  const node = (s, side, y) => { const { p, a } = along(pts, Math.min(len - 0.01, Math.max(0.01, s))); return [p[0] - Math.sin(a) * side * half, y, p[1] + Math.cos(a) * side * half]; };
  for (let k = 0; k <= spans; k++) {
    const { p, a } = along(pts, Math.min(len - 0.01, Math.max(0.01, k * sl)));
    if (k > 0 && k < spans) { B.kind = KIND.MASONRY; B.box(p[0], p[1], -3, deck - 1.3, 3.0, 8.4, a, pier, { taper: 0.9 }); B.kind = KIND.PLAIN; }
  }
  for (let k = 0; k < spans; k++) {
    const s0 = k * sl + 0.5, pl = (sl - 1) / N;
    const hOf = (i) => 4.4 + 3.4 * Math.sin((Math.PI * i) / N);
    for (const side of [-1, 1]) {
      const b = [], t = [];
      for (let i = 0; i <= N; i++) { b.push(node(s0 + i * pl, side, deck + 0.25)); t.push(i === 0 || i === N ? null : node(s0 + i * pl, side, deck + hOf(i))); }
      B.beam(b[0], b[N], 0.34, 0.5, steelD);
      B.beam(b[0], t[1], 0.36, 0.4, steel); B.beam(t[N - 1], b[N], 0.36, 0.4, steel);
      for (let i = 1; i < N; i++) {
        B.beam(b[i], t[i], 0.2, 0.26, steel);
        if (i < N - 1) B.beam(t[i], t[i + 1], 0.36, 0.4, steel);
        if (i < N / 2) B.beam(t[i], b[i + 1], 0.18, 0.22, steelD); else if (i > N / 2) B.beam(t[i], b[i - 1], 0.18, 0.22, steelD);
      }
    }
    // portal frames and bracing across the top, clear of the trains
    for (let i = 1; i < N; i++) {
      const l = node(s0 + i * pl, -1, deck + hOf(i)), r = node(s0 + i * pl, 1, deck + hOf(i));
      B.beam(l, r, 0.2, 0.24, steelD);
      if (i < N - 1) B.beam(l, node(s0 + (i + 1) * pl, 1, deck + hOf(i + 1)), 0.12, 0.14, steelD);
    }
  }
}
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

// the width of a tapering strip (pts, ws) at the point p on it: interpolated along the nearest segment
function widthAt(pts, ws, p) {
  let best = Infinity, w = ws[0];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)) : 0;
    const d = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
    if (d < best) { best = d; w = ws[i] + (ws[i + 1] - ws[i]) * t; }
  }
  return w;
}

// Low clipped shrubs along a median strip, about every 2.5 m, left out where the strip is too narrow to hold them.
function medianShrubs(S, medians) {
  const greens = PAL.shrubs.map(hex);
  const k0 = S.kind;
  S.kind = KIND.PLAIN;
  let n = 0;
  for (const m of medians) {
    if (m.w < 1.6) continue;
    const len = pathLength(m.pts);
    // a strip runs on under the road crossing it (build-data MEDIAN_OVER): no shrubs in its last few metres
    for (let s = 4.5 + rand(n, 7) * 1.5; s < len - 4.5; s += 2.2 + rand(n, 3) * 1.2, n++) {
      const { p, a } = along(m.pts, s);
      const w = widthAt(m.pts, m.ws, p);
      if (w < 1.6) continue;
      const r = Math.min(0.75, w / 2 - 0.45);
      const j = (rand(n, 11) - 0.5) * Math.max(0, w - 0.9 - 2 * r);
      const x = p[0] - Math.sin(a) * j, z = p[1] + Math.cos(a) * j;
      const g = LAND_Y + rise(x, z) + 0.05, rr = r * (0.75 + rand(n, 5) * 0.35), h = 0.55 + rand(n, 9) * 0.45;
      S.cyl(x, z, g, g + h * 0.6, rr * 0.8, rr, 7, pick(greens, n), { cap: false, rot: rand(n, 13) });
      S.cyl(x, z, g + h * 0.6, g + h, rr, rr * 0.45, 7, pick(greens, n + 1), { rot: rand(n, 13) });
    }
  }
  S.kind = k0;
}

function buildRoads(data, group, structures) {
  const B = new Buf(160000);
  B.kind = KIND.ROAD;
  const roads = (data.roads || []).map((e) => ({ c: Math.max(0, Math.min(ROAD_MAX, e[0] | 0)), w: roadWidth(e), ...(e[4] ? { ws: e[4].map((v) => v / 10) } : {}), bridge: e[1], flat: e[2], pts: unflat(e[2]), ...(e[5] > 0 ? { lanes: e[5], unmarked: true } : {}) })); // lanes/unmarked: an unmarked road type (a slip road, issue #67): no dashes, no lamps // ws: one width per point where a carriageway tapers into a narrower one // class clamped as bridges.js does, so widths and deck profiles agree
  const profiles = bridgeProfiles(data);
  // a bridge way that runs on past its abutments (a profile with a span, geo/bridges.js) is street there: laid as an
  // ordinary carriageway, flush with the roads it joins, so the deck meets it end to end
  for (const r of [...roads]) {
    const P = r.bridge && profiles.get(r.flat);
    if (!P || !P.span) continue;
    r.cut = [P.span[0] > 0.05, P.span[1] < P.len - 0.05]; // the deck does not reach that end: its street piece does
    for (const [s0, s1] of [[0, P.span[0]], [P.span[1], P.len]]) if (s1 - s0 > 0.05) roads.push({ c: r.c, w: r.w, bridge: 0, flat: null, head: true, pts: subPath(r.pts, s0, s1) });
  }
  bridgeJoints(roads);
  handDeckJoints(roads, placeDeckEnds(data)); // the replicas' decks (cầu Nguyễn Hoàng, cầu Phú Xuân)
  const casing = hex(PAL.casing);
  const cols = PAL.road.map(hex);
  const y = LAND_Y + 0.05;
  // painter's order: pavements, then minor → major carriageways, then lane markings
  // Edges are drawn the way a map draws them: every outline first, then the fills from minor to major, so a side
  // street opens into the road it meets and no line runs across a junction. KIND.LINE is a kerb joint in the
  // realistic look and the pen in the drawn one.
  // a road's width plus add: one number, or one per point where it tapers (r.ws)
  const W = (r, add = 0) => (r.ws ? r.ws.map((w) => w + add) : r.w + add);
  const pavW = (r) => W(r, r.c <= 2 ? 3.6 : 2.4);
  const kerb = shade(casing, 0.8), verge = shade(casing, 0.9);
  B.kind = KIND.LINE;
  for (const r of roads) if (!r.bridge && r.c <= 3) ribbon(B, r.pts, W(r, (r.c <= 2 ? 3.6 : 2.4) + 0.5), y - 0.005, verge, r.ends);
  B.kind = KIND.ROAD;
  for (const r of roads) if (!r.bridge && r.c <= 3) ribbon(B, r.pts, pavW(r), y, casing, r.ends);
  B.kind = KIND.LINE;
  for (const r of roads) if (!r.bridge && r.c <= 4) ribbon(B, r.pts, W(r, r.c <= 2 ? 0.56 : 0.44), y + 0.005, r.c <= 3 ? kerb : shade(cols[4], 0.85), r.ends);
  // junction boxes (geo/junctions.js): the patches that meeting carriageways enclose but none covers are asphalt,
  // over the pavement and kerb lines that showed there as pale squares and triangles out in the road
  const cw = [];
  roads.forEach((r, id) => {
    if (r.bridge || r.c > 4) return;
    const pts = drape(snapEnds(r.pts, r.ends));
    const [L, R] = ribbonPoints(pts, r.ws ? pts.map((p) => widthAt(r.pts, r.ws, p)) : r.w, r.ends);
    cw.push({ id, c: r.c, pts: r.pts, L, R, u: r.unmarked });
  });
  const greens = (data.green || []).filter(([k]) => k !== 'paved').map(([, poly]) => unflat(poly[0]));
  const { holes, cells: holeCells } = junctionHoles(cw, (x, z) => greens.some((g) => inPoly(g, x, z)));
  B.kind = KIND.ROAD;
  for (const h of holes) {
    const lift = rise(h.x, h.z) > 0 ? 0.12 : 0, col = cols[Math.min(h.c, ROAD_MAX)];
    const v = (x, z) => [x, y + 0.0055 + rise(x, z) + lift, z];
    for (const [x0, x1, z0, z1] of holeRects(h)) B.quad(v(x0, z0), v(x0, z1), v(x1, z1), v(x1, z0), col, [0, 1, 0]);
  }
  // pavement too narrow to walk on between two carriageways side by side is paved (geo/junctions.js slivers)
  for (const v of slivers(roads.filter((r) => !r.bridge && r.c <= 4))) ribbon(B, v.pts, v.ws, y + 0.0055, cols[Math.min(v.c, ROAD_MAX)]);
  // the medians of the divided roads (issue #15): a planted strip inside a pale stone kerb, under the carriageways'
  // own edges, with low clipped shrubs along it
  const medians = (data.medians || []).map(([w, flat, ws]) => { const pts = unflat(flat); return { w: w / 10, pts, ws: ws ? ws.map((v) => v / 10) : pts.map(() => w / 10) }; });
  const kerbStone = hex(PAL.medianKerb), turf = hex(PAL.median);
  B.kind = KIND.ROAD;
  for (const m of medians) ribbon(B, m.pts, m.ws, y + 0.006, kerbStone);
  B.kind = KIND.GROUND;
  for (const m of medians) if (m.w > 0.9) ribbon(B, m.pts, m.ws.map((w) => Math.max(0.05, w - 0.6)), y + 0.008, turf);
  medianShrubs(structures, medians);
  B.kind = KIND.ROAD;
  for (let c = ROAD_MAX; c >= 0; c--) for (const r of roads) if (r.c === c && !r.bridge) ribbon(B, r.pts, W(r), y + 0.01, cols[c], r.ends);
  // lane markings: a dashed line along the major roads, stopped short of every carriageway it meets and of the
  // junction holes, so the junction box itself is left plain (geo/junctions.js)
  const paint = hex('#f4eedd');
  const guard = markingGuard(roads.map((r, id) => ({ id, c: r.c, w: r.w, pts: r.pts, bridge: r.bridge })).filter((r) => !r.bridge && r.c <= 2), holeCells);
  const dashes = [];
  roads.forEach((r, id) => {
    if (r.bridge || r.c > 1 || r.unmarked) return;
    const len = pathLength(r.pts);
    // where along the road (every metre) a dash may lie
    const free = [];
    for (let s = 0; s <= len; s++) { const { p, a } = along(r.pts, s); free.push(guard(id, p[0], p[1], a)); }
    const clear = (s0) => { for (let k = 0; k <= 5; k++) if (!free[s0 + k]) return false; return true; };
    const starts = [];
    for (let s0 = 4; s0 + 5 < len; s0 += 13) if (clear(s0)) starts.push(s0); // the steady 13 m rhythm
    // a stretch the rhythm misses (between two carriageways inside a junction, a short way) gets one dash in its middle
    for (let a = 0; a < free.length; ) {
      if (!free[a]) { a++; continue; }
      let b = a;
      while (b + 1 < free.length && free[b + 1]) b++;
      if (b - a >= 7 && !starts.some((s0) => s0 + 5 >= a && s0 <= b)) starts.push(Math.floor((a + b) / 2) - 2);
      a = b + 1;
    }
    for (const s0 of starts) {
      const p0 = along(r.pts, s0).p, p1 = along(r.pts, s0 + 5).p;
      ribbon(B, [p0, p1], 0.32, y + 0.02, paint);
      dashes.push({ id, s0, p0, p1 });
    }
  });
  for (const [main, bridge, flat] of data.rails || []) {
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
  let vongDone = false;
  const ownDeck = thuyTienBridgeRoads(data); // the dragon aquarium's footbridges are modelled in landmarks/thuytien.js
  for (const r of roads) {
    if (!r.bridge || ownDeck.has(r.flat)) continue;
    if (replaced('giahoi') && giaHoiRoads(data).has(r.flat)) continue; // cầu Gia Hội is modelled in landmarks/places/giahoi.js
    if (replaced('golim') && r.c === 5 && r.pts.some((p) => Math.hypot(p[0] + 72.9, p[1] - 281.6) < 1 || Math.hypot(p[0] + 298, p[1] - 500.2) < 1)) continue; // the lim walkway's OSM ways: landmarks/places/golim.js
    // The deck is as wide as the street's pavement (carriageway + footways) and carries its carriageway at the street's
    // own width (narrowed on a divided road's one-way twins), so the street runs onto it edge to edge. Left at the
    // class width, a pair of twin decks overhung their 7 m streets as one broad slab. Citadel bridges keep their
    // masonry proportions (geo/citadel-bridge.js).
    const w = r.bridge === 2 ? ROAD_W[r.c] + (r.c <= 2 ? 3 : 1.5) : r.c <= 3 ? pavW(r) : r.w + 1.5;
    const opt = r.c <= 3 ? { lane: { w: r.w, col: cols[Math.min(r.c, 3)] }, ends: r.ends } : { ends: r.ends };
    const deckTop = r.c <= 3 ? casing : cols[Math.min(r.c, 3)];
    // the deck: level at the banks (or climbing between banks of different height, or at a hill lake's level), and
    // on all but the long river bridges rising to a crown at mid-span (geo/bridges.js)
    const P = profiles.get(r.flat);
    if (!P) continue; // too short to profile (bridges.js skipped it): one bad entry must not abort the city
    if (P.name === 'Cầu Phú Xuân' && replaced('phuxuan')) continue; // modelled in landmarks/places/phuxuan.js
    if (P.name === 'Cầu Cửa Ngăn' && replaced('gate:Cửa Ngăn')) continue; // modelled in landmarks/places/gate-cua-ngan.js
    if (P.name === 'Đông Thành Thủy Quan' && replaced('thuyquan')) continue; // modelled in landmarks/places/thuyquan.js
    const top = P.top, lift = P.lift, mp = r.pts[r.pts.length >> 1];
    const parapet = r.c <= 4 ? 0.9 : 0.5;
    if (P.citadel) { citadelBridge(structures, r.pts, w, P, cols[Math.min(r.c, 3)], r.ends); continue; } // geo/citadel-bridge.js: masonry vaults, no piers
    if (P.span) { // the structure only: the street beyond its abutments was laid with the roads above
      const s0 = P.span[0], R = resample(subPath(r.pts, s0, P.span[1]), Math.min(2, P.len / 16));
      const ends = [s0 < 0.05 ? r.ends?.[0] : null, P.span[1] > P.len - 0.05 ? r.ends?.[1] : null];
      slab(structures, R.pts, w, (s) => P.y(s0 + s), P.thick, deckTop, deckSide, parapet, null, { ...opt, ends });
    } else if (P.rise > 0) {
      const R = resample(r.pts, P.arches ? 0.5 : Math.min(2, P.len / 16), P.breaks);
      const k0 = structures.kind;
      if (P.arches) structures.kind = KIND.MASONRY; // old brick-and-stone vaults read as masonry
      slab(structures, R.pts, w, P.y, P.thick, P.arches ? cols[Math.min(r.c, 3)] : deckTop, P.arches ? hex('#b3a58c') : deckSide, parapet, P.bottom || null, P.arches ? { ends: r.ends } : opt);
      structures.kind = k0;
    } else {
      // A road deck landing on a hillside: the street it joins takes the terrain's height at each edge (ribbon), so
      // over its last LAND_RAMP m the deck leans to the same cross-slope; left level, its low side stood a step
      // below the street (road 8314 in the southern hills, 1.1 m). Decks landing on the flat floor are unchanged.
      const tilt = r.c <= 3 ? landingTilt(r.pts, P.len, w) : null;
      if (tilt) slab(structures, resample(r.pts, 1.5).pts, w, P.y, P.thick, deckTop, deckSide, parapet, null, { ...opt, tilt });
      else slab(structures, r.pts, w, P.y, P.thick, deckTop, deckSide, parapet, null, opt);
    }
    const len = pathLength(r.pts);
    // cầu Dã Viên (2012): six small viewing pavilions stand out over the water along its deck, three a side
    const dv = vongDone || replaced('bachho') ? null : (data.places || []).find((q) => q.id === 'bachho');
    if (dv && len > 250 && r.c <= 1 && Math.hypot(mp[0] - dv.x / 10, mp[1] - dv.z / 10) < 420) {
      vongDone = true; // the two carriageways are mapped separately: once is enough
      for (const f of [0.25, 0.5, 0.75]) for (const side of [-1, 1]) {
        const { p, a } = along(r.pts, len * f), off = w / 2 + 1.6;
        const x = p[0] - Math.sin(a) * side * off, z = p[1] + Math.cos(a) * side * off;
        structures.kind = KIND.PLAIN;
        structures.box(x, z, top - 0.9, top, 4.6, 4.6, a, deckSide, { bottom: true });
        pavilion(structures, x, z, 3.4, 3.4, a, top, { wallH: 2.6, roof: hex('#8f4a36'), wall: hex('#c9b99a'), over: 0.9, rh: 1.5, ridge: hex('#d9c9a0') });
      }
    }
    if (replaced('bachho') && r.c <= 1 && Math.hypot(mp[0] + 1896, mp[1] - 1019) < 40) continue; // places/bachho.js has the piers
    if (len > 42 && r.c <= 3 && !P.arches) {
      const n = Math.max(1, Math.round(len / 30) - 1);
      for (let i = 1; i <= n; i++) {
        const si = (len * i) / (n + 1), { p, a } = along(r.pts, si);
        // each pier ends just inside the deck above it, wherever the curve puts that
        structures.box(p[0], p[1], lift - 3, P.y(si) - P.thick + 0.1, 2.2, w - 2.5, a, pier);
      }
    }
  }
  for (const [main, bridge, flat] of data.rails || []) {
    if (!bridge) continue;
    const pts = unflat(flat);
    if (replaced('bachho') && pts.every((p) => Math.hypot(p[0] + 1830, p[1] - 1135) < 300)) continue; // places/bachho.js
    slab(structures, pts, 5.5, LAND_Y + 0.5, 1.4, hex(PAL.rail), hex('#6d6670'), 1.6);
    const len = pathLength(pts);
    if (len > 150) { railTruss(structures, pts, len, LAND_Y + 0.5, pier); continue; }
    const n = Math.round(len / 34) - 1;
    for (let i = 1; i <= n; i++) { const { p, a } = along(pts, (len * i) / (n + 1)); structures.box(p[0], p[1], -3, LAND_Y - 0.9, 2.4, 6, a, pier); }
  }

  // street lamps along the main streets (drawn only when the mood calls for light)
  const lp = [], lc = [];
  for (const r of roads) {
    if (r.c > 2 || !r.flat || r.unmarked) continue; // a slip road is lit by the roads it joins (a bridge way's street ends are lit as part of the way: life.js posts)
    const len = pathLength(r.pts);
    const step = r.c === 0 ? 30 : 36;
    for (let s = step / 2, k = 0; s < len; s += step, k++) {
      const { p, a } = along(r.pts, s);
      const off = ((r.ws ? widthAt(r.pts, r.ws, p) : r.w) / 2 + 0.5) * (k % 2 ? 1 : -1);
      const lx = p[0] - Math.sin(a) * off, lz = p[1] + Math.cos(a) * off;
      lp.push(lx, LAND_Y + rise(lx, lz) + (r.bridge ? 8 + profiles.get(r.flat).bump(s) : 7.5), lz);
      const warm = 0.85 + rand(k, r.c) * 0.3;
      lc.push(1.0 * warm, 0.74 * warm, 0.42 * warm);
    }
  }
  const lamps = glowPoints(lp, lc, 7);
  lamps.material.uniforms.uBoost.value = 0.6;
  group.add(lamps);
  return { lamps, marks: { roads, cw, holes, holeCells, dashes } };
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

function buildBuildings(data, group, off = null, roofOff = null) {
  const B = new Buf(420000);
  const P = PAL;
  const ridgeGold = hex('#f1d77a'), ridgeGrey = hex('#cfc4a4');
  const draw = (b, i) => {
    const ring = unflat(b[0]);
    let h = b[1] / 10, kind = b[2], flags = b[4] || 0;
    const y0 = LAND_Y + baseUnder(ring) - 0.3;
    const area = Math.abs(signedArea(ring));
    const o = obb(ring);
    // on a slope the floors start at the highest ground under the footprint; what shows below is plain foundation
    let floor = rise(o.c[0], o.c[1]);
    for (const pt of ring) floor = Math.max(floor, rise(pt[0], pt[1]));
    B.base = floor;
    let y1 = LAND_Y + floor + h;
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
    const quocHoc = (flags & 2) !== 0;
    if (quocHoc) {
      // Quốc Học: the long dark-red French-period blocks under tiled roofs
      wall = hex('#a3352c'); roof = pick([hex('#a65a44'), hex('#9a5540'), hex('#b0603f')], i, 2);
      pitched = rectness > 0.6 && o.d < 30; over = 0.8; flare = 0; rh = Math.min(4.2, Math.max(1.6, o.d * 0.22));
    }
    // the period of an ordinary building: Indochine, Nguyễn-period timber, or modern
    const colonial = (flags & 4) !== 0 && !quocHoc, trad = (flags & 8) !== 0;
    const big = (kind === 0 && (area > 240 || h > 12)) || kind === 1 || kind === 5;
    if (colonial) {
      wall = pick(P.indochine, i, 1); roof = pick(P.indochineRoof, i, 2);
      pitched = rectness > 0.7 && o.d < 26; over = 1.0; flare = 0; rh = Math.min(4.4, Math.max(1.6, o.d * 0.24));
    } else if (trad) {
      wall = pick(P.tradWall, i, 1); roof = pick(P.tradRoof, i, 2);
      pitched = rectness > 0.6 && o.d < 22; over = 1.2; flare = 0.3; rh = Math.min(3.4, Math.max(1.4, o.d * 0.27)); ridge = ridgeGrey;
    } else if (kind === 0 || kind === 1 || kind === 5) {
      if (!quocHoc) { wall = rand(i, 61) < 0.75 ? pick(P.pastel, i, 1) : wall; if (big) { pitched = false; } else if (rand(i, 62) < 0.25) roof = pick(P.metalRoof, i, 63); }
    }
    // the roof family seen from orbit (flags bits 4-6) outranks the district's guess; a whitewashed ward paints walls white
    const rc = (flags >> 4) & 7;
    if (!quocHoc && !trad && kind !== 2 && kind !== 3 && kind !== 7) {
      if (rc) {
        roof = pick(P.roofFamily[rc], i, 64);
        if (rc >= 3 && (kind === 0 || kind === 1 || kind === 5)) pitched = false; // a concrete tray, not tile
      }
      if (flags & 128) wall = pick(P.whitewash, i, 65);
    }
    // a building whose height is known (b[5], to the top: measured, or a monument's): the eave is what is left under its roof
    const known = b[5];
    if (known) { h = Math.max(2.6, b[5] / 10 - (pitched ? rh + 0.3 : 0.8)); y1 = LAND_Y + floor + h; }
    // a pitched roof that would run through a model's roof: the model already draws this building (a mapped outline
    // a few metres off the replica, as the pavilion in Diên Thọ's pond), so the mapped one is left out
    if (pitched && roofOff && roofOff(o, over, y1, rh)) return;
    wall = shade(wall, quocHoc ? 0.96 + rand(i, 7) * 0.08 : jitter);
    roof = shade(roof, 0.9 + rand(i, 9) * 0.2);
    if (flags & 1) {
      // mapped over the water: stand it on a deck carried by piles
      B.kind = KIND.PLAIN;
      const cx = o.c[0], cz = o.c[1];
      const deck = ring.map((pt) => [cx + (pt[0] - cx) * 1.12, cz + (pt[1] - cz) * 1.12]);
      const dk = LAND_Y + floor;
      B.prism(deck, dk - 0.7, dk - 0.02, hex('#8a7a66'), hex('#b3a48c'), { topKind: KIND.ROAD });
      const step = Math.max(1, Math.round(ring.length / 10));
      for (let k = 0; k < ring.length; k += step) B.cyl(cx + (ring[k][0] - cx) * 0.94, cz + (ring[k][1] - cz) * 0.94, dk - 6.6, dk - 0.7, 0.42, 0.42, 6, hex('#9c9488'), { cap: false });
      B.cyl(cx, cz, dk - 6.6, dk - 0.7, 0.6, 0.6, 6, hex('#9c9488'), { cap: false });
    }
    B.kind = kind === 8 ? KIND.PLAIN : kind === 2 || trad ? KIND.TIMBER : colonial || quocHoc ? KIND.COLONIAL : kind === 3 || kind === 4 ? KIND.CIVIC : big ? KIND.MODERN : KIND.FACADE;
    if (pitched) {
      B.prism(ring, y0, y1, wall, shade(roof, 0.85), { top: rectness < 0.96, topKind: KIND.TILE });
      B.hip(o.c[0], o.c[1], o.w, o.d, o.a, y1 + 0.02, rh, roof, { flare, over, fascia: flare ? 0.34 : 0.24, fasciaCol: colonial || quocHoc ? hex('#f1e7d2') : flare ? shade(wall, 0.7) : shade(wall, 0.86), ridgeCol: ridge, hips, glazed: kind === 2 });
    } else {
      // tiled lid for small irregular houses; a concrete tray with a parapet for everything else
      const tiled = quocHoc || trad || (rc === 1 || !rc) && colonial || rc === 1 && kind === 0 && !big || (kind === 0 && !big && rand(i, 16) < 0.45) || kind === 8 || kind === 6 || kind === 2 || kind === 3 || kind === 4;
      if (tiled) B.prism(ring, y0, y1, wall, roof, { topKind: KIND.TILE });
      else {
        const lid = kind === 7 || rc >= 2 ? roof : pick(P.concrete, i, 17);
        B.prism(ring, y0, y1, wall, shade(lid, 0.92), { topKind: KIND.FLAT, parapet: kind === 7 ? 1.6 : 0.8 });
        if (area > 70 && kind !== 7 && !b[6]) { // no stair heads or water tanks on a named monument
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
  };
  // neighbouring pitched roofs (a row of temple halls, houses wall to wall) meet in valleys (Buf.joined)
  B.joined(() => data.bld.forEach((b, i) => {
    const ring = unflat(b[0]);
    if (off && off(ring, ringCentre(ring))) return; // a landmark model already stands on this footprint
    if (b[2] === 2 && dainoiOwns(ring)) return; // a gallery or hall places/dainoi.js draws
    const start = B.n;
    B.mark = b[4] & 256 ? KIND_FLOOD : 0; // faces the Hương: floodlit after dark (build-data.mjs); the roof is drawn later
    draw(b, i);
    if (B.mark) for (let v = start; v < B.n; v++) B.knd[v] |= KIND_FLOOD;
  }));
  B.mark = 0;
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
// Returns plant(records, nearCount, i0): plants one batch (hue.json's own, then each tile's) with the shared
// geometry and materials and returns its meshes; i0 is the batch's first index in the whole model (dice seeds).
function infillPlanter(group, off = null) {
  const S = 8;
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
  const tankGeo = new Buf(32); // a lighter tank than the one on mapped buildings: there are thousands
  tankGeo.box(0, 0, 0, 0.7, 1.1, 1.1, 0, SILVER_D, { top: SILVER_D });
  tankGeo.cyl(0, 0, 0.7, 2.1, 0.58, 0.58, 6, SILVER);
  const slabGeo = new Buf(16); // awnings, balcony slabs, railings
  slabGeo.box(0, 0, 0, 1, 1, 1, 0, [0.82, 0.82, 0.82], { top: W, bottom: true });

  const geos = { wall: wallGeo.geometry(), hip: hipGeo.geometry(), gable: gableGeo.geometry(), end: endGeo.geometry(), slab: slabGeo.geometry(), tank: tankGeo.geometry() };
  const AWNINGS = ['#9c3a2c', '#2f5f73', '#b98a3a', '#3f6b4c', '#8a5a3a', '#c9b48a', '#6b3f4a'].map(hex), RAIL = hex('#4a4744');
  const wallMat = cityMaterial({ windows: true, styled: true }), roofMat = cityMaterial(), tankMat = cityMaterial();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  let meshes = [];

  const collect = (a, i0, start, end) => {
    // break up the monotony of one box per plot: about half the houses get a lower rear wing
    const parts = [];
    for (let j = start; j < end; j++) {
      const i = i0 + j;
      const x = a[j * S] / 10, z = a[j * S + 1] / 10;
      const w = a[j * S + 2] / 10, d = a[j * S + 3] / 10, ang = a[j * S + 4] / 1000, h = a[j * S + 5] / 10, main = a[j * S + 6] === 1;
      if (off && off(x, z, w, d, ang)) continue; // a landmark model stands here
      const bits = a[j * S + 7], side = bits & 3, era = (bits >> 2) & 3, rc = (bits >> 4) & 7; // era: 0 modern, 1 Indochine, 2 Nguyễn-period timber; rc: roof family seen from orbit
      const front = side === 2 ? 0 : side === 1 ? -1 : 1; // which way the street lies along the plot's depth axis (0: a house behind the street row)
      let wallCol, roofCol;
      if (era === 1) { wallCol = shade(pick(PAL.indochine, i, 31), 0.93 + rand(i, 32) * 0.12); roofCol = shade(pick(PAL.indochineRoof, i, 34), 0.9 + rand(i, 35) * 0.18); }
      else if (era === 2) { wallCol = shade(pick(PAL.tradWall, i, 31), 0.9 + rand(i, 32) * 0.2); roofCol = shade(pick(PAL.tradRoof, i, 34), 0.86 + rand(i, 35) * 0.26); }
      else {
        wallCol = shade(rand(i, 30) < 0.6 ? pick(PAL.pastel, i, 31) : mix(pick(PAL.walls, i, 31), [0.86, 0.8, 0.68], 0.08), 0.9 + rand(i, 32) * 0.18);
        roofCol = shade(rand(i, 33) < 0.2 ? pick(PAL.metalRoof, i, 34) : pick(PAL.roofs, i, 34), 0.84 + rand(i, 35) * 0.28);
      }
      if (rc && era !== 2) roofCol = shade(pick(PAL.roofFamily[rc], i, 36), 0.92 + rand(i, 35) * 0.14);
      if (bits & 128 && era !== 2) wallCol = shade(pick(PAL.whitewash, i, 31), 0.96 + rand(i, 32) * 0.06);
      const p0 = parts.length;
      if (era === 2) parts.push({ i, x, z, w, d, ang, h, wallCol, roofCol, salt: 0, main, front: 0, era, rc });
      else if (front !== 0 && d > 9.5 && rand(i, 50) < 0.55) {
        const vx = -Math.sin(ang), vz = Math.cos(ang);
        const fd = d * (0.5 + rand(i, 51) * 0.14), rd = d - fd, sgn = front; // the taller part faces the street
        const o1 = sgn * (d / 2 - fd / 2), o2 = -sgn * (d / 2 - rd / 2);
        parts.push({ i, x: x + vx * o1, z: z + vz * o1, w, d: fd, ang, h, wallCol, roofCol, salt: 0, main, front, era, rc });
        const h2 = Math.max(3.3, h - 3.4 * (rand(i, 53) < 0.7 ? 1 : 2));
        const w2 = w * (0.72 + rand(i, 54) * 0.28);
        parts.push({ i, x: x + vx * o2, z: z + vz * o2, w: w2, d: rd, ang, h: h2, wallCol: shade(wallCol, 0.95), roofCol: shade(roofCol, 0.92), salt: 7, main, era, rc });
      } else parts.push({ i, x, z, w, d, ang, h, wallCol, roofCol, salt: 0, main, front, era, rc });
    }
    return parts;
  };

  // Each chunk gets instanced meshes sized to exactly what it holds (no hidden zero-scale instances).
  const inst = (geo, mat, list, layer, shadow = true, detail = false) => {
    if (!list.length) return;
    // walls carry each house's floor level, so windows line up with its own ground on a slope
    const g = geo.clone();
    if (geo === geos.wall) {
      g.setAttribute('aBase', new THREE.InstancedBufferAttribute(Float32Array.from(list, (e) => e[2] || 0), 1));
      g.setAttribute('aStyle', new THREE.InstancedBufferAttribute(Float32Array.from(list, (e) => e[3] || 0), 1)); // added to the wall's face kind
    }
    const mesh = new THREE.InstancedMesh(g, mat, list.length);
    for (let k = 0; k < list.length; k++) { mesh.setMatrixAt(k, list[k][0]); mesh.setColorAt(k, enc(list[k][1], c)); }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = shadow && (!quality.low || geo === geos.wall);
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    mesh.layers.set(layer);
    lodAdd(mesh, detail ? 1500 : 5200);
    group.add(mesh);
    meshes.push(mesh);
  };
  const mk = () => m.compose(p, q, s).clone();
  const place = (parts, layer) => {
    const walls = [], hips = [], gables = [], ends = [], extras = [], tanks = [];
    for (const pt of parts) {
      const { i, x, z, salt } = pt;
      let { w, d, ang, h } = pt;
      const era = pt.era;
      // a pale or grey roof seen from orbit is a concrete tray; red or blue, a pitched roof; unseen, the dice
      const rc = era === 2 ? 0 : pt.rc;
      const flatRoof = rc >= 3 ? rand(i, 21 + salt) < (rc === 3 ? 0.9 : 0.7) : rc ? false : era === 0 && rand(i, 21 + salt) < 0.34;
      const gable = era === 0 && !flatRoof && salt === 0 && rand(i, 60) < (pt.main ? 0.88 : 0.5);
      // facade family: timber hall, Indochine, or (for the larger modern blocks) ribbon glazing; else the plain shophouse
      const style = era === 2 ? KIND.TIMBER - 1 : era === 1 ? KIND.COLONIAL - 1 : h > 9.5 && w > 6.5 ? KIND.MODERN - 1 : 0;
      if (flatRoof) h += 0.7;
      // bed the house into a slope: stand it on the lowest corner, keep the eaves where the centre would put them
      const ca = Math.cos(ang), sa = Math.sin(ang);
      let lo = rise(x, z), hi = lo;
      for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { // every corner: a partial probe let houses with one edge on a slope float
        const r = rise(x + (ca * u * w - sa * v * d) / 2, z + (sa * u * w + ca * v * d) / 2);
        lo = Math.min(lo, r); hi = Math.max(hi, r);
      }
      // floors start at the highest ground under the house; below that the wall is a plain foundation
      const found = hi > lo ? hi - lo + 0.3 : 0;
      const gy = LAND_Y + lo - (found ? 0.3 : 0);
      h += found;
      // walls keep the plot's own axes (width along the street)
      q.setFromAxisAngle(up, -ang);
      p.set(x, gy, z); s.set(w, h, d);
      walls.push([mk(), pt.wallCol, hi, style]);
      if (gable) {
        const rh = Math.min(3.4, Math.max(1.2, d * (0.2 + rand(i, 37) * 0.07)));
        p.set(x, gy + h + 0.12, z); s.set(w + 0.24, rh, d + 1.1);
        gables.push([mk(), pt.roofCol]);
        s.set(w, rh, d + 1.1);
        ends.push([mk(), shade(pt.wallCol, 0.97)]);
      } else if (!flatRoof) {
        let rw = w, rd = d;
        if (rd > rw) { [rw, rd] = [rd, rw]; q.setFromAxisAngle(up, -(ang + Math.PI / 2)); }
        const rh = Math.min(3.2, Math.max(1.0, rd * (era === 2 ? 0.3 : 0.24 + rand(i, 37 + salt) * 0.08)));
        const ov = era === 2 ? 2.4 : era === 1 ? 1.8 : 0.9; // deep eaves on the timber houses and the colonial villas
        p.set(x, gy + h + 0.02, z); s.set(rw + ov, rh, rd + ov);
        hips.push([mk(), pt.roofCol]);
      } else {
        if (rc >= 3) { p.set(x, gy + h + 0.01, z); s.set(w * 0.97, 0.1, d * 0.97); extras.push([mk(), pt.roofCol]); } // the tray's own colour
      }
      if (flatRoof && rand(i, 38 + salt) < 0.6) {
        const sc = 0.85 + rand(i, 41) * 0.3;
        p.set(x + (rand(i, 39) - 0.5) * w * 0.3, gy + h, z + (rand(i, 40) - 0.5) * d * 0.3); s.set(sc, sc, sc);
        tanks.push([mk(), W]);
      }
      // street face: a fabric awning over the shopfront, a balcony with its railing on the floor above
      if (salt === 0 && pt.front && era === 0) {
        const fx = -sa * pt.front, fz = ca * pt.front;
        q.setFromAxisAngle(up, -ang);
        if (rand(i, 70) < (pt.main ? 0.78 : 0.22)) {
          p.set(x + fx * (d / 2 + 0.7), LAND_Y + hi + 2.9, z + fz * (d / 2 + 0.7)); s.set(w * 0.94, 0.13, 1.5);
          extras.push([mk(), pick(AWNINGS, i, 71)]);
        }
        if (pt.h >= 7 && rand(i, 72) < 0.5) {
          const by = LAND_Y + hi + 3.42;
          p.set(x + fx * (d / 2 + 0.5), by, z + fz * (d / 2 + 0.5)); s.set(w * 0.82, 0.14, 1.0);
          extras.push([mk(), shade(pt.wallCol, 0.9)]);
          p.set(x + fx * (d / 2 + 0.96), by + 0.14, z + fz * (d / 2 + 0.96)); s.set(w * 0.82, 0.86, 0.07);
          extras.push([mk(), RAIL]);
        }
      }
    }
    inst(geos.wall, wallMat, walls, layer);
    // roofs barely overhang their walls, so the walls alone cast the houses' shadows (halves the shadow pass)
    inst(geos.hip, roofMat, hips, layer, false);
    inst(geos.gable, roofMat, gables, layer, false);
    inst(geos.end, roofMat, ends, layer, false);
    inst(geos.slab, roofMat, extras, layer, false, true);
    inst(geos.tank, tankMat, tanks, layer, false, true);
  };
  return (a, nearCount, i0 = 0) => {
    a = a || [];
    nearCount ??= a.length / S;
    meshes = [];
    for (const list of chunked(collect(a, i0, 0, nearCount))) place(list, 0);
    for (const list of chunked(collect(a, i0, nearCount, a.length / S))) place(list, 1);
    return meshes;
  };
}

// ---------- Citadel wall & Imperial City enclosure ----------
export function buildWalls(data, structures) {
  const P = PAL;
  structures.kind = KIND.MASONRY;
  // The walls open where a gate stands (the gate models in citadel.js carry the passage through): a slot is cut
  // out of the rampart for each Citadel gate, and the Imperial City's wall stops at the footprints of its gates
  // and of Ngọ Môn.
  const kinhthanh = (data.places || []).find((q) => q.id === 'kinhthanh');
  const cityCentre = kinhthanh ? [kinhthanh.x / 10, kinhthanh.z / 10] : [0, 0];
  const impCentre = data.imperial ? [data.imperial.c[0] / 10, data.imperial.c[1] / 10] : cityCentre;
  const close = (r) => [...r, r[0]];
  const slots = [], clear = [];
  for (const g of data.gates || []) {
    if (g.k === 'citadel') { const t = gateAxis(g, cityCentre); slots.push([close(rectRing(t.cx, t.cz, t.plen + 14, CITADEL_PASSAGE.slot, t.pa))]); }
    else { const t = gateAxis(g, impCentre); clear.push(rectRing(t.cx, t.cz, t.w + 0.3, Math.max(t.d, 4) + 0.3, t.a)); }
  }
  // Ngọ Môn is a U: the wall must also stay out of the court between its wings, so its whole box is cleared
  if (data.special && data.special.ngomon) { const o = obb(unflat(data.special.ngomon.ring)); clear.push(rectRing(o.c[0], o.c[1], o.w + 0.4, o.d + 0.4, o.a)); }
  for (const poly of data.wall || []) {
    if (poly === data.wall[0] && replaced('kinhthanh')) continue; // the main rampart: src/landmarks/places/kinhthanh.js
    if (poly !== data.wall[0] && replaced('mangca')) continue; // the other pieces are Trấn Bình Đài: places/mangca.js
    let parts = [poly.map(unflat)];
    if (slots.length) {
      try { parts = polygonClipping.difference(parts[0].map(close), ...slots).map((pg) => pg.map((r) => r.slice(0, -1))); } catch { /* keep the wall whole */ }
    }
    for (const rings of parts) structures.prism(rings[0], LAND_Y - 0.5, LAND_Y + WALL_H, P.brick, P.moss, { holes: rings.slice(1), topKind: KIND.GROUND, parapet: 0.9 });
  }
  // the Imperial City's own wall is mapped as lines: brick, with a tiled coping
  const cap = hex('#7a5a45'), body = hex('#8f7c69');
  for (const flat of replaced('dainoi') ? [] : data.iwalls || []) { // drawn by places/dainoi.js
    const pts = unflat(flat);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.3) continue;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      // the stretches of this piece that lie outside every gate's footprint, as [from, to] along it
      const n = Math.max(1, Math.ceil(len / 0.4)), runs = [];
      let from = null;
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
        const out = !clear.some((r) => inRing(x, z, r));
        if (out && from === null) from = t;
        if ((!out || k === n) && from !== null) { runs.push([from, out ? t : (k - 1) / n]); from = null; }
      }
      for (const [t0, t1] of runs) {
        const whole = t0 === 0 && t1 === 1, l = len * (t1 - t0);
        if (!whole && l < 0.6) continue;
        const tm = (t0 + t1) / 2, cx = a[0] + (b[0] - a[0]) * tm, cz = a[1] + (b[1] - a[1]) * tm;
        // a whole piece laps its neighbours at the corners; a cut one stops flush at the gate
        structures.box(cx, cz, LAND_Y, LAND_Y + 4.0, l + (whole ? 1.5 : 0), 1.7, ang, body, { top: cap });
        structures.kind = KIND.TILE;
        structures.box(cx, cz, LAND_Y + 4.0, LAND_Y + 4.5, l + (whole ? 1.9 : 0), 2.5, ang, cap, { taper: 0.5 });
        structures.kind = KIND.MASONRY;
      }
    }
  }
  structures.kind = KIND.PLAIN;
}

export function buildCity(data) {
  const group = new THREE.Group();
  const structures = new Buf(160000); // walls, bridges, landmarks: one mesh, no window lights
  structures.roofs = []; // every hip roof the models draw (Buf.hip), for the mapped buildings to keep clear of
  initTerrain(data);
  initDistricts(data);
  buildLand(data, group);
  const hills = buildTerrainMesh();
  if (hills) group.add(hills);
  buildGreen(data, group);
  const { lamps, marks } = buildRoads(data, group, structures);
  const w0 = structures.n;
  buildWalls(data, structures);
  structures.wallRange = [w0, structures.n];
  return { group, structures, lamps, marks, infill: [], trees: [] };
}

// Ground the landmark models stand on: every 1 m cell under a face of theirs that looks up and stands clear of the
// ground (platforms, terraces, stairs, roofs with their eaves). The Citadel's rampart is left out: it is planted.
const SUB = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];
function coverOf(structures) {
  const cells = new Set(), tall = new Set(), P = structures.pos;
  const skip = [structures.wallRange || [0, 0], ...(structures.noCover || [])]; // the rampart, and terraces that are ground
  const key = (ix, iz) => (ix + 32768) * 65536 + (iz + 32768);
  for (let i = 0; i < structures.n; i += 3) {
    if (skip.some(([f, t]) => i >= f && i < t)) continue;
    const k = i * 3;
    const ax = P[k], ay = P[k + 1], az = P[k + 2], bx = P[k + 3], by = P[k + 4], bz = P[k + 5], cx = P[k + 6], cy = P[k + 7], cz = P[k + 8];
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az); // twice the footprint area (signed)
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (ny < 0.35 * Math.hypot(nx, ny, nz) || ny < 0.2) continue;
    let up = Math.min(ay, by, cy) - LAND_Y - rise((ax + bx + cx) / 3, (az + bz + cz) / 3);
    // paved courts (structures.paved: index ranges a model marks) are kept clear of trees and houses however low
    if (structures.paved && up > 0.2 && structures.paved.some(([f, t]) => i >= f && i < t)) up = 2.2;
    if (up < 0.7) continue;
    const x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.floor(Math.max(ax, bx, cx)), z0 = Math.floor(Math.min(az, bz, cz)), z1 = Math.floor(Math.max(az, bz, cz));
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      // five points per cell, so a face narrower than a cell (the top of a wall) is not missed
      for (const [ox, oz] of SUB) {
        const px = ix + ox, pz = iz + oz;
        const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det, l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det;
        if (l1 > -0.02 && l2 > -0.02 && 1 - l1 - l2 > -0.02) { cells.add(key(ix, iz)); if (up >= 2.2) tall.add(key(ix, iz)); break; }
      }
    }
  }
  // houses keep off all of it; trees only off roofs and tall platforms (a tree may stand on a low lawn terrace, as the
  // pines do on đàn Nam Giao)
  return { hit: (x, z) => cells.has(key(Math.floor(x), Math.floor(z))), hitTall: (x, z) => tall.has(key(Math.floor(x), Math.floor(z))) };
}

// A mapped building's hip roof against the models' roofs: true when its eave plan lies over a third inside a model
// roof's eave plan and the two stand at heights where they would cross (the model's slope, not far above or below).
function roofClash(roofs) {
  const G = 40, grid = new Map(), key = (i, j) => i * 100003 + j;
  for (const r of roofs) {
    const R = Math.hypot(r.w, r.d) / 2 + r.over;
    for (let i = Math.floor((r.cx - R) / G); i <= Math.floor((r.cx + R) / G); i++) for (let j = Math.floor((r.cz - R) / G); j <= Math.floor((r.cz + R) / G); j++) {
      const k = key(i, j); (grid.get(k) || grid.set(k, []).get(k)).push(r);
    }
  }
  return (o, over, y1, rh) => {
    const near = new Set(grid.get(key(Math.floor(o.c[0] / G), Math.floor(o.c[1] / G))) || []);
    if (!near.size) return false;
    const ux = Math.cos(o.a), uz = Math.sin(o.a), W = o.w + over * 2, D = o.d + over * 2;
    const nu = Math.max(2, Math.ceil(W)), nv = Math.max(2, Math.ceil(D));
    for (const r of near) {
      if (r.y0 > y1 + rh || r.y0 + r.h < y1) continue;
      const rx = Math.cos(r.ang), rz = Math.sin(r.ang), hw = r.w / 2 + r.over, hd = r.d / 2 + r.over;
      let n = 0;
      for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
        const u = -W / 2 + (W * (a + 0.5)) / nu, v = -D / 2 + (D * (b + 0.5)) / nv;
        const x = o.c[0] + ux * u - uz * v - r.cx, z = o.c[1] + uz * u + ux * v - r.cz;
        if (Math.abs(x * rx + z * rz) < hw && Math.abs(-x * rz + z * rx) < hd) n++;
      }
      if (n > nu * nv / 3) return true;
    }
    return false;
  };
}

// Buildings, houses and trees go in last, once every landmark is modelled, and stay off whatever a model covers: the data only
// keeps the mapped outline clear, but a model reaches past it with its platform, terraces, stairs and eaves.
export function populate(world, data) {
  const cover = coverOf(world.structures);
  const R8 = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]];
  // a tree: its trunk and the reach of its lower branches
  const treeOff = (x, z, r) => { if (cover.hitTall(x, z)) return true; for (const [u, v] of R8) if (cover.hitTall(x + u * r, z + v * r) || cover.hitTall(x + u * r * 0.5, z + v * r * 0.5)) return true; return false; };
  // a house: its plan sampled every metre (the middle of each metre strip, and both edges), so a model's step or
  // terrace edge that reaches a corner of it is caught, not just one that reaches a third of the way in
  const along = (w) => { const out = [-w / 2]; for (let t = -w / 2 + 0.5; t < w / 2; t += 1) out.push(t); out.push(w / 2); return out; };
  const houseOff = (x, z, w, d, ang) => {
    const ux = Math.cos(ang), uz = Math.sin(ang), vs = along(d);
    for (const u of along(w)) for (const v of vs) if (cover.hit(x + ux * u - uz * v, z + uz * u + ux * v)) return true;
    return false;
  };
  world.cover = cover;
  world.houseOff = houseOff; // the check (scripts/check-overlap.mjs) asks this, so it mirrors populate exactly
  // a mapped building: gone when a model covers its middle and most of its outline (the pavilion in front of cung An
  // Định is mapped as a building and modelled with the palace)
  const buildingOff = (ring, c) => {
    if (!cover.hit(c[0], c[1])) return false;
    let n = 0;
    for (const q of ring) if (cover.hit(c[0] + (q[0] - c[0]) * 0.8, c[1] + (q[1] - c[1]) * 0.8)) n++;
    return n >= ring.length * 0.7;
  };
  world.buildings = buildBuildings(data, world.group, buildingOff, roofClash(world.structures.roofs || []));
  // a tree standing on a model's terrace (structures.stand: functions a model adds, (x, z) => metres above the ground
  // of the terrace top there, or 0) is lifted onto it, as the pines on đàn Nam Giao's tiers
  const stand = world.structures.stand || [];
  const lift = stand.length ? (x, z) => { for (const f of stand) { const y = f(x, z); if (y) return y; } return 0; } : null;
  const plantInfill = infillPlanter(world.group, houseOff), plantTrees = treePlanter(data, world.group, treeOff, lift);
  world.infill = plantInfill(data.infill, data.meta?.counts?.infillNear, 0);
  world.trees = plantTrees(data.trees, data.meta?.counts?.treesNear, 0);
  // the trees and houses of a tile (public/data/tiles/, see build-data.mjs), after the first frame: planted by the same
  // rules (off the models' ground, near-water ones into the reflection) and added to the scene; returns the new meshes
  world.addTile = (tile) => {
    const houses = plantInfill(tile.infill, tile.infillNear, tile.i0[1]), trees = plantTrees(tile.trees, tile.treesNear, tile.i0[0]);
    world.infill.push(...houses);
    world.trees.push(...trees);
    return [...houses, ...trees];
  };
}

export function finishStructures(structures, group) {
  const mesh = new THREE.Mesh(structures.geometry(), cityMaterial({ windows: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'structures';
  group.add(mesh);
  return mesh;
}
