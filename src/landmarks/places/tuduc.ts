import { KIND, hex, shade, obb, inRing, rand } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { pavilion } from '../citadel.ts';
import * as props from '../props.ts';

// ---- Lăng Tự Đức (Khiêm Lăng), the tomb of Emperor Tự Đức, built 1864–67 in a pine valley at Dương Xuân Thượng ----
//
// Sources (docs/places/tuduc.md has the full list):
//  - vi.wikipedia.org/wiki/Lăng_Tự_Đức: La Thành of brick and stone about 2.5 m high and over 1,800 m round, gates
//    Vụ Khiêm, Thượng Khiêm and Tự Khiêm; Lưu Khiêm lake with Xung Khiêm and Dũ Khiêm tạ on its bank; Khiêm Cung Môn,
//    a three-bay gate with an upper storey (cổ lâu) reached by three flights of steps from the lake; behind it the
//    double-roofed Hòa Khiêm điện between the Pháp Khiêm and Lễ Khiêm vu, Lương Khiêm behind, Minh Khiêm đường (the
//    theatre) on the left, Ôn Khiêm on the right, Chí Khiêm đường further right; the tomb axis to the left of the
//    temple axis: Bái Đình with two rows of mandarins, the Bi Đình with the 20-tonne Khiêm Cung Ký stele, two trụ
//    biểu, the crescent Tiểu Khiêm Trì, the Bửu Thành (bửu phong 2.96 × 1.58 × 2.47 m); Khiêm Thọ Lăng (Empress Lệ
//    Thiên Anh) with four tiers of courts, outer wall 31.5 × 21.3 m, inner wall 19 × 14.55 m, a mosaic screen; and
//    Bồi Lăng of Emperor Kiến Phúc with his temple Chấp Khiêm.
//  - baovanhoa.vn (2024, 2026): the restoration (2023–27) re-roofs Hòa Khiêm in yellow glazed tiles; Minh Khiêm is
//    nearly done; Ôn Khiêm's frame is in the workshop.
//  - OpenStreetMap (cached raw extract, data/raw): every hall's outline below, the trụ biểu node, the steps and
//    footways of both axes, the crescent pond, the sepulchre platform, Vụ Khiêm Môn.
// Estimated: heights and the split of each double hall, the gate storeys, the statue count and order, the stele and
// pillar sizes, the Bửu Thành walls, the tiers and walls of Khiêm Thọ and Bồi Lăng, the run of the La Thành.
// The lake, the crescent pond and the lake bridges are drawn by the water and bridge builders, not here.

export const id = 'tuduc';

// ---- OSM outlines, metres in the model frame ----
const KHIEM_CUNG_MON: [number, number][] = [[-2417.5, 4015.8], [-2406.7, 4015.3], [-2406, 4027.8], [-2417, 4028.3]];
const HOA_KHIEM: [number, number][] = [[-2464, 4010.6], [-2439.9, 4008.9], [-2437.8, 4039], [-2461.9, 4040.7]];
const LUONG_KHIEM: [number, number][] = [[-2498.3, 4015.4], [-2479.1, 4013.9], [-2477.1, 4040.2], [-2496.3, 4041.6]];
const MINH_KHIEM: [number, number][] = [[-2487.2, 3992.2], [-2457.2, 3990.1], [-2455.8, 4009.1], [-2485.8, 4011.2]];
const ON_KHIEM: [number, number][] = [[-2480.1, 4043.1], [-2458.8, 4041.4], [-2457.6, 4056.2], [-2478.9, 4057.8]];
const PHAP_KHIEM: [number, number][] = [[-2434, 3985.5], [-2419.8, 3984.6], [-2418.9, 3998.5], [-2433.1, 3999.4]];
const LE_KHIEM: [number, number][] = [[-2432.3, 4046.4], [-2417.8, 4045.3], [-2416.9, 4057.4], [-2431.4, 4058.5]];
const LINKS: [number, number][] = [[-2480.7, 4012.5], [-2478.3, 4041.6]];
const CHI_KHIEM: [number, number][][] = [
  [[-2409.2, 4100.6], [-2393.4, 4100.2], [-2393.2, 4111.5], [-2408.8, 4112]],
  [[-2413, 4084.1], [-2407.3, 4083.9], [-2406.9, 4100.6], [-2412.5, 4100.8]],
  [[-2397.2, 4083.3], [-2391.5, 4083.1], [-2391.1, 4100.2], [-2396.8, 4100.3]],
];
const XUNG_KHIEM: [number, number][] = [[-2349.4, 3987.3], [-2330, 3986.3], [-2329.2, 3998.9], [-2348.8, 3999.8]];
const DU_KHIEM: [number, number][] = [[-2370.5, 4016], [-2358.9, 4015.4], [-2358.5, 4022.2], [-2370.2, 4022.7]];
const BI_DINH: [number, number][] = [[-2512.4, 3943.5], [-2499.8, 3942.3], [-2498.6, 3954.1], [-2511.2, 3955.4]];
const BUU_THANH_GATE: [number, number][] = [[-2573.2, 3954.6], [-2567.6, 3954], [-2566.8, 3962.3], [-2572.3, 3962.8]];
const SEPULCHRE: [number, number][] = [[-2601.8, 3960.1], [-2601.2, 3964.6], [-2595.1, 3963.7], [-2595.7, 3959.3]];
const CRESCENT: [number, number][] = [
  [-2538.4, 3964.4], [-2536.5, 3958.8], [-2535.9, 3952.5], [-2537.5, 3945.4], [-2540.1, 3940.4],
  [-2544.3, 3938.3], [-2547.6, 3937.9], [-2551, 3939.4], [-2552.4, 3942], [-2551.8, 3944.8],
  [-2549.6, 3948.6], [-2548.6, 3952.4], [-2548.3, 3955.7], [-2547.7, 3962.7], [-2548.3, 3967.1],
  [-2548.1, 3969.7], [-2545.7, 3971.7], [-2543.5, 3971.6], [-2541.4, 3970.5], [-2539.6, 3967.2],
];
const CHAP_KHIEM: [number, number][] = [[-2412.4, 3833.4], [-2400, 3833], [-2399.6, 3851.4], [-2412, 3851.7]];
const CHAP_WINGS: [number, number][][] = [
  [[-2434.9, 3842.9], [-2418.4, 3842.6], [-2418.3, 3847.7], [-2434.8, 3848.1]],
  [[-2418.4, 3842.6], [-2412.2, 3842.4], [-2412, 3849.5], [-2418.2, 3849.6]],
];
const BOI_LANG: [number, number][] = [[-2373.4, 3828.3], [-2369.9, 3828.1], [-2369.6, 3834.1], [-2373, 3834.3]];
const TINH_KHIEM: [number, number][] = [
  [-2325, 4017], [-2308, 4016], [-2296, 4023], [-2293, 4037], [-2298, 4052], [-2311, 4064],
  [-2325, 4077], [-2343, 4081], [-2358, 4077], [-2361, 4063], [-2354, 4049], [-2343, 4043], [-2337, 4029],
];
const KHIEM_THO: [number, number] = [-2534.6, 3818.6];
const VU_KHIEM_MON: [number, number][] = [[-2287.6, 3888.6], [-2283.1, 3888], [-2281.8, 3898.3], [-2286.3, 3898.9]];
const PILLAR: [number, number] = [-2522.3, 3931.8];
const LA_THANH: [number, number][] = [
  [-2600, 3792], [-2525, 3789.5], [-2444, 3786.5], [-2387, 3785], [-2365.5, 3798], [-2311.5, 3863],
  [-2303, 3878], [-2296, 3895], [-2289, 3947], [-2285, 3978], [-2279, 4016], [-2276, 4038],
  [-2278, 4052], [-2290.3, 4069.4], [-2311.5, 4103], [-2355.2, 4134.8], [-2381.9, 4151.6],
  [-2396.2, 4157.3], [-2410.5, 4161.1], [-2530.2, 4173.1], [-2607, 4167], [-2690, 4090],
  [-2712, 4000], [-2705, 3880], [-2660, 3810],
];
const HOA_KHIEM_CENTER: [number, number] = [-2449.5, 4022.8];
const XUNG_KHIEM_CENTER: [number, number] = [-2339.4, 3992.6];
const LAKE_Y = LAND_Y + 4.2 + 0.08; // Lưu Khiêm's surface (pond level 4.2 m, as terrain.js pondY draws it)
const PRECINCT_CENTER: [number, number] = [-2490, 3975];
const ROAD_CLASS_WIDTHS = [15, 12, 9.5, 6.5, 4, 2.2];

const COLORS = {
  brick: hex('#6e6253'),
  brickMoss: hex('#5e6249'),
  stone: PAL.stone,
  stoneGrey: hex('#9b978d'),
  stoneDark: hex('#7c786f'),
  stucco: hex('#d6cdb6'),
  lacquer: hex('#86362a'),
  lacquerOld: hex('#6f3c30'),
  roofY: hex('#c49342'),
  roofYOld: hex('#a5763a'),
  roofTile: hex('#865944'),
  roofGrey: hex('#635d56'),
  rubble: hex('#70777a'),
  coping: hex('#a3a398'),
  door: hex('#2b2422'),
  moss: PAL.moss,
  mandarin: hex('#a29d92'),
  timber: hex('#5a3d2c'),
  mosaic: hex('#8fa6a0'),
  islandBank: hex('#5f5a48'),
  islandGrass: hex('#5f7346'),
};
const RIDGE_COLOR = hex('#e9d27e');

const groundY = (x: number, z: number) => LAND_Y + rise(x, z);
const distToSegment = (x: number, z: number, seg: number[]) => {
  const [ax, az, bx, bz] = seg;
  const dx = bx - ax;
  const dz = bz - az;
  const frac = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - frac * dx, z - az - frac * dz);
};
const ringCenter = (ring: [number, number][]): [number, number] =>
  ring.reduce<[number, number]>((acc, pt) => [acc[0] + pt[0] / ring.length, acc[1] + pt[1] / ring.length], [0, 0]);
const obbCorners = (box, pad = 0): [number, number][] => {
  const ux = Math.cos(box.a);
  const uz = Math.sin(box.a);
  const halfW = box.w / 2 + pad;
  const halfD = box.d / 2 + pad;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [
    box.c[0] + ux * halfW * sx - uz * halfD * sz,
    box.c[1] + uz * halfW * sx + ux * halfD * sz,
  ]);
};
const maxGroundY = (pts: [number, number][]) => Math.max(...pts.map((pt) => groundY(pt[0], pt[1])));
const minGroundY = (pts: [number, number][]) => Math.min(...pts.map((pt) => groundY(pt[0], pt[1])));
const boxSamplePoints = (cx: number, cz: number, width: number, depth: number, angle: number) =>
  obbCorners({ c: [cx, cz], w: width, d: depth, a: angle }).concat([[cx, cz]]);

interface AxisFrame {
  origin: [number, number];
  axisU: [number, number];
  axisV: [number, number];
  angle: number;
  at: (along: number, across: number) => [number, number];
}

function createAxisFrame(origin: [number, number], dir: [number, number]): AxisFrame {
  const len = Math.hypot(dir[0], dir[1]);
  const axisU: [number, number] = [dir[0] / len, dir[1] / len];
  const axisV: [number, number] = [-axisU[1], axisU[0]];
  return {
    origin,
    axisU,
    axisV,
    angle: Math.atan2(axisU[1], axisU[0]),
    at: (along, across) => [origin[0] + axisU[0] * along + axisV[0] * across, origin[1] + axisU[1] * along + axisV[1] * across],
  };
}

const frameRect = (axisFrame: AxisFrame, s0: number, s1: number, t0: number, t1: number): [number, number][] => [
  axisFrame.at(s0, t0),
  axisFrame.at(s1, t0),
  axisFrame.at(s1, t1),
  axisFrame.at(s0, t1),
];

// a block standing on the ground: from below the lowest corner to topY
function drawGroundedBlock(S, cx: number, cz: number, topY: number, width: number, depth: number, angle: number, col: number[], topCol = col, kind = KIND.MASONRY) {
  S.kind = kind;
  S.box(cx, cz, minGroundY(boxSamplePoints(cx, cz, width, depth, angle)) - 0.4, topY, width, depth, angle, col, { top: topCol });
}

// a flight of steps from start (at yA) to end (at yB), each tread standing on the ground, with cheek walls
function drawFlight(S, start: [number, number], end: [number, number], width: number, yA: number, yB: number, col = COLORS.stoneGrey, cheeks = true) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const steps = Math.max(2, Math.min(40, Math.round(Math.abs(yA - yB) / 0.18)));
  S.kind = KIND.MASONRY;
  for (let i = 0; i < steps; i++) {
    const frac = (i + 0.5) / steps;
    const cx = start[0] + dx * frac;
    const cz = start[1] + dz * frac;
    const topY = yA + (yB - yA) * frac;
    S.box(cx, cz, minGroundY(boxSamplePoints(cx, cz, len / steps + 0.02, width, angle)) - 0.3, topY, len / steps + 0.02, width, angle, shade(col, 0.92), { top: col, topKind: KIND.ROAD });
  }
  if (cheeks) {
    const ox = (-dz / len) * (width / 2 + 0.2);
    const oz = (dx / len) * (width / 2 + 0.2);
    for (const sign of [-1, 1]) {
      S.beam([start[0] + ox * sign, yA + 0.3, start[1] + oz * sign], [end[0] + ox * sign, yB + 0.3, end[1] + oz * sign], 0.4, 0.75, COLORS.stoneDark);
    }
  }
}

// a wall along a polyline, cut into short pieces that follow the ground, broken where `skip` says
function drawWallLine(S, pts: [number, number][], height: number, thick: number, col: number[], opts: Record<string, any> = {}) {
  const { closed = false, skip = () => false, cap = COLORS.stoneDark, piece = 6, capH = 0.18, body = KIND.MASONRY } = opts;
  const count = pts.length;
  const segCount = closed ? count : count - 1;
  for (let i = 0; i < segCount; i++) {
    const ptA = pts[i];
    const ptB = pts[(i + 1) % count];
    const dx = ptB[0] - ptA[0];
    const dz = ptB[1] - ptA[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.2) continue;
    const subCount = Math.max(1, Math.ceil(len / piece));
    const angle = Math.atan2(dz, dx);
    const subLen = len / subCount;
    for (let j = 0; j < subCount; j++) {
      const p0: [number, number] = [ptA[0] + dx * (j / subCount), ptA[1] + dz * (j / subCount)];
      const p1: [number, number] = [ptA[0] + dx * ((j + 1) / subCount), ptA[1] + dz * ((j + 1) / subCount)];
      const cx = (p0[0] + p1[0]) / 2;
      const cz = (p0[1] + p1[1]) / 2;
      if (skip(cx, cz, p0, p1)) continue;
      const g0 = Math.min(groundY(p0[0], p0[1]), groundY(p1[0], p1[1]));
      const g1 = Math.max(groundY(p0[0], p0[1]), groundY(p1[0], p1[1]));
      S.kind = body;
      S.box(cx, cz, g0 - 0.5, g1 + height, subLen + 0.05, thick, angle, col, { top: cap });
      S.kind = KIND.MASONRY;
      S.box(cx, cz, g1 + height, g1 + height + capH, subLen + 0.05, thick + 0.18, angle, cap);
    }
  }
}

// a straight length of wall from ptA to ptB, `width` thick (`normal` across it), its bottom and top sloping
function drawWallSlab(S, ptA: [number, number], ptB: [number, number], normal: [number, number], width: number, bot0: number, bot1: number, top0: number, top1: number, col: number[], topCol: number[]) {
  const half = width / 2;
  const ox = normal[0] * half;
  const oz = normal[1] * half;
  const dir = [ptB[0] - ptA[0], ptB[1] - ptA[1]];
  const vert = (endPt: [number, number], side: number, y: number): [number, number, number] => [endPt[0] + ox * side, y, endPt[1] + oz * side];
  const pb0 = vert(ptA, 1, bot0), pb1 = vert(ptA, -1, bot0);
  const pt0 = vert(ptA, 1, top0), pt1 = vert(ptA, -1, top0);
  const qb0 = vert(ptB, 1, bot1), qb1 = vert(ptB, -1, bot1);
  const qt0 = vert(ptB, 1, top1), qt1 = vert(ptB, -1, top1);
  S.quad(pb0, qb0, qt0, pt0, col, [normal[0], 0, normal[1]]);
  S.quad(pb1, qb1, qt1, pt1, col, [-normal[0], 0, -normal[1]]);
  S.quad(pb0, pb1, pt1, pt0, col, [-dir[0], 0, -dir[1]]);
  S.quad(qb0, qb1, qt1, qt0, col, [dir[0], 0, dir[1]]);
  S.quad(pt0, pt1, qt1, qt0, topCol, [0, 1, 0]);
}

// the La Thành: closed rubble wall whose smoothed coping stands `height` above the ground/road outside
function drawLaThanh(S, pts: [number, number][], opts: Record<string, any> = {}) {
  const { height = 3.0, thick = 0.75, piece = 4, capH = 0.3, skip = () => false } = opts;
  const count = pts.length;
  const cx0 = pts.reduce((acc, pt) => acc + pt[0] / count, 0);
  const cz0 = pts.reduce((acc, pt) => acc + pt[1] / count, 0);
  const segs: { ptA: [number, number]; ptB: [number, number]; len: number; unit: [number, number]; normal: [number, number]; s0: number }[] = [];
  let totalLen = 0;

  for (let i = 0; i < count; i++) {
    const ptA = pts[i];
    const ptB = pts[(i + 1) % count];
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (len < 0.2) continue;
    const unit: [number, number] = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len];
    let normal: [number, number] = [-unit[1], unit[0]];
    if (((ptA[0] + ptB[0]) / 2 - cx0) * normal[0] + ((ptA[1] + ptB[1]) / 2 - cz0) * normal[1] < 0) normal = [-normal[0], -normal[1]];
    segs.push({ ptA, ptB, len, unit, normal, s0: totalLen });
    totalLen += len;
  }

  const sampleAt = (dist: number) => {
    const wrapped = ((dist % totalLen) + totalLen) % totalLen;
    const seg = segs.find((item) => wrapped <= item.s0 + item.len) || segs[segs.length - 1];
    const offset = wrapped - seg.s0;
    return { pt: [seg.ptA[0] + seg.unit[0] * offset, seg.ptA[1] + seg.unit[1] * offset] as [number, number], normal: seg.normal };
  };

  const sampleCount = Math.ceil(totalLen);
  const baseHeights = new Float64Array(sampleCount);
  for (let k = 0; k < sampleCount; k++) {
    const { pt, normal } = sampleAt(k);
    baseHeights[k] = Math.max(groundY(pt[0] - normal[0], pt[1] - normal[1]), groundY(pt[0], pt[1]), groundY(pt[0] + normal[0] * 5, pt[1] + normal[1] * 5));
  }
  const runningMax = new Float64Array(sampleCount);
  const smoothed = new Float64Array(sampleCount);
  for (let k = 0; k < sampleCount; k++) {
    let best = -1e9;
    for (let j = -5; j <= 5; j++) best = Math.max(best, baseHeights[(k + j + sampleCount) % sampleCount]);
    runningMax[k] = best;
  }
  for (let k = 0; k < sampleCount; k++) {
    let sum = 0;
    for (let j = -6; j <= 6; j++) sum += runningMax[(k + j + sampleCount) % sampleCount];
    smoothed[k] = sum / 13;
  }
  const topAt = (dist: number) => {
    const frac = ((dist % sampleCount) + sampleCount) % sampleCount;
    const idx = Math.floor(frac);
    const weight = frac - idx;
    return smoothed[idx] * (1 - weight) + smoothed[(idx + 1) % sampleCount] * weight + height;
  };
  const footY = (pt: [number, number], normal: [number, number]) => Math.min(
    groundY(pt[0], pt[1]),
    groundY(pt[0] + normal[0] * (thick / 2 + 0.6), pt[1] + normal[1] * (thick / 2 + 0.6)),
    groundY(pt[0] - normal[0] * (thick / 2 + 0.3), pt[1] - normal[1] * (thick / 2 + 0.3)),
  );
  const grooveCol = shade(COLORS.rubble, 0.62);

  const drawSegment = (p0: [number, number], p1: [number, number], normal: [number, number], t0: number, t1: number, g0: number, width = thick) => {
    S.kind = KIND.PLAIN;
    drawWallSlab(S, p0, p1, normal, width, g0 - 0.5, g0 - 0.5, t0 - capH, t1 - capH, COLORS.rubble, COLORS.coping);
    S.kind = KIND.MASONRY;
    drawWallSlab(S, p0, p1, normal, width + 0.06, t0 - capH - 0.2, t1 - capH - 0.2, t0 - capH, t1 - capH, grooveCol, grooveCol);
    drawWallSlab(S, p0, p1, normal, width + 0.2, t0 - capH, t1 - capH, t0, t1, COLORS.coping, COLORS.coping);
  };

  for (const seg of segs) {
    const subCount = Math.max(1, Math.ceil(seg.len / piece));
    const subLen = seg.len / subCount;
    for (let j = 0; j < subCount; j++) {
      const p0: [number, number] = [seg.ptA[0] + seg.unit[0] * subLen * j, seg.ptA[1] + seg.unit[1] * subLen * j];
      const p1: [number, number] = [seg.ptA[0] + seg.unit[0] * subLen * (j + 1), seg.ptA[1] + seg.unit[1] * subLen * (j + 1)];
      const cx = (p0[0] + p1[0]) / 2;
      const cz = (p0[1] + p1[1]) / 2;
      if (skip(cx, cz, p0, p1)) continue;
      drawSegment(p0, p1, seg.normal, topAt(seg.s0 + subLen * j), topAt(seg.s0 + subLen * (j + 1)), Math.min(footY(p0, seg.normal), footY(p1, seg.normal)));
    }
    if (!skip(seg.ptB[0], seg.ptB[1], seg.ptB, seg.ptB)) {
      const halfPier = (thick + 0.1) / 2;
      const top = topAt(seg.s0 + seg.len);
      drawSegment(
        [seg.ptB[0] - seg.unit[0] * halfPier, seg.ptB[1] - seg.unit[1] * halfPier],
        [seg.ptB[0] + seg.unit[0] * halfPier, seg.ptB[1] + seg.unit[1] * halfPier],
        seg.normal, top, top, footY(seg.ptB, seg.normal), thick + 0.1,
      );
    }
  }
}

// brick paving laid in tiles that follow the slope, over a rectangle of a frame
function drawPaving(S, axisFrame: AxisFrame, s0: number, s1: number, t0: number, t1: number, step = 5, col = shade(COLORS.stone, 0.92), skip: (along?: number, across?: number, pt?: [number, number]) => boolean = () => false) {
  const startVert = S.n;
  S.kind = KIND.MASONRY;
  for (let along = s0; along < s1 - 0.01; along += step) {
    for (let across = t0; across < t1 - 0.01; across += step) {
      const lenS = Math.min(step, s1 - along);
      const lenT = Math.min(step, t1 - across);
      const pt = axisFrame.at(along + lenS / 2, across + lenT / 2);
      const gy = groundY(pt[0], pt[1]);
      if (skip(along + lenS / 2, across + lenT / 2, pt)) continue;
      S.box(pt[0], pt[1], minGroundY(boxSamplePoints(pt[0], pt[1], lenS, lenT, axisFrame.angle)) - 0.25, gy + 0.3, lenS + 0.04, lenT + 0.04, axisFrame.angle, COLORS.stoneGrey, { top: col, topKind: KIND.ROAD });
    }
  }
  (S.paved = S.paved || []).push([startVert, S.n]);
}

// a flat paved terrace on a slope: stone faces down to the ground, the top a court
function drawTerrace(S, cx: number, cz: number, width: number, depth: number, angle: number, topY: number, col = COLORS.stone, faceCol = COLORS.stoneGrey) {
  const startVert = S.n;
  S.kind = KIND.MASONRY;
  S.box(cx, cz, minGroundY(boxSamplePoints(cx, cz, width, depth, angle)) - 0.5, topY, width, depth, angle, faceCol, { top: col, topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([startVert, S.n]);
}

// a hall: plinth, lacquered body (verandah of columns along `front` when given) and single or double hipped roof
function drawHall(S, ring: [number, number][], opts: Record<string, any> = {}) {
  const { front = null, plinth = 0.6, base = null, wallH = 3.6, roof = COLORS.roofYOld, wall = COLORS.lacquerOld, double = false, glazed = true, over = 1.2, top = null } = opts;
  let roofH = opts.rh ?? 2.6;
  const box = obb(ring);
  const [cx, cz] = box.c;
  const angle = box.a;
  const ux = Math.cos(angle), uz = Math.sin(angle), vx = -uz, vz = ux;
  const localPt = (along: number, across: number): [number, number] => [cx + ux * along + vx * across, cz + uz * along + vz * across];
  const baseY = (base ?? maxGroundY(obbCorners(box))) + plinth;

  S.kind = KIND.MASONRY;
  S.box(cx, cz, minGroundY(obbCorners(box, 0.9)) - 0.4, baseY, box.w + 1.8, box.d + 1.8, angle, COLORS.stoneGrey, { top: COLORS.stone, topKind: KIND.ROAD });

  const frontSign = front ? (front[0] * vx + front[1] * vz >= 0 ? 1 : -1) : 1;
  if (top != null) roofH = top - baseY - wallH;
  const verandah = front ? Math.min(1.8, box.d * 0.14) : 0;
  const bodyCenter = localPt(0, -frontSign * verandah / 2);
  S.kind = KIND.TIMBER;
  S.box(bodyCenter[0], bodyCenter[1], baseY, baseY + wallH, box.w - 0.6, box.d - verandah - 0.4, angle, wall, { top: shade(roof, 0.7) });

  if (front) {
    const colCount = Math.max(3, Math.round(box.w / 3.2));
    for (let i = 0; i <= colCount; i++) {
      const pt = localPt(-box.w / 2 + 0.3 + ((box.w - 0.6) * i) / colCount, frontSign * (box.d / 2 - 0.3));
      S.cyl(pt[0], pt[1], baseY, baseY + wallH, 0.2, 0.18, 6, shade(wall, 1.12), { cap: false, rot: angle });
    }
    const doorCount = Math.max(1, Math.min(5, Math.round(box.w / 6)));
    for (let i = 0; i < doorCount; i++) {
      const pt = localPt(-box.w / 2 + (box.w * (i + 0.5)) / doorCount, frontSign * (box.d / 2 - verandah - 0.17));
      S.kind = KIND.PLAIN;
      S.box(pt[0], pt[1], baseY, baseY + Math.min(2.9, wallH * 0.78), Math.min(2.2, box.w / doorCount - 0.8), 0.1, angle, COLORS.door);
    }
  }

  const roofBaseY = baseY + wallH;
  const eave = { flare: 0.45, over, fascia: 0.28, fasciaCol: shade(wall, 0.7), ridgeCol: RIDGE_COLOR, hips: true, glazed, segs: 3 };
  if (double) {
    const frontDepth = box.d * 0.4;
    const mainDepth = box.d - frontDepth;
    const frontCenter = localPt(0, frontSign * (box.d / 2 - frontDepth / 2));
    const mainCenter = localPt(0, -frontSign * (box.d / 2 - mainDepth / 2));
    S.hip(frontCenter[0], frontCenter[1], box.w, frontDepth, angle, roofBaseY - 0.15, roofH * 0.72, roof, eave);
    S.hip(mainCenter[0], mainCenter[1], box.w, mainDepth, angle, roofBaseY, roofH, roof, eave);
    const gutterPt = localPt(0, frontSign * (box.d / 2 - frontDepth));
    S.kind = KIND.TILE;
    S.box(gutterPt[0], gutterPt[1], roofBaseY - 0.3, roofBaseY + 0.45, box.w + over, 2.6, angle, shade(roof, 0.8));
  } else {
    S.hip(cx, cz, box.w, box.d, angle, roofBaseY, roofH, roof, eave);
  }
  return roofBaseY + roofH;
}

// a masonry gate of 1 or 3 openings; `upper` adds a timber storey (lầu) on top
function drawGateHouse(S, ring: [number, number][], opts: Record<string, any> = {}) {
  const { base = null, h: wallH = 4.2, rh: roofH = 1.6, upper = false, roof = COLORS.roofYOld, body = COLORS.stoneGrey, openings = 3 } = opts;
  const box = obb(ring);
  const [cx, cz] = box.c;
  const angle = box.a;
  const ux = Math.cos(angle), uz = Math.sin(angle), vx = -uz, vz = ux;
  const localPt = (along: number, across: number): [number, number] => [cx + ux * along + vx * across, cz + uz * along + vz * across];
  const baseY = (base ?? maxGroundY(obbCorners(box))) + 0.3;

  S.kind = KIND.MASONRY;
  S.box(cx, cz, minGroundY(obbCorners(box)) - 0.4, baseY, box.w + 0.8, box.d + 0.8, angle, COLORS.stoneDark, { top: COLORS.stone, topKind: KIND.ROAD });
  const bodyDepth = box.d * 0.8;
  S.box(cx, cz, baseY, baseY + wallH, box.w, bodyDepth, angle, body, { top: COLORS.stoneDark });

  S.kind = KIND.PLAIN;
  const offsets = openings === 3 ? [-box.w * 0.3, 0, box.w * 0.3] : [0];
  for (const along of offsets) {
    for (const sign of [-1, 1]) {
      const isMid = along === 0;
      const openW = isMid ? Math.min(2.4, box.w * 0.2) : Math.min(1.7, box.w * 0.14);
      const openH = isMid ? wallH * 0.72 : wallH * 0.58;
      const pt = localPt(along, sign * (bodyDepth / 2 + 0.03));
      S.box(pt[0], pt[1], baseY, baseY + openH, openW, 0.08, angle, COLORS.door);
      S.kind = KIND.MASONRY;
      S.box(pt[0], pt[1], baseY + openH, baseY + openH + 0.35, openW + 0.6, 0.14, angle, COLORS.stucco);
      S.kind = KIND.PLAIN;
    }
  }

  const eave = { flare: 0.4, fascia: 0.24, fasciaCol: COLORS.stoneDark, ridgeCol: RIDGE_COLOR, hips: true, glazed: true, segs: 3 };
  if (!upper) {
    S.hip(cx, cz, box.w, bodyDepth, angle, baseY + wallH, roofH, roof, { ...eave, over: 0.7 });
    return baseY + wallH + roofH;
  }
  S.hip(cx, cz, box.w, bodyDepth, angle, baseY + wallH, roofH * 0.75, roof, { ...eave, over: 0.8, ridgeCol: null });
  const upperY = baseY + wallH + 0.45;
  const upperW = box.w * 0.62;
  const upperD = bodyDepth * 0.55;
  S.kind = KIND.TIMBER;
  S.box(cx, cz, upperY, upperY + 2.3, upperW, upperD, angle, COLORS.lacquer, { top: shade(roof, 0.7) });
  for (const sign of [-1, 1]) {
    const pt = localPt(0, sign * (upperD / 2 + 0.03));
    S.kind = KIND.PLAIN;
    S.box(pt[0], pt[1], upperY + 0.5, upperY + 1.9, upperW * 0.7, 0.06, angle, COLORS.door);
  }
  S.hip(cx, cz, upperW, upperD, angle, upperY + 2.3, roofH * 1.2, roof, { ...eave, over: 0.9 });
  return upperY + 2.3 + roofH * 1.2;
}

// a water pavilion on piles: posts from the lake bed, a timber deck over the water, an open hall on it
function drawWaterPavilion(S, ring: [number, number][], opts: { deck: number; wallH: number; top: number; roof?: number[] }) {
  const { deck, wallH, top, roof = COLORS.roofYOld } = opts;
  const box = obb(ring);
  const [cx, cz] = box.c;
  const angle = box.a;
  const ux = Math.cos(angle), uz = Math.sin(angle), vx = -uz, vz = ux;
  const localPt = (along: number, across: number): [number, number] => [cx + ux * along + vx * across, cz + uz * along + vz * across];

  S.kind = KIND.MASONRY;
  const colsU = Math.max(2, Math.round(box.w / 2.4));
  const colsV = Math.max(2, Math.round(box.d / 2.4));
  for (let i = 0; i <= colsU; i++) {
    for (let j = 0; j <= colsV; j++) {
      const pt = localPt(-box.w / 2 + (box.w * i) / colsU, -box.d / 2 + (box.d * j) / colsV);
      S.box(pt[0], pt[1], Math.min(groundY(pt[0], pt[1]), LAKE_Y) - 1.2, deck - 0.3, 0.38, 0.38, angle, COLORS.stoneGrey);
    }
  }
  S.kind = KIND.TIMBER;
  S.box(cx, cz, deck - 0.3, deck, box.w + 0.4, box.d + 0.4, angle, COLORS.timber, { top: shade(COLORS.timber, 1.15) });
  const deckCorners = obbCorners(box, 0.15);
  for (let i = 0; i < 4; i++) {
    const p0 = deckCorners[i];
    const p1 = deckCorners[(i + 1) % 4];
    S.beam([p0[0], deck + 0.55, p0[1]], [p1[0], deck + 0.55, p1[1]], 0.12, 0.1, COLORS.lacquerOld);
  }
  return pavilion(S, cx, cz, box.w - 1.0, box.d - 1.0, angle, deck, { wallH, rh: top - deck - wallH, roof, wall: COLORS.lacquerOld, colonnade: true, over: 1.3, platform: 0, segs: 3 });
}

function extractSiteRings(data, kindFilter: (item: any) => boolean): [number, number][][] {
  const site = data && data.sites && data.sites.tuduc;
  if (!site) return [];
  return site.items
    .filter((item) => kindFilter(item) && item.ring && item.ring.length >= 6)
    .map((item) => {
      const ring: [number, number][] = [];
      for (let k = 0; k + 1 < item.ring.length; k += 2) ring.push([item.ring[k] / 10, item.ring[k + 1] / 10]);
      return ring;
    });
}

// the temple (Khiêm Cung) facing east over the lake: Khiêm Cung Môn, courts, Hòa Khiêm, Lương Khiêm, side halls, Chí Khiêm
function buildTemplePrecinct(S, data, claim: (ring: [number, number][]) => void, claimed: [number, number][]) {
  const templeFrame = createAxisFrame(ringCenter(KHIEM_CUNG_MON), [-0.9975, 0.0704]);
  const eastDir: [number, number] = [-templeFrame.axisU[0], -templeFrame.axisU[1]];

  const gateBase = maxGroundY(KHIEM_CUNG_MON);
  drawGateHouse(S, KHIEM_CUNG_MON, { base: gateBase, h: 4.3, rh: 1.7, upper: true, roof: COLORS.roofYOld });
  claim(KHIEM_CUNG_MON);

  const gateTopY = gateBase + 0.3;
  for (const across of [-3.9, 0, 3.9]) {
    const footPt = templeFrame.at(-11.5, across);
    drawFlight(S, templeFrame.at(-5.6, across), footPt, across === 0 ? 2.8 : 2.2, gateTopY, groundY(footPt[0], footPt[1]) + 0.3);
  }

  // forecourt paved down to the lake bank at Dũ Khiêm
  const lakeRings = extractSiteRings(data, (item) => item.k === 'w');
  const isWet = (x: number, z: number) => lakeRings.some((ring) => inRing(x, z, ring))
    || [[2.6, 0], [-2.6, 0], [0, 2.6], [0, -2.6]].some(([dx, dz]) => lakeRings.some((ring) => inRing(x + dx, z + dz, ring)));
  const inSteps = (along: number, across: number) => along > -12.4 && Math.abs(across) < 5.6;
  drawPaving(S, templeFrame, -40, -6.9, -27, 40.6, 3, shade(COLORS.stone, 0.9), (along, across, pt) => inSteps(along, across) || (along < -21.6 && across > 25) || isWet(pt[0], pt[1]));
  drawWallLine(S, [templeFrame.at(0, 41), templeFrame.at(-21, 41), templeFrame.at(-21, 25)], 2.3, 0.55, COLORS.brickMoss, { cap: COLORS.stoneDark });

  const compoundWall = [templeFrame.at(0, -6.6), templeFrame.at(0, -41), templeFrame.at(91, -41), templeFrame.at(91, 41), templeFrame.at(0, 41), templeFrame.at(0, 6.6)];
  drawWallLine(S, compoundWall, 2.3, 0.55, COLORS.brickMoss, { cap: COLORS.stoneDark });
  drawPaving(S, templeFrame, 0.6, 90.6, -40.6, 40.6, 6);

  const frontCourtRef = templeFrame.at(26, 0);
  const frontCourtY = groundY(frontCourtRef[0], frontCourtRef[1]) + 0.15;
  const frontCourtCenter = templeFrame.at(16, 0);
  drawTerrace(S, frontCourtCenter[0], frontCourtCenter[1], 20.5, 44, templeFrame.angle, frontCourtY);
  drawFlight(S, templeFrame.at(5.5, 0), templeFrame.at(6.5, 0), 3.2, gateBase + 0.3, frontCourtY, COLORS.stoneGrey, false);

  const rearCourtRef = templeFrame.at(62, 0);
  const rearCourtY = groundY(rearCourtRef[0], rearCourtRef[1]) + 0.15;
  const rearCourtCenter = templeFrame.at(57.5, 0);
  drawTerrace(S, rearCourtCenter[0], rearCourtCenter[1], 10, 34, templeFrame.angle, rearCourtY);

  // Hòa Khiêm điện, Lương Khiêm điện, Minh Khiêm đường
  const hoaKhiemBase = Math.max(frontCourtY, maxGroundY(HOA_KHIEM));
  drawHall(S, HOA_KHIEM, { front: eastDir, base: hoaKhiemBase, plinth: 0.55, wallH: 3.9, top: groundY(HOA_KHIEM_CENTER[0], HOA_KHIEM_CENTER[1]) + 7.6, roof: COLORS.roofY, wall: COLORS.lacquer, double: true });
  claim(HOA_KHIEM);
  drawFlight(S, templeFrame.at(26.4, 0), templeFrame.at(25.2, 0), 4, hoaKhiemBase + 0.55, frontCourtY, COLORS.stoneGrey, false);

  drawHall(S, LUONG_KHIEM, { front: eastDir, base: Math.max(rearCourtY, maxGroundY(LUONG_KHIEM)), plinth: 0.5, wallH: 3.8, rh: 3.1, roof: COLORS.roofY, wall: COLORS.lacquer, double: true });
  claim(LUONG_KHIEM);
  drawHall(S, MINH_KHIEM, { front: [templeFrame.axisV[0], templeFrame.axisV[1]], plinth: 0.5, wallH: 3.9, rh: 3.3, roof: COLORS.roofGrey, wall: COLORS.lacquer, double: true, glazed: false });
  claim(MINH_KHIEM);

  // Ôn Khiêm: bare stone plinth with column bases (frame under restoration)
  const onKhiemBox = obb(ON_KHIEM);
  const onKhiemY = maxGroundY(obbCorners(onKhiemBox)) + 0.45;
  drawTerrace(S, onKhiemBox.c[0], onKhiemBox.c[1], onKhiemBox.w + 1.8, onKhiemBox.d + 1.8, onKhiemBox.a, onKhiemY);
  const ux = Math.cos(onKhiemBox.a), uz = Math.sin(onKhiemBox.a);
  const colsU = Math.max(3, Math.round(onKhiemBox.w / 3.2));
  const colsV = Math.max(3, Math.round(onKhiemBox.d / 3));
  S.kind = KIND.MASONRY;
  for (let i = 0; i <= colsU; i++) {
    for (let j = 0; j <= colsV; j++) {
      const along = -onKhiemBox.w / 2 + 0.4 + ((onKhiemBox.w - 0.8) * i) / colsU;
      const across = -onKhiemBox.d / 2 + 0.4 + ((onKhiemBox.d - 0.8) * j) / colsV;
      S.box(onKhiemBox.c[0] + ux * along - uz * across, onKhiemBox.c[1] + uz * along + ux * across, onKhiemY, onKhiemY + 0.22, 0.6, 0.6, onKhiemBox.a, COLORS.stoneDark);
    }
  }
  claim(ON_KHIEM);

  // Pháp Khiêm, Lễ Khiêm, small links beside Lương Khiêm, and Chí Khiêm đường
  drawHall(S, PHAP_KHIEM, { front: [-templeFrame.axisV[0], -templeFrame.axisV[1]], plinth: 0.45, wallH: 3.2, rh: 2.4, roof: COLORS.roofTile, glazed: false });
  drawHall(S, LE_KHIEM, { front: [templeFrame.axisV[0], templeFrame.axisV[1]], plinth: 0.45, wallH: 3.2, rh: 2.4, roof: COLORS.roofTile, glazed: false });
  claim(PHAP_KHIEM);
  claim(LE_KHIEM);

  for (const [x, z] of LINKS) {
    const linkY = groundY(x, z) + 0.4;
    drawGroundedBlock(S, x, z, linkY, 3.6, 3.6, templeFrame.angle, COLORS.stoneGrey, COLORS.stone);
    S.kind = KIND.TIMBER;
    S.box(x, z, linkY, linkY + 2.6, 2.8, 2.8, templeFrame.angle, COLORS.lacquerOld);
    S.hip(x, z, 2.8, 2.8, templeFrame.angle, linkY + 2.6, 1.3, COLORS.roofYOld, { flare: 0.25, over: 0.6, hips: true, glazed: true });
    claimed.push([x, z]);
  }

  drawHall(S, CHI_KHIEM[0], { front: [0, -1], plinth: 0.45, wallH: 3.3, rh: 2.5, roof: COLORS.roofGrey, glazed: false });
  drawHall(S, CHI_KHIEM[1], { front: [1, 0], plinth: 0.4, wallH: 3.0, rh: 2.0, roof: COLORS.roofGrey, glazed: false });
  drawHall(S, CHI_KHIEM[2], { front: [-1, 0], plinth: 0.4, wallH: 3.0, rh: 2.0, roof: COLORS.roofGrey, glazed: false });
  claimed.push([-2401.4, 4096.4]);
  const chiKhiemY = maxGroundY([[-2406, 4086], [-2398, 4086], [-2398, 4099], [-2406, 4099]]) + 0.1;
  drawTerrace(S, -2402, 4092, 9, 15, Math.PI / 2, chiKhiemY);
}

// Lưu Khiêm lake pavilions (Xung Khiêm, Dũ Khiêm), Tịnh Khiêm island, and Vụ Khiêm Môn
function buildLakePavilionsAndIsland(S, data, claim: (ring: [number, number][]) => void) {
  drawWaterPavilion(S, XUNG_KHIEM, { deck: LAKE_Y + 0.6, wallH: 2.8, top: groundY(XUNG_KHIEM_CENTER[0], XUNG_KHIEM_CENTER[1]) + 4.7 });
  claim(XUNG_KHIEM);
  drawFlight(S, [-2340, 3985.6], [-2340, 3981.2], 3.2, LAKE_Y + 0.6, groundY(-2340, 3981.2) + 0.05);
  drawWaterPavilion(S, DU_KHIEM, { deck: LAKE_Y + 0.55, wallH: 2.6, top: LAKE_Y + 0.55 + 4.6 });
  claim(DU_KHIEM);

  S.kind = KIND.MASONRY;
  S.prism(TINH_KHIEM, LAKE_Y - 1.6, LAKE_Y + 0.35, COLORS.islandBank, COLORS.islandGrass, { topKind: KIND.GROUND });
  if (Array.isArray(data && data.trees)) {
    const xs = TINH_KHIEM.map((pt) => pt[0]);
    const zs = TINH_KHIEM.map((pt) => pt[1]);
    const distEdge = (x: number, z: number) => Math.min(...TINH_KHIEM.map((pt, idx) => {
      const next = TINH_KHIEM[(idx + 1) % TINH_KHIEM.length];
      return distToSegment(x, z, [pt[0], pt[1], next[0], next[1]]);
    }));
    let seed = 0;
    for (let x = Math.min(...xs) + 2; x < Math.max(...xs); x += 5.5) {
      for (let z = Math.min(...zs) + 2; z < Math.max(...zs); z += 5.5, seed++) {
        const treeX = x + (rand(seed, 81) - 0.5) * 4;
        const treeZ = z + (rand(seed, 82) - 0.5) * 4;
        if (!inRing(treeX, treeZ, TINH_KHIEM) || distEdge(treeX, treeZ) < 1.5) continue;
        data.trees.push(Math.round(treeX * 10), Math.round(treeZ * 10), 10 + Math.floor(rand(seed, 83) * 6), rand(seed, 84) < 0.5 ? 1 : 0);
      }
    }
  }

  drawGateHouse(S, VU_KHIEM_MON, { h: 3.9, rh: 1.5, roof: COLORS.roofYOld, body: COLORS.stoneGrey });
  claim(VU_KHIEM_MON);
}

// Bi Đình stele pavilion and Khiêm Cung Ký stele
function buildBiDinh(S, tombFrame: AxisFrame, stelePlatformY: number, claim: (ring: [number, number][]) => void) {
  const box = obb(BI_DINH);
  const angle = box.a;
  const ux = Math.cos(angle), uz = Math.sin(angle), vx = -uz, vz = ux;
  const localPt = (along: number, across: number): [number, number] => [box.c[0] + ux * along + vx * across, box.c[1] + uz * along + vz * across];
  const halfW = box.w / 2;
  const halfD = box.d / 2;
  const wallThick = 1.3;
  const wallH = 5.6;
  const archW = 2.6;
  const archH = 3.9;

  S.kind = KIND.MASONRY;
  S.box(box.c[0], box.c[1], stelePlatformY - 0.2, stelePlatformY + 0.35, box.w + 1.2, box.d + 1.2, angle, COLORS.stoneGrey, { top: COLORS.stone, topKind: KIND.ROAD });
  const floorY = stelePlatformY + 0.35;

  const drawArchWall = (p0: [number, number], p1: [number, number], alongDir: [number, number], len: number, wallAng: number) => {
    const pierLen = (len - archW) / 2;
    const mid: [number, number] = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    for (const sign of [-1, 1]) {
      const pierCenter = [mid[0] + alongDir[0] * sign * (archW / 2 + pierLen / 2), mid[1] + alongDir[1] * sign * (archW / 2 + pierLen / 2)];
      S.box(pierCenter[0], pierCenter[1], floorY, floorY + wallH, pierLen, wallThick, wallAng, COLORS.brickMoss, { top: COLORS.moss });
    }
    S.box(mid[0], mid[1], floorY + archH, floorY + wallH, archW, wallThick, wallAng, COLORS.brickMoss, { top: COLORS.moss });
    S.box(mid[0], mid[1], floorY + wallH, floorY + wallH + 0.35, len + 0.3, wallThick + 0.3, wallAng, COLORS.stoneDark);
  };

  drawArchWall(localPt(-halfW, -halfD + wallThick / 2), localPt(halfW, -halfD + wallThick / 2), [ux, uz], box.w, angle);
  drawArchWall(localPt(-halfW, halfD - wallThick / 2), localPt(halfW, halfD - wallThick / 2), [ux, uz], box.w, angle);
  drawArchWall(localPt(-halfW + wallThick / 2, -halfD), localPt(-halfW + wallThick / 2, halfD), [vx, vz], box.d - wallThick * 2, angle + Math.PI / 2);
  drawArchWall(localPt(halfW - wallThick / 2, -halfD), localPt(halfW - wallThick / 2, halfD), [vx, vz], box.d - wallThick * 2, angle + Math.PI / 2);

  const roofBaseY = floorY + wallH + 0.35;
  const eave = { flare: 0.45, fascia: 0.26, fasciaCol: COLORS.lacquerOld, ridgeCol: RIDGE_COLOR, hips: true, glazed: true, segs: 3 };
  S.hip(box.c[0], box.c[1], box.w + 0.3, box.d + 0.3, angle, roofBaseY, 1.6, COLORS.roofY, { ...eave, over: 1.0, ridgeCol: null });
  const upperW = box.w * 0.6;
  const upperD = box.d * 0.6;
  const upperY = roofBaseY + 0.5;
  S.kind = KIND.TIMBER;
  S.box(box.c[0], box.c[1], upperY, upperY + 1.7, upperW, upperD, angle, COLORS.lacquerOld, { top: shade(COLORS.roofY, 0.7) });
  S.hip(box.c[0], box.c[1], upperW, upperD, angle, upperY + 1.7, 2.3, COLORS.roofY, { ...eave, over: 1.0 });
  claim(BI_DINH);

  // Khiêm Cung Ký stele on its pedestal
  S.box(box.c[0], box.c[1], floorY, floorY + 0.9, 1.4, 3.1, tombFrame.angle, COLORS.stoneGrey, { top: COLORS.stoneDark });
  S.box(box.c[0], box.c[1], floorY + 0.9, floorY + 4.9, 0.7, 2.3, tombFrame.angle, COLORS.stoneDark);
  S.box(box.c[0], box.c[1], floorY + 4.9, floorY + 5.35, 0.85, 2.5, tombFrame.angle, shade(COLORS.stoneDark, 0.9), { taper: 0.85 });
}

// the tomb axis (Khiêm Lăng proper): Bái Đình, Bi Đình, trụ biểu, Tiểu Khiêm Trì, Bửu Thành
function buildTombAxis(S, claim: (ring: [number, number][]) => void, keep: [number, number][][]) {
  const tombFrame = createAxisFrame(ringCenter(BI_DINH), [-92.9, 13.1]);
  const courtRef = tombFrame.at(-21, 0);
  const courtY = groundY(courtRef[0], courtRef[1]) + 0.3;
  const courtCenter = tombFrame.at(-32, 0);
  drawTerrace(S, courtCenter[0], courtCenter[1], 22, 24, tombFrame.angle, courtY);
  const stairTop = tombFrame.at(-43, 0);
  const stairFoot = tombFrame.at(-53, 0);
  drawFlight(S, stairTop, stairFoot, 5, courtY, groundY(stairFoot[0], stairFoot[1]) + 0.05);

  // statues of the salutation court (about 1.75 m with plinth)
  for (const sign of [-1, 1]) {
    const faceAngle = tombFrame.angle + (Math.PI / 2) * -sign;
    const elePt = tombFrame.at(-39.5, sign * 7.2);
    props.elephant(S, elePt[0], courtY, elePt[1], faceAngle, { s: 0.95, col: COLORS.mandarin });
    const horsePt = tombFrame.at(-35.5, sign * 7.2);
    props.horse(S, horsePt[0], courtY, horsePt[1], faceAngle, { s: 0.95, col: COLORS.mandarin });
    for (let i = 0; i < 3; i++) {
      for (const offset of [4.2, 7.4]) {
        const pt = tombFrame.at(-31 + i * 3.4, sign * offset);
        props.mandarin(S, pt[0], courtY, pt[1], faceAngle, { military: offset > 5, h: 1.75, col: COLORS.mandarin, plinth: true });
      }
    }
  }

  const stelePlatformY = maxGroundY([tombFrame.at(-10.25, -10.5), tombFrame.at(-10.25, 10.5), tombFrame.at(10.25, -10.5), tombFrame.at(10.25, 10.5)]) + 0.35;
  const steleCenter = tombFrame.at(0, 0);
  drawTerrace(S, steleCenter[0], steleCenter[1], 20.5, 21, tombFrame.angle, stelePlatformY);
  drawFlight(S, tombFrame.at(-21, 0), tombFrame.at(-10.25, 0), 4.5, courtY, stelePlatformY);
  buildBiDinh(S, tombFrame, stelePlatformY, claim);

  // two trụ biểu pillars behind Bi Đình
  const relX = PILLAR[0] - tombFrame.origin[0];
  const relZ = PILLAR[1] - tombFrame.origin[1];
  const pillarS = relX * tombFrame.axisU[0] + relZ * tombFrame.axisU[1];
  const pillarT = relX * tombFrame.axisV[0] + relZ * tombFrame.axisV[1];
  for (const sign of [1, -1]) {
    const [x, z] = tombFrame.at(pillarS, pillarT * sign);
    const gy = groundY(x, z);
    S.kind = KIND.MASONRY;
    S.box(x, z, gy - 0.4, gy + 0.9, 2.0, 2.0, tombFrame.angle, COLORS.stoneGrey, { top: COLORS.stoneDark });
    S.box(x, z, gy + 0.9, gy + 7.0, 1.05, 1.05, tombFrame.angle, COLORS.brickMoss, { taper: 0.85 });
    S.box(x, z, gy + 7.0, gy + 7.5, 1.2, 1.2, tombFrame.angle, COLORS.stoneDark);
    S.box(x, z, gy + 7.5, gy + 8.2, 0.7, 0.7, tombFrame.angle, COLORS.stucco, { taper: 0.4 });
  }

  // Tiểu Khiêm Trì crescent pond kerb
  drawWallLine(S, CRESCENT, 0.35, 0.35, COLORS.stoneGrey, { closed: true, cap: COLORS.stoneDark, piece: 4 });

  // Bửu Thành: gate, outer/inner walls, screen, walk, and sepulchre
  const gateS = 65.6;
  const gateBox = obb(BUU_THANH_GATE);
  drawGateHouse(S, BUU_THANH_GATE, { h: 3.9, rh: 1.7, roof: COLORS.roofYOld, body: COLORS.brickMoss, openings: 1 });
  claim(BUU_THANH_GATE);
  const gateY = maxGroundY(obbCorners(gateBox)) + 0.3;
  const approachFoot = tombFrame.at(gateS - 8.2, 0);
  drawFlight(S, tombFrame.at(gateS - 3.4, 0), approachFoot, 3.4, gateY, groundY(approachFoot[0], approachFoot[1]) + 0.05);

  const outerWall = [tombFrame.at(gateS, -4.6), tombFrame.at(gateS, -15), tombFrame.at(106, -15), tombFrame.at(106, 15), tombFrame.at(gateS, 15), tombFrame.at(gateS, 4.6)];
  drawWallLine(S, outerWall, 2.5, 0.7, COLORS.brickMoss);
  const innerWall = [tombFrame.at(84, -1.6), tombFrame.at(84, -8), tombFrame.at(103, -8), tombFrame.at(103, 8), tombFrame.at(84, 8), tombFrame.at(84, 1.6)];
  drawWallLine(S, innerWall, 1.9, 0.55, COLORS.brickMoss);
  drawPaving(S, tombFrame, 84.4, 102.6, -7.6, 7.6, 4.6);

  const screenPt = tombFrame.at(73, 0);
  drawGroundedBlock(S, screenPt[0], screenPt[1], groundY(screenPt[0], screenPt[1]) + 2.6, 0.6, 5.2, tombFrame.angle, COLORS.stucco, COLORS.stoneDark);

  const walkStart = S.n;
  for (let along = gateS + 3; along < 84; along += 3) {
    const pt = tombFrame.at(along + 1.5, 0);
    const gy = groundY(pt[0], pt[1]);
    S.kind = KIND.MASONRY;
    S.box(pt[0], pt[1], gy - 0.3, gy + 0.12, 3.05, 2.4, tombFrame.angle, COLORS.stoneGrey, { top: COLORS.stone, topKind: KIND.ROAD });
  }
  (S.paved = S.paved || []).push([walkStart, S.n]);

  const sepBox = obb(SEPULCHRE);
  const sepPlatformY = maxGroundY(obbCorners(sepBox)) + 0.6;
  drawGroundedBlock(S, sepBox.c[0], sepBox.c[1], sepPlatformY, sepBox.w, sepBox.d, sepBox.a, COLORS.stoneGrey, COLORS.stone);
  S.kind = KIND.MASONRY;
  S.box(sepBox.c[0], sepBox.c[1], sepPlatformY, sepPlatformY + 2.1, 2.96, 1.58, tombFrame.angle, COLORS.stoneDark);
  S.box(sepBox.c[0], sepBox.c[1], sepPlatformY + 2.1, sepPlatformY + 2.47, 3.1, 1.7, tombFrame.angle, shade(COLORS.stoneDark, 0.9), { taper: 0.7 });
  claim(SEPULCHRE);
  keep.push(outerWall);
}

// Khiêm Thọ Lăng (Empress Lệ Thiên Anh) across the lake
function buildKhiemThoLang(S, claimed: [number, number][], keep: [number, number][][]) {
  const ktFrame = createAxisFrame(KHIEM_THO, [0.62, 0.785]);
  const tiers: [number, number][] = [[-6, 9.5], [9.5, 15], [15, 20.2], [20.2, 25.5]];
  let prevY: number | null = null;
  for (const [s0, s1] of tiers) {
    const refPt = ktFrame.at(s0, 0);
    const tierY = groundY(refPt[0], refPt[1]) + 0.45;
    const center = ktFrame.at((s0 + s1) / 2, 0);
    drawTerrace(S, center[0], center[1], s1 - s0, 21.3, ktFrame.angle, tierY, COLORS.stone, COLORS.stoneGrey);
    if (prevY != null && prevY > tierY + 0.2) drawFlight(S, ktFrame.at(s0 - 0.1, 0), ktFrame.at(s0 + 1.6, 0), 2.6, prevY, tierY, COLORS.stoneGrey, false);
    prevY = tierY;
  }
  drawWallLine(S, [ktFrame.at(25.5, 2), ktFrame.at(25.5, 10.65), ktFrame.at(-6, 10.65), ktFrame.at(-6, -10.65), ktFrame.at(25.5, -10.65), ktFrame.at(25.5, -2)], 2.2, 0.55, COLORS.brickMoss);
  drawWallLine(S, [ktFrame.at(9.5, 1.4), ktFrame.at(9.5, 7.3), ktFrame.at(-4.5, 7.3), ktFrame.at(-4.5, -7.3), ktFrame.at(9.5, -7.3), ktFrame.at(9.5, -1.4)], 1.8, 0.45, COLORS.brickMoss);

  const tombRef = ktFrame.at(-6, 0);
  const tombBaseY = groundY(tombRef[0], tombRef[1]) + 0.45;
  S.kind = KIND.MASONRY;
  S.box(KHIEM_THO[0], KHIEM_THO[1], tombBaseY, tombBaseY + 0.5, 5.4, 3.2, ktFrame.angle, COLORS.stoneGrey, { top: COLORS.stone });
  S.box(KHIEM_THO[0], KHIEM_THO[1], tombBaseY + 0.5, tombBaseY + 2.5, 2.96, 1.58, ktFrame.angle, COLORS.stoneDark);
  S.box(KHIEM_THO[0], KHIEM_THO[1], tombBaseY + 2.5, tombBaseY + 2.9, 3.1, 1.7, ktFrame.angle, shade(COLORS.stoneDark, 0.9), { taper: 0.7 });

  const screenPt = ktFrame.at(28, 0);
  drawGroundedBlock(S, screenPt[0], screenPt[1], groundY(screenPt[0], screenPt[1]) + 2.4, 5.4, 0.6, ktFrame.angle, COLORS.mosaic, COLORS.stoneDark);
  claimed.push(KHIEM_THO);
  keep.push(frameRect(ktFrame, -7, 29, -12, 12));
}

// Bồi Lăng (Emperor Kiến Phúc): Chấp Khiêm temple and walled sepulchre
function buildBoiLang(S, claim: (ring: [number, number][]) => void) {
  drawHall(S, CHAP_KHIEM, { front: [1, 0], plinth: 0.5, wallH: 3.6, rh: 2.8, roof: COLORS.roofYOld, double: true });
  claim(CHAP_KHIEM);
  for (const wingRing of CHAP_WINGS) {
    drawHall(S, wingRing, { plinth: 0.4, wallH: 3.0, rh: 1.9, roof: COLORS.roofTile, glazed: false });
    claim(wingRing);
  }
  const box = obb(BOI_LANG);
  const terraceY = maxGroundY(obbCorners(box, 2)) + 0.4;
  drawPaving(S, createAxisFrame([-2371.5, 3831.2], [1, 0]), -9.2, 9.2, -11, 11, 4.6);
  drawTerrace(S, box.c[0], box.c[1], 9, 12, Math.PI / 2, terraceY);
  S.kind = KIND.MASONRY;
  S.box(box.c[0], box.c[1], terraceY, terraceY + 0.4, box.w, box.d, box.a, COLORS.stoneGrey, { top: COLORS.stone });
  S.box(box.c[0], box.c[1], terraceY + 0.4, terraceY + 1.9, box.w * 0.7, box.d * 0.55, box.a, COLORS.stoneDark, { taper: 0.8 });
  claim(BOI_LANG);
  drawWallLine(S, [[-2368.3, 3842.5], [-2362, 3842.5], [-2362, 3820], [-2381, 3820], [-2381, 3842.5], [-2374.7, 3842.5]], 1.9, 0.5, COLORS.brickMoss);
}

// La Thành precinct wall, dense broadleaf canopy behind its south/south-east run, and remaining mapped buildings
function buildLaThanhAndRemaining(S, data, claimed: [number, number][], claimedRings: [number, number][][], keep: [number, number][][]) {
  const waters = extractSiteRings(data, (item) => item.k === 'w');
  const paths: number[][] = [];
  for (const [roadClass, bridge, flat] of (data && data.roads) || []) {
    if (bridge) continue;
    for (let i = 0; i + 3 < flat.length; i += 2) {
      const ax = flat[i] / 10, az = flat[i + 1] / 10, bx = flat[i + 2] / 10, bz = flat[i + 3] / 10;
      if (Math.hypot((ax + bx) / 2 - PRECINCT_CENTER[0], (az + bz) / 2 - PRECINCT_CENTER[1]) < 330) {
        paths.push([ax, az, bx, bz, ROAD_CLASS_WIDTHS[roadClass] || 2.2]);
      }
    }
  }
  const buildingRings = extractSiteRings(data, (item) => (item.k || 'b') === 'b');
  const vkCenter = ringCenter(VU_KHIEM_MON);
  const crosses = (p0: [number, number], p1: [number, number], seg: number[]) => {
    const wx = p1[0] - p0[0], wz = p1[1] - p0[1], sx = seg[2] - seg[0], sz = seg[3] - seg[1];
    return Math.abs(wx * sz - wz * sx) > Math.sin(0.44) * Math.hypot(wx, wz) * Math.hypot(sx, sz);
  };
  const laSkip = (x: number, z: number, p0: [number, number], p1: [number, number]) =>
    waters.some((ring) => inRing(x, z, ring))
    || Math.hypot(x - vkCenter[0], z - vkCenter[1]) < 6.5
    || paths.some((seg) => distToSegment(x, z, seg) < seg[4] / 2 + 2.2 && crosses(p0, p1, seg))
    || buildingRings.some((ring) => inRing(x, z, obbCorners(obb(ring), 2.5)))
    || keep.some((ring) => inRing(x, z, ring));
  drawLaThanh(S, LA_THANH, { skip: laSkip });

  // broad-leaved trees close behind the south and south-east runs
  if (Array.isArray(data && data.trees)) {
    const run = LA_THANH.slice(11, 20);
    let seed = 0;
    for (let i = 0; i + 1 < run.length; i++) {
      const ptA = run[i];
      const ptB = run[i + 1];
      const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      const unit: [number, number] = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len];
      let inward: [number, number] = [-unit[1], unit[0]];
      if ((ptA[0] - PRECINCT_CENTER[0]) * inward[0] + (ptA[1] - PRECINCT_CENTER[1]) * inward[1] > 0) inward = [-inward[0], -inward[1]];
      for (let dist = 2; dist < len - 2; dist += 6.5, seed++) {
        for (const back of [4.4, 9.5]) {
          const offset = back + rand(seed, 91 + back) * 2.5;
          const x = ptA[0] + unit[0] * (dist + rand(seed, 93) * 3) + inward[0] * offset;
          const z = ptA[1] + unit[1] * (dist + rand(seed, 93) * 3) + inward[1] * offset;
          if (waters.some((ring) => inRing(x, z, ring)) || paths.some((seg) => distToSegment(x, z, seg) < seg[4] / 2 + 1.5) || buildingRings.some((ring) => inRing(x, z, obbCorners(obb(ring), 3)))) continue;
          data.trees.push(Math.round(x * 10), Math.round(z * 10), 12 + Math.floor(rand(seed, 95 + back) * 5), rand(seed, 97 + back) < 0.4 ? 1 : 0);
        }
      }
    }
  }

  // remaining mapped buildings in the site (service houses, village outside)
  for (const ring of buildingRings) {
    const center = ringCenter(ring);
    if (claimed.some((pt) => Math.hypot(pt[0] - center[0], pt[1] - center[1]) < 4) || claimedRings.some((prev) => inRing(center[0], center[1], prev))) continue;
    const box = obb(ring);
    const tiny = Math.max(box.w, box.d) < 8;
    drawHall(S, ring, { plinth: 0.35, wallH: tiny ? 2.6 : 3.0, rh: tiny ? 1.5 : 2.0, roof: COLORS.roofTile, wall: tiny ? COLORS.stucco : COLORS.lacquerOld, glazed: false, over: 0.7 });
  }
}

export function build({ data, S }) {
  const claimed: [number, number][] = [];
  const claimedRings: [number, number][][] = [];
  const claim = (ring: [number, number][]) => {
    claimed.push(ringCenter(ring));
    claimedRings.push(ring);
  };
  const keep: [number, number][][] = [];

  buildTemplePrecinct(S, data, claim, claimed);
  buildLakePavilionsAndIsland(S, data, claim);
  buildTombAxis(S, claim, keep);
  buildKhiemThoLang(S, claimed, keep);
  buildBoiLang(S, claim);
  buildLaThanhAndRemaining(S, data, claimed, claimedRings, keep);

  S.kind = KIND.PLAIN;
  S.base = 0;
}
