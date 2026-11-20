import { KIND, hex, shade, unflat, inRing } from '../geo/buf.js';
import { glowPoints } from '../geo/materials.js';
import { LAND_Y } from '../config.js';

// Cầu đi bộ gỗ lim — the ironwood riverside walkway on the south bank of the Hương, inaugurated
// 15 Nov 2018 (KOICA-funded). A timber deck on concrete piles standing just off the Nguyễn Đình Chiểu
// promenade, between cầu Trường Tiền and cầu Phú Xuân.
//
// Facts used (see docs/reference/bridges.md):
//  - length "nearly 400 m", width 4 m, ~2,443 m² of South African lim (baovanhoa.vn
//    https://baovanhoa.vn/du-lich/tp-hue-dua-duong-di-bo-lat-san-go-lim-ven-song-huong-di-vao-hoat-dong-35255.html);
//    other reports give "over 380 m" or "about 450 m" (plo.vn https://plo.vn/khanh-thanh-cau-go-lim-tien-ti-tren-song-huong-post511309.html,
//    nguoiquansat.vn https://nguoiquansat.vn/cay-cau-go-lim-bac-ty-dat-7-tan-dong-doc-nhat-viet-nam-dien-tich-hon-2-400m2-ghep-tu-16-000-thanh-go-100872.html).
//    400 m is used.
//  - deck about 1 m above the water (one report, via search summary; not read in full).
//  - runs from the middle of the Nguyễn Đình Chiểu promenade upstream, passing under cầu Phú Xuân, towards
//    công viên Lý Tự Trọng (mia.vn https://mia.vn/cam-nang-du-lich/ghe-cau-go-lim-hue-bat-tron-toan-canh-con-song-huong-tho-mong-5312;
//    search summary, not read in full). Exact endpoints, number and places of stairs, pile spacing and
//    stand-off from the embankment are NOT confirmed; no viewing bays are reported, so none are modelled.
//
// The plan follows the mapped south bank: the land ring nearest the promenade label is walked either way
// from the label's foot, smoothed, and pushed out over the water just far enough that the whole 4 m deck
// clears the embankment; LENGTH metres of that line are kept, ending PAST_PX metres beyond cầu Phú Xuân.
const LENGTH = 400, WIDTH = 4, DECK_Y = 1.2, PILE_Y = -1.5, GAP = 2.0, PAST_PX = 20;

// ------------------------------------------------------------------ geometry helpers (pure)
function segDist(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return { d: Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t), t };
}
// evenly spaced points (not geo/bridges.js's resample, which keeps the vertices and returns arc lengths)
function resample(pts, step) {
  if (!pts.length) return [];
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let s = step - carry;
    while (s <= l) { out.push([a[0] + ((b[0] - a[0]) * s) / l, a[1] + ((b[1] - a[1]) * s) / l]); s += step; }
    carry = l - (s - step);
  }
  return out;
}
function smooth(arr, half, passes) {
  let a = arr;
  for (let k = 0; k < passes; k++) {
    a = a.map((_, i) => {
      const lo = Math.max(0, i - half), hi = Math.min(a.length - 1, i + half);
      if (Array.isArray(a[0])) {
        let x = 0, z = 0;
        for (let j = lo; j <= hi; j++) { x += a[j][0]; z += a[j][1]; }
        return [x / (hi - lo + 1), z / (hi - lo + 1)];
      }
      let s = 0;
      for (let j = lo; j <= hi; j++) s += a[j];
      return s / (hi - lo + 1);
    });
  }
  return a;
}

// Land near a point: polygons (outer ring + holes, in metres) whose bounds come within `reach`.
function landNear(data, c, reach) {
  const out = [];
  for (const poly of data.land) {
    const rings = poly.map(unflat);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of rings[0]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    if (c[0] < x0 - reach || c[0] > x1 + reach || c[1] < z0 - reach || c[1] > z1 + reach) continue;
    out.push(rings);
  }
  return out;
}
function isLand(land, x, z) {
  for (const rings of land) {
    if (!inRing(x, z, rings[0])) continue;
    let hole = false;
    for (let h = 1; h < rings.length && !hole; h++) hole = inRing(x, z, rings[h]);
    if (!hole) return true;
  }
  return false;
}
function bankDist(land, p) {
  let best = Infinity;
  for (const rings of land) for (const r of rings) for (let i = 0; i < r.length; i++) {
    const d = segDist(p, r[i], r[(i + 1) % r.length]).d;
    if (d < best) best = d;
  }
  return best;
}

// The walkway's centreline: [{ p:[x,z], t:[tx,tz] (upstream), n:[nx,nz] (towards the water), bank }], ~1.5 m apart.
function boardwalkPath(data) {
  const tt = data.truongtien;
  const south = [tt.b[0] / 10, tt.b[1] / 10];
  const lab = data.places.find((q) => q.id === 'ndchieu');
  const anchor = lab ? [lab.x / 10, lab.z / 10] : south;
  const land = landNear(data, anchor, 900);

  // the outer-ring edge nearest the promenade label
  let best = null;
  for (const rings of land) {
    const r = rings[0];
    for (let i = 0; i < r.length; i++) {
      const j = (i + 1) % r.length, { d, t } = segDist(anchor, r[i], r[j]);
      if (!best || d < best.d) best = { d, t, r, i, j };
    }
  }
  if (!best) return null;
  const { r } = best;
  const foot = [r[best.i][0] + (r[best.j][0] - r[best.i][0]) * best.t, r[best.i][1] + (r[best.j][1] - r[best.i][1]) * best.t];

  // walk the ring from the foot in one direction for `len` metres
  const walk = (dir, len) => {
    const pts = [foot];
    let k = dir > 0 ? best.j : best.i, acc = 0, prev = foot;
    for (let guard = 0; guard < r.length && acc < len; guard++) {
      const q = r[k], l = Math.hypot(q[0] - prev[0], q[1] - prev[1]);
      if (acc + l >= len) { const f = (len - acc) / l; pts.push([prev[0] + (q[0] - prev[0]) * f, prev[1] + (q[1] - prev[1]) * f]); acc = len; break; }
      pts.push(q); acc += l; prev = q;
      k = (k + dir + r.length) % r.length;
    }
    return pts;
  };
  // upstream is the way that leads away from the bridge
  const tryF = walk(1, 120), tryB = walk(-1, 120);
  const far = (pts) => { const q = pts[pts.length - 1]; return Math.hypot(q[0] - south[0], q[1] - south[1]); };
  const up = far(tryF) > far(tryB) ? 1 : -1;
  // a generous stretch of bank either side of the foot; the walkway's window is chosen on the centreline below
  const AHEAD = LENGTH + 180, BEHIND = 160;
  const fwd = walk(up, AHEAD), back = walk(-up, BEHIND);
  const bank = back.slice(1).reverse().concat(fwd);

  const STEP = 1.5;
  let b = smooth(resample(bank, STEP), 10, 3);
  const n = b.length;
  const tan = b.map((_, i) => {
    const a = b[Math.max(0, i - 2)], c = b[Math.min(n - 1, i + 2)], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
    return [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
  });
  // which side is water: vote over the samples
  let vote = 0;
  for (let i = 0; i < n; i += 4) { const p = b[i], t = tan[i]; vote += isLand(land, p[0] - t[1] * 8, p[1] + t[0] * 8) ? -1 : 1; }
  const sgn = vote >= 0 ? 1 : -1;
  const nrm = tan.map((t) => [-t[1] * sgn, t[0] * sgn]);

  // offset each sample until the bank-side edge of the deck is GAP clear of land, then smooth the offsets
  const off = b.map((p, i) => {
    let o = WIDTH / 2 + GAP;
    for (; o < 14; o += 0.25) {
      const ok = [-WIDTH / 2, 0, WIDTH / 2].every((e) => {
        const q = [p[0] + nrm[i][0] * (o + e), p[1] + nrm[i][1] * (o + e)];
        return !isLand(land, q[0], q[1]) && bankDist(land, q) >= (e < 0 ? GAP : 0.5);
      });
      if (ok) break;
    }
    return o;
  });
  // widen by a running max first so the smoothing never dips back under a protrusion
  const W = 12;
  const mx = off.map((_, i) => Math.max(...off.slice(Math.max(0, i - W), Math.min(n, i + W + 1))));
  const so = smooth(mx, 8, 3);
  let c = b.map((p, i) => [p[0] + nrm[i][0] * so[i], p[1] + nrm[i][1] * so[i]]);
  c = smooth(c, 3, 2);

  // window: by the sources it passes under cầu Phú Xuân and ends just beyond it (towards công viên Lý Tự
  // Trọng); end PAST_PX metres after the deck leaves the bridge's footprint and start LENGTH before that.
  // Without the bridge, start at the foot of the promenade label.
  const arc = [0];
  for (let i = 1; i < n; i++) arc.push(arc[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const iFoot = Math.round(Math.max(0, back.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - back[i - 1][0], q[1] - back[i - 1][1]) : 0), 0)) / STEP);
  const px = (data.bridges || []).find((q) => q.n === 'Cầu Phú Xuân');
  let sEnd = arc[Math.min(n - 1, iFoot)] + LENGTH;
  if (px) {
    const ring = unflat(px.ring);
    let last = -1;
    for (let i = iFoot; i < n; i++) if (inRing(c[i][0], c[i][1], ring)) last = i;
    if (last > 0) sEnd = arc[last] + PAST_PX;
  }
  sEnd = Math.min(sEnd, arc[n - 1] - 20);
  const sStart = Math.max(arc[0] + 20, sEnd - LENGTH);
  const cut = [];
  for (let i = 0; i < n; i++) if (arc[i] >= sStart && arc[i] <= sEnd) cut.push(c[i]);
  if (cut.length < 2) return null; // a bank too short for the window: no walkway rather than a TypeError
  const cl = resample(cut, STEP);
  const m = cl.length;
  return cl.map((p, i) => {
    const a = cl[Math.max(0, i - 1)], q = cl[Math.min(m - 1, i + 1)], l = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1;
    const t = [(q[0] - a[0]) / l, (q[1] - a[1]) / l];
    return { p, t, n: [-t[1] * sgn, t[0] * sgn], bank: bankDist(land, p) };
  });
}

// ------------------------------------------------------------------ the model
export function buildBoardwalk(data, S, group) {
  const glows = [];
  try {
    const path = boardwalkPath(data);
    if (!path || path.length < 10) { console.warn('boardwalk: no bank found'); return { glows }; }
    S.base = 0;

    const wood = hex('#7d5336'), woodShades = [1, 0.88, 0.95, 0.84, 0.92], fascia = shade(wood, 0.7);
    const bronze = hex('#4a3a28'), pileCol = hex('#9a958c');
    const P = (i, off, y) => [path[i].p[0] + path[i].n[0] * off, y, path[i].p[1] + path[i].n[1] * off];
    const len = (path.length - 1) * 1.5;
    const hw = WIDTH / 2;

    // where the stairs meet the deck: openings in the bank-side rail
    const stairAt = [8, len / 2 - 40, len - 8].map((s) => Math.round(s / 1.5));
    const stairDir = [-1, 1, 1]; // which way along the deck each flight climbs
    const opening = (i) => stairAt.some((k) => Math.abs(i - k) <= 1);

    // deck: one quad per 1.5 m, shades alternating like boards, with dark fascia on both edges
    S.kind = KIND.PLAIN;
    for (let i = 0; i < path.length - 1; i++) {
      const col = shade(wood, woodShades[i % woodShades.length]);
      S.quad(P(i, -hw, DECK_Y), P(i + 1, -hw, DECK_Y), P(i + 1, hw, DECK_Y), P(i, hw, DECK_Y), col, [0, 1, 0]);
      for (const e of [-1, 1]) {
        const h = [path[i].n[0] * e, 0, path[i].n[1] * e];
        S.quad(P(i, e * hw, DECK_Y), P(i + 1, e * hw, DECK_Y), P(i + 1, e * hw, DECK_Y - 0.3), P(i, e * hw, DECK_Y - 0.3), fascia, h);
      }
    }
    // end caps
    for (const [i, s] of [[0, -1], [path.length - 1, 1]]) {
      const h = [path[i].t[0] * s, 0, path[i].t[1] * s];
      S.quad(P(i, -hw, DECK_Y), P(i, hw, DECK_Y), P(i, hw, DECK_Y - 0.3), P(i, -hw, DECK_Y - 0.3), fascia, h);
    }

    // handrails: posts every 6 m, a flat-topped bronze rail between them (outer, inner and top faces)
    const RAIL = DECK_Y + 1.0, rh = 0.1, ro = hw - 0.08;
    const postEvery = 4; // samples (6 m)
    for (const e of [-1, 1]) {
      for (let i = 0; i < path.length; i += postEvery) {
        if (e < 0 && opening(i)) continue;
        const c = P(i, e * ro, 0), t = path[i].t, nn = path[i].n, w = 0.07;
        // a post: two faces across the deck direction, two along it
        const a = [c[0] - t[0] * w - nn[0] * w, c[2] - t[1] * w - nn[1] * w], b = [c[0] + t[0] * w - nn[0] * w, c[2] + t[1] * w - nn[1] * w];
        const d = [c[0] - t[0] * w + nn[0] * w, c[2] - t[1] * w + nn[1] * w], f = [c[0] + t[0] * w + nn[0] * w, c[2] + t[1] * w + nn[1] * w];
        S.quad([a[0], DECK_Y, a[1]], [b[0], DECK_Y, b[1]], [b[0], RAIL, b[1]], [a[0], RAIL, a[1]], bronze, [-nn[0], 0, -nn[1]]);
        S.quad([d[0], DECK_Y, d[1]], [f[0], DECK_Y, f[1]], [f[0], RAIL, f[1]], [d[0], RAIL, d[1]], bronze, [nn[0], 0, nn[1]]);
      }
      for (let i = 0; i + 1 < path.length; i++) {
        if (e < 0 && [0, 1, 2, 3, 4].some((k) => opening(i + k))) continue;
        if (i % postEvery) continue; // 6 m rail pieces, post to post
        const j = Math.min(path.length - 1, i + postEvery);
        const o0 = e * (ro - 0.05), o1 = e * (ro + 0.05);
        S.quad(P(i, o0, RAIL + rh), P(j, o0, RAIL + rh), P(j, o1, RAIL + rh), P(i, o1, RAIL + rh), bronze, [0, 1, 0]);
        for (const [o, k] of [[o0, -e], [o1, e]]) S.quad(P(i, o, RAIL), P(j, o, RAIL), P(j, o, RAIL + rh), P(i, o, RAIL + rh), bronze, [path[i].n[0] * k, 0, path[i].n[1] * k]);
      }
    }

    // concrete piles every 6 m, a pair under each bent
    S.kind = KIND.MASONRY;
    for (let i = 2; i < path.length - 1; i += postEvery) {
      for (const e of [-1, 1]) {
        const c = P(i, e * (hw - 0.45), 0), t = path[i].t, nn = path[i].n, w = 0.2;
        const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [c[0] + t[0] * w * u + nn[0] * w * v, c[2] + t[1] * w * u + nn[1] * w * v]);
        for (let k = 0; k < 4; k++) {
          const p = corners[k], q = corners[(k + 1) % 4], mid = [(p[0] + q[0]) / 2 - c[0], 0, (p[1] + q[1]) / 2 - c[2]];
          S.quad([p[0], PILE_Y, p[1]], [q[0], PILE_Y, q[1]], [q[0], DECK_Y - 0.3, q[1]], [p[0], DECK_Y - 0.3, p[1]], pileCol, mid);
        }
      }
    }

    // stairs up to the promenade: flights in the gap between deck and embankment, climbing along the bank
    S.kind = KIND.PLAIN;
    const STEPS = 14, rise = (LAND_Y - DECK_Y) / STEPS, tread = 0.34;
    stairAt.forEach((k, si) => {
      if (k < 0 || k >= path.length) return;
      const dir = stairDir[si];
      const inner = -(path[k].bank + 0.6), outer = -hw; // stair spans from the deck's edge into the bank
      const wS = inner - outer; // negative: towards the bank
      const mid = (inner + outer) / 2;
      // landing at deck level
      const base = P(k, mid, 0), t = path[k].t, ang = Math.atan2(t[1], t[0]);
      S.box(base[0], base[2], DECK_Y - 0.3, DECK_Y, 1.6, Math.abs(wS), ang, shade(wood, 0.9), { bottom: true });
      for (let s = 0; s < STEPS; s++) {
        const along = dir * (0.8 + tread * (s + 0.5));
        const cx = base[0] + t[0] * along, cz = base[2] + t[1] * along;
        S.box(cx, cz, DECK_Y - 0.3 + rise * s, DECK_Y + rise * (s + 1), tread, Math.abs(wS), ang, shade(wood, woodShades[s % 3]));
      }
      // a bronze rail on the stair's open (deck) side
      const sOut = P(k, outer - 0.1, 0), run = 0.8 + tread * STEPS;
      S.beam([sOut[0] + t[0] * dir * 0.8, DECK_Y + 1.0, sOut[2] + t[1] * dir * 0.8], [sOut[0] + t[0] * dir * run, LAND_Y + 1.0, sOut[2] + t[1] * dir * run], 0.08, 0.08, bronze);
    });

    // low warm bollard lights along both edges, staggered every 12 m
    const pos = [], cols = [];
    for (let i = 2, k = 0; i < path.length; i += 4, k++) {
      const e = k % 2 ? 1 : -1, q = P(i, e * (hw - 0.3), DECK_Y + 0.55);
      pos.push(q[0], q[1], q[2]);
      const f = 0.94 + 0.06 * ((k * 7) % 3) / 2;
      cols.push(1.0 * f, 0.74 * f, 0.4 * f);
    }
    S.kind = KIND.PLAIN;
    // a small square post (closed, so it shows from every side under the FrontSide city material)
    for (let i = 0; i < pos.length; i += 3) S.box(pos[i], pos[i + 2], DECK_Y, DECK_Y + 0.5, 0.18, 0.18, 0, bronze);
    const pts = glowPoints(pos, cols, 4);
    pts.userData.glow = true;
    group.add(pts);
    glows.push(pts);

  } catch (e) {
    console.warn('boardwalk:', e);
  } finally {
    S.kind = KIND.PLAIN;
    S.base = 0;
  }
  return { glows };
}
