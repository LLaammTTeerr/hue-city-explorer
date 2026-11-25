import { KIND, hex, shade, mix, rand } from '../../geo/buf.ts';
import { LAND_Y, PAL, WALL_H } from '../../config.ts';
import { CITADEL_PASSAGE } from '../../geo/gates.ts';

// Cửa Chánh Tây (正西門), the main west gate of the Huế Citadel, on Thái Phiên street. Sources and estimates:
// docs/places/gate-cua-chanh-tay.md.
//
// The arched passage dates from 1809 (Gia Long), the watch tower (vọng lâu) from 1829 (Minh Mạng). The tower was
// lost in the 20th century (the 1953 flood or the 1968 fighting, the sources disagree) and has been rebuilt; the gate
// was reopened to traffic in 2004. As it stands (photo of 2014 on Wikimedia Commons, "Cổng Chánh Tây"):
//   - a bare red-brown brick front, streaked dark with damp, flush with the rampart, one round-arched passage ringed
//     in brick voussoirs; a grey cornice ledge over the arch and above it the grey stone tablet "正西門";
//   - a grey plaster cornice and a parapet of recessed panels between posts round the gate's flat top;
//   - the vọng lâu in masonry, not timber: two storeys of lime-plastered brick, the lower one with a large open arch
//     in the middle of each long face and a smaller brick-rimmed arch either side, the upper a small block with a
//     bare-brick panel; each storey under a plaster cornice edged with a row of tiles, little ornaments on the corners.
// The moat in front of the gate (a lotus field on the satellite) is drawn by scripts/build-data.mjs and the street
// crosses it on the mapped cầu Chánh Tây; both belong to the rampart and the city, not to this file.
// Street View (2024, Thái Phiên both sides and through the passage) adds: on the city side the gate's front stands back in a notch of the
// rampart, behind a short open forecourt whose mouth is marked by two brick piers with stepped grey caps, and its
// panel over the arch is blank; the vọng lâu's eaves curl up at the corners and its upper storey has an open arch.
//
// Frame: s along the wall (the OSM footprint's long axis, which matches the satellite), t along the
// passage, t > 0 into the city.
export const id = 'gate:Cửa Chánh Tây';

const GATE_CENTER = [-2921.5, -633.0]; // footprint centre (hue.json gates, from OSM)
const WALL_ANGLE = -2.197; // the footprint's long axis (along the wall)
const AXIS_COS = Math.cos(WALL_ANGLE);
const AXIS_SIN = Math.sin(WALL_ANGLE);
const toWorld = (localS, localT): [number, number] => [
  GATE_CENTER[0] + localS * AXIS_COS - localT * AXIS_SIN,
  GATE_CENTER[1] + localS * AXIS_SIN + localT * AXIS_COS,
];
const toPoint3 = (localS, localT, y?) => {
  const pos = toWorld(localS, localT);
  return [pos[0], y, pos[1]];
};
const toNormal = (ds, dt, dy = 0): [number, number, number] => [ds * AXIS_COS - dt * AXIS_SIN, dy, ds * AXIS_SIN + dt * AXIS_COS];

const OUTER_FACE_T = -8.8;
const INNER_FACE_T = 3.5;
const RAMPART_INNER_T = 9.6;
const BLOCK_HALF_W = 8.8; // outer face, inner face, rampart's inner face; half width of the block
const DOOR_ARCH_T0 = OUTER_FACE_T + 5.0;
const DOOR_ARCH_T1 = DOOR_ARCH_T0 + 0.8;
const FRONTISPIECE_HALF_W = 7.0; // half width of the frontispiece that stands 0.25 m proud on each face
const BLOCK_TOP_Y = LAND_Y + 8.0; // block's flat top (estimate: about 1.4 m over the 6.6 m rampart, as the photo shows)
const PASSAGE_W = CITADEL_PASSAGE.w;
const PASSAGE_H = CITADEL_PASSAGE.h;
const PASSAGE_SLOT = CITADEL_PASSAGE.slot; // passage 4.2 m wide, crown 5.4 m
const TOWER_OFFSET_T = -1.5;
const TOWER_OFFSET_S = 2.0;
const ARCH_SEGS = 10;
const VAULT_SEGS = 14;

// the passage in sections, [t0, t1, half width, crown, light]: outer vault, door arch, inner vault
const PASSAGE_SECTIONS = [
  [OUTER_FACE_T, DOOR_ARCH_T0, 2.7, LAND_Y + 5.7, 0.95],
  [DOOR_ARCH_T0, DOOR_ARCH_T1, 2.35, LAND_Y + 5.5, 0.8],
  [DOOR_ARCH_T1, INNER_FACE_T, PASSAGE_W / 2, LAND_Y + PASSAGE_H, 0.66],
];
const GATE_FACES = [
  [OUTER_FACE_T, -1, 2.7, LAND_Y + 5.7],
  [INNER_FACE_T, 1, PASSAGE_W / 2, LAND_Y + PASSAGE_H],
]; // [face t, outward, arch half width, crown]

const COLORS = {
  brick: hex('#76604f'), // weathered grey-brown brick (sunlit in the 2024 Street View: about #89765f)
  brickDark: hex('#4c3f36'),
  brickRed: hex('#8a5e48'),
  damp: hex('#3d352f'),
  grey: hex('#8a857b'),
  greyLight: hex('#a49f92'),
  tablet: hex('#7d7c74'),
  carve: hex('#56554f'),
  plaster: hex('#9d988b'), // the tower's lime plaster weathered grey (panos b and f)
  plasterDark: hex('#848074'),
  tile: hex('#b4774c'), // its roofs in orange-tan tile
  lining: hex('#7e5c4c'), // the passage's red brick lining, lit from the mouths
  dark: hex('#1f1a18'),
  moss: hex('#5c6340'),
};

// a point on an arch profile: k = 0..ARCH_SEGS+2 runs up the left jamb, over the arch, down the right jamb
function archProfilePt(k, radius, crownY) {
  const springY = crownY - radius;
  if (k === 0) return [-radius, LAND_Y];
  if (k === ARCH_SEGS + 2) return [radius, LAND_Y];
  const theta = Math.PI - (Math.PI * (k - 1)) / ARCH_SEGS;
  return [radius * Math.cos(theta), springY + radius * Math.sin(theta)];
}

function archPt(k, radius, crownY) {
  return archProfilePt(k + 1, radius, crownY);
}

// A storey's cap: a plaster cornice and a pitched hip of orange-tan tile, its eaves curling up at the corners into
// short upturned hip ends (Buf.hip, slight flare, no long horns), a small ornament on the ridge.
function buildTierCap(S, towerBox, width, depth, baseY, roofH, overhang) {
  S.kind = KIND.PLAIN;
  towerBox(0, 0, baseY, baseY + 0.12, width + 0.2, depth + 0.2, COLORS.plasterDark);
  towerBox(0, 0, baseY + 0.12, baseY + 0.26, width + 0.36, depth + 0.36, COLORS.plaster, { top: COLORS.plaster });
  const roofY = baseY + 0.26;
  const centerPos = toWorld(TOWER_OFFSET_S, TOWER_OFFSET_T);
  S.hip(centerPos[0], centerPos[1], width, depth, WALL_ANGLE, roofY, roofH, COLORS.tile, { over: overhang, flare: 0.1, segs: 3, ridgeCol: shade(COLORS.tile, 0.8) });
  // a small ornament curling up from each corner of the eave
  S.kind = KIND.TILE;
  const eaveW = width + 2 * overhang;
  const eaveD = depth + 2 * overhang;
  for (const signS of [-1, 1]) {
    for (const signT of [-1, 1]) {
      const pt0 = toPoint3(TOWER_OFFSET_S + (signS * (eaveW - 0.5)) / 2, TOWER_OFFSET_T + (signT * (eaveD - 0.5)) / 2, roofY + 0.12);
      const pt1 = toPoint3(TOWER_OFFSET_S + (signS * (eaveW + 0.25)) / 2, TOWER_OFFSET_T + (signT * (eaveD + 0.25)) / 2, roofY + 0.42);
      const pt2 = toPoint3(TOWER_OFFSET_S + (signS * eaveW) / 2, TOWER_OFFSET_T + (signT * eaveD) / 2, roofY + 0.05);
      S.tri(pt0, pt1, pt2, shade(COLORS.tile, 0.8), [0, 1, 0]);
      S.tri(pt0, pt2, pt1, shade(COLORS.tile, 0.8), [0, -1, 0]);
    }
  }
  S.kind = KIND.PLAIN;
  const ridgeHalf = Math.max(0.1, (width - depth) / 2) * 0.6;
  const topY = roofY + roofH;
  for (const offsetS of [-ridgeHalf, ridgeHalf]) {
    const pos = toWorld(TOWER_OFFSET_S + offsetS, TOWER_OFFSET_T);
    S.cyl(pos[0], pos[1], topY - 0.05, topY + 0.22, 0.09, 0.04, 6, COLORS.plasterDark);
  }
}

// An arched opening on a face: open (a dark recess) or blind (plaster fill), framed by a brick-red rim.
// alongS: the face is at constant t, the opening centred at s; otherwise the face is at constant s, centred at t.
function buildArchOpening(S, posS, posT, outSign, alongS, sillY, width, height, isOpen, rimColor = COLORS.brickRed) {
  const rad0 = width / 2;
  const springY = sillY + height - rad0;
  const segs = 8;
  const ptAt = (along, y, outDist) => (alongS ? toPoint3(posS + along, posT + outSign * outDist, y) : toPoint3(posS + outSign * outDist, posT + along, y));
  const faceNorm = alongS ? toNormal(0, outSign) : toNormal(outSign, 0);
  for (const [rad, outDist, col] of [[rad0 + 0.2, 0.03, rimColor], [rad0, 0.05, isOpen ? COLORS.dark : COLORS.plasterDark]] as any[]) {
    S.quad(ptAt(-rad, sillY, outDist), ptAt(rad, sillY, outDist), ptAt(rad, springY, outDist), ptAt(-rad, springY, outDist), col, faceNorm);
    for (let k = 0; k < segs; k++) {
      const ang0 = Math.PI - (Math.PI * k) / segs;
      const ang1 = Math.PI - (Math.PI * (k + 1)) / segs;
      S.tri(ptAt(0, springY, outDist), ptAt(rad * Math.cos(ang0), springY + rad * Math.sin(ang0), outDist), ptAt(rad * Math.cos(ang1), springY + rad * Math.sin(ang1), outDist), col, faceNorm);
    }
  }
}

function buildGateBlockAndVault(S, box) {
  // ---- the block: brick piers either side of each section of the passage, masonry over its crown ---------------
  S.kind = KIND.MASONRY;
  for (const [t0, t1, radius, crownY] of PASSAGE_SECTIONS) {
    const midT = (t0 + t1) / 2;
    const secDepth = t1 - t0;
    for (const side of [-1, 1]) box(side * (BLOCK_HALF_W + radius) / 2, midT, LAND_Y - 0.5, BLOCK_TOP_Y, BLOCK_HALF_W - radius, secDepth, COLORS.brick, { top: COLORS.greyLight, topKind: KIND.ROAD });
    box(0, midT, crownY, BLOCK_TOP_Y, 2 * radius + 0.02, secDepth, COLORS.brick, { top: COLORS.greyLight, topKind: KIND.ROAD });
  }
  // the frontispiece on each face, the spandrels of the arch on it
  for (const [faceT, outSign, radius, crownY] of GATE_FACES) {
    const frontMidT = faceT + outSign * 0.125;
    for (const side of [-1, 1]) box(side * (FRONTISPIECE_HALF_W + radius) / 2, frontMidT, LAND_Y - 0.5, BLOCK_TOP_Y, FRONTISPIECE_HALF_W - radius, 0.25, COLORS.brick);
    box(0, frontMidT, crownY, BLOCK_TOP_Y, 2 * radius + 0.02, 0.25, COLORS.brick);
    const frontOutT = faceT + outSign * 0.25;
    for (let k = 0; k < ARCH_SEGS; k++) {
      const [s0, y0] = archPt(k, radius, crownY);
      const [s1, y1] = archPt(k + 1, radius, crownY);
      S.quad(toPoint3(s0, frontOutT, y0), toPoint3(s1, frontOutT, y1), toPoint3(s1, frontOutT, crownY), toPoint3(s0, frontOutT, crownY), COLORS.brick, toNormal(0, outSign));
    }
    for (const side of [-1, 1]) {
      const endS = side * FRONTISPIECE_HALF_W;
      S.quad(toPoint3(endS, faceT, LAND_Y - 0.5), toPoint3(endS, frontOutT, LAND_Y - 0.5), toPoint3(endS, frontOutT, BLOCK_TOP_Y), toPoint3(endS, faceT, BLOCK_TOP_Y), COLORS.brick, toNormal(side, 0));
    }
  }

  // ---- the passage: barrel vaults lined in red brick, mottled course by course, the steps where it narrows ----
  S.kind = KIND.PLAIN;
  const vaultArcPt = (k, radius, crownY) => {
    const theta = Math.PI - (Math.PI * k) / VAULT_SEGS;
    const springY = crownY - radius;
    return [radius * Math.cos(theta), springY + radius * Math.sin(theta)];
  };
  PASSAGE_SECTIONS.forEach(([t0, t1, radius, crownY, lightLevel], secIdx) => {
    const isFirst = secIdx === 0;
    const isLast = secIdx === PASSAGE_SECTIONS.length - 1;
    const startT = isFirst ? t0 - 0.24 : t0;
    const endT = isLast ? t1 + 0.24 : t1; // through the frontispiece on the faces
    const springY = crownY - radius;
    const ringCount = Math.max(1, Math.round((endT - startT) / 0.55));
    for (let j = 0; j < ringCount; j++) {
      const ringT0 = startT + ((endT - startT) * j) / ringCount;
      const ringT1 = startT + ((endT - startT) * (j + 1)) / ringCount;
      // light falls off from the nearer mouth of the passage
      const lightFactor = lightLevel * (0.82 + 0.18 * Math.abs((ringT0 + ringT1) / 2 - (OUTER_FACE_T + INNER_FACE_T) / 2) / ((INNER_FACE_T - OUTER_FACE_T) / 2));
      for (let k = 0; k < VAULT_SEGS; k++) {
        const [s0, y0] = vaultArcPt(k, radius, crownY);
        const [s1, y1] = vaultArcPt(k + 1, radius, crownY);
        const brickCol = shade(COLORS.lining, lightFactor * (0.86 + 0.24 * rand(secIdx * 997 + j * 31 + k, 3)));
        S.quad(toPoint3(s0, ringT0, y0), toPoint3(s1, ringT0, y1), toPoint3(s1, ringT1, y1), toPoint3(s0, ringT1, y0), brickCol, toNormal(-(s0 + s1) / 2, 0, springY - (y0 + y1) / 2));
      }
      for (const side of [-1, 1]) {
        const wallS = side * (radius - 0.01);
        for (let band = 0; band < 3; band++) { // the wall in three bands, the lowest one damp
          const y0 = LAND_Y + ((springY - LAND_Y) * band) / 3;
          const y1 = LAND_Y + ((springY - LAND_Y) * (band + 1)) / 3;
          const wallCol = band === 0
            ? mix(COLORS.damp, COLORS.lining, 0.45 + 0.2 * rand(j * 7 + secIdx, 5))
            : shade(COLORS.lining, lightFactor * 0.92 * (0.86 + 0.24 * rand(secIdx * 991 + j * 13 + band * 5 + (side > 0 ? 50 : 0), 4)));
          S.quad(toPoint3(wallS, ringT0, y0), toPoint3(wallS, ringT1, y0), toPoint3(wallS, ringT1, y1), toPoint3(wallS, ringT0, y1), wallCol, toNormal(-side, 0));
        }
        // the course of stone at the springing
        const courseS = side * (radius - 0.03);
        S.quad(toPoint3(courseS, ringT0, springY - 0.14), toPoint3(courseS, ringT1, springY - 0.14), toPoint3(courseS, ringT1, springY), toPoint3(courseS, ringT0, springY), shade(COLORS.grey, lightFactor * 0.8), toNormal(-side, 0));
      }
    }
  });
  for (let i = 0; i + 1 < PASSAGE_SECTIONS.length; i++) { // the step face, looking back towards the wider section
    const [, stepT, r0, c0] = PASSAGE_SECTIONS[i];
    const [, , r1, c1] = PASSAGE_SECTIONS[i + 1];
    const faceT = stepT - 0.01;
    for (let k = 0; k < ARCH_SEGS + 2; k++) {
      const [oa, yoa] = archProfilePt(k, r0, c0);
      const [ob, yob] = archProfilePt(k + 1, r0, c0);
      const [ia, yia] = archProfilePt(k, r1, c1);
      const [ib, yib] = archProfilePt(k + 1, r1, c1);
      S.quad(toPoint3(oa, faceT, yoa), toPoint3(ob, faceT, yob), toPoint3(ib, faceT, yib), toPoint3(ia, faceT, yia), shade(COLORS.lining, 0.62 - 0.1 * i), toNormal(0, -1));
    }
  }
}

function buildForecourtAndFacades(S, box) {
  // ---- the forecourt inside: the slot's walls from the inner face to the rampart's, capped piers at its mouth --
  S.kind = KIND.MASONRY;
  const wallWalkY = LAND_Y + WALL_H;
  for (const side of [-1, 1]) {
    box(side * (PASSAGE_SLOT / 2 + 0.45), (INNER_FACE_T + RAMPART_INNER_T) / 2, LAND_Y - 0.5, wallWalkY, 0.9, RAMPART_INNER_T - INNER_FACE_T, COLORS.brick, { top: COLORS.greyLight });
    S.quad(toPoint3(side * PASSAGE_SLOT / 2, INNER_FACE_T, LAND_Y + 0.02), toPoint3(side * PASSAGE_SLOT / 2, RAMPART_INNER_T, LAND_Y + 0.02), toPoint3(side * PASSAGE_SLOT / 2, RAMPART_INNER_T, LAND_Y + 0.9), toPoint3(side * PASSAGE_SLOT / 2, INNER_FACE_T, LAND_Y + 0.9), COLORS.damp, toNormal(-side, 0));
    // the pier at the forecourt's mouth, standing a little proud of the rampart's face; its cap about 5.5 m up
    const pierS = side * (PASSAGE_SLOT / 2 + 0.55);
    const pierT = RAMPART_INNER_T - 0.3;
    const capY = LAND_Y + 4.3;
    box(pierS, pierT, LAND_Y - 0.5, capY, 1.3, 1.2, COLORS.brick, { top: COLORS.greyLight });
    box(pierS, pierT, capY, capY + 0.25, 1.6, 1.5, COLORS.grey, { top: COLORS.greyLight });
    box(pierS, pierT, capY + 0.25, capY + 0.8, 1.1, 1.0, COLORS.greyLight, { taper: 1.3 });
    box(pierS, pierT, capY + 0.8, capY + 1.05, 1.7, 1.6, COLORS.grey, { top: COLORS.greyLight });
    box(pierS, pierT, capY + 1.05, capY + 1.25, 0.9, 0.8, COLORS.greyLight, { taper: 0.6 });
  }
  S.kind = KIND.ROAD;
  S.quad(toPoint3(-PASSAGE_W / 2, OUTER_FACE_T - 0.55, LAND_Y + 0.02), toPoint3(PASSAGE_W / 2, OUTER_FACE_T - 0.55, LAND_Y + 0.02), toPoint3(PASSAGE_W / 2, RAMPART_INNER_T + 0.3, LAND_Y + 0.02), toPoint3(-PASSAGE_W / 2, RAMPART_INNER_T + 0.3, LAND_Y + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);
  for (const side of [-1, 1]) { // the floor of the wider stages either side of the roadway
    const s0 = side * PASSAGE_W / 2;
    const s1 = side * 2.7;
    S.quad(toPoint3(Math.min(s0, s1), OUTER_FACE_T - 0.3, LAND_Y + 0.02), toPoint3(Math.max(s0, s1), OUTER_FACE_T - 0.3, LAND_Y + 0.02), toPoint3(Math.max(s0, s1), DOOR_ARCH_T1, LAND_Y + 0.02), toPoint3(Math.min(s0, s1), DOOR_ARCH_T1, LAND_Y + 0.02), shade(PAL.stone, 0.55), [0, 1, 0]);
  }

  // ---- each face: the brick arch ring, the ledge, the tablet (blank on the city side), the damp and streaks --
  S.kind = KIND.PLAIN;
  for (const [faceT, outSign, radius, crownY] of GATE_FACES) {
    const frontT = faceT + outSign * 0.25; // the frontispiece's face
    const ringW = outSign < 0 ? 0.42 : 0.48; // the wider outer arch has a slimmer ring, to leave room for the tablet
    for (const [rad0, rad1, outDist, col] of [[radius, radius + ringW, 0.06, COLORS.brickRed], [radius + ringW, radius + 2 * ringW - 0.06, 0.1, shade(COLORS.brickRed, 0.9)]] as any[]) {
      for (let k = 0; k < ARCH_SEGS; k++) {
        const [ia, ya] = archPt(k, rad0, crownY - radius + rad0);
        const [ib, yb] = archPt(k + 1, rad0, crownY - radius + rad0);
        const [oa, yoa] = archPt(k, rad1, crownY - radius + rad1);
        const [ob, yob] = archPt(k + 1, rad1, crownY - radius + rad1);
        S.quad(toPoint3(ia, frontT + outSign * outDist, ya), toPoint3(ib, frontT + outSign * outDist, yb), toPoint3(ob, frontT + outSign * outDist, yob), toPoint3(oa, frontT + outSign * outDist, yoa), col, toNormal(0, outSign));
      }
    }
    for (const side of [-1, 1]) {
      const s0 = side * (radius + 0.02);
      const s1 = side * FRONTISPIECE_HALF_W;
      S.quad(toPoint3(Math.min(s0, s1), frontT + outSign * 0.02, LAND_Y), toPoint3(Math.max(s0, s1), frontT + outSign * 0.02, LAND_Y), toPoint3(Math.max(s0, s1), frontT + outSign * 0.02, LAND_Y + 0.9), toPoint3(Math.min(s0, s1), frontT + outSign * 0.02, LAND_Y + 0.9), COLORS.damp, toNormal(0, outSign));
    }
    box(0, frontT + outSign * 0.1, BLOCK_TOP_Y - 1.15, BLOCK_TOP_Y - 0.95, 2 * FRONTISPIECE_HALF_W + 0.4, 0.2, COLORS.grey, { top: COLORS.greyLight }); // the string course
    const addStreak = (startS, width, topY, botY, color, outDist) => {
      const botS = startS + width * (0.3 + 0.4 * rand(Math.round(startS * 100), 9));
      const streakT = frontT + outSign * outDist;
      S.quad(toPoint3(startS, streakT, topY), toPoint3(startS + width, streakT, topY), toPoint3(botS + width * 0.12, streakT, botY), toPoint3(botS - width * 0.12, streakT, botY), color, toNormal(0, outSign));
    };
    for (let i = 0; i < 14; i++) {
      const seed = i * 17 + (outSign > 0 ? 5 : 0);
      const streakS = -FRONTISPIECE_HALF_W + 0.4 + rand(seed, 1) * (2 * FRONTISPIECE_HALF_W - 1.2);
      const streakW = 0.25 + rand(seed, 2) * 0.55;
      if (Math.abs(streakS + streakW / 2) < radius + 1.1) continue; // keep the arch and its ring clear
      const botY = LAND_Y + 1.2 + rand(seed, 3) * 4.0;
      addStreak(streakS, streakW, BLOCK_TOP_Y - 1.2, botY, mix(COLORS.brickDark, COLORS.brick, 0.62 + rand(seed, 4) * 0.22), 0.03);
    }
    for (let i = 0; i < 7; i++) {
      const seed = i * 11 + (outSign > 0 ? 3 : 0);
      const streakS = -FRONTISPIECE_HALF_W + 0.5 + rand(seed, 7) * (2 * FRONTISPIECE_HALF_W - 1.6);
      const streakW = 0.4 + rand(seed, 8) * 0.9;
      if (Math.abs(streakS + streakW / 2) < radius + 1.1) continue;
      addStreak(streakS, streakW, BLOCK_TOP_Y - 1.18, BLOCK_TOP_Y - 1.5 - rand(seed, 6) * 0.9, mix(COLORS.brick, COLORS.moss, 0.3 + rand(seed, 5) * 0.15), 0.035);
    }
    // the grey cornice ledge over the arch; outside, the tablet with its three carved characters, inside a blank panel
    const ledgeY = Math.max(crownY + 2 * ringW - 0.04, Math.min(crownY + 1.0, BLOCK_TOP_Y - 1.6));
    box(0, frontT + outSign * 0.12, ledgeY, ledgeY + 0.22, 6.6, 0.24, COLORS.grey, { top: COLORS.greyLight });
    box(0, frontT + outSign * 0.07, ledgeY + 0.22, ledgeY + 0.34, 6.2, 0.14, shade(COLORS.grey, 0.85));
    const tabletY = ledgeY + 0.42;
    const tabletH = Math.min(1.15, BLOCK_TOP_Y - 0.4 - tabletY);
    if (outSign < 0) {
      box(0, frontT + outSign * 0.09, tabletY, tabletY + tabletH, 3.1, 0.18, COLORS.greyLight);
      box(0, frontT + outSign * 0.15, tabletY + 0.1, tabletY + tabletH - 0.1, 2.75, 0.06, COLORS.tablet);
      for (const charIdx of [-1, 0, 1]) box(charIdx * 0.82, frontT + outSign * 0.19, tabletY + 0.18, tabletY + tabletH - 0.18, 0.58, 0.04, COLORS.carve);
    } else {
      box(0, frontT + outSign * 0.06, tabletY, tabletY + tabletH, 4.4, 0.12, COLORS.greyLight);
      box(0, frontT + outSign * 0.09, tabletY + 0.12, tabletY + tabletH - 0.12, 4.0, 0.04, shade(COLORS.grey, 0.82));
    }
  }
}

function buildParapetAndWatchtower(S, box) {
  const midT = (OUTER_FACE_T + INNER_FACE_T) / 2;
  const blockDepth = INNER_FACE_T - OUTER_FACE_T;

  // ---- the cornice and the panelled parapet round the flat top ------------------------------------------------
  S.kind = KIND.MASONRY;
  box(0, midT, BLOCK_TOP_Y - 0.35, BLOCK_TOP_Y, 2 * BLOCK_HALF_W + 0.2, blockDepth + 0.7, COLORS.grey, { top: COLORS.greyLight, topKind: KIND.ROAD });
  const paraH = 0.95;
  const paraT = 0.45;
  const paraEdges: [number, boolean, number, number][] = [ // [s or t centre, along s?, length, outward sign]
    [OUTER_FACE_T - 0.35 + paraT / 2, true, 2 * BLOCK_HALF_W + 0.2, -1],
    [INNER_FACE_T + 0.35 - paraT / 2, true, 2 * BLOCK_HALF_W + 0.2, 1],
    [-BLOCK_HALF_W - 0.1 + paraT / 2, false, blockDepth + 0.7, -1],
    [BLOCK_HALF_W + 0.1 - paraT / 2, false, blockDepth + 0.7, 1],
  ];
  for (const [edgeCoord, alongS, edgeLen, outSign] of paraEdges) {
    const placeEdgeBox = (along, y0, y1, sizeAlong, sizeAcross, color, outOff?) => (
      alongS
        ? box(along, edgeCoord + outSign * (outOff || 0), y0, y1, sizeAlong, sizeAcross, color, { top: COLORS.greyLight })
        : box(edgeCoord + outSign * (outOff || 0), midT + along, y0, y1, sizeAcross, sizeAlong, color, { top: COLORS.greyLight })
    );
    placeEdgeBox(0, BLOCK_TOP_Y, BLOCK_TOP_Y + paraH, edgeLen, paraT, COLORS.grey);
    placeEdgeBox(0, BLOCK_TOP_Y + paraH, BLOCK_TOP_Y + paraH + 0.12, edgeLen + 0.1, paraT + 0.14, COLORS.greyLight);
    const bayCount = Math.max(2, Math.round(edgeLen / 2.2));
    for (let k = 0; k <= bayCount; k++) placeEdgeBox(-edgeLen / 2 + 0.25 + ((edgeLen - 0.5) * k) / bayCount, BLOCK_TOP_Y, BLOCK_TOP_Y + paraH + 0.22, 0.42, paraT + 0.12, COLORS.greyLight); // posts
    for (let k = 0; k < bayCount; k++) placeEdgeBox(-edgeLen / 2 + 0.25 + ((edgeLen - 0.5) * (k + 0.5)) / bayCount, BLOCK_TOP_Y + 0.18, BLOCK_TOP_Y + paraH - 0.16, (edgeLen - 0.5) / bayCount - 0.75, paraT + 0.04, shade(COLORS.grey, 0.8), 0); // recessed panels
  }

  // ---- the vọng lâu, lower storey and upper storey -----------------------------------------------------------
  const lowerSpec = { w: 6.3, d: 4.8, h: 2.1 };
  const upperSpec = { w: 2.7, d: 2.2, h: 1.9 };
  const towerBox = (localS, localT, ...rest: any[]) => (box as any)(localS + TOWER_OFFSET_S, localT + TOWER_OFFSET_T, ...rest);
  S.kind = KIND.MASONRY;
  towerBox(0, 0, BLOCK_TOP_Y, BLOCK_TOP_Y + 0.3, lowerSpec.w + 0.5, lowerSpec.d + 0.5, shade(COLORS.grey, 0.95), { top: COLORS.greyLight, topKind: KIND.ROAD });
  const lowerFloorY = BLOCK_TOP_Y + 0.3;
  const lowerTopY = lowerFloorY + lowerSpec.h;
  S.kind = KIND.PLAIN; // lime plaster, weathered grey
  towerBox(0, 0, lowerFloorY, lowerTopY, lowerSpec.w, lowerSpec.d, COLORS.plaster, { top: COLORS.plasterDark });
  for (const dirT of [-1, 1]) {
    const faceT = (dirT * lowerSpec.d) / 2;
    buildArchOpening(S, TOWER_OFFSET_S, faceT + TOWER_OFFSET_T, dirT, true, lowerFloorY, 1.8, 1.8, true);
    for (const sideS of [-2.05, 2.05]) buildArchOpening(S, sideS + TOWER_OFFSET_S, faceT + TOWER_OFFSET_T, dirT, true, lowerFloorY + 0.2, 1.0, 1.3, false);
    towerBox(0, faceT + dirT * 0.03, lowerFloorY, lowerFloorY + 0.35, lowerSpec.w + 0.02, 0.08, COLORS.plasterDark); // stained foot
  }
  for (const side of [-1, 1]) buildArchOpening(S, TOWER_OFFSET_S + (side * lowerSpec.w) / 2, TOWER_OFFSET_T, side, false, lowerFloorY, 1.2, 1.6, true);
  buildTierCap(S, towerBox, lowerSpec.w, lowerSpec.d, lowerTopY, 0.85, 0.3);

  const upperBaseY = lowerTopY + 0.3;
  const upperTopY = upperBaseY + upperSpec.h;
  S.kind = KIND.PLAIN;
  towerBox(0, 0, lowerTopY, upperTopY, upperSpec.w, upperSpec.d, COLORS.plaster, { top: COLORS.plasterDark });
  for (const dirT of [-1, 1]) {
    const faceT = (dirT * upperSpec.d) / 2;
    towerBox(0, faceT + dirT * 0.03, upperBaseY + 0.45, upperBaseY + 1.6, 1.7, 0.06, COLORS.brickRed); // the bare-brick panel
    buildArchOpening(S, TOWER_OFFSET_S, faceT + TOWER_OFFSET_T + dirT * 0.04, dirT, true, upperBaseY + 0.5, 1.0, 0.95, true, COLORS.brick);
  }
  for (const side of [-1, 1]) towerBox((side * upperSpec.w) / 2 + side * 0.03, 0, upperBaseY + 0.5, upperBaseY + 1.5, 0.06, 1.1, COLORS.brickRed);
  buildTierCap(S, towerBox, upperSpec.w, upperSpec.d, upperTopY, 0.8, 0.28);
}

export function build({ S }) {
  const keepKind = S.kind;
  const pavedStart = S.n;
  const box = (localS, localT, y0, y1, sizeS, sizeT, color, opts?) => {
    const pos = toWorld(localS, localT);
    S.box(pos[0], pos[1], y0, y1, sizeS, sizeT, WALL_ANGLE, color, opts);
  };

  buildGateBlockAndVault(S, box);
  buildForecourtAndFacades(S, box);
  buildParapetAndWatchtower(S, box);

  (S.paved = S.paved || []).push([pavedStart, S.n]);
  S.kind = keepKind;
}
