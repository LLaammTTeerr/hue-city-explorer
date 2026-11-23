import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import { KIND, Buf, hex, shade, signedArea, inRing, rand } from '../../geo/buf.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { flag } from '../anim.js';

// Kỳ Đài, the flag tower of the Huế Citadel, on the Nam Chánh bastion in the middle of the south face (1807, rebuilt
// 1829-1840; concrete pole 1948). Sources and estimates: docs/places/kydai.md.
//
// Three stepped brick tiers, about 17.5 m in all (vi.wikipedia "Kỳ đài (Huế)"):
//   1. the bastion itself (>5.5 m): the rampart (kinhthanh.js) at WALL_H, with a hole where tier 2 stands. Its pentagon
//      point (W and N corners on the citadel side, faces running back to the two sunken courts OSM maps at its flanks,
//      ways 617748900 and 695817672, cut out of the band by rampartCuts) is dressed here in grey render with a moulded
//      cornice, a parapet and a cannon on each corner, its top paved in brown brick;
//   2. the middle tier (~6 m) on OSM way 218427614, the bastion-shaped pentagon (~80 × 60 m);
//   3. the top tier (>6 m) on OSM way 531031593 (35.3 × 17.8 m), carrying the 37 m pole, the two guard huts
//      (điếm canh, rebuilt 2018) at its ends.
// Each tier: a slight batter, a floor of square brick tiles and a 1 m parapet with a band of hollow patterned
// tiles. Stairs climb the north (citadel) faces, in slots cut into the tier, to a 4 m and a 2 m arched gate
// (the lower flight on OSM way 617748885). Cannons on the OSM `historic=cannon` nodes. At night: the 2018
// multicolour LED outline and floodlights at the foot of the pole.
export const id = 'kydai';

// OSM outlines, in model metres
const MID_OSM = [[-962.3, 289.9], [-897.4, 243.4], [-876.4, 272.6], [-898.6, 305.9], [-939.9, 318.0]];
const TOP_OSM = [[-933.9, 288.7], [-905.7, 267.7], [-894.9, 281.9], [-923.2, 302.9]];
// Re-framed against the satellite (docs/places/kydai.md, "Position"): the two OSM outlines have the right size and
// axis but sit east of the tiers seen from above (corrected for the image's lean, measured on the pole), by about
// 3 m (tier 2) and 4 m (tier 3), and 1 m south. The bastion and moat around them line up, so only these move.
const OFF2 = [-3, -1], OFF3 = [-4, -1];
const move = (r, o) => r.map(([x, z]) => [x + o[0], z + o[1]]);
const MID = move(MID_OSM, OFF2), TOP = move(TOP_OSM, OFF3);
const CANNONS = [[-861.2, 274.5], [-958.6, 341.0], [-932.1, 332.0], [-868.8, 285.8], [-952.2, 338.8], [-865.6, 281.0],
  [-853.7, 263.3], [-857.3, 268.7], [-938.0, 334.0], [-945.0, 336.3], [-898.0, 298.1], [-893.8, 292.4], [-918.6, 310.5],
  [-911.4, 308.3], [-889.4, 286.2], [-925.6, 312.6]];

// the two lower courts at tier 1's flanks (OSM cobblestone areas): street side first, then the back
const COURTS = [
  [[-980.9, 287.1], [-959.3, 314.5], [-972.9, 325.2], [-994.6, 297.8]],
  [[-897.2, 224.3], [-874.8, 253.9], [-861.0, 243.6], [-883.4, 214.0]],
];
// tier 1 on the band: the bastion between the courts and the outer edge (band vertices, model metres)
const BASTION = [[-994.6, 297.8], [-980.9, 287.1], [-897.2, 224.3], [-883.4, 214.0], [-858.6, 212.4], [-836.7, 244.8],
  [-889.5, 320.7], [-983.3, 349.3], [-1008.5, 320.1]];
// the grassed curtain walks behind the courts, left green (satellite)
const LAWNS = [[[-994.6, 297.8], [-976.2, 323.3], [-987.1, 332.2], [-1003.9, 312.7]],
  [[-883.4, 214.0], [-863.6, 241.8], [-852.0, 232.0], [-867.3, 213.0]]];
// the two orange-roofed sheds at the north-west foot, on Ông Ích Khiêm (satellite): centre, length, width
const SHEDS = [[-950.4, 255.9, 12.3, 5.4], [-941.6, 247.7, 12.9, 3.5]];

// the courts, cut out of the rampart band with their street sides carried 1 m past the band's edge
export function rampartCuts() {
  return COURTS.map(([a, b, c, d]) => {
    const ext = (p, q) => { const l = Math.hypot(p[0] - q[0], p[1] - q[1]); return [p[0] + (p[0] - q[0]) / l, p[1] + (p[1] - q[1]) / l]; };
    return [ext(a, b), b, c, ext(d, c)];
  });
}

const RAMP = LAND_Y + WALL_H; // tier 1 (the bastion top, city.js)
// tier heights: "about 6 m" and "over 6 m" (vi.wikipedia); the Lê Duẩn street view shows the top two tiers that tall
// against the pole. With the rampart's 6.6 m (the bastion is "over 5.5 m") the whole is 18.6 m, against "about 17.5 m".
const H2 = 5.8, H3 = 6.2;
const POLE = 37;
const RENDER = hex('#77777a'), RENDER_D = hex('#53524d'), RENDER_L = hex('#9a978e'), BRICK = hex('#7a6155'), COURT = hex('#8f8c85'), POLE_C = hex('#4f4f4c');
const WALL = hex('#5d5850'), PARA = hex('#847d70'), COPE = hex('#a29b8b'), FLOOR = hex('#8c7264'), STEP = hex('#8f8a80');

// offset a ring by d (positive: inward), mitred
function inset(r, d) {
  const s = signedArea(r) > 0 ? 1 : -1, n = r.length;
  const nrm = (a, b) => { const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz); return [(-tz * s) / l, (tx * s) / l]; };
  return r.map((p, i) => {
    const a = r[(i - 1 + n) % n], b = r[(i + 1) % n];
    const n0 = nrm(a, p), n1 = nrm(p, b);
    const m = [n0[0] + n1[0], n0[1] + n1[1]], k = d / Math.max(0.35, (m[0] * n0[0] + m[1] * n0[1]));
    return [p[0] + m[0] * k, p[1] + m[1] * k];
  });
}
// cut a rectangular slot into edge 0 of a ring, from t0 to t1 along it, depth inward
function notch(r, t0, t1, depth) {
  const a = r[0], b = r[1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], s = signedArea(r) > 0 ? 1 : -1, w = [-u[1] * s, u[0] * s];
  const P = (t, d) => [a[0] + u[0] * t + w[0] * d, a[1] + u[1] * t + w[1] * d];
  return { ring: [a, P(t0, 0), P(t0, depth), P(t1, depth), P(t1, 0), ...r.slice(1)], u, w, P };
}

export function build({ S, group }) {
  const keep = S.kind;
  const LT = new Buf(1200); // LED outline
  const flood = [], floodCol = [];

  // one tier: battered walls from bottom ring rb to top ring rt, floor, parapet (edges in `skip` left open)
  const tier = (rb, rt, y0, y1, skip = [], t = 0.42) => {
    S.kind = KIND.MASONRY;
    const s = signedArea(rb) > 0 ? 1 : -1;
    for (let i = 0, n = rb.length; i < n; i++) {
      const j = (i + 1) % n, a = rb[i], b = rb[j];
      const tx = b[0] - a[0], tz = b[1] - a[1];
      S.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [rt[j][0], y1, rt[j][1]], [rt[i][0], y1, rt[i][1]], WALL, [tz * s, 0.05, -tx * s]);
    }
    S.kind = KIND.ROAD;
    const c2 = rt.map((p) => new THREE.Vector2(p[0], p[1]));
    for (const f of THREE.ShapeUtils.triangulateShape(c2, [])) S.tri([c2[f[0]].x, y1, c2[f[0]].y], [c2[f[1]].x, y1, c2[f[1]].y], [c2[f[2]].x, y1, c2[f[2]].y], FLOOR, [0, 1, 0]);
    // parapet: solid plinth, a band of hollow patterned tiles (piers), coping; LED strip on the coping's outer edge
    const pr = inset(rt, t / 2 + 0.01);
    for (let i = 0, n = pr.length; i < n; i++) {
      if (skip.includes(i)) continue;
      const a = pr[i], b = pr[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l < 0.3) continue;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      S.kind = KIND.MASONRY;
      S.box(mx, mz, y1, y1 + 0.38, l + 0.4, t, ang, PARA);
      S.kind = KIND.PLAIN;
      const k = Math.max(1, Math.round(l / 0.75));
      for (let q = 0; q <= k; q++) {
        const t = q / k;
        S.box(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, y1 + 0.38, y1 + 0.82, 0.26, t * 0.8, ang, shade(PARA, 0.96));
      }
      S.box(mx, mz, y1 + 0.82, y1 + 1.0, l + 0.46, t + 0.08, ang, COPE);
      const so = signedArea(pr) > 0 ? -1 : 1, ox = Math.sin(ang) * (t / 2 + 0.06), oz = -Math.cos(ang) * (t / 2 + 0.06);
      // a thick parapet has a seat step along its inner foot, which reads as a line inside the rim
      if (t > 0.6) {
        S.kind = KIND.MASONRY;
        S.box(mx - ox * so * 1.55, mz - oz * so * 1.55, y1, y1 + 0.42, l - 0.3, 0.4, ang, STEP, { top: COPE });
      }
      LT.beam([a[0] + ox * so, y1 + 0.97, a[1] + oz * so], [b[0] + ox * so, y1 + 0.97, b[1] + oz * so], 0.1, 0.1, [1, 1, 1]);
    }
  };
  // a straight flight filling a slot: from yb at s0 (along w, from the mouth) up to yt at the slot's back
  const flight = (P, t0, t1, s0, depth, yb, yt, ybase) => {
    const n = Math.max(4, Math.round((yt - yb) / 0.19)), run = depth - s0, tread = run / n;
    const a = P(t0, 0), b = P(t1, 0), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    S.kind = KIND.MASONRY;
    for (let k = 1; k <= n; k++) {
      const sa = s0 + (k - 1) * tread, c = P((t0 + t1) / 2, (sa + depth) / 2);
      S.box(c[0], c[1], ybase, yb + (yt - yb) * (k / n), t1 - t0 - 0.08, depth - sa, ang, STEP, { top: shade(STEP, 1.12), topKind: KIND.ROAD });
    }
    // low cheek walls where the flight stands out of the slot
    if (s0 < 0) for (const t of [t0 - 0.2, t1 + 0.2]) { const p = P(t, s0 / 2); S.box(p[0], p[1], ybase, yb + 0.9, 0.4, -s0, ang, PARA, { top: COPE }); }
  };
  // arched gate over a stair head: two piers, a round arch of short beams, a block and a small tiled cap
  const gate = (P, t0, t1, d, y, h) => {
    const w = t1 - t0, r = w / 2, a = P(t0, d), b = P(t1, d), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const spring = y + h - r - 0.5, top = y + h;
    S.kind = KIND.MASONRY;
    for (const t of [t0 - 0.45, t1 + 0.45]) { const p = P(t, d); S.box(p[0], p[1], y, top, 0.9, 1.0, ang, PARA, { top: COPE }); }
    const m = P((t0 + t1) / 2, d), ux = Math.cos(ang), uz = Math.sin(ang), N = 7;
    for (let i = 0; i < N; i++) {
      const f0 = Math.PI * (i / N), f1 = Math.PI * ((i + 1) / N);
      const q0 = [m[0] - ux * r * Math.cos(f0), spring + r * Math.sin(f0), m[1] - uz * r * Math.cos(f0)];
      const q1 = [m[0] - ux * r * Math.cos(f1), spring + r * Math.sin(f1), m[1] - uz * r * Math.cos(f1)];
      // spandrel: from the arch up to the block
      S.quad([q0[0], q0[1], q0[2]], [q1[0], q1[1], q1[2]], [q1[0], top - 0.3, q1[2]], [q0[0], top - 0.3, q0[2]], PARA, [Math.sin(ang), 0, -Math.cos(ang)]);
      S.quad([q0[0], q0[1], q0[2]], [q1[0], q1[1], q1[2]], [q1[0], top - 0.3, q1[2]], [q0[0], top - 0.3, q0[2]], PARA, [-Math.sin(ang), 0, Math.cos(ang)]);
      S.beam(q0, q1, 0.95, 0.2, shade(PARA, 0.8));
    }
    S.box(m[0], m[1], top - 0.3, top, w + 1.9, 1.1, ang, COPE);
    S.kind = KIND.TILE;
    S.box(m[0], m[1], top, top + 0.35, w + 2.2, 1.4, ang, hex('#6f4a3a'), { taper: 0.55 });
    S.kind = KIND.PLAIN;
  };

  // ---- tier 1: the bastion's point, dressed over the rampart (kinhthanh.js draws its core) ----
  S.kind = KIND.ROAD;
  const close = (r) => [...r, r[0]];
  const fill = (rings, y, col) => {
    const [o, ...h] = rings.map((r) => r.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, z)));
    const all = [o, ...h].flat();
    for (const f of THREE.ShapeUtils.triangulateShape(o, h)) S.tri([all[f[0]].x, y, all[f[0]].y], [all[f[1]].x, y, all[f[1]].y], [all[f[2]].x, y, all[f[2]].y], col, [0, 1, 0]);
  };
  {
    // brick paving on top, from the tier's faces to inside the rampart's outer parapet (1.4 m), round tier 2, the
    // band's hole under it included; the curtain lawns stay green
    const nw = [[-980.9, 287.1], [-897.2, 224.3], [-906, 236], [-972, 297]]; // up to the north-west face
    try {
      const base = polygonClipping.union([close(inset(BASTION, 1.6))], [close(nw)]);
      const pave = polygonClipping.difference(base, ...COURTS.map((r) => [close(inset(r, -0.05))]), ...LAWNS.map((r) => [close(r)]), [close(MID)]);
      for (const pg of pave) fill(pg, RAMP + 0.02, BRICK);
    } catch (e) { console.warn('kydai paving:', e); }
    // the courts: grey paving at street level
    for (const r of COURTS) fill([close(r)], LAND_Y + 0.12, COURT);
  }
  // the faces: grey render over a battered skin (0.6 m proud at the foot, 0.12 m under the cornice), a moulded
  // cornice, then a parapet with piers and coping; each face with the point it looks toward
  const yW = RAMP;
  const cc = COURTS.map((r) => [r.reduce((s, p) => s + p[0], 0) / 4, r.reduce((s, p) => s + p[1], 0) / 4]);
  const FACES = [
    [COURTS[0][0], COURTS[1][0], [-930, 240]], // north-west, to the citadel
    [COURTS[0][0], COURTS[0][1], cc[0]], [COURTS[0][1], COURTS[0][2], cc[0]], // south-west court: tier face, back
    [COURTS[1][0], COURTS[1][1], cc[1]], [COURTS[1][1], COURTS[1][2], cc[1]], // north-east court
  ];
  FACES.forEach(([a, b, ref], fi) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
    let nx = uz, nz = -ux;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    if ((ref[0] - mx) * nx + (ref[1] - mz) * nz < 0) { nx = -nx; nz = -nz; }
    const ang = Math.atan2(dz, dx);
    const P = (s, o, y) => [a[0] + ux * s + nx * o, y, a[1] + uz * s + nz * o];
    const yc = yW - 0.55, y0 = LAND_Y - 0.3;
    // the skin, its ends lapped round the corners
    const e0 = fi === 0 || fi === 1 || fi === 3 ? -0.6 : 0, e1 = 0.6;
    S.kind = KIND.PLAIN;
    S.quad(P(e0, 0.6, y0), P(len + e1, 0.6, y0), P(len + e1, 0.12, yc), P(e0, 0.12, yc), RENDER, [nx, 0.08, nz]);
    // weathering: dark streaks down from the cornice and a damp foot
    S.quad(P(e0, 0.62, y0), P(len + e1, 0.62, y0), P(len + e1, 0.55, LAND_Y + 0.6), P(e0, 0.55, LAND_Y + 0.6), RENDER_D, [nx, 0.08, nz]);
    for (let s = 1 + rand(fi, 1) * 3; s < len - 1; s += 2.5 + rand(fi * 31 + s, 2) * 5) {
      const w = 0.6 + rand(fi * 17 + s, 3) * 1.8, hb = yc - 0.8 - rand(fi * 7 + s, 4) * (WALL_H - 2.5);
      const ob = 0.6 - (hb - y0) / (yc - y0) * 0.48;
      S.quad(P(s, ob + 0.015, hb), P(Math.min(len, s + w), ob + 0.015, hb), P(Math.min(len, s + w), 0.135, yc), P(s, 0.135, yc), rand(s, 6) < 0.3 ? RENDER_L : shade(RENDER_D, 0.9 + rand(s, 5) * 0.3), [nx, 0.08, nz]);
    }
    // cornice: a projecting moulded band, then a plain frieze up to the walk
    const m0 = P(len / 2, 0.25, 0);
    S.box(m0[0], m0[2], yc, yc + 0.12, len + 1.2, 0.5, ang, shade(RENDER, 1.1));
    const m1 = P(len / 2, 0.32, 0);
    S.box(m1[0], m1[2], yc + 0.12, yc + 0.35, len + 1.3, 0.64, ang, shade(RENDER, 1.18));
    const m2 = P(len / 2, 0.06, 0);
    S.box(m2[0], m2[2], yc + 0.35, yW, len + 0.4, 0.12 + 0.12, ang, RENDER);
    // parapet on the walk: plinth, piers with open panels between, coping
    const pc = P(len / 2, -0.28, 0);
    S.box(pc[0], pc[2], yW, yW + 0.35, len + 0.5, 0.5, ang, RENDER);
    S.kind = KIND.PLAIN;
    const k = Math.max(1, Math.round(len / 2.2));
    for (let q = 0; q <= k; q++) { const p = P(len * q / k, -0.28, 0); S.box(p[0], p[2], yW + 0.35, yW + 0.85, 0.36, 0.44, ang, shade(RENDER, 0.95)); }
    for (const o of [-0.12, -0.44]) { const p = P(len / 2, o, 0); S.box(p[0], p[2], yW + 0.5, yW + 0.6, len, 0.05, ang, RENDER_D); }
    S.box(pc[0], pc[2], yW + 0.85, yW + 1.02, len + 0.6, 0.62, ang, shade(RENDER, 1.15));
  });
  // iron fences across the courts' mouths, on a low plinth
  for (const r of COURTS) {
    const a = r[0], b = r[3], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const iron = hex('#2a2a2a'), L = (t, y) => [a[0] + (b[0] - a[0]) * t, y, a[1] + (b[1] - a[1]) * t];
    const m = L(0.5, 0);
    S.box(m[0], m[2], LAND_Y - 0.1, LAND_Y + 0.4, len - 1.2, 0.4, ang, RENDER_L);
    for (const y of [LAND_Y + 0.55, LAND_Y + 1.5]) S.beam(L(0.6 / len, y), L(1 - 0.6 / len, y), 0.05, 0.05, iron);
    for (let t = 0.6; t <= len - 0.6; t += 0.18) S.beam(L(t / len, LAND_Y + 0.4), L(t / len, LAND_Y + 1.6), 0.025, 0.025, iron);
    for (let t = 0.6; t <= len - 0.6; t += 2.5) { const p = L(t / len, 0); S.box(p[0], p[2], LAND_Y + 0.4, LAND_Y + 1.75, 0.12, 0.12, ang, iron); }
  }
  S.kind = KIND.PLAIN;

  // ---- tier 2: the bastion-shaped pentagon, its walls reaching down into the rampart ----
  const y1 = RAMP + H2, y2 = y1 + H3;
  const midBase = inset(MID, -0.15);
  // the lower flight: OSM steps at 67.8 m along the north edge (A→B), climbing south; slot 4 m wide, 8.6 m deep
  const n2 = notch(midBase, 65.8, 69.8, 8.6);
  tier(n2.ring, inset(n2.ring, 0.45), LAND_Y - 0.5, y1, [2], 0.75);
  flight(n2.P, 65.8, 69.8, -1.8, 8.6, RAMP, y1, LAND_Y - 0.5);
  gate(n2.P, 65.8, 69.8, 8.6 + 0.45 + 0.5, y1, 3.6);

  // ---- tier 3: the OSM rectangle; its flight, 2.4 m wide, in the east half of the north face ----
  const n3 = notch(TOP, 25.0, 27.4, 6.8);
  tier(n3.ring, inset(n3.ring, 0.4), y1, y2, [2]);
  flight(n3.P, 25.0, 27.4, -1.2, 6.8, y1, y2, y1);
  gate(n3.P, 25.0, 27.4, 6.8 + 0.4 + 0.5, y2, 3.0);

  // ---- top: the pole on the middle of tier 3; the two guard huts near its ends, on the north-west (stair) side, as the
  //      satellite shows them: centres about 2.7 m in from the ends and 4.5 m in from the north-west edge ----
  const c = [(TOP[0][0] + TOP[2][0]) / 2, (TOP[0][1] + TOP[2][1]) / 2];
  const L3 = Math.hypot(TOP[1][0] - TOP[0][0], TOP[1][1] - TOP[0][1]);
  const ua = Math.atan2(TOP[1][1] - TOP[0][1], TOP[1][0] - TOP[0][0]), ux = Math.cos(ua), uz = Math.sin(ua);
  const yt = y2; // floor of tier 3
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], yt, yt + 0.6, 4.2, 4.2, ua, PARA, { top: COPE });
  S.box(c[0], c[1], yt + 0.6, yt + 1.5, 2.6, 2.6, ua, PARA, { top: COPE, taper: 0.9 });
  S.kind = KIND.PLAIN;
  // the pole: dark weathered concrete, two railed ring platforms, guy lines to the corners of tier 3
  const poleCol = POLE_C;
  const pr0 = 0.62, pr1 = 0.26, py0 = yt + 1.5, py1 = yt + POLE - 0.6, rAt = (y) => pr0 + (pr1 - pr0) * (y - py0) / (py1 - py0);
  S.cyl(c[0], c[1], py0, py1, pr0, pr1, 10, poleCol);
  S.cyl(c[0], c[1], yt + POLE - 0.6, yt + POLE - 0.3, 0.42, 0.42, 10, poleCol);
  for (const f of [0.3, 0.62]) {
    const y = yt + POLE * f, R = rAt(y) + 0.75;
    S.cyl(c[0], c[1], y - 0.18, y, R, R, 14, shade(poleCol, 0.9));
    S.cyl(c[0], c[1], y + 0.95, y + 1.03, R - 0.03, R - 0.03, 14, shade(poleCol, 0.8), { cap: false });
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2, px = c[0] + Math.cos(t) * (R - 0.05), pz = c[1] + Math.sin(t) * (R - 0.05);
      S.beam([px, y, pz], [px, y + 1.0, pz], 0.05, 0.05, shade(poleCol, 0.8));
    }
  }
  for (const p of inset(TOP, 1.2)) for (const f of [0.3, 0.78]) {
    const y = yt + POLE * f;
    S.beam([c[0] + (p[0] - c[0]) * 0.02, y, c[1] + (p[1] - c[1]) * 0.02], [p[0], yt + 1.1, p[1]], 0.05, 0.05, hex('#2e2e2c'));
  }
  for (const p of inset(TOP, 1.2)) S.box(p[0], p[1], yt, yt + 1.1, 0.5, 0.5, 0, PARA, { top: COPE });
  S.cyl(c[0], c[1], yt + POLE - 0.3, yt + POLE, 0.3, 0.06, 10, hex('#c9b26a'));
  const W3 = Math.hypot(TOP[3][0] - TOP[0][0], TOP[3][1] - TOP[0][1]);
  const vx = (TOP[3][0] - TOP[0][0]) / W3, vz = (TOP[3][1] - TOP[0][1]) / W3; // across, from the north-west edge
  for (const sg of [-1, 1]) {
    const hc = [c[0] + ux * sg * (L3 / 2 - 2.7) + vx * (4.5 - W3 / 2), c[1] + uz * sg * (L3 / 2 - 2.7) + vz * (4.5 - W3 / 2)];
    S.kind = KIND.MASONRY;
    S.box(hc[0], hc[1], yt, yt + 0.25, 4.0, 4.2, ua, STEP);
    S.kind = KIND.FACADE;
    S.box(hc[0], hc[1], yt + 0.25, yt + 2.75, 3.4, 3.6, ua, hex('#c9bfa6'));
    S.kind = KIND.PLAIN;
    // a dark door toward the pole and a window on each long side
    const d = [hc[0] - ux * sg * 1.72, hc[1] - uz * sg * 1.72];
    S.box(d[0], d[1], yt + 0.25, yt + 2.15, 0.06, 1.0, ua, hex('#3a2c24'));
    for (const sv of [-1, 1]) { const w = [hc[0] - uz * sv * 1.82, hc[1] + ux * sv * 1.82]; S.box(w[0], w[1], yt + 1.1, yt + 2.0, 0.8, 0.06, ua, hex('#3a2c24')); }
    // roof in weathered grey tile, as the satellite shows it
    S.hip(hc[0], hc[1], 3.4, 3.6, ua, yt + 2.75, 1.5, hex('#625952'), { over: 0.5, hips: true, flare: 0.15, ridgeCol: hex('#b9ac95') });
    flood.push(hc[0] - ux * sg * 2.0, yt + 2.5, hc[1] - uz * sg * 2.0); floodCol.push(1.0, 0.78, 0.48);
  }
  // floodlights round the foot of the pole
  for (let i = 0; i < 8; i++) {
    const t = ua + (i / 8) * Math.PI * 2;
    flood.push(c[0] + Math.cos(t) * 2.4, yt + 0.75, c[1] + Math.sin(t) * 2.4);
    floodCol.push(1.0, 0.82, 0.55);
  }

  // ---- the sheds at the north-west foot: single storey, low orange-tiled hip roofs ----
  for (const [x, z, l, w] of SHEDS) {
    const a = Math.atan2(-0.59, 0.807);
    S.kind = KIND.FACADE;
    S.box(x, z, LAND_Y - 0.2, LAND_Y + 2.9, l, w, a, hex('#d6cbb2'));
    S.kind = KIND.PLAIN;
    S.hip(x, z, l, w, a, LAND_Y + 2.9, Math.min(1.4, w * 0.3), hex('#c0643a'), { over: 0.45, hips: true });
  }

  // ---- cannons on the OSM nodes, muzzles outward; one on a raised mount at each corner of tier 1 ----
  const gun = hex('#3b3832'), wood = hex('#5a4434');
  for (const [p, q, r] of [[COURTS[0][0], COURTS[1][0], COURTS[0][1]], [COURTS[1][0], COURTS[0][0], COURTS[1][1]]]) {
    // bisector into the corner, from the two faces meeting there
    const u = (v) => { const l = Math.hypot(v[0] - p[0], v[1] - p[1]); return [(v[0] - p[0]) / l, (v[1] - p[1]) / l]; };
    const a = u(q), b = u(r), m = [a[0] + b[0], a[1] + b[1]], ml = Math.hypot(...m), ex = -m[0] / ml, ez = -m[1] / ml;
    const x = p[0] - ex * 2.4, z = p[1] - ez * 2.4;
    S.kind = KIND.MASONRY;
    S.box(x, z, RAMP, RAMP + 0.45, 2.0, 2.0, Math.atan2(ez, ex), RENDER, { top: shade(RENDER, 1.15) });
    S.kind = KIND.PLAIN;
    S.box(x, z, RAMP + 0.45, RAMP + 0.85, 1.3, 0.75, Math.atan2(ez, ex), wood);
    S.beam([x - ex * 0.9, RAMP + 1.05, z - ez * 0.9], [x + ex * 0.2, RAMP + 1.05, z + ez * 0.2], 0.5, 0.5, gun);
    S.beam([x + ex * 0.2, RAMP + 1.05, z + ez * 0.2], [x + ex * 1.7, RAMP + 1.12, z + ez * 1.7], 0.34, 0.34, gun);
  }
  for (const [x0, z0] of CANNONS) {
    // a cannon on a tier moves with that tier's outline; those on the bastion stay on their OSM nodes
    const o = inRing(x0, z0, TOP_OSM) ? OFF3 : inRing(x0, z0, MID_OSM) ? OFF2 : [0, 0], x = x0 + o[0], z = z0 + o[1];
    const y = inRing(x, z, TOP) ? y2 : inRing(x, z, MID) ? y1 : RAMP;
    const dx = x - c[0], dz = z - c[1], l = Math.hypot(dx, dz), ex = dx / l, ez = dz / l;
    S.kind = KIND.PLAIN;
    S.box(x, z, y, y + 0.42, 1.3, 0.75, Math.atan2(ez, ex), wood);
    S.beam([x - ex * 0.9, y + 0.62, z - ez * 0.9], [x + ex * 0.2, y + 0.62, z + ez * 0.2], 0.5, 0.5, gun);
    S.beam([x + ex * 0.2, y + 0.62, z + ez * 0.2], [x + ex * 1.5, y + 0.66, z + ez * 1.5], 0.34, 0.34, gun);
  }
  S.kind = keep;

  // ---- night: LED outline (colour-cycling) and floodlights ----
  const ledMat = lightMaterial(0xffffff, 1.5);
  const led = new THREE.Mesh(LT.geometry(), ledMat);
  led.renderOrder = 19;
  led.userData.landmark = id;
  group.add(led);
  const pts = glowPoints(flood, floodCol, 8);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);

  // ---- the flag, 12 × 8 m, at the masthead ----
  flag(group, { at: [c[0], yt + POLE - 0.4, c[1]], w: 12, h: 8, look: 'vn', landmark: id }); // waves down-wind (anim.js)

  const col = new THREE.Color();
  return {
    update(time) {
      // slow drift through the colours, with a warm-white pause each cycle
      const t = (time / 40) % 1;
      if (t < 0.2) col.setRGB(1, 0.86, 0.62); else col.setHSL((t - 0.2) / 0.8, 0.85, 0.55);
      ledMat.uniforms.uColor.value.copy(col);
    },
  };
}
