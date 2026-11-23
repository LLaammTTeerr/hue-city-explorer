import { Buf, KIND, hex, mix, shade } from '../../geo/buf.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';

// Cửa Thượng Tứ (Đông Nam Môn 東南門), the south-east gate of the Huế Citadel (Kinh thành). Notes and sources:
// docs/places/gate-cua-thuong-tu.md.
//
// The arch was built in 1809 under Gia Long, the watch tower (vọng lâu) in 1829 under Minh Mạng. Like the other land
// gates it is a brick block in the rampart with one arched passage (vòm cuốn 3.82 m wide, 5.19 m high), a stone name
// tablet (2.31 × 1.10 m) over the arch on the outer face, a parapet round its flat top and on it a two-storey vọng
// lâu rising "more than 9 m above the wall top", 16-17 m in all. The gate takes Đinh Tiên Hoàng street, one way, into
// the Citadel over the moat bridge (Cầu Cửa Thượng Tứ, drawn as the shared citadel bridge, geo/citadel-bridge.js).
//
// What stands today, from street-level photos (car Street View from the bridge end and from the inner road, 2025):
// the vọng lâu is masonry, not an open timber pavilion. Its lower storey is a plastered, near-square box with three
// brick-framed arches on each face, a heavy moulded cornice under a short tiled eave with upturned corner horns, and
// a balustraded terrace round a small upper storey (a brick panel and one arch each side) under a tiled hip roof with
// horns. The block's top carries a low balustrade of posts and pierced panels on the moat side, not merlons, and a
// solid parapet under a heavy coping on the inner side. The outer face: a stone
// band over the arch's surround, the tablet above it, battered corner pilasters rising through the cornice to moulded
// caps. The inner face has no tablet: the passage opens into a wider, deeper red-brick arched recess, and the notch
// it faces is closed by wing walls ending in big piers with moulded caps. Both faces are fine red-brown brick
// patched with grey lime plaster (drawn as vertex-coloured patches, not the shared 1.45 m brick pattern).
//
// Plan: the OSM outline (way 173614468, data.gates) is 18.8 m along the wall × 14.8 m through it. Its inner face is
// the mapped wall band's edge (a 9 m notch, s -5.0 to 4.0, opens behind it, t -7.4 to -12.3); the band's outer face
// runs 1.6 m beyond the outline, so the block is drawn out to it and 0.3 m proud of it, as the gate blocks break
// forward at Huế. Checked against the satellite (Google, z19/z20): the outline's centre and its axis (passage bearing
// ~144°, rampart ~54°) fall on the photographed block within ~1 m and ~1°, so neither is moved. The vọng lâu's tiled
// roof sits on the middle of the block top, a little to the inner side, with an open terrace of ~4-5 m on the moat
// side; its eaves span ~11.5 m along the wall.
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
const NOTCH = { s0: -5.0, s1: 4.0, t: -12.3 }; // the mapped wall band's notch behind the inner face (data.wall)
const HB = WALL_H + 1.85; // block top (cornice), from the photos: 3.25 m over the arch crown, 1.85 m over the wall top
const ARCH = { w: 3.82, h: 5.19 }; // sourced (tapchidongnama.vn, after Phan Thuận An)
const TAB = { w: 2.31, h: 1.1 }; // the name tablet, sourced (same)
// the inner recess: ~5.6 m wide (0.63 of the 9 m of face the notch shows, inner-road photo), 3 m deep, springing
// with the passage
const REC = { r: 2.8, d: 3.0 };
// the vọng lâu (estimated): lower storey 10.4 × 8.0 m, eaves ~11.9 × 9.5 m (satellite roof ~11-12 m across; 0.43 of
// the block's width in the bridge-end photo); upper storey 4.6 × 4.3 m (0.44 of the lower one's width in the same
// photo). Centred at t +1.0, on the outline's middle line (+0.9): the satellite puts the roof a little inside it, the
// two car panoramas' width ratios (tower against block face / notch) a little outside (lower storey ~t -1.5 to +5.4),
// so it is set between them. Heights: the lower storey's wall 4.2 m (2.5 m of it shows over the outer balustrade
// from the bridge end, the arch rings' tops 0.56 and 1.0 m under the cornice), the rest fitted to the photos and to
// the sourced 16-17 m total
const TOWER = { t: 1.0, w: 10.4, d: 8.0, plinth: 0.2, wallH: 4.2, uw: 4.6, ud: 4.3, uwallH: 2.0 };

const BRICK_B = hex('#584a43'); // the block's fine red-brown brick, darkened with damp
const LIME = hex('#86827a'); // grey lime-plaster patches over it
const BRICK_IN = hex('#6b4136'); // the inner recess and face: redder brick
const BODY = hex('#76665a'); // hidden or end faces of the block
const BODY_TOP = hex('#7d776b');
const PLINTH = hex('#5a5750'); // dressed stone foot (đá thanh / laterite)
const FRAME = hex('#8f897c'); // the arch's stone surround
const DARK = hex('#1f1b19');
const TABLET = hex('#4d5351'); // đá thanh, blue-grey, weathered dark
const GLYPH = hex('#464c4a'); // characters cut into the stone: a shade darker than the field, not picked out
const LIM = hex('#4a2e1f'); // the lim-wood door leaves
const PLASTER = hex('#b9b19c'); // the vọng lâu's lime render, weathered cream-grey (photos)
const PLASTER_TOP = hex('#a69f8b');
const BRICK = hex('#9c5a40'); // the bare-brick arch surrounds of the vọng lâu's openings (photos)
const UBRICK = hex('#8f604c'); // the upper storey's brick panels
const TILE = hex('#8a7462'); // weathered grey-brown tubular tiles (photos)
const TILE_EDGE = hex('#a0664a'); // the orange-brown tile ends along the eaves
const RIDGE_C = hex('#9d968a');

// value noise for the plaster patches
const hash = (i, j) => { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); };
const vnoise = (x, y) => {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

export function build({ S, group, THREE }) {
  const Y = LAND_Y, keep = S.kind, n0 = S.n;
  const box = (s, t, y0, y1, ss, st, col, opts) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, opts); };
  const r = ARCH.w / 2, crown = Y + ARCH.h, spring = crown - r;
  const rR = REC.r, cR = spring + rR, TR = T0 + REC.d;
  const yTop = Y + HB;

  // a flat triangle with per-vertex colours, wound to face n
  const triC = (a, b, c, ca, cb, cc, n) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const g = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (g[0] * n[0] + g[1] * n[1] + g[2] * n[2] < 0) S.smoothTri([a, c, b], [n, n, n], [ca, cc, cb]);
    else S.smoothTri([a, b, c], [n, n, n], [ca, cb, cc]);
  };
  // brick patched with lime plaster, darker at the foot, streaked
  const palette = (brick, seed, lime = 0.5) => (s, y) => {
    const h = y - Y;
    const f = 0.65 * vnoise(s * 0.3 + seed, h * 0.38 + seed * 0.7) + 0.35 * vnoise(s * 0.8 + 11 + seed, h * 0.9 + 3);
    let c = mix(brick, LIME, smooth(lime, lime + 0.12, f) * 0.95);
    c = shade(c, (0.82 + 0.3 * vnoise(s * 1.4 + seed, h * 0.12)) * (0.72 + 0.28 * smooth(0.6, 2.2, h)));
    return c;
  };
  const OUT = palette(BRICK_B, 3.1, 0.36), INN = palette(BRICK_IN, 7.7, 0.52);
  // a face skin: a grid of vertex-coloured cells on the face t, facing dt, over s0..s1 × y0..y1
  const skin = (t, dt, s0, s1, y0, y1, pal) => {
    const n = N(0, dt), nu = Math.max(1, Math.ceil((s1 - s0) / 0.55)), nv = Math.max(1, Math.ceil((y1 - y0) / 0.55));
    S.kind = KIND.PLAIN;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const sa = s0 + ((s1 - s0) * i) / nu, sb = s0 + ((s1 - s0) * (i + 1)) / nu;
      const ya = y0 + ((y1 - y0) * j) / nv, yb = y0 + ((y1 - y0) * (j + 1)) / nv;
      const a = V(sa, t, ya), b = V(sb, t, ya), c = V(sb, t, yb), d = V(sa, t, yb);
      const ca = pal(sa, ya), cb = pal(sb, ya), cc = pal(sb, yb), cd = pal(sa, yb);
      triC(a, b, c, ca, cb, cc, n); triC(a, c, d, ca, cc, cd, n);
    }
  };
  // the skin round an arched opening of radius ro (its ring ro..ro+0.4 drawn separately): piers, the masonry over it
  // and the two spandrels
  const K = 10;
  const arcAt = (k, rr) => { const th = Math.PI - (Math.PI * k) / K; return [rr * Math.cos(th), spring + rr * Math.sin(th)]; };
  const faceSkin = (t, dt, ro, sMin, sMax, pal) => {
    const ri = ro + 0.4, top = spring + ri;
    skin(t, dt, sMin, -ri, Y, yTop, pal);
    skin(t, dt, ri, sMax, Y, yTop, pal);
    skin(t, dt, -ri, ri, top, yTop, pal);
    const n = N(0, dt);
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arcAt(k, ri), [sb, yb] = arcAt(k + 1, ri);
      const a = V(sa, t, ya), b = V(sb, t, yb), c = V(sb, t, top), d = V(sa, t, top);
      triC(a, b, c, pal(sa, ya), pal(sb, yb), pal(sb, top), n); triC(a, c, d, pal(sa, ya), pal(sb, top), pal(sa, top), n);
    }
    for (const sg of [-1, 1]) { const s0 = sg < 0 ? -ri : ro, s1 = sg < 0 ? -ro : ri; skin(t, dt, s0, s1, Y, spring, pal); }
  };

  // ---- the block: masonry boxes set 5 cm behind the two faces, which are skinned; above the recess's crown one
  // slab, below it the inner segment (opening rR, t T0..TR) and the passage segment (opening r, TR..T1) -----------
  S.kind = KIND.MASONRY;
  const tI = T0 + 0.05, tO = T1 - 0.05;
  box(0, (tI + tO) / 2, cR, yTop, W, tO - tI, BODY, { top: BODY_TOP, topKind: KIND.ROAD });
  for (const sg of [-1, 1]) {
    box(sg * (rR + (W / 2 - rR) / 2), (tI + TR) / 2, Y - 0.5, cR, W / 2 - rR, TR - tI, BODY);
    box(sg * (r + (W / 2 - r) / 2), (TR + 0.04 + tO) / 2, Y - 0.5, cR, W / 2 - r, tO - TR - 0.04, BODY);
  }
  box(0, (TR + 0.04 + tO) / 2, crown, cR, ARCH.w + 0.02, tO - TR - 0.04, BODY);
  // the face skins: outer face whole, inner face where the notch shows it
  faceSkin(T1, 1, r, -W / 2, W / 2, OUT);
  faceSkin(T0, -1, rR, NOTCH.s0 - 0.4, NOTCH.s1 + 0.4, INN);
  // the recess's back wall round the passage mouth (facing in), red brick
  S.kind = KIND.PLAIN;
  for (let k = 0; k < K; k++) {
    const [sa, ya] = arcAt(k, r), [sb, yb] = arcAt(k + 1, r), [oa, yoa] = arcAt(k, rR), [ob, yob] = arcAt(k + 1, rR);
    S.quad(V(sa, TR, ya), V(sb, TR, yb), V(ob, TR, yob), V(oa, TR, yoa), shade(BRICK_IN, 0.8), N(0, -1));
  }
  for (const sg of [-1, 1]) S.quad(V(sg * r, TR, Y), V(sg * rR, TR, Y), V(sg * rR, TR, spring), V(sg * r, TR, spring), shade(BRICK_IN, 0.8), N(0, -1));
  // the barrel vaults and their sides: the recess in red brick, the passage dark
  const vault = (ro, ta, tb, col, side) => {
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arcAt(k, ro), [sb, yb] = arcAt(k + 1, ro);
      S.quad(V(sa, ta, ya), V(sb, ta, yb), V(sb, tb, yb), V(sa, tb, ya), col, N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
    }
    for (const sg of [-1, 1]) {
      const s = sg * (ro - 0.02);
      S.quad(V(s, ta, Y), V(s, tb, Y), V(s, tb, spring), V(s, ta, spring), side, N(-sg, 0));
    }
  };
  vault(rR, T0 + 0.01, TR, shade(BRICK_IN, 0.7), shade(BRICK_IN, 0.62));
  vault(r, TR, T1 - 0.01, shade(BODY, 0.42), shade(DARK, 1.6));
  // the floor: the street runs through on stone setts
  S.kind = KIND.ROAD;
  S.quad(V(-rR, T0 - 0.3, Y + 0.02), V(rR, T0 - 0.3, Y + 0.02), V(rR, TR, Y + 0.02), V(-rR, TR, Y + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.quad(V(-r, TR, Y + 0.02), V(r, TR, Y + 0.02), V(r, T1 + 0.3, Y + 0.02), V(-r, T1 + 0.3, Y + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);
  // the two lim-wood leaves (iron-banded, on wheels) stand open against the passage sides, a third of the way in
  S.kind = KIND.TIMBER;
  for (const sg of [-1, 1]) {
    const tc = T1 - 4.2;
    box(sg * (r - 0.12), tc, Y + 0.05, spring + 0.6, 0.14, ARCH.w / 2 - 0.05, LIM);
    for (const yb of [Y + 0.9, Y + 2.3, Y + 3.6]) box(sg * (r - 0.2), tc, yb, yb + 0.1, 0.04, ARCH.w / 2 - 0.1, hex('#2a2624'));
  }

  // ---- the arch rings: dressed stone on the outer face, brick round the inner recess ------------------------------
  S.kind = KIND.PLAIN;
  const ring = (t, dt, ro, col) => {
    const tt = t + dt * 0.08;
    for (const sg of [-1, 1]) box(sg * (ro + 0.2), tt, Y, spring, 0.4, 0.16, col);
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arcAt(k, ro + 0.2), [sb, yb] = arcAt(k + 1, ro + 0.2);
      S.beam(V(sa, tt, ya), V(sb, tt, yb), 0.16, 0.4, col);
    }
  };
  ring(T1, 1, r, FRAME);
  ring(T0, -1, rR, shade(BRICK_IN, 1.12));

  // ---- the outer face: stone plinth, battered corner pilasters through the cornice to moulded caps, keystone, the
  // stone band, the name tablet, a cornice -------------------------------------------------------------------------
  {
    const t = T1, dt = 1;
    for (const sg of [-1, 1]) {
      const sw = W / 2 - r - 0.4;
      box(sg * (r + 0.4 + sw / 2), t + dt * 0.05, Y - 0.2, Y + 0.8, sw, 0.1, PLINTH);
    }
    box(0, t + dt * 0.11, crown + 0.05, crown + 0.45, 0.42, 0.18, shade(FRAME, 1.08)); // keystone
    box(0, t + dt * 0.1, crown + 1.05, crown + 1.4, ARCH.w + 2.6, 0.2, FRAME); // a moulded band over the surround
    // the tablet: a moulded frame round a dark stone field, its three characters 東南門 cut in, not picked out
    const yt = crown + 1.65;
    box(0, t + dt * 0.1, yt - 0.12, yt + TAB.h + 0.12, TAB.w + 0.3, 0.2, shade(FRAME, 0.92));
    box(0, t + dt * 0.21, yt, yt + TAB.h, TAB.w, 0.06, TABLET);
    // three columns of small cut characters, not three panes
    for (const k of [-1, 0, 1]) for (let r = 0; r < 3; r++) {
      const yc = yt + 0.28 + r * ((TAB.h - 0.56) / 3);
      box(k * 0.68, t + dt * 0.245, yc, yc + (TAB.h - 0.56) / 3 - 0.09, 0.3, 0.01, GLYPH);
    }
    box(0, t + dt * 0.12, yTop - 0.35, yTop, W + 0.24, 0.24, BODY_TOP); // the cornice
  }
  for (const sg of [-1, 1]) box(sg * (W / 2 + 0.06), TM, yTop - 0.35, yTop, 0.12, D + 0.24, BODY_TOP);
  // the inner face: a plain stone foot, a moulded band under the cornice
  box(0, T0 - 0.05, Y - 0.2, Y + 0.6, NOTCH.s1 - NOTCH.s0 + 0.8, 0.1, PLINTH);
  box(0, T0 - 0.12, yTop - 0.35, yTop, W + 0.24, 0.24, BODY_TOP);
  box(0, T0 - 0.08, yTop - 1.3, yTop - 1.1, NOTCH.s1 - NOTCH.s0 + 0.8, 0.16, shade(BRICK_IN, 1.05));

  // ---- the balustrade round the flat top: a solid foot, square posts, pierced panels, a rail ---------------------
  const yP = yTop;
  const rail = (len, along, off, y0, hFoot, hTop, post, ends = true) => {
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
      if (big && !ends) continue;
      const [ss, st] = dims(big ? 0.5 : 0.3, big ? 0.5 : 0.3);
      const [s, t] = at(u);
      box(s, t, y0, hTop + (big ? 0.18 : 0.06), ss, st, shade(BODY, 1.05), { top: BODY_TOP });
    }
  };
  rail(W - 1.6, true, T1 - 0.25, yP, 0.25, yP + 0.62, 1.9, false); // between the outer pilaster caps
  // the inner edge: a solid parapet under a heavy coping (inner-road photo), no pierced panels
  S.kind = KIND.MASONRY;
  box(0, T0 + 0.25, yP, yP + 0.62, W, 0.45, BODY, { top: BODY_TOP });
  box(0, T0 + 0.22, yP + 0.62, yP + 0.8, W + 0.1, 0.6, BODY_TOP);
  for (const sg of [-1, 1]) rail(D - 1.0, false, sg * (W / 2 - 0.25), yP, 0.25, yP + 0.62, 1.9);
  // the outer corner pilasters: battered (1.3 m wide and 0.35 m proud at the foot, narrowing upward), rising through
  // the cornice to a moulded cap over the balustrade
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    const s = sg * (W / 2 - 0.65), PIL = shade(mix(BRICK_B, LIME, 0.45), 1.0);
    box(s, T1, Y - 0.2, yP + 0.55, 1.3, 0.8, PIL, { taper: 0.74 });
    box(s, T1 - 0.2, yP + 0.55, yP + 0.72, 1.15, 0.85, BODY_TOP);
    box(s, T1 - 0.2, yP + 0.72, yP + 1.05, 0.8, 0.6, PIL);
    box(s, T1 - 0.2, yP + 1.05, yP + 1.2, 1.05, 0.8, BODY_TOP);
  }

  // ---- the wing walls' piers at the mouth of the notch behind the inner face: big, rendered, moulded caps ----------
  for (const [sEdge, sg] of [[NOTCH.s0, -1], [NOTCH.s1, 1]]) {
    const sw = 1.7, tl = 2.4, s = sEdge + sg * (sw / 2 - 0.25), t = NOTCH.t - 0.3 + tl / 2, yw = Y + WALL_H;
    const PIER = mix(BRICK_B, LIME, 0.55);
    S.kind = KIND.PLAIN;
    box(s, t, Y - 0.3, yw + 0.35, sw, tl, PIER, { top: BODY_TOP });
    box(s, t, yw + 0.35, yw + 0.6, sw + 0.35, tl + 0.35, BODY_TOP);
    box(s, t, yw + 0.6, yw + 1.25, sw - 0.3, tl - 0.4, shade(PIER, 0.95));
    box(s, t, yw + 1.25, yw + 1.45, sw - 0.05, tl - 0.15, BODY_TOP);
    box(s, t, yw + 1.45, yw + 1.7, sw - 0.6, tl - 0.8, BODY_TOP, { taper: 0.5 });
  }

  // ---- the vọng lâu: two masonry storeys, plastered, with brick-framed arches and short tiled eaves ------------
  const tw = TOWER.t;
  // an arched opening on a face: dark field, brick ring and jambs. face(u, y) → point on the face, n the outward normal
  const opening = (face, n, u0, w, yb, ys) => {
    const rr = w / 2, k = 8;
    const rg = (i, rad) => { const th = Math.PI - (Math.PI * i) / k; return [u0 + rad * Math.cos(th), ys + rad * Math.sin(th)]; };
    S.kind = KIND.PLAIN;
    S.quad(face(u0 - rr, yb, 0.02), face(u0 + rr, yb, 0.02), face(u0 + rr, ys, 0.02), face(u0 - rr, ys, 0.02), DARK, n);
    for (let i = 0; i < k; i++) {
      const [ua, ya] = rg(i, rr), [ub, yb2] = rg(i + 1, rr);
      S.tri(face(u0, ys, 0.02), face(ub, yb2, 0.02), face(ua, ya, 0.02), DARK, n);
      const [oa, yoa] = rg(i, rr + 0.3), [ob, yob] = rg(i + 1, rr + 0.3);
      S.quad(face(ua, ya, 0.05), face(oa, yoa, 0.05), face(ob, yob, 0.05), face(ub, yb2, 0.05), BRICK, n);
    }
    for (const sg of [-1, 1]) {
      const a = u0 + sg * rr, b = u0 + sg * (rr + 0.3);
      S.quad(face(Math.min(a, b), yb, 0.05), face(Math.max(a, b), yb, 0.05), face(Math.max(a, b), ys, 0.05), face(Math.min(a, b), ys, 0.05), BRICK, n);
    }
  };
  // the four faces of a storey hw × hd about (0, tw): long faces ±t, short faces ±s
  const faces = (hw, hd) => [
    ...[-1, 1].map((sg) => ({ len: 2 * hw, f: (u, y, e) => V(u, tw + sg * (hd + e), y), n: N(0, sg), long: true })),
    ...[-1, 1].map((sg) => ({ len: 2 * hd, f: (u, y, e) => V(sg * (hw + e), tw + u, y), n: N(sg, 0), long: false })),
  ];
  // a short tiled eave skirt from an outer edge at y0 (its corners curving up by lift) to an inner edge up at y1: tile
  // slopes, an orange-brown course of tile ends along the edge, a dark soffit under it, and đầu đao horns at the corners
  const skirt = (ho, dO, hi, di, y0, y1, lift, under) => {
    const O = [[-ho, -dO], [ho, -dO], [ho, dO], [-ho, dO]], I = [[-hi, -di], [hi, -di], [hi, di], [-hi, di]];
    const Ub = [[-under[0], -under[1]], [under[0], -under[1]], [under[0], under[1]], [-under[0], under[1]]];
    const L = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const nS = 8;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, mid = L(O[i], O[j], 0.5);
      const hn = [Math.sign(mid[0]) * (Math.abs(mid[0]) > 0.01), Math.sign(mid[1]) * (Math.abs(mid[1]) > 0.01)];
      const nUp = N(hn[0], hn[1], 1.2), nOut = N(hn[0], hn[1]);
      for (let k = 0; k < nS; k++) {
        const ka = k / nS, kb = (k + 1) / nS, la = lift * Math.abs(2 * ka - 1) ** 3, lb = lift * Math.abs(2 * kb - 1) ** 3;
        const oa = L(O[i], O[j], ka), ob = L(O[i], O[j], kb), ia = L(I[i], I[j], ka), ib = L(I[i], I[j], kb);
        const ua = L(Ub[i], Ub[j], ka), ub = L(Ub[i], Ub[j], kb);
        S.kind = KIND.TILE;
        S.quad(V(oa[0], tw + oa[1], y0 + la), V(ob[0], tw + ob[1], y0 + lb), V(ib[0], tw + ib[1], y1), V(ia[0], tw + ia[1], y1), TILE, nUp);
        S.kind = KIND.PLAIN;
        // the tile-end course: a thick orange-brown edge
        S.quad(V(oa[0], tw + oa[1], y0 + la - 0.2), V(ob[0], tw + ob[1], y0 + lb - 0.2), V(ob[0], tw + ob[1], y0 + lb + 0.06), V(oa[0], tw + oa[1], y0 + la + 0.06), TILE_EDGE, nOut);
        // the soffit back to the cornice
        S.quad(V(oa[0], tw + oa[1], y0 + la - 0.2), V(ob[0], tw + ob[1], y0 + lb - 0.2), V(ub[0], tw + ub[1], y0 - 0.12), V(ua[0], tw + ua[1], y0 - 0.12), shade(TILE, 0.5), [0, -1, 0]);
      }
    }
    // the hip ridges and the upturned corner horns (đầu đao)
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const e = V(a * (ho - 0.05), tw + b * (dO - 0.05), y0 + lift + 0.1);
      S.beam(V(a * hi, tw + b * di, y1 + 0.06), e, 0.2, 0.18, RIDGE_C);
      const dx = a * 0.7071, dz = b * 0.7071;
      const m = V(a * (ho - 0.05) + dx * 0.3, tw + b * (dO - 0.05) + dz * 0.3, y0 + lift + 0.22);
      const tip = V(a * (ho - 0.05) + dx * 0.32, tw + b * (dO - 0.05) + dz * 0.32, y0 + lift + 0.45);
      S.beam(e, m, 0.18, 0.18, RIDGE_C);
      S.beam(m, tip, 0.13, 0.13, RIDGE_C);
    }
  };

  const Lw = { hw: TOWER.w / 2, hd: TOWER.d / 2 };
  const y0 = yP, yF = y0 + TOWER.plinth, yL = yF + TOWER.wallH;
  // a low plinth, then the lower storey's walls
  S.kind = KIND.PLAIN;
  box(0, tw, y0 - 0.1, yF, TOWER.w + 0.6, TOWER.d + 0.6, PLASTER_TOP, { topKind: KIND.ROAD });
  box(0, tw, yF, yL, TOWER.w, TOWER.d, PLASTER, { top: PLASTER_TOP });
  // three arches on each face: a wide one in the middle (2.4 m, its ring's top 0.56 m under the cornice), two
  // narrower ones (1.65 m, 1.0 m under it)
  for (const fc of faces(Lw.hw, Lw.hd)) {
    const off = fc.long ? 3.2 : 2.6;
    opening(fc.f, fc.n, 0, 2.4, yF, yL - 2.06);
    for (const sg of [-1, 1]) opening(fc.f, fc.n, sg * off, 1.65, yF, yL - 2.12);
  }
  // the heavy moulded cornice, the eave skirt and the terrace it rises to
  S.kind = KIND.PLAIN;
  box(0, tw, yL, yL + 0.28, TOWER.w + 0.3, TOWER.d + 0.3, PLASTER_TOP);
  box(0, tw, yL + 0.28, yL + 0.5, TOWER.w + 0.6, TOWER.d + 0.6, PLASTER);
  const yE = yL + 0.62, yT = yE + 0.45;
  skirt(Lw.hw + 0.75, Lw.hd + 0.75, Lw.hw - 0.3, Lw.hd - 0.3, yE, yT, 0.16, [Lw.hw + 0.3, Lw.hd + 0.3]);
  S.kind = KIND.PLAIN;
  box(0, tw, yL + 0.5, yT, TOWER.w - 0.6, TOWER.d - 0.6, PLASTER, { top: PLASTER_TOP, topKind: KIND.ROAD });
  // the terrace's balustrade: a low wall with posts
  const tb = (len, along, off) => {
    S.kind = KIND.PLAIN;
    if (along) box(0, tw + off, yT, yT + 0.5, len, 0.18, PLASTER, { top: PLASTER_TOP });
    else box(off, tw, yT, yT + 0.5, 0.18, len, PLASTER, { top: PLASTER_TOP });
    const n = Math.max(2, Math.round(len / 1.3));
    for (let k = 1; k < n; k++) {
      const u = -len / 2 + (len * k) / n;
      if (along) box(u, tw + off, yT, yT + 0.68, 0.26, 0.26, PLASTER_TOP); else box(off, tw + u, yT, yT + 0.68, 0.26, 0.26, PLASTER_TOP);
    }
  };
  const bw = Lw.hw - 0.5, bd = Lw.hd - 0.5;
  tb(2 * bw, true, bd); tb(2 * bw, true, -bd);
  tb(2 * bd, false, bw); tb(2 * bd, false, -bw);
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(a * bw, tw + b * bd, yT, yT + 0.8, 0.34, 0.34, PLASTER_TOP);

  // the upper storey: plastered corners round a brick panel and an arch on each side, a cornice and a tiled hip roof
  const U = { hw: TOWER.uw / 2, hd: TOWER.ud / 2 }, yU = yT + TOWER.uwallH;
  S.kind = KIND.PLAIN;
  box(0, tw, yT, yU, TOWER.uw, TOWER.ud, PLASTER, { top: PLASTER_TOP });
  for (const fc of faces(U.hw, U.hd)) {
    const h = fc.len / 2 - 0.45;
    S.quad(fc.f(-h, yT + 0.25, 0.015), fc.f(h, yT + 0.25, 0.015), fc.f(h, yU - 0.2, 0.015), fc.f(-h, yU - 0.2, 0.015), UBRICK, fc.n);
    opening(fc.f, fc.n, 0, fc.long ? 1.15 : 1.0, yT + 0.4, yT + 1.25);
  }
  box(0, tw, yU, yU + 0.15, TOWER.uw + 0.3, TOWER.ud + 0.3, PLASTER_TOP);
  const tc = P(0, tw);
  S.hip(tc[0], tc[1], TOWER.uw + 0.3, TOWER.ud + 0.3, A, yU + 0.15, 0.75, TILE, { over: 0.15, flare: 0.1, hips: true, horns: false, ridgeCol: RIDGE_C, fascia: 0.16, fasciaCol: TILE_EDGE, segs: 3 });
  const top = yU + 0.15 + 0.75;
  // small upturned horns at the upper eave's corners (the hip's own horns are drawn for larger roofs)
  for (const [sa, sb] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const ex = sa * ((TOWER.uw + 0.3) / 2 + 0.12), ez = sb * ((TOWER.ud + 0.3) / 2 + 0.12), d = 0.7071;
    const e = V(ex, tw + ez, yU + 0.3);
    const tip = V(ex + sa * d * 0.25, tw + ez + sb * d * 0.25, yU + 0.68);
    S.kind = KIND.PLAIN;
    S.beam(e, tip, 0.12, 0.12, RIDGE_C);
  }
  // a gourd (hồ lô) on the middle of the ridge
  S.kind = KIND.PLAIN;
  S.cyl(tc[0], tc[1], top - 0.05, top + 0.15, 0.14, 0.22, 8, RIDGE_C, { cap: false });
  S.cyl(tc[0], tc[1], top + 0.15, top + 0.32, 0.22, 0.1, 8, RIDGE_C, { cap: false });
  S.cyl(tc[0], tc[1], top + 0.32, top + 0.42, 0.1, 0.03, 8, RIDGE_C);
  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = keep;

  // ---- night: the lower eave lit all round, a lantern at each mouth of the passage ----------------------------
  if (group) {
    const Lb = new Buf(200);
    const y = yE - 0.3, hu = Lw.hw + 0.4, hv = Lw.hd + 0.4;
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
