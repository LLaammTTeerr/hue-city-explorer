import * as THREE from 'three';
import { KIND, hex, shade, Buf } from '../geo/buf.js';
import { glowPoints, lightMaterial } from '../geo/materials.js';
import { LAND_Y, PAL } from '../config.js';
import { rise } from '../geo/terrain.js';
import { pavilion } from './citadel.js';
import { night, lamp, strips, flushLamps, fence, roadsNear, leaves, FENCE } from './enclosure.js';
import { replaced } from './places/index.js';

// Cầu Nguyễn Hoàng (opened 2025). Axis, length and position come from the OSM bridge outline; the form
// follows published descriptions: five concrete beam spans, a deck about 43 m wide, a yellow steel arch
// frame over 20 m tall at mid-bridge, and parasol-shaped lamps ("lọng") stepping up toward it from both ends.
export function buildNguyenHoang(data, S, group) {
  group.add(night); // the night lighting of the landmarks in civic.js, more.js and memorial.js (enclosure.js)
  if (replaced('nguyenhoang')) return []; // modelled in places/nguyenhoang.js
  const nh = data.nguyenhoang;
  if (!nh) return [];
  const c = [nh.c[0] / 10, nh.c[1] / 10], L = nh.w / 10, W = Math.min(nh.d / 10, 43), ang = nh.a / 1000;
  const u = [Math.cos(ang), Math.sin(ang)], v = [-u[1], u[0]];
  const at = (s, off, y) => [c[0] + u[0] * s + v[0] * off, y, c[1] + u[1] * s + v[1] * off];
  const SPANS = 5, span = L / SPANS;
  const deckTop = 6.8, deckT = 1.7; // above the river, as cầu Trường Tiền's is: the banks are 2.6 m up, the deck climbs to this
  const concrete = hex('#cfc9be'), asphalt = hex('#77726e'), granite = hex('#b08a7c'), gold = hex('#dba92c'), goldD = hex('#b98a1e');

  S.kind = KIND.PLAIN;
  S.box(c[0], c[1], deckTop - deckT, deckTop, L, W, ang, concrete, { top: asphalt, bottom: true, topKind: KIND.ROAD });
  // red-granite walkways along both edges, a planted median, railings
  for (const side of [-1, 1]) {
    const m = at(0, side * (W / 2 - 2.2), 0);
    S.box(m[0], m[2], deckTop, deckTop + 0.14, L, 3.6, ang, granite, { topKind: KIND.ROAD });
    S.beam(at(-L / 2, side * (W / 2 - 0.15), deckTop + 1.15), at(L / 2, side * (W / 2 - 0.15), deckTop + 1.15), 0.16, 0.16, hex('#e6e2d8'));
    S.beam(at(-L / 2, side * (W / 2 - 0.15), deckTop + 0.6), at(L / 2, side * (W / 2 - 0.15), deckTop + 0.6), 0.1, 0.1, hex('#cfcac0'));
    for (let s = -L / 2; s <= L / 2 + 0.01; s += span / 10) S.beam(at(s, side * (W / 2 - 0.15), deckTop), at(s, side * (W / 2 - 0.15), deckTop + 1.15), 0.14, 0.14, hex('#cfcac0'));
  }
  const med = at(0, 0, 0);
  S.box(med[0], med[2], deckTop, deckTop + 0.35, L, 1.6, ang, hex('#8fa56c'), { topKind: KIND.GROUND });
  // piers: broad wall piers with rounded ends, and the abutment ramps
  S.kind = KIND.PLAIN;
  for (let i = 1; i < SPANS; i++) {
    const s = -L / 2 + i * span;
    const ring = [[-1.6, -W / 2 + 3], [0, -W / 2 + 0.8], [1.6, -W / 2 + 3], [1.6, W / 2 - 3], [0, W / 2 - 0.8], [-1.6, W / 2 - 3]].map(([a, b]) => { const p = at(s + a, b, 0); return [p[0], p[2]]; });
    S.prism(ring, -3, deckTop - deckT, concrete, shade(concrete, 1.05), { scaleTop: 1.06 });
  }
  for (const end of [-1, 1]) {
    const s0 = (end * L) / 2, s1 = s0 + end * 46, y1 = LAND_Y + 0.08;
    const p = [at(s0, -W / 2, deckTop), at(s0, W / 2, deckTop), at(s1, W / 2, y1), at(s1, -W / 2, y1)];
    S.kind = KIND.ROAD;
    S.quad(p[0], p[1], p[2], p[3], asphalt, [0, 1, 0]);
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) S.quad(at(s0, (side * W) / 2, deckTop), at(s1, (side * W) / 2, y1), at(s1, (side * W) / 2, LAND_Y - 0.5), at(s0, (side * W) / 2, LAND_Y - 0.5), concrete, [v[0] * side, 0, v[1] * side]);
    const m = at(s0 + end * 1.4, 0, 0);
    S.box(m[0], m[2], -3, deckTop - deckT, 3.6, W + 2, ang, concrete);
  }

  // the golden arch frame over the middle span: one rib on each side of the carriageway, tied across the top
  const lp = [], lc = [];
  const H = 21.5, N = 18, ribX = W / 2 - 5.2;
  const rib = (k, side) => { const t = k / N; return at(-span / 2 + t * span, side * ribX * (1 - 0.1 * Math.sin(Math.PI * t)), deckTop + H * Math.sin(Math.PI * t) ** 0.85); };
  for (const side of [-1, 1]) {
    for (let k = 0; k < N; k++) {
      const a = rib(k, side), b = rib(k + 1, side);
      S.beam(a, b, 1.5, 1.2, gold);
      lp.push((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.8, (a[2] + b[2]) / 2); lc.push(1.0, 0.78, 0.32);
      if (k >= 2 && k <= N - 2 && k % 2 === 0) {
        const foot = at(-span / 2 + (k / N) * span, side * ribX, deckTop);
        S.beam(a, foot, 0.22, 0.22, goldD); // hangers
      }
    }
  }
  for (let k = 5; k <= N - 5; k += 2) S.beam(rib(k, -1), rib(k, 1), 0.5, 0.5, goldD);
  // after dark the arch is washed in gold: a strip on the crown of each rib, the hangers as fine lines,
  // the ties overhead, and a pale line along each edge of the deck
  {
    const LB = new Buf(400), EB = new Buf(64), W1 = [1, 1, 1];
    const lift = (p, h) => [p[0], p[1] + h, p[2]];
    for (const side of [-1, 1]) {
      for (let k = 0; k < N; k++) {
        const a = rib(k, side), b = rib(k + 1, side);
        LB.beam(lift(a, 0.72), lift(b, 0.72), 0.9, 0.26, W1);
        LB.beam([a[0] + v[0] * side * 0.85, a[1], a[2] + v[1] * side * 0.85], [b[0] + v[0] * side * 0.85, b[1], b[2] + v[1] * side * 0.85], 0.16, 0.5, W1);
        if (k >= 2 && k <= N - 2 && k % 2 === 0) LB.beam(a, at(-span / 2 + (k / N) * span, side * ribX, deckTop + 0.3), 0.1, 0.1, W1);
      }
      EB.beam(at(-L / 2, side * (W / 2 + 0.06), deckTop - 0.2), at(L / 2, side * (W / 2 + 0.06), deckTop - 0.2), 0.12, 0.2, W1);
    }
    for (let k = 5; k <= N - 5; k += 2) LB.beam(lift(rib(k, -1), -0.35), lift(rib(k, 1), -0.35), 0.14, 0.14, W1);
    const arch = new THREE.Mesh(LB.geometry(), lightMaterial(0xffb637, 2.1));
    const edge = new THREE.Mesh(EB.geometry(), lightMaterial(0xfff0d0, 1.0));
    arch.renderOrder = edge.renderOrder = 19;
    arch.userData.landmark = edge.userData.landmark = true;
    group.add(arch, edge);
  }

  // "lọng" lamps: 64 parasols, from 4.6 m at the bridge ends up to about 14 m beside the arch
  const perRun = 16, run = L / 2 - span / 2 - 6;
  for (const end of [-1, 1]) for (const side of [-1, 1]) for (let i = 0; i < perRun; i++) {
    const t = i / (perRun - 1); // 0 at the bridge end → 1 next to the arch
    const s = end * (L / 2 - 4 - t * run);
    const hgt = 4.6 + (14.2 - 4.6) * t * t;
    const base = at(s, side * (W / 2 - 4.4), deckTop);
    S.beam(base, [base[0], deckTop + hgt, base[2]], 0.2, 0.2, goldD);
    S.kind = KIND.PLAIN;
    S.cyl(base[0], base[2], deckTop + hgt - 0.2, deckTop + hgt + 0.9, 1.25, 0.12, 8, gold, { cap: false });
    S.cyl(base[0], base[2], deckTop + hgt - 0.5, deckTop + hgt - 0.2, 1.3, 1.25, 8, goldD, { cap: false });
    lp.push(base[0], deckTop + hgt - 0.4, base[2]); lc.push(1.0, 0.82, 0.45);
  }
  const lights = glowPoints(lp, lc, 5);
  group.add(lights);
  return [lights];
}

// ---- Trường Quốc Học: the gate on Lê Lợi and the fence round the campus ----
//
// The campus outline is OSM way 695775622 (amenity=school, barrier=wall). hue.json does not carry it yet, so it is
// copied here (decimetres, the frame of scripts/build-data.mjs); `data.special.quochoc.ring` wins when exported.
// Sources: voh.com.vn ("sắc màu đỏ sẫm", the early front wall "tường xây bằng gạch đỏ sậm"); tienphong.vn
// (the gate's bell and the board "Pháp tự Quốc học Trường môn"); VnExpress (Ga Huế painted the school's colour).
// Form from photographs of the gate: a dark-red masonry gate of three openings, the middle one taller under a
// two-tier tiled roof with the name board, the side doors under their own roofs; along Lê Lợi a low red wall
// carrying a dark iron railing between red piers with cream caps. Dimensions are estimates.
const QH_RING = [-5010, 11971, -4958, 11994, -4869, 11952, -3836, 11001, -3830, 10871, -5716, 8724, -5792, 8707, -6396, 9235, -6976, 9741, -6969, 9831, -5400, 11556];
const QH_GATE_HALF = 9.6; // half the gate's width along the street, where the fence stops

export function buildQuocHocGate(data, S) {
  if (replaced('quochoc')) return; // modelled in places/quochoc.js
  const g = data.quocHocGate;
  try {
    const flat = data.special?.quochoc?.ring?.length >= 6 ? data.special.quochoc.ring : QH_RING;
    const ring = [];
    for (let i = 0; i < flat.length; i += 2) ring.push([flat[i] / 10, flat[i + 1] / 10]);
    const c = ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length], [0, 0]);
    const openings = g ? [[g.c[0] / 10, g.c[1] / 10, QH_GATE_HALF]] : [];
    fence(S, ring, FENCE.quochoc, { roads: roadsNear(data, c, 260), openings, lampEvery: 6, lampCol: [1, 0.86, 0.6] });
  } catch (e) {
    console.warn('Quốc Học fence not built:', e);
  }
  if (g) gate(g, S);
  S.kind = KIND.PLAIN;
  S.base = 0;
  flushLamps();
}

function gate(g, S) {
  const c = [g.c[0] / 10, g.c[1] / 10], ang = g.a / 1000;
  const u = [Math.cos(ang), Math.sin(ang)], v = [-u[1], u[0]];
  const P = (s, t = 0) => [c[0] + u[0] * s + v[0] * t, c[1] + u[1] * s + v[1] * t];
  const red = hex('#9e2e27'), redD = hex('#86261f'), cream = hex('#efe2c4'), dark = hex('#2b2422'), iron = hex('#22302a');
  const roof = hex('#6f5a4a'), ridge = hex('#e2d3ac'), board = hex('#1f2f4a'), gold = hex('#d9b14a');
  const y = LAND_Y + rise(c[0], c[1]);
  S.base = y - LAND_Y;
  // a low stone sill under the whole gate
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], y - 0.4, y + 0.15, 2 * QH_GATE_HALF, 3.2, ang, PAL.stone, { topKind: KIND.ROAD });
  const y1 = y + 0.15;
  // four piers: the two tall ones frame the middle opening, the outer ones end the side doors
  for (const s of [-1, 1]) {
    for (const [b, w, h] of [[2.55, 1.5, 6.9], [QH_GATE_HALF - 0.8, 1.4, 4.4]]) {
      const q = P(s * b);
      S.kind = KIND.MASONRY;
      S.box(q[0], q[1], y1, y1 + h, w, 2.1, ang, redD, { top: cream });
      S.kind = KIND.PLAIN;
      S.box(q[0], q[1], y1 + h - 0.45, y1 + h - 0.2, w + 0.3, 2.4, ang, cream); // capital band
      S.box(q[0], q[1], y1 + 0.6, y1 + 0.75, w + 0.06, 2.16, ang, cream); // plinth band
      S.box(q[0], q[1], y1 + h, y1 + h + 0.55, w * 0.6, 1.2, ang, cream, { taper: 0.55 }); // lotus finial base
      S.cyl(q[0], q[1], y1 + h + 0.55, y1 + h + 1.05, 0.28, 0.04, 6, cream);
    }
    // the side door: a lintel wall over a 2.6 m opening, under its own small roof
    const sd = P(s * 5.65);
    S.kind = KIND.CIVIC;
    S.box(sd[0], sd[1], y1 + 2.9, y1 + 4.0, 4.7, 1.7, ang, red, { top: roof });
    S.kind = KIND.PLAIN;
    S.box(sd[0], sd[1], y1 + 2.8, y1 + 2.95, 4.7, 1.8, ang, cream);
    S.box(sd[0], sd[1], y1 + 3.85, y1 + 4.05, 4.9, 1.9, ang, cream);
    S.hip(sd[0], sd[1], 5.2, 2.0, ang, y1 + 4.05, 0.9, roof, { flare: 0.3, over: 0.5, fascia: 0.16, fasciaCol: cream, ridgeCol: ridge, hips: true });
    leaves(S, P(s * 4.35), P(s * 6.95), y1, 2.2, iron);
  }
  // the middle opening: iron leaves, the lintel with the name board, then the gate house of two roofs
  leaves(S, P(-1.8), P(1.8), y1, 2.9, iron);
  S.kind = KIND.CIVIC;
  S.box(c[0], c[1], y1 + 3.9, y1 + 6.4, 3.6, 2.0, ang, red, { top: roof });
  S.kind = KIND.PLAIN;
  S.box(c[0], c[1], y1 + 3.8, y1 + 3.95, 3.7, 2.1, ang, cream);
  for (const s of [-1, 1]) {
    const q = P(0, s * 1.03);
    S.box(q[0], q[1], y1 + 4.35, y1 + 5.75, 3.4, 0.06, ang, gold); // board frame
    const q2 = P(0, s * 1.07);
    S.box(q2[0], q2[1], y1 + 4.45, y1 + 5.65, 3.1, 0.06, ang, board); // "QUỐC HỌC"
  }
  S.box(c[0], c[1], y1 + 6.4, y1 + 6.9, 6.8, 2.6, ang, cream); // cornice over the tall piers
  pavilion(S, c[0], c[1], 6.4, 2.6, ang, y1 + 6.9, { tiers: 2, wallH: 1.5, roof, wall: red, over: 0.9, rh: 1.6, ridge });
  S.kind = KIND.PLAIN; S.base = 0;

  // after dark: lanterns on the four piers, the name board lit, a line under the upper eave (today)
  const W = [1, 1, 1], LB = new Buf(64);
  for (const s of [-1, 1]) {
    for (const [b, h] of [[2.55, 6.9], [QH_GATE_HALF - 0.8, 4.4]]) { const q = P(s * b); lamp(q[0], y1 + h + 1.3, q[1], [1, 0.84, 0.55], 4); }
    const q = P(0, s * 1.12);
    LB.box(q[0], q[1], y1 + 4.45, y1 + 5.65, 3.1, 0.04, ang, W);
    LB.beam([P(-3.6, s * 1.6)[0], y1 + 8.3, P(-3.6, s * 1.6)[1]], [P(3.6, s * 1.6)[0], y1 + 8.3, P(3.6, s * 1.6)[1]], 0.12, 0.12, W);
  }
  strips(LB, 0xffd9a0, 1.1);
}
