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
//   - a battered outer face (0.75 m in over the height, estimated), upright again where it meets a gate;
//   - a projecting brick cordon about 0.75 m below the top of the outer face (seen at Thượng Tứ; size estimated),
//     stopping at the gates;
//   - a parapet (nữ tường) on the outer edge only, about 1.1 m above the wall walk (estimated): plain along the
//     curtains, with the embrasures cut through it on the bastions' faces and flanks only;
//   - the brick as it reads today: a muted red-brown with soft dark streaks running down from under the cordon and
//     faint relaid blotches, all kept off the gate fronts;
//   - a dry-grass strip on the mapped ground between the wall foot and the moat (the berm), short of the water;
//   - a grassed wall walk (trees on it come from the foliage pass: the band is kept out of the landmark cover).
// The gate slots are cut exactly as city.js cuts them, so the gate models still carry the passage through.
export const id = 'kinhthanh';

const PARAPET_H = 1.1; // above the walk (estimate: photos show a chest-high nữ tường on the outer edge)
const PARAPET_T = 1.4; // thickness (estimate)
const EMBRASURE = 0.9; // width of a lỗ châu mai
const SILL = 0.45; // what is left of the parapet under an embrasure
// The outer face from the Thượng Tứ bridge (Google Street View, car pano, 2026): it leans back visibly, and a
// projecting brick cordon runs its whole length about a quarter of the visible height below the parapet's top.
// Sizes are estimates read from that view; no source gives them.
const BATTER = 0.75; // how far the outer foot stands out beyond the top edge (about 1:9)
const BATTER_IN = 0; // the inner face, towards the city, is drawn upright
const CORDON_DROP = 0.75; // the cordon's middle, below the wall walk
const CORDON_H = 0.32;
const CORDON_P = 0.22; // how far it stands proud of the face

export function build({ data, S, place }) {
  const band = (data.wall || [])[0];
  if (!band) throw new Error('no wall band in data.wall');
  const close = (r) => [...r, r[0]];
  const cityCentre = place ? [place.x, place.z] : [0, 0];

  // the gate slots, as city.js cuts them
  const slots = [], gates = [];
  for (const g of data.gates || []) {
    if (g.k !== 'citadel') continue;
    const t = gateAxis(g, cityCentre);
    gates.push(t);
    slots.push(rectRing(t.cx, t.cz, t.plen + 14, CITADEL_PASSAGE.slot, t.pa));
  }
  // the gate buildings are wider than their slot and stand against the wall's face: the batter fades out over 8 m
  // either side of a gate, and the cordon stops at the gate building, so neither runs through its front
  const nearGate = (x, z) => {
    let g = 1;
    for (const t of gates) {
      const dx = x - t.cx, dz = z - t.cz, along = Math.abs(dx * t.px + dz * t.pz), across = Math.abs(dz * t.px - dx * t.pz);
      if (along > t.plen / 2 + 15) continue;
      g = Math.min(g, Math.max(0, Math.min(1, (across - t.pwid / 2 - 1) / 8)));
    }
    return g;
  };
  const underGate = (x, z) => gates.some((t) => {
    const dx = x - t.cx, dz = z - t.cz;
    return Math.abs(dx * t.px + dz * t.pz) < t.plen / 2 + 3 && Math.abs(dz * t.px - dx * t.pz) < t.pwid / 2 + 0.3;
  });
  let parts = [band.map(unflat)];
  if (slots.length) {
    try { parts = polygonClipping.difference(parts[0].map(close), ...slots.map((r) => [close(r)])).map((pg) => pg.map((r) => r.slice(0, -1))); } catch { /* keep the wall whole */ }
  }

  const y0 = LAND_Y - 0.5, yW = LAND_Y + WALL_H;
  // Brick colour matched to Google Street View from the Cửa Thượng Tứ bridge (car pano, 2026): in daylight the faces
  // read a warm, muted red-brown with darker blotches, not the near-black grey of PAL.brick. The streaks stay, but
  // fewer and warmer, so the wall still reads weathered.
  const brick = mix(PAL.brick, hex('#8a6a58'), 0.75), dark = hex('#4e443c'), relaid = hex('#86705f'), lichen = hex('#55553f');
  const pcol = shade(brick, 0.96), cap = mix(brick, hex('#b39c88'), 0.55); // lighter, flatter coping as on the real parapet
  const cordon = mix(brick, hex('#b8a28e'), 0.5), cordonTop = mix(brick, hex('#c4b09c'), 0.6); // its top catches the light
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

  // The straight runs of the mapped band, before the gate slots cut it: a curtain is a run of 120 m or more (130-240 m
  // at Huế), a bastion's face or flank a shorter one. The mapped line has a few extra vertices along some curtains and
  // a gate slot cuts a curtain in two, so an edge is judged by the whole run it lies on, not by its own length.
  const runs = [];
  for (const r of band.map(unflat)) {
    const segs = r.map((p, i) => [p, r[(i + 1) % r.length]]).filter(([p, q]) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.05);
    const dir = ([p, q]) => Math.atan2(q[1] - p[1], q[0] - p[0]);
    const turn = (s, t) => Math.abs(Math.atan2(Math.sin(dir(t) - dir(s)), Math.cos(dir(t) - dir(s))));
    // start where the line turns, so no run is split at the ring's seam
    let st = segs.findIndex((s, i) => turn(segs[(i - 1 + segs.length) % segs.length], s) > 0.14);
    if (st < 0) st = 0;
    let cur = null;
    for (let j = 0; j < segs.length; j++) {
      const s = segs[(st + j) % segs.length];
      if (!cur || turn(cur.segs[cur.segs.length - 1], s) > 0.14) runs.push(cur = { segs: [], len: 0 });
      cur.segs.push(s);
      cur.len += Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]);
    }
  }
  const runLen = (mx, mz, ux, uz) => {
    for (const run of runs) for (const [p, q] of run.segs) {
      const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz);
      if (Math.abs((dx / l) * uz - (dz / l) * ux) > 0.05) continue; // not parallel
      const t = ((mx - p[0]) * dx + (mz - p[1]) * dz) / (l * l);
      if (t < -0.01 || t > 1.01) continue;
      if (Math.abs((mx - p[0]) * (dz / l) - (mz - p[1]) * (dx / l)) < 0.5) return run.len;
    }
    return 0;
  };

  const H = yW - y0;
  // The mapped water's edge near the wall (data.land's boundary), for the grassed berm between the wall foot and the
  // moat: segments within reach of the band, bucketed on a 20 m grid
  const bx0 = Math.min(...allRings.flat().map((p) => p[0])) - 40, bx1 = Math.max(...allRings.flat().map((p) => p[0])) + 40;
  const bz0 = Math.min(...allRings.flat().map((p) => p[1])) - 40, bz1 = Math.max(...allRings.flat().map((p) => p[1])) + 40;
  const CELL = 20, grid = new Map(), key = (i, j) => i * 100003 + j;
  for (const poly of data.land || []) for (const r of poly) for (let i = 0; i + 1 < r.length; i += 2) {
    const j = (i + 2) % r.length, x1 = r[i] / 10, z1 = r[i + 1] / 10, x2 = r[j] / 10, z2 = r[j + 1] / 10;
    if (Math.max(x1, x2) < bx0 || Math.min(x1, x2) > bx1 || Math.max(z1, z2) < bz0 || Math.min(z1, z2) > bz1) continue;
    for (let gi = Math.floor(Math.min(x1, x2) / CELL); gi <= Math.floor(Math.max(x1, x2) / CELL); gi++)
      for (let gj = Math.floor(Math.min(z1, z2) / CELL); gj <= Math.floor(Math.max(z1, z2) / CELL); gj++) {
        const k = key(gi, gj);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push([x1, z1, x2, z2]);
      }
  }
  // how far from (x, z) along (dx, dz) the ground ends at the water, within maxD (Infinity if it does not)
  const toWater = (x, z, dx, dz, maxD) => {
    let best = Infinity;
    const seen = new Set();
    for (let t = 0; t <= maxD + CELL; t += CELL / 2) {
      const k = key(Math.floor((x + dx * Math.min(t, maxD)) / CELL), Math.floor((z + dz * Math.min(t, maxD)) / CELL));
      for (const sg of grid.get(k) || []) {
        if (seen.has(sg)) continue;
        seen.add(sg);
        const ex = sg[2] - sg[0], ez = sg[3] - sg[1], den = dx * ez - dz * ex;
        if (Math.abs(den) < 1e-9) continue;
        const tt = ((sg[0] - x) * ez - (sg[1] - z) * ex) / den, uu = ((sg[0] - x) * dz - (sg[1] - z) * dx) / den;
        if (tt >= 0 && tt <= maxD && uu >= 0 && uu <= 1) best = Math.min(best, tt);
      }
    }
    return best;
  };
  const berm = mix(PAL.moss, hex('#9a9a62'), 0.35); // dry grass, as the berm reads in Street View
  const BERM_W = 6; // how much of the path beside the wall is drawn grassed (the source gives a 10 m path)
  for (const rings of parts) {
    // the core: the grassed walk on top; its vertical sides stand just inside the battered faces drawn below
    S.prism(rings[0], y0, yW, brick, walk, { holes: rings.slice(1), topKind: KIND.GROUND });
    for (const r of rings) {
      // each edge: its normal out of the band, whether it faces the moat, whether it is a gate slot's side
      const E = r.map((a, i) => {
        const b = r[(i + 1) % r.length];
        const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
        if (len < 1e-6) return { a, b, len, ux: 1, uz: 0, nx: 0, nz: 0, outer: false, slot: true, ba: 0, bb: 0 };
        const ux = dx / len, uz = dz / len;
        let nx = uz, nz = -ux;
        const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
        if (insideBand(mx + nx * 0.6, mz + nz * 0.6)) { nx = -nx; nz = -nz; }
        const slot = onSlot(mx, mz);
        const outer = !slot && crossings(mx + nx * 2, mz + nz * 2, cityCentre[0], cityCentre[1]) > 0;
        return { a, b, len, ux, uz, nx, nz, mx, mz, outer, slot, ba: outer ? BATTER * nearGate(a[0], a[1]) : BATTER_IN, bb: outer ? BATTER * nearGate(b[0], b[1]) : BATTER_IN };
      });
      // the foot of each corner, pushed out so that the faces either side keep their batter; where a face meets a gate
      // slot the foot goes straight out from that face and a small end cap closes the wedge, so the slot's side stays
      // upright and the passage clear for the gate model
      const foot = E.map((e, i) => {
        const p = E[(i - 1 + E.length) % E.length];
        if (p.slot || e.slot) {
          const f = p.slot ? e : p;
          const fb = p.slot ? e.ba : p.bb;
          return f.slot ? [e.a[0], e.a[1]] : [e.a[0] + f.nx * fb, e.a[1] + f.nz * fb];
        }
        const det = p.nx * e.nz - p.nz * e.nx;
        let vx, vz;
        const pb = p.bb, eb = e.ba;
        if (Math.abs(det) < 0.05) { vx = e.nx * Math.max(eb, pb); vz = e.nz * Math.max(eb, pb); }
        else { vx = (pb * e.nz - eb * p.nz) / det; vz = (eb * p.nx - pb * e.nx) / det; }
        const l = Math.hypot(vx, vz), cap = 3 * BATTER;
        if (l > cap) { vx *= cap / l; vz *= cap / l; }
        return [e.a[0] + vx, e.a[1] + vz];
      });
      E.forEach((e, i) => {
        if (e.len < 1e-6 || e.slot || !e.ba && !e.bb && !E[(i - 1 + E.length) % E.length].bb && !E[(i + 1) % E.length].ba) return;
        const fa = foot[i], fb = foot[(i + 1) % E.length];
        const nrm = [e.nx * H, Math.max(e.ba, e.bb, 0.001), e.nz * H];
        S.quad([fa[0], y0, fa[1]], [fb[0], y0, fb[1]], [e.b[0], yW, e.b[1]], [e.a[0], yW, e.a[1]], brick, nrm);
        if (!e.outer) return;
        // end caps against a slot
        if (E[(i - 1 + E.length) % E.length].slot) S.tri([e.a[0], yW, e.a[1]], [e.a[0], y0, e.a[1]], [fa[0], y0, fa[1]], brick, [-e.ux, 0, -e.uz]);
        if (E[(i + 1) % E.length].slot) S.tri([e.b[0], yW, e.b[1]], [e.b[0], y0, e.b[1]], [fb[0], y0, fb[1]], brick, [e.ux, 0, e.uz]);
      });

      E.forEach((e, i) => {
        const { a, len, ux, uz, nx, nz, outer } = e;
        if (len < 1.5 || e.slot) return;
        const ang = Math.atan2(uz, ux);
        const seed = Math.round(a[0] * 7 + a[1] * 13);
        const prevSlot = E[(i - 1 + E.length) % E.length].slot, nextSlot = E[(i + 1) % E.length].slot;
        // a patch on the battered face: off the face by `lift`, following its slope
        const face = (s0, s1, h0, h1, col, lift = 0.04) => {
          const P = (s, h) => { const o = lift + (e.ba + (e.bb - e.ba) * (s / len)) * (yW - h) / H; return [a[0] + ux * s + nx * o, h, a[1] + uz * s + nz * o]; };
          S.quad(P(s0, h0), P(s1, h0), P(s1, h1), P(s0, h1), col, [nx * H, Math.max(e.ba, e.bb, 0.001), nz * H]);
        };
        // Weathering as it reads from the Thượng Tứ bridge: soft, irregular darkening that runs down from the top
        // where rain leaves the walk, and a few faint lighter blotches. Each streak is cut into narrow strips of
        // different lengths, so its lower edge is ragged and nothing reads as a doorway or a blocked window.
        const top = outer ? yW - CORDON_DROP - CORDON_H / 2 : yW; // on the outer face the streaks start under the cordon
        for (let s = rand(seed, 2) * 8; s < len - 1; s += 6 + rand(seed + s, 3) * 10) {
          const w = Math.min(len - s, 2 + rand(seed + s, 4) * 6), k = rand(seed + s, 5);
          if (underGate(a[0] + ux * (s + w / 2) + nx * 0.3, a[1] + uz * (s + w / 2) + nz * 0.3)) continue;
          if (k < 0.55) {
            const col = mix(brick, mix(dark, lichen, rand(seed + s, 7) * 0.6), 0.3 + rand(seed + s, 6) * 0.2);
            const deep = 0.25 + rand(seed + s, 8) * 0.5; // how far down the face it runs, as a share of the face
            const n = 3 + Math.floor(rand(seed + s, 9) * 3);
            for (let j = 0; j < n; j++) {
              const s0 = s + (w * j) / n, s1 = s + (w * (j + 1)) / n;
              const taper = 1 - Math.abs((j + 0.5) / n - 0.5) * 1.2; // longest in the middle
              const h0 = Math.max(LAND_Y + 0.3, top - (top - LAND_Y) * deep * (0.45 + 0.55 * taper) * (0.75 + rand(seed + s, 20 + j) * 0.5));
              face(s0, s1, h0, top, col);
            }
          } else if (k < 0.7) {
            // a faint blotch of lighter, relaid brick: a cluster of offset pieces, low contrast
            const col = mix(brick, relaid, 0.45);
            const hc = LAND_Y + 1.5 + rand(seed + s, 10) * (top - LAND_Y - 3);
            for (let j = 0; j < 3; j++) {
              const s0 = s + rand(seed + s, 30 + j) * w * 0.5, ww = w * (0.3 + rand(seed + s, 40 + j) * 0.4);
              const hh = 0.5 + rand(seed + s, 50 + j) * 1.1, dh = (rand(seed + s, 60 + j) - 0.5) * 1.2;
              face(s0, Math.min(len, s0 + ww), hc + dh - hh / 2, hc + dh + hh / 2, col, 0.05 + j * 0.006);
            }
          }
        }

        if (!outer) return;
        // the berm: a grassed strip on the mapped ground between the wall foot and the moat's edge, stopping short of
        // the water, the gate bridges and the gates (Street View from the Thượng Tứ bridge shows grass from the foot
        // to the revetment)
        S.kind = KIND.GROUND;
        for (let sb = 0; sb < len - 0.5; sb += 3) {
          const se = Math.min(len, sb + 3), sm = (sb + se) / 2, bt = e.ba + (e.bb - e.ba) * (sm / len) + 0.05;
          const fx = a[0] + ux * sm + nx * bt, fz = a[1] + uz * sm + nz * bt;
          if (nearGate(fx, fz) < 1 || underGate(fx, fz)) continue;
          const w = Math.min(BERM_W, toWater(fx, fz, nx, nz, BERM_W + 2) - 1.2);
          if (w < 1) continue;
          const o0 = e.ba + (e.bb - e.ba) * (sb / len) + 0.05, o1 = e.ba + (e.bb - e.ba) * (se / len) + 0.05, yb = LAND_Y + 0.03;
          const Q = (sv, o) => [a[0] + ux * sv + nx * o, yb, a[1] + uz * sv + nz * o];
          S.quad(Q(sb, o0), Q(se, o1), Q(se, o1 + w), Q(sb, o0 + w), berm, [0, 1, 0]);
        }
        S.kind = KIND.MASONRY;
        // the cordon: a rounded brick band standing proud of the face all along the outer edge, about a quarter of the
        // visible height below the parapet's top (Street View, Thượng Tứ bridge)
        const lap = (sl) => (sl ? 0 : CORDON_P + 0.1);
        const s0c = -lap(prevSlot), s1c = len + lap(nextSlot), yc = yW - CORDON_DROP, cd = CORDON_P + 0.3;
        const at = (sv) => [a[0] + ux * sv + nx * 0.3, a[1] + uz * sv + nz * 0.3];
        const spans = [];
        const nS = Math.max(1, Math.ceil((s1c - s0c) / 0.5));
        let open = null;
        for (let j = 0; j <= nS; j++) {
          const sv = s0c + ((s1c - s0c) * j) / nS, free = !underGate(...at(sv));
          if (free && open === null) open = sv;
          if ((!free || j === nS) && open !== null) { if (sv - open > 0.3) spans.push([open, sv]); open = null; }
        }
        for (const [p0, p1] of spans) {
          const mc = (p0 + p1) / 2, oc = (e.ba + (e.bb - e.ba) * Math.max(0, Math.min(1, mc / len))) * (yW - yc) / H; // the face's offset there
          S.box(a[0] + ux * mc + nx * (oc + CORDON_P - cd / 2), a[1] + uz * mc + nz * (oc + CORDON_P - cd / 2),
            yc - CORDON_H / 2, yc + CORDON_H / 2, p1 - p0, cd, ang, cordon, { top: cordonTop });
          face(Math.max(0, p0), Math.min(len, p1), yc - CORDON_H / 2 - 0.3, yc - CORDON_H / 2, mix(brick, dark, 0.45), 0.07); // its shadow
        }

        // the parapet along the outer edge: plain on the curtains; the embrasures are on the bastions (five on a face,
        // three on a flank)
        const cx0 = a[0] - nx * (PARAPET_T / 2), cz0 = a[1] - nz * (PARAPET_T / 2);
        const run = (s0, s1, h1) => {
          if (s1 - s0 < 0.05) return;
          const sm = (s0 + s1) / 2;
          S.box(cx0 + ux * sm, cz0 + uz * sm, yW - 0.05, h1, s1 - s0, PARAPET_T, ang, pcol, { top: cap });
        };
        const rl = runLen(e.mx, e.mz, ux, uz) || len;
        const k = rl < 120 ? (rl > 60 ? 5 : 3) : 0;
        const s0 = prevSlot ? 0 : -0.7, s1 = nextSlot ? len : len + 0.7; // lap the next edge's parapet at the corners
        if (!k) {
          // a curtain: plain, its top worn a little uneven in long stretches
          let s = s0;
          while (s < s1) {
            const l = Math.min(s1 - s, 8 + rand(seed + s, 70) * 14);
            run(s, s + l, yW + PARAPET_H - rand(seed + s, 71) * 0.12);
            s += l;
          }
          return;
        }
        const step = len / (k + 1);
        let s = s0;
        for (let j = 1; j <= k; j++) {
          const m = j * step;
          run(s, m - EMBRASURE / 2, yW + PARAPET_H);
          run(m - EMBRASURE / 2, m + EMBRASURE / 2, yW + SILL);
          s = m + EMBRASURE / 2;
        }
        run(s, s1, yW + PARAPET_H);
      });
    }
  }
  S.kind = KIND.PLAIN;
  // the walk is planted ground: keep it out of the landmark cover, as city.js did for the rampart
  (S.noCover = S.noCover || []).push([n0, S.n]);
}
