import { KIND, hex, shade, obb, unflat } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { TOMB_COL as C, gY, groundSpan, rectPts, terrace, levelTop, pav, hallAt, flight, wallLine, gate, bridge, statueCourt } from '../tombs.js';

// ---- Lăng Minh Mạng (Hiếu Lăng), the tomb of Emperor Minh Mạng, built 1840-43 on Cẩm Kê hill ----
//
// Sources (docs/places/minhmang.md has the full list):
//  - vi.wikipedia.org/wiki/Lăng_Minh_Mạng: 18 ha inside a 1,750 m La Thành; a thần đạo over 700 m long. In order:
//    Đại Hồng Môn (over 9 m high, 12 m wide, three passages, 24 roofs, opened once for the funeral) with Tả and
//    Hữu Hồng Môn either side; the Bái Đình court (45 x 45 m) with two rows of mandarins, elephants and horses;
//    Bi Đình on Phụng Thần Sơn; the Sân triều lễ in four levels; Hiển Đức Môn (wooden tam quan with an upper
//    storey); điện Sùng Ân (23.45 x 22.05 m, trùng thiềm điệp ốc) with Đông/Tây Phối điện in front and Tả/Hữu
//    Tòng viện behind, in a square walled court; Hoằng Trạch Môn (brick, vaulted); three stone bridges Tả Phù,
//    Trung Đạo, Hữu Bật over Trừng Minh; 17 steps up to Minh Lâu (square, two storeys, eight roofs) on Tam Tài Sơn
//    (three terraces); two trụ biểu on Bình Sơn and Thành Sơn; the crescent Tân Nguyệt lake crossed by cầu Thông
//    Minh Chính Trực; 33 steps up to the Bửu Thành (round brick wall, 3.5 m high, 273 m round) on Khải Trạch Sơn.
//  - OpenStreetMap (data/raw/hue-osm-south5.json): every building footprint below, the three bridges (ways
//    206627340/41/42), the stairs either side of Minh Lâu (206627343/46), cầu Thông Minh Chính Trực (206865290),
//    the Bửu Thành steps (206865287), both trụ biểu (nodes 13694662726/27), the lakes (drawn by the water code).
// Estimated: every height but Đại Hồng Môn's and the Bửu Thành wall's, the side gates' places, the statue count,
// the terrace sizes and levels, the gates' forms, the Bửu Thành gate. Left out: La Thành beyond its front stretch,
// the lake pavilions (Quan Lan, Nghênh Lương, Hư Hoài, Điếu Ngư; places unknown) and the ruined side buildings.

export const id = 'minhmang';

// The OSM outlines here sit about 2.9 m south of where the buildings stand on the satellite (Google imagery, 2026,
// checked on Đại Hồng Môn, Bi Đình, Hiển Đức Môn, Sùng Ân and Minh Lâu: 2.5-4 m south, under 1.5 m east or west,
// the axis within half a degree). The shapes agree, so the whole tomb is moved north by OFF rather than redrawn;
// the lakes (drawn by the water code from the same OSM extract) are left where they are.
const OFF = [0, -2.9];
const off = (p) => [p[0] + OFF[0], p[1] + OFF[1]];
// OSM points, metres in the model frame
const DHM = off([-1936.5, 9005]); // Đại Hồng Môn
const AIM = off([-2312, 8960]); // the top of the Bửu Thành steps: the axis bends ~2 m over its length, this splits it
const TRU = [[-2207, 8937], [-2216, 9014]].map(off); // trụ biểu on Bình Sơn and Thành Sơn
// the narrow neck of Trừng Minh under the three bridges: banks at x ≈ -2152 and -2173 (the terrain grid is coarser
// than the 20 m channel, so the lake surface never shows there; a lined strip of water is drawn instead)
const NECK = { s0: 216.5, s1: 239.5, t0: -40, t1: 38 };

const LAC = PAL.lacquer || C.lacquer, TILE = PAL.imperialRoof || C.roofY, RIDGE = hex('#ead27c');
const WALL = hex('#7d7465'), WALL_DK = hex('#625b4f'), STUCCO = hex('#cfc6b0'), WATER = hex('#3e6a69');
const BI_BRICK = hex('#7a7166'), BI_ROOF = hex('#b8863a');
const STELE_WALL = hex('#dcc272'), BRICK_COURT = hex('#a37a62'), PINE = hex('#355230'), MOSS = hex('#4f6a3e');

function frame(o, to) {
  const l = Math.hypot(to[0] - o[0], to[1] - o[1]), ux = (to[0] - o[0]) / l, uz = (to[1] - o[1]) / l;
  return {
    ux, uz, a: Math.atan2(uz, ux), av: Math.atan2(ux, -uz),
    at: (s, t = 0) => [o[0] + ux * s - uz * t, o[1] + uz * s + ux * t],
    s: (p) => (p[0] - o[0]) * ux + (p[1] - o[1]) * uz,
  };
}

export function build({ data, S }) {
  const F = frame(DHM, AIM);
  const site = data.sites && data.sites.minhmang;
  const items = (site?.items || []).map((it) => { const ring = unflat(it.ring).map(off); return { id: it.id, n: it.n || '', k: it.k, ring, ...obb(ring) }; });
  const byId = (i) => items.find((it) => it.id === i);
  const paved = (fn) => { const n0 = S.n; fn(); (S.paved = S.paved || []).push([n0, S.n]); };
  const at = (s, t) => F.at(s, t);
  const box = (s, t, y0, y1, w, d, col, o) => { const p = at(s, t); S.box(p[0], p[1], y0, y1, w, d, F.a, col, o); };
  const hip = (s, t, w, d, y0, h, col, o) => { const p = at(s, t); S.hip(p[0], p[1], w, d, F.av, y0, h, col, { flare: 0.4, over: 0.7, fascia: 0.22, fasciaCol: shade(LAC, 0.7), ridgeCol: RIDGE, hips: true, glazed: true, ...o }); };

  // ---------------- Đại Hồng Môn and the front of the La Thành ----------------
  {
    const { lo, hi } = groundSpan(rectPts(DHM[0], DHM[1], 13, 6, F.a));
    const y = hi;
    S.kind = KIND.MASONRY; S.base = y - LAND_Y;
    // three bays: the middle one taller, each a plastered brick block pierced by an arched passage
    box(0, 0, lo - 0.8, y + 5.0, 5.2, 4.4, C.brickMoss, { top: shade(C.brickMoss, 0.9) });
    for (const sd of [-1, 1]) box(0, sd * 4.1, lo - 0.8, y + 4.0, 5.0, 3.6, shade(C.brickMoss, 1.04), { top: shade(C.brickMoss, 0.9) });
    S.kind = KIND.PLAIN;
    box(0, 0, y, y + 3.4, 4.6, 2.4, C.door);
    for (const sd of [-1, 1]) box(0, sd * 4.1, y, y + 2.8, 3.6, 2.0, C.door);
    // the stack of glazed roofs (24 in all on the real gate): a roof over each side bay, a lower eave and a
    // two-tier lầu over the middle one
    for (const sd of [-1, 1]) {
      hip(0, sd * 4.1, 3.8, 4.4, y + 4.0, 1.1, TILE);
      hip(0, sd * 4.6, 2.2, 3.0, y + 5.15, 0.8, TILE, { over: 0.4 });
    }
    hip(0, 0, 5.8, 5.4, y + 5.0, 1.0, TILE);
    S.kind = KIND.TIMBER; S.base = y + 5.6 - LAND_Y;
    box(0, 0, y + 5.6, y + 7.0, 2.6, 3.2, LAC);
    hip(0, 0, 4.2, 4.4, y + 7.0, 0.8, TILE);
    box(0, 0, y + 7.4, y + 8.1, 1.8, 2.2, LAC);
    hip(0, 0, 3.0, 3.2, y + 8.1, 1.15, TILE, { over: 0.5 });
    S.kind = KIND.PLAIN;
  }
  // the front stretch of La Thành with Tả and Hữu Hồng Môn, the gates in use (positions estimated)
  for (const sd of [-1, 1]) {
    wallLine(S, [at(1, sd * 8.6), at(1, sd * 23)], 3.0, 1.0, { closed: false, col: WALL });
    const g = at(1, sd * 26); gate(S, g[0], g[1], F.av, 5.6, 3.4, { h: 4.2, openings: 1, col: WALL, roof: TILE, rh: 1.3 });
    wallLine(S, [at(1, sd * 29), at(1, sd * 58)], 3.0, 1.0, { closed: false, col: WALL });
  }

  // ---------------- Bái Đình: the salutation court, its statues ----------------
  paved(() => {
    const s0 = 3.5, s1 = 36, m = at((s0 + s1) / 2, 0);
    terrace(S, m[0], m[1], s1 - s0, 45, F.a, levelTop(m[0], m[1], s1 - s0, 45, F.a, 0.12), BRICK_COURT);
    // the stone thần đạo down the middle
    const top = levelTop(m[0], m[1], s1 - s0, 45, F.a, 0.12);
    S.kind = KIND.MASONRY; box((s0 + s1) / 2, 0, top - 0.2, top + 0.06, s1 - s0, 4, C.stoneGrey, { topKind: KIND.ROAD });
  });
  // mandarins (inner rows), elephants and horses at the front of the outer rows: 6 a row, 24 statues
  statueCourt(S, F, 9, 31, { inner: 7, outer: 11.5 });

  // ---------------- Bi Đình on Phụng Thần Sơn ----------------
  {
    const bd = byId(206627336);
    const c = bd ? bd.c : at(52.1, 1.6), sC = F.s(c);
    // two brick-faced terraces, about 21.5 and 16 m square on the satellite; Street View shows them standing some
    // 3.5 m over the Bái Đình, the upper one reached by one long flight between dragon balustrades
    const base = levelTop(c[0], c[1], 21.5, 21.5, F.a, 0.2);
    // the faces are old dark brick, weathered nearly black-grey
    let y = terrace(S, c[0], c[1], 21.5, 21.5, F.a, base + 1.8, BI_BRICK);
    y = terrace(S, c[0], c[1], 16, 16, F.a, y + 1.6, shade(BI_BRICK, 1.08));
    flight(S, at(sC - 10.75 - 3.6), base - 0.1, at(sC - 10.75), base + 1.8, 5);
    flight(S, at(sC - 8 - 4.4), base + 1.8, at(sC - 8), y, 4.4, { rail: 1 });
    flight(S, at(sC + 8), y, at(sC + 8 + 4.4), base + 1.8, 4.4, { rail: 1 });
    // square, two roof tiers, the stele "Thánh Đức Thần Công" inside: closed walls of yellow stucco with a wide door
    // in the middle (Street View), the roof some 13 m across on the satellite
    pav(S, c[0], c[1], 9.8, 9.8, F.av, y, { tiers: 2, wallH: 4.0, roof: BI_ROOF, wall: STELE_WALL, h: 9.5, over: 0.9 });
    S.kind = KIND.MASONRY; S.base = y - LAND_Y;
    S.box(c[0], c[1], y, y + 0.7, 1.6, 2.6, F.a, C.stoneDark);
    S.box(c[0], c[1], y + 0.7, y + 3.4, 0.5, 1.9, F.a, hex('#4a5048'));
  }

  // ---------------- Sân triều lễ: four levels rising to Hiển Đức Môn ----------------
  paved(() => {
    const s0 = 66, s1 = 126, L = (s1 - s0) / 4, m = at((s0 + s1) / 2);
    let y = groundSpan(rectPts(m[0], m[1], s1 - s0, 38, F.a)).hi;
    for (let k = 0; k < 4; k++) {
      const s = s0 + L * (k + 0.5), p = at(s);
      y += 0.38;
      const top = terrace(S, p[0], p[1], L + 0.05, 38, F.a, Math.max(y, levelTop(p[0], p[1], L, 38, F.a, 0.1)), BRICK_COURT);
      y = top;
      S.kind = KIND.MASONRY; box(s, 0, top - 0.2, top + 0.05, L, 3.6, C.stoneGrey, { topKind: KIND.ROAD });
      flight(S, at(s0 + L * k - 0.9), top - 0.38, at(s0 + L * k + 0.6), top, 3.6);
    }
  });

  // ---------------- the Sùng Ân court ----------------
  const hdm = byId(206627337);
  // on the satellite Sùng Ân's roofs centre 1.3 m behind OSM's outline, and the court's back wall stands at 205.5 m,
  // leaving a strip of lawn and a path between it and the neck of Trừng Minh
  const sHDM = hdm ? F.s(hdm.c) : 131.1, sSA = 174.7, sHTM = 205.5;
  let court = 0;
  paved(() => {
    const m = at((sHDM + sHTM) / 2);
    court = terrace(S, m[0], m[1], sHTM - sHDM, 61, F.a, levelTop(m[0], m[1], sHTM - sHDM, 61, F.a, 0.15), BRICK_COURT);
    S.kind = KIND.MASONRY; box((sHDM + sHTM) / 2, 0, court - 0.2, court + 0.06, sHTM - sHDM, 3.6, C.stoneGrey, { topKind: KIND.ROAD });
  });
  // the square wall of the court, gates front and back
  wallLine(S, [at(sHDM, 6.5), at(sHDM, 30), at(sHTM, 30), at(sHTM, 6)], 2.6, 0.8, { closed: false, col: WALL });
  wallLine(S, [at(sHDM, -6.5), at(sHDM, -30), at(sHTM, -30), at(sHTM, -6)], 2.6, 0.8, { closed: false, col: WALL });
  // Hiển Đức Môn: a wooden three-bay gate with an upper storey (cổ lâu)
  {
    const c = hdm ? hdm.c : at(sHDM), y = court;
    S.kind = KIND.MASONRY; S.base = y - LAND_Y;
    // the roof about 13 m across the axis and 9.3 m along it on the satellite
    S.box(c[0], c[1], y - 0.6, y + 0.45, 12.6, 8.2, F.a, C.stone, { topKind: KIND.ROAD });
    flight(S, at(sHDM - 4.1 - 1.8), y - 0.5, at(sHDM - 4.1), y + 0.45, 6);
    pav(S, c[0], c[1], 10.2, 6.2, F.av, y + 0.45, { tiers: 2, wallH: 3.6, roof: TILE, wall: LAC, h: 8.6, colonnade: true, over: 0.6 });
  }
  // điện Sùng Ân: front hall and main hall under joined roofs, on a stone plinth
  {
    const c = at(sSA), gC = gY(c[0], c[1]);
    const W = 23.45, D = 22.05, plinth = 0.9, floor = court + plinth;
    S.kind = KIND.MASONRY; S.base = court - LAND_Y;
    S.box(c[0], c[1], court - 0.3, floor, W + 2.4, D + 2.4, F.a, C.stone, { topKind: KIND.ROAD });
    flight(S, at(sSA - D / 2 - 1.2 - 1.6), court, at(sSA - D / 2 - 1.2), floor, 6, { rail: 1 });
    const dF = 8.6, dM = D - dF, sF = sSA - D / 2 + dF / 2, sM = sSA + D / 2 - dM / 2;
    const pF = at(sF), pM = at(sM);
    // the joined roofs cover about 25.4 x 26.9 m on the satellite
    pav(S, pF[0], pF[1], W, dF, F.av, floor, { wallH: 3.4, roof: TILE, wall: LAC, h: 6.4, colonnade: true, over: 1.0 });
    pav(S, pM[0], pM[1], W - 1, dM, F.av, floor, { tiers: 2, wallH: 3.6, roof: TILE, wall: LAC, h: gC + 10 - floor, over: 1.0 });
  }
  // Đông and Tây Phối điện in front, Tả and Hữu Tòng viện behind, placed and sized on the satellite: 22 m either side
  // of the axis at 146.8 and 190.6 m along it (OSM's outlines are 0.5-3 m off that, unevenly), roofs about 19.5 x 13 m
  // (OSM's outlines 20-22.7 x 12-13 m)
  for (const i of [206627327, 206627334, 206627329, 771244246]) {
    const it = byId(i); if (!it) continue;
    const front = i === 206627327 || i === 206627334;
    const p = at(front ? 146.8 : 190.6, (i === 206627334 || i === 771244246 ? 1 : -1) * 22), W = 17.6, D = 11;
    hallAt(S, p[0], p[1], W, D, F.a, { plinth: 0.5, floor: court + 0.5, roof: front ? TILE : C.roofYOld, wall: front ? LAC : C.lacquerOld, wallH: 3.2, over: 1.0, h: front ? 6.2 : 5.6 });
    S.kind = KIND.MASONRY; S.base = court - LAND_Y;
    S.box(p[0], p[1], court - 0.3, court + 0.5, W + 1.6, D + 1.6, F.a, C.stone, { topKind: KIND.ROAD });
  }
  // Hoằng Trạch Môn: the vaulted brick gate at the back of the court
  { const p = at(sHTM); gate(S, p[0], p[1], F.av, 11, 4, { h: 4.4, openings: 3, col: WALL, roof: TILE, rh: 1.5, floor: court }); }

  // ---------------- Trừng Minh's neck and the three bridges ----------------
  {
    // a lined channel of water under the bridges, level with the banks so it reads as the lake's narrow arm
    const sm = (NECK.s0 + NECK.s1) / 2, tm = (NECK.t0 + NECK.t1) / 2, len = NECK.t1 - NECK.t0, wd = NECK.s1 - NECK.s0;
    const g = groundSpan(rectPts(...at(sm, tm), wd, len, F.a)).hi;
    S.kind = KIND.PLAIN; S.base = 0;
    box(sm, tm, g - 0.8, g + 0.06, wd - 1.2, len, WATER);
    S.kind = KIND.MASONRY;
    for (const s of [NECK.s0, NECK.s1]) box(s, tm, g - 0.8, g + 0.35, 0.8, len, C.stoneDark, { topKind: KIND.ROAD });
    // Trung Đạo (the emperor's, wider, plastered balustrades) between Tả Phù and Hữu Bật
    // placed on the satellite: the side bridges 16.6 m north and 16.8 m south of the middle one
    for (const [t, w, col] of [[-0.8, 5.2, STUCCO], [15.8, 3.4, C.stone], [-17.6, 3.4, C.stone]])
      bridge(S, at(NECK.s0 - 1.5, t), at(NECK.s1 + 1.5, t), w, { col, arch: 0.7 });
  }

  // ---------------- Minh Lâu on the three terraces of Tam Tài Sơn ----------------
  {
    const ml = byId(206627339);
    const c = ml ? ml.c : at(262.2, -0.8), sC = F.s(c), tC = -0.8;
    const g0 = groundSpan(rectPts(...at(267, tC), 48, 31, F.a)).lo;
    const gTop = groundSpan(rectPts(...at(267, tC), 48, 31, F.a)).hi;
    // Thiên, Địa, Nhân: [front s, back s, half width, top]. On the satellite the whole stepped mound is some 47 x 28 m,
    // from the bank of the neck back to the gardens before Tân Nguyệt, and the paved top round Minh Lâu 24 x 23 m
    const T = [[243.5, 290, 14, gTop + 0.95], [245.8, 284, 12.6, gTop + 1.9], [248, 272, 11.2, gTop + 2.85]];
    paved(() => {
      // brick-faced terraces; the two lower ones are lawns, the top one (Thiên) is paved round Minh Lâu
      T.forEach(([f, b, hw, top], k) => {
        const p = at((f + b) / 2, tC);
        S.kind = KIND.MASONRY; S.base = g0 - LAND_Y;
        S.box(p[0], p[1], g0 - 1, top, b - f, hw * 2, F.a, k === 2 ? C.stoneGrey : WALL, k === 2 ? { top: shade(C.stone, 1.03), topKind: KIND.ROAD } : { top: MOSS });
        if (k < 2) S.box(p[0], p[1], top - 0.1, top + 0.03, b - f - 0.6, hw * 2 - 0.6, F.a, shade(MOSS, 1.12), { top: shade(MOSS, 1.12) });
      });
      // the paved walk up the middle of the lower terraces
      const pw = at((T[0][0] + T[2][0]) / 2, tC);
      S.box(pw[0], pw[1], T[0][3] - 0.2, T[0][3] + 0.06, T[2][0] - T[0][0], 6.4, F.a, C.stone, { topKind: KIND.ROAD });
    });
    // the 17 steps from the bridges: a flight at the face of each terrace, with plastered balustrades
    const bridgeY = gY(...at(NECK.s1 + 2, tC)) + 0.15;
    flight(S, at(NECK.s1 + 1.5, tC), bridgeY, at(T[0][0], tC), T[0][3], 7, { rail: 1, railCol: STUCCO });
    flight(S, at(T[0][0] + 0.3, tC), T[0][3], at(T[1][0], tC), T[1][3], 6, { rail: 1, railCol: STUCCO });
    flight(S, at(T[1][0] + 0.3, tC), T[1][3], at(T[2][0], tC), T[2][3], 5.4, { rail: 1, railCol: STUCCO });
    // and down the back toward Tân Nguyệt
    flight(S, at(T[2][1], tC), T[2][3], at(T[2][1] + 3.2, tC), T[1][3], 5);
    flight(S, at(T[1][1], tC), T[1][3], at(T[1][1] + 3.2, tC), T[0][3], 5);
    const gB = gY(...at(T[0][1] + 3.5, tC));
    flight(S, at(T[0][1], tC), T[0][3], at(T[0][1] + 3.5, tC), gB + 0.1, 5);
    // Minh Lâu: square, two storeys, eight roofs; the ridge some 13.5 m over the ground at its middle
    const gC = gY(c[0], c[1]);
    // the roof some 14 m square on the satellite
    pav(S, c[0], c[1], 11.8, 11.8, F.av, T[2][3], { tiers: 2, wallH: 3.6, roof: TILE, wall: LAC, h: gC + 13.5 - T[2][3], colonnade: true, over: 0.6 });
    // the two trụ biểu on their mounds, Bình Sơn and Thành Sơn
    for (const [x, z] of TRU) {
      // the mound draped over the slope it sits on (Thành Sơn's side climbs ~2 m across it), not a cone on one level
      const g = gY(x, z);
      tumulus(S, x, z, 8, 1.6, MOSS);
      S.kind = KIND.MASONRY;
      S.base = g + 1.6 - LAND_Y;
      obeliskAt(S, x, z, g + 1.6, 10.5);
    }
  }

  // ---------------- cầu Thông Minh Chính Trực over Tân Nguyệt, the 33 steps ----------------
  {
    const t = -0.8; // the axis line through Minh Lâu (the satellite puts the bridge within a metre of it)
    bridge(S, at(300.5, t), at(358.5, t), 5.4, { col: STUCCO, arch: 0.9 });
    // the walk from the back stair to the bridge
    paved(() => {
      const a = at(294, t), b = at(300.8, t), ya = gY(a[0], a[1]);
      S.kind = KIND.MASONRY; S.base = ya - LAND_Y;
      S.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.min(ya, gY(b[0], b[1])) - 0.6, Math.max(ya, gY(b[0], b[1])) + 0.12, 7, 5, F.a, C.stone, { topKind: KIND.ROAD });
    });
    const a = at(358.5, t), b = at(377.2, t);
    const yA = Math.max(gY(a[0], a[1]), LAND_Y + 4.5), yB = gY(b[0], b[1]) + 0.3;
    // the bridge lands at the water's edge and Tân Nguyệt's bank stands steeply over it: where the bank tops the
    // straight run, the first steps climb it in a flight of their own before the long run to the Bửu Thành
    const sK = 362.5, k = at(sK, t), gK = groundSpan(rectPts(...at((358.5 + sK) / 2, t), sK - 358.5, 6, F.a)).hi + 0.2;
    if (gK > yA + ((yB - yA) * (sK - 358.5)) / (377.2 - 358.5)) {
      flight(S, a, yA, k, gK, 6, { rail: 1, railCol: STUCCO });
      flight(S, k, gK, b, yB, 6, { rail: 1, railCol: STUCCO });
    } else flight(S, a, yA, b, yB, 6, { rail: 1, railCol: STUCCO });
  }

  // ---------------- the Bửu Thành and Khải Trạch Sơn ----------------
  {
    const bt = byId(206627350);
    const ring = bt ? bt.ring : null;
    const c = bt ? bt.c : at(421, -2);
    if (ring) wallLine(S, ring, 3.5, 1.3, { maxSeg: 8, col: WALL_DK });
    // the gate at the top of the steps: a stuccoed gateway with bronze leaves under a small crested roof
    const sG = 378.2, p = at(sG, -0.8), y = gY(p[0], p[1]) + 0.3;
    S.kind = KIND.MASONRY; S.base = y - LAND_Y;
    S.box(p[0], p[1], y - 1.2, y + 4.4, 2.4, 6.6, F.a, STUCCO, { top: shade(STUCCO, 0.9) });
    S.box(p[0], p[1], y + 4.4, y + 5.2, 1.6, 4.0, F.a, STUCCO, { taper: 0.7 });
    S.kind = KIND.PLAIN;
    S.box(p[0], p[1], y, y + 3.0, 2.5, 3.0, F.a, hex('#5a4a2c'));
    hip(sG, -0.8, 6.8, 2.8, y + 4.4, 0.9, TILE, { over: 0.4 });
    // the wooded mound: the hill rises inside the wall, crowned by a low tumulus under pines
    // draped over the hill's own slope (it climbs ~5 m across the ring), not a cone set at the centre's ground
    tumulus(S, c[0], c[1], 26, 1.8, MOSS);
    S.kind = KIND.PLAIN;
    for (let i = 0; i < 22; i++) {
      const ang = i * 2.399 + 0.3, r = 6 + ((i * 37) % 31);
      const x = c[0] + Math.cos(ang) * r, z = c[1] + Math.sin(ang) * r;
      const yb = gY(x, z) + Math.max(0, 1.8 * (1 - (r - 6) / 20)) - 0.4, h = 9 + (i % 4) * 1.5;
      S.cyl(x, z, yb, yb + 2.5, 0.25, 0.22, 5, hex('#4a3a2a'), { cap: false });
      S.cyl(x, z, yb + 2.2, yb + h, 2.4, 0, 7, shade(PINE, 0.9 + (i % 3) * 0.08), { cap: false });
    }
  }

  // ---------------- the visitor buildings mapped near the gate ----------------
  const known = new Set([206627327, 206627328, 206627329, 206627334, 206627336, 206627337, 206627338, 206627339, 206627350, 771244246]);
  for (const it of items) {
    if (it.k !== 'b' || known.has(it.id) || !(it.w > 1)) continue;
    const tiny = Math.max(it.w, it.d) < 8;
    hallAt(S, it.c[0], it.c[1], it.w, it.d, it.a, { plinth: 0.4, roof: tiny ? C.roofTile : C.roofYOld, wall: C.lacquerOld, wallH: tiny ? 2.8 : 3.2, over: 0.8 });
  }
  S.kind = KIND.PLAIN; S.base = 0;
}

// a low tumulus draped over the local ground: a flattened crown h over the ground under each point, easing to a rim
// bedded 0.6 m (as tombs.js mound() does)
function tumulus(S, cx, cz, r, h, col) {
  const prof = (t) => (t <= 0.23 ? 1 : Math.cos(((t - 0.23) / 0.77) * Math.PI * 0.5));
  const at = (t, a) => { const x = cx + Math.cos(a) * r * t, z = cz + Math.sin(a) * r * t; return [x, gY(x, z) + h * prof(t) - (t >= 1 ? 0.6 : 0), z]; };
  const T = [0, 0.23, 0.45, 0.65, 0.82, 1], N = 18;
  S.kind = KIND.GROUND; S.base = 0;
  for (let j = 0; j < N; j++) {
    const a0 = (j / N) * Math.PI * 2, a1 = ((j + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2;
    for (let k = 0; k + 1 < T.length; k++) {
      const hint = [Math.cos(am) * T[k + 1], 1, Math.sin(am) * T[k + 1]];
      if (k === 0) S.tri(at(0, 0), at(T[1], a0), at(T[1], a1), col, hint);
      else S.quad(at(T[k], a0), at(T[k], a1), at(T[k + 1], a1), at(T[k + 1], a0), col, hint);
    }
  }
}

// a trụ biểu: square shaft on a stepped base, a lotus bud and finial on top
function obeliskAt(S, x, z, g, h) {
  S.box(x, z, g - 0.4, g + 1.0, 2.2, 2.2, 0, shade(C.stone, 0.88));
  S.box(x, z, g + 1.0, g + 1.5, 1.7, 1.7, 0, shade(C.stone, 0.95));
  S.box(x, z, g + 1.5, g + h - 1.6, 1.15, 1.15, 0, C.stucco || C.stone, { taper: 0.72 });
  S.box(x, z, g + h - 1.6, g + h - 1.1, 1.3, 1.3, 0, shade(C.stone, 0.9));
  S.cyl(x, z, g + h - 1.1, g + h, 0.55, 0.05, 8, shade(C.stone, 1.05));
}
