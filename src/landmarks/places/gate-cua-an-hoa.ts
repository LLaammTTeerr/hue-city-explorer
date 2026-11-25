import { KIND, hex, shade, unflat } from '../../geo/buf.ts';
import { gateAxis, rectRing } from '../../geo/gates.ts';
import { LAND_Y, WALL_H, PAL } from '../../config.ts';

// Cửa An Hòa (安和, officially Tây Bắc Môn 西北門), the north-west gate of the Kinh thành Huế, at the end of đường
// Nguyễn Trãi, opening over Cầu An Hòa and the moat towards An Hòa village and market. Notes and sources:
// docs/places/gate-cua-an-hoa.md.
//
// Sourced: the arched gate built 1809 under Gia Long, its vọng lâu 1831 under Minh Mạng (VietnamPlus, VisitHue);
// like all ten land gates of the Kinh thành: one passage under a round arch 3.82 m wide and 5.19 m high, timber (lim)
// door leaves, a stone name plaque over the arch about 2.31 × 1.10 × 0.15 m, and a two-storey vọng lâu roofed with
// tubular tiles rising more than 9 m over the wall top, the whole gate more than 17 m high (huetourism.gov.vn, after
// Phan Thuận An). The rampart is 6.6 m high. Plan, centre and axis: the OSM gate building (way 367959065, 17.5 m
// along the wall × 13.9 m), Nguyễn Trãi's passage through it (way 39418370) and Cầu An Hòa over the moat
// (way 39412997, drawn as a road bridge by the shared bridge code, not here). The satellite agrees with that axis
// (bridge bearing 324.5° against 323.3° here) and puts the gate within about 2-3 m of the OSM centre.
//
// As it stands (street-level photographs from the bridge, Nguyễn Trãi and Lương Ngọc Quyền, 2025; heights scaled from
// the sourced arch): a block of dark weathered brick, mottled with lime render and black lichen, its ends stepped out
// as broad corner piers; the arch set in a framed panel that rises to rampart height under a moulded band; the
// pale stone plaque between that band and a cornice at 9 m; a plain parapet with corner posts round the flat
// top (no crenellations). On it a masonry vọng lâu, not a timber pavilion: a lime-rendered lower storey with three
// arched openings on the long faces (the middle one tall and wide, its back painted red) and one on each end, a short
// skirt of terracotta tiles with up-turned corners, a balustraded terrace, and a small upper storey with an arched
// window front and back and a round window in each end, under a low hipped terracotta roof with ridge ornaments and
// a lightning rod: about 19 m to the ridge.
export const id = 'gate:Cửa An Hòa';
const GATE_NAME = 'Cửa An Hòa';

const ARCH_WIDTH = 3.82;
const ARCH_HEIGHT = 5.19; // huetourism.gov.vn
const ARCH_SEGS = 12;
const PLAQUE_WIDTH = 2.31;
const PLAQUE_HEIGHT = 1.1; // the stone tablet, same source
const CORNICE_TOP_OFFSET = 2.4; // the block's flat top over the wall walk: the cornice tops out at 9.0 m (photo, scaled by the arch)
const LOWER_TOWER = { width: 11.0, depth: 7.0, height: 6.0 }; // vọng lâu, lower storey (photo from the bridge; depth estimated)
const UPPER_TOWER = { width: 5.0, depth: 3.8, height: 3.3 }; // upper storey (same)
const TOWER_OUT_OFFSET = 1.4; // the vọng lâu stands this far out of the block's middle, towards the moat (bridge photo)
// the postern on Lương Ngọc Quyền: its two capped pillars stand against the rampart's inner face this far along the
// wall from the gate's axis (u), on the gate's own frame (photo from Lương Ngọc Quyền)
const POSTERN_SPAN = { u0: 28.3, u1: 32.0 };

const COLORS = {
  body: hex('#5d6057'),
  damp: hex('#3d3e38'),
  lichen: hex('#3e4139'),
  lime: hex('#858479'),
  frame: hex('#737468'),
  cornice: hex('#77736a'),
  dark: hex('#1d1916'),
  door: hex('#4a2c1e'),
  iron: hex('#2a2826'),
  plaque: hex('#8c887c'),
  plaqueInner: hex('#b9b4a5'),
  render: hex('#7f7d73'),
  stone: hex('#8e8b80'),
  red: hex('#7e4532'),
  tile: hex('#9a5a3d'),
  tileDark: hex('#5e3d2c'),
  ornament: hex('#a9a598'),
  ridge: hex('#77736b'),
  curl: hex('#3b3833'),
  lightningRod: hex('#4a4a48'),
  posternCap: hex('#36373a'),
};

function createGateFrame(data, S) {
  const norm = (str) => String(str || '').normalize('NFC');
  const gateRec = (data.gates || []).find((rec) => norm(rec.n) === norm(GATE_NAME));
  if (!gateRec) throw new Error('gate not in data.gates');
  const citadelPlace = (data.places || []).find((rec) => rec.id === 'kinhthanh');
  const cityCenter = citadelPlace ? [citadelPlace.x / 10, citadelPlace.z / 10] : [gateRec.c[0] / 10 + 100, gateRec.c[1] / 10 + 100];
  const { cx, cz, px: inX, pz: inZ, pwid } = gateAxis(gateRec, cityCenter);
  // local frame: v through the wall, + out of the city (towards the moat), u along the wall
  const outX = -inX;
  const outZ = -inZ;
  const alongX = -outZ;
  const alongZ = outX;
  const angle = Math.atan2(alongZ, alongX);
  const toWorld = (localU, localV): [number, number] => [cx + localU * alongX + localV * outX, cz + localU * alongZ + localV * outZ];
  const toPoint3 = (localU, localV, y?) => {
    const pos = toWorld(localU, localV);
    return [pos[0], y, pos[1]];
  };
  const toNormal = (normU, normV, normY = 0): [number, number, number] => [normU * alongX + normV * outX, normY, normU * alongZ + normV * outZ];
  const box = (localU, localV, y0, y1, sizeU, sizeV, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], y0, y1, sizeU, sizeV, angle, color, opts);
  };

  // the rampart's faces where they cross the passage axis (data.wall): the block stands a hand's breadth past both
  let vIn = -6.5;
  let vOut = 6.5;
  const hits: number[] = [];
  for (const poly of data.wall || []) {
    for (const ring of poly.map(unflat)) {
      for (let i = 0; i < ring.length; i++) {
        const ptA = ring[i];
        const ptB = ring[(i + 1) % ring.length];
        const ex = ptB[0] - ptA[0];
        const ez = ptB[1] - ptA[1];
        const denom = outX * ez - outZ * ex;
        if (Math.abs(denom) < 1e-9) continue;
        const qx = ptA[0] - cx;
        const qz = ptA[1] - cz;
        const paramT = (qx * ez - qz * ex) / denom;
        const paramS = (qx * outZ - qz * outX) / denom;
        if (paramS >= 0 && paramS <= 1 && Math.abs(paramT) < 20) hits.push(paramT);
      }
    }
  }
  const innerHits = hits.filter((dist) => dist < 0);
  const outerHits = hits.filter((dist) => dist > 0);
  if (innerHits.length) vIn = Math.min(...innerHits) - 0.4;
  if (outerHits.length) vOut = Math.max(...outerHits) + 0.4;

  const blockWidth = pwid + 0.4;
  const blockDepth = vOut - vIn;
  const midV = (vIn + vOut) / 2;
  return { cx, cz, outX, outZ, alongX, alongZ, angle, toWorld, toPoint3, toNormal, box, vIn, vOut, blockWidth, blockDepth, midV };
}

function createBlotchBuilder(S, frame) {
  let seed = 7;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // an irregular patch flat on a face (constant v, out by outDist): a jittered fan, so lichen and lime do not read as boxes.
  // drip > 0 draws it narrowing downward, as lichen runs from the cornice.
  // Each is drawn twice: a larger halo halfway to the wall's colour, then the core, so its edge fades.
  return (centerU, centerY, width, height, faceV, faceSign, outDist, color, drip = 0) => {
    const segs = 11;
    const faceNorm = frame.toNormal(0, faceSign);
    const jitters = Array.from({ length: segs }, () => 0.7 + 0.45 * nextRand());
    for (const [scale, dist, fillCol] of [[1.4, outDist, color.map((ch, i) => (ch + COLORS.body[i]) / 2)], [1, outDist + 0.004, color]] as any[]) {
      const patchV = faceV + faceSign * dist;
      const pts = [];
      for (let k = 0; k < segs; k++) {
        const theta = (2 * Math.PI * k) / segs;
        const jitter = jitters[k] * scale;
        const lowerScale = Math.sin(theta) < 0 ? 1 - drip * 0.75 : 1;
        pts.push(frame.toPoint3(centerU + (width / 2) * Math.cos(theta) * jitter * lowerScale, patchV, centerY + (height / 2) * Math.sin(theta) * jitter));
      }
      const centerPt = frame.toPoint3(centerU, patchV, centerY);
      for (let k = 0; k < segs; k++) S.tri(centerPt, pts[k], pts[(k + 1) % segs], fillCol, faceNorm);
    }
  };
}

function buildGateBlockAndParapet(S, frame, addBlotch, dims) {
  const { toWorld, toPoint3, toNormal, box, vIn, vOut, blockWidth, blockDepth, midV, angle } = frame;
  const { baseY, corniceY, floorY, archRadius, crownY, springY } = dims;
  const arcPt = (k, rad = archRadius) => {
    const theta = Math.PI - (Math.PI * k) / ARCH_SEGS;
    return [rad * Math.cos(theta), springY + rad * Math.sin(theta)];
  };

  // ---- the block: both faces with the arch cut out, the ends, the flat top ----
  S.kind = KIND.MASONRY;
  for (const [faceV, faceSign] of [[vIn, -1], [vOut, 1]]) {
    const faceNorm = toNormal(0, faceSign);
    S.quad(toPoint3(-blockWidth / 2, faceV, baseY), toPoint3(-archRadius, faceV, baseY), toPoint3(-archRadius, faceV, corniceY), toPoint3(-blockWidth / 2, faceV, corniceY), COLORS.body, faceNorm);
    S.quad(toPoint3(archRadius, faceV, baseY), toPoint3(blockWidth / 2, faceV, baseY), toPoint3(blockWidth / 2, faceV, corniceY), toPoint3(archRadius, faceV, corniceY), COLORS.body, faceNorm);
    S.quad(toPoint3(-archRadius, faceV, crownY), toPoint3(archRadius, faceV, crownY), toPoint3(archRadius, faceV, corniceY), toPoint3(-archRadius, faceV, corniceY), COLORS.body, faceNorm);
    for (let k = 0; k < ARCH_SEGS; k++) { // the spandrels between the arch and its crown
      const [u0, y0] = arcPt(k);
      const [u1, y1] = arcPt(k + 1);
      S.quad(toPoint3(u0, faceV, y0), toPoint3(u1, faceV, y1), toPoint3(u1, faceV, crownY), toPoint3(u0, faceV, crownY), COLORS.body, faceNorm);
    }
  }
  for (const side of [-1, 1]) {
    const sideU = (side * blockWidth) / 2;
    S.quad(toPoint3(sideU, vIn, baseY), toPoint3(sideU, vOut, baseY), toPoint3(sideU, vOut, corniceY), toPoint3(sideU, vIn, corniceY), COLORS.body, toNormal(side, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(toPoint3(-blockWidth / 2, vIn, corniceY), toPoint3(-blockWidth / 2, vOut, corniceY), toPoint3(blockWidth / 2, vOut, corniceY), toPoint3(blockWidth / 2, vIn, corniceY), shade(PAL.stone, 0.8), [0, 1, 0]);
  S.quad(toPoint3(-archRadius, vIn - 0.4, floorY), toPoint3(-archRadius, vOut + 0.4, floorY), toPoint3(archRadius, vOut + 0.4, floorY), toPoint3(archRadius, vIn - 0.4, floorY), shade(PAL.stone, 0.6), [0, 1, 0]);
  // the barrel vault and the passage's sides, dark with soot and damp
  S.kind = KIND.PLAIN;
  for (let k = 0; k < ARCH_SEGS; k++) {
    const [u0, y0] = arcPt(k);
    const [u1, y1] = arcPt(k + 1);
    S.quad(toPoint3(u0, vIn + 0.01, y0), toPoint3(u0, vOut - 0.01, y0), toPoint3(u1, vOut - 0.01, y1), toPoint3(u1, vIn + 0.01, y1), shade(COLORS.body, 0.42), toNormal(-(u0 + u1) / 2, 0, springY - (y0 + y1) / 2));
  }
  for (const side of [-1, 1]) {
    const wallU = side * (archRadius - 0.01);
    S.quad(toPoint3(wallU, vIn, floorY), toPoint3(wallU, vOut, floorY), toPoint3(wallU, vOut, springY), toPoint3(wallU, vIn, springY), COLORS.dark, toNormal(-side, 0));
  }
  // the lim-wood door leaves, iron-banded, swung back against the passage sides inside the outer mouth
  for (const side of [-1, 1]) {
    box(side * (archRadius - 0.1), vOut - 2.4, floorY, springY - 0.05, 0.14, archRadius * 0.95, COLORS.door);
    for (const bandY of [floorY + 0.6, (floorY + springY) / 2, springY - 0.6]) {
      box(side * (archRadius - 0.18), vOut - 2.4, bandY, bandY + 0.1, 0.03, archRadius * 0.95, COLORS.iron);
    }
  }

  // ---- the faces: damp foot, corner piers, the framed arch panel, lichen and lime, the plaque, the cornice ----
  S.kind = KIND.MASONRY;
  for (const [faceV, faceSign] of [[vIn, -1], [vOut, 1]]) {
    const trimV = faceV + faceSign * 0.1;
    // the damp foot, either side of the arch: the passage is open at road level
    const footW = (blockWidth + 0.3) / 2 - (archRadius + 0.4);
    for (const side of [-1, 1]) box(side * (archRadius + 0.4 + footW / 2), trimV + faceSign * 0.02, baseY, LAND_Y + 0.7, footW, 0.25, COLORS.damp);
    for (const side of [-1, 1]) {
      // the broad corner piers, stepped out from the face and capped under the cornice
      box(side * (blockWidth / 2 - 1.0), trimV + faceSign * 0.06, baseY, corniceY - 0.75, 2.0, 0.32, shade(COLORS.body, 1.05));
      box(side * (blockWidth / 2 - 1.0), trimV + faceSign * 0.1, corniceY - 0.95, corniceY - 0.55, 2.2, 0.4, COLORS.cornice);
      // the panel the arch is set in, framed up to rampart height
      box(side * 3.1, trimV + faceSign * 0.02, floorY, LAND_Y + 6.4, 0.6, 0.14, COLORS.frame);
      box(side * (archRadius + 0.2), trimV + faceSign * 0.02, floorY, springY, 0.4, 0.14, COLORS.frame); // the arch's jambs
      // black lichen run down from the cornice, and broad pale areas of the old lime render (on the face, or on a pier)
      const outDepth = (absU) => (absU > blockWidth / 2 - 2.0 ? 0.33 : 0.02);
      const lichenSpecs = faceSign > 0 ? [[4.6, 3.4, 1.3], [7.4, 4.6, 1.0], [1.4, 1.3, 1.0]] : [[5.8, 3.0, 1.2], [1.5, 1.0, 0.9]];
      for (const [absU, patchH, patchW] of lichenSpecs) addBlotch(side * absU, corniceY - 0.75 - patchH / 2, patchW, patchH, faceV, faceSign, outDepth(absU), COLORS.lichen, 0.8);
      const limeSpecs = faceSign > 0 ? [[5.0, 3.6, 2.6, 2.2], [2.25, 7.7, 0.9, 0.8], [7.6, 1.8, 1.4, 1.6]] : [[4.9, 3.4, 2.2, 1.8], [7.6, 5.0, 1.2, 1.4]];
      for (const [absU, centerY, patchW, patchH] of limeSpecs) addBlotch(side * absU, LAND_Y + centerY, patchW, patchH, faceV, faceSign, outDepth(absU) + 0.005, side * faceSign > 0 ? COLORS.lime : shade(COLORS.lime, 0.9));
    }
    for (let k = 0; k < ARCH_SEGS; k++) { // the arch's moulded band
      const [u0, y0] = arcPt(k, archRadius + 0.2);
      const [u1, y1] = arcPt(k + 1, archRadius + 0.2);
      S.beam(toPoint3(u0, trimV + faceSign * 0.02, y0), toPoint3(u1, trimV + faceSign * 0.02, y1), 0.14, 0.4, COLORS.frame);
    }
    box(0, trimV + faceSign * 0.06, LAND_Y + 6.4, LAND_Y + 6.7, 6.9, 0.28, COLORS.cornice); // the band over the panel
    // the stone plaque over the band: a grey frame round a paler field cut with the characters
    const plaqueY = LAND_Y + 6.95;
    box(0, trimV + faceSign * 0.06, plaqueY - 0.12, plaqueY + PLAQUE_HEIGHT + 0.12, PLAQUE_WIDTH + 0.3, 0.16, COLORS.plaque);
    box(0, trimV + faceSign * 0.12, plaqueY, plaqueY + PLAQUE_HEIGHT, PLAQUE_WIDTH, 0.06, COLORS.plaqueInner);
    box(0, trimV + faceSign * 0.08, corniceY - 0.55, corniceY - 0.15, blockWidth + 0.5, 0.36, COLORS.cornice);
    box(0, trimV + faceSign * 0.14, corniceY - 0.15, corniceY, blockWidth + 0.7, 0.48, shade(COLORS.cornice, 1.08), { top: shade(PAL.stone, 0.8) });
  }

  // ---- the plain parapet round the flat top, with a post at each corner ----
  const topCenter = toWorld(0, midV);
  const topRect = (width, depth?) => rectRing(topCenter[0], topCenter[1], width, depth, angle);
  S.kind = KIND.MASONRY;
  const paraOuter = topRect(blockWidth + 0.3, blockDepth + 0.2);
  const paraInner = topRect(blockWidth - 0.3, blockDepth - 0.4);
  S.prism(paraOuter, corniceY, corniceY + 0.45, shade(COLORS.body, 1.06), shade(COLORS.body, 1.06), { holes: [paraInner.slice().reverse()] });
  const copeOuter = topRect(blockWidth + 0.45, blockDepth + 0.35);
  const copeInner = topRect(blockWidth - 0.45, blockDepth - 0.55);
  S.prism(copeOuter, corniceY + 0.45, corniceY + 0.6, COLORS.cornice, shade(PAL.stone, 0.85), { holes: [copeInner.slice().reverse()] });
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) {
      const postU = signU * (blockWidth / 2 - 0.05);
      const postV = midV + signV * (blockDepth / 2 - 0.05);
      const pos = toWorld(postU, postV);
      box(postU, postV, corniceY, corniceY + 1.0, 0.5, 0.5, shade(COLORS.body, 1.06));
      S.box(pos[0], pos[1], corniceY + 1.0, corniceY + 1.15, 0.62, 0.62, angle, COLORS.cornice);
    }
  }
}

function buildWatchtower(S, frame, addBlotch, corniceY) {
  const { toWorld, toPoint3, toNormal, box, midV, alongX, alongZ, outX, outZ, angle } = frame;
  // ---- the vọng lâu: a masonry lower storey, a skirt of tiles, a terrace, a small upper storey ----
  // An arched opening on one of the tower's faces: a render ring round a recess (rectangle to the spring, half-disc
  // above). alongU: the face is at constant v (centred at u = posU); otherwise at constant u (centred at v = posV).
  const buildOpening = (posU, posV, faceSign, alongU, sillY, width, height, backColor) => {
    const rad0 = width / 2;
    const springY = sillY + height - rad0;
    const segs = 7;
    const pointAt = (offset, y, outDist) => (alongU ? toPoint3(posU + offset, posV + faceSign * outDist, y) : toPoint3(posU + faceSign * outDist, posV + offset, y));
    const faceNorm = alongU ? toNormal(0, faceSign) : toNormal(faceSign, 0);
    for (const [rad, outDist, col] of [[rad0 + 0.2, 0.03, COLORS.stone], [rad0, 0.05, backColor]] as any[]) {
      S.quad(pointAt(-rad, sillY, outDist), pointAt(rad, sillY, outDist), pointAt(rad, springY, outDist), pointAt(-rad, springY, outDist), col, faceNorm);
      for (let k = 0; k < segs; k++) {
        const ang0 = Math.PI - (Math.PI * k) / segs;
        const ang1 = Math.PI - (Math.PI * (k + 1)) / segs;
        S.tri(pointAt(0, springY, outDist), pointAt(rad * Math.cos(ang0), springY + rad * Math.sin(ang0), outDist), pointAt(rad * Math.cos(ang1), springY + rad * Math.sin(ang1), outDist), col, faceNorm);
      }
    }
  };
  // a round window on an end face (constant u): a stone ring round a dark disc
  const buildRoundel = (faceU, faceSign, centerY, radius) => {
    const segs = 12;
    const faceNorm = toNormal(faceSign, 0);
    for (const [rad, outDist, col] of [[radius + 0.14, 0.03, COLORS.stone], [radius, 0.05, COLORS.dark]] as any[]) {
      for (let k = 0; k < segs; k++) {
        const ang0 = (2 * Math.PI * k) / segs;
        const ang1 = (2 * Math.PI * (k + 1)) / segs;
        S.tri(toPoint3(faceU + faceSign * outDist, midV + TOWER_OUT_OFFSET, centerY), toPoint3(faceU + faceSign * outDist, midV + TOWER_OUT_OFFSET + rad * Math.cos(ang0), centerY + rad * Math.sin(ang0)), toPoint3(faceU + faceSign * outDist, midV + TOWER_OUT_OFFSET + rad * Math.cos(ang1), centerY + rad * Math.sin(ang1)), col, faceNorm);
      }
    }
  };

  // the vọng lâu stands TOWER_OUT_OFFSET out of the block's middle, towards the moat
  const towerV = midV + TOWER_OUT_OFFSET;
  const towerCenter = toWorld(0, towerV);
  const towerRect = (width, depth) => rectRing(towerCenter[0], towerCenter[1], width, depth, angle);
  // A tiled slope round the tower (the skirt) or over it (the roof): from an inner rectangle (half sizes innerU, innerV;
  // innerV 0 gives a ridge) at yInner out to an eave (half sizes outerU, outerV) at yEave, concave like Huế roofs, its
  // corners lifted and ending in a small dark curled tip, grey hip ridges, a fascia under the eave and a dark soffit
  // back to the walls (half sizes wallU, wallV).
  const buildTiledSlope = (innerU, innerV, outerU, outerV, wallU, wallV, yInner, yEave, lift) => {
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const outDirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const cols = 8;
    const rows = 3;
    const surfPt = (sideIdx, alongFrac, upFrac) => {
      const nextIdx = (sideIdx + 1) % 4;
      const cornerU = corners[sideIdx][0] + (corners[nextIdx][0] - corners[sideIdx][0]) * alongFrac;
      const cornerV = corners[sideIdx][1] + (corners[nextIdx][1] - corners[sideIdx][1]) * alongFrac;
      const localU = cornerU * (outerU + (innerU - outerU) * upFrac);
      const localV = cornerV * (outerV + (innerV - outerV) * upFrac);
      const y = yEave + (yInner - yEave) * upFrac ** 1.5 + lift * Math.abs(2 * alongFrac - 1) ** 3 * (1 - upFrac) ** 2;
      return toPoint3(localU, towerV + localV, y);
    };
    S.kind = KIND.TILE;
    for (let i = 0; i < 4; i++) {
      const faceNorm = toNormal(outDirs[i][0], outDirs[i][1], 1.2);
      for (let k = 0; k < rows; k++) {
        for (let colIdx = 0; colIdx < cols; colIdx++) {
          S.quad(surfPt(i, colIdx / cols, k / rows), surfPt(i, (colIdx + 1) / cols, k / rows), surfPt(i, (colIdx + 1) / cols, (k + 1) / rows), surfPt(i, colIdx / cols, (k + 1) / rows), k ? COLORS.tile : shade(COLORS.tile, 0.9), faceNorm);
        }
      }
    }
    S.kind = KIND.PLAIN;
    const fasciaH = 0.16;
    const dropY = (pt, delta) => [pt[0], pt[1] - delta, pt[2]];
    for (let i = 0; i < 4; i++) {
      const nextIdx = (i + 1) % 4;
      const faceNorm = toNormal(outDirs[i][0], outDirs[i][1]);
      for (let colIdx = 0; colIdx < cols; colIdx++) {
        const ptA = surfPt(i, colIdx / cols, 0);
        const ptB = surfPt(i, (colIdx + 1) / cols, 0);
        S.quad(dropY(ptA, fasciaH), dropY(ptB, fasciaH), ptB, ptA, COLORS.tileDark, faceNorm);
        const frac0 = colIdx / cols;
        const frac1 = (colIdx + 1) / cols;
        const wallA = toPoint3((corners[i][0] + (corners[nextIdx][0] - corners[i][0]) * frac0) * wallU, towerV + (corners[i][1] + (corners[nextIdx][1] - corners[i][1]) * frac0) * wallV, yEave - fasciaH);
        const wallB = toPoint3((corners[i][0] + (corners[nextIdx][0] - corners[i][0]) * frac1) * wallU, towerV + (corners[i][1] + (corners[nextIdx][1] - corners[i][1]) * frac1) * wallV, yEave - fasciaH);
        S.quad(dropY(ptA, fasciaH), dropY(ptB, fasciaH), wallB, wallA, shade(COLORS.tileDark, 0.5), [0, -1, 0]);
      }
      // the hip ridge, and the curled tip at its foot
      let prevPt = null;
      for (let k = 0; k <= rows * 2; k++) {
        const pt = surfPt(i, 0, k / (rows * 2));
        const ridgePt = [pt[0], pt[1] + 0.08, pt[2]];
        if (prevPt) S.beam(prevPt, ridgePt, 0.13, 0.15, COLORS.ridge);
        prevPt = ridgePt;
      }
      const eavePt = surfPt(i, 0, 0);
      const dx = corners[i][0] * alongX + corners[i][1] * outX;
      const dz = corners[i][0] * alongZ + corners[i][1] * outZ;
      const dist = Math.hypot(dx, dz);
      const midCurl = [eavePt[0] + (dx / dist) * 0.22, eavePt[1] + 0.1, eavePt[2] + (dz / dist) * 0.22];
      S.beam([eavePt[0], eavePt[1] + 0.04, eavePt[2]], midCurl, 0.15, 0.16, COLORS.curl);
      S.beam(midCurl, [midCurl[0] + (dx / dist) * 0.1, midCurl[1] + 0.24, midCurl[2] + (dz / dist) * 0.1], 0.12, 0.13, COLORS.curl);
    }
  };

  S.kind = KIND.MASONRY;
  box(0, towerV, corniceY, corniceY + 0.4, LOWER_TOWER.width + 0.5, LOWER_TOWER.depth + 0.5, COLORS.stone, { top: shade(PAL.stone, 0.85), topKind: KIND.ROAD }); // plinth
  const lowerFloorY = corniceY + 0.4;
  const lowerEaveY = lowerFloorY + LOWER_TOWER.height;
  box(0, towerV, lowerFloorY, lowerEaveY, LOWER_TOWER.width, LOWER_TOWER.depth, COLORS.render, { top: COLORS.stone });
  box(0, towerV, lowerFloorY, lowerFloorY + 0.6, LOWER_TOWER.width + 0.02, LOWER_TOWER.depth + 0.02, COLORS.damp); // damp, darkened foot
  S.kind = KIND.PLAIN;
  for (const faceSign of [-1, 1]) {
    for (const [offsetU, centerY, patchW, patchH] of [[-4.3, LOWER_TOWER.height - 1.4, 1.0, 2.0], [4.0, LOWER_TOWER.height - 0.9, 1.3, 1.2]]) {
      addBlotch(faceSign * offsetU, lowerFloorY + centerY, patchW, patchH, towerV + faceSign * (LOWER_TOWER.depth / 2), faceSign, 0.01, shade(COLORS.render, 0.88), 0.6);
    }
  }
  for (const dirSign of [-1, 1]) {
    const faceV = towerV + (dirSign * LOWER_TOWER.depth) / 2;
    buildOpening(0, faceV, dirSign, true, lowerFloorY + 1.9, 2.1, 2.5, COLORS.red); // the middle opening, its back painted red
    buildOpening(-3.5, faceV, dirSign, true, lowerFloorY + 1.9, 1.25, 1.5, dirSign > 0 ? COLORS.dark : COLORS.red);
    buildOpening(3.5, faceV, dirSign, true, lowerFloorY + 1.9, 1.25, 1.5, dirSign > 0 ? COLORS.red : COLORS.dark);
  }
  for (const faceSign of [-1, 1]) buildOpening((faceSign * LOWER_TOWER.width) / 2, towerV, faceSign, false, lowerFloorY + 1.9, 1.4, 1.8, COLORS.red);
  // the cornice, and the skirt of tiles: about a metre of tile rows with up-turned corners
  S.kind = KIND.MASONRY;
  box(0, towerV, lowerEaveY - 0.05, lowerEaveY + 0.2, LOWER_TOWER.width + 0.3, LOWER_TOWER.depth + 0.3, COLORS.stone);
  const skirtTopY = lowerEaveY + 0.75;
  buildTiledSlope(LOWER_TOWER.width / 2, LOWER_TOWER.depth / 2, LOWER_TOWER.width / 2 + 0.8, LOWER_TOWER.depth / 2 + 0.8, LOWER_TOWER.width / 2, LOWER_TOWER.depth / 2, skirtTopY, lowerEaveY - 0.1, 0.28);
  // the terrace on it, and its balustrade
  S.kind = KIND.MASONRY;
  box(0, towerV, skirtTopY - 0.05, skirtTopY + 0.3, LOWER_TOWER.width - 0.05, LOWER_TOWER.depth - 0.05, COLORS.stone, { top: shade(PAL.stone, 0.85), topKind: KIND.ROAD });
  const terraceY = skirtTopY + 0.3;
  S.kind = KIND.PLAIN;
  S.prism(towerRect(LOWER_TOWER.width - 0.2, LOWER_TOWER.depth - 0.2), terraceY, terraceY + 0.55, shade(COLORS.stone, 0.9), shade(COLORS.stone, 1.05), { holes: [towerRect(LOWER_TOWER.width - 0.5, LOWER_TOWER.depth - 0.5).slice().reverse()] });
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) box(signU * (LOWER_TOWER.width / 2 - 0.25), towerV + signV * (LOWER_TOWER.depth / 2 - 0.25), terraceY, terraceY + 0.9, 0.38, 0.38, COLORS.stone);
  }
  for (const faceSign of [-1, 1]) {
    for (const postU of [-1.9, 1.9]) box(postU, towerV + faceSign * (LOWER_TOWER.depth / 2 - 0.25), terraceY, terraceY + 0.8, 0.32, 0.32, COLORS.stone);
  }

  // the upper storey and its roof: low, but a real tiled slope, with grey ridges and small dark curled tips
  S.kind = KIND.MASONRY;
  const upperTopY = terraceY + UPPER_TOWER.height;
  box(0, towerV, terraceY, upperTopY, UPPER_TOWER.width, UPPER_TOWER.depth, COLORS.render, { top: COLORS.stone });
  S.kind = KIND.PLAIN;
  for (const dirSign of [-1, 1]) buildOpening(0, towerV + (dirSign * UPPER_TOWER.depth) / 2, dirSign, true, terraceY + 0.3, 1.4, 1.9, COLORS.dark);
  for (const faceSign of [-1, 1]) buildRoundel((faceSign * UPPER_TOWER.width) / 2, faceSign, terraceY + 1.5, 0.48);
  S.kind = KIND.MASONRY;
  box(0, towerV, upperTopY - 0.05, upperTopY + 0.2, UPPER_TOWER.width + 0.3, UPPER_TOWER.depth + 0.3, COLORS.stone);
  const roofH = 1.5;
  const ridgeHalf = Math.max(0.3, (UPPER_TOWER.width - UPPER_TOWER.depth) / 2 + 0.35);
  const ridgeY = upperTopY + 0.15 + roofH;
  buildTiledSlope(ridgeHalf, 0, UPPER_TOWER.width / 2 + 0.6, UPPER_TOWER.depth / 2 + 0.6, UPPER_TOWER.width / 2, UPPER_TOWER.depth / 2, ridgeY, upperTopY + 0.15, 0.22);
  // the ridge, its curled ends, a small finial and the lightning rod
  S.kind = KIND.PLAIN;
  S.beam(toPoint3(-ridgeHalf - 0.1, towerV, ridgeY + 0.08), toPoint3(ridgeHalf + 0.1, towerV, ridgeY + 0.08), 0.26, 0.3, COLORS.ridge);
  for (const faceSign of [-1, 1]) {
    S.beam(toPoint3(faceSign * ridgeHalf, towerV, ridgeY + 0.1), toPoint3(faceSign * (ridgeHalf + 0.3), towerV, ridgeY + 0.42), 0.2, 0.22, COLORS.ornament);
    S.beam(toPoint3(faceSign * (ridgeHalf + 0.3), towerV, ridgeY + 0.42), toPoint3(faceSign * (ridgeHalf + 0.22), towerV, ridgeY + 0.62), 0.16, 0.18, COLORS.curl);
  }
  box(0, towerV, ridgeY + 0.2, ridgeY + 0.55, 0.35, 0.3, COLORS.ornament);
  box(0, towerV, ridgeY + 0.55, ridgeY + 1.6, 0.05, 0.05, COLORS.lightningRod);
}

function buildPosternGate(data, S, frame) {
  const { toWorld, toPoint3, toNormal, box, outX, outZ } = frame;
  // ---- the postern on Lương Ngọc Quyền: a flight of steps between two capped pillars, an iron gate across it ----
  // It opens in the rampart's inner face (data.wall), a few tens of metres along the wall from the gate.
  const findWallFaceV = (localU) => {
    const [origX, origZ] = toWorld(localU, 0);
    let bestT = null;
    for (const poly of data.wall || []) {
      for (const ring of poly.map(unflat)) {
        for (let i = 0; i < ring.length; i++) {
          const ptA = ring[i];
          const ptB = ring[(i + 1) % ring.length];
          const ex = ptB[0] - ptA[0];
          const ez = ptB[1] - ptA[1];
          const denom = outX * ez - outZ * ex;
          if (Math.abs(denom) < 1e-9) continue;
          const qx = ptA[0] - origX;
          const qz = ptA[1] - origZ;
          const paramT = (qx * ez - qz * ex) / denom;
          const paramS = (qx * outZ - qz * outX) / denom;
          if (paramS >= 0 && paramS <= 1 && paramT < 0 && paramT > -30 && (bestT === null || paramT > bestT)) bestT = paramT;
        }
      }
    }
    return bestT;
  };
  const midU = (POSTERN_SPAN.u0 + POSTERN_SPAN.u1) / 2;
  const faceV = findWallFaceV(midU);
  if (faceV === null) return;
  const gateW = POSTERN_SPAN.u1 - POSTERN_SPAN.u0 - 1.1;
  const pillarCol = shade(COLORS.body, 1.12);
  S.kind = KIND.MASONRY;
  for (const pillarU of [POSTERN_SPAN.u0, POSTERN_SPAN.u1]) {
    const pillarV = faceV - 0.5;
    box(pillarU, pillarV, LAND_Y - 0.2, LAND_Y + 3.7, 1.1, 1.1, pillarCol);
    S.kind = KIND.PLAIN;
    box(pillarU, pillarV, LAND_Y + 3.7, LAND_Y + 3.9, 1.35, 1.35, COLORS.posternCap);
    box(pillarU, pillarV, LAND_Y + 3.9, LAND_Y + 4.2, 0.95, 0.95, COLORS.posternCap);
    box(pillarU, pillarV, LAND_Y + 4.2, LAND_Y + 4.45, 1.4, 1.4, COLORS.posternCap);
    box(pillarU, pillarV, LAND_Y + 4.45, LAND_Y + 4.65, 0.7, 0.7, COLORS.posternCap);
    S.kind = KIND.MASONRY;
  }
  for (let k = 0; k < 3; k++) {
    box(midU, faceV - 0.35 * (3 - k) / 2 - 0.01, LAND_Y - 0.1, LAND_Y + 0.25 * (k + 1), gateW, 0.35 * (3 - k), COLORS.stone, { top: shade(COLORS.stone, 1.08), topKind: KIND.ROAD });
  }
  S.kind = KIND.PLAIN;
  S.quad(toPoint3(midU - gateW / 2, faceV - 0.03, LAND_Y + 0.75), toPoint3(midU + gateW / 2, faceV - 0.03, LAND_Y + 0.75), toPoint3(midU + gateW / 2, faceV - 0.03, LAND_Y + 3.3), toPoint3(midU - gateW / 2, faceV - 0.03, LAND_Y + 3.3), COLORS.dark, toNormal(0, -1));
  for (let barX = -gateW / 2 + 0.12; barX < gateW / 2; barX += 0.16) {
    box(midU + barX, faceV - 0.1, LAND_Y + 0.75, LAND_Y + 3.2, 0.035, 0.035, COLORS.iron);
  }
  for (const railY of [LAND_Y + 0.85, LAND_Y + 2.0, LAND_Y + 3.15]) box(midU, faceV - 0.1, railY, railY + 0.07, gateW, 0.05, COLORS.iron);
}

function buildNamePlaque(group, THREE, frame) {
  // the plaque's characters, read right to left: 西 北 門 (a small canvas, in the browser only)
  if (!group || !THREE || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b9b4a5';
  ctx.fillRect(0, 0, 256, 112);
  ctx.fillStyle = '#4a443d';
  ctx.font = 'bold 62px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ['門', '北', '西'].forEach((ch, i) => ctx.fillText(ch, 48 + i * 80, 58));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const geo = new THREE.PlaneGeometry(PLAQUE_WIDTH - 0.1, PLAQUE_HEIGHT - 0.1);
  for (const [faceV, faceSign] of [[frame.vIn, -1], [frame.vOut, 1]]) {
    const pos = frame.toWorld(0, faceV + faceSign * 0.27);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], LAND_Y + 6.95 + PLAQUE_HEIGHT / 2, pos[1]);
    mesh.rotation.y = Math.atan2(frame.outX * faceSign, frame.outZ * faceSign);
    mesh.userData.landmark = id;
    group.add(mesh);
  }
}

export function build({ data, S, group, THREE }) {
  const frame = createGateFrame(data, S);
  const archRadius = ARCH_WIDTH / 2;
  const crownY = LAND_Y + ARCH_HEIGHT;
  const dims = {
    baseY: LAND_Y - 0.5,
    corniceY: LAND_Y + WALL_H + CORNICE_TOP_OFFSET,
    floorY: LAND_Y + 0.02,
    archRadius,
    crownY,
    springY: crownY - archRadius,
  };
  const pavedStart = S.n;
  const keepKind = S.kind;
  const addBlotch = createBlotchBuilder(S, frame);

  buildGateBlockAndParapet(S, frame, addBlotch, dims);
  buildWatchtower(S, frame, addBlotch, dims.corniceY);
  buildPosternGate(data, S, frame);

  (S.paved = S.paved || []).push([pavedStart, S.n]);
  S.kind = keepKind;

  buildNamePlaque(group, THREE, frame);
}
