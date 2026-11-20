import { Buf, KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';

// Nghênh Lương Đình (迎涼亭), the royal river pavilion on the Kỳ Đài – Phu Văn Lâu axis, at the Hương River bank.
// Built 1852 (Tự Đức 5), restored 1903 (Thành Thái 15) after storm damage, rebuilt 1918 (Khải Định 3) and joined
// to the boat landing. Sources and estimates: docs/places/nghenhluong.md.
//
// Plan (sourced): a "phương đình 1 gian 4 chái" (a square open pavilion, one central bay ringed by four aisles) on
// 16 wooden columns, open on all four sides, with a "nhà vỏ cua" (crab-shell porch) before and behind joined to it
// by gutters. Main roof two-tiered (chồng diêm) in yellow glazed tubular tiles, the porch roofs in yellow glazed
// flat tiles; on the main ridge two dragons facing the sun. Platform 0.9 m, brick and bluestone kerbs; on the river
// side 13 steps down to a corridor at the water.
// Footprint: OSM way 239568224, 14.7 m along the axis × 11.1 m across (taken as the platform). The column grid,
// tier heights and the porch depth are estimates from photos, scaled to that outline.
export const id = 'nghenhluong';

// the OSM outline's centre and long axis (metres, model frame: x east, z south), the axis pointing to the river
const C0 = [-796.33, 453.15];
const AX = (() => { const dx = 8.3 + 8.4, dz = 12.1 + 12.1, l = Math.hypot(dx, dz); return [dx / l, dz / l]; })();

const ROOF = PAL.imperialRoof; // bright yellow glazed tiles (lưu ly vàng)
const RIDGE = hex('#f1d77a');
const LAC = PAL.lacquer; // red lacquered columns and beams
const GOLD = hex('#c9a13b');
const KERB = hex('#7d817f'); // đá thanh, the grey-blue bluestone of the kerbs and steps
const BRICK = hex('#9a6a52'); // gạch vồ, the platform's brick face
const FLOOR = hex('#b8ab95');
const LANTERN = [1.0, 0.72, 0.34];

export function build({ S, group, place, THREE }) {
  const c = place ? [place.x, place.z] : C0;
  // keep the OSM outline's centre when the place record sits a little off it (its label point)
  const cx = Math.hypot(c[0] - C0[0], c[1] - C0[1]) < 6 ? C0[0] : c[0], cz = Math.hypot(c[0] - C0[0], c[1] - C0[1]) < 6 ? C0[1] : c[1];
  const [fx, fz] = AX, px = -fz, pz = fx; // f: along the axis toward the river; p: across it
  const fa = Math.atan2(fz, fx), pa = fa + Math.PI / 2;
  const at = (a, b) => [cx + fx * a + px * b, cz + fz * a + pz * b];
  const L = new Buf(400); // night light strips under the eaves
  const lan = [], lanC = [];
  const lantern = (q, y) => { lan.push(q[0], y, q[1]); lanC.push(...LANTERN); };

  // ---- platform (0.9 m), brick faces on a bluestone plinth and kerb ----
  const PL = 14.7, PW = 11.1, PH = 0.9, y0 = LAND_Y + PH;
  S.kind = KIND.MASONRY;
  S.box(cx, cz, LAND_Y - 0.3, LAND_Y + 0.18, PL + 0.2, PW + 0.2, fa, KERB, { topKind: KIND.ROAD });
  S.box(cx, cz, LAND_Y + 0.18, y0 - 0.14, PL, PW, fa, BRICK);
  S.box(cx, cz, y0 - 0.14, y0, PL + 0.12, PW + 0.12, fa, KERB, { top: FLOOR, topKind: KIND.ROAD });

  // a flight up the middle of the road (front) face and the river (back) face, between bluestone cheek walls
  const n = 5, rise = PH / n, tread = 0.34, sw = 3.4;
  for (const sg of [-1, 1]) {
    S.kind = KIND.MASONRY;
    for (let k = 1; k < n; k++) {
      const q = at(sg * (PL / 2 + tread * (k - 0.5)), 0);
      S.box(q[0], q[1], LAND_Y - 0.2, y0 - rise * k, tread, sw, fa, shade(KERB, 1.08), { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    for (const s2 of [-1, 1]) {
      const a = at(sg * (PL / 2 - 0.2), s2 * (sw / 2 + 0.2)), b = at(sg * (PL / 2 + tread * (n - 1) + 0.1), s2 * (sw / 2 + 0.2));
      S.beam([a[0], y0 + 0.1, a[1]], [b[0], LAND_Y + 0.12, b[1]], 0.36, 0.34, KERB);
    }
  }

  // ---- the open pavilion: 16 columns in a 4 × 4 grid (one bay and four aisles), porches before and behind ----
  const G = [-4.0, -1.6, 1.6, 4.0]; // column lines, both ways (estimated: 8 m square at the outer columns)
  const PD = 2.4; // depth of each crab-shell porch
  const hOut = 3.1, hIn = 5.0, hPorch = 2.45; // column heights above the floor (estimated)
  const col = (a, b, h, r) => {
    const q = at(a, b);
    S.cyl(q[0], q[1], y0, y0 + 0.24, r * 1.8, r * 1.55, 6, shade(PAL.stone, 0.95), { cap: false, rot: fa });
    S.cyl(q[0], q[1], y0 + 0.24, y0 + h, r, r * 0.93, 8, LAC, { cap: false, rot: fa });
  };
  S.kind = KIND.TIMBER;
  for (const a of G) for (const b of G) {
    const inner = Math.abs(a) < 2 && Math.abs(b) < 2;
    col(a, b, inner ? hIn : hOut, inner ? 0.2 : 0.17);
  }
  for (const sg of [-1, 1]) for (const b of G) col(sg * (4.0 + PD), b, hPorch, 0.15);

  // beams on the column heads, with the carved fretwork (liên ba) hung between the outer columns
  const beam = (a0, b0, a1, b1, y, w, h, colr) => { const p = at(a0, b0), q = at(a1, b1); S.beam([p[0], y, p[1]], [q[0], y, q[1]], w, h, colr); };
  const lb = shade(LAC, 0.8);
  for (const sg of [-1, 1]) {
    beam(-4, sg * 4, 4, sg * 4, y0 + hOut - 0.12, 0.26, 0.3, lb); // the sides of the main square
    beam(sg * 4, -4, sg * 4, 4, y0 + hOut - 0.12, 0.26, 0.3, lb);
    beam(sg * (4 + PD), -4, sg * (4 + PD), 4, y0 + hPorch - 0.12, 0.24, 0.28, lb); // the porch fronts
    for (const b of [-4, 4]) beam(sg * 4, b, sg * (4 + PD), b, y0 + hPorch - 0.12, 0.2, 0.24, lb);
    beam(-1.6, sg * 1.6, 1.6, sg * 1.6, y0 + hIn - 0.15, 0.28, 0.34, lb); // the inner square
    beam(sg * 1.6, -1.6, sg * 1.6, 1.6, y0 + hIn - 0.15, 0.28, 0.34, lb);
    for (const b of G) beam(sg * 1.6, Math.abs(b) < 2 ? b : b * 0.4, sg * 4, b, y0 + hOut - 0.35, 0.18, 0.22, lb); // tie beams out to the aisle
  }
  S.kind = KIND.PLAIN;
  const fret = (a, b, ang, len, yTop, h) => { const q = at(a, b); S.box(q[0], q[1], yTop - h, yTop, len, 0.07, ang, shade(LAC, 0.62)); S.box(q[0], q[1], yTop - 0.06, yTop, len, 0.1, ang, GOLD); };
  for (const sg of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const m = (G[i] + G[i + 1]) / 2, len = G[i + 1] - G[i] - 0.36;
      fret(sg * 4, m, pa, len, y0 + hOut - 0.27, 0.42); // main square, front/back faces (inside the porch)
      fret(m, sg * 4, fa, len, y0 + hOut - 0.27, 0.42); // main square, the open sides
      fret(sg * (4 + PD), m, pa, len, y0 + hPorch - 0.26, 0.36); // porch fronts
    }
  }

  // ---- roofs ----
  const eave = { flare: 0.45, fascia: 0.24, fasciaCol: shade(LAC, 0.7), glazed: true, segs: 3 };
  const lights = [];
  // the porches: a lower hip roof each, ridge across the axis, its inner slope running into the main roof's gutter
  for (const sg of [-1, 1]) {
    const q = at(sg * (4.0 + PD / 2), 0);
    S.kind = KIND.TIMBER;
    S.box(q[0], q[1], y0 + hPorch - 0.1, y0 + hPorch + 0.02, 8.0, PD, pa, shade(LAC, 0.5), { top: shade(ROOF, 0.8), bottom: true });
    S.hip(q[0], q[1], 8.0, PD, pa, y0 + hPorch, 0.7, ROOF, { ...eave, flare: 0.3, over: 0.9, ridgeCol: RIDGE, hips: true, segs: 2 });
    lights.push({ q, w: 8.0, d: PD, ang: pa, y: y0 + hPorch, over: 0.9, fascia: 0.24, sides: [sg > 0 ? 'v+' : 'v-', 'u-', 'u+'] });
  }
  // the main roof, first tier: a skirt of tiles all round the 8 m square from the outer column heads
  {
    S.kind = KIND.TIMBER;
    S.box(cx, cz, y0 + hOut - 0.1, y0 + hOut + 0.02, 8.0, 8.0, pa, shade(LAC, 0.5), { top: shade(ROOF, 0.8), bottom: true });
    S.hip(cx, cz, 8.0, 8.0, pa, y0 + hOut, 1.35, ROOF, { ...eave, over: 1.15, hips: true, ridgeCol: RIDGE });
    lights.push({ q: [cx, cz], w: 8.0, d: 8.0, ang: pa, y: y0 + hOut, over: 1.15, fascia: 0.24, sides: ['u-', 'u+', 'v-', 'v+'] });
  }
  // the chồng diêm: a band of dark lacquered boards with gilt panels over the inner columns between the two tiers
  const yb0 = y0 + hOut + 0.75, yb1 = y0 + hIn;
  S.kind = KIND.TIMBER;
  S.box(cx, cz, yb0, yb1, 4.0, 3.4, pa, shade(LAC, 0.7), { top: shade(ROOF, 0.8) });
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    let q = at(sg * 1.72, 0); S.box(q[0], q[1], yb0 + 0.18, yb1 - 0.14, 2.6, 0.05, pa, GOLD);
    q = at(0, sg * 2.02); S.box(q[0], q[1], yb0 + 0.18, yb1 - 0.14, 2.6, 0.05, fa, GOLD);
  }
  // second tier: the upper hip roof, its ridge across the axis (parallel to the river)
  const y2 = yb1, h2 = 1.85;
  S.hip(cx, cz, 5.0, 3.6, pa, y2, h2, ROOF, { ...eave, over: 1.0, ridgeCol: RIDGE, hips: true });
  lights.push({ q: [cx, cz], w: 5.0, d: 3.6, ang: pa, y: y2, over: 1.0, fascia: 0.24, sides: ['u-', 'u+', 'v-', 'v+'] });

  // lưỡng long chầu nhật on the main ridge: the flaming sun disc in the middle, a dragon rising toward it either side
  {
    const yr = y2 + h2 + 0.22;
    S.kind = KIND.GLAZED;
    S.cyl(cx, cz, yr, yr + 0.22, 0.12, 0.2, 6, RIDGE, { cap: true, rot: fa });
    S.cyl(cx, cz, yr + 0.22, yr + 0.62, 0.26, 0.05, 8, hex('#e2b13a'), { cap: true, rot: fa });
    for (const sg of [-1, 1]) {
      const a = at(0, sg * 1.05), b = at(0, sg * 0.62), t = at(0, sg * 0.4);
      S.beam([a[0], yr, a[1]], [b[0], yr + 0.32, b[1]], 0.14, 0.16, hex('#7fa36a')); // glazed green-gold dragons
      S.beam([b[0], yr + 0.32, b[1]], [t[0], yr + 0.42, t[1]], 0.12, 0.14, hex('#7fa36a'));
    }
    S.kind = KIND.PLAIN;
  }

  // ---- toward the river: an apron to the bank, 13 steps down it, the corridor at the water and the jetty ----
  // The model's bank (the land polygon) runs about 18.5 m out along the axis; OSM's landing (way 618267890) reaches
  // the same line, its jetty 36 m out. The real flight starts at the platform, but the model's land fills the space
  // where it drops, so the 13 steps are laid down the bank face instead, keeping the landing and jetty where OSM has them.
  const bank = 18.4, wl = 0.45; // river surface is y = 0; the corridor stands just above it
  S.kind = KIND.MASONRY;
  const r = at((PL / 2 + tread * (n - 1) + bank) / 2, 0);
  S.box(r[0], r[1], LAND_Y - 0.25, LAND_Y + 0.12, bank - PL / 2 - tread * (n - 1), 8.4, fa, shade(FLOOR, 0.95), { topKind: KIND.ROAD });
  const N = 13, sr = (LAND_Y + 0.12 - wl) / N, st = 0.34;
  for (let k = 1; k <= N; k++) {
    const q = at(bank + st * (k - 0.5), 0);
    S.box(q[0], q[1], wl - 0.6, LAND_Y + 0.12 - sr * k, st, 8.0, fa, shade(KERB, k % 2 ? 1.05 : 1.0), { topKind: KIND.ROAD });
  }
  const run = st * N;
  S.kind = KIND.PLAIN;
  for (const s2 of [-1, 1]) { // the cheek walls down the flight
    const a = at(bank - 0.3, s2 * 4.2), b = at(bank + run, s2 * 4.2);
    S.beam([a[0], LAND_Y + 0.3, a[1]], [b[0], wl + 0.35, b[1]], 0.45, 0.5, KERB);
    const q = at(bank + run / 2, s2 * 4.2);
    S.box(q[0], q[1], wl - 0.6, wl + 0.1, run + 0.6, 0.45, fa, KERB);
  }
  S.kind = KIND.MASONRY;
  const lw = 3.2; // the corridor at the water, as wide as the flight's foot
  let q = at(bank + run + lw / 2, 0);
  S.box(q[0], q[1], wl - 0.9, wl, lw, 10.4, fa, shade(KERB, 0.95), { topKind: KIND.ROAD });
  // the narrow jetty out to 36 m (OSM), a deck on piles
  const j0 = bank + run + lw, j1 = 36.1;
  q = at((j0 + j1) / 2, 0);
  S.kind = KIND.PLAIN;
  S.box(q[0], q[1], wl - 0.12, wl, j1 - j0, 1.0, fa, hex('#a59d90'));
  for (let a = j0 + 1.5; a < j1; a += 3) for (const b of [-0.42, 0.42]) { const p = at(a, b); S.box(p[0], p[1], -0.8, wl - 0.12, 0.16, 0.16, fa, hex('#6d6a64')); }

  // ---- night: light under every eave and lanterns at the four corners of the platform and the river steps ----
  for (const e of lights) strip(L, e);
  // (low lamp posts: the floodlights that light the pavilion from its platform corners and the foot of the flight)
  S.kind = KIND.PLAIN;
  const post = (p, yb, h) => { S.box(p[0], p[1], yb, yb + h, 0.22, 0.22, fa, hex('#3a3633')); lantern(p, yb + h + 0.12); };
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) post(at(sa * (PL / 2 - 0.45), sb * (PW / 2 - 0.45)), y0, 0.5);
  for (const sb of [-1, 1]) post(at(bank + run + 0.4, sb * 4.2), wl, 0.7);

  if (group && THREE) {
    const m = new THREE.Mesh(L.geometry(), lightMaterial(0xffae42, 1.2)); // the shared night glow drives it
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
    const g = glowPoints(lan, lanC, 6);
    g.userData.glow = true; // main.js sizes it and hides it by day
    g.userData.landmark = id;
    group.add(g);
  }
  return null;
}

// a strip of light just under the soffit of a roof's eave, near its edge (sides: 'v-'/'v+' the long sides along
// the ridge, 'u-'/'u+' the ends), as citadel.js does for the other pavilions
function strip(L, e) {
  const ux = Math.cos(e.ang), uz = Math.sin(e.ang);
  const y = e.y - e.fascia - 0.07;
  const P = (u, v) => [e.q[0] + u * ux - v * uz, y, e.q[1] + u * uz + v * ux];
  const hu = e.w / 2 + e.over - 0.3, hv = e.d / 2 + e.over - 0.3;
  for (const sd of e.sides) {
    const sg = sd[1] === '+' ? 1 : -1;
    if (sd[0] === 'v') L.beam(P(-hu, sg * hv), P(hu, sg * hv), 0.12, 0.09, [1, 1, 1]);
    else L.beam(P(sg * hu, -hv), P(sg * hu, hv), 0.12, 0.09, [1, 1, 1]);
  }
}
