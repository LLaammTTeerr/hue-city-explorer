import { KIND, hex, shade, unflat } from '../../geo/buf.ts';
import { gateAxis } from '../../geo/gates.ts';
import { LAND_Y, WALL_H, PAL } from '../../config.ts';

// Cửa Quảng Đức (廣德門), a south gate of the Kinh thành Huế, facing the Hương River between Cửa Ngăn and Cửa Nhà
// Đồ. Notes and sources: docs/places/gate-cua-quang-duc.md.
//
// Sourced: one of the ten main gates, all built in 1809; its watch tower (vọng lâu) added in 1829; the gate with its
// tower about 16 m high in all ("mỗi cửa 3 tầng, cao chừng 16m"), the tower rising more than 9 m above the wall top;
// people call it Cửa Sập, after it fell in a flood, and it has since been rebuilt; Hàm Nghi left the capital through
// it in 1885. The rampart here is 6.6 m high. Plan, centre and axis: the OSM gate building (way 173609941, 16.8 m
// along the wall × 12.6 m), the passage the street runs through (way 173609940) and Cầu Quảng Đức over the moat
// (way 39417336 / 1431132255, drawn as a road bridge by the shared bridge code, not here). The OSM plan sits within
// about 1 m of the satellite image, its axis within a degree or two (2026 check), so it is used as it is.
//
// Proportions from street-level and satellite imagery (2026), scaled to the block's 16.8 m width: one round-arched
// passage about 3.8 m wide and 5.4 m to the crown; the gate block's flat roof 8.4 m up, a plain solid parapet round
// it with square posts at the corners; the outer face weathered grey render, the arch set in a raised rectangular
// frame under a small name plaque; the inner face darker, its arch bay between two short projecting piers that stop
// near the arch's crown under bud-shaped caps. On the inner side a parapeted ramp climbs along the wall top to the
// gate's platform either side, its face carrying the same frieze of light panels as the block. The vọng lâu is
// masonry, not timber: a rendered storey about 8.4 × 6.8 m, with a large arched opening between two small ones on
// the outer face, an arched niche between two round medallions on the inner and an arched opening on each end,
// under a skirt of weathered grey-brown tiles; on it a small storey about 4.6 × 4 m pierced front to back by an
// arch, under a steep little hip roof of the same tiles with small pointed ridge and corner ornaments and a short
// pole. Heavy timber door leaves stand open inside the outer mouth (not visible in the imagery; kept from the
// earlier estimate).
export const id = 'gate:Cửa Quảng Đức';
const GATE_NAME = 'Cửa Quảng Đức';

const OPEN_W = 3.8;
const OPEN_H = 5.4; // the passage (city.js and kinhthanh.js cut a 5.6 m slot)
const TOP_RISE = 1.8; // the block's flat roof above the wall walk (8.4 m above the street)
const PARAPET_H = 1.0; // the solid parapet round that roof
const ARCH_SEGS = 10;

const COLORS = {
  body: hex('#77716a'),
  inner: hex('#5f5953'),
  damp: hex('#4c4943'),
  frame: hex('#8e877c'),
  cornice: hex('#8a847a'),
  dark: hex('#1f1a18'),
  door: hex('#4a2c1e'),
  plaque: hex('#d8ccb0'),
  plaqueIn: hex('#3b3430'),
  tower: hex('#84806f'),
  medal: hex('#a39c8f'),
  tile: hex('#7a6455'),
  tileEdge: hex('#5a4a40'),
  pole: hex('#cfcfcf'),
};

function findRampartFaces(data, cx, cz, px, pz, pwid) {
  // where the rampart's faces cross the passage axis: the block reaches a hand's breadth past both
  let vIn = -pwid * 0.375;
  let vOut = pwid * 0.375;
  const hits = [];
  for (const poly of data.wall || []) {
    for (const ring of poly.map(unflat)) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const edgeX = b[0] - a[0];
        const edgeZ = b[1] - a[1];
        const denom = px * edgeZ - pz * edgeX;
        if (Math.abs(denom) < 1e-9) continue;
        const qx = a[0] - cx;
        const qz = a[1] - cz;
        const dist = (qx * edgeZ - qz * edgeX) / denom;
        const frac = (qx * pz - qz * px) / denom;
        if (frac >= 0 && frac <= 1 && Math.abs(dist) < 20) hits.push(dist);
      }
    }
  }
  const innerHits = hits.filter((dist) => dist < 0);
  const outerHits = hits.filter((dist) => dist > 0);
  if (innerHits.length) vIn = Math.min(...innerHits) - 0.4;
  if (outerHits.length) vOut = Math.max(...outerHits) + 0.4;
  return { vIn, vOut };
}

function buildGateBlockAndFaces(S, frame, vIn, vOut, blockW, y0, topY, floorY, radius, crownY, springY) {
  const { toWorld, vertex, normal, box } = frame;
  const arcPt = (k, rad = radius) => {
    const theta = Math.PI - (Math.PI * k) / ARCH_SEGS;
    return [rad * Math.cos(theta), springY + rad * Math.sin(theta)];
  };

  // ---- the gate block, the passage driven through it ----
  S.kind = KIND.MASONRY;
  for (const [v, sign] of ([[vIn, -1], [vOut, 1]] as any[])) {
    const faceNorm = normal(0, sign);
    const faceCol = sign > 0 ? COLORS.body : COLORS.inner;
    const faceQuad = (u0, u1, ya, yb) => S.quad(vertex(u0, v, ya), vertex(u1, v, ya), vertex(u1, v, yb), vertex(u0, v, yb), faceCol, faceNorm);
    const [ua, ub] = sign > 0 ? [-1, 1] : [1, -1]; // keep the quads facing out
    faceQuad(ua * blockW / 2, ua * radius, y0, topY);
    faceQuad(ub * radius, ub * blockW / 2, y0, topY);
    faceQuad(ua * radius, ub * radius, crownY, topY);
    for (let k = 0; k < ARCH_SEGS; k++) { // spandrels between the arch and the crown
      const [sa, ya] = arcPt(k);
      const [sb, yb] = arcPt(k + 1);
      if (sign > 0) S.quad(vertex(sa, v, ya), vertex(sb, v, yb), vertex(sb, v, crownY), vertex(sa, v, crownY), faceCol, faceNorm);
      else S.quad(vertex(sb, v, yb), vertex(sa, v, ya), vertex(sa, v, crownY), vertex(sb, v, crownY), faceCol, faceNorm);
    }
  }
  for (const sign of [-1, 1]) { // the two ends, where the wall walk meets the block
    const u = (sign * blockW) / 2;
    const [va, vb] = sign > 0 ? [vOut, vIn] : [vIn, vOut];
    S.quad(vertex(u, va, y0), vertex(u, vb, y0), vertex(u, vb, topY), vertex(u, va, topY), COLORS.body, normal(sign, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(vertex(-blockW / 2, vIn, topY), vertex(-blockW / 2, vOut, topY), vertex(blockW / 2, vOut, topY), vertex(blockW / 2, vIn, topY), shade(PAL.stone, 0.8), [0, 1, 0]);
  S.quad(vertex(-radius, vIn - 0.3, floorY), vertex(-radius, vOut + 0.3, floorY), vertex(radius, vOut + 0.3, floorY), vertex(radius, vIn - 0.3, floorY), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  // the barrel vault and the dark lining of the passage
  for (let k = 0; k < ARCH_SEGS; k++) {
    const [sa, ya] = arcPt(k);
    const [sb, yb] = arcPt(k + 1);
    S.quad(vertex(sa, vIn + 0.01, ya), vertex(sa, vOut - 0.01, ya), vertex(sb, vOut - 0.01, yb), vertex(sb, vIn + 0.01, yb), shade(COLORS.body, 0.4), normal(-(sa + sb) / 2, 0, springY - (ya + yb) / 2));
  }
  for (const sign of [-1, 1]) {
    const u = sign * (radius - 0.01);
    const [va, vb] = sign > 0 ? [vIn, vOut] : [vOut, vIn];
    S.quad(vertex(u, va, floorY), vertex(u, vb, floorY), vertex(u, vb, springY), vertex(u, va, springY), COLORS.dark, normal(-sign, 0));
  }
  // the timber door leaves, swung open against the passage sides just inside the outer mouth
  for (const sign of [-1, 1]) box(sign * (radius - 0.1), vOut - 2.0, floorY, springY - 0.05, 0.14, radius * 0.95, COLORS.door);

  // ---- the faces: damp foot, corner pilasters, the arch's surround, the cornice ----
  for (const [v, sign] of ([[vIn, -1], [vOut, 1]] as any[])) {
    const faceV = v + sign * 0.1;
    const faceCol = sign > 0 ? COLORS.body : COLORS.inner;
    box(0, faceV + sign * 0.02, y0, LAND_Y + 0.7, blockW + 0.3, 0.25, COLORS.damp); // the dark damp plinth band
    for (const side of [-1, 1]) box(side * (blockW / 2 - 0.35), faceV, LAND_Y + 0.7, topY - 1.0, 0.7, 0.2, shade(faceCol, 1.06)); // corner pilasters
    for (let k = 0; k < ARCH_SEGS; k++) { // a plain band round the arch
      const [sa, ya] = arcPt(k, radius + 0.15);
      const [sb, yb] = arcPt(k + 1, radius + 0.15);
      S.beam(vertex(sa, faceV + sign * 0.02, ya), vertex(sb, faceV + sign * 0.02, yb), 0.1, 0.3, shade(faceCol, 1.1));
    }
    for (const side of [-1, 1]) box(side * (radius + 0.15), faceV + sign * 0.02, floorY, springY, 0.3, 0.1, shade(faceCol, 1.1));
    if (sign > 0) {
      // outside: the arch set in a raised rectangular frame, a small name plaque above it
      const frameW = 5.6;
      const frameTop = crownY + 1.0;
      for (const side of [-1, 1]) box(side * (frameW / 2 - 0.2), faceV + 0.04, LAND_Y + 0.7, frameTop, 0.4, 0.18, COLORS.frame);
      box(0, faceV + 0.04, frameTop - 0.4, frameTop, frameW, 0.18, COLORS.frame);
      const plaqueBot = frameTop + 0.35;
      const plaqueH = 1.1;
      box(0, faceV + 0.06, plaqueBot, plaqueBot + plaqueH, 2.4, 0.16, COLORS.plaque);
      box(0, faceV + 0.12, plaqueBot + 0.15, plaqueBot + plaqueH - 0.15, 2.0, 0.06, COLORS.plaqueIn);
    } else {
      // inside: two short projecting piers either side of the arch bay, stopping near the crown under bud caps
      const pierTop = crownY - 0.3;
      for (const side of [-1, 1]) {
        box(side * 4.6, faceV - 0.3, LAND_Y + 0.7, pierTop, 1.2, 0.8, shade(COLORS.inner, 1.05));
        box(side * 4.6, faceV - 0.3, pierTop, pierTop + 0.25, 1.45, 1.0, shade(COLORS.cornice, 0.95));
        const pos = toWorld(side * 4.6, faceV - 0.3);
        S.cyl(pos[0], pos[1], pierTop + 0.25, pierTop + 0.6, 0.38, 0.6, 8, shade(COLORS.cornice, 0.9), { rot: frame.angle });
        S.cyl(pos[0], pos[1], pierTop + 0.6, pierTop + 1.25, 0.6, 0.08, 8, shade(COLORS.cornice, 0.9), { rot: frame.angle });
      }
    }
    // the cornice under the parapet, with a frieze band of light panels below it
    box(0, faceV + sign * 0.04, topY - 1.0, topY - 0.85, blockW + 0.3, 0.26, COLORS.cornice);
    for (let k = -3; k <= 3; k++) box(k * 2.2, faceV + sign * 0.05, topY - 0.75, topY - 0.5, 1.2, 0.08, shade(COLORS.frame, 1.15));
    box(0, faceV + sign * 0.1, topY - 0.4, topY, blockW + 0.6, 0.42, shade(COLORS.cornice, 1.06), { top: shade(PAL.stone, 0.8) });
  }
}

function buildParapetAndRamps(S, frame, vIn, vOut, blockW, y0, topY) {
  const { vertex, normal, box } = frame;
  // ---- the plain solid parapet round the flat roof, square posts at its corners ----
  S.kind = KIND.MASONRY;
  const blockD = vOut - vIn;
  const midV = (vIn + vOut) / 2;
  box(0, vIn + 0.22, topY, topY + PARAPET_H, blockW, 0.44, shade(COLORS.body, 1.05), { top: shade(PAL.stone, 0.9) });
  box(0, vOut - 0.22, topY, topY + PARAPET_H, blockW, 0.44, shade(COLORS.body, 1.05), { top: shade(PAL.stone, 0.9) });
  for (const side of [-1, 1]) box(side * (blockW / 2 - 0.22), midV, topY, topY + PARAPET_H, 0.44, blockD - 0.88, shade(COLORS.body, 1.05), { top: shade(PAL.stone, 0.9) });
  for (const side of [-1, 1]) {
    for (const v of [vIn + 0.3, vOut - 0.3]) {
      box(side * (blockW / 2 - 0.3), v, topY + PARAPET_H, topY + PARAPET_H + 0.35, 0.6, 0.6, shade(COLORS.body, 1.08));
      box(side * (blockW / 2 - 0.3), v, topY + PARAPET_H + 0.35, topY + PARAPET_H + 0.5, 0.75, 0.75, shade(COLORS.cornice, 1.05));
    }
  }

  // ---- the inner ramps: either side of the block a parapeted ramp climbs along the wall top, from the wall walk to
  // the gate's platform, its face a continuation of the block's inner face with the same frieze of light panels ----
  const wallWalkY = LAND_Y + WALL_H;
  const rampLen = 16;
  const rampW = 3.6;
  const rampSegs = 12;
  const paraThick = 0.45;
  const rampY = (frac) => wallWalkY + (topY - wallWalkY) * (0.5 + 0.5 * Math.cos(Math.PI * frac)); // level at both ends, as a walk is
  const rampCol = shade(COLORS.inner, 0.97);
  const upNorm: [number, number, number] = [0, 1, 0];
  for (const side of [-1, 1]) {
    const rampU = (frac) => side * (blockW / 2 + frac * rampLen);
    for (let k = 0; k < rampSegs; k++) {
      const f0 = k / rampSegs;
      const f1 = (k + 1) / rampSegs;
      const ua = rampU(f0);
      const ub = rampU(f1);
      const ya = rampY(f0);
      const yb = rampY(f1);
      S.kind = KIND.MASONRY;
      // the face towards the city, its parapet included, and the parapet's back and coping
      S.quad(vertex(ua, vIn, y0), vertex(ub, vIn, y0), vertex(ub, vIn, yb + PARAPET_H), vertex(ua, vIn, ya + PARAPET_H), rampCol, normal(0, -1));
      S.quad(vertex(ua, vIn + paraThick, ya), vertex(ub, vIn + paraThick, yb), vertex(ub, vIn + paraThick, yb + PARAPET_H), vertex(ua, vIn + paraThick, ya + PARAPET_H), rampCol, normal(0, 1));
      S.quad(vertex(ua, vIn, ya + PARAPET_H), vertex(ub, vIn, yb + PARAPET_H), vertex(ub, vIn + paraThick, yb + PARAPET_H), vertex(ua, vIn + paraThick, ya + PARAPET_H), shade(PAL.stone, 0.85), upNorm);
      // its back, down to the wall walk
      if (ya - wallWalkY > 0.02) S.quad(vertex(ua, vIn + rampW, wallWalkY), vertex(ub, vIn + rampW, wallWalkY), vertex(ub, vIn + rampW, yb), vertex(ua, vIn + rampW, ya), rampCol, normal(0, 1));
      S.kind = KIND.ROAD;
      S.quad(vertex(ua, vIn + paraThick, ya), vertex(ub, vIn + paraThick, yb), vertex(ub, vIn + rampW, yb), vertex(ua, vIn + rampW, ya), shade(PAL.stone, 0.75), upNorm);
      S.kind = KIND.PLAIN;
      // the cornice band and a light panel in the frieze above it, following the slope
      const friezeV = vIn - 0.05;
      S.beam(vertex(ua, vIn - 0.08, ya - 0.92), vertex(ub, vIn - 0.08, yb - 0.92), 0.2, 0.15, COLORS.cornice);
      const pa = ua + (ub - ua) * 0.2;
      const pb = ua + (ub - ua) * 0.8;
      const ypa = rampY(f0 + (f1 - f0) * 0.2);
      const ypb = rampY(f0 + (f1 - f0) * 0.8);
      S.quad(vertex(pa, friezeV, ypa - 0.75), vertex(pb, friezeV, ypb - 0.75), vertex(pb, friezeV, ypb - 0.5), vertex(pa, friezeV, ypa - 0.5), shade(COLORS.frame, 1.15), normal(0, -1));
    }
    // the low end: a capped pier where the ramp's parapet meets the wall walk
    box(rampU(1) + side * 0.3, vIn + 0.25, y0, wallWalkY + PARAPET_H + 0.3, 0.7, 0.7, shade(COLORS.inner, 1.05));
    box(rampU(1) + side * 0.3, vIn + 0.25, wallWalkY + PARAPET_H + 0.3, wallWalkY + PARAPET_H + 0.5, 0.9, 0.9, shade(COLORS.cornice, 0.95));
  }
}

function buildWatchTower(S, frame, vIn, vOut, topY) {
  const { toWorld, vertex, normal, box, angle } = frame;
  const blockD = vOut - vIn;
  const midV = (vIn + vOut) / 2;

  // a flat arch-headed panel (rect + half disc) on a face
  const drawArchPanel = (center, faceOff, sign, yBot, width, springH, color, alongV = false) => {
    const facePt = alongV ? (a, y) => vertex(faceOff, center + a, y) : (a, y) => vertex(center + a, faceOff, y);
    const faceNorm = alongV ? normal(sign, 0) : normal(0, sign);
    const radius = width / 2;
    const springY = yBot + springH;
    const flip = alongV ? sign < 0 : sign > 0;
    const emitQuad = (a, b, c, d?) => (flip ? S.quad(a, b, c, d, color, faceNorm) : S.quad(b, a, d, c, color, faceNorm));
    emitQuad(facePt(-radius, yBot), facePt(radius, yBot), facePt(radius, springY), facePt(-radius, springY));
    for (let k = 0; k < 8; k++) {
      const t0 = Math.PI - (Math.PI * k) / 8;
      const t1 = Math.PI - (Math.PI * (k + 1)) / 8;
      const a = facePt(radius * Math.cos(t0), springY + radius * Math.sin(t0));
      const b = facePt(radius * Math.cos(t1), springY + radius * Math.sin(t1));
      const mid = facePt(0, springY);
      if (flip) S.tri(mid, a, b, color, faceNorm);
      else S.tri(mid, b, a, color, faceNorm);
    }
  };
  const drawDisc = (center, faceOff, sign, centerY, radius, color, alongV = false) => {
    const facePt = alongV ? (a, y) => vertex(faceOff, center + a, y) : (a, y) => vertex(center + a, faceOff, y);
    const faceNorm = alongV ? normal(sign, 0) : normal(0, sign);
    const flip = alongV ? sign < 0 : sign > 0;
    for (let k = 0; k < 12; k++) {
      const t0 = (Math.PI * 2 * k) / 12;
      const t1 = (Math.PI * 2 * (k + 1)) / 12;
      const a = facePt(radius * Math.cos(t0), centerY + radius * Math.sin(t0));
      const b = facePt(radius * Math.cos(t1), centerY + radius * Math.sin(t1));
      const mid = facePt(0, centerY);
      if (flip) S.tri(mid, a, b, color, faceNorm);
      else S.tri(mid, b, a, color, faceNorm);
    }
  };

  // ---- the vọng lâu: two masonry storeys ----
  const lowerW = 8.4;
  const lowerD = Math.min(6.8, blockD - 3);
  const lowerH = 4.0;
  const lowerTopY = topY + lowerH;
  box(0, midV, topY, lowerTopY, lowerW, lowerD, COLORS.tower, { top: shade(COLORS.tower, 0.9) });
  box(0, midV, lowerTopY - 0.3, lowerTopY, lowerW + 0.3, lowerD + 0.3, COLORS.cornice); // a band under the skirt
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) {
    const faceV = midV + sign * (lowerD / 2 + 0.02);
    const sillY = topY + PARAPET_H + 0.3;
    if (sign > 0) { // outside: a large arched opening between two small ones
      drawArchPanel(0, faceV, sign, sillY - 0.2, 1.9, 1.6, COLORS.dark);
      for (const side of [-1, 1]) drawArchPanel(side * 2.6, faceV, sign, sillY - 0.2, 1.15, 1.0, COLORS.dark);
    } else { // inside: an arched niche between two round medallions
      drawArchPanel(0, faceV, sign, sillY + 0.2, 1.4, 1.2, COLORS.dark);
      for (const side of [-1, 1]) {
        drawDisc(side * 2.6, faceV, sign, sillY + 1.3, 0.95, COLORS.medal);
        drawDisc(side * 2.6, faceV - 0.01, sign, sillY + 1.3, 0.6, shade(COLORS.medal, 0.85));
      }
    }
  }
  for (const side of [-1, 1]) drawArchPanel(midV, side * (lowerW / 2 + 0.02), side, topY + PARAPET_H + 0.1, 1.3, 1.1, COLORS.dark, true); // an arched opening on each end
  // the skirt of brown tiles round its top
  S.kind = KIND.TILE;
  const skirtW = lowerW + 1.2;
  const skirtD = lowerD + 1.2;
  const skirtH = 0.8;
  box(0, midV, lowerTopY, lowerTopY + skirtH, skirtW, skirtD, COLORS.tile, { taper: 0.8, top: shade(COLORS.tile, 0.9) });
  box(0, midV, lowerTopY - 0.12, lowerTopY, skirtW + 0.1, skirtD + 0.1, COLORS.tileEdge);

  // the upper storey, pierced front to back by an arch
  S.kind = KIND.MASONRY;
  const upperW = 4.6;
  const upperD = 4.0;
  const upperY0 = lowerTopY + skirtH;
  const upperH = 2.4;
  const upperTopY = upperY0 + upperH;
  const openW = 1.4;
  const openSpringY = upperY0 + 1.1;
  const openCrownY = openSpringY + openW / 2;
  for (const side of [-1, 1]) box(side * (upperW + openW) / 4, midV, upperY0, upperTopY, (upperW - openW) / 2, upperD, COLORS.tower, { top: shade(COLORS.tower, 0.9) });
  box(0, midV, openCrownY, upperTopY, openW, upperD, COLORS.tower, { top: shade(COLORS.tower, 0.9), bottom: true });
  for (const sign of [-1, 1]) { // spandrels over the opening and its dark soffit
    const faceV = midV + sign * upperD / 2;
    const faceNorm = normal(0, sign);
    for (let k = 0; k < 8; k++) {
      const t0 = Math.PI - (Math.PI * k) / 8;
      const t1 = Math.PI - (Math.PI * (k + 1)) / 8;
      const rad = openW / 2;
      const sa = rad * Math.cos(t0);
      const sb = rad * Math.cos(t1);
      const ya = openSpringY + rad * Math.sin(t0);
      const yb = openSpringY + rad * Math.sin(t1);
      if (sign > 0) S.quad(vertex(sa, faceV, ya), vertex(sb, faceV, yb), vertex(sb, faceV, openCrownY), vertex(sa, faceV, openCrownY), COLORS.tower, faceNorm);
      else S.quad(vertex(sb, faceV, yb), vertex(sa, faceV, ya), vertex(sa, faceV, openCrownY), vertex(sb, faceV, openCrownY), COLORS.tower, faceNorm);
    }
  }
  box(0, midV, upperTopY - 0.25, upperTopY, upperW + 0.3, upperD + 0.3, COLORS.cornice);
  // its small hip roof of the same brown tiles, ridge ornaments and a short pole
  const roofH = 1.5; // steep: about as tall as half its depth
  S.hip(...toWorld(0, midV), upperW, upperD, angle, upperTopY, roofH, COLORS.tile, { flare: 0.1, over: 0.3, hips: true, horns: false, fascia: 0.18, fasciaCol: COLORS.tileEdge, ridgeCol: COLORS.tileEdge, segs: 3 });
  S.kind = KIND.MASONRY;
  const ridgeY = upperTopY + roofH + 0.1;
  const ridgeHalfLen = Math.max(0.2, (upperW - upperD) / 2 + 0.3);
  for (const side of [-1, 1]) {
    const pos = toWorld(side * ridgeHalfLen, midV);
    S.cyl(pos[0], pos[1], ridgeY - 0.1, ridgeY + 0.4, 0.12, 0.02, 6, COLORS.tileEdge);
  }
  {
    const pos = toWorld(0, midV);
    S.cyl(pos[0], pos[1], ridgeY - 0.1, ridgeY + 0.15, 0.22, 0.18, 8, COLORS.tileEdge);
    S.cyl(pos[0], pos[1], ridgeY + 0.15, ridgeY + 0.35, 0.18, 0.04, 8, COLORS.tileEdge);
    S.cyl(pos[0], pos[1], ridgeY + 0.35, ridgeY + 0.75, 0.04, 0.03, 4, COLORS.pole, { cap: false });
  }
}

function addPlaqueTextMesh(group, THREE, toWorld, vOut, crownY, px, pz) {
  // the plaque's characters, read right to left: 廣 德 門 (a small canvas, in the browser only; outer face only, the
  // inner face shows none)
  if (!group || !THREE || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3b3430';
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#e2c675';
  ctx.font = 'bold 64px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ['門', '德', '廣'].forEach((ch, i) => ctx.fillText(ch, 48 + i * 80, 50));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshLambertMaterial({ map: texture });
  const geometry = new THREE.PlaneGeometry(1.95, 0.74);
  const pos = toWorld(0, vOut + 0.1 + 0.17);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos[0], crownY + 1.0 + 0.35 + 0.55, pos[1]);
  mesh.rotation.y = Math.atan2(px, pz);
  mesh.userData.landmark = id;
  group.add(mesh);
}

export function build({ data, S, group, place, THREE }) {
  const normalize = (str) => String(str || '').normalize('NFC');
  const gateRec = (data.gates || []).find((entry) => normalize(entry.n) === normalize(GATE_NAME));
  if (!gateRec) throw new Error('gate not in data.gates');
  const citadel = (data.places || []).find((entry) => entry.id === 'kinhthanh');
  const centre = citadel ? [citadel.x / 10, citadel.z / 10] : [gateRec.c[0] / 10, gateRec.c[1] / 10 - 100];
  const { cx, cz, pa, px, pz, pwid } = gateAxis(gateRec, centre); // +v runs out of the city, towards the river
  const ux = -pz;
  const uz = px; // along the wall
  const angle = pa + Math.PI / 2;
  const toWorld = (u, v): [number, number] => [cx + u * ux + v * px, cz + u * uz + v * pz];
  const vertex = (u, v, y?) => {
    const pos = toWorld(u, v);
    return [pos[0], y, pos[1]];
  };
  const normal = (nu, nv, ny = 0): [number, number, number] => [nu * ux + nv * px, ny, nu * uz + nv * pz];
  const box = (u, v, y0, y1, su, sv, color, opts?) => {
    const pos = toWorld(u, v);
    S.box(pos[0], pos[1], y0, y1, su, sv, angle, color, opts);
  };
  const frame = { toWorld, vertex, normal, box, angle };

  const { vIn, vOut } = findRampartFaces(data, cx, cz, px, pz, pwid);
  const blockW = pwid + 0.4; // along the wall
  const y0 = LAND_Y - 0.5;
  const topY = LAND_Y + WALL_H + TOP_RISE;
  const floorY = LAND_Y + 0.02;
  const radius = OPEN_W / 2;
  const crownY = LAND_Y + OPEN_H;
  const springY = crownY - radius;
  const pavedStart = S.n;

  buildGateBlockAndFaces(S, frame, vIn, vOut, blockW, y0, topY, floorY, radius, crownY, springY);
  buildParapetAndRamps(S, frame, vIn, vOut, blockW, y0, topY);
  buildWatchTower(S, frame, vIn, vOut, topY);

  (S.paved = S.paved || []).push([pavedStart, S.n]);
  S.kind = KIND.PLAIN;

  addPlaqueTextMesh(group, THREE, toWorld, vOut, crownY, px, pz);
}
