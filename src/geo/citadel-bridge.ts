import { KIND, hex } from './buf.ts';
import { LAND_Y } from '../config.ts';
import { resample } from './bridges.ts';

// The one bridge of the Kinh thành (issue #19): every bridge inside the walls and over the moat before a gate
// (bridge = 2 in hue.json; its profile from geo/bridges.js, with `vaults`) is drawn as the same small brick bridge.
// After the reference photo in the issue and the Ngự Hà bridges of 1825 (Khánh Ninh, Vĩnh Lợi): weathered dark brick,
// round vaults springing just above the water, each ringed in lime plaster on both faces; a plastered string course
// at deck level; a solid brick parapet with plastered coping and round plaster medallions on its face, square posts
// at the ends. Illustrative: the brick and plaster colours, the parapet height, the medallion spacing.

const BRICK = hex('#6c5e53'), BRICK_D = hex('#584c43'), SOFFIT = hex('#433b35');
const PLASTER = hex('#d6cebb'), PLASTER_D = hex('#bdb4a0');
const PARAPET_H = 0.75, PARAPET_T = 0.3, COPING = 0.1, RING = 0.42, MEDAL_R = 0.2, MEDAL_STEP = 2.4;

// ends: as geo/city.js ribbonPoints (r.ends from geo/joints.js): the street's point just past each end, so the deck's
// end is cut on the same mitred line as the street that meets it, with no wedge of water between them.
export function citadelBridge(B, pts, width, P, road, ends = null) {
  const R = resample(pts, 0.5, P.breaks);
  const n = R.pts.length, h = width / 2;
  // left normal at each sample, mitred so the faces stay parallel round a bend
  const N = R.pts.map((p, i) => {
    const a = R.pts[Math.max(0, i - 1)], b = R.pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return [-dz / l, dx / l];
  });
  // the offset across the deck at each sample: the normal, except at a jointed end, where it runs along the joint
  // line (the mitre between the deck and the street), lengthened to keep the deck's width
  const M = N.map((v) => v);
  for (const [k, i] of [[0, 0], [1, n - 1]]) {
    const e = ends?.[k];
    if (!e || e.dir || n < 2) continue;
    const p = R.pts[i], q = R.pts[k ? i - 1 : 1];
    const u = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
    const d1 = k ? u(q, p) : u(e, p), d2 = k ? u(p, e) : u(p, q);
    let tx = d1[0] + d2[0], tz = d1[1] + d2[1];
    const tl = Math.hypot(tx, tz);
    if (tl < 1e-6) continue;
    tx /= tl; tz /= tl;
    const c = Math.max(0.55, -tz * N[i][0] + tx * N[i][1]);
    M[i] = [-tz / c, tx / c];
  }
  const at = (i, t, y) => [R.pts[i][0] + M[i][0] * t, y, R.pts[i][1] + M[i][1] * t];
  const top = R.s.map((s) => P.y(s));
  const deep = (P.spring ?? LAND_Y - 1.3) - 2.2; // abutments go down into the water (or the ground)
  const bot = R.s.map((s) => (P.bottom ? P.bottom(s) : deep));
  const inVault = (s) => (P.vaults || []).some((v) => s > v.a + 0.01 && s < v.b - 0.01);
  const k0 = B.kind;
  const strip = (t0, t1, y0, y1, col, hint) => { // a band between offsets t0..t1 (across) or heights y0..y1 (functions of i)
    for (let i = 0; i + 1 < n; i++) {
      const j = i + 1;
      B.quad(at(i, t0(i), y0(i)), at(j, t0(j), y0(j)), at(j, t1(j), y1(j)), at(i, t1(i), y1(i)), col, hint(i));
    }
  };
  const side = (sg) => (i) => [N[i][0] * sg, 0, N[i][1] * sg];
  const up = () => [0, 1, 0], down = () => [0, -1, 0];
  const C = (v) => () => v;

  // road between the parapets
  B.kind = KIND.ROAD;
  strip(C(-(h - PARAPET_T)), C(h - PARAPET_T), (i) => top[i], (i) => top[i], road, up);
  B.kind = KIND.MASONRY;
  for (const sg of [-1, 1]) {
    const t = sg * h;
    // spandrel and abutment face, up to the string course
    strip(C(t), C(t), (i) => bot[i], (i) => top[i] - 0.2, BRICK, side(sg));
    // string course: a plaster band standing a little proud
    const tp = sg * (h + 0.05);
    B.kind = KIND.PLAIN;
    strip(C(tp), C(tp), (i) => top[i] - 0.2, (i) => top[i] + 0.02, PLASTER, side(sg));
    strip(C(t), C(tp), (i) => top[i] + 0.02, (i) => top[i] + 0.02, PLASTER, up);
    strip(C(t), C(tp), (i) => top[i] - 0.2, (i) => top[i] - 0.2, PLASTER_D, down);
    B.kind = KIND.MASONRY;
    // parapet: solid brick, outer face over the string course, inner face from the road
    const ti = sg * (h - PARAPET_T);
    strip(C(t), C(t), (i) => top[i] + 0.02, (i) => top[i] + PARAPET_H, BRICK, side(sg));
    strip(C(ti), C(ti), (i) => top[i], (i) => top[i] + PARAPET_H, BRICK_D, side(-sg));
    // coping, plastered, a little wider than the wall
    B.kind = KIND.PLAIN;
    const c0 = sg * (h - PARAPET_T - 0.04), c1 = sg * (h + 0.04), yc = (i) => top[i] + PARAPET_H, yc1 = (i) => top[i] + PARAPET_H + COPING;
    strip(C(c0), C(c1), yc1, yc1, PLASTER, up);
    strip(C(c1), C(c1), yc, yc1, PLASTER, side(sg));
    strip(C(c0), C(c0), yc, yc1, PLASTER, side(-sg));
    // the plaster ring round each vault: a band following the intrados, standing proud of the face
    for (const v of P.vaults || []) {
      const ids = [];
      for (let i = 0; i < n; i++) if (R.s[i] >= v.a - 1e-3 && R.s[i] <= v.b + 1e-3) ids.push(i);
      for (let q = 0; q + 1 < ids.length; q++) {
        const i = ids[q], j = ids[q + 1];
        const ri = Math.min(RING, top[i] - 0.22 - bot[i]), rj = Math.min(RING, top[j] - 0.22 - bot[j]);
        if (ri <= 0.02 && rj <= 0.02) continue;
        const tq = sg * (h + 0.03);
        B.quad(at(i, tq, bot[i]), at(j, tq, bot[j]), at(j, tq, bot[j] + Math.max(0, rj)), at(i, tq, bot[i] + Math.max(0, ri)), PLASTER, side(sg)(i));
        B.quad(at(i, t, bot[i]), at(j, t, bot[j]), at(j, tq, bot[j]), at(i, tq, bot[i]), PLASTER_D, down());
      }
    }
    // round plaster medallions along the parapet's outer face
    const len = P.len, m = Math.max(1, Math.floor((len - 1.5) / MEDAL_STEP));
    for (let k = 0; k < m; k++) {
      const s = (len * (k + 0.5)) / m;
      let i = 0;
      while (i + 2 < n && R.s[i + 1] < s) i++;
      const f = Math.min(1, Math.max(0, (s - R.s[i]) / ((R.s[i + 1] - R.s[i]) || 1)));
      const cx = R.pts[i][0] + (R.pts[i + 1][0] - R.pts[i][0]) * f, cz = R.pts[i][1] + (R.pts[i + 1][1] - R.pts[i][1]) * f;
      const cy = top[i] + (top[i + 1] - top[i]) * f + PARAPET_H * 0.5;
      const nx = N[i][0] * sg, nz = N[i][1] * sg, ux = N[i][1], uz = -N[i][0];
      const o = [cx + nx * (h + 0.025), cy, cz + nz * (h + 0.025)];
      const seg = 10;
      for (let e = 0; e < seg; e++) {
        const a0 = (2 * Math.PI * e) / seg, a1 = (2 * Math.PI * (e + 1)) / seg;
        const p = (a) => [o[0] + ux * Math.cos(a) * MEDAL_R, o[1] + Math.sin(a) * MEDAL_R, o[2] + uz * Math.cos(a) * MEDAL_R];
        B.tri(o, p(a0), p(a1), PLASTER, [nx, 0, nz]);
      }
    }
    B.kind = KIND.MASONRY;
  }
  // underside: the dark soffit of each vault, brick elsewhere
  for (let i = 0; i + 1 < n; i++) {
    const j = i + 1, col = inVault((R.s[i] + R.s[j]) / 2) ? SOFFIT : BRICK_D;
    B.quad(at(i, -h, bot[i]), at(i, h, bot[i]), at(j, h, bot[j]), at(j, -h, bot[j]), col, down());
  }
  // square end posts with plastered caps, at the four corners
  for (const e of [0, n - 1]) {
    const i = e, d = e ? -1 : 1, ang = Math.atan2(-N[i][0], N[i][1]);
    // the abutment's end, closed
    B.kind = KIND.MASONRY;
    B.quad(at(i, -h, bot[i]), at(i, h, bot[i]), at(i, h, top[i]), at(i, -h, top[i]), BRICK_D, [-N[i][1] * d, 0, N[i][0] * d]);
    for (const sg of [-1, 1]) {
      const t = sg * (h - PARAPET_T / 2), s = 0.32 * d;
      const ux = N[i][1], uz = -N[i][0]; // along the bridge
      const x = R.pts[i][0] + N[i][0] * t + ux * s, z = R.pts[i][1] + N[i][1] * t + uz * s;
      B.kind = KIND.MASONRY;
      B.box(x, z, top[i] - 0.2, top[i] + PARAPET_H + 0.35, 0.55, 0.55, ang, BRICK, { top: PLASTER });
      B.kind = KIND.PLAIN;
      B.box(x, z, top[i] + PARAPET_H + 0.35, top[i] + PARAPET_H + 0.47, 0.68, 0.68, ang, PLASTER);
    }
  }
  B.kind = k0;
}
