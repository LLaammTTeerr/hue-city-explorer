import { KIND, hex, shade, unflat } from '../../geo/buf.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';
import { CITADEL_PASSAGE } from '../../geo/gates.js';
import { pavilion } from '../citadel.js';

// Cửa Nhà Đồ, officially Chánh Nam môn (正南門), a south gate of the Kinh thành (Huế Citadel), west of Kỳ Đài.
// Notes and sources: docs/places/gate-cua-nha-do.md.
//
// The arched passage dates from 1809 (Gia Long), the watch tower (vọng lâu) on top from Minh Mạng's reign (1829).
// Arch and tower fell in the 1953 flood and were rebuilt later. The popular name comes from the Gia Long-era
// arsenal and workshop (Võ khố, Đồ gia) that stood by it. Today Nguyễn Trãi street runs one way through the single
// passage, out over the moat on Cầu Nhà Đồ (a modern beam bridge, drawn by the generic bridge code).
//
// Form, as for the other Kinh thành gates: a brick block the full thickness of the rampart, one round-arched passage
// through it with a lime-plaster surround, the name panel over the arch, a terrace on top walled with a crenellated
// parapet (lỗ châu mai), and on it a two-storey timber vọng lâu under two tiers of yellow-glazed roof.
// Plan: OSM way 617748935 (17.7 m along the wall × 12.5 m), centre and axis below. The block reaches the rampart's
// mapped faces: outer face 8.1 m out of the centre, inner face 6.3 m in (the wall band's inner notch at the gate).
// Heights (estimated from the sibling gates, docs/heights-reference.json: Quảng Đức / Thượng Tứ "16 m in all", the
// tower rising "over 9 m above the wall top"): terrace 0.8 m over the 6.6 m walk, the tower's ridge about 16.4 m.
// Local frame: s along the wall (the outline's long axis), t through it, + out of the Citadel (south-south-east).
export const id = 'gate:Cửa Nhà Đồ';

const C = [-1428.75, 535.6]; // centre of the OSM outline, metres in the model frame
const A = -0.473; // direction of s (the outline's long axis, along the rampart)
const ux = Math.cos(A), uz = Math.sin(A);
const P = (s, t) => [C[0] + s * ux - t * uz, C[1] + s * uz + t * ux];
const V = (s, t, y) => { const p = P(s, t); return [p[0], y, p[1]]; };
const N = (ds, dt, dy = 0) => [ds * ux - dt * uz, dy, ds * uz + dt * ux];

const L = 17.7; // the block along the wall (OSM)
const T0 = -6.45, T1 = 8.25; // its inner and outer faces, a hand's breadth proud of the rampart's
const TC = (T0 + T1) / 2, D = T1 - T0;
const HT = WALL_H + 0.8; // terrace, above LAND_Y
const PW = CITADEL_PASSAGE.w, PH = CITADEL_PASSAGE.h; // the passage (matches the slot kinhthanh.js cuts)
const TOWER = { w: 11.2, d: 7.4 }; // vọng lâu, lower storey's column line (estimate from photos of the sibling gates)

const BRICK = shade(PAL.brick, 0.86); // as kinhthanh.js: grey brick, the warmth gone out of it
const DAMP = hex('#3a3833'), STREAK = hex('#4a4b40'), RELAID = hex('#655e57');
const PLASTER = hex('#cfc8b6'); // lime-plaster surrounds and cornice
const PANEL = hex('#ddd3bd'), INK = hex('#3b3430');
const DARK = hex('#1f1a18');
const ROOF = hex('#c9952f'), RIDGE = hex('#e3c66e'); // yellow-glazed tiles, weathered
const LACQUER = PAL.lacquer;

export function build({ data, S }) {
  const Y = LAND_Y, keep = S.kind, n0 = S.n;
  const box = (s, t, y0, y1, ss, st, col, opts) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, opts); };
  // the wall must be where this model expects it: the rampart band crosses the axis near both faces
  if (!(data.wall || []).length) throw new Error('no rampart in data.wall');
  if (!(data.wall[0] || []).some((r) => unflat(r).some(([x, z]) => Math.hypot(x - C[0], z - C[1]) < 60))) throw new Error('rampart not near Cửa Nhà Đồ');

  // ---- the block: two piers either side of the passage, the arch and the masonry over it ----------------------
  S.kind = KIND.MASONRY;
  const yTop = Y + HT;
  for (const sg of [-1, 1]) {
    const w = L / 2 - PW / 2;
    box(sg * (PW / 2 + w / 2), TC, Y - 0.5, yTop, w, D, BRICK, { top: PAL.stone, topKind: KIND.ROAD });
  }
  archPassage(S, Y, yTop);
  // weathering on both faces: a damp foot, streaks from the top down, relaid patches (as on the rampart)
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    const t = dt > 0 ? T1 + 0.03 : T0 - 0.03, n = N(0, dt);
    const face = (s0, s1, y0, y1, col) => S.quad(V(s0, t, y0), V(s1, t, y0), V(s1, t, y1), V(s0, t, y1), col, n);
    const ord = (a, b) => (dt > 0 ? [a, b] : [b, a]); // keep the quad's winding facing out
    for (const [a, b] of [[-L / 2, -PW / 2 - 0.45], [PW / 2 + 0.45, L / 2]]) {
      const [s0, s1] = ord(a, b);
      face(s0, s1, Y - 0.5, Y + 0.9, DAMP);
    }
    for (const [s, w, y0, col] of [[-7.6, 1.6, 2.2, STREAK], [-5.1, 1.1, 3.6, STREAK], [4.6, 1.8, 1.6, STREAK], [7.2, 0.9, 3.1, STREAK], [-6.4, 1.4, 1.4, RELAID], [5.9, 1.2, 4.2, RELAID]]) {
      const [s0, s1] = ord(s - w / 2, s + w / 2);
      face(s0, s1, Y + y0, col === RELAID ? Y + y0 + 1.6 : yTop - 0.4, col);
    }
  }

  // ---- cornice band and the crenellated parapet round the terrace ----------------------------------------------
  S.kind = KIND.MASONRY;
  box(0, TC, yTop - 0.35, yTop, L + 0.24, D + 0.24, shade(BRICK, 1.1), { top: PAL.stone, topKind: KIND.ROAD });
  const ring = [[L, true, T1], [L, true, T0], [D, false, L / 2], [D, false, -L / 2]];
  for (const [len, along, off] of ring) {
    const n = Math.max(3, Math.round(len / 1.3) | 1); // odd, so both ends are merlons
    for (let k = 0; k < n; k++) {
      const u = -len / 2 + (len * (k + 0.5)) / n, merlon = k % 2 === 0;
      const inset = Math.sign(off - (along ? TC : 0)) * 0.3;
      const s = along ? u : off - inset, t = along ? off - inset : TC + u;
      box(s, t, yTop, yTop + (merlon ? 1.15 : 0.6), along ? len / n + 0.01 : 0.6, along ? 0.6 : len / n + 0.01, shade(BRICK, 1.05), { top: PAL.stone });
    }
  }

  // ---- name panel over the arch on both faces: framed stone tablet, 正南門 in dark characters -------------------
  S.kind = KIND.PLAIN;
  const yb = Y + PH + 0.55;
  for (const dt of [-1, 1]) {
    const t = dt > 0 ? T1 : T0;
    box(0, t + dt * 0.08, yb, yb + 1.15, 3.4, 0.16, PLASTER);
    box(0, t + dt * 0.16, yb + 0.12, yb + 1.03, 3.0, 0.06, PANEL);
    for (const k of [-1, 0, 1]) box(k * 0.85, t + dt * 0.2, yb + 0.26, yb + 0.89, 0.5, 0.04, INK);
  }

  // ---- the vọng lâu: open colonnade below, a short storey between the two roofs above -------------------------
  const pc = P(0, TC);
  const top = pavilion(S, pc[0], pc[1], TOWER.w, TOWER.d, A, yTop, { tiers: 2, wallH: 3.0, roof: ROOF, wall: LACQUER, over: 1.3, rh: 2.6, ridge: RIDGE, colonnade: true });
  // ridge ornament: a fire pearl in the middle, upturned curls at the ridge ends (as on the sibling gates' towers)
  const w2 = TOWER.w * 0.68, d2 = TOWER.d * 0.62, over2 = 1.3 * 0.85;
  const rl = Math.max(0.6, (w2 + 2 * over2) / 2 - ((d2 + 2 * over2) / 2) * 0.92);
  S.kind = KIND.PLAIN;
  S.cyl(pc[0], pc[1], top - 0.05, top + 0.2, 0.1, 0.16, 6, RIDGE, { cap: false });
  S.cyl(pc[0], pc[1], top + 0.2, top + 0.5, 0.2, 0.18, 8, hex('#c9553a'));
  S.cyl(pc[0], pc[1], top + 0.5, top + 0.85, 0.12, 0.02, 5, hex('#e2a33a'));
  for (const sg of [-1, 1]) {
    const a = V(sg * rl, TC, top - 0.05), b = V(sg * (rl + 0.25), TC, top + 0.45), c = V(sg * (rl + 0.05), TC, top + 0.7);
    S.beam(a, b, 0.16, 0.16, RIDGE);
    S.beam(b, c, 0.12, 0.12, RIDGE);
  }

  // the terrace and the passage are built ground: trees and houses keep off it
  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = keep;
}

// The arched passage through the block along t, centred at s = 0: masonry over the crown, the spandrels on both
// faces, a dark barrel vault, a paved floor, and a lime-plaster surround (jambs, arch band, keystone) on each mouth.
function archPassage(S, y0, y1) {
  const r = PW / 2, fl = y0, crown = y0 + PH, spring = crown - r, K = 10;
  const box = (s, t, a, b, ss, st, col, opts) => { const p = P(s, t); S.box(p[0], p[1], a, b, ss, st, A, col, opts); };
  S.kind = KIND.MASONRY;
  box(0, TC, crown, y1, PW + 0.02, D, BRICK, { top: PAL.stone, topKind: KIND.ROAD });
  const arc = (k) => { const th = Math.PI - (Math.PI * k) / K; return [r * Math.cos(th), spring + r * Math.sin(th)]; };
  for (const dt of [-1, 1]) {
    const t = dt > 0 ? T1 : T0;
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
      S.quad(V(sa, t, ya), V(sb, t, yb), V(sb, t, crown), V(sa, t, crown), BRICK, N(0, dt));
    }
  }
  S.kind = KIND.PLAIN;
  for (let k = 0; k < K; k++) {
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    S.quad(V(sa, T0 + 0.01, ya), V(sb, T0 + 0.01, yb), V(sb, T1 - 0.01, yb), V(sa, T1 - 0.01, ya), shade(BRICK, 0.5), N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
  }
  for (const sg of [-1, 1]) {
    const s = sg * (r - 0.02);
    S.quad(V(s, T0 + 0.5, fl), V(s, T1 - 0.5, fl), V(s, T1 - 0.5, spring), V(s, T0 + 0.5, spring), DARK, N(-sg, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(V(-r, T0 - 0.3, fl + 0.01), V(r, T0 - 0.3, fl + 0.01), V(r, T1 + 0.3, fl + 0.01), V(-r, T1 + 0.3, fl + 0.01), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    const t = (dt > 0 ? T1 : T0) + dt * 0.06;
    for (const sg of [-1, 1]) box(sg * (r + 0.22), t, fl, spring, 0.44, 0.12, PLASTER);
    const R2 = r + 0.22;
    for (let k = 0; k < K; k++) {
      const th0 = Math.PI - (Math.PI * k) / K, th1 = Math.PI - (Math.PI * (k + 1)) / K;
      S.beam(V(R2 * Math.cos(th0), t, spring + R2 * Math.sin(th0)), V(R2 * Math.cos(th1), t, spring + R2 * Math.sin(th1)), 0.12, 0.44, PLASTER);
    }
    box(0, t + dt * 0.04, crown + 0.05, crown + 0.5, 0.44, 0.12, shade(PLASTER, 1.04));
  }
}
