import { Buf, KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';
import { pavilion } from '../citadel.js';

// Cửa Thượng Tứ (Đông Nam Môn 東南門), the south-east gate of the Huế Citadel (Kinh thành). Notes and sources:
// docs/places/gate-cua-thuong-tu.md.
//
// The arch was built in 1809 under Gia Long, the watch tower (vọng lâu) in 1829 under Minh Mạng. Like the other land
// gates it is a brick block in the rampart with one arched passage (vòm cuốn 3.82 m wide, 5.19 m high), a stone name
// tablet (2.31 × 1.10 m) over the arch on each face, a crenellated parapet round its flat top and on it a two-storey
// timber vọng lâu under tubular tiles, rising "more than 9 m above the wall top", 16-17 m in all. The gate takes
// Đinh Tiên Hoàng street, one way, into the Citadel over the moat bridge (drawn by bridges.js as Cầu Cửa Thượng Tứ).
//
// Plan: the OSM outline (way 173614468, data.gates) is 18.8 m along the wall × 14.8 m through it. Its inner face is
// the mapped wall band's edge (a 9 m notch opens behind it, t -7.4 to -12.3); the band's outer face runs 1.6 m beyond
// the outline, so the block is drawn out to it and 0.3 m proud of it, as the gate blocks break forward at Huế.
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
const HB = WALL_H + 0.4; // block top, a little above the wall walk (estimate)
const ARCH = { w: 3.82, h: 5.19 }; // sourced (tapchidongnama.vn, after Phan Thuận An)
const TAB = { w: 2.31, h: 1.1 }; // the name tablet, sourced (same)
const TOWER = { w: 11.4, d: 7.4, t: 0.3 }; // the vọng lâu's column line and where it stands (estimate from photos)

const BODY = hex('#6c675d'); // lime-rendered brick gone grey-black with damp and lichen
const BODY_TOP = hex('#7d776b');
const DAMP = hex('#47443d');
const PLINTH = hex('#5a5750'); // dressed stone foot (đá thanh / laterite)
const FRAME = hex('#8f897c'); // the arch's stone surround
const DARK = hex('#1f1b19');
const TABLET = hex('#5e6466'); // đá thanh, blue-grey
const GLYPH = hex('#d9cfae');
const ROOF = hex('#c9962f'); // weathered yellow tubular tiles (estimate from photos)
const RIDGE_C = hex('#e3c46a');
const LIM = hex('#4a2e1f'); // the lim-wood door leaves

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

  // ---- each face: damp foot, stone plinth, the arch's surround, the name tablet, a cornice ---------------------
  S.kind = KIND.PLAIN;
  for (const [t, dt] of [[T0, -1], [T1, 1]]) {
    for (const sg of [-1, 1]) { // plinth and damp band on the pier faces
      const sw = W / 2 - r - 0.4;
      box(sg * (r + 0.4 + sw / 2), t + dt * 0.05, Y - 0.2, Y + 0.8, sw, 0.1, PLINTH);
      box(sg * (r + 0.4 + sw / 2), t + dt * 0.03, Y + 0.8, Y + 1.9, sw, 0.06, DAMP);
    }
    // the surround: jambs and an arched band of dressed stone standing proud
    const tt = t + dt * 0.08;
    for (const sg of [-1, 1]) box(sg * (r + 0.2), tt, Y, spring, 0.4, 0.16, FRAME);
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arc(k, r + 0.2), [sb, yb] = arc(k + 1, r + 0.2);
      S.beam(V(sa, tt, ya), V(sb, tt, yb), 0.16, 0.4, FRAME);
    }
    box(0, tt + dt * 0.03, crown + 0.05, crown + 0.5, 0.42, 0.18, shade(FRAME, 1.08)); // keystone
    // the tablet: a moulded frame, the blue-grey stone field and the three characters 東南門 cut and picked out
    const yt = crown + 0.5;
    box(0, t + dt * 0.1, yt - 0.12, yt + TAB.h + 0.12, TAB.w + 0.3, 0.2, FRAME);
    box(0, t + dt * 0.21, yt, yt + TAB.h, TAB.w, 0.06, TABLET);
    for (const k of [-1, 0, 1]) box(k * 0.68, t + dt * 0.25, yt + 0.24, yt + TAB.h - 0.24, 0.44, 0.03, GLYPH);
    // a projecting cornice at the top of the block
    box(0, t + dt * 0.12, Y + HB - 0.35, Y + HB, W + 0.24, 0.24, BODY_TOP);
  }
  for (const sg of [-1, 1]) box(sg * (W / 2 + 0.06), TM, Y + HB - 0.35, Y + HB, 0.12, D + 0.24, BODY_TOP);

  // ---- the crenellated parapet (lỗ châu mai) round the flat top ------------------------------------------------
  S.kind = KIND.MASONRY;
  const yP = Y + HB;
  const sides = [[W, true, T1 - 0.3], [W, true, T0 + 0.3], [D, false, W / 2 - 0.3], [D, false, -W / 2 + 0.3]];
  for (const [len, along, off] of sides) {
    // a solid breast-high base, then merlons with the embrasures between them
    if (along) box(0, off, yP, yP + 0.75, len, 0.6, BODY, { top: BODY_TOP });
    else box(off, TM, yP, yP + 0.75, 0.6, len - 1.2, BODY, { top: BODY_TOP });
    const n = Math.max(3, Math.round(len / 1.5) | 1);
    for (let k = 0; k < n; k += 2) {
      const u = -len / 2 + (len * (k + 0.5)) / n;
      if (along) box(u, off, yP + 0.75, yP + 1.35, len / n, 0.6, shade(BODY, 1.05), { top: BODY_TOP });
      else box(off, TM + u, yP + 0.75, yP + 1.35, 0.6, len / n, shade(BODY, 1.05), { top: BODY_TOP });
    }
  }

  // ---- the vọng lâu: two storeys of red-lacquered timber under two tiers of yellow tubular tiles --------------
  const tc = P(0, TOWER.t), eaves = [];
  const top = pavilion(S, tc[0], tc[1], TOWER.w, TOWER.d, A, yP, {
    tiers: 2, wallH: 3.3, rh: 2.8, platform: 0.25, roof: ROOF, ridge: RIDGE_C, wall: PAL.lacquer, over: 1.3, colonnade: true, eaves,
  });
  // a gourd (hồ lô) on the middle of the top ridge
  S.kind = KIND.PLAIN;
  S.cyl(tc[0], tc[1], top - 0.15, top + 0.12, 0.16, 0.24, 8, RIDGE_C, { cap: false });
  S.cyl(tc[0], tc[1], top + 0.12, top + 0.38, 0.24, 0.12, 8, RIDGE_C, { cap: false });
  S.cyl(tc[0], tc[1], top + 0.38, top + 0.58, 0.16, 0.03, 8, RIDGE_C);
  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = keep;

  // ---- night: the lower eave lit all round, a lantern at each mouth of the passage ----------------------------
  if (group) {
    const L = new Buf(200);
    const e = eaves[0];
    if (e) {
      const y = e.y - e.fascia - 0.07, hu = e.w / 2 + e.over - 0.3, hv = e.d / 2 + e.over - 0.3;
      const Q = (u, v) => { const p = P(u, TOWER.t + v); return [p[0], y, p[1]]; };
      for (const sg of [-1, 1]) { L.beam(Q(-hu, sg * hv), Q(hu, sg * hv), 0.14, 0.1, [1, 1, 1]); L.beam(Q(sg * hu, -hv), Q(sg * hu, hv), 0.14, 0.1, [1, 1, 1]); }
      const m = new THREE.Mesh(L.geometry(), lightMaterial(0xffae42, 1.2));
      m.renderOrder = 19;
      m.userData.landmark = id;
      group.add(m);
    }
    const lamps = [], col = [];
    for (const t of [T0 - 1.2, T1 + 1.2]) { const p = P(0, t); lamps.push(p[0], Y + 2.6, p[1]); col.push(1.0, 0.72, 0.34); }
    const g = glowPoints(lamps, col, 7);
    g.userData.glow = true;
    g.userData.landmark = id;
    group.add(g);
  }
}
