import { KIND, Buf, hex, shade, unflat, obb, ringCentre, signedArea, inRing } from '../geo/buf.js';
import { LAND_Y, PAL } from '../config.js';
import { rise } from '../geo/terrain.js';
import { pavilion } from './citadel.js';
import { fence, yard, roadsNear, buildingsNear, leaves, lamp, strips, flushLamps, FENCE } from './enclosure.js';
import { replaced } from './places/index.js';

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
// a cross outlined in light (today's floodlit crosses on the church towers)
function litCross(L, x, z, y, h, F) {
  const W = [1, 1, 1], w = h * 0.3;
  L.beam([x, y, z], [x, y + h, z], 0.34, 0.34, W);
  L.beam([x - F.p[0] * w, y + h * 0.68, z - F.p[1] * w], [x + F.p[0] * w, y + h * 0.68, z + F.p[1] * w], 0.32, 0.32, W);
}
// a fenced yard round a building, with its gate on the front axis (frame F, front toward +f): iron leaves between
// the gate piers, lamps on the piers after dark
function yardFence(S, data, F, box, core, st, { gateHalf = 3.5, lampCol = [1, 0.85, 0.6], gateLamps = 2, lampEvery = 0 } = {}) {
  const roads = roadsNear(data, F.c, 160);
  const blds = buildingsNear(data, F.c, 120);
  const Y = yard(F, roads, box[0], box[1], box[2], box[3], core[0], core[1], core[2], core[3], blds);
  const g = F.at(Y.a1, 0);
  fence(S, Y.ring, st, { roads, openings: [[g[0], g[1], gateHalf]], solid: blds, lampEvery, lampCol });
  const p = F.at(Y.a1, -gateHalf), q = F.at(Y.a1, gateHalf), y = ground(g);
  leaves(S, p, q, y, st.h + 0.3, st.iron || dark);
  for (const e of [p, q]) for (let k = 0; k < gateLamps; k++) lamp(e[0], ground(e) + st.h + st.pierUp + 0.9, e[1], lampCol, 4);
  return Y;
}

// ---- Ga Huế (1908): the long pink colonial station, a tall middle pavilion between two wings ----
function station(S, data) {
  if (replaced('gahue')) return; // drawn by places/gahue.js
  const sp = data.special.gahue;
  if (!sp) return;
  const o = obb(unflat(sp.ring));
  let n = [-Math.sin(o.a), Math.cos(o.a)], best = null, bd = Infinity;
  for (const r of data.rails || []) { const pts = unflat(r[2]); for (const q of pts) { const d = Math.hypot(q[0] - o.c[0], q[1] - o.c[1]); if (d < bd) { bd = d; best = q; } } }
  if (best && (o.c[0] - best[0]) * n[0] + (o.c[1] - best[1]) * n[1] < 0) n = [-n[0], -n[1]]; // the front looks away from the tracks
  const F = frame(o.c, n), L = o.w, D = Math.max(o.d * 0.8, 9), y0 = ground(o.c);
  const pink = hex('#d0796d'), tile = hex('#9a4a36'); // painted the pink of Quốc Học (VnExpress), red-brown tiles
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
  // white pilasters between the bays of the wings, tall arched windows (drawn as dark bays) between them
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) {
    const nB = Math.max(3, Math.round((L / 2 - cw / 2 - L * 0.14) / 4.2));
    for (let i = 0; i <= nB; i++) {
      const b = cw / 2 + ((L / 2 - L * 0.14 - cw / 2) * i) / nB;
      for (const side of [-1, 1]) {
        const q = F.at(side * (D / 2 + 0.08), s * b);
        S.box(q[0], q[1], y, y + 5.9, 0.16, 0.55, F.a, cream);
        if (i < nB) { const w = F.at(side * (D / 2 + 0.06), s * (b + (L / 2 - L * 0.14 - cw / 2) / nB / 2)); S.box(w[0], w[1], y + 0.9, y + 4.4, 0.14, 1.5, F.a, dark); }
      }
    }
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
  // the forecourt toward Bùi Thị Xuân: a knee-high railing on three sides, open where the streets come in and at the
  // middle (the square itself stays open to the street)
  const roads = roadsNear(data, F.at(D / 2 + 20, 0), 120);
  const front = D / 2 + 1.8 + 4.2;
  const Y = yard(F, roads, front, D / 2 + 42, -(L / 2 + 6), L / 2 + 6, front, D / 2 + 16, -(cw / 2 + 6), cw / 2 + 6, buildingsNear(data, o.c, 120));
  if (Y.a1 - front > 8) {
    const g = F.at(Y.a1, 0);
    fence(S, [F.at(front, Y.b0), F.at(Y.a1, Y.b0), F.at(Y.a1, Y.b1), F.at(front, Y.b1)], FENCE.station, { closed: false, roads, openings: [[g[0], g[1], 7]], solid: buildingsNear(data, o.c, 120) });
  }
  // after dark: the clock face, lamps under the canopy, the doors warm
  S.base = 0;
  for (const s of [-1, 1]) { const q = F.at(s * (D / 2 + 1.9), 0); lamp(q[0], y + 10.95, q[1], [1, 0.97, 0.85], 6); }
  for (let b = -cw / 2 - 2; b <= cw / 2 + 2.01; b += (cw + 4) / 4) { const q = F.at(D / 2 + 4.2, b); lamp(q[0], y + 3.7, q[1], [1, 0.82, 0.5], 4); }
  const LB = new Buf(64);
  for (const b of [-cw * 0.3, 0, cw * 0.3]) { const q = F.at(D / 2 + 1.82, b); LB.box(q[0], q[1], y + 0.2, y + 3.9, 0.06, cw * 0.15, F.a, [1, 1, 1]); }
  strips(LB, 0xffc982, 0.9);
}

// ---- Nhà thờ Phủ Cam (Ngô Viết Thụ, begun 1963): a concrete cross plan, ribs rising up the nave, twin towers ----
function phuCam(S, data) {
  const sp = data.special.phucam;
  if (!sp) return;
  const ring = unflat(sp.ring), o = obb(ring), pc = polyCentroid(ring);
  let f = [Math.cos(o.a), Math.sin(o.a)];
  if ((pc[0] - o.c[0]) * f[0] + (pc[1] - o.c[1]) * f[1] > 0) f = [-f[0], -f[1]]; // transept and apse weigh toward the back
  const F = frame(o.c, f), L = o.w, W = o.d, nw = Math.min(W * 0.5, 22), y0 = ground(o.c);
  const conc = hex('#e0dcd2'), rib = hex('#c4c0b6'), roof = hex('#4f565f'), glass = hex('#34465c');
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
  // the church yard on its hill: a rendered wall with railings, the gate on the axis at the foot of the forecourt
  const hw = Math.max(W / 2, nw / 2 + 9);
  yardFence(S, data, F, [-L / 2 - 10, L / 2 + 30, -hw - 12, hw + 12], [-L / 2 - 1, fa + 11, -hw - 1, hw + 1], FENCE.church, { gateHalf: 4 });
  // after dark: the three crosses lit white, the rose window and the portal glowing
  const LB = new Buf(96);
  q = F.at(fa + 0.5, 0);
  litCross(LB, q[0] + F.f[0] * 0.85, q[1] + F.f[1] * 0.85, y + 25.5, 4.2, F);
  for (const s of [-1, 1]) { const t = F.at(fa - 0.6, s * (nw / 2 + 3.4)); litCross(LB, t[0], t[1], y + 39.9, 3.0, F); }
  strips(LB, 0xf4f1ff, 1.5);
  q = F.at(fa + 1.45, 0);
  lamp(q[0], y + 16, q[1], [0.95, 0.8, 0.55], 7);
  lamp(q[0], y + 5, q[1], [1, 0.8, 0.5], 6);
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
  // the yard on Nguyễn Huệ: a wall with railings, the gate in line with the tower
  const hw = Math.max(W / 2, nw / 2 + 8);
  yardFence(S, data, F, [-L / 2 - 10, L / 2 + 24, -hw - 10, hw + 10], [-L / 2 - 1, L / 2 + 6, -hw - 1, hw + 1], FENCE.church, { gateHalf: 3.6 });
  // after dark: the spire lit from below (a line up each of its eight arrises would be too much: four), the cross white
  const LB = new Buf(96);
  litCross(LB, t[0], t[1], y + 49.4, 2.9, F);
  for (let i = 0; i < 4; i++) {
    const a = F.a + Math.PI / 8 + (i * Math.PI) / 2, r0 = bw * 0.3 + 0.08;
    LB.beam([t[0] + Math.cos(a) * r0, y + 38.4, t[1] + Math.sin(a) * r0], [t[0] + Math.cos(a) * 0.2, y + 49.4, t[1] + Math.sin(a) * 0.2], 0.12, 0.12, [1, 1, 1]);
  }
  strips(LB, 0xf4f1ff, 1.3);
  for (const k of [-1, 1]) for (const j of [-1, 1]) { const l = F.at(L * 0.43 - 4.6 + k * (bw / 2 + 2), j * (bw / 2 + 2)); lamp(l[0], y0 + 1.0, l[1], [1, 0.9, 0.7], 5); } // floodlights at the tower's feet
  q = F.at(L * 0.43 - 4.6 + bw / 2 + 0.2, 0);
  lamp(q[0], y + 11.2, q[1], [0.9, 0.75, 0.55], 5);
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
  if (area) for (let t = D / 2 + 8; t < 120; t += 0.5) { const p = F.at(t, 0); if (!inRing(p[0], p[1], area)) { reach = Math.max(D / 2 + 26, t - 0.6); break; } }
  // Trung Lập pavilion
  const tp = F.at(D / 2 + (reach - D / 2) * 0.52, 0);
  S.base = y0 - LAND_Y; // the pavilion and gate stand on the palace's raised ground, so the shader's foot darkening starts there
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
  // the gate's porcelain-mosaic panels and the two dragon-crested end piers
  const mosaic = hex('#5f8f86'), red = hex('#b5462f');
  for (const s of [-1, 1]) {
    for (const b of [-2.2, 2.2]) { const d = F.at(reach + s * 0.9, b); S.box(d[0], d[1], y0 + 7.2, y0 + 9.6, 0.14, 1.3, F.a, mosaic); }
    const d = F.at(reach + s * 0.9, 0); S.box(d[0], d[1], y0 + 5.2, y0 + 6.1, 0.14, 2.6, F.a, red); // the name board
    const e = F.at(reach, s * 7.5);
    S.box(e[0], e[1], y0 - 0.2, y0 + 7.8, 1.5, 1.5, F.a, ochre, { top: cream });
    S.box(e[0], e[1], y0 + 7.8, y0 + 8.2, 1.9, 1.9, F.a, cream);
    S.cyl(e[0], e[1], y0 + 8.2, y0 + 9.4, 0.5, 0.08, 6, gold);
  }
  // the wall round the grounds: ochre, cream-capped piers, railing panels; it opens at the gate and the lanes
  if (area) {
    const roads = roadsNear(data, polyCentroid(area), 200);
    fence(S, area, FENCE.andinh, { roads, openings: [[g[0], g[1], 8.3]], solid: buildingsNear(data, polyCentroid(area), 150) });
  }
  // after dark (today): the gate washed in warm light, lamps on its piers, the palace front floodlit from the garden
  const LB = new Buf(64), W = [1, 1, 1];
  for (const s of [-1, 1]) {
    const a = F.at(reach + s * 1.3, -6.9), b = F.at(reach + s * 1.3, 6.9);
    LB.beam([a[0], y0 + 6.45, a[1]], [b[0], y0 + 6.45, b[1]], 0.14, 0.14, W);
    const a2 = F.at(reach + s * 1.2, -3.8), b2 = F.at(reach + s * 1.2, 3.8);
    LB.beam([a2[0], y0 + 10.2, a2[1]], [b2[0], y0 + 10.2, b2[1]], 0.12, 0.12, W);
    const e = F.at(reach, s * 7.5); lamp(e[0], y0 + 9.8, e[1], [1, 0.82, 0.5], 4);
  }
  strips(LB, 0xffcf8a, 1.2);
  for (let b = -L / 2 + 2; b <= L / 2 - 1.99; b += (L - 4) / 5) { const q = F.at(D / 2 + 9, b); lamp(q[0], y0 + 0.6, q[1], [1, 0.86, 0.62], 6); }
}

// ---- Chùa Diệu Đế: the main hall, and on the canal side the triple gate under its tower, between bell and drum towers ----
function dieuDe(S, data) {
  const yellow = hex('#e3c377'), tile = hex('#a9523a'), ridge = hex('#e8dcc0'), lacq = hex('#a33a2a');
  const sp = data.special.dieude;
  let hall = null;
  if (sp) {
    // Đại Giác hall: about 9 m to the ridge (docs/reference/heights.md, estimated; no source gives a figure)
    const o = obb(unflat(sp.ring)), y0 = ground(o.c);
    hall = o;
    S.base = y0 - LAND_Y;
    pavilion(S, o.c[0], o.c[1], o.w * 0.92, o.d * 0.84, o.a, y0, { tiers: 2, wallH: 3.2, roof: tile, wall: yellow, over: 1.5, rh: 2.6, platform: 0.8, ridge });
  }
  const gp = data.special.dieudeGate;
  if (!gp) return;
  // the gate on Bạch Đằng, facing the Đông Ba canal: a two-storey gate tower over three openings, joined by short
  // walls to the bell tower and the drum tower at its ends (all within the mapped outline)
  const o = obb(unflat(gp.ring)), u = [Math.cos(o.a), Math.sin(o.a)], y0 = ground(o.c);
  let n = [-u[1], u[0]];
  if (hall && (hall.c[0] - o.c[0]) * n[0] + (hall.c[1] - o.c[1]) * n[1] > 0) n = [-n[0], -n[1]]; // front looks away from the hall
  const F = frame(o.c, n), at = (b, a = 0) => F.at(a, b);
  S.base = y0 - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y0 - 0.3, y0 + 0.3, 3.4, o.w * 0.5, F.a, stone, { topKind: KIND.ROAD });
  const y1 = y0 + 0.3;
  S.kind = KIND.CIVIC;
  S.box(o.c[0], o.c[1], y1, y1 + 5.1, 2.0, o.w * 0.46, F.a, yellow, { top: stone });
  S.kind = KIND.PLAIN;
  S.box(o.c[0], o.c[1], y1 + 4.7, y1 + 5.2, 2.5, o.w * 0.46 + 0.5, F.a, ridge);
  for (const s of [-1, 1]) for (const [b, w, h] of [[0, 3.0, 3.9], [-o.w * 0.14, 2.0, 3.0], [o.w * 0.14, 2.0, 3.0]]) { const d = at(b, s * 1.02); S.box(d[0], d[1], y1, y1 + h, 0.14, w, F.a, dark); }
  // lacquered columns of the gate front and the name board over the middle opening
  for (const b of [-o.w * 0.21, -o.w * 0.07, o.w * 0.07, o.w * 0.21]) { const d = at(b, 1.15); S.box(d[0], d[1], y1, y1 + 4.7, 0.4, 0.4, F.a, lacq); }
  { const d = at(0, 1.1); S.box(d[0], d[1], y1 + 4.0, y1 + 4.6, 0.12, 2.6, F.a, hex('#3b2a1e')); }
  S.kind = KIND.PLAIN;
  // single small roofs over the side openings, the gate tower over the middle
  for (const s of [-1, 1]) { const d = at(s * o.w * 0.14); S.hip(d[0], d[1], o.w * 0.14, 2.6, F.a + Math.PI / 2, y1 + 5.2, 0.9, tile, { flare: 0.4, over: 0.6, fascia: 0.16, fasciaCol: ridge, ridgeCol: ridge, hips: true }); }
  pavilion(S, o.c[0], o.c[1], 7.4, 4.6, F.a + Math.PI / 2, y1 + 5.2, { tiers: 2, wallH: 2.6, roof: tile, wall: yellow, over: 1.1, rh: 2.0, ridge });
  for (const s of [-1, 1]) { const t = at(s * o.w * 0.38); const tw = Math.min(6.5, o.d * 0.8); pavilion(S, t[0], t[1], tw, tw, F.a, ground(t), { tiers: 2, wallH: 3.2, roof: tile, wall: yellow, over: 1.1, rh: 2.2, platform: 0.8, ridge }); }
  S.kind = KIND.PLAIN;
  // the pagoda's wall: back from the gate line round the hall, yellow under a tile coping
  const roads = roadsNear(data, o.c, 160);
  let back = -40, side = o.w / 2 + 6;
  if (hall) {
    const hc = [hall.c[0] - o.c[0], hall.c[1] - o.c[1]], ha = hc[0] * F.f[0] + hc[1] * F.f[1], hb = hc[0] * F.p[0] + hc[1] * F.p[1];
    const ext = Math.max(hall.w, hall.d) / 2 + 3;
    back = Math.min(back, ha - ext - 14);
    side = Math.max(side, Math.abs(hb) + ext + 8);
  }
  const Y = yard(F, roads, back, 0, -side, side, back + 20, 0, -o.w / 2 - 1, o.w / 2 + 1, buildingsNear(data, o.c, 100));
  fence(S, Y.ring, FENCE.pagoda, { roads, openings: [[o.c[0], o.c[1], o.w * 0.5 + 0.5]], solid: buildingsNear(data, o.c, 100) });
  // lanterns: red silk lanterns under the gate's eaves, and the hall's eaves lit
  for (const b of [-o.w * 0.21, -o.w * 0.07, o.w * 0.07, o.w * 0.21]) { const d = at(b, 1.5); lamp(d[0], y1 + 4.3, d[1], [1, 0.42, 0.22], 3.5); }
  for (const s of [-1, 1]) { const t = at(s * o.w * 0.38, 3.6); lamp(t[0], y1 + 3.3, t[1], [1, 0.45, 0.25], 3.2); }
  if (hall) {
    const hy = ground(hall.c) + 1.0 + 4.2, hu = [Math.cos(hall.a), Math.sin(hall.a)], hv = [-hu[1], hu[0]];
    for (let i = -3; i <= 3; i++) for (const k of [-1, 1]) {
      const x = hall.c[0] + hu[0] * i * hall.w * 0.15 + hv[0] * k * (hall.d * 0.42 + 1.3), z = hall.c[1] + hu[1] * i * hall.w * 0.15 + hv[1] * k * (hall.d * 0.42 + 1.3);
      lamp(x, hy - 0.4, z, [1, 0.5, 0.26], 3);
    }
  }
}

// The walls of the Thế Miếu and Hưng Miếu compounds (OSM barrier=wall ways 695810851, 695810804 and the dividing
// line 695810842), not in hue.json: copied here in decimetres; `data.special.themieuWalls` (a list of
// { ring, closed }) wins when exported. Nothing else draws them (data.iwalls carries only barrier=city_wall).
const TM_WALLS = [
  [true, [-12468, 2632, -12924, 2971, -13127, 2701, -13546, 2143, -13868, 1716, -13569, 1494, -13160, 1191, -12875, 979, -12553, 1407, -12137, 1960, -11934, 2230, -12384, 2564]],
  [false, [-13352, 1999, -13251, 1923, -12835, 1615, -12728, 1536]],
  [true, [-13395, 1218, -12938, 881, -13064, 712, -13372, 298, -13613, 474, -14373, 1032, -13934, 1622, -13499, 1295]],
];
// (its own entry in buildCivic, so it does not hang on Hiển Lâm Các; the Thế Miếu wall and the dividing line are
// drawn by places/themieu.js once that is built)
function templeWalls(S, data, c = [-1300, 180]) {
  const list = Array.isArray(data.special.themieuWalls) ? data.special.themieuWalls.map((w) => [w.closed !== false, w.ring]) : TM_WALLS;
  const roads = roadsNear(data, c, 220), solid = buildingsNear(data, c, 200);
  list.forEach(([closed, flat], i) => { if (!(i < 2 && replaced('themieu'))) fence(S, unflat(flat), FENCE.imperial, { closed, roads, solid }); });
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
  const tm = (data.places || []).find((p) => p.id === 'themieu');
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
  // after dark: the crown band and the four corner lines lit, a red light on the mast
  const LB = new Buf(64), W = [1, 1, 1];
  const corner = (s, k, y) => [c[0] + u[0] * s * (tw / 2 + 0.3) - u[1] * k * (td / 2 + 0.3), y, c[1] + u[1] * s * (tw / 2 + 0.3) + u[0] * k * (td / 2 + 0.3)];
  for (const [s, k, s2, k2] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) LB.beam(corner(s, k, top + 0.8), corner(s2, k2, top + 0.8), 0.25, 0.25, W);
  for (const s of [-1, 1]) for (const k of [-1, 1]) LB.beam(corner(s, k, y0 + 24), corner(s, k, top + 0.6), 0.16, 0.16, W);
  strips(LB, 0xcfe6ff, 1.3);
  lamp(c[0], top + 14.2, c[1], [1, 0.15, 0.1], 5);
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
  for (const fn of [station, phuCam, redemptorist, anDinh, dieuDe, templeWalls, hienLam, vincom, tuPhuong]) {
    const n0 = S.n; // a place that throws is dropped whole (the buffer rolled back) and the rest still load
    try { fn(S, data); } catch (e) { S.n = n0; console.warn('civic:', fn.name, e); }
    S.kind = KIND.PLAIN; S.base = 0;
  }
  flushLamps();
}
