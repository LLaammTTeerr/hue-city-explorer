import * as THREE from 'three';
import { KIND, hex, shade, Buf } from '../../geo/buf.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { rise } from '../../geo/terrain.js';
import { LAND_Y } from '../../config.js';

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
// light grey deck fascia; white railings; the ribs lean slightly toward each other.
// Estimated: span lengths 30 + 30 + 228 (180 between the V footings) + 30 + 30, the cross-section split, the deck
// rise (6.6 m at the ends, 8.4 m at mid-span), rib section, 3.5 m lean, hanger spacing, lamps on the rib strip.
export const id = 'nguyenhoang';

const L = 350, HW = 21.5; // length, half width
const V_MED = 1.0, V_CAR = 11.5, V_RIB = 13, V_STRIP = 14.5, V_MOTO = 18, V_RAIL = 21.35;
const Y_END = 6.6, Y_MID = 8.4; // deck surface at the abutments and at mid-span (river at y = 0)
const FOOT = 92, Y_SPRING = 1.2, Y_CROWN = 30.6, LEAN = 3.5; // arch: springing at the V footing, crown, inward lean
const V_TOP = 114, PIER = 144, RAMP = 46;

export function build({ data, S, group }) {
  const nh = data.nguyenhoang;
  if (!nh) throw new Error('no nguyenhoang outline in hue.json');
  const c = [nh.c[0] / 10, nh.c[1] / 10], ang = nh.a / 1000;
  const u = [Math.cos(ang), Math.sin(ang)], v = [-u[1], u[0]];
  const xz = (s, t) => [c[0] + u[0] * s + v[0] * t, c[1] + u[1] * s + v[1] * t];
  const at = (s, t, y) => { const p = xz(s, t); return [p[0], y, p[1]]; };
  const ground = (s) => { const p = xz(s, 0); return LAND_Y + rise(p[0], p[1]) + 0.08; };
  const half = L / 2;
  // where the deck comes down to the street: the first mapped carriageway beyond each end of the outline, on the
  // deck's axis (the OSM bridge ways under the outline are not laid; the slip roads and avenues carry on from where
  // they stop). The ramp is at grade there, so it never stands over the junction or the islands between its slips.
  const ends = [-1, 1].map((e) => {
    let best = half + RAMP;
    for (const [cls, br, f] of data.roads || []) {
      if (br || cls > 3) continue;
      for (const k of [0, f.length - 2]) {
        const dx = f[k] / 10 - c[0], dz = f[k + 1] / 10 - c[1], s = (dx * u[0] + dz * u[1]) * e, t = dx * v[0] + dz * v[1];
        if (Math.abs(t) < HW && s > half && s < best) best = s;
      }
    }
    return best;
  });
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
  ss.push(ends[1]);
  for (const s of [-half, half, ...abut]) if (!ss.includes(s)) ss.push(s);
  ss.sort((a, b) => a - b);
  const bands = [ // [inner, outer, raise, colour, kind]
    [V_MED, V_CAR, 0, asphalt, KIND.ROAD],
    [V_CAR, V_STRIP, 0.28, strip, KIND.PLAIN],
    [V_STRIP, V_MOTO, 0, moto, KIND.ROAD],
    [V_MOTO, HW, 0.2, granite, KIND.ROAD],
  ];
  for (let i = 0; i + 1 < ss.length; i++) {
    const a = ss[i], b = ss[i + 1], ya = top(a), yb = top(b);
    const span = a >= abut[0] - 1e-6 && b <= abut[1] + 1e-6;
    S.kind = KIND.PLAIN;
    S.quad(at(a, -V_MED, ya + 0.3), at(a, V_MED, ya + 0.3), at(b, V_MED, yb + 0.3), at(b, -V_MED, yb + 0.3), strip, [0, 1, 0]);
    for (const side of [-1, 1]) {
      for (const [ti, to, h, col, kind] of bands) {
        S.kind = kind;
        const vi = side * ti, vo = side * to;
        S.quad(at(a, vi, ya + h), at(a, vo, ya + h), at(b, vo, yb + h), at(b, vi, yb + h), col, [0, 1, 0]);
        S.kind = KIND.PLAIN;
        if (h > 0) for (const vv of [vi, vo]) {
          if (Math.abs(vv) >= HW - 1e-6) continue;
          S.quad(at(a, vv, ya), at(b, vv, yb), at(b, vv, yb + h), at(a, vv, ya + h), shade(col, 0.92), [0, 0.2, 0]);
        }
      }
      S.kind = KIND.PLAIN;
      S.quad(at(a, side * V_MED, ya), at(b, side * V_MED, yb), at(b, side * V_MED, yb + 0.3), at(a, side * V_MED, ya + 0.3), strip, [side * v[0], 0, side * v[1]]);
      // outer face: the cantilever edge on the bridge, a retaining wall down to the street on the ramps
      const ba = span ? ya - 1.1 : Math.min(ya - 1.1, ground(a) - 0.5), bb = span ? yb - 1.1 : Math.min(yb - 1.1, ground(b) - 0.5);
      S.quad(at(a, side * HW, ba), at(b, side * HW, bb), at(b, side * HW, yb + 0.2), at(a, side * HW, ya + 0.2), span ? fascia : concrete, [side * v[0], 0, side * v[1]]);
      if (span) {
        // underside of the cantilevered outer lanes, the main girder's web, the girder soffit
        S.quad(at(a, side * 10, ya - 1.1), at(b, side * 10, yb - 1.1), at(b, side * HW, yb - 1.1), at(a, side * HW, ya - 1.1), under, [0, -1, 0]);
        S.quad(at(a, side * 10, ya - 2.4), at(b, side * 10, yb - 2.4), at(b, side * 10, yb - 1.1), at(a, side * 10, ya - 1.1), steel, [side * v[0], 0, side * v[1]]);
      }
    }
    if (span) S.quad(at(a, -10, ya - 2.4), at(b, -10, yb - 2.4), at(b, 10, yb - 2.4), at(a, 10, ya - 2.4), under, [0, -1, 0]);
  }
  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = KIND.PLAIN;
  // lane lines: white dashes between the car lanes
  for (const side of [-1, 1]) for (const vv of [4.5, 8]) {
    for (let s = -ends[0] + 2; s < ends[1] - 6; s += 10) {
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

  // ---- the two arches: box ribs from the V footing up through the deck to a crown ~22 m over it, leaning inward
  const NA = 40;
  const ribPt = (s, side) => {
    const q = Math.max(0, 1 - (s / FOOT) ** 2);
    const y = Y_SPRING + 0.7 + (Y_CROWN - Y_SPRING - 0.7) * q ** 0.9;
    const lean = LEAN * ((y - Y_SPRING) / (Y_CROWN - Y_SPRING));
    return at(s, side * (V_RIB - lean), y);
  };
  const ribS = (k) => -FOOT + (2 * FOOT * k) / NA;
  for (const side of [-1, 1]) {
    for (let k = 0; k < NA; k++) {
      const s0 = ribS(k), s1 = ribS(k + 1), m = Math.abs((s0 + s1) / 2) / FOOT;
      S.beam(ribPt(s0, side), ribPt(s1, side), 2.0, 2.4 + 1.0 * m * m, gold);
    }
    // hangers every 5.5 m, from the rib down to the rib strip on the deck
    for (let s = -71.5; s <= 71.6; s += 5.5) {
      const p = ribPt(s, side);
      S.beam([p[0], p[1] - 1.1, p[2]], at(s, side * V_RIB, top(s) + 0.28), 0.14, 0.14, rail);
    }
  }

  // ---- railings: white steel, posts every 2.5 m, top and bottom rails and a mid rail (the lotus panels)
  for (const side of [-1, 1]) {
    const t = side * V_RAIL;
    for (let s = -ends[0] + 1; s <= ends[1] - 1; s += 2.5) {
      const y = top(s) + 0.2;
      const p = xz(s, t);
      S.box(p[0], p[1], y, y + 1.15, 0.14, 0.14, ang, rail);
    }
    for (let s = -ends[0] + 1; s < ends[1] - 1; s += 5) {
      const e = Math.min(ends[1] - 1, s + 5);
      for (const [h, w] of [[1.12, 0.14], [0.62, 0.07], [0.12, 0.1]]) S.beam(at(s, t, top(s) + 0.2 + h), at(e, t, top(e) + 0.2 + h), w, w, rail);
    }
  }

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
