import { KIND, hex, shade, unflat, obb, ringCentre, inRing } from '../geo/buf.js';
import { LAND_Y, PAL } from '../config.js';
import { rise } from '../geo/terrain.js';
import { pavilion } from './citadel.js';
import { buildThuyTien } from './thuytien.js';

// The southern hills: đan viện Thiên An, (the water park at hồ Thủy Tiên is in thuytien.js),
// đàn Nam Giao and the lookout on đồi Vọng Cảnh. Each place says below what comes from OSM (position,
// footprints, orientation) and what is drawn from the real layout by hand.
//
// Every 'b' item OSM maps inside a site is drawn here (the generic city skips them), so each site ends by
// sweeping up whatever building it has not used yet.

const dark = hex('#2b2422');

// ---------------------------------------------------------------- helpers
const gy = (x, z) => LAND_Y + rise(x, z);
// Lowest and highest ground under a footprint. The corners alone miss a rise in the middle of a wide terrace (the land
// then shows through its top), so the whole box around the points is sampled every few metres.
const spread = (pts) => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const out = pts.slice(), nx = Math.min(40, Math.ceil((x1 - x0) / 6)), nz = Math.min(40, Math.ceil((z1 - z0) / 6));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) out.push([x0 + ((x1 - x0) * i) / (nx || 1), z0 + ((z1 - z0) * j) / (nz || 1)]);
  return out;
};
const minG = (pts) => spread(pts).reduce((m, p) => Math.min(m, gy(p[0], p[1])), Infinity);
const maxG = (pts) => spread(pts).reduce((m, p) => Math.max(m, gy(p[0], p[1])), -Infinity);
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

function polyCentroid(r) {
  let x = 0, z = 0, A = 0;
  for (let i = 0, n = r.length; i < n; i++) { const a = r[i], b = r[(i + 1) % n], k = a[0] * b[1] - b[0] * a[1]; A += k; x += (a[0] + b[0]) * k; z += (a[1] + b[1]) * k; }
  return A ? [x / (3 * A), z / (3 * A)] : ringCentre(r);
}
// local frame on the ground: `f` points out of the front, `p` runs across it
function frame(c, f) {
  const p = [-f[1], f[0]];
  return { c, f, p, a: Math.atan2(f[1], f[0]), at: (a, b = 0) => [c[0] + f[0] * a + p[0] * b, c[1] + f[1] * a + p[1] * b] };
}
const corners = (o, k = 1) => {
  const ux = Math.cos(o.a), uz = Math.sin(o.a), hw = (o.w / 2) * k, hd = (o.d / 2) * k;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => [o.c[0] + ux * s * hw - uz * t * hd, o.c[1] + uz * s * hw + ux * t * hd]);
};
const siteOf = (data, id) => {
  const s = data.sites && data.sites[id];
  if (!s || !s.c) return null;
  const items = (s.items || []).filter((it) => it && it.ring && it.ring.length >= 6).map((it) => ({ ...it, pts: unflat(it.ring) }));
  return { ...s, cm: [s.c[0] / 10, s.c[1] / 10], items };
};
// circular parapet with openings: gaps = [[angle, half-width in radians], …]
function ringWall(S, cx, cz, r, y0, h, t, seg, col, gaps = []) {
  const ri = r - t;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
    if (gaps.some(([g, hw]) => Math.abs(Math.atan2(Math.sin(am - g), Math.cos(am - g))) < hw)) continue;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), out = [Math.cos(am), 0, Math.sin(am)];
    const o0 = [cx + c0 * r, 0, cz + s0 * r], o1 = [cx + c1 * r, 0, cz + s1 * r], i0 = [cx + c0 * ri, 0, cz + s0 * ri], i1 = [cx + c1 * ri, 0, cz + s1 * ri];
    const at = (p, y) => [p[0], y, p[2]];
    S.quad(at(o0, y0), at(o1, y0), at(o1, y0 + h), at(o0, y0 + h), col, out);
    S.quad(at(i0, y0), at(i1, y0), at(i1, y0 + h), at(i0, y0 + h), shade(col, 0.85), scl(out, -1));
    S.quad(at(o0, y0 + h), at(o1, y0 + h), at(i1, y0 + h), at(i0, y0 + h), shade(col, 1.08), [0, 1, 0]);
  }
}
// a flight of steps from a terrace edge at p, going out along dir (unit [x,z]) and down from yTop;
// with yBot = null it walks down the real slope until it meets the ground
function flight(S, p, dir, yTop, yBot, width, col, run = 0.42, step = 0.3) {
  const ang = Math.atan2(dir[1], dir[0]);
  for (let k = 0; k < 24; k++) {
    const top = yTop - (k + 1) * step;
    const x = p[0] + dir[0] * (k + 0.5) * run, z = p[1] + dir[1] * (k + 0.5) * run;
    const floor = yBot ?? gy(x, z);
    if (top < floor + 0.02) break;
    S.box(x, z, floor - 0.4, top, run, width, ang, col, { topKind: KIND.ROAD });
  }
}
// a plain low building on an OSM footprint (bedded into the slope), roofed or flat
function lowBlock(S, o, { h = 3.6, wall, roof = null, roofH = 1.8, flat = null, openings = true, over = 0.6 }) {
  const cs = corners(o), y0 = minG(cs) - 0.3, yf = maxG(cs) + 0.15;
  S.base = yf - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], y0, yf + h, o.w, o.d, o.a, wall, { top: flat || shade(wall, 0.8), topKind: flat ? KIND.FLAT : null });
  S.kind = KIND.PLAIN;
  if (openings) {
    const ux = Math.cos(o.a), uz = Math.sin(o.a), n = Math.max(1, Math.floor(o.w / 3.2));
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      const u = (i + 0.5 - n / 2) * (o.w / n), x = o.c[0] + ux * u - uz * s * (o.d / 2 + 0.04), z = o.c[1] + uz * u + ux * s * (o.d / 2 + 0.04);
      S.box(x, z, yf + (i % 3 === 1 ? 0 : 0.9), yf + Math.min(h - 0.5, 2.3), 1.1, 0.1, o.a, dark);
    }
  }
  if (roof) S.hip(o.c[0], o.c[1], o.w, o.d, o.a, yf + h, roofH, roof, { over, flare: 0.25 });
  else if (flat) { S.kind = KIND.PLAIN; S.box(o.c[0], o.c[1], yf + h, yf + h + 0.5, o.w + 0.2, o.d + 0.2, o.a, shade(wall, 0.9), { top: flat }); }
  S.kind = KIND.PLAIN;
}

// Split a footprint made of several wings into rectangles: repeatedly take the largest rectangle (any
// orientation, 5° steps) of not-yet-covered cells inside the polygon, then let it run on through the
// junctions while it stays inside. Used for the monastery's mapped outline.
function wings(ring, maxN = 7, minArea = 60) {
  const g = 1.5, c = polyCentroid(ring), out = [];
  const grids = [];
  for (let k = 0; k < 36; k++) {
    const a = (k * 5 * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const loc = ring.map((p) => [(p[0] - c[0]) * ca + (p[1] - c[1]) * sa, -(p[0] - c[0]) * sa + (p[1] - c[1]) * ca]);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const q of loc) { u0 = Math.min(u0, q[0]); u1 = Math.max(u1, q[0]); v0 = Math.min(v0, q[1]); v1 = Math.max(v1, q[1]); }
    const nu = Math.ceil((u1 - u0) / g), nv = Math.ceil((v1 - v0) / g);
    const inside = new Uint8Array(nu * nv);
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) inside[j * nu + i] = inRing(u0 + (i + 0.5) * g, v0 + (j + 0.5) * g, loc) ? 1 : 0;
    grids.push({ a, ca, sa, u0, v0, nu, nv, inside });
  }
  const covered = (x, z) => out.some((r) => {
    const dx = x - r.c[0], dz = z - r.c[1], ux = Math.cos(r.a), uz = Math.sin(r.a);
    return Math.abs(dx * ux + dz * uz) < r.w / 2 && Math.abs(-dx * uz + dz * ux) < r.d / 2;
  });
  for (let n = 0; n < maxN; n++) {
    let best = null;
    for (const G of grids) {
      const { nu, nv, inside, u0, v0, ca, sa } = G;
      const free = new Uint8Array(nu * nv);
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const k = j * nu + i;
        if (!inside[k]) continue;
        const u = u0 + (i + 0.5) * g, v = v0 + (j + 0.5) * g;
        free[k] = covered(c[0] + u * ca - v * sa, c[1] + u * sa + v * ca) ? 0 : 1;
      }
      // largest all-free rectangle, histogram method, at least 5 m on its short side
      const hgt = new Int32Array(nu);
      for (let j = 0; j < nv; j++) {
        for (let i = 0; i < nu; i++) hgt[i] = free[j * nu + i] ? hgt[i] + 1 : 0;
        const st = [];
        for (let i = 0; i <= nu; i++) {
          const hh = i < nu ? hgt[i] : 0;
          let start = i;
          while (st.length && st[st.length - 1][1] >= hh) {
            const [si, sh] = st.pop();
            const wdt = i - si, area = wdt * sh * g * g;
            if (Math.min(wdt, sh) * g >= 5 && (!best || area > best.area)) best = { G, area, i0: si, i1: i, j0: j - sh + 1, j1: j + 1 };
            start = si;
          }
          st.push([start, hh]);
        }
      }
    }
    if (!best || best.area < minArea) break;
    // extend along the long axis through junctions while still inside the outline
    const { G } = best;
    const ok = (i0, i1, j0, j1) => { for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) if (i < 0 || j < 0 || i >= G.nu || j >= G.nv || !G.inside[j * G.nu + i]) return false; return true; };
    let { i0, i1, j0, j1 } = best;
    if (i1 - i0 >= j1 - j0) { while (ok(i0 - 1, i0, j0, j1)) i0--; while (ok(i1, i1 + 1, j0, j1)) i1++; }
    else { while (ok(i0, i1, j0 - 1, j0)) j0--; while (ok(i0, i1, j1, j1 + 1)) j1++; }
    const uc = G.u0 + ((i0 + i1) / 2) * g, vc = G.v0 + ((j0 + j1) / 2) * g;
    let w = (i1 - i0) * g, d = (j1 - j0) * g, a = G.a;
    if (d > w) { [w, d] = [d, w]; a += Math.PI / 2; }
    out.push({ c: [c[0] + uc * G.ca - vc * G.sa, c[1] + uc * G.sa + vc * G.ca], w, d, a });
  }
  return out;
}

// ---------------------------------------------------------------- Đan viện Thiên An
// Mapped: the monastery's outline (its wings and their directions are read off the OSM polygon) and three small
// outbuildings. Drawn: the longest wing as the church (pale stone, a Vietnamese double roof with upturned eaves,
// lancet windows), its square bell tower of tiered roofs at the wing's free end, the other wings as two-storey
// cloister ranges with shaded verandahs. Heights and the tower's form are illustrative.
function thienAn(S, data) {
  const site = siteOf(data, 'thienan');
  if (!site) return;
  const stoneW = hex('#d9d1bf'), stoneW2 = hex('#cfc6b2'), tile = hex('#8f4a36'), tile2 = hex('#9a5238'), ridge = hex('#d8cdb4'), plinth = hex('#a59c88');
  const main = site.items.filter((it) => it.k === 'b').map((it) => { const o = obb(it.pts); return [o.w * o.d, it]; }).sort((a, b) => b[0] - a[0]).map((e) => e[1])[0]; // box areas worked out once, not in the comparator
  const used = new Set();
  if (main && obb(main.pts).w > 40) {
    used.add(main.id);
    let ws = wings(main.pts);
    if (!ws.length) ws = [obb(main.pts)];
    const church = ws.slice().sort((a, b) => b.w - a.w)[0];
    const rest = ws.filter((r) => r !== church);
    // the church's free end (away from the other wings) is its front, where the tower stands
    const restC = rest.length ? rest.reduce((m, r) => [m[0] + r.c[0] / rest.length, m[1] + r.c[1] / rest.length], [0, 0]) : polyCentroid(main.pts);
    let f = [Math.cos(church.a), Math.sin(church.a)];
    const ends = [1, -1].map((s) => [church.c[0] + f[0] * s * church.w / 2, church.c[1] + f[1] * s * church.w / 2]);
    if (Math.hypot(ends[1][0] - restC[0], ends[1][1] - restC[1]) > Math.hypot(ends[0][0] - restC[0], ends[0][1] - restC[1])) f = [-f[0], -f[1]];
    const F = frame(church.c, f);
    const L = church.w, D = Math.min(church.d, 16);
    const cs = corners({ c: church.c, w: L, d: D, a: F.a }), y0 = minG(cs) - 0.6, y = maxG(cs) + 0.5;
    S.base = y - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(church.c[0], church.c[1], y0, y, L + 3, D + 3, F.a, plinth, { topKind: KIND.ROAD });
    const H = 8.5;
    S.box(church.c[0], church.c[1], y, y + H, L, D, F.a, stoneW, { top: shade(tile, 0.8) });
    // a lower roof skirting the nave, the high roof above it
    S.hip(church.c[0], church.c[1], L + 2.4, D + 5, F.a, y + 4.6, 1.7, tile2, { flare: 0.35, fascia: 0.25, fasciaCol: ridge });
    S.hip(church.c[0], church.c[1], L, D, F.a, y + H, D * 0.42, tile, { over: 1.0, flare: 0.6, fascia: 0.3, fasciaCol: ridge, ridgeCol: ridge, hips: true });
    S.kind = KIND.PLAIN;
    for (const sd of [-1, 1]) for (let a = -L / 2 + 3; a <= L / 2 - 3; a += 4.2) {
      const q = F.at(a, sd * (D / 2 + 0.05));
      S.box(q[0], q[1], y + 5.2, y + H - 0.9, 0.9, 0.12, F.a, dark);
    }
    // west front: the bell tower, square, four stages each under a flared tiled roof
    const tw = Math.min(7, D * 0.6), tc = F.at(L / 2 + tw / 2 - 0.5, 0);
    const ty0 = Math.min(y0, gy(tc[0], tc[1]) - 0.5);
    S.kind = KIND.MASONRY;
    S.box(tc[0], tc[1], ty0, y + 12, tw, tw, F.a, stoneW2);
    let yy = y + 12, ww = tw;
    for (const [hgt, k] of [[4.6, 0.8], [3.8, 0.66], [3.2, 0.52]]) {
      S.hip(tc[0], tc[1], ww, ww, F.a, yy, 1.4, tile, { over: 1.3, flare: 0.5, fascia: 0.25, fasciaCol: ridge, ridgeCol: ridge, hips: true });
      ww = tw * k;
      S.kind = KIND.MASONRY;
      S.box(tc[0], tc[1], yy + 0.5, yy + 0.5 + hgt, ww, ww, F.a, stoneW2);
      S.kind = KIND.PLAIN;
      for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = F.at(L / 2 + tw / 2 - 0.5 + da * (ww / 2 + 0.05), db * (ww / 2 + 0.05)); S.box(q[0], q[1], yy + 1.6, yy + hgt - 0.4, da ? 0.12 : ww * 0.36, da ? ww * 0.36 : 0.12, F.a, dark); }
      yy += 0.5 + hgt;
    }
    S.hip(tc[0], tc[1], ww, ww, F.a, yy, 3.6, tile, { over: 1.0, flare: 0.5, fascia: 0.22, fasciaCol: ridge, ridgeCol: ridge, hips: true });
    S.kind = KIND.PLAIN;
    S.beam([tc[0], yy + 3.4, tc[1]], [tc[0], yy + 6.6, tc[1]], 0.28, 0.28, hex('#efe7d6'));
    { const q = F.p; S.beam([tc[0] - q[0] * 0.9, yy + 5.6, tc[1] - q[1] * 0.9], [tc[0] + q[0] * 0.9, yy + 5.6, tc[1] + q[1] * 0.9], 0.26, 0.26, hex('#efe7d6')); }
    { const q = F.at(L / 2 + tw - 0.45, 0); S.box(q[0], q[1], y, y + 4.2, 0.12, 2.2, F.a, dark); }
    flight(S, F.at(L / 2 + tw - 0.5, 0), f, y, null, 5, plinth);
    // the cross on the east end of the ridge
    { const q = F.at(-L / 2 + 1.4, 0), yt = y + H + D * 0.42; S.beam([q[0], yt, q[1]], [q[0], yt + 2.6, q[1]], 0.22, 0.22, hex('#efe7d6')); S.beam([q[0] - F.p[0] * 0.7, yt + 1.8, q[1] - F.p[1] * 0.7], [q[0] + F.p[0] * 0.7, yt + 1.8, q[1] + F.p[1] * 0.7], 0.2, 0.2, hex('#efe7d6')); }

    // cloister ranges: two storeys, pale walls, a shaded verandah on the ground floor, hip roofs with curved eaves
    for (const r of rest) {
      const dd = Math.min(r.d, 13), rc = corners({ c: r.c, w: r.w, d: dd, a: r.a }), ry0 = minG(rc) - 0.5, ry = maxG(rc) + 0.3;
      S.base = ry - LAND_Y;
      S.kind = KIND.MASONRY;
      S.box(r.c[0], r.c[1], ry0, ry, r.w + 1.2, dd + 1.2, r.a, plinth, { topKind: KIND.ROAD });
      S.box(r.c[0], r.c[1], ry, ry + 7.2, r.w, dd, r.a, stoneW, { top: shade(tile, 0.8) });
      S.kind = KIND.PLAIN;
      const ux = Math.cos(r.a), uz = Math.sin(r.a);
      for (const sd of [-1, 1]) {
        const q = [r.c[0] - uz * sd * (dd / 2 + 0.05), r.c[1] + ux * sd * (dd / 2 + 0.05)];
        S.box(q[0], q[1], ry, ry + 2.7, r.w - 1.5, 0.1, r.a, hex('#4a403a'));
        S.box(q[0], q[1], ry + 4.2, ry + 5.8, r.w - 2, 0.1, r.a, hex('#5a4e45'));
      }
      S.hip(r.c[0], r.c[1], r.w, dd, r.a, ry + 7.2, Math.min(4.5, dd * 0.38), tile2, { over: 1.1, flare: 0.45, fascia: 0.25, fasciaCol: ridge, ridgeCol: ridge });
    }
  }
  // outbuildings
  for (const it of site.items) {
    if (it.k !== 'b' || used.has(it.id)) continue;
    const o = obb(it.pts);
    if (o.w < 1) continue;
    lowBlock(S, o, { h: 3.6, wall: stoneW2, roof: tile2, roofH: Math.min(2.6, o.d * 0.35) });
  }
  S.kind = KIND.PLAIN; S.base = 0;
}

// ---------------------------------------------------------------- Đàn Nam Giao
// Mapped: the round top terrace (Viên đàn, centre and radius) and one small building to the north. Drawn
// from the real esplanade around that centre, compass-aligned: the square lower terrace (165 m) inside its
// wall with a three-arched gate at each cardinal point, the square middle terrace (Phương đàn, 83 m) with
// its yellow balustrade, the round top with its blue one, stairs on four sides of each, and the Trai Cung
// fasting palace to the south-west (its position and size are illustrative).
function namGiao(S, data) {
  const site = siteOf(data, 'namgiao');
  if (!site) return;
  const top = site.items.find((it) => it.k === 'h' && /nam giao/i.test(it.n || '')) || site.items.find((it) => it.k === 'h');
  const used = new Set();
  const laterite = hex('#8b7d6a'), brick = hex('#7d6c5c'), stoneP = hex('#bdb39e'), grass = hex('#9fab72'), grass2 = hex('#aab37c');
  const yellow = hex('#d4b04c'), blue = hex('#4f7ea6'), gateC = hex('#cfc7b3');
  let C = site.cm, Rt = 20.2;
  if (top) {
    used.add(top.id);
    C = polyCentroid(top.pts);
    Rt = Math.max(15, top.pts.reduce((s, p) => s + Math.hypot(p[0] - C[0], p[1] - C[1]), 0) / top.pts.length);
  }
  const card = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W (z runs south)
  const sq = (h) => [[C[0] - h, C[1] - h], [C[0] + h, C[1] - h], [C[0] + h, C[1] + h], [C[0] - h, C[1] + h], [C[0], C[1]], [C[0] - h, C[1]], [C[0] + h, C[1]], [C[0], C[1] - h], [C[0], C[1] + h]];

  // lower terrace: 165 m square, its top just above the highest ground under it
  const h1 = 82.5;
  const y1 = maxG(sq(h1)) + 0.9, b1 = minG(sq(h1)) - 0.6;
  S.base = y1 - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(C[0], C[1], b1, y1, h1 * 2, h1 * 2, 0, laterite, { top: grass, topKind: KIND.GROUND });
  S.kind = KIND.ROAD; // paved axes from the four gates
  S.box(C[0], C[1], y1, y1 + 0.06, h1 * 2 - 0.4, 6, 0, stoneP);
  S.box(C[0], C[1], y1, y1 + 0.06, 6, h1 * 2 - 0.4, 0, stoneP);
  // middle terrace: 83 m square, yellow balustrade (Earth)
  const h2 = 41.5, y2 = y1 + 1.65;
  S.kind = KIND.MASONRY;
  S.box(C[0], C[1], y1 - 0.2, y2, h2 * 2, h2 * 2, 0, brick, { top: grass2, topKind: KIND.GROUND });
  S.kind = KIND.ROAD;
  S.box(C[0], C[1], y2, y2 + 0.05, h2 * 2 - 0.6, 5, 0, stoneP);
  S.box(C[0], C[1], y2, y2 + 0.05, 5, h2 * 2 - 0.6, 0, stoneP);
  // top: the round Viên đàn, blue balustrade (Heaven)
  const y3 = y2 + 2.85;
  S.kind = KIND.MASONRY;
  S.cyl(C[0], C[1], y2 - 0.2, y3, Rt, Rt, 40, hex('#a2977f'), { cap: false });
  S.kind = KIND.ROAD;
  S.cyl(C[0], C[1], y3 - 0.01, y3, Rt, Rt, 40, stoneP, { cap: true });
  S.cyl(C[0], C[1], y3, y3 + 0.18, Rt * 0.32, Rt * 0.32, 16, shade(stoneP, 1.06));
  S.kind = KIND.PLAIN;
  ringWall(S, C[0], C[1], Rt, y3, 0.85, 0.32, 40, blue, card.map(([x, z]) => [Math.atan2(z, x), 4.4 / Rt]));
  // balustrades of the square terraces, open at the stairs
  const rail = (h, y, col, gap, hgt = 0.85) => {
    for (const [dx, dz] of card) for (const sd of [-1, 1]) {
      const len = h - gap / 2, along = gap / 2 + len / 2;
      const x = C[0] + dx * (h - 0.2) + (dz ? sd * along : 0), z = C[1] + dz * (h - 0.2) + (dx ? sd * along : 0);
      S.box(x, z, y, y + hgt, dz ? len : 0.35, dz ? 0.35 : len, 0, col);
    }
  };
  rail(h2, y2, yellow, 10);
  rail(h1, y1, shade(gateC, 0.92), 12, 0.7);
  // stairs on the four sides of each terrace (the north flights, toward the city, a little wider)
  S.kind = KIND.MASONRY;
  for (const [i, [dx, dz]] of card.entries()) {
    const wide = i === 0 ? 1.3 : 1;
    flight(S, [C[0] + dx * Rt, C[1] + dz * Rt], [dx, dz], y3, y2, 7 * wide, stoneP);
    flight(S, [C[0] + dx * h2, C[1] + dz * h2], [dx, dz], y2, y1, 8 * wide, stoneP);
    flight(S, [C[0] + dx * h1, C[1] + dz * h1], [dx, dz], y1, null, 10 * wide, stoneP);
  }
  // the wall round the lower terrace, following the ground, and the four three-arched gates
  const hw = 92, wallH = 1.9;
  S.kind = KIND.MASONRY;
  for (const [dx, dz] of card) {
    for (let t = -hw; t < hw - 0.1; t += 11.5) {
      const tm = t + 5.75;
      if (Math.abs(tm) < 10) continue;
      const x = C[0] + dx * hw + (dz ? tm : 0), z = C[1] + dz * hw + (dx ? tm : 0), g = gy(x, z);
      S.box(x, z, g - 0.8, g + wallH, dz ? 11.6 : 0.6, dz ? 0.6 : 11.6, 0, brick, { top: shade(gateC, 0.85) });
    }
    const gx = C[0] + dx * hw, gz = C[1] + dz * hw, g = gy(gx, gz), ang = dz ? 0 : Math.PI / 2;
    const P = (along, out) => [gx + (dz ? along : dx * out), gz + (dx ? along : dz * out)];
    S.kind = KIND.MASONRY;
    S.box(gx, gz, g - 0.6, g + 4.4, 15.5, 1.4, ang, gateC);
    S.box(gx, gz, g + 4.4, g + 6.0, 6.0, 1.4, ang, gateC);
    S.kind = KIND.PLAIN;
    S.box(gx, gz, g + 4.3, g + 4.6, 16.1, 1.8, ang, shade(gateC, 1.08));
    S.box(gx, gz, g + 5.9, g + 6.2, 6.6, 1.8, ang, shade(gateC, 1.08));
    for (const sd of [-1, 1]) for (const [al, w, h] of [[0, 2.8, 4.4], [-4.8, 1.9, 3.2], [4.8, 1.9, 3.2]]) { const q = P(al, sd * 0.72); S.box(q[0], q[1], g, g + h, w, 0.08, ang, dark); }
    for (const al of [-7.75, -3, 3, 7.75]) { const q = P(al, 0); S.box(q[0], q[1], g - 0.6, g + (Math.abs(al) > 5 ? 5.2 : 6.6), 0.9, 1.7, ang, shade(gateC, 0.95)); S.cyl(q[0], q[1], g + (Math.abs(al) > 5 ? 5.2 : 6.6), g + (Math.abs(al) > 5 ? 6.0 : 7.5), 0.38, 0.08, 6, shade(gateC, 1.05)); }
    S.kind = KIND.MASONRY;
  }
  // Liệu sở, the small burning altar at the south-east of the middle terrace
  S.box(C[0] + h2 - 6, C[1] + h2 - 6, y2, y2 + 1.6, 3, 3, 0, brick, { top: hex('#3d3532') });

  // Trai Cung: walled square compound with the main hall, two side houses and the gate toward the altar
  {
    const tc = [C[0] - 120, C[1] + 70], half = 26;
    const d = Math.hypot(tc[0] - site.cm[0], tc[1] - site.cm[1]);
    if (d < (site.r ?? 300) - half * 0.8) { // a site without a radius gets the tombs' default, rather than a NaN that hides the Trai Cung
      const g = gy(tc[0], tc[1]);
      S.base = g - LAND_Y;
      S.kind = KIND.MASONRY;
      for (const [dx, dz] of card) for (const sd of [-1, 1]) {
        const len = half - (dx === 1 ? 3 : 0), along = (dx === 1 ? 3 : 0) + len / 2;
        const x = tc[0] + dx * half + (dz ? sd * along : 0), z = tc[1] + dz * half + (dx ? sd * along : 0), gg = gy(x, z);
        S.box(x, z, gg - 0.8, gg + 2.4, dz ? len : 0.6, dz ? 0.6 : len, 0, brick, { top: shade(gateC, 0.85) });
      }
      S.kind = KIND.ROAD;
      // the paved court lies on the highest ground inside the walls, so the slope does not show through it, and the
      // halls stand on the court
      const cq = [[tc[0] - half, tc[1] - half], [tc[0] + half, tc[1] - half], [tc[0] + half, tc[1] + half], [tc[0] - half, tc[1] + half]], cy = maxG(cq);
      S.box(tc[0], tc[1], minG(cq) - 0.4, cy + 0.08, half * 2 - 1, half * 2 - 1, 0, hex('#b8ae96'));
      S.kind = KIND.PLAIN;
      pavilion(S, tc[0] - 6, tc[1], 12, 22, 0, cy, { tiers: 1, wallH: 3.8, roof: PAL.templeRoof, wall: PAL.lacquer, over: 1.2, rh: 3.2, platform: 0.9, ridge: hex('#d8c9a0') });
      for (const sd of [-1, 1]) pavilion(S, tc[0] + 8, tc[1] + sd * 15, 14, 7, 0, cy, { tiers: 1, wallH: 3.0, roof: PAL.templeRoof, wall: hex('#b58a5c'), over: 0.9, rh: 2.2, platform: 0.5, ridge: hex('#d8c9a0') });
      pavilion(S, tc[0] + half, tc[1], 4.5, 8, Math.PI / 2, gy(tc[0] + half, tc[1]), { tiers: 2, wallH: 3.0, roof: PAL.templeRoof, wall: hex('#c9a27a'), over: 0.9, rh: 1.8, ridge: hex('#d8c9a0') });
    }
  }
  // other mapped buildings (a guard house by the north gate): small tiled houses
  for (const it of site.items) {
    if (it.k !== 'b' || used.has(it.id)) continue;
    const o = obb(it.pts);
    if (o.w < 1) continue;
    lowBlock(S, o, { h: 3.4, wall: hex('#e0d2ae'), roof: PAL.templeRoof, roofH: Math.min(2.4, o.d * 0.32) });
  }
  S.kind = KIND.PLAIN; S.base = 0;
}

// ---------------------------------------------------------------- Đồi Vọng Cảnh
// Mapped: only the hill's name point. The place is already moved onto the summit (scripts/build-data.mjs §9);
// the small lookout pavilion on its paved terrace and the two old concrete bunkers below it, on the river
// side, are illustrative.
function vongCanh(S, data) {
  const pl = (data.places || []).find((p) => p.id === 'vongcanh');
  if (!pl) return;
  const P = [pl.x / 10, pl.z / 10];
  const g = gy(P[0], P[1]);
  const ring8 = Array.from({ length: 8 }, (_, i) => [P[0] + Math.cos(i * 0.785) * 7, P[1] + Math.sin(i * 0.785) * 7]);
  const yt = maxG(ring8) + 0.3;
  S.base = yt - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(P[0], P[1], minG(ring8) - 0.6, yt, 7.5, 7.5, 12, PAL.stone);
  S.kind = KIND.PLAIN;
  ringWall(S, P[0], P[1], 7.5, yt, 0.8, 0.25, 12, hex('#c9c0aa'), [[Math.PI / 2, 0.3]]);
  pavilion(S, P[0], P[1], 4.6, 4.6, 0, yt, { tiers: 1, wallH: 2.8, roof: PAL.templeRoof, wall: hex('#a5512f'), over: 1.1, rh: 1.9, ridge: hex('#d8c9a0') });
  // two pillboxes on the slope toward the river (north)
  const moss = hex('#7c8170');
  for (const [dx, dz] of [[-15, -12], [17, -8]]) {
    const x = P[0] + dx, z = P[1] + dz, gg = gy(x, z);
    S.base = gg - LAND_Y;
    S.kind = KIND.MASONRY;
    S.cyl(x, z, gg - 0.8, gg + 1.5, 2.8, 2.6, 8, moss, { cap: false });
    S.kind = KIND.PLAIN;
    S.cyl(x, z, gg + 1.5, gg + 1.95, 3.2, 3.0, 8, shade(moss, 0.92));
    const a = Math.atan2(-dz, -dx);
    S.box(x - Math.cos(a) * 2.68, z - Math.sin(a) * 2.68, gg + 0.7, gg + 1.1, 0.12, 2.2, a, dark);
    S.box(x + Math.cos(a) * 2.68, z + Math.sin(a) * 2.68, gg - 0.2, gg + 1.3, 0.12, 1.0, a, dark);
  }
  S.kind = KIND.PLAIN; S.base = 0;
  return g;
}

export function buildSouth(data, S) {
  if (!data || !S) return;
  // each with the first era it stands in: the park (2004), the monastery (1940) and the lookout's bunkers are
  // today's; the Nam Giao altar is Gia Long's
  for (const [fn, since] of [[(St, d) => buildThuyTien(d, St), 2], [thienAn, 2], [namGiao, 0], [vongCanh, 2]]) {
    S.span = since * 4;
    const n0 = S.n; // a place that throws halfway is dropped whole, not left half-built in the shared buffer
    try { fn(S, data); } catch (e) { S.n = n0; console.warn('south:', fn.name, e); }
    S.kind = KIND.PLAIN; S.base = 0; S.span = 0;
  }
}
