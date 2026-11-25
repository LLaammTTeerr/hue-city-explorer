import { KIND, Buf, hex, shade, mix, unflat, rand } from '../../geo/buf.ts';
import { gateAxis, CITADEL_PASSAGE } from '../../geo/gates.ts';
import { bridgeProfiles, resample } from '../../geo/bridges.ts';
import { LAND_Y, WALL_H, PAL, ROAD_W, POND_Y } from '../../config.ts';
import { lightMaterial } from '../../geo/materials.ts';

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
const GATE_NAME = 'Cửa Ngăn';

const OPEN_WIDTH = 3.8;
const OPEN_HEIGHT = 4.6; // inside the 5.6 m slot city.js and kinhthanh.js cut through the rampart
const CORNICE_TOP_OFFSET = 1.4; // cornice top over the wall walk: with the 0.8 m parapet the block stands ~8.8 m (Street View, 2026)
const BRIDGE_WIDTH = 5.9; // the causeway over the moat (OSM man_made=bridge way 1431132256)
const BLOCK_DEPTH = 13.0; // the masonry block across the wall (satellite 12-14 m; OSM 12.0 m): the passage runs on through the earth rampart
const GATE_WIDTH = 17.1; // along the wall (OSM)
const PARAPET_HEIGHT = 0.8;
const ARCH_SEGS = 10;

// The block's brick is the rampart's (kinhthanh.js: shade(PAL.brick, 0.86)) with a little of the old red left in it:
// weathered near-black brown with grey streaks, the same brick as the wall beside it (Street View, 2026)
const RAMPART_BRICK = shade(PAL.brick, 0.86);
const GATE_BRICK = mix(RAMPART_BRICK, hex('#6e4a3c'), 0.3);
const COLORS = {
  brick: GATE_BRICK,
  brickDark: hex('#3a3833'),
  render: hex('#7b7a72'),
  renderDark: hex('#5c5b55'),
  frame: shade(GATE_BRICK, 0.9),
  dark: hex('#1f1a18'),
  panel: hex('#b8b2a2'),
  tower: mix(RAMPART_BRICK, hex('#6e4a3c'), 0.25),
  upper: hex('#6f6c64'),
  tile: hex('#4f4740'),
  ridge: hex('#6a665e'),
  streaks: [hex('#46443e'), hex('#4a4d3e'), hex('#3c3a35')], // soot and lichen from the cornice down (kinhthanh.js)
  white: hex('#a9a79e'),
  causeway: hex('#858577'),
  causewayDark: hex('#4f5446'),
  pave: hex('#8a857a'),
  rubble: hex('#6a665b'),
  finialSpike: hex('#4a4744'),
};

function createGateFrame(data, S) {
  const norm = (str) => String(str || '').normalize('NFC');
  const gateRec = (data.gates || []).find((rec) => norm(rec.n) === norm(GATE_NAME));
  if (!gateRec) throw new Error('gate not in data.gates');
  const citadelPlace = (data.places || []).find((rec) => rec.id === 'kinhthanh');
  const cityCenter = citadelPlace ? [citadelPlace.x / 10, citadelPlace.z / 10] : [gateRec.c[0] / 10 - 600, gateRec.c[1] / 10 - 800];
  const axis = gateAxis(gateRec, cityCenter);
  const centerX = axis.cx;
  const centerZ = axis.cz;
  // outAxis: out of the city (towards the moat and the river), alongAxis: along the wall
  let outX = axis.px;
  let outZ = axis.pz;
  if ((centerX - cityCenter[0]) * outX + (centerZ - cityCenter[1]) * outZ < 0) {
    outX = -outX;
    outZ = -outZ;
  }
  const alongX = -outZ;
  const alongZ = outX;
  const wallAngle = Math.atan2(alongZ, alongX);
  const toWorld = (localU, localV): [number, number] => [centerX + localU * alongX + localV * outX, centerZ + localU * alongZ + localV * outZ];
  const toPoint3 = (localU, localV, y?) => {
    const pos = toWorld(localU, localV);
    return [pos[0], y, pos[1]];
  };
  const toNormal = (normU, normV, normY = 0): [number, number, number] => [normU * alongX + normV * outX, normY, normU * alongZ + normV * outZ];
  const box = (localU, localV, y0, y1, sizeU, sizeV, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], y0, y1, sizeU, sizeV, wallAngle, color, opts);
  };

  // rays in the gate's own (u, v) frame against mapped edges: the rampart band (data.wall) and the land's edge (the moat)
  const extractEdges = (polys) => {
    const edges = [];
    for (const poly of polys || []) {
      for (const ring of poly.map(unflat)) {
        for (let i = 0; i < ring.length; i++) edges.push([ring[i], ring[(i + 1) % ring.length]]);
      }
    }
    return edges;
  };
  const bandEdges = extractEdges(data.wall);
  const landEdges = extractEdges(data.land);
  const rayHits = (edgeList, u0, v0, du, dv, maxDist = 40) => {
    const orig = toWorld(u0, v0);
    const dx = du * alongX + dv * outX;
    const dz = du * alongZ + dv * outZ;
    const hits = [];
    for (const [ptA, ptB] of edgeList) {
      const ex = ptB[0] - ptA[0];
      const ez = ptB[1] - ptA[1];
      const denom = dx * ez - dz * ex;
      if (Math.abs(denom) < 1e-9) continue;
      const qx = ptA[0] - orig[0];
      const qz = ptA[1] - orig[1];
      const paramT = (qx * ez - qz * ex) / denom;
      const paramS = (qx * dz - qz * dx) / denom;
      if (paramS >= 0 && paramS <= 1 && Math.abs(paramT) < maxDist) hits.push(paramT);
    }
    return hits;
  };
  const nearestHit = (edgeList, u0, v0, du, dv, fallback) => {
    const hits = rayHits(edgeList, u0, v0, du, dv).filter((dist) => dist > 0.05);
    return hits.length ? Math.min(...hits) : fallback;
  };

  // where the rampart's faces cross the axis: the notch the passage opens into, and the outer face
  const vNotch = -nearestHit(bandEdges, 0, 0, 0, -1, 6.0);
  const vOut = nearestHit(bandEdges, 0, 0, 0, 1, 5.6) + 0.8; // the block stands a little proud of the outer face
  const vIn = Math.max(vNotch - 0.4, vOut - BLOCK_DEPTH); // its inner face; behind it the passage runs on, open, through the rampart
  const uLeft = -nearestHit(bandEdges, 0, vNotch - 1, -1, 0, 3.7);
  const uRight = nearestHit(bandEdges, 0, vNotch - 1, 1, 0, 4.7); // the notch's sides
  const vFace = -nearestHit(bandEdges, uRight + 1.5, 0, 0, -1, 11.4); // the rampart's inner face along Ông Ích Khiêm
  const vBank = nearestHit(landEdges, 0, vOut, 0, 1, 8.4) + vOut; // the moat's edge

  return {
    centerX, centerZ, outX, outZ, alongX, alongZ, wallAngle,
    toWorld, toPoint3, toNormal, box,
    vNotch, vOut, vIn, uLeft, uRight, vFace, vBank,
  };
}

function arcPoint(k, radius, springY, segCount = ARCH_SEGS) {
  const theta = Math.PI - (Math.PI * k) / segCount;
  return [radius * Math.cos(theta), springY + radius * Math.sin(theta)];
}

function buildGateBlockAndFaces(S, frame, dims) {
  const { toPoint3, toNormal, box, vIn, vOut } = frame;
  const { baseY, corniceY, floorY, archRadius, crownY, springY } = dims;

  // ---- the gate block, the passage driven through it ----
  S.kind = KIND.MASONRY;
  for (const [faceV, faceSign] of [[vIn, -1], [vOut, 1]]) {
    const faceNorm = toNormal(0, faceSign);
    const faceQuad = (u0, u1, ya, yb) => S.quad(toPoint3(u0, faceV, ya), toPoint3(u1, faceV, ya), toPoint3(u1, faceV, yb), toPoint3(u0, faceV, yb), COLORS.brick, faceNorm);
    faceQuad(-GATE_WIDTH / 2, -archRadius, baseY, corniceY);
    faceQuad(archRadius, GATE_WIDTH / 2, baseY, corniceY);
    faceQuad(-archRadius, archRadius, crownY, corniceY);
    for (let k = 0; k < ARCH_SEGS; k++) {
      const [u0, y0] = arcPoint(k, archRadius, springY);
      const [u1, y1] = arcPoint(k + 1, archRadius, springY);
      S.quad(toPoint3(u0, faceV, y0), toPoint3(u1, faceV, y1), toPoint3(u1, faceV, crownY), toPoint3(u0, faceV, crownY), COLORS.brick, faceNorm);
    }
  }
  for (const side of [-1, 1]) {
    const sideU = (side * GATE_WIDTH) / 2;
    S.quad(toPoint3(sideU, vIn, baseY), toPoint3(sideU, vOut, baseY), toPoint3(sideU, vOut, corniceY), toPoint3(sideU, vIn, corniceY), COLORS.brick, toNormal(side, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(toPoint3(-GATE_WIDTH / 2, vIn, corniceY), toPoint3(-GATE_WIDTH / 2, vOut, corniceY), toPoint3(GATE_WIDTH / 2, vOut, corniceY), toPoint3(GATE_WIDTH / 2, vIn, corniceY), shade(PAL.stone, 0.8), [0, 1, 0]);
  S.quad(toPoint3(-archRadius, vIn - 0.3, floorY), toPoint3(-archRadius, vOut + 0.3, floorY), toPoint3(archRadius, vOut + 0.3, floorY), toPoint3(archRadius, vIn - 0.3, floorY), shade(PAL.stone, 0.6), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  for (let k = 0; k < ARCH_SEGS; k++) { // the barrel vault and the passage's dark sides
    const [u0, y0] = arcPoint(k, archRadius, springY);
    const [u1, y1] = arcPoint(k + 1, archRadius, springY);
    S.quad(toPoint3(u0, vIn + 0.01, y0), toPoint3(u0, vOut - 0.01, y0), toPoint3(u1, vOut - 0.01, y1), toPoint3(u1, vIn + 0.01, y1), shade(COLORS.brick, 0.38), toNormal(-(u0 + u1) / 2, 0, springY - (y0 + y1) / 2));
  }
  for (const side of [-1, 1]) {
    const wallU = side * (archRadius - 0.01);
    S.quad(toPoint3(wallU, vIn, floorY), toPoint3(wallU, vOut, floorY), toPoint3(wallU, vOut, springY), toPoint3(wallU, vIn, springY), COLORS.dark, toNormal(-side, 0));
  }

  // ---- the two faces: damp foot, rendered pilasters, the arch's brick panel, the name panel, render patches, cornice ----
  for (const [faceV, faceSign] of [[vIn, -1], [vOut, 1]]) {
    const trimV = faceV + faceSign * 0.1;
    box(0, trimV + faceSign * 0.02, baseY, LAND_Y + 0.6, GATE_WIDTH + 0.3, 0.25, COLORS.brickDark);
    for (const side of [-1, 1]) {
      box(side * (GATE_WIDTH / 2 - 0.6), trimV + faceSign * 0.05, LAND_Y + 0.6, corniceY - 0.6, 1.3, 0.3, COLORS.render); // corner pilasters, rendered grey
      box(side * 2.75, trimV, floorY, LAND_Y + 5.8, 0.5, 0.2, COLORS.frame); // the brick panel's sides
      box(side * (archRadius + 0.25), trimV + faceSign * 0.03, floorY, springY, 0.5, 0.2, COLORS.frame); // the arch's jambs
    }
    box(0, trimV, LAND_Y + 5.8, LAND_Y + 6.1, 6.0, 0.2, COLORS.frame); // the panel's head
    S.kind = KIND.MASONRY;
    for (let k = 0; k < ARCH_SEGS; k++) { // the arch's brick voussoir ring
      const [u0, y0] = arcPoint(k, archRadius + 0.3, springY);
      const [u1, y1] = arcPoint(k + 1, archRadius + 0.3, springY);
      S.beam(toPoint3(u0, trimV + faceSign * 0.04, y0), toPoint3(u1, trimV + faceSign * 0.04, y1), 0.24, 0.6, COLORS.frame);
    }
    S.kind = KIND.PLAIN;
    // the name panel: a framed rendered tablet with the characters in relief
    const panelBaseY = LAND_Y + 6.25;
    const panelH = 1.05;
    box(0, trimV + faceSign * 0.06, panelBaseY, panelBaseY + panelH, 2.6, 0.16, COLORS.render);
    box(0, trimV + faceSign * 0.1, panelBaseY + 0.12, panelBaseY + panelH - 0.12, 2.3, 0.08, COLORS.panel);
    // the weathering: soot and lichen streaks running down from the cornice over the brick and the pilasters, as on the
    // rampart beside it (no rectangular render patches: the render is left on the pilasters and the cornice band). Each
    // streak is a single quad laid on its face at its own small offset, and no two on one face overlap.
    const streakQuad = (u0, u1, ya, yb, offset, color) => S.quad(
      toPoint3(u0, faceV + faceSign * offset, ya),
      toPoint3(u1, faceV + faceSign * offset, ya),
      toPoint3(u1, faceV + faceSign * offset, yb),
      toPoint3(u0, faceV + faceSign * offset, yb),
      color,
      toNormal(0, faceSign),
    );
    for (const side of [-1, 1]) {
      for (let j = 0; j < 3; j++) { // three slots between the arch's brick panel (|u| 3.0) and the pilaster (|u| 7.3)
        const randVal = rand(j, 21 + faceSign + side);
        const streakW = 0.3 + randVal * 0.45;
        const streakU = 3.4 + j * 1.3 + (0.6 - streakW / 2) * rand(j, 23 + faceSign + side);
        const streakBotY = LAND_Y + 1.2 + rand(j, 25 + faceSign + side) * 3.4;
        streakQuad(side * streakU, side * (streakU + streakW), streakBotY, corniceY - 1.5, 0.04, mix(COLORS.brick, COLORS.streaks[(j + (side > 0 ? 1 : 0)) % 3], 0.45));
      }
      const pilasterU = side * (GATE_WIDTH / 2 - 0.6); // a dark streak down each pilaster, just proud of its rendered face (front at 0.3)
      streakQuad(pilasterU - 0.35, pilasterU + 0.1, LAND_Y + 2.2 + rand(side, 27 + faceSign) * 2, corniceY - 0.6, 0.34, mix(COLORS.render, COLORS.renderDark, 0.6));
    }
    box(0, trimV + faceSign * 0.01, corniceY - 1.5, corniceY - 0.6, GATE_WIDTH - 2.6, 0.12, COLORS.renderDark); // the frieze under the cornice
    box(0, trimV + faceSign * 0.1, corniceY - 0.6, corniceY - 0.2, GATE_WIDTH + 0.5, 0.4, COLORS.render);
    box(0, trimV + faceSign * 0.16, corniceY - 0.2, corniceY, GATE_WIDTH + 0.7, 0.52, shade(COLORS.render, 1.08), { top: shade(PAL.stone, 0.85) });
  }
}

function buildTopParapetAndWatchtower(S, frame, corniceY) {
  const { toWorld, box, vIn, vOut, alongX, alongZ, outX, outZ, wallAngle } = frame;
  // ---- the solid parapet round the flat top, with posts at the corners and along the faces ----
  const blockDepth = vOut - vIn;
  const midV = (vIn + vOut) / 2;
  for (const [segLen, alongU, offset] of [[GATE_WIDTH, true, vIn + 0.25], [GATE_WIDTH, true, vOut - 0.25], [blockDepth, false, -GATE_WIDTH / 2 + 0.25], [blockDepth, false, GATE_WIDTH / 2 - 0.25]] as any[]) {
    if (alongU) box(0, offset, corniceY, corniceY + PARAPET_HEIGHT, segLen, 0.5, COLORS.render, { top: shade(COLORS.render, 1.15) });
    else box(offset, midV, corniceY, corniceY + PARAPET_HEIGHT, 0.5, segLen, COLORS.render, { top: shade(COLORS.render, 1.15) });
  }
  for (const postV of [vIn + 0.25, vOut - 0.25]) {
    for (const postU of [-GATE_WIDTH / 2 + 0.25, -GATE_WIDTH / 2 + 4.5, GATE_WIDTH / 2 - 4.5, GATE_WIDTH / 2 - 0.25]) {
      box(postU, postV, corniceY, corniceY + PARAPET_HEIGHT + 0.45, 0.62, 0.62, COLORS.render, { top: shade(COLORS.render, 1.15) });
      box(postU, postV, corniceY + PARAPET_HEIGHT + 0.45, corniceY + PARAPET_HEIGHT + 0.6, 0.4, 0.4, COLORS.renderDark);
    }
  }

  // ---- the vọng lâu: two masonry storeys under glazed tile, weathered dark, the eaves near straight with short tips ----
  const towerW = 8.5;
  const towerD = 7.0;
  const lowerH = 3.8; // lower storey (front width and height measured on the bridge-axis Street View, 2026; depth estimated)
  const lowerTopY = corniceY + lowerH;
  S.kind = KIND.MASONRY;
  box(0, midV, corniceY, lowerTopY, towerW, towerD, COLORS.tower);
  S.kind = KIND.PLAIN;
  box(0, midV, lowerTopY - 0.35, lowerTopY, towerW + 0.24, towerD + 0.24, COLORS.render); // the cornice band

  // arched openings, as dark recesses with a brick rim; faces: long (±O) and short (±U)
  const buildArchOpening = (face, offsetAlong, width, sillY, topY, rimColor) => {
    const { at, right, nrm } = face;
    const rad = width / 2;
    const springY = topY - rad;
    const segs = 6;
    const pt = (along, y, out = 0): [number, number, number] => [at[0] + right[0] * along + nrm[0] * out, y, at[1] + right[1] * along + nrm[1] * out];
    const norm3 = [nrm[0], 0, nrm[1]];
    S.quad(pt(offsetAlong - rad, sillY, 0.03), pt(offsetAlong + rad, sillY, 0.03), pt(offsetAlong + rad, springY, 0.03), pt(offsetAlong - rad, springY, 0.03), COLORS.dark, norm3);
    for (let k = 0; k < segs; k++) {
      const [a0, b0] = arcPoint(k, rad, springY, segs);
      const [a1, b1] = arcPoint(k + 1, rad, springY, segs);
      S.tri(pt(offsetAlong, springY, 0.03), pt(offsetAlong + a0, b0, 0.03), pt(offsetAlong + a1, b1, 0.03), COLORS.dark, norm3);
      const [c0, d0] = arcPoint(k, rad + 0.22, springY, segs);
      const [c1, d1] = arcPoint(k + 1, rad + 0.22, springY, segs);
      S.quad(pt(offsetAlong + a0, b0, 0.06), pt(offsetAlong + a1, b1, 0.06), pt(offsetAlong + c1, d1, 0.06), pt(offsetAlong + c0, d0, 0.06), rimColor, norm3);
    }
  };
  const getFaces = (width, depth, centerV) => [
    { at: toWorld(0, centerV + depth / 2), right: [alongX, alongZ], nrm: [outX, outZ], len: width },
    { at: toWorld(0, centerV - depth / 2), right: [alongX, alongZ], nrm: [-outX, -outZ], len: width },
    { at: toWorld(width / 2, centerV), right: [outX, outZ], nrm: [alongX, alongZ], len: depth },
    { at: toWorld(-width / 2, centerV), right: [outX, outZ], nrm: [-alongX, -alongZ], len: depth },
  ];
  for (const face of getFaces(towerW, towerD, midV)) {
    if (face.len > 7.5) {
      buildArchOpening(face, 0, 2.0, corniceY + PARAPET_HEIGHT - 0.1, corniceY + 2.75, shade(COLORS.tower, 1.15));
      for (const sideOff of [-2.75, 2.75]) buildArchOpening(face, sideOff, 1.25, corniceY + PARAPET_HEIGHT + 0.1, corniceY + 2.3, shade(COLORS.tower, 1.15));
    } else {
      buildArchOpening(face, 0, 1.5, corniceY + PARAPET_HEIGHT, corniceY + 2.5, shade(COLORS.tower, 1.15));
    }
  }
  // first roof: a tiled skirt round the tower, its top a small parapeted terrace round the upper storey
  S.hip(...toWorld(0, midV), towerW, towerD, wallAngle, lowerTopY, 1.05, COLORS.tile, {
    flare: 0.12, over: 0.6, ridgeCol: COLORS.ridge, hips: true, horns: false, glazed: true, segs: 3, fascia: 0.14, fasciaCol: shade(COLORS.tile, 0.6),
  });
  const terraceY = lowerTopY + 0.95;
  box(0, midV, terraceY - 0.5, terraceY, 5.6, 5.0, COLORS.render, { top: shade(PAL.stone, 0.8) });
  for (const [segLen, alongU, offset] of [[5.6, true, midV - 2.35], [5.6, true, midV + 2.35], [5.0, false, -2.65], [5.0, false, 2.65]] as any[]) {
    if (alongU) box(0, offset, terraceY, terraceY + 0.45, segLen, 0.3, COLORS.render, { top: shade(COLORS.render, 1.15) });
    else box(offset, midV, terraceY, terraceY + 0.45, 0.3, segLen, COLORS.render, { top: shade(COLORS.render, 1.15) });
  }
  for (const signU of [-2.65, 2.65]) {
    for (const signV of [-2.35, 2.35]) box(signU, midV + signV, terraceY, terraceY + 0.8, 0.42, 0.42, COLORS.render, { top: COLORS.ridge });
  }
  // the upper storey, rendered, one arch on each face, then the top roof
  const upperW = 4.0;
  const upperD = 3.6;
  const upperTopY = terraceY + 2.05;
  box(0, midV, terraceY, upperTopY, upperW, upperD, COLORS.upper);
  box(0, midV, upperTopY - 0.28, upperTopY, upperW + 0.2, upperD + 0.2, COLORS.render);
  for (const face of getFaces(upperW, upperD, midV)) buildArchOpening(face, 0, 1.15, terraceY + 0.35, terraceY + 1.65, shade(COLORS.upper, 0.85));
  const upperRoofH = 1.15;
  S.hip(...toWorld(0, midV), upperW, upperD, wallAngle, upperTopY, upperRoofH, COLORS.tile, {
    flare: 0.12, over: 0.5, ridgeCol: COLORS.ridge, hips: true, horns: false, glazed: true, segs: 3, fascia: 0.12, fasciaCol: shade(COLORS.tile, 0.6),
  });
  // ridge ornaments: the curled ends (rồng chầu, read at this scale as raised scrolls) and the finial: a gourd and a spike
  const ridgeY = upperTopY + upperRoofH;
  const ridgeHalf = Math.max(0.3, (upperW + 1.0) / 2 - ((upperD + 1.0) / 2) * 0.92);
  for (const side of [-1, 1]) {
    box(side * ridgeHalf, midV, ridgeY - 0.05, ridgeY + 0.42, 0.22, 0.22, COLORS.ridge);
    box(side * (ridgeHalf - 0.18), midV, ridgeY + 0.3, ridgeY + 0.45, 0.42, 0.18, COLORS.ridge);
  }
  box(0, midV, ridgeY - 0.05, ridgeY + 0.3, 0.42, 0.42, COLORS.ridge);
  box(0, midV, ridgeY + 0.3, ridgeY + 0.62, 0.3, 0.3, COLORS.ridge, { taper: 0.5 });
  box(0, midV, ridgeY + 0.62, ridgeY + 1.45, 0.06, 0.06, COLORS.finialSpike);
  return { midV, towerW, towerD, lowerTopY, upperW, upperD, upperTopY };
}

function buildRearCuttingAndForecourt(S, frame, baseY) {
  const { toPoint3, toNormal, box, vNotch, vIn, vOut, uLeft, uRight, vFace, vBank } = frame;
  // ---- behind the block: the passage runs on, open, through the earth rampart to Ông Ích Khiêm ----
  // kinhthanh.js cuts the slot (CITADEL_PASSAGE.slot) and leaves its sides to the gate model; at its city end the slot
  // opens into the mapped notch, and the notch's mouth is framed by two rendered piers with stepped caps (Street View)
  const halfSlot = CITADEL_PASSAGE.slot / 2;
  const wallWalkY = LAND_Y + WALL_H;
  if (vNotch < vIn - 0.2) {
    S.kind = KIND.MASONRY;
    for (const side of [-1, 1]) {
      const slotU = side * halfSlot;
      S.quad(toPoint3(slotU, vNotch, baseY), toPoint3(slotU, vIn, baseY), toPoint3(slotU, vIn, wallWalkY), toPoint3(slotU, vNotch, wallWalkY), COLORS.brick, toNormal(-side, 0));
    }
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) {
      box(side * (halfSlot + 0.3), (vNotch + vIn) / 2, wallWalkY, wallWalkY + 0.5, 0.6, vIn - vNotch, COLORS.renderDark, { top: shade(COLORS.render, 1.1) }); // the cutting's coping
    }
  }
  for (const pierU of [uLeft, uRight]) {
    const centerU = pierU + Math.sign(pierU) * 0.1;
    const centerV = vFace + 0.1;
    box(centerU, centerV, baseY, LAND_Y + 4.6, 1.6, 1.6, COLORS.render);
    box(centerU, centerV, LAND_Y + 4.6, LAND_Y + 4.85, 1.9, 1.9, shade(COLORS.render, 1.06));
    box(centerU, centerV, LAND_Y + 4.85, LAND_Y + 5.45, 1.25, 1.25, COLORS.render, { taper: 0.7 });
    box(centerU, centerV, LAND_Y + 5.45, LAND_Y + 5.75, 0.5, 0.5, COLORS.renderDark);
    const faceV = centerV - 0.8 - 0.03; // a soot streak down the face it shows the street
    S.quad(toPoint3(centerU - 0.5, faceV, LAND_Y + 1.0), toPoint3(centerU + 0.2, faceV, LAND_Y + 1.0), toPoint3(centerU + 0.2, faceV, LAND_Y + 4.55), toPoint3(centerU - 0.5, faceV, LAND_Y + 4.55), mix(COLORS.render, COLORS.renderDark, 0.25), toNormal(0, -1));
    box(centerU, centerV, baseY, LAND_Y + 0.5, 1.7, 1.7, COLORS.brickDark); // its damp foot
  }
  // a paved apron on the wall walk round the block, where the walk meets the gate (sandy strips on the satellite)
  S.kind = KIND.ROAD;
  for (const side of [-1, 1]) {
    const u0 = side * (GATE_WIDTH / 2);
    const u1 = side * (GATE_WIDTH / 2 + 4);
    const apronV0 = vFace + 0.4;
    const apronV1 = vOut - 0.8 - 1.6;
    const apronY = wallWalkY + 0.04;
    S.quad(toPoint3(u0, apronV0, apronY), toPoint3(u1, apronV0, apronY), toPoint3(u1, apronV1, apronY), toPoint3(u0, apronV1, apronY), shade(PAL.stone, 0.7), [0, 1, 0]);
  }
  S.kind = KIND.PLAIN;

  // ---- the forecourt: a paved terrace at the gate's foot, low balustrades along the moat edge over a rubble revetment ----
  const terraceHalfU = GATE_WIDTH / 2 + 3.5;
  const bridgeHalfW = BRIDGE_WIDTH / 2;
  const terraceY = LAND_Y + 0.08;
  S.kind = KIND.ROAD;
  for (const side of [-1, 1]) {
    const u0 = side * (OPEN_WIDTH / 2 + 0.6);
    const u1 = side * terraceHalfU;
    S.quad(toPoint3(u0, vOut + 0.3, terraceY), toPoint3(u1, vOut + 0.3, terraceY), toPoint3(u1, vBank - 0.1, terraceY), toPoint3(u0, vBank - 0.1, terraceY), COLORS.pave, [0, 1, 0]);
  }
  S.kind = KIND.MASONRY;
  const revetV = vBank + 0.06;
  S.quad(toPoint3(-terraceHalfU - 6, revetV, POND_Y - 0.8), toPoint3(terraceHalfU + 6, revetV, POND_Y - 0.8), toPoint3(terraceHalfU + 6, revetV, LAND_Y + 0.05), toPoint3(-terraceHalfU - 6, revetV, LAND_Y + 0.05), COLORS.rubble, toNormal(0, 1));
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    const u0 = side * (bridgeHalfW + 0.3);
    const u1 = side * terraceHalfU;
    const midU = (u0 + u1) / 2;
    const runLen = Math.abs(u1 - u0);
    const balV = vBank - 0.25;
    box(midU, balV, terraceY - 0.05, terraceY + 0.28, runLen, 0.36, COLORS.white, { top: shade(COLORS.white, 0.96) }); // plinth
    box(midU, balV, terraceY + 0.8, terraceY + 0.92, runLen, 0.3, COLORS.white, { top: shade(COLORS.white, 1.04) }); // hand-rail
    for (let dist = 0.5; dist < runLen - 0.3; dist += 0.42) {
      box(u0 + side * dist, balV, terraceY + 0.28, terraceY + 0.8, 0.14, 0.14, shade(COLORS.white, 0.9)); // vase balusters
    }
    for (let dist = 0; dist <= runLen + 0.01; dist += runLen / Math.max(1, Math.round(runLen / 2.4))) { // posts, a heavier one at each end
      const isEnd = dist < 0.01 || dist > runLen - 0.01;
      const postSize = isEnd ? 0.5 : 0.34;
      box(u0 + side * dist, balV, terraceY - 0.05, terraceY + (isEnd ? 1.15 : 1.0), postSize, postSize, COLORS.white);
      box(u0 + side * dist, balV, terraceY + (isEnd ? 1.15 : 1.0), terraceY + (isEnd ? 1.27 : 1.1), postSize + 0.1, postSize + 0.1, shade(COLORS.white, 0.9));
    }
  }
}

function buildCausewayBridge(data, S, frame) {
  // ---- Cầu Cửa Ngăn: the causeway over the moat (the shared road-bridge deck leaves it out; city.js) ----
  const bridgeStart = S.n;
  const profiles = bridgeProfiles(data);
  let bridgeRoad = null;
  let profile = null;
  for (const roadRec of data.roads || []) {
    const prof = Array.isArray(roadRec) && roadRec[1] && profiles.get(roadRec[2]);
    if (prof && prof.name === 'Cầu Cửa Ngăn') {
      bridgeRoad = roadRec;
      profile = prof;
      break;
    }
  }
  if (bridgeRoad) {
    const sampled = resample(unflat(bridgeRoad[2]), 1.5);
    const pts = sampled.pts;
    const dists = sampled.s;
    const wetY = POND_Y - 0.8;
    const leftNormal = (idx) => { // unit vector to the left of the road at point idx
      const ptA = pts[Math.max(0, idx - 1)];
      const ptB = pts[Math.min(pts.length - 1, idx + 1)];
      const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]) || 1;
      return [-(ptB[1] - ptA[1]) / len, (ptB[0] - ptA[0]) / len];
    };
    const pointAt = (idx, offset, y) => {
      const norm = leftNormal(idx);
      return [pts[idx][0] + norm[0] * offset, y, pts[idx][1] + norm[1] * offset];
    };
    const deckY = (idx) => profile.y(dists[idx]);
    for (let i = 0; i + 1 < pts.length; i++) {
      const norm = leftNormal(i);
      const normLeft = [norm[0], 0, norm[1]];
      const normRight = [-norm[0], 0, -norm[1]];
      S.kind = KIND.ROAD;
      S.quad(pointAt(i, -BRIDGE_WIDTH / 2, deckY(i)), pointAt(i + 1, -BRIDGE_WIDTH / 2, deckY(i + 1)), pointAt(i + 1, BRIDGE_WIDTH / 2, deckY(i + 1)), pointAt(i, BRIDGE_WIDTH / 2, deckY(i)), hex(PAL.road[2]), [0, 1, 0]);
      S.kind = KIND.MASONRY;
      for (const [offset, sideNorm] of [[BRIDGE_WIDTH / 2, normLeft], [-BRIDGE_WIDTH / 2, normRight]] as any[]) {
        S.quad(pointAt(i, offset, wetY), pointAt(i + 1, offset, wetY), pointAt(i + 1, offset, deckY(i + 1) - 0.25), pointAt(i, offset, deckY(i) - 0.25), COLORS.causeway, sideNorm);
        S.quad(pointAt(i, offset, wetY), pointAt(i + 1, offset, wetY), pointAt(i + 1, offset, POND_Y + 0.35), pointAt(i, offset, POND_Y + 0.35), COLORS.causewayDark, sideNorm); // the damp, mossy foot
      }
      S.kind = KIND.PLAIN;
      // the balustrade: a plinth and a hand-rail, vase balusters between them, a post every few metres
      for (const offset of [BRIDGE_WIDTH / 2 - 0.15, -BRIDGE_WIDTH / 2 + 0.15]) {
        S.beam(pointAt(i, offset, deckY(i) + 0.1), pointAt(i + 1, offset, deckY(i + 1) + 0.1), 0.34, 0.3, COLORS.white);
        S.beam(pointAt(i, offset, deckY(i) + 0.82), pointAt(i + 1, offset, deckY(i + 1) + 0.82), 0.3, 0.14, COLORS.white);
        for (const frac of [0.25, 0.75]) {
          const pt0 = pointAt(i, offset, 0);
          const pt1 = pointAt(i + 1, offset, 0);
          const x = pt0[0] + (pt1[0] - pt0[0]) * frac;
          const z = pt0[2] + (pt1[2] - pt0[2]) * frac;
          const y = deckY(i) + (deckY(i + 1) - deckY(i)) * frac;
          S.box(x, z, y + 0.25, y + 0.75, 0.14, 0.14, Math.atan2(norm[1], norm[0]), shade(COLORS.white, 0.94));
        }
      }
    }
    // posts, and at each end a heavier pier where the balustrade turns along the bank
    const totalLen = dists[dists.length - 1];
    for (let i = 0; i < pts.length; i++) {
      if (i !== 0 && i !== pts.length - 1 && Math.round(dists[i] / 1.5) % 2) continue;
      const isEnd = i === 0 || i === pts.length - 1;
      const norm = leftNormal(i);
      const postAngle = Math.atan2(norm[1], norm[0]);
      for (const offset of [BRIDGE_WIDTH / 2 - 0.15, -BRIDGE_WIDTH / 2 + 0.15]) {
        const pt = pointAt(i, offset, 0);
        const postSize = isEnd ? 0.55 : 0.32;
        const postTopY = deckY(i) + (isEnd ? 1.2 : 0.98);
        S.box(pt[0], pt[2], deckY(i) - 0.1, postTopY, postSize, postSize, postAngle, COLORS.white);
        S.box(pt[0], pt[2], postTopY, postTopY + 0.12, postSize + 0.12, postSize + 0.12, postAngle, shade(COLORS.white, 0.92));
        const isGateEnd = isEnd && Math.hypot(pts[i][0] - frame.centerX, pts[i][1] - frame.centerZ) < 20; // there the forecourt's balustrade takes over
        if (isEnd && !isGateEnd) { // the wing along the bank
          const outSign = Math.sign(offset);
          const wingStart = pointAt(i, offset, 0);
          const wingDir = [norm[0] * outSign, norm[1] * outSign];
          const wingLen = i === pts.length - 1 ? 5.5 : 3.0;
          const wingEnd = [wingStart[0] + wingDir[0] * wingLen, wingStart[2] + wingDir[1] * wingLen];
          const bankY = LAND_Y + 0.05;
          S.box((wingStart[0] + wingEnd[0]) / 2, (wingStart[2] + wingEnd[1]) / 2, bankY - 0.3, bankY + 0.85, wingLen, 0.3, postAngle, COLORS.white, { top: shade(COLORS.white, 0.96) });
          S.box(wingEnd[0], wingEnd[1], bankY - 0.3, bankY + 1.05, 0.48, 0.48, postAngle, COLORS.white);
        }
      }
    }
    // the small vaulted culvert near the gate end, seen on both sides of the causeway
    const culvertDist = Math.max(4, totalLen - 12);
    const culvertIdx = dists.findIndex((dist) => dist >= culvertDist);
    const culvertW = 3.0;
    const culvertSpringY = POND_Y + 0.15;
    const culvertR = culvertW / 2;
    if (culvertIdx > 0) {
      for (const offset of [BRIDGE_WIDTH / 2 + 0.03, -BRIDGE_WIDTH / 2 - 0.03]) {
        const norm = leftNormal(culvertIdx);
        const sideSign = Math.sign(offset);
        const sideNorm = [norm[0] * sideSign, 0, norm[1] * sideSign];
        const tanVec = [
          pts[Math.min(pts.length - 1, culvertIdx + 1)][0] - pts[Math.max(0, culvertIdx - 1)][0],
          pts[Math.min(pts.length - 1, culvertIdx + 1)][1] - pts[Math.max(0, culvertIdx - 1)][1],
        ];
        const tanLen = Math.hypot(tanVec[0], tanVec[1]) || 1;
        const tanX = tanVec[0] / tanLen;
        const tanZ = tanVec[1] / tanLen;
        const centerPt = pointAt(culvertIdx, offset, 0);
        const culvertPt = (along, y, out = 0) => [centerPt[0] + tanX * along + norm[0] * sideSign * out, y, centerPt[2] + tanZ * along + norm[1] * sideSign * out];
        S.quad(culvertPt(-culvertR, POND_Y - 0.2), culvertPt(culvertR, POND_Y - 0.2), culvertPt(culvertR, culvertSpringY), culvertPt(-culvertR, culvertSpringY), COLORS.dark, sideNorm);
        for (let k = 0; k < 6; k++) {
          const [a0, b0] = arcPoint(k, culvertR, culvertSpringY, 6);
          const [a1, b1] = arcPoint(k + 1, culvertR, culvertSpringY, 6);
          S.tri(culvertPt(0, culvertSpringY), culvertPt(a0, b0), culvertPt(a1, b1), COLORS.dark, sideNorm);
          const [c0, d0] = arcPoint(k, culvertR + 0.3, culvertSpringY, 6);
          const [c1, d1] = arcPoint(k + 1, culvertR + 0.3, culvertSpringY, 6);
          S.quad(culvertPt(a0, b0, 0.03), culvertPt(a1, b1, 0.03), culvertPt(c1, d1, 0.03), culvertPt(c0, d0, 0.03), shade(COLORS.causeway, 1.2), sideNorm);
        }
      }
    }
    // the street lamp the shared lamp-post pass stands over this deck (landmarks/life.js: one each 36 m, the first at
    // 18 m, alternate sides, ROAD_W/2 + 0.5 m out): a small corbelled bay in the balustrade carries it
    for (let dist = 18, k = 0; dist < totalLen; dist += 36, k++) {
      const idx = dists.findIndex((val) => val >= dist);
      const lampOffset = (ROAD_W[Math.max(0, Math.min(5, bridgeRoad[0] | 0))] / 2 + 0.5) * (k % 2 ? 1 : -1);
      if (idx < 0) continue;
      const norm = leftNormal(idx);
      const angle = Math.atan2(norm[1], norm[0]);
      const sideSign = Math.sign(lampOffset);
      const innerHalf = BRIDGE_WIDTH / 2;
      const outerHalf = Math.abs(lampOffset) + 0.6;
      const bayPos = pointAt(idx, sideSign * (innerHalf + outerHalf) / 2, 0);
      const y = deckY(idx);
      S.kind = KIND.MASONRY;
      S.box(bayPos[0], bayPos[2], y - 1.6, y, outerHalf - innerHalf, 2.2, angle, COLORS.causeway, { top: hex(PAL.road[2]) });
      S.kind = KIND.PLAIN;
      const kerbPos = pointAt(idx, sideSign * (outerHalf - 0.15), 0);
      S.box(kerbPos[0], kerbPos[2], y, y + 0.9, 0.3, 2.2, angle, COLORS.white, { top: shade(COLORS.white, 0.95) });
    }
  }
  S.kind = KIND.PLAIN;
  (S.paved = S.paved || []).push([bridgeStart, S.n]);
}

function buildSignboardAndNightLights(group, THREE, frame, dims, tower) {
  if (!group || !THREE) return;
  const { toWorld, toPoint3, vIn, vOut, outX, outZ, wallAngle } = frame;
  // the panel's characters, read right to left: 體 仁 門 (a small canvas, in the browser only)
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#b8b2a2';
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = '#4a4540';
    ctx.font = 'bold 64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ['門', '仁', '體'].forEach((ch, i) => ctx.fillText(ch, 48 + i * 80, 50));
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const geo = new THREE.PlaneGeometry(2.2, 0.82);
    for (const [faceV, faceSign] of [[vIn, -1], [vOut, 1]]) {
      const pos = toWorld(0, faceV + faceSign * 0.27);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], LAND_Y + 6.25 + 0.525, pos[1]);
      mesh.rotation.y = Math.atan2(outX * faceSign, outZ * faceSign);
      mesh.userData.landmark = id;
      group.add(mesh);
    }
  }
  // after dark (one of the two lit south gates): warm light under both eaves, along the cornice, and in the passage
  const lightBuf = new Buf(400);
  const addLightRing = (width, depth, centerV, y?) => {
    const corners = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]];
    for (let k = 0; k < 4; k++) {
      const ptA = corners[k];
      const ptB = corners[(k + 1) % 4];
      (lightBuf.beam as any)(toPoint3(ptA[0], centerV + ptA[1], y), toPoint3(ptB[0], centerV + ptB[1], y), 0.12, 0.1);
    }
  };
  lightBuf.beam = ((beamFn) => function (this: any, ptA, ptB, width, height, col = [1, 0.85, 0.6]) {
    return beamFn.call(this, ptA, ptB, width, height, col);
  })(lightBuf.beam);
  addLightRing(tower.towerW + 0.3, tower.towerD + 0.3, tower.midV, tower.lowerTopY - 0.4);
  addLightRing(tower.upperW + 0.25, tower.upperD + 0.25, tower.midV, tower.upperTopY - 0.32);
  for (const [faceV, faceSign] of [[vIn, -1], [vOut, 1]]) {
    (lightBuf.beam as any)(toPoint3(-GATE_WIDTH / 2 + 1.3, faceV + faceSign * 0.5, dims.corniceY - 0.65), toPoint3(GATE_WIDTH / 2 - 1.3, faceV + faceSign * 0.5, dims.corniceY - 0.65), 0.12, 0.1);
    const lightPos = toWorld(0, faceV - faceSign * 1.2);
    lightBuf.box(lightPos[0], lightPos[1], dims.springY + 0.4, dims.springY + 0.6, 0.5, 0.3, wallAngle, [1, 0.8, 0.5]);
  }
  const lightMesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(0xffd9a0, 1.5));
  lightMesh.renderOrder = 19;
  lightMesh.userData.landmark = id;
  group.add(lightMesh);
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

  buildGateBlockAndFaces(S, frame, dims);
  const tower = buildTopParapetAndWatchtower(S, frame, dims.corniceY);
  buildRearCuttingAndForecourt(S, frame, dims.baseY);

  // the tiled roofs drop on the terrace: a lime-grey cap where the first roof's ridges meet the terrace
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  buildCausewayBridge(data, S, frame);
  buildSignboardAndNightLights(group, THREE, frame, dims, tower);
  return null;
}
