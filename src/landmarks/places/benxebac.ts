import { KIND, Buf, hex } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { groundHeightAt, addEmissiveStripMesh, addIntercityBus } from '../helpers.ts';

// Bến xe phía Bắc, 132 Lý Thái Tổ (An Hòa): the northern intercity bus station of Công ty CP Bến xe Huế (issue #71).
// See docs/places/benxebac.md.
//
// OSM maps the station as a node and one outline, way 1435288831 (building), that takes in more than the hall: a
// block of about 27 x 30 m on Lý Thái Tổ, a narrower range of about 31 x 17 m reaching west along the yard and a
// small piece behind. What the photos show (mia.vn, bookaway, 2019-25):
//   hall     two storeys, flat-roofed, painted a bright yellow under a thick white roof slab that overhangs all
//            round; a white slab between the floors with a low parapet and planters; white-framed ribbon windows;
//            a white semicircular arched window in the middle of the upper floor; a blue sign over the doors and
//            the company's name in red on the fascia (an older photo has it on a blue board on the roof)
//   canopy   a flat roof with a yellow fascia on yellow square columns over the minibus bays beside the hall
// The block on the street is drawn as the hall, the long west range as the canopy (the photos put the canopy along
// the hall's side over the bays), the piece behind as a one-storey office. No height is published; the hall's 7.7 m
// is read off the photos (two storeys against the doors and people).

export const id = 'benxebac';

// the outline in model metres (OSM way 1435288831) and a frame along it: u along Lý Thái Tổ, w towards it
const ORIGIN = [-4510, -1895];
const ANGLE = Math.atan2(16.5, 26);
const TANGENT = [Math.cos(ANGLE), Math.sin(ANGLE)];
const NORMAL = [-TANGENT[1], TANGENT[0]];

const HALL = { u0: -2.6, u1: 24.0, w0: -12.4, w1: 17.9, floorH: 3.7, roofH: 7.2, slabH: 0.55, archR: 2.3 };
const SIGN_WORD = 'BEN XE HUE';

const COLORS = {
  yellow: hex('#f0c22e'),
  white: hex('#efeee8'),
  roof: hex('#a8a59d'),
  glass: hex('#2f3b45'),
  frame: hex('#f3f1ea'),
  blue: hex('#1f56a6'),
  red: hex('#c8202d'),
  green: hex('#4f6f33'),
  pave: hex('#b9b5ab'),
  door: hex('#4a3a2e'),
  yardConcrete: hex('#b8b4aa'),
  shelterRoof: hex('#3a756c'),
  shelterTop: hex('#43847a'),
  mastPole: hex('#6c7175'),
  mastHead: hex('#d8dce0'),
  buses: [hex('#e66824'), hex('#2c62a8'), hex('#d9382a'), hex('#eceae2'), hex('#3d7a5a'), hex('#e66824')],
};

const toWorld = (u, w): [number, number] => [ORIGIN[0] + TANGENT[0] * u + NORMAL[0] * w, ORIGIN[1] + TANGENT[1] * u + NORMAL[1] * w];

function placeBox(S, u, w, y0, y1, su, sw, color, opt?) {
  const pos = toWorld(u, w);
  S.box(pos[0], pos[1], y0, y1, su, sw, ANGLE, color, opt);
}

function addLit(buf, u, w, y0, y1, su, sw) {
  const pos = toWorld(u, w);
  buf.box(pos[0], pos[1], y0, y1, su, sw, ANGLE, [1, 1, 1], { top: [1, 1, 1], bottom: true });
}

function buildTerminalHall(S, baseY, litBufs) {
  const { winBuf, blueBuf, redBuf } = litBufs;
  const { u0, u1, w0, w1, floorH, roofH, slabH, archR } = HALL;
  const midU = (u0 + u1) / 2;
  const midW = (w0 + w1) / 2;
  const lenU = u1 - u0;
  const lenW = w1 - w0;

  S.kind = KIND.MASONRY;
  placeBox(S, midU, midW, baseY - 0.3, baseY + 0.3, lenU + 1.2, lenW + 1.2, COLORS.pave, { topKind: KIND.ROAD });
  S.kind = KIND.CIVIC;
  placeBox(S, midU, midW, baseY + 0.3, baseY + roofH, lenU, lenW, COLORS.yellow, { top: COLORS.roof });
  S.kind = KIND.PLAIN;
  placeBox(S, midU, midW, baseY + roofH, baseY + roofH + slabH, lenU + 2.8, lenW + 2.8, COLORS.white, { top: COLORS.roof, topKind: KIND.FLAT, bottom: true });
  // the slab between the floors on the front and the two sides, a low parapet with planters on it
  placeBox(S, midU, w1 + 1.0, baseY + floorH - 0.25, baseY + floorH, lenU + 2.0, 2.0, COLORS.white, { bottom: true });
  placeBox(S, midU, w1 + 1.9, baseY + floorH, baseY + floorH + 0.7, lenU + 2.0, 0.2, COLORS.white);
  for (const [u, side] of ([[u0 - 1.0, -1], [u1 + 1.0, 1]] as any[])) {
    placeBox(S, u, midW + 2, baseY + floorH - 0.25, baseY + floorH, 2.0, lenW - 4, COLORS.white, { bottom: true });
    placeBox(S, u + side * 0.9, midW + 2, baseY + floorH, baseY + floorH + 0.7, 0.2, lenW - 4, COLORS.white);
  }
  for (let k = 0; k < 7; k++) {
    const pos = toWorld(u0 + 2 + k * (lenU - 4) / 6, w1 + 1.3);
    S.cyl(pos[0], pos[1], baseY + floorH, baseY + floorH + 1.1, 0.5, 0.3, 6, COLORS.green);
  }
  // a white upright at each third of the front, as in the photo, up through the slab
  for (const frac of [0.3, 0.7]) placeBox(S, u0 + lenU * frac, w1 + 1.0, baseY + floorH, baseY + floorH + 1.3, 0.5, 2.0, COLORS.white);

  // front: ribbon windows in white frames either side of the arched window, the doors below
  for (const side of [-1, 1]) {
    const ua = midU + side * (archR + 1.0);
    const ub = side < 0 ? u0 + 1.0 : u1 - 1.0;
    const ribMid = (ua + ub) / 2;
    const ribLen = Math.abs(ub - ua);
    placeBox(S, ribMid, w1 + 0.06, baseY + floorH + 0.9, baseY + floorH + 2.7, ribLen, 0.12, COLORS.frame);
    placeBox(S, ribMid, w1 + 0.1, baseY + floorH + 1.05, baseY + floorH + 2.55, ribLen - 0.3, 0.12, COLORS.glass);
    for (let k = 1; k < Math.round(ribLen / 1.6); k++) {
      placeBox(S, Math.min(ua, ub) + k * 1.6, w1 + 0.15, baseY + floorH + 1.05, baseY + floorH + 2.55, 0.1, 0.1, COLORS.frame);
    }
    placeBox(S, ribMid, w1 + 0.06, baseY + 0.8, baseY + floorH - 0.7, ribLen, 0.12, COLORS.glass);
    addLit(winBuf, ribMid, w1 + 0.2, baseY + floorH + 1.15, baseY + floorH + 2.45, ribLen - 0.6, 0.05);
  }
  // the semicircular arched window: a white arch round dark glass, drawn in vertical strips
  {
    const archY = baseY + floorH + 1.0;
    const stripCount = 12;
    placeBox(S, midU, w1 + 0.06, archY - 0.15, archY + 1.4, 2 * archR + 0.4, 0.12, COLORS.frame);
    placeBox(S, midU, w1 + 0.1, archY, archY + 1.4, 2 * archR, 0.12, COLORS.glass);
    for (let k = 0; k < stripCount; k++) {
      const x = -archR + (k + 0.5) * (2 * archR / stripCount);
      const glassH = Math.sqrt(archR * archR - x * x);
      const frameH = Math.sqrt((archR + 0.3) ** 2 - x * x);
      placeBox(S, midU + x, w1 + 0.06, archY + 1.4, archY + 1.4 + frameH * 0.62, 2 * archR / stripCount + 0.02, 0.12, COLORS.frame);
      placeBox(S, midU + x, w1 + 0.1, archY + 1.4, archY + 1.4 + glassH * 0.62 - 0.05, 2 * archR / stripCount + 0.02, 0.12, COLORS.glass);
    }
    for (const x of [-archR / 2, 0, archR / 2]) {
      placeBox(S, midU + x, w1 + 0.15, archY, archY + 1.4 + Math.sqrt(archR * archR - x * x) * 0.62 - 0.1, 0.1, 0.1, COLORS.frame);
    }
    addLit(winBuf, midU, w1 + 0.2, archY + 0.1, archY + 2.6, 2 * archR - 0.8, 0.05);
  }
  // the doors and the blue sign over them
  placeBox(S, midU, w1 + 0.06, baseY + 0.3, baseY + floorH - 0.8, 4.4, 0.14, COLORS.door);
  placeBox(S, midU, w1 + 0.1, baseY + 0.4, baseY + floorH - 1.0, 3.6, 0.12, COLORS.glass);
  addLit(winBuf, midU, w1 + 0.18, baseY + 0.5, baseY + floorH - 1.1, 3.2, 0.05);
  placeBox(S, midU, w1 + 0.1, baseY + floorH - 0.8, baseY + floorH - 0.3, 9.0, 0.16, COLORS.blue);
  addLit(blueBuf, midU, w1 + 0.2, baseY + floorH - 0.7, baseY + floorH - 0.4, 7.6, 0.04);
  // the company's name in red letters on the fascia
  const letterStep = 0.62;
  for (let k = 0; k < SIGN_WORD.length; k++) {
    if (SIGN_WORD[k] === ' ') continue;
    const u = midU + (k - (SIGN_WORD.length - 1) / 2) * letterStep;
    placeBox(S, u, w1 + 1.45, baseY + roofH + 0.07, baseY + roofH + 0.48, letterStep * 0.72, 0.08, COLORS.red);
    addLit(redBuf, u, w1 + 1.5, baseY + roofH + 0.07, baseY + roofH + 0.48, letterStep * 0.72, 0.04);
  }
  // side walls and back: ribbon windows upstairs, a few lit
  for (const [u, side] of ([[u0, -1], [u1, 1]] as any[])) {
    const framePos = toWorld(u + side * 0.06, midW + 2);
    const glassPos = toWorld(u + side * 0.1, midW + 2);
    S.box(framePos[0], framePos[1], baseY + floorH + 0.9, baseY + floorH + 2.7, 0.12, lenW - 8, ANGLE, COLORS.frame);
    S.box(glassPos[0], glassPos[1], baseY + floorH + 1.05, baseY + floorH + 2.55, 0.12, lenW - 8.3, ANGLE, COLORS.glass);
    const litPos = toWorld(u + side * 0.18, midW + 2);
    winBuf.box(litPos[0], litPos[1], baseY + floorH + 1.15, baseY + floorH + 2.45, 0.05, lenW - 12, ANGLE, [1, 1, 1], { top: [1, 1, 1] });
  }
  placeBox(S, midU, w0 - 0.06, baseY + floorH + 1.0, baseY + floorH + 2.6, lenU - 6, 0.12, COLORS.glass);
}

function buildCanopyOfficeAndYard(S, baseY, lampBuf) {
  // ---------------- the canopy over the bays: the long range west of the hall ----------------
  {
    const a0 = -33.3;
    const a1 = HALL.u0;
    const b0 = -5.5;
    const b1 = 11.7;
    const midU = (a0 + a1) / 2;
    const midW = (b0 + b1) / 2;
    const lenU = a1 - a0;
    const lenW = b1 - b0;
    const canopyY = baseY + 4.6;
    S.kind = KIND.PLAIN;
    placeBox(S, midU, midW, canopyY, canopyY + 0.3, lenU, lenW, COLORS.roof, { topKind: KIND.FLAT, bottom: true });
    placeBox(S, midU, midW, canopyY + 0.3, canopyY + 0.9, lenU + 0.3, lenW + 0.3, COLORS.yellow, { top: COLORS.roof });
    placeBox(S, midU, midW, canopyY + 0.32, canopyY + 0.9, lenU - 0.3, lenW - 0.3, COLORS.roof, { top: COLORS.roof }); // the roof sheet inside the fascia
    const colCount = Math.max(3, Math.round(lenU / 6.2));
    for (let k = 0; k <= colCount; k++) {
      const u = a0 + 0.4 + ((lenU - 0.8) * k) / colCount;
      for (const w of [b0 + 0.4, b1 - 0.4]) {
        if (k === colCount && w > 0) continue; // the hall's wall carries this corner
        placeBox(S, u, w, baseY, canopyY, 0.5, 0.5, COLORS.yellow);
      }
      if (k < colCount) addLit(lampBuf, u + (lenU - 0.8) / colCount / 2, midW, canopyY - 0.06, canopyY - 0.01, 1.4, 0.3);
    }
  }

  // ---------------- the one-storey office behind ----------------
  {
    const a0 = -24.8;
    const a1 = -8.3;
    const b0 = -15.7;
    const b1 = -5.5;
    const midU = (a0 + a1) / 2;
    const midW = (b0 + b1) / 2;
    const lenU = a1 - a0;
    const lenW = b1 - b0;
    S.kind = KIND.CIVIC;
    placeBox(S, midU, midW, baseY, baseY + 3.8, lenU, lenW, COLORS.yellow, { top: COLORS.roof });
    S.kind = KIND.PLAIN;
    placeBox(S, midU, midW, baseY + 3.8, baseY + 4.25, lenU + 1.2, lenW + 1.2, COLORS.white, { top: COLORS.roof, topKind: KIND.FLAT, bottom: true });
    placeBox(S, midU, b0 - 0.06, baseY + 1.2, baseY + 2.6, lenU - 3, 0.12, COLORS.glass);
  }

  // ---------------- concrete bus yard, teal boarding shelter & parked intercity buses (matching satellite) ----------------
  const yardStart = S.n;
  S.kind = KIND.ROAD;
  placeBox(S, -10, -28, baseY - 0.2, baseY + 0.08, 66, 36, COLORS.yardConcrete, { topKind: KIND.ROAD });
  placeBox(S, -18, 2.5, baseY - 0.2, baseY + 0.08, 34, 19, COLORS.yardConcrete, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([yardStart, S.n]);

  // teal-green pitched boarding shelter along the north-east edge of the yard (prominent on satellite)
  S.kind = KIND.PLAIN;
  const shU = 12;
  const shW = -34;
  const shL = 32;
  const shD = 8.5;
  const shY = baseY + 4.8;
  placeBox(S, shU, shW, shY, shY + 0.45, shL, shD, COLORS.shelterRoof, { top: COLORS.shelterTop, topKind: KIND.FLAT, bottom: true });
  for (let k = 0; k <= 5; k++) {
    const u = shU - shL / 2 + 0.8 + (k * (shL - 1.6)) / 5;
    for (const dw of [-shD / 2 + 0.6, shD / 2 - 0.6]) placeBox(S, u, shW + dw, baseY, shY, 0.42, 0.42, COLORS.white);
    if (k < 5) addLit(lampBuf, u + (shL - 1.6) / 10, shW, shY - 0.08, shY - 0.02, 1.4, 0.3);
  }
  // painted parking bay stripes on the concrete apron
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 12; k++) placeBox(S, -35 + k * 5.6, -24.5, baseY + 0.08, baseY + 0.11, 0.18, 12.2, COLORS.white);

  // parked sleeper buses and minibuses in neat bays across the yard
  const placeBus = (u, w, angOff, color, length = 11.2, width = 2.5, height = 3.45) => {
    const [bx, bz] = toWorld(u, w);
    addIntercityBus(S, bx, bz, baseY, ANGLE + angOff, color, { length, width, height });
  };
  for (let k = 0; k < 5; k++) placeBus(-31 + k * 5.6, 3.0, Math.PI / 2, COLORS.buses[k % COLORS.buses.length], 8.6, 2.3, 3.0);
  for (let k = 0; k < 6; k++) placeBus(-32 + k * 6.0, -24.5, Math.PI / 2 + 0.15, COLORS.buses[(k + 1) % COLORS.buses.length]);
  for (let k = 0; k < 5; k++) placeBus(0 + k * 5.6, -24.5, Math.PI / 2, COLORS.buses[(k + 3) % COLORS.buses.length]);

  // yard floodlight masts
  for (const [u, w] of ([[-38, -14], [-38, -40], [20, -40]] as any[])) {
    const pos = toWorld(u, w);
    S.cyl(pos[0], pos[1], baseY, baseY + 11.0, 0.16, 0.1, 6, COLORS.mastPole);
    S.box(pos[0], pos[1], baseY + 10.9, baseY + 11.25, 1.3, 0.4, ANGLE, COLORS.mastHead);
    addLit(lampBuf, u, w, baseY + 10.7, baseY + 10.9, 1.1, 0.35);
  }
}

export function build({ S, group }) {
  const baseY = groundHeightAt(...toWorld(10, 3));
  const lampBuf = new Buf(256);
  const winBuf = new Buf(512);
  const blueBuf = new Buf(64);
  const redBuf = new Buf(128); // canopy lamps, windows, blue sign, red letters
  S.base = baseY - LAND_Y;

  buildTerminalHall(S, baseY, { winBuf, blueBuf, redBuf });
  buildCanopyOfficeAndYard(S, baseY, lampBuf);

  for (const [buf, hexCol, boost] of ([[lampBuf, 0xf2f6ff, 1.2], [winBuf, 0xffd9a0, 0.9], [blueBuf, 0xe8f0ff, 1.3], [redBuf, 0xff3040, 1.6]] as any[])) {
    addEmissiveStripMesh(group, buf, hexCol, boost, id);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
