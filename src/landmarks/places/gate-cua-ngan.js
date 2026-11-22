import { KIND, Buf, hex, shade, unflat, rand } from '../../geo/buf.js';
import { gateAxis } from '../../geo/gates.js';
import { bridgeProfiles, resample } from '../../geo/bridges.js';
import { LAND_Y, WALL_H, PAL, ROAD_W, POND_Y } from '../../config.js';
import { lightMaterial } from '../../geo/materials.js';

// Cửa Ngăn, formally Thể Nhơn môn (體仁門, also read Thể Nhân), a south-east gate of the Kinh thành Huế, to the left
// of Kỳ Đài as seen from the river, with Cầu Cửa Ngăn over the moat in front. Notes and sources: docs/places/gate-cua-ngan.md.
//
// Sourced: the arched passage built in 1809 under Gia Long (first named Thể Nguyên), the vọng lâu added in 1829 under
// Minh Mạng, who renamed it Thể Nhơn; the kings' road from the palace to Phu Văn Lâu passed through it, walled on both
// sides, hence "the barred gate"; one of the ten main gates, "3 tầng, cao chừng 16m". Plan, centre and axis: the OSM
// gate building (way 619851622, 17.1 m along the wall × 12.0 m), the street through it (way 1385076381) and the
// bridge (man_made=bridge way 1431132256, 56 m × 5.9 m; road way 204839263).
//
// From photographs (Wikimedia Commons, Category:Thể Nhân Gate, 2010-2018): the gate block is weathered red brick
// with patches of grey lime render left, corner pilasters rendered grey, a recessed brick panel round one round-arched
// passage about 3.8 m wide and 4.6 m to the crown, a framed name panel above it, a moulded cornice about 7.8 m up and a
// solid parapet with corner posts. The vọng lâu is masonry, not timber: a bare red-brick lower storey with three
// arches on its long faces under a skirt of orange-yellow glazed tile, a small parapeted terrace, then a small
// rendered upper storey with one arch on each face under a hipped roof with curled ridge ends and a spike finial.
// The bridge is a masonry causeway with white vase balustrades and a small vaulted culvert near the gate end.
export const id = 'gate:Cửa Ngăn';
const NAME = 'Cửa Ngăn';

const OPEN_W = 3.8, OPEN_H = 4.6; // inside the 5.6 m slot city.js and kinhthanh.js cut through the rampart
const TOP = 1.2; // cornice top over the wall walk (photo: ~7.8 m over the road, the walk at 6.6 m)
const BRICK = hex('#7a4c40'), BRICK_D = hex('#553a31'), RENDER = hex('#7b7a72'), RENDER_D = hex('#5c5b55');
const FRAME = hex('#875646'), DARK = hex('#1f1a18'), PANEL = hex('#b8b2a2'), PANEL_IN = hex('#4a4540');
const TOWER = hex('#8a5442'), UPPER = hex('#8e8a7e'), TILE = hex('#9a6a3e'), RIDGE = hex('#cfc7b5');
const WHITE = hex('#c4c2b8'), CAUSE = hex('#858577'), CAUSE_D = hex('#4f5446');

export function build({ data, S, group, place, THREE }) {
  const norm = (s) => String(s || '').normalize('NFC');
  const g = (data.gates || []).find((q) => norm(q.n) === norm(NAME));
  if (!g) throw new Error('gate not in data.gates');
  const kt = (data.places || []).find((q) => q.id === 'kinhthanh');
  const centre = kt ? [kt.x / 10, kt.z / 10] : [g.c[0] / 10 - 600, g.c[1] / 10 - 800];
  const ax = gateAxis(g, centre), cx = ax.cx, cz = ax.cz;
  // O: out of the city (towards the moat and the river), U: along the wall
  let ox = ax.px, oz = ax.pz;
  if ((cx - centre[0]) * ox + (cz - centre[1]) * oz < 0) { ox = -ox; oz = -oz; }
  const ux = -oz, uz = ox, AU = Math.atan2(uz, ux);
  const P = (u, v) => [cx + u * ux + v * ox, cz + u * uz + v * oz];
  const V = (u, v, y) => { const p = P(u, v); return [p[0], y, p[1]]; };
  const N = (nu, nv, ny = 0) => [nu * ux + nv * ox, ny, nu * uz + nv * oz];
  const box = (u, v, y0, y1, su, sv, col, opts) => { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, AU, col, opts); };

  // where the rampart's faces cross the axis: the block reaches a hand's breadth past both
  let vIn = -6.4, vOut = 6.4;
  {
    const hits = [];
    for (const poly of data.wall || []) for (const r of poly.map(unflat)) for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], ex = b[0] - a[0], ez = b[1] - a[1], den = ox * ez - oz * ex;
      if (Math.abs(den) < 1e-9) continue;
      const qx = a[0] - cx, qz = a[1] - cz, t = (qx * ez - qz * ex) / den, s = (qx * oz - qz * ox) / den;
      if (s >= 0 && s <= 1 && Math.abs(t) < 20) hits.push(t);
    }
    const ins = hits.filter((t) => t < 0), outs = hits.filter((t) => t > 0);
    if (ins.length) vIn = Math.max(...ins) - 0.4; // the nearest inner face (the notch the passage opens into)
    if (outs.length) vOut = Math.min(...outs) + 0.8; // the block stands a little proud of the outer face
  }
  const W = 17.1; // along the wall (OSM)
  const y0 = LAND_Y - 0.5, yT = LAND_Y + WALL_H + TOP, fl = LAND_Y + 0.02;
  const r = OPEN_W / 2, crown = LAND_Y + OPEN_H, spring = crown - r, K = 10;
  const arc = (k, rr = r, sp = spring, n = K) => { const th = Math.PI - (Math.PI * k) / n; return [rr * Math.cos(th), sp + rr * Math.sin(th)]; };
  const n0 = S.n;

  // ---- the gate block, the passage driven through it ----
  S.kind = KIND.MASONRY;
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    const n = N(0, sg);
    const q = (u0, u1, ya, yb) => S.quad(V(u0, v, ya), V(u1, v, ya), V(u1, v, yb), V(u0, v, yb), BRICK, n);
    q(-W / 2, -r, y0, yT); q(r, W / 2, y0, yT); q(-r, r, crown, yT);
    for (let k = 0; k < K; k++) { const [sa, ya] = arc(k), [sb, yb] = arc(k + 1); S.quad(V(sa, v, ya), V(sb, v, yb), V(sb, v, crown), V(sa, v, crown), BRICK, n); }
  }
  for (const sg of [-1, 1]) { const u = (sg * W) / 2; S.quad(V(u, vIn, y0), V(u, vOut, y0), V(u, vOut, yT), V(u, vIn, yT), BRICK, N(sg, 0)); }
  S.kind = KIND.ROAD;
  S.quad(V(-W / 2, vIn, yT), V(-W / 2, vOut, yT), V(W / 2, vOut, yT), V(W / 2, vIn, yT), shade(PAL.stone, 0.8), [0, 1, 0]);
  S.quad(V(-r, vIn - 0.3, fl), V(-r, vOut + 0.3, fl), V(r, vOut + 0.3, fl), V(r, vIn - 0.3, fl), shade(PAL.stone, 0.6), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  for (let k = 0; k < K; k++) { // the barrel vault and the passage's dark sides
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    S.quad(V(sa, vIn + 0.01, ya), V(sa, vOut - 0.01, ya), V(sb, vOut - 0.01, yb), V(sb, vIn + 0.01, yb), shade(BRICK, 0.38), N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
  }
  for (const sg of [-1, 1]) { const u = sg * (r - 0.01); S.quad(V(u, vIn, fl), V(u, vOut, fl), V(u, vOut, spring), V(u, vIn, spring), DARK, N(-sg, 0)); }

  // ---- the two faces: damp foot, rendered pilasters, the arch's brick panel, the name panel, render patches, cornice ----
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    const t = v + sg * 0.1;
    box(0, t + sg * 0.02, y0, LAND_Y + 0.6, W + 0.3, 0.25, BRICK_D);
    for (const s of [-1, 1]) {
      box(s * (W / 2 - 0.6), t + sg * 0.05, LAND_Y + 0.6, yT - 0.6, 1.3, 0.3, RENDER); // corner pilasters, rendered grey
      box(s * 2.75, t, fl, LAND_Y + 5.8, 0.5, 0.2, FRAME); // the brick panel's sides
      box(s * (r + 0.25), t + sg * 0.03, fl, spring, 0.5, 0.2, FRAME); // the arch's jambs
    }
    box(0, t, LAND_Y + 5.8, LAND_Y + 6.1, 6.0, 0.2, FRAME); // the panel's head
    S.kind = KIND.MASONRY;
    for (let k = 0; k < K; k++) { // the arch's brick voussoir ring
      const [sa, ya] = arc(k, r + 0.3), [sb, yb] = arc(k + 1, r + 0.3);
      S.beam(V(sa, t + sg * 0.04, ya), V(sb, t + sg * 0.04, yb), 0.24, 0.6, FRAME);
    }
    S.kind = KIND.PLAIN;
    // the name panel: a framed rendered tablet with the characters in relief
    const pb = LAND_Y + 6.25, ph = 1.05;
    box(0, t + sg * 0.06, pb, pb + ph, 2.6, 0.16, RENDER);
    box(0, t + sg * 0.1, pb + 0.12, pb + ph - 0.12, 2.3, 0.08, PANEL);
    // what is left of the lime render: patches over the brick, most near the top and the corners (fixed pattern)
    for (let i = 0; i < 6; i++) {
      const su = 1.2 + rand(i, 7 + sg) * 2.2, sh = 0.8 + rand(i, 11 + sg) * 2.0;
      const side = i % 2 ? 1 : -1, u = side * (3.3 + rand(i, 3 + sg) * (W / 2 - 4.9 - su / 2) + su / 2) * 1;
      const yb = LAND_Y + 0.8 + rand(i, 5 + sg) * (yT - LAND_Y - 1.6 - sh);
      box(Math.max(-W / 2 + 1.3 + su / 2, Math.min(W / 2 - 1.3 - su / 2, u)), t + sg * 0.01, yb, yb + sh, su, 0.12, i % 3 ? RENDER : RENDER_D);
    }
    box(0, t + sg * 0.01, yT - 1.5, yT - 0.6, W - 2.6, 0.12, RENDER_D); // the frieze under the cornice
    box(0, t + sg * 0.1, yT - 0.6, yT - 0.2, W + 0.5, 0.4, RENDER);
    box(0, t + sg * 0.16, yT - 0.2, yT, W + 0.7, 0.52, shade(RENDER, 1.08), { top: shade(PAL.stone, 0.85) });
  }

  // ---- the solid parapet round the flat top, with posts at the corners and along the faces ----
  const D = vOut - vIn, vm = (vIn + vOut) / 2, PH = 0.8;
  for (const [len, alongU, off] of [[W, true, vIn + 0.25], [W, true, vOut - 0.25], [D, false, -W / 2 + 0.25], [D, false, W / 2 - 0.25]]) {
    if (alongU) box(0, off, yT, yT + PH, len, 0.5, RENDER, { top: shade(RENDER, 1.15) });
    else box(off, vm, yT, yT + PH, 0.5, len, RENDER, { top: shade(RENDER, 1.15) });
  }
  for (const v of [vIn + 0.25, vOut - 0.25]) for (const u of [-W / 2 + 0.25, -W / 2 + 4.5, W / 2 - 4.5, W / 2 - 0.25]) {
    box(u, v, yT, yT + PH + 0.45, 0.62, 0.62, RENDER, { top: shade(RENDER, 1.15) });
    box(u, v, yT + PH + 0.45, yT + PH + 0.6, 0.4, 0.4, RENDER_D);
  }

  // ---- the vọng lâu: two masonry storeys under orange-yellow glazed tile ----
  const TW = 8.5, TD = 7.0, H1 = 3.8; // lower storey (front width and height measured on the bridge-axis Street View, 2026; depth estimated)
  const tv = vm, y1 = yT + H1;
  S.kind = KIND.MASONRY;
  box(0, tv, yT, y1, TW, TD, TOWER);
  S.kind = KIND.PLAIN;
  box(0, tv, y1 - 0.35, y1, TW + 0.24, TD + 0.24, RENDER); // the cornice band
  // arched openings, as dark recesses with a brick rim; faces: long (±O) and short (±U)
  const opening = (face, s, w, sill, top, rimCol) => {
    const { at, right, nrm } = face, rr = w / 2, sp = top - rr, M = 6;
    const pt = (x, y, out = 0) => [at[0] + right[0] * x + nrm[0] * out, y, at[1] + right[1] * x + nrm[1] * out];
    const n3 = [nrm[0], 0, nrm[1]];
    S.quad(pt(s - rr, sill, 0.03), pt(s + rr, sill, 0.03), pt(s + rr, sp, 0.03), pt(s - rr, sp, 0.03), DARK, n3);
    for (let k = 0; k < M; k++) {
      const [a0, b0] = arc(k, rr, sp, M), [a1, b1] = arc(k + 1, rr, sp, M);
      S.tri(pt(s, sp, 0.03), pt(s + a0, b0, 0.03), pt(s + a1, b1, 0.03), DARK, n3);
      const [c0, d0] = arc(k, rr + 0.22, sp, M), [c1, d1] = arc(k + 1, rr + 0.22, sp, M);
      S.quad(pt(s + a0, b0, 0.06), pt(s + a1, b1, 0.06), pt(s + c1, d1, 0.06), pt(s + c0, d0, 0.06), rimCol, n3);
    }
  };
  const faces = (w, d, v0) => [
    { at: P(0, v0 + d / 2), right: [ux, uz], nrm: [ox, oz], len: w },
    { at: P(0, v0 - d / 2), right: [ux, uz], nrm: [-ox, -oz], len: w },
    { at: P(w / 2, v0), right: [ox, oz], nrm: [ux, uz], len: d },
    { at: P(-w / 2, v0), right: [ox, oz], nrm: [-ux, -uz], len: d },
  ];
  for (const f of faces(TW, TD, tv)) {
    if (f.len > 7.5) { opening(f, 0, 2.0, yT + PH - 0.1, yT + 2.75, shade(TOWER, 1.15)); for (const s of [-2.75, 2.75]) opening(f, s, 1.25, yT + PH + 0.1, yT + 2.3, shade(TOWER, 1.15)); }
    else opening(f, 0, 1.5, yT + PH, yT + 2.5, shade(TOWER, 1.15));
  }
  // first roof: a tiled skirt round the tower, its top a small parapeted terrace round the upper storey
  S.hip(...P(0, tv), TW, TD, AU, y1, 1.05, TILE, { flare: 0.32, over: 0.6, ridgeCol: RIDGE, hips: true, glazed: true, segs: 3, fascia: 0.14, fasciaCol: shade(TILE, 0.6) });
  const terr = y1 + 0.95;
  box(0, tv, terr - 0.5, terr, 5.6, 5.0, RENDER, { top: shade(PAL.stone, 0.8) });
  for (const [len, alongU, off] of [[5.6, true, tv - 2.35], [5.6, true, tv + 2.35], [5.0, false, -2.65], [5.0, false, 2.65]]) {
    if (alongU) box(0, off, terr, terr + 0.45, len, 0.3, RENDER, { top: shade(RENDER, 1.15) });
    else box(off, tv, terr, terr + 0.45, 0.3, len, RENDER, { top: shade(RENDER, 1.15) });
  }
  for (const su of [-2.65, 2.65]) for (const sv of [-2.35, 2.35]) box(su, tv + sv, terr, terr + 0.8, 0.42, 0.42, RENDER, { top: RIDGE });
  // the upper storey, rendered, one arch on each face, then the top roof
  const UW = 4.0, UD = 3.6, y2 = terr + 2.05;
  box(0, tv, terr, y2, UW, UD, UPPER);
  box(0, tv, y2 - 0.28, y2, UW + 0.2, UD + 0.2, RENDER);
  for (const f of faces(UW, UD, tv)) opening(f, 0, 1.15, terr + 0.35, terr + 1.65, shade(UPPER, 0.85));
  const RH = 1.15;
  S.hip(...P(0, tv), UW, UD, AU, y2, RH, TILE, { flare: 0.35, over: 0.5, ridgeCol: RIDGE, hips: true, glazed: true, segs: 3, fascia: 0.12, fasciaCol: shade(TILE, 0.6) });
  // ridge ornaments: the curled ends (rồng chầu, read at this scale as raised scrolls) and the finial: a gourd and a spike
  const yR = y2 + RH, rl = Math.max(0.3, (UW + 1.0) / 2 - ((UD + 1.0) / 2) * 0.92);
  for (const s of [-1, 1]) { box(s * rl, tv, yR - 0.05, yR + 0.42, 0.22, 0.22, RIDGE); box(s * (rl - 0.18), tv, yR + 0.3, yR + 0.45, 0.42, 0.18, RIDGE); }
  box(0, tv, yR - 0.05, yR + 0.3, 0.42, 0.42, RIDGE);
  box(0, tv, yR + 0.3, yR + 0.62, 0.3, 0.3, RIDGE, { taper: 0.5 });
  box(0, tv, yR + 0.62, yR + 1.45, 0.06, 0.06, hex('#4a4744'));
  // the tiled roofs drop on the terrace: a lime-grey cap where the first roof's ridges meet the terrace
  (S.paved = S.paved || []).push([n0, S.n]);

  // ---- Cầu Cửa Ngăn: the causeway over the moat (the shared road-bridge deck leaves it out; city.js) ----
  const nb = S.n;
  const prof = bridgeProfiles(data);
  let road = null, Pr = null;
  for (const rr of data.roads || []) { const pr = Array.isArray(rr) && rr[1] && prof.get(rr[2]); if (pr && pr.name === 'Cầu Cửa Ngăn') { road = rr; Pr = pr; break; } }
  if (road) {
    const R = resample(unflat(road[2]), 1.5);
    const pts = R.pts, ss = R.s, BW = 5.9, wet = POND_Y - 0.8;
    const side = (i) => { // unit vector to the left of the road at point i
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    };
    const at = (i, o, y) => { const n = side(i); return [pts[i][0] + n[0] * o, y, pts[i][1] + n[1] * o]; };
    const dy = (i) => Pr.y(ss[i]);
    for (let i = 0; i + 1 < pts.length; i++) {
      const n = side(i), nL = [n[0], 0, n[1]], nR = [-n[0], 0, -n[1]];
      S.kind = KIND.ROAD;
      S.quad(at(i, -BW / 2, dy(i)), at(i + 1, -BW / 2, dy(i + 1)), at(i + 1, BW / 2, dy(i + 1)), at(i, BW / 2, dy(i)), hex(PAL.road[2]), [0, 1, 0]);
      S.kind = KIND.MASONRY;
      for (const [o, nn] of [[BW / 2, nL], [-BW / 2, nR]]) {
        S.quad(at(i, o, wet), at(i + 1, o, wet), at(i + 1, o, dy(i + 1) - 0.25), at(i, o, dy(i) - 0.25), CAUSE, nn);
        S.quad(at(i, o, wet), at(i + 1, o, wet), at(i + 1, o, POND_Y + 0.35), at(i, o, POND_Y + 0.35), CAUSE_D, nn); // the damp, mossy foot
      }
      S.kind = KIND.PLAIN;
      // the balustrade: a plinth and a hand-rail, vase balusters between them, a post every few metres
      for (const o of [BW / 2 - 0.15, -BW / 2 + 0.15]) {
        S.beam(at(i, o, dy(i) + 0.1), at(i + 1, o, dy(i + 1) + 0.1), 0.34, 0.3, WHITE);
        S.beam(at(i, o, dy(i) + 0.82), at(i + 1, o, dy(i + 1) + 0.82), 0.3, 0.14, WHITE);
        for (const f of [0.25, 0.75]) {
          const p = at(i, o, 0), q = at(i + 1, o, 0), x = p[0] + (q[0] - p[0]) * f, z = p[2] + (q[2] - p[2]) * f, yy = dy(i) + (dy(i + 1) - dy(i)) * f;
          S.box(x, z, yy + 0.25, yy + 0.75, 0.14, 0.14, Math.atan2(n[1], n[0]), shade(WHITE, 0.94));
        }
      }
    }
    // posts, and at each end a heavier pier where the balustrade turns along the bank
    const len = ss[ss.length - 1];
    for (let i = 0; i < pts.length; i++) {
      if (i !== 0 && i !== pts.length - 1 && Math.round(ss[i] / 1.5) % 2) continue;
      const end = i === 0 || i === pts.length - 1, n = side(i), a = Math.atan2(n[1], n[0]);
      for (const o of [BW / 2 - 0.15, -BW / 2 + 0.15]) {
        const p = at(i, o, 0), s = end ? 0.55 : 0.32, top = dy(i) + (end ? 1.2 : 0.98);
        S.box(p[0], p[2], dy(i) - 0.1, top, s, s, a, WHITE);
        S.box(p[0], p[2], top, top + 0.12, s + 0.12, s + 0.12, a, shade(WHITE, 0.92));
        if (end) { // the wing along the bank
          const out = Math.sign(o), q0 = at(i, o, 0), dir = [n[0] * out, n[1] * out], wl = i === pts.length - 1 ? 5.5 : 3.0;
          const q1 = [q0[0] + dir[0] * wl, q0[2] + dir[1] * wl], gy = LAND_Y + 0.05;
          S.box((q0[0] + q1[0]) / 2, (q0[2] + q1[1]) / 2, gy - 0.3, gy + 0.85, wl, 0.3, a, WHITE, { top: shade(WHITE, 0.96) });
          S.box(q1[0], q1[1], gy - 0.3, gy + 1.05, 0.48, 0.48, a, WHITE);
        }
      }
    }
    // the small vaulted culvert near the gate end, seen on both sides of the causeway
    const sc = Math.max(4, len - 12), ic = ss.findIndex((s) => s >= sc), cw = 3.0, csp = POND_Y + 0.15, cr = cw / 2;
    if (ic > 0) for (const o of [BW / 2 + 0.03, -BW / 2 - 0.03]) {
      const n = side(ic), sg = Math.sign(o), nn = [n[0] * sg, 0, n[1] * sg];
      const T = [pts[Math.min(pts.length - 1, ic + 1)][0] - pts[Math.max(0, ic - 1)][0], pts[Math.min(pts.length - 1, ic + 1)][1] - pts[Math.max(0, ic - 1)][1]];
      const tl = Math.hypot(T[0], T[1]) || 1, tx = T[0] / tl, tz = T[1] / tl;
      const pc = at(ic, o, 0), q = (x, y, out = 0) => [pc[0] + tx * x + n[0] * sg * out, y, pc[2] + tz * x + n[1] * sg * out];
      S.quad(q(-cr, POND_Y - 0.2), q(cr, POND_Y - 0.2), q(cr, csp), q(-cr, csp), DARK, nn);
      for (let k = 0; k < 6; k++) {
        const [a0, b0] = arc(k, cr, csp, 6), [a1, b1] = arc(k + 1, cr, csp, 6);
        S.tri(q(0, csp), q(a0, b0), q(a1, b1), DARK, nn);
        const [c0, d0] = arc(k, cr + 0.3, csp, 6), [c1, d1] = arc(k + 1, cr + 0.3, csp, 6);
        S.quad(q(a0, b0, 0.03), q(a1, b1, 0.03), q(c1, d1, 0.03), q(c0, d0, 0.03), shade(CAUSE, 1.2), nn);
      }
    }
    // the street lamp the shared lamp-post pass stands over this deck (landmarks/life.js: one each 36 m, the first at
    // 18 m, alternate sides, ROAD_W/2 + 0.5 m out): a small corbelled bay in the balustrade carries it
    for (let s = 18, k = 0; s < len; s += 36, k++) {
      const i = ss.findIndex((x) => x >= s), o = (ROAD_W[Math.max(0, Math.min(5, road[0] | 0))] / 2 + 0.5) * (k % 2 ? 1 : -1);
      if (i < 0) continue;
      const n = side(i), a = Math.atan2(n[1], n[0]), sg = Math.sign(o), w0 = BW / 2, w1 = Math.abs(o) + 0.6;
      const pa = at(i, sg * (w0 + w1) / 2, 0), yy = dy(i);
      S.kind = KIND.MASONRY;
      S.box(pa[0], pa[2], yy - 1.6, yy, w1 - w0, 2.2, a, CAUSE, { top: hex(PAL.road[2]) });
      S.kind = KIND.PLAIN;
      const pe = at(i, sg * (w1 - 0.15), 0);
      S.box(pe[0], pe[2], yy, yy + 0.9, 0.3, 2.2, a, WHITE, { top: shade(WHITE, 0.95) });
    }
  }
  S.kind = KIND.PLAIN;
  (S.paved = S.paved || []).push([nb, S.n]);

  if (!group || !THREE) return null;
  // the panel's characters, read right to left: 體 仁 門 (a small canvas, in the browser only)
  if (typeof document !== 'undefined') {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 96;
    const c = cv.getContext('2d');
    c.fillStyle = '#b8b2a2'; c.fillRect(0, 0, 256, 96);
    c.fillStyle = '#4a4540'; c.font = 'bold 64px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['門', '仁', '體'].forEach((ch, i) => c.fillText(ch, 48 + i * 80, 50));
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const geo = new THREE.PlaneGeometry(2.2, 0.82);
    for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
      const p = P(0, v + sg * 0.27), m = new THREE.Mesh(geo, mat);
      m.position.set(p[0], LAND_Y + 6.25 + 0.525, p[1]);
      m.rotation.y = Math.atan2(ox * sg, oz * sg);
      m.userData.landmark = id;
      group.add(m);
    }
  }
  // after dark (one of the two lit south gates): warm light under both eaves, along the cornice, and in the passage
  const L = new Buf(400);
  const ring = (w, d, v0, y) => {
    const c = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
    for (let k = 0; k < 4; k++) { const a = c[k], b = c[(k + 1) % 4]; L.beam(V(a[0], v0 + a[1], y), V(b[0], v0 + b[1], y), 0.12, 0.1); }
  };
  L.beam = ((beam) => function (a, b, w, h, col = [1, 0.85, 0.6]) { return beam.call(this, a, b, w, h, col); })(L.beam);
  ring(TW + 0.3, TD + 0.3, tv, y1 - 0.4);
  ring(UW + 0.25, UD + 0.25, tv, y2 - 0.32);
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    L.beam(V(-W / 2 + 1.3, v + sg * 0.5, yT - 0.65), V(W / 2 - 1.3, v + sg * 0.5, yT - 0.65), 0.12, 0.1);
    L.box(...P(0, v - sg * 1.2), spring + 0.4, spring + 0.6, 0.5, 0.3, AU, [1, 0.8, 0.5]);
  }
  const lm = new THREE.Mesh(L.geometry(), lightMaterial(0xffd9a0, 1.5));
  lm.renderOrder = 19;
  lm.userData.landmark = id;
  group.add(lm);
  return null;
}
