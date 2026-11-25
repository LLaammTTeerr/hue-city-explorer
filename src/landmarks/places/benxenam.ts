import { KIND, Buf, hex, shade, unflat } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { groundHeightAt, addEmissiveStripMesh, addIntercityBus } from '../helpers.ts';

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

const PLINTH_H = 1.0;
const GROUND_FLOOR_H = 3.9;
const ROOF_H = 7.5;
const EAVE_TOP_H = 8.0;
const MID_BAY_W = 11.0;
const MID_BAY_PROJ = 0.9;
const CANOPY_W = 9.0;
const CANOPY_H = 5.2;

const COLORS = {
  yellow: hex('#e7b93c'),
  trim: hex('#f1ede2'),
  roof: hex('#a9a69e'),
  granite: hex('#8d8b86'),
  step: hex('#b3b0a8'),
  glass: hex('#33414c'),
  ribbon: hex('#5f7f95'),
  blue: hex('#1f56a6'),
  red: hex('#c8202d'),
  green: hex('#4f6f33'),
  pot: hex('#6d6a64'),
  canopy: hex('#8e9399'),
  ceiling: hex('#7a5338'),
  white: hex('#efefea'),
  door: hex('#4b3a2e'),
  yardConcrete: hex('#b6b2a9'),
  mastPole: hex('#6c7175'),
  mastHead: hex('#d8dce0'),
  buses: [hex('#e66824'), hex('#d9382a'), hex('#2c62a8'), hex('#e8e4da'), hex('#2d8a68'), hex('#e66824')],
};

// a low gable: ridge along the frame's v axis (front to back), triangles on the two ends facing front and back
function buildPediment(S, toWorld, angleN, len, wid, y0, height, roofCol, wallCol, trimCol) {
  const pt3 = (v, u, y) => {
    const pos = toWorld(u, v);
    return [pos[0], y, pos[1]];
  };
  const halfLen = len / 2 + 0.4;
  const halfWid = wid / 2 + 0.4;
  const eaveY = y0 - (height * 0.4) / halfWid;
  const nx = Math.cos(angleN);
  const nz = Math.sin(angleN);
  S.kind = KIND.FLAT;
  S.quad(pt3(-halfLen, -halfWid, eaveY), pt3(halfLen, -halfWid, eaveY), pt3(halfLen, 0, y0 + height), pt3(-halfLen, 0, y0 + height), roofCol, [0, 1, 0]);
  S.quad(pt3(-halfLen, halfWid, eaveY), pt3(halfLen, halfWid, eaveY), pt3(halfLen, 0, y0 + height), pt3(-halfLen, 0, y0 + height), roofCol, [0, 1, 0]);
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    S.tri(pt3(side * len / 2, -wid / 2, y0), pt3(side * len / 2, wid / 2, y0), pt3(side * len / 2, 0, y0 + height * (wid / 2) / halfWid), wallCol, [side * nx, 0, side * nz]);
    // white raking cornices on the front
    if (side > 0) for (const k of [-1, 1]) S.beam(pt3(halfLen, k * halfWid, eaveY), pt3(halfLen, 0, y0 + height), 0.35, 0.3, trimCol);
  }
}

function buildTerminalHall(S, ctx, litBufs) {
  const { toWorld, box, addLit, len, depth, baseY, angleN } = ctx;
  const { winBuf, blueBuf } = litBufs;
  const plinthY = baseY + PLINTH_H;

  // ---------------- plinth and the front steps ----------------
  S.kind = KIND.MASONRY;
  box(0, 0, baseY - 0.3, plinthY, len + 1.6, depth + 1.6, COLORS.granite, { top: COLORS.step, topKind: KIND.ROAD });
  const stepCount = 6;
  const tread = 0.42;
  for (let k = 0; k < stepCount; k++) {
    box(0, depth / 2 + 0.8 + tread * (stepCount - k) - tread / 2, baseY - 0.3, baseY + (PLINTH_H * (k + 1)) / stepCount, 17 - k * 0.2, tread, shade(COLORS.step, 1 - k * 0.02), { topKind: KIND.ROAD });
  }
  // stone planter troughs on the plinth's edge, either side of the flight
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const u = side * (10.5 + k * 3.2);
      box(u, depth / 2 + 0.4, plinthY, plinthY + 0.55, 1.6, 0.7, COLORS.pot);
      box(u, depth / 2 + 0.4, plinthY + 0.55, plinthY + 1.3, 1.3, 0.6, COLORS.green);
    }
  }

  // ---------------- the hall: two storeys, white bands, flat roof with deep eaves ----------------
  S.kind = KIND.CIVIC;
  box(0, 0, plinthY, baseY + ROOF_H, len, depth, COLORS.yellow, { top: COLORS.roof });
  S.kind = KIND.PLAIN;
  box(0, 0, baseY + ROOF_H, baseY + EAVE_TOP_H, len + 2.4, depth + 2.4, COLORS.trim, { top: COLORS.roof, topKind: KIND.FLAT, bottom: true });
  box(0, 0, plinthY, plinthY + 0.35, len + 0.1, depth + 0.1, COLORS.trim);
  // the slab between the floors, out over the front, potted bonsai along it
  box(0, depth / 2 + 0.9, plinthY + GROUND_FLOOR_H - 0.3, plinthY + GROUND_FLOOR_H, len + 0.6, 1.8 + 0.1, COLORS.trim, { bottom: true });
  box(0, depth / 2 + 1.75, plinthY + GROUND_FLOOR_H, plinthY + GROUND_FLOOR_H + 0.55, len + 0.6, 0.15, COLORS.trim);
  for (let k = 0; k < 9; k++) {
    const u = (k - 4) * (len / 9.4);
    box(u, depth / 2 + 1.2, plinthY + GROUND_FLOOR_H, plinthY + GROUND_FLOOR_H + 0.5, 0.8, 0.8, COLORS.pot);
    const pos = toWorld(u, depth / 2 + 1.2);
    S.kind = KIND.PLAIN;
    S.cyl(pos[0], pos[1], plinthY + GROUND_FLOOR_H + 0.5, plinthY + GROUND_FLOOR_H + 1.5, 0.6, 0.35, 6, COLORS.green);
  }
  // front windows: dark glass in white frames, upstairs and down, either side of the middle bay
  const bayCount = Math.max(2, Math.round((len / 2 - MID_BAY_W / 2) / 3.1));
  const bayW = (len / 2 - MID_BAY_W / 2) / bayCount;
  for (const side of [-1, 1]) {
    for (let k = 0; k < bayCount; k++) {
      const u = side * (MID_BAY_W / 2 + (k + 0.5) * bayW);
      box(u, depth / 2 + 0.06, plinthY + GROUND_FLOOR_H + 0.9, plinthY + GROUND_FLOOR_H + 2.7, bayW - 0.9, 0.14, COLORS.trim);
      box(u, depth / 2 + 0.1, plinthY + GROUND_FLOOR_H + 1.0, plinthY + GROUND_FLOOR_H + 2.6, bayW - 1.2, 0.12, COLORS.glass);
      box(u, depth / 2 + 0.06, plinthY + 0.6, plinthY + GROUND_FLOOR_H - 0.6, bayW - 0.5, 0.12, k === bayCount - 1 ? COLORS.red : COLORS.glass); // shopfronts, a red kiosk sign at the ends
      if ((k + (side > 0 ? 1 : 0)) % 2 === 0) addLit(winBuf, u, depth / 2 + 0.18, plinthY + GROUND_FLOOR_H + 1.1, plinthY + GROUND_FLOOR_H + 2.5, bayW - 1.4, 0.06);
    }
  }
  // the end walls and the yard side: plain bands of windows
  for (const side of [-1, 1]) {
    const pos = toWorld(side * (len / 2 + 0.06), 0);
    S.box(pos[0], pos[1], plinthY + GROUND_FLOOR_H + 1.0, plinthY + GROUND_FLOOR_H + 2.6, depth * 0.6, 0.12, angleN, COLORS.glass);
  }
  // yard side: a glass ribbon upstairs behind a balustrade on the slab
  box(0, -depth / 2 - 0.06, plinthY + GROUND_FLOOR_H + 0.6, plinthY + GROUND_FLOOR_H + 2.9, len - 2.0, 0.12, COLORS.ribbon);
  box(0, -depth / 2 - 0.9, plinthY + GROUND_FLOOR_H - 0.3, plinthY + GROUND_FLOOR_H, len, 1.8, COLORS.trim, { bottom: true });
  box(0, -depth / 2 - 1.75, plinthY + GROUND_FLOOR_H, plinthY + GROUND_FLOOR_H + 1.0, len, 0.14, COLORS.trim);
  box(0, -depth / 2 - 0.06, plinthY + 0.4, plinthY + GROUND_FLOOR_H - 0.6, len - 4, 0.12, COLORS.glass);
  for (let k = 0; k < 6; k++) addLit(winBuf, (k - 2.5) * (len / 6.5), -depth / 2 - 0.15, plinthY + GROUND_FLOOR_H + 0.8, plinthY + GROUND_FLOOR_H + 2.6, 3.0, 0.06);

  // ---------------- the middle bay: forward, taller, under the pediment ----------------
  const midTopH = EAVE_TOP_H + 0.6;
  S.kind = KIND.CIVIC;
  box(0, depth / 2 + (MID_BAY_PROJ - 0.4) / 2, plinthY, baseY + midTopH, MID_BAY_W, MID_BAY_PROJ + 0.4, COLORS.yellow, { top: COLORS.roof });
  box(0, 0, baseY + EAVE_TOP_H, baseY + midTopH, MID_BAY_W, depth, COLORS.yellow, { top: COLORS.roof });
  S.kind = KIND.PLAIN;
  box(0, MID_BAY_PROJ / 2, baseY + midTopH - 0.35, baseY + midTopH, MID_BAY_W + 0.6, depth + MID_BAY_PROJ + 0.6, COLORS.trim, { top: COLORS.roof });
  for (const side of [-1, 1]) box(side * (MID_BAY_W / 2 - 0.35), depth / 2 + MID_BAY_PROJ, plinthY, baseY + midTopH, 0.7, 0.3, COLORS.trim); // white corner pilasters
  buildPediment(S, (u, v) => toWorld(u, v + depth / 2 + MID_BAY_PROJ - 2.5), angleN, 5.0, MID_BAY_W, baseY + midTopH, 1.9, COLORS.roof, COLORS.yellow, COLORS.trim);
  // the round emblem in the pediment, the blue sign under it
  {
    const pos = toWorld(0, depth / 2 + MID_BAY_PROJ + 0.45);
    S.box(pos[0], pos[1], baseY + midTopH + 0.15, baseY + midTopH + 1.15, 1.0, 0.12, ctx.angleT, COLORS.trim);
    S.box(pos[0], pos[1], baseY + midTopH + 0.3, baseY + midTopH + 1.0, 0.7, 0.16, ctx.angleT, COLORS.red);
  }
  box(0, depth / 2 + MID_BAY_PROJ + 0.1, plinthY + GROUND_FLOOR_H + 1.9, plinthY + GROUND_FLOOR_H + 3.1, MID_BAY_W - 2.0, 0.18, COLORS.blue);
  box(0, depth / 2 + MID_BAY_PROJ + 0.22, plinthY + GROUND_FLOOR_H + 2.35, plinthY + GROUND_FLOOR_H + 2.65, MID_BAY_W - 3.2, 0.06, COLORS.white); // the lettering, read as a band
  addLit(blueBuf, 0, depth / 2 + MID_BAY_PROJ + 0.24, plinthY + GROUND_FLOOR_H + 2.3, plinthY + GROUND_FLOOR_H + 2.7, MID_BAY_W - 3.2, 0.04);
  // upstairs: three tall windows; below, the glazed doors of the ticket hall
  for (const u of [-3.2, 0, 3.2]) {
    box(u, depth / 2 + MID_BAY_PROJ + 0.06, plinthY + GROUND_FLOOR_H + 0.5, plinthY + GROUND_FLOOR_H + 1.7, 2.2, 0.14, COLORS.glass);
    addLit(winBuf, u, depth / 2 + MID_BAY_PROJ + 0.14, plinthY + GROUND_FLOOR_H + 0.6, plinthY + GROUND_FLOOR_H + 1.6, 2.0, 0.05);
  }
  box(0, depth / 2 + MID_BAY_PROJ + 0.06, plinthY + 0.1, plinthY + GROUND_FLOOR_H - 0.5, MID_BAY_W - 2.2, 0.14, COLORS.door);
  box(0, depth / 2 + MID_BAY_PROJ + 0.1, plinthY + 0.2, plinthY + GROUND_FLOOR_H - 0.7, MID_BAY_W - 3.0, 0.12, COLORS.glass);
  addLit(winBuf, 0, depth / 2 + MID_BAY_PROJ + 0.16, plinthY + 0.3, plinthY + GROUND_FLOOR_H - 0.8, MID_BAY_W - 3.4, 0.05);
  // round white columns at the doors, carrying the slab
  for (const u of [-4.6, -1.6, 1.6, 4.6]) {
    const pos = toWorld(u, depth / 2 + 1.55);
    S.cyl(pos[0], pos[1], plinthY, plinthY + GROUND_FLOOR_H - 0.3, 0.26, 0.26, 10, COLORS.white);
  }
}

function buildCanopyAndYard(S, ctx, lampBuf) {
  const { toWorld, box, addLit, len, depth, baseY, angleT } = ctx;

  // ---------------- the pick-up canopy along the yard side ----------------
  {
    const u0 = -len / 2 - 2.0;
    const u1 = len / 2 + 3.0;
    const midU = (u0 + u1) / 2;
    const canopyLen = u1 - u0;
    const midV = -depth / 2 - CANOPY_W / 2;
    const canopyY = baseY + CANOPY_H;
    S.kind = KIND.PLAIN;
    box(midU, midV, canopyY, canopyY + 0.35, canopyLen, CANOPY_W, COLORS.canopy, { top: COLORS.canopy, topKind: KIND.FLAT });
    box(midU, midV, canopyY - 0.02, canopyY, canopyLen - 0.2, CANOPY_W - 0.2, COLORS.ceiling, { top: COLORS.ceiling, bottom: true });
    box(midU, midV - CANOPY_W / 2, canopyY - 0.4, canopyY + 0.5, canopyLen + 0.1, 0.2, COLORS.yellow); // the yellow fascia on the yard edge
    for (const endU of [u0, u1]) box(endU, midV, canopyY - 0.4, canopyY + 0.5, 0.2, CANOPY_W, COLORS.yellow);
    const postCount = Math.max(3, Math.round(canopyLen / 6.5));
    for (let k = 0; k <= postCount; k++) {
      const u = u0 + 0.4 + ((canopyLen - 0.8) * k) / postCount;
      box(u, -depth / 2 - CANOPY_W + 0.6, baseY, canopyY, 0.55, 0.55, COLORS.red);
      box(u, -depth / 2 - CANOPY_W + 0.6, baseY + 1.6, baseY + 2.6, 0.58, 0.58, COLORS.white); // the white band on the cladding
      if (k < postCount) addLit(lampBuf, u + (canopyLen - 0.8) / postCount / 2, midV, canopyY - 0.08, canopyY - 0.03, 1.4, 0.3);
    }
    // the PICK UP AREA sign hung from the fascia near the middle
    box(midU + 6, midV - CANOPY_W / 2 - 0.15, canopyY - 1.3, canopyY - 0.4, 6.0, 0.1, COLORS.white);
    box(midU + 8.3, midV - CANOPY_W / 2 - 0.2, canopyY - 1.3, canopyY - 0.4, 1.6, 0.1, COLORS.red);
  }

  // ---------------- concrete bus yard, parked intercity sleeper buses & yard floodlight poles (matching satellite) ----------------
  const yardStart = S.n;
  S.kind = KIND.ROAD;
  box(2, -depth / 2 - 36, baseY - 0.2, baseY + 0.08, len + 26, 56, COLORS.yardConcrete, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([yardStart, S.n]);
  // painted yellow/white bay lane markings across the bus yard
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 8; k++) box(-18 + k * 5.2, -depth / 2 - 33, baseY + 0.08, baseY + 0.11, 0.18, 12.6, COLORS.white);
  for (let k = 0; k < 7; k++) box(-16.5 + k * 5.6, -depth / 2 - 14.5, baseY + 0.08, baseY + 0.11, 0.18, 12.2, COLORS.yellow);

  // parked intercity sleeper buses (orange/red Phương Trang, blue/white, cream/red) in neat angled bays
  const placeBus = (u, v, angOff, color, length = 11.4, width = 2.55, height = 3.5) => {
    const [bx, bz] = toWorld(u, v);
    addIntercityBus(S, bx, bz, baseY, angleT + angOff, color, { length, width, height });
  };
  for (let k = 0; k < 6; k++) placeBus(-14 + k * 5.6, -depth / 2 - 14.5, Math.PI / 2 + 0.22, COLORS.buses[k % COLORS.buses.length]);
  for (let k = 0; k < 7; k++) placeBus(-16 + k * 5.2, -depth / 2 - 33, Math.PI / 2 + 0.22, COLORS.buses[(k + 2) % COLORS.buses.length]);
  for (let k = 0; k < 5; k++) placeBus(-12 + k * 5.6, -depth / 2 - 51, Math.PI / 2, COLORS.buses[(k + 4) % COLORS.buses.length], 9.2, 2.35, 3.1);

  // yard floodlight masts
  S.kind = KIND.PLAIN;
  for (const [u, v] of ([[-24, -depth / 2 - 24], [26, -depth / 2 - 24], [-24, -depth / 2 - 54], [26, -depth / 2 - 54]] as any[])) {
    const pos = toWorld(u, v);
    S.cyl(pos[0], pos[1], baseY, baseY + 11.5, 0.16, 0.1, 6, COLORS.mastPole);
    S.box(pos[0], pos[1], baseY + 11.4, baseY + 11.75, 1.4, 0.45, angleT, COLORS.mastHead);
    addLit(lampBuf, u, v, baseY + 11.2, baseY + 11.4, 1.2, 0.4);
  }
}

export function build({ data, S, group }) {
  const spec = data.special && data.special.benxenam;
  if (!spec) return;
  const ring = unflat(spec.ring);
  if (ring.length < 4) return;

  // the long edge nearest An Dương Vương is the front; the frame: u along the front, v out of it (front +, yard -)
  const center = ring.reduce((acc, pt) => [acc[0] + pt[0] / ring.length, acc[1] + pt[1] / ring.length], [0, 0]);
  let frontEdge = null;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    const edgeLen = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    if (edgeLen > 20 && (!frontEdge || mid[1] > frontEdge.mid[1])) frontEdge = { p, q, len: edgeLen, mid }; // the south-facing long edge (z south)
  }
  if (!frontEdge) return;
  const tan = [(frontEdge.q[0] - frontEdge.p[0]) / frontEdge.len, (frontEdge.q[1] - frontEdge.p[1]) / frontEdge.len];
  let norm = [tan[1], -tan[0]];
  if ((frontEdge.mid[0] - center[0]) * norm[0] + (frontEdge.mid[1] - center[1]) * norm[1] < 0) norm = [-norm[0], -norm[1]];
  const len = frontEdge.len;
  const depth = 2 * ((frontEdge.mid[0] - center[0]) * norm[0] + (frontEdge.mid[1] - center[1]) * norm[1]);
  const toWorld = (u, v): [number, number] => [center[0] + tan[0] * u + norm[0] * v, center[1] + tan[1] * u + norm[1] * v];
  const angleT = Math.atan2(tan[1], tan[0]);
  const angleN = Math.atan2(norm[1], norm[0]);
  const baseY = groundHeightAt(center[0], center[1]);
  const box = (u, v, y0, y1, su, sv, color, opt?) => {
    const pos = toWorld(u, v);
    S.box(pos[0], pos[1], y0, y1, su, sv, angleT, color, opt);
  };
  const addLit = (buf, u, v, y0, y1, su, sv) => {
    const pos = toWorld(u, v);
    buf.box(pos[0], pos[1], y0, y1, su, sv, angleT, [1, 1, 1], { top: [1, 1, 1], bottom: true });
  };

  const lampBuf = new Buf(512);
  const winBuf = new Buf(512);
  const blueBuf = new Buf(64); // night: canopy lamps, warm windows, the blue sign
  S.base = baseY - LAND_Y;

  const ctx = { toWorld, box, addLit, len, depth, baseY, angleT, angleN };
  buildTerminalHall(S, ctx, { winBuf, blueBuf });
  buildCanopyAndYard(S, ctx, lampBuf);

  for (const [buf, hexCol, boost] of ([[lampBuf, 0xf2f6ff, 1.2], [winBuf, 0xffd9a0, 0.9], [blueBuf, 0xe8f0ff, 1.3]] as any[])) {
    addEmissiveStripMesh(group, buf, hexCol, boost, id);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
