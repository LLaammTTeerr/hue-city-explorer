import * as THREE from 'three';
import { KIND, hex, shade, mix, Buf } from '../../geo/buf.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { rise } from '../../geo/terrain.js';
import { LAND_Y, PAL, roadWidth } from '../../config.js';

// Cầu Nguyễn Hoàng (cầu vượt sông Hương), opened to traffic 26 March 2025, named 8 September 2025: Kim Long
// (Nguyễn Hoàng street, north) to Phường Đúc (Bùi Thị Xuân, south), between cồn Dã Viên and chùa Thiên Mụ.
// Design I156 (WSP Finland + E&R), the "hạc chầu Thiên Mụ" idea: two yellow arches like a crane's spread wings.
//
// Confirmed (docs/places/nguyenhoang.md has the URLs):
//  - main bridge 350 m (the OSM outline is 347 m) in 5 spans; the steel arch span 180 m; deck 43 m wide: 6 car
//    lanes, 2 motorbike lanes of 3.5 m and walkways of 3.5 m with red granite paving; navigation clearance 30 × 6 m.
//  - two separate arches along the bridge, standing between the car lanes and the motorbike lanes / walkways;
//    crown "over 20 m" (above the deck, VnExpress) and "over 30 m" (vietnamfinance; above the river): both fit a
//    crown ~22 m over a deck ~8.5 m above the water.
//  - V-shaped piers (khamphahue), steel longitudinal and cantilevered transverse girders (128 cantilevers).
//  - steel railings with a lotus pattern; 60 parasol ("lọng") lamp posts, 4.6 m to over 14 m, golden, in parabolic
//    rows at both ends; royal yellow throughout; multicolour LED lighting at night.
// Read from a photograph (Wikimedia Commons, Cầu Nguyễn Hoàng 2025-04-27): the arch ribs carry on below the deck to
// the pier in the river, where a second yellow leg rises outward to the deck (the V); grey concrete side piers;
// light grey deck fascia; white railings. (The photo seemed to show the ribs leaning slightly toward each other; the satellite shows them upright.)
// Read from the satellite (docs/places/nguyenhoang.md, 2026 rebuild): the deck 43.5 m wide on the OSM axis; the two
// ribs stand 26 m apart from end to crown (upright, not leaning in) and come up through the deck ~159 m apart; at each
// end two slender walkway ramps ("wings") leave the deck's outer edges, splay out ~20° and come down to round paved
// terraces on the river banks.
// Estimated: span lengths 30 + 30 + 228 (174 between the V footings) + 30 + 30, the cross-section split, the deck
// rise (6.6 m at the ends, 8.4 m at mid-span), rib section, hanger spacing, lamps on the rib strip, the wings' levels.
export const id = 'nguyenhoang';

const L = 350, HW = 21.5; // length, half width
const V_MED = 1.0, V_CAR = 11.5, V_RIB = 13, V_STRIP = 14.5, V_MOTO = 18, V_RAIL = 21.35;
const Y_END = 6.6, Y_MID = 8.4; // deck surface at the abutments and at mid-span (river at y = 0)
const FOOT = 87, Y_SPRING = 1.2, Y_CROWN = 30.6; // arch: springing at the V footing (ribs clear the deck at ±80), crown
// the wings (north end, south end): where each leaves the deck (|s|), its length along the bridge, the gap in the deck's
// railing where it leaves, its width, the terrace's radius
const WING_S = [118, 128], WING_L = [42, 44], WING_OPEN = 8, WING_W = 3.6, PLAZA_RN = 9, PLAZA_RSW = 7.5;
const V_TOP = 114, PIER = 144, RAMP = 46, TRANS = 24; // TRANS: the last stretch, where the bands meet the street's

// The deck's frame (s along the bridge, t across it) and where it comes down to the street: the first mapped
// carriageway beyond each end of the outline, on the deck's axis (the OSM bridge ways under the outline are not laid;
// the slip roads and avenues carry on from where they stop). The ramp is at grade there, so it never stands over the
// junction or the islands between its slips. approach[e]: the carriageways that start at that end, [t, half width].
function frame(data) {
  const nh = data.nguyenhoang;
  if (!nh) throw new Error('no nguyenhoang outline in hue.json');
  const ang = nh.a / 1000;
  const u = [Math.cos(ang), Math.sin(ang)], v = [-u[1], u[0]];
  // The OSM outline's axis is right (the satellite's deck edges run parallel to it). It sits ~1.5 m west-south-west of
  // the deck the satellite shows, but so do the OSM streets it joins, so the frame stays on the outline: moving the
  // bridge alone opens a 1.5 m seam at both street joints (check:joints).
  const c = [nh.c[0] / 10, nh.c[1] / 10];
  const half = L / 2;
  const heads = [];
  for (const r of data.roads || []) {
    const [cls, br, f] = r;
    if (br || cls > 3) continue;
    for (const k of [0, f.length - 2]) {
      const dx = f[k] / 10 - c[0], dz = f[k + 1] / 10 - c[1];
      heads.push({ s: dx * u[0] + dz * u[1], t: dx * v[0] + dz * v[1], hw: roadWidth(r) / 2 });
    }
  }
  const ends = [-1, 1].map((e) => {
    let best = half + RAMP;
    for (const h of heads) if (Math.abs(h.t) < HW && h.s * e > half && h.s * e < best) best = h.s * e;
    return best;
  });
  const approach = [-1, 1].map((e, i) => heads.filter((h) => Math.abs(h.t) < HW && h.s * e >= ends[i] - 0.05 && h.s * e < ends[i] + JOIN_REACH).map((h) => [h.t, h.hw]));
  return { c, ang, u, v, half, ends, approach };
}
const JOIN_REACH = 6; // m: a carriageway starting this far past the deck's end is one of its approaches

// The streets' side of the joint (geo/city.js): each approach carriageway is cut on the deck's end line, square to
// the deck, and starts on it, so the deck and the street meet along one straight edge.
export function deckEnds(data) {
  const { c, u, ends } = frame(data);
  return [-1, 1].map((e, i) => ({ p: [c[0] + u[0] * e * ends[i], c[1] + u[1] * e * ends[i]], u: [u[0] * e, u[1] * e], hw: HW, reach: JOIN_REACH }));
}

export function build({ data, S, group }) {
  const { c, ang, u, v, half, ends, approach } = frame(data);
  const xz = (s, t) => [c[0] + u[0] * s + v[0] * t, c[1] + u[1] * s + v[1] * t];
  const at = (s, t, y) => { const p = xz(s, t); return [p[0], y, p[1]]; };
  // the street's surface at (s, t): carriageways lie 0.06 m over the ground, 0.12 m more on raised ground (geo/city.js)
  const ground = (s, t = 0) => { const p = xz(s, t), r = rise(p[0], p[1]); return LAND_Y + r + 0.07 + (r > 0 ? 0.12 : 0); };
  const endOf = (s) => (s < 0 ? ends[0] : ends[1]);
  const curve = (s) => { const a = Math.min(Math.abs(s), half); return Y_END + (Y_MID - Y_END) * (1 - (a / half) ** 2); };
  // deck surface along the axis: a gentle vertical curve over the river, then the approach ramp over the last RAMP m
  // before the street, down to the ground where the carriageways begin
  const top = (s) => {
    const E = endOf(s), a0 = E - RAMP, a = Math.abs(s);
    if (a <= a0) return curve(s);
    const y0 = curve(Math.sign(s) * a0), t = Math.min(1, (a - a0) / RAMP), g = ground(Math.sign(s) * E);
    return y0 + (g - y0) * (1 - Math.cos(Math.PI * t)) / 2;
  };
  // the girders and cantilevers run while there is room under the deck; nearer the street the ramp is a filled
  // embankment between retaining walls
  const open = (s) => top(s) - 2.6 > ground(s);
  const abut = [-1, 1].map((e) => { let a = 0; while (a < half && open(e * (a + 0.5))) a += 0.5; return e * a; }); // where the embankment starts
  const asphalt = hex('#6f6c69'), moto = hex('#7b706a'), granite = hex('#a8746a'), strip = hex('#cfcbc2');
  const fascia = hex('#dcd9d2'), under = hex('#9d9a94'), steel = hex('#b9b6ae'), concrete = hex('#bdb7ab');
  const wet = hex('#77756f'), gold = hex('#f2c21b'), goldD = hex('#d29f12'), rail = hex('#f1efe9'), line = hex('#ecebe4');
  const lampGold = hex('#e0b23a');

  // ---- deck: from the end of one ramp to the other
  const n0 = S.n;
  const ss = [];
  for (let s = -ends[0]; s < ends[1]; s += 5) ss.push(s);
  for (const e of [-1, 1]) for (let a = endOf(e) - TRANS; a < endOf(e); a += 1) ss.push(Math.round(e * a * 100) / 100);
  ss.push(ends[1]);
  for (const s of [-half, half, ...abut]) if (!ss.includes(s)) ss.push(s);
  ss.sort((a, b) => a - b);
  // The cross-section at the ends. Over the last TRANS m the deck's bands move to where the street's own
  // carriageways start: the car lanes onto the main carriageways, the motorbike lanes onto the slip roads, the
  // walkway out to the street's pavement. The raised strips come down flush and the paving takes the street's
  // colours, so at the end line the deck is the street: lanes, median and pavements run straight on.
  const street = approach.map((list) => [-1, 1].map((side) => {
    const own = list.filter(([t]) => t * side > 0).map(([t, hw]) => [Math.abs(t) - hw, Math.abs(t) + hw]).sort((p, q) => p[0] - q[0]);
    if (!own.length) return null;
    const [main, slip] = own, med = Math.max(0.3, main[0]), car = Math.max(med + 2, main[1]);
    const st = slip ? Math.max(car, slip[0]) : Math.min(car + 3, HW - 3), mo = slip ? Math.max(st + 2, Math.min(HW - 0.5, slip[1])) : HW - 1.5;
    return [med, car, st, mo];
  }));
  const DECK = [V_MED, V_CAR, V_STRIP, V_MOTO];
  const near = (s) => { const E = endOf(s), x = (Math.abs(s) - (E - TRANS)) / TRANS; return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); };
  // band edges [median, car, strip, moto] at s on one side (+1 / -1)
  const edges = (s, side) => {
    const T = street[s < 0 ? 0 : 1][(side + 1) / 2], k = T ? near(s) : 0;
    return DECK.map((d, j) => d + ((T ? T[j] : d) - d) * k);
  };
  const toStreet = (col, to, s) => mix(col, to, near(s));
  // the ground falls across the deck's end (0.6 m over its width at the north end): over the same stretch the deck
  // takes the street's cross-fall, so it meets every carriageway at its own height, not level at the axis only
  const tilt = (s, t) => { const k = near(s); return k ? k * (ground(Math.sign(s) * endOf(s), t) - ground(Math.sign(s) * endOf(s))) : 0; };
  const atd = (s, t, y) => at(s, t, y + tilt(s, t));
  const roadCol = hex(PAL.road[1]), paveCol = hex(PAL.casing);
  const bands = [ // [inner edge, outer edge, raise, colour, street colour, kind]; edge -1 is the deck's outer edge
    [0, 1, 0.0, asphalt, roadCol, KIND.ROAD],
    [1, 2, 0.28, strip, paveCol, KIND.PLAIN],
    [2, 3, 0.0, moto, roadCol, KIND.ROAD],
    [3, -1, 0.2, granite, paveCol, KIND.ROAD],
  ];
  for (let i = 0; i + 1 < ss.length; i++) {
    const a = ss[i], b = ss[i + 1], ya = top(a), yb = top(b), m = (a + b) / 2, fa = 1 - near(a), fb = 1 - near(b);
    const span = a >= abut[0] - 1e-6 && b <= abut[1] + 1e-6;
    const ma = edges(a, 1)[0], mb = edges(b, 1)[0], na = edges(a, -1)[0], nb = edges(b, -1)[0];
    S.kind = KIND.PLAIN;
    S.quad(atd(a, -na, ya + 0.3 * fa), atd(a, ma, ya + 0.3 * fa), atd(b, mb, yb + 0.3 * fb), atd(b, -nb, yb + 0.3 * fb), toStreet(strip, paveCol, m), [0, 1, 0]);
    for (const side of [-1, 1]) {
      const Ea = edges(a, side), Eb = edges(b, side), ed = (E, j) => side * (j < 0 ? HW : E[j]);
      for (const [ji, jo, h, col0, col1, kind] of bands) {
        S.kind = kind;
        const col = toStreet(col0, col1, m), ha = h * fa, hb = h * fb;
        S.quad(atd(a, ed(Ea, ji), ya + ha), atd(a, ed(Ea, jo), ya + ha), atd(b, ed(Eb, jo), yb + hb), atd(b, ed(Eb, ji), yb + hb), col, [0, 1, 0]);
        S.kind = KIND.PLAIN;
        if (h > 0 && Math.max(ha, hb) > 0.005) for (const j of [ji, jo]) {
          if (j < 0) continue;
          S.quad(atd(a, ed(Ea, j), ya), atd(b, ed(Eb, j), yb), atd(b, ed(Eb, j), yb + hb), atd(a, ed(Ea, j), ya + ha), shade(col, 0.92), [0, 0.2, 0]);
        }
      }
      S.kind = KIND.PLAIN;
      if (fa + fb > 0.01) S.quad(atd(a, side * Ea[0], ya), atd(b, side * Eb[0], yb), atd(b, side * Eb[0], yb + 0.3 * fb), atd(a, side * Ea[0], ya + 0.3 * fa), strip, [side * v[0], 0, side * v[1]]);
      // outer face: the cantilever edge on the bridge, a retaining wall down to the street on the ramps
      const ba = span ? ya - 1.1 : Math.min(ya - 1.1, ground(a) - 0.5), bb = span ? yb - 1.1 : Math.min(yb - 1.1, ground(b) - 0.5);
      S.quad(atd(a, side * HW, ba), atd(b, side * HW, bb), atd(b, side * HW, yb + 0.2), atd(a, side * HW, ya + 0.2), span ? fascia : concrete, [side * v[0], 0, side * v[1]]);
      if (span) {
        // underside of the cantilevered outer lanes, the main girder's web, the girder soffit
        S.quad(atd(a, side * 10, ya - 1.1), atd(b, side * 10, yb - 1.1), atd(b, side * HW, yb - 1.1), atd(a, side * HW, ya - 1.1), under, [0, -1, 0]);
        S.quad(atd(a, side * 10, ya - 2.4), atd(b, side * 10, yb - 2.4), atd(b, side * 10, yb - 1.1), atd(a, side * 10, ya - 1.1), steel, [side * v[0], 0, side * v[1]]);
      }
    }
    if (span) S.quad(atd(a, -10, ya - 2.4), atd(b, -10, yb - 2.4), atd(b, 10, yb - 2.4), atd(a, 10, ya - 2.4), under, [0, -1, 0]);
  }
  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = KIND.PLAIN;
  // lane lines: white dashes between the car lanes
  for (const side of [-1, 1]) for (const vv of [4.5, 8]) {
    for (let s = -ends[0] + TRANS + 2; s < ends[1] - TRANS - 4; s += 10) {
      const y = top(s + 2) + 0.015, t = side * vv;
      S.quad(at(s, t - 0.08, y), at(s, t + 0.08, y), at(s + 4, t + 0.08, top(s + 4) + 0.015), at(s + 4, t - 0.08, y), line, [0, 1, 0]);
    }
  }
  // the 128 cantilevered cross girders (64 a side), tapering out from the main girder
  for (let k = 0; k < 64; k++) {
    const s = -half + 2.7 + k * ((L - 5.4) / 63), y = top(s);
    if (!open(s)) continue;
    for (const side of [-1, 1]) S.beam(at(s, side * 10, y - 1.7), at(s, side * (HW - 0.3), y - 1.35), 0.4, 0.5, steel);
  }

  // ---- piers: the two yellow V piers, grey side piers, abutments
  const pierRing = (s, hl, hw, nose = 6) => {
    const out = [];
    for (const end of [1, -1]) for (let i = 0; i <= nose; i++) {
      const t = -Math.PI / 2 + (Math.PI * i) / nose;
      out.push(xz(s + end * Math.sin(t) * hw, end * (hl - hw + Math.cos(t) * hw)));
    }
    return out;
  };
  for (const e of [-1, 1]) {
    const sF = e * FOOT;
    // pile cap at the waterline, then a yellow transverse beam joining the legs
    S.prism(pierRing(sF, 18, 4.5, 6), -3, 0.4, wet, wet, { top: false });
    S.prism(pierRing(sF, 17.4, 4, 6), 0.4, Y_SPRING, concrete, concrete);
    S.box(...xz(sF, 0), Y_SPRING, Y_SPRING + 1.4, 3.2, 2 * V_RIB + 2.4, ang, goldD);
    // the outer leg of the V: from the footing out to the deck at V_TOP, a broad wedge
    for (const side of [-1, 1]) {
      const sT = e * V_TOP, yT = top(sT) - 2.4;
      const N = 6;
      for (let k = 0; k < N; k++) {
        const t0 = k / N, t1 = (k + 1) / N;
        const p0 = at(sF + (sT - sF) * t0, side * V_RIB, Y_SPRING + 0.7 + (yT - Y_SPRING - 0.7) * t0);
        const p1 = at(sF + (sT - sF) * t1, side * V_RIB, Y_SPRING + 0.7 + (yT - Y_SPRING - 0.7) * t1);
        S.beam(p0, p1, 2.2, 3.2 - 1.2 * (t0 + t1) / 2, gold);
      }
    }
    // a yellow crosshead under the deck where the V meets it
    S.box(...xz(e * V_TOP, 0), top(e * V_TOP) - 3.4, top(e * V_TOP) - 2.4, 2.4, 2 * V_RIB + 2.2, ang, goldD, { bottom: true });
    // grey wall pier under the side spans, with a crosshead
    const sP = e * PIER, yP = top(sP) - 2.4;
    S.prism(pierRing(sP, 9, 1.2, 5), -3, 0.6, wet, wet, { top: false });
    S.prism(pierRing(sP, 9, 1.2, 5), 0.6, yP - 1.2, concrete, concrete, { top: false });
    S.box(...xz(sP, 0), yP - 1.2, yP, 2.2, 22, ang, concrete, { bottom: true });
    // abutment: a wall where the open spans end and the embankment begins, down into the bank
    const sA = abut[(e + 1) / 2] + e * 1.2;
    S.box(...xz(sA, 0), LAND_Y - 3, top(sA) - 1.1, 2.4, 2 * HW + 0.6, ang, concrete);
  }

  // ---- the two arches: box ribs from the V footing up through the deck to a crown ~22 m over it, upright
  const NA = 40;
  const ribPt = (s, side) => {
    const q = Math.max(0, 1 - (s / FOOT) ** 2);
    const y = Y_SPRING + 0.7 + (Y_CROWN - Y_SPRING - 0.7) * q ** 0.9;
    return at(s, side * V_RIB, y);
  };
  const ribS = (k) => -FOOT + (2 * FOOT * k) / NA;
  for (const side of [-1, 1]) {
    for (let k = 0; k < NA; k++) {
      const s0 = ribS(k), s1 = ribS(k + 1), m = Math.abs((s0 + s1) / 2) / FOOT;
      S.beam(ribPt(s0, side), ribPt(s1, side), 2.0, 2.4 + 1.0 * m * m, mix(gold, goldD, 0.5 * m * m));
    }
    // hangers every 5.5 m, from the rib down to the rib strip on the deck
    for (let s = -71.5; s <= 71.6; s += 5.5) {
      const p = ribPt(s, side);
      S.beam([p[0], p[1] - 1.1, p[2]], at(s, side * V_RIB, top(s) + 0.28), 0.14, 0.14, rail);
    }
  }

  // ---- railings: white steel, posts every 2.5 m, top and bottom rails and a mid rail (the lotus panels); open
  // where a wing leaves the deck
  const gate = (s) => { const a = Math.abs(s) - WING_S[s < 0 ? 0 : 1]; return a > -0.5 && a < WING_OPEN; };
  for (const side of [-1, 1]) {
    const t = side * V_RAIL;
    for (let s = -ends[0] + 1; s <= ends[1] - 1; s += 2.5) {
      if (gate(s)) continue;
      const y = top(s) + tilt(s, t) + 0.2;
      const p = xz(s, t);
      S.box(p[0], p[1], y, y + 1.15, 0.14, 0.14, ang, rail);
    }
    for (let s = -ends[0] + 1; s < ends[1] - 1; s += 2.5) {
      const e = Math.min(ends[1] - 1, s + 2.5);
      if (gate(s) || gate(e)) continue;
      for (const [h, w] of [[1.12, 0.14], [0.62, 0.07], [0.12, 0.1]]) S.beam(atd(s, t, top(s) + 0.2 + h), atd(e, t, top(e) + 0.2 + h), w, w, rail);
    }
  }

  // ---- the wings: a walkway ramp leaves each outer edge near both ends, running beside the deck at first and
  // splaying out ~20° (t = 23.3 + 0.25 d + 0.0021 d², d metres along the bridge from where it leaves), down to a round
  // terrace on the bank. 3.6 m wide, granite paving, white railings, round grey columns where it stands clear.
  for (const e of [-1, 1]) for (const side of [-1, 1]) {
    const i = (e + 1) / 2, sA = WING_S[i], Lw = WING_L[i];
    // the south-west terrace stops short of the riverside street (OSM) that skirts its outer edge
    const PLAZA_R = e > 0 && side > 0 ? PLAZA_RSW : PLAZA_RN;
    const tc = (d) => 23.3 + 0.25 * d + 0.0021 * d * d, slope = (d) => 0.25 + 0.0042 * d;
    // centre and unit normal in (s, t)
    const pt = (d, off = 0) => { const k = slope(d), n = Math.hypot(1, k); return [e * (sA + d) - e * k * off / n, side * tc(d) + side * off / n]; }; // off > 0 outward
    const end = pt(Lw), k1 = slope(Lw), n1 = Math.hypot(1, k1);
    const pc = [end[0] + e * (PLAZA_R + 0.5) / n1, end[1] + side * k1 * (PLAZA_R + 0.5) / n1];
    const ring = [];
    for (let j = 0; j < 28; j++) { const a = (2 * Math.PI * j) / 28; ring.push([pc[0] + Math.cos(a) * PLAZA_R, pc[1] + Math.sin(a) * PLAZA_R]); }
    const yP = Math.max(...ring.map(([s, t]) => ground(s, t)), ground(pc[0], pc[1])) + 0.25;
    const y0 = top(e * sA) + 0.2;
    const yw = (d) => y0 + (yP - y0) * (1 - Math.cos(Math.PI * Math.min(1, d / Lw))) / 2;
    const ds = [];
    for (let d = 0; d < Lw; d += 2) ds.push(d);
    ds.push(Lw + 0.6); // into the terrace's edge
    const W2 = WING_W / 2;
    for (let j = 0; j + 1 < ds.length; j++) {
      const a = ds[j], b = ds[j + 1], ya = yw(a), yb = yw(b);
      const A0 = pt(a, -W2), A1 = pt(a, W2), B0 = pt(b, -W2), B1 = pt(b, W2);
      S.kind = KIND.ROAD;
      S.quad(at(...A0, ya), at(...A1, ya), at(...B1, yb), at(...B0, yb), granite, [0, 1, 0]);
      S.kind = KIND.PLAIN;
      S.quad(at(...A0, ya - 0.9), at(...B0, yb - 0.9), at(...B1, yb - 0.9), at(...A1, ya - 0.9), under, [0, -1, 0]);
      for (const [P, Q] of [[A0, B0], [A1, B1]]) S.quad(at(...P, ya - 0.9), at(...Q, yb - 0.9), at(...Q, yb + 0.1), at(...P, ya + 0.1), fascia, [0, 0.1, 0]);
      // railings on both edges; the inner one starts where the wing has left the deck
      for (const off of [-W2 + 0.1, W2 - 0.1]) {
        const inner = off < 0;
        if (inner && a < WING_OPEN) continue;
        const P = pt(a, off), Q = pt(b, off);
        if (b <= Lw) S.box(...xz(...P), ya, ya + 1.1, 0.12, 0.12, ang, rail);
        for (const h of [1.08, 0.55]) S.beam(at(...P, ya + h), at(...Q, yb + h), 0.1, 0.1, rail);
      }
    }
    // columns under the free part
    for (let d = 7; d < Lw - 3; d += 9) {
      const y = yw(d), [s, t] = pt(d);
      if (y - 0.9 > ground(s, t) + 0.6) { const p = xz(s, t); S.cyl(p[0], p[1], -2, y - 0.9, 0.5, 0.5, 8, concrete, { cap: false }); }
    }
    // the terrace: a round granite floor with a white rim, open where the wing comes in
    S.prism(ring.map(([s, t]) => xz(s, t)), -1.5, yP, concrete, granite);
    const inA = Math.atan2(end[1] - pc[1], end[0] - pc[0]);
    for (let j = 0; j < 28; j++) {
      const a0 = (2 * Math.PI * j) / 28, a1 = (2 * Math.PI * (j + 1)) / 28, am = (a0 + a1) / 2;
      if (Math.abs(Math.atan2(Math.sin(am - inA), Math.cos(am - inA))) < 0.45) continue;
      const r = PLAZA_R - 0.15;
      S.beam(at(pc[0] + Math.cos(a0) * r, pc[1] + Math.sin(a0) * r, yP + 0.45), at(pc[0] + Math.cos(a1) * r, pc[1] + Math.sin(a1) * r, yP + 0.45), 0.3, 0.9, rail);
    }
  }
  S.kind = KIND.PLAIN;

  // ---- "lọng" lamps: 60 golden parasols on the rib strips, 15 to a row, rising from 4.6 m at the bridge ends to
  // ~14.2 m beside the arch, so their heads run on into the arch's curve
  const glowP = [], glowC = [];
  const PER = 15, sEnd = half - 6, sNear = 86;
  for (const e of [-1, 1]) for (const side of [-1, 1]) for (let i = 0; i < PER; i++) {
    const t = i / (PER - 1);
    const s = e * (sEnd - (sEnd - sNear) * t);
    const h = 4.6 + (14.2 - 4.6) * t * t;
    const p = xz(s, side * V_RIB), y0 = top(s) + 0.28, yH = y0 + h;
    S.cyl(p[0], p[1], y0, y0 + 0.5, 0.28, 0.22, 6, goldD, { cap: false });
    S.cyl(p[0], p[1], y0 + 0.5, yH - 0.3, 0.1, 0.08, 6, lampGold, { cap: false });
    S.cyl(p[0], p[1], yH - 0.75, yH - 0.35, 1.25, 1.3, 10, goldD, { cap: false }); // fringe
    S.cyl(p[0], p[1], yH - 0.35, yH + 0.45, 1.3, 0.12, 10, gold, { cap: false }); // canopy
    S.cyl(p[0], p[1], yH + 0.45, yH + 0.95, 0.16, 0.02, 5, goldD);
    glowP.push(p[0], yH - 0.6, p[1]); glowC.push(1.0, 0.84, 0.5);
  }
  S.kind = KIND.PLAIN;

  // ---- after dark: the arches washed in light (colour-changing LEDs), the hangers as fine lines, the deck edges
  const LB = new Buf(600), EB = new Buf(200), W1 = [1, 1, 1];
  for (const side of [-1, 1]) {
    for (let k = 0; k < NA; k++) {
      const a = ribPt(ribS(k), side), b = ribPt(ribS(k + 1), side);
      if (Math.max(a[1], b[1]) < top(ribS(k)) - 0.5) continue;
      LB.beam([a[0], a[1] + 1.35, a[2]], [b[0], b[1] + 1.35, b[2]], 1.4, 0.2, W1);
      const o = (k2) => [v[0] * side * 1.05 * k2, 0, v[1] * side * 1.05 * k2];
      for (const sgn of [-1, 1]) { const d = o(sgn); LB.beam([a[0] + d[0], a[1], a[2] + d[2]], [b[0] + d[0], b[1], b[2] + d[2]], 0.12, 0.8, W1); }
    }
    for (let s = -71.5; s <= 71.6; s += 5.5) { const p = ribPt(s, side); LB.beam([p[0], p[1] - 1.2, p[2]], at(s, side * V_RIB, top(s) + 0.4), 0.06, 0.06, W1); }
    for (let s = -half; s < half; s += 10) EB.beam(at(s, side * (HW + 0.05), top(s) - 0.35), at(s + 10, side * (HW + 0.05), top(s + 10) - 0.35), 0.1, 0.22, W1);
  }
  const archMat = lightMaterial(0xffb637, 2.0);
  const arch = new THREE.Mesh(LB.geometry(), archMat);
  const edge = new THREE.Mesh(EB.geometry(), lightMaterial(0xfff0d0, 1.0));
  arch.renderOrder = edge.renderOrder = 19;
  arch.userData.landmark = edge.userData.landmark = id;
  const lamps = glowPoints(glowP, glowC, 5);
  lamps.userData.glow = true;
  lamps.userData.landmark = id;
  group.add(arch, edge, lamps);

  // the arch light show: mostly royal gold, a slow walk through amber, rose, violet and teal; warm white in the rain
  const PALETTE = [0xffb637, 0xffb637, 0xff8a2a, 0xff5c8a, 0x9a6bff, 0x39c6c0, 0xffd36a].map((h) => new THREE.Color(h));
  const warmWhite = new THREE.Color(0xfff0d0), col = new THREE.Color();
  return {
    update(time, glow, rain) {
      if (glow <= 0.01) return;
      const T = 8, k = Math.floor(time / T), f = (time / T) % 1, e = f < 0.75 ? 0 : (f - 0.75) / 0.25;
      col.copy(PALETTE[k % PALETTE.length]).lerp(PALETTE[(k + 1) % PALETTE.length], e * e * (3 - 2 * e));
      if (rain) col.lerp(warmWhite, Math.min(1, rain));
      archMat.uniforms.uColor.value.copy(col);
    },
  };
}
