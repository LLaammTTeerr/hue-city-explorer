import { KIND, hex, shade, mix, unflat, obb, inRing } from '../geo/buf.js';
import { LAND_Y, roadWidth } from '../config.js';
import { rise, waterY } from '../geo/terrain.js';
import { glowPoints } from '../geo/materials.js';

// Hồ Thủy Tiên — the water park that opened in 2004 and was left to the pines.
//
// Mapped (OSM): the dragon aquarium's round footprint and the three footbridges that meet at it, the grandstand
// of the lakeside amphitheatre and its show pool, the slide pools and the slide tower, the two entrance plazas and
// their sculptures, the entrance, the lake itself.
// Drawn by hand, from what stands there: the aquarium as a saucer-rimmed drum under a dome, the dragon coiled
// round the dome with its head reared to the north over the lake (the top floor opens into its mouth), on the paved
// island the data build leaves round it; the aqua park as pools with blue-tiled rims and a pale apron, the lazy river
// round the big pool with its timber footbridge, brick paths, royal palms over fan palms, and the slide tower (trunk
// columns, terracotta deck, corrugated roof) with its one green tube;
// the amphitheatre's grandstand and show pool as the sandy clearing the 2026 satellite shows where they stood. (The pines are planted by the data build, as trees.)

const dark = hex('#2b2422');
const gy = (x, z) => LAND_Y + rise(x, z);
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lin = (...terms) => terms.reduce((acc, [v, k]) => add(acc, scl(v, k)), [0, 0, 0]);
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const centroid = (r) => {
  let x = 0, z = 0, A = 0;
  for (let i = 0, n = r.length; i < n; i++) { const a = r[i], b = r[(i + 1) % n], k = a[0] * b[1] - b[0] * a[1]; A += k; x += (a[0] + b[0]) * k; z += (a[1] + b[1]) * k; }
  return A ? [x / (3 * A), z / (3 * A)] : r[0];
};
const scaled = (r, c, k) => r.map((p) => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]);
const catmull = (ctrl, stepLen) => {
  const out = [];
  for (let s = 1; s < ctrl.length - 2; s++) {
    const p0 = ctrl[s - 1], p1 = ctrl[s], p2 = ctrl[s + 1], p3 = ctrl[s + 2];
    const n = Math.max(3, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]) / stepLen));
    for (let k = s === 1 ? 0 : 1; k <= n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1, 2].map((q) => 0.5 * (2 * p1[q] + (-p0[q] + p2[q]) * t + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t2 + (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * t3)));
    }
  }
  return out;
};
// a triangle seen from both sides (fins, teeth)
function fin(S, a, b, c, col) {
  const n = crs(sub(b, a), sub(c, a));
  S.tri(a, b, c, col, n);
  S.tri(a, b, c, shade(col, 0.85), scl(n, -1));
}
// tapered block along an arbitrary axis: from o, l0..l1 along f, width w0→w1 along s, height h0→h1 along u
function block(S, o, f, u, s, l0, l1, w0, w1, h0, h1, col, lift = 0) {
  const P = (l, w, h) => lin([o, 1], [f, l], [s, w], [u, h + lift]);
  const A = [P(l0, -w0 / 2, -h0 / 2), P(l0, w0 / 2, -h0 / 2), P(l0, w0 / 2, h0 / 2), P(l0, -w0 / 2, h0 / 2)];
  const B = [P(l1, -w1 / 2, -h1 / 2), P(l1, w1 / 2, -h1 / 2), P(l1, w1 / 2, h1 / 2), P(l1, -w1 / 2, h1 / 2)];
  const hints = [scl(u, -1), s, u, scl(s, -1)];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; S.quad(A[i], A[j], B[j], B[i], col, hints[i]); }
  S.quad(A[0], A[1], A[2], A[3], col, scl(f, -1));
  S.quad(B[0], B[1], B[2], B[3], col, f);
}
// A tube swept along a path. dors[i] is roughly "up" for the cross-section; paint(i, up) → [colour, kind].
function sweep(S, pts, rad, dors, sides, paint, squash = 1) {
  const rings = [];
  for (let i = 0; i < pts.length; i++) {
    const T = nrm(sub(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]));
    const N = nrm(sub(dors[i], scl(T, dot(dors[i], T)))), B = crs(T, N);
    const ring = [];
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2, d = add(scl(N, Math.cos(a)), scl(B, Math.sin(a) * squash));
      ring.push({ v: add(pts[i], scl(d, rad[i])), d, up: Math.cos(a) });
    }
    rings.push({ ring, T, N, B });
  }
  for (let i = 0; i + 1 < rings.length; i++) {
    const A = rings[i].ring, Bn = rings[i + 1].ring;
    for (let k = 0; k < sides; k++) {
      const j = (k + 1) % sides, [col, kind] = paint(i, (A[k].up + A[j].up) / 2);
      S.kind = kind;
      S.quad(A[k].v, A[j].v, Bn[j].v, Bn[k].v, col, add(A[k].d, A[j].d));
    }
  }
  S.kind = KIND.PLAIN;
  return rings;
}
function railing(S, cx, cz, r, y, h, seg, col, gaps) {
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
    if (gaps.some((g) => Math.abs(Math.atan2(Math.sin(am - g), Math.cos(am - g))) < 0.2)) continue;
    const p0 = [cx + Math.cos(a0) * r, y + h, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, y + h, cz + Math.sin(a1) * r];
    S.beam(p0, p1, 0.14, 0.14, col);
    S.beam([p0[0], y, p0[2]], p0, 0.12, 0.12, col);
  }
}
// ring helpers: corner-cut smoothing, signed area, an offset (d > 0 outward) with mitred corners
const chaikin = (r, n = 2) => {
  let o = r;
  for (let k = 0; k < n; k++) {
    const q = [];
    for (let i = 0; i < o.length; i++) { const a = o[i], b = o[(i + 1) % o.length]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    o = q;
  }
  return o;
};
const areaOf = (r) => { let A = 0; for (let i = 0, n = r.length; i < n; i++) { const a = r[i], b = r[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; } return A / 2; };
function offsetRing(r, d) {
  const n = r.length, sg = areaOf(r) > 0 ? 1 : -1;
  const out = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; return [sg * t[1], -sg * t[0]]; };
  return r.map((p, i) => {
    const n1 = out(r[(i - 1 + n) % n], p), n2 = out(p, r[(i + 1) % n]);
    const m = [n1[0] + n2[0], n1[1] + n2[1]], l = Math.hypot(m[0], m[1]) || 1, k = d / Math.max(0.6, (m[0] * n1[0] + m[1] * n1[1]) / l);
    return [p[0] + (m[0] / l) * k, p[1] + (m[1] / l) * k];
  });
}
// distance from a point to a polyline of [x, z] points
function distLine(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L));
    best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return best;
}
// a dense polyline through [x, z] control points (the first and last only steer the ends)
const curve = (ctrl, step = 1) => catmull(ctrl.map((p) => [p[0], 0, p[1]]), step).map((p) => [p[0], p[2]]);
// unit tangent and left normal of a polyline at i
const frameAt = (pts, i) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  return { t, n: [-t[1], t[0]] };
};
// a strip laid over the ground along a polyline (paths), w wide, lift above the ground
function ribbon(S, pts, w, lift, col) {
  S.kind = KIND.ROAD;
  const side = pts.map((p, i) => { const { n } = frameAt(pts, i); return [[p[0] + n[0] * w / 2, p[1] + n[1] * w / 2], [p[0] - n[0] * w / 2, p[1] - n[1] * w / 2]]; });
  const P = (q) => [q[0], gy(q[0], q[1]) + lift, q[1]];
  for (let i = 0; i + 1 < pts.length; i++) S.quad(P(side[i][1]), P(side[i][0]), P(side[i + 1][0]), P(side[i + 1][1]), shade(col, i % 2 ? 0.96 : 1.03), [0, 1, 0]);
  S.kind = KIND.PLAIN;
}

// ------------------------------------------------------------------ palms and garden trees
// The aqua park and the shore by the amphitheatre are planted with royal palms in dense rows: tall grey trunks ringed
// pale where old leaf bases fell, a green crownshaft, a loose crown of arching fronds (2026 satellite: star-shaped
// crowns, Street View: grey ringed trunks over fan-palm undergrowth).
function royalPalm(S, x, z, h, seed) {
  const g = gy(x, z), trunk = hex('#9b988e'), ringC = hex('#bdb8aa'), shaft = hex('#6c8748');
  const leaf = [hex('#4f7c38'), hex('#5d8b40'), hex('#43692f')];
  S.kind = KIND.PLAIN;
  S.cyl(x, z, g - 0.3, g + 0.9, 0.52, 0.36, 6, shade(trunk, 0.9), { cap: false });
  S.cyl(x, z, g + 0.9, g + h - 1.7, 0.36, 0.26, 6, trunk, { cap: false });
  for (let y = g + 2.0; y < g + h - 2.4; y += 1.9) { const r = 0.36 - 0.1 * ((y - g) / h) + 0.035; S.cyl(x, z, y, y + 0.16, r, r, 6, ringC, { cap: false }); }
  S.cyl(x, z, g + h - 1.7, g + h, 0.33, 0.2, 6, shaft);
  const T = [x, g + h - 0.1, z], nf = 9;
  for (let k = 0; k < nf; k++) {
    const a = hash(seed) * 6.28 + (k / nf) * Math.PI * 2 + (hash(seed + k) - 0.5) * 0.4, dr = 0.3 + 0.7 * hash(seed * 3 + k);
    const d = [Math.cos(a), 0, Math.sin(a)], s = [-Math.sin(a), 0, Math.cos(a)];
    const m = lin([T, 1], [d, 2.0], [[0, 1, 0], 0.9 - dr * 0.5]), tip = lin([T, 1], [d, 3.9 - dr * 0.5], [[0, 1, 0], -0.6 - dr * 1.3]);
    const col = leaf[k % 3];
    fin(S, add(T, scl(s, 0.14)), add(m, scl(s, 0.62)), add(m, scl(s, -0.62)), col);
    fin(S, add(m, scl(s, 0.62)), tip, add(m, scl(s, -0.62)), shade(col, 0.92));
  }
  fin(S, add(T, [0.12, 0, 0]), add(T, [-0.12, 0, 0]), add(T, [0, 1.6, 0]), leaf[1]); // the spear leaf
}
// fan palms under the royal palms: a short stem and a ring of stiff fans
function fanPalm(S, x, z, seed) {
  const g = gy(x, z), col = [hex('#55803c'), hex('#4a7236'), hex('#678f45')][Math.floor(hash(seed + 1) * 3)];
  S.kind = KIND.PLAIN;
  // a clump of two or three stems, each with a crown of stiff fans on stalks that rise and spread
  const n = 2 + Math.floor(hash(seed + 7) * 2);
  for (let j = 0; j < n; j++) {
    const ja = hash(seed + j * 3) * 6.28, jr = j ? 0.35 + 0.3 * hash(seed + j) : 0, h = 0.8 + hash(seed + j * 5) * 1.4;
    const bx = x + Math.cos(ja) * jr, bz = z + Math.sin(ja) * jr;
    S.cyl(bx, bz, g - 0.2, g + h, 0.13, 0.1, 5, hex('#6c5e47'), { cap: false });
    const T = [bx, g + h, bz];
    for (let k = 0; k < 6; k++) {
      const a = ja + (k / 6) * Math.PI * 2 + hash(seed * 3 + k), d = [Math.cos(a), 0, Math.sin(a)], s = [-Math.sin(a), 0, Math.cos(a)];
      const r = 0.9 + 0.5 * hash(seed + k + j), stalk = lin([T, 1], [d, r * 0.6], [[0, 1, 0], 0.5 + 0.3 * hash(k + seed)]);
      const tip = lin([stalk, 1], [d, r * 0.75], [[0, 1, 0], 0.15]);
      S.beam(T, stalk, 0.04, 0.04, hex('#6f7a43'));
      const c = shade(col, 0.88 + 0.18 * hash(seed * 5 + k + j));
      fin(S, stalk, add(tip, scl(s, 0.55)), add(tip, scl(s, -0.55)), c);
      fin(S, add(tip, scl(s, 0.55)), add(tip, scl(s, -0.55)), lin([tip, 1], [d, 0.25], [[0, 1, 0], -0.2]), shade(c, 0.9));
    }
  }
}
// a broadleaf tree for the plaza's island and grass ring
function gardenTree(S, x, z, seed) {
  const g = gy(x, z), h = 4.6 + hash(seed) * 1.8, r = 1.8 + hash(seed + 3) * 0.8, col = shade(hex('#4f6f3a'), 0.9 + 0.2 * hash(seed + 7));
  S.kind = KIND.PLAIN;
  S.cyl(x, z, g - 0.2, g + h * 0.5, 0.18, 0.14, 5, hex('#5d4a37'), { cap: false });
  S.cyl(x, z, g + h * 0.38, g + h * 0.7, r * 0.7, r, 7, shade(col, 0.9), { cap: false });
  S.cyl(x, z, g + h * 0.7, g + h, r, r * 0.3, 7, col);
}

// ------------------------------------------------------------------ the aquarium and its dragon
function dragon(S, C, Rd, hd, bridgeAngles) {
  const yb = waterY(C[0], C[1]), yp = yb - 0.08 + 0.46; // the lake's own level; the landing, level with the footbridges
  const conc = hex('#a3a69b'), concD = hex('#7f847a'), pale = hex('#b9c4c2'), glass = hex('#2c444b');
  const r1 = Rd * 0.8, rS = Rd + 1.7, r2 = Rd * 0.7, Rp = Rd + 4.4;
  const yD = yp + 9.0, hD = 3.6; // spring of the dome, its height: three storeys under a low dome, ~12.6 m (VnExpress: the whole dragon 20 m tall)
  S.base = yp - LAND_Y;

  // landing on piles, railed, open where the three bridges arrive
  S.kind = KIND.MASONRY;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; S.cyl(C[0] + Math.cos(a) * (Rp - 1.4), C[1] + Math.sin(a) * (Rp - 1.4), yb - 1.6, yp - 0.4, 0.55, 0.55, 6, concD, { cap: false }); }
  S.cyl(C[0], C[1], yb - 1.6, yp - 0.4, r1 * 0.5, r1 * 0.5, 10, concD, { cap: false });
  S.kind = KIND.ROAD;
  S.cyl(C[0], C[1], yp - 0.5, yp, Rp, Rp, 28, hex('#aaa89b'));
  S.kind = KIND.PLAIN;
  railing(S, C[0], C[1], Rp - 0.25, yp, 1.0, 28, hex('#8d8f86'), bridgeAngles);

  // ground floor: the aquarium, a glazed drum between concrete fins
  S.kind = KIND.MASONRY;
  S.cyl(C[0], C[1], yp, yp + 4.1, r1, r1, 24, conc, { cap: false });
  S.kind = KIND.PLAIN;
  S.cyl(C[0], C[1], yp + 0.9, yp + 3.2, r1 + 0.06, r1 + 0.06, 24, glass, { cap: false });
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; S.box(C[0] + Math.cos(a) * (r1 + 0.2), C[1] + Math.sin(a) * (r1 + 0.2), yp, yp + 4.1, 0.7, 0.55, a, shade(conc, 1.06)); }
  for (const a of bridgeAngles) S.box(C[0] + Math.cos(a) * (r1 + 0.36), C[1] + Math.sin(a) * (r1 + 0.36), yp, yp + 3.0, 0.3, 2.6, a, dark);
  // the saucer: a wide rim that makes the whole thing look landed rather than built
  S.cyl(C[0], C[1], yp + 4.1, yp + 5.0, r1, rS, 28, shade(pale, 0.8), { cap: false });
  S.cyl(C[0], C[1], yp + 5.0, yp + 5.5, rS, rS, 28, pale, { cap: false });
  for (let i = 0; i < 28; i += 2) { const a = ((i + 0.5) / 28) * Math.PI * 2; S.box(C[0] + Math.cos(a) * (rS + 0.02), C[1] + Math.sin(a) * (rS + 0.02), yp + 5.08, yp + 5.42, 0.1, 1.6, a, glass); }
  S.kind = KIND.FLAT;
  S.cyl(C[0], C[1], yp + 5.5, yp + 6.5, rS, r2 + 0.5, 28, shade(pale, 0.92), { cap: false });
  // upper floor with its ring of portholes, then the dome
  S.kind = KIND.MASONRY;
  S.cyl(C[0], C[1], yp + 6.2, yD, r2, r2, 24, shade(conc, 1.05), { cap: false });
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 16; i++) { const a = ((i + 0.5) / 16) * Math.PI * 2; S.box(C[0] + Math.cos(a) * (r2 + 0.04), C[1] + Math.sin(a) * (r2 + 0.04), yp + 7.3, yp + 8.5, 0.12, 1.3, a, glass); }
  const K = 6;
  for (let k = 0; k < K; k++) {
    const a0 = (k / K) * (Math.PI / 2), a1 = ((k + 1) / K) * (Math.PI / 2);
    S.cyl(C[0], C[1], yD + Math.sin(a0) * hD, yD + Math.sin(a1) * hD, r2 * Math.cos(a0), Math.max(0.05, r2 * Math.cos(a1)), 24, mix(pale, hex('#7f8c78'), 0.15 + 0.12 * k), { cap: false });
  }
  const surf = (y) => (y <= yD ? r2 : r2 * Math.sqrt(Math.max(0.03, 1 - ((y - yD) / hD) ** 2)));

  // ---- the dragon: a turn and a bit round the upper floor and dome from a tail hanging over the saucer, then a reared neck
  const R = 2.15;
  // the tail starts between the east and south footbridges and lies over the saucer's rim, its tip no further out
  // than the rim (it used to swing ~8 m out past the landing, over the east footbridge at head height)
  const hAng = Math.atan2(hd[1], hd[0]), th1 = hAng + Math.PI, turns = 1.15, coilN = 200;
  const yStart = yp + 5.6 + R * 0.8, yEnd = yD + hD * 0.85;
  const pts = [], rad = [], dors = [];
  for (let i = 0; i <= coilN; i++) {
    const t = i / coilN, th = th1 - turns * Math.PI * 2 * (1 - t);
    const k = t < 0.1 ? (0.1 - t) / 0.1 : 0;
    const r = R * Math.min(1, 0.07 + t / 0.2) * (0.95 + 0.05 * Math.sin(t * 11));
    const y = Math.max(yp + 5.5 + r, yStart + (yEnd - yStart) * Math.pow(t, 1.12) - k * k * 1.6); // the tail droops onto the rim
    const rr = Math.min(rS + 0.5, surf(y - R * 0.2) + R * 0.8 + k * k * 2.4);
    pts.push([C[0] + Math.cos(th) * rr, y, C[1] + Math.sin(th) * rr]);
    rad.push(r);
    dors.push(nrm([Math.cos(th) * 0.7, 1, Math.sin(th) * 0.7]));
  }
  const yT = yD + hD, E = pts[pts.length - 1];
  const W = (a, y, side = 0) => [C[0] + hd[0] * a - hd[1] * side, y, C[1] + hd[1] * a + hd[0] * side];
  // the neck rears to put the crown of the head ~20 m over the water and the round head ~23 m out from the axis, where the
  // 2026 satellite shows it over its round deck (snout ~31 m), so the dragon spans ~50 m tail to snout (VnExpress 2024: 20 m tall, 50 m long)
  const neck = catmull([pts[pts.length - 8], E, W(-4.4, yT + 1.4, 1.6), W(-5.0, yT + 3.6, 0.8), W(-2.2, yT + 5.6, 0), W(5.6, yT + 6.6, 0), W(15.2, yT + 6.0, 0), W(24.6, yT + 4.8, 0), W(31.0, yT + 3.6, 0)], 0.85).slice(1);
  neck.forEach((p, i) => {
    const t = i / Math.max(1, neck.length - 1);
    pts.push(p); rad.push(R * (1 - 0.2 * t));
    dors.push(nrm([-hd[0] * (0.35 + t * 0.9), 1 - t * 0.4, -hd[1] * (0.35 + t * 0.9)]));
  });
  const teal = hex('#4f7d86'), deep = hex('#35606c'), moss = hex('#5f7350'), belly = hex('#d9cfa6'), gold = hex('#d6ad45'), horn = hex('#cdbd8f');
  const rings = sweep(S, pts, rad, dors, 16, (i, up) => {
    if (up < -0.52) return [shade(belly, i % 3 ? 0.95 : 0.8), KIND.PLAIN]; // belly plates
    const m = Math.min(1, Math.max(0, 0.2 + 0.35 * Math.sin(i * 0.19) + 0.3 * hash(i >> 2)));
    return [shade(mix(i % 6 < 3 ? teal : deep, moss, m * (0.35 + 0.5 * Math.max(0, up))), i % 2 ? 0.88 : 1.02), KIND.TILE]; // scales
  }, 0.92);
  // dorsal fins, gold gone dull, tallest down the neck
  for (let i = 4; i < rings.length - 2; i += 2) {
    const { T, N } = rings[i], r = rad[i], onNeck = i > coilN;
    const h = r * (onNeck ? 0.95 : 0.6) * (i % 4 === 0 ? 1 : 0.7);
    const base = add(pts[i], scl(N, r * 0.93));
    fin(S, add(base, scl(T, -0.8)), add(base, scl(T, 0.6)), add(base, add(scl(N, h), scl(T, -1.3))), shade(gold, 0.8 + 0.2 * hash(i)));
  }
  // tail fan
  { const { T, N, B } = rings[1]; for (const sd of [-1, 0, 1]) fin(S, add(pts[0], scl(N, 0.35)), add(pts[0], scl(N, -0.35)), add(pts[0], add(scl(T, -2.2), add(scl(N, sd * 1.1), scl(B, sd * 0.5)))), gold); }
  // four legs clawing the dome
  for (const t of [0.34, 0.46, 0.74, 0.86]) {
    const i = Math.round(t * coilN), p = pts[i], { T } = rings[i];
    const inward = nrm([C[0] - p[0], 0, C[1] - p[2]]);
    const sgn = t < 0.6 ? 1 : -1;
    const hip = add(p, [0, -rad[i] * 0.55, 0]);
    const knee = add(hip, add(scl(T, sgn * 2.2), [0, -0.6, 0]));
    const yF = knee[1] - 1.5, rF = surf(yF) + 0.3;
    const kd = nrm([knee[0] - C[0], 0, knee[2] - C[1]]);
    const foot = [C[0] + kd[0] * rF, yF, C[1] + kd[2] * rF];
    S.beam(hip, knee, 1.2, 1.2, shade(teal, 0.92));
    S.beam(knee, foot, 0.9, 0.9, shade(deep, 0.95));
    for (const k of [-1, 0, 1]) S.beam(foot, add(foot, add(scl(T, k * 0.9), add([0, -1.0, 0], scl(inward, 0.2)))), 0.3, 0.3, horn);
  }

  // ---- the head: jaws open over the water, the viewing deck inside
  const P = pts[pts.length - 1];
  const f = nrm([hd[0], -0.16, hd[1]]), s = nrm(crs(f, [0, 1, 0])), u = crs(s, f);
  const H = (a, b, c) => lin([P, 1], [f, a], [u, b], [s, c]);
  const rot = (a, b, deg) => { const r = (deg * Math.PI) / 180; return [nrm(add(scl(a, Math.cos(r)), scl(b, Math.sin(r)))), nrm(add(scl(b, Math.cos(r)), scl(a, -Math.sin(r))))]; };
  const headC = shade(teal, 1.06), headD = shade(deep, 0.95), red = hex('#8c2f29');
  S.kind = KIND.TILE;
  block(S, H(-2.8, 0, 0), f, u, s, 0, 5.4, 5.3, 4.7, 4.7, 4.2, headC, 0.5); // cranium
  S.kind = KIND.PLAIN;
  const pv = H(2.2, -0.3, 0);
  const [fU, uU] = rot(f, u, 18), [fL, uL] = rot(f, u, -26);
  block(S, pv, fU, uU, s, 0, 7.8, 4.5, 2.9, 1.9, 1.25, headC, 0.95); // upper jaw
  block(S, lin([pv, 1], [fU, 6.8], [uU, 1.7]), fU, uU, s, 0, 1.6, 2.5, 2.0, 1.2, 0.8, headD, 0.2); // nose
  block(S, pv, fL, uL, s, 0, 6.8, 4.0, 2.5, 1.3, 0.8, headC, -0.65); // lower jaw
  block(S, H(0.4, 0.1, 0), f, u, s, 0, 2.8, 3.6, 3.3, 2.5, 2.1, red); // the mouth, where people stand
  block(S, lin([pv, 1], [fL, 0.6], [uL, 0.12]), fL, uL, s, 0, 5.2, 2.0, 1.0, 0.25, 0.2, shade(red, 1.25)); // tongue
  // the viewing deck in the mouth (the stair inside the neck comes up here; its steps were redone in 2025): a railing
  const rl = hex('#9aa3a0');
  for (const sd of [-1, 1]) {
    S.beam(H(0.5, 0.2, sd * 1.55), H(3.1, 0.0, sd * 1.55), 0.1, 0.1, rl);
    for (const a of [0.5, 1.8, 3.1]) S.beam(H(a, -1.0 + (3.1 - a) * 0.08, sd * 1.55), H(a, 0.2 - a * 0.065, sd * 1.55), 0.08, 0.08, rl);
  }
  S.beam(H(3.1, 0.0, -1.55), H(3.1, 0.0, 1.55), 0.1, 0.1, rl);
  const tooth = hex('#e3dcc8');
  for (const sd of [-1, 1]) for (let k = 0; k < 6; k++) {
    const l = 1.4 + k * 1.08, fang = k === 5 ? 1.9 : 1;
    let w = (4.5 + (2.9 - 4.5) * (l / 7.8)) / 2 - 0.3, hh = 0.95 - (1.9 + (1.25 - 1.9) * (l / 7.8)) / 2;
    let b = lin([pv, 1], [fU, l], [uU, hh], [s, sd * w]);
    fin(S, add(b, scl(fU, -0.36)), add(b, scl(fU, 0.36)), add(b, add(scl(uU, -0.9 * fang), scl(fU, 0.1))), tooth);
    const l2 = 1.4 + k * 0.94;
    w = (4.0 + (2.5 - 4.0) * (l2 / 6.8)) / 2 - 0.3; hh = -0.65 + (1.3 + (0.8 - 1.3) * (l2 / 6.8)) / 2;
    b = lin([pv, 1], [fL, l2], [uL, hh], [s, sd * w]);
    fin(S, add(b, scl(fL, -0.32)), add(b, scl(fL, 0.32)), add(b, add(scl(uL, 0.8 * fang), scl(fL, -0.1))), tooth);
  }
  for (const sd of [-1, 1]) {
    block(S, H(0.9, 1.7, sd * 2.5), f, u, s, -0.7, 0.7, 0.6, 0.5, 1.2, 1.0, hex('#e6d27a')); // eye
    block(S, H(1.1, 1.75, sd * 2.84), f, u, s, -0.25, 0.25, 0.12, 0.12, 0.7, 0.7, dark);
    block(S, H(0.2, 2.65, sd * 2.25), f, u, s, -1.5, 1.8, 1.2, 0.8, 0.8, 0.6, headD); // brow
    // antlers
    const b0 = H(-1.6, 2.7, sd * 1.3), b1 = lin([b0, 1], [f, -1.9], [u, 2.8], [s, sd * 0.9]), b2 = lin([b1, 1], [f, -3.2], [u, 1.3], [s, sd * 0.8]);
    S.beam(b0, b1, 0.8, 0.8, horn); S.beam(b1, b2, 0.5, 0.5, horn);
    S.beam(b1, lin([b1, 1], [f, 0.6], [u, 1.8], [s, sd * 0.3]), 0.4, 0.4, horn);
    S.beam(lin([b1, 0.5], [b2, 0.5]), lin([b1, 0.5], [b2, 0.5], [u, 1.4], [f, -0.4]), 0.32, 0.32, horn);
    // whiskers
    const w0 = lin([pv, 1], [fU, 7.2], [uU, 1.0], [s, sd * 1.2]), w1 = lin([w0, 1], [s, sd * 2.8], [f, -0.8], [u, 0.7]);
    const w2 = lin([w1, 1], [s, sd * 1.7], [f, -2.8], [u, -1.6]), w3 = lin([w2, 1], [s, sd * 0.4], [f, -2.4], [u, -2.5]);
    S.beam(w0, w1, 0.32, 0.32, gold); S.beam(w1, w2, 0.27, 0.27, gold); S.beam(w2, w3, 0.22, 0.22, gold);
  }
  // mane and beard
  for (let k = 0; k < 9; k++) {
    const ph = -1.9 + (k / 8) * 3.8, d = add(scl(u, Math.cos(ph)), scl(s, Math.sin(ph)));
    const b = add(H(-2.6, 0.5, 0), scl(d, 2.3));
    fin(S, add(b, scl(f, -0.8)), add(b, scl(f, 0.8)), add(H(-4.9, 0.5, 0), scl(d, 4.8)), shade(gold, 0.9));
  }
  // the ruff: a ring of gold fins spread round the head, so that from above it reads as the round ~10 m head with a
  // radiating mane the 2026 satellite shows over its round deck (the jaws reach out of it to the north)
  const hc = H(-1.6, 0.6, 0), fwd = Math.atan2(hd[1], hd[0]);
  for (let k = 0; k < 16; k++) {
    const a = fwd + Math.PI / 8 + (k / 16) * (Math.PI * 2 - Math.PI / 4) * (16 / 15);
    if (Math.abs(Math.atan2(Math.sin(a - fwd), Math.cos(a - fwd))) < 0.45) continue;
    const d = [Math.cos(a), 0, Math.sin(a)], tg = [-Math.sin(a), 0, Math.cos(a)], dy = -0.25 + 0.5 * hash(k + 9);
    const b = add(hc, scl(d, 2.4));
    fin(S, add(b, scl(tg, 0.95)), add(b, scl(tg, -0.95)), add(hc, [d[0] * 6.0, dy - 0.6, d[2] * 6.0]), shade(gold, 0.82 + 0.16 * hash(k)));
    fin(S, add(b, [0, 0.5, 0]), add(b, [0, -0.5, 0]), add(hc, [d[0] * 5.4, dy - 0.3, d[2] * 5.4]), shade(gold, 0.75));
  }
  S.kind = KIND.TILE;
  S.cyl(hc[0], hc[2], hc[1] - 2.2, hc[1] + 1.4, 2.7, 2.9, 10, headC, { cap: false });
  S.cyl(hc[0], hc[2], hc[1] + 1.4, hc[1] + 2.6, 2.9, 1.2, 10, shade(headC, 0.95));
  S.kind = KIND.PLAIN;
  for (const sd of [-1, 0, 1]) {
    const b = lin([pv, 1], [fL, 2.5 + Math.abs(sd)], [uL, -1.2], [s, sd * 1.0]);
    fin(S, add(b, scl(fL, -0.8)), add(b, scl(fL, 0.8)), lin([b, 1], [u, -2.5], [f, -1.4]), shade(gold, 0.85));
  }
  S.kind = KIND.PLAIN;
}

// ------------------------------------------------------------------ the footbridges to the dragon
// Mapped: where each bridge runs. Drawn: a narrow concrete walkway on slim piers, tube railings gone pale,
// a few lamp standards — the real ones are long, low and thin, not road decks.
function footbridge(S, from, to) {
  const dx = to[0] - from[0], dz = to[1] - from[1];
  let len = Math.hypot(dx, dz);
  if (len < 4) return;
  const d = [dx / len, dz / len], ac = [-d[1], d[0]], ang = Math.atan2(d[1], d[0]), y = waterY(from[0], from[1]) - 0.08 + 0.5, wd = 3.0;
  // the deck is level: it lands where the bank comes up to it, not past that, where it would run on into the slope
  // (the mapped ends lie up to 4 m inside the steeper banks); either edge of the deck may meet the bank first
  for (let s = 4; s < len; s += 0.5) if ([-wd / 2, 0, wd / 2].some((o) => gy(from[0] + d[0] * s + ac[0] * o, from[1] + d[1] * s + ac[1] * o) >= y - 0.1)) { len = s; break; }
  const P = (s, o, h = 0) => [from[0] + d[0] * s + ac[0] * o, y + h, from[1] + d[1] * s + ac[1] * o];
  const mid = P(len / 2, 0);
  S.base = y - LAND_Y; // the deck stands on the lake's raised ground, so the shader's foot darkening starts there
  S.kind = KIND.ROAD;
  S.box(mid[0], mid[2], y - 0.35, y, len, wd, ang, hex('#b3b0a2'), { bottom: true });
  S.kind = KIND.MASONRY;
  const bays = Math.max(1, Math.round(len / 8));
  for (let i = 0; i <= bays; i++) {
    const q = P((len * i) / bays, 0);
    S.box(q[0], q[2], y - 3.6, y - 0.35, 0.7, wd - 0.5, ang, hex('#8f9186'));
    S.box(q[0], q[2], y - 0.6, y - 0.35, 1.1, wd + 0.3, ang, hex('#a09f93'));
  }
  S.kind = KIND.PLAIN;
  const rail = hex('#9fb0b3'), post = hex('#8b9a9c');
  for (const sd of [-1, 1]) {
    const o = sd * (wd / 2 - 0.1);
    S.beam(P(0, o, 1.05), P(len, o, 1.05), 0.09, 0.09, rail);
    S.beam(P(0, o, 0.55), P(len, o, 0.55), 0.06, 0.06, rail);
    const n = Math.max(2, Math.round(len / 2.2));
    for (let i = 0; i <= n; i++) S.beam(P((len * i) / n, o, 0), P((len * i) / n, o, 1.05), 0.08, 0.08, post);
  }
  for (let i = 1; i < bays; i += 2) {
    const sd = i % 4 === 1 ? 1 : -1, q = P((len * i) / bays, sd * (wd / 2 + 0.05));
    S.beam(q, [q[0], y + 4.2, q[2]], 0.12, 0.12, post);
    S.beam([q[0], y + 4.2, q[2]], [q[0] - ac[0] * sd * 0.9, y + 4.5, q[2] - ac[1] * sd * 0.9], 0.1, 0.1, post);
    S.box(q[0] - ac[0] * sd * 1.0, q[2] - ac[1] * sd * 1.0, y + 4.3, y + 4.55, 0.5, 0.3, ang, hex('#d8d6c8'));
  }
}

// ------------------------------------------------------------------ the amphitheatre
// Tiers on the mapped grandstand outline, rising away from the show pool; blocks of blue and yellow seats.
// ------------------------------------------------------------------ pools, plazas, sculptures, the gate
// The slide pools: free-form basins (the mapped outlines are coarse polygons, smoothed here) with a blue-tiled rim,
// the water low and green; round the big pool a pale paved apron (2026 satellite), narrower where the lazy river
// runs close (apronW(x, z): the apron's width at that point of the rim).
function pool(S, ring0, apronW = null) {
  const ring = chaikin(ring0, 2);
  let g = -Infinity, lo = Infinity;
  for (const p of ring) { g = Math.max(g, gy(p[0], p[1])); lo = Math.min(lo, gy(p[0], p[1])); }
  S.base = 0;
  S.kind = KIND.PLAIN;
  g = Math.min(g, lo + 1.0);
  const inner = offsetRing(ring, -0.6);
  S.prism(ring, lo - 0.4, g + 0.45, hex('#4f93b0'), hex('#8cc3d2'), { holes: [inner.slice().reverse()] }); // tiled coping
  S.prism(inner, lo - 0.4, g + 0.2, hex('#3f7f8c'), hex('#4f8f84')); // the water, gone green
  if (!apronW) return ring;
  const wide = ring.map((p) => apronW(p[0], p[1])), out = ring.map((p, i) => offsetRing(ring, wide[i])[i]);
  const sand = hex('#cdc2a2'), P = (q) => [q[0], gy(q[0], q[1]) + 0.32, q[1]];
  S.kind = KIND.ROAD;
  for (let i = 0; i < ring.length; i++) { const j = (i + 1) % ring.length; S.quad(P(ring[i]), P(out[i]), P(out[j]), P(ring[j]), shade(sand, i % 2 ? 0.97 : 1.02), [0, 1, 0]); }
  S.kind = KIND.PLAIN;
  return out;
}
// The round plaza east of the entrance (OSM 493380761) is three concentric paved rings with grass between them on
// the 2026 satellite, not a solid disc.
const RINGED = new Set(['493380761']);
// The entrance plaza (OSM 493380762), from the 2026 satellite and the 2025 photosphere: a paved centre of weathered
// terracotta with a planted tree island in the middle, a broad grass ring with trees, and a ~6 m ring road round it,
// short timber bollards along the edge of the paving. Laid as a fine polar mesh over the slope, so that it rides
// over the ground (and the mapped footway loops under it) everywhere instead of dipping under in long fan triangles.
const ENTRY_BANDS = [0, 0.08, 0.14, 0.26, 0.38, 0.5, 0.62, 0.71, 0.8, 0.9, 1];
function entrancePlaza(S, ring) {
  const c = centroid(ring), lift = 0.3, sub = 3;
  const B = [];
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; for (let k = 0; k < sub; k++) B.push([a[0] + (b[0] - a[0]) * (k / sub), a[1] + (b[1] - a[1]) * (k / sub)]); }
  const V = (i, f) => { const p = B[i % B.length], x = c[0] + (p[0] - c[0]) * f, z = c[1] + (p[1] - c[1]) * f; return [x, gy(x, z) + lift, z]; };
  const terra = hex('#a58f7e'), grass = hex('#76894f'), road = hex('#7f7d74');
  for (let i = 0; i < B.length; i++) {
    for (let b = 0; b + 1 < ENTRY_BANDS.length; b++) {
      const f0 = ENTRY_BANDS[b], f1 = ENTRY_BANDS[b + 1], m = (f0 + f1) / 2;
      const [col, kind] = m < 0.14 ? [grass, KIND.GROUND] : m < 0.62 ? [shade(terra, (i + b) % 2 ? 0.95 : 1.03), KIND.ROAD] : m < 0.8 ? [shade(grass, i % 2 ? 1 : 0.95), KIND.GROUND] : [shade(road, i % 2 ? 0.98 : 1.02), KIND.ROAD];
      S.kind = kind;
      if (f0 === 0) S.tri(V(i, 0), V(i, f1), V(i + 1, f1), col, [0, 1, 0]);
      else S.quad(V(i, f0), V(i, f1), V(i + 1, f1), V(i + 1, f0), col, [0, 1, 0]);
    }
    const p = B[i], q = B[(i + 1) % B.length];
    S.kind = KIND.ROAD;
    S.quad([p[0], gy(p[0], p[1]) - 0.3, p[1]], [q[0], gy(q[0], q[1]) - 0.3, q[1]], V(i + 1, 1), V(i, 1), hex('#9c998c'), [p[0] - c[0], 0.2, p[1] - c[1]]);
  }
  // the tree island: a low kerbed planter
  const g = gy(c[0], c[1]);
  S.kind = KIND.MASONRY;
  S.prism(scaled(B, c, 0.14), g - 0.3, g + lift + 0.35, hex('#a8a598'), hex('#6c8550'));
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4, r = 1.6; gardenTree(S, c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, 40 + k); }
  // trees in the grass ring, timber bollards along the paving's edge
  for (let i = 0; i < B.length; i += 6) { const v = V(i + 3, 0.71); gardenTree(S, v[0], v[2], 50 + i); }
  const timber = hex('#5f4631');
  for (let i = 0; i < B.length; i += 2) { const v = V(i, 0.6); S.box(v[0], v[2], v[1] - 0.4, v[1] + 0.75, 0.2, 0.2, 0, timber, { top: shade(timber, 0.8) }); }
}
function plaza(S, ring, ringed = false) {
  if (!ringed) { entrancePlaza(S, ring); return; }
  // paving laid over the slope as it falls; the ringed plaza's grey concrete (satellite)
  const c = centroid(ring), lift = 0.24, mid = scaled(ring, c, 0.5), col = hex(ringed ? '#bdb8a8' : '#a28c82'), grass = hex('#7d8d5c');
  const P = (p) => [p[0], gy(p[0], p[1]) + lift, p[1]];
  // ringed: paving from the rim inward in bands (fractions of the radius), grass between
  const bands = [[1, 0.84], [0.7, 0.55], [0.42, 0.28]];
  const band = (k) => (ringed ? bands.findIndex(([a, b]) => k <= a && k > b) >= 0 : true);
  S.kind = KIND.ROAD;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    if (ringed) {
      const cuts = [1, 0.84, 0.7, 0.55, 0.42, 0.28, 0];
      for (let b = 0; b < cuts.length - 1; b++) {
        const o0 = cuts[b], o1 = cuts[b + 1], pave = band((o0 + o1) / 2);
        const A = scaled(ring, c, o0), B = scaled(ring, c, o1);
        S.kind = pave ? KIND.ROAD : KIND.GROUND;
        if (o1 === 0) S.tri(P(c), P(A[i]), P(A[j]), pave ? col : grass, [0, 1, 0]);
        else S.quad(P(B[i]), P(A[i]), P(A[j]), P(B[j]), pave ? (i % 2 ? col : shade(col, 0.95)) : shade(grass, i % 2 ? 1 : 0.95), [0, 1, 0]);
      }
      S.kind = KIND.ROAD;
    } else {
      S.tri(P(c), P(mid[i]), P(mid[j]), col, [0, 1, 0]);
      S.quad(P(mid[i]), P(ring[i]), P(ring[j]), P(mid[j]), i % 2 ? col : shade(col, 0.95), [0, 1, 0]);
    }
    S.quad([ring[i][0], gy(ring[i][0], ring[i][1]) - 0.3, ring[i][1]], [ring[j][0], gy(ring[j][0], ring[j][1]) - 0.3, ring[j][1]], P(ring[j]), P(ring[i]), hex('#9c998c'), [ring[i][0] - c[0], 0.2, ring[i][1] - c[1]]);
  }
  const g = gy(c[0], c[1]);
  if (!ringed) {
    S.kind = KIND.MASONRY;
    S.prism(scaled(ring, c, 0.2), g - 0.6, g + 0.75, hex('#a8a598'), hex('#7f8f68'));
  }
  S.kind = KIND.PLAIN;
}
// bare ground where something was pulled down: sand draped over the slope, a few grey slab scraps left
function cleared(S, ring) {
  const c = centroid(ring), lift = 0.12, sand = hex('#c9b48e');
  const P = (p) => [p[0], gy(p[0], p[1]) + lift, p[1]];
  S.kind = KIND.GROUND;
  for (let i = 0; i < ring.length; i++) { const j = (i + 1) % ring.length; S.tri(P(c), P(ring[i]), P(ring[j]), shade(sand, 0.94 + 0.08 * hash(i)), [0, 1, 0]); }
  S.kind = KIND.ROAD;
  const o = obb(ring);
  for (let k = 0; k < 4; k++) {
    const u = (hash(k * 7 + ring.length) - 0.5) * o.w * 0.6, v = (hash(k * 13 + 3) - 0.5) * o.d * 0.6;
    const x = o.c[0] + Math.cos(o.a) * u - Math.sin(o.a) * v, z = o.c[1] + Math.sin(o.a) * u + Math.cos(o.a) * v;
    if (!inRing(x, z, ring)) continue;
    const g = gy(x, z);
    S.box(x, z, g - 0.2, g + lift + 0.06, 3 + hash(k) * 4, 2 + hash(k + 1) * 3, o.a, hex('#a7a59c'));
  }
  S.kind = KIND.PLAIN;
}
// the plaza's art: low stone pieces on low plinths, none above ~2 m (2025 photosphere), not pillars
function sculpture(S, x, z, seed) {
  const g = gy(x, z), stone = hex('#c9c3b2'), a = hash(seed) * 3;
  S.kind = KIND.MASONRY;
  S.box(x, z, g - 0.2, g + 0.45, 1.9, 1.9, a, hex('#a9a69a'));
  S.kind = KIND.PLAIN;
  const kind = Math.floor(hash(seed + 5) * 3), y0 = g + 0.45;
  if (kind === 0) { S.cyl(x, z, y0, y0 + 0.8, 0.7, 0.85, 8, stone, { cap: false }); S.cyl(x, z, y0 + 0.8, y0 + 1.5, 0.85, 0.3, 8, shade(stone, 0.95)); } // a smooth boulder
  else if (kind === 1) S.beam([x - Math.cos(a) * 0.75, y0 + 0.3, z - Math.sin(a) * 0.75], [x + Math.cos(a) * 0.65, y0 + 1.3, z + Math.sin(a) * 0.65], 1.0, 0.36, stone); // a leaning slab
  else { S.cyl(x - 0.35, z, y0, y0 + 1.1, 0.5, 0.32, 7, stone); S.cyl(x + 0.45, z + 0.2, y0, y0 + 0.7, 0.42, 0.28, 7, shade(stone, 0.93)); } // two worn stones
}

// ------------------------------------------------------------------ the slide tower and the aqua park
// Mapped: the tower building, the two pools, the point OSM calls "water tubes". From the 2026 satellite and Street
// View: the tower is a terracotta-tiled deck under a pitched corrugated roof on timber trusses, carried on concrete
// columns cast as tree trunks, timber railings, a blue-tiled start basin with a round tub on the deck. One dark green
// enclosed tube leaves the deck, winds down beside the tower and runs west under the trees to a small landing house
// at the big pool's east edge. (The long open flumes drawn here before are not there.)
function slides(S, tower, bigRing) {
  const o = obb(tower), c = o.c;
  let g = Infinity;
  for (const p of tower) g = Math.min(g, gy(p[0], p[1]));
  const ux = Math.cos(o.a), uz = Math.sin(o.a);
  const L = (u, v) => [c[0] + ux * u - uz * v, c[1] + uz * u + ux * v];
  const hw = Math.max(o.w, 7) / 2, hd = Math.max(o.d, 5.5) / 2, yD = g + 9.6;
  const bark = hex('#7a6651'), timber = hex('#6e4e33'), terra = hex('#b0603f'), conc = hex('#9d978a'), tile = hex('#3f8fa0');
  S.base = g - LAND_Y;
  // which side faces the big pool: the tube leaves there
  const cb = centroid(bigRing), toP = [cb[0] - c[0], cb[1] - c[1]];
  const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const face = sides.map(([su, sv]) => [su, sv, (ux * su - uz * sv) * toP[0] + (uz * su + ux * sv) * toP[1]]).sort((a, b) => b[2] - a[2])[0];
  const fu = face[0], fv = face[1];
  // the changing rooms under the deck
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], g - 0.4, g + 3.0, hw * 1.3, hd * 1.2, o.a, hex('#c3bba6'), { top: hex('#8a8574'), topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  // columns cast as tree trunks, flaring at the root, two branch stubs reaching up under the deck
  for (const u of [-hw + 0.6, 0, hw - 0.6]) for (const v of [-hd + 0.6, hd - 0.6]) {
    const [x, z] = L(u, v);
    S.cyl(x, z, g - 0.3, g + 0.7, 0.85, 0.5, 8, shade(bark, 0.9), { cap: false });
    S.cyl(x, z, g + 0.7, yD - 0.35, 0.5, 0.38, 8, bark, { cap: false });
    for (const k of [-1, 1]) { const [bx, bz] = L(u + k * 1.1, v + (v > 0 ? -0.5 : 0.5)); S.beam([x, yD - 2.6, z], [bx, yD - 0.3, bz], 0.32, 0.32, shade(bark, 0.95)); }
  }
  // the deck: concrete slab, terracotta tiles on top
  S.box(c[0], c[1], yD - 0.4, yD, hw * 2 + 1.2, hd * 2 + 1.2, o.a, conc, { top: terra, topKind: KIND.ROAD, bottom: true });
  // timber railing round the deck, open where the tube leaves
  const eu = hw + 0.5, ev = hd + 0.5, corners = [[-eu, -ev], [eu, -ev], [eu, ev], [-eu, ev]];
  for (let k = 0; k < 4; k++) {
    const a = corners[k], b = corners[(k + 1) % 4], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const isFace = (fu && Math.sign(mid[0]) === fu && Math.abs(mid[0]) > eu - 0.1) || (fv && Math.sign(mid[1]) === fv && Math.abs(mid[1]) > ev - 0.1);
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.4));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      if (isFace && t0 > 0.3 && t1 < 0.71) continue;
      const p0 = L(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), p1 = L(a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1);
      S.beam([p0[0], yD + 1.05, p0[1]], [p1[0], yD + 1.05, p1[1]], 0.12, 0.1, timber);
      S.beam([p0[0], yD + 0.5, p0[1]], [p1[0], yD + 0.5, p1[1]], 0.08, 0.08, timber);
      S.beam([p0[0], yD, p0[1]], [p0[0], yD + 1.1, p0[1]], 0.12, 0.12, shade(timber, 0.9));
    }
  }
  // the roof: corrugated sheet on a hip, on timber posts and trusses
  const yE = yD + 2.7, yR = yD + 4.3, ru = hw + 1.0, rv = hd + 1.0, along = ru >= rv;
  const rl = along ? ru - rv : 0, rw = along ? 0 : rv - ru; // half-length of the ridge along u (or v)
  for (const [u, v] of [[-hw - 0.3, -hd - 0.3], [hw + 0.3, -hd - 0.3], [hw + 0.3, hd + 0.3], [-hw - 0.3, hd + 0.3], [0, -hd - 0.3], [0, hd + 0.3]]) { const [x, z] = L(u, v); S.beam([x, yD, z], [x, yE, z], 0.2, 0.2, timber); }
  for (const u of [-hw - 0.3, 0, hw + 0.3]) {
    const a = L(u, -rv + 0.2), b = L(u, rv - 0.2), r = L(Math.max(-rl, Math.min(rl, u)), 0);
    S.beam([a[0], yE - 0.1, a[1]], [b[0], yE - 0.1, b[1]], 0.18, 0.22, timber); // tie beam
    S.beam([a[0], yE - 0.1, a[1]], [r[0], yR - 0.15, r[1]], 0.14, 0.18, timber); S.beam([b[0], yE - 0.1, b[1]], [r[0], yR - 0.15, r[1]], 0.14, 0.18, timber); // rafters
    S.beam([r[0], yE - 0.1, r[1]], [r[0], yR - 0.15, r[1]], 0.14, 0.14, timber); // king post
  }
  const R3 = (u, v, y) => { const [x, z] = L(u, v); return [x, y, z]; };
  const sheet = hex('#8d9590'), rust = hex('#8a6a52');
  const slope = (a, b, cc, d, n, hint) => { // quad a-b along the eave, c-d along the ridge, in n corrugation strips
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, P = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
      const col = shade(mix(sheet, rust, 0.15 + 0.25 * hash(i * 3 + n)), i % 2 ? 0.9 : 1.04);
      S.quad(P(a, b, t0), P(a, b, t1), P(d, cc, t1), P(d, cc, t0), col, hint);
      S.quad(P(a, b, t0), P(a, b, t1), P(d, cc, t1), P(d, cc, t0), shade(col, 0.6), scl(hint, -1));
    }
  };
  S.kind = KIND.PLAIN;
  const E = [R3(-ru, -rv, yE), R3(ru, -rv, yE), R3(ru, rv, yE), R3(-ru, rv, yE)];
  const Rr = [R3(-rl, -rw, yR), R3(rl, -rw, yR), R3(rl, rw, yR), R3(-rl, rw, yR)]; // ridge ends (two coincide when the ridge is a line)
  const up = (dir) => { const [x, z] = [ux * dir[0] - uz * dir[1], uz * dir[0] + ux * dir[1]]; return [x, 1.4, z]; };
  slope(E[0], E[1], Rr[1], Rr[0], 14, up([0, -1]));
  slope(E[2], E[3], Rr[3], Rr[2], 14, up([0, 1]));
  slope(E[1], E[2], Rr[2], Rr[1], 8, up([1, 0]));
  slope(E[3], E[0], Rr[0], Rr[3], 8, up([-1, 0]));
  // the start basin, blue and teal tiles, and its round tub, on the deck by the tube's mouth
  const [bx, bz] = L(fu * (hw - 1.6), fv * (hd - 1.6));
  S.box(bx, bz, yD, yD + 0.7, 3.0, 2.4, o.a, tile, { top: hex('#5fb3c2') });
  const [tx, tz] = L(fu * (hw - 1.6) - (fv ? 2.2 : 0), fv * (hd - 1.6) - (fu ? 2.0 : 0));
  S.cyl(tx, tz, yD, yD + 0.9, 1.2, 1.2, 12, hex('#4a9fb4'), { cap: false });
  S.cyl(tx, tz, yD + 0.7, yD + 0.72, 1.12, 1.12, 12, hex('#6cc0cc'));
  // a switchback stair up the side away from the pool
  const sDir = fu ? [0, 1] : [1, 0], sOut = fu ? [-fu, 0] : [0, -fv];
  const LL = (a, o) => L(sDir[0] * a + sOut[0] * o, sDir[1] * a + sOut[1] * o);
  const wd = [ux * sDir[0] - uz * sDir[1], uz * sDir[0] + ux * sDir[1]], sAng = Math.atan2(wd[1], wd[0]);
  const offBase = (fu ? eu : ev) + 0.8, run = (fu ? hd : hw) - 0.3;
  for (let f = 0; f < 2; f++) {
    const off = offBase + f * 1.4, y0 = g + (f * (yD - g)) / 2, y1 = g + ((f + 1) * (yD - g)) / 2, a0 = f ? run : -run, a1 = -a0;
    for (let k = 0; k < 14; k++) { const t = (k + 0.5) / 14, [x, z] = LL(a0 + (a1 - a0) * t, off), y = y0 + (y1 - y0) * t; S.box(x, z, y - 0.18, y, 0.45, 1.2, sAng, hex('#8f8a7e')); }
    for (const o2 of [off - 0.65, off + 0.65]) { const p0 = LL(a0, o2), p1 = LL(a1, o2); S.beam([p0[0], y0 + 1.0, p0[1]], [p1[0], y1 + 1.0, p1[1]], 0.08, 0.08, timber); }
    const [px, pz] = LL(a1, off);
    S.cyl(px, pz, g - 0.2, y1, 0.2, 0.2, 6, conc, { cap: false });
  }
  // the tube: from the deck's open side, down a helix beside the tower, then west under the trees to the pool
  let ex = -Infinity, eRing = null;
  for (const p of bigRing) { const k = (p[0] - cb[0]) * (c[0] - cb[0]) + (p[1] - cb[1]) * (c[1] - cb[1]); if (k > ex) { ex = k; eRing = p; } }
  const outD = [ux * fu - uz * fv, uz * fu + ux * fv], rH = 3.4;
  const m0 = L(fu * eu, fv * ev), Hc = [m0[0] + outD[0] * rH, m0[1] + outD[1] * rH];
  const dl = Math.hypot(eRing[0] - c[0], eRing[1] - c[1]) || 1, toPool = [(eRing[0] - c[0]) / dl, (eRing[1] - c[1]) / dl];
  const T = [eRing[0] + toPool[0] * -2.2, eRing[1] + toPool[1] * -2.2]; // the landing house, on the apron
  const th0 = Math.atan2(m0[1] - Hc[1], m0[0] - Hc[0]), dir = 1;
  const thE0 = Math.atan2(toPool[1], toPool[0]) - dir * Math.PI / 2;
  let sweepA = (((thE0 - th0) * dir) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) + Math.PI * 2;
  const tube = [], yH = g + 3.6, nH = Math.round(sweepA / 0.18);
  for (let k = 0; k <= nH; k++) { const t = k / nH, th = th0 + dir * sweepA * t; tube.push([Hc[0] + Math.cos(th) * rH, yD + 0.35 + (yH - yD - 0.35) * t, Hc[1] + Math.sin(th) * rH]); }
  const he = tube[tube.length - 1], dist = Math.hypot(T[0] - he[0], T[1] - he[2]), yT = gy(T[0], T[1]) + 1.1;
  for (let s = 1; s <= dist; s += 1) { const t = s / dist; tube.push([he[0] + (T[0] - he[0]) * t, yH + (yT - yH) * t, he[2] + (T[1] - he[2]) * t]); }
  sweep(S, tube, tube.map(() => 0.62), tube.map(() => [0, 1, 0]), 8, (i) => [i % 6 < 3 ? hex('#3f6a4f') : hex('#355d44'), KIND.PLAIN]);
  for (let k = 4; k < tube.length; k += 5) { const a = tube[k]; if (a[1] - gy(a[0], a[2]) > 1.4) S.cyl(a[0], a[2], gy(a[0], a[2]) - 0.3, a[1] - 0.55, 0.16, 0.16, 5, hex('#8b8d83'), { cap: false }); }
  S.cyl(Hc[0], Hc[1], gy(Hc[0], Hc[1]) - 0.3, yD + 0.2, 0.3, 0.3, 6, conc, { cap: false }); // the helix's mast
  // the landing house at the pool's edge
  const gT = gy(T[0], T[1]), aT = Math.atan2(toPool[1], toPool[0]);
  S.kind = KIND.MASONRY;
  S.box(T[0], T[1], gT - 0.3, gT + 2.4, 3.0, 2.6, aT, hex('#c7c0ab'), { top: hex('#5f7d64'), topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  S.box(T[0] - toPool[0] * 1.52, T[1] - toPool[1] * 1.52, gT + 0.3, gT + 1.9, 0.08, 1.4, aT, dark);
  S.base = 0;
}

// ------------------------------------------------------------------ the lazy river and its palm garden
// The lazy river: a curved channel with pale walls and blue tiles wrapping the west and north sides of the big pool
// (2026 satellite, z20), crossed by a railed timber footbridge, terracotta brick paths beside it, royal palms in
// rows over fan palms. Centre line in scene metres, the ends only steering.
const RIVER = [[-1404.4, 6640], [-1404.2, 6634], [-1403.4, 6615], [-1402.5, 6602.5], [-1399.4, 6595.6], [-1391.5, 6590.3], [-1381, 6587.3], [-1372.5, 6589], [-1367, 6592]];
const RIVER_HW = 1.6, RIVER_WALL = 0.3;
function lazyRiver(S, pts) {
  const blue = hex('#4b97b5'), pale = hex('#d6d0bf'), water = hex('#4f9fa4');
  const fr = pts.map((p, i) => ({ p, n: frameAt(pts, i).n, g: gy(p[0], p[1]) }));
  const at = (i, o, h) => { const { p, n, g } = fr[i]; return [p[0] + n[0] * o, g + h, p[1] + n[1] * o]; };
  const wo = RIVER_HW + RIVER_WALL;
  for (let i = 0; i + 1 < pts.length; i++) {
    const j = i + 1;
    S.kind = KIND.PLAIN;
    S.quad(at(i, -RIVER_HW, 0.35), at(i, RIVER_HW, 0.35), at(j, RIVER_HW, 0.35), at(j, -RIVER_HW, 0.35), shade(water, i % 2 ? 0.97 : 1.02), [0, 1, 0]);
    for (const s of [-1, 1]) {
      const hint = [fr[i].n[0] * -s, 0, fr[i].n[1] * -s];
      S.quad(at(i, s * RIVER_HW, 0.3), at(j, s * RIVER_HW, 0.3), at(j, s * RIVER_HW, 0.78), at(i, s * RIVER_HW, 0.78), blue, hint);
      S.kind = KIND.MASONRY;
      S.quad(at(i, s * RIVER_HW, 0.78), at(j, s * RIVER_HW, 0.78), at(j, s * wo, 0.78), at(i, s * wo, 0.78), pale, [0, 1, 0]);
      S.quad(at(i, s * wo, -0.25), at(j, s * wo, -0.25), at(j, s * wo, 0.78), at(i, s * wo, 0.78), shade(pale, 0.88), scl(hint, -1));
    }
  }
  for (const i of [0, pts.length - 1]) { S.kind = KIND.MASONRY; const t = frameAt(pts, i).t, k = i ? 1 : -1; S.quad(at(i, -wo, -0.25), at(i, wo, -0.25), at(i, wo, 0.78), at(i, -wo, 0.78), pale, [t[0] * k, 0, t[1] * k]); }
  S.kind = KIND.PLAIN;
}
// the railed timber footbridge over the channel, a low arch
function riverBridge(S, pts, i) {
  const { p, n } = { p: pts[i], n: frameAt(pts, i).n }, t = frameAt(pts, i).t, span = 3.8, timber = hex('#7b5a3a'), g = gy(p[0], p[1]);
  const Q = (s, o, h) => { const x = p[0] + n[0] * s + t[0] * o, z = p[1] + n[1] * s + t[1] * o; return [x, Math.max(gy(x, z), g) + 0.38 + 0.75 * Math.cos((s / span) * Math.PI / 2) + h, z]; };
  S.kind = KIND.PLAIN;
  const N = 8;
  for (let k = 0; k < N; k++) {
    const s0 = -span + (2 * span * k) / N, s1 = -span + (2 * span * (k + 1)) / N;
    S.beam(Q(s0, 0, 0), Q(s1, 0, 0), 1.9, 0.14, k % 2 ? timber : shade(timber, 1.06));
    for (const o of [-0.9, 0.9]) { S.beam(Q(s0, o, 0.95), Q(s1, o, 0.95), 0.1, 0.1, shade(timber, 0.85)); S.beam(Q(s0, o, 0), Q(s0, o, 0.95), 0.1, 0.1, shade(timber, 0.8)); }
  }
  for (const o of [-0.9, 0.9]) S.beam(Q(span, o, 0), Q(span, o, 0.95), 0.1, 0.1, shade(timber, 0.8));
}

const aquariumOf = (items) => items.find((it) => it.k === 'b' && /dragon|aquarium/i.test(it.n || ''));
const aquariumDisc = (aq) => { const C = centroid(aq.pts); return { C, Rd: Math.max(9, aq.pts.reduce((s, p) => s + Math.hypot(p[0] - C[0], p[1] - C[1]), 0) / aq.pts.length) }; };
// The mapped bridge roads that end at the dragon aquarium, as { f: the road's flat array, ends, d: each end's distance
// from the aquarium's centre }; malformed roads (under two points) are skipped so one bad entry cannot drop the dragon.
function aquariumBridges(roads, C, Rd) {
  const out = [];
  for (const rd of roads || []) {
    if (!Array.isArray(rd) || !rd[1]) continue;
    const f = rd[2];
    if (!Array.isArray(f) || f.length < 4) continue;
    const ends = [[f[0] / 10, f[1] / 10], [f[f.length - 2] / 10, f[f.length - 1] / 10]];
    const d = ends.map((e) => Math.hypot(e[0] - C[0], e[1] - C[1]));
    if (Math.min(d[0], d[1]) < Rd + 14) out.push({ f, ends, d });
  }
  return out;
}
// The flat arrays of the bridge roads this file rebuilds as the aquarium's footbridges, so that the generic bridge
// builder can leave them out instead of laying its own deck in the same place.
export function thuyTienBridgeRoads(data) {
  const st = data && data.sites && data.sites.thuytien;
  const aq = st && aquariumOf((st.items || []).map((it) => ({ ...it, pts: unflat(it.ring) })));
  if (!aq) return new Set();
  const { C, Rd } = aquariumDisc(aq);
  return new Set(aquariumBridges(data.roads, C, Rd).map((b) => b.f));
}

export function buildThuyTien(data, S, group) {
  const st = data.sites && data.sites.thuytien;
  if (!st) return;
  const items = (st.items || []).map((it) => ({ ...it, pts: unflat(it.ring) }));
  const waters = items.filter((it) => it.k === 'w').map((it) => it.pts);
  const wet = (x, z) => waters.some((w) => inRing(x, z, w));
  const used = new Set();
  const part = (fn) => { try { fn(); } catch (e) { console.warn('thuy tien:', e); } S.kind = KIND.PLAIN; S.base = 0; };

  // the dragon
  const aq = aquariumOf(items);
  if (aq) part(() => {
    used.add(aq.id);
    const { C, Rd } = aquariumDisc(aq);
    // the head rears to the north, a little west (bearing ~353°): on the 2026 satellite the round head with its
    // radiating mane sits ~23 m north and ~3 m west of the drum's axis, at the end of the neck. (It used to be
    // aimed at the lake's centroid, ~45° further west.)
    const hd = [Math.sin(-7 * Math.PI / 180), -Math.cos(-7 * Math.PI / 180)];
    // where the mapped footbridges arrive
    const angles = [];
    for (const { ends, d } of aquariumBridges(data.roads, C, Rd)) {
      const far = d[0] > d[1] ? ends[0] : ends[1], a = Math.atan2(far[1] - C[1], far[0] - C[0]);
      angles.push(a);
      // from the edge of the landing out to the far bank
      footbridge(S, [C[0] + Math.cos(a) * (Rd + 4.2), C[1] + Math.sin(a) * (Rd + 4.2)], [far[0] + Math.cos(a) * 1.5, far[1] + Math.sin(a) * 1.5]);
      S.kind = KIND.PLAIN;
    }
    dragon(S, C, Rd, hd, angles);
  });

  // the amphitheatre is gone: on the 2026 satellite the mapped grandstand and its show pool are a bare sandy
  // clearing with grey slab scraps, palms along the shore (the 2024-25 clean-up and asset auction). Lay the
  // clearing (the seats and stage were drawn by stands(), removed here; see git history).
  for (const it of items.filter((i) => i.k === 's')) part(() => {
    const c = centroid(it.pts);
    const pools = waters.filter((w) => { const q = centroid(w); return Math.hypot(q[0] - c[0], q[1] - c[1]) < 90; });
    const n0 = S.n;
    for (const r of [it.pts, ...pools]) cleared(S, r);
    (S.paved = S.paved || []).push([n0, S.n]);
  });
  // the island under the dragon: what the data build leaves of the pond's hole round the aquarium (the landing, the
  // terrace lobe to the NE, the round deck under the head), paved, a step below the landing
  if (aq) part(() => {
    const { C } = aquariumDisc(aq), yp = waterY(C[0], C[1]) - 0.08 + 0.46;
    for (const poly of data.ponds || []) for (let j = 1; j < poly.length; j++) {
      const hole = unflat(poly[j]);
      if (hole.length < 3 || !inRing(C[0], C[1], hole)) continue;
      let lo = Infinity, hi = -Infinity;
      for (const p of hole) { lo = Math.min(lo, gy(p[0], p[1])); hi = Math.max(hi, gy(p[0], p[1])); }
      S.base = 0;
      S.kind = KIND.MASONRY;
      S.prism(hole, Math.min(lo, yp) - 1.2, Math.max(yp - 0.12, hi + 0.08), hex('#8f8d82'), hex('#a9a69a'), { topKind: KIND.ROAD });
    }
  });

  // the aqua park: pools, the lazy river round the big one, its timber bridge, brick paths, the palm garden
  const poolRings = items.filter((i) => i.k === 'p').map((i) => i.pts).sort((a, b) => b.length - a.length);
  const big = poolRings[0];
  const river = curve(RIVER, 1);
  const riverD = (x, z) => distLine(x, z, river);
  // the roads through the park and along the amphitheatre's shore, to keep planting and paths off them
  const grand = items.find((i) => i.k === 's'), gc = grand ? centroid(grand.pts) : null;
  const nearPark = (p) => (Math.abs(p[0] + 1384) < 70 && Math.abs(p[1] - 6612) < 70) || (gc && Math.hypot(p[0] - gc[0], p[1] - gc[1]) < 110);
  const roadSegs = (data.roads || []).filter((e) => Array.isArray(e) && Array.isArray(e[2])).map((e) => ({ pts: unflat(e[2]), w: roadWidth(e) })).filter((r) => r.pts.some(nearPark));
  const onRoad = (x, z, m) => roadSegs.some((r) => distLine(x, z, r.pts) < r.w / 2 + m);
  let bigOut = null;
  for (const p of poolRings) part(() => {
    const out = pool(S, p, p === big ? (x, z) => Math.max(0.4, Math.min(3.2, riverD(x, z) - RIVER_HW - RIVER_WALL - 0.4)) : null);
    if (p === big) bigOut = out;
  });
  const smallKeep = poolRings.slice(1).map((r) => offsetRing(chaikin(r, 2), 0.4));
  const bigKeep = bigOut ? offsetRing(bigOut, 0.2) : big ? offsetRing(chaikin(big, 2), 0.6) : null;
  // which side of the river is away from the pool
  const cb = big ? centroid(big) : RIVER[4], mi = river.length >> 1, mf = frameAt(river, mi);
  const sg = (river[mi][0] + mf.n[0] - cb[0]) ** 2 + (river[mi][1] + mf.n[1] - cb[1]) ** 2 > (river[mi][0] - cb[0]) ** 2 + (river[mi][1] - cb[1]) ** 2 ? 1 : -1;
  const pathOut = river.map((p, i) => { const { n } = frameAt(river, i); return [p[0] + n[0] * sg * 3.6, p[1] + n[1] * sg * 3.6]; });
  const pathS = curve([[-1408, 6643], [-1404.5, 6639.6], [-1390, 6637.8], [-1377, 6637.6], [-1372, 6641], [-1371.6, 6650], [-1371.6, 6656]], 1);
  const paths = [pathOut, pathS];
  if (big) part(() => {
    lazyRiver(S, river);
    let bi = 0, bd = Infinity;
    river.forEach((p, i) => { const d = Math.abs(p[1] - 6612); if (d < bd) { bd = d; bi = i; } });
    riverBridge(S, river, bi);
    const terra = hex('#a5664e');
    ribbon(S, pathOut, 2.0, 0.36, terra);
    ribbon(S, pathS, 2.0, 0.36, terra);
  });
  const zone = (x, z) => x > -1418 && x < -1350 && z > 6574 && z < 6652;
  const clearOf = (x, z, m) => !wet(x, z) && !onRoad(x, z, m) && riverD(x, z) > RIVER_HW + RIVER_WALL + m && !(bigKeep && inRing(x, z, bigKeep)) && !smallKeep.some((r) => inRing(x, z, r)) && !paths.some((p) => distLine(x, z, p) < 1.0 + m);
  // the garden's ground: grass and bare earth between the palms, laid over the slope and kept clear of the generic
  // pines (registered as paved)
  if (big) part(() => {
    const n0 = S.n, st2 = 2, grass = hex('#6f8148'), earth = hex('#9a8964');
    S.kind = KIND.GROUND;
    const P = (a, b) => [a, gy(a, b) + 0.28, b];
    // only the garden itself: round the river, the pools and the south path, not out to the zone's square edge
    const bigNear = bigOut ? offsetRing(bigOut, 8) : null, smallNear = smallKeep.map((r) => offsetRing(r, 6));
    const inGarden = (x, z) => riverD(x, z) < 12 || distLine(x, z, pathS) < 6 || (bigNear && inRing(x, z, bigNear)) || smallNear.some((r) => inRing(x, z, r));
    for (let x = -1418; x < -1350; x += st2) for (let z = 6574; z < 6652; z += st2) {
      const cx = x + st2 / 2, cz = z + st2 / 2;
      if (!inGarden(cx, cz) || !clearOf(cx, cz, 0.2) || [[x, z], [x + st2, z], [x, z + st2], [x + st2, z + st2]].some(([a, b]) => wet(a, b))) continue;
      const h = 0.5 + 0.28 * Math.sin(cx * 0.19 + cz * 0.04) + 0.22 * Math.sin(cz * 0.15 - cx * 0.07), col = shade(mix(grass, earth, 0.08 + 0.3 * h * h), 0.98 + 0.04 * hash(cx + cz * 3));
      S.quad(P(x, z), P(x + st2, z), P(x + st2, z + st2), P(x, z + st2), col, [0, 1, 0]);
    }
    S.kind = KIND.PLAIN;
    (S.paved = S.paved || []).push([n0, S.n]);
  });
  // royal palms in rows: both sides of the river path, between the river and the pool, round the pools, along the
  // south path and the shore; fan palms under them
  if (big) part(() => {
    let seed = 11;
    const planted = [];
    const plant = (x, z, m = 0.7) => {
      if (!zone(x, z) || !clearOf(x, z, m) || planted.some((q) => Math.hypot(q[0] - x, q[1] - z) < 2.6)) return;
      planted.push([x, z]);
      royalPalm(S, x, z, 14 + hash(seed) * 4, seed++);
    };
    river.forEach((p, i) => {
      if (i % 5) return;
      const { n } = frameAt(river, i);
      for (const o of [5.6, 8.8, -2.9]) { const j = (hash(i + o) - 0.5) * 0.8; plant(p[0] + n[0] * sg * o + j, p[1] + n[1] * sg * o - j, o < 0 ? 0.3 : 0.7); }
    });
    const walk = (ring, step, off, fn) => {
      let carry = 0;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = carry; s < len; s += step) { fn(a[0] + ((b[0] - a[0]) * s) / len, a[1] + ((b[1] - a[1]) * s) / len); carry = s + step - len; }
        if (carry >= len) carry -= len;
      }
      void off;
    };
    if (bigOut) walk(offsetRing(bigOut, 1.4), 5.2, 0, (x, z) => plant(x, z));
    for (const r of smallKeep) walk(offsetRing(r, 1.6), 5, 0, (x, z) => plant(x, z));
    pathS.forEach((p, i) => { if (i % 6) return; const { n } = frameAt(pathS, i); for (const o of [-2.3, 2.3]) plant(p[0] + n[0] * o, p[1] + n[1] * o); });
    const lake = waters.slice().sort((a, b) => b.length - a.length)[0];
    if (lake) alongShore(lake, 6, wet, zone, (x, z, o) => { plant(x + o[0] * 2.6, z + o[1] * 2.6); plant(x + o[0] * 6.4, z + o[1] * 6.4); });
    for (let x = -1417; x < -1351; x += 3) for (let z = 6575; z < 6651; z += 3) {
      const h = hash(x * 3.7 + z * 1.3);
      if (h > 0.42) continue;
      const fx = x + h * 4, fz = z + hash(h * 99) * 2.5;
      if (!clearOf(fx, fz, 0.4) || planted.some((q) => Math.hypot(q[0] - fx, q[1] - fz) < 1.0)) continue;
      fanPalm(S, fx, fz, Math.floor(h * 1000));
    }
  });
  // the shore by the amphitheatre: two rows of royal palms along the water (2026 satellite)
  if (gc) part(() => {
    const lake = waters.slice().sort((a, b) => b.length - a.length)[0];
    if (!lake) return;
    let seed = 301;
    const planted = [];
    const ok = (x, z) => !wet(x, z) && !onRoad(x, z, 0.8) && !planted.some((q) => Math.hypot(q[0] - x, q[1] - z) < 2.6);
    alongShore(lake, 6.5, wet, (x, z) => Math.hypot(x - gc[0], z - gc[1]) < 80, (x, z, o) => {
      for (const d of [2.8, 7.2]) { const px = x + o[0] * d, pz = z + o[1] * d; if (ok(px, pz)) { planted.push([px, pz]); royalPalm(S, px, pz, 13 + hash(seed) * 4, seed++); } }
    });
  });

  for (const it of items.filter((i) => i.k === 'q')) part(() => { const n0 = S.n; plaza(S, it.pts, RINGED.has(String(it.id))); (S.paved = S.paved || []).push([n0, S.n]); });
  (st.points || []).forEach((p, i) => part(() => {
    const x = p.x / 10, z = p.z / 10;
    if (p.k === 'art') sculpture(S, x, z, i * 7 + 3); // (the old entrance gate was pulled down in the 2024-25 clean-up)
  }));

  // the slides: the building nearest the mapped slide point is the tower
  const sp = (st.points || []).find((p) => p.k === 'slide');
  if (sp && big) part(() => {
    const q = [sp.x / 10, sp.z / 10];
    const tower = items.filter((i) => i.k === 'b' && !used.has(i.id)).map((i) => { const c = centroid(i.pts); return { i, d: Math.hypot(c[0] - q[0], c[1] - q[1]) }; }).sort((a, b) => a.d - b.d)[0];
    if (!tower || tower.d > 60) return;
    used.add(tower.i.id);
    slides(S, tower.i.pts, chaikin(big, 2));
  });

  // the "Space Simulator": a small domed shell
  const sim = items.find((it) => /space|simulator/i.test(it.n || ''));
  if (sim) part(() => {
    used.add(sim.id);
    const c = centroid(sim.pts), r = Math.max(3.5, sim.pts.reduce((s, p) => s + Math.hypot(p[0] - c[0], p[1] - c[1]), 0) / sim.pts.length), g = gy(c[0], c[1]);
    S.kind = KIND.MASONRY;
    S.cyl(c[0], c[1], g - 0.4, g + 1.8, r, r, 12, hex('#a9a99f'), { cap: false });
    S.kind = KIND.PLAIN;
    for (let k = 0; k < 4; k++) { const a0 = (k / 4) * (Math.PI / 2), a1 = ((k + 1) / 4) * (Math.PI / 2); S.cyl(c[0], c[1], g + 1.8 + Math.sin(a0) * r * 0.9, g + 1.8 + Math.sin(a1) * r * 0.9, r * Math.cos(a0), Math.max(0.05, r * Math.cos(a1)), 12, shade(hex('#c4c3b8'), 1 - k * 0.05), { cap: false }); }
    S.box(c[0] + r, c[1], g, g + 2.2, 0.2, 1.6, 0, dark);
  });

  // whatever else is mapped: low derelict blocks, concrete going green
  for (const it of items) {
    if (it.k !== 'b' || used.has(it.id)) continue;
    part(() => {
      const o = obb(it.pts);
      if (o.w < 1 || o.d < 0.6) return;
      let lo = Infinity, hi = -Infinity;
      for (const p of it.pts) { lo = Math.min(lo, gy(p[0], p[1])); hi = Math.max(hi, gy(p[0], p[1])); }
      const big = o.w * o.d > 200, h = big ? 6.4 : 3.2, wall = mix(hex('#9a9c92'), hex('#6d7465'), hash(+it.id % 997) * 0.6);
      S.base = hi - LAND_Y;
      S.kind = KIND.MASONRY;
      S.box(o.c[0], o.c[1], lo - 0.3, hi + h, o.w, o.d, o.a, wall, { top: hex('#6f7566'), topKind: KIND.FLAT });
      S.kind = KIND.PLAIN;
      const ux = Math.cos(o.a), uz = Math.sin(o.a), n = Math.max(1, Math.floor(o.w / 3.2));
      for (const sd of [-1, 1]) for (let i = 0; i < n; i++) { const uu = (i + 0.5 - n / 2) * (o.w / n); S.box(o.c[0] + ux * uu - uz * sd * (o.d / 2 + 0.04), o.c[1] + uz * uu + ux * sd * (o.d / 2 + 0.04), hi + 0.9, hi + Math.min(h - 0.5, 2.3), 1.1, 0.1, o.a, dark); }
    });
  }
  // the lakeside walk relaid in 2024-25 (2 km of granite, 82 LED lamp posts: báo Văn Hóa, 16 Apr 2025)
  const lake = waters.slice().sort((a, b) => b.length - a.length)[0];
  if (lake && group) part(() => {
    const plz = items.filter((i) => i.k === 'q').map((i) => { const c = centroid(i.pts); return i.pts.map((p) => [c[0] + (p[0] - c[0]) * 1.15, c[1] + (p[1] - c[1]) * 1.15]); });
    const L = lakeLamps(S, lake, wet, (x, z) => plz.some((r) => inRing(x, z, r)));
    if (!L.length) return;
    const pts = glowPoints(L, L.map((_, k) => [0.86, 0.93, 1][k % 3]), 4);
    pts.userData.glow = true;
    pts.userData.landmark = 'thuytien';
    group.add(pts);
  });
}

// walk a shore ring every `step` metres; fn(x, z, o) gets the shore point and the unit normal pointing inland (the
// side that stays dry 3.5 and 5.5 m out), for points where keep(x, z) holds
function alongShore(ring, step, wet, keep, fn) {
  let A = 0;
  for (let i = 0, n = ring.length; i < n; i++) { const a = ring[i], b = ring[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
  let carry = step / 2;
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.01) continue;
    const d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], o = A > 0 ? [-d[1], d[0]] : [d[1], -d[0]];
    for (let s = carry; s < len; s += step) {
      carry = s + step - len;
      const bx = a[0] + d[0] * s, bz = a[1] + d[1] * s;
      if (!keep(bx, bz)) continue;
      const side = [1, -1].find((k) => !wet(bx + o[0] * k * 3.5, bz + o[1] * k * 3.5) && !wet(bx + o[0] * k * 5.5, bz + o[1] * k * 5.5));
      if (side) fn(bx, bz, [o[0] * side, o[1] * side], d);
    }
    if (carry >= len) carry -= len;
  }
}

// LED lamp posts round the lake, a few metres up the bank from the water's edge, one every ~26 m (2 km and 82 lamps
// would be ~24 m; the mapped shore is longer, ~2.4 km), none on the entrance plazas; returns the lamp heads as a flat
// [x, y, z, ...] list for the night glow.
function lakeLamps(S, ring, wet, skip) {
  const out = [], post = hex('#5d6466'), head = hex('#d9dcd8');
  alongShore(ring, 26, wet, () => true, (bx, bz, o, d) => {
    const x = bx + o[0] * 3.5, z = bz + o[1] * 3.5;
    if (skip(x, z)) return;
    const g = gy(x, z);
    S.kind = KIND.PLAIN;
    S.cyl(x, z, g - 0.2, g + 4.2, 0.09, 0.07, 5, post, { cap: false });
    S.box(x, z, g + 4.2, g + 4.45, 0.5, 0.5, Math.atan2(d[1], d[0]), head);
    out.push(x, g + 4.1, z);
  });
  return out;
}
