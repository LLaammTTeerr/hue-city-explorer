import { KIND, hex, shade } from '../geo/buf.ts';
import { LAND_Y } from '../config.ts';

// The Imperial City's walls, shared by places/dainoi.js (which draws both rings) and places/tuphuong.js (which draws
// the stretch round Bắc Khuyết Đài, the bastion Lầu Tứ Phương Vô Sự stands on, with the bastion's paving and
// balustrade on top: one model owns that wall top, so the two never lay faces over the same ground).

// Hoàng thành (outer ring) and Tử Cấm Thành (inner): body height and thickness, a tiled cap over it. Colours: the
// weathered grey of the plastered brick, darkened by mould, as street-level photos show both rings (2024-25); the
// Tử Cấm Thành wall reads almost black beside Tây An Môn, a cool grey under the warm light
export const OUTER = { h: 3.75, t: 1.05, capH: 0.42, capW: 1.45, body: hex('#676660'), cap: hex('#504d48') };
export const INNER = { h: 3.36, t: 0.72, capH: 0.36, capW: 1.05, body: hex('#495053'), cap: hex('#3e4345') };

// Bắc Khuyết Đài's three outer sides as OSM maps them (way 531016856): from where the north wall turns out (west),
// round the outer face, to where it comes back (east). The north wall's line west of the first point and the gap at
// Cửa Hòa Bình east of the last are dainoi.js's.
export const BAC_KHUYET_DAI = [[-1405.6, -309.0], [-1419.8, -327.9], [-1367.1, -365.5], [-1353.1, -347.3]];

// One stretch of wall from a to b. ends [e0, e1] say how far each end runs past its point, in half thicknesses:
// 1 laps a corner (body and cap each by half their own width), 0 stops at the point, -1 stops short by half a width,
// against the face of a wall that runs on across that point.
export function wallRun(S, a, b, k, [e0, e1] = [1, 1]) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, ang = Math.atan2(uz, ux), Y = LAND_Y;
  const seg = (w) => { const s0 = -e0 * w / 2, s1 = len + e1 * w / 2, m = (s0 + s1) / 2; return [a[0] + ux * m, a[1] + uz * m, s1 - s0]; };
  const [bx, bz, bl] = seg(k.t), [cx, cz, cl] = seg(k.capW);
  // weathered lime-washed brick, darker in long patches of moss and rain streaks
  const tone = 0.9 + 0.12 * Math.abs(Math.sin(bx * 0.37 + bz * 0.21));
  const keep = S.kind;
  S.kind = KIND.MASONRY;
  S.box(bx, bz, Y - 0.2, Y + k.h, bl, k.t, ang, shade(k.body, tone), { top: k.cap });
  S.kind = KIND.TILE;
  S.box(cx, cz, Y + k.h, Y + k.h + k.capH, cl, k.capW, ang, k.cap, { taper: 0.45 });
  S.kind = keep;
}
