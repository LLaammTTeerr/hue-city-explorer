import { KIND, hex, shade, obb } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { OUTER } from '../hoangthanh.ts';

// Cửa Chương Đức (彰德門), the west gate of the Imperial City (Hoàng thành), the gate of the palace women.
// Built 1804 under Gia Long as a plain three-passage gate (tam quan) with no tower; rebuilt in 1921 under Khải Định
// in brick and concrete, three storeys, every pier cut into panels of glass-and-porcelain mosaic (khảm sành sứ),
// roofed in yellow glazed tiles (hoàng lưu ly) whose round tile ends carry 壽 and the lower ends bats; badly damaged
// by war after 1945 and restored to its 1921 form in 2003–2004. Sources and estimates: docs/places/chuongduc.md.
//   - footprint: OSM way 531016858, 12.7 × 5.4 m, long side on the line of the Imperial City wall (hard-coded below);
//     it takes in the gate block (about 10.8 m) and a lower flanking pier at each end (Street View, car pano)
//   - one lower block of even height with three arched passages of nearly one size, crowns level, and a tall
//     panelled frieze between the arch crowns and the cornice (Street View)
//   - a deep tiled roof tier over the whole block, level along the eaves with only the corners turned up, and a small
//     upper storey under a plain hipped top roof rising through its middle: three storeys, about 9.4 m to the finial
//   - four pilasters on each face, between and outside the bays, panelled in mosaic that reads pale and grey from the
//     road; the render weathered grey-cream; colour only in the red doors and soft ochre arch surrounds
//   - a stone balustrade along the forecourt's edge on the moat side
// The Imperial City's wall (places/dainoi.js) stops at this footprint; this file adds the short brick stubs that
// butt the wall against the gate's flanks, and the paved way through the passages.
export const id = 'chuongduc';

// OSM way 531016858, metres in the model frame (scripts/frame.json)
const FOOTPRINT_RING = [[-1406.29, 170.68], [-1404.67, 169.47], [-1401.99, 167.45], [-1394.33, 177.62], [-1396.38, 179.22], [-1398.52, 180.79]];

const BLOCK_HALF_W = 5.4; // half the block
const SIDE_ARCH_U = 3.1; // side arches' centres
const TERRACE_W = 20.4; // the terrace's length along the wall
const TERRACE_V0 = 0.85; // the terrace starts clear of the wall body (its centre line wanders a few decimetres off this outline)

const COLORS = {
  wall: hex('#d4cebe'), // cream-grey porcelain-clad render
  ring: hex('#d6b25e'), // warm golden-ochre arch surrounds
  trim: hex('#e8e2d2'), // crisp porcelain mouldings and cornices
  pier: hex('#cbc3ae'),
  relief: hex('#3c789c'), // cobalt-blue porcelain mosaic frieze panels
  roof: hex('#c28e3c'), // warm weathered hoàng lưu ly yellow glaze
  tileEnd: hex('#b89a56'),
  stain: hex('#a9a28f'),
  ridge: hex('#dfc474'),
  // polychrome glass and porcelain mosaic (khảm sành sứ): cobalt, jade, vermilion, porcelain white
  mosaic: [hex('#3476a8'), hex('#3e8f6e'), hex('#c24c38'), hex('#eae4d6')],
  door: hex('#80301f'),
  plaque: hex('#5a4a3c'),
  gold: hex('#b99a58'),
  pave: hex('#bdb5a4'),
  stone: shade(PAL.stone, 0.92),
};

function buildTerraceAndPlinth(S, frame, dims) {
  const { box } = frame;
  const { len, dep, groundY, terraceY, floorY, balV } = dims;
  S.kind = KIND.ROAD;
  box(0, -(dep + 7) / 4 - dep / 4, groundY - 0.3, groundY + 0.04, len + 0.6, (dep + 7) / 2 - dep / 2, COLORS.pave, { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  box(0, (balV + 0.2 + TERRACE_V0) / 2, groundY - 0.3, terraceY, TERRACE_W, balV + 0.2 - TERRACE_V0, shade(COLORS.stone, 0.9), { top: COLORS.pave, topKind: KIND.ROAD });
  for (const side of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const stepTop = terraceY - ((k + 1) * (terraceY - groundY)) / 5;
      box(side * (TERRACE_W / 2 + 0.17 + k * 0.34), balV - 1.5, groundY - 0.3, stepTop + 0.01, 0.34, 2.6, COLORS.stone, { topKind: KIND.ROAD });
    }
  }
  box(0, 0, groundY - 0.3, floorY, 2 * BLOCK_HALF_W + 0.5, dep + 0.5, COLORS.stone, { topKind: KIND.ROAD });
  for (let k = 0; k < 5; k++) {
    const stepTop = floorY - ((k + 1) * (floorY - groundY)) / 6;
    box(0, -(dep / 2 + 0.25 + 0.17 + k * 0.34), groundY - 0.3, stepTop, 2 * BLOCK_HALF_W - 0.4, 0.34, COLORS.stone, { topKind: KIND.ROAD });
  }
}

function buildLowerBlockAndArches(S, frame, dims, arches) {
  const { pt3, box } = frame;
  const { dep, floorY, blockTopY } = dims;
  S.kind = KIND.PLAIN; // smooth lime render, not bare brick
  const pierEdges = [-BLOCK_HALF_W];
  for (const arch of arches) pierEdges.push(arch.uc - arch.aw / 2, arch.uc + arch.aw / 2);
  pierEdges.push(BLOCK_HALF_W);
  for (let k = 0; k < pierEdges.length; k += 2) {
    box((pierEdges[k] + pierEdges[k + 1]) / 2, 0, floorY, blockTopY, pierEdges[k + 1] - pierEdges[k], dep, COLORS.wall, { top: COLORS.trim });
  }
  arches.forEach(({ uc, aw, ys }, i) => {
    const radius = aw / 2;
    const archSegs = 8;
    S.kind = KIND.PLAIN;
    for (let k = 0; k < archSegs; k++) {
      const x = -radius + (aw * (k + 0.5)) / archSegs;
      box(uc + x, 0, ys + Math.sqrt(Math.max(0, radius * radius - x * x)), blockTopY, aw / archSegs + 0.01, dep, COLORS.wall, { top: COLORS.trim });
    }
    box(uc, 0, floorY - 0.2, floorY + 0.02, aw, dep + 0.4, shade(COLORS.pave, 0.9));
    if (i === 1) {
      // the middle passage stands open, its leaves folded back against the jambs
      for (const side of [-1, 1]) box(uc + side * (radius - 0.06), -0.6, floorY, ys + radius * 0.55, 0.1, aw * 0.5, COLORS.door);
    } else {
      // the side passages are shut: red leaves a little inside each face, filling the arch
      for (const faceSign of [-1, 1]) {
        const v = faceSign * (dep / 2 - 0.35);
        box(uc, v, floorY, ys, aw, 0.1, COLORS.door);
        for (let k = 0; k < 6; k++) {
          const x = -radius + (aw * (k + 0.5)) / 6;
          box(uc + x, v, ys, ys + Math.sqrt(Math.max(0, radius * radius - x * x)) - 0.02, aw / 6 + 0.01, 0.1, COLORS.door);
        }
      }
    }
    // on each face: a moulded arch surround in soft ochre and its jambs
    for (const faceSign of [-1, 1]) {
      const v = faceSign * (dep / 2 + 0.04);
      const ringSegs = 10;
      const ringR = radius + 0.12;
      for (let k = 0; k < ringSegs; k++) {
        const t0 = (Math.PI * k) / ringSegs;
        const t1 = (Math.PI * (k + 1)) / ringSegs;
        S.beam(pt3(uc + Math.cos(t0) * ringR, ys + Math.sin(t0) * ringR, v), pt3(uc + Math.cos(t1) * ringR, ys + Math.sin(t1) * ringR, v), 0.08, 0.2, COLORS.ring);
      }
      for (const side of [-1, 1]) box(uc + side * ringR, v, floorY, ys, 0.2, 0.08, COLORS.ring);
    }
  });
  // a damp-stained skirting along the foot of the block, both faces
  for (const faceSign of [-1, 1]) box(0, faceSign * (dep / 2 + 0.01), floorY, floorY + 0.5, 2 * BLOCK_HALF_W + 0.04, 0.06, COLORS.stain);
}

function buildFriezePilastersAndFlanks(S, frame, dims, arches) {
  const { toWorld, box } = frame;
  const { dep, groundY, terraceY, floorY, blockTopY, friezeY0, friezeY1, flankW, wallTopY } = dims;

  // ---- the frieze: a tall band of framed relief panels across the whole width, between moulded bands ----
  S.kind = KIND.PLAIN;
  box(0, 0, friezeY0 - 0.08, friezeY0, 2 * BLOCK_HALF_W + 0.1, dep + 0.1, COLORS.trim); // the moulding under the frieze
  box(0, 0, friezeY1, friezeY1 + 0.08, 2 * BLOCK_HALF_W + 0.14, dep + 0.14, COLORS.trim); // and over it
  box(0, 0, blockTopY - 0.26, blockTopY, 2 * BLOCK_HALF_W + 0.3, dep + 0.3, COLORS.trim); // the cornice, projecting
  box(0, 0, friezeY1 + 0.08, blockTopY - 0.26, 2 * BLOCK_HALF_W + 0.06, dep + 0.06, shade(COLORS.trim, 0.95));
  // panels: one over each arch, one over each pier, and one at each end; the middle one carries the name board
  const pierMidU = (arches[1].aw / 2 + SIDE_ARCH_U - arches[0].aw / 2) / 2;
  const panels = [[-SIDE_ARCH_U, 1.25], [0, 1.4], [SIDE_ARCH_U, 1.25], [-pierMidU, 0.62], [pierMidU, 0.62], [-(BLOCK_HALF_W - 0.3), 0.36], [BLOCK_HALF_W - 0.3, 0.36]];
  for (const faceSign of [-1, 1]) {
    const v = faceSign * (dep / 2 + 0.035);
    for (const [u, width] of panels) {
      box(u, v, friezeY0 + 0.1, friezeY1 - 0.1, width, 0.04, COLORS.trim); // the raised frame
      box(u, v + faceSign * 0.015, friezeY0 + 0.17, friezeY1 - 0.17, width - 0.14, 0.04, width > 1 ? COLORS.relief : COLORS.mosaic[3]); // the relief inside
    }
    // over the side arches, a band of mosaic roundels in the relief
    for (const archU of [-SIDE_ARCH_U, SIDE_ARCH_U]) {
      for (let k = -1; k <= 1; k++) {
        const pos = toWorld(archU + k * 0.36, v + faceSign * 0.04);
        S.cyl(pos[0], pos[1], friezeY0 + 0.36, friezeY0 + 0.62, 0.11, 0.11, 6, COLORS.mosaic[k + 1]);
      }
    }
    // the name board over the middle arch, 彰德門 in faded gilt on a dark ground
    box(0, v + faceSign * 0.04, friezeY0 + 0.24, friezeY1 - 0.24, 1.0, 0.05, COLORS.plaque);
    for (let k = -1; k <= 1; k++) box(k * 0.28, v + faceSign * 0.07, friezeY0 + 0.32, friezeY1 - 0.32, 0.18, 0.02, COLORS.gold);
  }

  // ---- pilasters: four on each face, outside and between the passages, panelled in mosaic, with lotus caps ----
  for (const faceSign of [-1, 1]) {
    for (const u of [-BLOCK_HALF_W + 0.3, -pierMidU, pierMidU, BLOCK_HALF_W - 0.3]) {
      const capY = blockTopY + 0.3;
      const v = faceSign * (dep / 2 + 0.1);
      S.kind = KIND.PLAIN;
      box(u, v, floorY, capY, 0.56, 0.24, COLORS.pier, { top: COLORS.trim });
      const panelCount = 3;
      const h0 = floorY + 0.55;
      const h1 = friezeY0 - 0.15;
      const step = (h1 - h0) / panelCount;
      for (let k = 0; k < panelCount; k++) {
        box(u, v + faceSign * 0.13, h0 + step * k + 0.07, h0 + step * (k + 1) - 0.07, 0.38, 0.03, COLORS.mosaic[(k + (Math.abs(u) < 2 ? 1 : 0)) % 4]);
      }
      const pos = toWorld(u, v);
      S.cyl(pos[0], pos[1], capY, capY + 0.16, 0.26, 0.32, 8, COLORS.trim);
      S.cyl(pos[0], pos[1], capY + 0.16, capY + 0.48, 0.22, 0.06, 8, COLORS.mosaic[1]);
    }
  }

  // ---- the flanking piers: lower blocks at each end of the outline, between the gate and the wall ----
  for (const side of [-1, 1]) {
    const u = side * (BLOCK_HALF_W + flankW / 2);
    const pierTopY = wallTopY + 0.15;
    S.kind = KIND.MASONRY;
    box(u, 0, groundY - 0.2, terraceY, flankW + 0.2, 2.6, COLORS.stone, { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    box(u, 0, terraceY, pierTopY, flankW, 2.4, COLORS.pier, { top: COLORS.trim });
    box(u, 0, pierTopY - 0.22, pierTopY, flankW + 0.14, 2.54, COLORS.trim);
    for (const faceSign of [-1, 1]) box(u, faceSign * 1.215, terraceY + 0.6, pierTopY - 0.5, flankW - 0.3, 0.03, COLORS.mosaic[(side + 1) / 2 + 1]);
    const pos = toWorld(u, 0);
    S.cyl(pos[0], pos[1], pierTopY, pierTopY + 0.2, 0.3, 0.36, 8, COLORS.trim);
    S.cyl(pos[0], pos[1], pierTopY + 0.2, pierTopY + 0.6, 0.26, 0.06, 8, COLORS.mosaic[1]);
  }
}

function buildRoofsBalustradeAndStubs(S, frame, dims) {
  const { toWorld, pt3, box, angle } = frame;
  const { dep, halfOutline, groundY, terraceY, blockTopY, balV, wallTopY } = dims;

  // ---- roofs ----
  const center = toWorld(0, 0);
  const tileOpts = { hips: true, glazed: true, fascia: 0.1, fasciaCol: COLORS.tileEnd };
  S.hip(center[0], center[1], 2 * BLOCK_HALF_W, dep, angle, blockTopY, 1.7, COLORS.roof, { ...tileOpts, flare: 0.4, segs: 6, ridgeCol: null, over: 0.4 });
  const upperY0 = blockTopY + 0.2;
  const upperTopY = blockTopY + 2.95;
  const upperW = 3.4;
  const upperD = 3.5;
  S.kind = KIND.PLAIN; // smooth lime render, not bare brick
  box(0, 0, upperY0, upperTopY, upperW, upperD, COLORS.wall, { top: COLORS.trim });
  box(0, 0, upperTopY - 0.22, upperTopY, upperW + 0.18, upperD + 0.18, COLORS.trim);
  // round windows on the front and back, mosaic panels on the flanks, corner piers (the part above the roof tier)
  const winBaseY = blockTopY + 1.5;
  for (const faceSign of [-1, 1]) {
    const v = faceSign * (upperD / 2 + 0.03);
    const centerY = (winBaseY + upperTopY) / 2;
    const winSegs = 10;
    const winR = 0.45;
    for (let k = 0; k < winSegs; k++) {
      const t0 = (2 * Math.PI * k) / winSegs;
      const t1 = (2 * Math.PI * (k + 1)) / winSegs;
      S.beam(pt3(Math.cos(t0) * winR, centerY + Math.sin(t0) * winR, v), pt3(Math.cos(t1) * winR, centerY + Math.sin(t1) * winR, v), 0.07, 0.16, COLORS.trim);
    }
    box(0, v, centerY - 0.34, centerY + 0.34, 0.58, 0.05, shade(COLORS.door, 0.55));
    for (const side of [-1, 1]) box(side * (upperW / 2 + 0.03), faceSign * 0.6, winBaseY - 0.1, upperTopY - 0.4, 0.05, 0.8, COLORS.mosaic[faceSign > 0 ? 0 : 1]);
  }
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) {
      S.kind = KIND.PLAIN;
      box(signU * (upperW / 2), signV * (upperD / 2), upperY0, upperTopY, 0.32, 0.32, COLORS.pier, { top: COLORS.trim });
    }
  }
  // the top roof: small and plainly hipped, a modest upturn at the corners, no horns
  const topRoofH = 1.25;
  S.hip(center[0], center[1], upperW, upperD, angle, upperTopY, topRoofH, COLORS.roof, { ...tileOpts, hips: false, flare: 0.22, segs: 4, ridgeCol: COLORS.ridge, over: 0.55 });

  // ridge ornament: a mosaic gourd on a lotus in the middle of the top ridge
  const ridgeY = upperTopY + topRoofH;
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], ridgeY - 0.1, ridgeY + 0.12, 0.2, 0.26, 8, COLORS.mosaic[1]);
  S.cyl(center[0], center[1], ridgeY + 0.12, ridgeY + 0.4, 0.26, 0.2, 8, COLORS.gold);
  S.cyl(center[0], center[1], ridgeY + 0.4, ridgeY + 0.72, 0.14, 0.03, 8, COLORS.gold);

  // ---- the balustrade along the forecourt's edge on the moat side: a stone plinth, balusters, a rail, posts ----
  {
    const balBaseY = terraceY + 0.22;
    const balTopY = terraceY + 0.82;
    S.kind = KIND.MASONRY;
    box(0, balV, terraceY - 0.1, balBaseY, TERRACE_W, 0.42, COLORS.stone, { top: shade(COLORS.stone, 1.05) });
    box(0, balV, balTopY - 0.1, balTopY, TERRACE_W, 0.3, shade(COLORS.stone, 1.06));
    const postCount = 9;
    for (let k = 0; k < postCount; k++) {
      const u = -TERRACE_W / 2 + 0.2 + (k * (TERRACE_W - 0.4)) / (postCount - 1);
      box(u, balV, balBaseY, balTopY + 0.18, 0.34, 0.34, shade(COLORS.stone, 0.97), { top: shade(COLORS.stone, 1.05) });
      if (k === postCount - 1) break;
      const nextU = -TERRACE_W / 2 + 0.2 + ((k + 1) * (TERRACE_W - 0.4)) / (postCount - 1);
      const balusterCount = 9;
      for (let j = 1; j <= balusterCount; j++) {
        box(u + ((nextU - u) * j) / (balusterCount + 1), balV, balBaseY, balTopY - 0.1, 0.1, 0.12, shade(COLORS.stone, 0.9));
      }
    }
  }

  // ---- wall stubs: where the Imperial City's wall butts against the gate's flanks, at the wall's own height ----
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) {
    box(side * (halfOutline + 0.35), 0, groundY - 0.2, LAND_Y + OUTER.h, 0.7, OUTER.t + 0.1, OUTER.body, { top: OUTER.cap });
    S.kind = KIND.TILE;
    box(side * (halfOutline + 0.35), 0, LAND_Y + OUTER.h, wallTopY, 0.8, OUTER.capW, OUTER.cap, { taper: 0.45 });
    S.kind = KIND.MASONRY;
  }
}

export function build({ data, S }) {
  const bounds = obb(FOOTPRINT_RING);
  const [cx, cz] = bounds.c;
  // u along the wall (the outline's long side), v through it, +v outward (away from the Imperial City's middle)
  let angle = bounds.w >= bounds.d ? bounds.a : bounds.a + Math.PI / 2;
  const len = Math.max(bounds.w, bounds.d);
  const dep = Math.min(bounds.w, bounds.d);
  const imperialCenter = data.imperial ? [data.imperial.c[0] / 10, data.imperial.c[1] / 10] : [cx + 200, cz - 280];
  {
    const nx = -Math.sin(angle);
    const nz = Math.cos(angle);
    if (nx * (cx - imperialCenter[0]) + nz * (cz - imperialCenter[1]) < 0) angle += Math.PI;
  }
  const axisX = Math.cos(angle);
  const axisZ = Math.sin(angle);
  const toWorld = (u, v): [number, number] => [cx + u * axisX - v * axisZ, cz + u * axisZ + v * axisX];
  const pt3 = (u, y, v) => {
    const pos = toWorld(u, v);
    return [pos[0], y, pos[1]];
  };
  const box = (u, v, y0, y1, su, sv, color, opt?) => {
    const pos = toWorld(u, v);
    S.box(pos[0], pos[1], y0, y1, su, sv, angle, color, opt);
  };
  const frame = { toWorld, pt3, box, angle };

  const groundY = LAND_Y + rise(cx, cz);
  const savedKind = S.kind;
  const halfOutline = len / 2;
  const terraceY = groundY + 0.85;
  const floorY = terraceY + 0.12;
  const dims = {
    len,
    dep,
    halfOutline,
    flankW: halfOutline - BLOCK_HALF_W,
    groundY,
    terraceY,
    floorY,
    blockTopY: floorY + 4.38,
    friezeY0: floorY + 3.1,
    friezeY1: floorY + 4.04,
    balV: dep / 2 + 6.6,
    wallTopY: LAND_Y + OUTER.h + OUTER.capH,
  };
  const arches = [
    { uc: -SIDE_ARCH_U, aw: 1.5, ys: floorY + 2.08 },
    { uc: 0, aw: 1.6, ys: floorY + 2.1 },
    { uc: SIDE_ARCH_U, aw: 1.5, ys: floorY + 2.08 },
  ];

  buildTerraceAndPlinth(S, frame, dims);
  buildLowerBlockAndArches(S, frame, dims, arches);
  buildFriezePilastersAndFlanks(S, frame, dims, arches);
  buildRoofsBalustradeAndStubs(S, frame, dims);

  S.kind = savedKind;
  return null;
}
