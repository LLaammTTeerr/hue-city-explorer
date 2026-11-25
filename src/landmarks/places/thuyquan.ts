import { KIND, hex, shade, inRing, unflat, pathLength } from '../../geo/buf.ts';
import { PAL } from '../../config.ts';
import { waterY, groundY } from '../../geo/terrain.ts';
import { bridgeProfiles } from '../../geo/bridges.ts';

// ---- Đông Thành Thủy Quan (cầu / cống Lương Y): the eastern water gate, where Ngự Hà leaves the Citadel for sông
// Đông Ba through the line of the east wall ----
//
// What the sources say (fetched Nov 2026; see docs/places/thuyquan.md):
//  - OpenStreetMap way 619851621 (man_made=bridge, historic=city_gate, alt_name Cống Lương Y) outlines it, about
//    75 m long and 4 m wide, running SE-NW on the line of đường Xuân 68 between Lê Văn Hưu and Lương Y; the road
//    over it is way 174742775 (Cầu Lương Y, residential, asphalt, maxweight 5 t).
//  - tapchikientruc.com.vn (the vaulted bridges over Ngự Hà) and anhang.vn: a timber bridge (Thanh Long kiều, 1806/
//    1808) rebuilt in brick (gạch vồ) and blue-grey stone (đá thanh) in 1830 under Minh Mạng, with a cannon workshop
//    on it; 71.7 m long, 4.9 m wide, 8.05 m high; the canal here is nearly 70 m wide, so the bridge is a masonry dam
//    with ONE vault, 8.4 m across (1.6 m wider than Tây Thành Thủy Quan's 6.6 m), of six stone rings; it had a
//    drop gate (áp quan) for boats and to hold the water. The outer (east) parapet is 1.55 m high and pierced by 13
//    round gun ports about 0.5 m across; the inner (west) parapet is 0.95 m high and keeps the two stone posts,
//    0.54 x 0.54 m, that held the gate's pivot beam. Railings and vault in đá thanh, the body in brick, the
//    abutments in laterite (đá gan gà). The deck is curved, rising to make room for the vault.
//  - doanhnhanplus.vn / vnexpress (2020): two small arched doors (about 0.8 m wide, 1-1.5 m high, seven stepped
//    brick courses on blue stone) at the two feet of the bridge, the left and right doors of the water gate, opening
//    from the Citadel onto the path beside Ngự Hà and the moat.
//  - An old postcard (Commons: "Cống Đông thành Thủy quan qua bưu ảnh xưa", "Pont Thanh-Long"): long plain walls
//    standing in the water, the deck sloping up from both banks to a single round arch framed by two pilasters.
//
// Estimated: the arch is drawn as a half circle springing 0.5 m above the water; the pilasters (1 m wide), the
// height and spacing of the gun ports (evenly along the parapet, 0.85 m above the deck), the height of the gate
// posts, the colours (dark weathered brick as on the Kinh thành, grey-green stone, rust-brown laterite at the
// waterline), and the short walls that join the bridge's feet to the ends of the rampart, with the two doors in them.
// The deck follows geo/bridges.js's profile for this bridge (4.3 m crown, climbing within 45 % of the length from
// each end), so traffic and lamp posts in landmarks/life.js ride on it.
//
// Checked against Google satellite and four car Street View panoramas (Nov 2026; scratch/rebuild/thuyquan, not in
// the repo): the OSM line sits within about 1 m and 1 degree of the deck seen from above, and its north-west end
// meets the parapets' end there, but the parapets stop about 5.5 m short of the line's south-east end, where the
// road runs on at street level to the Lê Văn Hưu corner (69-70 m of parapet, against the 71.7 m published). Two
// tall square gate posts with ball finials stand about 5 m north-east of the road's centre at that foot, one at
// the parapet's end and one about 5 m further south-east, framing the opening to the path along the canal; the
// south-east wing wall is drawn in two pieces either side of that opening. The posts are free-standing brick shafts
// (1 m square, 3.6 m shaft) under heavy squat urn caps as wide as the shaft, about twice the height of the walls
// beside them: the piece from the bridge foot to the first post (and the north-west wing wall) is a low ruined
// brick wall about 1.1 m above the bank with a small square opening, the piece from the second post to the rampart
// a retaining wall about 2.3 m high. Each parapet end stands on a short pale square pier with a cap (about 1.3 m),
// the rail easing up out of it; the parapets read pale weathered grey (đá thanh) from the deck. All read from the
// panoramas, about +-20 %.

export const id = 'thuyquan';
const GATE_NAME = 'Đông Thành Thủy Quan';

const HALF_WIDTH = 2.45; // half width (4.9 m)
const VAULT_SPAN = 8.4;
const VAULT_RADIUS = VAULT_SPAN / 2;
const RING_DEPTH = 0.9; // depth of the six stone rings, as they read on the face (estimate)
const OUTER_PARAPET_T = 0.6;
const OUTER_PARAPET_H = 1.55; // outer parapet thickness (estimate) and height
const INNER_PARAPET_T = 0.45;
const INNER_PARAPET_H = 0.95; // inner parapet
const PORT_RADIUS = 0.25;
const PORT_COUNT = 13; // gun ports
const PILASTER_W = 1.0;
const PILASTER_PROUD = 0.22; // pilasters (estimate)
// the inner corners of the rampart's two ends beside the gate (data.wall[0], metres)
const RAMPART_ENDS = [[-884.0, -1391.7], [-938.8, -1461.7]];
const SE_BARE_LEN = 5.5; // metres of road at the south-east end (u = 0) beyond the parapets' end (satellite)
const GATE_POST_V = 5.0;
const GATE_POST_GAP = 5.0; // the gate posts: offset north-east of the road's centre, spacing along it
const END_PIER_W = 0.8;
const END_PIER_H = 1.3; // the short square piers at the parapets' four ends (street view, about +-20 %)
const LOW_WING_H = 1.1;
const RETAINING_WALL_H = 2.3; // the ruined wing walls at the feet, and the retaining wall at the rampart end
const URN_PROFILE: [number, number][] = [
  [0, 0.36], [0.12, 0.44], [0.3, 0.5], [0.48, 0.47], [0.62, 0.38], [0.74, 0.24], [0.84, 0.1], [0.9, 0.03],
];

// colours: the Kinh thành's weathered brick, đá thanh, laterite, the street's asphalt
const COLORS = {
  brick: shade(PAL.brick, 0.86),
  brickDark: hex('#46443e'),
  damp: hex('#3a3833'),
  stone: hex('#858a83'),
  stoneLight: hex('#979b93'),
  stoneDark: hex('#6f746e'),
  laterite: hex('#5f4b3f'),
  asphalt: hex(PAL.road[3]),
  rail: hex('#8d908a'),
  railTop: hex('#a3a69f'), // the đá thanh parapets, weathered pale grey
};

const clamp = (val, minVal, maxVal) => Math.max(minVal, Math.min(maxVal, val));

// A straight wall of thickness thick along a line (p0, dir, len), its foot at yBotFn(u) and its top at yTopFn(u)
// (u along the line), pierced by round openings { u, r, yc }, round-headed doors { u, r, yc, y0 } (open from y0 up to
// the half circle springing at yc) or square openings { u, r, y0, y1 } (2r wide). Faces in color, the top in topColor.
function buildPiercedWall(S, { p0, dir, len }, thick, yBotFn, yTopFn, holes, color, topColor) {
  const norm = [-dir[1], dir[0]];
  const ptAt = (alongU, acrossV, y): [number, number, number] => [p0[0] + dir[0] * alongU + norm[0] * acrossV, y, p0[1] + dir[1] * alongU + norm[1] * acrossV];
  const halfT = thick / 2;
  const cutPts = [0, len];
  for (let alongU = 1; alongU < len; alongU += 1) cutPts.push(alongU);
  for (const hole of holes) {
    for (let k = -8; k <= 8; k++) cutPts.push(hole.u + (hole.r * k) / 8);
  }
  const sortedUs = [...new Set(cutPts.map((alongU) => Math.round(clamp(alongU, 0, len) * 1e4) / 1e4))].sort((a, b) => a - b);
  // the open interval at alongU (one hole at most), or null
  const openIntervalAt = (alongU) => {
    for (const hole of holes) {
      const dx = alongU - hole.u;
      if (Math.abs(dx) >= hole.r) continue;
      if (hole.y1 !== undefined) return [hole.y0, hole.y1]; // square opening
      const archDy = Math.sqrt(hole.r * hole.r - dx * dx);
      return [hole.y0 !== undefined ? hole.y0 : hole.yc - archDy, hole.yc + archDy];
    }
    return null;
  };
  const norm3 = [norm[0], 0, norm[1]];
  const dir3 = [dir[0], 0, dir[1]];
  const addSolidStrip = (uA, uB, ya0, yb0, ya1, yb1, capMask) => {
    for (const side of [-1, 1]) {
      S.quad(ptAt(uA, side * halfT, ya0), ptAt(uB, side * halfT, yb0), ptAt(uB, side * halfT, yb1), ptAt(uA, side * halfT, ya1), color, [norm3[0] * side, 0, norm3[2] * side]);
    }
    if (capMask & 1) S.quad(ptAt(uA, -halfT, ya1), ptAt(uB, -halfT, yb1), ptAt(uB, halfT, yb1), ptAt(uA, halfT, ya1), capMask & 4 ? topColor : color, [0, 1, 0]);
    if (capMask & 2) S.quad(ptAt(uA, -halfT, ya0), ptAt(uB, -halfT, yb0), ptAt(uB, halfT, yb0), ptAt(uA, halfT, ya0), color, [0, -1, 0]);
  };
  for (let i = 0; i + 1 < sortedUs.length; i++) {
    const uA = sortedUs[i];
    const uB = sortedUs[i + 1];
    if (uB - uA < 1e-4) continue;
    const gap = openIntervalAt((uA + uB) / 2);
    if (!gap) {
      addSolidStrip(uA, uB, yBotFn(uA), yBotFn(uB), yTopFn(uA), yTopFn(uB), 5);
      continue;
    }
    if (gap[0] > Math.max(yBotFn(uA), yBotFn(uB)) + 1e-3) addSolidStrip(uA, uB, yBotFn(uA), yBotFn(uB), gap[0], gap[0], 1); // below the opening, its sill
    addSolidStrip(uA, uB, gap[1], gap[1], yTopFn(uA), yTopFn(uB), 2 | 5); // above it, the soffit
  }
  // the opening's sides where it widens or narrows between slices, and the wall's two ends
  const addEndFace = (alongU, y0, y1, dirSign) => {
    if (y1 - y0 > 1e-3) S.quad(ptAt(alongU, -halfT, y0), ptAt(alongU, halfT, y0), ptAt(alongU, halfT, y1), ptAt(alongU, -halfT, y1), color, [dir3[0] * dirSign, 0, dir3[2] * dirSign]);
  };
  for (let i = 1; i + 1 < sortedUs.length; i++) {
    const alongU = sortedUs[i];
    const gapA = openIntervalAt((sortedUs[i - 1] + alongU) / 2);
    const gapB = openIntervalAt((alongU + sortedUs[i + 1]) / 2);
    if (!gapA && !gapB) continue;
    const lo = yBotFn(alongU);
    const hi = yTopFn(alongU);
    // solid on the far side but open on the near side: a face looking back into the opening
    const subtractIntervals = (spanA, spanB) => {
      if (!spanA) return [];
      if (!spanB) return [[spanA[0], spanA[1]]];
      const out = [];
      if (spanB[0] > spanA[0]) out.push([spanA[0], Math.min(spanA[1], spanB[0])]);
      if (spanB[1] < spanA[1]) out.push([Math.max(spanA[0], spanB[1]), spanA[1]]);
      return out;
    };
    for (const [y0, y1] of subtractIntervals(gapA, gapB)) addEndFace(alongU, clamp(y0, lo, hi), clamp(y1, lo, hi), -1);
    for (const [y0, y1] of subtractIntervals(gapB, gapA)) addEndFace(alongU, clamp(y0, lo, hi), clamp(y1, lo, hi), 1);
  }
  addEndFace(0, yBotFn(0), yTopFn(0), -1);
  addEndFace(len, yBotFn(len), yTopFn(len), 1);
}

function buildBridgeBodyAndVault(S, frame, dims) {
  const { toWorld, toPoint3, deckY, tan3, norm3, angle, bridgeLen } = frame;
  const { centerU, startU, waterLevel, springY, bedY } = dims;
  const vaultU0 = centerU - VAULT_RADIUS;
  const vaultU1 = centerU + VAULT_RADIUS;

  // ---- the body: two plain faces from the canal bed to the deck, cut by the vault ----
  const cuts = [0];
  for (let alongU = 1; alongU < vaultU0 - 1e-6; alongU += 1) cuts.push(alongU);
  for (let k = 0; k <= 24; k++) cuts.push(centerU - VAULT_RADIUS * Math.cos((Math.PI * k) / 24));
  for (let alongU = Math.ceil(vaultU1); alongU < bridgeLen - 1e-6; alongU += 1) cuts.push(alongU);
  cuts.push(bridgeLen);
  cuts.sort((a, b) => a - b);
  const sampleUs = cuts.filter((alongU, i) => i === 0 || alongU - cuts[i - 1] > 0.01);

  for (let i = 0; i + 1 < sampleUs.length; i++) {
    const uA = sampleUs[i];
    const uB = sampleUs[i + 1];
    const midU = (uA + uB) / 2;
    const botA = uA >= vaultU0 - 1e-6 && uB <= vaultU1 + 1e-6 ? springY + Math.sqrt(Math.max(0, VAULT_RADIUS * VAULT_RADIUS - (uA - centerU) ** 2)) : bedY;
    const botB = uA >= vaultU0 - 1e-6 && uB <= vaultU1 + 1e-6 ? springY + Math.sqrt(Math.max(0, VAULT_RADIUS * VAULT_RADIUS - (uB - centerU) ** 2)) : bedY;
    for (const side of [-1, 1]) {
      const faceV = side * HALF_WIDTH;
      const faceNorm = [norm3[0] * side, 0, norm3[2] * side];
      // the damp band at the waterline, then the brick up to the deck
      const dampTopY = waterLevel + 0.9;
      if (Math.max(botA, botB) < dampTopY) {
        S.quad(toPoint3(uA, faceV, botA), toPoint3(uB, faceV, botB), toPoint3(uB, faceV, dampTopY), toPoint3(uA, faceV, dampTopY), COLORS.damp, faceNorm);
        S.quad(toPoint3(uA, faceV, dampTopY), toPoint3(uB, faceV, dampTopY), toPoint3(uB, faceV, deckY(uB)), toPoint3(uA, faceV, deckY(uA)), COLORS.brick, faceNorm);
      } else {
        S.quad(toPoint3(uA, faceV, botA), toPoint3(uB, faceV, botB), toPoint3(uB, faceV, deckY(uB)), toPoint3(uA, faceV, deckY(uA)), COLORS.brick, faceNorm);
      }
    }
    if (midU > vaultU0 && midU < vaultU1) {
      // the vault's underside: its normal points at the arch's centre
      const archDy = (botA + botB) / 2 - springY;
      const archDu = midU - centerU;
      const dist = Math.hypot(archDu, archDy) || 1;
      const vaultNorm = [(-tan3[0] * archDu) / dist, -archDy / dist, (-tan3[2] * archDu) / dist];
      S.quad(toPoint3(uA, -HALF_WIDTH, botA), toPoint3(uB, -HALF_WIDTH, botB), toPoint3(uB, HALF_WIDTH, botB), toPoint3(uA, HALF_WIDTH, botA), COLORS.stoneDark, vaultNorm);
    }
  }
  // the vault's springing walls down into the water, and the deck ends where the street meets it
  for (const [endU, dirSign] of [[vaultU0, 1], [vaultU1, -1]]) {
    S.quad(toPoint3(endU, -HALF_WIDTH, bedY), toPoint3(endU, HALF_WIDTH, bedY), toPoint3(endU, HALF_WIDTH, springY), toPoint3(endU, -HALF_WIDTH, springY), COLORS.damp, [tan3[0] * dirSign, 0, tan3[2] * dirSign]);
  }
  for (const [endU, dirSign] of [[0, -1], [bridgeLen, 1]]) {
    S.quad(toPoint3(endU, -HALF_WIDTH, bedY), toPoint3(endU, HALF_WIDTH, bedY), toPoint3(endU, HALF_WIDTH, deckY(endU)), toPoint3(endU, -HALF_WIDTH, deckY(endU)), COLORS.brick, [tan3[0] * dirSign, 0, tan3[2] * dirSign]);
  }
  // the deck: asphalt between the parapets
  for (let i = 0; i + 1 < sampleUs.length; i++) {
    const uA = sampleUs[i];
    const uB = sampleUs[i + 1];
    S.quad(toPoint3(uA, -HALF_WIDTH + INNER_PARAPET_T, deckY(uA)), toPoint3(uA, HALF_WIDTH - OUTER_PARAPET_T, deckY(uA)), toPoint3(uB, HALF_WIDTH - OUTER_PARAPET_T, deckY(uB)), toPoint3(uB, -HALF_WIDTH + INNER_PARAPET_T, deckY(uB)), COLORS.asphalt, [0, 1, 0]);
  }

  // ---- the six stone rings on both faces, a little proud of the brick ----
  const ringSegs = 20;
  for (const side of [-1, 1]) {
    const faceV = side * (HALF_WIDTH + 0.05);
    const faceNorm = [norm3[0] * side, 0, norm3[2] * side];
    for (let k = 0; k < 6; k++) {
      const rad0 = VAULT_RADIUS + (RING_DEPTH * k) / 6;
      const rad1 = VAULT_RADIUS + (RING_DEPTH * (k + 1)) / 6;
      const ringCol = k % 2 ? COLORS.stone : COLORS.stoneLight;
      for (let j = 0; j < ringSegs; j++) {
        const ang0 = (Math.PI * j) / ringSegs;
        const ang1 = (Math.PI * (j + 1)) / ringSegs;
        const ringPt = (rad, theta) => toPoint3(centerU - rad * Math.cos(theta), faceV, springY + rad * Math.sin(theta));
        S.quad(ringPt(rad0, ang0), ringPt(rad0, ang1), ringPt(rad1, ang1), ringPt(rad1, ang0), ringCol, faceNorm);
      }
    }
    // the rings' springers: a stone block each side down to the water
    for (const endSign of [-1, 1]) {
      const springerU = centerU + endSign * (VAULT_RADIUS + RING_DEPTH / 2);
      const [x, z] = toWorld(springerU, side * (HALF_WIDTH + 0.025));
      S.box(x, z, waterLevel - 0.2, springY, RING_DEPTH, 0.05, angle, COLORS.stone);
    }
  }

  // ---- laterite footing along both faces at the waterline (not under the vault) ----
  for (const side of [-1, 1]) {
    for (const [uA, uB] of [[startU, vaultU0 - 0.02], [vaultU1 + 0.02, bridgeLen]]) {
      const [x, z] = toWorld((uA + uB) / 2, side * (HALF_WIDTH + PILASTER_PROUD / 2 - 0.05));
      S.box(x, z, waterLevel - 0.4, waterLevel + 0.55, uB - uA, PILASTER_PROUD + 0.1, angle, COLORS.laterite);
    }
  }
}

function buildParapetsPostsAndWings(S, frame, dims) {
  const { toWorld, deckY, tanDir, angle, bridgeLen } = frame;
  const { centerU, startU, waterLevel } = dims;

  // ---- pilasters framing the vault, up through the parapets, with stone caps ----
  const pilasterUs = [centerU - VAULT_RADIUS - RING_DEPTH - PILASTER_W / 2, centerU + VAULT_RADIUS + RING_DEPTH + PILASTER_W / 2];
  for (const pilU of pilasterUs) {
    for (const side of [-1, 1]) {
      const paraH = side > 0 ? OUTER_PARAPET_H : INNER_PARAPET_H;
      const paraT = side > 0 ? OUTER_PARAPET_T : INNER_PARAPET_T;
      const pilV = side * (HALF_WIDTH - paraT / 2 + PILASTER_PROUD / 2);
      const [x, z] = toWorld(pilU, pilV);
      const topY = deckY(pilU) + paraH + 0.12;
      S.box(x, z, waterLevel + 0.55, topY, PILASTER_W, paraT + PILASTER_PROUD, angle, COLORS.brickDark);
      S.box(x, z, topY, topY + 0.16, PILASTER_W + 0.14, paraT + PILASTER_PROUD + 0.14, angle, COLORS.stoneLight);
    }
  }

  // ---- parapets: the outer one with its 13 round gun ports, the inner one with the two gate posts ----
  const gunPorts = [];
  for (let k = 0; k < PORT_COUNT; k++) {
    let portU = startU + ((bridgeLen - startU) * (k + 1)) / (PORT_COUNT + 1);
    for (const pilU of pilasterUs) {
      if (Math.abs(portU - pilU) < PILASTER_W / 2 + PORT_RADIUS + 0.15) {
        portU = pilU + Math.sign(portU - centerU || 1) * (PILASTER_W / 2 + PORT_RADIUS + 0.3);
      }
    }
    gunPorts.push({ u: portU - startU, r: PORT_RADIUS, yc: deckY(portU) + 0.85 });
  }
  const parapetLine = (offsetV) => ({ p0: toWorld(startU, offsetV), dir: tanDir, len: bridgeLen - startU });
  const parapetDeckY = (localU) => deckY(localU + startU);
  // the parapets spring from their end piers: within 3 m of each end the top eases from the pier's shoulder up (or
  // down) to the parapet's own height, so the rail reads as an arc rising out of the pier
  const easedHeight = (localU, targetH) => {
    const distFromEnd = Math.min(localU, bridgeLen - startU - localU);
    const frac = clamp(distFromEnd / 3, 0, 1);
    const smooth = frac * frac * (3 - 2 * frac);
    return END_PIER_H - 0.15 + (targetH - (END_PIER_H - 0.15)) * smooth;
  };
  buildPiercedWall(S, parapetLine(HALF_WIDTH - OUTER_PARAPET_T / 2), OUTER_PARAPET_T, (u) => parapetDeckY(u) - 0.02, (u) => parapetDeckY(u) + easedHeight(u, OUTER_PARAPET_H), gunPorts, COLORS.rail, COLORS.railTop);
  buildPiercedWall(S, parapetLine(-HALF_WIDTH + INNER_PARAPET_T / 2), INNER_PARAPET_T, (u) => parapetDeckY(u) - 0.02, (u) => parapetDeckY(u) + easedHeight(u, INNER_PARAPET_H), [], COLORS.rail, COLORS.railTop);

  // the end piers: short pale square piers with a cap, the first thing seen of the bridge from either street
  for (const [pierU, side] of [[startU + END_PIER_W / 2, 1], [startU + END_PIER_W / 2, -1], [bridgeLen - END_PIER_W / 2, 1], [bridgeLen - END_PIER_W / 2, -1]]) {
    const paraT = side > 0 ? OUTER_PARAPET_T : INNER_PARAPET_T;
    const [x, z] = toWorld(pierU, side * (HALF_WIDTH - paraT / 2));
    const y = Math.min(deckY(pierU - END_PIER_W / 2), deckY(pierU + END_PIER_W / 2));
    S.box(x, z, y - 0.1, y + END_PIER_H, END_PIER_W, END_PIER_W, angle, COLORS.rail, { top: COLORS.railTop });
    S.box(x, z, y + END_PIER_H, y + END_PIER_H + 0.1, END_PIER_W + 0.14, END_PIER_W + 0.14, angle, COLORS.railTop);
    S.box(x, z, y + END_PIER_H + 0.1, y + END_PIER_H + 0.22, END_PIER_W - 0.1, END_PIER_W - 0.1, angle, COLORS.railTop);
  }
  for (const endSign of [-1, 1]) {
    const postU = centerU + endSign * (VAULT_RADIUS - 1.0);
    const [x, z] = toWorld(postU, -HALF_WIDTH + 0.27);
    const y = deckY(postU);
    S.box(x, z, y, y + 1.9, 0.54, 0.54, angle, COLORS.stoneLight, { top: COLORS.stone });
  }

  // ---- the south-east gate posts: square shafts on a plinth, a moulded cap and a ball finial ----
  const gatePosts = [[startU, GATE_POST_V], [startU - GATE_POST_GAP, GATE_POST_V]].map(([u, v]) => toWorld(u, v));
  for (const [x, z] of gatePosts) {
    const footY = groundY(x, z) - 0.2;
    S.box(x, z, footY, footY + 0.6, 1.25, 1.25, angle, COLORS.stoneDark);
    S.box(x, z, footY + 0.6, footY + 3.8, 1.0, 1.0, angle, shade(PAL.brick, 0.95));
    S.box(x, z, footY + 3.5, footY + 3.8, 1.06, 1.06, angle, COLORS.stoneLight); // the pale plastered band under the cap
    S.box(x, z, footY + 3.8, footY + 3.95, 1.22, 1.22, angle, COLORS.stoneLight);
    S.box(x, z, footY + 3.95, footY + 4.15, 1.05, 1.05, angle, COLORS.stone);
    // the finial: a heavy squat urn / bud as wide as the shaft, on a short neck
    for (let k = 0; k + 1 < URN_PROFILE.length; k++) {
      const [h0, r0] = URN_PROFILE[k];
      const [h1, r1] = URN_PROFILE[k + 1];
      S.cyl(x, z, footY + 4.15 + h0, footY + 4.15 + h1, r0, r1, 12, k < 2 ? COLORS.stone : COLORS.stoneLight, { cap: k === URN_PROFILE.length - 2 });
    }
  }

  // ---- the feet: low ruined brick walls from each end of the bridge towards the rampart, standing on the bank ----
  for (const [endIdx, rampartEnd] of RAMPART_ENDS.entries()) {
    const footU = endIdx === 0 ? startU : bridgeLen;
    const footPos = toWorld(footU, HALF_WIDTH - 0.6);
    const legs: any[] = endIdx === 0
      ? [[footPos, gatePosts[0], true, LOW_WING_H], [gatePosts[1], rampartEnd, false, RETAINING_WALL_H]]
      : [[footPos, rampartEnd, true, LOW_WING_H]];
    if (Math.hypot(rampartEnd[0] - footPos[0], rampartEnd[1] - footPos[1]) > 24) continue; // the rampart has moved in the data: leave the gap
    for (const [ptA, ptB, hasDoor, wallH] of legs) {
      const dx = ptB[0] - ptA[0];
      const dz = ptB[1] - ptA[1];
      const segLen = Math.hypot(dx, dz);
      if (segLen < 1.5) continue;
      const dir = [dx / segLen, dz / segLen];
      // the foot follows the bank (never below the water), the top a fixed height above it
      const bankYAt = (along) => Math.max(groundY(ptA[0] + dir[0] * along, ptA[1] + dir[1] * along), waterLevel + 0.3);
      const doors = hasDoor ? [{ u: segLen / 2, r: 0.3, y0: bankYAt(segLen / 2) + 0.15, y1: bankYAt(segLen / 2) + 0.75 }] : [];
      buildPiercedWall(S, { p0: ptA, dir, len: segLen }, endIdx === 0 ? 0.9 : 1.2, (u) => bankYAt(u) - 0.3, (u) => bankYAt(u) + Number(wallH), doors, COLORS.brick, COLORS.stone);
    }
  }
}

export function build({ data, S }) {
  const bridgeRec = (data.bridges || []).find((rec) => String(rec.n).normalize('NFC') === GATE_NAME.normalize('NFC'));
  if (!bridgeRec) throw new Error('Đông Thành Thủy Quan outline not found');
  const ring = unflat(bridgeRec.ring);
  const profiles = bridgeProfiles(data);
  let roadMatch = null;
  for (const roadRec of data.roads || []) {
    if (!Array.isArray(roadRec) || !roadRec[1] || !Array.isArray(roadRec[2]) || roadRec[2].length < 4) continue;
    const pts = unflat(roadRec[2]);
    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    if (inRing((firstPt[0] + lastPt[0]) / 2, (firstPt[1] + lastPt[1]) / 2, ring) && profiles.get(roadRec[2])) {
      roadMatch = { pts, profile: profiles.get(roadRec[2]) };
      break;
    }
  }
  if (!roadMatch) throw new Error('Cầu Lương Y road not found');

  const { pts, profile } = roadMatch;
  const startPt = pts[0];
  const endPt = pts[pts.length - 1];
  const bridgeLen = pathLength(pts);
  const tanDir = [(endPt[0] - startPt[0]) / bridgeLen, (endPt[1] - startPt[1]) / bridgeLen];
  let normDir = [-tanDir[1], tanDir[0]];
  if (normDir[0] < 0) normDir = [-normDir[0], -normDir[1]]; // +v faces out of the Citadel (north-east), towards the moat and sông Đông Ba
  const toWorld = (localU, localV): [number, number] => [startPt[0] + tanDir[0] * localU + normDir[0] * localV, startPt[1] + tanDir[1] * localU + normDir[1] * localV];
  const toPoint3 = (localU, localV, y) => {
    const [x, z] = toWorld(localU, localV);
    return [x, y, z];
  };
  const deckY = (localU) => profile.y(clamp(localU, 0, bridgeLen));
  const frame = {
    toWorld,
    toPoint3,
    deckY,
    tanDir,
    tan3: [tanDir[0], 0, tanDir[1]],
    norm3: [normDir[0], 0, normDir[1]],
    angle: Math.atan2(tanDir[1], tanDir[0]),
    bridgeLen,
  };
  const centerU = bridgeLen / 2;
  const startU = Math.min(SE_BARE_LEN, bridgeLen * 0.1); // where the parapets begin at the south-east end
  const waterLevel = waterY(...toWorld(centerU, 0));
  const dims = { centerU, startU, waterLevel, springY: waterLevel + 0.5, bedY: waterLevel - 1.2 };

  S.base = 0;
  S.kind = KIND.MASONRY;
  buildBridgeBodyAndVault(S, frame, dims);
  buildParapetsPostsAndWings(S, frame, dims);
  S.kind = KIND.PLAIN;
}
