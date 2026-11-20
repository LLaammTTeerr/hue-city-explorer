// The Nguyễn royal tombs south-west of the city: Minh Mạng, Tự Đức, Khải Định, Thiệu Trị, Đồng Khánh.
// Each tomb reads its site from data.sites (scripts/build-data.mjs): mapped buildings ('b'), water ('w') and
// historic outlines ('h'). Mapped buildings sit on their own footprints; the axes are taken from pairs of mapped
// buildings; courts, terraces, stairs, statues, walls and bridges are laid out along those axes from the known plan
// of each tomb (illustrative where nothing is mapped). Water itself is drawn elsewhere (POND_Y), never here.
import { KIND, hex, shade, unflat, obb, inRing } from '../geo/buf.js';
import { LAND_Y, POND_Y, PAL } from '../config.js';
import { rise } from '../geo/terrain.js';
import { pavilion } from './citadel.js';
import { replaced } from './places/index.js';

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
function pav(S, cx, cz, w, d, a, floor, { h = null, ...opts } = {}) {
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
function balustrade(S, p0, y0, p1, y1, t, { col, dragon = false } = {}) {
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
  const sites = Object.values(data.sites || {}).filter((st) => st && fin(st.c)).map((st) => [st.c[0] / 10, st.c[1] / 10, (st.r || 300) + 60]); // a site without a centre has no paths, rather than aborting every tomb
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

// statues: mandarins as slim grey boxes, elephants and horses as two or three blocks
function mandarin(S, x, z, a, col = MANDARIN) {
  const g = gY(x, z);
  S.kind = KIND.MASONRY;
  S.box(x, z, g - 0.3, g + 1.6, 0.55, 0.42, a, col);
  S.box(x, z, g + 1.6, g + 2.0, 0.32, 0.32, a, shade(col, 0.94));
}
function beast(S, x, z, a, big, col = MANDARIN) {
  const g = gY(x, z), ux = Math.cos(a), uz = Math.sin(a);
  S.kind = KIND.MASONRY;
  if (big) { // elephant
    S.box(x, z, g - 0.3, g + 1.0, 2.1, 1.0, a, col);
    S.box(x, z, g + 1.0, g + 2.1, 2.6, 1.35, a, col);
    S.box(x + ux * 1.45, z + uz * 1.45, g + 0.6, g + 2.2, 0.8, 1.0, a, shade(col, 0.95));
  } else { // horse
    S.box(x, z, g - 0.3, g + 0.9, 1.5, 0.45, a, col);
    S.box(x, z, g + 0.9, g + 1.55, 1.9, 0.6, a, col);
    S.box(x + ux * 1.0, z + uz * 1.0, g + 1.3, g + 2.15, 0.5, 0.42, a, shade(col, 0.95));
  }
}
// two rows a side: beasts first (nearest the gate), then mandarins; statues face the axis
function statueCourt(S, F, s0, s1, { inner = 5, outer = 8, beasts = true, col = MANDARIN } = {}) {
  const n = clamp(Math.floor((s1 - s0) / 4.2) + 1, 2, 6), step = n > 1 ? (s1 - s0) / (n - 1) : 0;
  for (const sd of [-1, 1]) for (let k = 0; k < n; k++) {
    const s = s0 + step * k, face = F.av + (sd > 0 ? Math.PI : 0);
    const pi = F.at(s, sd * inner); mandarin(S, pi[0], pi[1], face, col);
    const po = F.at(s, sd * outer);
    if (beasts && k < 2) beast(S, po[0], po[1], F.a, k === 0, col); else mandarin(S, po[0], po[1], face, col);
  }
}
function obelisk(S, x, z, h = 9, col = C.stone) {
  const g = gY(x, z);
  S.kind = KIND.MASONRY; S.base = g - LAND_Y;
  S.box(x, z, g - 0.6, g + 1.3, 2.0, 2.0, 0, shade(col, 0.9));
  S.box(x, z, g + 1.3, g + h - 0.9, 1.15, 1.15, 0, col, { taper: 0.55 });
  S.box(x, z, g + h - 0.9, g + h, 0.7, 0.7, 0, shade(col, 1.05), { taper: 0.05 });
}
// an earth tumulus with a few pines, its base bedded below the lowest ground around it
function mound(S, cx, cz, r, h, { trees = 6, ground = null } = {}) {
  const ring = circle(cx, cz, r, 8);
  const lo = ground != null ? ground - 0.4 : groundSpan(ring).lo - 0.6;
  const top = (ground != null ? ground : gY(cx, cz)) + h;
  S.kind = KIND.GROUND; S.base = 0;
  S.cyl(cx, cz, lo, top, r, r * 0.22, 14, C.moss);
  S.kind = KIND.PLAIN;
  for (let i = 0; i < trees; i++) {
    const ang = (i / trees) * Math.PI * 2 + 0.4, rr = r * (i % 2 ? 0.45 : 0.62);
    const x = cx + Math.cos(ang) * rr, z = cz + Math.sin(ang) * rr;
    const yb = top - (top - lo) * ((rr - r * 0.22) / (r * 0.78)) - 0.3;
    S.cyl(x, z, yb, yb + 6.5, 1.7, 0, 6, C.pine, { cap: false });
  }
}
const RAD = Math.PI / 180;

// every mapped building not drawn as something specific becomes a plain tiled hall
function leftovers(S, st, { roof = C.roofYOld, small = C.roofTile, wall = C.lacquerOld, plinthCol = C.stone } = {}) {
  for (const it of st.items) {
    if (it.k !== 'b' || it.used) continue;
    const tiny = Math.max(it.w, it.d) < 8;
    itemHall(S, it, { plinth: tiny ? 0.4 : 0.6, roof: tiny ? small : roof, wall, wallH: tiny ? 2.8 : 3.4, plinthCol, over: tiny ? 0.8 : 1.2 });
  }
}

// =====================================================================================================
// Minh Mạng. Mapped: Đại Hồng Môn, Bi Đình, Hiển Đức Môn, Sùng Ân, Minh Lâu, the Bửu Thành ring, the flanking halls
// and the outbuildings; the axis runs from Đại Hồng Môn to the Bửu Thành; the bridges sit where the axis crosses
// the mapped Trừng Minh and Tân Nguyệt lakes. Illustrative: the triple-gate side bays, statue court, the four court
// terraces, the Sùng Ân enclosure wall, Hoàng Trạch Môn, Minh Lâu's three terraces, the trụ biểu, the Bửu Thành gate
// and stair, the tumulus. The outer La Thành wall is left out.
function minhMang(S, st) {
  if (replaced('minhmang')) return; // drawn by places/minhmang.js
  const dhm = named(st, /dai hong mon/), bt = named(st, /buu thanh/), ml = named(st, /minh lau/);
  const sa = named(st, /sung an/), hdm = named(st, /hien duc mon/), bd = named(st, /bi dinh/);
  const o = dhm ? dhm.c : add(st.c, [243, 30]);
  const tgt = bt ? bt.c : ml ? ml.c : add(st.c, [-175, -22]);
  const F = frame(o, sub(tgt, o));
  const W = waters(st);
  const wet = (p) => W.some((r) => inRing(p[0], p[1], r));
  const sBT = F.s(tgt), R = bt ? (bt.w + bt.d) / 4 : 40;

  // Đại Hồng Môn: the mapped central gate, widened with two lower side bays
  const gw = dhm ? Math.max(dhm.w, dhm.d) : 11, gd = dhm ? Math.min(dhm.w, dhm.d) + 0.6 : 4.8;
  if (dhm) dhm.used = true;
  gate(S, o[0], o[1], F.av, gw, gd, { h: 4.4, rh: 1.8, openings: 1, upper: true, col: C.brickMoss }); // just over 9 m
  for (const sd of [-1, 1]) { const p = F.at(0, sd * (gw / 2 + 3.6)); gate(S, p[0], p[1], F.av, 6.6, gd - 0.8, { h: 4.8, openings: 1, col: C.brickMoss }); }
  // the front of the precinct wall, with Tả Hồng Môn and Hữu Hồng Môn (the gates in use; Đại Hồng Môn opened once,
  // for the funeral) either side of the great gate
  for (const sd of [-1, 1]) {
    wallLine(S, [F.at(0, sd * (gw / 2 + 7)), F.at(0, sd * 23)], 3.2, 1.0, { closed: false });
    const g = F.at(0, sd * 26); gate(S, g[0], g[1], F.av, 6, gd - 1.2, { h: 4.4, openings: 1, col: C.brickMoss, roof: C.roofY });
    wallLine(S, [F.at(0, sd * 29), F.at(0, sd * 48)], 3.2, 1.0, { closed: false });
  }

  // Bái Đình: the salutation court with its rows of mandarins, elephants and horses
  const sBD = bd ? F.s(bd.c) : 51;
  {
    const s0 = 6, s1 = Math.max(s0 + 12, sBD - 10), m = F.at((s0 + s1) / 2);
    terrace(S, m[0], m[1], s1 - s0, 26, F.a, levelTop(m[0], m[1], s1 - s0, 26, F.a, 0.15));
    statueCourt(S, F, s0 + 4, s1 - 3, { inner: 6, outer: 9.5 });
  }
  // Bi Đình on a stepped terrace
  {
    const p = bd ? bd.c : F.at(sBD), w = bd ? bd.w : 12.6, d = bd ? bd.d : 12.3, a = bd ? bd.a : F.a;
    if (bd) bd.used = true;
    let y = levelTop(p[0], p[1], w + 9, d + 9, a, 0.2);
    for (let k = 0; k < 3; k++) { y = terrace(S, p[0], p[1], w + 9 - k * 3, d + 9 - k * 3, a, y + (k ? 0.7 : 0)); }
    flight(S, F.at(sBD - (d + 9) / 2 - 3), y - 1.4, F.at(sBD - (d + 3) / 2), y, 5);
    pav(S, p[0], p[1], w, d, a, y, { tiers: 2, wallH: 3.6, roof: C.roofY, wall: C.lacquer, h: 8.5 });
  }
  // the court before Hiển Đức Môn rises in four shallow terraces
  const sHDM = hdm ? F.s(hdm.c) : 129;
  {
    const s0 = sBD + 10, s1 = sHDM - 6, L = (s1 - s0) / 4;
    if (L > 3) {
      const m = F.at((s0 + s1) / 2);
      let y = groundSpan(rectPts(m[0], m[1], s1 - s0, 32, F.a)).hi;
      for (let k = 0; k < 4; k++) { const p = F.at(s0 + L * (k + 0.5)); y += 0.35; terrace(S, p[0], p[1], L + 0.05, 32 - k * 1.5, F.a, Math.max(y, levelTop(p[0], p[1], L, 32, F.a, 0.1))); }
    }
  }
  // Hiển Đức Môn and the walled Sùng Ân compound behind it
  const cross = spans(F, W, (sa ? F.s(sa.c) : 172) + 14, sBT - R * 0.5);
  const tm = cross[0], tn = cross.length > 1 ? cross[cross.length - 1] : null;
  const sHTM = tm ? tm[0] - 6 : (sa ? F.s(sa.c) : 172) + 36;
  {
    const p = hdm ? hdm.c : F.at(sHDM);
    if (hdm) hdm.used = true;
    gate(S, p[0], p[1], F.av, hdm ? Math.max(hdm.w, hdm.d) : 13, hdm ? Math.min(hdm.w, hdm.d) : 9.5, { h: 4.0, rh: 1.8, openings: 3, upper: true, col: C.lacquerOld, roof: C.roofY });
    wallLine(S, rectRing(F, sHDM, sHTM, -32, 32), 2.4, 0.8);
  }
  // Sùng Ân, some 10 m high on its plinth: one storey under a double roof
  const SA = { plinth: 1.0, tiers: 2, wallH: 3.6, roof: C.roofY, wall: C.lacquer, over: 1.6, h: 9 };
  if (sa) itemHall(S, sa, SA);
  else { const p = F.at(172); hallAt(S, p[0], p[1], 25, 22.8, F.a, SA); }
  { const p = F.at(sHTM); gate(S, p[0], p[1], F.av, 9, 4.2, { h: 4, openings: 3, col: C.brickMoss, roof: C.roofY }); }

  // three bridges over Trừng Minh: Trung Đạo in the middle, Tả Phù and Hữu Bật either side
  if (tm) for (const t of [-9, 0, 9]) bridge(S, F.at(tm[0] - 3, t), F.at(tm[1] + 3, t), t ? 3.4 : 5, { col: t ? C.stone : C.stucco });
  // Minh Lâu on its three terraces (Tam Tài), two trụ biểu behind it
  const sML = ml ? F.s(ml.c) : tm ? tm[1] + 25 : 260;
  {
    const p = ml ? ml.c : F.at(sML), w = ml ? ml.w : 12.5, d = ml ? ml.d : 12.4, a = ml ? ml.a : F.a;
    if (ml) ml.used = true;
    let y = levelTop(p[0], p[1], 30, 30, F.a, 0.2);
    for (let k = 0; k < 3; k++) {
      const size = 30 - k * 6;
      y = terrace(S, p[0], p[1], size, size, F.a, y + (k ? 1.2 : 0));
      flight(S, F.at(sML - size / 2 - 2.6), y - (k ? 1.2 : 0.6), F.at(sML - size / 2), y, 5);
    }
    pav(S, p[0], p[1], w, d, a, y, { tiers: 2, wallH: 3.8, roof: C.roofY, wall: C.lacquer, h: 9.6 }); // ~13-14 m over the court
    for (const sd of [-1, 1]) {
      let q = F.at(sML + 16, sd * 20);
      if (wet(q)) q = F.at(sML + 10, sd * 15);
      if (!wet(q)) obelisk(S, q[0], q[1], 10);
    }
  }
  // the stone bridge over Tân Nguyệt, the stair up to the Bửu Thành gate
  let sGate = sBT - R;
  if (bt) { const inside = spans(F, [bt.ring], sML + 10, sBT); if (inside.length) sGate = inside[0][0]; }
  if (tn && tn !== tm) {
    bridge(S, F.at(tn[0] - 3), F.at(tn[1] + 3), 6, { arch: 0.9 });
    const a = F.at(tn[1] + 3), b = F.at(sGate - 2.5);
    if (sGate - 2.5 > tn[1] + 4) flight(S, a, gY(a[0], a[1]), b, gY(b[0], b[1]) + 0.3, 6, { rail: 1 });
  }
  // Bửu Thành: the circular wall round the wooded mound
  if (bt) { bt.used = true; wallLine(S, bt.ring, 3.5, 1.4, { maxSeg: 9 }); }
  else wallLine(S, circle(tgt[0], tgt[1], R, 28), 3.5, 1.4);
  { const p = F.at(sGate); gate(S, p[0], p[1], F.av, 6.4, 2.6, { h: 4.2, openings: 1, col: C.brickMoss, roof: C.roofYOld }); }
  mound(S, tgt[0], tgt[1], R * 0.6, 4, { trees: 10 });
  leftovers(S, st);
}

// =====================================================================================================
// Tự Đức. Mapped: Khiêm Cung Môn, Hòa Khiêm, Lương Khiêm, Minh Khiêm Đường, Chí Khiêm Đường, Xung Khiêm Tạ and
// Dũ Khiêm Tạ (on stilts), the square stele house, the sarcophagus house, the crescent pond, every outbuilding.
// The temple axis runs Lương Khiêm → Khiêm Cung Môn; the tomb axis runs from the stele house to the sarcophagus.
// Illustrative: the steps down to Lưu Khiêm, the Khiêm Cung wall, the Bái Đình court and statues, the two obelisks,
// the bridge over the crescent pond, the Bửu Thành wall, its gate and screen. The stele house is drawn roofless.
function tuDuc(S, st) {
  const lk = named(st, /luong khiem/), hk = named(st, /hoa khiem/), kcm = named(st, /khiem cung mon/);
  const mkd = named(st, /minh khiem/), ckd = named(st, /chi khiem/), xkt = named(st, /xung khiem/);
  const lake = st.items.find((i) => i.k === 'w' && /luu khiem/.test(i.key)) || st.items.filter((i) => i.k === 'w').sort((a, b) => b.w - a.w)[0];
  const kp = kcm ? kcm.c : add(st.c, [28, 42]);
  const F = frame(kp, lk ? sub(kp, lk.c) : [1, -0.08]);

  // Khiêm Cung Môn, a two-storey gate at the head of the steps from the lake
  if (kcm) kcm.used = true;
  const gTop = groundSpan(rectPts(kp[0], kp[1], 12, 11, F.a)).hi;
  gate(S, kp[0], kp[1], F.av, kcm ? Math.max(kcm.w, kcm.d) : 12.5, kcm ? Math.min(kcm.w, kcm.d) : 11, { h: 4.0, rh: 1.8, openings: 3, upper: true, col: C.brickMoss, roof: C.roofYOld, floor: gTop });
  {
    const d0 = (kcm ? Math.min(kcm.w, kcm.d) : 11) / 2 + 0.3;
    let best = d0 + 6, by = Infinity;
    for (let s = d0 + 3; s <= d0 + 45; s += 1) {
      const p = F.at(s + 2);
      if (lake && inRing(p[0], p[1], lake.ring)) break;
      const y = gY(...F.at(s));
      if (y < by - 0.05) { by = y; best = s; }
    }
    const a = F.at(best), b = F.at(d0);
    flight(S, a, gY(a[0], a[1]), b, gTop, 7, { rail: 1 });
  }
  // the compound wall round the halls of Khiêm Cung
  {
    const inC = [lk, hk, mkd, nearest(st, 14, 12, 8), nearest(st, 15, 72, 8), nearest(st, -29, 70, 8)].filter(Boolean);
    if (inC.length >= 2) {
      let s0 = 0, t0 = Infinity, t1 = -Infinity;
      for (const it of inC) for (const p of it.ring) { s0 = Math.min(s0, F.s(p)); t0 = Math.min(t0, F.t(p)); t1 = Math.max(t1, F.t(p)); }
      wallLine(S, rectRing(F, s0 - 5, 0, t0 - 4, t1 + 4), 2.4, 0.8);
    }
  }
  for (const it of [hk, lk]) if (it) itemHall(S, it, { plinth: 0.9, wallH: 3.8, roof: C.roofYOld, wall: C.lacquer, h: 7.6 }); // ~8-9 m
  if (mkd) itemHall(S, mkd, { plinth: 0.9, wallH: 4.2, roof: C.roofYOld, wall: C.lacquer, h: 8 });
  if (ckd) itemHall(S, ckd, { plinth: 0.8, wallH: 3.6, roof: C.roofTile });
  // the two water pavilions standing out over Lưu Khiêm
  for (const it of [xkt, nearest(st, 75, 39, 8)]) if (it) { it.used = true; stilts(S, it.c[0], it.c[1], it.w, it.d, it.a); }

  // the tomb proper: Bái Đình court → stele house between two obelisks → crescent pond → walled Bửu Thành
  const bdT = nearest(st, -65, -31, 10), sar = nearest(st, -130, -22, 10), back = nearest(st, -158, -18, 10);
  const bp = bdT ? bdT.c : add(st.c, [-65, -31]);
  const T = frame(bp, sar ? sub(sar.c, bp) : [-1, 0.1]);
  const bw = bdT ? Math.max(bdT.w, bdT.d) : 12.7;
  // Bái Đình
  {
    const s0 = -bw / 2 - 26, s1 = -bw / 2 - 3, m = T.at((s0 + s1) / 2);
    const top = terrace(S, m[0], m[1], s1 - s0, 20, T.a, levelTop(m[0], m[1], s1 - s0, 20, T.a, 0.15));
    const f = T.at(s0 - 3);
    flight(S, f, gY(f[0], f[1]), T.at(s0), top, 5);
    statueCourt(S, frame(T.at(0), [-T.ux, -T.uz]), -(s1 - 2), -(s0 + 3), { inner: 4.5, outer: 7.5 });
  }
  // stele house: massive brick walls round the great stele, open to the sky
  {
    if (bdT) bdT.used = true;
    const top = terrace(S, bp[0], bp[1], bw + 4, bw + 4, T.a, levelTop(bp[0], bp[1], bw + 4, bw + 4, T.a, 0.5));
    const h = 6.2, th = 1.7, hw = bw / 2;
    S.kind = KIND.MASONRY; S.base = top - LAND_Y;
    for (const sd of [-1, 1]) {
      const sp = T.at(0, sd * (hw - th / 2)); S.box(sp[0], sp[1], top, top + h, bw, th, T.a, C.brickMoss, { top: C.stoneDark });
      const fr = T.at(sd * (hw - th / 2), 0);
      for (const q of [-1, 1]) { const pp = T.at(sd * (hw - th / 2), q * (hw / 2 + 0.9)); S.box(pp[0], pp[1], top, top + h, th, hw - 1.8, T.a, C.brickMoss, { top: C.stoneDark }); }
      S.box(fr[0], fr[1], top + 3.8, top + h, th, 3.6, T.a, C.brickMoss, { top: C.stoneDark });
    }
    S.box(bp[0], bp[1], top, top + 0.8, 3.2, 1.6, T.a, C.stoneDark);
    S.box(bp[0], bp[1], top + 0.8, top + 5.0, 0.6, 2.4, T.a, C.stoneGrey, { taper: 0.94 });
    for (const sd of [-1, 1]) { const q = T.at(-1, sd * (hw + 4.5)); obelisk(S, q[0], q[1], 10); }
  }
  // the crescent pond, crossed on a stone bridge
  const pond = st.items.filter((i) => i.k === 'w' && i !== lake).sort((a, b) => Math.hypot(a.c[0] - bp[0], a.c[1] - bp[1]) - Math.hypot(b.c[0] - bp[0], b.c[1] - bp[1]))[0];
  let s0 = (sar ? T.s(sar.c) : 65) - 14;
  if (pond && Math.hypot(pond.c[0] - bp[0], pond.c[1] - bp[1]) < 80) {
    const cr = spans(T, [pond.ring], bw / 2 + 1, s0 + 10);
    if (cr.length) { bridge(S, T.at(cr[0][0] - 2), T.at(cr[0][1] + 2), 3.6); s0 = Math.max(s0, cr[0][1] + 3); }
  }
  // Bửu Thành: the walled precinct of the tomb, a bronze-doored gate, a screen, the stone sarcophagus house
  {
    let s1 = s0 + 40, tw = 14;
    for (const it of [sar, back]) if (it) { s1 = Math.max(s1, T.s(it.c) + Math.max(it.w, it.d) / 2 + 6); tw = Math.max(tw, Math.abs(T.t(it.c)) + Math.max(it.w, it.d) / 2 + 6); }
    s1 = Math.min(s1, s0 + 80);
    wallLine(S, rectRing(T, s0, s1, -tw, tw), 3.4, 1.2);
    const g = T.at(s0); gate(S, g[0], g[1], T.av, 5.6, 2.4, { h: 4.0, openings: 1, roof: null, col: C.brickMoss });
    const sc = T.at(s0 + 5), sy = gY(sc[0], sc[1]);
    S.kind = KIND.MASONRY; S.base = sy - LAND_Y;
    S.box(sc[0], sc[1], sy - 0.6, sy + 2.8, 0.8, 7, T.a, C.brickMoss, { top: C.stoneDark });
    if (sar) {
      sar.used = true;
      const f = levelTop(sar.c[0], sar.c[1], sar.w + 2, sar.d + 2, sar.a, 0.9);
      terrace(S, sar.c[0], sar.c[1], sar.w + 2, sar.d + 2, sar.a, f, C.stoneDark);
      S.kind = KIND.MASONRY; S.base = f - LAND_Y;
      S.box(sar.c[0], sar.c[1], f, f + 1.8, sar.w, sar.d, sar.a, C.stoneGrey);
      const ww = Math.max(sar.w, sar.d), dd = Math.min(sar.w, sar.d), aa = sar.w >= sar.d ? sar.a : sar.a + Math.PI / 2;
      S.hip(sar.c[0], sar.c[1], ww, dd, aa, f + 1.8, 1.3, C.stoneDark, { over: 0.4 });
    }
  }
  leftovers(S, st);
}

// =====================================================================================================
// Khải Định. Mapped: Cung Thiên Định and every outbuilding; the axis is the long axis of the mapped "Lăng Khải Định"
// outline (pointing at the palace), falling back to the line from the lowest building to the palace, then to the
// steepest descent from the site centre. On the mapped data the two mapped side houses (Tả/Hữu Tòng Tự) and the
// stele house land on the first and second terraces. Illustrative: the terrace levels (set by the ground under
// them), the stairs and dragon balustrades, the iron gate, the mandarins, the obelisks, the octagonal stele
// pavilion shape, the palace massing. Dark grey concrete with pale trim.
function khaiDinh(S, st) {
  const pal = named(st, /thien dinh/) || st.items.filter((i) => i.k === 'b').sort((a, b) => b.w * b.d - a.w * a.d)[0] || null;
  const out = named(st, /khai dinh/, 'h') || st.items.filter((i) => i.k === 'h').sort((a, b) => b.w - a.w)[0] || null;
  let F, len = 110;
  if (out && out.w > 40) {
    let u = [Math.cos(out.a), Math.sin(out.a)];
    const up = pal ? (pal.c[0] - out.c[0]) * u[0] + (pal.c[1] - out.c[1]) * u[1] : rise(out.c[0] + u[0] * 40, out.c[1] + u[1] * 40) - rise(out.c[0] - u[0] * 40, out.c[1] - u[1] * 40);
    if (up < 0) u = [-u[0], -u[1]];
    len = clamp(out.w, 80, 140);
    F = frame([out.c[0] - (u[0] * len) / 2, out.c[1] - (u[1] * len) / 2], u);
  } else if (pal) {
    const low = st.items.filter((i) => i.k === 'b' && i !== pal).sort((a, b) => gY(...a.c) - gY(...b.c))[0];
    const u = low ? sub(pal.c, low.c) : [0, -1];
    F = frame([0, 0], u); F = frame(sub(pal.c, F.at(95)), u);
  } else {
    // no footprint: the palace stands at the site centre and the stairs run down the steepest descent of rise()
    const c = st.c; let bd = [0, 1], drop = -Infinity;
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, d = [Math.cos(a), Math.sin(a)]; const dr = rise(c[0], c[1]) - rise(c[0] + d[0] * 60, c[1] + d[1] * 60); if (dr > drop) { drop = dr; bd = d; } }
    F = frame([c[0] + bd[0] * 95, c[1] + bd[1] * 95], [-bd[0], -bd[1]]);
  }
  const sPal = pal ? clamp(F.s(pal.c), 70, len + 10) : 95;
  const k = sPal / 95; // stretch the plan to the palace position
  const lv = (s0, s1, w, lift = 0.2) => { const m = F.at((s0 + s1) / 2); return levelTop(m[0], m[1], s1 - s0, w, F.a, lift); };
  const ter = (s0, s1, w, top) => { const m = F.at((s0 + s1) / 2); return terrace(S, m[0], m[1], s1 - s0, w, F.a, top, C.kdWall); };
  const rail = { col: C.kdWall, rail: 1, railCol: C.kdTrim };

  // levels: forecourt (Tòng Tự), mandarin court (stele), two landings, palace terrace
  const A = [4 * k, 25 * k], B = [30 * k, 60 * k], L1 = [64 * k, 68 * k], L2 = [72 * k, 76 * k];
  const pd = pal ? Math.min(pal.w, pal.d) : 24, P = [sPal - pd / 2 - 3, sPal + pd / 2 + 3];
  const T1 = lv(A[0], A[1], 44), T2 = Math.max(T1 + 1, lv(B[0], B[1], 40)), T3 = Math.max(T2 + 3, lv(P[0], P[1], 46, 0.4));
  const TL1 = T2 + (T3 - T2) / 3, TL2 = T2 + ((T3 - T2) * 2) / 3;
  ter(A[0], A[1], 44, T1); ter(B[0], B[1], 40, T2); ter(L1[0], L1[1], 16, TL1); ter(L2[0], L2[1], 16, TL2); ter(P[0], P[1], 46, T3);

  // the great stair with dragon balustrades, the triple iron gate at its head
  // the 37 steps from the road climb in three paths (a wide middle one, two narrow ones) between four dragon
  // balustrades
  {
    const f0 = -14 * k, f = F.at(f0), y0 = gY(f[0], f[1]);
    for (const [t, w] of [[0, 4.6], [-4.4, 2.6], [4.4, 2.6]]) flight(S, F.at(f0, t), y0, F.at(A[0], t), T1, w, { col: C.kdWall });
    for (const t of [-6.05, -2.65, 2.65, 6.05]) balustrade(S, F.at(f0, t), y0, F.at(A[0], t), T1, 0, { col: C.kdTrim, dragon: true });
  }
  {
    S.kind = KIND.MASONRY; S.base = T1 - LAND_Y;
    for (const t of [-8.5, -3, 3, 8.5]) { const p = F.at(A[0] + 1.5, t); S.box(p[0], p[1], T1, T1 + 6.2, 1.5, 1.5, F.a, C.kdWall, { top: C.kdTrim }); S.box(p[0], p[1], T1 + 6.2, T1 + 7.2, 1.9, 1.9, F.a, C.kdTrim, { taper: 0.4 }); }
    S.kind = KIND.PLAIN;
    for (const [t, w] of [[-5.75, 4], [0, 4.5], [5.75, 4]]) { const p = F.at(A[0] + 1.5, t); S.box(p[0], p[1], T1, T1 + (t ? 3.4 : 4.2), 0.2, w, F.a, C.iron); }
  }
  // Tả/Hữu Tòng Tự on the forecourt
  const sides = st.items.filter((i) => i.k === 'b' && !i.used && i !== pal && Math.abs(F.t(i.c)) > 8 && Math.abs(F.t(i.c)) < 24 && F.s(i.c) > A[0] && F.s(i.c) < A[1]);
  if (sides.length) for (const it of sides) itemHall(S, it, { floor: T1, wallH: 3.2, roof: C.kdRoof, wall: C.kdWall });
  else for (const sd of [-1, 1]) { const p = F.at((A[0] + A[1]) / 2 + 2, sd * 17); hallAt(S, p[0], p[1], 17, 8.6, F.a, { floor: T1, roof: C.kdRoof, wall: C.kdWall }); }
  // stair to the mandarin court; two rows of mandarins with an elephant and a horse; the stele pavilion and obelisks
  flight(S, F.at(A[1]), T1, F.at(B[0]), T2, 9, rail);
  statueCourt(S, F, B[0] + 2, B[0] + 11, { inner: 4.5, outer: 7.5, col: hex('#8d8a84') });
  {
    const stele = st.items.find((i) => i.k === 'b' && !i.used && i !== pal && Math.abs(F.t(i.c)) < 6 && F.s(i.c) > B[0] && F.s(i.c) < B[1]);
    if (stele) stele.used = true;
    const sp = F.at(stele ? F.s(stele.c) : 46 * k), rot = F.a + Math.PI / 8;
    S.kind = KIND.MASONRY; S.base = T2 - LAND_Y;
    S.cyl(sp[0], sp[1], T2 - 0.4, T2 + 0.8, 7.2, 7.0, 8, C.kdTrim, { rot });
    S.cyl(sp[0], sp[1], T2 + 0.8, T2 + 5.0, 5.0, 5.0, 8, C.kdWall, { rot, cap: false });
    S.kind = KIND.TILE;
    S.cyl(sp[0], sp[1], T2 + 5.0, T2 + 6.4, 6.6, 4.0, 8, C.kdRoof, { rot });
    S.kind = KIND.MASONRY;
    S.cyl(sp[0], sp[1], T2 + 6.4, T2 + 9.0, 3.5, 3.5, 8, C.kdWall, { rot, cap: false });
    S.kind = KIND.TILE;
    S.cyl(sp[0], sp[1], T2 + 9.0, T2 + 11.6, 4.9, 0.25, 8, C.kdRoof, { rot });
    for (const sd of [-1, 1]) { const q = F.at(F.s(sp), sd * 14); obelisk(S, q[0], q[1], 12, C.kdWall); }
  }
  // three more flights over two landings to the palace
  // the three upper flights (13 steps each) also run between dragon balustrades
  const drail = { ...rail, dragon: true };
  flight(S, F.at(B[1]), T2, F.at(L1[0]), TL1, 7, drail);
  flight(S, F.at(L1[1]), TL1, F.at(L2[0]), TL2, 7, drail);
  flight(S, F.at(L2[1]), TL2, F.at(P[0]), T3, 7, drail);
  // the two concrete flagpoles on the middle landing
  S.kind = KIND.MASONRY; S.base = TL2 - LAND_Y;
  for (const sd of [-1, 1]) {
    const q = F.at((L2[0] + L2[1]) / 2, sd * 6.5);
    S.box(q[0], q[1], TL2, TL2 + 1.2, 1.6, 1.6, F.a, C.kdTrim);
    S.box(q[0], q[1], TL2 + 1.2, TL2 + 13, 0.5, 0.5, F.a, C.kdWall, { taper: 0.6 });
  }
  // the fence round the whole 117 × 48.5 m precinct, from the foot of the great stair to behind the palace
  { const s0 = -14 * k + 1, s1 = P[1] + 2; wallLine(S, [F.at(s0, -7.6), F.at(s0, -24.25), F.at(s1, -24.25), F.at(s1, 24.25), F.at(s0, 24.25), F.at(s0, 7.6)], 2.0, 0.6, { col: C.kdWall, cap: C.kdTrim, closed: false }); }
  // Cung Thiên Định: front hall, raised central hall, rear sanctuary; dark roofs, pale columns
  {
    const pc = pal ? pal.c : F.at(sPal), pw = pal ? Math.max(pal.w, pal.d) : 34;
    if (pal) pal.used = true;
    const y = T3 + 0.9, s = F.s(pc), t = F.t(pc);
    S.kind = KIND.MASONRY; S.base = T3 - LAND_Y;
    S.box(pc[0], pc[1], T3, y, pd + 1.5, pw + 1.5, F.a, C.kdTrim, { topKind: KIND.ROAD });
    S.box(pc[0], pc[1], y, y + 5.4, pd * 0.7, pw, F.a, C.kdWall, { top: C.kdRoof });
    S.hip(pc[0], pc[1], pw, pd * 0.7, F.av, y + 5.4, 2.4, C.kdRoof, { flare: 0.4, over: 1.2, fascia: 0.3, fasciaCol: C.kdTrim, ridgeCol: C.kdTrim, hips: true });
    const cy = y + 5.4 + 1.0;
    S.kind = KIND.MASONRY;
    S.box(pc[0], pc[1], cy, cy + 3.2, pd * 0.42, pw * 0.45, F.a, C.kdWall);
    S.hip(pc[0], pc[1], pw * 0.45, pd * 0.42, F.av, cy + 3.2, 2.2, C.kdRoof, { flare: 0.35, over: 0.9, fascia: 0.25, fasciaCol: C.kdTrim, ridgeCol: C.kdTrim, hips: true });
    const rp = F.at(s + pd * 0.42, t);
    S.kind = KIND.MASONRY;
    S.box(rp[0], rp[1], y, y + 6.6, pd * 0.22, pw * 0.5, F.a, C.kdWall);
    S.hip(rp[0], rp[1], pw * 0.5, pd * 0.22, F.av, y + 6.6, 1.8, C.kdRoof, { flare: 0.3, over: 0.8, ridgeCol: C.kdTrim, hips: true });
    // front portico columns
    S.kind = KIND.PLAIN;
    for (let i = 0; i < 8; i++) { const q = F.at(s - pd * 0.35 - 1.4, t + (i / 7 - 0.5) * pw * 0.8); S.box(q[0], q[1], y, y + 5.4, 0.55, 0.55, F.a, C.kdTrim); }
  }
  leftovers(S, st, { roof: C.kdRoof, small: C.kdRoof, wall: C.kdWall, plinthCol: C.kdWall });
}

// =====================================================================================================
// Thiệu Trị. Two parallel axes facing north-west, no outer wall. Mapped: Biểu Đức Điện, Hồng Trạch Môn and the four
// side halls (temple axis), the Bi Đình and Đức Hinh Lâu (tomb axis), the front lake. Illustrative: the temple
// enclosure wall, the three bridges (placed where the tomb axis crosses the mapped lake), the statue court, the
// terraces, and the Bửu Thành: its island was lost from the water data, so it is placed on the axis 40 m behind
// Đức Hinh Lâu, on an island embankment when that point is in water, with a bridge from the shore.
function thieuTri(S, st) {
  const bdd = nearest(st, -57, 42, 10), htm = nearest(st, -89, 16, 8);
  const hp = htm ? htm.c : add(st.c, [-89, 16]);
  const F = frame(hp, bdd ? sub(hp, bdd.c) : [-0.78, -0.63]);
  // temple: Hồng Trạch Môn, Biểu Đức Điện, side halls, all in a walled court
  {
    const inC = [htm, bdd, nearest(st, -64, 9, 8), nearest(st, -91, 40, 8), nearest(st, -33, 36, 8), nearest(st, -60, 68, 8)].filter(Boolean);
    let s0 = -60, t0 = -25, t1 = 25;
    if (inC.length >= 2) { s0 = 0; t0 = Infinity; t1 = -Infinity; for (const it of inC) for (const p of it.ring) { s0 = Math.min(s0, F.s(p)); t0 = Math.min(t0, F.t(p)); t1 = Math.max(t1, F.t(p)); } }
    wallLine(S, rectRing(F, s0 - 5, 0, t0 - 5, t1 + 5), 2.4, 0.8);
    if (htm) htm.used = true;
    const gw = htm ? Math.max(htm.w, htm.d) : 10.8, gd = htm ? Math.min(htm.w, htm.d) : 8.4;
    const gf = groundSpan(rectPts(hp[0], hp[1], gw, gd, F.av)).hi;
    gate(S, hp[0], hp[1], F.av, gw, gd, { h: 4.0, rh: 1.8, openings: 3, upper: true, col: C.lacquerOld, roof: C.roofY, floor: gf });
    const f = F.at(gd / 2 + 4);
    flight(S, f, gY(f[0], f[1]), F.at(gd / 2), gf, 6);
    if (bdd) itemHall(S, bdd, { plinth: 1.0, tiers: 2, wallH: 3.6, roof: C.roofY, wall: C.lacquer, over: 1.5, h: 8 }); // ~9 m
  }
  // tomb: lake with three bridges → statue court → Bi Đình → Đức Hinh Lâu → Bửu Thành on its island
  const bdT = nearest(st, -2, -108, 10), dhl = nearest(st, 28, -85, 10);
  const bp = bdT ? bdT.c : add(st.c, [-2, -108]);
  const T = frame(bp, bdT && dhl ? sub(bp, dhl.c) : [F.ux, F.uz]);
  const W = waters(st);
  const lake = st.items.filter((i) => i.k === 'w').map((i) => ({ i, d: Math.hypot(i.c[0] - (st.c[0] - 84), i.c[1] - (st.c[1] - 164)) })).sort((a, b) => a.d - b.d)[0];
  const cr = lake && lake.d < 40 ? spans(T, [lake.i.ring], 8, 180)[0] : null;
  if (cr) for (const t of [-8, 0, 8]) bridge(S, T.at(cr[0] - 3, t), T.at(cr[1] + 3, t), t ? 3.4 : 4.6, { col: t ? C.stone : C.stucco });
  {
    const s1 = cr ? Math.min(cr[0] - 6, 44) : 40, s0 = 10;
    if (s1 - s0 > 10) {
      const m = T.at((s0 + s1) / 2);
      terrace(S, m[0], m[1], s1 - s0, 22, T.a, levelTop(m[0], m[1], s1 - s0, 22, T.a, 0.15));
      statueCourt(S, frame(T.at(0), [-T.ux, -T.uz]), -(s1 - 2), -(s0 + 2), { inner: 5, outer: 8 });
    }
  }
  {
    const w = bdT ? bdT.w : 13.4, d = bdT ? bdT.d : 12.3, a = bdT ? bdT.a : T.a;
    if (bdT) bdT.used = true;
    let y = levelTop(bp[0], bp[1], w + 7, d + 7, a, 0.2);
    y = terrace(S, bp[0], bp[1], w + 7, d + 7, a, y);
    y = terrace(S, bp[0], bp[1], w + 3.5, d + 3.5, a, y + 0.7);
    flight(S, T.at(d / 2 + 6.5), y - 1.2, T.at(d / 2 + 1.75), y, 4);
    pav(S, bp[0], bp[1], w, d, a, y, { tiers: 2, wallH: 3.6, roof: C.roofY, wall: C.lacquer, h: 8.5 });
  }
  const dp = dhl ? dhl.c : T.at(-38);
  {
    const w = dhl ? dhl.w : 19.3, d = dhl ? dhl.d : 16.7, a = dhl ? dhl.a : T.a;
    if (dhl) dhl.used = true;
    let y = levelTop(dp[0], dp[1], w + 10, d + 10, a, 0.2);
    for (let k = 0; k < 3; k++) y = terrace(S, dp[0], dp[1], w + 10 - k * 3.3, d + 10 - k * 3.3, a, y + (k ? 1.0 : 0));
    const sD = T.s(dp);
    flight(S, T.at(sD + (d + 10) / 2 + 2.5), y - 2.0, T.at(sD + (d + 3.4) / 2), y, 5);
    pav(S, dp[0], dp[1], w, d, a, y, { tiers: 2, wallH: 3.8, roof: C.roofY, wall: C.lacquer, h: 9 }); // ~12 m over the court
  }
  {
    const sD = T.s(dp), dd = dhl ? Math.min(dhl.w, dhl.d) : 16.7, sI = sD - dd / 2 - 40, ip = T.at(sI), R = 16;
    const wet = W.some((r) => inRing(ip[0], ip[1], r)), isle = LAND_Y + rise(ip[0], ip[1]) + 0.3;
    if (wet) {
      S.kind = KIND.MASONRY; S.base = 0;
      S.cyl(ip[0], ip[1], POND_Y - 1, isle, R + 2, R + 2, 22, C.stoneDark);
      wallLine(S, circle(ip[0], ip[1], R, 22), 2.8, 1.0, { ground: isle });
      mound(S, ip[0], ip[1], R * 0.62, 3.2, { trees: 6, ground: isle });
      const sh = spans(T, W, sI + R + 2, sD - dd / 2 - 1, 0, 0.5);
      const shore = sh.length ? sh[sh.length - 1][1] + 2 : sD - dd / 2 - 3;
      bridge(S, T.at(shore), T.at(sI + R + 1.5), 4, { arch: 0.4 });
    } else {
      wallLine(S, circle(ip[0], ip[1], R, 22), 2.8, 1.0);
      mound(S, ip[0], ip[1], R * 0.62, 3.2, { trees: 6 });
    }
    const g = T.at(sI + R), gy = wet ? isle : null;
    gate(S, g[0], g[1], T.av, 5, 2.2, { h: 3.6, openings: 1, roof: C.roofYOld, floor: gy });
  }
  leftovers(S, st);
}

// =====================================================================================================
// Đồng Khánh. Mapped: Ngưng Hy Điện (drawn as three joined halls), its side halls and pond, the hill-top stele house,
// the small walled family tombs ('h': Lăng Thánh Cung and others). Illustrative: the temple wall and gate, the three-
// hall massing, the stele house's European details, the tomb court and its Bửu Thành (oriented down the slope of the
// hill, which is a guess), the graves inside the small enclosures.
function dongKhanh(S, st) {
  const nhd = nearest(st, -11, -93, 12);
  const sideHalls = [nearest(st, 24, -54, 8), nearest(st, -1, -64, 8), nearest(st, 30, -85, 8)].filter(Boolean);
  const pond = st.items.find((i) => i.k === 'w');
  if (nhd) {
    nhd.used = true;
    let tgt = null;
    if (sideHalls.length) { tgt = [0, 0]; for (const h of sideHalls) { tgt[0] += h.c[0] / sideHalls.length; tgt[1] += h.c[1] / sideHalls.length; } }
    else if (pond) tgt = pond.c;
    const F = frame(nhd.c, tgt ? sub(tgt, nhd.c) : [1, 0.9]);
    let s0 = Infinity, s1 = -Infinity, t0 = Infinity, t1 = -Infinity;
    for (const p of nhd.ring) { s0 = Math.min(s0, F.s(p)); s1 = Math.max(s1, F.s(p)); t0 = Math.min(t0, F.t(p)); t1 = Math.max(t1, F.t(p)); }
    const D = s1 - s0, Wd = t1 - t0, mc = F.at((s0 + s1) / 2, (t0 + t1) / 2), ct = F.t(mc);
    const top = terrace(S, mc[0], mc[1], D + 2, Wd + 2, F.a, levelTop(mc[0], mc[1], D + 2, Wd + 2, F.a, 0.8));
    // tiền điện, chính điện, hậu điện under three roofs that touch
    for (let k = 0; k < 3; k++) {
      const p = F.at(s1 - (D * (k + 0.5)) / 3, ct);
      pav(S, p[0], p[1], Wd * (k === 1 ? 0.98 : 0.9), D / 3 - 0.3, F.av, top, { wallH: k === 1 ? 3.8 : 3.4, roof: C.roofY, wall: C.lacquer, over: 1.0, h: k === 1 ? 7.4 : 6.6 }); // ~8-9 m
    }
    // the temple court wall with a three-way gate facing the pond
    let a0 = s0, a1 = s1, b0 = t0, b1 = t1;
    for (const h of sideHalls) for (const p of h.ring) { a0 = Math.min(a0, F.s(p)); a1 = Math.max(a1, F.s(p)); b0 = Math.min(b0, F.t(p)); b1 = Math.max(b1, F.t(p)); }
    const fs = a1 + 6;
    let front = fs;
    if (pond) { const wet = spans(F, [pond.ring], s1, fs + 30, ct); if (wet.length && wet[0][0] < fs + 2) front = wet[0][0] - 3; }
    wallLine(S, rectRing(F, a0 - 5, front, b0 - 5, b1 + 5), 2.2, 0.7);
    const g = F.at(front, ct); gate(S, g[0], g[1], F.av, 10, 3, { h: 3.8, openings: 3, roof: C.roofY, col: C.brickMoss });
  }
  // the tomb on its hill: a brick stele house with pilasters and cornice, a statue court below, Bửu Thành above
  const bdk = nearest(st, -106, -17, 10);
  if (bdk) {
    bdk.used = true;
    const c = bdk.c; let up = [1, 0], best = -Infinity;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, d = [Math.cos(a), Math.sin(a)]; const r = rise(c[0] + d[0] * 18, c[1] + d[1] * 18); if (r > best) { best = r; up = d; } }
    const T = frame(c, up);
    const w = Math.max(bdk.w, bdk.d), d = Math.min(bdk.w, bdk.d);
    const floor = terrace(S, c[0], c[1], w + 5, w + 5, T.a, levelTop(c[0], c[1], w + 5, w + 5, T.a, 0.9));
    S.kind = KIND.MASONRY; S.base = floor - LAND_Y;
    S.box(c[0], c[1], floor, floor + 4.6, d, w, T.a, C.brickWarm);
    S.box(c[0], c[1], floor + 4.6, floor + 5.2, d + 0.6, w + 0.6, T.a, C.stucco);
    for (const a of [-1, 1]) for (const b of [-1, 1]) { const p = T.at(a * (d / 2), b * (w / 2)); S.box(p[0], p[1], floor, floor + 4.6, 0.8, 0.8, T.a, C.stucco); }
    S.kind = KIND.PLAIN;
    for (const sd of [-1, 1]) { const p = T.at(sd * (d / 2)); S.box(p[0], p[1], floor, floor + 3.2, 0.12, 2.4, T.a, C.door); S.box(p[0], p[1], floor + 3.2, floor + 3.8, 0.14, 2.4, T.a, C.stucco); }
    S.base = floor - LAND_Y;
    S.hip(c[0], c[1], w, d, T.av, floor + 5.2, 1.6, C.roofY, { flare: 0.4, over: 1.0, fascia: 0.25, ridgeCol: RIDGE, hips: true, glazed: true });
    S.kind = KIND.MASONRY;
    S.box(c[0], c[1], floor + 6.0, floor + 7.6, d * 0.6, w * 0.6, T.a, C.brickWarm);
    S.hip(c[0], c[1], w * 0.6, d * 0.6, T.av, floor + 7.6, 1.6, C.roofY, { flare: 0.35, over: 0.8, ridgeCol: RIDGE, hips: true, glazed: true });
    // statue court below, stair down to it
    const cs0 = -(w / 2 + 22), cs1 = -(w / 2 + 4), m = T.at((cs0 + cs1) / 2);
    const ct = terrace(S, m[0], m[1], cs1 - cs0, 16, T.a, Math.min(floor - 0.4, levelTop(m[0], m[1], cs1 - cs0, 16, T.a, 0.15)));
    flight(S, T.at(cs1), ct, T.at(-(w + 5) / 2), floor, 4);
    statueCourt(S, T, cs0 + 2, cs1 - 2, { inner: 4, outer: 6.5 });
    // Bửu Thành: a low wall round the grave on the slope above
    const b0 = w / 2 + 6, b1 = b0 + 18;
    wallLine(S, [T.at(b0, 1.6), T.at(b0, 9), T.at(b1, 9), T.at(b1, -9), T.at(b0, -9), T.at(b0, -1.6)], 1.8, 0.7, { closed: false });
    { const g = T.at(b0); gate(S, g[0], g[1], T.av, 3.2, 1.0, { h: 2.6, openings: 1, roof: C.roofY, col: C.brickMoss, rh: 0.9 }); }
    const gp = T.at((b0 + b1) / 2), gy = gY(gp[0], gp[1]);
    S.kind = KIND.MASONRY; S.base = gy - LAND_Y;
    S.box(gp[0], gp[1], gy - 0.6, gy + 1.1, 5, 3.2, T.a, C.stoneGrey, { top: C.stoneDark });
    S.box(gp[0], gp[1], gy + 1.1, gy + 1.8, 4.2, 2.4, T.a, C.stoneDark, { taper: 0.5 });
  }
  // the small walled family tombs
  for (const it of st.items) {
    if (it.k !== 'h') continue;
    wallLine(S, it.ring, 1.4, 0.5, { maxSeg: 8 });
    const g = gY(it.c[0], it.c[1]), s = clamp(Math.min(it.w, it.d) * 0.3, 1.6, 4);
    S.kind = KIND.MASONRY; S.base = g - LAND_Y;
    S.box(it.c[0], it.c[1], g - 0.4, g + 0.9, s * 1.4, s, it.a, C.stoneGrey, { top: C.stoneDark });
    const sp = [it.c[0] + Math.cos(it.a) * s * 1.1, it.c[1] + Math.sin(it.a) * s * 1.1];
    S.box(sp[0], sp[1], g, g + 1.8, 0.35, 1.2, it.a, C.stoneDark);
  }
  leftovers(S, st);
}

const TOMBS = { minhmang: minhMang, tuduc: tuDuc, khaidinh: khaiDinh, thieutri: thieuTri, dongkhanh: dongKhanh };

// Adds all five tombs to S. `stats` (optional) receives the triangle range each tomb wrote.
export function buildTombs(data, S, stats = null) {
  loadPaths(data);
  for (const [id, fn] of Object.entries(TOMBS)) {
    const st = replaced(id) ? null : loadSite(data, id);
    const n0 = S.n;
    if (st) {
      try { fn(S, st); } catch (e) { S.n = n0; console.warn(`tombs: ${id} skipped`, e); } // drop the half-built tomb, not just the rest of it
    }
    S.kind = KIND.PLAIN; S.base = 0;
    if (stats) stats[id] = { from: n0, to: S.n };
  }
  S.kind = KIND.PLAIN; S.base = 0;
}

// shared with the per-place replicas (places/minhmang.js)
export { C as TOMB_COL, gY, groundSpan, rectPts, terrace, levelTop, pav, hallAt, flight, balustrade, wallLine, gate, bridge, mandarin, beast, statueCourt, obelisk };
