import * as THREE from 'three';
import { KIND, hex, shade } from '../geo/buf.js';
import { glowPoints } from '../geo/materials.js';
import { LAND_Y, PAL } from '../config.js';

// Cầu Trường Tiền. Position, axis, length and width come from the OSM bridge outline
// (way 1431129413); the six bow-string steel spans — "sáu vài mười hai nhịp" — are modelled by hand.
export function buildTruongTien(data, S, group) {
  const tt = data.truongtien;
  const a = [tt.a[0] / 10, tt.a[1] / 10], b = [tt.b[0] / 10, tt.b[1] / 10]; // north end, south end
  const L = tt.box.w / 10, W = tt.box.d / 10;
  const c = [tt.box.c[0] / 10, tt.box.c[1] / 10];
  const dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d = [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl]; // along the bridge, north → south bank
  const n = [-d[1], d[0]]; // across the bridge
  const ang = Math.atan2(d[1], d[0]);
  const SPANS = 6, span = L / SPANS;
  const deckTop = LAND_Y + 2.4, deckT = 0.9; // underside ~6 m above the river: room for a dragon boat and its roof
  const trussX = W / 2 - 2.35; // truss planes; walkways are cantilevered outside them
  const H = 10.4; // crown of each bow above the deck
  const N = 10; // panels per span
  const steel = PAL.steel, steelD = PAL.steelDark;

  const at = (s, off, y) => [c[0] + d[0] * s + n[0] * off, y, c[1] + d[1] * s + n[1] * off];

  // deck + walkway edge
  S.box(c[0], c[1], deckTop - deckT, deckTop, L, W, ang, hex('#8d8782'), { top: PAL.deck, bottom: true });
  for (const side of [-1, 1]) {
    S.beam(at(-L / 2, side * (W / 2 - 0.1), deckTop + 1.05), at(L / 2, side * (W / 2 - 0.1), deckTop + 1.05), 0.16, 0.16, steel);
    S.beam(at(-L / 2, side * (W / 2 - 0.1), deckTop + 0.55), at(L / 2, side * (W / 2 - 0.1), deckTop + 0.55), 0.1, 0.1, steelD);
    for (let s = -L / 2; s <= L / 2 + 0.01; s += span / N) S.beam(at(s, side * (W / 2 - 0.1), deckTop), at(s, side * (W / 2 - 0.1), deckTop + 1.05), 0.14, 0.14, steelD);
    // walkway surface slightly lighter than the carriageway
    const mid = at(0, side * (trussX + (W / 2 - trussX) / 2), 0);
    S.box(mid[0], mid[2], deckTop, deckTop + 0.12, L, W / 2 - trussX - 0.3, ang, hex('#b5aea4'));
  }

  // approaches: the deck sits above the riverside parks, with ramps down to the streets
  for (const end of [-1, 1]) {
    const s0 = (end * L) / 2, s1 = s0 + end * 34;
    const y1 = LAND_Y + 0.08;
    const p = [at(s0, -W / 2, deckTop), at(s0, W / 2, deckTop), at(s1, W / 2, y1), at(s1, -W / 2, y1)];
    S.quad(p[0], p[1], p[2], p[3], PAL.deck, [0, 1, 0]);
    for (const side of [-1, 1]) {
      const q0 = at(s0, (side * W) / 2, deckTop), q1 = at(s1, (side * W) / 2, y1), q2 = at(s0, (side * W) / 2, LAND_Y - 0.5), q3 = at(s1, (side * W) / 2, LAND_Y - 0.5);
      S.kind = KIND.MASONRY;
      S.quad(q0, q1, q3, q2, PAL.pier, [n[0] * side, 0, n[1] * side]);
      S.kind = KIND.PLAIN;
      S.beam(at(s0, side * (W / 2 - 0.1), deckTop + 1.0), at(s1, side * (W / 2 - 0.1), y1 + 1.0), 0.16, 0.16, steel);
    }
    // abutment
    const m = at(s0 + end * 1.2, 0, 0);
    S.kind = KIND.MASONRY;
    S.box(m[0], m[2], -3, deckTop - deckT, 3.4, W + 2.4, ang, PAL.pier);
    S.kind = KIND.PLAIN;
  }

  // stone piers with pointed cutwaters and the little balconies that sit above them
  const lampPos = [], lampCol = [];
  for (let i = 1; i < SPANS; i++) {
    const s = -L / 2 + i * span;
    const ring = [[-1.7, -W / 2 + 0.6], [0, -W / 2 - 2.6], [1.7, -W / 2 + 0.6], [1.7, W / 2 - 0.6], [0, W / 2 + 2.6], [-1.7, W / 2 - 0.6]].map(([u, v]) => { const p = at(s + u, v, 0); return [p[0], p[2]]; });
    S.kind = KIND.MASONRY;
    S.prism(ring, -3, deckTop - deckT - 0.7, PAL.pier, shade(PAL.pier, 1.08), { scaleTop: 0.92 });
    S.kind = KIND.PLAIN;
    const m = at(s, 0, 0);
    S.box(m[0], m[2], deckTop - deckT - 0.7, deckTop - deckT, 3.8, W + 1.2, ang, shade(PAL.pier, 1.1), { bottom: true });
    for (const side of [-1, 1]) {
      const bp = at(s, side * (W / 2 + 0.7), 0);
      S.box(bp[0], bp[2], deckTop - 0.5, deckTop + 0.12, 5.2, 1.6, ang, hex('#b5aea4'), { bottom: true });
      S.beam(at(s - 2.6, side * (W / 2 + 1.45), deckTop + 1.05), at(s + 2.6, side * (W / 2 + 1.45), deckTop + 1.05), 0.16, 0.16, steel);
      // lamp post
      S.beam(at(s, side * (W / 2 + 1.2), deckTop), at(s, side * (W / 2 + 1.2), deckTop + 4.2), 0.18, 0.18, steelD);
      const lp = at(s, side * (W / 2 + 1.2), deckTop + 4.5);
      lampPos.push(...lp); lampCol.push(1.0, 0.8, 0.5);
    }
  }

  // the bows
  const spanLights = [];
  for (let i = 0; i < SPANS; i++) {
    const s0 = -L / 2 + i * span;
    const lp = [], lc = [];
    const top = (k, side) => { const t = k / N; return at(s0 + t * span, side * trussX, deckTop + 0.25 + H * (1 - (2 * t - 1) * (2 * t - 1))); };
    const bot = (k, side) => at(s0 + (k / N) * span, side * trussX, deckTop + 0.25);
    for (const side of [-1, 1]) {
      S.beam(bot(0, side), bot(N, side), 0.55, 0.5, steelD);
      for (let k = 0; k < N; k++) {
        S.beam(top(k, side), top(k + 1, side), 0.78, 0.8, steel);
        if (k >= 1) S.beam(top(k, side), bot(k, side), 0.4, 0.4, steel);
        // diagonals lean toward mid-span
        if (k >= 1 && k < N / 2) S.beam(top(k, side), bot(k + 1, side), 0.3, 0.3, steelD);
        if (k >= N / 2 && k < N - 1) S.beam(top(k + 1, side), bot(k, side), 0.3, 0.3, steelD);
        // light points traced along the bow
        for (const f of [0, 0.5]) {
          const p0 = top(k, side), p1 = top(k + 1, side);
          lp.push(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f + 0.5, p0[2] + (p1[2] - p0[2]) * f);
          lc.push(1, 1, 1);
        }
        if (k >= 1 && k % 2 === 0) { const p = top(k, side), q = bot(k, side); lp.push(p[0], (p[1] + q[1]) / 2, p[2]); lc.push(0.6, 0.6, 0.6); }
      }
    }
    // portal and wind bracing where there is headroom
    let prev = null;
    for (let k = 2; k <= N - 2; k++) {
      const l = top(k, -1), r = top(k, 1);
      if (l[1] < deckTop + 5.6) continue;
      S.beam(l, r, 0.34, 0.34, steel);
      if (prev) { S.beam(prev[0], r, 0.2, 0.2, steelD); S.beam(prev[1], l, 0.2, 0.2, steelD); }
      prev = [l, r];
    }
    const pts = glowPoints(lp, lc, 3.4);
    group.add(pts);
    spanLights.push(pts);
  }
  const lamps = glowPoints(lampPos, lampCol, 8);
  group.add(lamps);

  const col = new THREE.Color();
  return {
    centre: c, dir: d, across: n, length: L, width: W, span, deckTop, deckBottom: deckTop - deckT, lights: spanLights, lamps,
    // The bridge's lighting drifts through colours after dark; in rain it settles on a warm white.
    update(time, glow, rain) {
      for (let i = 0; i < spanLights.length; i++) {
        const hue = (time * 0.035 + i * 0.05) % 1;
        col.setHSL(hue, 0.9, 0.62);
        const u = spanLights[i].material.uniforms;
        u.uTint.value.copy(col).lerp(WARM, Math.min(1, rain * 0.85));
        u.uBoost.value = 0.85 + rain * 0.25;
      }
    },
  };
}
const WARM = new THREE.Color(1.0, 0.82, 0.55);
