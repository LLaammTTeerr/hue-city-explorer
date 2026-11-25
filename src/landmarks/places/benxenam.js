import { KIND, Buf, hex, shade, unflat } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { groundHeightAt, addEmissiveStripMesh, addIntercityBus } from '../helpers.js';

// Bến xe phía Nam, 97 An Dương Vương: the southern intercity bus station of Công ty CP Bến xe Huế (issue #71).
// See docs/places/benxenam.md.
//
// The terminal hall stands at the front of a 1.4 ha concrete yard (the yard itself is paved by build-data from the
// station's amenity=bus_station area). What the photos show (benxehue.vn, 2024 renovation; vexere/ivexe, 2023-25):
//   front    two storeys, symmetrical, painted yellow with white trim: offices upstairs, ticket hall and waiting
//            room below. A middle bay rises a little higher under a low triangular pediment with a round emblem;
//            under it the blue sign CÔNG TY CỔ PHẦN BẾN XE HUẾ. A white slab runs the whole front between the floors,
//            set with potted bonsai; round white columns carry it at the doors. A wide granite flight of steps up
//            to a plinth of about a metre. Flat roofs with deep white eave slabs on the wings.
//   yard     a glass ribbon upstairs behind a balustrade; along the whole yard side a canopy on square columns
//            (clad red and white), grey metal over a brown wood-look ceiling, a yellow fascia: the pick-up area.
// No height is published; eave about 8.5 m and the pediment's top about 11 m are read off the photos (steps,
// doors and storeys against people).
// Footprint: OSM way 260244336 (building), from data.special.benxenam.

export const id = 'benxenam';

const C = {
  yellow: hex('#e7b93c'), trim: hex('#f1ede2'), roof: hex('#a9a69e'), granite: hex('#8d8b86'), step: hex('#b3b0a8'),
  glass: hex('#33414c'), ribbon: hex('#5f7f95'), blue: hex('#1f56a6'), red: hex('#c8202d'), green: hex('#4f6f33'),
  pot: hex('#6d6a64'), canopy: hex('#8e9399'), ceiling: hex('#7a5338'), white: hex('#efefea'), door: hex('#4b3a2e'),
};

// a low gable: ridge along the frame's v axis (front to back), triangles on the two ends facing front and back
function pediment(S, P, a, len, wid, y0, h, roofCol, wallCol, trimCol) {
  const Q = (v, u, y) => { const p = P(u, v); return [p[0], y, p[1]]; };
  const hl = len / 2 + 0.4, hw = wid / 2 + 0.4, ye = y0 - (h * 0.4) / hw;
  const nx = Math.cos(a), nz = Math.sin(a);
  S.kind = KIND.FLAT;
  S.quad(Q(-hl, -hw, ye), Q(hl, -hw, ye), Q(hl, 0, y0 + h), Q(-hl, 0, y0 + h), roofCol, [0, 1, 0]);
  S.quad(Q(-hl, hw, ye), Q(hl, hw, ye), Q(hl, 0, y0 + h), Q(-hl, 0, y0 + h), roofCol, [0, 1, 0]);
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) {
    S.tri(Q(s * len / 2, -wid / 2, y0), Q(s * len / 2, wid / 2, y0), Q(s * len / 2, 0, y0 + h * (wid / 2) / hw), wallCol, [s * nx, 0, s * nz]);
    // white raking cornices on the front
    if (s > 0) for (const k of [-1, 1]) S.beam(Q(hl, k * hw, ye), Q(hl, 0, y0 + h), 0.35, 0.3, trimCol);
  }
}

export function build({ data, S, group }) {
  const sp = data.special && data.special.benxenam;
  if (!sp) return;
  const R = unflat(sp.ring);
  if (R.length < 4) return;
  // the long edge nearest An Dương Vương is the front; the frame: u along the front, v out of it (front +, yard -)
  const c = R.reduce((s, p) => [s[0] + p[0] / R.length, s[1] + p[1] / R.length], [0, 0]);
  let best = null;
  for (let i = 0; i < R.length; i++) {
    const p = R[i], q = R[(i + 1) % R.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    if (L > 20 && (!best || m[1] > best.m[1])) best = { p, q, L, m }; // the south-facing long edge (z south)
  }
  if (!best) return;
  const t = [(best.q[0] - best.p[0]) / best.L, (best.q[1] - best.p[1]) / best.L];
  let n = [t[1], -t[0]];
  if ((best.m[0] - c[0]) * n[0] + (best.m[1] - c[1]) * n[1] < 0) n = [-n[0], -n[1]];
  const L = best.L, D = 2 * ((best.m[0] - c[0]) * n[0] + (best.m[1] - c[1]) * n[1]);
  const P = (u, v) => [c[0] + t[0] * u + n[0] * v, c[1] + t[1] * u + n[1] * v];
  const a = Math.atan2(t[1], t[0]), an = Math.atan2(n[1], n[0]);
  const y0 = groundHeightAt(c[0], c[1]);
  const box = (u, v, ya, yb, su, sv, col, o) => { const p = P(u, v); S.box(p[0], p[1], ya, yb, su, sv, a, col, o); };

  const LB = new Buf(512), WB = new Buf(512), BB = new Buf(64); // night: canopy lamps, warm windows, the blue sign
  const lit = (B, u, v, ya, yb, su, sv) => { const p = P(u, v); B.box(p[0], p[1], ya, yb, su, sv, a, [1, 1, 1], { top: [1, 1, 1], bottom: true }); };
  S.base = y0 - LAND_Y;

  // ---------------- plinth and the front steps ----------------
  const PL = 1.0, yb = y0 + PL, G = 3.9, F2 = 7.5, EAVE = 8.0; // plinth, first floor, roof line, top of eave slab
  const MW = 11.0, MP = 0.9; // the middle bay: width, how far it stands forward
  S.kind = KIND.MASONRY;
  box(0, 0, y0 - 0.3, yb, L + 1.6, D + 1.6, C.granite, { top: C.step, topKind: KIND.ROAD });
  const NS = 6, run = 0.42;
  for (let k = 0; k < NS; k++) box(0, D / 2 + 0.8 + run * (NS - k) - run / 2, y0 - 0.3, y0 + (PL * (k + 1)) / NS, 17 - k * 0.2, run, shade(C.step, 1 - k * 0.02), { topKind: KIND.ROAD });
  // stone planter troughs on the plinth's edge, either side of the flight
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const u = s * (10.5 + k * 3.2); box(u, D / 2 + 0.4, yb, yb + 0.55, 1.6, 0.7, C.pot); box(u, D / 2 + 0.4, yb + 0.55, yb + 1.3, 1.3, 0.6, C.green); }

  // ---------------- the hall: two storeys, white bands, flat roof with deep eaves ----------------
  S.kind = KIND.CIVIC;
  box(0, 0, yb, y0 + F2, L, D, C.yellow, { top: C.roof });
  S.kind = KIND.PLAIN;
  box(0, 0, y0 + F2, y0 + EAVE, L + 2.4, D + 2.4, C.trim, { top: C.roof, topKind: KIND.FLAT, bottom: true });
  box(0, 0, yb, yb + 0.35, L + 0.1, D + 0.1, C.trim);
  // the slab between the floors, out over the front, potted bonsai along it
  box(0, D / 2 + 0.9, yb + G - 0.3, yb + G, L + 0.6, 1.8 + 0.1, C.trim, { bottom: true });
  box(0, D / 2 + 1.75, yb + G, yb + G + 0.55, L + 0.6, 0.15, C.trim);
  for (let k = 0; k < 9; k++) {
    const u = (k - 4) * (L / 9.4);
    box(u, D / 2 + 1.2, yb + G, yb + G + 0.5, 0.8, 0.8, C.pot);
    const p = P(u, D / 2 + 1.2);
    S.kind = KIND.PLAIN;
    S.cyl(p[0], p[1], yb + G + 0.5, yb + G + 1.5, 0.6, 0.35, 6, C.green);
  }
  // front windows: dark glass in white frames, upstairs and down, either side of the middle bay
  const bays = Math.max(2, Math.round((L / 2 - MW / 2) / 3.1));
  const bw = (L / 2 - MW / 2) / bays;
  for (const s of [-1, 1]) for (let k = 0; k < bays; k++) {
    const u = s * (MW / 2 + (k + 0.5) * bw);
    box(u, D / 2 + 0.06, yb + G + 0.9, yb + G + 2.7, bw - 0.9, 0.14, C.trim);
    box(u, D / 2 + 0.1, yb + G + 1.0, yb + G + 2.6, bw - 1.2, 0.12, C.glass);
    box(u, D / 2 + 0.06, yb + 0.6, yb + G - 0.6, bw - 0.5, 0.12, k === bays - 1 ? C.red : C.glass); // shopfronts, a red kiosk sign at the ends
    if ((k + (s > 0 ? 1 : 0)) % 2 === 0) lit(WB, u, D / 2 + 0.18, yb + G + 1.1, yb + G + 2.5, bw - 1.4, 0.06);
  }
  // the end walls and the yard side: plain bands of windows
  for (const s of [-1, 1]) {
    const p = P(s * (L / 2 + 0.06), 0);
    S.box(p[0], p[1], yb + G + 1.0, yb + G + 2.6, D * 0.6, 0.12, an, C.glass);
  }
  // yard side: a glass ribbon upstairs behind a balustrade on the slab
  box(0, -D / 2 - 0.06, yb + G + 0.6, yb + G + 2.9, L - 2.0, 0.12, C.ribbon);
  box(0, -D / 2 - 0.9, yb + G - 0.3, yb + G, L, 1.8, C.trim, { bottom: true });
  box(0, -D / 2 - 1.75, yb + G, yb + G + 1.0, L, 0.14, C.trim);
  box(0, -D / 2 - 0.06, yb + 0.4, yb + G - 0.6, L - 4, 0.12, C.glass);
  for (let k = 0; k < 6; k++) lit(WB, (k - 2.5) * (L / 6.5), -D / 2 - 0.15, yb + G + 0.8, yb + G + 2.6, 3.0, 0.06);

  // ---------------- the middle bay: forward, taller, under the pediment ----------------
  const MT = EAVE + 0.6;
  S.kind = KIND.CIVIC;
  box(0, D / 2 + (MP - 0.4) / 2, yb, y0 + MT, MW, MP + 0.4, C.yellow, { top: C.roof });
  box(0, 0, y0 + EAVE, y0 + MT, MW, D, C.yellow, { top: C.roof });
  S.kind = KIND.PLAIN;
  box(0, MP / 2, y0 + MT - 0.35, y0 + MT, MW + 0.6, D + MP + 0.6, C.trim, { top: C.roof });
  for (const s of [-1, 1]) box(s * (MW / 2 - 0.35), D / 2 + MP, yb, y0 + MT, 0.7, 0.3, C.trim); // white corner pilasters
  pediment(S, (u, v) => P(u, v + D / 2 + MP - 2.5), an, 5.0, MW, y0 + MT, 1.9, C.roof, C.yellow, C.trim); // only over the front: the roof behind it is flat
  // the round emblem in the pediment, the blue sign under it
  {
    const p = P(0, D / 2 + MP + 0.45);
    S.box(p[0], p[1], y0 + MT + 0.15, y0 + MT + 1.15, 1.0, 0.12, a, C.trim);
    S.box(p[0], p[1], y0 + MT + 0.3, y0 + MT + 1.0, 0.7, 0.16, a, C.red);
  }
  box(0, D / 2 + MP + 0.1, yb + G + 1.9, yb + G + 3.1, MW - 2.0, 0.18, C.blue);
  box(0, D / 2 + MP + 0.22, yb + G + 2.35, yb + G + 2.65, MW - 3.2, 0.06, C.white); // the lettering, read as a band
  lit(BB, 0, D / 2 + MP + 0.24, yb + G + 2.3, yb + G + 2.7, MW - 3.2, 0.04);
  // upstairs: three tall windows; below, the glazed doors of the ticket hall
  for (const u of [-3.2, 0, 3.2]) { box(u, D / 2 + MP + 0.06, yb + G + 0.5, yb + G + 1.7, 2.2, 0.14, C.glass); lit(WB, u, D / 2 + MP + 0.14, yb + G + 0.6, yb + G + 1.6, 2.0, 0.05); }
  box(0, D / 2 + MP + 0.06, yb + 0.1, yb + G - 0.5, MW - 2.2, 0.14, C.door);
  box(0, D / 2 + MP + 0.1, yb + 0.2, yb + G - 0.7, MW - 3.0, 0.12, C.glass);
  lit(WB, 0, D / 2 + MP + 0.16, yb + 0.3, yb + G - 0.8, MW - 3.4, 0.05);
  // round white columns at the doors, carrying the slab
  for (const u of [-4.6, -1.6, 1.6, 4.6]) { const p = P(u, D / 2 + 1.55); S.cyl(p[0], p[1], yb, yb + G - 0.3, 0.26, 0.26, 10, C.white); }

  // ---------------- the pick-up canopy along the yard side ----------------
  {
    const W = 9.0, U0 = -L / 2 - 2.0, U1 = L / 2 + 3.0, uc = (U0 + U1) / 2, ul = U1 - U0, vc = -D / 2 - W / 2, CY = y0 + 5.2;
    S.kind = KIND.PLAIN;
    box(uc, vc, CY, CY + 0.35, ul, W, C.canopy, { top: C.canopy, topKind: KIND.FLAT });
    box(uc, vc, CY - 0.02, CY, ul - 0.2, W - 0.2, C.ceiling, { top: C.ceiling, bottom: true });
    box(uc, vc - W / 2, CY - 0.4, CY + 0.5, ul + 0.1, 0.2, C.yellow); // the yellow fascia on the yard edge
    for (const s of [U0, U1]) box(s, vc, CY - 0.4, CY + 0.5, 0.2, W, C.yellow);
    const np = Math.max(3, Math.round(ul / 6.5));
    for (let k = 0; k <= np; k++) {
      const u = U0 + 0.4 + ((ul - 0.8) * k) / np;
      box(u, -D / 2 - W + 0.6, y0, CY, 0.55, 0.55, C.red);
      box(u, -D / 2 - W + 0.6, y0 + 1.6, y0 + 2.6, 0.58, 0.58, C.white); // the white band on the cladding
      if (k < np) lit(LB, u + (ul - 0.8) / np / 2, vc, CY - 0.08, CY - 0.03, 1.4, 0.3);
    }
    // the PICK UP AREA sign hung from the fascia near the middle
    box(uc + 6, vc - W / 2 - 0.15, CY - 1.3, CY - 0.4, 6.0, 0.1, C.white);
    box(uc + 8.3, vc - W / 2 - 0.2, CY - 1.3, CY - 0.4, 1.6, 0.1, C.red);
  }

  // ---------------- concrete bus yard, parked intercity sleeper buses & yard floodlight poles (matching satellite) ----------------
  {
    const yard0 = S.n;
    S.kind = KIND.ROAD;
    // paved concrete apron behind the terminal (north/yard side)
    box(2, -D / 2 - 36, y0 - 0.2, y0 + 0.08, L + 26, 56, hex('#b6b2a9'), { topKind: KIND.ROAD });
    (S.paved = S.paved || []).push([yard0, S.n]);
    // painted yellow/white bay lane markings across the bus yard
    S.kind = KIND.PLAIN;
    for (let k = 0; k < 8; k++) {
      box(-18 + k * 5.2, -D / 2 - 33, y0 + 0.08, y0 + 0.11, 0.18, 12.6, C.white);
    }
    for (let k = 0; k < 7; k++) {
      box(-16.5 + k * 5.6, -D / 2 - 14.5, y0 + 0.08, y0 + 0.11, 0.18, 12.2, C.yellow);
    }
    // parked intercity sleeper buses (orange/red Phương Trang, blue/white, cream/red) in neat angled bays
    const busCols = [hex('#e66824'), hex('#d9382a'), hex('#2c62a8'), hex('#e8e4da'), hex('#2d8a68'), hex('#e66824')];
    const bus = (u, v, angOff, col, length = 11.4, width = 2.55, height = 3.5) => {
      const [bx, bz] = P(u, v);
      addIntercityBus(S, bx, bz, y0, a + angOff, col, { length, width, height });
    };
    // row 1: boarding coaches along the pick-up canopy
    for (let k = 0; k < 6; k++) bus(-14 + k * 5.6, -D / 2 - 14.5, Math.PI / 2 + 0.22, busCols[k % busCols.length]);
    // row 2 & 3: parked sleeper buses in the main yard
    for (let k = 0; k < 7; k++) bus(-16 + k * 5.2, -D / 2 - 33, Math.PI / 2 + 0.22, busCols[(k + 2) % busCols.length]);
    for (let k = 0; k < 5; k++) bus(-12 + k * 5.6, -D / 2 - 51, Math.PI / 2, busCols[(k + 4) % busCols.length], 9.2, 2.35, 3.1);
    // yard floodlight masts
    S.kind = KIND.PLAIN;
    for (const [u, v] of [[-24, -D / 2 - 24], [26, -D / 2 - 24], [-24, -D / 2 - 54], [26, -D / 2 - 54]]) {
      const p = P(u, v);
      S.cyl(p[0], p[1], y0, y0 + 11.5, 0.16, 0.1, 6, hex('#6c7175'));
      S.box(p[0], p[1], y0 + 11.4, y0 + 11.75, 1.4, 0.45, a, hex('#d8dce0'));
      lit(LB, u, v, y0 + 11.2, y0 + 11.4, 1.2, 0.4);
    }
  }

  for (const [B, col, boost] of [[LB, 0xf2f6ff, 1.2], [WB, 0xffd9a0, 0.9], [BB, 0xe8f0ff, 1.3]]) {
    addEmissiveStripMesh(group, B, col, boost, id);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
