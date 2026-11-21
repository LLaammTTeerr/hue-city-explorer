import * as THREE from 'three';
import { KIND, Buf, hex, shade, rand, pick } from '../../geo/buf.js';
import { LAND_Y, ROAD_W } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';

// Phố Tây, Huế's backpackers' quarter in phường Phú Hội on the south bank: the three streets Võ Thị Sáu, Phạm Ngũ Lão
// and Chu Văn An, which close to traffic for the walking street on Friday to Sunday evenings (18:00 to 02:00; opened
// 29 September 2017). See docs/places/photay.md.
//
// There is no single building here: the place is the street scene. The houses stay the city's generic infill and
// mapped buildings; this model dresses their street fronts and the street itself:
//   shopfronts  every house facing one of the three streets gets an open ground floor (a dark shop interior that
//               glows warm after dark), a coloured sign board with a band of lettering over it, on the taller houses
//               a vertical blade sign, and where the city gave it none, a striped canvas awning
//   bars        about half the fronts are bars and eateries: low tables ringed with red and blue plastic stools on
//               the pavement, silk lanterns and a line of bulbs along the awning, lit signs at night
//   street      terrazzo pavements in red and grey squares on both sides, the paved lane off Chu Văn An (OSM way
//               39419045, paving_stones, 3 m), and strings of coloured bulbs slung across the carriageway between
//               the kerbside poles
// Street centrelines: OSM ways 39416766 (Võ Thị Sáu), 39419092 (Phạm Ngũ Lão), 39413149 (Chu Văn An), in model
// metres (scripts/frame.json). The carriageways stay asphalt, as OSM tags them; on walking-street nights the
// tables spill onto them, which a still model cannot show.

export const id = 'photay';

const R = 165; // reach from the place's centre: the triangle of the three streets, to Lê Lợi on the river side
const STREETS = {
  vts: { bar: 0.6, pts: [[804.6, -309.4], [802.8, -298.5], [793.6, -268.5], [786, -243.6], [780.8, -226.8], [769.3, -187.5], [768.2, -183.3], [763.1, -164.1], [760.5, -154.9], [758.9, -149.6], [750.6, -119.2], [743.2, -90.7], [739.5, -75.6], [734.4, -55.1], [726.8, -31.8], [716.3, -16.4], [702.2, -3.6], [665.9, 33.9], [632.6, 65.7], [617.4, 80.5], [591.4, 105.3]] },
  pnl: { bar: 0.65, pts: [[665.9, 33.9], [556.8, -100.4], [547.8, -110.9], [537.3, -123.6], [530.1, -131.9]] },
  cva: { bar: 0.45, pts: [[826.8, 69.4], [815.3, 48.3], [776.3, 0.4], [762.6, -16.1], [745.1, -40.4], [734.4, -55.1], [730.6, -59.9], [720.9, -71.7], [718.9, -74.1], [677.4, -124.9], [662.2, -143.5], [655.2, -152.1], [619.2, -197.1], [611.8, -207.1]] },
};
const LANE = [[796.1, -51.8], [790.2, -11], [776.3, 0.4]]; // Chu Văn An's paved branch
const HALF = ROAD_W[3] / 2; // the three are residential streets (class 3)

const C = {
  shop: hex('#2b2522'), shopLit: hex('#4a3a2c'), pole: hex('#3c3a38'), wire: hex('#2a2a2a'),
  tileR: hex('#a87a6c'), tileG: hex('#bdb6aa'), lane: hex('#9d968a'),
  lantern: hex('#c8352a'), lanternY: hex('#d9a236'), table: hex('#d8d4cc'), tableS: hex('#8e9aa3'),
};
const SIGNS = ['#c62f2a', '#1f5fa8', '#e1b52d', '#2f7d4a', '#1d1d1f', '#e7e2d6', '#7a2f6b', '#d8662a', '#1f8a8a'].map(hex);
const INK = ['#f4f1e8', '#f4f1e8', '#1d1d1f', '#f4f1e8', '#e1b52d', '#c62f2a', '#f4f1e8', '#f4f1e8', '#f4f1e8'].map(hex); // lettering against each sign
const GLOW = [0xff4a3a, 0x58a8ff, 0xffd060, 0x60ff98, 0xfff2d0, 0xffe8b0, 0xff70d8, 0xffa040, 0x60fff0]; // the sign's light at night
const CANVAS = ['#b8322b', '#2b5f8a', '#2f7046', '#c99a2e', '#7c2c3a', '#3b3b3b'].map(hex);
const STOOLS = ['#c8352a', '#c8352a', '#2f62b0', '#d9a236', '#2f62b0'].map(hex);
const BULBS = [[1, 0.78, 0.42], [1, 0.3, 0.22], [0.35, 1, 0.45], [0.35, 0.6, 1], [1, 0.85, 0.3]];

// nearest point of a polyline: distance, the point, the unit tangent there
function nearest(pts, x, z) {
  let best = null;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const s = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
    const px = a[0] + dx * s, pz = a[1] + dz * s, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) { const L = Math.sqrt(L2); best = { d, p: [px, pz], t: [dx / L, dz / L] }; }
  }
  return best;
}

export function build({ data, S, group, place }) {
  const cx = place ? place.x : 673.2, cz = place ? place.z : -89.6;
  const inside = (x, z) => Math.hypot(x - cx, z - cz) < R;
  const n0 = S.n;
  S.kind = KIND.PLAIN;
  S.base = 0;
  const L = { warm: [], sign: GLOW.map(() => []) }; // night light boxes: [cx, cz, y0, y1, sx, sz, ang]
  const gp = [], gc = []; // glow points: bulbs and lanterns

  // the street a point fronts: which street, how far from its centreline, the point on it, the tangent
  const streetOf = (x, z) => {
    let best = null;
    for (const [k, s] of Object.entries(STREETS)) { const r = nearest(s.pts, x, z); if (!best || r.d < best.d) best = { ...r, k }; }
    return best;
  };
  // the other roads around, to keep the pavement off their carriageways
  const roads = [];
  for (const [c, bridge, flat] of data.roads || []) {
    if (bridge || c > 4) continue;
    const pts = [];
    for (let i = 0; i < flat.length; i += 2) pts.push([flat[i] / 10, flat[i + 1] / 10]);
    if (pts.some((p) => Math.hypot(p[0] - cx, p[1] - cz) < R + 60)) roads.push({ half: ROAD_W[Math.max(0, c | 0)] / 2, pts });
  }
  const onRoad = (x, z, pad = 0.3) => roads.some((r) => nearest(r.pts, x, z).d < r.half + pad);

  // ---------------- shop fronts ----------------
  // o: the middle of the facade at ground, t: along it, f: out to the street, w: its width, h: the house's height,
  // gy: its floor, key: a number for the dice, awning/balcony: what the city's infill already hangs on this front,
  // gap: pavement depth between the facade and the kerb
  const front = (o, t, f, w, h, gy, key, { awning = false, balcony = false, timber = false, gap = 2, bar = 0.5 }) => {
    const ang = Math.atan2(t[1], t[0]);
    const P = (u, v) => [o[0] + t[0] * u + f[0] * v, o[1] + t[1] * u + f[1] * v];
    const B = (u, v, y0, y1, sx, sz, col, opt) => { const p = P(u, v); S.box(p[0], p[1], gy + y0, gy + y1, sx, sz, ang, col, opt); };
    const lit = (list, u, v, y0, y1, sx, sz) => { const p = P(u, v); list.push([p[0], p[1], gy + y0, gy + y1, sx, sz, ang]); };
    const isBar = rand(key, 3) < bar;
    // the open shopfront
    const ow = w * 0.84, oy = Math.min(2.75, h - 1.0);
    B(0, 0.04, 0.08, oy, ow, 0.08, isBar ? C.shopLit : C.shop);
    if (isBar || rand(key, 4) < 0.5) lit(L.warm, 0, 0.1, 0.15, oy - 0.1, ow - 0.2, 0.02);
    // the sign board over it, with a band of lettering
    if (rand(key, 5) < 0.9) {
      const si = Math.floor(rand(key, 6) * SIGNS.length) % SIGNS.length;
      const sw = Math.min(w * 0.94, w - 0.15);
      const [y0, y1] = balcony ? [3.0, 3.38] : h < 4.7 ? [2.98, Math.min(3.6, h - 0.08)] : [3.05, 3.9];
      B(0, 0.12, y0, y1, sw, 0.16, SIGNS[si]);
      const ym = (y0 + y1) / 2, lh = (y1 - y0) * 0.36;
      B((rand(key, 7) - 0.5) * sw * 0.2, 0.215, ym - lh / 2, ym + lh / 2, sw * (0.45 + rand(key, 8) * 0.25), 0.03, INK[si]);
      if (isBar || rand(key, 9) < 0.45) lit(L.sign[si], 0, 0.235, y0 + 0.04, y1 - 0.04, sw - 0.1, 0.01);
    }
    // a vertical blade sign up the facade of the taller houses
    if (h >= 7.2 && rand(key, 10) < 0.55) {
      const si = Math.floor(rand(key, 11) * SIGNS.length) % SIGNS.length, u = (rand(key, 12) < 0.5 ? -1 : 1) * (w / 2 - 0.25);
      const top = Math.min(h - 0.4, 6.9);
      B(u, 0.55, 4.55, top, 0.12, 0.85, SIGNS[si], { bottom: true });
      B(u, 0.55, 4.55 + 0.35, top - 0.35, 0.15, 0.3, INK[si]);
      if (isBar || rand(key, 13) < 0.5) lit(L.sign[si], u, 0.55, 4.6, top - 0.05, 0.17, 0.78);
    }
    // a striped canvas awning, where the house has none
    let edge = awning ? 1.4 : 0, edgeY = awning ? 2.82 : 0;
    if (!awning && !timber && rand(key, 14) < 0.7) {
      const dep = Math.min(1.8, Math.max(1.0, gap - 0.2)), yT = 2.93, yB = 2.45;
      const c1 = pick(CANVAS, key, 15), c2 = rand(key, 16) < 0.6 ? hex('#e9e4d8') : c1;
      const k = Math.max(2, Math.round((w * 0.94) / 0.55)), aw = w * 0.94;
      for (let j = 0; j < k; j++) {
        const u0 = -aw / 2 + (aw * j) / k, u1 = u0 + aw / k, col = j % 2 ? c2 : c1;
        const a = P(u0, 0.05), b = P(u1, 0.05), c = P(u1, dep), d = P(u0, dep);
        S.quad([a[0], gy + yT, a[1]], [b[0], gy + yT, b[1]], [c[0], gy + yB, c[1]], [d[0], gy + yB, d[1]], col, [f[0] * 0.3, 1, f[1] * 0.3]);
        S.quad([a[0], gy + yT - 0.03, a[1]], [b[0], gy + yT - 0.03, b[1]], [c[0], gy + yB - 0.03, c[1]], [d[0], gy + yB - 0.03, d[1]], shade(col, 0.7), [0, -1, 0]);
        S.quad([d[0], gy + yB, d[1]], [c[0], gy + yB, c[1]], [c[0], gy + yB - 0.24, c[1]], [d[0], gy + yB - 0.24, d[1]], shade(col, 0.92), [f[0], 0, f[1]]);
      }
      edge = dep; edgeY = yB - 0.24;
    }
    if (!isBar) return;
    // bulbs along the awning's edge, silk lanterns under it
    if (edge) {
      for (let u = -w * 0.44; u <= w * 0.44; u += 0.6) { const p = P(u, edge + 0.02); gp.push(p[0], gy + edgeY - 0.03, p[1]); gc.push(1, 0.8, 0.5); }
      const nl = w > 5.5 ? 3 : 2;
      for (let j = 0; j < nl; j++) {
        const u = -w * 0.38 + (w * 0.76 * j) / (nl - 1), p = P(u, edge - 0.25), yl = gy + edgeY - 0.55;
        const col = rand(key, 20 + j) < 0.75 ? C.lantern : C.lanternY;
        S.cyl(p[0], p[1], yl, yl + 0.22, 0.13, 0.19, 6, col, { cap: false });
        S.cyl(p[0], p[1], yl + 0.22, yl + 0.42, 0.19, 0.12, 6, col);
        S.box(p[0], p[1], yl + 0.42, gy + edgeY, 0.02, 0.02, 0, C.wire);
        gp.push(p[0], yl + 0.21, p[1]); gc.push(col === C.lantern ? 1 : 1, col === C.lantern ? 0.32 : 0.72, col === C.lantern ? 0.18 : 0.28);
      }
    }
    // low tables and plastic stools on the pavement
    if (gap >= 1.2) {
      const v = Math.min(gap * 0.55, 1.7), nt = Math.max(1, Math.min(3, Math.floor((w * 0.9) / 1.75)));
      const steel = rand(key, 30) < 0.5;
      for (let j = 0; j < nt; j++) {
        const u = nt === 1 ? 0 : -w * 0.32 + (w * 0.64 * j) / (nt - 1);
        B(u, v, 0, 0.42, 0.55, 0.55, steel ? C.tableS : C.table);
        for (const [du, dv] of [[-0.48, 0], [0.48, 0], [0, -0.45], [0, 0.45]]) {
          if (dv < 0 && v < 0.85) continue;
          B(u + du, v + dv, 0, 0.3, 0.27, 0.27, pick(STOOLS, key * 7 + j * 4 + Math.round(du * 3 + dv * 5), 31));
        }
      }
    }
  };

  // the city's infill houses on the three streets (the same dice city.js throws for their own awnings and balconies)
  const a = data.infill || [], NS = 8;
  let fronts = 0;
  for (let i = 0; i < a.length / NS; i++) {
    const x = a[i * NS] / 10, z = a[i * NS + 1] / 10;
    if (!inside(x, z)) continue;
    const w = a[i * NS + 2] / 10, d = a[i * NS + 3] / 10, ang = a[i * NS + 4] / 1000, h = a[i * NS + 5] / 10, main = a[i * NS + 6] === 1;
    const side = a[i * NS + 7] & 3, era = (a[i * NS + 7] >> 2) & 3;
    if (side === 2) continue;
    const fr = side === 1 ? -1 : 1, ca = Math.cos(ang), sa = Math.sin(ang);
    const f = [-sa * fr, ca * fr], o = [x + f[0] * d / 2, z + f[1] * d / 2];
    const st = streetOf(o[0], o[1]);
    if (!st || st.d > 10 || st.d < HALF + 0.3) continue;
    if ((st.p[0] - o[0]) * f[0] + (st.p[1] - o[1]) * f[1] < 0) continue; // its back is to the street
    if (Math.abs(st.t[0] * ca + st.t[1] * sa) < 0.8) continue; // a side wall, not the front
    let hi = -Infinity;
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) hi = Math.max(hi, rise(x + (ca * u * w - sa * v * d) / 2, z + (sa * u * w + ca * v * d) / 2));
    const awning = era === 0 && rand(i, 70) < (main ? 0.78 : 0.22);
    const balcony = era === 0 && h >= 7 && rand(i, 72) < 0.5;
    front(o, [ca, sa], f, w, h, LAND_Y + hi, i, { awning, balcony, timber: era === 2, gap: st.d - HALF - 0.3, bar: STREETS[st.k].bar });
    fronts++;
  }
  // mapped buildings: the edges of their outline that face one of the streets
  (data.bld || []).forEach((rec, bi) => {
    const flat = rec[0], h = (rec[5] || rec[1] || 70) / 10;
    const ring = [];
    for (let k = 0; k < flat.length; k += 2) ring.push([flat[k] / 10, flat[k + 1] / 10]);
    if (!ring.some((p) => inside(p[0], p[1]))) return;
    let sx = 0, sz = 0;
    for (const p of ring) { sx += p[0]; sz += p[1]; }
    const c = [sx / ring.length, sz / ring.length];
    for (let k = 0; k < ring.length; k++) {
      const p = ring[k], q = ring[(k + 1) % ring.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (len < 3.5) continue;
      const t = [(q[0] - p[0]) / len, (q[1] - p[1]) / len], o = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      let f = [t[1], -t[0]];
      if ((o[0] - c[0]) * f[0] + (o[1] - c[1]) * f[1] < 0) f = [-f[0], -f[1]];
      if (!inside(o[0], o[1])) continue;
      const st = streetOf(o[0], o[1]);
      if (!st || st.d > 10 || st.d < HALF + 0.3 || Math.abs(st.t[0] * t[0] + st.t[1] * t[1]) < 0.85) continue;
      if ((st.p[0] - o[0]) * f[0] + (st.p[1] - o[1]) * f[1] < 0) continue;
      const gy = LAND_Y + Math.max(rise(p[0], p[1]), rise(q[0], q[1]));
      // a long front is several shops
      const ns = Math.max(1, Math.round(len / 6.5)), sw = len / ns;
      for (let j = 0; j < ns; j++) {
        const u = -len / 2 + sw * (j + 0.5);
        front([o[0] + t[0] * u + f[0] * 0.02, o[1] + t[1] * u + f[1] * 0.02], t, f, sw - 0.1, h, gy, 200000 + bi * 16 + j, { gap: st.d - HALF - 0.3, bar: STREETS[st.k].bar });
        fronts++;
      }
    }
  });

  // ---------------- the street ----------------
  // kerbside poles every 16 m, and bulbs slung across between them in a shallow catenary
  for (const s of Object.values(STREETS)) {
    for (let i = 0; i + 1 < s.pts.length; i++) {
      const A = s.pts[i], Bp = s.pts[i + 1], len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]);
      const t = [(Bp[0] - A[0]) / len, (Bp[1] - A[1]) / len], n = [-t[1], t[0]];
      for (let u = 6; u < len - 6; u += 16) {
        const m = [A[0] + t[0] * u, A[1] + t[1] * u];
        if (!inside(m[0], m[1])) continue;
        const ends = [-1, 1].map((sg) => [m[0] + n[0] * sg * (HALF + 0.35), m[1] + n[1] * sg * (HALF + 0.35)]);
        if (ends.some((e) => onRoad(e[0], e[1], 0))) continue; // a junction
        const yTop = ends.map((e) => LAND_Y + rise(e[0], e[1]) + 6.2);
        for (let k = 0; k < 2; k++) S.cyl(ends[k][0], ends[k][1], yTop[k] - 6.2, yTop[k] + 0.6, 0.11, 0.08, 5, C.pole);
        const seg = 8, Y = (s0) => yTop[0] + (yTop[1] - yTop[0]) * s0 - 0.75 * 4 * s0 * (1 - s0);
        const W = (s0) => [ends[0][0] + (ends[1][0] - ends[0][0]) * s0, ends[0][1] + (ends[1][1] - ends[0][1]) * s0];
        for (let k = 0; k < seg; k++) {
          const p0 = W(k / seg), p1 = W((k + 1) / seg);
          S.beam([p0[0], Y(k / seg), p0[1]], [p1[0], Y((k + 1) / seg), p1[1]], 0.03, 0.03, C.wire);
        }
        const nb = 11;
        for (let k = 1; k < nb; k++) { const s0 = k / nb, p = W(s0); gp.push(p[0], Y(s0) - 0.12, p[1]); gc.push(...BULBS[(k + i) % BULBS.length]); }
      }
    }
  }
  // terrazzo pavements: red and grey squares from the kerb back to the house fronts
  S.kind = KIND.GROUND;
  for (const s of Object.values(STREETS)) {
    for (let i = 0; i + 1 < s.pts.length; i++) {
      const A = s.pts[i], Bp = s.pts[i + 1], len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]);
      const t = [(Bp[0] - A[0]) / len, (Bp[1] - A[1]) / len], n = [-t[1], t[0]];
      const nu = Math.max(1, Math.round(len / 1.2)), du = len / nu;
      for (const sg of [-1, 1]) for (let j = 0; j < nu; j++) for (let r = 0; r < 2; r++) {
        const v0 = HALF + 0.25 + r * 1.0, v1 = v0 + 1.0, u0 = j * du, u1 = u0 + du;
        const Q = (u, v) => [A[0] + t[0] * u + n[0] * v * sg, A[1] + t[1] * u + n[1] * v * sg];
        const mid = Q((u0 + u1) / 2, (v0 + v1) / 2);
        if (!inside(mid[0], mid[1]) || onRoad(mid[0], mid[1], 0.6)) continue;
        if (streetOf(mid[0], mid[1]).d < HALF + 0.2) continue; // another of the three
        const col = (j + r) % 2 ? C.tileR : C.tileG;
        const pts = [Q(u0, v0), Q(u1, v0), Q(u1, v1), Q(u0, v1)].map((q) => [q[0], LAND_Y + rise(q[0], q[1]) + 0.085, q[1]]);
        S.quad(pts[0], pts[1], pts[2], pts[3], col, [0, 1, 0]);
      }
    }
  }
  // the paved lane, kerb to kerb
  for (let i = 0; i + 1 < LANE.length; i++) {
    const A = LANE[i], Bp = LANE[i + 1], len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]);
    const t = [(Bp[0] - A[0]) / len, (Bp[1] - A[1]) / len], n = [-t[1], t[0]];
    const nu = Math.max(1, Math.round(len / 1.5));
    for (let j = 0; j < nu; j++) {
      const u0 = (len * j) / nu, u1 = (len * (j + 1)) / nu;
      const Q = (u, v) => { const x = A[0] + t[0] * u + n[0] * v, z = A[1] + t[1] * u + n[1] * v; return [x, LAND_Y + rise(x, z) + 0.09, z]; };
      S.quad(Q(u0, -1.5), Q(u1, -1.5), Q(u1, 1.5), Q(u0, 1.5), j % 2 ? C.lane : shade(C.lane, 0.94), [0, 1, 0]);
    }
  }
  S.kind = KIND.PLAIN;
  // none of it is ground the houses must keep off: the fronts hang on the houses, the pavement is under them
  (S.noCover = S.noCover || []).push([n0, S.n]);

  // ---------------- night ----------------
  const addLit = (list, color, boost) => {
    if (!list.length) return;
    const LB = new Buf(list.length * 12);
    for (const [x, z, y0, y1, sx, sz, ang] of list) LB.box(x, z, y0, y1, sx, sz, ang, [1, 1, 1]);
    const m = new THREE.Mesh(LB.geometry(), lightMaterial(color, boost));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
  };
  addLit(L.warm, 0xffb060, 0.5);
  GLOW.forEach((col, k) => addLit(L.sign[k], col, 1.15));
  if (gp.length) {
    const pts = glowPoints(gp, gc, 2.2);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
  if (S.n - n0 > 3 * 40000) console.warn('photay: heavy model', (S.n - n0) / 3);
  S.kind = KIND.PLAIN;
  S.base = 0;
}
