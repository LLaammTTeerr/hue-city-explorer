import { KIND, hex, shade, unflat, inRing } from '../../geo/buf.ts';
import { glowPoints } from '../../geo/materials.ts';
import { rise } from '../../geo/terrain.ts';
import { LAND_Y } from '../../config.ts';

// Cầu gỗ lim (cầu đi bộ gỗ lim): the ironwood walkway on the south bank of the Hương. KOICA-funded, opened
// November 2018. It stands in the water on concrete piles and runs from the Nguyễn Đình Chiểu promenade (by cầu
// Trường Tiền) upstream past the south end of cầu Phú Xuân to công viên Lý Tự Trọng. See docs/places/golim.md.
//
// Confirmed:
//  - nearly 400 m long ("over 380 m" / "380 m" in other reports), 4 m wide, about 1 m above the water, on concrete
//    piles in the riverbed; deck of about 16,000 South African lim boards; railing of about 4,100 gold-toned bronze
//    bars (7 t, made in Korea); waterproof lighting, railing lights and lamp posts (nguoiquansat.vn, mia.vn,
//    e.vnexpress.net 3824765, tuoitrenews 2018, LUCI association).
//  - the plan: OSM ways 683633953, 1167513733, 1167513732 and 1167513742 (footway, bridge=yes, "Ironwood Foot
//    Bridge"), 436 m end to end including the two ends that turn onto the bank. Connections to the bank, from OSM:
//    footways leave the deck at four nodes (ways 1493443036, 1493443034, 1493443035, 1473289702), the last a
//    short footbridge to the south end of cầu Phú Xuân.
// Estimated: pile bents every 4.5 m (two square piles and a headstock), ramps at both ends, gangways at the four
//   links, the deck's stand-off where the model's mapped bank is wider
//   than the real embankment (the OSM line runs within a metre of it there).
export const id = 'golim';

// OSM centreline (model metres), downstream end (Nguyễn Đình Chiểu) first
const LINE = [[-72.9, 281.6], [-80.7, 288.6], [-82.3, 297.3], [-115.5, 328.9], [-139.9, 351.4], [-151.4, 362.0],
  [-155.9, 365.6], [-178.7, 387.5], [-205.6, 413.0], [-207.1, 414.5], [-264.0, 467.4], [-281.6, 484.5],
  [-298.0, 500.2], [-363.3, 561.6], [-362.9, 568.1], [-357.2, 575.0], [-347.9, 586.6]];
// deck nodes where OSM footways lead to the bank
const LINKS = [[-139.9, 351.4], [-205.6, 413.0], [-264.0, 467.4], [-298.0, 500.2]];

const WIDTH = 4, HW = WIDTH / 2, DECK_Y = 1.2, PILE_Y = -2.2, STEP = 1.5, RAMP = 16, CLEAR = 0.4;
const RAIL_H = 1.05, BAR = 0.21; // slat tops; slat pitch: ~4,100 bars along both sides of ~430 m
// slat face: the Street View photosphere taken on the deck shows broad flat slats, close set, their tops standing
// free above a single thin rail; no cap rail and no posts stand out
const BAR_W = 0.07, RAIL_AT = 0.92;
// deck boards: the photosphere shows narrow lim boards laid across the walk, in panels with staggered end joints
const BOARD_W = 0.15, PANEL = 2; // board width; samples (STEP each) per panel

// Colours as the walk looks now (Street View photosphere on the deck, Google satellite): the lim has weathered to a
// grey-brown and the bronze, gold-toned when new in 2018, has dulled to a dark brown-grey
const C = {
  lim: hex('#967c63'), fascia: hex('#5e4c3d'), bronze: hex('#c2a36b'), bronzeDk: hex('#9a7f52'), seam: hex('#615041'),
  pile: hex('#a8a296'), head: hex('#928c80'),
};
const BOARD = [1, 0.95, 0.98, 0.93, 0.96, 0.99];

// ------------------------------------------------------------------ plan
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let s = step - carry;
    while (s <= l) { out.push([a[0] + ((b[0] - a[0]) * s) / l, a[1] + ((b[1] - a[1]) * s) / l]); s += step; }
    carry = l - (s - step);
  }
  const e = pts[pts.length - 1], q = out[out.length - 1];
  if (Math.hypot(e[0] - q[0], e[1] - q[1]) > step * 0.3) out.push(e);
  return out;
}
function smooth(a, half, passes) {
  for (let k = 0; k < passes; k++) {
    a = a.map((v, i) => {
      const lo = Math.max(0, i - half), hi = Math.min(a.length - 1, i + half);
      if (Array.isArray(v)) { let x = 0, z = 0; for (let j = lo; j <= hi; j++) { x += a[j][0]; z += a[j][1]; } return [x / (hi - lo + 1), z / (hi - lo + 1)]; }
      let s = 0; for (let j = lo; j <= hi; j++) s += a[j]; return s / (hi - lo + 1);
    });
  }
  return a;
}
const segDist = (p, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
};

function landNear(data) {
  const out = [];
  for (const poly of data.land || []) {
    const rings = poly.map(unflat);
    if (rings[0].some((p) => Math.abs(p[0] + 215) < 500 && Math.abs(p[1] - 435) < 500)) out.push(rings);
  }
  const isLand = (x, z) => out.some((r) => inRing(x, z, r[0]) && !r.slice(1).some((h) => inRing(x, z, h)));
  const bank = (p) => {
    let b = Infinity;
    for (const rs of out) for (const r of rs) for (let i = 0; i < r.length; i++) {
      const a = r[i], c = r[(i + 1) % r.length];
      if (Math.abs(a[0] - p[0]) > 40 && Math.abs(c[0] - p[0]) > 40) continue;
      if (Math.abs(a[1] - p[1]) > 40 && Math.abs(c[1] - p[1]) > 40) continue;
      b = Math.min(b, segDist(p, a, c));
    }
    return b;
  };
  return { isLand, bank };
}

// [{ p, t (downstream → upstream), n (towards the water), y (deck top), wet (stands over water) }], STEP apart
export function golimPath(data) {
  const { isLand, bank } = landNear(data);
  let b = smooth(resample(LINE, STEP), 2, 2);
  b[0] = LINE[0]; b[b.length - 1] = LINE[LINE.length - 1];
  const n = b.length;
  const tanOf = (c, i) => {
    const a = c[Math.max(0, i - 2)], q = c[Math.min(c.length - 1, i + 2)], l = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1;
    return [(q[0] - a[0]) / l, (q[1] - a[1]) / l];
  };
  let tan = b.map((_, i) => tanOf(b, i));
  // the river lies to the right going upstream (north-west of the line): check by vote
  let vote = 0;
  for (let i = 0; i < n; i += 3) { const p = b[i], t = tan[i]; vote += isLand(p[0] - t[1] * 15, p[1] + t[0] * 15) ? -1 : 1; }
  const sg = vote >= 0 ? 1 : -1;
  const nrmOf = (t): [number, number] => [-t[1] * sg, t[0] * sg];

  // samples whose OSM centre is on the model's land are the ends where the walk turns onto the bank
  const wet0 = b.map((p) => !isLand(p[0], p[1]));
  let i0 = wet0.indexOf(true), i1 = wet0.lastIndexOf(true);
  if (i0 < 0) throw new Error('golim: OSM line not over water');
  // over the water, push the deck out just enough that its bank-side edge clears the mapped embankment
  const off = b.map((p, i) => {
    if (i < i0 || i > i1) return 0;
    const nn = nrmOf(tan[i]);
    let o = 0;
    for (; o < 6; o += 0.25) {
      const q = [p[0] + nn[0] * (o - HW), p[1] + nn[1] * (o - HW)];
      if (!isLand(q[0], q[1]) && bank(q) >= CLEAR) break;
    }
    return o;
  });
  const W = 8;
  const mx = off.map((_, i) => Math.max(...off.slice(Math.max(i0, i - W), Math.min(i1 + 1, i + W + 1)).concat([0])));
  const so = smooth(mx, 6, 3).map((v, i) => (i < i0 || i > i1 ? 0 : v));
  // fade the push in and out across the ends so the deck still meets the bank where OSM has it
  for (let k = 0; k < 10; k++) { so[Math.min(n - 1, i0 + k)] *= (k + 1) / 10; so[Math.max(0, i1 - k)] *= (k + 1) / 10; }
  const c = b.map((p, i) => { const nn = nrmOf(tan[i]); return [p[0] + nn[0] * so[i], p[1] + nn[1] * so[i]]; });
  tan = c.map((_, i) => tanOf(c, i));

  // deck height: about 1 m over the water, ramping up to the promenade over the last RAMP metres of each end
  const wet = c.map((p) => !isLand(p[0], p[1]));
  const w0 = wet.indexOf(true), w1 = wet.lastIndexOf(true);
  const landY = (p) => LAND_Y + rise(p[0], p[1]) + 0.06;
  const yEnd0 = landY(c[0]), yEnd1 = landY(c[n - 1]);
  const ramp = (d) => { const f = Math.max(0, 1 - d / RAMP); return f * f * (3 - 2 * f); };
  return c.map((p, i) => {
    let y = DECK_Y;
    if (i <= w0) y = Math.max(DECK_Y, landY(p));
    else if (i >= w1) y = Math.max(DECK_Y, landY(p));
    else {
      const d0 = (i - w0) * STEP, d1 = (w1 - i) * STEP;
      y = DECK_Y + (yEnd0 - DECK_Y) * ramp(d0) + (yEnd1 - DECK_Y) * ramp(d1);
    }
    return { p, t: tan[i], n: nrmOf(tan[i]), y, wet: i > w0 && i < w1 };
  });
}

// ------------------------------------------------------------------ model
export function build({ data, S, group }) {
  const path = golimPath(data);
  const { isLand } = landNear(data);
  const m = path.length;
  const n0 = S.n;
  S.base = 0;
  S.kind = KIND.PLAIN;
  const P = (i, o, dy = 0): [number, number, number] => [path[i].p[0] + path[i].n[0] * o, path[i].y + dy, path[i].p[1] + path[i].n[1] * o];
  const hn = (i, k): [number, number, number] => [path[i].n[0] * k, 0, path[i].n[1] * k];

  // where the links meet the deck: the nearest sample, and openings in the bank-side railing
  const linkAt = LINKS.map((q) => {
    let best = 0, bd = Infinity;
    path.forEach((s, i) => { const d = Math.hypot(s.p[0] - q[0], s.p[1] - q[1]); if (d < bd) { bd = d; best = i; } });
    return best;
  });
  const opening = (i) => linkAt.some((k) => Math.abs(i - k) <= 1);

  // deck: a quad per sample, toned per panel; transverse board seams; panel joints, the boards' end joints running
  // along the walk and staggered from panel to panel; dark edge beams on both sides, end caps
  const L3 = (a, b, f): [number, number, number] => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  const nb = Math.max(1, Math.round(STEP / BOARD_W));
  for (let i = 0; i + 1 < m; i++) {
    const pan = Math.floor(i / PANEL);
    const col = shade(C.lim, BOARD[pan % BOARD.length]);
    S.quad(P(i, -HW), P(i + 1, -HW), P(i + 1, HW), P(i, HW), col, [0, 1, 0]);
    const l0 = P(i, -HW, 0.004), l1 = P(i + 1, -HW, 0.004), r0 = P(i, HW, 0.004), r1 = P(i + 1, HW, 0.004);
    for (let k = 0; k < nb; k++) {
      const panelJoint = k === 0 && i % PANEL === 0;
      const w = (panelJoint ? 0.025 : 0.009) / STEP, f = k / nb;
      const fa = Math.max(0, f - w), fb = Math.min(1, f + w);
      S.quad(L3(l0, l1, fa), L3(l0, l1, fb), L3(r0, r1, fb), L3(r0, r1, fa), panelJoint ? C.seam : shade(C.seam, 1.12), [0, 1, 0]);
    }
    // end joints: boards about 1.3-2 m long, joints shifted every other panel
    for (const o of pan % 2 ? [-0.7, 0.9] : [-1.0, 0.4, 1.4]) {
      const w = 0.006;
      S.quad(P(i, o - w, 0.005), P(i + 1, o - w, 0.005), P(i + 1, o + w, 0.005), P(i, o + w, 0.005), shade(C.seam, 1.15), [0, 1, 0]);
    }
    for (const e of [-1, 1]) S.quad(P(i, e * HW), P(i + 1, e * HW), P(i + 1, e * HW, -0.45), P(i, e * HW, -0.45), C.fascia, hn(i, e));
    S.quad(P(i, -HW, -0.45), P(i + 1, -HW, -0.45), P(i + 1, HW, -0.45), P(i, HW, -0.45), C.fascia, [0, -1, 0]);
  }
  for (const [i, s] of ([[0, -1], [m - 1, 1]] as any[])) {
    const h = [path[i].t[0] * s, 0, path[i].t[1] * s];
    S.quad(P(i, -HW), P(i, HW), P(i, HW, -0.45), P(i, -HW, -0.45), C.fascia, h);
  }

  // piles: a bent every 4.5 m over the water, two square concrete piles under a headstock
  S.kind = KIND.MASONRY;
  for (let i = 2; i < m - 2; i += 3) {
    if (!path[i].wet) continue;
    const t = path[i].t, ang = Math.atan2(t[1], t[0]), y = path[i].y - 0.45;
    const c = P(i, 0);
    S.box(c[0], c[2], y - 0.4, y, 0.4, WIDTH - 0.3, ang, C.head, { bottom: true });
    for (const e of [-1, 1]) {
      const q = P(i, e * (HW - 0.5));
      if (isLand(q[0], q[2])) continue;
      S.box(q[0], q[2], PILE_Y, y - 0.4, 0.35, 0.35, ang, C.pile);
    }
  }

  // railings: broad flat bronze slats standing on the deck edge, their tops free above one thin rail; no cap, no posts
  S.kind = KIND.PLAIN;
  const RO = HW - 0.06;
  const railOff = (i) => (i < 2 || i > m - 3); // the two ends meet the promenade: open
  for (const e of [-1, 1]) {
    const skip = (i) => railOff(i) || (e < 0 && opening(i));
    for (let i = 0; i + 1 < m; i++) {
      if (skip(i) || skip(i + 1)) continue;
      const a = P(i, e * RO), b = P(i + 1, e * RO);
      // the rail runs on the deck side of the slats
      const ri = -e * 0.025;
      S.beam([a[0] + path[i].n[0] * ri, a[1] + RAIL_AT, a[2] + path[i].n[1] * ri],
        [b[0] + path[i + 1].n[0] * ri, b[1] + RAIL_AT, b[2] + path[i + 1].n[1] * ri], 0.035, 0.03, C.bronzeDk);
      // slats: flat back-to-back blades, BAR apart
      const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const k0 = Math.ceil((i * STEP) / BAR), k1 = Math.floor(((i + 1) * STEP - 1e-6) / BAR);
      for (let k = k0; k <= k1; k++) {
        const f = (k * BAR - i * STEP) / L;
        const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, z = a[2] + (b[2] - a[2]) * f;
        const t = path[i].t, w = BAR_W / 2;
        const p0 = [x - t[0] * w, y, z - t[1] * w], p1 = [x + t[0] * w, y, z + t[1] * w];
        const q1 = [p1[0], y + RAIL_H, p1[2]], q0 = [p0[0], y + RAIL_H, p0[2]];
        S.quad(p0, p1, q1, q0, C.bronze, hn(i, 1));
        S.quad(p1, p0, q0, q1, C.bronze, hn(i, -1));
      }
    }
  }

  // gangways at the four links: from the deck's bank-side edge across the gap to the embankment
  const glowPos = [], glowCol = [];
  for (const k of linkAt) {
    const s = path[k], nn = s.n, t = s.t, ang = Math.atan2(t[1], t[0]);
    const e0 = [s.p[0] - nn[0] * HW, s.p[1] - nn[1] * HW];
    let gap = 0;
    for (; gap < 20; gap += 0.25) if (isLand(e0[0] - nn[0] * gap, e0[1] - nn[1] * gap)) break;
    if (gap >= 20) continue;
    const run = gap + 0.8; // into the bank a little, so it lands on the promenade
    const y1 = LAND_Y + rise(e0[0] - nn[0] * run, e0[1] - nn[1] * run) + 0.06;
    const steps = Math.max(2, Math.ceil(run / 0.5));
    for (let j = 0; j < steps; j++) {
      const f = (j + 0.5) / steps, y = s.y + (y1 - s.y) * ((j + 1) / steps);
      const cx = e0[0] - nn[0] * run * f, cz = e0[1] - nn[1] * run * f;
      S.box(cx, cz, y - 0.25, y, 2.4, run / steps + 0.02, ang, shade(C.lim, BOARD[j % BOARD.length]), { bottom: true });
    }
    for (const side of [-1, 1]) {
      const a = [e0[0] + t[0] * side * 1.15, e0[1] + t[1] * side * 1.15];
      const b2 = [a[0] - nn[0] * gap, a[1] - nn[1] * gap];
      const yb = s.y + (y1 - s.y) * (gap / run);
      S.beam([a[0], s.y + RAIL_H, a[1]], [b2[0], yb + RAIL_H, b2[1]], 0.08, 0.06, C.bronze);
      for (const g of [0, 1]) {
        const q = g ? b2 : a, yq = g ? yb : s.y;
        S.box(q[0], q[1], yq, yq + RAIL_H + 0.06, 0.1, 0.1, ang, C.bronzeDk);
      }
    }
  }

  // lighting: low lights in the railing every 6 m on both sides. The photosphere on the deck shows over 100 m of
  // river-side railing with no lamp post, so the reported lamp posts are left to the promenade.
  for (let i = 6; i < m - 4; i += 4) {
    if (railOff(i)) continue;
    for (const e of [-1, 1]) {
      if (e < 0 && opening(i)) continue;
      const q = P(i, e * (RO - 0.08), 0.35);
      glowPos.push(q[0], q[1], q[2]); glowCol.push(1.0, 0.72, 0.38);
    }
  }
  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = KIND.PLAIN;

  const pts = glowPoints(glowPos, glowCol, 4);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
}
