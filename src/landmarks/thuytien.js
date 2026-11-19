import { KIND, hex, shade, mix, unflat, obb } from '../geo/buf.js';
import { LAND_Y, POND_Y } from '../config.js';
import { rise, waterY } from '../geo/terrain.js';

// Hồ Thủy Tiên — the water park that opened in 2004 and was left to the pines.
//
// Mapped (OSM): the dragon aquarium's round footprint and the three footbridges that meet at it, the grandstand
// of the lakeside amphitheatre and its show pool, the slide pools and the slide tower, the two entrance plazas and
// their sculptures, the entrance, the lake itself.
// Drawn by hand, from what stands there: the aquarium as a saucer-rimmed drum under a dome, the dragon coiled
// round the dome with its head reared over the lake (the top floor opens into its mouth), the tiers of faded blue
// and yellow seats, three slides. (The pines are planted by the data build, as trees.)

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
const inRing = (x, z, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if (r[i][1] > z !== r[j][1] > z && x < ((r[j][0] - r[i][0]) * (z - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
};
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

// ------------------------------------------------------------------ the aquarium and its dragon
function dragon(S, C, Rd, hd, bridgeAngles) {
  const yb = waterY(C[0], C[1]), yp = LAND_Y + rise(C[0], C[1]) + 0.46; // the lake's own level; the landing, level with the footbridges
  const conc = hex('#a3a69b'), concD = hex('#7f847a'), pale = hex('#b9c4c2'), glass = hex('#2c444b');
  const r1 = Rd * 0.8, rS = Rd + 1.7, r2 = Rd * 0.7, Rp = Rd + 4.4;
  const yD = yp + 9.4, hD = 5.4; // spring of the dome, its height
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

  // ---- the dragon: two turns round the dome from a tail hanging over the saucer, then a reared neck
  const R = 2.45;
  const hAng = Math.atan2(hd[1], hd[0]), th1 = hAng + Math.PI, turns = 2.1, coilN = 240;
  const yStart = yp + 6.5 + R * 0.8, yEnd = yD + hD * 0.8;
  const pts = [], rad = [], dors = [];
  for (let i = 0; i <= coilN; i++) {
    const t = i / coilN, th = th1 - turns * Math.PI * 2 * (1 - t);
    const k = t < 0.14 ? (0.14 - t) / 0.14 : 0;
    const y = yStart + (yEnd - yStart) * Math.pow(t, 1.12) - k * k * 6.2;
    const rr = surf(y - R * 0.2) + R * 0.8 + k * k * 8.5;
    pts.push([C[0] + Math.cos(th) * rr, y, C[1] + Math.sin(th) * rr]);
    rad.push(R * Math.min(1, 0.07 + t / 0.2) * (0.95 + 0.05 * Math.sin(t * 11)));
    dors.push(nrm([Math.cos(th) * 0.7, 1, Math.sin(th) * 0.7]));
  }
  const yT = yD + hD, E = pts[pts.length - 1];
  const W = (a, y, side = 0) => [C[0] + hd[0] * a - hd[1] * side, y, C[1] + hd[1] * a + hd[0] * side];
  const neck = catmull([pts[pts.length - 8], E, W(-4.4, yT + 2.4, 1.6), W(-5.2, yT + 6.6, 0.8), W(-2.8, yT + 11.4, 0), W(3.2, yT + 13.2, 0), W(8.2, yT + 12.3, 0), W(12.5, yT + 11.2, 0)], 0.85).slice(1);
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
  { const { T, N, B } = rings[1]; for (const sd of [-1, 0, 1]) fin(S, add(pts[0], scl(N, 0.35)), add(pts[0], scl(N, -0.35)), add(pts[0], add(scl(T, -3.4), add(scl(N, sd * 1.5), scl(B, sd * 0.6)))), gold); }
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
  const dx = to[0] - from[0], dz = to[1] - from[1], len = Math.hypot(dx, dz);
  if (len < 4) return;
  const d = [dx / len, dz / len], ac = [-d[1], d[0]], ang = Math.atan2(d[1], d[0]), lift = rise(from[0], from[1]), y = LAND_Y + lift + 0.5, wd = 3.0;
  const P = (s, o, h = 0) => [from[0] + d[0] * s + ac[0] * o, y + h, from[1] + d[1] * s + ac[1] * o];
  const mid = P(len / 2, 0);
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
function stands(S, ring, focus) {
  const o = obb(ring), c = centroid(ring);
  const axes = [[Math.cos(o.a), Math.sin(o.a)], [-Math.sin(o.a), Math.cos(o.a)]];
  const away = [c[0] - focus[0], c[1] - focus[1]];
  let up = Math.abs(axes[0][0] * away[0] + axes[0][1] * away[1]) > Math.abs(axes[1][0] * away[0] + axes[1][1] * away[1]) ? axes[0] : axes[1];
  if (up[0] * away[0] + up[1] * away[1] < 0) up = [-up[0], -up[1]];
  const ac = [-up[1], up[0]];
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity, g0 = Infinity;
  for (const p of ring) { const a = p[0] * up[0] + p[1] * up[1], b = p[0] * ac[0] + p[1] * ac[1]; u0 = Math.min(u0, a); u1 = Math.max(u1, a); v0 = Math.min(v0, b); v1 = Math.max(v1, b); g0 = Math.min(g0, gy(p[0], p[1])); }
  const rows = Math.max(8, Math.min(22, Math.round((u1 - u0) / 1.7))), dep = (u1 - u0) / rows, riseH = 0.48;
  const segs = Math.max(4, Math.round((v1 - v0) / 3.0)), wid = (v1 - v0) / segs, ang = Math.atan2(up[1], up[0]);
  const conc = hex('#a09f94'), seats = [hex('#4d7da6'), hex('#d0ad4a'), hex('#4d7da6'), hex('#b9b6aa')], faded = hex('#9a9c93');
  S.base = g0 - LAND_Y;
  S.kind = KIND.PLAIN;
  let topY = g0;
  for (let r = 0; r < rows; r++) for (let k = 0; k < segs; k++) {
    const a = u0 + (r + 0.5) * dep, b = v0 + (k + 0.5) * wid, x = up[0] * a + ac[0] * b, z = up[1] * a + ac[1] * b;
    if (!inRing(x, z, ring)) continue;
    const y = g0 + 0.7 + r * riseH, aisle = k % 5 === 0;
    const col = aisle ? shade(conc, 1.06) : mix(seats[Math.floor(k / 5) % seats.length], faded, 0.2 + 0.35 * hash(r * 31 + k));
    S.box(x, z, g0 - 0.4, y, dep + 0.02, wid + 0.02, ang, conc, { top: col });
    if (!aisle) S.box(x + up[0] * dep * 0.32, z + up[1] * dep * 0.32, y, y + 0.42, dep * 0.18, wid * 0.9, ang, shade(col, 0.82)); // seat backs
    topY = Math.max(topY, y);
  }
  // back wall and the lighting gantry over the top row
  const bc = [up[0] * (u1 + 0.4) + ac[0] * (v0 + v1) / 2, up[1] * (u1 + 0.4) + ac[1] * (v0 + v1) / 2];
  S.kind = KIND.MASONRY;
  S.box(bc[0], bc[1], g0 - 0.4, topY + 1.6, 0.6, (v1 - v0) * 0.9, ang, shade(conc, 0.92));
  S.kind = KIND.PLAIN;
  // the stage arch on the far side of the pool
  const sc = [focus[0] - up[0] * 16, focus[1] - up[1] * 16], gs = gy(sc[0], sc[1]);
  for (const sd of [-1, 1]) S.box(sc[0] + ac[0] * sd * 9, sc[1] + ac[1] * sd * 9, gs - 0.3, gs + 7.5, 1.1, 1.1, ang, hex('#b4b2a6'));
  S.box(sc[0], sc[1], gs + 6.6, gs + 7.7, 1.0, 20, ang, hex('#8f6f5a'));
  S.box(sc[0] + up[0] * 2, sc[1] + up[1] * 2, gs - 0.3, gs + 0.7, 7, 16, ang, hex('#a6a498'), { topKind: KIND.ROAD });
}

// ------------------------------------------------------------------ pools, plazas, sculptures, the gate
function pool(S, ring) {
  const c = centroid(ring);
  let g = -Infinity, lo = Infinity;
  for (const p of ring) { g = Math.max(g, gy(p[0], p[1])); lo = Math.min(lo, gy(p[0], p[1])); }
  S.base = 0;
  S.kind = KIND.PLAIN;
  g = Math.min(g, lo + 1.0);
  S.prism(ring, lo - 0.4, g + 0.45, hex('#b7c3c2'), hex('#c6cfcc'), { holes: [scaled(ring, c, 0.9).reverse()] });
  S.prism(scaled(ring, c, 0.9), lo - 0.4, g + 0.2, hex('#5d7558'), hex('#4f6a52')); // what is left of the water
}
function plaza(S, ring) {
  // paving laid over the slope as it falls, with a planted roundel in the middle
  const c = centroid(ring), lift = 0.24, mid = scaled(ring, c, 0.5), col = hex('#bdb8a8');
  const P = (p) => [p[0], gy(p[0], p[1]) + lift, p[1]];
  S.kind = KIND.ROAD;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    S.tri(P(c), P(mid[i]), P(mid[j]), col, [0, 1, 0]);
    S.quad(P(mid[i]), P(ring[i]), P(ring[j]), P(mid[j]), i % 2 ? col : shade(col, 0.95), [0, 1, 0]);
    S.quad([ring[i][0], gy(ring[i][0], ring[i][1]) - 0.3, ring[i][1]], [ring[j][0], gy(ring[j][0], ring[j][1]) - 0.3, ring[j][1]], P(ring[j]), P(ring[i]), hex('#9c998c'), [ring[i][0] - c[0], 0.2, ring[i][1] - c[1]]);
  }
  const g = gy(c[0], c[1]);
  S.kind = KIND.MASONRY;
  S.prism(scaled(ring, c, 0.2), g - 0.6, g + 0.75, hex('#a8a598'), hex('#7f8f68'));
  S.kind = KIND.PLAIN;
}
function sculpture(S, x, z, seed) {
  const g = gy(x, z), stone = hex('#cbc6b8'), a = hash(seed) * 3;
  S.kind = KIND.MASONRY;
  S.box(x, z, g - 0.2, g + 0.9, 1.6, 1.6, a, hex('#a9a69a'));
  S.kind = KIND.PLAIN;
  const kind = Math.floor(hash(seed + 5) * 3);
  if (kind === 0) for (let k = 0; k < 4; k++) S.box(x, z, g + 0.9 + k * 0.8, g + 1.7 + k * 0.8, 1.2 - k * 0.2, 0.7, a + k * 0.5, shade(stone, 1 - k * 0.04)); // a twisting stack
  else if (kind === 1) { S.cyl(x, z, g + 0.9, g + 3.4, 0.55, 0.3, 6, stone); S.cyl(x, z, g + 3.4, g + 4.2, 0.7, 0.2, 6, shade(stone, 0.92)); } // a figure
  else { S.beam([x - 0.9, g + 0.9, z], [x, g + 3.6, z + 0.3], 0.5, 0.5, stone); S.beam([x + 0.9, g + 0.9, z], [x, g + 3.6, z + 0.3], 0.5, 0.5, shade(stone, 0.93)); } // an arch
}
function gate(S, x, z, toward) {
  const d = nrm([toward[0] - x, 0, toward[1] - z]), ang = Math.atan2(d[2], d[0]), ac = [-d[2], d[0]], g = gy(x, z);
  S.kind = KIND.MASONRY;
  for (const sd of [-1, 1]) S.box(x + ac[0] * sd * 5, z + ac[1] * sd * 5, g - 0.3, g + 7, 1.6, 1.6, ang, hex('#b3b0a3'), { taper: 0.9 });
  S.kind = KIND.PLAIN;
  S.box(x, z, g + 5.6, g + 7.2, 1.0, 12.4, ang, hex('#a09d90'));
  S.box(x + d[0] * 0.55, z + d[2] * 0.55, g + 5.9, g + 6.9, 0.1, 8.5, ang, hex('#5f7f8c')); // the sign, its letters long gone
  S.box(x + ac[0] * 8.5, z + ac[1] * 8.5, g - 0.3, g + 2.8, 3, 3, ang, hex('#a8a79b'), { top: hex('#7c7f72') }); // ticket booth
}

// ------------------------------------------------------------------ the slides
// Mapped: the tower building, the two pools, the point OSM calls "water tubes". The three runs are illustrative:
// a yellow open flume, a blue-and-white twin racer, a closed tube.
function slides(S, tower, pools) {
  const o = obb(tower), g = gy(o.c[0], o.c[1]), yTop = g + 12.5;
  const concD = hex('#8b8d83');
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], g - 0.5, g + 3.4, Math.max(o.w, 8), Math.max(o.d, 6), o.a, hex('#a5a69b'), { top: hex('#7d8274'), topKind: KIND.FLAT }); // changing rooms
  S.kind = KIND.PLAIN;
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) S.cyl(o.c[0] + dx * 2.2, o.c[1] + dz * 2.2, g + 3.4, yTop, 0.22, 0.22, 5, concD, { cap: false });
  for (const y of [g + 6.4, g + 9.4, yTop]) S.box(o.c[0], o.c[1], y - 0.25, y, 5.4, 5.4, 0, hex('#9a9b90'), { bottom: true });
  S.box(o.c[0], o.c[1], yTop + 2.6, yTop + 2.85, 6.4, 6.4, 0, hex('#6f8a94'), { bottom: true }); // canopy
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) S.cyl(o.c[0] + dx * 2.6, o.c[1] + dz * 2.6, yTop, yTop + 2.6, 0.1, 0.1, 4, concD, { cap: false });
  for (let k = 0; k < 12; k++) { const y0 = g + 3.4 + (k / 12) * (yTop - g - 3.4); S.box(o.c[0] + 3.3, o.c[1] - 2.2 + (k % 6) * 0.88, y0, y0 + 0.2, 1.2, 0.9, 0, hex('#8f9086')); } // stairs
  const trough = (path, col, hw = 0.8) => {
    for (let k = 0; k + 1 < path.length; k++) {
      const a = path[k], b = path[k + 1], T = nrm(sub(b, a)), sd = nrm(crs(T, [0, 1, 0])), dep = 0.6;
      const L = (p, w, h) => add(p, add(scl(sd, w), [0, h, 0]));
      S.quad(L(a, -hw * 0.6, 0), L(a, hw * 0.6, 0), L(b, hw * 0.6, 0), L(b, -hw * 0.6, 0), col, [0, 1, 0]);
      for (const sg of [-1, 1]) {
        S.quad(L(a, sg * hw * 0.6, 0), L(b, sg * hw * 0.6, 0), L(b, sg * hw, dep), L(a, sg * hw, dep), shade(col, 0.9), add(scl(sd, -sg), [0, 0.6, 0]));
        S.quad(L(a, sg * hw * 0.6, -0.12), L(b, sg * hw * 0.6, -0.12), L(b, sg * hw, dep), L(a, sg * hw, dep), shade(col, 0.72), scl(sd, sg));
      }
      if (k % 4 === 2 && a[1] - gy(a[0], a[2]) > 1) S.cyl(a[0], a[2], gy(a[0], a[2]) - 0.3, a[1] - 0.1, 0.16, 0.16, 4, concD, { cap: false });
    }
  };
  const run = (tgt, n, lat, yFrom = yTop) => {
    const dx = tgt[0] - o.c[0], dz = tgt[1] - o.c[1], len = Math.hypot(dx, dz) || 1, dir = [dx / len, dz / len], side = [-dir[1], dir[0]], path = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, [l, extra] = lat(t), along = 2.6 + t * (len - 2.6) + extra;
      const x = o.c[0] + dir[0] * along + side[0] * l, z = o.c[1] + dir[1] * along + side[1] * l;
      const yEnd = gy(tgt[0], tgt[1]) + 0.7;
      path.push([x, Math.max(gy(x, z) + 0.5, yFrom + (yEnd - yFrom) * Math.pow(t, 0.85)), z]);
    }
    return path;
  };
  const big = pools[0], small = pools[1] || pools[0];
  if (!big) return;
  const cb = centroid(big), cs = centroid(small);
  S.kind = KIND.PLAIN;
  trough(run(cb, 44, (t) => [3.5 + Math.sin(t * Math.PI * 3.2) * 5.5 * Math.sin(t * Math.PI), 0]), hex('#d2b04a'));
  for (const [off, col] of [[-3.4, hex('#5b8fb0')], [-5.2, hex('#d9dcd6')]]) trough(run(cb, 26, (t) => [off, 0], yTop - 3), col, 0.75);
  // the closed tube: a dark green corkscrew down to the smaller pool
  const tube = run(cs, 60, (t) => [Math.sin(t * Math.PI * 5) * 4.2 * (1 - t * 0.4), Math.cos(t * Math.PI * 5) * 4.2 * (1 - t * 0.4) - 4.2]);
  sweep(S, tube, tube.map(() => 0.85), tube.map(() => [0, 1, 0]), 8, (i) => [i % 6 < 3 ? hex('#4c6f5b') : hex('#3f5f4f'), KIND.PLAIN]);
  for (let k = 3; k < tube.length; k += 6) { const a = tube[k]; if (a[1] - gy(a[0], a[2]) > 1.6) S.cyl(a[0], a[2], gy(a[0], a[2]) - 0.3, a[1] - 0.8, 0.18, 0.18, 4, concD, { cap: false }); }
}

export function buildThuyTien(data, S) {
  const st = data.sites && data.sites.thuytien;
  if (!st) return;
  const items = (st.items || []).map((it) => ({ ...it, pts: unflat(it.ring) }));
  const cm = [st.c[0] / 10, st.c[1] / 10];
  const waters = items.filter((it) => it.k === 'w').map((it) => it.pts);
  const wet = (x, z) => waters.some((w) => inRing(x, z, w));
  const used = new Set();
  const part = (fn) => { try { fn(); } catch (e) { console.warn('thuy tien:', e); } S.kind = KIND.PLAIN; S.base = 0; };

  // the dragon
  const aq = items.find((it) => it.k === 'b' && /dragon|aquarium/i.test(it.n || ''));
  if (aq) part(() => {
    used.add(aq.id);
    const C = centroid(aq.pts), Rd = Math.max(9, aq.pts.reduce((s, p) => s + Math.hypot(p[0] - C[0], p[1] - C[1]), 0) / aq.pts.length);
    // the head looks out over the main lake
    const lake = waters.slice().sort((a, b) => b.length - a.length)[0];
    let hd = lake ? sub([...centroid(lake), 0], [...C, 0]) : [cm[0] - C[0], cm[1] - C[1], 0];
    { const l = Math.hypot(hd[0], hd[1]) || 1; hd = [hd[0] / l, hd[1] / l]; }
    // where the mapped footbridges arrive
    const angles = [];
    for (const rd of data.roads || []) {
      if (!rd[1]) continue;
      const f = rd[2], ends = [[f[0] / 10, f[1] / 10], [f[f.length - 2] / 10, f[f.length - 1] / 10]];
      const d = ends.map((e) => Math.hypot(e[0] - C[0], e[1] - C[1]));
      if (Math.min(d[0], d[1]) < Rd + 14) {
        const far = d[0] > d[1] ? ends[0] : ends[1], a = Math.atan2(far[1] - C[1], far[0] - C[0]);
        angles.push(a);
        // from the edge of the landing out to the far bank
        footbridge(S, [C[0] + Math.cos(a) * (Rd + 4.2), C[1] + Math.sin(a) * (Rd + 4.2)], [far[0] + Math.cos(a) * 1.5, far[1] + Math.sin(a) * 1.5]);
        S.kind = KIND.PLAIN;
      }
    }
    dragon(S, C, Rd, hd, angles);
  });

  // the amphitheatre: stands, with the nearest small water as the show pool
  for (const it of items.filter((i) => i.k === 's')) part(() => {
    const c = centroid(it.pts);
    const pools = waters.map((w) => centroid(w)).filter((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) < 90).sort((a, b) => Math.hypot(a[0] - c[0], a[1] - c[1]) - Math.hypot(b[0] - c[0], b[1] - c[1]));
    stands(S, it.pts, pools[0] || cm);
  });
  const poolRings = items.filter((i) => i.k === 'p').map((i) => i.pts).sort((a, b) => b.length - a.length);
  for (const p of poolRings) part(() => { pool(S, p); });
  for (const it of items.filter((i) => i.k === 'q')) part(() => { plaza(S, it.pts); });
  (st.points || []).forEach((p, i) => part(() => {
    const x = p.x / 10, z = p.z / 10;
    if (p.k === 'art') sculpture(S, x, z, i * 7 + 3);
    else if (p.k === 'gate') { gate(S, x, z, cm); }
  }));

  // the slides: the building nearest the mapped slide point is the tower
  const sp = (st.points || []).find((p) => p.k === 'slide');
  if (sp && poolRings.length) part(() => {
    const q = [sp.x / 10, sp.z / 10];
    const tower = items.filter((i) => i.k === 'b' && !used.has(i.id)).map((i) => ({ i, d: Math.hypot(centroid(i.pts)[0] - q[0], centroid(i.pts)[1] - q[1]) })).sort((a, b) => a.d - b.d)[0];
    if (!tower || tower.d > 60) return;
    used.add(tower.i.id);
    slides(S, tower.i.pts, poolRings);
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
}
