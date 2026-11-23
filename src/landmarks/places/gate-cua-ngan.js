import { KIND, Buf, hex, shade, mix, unflat, rand } from '../../geo/buf.js';
import { gateAxis, CITADEL_PASSAGE } from '../../geo/gates.js';
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
const TOP = 1.4; // cornice top over the wall walk: with the 0.8 m parapet the block stands ~8.8 m (Street View, 2026)
// The block's brick is the rampart's (kinhthanh.js: shade(PAL.brick, 0.86)) with a little of the old red left in it:
// weathered near-black brown with grey streaks, the same brick as the wall beside it (Street View, 2026)
const RAMPART = shade(PAL.brick, 0.86);
const BRICK = mix(RAMPART, hex('#6e4a3c'), 0.3), BRICK_D = hex('#3a3833'), RENDER = hex('#7b7a72'), RENDER_D = hex('#5c5b55');
const FRAME = shade(BRICK, 0.9), DARK = hex('#1f1a18'), PANEL = hex('#b8b2a2'), PANEL_IN = hex('#4a4540');
const TOWER = mix(RAMPART, hex('#6e4a3c'), 0.25), UPPER = hex('#6f6c64'), TILE = hex('#4f4740'), RIDGE = hex('#6a665e');
const STREAK = [hex('#46443e'), hex('#4a4d3e'), hex('#3c3a35')]; // soot and lichen from the cornice down (kinhthanh.js)
const WHITE = hex('#a9a79e'), CAUSE = hex('#858577'), CAUSE_D = hex('#4f5446'), PAVE = hex('#8a857a'), RUBBLE = hex('#6a665b');
const BW = 5.9; // the causeway over the moat (OSM man_made=bridge way 1431132256)
const DEPTH = 13.0; // the masonry block across the wall (satellite 12-14 m; OSM 12.0 m): the passage runs on through the earth rampart

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

  // rays in the gate's own (u, v) frame against mapped edges: the rampart band (data.wall) and the land's edge (the moat)
  const edges = (polys) => { const out = []; for (const poly of polys || []) for (const r of poly.map(unflat)) for (let i = 0; i < r.length; i++) out.push([r[i], r[(i + 1) % r.length]]); return out; };
  const bandE = edges(data.wall), landE = edges(data.land);
  const hitsOn = (E, u0, v0, du, dv, far = 40) => {
    const p = P(u0, v0), dx = du * ux + dv * ox, dz = du * uz + dv * oz, out = [];
    for (const [a, b] of E) {
      const ex = b[0] - a[0], ez = b[1] - a[1], den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-9) continue;
      const qx = a[0] - p[0], qz = a[1] - p[1], t = (qx * ez - qz * ex) / den, s = (qx * dz - qz * dx) / den;
      if (s >= 0 && s <= 1 && Math.abs(t) < far) out.push(t);
    }
    return out;
  };
  const near = (E, u0, v0, du, dv, dflt) => { const h = hitsOn(E, u0, v0, du, dv).filter((t) => t > 0.05); return h.length ? Math.min(...h) : dflt; };
  // where the rampart's faces cross the axis: the notch the passage opens into, and the outer face
  const vNotch = -near(bandE, 0, 0, 0, -1, 6.0), vOut = near(bandE, 0, 0, 0, 1, 5.6) + 0.8; // the block stands a little proud of the outer face
  const vIn = Math.max(vNotch - 0.4, vOut - DEPTH); // its inner face; behind it the passage runs on, open, through the rampart
  const uL = -near(bandE, 0, vNotch - 1, -1, 0, 3.7), uR = near(bandE, 0, vNotch - 1, 1, 0, 4.7); // the notch's sides
  const vFace = -near(bandE, uR + 1.5, 0, 0, -1, 11.4); // the rampart's inner face along Ông Ích Khiêm
  const vBank = near(landE, 0, vOut, 0, 1, 8.4) + vOut; // the moat's edge
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
    // the weathering: soot and lichen streaks running down from the cornice over the brick and the pilasters, as on the
    // rampart beside it (no rectangular render patches: the render is left on the pilasters and the cornice band). Each
    // streak is a single quad laid on its face at its own small offset, and no two on one face overlap.
    const fq = (u0, u1, ya, yb, off, col) => S.quad(V(u0, v + sg * off, ya), V(u1, v + sg * off, ya), V(u1, v + sg * off, yb), V(u0, v + sg * off, yb), col, N(0, sg));
    for (const s of [-1, 1]) {
      for (let j = 0; j < 3; j++) { // three slots between the arch's brick panel (|u| 3.0) and the pilaster (|u| 7.3)
        const k = rand(j, 21 + sg + s), w = 0.3 + k * 0.45, uc = 3.4 + j * 1.3 + (0.6 - w / 2) * rand(j, 23 + sg + s);
        const ya = LAND_Y + 1.2 + rand(j, 25 + sg + s) * 3.4;
        fq(s * uc, s * (uc + w), ya, yT - 1.5, 0.04, mix(BRICK, STREAK[(j + (s > 0 ? 1 : 0)) % 3], 0.45));
      }
      const up = s * (W / 2 - 0.6); // a dark streak down each pilaster, just proud of its rendered face (front at 0.3)
      fq(up - 0.35, up + 0.1, LAND_Y + 2.2 + rand(s, 27 + sg) * 2, yT - 0.6, 0.34, mix(RENDER, RENDER_D, 0.6));
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

  // ---- the vọng lâu: two masonry storeys under glazed tile, weathered dark, the eaves near straight with short tips ----
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
  S.hip(...P(0, tv), TW, TD, AU, y1, 1.05, TILE, { flare: 0.12, over: 0.6, ridgeCol: RIDGE, hips: true, horns: false, glazed: true, segs: 3, fascia: 0.14, fasciaCol: shade(TILE, 0.6) });
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
  S.hip(...P(0, tv), UW, UD, AU, y2, RH, TILE, { flare: 0.12, over: 0.5, ridgeCol: RIDGE, hips: true, horns: false, glazed: true, segs: 3, fascia: 0.12, fasciaCol: shade(TILE, 0.6) });
  // ridge ornaments: the curled ends (rồng chầu, read at this scale as raised scrolls) and the finial: a gourd and a spike
  const yR = y2 + RH, rl = Math.max(0.3, (UW + 1.0) / 2 - ((UD + 1.0) / 2) * 0.92);
  for (const s of [-1, 1]) { box(s * rl, tv, yR - 0.05, yR + 0.42, 0.22, 0.22, RIDGE); box(s * (rl - 0.18), tv, yR + 0.3, yR + 0.45, 0.42, 0.18, RIDGE); }
  box(0, tv, yR - 0.05, yR + 0.3, 0.42, 0.42, RIDGE);
  box(0, tv, yR + 0.3, yR + 0.62, 0.3, 0.3, RIDGE, { taper: 0.5 });
  box(0, tv, yR + 0.62, yR + 1.45, 0.06, 0.06, hex('#4a4744'));
  // ---- behind the block: the passage runs on, open, through the earth rampart to Ông Ích Khiêm ----
  // kinhthanh.js cuts the slot (CITADEL_PASSAGE.slot) and leaves its sides to the gate model; at its city end the slot
  // opens into the mapped notch, and the notch's mouth is framed by two rendered piers with stepped caps (Street View)
  const hs = CITADEL_PASSAGE.slot / 2, yW = LAND_Y + WALL_H;
  if (vNotch < vIn - 0.2) {
    S.kind = KIND.MASONRY;
    for (const sg of [-1, 1]) { const u = sg * hs; S.quad(V(u, vNotch, y0), V(u, vIn, y0), V(u, vIn, yW), V(u, vNotch, yW), BRICK, N(-sg, 0)); }
    S.kind = KIND.PLAIN;
    for (const sg of [-1, 1]) box(sg * (hs + 0.3), (vNotch + vIn) / 2, yW, yW + 0.5, 0.6, vIn - vNotch, RENDER_D, { top: shade(RENDER, 1.1) }); // the cutting's coping
  }
  for (const u of [uL, uR]) {
    const uc = u + Math.sign(u) * 0.1, vc = vFace + 0.1;
    box(uc, vc, y0, LAND_Y + 4.6, 1.6, 1.6, RENDER);
    box(uc, vc, LAND_Y + 4.6, LAND_Y + 4.85, 1.9, 1.9, shade(RENDER, 1.06));
    box(uc, vc, LAND_Y + 4.85, LAND_Y + 5.45, 1.25, 1.25, RENDER, { taper: 0.7 });
    box(uc, vc, LAND_Y + 5.45, LAND_Y + 5.75, 0.5, 0.5, RENDER_D);
    const vf = vc - 0.8 - 0.03, ua = uc - 0.5, ub = uc + 0.2; // a soot streak down the face it shows the street
    S.quad(V(ua, vf, LAND_Y + 1.0), V(ub, vf, LAND_Y + 1.0), V(ub, vf, LAND_Y + 4.55), V(ua, vf, LAND_Y + 4.55), mix(RENDER, RENDER_D, 0.25), N(0, -1));
    box(uc, vc, y0, LAND_Y + 0.5, 1.7, 1.7, BRICK_D); // its damp foot
  }
  // a paved apron on the wall walk round the block, where the walk meets the gate (sandy strips on the satellite)
  S.kind = KIND.ROAD;
  for (const sg of [-1, 1]) {
    const u0 = sg * (W / 2), u1 = sg * (W / 2 + 4), va = vFace + 0.4, vb = vOut - 0.8 - 1.6, y = yW + 0.04;
    S.quad(V(u0, va, y), V(u1, va, y), V(u1, vb, y), V(u0, vb, y), shade(PAL.stone, 0.7), [0, 1, 0]);
  }
  S.kind = KIND.PLAIN;

  // ---- the forecourt: a paved terrace at the gate's foot, low balustrades along the moat edge over a rubble revetment ----
  const TU = W / 2 + 3.5, bh = BW / 2, yb = LAND_Y + 0.08;
  S.kind = KIND.ROAD;
  for (const sg of [-1, 1]) { const u0 = sg * (OPEN_W / 2 + 0.6), u1 = sg * TU; S.quad(V(u0, vOut + 0.3, yb), V(u1, vOut + 0.3, yb), V(u1, vBank - 0.1, yb), V(u0, vBank - 0.1, yb), PAVE, [0, 1, 0]); }
  S.kind = KIND.MASONRY;
  { const vr = vBank + 0.06, ua = -TU - 6, ub = TU + 6; S.quad(V(ua, vr, POND_Y - 0.8), V(ub, vr, POND_Y - 0.8), V(ub, vr, LAND_Y + 0.05), V(ua, vr, LAND_Y + 0.05), RUBBLE, N(0, 1)); }
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    const u0 = sg * (bh + 0.3), u1 = sg * TU, um = (u0 + u1) / 2, len = Math.abs(u1 - u0), vb = vBank - 0.25;
    box(um, vb, yb - 0.05, yb + 0.28, len, 0.36, WHITE, { top: shade(WHITE, 0.96) }); // plinth
    box(um, vb, yb + 0.8, yb + 0.92, len, 0.3, WHITE, { top: shade(WHITE, 1.04) }); // hand-rail
    for (let x = 0.5; x < len - 0.3; x += 0.42) box(u0 + sg * x, vb, yb + 0.28, yb + 0.8, 0.14, 0.14, shade(WHITE, 0.9)); // vase balusters
    for (let x = 0; x <= len + 0.01; x += len / Math.max(1, Math.round(len / 2.4))) { // posts, a heavier one at each end
      const end = x < 0.01 || x > len - 0.01, sz = end ? 0.5 : 0.34;
      box(u0 + sg * x, vb, yb - 0.05, yb + (end ? 1.15 : 1.0), sz, sz, WHITE);
      box(u0 + sg * x, vb, yb + (end ? 1.15 : 1.0), yb + (end ? 1.27 : 1.1), sz + 0.1, sz + 0.1, shade(WHITE, 0.9));
    }
  }

  // the tiled roofs drop on the terrace: a lime-grey cap where the first roof's ridges meet the terrace
  (S.paved = S.paved || []).push([n0, S.n]);

  // ---- Cầu Cửa Ngăn: the causeway over the moat (the shared road-bridge deck leaves it out; city.js) ----
  const nb = S.n;
  const prof = bridgeProfiles(data);
  let road = null, Pr = null;
  for (const rr of data.roads || []) { const pr = Array.isArray(rr) && rr[1] && prof.get(rr[2]); if (pr && pr.name === 'Cầu Cửa Ngăn') { road = rr; Pr = pr; break; } }
  if (road) {
    const R = resample(unflat(road[2]), 1.5);
    const pts = R.pts, ss = R.s, wet = POND_Y - 0.8;
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
        const gateEnd = end && Math.hypot(pts[i][0] - cx, pts[i][1] - cz) < 20; // there the forecourt's balustrade takes over
        if (end && !gateEnd) { // the wing along the bank
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
