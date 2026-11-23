import { KIND, hex, shade, unflat, inRing } from '../../geo/buf.js';
import { bridgeProfiles, bridgeLamps } from '../../geo/bridges.js';
import { rise } from '../../geo/terrain.js';
import { LAND_Y, ROAD_W } from '../../config.js';

// Cầu Phú Xuân ("cầu Mới"; built 1970–71 as cầu Sông Hương, renamed after 1975), the reinforced-concrete girder
// bridge just upstream of Trường Tiền on the old Quốc lộ 1 (Lê Lợi ↔ Trần Hưng Đạo).
//
// Confirmed (docs/places/phuxuan.md has the URLs):
//  - length 374.65 m, 18 t rating (vi.wikipedia Cầu Phú Xuân; khamphahue.com.vn; tuoitre.vn 2024).
//  - position and axis: the OSM carriageway (class 0 road in hue.json) and the OSM bridge outline; checked against
//    Google satellite (axis 139.3° vs the model's 139.2°) and four Google-car Street View panoramas, whose lane
//    positions put the road's centre on the OSM axis within ~1 m.
//  - cross-section, from the satellite (two zooms) and the car panoramas, not the published 17 m: about 20 m over the
//    railings, a four-lane carriageway about 15 m wide (the class 0 road width the traffic already drives on) and a
//    tiled walkway about 2.6 m wide each side. The OSM outline is 20.9 m wide. docs/places/phuxuan.md has the
//    measurements; the 17 m / 12 m of the sources is the original 1971 figure or a misreport (owner question).
//  - markings: a double solid yellow centre line and dashed white lane lines (Street View).
//  - railing: grey steel posts with ball finials and rails, a fine grey fretwork panel with a small medallion in each
//    bay, on a low concrete kerb (Street View).
//  - lamps: pale grey posts about 10 m tall on the railing line, in pairs every ~30 m, each with a curved arm over the
//    carriageway (Street View, all four car panoramas on the deck); layout in geo/bridges.js NAMED (bridgeLamps).
// Estimated (no published drawing found):
//  - 10 equal spans of ~35 m on round-nosed wall piers with a crosshead, 5 precast girders 1.6 m deep under a
//    0.25 m slab; at the Lê Lợi (south) end two short spans on shallow 0.55 m beams over the bank and the lim
//    boardwalk that passes under the deck there; abutments at both ends.
//  - the long section: a long, nearly level deck (geo/bridges.js NAMED, shared with traffic and the lamp glows):
//    level at both streets, 5% off the south end for ~30 m (the least that leaves ~2 m over the boardwalk, whose deck
//    is 1.2 m up while the model's bank is 2.6 m), about 2% off the north end, a low crown ~4.8 m above the river.
//  - railing: post spacing 2.5 m and the fretwork simplified (a framed panel with diagonal lattice and a medallion,
//    bars either side); lamp design (pole, arm, flat lantern) simplified.
export const id = 'phuxuan';

const LEN = 374.65, CARR = ROAD_W[0], WALK = 2.6, W = CARR + 2 * WALK;
const SPANS = 10; // main spans; plus the two short ones at the south end (SHORT)
const SHORT = [16.3, 28.8]; // m from the south abutment: piers either side of the lim boardwalk (places/golim.js, ~29 m off the road's end)
const SLAB = 0.25, GIRDER = 1.6, SHALLOW = 0.55, KERB = 0.2;
const BRIDGE_TOP = LAND_Y + 0.42; // as landmarks/life.js rides it
const STEP = 2; // deck sampling (m)

// the deck's two end lines (places/index.js placeDeckEnds): square to the chord, at the road's two ends
export function deckEnds(data) {
  const r = (data.roads || []).find((q) => q[1] && (q[0] | 0) <= 1 && phuXuanRoad(data, q));
  if (!r) return [];
  const pts = unflat(r[2]), A = pts[0], E = pts[pts.length - 1], RL = Math.hypot(E[0] - A[0], E[1] - A[1]);
  const d = [(E[0] - A[0]) / RL, (E[1] - A[1]) / RL];
  return [{ p: A, u: [-d[0], -d[1]], hw: W / 2, reach: 4 }, { p: E, u: d, hw: W / 2, reach: 4 }];
}
function phuXuanRoad(data, r) {
  const br = (data.bridges || []).find((q) => q.n === 'Cầu Phú Xuân');
  if (!br) return false;
  const ring = unflat(br.ring), pts = unflat(r[2]), a = pts[0], e = pts[pts.length - 1];
  return inRing((a[0] + e[0]) / 2, (a[1] + e[1]) / 2, ring) && !!bridgeProfiles(data).get(r[2]);
}

export function build({ data, S }) {
  const br = (data.bridges || []).find((q) => q.n === 'Cầu Phú Xuân');
  if (!br) throw new Error('no Cầu Phú Xuân outline in data.bridges');
  const ring = unflat(br.ring);
  const profiles = bridgeProfiles(data);
  // the carriageway: the class 0–1 bridge road whose middle falls in the outline (what bridges.js names)
  let road = null;
  for (const r of data.roads || []) {
    if (!r[1] || (r[0] | 0) > 1) continue;
    const pts = unflat(r[2]);
    const a = pts[0], e = pts[pts.length - 1];
    if (inRing((a[0] + e[0]) / 2, (a[1] + e[1]) / 2, ring) && profiles.get(r[2])) { road = { pts, P: profiles.get(r[2]) }; break; }
  }
  if (!road) throw new Error('Cầu Phú Xuân carriageway not found');
  const { pts, P } = road;
  const A = pts[0], E = pts[pts.length - 1];
  const RL = Math.hypot(E[0] - A[0], E[1] - A[1]);
  const d = [(E[0] - A[0]) / RL, (E[1] - A[1]) / RL], n = [-d[1], d[0]];
  const ang = Math.atan2(d[1], d[0]);
  // along-axis extent of the outline: the 374.65 m bridge is centred in it
  let lo = Infinity, hi = -Infinity;
  for (const p of ring) { const s = (p[0] - A[0]) * d[0] + (p[1] - A[1]) * d[1]; lo = Math.min(lo, s); hi = Math.max(hi, s); }
  const sc = (lo + hi) / 2, s0 = sc - LEN / 2, s1 = sc + LEN / 2;
  // supports along the road, south end first wherever the way starts: the two short spans, then SPANS equal ones
  const southFirst = A[1] > E[1], sgn = southFirst ? 1 : -1, sS = southFirst ? s0 : s1, sN = southFirst ? s1 : s0;
  const sup = [sS, ...SHORT.map((o) => sS + sgn * o)];
  for (let k = 1; k <= SPANS; k++) sup.push(sup[2] + ((sN - sup[2]) * k) / SPANS);
  if (!southFirst) sup.reverse();
  const spans = sup.slice(1).map((b, i) => { const a = sup[i]; const sh = southFirst ? i < 2 : i >= sup.length - 3; return { a, b, depth: sh ? SHALLOW : GIRDER }; });

  const top = (s) => Math.max(BRIDGE_TOP, P.base(s)) + P.bump(s); // carriageway surface, as the traffic rides it
  const xz = (s, v) => [A[0] + d[0] * s + n[0] * v, A[1] + d[1] * s + n[1] * v];
  const at = (s, v, y) => { const p = xz(s, v); return [p[0], y, p[1]]; };
  const lands = (data.land || []).map((r) => (Array.isArray(r[0]) ? r.map(unflat) : [unflat(r)]));
  const onLand = (p) => lands.some(([o, ...h]) => inRing(p[0], p[1], o) && !h.some((q) => inRing(p[0], p[1], q)));
  const ground = (s, v) => { const p = xz(s, v); return LAND_Y + rise(p[0], p[1]); };

  const asphalt = hex('#7c7a74'), walkCol = hex('#b9b7b0'), kerbCol = hex('#9d9f9b'); // grey concrete kerb face
  const fascia = hex('#c3beb3'), girderCol = hex('#aaa59b'), under = hex('#9c978e');
  const pierCol = hex('#aea89c'), pierWet = hex('#7d7a72'), capCol = hex('#b8b3a8');
  const postCol = hex('#a3a8a6'), railCol = hex('#b7bcb9'), panelCol = hex('#a9aeac'), plinth = hex('#bdbdb8');
  const lampCol = hex('#c5c9c7'), lanternCol = hex('#8f9593');
  const lineCol = hex('#ecebe4'), yellow = hex('#d9b544'), joint = hex('#4d4b48');
  S.kind = KIND.PLAIN;

  // ---- deck: carriageway, raised walkways, kerbs, fascia, slab underside (from the road's start to its end, the
  // parts beyond the abutments being the filled approach ramps)
  const sA = 0, sB = RL;
  const ss = [];
  for (let s = sA; s < sB; s += STEP) ss.push(s);
  ss.push(sB);
  for (const s of [s0, s1]) if (!ss.includes(s)) ss.push(s);
  ss.sort((a, b) => a - b);
  const hc = CARR / 2, hw = W / 2;
  for (let i = 0; i + 1 < ss.length; i++) {
    const a = ss[i], b = ss[i + 1], ya = top(a), yb = top(b);
    const onSpan = a >= s0 - 1e-6 && b <= s1 + 1e-6;
    S.quad(at(a, -hc, ya), at(a, hc, ya), at(b, hc, yb), at(b, -hc, yb), asphalt, [0, 1, 0]);
    for (const side of [-1, 1]) {
      const vi = side * hc, vo = side * hw;
      const wa = ya + KERB, wb = yb + KERB;
      S.quad(at(a, vi, wa), at(a, vo, wa), at(b, vo, wb), at(b, vi, wb), walkCol, [0, 1, 0]);
      S.quad(at(a, vi, ya), at(b, vi, yb), at(b, vi, wb), at(a, vi, wa), kerbCol, [-side * n[0], 0, -side * n[1]]);
      // outer face: the edge girder on the spans; on the approaches a retaining wall down to the ground
      const ba = onSpan ? ya - SLAB - 0.55 : Math.min(ya - SLAB, ground(a, vo) - 0.3);
      const bb = onSpan ? yb - SLAB - 0.55 : Math.min(yb - SLAB, ground(b, vo) - 0.3);
      S.quad(at(a, vo, ba), at(b, vo, bb), at(b, vo, wb), at(a, vo, wa), onSpan ? fascia : pierCol, [side * n[0], 0, side * n[1]]);
      // a drip groove under the cantilever: a slightly darker band reads as the shadow line of the real deck edge
      if (onSpan) S.quad(at(a, vo - side * 0.6, ba), at(b, vo - side * 0.6, bb), at(b, vo, bb), at(a, vo, ba), under, [0, -1, 0]);
    }
    if (onSpan) S.quad(at(a, -hw + 0.6, ya - SLAB), at(b, -hw + 0.6, yb - SLAB), at(b, hw - 0.6, yb - SLAB), at(a, hw - 0.6, ya - SLAB), under, [0, -1, 0]);
  }
  // markings (Street View): a double solid yellow centre line, dashed white lines between the two lanes each way;
  // expansion joints across the deck over each support
  for (let i = 0; i + 1 < ss.length; i++) {
    const a = ss[i], b = ss[i + 1], ya = top(a) + 0.015, yb = top(b) + 0.015;
    for (const v of [-0.2, 0.2]) S.quad(at(a, v - 0.075, ya), at(a, v + 0.075, ya), at(b, v + 0.075, yb), at(b, v - 0.075, yb), yellow, [0, 1, 0]);
  }
  for (let s = s0 + 2; s < s1 - 4; s += 9) {
    for (const v of [-CARR / 4, CARR / 4]) {
      const y0 = top(s) + 0.015, y1 = top(s + 3) + 0.015;
      S.quad(at(s, v - 0.07, y0), at(s, v + 0.07, y0), at(s + 3, v + 0.07, y1), at(s + 3, v - 0.07, y1), lineCol, [0, 1, 0]);
    }
  }
  for (const s of sup) {
    const y = top(s) + 0.012;
    S.quad(at(s - 0.08, -hc, y), at(s - 0.08, hc, y), at(s + 0.08, hc, y), at(s + 0.08, -hc, y), joint, [0, 1, 0]);
  }

  // ---- girders: 5 precast beams per span, following the deck between supports. Where an end span reaches over the
  // bank the beams rest on the abutment's seat in the fill: each one stops where its soffit would go into the ground
  const gv = [-8, -4.8, -1.6, 1.6, 4.8, 8];
  for (const sp of spans) {
    const a = sp.a + 0.4, b = sp.b - 0.4, GD = sp.depth;
    const sunk = (u, v) => onLand(xz(u, v)) && top(u) - SLAB - GD < ground(u, v) - 0.5;
    const nseg = 4;
    for (let j = 0; j < nseg; j++) {
      const u0 = a + ((b - a) * j) / nseg, u1 = a + ((b - a) * (j + 1)) / nseg;
      for (const v of gv) {
        let g0 = u0, g1 = u1;
        while (g0 < g1 && sunk(g0, v)) g0 += 0.25;
        while (g1 > g0 && sunk(g1, v)) g1 -= 0.25;
        if (g1 - g0 > 0.3) S.beam(at(g0, v, top(g0) - SLAB - GD / 2), at(g1, v, top(g1) - SLAB - GD / 2), 0.45, GD, girderCol);
      }
    }
  }

  // ---- piers: round-nosed walls standing in the river (or the north bank), a crosshead under the girders
  const nose = 8, PW = 1.5, PL = 12;
  const pierRing = (s, hl, hwid) => {
    const out = [];
    for (const end of [1, -1]) for (let i = 0; i <= nose; i++) {
      const t = -Math.PI / 2 + (Math.PI * i) / nose;
      const v = end * (hl - hwid + Math.cos(t) * hwid), u = end * Math.sin(t) * hwid;
      out.push(xz(s + u, v));
    }
    return out;
  };
  for (let k = 1; k + 1 < sup.length; k++) {
    // the crosshead's top under the shallower of the two spans it carries (a deep girder ends against its face)
    const s = sup[k], dep = Math.min(spans[k - 1].depth, spans[k].depth);
    const yCapTop = top(s) - SLAB - dep, yCap = top(s) - SLAB - GIRDER - 1.3 + (dep < GIRDER ? 0.6 : 0);
    const wet = onLand(xz(s, 0)) ? null : 0.9; // river piers: a darker band below the flood line
    const foot = -3;
    if (wet === null) { // a pier on the bank: what stands above the ground (the low deck buries its seat and wall)
      const g = ground(s, 0);
      if (yCapTop > g + 0.2) S.box(...xz(s, 0), Math.max(yCap + 0.45, g - 0.3), yCapTop, 1.8, W - 2.2, ang, capCol, { bottom: true });
      if (yCap + 0.45 > g) { S.prism(pierRing(s, PL / 2, PW / 2), foot, yCap, pierCol, pierCol, { top: false }); S.box(...xz(s, 0), yCap, yCap + 0.45, 1.8, PL - 0.8, ang, capCol); }
      continue;
    }
    if (wet !== null && yCap > wet) {
      S.prism(pierRing(s, PL / 2, PW / 2), foot, wet, pierWet, pierWet, { top: false });
      S.prism(pierRing(s, PL / 2, PW / 2), wet, yCap, pierCol, pierCol, { top: false, scaleTop: 0.97 });
    } else S.prism(pierRing(s, PL / 2, PW / 2), foot, yCap, pierCol, pierCol, { top: false });
    // crosshead: the full width of the girders, on a narrower seat
    S.box(...xz(s, 0), yCap + 0.45, yCapTop, 1.8, W - 2.2, ang, capCol, { bottom: true });
    S.box(...xz(s, 0), yCap, yCap + 0.45, 1.8, PL - 0.8, ang, capCol);
  }

  // ---- abutments: a wall under each deck end, down into the bank, with short wing walls
  for (const [s, dir] of [[s0, -1], [s1, 1]]) {
    const c = xz(s + dir * 1.2, 0), yT = top(s) - SLAB;
    S.box(c[0], c[1], LAND_Y - 3, yT, 2.4, W + 0.6, ang, pierCol);
  }

  // ---- railings (Street View): on a low concrete kerb at the deck edge, grey steel posts every 2.5 m, a top and a
  // bottom rail, and in each bay a pale framed panel with a square medallion between groups of vertical bars
  const rv = hw - 0.2, PLINTH = 0.22, RH = 1.0, BAY = 2.5;
  for (const side of [-1, 1]) {
    const v = side * rv;
    for (let i = 0; i + 1 < ss.length; i++) {
      const a = ss[i], b = ss[i + 1];
      if (a < s0 - 1e-6 || b > s1 + 1e-6) continue;
      const ya = top(a) + KERB, yb = top(b) + KERB;
      for (const f of [-1, 1]) S.quad(at(a, v + f * 0.17, ya), at(b, v + f * 0.17, yb), at(b, v + f * 0.17, yb + PLINTH), at(a, v + f * 0.17, ya + PLINTH), plinth, [f * side * n[0], 0, f * side * n[1]]);
      S.quad(at(a, v - 0.17, ya + PLINTH), at(a, v + 0.17, ya + PLINTH), at(b, v + 0.17, yb + PLINTH), at(b, v - 0.17, yb + PLINTH), plinth, [0, 1, 0]);
    }
    const nb = Math.round(LEN / BAY), bay = LEN / nb;
    for (let k = 0; k <= nb; k++) {
      const s = s0 + k * bay, p = xz(s, v), y = top(s) + KERB + PLINTH;
      S.box(p[0], p[1], y, y + RH + 0.05, 0.09, 0.09, ang, postCol);
      // ball finial (two cones)
      S.cyl(p[0], p[1], y + RH + 0.05, y + RH + 0.11, 0.03, 0.065, 6, postCol, { cap: false });
      S.cyl(p[0], p[1], y + RH + 0.11, y + RH + 0.18, 0.065, 0.008, 6, postCol, { cap: false });
      if (k === nb) break;
      const e = s + bay, yb = top(e) + KERB + PLINTH, yy = (u) => y + ((yb - y) * (u - s)) / bay;
      S.beam(at(s, v, y + RH), at(e, v, yb + RH), 0.07, 0.06, railCol);
      S.beam(at(s, v, y + 0.1), at(e, v, yb + 0.1), 0.05, 0.05, railCol);
      // the panel: a thin frame 1.1 m long in the middle of the bay holding a fine diagonal lattice, a small
      // medallion at its centre, bars either side
      const m = s + bay / 2, f0 = m - 0.55, f1 = m + 0.55, h0 = 0.22, h1 = 0.88;
      for (const h of [h0, h1]) S.beam(at(f0, v, yy(f0) + h), at(f1, v, yy(f1) + h), 0.018, 0.025, panelCol);
      for (const u of [f0, f1]) S.beam(at(u, v, yy(u) + h0), at(u, v, yy(u) + h1), 0.018, 0.025, panelCol);
      for (const [u0, u1] of [[f0, m - 0.13], [m + 0.13, f1]]) {
        S.beam(at(u0, v, yy(u0) + h0), at(u1, v, yy(u1) + h1), 0.012, 0.015, panelCol);
        S.beam(at(u0, v, yy(u0) + h1), at(u1, v, yy(u1) + h0), 0.012, 0.015, panelCol);
      }
      const c = xz(m, v), ym = yy(m) + (h0 + h1) / 2;
      S.box(c[0], c[1], ym - 0.1, ym + 0.1, 0.2, 0.025, ang, panelCol);
      for (const h of [h0, h1]) S.beam(at(m, v, yy(m) + h), at(m, v, ym + (h > 0.5 ? 0.1 : -0.1)), 0.012, 0.015, panelCol);
      for (let u = s + 0.2; u < e - 0.1; u += 0.15) {
        if (u > f0 - 0.05 && u < f1 + 0.05) continue;
        S.beam(at(u, v, yy(u) + 0.1), at(u, v, yy(u) + RH), 0.018, 0.018, railCol);
      }
    }
  }

  // ---- lamp posts (Street View): pale grey, on the railing line, in pairs every 30 m; a tapered pole on a plinth, a
  // curved arm with a brace carrying a flat lantern over the carriageway. Positions from geo/bridges.js bridgeLamps,
  // which also places the night glow at the lantern (geo/city.js)
  const L = P.lamps;
  for (const { y, sides } of bridgeLamps(P, pts)) for (const { n: o, foot, head } of sides) {
    const y0 = y + KERB, yA = y + L.h + 0.12, oang = Math.atan2(o[1], o[0]);
    S.box(foot[0], foot[1], y0, y0 + 0.5, 0.34, 0.34, oang, lampCol);
    S.cyl(foot[0], foot[1], y0 + 0.5, y + L.h + 0.45, 0.1, 0.06, 6, lampCol, { cap: true });
    // arm: a quadratic curve from the pole up and over to the lantern; a brace below it
    const reach = L.at - L.head, pt = (t, y1, yc) => {
      const v = reach * t * t, yy = (1 - t) * (1 - t) * y1 + 2 * t * (1 - t) * yc + t * t * yA;
      return [foot[0] - o[0] * v, yy, foot[1] - o[1] * v];
    };
    const curve = (y1, yc, t1) => { let q = pt(0, y1, yc); for (let i = 1; i <= 5; i++) { const r = pt((t1 * i) / 5, y1, yc); S.beam(q, r, 0.06, 0.06, lampCol); q = r; } };
    curve(y + L.h - 0.6, y + L.h + 0.35, 1);
    curve(y + L.h - 1.3, y + L.h - 0.3, 0.55);
    S.box(head[0], head[1], yA - 0.1, yA + 0.02, 0.75, 0.3, oang, lanternCol, { bottom: true });
  }
  S.kind = KIND.PLAIN;
}
