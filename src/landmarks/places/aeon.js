import { KIND, Buf, hex, shade, unflat, signedArea, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { groundHeightAt, addEmissiveStripMesh } from '../helpers.js';

// AEON MALL Huế, 8 Võ Nguyên Giáp (An Vân Dương), opened 16 September 2024 (ceremony 21 September), issue #71.
// See docs/places/aeon.md.
//
// AEON Mall Vietnam's press release (21 Sept 2024) gives: RC building, 4 floors and a basement, floor area about
// 138,000 m² on a site of 86,000 m²; a sunken "Moon Garden" on the south side under a "terrace street" of roof
// gardens on the 3rd and 4th floors; exterior concept "Culture Stream", a flowing white "stream line" motif. Its
// concept and night renders (both marked tentative) and an opening-day drone photo show what is modelled here:
//   hub      the main entrance on the rounded outer corner of the L (the arc in the OSM outline), facing north-west
//            over the forecourt to the Võ Nguyên Giáp / Văn Tiến Dũng junction: a dark glass front through the
//            floors, the atrium behind it, framed by a sweeping white band carrying AEON MALL in magenta.
//   wings    either side of it, screens of vertical bronze fins over the upper floors, rising above the roof;
//            taupe walls with a strip of shopfronts below; an orange box standing forward right of the entrance.
//   ends     white blocks at the two ends of the L with magenta AEON sign boxes at the top corners.
//   roof     tree terraces on the inner (south) side, solar panels and plant beyond.
// No height is published (the 2022 plan only capped it at 60 m); four mall storeys of about 5.5 m give a roof near
// 22 m, the fin screens and end blocks 25-27 m, read off the renders against the storeys.
// Footprint: OSM way 1575540652 (building=retail, shop=mall), from data.special.aeon.

export const id = 'aeon';

const C = {
  wall: hex('#6c625a'), wallLo: hex('#4c4a49'), grey: hex('#bdb9b2'), white: hex('#efeeea'), roof: hex('#a7a49d'),
  slat: hex('#b48a55'), slatDk: hex('#8a6440'), orange: hex('#c4682c'), glass: hex('#34424d'), atrium: hex('#5d7f6a'),
  magenta: hex('#c0187a'), solar: hex('#3d5168'), green: hex('#4f7136'), greenDk: hex('#3d5a2b'), deck: hex('#9b8f80'),
  steel: hex('#6f7378'), stripe: hex('#d9cfc6'),
};


export function build({ data, S, group }) {
  const sp = data.special && data.special.aeon;
  if (!sp) return;
  const R = unflat(sp.ring);
  if (R.length < 6) return;
  if (signedArea(R) < 0) R.reverse(); // so convex turns have a positive cross product

  // the frame: v along the long arm of the L (its longest edge, + towards the arm's far end), u across it, + into the
  // L; the origin at the inner corner (the reflex vertex nearest the middle). The long arm then lies at u < 0, the
  // short arm at v < 0, and the rounded outer corner (the entrance) faces -u -v.
  let best = null;
  for (let i = 0; i < R.length; i++) {
    const p = R[i], q = R[(i + 1) % R.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (!best || L > best.L) best = { p, q, L };
  }
  const cen = R.reduce((s, p) => [s[0] + p[0] / R.length, s[1] + p[1] / R.length], [0, 0]); // only to pick the origin
  let O = null;
  for (let i = 0; i < R.length; i++) {
    const a = R[(i + R.length - 1) % R.length], b = R[i], c = R[(i + 1) % R.length];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) >= 0) continue;
    const d = Math.hypot(b[0] - cen[0], b[1] - cen[1]);
    if (!O || d < O.d) O = { p: b, d };
  }
  if (!O) return;
  const o = O.p;
  const dp = Math.hypot(best.p[0] - o[0], best.p[1] - o[1]), dq = Math.hypot(best.q[0] - o[0], best.q[1] - o[1]);
  const far = dp > dq ? best.p : best.q, near = dp > dq ? best.q : best.p;
  const W = [(far[0] - near[0]) / best.L, (far[1] - near[1]) / best.L];
  let T = [W[1], -W[0]];
  // the long arm's body lies at u < 0: judged by the vertices well along it (a plain centroid leans towards the arc)
  const armU = R.filter((p) => (p[0] - o[0]) * W[0] + (p[1] - o[1]) * W[1] > best.L / 4).reduce((s, p) => s + (p[0] - o[0]) * T[0] + (p[1] - o[1]) * T[1], 0);
  if (armU > 0) T = [-T[0], -T[1]];
  const P = (u, v) => [o[0] + T[0] * u + W[0] * v, o[1] + T[1] * u + W[1] * v];
  const UV = R.map((p) => [(p[0] - o[0]) * T[0] + (p[1] - o[1]) * T[1], (p[0] - o[0]) * W[0] + (p[1] - o[1]) * W[1]]);
  const angOf = (du, dv) => Math.atan2(T[1] * du + W[1] * dv, T[0] * du + W[0] * dv); // a u-v direction as a scene angle
  const aT = angOf(1, 0);
  const y0 = groundHeightAt(o[0], o[1]);
  const box = (u, v, ya, yb, su, sv, col, opt) => { const p = P(u, v); S.box(p[0], p[1], ya, yb, su, sv, aT, col, opt); };
  const vmax = Math.max(...UV.map((p) => p[1])), vmin = Math.min(...UV.map((p) => p[1])), umax = Math.max(...UV.map((p) => p[0]));
  // the two straight front faces either side of the arc: the long arm's (u = uW) and the short arm's (v = vN)
  const uW = Math.max(...UV.filter((p) => p[0] < -10 && p[1] > -25 && p[1] < 110).map((p) => p[0]));
  const vN = Math.min(...UV.filter((p) => p[0] > -15 && p[0] < 35).map((p) => p[1]));
  // the arc: the run of short edges between the two faces; its centre is where the faces' normals through its two
  // ends meet, i.e. (largest u, largest v) of its points
  const arc = [];
  for (let i = 0; i < UV.length; i++) {
    const p = UV[i], q = UV[(i + 1) % UV.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L >= 2 && L <= 14 && p[0] < uW + 60 && p[1] < vN + 60 && p[0] <= 0 && p[1] <= 0 && Math.min(p[0], q[0]) < -3 && Math.min(p[1], q[1]) < -3) arc.push([p, q]);
  }
  if (!arc.length) return;
  const ctr = [Math.max(...arc.flat().map((p) => p[0])), Math.max(...arc.flat().map((p) => p[1]))];

  const LB = new Buf(1024), MB = new Buf(256), GB = new Buf(512); // night: warm shopfronts, magenta signs, the atrium
  const lit = (B, u, v, ya, yb, su, sv) => { const p = P(u, v); B.box(p[0], p[1], ya, yb, su, sv, aT, [1, 1, 1], { top: [1, 1, 1], bottom: true }); };
  S.base = y0 - LAND_Y;

  const ROOF = 22.0, PAR = 1.2, ENDS = 27.0, EAST = 25.0, FIN = 25.5;
  // ---------------- the body: the whole footprint to the roof, white slab bands, a dark base ----------------
  S.kind = KIND.MODERN;
  S.prism(R, y0 - 0.5, y0 + ROOF, C.wall, C.roof, { parapet: PAR, topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  const band = (ya, yb, col, out) => {
    for (let i = 0; i < R.length; i++) {
      const p = R[i], q = R[(i + 1) % R.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (L < 0.5) continue;
      const t = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      let nn = [t[1], -t[0]];
      if (inRing(m[0] + nn[0] * 0.5, m[1] + nn[1] * 0.5, R)) nn = [-nn[0], -nn[1]]; // outwards
      S.box(m[0] + nn[0] * out / 2, m[1] + nn[1] * out / 2, ya, yb, L + out, out, Math.atan2(t[1], t[0]), col, { bottom: true });
    }
  };
  band(y0 - 0.5, y0 + 1.2, C.wallLo, 0.3);
  band(y0 + 10.6, y0 + 11.3, C.white, 0.35);
  band(y0 + ROOF + PAR - 0.6, y0 + ROOF + PAR + 0.15, C.white, 0.4);

  // a run of work along a straight face from (ua, va) to (ub, vb), n = its outward normal in u-v
  const along = (ua, va, ub, vb, step, fn) => {
    const L = Math.hypot(ub - ua, vb - va), k = Math.max(1, Math.floor(L / step));
    for (let i = 0; i < k; i++) fn(ua + ((ub - ua) * (i + 0.5)) / k, va + ((vb - va) * (i + 0.5)) / k, L / k);
  };
  const fins = (ua, va, ub, vb, n, y1) => {
    const su = Math.abs(ub - ua) + Math.abs(n[0]) * 0.4, sv = Math.abs(vb - va) + Math.abs(n[1]) * 0.4;
    box((ua + ub) / 2 + n[0] * 0.25, (va + vb) / 2 + n[1] * 0.25, y0 + 11.3, y1 - 0.4, su, sv, C.slatDk, { top: C.slatDk });
    let k = 0;
    along(ua, va, ub, vb, 1.4, (u, v) => {
      k++;
      box(u + n[0] * 0.9, v + n[1] * 0.9, y0 + 11.3, y1 + (k % 6 === 0 ? 0.5 : 0), 0.3 + Math.abs(n[0]) * 0.6, 0.3 + Math.abs(n[1]) * 0.6, k % 3 ? C.slat : shade(C.slat, 0.88));
    });
  };
  const shops = (ua, va, ub, vb, n, every) => {
    let k = 0;
    along(ua, va, ub, vb, 7, (u, v, l) => {
      const su = Math.abs(n[1]) * (l - 1) + Math.abs(n[0]) * 0.3, sv = Math.abs(n[0]) * (l - 1) + Math.abs(n[1]) * 0.3;
      box(u + n[0] * 0.15, v + n[1] * 0.15, y0 + 1.2, y0 + 4.8, su, sv, C.glass);
      if (k++ % every === 0) lit(LB, u + n[0] * 0.35, v + n[1] * 0.35, y0 + 1.4, y0 + 4.6, Math.max(0.06, su - 0.6 * Math.abs(n[1])), Math.max(0.06, sv - 0.6 * Math.abs(n[0])));
    });
  };

  // ---------------- the ends of the L: white blocks, the magenta AEON sign boxes ----------------
  const uEnd = Math.min(...UV.filter((p) => p[1] > vmax - 60).map((p) => p[0])); // the long arm widens at its far end
  {
    const v0 = vmax - 72, cu = uEnd / 2, su = -uEnd - 0.6;
    S.kind = KIND.MODERN;
    box(cu, (v0 + vmax) / 2, y0 + ROOF - 1, y0 + ENDS, su, vmax - v0 - 0.6, C.white, { top: C.roof, topKind: KIND.FLAT });
    S.kind = KIND.PLAIN;
    for (const y of [12.5, 17, 21.5]) box(cu, vmax + 0.1, y0 + y, y0 + y + 1.4, su * 0.8, 0.3, C.grey); // window strips on the end face
    box(cu, vmax + 0.2, y0 + 1.2, y0 + 9.5, su * 0.85, 0.3, C.glass);
    for (let k = 0; k < 6; k++) lit(LB, cu + (k - 2.5) * su * 0.14, vmax + 0.4, y0 + 1.6, y0 + 4.2, su * 0.11, 0.06);
    // sign boxes at the top corner towards the front: on the front face and on the end
    box(uEnd - 0.3, vmax - 6, y0 + ENDS - 6.5, y0 + ENDS - 1.0, 0.5, 7.0, C.magenta);
    lit(MB, uEnd - 0.6, vmax - 6, y0 + ENDS - 5.8, y0 + ENDS - 1.7, 0.08, 5.6);
    box(uEnd + 5, vmax + 0.35, y0 + ENDS - 6.5, y0 + ENDS - 1.0, 7.0, 0.5, C.magenta);
    lit(MB, uEnd + 5, vmax + 0.65, y0 + ENDS - 5.8, y0 + ENDS - 1.7, 5.6, 0.08);
  }
  {
    // the short arm's end: a white block with fine vertical striping on the front, a sign box at its corner
    const u0 = umax - 34, vF = vmin, v1 = Math.min(vmin + 56, -20);
    S.kind = KIND.MODERN;
    box((u0 + umax) / 2, (vF + v1) / 2, y0 + ROOF - 1, y0 + EAST, umax - u0 - 0.6, v1 - vF - 0.6, C.white, { top: C.roof, topKind: KIND.FLAT });
    S.kind = KIND.PLAIN;
    along(u0 + 2, vF, umax - 8, vF, 1.2, (u, v) => box(u, v - 0.2, y0 + 6, y0 + EAST - 1.5, 0.35, 0.4, C.stripe));
    box(umax - 4, vF - 0.3, y0 + EAST - 6, y0 + EAST - 1, 6.0, 0.5, C.magenta);
    lit(MB, umax - 4, vF - 0.6, y0 + EAST - 5.4, y0 + EAST - 1.6, 4.8, 0.08);
    box(umax + 0.3, vF + 4, y0 + EAST - 6, y0 + EAST - 1, 0.5, 6.0, C.magenta);
    lit(MB, umax + 0.6, vF + 4, y0 + EAST - 5.4, y0 + EAST - 1.6, 0.08, 4.8);
  }

  // ---------------- the front either side of the hub: fin screens, shopfronts, the orange box ----------------
  const vFar = vmax - 74; // where the long arm's end block begins
  // seen from the forecourt (looking south-east) the long arm is on the right of the entrance, the short arm on the left
  fins(uW, 4, uW, 46, [-1, 0], y0 + FIN); // right of the entrance, along the long arm
  shops(uW, 4, uW, vFar, [-1, 0], 2);
  const vS = Math.min(...UV.filter((p) => p[0] > 30 && p[0] < umax - 36).map((p) => p[1])); // the short arm's front, past its step
  fins(0, vN, 36, vN, [0, -1], y0 + FIN); // left of the entrance, along the short arm
  shops(4, vN, 38, vN, [0, -1], 1);
  shops(42, vS, umax - 36, vS, [0, -1], 2);
  // the orange box standing forward over the entrances right of the hub (on the long arm), slatted
  box(uW - 4.2, 19, y0 + 5.6, y0 + 10.4, 8.4, 30, C.orange, { top: C.roof });
  along(uW - 8.5, 4.5, uW - 8.5, 33.5, 1.5, (u, v) => box(u, v, y0 + 5.7, y0 + 10.3, 0.4, 0.3, shade(C.orange, 0.8)));
  for (const v of [6, 19, 32]) box(uW - 7.8, v, y0, y0 + 5.6, 0.6, 0.6, C.white);

  // ---------------- the hub: glass round the arc, the sweeping white band, AEON MALL ----------------
  {
    const r0 = arc.reduce((s, [p]) => s + Math.hypot(p[0] - ctr[0], p[1] - ctr[1]), 0) / arc.length;
    for (const [p, q] of arc) {
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]), t = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
      const mu = (p[0] + q[0]) / 2, mv = (p[1] + q[1]) / 2;
      let n = [-t[1], t[0]];
      if ((mu - ctr[0]) * n[0] + (mv - ctr[1]) * n[1] < 0) n = [-n[0], -n[1]];
      const a = angOf(t[0], t[1]);
      const at = (off, ya, yb, col, B) => {
        const c = P(mu + n[0] * off, mv + n[1] * off);
        if (B) B.box(c[0], c[1], ya, yb, L, 0.08, a, [1, 1, 1], { top: [1, 1, 1], bottom: true });
        else S.box(c[0], c[1], ya, yb, L + 0.1, 0.2, a, col);
      };
      at(0.25, y0 + 0.2, y0 + ROOF + 1.4, C.atrium);
      at(0.4, y0 + 0.4, y0 + ROOF + 1.2, C.glass);
      for (const y of [5.5, 11, 16.5]) at(0.55, y0 + y - 0.25, y0 + y + 0.25, C.grey); // the floor slabs behind the glass
      at(0.6, y0 + 1.0, y0 + ROOF - 1.0, null, GB);
      const c = P(p[0] + n[0] * 0.6, p[1] + n[1] * 0.6);
      S.box(c[0], c[1], y0 + 0.2, y0 + ROOF + 1.4, 0.2, 0.3, a, C.steel); // a mullion at each kink
      // the white band, 3 m proud of the glass: a deep fascia at the roof line, a canopy over the doors
      const off = 3.0, Lb = L * (r0 + off) / r0 + 0.2, cb = P(mu + n[0] * off, mv + n[1] * off), ci = P(mu + n[0] * off / 2, mv + n[1] * off / 2);
      S.box(cb[0], cb[1], y0 + ROOF - 3.0, y0 + ROOF + 3.6, Lb, 0.9, a, C.white, { bottom: true });
      S.box(ci[0], ci[1], y0 + ROOF + 3.1, y0 + ROOF + 3.6, Lb, off, a, C.white, { bottom: true });
      S.box(cb[0], cb[1], y0 + 5.2, y0 + 6.1, Lb, 0.9, a, C.white, { bottom: true });
      S.box(ci[0], ci[1], y0 + 5.2, y0 + 5.5, Lb, off, a, C.white, { bottom: true });
      lit(LB, mu + n[0] * off / 2, mv + n[1] * off / 2, y0 + 5.12, y0 + 5.18, L * 0.5, 1.4);
    }
    // the band sweeps smoothly down into a crisp white portal pilaster at its long-arm end and curls cleanly at its short-arm end
    const pts = arc.flat();
    const eL = pts.reduce((m, x) => (x[1] > m[1] ? x : m)), eR = pts.reduce((m, x) => (x[0] > m[0] ? x : m));
    const nSweep = 10;
    for (let k = 0; k < nSweep; k++) {
      const t0 = k / nSweep, t1 = (k + 1) / nSweep, tm = (t0 + t1) / 2;
      const yb = y0 + 5.2 + (ROOF - 8.2) * (1 - Math.cos(tm * Math.PI * 0.5));
      const yt = y0 + ROOF + 3.6 - 3.0 * tm * tm;
      box(eL[0] - 3.0 + tm * 1.4, eL[1] + 0.5 + tm * 16.0, yb, yt, 0.9, 1.85, C.white, { bottom: true });
    }
    box(eL[0] - 1.6, eL[1] + 16.8, y0, y0 + ROOF + 0.6, 1.1, 2.2, C.white);
    box(eR[0] + 2.5, eR[1] - 3.0, y0, y0 + ROOF + 3.6, 5.0, 0.9, C.white);
    // AEON MALL on the band at its crown
    // centred by angle between the arc's two ends, not on its middle vertex (the OSM arc's vertices are uneven)
    const dir = (p) => { const l = Math.hypot(p[0] - ctr[0], p[1] - ctr[1]); return [(p[0] - ctr[0]) / l, (p[1] - ctr[1]) / l]; };
    const d0 = dir(eL), d1 = dir(eR);
    let n = [d0[0] + d1[0], d0[1] + d1[1]];
    const nl = Math.hypot(n[0], n[1]); n = [n[0] / nl, n[1] / nl];
    const mid = [ctr[0] + n[0] * r0, ctr[1] + n[1] * r0];
    const a = angOf(-n[1], n[0]);
    const sc = P(mid[0] + n[0] * 3.55, mid[1] + n[1] * 3.55), sl = P(mid[0] + n[0] * 3.7, mid[1] + n[1] * 3.7);
    S.box(sc[0], sc[1], y0 + ROOF - 0.4, y0 + ROOF + 2.9, 18, 0.25, a, C.magenta);
    MB.box(sl[0], sl[1], y0 + ROOF, y0 + ROOF + 2.5, 17, 0.08, a, [1, 1, 1], { top: [1, 1, 1], bottom: true });
  }

  // ---------------- the roof: tree terraces on the inner side, solar panels and plant beyond ----------------
  // Guard every rooftop element with inRing(p, R) so nothing ever floats beyond the L-shaped roof slab.
  {
    const yr = y0 + ROOF;
    const onRoof = (u, v, pad = 2.5) => {
      for (const [du, dv] of [[0, 0], [-pad, 0], [pad, 0], [0, -pad], [0, pad]]) {
        const q = P(u + du, v + dv);
        if (!inRing(q[0], q[1], R)) return false;
      }
      return true;
    };
    for (const [cu, cv, su, sv] of [[-14, 14, 20, 40], [30, -26, 30, 14], [-20, -14, 14, 14]]) {
      if (onRoof(cu, cv, Math.min(su, sv) * 0.42)) {
        box(cu, cv, yr, yr + 0.35, su, sv, C.deck, { top: C.deck, topKind: KIND.ROAD });
      }
      for (let k = 0; k < 7; k++) {
        const pu = cu + (((k * 37) % 10) / 10 - 0.45) * (su - 6), pv = cv + (((k * 53) % 10) / 10 - 0.45) * (sv - 6);
        if (!onRoof(pu, pv, 2.2)) continue;
        box(pu, pv, yr + 0.35, yr + 0.9, 3.6, 3.6, C.greenDk, { top: C.green });
        const p = P(pu, pv);
        S.cyl(p[0], p[1], yr + 0.9, yr + 3.0 + (k % 3) * 0.6, 1.5, 1.0, 7, k % 2 ? C.green : C.greenDk);
      }
    }
    S.kind = KIND.FLAT;
    for (let v = 44; v < vFar - 4; v += 5) if (onRoof(uW / 2, v, 3)) box(uW / 2, v, yr + 0.3, yr + 0.7, -uW - 12, 3.2, C.solar, { top: C.solar });
    for (let u = 40; u < umax - 40; u += 5) if (onRoof(u, (vS - 20) / 2 - 6, 3)) box(u, (vS - 20) / 2 - 6, yr + 0.3, yr + 0.7, 3.2, -20 - vS - 22, C.solar, { top: C.solar });
    S.kind = KIND.PLAIN;
    for (const [cu, cv] of [[uW / 2, -40], [uW / 2 - 12, -30], [30, (vS - 20) / 2 + 12]]) if (onRoof(cu, cv, 4.5)) box(cu, cv, yr, yr + 2.4, 8, 5, C.grey);
  }

  // ---------------- landscaped forecourt parking bays, tree islands & parked cars ----------------
  {
    const carCols = [hex('#e8e6e0'), hex('#323842'), hex('#a8322d'), hex('#345c8a'), hex('#c7c4bc'), hex('#6e7478')];
    for (let row = 0; row < 3; row++) {
      const pu = uW - 22 - row * 15;
      // landscaped green divider island with trees between parking aisles
      S.kind = KIND.MASONRY;
      box(pu + 6.8, 42, y0 - 0.05, y0 + 0.3, 2.2, 54, C.grey, { top: C.green, topKind: KIND.GROUND });
      S.kind = KIND.PLAIN;
      for (let t = 0; t < 5; t++) {
        const tp = P(pu + 6.8, 18 + t * 12);
        S.cyl(tp[0], tp[1], y0 + 0.3, y0 + 2.4, 0.16, 0.12, 6, hex('#5a4634'));
        S.cyl(tp[0], tp[1], y0 + 2.2, y0 + 4.8, 1.5, 0.95, 7, t % 2 ? C.green : C.greenDk);
      }
      // white parking bay markings & parked cars
      for (let k = 0; k < 10; k++) {
        const pv = 16 + k * 5.2;
        box(pu, pv - 2.6, y0 + 0.02, y0 + 0.06, 4.6, 0.14, C.white);
        if ((k + row * 2) % 3 === 1) continue;
        const cc = carCols[(k * 3 + row) % carCols.length];
        box(pu, pv, y0 + 0.25, y0 + 0.95, 4.2, 1.85, cc, { top: cc });
        box(pu - 0.15, pv, y0 + 0.95, y0 + 1.48, 2.3, 1.62, C.glass, { top: cc });
      }
    }
    // inner south-east Moon Garden plaza (documented landscaped court & lawn islands raised cleanly above paved slab)
    const mu = 46, mv = 46;
    S.kind = KIND.MASONRY;
    box(mu, mv, y0 - 0.05, y0 + 0.28, 70, 58, C.white, { top: C.green, topKind: KIND.GROUND });
    S.kind = KIND.ROAD;
    box(mu, mv, y0 + 0.26, y0 + 0.34, 70, 7.5, C.deck, { topKind: KIND.ROAD });
    box(mu, mv, y0 + 0.26, y0 + 0.34, 7.5, 58, C.deck, { topKind: KIND.ROAD });
    // circular Moon Garden central amphitheater fountain & crescent pergola ring
    const mp = P(mu, mv);
    S.kind = KIND.MASONRY;
    S.cyl(mp[0], mp[1], y0 + 0.28, y0 + 0.72, 11.5, 11.2, 20, C.white, { top: C.deck, topKind: KIND.ROAD });
    S.cyl(mp[0], mp[1], y0 + 0.72, y0 + 0.88, 7.2, 7.0, 18, hex('#4f8494'));
    S.cyl(mp[0], mp[1], y0 + 0.72, y0 + 1.65, 1.6, 1.2, 12, C.white);
    // landscaped shade trees framing the Moon Garden lawns
    S.kind = KIND.PLAIN;
    for (const du of [-24, -12, 12, 24]) for (const dv of [-18, 18]) {
      const tp = P(mu + du, mv + dv);
      S.cyl(tp[0], tp[1], y0 + 0.28, y0 + 2.55, 0.18, 0.13, 6, hex('#5a4634'));
      S.cyl(tp[0], tp[1], y0 + 2.35, y0 + 5.35, 2.0, 1.25, 7, (du + dv) % 24 === 0 ? C.green : C.greenDk);
    }
  }

  for (const [B, col, boost] of [[LB, 0xffe2b0, 1.0], [MB, 0xff4fb0, 1.4], [GB, 0xfff1c8, 0.85]]) {
    addEmissiveStripMesh(group, B, col, boost, id);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
