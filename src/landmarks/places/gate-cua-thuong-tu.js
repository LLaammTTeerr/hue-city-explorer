import { Buf, KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';

// Cửa Thượng Tứ (Đông Nam Môn 東南門), the south-east gate of the Huế Citadel (Kinh thành). Notes and sources:
// docs/places/gate-cua-thuong-tu.md.
//
// The arch was built in 1809 under Gia Long, the watch tower (vọng lâu) in 1829 under Minh Mạng. Like the other land
// gates it is a brick block in the rampart with one arched passage (vòm cuốn 3.82 m wide, 5.19 m high), a stone name
// tablet (2.31 × 1.10 m) over the arch on each face, a parapet round its flat top and on it a two-storey vọng lâu
// rising "more than 9 m above the wall top", 16-17 m in all. The gate takes Đinh Tiên Hoàng street, one way, into
// the Citadel over the moat bridge (Cầu Cửa Thượng Tứ, drawn as the shared citadel bridge, geo/citadel-bridge.js).
//
// What stands today, from street-level photos (car Street View from the bridge end and from the inner road, 2025):
// the vọng lâu is masonry, not an open timber pavilion. Its lower storey is a plastered box with three brick-framed
// arches on each long face, a moulded cornice and a short tiled eave with upturned corner ends, and a balustraded
// terrace round a small upper storey with one arch each side under a low tiled hip roof. The block's top carries a
// low balustrade of posts and pierced panels, not merlons; a stone band runs over the arch's surround, the tablet
// sits above it under the block's cornice, and the block's corners stand out as plain pilasters.
//
// Plan: the OSM outline (way 173614468, data.gates) is 18.8 m along the wall × 14.8 m through it. Its inner face is
// the mapped wall band's edge (a 9 m notch opens behind it, t -7.4 to -12.3); the band's outer face runs 1.6 m beyond
// the outline, so the block is drawn out to it and 0.3 m proud of it, as the gate blocks break forward at Huế.
// Checked against the satellite (Google, z19/z20): the outline's centre and its axis (passage bearing ~144°, rampart
// ~54°) fall on the photographed block within ~1 m and ~1°, so neither is moved.
// Local frame: s along the wall, t through it, + out of the Citadel (south-east, towards the moat).
export const id = 'gate:Cửa Thượng Tứ';

const C = [-497.9, -100.7]; // centre of the OSM outline, metres in the model frame
const A = -0.626; // direction of s (the outline's long axis, along the rampart)
const ux = Math.cos(A), uz = Math.sin(A);
const P = (s, t) => [C[0] + s * ux - t * uz, C[1] + s * uz + t * ux];
const V = (s, t, y) => { const p = P(s, t); return [p[0], y, p[1]]; };
const N = (ds, dt, dy = 0) => [ds * ux - dt * uz, dy, ds * uz + dt * ux];

const W = 18.8; // block along the wall (OSM)
const T0 = -7.45, T1 = 9.3; // inner and outer faces of the block (OSM inner face; mapped wall face at 9.0 + 0.3)
const TM = (T0 + T1) / 2, D = T1 - T0;
const HB = WALL_H + 1.85; // block top (cornice), from the photos: 3.25 m over the arch crown, 1.85 m over the wall top
const ARCH = { w: 3.82, h: 5.19 }; // sourced (tapchidongnama.vn, after Phan Thuận An)
const TAB = { w: 2.31, h: 1.1 }; // the name tablet, sourced (same)
// the vọng lâu: lower storey 10.0 × 6.6 m (width scaled from the arch in the bridge-end photo, depth from the
// satellite), upper storey 4.2 × 3.2 m (0.42 of the lower one's width in the same photo); heights fitted to the photos
// and to the sourced 16-17 m total
const TOWER = { t: 3.5, w: 8.5, d: 6.0, plinth: 0.3, wallH: 3.6, uw: 3.6, ud: 4.4, uwallH: 2.2 };

const BODY = hex('#76665a'); // lime-rendered brick gone grey-black with damp and lichen
const BODY_TOP = hex('#7d776b');
const DAMP = hex('#47443d');
const PLINTH = hex('#5a5750'); // dressed stone foot (đá thanh / laterite)
const FRAME = hex('#8f897c'); // the arch's stone surround
const DARK = hex('#1f1b19');
const TABLET = hex('#5e6466'); // đá thanh, blue-grey
const GLYPH = hex('#8d9498'); // characters cut into the stone, only a shade lighter than the field
const LIM = hex('#4a2e1f'); // the lim-wood door leaves
const PLASTER = hex('#b9b19c'); // the vọng lâu's lime render, weathered cream-grey (photos)
const PLASTER_TOP = hex('#a69f8b');
const BRICK = hex('#9c5a40'); // the bare-brick arch surrounds of the vọng lâu's openings (photos)
const TILE = hex('#8a7a66'); // weathered grey-brown tubular tiles on the vọng lâu's eaves (photos)
const RIDGE_C = hex('#9d968a');

export function build({ S, group, THREE }) {
  const Y = LAND_Y, keep = S.kind, n0 = S.n;
  const box = (s, t, y0, y1, ss, st, col, opts) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, opts); };
  const r = ARCH.w / 2, crown = Y + ARCH.h, spring = crown - r;

  // ---- the block: two piers either side of the passage, the masonry over the arch -----------------------------
  S.kind = KIND.MASONRY;
  for (const sg of [-1, 1]) {
    const s0 = r, s1 = W / 2, sw = s1 - s0;
    box(sg * (s0 + sw / 2), TM, Y - 0.5, Y + HB, sw, D, BODY, { top: BODY_TOP, topKind: KIND.ROAD });
  }
  box(0, TM, crown, Y + HB, ARCH.w + 0.02, D, BODY, { top: BODY_TOP, topKind: KIND.ROAD });
  // spandrels between the arch and its crown, both faces
  const K = 10;
  const arc = (k, rr = r) => { const th = Math.PI - (Math.PI * k) / K; return [rr * Math.cos(th), spring + rr * Math.sin(th)]; };
  for (const [t, dt] of [[T0, -1], [T1, 1]]) {
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
      S.quad(V(sa, t, ya), V(sb, t, yb), V(sb, t, crown), V(sa, t, crown), BODY, N(0, dt));
    }
  }
  // the barrel vault and the dark lining inside
  S.kind = KIND.PLAIN;
  for (let k = 0; k < K; k++) {
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    S.quad(V(sa, T0 + 0.01, ya), V(sb, T0 + 0.01, yb), V(sb, T1 - 0.01, yb), V(sa, T1 - 0.01, ya), shade(BODY, 0.42), N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
  }
  for (const sg of [-1, 1]) {
    const s = sg * (r - 0.02);
    S.quad(V(s, T0 + 0.5, Y), V(s, T1 - 0.5, Y), V(s, T1 - 0.5, spring), V(s, T0 + 0.5, spring), shade(DARK, 1.6), N(-sg, 0));
  }
  // the floor: the street runs through on stone setts
  S.kind = KIND.ROAD;
  S.quad(V(-r, T0 - 0.3, Y + 0.02), V(r, T0 - 0.3, Y + 0.02), V(r, T1 + 0.3, Y + 0.02), V(-r, T1 + 0.3, Y + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);
  // the two lim-wood leaves (iron-banded, on wheels) stand open against the passage sides, a third of the way in
  S.kind = KIND.TIMBER;
  for (const sg of [-1, 1]) {
    const tc = T1 - 4.2;
    box(sg * (r - 0.12), tc, Y + 0.05, spring + 0.6, 0.14, ARCH.w / 2 - 0.05, LIM);
    for (const yb of [Y + 0.9, Y + 2.3, Y + 3.6]) box(sg * (r - 0.2), tc, yb, yb + 0.1, 0.04, ARCH.w / 2 - 0.1, hex('#2a2624'));
  }

  // ---- each face: damp foot, stone plinth, corner pilasters, the arch's surround and the band over it, the name
  // tablet, a cornice -------------------------------------------------------------------------------------------
  S.kind = KIND.PLAIN;
  for (const [t, dt] of [[T0, -1], [T1, 1]]) {
    for (const sg of [-1, 1]) { // plinth and damp band on the pier faces
      const sw = W / 2 - r - 0.4;
      box(sg * (r + 0.4 + sw / 2), t + dt * 0.05, Y - 0.2, Y + 0.8, sw, 0.1, PLINTH);
      box(sg * (r + 0.4 + sw / 2), t + dt * 0.03, Y + 0.8, Y + 1.9, sw, 0.06, DAMP);
      // a plain pilaster at each corner of the face, standing a little proud
      box(sg * (W / 2 - 0.45), t + dt * 0.08, Y + 0.8, Y + HB - 0.35, 0.9, 0.08, shade(BODY, 1.03));
    }
    // the surround: jambs and an arched band of dressed stone standing proud
    const tt = t + dt * 0.08;
    for (const sg of [-1, 1]) box(sg * (r + 0.2), tt, Y, spring, 0.4, 0.16, FRAME);
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arc(k, r + 0.2), [sb, yb] = arc(k + 1, r + 0.2);
      S.beam(V(sa, tt, ya), V(sb, tt, yb), 0.16, 0.4, FRAME);
    }
    box(0, tt + dt * 0.03, crown + 0.05, crown + 0.45, 0.42, 0.18, shade(FRAME, 1.08)); // keystone
    // a moulded stone band right over the surround, wider than it
    box(0, t + dt * 0.1, crown + 1.05, crown + 1.4, ARCH.w + 2.6, 0.2, FRAME);
    // the tablet: a moulded frame, the blue-grey stone field and the three characters 東南門 cut and picked out
    const yt = crown + 1.65;
    box(0, t + dt * 0.1, yt - 0.12, yt + TAB.h + 0.12, TAB.w + 0.3, 0.2, FRAME);
    box(0, t + dt * 0.21, yt, yt + TAB.h, TAB.w, 0.06, TABLET);
    for (const k of [-1, 0, 1]) box(k * 0.68, t + dt * 0.25, yt + 0.24, yt + TAB.h - 0.24, 0.44, 0.03, GLYPH);
    // a projecting cornice at the top of the block
    box(0, t + dt * 0.12, Y + HB - 0.35, Y + HB, W + 0.24, 0.24, BODY_TOP);
  }
  for (const sg of [-1, 1]) box(sg * (W / 2 + 0.06), TM, Y + HB - 0.35, Y + HB, 0.12, D + 0.24, BODY_TOP);

  // ---- the balustrade round the flat top: a solid foot, square posts, pierced panels, a rail ---------------------
  const yP = Y + HB;
  const rail = (len, along, off, y0, hFoot, hTop, post) => {
    const at = (u) => (along ? [u, off] : [off, TM + u]);
    const dims = (a, b) => (along ? [a, b] : [b, a]);
    S.kind = KIND.MASONRY;
    { const [ss, st] = dims(len, 0.4); const [s, t] = at(0); box(s, t, y0, y0 + hFoot, ss, st, BODY, { top: BODY_TOP }); }
    S.kind = KIND.PLAIN;
    { const [ss, st] = dims(len - 0.2, 0.16); const [s, t] = at(0); box(s, t, y0 + hFoot, hTop - 0.12, ss, st, shade(BODY, 0.62)); } // the pierced panels, read dark
    { const [ss, st] = dims(len, 0.34); const [s, t] = at(0); box(s, t, hTop - 0.12, hTop, ss, st, BODY_TOP); }
    const n = Math.max(2, Math.round(len / post));
    for (let k = 0; k <= n; k++) {
      const u = -len / 2 + (len * k) / n, big = k === 0 || k === n;
      const [ss, st] = dims(big ? 0.5 : 0.3, big ? 0.5 : 0.3);
      const [s, t] = at(u);
      box(s, t, y0, hTop + (big ? 0.18 : 0.06), ss, st, shade(BODY, 1.05), { top: BODY_TOP });
    }
  };
  for (const [len, along, off] of [[W, true, T1 - 0.25], [W, true, T0 + 0.25], [D - 0.5, false, W / 2 - 0.25], [D - 0.5, false, -W / 2 + 0.25]]) {
    rail(len - (along ? 0 : 0.5), along, off, yP, 0.25, yP + 0.62, 1.9);
  }

  // ---- the vọng lâu: two masonry storeys, plastered, with brick-framed arches and short tiled eaves ------------
  const tw = TOWER.t;
  // an arched opening on a face: dark field, brick ring and jambs. face(u, y) → point on the face, n the outward normal
  const opening = (face, n, u0, w, yb, ys) => {
    const rr = w / 2, k = 8;
    const ring = (i, rad) => { const th = Math.PI - (Math.PI * i) / k; return [u0 + rad * Math.cos(th), ys + rad * Math.sin(th)]; };
    S.kind = KIND.PLAIN;
    S.quad(face(u0 - rr, yb, 0.02), face(u0 + rr, yb, 0.02), face(u0 + rr, ys, 0.02), face(u0 - rr, ys, 0.02), DARK, n);
    for (let i = 0; i < k; i++) {
      const [ua, ya] = ring(i, rr), [ub, yb2] = ring(i + 1, rr);
      S.tri(face(u0, ys, 0.02), face(ub, yb2, 0.02), face(ua, ya, 0.02), DARK, n);
      const [oa, yoa] = ring(i, rr + 0.25), [ob, yob] = ring(i + 1, rr + 0.25);
      S.quad(face(ua, ya, 0.05), face(oa, yoa, 0.05), face(ob, yob, 0.05), face(ub, yb2, 0.05), BRICK, n);
    }
    for (const sg of [-1, 1]) {
      const a = u0 + sg * rr, b = u0 + sg * (rr + 0.25);
      S.quad(face(Math.min(a, b), yb, 0.05), face(Math.max(a, b), yb, 0.05), face(Math.max(a, b), ys, 0.05), face(Math.min(a, b), ys, 0.05), BRICK, n);
    }
  };
  // the four faces of a storey hw × hd about (0, tw): long faces ±t, short faces ±s
  const faces = (hw, hd) => [
    ...[-1, 1].map((sg) => ({ len: 2 * hw, f: (u, y, e) => V(u, tw + sg * (hd + e), y), n: N(0, sg), long: true })),
    ...[-1, 1].map((sg) => ({ len: 2 * hd, f: (u, y, e) => V(sg * (hw + e), tw + u, y), n: N(sg, 0), long: false })),
  ];
  // a short tiled eave skirt (four sloped trapezoids) from an outer edge down at y0 to an inner edge up at y1
  const skirt = (ho, dO, hi, di, y0, y1) => {
    S.kind = KIND.TILE;
    const O = [[-ho, -dO], [ho, -dO], [ho, dO], [-ho, dO]], I = [[-hi, -di], [hi, -di], [hi, di], [-hi, di]];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, mid = [(O[i][0] + O[j][0]) / 2, (O[i][1] + O[j][1]) / 2];
      S.quad(V(O[i][0], tw + O[i][1], y0), V(O[j][0], tw + O[j][1], y0), V(I[j][0], tw + I[j][1], y1), V(I[i][0], tw + I[i][1], y1), TILE, N(Math.sign(mid[0]) * (Math.abs(mid[0]) > 0.01), Math.sign(mid[1]) * (Math.abs(mid[1]) > 0.01), 0.7));
      // the fascia under the eave edge
      S.quad(V(O[i][0], tw + O[i][1], y0 - 0.12), V(O[j][0], tw + O[j][1], y0 - 0.12), V(O[j][0], tw + O[j][1], y0), V(O[i][0], tw + O[i][1], y0), shade(TILE, 0.7), N(Math.sign(mid[0]) * (Math.abs(mid[0]) > 0.01), Math.sign(mid[1]) * (Math.abs(mid[1]) > 0.01)));
    }
    // the upturned corner ends (đầu đao), short curled hip ridges
    S.kind = KIND.PLAIN;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      S.beam(V(a * hi, tw + b * di, y1 + 0.05), V(a * (ho - 0.1), tw + b * (dO - 0.1), y0 + 0.08), 0.16, 0.16, RIDGE_C);
      S.beam(V(a * (ho - 0.1), tw + b * (dO - 0.1), y0 + 0.08), V(a * (ho + 0.15), tw + b * (dO + 0.15), y0 + 0.32), 0.12, 0.12, RIDGE_C);
    }
  };

  const L = { hw: TOWER.w / 2, hd: TOWER.d / 2 };
  const y0 = yP, yF = y0 + TOWER.plinth, yL = yF + TOWER.wallH;
  // a low plinth, then the lower storey's walls
  S.kind = KIND.PLAIN;
  box(0, tw, y0 - 0.1, yF, TOWER.w + 0.6, TOWER.d + 0.6, PLASTER_TOP, { topKind: KIND.ROAD });
  box(0, tw, yF, yL, TOWER.w, TOWER.d, PLASTER, { top: PLASTER_TOP });
  for (const fc of faces(L.hw, L.hd)) {
    if (fc.long) { // three arches: a wide one in the middle, two narrow ones
      opening(fc.f, fc.n, 0, 1.6, yF, yL - 1.1);
      for (const sg of [-1, 1]) opening(fc.f, fc.n, sg * 2.8, 1.15, yF + 0.3, yL - 1.5);
    } else opening(fc.f, fc.n, 0, 1.15, yF + 0.3, yL - 1.5);
  }
  // the moulded cornice, the eave skirt and the terrace it rises to
  S.kind = KIND.PLAIN;
  box(0, tw, yL, yL + 0.3, TOWER.w + 0.3, TOWER.d + 0.3, PLASTER_TOP);
  box(0, tw, yL + 0.3, yL + 0.6, TOWER.w + 0.55, TOWER.d + 0.55, PLASTER);
  const yE = yL + 0.6, yT = yE + 0.3;
  skirt(L.hw + 0.6, L.hd + 0.6, L.hw - 0.25, L.hd - 0.25, yE, yT);
  S.kind = KIND.PLAIN;
  box(0, tw, yE, yT, TOWER.w - 0.5, TOWER.d - 0.5, PLASTER, { top: PLASTER_TOP, topKind: KIND.ROAD });
  // the terrace's balustrade
  const tb = (len, along, off) => {
    S.kind = KIND.PLAIN;
    if (along) box(0, tw + off, yT, yT + 0.55, len, 0.18, PLASTER, { top: PLASTER_TOP });
    else box(off, tw, yT, yT + 0.55, 0.18, len, PLASTER, { top: PLASTER_TOP });
  };
  tb(TOWER.w - 0.7, true, L.hd - 0.35); tb(TOWER.w - 0.7, true, -(L.hd - 0.35));
  tb(TOWER.d - 0.88, false, L.hw - 0.35); tb(TOWER.d - 0.88, false, -(L.hw - 0.35));
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(a * (L.hw - 0.35), tw + b * (L.hd - 0.35), yT, yT + 0.75, 0.32, 0.32, PLASTER_TOP);

  // the upper storey: a small plastered room, an arch on each side, a cornice and a low tiled hip roof
  const U = { hw: TOWER.uw / 2, hd: TOWER.ud / 2 }, yU = yT + TOWER.uwallH;
  S.kind = KIND.PLAIN;
  box(0, tw, yT, yU, TOWER.uw, TOWER.ud, PLASTER, { top: PLASTER_TOP });
  for (const fc of faces(U.hw, U.hd)) opening(fc.f, fc.n, 0, fc.long ? 1.0 : 0.8, yT + 0.5, yT + 1.3);
  box(0, tw, yU, yU + 0.2, TOWER.uw + 0.35, TOWER.ud + 0.35, PLASTER_TOP);
  const tc = P(0, tw);
  S.hip(tc[0], tc[1], TOWER.uw + 0.35, TOWER.ud + 0.35, A, yU + 0.2, 0.75, TILE, { over: 0.4, flare: 0.08, hips: false, ridgeCol: RIDGE_C, fascia: 0.1, segs: 3 });
  const top = yU + 0.2 + 0.75;
  // a gourd (hồ lô) and a short rod on the middle of the ridge
  S.kind = KIND.PLAIN;
  S.cyl(tc[0], tc[1], top - 0.1, top + 0.12, 0.14, 0.22, 8, RIDGE_C, { cap: false });
  S.cyl(tc[0], tc[1], top + 0.12, top + 0.32, 0.22, 0.1, 8, RIDGE_C, { cap: false });
  S.cyl(tc[0], tc[1], top + 0.32, top + 0.45, 0.1, 0.03, 8, RIDGE_C);
  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = keep;

  // ---- night: the lower eave lit all round, a lantern at each mouth of the passage ----------------------------
  if (group) {
    const Lb = new Buf(200);
    const y = yE - 0.2, hu = L.hw + 0.35, hv = L.hd + 0.35;
    const Q = (u, v) => V(u, tw + v, y);
    for (const sg of [-1, 1]) { Lb.beam(Q(-hu, sg * hv), Q(hu, sg * hv), 0.14, 0.1, [1, 1, 1]); Lb.beam(Q(sg * hu, -hv), Q(sg * hu, hv), 0.14, 0.1, [1, 1, 1]); }
    const m = new THREE.Mesh(Lb.geometry(), lightMaterial(0xffae42, 1.2));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
    const lamps = [], col = [];
    for (const t of [T0 - 1.2, T1 + 1.2]) { const p = P(0, t); lamps.push(p[0], Y + 2.6, p[1]); col.push(1.0, 0.72, 0.34); }
    const g = glowPoints(lamps, col, 7);
    g.userData.glow = true;
    g.userData.landmark = id;
    group.add(g);
  }
}
