import { KIND, hex, shade } from '../../geo/buf.ts';
import { gateAxis, CITADEL_PASSAGE } from '../../geo/gates.ts';
import { LAND_Y, WALL_H, PAL } from '../../config.ts';

// Cửa Đông Ba, properly Chánh Đông Môn (正東門), the main east gate of the Kinh thành Huế, at the end of Mai Thúc Loan,
// facing chợ Đông Ba across the moat and sông Đông Ba. Notes and sources: docs/places/gate-cua-dong-ba.md.
//
// Sourced: the arched gate built in 1809 (Gia Long), its watch tower (vọng lâu) added in 1824 (Minh Mạng), the first
// with Đông Bắc to get one; the name after the Đông Hoa fort beside it; fighting here on 5 July 1885; the tower brought
// down by shelling in 1968 and the gate fully restored in 2009. All ten land gates share one form: a nguyệt môn (a
// round-arched passage) through the wall, about 3.82 m wide and 5.19 m high, closed by two iron-banded lim leaves; a
// stone name tablet about 2.31 × 1.10 m over the arch; a two-storey vọng lâu under tube tiles rising more than 9 m
// above the wall, the whole gate about 16-17 m high. Plan, centre and axis: the OSM gate building (data.gates,
// 16.8 m along the wall; its depth set to 11.3 m from the satellite), the passage on the axis gateAxis gives (the slot city.js / kinhthanh.js cut).
// The road bridge over the moat in front is the mapped bridge, drawn by the shared bridge code, not here.
//
// Estimated from Street View (2024 panos from the bridge and from Xuân 68, scaled from the 3.82 m arch) and the
// satellite: the block 11.3 m deep and about 8.2 m above the road, its outer face nearly flush with the rampart's,
// brick weathered near-black, wide projecting corner pilasters, a recessed panel round the arch framed in the same
// brick, the tablet over it, a curved moulded cornice and a low solid parapet with knobbed posts; the tower set
// forward (its roof edge about 1.5 m behind the outer face), its brick render mostly gone, the lower storey about
// 9.6 m wide with a large central arch and two small arches on the moat side, an arch and two round grilled windows on
// the city side, under a thin tile skirt; a terrace with a balustrade; a small upper storey (about 4.2 m) with one
// arched window a side under a low, nearly flat hipped roof; about 15.5 m above the road in all. Both roofs are thin,
// shallow skirts of weathered ochre-grey tile with small corner curls. On the city side a brick retaining wall about
// 3.8 m high, hedged on top, runs along the street with capped stone gateposts at the passage, and the bank rises
// behind it (the band is cut back for it in build-data GATE_FIX `notch`).
export const id = 'gate:Cửa Đông Ba';
const NAME = 'Cửa Đông Ba';

const OPEN_W = 3.82, OPEN_H = 5.19; // the nguyệt môn (huetourism.gov.vn, after Phan Thuận An)
const PLAQUE_W = 2.31, PLAQUE_H = 1.10; // the stone name tablet (same source)
const TOP = 1.6; // gate block above the wall walk (Street View: the cornice about 8.2 m above the road)
const BLOCK_D = 11.3; // depth from the outer face (satellite z20)
const NOTCH = { half: 18, back: 12.5 }; // the band cut back on the city side: must match GATE_FIX in scripts/build-data.mjs
const LOW_H = 3.8; // the city-side retaining wall above the street (Street View from Xuân 68)
const BODY = hex('#4a4643'), DAMP = hex('#34322e'), CORNICE = hex('#69655e'), DARK = hex('#1f1a18');
const RENDER = hex('#9a8676'); // the lower storey's brick, its render mostly weathered off
const RENDER_UP = hex('#77716a'); // the upper storey, greyer
const ROOF = hex('#8f7a58'), ROOF_EDGE = hex('#5d5245'); // weathered ochre-grey tile
const STONE = hex('#a7a194'), HEDGE = hex('#3a5529'), GRILLE = hex('#3d3935');
const DOOR = hex('#4a2c1e'), IRON = hex('#2a2624'), PLAQUE = hex('#b9b3a6'), PLAQUE_IN = hex('#3b3430');

export function build({ data, S, group, place, THREE }) {
  const norm = (s) => String(s || '').normalize('NFC');
  const g = (data.gates || []).find((q) => norm(q.n) === norm(NAME));
  if (!g) throw new Error('gate not in data.gates');
  const kt = (data.places || []).find((q) => q.id === 'kinhthanh');
  const centre = kt ? [kt.x / 10, kt.z / 10] : [g.c[0] / 10 - 900, g.c[1] / 10 + 260];
  const { cx, cz, pa, px, pz, plen, pwid } = gateAxis(g, centre); // +v runs out of the city, towards the moat
  const ux = -pz, uz = px; // along the wall
  const P = (u, v): [number, number] => [cx + u * ux + v * px, cz + u * uz + v * pz];
  const V = (u, v, y?) => { const p = P(u, v); return [p[0], y, p[1]]; };
  const N = (nu, nv, ny = 0): [number, number, number] => [nu * ux + nv * px, ny, nu * uz + nv * pz];
  const box = (u, v, y0, y1, su, sv, col, opts?) => { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, pa + Math.PI / 2, col, opts); };

  // the block, from the outer face (on the satellite it lies on the rampart's outer face). The record (data.gates) is
  // lengthened inward past it (build-data GATE_FIX `reach`) so the slot the walls cut reaches the city through the
  // mapped rampart; the cut behind the block is lined below.
  const vOut = plen / 2, vIn = vOut - BLOCK_D;
  const W = pwid + 0.4; // along the wall
  const y0 = LAND_Y - 0.5, yT = LAND_Y + WALL_H + TOP, fl = LAND_Y + 0.02;
  const r = OPEN_W / 2, crown = LAND_Y + OPEN_H, spring = crown - r, K = 10;
  const arc = (k, rr = r) => { const th = Math.PI - (Math.PI * k) / K; return [rr * Math.cos(th), spring + rr * Math.sin(th)]; };
  const n0 = S.n;

  // ---- the gate block, the passage driven through it ----
  S.kind = KIND.MASONRY;
  for (const [v, sg] of ([[vIn, -1], [vOut, 1]] as any[])) {
    const n = N(0, sg);
    const q = (u0, u1, ya, yb) => S.quad(V(u0, v, ya), V(u1, v, ya), V(u1, v, yb), V(u0, v, yb), BODY, n);
    const [ua, ub] = sg > 0 ? [-1, 1] : [1, -1]; // keep the quads facing out
    q(ua * W / 2, ua * r, y0, yT);
    q(ub * r, ub * W / 2, y0, yT);
    q(ua * r, ub * r, crown, yT);
    for (let k = 0; k < K; k++) { // spandrels between the arch and the crown
      const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
      if (sg > 0) S.quad(V(sa, v, ya), V(sb, v, yb), V(sb, v, crown), V(sa, v, crown), BODY, n);
      else S.quad(V(sb, v, yb), V(sa, v, ya), V(sa, v, crown), V(sb, v, crown), BODY, n);
    }
  }
  for (const sg of [-1, 1]) { // the two ends, where the wall walk meets the block
    const u = (sg * W) / 2, [va, vb] = sg > 0 ? [vOut, vIn] : [vIn, vOut];
    S.quad(V(u, va, y0), V(u, vb, y0), V(u, vb, yT), V(u, va, yT), BODY, N(sg, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(V(-W / 2, vIn, yT), V(-W / 2, vOut, yT), V(W / 2, vOut, yT), V(W / 2, vIn, yT), shade(PAL.stone, 0.8), [0, 1, 0]);
  S.quad(V(-r, vIn - 0.3, fl), V(-r, vOut + 0.3, fl), V(r, vOut + 0.3, fl), V(r, vIn - 0.3, fl), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  // the barrel vault and the dark lining of the passage
  for (let k = 0; k < K; k++) {
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    S.quad(V(sa, vIn + 0.01, ya), V(sa, vOut - 0.01, ya), V(sb, vOut - 0.01, yb), V(sb, vIn + 0.01, yb), shade(BODY, 0.5), N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
  }
  for (const sg of [-1, 1]) {
    const u = sg * (r - 0.01), [va, vb] = sg > 0 ? [vIn, vOut] : [vOut, vIn];
    S.quad(V(u, va, fl), V(u, vb, fl), V(u, vb, spring), V(u, va, spring), DARK, N(-sg, 0));
  }

  // ---- the city side: the cut through the mapped rampart behind the block, and in the band's notch the low
  // retaining wall along the street, the gateposts and the bank rising behind them ----
  const half = CITADEL_PASSAGE.slot / 2, wallTop = LAND_Y + WALL_H;
  const crossings = (u) => { // where data.wall crosses the line at u, behind the block (v, inner to outer)
    const out = [];
    for (const pg of data.wall || []) for (const f of pg) for (let i = 0, n = f.length / 2; i < n; i++) {
      const j = (i + 1) % n, ax = f[2 * i] / 10 - cx, az = f[2 * i + 1] / 10 - cz, bx = f[2 * j] / 10 - cx, bz = f[2 * j + 1] / 10 - cz;
      const au = ax * ux + az * uz, bu = bx * ux + bz * uz;
      if ((au - u) * (bu - u) >= 0) continue;
      const s = (u - au) / (bu - au), v = (ax * px + az * pz) * (1 - s) + (bx * px + bz * pz) * s;
      if (v < vIn && v > -plen / 2 - 30) out.push(v);
    }
    return out.sort((a, b) => a - b);
  };
  const inner = (u) => crossings(u)[0] ?? null;
  const vB = vOut - NOTCH.back;
  const vF = Math.max(inner(-NOTCH.half - 4) ?? -Infinity, inner(NOTCH.half + 4) ?? -Infinity); // the band's street face
  const notched = Number.isFinite(vF) && [-1, 1].every((s) => { const c = crossings(s * (NOTCH.half - 2)); return c.length && Math.abs(c[c.length - 1] - vB) < 0.6; });
  // a cut side, its top running from ya at va to yb at vb
  const cheek = (sg, va, vb, ya, yb, col) => {
    const u = sg * half, [a, b, ta, tb] = sg > 0 ? [va, vb, ya, yb] : [vb, va, yb, ya];
    S.quad(V(u, a, y0), V(u, b, y0), V(u, b, tb), V(u, a, ta), col, N(-sg, 0));
  };
  S.kind = KIND.MASONRY;
  let vEnd = vIn;
  if (notched) {
    vEnd = vF;
    const vW = vF + 0.7; // the wall's foot, back off the street (Xuân 68's carriageway reaches past the band's mapped edge)
    const yLow = LAND_Y + LOW_H, vBank = vW + 0.6, uEnd = NOTCH.half - 0.03;
    for (const sg of [-1, 1]) {
      const len = uEnd - half, um = sg * (half + len / 2);
      box(um, vW + 0.3, y0, yLow, len, 0.6, BODY, { top: STONE }); // the retaining wall
      box(um, vW + 0.3, LAND_Y + 0.05, LAND_Y + 0.7, len, 0.64, DAMP);
      box(um, vW + 0.3, yLow - 0.05, yLow + 0.12, len, 0.72, STONE); // its coping
      S.kind = KIND.PLAIN;
      box(sg * (half + 0.9 + (len - 1.2) / 2), vW + 0.35, yLow + 0.12, yLow + 1.0, len - 1.2, 0.8, HEDGE, { top: shade(HEDGE, 1.2), taper: 0.85 });
      S.kind = KIND.MASONRY;
      // the gatepost: a square stone pier with a moulded cap and a knob
      const gu = sg * (half + 0.45);
      box(gu, vW + 0.3, y0, yLow + 0.9, 0.9, 0.9, STONE);
      box(gu, vW + 0.3, yLow + 0.9, yLow + 1.1, 1.15, 1.15, shade(STONE, 1.06));
      box(gu, vW + 0.3, yLow + 1.1, yLow + 1.55, 0.6, 0.6, shade(STONE, 1.06), { taper: 0.45 });
      // the bank: grassed, from the wall's coping up to the walk at the notch's back
      S.kind = KIND.GROUND;
      const ua = sg * half, ub = sg * uEnd;
      S.quad(V(ua, vBank, yLow), V(ub, vBank, yLow), V(ub, vB, wallTop), V(ua, vB, wallTop), PAL.moss, [0, 1, 0]);
      S.kind = KIND.MASONRY;
      cheek(sg, vW, vBank, yLow, yLow, shade(BODY, 0.95));
      cheek(sg, vBank, vB, yLow, wallTop, shade(BODY, 0.95));
      cheek(sg, vB, vIn, wallTop, wallTop, shade(BODY, 0.9));
    }
  } else {
    for (const sg of [-1, 1]) { const e = inner(sg * half); if (e === null) continue; vEnd = Math.min(vEnd, e); cheek(sg, e, vIn, wallTop, wallTop, shade(BODY, 0.9)); }
  }
  S.kind = KIND.ROAD;
  S.quad(V(-half, vEnd, fl), V(-half, vIn, fl), V(half, vIn, fl), V(half, vEnd, fl), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  // the two lim leaves, iron-banded, swung open against the passage sides just inside the outer mouth
  for (const sg of [-1, 1]) {
    box(sg * (r - 0.1), vOut - 2.0, fl, spring - 0.05, 0.14, r * 0.95, DOOR);
    for (const yb of [0.9, 2.1, 3.2]) box(sg * (r - 0.18), vOut - 2.0, fl + yb, fl + yb + 0.1, 0.03, r * 0.95, IRON);
  }

  // ---- the facades: damp foot, wide corner pilasters, the recessed panel round the arch, the tablet, the cornice ----
  const PB = LAND_Y + 6.3; // the tablet's foot, over the panel (Street View, scaled from the 3.82 m arch)
  const PW = 6.4, PH = LAND_Y + 6.0; // the panel round the arch: width, head
  for (const [v, sg] of ([[vIn, -1], [vOut, 1]] as any[])) {
    const t = v + sg * 0.1;
    box(0, t + sg * 0.02, y0, LAND_Y + 0.8, W + 0.3, 0.25, DAMP);
    for (const s of [-1, 1]) {
      box(s * (W / 2 - 0.9), t + sg * 0.1, y0, yT - 0.75, 1.8, 0.4, shade(BODY, 1.06)); // corner pilasters, projecting
      box(s * (W / 2 - 0.9), t + sg * 0.16, yT - 1.1, yT - 0.75, 2.1, 0.52, CORNICE); // their capitals
      box(s * (PW / 2 - 0.2), t + sg * 0.06, LAND_Y + 0.8, PH, 0.4, 0.24, shade(BODY, 1.04)); // the panel's frame, in brick
    }
    box(0, t + sg * 0.07, PH - 0.05, PH + 0.25, PW + 0.2, 0.28, CORNICE); // the panel's moulded head
    for (let k = 0; k < K; k++) { // the arch's ring, the same brick
      const [sa, ya] = arc(k, r + 0.22), [sb, yb] = arc(k + 1, r + 0.22);
      S.beam(V(sa, t + sg * 0.06, ya), V(sb, t + sg * 0.06, yb), 0.12, 0.44, shade(BODY, 0.82));
    }
    // the stone tablet: a raised frame, the characters on a dark ground
    box(0, t + sg * 0.06, PB - 0.12, PB + PLAQUE_H + 0.12, PLAQUE_W + 0.5, 0.16, PLAQUE);
    box(0, t + sg * 0.12, PB, PB + PLAQUE_H, PLAQUE_W, 0.06, PLAQUE_IN);
    box(0, t + sg * 0.04, LAND_Y + 0.8, LAND_Y + 1.0, W - 3.4, 0.2, shade(CORNICE, 0.9)); // stone plinth course
    // the cornice: a curved moulding, stepped out in four courses
    for (const [ya, yb, d, c] of ([[yT - 0.75, yT - 0.58, 0.16, 0.92], [yT - 0.58, yT - 0.4, 0.28, 0.98], [yT - 0.4, yT - 0.2, 0.4, 1.02], [yT - 0.2, yT, 0.52, 1.08]] as any[])) {
      box(0, t + sg * (d / 2 - 0.1), ya, yb, W + 0.2 + d, d + 0.2, shade(CORNICE, c), { top: shade(PAL.stone, 0.8) });
    }
  }

  // ---- the low parapet round the flat top: a solid rail between knobbed posts, finials at the corners ----
  S.kind = KIND.MASONRY;
  const D = vOut - vIn, vm = (vIn + vOut) / 2, RAIL = 0.55;
  for (const [len, alongU, off] of ([[W, true, vIn + 0.25], [W, true, vOut - 0.25], [D, false, -W / 2 + 0.25], [D, false, W / 2 - 0.25]] as any[])) {
    if (alongU) box(0, off, yT, yT + RAIL, len, 0.4, shade(BODY, 1.08), { top: CORNICE });
    else box(off, vm, yT, yT + RAIL, 0.4, len - 1.0, shade(BODY, 1.08), { top: CORNICE });
    const n = Math.max(2, Math.round(len / 2.4));
    for (let k = 1; k < n; k++) {
      const s = -len / 2 + (len * k) / n;
      const [bu, bv] = alongU ? [s, off] : [off, vm + s];
      box(bu, bv, yT, yT + 0.7, 0.45, 0.45, shade(BODY, 1.12), { top: CORNICE });
      box(bu, bv, yT + 0.7, yT + 0.92, 0.28, 0.28, shade(CORNICE, 1.05), { taper: 0.5 });
    }
  }
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    box(su * (W / 2 - 0.35), vm + sv * (D / 2 - 0.35), yT, yT + 0.95, 0.7, 0.7, shade(BODY, 1.12), { top: CORNICE });
    box(su * (W / 2 - 0.35), vm + sv * (D / 2 - 0.35), yT + 0.95, yT + 1.35, 0.36, 0.36, shade(CORNICE, 1.05), { taper: 0.4 });
  }

  // ---- the vọng lâu, set forward over the outer face: a masonry lower storey (three arches to the moat; an arch and
  // two round grilled windows to the city) under a thin tile skirt, a terrace with a balustrade, a small upper storey
  // with one arched window a side under a low hipped roof ----
  const LW = 9.6, LD = 6.2, LH = 3.4, UW = 4.2, UD = 3.4, UH = 2.2;
  const vt = vOut - 1.8 - LD / 2; // its front face 1.8 m behind the outer face
  const tc = P(0, vt), ROT = pa + Math.PI / 2;
  const yb0 = yT + 0.2, yL = yb0 + LH, yTer = yL + 0.35, yU = yTer + UH;
  box(0, vt, yT, yb0, LW + 0.4, LD + 0.4, shade(PAL.stone, 0.8), { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  box(0, vt, yb0, yL, LW, LD, RENDER);
  box(0, vt, yL - 0.5, yL - 0.1, LW + 0.24, LD + 0.24, shade(RENDER_UP, 0.95)); // cornice band
  const face = (u, v, nv, alongU, y1, y2, ww, col) => (alongU ? box(u, v + nv * 0.03, y1, y2, ww, 0.1, col) : box(v + nv * 0.03, u, y1, y2, 0.1, ww, col));
  // an arched opening on a face: a dark rectangle to the springing and a stepped semicircle over it
  const opening = (u, v, nv, w, sill, h, alongU = true) => {
    const rr = w / 2, sp = sill + h - rr;
    face(u, v, nv, alongU, sill, sp, w, DARK);
    for (let k = 0; k < 4; k++) face(u, v, nv, alongU, sp + (rr * k) / 4, sp + (rr * (k + 1)) / 4, 2 * rr * Math.sqrt(1 - ((k + 0.5) / 4) ** 2), DARK);
  };
  // a round window with an iron grille, as a stepped disc
  const oculus = (u, v, nv, dia, yc) => {
    const rr = dia / 2, m = 6;
    for (let k = 0; k < m; k++) { const ya = yc - rr + (2 * rr * k) / m, yb = ya + (2 * rr) / m, yy = (ya + yb) / 2 - yc; face(u, v, nv, true, ya, yb, 2 * Math.sqrt(Math.max(0, rr * rr - yy * yy)), GRILLE); }
    face(u, v, nv * 1.6, true, yc - 0.04, yc + 0.04, dia * 0.95, shade(GRILLE, 1.5));
    face(u, v, nv * 1.6, true, yc - rr * 0.95, yc + rr * 0.95, 0.08, shade(GRILLE, 1.5));
  };
  for (const sg of [-1, 1]) {
    const fv = vt + sg * LD / 2;
    opening(0, fv, sg, 2.2, yb0, 2.6);
    for (const s of [-1, 1]) {
      if (sg > 0) opening(s * 3.0, fv, sg, 1.3, yb0, 1.45);
      else oculus(s * 3.0, fv, sg, 1.3, yb0 + 1.55);
    }
    opening(vt, sg * LW / 2, sg, 1.15, yb0 + 0.3, 1.5, false);
  }
  S.kind = KIND.PLAIN;
  const roofOpts = { flare: 0.05, hips: false, horns: false, fascia: 0.16, fasciaCol: ROOF_EDGE, ridgeCol: ROOF_EDGE };
  S.hip(tc[0], tc[1], LW, LD, ROT, yL - 0.15, 0.55, ROOF, { ...roofOpts, over: 0.32 });
  // small curled ornaments at the skirt's corners
  for (const su of [-1, 1]) for (const sv of [-1, 1]) box(su * (LW / 2 + 0.22), vt + sv * (LD / 2 + 0.22), yL - 0.1, yL + 0.25, 0.22, 0.22, ROOF_EDGE, { taper: 0.6 });
  S.kind = KIND.MASONRY;
  box(0, vt, yL, yTer, LW - 1.2, LD - 1.2, shade(RENDER_UP, 1.0), { top: shade(PAL.stone, 0.85) }); // the terrace
  for (const [len, alongU, off] of ([[LW - 1.2, true, vt - (LD - 1.2) / 2 + 0.1], [LW - 1.2, true, vt + (LD - 1.2) / 2 - 0.1], [LD - 1.2, false, -(LW - 1.2) / 2 + 0.1], [LD - 1.2, false, (LW - 1.2) / 2 - 0.1]] as any[])) {
    if (alongU) { box(0, off, yTer, yTer + 0.12, len, 0.2, RENDER_UP); box(0, off, yTer + 0.5, yTer + 0.62, len, 0.2, RENDER_UP); }
    else { box(off, vt, yTer, yTer + 0.12, 0.2, len, RENDER_UP); box(off, vt, yTer + 0.5, yTer + 0.62, 0.2, len, RENDER_UP); }
    const n = Math.max(2, Math.round(len / 0.5));
    for (let k = 1; k < n; k++) { // the balusters
      const s = -len / 2 + (len * k) / n;
      if (alongU) box(s, off, yTer + 0.12, yTer + 0.5, 0.1, 0.1, shade(RENDER_UP, 0.9));
      else box(off, vt + s, yTer + 0.12, yTer + 0.5, 0.1, 0.1, shade(RENDER_UP, 0.9));
    }
  }
  for (const su of [-1, 1]) for (const sv of [-1, 1]) { // knobbed posts at its corners
    const bu = su * ((LW - 1.2) / 2 - 0.1), bv = vt + sv * ((LD - 1.2) / 2 - 0.1);
    box(bu, bv, yTer, yTer + 0.8, 0.3, 0.3, RENDER_UP);
    box(bu, bv, yTer + 0.8, yTer + 1.0, 0.22, 0.22, RENDER_UP, { taper: 0.4 });
  }
  box(0, vt, yTer, yU, UW, UD, RENDER_UP);
  box(0, vt, yU - 0.3, yU - 0.05, UW + 0.2, UD + 0.2, shade(RENDER_UP, 0.9));
  for (const sg of [-1, 1]) {
    opening(0, vt + sg * UD / 2, sg, 1.0, yTer + 0.4, 1.3);
    opening(vt, sg * UW / 2, sg, 0.8, yTer + 0.5, 1.1, false);
  }
  S.kind = KIND.PLAIN;
  S.hip(tc[0], tc[1], UW, UD, ROT, yU - 0.1, 0.5, ROOF, { ...roofOpts, over: 0.28 });
  for (const su of [-1, 1]) for (const sv of [-1, 1]) box(su * (UW / 2 + 0.2), vt + sv * (UD / 2 + 0.2), yU - 0.05, yU + 0.28, 0.2, 0.2, ROOF_EDGE, { taper: 0.6 });
  // ridge ornaments and the finial
  for (const s of [-1, 1]) box(s * 0.5, vt, yU + 0.3, yU + 0.7, 0.3, 0.22, ROOF_EDGE, { taper: 0.5 });
  S.cyl(tc[0], tc[1], yU + 0.35, yU + 1.4, 0.07, 0.03, 6, hex('#7d7466'));

  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = KIND.PLAIN;

  // the tablet's characters, read right to left: 正 東 門 (a small canvas, in the browser only)
  if (group && THREE && typeof document !== 'undefined') {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 112;
    const c = cv.getContext('2d');
    c.fillStyle = '#3b3430'; c.fillRect(0, 0, 256, 112);
    c.fillStyle = '#d9cfb8'; c.font = 'bold 66px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['門', '東', '正'].forEach((ch, i) => c.fillText(ch, 48 + i * 80, 58));
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const geo = new THREE.PlaneGeometry(PLAQUE_W - 0.1, PLAQUE_H - 0.1);
    for (const [v, sg] of ([[vIn, -1], [vOut, 1]] as any[])) {
      const p = P(0, v + sg * 0.27), m = new THREE.Mesh(geo, mat);
      m.position.set(p[0], PB + PLAQUE_H / 2, p[1]);
      m.rotation.y = Math.atan2(px * sg, pz * sg);
      m.userData.landmark = id;
      group.add(m);
    }
  }
}
