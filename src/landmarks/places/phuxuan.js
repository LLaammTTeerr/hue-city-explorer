import { KIND, hex, shade, unflat, inRing } from '../../geo/buf.js';
import { bridgeProfiles } from '../../geo/bridges.js';
import { rise } from '../../geo/terrain.js';
import { LAND_Y, ROAD_W } from '../../config.js';

// Cầu Phú Xuân ("cầu Mới"; built 1970–71 as cầu Sông Hương, renamed after 1975), the reinforced-concrete girder
// bridge just upstream of Trường Tiền on the old Quốc lộ 1 (Lê Lợi ↔ Trần Hưng Đạo).
//
// Confirmed (docs/places/phuxuan.md has the URLs):
//  - length 374.65 m, width 17 m, carriageway 12 m, walkways with railings on both sides, 18 t rating
//    (vi.wikipedia Cầu Phú Xuân; khamphahue.com.vn; tuoitre.vn 2024).
//  - position and axis: the OSM carriageway (class 0 road in hue.json) and the OSM bridge outline.
// Estimated (no published drawing found):
//  - 11 equal spans of ~34 m on 10 round-nosed wall piers with a crosshead, 5 precast girders 1.6 m deep under a
//    0.25 m slab; abutments at both ends.
//  - the long section: level at both streets, up ~2.3 m within the first ~25 m off each end (headroom for the lim
//    boardwalk under the south end), a low crown ~7.2 m above the river (geo/bridges.js NAMED, shared with traffic
//    and the lamp posts in landmarks/life.js).
//  - railing: concrete posts every 2 m with two steel rails; lamp posts (drawn by life.js) stand on small corbels
//    outside the railing.
export const id = 'phuxuan';

const LEN = 374.65, W = 17, CARR = 12, WALK = (W - CARR) / 2;
const SPANS = 11;
const SLAB = 0.25, GIRDER = 1.6, KERB = 0.2;
const BRIDGE_TOP = LAND_Y + 0.42; // as landmarks/life.js rides it
const STEP = 2; // deck sampling (m)

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

  const asphalt = hex('#7c7a74'), walkCol = hex('#bdb3a2'), kerbCol = hex('#cfc9bd');
  const fascia = hex('#c3beb3'), girderCol = hex('#aaa59b'), under = hex('#9c978e');
  const pierCol = hex('#aea89c'), pierWet = hex('#7d7a72'), capCol = hex('#b8b3a8');
  const postCol = hex('#dcd8cf'), railCol = hex('#8e979b'), lineCol = hex('#ecebe4'), joint = hex('#4d4b48');
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
  // centre line: white dashes; expansion joints across the deck over each support
  for (let s = s0 + 4; s < s1 - 4; s += 9) {
    const y = top(s + 1.5) + 0.015;
    S.quad(at(s, -0.08, y), at(s, 0.08, y), at(s + 3, 0.08, y), at(s + 3, -0.08, y), lineCol, [0, 1, 0]);
  }
  for (let k = 0; k <= SPANS; k++) {
    const s = s0 + k * span, y = top(s) + 0.012;
    S.quad(at(s - 0.08, -hc, y), at(s - 0.08, hc, y), at(s + 0.08, hc, y), at(s + 0.08, -hc, y), joint, [0, 1, 0]);
  }

  // ---- girders: 5 precast beams per span, following the deck between supports
  const gv = [-6.4, -3.2, 0, 3.2, 6.4];
  for (let k = 0; k < SPANS; k++) {
    const a = s0 + k * span + 0.4, b = s0 + (k + 1) * span - 0.4;
    const nseg = 4;
    for (let j = 0; j < nseg; j++) {
      const u0 = a + ((b - a) * j) / nseg, u1 = a + ((b - a) * (j + 1)) / nseg;
      for (const v of gv) S.beam(at(u0, v, top(u0) - SLAB - GIRDER / 2), at(u1, v, top(u1) - SLAB - GIRDER / 2), 0.45, GIRDER, girderCol);
    }
  }

  // ---- piers: round-nosed walls standing in the river (or the north bank), a crosshead under the girders
  const nose = 8, PW = 1.5, PL = 9.5;
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

  // ---- railings: concrete posts every 2 m, a steel top rail and a mid rail, along both walkways
  const rv = hw - 0.12;
  for (const side of [-1, 1]) {
    const v = side * rv;
    for (let s = s0; s <= s1 + 0.01; s += 2) {
      const p = xz(s, v), y = top(s) + KERB;
      S.box(p[0], p[1], y, y + 1.0, 0.16, 0.16, ang, postCol);
    }
    for (let s = sA; s < sB - 0.01; s += 4) {
      const e = Math.min(sB, s + 4);
      if (e <= s0 - 2 || s >= s1 + 2) continue;
      S.beam(at(s, v, top(s) + KERB + 1.02), at(e, v, top(e) + KERB + 1.02), 0.1, 0.08, railCol);
      S.beam(at(s, v, top(s) + KERB + 0.55), at(e, v, top(e) + KERB + 0.55), 0.06, 0.06, railCol);
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
