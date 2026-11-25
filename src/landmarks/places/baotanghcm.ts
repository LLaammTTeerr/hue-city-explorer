import { addEmissiveStripMesh } from '../helpers.ts';
import { KIND, Buf, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { offStreets } from '../enclosure.ts';

// ---- Bảo tàng Hồ Chí Minh (Hồ Chí Minh Museum), 7 Lê Lợi, Huế: rebuilt 1998–2000 ----
// Sources (fetched Nov 2026; see docs/places/baotanghcm.md): OSM way 240266284 (32.5 x 31.4 m eave outline).
export const id = 'baotanghcm';

const EAVE_RING = [[-849.9, 1023.1], [-826.0, 1002.7], [-804.7, 1027.2], [-828.6, 1047.6]];

const OVERHANG = 2.05;
const HALF_DEPTH = 32.5 / 2 - OVERHANG;
const HALF_FRONT = 31.4 / 2 - OVERHANG;
const CORNER_BLOCK_SIZE = 4.0;

const COLORS = {
  pink: hex('#e6bfcf'), pinkDark: hex('#d3aebf'), white: hex('#f4f1ec'), sage: hex('#a3ab9c'), sageDark: hex('#8d968a'),
  glass: hex('#2b343a'), fret: hex('#5c5e60'), roof: hex('#c8665a'), stone: hex('#b9b3aa'), pave: hex('#c9c4ba'),
  lawn: hex('#5f8a45'), hedge: hex('#3f6a34'), palm: hex('#4c7a38'), trunk: hex('#8a7a66'), pine: hex('#3d6a3a'),
  red: hex('#b8262b'), gold: hex('#d8b24a'), pot: hex('#9c5a48'), cream: hex('#ece4d2'),
  rubble: hex('#8a877e'), render: hex('#d2b65a'), iron: hex('#26342c'), soffit: hex('#fbfaf6'),
};

function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (ring[i][1] > z !== ring[j][1] > z && x < ((ring[j][0] - ring[i][0]) * (z - ring[i][1])) / (ring[j][1] - ring[i][1]) + ring[i][0]) {
      inside = !inside;
    }
  }
  return inside;
}

function buildFrontGardenAndDrive(data, S, pt, box, rectRing, frontAng, y0) {
  const plazaOutline = [[-46, -1], [-20, -32], [23, -27], [23, 4.2], [30.0, 4.2], [30.0, 40], [15, 43], [-9, 26]].map(([a, b]) => pt(a, b));
  const plaza = offStreets(data, plazaOutline, 0.3);
  const pavedStart = S.n;
  S.kind = KIND.MASONRY;
  S.prism(plaza, y0 - 0.3, y0 + 0.05, COLORS.pave, COLORS.pave, { topKind: KIND.ROAD });
  S.prism(rectRing(HALF_DEPTH + 0.6, HALF_DEPTH + 8.0, -HALF_FRONT - 1, HALF_FRONT + 1), y0 - 0.2, y0 + 0.08, shade(COLORS.pave, 0.94), shade(COLORS.pave, 0.94), { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  // Lê Lợi frontage lawn, hedge, fountain, palms, and topiary
  S.kind = KIND.PLAIN;
  const bedStart = 23.2, bedEnd = 29.9;
  S.prism(rectRing(bedStart, bedEnd, -27, -4.2), y0 - 0.2, y0 + 0.35, COLORS.white, COLORS.lawn);
  S.prism(rectRing(bedStart, bedEnd - 2.2, -4.2, 4.2), y0 - 0.2, y0 + 0.3, COLORS.white, COLORS.lawn);
  S.kind = KIND.TIMBER;
  S.prism(rectRing(bedEnd - 1.0, bedEnd - 0.25, -26.5, -4.6), y0 + 0.35, y0 + 0.95, COLORS.hedge, shade(COLORS.hedge, 1.1));

  const fountainCenter = pt(25.6, 0);
  S.cyl(fountainCenter[0], fountainCenter[1], y0 + 0.3, y0 + 0.9, 3.2, 2.9, 20, COLORS.hedge, { cap: false });
  S.kind = KIND.MASONRY;
  S.cyl(fountainCenter[0], fountainCenter[1], y0 + 0.3, y0 + 0.8, 2.2, 2.2, 16, COLORS.white);
  S.cyl(fountainCenter[0], fountainCenter[1], y0 + 0.8, y0 + 0.82, 2.0, 2.0, 16, hex('#6d8fa0'));
  S.cyl(fountainCenter[0], fountainCenter[1], y0 + 0.8, y0 + 1.6, 0.2, 0.25, 8, COLORS.cream);
  S.cyl(fountainCenter[0], fountainCenter[1], y0 + 1.6, y0 + 1.8, 0.7, 0.75, 10, COLORS.cream);
  S.cyl(fountainCenter[0], fountainCenter[1], y0 + 1.8, y0 + 2.3, 0.12, 0.1, 6, COLORS.cream);

  for (const [a, b] of ([[26.8, -24], [26.8, -18.5], [26.8, -13], [26.6, -8.6], [25.4, -5.6], [23.9, -3.8], [23.9, 3.8]] as any[])) {
    drawPalm(S, pt(a, b), y0 + 0.35, 10 + ((b * 7) % 3 + 3) % 3);
  }
  for (let b = -25.5; b <= -6; b += 3.2) {
    const potPt = pt(bedEnd - 2.0, b);
    S.kind = KIND.MASONRY;
    S.cyl(potPt[0], potPt[1], y0 + 0.35, y0 + 0.9, 0.4, 0.5, 8, COLORS.pot);
    S.kind = KIND.TIMBER;
    S.cyl(potPt[0], potPt[1], y0 + 0.9, y0 + 1.6, 0.85, 0.15, 7, COLORS.palm, { cap: false });
  }
  for (const b of [-9.0, -6.5, 6.5, 9.0]) drawTopiary(S, pt(HALF_DEPTH + 3.6, b), y0 + 0.08, Math.abs(b) > 8 ? 3.4 : 2.6);
  for (const b of [-HALF_FRONT - 1.5, HALF_FRONT + 1.5]) drawTopiary(S, pt(HALF_DEPTH + 1.4, b), y0 + 0.08, 3.0);

  if (Array.isArray(data.trees)) {
    const treePt = pt(10, -29.5);
    data.trees.push(Math.round(treePt[0] * 10), Math.round(treePt[1] * 10), 13, 0);
  }
  for (const [a, b, height] of ([[-12, -27.5, 20], [-19, -27, 22]] as any[])) drawNorfolkPine(S, pt(a, b), y0, height);

  // Trần Thúc Nhẫn kerb hedge, drop barrier, and shrubs
  const kerbB = (a) => -42.1 + (a + 74.8) * 0.1275 + 2.5;
  const kerbStrip = (a0, a1, width, ya, yb, sideCol, topCol) => {
    S.prism([pt(a0, kerbB(a0)), pt(a1, kerbB(a1)), pt(a1, kerbB(a1) + width), pt(a0, kerbB(a0) + width)], ya, yb, sideCol, topCol);
  };
  S.kind = KIND.PLAIN;
  kerbStrip(0.5, 22.5, 1.4, y0 - 0.2, y0 + 0.3, COLORS.white, COLORS.lawn);
  kerbStrip(-14, -6.5, 2.4, y0 - 0.2, y0 + 0.3, COLORS.white, COLORS.lawn);
  S.kind = KIND.TIMBER;
  S.prism([pt(0.8, kerbB(0.8) + 0.2), pt(22.2, kerbB(22.2) + 0.2), pt(22.2, kerbB(22.2) + 1.1), pt(0.8, kerbB(0.8) + 1.1)], y0 + 0.3, y0 + 0.95, COLORS.hedge, shade(COLORS.hedge, 1.1));
  for (const [a, rad, height] of ([[-7.4, 0.9, 1.5], [-8.9, 1.1, 2.2], [-10.6, 0.8, 1.3], [-12.0, 1.0, 1.9], [-13.3, 0.7, 1.2]] as any[])) {
    const shrubPt = pt(a, kerbB(a) + 1.2);
    S.cyl(shrubPt[0], shrubPt[1], y0 + 0.3, y0 + 0.3 + height, rad, rad * 0.7, 8, shade(COLORS.hedge, 1.0 + 0.08 * (a % 2)));
  }
  S.kind = KIND.PLAIN;
  const barA0 = -0.2, barA1 = -6.2;
  for (const a of [barA0, -2.2, -4.2, barA1]) {
    const standPt = pt(a, kerbB(a) + 0.4);
    S.box(standPt[0], standPt[1], y0, y0 + 0.55, 0.12, 0.12, frontAng, COLORS.red);
  }
  for (let k = 0; k < 6; k++) {
    const a0 = barA0 + ((barA1 - barA0) * k) / 6;
    const a1 = barA0 + ((barA1 - barA0) * (k + 1)) / 6;
    const pt0 = pt(a0, kerbB(a0) + 0.4), pt1 = pt(a1, kerbB(a1) + 0.4);
    S.beam([pt0[0], y0 + 0.6, pt0[1]], [pt1[0], y0 + 0.6, pt1[1]], 0.08, 0.08, k % 2 ? COLORS.white : COLORS.red);
  }

  // Sign wall and gatehouse
  const signA = 30.85;
  S.kind = KIND.MASONRY;
  box(signA - 0.3, 44, y0, y0 + 1.6, 0.8, 6.0, COLORS.white, { top: shade(COLORS.white, 0.95) });
  box(signA + 0.12, 44.4, y0 + 0.35, y0 + 1.3, 0.06, 4.6, hex('#3c3a3a'));
  S.kind = KIND.TIMBER;
  const bushPt = pt(26.6, 43.5);
  S.cyl(bushPt[0], bushPt[1], y0, y0 + 0.9, 2.2, 1.9, 14, COLORS.hedge);

  S.kind = KIND.PLAIN;
  const gateA = 17, gateB = 46, gateD = 6, gateW = 8;
  box(gateA - 0.6, gateB, y0, y0 + 3.2, gateD - 1.8, gateW - 1.2, COLORS.cream);
  for (const sb of [-1, 1]) for (const k of [0, 1, 2]) {
    const colPt = pt(gateA + gateD / 2 - 0.4, gateB + sb * (gateW / 2 - 0.4 - k * 1.6));
    S.box(colPt[0], colPt[1], y0, y0 + 3.2, 0.36, 0.36, frontAng, COLORS.white);
  }
  box(gateA - 0.6, gateB, y0 + 1.0, y0 + 2.6, gateD - 1.75, gateW - 3.4, COLORS.glass);
  box(gateA, gateB, y0 + 3.2, y0 + 3.75, gateD + 0.4, gateW + 0.4, COLORS.white, { top: shade(COLORS.white, 0.92) });

  return plaza;
}

function buildBoundaryWallAndKiosk(data, S, pt, frontDir, acrossDir, frontAng, y0, plaza) {
  const wallPt = (dist) => pt(36.36 - 0.794 * dist, 72.55 - 0.608 * dist);
  const inwardDir = [0.608 * frontDir[0] - 0.794 * acrossDir[0], 0.608 * frontDir[1] - 0.794 * acrossDir[1]];
  const offsetInward = (basePt, dist): [number, number] => [basePt[0] + dist * inwardDir[0], basePt[1] + dist * inwardDir[1]];
  const s0 = 5, s1 = 120;
  const startPt = wallPt(s0), endPt = wallPt(s1);
  const wallAng = Math.atan2(endPt[1] - startPt[1], endPt[0] - startPt[0]);
  const groundAt = (pos) => LAND_Y + rise(pos[0], pos[1]);
  const wallH = 1.8, copingH = 0.28, railH = 1.25, bayTarget = 2.6;
  const bayCount = Math.round((s1 - s0) / bayTarget), bayLen = (s1 - s0) / bayCount;

  for (let k = 0; k < bayCount; k++) {
    const midPt = wallPt(s0 + (k + 0.5) * bayLen);
    const y = groundAt(midPt);
    S.base = y - LAND_Y;
    S.kind = KIND.PLAIN;
    S.box(midPt[0], midPt[1], y - 0.4, y + wallH, bayLen + 0.01, 0.5, wallAng, shade(COLORS.rubble, 0.94 + 0.08 * ((k * 5) % 3) / 2));
    for (let j = 0; j < 5; j++) {
      const alongFrac = ((k * 37 + j * 53) % 97) / 97 - 0.5;
      const stoneY = 0.15 + (((k * 17 + j * 29) % 11) / 11) * (wallH - 0.55);
      const stonePt = offsetInward(wallPt(s0 + (k + 0.5 + alongFrac * 0.85) * bayLen), -0.26);
      S.box(stonePt[0], stonePt[1], y + stoneY, y + stoneY + 0.22 + 0.1 * (j % 2), 0.35 + 0.15 * (j % 3), 0.04, wallAng, shade(COLORS.rubble, j % 2 ? 1.18 : 0.78));
    }
    S.box(midPt[0], midPt[1], y + wallH, y + wallH + copingH, bayLen + 0.01, 0.56, wallAng, COLORS.render);
    const postPt = wallPt(s0 + k * bayLen);
    S.box(postPt[0], postPt[1], y + wallH + copingH, y + wallH + copingH + railH + 0.1, 0.1, 0.1, wallAng, COLORS.iron);
    S.box(midPt[0], midPt[1], y + wallH + copingH + 0.08, y + wallH + copingH + 0.13, bayLen, 0.05, wallAng, COLORS.iron);
    S.box(midPt[0], midPt[1], y + wallH + copingH + railH - 0.06, y + wallH + copingH + railH, bayLen, 0.06, wallAng, COLORS.iron);
    const barCount = Math.round(bayLen / 0.32);
    for (let j = 1; j < barCount; j++) {
      const barPt = wallPt(s0 + k * bayLen + (bayLen * j) / barCount);
      S.box(barPt[0], barPt[1], y + wallH + copingH + 0.13, y + wallH + copingH + railH - 0.06, 0.025, 0.025, wallAng, COLORS.iron);
    }
  }
  const endGroundY = groundAt(endPt);
  S.box(endPt[0], endPt[1], endGroundY + wallH + copingH, endGroundY + wallH + copingH + railH + 0.1, 0.1, 0.1, wallAng, COLORS.iron);
  S.base = y0 - LAND_Y;

  for (let dist = 9, k = 0; dist <= 116; dist += 6.5, k++) {
    drawBamboo(S, offsetInward(wallPt(dist + (k % 3) - 1), 1.4), y0, 7 + (k % 3));
  }
  if (Array.isArray(data.trees)) {
    for (let dist = 8, k = 0; dist <= 116; dist += 3.4, k++) {
      const offset = [2.8, 5.6, 8.6][k % 3];
      const treePt = offsetInward(wallPt(dist), offset);
      if (pointInRing(treePt[0], treePt[1], plaza)) continue;
      data.trees.push(Math.round(treePt[0] * 10), Math.round(treePt[1] * 10), 11 + ((k * 7) % 5), [0, 1, 4][(k * 2) % 3]);
    }
    for (const [a, b, height] of ([[-44, -9, 12], [-50, -16, 13], [-38, -18, 11]] as any[])) {
      const treePt = pt(a, b);
      data.trees.push(Math.round(treePt[0] * 10), Math.round(treePt[1] * 10), height, 0);
    }
  }

  // Filter generated infill inside museum grounds
  if (Array.isArray(data.infill)) {
    const groundsRing = [[31.5, -31], [31.5, 72], [36.36 - 0.794 * 120, 72.55 - 0.608 * 120], [-62, -22], [-35, -37], [-20, -33]].map(([a, b]) => pt(a, b));
    const infill = data.infill, stride = 8, kept = [];
    const nearCount = data.meta?.counts?.infillNear ?? infill.length / stride;
    let nearKept = 0;
    for (let i = 0; i < infill.length / stride; i++) {
      if (pointInRing(infill[i * stride] / 10, infill[i * stride + 1] / 10, groundsRing)) continue;
      if (i < nearCount) nearKept++;
      for (let j = 0; j < stride; j++) kept.push(infill[i * stride + j]);
    }
    if (kept.length !== infill.length) {
      infill.length = 0;
      for (const val of kept) infill.push(val);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }

  // West kiosk & hedge
  const kioskPt = pt(-14, 22.3);
  S.kind = KIND.PLAIN;
  S.box(kioskPt[0], kioskPt[1], y0, y0 + 2.7, 3.4, 3.4, frontAng, COLORS.cream);
  S.hip(kioskPt[0], kioskPt[1], 3.4, 3.4, frontAng, y0 + 2.7, 1.4, COLORS.roof, { over: 0.6, fascia: 0.15, fasciaCol: COLORS.white });
  S.kind = KIND.TIMBER;
  const hedgeA = pt(-9, 29.5), hedgeB = pt(9, 41.5);
  const hedgeLen = Math.hypot(hedgeB[0] - hedgeA[0], hedgeB[1] - hedgeA[1]);
  S.box((hedgeA[0] + hedgeB[0]) / 2, (hedgeA[1] + hedgeB[1]) / 2, y0, y0 + 0.9, hedgeLen, 0.9, Math.atan2(hedgeB[1] - hedgeA[1], hedgeB[0] - hedgeA[0]), COLORS.hedge);
  if (Array.isArray(data.trees)) {
    for (const [a, b, height] of ([[-6, 32.5, 11], [2.5, 38.5, 12]] as any[])) {
      const treePt = pt(a, b);
      data.trees.push(Math.round(treePt[0] * 10), Math.round(treePt[1] * 10), height, 0);
    }
  }
}

function buildMuseumBodyAndRoofs(S, lightBuf, center, frontDir, acrossDir, frontAng, pt, box, rectRing, y0) {
  const floorY = y0 + 1.0;
  const groundHeadY = y0 + 4.4;
  const latticeY0 = y0 + 6.3, latticeY1 = y0 + 8.6;
  const parapetY = y0 + 11.4;
  const eaveY = y0 + 14.0;

  // Plinth and steps
  S.kind = KIND.MASONRY;
  S.prism(rectRing(-HALF_DEPTH - 0.6, HALF_DEPTH + 0.6, -HALF_FRONT - 0.6, HALF_FRONT + 0.6), y0 - 0.3, floorY, COLORS.stone, shade(COLORS.stone, 1.06));
  const faces = [
    { norm: frontDir, tan: acrossDir, halfDepth: HALF_DEPTH, halfWidth: HALF_FRONT, isFront: true, stepWidth: 12.6 },
    { norm: acrossDir, tan: [-frontDir[0], -frontDir[1]], halfDepth: HALF_FRONT, halfWidth: HALF_DEPTH, stepWidth: 7.0 },
    { norm: [-frontDir[0], -frontDir[1]], tan: [-acrossDir[0], -acrossDir[1]], halfDepth: HALF_DEPTH, halfWidth: HALF_FRONT, stepWidth: 7.0 },
    { norm: [-acrossDir[0], -acrossDir[1]], tan: frontDir, halfDepth: HALF_FRONT, halfWidth: HALF_DEPTH, stepWidth: 7.0 },
  ];
  for (const face of faces) {
    const faceAng = Math.atan2(face.norm[1], face.norm[0]);
    for (let k = 0; k < 6; k++) {
      const stepDepth = (6 - k) * 0.45, dist = face.halfDepth + 0.6 + stepDepth / 2;
      S.box(center[0] + dist * face.norm[0], center[1] + dist * face.norm[1], y0, y0 + ((floorY - y0) * (k + 1)) / 6, stepDepth, face.stepWidth, faceAng, shade(COLORS.stone, 1.08 - k * 0.02));
    }
  }
  for (const side of [-1, 1]) box(HALF_DEPTH + 2.0, side * (12.6 / 2 + 0.25), y0, floorY + 0.35, 3.4, 0.4, COLORS.white);

  // Main body blocks
  S.kind = KIND.PLAIN;
  S.prism(rectRing(-HALF_DEPTH + 2.2, HALF_DEPTH - 2.2, -HALF_FRONT + 2.2, HALF_FRONT - 2.2), floorY, groundHeadY, COLORS.pinkDark, COLORS.pinkDark, { top: false });
  S.prism(rectRing(-HALF_DEPTH, HALF_DEPTH, -HALF_FRONT, HALF_FRONT), groundHeadY, parapetY, COLORS.white, COLORS.white, { top: false });
  S.prism(rectRing(-HALF_DEPTH - 0.08, HALF_DEPTH + 0.08, -HALF_FRONT - 0.08, HALF_FRONT + 0.08), parapetY - 0.25, parapetY, shade(COLORS.white, 0.92), COLORS.white, { top: false });
  S.prism(rectRing(-HALF_DEPTH + 2.0, HALF_DEPTH - 2.0, -HALF_FRONT + 2.0, HALF_FRONT - 2.0), parapetY, eaveY, COLORS.pink, COLORS.pink, { top: false });
  S.prism(rectRing(-HALF_DEPTH - 0.1, HALF_DEPTH + 0.1, -HALF_FRONT - 0.1, HALF_FRONT + 0.1), eaveY - 0.4, eaveY, COLORS.white, COLORS.white, { top: false });
  S.prism(rectRing(-HALF_DEPTH + 0.05, HALF_DEPTH - 0.05, -HALF_FRONT + 0.05, HALF_FRONT - 0.05), parapetY - 0.02, parapetY + 0.02, COLORS.white, COLORS.white);

  // Four facades
  for (const face of faces) {
    const facePt = (out, along): [number, number] => [
      center[0] + out * face.norm[0] + along * face.tan[0],
      center[1] + out * face.norm[1] + along * face.tan[1],
    ];
    const faceAng = Math.atan2(face.norm[1], face.norm[0]);
    const faceBox = (out, along, ya, yb, dOut, dAlong, col, opt?) => {
      const pos = facePt(out, along);
      S.box(pos[0], pos[1], ya, yb, dOut, dAlong, faceAng, col, opt);
    };
    const faceLight = (out, along, ya, yb, dOut, dAlong) => {
      const pos = facePt(out, along);
      lightBuf.box(pos[0], pos[1], ya, yb, dOut, dAlong, faceAng, [1, 1, 1]);
    };
    const spanHalf = face.halfWidth - CORNER_BLOCK_SIZE + 0.35;

    faceBox(face.halfDepth - 2.2 + 0.05, 0, floorY + 0.15, groundHeadY - 0.3, 0.1, spanHalf * 2 - 0.6, COLORS.glass);
    for (let along = -spanHalf + 1.3; along <= spanHalf - 1.29; along += 1.9) {
      faceBox(face.halfDepth - 2.2 + 0.12, along, floorY + 0.15, groundHeadY - 0.3, 0.06, 0.12, COLORS.white);
    }
    faceLight(face.halfDepth - 2.2 + 0.16, 0, floorY + 0.4, groundHeadY - 0.6, 0.04, spanHalf * 2 - 1.2);
    const colCount = 6, colStep = (spanHalf * 2 - 2.0) / (colCount - 1);
    for (let i = 0; i < colCount; i++) {
      const along = -spanHalf + 1.0 + i * colStep;
      if (face.isFront && Math.abs(along) < 1.8) continue;
      const colPos = facePt(face.halfDepth - 0.45, along);
      S.cyl(colPos[0], colPos[1], floorY, groundHeadY, 0.28, 0.28, 10, COLORS.white, { cap: false });
    }

    const latticeStrips = face.isFront ? [[-spanHalf + 0.4, -3.1], [3.1, spanHalf - 0.4]] : [[-spanHalf + 0.4, spanHalf - 0.4]];
    for (const [t0, t1] of latticeStrips) {
      const tMid = (t0 + t1) / 2, stripW = t1 - t0;
      faceBox(face.halfDepth + 0.25, tMid, latticeY0 - 0.15, latticeY1 + 0.15, 0.5, stripW + 0.3, COLORS.white);
      faceBox(face.halfDepth + 0.52, tMid, latticeY0, latticeY1, 0.06, stripW, COLORS.fret);
      faceLight(face.halfDepth + 0.56, tMid, latticeY0 + 0.1, latticeY1 - 0.1, 0.02, stripW - 0.2);
      const panelCount = Math.round(stripW / 1.15);
      for (let i = 0; i <= panelCount; i++) faceBox(face.halfDepth + 0.56, t0 + (stripW * i) / panelCount, latticeY0, latticeY1, 0.04, 0.09, COLORS.white);
      for (const yy of [latticeY0 + 0.5, latticeY1 - 0.55]) faceBox(face.halfDepth + 0.56, tMid, yy, yy + 0.05, 0.04, stripW, shade(COLORS.white, 0.85));
      for (let i = 0; i < panelCount; i++) {
        faceBox(face.halfDepth + 0.57, t0 + (stripW * (i + 0.5)) / panelCount, latticeY0 + 0.5, latticeY1 - 0.5, 0.04, 0.05, shade(COLORS.white, 0.85));
      }
    }
    faceBox(face.halfDepth + 0.04, 0, groundHeadY - 0.05, groundHeadY + 0.3, 0.1, spanHalf * 2 + 0.6, shade(COLORS.white, 0.9));

    if (face.isFront) {
      faceBox(face.halfDepth + 0.12, 0, latticeY0 - 0.4, parapetY - 0.6, 0.25, 5.6, COLORS.white);
      for (const [along, petalW, petalH] of ([[0, 0.9, 2.3], [-0.85, 0.7, 1.7], [0.85, 0.7, 1.7], [-1.6, 0.55, 1.1], [1.6, 0.55, 1.1]] as any[])) {
        faceBox(face.halfDepth + 0.27, along, latticeY0 + 0.2, latticeY0 + 0.2 + petalH, 0.08, petalW, shade(COLORS.white, 0.88));
      }
      faceBox(face.halfDepth + 0.04, 0, groundHeadY + 1.1, groundHeadY + 1.5, 0.06, 6.4, hex('#5a4a52'));
      faceBox(face.halfDepth + 0.04, 0, groundHeadY + 0.85, groundHeadY + 1.0, 0.06, 3.8, hex('#5a4a52'));
      faceBox(face.halfDepth + 0.04, 0, groundHeadY + 0.35, groundHeadY + 0.7, 0.06, 7.0, COLORS.red);
      faceBox(face.halfDepth + 0.07, 0, groundHeadY + 0.44, groundHeadY + 0.6, 0.04, 6.0, COLORS.gold);
      faceBox(face.halfDepth - 2.2 + 0.14, 0, floorY, floorY + 3.0, 0.1, 3.6, hex('#1d2226'));
      faceLight(face.halfDepth - 2.2 + 0.2, 0, floorY + 0.1, floorY + 2.8, 0.03, 3.2);
    }

    const loggiaW = face.halfWidth * 2 - 2.0;
    for (let i = 0; i < 8; i++) {
      const along = -loggiaW / 2 + (loggiaW * (i + 0.5)) / 8;
      faceBox(face.halfDepth - 2.0 + 0.05, along, parapetY + 0.5, eaveY - 0.9, 0.08, loggiaW / 8 - 1.4, COLORS.glass);
      faceLight(face.halfDepth - 2.0 + 0.1, along, parapetY + 0.7, eaveY - 1.1, 0.03, loggiaW / 8 - 1.8);
    }
    for (let i = 0; i <= 8; i++) {
      const colPos = facePt(face.halfDepth - 0.3, -face.halfWidth + 0.3 + ((face.halfWidth * 2 - 0.6) * i) / 8);
      S.cyl(colPos[0], colPos[1], parapetY, eaveY - 0.4, 0.14, 0.14, 8, COLORS.white, { cap: false });
    }
  }

  // Corner blocks
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
    const a = sa * (HALF_DEPTH - CORNER_BLOCK_SIZE / 2 + 0.35);
    const b = sb * (HALF_FRONT - CORNER_BLOCK_SIZE / 2 + 0.35);
    box(a, b, floorY - 0.05, parapetY, CORNER_BLOCK_SIZE, CORNER_BLOCK_SIZE, COLORS.sage, { top: COLORS.sageDark });
    box(a, b, parapetY - 0.3, parapetY, CORNER_BLOCK_SIZE + 0.15, CORNER_BLOCK_SIZE + 0.15, COLORS.white);
    const glassTopY = parapetY - 1.6;
    const frontFacePt = pt(sa * (HALF_DEPTH + 0.36), b);
    S.box(frontFacePt[0], frontFacePt[1], floorY + 0.4, glassTopY, 0.06, CORNER_BLOCK_SIZE - 0.8, frontAng, COLORS.glass);
    lightBuf.box(frontFacePt[0] + frontDir[0] * sa * 0.04, frontFacePt[1] + frontDir[1] * sa * 0.04, floorY + 0.6, glassTopY - 0.2, 0.02, CORNER_BLOCK_SIZE - 1.2, frontAng, [1, 1, 1]);
    for (const k of [-1, 0, 1]) {
      const mullPt = pt(sa * (HALF_DEPTH + 0.4), b + k * ((CORNER_BLOCK_SIZE - 0.8) / 3));
      S.box(mullPt[0], mullPt[1], floorY + 0.4, glassTopY, 0.05, 0.1, frontAng, COLORS.sageDark);
    }
    for (let y = floorY + 2.2; y < glassTopY - 0.3; y += 2.2) S.box(frontFacePt[0], frontFacePt[1], y, y + 0.1, 0.1, CORNER_BLOCK_SIZE - 0.8, frontAng, COLORS.sageDark);
    if (sb > 0) {
      const sideFacePt = pt(a, sb * (HALF_FRONT + 0.36));
      S.box(sideFacePt[0], sideFacePt[1], floorY + 0.4, glassTopY, CORNER_BLOCK_SIZE - 0.8, 0.06, frontAng, COLORS.glass);
      for (const k of [-1, 0, 1]) {
        const mullPt = pt(a + k * ((CORNER_BLOCK_SIZE - 0.8) / 3), sb * (HALF_FRONT + 0.4));
        S.box(mullPt[0], mullPt[1], floorY + 0.4, glassTopY, 0.1, 0.05, frontAng, COLORS.sageDark);
      }
      for (let y = floorY + 2.2; y < glassTopY - 0.3; y += 2.2) S.box(sideFacePt[0], sideFacePt[1], y, y + 0.1, CORNER_BLOCK_SIZE - 0.8, 0.1, frontAng, COLORS.sageDark);
    }
  }

  // Main hip roof, soffit, and square rooftop lantern
  S.kind = KIND.TILE;
  const ridgeH = 4.8, cornerFlare = 0.55, fasciaThick = 0.3;
  S.hip(center[0], center[1], HALF_DEPTH * 2, HALF_FRONT * 2, frontAng, eaveY, ridgeH, COLORS.roof, { over: OVERHANG, flare: cornerFlare, fascia: fasciaThick, fasciaCol: COLORS.white, ridgeCol: COLORS.white, hips: false });
  const outerA = HALF_DEPTH + OVERHANG, outerB = HALF_FRONT + OVERHANG;
  const pt3 = (a, b, y) => { const pos = pt(a, b); return [pos[0], y, pos[1]]; };
  const ridgeHalf = Math.max(0, outerA - outerB * 0.92);
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
    S.beam(pt3(sa * outerA, sb * outerB, eaveY + cornerFlare + 0.12), pt3(sa * ridgeHalf, 0, eaveY + ridgeH + 0.12), 0.35, 0.25, COLORS.white);
  }

  S.kind = KIND.PLAIN;
  const eaveCorners = [[-outerA, -outerB], [outerA, -outerB], [outerA, outerB], [-outerA, outerB]];
  const wallCorners = [[-HALF_DEPTH, -HALF_FRONT], [HALF_DEPTH, -HALF_FRONT], [HALF_DEPTH, HALF_FRONT], [-HALF_DEPTH, HALF_FRONT]];
  const lerpCorner = (arr, i, j, frac): [number, number] => [arr[i][0] + (arr[j][0] - arr[i][0]) * frac, arr[i][1] + (arr[j][1] - arr[i][1]) * frac];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    for (const [t0, t1] of ([[0, 0.5], [0.5, 1]] as any[])) {
      const e0 = lerpCorner(eaveCorners, i, j, t0), e1 = lerpCorner(eaveCorners, i, j, t1);
      const w0 = lerpCorner(wallCorners, i, j, t0), w1 = lerpCorner(wallCorners, i, j, t1);
      const soffitYAt = (frac) => eaveY - fasciaThick - 0.04 + cornerFlare * Math.abs(2 * frac - 1);
      S.quad(pt3(e0[0], e0[1], soffitYAt(t0)), pt3(e1[0], e1[1], soffitYAt(t1)), pt3(w1[0], w1[1], eaveY - 0.04), pt3(w0[0], w0[1], eaveY - 0.04), COLORS.soffit, [0, -1, 0]);
    }
  }

  const lanternW = 11.0, lanternBaseY = y0 + 16.8;
  S.kind = KIND.PLAIN;
  box(0, 0, eaveY + 1.6, lanternBaseY + 2.2, lanternW, lanternW, COLORS.pink);
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) box(sa * (lanternW / 2 - 0.2), sb * (lanternW / 2 - 0.2), lanternBaseY, lanternBaseY + 2.2, 0.5, 0.5, COLORS.white);
  for (const side of [-1, 1]) {
    box(side * (lanternW / 2 + 0.03), 0, lanternBaseY + 0.5, lanternBaseY + 1.7, 0.06, lanternW - 1.4, COLORS.glass);
    box(0, side * (lanternW / 2 + 0.03), lanternBaseY + 0.5, lanternBaseY + 1.7, lanternW - 1.4, 0.06, COLORS.glass);
  }
  S.kind = KIND.TILE;
  S.hip(center[0], center[1], lanternW, lanternW, frontAng, lanternBaseY + 2.2, 2.6, shade(COLORS.roof, 1.05), { over: 1.3, fascia: 0.45, fasciaCol: COLORS.white, ridgeCol: COLORS.white });
  const lanternOuter = lanternW / 2 + 1.3;
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
    S.beam(pt3(sa * lanternOuter, sb * lanternOuter, lanternBaseY + 2.2 + 0.1), pt3(0, 0, lanternBaseY + 2.2 + 2.6 + 0.1), 0.3, 0.22, COLORS.white);
  }
}

export function build({ data, S, group }) {
  const center = [EAVE_RING.reduce((sum, pt) => sum + pt[0], 0) / 4, EAVE_RING.reduce((sum, pt) => sum + pt[1], 0) / 4];
  const depthLen = Math.hypot(EAVE_RING[3][0] - EAVE_RING[0][0], EAVE_RING[3][1] - EAVE_RING[0][1]);
  const frontDir = [(EAVE_RING[3][0] - EAVE_RING[0][0]) / depthLen, (EAVE_RING[3][1] - EAVE_RING[0][1]) / depthLen];
  const acrossDir = [-frontDir[1], frontDir[0]];
  const pt = (along, across): [number, number] => [
    center[0] + along * frontDir[0] + across * acrossDir[0],
    center[1] + along * frontDir[1] + across * acrossDir[1],
  ];
  const frontAng = Math.atan2(frontDir[1], frontDir[0]);
  const box = (along, across, ya, yb, dAlong, dAcross, col, opt?) => {
    const pos = pt(along, across);
    S.box(pos[0], pos[1], ya, yb, dAlong, dAcross, frontAng, col, opt);
  };
  const rectRing = (a0, a1, b0, b1) => [pt(a0, b0), pt(a1, b0), pt(a1, b1), pt(a0, b1)];

  const y0 = LAND_Y + rise(center[0], center[1]);
  S.base = y0 - LAND_Y;
  const lightBuf = new Buf(1024);
  const lampPos = [], lampCol = [];

  const plaza = buildFrontGardenAndDrive(data, S, pt, box, rectRing, frontAng, y0);
  buildBoundaryWallAndKiosk(data, S, pt, frontDir, acrossDir, frontAng, y0, plaza);
  buildMuseumBodyAndRoofs(S, lightBuf, center, frontDir, acrossDir, frontAng, pt, box, rectRing, y0);

  // Forecourt and gate lamp posts
  S.kind = KIND.PLAIN;
  const lampCoords: [number, number][] = [
    [HALF_DEPTH + 7.6, -HALF_FRONT - 6], [HALF_DEPTH + 7.6, HALF_FRONT + 6],
    [-HALF_DEPTH - 7, -HALF_FRONT - 7], [-HALF_DEPTH - 7, HALF_FRONT + 7],
    [0, -HALF_FRONT - 8], [0, HALF_FRONT + 8], [26, 33], [26, 38],
  ];
  for (const [a, b] of lampCoords) {
    const pos = pt(a, b);
    S.cyl(pos[0], pos[1], y0, y0 + 4.6, 0.08, 0.06, 6, hex('#3a3d40'), { cap: false });
    S.cyl(pos[0], pos[1], y0 + 4.5, y0 + 4.9, 0.22, 0.22, 8, COLORS.white);
    lampPos.push(pos[0], y0 + 4.7, pos[1]);
    lampCol.push(1, 0.85, 0.6);
  }
  const glowPts = glowPoints(lampPos, lampCol, 5);
  glowPts.userData.glow = true;
  glowPts.userData.landmark = id;
  group.add(glowPts);
  addEmissiveStripMesh(group, lightBuf, 0xffd9a0, 0.9, id);
  S.kind = KIND.PLAIN;
  S.base = 0;
}

function drawPalm(S, pos, y, height) {
  S.kind = KIND.TIMBER;
  S.cyl(pos[0], pos[1], y, y + height, 0.22, 0.16, 6, COLORS.trunk, { cap: false });
  const top = [pos[0] + 0.25, y + height, pos[1]];
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2, dx = Math.cos(ang), dz = Math.sin(ang);
    const mid = [top[0] + dx * 1.5, top[1] + 0.45, top[2] + dz * 1.5];
    const tip = [top[0] + dx * 3.0, top[1] - 0.9, top[2] + dz * 3.0];
    S.beam(top, mid, 0.7, 0.08, COLORS.palm);
    S.beam(mid, tip, 0.55, 0.06, shade(COLORS.palm, 0.9));
  }
}

function drawTopiary(S, pos, y, height) {
  S.kind = KIND.MASONRY;
  S.cyl(pos[0], pos[1], y, y + 0.7, 0.55, 0.7, 10, COLORS.pot);
  S.kind = KIND.TIMBER;
  S.cyl(pos[0], pos[1], y + 0.7, y + height, 0.09, 0.07, 5, COLORS.trunk, { cap: false });
  const tierCount = Math.max(2, Math.round(height / 0.9));
  for (let i = 0; i < tierCount; i++) {
    const yy = y + 1.1 + ((height - 0.9) * i) / tierCount;
    const rad = 0.85 - (0.4 * i) / tierCount;
    S.cyl(pos[0], pos[1], yy, yy + 0.45, rad, rad * 0.85, 8, COLORS.hedge);
  }
}

function drawNorfolkPine(S, pos, y, height) {
  S.kind = KIND.TIMBER;
  S.cyl(pos[0], pos[1], y, y + height, 0.3, 0.08, 6, COLORS.trunk, { cap: false });
  const yStart = y + Math.min(2.5, height * 0.15);
  const tierCount = Math.round((height - (yStart - y)) / 0.6);
  for (let i = 0; i < tierCount; i++) {
    const frac = i / tierCount;
    const yy = yStart + (height - (yStart - y) - 0.4) * frac;
    const rad = (height / 7.5) * Math.pow(1 - frac, 0.8) + 0.4;
    S.cyl(pos[0], pos[1], yy, yy + 0.8, rad, rad * 0.55, 8, shade(COLORS.pine, 0.95 + 0.1 * (i % 2)));
  }
}

function drawBamboo(S, pos, y, height) {
  S.kind = KIND.TIMBER;
  const culmCount = 7;
  for (let i = 0; i < culmCount; i++) {
    const ang = (i / culmCount) * Math.PI * 2 + height, baseRad = 0.35, lean = 1.1 + 0.4 * (i % 2);
    const bot = [pos[0] + Math.cos(ang) * baseRad, y, pos[1] + Math.sin(ang) * baseRad];
    const top = [pos[0] + Math.cos(ang) * (baseRad + lean), y + height - (i % 3) * 0.6, pos[1] + Math.sin(ang) * (baseRad + lean)];
    S.beam(bot, top, 0.08, 0.08, hex('#7d8f4a'));
    S.cyl(top[0], top[2], top[1] - 2.0, top[1] + 0.3, 0.9, 0.15, 6, shade(COLORS.hedge, 1.15 + 0.05 * (i % 2)), { cap: false });
  }
}
