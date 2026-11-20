import { KIND, hex, shade, unflat } from '../../geo/buf.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';
import { pavilion } from '../citadel.js';

// Cửa Kẻ Trài, formally Đông Bắc môn (東北門), the north-east gate of Kinh thành Huế, on the west bank of the Đông Ba
// river near Mang Cá. Notes and sources: docs/places/gate-cua-ke-trai.md.
//
// The arched passage was built in 1809 under Gia Long, the watch tower (vọng lâu) in 1824 under Minh Mạng, and with
// Đông Ba it was one of the first two Citadel gates to get one. After 1885 the French walled Mang Cá into a post and
// the gate was all but shut; it was opened again to traffic on 30 May 2026.
//
// All ten land gates share one form (tapchidongnama.vn): a brick block through the rampart pierced by one arched
// passage (nguyệt môn) 3.82 m wide and 5.19 m high, closed by two great wooden leaves; over the arch on each face a
// large stone tablet (2.31 × 1.10 m) carved with the gate's name; on top a two-storey tower in the tam quan / cổ lâu
// manner rising more than 9 m above the wall, under tube tiles (ngói ống); more than 17 m in all.
//
// Plan: the OSM outline (way 1568259450, historic=city_gate), 19.4 m along the wall × 18.9 m through it, and the road
// way through it (1568259411, tunnel=building_passage). The block reaches out to both faces of the rampart (as the
// generic gate in citadel.js did) so the slot places/kinhthanh.js cuts for the passage is closed.
// Local frame: s along the wall, t through it, + out of the Citadel (towards the Đông Ba river, east-north-east).
// Cầu Cửa Trài, the 55 m road bridge over the river in front, is drawn by the road and bridge code and left there.
export const id = 'gate:Cửa Kẻ Trài';

const C = [-1228.2, -1874.9]; // centre of the OSM outline, metres in the model frame
const A = -2.2013; // direction of s (along the wall); t = A + 90° points out, along the passage
const ux = Math.cos(A), uz = Math.sin(A);
const P = (s, t) => [C[0] + s * ux - t * uz, C[1] + s * uz + t * ux];
const V = (s, t, y) => { const p = P(s, t); return [p[0], y, p[1]]; };
const N = (ds, dt, dy = 0) => [ds * ux - dt * uz, dy, ds * uz + dt * ux];

const L = 19.4, D = 18.9; // the block (OSM)
const ARCH = { w: 3.82, h: 5.19 }; // the passage (tapchidongnama.vn)
const TOP = WALL_H + 1.0; // the block's flat top, a little above the wall walk (estimate)
const TOWER = { w: 12.4, d: 8.2, wallH: 3.2, rh: 2.6 }; // vọng lâu: ridge ~8.5 m over the block top (> 9 m over the wall)

const BRICK = hex('#5d5850'); // weathered brick, darkened by damp and lichen like the rampart
const BRICK_LT = hex('#6c665d');
const DAMP = hex('#3c3a35');
const CAP = hex('#7d776c');
const FRAME = hex('#a9a293');
const DARK = hex('#1f1a18');
const TABLET = hex('#4a5459'); // đá thanh, bluish-grey stone
const GLYPH = hex('#d9cfb5');
const DOOR = hex('#4a2e20');
const ROOF = hex('#b98d3c'); // yellow glazed tube tiles, weathered
const RIDGE = hex('#dcc27a');
const LACQUER = hex('#7e3524');

export function build({ data, S }) {
  const Y = LAND_Y, n0 = S.n, keep = S.kind;
  const box = (s, t, y0, y1, ss, st, col, opts) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, opts); };

  // how far the block must reach along t to meet the rampart's faces (the wall band is about 21 m thick)
  const reach = [D / 2 + 0.4, D / 2 + 0.4];
  const tx = -uz, tz = ux;
  for (const poly of data.wall || []) for (const r of poly.map(unflat)) for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], ex = b[0] - a[0], ez = b[1] - a[1], den = tx * ez - tz * ex;
    if (Math.abs(den) < 1e-6) continue;
    const qx = a[0] - C[0], qz = a[1] - C[1], t = (qx * ez - qz * ex) / den, s = (qx * tz - qz * tx) / den;
    if (s < 0 || s > 1 || Math.abs(t) < D / 2 - 1.5 || Math.abs(t) > D / 2 + 6) continue;
    const k = t < 0 ? 0 : 1;
    reach[k] = Math.max(reach[k], Math.abs(t) + 0.12);
  }
  const t0 = -reach[0], t1 = reach[1], tm = (t0 + t1) / 2, dep = t1 - t0;
  const yT = Y + TOP, r = ARCH.w / 2, crown = Y + ARCH.h, spring = crown - r, K = 10;

  // ---- the block, with the passage driven through it ----------------------------------------------------------
  S.kind = KIND.MASONRY;
  for (const sg of [-1, 1]) box(sg * (L / 4 + r / 2), tm, Y - 0.5, yT, L / 2 - r, dep, BRICK, { top: CAP, topKind: KIND.ROAD });
  box(0, tm, crown, yT, ARCH.w + 0.02, dep, BRICK, { top: CAP, topKind: KIND.ROAD });
  const arc = (k, rr = r) => { const th = Math.PI - (Math.PI * k) / K; return [rr * Math.cos(th), spring + rr * Math.sin(th)]; };
  for (const [t, dt] of [[t0, -1], [t1, 1]]) for (let k = 0; k < K; k++) { // spandrels over the arch on both faces
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    S.quad(V(sa, t, ya), V(sb, t, yb), V(sb, t, crown), V(sa, t, crown), BRICK, N(0, dt));
  }
  // the vault and the reveals, darker inside
  S.kind = KIND.PLAIN;
  for (let k = 0; k < K; k++) {
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    S.quad(V(sa, t0 + 0.01, ya), V(sb, t0 + 0.01, yb), V(sb, t1 - 0.01, yb), V(sa, t1 - 0.01, ya), shade(BRICK, 0.5), N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
  }
  for (const sg of [-1, 1]) {
    const s = sg * (r - 0.01);
    S.quad(V(s, t0 + 0.6, Y), V(s, t1 - 0.6, Y), V(s, t1 - 0.6, spring), V(s, t0 + 0.6, spring), DARK, N(-sg, 0));
    for (const [ta, tb] of [[t0 + 0.01, t0 + 0.6], [t1 - 0.6, t1 - 0.01]]) S.quad(V(s, ta, Y), V(s, tb, Y), V(s, tb, spring), V(s, ta, spring), shade(BRICK, 0.7), N(-sg, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(V(-r, t0 - 0.3, Y + 0.02), V(r, t0 - 0.3, Y + 0.02), V(r, t1 + 0.3, Y + 0.02), V(-r, t1 + 0.3, Y + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  // the two wooden leaves, standing open against the reveals a third of the way in from the outer face
  const tD = t1 - dep * 0.33;
  for (const sg of [-1, 1]) box(sg * (r - 0.12), tD - r / 2, Y, spring + 0.6, 0.12, r * 0.98, DOOR);

  // ---- both faces: damp foot, stone surround of the arch, the name tablet, cornice ----------------------------
  for (const [t, dt] of [[t0, -1], [t1, 1]]) {
    const tf = t + dt * 0.05;
    for (const sg of [-1, 1]) box(sg * (L / 4 + r / 2 + 0.2), tf, Y, Y + 0.9, L / 2 - r - 0.2, 0.08, DAMP);
    for (const sg of [-1, 1]) box(sg * (r + 0.22), t + dt * 0.08, Y, spring, 0.44, 0.16, FRAME);
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arc(k, r + 0.22), [sb, yb] = arc(k + 1, r + 0.22);
      S.beam(V(sa, t + dt * 0.08, ya), V(sb, t + dt * 0.08, yb), 0.16, 0.44, FRAME);
    }
    // the tablet: a framed slab of đá thanh with the three characters 東北門 standing out in light relief
    const yb = crown + 0.42;
    box(0, t + dt * 0.1, yb - 0.25, yb + 1.1 + 0.25, 2.31 + 0.5, 0.2, FRAME);
    box(0, t + dt * 0.17, yb, yb + 1.1, 2.31, 0.12, TABLET);
    for (const k of [-1, 0, 1]) box(k * 0.72, t + dt * 0.23, yb + 0.22, yb + 0.88, 0.5, 0.04, GLYPH);
    // cornice band under the parapet
    box(0, t + dt * 0.09, yT - 0.45, yT, L + 0.1, 0.18, BRICK_LT);
  }

  // ---- the parapet on the flat top: brick merlons with embrasures (lỗ châu mai) all round -------------------------
  S.kind = KIND.MASONRY;
  const W2 = L + 0.2;
  for (const [len, along, off] of [[W2, true, t0 + 0.25], [W2, true, t1 - 0.25], [dep, false, -W2 / 2 + 0.25], [dep, false, W2 / 2 - 0.25]]) {
    const n = Math.max(3, Math.round(len / 1.4) | 1);
    for (let k = 0; k < n; k++) {
      const u = -len / 2 + (len * (k + 0.5)) / n, merlon = k % 2 === 0;
      if (along) box(u, off, yT, yT + (merlon ? 1.15 : 0.6), len / n, 0.5, BRICK_LT, { top: CAP });
      else box(off, tm + u, yT, yT + (merlon ? 1.15 : 0.6), 0.5, len / n, BRICK_LT, { top: CAP });
    }
  }

  // ---- the vọng lâu: two storeys under yellow tube tiles, open colonnade below ---------------------------------
  // (a low stone stylobate first, as at the restored towers of Thượng Tứ and Chánh Tây)
  box(0, tm, yT, yT + 0.35, TOWER.w + 1.4, TOWER.d + 1.4, shade(PAL.stone, 0.85), { topKind: KIND.ROAD });
  pavilion(S, ...P(0, tm), TOWER.w, TOWER.d, A, yT + 0.35, { tiers: 2, wallH: TOWER.wallH, roof: ROOF, wall: LACQUER, over: 1.3, rh: TOWER.rh, ridge: RIDGE, colonnade: true, steps: false });

  // the gate stands on paved ground: keep trees and houses off it
  S.kind = KIND.PLAIN;
  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = keep;
  return null;
}

