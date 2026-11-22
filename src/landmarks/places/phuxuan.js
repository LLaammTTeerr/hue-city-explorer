import { KIND, hex, shade, unflat, inRing } from '../../geo/buf.js';
import { bridgeProfiles } from '../../geo/bridges.js';
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
//  - railing: grey steel posts and rails with pale ornamental panels between them on a low concrete kerb; lamp posts
//    on the railing line (Street View).
// Estimated (no published drawing found):
//  - 11 equal spans of ~34 m on 10 round-nosed wall piers with a crosshead, 5 precast girders 1.6 m deep under a
//    0.25 m slab; abutments at both ends.
//  - the long section: level at both streets, up ~2.3 m within the first ~25 m off each end (headroom for the lim
//    boardwalk under the south end), a low crown ~7.2 m above the river (geo/bridges.js NAMED, shared with traffic
//    and the lamp posts in landmarks/life.js).
//  - railing: post spacing 2.5 m and panel pattern simplified (a framed medallion panel and bars per bay); lamp
//    posts are life.js's generic ones and stand on the walkway, ~1.6 m inside the railing (the real ones, double-arm
//    and ~10 m tall, stand on the railing line).
export const id = 'phuxuan';

const LEN = 374.65, CARR = ROAD_W[0], WALK = 2.6, W = CARR + 2 * WALK;
const SPANS = 11;
const SLAB = 0.25, GIRDER = 1.6, KERB = 0.2;
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
  const span = LEN / SPANS;

  const top = (s) => Math.max(BRIDGE_TOP, P.base(s)) + P.bump(s); // carriageway surface, as the traffic rides it
  const xz = (s, v) => [A[0] + d[0] * s + n[0] * v, A[1] + d[1] * s + n[1] * v];
  const at = (s, v, y) => { const p = xz(s, v); return [p[0], y, p[1]]; };
  const lands = (data.land || []).map((r) => (Array.isArray(r[0]) ? r.map(unflat) : [unflat(r)]));
  const onLand = (p) => lands.some(([o, ...h]) => inRing(p[0], p[1], o) && !h.some((q) => inRing(p[0], p[1], q)));
  const ground = (s, v) => { const p = xz(s, v); return LAND_Y + rise(p[0], p[1]); };

  const asphalt = hex('#7c7a74'), walkCol = hex('#b9b7b0'), kerbCol = hex('#cfccc4');
  const fascia = hex('#c3beb3'), girderCol = hex('#aaa59b'), under = hex('#9c978e');
  const pierCol = hex('#aea89c'), pierWet = hex('#7d7a72'), capCol = hex('#b8b3a8');
  const postCol = hex('#a3a8a6'), railCol = hex('#b7bcb9'), panelCol = hex('#d3d6d1'), plinth = hex('#c6c2b8');
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
  for (let k = 0; k <= SPANS; k++) {
    const s = s0 + k * span, y = top(s) + 0.012;
    S.quad(at(s - 0.08, -hc, y), at(s - 0.08, hc, y), at(s + 0.08, hc, y), at(s + 0.08, -hc, y), joint, [0, 1, 0]);
  }

  // ---- girders: 5 precast beams per span, following the deck between supports. Where an end span reaches over the
  // bank the beams rest on the abutment's seat in the fill: each one stops where its soffit would go into the ground
  const gv = [-8, -4.8, -1.6, 1.6, 4.8, 8];
  const sunk = (u, v) => onLand(xz(u, v)) && top(u) - SLAB - GIRDER < ground(u, v) - 0.5;
  for (let k = 0; k < SPANS; k++) {
    const a = s0 + k * span + 0.4, b = s0 + (k + 1) * span - 0.4;
    const nseg = 4;
    for (let j = 0; j < nseg; j++) {
      const u0 = a + ((b - a) * j) / nseg, u1 = a + ((b - a) * (j + 1)) / nseg;
      for (const v of gv) {
        let g0 = u0, g1 = u1;
        while (g0 < g1 && sunk(g0, v)) g0 += 0.25;
        while (g1 > g0 && sunk(g1, v)) g1 -= 0.25;
        if (g1 - g0 > 0.3) S.beam(at(g0, v, top(g0) - SLAB - GIRDER / 2), at(g1, v, top(g1) - SLAB - GIRDER / 2), 0.45, GIRDER, girderCol);
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
  for (let k = 1; k < SPANS; k++) {
    const s = s0 + k * span;
    const yCapTop = top(s) - SLAB - GIRDER, yCap = yCapTop - 1.3;
    const wet = onLand(xz(s, 0)) ? null : 0.9; // river piers: a darker band below the flood line
    const foot = -3;
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
      if (k === nb) break;
      const e = s + bay, yb = top(e) + KERB + PLINTH, yy = (u) => y + ((yb - y) * (u - s)) / bay;
      S.beam(at(s, v, y + RH), at(e, v, yb + RH), 0.07, 0.06, railCol);
      S.beam(at(s, v, y + 0.1), at(e, v, yb + 0.1), 0.05, 0.05, railCol);
      // the panel: a frame 1.1 m long in the middle of the bay, a medallion in it, bars either side
      const m = s + bay / 2, f0 = m - 0.55, f1 = m + 0.55;
      for (const h of [0.22, 0.88]) S.beam(at(f0, v, yy(f0) + h), at(f1, v, yy(f1) + h), 0.03, 0.04, panelCol);
      for (const u of [f0, f1]) S.beam(at(u, v, yy(u) + 0.22), at(u, v, yy(u) + 0.88), 0.03, 0.04, panelCol);
      const c = xz(m, v);
      S.box(c[0], c[1], yy(m) + 0.38, yy(m) + 0.72, 0.5, 0.03, ang, panelCol);
      for (const u of [s + 0.25, s + 0.5, e - 0.5, e - 0.25]) S.beam(at(u, v, yy(u) + 0.1), at(u, v, yy(u) + RH), 0.025, 0.025, railCol);
    }
  }

  // ---- corbels for the lamp posts landmarks/life.js stands on this deck (every 30 m, alternating sides, the pole
  // ARM = 0.9 m behind a lantern ROAD_W[0] / 2 + 0.5 off the road's axis: just outside the railing)
  const off = ROAD_W[0] / 2 + 0.5 + 0.9;
  for (let s = 15, k = 0; s < RL; s += 30, k++) {
    if (s < s0 + 1 || s > s1 - 1) continue;
    const side = k % 2 ? 1 : -1, v = side * off;
    if (Math.abs(v) <= hw) continue;
    const p = xz(s, side * (hw + 0.6)), y = top(s) + KERB;
    S.box(p[0], p[1], y - 0.7, y, 1.1, 1.2, ang, fascia, { bottom: true });
  }
  S.kind = KIND.PLAIN;
}
