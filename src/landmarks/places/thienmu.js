import { Buf, KIND, hex, shade, mix, obb, unflat, signedArea, inRing, rand } from '../../geo/buf.js';
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
// how far from the place point this builder reads data.trees (build-data.mjs keeps those records in hue.json)
export const dataReach = 120;

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
const SIDE_GATES = [[-4663.9, 1750.5], [-4738.6, 1767.1]]; // OSM's two unnamed gates (data.gates): the cross path's line
// the small gate in the east wall onto the lane, seen in Google Street View from the lane (car panorama at 16.452823,
// 107.545376, looking 214 deg): bearing about 202 deg from it, where that line meets the court's edge. Not mapped in OSM.
const SVB = { at: [-4641.8, 1777.2], bearing: 202 };
// the brow on the west: the court is level east of this line (local u, v); west of it the hill falls to Văn Thánh road
// (5-9.7 m below the court on the elevation data). Drawn clear of the west hexagonal house, the west stele house, the
// west guardian hall and the halls behind, and through the west side gate's line.
const WEST_BROW = [[-48, -75], [-20, 13]];
const STONE = PAL.stone, BRICK = hex('#b8897a'), EAVE = hex('#5b5352'), TRIM = hex('#e9dfcd'), DARK = hex('#2b2422');
// ROOF: weathered grey-brown tile, as the halls read from above (Google satellite) and in a courtyard photo, rather than
// the city's new terracotta
const ROOF = hex('#80594b'), WALL = PAL.templeWall, LAC = PAL.lacquer, RIDGE = hex('#d8c9a0'), GOLD = hex('#d9c27a');
const LIME = hex('#d9d2c2'), GREY = hex('#8d8a84'), BRONZE = hex('#5d5a43'), PAVE = hex('#b49a80');
const LANTERN = [1.0, 0.72, 0.34];
// the outer wall and the terrace face under it: rough grey-brown rubble under a flat stone coping (Street View, east
// lane); the red of the gate's doors and plaque
const RUBBLE = hex('#8d8576'), COPING = hex('#a19d92');
// the halls: cream-ochre render under the grey-brown tiles, dark timber doors (a courtyard photosphere in Google Maps
// and the photo notes), not the city's red lacquer
const HALL = hex('#d3bd8c');

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

  // ---- the ground: the walled court one level on the hill top, and planted banks where the hill falls away ----
  // Google car Street View (captured 2026) shows no retaining wall on the hill: on Văn Thánh road (west, svA) a wooded
  // earth bank rises from a low rubble wall at the road; at the front-east corner (svD) a low stone embankment at the
  // road shoulder and a tree-covered slope; on the east lane (svB) a grass bank with the precinct wall standing on top
  // of it, about 2 m high and level. The elevation data puts the court 9.7 m above the riverside road, so the court is
  // one level only inside a brow line, and from there the ground slopes (0.9 in 1) down to the roads: inside the
  // mapped precinct on the west and the front, where the road runs at its edge, and on the strip between the wall and
  // the lane on the east, where there is room. The precinct wall stands on the brow and on the mapped east side.
  const SW = 4.2, NV = 13.0; // the stair's half width and where it leaves the court
  const SLOPE = 0.9;
  const loc = hkRing.map((p) => L(p[0], p[1]));
  // a half plane a*u + b*v <= c (local), the line through p and q, the side holding s; a, b a unit normal
  const half = (p, q, s) => {
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    let a = -(q[1] - p[1]) / l, b = (q[0] - p[0]) / l, c = a * p[0] + b * p[1];
    if (a * s[0] + b * s[1] > c) { a = -a; b = -b; c = -c; }
    return [a, b, c];
  };
  const neg = ([a, b, c]) => [-a, -b, -c];
  const HW = half(...WEST_BROW, [0, 0]), HF = [0, 1, NV];
  const fOut = (h, u, v) => h[0] * u + h[1] * v - h[2]; // metres outside a brow line
  const level = clip(clip(loc, ...HW), ...HF);
  const segDist = (u, v, a, b) => {
    const ex = b[0] - a[0], ev = b[1] - a[1], l2 = ex * ex + ev * ev || 1;
    const t = Math.max(0, Math.min(1, ((u - a[0]) * ex + (v - a[1]) * ev) / l2));
    return Math.hypot(a[0] + ex * t - u, a[1] + ev * t - v);
  };
  const dLevel = (u, v) => { let d = Infinity; for (let i = 0; i < level.length; i++) d = Math.min(d, segDist(u, v, level[i], level[(i + 1) % level.length])); return d; };
  const ground = (u, v) => LAND_Y + rise(...P(u, v));
  const bankY = (u, v) => Math.max(Y - SLOPE * dLevel(u, v), ground(u, v) + 0.15);
  const onStreet = streetTest(data, P(0, -60), 260);
  const ccwRing = signedArea(hkRing) > 0;
  const outN = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return ccwRing ? [dz / l, -dx / l] : [-dz / l, dx / l]; }; // world, outward

  // the east strip: the mapped ring's edges along the lane (u > 12, from the front corner to the side gate's end) with
  // the strip of hill between them and the lane, as far as the lane's kerb or until the bank meets the ground
  const apron = [];
  {
    const isE = (i) => { const a = loc[i], b = loc[(i + 1) % loc.length], mu = (a[0] + b[0]) / 2, mv = (a[1] + b[1]) / 2; return mu > 12 && mv > -80 && mv < 22; };
    let i0 = -1;
    for (let i = 0; i < loc.length; i++) if (isE(i) && !isE((i - 1 + loc.length) % loc.length)) { i0 = i; break; }
    if (i0 >= 0) {
      const chain = [];
      for (let i = i0; isE(i % loc.length) && chain.length < loc.length; i++) chain.push(i % loc.length);
      const vs = [...chain, (chain[chain.length - 1] + 1) % loc.length];
      const out = [];
      vs.forEach((vi, k) => {
        const p = hkRing[vi];
        if (k === 0 || k === vs.length - 1) { out.push(p); return; } // tapered to nothing at both ends
        const n1 = outN(hkRing[vs[k - 1]], p), n2 = outN(p, hkRing[vs[k + 1]]);
        let nx = n1[0] + n2[0], nz = n1[1] + n2[1];
        const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
        let w = 0;
        for (let t = 0.5; t <= 14; t += 0.5) {
          const x = p[0] + nx * t, z = p[1] + nz * t;
          if (onStreet(x, z, 0.6)) break;
          w = t;
          if (Y - SLOPE * t < LAND_Y + rise(x, z) + 0.15) break; // the bank has met the ground
        }
        out.push([p[0] + nx * w, p[1] + nz * w]);
      });
      apron.push({ ring: vs.map((vi) => loc[vi]), outer: out.map((p) => L(...p)), edges: new Set(chain) });
    }
  }
  const apronRing = apron.length ? [...apron[0].ring, ...apron[0].outer.slice().reverse()] : [];

  // the court: one level, its faces hidden behind the banks or the wall
  S.base = Y - LAND_Y;
  {
    const n0 = S.n;
    S.kind = KIND.PLAIN;
    S.prism(level.map(([u, v]) => P(u, v)), LAND_Y - 0.6, Y, shade(RUBBLE, 0.8), hex(PAL.green.sacred), { topKind: KIND.GROUND });
    (S.noCover = S.noCover || []).push([n0, S.n]); // ground: the garden trees stand on it
  }
  // the banks: a height field on a 2 m grid, each cell cut to the piece it lies in
  const pieces = [clip(loc, ...neg(HW))];
  { const fr = clip(clip(loc, ...HW), ...neg(HF)); pieces.push(clip(fr, 1, 0, -SW - 0.6), clip(fr, -1, 0, -SW - 0.6)); }
  if (apronRing.length) pieces.push(apronRing);
  const inPiece = (u, v) => pieces.some((pc) => pc.length > 2 && inRing(u, v, pc));
  {
    const n0 = S.n, grass = hex(PAL.green.grass), CELL = 2;
    S.kind = KIND.GROUND;
    for (const pc of pieces) {
      if (pc.length < 3) continue;
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const [u, v] of pc) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      for (let cu = Math.floor(u0 / CELL) * CELL; cu < u1; cu += CELL) for (let cv = Math.floor(v0 / CELL) * CELL; cv < v1; cv += CELL) {
        let poly = clip(clip(clip(clip(pc, 1, 0, cu + CELL), -1, 0, -cu), 0, 1, cv + CELL), 0, -1, -cv);
        poly = poly.filter((p, i) => { const q = poly[(i + 1) % poly.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]) > 1e-3; });
        if (poly.length < 3 || Math.abs(signedArea(poly)) < 0.01) continue;
        const hs = poly.map(([u, v]) => bankY(u, v));
        S.base = hs.reduce((s, h) => s + h, 0) / hs.length - LAND_Y;
        const tone = 0.86 + 0.12 * rand(Math.round(cu * 7 + cv * 131) & 0xffff, 7);
        const faces = THREE.ShapeUtils.triangulateShape(poly.map(([u, v]) => new THREE.Vector2(u, v)), []);
        const W = poly.map(([u, v], i) => { const q = P(u, v); return [q[0], hs[i], q[1]]; });
        for (const f of faces) S.tri(W[f[0]], W[f[1]], W[f[2]], shade(grass, tone), [0, 1, 0]);
      }
    }
    S.noCover.push([n0, S.n]);
  }

  // random rubble: small irregular stones, each its own tone, the upper courses greener with moss, laid on a wall face
  // from (s0, y0) to (s1, y1) along a line in world coordinates (a: start, t: along, n: outward normal)
  const MOSS = hex('#6f7358');
  let stoneSeed = 1;
  const rubble = (a, t, n, s0, s1, y0, y1) => {
    S.kind = KIND.PLAIN;
    const seed = (stoneSeed += 977);
    for (let y = y0, row = 0; y < y1 - 0.06; row++) {
      const h = Math.min(y1 - y, 0.2 + 0.2 * rand(seed + row, 1));
      for (let s = s0 - 0.3 * rand(seed + row, 2), k = 0; s < s1; k++) {
        const r = seed + row * 61 + k, w = 0.28 + 0.45 * rand(r, 3);
        const p0 = Math.max(s0, s + 0.03), p1 = Math.min(s1, s + w - 0.03);
        if (p1 - p0 > 0.06) {
          const off = 0.015 + 0.025 * rand(r, 4), ya = y + 0.03 + 0.03 * rand(r, 5), yb = y + h - 0.03 - 0.04 * rand(r, 6);
          const up = Math.max(0, Math.min(1, (yb - y0) / Math.max(0.5, y1 - y0)));
          const col = mix(shade(RUBBLE, 0.72 + 0.45 * rand(r, 8)), shade(MOSS, 0.8 + 0.3 * rand(r, 9)), up * up * 0.7 * rand(r, 10));
          const q = (s, yy) => [a[0] + t[0] * s + n[0] * off, yy, a[1] + t[1] * s + n[1] * off];
          S.quad(q(p0, ya), q(p1, ya), q(p1, yb), q(p0, yb), col, [n[0], 0, n[1]]);
        }
        s += w;
      }
      y += h;
    }
  };
  // a rough coping of uneven slabs, damp and mossy
  const coping = (a, t, n, s0, s1, inset, th, top) => {
    S.kind = KIND.PLAIN;
    const ang = Math.atan2(t[1], t[0]);
    for (let s = s0, k = 0; s < s1 - 0.05; k++) {
      const r = (stoneSeed += 13), w = Math.min(s1 - s, 0.6 + 0.6 * rand(r, 1)), m = s + w / 2;
      const x = a[0] + t[0] * m - n[0] * inset, z = a[1] + t[1] * m - n[1] * inset;
      S.box(x, z, top, top + 0.1 + 0.1 * rand(r, 2), w + 0.02, th + 0.12 + 0.06 * rand(r, 3), ang, mix(shade(COPING, 0.8 + 0.25 * rand(r, 4)), MOSS, 0.45 * rand(r, 5)));
      s += w;
    }
  };
  // one stretch of rubble wall: body, stones on the outer face (down to the ground outside) and a coping
  const wall = (a, t, n, s0, s1, foot, base, top, th) => {
    const m = (s0 + s1) / 2, inset = th / 2 + 0.02, ang = Math.atan2(t[1], t[0]);
    S.kind = KIND.PLAIN;
    S.box(a[0] + t[0] * m - n[0] * inset, a[1] + t[1] * m - n[1] * inset, base, top, s1 - s0, th, ang, shade(RUBBLE, 0.78));
    rubble(a, t, n, s0, s1, foot, top);
    coping(a, t, n, s0, s1, inset, th, top);
  };

  // the gates: a low, wide block of weathered render, one round arch closed by a timber lattice, couplet panels on the
  // pilasters, a plaque frieze over the arch and a flat cornice (svB, the east gate; the side gates drawn the same way:
  // no photograph shows them)
  const RENDER = hex('#a9a395'), GRILLE = hex('#3b2d23');
  const GATE_W = 3.6;
  const gateAt = (g, t, n) => { // g: centre on the wall's outer line (world), t along, n outward
    const ang = Math.atan2(t[1], t[0]), D = 0.9, H = 3.1, ow = 1.8, r = ow / 2, spring = Y + 1.7;
    const at = (s, o) => [g[0] + t[0] * s - n[0] * (D / 2 + 0.02 - o), g[1] + t[1] * s - n[1] * (D / 2 + 0.02 - o)];
    const bx = (s, o, ya, yb, w, d, col) => { const q = at(s, o); S.box(q[0], q[1], ya, yb, w, d, ang, col); };
    const pw = (GATE_W - ow) / 2;
    S.kind = KIND.PLAIN;
    for (const sg of [-1, 1]) bx(sg * (ow / 2 + pw / 2), 0, Y - 0.3, Y + H, pw, D, RENDER);
    const halfAt = (y) => (y <= spring ? r : Math.sqrt(Math.max(0, r * r - (y - spring) ** 2)));
    for (let k = 0; k < 6; k++) {
      const ya = spring + (r * k) / 6, yb = spring + (r * (k + 1)) / 6, hw = halfAt((ya + yb) / 2);
      for (const sg of [-1, 1]) bx(sg * (hw + (r - hw) / 2), 0, ya, yb, r - hw + 0.01, D, RENDER);
      bx(0, 0, ya, yb, hw * 2, 0.06, GRILLE);
    }
    bx(0, 0, spring + r, Y + H, ow, D, RENDER);
    bx(0, 0, Y, spring, ow, 0.06, GRILLE);
    // the lattice: thin bars proud of the panel on both faces
    const BAR = shade(GRILLE, 1.7);
    for (const u of [-0.6, -0.3, 0, 0.3, 0.6]) bx(u, 0, Y + 0.05, spring + Math.sqrt(r * r - u * u) - 0.04, 0.05, 0.12, BAR);
    for (let y = Y + 0.3; y < spring + r - 0.1; y += 0.34) bx(0, 0, y, y + 0.05, halfAt(y + 0.025) * 2 - 0.04, 0.12, BAR);
    // couplet panels, the plaque frieze, the cornice
    for (const o of [-1, 1]) {
      for (const sg of [-1, 1]) bx(sg * (ow / 2 + pw / 2), o * (D / 2 + 0.012), Y + 0.45, Y + 2.15, 0.4, 0.03, shade(RENDER, 0.78));
      bx(0, o * (D / 2 + 0.012), spring + r + 0.08, Y + H - 0.08, 1.5, 0.03, shade(RENDER, 0.7));
    }
    bx(0, 0, Y + H, Y + H + 0.12, GATE_W + 0.3, D + 0.3, shade(RENDER, 0.92));
    bx(0, 0, Y + H + 0.12, Y + H + 0.22, GATE_W + 0.1, D + 0.12, shade(RENDER, 0.84));
  };

  // ---- the precinct wall on the court's edge; a low balustrade along the front brow ----
  // East lane (svF, svB): random rubble of small stones under a rough mossy coping. Where the lane runs at the wall's
  // foot (north of the side gate) the wall is sized from the ground outside it, as before: its top 2.9 m above that
  // ground, kept between 0.9 and 2.3 m above the court. On the brow and over the east bank it stands 2 m, level.
  const gatePts = [];
  {
    const ccw = signedArea(level.map(([u, v]) => P(u, v))) > 0;
    const gl = [L(...SIDE_GATES[0]), L(...SIDE_GATES[1])];
    const gd = [gl[1][0] - gl[0][0], gl[1][1] - gl[0][1]];
    const topAt = (x, z) => Math.min(Y + 2.3, Math.max(Y + 0.9, LAND_Y + rise(x, z) + 2.9));
    const onApron = (la, lb) => apron.length && apron[0].ring.some((p, i, r) => i + 1 < r.length && segDist((la[0] + lb[0]) / 2, (la[1] + lb[1]) / 2, p, r[i + 1]) < 0.05);
    // the east gate: where the car panorama's sight line (SVB) first meets the court's edge
    const sv = L(...SVB.at), sd = [Math.sin(SVB.bearing * Math.PI / 180), -Math.cos(SVB.bearing * Math.PI / 180)];
    const sdl = [sd[0] * UX + sd[1] * UZ, -sd[0] * UZ + sd[1] * UX];
    let east = null;
    level.forEach((la, i) => {
      const lb = level[(i + 1) % level.length], ex = lb[0] - la[0], ev = lb[1] - la[1];
      const den = sdl[0] * ev - sdl[1] * ex;
      if (Math.abs(den) < 1e-9) return;
      const wx = la[0] - sv[0], wv = la[1] - sv[1];
      const tt = (wx * ev - wv * ex) / den, ss = (wx * sdl[1] - wv * sdl[0]) / den;
      if (tt > 0 && ss > 0 && ss < 1 && (!east || tt < east.tt)) east = { i, tt, ss };
    });
    for (let i = 0; i < level.length; i++) {
      const la = level[i], lb = level[(i + 1) % level.length];
      const a = P(...la), b = P(...lb);
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < 0.3) continue;
      const t = [dx / len, dz / len], n = ccw ? [t[1], -t[0]] : [-t[1], t[0]]; // outward
      const front = Math.abs(la[1] - NV) < 0.05 && Math.abs(lb[1] - NV) < 0.05;
      const brow = Math.abs(fOut(HW, ...la)) < 0.05 && Math.abs(fOut(HW, ...lb)) < 0.05;
      const level2 = brow || onApron(la, lb);
      const segs = [[0, len]];
      const cut = (s0, s1) => { for (let k = segs.length - 1; k >= 0; k--) { const [p0, p1] = segs[k]; if (s1 <= p0 || s0 >= p1) continue; segs.splice(k, 1, ...[[p0, s0], [s1, p1]].filter(([q0, q1]) => q1 - q0 > 0.2)); } };
      const gates = [];
      if (front) {
        // the stair, and the four pillars at its head
        const s = (u) => ((u - la[0]) / (lb[0] - la[0])) * len;
        cut(Math.min(s(-SW), s(SW)), Math.max(s(-SW), s(SW)));
        for (const u of [-7.4, 7.4]) cut(s(u) - 0.8, s(u) + 0.8);
      } else {
        const ex = lb[0] - la[0], ev = lb[1] - la[1], den = ex * gd[1] - ev * gd[0];
        if (Math.abs(den) > 1e-6) {
          const tt = ((gl[0][0] - la[0]) * gd[1] - (gl[0][1] - la[1]) * gd[0]) / den;
          if (tt > 0 && tt < 1) gates.push(tt * len);
        }
        if (east && east.i === i) gates.push(east.ss * len);
        for (const s of gates) cut(s - GATE_W / 2 + 0.05, s + GATE_W / 2 - 0.05);
      }
      for (const [s0, s1] of segs) {
        if (front) {
          const h = 0.95, th = 0.35, m = (s0 + s1) / 2, l = s1 - s0, ang = Math.atan2(t[1], t[0]);
          const x = a[0] + t[0] * m - n[0] * th / 2, z = a[1] + t[1] * m - n[1] * th / 2;
          S.kind = KIND.MASONRY;
          S.box(x, z, Y - 0.3, Y + h, l, th, ang, LIME);
          S.kind = KIND.PLAIN;
          S.box(x, z, Y + h, Y + h + 0.14, l, th + 0.2, ang, GREY);
          for (let s = s0 + 2.4; s < s1 - 0.6; s += 2.4) S.box(a[0] + t[0] * s - n[0] * th / 2, a[1] + t[1] * s - n[1] * th / 2, Y, Y + h + 0.3, 0.45, 0.45, ang, LIME);
          continue;
        }
        // in stretches of at most 8 m, each as high as the ground outside it asks
        const k8 = Math.max(1, Math.ceil((s1 - s0) / 8));
        for (let k = 0; k < k8; k++) {
          const p0 = s0 + ((s1 - s0) * k) / k8, p1 = s0 + ((s1 - s0) * (k + 1)) / k8, m = (p0 + p1) / 2;
          const ox = a[0] + t[0] * m + n[0] * 2, oz = a[1] + t[1] * m + n[1] * 2;
          const top = level2 ? Y + 2.0 : topAt(ox, oz);
          const foot = level2 ? Y - 0.3 : Math.min(Y - 0.3, LAND_Y + rise(ox, oz) - 0.3);
          wall(a, t, n, p0 - (k === 0 ? 0.1 : 0), p1 + (k === k8 - 1 ? 0.1 : 0), foot, Y - 0.3, top, 0.55);
        }
      }
      for (const s of gates) {
        const g = [a[0] + t[0] * s, a[1] + t[1] * s];
        gateAt(g, t, n);
        gatePts.push(L(...g));
      }
    }
  }

  // ---- the low walls at the roads: along the mapped edge where a bank runs down to it, and along the east strip ----
  {
    const roadWall = (pa, pb, out, kerb = false) => { // local points; out: outward normal sign check done by the caller (world n)
      const a = P(...pa), b = P(...pb), dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < 0.3) return;
      const t = [dx / len, dz / len], n = out(a, b);
      const k3 = Math.max(1, Math.ceil(len / 3));
      for (let k = 0; k < k3; k++) {
        const s0 = (len * k) / k3, s1 = (len * (k + 1)) / k3, m = (s0 + s1) / 2;
        const lm = [pa[0] + (pb[0] - pa[0]) * (m / len), pa[1] + (pb[1] - pa[1]) * (m / len)];
        const g = LAND_Y + rise(a[0] + t[0] * m + n[0] * 1.5, a[1] + t[1] * m + n[1] * 1.5);
        const top = kerb ? Math.max(bankY(...lm) + 0.05, g + 0.25) : Math.max(bankY(...lm) + 0.45, g + 0.8);
        wall(a, t, n, s0 - (k === 0 ? 0.05 : 0), s1 + (k === k3 - 1 ? 0.05 : 0), g - 0.3, g - 0.3, top, 0.5);
      }
    };
    const ringOut = (a, b) => outN(a, b);
    for (let i = 0; i < loc.length; i++) {
      if (apron.length && apron[0].edges.has(i)) continue;
      const la = loc[i], lb = loc[(i + 1) % loc.length];
      // the part of this edge outside the court: outside the brow line or in front of the front brow
      const iv = [];
      for (const h of [HW, HF]) {
        const fa = fOut(h, ...la), fb = fOut(h, ...lb);
        if (fa <= 0 && fb <= 0) continue;
        if (fa > 0 && fb > 0) { iv.push([0, 1]); continue; }
        const tc = fa / (fa - fb);
        iv.push(fa > 0 ? [0, tc] : [tc, 1]);
      }
      if (!iv.length) continue;
      iv.sort((p, q) => p[0] - q[0]);
      const merged = [iv[0].slice()];
      for (const [p0, p1] of iv.slice(1)) { const lst = merged[merged.length - 1]; if (p0 <= lst[1]) lst[1] = Math.max(lst[1], p1); else merged.push([p0, p1]); }
      const at = (tt) => [la[0] + (lb[0] - la[0]) * tt, la[1] + (lb[1] - la[1]) * tt];
      for (const [p0, p1] of merged) {
        // not across the stair
        const A = at(p0), B = at(p1);
        if (A[1] > NV - 0.1 && B[1] > NV - 0.1 && Math.max(A[0], B[0]) > -SW - 0.6 && Math.min(A[0], B[0]) < SW + 0.6) {
          const sAt = (u) => (u - A[0]) / (B[0] - A[0]);
          const c0 = Math.max(0, Math.min(1, Math.min(sAt(-SW - 0.6), sAt(SW + 0.6)))), c1 = Math.max(0, Math.min(1, Math.max(sAt(-SW - 0.6), sAt(SW + 0.6))));
          const lerp = (s) => [A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s];
          if (c0 > 0.01) roadWall(A, lerp(c0), ringOut);
          if (c1 < 0.99) roadWall(lerp(c1), B, ringOut);
          continue;
        }
        roadWall(A, B, ringOut);
      }
    }
    if (apron.length) {
      const o = apron[0].outer;
      // the strip's outer edge runs the same way round as the ring, so the ring's rule gives its outward side; svB shows
      // the grass running down to a stone kerb at the road, not a parapet, so it is only as high as the bank's foot
      for (let k = 0; k + 1 < o.length; k++) roadWall(o[k], o[k + 1], (a, b) => outN(a, b), true);
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
    { // the cross path through the side gates, from gate to gate (the two the wall loop found on the cross line)
      const side = gatePts.filter((g) => Math.abs(g[1] - (L(...SIDE_GATES[0])[1] + L(...SIDE_GATES[1])[1]) / 2) < 15);
      const [a, b] = side.length === 2 ? side : [L(...SIDE_GATES[0]), L(...SIDE_GATES[1])];
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
    S.hip(q[0], q[1], w, w, ANG, y1 + wh, 1.7, ROOF, { flare: 0.45, over: 0.7, fascia: 0.22, fasciaCol: shade(ROOF, 0.7), hips: true, segs: 3, ridgeCol: RIDGE });
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
    S.hip(q[0], q[1], gw, gd, ANG, y1 + wh, 1.6, ROOF, { flare: 0.5, over: 0.9, fascia: 0.26, fasciaCol: shade(ROOF, 0.7), hips: true, segs: 3 });
    S.kind = KIND.TIMBER;
    const y2 = y1 + wh + 0.6, uh = 2.5;
    box(0, v, y2, y2 + uh, 7.0, 3.4, shade(WALL, 0.96), { top: shade(ROOF, 0.8) });
    S.kind = KIND.PLAIN;
    for (const sg of [-1, 1]) {
      for (const u of [-2.2, 0, 2.2]) box(u, v + sg * 1.72, y2 + 0.6, y2 + 1.9, u === 0 ? 1.2 : 0.8, 0.06, LAC);
      box(0, v + sg * 1.74, y2 + 2.0, y2 + 2.4, 3.0, 0.06, hex('#3a3a3a')); // the board under the eave
    }
    S.kind = KIND.TILE;
    S.hip(q[0], q[1], 7.0, 3.4, ANG, y2 + uh, 2.0, ROOF, { flare: 0.55, over: 1.0, fascia: 0.26, fasciaCol: shade(ROOF, 0.7), hips: true, segs: 3, ridgeCol: RIDGE });
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
    pavilion(S, pm[0], pm[1], w - 1, main, ANG, y1, { tiers: 2, wallH: 4.4, roof: ROOF, wall: HALL, over: 1.3, rh: 3.8, ridge: RIDGE, colonnade: true, segs: 4 });
    pavilion(S, pf[0], pf[1], w, front, ANG, y1, { tiers: 1, wallH: 3.6, roof: ROOF, wall: HALL, over: 1.2, rh: 2.6, ridge: RIDGE, colonnade: true, segs: 4 });
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
    pavilion(S, o.c[0], o.c[1], w, d, o.a, Y, { tiers: 1, wallH: 3.2, roof: ROOF, wall: d > 9 ? HALL : WALL, over: 1.0, rh: Math.min(3.4, d * 0.28), platform: 0.45, ridge: RIDGE, colonnade: d >= 6, steps: false, segs: 3 });
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

  // ---- the trees: a canopy over the banks and round the halls, as the satellite and every street view show it ----
  // Off the lawn court, the forecourt, the stair and the cross path; populate() keeps them off the roofs and the paving.
  // Trees stand on the city's ground (rise), so only where the model's ground is within a metre (court) or three (bank).
  if (Array.isArray(data.trees)) {
    const t = data.trees, near = data.meta?.counts?.treesNear;
    // a generated tree on the riverside road's verge, in front of the tower's corner (svD shows none there)
    const verge = streetTest(data, P(20, 30), 40);
    for (let i = t.length / 4 - 1; i >= 0; i--) {
      const x = t[i * 4] / 10, z = t[i * 4 + 1] / 10, [u, v] = L(x, z);
      if (v < 18 || v > 40 || u < 8 || u > 45 || !verge(x, z, 'pavement')) continue;
      t.splice(i * 4, 4);
      if (near != null && i < near) data.meta.counts.treesNear--;
    }
    const cl = [L(...SIDE_GATES[0]), L(...SIDE_GATES[1])];
    const crossD = (u, v) => { const ex = cl[1][0] - cl[0][0], ev = cl[1][1] - cl[0][1]; return Math.abs((u - cl[0][0]) * ev - (v - cl[0][1]) * ex) / Math.hypot(ex, ev); };
    const clear = [[-27, 29, -101, -19], [-15, 15, -21, 13]]; // the lawn court with Đại Hùng; the tower's forecourt
    let k = 0;
    for (let gu = -76; gu <= 62; gu += 5.2) for (let gv = -292; gv <= 34; gv += 5.2) {
      const r = (k++) * 7 + 3;
      const u = gu + (rand(r, 1) - 0.5) * 3.8, v = gv + (rand(r, 2) - 0.5) * 3.8;
      const [x, z] = P(u, v), g = LAND_Y + rise(x, z);
      if (clear.some(([u0, u1, v0, v1]) => u > u0 && u < u1 && v > v0 && v < v1)) continue;
      if (Math.abs(u) < SW + 2 && v > NV - 2) continue;
      if (crossD(u, v) < 3) continue;
      let ok = false;
      if (inRing(u, v, level)) ok = Y - g < 1.0;
      else if (inPiece(u, v)) ok = bankY(u, v) - g < 3.0; // a bank tree's foot under the grass reads as a shorter trunk
      if (!ok || onStreet(x, z, 1.5)) continue;
      const pine = v < -185;
      t.push(Math.round(x * 10), Math.round(z * 10), 10 + Math.floor(rand(r, 3) * 6), pine ? 3 : rand(r, 4) < 0.35 ? 1 : 0);
    }
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
