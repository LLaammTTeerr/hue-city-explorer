import { KIND, Buf, hex, shade, obb, unflat } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints, lightMaterial } from '../../geo/materials.ts';
import * as THREE from 'three';

// Đan viện Thiên An, the Benedictine abbey on đồi Thiên An (founded 1940 from La Pierre-qui-Vire). See docs/places/thienan.md.
//
// The plan is the OSM outline (way 493381029) read in a frame turned 152° from east: u runs along the church from its
// east-north-east front (u -44.5) to its apse (u 14.8), v across it, positive to the north-north-west. In that frame
// the outline is a grid of straight wings: the church on the north (a nave 20.8 m wide, a wider choir 25.7 m, a
// three-sided apse and a north arm), and south of it the monastery: an east wing, a middle wing and the long south
// range round a narrow cloister garth, the garden court west of the middle wing, a west wing running south to an end
// block. Sources give: the 1965 church half sunk into the hill (nhà thờ hầm), the chapel, guest/retreat house and the
// bell tower built over it in 1994-98, the tower "seven storeys" with the look of tháp Phước Duyên at Thiên Mụ, standing
// to the right of the chapel (OSM node 14351300803, 13 m north of the nave); red-tiled roofs, stone walls,
// stained glass; a stone stair with lamp posts up the hill (OSM steps 1580312663). Storey counts of the wings, the
// heights, the porch and the grotto's place are estimates.

export const id = 'thienan';

const FRAME_ANGLE = (151.98 * Math.PI) / 180; // the u axis, front → apse
const AXIS_U: [number, number] = [Math.cos(FRAME_ANGLE), Math.sin(FRAME_ANGLE)];
const AXIS_V: [number, number] = [-AXIS_U[1], AXIS_U[0]];
const ORIGIN: [number, number] = [-714, 6440];
const CHAPEL_AXIS_V = 40.8;
const RANGE_STOREY_H = 3.5;

const COLORS = {
  cream: hex('#e4d9c0'),
  creamTrim: hex('#d8ccb1'),
  base: hex('#a39a86'),
  tile: hex('#8e4733'),
  tileDark: hex('#7b3c2b'),
  ridge: hex('#ddd2ba'),
  dark: hex('#2f2824'),
  glass: hex('#3e4f73'),
  oculusGlass: hex('#5d6f8a'),
  white: hex('#f1ece0'),
  pave: hex('#c6bca7'),
  lawn: hex('#86a05e'),
  rock: hex('#77706a'),
  pier: hex('#efe7d6'),
  stone: hex('#a3a6a6'),
  stoneAlt: hex('#b2b4b1'),
  glaze: hex('#c9a45a'),
  frame: hex('#8a3a2e'),
  panel: hex('#b67a70'),
  flatRoof: hex('#a8a49b'),
  soffit: hex('#8b7a5c'),
  arcadeBack: hex('#4a3f38'),
  nicheBack: hex('#d8d1c2'),
  gableFace: hex('#dcd6c8'),
  shrub: hex('#5f7f45'),
  lampPost: hex('#3b3a38'),
  lampGlass: hex('#efe2c4'),
  grottoNiche: hex('#2a2522'),
  sashBlue: hex('#6f93c8'),
  weatheredRoof: hex('#6e5a50'),
};

const TOWER_CENTER: [number, number] = [-708.0, 6369.2];
const TOWER_STOREY_HEIGHTS = [4.4, 3.9, 3.7, 3.5, 3.4, 3.3, 3.2];
const HILL_STAIR_START: [number, number] = [-641.2, 6332.1];
const HILL_STAIR_END: [number, number] = [-659.0, 6363.0];
const GROTTO_CENTER: [number, number] = [-671.5, 6359.0];
const GROTTO_BLOCKS: [number, number, number, number, number][] = [
  [0, 0, 3.4, 3.0, 4.2],
  [-1.6, -1.4, 2.0, 1.8, 2.8],
  [1.7, -1.3, 2.1, 1.7, 3.1],
  [-2.8, 0.6, 1.4, 1.6, 1.8],
  [2.9, 0.4, 1.5, 1.5, 2.0],
  [0.2, -2.2, 1.6, 2.0, 3.4],
];

const toWorld = (uPos: number, vPos: number): [number, number] => [
  ORIGIN[0] + AXIS_U[0] * uPos + AXIS_V[0] * vPos,
  ORIGIN[1] + AXIS_U[1] * uPos + AXIS_V[1] * vPos,
];
const toWorld3 = (uPos: number, vPos: number, y: number): [number, number, number] => {
  const pt = toWorld(uPos, vPos);
  return [pt[0], y, pt[1]];
};
const vNormal = (sign: number): [number, number, number] => [AXIS_V[0] * sign, 0, AXIS_V[1] * sign];
const uNormal = (sign: number): [number, number, number] => [AXIS_U[0] * sign, 0, AXIS_U[1] * sign];
const groundY = (x: number, z: number) => LAND_Y + rise(x, z);

// lowest and highest ground under a u/v rectangle
function groundRange(u0: number, u1: number, v0: number, v1: number): [number, number] {
  let hi = -1e9;
  let lo = 1e9;
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j <= 8; j++) {
      const pt = toWorld(u0 + ((u1 - u0) * i) / 8, v0 + ((v1 - v0) * j) / 8);
      const gy = groundY(pt[0], pt[1]);
      hi = Math.max(hi, gy);
      lo = Math.min(lo, gy);
    }
  }
  return [lo, hi];
}

const rangeLevel = (u0: number, u1: number, v0: number, v1: number) => groundRange(u0, u1, v0, v1)[1] + 0.25;

function drawBox(S, u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, col: number[], opts?) {
  const pt = toWorld((u0 + u1) / 2, (v0 + v1) / 2);
  S.box(pt[0], pt[1], y0, y1, u1 - u0, v1 - v0, FRAME_ANGLE, col, opts);
}

// a hip roof over a u/v rectangle, its ridge along the longer side
function drawRoof(S, u0: number, u1: number, v0: number, v1: number, y: number, height: number, col: number[], opts: Record<string, any> = {}) {
  const pt = toWorld((u0 + u1) / 2, (v0 + v1) / 2);
  const du = u1 - u0;
  const dv = v1 - v0;
  const roofOpts = { over: 0.9, flare: 0.35, fascia: 0.25, fasciaCol: COLORS.ridge, ridgeCol: COLORS.ridge, ...opts };
  if (du >= dv) S.hip(pt[0], pt[1], du, dv, FRAME_ANGLE, y, height, col, roofOpts);
  else S.hip(pt[0], pt[1], dv, du, FRAME_ANGLE + Math.PI / 2, y, height, col, roofOpts);
}

// windows on the long faces of a block: per storey, a row of dark openings
function drawWindows(S, u0: number, u1: number, v0: number, v1: number, y: number, storeys: number, storeyH: number, opts: Record<string, any> = {}) {
  const { faces = 'all', col = COLORS.dark, width = 1.1, height = 1.5, step = 3.2, from = 0 } = opts;
  S.kind = KIND.PLAIN;
  const sides: [string, number, number][] = [];
  if (faces === 'all' || faces.includes('n')) sides.push(['v', v1, 1]);
  if (faces === 'all' || faces.includes('s')) sides.push(['v', v0, -1]);
  if (faces === 'all' || faces.includes('e')) sides.push(['u', u0, -1]);
  if (faces === 'all' || faces.includes('w')) sides.push(['u', u1, 1]);
  for (const [axis, pos, sign] of sides) {
    const start = axis === 'v' ? u0 : v0;
    const end = axis === 'v' ? u1 : v1;
    const count = Math.max(1, Math.floor((end - start - 1) / step));
    for (let floor = from; floor < storeys; floor++) {
      for (let i = 0; i < count; i++) {
        const along = start + ((i + 0.5) * (end - start)) / count;
        const yb = y + floor * storeyH + (storeyH - height) * 0.55;
        if (axis === 'v') drawBox(S, along - width / 2, along + width / 2, pos + sign * 0.02 - 0.06, pos + sign * 0.02 + 0.06, yb, yb + height, col);
        else drawBox(S, pos + sign * 0.02 - 0.06, pos + sign * 0.02 + 0.06, along - width / 2, along + width / 2, yb, yb + height, col);
      }
    }
  }
}

// a shaded arcade along one face of a ground floor: the dark walk behind, white piers in front
function drawArcade(S, axis: string, pos: number, start: number, end: number, y: number, height: number, sign: number) {
  S.kind = KIND.PLAIN;
  const count = Math.max(2, Math.round((end - start) / 3));
  if (axis === 'v') drawBox(S, start + 0.4, end - 0.4, pos + sign * 0.03 - 0.06, pos + sign * 0.03 + 0.06, y, y + height, COLORS.arcadeBack);
  else drawBox(S, pos + sign * 0.03 - 0.06, pos + sign * 0.03 + 0.06, start + 0.4, end - 0.4, y, y + height, COLORS.arcadeBack);
  for (let i = 0; i <= count; i++) {
    const along = start + 0.4 + ((end - start - 0.8) * i) / count;
    if (axis === 'v') drawBox(S, along - 0.25, along + 0.25, pos + sign * 0.25 - 0.25, pos + sign * 0.25 + 0.25, y, y + height + 0.3, COLORS.pier);
    else drawBox(S, pos + sign * 0.25 - 0.25, pos + sign * 0.25 + 0.25, along - 0.25, along + 0.25, y, y + height + 0.3, COLORS.pier);
  }
  if (axis === 'v') drawBox(S, start, end, pos + sign * 0.3 - 0.3, pos + sign * 0.3 + 0.3, y + height + 0.3, y + height + 0.7, COLORS.pier);
  else drawBox(S, pos + sign * 0.3 - 0.3, pos + sign * 0.3 + 0.3, start, end, y + height + 0.3, y + height + 0.7, COLORS.pier);
}

// a monastery range: a stone base down to the lowest ground, cream walls, a tiled hip roof
function drawRange(S, u0: number, u1: number, v0: number, v1: number, storeys: number, y: number, opts: Record<string, any> = {}) {
  const [lo] = groundRange(u0, u1, v0, v1);
  const topY = y + storeys * RANGE_STOREY_H + 0.4;
  S.base = y - LAND_Y;
  S.kind = KIND.MASONRY;
  drawBox(S, u0 - 0.3, u1 + 0.3, v0 - 0.3, v1 + 0.3, lo - 0.6, y, COLORS.base, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN; // rendered and limewashed walls, not the chapel's stone
  drawBox(S, u0, u1, v0, v1, y, topY, opts.wall || COLORS.cream, { top: shade(COLORS.tile, 0.8) });
  for (let floor = 1; floor < storeys; floor++) {
    drawBox(S, u0 - 0.08, u1 + 0.08, v0 - 0.08, v1 + 0.08, y + floor * RANGE_STOREY_H - 0.1, y + floor * RANGE_STOREY_H + 0.15, COLORS.creamTrim);
  }
  drawWindows(S, u0, u1, v0, v1, y, storeys, RANGE_STOREY_H, { faces: opts.faces || 'all', from: opts.from || 0 });
  drawRoof(S, u0, u1, v0, v1, topY, Math.min(4.2, Math.min(u1 - u0, v1 - v0) * 0.36), opts.roof || COLORS.tile);
  S.kind = KIND.PLAIN;
  return topY;
}

// a flat disc in the plane of the front (facing out of it, -u), whole or the upper half
function drawFrontDisc(S, uPos: number, vPos: number, y: number, radius: number, col: number[], half = false) {
  const segs = half ? 8 : 16;
  const center = toWorld3(uPos, vPos, y);
  const sweep = half ? Math.PI : Math.PI * 2;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * sweep;
    const a1 = ((i + 1) / segs) * sweep;
    S.tri(
      center,
      toWorld3(uPos, vPos + Math.cos(a0) * radius, y + Math.sin(a0) * radius),
      toWorld3(uPos, vPos + Math.cos(a1) * radius, y + Math.sin(a1) * radius),
      col,
      uNormal(-1),
    );
  }
}

// a round window: a white ring, the coloured glass, white tracery
function drawOculus(S, uPos: number, vPos: number, y: number, radius: number) {
  S.kind = KIND.PLAIN;
  drawFrontDisc(S, uPos, vPos, y, radius, COLORS.white);
  drawFrontDisc(S, uPos - 0.03, vPos, y, radius * 0.74, COLORS.oculusGlass);
  drawFrontDisc(S, uPos - 0.06, vPos, y, radius * 0.22, COLORS.white);
  for (const angle of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
    const dv = Math.cos(angle) * radius * 0.72;
    const dy = Math.sin(angle) * radius * 0.72;
    S.beam(toWorld3(uPos - 0.06, vPos - dv, y - dy), toWorld3(uPos - 0.06, vPos + dv, y + dy), 0.06, 0.06, COLORS.white);
  }
}

// an arched window: white frame, red shutters
function drawArchWindow(S, uPos: number, vPos: number, y0: number, y1: number, width: number) {
  S.kind = KIND.PLAIN;
  drawBox(S, uPos - 0.06, uPos + 0.06, vPos - width / 2 - 0.18, vPos + width / 2 + 0.18, y0 - 0.2, y1, COLORS.white);
  drawFrontDisc(S, uPos - 0.07, vPos, y1, width / 2 + 0.18, COLORS.white, true);
  drawBox(S, uPos - 0.1, uPos - 0.02, vPos - width / 2, vPos + width / 2, y0, y1, COLORS.frame);
  drawFrontDisc(S, uPos - 0.11, vPos, y1, width / 2, COLORS.frame, true);
  drawBox(S, uPos - 0.12, uPos - 0.04, vPos - 0.04, vPos + 0.04, y0, y1 + width / 2 - 0.05, shade(COLORS.frame, 0.7));
}

// a yellow-glazed tiled eave along the front: the slope, a glazed fascia board at its edge, the soffit under it
function drawGlazedEave(S, u0: number, v0: number, v1: number, y: number, depth: number) {
  const yLow = y - 0.2;
  const yHigh = y + depth * 0.75;
  S.kind = KIND.GLAZED;
  S.quad(
    toWorld3(u0 - depth, v0 - 0.5, yLow),
    toWorld3(u0 - depth, v1 + 0.5, yLow),
    toWorld3(u0 + 0.3, v1 + 0.5, yHigh),
    toWorld3(u0 + 0.3, v0 - 0.5, yHigh),
    COLORS.glaze,
    [-AXIS_U[0], 1, -AXIS_U[1]],
  );
  for (const [vEdge, sign] of [[v0 - 0.5, -1], [v1 + 0.5, 1]] as [number, number][]) {
    S.tri(toWorld3(u0 - depth, vEdge, yLow), toWorld3(u0 + 0.3, vEdge, yHigh), toWorld3(u0 + 0.3, vEdge, yLow), COLORS.glaze, vNormal(sign));
  }
  S.kind = KIND.PLAIN;
  drawBox(S, u0 - depth - 0.08, u0 - depth + 0.14, v0 - 0.5, v1 + 0.5, yLow - 0.32, yLow + 0.06, shade(COLORS.glaze, 0.82));
  S.quad(
    toWorld3(u0 - depth, v0 - 0.5, yLow - 0.02),
    toWorld3(u0 - depth, v1 + 0.5, yLow - 0.02),
    toWorld3(u0 + 0.3, v1 + 0.5, yLow - 0.02),
    toWorld3(u0 + 0.3, v0 - 0.5, yLow - 0.02),
    COLORS.soffit,
    [0, -1, 0],
  );
}

// the 1965 crypt church's podium and terrace, plus the long range over the chapel's west end
function buildCryptAndLongRange(S, chapelY: number) {
  const [lo] = groundRange(-48.8, 14.8, 24.2, 50.4);
  S.base = chapelY - LAND_Y;
  S.kind = KIND.MASONRY;
  drawBox(S, -17.9, 7.9, 23.9, 50.2, lo - 0.6, chapelY, COLORS.base, { topKind: KIND.ROAD });
  const apse: [number, number][] = [[7.6, 24.2], [14.8, 32.1], [14.7, 42.5], [7.6, 49.9]];
  S.prism([[7.4, 23.9], [15.1, 32], [15, 42.6], [7.4, 50.2]].map(([uPos, vPos]) => toWorld(uPos, vPos)), lo - 0.6, chapelY, COLORS.base, COLORS.base);

  // crypt church windows where the podium stands clear of the ground
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    for (let uPos = -3; uPos <= 5; uPos += 4) {
      const vPos = side > 0 ? 50.25 : 23.85;
      const pt = toWorld(uPos, vPos);
      if (chapelY - groundY(pt[0], pt[1]) > 2.6) drawBox(S, uPos - 0.6, uPos + 0.6, vPos - 0.07, vPos + 0.07, chapelY - 2.2, chapelY - 0.6, COLORS.dark);
    }
  }
  for (let k = 0; k < 3; k++) {
    const ptA = apse[k];
    const ptB = apse[k + 1];
    const pt = toWorld((ptA[0] + ptB[0]) / 2 + 0.22, (ptA[1] + ptB[1]) / 2);
    if (chapelY - groundY(pt[0], pt[1]) > 2.6) {
      S.box(pt[0], pt[1], chapelY - 2.4, chapelY - 0.4, 1.2, 0.16, FRAME_ANGLE + Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]), COLORS.dark);
    }
  }

  // terrace over the crypt church: parapet storey, tiled skirt round outer edges, paving inside
  const terraceY = chapelY + 1.1;
  const oct: [number, number][] = [[-5, 24.2], ...apse, [-5, 49.9]];
  S.kind = KIND.MASONRY;
  S.prism(oct.map(([uPos, vPos]) => toWorld(uPos, vPos)), chapelY, terraceY, COLORS.base, COLORS.pave, { topKind: KIND.ROAD });
  S.kind = KIND.TILE;
  const centerU = 3;
  const centerV = 37.05;
  const offsetOut = (pt: [number, number], dist: number): [number, number] => {
    const du = pt[0] - centerU;
    const dv = pt[1] - centerV;
    const len = Math.hypot(du, dv);
    return [pt[0] + (du / len) * dist, pt[1] + (dv / len) * dist];
  };
  for (let k = 0; k < oct.length - 1; k++) {
    const ptA = oct[k];
    const ptB = oct[k + 1];
    if (ptA[0] === -5 && ptB[0] === -5) continue;
    const aOut = offsetOut(ptA, 0.7);
    const bOut = offsetOut(ptB, 0.7);
    const aIn = offsetOut(ptA, -1.3);
    const bIn = offsetOut(ptB, -1.3);
    S.quad(
      toWorld3(aOut[0], aOut[1], terraceY - 0.35),
      toWorld3(bOut[0], bOut[1], terraceY - 0.35),
      toWorld3(bIn[0], bIn[1], terraceY + 0.55),
      toWorld3(aIn[0], aIn[1], terraceY + 0.55),
      COLORS.tileDark,
      [0, 1, 0],
    );
  }
  S.kind = KIND.PLAIN;
  for (const [uPos, vPos] of [[0, 30], [0, 44], [7, 34], [7, 40]] as [number, number][]) {
    const pt = toWorld(uPos, vPos);
    S.cyl(pt[0], pt[1], terraceY, terraceY + 0.6, 0.55, 0.6, 8, COLORS.base);
    S.cyl(pt[0], pt[1], terraceY + 0.6, terraceY + 1.3, 0.5, 0.2, 6, COLORS.shrub);
  }

  // the long range over the chapel's west end, on to the north end (the outline's north arm)
  drawRange(S, -17.6, -5, 15.5, 63.5, 2, chapelY, { faces: 'nw' });
  S.kind = KIND.MASONRY;
  drawBox(S, -5, -2.9, 15.5, 24.2, lo - 0.6, chapelY, COLORS.base, { top: COLORS.pave, topKind: KIND.ROAD });
}

// the 1994-98 chapel nave, aisles and stone facade with portico, statue niche, central gable and end pavilions
function buildChapelNaveAndFront(S, chapelFloorY: number) {
  const [loChapel] = groundRange(-49.1, -17.6, 25.2, 50.7);
  const naveTopY = chapelFloorY + 7.6;
  S.base = chapelFloorY - LAND_Y;
  S.kind = KIND.MASONRY;
  drawBox(S, -46, -17.6, 32.6, 49.2, loChapel - 0.6, naveTopY, COLORS.stone, { top: shade(COLORS.tile, 0.8) });
  drawBox(S, -46, -17.6, 28.8, 32.6, loChapel - 0.6, chapelFloorY + 5.0, COLORS.stoneAlt, { top: COLORS.flatRoof });
  drawBox(S, -46, -17.6, 25.5, 28.8, loChapel - 0.6, chapelFloorY + 3.4, COLORS.stoneAlt, { top: shade(COLORS.tile, 0.8) });
  drawBox(S, -46, -17.6, 49.2, 50.4, loChapel - 0.6, chapelFloorY + 3.0, COLORS.stoneAlt, { top: COLORS.flatRoof });
  S.kind = KIND.TILE;
  S.quad(
    toWorld3(-46.5, 25.0, chapelFloorY + 3.25),
    toWorld3(-17.6, 25.0, chapelFloorY + 3.25),
    toWorld3(-17.6, 28.9, chapelFloorY + 4.6),
    toWorld3(-46.5, 28.9, chapelFloorY + 4.6),
    COLORS.tile,
    [0, 1, 0],
  );
  S.kind = KIND.PLAIN;
  for (const uEnd of [-46, -17.6]) {
    S.tri(
      toWorld3(uEnd, 25.5, chapelFloorY + 3.4),
      toWorld3(uEnd, 28.8, chapelFloorY + 3.4),
      toWorld3(uEnd, 28.8, chapelFloorY + 4.5),
      COLORS.stoneAlt,
      uNormal(uEnd < -30 ? 1 : -1),
    );
  }
  drawRoof(S, -46, -17.6, 32.6, 49.2, naveTopY, 4.6, COLORS.tile, { over: 0.8, flare: 0.2 });

  for (let uPos = -42.5; uPos <= -21; uPos += 3.6) {
    drawBox(S, uPos - 0.45, uPos + 0.45, 32.52, 32.68, chapelFloorY + 5.4, chapelFloorY + 7.0, COLORS.glass);
    drawBox(S, uPos - 0.45, uPos + 0.45, 49.12, 49.28, chapelFloorY + 3.6, chapelFloorY + 7.0, COLORS.glass);
    const pt = toWorld(uPos, 25.5);
    if (groundY(pt[0], pt[1]) < chapelFloorY + 0.7) {
      drawBox(S, uPos - 0.45, uPos + 0.45, 25.42, 25.58, chapelFloorY + 0.9, chapelFloorY + 2.8, COLORS.glass);
    }
  }

  // lower front: side piers, portico, pillars, doors, arched windows and wide glazed eave
  S.kind = KIND.MASONRY;
  for (const sign of [-1, 1]) {
    drawBox(S, -48.8, -46, sign > 0 ? CHAPEL_AXIS_V + 3.4 : CHAPEL_AXIS_V - 9.6, sign > 0 ? CHAPEL_AXIS_V + 9.6 : CHAPEL_AXIS_V - 3.4, chapelFloorY, chapelFloorY + 5.6, COLORS.stone);
  }
  drawBox(S, -47.3, -46, CHAPEL_AXIS_V - 3.4, CHAPEL_AXIS_V + 3.4, chapelFloorY, chapelFloorY + 5.6, COLORS.stoneAlt);
  drawBox(S, -48.8, -47.3, CHAPEL_AXIS_V - 3.4, CHAPEL_AXIS_V + 3.4, chapelFloorY + 4.6, chapelFloorY + 5.6, COLORS.stone);
  S.kind = KIND.PLAIN;
  for (const dv of [-2.7, -0.9, 0.9, 2.7]) {
    const pt = toWorld(-48.35, CHAPEL_AXIS_V + dv);
    S.cyl(pt[0], pt[1], chapelFloorY, chapelFloorY + 4.6, 0.27, 0.25, 8, COLORS.white);
  }
  for (const dv of [-2.0, 0, 2.0]) {
    drawBox(S, -47.38, -47.26, CHAPEL_AXIS_V + dv - (dv ? 0.55 : 0.8), CHAPEL_AXIS_V + dv + (dv ? 0.55 : 0.8), chapelFloorY, chapelFloorY + (dv ? 2.6 : 3.4), COLORS.dark);
  }
  for (const sign of [-1, 1]) {
    for (const dv of [5.0, 8.0]) drawArchWindow(S, -48.8, CHAPEL_AXIS_V + sign * dv, chapelFloorY + 1.2, chapelFloorY + 3.3, 1.2);
  }
  drawGlazedEave(S, -48.8, CHAPEL_AXIS_V - 9.6, CHAPEL_AXIS_V + 9.6, chapelFloorY + 5.6, 1.6);

  // upper storey: niche with statue of Christ, rose panels, oculi, balcony, central gable and end pavilions
  S.kind = KIND.MASONRY;
  drawBox(S, -48.6, -46, CHAPEL_AXIS_V - 4.2, CHAPEL_AXIS_V + 4.2, chapelFloorY + 5.6, chapelFloorY + 9.6, COLORS.stone);
  S.kind = KIND.PLAIN;
  drawBox(S, -48.66, -48.56, CHAPEL_AXIS_V - 1.05, CHAPEL_AXIS_V + 1.05, chapelFloorY + 6.0, chapelFloorY + 8.4, COLORS.white);
  drawFrontDisc(S, -48.67, CHAPEL_AXIS_V, chapelFloorY + 8.4, 1.05, COLORS.white, true);
  drawBox(S, -48.7, -48.64, CHAPEL_AXIS_V - 0.75, CHAPEL_AXIS_V + 0.75, chapelFloorY + 6.2, chapelFloorY + 8.4, COLORS.nicheBack);
  drawFrontDisc(S, -48.71, CHAPEL_AXIS_V, chapelFloorY + 8.4, 0.75, COLORS.nicheBack, true);

  const statuePt = toWorld(-48.95, CHAPEL_AXIS_V);
  S.cyl(statuePt[0], statuePt[1], chapelFloorY + 6.3, chapelFloorY + 8.1, 0.32, 0.22, 8, COLORS.white);
  S.cyl(statuePt[0], statuePt[1], chapelFloorY + 8.1, chapelFloorY + 8.5, 0.16, 0.13, 6, COLORS.white);
  S.beam(
    [statuePt[0] - AXIS_V[0] * 0.6, chapelFloorY + 7.85, statuePt[1] - AXIS_V[1] * 0.6],
    [statuePt[0] + AXIS_V[0] * 0.6, chapelFloorY + 7.85, statuePt[1] + AXIS_V[1] * 0.6],
    0.14, 0.12, COLORS.white,
  );
  for (const sign of [-1, 1]) {
    drawBox(S, -48.68, -48.56, CHAPEL_AXIS_V + sign * 2.25 - 0.75, CHAPEL_AXIS_V + sign * 2.25 + 0.75, chapelFloorY + 6.2, chapelFloorY + 9.0, COLORS.panel);
    drawOculus(S, -48.62, CHAPEL_AXIS_V + sign * 3.55, chapelFloorY + 7.9, 0.42);
  }

  // balcony over the portico eave
  drawBox(S, -49.4, -48.6, CHAPEL_AXIS_V - 3.6, CHAPEL_AXIS_V + 3.6, chapelFloorY + 6.05, chapelFloorY + 6.25, COLORS.white);
  for (let vPos = CHAPEL_AXIS_V - 3.45; vPos <= CHAPEL_AXIS_V + 3.46; vPos += 0.3) {
    drawBox(S, -49.3, -49.18, vPos - 0.05, vPos + 0.05, chapelFloorY + 6.25, chapelFloorY + 6.95, COLORS.white);
  }
  drawBox(S, -49.36, -49.12, CHAPEL_AXIS_V - 3.6, CHAPEL_AXIS_V + 3.6, chapelFloorY + 6.95, chapelFloorY + 7.08, COLORS.white);
  for (const sign of [-1, 1]) {
    drawBox(S, -49.4, -48.6, CHAPEL_AXIS_V + sign * 3.6 - 0.06, CHAPEL_AXIS_V + sign * 3.6 + 0.06, chapelFloorY + 6.25, chapelFloorY + 7.08, COLORS.white);
  }
  drawGlazedEave(S, -48.6, CHAPEL_AXIS_V - 4.2, CHAPEL_AXIS_V + 4.2, chapelFloorY + 9.6, 1.0);

  // central gable with rose window and cross
  const gableBaseY = chapelFloorY + 10.0;
  const gablePeakY = chapelFloorY + 13.0;
  S.kind = KIND.MASONRY;
  drawBox(S, -48.4, -46, CHAPEL_AXIS_V - 4.0, CHAPEL_AXIS_V + 4.0, chapelFloorY + 9.6, gableBaseY, COLORS.stone);
  S.kind = KIND.PLAIN;
  S.tri(toWorld3(-48.4, CHAPEL_AXIS_V - 4.0, gableBaseY), toWorld3(-48.4, CHAPEL_AXIS_V + 4.0, gableBaseY), toWorld3(-48.4, CHAPEL_AXIS_V, gablePeakY), COLORS.gableFace, uNormal(-1));
  S.tri(toWorld3(-46, CHAPEL_AXIS_V + 4.0, gableBaseY), toWorld3(-46, CHAPEL_AXIS_V - 4.0, gableBaseY), toWorld3(-46, CHAPEL_AXIS_V, gablePeakY), COLORS.stone, uNormal(1));
  S.kind = KIND.GLAZED;
  for (const sign of [-1, 1]) {
    S.quad(
      toWorld3(-49.0, CHAPEL_AXIS_V + sign * 4.6, gableBaseY - 0.3),
      toWorld3(-45.6, CHAPEL_AXIS_V + sign * 4.6, gableBaseY - 0.3),
      toWorld3(-45.6, CHAPEL_AXIS_V, gablePeakY + 0.35),
      toWorld3(-49.0, CHAPEL_AXIS_V, gablePeakY + 0.35),
      COLORS.glaze,
      [AXIS_V[0] * sign, 1.2, AXIS_V[1] * sign],
    );
  }
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) {
    S.beam(toWorld3(-49.05, CHAPEL_AXIS_V + sign * 4.75, gableBaseY - 0.45), toWorld3(-49.05, CHAPEL_AXIS_V, gablePeakY + 0.2), 0.5, 0.42, shade(COLORS.glaze, 0.85));
  }
  drawBox(S, -49.25, -48.4, CHAPEL_AXIS_V - 0.25, CHAPEL_AXIS_V + 0.25, gablePeakY + 0.1, gablePeakY + 0.55, shade(COLORS.glaze, 0.85));
  drawOculus(S, -48.45, CHAPEL_AXIS_V, gableBaseY + 1.15, 0.85);
  const crossPt = toWorld(-48.6, CHAPEL_AXIS_V);
  S.beam([crossPt[0], gablePeakY + 0.4, crossPt[1]], [crossPt[0], gablePeakY + 2.4, crossPt[1]], 0.2, 0.2, COLORS.white);
  S.beam([crossPt[0] - AXIS_V[0] * 0.6, gablePeakY + 1.8, crossPt[1] - AXIS_V[1] * 0.6], [crossPt[0] + AXIS_V[0] * 0.6, gablePeakY + 1.8, crossPt[1] + AXIS_V[1] * 0.6], 0.18, 0.18, COLORS.white);

  // two end pavilions with glazed hipped caps and crosses
  for (const sign of [-1, 1]) {
    const vCenter = CHAPEL_AXIS_V + sign * 7.7;
    S.kind = KIND.MASONRY;
    drawBox(S, -48.8, -46.4, vCenter - 1.9, vCenter + 1.9, chapelFloorY + 5.6, chapelFloorY + 8.6, COLORS.stone);
    drawOculus(S, -48.85, vCenter, chapelFloorY + 7.3, 0.6);
    drawRoof(S, -48.8, -46.4, vCenter - 1.9, vCenter + 1.9, chapelFloorY + 8.6, 2.0, COLORS.glaze, {
      over: 0.6, flare: 0.2, hips: true, glazed: true, ridgeCol: shade(COLORS.glaze, 0.85), fascia: 0.3, fasciaCol: shade(COLORS.glaze, 0.82),
    });
    const pt = toWorld(-47.6, vCenter);
    S.beam([pt[0], chapelFloorY + 10.5, pt[1]], [pt[0], chapelFloorY + 12.0, pt[1]], 0.15, 0.15, COLORS.white);
    S.beam([pt[0] - AXIS_V[0] * 0.4, chapelFloorY + 11.5, pt[1] - AXIS_V[1] * 0.4], [pt[0] + AXIS_V[0] * 0.4, chapelFloorY + 11.5, pt[1] + AXIS_V[1] * 0.4], 0.13, 0.13, COLORS.white);
  }
}

// the paved forecourt, sloped approach, broad nine-riser stair, arched terrace base and balustrade
function buildForecourtAndStair(S, forecourtY: number, chapelFloorY: number) {
  const [lo] = groundRange(-67, -46, CHAPEL_AXIS_V - 14, CHAPEL_AXIS_V + 13);
  S.base = forecourtY - LAND_Y;
  S.kind = KIND.MASONRY;
  drawBox(S, -62, -56.5, CHAPEL_AXIS_V - 14, CHAPEL_AXIS_V + 13, lo - 0.6, forecourtY, COLORS.base, { top: COLORS.pave, topKind: KIND.ROAD });

  // sloped paved court out to the road
  const topAt = (uPos: number, vPos: number) => {
    const pt = toWorld(uPos, vPos);
    return Math.max(groundY(pt[0], pt[1]) + 0.12, forecourtY - 0.35 * (-62 - uPos));
  };
  const footAt = (uPos: number, vPos: number) => {
    const pt = toWorld(uPos, vPos);
    return groundY(pt[0], pt[1]) - 0.4;
  };
  const uGrid: number[] = [];
  const vGrid: number[] = [];
  for (let uPos = -84; uPos < -62 - 1e-6; uPos += 1.5) uGrid.push(uPos);
  uGrid.push(-62);
  for (let vPos = CHAPEL_AXIS_V - 14; vPos < CHAPEL_AXIS_V + 13 - 1e-6; vPos += 1.5) vGrid.push(vPos);
  vGrid.push(CHAPEL_AXIS_V + 13);

  S.kind = KIND.ROAD;
  for (let i = 0; i + 1 < uGrid.length; i++) {
    for (let j = 0; j + 1 < vGrid.length; j++) {
      const uA = uGrid[i], uB = uGrid[i + 1], vA = vGrid[j], vB = vGrid[j + 1];
      S.quad(toWorld3(uA, vA, topAt(uA, vA)), toWorld3(uB, vA, topAt(uB, vA)), toWorld3(uB, vB, topAt(uB, vB)), toWorld3(uA, vB, topAt(uA, vB)), COLORS.pave, [0, 1, 0]);
    }
  }
  S.kind = KIND.MASONRY;
  for (let i = 0; i + 1 < uGrid.length; i++) {
    for (const [vEdge, sign] of [[CHAPEL_AXIS_V - 14, -1], [CHAPEL_AXIS_V + 13, 1]] as [number, number][]) {
      const uA = uGrid[i], uB = uGrid[i + 1];
      S.quad(toWorld3(uA, vEdge, footAt(uA, vEdge)), toWorld3(uB, vEdge, footAt(uB, vEdge)), toWorld3(uB, vEdge, topAt(uB, vEdge)), toWorld3(uA, vEdge, topAt(uA, vEdge)), COLORS.base, vNormal(sign));
    }
  }
  for (let j = 0; j + 1 < vGrid.length; j++) {
    const vA = vGrid[j], vB = vGrid[j + 1];
    S.quad(toWorld3(-84, vA, footAt(-84, vA)), toWorld3(-84, vB, footAt(-84, vB)), toWorld3(-84, vB, topAt(-84, vB)), toWorld3(-84, vA, topAt(-84, vA)), COLORS.base, uNormal(-1));
  }

  // front terrace and nine-riser stair
  drawBox(S, -52.5, -46, CHAPEL_AXIS_V - 13, CHAPEL_AXIS_V + 13, lo - 0.6, chapelFloorY, COLORS.base, { top: COLORS.pave, topKind: KIND.ROAD });
  const riserCount = 9;
  const run = 4.0 / riserCount;
  S.kind = KIND.ROAD;
  for (let i = 0; i < riserCount; i++) {
    const uStart = -56.5 + run * i;
    drawBox(S, uStart, uStart + run + 0.02, CHAPEL_AXIS_V - 8.5, CHAPEL_AXIS_V + 8.5, lo - 0.6, forecourtY + ((chapelFloorY - forecourtY) * (i + 1)) / riserCount, COLORS.pave);
  }
  S.kind = KIND.MASONRY;
  for (const sign of [-1, 1]) {
    drawBox(S, -56.6, -52.5, CHAPEL_AXIS_V + sign * 8.8 - 0.3, CHAPEL_AXIS_V + sign * 8.8 + 0.3, lo - 0.6, forecourtY + 0.25 + (chapelFloorY - forecourtY) * 0.5, COLORS.base);
  }

  // dark arches in the terrace base and white balustrade along its edges
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) {
    for (const dv of [10.0, 11.8]) {
      const vPos = CHAPEL_AXIS_V + sign * dv;
      drawBox(S, -52.58, -52.5, vPos - 0.35, vPos + 0.35, forecourtY, forecourtY + 0.7, COLORS.dark);
      drawFrontDisc(S, -52.6, vPos, forecourtY + 0.7, 0.35, COLORS.dark, true);
    }
    for (let uPos = -51.3; uPos <= -47; uPos += 1.4) {
      const vPos = CHAPEL_AXIS_V + sign * 13.04;
      const pt = toWorld(uPos, vPos);
      if (groundY(pt[0], pt[1]) < forecourtY + 0.3) drawBox(S, uPos - 0.35, uPos + 0.35, vPos - 0.04, vPos + 0.04, forecourtY, forecourtY + 0.75, COLORS.dark);
    }
    const vStart = CHAPEL_AXIS_V + sign * 8.8;
    const vEnd = CHAPEL_AXIS_V + sign * 12.95;
    drawBox(S, -52.5, -52.25, Math.min(vStart, vEnd), Math.max(vStart, vEnd), chapelFloorY + 0.85, chapelFloorY + 0.97, COLORS.white);
    for (let k = 0; k <= 12; k++) {
      const vPos = vStart + ((vEnd - vStart) * k) / 12;
      drawBox(S, -52.43, -52.33, vPos - 0.05, vPos + 0.05, chapelFloorY, chapelFloorY + 0.85, COLORS.white);
    }
    const vSide = CHAPEL_AXIS_V + sign * 12.9;
    drawBox(S, -52.5, -48.8, vSide - 0.12, vSide + 0.12, chapelFloorY + 0.85, chapelFloorY + 0.97, COLORS.white);
    for (let uPos = -52.4; uPos <= -48.9; uPos += 0.32) {
      drawBox(S, uPos - 0.05, uPos + 0.05, vSide - 0.05, vSide + 0.05, chapelFloorY, chapelFloorY + 0.85, COLORS.white);
    }
  }
}

// the seven-storey octagonal bell tower (OSM node 14351300803)
function buildBellTower(S): { center: [number, number]; topY: number } {
  const center = TOWER_CENTER;
  const centerGround = groundY(center[0], center[1]);
  const rot = FRAME_ANGLE + Math.PI / 8;
  let lo = 1e9;
  for (let k = 0; k < 8; k++) {
    const angle = (k * Math.PI) / 4;
    lo = Math.min(lo, groundY(center[0] + Math.cos(angle) * 6.4, center[1] + Math.sin(angle) * 6.4));
  }
  const baseTopY = Math.max(centerGround, lo) + 0.5;
  S.base = baseTopY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(center[0], center[1], lo - 0.6, baseTopY, 6.4, 6.4, 8, COLORS.base, { rot });
  S.cyl(center[0], center[1], baseTopY, baseTopY + 1.0, 5.4, 5.4, 8, COLORS.base, { rot });

  const drawOctRing = (innerR: number, outerR: number, y: number, col: number[], normalHint?) => {
    for (let k = 0; k < 8; k++) {
      const a0 = rot + (k * Math.PI) / 4;
      const a1 = rot + ((k + 1) * Math.PI) / 4;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      S.quad(
        [center[0] + c0 * innerR, y, center[1] + s0 * innerR],
        [center[0] + c1 * innerR, y, center[1] + s1 * innerR],
        [center[0] + c1 * outerR, y, center[1] + s1 * outerR],
        [center[0] + c0 * outerR, y, center[1] + s0 * outerR],
        col,
        normalHint,
      );
    }
  };

  let curY = baseTopY + 1.0;
  TOWER_STOREY_HEIGHTS.forEach((storeyH, idx) => {
    const radius = 4.4 - idx * 0.22;
    S.kind = KIND.MASONRY;
    S.cyl(center[0], center[1], curY, curY + storeyH, radius, radius, 8, idx % 2 ? COLORS.stone : COLORS.stoneAlt, { rot });
    S.kind = KIND.PLAIN;

    // white-framed arched openings on the four cardinal faces, round windows on the diagonals
    const apothem = radius * Math.cos(Math.PI / 8);
    for (let k = 0; k < 8; k++) {
      const angle = FRAME_ANGLE + (k * Math.PI) / 4;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const x = center[0] + cosA * (apothem + 0.03);
      const z = center[1] + sinA * (apothem + 0.03);
      const midY = curY + storeyH * 0.45;
      if (k % 2 === 0) {
        const openW = idx === 0 ? 1.5 : 1.0;
        const openH = Math.min(storeyH - 1.3, 2.2);
        S.box(x, z, midY - openH / 2 - 0.15, midY + openH / 2 + 0.15, 0.1, openW + 0.36, angle, COLORS.white);
        S.box(center[0] + cosA * (apothem + 0.06), center[1] + sinA * (apothem + 0.06), midY - openH / 2, midY + openH / 2, 0.1, openW, angle, COLORS.dark);
      } else if (idx > 0) {
        S.box(x, z, midY - 0.4, midY + 0.4, 0.1, 0.8, angle, COLORS.white);
        S.box(center[0] + cosA * (apothem + 0.06), center[1] + sinA * (apothem + 0.06), midY - 0.26, midY + 0.26, 0.1, 0.52, angle, COLORS.dark);
      }
    }

    // glazed skirt roof with fascia, soffit, upturned corners and balustrade
    const roofY = curY + storeyH;
    const outerR = radius + 1.75;
    const topR = radius + 0.1;
    const skirtH = 1.15;
    S.cyl(center[0], center[1], roofY - 0.42, roofY, outerR, outerR, 8, shade(COLORS.glaze, 0.8), { rot, cap: false });
    drawOctRing(radius, outerR, roofY - 0.42, COLORS.soffit, [0, -1, 0]);
    S.kind = KIND.GLAZED;
    S.cyl(center[0], center[1], roofY, roofY + skirtH, outerR, topR, 8, COLORS.glaze, { rot });
    for (let k = 0; k < 8; k++) {
      const angle = rot + (k * Math.PI) / 4;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      S.beam(
        [center[0] + cosA * (outerR - 0.6), roofY + 0.3, center[1] + sinA * (outerR - 0.6)],
        [center[0] + cosA * (outerR + 0.35), roofY + 0.62, center[1] + sinA * (outerR + 0.35)],
        0.22, 0.22, shade(COLORS.glaze, 0.9),
      );
    }
    S.kind = KIND.PLAIN;
    if (idx < TOWER_STOREY_HEIGHTS.length - 1) {
      const balR = radius + 0.55;
      const balY = roofY + skirtH * (outerR - balR) / (outerR - topR);
      S.cyl(center[0], center[1], balY - 0.1, balY + 0.85, balR, balR, 8, COLORS.stoneAlt, { rot, cap: false });
      drawOctRing(balR - 0.12, balR + 0.06, balY + 0.85, COLORS.white, [0, 1, 0]);
    }
    curY = roofY + 0.55;
  });

  S.kind = KIND.GLAZED;
  S.cyl(center[0], center[1], curY, curY + 3.2, 2.6, 0.14, 8, COLORS.glaze, { rot });
  S.kind = KIND.PLAIN;
  curY += 0.3;
  S.cyl(center[0], center[1], curY + 2.4, curY + 2.9, 0.4, 0.4, 6, COLORS.ridge);
  const topY = curY + 2.9;
  S.beam([center[0], topY, center[1]], [center[0], curY + 5.4, center[1]], 0.26, 0.26, COLORS.white);
  S.beam([center[0] - AXIS_V[0] * 0.8, curY + 4.6, center[1] - AXIS_V[1] * 0.8], [center[0] + AXIS_V[0] * 0.8, curY + 4.6, center[1] + AXIS_V[1] * 0.8], 0.22, 0.22, COLORS.white);
  S.kind = KIND.MASONRY;
  return { center, topY };
}

// the monastery ranges, cloister arcades, garth and terraced garden court
function buildMonasteryRangesAndCourts(S, data, chapelY: number) {
  const eastY = rangeLevel(-42.2, -28.9, -14, 20.5);
  const midY = rangeLevel(-18.4, -2.9, -14, 15.5);
  const crossY = rangeLevel(-42.2, -5, -24.4, -14);
  const hipBlockY = rangeLevel(-5, 8, -27, -14);
  const southBlockY = rangeLevel(8, 35.8, -26, -14);
  const westArmY = rangeLevel(38.5, 46, -40, -15);
  const westEndY = rangeLevel(34, 45, -62, -43);

  drawRange(S, -42.2, -28.9, -14, 20.5, 2, eastY);
  drawRange(S, -18.4, -2.9, -14, 15.5, 2, midY);
  drawRange(S, -42.2, -5, -24.4, -14, 2, crossY);
  drawRange(S, -5, 8, -27, -14, 1, hipBlockY, { faces: 'sw' });

  // flat grey terrace beside the hipped block
  const [terraceLo] = groundRange(-14, -5, -28.5, -24.4);
  const flatTerraceY = rangeLevel(-14, -5, -28.5, -24.4);
  S.base = flatTerraceY - LAND_Y;
  S.kind = KIND.MASONRY;
  drawBox(S, -14, -5, -28.5, -24.4, terraceLo - 0.6, flatTerraceY + 3.2, COLORS.creamTrim, { top: COLORS.flatRoof, topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  drawWindows(S, -14, -5, -28.5, -24.4, flatTerraceY, 1, 3.2, { faces: 's' });

  drawRange(S, 8, 35.8, -26, -14, 2, southBlockY, { faces: 'sw' });
  drawRange(S, 38.5, 46, -40, -15, 1, westArmY);
  drawRange(S, 34, 45, -62, -43, 2, westEndY);

  // cloister walks facing the garth and garden court
  drawArcade(S, 'u', -28.9, -13.6, 20.5, eastY, 2.6, 1);
  drawArcade(S, 'u', -18.4, -13.6, 15.1, midY, 2.6, -1);
  drawArcade(S, 'u', -17.6, 15.9, 25.1, chapelY, 2.6, -1);
  drawArcade(S, 'u', -2.9, -13.6, 15.1, midY, 2.6, 1);
  drawArcade(S, 'u', -5, 15.9, 23.8, chapelY, 2.6, 1);
  drawArcade(S, 'v', -14, -4.6, 7.6, hipBlockY, 2.6, 1);
  drawArcade(S, 'v', -14, 8.4, 35.4, southBlockY, 2.6, 1);
  drawArcade(S, 'u', 38.5, -39.5, -15.5, westArmY, 2.6, -1);

  // cloister garth with cross paths, well-head and entrance passage
  const garthY = rangeLevel(-28.9, -18.4, -14, 24.2) - 0.1;
  const [garthLo] = groundRange(-28.9, -18.4, -14, 26);
  S.base = garthY - LAND_Y;
  S.kind = KIND.MASONRY;
  drawBox(S, -28.9, -18.4, -14, 26, garthLo - 0.6, garthY, COLORS.base, { top: COLORS.lawn, topKind: KIND.GROUND });
  drawBox(S, -18.4, -17.6, 15.5, 25.5, garthLo - 0.6, garthY, COLORS.base, { top: COLORS.pave, topKind: KIND.ROAD });
  S.kind = KIND.ROAD;
  drawBox(S, -28.9, -18.4, 5.0, 6.6, garthY, garthY + 0.06, COLORS.pave);
  drawBox(S, -24.4, -22.9, -14, 26, garthY, garthY + 0.06, COLORS.pave);
  S.kind = KIND.MASONRY;
  const wellPt = toWorld(-23.65, 5.8);
  S.cyl(wellPt[0], wellPt[1], garthY, garthY + 0.9, 0.9, 0.9, 8, COLORS.white);
  S.kind = KIND.PLAIN;
  drawBox(S, -44.5, -28.9, 20.5, 26, garthLo - 0.6, Math.min(eastY, chapelY) - 0.05, COLORS.pave, { topKind: KIND.ROAD });

  // garden court: three lawn terraces stepping down the slope, statue, and instanced trees lifted via S.stand
  const terraceSteps: [number, number][] = [[-2.9, 10], [10, 23], [23, 35.8]];
  const terraceLifts: [number, number, number, number, number][] = [];
  let prevY: number | null = null;
  for (const [u0, u1] of terraceSteps) {
    const [lo, hi] = groundRange(u0, u1, -14, 24.2);
    const terraceY = Math.min(prevY ?? 1e9, hi + 0.15);
    S.base = terraceY - LAND_Y;
    S.kind = KIND.MASONRY;
    drawBox(S, u0, u1, -14, 24.2, lo - 0.6, terraceY, COLORS.base, { top: COLORS.lawn, topKind: KIND.GROUND });
    S.kind = KIND.PLAIN;
    terraceLifts.push([u0, u1, -14, 24.2, terraceY]);
    if (Array.isArray(data.trees)) {
      for (let k = 0; k < 12; k++) {
        const hash1 = Math.sin((u0 + 7) * 3.1 + k * 17.23) * 9973.1;
        const hash2 = Math.sin((u0 + 3) * 5.7 + k * 29.71) * 7919.3;
        const fracU = hash1 - Math.floor(hash1);
        const fracV = hash2 - Math.floor(hash2);
        const treeU = u0 + 2.0 + fracU * (u1 - u0 - 4.0);
        const treeV = -12.0 + fracV * 34;
        if (u0 === 10 && Math.hypot(treeU - 16.5, treeV - 5.2) < 4.0) continue;
        const pt = toWorld(treeU, treeV);
        const scale = 9 + Math.floor(fracU * 4);
        data.trees.push(Math.round(pt[0] * 10), Math.round(pt[1] * 10), scale, k % 3 === 0 ? 3 : 1);
      }
    }
    if (u0 === 10) {
      const statuePt = toWorld(16.5, 5.2);
      S.kind = KIND.MASONRY;
      S.cyl(statuePt[0], statuePt[1], terraceY, terraceY + 1.4, 0.8, 0.7, 8, COLORS.base);
      S.kind = KIND.PLAIN;
      S.cyl(statuePt[0], statuePt[1], terraceY + 1.4, terraceY + 3.1, 0.38, 0.3, 8, COLORS.white);
      S.cyl(statuePt[0], statuePt[1], terraceY + 3.1, terraceY + 3.5, 0.24, 0.12, 6, COLORS.white);
    }
    prevY = terraceY - 0.9;
  }
  (S.stand = S.stand || []).push((x: number, z: number) => {
    const dx = x - ORIGIN[0];
    const dz = z - ORIGIN[1];
    const uPos = dx * AXIS_U[0] + dz * AXIS_U[1];
    const vPos = dx * AXIS_V[0] + dz * AXIS_V[1];
    for (const [u0, u1, v0, v1, y] of terraceLifts) {
      if (uPos >= u0 && uPos <= u1 && vPos >= v0 && vPos <= v1) return Math.max(0, y - groundY(x, z));
    }
    return 0;
  });
}

// the stone stair up the hill (OSM steps 1580312663) with cheek walls and lamp posts
function buildHillStair(S): [number, number, number][] {
  const lamps: [number, number, number][] = [];
  const dx = HILL_STAIR_END[0] - HILL_STAIR_START[0];
  const dz = HILL_STAIR_END[1] - HILL_STAIR_START[1];
  const totalLen = Math.hypot(dx, dz);
  const dirX = dx / totalLen;
  const dirZ = dz / totalLen;
  const angle = Math.atan2(dirZ, dirX);
  const sideX = -dirZ;
  const sideZ = dirX;
  const startVert = S.n;
  const stepCount = Math.round(totalLen / 0.42);
  let prevY = -1e9;

  S.kind = KIND.ROAD;
  for (let i = 0; i < stepCount; i++) {
    const frac = (i + 0.5) / stepCount;
    const x = HILL_STAIR_START[0] + dx * frac;
    const z = HILL_STAIR_START[1] + dz * frac;
    const gy = groundY(x, z);
    const stepY = Math.max(prevY, Math.round((gy + 0.12) / 0.17) * 0.17);
    S.box(x, z, gy - 1.0, stepY, totalLen / stepCount + 0.03, 3.2, angle, COLORS.pave);
    prevY = stepY;
    if (i % 14 === 7) {
      for (const side of [-1, 1]) lamps.push([x + sideX * side * 2.1, z + sideZ * side * 2.1, stepY]);
    }
  }
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) {
    for (let i = 0; i < stepCount; i += 6) {
      const frac = (i + 3) / stepCount;
      const x = HILL_STAIR_START[0] + dx * frac + sideX * side * 1.75;
      const z = HILL_STAIR_START[1] + dz * frac + sideZ * side * 1.75;
      const gy = groundY(x, z);
      S.box(x, z, gy - 0.8, gy + 0.45, (6 * totalLen) / stepCount + 0.05, 0.3, angle, COLORS.base);
    }
  }
  S.kind = KIND.PLAIN;
  for (const [x, z, y] of lamps) {
    S.cyl(x, z, y, y + 2.6, 0.08, 0.06, 6, COLORS.lampPost);
    S.box(x, z, y + 2.6, y + 3.1, 0.34, 0.34, angle, COLORS.lampGlass);
    S.box(x, z, y + 3.1, y + 3.25, 0.5, 0.5, angle, COLORS.lampPost);
  }
  (S.paved = S.paved || []).push([startVert, S.n]);
  return lamps;
}

// the grotto of Our Lady: dark rock mound, niche, white statue with blue sash, kneeler paving
function buildGrotto(S) {
  const gy = groundY(GROTTO_CENTER[0], GROTTO_CENTER[1]);
  const toPathAngle = Math.atan2(6371.0 - GROTTO_CENTER[1], -671.0 - GROTTO_CENTER[0]);
  const startVert = S.n;
  S.base = gy - LAND_Y;
  S.kind = KIND.MASONRY;
  const fwdX = Math.cos(toPathAngle);
  const fwdZ = Math.sin(toPathAngle);
  for (const [lat, back, sx, sz, height] of GROTTO_BLOCKS) {
    const x = GROTTO_CENTER[0] - fwdZ * lat - fwdX * back;
    const z = GROTTO_CENTER[1] + fwdX * lat - fwdZ * back;
    S.box(x, z, gy - 0.6, gy + height, sx, sz, toPathAngle + lat * 0.3, shade(COLORS.rock, 0.9 + 0.05 * (back + 2) / 2), { taper: 0.6 });
  }
  S.kind = KIND.PLAIN;
  const nicheX = GROTTO_CENTER[0] + fwdX * 1.55;
  const nicheZ = GROTTO_CENTER[1] + fwdZ * 1.55;
  S.box(nicheX, nicheZ, gy + 0.6, gy + 3.0, 0.15, 1.5, toPathAngle, COLORS.grottoNiche);
  const statueX = GROTTO_CENTER[0] + fwdX * 1.75;
  const statueZ = GROTTO_CENTER[1] + fwdZ * 1.75;
  S.cyl(statueX, statueZ, gy + 1.0, gy + 2.2, 0.28, 0.2, 8, COLORS.white);
  S.cyl(statueX, statueZ, gy + 1.55, gy + 1.7, 0.27, 0.25, 8, COLORS.sashBlue);
  S.cyl(statueX, statueZ, gy + 2.2, gy + 2.45, 0.13, 0.09, 6, COLORS.white);
  S.kind = KIND.ROAD;
  S.box(GROTTO_CENTER[0] + fwdX * 3.6, GROTTO_CENTER[1] + fwdZ * 3.6, gy - 0.4, gy + 0.12, 3.2, 4.0, toPathAngle, COLORS.pave);
  (S.paved = S.paved || []).push([startVert, S.n]);
}

// the three mapped outbuildings east of the cloister and the square hipped house east of the east wing
function buildOutbuildings(S, data) {
  const site = data.sites && data.sites[id];
  for (const item of (site && site.items) || []) {
    if (item.k !== 'b' || !item.ring || item.ring.length < 6 || String(item.n || '').length) continue;
    const box = obb(unflat(item.ring));
    if (box.w < 1) continue;
    // the long block south-east of the cloister: its OSM outline lies 6 m south of the building on the satellite
    if (Math.hypot(box.c[0] + 660.4, box.c[1] - 6471.0) < 3) box.c = [box.c[0] + 0.5, box.c[1] - 6.0];
    const ux = Math.cos(box.a);
    const uz = Math.sin(box.a);
    const cornerPts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [
      box.c[0] + ux * sx * box.w / 2 - uz * sz * box.d / 2,
      box.c[1] + uz * sx * box.w / 2 + ux * sz * box.d / 2,
    ]);
    const cornerYs = cornerPts.map((pt) => groundY(pt[0], pt[1]));
    const baseY = Math.max(...cornerYs) + 0.2;
    const footY = Math.min(...cornerYs) - 0.5;
    S.base = baseY - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(box.c[0], box.c[1], footY, baseY + 3.4, box.w, box.d, box.a, COLORS.creamTrim, { top: shade(COLORS.tile, 0.8) });
    S.kind = KIND.PLAIN;
    const winCount = Math.max(1, Math.floor(box.w / 3.2));
    for (const side of [-1, 1]) {
      for (let i = 0; i < winCount; i++) {
        const along = (i + 0.5 - winCount / 2) * (box.w / winCount);
        S.box(box.c[0] + ux * along - uz * side * (box.d / 2 + 0.04), box.c[1] + uz * along + ux * side * (box.d / 2 + 0.04), baseY + 0.9, baseY + 2.4, 1.0, 0.1, box.a, COLORS.dark);
      }
    }
    S.hip(box.c[0], box.c[1], box.w, box.d, box.a, baseY + 3.4, Math.min(2.4, box.d * 0.34), COLORS.tile, { over: 0.6, flare: 0.25, fascia: 0.2, fasciaCol: COLORS.ridge });
  }

  // square one-storey house under a weathered hip roof east of the east wing
  const [lo, hi] = groundRange(-54, -45.4, 8.1, 16.7);
  const houseY = hi + 0.2;
  S.base = houseY - LAND_Y;
  S.kind = KIND.MASONRY;
  drawBox(S, -54, -45.4, 8.1, 16.7, lo - 0.5, houseY + 3.4, COLORS.creamTrim, { top: shade(COLORS.tile, 0.8) });
  S.kind = KIND.PLAIN;
  for (const vPos of [10.4, 14.4]) drawBox(S, -54.08, -53.95, vPos - 0.5, vPos + 0.5, houseY + 0.9, houseY + 2.4, COLORS.dark);
  drawRoof(S, -54, -45.4, 8.1, 16.7, houseY + 3.4, 2.6, COLORS.weatheredRoof, { over: 0.7, flare: 0.2, ridgeCol: null, fascia: 0 });
}

// night: the tower's lit cross, stair lamps, forecourt and chapel windows
function buildNightLights(group, towerTop: { center: [number, number]; topY: number }, lamps: [number, number, number][], forecourtY: number, chapelFloorY: number) {
  const lightBuf = new Buf(64);
  const { center, topY } = towerTop;
  lightBuf.beam([center[0], topY - 0.05, center[1]], [center[0], topY + 2.15, center[1]], 0.3, 0.3, [1, 1, 1]);
  lightBuf.beam([center[0] - AXIS_V[0] * 0.65, topY + 1.4, center[1] - AXIS_V[1] * 0.65], [center[0] + AXIS_V[0] * 0.65, topY + 1.4, center[1] + AXIS_V[1] * 0.65], 0.28, 0.28, [1, 1, 1]);
  const crossMesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(0xf4f1ff, 1.4));
  crossMesh.renderOrder = 19;

  const positions: number[] = [];
  const colors: number[] = [];
  for (const [x, z, y] of lamps) {
    positions.push(x, y + 2.85, z);
    colors.push(1, 0.82, 0.52);
  }
  for (const vPos of [CHAPEL_AXIS_V - 5, CHAPEL_AXIS_V + 5]) {
    const pt = toWorld(-57.2, vPos);
    positions.push(pt[0], forecourtY + 1.4, pt[1]);
    colors.push(1, 0.82, 0.52);
  }
  const porticoPt = toWorld(-47.6, CHAPEL_AXIS_V);
  positions.push(porticoPt[0], chapelFloorY + 4.0, porticoPt[1]);
  colors.push(1, 0.85, 0.6);
  for (let uPos = -38; uPos <= -22; uPos += 7.6) {
    const pt = toWorld(uPos, 25.2);
    positions.push(pt[0], chapelFloorY + 2.0, pt[1]);
    colors.push(0.7, 0.75, 1);
  }
  const glow = glowPoints(positions, colors, 4);
  glow.userData.glow = true;
  for (const mesh of [crossMesh, glow]) {
    mesh.userData.landmark = id;
    group.add(mesh);
  }
}

export function build({ data, S, group }) {
  const chapelY = Math.max(
    groundRange(-48.8, -17.6, 25.5, 50.4)[1],
    groundRange(-17.6, 7.6, 24.2, 49.9)[1],
    groundRange(-17.6, -5, 15.5, 63.5)[1],
  ) + 0.25;
  const forecourtY = groundRange(-62, -50, CHAPEL_AXIS_V - 12, CHAPEL_AXIS_V + 11)[1] - 0.3;
  const chapelFloorY = forecourtY + 1.5;

  buildCryptAndLongRange(S, chapelY);
  buildChapelNaveAndFront(S, chapelFloorY);

  const pavedStart = S.n;
  buildForecourtAndStair(S, forecourtY, chapelFloorY);
  const towerTop = buildBellTower(S);
  buildMonasteryRangesAndCourts(S, data, chapelY);
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  const lamps = buildHillStair(S);
  buildGrotto(S);
  buildOutbuildings(S, data);
  S.kind = KIND.PLAIN;
  S.base = 0;

  buildNightLights(group, towerTop, lamps, forecourtY, chapelFloorY);
}
