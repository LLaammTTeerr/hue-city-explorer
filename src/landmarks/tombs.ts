// The Nguyễn royal tombs south-west of the city: Minh Mạng, Tự Đức, Khải Định, Thiệu Trị, Đồng Khánh.
// Each tomb reads its site from data.sites (scripts/build-data.mjs): mapped buildings ('b'), water ('w') and
// historic outlines ('h'). Mapped buildings sit on their own footprints; the axes are taken from pairs of mapped
// buildings; courts, terraces, stairs, statues, walls and bridges are laid out along those axes from the known plan
// of each tomb (illustrative where nothing is mapped). Water itself is drawn elsewhere (POND_Y), never here.
import { KIND, hex, shade, unflat, obb, inRing } from '../geo/buf.ts';
import { LAND_Y, POND_Y, PAL } from '../config.ts';
import { rise } from '../geo/terrain.ts';
import { pavilion } from './citadel.ts';
import { replaced } from './places/index.ts';
import * as P from './props.ts';

const C = {
  brick: hex('#6e6253'), brickMoss: hex('#5e6249'), brickWarm: hex('#8a5c46'),
  stone: PAL.stone, stoneGrey: hex('#9b978d'), stoneDark: hex('#7c786f'), stucco: hex('#ddd3bc'),
  lacquer: hex('#86362a'), lacquerOld: hex('#6f3c30'),
  roofY: PAL.imperialRoof, roofYOld: hex('#b48b3e'), roofG: PAL.jadeRoof, roofTile: hex('#7a6552'),
  door: hex('#2b2422'), iron: hex('#262423'), bronze: hex('#4a3a26'),
  // Khải Định: concrete weathered grey-black by the rain, darker roofs of ardoise slate, paler cornices and trim
  kdWall: hex('#5e5c59'), kdRoof: hex('#474543'), kdTrim: hex('#a9a59c'),
  moss: PAL.moss, pine: hex('#3d5734'),
};
const RIDGE = hex('#e9d27e');
const MANDARIN = hex('#a29d92');

// ---------- small geometry helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gY = (x, z) => LAND_Y + rise(x, z);
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const fin = (p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]);

// sample points over an oriented rectangle (corners, edge mids, centre)
function rectPts(cx, cz, w, d, a) {
  const ux = Math.cos(a), uz = Math.sin(a), out = [];
  for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) out.push([cx + (ux * i * w) / 2 - (uz * j * d) / 2, cz + (uz * i * w) / 2 + (ux * j * d) / 2]);
  return out;
}
// Lowest and highest ground under a footprint: the points given and the whole box round them, every few metres. The
// corners alone miss a rise in the middle (Minh Lâu stands on a hillock that buried its three terraces).
function groundSpan(pts) {
  let lo = Infinity, hi = -Infinity, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  const take = (x, z) => { const y = gY(x, z); lo = Math.min(lo, y); hi = Math.max(hi, y); };
  for (const p of pts) { take(p[0], p[1]); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  if (lo === Infinity) return { lo: LAND_Y, hi: LAND_Y };
  const nx = Math.min(30, Math.ceil((x1 - x0) / 5)), nz = Math.min(30, Math.ceil((z1 - z0) / 5));
  for (let i = 1; i < nx; i++) for (let j = 1; j < nz; j++) take(x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * j) / nz);
  return { lo, hi };
}
// an axis: s runs along u, t to its left (v = u rotated +90° in x/z)
function frame(o, dir) {
  const l = Math.hypot(dir[0], dir[1]) || 1, ux = dir[0] / l, uz = dir[1] / l;
  return {
    o, ux, uz, a: Math.atan2(uz, ux), av: Math.atan2(ux, -uz),
    at: (s, t = 0) => [o[0] + ux * s - uz * t, o[1] + uz * s + ux * t],
    s: (p) => (p[0] - o[0]) * ux + (p[1] - o[1]) * uz,
    t: (p) => -(p[0] - o[0]) * uz + (p[1] - o[1]) * ux,
  };
}
// stretches of the axis line (at offset t) that lie inside any of the rings
function spans(F, rings, s0, s1, t = 0, step = 0.75) {
  const out = []; let cur = null;
  for (let s = s0; s <= s1; s += step) {
    const p = F.at(s, t), w = rings.some((r) => inRing(p[0], p[1], r));
    if (w && !cur) cur = [s, s]; else if (w) cur[1] = s; else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}
const circle = (cx, cz, r, n) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cz + r * Math.sin((i / n) * Math.PI * 2)]);

// ---------- site access ----------
function loadSite(data, id) {
  const s = data?.sites?.[id];
  if (!s || !Array.isArray(s.c) || !Number.isFinite(s.c[0]) || !Number.isFinite(s.c[1])) return null;
  const items = [];
  for (const it of s.items || []) {
    if (!it || !Array.isArray(it.ring) || it.ring.length < 6) continue;
    const ring = unflat(it.ring);
    if (!ring.every(fin)) continue;
    const o = obb(ring);
    if (!fin(o.c) || !(o.w > 0.5)) continue;
    items.push({ id: it.id, n: it.n || '', key: norm(it.n), k: it.k, ring, c: o.c, w: o.w, d: o.d, a: o.a, used: false });
  }
  return { c: [s.c[0] / 10, s.c[1] / 10], items };
}
const named = (st, re, k = 'b') => st.items.find((i) => i.k === k && !i.used && re.test(i.key)) || null;
function nearest(st, dx, dz, tol, k = 'b') {
  const p = add(st.c, [dx, dz]);
  let best = null, bd = tol;
  for (const i of st.items) {
    if (i.k !== k || i.used) continue;
    const d = Math.hypot(i.c[0] - p[0], i.c[1] - p[1]);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
const waters = (st) => st.items.filter((i) => i.k === 'w').map((i) => i.ring);

// ---------- building blocks ----------
// a level platform from 1 m below the lowest ground under it up to `top`
function terrace(S, cx, cz, w, d, a, top, col = C.stone) {
  const { lo } = groundSpan(rectPts(cx, cz, w, d, a));
  const y0 = lo - 1;
  if (top < y0 + 0.3) top = y0 + 0.3;
  S.kind = KIND.MASONRY; S.base = y0 - LAND_Y;
  S.box(cx, cz, y0, top, w, d, a, col, { top: shade(col, 1.06), topKind: KIND.ROAD });
  return top;
}
const levelTop = (cx, cz, w, d, a, lift = 0.2) => groundSpan(rectPts(cx, cz, w, d, a)).hi + lift;

// pavilion() wants the long side along the angle. `h` is the height of the ridge over the floor, where it is known
// (docs/reference/heights.md): the roof is pitched to meet it. Otherwise the roof rises with the depth of the hall
// but no higher than 3.8 m: pavilion()'s own rule (up to 5.2 m, and 1.27 times that for two tiers) is drawn for the
// great halls of the Citadel and stood the tomb halls 4-6 m over their real height (Sùng Ân 15.5 m for some 10).
function pav(S, cx, cz, w, d, a, floor, { h = null, ...opts }: Record<string, any> = {}) {
  if (w < d) { const t = w; w = d; d = t; a += Math.PI / 2; }
  const wallH = opts.wallH ?? 3.6;
  if (h != null) {
    if (opts.tiers === 2) { opts.wallH = Math.min(wallH, (h - 1.6) / 2.2); opts.rh = (h - opts.wallH * 1.62) / 1.27; }
    else { opts.wallH = Math.min(wallH, h - 1.6); opts.rh = h - opts.wallH; }
  } else if (opts.rh == null) opts.rh = clamp(d * 0.3, 1.5, 3.8);
  S.base = floor - LAND_Y;
  return pavilion(S, cx, cz, w, d, a, floor, opts);
}
// a tiled hall on its own masonry plinth, floor level with the highest ground under it
function hallAt(S, cx, cz, w, d, a, { plinth = 0.8, floor = null, tiers = 1, wallH = 3.4, roof = C.roofYOld, wall = C.lacquerOld, over = 1.2, plinthCol = C.stone, h = null } = {}) {
  const f = floor ?? levelTop(cx, cz, w + 2, d + 2, a, plinth);
  if (floor == null) terrace(S, cx, cz, w + 2, d + 2, a, f, plinthCol);
  const top = pav(S, cx, cz, w, d, a, f, { tiers, wallH, roof, wall, over, h });
  return { floor: f, top };
}
function itemHall(S, it, opts) { it.used = true; return hallAt(S, it.c[0], it.c[1], it.w, it.d, it.a, opts); }

// a flight of steps from p0 (y0) to p1 (y1), each step from its own ground; optional balustrades
function flight(S, p0, y0, p1, y1, w, { col = C.stone, rail = 0, railCol = null, dragon = false } = {}) {
  if (y1 < y0) { [p0, p1] = [p1, p0]; [y0, y1] = [y1, y0]; }
  const dx = p1[0] - p0[0], dz = p1[1] - p0[1], len = Math.hypot(dx, dz);
  if (len < 0.4 || y1 - y0 < 0.05) return;
  const a = Math.atan2(dz, dx), ux = dx / len, uz = dz / len;
  const n = clamp(Math.ceil((y1 - y0) / 0.42), 1, Math.max(1, Math.min(32, Math.floor(len / 0.28))));
  S.kind = KIND.MASONRY;
  for (let k = 0; k < n; k++) {
    const f = (k + 0.5) / n, cx = p0[0] + dx * f, cz = p0[1] + dz * f;
    const top = y0 + ((y1 - y0) * (k + 1)) / n;
    const lo = Math.min(gY(cx - (uz * w) / 2, cz + (ux * w) / 2), gY(cx + (uz * w) / 2, cz - (ux * w) / 2), gY(cx, cz)) - 1;
    S.base = lo - LAND_Y;
    S.box(cx, cz, Math.min(lo, top - 0.3), top, len / n + 0.03, w, a, col, { topKind: KIND.ROAD });
  }
  if (rail) {
    const rc = railCol || shade(col, 0.92), rw = dragon ? 0.7 : 0.4;
    for (const sd of [-1, 1]) balustrade(S, p0, y0, p1, y1, sd * (w / 2 + rw / 2), { col: rc, dragon });
  }
}
// one balustrade along a stair p0 (y0) → p1 (y1, the upper end), offset t to the left of the climb; a dragon's body
// rides a dragon balustrade, its head rearing at the foot (Khải Định's stairs)
function balustrade(S, p0, y0, p1, y1, t, { col, dragon = false }: Record<string, any> = {}) {
  if (y1 < y0) { [p0, p1] = [p1, p0]; [y0, y1] = [y1, y0]; }
  const dx = p1[0] - p0[0], dz = p1[1] - p0[1], len = Math.hypot(dx, dz);
  if (len < 0.4) return;
  const a = Math.atan2(dz, dx), ux = dx / len, uz = dz / len, rw = dragon ? 0.7 : 0.4, rh = dragon ? 1.3 : 0.9;
  const ox = -uz * t, oz = ux * t;
  S.kind = KIND.MASONRY;
  S.beam([p0[0] + ox, y0 + rh / 2, p0[1] + oz], [p1[0] + ox, y1 + rh / 2, p1[1] + oz], rw, rh, col);
  if (dragon) {
    S.box(p0[0] + ox - ux * 0.6, p0[1] + oz - uz * 0.6, y0 - 0.2, y0 + 2.0, 1.6, rw + 0.3, a, col, { taper: 0.75 });
    S.box(p0[0] + ox - ux * 1.2, p0[1] + oz - uz * 1.2, y0 + 1.5, y0 + 2.4, 1.1, rw + 0.1, a, shade(col, 0.9));
    // the coils of the body humping along the rail, a newel at the top
    for (const f of [0.3, 0.62]) S.beam([p0[0] + ox + dx * (f - 0.08), y0 + (y1 - y0) * (f - 0.08) + rh, p0[1] + oz + dz * (f - 0.08)], [p0[0] + ox + dx * (f + 0.08), y0 + (y1 - y0) * (f + 0.08) + rh, p0[1] + oz + dz * (f + 0.08)], rw * 0.8, 0.5, shade(col, 0.95));
    S.box(p1[0] + ox, p1[1] + oz, y1 - 0.2, y1 + 1.7, 0.9, 0.9, a, col, { top: shade(col, 1.1) });
  }
}

// a wall following a ring (or an open line), each segment from its own ground
// Footpaths and lanes near the tombs, as segments [ax, az, bx, bz, width]: where one crosses a wall, the wall opens.
let PATHS = [];
function loadPaths(data) {
  PATHS = [];
  const sites = (Object.values(data.sites || {}) as any[]).filter((st) => st && fin(st.c)).map((st) => [st.c[0] / 10, st.c[1] / 10, (st.r || 300) + 60]); // a site without a centre has no paths, rather than aborting every tomb
  const W = [15, 12, 9.5, 6.5, 4, 2.2];
  for (const [c, bridge, flat] of data.roads || []) {
    if (bridge) continue;
    for (let i = 0; i + 3 < flat.length; i += 2) {
      const ax = flat[i] / 10, az = flat[i + 1] / 10, bx = flat[i + 2] / 10, bz = flat[i + 3] / 10;
      if (sites.some(([x, z, r]) => Math.hypot((ax + bx) / 2 - x, (az + bz) / 2 - z) < r)) PATHS.push([ax, az, bx, bz, W[c] || 2.2]);
    }
  }
}
// where along a -> b (0..1) paths cross, as [from, to] gaps wide enough for the path, merged
function crossings(a, b, len) {
  const dx = b[0] - a[0], dz = b[1] - a[1], gaps = [];
  for (const [px, pz, qx, qz, w] of PATHS) {
    const ex = qx - px, ez = qz - pz, den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const f = ((px - a[0]) * ez - (pz - a[1]) * ex) / den, g = ((px - a[0]) * dz - (pz - a[1]) * dx) / den;
    if (f < 0 || f > 1 || g < 0 || g > 1) continue;
    // a path meeting the wall at a slant needs a wider opening
    const sin = Math.abs(den) / (len * Math.hypot(ex, ez)), half = Math.min(6, (w / 2 + 0.5) / Math.max(0.35, sin)) / len;
    gaps.push([f - half, f + half]);
  }
  gaps.sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const g of gaps) { const l = out[out.length - 1]; if (l && g[0] <= l[1] + 1.2 / len) l[1] = Math.max(l[1], g[1]); else out.push(g.slice()); }
  return out;
}
function wallLine(S, pts, h, t, { col = C.brickMoss, cap = C.stoneDark, closed = true, maxSeg = 10, ground = null } = {}) {
  S.kind = KIND.MASONRY;
  const n = pts.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.3) continue;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const at = (f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    const level = (p, q) => {
      if (ground != null) return [ground - 0.5, ground];
      const g = [gY(p[0], p[1]), gY(q[0], q[1]), gY((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)];
      return [Math.min(...g) - 0.6, Math.max(...g)];
    };
    // the standing stretches between the doorways
    const gaps = crossings(a, b, len), runs = [];
    let f = 0;
    for (const [g0, g1] of gaps) { if (g0 > f) runs.push([f, Math.min(1, g0)]); f = Math.max(f, g1); }
    if (f < 1) runs.push([f, 1]);
    for (const [r0, r1] of runs) {
      const rl = (r1 - r0) * len;
      if (rl < 0.2) continue;
      const ns = Math.ceil(rl / maxSeg);
      for (let k = 0; k < ns; k++) {
        const p = at(r0 + ((r1 - r0) * k) / ns), q = at(r0 + ((r1 - r0) * (k + 1)) / ns);
        const [lo, hi] = level(p, q);
        S.base = lo - LAND_Y;
        S.box((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, lo, hi + h, rl / ns + (gaps.length ? 0 : t * 0.6), t, ang, col, { top: cap });
      }
    }
    // a post either side of each doorway
    for (const [g0, g1] of gaps) for (const fp of [g0, g1]) {
      if (fp <= 0.01 || fp >= 0.99) continue;
      const p = at(fp), [lo, hi] = level(p, p);
      S.base = lo - LAND_Y;
      S.box(p[0], p[1], lo, hi + h + 0.5, t + 0.35, t + 0.35, ang, col, { top: cap });
    }
  }
}
const rectRing = (F, s0, s1, t0, t1) => [F.at(s0, t0), F.at(s1, t0), F.at(s1, t1), F.at(s0, t1)];

// a masonry gate: w along the wall line (angle a), the passage runs across it
function gate(S, cx, cz, a, w, d, { h = 5, openings = 3, roof = C.roofY, col = C.brickMoss, upper = false, floor = null, rh = null } = {}) {
  if (w < d) { const t = w; w = d; d = t; a += Math.PI / 2; }
  const { lo, hi } = groundSpan(rectPts(cx, cz, w, d, a));
  const y0 = floor ?? hi;
  S.kind = KIND.MASONRY; S.base = y0 - LAND_Y;
  S.box(cx, cz, lo - 0.8, y0 + h, w, d, a, col, { top: shade(col, 0.9) });
  const ux = Math.cos(a), uz = Math.sin(a), bay = w / openings, mid = (openings - 1) / 2;
  S.kind = KIND.PLAIN;
  for (let k = 0; k < openings; k++) {
    const off = (k - mid) * bay, main = Math.abs(k - mid) < 0.6;
    const ow = Math.min(3.4, bay * 0.55) * (main ? 1 : 0.82), oh = Math.min(h * 0.66, 3.8) * (main ? 1 : 0.85);
    S.box(cx + ux * off, cz + uz * off, y0, y0 + oh, ow, d + 0.14, a, C.door);
  }
  let top = y0 + h;
  if (roof) {
    const r = rh ?? clamp(d * 0.45, 1.2, 3);
    S.hip(cx, cz, w, d, a, top, r, roof, { flare: 0.35, over: 0.8, fascia: 0.25, fasciaCol: shade(col, 0.8), ridgeCol: RIDGE, hips: true, glazed: true });
    if (upper) {
      const y2 = top + r * 0.45;
      S.kind = KIND.TIMBER; S.base = y2 - LAND_Y;
      S.box(cx, cz, y2, y2 + 2.4, w * 0.5, d * 0.62, a, C.lacquerOld);
      S.hip(cx, cz, w * 0.5, d * 0.62, a, y2 + 2.4, r * 0.8, roof, { flare: 0.3, over: 0.7, fascia: 0.2, ridgeCol: RIDGE, hips: true, glazed: true });
      top = y2 + 2.4 + r * 0.8;
    } else top += r;
  }
  S.kind = KIND.PLAIN;
  return top;
}

// a pavilion on stilts standing in the water
function stilts(S, cx, cz, w, d, a, { roof = C.roofTile, wall = C.lacquerOld } = {}) {
  if (w < d) { const t = w; w = d; d = t; a += Math.PI / 2; }
  const deck = LAND_Y + rise(cx, cz) + 0.45, ux = Math.cos(a), uz = Math.sin(a); // above the lake's own level
  const nx = clamp(Math.round(w / 3.5), 2, 6), nz = clamp(Math.round(d / 3.5), 2, 4);
  S.kind = KIND.TIMBER; S.base = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const u = (i / (nx - 1) - 0.5) * (w + 1), v = (j / (nz - 1) - 0.5) * (d + 1);
    const x = cx + ux * u - uz * v, z = cz + uz * u + ux * v;
    S.box(x, z, POND_Y - 0.6, deck - 0.3, 0.32, 0.32, a, C.lacquerOld);
  }
  S.kind = KIND.MASONRY;
  S.box(cx, cz, deck - 0.3, deck, w + 1.6, d + 1.6, a, C.stoneDark, { topKind: KIND.ROAD });
  return pav(S, cx, cz, w, d, a, deck, { wallH: 2.7, roof, wall, over: 1.1 });
}

function bridge(S, p0, p1, w, { col = C.stone, arch = 0.5, rail = true } = {}) {
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  if (len < 1) return;
  const y0 = Math.max(gY(p0[0], p0[1]), LAND_Y) + 0.15, y1 = Math.max(gY(p1[0], p1[1]), LAND_Y) + 0.15;
  const ym = Math.max(y0, y1, LAND_Y + 0.3) + arch;
  const P = (f) => [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
  // the deck humps on a smooth curve from bank to crown to bank (as the road bridges of geo/bridges.js do), fuller
  // at the crown than a sine so the walk over the top stays easy
  const N = Math.max(4, Math.min(12, Math.round(len / 1.5)));
  const yAt = (f) => y0 + (y1 - y0) * f + (ym - (y0 + (y1 - y0) * 0.5)) * Math.pow(Math.sin(Math.PI * f), 0.6);
  const knots = Array.from({ length: N + 1 }, (_, i) => [i / N, yAt(i / N)]);
  const ux = (p1[0] - p0[0]) / len, uz = (p1[1] - p0[1]) / len;
  S.kind = KIND.MASONRY; S.base = 0;
  for (let i = 0; i < N; i++) {
    const [fa, ya] = knots[i], [fb, yb] = knots[i + 1], a = P(fa), b = P(fb);
    S.beam([a[0], ya - 0.3, a[1]], [b[0], yb - 0.3, b[1]], w, 0.6, col);
    if (rail) for (const sd of [-1, 1]) {
      const ox = -uz * sd * (w / 2 - 0.15), oz = ux * sd * (w / 2 - 0.15);
      S.beam([a[0] + ox, ya + 0.3, a[1] + oz], [b[0] + ox, yb + 0.3, b[1] + oz], 0.25, 0.6, shade(col, 0.9));
    }
  }
  for (const f of [0.3, 0.7]) { const p = P(f); S.box(p[0], p[1], POND_Y - 0.8, yAt(f) - 0.5, 1.2, w * 0.9, Math.atan2(uz, ux), shade(col, 0.85)); }
}

// statues: the stone mandarins, elephants and horses of src/landmarks/props.js, each on its own ground. local +x
// (a) is the direction the statue faces
function mandarin(S, x, z, a, col = MANDARIN, military = false) {
  P.mandarin(S, x, gY(x, z), z, a, { col, military });
}
function beast(S, x, z, a, big, col = MANDARIN) {
  if (big) P.elephant(S, x, gY(x, z), z, a, { col });
  else P.horse(S, x, gY(x, z), z, a, { col });
}
// two rows a side: beasts first (nearest the gate), then mandarins; statues face the axis
function statueCourt(S, F, s0, s1, { inner = 5, outer = 8, beasts = true, col = MANDARIN } = {}) {
  const n = clamp(Math.floor((s1 - s0) / 4.2) + 1, 2, 6), step = n > 1 ? (s1 - s0) / (n - 1) : 0;
  for (const sd of [-1, 1]) for (let k = 0; k < n; k++) {
    const s = s0 + step * k, face = F.av + (sd > 0 ? Math.PI : 0);
    const pi = F.at(s, sd * inner); mandarin(S, pi[0], pi[1], face, col);
    const po = F.at(s, sd * outer); // the outer row: the military mandarins behind the beasts
    if (beasts && k < 2) beast(S, po[0], po[1], F.a, k === 0, col); else mandarin(S, po[0], po[1], face, col, true);
  }
}
function obelisk(S, x, z, h = 9, col = C.stone) {
  const g = gY(x, z);
  S.kind = KIND.MASONRY; S.base = g - LAND_Y;
  S.box(x, z, g - 0.6, g + 1.3, 2.0, 2.0, 0, shade(col, 0.9));
  S.box(x, z, g + 1.3, g + h - 0.9, 1.15, 1.15, 0, col, { taper: 0.55 });
  S.box(x, z, g + h - 0.9, g + h, 0.7, 0.7, 0, shade(col, 1.05), { taper: 0.05 });
}

// Shared architectural primitives used by per-place tomb replicas (e.g. places/minhmang.js)
export { C as TOMB_COL, gY, groundSpan, rectPts, terrace, levelTop, pav, hallAt, flight, balustrade, wallLine, gate, bridge, mandarin, beast, statueCourt, obelisk };
