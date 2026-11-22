import { KIND, hex, shade, obb } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { fence, FENCE } from '../enclosure.js';

// ---- Cung Trường Sanh (Trường Ninh 1821, rebuilt 1846, renamed 1923), north-west corner of the Imperial City ----
//
// Sources (docs/places/truongsanh.md has the full list):
//  - vi.wikipedia.org/wiki/Cung_Trường_Sanh: about 11,400 m², faces east; north hồ Nội Kim Thủy, south cung Diên
//    Thọ. Since 1846 a 王 plan on one axis: Ngũ Đại Đồng Đường in front, điện Thọ Khang in the middle, lầu Vạn Phước
//    behind, linked by corridors; a phương môn screen before the front hall; rockeries (núi Bảo Sơn, Kình Ngư, Hổ
//    Tôn) behind as the "hậu chẩm". Lạch Đào Nguyên, an artificial channel round the palace with red bridges, opens
//    to Nội Kim Thủy; hồ Tân Nguyệt restored 2005–07. Gates: Trường An môn (the main gate, a tam quan with floral
//    and five-colour decoration) on the east, Thụy môn west, Hữu Hòa south, Thanh Minh north. Pulled down 1945,
//    lived in from 1954, restored 2005–2007 (halls, rockeries, walls, gate).
//  - vietnamnews.vn gallery (2024): the main gate, the screen wall behind it, Ngũ Đại Đồng Đường, Thọ Khang, the Đào
//    Nguyên channel and Tân Nguyệt lake as they stand; nomads-travel-guide: mustard-yellow halls, red bridges.
//  - OpenStreetMap: the hall outline (way 172763427), the two side halls (172763422, 172763425), Trường An Môn
//    (618267901), the south gate (695810773), the precinct wall (695810771/772), the rear court wall (695814169)
//    and its screen (695814168). The channel and lake are hue.json's pond and are not drawn here.
//  - The city height survey reads the hall at 8.5 m to the ridge and the side halls at 6.0 m.
//  - Google satellite and a Street View photosphere from the lawn north-east of the island (checked 2026-11,
//    scratch only): the halls and side halls are roofed in dark grey-green unglazed tile with grey ridges (on the
//    satellite they read dark beside Điện Thọ Ninh's yellow roof), their walls are solid mustard masonry with
//    red-framed windows and doors, the court before the hall is paved tan brick, the island is edged with a low
//    grey pierced balustrade, and the precinct wall by Trường An Môn is weathered grey plaster.
// Estimated: the split of the hall outline into front house, main house and rear house, bay counts, platform and
// eave heights, the window rhythm, the gate's height and roofs (its yellow tile is not visible in the imagery), the
// positions of Thụy môn and Thanh Minh môn (not mapped), and the rockeries' form.

// The palace frame: u across the front, v toward the front (east-north-east, to Trường An Môn), metres.
const C = [-1505.05, -97.15], U = [0.61394, 0.78935], F = [U[1], -U[0]];
const ANG = Math.atan2(U[1], U[0]);
const P = (u, v) => [C[0] + u * U[0] + v * F[0], C[1] + u * U[1] + v * F[1]];

// OSM outlines, metres in the model frame (from the raw extract, data/raw)
const SIDE_HALLS = [
  [[-1518.9, -114.6], [-1507.4, -123.0], [-1501.8, -115.5], [-1513.3, -107.1]], // north (left) hall
  [[-1497.2, -86.3], [-1486.5, -94.5], [-1481.5, -88.0], [-1492.2, -79.9]], // south (right) hall
];
const GATE = [[-1457.9, -136.3], [-1460.1, -134.7], [-1453.9, -126.6], [-1451.8, -128.2]]; // Trường An Môn
const SOUTH_GATE = [-1482.9, -60.3]; // Hữu Hòa (the gap in the wall toward Diên Thọ, way 695810773)
const WALL = [[-1484.7, -58.7], [-1533.5, -22.8], [-1584.4, -93.2], [-1484.1, -167.1], [-1460.1, -134.7], [-1453.9, -126.6], [-1432.7, -96.9], [-1481.2, -61.1]];
const REAR_WALL = [[-1530.0, -93.7], [-1545.6, -81.8], [-1529.6, -61.2], [-1514.2, -73.1]];

// halls: dark grey-green unglazed tile, grey ridges (satellite, Street View); the gate keeps its yellow glaze
const TILE = hex('#565b58'), RIDGE = hex('#8e8f88'), GTILE = PAL.imperialRoof, GRIDGE = hex('#f1d77a');
const LAC = PAL.lacquer, GOLD = hex('#d9b04a'), RED = hex('#8a3324'), GREY = hex('#8a877d');
const STONE = PAL.stone, BRICK = hex('#a68a6c'), MUSTARD = hex('#d4a845'), DARK = hex('#3a2420'), ROCK = hex('#7d7a70');
const gY = (x, z) => LAND_Y + rise(x, z);

export const id = 'truongsanh';

export function build({ data, S }) {
  const q0 = P(0, -10), y0 = gY(q0[0], q0[1]);
  const box = (u, v, ya, yb, w, d, col, o) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ANG, col, o); };
  const hip = (u, v, w, d, ya, h, o) => { const q = P(u, v); S.hip(q[0], q[1], w, d, ANG, ya, h, TILE, { flare: 0.45, fascia: 0.26, fasciaCol: shade(LAC, 0.7), hips: true, ridgeCol: RIDGE, segs: 3, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ANG, ...o }); };
  S.base = y0 - LAND_Y;

  // ---- the main hall, a 王 on one axis: Ngũ Đại Đồng Đường (front), Thọ Khang (middle), the rear house ----
  // OSM: front block 21.6 m across x 14.2 m deep (v -14.3..0), rear block 17.1 x 9.4 (v -23.5..-14.1)
  const pt = 0.6, yp = y0 + pt;
  S.kind = KIND.MASONRY;
  box(0, 1.6, y0 - 0.2, y0 + 0.12, 26, 12, BRICK, { topKind: KIND.ROAD }); // bát tràng court before the hall
  box(0, -7.1, y0 - 0.3, yp, 22.6, 15.6, STONE, { taper: 0.985, topKind: KIND.ROAD });
  box(0, -18.8, y0 - 0.3, yp, 18.0, 9.8, STONE, { taper: 0.985, topKind: KIND.ROAD });
  for (let k = 1; k <= 3; k++) box(0, 0.6 + 0.3 * (k - 0.5), y0 - 0.2, yp - (pt / 3) * (k - 0.5), 5.0, 0.3, shade(STONE, 1.04), { topKind: KIND.ROAD });

  // a window or door on a wall face: a red frame with a dark leaf, on the face at (u, v) facing along (su, sv)
  const opening = (u, v, along, ya, yb, wd, door) => {
    S.kind = KIND.PLAIN;
    const fw = along ? [wd, 0.07] : [0.07, wd], lw = along ? [wd - 0.3, 0.09] : [0.09, wd - 0.3];
    box(u, v, ya, yb, fw[0], fw[1], RED);
    box(u, v, ya + 0.15, yb - 0.15, lw[0], lw[1], door ? shade(LAC, 0.6) : shade(RED, 0.55));
  };
  // a house: solid mustard walls out to the column line with red-framed doors and windows (Street View), an open
  // verandah across the front of the front house only
  const hall = (v, w, d, eave, h, bays, chai, porch) => {
    S.kind = KIND.TIMBER;
    const ww = w - 1.0, fv = porch ? 1.6 : 0, wd = d - 1.0 - fv, vc = v - fv / 2;
    box(0, vc, yp, yp + eave, ww, wd, MUSTARD, { top: shade(TILE, 0.8) });
    const n = bays + 2 * chai, bw = ww / n;
    if (porch) for (let i = 0; i <= n; i++) cyl(-ww / 2 + i * bw, v + d / 2 - 0.5, yp, yp + eave, 0.17, 0.15, 6, LAC, { cap: false });
    const vf = vc + wd / 2 + 0.03, vb = vc - wd / 2 - 0.03;
    for (let i = 0; i < n; i++) {
      const u = -ww / 2 + (i + 0.5) * bw, side = i < chai || i >= n - chai;
      if (side) opening(u, vf, true, yp + 0.9, yp + eave - 0.7, Math.min(1.4, bw - 0.9), false);
      else {
        opening(u, vf, true, yp, yp + eave - 0.6, bw - 0.7, true);
        S.kind = KIND.PLAIN;
        box(u, vf + 0.02, yp + eave - 0.5, yp + eave - 0.2, bw - 0.4, 0.06, GOLD);
      }
      if (!porch) opening(u, vb, true, yp + 0.9, yp + eave - 0.7, Math.min(1.4, bw - 0.9), false);
    }
    for (const s of [-1, 1]) for (const t of [-0.25, 0.25]) opening(s * (ww / 2 + 0.03), vc + t * wd, false, yp + 0.9, yp + eave - 0.7, 1.1, false);
    hip(0, v, w - 1.0, d - 0.6, yp + eave, h, { over: 0.9 });
  };
  hall(-3.0, 21.6, 6.0, 3.0, 2.9, 5, 1, true); // Ngũ Đại Đồng Đường, ridge about 6.5 m
  hall(-10.0, 21.6, 8.4, 3.4, 4.5, 5, 1); // Thọ Khang, ridge 8.5 m (the survey's)
  hall(-19.0, 17.1, 9.4, 3.2, 3.9, 3, 1); // the rear house on Vạn Phước lâu's site, ridge about 7.7 m
  // the links (the stem of the 王): a covered passage under a low roof between the three houses
  S.kind = KIND.TIMBER;
  box(0, -6.4, yp, yp + 2.6, 3.4, 1.4, shade(MUSTARD, 0.92));
  box(0, -14.6, yp, yp + 2.6, 3.4, 1.6, shade(MUSTARD, 0.92));
  // flaming pearl and two dragons on the Thọ Khang ridge
  S.kind = KIND.PLAIN;
  const ridgeY = yp + 3.4 + 4.5;
  cyl(0, -10.0, ridgeY + 0.2, ridgeY + 0.85, 0.3, 0.1, 8, RIDGE);
  for (const s of [-1, 1]) {
    const a = P(s * 0.6, -10.0), b = P(s * 2.4, -10.0);
    S.beam([a[0], ridgeY + 0.7, a[1]], [b[0], ridgeY + 0.3, b[1]], 0.2, 0.3, RIDGE);
  }

  // ---- the phương môn before the front hall: a free-standing screen with a tiled coping ----
  S.kind = KIND.MASONRY;
  box(0, 9.0, y0 - 0.2, y0 + 2.4, 5.2, 0.5, MUSTARD, { top: TILE });
  S.kind = KIND.PLAIN;
  box(0, 9.0, y0 + 0.9, y0 + 2.0, 2.2, 0.56, hex('#4f7a5c'));
  box(0, 9.0, y0 + 2.4, y0 + 2.62, 5.6, 0.8, TILE, { taper: 0.6 });

  // ---- the two side halls on the island, flanking the court: three bays under a yellow hip roof ----
  for (const ring of SIDE_HALLS) {
    const o = obb(ring), yg = gY(o.c[0], o.c[1]);
    // the hall's long side runs along v; build in the hall's own frame with doors facing the court
    S.base = yg - LAND_Y;
    const w = Math.max(o.w, o.d), d = Math.min(o.w, o.d), a = ANG + Math.PI / 2;
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], yg - 0.3, yg + 0.4, w, d, a, STONE, { topKind: KIND.ROAD });
    S.kind = KIND.TIMBER;
    S.box(o.c[0], o.c[1], yg + 0.4, yg + 2.9, w - 1.0, d - 1.0, a, MUSTARD, { top: shade(TILE, 0.8) });
    // red doors on the face toward the court, windows on the back and the ends (Street View)
    const cx = Math.cos(a), cz = Math.sin(a), court = Math.sign((o.c[0] - C[0]) * U[0] + (o.c[1] - C[1]) * U[1]) || 1;
    const op = (t, n, along, ya, yb, wd, door) => {
      const x = o.c[0] + cx * t - cz * n, z = o.c[1] + cz * t + cx * n;
      const fw = along ? [wd, 0.07] : [0.07, wd], lw = along ? [wd - 0.3, 0.09] : [0.09, wd - 0.3];
      S.kind = KIND.PLAIN;
      S.box(x, z, ya, yb, fw[0], fw[1], a, RED);
      S.box(x, z, ya + 0.15, yb - 0.15, lw[0], lw[1], a, door ? shade(LAC, 0.6) : shade(RED, 0.55));
    };
    const bw = (w - 1.0) / 3, nf = (d - 1.0) / 2 + 0.03;
    for (let i = 0; i < 3; i++) {
      const t = -(w - 1.0) / 2 + (i + 0.5) * bw;
      op(t, court * nf, true, yg + 0.4, yg + 2.5, bw - 0.9, true);
      op(t, -court * nf, true, yg + 1.2, yg + 2.3, Math.min(1.3, bw - 1.0), false);
    }
    for (const s of [-1, 1]) op(s * ((w - 1.0) / 2 + 0.03), 0, false, yg + 1.2, yg + 2.3, 1.1, false);
    S.hip(o.c[0], o.c[1], w - 0.8, d - 0.6, a, yg + 2.9, 2.7, TILE, { flare: 0.4, over: 0.8, fascia: 0.22, fasciaCol: shade(LAC, 0.7), ridgeCol: RIDGE, hips: true, segs: 3 });
  }
  S.base = y0 - LAND_Y;

  // ---- the rear court (hậu chẩm): rockeries Bảo Sơn, Kình Ngư and Hổ Tôn in a walled garden, a screen at its foot ----
  const rockery = (u, v, r, h, seed) => {
    const q = P(u, v), yg = gY(q[0], q[1]);
    S.kind = KIND.MASONRY;
    box(u, v, yg - 0.2, yg + 0.35, r * 2.6, r * 2.2, STONE, { taper: 0.92 }); // the basin's kerb
    S.kind = KIND.PLAIN;
    box(u, v, yg + 0.35, yg + 0.4, r * 2.3, r * 1.9, hex('#4e6f6a'));
    let s = seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    S.kind = KIND.MASONRY;
    for (let k = 0; k < 6; k++) {
      const du = (rnd() - 0.5) * r * 1.4, dv = (rnd() - 0.5) * r * 1.0, hh = h * (k === 0 ? 1 : 0.35 + rnd() * 0.45);
      const rr = r * (k === 0 ? 0.45 : 0.22 + rnd() * 0.2);
      cyl(u + du, v + dv, yg + 0.3, yg + 0.3 + hh, rr, rr * 0.35, 5, shade(ROCK, 0.85 + rnd() * 0.3));
    }
    S.kind = KIND.PLAIN;
    cyl(u + r * 0.3, v, yg + 0.3 + h * 0.7, yg + 0.3 + h * 1.0, 0.45, 0.1, 5, hex('#4f7a3c')); // a bonsai on the crag
  };
  rockery(-6.5, -31.5, 2.4, 3.6, 11); // Bảo Sơn
  rockery(0.5, -33.5, 2.0, 2.8, 23); // Kình Ngư
  rockery(7.0, -31.0, 2.2, 3.2, 37); // Hổ Tôn
  rockery(-13.0, 24.0, 1.6, 2.2, 51); // two smaller non bộ at the front of the island, by the water (estimated)
  rockery(10.0, 25.0, 1.5, 2.0, 67);
  S.kind = KIND.MASONRY;
  box(-0.4, -39.6, y0 - 0.2, y0 + 2.2, 7.6, 0.5, MUSTARD, { top: TILE }); // the screen (way 695814168)
  S.base = 0;
  fence(S, REAR_WALL, { ...FENCE.imperial, h: 2.2, plinth: 2.2, wall: MUSTARD }, { closed: false });

  // ---- Trường An Môn: a three-door masonry gate, the middle bay raised under a two-tier roof, ceramic panels ----
  {
    const o = obb(GATE), yg = gY(o.c[0], o.c[1]);
    const w = Math.max(o.w, o.d), d = Math.min(o.w, o.d);
    // its local frame matches the palace's: across = U
    const g = (du, dv) => [o.c[0] + du * U[0] + dv * F[0], o.c[1] + du * U[1] + dv * F[1]];
    const gb = (du, dv, ya, yb, bw, bd, col, opt) => { const q = g(du, dv); S.box(q[0], q[1], ya, yb, bw, bd, ANG, col, opt); };
    const gh = (du, dv, bw, bd, ya, h, opt) => { const q = g(du, dv); S.hip(q[0], q[1], bw, bd, ANG, ya, h, GTILE, { flare: 0.35, fascia: 0.2, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, ridgeCol: GRIDGE, segs: 3, ...opt }); };
    S.base = yg - LAND_Y;
    S.kind = KIND.MASONRY;
    gb(0, 0, yg - 0.3, yg + 0.2, w + 1.0, d + 1.6, STONE, { topKind: KIND.ROAD });
    const side = (w - 3.6) / 2, yb = yg + 0.2;
    for (const s of [-1, 1]) {
      const du = s * (1.8 + side / 2);
      S.kind = KIND.MASONRY;
      gb(du, 0, yb, yb + 3.4, side, d, MUSTARD, { top: shade(GTILE, 0.8) });
      S.kind = KIND.PLAIN;
      for (const dv of [-1, 1]) {
        gb(du, dv * (d / 2 + 0.02), yb, yb + 2.4, 1.3, 0.06, DARK); // side door
        gb(du, dv * (d / 2 + 0.03), yb + 2.6, yb + 3.15, side - 0.6, 0.06, hex('#3f7f8a')); // five-colour shard panel
        gb(du + side * 0.3, dv * (d / 2 + 0.04), yb + 2.7, yb + 3.05, 0.5, 0.06, hex('#c4463a'));
        gb(du - side * 0.3, dv * (d / 2 + 0.04), yb + 2.7, yb + 3.05, 0.5, 0.06, hex('#e6d27a'));
      }
      gh(du, 0, side, d, yb + 3.4, 1.0, { over: 0.45 });
    }
    // middle bay: the king's door, a name board, an upper storey with its own roof
    S.kind = KIND.MASONRY;
    gb(0, 0, yb, yb + 4.4, 3.6, d + 0.2, MUSTARD, { top: shade(GTILE, 0.8) });
    S.kind = KIND.PLAIN;
    for (const dv of [-1, 1]) {
      gb(0, dv * (d / 2 + 0.12), yb, yb + 3.0, 1.9, 0.06, DARK);
      gb(0, dv * (d / 2 + 0.13), yb + 3.3, yb + 3.9, 1.7, 0.06, GOLD);
      gb(0, dv * (d / 2 + 0.13), yb + 3.1, yb + 4.2, 3.2, 0.04, hex('#5d8f6a'));
    }
    gh(0, 0, 3.6, d + 0.2, yb + 4.4, 0.7, { over: 0.6 });
    S.kind = KIND.MASONRY;
    gb(0, 0, yb + 4.9, yb + 6.0, 2.4, d - 0.4, MUSTARD, { top: shade(GTILE, 0.8) });
    S.kind = KIND.PLAIN;
    for (const dv of [-1, 1]) gb(0, dv * (d / 2 - 0.18), yb + 5.1, yb + 5.8, 1.6, 0.06, hex('#3f7f8a'));
    gh(0, 0, 2.4, d - 0.4, yb + 6.0, 1.1, { over: 0.55 });
    // the screen wall standing just inside the gate
    const sq = g(0, -6.0), ys = gY(sq[0], sq[1]);
    S.base = ys - LAND_Y;
    S.kind = KIND.MASONRY;
    gb(0, -6.0, ys - 0.2, ys + 2.6, 6.0, 0.55, MUSTARD, { top: GTILE });
    S.kind = KIND.PLAIN;
    for (const dv of [-1, 1]) gb(0, -6.0 + dv * 0.29, ys + 0.6, ys + 2.1, 2.6, 0.04, hex('#3f7f8a'));
    gb(0, -6.0, ys + 2.6, ys + 2.85, 6.5, 0.9, GTILE, { taper: 0.6 });
  }

  // ---- Hữu Hòa môn (south, toward Diên Thọ): one doorway under a yellow-tiled roof ----
  const smallGate = (x, z, a) => {
    const yg = gY(x, z);
    S.base = yg - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(x, z, yg - 0.3, yg + 3.0, 3.6, 1.2, a, MUSTARD, { top: shade(GTILE, 0.8) });
    S.kind = KIND.PLAIN;
    S.box(x, z, yg, yg + 2.3, 1.5, 1.28, a, DARK);
    S.hip(x, z, 3.6, 1.2, a, yg + 3.0, 0.9, GTILE, { flare: 0.3, over: 0.5, fascia: 0.2, fasciaCol: shade(LAC, 0.7), ridgeCol: GRIDGE, hips: true, glazed: true, segs: 3 });
  };
  const wallAng = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  smallGate(SOUTH_GATE[0], SOUTH_GATE[1], wallAng(WALL[7], WALL[0]));
  // Thụy môn (west, the rear wall) and Thanh Minh môn (north, toward the lake): not mapped, put on the axis / mid-wall
  const west = P(0, -66.6), north = P(-44.0, -2.0);
  smallGate(west[0], west[1], wallAng(WALL[1], WALL[2]));
  smallGate(north[0], north[1], wallAng(WALL[2], WALL[3]));

  // ---- the precinct wall, with openings at the four gates ----
  S.base = 0;
  const go = obb(GATE);
  // weathered grey plaster under a grey coping, as Street View shows it beside Trường An Môn
  fence(S, WALL, { ...FENCE.imperial, wall: GREY, cap: shade(TILE, 1.1) }, {
    closed: true,
    openings: [[go.c[0], go.c[1], 5.6], [SOUTH_GATE[0], SOUTH_GATE[1], 1.9], [west[0], west[1], 1.9], [north[0], north[1], 1.9]],
  });

  // ---- the island's edge: a low grey balustrade of pierced panels along the Đào Nguyên channel (Street View) ----
  // The island is the hole in hue.json's channel pond; the balustrade stands 0.6 m in from the water and breaks
  // where a path or bridge comes ashore.
  const pond = (data.ponds || []).find((p) => p.length > 1 && p[1].length > 8 && p[1].some((v, i) => i % 2 === 0 && Math.hypot(v / 10 - C[0], p[1][i + 1] / 10 - C[1]) < 50));
  if (pond) {
    const isl = [];
    for (let i = 0; i < pond[1].length; i += 2) isl.push([pond[1][i] / 10, pond[1][i + 1] / 10]);
    const cx = isl.reduce((t, q) => t + q[0], 0) / isl.length, cz = isl.reduce((t, q) => t + q[1], 0) / isl.length;
    const ring = isl.map(([x, z]) => { const l = Math.hypot(cx - x, cz - z) || 1; return [x + ((cx - x) / l) * 0.6, z + ((cz - z) / l) * 0.6]; });
    const paths = [];
    for (const [, , flat] of data.roads || []) for (let i = 0; i + 3 < flat.length; i += 2) {
      const ax = flat[i] / 10, az = flat[i + 1] / 10, bx = flat[i + 2] / 10, bz = flat[i + 3] / 10;
      if (Math.hypot((ax + bx) / 2 - cx, (az + bz) / 2 - cz) < 80 + Math.hypot(bx - ax, bz - az) / 2) paths.push([ax, az, bx, bz, 3.0]);
    }
    const BAL = { h: 0.95, plinth: 0.4, rail: true, t: 0.3, every: 2.4, postW: 0.34, postUp: 0.12, wall: shade(GREY, 0.85), cap: shade(GREY, 1.05), iron: shade(GREY, 0.55), pierW: 0.55, pierUp: 0.35 };
    fence(S, ring, BAL, { closed: true, roads: paths });
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
