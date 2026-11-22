import polygonClipping from 'polygon-clipping';
import { KIND, hex, shade, mix, unflat, inRing, rand } from '../../geo/buf.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';
import { gateAxis, rectRing, CITADEL_PASSAGE } from '../../geo/gates.js';

// Kinh thành Huế: the Citadel's rampart (1805-1832), Vauban-style under Gia Long and Minh Mạng.
//
// Sourced (see docs/places/kinhthanh.md): about 10 km round (9,949 m without Trấn Bình Đài), 6.6 m high, about 21 m
// thick; an earth core faced with brick on both sides (inner and outer), the faces bricked from the end of Gia Long's
// reign; 24 bastions, five on each side and four at the corners, each with a powder magazine; embrasures (lỗ châu mai)
// three on each flank and five on each face of a bastion; outside, a 10 m path between the wall foot and a moat
// 22.8 m wide and 4 m deep.
//
// The plan is the mapped wall band (OSM relation 8541343, data.wall[0]): it zigzags round the bastions on both of its
// edges, so each bastion is a hollow arrowhead with the rampart running round it, as at Huế. The moat and the path
// beside it are the mapped water and ground and are left as they are.
//
// What this adds to the plain extruded band that city.js drew before:
//   - a parapet (nữ tường) on the outer edge only, about 1.1 m above the wall walk (estimated), with the
//     embrasures cut through it on the bastions' faces and flanks;
//   - the brick as it reads today: a muted red-brown, streaked dark from the walk down, a dark damp band
//     at the foot, and lighter patches where the brick has been relaid;
//   - a grassed wall walk (trees on it come from the foliage pass: the band is kept out of the landmark cover).
// The gate slots are cut exactly as city.js cuts them, so the gate models still carry the passage through.
export const id = 'kinhthanh';

const PARAPET_H = 1.1; // above the walk (estimate: photos show a chest-high nữ tường on the outer edge)
const PARAPET_T = 1.4; // thickness (estimate)
const EMBRASURE = 0.9; // width of a lỗ châu mai
const SILL = 0.45; // what is left of the parapet under an embrasure

export function build({ data, S, place }) {
  const band = (data.wall || [])[0];
  if (!band) throw new Error('no wall band in data.wall');
  const close = (r) => [...r, r[0]];
  const cityCentre = place ? [place.x, place.z] : [0, 0];

  // the gate slots, as city.js cuts them
  const slots = [];
  for (const g of data.gates || []) {
    if (g.k !== 'citadel') continue;
    const t = gateAxis(g, cityCentre);
    slots.push(rectRing(t.cx, t.cz, t.plen + 14, CITADEL_PASSAGE.slot, t.pa));
  }
  let parts = [band.map(unflat)];
  if (slots.length) {
    try { parts = polygonClipping.difference(parts[0].map(close), ...slots.map((r) => [close(r)])).map((pg) => pg.map((r) => r.slice(0, -1))); } catch { /* keep the wall whole */ }
  }

  const y0 = LAND_Y - 0.5, yW = LAND_Y + WALL_H;
  // Brick colour matched to Google Street View from the Cửa Thượng Tứ bridge (car pano, 2026): in daylight the faces
  // read a warm, muted red-brown with darker blotches, not the near-black grey of PAL.brick. The streaks stay, but
  // fewer and warmer, so the wall still reads weathered.
  const brick = mix(PAL.brick, hex('#8a6a58'), 0.75), dark = hex('#4e443c'), damp = hex('#3e3731'), relaid = hex('#86705f'), lichen = hex('#55553f');
  const walk = PAL.moss;
  const n0 = S.n;
  S.kind = KIND.MASONRY;

  // every edge of the band, whether it faces out (towards the moat), in (towards the city) or is a gate slot's side
  const allRings = parts.flatMap((p) => p);
  const insideBand = (x, z) => parts.some((p) => inRing(x, z, p[0]) && !p.slice(1).some((h) => inRing(x, z, h)));
  const crossings = (ax, az, bx, bz) => {
    let c = 0;
    for (const r of allRings) for (let i = 0; i < r.length; i++) {
      const p = r[i], q = r[(i + 1) % r.length];
      const d1 = (bx - ax) * (p[1] - az) - (bz - az) * (p[0] - ax), d2 = (bx - ax) * (q[1] - az) - (bz - az) * (q[0] - ax);
      if ((d1 > 0) === (d2 > 0)) continue;
      const d3 = (q[0] - p[0]) * (az - p[1]) - (q[1] - p[1]) * (ax - p[0]), d4 = (q[0] - p[0]) * (bz - p[1]) - (q[1] - p[1]) * (bx - p[0]);
      if ((d3 > 0) !== (d4 > 0)) c++;
    }
    return c;
  };
  const onSlot = (x, z) => slots.some((r) => {
    for (let i = 0; i < 4; i++) {
      const a = r[i], b = r[(i + 1) % 4], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
      if (Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z) < 0.4) return true;
    }
    return false;
  });

  for (const rings of parts) {
    // the core: brick faces and the grassed walk, no rim (the parapet is drawn on the outer edge only)
    S.prism(rings[0], y0, yW, brick, walk, { holes: rings.slice(1), topKind: KIND.GROUND });
    for (const r of rings) for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < 1.5) continue;
      const ux = dx / len, uz = dz / len;
      let nx = uz, nz = -ux; // the normal pointing out of the band
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      if (insideBand(mx + nx * 0.6, mz + nz * 0.6)) { nx = -nx; nz = -nz; }
      if (onSlot(mx, mz)) continue; // a gate slot's side: the gate model covers it
      const px = mx + nx * 2, pz = mz + nz * 2;
      const outer = crossings(px, pz, cityCentre[0], cityCentre[1]) > 0;
      const ang = Math.atan2(dz, dx);
      const seed = Math.round(a[0] * 7 + a[1] * 13);

      // the face as it reads today: a damp foot, streaks of lichen and soot from the walk down, relaid patches
      const off = 0.04;
      const face = (s0, s1, h0, h1, col) => {
        const x0 = a[0] + ux * s0 + nx * off, z0 = a[1] + uz * s0 + nz * off, x1 = a[0] + ux * s1 + nx * off, z1 = a[1] + uz * s1 + nz * off;
        S.quad([x0, h0, z0], [x1, h0, z1], [x1, h1, z1], [x0, h1, z0], col, [nx, 0.001, nz]);
      };
      face(0, len, y0, LAND_Y + 0.7 + rand(seed, 1) * 0.5, damp);
      for (let s = rand(seed, 2) * 6; s < len - 1; s += 4 + rand(seed + s, 3) * 7) {
        const w = Math.min(len - s, 1.5 + rand(seed + s, 4) * 4.5), k = rand(seed + s, 5);
        if (k < 0.4) face(s, s + w, LAND_Y + 0.6 + rand(seed + s, 6) * (WALL_H - 2), yW, mix(dark, lichen, rand(seed + s, 7) * 0.7));
        else if (k < 0.65) { const h = LAND_Y + 1.2 + rand(seed + s, 8) * 2.5; face(s, Math.min(len, s + w * 1.5), h, h + 1.2 + rand(seed + s, 9) * 2.4, relaid); }
      }

      if (!outer) continue;
      // the parapet along the outer edge, with the embrasures on the bastions (their faces and flanks are the outer
      // edges shorter than about 120 m; the curtains between them run 130-240 m)
      const cx0 = a[0] - nx * (PARAPET_T / 2), cz0 = a[1] - nz * (PARAPET_T / 2);
      const pcol = shade(brick, 0.96), cap = mix(brick, hex('#b39c88'), 0.55); // lighter, flatter coping as on the real parapet
      const run = (s0, s1, h1) => {
        if (s1 - s0 < 0.05) return;
        const sm = (s0 + s1) / 2;
        S.box(cx0 + ux * sm, cz0 + uz * sm, yW - 0.05, h1, s1 - s0, PARAPET_T, ang, pcol, { top: cap });
      };
      // its outer face carries on the streaks of the wall below
      const k = len < 120 ? (len > 60 ? 5 : 3) : 0;
      const ext = 0.7; // lap the next edge's parapet at the corners
      if (!k) { run(-ext, len + ext, yW + PARAPET_H); continue; }
      const step = len / (k + 1);
      let s = -ext;
      for (let j = 1; j <= k; j++) {
        const e = j * step;
        run(s, e - EMBRASURE / 2, yW + PARAPET_H);
        run(e - EMBRASURE / 2, e + EMBRASURE / 2, yW + SILL);
        s = e + EMBRASURE / 2;
      }
      run(s, len + ext, yW + PARAPET_H);
    }
  }
  S.kind = KIND.PLAIN;
  // the walk is planted ground: keep it out of the landmark cover, as city.js did for the rampart
  (S.noCover = S.noCover || []).push([n0, S.n]);
}
