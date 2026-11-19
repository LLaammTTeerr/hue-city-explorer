import * as THREE from 'three';
import { KIND, hex, shade } from '../geo/buf.js';
import { glowPoints } from '../geo/materials.js';
import { LAND_Y, PAL } from '../config.js';
import { pavilion } from './citadel.js';

// Cầu Nguyễn Hoàng (opened 2025). Axis, length and position come from the OSM bridge outline; the form
// follows published descriptions: five concrete beam spans, a deck about 43 m wide, a yellow steel arch
// frame over 20 m tall at mid-bridge, and parasol-shaped lamps ("lọng") stepping up toward it from both ends.
export function buildNguyenHoang(data, S, group) {
  const nh = data.nguyenhoang;
  if (!nh) return [];
  const c = [nh.c[0] / 10, nh.c[1] / 10], L = nh.w / 10, W = Math.min(nh.d / 10, 43), ang = nh.a / 1000;
  const u = [Math.cos(ang), Math.sin(ang)], v = [-u[1], u[0]];
  const at = (s, off, y) => [c[0] + u[0] * s + v[0] * off, y, c[1] + u[1] * s + v[1] * off];
  const SPANS = 5, span = L / SPANS;
  const deckTop = LAND_Y + 2.8, deckT = 1.7;
  const concrete = hex('#cfc9be'), asphalt = hex('#77726e'), granite = hex('#b08a7c'), gold = hex('#dba92c'), goldD = hex('#b98a1e');

  S.kind = KIND.PLAIN;
  S.box(c[0], c[1], deckTop - deckT, deckTop, L, W, ang, concrete, { top: asphalt, bottom: true, topKind: KIND.ROAD });
  // red-granite walkways along both edges, a planted median, railings
  for (const side of [-1, 1]) {
    const m = at(0, side * (W / 2 - 2.2), 0);
    S.box(m[0], m[2], deckTop, deckTop + 0.14, L, 3.6, ang, granite, { topKind: KIND.ROAD });
    S.beam(at(-L / 2, side * (W / 2 - 0.15), deckTop + 1.15), at(L / 2, side * (W / 2 - 0.15), deckTop + 1.15), 0.16, 0.16, hex('#e6e2d8'));
    S.beam(at(-L / 2, side * (W / 2 - 0.15), deckTop + 0.6), at(L / 2, side * (W / 2 - 0.15), deckTop + 0.6), 0.1, 0.1, hex('#cfcac0'));
    for (let s = -L / 2; s <= L / 2 + 0.01; s += span / 10) S.beam(at(s, side * (W / 2 - 0.15), deckTop), at(s, side * (W / 2 - 0.15), deckTop + 1.15), 0.14, 0.14, hex('#cfcac0'));
  }
  const med = at(0, 0, 0);
  S.box(med[0], med[2], deckTop, deckTop + 0.35, L, 1.6, ang, hex('#8fa56c'), { topKind: KIND.GROUND });
  // piers: broad wall piers with rounded ends, and the abutment ramps
  S.kind = KIND.PLAIN;
  for (let i = 1; i < SPANS; i++) {
    const s = -L / 2 + i * span;
    const ring = [[-1.6, -W / 2 + 3], [0, -W / 2 + 0.8], [1.6, -W / 2 + 3], [1.6, W / 2 - 3], [0, W / 2 - 0.8], [-1.6, W / 2 - 3]].map(([a, b]) => { const p = at(s + a, b, 0); return [p[0], p[2]]; });
    S.prism(ring, -3, deckTop - deckT, concrete, shade(concrete, 1.05), { scaleTop: 1.06 });
  }
  for (const end of [-1, 1]) {
    const s0 = (end * L) / 2, s1 = s0 + end * 46, y1 = LAND_Y + 0.08;
    const p = [at(s0, -W / 2, deckTop), at(s0, W / 2, deckTop), at(s1, W / 2, y1), at(s1, -W / 2, y1)];
    S.kind = KIND.ROAD;
    S.quad(p[0], p[1], p[2], p[3], asphalt, [0, 1, 0]);
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) S.quad(at(s0, (side * W) / 2, deckTop), at(s1, (side * W) / 2, y1), at(s1, (side * W) / 2, LAND_Y - 0.5), at(s0, (side * W) / 2, LAND_Y - 0.5), concrete, [v[0] * side, 0, v[1] * side]);
    const m = at(s0 + end * 1.4, 0, 0);
    S.box(m[0], m[2], -3, deckTop - deckT, 3.6, W + 2, ang, concrete);
  }

  // the golden arch frame over the middle span: one rib on each side of the carriageway, tied across the top
  const lp = [], lc = [];
  const H = 21.5, N = 18, ribX = W / 2 - 5.2;
  const rib = (k, side) => { const t = k / N; return at(-span / 2 + t * span, side * ribX * (1 - 0.1 * Math.sin(Math.PI * t)), deckTop + H * Math.sin(Math.PI * t) ** 0.85); };
  for (const side of [-1, 1]) {
    for (let k = 0; k < N; k++) {
      const a = rib(k, side), b = rib(k + 1, side);
      S.beam(a, b, 1.5, 1.2, gold);
      lp.push((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.8, (a[2] + b[2]) / 2); lc.push(1.0, 0.78, 0.32);
      if (k >= 2 && k <= N - 2 && k % 2 === 0) {
        const foot = at(-span / 2 + (k / N) * span, side * ribX, deckTop);
        S.beam(a, foot, 0.22, 0.22, goldD); // hangers
      }
    }
  }
  for (let k = 5; k <= N - 5; k += 2) S.beam(rib(k, -1), rib(k, 1), 0.5, 0.5, goldD);

  // "lọng" lamps: 64 parasols, from 4.6 m at the bridge ends up to about 14 m beside the arch
  const perRun = 16, run = L / 2 - span / 2 - 6;
  for (const end of [-1, 1]) for (const side of [-1, 1]) for (let i = 0; i < perRun; i++) {
    const t = i / (perRun - 1); // 0 at the bridge end → 1 next to the arch
    const s = end * (L / 2 - 4 - t * run);
    const hgt = 4.6 + (14.2 - 4.6) * t * t;
    const base = at(s, side * (W / 2 - 4.4), deckTop);
    S.beam(base, [base[0], deckTop + hgt, base[2]], 0.2, 0.2, goldD);
    S.kind = KIND.PLAIN;
    S.cyl(base[0], base[2], deckTop + hgt - 0.2, deckTop + hgt + 0.9, 1.25, 0.12, 8, gold, { cap: false });
    S.cyl(base[0], base[2], deckTop + hgt - 0.5, deckTop + hgt - 0.2, 1.3, 1.25, 8, goldD, { cap: false });
    lp.push(base[0], deckTop + hgt - 0.4, base[2]); lc.push(1.0, 0.82, 0.45);
  }
  const lights = glowPoints(lp, lc, 5);
  group.add(lights);
  return [lights];
}

// Quốc Học's gate on Lê Lợi: red masonry, three doorways, a two-tier tiled roof, low red walls either side.
export function buildQuocHocGate(data, S) {
  const g = data.quocHocGate;
  if (!g) return;
  const c = [g.c[0] / 10, g.c[1] / 10], ang = g.a / 1000;
  const u = [Math.cos(ang), Math.sin(ang)], v = [-u[1], u[0]];
  const red = hex('#a8322a'), redD = hex('#8c2a24'), cream = hex('#ead9b8'), dark = hex('#2b2422'), roof = hex('#77695b');
  const y = LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], y, y + 5.6, 15, 1.6, ang, red, { top: cream });
  for (const s of [-1, 1]) {
    // end pillars and the flanking walls
    S.box(c[0] + u[0] * s * 8.4, c[1] + u[1] * s * 8.4, y, y + 6.4, 1.8, 1.9, ang, redD, { top: cream });
    S.box(c[0] + u[0] * s * 17.5, c[1] + u[1] * s * 17.5, y, y + 2.6, 16.5, 0.6, ang, red, { top: roof });
  }
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) for (const k of [-1, 0, 1]) {
    const x = c[0] + u[0] * k * 4.6 + v[0] * s * 0.83, z = c[1] + u[1] * k * 4.6 + v[1] * s * 0.83;
    S.box(x, z, y, y + (k === 0 ? 4.3 : 3.4), k === 0 ? 3.2 : 2.3, 0.1, ang, dark);
  }
  S.box(c[0], c[1], y + 4.5, y + 5.3, 7.5, 1.72, ang, cream); // name board band
  pavilion(S, c[0], c[1], 9.5, 2.6, ang, y + 5.6, { tiers: 2, wallH: 1.9, roof, wall: red, over: 1.0, rh: 1.9, ridge: hex('#d8c9a0') });
  S.kind = KIND.PLAIN;
}
