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
const GATE_NAME = 'Cửa Đông Ba';

const OPEN_WIDTH = 3.82;
const OPEN_HEIGHT = 5.19; // the nguyệt môn (huetourism.gov.vn, after Phan Thuận An)
const ARCH_SEGS = 10;
const PLAQUE_WIDTH = 2.31;
const PLAQUE_HEIGHT = 1.10; // the stone name tablet (same source)
const CORNICE_TOP_OFFSET = 1.6; // gate block above the wall walk (Street View: the cornice about 8.2 m above the road)
const BLOCK_DEPTH = 11.3; // depth from the outer face (satellite z20)
const CITY_NOTCH = { half: 18, back: 12.5 }; // the band cut back on the city side: must match GATE_FIX in scripts/build-data.mjs
const RETAINING_WALL_H = 3.8; // the city-side retaining wall above the street (Street View from Xuân 68)
const PLAQUE_BASE_Y = LAND_Y + 6.3;

const COLORS = {
  body: hex('#4a4643'),
  damp: hex('#34322e'),
  cornice: hex('#69655e'),
  dark: hex('#1f1a18'),
  render: hex('#9a8676'), // the lower storey's brick, its render mostly weathered off
  renderUpper: hex('#77716a'), // the upper storey, greyer
  roof: hex('#8f7a58'),
  roofEdge: hex('#5d5245'), // weathered ochre-grey tile
  stone: hex('#a7a194'),
  hedge: hex('#3a5529'),
  grille: hex('#3d3935'),
  door: hex('#4a2c1e'),
  iron: hex('#2a2624'),
  plaque: hex('#b9b3a6'),
  plaqueInner: hex('#3b3430'),
  finial: hex('#7d7466'),
};

function createGateFrame(data, S) {
  const norm = (str) => String(str || '').normalize('NFC');
  const gateRec = (data.gates || []).find((rec) => norm(rec.n) === norm(GATE_NAME));
  if (!gateRec) throw new Error('gate not in data.gates');
  const citadelPlace = (data.places || []).find((rec) => rec.id === 'kinhthanh');
  const cityCenter = citadelPlace ? [citadelPlace.x / 10, citadelPlace.z / 10] : [gateRec.c[0] / 10 - 900, gateRec.c[1] / 10 + 260];
  const { cx, cz, pa, px, pz, plen, pwid } = gateAxis(gateRec, cityCenter); // +v runs out of the city, towards the moat
  const alongX = -pz;
  const alongZ = px; // along the wall
  const wallRot = pa + Math.PI / 2;
  const toWorld = (localU, localV): [number, number] => [cx + localU * alongX + localV * px, cz + localU * alongZ + localV * pz];
  const toPoint3 = (localU, localV, y?) => {
    const pos = toWorld(localU, localV);
    return [pos[0], y, pos[1]];
  };
  const toNormal = (normU, normV, normY = 0): [number, number, number] => [normU * alongX + normV * px, normY, normU * alongZ + normV * pz];
  const box = (localU, localV, y0, y1, sizeU, sizeV, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], y0, y1, sizeU, sizeV, wallRot, color, opts);
  };
  const vOut = plen / 2;
  const vIn = vOut - BLOCK_DEPTH;
  const blockW = pwid + 0.4; // along the wall
  return { cx, cz, px, pz, alongX, alongZ, plen, wallRot, toWorld, toPoint3, toNormal, box, vOut, vIn, blockW };
}

function buildGateBlockAndPassage(S, frame, dims) {
  const { toPoint3, toNormal, box, vIn, vOut, blockW } = frame;
  const { baseY, corniceY, floorY, archRadius, crownY, springY } = dims;
  const arcPt = (k, rad = archRadius) => {
    const theta = Math.PI - (Math.PI * k) / ARCH_SEGS;
    return [rad * Math.cos(theta), springY + rad * Math.sin(theta)];
  };

  // ---- the gate block, the passage driven through it ----
  S.kind = KIND.MASONRY;
  for (const [faceV, faceSign] of [[vIn, -1], [vOut, 1]]) {
    const faceNorm = toNormal(0, faceSign);
    const faceQuad = (u0, u1, ya, yb) => S.quad(toPoint3(u0, faceV, ya), toPoint3(u1, faceV, ya), toPoint3(u1, faceV, yb), toPoint3(u0, faceV, yb), COLORS.body, faceNorm);
    const [signA, signB] = faceSign > 0 ? [-1, 1] : [1, -1]; // keep the quads facing out
    faceQuad(signA * blockW / 2, signA * archRadius, baseY, corniceY);
    faceQuad(signB * archRadius, signB * blockW / 2, baseY, corniceY);
    faceQuad(signA * archRadius, signB * archRadius, crownY, corniceY);
    for (let k = 0; k < ARCH_SEGS; k++) { // spandrels between the arch and the crown
      const [u0, y0] = arcPt(k);
      const [u1, y1] = arcPt(k + 1);
      if (faceSign > 0) S.quad(toPoint3(u0, faceV, y0), toPoint3(u1, faceV, y1), toPoint3(u1, faceV, crownY), toPoint3(u0, faceV, crownY), COLORS.body, faceNorm);
      else S.quad(toPoint3(u1, faceV, y1), toPoint3(u0, faceV, y0), toPoint3(u0, faceV, crownY), toPoint3(u1, faceV, crownY), COLORS.body, faceNorm);
    }
  }
  for (const side of [-1, 1]) { // the two ends, where the wall walk meets the block
    const sideU = (side * blockW) / 2;
    const [vA, vB] = side > 0 ? [vOut, vIn] : [vIn, vOut];
    S.quad(toPoint3(sideU, vA, baseY), toPoint3(sideU, vB, baseY), toPoint3(sideU, vB, corniceY), toPoint3(sideU, vA, corniceY), COLORS.body, toNormal(side, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(toPoint3(-blockW / 2, vIn, corniceY), toPoint3(-blockW / 2, vOut, corniceY), toPoint3(blockW / 2, vOut, corniceY), toPoint3(blockW / 2, vIn, corniceY), shade(PAL.stone, 0.8), [0, 1, 0]);
  S.quad(toPoint3(-archRadius, vIn - 0.3, floorY), toPoint3(-archRadius, vOut + 0.3, floorY), toPoint3(archRadius, vOut + 0.3, floorY), toPoint3(archRadius, vIn - 0.3, floorY), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  // the barrel vault and the dark lining of the passage
  for (let k = 0; k < ARCH_SEGS; k++) {
    const [u0, y0] = arcPt(k);
    const [u1, y1] = arcPt(k + 1);
    S.quad(toPoint3(u0, vIn + 0.01, y0), toPoint3(u0, vOut - 0.01, y0), toPoint3(u1, vOut - 0.01, y1), toPoint3(u1, vIn + 0.01, y1), shade(COLORS.body, 0.5), toNormal(-(u0 + u1) / 2, 0, springY - (y0 + y1) / 2));
  }
  for (const side of [-1, 1]) {
    const wallU = side * (archRadius - 0.01);
    const [vA, vB] = side > 0 ? [vIn, vOut] : [vOut, vIn];
    S.quad(toPoint3(wallU, vA, floorY), toPoint3(wallU, vB, floorY), toPoint3(wallU, vB, springY), toPoint3(wallU, vA, springY), COLORS.dark, toNormal(-side, 0));
  }
  return arcPt;
}

function buildCitySideNotchAndFacades(data, S, frame, dims, arcPt) {
  const { cx, cz, px, pz, alongX, alongZ, plen, toPoint3, toNormal, box, vIn, vOut, blockW } = frame;
  const { baseY, corniceY, floorY, archRadius, springY } = dims;

  // ---- the city side: the cut through the mapped rampart behind the block, and in the band's notch the low
  // retaining wall along the street, the gateposts and the bank rising behind them ----
  const halfSlot = CITADEL_PASSAGE.slot / 2;
  const wallWalkY = LAND_Y + WALL_H;
  const wallCrossingsAt = (localU) => { // where data.wall crosses the line at localU, behind the block (v, inner to outer)
    const hits = [];
    for (const poly of data.wall || []) {
      for (const flatRing of poly) {
        for (let i = 0, count = flatRing.length / 2; i < count; i++) {
          const j = (i + 1) % count;
          const ax = flatRing[2 * i] / 10 - cx;
          const az = flatRing[2 * i + 1] / 10 - cz;
          const bx = flatRing[2 * j] / 10 - cx;
          const bz = flatRing[2 * j + 1] / 10 - cz;
          const uA = ax * alongX + az * alongZ;
          const uB = bx * alongX + bz * alongZ;
          if ((uA - localU) * (uB - localU) >= 0) continue;
          const frac = (localU - uA) / (uB - uA);
          const vHit = (ax * px + az * pz) * (1 - frac) + (bx * px + bz * pz) * frac;
          if (vHit < vIn && vHit > -plen / 2 - 30) hits.push(vHit);
        }
      }
    }
    return hits.sort((a, b) => a - b);
  };
  const innerCrossing = (localU) => wallCrossingsAt(localU)[0] ?? null;
  const notchBackV = vOut - CITY_NOTCH.back;
  const streetFaceV = Math.max(innerCrossing(-CITY_NOTCH.half - 4) ?? -Infinity, innerCrossing(CITY_NOTCH.half + 4) ?? -Infinity);
  const isNotched = Number.isFinite(streetFaceV) && [-1, 1].every((side) => {
    const hits = wallCrossingsAt(side * (CITY_NOTCH.half - 2));
    return hits.length && Math.abs(hits[hits.length - 1] - notchBackV) < 0.6;
  });
  // a cut side, its top running from yA at vA to yB at vB
  const addCutCheek = (side, vA, vB, yA, yB, color) => {
    const cheekU = side * halfSlot;
    const [pA, pB, topA, topB] = side > 0 ? [vA, vB, yA, yB] : [vB, vA, yB, yA];
    S.quad(toPoint3(cheekU, pA, baseY), toPoint3(cheekU, pB, baseY), toPoint3(cheekU, pB, topB), toPoint3(cheekU, pA, topA), color, toNormal(-side, 0));
  };
  S.kind = KIND.MASONRY;
  let cutEndV = vIn;
  if (isNotched) {
    cutEndV = streetFaceV;
    const wallFootV = streetFaceV + 0.7; // back off the street (Xuân 68's carriageway reaches past the band's mapped edge)
    const lowWallY = LAND_Y + RETAINING_WALL_H;
    const bankFootV = wallFootV + 0.6;
    const notchEndU = CITY_NOTCH.half - 0.03;
    for (const side of [-1, 1]) {
      const wingLen = notchEndU - halfSlot;
      const midU = side * (halfSlot + wingLen / 2);
      box(midU, wallFootV + 0.3, baseY, lowWallY, wingLen, 0.6, COLORS.body, { top: COLORS.stone }); // the retaining wall
      box(midU, wallFootV + 0.3, LAND_Y + 0.05, LAND_Y + 0.7, wingLen, 0.64, COLORS.damp);
      box(midU, wallFootV + 0.3, lowWallY - 0.05, lowWallY + 0.12, wingLen, 0.72, COLORS.stone); // its coping
      S.kind = KIND.PLAIN;
      box(side * (halfSlot + 0.9 + (wingLen - 1.2) / 2), wallFootV + 0.35, lowWallY + 0.12, lowWallY + 1.0, wingLen - 1.2, 0.8, COLORS.hedge, { top: shade(COLORS.hedge, 1.2), taper: 0.85 });
      S.kind = KIND.MASONRY;
      // the gatepost: a square stone pier with a moulded cap and a knob
      const postU = side * (halfSlot + 0.45);
      box(postU, wallFootV + 0.3, baseY, lowWallY + 0.9, 0.9, 0.9, COLORS.stone);
      box(postU, wallFootV + 0.3, lowWallY + 0.9, lowWallY + 1.1, 1.15, 1.15, shade(COLORS.stone, 1.06));
      box(postU, wallFootV + 0.3, lowWallY + 1.1, lowWallY + 1.55, 0.6, 0.6, shade(COLORS.stone, 1.06), { taper: 0.45 });
      // the bank: grassed, from the wall's coping up to the walk at the notch's back
      S.kind = KIND.GROUND;
      const uA = side * halfSlot;
      const uB = side * notchEndU;
      S.quad(toPoint3(uA, bankFootV, lowWallY), toPoint3(uB, bankFootV, lowWallY), toPoint3(uB, notchBackV, wallWalkY), toPoint3(uA, notchBackV, wallWalkY), PAL.moss, [0, 1, 0]);
      S.kind = KIND.MASONRY;
      addCutCheek(side, wallFootV, bankFootV, lowWallY, lowWallY, shade(COLORS.body, 0.95));
      addCutCheek(side, bankFootV, notchBackV, lowWallY, wallWalkY, shade(COLORS.body, 0.95));
      addCutCheek(side, notchBackV, vIn, wallWalkY, wallWalkY, shade(COLORS.body, 0.9));
    }
  } else {
    for (const side of [-1, 1]) {
      const endV = innerCrossing(side * halfSlot);
      if (endV === null) continue;
      cutEndV = Math.min(cutEndV, endV);
      addCutCheek(side, endV, vIn, wallWalkY, wallWalkY, shade(COLORS.body, 0.9));
    }
  }
  S.kind = KIND.ROAD;
  S.quad(toPoint3(-halfSlot, cutEndV, floorY), toPoint3(-halfSlot, vIn, floorY), toPoint3(halfSlot, vIn, floorY), toPoint3(halfSlot, cutEndV, floorY), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  // the two lim leaves, iron-banded, swung open against the passage sides just inside the outer mouth
  for (const side of [-1, 1]) {
    box(side * (archRadius - 0.1), vOut - 2.0, floorY, springY - 0.05, 0.14, archRadius * 0.95, COLORS.door);
    for (const bandH of [0.9, 2.1, 3.2]) box(side * (archRadius - 0.18), vOut - 2.0, floorY + bandH, floorY + bandH + 0.1, 0.03, archRadius * 0.95, COLORS.iron);
  }

  // ---- the facades: damp foot, wide corner pilasters, the recessed panel round the arch, the tablet, the cornice ----
  const panelW = 6.4;
  const panelHeadY = LAND_Y + 6.0;
  for (const [faceV, faceSign] of [[vIn, -1], [vOut, 1]]) {
    const trimV = faceV + faceSign * 0.1;
    box(0, trimV + faceSign * 0.02, baseY, LAND_Y + 0.8, blockW + 0.3, 0.25, COLORS.damp);
    for (const side of [-1, 1]) {
      box(side * (blockW / 2 - 0.9), trimV + faceSign * 0.1, baseY, corniceY - 0.75, 1.8, 0.4, shade(COLORS.body, 1.06)); // corner pilasters, projecting
      box(side * (blockW / 2 - 0.9), trimV + faceSign * 0.16, corniceY - 1.1, corniceY - 0.75, 2.1, 0.52, COLORS.cornice); // their capitals
      box(side * (panelW / 2 - 0.2), trimV + faceSign * 0.06, LAND_Y + 0.8, panelHeadY, 0.4, 0.24, shade(COLORS.body, 1.04)); // the panel's frame, in brick
    }
    box(0, trimV + faceSign * 0.07, panelHeadY - 0.05, panelHeadY + 0.25, panelW + 0.2, 0.28, COLORS.cornice); // the panel's moulded head
    for (let k = 0; k < ARCH_SEGS; k++) { // the arch's ring, the same brick
      const [u0, y0] = arcPt(k, archRadius + 0.22);
      const [u1, y1] = arcPt(k + 1, archRadius + 0.22);
      S.beam(toPoint3(u0, trimV + faceSign * 0.06, y0), toPoint3(u1, trimV + faceSign * 0.06, y1), 0.12, 0.44, shade(COLORS.body, 0.82));
    }
    // the stone tablet: a raised frame, the characters on a dark ground
    box(0, trimV + faceSign * 0.06, PLAQUE_BASE_Y - 0.12, PLAQUE_BASE_Y + PLAQUE_HEIGHT + 0.12, PLAQUE_WIDTH + 0.5, 0.16, COLORS.plaque);
    box(0, trimV + faceSign * 0.12, PLAQUE_BASE_Y, PLAQUE_BASE_Y + PLAQUE_HEIGHT, PLAQUE_WIDTH, 0.06, COLORS.plaqueInner);
    box(0, trimV + faceSign * 0.04, LAND_Y + 0.8, LAND_Y + 1.0, blockW - 3.4, 0.2, shade(COLORS.cornice, 0.9)); // stone plinth course
    // the cornice: a curved moulding, stepped out in four courses
    for (const [yMin, yMax, stepD, shadeK] of [
      [corniceY - 0.75, corniceY - 0.58, 0.16, 0.92],
      [corniceY - 0.58, corniceY - 0.4, 0.28, 0.98],
      [corniceY - 0.4, corniceY - 0.2, 0.4, 1.02],
      [corniceY - 0.2, corniceY, 0.52, 1.08],
    ]) {
      box(0, trimV + faceSign * (stepD / 2 - 0.1), yMin, yMax, blockW + 0.2 + stepD, stepD + 0.2, shade(COLORS.cornice, shadeK), { top: shade(PAL.stone, 0.8) });
    }
  }
}

function buildParapetAndWatchtower(S, frame, corniceY) {
  const { toWorld, box, vIn, vOut, blockW, wallRot } = frame;
  // ---- the low parapet round the flat top: a solid rail between knobbed posts, finials at the corners ----
  S.kind = KIND.MASONRY;
  const blockDepth = vOut - vIn;
  const midV = (vIn + vOut) / 2;
  const railH = 0.55;
  for (const [edgeLen, alongU, offset] of [[blockW, true, vIn + 0.25], [blockW, true, vOut - 0.25], [blockDepth, false, -blockW / 2 + 0.25], [blockDepth, false, blockW / 2 - 0.25]] as any[]) {
    if (alongU) box(0, offset, corniceY, corniceY + railH, edgeLen, 0.4, shade(COLORS.body, 1.08), { top: COLORS.cornice });
    else box(offset, midV, corniceY, corniceY + railH, 0.4, edgeLen - 1.0, shade(COLORS.body, 1.08), { top: COLORS.cornice });
    const postCount = Math.max(2, Math.round(edgeLen / 2.4));
    for (let k = 1; k < postCount; k++) {
      const along = -edgeLen / 2 + (edgeLen * k) / postCount;
      const [postU, postV] = alongU ? [along, offset] : [offset, midV + along];
      box(postU, postV, corniceY, corniceY + 0.7, 0.45, 0.45, shade(COLORS.body, 1.12), { top: COLORS.cornice });
      box(postU, postV, corniceY + 0.7, corniceY + 0.92, 0.28, 0.28, shade(COLORS.cornice, 1.05), { taper: 0.5 });
    }
  }
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) {
      box(signU * (blockW / 2 - 0.35), midV + signV * (blockDepth / 2 - 0.35), corniceY, corniceY + 0.95, 0.7, 0.7, shade(COLORS.body, 1.12), { top: COLORS.cornice });
      box(signU * (blockW / 2 - 0.35), midV + signV * (blockDepth / 2 - 0.35), corniceY + 0.95, corniceY + 1.35, 0.36, 0.36, shade(COLORS.cornice, 1.05), { taper: 0.4 });
    }
  }

  // ---- the vọng lâu, set forward over the outer face ----
  const lowerW = 9.6;
  const lowerD = 6.2;
  const lowerH = 3.4;
  const upperW = 4.2;
  const upperD = 3.4;
  const upperH = 2.2;
  const towerV = vOut - 1.8 - lowerD / 2; // its front face 1.8 m behind the outer face
  const towerCenter = toWorld(0, towerV);
  const lowerBaseY = corniceY + 0.2;
  const lowerTopY = lowerBaseY + lowerH;
  const terraceY = lowerTopY + 0.35;
  const upperTopY = terraceY + upperH;
  box(0, towerV, corniceY, lowerBaseY, lowerW + 0.4, lowerD + 0.4, shade(PAL.stone, 0.8), { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  box(0, towerV, lowerBaseY, lowerTopY, lowerW, lowerD, COLORS.render);
  box(0, towerV, lowerTopY - 0.5, lowerTopY - 0.1, lowerW + 0.24, lowerD + 0.24, shade(COLORS.renderUpper, 0.95)); // cornice band

  const addFaceBox = (posAlong, posFace, outSign, alongU, y1, y2, width, color) => (
    alongU ? box(posAlong, posFace + outSign * 0.03, y1, y2, width, 0.1, color) : box(posFace + outSign * 0.03, posAlong, y1, y2, 0.1, width, color)
  );
  // an arched opening on a face: a dark rectangle to the springing and a stepped semicircle over it
  const addArchOpening = (posAlong, posFace, outSign, width, sillY, height, alongU = true) => {
    const rad = width / 2;
    const springY = sillY + height - rad;
    addFaceBox(posAlong, posFace, outSign, alongU, sillY, springY, width, COLORS.dark);
    for (let k = 0; k < 4; k++) {
      addFaceBox(posAlong, posFace, outSign, alongU, springY + (rad * k) / 4, springY + (rad * (k + 1)) / 4, 2 * rad * Math.sqrt(1 - ((k + 0.5) / 4) ** 2), COLORS.dark);
    }
  };
  // a round window with an iron grille, as a stepped disc
  const addOculus = (posU, posV, outSign, dia, centerY) => {
    const rad = dia / 2;
    const bands = 6;
    for (let k = 0; k < bands; k++) {
      const yA = centerY - rad + (2 * rad * k) / bands;
      const yB = yA + (2 * rad) / bands;
      const dy = (yA + yB) / 2 - centerY;
      addFaceBox(posU, posV, outSign, true, yA, yB, 2 * Math.sqrt(Math.max(0, rad * rad - dy * dy)), COLORS.grille);
    }
    addFaceBox(posU, posV, outSign * 1.6, true, centerY - 0.04, centerY + 0.04, dia * 0.95, shade(COLORS.grille, 1.5));
    addFaceBox(posU, posV, outSign * 1.6, true, centerY - rad * 0.95, centerY + rad * 0.95, 0.08, shade(COLORS.grille, 1.5));
  };
  for (const faceSign of [-1, 1]) {
    const faceV = towerV + faceSign * lowerD / 2;
    addArchOpening(0, faceV, faceSign, 2.2, lowerBaseY, 2.6);
    for (const side of [-1, 1]) {
      if (faceSign > 0) addArchOpening(side * 3.0, faceV, faceSign, 1.3, lowerBaseY, 1.45);
      else addOculus(side * 3.0, faceV, faceSign, 1.3, lowerBaseY + 1.55);
    }
    addArchOpening(towerV, faceSign * lowerW / 2, faceSign, 1.15, lowerBaseY + 0.3, 1.5, false);
  }
  S.kind = KIND.PLAIN;
  const roofOpts = { flare: 0.05, hips: false, horns: false, fascia: 0.16, fasciaCol: COLORS.roofEdge, ridgeCol: COLORS.roofEdge };
  S.hip(towerCenter[0], towerCenter[1], lowerW, lowerD, wallRot, lowerTopY - 0.15, 0.55, COLORS.roof, { ...roofOpts, over: 0.32 });
  // small curled ornaments at the skirt's corners
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) box(signU * (lowerW / 2 + 0.22), towerV + signV * (lowerD / 2 + 0.22), lowerTopY - 0.1, lowerTopY + 0.25, 0.22, 0.22, COLORS.roofEdge, { taper: 0.6 });
  }
  S.kind = KIND.MASONRY;
  box(0, towerV, lowerTopY, terraceY, lowerW - 1.2, lowerD - 1.2, shade(COLORS.renderUpper, 1.0), { top: shade(PAL.stone, 0.85) }); // the terrace
  const terW = lowerW - 1.2;
  const terD = lowerD - 1.2;
  for (const [edgeLen, alongU, offset] of [[terW, true, towerV - terD / 2 + 0.1], [terW, true, towerV + terD / 2 - 0.1], [terD, false, -terW / 2 + 0.1], [terD, false, terW / 2 - 0.1]] as any[]) {
    if (alongU) {
      box(0, offset, terraceY, terraceY + 0.12, edgeLen, 0.2, COLORS.renderUpper);
      box(0, offset, terraceY + 0.5, terraceY + 0.62, edgeLen, 0.2, COLORS.renderUpper);
    } else {
      box(offset, towerV, terraceY, terraceY + 0.12, 0.2, edgeLen, COLORS.renderUpper);
      box(offset, towerV, terraceY + 0.5, terraceY + 0.62, 0.2, edgeLen, COLORS.renderUpper);
    }
    const balCount = Math.max(2, Math.round(edgeLen / 0.5));
    for (let k = 1; k < balCount; k++) { // the balusters
      const along = -edgeLen / 2 + (edgeLen * k) / balCount;
      if (alongU) box(along, offset, terraceY + 0.12, terraceY + 0.5, 0.1, 0.1, shade(COLORS.renderUpper, 0.9));
      else box(offset, towerV + along, terraceY + 0.12, terraceY + 0.5, 0.1, 0.1, shade(COLORS.renderUpper, 0.9));
    }
  }
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) { // knobbed posts at its corners
      const postU = signU * (terW / 2 - 0.1);
      const postV = towerV + signV * (terD / 2 - 0.1);
      box(postU, postV, terraceY, terraceY + 0.8, 0.3, 0.3, COLORS.renderUpper);
      box(postU, postV, terraceY + 0.8, terraceY + 1.0, 0.22, 0.22, COLORS.renderUpper, { taper: 0.4 });
    }
  }
  box(0, towerV, terraceY, upperTopY, upperW, upperD, COLORS.renderUpper);
  box(0, towerV, upperTopY - 0.3, upperTopY - 0.05, upperW + 0.2, upperD + 0.2, shade(COLORS.renderUpper, 0.9));
  for (const faceSign of [-1, 1]) {
    addArchOpening(0, towerV + faceSign * upperD / 2, faceSign, 1.0, terraceY + 0.4, 1.3);
    addArchOpening(towerV, faceSign * upperW / 2, faceSign, 0.8, terraceY + 0.5, 1.1, false);
  }
  S.kind = KIND.PLAIN;
  S.hip(towerCenter[0], towerCenter[1], upperW, upperD, wallRot, upperTopY - 0.1, 0.5, COLORS.roof, { ...roofOpts, over: 0.28 });
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) box(signU * (upperW / 2 + 0.2), towerV + signV * (upperD / 2 + 0.2), upperTopY - 0.05, upperTopY + 0.28, 0.2, 0.2, COLORS.roofEdge, { taper: 0.6 });
  }
  // ridge ornaments and the finial
  for (const side of [-1, 1]) box(side * 0.5, towerV, upperTopY + 0.3, upperTopY + 0.7, 0.3, 0.22, COLORS.roofEdge, { taper: 0.5 });
  S.cyl(towerCenter[0], towerCenter[1], upperTopY + 0.35, upperTopY + 1.4, 0.07, 0.03, 6, COLORS.finial);
}

function buildNameTablet(group, THREE, frame) {
  // the tablet's characters, read right to left: 正 東 門 (a small canvas, in the browser only)
  if (!group || !THREE || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3b3430';
  ctx.fillRect(0, 0, 256, 112);
  ctx.fillStyle = '#d9cfb8';
  ctx.font = 'bold 66px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ['門', '東', '正'].forEach((ch, i) => ctx.fillText(ch, 48 + i * 80, 58));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const geo = new THREE.PlaneGeometry(PLAQUE_WIDTH - 0.1, PLAQUE_HEIGHT - 0.1);
  for (const [faceV, faceSign] of [[frame.vIn, -1], [frame.vOut, 1]]) {
    const pos = frame.toWorld(0, faceV + faceSign * 0.27);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], PLAQUE_BASE_Y + PLAQUE_HEIGHT / 2, pos[1]);
    mesh.rotation.y = Math.atan2(frame.px * faceSign, frame.pz * faceSign);
    mesh.userData.landmark = id;
    group.add(mesh);
  }
}

export function build({ data, S, group, THREE }) {
  const frame = createGateFrame(data, S);
  const archRadius = OPEN_WIDTH / 2;
  const crownY = LAND_Y + OPEN_HEIGHT;
  const dims = {
    baseY: LAND_Y - 0.5,
    corniceY: LAND_Y + WALL_H + CORNICE_TOP_OFFSET,
    floorY: LAND_Y + 0.02,
    archRadius,
    crownY,
    springY: crownY - archRadius,
  };
  const pavedStart = S.n;

  const arcPt = buildGateBlockAndPassage(S, frame, dims);
  buildCitySideNotchAndFacades(data, S, frame, dims, arcPt);
  buildParapetAndWatchtower(S, frame, dims.corniceY);

  (S.paved = S.paved || []).push([pavedStart, S.n]);
  S.kind = KIND.PLAIN;

  buildNameTablet(group, THREE, frame);
}
