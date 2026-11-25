import { KIND, hex, shade, inRing } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { fence, roadsNear, leaves, FENCE } from '../enclosure.ts';

// Trường Quốc Học (founded 1896; campus rebuilt in brick, lime and tile from 1915) as it stands in 2026.
// Sources and estimates: docs/places/quochoc.md.

export const id = 'quochoc';

const LELOI_SHIFT = [2.23, 2.56];
const CAMPUS_RING = [
  [-501, 1197], [-495.8, 1199.4], [-486.9, 1195.2], [-383.6, 1100.1], [-383, 1087.1], [-571.6, 872.4],
  [-579.2, 870.7], [-639.6, 923.5], [-697.6, 974.1], [-696.9, 983.1], [-540, 1155.6],
].map(([x, z], idx) => (idx >= 5 && idx <= 8 ? [x + LELOI_SHIFT[0], z + LELOI_SHIFT[1]] : [x, z]));

const GATE = { c: [-637.8 + LELOI_SHIFT[0], 921.9 + LELOI_SHIFT[1]], a: 2.424 };
const CIRCLE = { c: [-569.9, 1001.2], r: 11.5 };

const PAV_PARTS = [[-5.2, 5.2, -6.3, 4.0], [-7.5, 7.5, -4.0, 1.85], [-2.3, 2.5, 4.0, 6.3]];
const BLD = [
  [118542427, 1, 13.0, -564.6, 904.8, -2.282, PAV_PARTS],
  [695770486, 0, 12.5, -520.6, 942.5, 0.853, null],
  [695770487, 1, 13.0, -533.8, 967.1, 0.839, null, false, [0, 1]],
  [695775624, 0, 10.0, -524.0, 1131.8, 2.408, [[10.7, 24.4, -12, 12], [-24.4, 10.7, -8.6, 3.45]]],
  [695775625, 0, 4.6, -573.4, 1110.3, 0.831, null],
  [695775626, 2, 13.0, -559.8, 1102.8, 0.828, null, false, [1, 0]],
  [695775628, 1, 13.0, -452.4, 1043.3, -2.301, [[-19.6, 15, -13.7, 13.7], [15, 19.6, -11.2, 10.3]], false, [1, 0]],
  [695775629, 0, 5.0, -529.1, 1044.3, 0.835, null, true],
  [695775630, 0, 5.0, -507.3, 1069.4, 3.980, null, true],
  [695775634, 1, 9.0, -494.8, 1082.0, 2.400, [[-17.9, 17.9, -11.6, 3.0], [-6.8, 6.4, 3.0, 11.6]]],
  [695775635, 0, 4.6, -674.9, 999.2, -2.319, null],
  [695775636, 1, 10.5, -665.6, 988.3, 0.833, PAV_PARTS],
  [695775637, 1, 8.0, -637.4, 952.2, 2.419, null],
  [695775638, 1, 8.5, -608.1, 926.2, -0.719, null],
  [695775639, 1, 13.0, -537.3, 1033.7, -0.711, [[-15.6, 17.0, -13.7, 3.7]], false, [1, 0]],
  [695775639, 2, 5.0, -537.3, 1033.7, -0.711, [[-15.6, 13.6, 3.7, 6.6]]],
  [9669095, 2, 6.0, -518.3, 1055.9, -0.703, [[17.2, 30.9, -11.5, 11.5], [-8.0, 6.5, -11.5, 11.5], [-30.9, -18.6, -11.5, 11.5]]],
  [9669095, 2, 4.2, -518.3, 1055.9, -0.703, [[6.5, 17.2, 7.4, 11.5], [6.5, 17.2, -11.5, -7.4], [-18.6, -8.0, 7.4, 11.5], [-18.6, -8.0, -11.5, -7.4]], true],
  [695775640, 1, 13.0, -602.9, 1029.2, -2.293, null],
  [695775641, 0, 12.5, -627.0, 1040.4, 0.833, null],
  [1377968893, 1, 5.5, -489.7, 1017.2, 0.836, null],
];
const DIMS = {
  695770486: [62.6, 13.7], 695770487: [82.1, 15.5], 695775623: [44.6, 5.5], 695775625: [40.2, 9.3],
  695775626: [57.6, 14.0], 695775629: [8.6, 4.3], 695775630: [12.1, 4.0], 695775635: [36.2, 7.9],
  695775637: [24.1, 14.7], 695775638: [18.3, 15.1], 695775640: [81.5, 15.4], 695775641: [62.7, 14.1],
  1377968893: [32.1, 6.6],
};

const RED = hex('#a23d33');
const RED_D = hex('#85302a');
const CREAM = hex('#eee0c0');
const ROOF = hex('#8c4c3b');
const RIDGE = hex('#d9c9a4');
const YELLOW = hex('#d8a52c');
const IRON = hex('#24302b');
const BRONZE = hex('#5b4a35');
const BOARD = hex('#1f2f4a');
const GOLD = hex('#d9b14a');
const DARK = hex('#2e2522');
const SHUT = hex('#4a3a2b');
const GLASS = hex('#2b3138');
const GALLERY_DEPTH = 2.6;

const groundY = (x, z) => LAND_Y + rise(x, z);
const localAt = (origin, ang, u, v): [number, number] => [origin[0] + u * Math.cos(ang) - v * Math.sin(ang), origin[1] + u * Math.sin(ang) + v * Math.cos(ang)];

// ---------------- campus sections ----------------

function buildCampusBlocks(S) {
  for (const [osm, colonial, top, cx, cz, ang, parts0, link = false, gable = null] of BLD as any[]) {
    const dims = DIMS[osm];
    const parts = parts0 || [[-dims[0] / 2, dims[0] / 2, -dims[1] / 2, dims[1] / 2]];
    const center = [cx, cz];
    let floorRise = -Infinity;
    for (const [u0, u1, v0, v1] of parts) {
      for (const [u, v] of ([[u0, v0], [u1, v0], [u1, v1], [u0, v1]] as [number, number][])) {
        const pt = localAt(center, ang, u, v);
        floorRise = Math.max(floorRise, rise(pt[0], pt[1]));
      }
    }
    const y0 = LAND_Y + floorRise;
    S.base = floorRise;
    const wallCol = colonial ? RED : shade(RED, 1.04);

    parts.forEach(([u0, u1, v0, v1], partIdx) => {
      const width = u1 - u0, depth = v1 - v0;
      const partCenter = localAt(center, ang, (u0 + u1) / 2, (v0 + v1) / 2);
      const roofH = Math.min(4.2, Math.max(1.6, Math.min(width, depth) * 0.24));
      const eaveY = y0 + Math.max(2.8, top - roofH - 0.3);
      const twoStorey = top >= 8;
      const storeyH = twoStorey ? (eaveY - y0 - 0.5) / 2 : eaveY - y0 - 0.5;
      const isLongU = width >= depth;
      const hasGallery = colonial === 1 && Math.max(width, depth) >= 20 && Math.min(width, depth) >= 9;
      let gallerySide = 0;
      if (hasGallery) {
        const nrm = isLongU ? [-Math.sin(ang), Math.cos(ang)] : [Math.cos(ang), Math.sin(ang)];
        gallerySide = (CIRCLE.c[0] - partCenter[0]) * nrm[0] + (CIRCLE.c[1] - partCenter[1]) * nrm[1] >= 0 ? 1 : -1;
      }

      S.kind = KIND.MASONRY;
      S.box(partCenter[0], partCenter[1], y0 - 0.6, y0 + 0.5, width + 0.2, depth + 0.2, ang, shade(CREAM, 0.86), { topKind: KIND.ROAD });
      S.kind = KIND.PLAIN;
      let wallCenter = partCenter, wallW = width, wallD = depth;
      if (hasGallery) {
        wallCenter = isLongU ? localAt(partCenter, ang, 0, (-gallerySide * GALLERY_DEPTH) / 2) : localAt(partCenter, ang, (-gallerySide * GALLERY_DEPTH) / 2, 0);
        if (isLongU) wallD = depth - GALLERY_DEPTH;
        else wallW = width - GALLERY_DEPTH;
      }
      S.box(wallCenter[0], wallCenter[1], y0 + 0.5, eaveY, wallW, wallD, ang, wallCol);
      buildFacade(S, wallCenter, ang, wallW, wallD, y0 + 0.5, storeyH, twoStorey ? 2 : 1, colonial ? 'arch' : 'rect', link);
      S.box(partCenter[0], partCenter[1], eaveY - 0.45, eaveY, link ? width : width + 0.3, depth + 0.3, ang, CREAM);
      if (twoStorey && !hasGallery) S.box(partCenter[0], partCenter[1], y0 + 0.5 + storeyH - 0.1, y0 + 0.5 + storeyH + 0.15, width + 0.12, depth + 0.12, ang, CREAM);
      if (hasGallery) buildGallery(S, partCenter, ang, width, depth, isLongU, gallerySide, GALLERY_DEPTH, y0 + 0.5, storeyH, twoStorey ? 2 : 1, eaveY - 0.45, wallCol);

      const gableEnds = partIdx === 0 && gable && isLongU ? gable : [0, 0];
      buildRoof(S, partCenter, ang, link ? width - 1.8 : width, depth, eaveY, roofH, gableEnds);
      for (const [endIdx, dirSign] of ([[0, -1], [1, 1]] as [number, number][])) {
        if (gableEnds[endIdx]) buildPediment(S, localAt(partCenter, ang, (dirSign * width) / 2, 0), ang, dirSign, depth, eaveY, roofH, 0.9, wallCol);
      }
    });
  }
  S.base = 0;

  // hội trường's terrace
  const hallOrigin = [-537.3, 1033.7], hallAng = -0.711;
  const terrPt = localAt(hallOrigin, hallAng, 15.8, 6.3), terrY = groundY(terrPt[0], terrPt[1]);
  S.kind = KIND.MASONRY;
  S.box(terrPt[0], terrPt[1], terrY - 0.4, terrY + 1.1, 4.6, 5.4, hallAng, shade(CREAM, 0.9), { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (const [u, v, len, ang] of ([[15.8, 8.95, 4.6, hallAng], [18.05, 6.3, 5.4, hallAng + Math.PI / 2]] as [number, number, number, number][])) {
    const pt = localAt(hallOrigin, hallAng, u, v);
    S.box(pt[0], pt[1], terrY + 1.1, terrY + 1.95, len, 0.22, ang, CREAM);
  }

  // old hall's two paved courts
  for (const [u0, u1] of ([[6.5, 17.2], [-18.6, -8.0]] as [number, number][])) {
    const pt = localAt([-518.3, 1055.9], -0.703, (u0 + u1) / 2, 0), y = groundY(pt[0], pt[1]);
    S.kind = KIND.PLAIN;
    S.box(pt[0], pt[1], y - 0.3, y + 0.08, u1 - u0, 14.8, -0.703, hex('#bdb3a0'), { topKind: KIND.ROAD });
  }
}

function buildSportsGround(S) {
  const poolCenter = [-480.8, 1007.6], poolAng = 0.84, poolY = groundY(poolCenter[0], poolCenter[1]);
  S.kind = KIND.PLAIN;
  S.box(poolCenter[0], poolCenter[1], poolY - 0.3, poolY + 0.25, 27.5, 18.2, poolAng, hex('#d9d2c2'), { topKind: KIND.ROAD });
  S.box(poolCenter[0], poolCenter[1], poolY - 0.3, poolY + 0.27, 23.0, 13.7, poolAng, hex('#5fa9c4'));

  const fieldCenter = [-459.4, 1127.4], fieldAng = -0.71;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 4; j++) {
      const pt = localAt(fieldCenter, fieldAng, -38 + (i + 0.5) * 9.5, -19.5 + (j + 0.5) * 9.75), ty = groundY(pt[0], pt[1]);
      S.box(pt[0], pt[1], ty - 0.4, ty + 0.06, 9.52, 9.77, fieldAng, hex('#4f8a3c'), { topKind: KIND.GROUND });
    }
  }
  for (const [u, v, w, d] of ([[0, -19.2, 76, 0.18], [0, 19.2, 76, 0.18], [-37.7, 0, 0.18, 39], [37.7, 0, 0.18, 39], [0, 0, 0.18, 39]] as [number, number, number, number][])) {
    const pt = localAt(fieldCenter, fieldAng, u, v);
    const e0 = localAt(fieldCenter, fieldAng, u - w / 2, v - d / 2), e1 = localAt(fieldCenter, fieldAng, u + w / 2, v + d / 2);
    const ly = Math.max(groundY(pt[0], pt[1]), groundY(e0[0], e0[1]), groundY(e1[0], e1[1]));
    S.box(pt[0], pt[1], ly - 0.2, ly + 0.08, w, d, fieldAng, hex('#e8eee0'));
  }
  for (let i = 0; i < 10; i++) {
    const pt = localAt(fieldCenter, fieldAng, 3 - 50 + (i + 0.5) * 10, -25.5), ty = groundY(pt[0], pt[1]);
    S.box(pt[0], pt[1], ty - 0.4, ty + 0.07, 10.02, 8.6, fieldAng, hex('#a3483a'), { topKind: KIND.ROAD });
  }

  buildGrandstand(S);

  // tennis court
  const tennisCenter = [-418.1, 1092.3], tennisAng = 0.86, courtL = 23.77, courtW = 10.97, singlesW = 8.23, serviceL = 6.4;
  const tennisLines = [
    [0, -courtW / 2, courtL, 0.06], [0, courtW / 2, courtL, 0.06], [0, -singlesW / 2, courtL, 0.06], [0, singlesW / 2, courtL, 0.06],
    [-courtL / 2, 0, 0.06, courtW], [courtL / 2, 0, 0.06, courtW], [-serviceL, 0, 0.06, singlesW], [serviceL, 0, 0.06, singlesW], [0, 0, serviceL * 2, 0.06],
  ];
  const tennis = buildCourt(S, tennisCenter, tennisAng, [36, 18], [courtL + 1.2, courtW + 1.2], tennisLines, hex('#8a5444'), hex('#4c6176'));
  for (const side of [-1, 1]) { const pt = tennis.toPt(0, side * (courtW / 2 + 0.5)); S.cyl(pt[0], pt[1], tennis.y, tennis.y + 1.07, 0.05, 0.05, 5, IRON); }
  S.box(tennisCenter[0], tennisCenter[1], tennis.y + 0.6, tennis.y + 0.95, 0.03, courtW + 1, tennisAng, shade(IRON, 1.4));
  for (const [u, v] of ([[-18, -9], [-18, 9], [18, -9], [18, 9], [0, -9], [0, 9], [-18, 0], [18, 0]] as [number, number][])) {
    const pt = tennis.toPt(u, v);
    S.cyl(pt[0], pt[1], tennis.y, tennis.y + 4, 0.05, 0.05, 5, shade(IRON, 1.3));
  }

  // basketball court
  const bballCenter = [-499.4, 1164.5], bballAng = 0.86, bballL = 28, bballW = 15;
  const bballLines = [
    [0, -bballW / 2, bballL, 0.06], [0, bballW / 2, bballL, 0.06], [-bballL / 2, 0, 0.06, bballW], [bballL / 2, 0, 0.06, bballW],
    [0, 0, 0.06, bballW], [-bballL / 2 + 2.9, 0, 5.8, 4.9], [bballL / 2 - 2.9, 0, 5.8, 4.9],
  ];
  const bball = buildCourt(S, bballCenter, bballAng, [32, 18], null, [], hex('#8f9393'));
  for (const [u, v, len, wd] of bballLines) {
    const pt = bball.toPt(u, v);
    if (len > 5 && wd > 4) S.box(pt[0], pt[1], bball.y - 0.1, bball.y + 0.105, len, wd, bballAng, hex('#a35a48'));
    else S.box(pt[0], pt[1], bball.y - 0.1, bball.y + 0.115, len, wd, bballAng, hex('#eef0ea'));
  }
  for (const side of [-1, 1]) {
    const postPt = bball.toPt(side * (bballL / 2 + 0.9), 0), boardPt = bball.toPt(side * (bballL / 2 - 1.2), 0);
    S.cyl(postPt[0], postPt[1], bball.y, bball.y + 3.4, 0.08, 0.08, 6, hex('#3c4a54'));
    S.box(boardPt[0], boardPt[1], bball.y + 2.9, bball.y + 3.95, 0.05, 1.8, bballAng, hex('#f2f2f0'));
    const rimPt = bball.toPt(side * (bballL / 2 - 1.2) + side * 0.6, 0);
    S.box((postPt[0] + boardPt[0]) / 2, (postPt[1] + boardPt[1]) / 2, bball.y + 3.3, bball.y + 3.38, 2.1, 0.1, bballAng, hex('#3c4a54'));
    S.cyl(rimPt[0], rimPt[1], bball.y + 3.03, bball.y + 3.05, 0.23, 0.23, 8, hex('#d0602e'), { cap: false });
  }
}

function buildYardAndScreen(S, axisAt, axLen, axAng, lampAt) {
  const paveCol = hex('#bdb3a0');
  S.kind = KIND.PLAIN;
  drapeStrip(S, axisAt(1.5), axisAt(axLen - CIRCLE.r - 0.5), 6.5, paveCol);
  for (let k = 0; k < 24; k++) {
    const a0 = ((k - 0.06) / 24) * Math.PI * 2, a1 = ((k + 1.06) / 24) * Math.PI * 2, ringR = CIRCLE.r + 2.6;
    drapeStrip(S, [CIRCLE.c[0] + Math.cos(a0) * ringR, CIRCLE.c[1] + Math.sin(a0) * ringR], [CIRCLE.c[0] + Math.cos(a1) * ringR, CIRCLE.c[1] + Math.sin(a1) * ringR], 5.2, paveCol, 0.075);
  }
  const circleY = groundY(CIRCLE.c[0], CIRCLE.c[1]);
  S.kind = KIND.MASONRY;
  S.cyl(CIRCLE.c[0], CIRCLE.c[1], circleY - 0.3, circleY + 0.25, CIRCLE.r, CIRCLE.r, 28, shade(CREAM, 0.8), { cap: false });
  S.kind = KIND.GROUND;
  S.cyl(CIRCLE.c[0], CIRCLE.c[1], circleY - 0.3, circleY + 0.2, CIRCLE.r - 0.25, CIRCLE.r - 0.25, 28, hex('#5f7f3c'));
  buildStatue(S, CIRCLE.c, circleY + 0.2, axAng + Math.PI);
  for (const side of [-1, 1]) {
    const pt = axisAt(axLen - CIRCLE.r - 0.5, side * 3.6);
    lampAt(pt[0], groundY(pt[0], pt[1]) + 4.2, pt[1]);
  }

  // bình phong long mã and stele
  const scrPt = axisAt(11), scrY = groundY(scrPt[0], scrPt[1]), ang = GATE.a;
  S.kind = KIND.MASONRY;
  S.box(scrPt[0], scrPt[1], scrY - 0.3, scrY + 0.45, 5.6, 1.3, ang, PAL.stone, { topKind: KIND.ROAD });
  S.box(scrPt[0], scrPt[1], scrY + 0.45, scrY + 2.7, 4.6, 0.6, ang, RED_D);
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    const postPt = localAt(scrPt, ang, side * 2.45, 0);
    S.box(postPt[0], postPt[1], scrY + 0.45, scrY + 3.0, 0.5, 0.75, ang, CREAM);
    S.cyl(postPt[0], postPt[1], scrY + 3.0, scrY + 3.45, 0.22, 0.06, 6, CREAM);
    const panelPt = localAt(scrPt, ang, 0, side * 0.31);
    S.box(panelPt[0], panelPt[1], scrY + 0.85, scrY + 2.3, 3.0, 0.04, ang, hex('#4e7a63'));
    S.box(panelPt[0], panelPt[1], scrY + 2.3, scrY + 2.42, 3.4, 0.05, ang, CREAM);
  }
  S.box(scrPt[0], scrPt[1], scrY + 2.7, scrY + 2.85, 4.9, 0.8, ang, CREAM);
  S.hip(scrPt[0], scrPt[1], 4.6, 0.6, ang, scrY + 2.85, 0.45, YELLOW, { over: 0.2, glazed: true });
  const stelePt = localAt(scrPt, ang, 0, -2.2);
  S.kind = KIND.MASONRY;
  S.box(stelePt[0], stelePt[1], scrY - 0.2, scrY + 0.5, 1.6, 0.9, ang, PAL.stone);
  S.box(stelePt[0], stelePt[1], scrY + 0.5, scrY + 2.2, 0.95, 0.25, ang, hex('#59564f'));
  S.kind = KIND.PLAIN;
}

function plantCampusTreesAndClearInfill(data, axisAt, axLen) {
  const flamboyants = [];
  for (let dist = 22; dist < axLen - CIRCLE.r - 6; dist += 13) for (const side of [-1, 1]) flamboyants.push(axisAt(dist, side * 7.5));
  for (let k = 0; k < 8; k++) {
    const ang = ((k + 0.5) / 8) * Math.PI * 2;
    flamboyants.push([CIRCLE.c[0] + Math.cos(ang) * (CIRCLE.r + 8), CIRCLE.c[1] + Math.sin(ang) * (CIRCLE.r + 8)]);
  }
  flamboyants.push([-585, 1020], [-548, 1012], [-600, 990], [-520, 990], [-505, 1040], [-470, 1070], [-560, 1070], [-600, 1070], [-640, 1000]);

  if (Array.isArray(data.trees)) {
    let idx = 0;
    for (const [x, z] of flamboyants) {
      if (!inRing(x, z, CAMPUS_RING)) continue;
      data.trees.push(Math.round(x * 10), Math.round(z * 10), 9 + (idx++ % 4), 2);
    }
    const hash2 = (a, b) => { const val = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return val - Math.floor(val); };
    for (let i = -16; i <= 16; i++) {
      for (let j = -16; j <= 16; j++) {
        const x = -540 + i * 12 + (hash2(i, j) - 0.5) * 7, z = 1035 + j * 12 + (hash2(j, i) - 0.5) * 7;
        if (!inRing(x, z, CAMPUS_RING) || !isOpenGround(x, z, axisAt, axLen)) continue;
        data.trees.push(Math.round(x * 10), Math.round(z * 10), 9 + Math.floor(hash2(i + 3, j) * 5), hash2(i, j + 5) < 0.3 ? 2 : hash2(i, j + 9) < 0.5 ? 1 : 0);
      }
    }
  }

  if (Array.isArray(data.infill)) {
    const infill = data.infill, stride = 8, kept = [];
    const nearCount = data.meta?.counts?.infillNear ?? infill.length / stride;
    let nearKept = 0;
    for (let i = 0; i < infill.length / stride; i++) {
      if (inRing(infill[i * stride] / 10, infill[i * stride + 1] / 10, CAMPUS_RING)) continue;
      if (i < nearCount) nearKept++;
      for (let j = 0; j < stride; j++) kept.push(infill[i * stride + j]);
    }
    if (kept.length !== infill.length) {
      infill.length = 0;
      for (const val of kept) infill.push(val);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }
}

export function build({ data, S, group }) {
  const lampPos = [], lampCol = [];
  const lampAt = (x, y, z, col = [1, 0.85, 0.58]) => { lampPos.push(x, y, z); lampCol.push(col[0], col[1], col[2]); };

  buildCampusBlocks(S);
  buildSportsGround(S);
  buildPavilion(S);

  const roads = roadsNear(data, [-540, 1035], 260);
  fence(S, CAMPUS_RING, FENCE.quochoc, { roads, openings: [[GATE.c[0], GATE.c[1], 4.75]] });
  buildGate(S, lampAt);

  const inward = [Math.sin(GATE.a), -Math.cos(GATE.a)];
  const axisAt = (along, side = 0): [number, number] => [GATE.c[0] + inward[0] * along - inward[1] * side, GATE.c[1] + inward[1] * along + inward[0] * side];
  const axLen = Math.hypot(CIRCLE.c[0] - GATE.c[0], CIRCLE.c[1] - GATE.c[1]);
  const axAng = Math.atan2(inward[1], inward[0]);

  buildYardAndScreen(S, axisAt, axLen, axAng, lampAt);
  plantCampusTreesAndClearInfill(data, axisAt, axLen);

  for (let dist = 18; dist < axLen - CIRCLE.r - 4; dist += 18) {
    for (const side of [-1, 1]) { const pt = axisAt(dist, side * 4.2); lampAt(pt[0], groundY(pt[0], pt[1]) + 3.6, pt[1]); }
  }
  S.kind = KIND.PLAIN;
  for (let i = 0; i < lampPos.length; i += 3) {
    const x = lampPos[i], z = lampPos[i + 2], y = groundY(x, z);
    if (lampPos[i + 1] - y > 3 && lampPos[i + 1] - y < 4.5) S.cyl(x, z, y, lampPos[i + 1] - 0.2, 0.07, 0.05, 5, IRON);
  }
  const pts = glowPoints(lampPos, lampCol, 4);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
  S.kind = KIND.PLAIN;
  S.base = 0;
}

// ---------------- architectural helpers ----------------

function buildGallery(S, partCenter, ang, width, depth, isLongU, side, galDepth, y0, storeyH, floors, ceilY, wallCol) {
  const spanL = isLongU ? width : depth, spanD = isLongU ? depth : width;
  const frameAng = isLongU ? ang : ang + Math.PI / 2;
  const dirSign = isLongU ? side : -side;
  const ptAt = (u, v): [number, number] => localAt(partCenter, frameAng, u, v);
  const edgeV = dirSign * (spanD / 2 - 0.3), midV = dirSign * (spanD / 2 - galDepth / 2);
  const bays = Math.max(3, Math.round((spanL - 0.6) / 3.4)), bayW = (spanL - 0.6) / bays;

  S.kind = KIND.PLAIN;
  for (let k = 0; k <= bays; k++) {
    const pt = ptAt(-spanL / 2 + 0.3 + k * bayW, edgeV);
    S.box(pt[0], pt[1], y0, ceilY, 0.55, 0.55, frameAng, wallCol);
    S.box(pt[0], pt[1], y0, y0 + 0.35, 0.7, 0.7, frameAng, CREAM);
  }
  for (let fl = 1; fl < floors; fl++) {
    const floorY = y0 + storeyH * fl, slabPt = ptAt(0, midV);
    S.box(slabPt[0], slabPt[1], floorY - 0.3, floorY, spanL, galDepth, frameAng, CREAM, { bottom: true });
    const railPt = ptAt(0, dirSign * (spanD / 2 - 0.12));
    S.box(railPt[0], railPt[1], floorY, floorY + 0.9, spanL - 0.2, 0.16, frameAng, CREAM);
    S.box(railPt[0], railPt[1], floorY + 0.9, floorY + 1.0, spanL - 0.1, 0.26, frameAng, shade(CREAM, 0.92));
  }
  const faceV = dirSign * (spanD / 2), archSegs = 6;
  for (let fl = 0; fl < floors; fl++) {
    const topY = fl + 1 < floors ? y0 + storeyH * (fl + 1) - 0.3 : ceilY;
    const springY = topY - Math.min(1.25, storeyH * 0.32), archRise = Math.min(0.75, bayW * 0.22);
    for (let k = 0; k < bays; k++) {
      const u0 = -spanL / 2 + 0.3 + k * bayW + 0.275, u1 = u0 + bayW - 0.55;
      for (let j = 0; j < archSegs; j++) {
        const t0 = j / archSegs, t1 = (j + 1) / archSegs;
        const ya = springY + archRise * Math.sin(Math.PI * t0), yb = springY + archRise * Math.sin(Math.PI * t1);
        const ua = u0 + (u1 - u0) * t0, ub = u0 + (u1 - u0) * t1;
        for (const off of [0, -dirSign * 0.35]) {
          const pa = ptAt(ua, faceV + off), pb = ptAt(ub, faceV + off);
          const nrm = off === 0 ? [-Math.sin(frameAng) * dirSign, 0, Math.cos(frameAng) * dirSign] : [Math.sin(frameAng) * dirSign, 0, -Math.cos(frameAng) * dirSign];
          S.quad([pa[0], ya, pa[1]], [pb[0], yb, pb[1]], [pb[0], topY, pb[1]], [pa[0], topY, pa[1]], wallCol, nrm);
        }
      }
      const soffitPt = ptAt((u0 + u1) / 2, faceV - dirSign * 0.175);
      S.box(soffitPt[0], soffitPt[1], springY - 0.05, springY + 0.02, u1 - u0, 0.35, frameAng, shade(CREAM, 0.9));
    }
  }
}

function buildGate(S, lampAt) {
  const center = GATE.c, ang = GATE.a;
  const ptAt = (u, v = 0): [number, number] => localAt(center, ang, u, v);
  const y = groundY(center[0], center[1]);
  S.base = y - LAND_Y;
  const gateW = 9.1, gateD = 2.2;
  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], y - 0.4, y + 0.15, gateW + 1.0, gateD + 1.4, ang, PAL.stone, { topKind: KIND.ROAD });
  const y1 = y + 0.15, yFloor = y1 + 2.4;

  const colUs = [-4.175, -2.425, 2.425, 4.175];
  S.kind = KIND.PLAIN;
  for (const u of colUs) {
    for (const v of [-0.764, 0.764]) {
      const pt = ptAt(u, v);
      S.box(pt[0], pt[1], y1, yFloor, 0.55, 0.672, ang, RED);
      S.box(pt[0], pt[1], y1, y1 + 0.45, 0.68, 0.8, ang, CREAM);
    }
  }
  S.box(center[0], center[1], yFloor, yFloor + 0.3, gateW + 0.3, gateD + 0.3, ang, CREAM, { bottom: true });
  for (const v of [-0.764, 0.764]) { const pt = ptAt(0, v); S.box(pt[0], pt[1], yFloor - 0.35, yFloor, gateW, 0.5, ang, RED_D); }

  leaves(S, ptAt(-2.15), ptAt(2.15), y1, 2.0, IRON);
  for (const side of [-1, 1]) leaves(S, ptAt(side * 2.7), ptAt(side * 3.9), y1, 1.9, IRON);

  const yBalc = yFloor + 0.3;
  for (const [u, v, len, railAng] of ([[0, gateD / 2 + 0.05, gateW + 0.2, ang], [0, -gateD / 2 - 0.05, gateW + 0.2, ang], [gateW / 2 + 0.05, 0, gateD + 0.2, ang + Math.PI / 2], [-gateW / 2 - 0.05, 0, gateD + 0.2, ang + Math.PI / 2]] as [number, number, number, number][])) {
    const pt = ptAt(u, v);
    S.box(pt[0], pt[1], yBalc, yBalc + 0.75, len, 0.16, railAng, RED);
    S.box(pt[0], pt[1], yBalc + 0.75, yBalc + 0.85, len + 0.1, 0.24, railAng, CREAM);
    if (len > 5) for (let k = -3; k <= 3; k++) { const panPt = ptAt(u + k * 1.15, v + Math.sign(v) * 0.09); S.box(panPt[0], panPt[1], yBalc + 0.2, yBalc + 0.6, 0.55, 0.02, ang, CREAM); }
  }
  const yRoof = yBalc + 1.5;
  for (const u of [-2.425, 2.425]) for (const v of [-0.764, 0.764]) { const pt = ptAt(u, v); S.box(pt[0], pt[1], yBalc, yRoof, 0.4, 0.45, ang, RED); }
  for (const side of [-1, 1]) {
    const framePt = ptAt(0, side * 0.82); S.box(framePt[0], framePt[1], yRoof - 0.85, yRoof - 0.05, 2.9, 0.06, ang, GOLD);
    const boardPt = ptAt(0, side * 0.86); S.box(boardPt[0], boardPt[1], yRoof - 0.8, yRoof - 0.1, 2.7, 0.04, ang, BOARD);
  }
  S.box(center[0], center[1], yRoof - 0.15, yRoof, 5.4, 1.9, ang, RED_D);
  S.cyl(center[0], center[1], yBalc + 0.35, yBalc + 1.2, 0.3, 0.38, 8, BRONZE);

  for (const side of [-1, 1]) { const pt = ptAt(side * 3.4); S.hip(pt[0], pt[1], 2.0, gateD, ang, yBalc + 0.85, 0.35, YELLOW, { over: 0.25, glazed: true }); }
  S.hip(center[0], center[1], 5.6, gateD, ang, yRoof, 0.85, YELLOW, { over: 0.55, flare: 0.25, glazed: true, ridgeCol: YELLOW });
  S.kind = KIND.PLAIN;
  S.box(center[0], center[1], yRoof + 0.6, yRoof + 1.25, 4.0, 1.3, ang, RED);
  S.hip(center[0], center[1], 4.0, 1.3, ang, yRoof + 1.25, 0.95, YELLOW, { over: 0.5, flare: 0.3, glazed: true, ridgeCol: YELLOW });

  const ridgeY = yRoof + 2.2;
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], ridgeY - 0.05, ridgeY + 0.12, 0.22, 0.22, 8, YELLOW);
  const discPt = ptAt(0);
  S.box(discPt[0], discPt[1], ridgeY + 0.1, ridgeY + 0.95, 0.65, 0.08, ang, YELLOW, { taper: 0.6 });
  for (const side of [-1, 1]) { const endPt = ptAt(side * 1.6); S.box(endPt[0], endPt[1], ridgeY - 0.1, ridgeY + 0.4, 0.5, 0.12, ang, YELLOW, { taper: 0.5 }); }
  for (const u of [-4.175, 4.175]) { const pt = ptAt(u, -1.3); lampAt(pt[0], yFloor + 0.1, pt[1], [1, 0.84, 0.55]); }
  for (const side of [-1, 1]) { const pt = ptAt(0, side * 1.0); lampAt(pt[0], yRoof - 0.3, pt[1], [1, 0.9, 0.7]); }
  S.base = 0;
}

function buildStatue(S, center, y, ang) {
  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], y - 0.2, y + 0.45, 4.2, 4.2, ang, PAL.stone, { topKind: KIND.ROAD });
  S.box(center[0], center[1], y + 0.45, y + 0.9, 3.2, 3.2, ang, PAL.stone, { topKind: KIND.ROAD });
  S.box(center[0], center[1], y + 0.9, y + 2.9, 2.0, 2.0, ang, shade(PAL.stone, 0.9));
  S.box(center[0], center[1], y + 2.9, y + 3.15, 2.3, 2.3, ang, PAL.stone);
  S.kind = KIND.PLAIN;
  const footY = y + 3.15;
  for (const side of [-1, 1]) { const legPt = localAt(center, ang, side * 0.17, 0); S.cyl(legPt[0], legPt[1], footY, footY + 1.45, 0.14, 0.17, 6, BRONZE); }
  S.cyl(center[0], center[1], footY + 1.35, footY + 2.3, 0.3, 0.27, 8, BRONZE);
  for (const side of [-1, 1]) { const armPt = localAt(center, ang, side * 0.38, 0); S.cyl(armPt[0], armPt[1], footY + 1.5, footY + 2.25, 0.07, 0.09, 5, BRONZE); }
  S.cyl(center[0], center[1], footY + 2.3, footY + 2.42, 0.09, 0.09, 6, BRONZE);
  S.cyl(center[0], center[1], footY + 2.42, footY + 2.75, 0.14, 0.12, 8, BRONZE);
  S.cyl(center[0], center[1], footY + 2.75, footY + 2.86, 0.12, 0.03, 8, BRONZE);
}

function buildRoof(S, partCenter, ang, width, depth, eaveY, roofH, gableEnds) {
  const over = 0.9, opts = { over, fascia: 0.22, fasciaCol: CREAM, ridgeCol: RIDGE };
  if (!gableEnds[0] && !gableEnds[1]) { S.hip(partCenter[0], partCenter[1], width, depth, ang, eaveY, roofH, ROOF, opts); return; }
  const ext = (depth / 2 + over) * 0.92 + 0.3, gableOver = 0.3;
  const ua = -width / 2 - (gableEnds[0] ? ext : 0), ub = width / 2 + (gableEnds[1] ? ext : 0), midU = (ua + ub) / 2;
  const roofCenter = [partCenter[0] + midU * Math.cos(ang), partCenter[1] + midU * Math.sin(ang)];
  const clip = { u0: gableEnds[0] ? -width / 2 - gableOver - midU : -1e9, u1: gableEnds[1] ? width / 2 + gableOver - midU : 1e9, v0: -1e9, v1: 1e9 };
  S.hip(roofCenter[0], roofCenter[1], ub - ua, depth, ang, eaveY, roofH, ROOF, { ...opts, clip });
}

function buildPediment(S, endPt, ang, dirSign, depth, eaveY, roofH, over, wallCol) {
  const nrm = [dirSign * Math.cos(ang), dirSign * Math.sin(ang)], across = [-Math.sin(ang), Math.cos(ang)];
  const pt3 = (v, y, off): [number, number, number] => [endPt[0] + across[0] * v + nrm[0] * off, y, endPt[1] + across[1] * v + nrm[1] * off];
  const hint = [nrm[0], 0, nrm[1]];
  const halfSpan = depth / 2 + over, slope = roofH / halfSpan, roofYAt = (v) => eaveY + roofH - Math.abs(v) * slope;
  const keepKind = S.kind;
  S.kind = KIND.PLAIN;
  const wallTopY = roofYAt(depth / 2) - 0.08, apexY = eaveY + roofH - 0.08;
  S.quad(pt3(-depth / 2, eaveY - 0.45, 0), pt3(depth / 2, eaveY - 0.45, 0), pt3(depth / 2, wallTopY, 0), pt3(-depth / 2, wallTopY, 0), wallCol, hint);
  S.tri(pt3(-depth / 2, wallTopY, 0), pt3(depth / 2, wallTopY, 0), pt3(0, apexY, 0), wallCol, hint);
  const footPt = pt3(0, 0, 0.12);
  S.box(footPt[0], footPt[2], eaveY - 0.05, eaveY + 0.22, depth + 0.5, 0.45, ang + Math.PI / 2, CREAM);
  for (const side of [-1, 1]) S.beam(pt3(side * (halfSpan - 0.1), eaveY - 0.12, 0.16), pt3(0, eaveY + roofH - 0.12, 0.16), 0.34, 0.32, CREAM);

  const triBaseY = eaveY + 0.65, triHalf = (depth / 2) * 0.62, triTopY = triBaseY + triHalf * slope * 0.85;
  S.tri(pt3(-triHalf, triBaseY, 0.05), pt3(triHalf, triBaseY, 0.05), pt3(0, triTopY, 0.05), CREAM, hint);
  const band = 0.26, innerBaseY = triBaseY + band * 0.8, innerHalf = triHalf - band * 2.2;
  const innerTopY = innerBaseY + (innerHalf * (triTopY - triBaseY)) / triHalf;
  if (innerHalf > 0.5) S.tri(pt3(-innerHalf, innerBaseY, 0.08), pt3(innerHalf, innerBaseY, 0.08), pt3(0, innerTopY, 0.08), wallCol, hint);
  const midY = (innerBaseY + innerTopY) / 2 - 0.1, lozR = Math.min(0.55, (innerTopY - innerBaseY) * 0.3);
  S.quad(pt3(0, midY - lozR, 0.1), pt3(lozR, midY, 0.1), pt3(0, midY + lozR, 0.1), pt3(-lozR, midY, 0.1), CREAM, hint);
  S.kind = keepKind;
}

function buildFacade(S, center, ang, width, depth, y0, storeyH, floors, style, link) {
  const keepKind = S.kind;
  S.kind = KIND.PLAIN;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (const [nu, nv] of ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][])) {
    if (link && nu) continue;
    const faceLen = nu ? depth : width;
    if (faceLen < 2.4) continue;
    const nrm = [nu * ca - nv * sa, nu * sa + nv * ca], tan = [-nrm[1], nrm[0]];
    const faceCenter = [center[0] + nrm[0] * (nu ? width / 2 : depth / 2), center[1] + nrm[1] * (nu ? width / 2 : depth / 2)];
    const pt3 = (along, y, off): [number, number, number] => [faceCenter[0] + tan[0] * along + nrm[0] * off, y, faceCenter[1] + tan[1] * along + nrm[1] * off];
    const hint = [nrm[0], 0, nrm[1]];
    const drawRect = (s0, s1, ya, yb, off, col) => S.quad(pt3(s0, ya, off), pt3(s1, ya, off), pt3(s1, yb, off), pt3(s0, yb, off), col, hint);
    const drawArch = (along, halfW, botY, springY, off, col?) => {
      drawRect(along - halfW, along + halfW, botY, springY, off, col);
      for (let j = 0; j < 6; j++) {
        const a0 = (Math.PI * j) / 6, a1 = (Math.PI * (j + 1)) / 6;
        S.tri(pt3(along, springY, off), pt3(along + halfW * Math.cos(a0), springY + halfW * Math.sin(a0), off), pt3(along + halfW * Math.cos(a1), springY + halfW * Math.sin(a1), off), col, hint);
      }
    };
    const bays = Math.max(1, Math.round(faceLen / 3.6)), bayW = faceLen / bays;
    for (let fl = 0; fl < floors; fl++) {
      const baseY = y0 + fl * storeyH;
      for (let k = 0; k < bays; k++) {
        const along = -faceLen / 2 + (k + 0.5) * bayW;
        if (style === 'arch' && floors === 2 && fl === 0) {
          const halfW = Math.min(0.85, bayW * 0.27), springY = baseY + storeyH * 0.62;
          drawArch(along, halfW + 0.14, baseY + 0.02, springY, 0.06, CREAM);
          drawArch(along, halfW, baseY + 0.02, springY, 0.1, DARK);
        } else if (style === 'arch') {
          const halfW = Math.min(0.7, bayW * 0.22), botY = baseY + storeyH * 0.24, springY = baseY + storeyH * 0.66;
          drawArch(along, halfW + 0.14, botY, springY, 0.06, CREAM);
          drawArch(along, halfW, botY, springY, 0.1, SHUT);
          drawRect(along - halfW - 0.25, along + halfW + 0.25, botY - 0.18, botY, 0.12, CREAM);
        } else {
          const halfW = Math.min(0.65, bayW * 0.2), botY = baseY + storeyH * 0.3, topY = baseY + storeyH * 0.78;
          drawRect(along - halfW - 0.12, along + halfW + 0.12, botY - 0.12, topY + 0.12, 0.06, CREAM);
          drawRect(along - halfW, along + halfW, botY, topY, 0.1, GLASS);
        }
      }
      if (style === 'arch') {
        for (let k = 1; k < bays; k++) {
          const along = -faceLen / 2 + k * bayW;
          drawRect(along - 0.24, along + 0.24, baseY + storeyH - 0.62, baseY + storeyH - 0.3, 0.08, CREAM);
        }
      }
    }
  }
  S.kind = keepKind;
}

function buildGrandstand(S) {
  const center = [-480.7, 1099.0], ang = 2.415, [standL, standD] = DIMS[695775623];
  let baseY = -Infinity;
  for (const [u, v] of ([[-standL / 2, -standD / 2], [standL / 2, -standD / 2], [standL / 2, standD / 2], [-standL / 2, standD / 2]] as [number, number][])) {
    const pt = localAt(center, ang, u, v);
    baseY = Math.max(baseY, groundY(pt[0], pt[1]));
  }
  const conc = hex('#a7a49b'), tiers = 6, tierD = (standD - 0.4) / tiers;
  S.kind = KIND.MASONRY;
  for (let i = 0; i < tiers; i++) {
    const v0 = -standD / 2 + i * tierD, pt = localAt(center, ang, 0, (v0 + standD / 2 - 0.4) / 2);
    S.box(pt[0], pt[1], baseY - 0.4, baseY + 0.45 + i * 0.48, standL, standD / 2 - 0.4 - v0, ang, shade(conc, 1 - (i % 2) * 0.06), { topKind: KIND.ROAD });
  }
  const backPt = localAt(center, ang, 0, standD / 2 - 0.2);
  S.box(backPt[0], backPt[1], baseY - 0.4, baseY + 0.45 + tiers * 0.48 + 1.0, standL, 0.4, ang, shade(conc, 0.9));
  for (const side of [-1, 1]) {
    const endPt = localAt(center, ang, side * (standL / 2 - 0.15), 0.4);
    S.box(endPt[0], endPt[1], baseY - 0.4, baseY + 0.45 + tiers * 0.48 + 0.5, 0.3, standD - 0.8, ang, shade(conc, 0.9));
  }
  S.kind = KIND.PLAIN;
  S.box(backPt[0], backPt[1], baseY + 0.45 + tiers * 0.48 + 1.0, baseY + 0.45 + tiers * 0.48 + 1.06, standL, 0.08, ang, IRON);
}

function buildPavilion(S) {
  const center = [-602.0, 1077.0], ang = 0.833, size = 6.5;
  let floorRise = -Infinity;
  for (const [u, v] of ([[-size / 2, -size / 2], [size / 2, -size / 2], [size / 2, size / 2], [-size / 2, size / 2]] as [number, number][])) {
    const pt = localAt(center, ang, u, v);
    floorRise = Math.max(floorRise, rise(pt[0], pt[1]));
  }
  const y0 = LAND_Y + floorRise, storeyH = 3.6, topY = y0 + 0.4 + storeyH * 2;
  S.base = floorRise;
  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], y0 - 0.5, y0 + 0.4, size + 0.2, size + 0.2, ang, shade(CREAM, 0.86), { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  S.box(center[0], center[1], y0 + 0.4, topY, size, size, ang, RED, { top: hex('#b49a76') });
  buildFacade(S, center, ang, size, size, y0 + 0.4, storeyH, 2, 'arch', false);
  S.box(center[0], center[1], y0 + 0.4 + storeyH - 0.15, y0 + 0.4 + storeyH + 0.35, size + 0.14, size + 0.14, ang, CREAM);
  S.box(center[0], center[1], y0 + 0.4 + storeyH - 0.02, y0 + 0.4 + storeyH + 0.22, size + 0.18, size + 0.18, ang, hex('#c99a4a'));
  S.box(center[0], center[1], topY - 0.3, topY + 0.1, size + 0.4, size + 0.4, ang, CREAM);

  for (const [u, v, len, wallAng] of ([[0, size / 2, size, ang], [0, -size / 2, size, ang], [size / 2, 0, size, ang + Math.PI / 2], [-size / 2, 0, size, ang + Math.PI / 2]] as [number, number, number, number][])) {
    const pt = localAt(center, ang, u, v);
    S.box(pt[0], pt[1], topY + 0.1, topY + 0.8, len, 0.2, wallAng, RED);
    S.box(pt[0], pt[1], topY + 0.8, topY + 0.9, len + 0.1, 0.28, wallAng, CREAM);
    S.box(pt[0], pt[1], topY + 0.9, topY + 1.4, 1.4, 0.22, wallAng, CREAM, { taper: 0.6 });
  }
  for (const [su, sv] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][])) {
    const pt = localAt(center, ang, (su * size) / 2, (sv * size) / 2);
    S.box(pt[0], pt[1], topY + 0.1, topY + 1.15, 0.45, 0.45, ang, RED);
    S.box(pt[0], pt[1], topY + 1.15, topY + 1.3, 0.55, 0.55, ang, CREAM);
    S.cyl(pt[0], pt[1], topY + 1.3, topY + 1.7, 0.16, 0.05, 6, CREAM);
  }
  S.base = 0;
}

function drapeStrip(S, ptA, ptB, width, col, lift = 0.07) {
  const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]), segs = Math.max(1, Math.ceil(len / 2));
  const tan = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len], nrm = [-tan[1], tan[0]];
  const pt3 = (along, across) => { const x = ptA[0] + tan[0] * along + nrm[0] * across, z = ptA[1] + tan[1] * along + nrm[1] * across; return [x, groundY(x, z) + lift, z]; };
  const keepKind = S.kind;
  S.kind = KIND.ROAD;
  const cols = 3;
  for (let i = 0; i < segs; i++) {
    const s0 = (len * i) / segs, s1 = (len * (i + 1)) / segs;
    for (let j = 0; j < cols; j++) {
      const o0 = -width / 2 + (width * j) / cols, o1 = -width / 2 + (width * (j + 1)) / cols;
      S.quad(pt3(s0, o0), pt3(s1, o0), pt3(s1, o1), pt3(s0, o1), col, [0, 1, 0]);
    }
  }
  S.kind = KIND.PLAIN;
  for (const edgeOff of [-width / 2, width / 2]) {
    for (let i = 0; i < segs; i++) {
      const p0 = pt3((len * i) / segs, edgeOff), p1 = pt3((len * (i + 1)) / segs, edgeOff);
      S.quad([p0[0], p0[1] - 0.3, p0[2]], [p1[0], p1[1] - 0.3, p1[2]], p1, p0, shade(col, 0.82), [nrm[0] * Math.sign(edgeOff), 0, nrm[1] * Math.sign(edgeOff)]);
    }
  }
  S.kind = keepKind;
}

function buildCourt(S, center, ang, slab, surf, lines, slabCol, surfCol?) {
  const toPt = (u, v): [number, number] => localAt(center, ang, u, v);
  let baseY = -Infinity;
  for (const [su, sv] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][])) {
    const pt = toPt((su * slab[0]) / 2, (sv * slab[1]) / 2);
    baseY = Math.max(baseY, groundY(pt[0], pt[1]));
  }
  S.kind = KIND.PLAIN;
  S.box(center[0], center[1], baseY - 0.5, baseY + 0.08, slab[0], slab[1], ang, slabCol, { topKind: KIND.ROAD });
  if (surf) S.box(center[0], center[1], baseY - 0.5, baseY + 0.1, surf[0], surf[1], ang, surfCol);
  for (const [u, v, len, wd] of lines) { const pt = toPt(u, v); S.box(pt[0], pt[1], baseY - 0.1, baseY + 0.115, len, wd, ang, hex('#eef0ea')); }
  return { y: baseY, toPt };
}

function isOpenGround(x, z, axisAt, axLen) {
  const inRect = (center, ang, u0, u1, v0, v1, pad) => {
    const dx = x - center[0], dz = z - center[1];
    const u = dx * Math.cos(ang) + dz * Math.sin(ang), v = -dx * Math.sin(ang) + dz * Math.cos(ang);
    return u > u0 - pad && u < u1 + pad && v > v0 - pad && v < v1 + pad;
  };
  for (const [osm, , , cx, cz, ang, parts0] of BLD as any[]) {
    const dims = DIMS[osm];
    for (const [u0, u1, v0, v1] of parts0 || [[-dims[0] / 2, dims[0] / 2, -dims[1] / 2, dims[1] / 2]]) {
      if (inRect([cx, cz], ang, u0, u1, v0, v1, 4.5)) return false;
    }
  }
  if (inRect([-518.3, 1055.9], -0.703, -30.9, 30.9, -11.5, 11.5, 4)) return false;
  if (inRect([-459.4, 1127.4], -0.71, -52, 52, -31, 21, 2)) return false;
  if (inRect([-480.8, 1007.6], 0.84, -14, 14, -9, 9, 3)) return false;
  if (inRect([-418.1, 1092.3], 0.86, -18, 18, -9, 9, 2)) return false;
  if (inRect([-499.4, 1164.5], 0.86, -16, 16, -9, 9, 2)) return false;
  if (inRect([-480.7, 1099.0], 2.415, -22.3, 22.3, -2.75, 2.75, 3)) return false;
  if (inRect([-602.0, 1077.0], 0.833, -3.25, 3.25, -3.25, 3.25, 4)) return false;
  if (Math.hypot(x - CIRCLE.c[0], z - CIRCLE.c[1]) < CIRCLE.r + 9) return false;
  if (Math.hypot(x - GATE.c[0], z - GATE.c[1]) < 16) return false;
  const ptA = axisAt(0), ptB = axisAt(axLen), len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  const along = ((x - ptA[0]) * (ptB[0] - ptA[0]) + (z - ptA[1]) * (ptB[1] - ptA[1])) / len;
  const across = Math.abs((x - ptA[0]) * (ptB[1] - ptA[1]) - (z - ptA[1]) * (ptB[0] - ptA[0])) / len;
  if (along > -2 && along < len && across < 6) return false;
  for (let i = 0; i < CAMPUS_RING.length; i++) {
    const p0 = CAMPUS_RING[i], p1 = CAMPUS_RING[(i + 1) % CAMPUS_RING.length];
    const dx = p1[0] - p0[0], dz = p1[1] - p0[1], lenSq = dx * dx + dz * dz;
    const frac = Math.max(0, Math.min(1, ((x - p0[0]) * dx + (z - p0[1]) * dz) / lenSq));
    if (Math.hypot(x - p0[0] - dx * frac, z - p0[1] - dz * frac) < 3.5) return false;
  }
  return true;
}
