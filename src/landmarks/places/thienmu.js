import { Buf, KIND, hex, shade, obb, unflat, signedArea } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { pavilion } from '../citadel.js';
import { landTest } from '../boats.js';
import { streetTest, offStreets } from '../enclosure.js';

// ---- Chùa Thiên Mụ, the pagoda on Hà Khê hill above the Hương river ----
//
// Sources (docs/places/thienmu.md has the full list):
//  - vi.wikipedia.org/wiki/Chùa_Thiên_Mụ, en.wikipedia.org/wiki/Thiên_Mụ_Temple: Phước Duyên tower, 21 m, seven
//    octagonal tiers, built 1844 under Thiệu Trị, a Buddha on each tier and a spiral stair inside; the Hương
//    Nguyện pavilion in front of it fell in 1904 and only its base is left; two square houses flanking the tower
//    hold Thiệu Trị's steles; two hexagonal houses, one with the 1715 stele of Nguyễn Phúc Chu on a stone turtle,
//    one with the great bell of 1710 (2.5 m high, 1.4 m across, about 2-3 t); the Tam Quan gate (two storeys, the
//    guardians at its three entrances; inside, two halls of guardian statues either side); then Đại Hùng Bảo
//    Điện, Địa Tạng and Quan Âm halls, the monks' quarters, the pine garden and the abbots' stupas behind; walls
//    of brick and stone; four ceremonial pillars and a brick stair down to the riverside road, and the landing.
//  - vietnamnet.vn (2025): the turtle stele (stele 2.6 x 1.2 m on a turtle 2.24 x 1.65 x 0.66 m) and the bell.
//  - OpenStreetMap: tower (way 205795043, height 21), precinct (205794912, = data.hakhe), Tam Quan (1205452741),
//    the square stele houses (1494518276, 205794914), hexagonal pavilions (1494518277/78), Đại Hùng (205794919),
//    guardian halls (205794917, 1195439754), halls behind (205794918/21/15/13, 1205452747, 1195439753), stupa
//    (206108046), the stair (footway steps) and the landing on the river.
// Estimated: storey and eave heights, wall height, colours of the halls (terracotta tiles, ochre walls, lacquer),
// which hexagon holds the bell (east, "tả chung hữu cổ"), the stair's riser count in the model's 9.9 m drop.

export const id = 'thienmu';

const C = [-4678.5, 1824.9]; // tower centre (OSM)
const ANG = -0.237; // the compound's across direction (Tam Quan's long side); +v runs out to the river
const UX = Math.cos(ANG), UZ = Math.sin(ANG);
const P = (u, v) => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];
const L = (x, z) => { const dx = x - C[0], dz = z - C[1]; return [dx * UX + dz * UZ, -dx * UZ + dz * UX]; };

const DAIHUNG = [[-4717.0, 1732.7], [-4687.4, 1725.9], [-4681.4, 1751.5], [-4695.5, 1754.7], [-4711.1, 1758.2]];
const STELE_HOUSES = [
  [[-4663.8, 1828.9], [-4660.2, 1828.1], [-4659.5, 1831.3], [-4663.0, 1832.1]], // east
  [[-4693.8, 1838.5], [-4688.5, 1837.2], [-4687.8, 1840.2], [-4693.1, 1841.5]], // west
];
const GUARD_HALLS = [
  [[-4712.0, 1794.2], [-4706.0, 1792.8], [-4704.1, 1801.1], [-4710.1, 1802.4]],
  [[-4666.7, 1784.8], [-4660.7, 1783.5], [-4658.8, 1791.8], [-4664.8, 1793.1]],
];
const HALLS = [
  [[-4717.7, 1692.1], [-4703.2, 1688.2], [-4699.9, 1700.4], [-4714.4, 1704.3]],
  [[-4734.3, 1730.8], [-4738.9, 1731.9], [-4744.2, 1708.2], [-4730.9, 1705.3], [-4727.9, 1704.6], [-4721.8, 1732.0], [-4733.4, 1734.6]],
  [[-4744.2, 1708.2], [-4748.1, 1690.7], [-4734.9, 1688.0], [-4730.9, 1705.3]],
  [[-4747.2, 1726.6], [-4756.5, 1728.3], [-4760.3, 1708.1], [-4751.1, 1706.3]],
  [[-4732.7, 1657.9], [-4708.6, 1652.0], [-4704.7, 1667.7], [-4728.9, 1673.5]],
  [[-4777.9, 1668.0], [-4767.2, 1665.4], [-4757.6, 1704.9], [-4768.1, 1707.2]],
];
const STUPA = [-4738.6, 1583.5];
const SIDE_GATES = [[-4663.9, 1750.5], [-4738.6, 1767.1]]; // drawn by citadel.js (data.gates); the wall leaves a way through
// the small gate in the east wall onto the lane, seen in Google Street View from the lane (car panorama at 16.452823,
// 107.545376, looking 214 deg): bearing about 202 deg from it, where that line meets the wall. Not mapped in OSM.
const EAST_GATE = [-4648.1, 1790.0];

const STONE = PAL.stone, BRICK = hex('#b8897a'), EAVE = hex('#5b5352'), TRIM = hex('#e9dfcd'), DARK = hex('#2b2422');
// ROOF: weathered grey-brown tile, as the halls read from above (Google satellite) and in a courtyard photo, rather than
// the city's new terracotta
const ROOF = hex('#80594b'), WALL = PAL.templeWall, LAC = PAL.lacquer, RIDGE = hex('#d8c9a0'), GOLD = hex('#d9c27a');
const LIME = hex('#d9d2c2'), GREY = hex('#8d8a84'), BRONZE = hex('#5d5a43'), PAVE = hex('#b49a80');
const LANTERN = [1.0, 0.72, 0.34];
// the outer wall and the terrace face under it: rough grey-brown rubble under a flat stone coping (Street View, east
// lane); the red of the gate's doors and plaque
const RUBBLE = hex('#8d8576'), COPING = hex('#a19d92'), DOOR = hex('#8e2f25');

// clip a ring (local u,v) to the half plane a*u + b*v <= c
function clip(ring, a, b, c) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length];
    const fp = a * p[0] + b * p[1] - c, fq = a * q[0] + b * q[1] - c;
    if (fp <= 0) out.push(p);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}

export function build({ data, S, group, THREE }) {
  if (!data.hakhe) throw new Error('no Hà Khê terrace in the data');
  // the precinct as mapped, less the lane OSM draws a metre or two into its east side (the wall stands at the kerb)
  const hkRing = offStreets(data, unflat(data.hakhe.ring));
  const Y = LAND_Y + data.hakhe.top / 10 + 0.06; // the walled ground of the pagoda: one level on the hill
  const keep = S.kind;
  const box = (u, v, ya, yb, w, d, col, o) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ANG, col, o); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ANG, ...o }); };
  const beam = (u0, v0, y0, u1, v1, y1, w, h, col) => { const a = P(u0, v0), b = P(u1, v1); S.beam([a[0], y0, a[1]], [b[0], y1, b[1]], w, h, col); };
  const lanPos = [], lanCol = [];
  const lamp = (u, v, y) => { const q = P(u, v); lanPos.push(q[0], y, q[1]); lanCol.push(...LANTERN); };
  const LT = new Buf(1200); // light strips under the tower's eaves

  // ---- the terrace: Hà Khê's walled top, stone-faced, cut at the front for the stair ----
  const SW = 4.2, NV = 13.0; // the stair's half width and where it leaves the terrace
  const loc = hkRing.map((p) => L(p[0], p[1]));
  const pieces = [clip(loc, 0, 1, NV), clip(clip(loc, 0, -1, -NV), 1, 0, -SW), clip(clip(loc, 0, -1, -NV), -1, 0, -SW)];
  S.base = Y - LAND_Y;
  for (const pc of pieces) {
    if (pc.length < 3) continue;
    const n0 = S.n;
    S.kind = KIND.MASONRY;
    S.prism(pc.map(([u, v]) => P(u, v)), LAND_Y - 0.6, Y, RUBBLE, hex(PAL.green.sacred || '#c9bc93'), { topKind: KIND.GROUND });
    (S.noCover = S.noCover || []).push([n0, S.n]); // ground: the garden trees stand on it
  }

  // ---- the precinct wall on the outline; a low balustrade along the front brow ----
  // Street View along the east lane (Google car panoramas, captured 2026): the outer wall is rough grey-brown rubble
  // stone under a flat stone coping, about 2.8-3 m above the lane where the lane runs at its foot (north) and about
  // 2.5 m above a grass bank further south, where a small masonry gate with red doors opens on the lane. The model's
  // walled ground is one level (Y) while the lane falls away along the wall, so each stretch of wall is sized from the
  // ground outside it: its top 2.9 m above that ground, but never less than 0.9 m nor more than 2.3 m above the court.
  // The terrace face below it is the same rubble (see RUBBLE above), so face and wall read as the one wall they are.
  {
    const ccw = signedArea(hkRing) > 0;
    const gl = [L(...SIDE_GATES[0]), L(...SIDE_GATES[1])];
    const gd = [gl[1][0] - gl[0][0], gl[1][1] - gl[0][1]];
    const topAt = (x, z) => Math.min(Y + 2.3, Math.max(Y + 0.9, LAND_Y + rise(x, z) + 2.9));
    let eastGate = null;
    for (let i = 0; i < hkRing.length; i++) {
      const a = hkRing[i], b = hkRing[(i + 1) % hkRing.length];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < 0.5) continue;
      const tx = dx / len, tz = dz / len, nx = ccw ? -tz : tz, nz = ccw ? tx : -tx; // inward normal
      const la = L(a[0], a[1]), lb = L(b[0], b[1]);
      const front = la[1] > 14 && lb[1] > 14;
      // gaps: the stair, the east gate, and where the cross path through the two side gates meets the wall
      // intersection of this edge with the cross line
      const ex = lb[0] - la[0], ev = lb[1] - la[1], den = ex * gd[1] - ev * gd[0];
      let gapAt = null;
      if (Math.abs(den) > 1e-6) {
        const t = ((gl[0][0] - la[0]) * gd[1] - (gl[0][1] - la[1]) * gd[0]) / den;
        if (t > 0 && t < 1) gapAt = t * len;
      }
      const segs = [[0, len]];
      const cut = (s0, s1) => { for (let k = segs.length - 1; k >= 0; k--) { const [p0, p1] = segs[k]; if (s1 <= p0 || s0 >= p1) continue; segs.splice(k, 1, ...[[p0, s0], [s1, p1]].filter(([q0, q1]) => q1 - q0 > 0.2)); } };
      if (front && Math.abs(lb[0] - la[0]) > 1e-6) {
        const t0 = (-SW - la[0]) / (lb[0] - la[0]), t1 = (SW - la[0]) / (lb[0] - la[0]);
        const s0 = Math.max(0, Math.min(t0, t1)) * len, s1 = Math.min(1, Math.max(t0, t1)) * len;
        if (s1 > s0) cut(s0, s1);
      }
      if (gapAt !== null) cut(gapAt - 2.2, gapAt + 2.2);
      if (!front && !eastGate) {
        const s = (EAST_GATE[0] - a[0]) * tx + (EAST_GATE[1] - a[1]) * tz;
        const off = Math.abs((EAST_GATE[0] - a[0]) * nx + (EAST_GATE[1] - a[1]) * nz);
        if (s > 2.2 && s < len - 2.2 && off < 3) { eastGate = { s, a, tx, tz, nx, nz }; cut(s - 1.75, s + 1.75); }
      }
      const th = front ? 0.35 : 0.55;
      for (const [s0, s1] of segs) {
        if (front) {
          const h = 0.95, m = (s0 + s1) / 2, l = s1 - s0;
          const x = a[0] + tx * m + nx * (th / 2 + 0.2), z = a[1] + tz * m + nz * (th / 2 + 0.2), ang = Math.atan2(tz, tx);
          S.kind = KIND.MASONRY;
          S.box(x, z, Y - 0.3, Y + h, l, th, ang, LIME);
          S.kind = KIND.PLAIN;
          S.box(x, z, Y + h, Y + h + 0.14, l, th + 0.2, ang, GREY);
          for (let s = s0 + 2.4; s < s1 - 0.6; s += 2.4) S.box(a[0] + tx * s + nx * (th / 2 + 0.2), a[1] + tz * s + nz * (th / 2 + 0.2), Y, Y + h + 0.3, 0.45, 0.45, ang, LIME);
          continue;
        }
        // rubble wall in stretches of at most 8 m, each as high as the ground outside it asks
        const n = Math.max(1, Math.ceil((s1 - s0) / 8));
        for (let k = 0; k < n; k++) {
          const p0 = s0 + ((s1 - s0) * k) / n, p1 = s0 + ((s1 - s0) * (k + 1)) / n;
          const m = (p0 + p1) / 2, l = p1 - p0 + (k === 0 ? 0.2 : 0) + (k === n - 1 ? 0.2 : 0);
          const mm = m + (k === 0 ? -0.1 : 0) + (k === n - 1 ? 0.1 : 0);
          const x = a[0] + tx * mm + nx * (th / 2 + 0.02), z = a[1] + tz * mm + nz * (th / 2 + 0.02), ang = Math.atan2(tz, tx);
          const top = topAt(a[0] + tx * m - nx * 2, a[1] + tz * m - nz * 2);
          S.kind = KIND.MASONRY;
          S.box(x, z, Y - 0.3, top, l, th, ang, RUBBLE);
          S.kind = KIND.PLAIN;
          S.box(x, z, top, top + 0.16, l, th + 0.16, ang, COPING);
        }
      }
      if (gapAt !== null && !front) {
        // a small gateway in the wall: two rubble piers with stone caps
        for (const sg of [-1, 1]) {
          const s = gapAt + sg * 2.4, x = a[0] + tx * s + nx * 0.48, z = a[1] + tz * s + nz * 0.48;
          const top = topAt(a[0] + tx * s - nx * 2, a[1] + tz * s - nz * 2) + 0.5;
          S.kind = KIND.MASONRY;
          S.box(x, z, Y - 0.3, top, 0.8, 0.8, Math.atan2(tz, tx), RUBBLE);
          S.kind = KIND.PLAIN;
          S.box(x, z, top, top + 0.22, 1.0, 1.0, Math.atan2(tz, tx), COPING);
        }
      }
    }
    if (eastGate) {
      // the east gate (svB): a masonry block a little taller than the wall, an arched opening with red doors, a red
      // plaque above, a short tiled canopy; a few steps down the bank to the lane
      const { s, a, tx, tz, nx, nz } = eastGate, ang = Math.atan2(tz, tx);
      const gx = a[0] + tx * s, gz = a[1] + tz * s;
      const at = (along, inn) => [gx + tx * along + nx * inn, gz + tz * along + nz * inn];
      const ground = LAND_Y + rise(gx - nx * 2, gz - nz * 2);
      const top = Math.max(topAt(gx - nx * 2, gz - nz * 2) + 0.9, Y + 3.35), mid = at(0, 0.48);
      S.kind = KIND.MASONRY;
      for (const sg of [-1, 1]) { const q = at(sg * 1.25, 0.48); S.box(q[0], q[1], Y - 0.3, top, 1.1, 1.1, ang, shade(RUBBLE, 0.95)); }
      S.box(mid[0], mid[1], Y + 2.45, top, 1.42, 1.1, ang, shade(RUBBLE, 0.95));
      S.kind = KIND.PLAIN;
      S.box(mid[0], mid[1], Y + 2.05, Y + 2.45, 1.42, 1.1, ang, shade(RUBBLE, 0.95)); // the arch's spandrels, simplified
      // the arch: the opening narrows in two steps to its crown
      S.box(mid[0], mid[1], Y + 2.05, Y + 2.25, 1.1, 1.12, ang, DARK);
      S.box(mid[0], mid[1], Y + 2.25, Y + 2.38, 0.7, 1.12, ang, DARK);
      for (const sg of [-1, 1]) { const q = at(sg * 0.52, -0.11); S.box(q[0], q[1], Y, Y + 2.05, 0.36, 0.08, ang, DOOR); } // the red doors, folded open
      { const q = at(0, -0.1); S.box(q[0], q[1], Y + 2.62, Y + 3.0, 1.0, 0.06, ang, DOOR); } // the plaque
      S.box(mid[0], mid[1], top, top + 0.14, 3.9, 1.6, ang, shade(ROOF, 0.85));
      S.box(mid[0], mid[1], top + 0.14, top + 0.42, 3.3, 0.9, ang, ROOF);
      S.box(mid[0], mid[1], top + 0.42, top + 0.56, 3.5, 0.22, ang, shade(ROOF, 0.7));
      // steps down the bank to the lane outside, if it is lower
      const drop = Y - ground;
      if (drop > 0.4) {
        const n = Math.min(12, Math.ceil(drop / 0.17)), rise1 = drop / n, run = Math.min(0.32, 4.5 / n);
        S.kind = KIND.ROAD;
        for (let k = 0; k < n; k++) {
          const q = at(0, -0.05 - run * (k + 0.5));
          S.box(q[0], q[1], ground - 0.4, Y - rise1 * (k + 1) + 0.02, 1.8, run + 0.01, ang, shade(COPING, 0.9), { topKind: KIND.ROAD });
        }
      }
    }
  }

  // ---- the stair: from the terrace at the four pillars down to the riverside road, two flights and a landing ----
  // The riverside road (Nguyễn Phúc Nguyên, OSM) runs between the stair and the landing: the flight comes down to its
  // land-side kerb and the landing starts past its river-side pavement, both found on the mapped street, so neither
  // runs out over the asphalt (fixed lengths put the newel posts, the landing and its posts on the carriageway).
  const street = streetTest(data, P(0, 35), 60);
  const across = [-SW - 0.7, 0, SW + 0.7];
  let vEnd = 26.5;
  for (let v = NV + 10; v < 40; v += 0.1) if (across.some((u) => street(...P(u, v), 0.3))) { vEnd = v; break; }
  let vKerb = 36;
  for (let v = vEnd + 1; v < 60; v += 0.1) if (![-8, -4, 0, 4, 8].some((u) => street(...P(u, v), 'pavement'))) { vKerb = v; break; }
  {
    const gEnd = LAND_Y + Math.max(0, rise(...P(0, vEnd)));
    const n = 30, land = 1.8, run = (vEnd - NV - land) / n, fall = (Y - gEnd) / n;
    const n0 = S.n;
    S.kind = KIND.ROAD;
    let v = NV;
    for (let k = 0; k < n; k++) {
      if (k === n / 2) {
        // the landing
        S.base = Y - fall * k - LAND_Y;
        box(0, v + land / 2, gEnd - 0.8, Y - fall * k, SW * 2, land + 0.02, shade(STONE, 1.02), { topKind: KIND.ROAD });
        v += land;
      }
      const sy = Y - fall * (k + 1);
      S.base = sy - LAND_Y;
      box(0, v + run / 2, gEnd - 0.8, sy, SW * 2, run + 0.02, k % 2 ? shade(BRICK, 0.9) : shade(BRICK, 0.95), { topKind: KIND.ROAD });
      v += run;
    }
    (S.paved = S.paved || []).push([n0, S.n]);
    // cheek walls with a balustrade, each side, stepping down with the flight
    S.kind = KIND.MASONRY; S.base = 0;
    for (const sg of [-1, 1]) {
      const u = sg * (SW + 0.3);
      const a = P(u, NV - 0.2), m = P(u, NV + n / 2 * run + land / 2), b = P(u, vEnd + 0.2);
      const ym = Y - fall * n / 2;
      S.beam([a[0], Y + 0.6, a[1]], [m[0], ym + 0.6, m[1]], 0.6, 1.2, LIME);
      S.beam([m[0], ym + 0.6, m[1]], [b[0], gEnd + 0.6, b[1]], 0.6, 1.2, LIME);
      // the stone face under the coping, down to the ground
      box(u, (NV + vEnd) / 2 + 0.1, LAND_Y - 0.4, Math.min(ym, Y - 2) , 0.6, vEnd - NV + 0.4, shade(STONE, 0.88));
      box(u, NV + (vEnd - NV) * 0.2, LAND_Y - 0.4, Y - 2, 0.6, (vEnd - NV) * 0.4, shade(STONE, 0.88));
      // newel posts at the foot
      box(u, vEnd - 0.2, gEnd, gEnd + 1.4, 0.8, 0.8, LIME);
      cyl(u, vEnd - 0.2, gEnd + 1.4, gEnd + 1.9, 0.3, 0.12, 6, GREY);
    }
    S.base = 0;
  }

  // ---- across the road: the landing (bến) on the river, a stone platform and steps down to the water ----
  {
    const vH = Math.max(46, vKerb + 3); // the platform runs from the pavement's edge to the head of the flight
    const gy = LAND_Y + Math.max(0, rise(...P(0, (vKerb + vH) / 2)));
    const n0 = S.n;
    S.kind = KIND.MASONRY;
    box(0, (vKerb + vH) / 2, gy - 1.2, gy + 0.25, 16, vH - vKerb, shade(STONE, 0.98), { topKind: KIND.ROAD });
    S.kind = KIND.ROAD;
    const steps = 18, top = gy + 0.25, bot = 0.4, run = 0.6;
    // the flight goes down the bank: the first step that drops a metre below the city floor stands at the mapped
    // shore, and where the shore lies farther out the platform runs on to the head of the flight (on a fixed run the
    // lower steps were sunk in the bank)
    const land = landTest(data), kIn = Math.ceil(((top - (LAND_Y - 0.9)) / (top - bot)) * steps) - 1;
    let v0 = vH;
    for (let v = vH + kIn * run; v < 90; v += 0.25) if (![-5, 0, 5].some((u) => land(...P(u, v)))) { v0 = Math.max(vH, v - kIn * run); break; }
    if (v0 > vH) box(0, (vH + v0) / 2, gy - 1.2, gy + 0.25, 10, v0 - vH + 0.1, shade(STONE, 0.98), { topKind: KIND.ROAD });
    for (let k = 0; k < steps; k++) box(0, v0 + run * (k + 0.5), bot - 1.2, top - ((top - bot) * (k + 1)) / steps, 10, run + 0.02, shade(STONE, 0.92 - k * 0.015), { topKind: KIND.ROAD });
    (S.paved = S.paved || []).push([n0, S.n]);
    S.kind = KIND.MASONRY;
    for (const sg of [-1, 1]) {
      box(sg * 6.5, (vH + v0 + steps * run) / 2, bot - 1.2, top + 0.5, 3.0, v0 - vH + steps * run, shade(STONE, 0.9));
      box(sg * 7.6, vKerb + 0.4, top, top + 0.8, 0.6, 0.6, LIME);
      cyl(sg * 7.6, vKerb + 0.4, top + 0.8, top + 1.15, 0.28, 0.1, 6, GREY);
    }
    S.kind = KIND.PLAIN;
  }

  // ---- Phước Duyên tower: seven octagonal tiers on a balustraded octagonal terrace, 21 m to the finial ----
  {
    const n0 = S.n;
    const rot = ANG + Math.PI / 2 - Math.PI / 8; // a flat face square to the river axis
    const pr = 7.4, ph = 0.9;
    S.base = Y - LAND_Y;
    S.kind = KIND.MASONRY;
    S.cyl(C[0], C[1], Y - 0.2, Y + ph, pr, pr * 0.98, 8, shade(STONE, 0.95), { rot });
    S.kind = KIND.PLAIN;
    S.cyl(C[0], C[1], Y + ph, Y + ph + 0.06, pr * 0.99, pr * 0.99, 8, shade(STONE, 1.05), { rot });
    // the balustrade round its edge, open on the river side and the gate side
    for (let k = 0; k < 8; k++) {
      const a0 = rot + (k / 8) * Math.PI * 2, a1 = rot + ((k + 1) / 8) * Math.PI * 2, am = (a0 + a1) / 2;
      const nxm = Math.cos(am), nzm = Math.sin(am);
      const face = nxm * -UZ + nzm * UX; // dot with +v
      const rr = pr * 0.95;
      const A = [C[0] + Math.cos(a0) * rr, C[1] + Math.sin(a0) * rr], B = [C[0] + Math.cos(a1) * rr, C[1] + Math.sin(a1) * rr];
      if (Math.abs(face) > 0.9) {
        // steps up on this face
        const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2, fa = Math.atan2(B[1] - A[1], B[0] - A[0]);
        for (let s = 0; s < 4; s++) {
          const o = 0.35 + s * 0.34;
          S.box(mx + nxm * o, mz + nzm * o, Y - 0.2, Y + ph - (s + 1) * ph / 5, 3.4, 0.36, fa, shade(STONE, 1.0), { topKind: KIND.ROAD });
        }
        for (const t of [0.18, 0.82]) {
          const q = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
          S.box(q[0], q[1], Y + ph, Y + ph + 0.9, 0.4, 0.4, fa, LIME);
        }
        continue;
      }
      S.beam([A[0], Y + ph + 0.7, A[1]], [B[0], Y + ph + 0.7, B[1]], 0.22, 0.14, LIME);
      S.beam([A[0], Y + ph + 0.25, A[1]], [B[0], Y + ph + 0.25, B[1]], 0.16, 0.1, LIME);
      S.box(A[0], A[1], Y + ph, Y + ph + 0.9, 0.36, 0.36, a0, LIME);
    }
    // the tiers
    const r = 3.9, tiers = 7, finial = 2.5, total = 21 - ph - finial;
    const hs = Array.from({ length: tiers }, (_, i) => 1.3 - i * 0.08), sum = hs.reduce((a, v) => a + v, 0);
    let y = Y + ph;
    for (let i = 0; i < tiers; i++) {
      const h = (total * hs[i]) / sum;
      const ri = r * (1 - 0.07 * i), rn = r * (1 - 0.07 * (i + 1));
      S.kind = KIND.MASONRY;
      S.cyl(C[0], C[1], y, y + h - 0.45, ri, ri * 0.985, 8, BRICK, { cap: false, rot });
      S.kind = KIND.PLAIN;
      S.cyl(C[0], C[1], y, y + 0.24, ri * 1.05, ri * 1.05, 8, TRIM, { cap: false, rot });
      S.cyl(C[0], C[1], y + h - 0.72, y + h - 0.45, ri * 1.04, ri * 1.04, 8, TRIM, { cap: false, rot });
      // an arched doorway on the river face and the gate face; on the six others a niche with its Buddha
      const ap = ri * Math.cos(Math.PI / 8);
      for (let k = 0; k < 8; k++) {
        const th = rot + Math.PI / 8 + (k * Math.PI) / 4, nx = Math.cos(th), nz = Math.sin(th);
        const face = nx * -UZ + nz * UX, door = Math.abs(face) > 0.9;
        const ww = door ? Math.max(0.75, ri * 0.32) : Math.max(0.5, ri * 0.24);
        const top = y + h * (door ? 0.6 : 0.55), bot = y + (door ? 0.24 : h * 0.2);
        S.box(C[0] + nx * (ap + 0.02), C[1] + nz * (ap + 0.02), bot - 0.1, top + 0.18, 0.08, ww + 0.3, th, TRIM);
        S.box(C[0] + nx * (ap + 0.07), C[1] + nz * (ap + 0.07), bot, top, 0.06, ww, th, door ? DARK : hex('#4a3a33'));
        // the arch: a little rounded head
        S.box(C[0] + nx * (ap + 0.07), C[1] + nz * (ap + 0.07), top, top + ww * 0.28, 0.06, ww * 0.62, th, door ? DARK : hex('#4a3a33'));
        if (!door) S.box(C[0] + nx * (ap + 0.1), C[1] + nz * (ap + 0.1), bot, bot + (top - bot) * 0.55, 0.05, ww * 0.42, th, GOLD);
      }
      // the eave: a thin slab and a short tiled slope up to the next tier
      S.cyl(C[0], C[1], y + h - 0.45, y + h - 0.28, ri * 1.22, ri * 1.22, 8, EAVE, { rot });
      const ly = y + h - 0.5, lr = ri * 1.14;
      for (let k = 0; k < 8; k++) {
        const a0 = rot + (k / 8) * Math.PI * 2, a1 = rot + ((k + 1) / 8) * Math.PI * 2;
        LT.beam([C[0] + Math.cos(a0) * lr, ly, C[1] + Math.sin(a0) * lr], [C[0] + Math.cos(a1) * lr, ly, C[1] + Math.sin(a1) * lr], 0.12, 0.09, [1, 1, 1]);
      }
      S.kind = KIND.TILE;
      S.cyl(C[0], C[1], y + h - 0.28, y + h, ri * 1.22, rn * 1.03, 8, EAVE, { cap: false, rot });
      y += h;
    }
    // the finial: a bowl, a gourd and the spire
    S.kind = KIND.PLAIN;
    S.cyl(C[0], C[1], y, y + 0.5, r * 0.48, r * 0.26, 8, EAVE, { rot });
    S.cyl(C[0], C[1], y + 0.5, y + 0.9, r * 0.14, r * 0.2, 8, GOLD);
    S.cyl(C[0], C[1], y + 0.9, y + 1.4, r * 0.2, r * 0.1, 8, GOLD);
    S.cyl(C[0], C[1], y + 1.4, y + finial, 0.12, 0.03, 6, GOLD);
    S.base = 0;
    void n0;
  }

  // ---- the forecourt: paving round the tower, the Hương Nguyện ruin, the four pillars ----
  {
    const n0 = S.n;
    S.kind = KIND.ROAD;
    box(0, -4, Y, Y + 0.04, 26, 32, PAVE, { topKind: KIND.ROAD });
    box(0, -48.5, Y, Y + 0.04, 3.2, 47, PAVE, { topKind: KIND.ROAD }); // the axis path from the gate to Đại Hùng
    { // the cross path through the side gates
      const a = L(...SIDE_GATES[0]), b = L(...SIDE_GATES[1]);
      const pa = P(...a), pb = P(...b);
      S.base = Y - LAND_Y;
      S.box((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, Y, Y + 0.04, Math.hypot(pb[0] - pa[0], pb[1] - pa[1]), 2.6, Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), PAVE, { topKind: KIND.ROAD });
    }
    for (const sg of [-1, 1]) box(sg * 13.5, 4, Y, Y + 0.04, 7, 2.2, PAVE, { topKind: KIND.ROAD });
    // the Hương Nguyện pavilion's base, all that is left of it
    S.kind = KIND.MASONRY;
    box(0, 9.9, Y, Y + 0.35, 9.2, 3.4, shade(STONE, 0.86), { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const u of [-3.6, -1.2, 1.2, 3.6]) for (const v of [8.8, 11]) cyl(u, v, Y + 0.35, Y + 0.5, 0.32, 0.3, 6, shade(STONE, 0.95));
    (S.paved = S.paved || []).push([n0, S.n]);
    // the four pillars (trụ biểu) at the head of the stair, taller pair in the middle
    for (const u of [-7.4, -2.6, 2.6, 7.4]) {
      const tall = Math.abs(u) < 5 ? 7.4 : 6.4, v = NV - 1.1;
      S.base = Y - LAND_Y;
      S.kind = KIND.MASONRY;
      box(u, v, Y - 0.2, Y + 0.9, 1.5, 1.5, STONE);
      box(u, v, Y + 0.9, Y + tall, 1.0, 1.0, TRIM, { taper: 0.88 });
      S.kind = KIND.PLAIN;
      box(u, v, Y + tall - 1.4, Y + tall - 1.2, 1.12, 1.12, GREY);
      box(u, v, Y + tall, Y + tall + 0.32, 1.3, 1.3, EAVE);
      cyl(u, v, Y + tall + 0.32, Y + tall + 1.1, 0.36, 0.05, 6, TRIM);
      lamp(u, v + 0.8, Y + tall - 0.7);
    }
    S.base = 0;
  }

  // ---- the court inside the gate: lawns either side of the paths, clipped shrubs and bonsai pots along the axis ----
  {
    const n0 = S.n;
    S.base = Y - LAND_Y;
    S.kind = KIND.GROUND;
    const lawn = hex(PAL.green.grass);
    for (const [u0, u1] of [[-24, -2.4], [2.4, 26]]) for (const [v0, v1] of [[-66.5, -48.5], [-46, -28]]) box((u0 + u1) / 2, (v0 + v1) / 2, Y, Y + 0.06, u1 - u0, v1 - v0, lawn, { topKind: KIND.GROUND });
    (S.noCover = S.noCover || []).push([n0, S.n]);
    S.kind = KIND.PLAIN;
    for (let v = -64; v <= -30; v += 4.25) for (const sg of [-1, 1]) {
      cyl(sg * 2.3, v, Y, Y + 0.45, 0.42, 0.34, 8, hex('#8a5a44'));
      S.kind = KIND.TILE;
      cyl(sg * 2.3, v, Y + 0.45, Y + 1.15, 0.55, 0.3, 6, hex('#4f6b3a'));
      S.kind = KIND.PLAIN;
    }
    S.base = 0;
  }

  // ---- the square houses of Thiệu Trị's steles either side of the tower ----
  for (const rg of STELE_HOUSES) {
    const o = obb(rg), lc = L(o.c[0], o.c[1]);
    const w = Math.max(o.w, 3.6);
    S.base = Y - LAND_Y;
    S.kind = KIND.MASONRY;
    box(lc[0], lc[1], Y - 0.2, Y + 0.45, w + 0.8, w + 0.8, STONE, { topKind: KIND.ROAD });
    // brick walls with an arched opening each side
    const y1 = Y + 0.45, wh = 2.7;
    for (const [du, dv, along] of [[0, -w / 2, true], [0, w / 2, true], [-w / 2, 0, false], [w / 2, 0, false]]) {
      for (const sg of [-1, 1]) {
        const pu = du + (along ? sg * w * 0.33 : 0), pv = dv + (along ? 0 : sg * w * 0.33);
        box(lc[0] + pu, lc[1] + pv, y1, y1 + wh, along ? w * 0.34 : 0.3, along ? 0.3 : w * 0.34, shade(WALL, 0.92));
      }
      box(lc[0] + du, lc[1] + dv, y1 + 2.0, y1 + wh, along ? w * 0.34 : 0.3, along ? 0.3 : w * 0.34, shade(WALL, 0.92));
    }
    S.kind = KIND.PLAIN;
    box(lc[0], lc[1], y1, y1 + 0.3, 0.9, 0.5, GREY);
    box(lc[0], lc[1], y1 + 0.3, y1 + 2.2, 0.75, 0.16, hex('#5f5a52'));
    const q = P(lc[0], lc[1]);
    S.kind = KIND.TILE;
    S.hip(q[0], q[1], w, w, ANG, y1 + wh, 1.7, ROOF, { flare: 0.45, over: 0.7, fascia: 0.22, fasciaCol: shade(LAC, 0.7), hips: true, segs: 3, ridgeCol: RIDGE });
    S.kind = KIND.PLAIN;
    S.cyl(q[0], q[1], y1 + wh + 1.7, y1 + wh + 2.3, 0.22, 0.05, 5, GOLD);
    S.base = 0;
  }

  // ---- the two hexagonal pavilions: the great bell (east) and the 1715 stele on its turtle (west) ----
  for (const [u, v, bell] of [[16.8, 0.7, true], [-19.0, -1.2, false]]) {
    const r = 2.6, colH = 4.2, y1 = Y + 0.5;
    S.base = Y - LAND_Y;
    S.kind = KIND.MASONRY;
    cyl(u, v, Y - 0.2, y1, r + 0.9, r + 0.85, 6, STONE);
    S.kind = KIND.TIMBER;
    const q = P(u, v);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + ANG, b = ((k + 1) / 6) * Math.PI * 2 + ANG;
      const x = q[0] + Math.cos(a) * r, z = q[1] + Math.sin(a) * r;
      S.cyl(x, z, y1, y1 + 0.2, 0.3, 0.26, 6, shade(STONE, 0.95));
      S.cyl(x, z, y1 + 0.2, y1 + colH, 0.17, 0.15, 6, LAC, { cap: false });
      S.beam([x, y1 + colH - 0.15, z], [q[0] + Math.cos(b) * r, y1 + colH - 0.15, q[1] + Math.sin(b) * r], 0.24, 0.32, shade(LAC, 0.8));
    }
    // the roof: a flared six-sided tent in two pitches, with upturned horns at the corners
    S.kind = KIND.TILE;
    S.cyl(q[0], q[1], y1 + colH, y1 + colH + 0.9, r + 1.1, r * 0.62, 6, ROOF, { rot: ANG });
    S.cyl(q[0], q[1], y1 + colH + 0.9, y1 + colH + 2.4, r * 0.62, 0.12, 6, ROOF, { rot: ANG, cap: false });
    S.kind = KIND.PLAIN;
    S.cyl(q[0], q[1], y1 + colH - 0.18, y1 + colH, r + 1.1, r + 1.1, 6, shade(LAC, 0.7), { rot: ANG, cap: false });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + ANG, ca = Math.cos(a), sa = Math.sin(a);
      const R0 = r * 0.6, R1 = r + 1.1;
      S.beam([q[0] + ca * R0, y1 + colH + 0.95, q[1] + sa * R0], [q[0] + ca * R1, y1 + colH + 0.05, q[1] + sa * R1], 0.18, 0.2, RIDGE);
      S.beam([q[0] + ca * R1, y1 + colH + 0.05, q[1] + sa * R1], [q[0] + ca * (R1 + 0.45), y1 + colH + 0.55, q[1] + sa * (R1 + 0.45)], 0.16, 0.18, RIDGE);
    }
    S.cyl(q[0], q[1], y1 + colH + 2.4, y1 + colH + 3.1, 0.24, 0.05, 6, GOLD);
    if (bell) {
      // Đại Hồng Chung, 1710: about 2.5 m high and 1.4 m across, hung from a heavy beam
      S.beam([q[0] + UX * -r * 0.85, y1 + 3.4, q[1] + UZ * -r * 0.85], [q[0] + UX * r * 0.85, y1 + 3.4, q[1] + UZ * r * 0.85], 0.3, 0.3, shade(LAC, 0.6));
      S.cyl(q[0], q[1], y1 + 0.5, y1 + 2.7, 0.72, 0.6, 10, BRONZE);
      S.cyl(q[0], q[1], y1 + 2.7, y1 + 3.0, 0.6, 0.3, 10, BRONZE);
      S.cyl(q[0], q[1], y1 + 3.0, y1 + 3.3, 0.14, 0.14, 6, BRONZE);
      S.cyl(q[0], q[1], y1 + 0.5, y1 + 0.62, 0.76, 0.76, 10, shade(BRONZE, 1.2), { cap: false });
    } else {
      // the stele on its stone turtle: turtle 2.24 x 1.65 x 0.66 m on a low base, stele 2.6 x 1.2 m
      S.kind = KIND.MASONRY;
      box(u, v, y1, y1 + 0.3, 2.6, 2.0, GREY);
      const tq = P(u, v);
      S.cyl(tq[0], tq[1], y1 + 0.3, y1 + 0.96, 1.05, 0.7, 8, hex('#7a776d'), { rot: ANG });
      box(u, v + 1.15, y1 + 0.35, y1 + 0.8, 0.45, 0.6, hex('#7a776d'));
      box(u, v, y1 + 0.9, y1 + 3.5, 1.2, 0.25, hex('#86827a'));
      box(u, v, y1 + 3.5, y1 + 3.75, 1.3, 0.3, hex('#7a776d'));
    }
    S.base = 0;
  }

  // ---- Tam Quan: the two-storey gate with its three entrances and their guardians ----
  {
    const v = -22.4, gw = 11.2, gd = 5.4, wh = 4.4, y1 = Y + 0.45;
    const n0 = S.n;
    S.base = Y - LAND_Y;
    S.kind = KIND.MASONRY;
    box(0, v, Y - 0.2, y1, gw + 1.6, gd + 2.4, STONE, { topKind: KIND.ROAD });
    for (const sg of [-1, 1]) for (let s = 0; s < 3; s++) box(0, v + sg * (gd / 2 + 1.2 + 0.32 * (s + 0.5)), Y - 0.2, y1 - (s + 1) * 0.12, 3.2, 0.33, shade(STONE, 1.03), { topKind: KIND.ROAD });
    // piers between the doorways, and the lintels over them
    const piers = [[-5.6, -4.4], [-2.6, -1.2], [1.2, 2.6], [4.4, 5.6]];
    const doors = [[-4.4, -2.6, 3.0], [-1.2, 1.2, 3.6], [2.6, 4.4, 3.0]];
    for (const [a, b] of piers) box((a + b) / 2, v, y1, y1 + wh, b - a, gd, WALL, { top: shade(ROOF, 0.8) });
    for (const [a, b, h] of doors) {
      box((a + b) / 2, v, y1 + h, y1 + wh, b - a, gd, WALL, { top: shade(ROOF, 0.8) });
      // a white arched surround on both faces
      for (const sg of [-1, 1]) {
        box((a + b) / 2, v + sg * (gd / 2 + 0.03), y1 + h - 0.05, y1 + h + 0.35, b - a + 0.3, 0.08, TRIM);
        box((a + b) / 2, v + sg * (gd / 2 + 0.03), y1 + h - 0.45, y1 + h - 0.05, (b - a) * 0.5, 0.08, shade(WALL, 0.92));
      }
      // the passage's floor and ceiling
      S.kind = KIND.PLAIN;
      box((a + b) / 2, v, y1 + h - 0.06, y1 + h, b - a, gd, shade(WALL, 0.45), { bottom: true });
      // guardians: a pair of lime figures inside each entrance, against its side walls
      for (const sg of [-1, 1]) {
        const gu = sg < 0 ? a + 0.3 : b - 0.3;
        for (const dv of [-1.2, 1.2]) {
          cyl(gu, v + dv, y1, y1 + 0.3, 0.32, 0.32, 6, GREY);
          cyl(gu, v + dv, y1 + 0.3, y1 + 1.7, 0.3, 0.24, 6, LIME);
          cyl(gu, v + dv, y1 + 1.7, y1 + 2.05, 0.15, 0.14, 6, hex('#e3c9a6'));
        }
      }
      S.kind = KIND.MASONRY;
    }
    // the lower roof all round, the upper storey and its roof
    S.kind = KIND.TILE;
    const q = P(0, v);
    S.hip(q[0], q[1], gw, gd, ANG, y1 + wh, 1.6, ROOF, { flare: 0.5, over: 0.9, fascia: 0.26, fasciaCol: shade(LAC, 0.7), hips: true, segs: 3 });
    S.kind = KIND.TIMBER;
    const y2 = y1 + wh + 0.6, uh = 2.5;
    box(0, v, y2, y2 + uh, 7.0, 3.4, shade(WALL, 0.96), { top: shade(ROOF, 0.8) });
    S.kind = KIND.PLAIN;
    for (const sg of [-1, 1]) {
      for (const u of [-2.2, 0, 2.2]) box(u, v + sg * 1.72, y2 + 0.6, y2 + 1.9, u === 0 ? 1.2 : 0.8, 0.06, LAC);
      box(0, v + sg * 1.74, y2 + 2.0, y2 + 2.4, 3.0, 0.06, hex('#3a3a3a')); // the board under the eave
    }
    S.kind = KIND.TILE;
    S.hip(q[0], q[1], 7.0, 3.4, ANG, y2 + uh, 2.0, ROOF, { flare: 0.55, over: 1.0, fascia: 0.26, fasciaCol: shade(LAC, 0.7), hips: true, segs: 3, ridgeCol: RIDGE });
    S.kind = KIND.PLAIN;
    // the ridge's centre ornament: a pearl between dragons, read as a small disc on a plinth
    box(0, v, y2 + uh + 2.1, y2 + uh + 2.4, 0.9, 0.3, RIDGE);
    cyl(0, v, y2 + uh + 2.4, y2 + uh + 2.9, 0.25, 0.25, 8, GOLD);
    for (const u of [-1.6, 1.6]) lamp(u, v + gd / 2 + 0.4, y1 + 3.4);
    S.base = 0;
    void n0;
  }

  // ---- the guardian halls inside the gate (six statues in each), on their mapped footprints ----
  for (const rg of GUARD_HALLS) {
    const o = obb(rg);
    S.base = Y - LAND_Y;
    pavilion(S, o.c[0], o.c[1], o.w, o.d, o.a, Y, { tiers: 1, wallH: 3.2, roof: ROOF, wall: WALL, over: 0.8, rh: 2.0, platform: 0.4, ridge: RIDGE, steps: false, segs: 3 });
    S.base = 0;
  }

  // ---- Đại Hùng Bảo Điện: front hall and the double-roofed main hall behind it, on one stone platform ----
  {
    const o = obb(DAIHUNG), lc = L(o.c[0], o.c[1]);
    const w = 29, vF = -72.3, front = 9, main = 16;
    S.base = Y - LAND_Y;
    S.kind = KIND.MASONRY;
    const vc = vF - (front + main) / 2 - 0.6;
    box(lc[0], vc, Y - 0.2, Y + 0.7, w + 2.6, front + main + 2.2, STONE, { topKind: KIND.ROAD });
    S.kind = KIND.ROAD;
    for (let s = 0; s < 4; s++) box(lc[0], vF + 0.5 + 0.34 * (s + 0.5), Y - 0.2, Y + 0.7 - (s + 1) * 0.175, 8, 0.35, shade(STONE, 1.03), { topKind: KIND.ROAD });
    const y1 = Y + 0.7;
    const pf = P(lc[0], vF - 1.4 - front / 2), pm = P(lc[0], vF - 1.4 - front - main / 2);
    pavilion(S, pm[0], pm[1], w - 1, main, ANG, y1, { tiers: 2, wallH: 4.4, roof: ROOF, wall: LAC, over: 1.3, rh: 3.8, ridge: RIDGE, colonnade: true, segs: 4 });
    pavilion(S, pf[0], pf[1], w, front, ANG, y1, { tiers: 1, wallH: 3.6, roof: ROOF, wall: LAC, over: 1.2, rh: 2.6, ridge: RIDGE, colonnade: true, segs: 4 });
    // the ridge ornaments: dragons either side of a dharma wheel on the front roof
    S.kind = KIND.PLAIN;
    const ry = y1 + 3.6 + 2.6 + 0.4;
    cyl(lc[0], vF - 1.4 - front / 2, ry, ry + 0.9, 0.42, 0.42, 10, GOLD);
    for (const sg of [-1, 1]) beam(lc[0] + sg * 1.2, vF - 1.4 - front / 2, ry + 0.1, lc[0] + sg * 3.4, vF - 1.4 - front / 2, ry + 0.5, 0.3, 0.4, shade(RIDGE, 0.9));
    for (const u of [-6, -2, 2, 6]) lamp(lc[0] + u, vF - 0.9, y1 + 3.0);
    // incense urn on the court before it
    S.kind = KIND.PLAIN;
    cyl(lc[0], vF + 5, Y, Y + 0.7, 0.5, 0.4, 8, GREY);
    cyl(lc[0], vF + 5, Y + 0.7, Y + 1.5, 0.75, 0.6, 8, BRONZE);
    S.base = 0;
  }

  // ---- the halls behind: Địa Tạng, Quan Âm, the monks' quarters and the kitchens, on their mapped footprints ----
  for (const rg of HALLS) {
    const o = obb(rg);
    const d = Math.min(o.d, 14), w = o.w;
    S.base = Y - LAND_Y;
    pavilion(S, o.c[0], o.c[1], w, d, o.a, Y, { tiers: 1, wallH: 3.2, roof: ROOF, wall: d > 9 ? LAC : WALL, over: 1.0, rh: Math.min(3.4, d * 0.28), platform: 0.45, ridge: RIDGE, colonnade: d >= 6, steps: false, segs: 3 });
    S.base = 0;
  }

  // ---- the garden's stupa (Thích Đôn Hậu): an octagonal tiered stupa on a stepped base ----
  {
    const [x, z] = STUPA;
    S.base = Y - LAND_Y;
    S.kind = KIND.MASONRY;
    S.cyl(x, z, Y - 0.2, Y + 0.5, 3.0, 2.9, 8, STONE);
    S.cyl(x, z, Y + 0.5, Y + 0.9, 2.3, 2.2, 8, shade(STONE, 1.05));
    let y = Y + 0.9, rr = 1.5;
    for (let i = 0; i < 3; i++) {
      const h = 1.5 - i * 0.25;
      S.cyl(x, z, y, y + h, rr, rr * 0.97, 8, LIME);
      S.kind = KIND.PLAIN;
      S.cyl(x, z, y + h, y + h + 0.2, rr * 1.25, rr * 1.25, 8, GREY);
      S.kind = KIND.MASONRY;
      y += h + 0.2; rr *= 0.8;
    }
    S.kind = KIND.PLAIN;
    S.cyl(x, z, y, y + 1.4, 0.4, 0.05, 8, GOLD);
    S.base = 0;
  }

  S.kind = keep;

  // ---- night: a ring of light under each of the tower's eaves, lanterns on the pillars, the gate and the hall ----
  if (group) {
    const m = new THREE.Mesh(LT.geometry(), lightMaterial(0xffba52, 1.5));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
    const pts = glowPoints(lanPos, lanCol, 6.5);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
  return null;
}
