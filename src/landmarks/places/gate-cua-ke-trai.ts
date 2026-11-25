import { KIND, hex, shade, unflat } from '../../geo/buf.ts';
import { LAND_Y, WALL_H, PAL } from '../../config.ts';
import { pavilion } from '../citadel.ts';

// Cửa Kẻ Trài, formally Đông Bắc môn (東北門), the north-east gate of Kinh thành Huế, on the west bank of the Đông Ba
// river near Mang Cá. Notes and sources: docs/places/gate-cua-ke-trai.md.
//
// The arched passage was built in 1809 under Gia Long, the watch tower (vọng lâu) in 1824 under Minh Mạng, and with
// Đông Ba it was one of the first two Citadel gates to get one. After 1885 the French walled Mang Cá into a post and
// the gate was all but shut; it was opened again to traffic on 30 May 2026.
//
// All ten land gates share one form (tapchidongnama.vn): a brick block through the rampart pierced by one arched
// passage (nguyệt môn) 3.82 m wide and 5.19 m high, closed by two great wooden leaves; over the arch on each face a
// large stone tablet (2.31 × 1.10 m) carved with the gate's name; on top a two-storey tower in the tam quan / cổ lâu
// manner rising more than 9 m above the wall, under tube tiles (ngói ống); more than 17 m in all.
//
// Plan: the OSM outline (way 1568259450, historic=city_gate), 19.4 m along the wall × 18.9 m through it, and the road
// way through it (1568259411, tunnel=building_passage). The block reaches out to both faces of the rampart (as the
// generic gate in citadel.js did) so the slot places/kinhthanh.js cuts for the passage is closed.
// Local frame: s along the wall, t through it, + out of the Citadel (towards the Đông Ba river, east-north-east).
// Cầu Cửa Trài, the 55 m road bridge over the river in front, is drawn by the road and bridge code and left there.
export const id = 'gate:Cửa Kẻ Trài';

const ORIGIN = [-1228.2, -1874.9]; // centre of the OSM outline, metres in the model frame
// Checked against Google satellite (Nov 2026): the passage's ground-level ends and the block sit within ~1.5 m of this
// centre, and the passage bearing (~55° from north, along the Cửa Trài road) within ~2° of WALL_ANGLE. The tower top reads
// 3-5 m north-west of it in the imagery, which is the camera's lean on a 17 m tower, not an offset.
const WALL_ANGLE = -2.2013; // direction of s (along the wall); t = WALL_ANGLE + 90° points out, along the passage
const AXIS_X = Math.cos(WALL_ANGLE);
const AXIS_Z = Math.sin(WALL_ANGLE);
const toWorld = (s, t): [number, number] => [ORIGIN[0] + s * AXIS_X - t * AXIS_Z, ORIGIN[1] + s * AXIS_Z + t * AXIS_X];
const vertex = (s, t, y?) => {
  const pos = toWorld(s, t);
  return [pos[0], y, pos[1]];
};
const normal = (ds, dt, dy = 0): [number, number, number] => [ds * AXIS_X - dt * AXIS_Z, dy, ds * AXIS_Z + dt * AXIS_X];

const BLOCK_LEN = 19.4;
const BLOCK_DEPTH = 18.9; // the block (OSM)
const ARCH = { w: 3.82, h: 5.19 }; // the passage (tapchidongnama.vn)
const TOP_H = WALL_H + 1.0; // the block's flat top, a little above the wall walk (estimate)
const ARCH_SEGS = 10;
// vọng lâu: ridge ~8.5 m over the block top (> 9 m over the wall). On the z20 satellite the lower roof reads about
// 10.4 m along the wall × 8.6 m through it, eaves included, a little smaller than the sibling gates (Nhà Đồ, Thượng Tứ:
// column line about 11.3 × 7.4 m). Column line 9.0 × 7.0 m with 0.8 m eaves gives a 10.6 × 8.6 m roof.
const TOWER = { w: 9.0, d: 7.0, wallH: 3.2, rh: 2.6, over: 0.8 };

const COLORS = {
  brick: hex('#5d5850'), // weathered brick, darkened by damp and lichen like the rampart
  brickLight: hex('#6c665d'),
  damp: hex('#3c3a35'),
  cap: hex('#857a68'), // the block's top reads warm brownish-grey on the satellite
  frame: hex('#a9a293'),
  dark: hex('#1f1a18'),
  tablet: hex('#4a5459'), // đá thanh, bluish-grey stone
  glyph: hex('#d9cfb5'),
  door: hex('#4a2e20'),
  roof: hex('#8e8370'), // tube tiles, read greyish tan on the satellite (glaze weathered off, or unglazed)
  ridge: hex('#b4ab98'),
  lacquer: hex('#7e3524'),
};

function placeBox(S, s, t, y0, y1, sizeS, sizeT, color, opts?) {
  const pos = toWorld(s, t);
  S.box(pos[0], pos[1], y0, y1, sizeS, sizeT, WALL_ANGLE, color, opts);
}

function measureRampartReach(data) {
  // how far the block must reach along t to meet the rampart's faces (the wall band is about 21 m thick)
  const reach = [BLOCK_DEPTH / 2 + 0.4, BLOCK_DEPTH / 2 + 0.4];
  const tx = -AXIS_Z;
  const tz = AXIS_X;
  for (const poly of data.wall || []) {
    for (const ring of poly.map(unflat)) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const edgeX = b[0] - a[0];
        const edgeZ = b[1] - a[1];
        const denom = tx * edgeZ - tz * edgeX;
        if (Math.abs(denom) < 1e-6) continue;
        const qx = a[0] - ORIGIN[0];
        const qz = a[1] - ORIGIN[1];
        const t = (qx * edgeZ - qz * edgeX) / denom;
        const frac = (qx * tz - qz * tx) / denom;
        if (frac < 0 || frac > 1 || Math.abs(t) < BLOCK_DEPTH / 2 - 1.5 || Math.abs(t) > BLOCK_DEPTH / 2 + 6) continue;
        const sideIdx = t < 0 ? 0 : 1;
        reach[sideIdx] = Math.max(reach[sideIdx], Math.abs(t) + 0.12);
      }
    }
  }
  return { t0: -reach[0], t1: reach[1] };
}

function buildGateBlockAndFaces(S, baseY, topY, t0, t1) {
  const midT = (t0 + t1) / 2;
  const depth = t1 - t0;
  const radius = ARCH.w / 2;
  const crownY = baseY + ARCH.h;
  const springY = crownY - radius;
  const arcPt = (k, rad = radius) => {
    const theta = Math.PI - (Math.PI * k) / ARCH_SEGS;
    return [rad * Math.cos(theta), springY + rad * Math.sin(theta)];
  };

  // ---- the block, with the passage driven through it ----
  S.kind = KIND.MASONRY;
  for (const sign of [-1, 1]) placeBox(S, sign * (BLOCK_LEN / 4 + radius / 2), midT, baseY - 0.5, topY, BLOCK_LEN / 2 - radius, depth, COLORS.brick, { top: COLORS.cap, topKind: KIND.ROAD });
  placeBox(S, 0, midT, crownY, topY, ARCH.w + 0.02, depth, COLORS.brick, { top: COLORS.cap, topKind: KIND.ROAD });
  for (const [t, dt] of ([[t0, -1], [t1, 1]] as any[])) {
    for (let k = 0; k < ARCH_SEGS; k++) { // spandrels over the arch on both faces
      const [sa, ya] = arcPt(k);
      const [sb, yb] = arcPt(k + 1);
      S.quad(vertex(sa, t, ya), vertex(sb, t, yb), vertex(sb, t, crownY), vertex(sa, t, crownY), COLORS.brick, normal(0, dt));
    }
  }
  // the vault and the reveals, darker inside
  S.kind = KIND.PLAIN;
  for (let k = 0; k < ARCH_SEGS; k++) {
    const [sa, ya] = arcPt(k);
    const [sb, yb] = arcPt(k + 1);
    S.quad(vertex(sa, t0 + 0.01, ya), vertex(sb, t0 + 0.01, yb), vertex(sb, t1 - 0.01, yb), vertex(sa, t1 - 0.01, ya), shade(COLORS.brick, 0.5), normal(-(sa + sb) / 2, 0, springY - (ya + yb) / 2));
  }
  for (const sign of [-1, 1]) {
    const s = sign * (radius - 0.01);
    S.quad(vertex(s, t0 + 0.6, baseY), vertex(s, t1 - 0.6, baseY), vertex(s, t1 - 0.6, springY), vertex(s, t0 + 0.6, springY), COLORS.dark, normal(-sign, 0));
    for (const [ta, tb] of ([[t0 + 0.01, t0 + 0.6], [t1 - 0.6, t1 - 0.01]] as any[])) {
      S.quad(vertex(s, ta, baseY), vertex(s, tb, baseY), vertex(s, tb, springY), vertex(s, ta, springY), shade(COLORS.brick, 0.7), normal(-sign, 0));
    }
  }
  S.kind = KIND.ROAD;
  S.quad(vertex(-radius, t0 - 0.3, baseY + 0.02), vertex(radius, t0 - 0.3, baseY + 0.02), vertex(radius, t1 + 0.3, baseY + 0.02), vertex(-radius, t1 + 0.3, baseY + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  // the two wooden leaves, standing open against the reveals a third of the way in from the outer face
  const doorT = t1 - depth * 0.33;
  for (const sign of [-1, 1]) placeBox(S, sign * (radius - 0.12), doorT - radius / 2, baseY, springY + 0.6, 0.12, radius * 0.98, COLORS.door);

  // ---- both faces: damp foot, stone surround of the arch, the name tablet, cornice ----
  for (const [t, dt] of ([[t0, -1], [t1, 1]] as any[])) {
    const faceT = t + dt * 0.05;
    for (const sign of [-1, 1]) placeBox(S, sign * (BLOCK_LEN / 4 + radius / 2 + 0.2), faceT, baseY, baseY + 0.9, BLOCK_LEN / 2 - radius - 0.2, 0.08, COLORS.damp);
    for (const sign of [-1, 1]) placeBox(S, sign * (radius + 0.22), t + dt * 0.08, baseY, springY, 0.44, 0.16, COLORS.frame);
    for (let k = 0; k < ARCH_SEGS; k++) {
      const [sa, ya] = arcPt(k, radius + 0.22);
      const [sb, yb] = arcPt(k + 1, radius + 0.22);
      S.beam(vertex(sa, t + dt * 0.08, ya), vertex(sb, t + dt * 0.08, yb), 0.16, 0.44, COLORS.frame);
    }
    // the tablet: a framed slab of đá thanh with the three characters 東北門 standing out in light relief
    const tabletY = crownY + 0.42;
    placeBox(S, 0, t + dt * 0.1, tabletY - 0.25, tabletY + 1.1 + 0.25, 2.31 + 0.5, 0.2, COLORS.frame);
    placeBox(S, 0, t + dt * 0.17, tabletY, tabletY + 1.1, 2.31, 0.12, COLORS.tablet);
    for (const k of [-1, 0, 1]) placeBox(S, k * 0.72, t + dt * 0.23, tabletY + 0.22, tabletY + 0.88, 0.5, 0.04, COLORS.glyph);
    // cornice band under the parapet
    placeBox(S, 0, t + dt * 0.09, topY - 0.45, topY, BLOCK_LEN + 0.1, 0.18, COLORS.brickLight);
  }
}

function buildParapetAndTower(S, topY, t0, t1) {
  const midT = (t0 + t1) / 2;
  const depth = t1 - t0;

  // ---- the parapet on the flat top: brick merlons with embrasures (lỗ châu mai) all round ----
  S.kind = KIND.MASONRY;
  const paraW = BLOCK_LEN + 0.2;
  for (const [len, along, offset] of ([[paraW, true, t0 + 0.25], [paraW, true, t1 - 0.25], [depth, false, -paraW / 2 + 0.25], [depth, false, paraW / 2 - 0.25]] as any[])) {
    const count = Math.max(3, Math.round(len / 1.4) | 1);
    for (let k = 0; k < count; k++) {
      const u = -len / 2 + (len * (k + 0.5)) / count;
      const isMerlon = k % 2 === 0;
      const merlonTop = topY + (isMerlon ? 1.15 : 0.6);
      if (along) placeBox(S, u, offset, topY, merlonTop, len / count, 0.5, COLORS.brickLight, { top: COLORS.cap });
      else placeBox(S, offset, midT + u, topY, merlonTop, 0.5, len / count, COLORS.brickLight, { top: COLORS.cap });
    }
  }

  // ---- the vọng lâu: two storeys under weathered tube tiles, open colonnade below ----
  // (a low stone stylobate first, as at the restored towers of Thượng Tứ and Chánh Tây)
  placeBox(S, 0, midT, topY, topY + 0.35, TOWER.w + 1.4, TOWER.d + 1.4, shade(PAL.stone, 0.85), { topKind: KIND.ROAD });
  pavilion(S, ...toWorld(0, midT), TOWER.w, TOWER.d, WALL_ANGLE, topY + 0.35, {
    tiers: 2,
    wallH: TOWER.wallH,
    roof: COLORS.roof,
    wall: COLORS.lacquer,
    over: TOWER.over,
    rh: TOWER.rh,
    ridge: COLORS.ridge,
    colonnade: true,
    steps: false,
  });
}

export function build({ data, S }) {
  const baseY = LAND_Y;
  const pavedStart = S.n;
  const savedKind = S.kind;
  const { t0, t1 } = measureRampartReach(data);
  const topY = baseY + TOP_H;

  buildGateBlockAndFaces(S, baseY, topY, t0, t1);
  buildParapetAndTower(S, topY, t0, t1);

  // the gate stands on paved ground: keep trees and houses off it
  S.kind = KIND.PLAIN;
  (S.paved = S.paved || []).push([pavedStart, S.n]);
  S.kind = savedKind;
  return null;
}
