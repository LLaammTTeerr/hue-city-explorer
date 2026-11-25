import polygonClipping from 'polygon-clipping';
import { KIND, hex, shade, mix, unflat, inRing, rand } from '../../geo/buf.ts';
import { LAND_Y, WALL_H, PAL } from '../../config.ts';
import { gateAxis, rectRing, CITADEL_PASSAGE } from '../../geo/gates.ts';

// Kinh thành Huế: the Citadel's rampart (1805-1832), Vauban-style under Gia Long and Minh Mạng.
//
// Sourced (see docs/places/kinhthanh.md): about 10 km round (9,949 m without Trấn Bình Đài), 6.6 m high, about 21 m
// thick; an earth core faced with brick on both sides (inner and outer), the faces bricked from the end of Gia Long's
// reign; 24 bastions, five on each side and four at the corners, each with a powder magazine; embrasures (lỗ châu mai)
// three on each flank and five on each face of a bastion; outside, a 10 m path between the wall foot and a moat
// 22.8 m wide and 4 m deep.
//
// The plan is the mapped wall band (OSM relation 8541343, data.wall[0]): it zigzags round the bastions on both of its
// edges, so each bastion is a hollow arrowhead with the rampart running round it, as at Huế. The moat and the path
// beside it are the mapped water and ground and are left as they are.
//
// What this adds to the plain extruded band that city.js drew before:
//   - a battered outer face (0.75 m in over the height, estimated), upright again where it meets a gate;
//   - a projecting brick cordon about 0.75 m below the top of the outer face (seen at Thượng Tứ; size estimated),
//     stopping at the gates;
//   - a parapet (nữ tường) on the outer edge only, about 1.1 m above the wall walk (estimated): plain along the
//     curtains, with the embrasures cut through it on the bastions' faces and flanks only;
//   - the brick as it reads today: a muted red-brown with soft dark streaks running down from under the cordon and
//     faint relaid blotches, all kept off the gate fronts;
//   - a dry-grass strip on the mapped ground between the wall foot and the moat (the berm), short of the water;
//   - a grassed wall walk (trees on it come from the foliage pass: the band is kept out of the landmark cover).
// The gate slots are cut exactly as city.js cuts them, so the gate models still carry the passage through.
export const id = 'kinhthanh';

const PARAPET_H = 1.1; // above the walk (estimate: photos show a chest-high nữ tường on the outer edge)
const PARAPET_T = 1.4; // thickness (estimate)
const EMBRASURE_W = 0.9; // width of a lỗ châu mai
const EMBRASURE_SILL = 0.45; // what is left of the parapet under an embrasure
// The outer face from the Thượng Tứ bridge (Google Street View, car pano, 2026): it leans back visibly, and a
// projecting brick cordon runs its whole length about a quarter of the visible height below the parapet's top.
// Sizes are estimates read from that view; no source gives them.
const BATTER_OUT = 0.75; // how far the outer foot stands out beyond the top edge (about 1:9)
const BATTER_IN = 0; // the inner face, towards the city, is drawn upright
const CORDON_DROP = 0.75; // the cordon's middle, below the wall walk
const CORDON_H = 0.32;
const CORDON_PROUD = 0.22; // how far it stands proud of the face
const BERM_WIDTH = 6; // how much of the path beside the wall is drawn grassed (the source gives a 10 m path)
const WATER_GRID_CELL = 20;

// Brick colour matched to Google Street View from the Cửa Thượng Tứ bridge (car pano, 2026): in daylight the faces
// read a warm, muted red-brown with darker blotches, not the near-black grey of PAL.brick. The streaks stay, but
// fewer and warmer, so the wall still reads weathered.
const WALL_BRICK = mix(PAL.brick, hex('#8a6a58'), 0.75);
const COLORS = {
  brick: WALL_BRICK,
  dark: hex('#4e443c'),
  relaid: hex('#86705f'),
  lichen: hex('#55553f'),
  parapet: shade(WALL_BRICK, 0.96),
  cap: mix(WALL_BRICK, hex('#b39c88'), 0.55), // lighter, flatter coping as on the real parapet
  cordon: mix(WALL_BRICK, hex('#b8a28e'), 0.5),
  cordonTop: mix(WALL_BRICK, hex('#c4b09c'), 0.6), // its top catches the light
  walk: PAL.moss,
  berm: mix(PAL.moss, hex('#9a9a62'), 0.35), // dry grass, as the berm reads in Street View
};

// The straight runs of the mapped band, before the gate slots cut it: a curtain is a run of 120 m or more (130-240 m
// at Huế), a bastion's face or flank a shorter one. The mapped line has a few extra vertices along some curtains and
// a gate slot cuts a curtain in two, so an edge is judged by the whole run it lies on, not by its own length.
function buildStraightRuns(band) {
  const runs = [];
  for (const ring of band.map(unflat)) {
    const segs = ring.map((pt, i) => [pt, ring[(i + 1) % ring.length]]).filter(([ptA, ptB]) => Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]) > 0.05);
    const segDir = ([ptA, ptB]) => Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    const turnAngle = (segA, segB) => Math.abs(Math.atan2(Math.sin(segDir(segB) - segDir(segA)), Math.cos(segDir(segB) - segDir(segA))));
    // start where the line turns, so no run is split at the ring's seam
    let startIdx = segs.findIndex((seg, i) => turnAngle(segs[(i - 1 + segs.length) % segs.length], seg) > 0.14);
    if (startIdx < 0) startIdx = 0;
    let currRun = null;
    for (let j = 0; j < segs.length; j++) {
      const seg = segs[(startIdx + j) % segs.length];
      if (!currRun || turnAngle(currRun.segs[currRun.segs.length - 1], seg) > 0.14) runs.push(currRun = { segs: [], len: 0 });
      currRun.segs.push(seg);
      currRun.len += Math.hypot(seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]);
    }
  }
  return (midX, midZ, dirX, dirZ) => {
    for (const run of runs) {
      for (const [ptA, ptB] of run.segs) {
        const dx = ptB[0] - ptA[0];
        const dz = ptB[1] - ptA[1];
        const len = Math.hypot(dx, dz);
        if (Math.abs((dx / len) * dirZ - (dz / len) * dirX) > 0.05) continue; // not parallel
        const proj = ((midX - ptA[0]) * dx + (midZ - ptA[1]) * dz) / (len * len);
        if (proj < -0.01 || proj > 1.01) continue;
        if (Math.abs((midX - ptA[0]) * (dz / len) - (midZ - ptA[1]) * (dx / len)) < 0.5) return run.len;
      }
    }
    return 0;
  };
}

// The mapped water's edge near the wall (data.land's boundary), for the grassed berm between the wall foot and the
// moat: segments within reach of the band, bucketed on a 20 m grid
function createWaterDistanceLookup(data, allRings) {
  const flatPts = allRings.flat();
  const minX = Math.min(...flatPts.map((pt) => pt[0])) - 40;
  const maxX = Math.max(...flatPts.map((pt) => pt[0])) + 40;
  const minZ = Math.min(...flatPts.map((pt) => pt[1])) - 40;
  const maxZ = Math.max(...flatPts.map((pt) => pt[1])) + 40;
  const grid = new Map();
  const cellKey = (gi, gj) => gi * 100003 + gj;
  for (const poly of data.land || []) {
    for (const flatRing of poly) {
      for (let i = 0; i + 1 < flatRing.length; i += 2) {
        const j = (i + 2) % flatRing.length;
        const x1 = flatRing[i] / 10;
        const z1 = flatRing[i + 1] / 10;
        const x2 = flatRing[j] / 10;
        const z2 = flatRing[j + 1] / 10;
        if (Math.max(x1, x2) < minX || Math.min(x1, x2) > maxX || Math.max(z1, z2) < minZ || Math.min(z1, z2) > maxZ) continue;
        for (let gi = Math.floor(Math.min(x1, x2) / WATER_GRID_CELL); gi <= Math.floor(Math.max(x1, x2) / WATER_GRID_CELL); gi++) {
          for (let gj = Math.floor(Math.min(z1, z2) / WATER_GRID_CELL); gj <= Math.floor(Math.max(z1, z2) / WATER_GRID_CELL); gj++) {
            const key = cellKey(gi, gj);
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push([x1, z1, x2, z2]);
          }
        }
      }
    }
  }
  // how far from (x, z) along (dx, dz) the ground ends at the water, within maxDist (Infinity if it does not)
  return (x, z, dx, dz, maxDist) => {
    let best = Infinity;
    const seen = new Set();
    for (let dist = 0; dist <= maxDist + WATER_GRID_CELL; dist += WATER_GRID_CELL / 2) {
      const key = cellKey(Math.floor((x + dx * Math.min(dist, maxDist)) / WATER_GRID_CELL), Math.floor((z + dz * Math.min(dist, maxDist)) / WATER_GRID_CELL));
      for (const seg of grid.get(key) || []) {
        if (seen.has(seg)) continue;
        seen.add(seg);
        const ex = seg[2] - seg[0];
        const ez = seg[3] - seg[1];
        const denom = dx * ez - dz * ex;
        if (Math.abs(denom) < 1e-9) continue;
        const paramT = ((seg[0] - x) * ez - (seg[1] - z) * ex) / denom;
        const paramU = ((seg[0] - x) * dz - (seg[1] - z) * dx) / denom;
        if (paramT >= 0 && paramT <= maxDist && paramU >= 0 && paramU <= 1) best = Math.min(best, paramT);
      }
    }
    return best;
  };
}

function buildEdgeDetails(S, edge, prevSlot, nextSlot, context) {
  const { a: startPt, len, ux, uz, nx, nz, outer } = edge;
  const { wallWalkY, wallH, nearGate, underGate, toWater, runLen } = context;
  const angle = Math.atan2(uz, ux);
  const seed = Math.round(startPt[0] * 7 + startPt[1] * 13);
  // a patch on the battered face: off the face by `lift`, following its slope
  const addFacePatch = (s0, s1, y0, y1, color, lift = 0.04) => {
    const facePt = (along, y) => {
      const out = lift + (edge.ba + (edge.bb - edge.ba) * (along / len)) * (wallWalkY - y) / wallH;
      return [startPt[0] + ux * along + nx * out, y, startPt[1] + uz * along + nz * out];
    };
    S.quad(facePt(s0, y0), facePt(s1, y0), facePt(s1, y1), facePt(s0, y1), color, [nx * wallH, Math.max(edge.ba, edge.bb, 0.001), nz * wallH]);
  };
  // Weathering as it reads from the Thượng Tứ bridge: soft, irregular darkening that runs down from the top
  // where rain leaves the walk, and a few faint lighter blotches. Each streak is cut into narrow strips of
  // different lengths, so its lower edge is ragged and nothing reads as a doorway or a blocked window.
  const streakTopY = outer ? wallWalkY - CORDON_DROP - CORDON_H / 2 : wallWalkY; // on the outer face the streaks start under the cordon
  for (let pos = rand(seed, 2) * 8; pos < len - 1; pos += 6 + rand(seed + pos, 3) * 10) {
    const patchW = Math.min(len - pos, 2 + rand(seed + pos, 4) * 6);
    const kindRoll = rand(seed + pos, 5);
    if (underGate(startPt[0] + ux * (pos + patchW / 2) + nx * 0.3, startPt[1] + uz * (pos + patchW / 2) + nz * 0.3)) continue;
    if (kindRoll < 0.55) {
      const col = mix(COLORS.brick, mix(COLORS.dark, COLORS.lichen, rand(seed + pos, 7) * 0.6), 0.3 + rand(seed + pos, 6) * 0.2);
      const dropFrac = 0.25 + rand(seed + pos, 8) * 0.5; // how far down the face it runs, as a share of the face
      const stripCount = 3 + Math.floor(rand(seed + pos, 9) * 3);
      for (let j = 0; j < stripCount; j++) {
        const s0 = pos + (patchW * j) / stripCount;
        const s1 = pos + (patchW * (j + 1)) / stripCount;
        const taper = 1 - Math.abs((j + 0.5) / stripCount - 0.5) * 1.2; // longest in the middle
        const botY = Math.max(LAND_Y + 0.3, streakTopY - (streakTopY - LAND_Y) * dropFrac * (0.45 + 0.55 * taper) * (0.75 + rand(seed + pos, 20 + j) * 0.5));
        addFacePatch(s0, s1, botY, streakTopY, col);
      }
    } else if (kindRoll < 0.7) {
      // a faint blotch of lighter, relaid brick: a cluster of offset pieces, low contrast
      const col = mix(COLORS.brick, COLORS.relaid, 0.45);
      const midY = LAND_Y + 1.5 + rand(seed + pos, 10) * (streakTopY - LAND_Y - 3);
      for (let j = 0; j < 3; j++) {
        const s0 = pos + rand(seed + pos, 30 + j) * patchW * 0.5;
        const pieceW = patchW * (0.3 + rand(seed + pos, 40 + j) * 0.4);
        const pieceH = 0.5 + rand(seed + pos, 50 + j) * 1.1;
        const offsetY = (rand(seed + pos, 60 + j) - 0.5) * 1.2;
        addFacePatch(s0, Math.min(len, s0 + pieceW), midY + offsetY - pieceH / 2, midY + offsetY + pieceH / 2, col, 0.05 + j * 0.006);
      }
    }
  }

  if (!outer) return;
  // the berm: a grassed strip on the mapped ground between the wall foot and the moat's edge, stopping short of
  // the water, the gate bridges and the gates (Street View from the Thượng Tứ bridge shows grass from the foot
  // to the revetment)
  S.kind = KIND.GROUND;
  for (let startS = 0; startS < len - 0.5; startS += 3) {
    const endS = Math.min(len, startS + 3);
    const midS = (startS + endS) / 2;
    const footOut = edge.ba + (edge.bb - edge.ba) * (midS / len) + 0.05;
    const footX = startPt[0] + ux * midS + nx * footOut;
    const footZ = startPt[1] + uz * midS + nz * footOut;
    if (nearGate(footX, footZ) < 1 || underGate(footX, footZ)) continue;
    const bermW = Math.min(BERM_WIDTH, toWater(footX, footZ, nx, nz, BERM_WIDTH + 2) - 1.2);
    if (bermW < 1) continue;
    const out0 = edge.ba + (edge.bb - edge.ba) * (startS / len) + 0.05;
    const out1 = edge.ba + (edge.bb - edge.ba) * (endS / len) + 0.05;
    const bermY = LAND_Y + 0.03;
    const bermPt = (along, out): [number, number, number] => [startPt[0] + ux * along + nx * out, bermY, startPt[1] + uz * along + nz * out];
    S.quad(bermPt(startS, out0), bermPt(endS, out1), bermPt(endS, out1 + bermW), bermPt(startS, out0 + bermW), COLORS.berm, [0, 1, 0]);
  }
  S.kind = KIND.MASONRY;
  // the cordon: a rounded brick band standing proud of the face all along the outer edge, about a quarter of the
  // visible height below the parapet's top (Street View, Thượng Tứ bridge)
  const cornerLap = (isSlot) => (isSlot ? 0 : CORDON_PROUD + 0.1);
  const cordonS0 = -cornerLap(prevSlot);
  const cordonS1 = len + cornerLap(nextSlot);
  const cordonY = wallWalkY - CORDON_DROP;
  const cordonDepth = CORDON_PROUD + 0.3;
  const pointAlong = (along): [number, number] => [startPt[0] + ux * along + nx * 0.3, startPt[1] + uz * along + nz * 0.3];
  const cordonSpans = [];
  const sampleCount = Math.max(1, Math.ceil((cordonS1 - cordonS0) / 0.5));
  let spanStart = null;
  for (let j = 0; j <= sampleCount; j++) {
    const along = cordonS0 + ((cordonS1 - cordonS0) * j) / sampleCount;
    const isClear = !underGate(...pointAlong(along));
    if (isClear && spanStart === null) spanStart = along;
    if ((!isClear || j === sampleCount) && spanStart !== null) {
      if (along - spanStart > 0.3) cordonSpans.push([spanStart, along]);
      spanStart = null;
    }
  }
  for (const [spanS0, spanS1] of cordonSpans) {
    const midS = (spanS0 + spanS1) / 2;
    const faceOut = (edge.ba + (edge.bb - edge.ba) * Math.max(0, Math.min(1, midS / len))) * (wallWalkY - cordonY) / wallH; // the face's offset there
    S.box(
      startPt[0] + ux * midS + nx * (faceOut + CORDON_PROUD - cordonDepth / 2),
      startPt[1] + uz * midS + nz * (faceOut + CORDON_PROUD - cordonDepth / 2),
      cordonY - CORDON_H / 2,
      cordonY + CORDON_H / 2,
      spanS1 - spanS0,
      cordonDepth,
      angle,
      COLORS.cordon,
      { top: COLORS.cordonTop },
    );
    addFacePatch(Math.max(0, spanS0), Math.min(len, spanS1), cordonY - CORDON_H / 2 - 0.3, cordonY - CORDON_H / 2, mix(COLORS.brick, COLORS.dark, 0.45), 0.07); // its shadow
  }

  // the parapet along the outer edge: plain on the curtains; the embrasures are on the bastions (five on a face,
  // three on a flank)
  const paraBaseX = startPt[0] - nx * (PARAPET_T / 2);
  const paraBaseZ = startPt[1] - nz * (PARAPET_T / 2);
  const addParapetSeg = (s0, s1, topY) => {
    if (s1 - s0 < 0.05) return;
    const midS = (s0 + s1) / 2;
    S.box(paraBaseX + ux * midS, paraBaseZ + uz * midS, wallWalkY - 0.05, topY, s1 - s0, PARAPET_T, angle, COLORS.parapet, { top: COLORS.cap });
  };
  const wholeRunLen = runLen(edge.mx, edge.mz, ux, uz) || len;
  const embrasureCount = wholeRunLen < 120 ? (wholeRunLen > 60 ? 5 : 3) : 0;
  const paraS0 = prevSlot ? 0 : -0.7;
  const paraS1 = nextSlot ? len : len + 0.7; // lap the next edge's parapet at the corners
  if (!embrasureCount) {
    // a curtain: plain, its top worn a little uneven in long stretches
    let cursor = paraS0;
    while (cursor < paraS1) {
      const segLen = Math.min(paraS1 - cursor, 8 + rand(seed + cursor, 70) * 14);
      addParapetSeg(cursor, cursor + segLen, wallWalkY + PARAPET_H - rand(seed + cursor, 71) * 0.12);
      cursor += segLen;
    }
    return;
  }
  const spacing = len / (embrasureCount + 1);
  let cursor = paraS0;
  for (let j = 1; j <= embrasureCount; j++) {
    const centerS = j * spacing;
    addParapetSeg(cursor, centerS - EMBRASURE_W / 2, wallWalkY + PARAPET_H);
    addParapetSeg(centerS - EMBRASURE_W / 2, centerS + EMBRASURE_W / 2, wallWalkY + EMBRASURE_SILL);
    cursor = centerS + EMBRASURE_W / 2;
  }
  addParapetSeg(cursor, paraS1, wallWalkY + PARAPET_H);
}

export function build({ data, S, place }) {
  const band = (data.wall || [])[0];
  if (!band) throw new Error('no wall band in data.wall');
  const closeRing = (ring) => [...ring, ring[0]];
  const cityCenter = place ? [place.x, place.z] : [0, 0];

  // the gate slots, as city.js cuts them
  const gateSlots = [];
  const gateAxes = [];
  for (const gateRec of data.gates || []) {
    if (gateRec.k !== 'citadel') continue;
    const axis = gateAxis(gateRec, cityCenter);
    gateAxes.push(axis);
    gateSlots.push(rectRing(axis.cx, axis.cz, axis.plen + 14, CITADEL_PASSAGE.slot, axis.pa));
  }
  // the gate buildings are wider than their slot and stand against the wall's face: the batter fades out over 8 m
  // either side of a gate, and the cordon stops at the gate building, so neither runs through its front
  const nearGate = (x, z) => {
    let factor = 1;
    for (const axis of gateAxes) {
      const dx = x - axis.cx;
      const dz = z - axis.cz;
      const along = Math.abs(dx * axis.px + dz * axis.pz);
      const across = Math.abs(dz * axis.px - dx * axis.pz);
      if (along > axis.plen / 2 + 15) continue;
      factor = Math.min(factor, Math.max(0, Math.min(1, (across - axis.pwid / 2 - 1) / 8)));
    }
    return factor;
  };
  const underGate = (x, z) => gateAxes.some((axis) => {
    const dx = x - axis.cx;
    const dz = z - axis.cz;
    return Math.abs(dx * axis.px + dz * axis.pz) < axis.plen / 2 + 3 && Math.abs(dz * axis.px - dx * axis.pz) < axis.pwid / 2 + 0.3;
  });

  let bandParts = [band.map(unflat)];
  if (gateSlots.length) {
    try {
      bandParts = polygonClipping.difference(bandParts[0].map(closeRing), ...gateSlots.map((ring) => [closeRing(ring)])).map((poly) => poly.map((ring) => ring.slice(0, -1)));
    } catch { /* keep the wall whole */ }
  }

  const baseY = LAND_Y - 0.5;
  const wallWalkY = LAND_Y + WALL_H;
  const wallH = wallWalkY - baseY;
  const coverStart = S.n;
  S.kind = KIND.MASONRY;

  // every edge of the band, whether it faces out (towards the moat), in (towards the city) or is a gate slot's side
  const allRings = bandParts.flatMap((poly) => poly);
  const insideBand = (x, z) => bandParts.some((poly) => inRing(x, z, poly[0]) && !poly.slice(1).some((hole) => inRing(x, z, hole)));
  const countCrossings = (ax, az, bx, bz) => {
    let hits = 0;
    for (const ring of allRings) {
      for (let i = 0; i < ring.length; i++) {
        const ptA = ring[i];
        const ptB = ring[(i + 1) % ring.length];
        const d1 = (bx - ax) * (ptA[1] - az) - (bz - az) * (ptA[0] - ax);
        const d2 = (bx - ax) * (ptB[1] - az) - (bz - az) * (ptB[0] - ax);
        if ((d1 > 0) === (d2 > 0)) continue;
        const d3 = (ptB[0] - ptA[0]) * (az - ptA[1]) - (ptB[1] - ptA[1]) * (ax - ptA[0]);
        const d4 = (ptB[0] - ptA[0]) * (bz - ptA[1]) - (ptB[1] - ptA[1]) * (bx - ptA[0]);
        if ((d3 > 0) !== (d4 > 0)) hits++;
      }
    }
    return hits;
  };
  const onGateSlot = (x, z) => gateSlots.some((ring) => {
    for (let i = 0; i < 4; i++) {
      const ptA = ring[i];
      const ptB = ring[(i + 1) % 4];
      const dx = ptB[0] - ptA[0];
      const dz = ptB[1] - ptA[1];
      const lenSq = dx * dx + dz * dz;
      const proj = Math.max(0, Math.min(1, ((x - ptA[0]) * dx + (z - ptA[1]) * dz) / lenSq));
      if (Math.hypot(ptA[0] + dx * proj - x, ptA[1] + dz * proj - z) < 0.4) return true;
    }
    return false;
  });

  const runLen = buildStraightRuns(band);
  const toWater = createWaterDistanceLookup(data, allRings);
  const detailContext = { wallWalkY, wallH, nearGate, underGate, toWater, runLen };

  for (const rings of bandParts) {
    // the core: the grassed walk on top; its vertical sides stand just inside the battered faces drawn below
    S.prism(rings[0], baseY, wallWalkY, COLORS.brick, COLORS.walk, { holes: rings.slice(1), topKind: KIND.GROUND });
    for (const ring of rings) {
      // each edge: its normal out of the band, whether it faces the moat, whether it is a gate slot's side
      const edges = ring.map((ptA, i) => {
        const ptB = ring[(i + 1) % ring.length];
        const dx = ptB[0] - ptA[0];
        const dz = ptB[1] - ptA[1];
        const len = Math.hypot(dx, dz);
        if (len < 1e-6) return { a: ptA, b: ptB, len, ux: 1, uz: 0, nx: 0, nz: 0, outer: false, slot: true, ba: 0, bb: 0 };
        const ux = dx / len;
        const uz = dz / len;
        let nx = uz;
        let nz = -ux;
        const mx = (ptA[0] + ptB[0]) / 2;
        const mz = (ptA[1] + ptB[1]) / 2;
        if (insideBand(mx + nx * 0.6, mz + nz * 0.6)) {
          nx = -nx;
          nz = -nz;
        }
        const slot = onGateSlot(mx, mz);
        const outer = !slot && countCrossings(mx + nx * 2, mz + nz * 2, cityCenter[0], cityCenter[1]) > 0;
        return {
          a: ptA, b: ptB, len, ux, uz, nx, nz, mx, mz, outer, slot,
          ba: outer ? BATTER_OUT * nearGate(ptA[0], ptA[1]) : BATTER_IN,
          bb: outer ? BATTER_OUT * nearGate(ptB[0], ptB[1]) : BATTER_IN,
        };
      });
      // the foot of each corner, pushed out so that the faces either side keep their batter; where a face meets a gate
      // slot the foot goes straight out from that face and a small end cap closes the wedge, so the slot's side stays
      // upright and the passage clear for the gate model
      const footPts = edges.map((edge, i) => {
        const prev = edges[(i - 1 + edges.length) % edges.length];
        if (prev.slot || edge.slot) {
          const refEdge = prev.slot ? edge : prev;
          const refBatter = prev.slot ? edge.ba : prev.bb;
          return refEdge.slot ? [edge.a[0], edge.a[1]] : [edge.a[0] + refEdge.nx * refBatter, edge.a[1] + refEdge.nz * refBatter];
        }
        const det = prev.nx * edge.nz - prev.nz * edge.nx;
        let vx;
        let vz;
        const prevB = prev.bb;
        const edgeB = edge.ba;
        if (Math.abs(det) < 0.05) {
          vx = edge.nx * Math.max(edgeB, prevB);
          vz = edge.nz * Math.max(edgeB, prevB);
        } else {
          vx = (prevB * edge.nz - edgeB * prev.nz) / det;
          vz = (edgeB * prev.nx - prevB * edge.nx) / det;
        }
        const miterLen = Math.hypot(vx, vz);
        const miterCap = 3 * BATTER_OUT;
        if (miterLen > miterCap) {
          vx *= miterCap / miterLen;
          vz *= miterCap / miterLen;
        }
        return [edge.a[0] + vx, edge.a[1] + vz];
      });
      edges.forEach((edge, i) => {
        const prev = edges[(i - 1 + edges.length) % edges.length];
        const next = edges[(i + 1) % edges.length];
        if (edge.len < 1e-6 || edge.slot || (!edge.ba && !edge.bb && !prev.bb && !next.ba)) return;
        const footA = footPts[i];
        const footB = footPts[(i + 1) % edges.length];
        const faceNorm = [edge.nx * wallH, Math.max(edge.ba, edge.bb, 0.001), edge.nz * wallH];
        S.quad([footA[0], baseY, footA[1]], [footB[0], baseY, footB[1]], [edge.b[0], wallWalkY, edge.b[1]], [edge.a[0], wallWalkY, edge.a[1]], COLORS.brick, faceNorm);
        if (!edge.outer) return;
        // end caps against a slot
        if (prev.slot) S.tri([edge.a[0], wallWalkY, edge.a[1]], [edge.a[0], baseY, edge.a[1]], [footA[0], baseY, footA[1]], COLORS.brick, [-edge.ux, 0, -edge.uz]);
        if (next.slot) S.tri([edge.b[0], wallWalkY, edge.b[1]], [edge.b[0], baseY, edge.b[1]], [footB[0], baseY, footB[1]], COLORS.brick, [edge.ux, 0, edge.uz]);
      });

      edges.forEach((edge, i) => {
        if (edge.len < 1.5 || edge.slot) return;
        const prevSlot = edges[(i - 1 + edges.length) % edges.length].slot;
        const nextSlot = edges[(i + 1) % edges.length].slot;
        buildEdgeDetails(S, edge, prevSlot, nextSlot, detailContext);
      });
    }
  }
  S.kind = KIND.PLAIN;
  // the walk is planted ground: keep it out of the landmark cover, as city.js did for the rampart
  (S.noCover = S.noCover || []).push([coverStart, S.n]);
}
