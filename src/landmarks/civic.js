import { KIND, hex, shade, unflat, obb, ringCentre, signedArea, span } from '../geo/buf.js';
import { LAND_Y, PAL } from '../config.js';
import { rise } from '../geo/terrain.js';
import { pavilion } from './citadel.js';

// Named places of the modern and colonial city, each built on its own OSM footprint: position, size and
// orientation are mapped; the forms follow what stands there (see README for what is illustrative).

const dark = hex('#2b2422'), cream = hex('#f3e8d2'), stone = PAL.stone;

// local frame: `f` points out of the front, `p` runs along the facade
function frame(c, f) {
  const p = [-f[1], f[0]];
  return { c, f, p, a: Math.atan2(f[1], f[0]), at: (a, b = 0) => [c[0] + f[0] * a + p[0] * b, c[1] + f[1] * a + p[1] * b] };
}
function polyCentroid(r) {
  let x = 0, z = 0, A = 0;
  for (let i = 0, n = r.length; i < n; i++) { const a = r[i], b = r[(i + 1) % n], k = a[0] * b[1] - b[0] * a[1]; A += k; x += (a[0] + b[0]) * k; z += (a[1] + b[1]) * k; }
  return A ? [x / (3 * A), z / (3 * A)] : ringCentre(r);
}
const inRing = (x, z, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if (r[i][1] > z !== r[j][1] > z && x < ((r[j][0] - r[i][0]) * (z - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
};
// Pitched roof with the ridge along `ang`; the gable ends are closed in the wall colour.
function gable(S, c, len, wid, ang, y0, h, roofCol, wallCol, over = 0.7) {
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const P = (u, v, y) => [c[0] + u * ux - v * uz, y, c[1] + u * uz + v * ux];
  const hl = len / 2 + over, hw = wid / 2 + over, ye = y0 - (h * over) / hw;
  const keep = S.kind;
  S.kind = KIND.TILE;
  S.quad(P(-hl, -hw, ye), P(hl, -hw, ye), P(hl, 0, y0 + h), P(-hl, 0, y0 + h), roofCol, [uz, 0.9, -ux]);
  S.quad(P(-hl, hw, ye), P(hl, hw, ye), P(hl, 0, y0 + h), P(-hl, 0, y0 + h), roofCol, [-uz, 0.9, ux]);
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) S.tri(P(s * len / 2, -wid / 2, y0), P(s * len / 2, wid / 2, y0), P(s * len / 2, 0, y0 + h * (wid / 2) / hw), wallCol, [s * ux, 0, s * uz]);
  S.beam(P(-hl, 0, y0 + h + 0.05), P(hl, 0, y0 + h + 0.05), 0.4, 0.3, shade(roofCol, 0.8));
  S.kind = keep;
}
// hip roof over a rectangle given in frame terms (da along f, db along p)
function hipOn(S, F, pt, da, db, y, h, col, opts) {
  if (da >= db) S.hip(pt[0], pt[1], da, db, F.a, y, h, col, opts);
  else S.hip(pt[0], pt[1], db, da, F.a + Math.PI / 2, y, h, col, opts);
}
function cross(S, x, z, y, h, F, col = cream) {
  S.beam([x, y, z], [x, y + h, z], 0.28, 0.28, col);
  const w = h * 0.3;
  S.beam([x - F.p[0] * w, y + h * 0.68, z - F.p[1] * w], [x + F.p[0] * w, y + h * 0.68, z + F.p[1] * w], 0.26, 0.26, col);
}
const ground = (c) => LAND_Y + rise(c[0], c[1]);

// ---- Ga Huế (1908): the long pink colonial station, a tall middle pavilion between two wings ----
function station(S, data) {
  const sp = data.special.gahue;
  if (!sp) return;
  const o = obb(unflat(sp.ring));
  let n = [-Math.sin(o.a), Math.cos(o.a)], best = null, bd = Infinity;
  for (const r of data.rails) { const pts = unflat(r[2]); for (const q of pts) { const d = Math.hypot(q[0] - o.c[0], q[1] - o.c[1]); if (d < bd) { bd = d; best = q; } } }
  if (best && (o.c[0] - best[0]) * n[0] + (o.c[1] - best[1]) * n[1] < 0) n = [-n[0], -n[1]]; // the front looks away from the tracks
  const F = frame(o.c, n), L = o.w, D = Math.max(o.d * 0.8, 9), y0 = ground(o.c);
  const pink = hex('#d58a80'), tile = hex('#a2553d');
  S.base = y0 - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y0 - 0.4, y0 + 0.5, D + 3, L + 2, F.a, stone, { topKind: KIND.ROAD });
  const y = y0 + 0.5;
  S.kind = KIND.CIVIC;
  S.box(o.c[0], o.c[1], y, y + 5.9, D, L, F.a, pink, { top: shade(tile, 0.8) });
  hipOn(S, F, o.c, D, L, y + 5.9, 2.7, tile, { over: 0.9, fascia: 0.32, fasciaCol: cream });
  for (const s of [-1, 1]) {
    const e = F.at(0, s * (L / 2 - L * 0.07));
    S.kind = KIND.CIVIC;
    S.box(e[0], e[1], y, y + 7.4, D + 1.6, L * 0.14, F.a, pink, { top: shade(tile, 0.8) });
    S.kind = KIND.PLAIN;
    S.box(e[0], e[1], y + 7.0, y + 7.4, D + 2.0, L * 0.14 + 0.4, F.a, cream);
    hipOn(S, F, e, D + 1.6, L * 0.14, y + 7.4, 2.9, tile, { over: 0.8 });
  }
  // the middle pavilion, its pediment toward the square
  const cw = Math.max(L * 0.2, 13);
  S.kind = KIND.CIVIC;
  S.box(o.c[0], o.c[1], y, y + 9.6, D + 3.4, cw, F.a, pink, { top: shade(tile, 0.8) });
  S.kind = KIND.PLAIN;
  S.box(o.c[0], o.c[1], y + 9.1, y + 9.6, D + 3.9, cw + 0.5, F.a, cream);
  S.box(o.c[0], o.c[1], y + 4.9, y + 5.2, D + 3.7, cw + 0.3, F.a, cream);
  gable(S, o.c, D + 3.4, cw, F.a, y + 9.6, 3.4, tile, cream, 0.8);
  for (const s of [-1, 1]) {
    for (const b of [-cw * 0.3, 0, cw * 0.3]) { const q = F.at(s * (D / 2 + 1.72), b); S.box(q[0], q[1], y, y + 4.2, 0.16, cw * 0.17, F.a, dark); }
    const q = F.at(s * (D / 2 + 1.74), 0);
    S.cyl(q[0], q[1], y + 10.3, y + 11.6, 0.7, 0.7, 8, hex('#efe9dc')); // the clock in the pediment
  }
  // street canopy in front, platform roof behind
  for (const [s, dep, len, h, col] of [[1, 4.2, cw + 8, 4.0, cream], [-1, 6.5, L * 0.94, 4.5, hex('#8d968c')]]) {
    const m = F.at(s * (D / 2 + 1.7 + dep / 2), 0);
    S.box(m[0], m[1], y + h, y + h + 0.24, dep, len, F.a, col, { bottom: true });
    for (let b = -len / 2 + 0.6; b <= len / 2; b += (len - 1.2) / Math.max(2, Math.round(len / 7))) {
      const q = F.at(s * (D / 2 + 1.7 + dep - 0.5), b);
      S.cyl(q[0], q[1], y0, y + h, 0.14, 0.14, 5, hex('#5f6862'), { cap: false });
    }
  }
}

// ---- Nhà thờ Phủ Cam (Ngô Viết Thụ, begun 1963): a concrete cross plan, ribs rising up the nave, twin towers ----
function phuCam(S, data) {
  const sp = data.special.phucam;
  if (!sp) return;
  const ring = unflat(sp.ring), o = obb(ring), pc = polyCentroid(ring);
  let f = [Math.cos(o.a), Math.sin(o.a)];
  if ((pc[0] - o.c[0]) * f[0] + (pc[1] - o.c[1]) * f[1] > 0) f = [-f[0], -f[1]]; // transept and apse weigh toward the back
  const F = frame(o.c, f), L = o.w, W = o.d, nw = Math.min(W * 0.5, 22), y0 = ground(o.c);
  const conc = hex('#d3cfc6'), rib = hex('#bdb9b0'), roof = hex('#5b6068'), glass = hex('#34465c');
  S.base = y0 - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y0 - 1.5, y0 + 0.6, L + 6, nw + 10, F.a, stone, { topKind: KIND.ROAD });
  const y = y0 + 0.6, H = 13.5;
  S.kind = KIND.PLAIN;
  S.box(o.c[0], o.c[1], y, y + H, L * 0.9, nw, F.a, conc, { top: roof });
  gable(S, o.c, L * 0.9, nw, F.a, y + H, 9.5, roof, conc, 0.9);
  const tc = F.at(-L * 0.14, 0), tw = nw * 0.85;
  S.box(tc[0], tc[1], y, y + H, tw, W * 0.94, F.a, conc, { top: roof });
  gable(S, tc, W * 0.94, tw, F.a + Math.PI / 2, y + H, 8.4, roof, conc, 0.9);
  for (const s of [-1, 1]) { const q = F.at(-L * 0.14, s * (W * 0.47 + 0.06)); S.box(q[0], q[1], y + 3, y + H - 1.5, tw * 0.5, 0.16, F.a, glass); }
  const ap = F.at(-L * 0.45, 0);
  S.cyl(ap[0], ap[1], y, y + 11, nw * 0.44, nw * 0.44, 10, conc, { cap: false });
  S.kind = KIND.TILE;
  S.cyl(ap[0], ap[1], y + 11, y + 17, nw * 0.5, 0.3, 10, roof, { cap: false });
  S.kind = KIND.PLAIN;
  // the ribs: concrete fins leaning in to carry the roof, tall glazing between them
  const step = 5.6;
  for (let a = -L * 0.4; a <= L * 0.4; a += step) {
    if (Math.abs(a + L * 0.14) < tw * 0.5 + 1.2) continue;
    for (const s of [-1, 1]) {
      const lo = F.at(a, s * (nw / 2 + 3.0)), hi = F.at(a, s * (nw / 2 + 0.1));
      S.beam([lo[0], y - 0.4, lo[1]], [hi[0], y + H + 0.6, hi[1]], 0.75, 1.0, rib);
      const g = F.at(a + step / 2, s * (nw / 2 + 0.07));
      if (Math.abs(a + step / 2 + L * 0.14) > tw * 0.5 + 1.2 && a + step / 2 < L * 0.4) S.box(g[0], g[1], y + 3.2, y + H - 1.2, 1.9, 0.16, F.a, glass);
    }
  }
  // the facade: a tall concrete screen with the portal, between two towers
  const fa = L * 0.45;
  let q = F.at(fa + 0.5, 0);
  S.box(q[0], q[1], y, y + 22, 1.6, nw + 1.5, F.a, conc);
  S.box(q[0], q[1], y + 22, y + 25.5, 1.6, nw * 0.5, F.a, conc);
  cross(S, q[0], q[1], y + 25.5, 4.2, F);
  q = F.at(fa + 1.34, 0);
  S.box(q[0], q[1], y, y + 9.5, 0.14, 4.4, F.a, dark);
  S.box(q[0], q[1], y + 12, y + 20, 0.14, 2.6, F.a, glass);
  for (const s of [-1, 1]) {
    q = F.at(fa + 1.34, s * 5.6);
    S.box(q[0], q[1], y, y + 6.2, 0.14, 2.5, F.a, dark);
    const t = F.at(fa - 0.6, s * (nw / 2 + 3.4));
    // the towers stand 43.5 m to the top of their crosses (VietNamNet; docs/reference/heights-sourced.md)
    S.box(t[0], t[1], y, y + 25, 5.2, 5.2, F.a, conc, { taper: 0.84 });
    S.box(t[0], t[1], y + 25, y + 34, 4.2, 4.2, F.a, rib, { taper: 0.72 });
    S.cyl(t[0], t[1], y + 34, y + 40.1, 2.2, 0.14, 4, roof, { cap: false, rot: F.a + Math.PI / 4 });
    cross(S, t[0], t[1], y + 39.9, 3.0, F);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const l = F.at(fa - 0.6 + dx * 2.36, s * (nw / 2 + 3.4) + dz * 2.36);
      S.box(l[0], l[1], y + 16.5, y + 23, dx ? 0.14 : 1.5, dx ? 1.5 : 0.14, F.a, dark);
    }
  }
  // steps down the hill in front
  for (let i = 0; i < 4; i++) { q = F.at(fa + 3.2 + i * 1.5, 0); S.box(q[0], q[1], y0 - 1.5, y0 + 0.45 - i * 0.3, 1.6, nw + 4 + i * 2, F.a, stone, { topKind: KIND.ROAD }); }
}

// ---- Nhà thờ Dòng Chúa Cứu Thế (Nguyễn Mỹ Lộc, 1959–62): grey-blue stone, tiled eastern roofs, one tall spire ----
function redemptorist(S, data) {
  const sp = data.special.dcct;
  if (!sp) return;
  const ring = unflat(sp.ring), o = obb(ring), pc = polyCentroid(ring);
  let f = [Math.cos(o.a), Math.sin(o.a)];
  if ((pc[0] - o.c[0]) * f[0] + (pc[1] - o.c[1]) * f[1] > 0) f = [-f[0], -f[1]];
  const F = frame(o.c, f), L = o.w, W = o.d, nw = Math.min(W * 0.44, 19), y0 = ground(o.c);
  const st = hex('#8c999f'), stL = hex('#a3aeb2'), trim = hex('#dcd9cf'), roof = hex('#7a4b3b'), slate = hex('#59646d'), glass = hex('#2f3f52');
  S.base = y0 - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y0 - 0.5, y0 + 0.7, L + 4, nw + 14, F.a, stone, { topKind: KIND.ROAD });
  const y = y0 + 0.7, H = 13;
  // aisles, nave, transept
  S.box(o.c[0], o.c[1], y, y + 6.6, L * 0.74, nw + 9, F.a, st, { top: roof });
  hipOn(S, F, o.c, L * 0.74, nw + 9, y + 6.6, 2.4, roof, { over: 0.9, flare: 0.3 });
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y, y + H, L * 0.86, nw, F.a, st, { top: roof });
  gable(S, o.c, L * 0.86, nw, F.a, y + H, 6.6, roof, stL, 1.0);
  const tc = F.at(-L * 0.12, 0), tw = nw * 0.82;
  S.kind = KIND.MASONRY;
  S.box(tc[0], tc[1], y, y + H, tw, W * 0.9, F.a, st, { top: roof });
  gable(S, tc, W * 0.9, tw, F.a + Math.PI / 2, y + H, 6.0, roof, stL, 1.0);
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) {
    const g = F.at(-L * 0.12, s * (W * 0.45 + 0.07)); S.box(g[0], g[1], y + 3.5, y + H - 1, tw * 0.42, 0.16, F.a, glass);
    for (let a = -L * 0.38; a <= L * 0.36; a += 5.2) { if (Math.abs(a + L * 0.12) < tw * 0.5 + 1) continue; const w = F.at(a, s * (nw / 2 + 0.07)); S.box(w[0], w[1], y + 7.6, y + H - 1.2, 1.5, 0.16, F.a, glass); }
  }
  const ap = F.at(-L * 0.43, 0);
  S.kind = KIND.MASONRY;
  S.cyl(ap[0], ap[1], y, y + 11, nw * 0.46, nw * 0.46, 8, st, { cap: false });
  S.kind = KIND.TILE;
  S.cyl(ap[0], ap[1], y + 11, y + 16, nw * 0.54, 0.3, 8, roof, { cap: false });
  // two slim turrets where the transept meets the choir
  for (const s of [-1, 1]) {
    const t = F.at(-L * 0.12 - tw * 0.5 - 1.6, s * (nw / 2 + 1.8));
    S.kind = KIND.MASONRY; S.cyl(t[0], t[1], y, y + 20, 2.0, 1.8, 6, st, { cap: false });
    S.kind = KIND.TILE; S.cyl(t[0], t[1], y + 20, y + 27, 2.5, 0.1, 6, slate, { cap: false });
  }
  // the bell tower over the door: square stone base, two eight-sided stages under tiled skirts, then the spire
  const t = F.at(L * 0.43 - 4.6, 0), bw = Math.min(nw * 0.6, 10);
  S.kind = KIND.MASONRY;
  S.box(t[0], t[1], y, y + 21, bw, bw, F.a, st);
  S.kind = KIND.PLAIN;
  S.box(t[0], t[1], y + 13.5, y + 14.0, bw + 0.5, bw + 0.5, F.a, trim);
  S.hip(t[0], t[1], bw, bw, F.a, y + 21, 1.9, roof, { over: 1.5, flare: 0.45, fascia: 0.3, fasciaCol: trim });
  S.kind = KIND.MASONRY;
  S.cyl(t[0], t[1], y + 21.6, y + 30, bw * 0.42, bw * 0.4, 8, stL, { cap: false, rot: F.a + Math.PI / 8 });
  S.kind = KIND.TILE;
  S.cyl(t[0], t[1], y + 30, y + 31.6, bw * 0.58, bw * 0.36, 8, roof, { cap: false, rot: F.a + Math.PI / 8 });
  S.kind = KIND.MASONRY;
  S.cyl(t[0], t[1], y + 31.2, y + 37, bw * 0.34, bw * 0.32, 8, stL, { cap: false, rot: F.a + Math.PI / 8 });
  S.kind = KIND.TILE;
  S.cyl(t[0], t[1], y + 37, y + 38.4, bw * 0.5, bw * 0.3, 8, roof, { cap: false, rot: F.a + Math.PI / 8 });
  // 53 m to the top of the cross (docs/reference/heights.md)
  S.cyl(t[0], t[1], y + 38.2, y + 49.8, bw * 0.3, 0.12, 8, slate, { cap: false, rot: F.a + Math.PI / 8 });
  S.kind = KIND.PLAIN;
  cross(S, t[0], t[1], y + 49.4, 2.9, F);
  for (let i = 0; i < 8; i++) {
    const a = F.a + (i * Math.PI) / 4, r = bw * 0.42 * Math.cos(Math.PI / 8) + 0.05;
    S.box(t[0] + Math.cos(a) * r, t[1] + Math.sin(a) * r, y + 23.5, y + 28.5, 0.14, 1.3, a, dark);
  }
  let q = F.at(L * 0.43 - 4.6 + bw / 2 + 0.06, 0);
  S.box(q[0], q[1], y, y + 7.5, 0.14, bw * 0.42, F.a, dark);
  S.box(q[0], q[1], y + 9.5, y + 12.8, 0.14, bw * 0.3, F.a, glass);
  S.box(q[0], q[1], y + 15, y + 19.5, 0.14, bw * 0.24, F.a, dark);
  // lower towers flanking the porch
  for (const s of [-1, 1]) {
    q = F.at(L * 0.43 - 5.4, s * (bw / 2 + 2.6));
    S.kind = KIND.MASONRY; S.box(q[0], q[1], y, y + 14.5, 4.4, 4.4, F.a, st);
    S.hip(q[0], q[1], 4.4, 4.4, F.a, y + 14.5, 4.4, roof, { over: 0.9, flare: 0.4 });
    S.kind = KIND.PLAIN;
    const d = F.at(L * 0.43 - 5.4 + 2.26, s * (bw / 2 + 2.6)); S.box(d[0], d[1], y, y + 4.6, 0.14, 1.8, F.a, dark);
  }
  for (let i = 0; i < 3; i++) { q = F.at(L * 0.43 + 1.2 + i * 1.3, 0); S.box(q[0], q[1], y0 - 0.5, y0 + 0.5 - i * 0.25, 1.4, bw + 12, F.a, stone, { topKind: KIND.ROAD }); }
}

// ---- Cung An Định: Khải Tường Lâu (1917–18), its octagonal Trung Lập pavilion and the riverside gate ----
function anDinh(S, data) {
  const sp = data.special.andinh;
  if (!sp) return;
  const o = obb(unflat(sp.ring)), area = data.special.andinhArea ? unflat(data.special.andinhArea.ring) : null;
  let n = [-Math.sin(o.a), Math.cos(o.a)];
  const behind = area ? polyCentroid(area) : [o.c[0], o.c[1] - 50];
  if ((behind[0] - o.c[0]) * n[0] + (behind[1] - o.c[1]) * n[1] > 0) n = [-n[0], -n[1]]; // it faces the An Cựu river; its grounds lie behind
  const F = frame(o.c, n), L = o.w, D = o.d, y0 = ground(o.c);
  const ochre = hex('#ddb768'), ochreL = hex('#e8c984'), roof = hex('#7b5546'), gold = hex('#c9963a');
  S.base = y0 - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y0 - 0.3, y0 + 0.9, D + 2.2, L + 2.2, F.a, stone, { topKind: KIND.ROAD });
  const y = y0 + 0.9, H = 13.2;
  S.kind = KIND.CIVIC;
  S.box(o.c[0], o.c[1], y, y + H, D, L, F.a, ochre, { top: PAL.concrete[0], topKind: KIND.FLAT });
  for (const s of [-1, 1]) {
    const e = F.at(0.5, s * (L / 2 - L * 0.08));
    S.box(e[0], e[1], y, y + H + 0.4, D + 0.6, L * 0.16, F.a, ochreL, { top: PAL.concrete[0], topKind: KIND.FLAT });
  }
  const cw = L * 0.3;
  let q = F.at(D / 2 + 1.1, 0);
  S.box(q[0], q[1], y, y + H + 1.2, 2.6, cw, F.a, ochreL, { top: PAL.concrete[0], topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  // cornices at every floor, the stepped pediment, the roof balustrade
  for (const h of [4.4, 8.8, H]) S.box(o.c[0], o.c[1], y + h - 0.36, y + h, D + 0.8, L + 0.8, F.a, cream);
  for (const h of [4.4, 8.8, H + 1.2]) S.box(q[0], q[1], y + h - 0.36, y + h, 3.2, cw + 0.6, F.a, cream);
  S.box(q[0], q[1], y + H + 1.2, y + H + 2.5, 1.2, cw * 0.66, F.a, cream);
  S.box(q[0], q[1], y + H + 2.5, y + H + 3.5, 1.0, cw * 0.3, F.a, ochreL);
  for (const [a, b, da, db] of [[D / 2 - 0.2, 0, 0.3, L], [-D / 2 + 0.2, 0, 0.3, L], [0, L / 2 - 0.2, D, 0.3], [0, -L / 2 + 0.2, D, 0.3]]) { const m = F.at(a, b); S.box(m[0], m[1], y + H, y + H + 0.95, da, db, F.a, cream); }
  hipOn(S, F, o.c, D - 3.4, L - 3.4, y + H + 0.1, 2.3, roof, {});
  q = F.at(D / 2 + 2.46, 0);
  S.box(q[0], q[1], y, y + 3.5, 0.14, 2.4, F.a, dark);
  for (const s of [-1, 1]) { const d = F.at(D / 2 + 2.46, s * cw * 0.33); S.box(d[0], d[1], y, y + 3.2, 0.14, 1.6, F.a, dark); }
  // porch on columns, steps to the garden
  q = F.at(D / 2 + 4.3, 0);
  S.box(q[0], q[1], y + 4.0, y + 4.4, 3.8, cw + 1, F.a, cream, { bottom: true });
  for (const b of [-cw / 2, -cw / 6, cw / 6, cw / 2]) { const c = F.at(D / 2 + 5.8, b); S.cyl(c[0], c[1], y, y + 4.0, 0.3, 0.26, 8, cream, { cap: false }); }
  for (let i = 0; i < 3; i++) { q = F.at(D / 2 + 6.9 + i * 0.9, 0); S.box(q[0], q[1], y0 - 0.3, y - i * 0.3, 1.0, cw + 2, F.a, stone, { topKind: KIND.ROAD }); }

  // distance from the palace to the edge of its ground, along the axis
  let reach = D / 2 + 40;
  if (area) for (let t = D / 2 + 8; t < 120; t += 1) { const p = F.at(t, 0); if (!inRing(p[0], p[1], area)) { reach = Math.max(D / 2 + 26, t - 2.5); break; } }
  // Trung Lập pavilion
  const tp = F.at(D / 2 + (reach - D / 2) * 0.52, 0);
  S.base = 0;
  S.kind = KIND.MASONRY;
  S.cyl(tp[0], tp[1], y0 - 0.2, y0 + 0.9, 5.6, 5.4, 8, stone, { rot: F.a + Math.PI / 8 });
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 8; i++) { const a = F.a + Math.PI / 8 + (i * Math.PI) / 4; S.cyl(tp[0] + Math.cos(a) * 3.9, tp[1] + Math.sin(a) * 3.9, y0 + 0.9, y0 + 4.5, 0.24, 0.22, 6, hex('#b5462f'), { cap: false }); }
  S.kind = KIND.GLAZED;
  S.cyl(tp[0], tp[1], y0 + 4.5, y0 + 6.3, 5.7, 2.0, 8, gold, { cap: false, rot: F.a + Math.PI / 8 });
  S.cyl(tp[0], tp[1], y0 + 6.2, y0 + 7.9, 2.3, 0.2, 8, gold, { cap: false, rot: F.a + Math.PI / 8 });
  S.kind = KIND.PLAIN;
  S.cyl(tp[0], tp[1], y0 + 7.8, y0 + 8.7, 0.22, 0.05, 5, cream);
  // the gate: two storeys, three arches, a crest of finials
  const g = F.at(reach, 0);
  S.kind = KIND.PLAIN;
  S.box(g[0], g[1], y0 - 0.2, y0 + 6.6, 1.9, 13.5, F.a, ochreL);
  S.box(g[0], g[1], y0 + 6.6, y0 + 10.2, 1.7, 7.2, F.a, ochre);
  S.box(g[0], g[1], y0 + 6.3, y0 + 6.7, 2.4, 14.1, F.a, cream);
  S.box(g[0], g[1], y0 + 10.0, y0 + 10.4, 2.2, 7.8, F.a, cream);
  S.box(g[0], g[1], y0 + 10.4, y0 + 11.6, 1.2, 3.0, F.a, cream);
  for (const b of [-6.5, -3.7, 3.7, 6.5]) { const c = F.at(reach, b); S.cyl(c[0], c[1], y0 + (Math.abs(b) > 5 ? 6.7 : 10.4), y0 + (Math.abs(b) > 5 ? 8.8 : 12.2), 0.34, 0.06, 6, cream); }
  for (const s of [-1, 1]) for (const [b, w, h] of [[0, 2.9, 4.8], [-4.4, 1.9, 3.7], [4.4, 1.9, 3.7]]) { const d = F.at(reach + s * 0.98, b); S.box(d[0], d[1], y0, y0 + h, 0.14, w, F.a, dark); }
}

// ---- Chùa Diệu Đế: the main hall, and on the canal side the triple gate under its tower, between bell and drum towers ----
function dieuDe(S, data) {
  const yellow = hex('#e3c377'), tile = hex('#a9523a'), ridge = hex('#e8dcc0');
  const sp = data.special.dieude;
  if (sp) {
    // Đại Giác hall: about 9 m to the ridge (docs/reference/heights.md, estimated; no source gives a figure)
    const o = obb(unflat(sp.ring));
    S.base = 0;
    pavilion(S, o.c[0], o.c[1], o.w * 0.92, o.d * 0.84, o.a, LAND_Y, { tiers: 2, wallH: 3.2, roof: tile, wall: yellow, over: 1.5, rh: 2.6, platform: 0.8, ridge });
  }
  const gp = data.special.dieudeGate;
  if (gp) {
    const o = obb(unflat(gp.ring)), u = [Math.cos(o.a), Math.sin(o.a)], y0 = LAND_Y;
    const at = (b) => [o.c[0] + u[0] * b, o.c[1] + u[1] * b];
    S.kind = KIND.PLAIN;
    S.box(o.c[0], o.c[1], y0, y0 + 5.4, o.w * 0.46, 2.0, o.a, yellow, { top: stone });
    S.box(o.c[0], o.c[1], y0 + 5.0, y0 + 5.5, o.w * 0.46 + 0.5, 2.5, o.a, ridge);
    for (const s of [-1, 1]) for (const [b, w, h] of [[0, 3.0, 4.2], [-o.w * 0.14, 2.0, 3.3], [o.w * 0.14, 2.0, 3.3]]) { const d = at(b); S.box(d[0] - u[1] * s * 1.02, d[1] + u[0] * s * 1.02, y0, y0 + h, w, 0.14, o.a, dark); }
    pavilion(S, o.c[0], o.c[1], 7.4, 4.6, o.a, y0 + 5.5, { tiers: 2, wallH: 2.6, roof: tile, wall: yellow, over: 1.1, rh: 2.0, ridge });
    for (const s of [-1, 1]) { const t = at(s * o.w * 0.38); pavilion(S, t[0], t[1], Math.min(6.5, o.d * 0.8), Math.min(6.5, o.d * 0.8), o.a, y0, { tiers: 2, wallH: 3.2, roof: tile, wall: yellow, over: 1.1, rh: 2.2, platform: 0.8, ridge }); }
  }
}

// ---- Hiển Lâm Các, three storeys of timber, and before it the nine dynastic urns facing Thế Miếu ----
function hienLam(S, data) {
  const sp = data.special.hienlam;
  if (!sp) return;
  const o = obb(unflat(sp.ring)), y0 = LAND_Y;
  const eave = { fascia: 0.3, fasciaCol: shade(PAL.lacquer, 0.75), hips: true, glazed: true, ridgeCol: hex('#f1d77a') };
  S.base = 0;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y0, y0 + 1.4, o.w + 4, o.d + 4, o.a, stone, { taper: 0.97, topKind: KIND.ROAD });
  let y = y0 + 1.4;
  const tiers = [[0.94, 0.82, 4.3, 1.5], [0.62, 0.58, 3.3, 1.3], [0.34, 0.42, 2.8, 1.1]];
  tiers.forEach(([kw, kd, h, over], i) => {
    const w = o.w * kw, d = o.d * kd, last = i === tiers.length - 1;
    S.kind = KIND.TIMBER;
    S.box(o.c[0], o.c[1], y, y + h, w, d, o.a, PAL.lacquer, { top: shade(PAL.imperialRoof, 0.8) });
    S.hip(o.c[0], o.c[1], w, d, o.a, y + h, last ? 3.0 : 1.5, PAL.imperialRoof, { flare: 0.5, over, ...eave, ridgeCol: last ? eave.ridgeCol : null, hips: true });
    y += h + (last ? 3.0 : 0.75);
  });
  S.kind = KIND.PLAIN;
  S.cyl(o.c[0], o.c[1], y, y + 1.2, 0.3, 0.05, 6, hex('#f1d77a'));
  // Cửu Đỉnh
  const tm = data.places.find((p) => p.id === 'themieu');
  let n = [-Math.sin(o.a), Math.cos(o.a)];
  if (tm && (tm.x / 10 - o.c[0]) * n[0] + (tm.z / 10 - o.c[1]) * n[1] < 0) n = [-n[0], -n[1]];
  const F = frame(o.c, n), bronze = hex('#56594a');
  for (let i = 0; i < 9; i++) {
    const p = F.at(o.d / 2 + 9 + (i === 4 ? 3 : 0), (i - 4) * ((o.w * 1.25) / 8)), s = i === 4 ? 1.15 : 1;
    S.kind = KIND.MASONRY; S.box(p[0], p[1], y0, y0 + 0.5, 2.0 * s, 2.0 * s, F.a, stone);
    S.kind = KIND.PLAIN;
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) S.cyl(p[0] + dx * 0.5 * s, p[1] + dz * 0.5 * s, y0 + 0.5, y0 + 1.0, 0.14, 0.18, 5, bronze, { cap: false });
    S.cyl(p[0], p[1], y0 + 0.95, y0 + 2.7 * s, 0.82 * s, 1.02 * s, 10, bronze);
    S.cyl(p[0], p[1], y0 + 2.7 * s, y0 + 2.86 * s, 1.14 * s, 1.14 * s, 10, shade(bronze, 1.2));
    for (const k of [-1, 1]) S.box(p[0] + F.p[0] * k * 0.95 * s, p[1] + F.p[1] * k * 0.95 * s, y0 + 2.86 * s, y0 + 3.4 * s, 0.2, 0.22, F.a, bronze);
  }
}

// ---- Vincom Plaza: a glass slab on a shopping podium, the one tower on the south bank ----
function vincom(S, data) {
  const sp = data.special.vincom;
  if (!sp) return;
  const ring = unflat(sp.ring), o = obb(ring), c = polyCentroid(ring), y0 = ground(c);
  const pod = hex('#dedbd3'), glass = hex('#7d9fb8'), band = hex('#eef1f2');
  S.base = y0 - LAND_Y;
  S.kind = KIND.CIVIC;
  S.prism(ring, y0 - 0.3, y0 + 23, pod, PAL.concrete[1], { topKind: KIND.FLAT, parapet: 1.1 });
  const tw = Math.min(o.w * 0.56, 46), td = Math.min(o.d * 0.5, 25), top = y0 + 150;
  S.box(c[0], c[1], y0 + 23, top, tw, td, o.a, glass, { top: PAL.concrete[2], topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  for (let y = y0 + 26.6; y < top - 2; y += 7.5) S.box(c[0], c[1], y, y + 0.42, tw + 0.36, td + 0.36, o.a, band);
  const u = [Math.cos(o.a), Math.sin(o.a)];
  for (const s of [-1, 1]) for (const k of [-1, 1]) S.box(c[0] + u[0] * s * (tw / 2 - 0.5) - u[1] * k * (td / 2 - 0.5), c[1] + u[1] * s * (tw / 2 - 0.5) + u[0] * k * (td / 2 - 0.5), y0 + 23, top + 1.2, 1.5, 1.5, o.a, band);
  S.box(c[0], c[1], top, top + 1.4, tw + 0.5, td + 0.5, o.a, band);
  S.box(c[0], c[1], top + 1.4, top + 6.5, tw * 0.5, td * 0.6, o.a, hex('#c9cdd0'));
  S.cyl(c[0], c[1], top + 6.5, top + 14, 0.3, 0.06, 5, hex('#d8dadb'));
}

// ---- Lầu Tứ Phương Vô Sự on the north bastion of the Imperial City ----
function tuPhuong(S, data) {
  const sp = data.special.tuphuong;
  if (!sp) return;
  const o = obb(unflat(sp.ring));
  S.base = 0;
  pavilion(S, o.c[0], o.c[1], o.w * 0.72, o.d * 0.72, o.a, LAND_Y, { tiers: 2, wallH: 3.2, roof: PAL.imperialRoof, wall: hex('#ead9b4'), over: 1.2, rh: 2.4, platform: 4.6 });
}

export function buildCivic(data, S) {
  if (!data.special) return;
  // with the first era each stands in: 0 Nguyễn, 1 French period, 2 today (the churches as they stand are 1960s)
  for (const [fn, since] of [[station, 1], [phuCam, 2], [redemptorist, 2], [anDinh, 1], [dieuDe, 0], [hienLam, 0], [vincom, 2], [tuPhuong, 1]]) {
    S.span = span(since);
    fn(S, data);
    S.kind = KIND.PLAIN; S.base = 0; S.span = 0;
  }
}
