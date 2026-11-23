import * as THREE from 'three';
import { KIND, Buf, hex, shade, rand } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';
import { streetTest } from '../enclosure.js';

// Làng tranh Sình (Lại Ân village, Phú Mậu, near the Perfume River): Huế's 400-year-old woodblock
// folk-painting village. Features a traditional Huế nhà rường tiled-roof artisan workshop (like artisan
// Kỳ Hữu Phước's studio), walled courtyard with bình phong screen, wooden printing tables, and bamboo
// drying racks hung with colorful giấy điệp folk prints (red, ochre, indigo, emerald) in a lush garden setting.
export const id = 'sinh';

const C = {
  wall: hex('#e8ddc4'), wall2: hex('#dfd0ac'), brick: hex('#8a523e'),
  tile: hex('#924833'), tile2: hex('#7a3e2e'), ridge: hex('#dfd3b8'),
  wood: hex('#523322'), dark: hex('#281f1a'), pave: hex('#b9ae98'), lawn: hex('#738f4d'),
  bamboo: hex('#bda772'), screen: hex('#cfc2a4'),
};
const PRINTS = ['#d43b2f', '#e5b13a', '#2e5d8c', '#3c8556', '#e8dfd0', '#c45b33'].map(hex);

export function build({ data, S, group, place }) {
  const px0 = place ? place.x : -1215.1, pz0 = place ? place.z : -5845.1;
  const gY = (x, z) => LAND_Y + rise(x, z);
  const onStreet = streetTest(data, [px0, pz0], 140);
  // frame aligned to the village lane (nearly E-W / N-S)
  const ANG = 0.08;
  const U = [Math.cos(ANG), Math.sin(ANG)], V = [-U[1], U[0]];
  const clearBox = (x, z, l, w) => {
    for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0, 0]]) {
      if (onStreet(x + U[0] * a * l + V[0] * b * w, z + U[1] * a * l + V[1] * b * w, 0.8)) return false;
    }
    return true;
  };
  // find the nearest clear courtyard site around the village center (keeping off the mapped lanes)
  let cx = px0, cz = pz0;
  for (const [du, dv] of [[0, 0], [0, 12], [-10, 12], [10, 12], [0, -14], [-14, 0], [14, 0], [-14, 16], [14, -14]]) {
    const tx = px0 + U[0] * du + V[0] * dv, tz = pz0 + U[1] * du + V[1] * dv;
    if (clearBox(tx, tz, 22, 18)) { cx = tx; cz = tz; break; }
  }
  const P = (u, v) => [cx + U[0] * u + V[0] * v, cz + U[1] * u + V[1] * v];

  const LB = new Buf(256);
  const gp = [], gc = [];
  const paved0 = S.n;
  const y0 = gY(cx, cz);
  S.base = y0 - LAND_Y;

  // ---- 1. Main Folk-Painting Workshop Compound (Nhà rường & printing courtyard) ----
  if (clearBox(cx, cz, 22, 18)) {
    // brick courtyard floor & garden lawn
    S.kind = KIND.ROAD;
    S.box(cx, cz, y0 - 0.5, y0 + 0.16, 22, 18, ANG, C.pave, { topKind: KIND.ROAD });
    // low weathered brick garden walls with an open front gate on the north (-V) side
    S.kind = KIND.MASONRY;
    const wallH = 1.65;
    for (const [u, v, w, d] of [[0, 8.7, 22, 0.45], [-10.7, 0, 0.45, 17.8], [10.7, 0, 0.45, 17.8], [-6.4, -8.7, 8.6, 0.45], [6.4, -8.7, 8.6, 0.45]]) {
      const q = P(u, v);
      S.box(q[0], q[1], y0 - 0.2, y0 + wallH, w, d, ANG, C.brick, { top: C.screen });
    }
    // traditional tam quan village gate piers + two-tier tiled gate roof & gilded village plaque (Cổng làng Sình)
    for (const s of [-1, 1]) {
      const gp1 = P(s * 2.25, -8.7);
      S.box(gp1[0], gp1[1], y0 - 0.2, y0 + 3.1, 0.75, 0.75, ANG, C.wall2, { top: C.ridge });
      const gp2 = P(s * 4.4, -8.7);
      S.box(gp2[0], gp2[1], y0 - 0.2, y0 + 2.3, 0.58, 0.58, ANG, C.wall2, { top: C.ridge });
      const sp = P(s * 3.3, -8.7);
      S.hip(sp[0], sp[1], 2.2, 1.35, ANG, y0 + 2.3, 0.55, C.tile, { over: 0.3, flare: 0.2, ridgeCol: C.ridge, segs: 2 });
    }
    const gM = P(0, -8.7);
    S.kind = KIND.PLAIN;
    S.box(gM[0], gM[1], y0 + 2.35, y0 + 3.1, 4.4, 0.48, ANG, C.brick);
    S.box(gM[0], gM[1], y0 + 2.52, y0 + 2.95, 2.6, 0.54, ANG, hex('#d4a63a'));
    S.hip(gM[0], gM[1], 5.4, 1.8, ANG, y0 + 3.1, 0.95, C.tile, { over: 0.45, flare: 0.32, ridgeCol: C.ridge, segs: 3 });
    S.hip(gM[0], gM[1], 3.4, 1.3, ANG, y0 + 3.95, 0.75, C.tile, { over: 0.35, flare: 0.3, ridgeCol: C.ridge, segs: 2 });
    S.cyl(gM[0], gM[1], y0 + 4.7, y0 + 5.2, 0.14, 0.04, 6, hex('#d4a63a'));
    gp.push(gM[0], y0 + 2.6, gM[1]);
    gc.push(1, 0.8, 0.45);

    // bình phong spirit screen just inside the gate with ceramic relief medallion
    const bp = P(0, -5.8);
    S.kind = KIND.MASONRY;
    S.box(bp[0], bp[1], y0 + 0.16, y0 + 2.25, 3.0, 0.42, ANG, C.screen, { top: C.tile2 });
    S.kind = KIND.PLAIN;
    S.box(bp[0], bp[1], y0 + 0.85, y0 + 1.75, 1.15, 0.48, ANG, hex('#c45b33'));

    // main nhà rường workshop hall (3 gian 2 chái) on the south half of the courtyard
    const hC = P(0, 3.6);
    S.kind = KIND.MASONRY;
    S.box(hC[0], hC[1], y0 + 0.16, y0 + 0.55, 15.2, 8.6, ANG, shade(C.pave, 0.92), { topKind: KIND.ROAD });
    S.kind = KIND.TIMBER;
    S.box(hC[0], hC[1], y0 + 0.55, y0 + 3.8, 13.8, 7.0, ANG, C.wall, { top: C.tile2 });
    S.hip(hC[0], hC[1], 14.2, 7.4, ANG, y0 + 3.8, 2.4, C.tile, { over: 0.9, flare: 0.38, fascia: 0.2, fasciaCol: C.wood, ridgeCol: C.ridge, hips: true, segs: 3 });
    // open timber verandah facing the courtyard + folk-art hanging scroll banners
    S.kind = KIND.PLAIN;
    for (let i = -3; i <= 3; i++) {
      const col = P(i * 2.1, -0.3);
      S.cyl(col[0], col[1], y0 + 0.55, y0 + 3.6, 0.13, 0.11, 6, C.wood, { cap: false });
    }
    const fd = P(0, 0.12);
    S.box(fd[0], fd[1], y0 + 0.55, y0 + 2.85, 9.8, 0.14, ANG, C.wood);
    S.box(fd[0], fd[1], y0 + 2.95, y0 + 3.45, 3.2, 0.16, ANG, hex('#d4a63a'));
    LB.box(fd[0], fd[1], y0 + 0.8, y0 + 2.6, 9.0, 0.1, ANG, [1, 1, 1]);
    gp.push(fd[0], y0 + 3.1, fd[1]);
    gc.push(1, 0.85, 0.52);

    // ---- signature bamboo drying racks hung with colorful Sình woodblock prints (giấy điệp) ----
    for (const [ru, rv] of [[-6.4, -2.6], [6.4, -2.6], [-6.4, -5.4], [6.4, -5.4], [-8.8, 1.5], [8.8, 1.5]]) {
      const r0 = P(ru - 2.3, rv), r1 = P(ru + 2.3, rv);
      S.kind = KIND.PLAIN;
      for (const ep of [r0, r1]) S.cyl(ep[0], ep[1], y0 + 0.16, y0 + 2.05, 0.06, 0.05, 5, C.bamboo, { cap: false });
      S.beam([r0[0], y0 + 1.92, r0[1]], [r1[0], y0 + 1.92, r1[1]], 0.06, 0.06, C.bamboo);
      S.beam([r0[0], y0 + 1.2, r0[1]], [r1[0], y0 + 1.2, r1[1]], 0.05, 0.05, C.bamboo);
      // hanging painted sheets of giấy điệp paper
      for (let j = 0; j < 6; j++) {
        const sp = P(ru - 1.9 + j * 0.76, rv);
        const pc = PRINTS[(j + (ru > 0 ? 2 : 0) + (rv < -4 ? 1 : 0)) % PRINTS.length];
        S.box(sp[0], sp[1], y0 + 1.3, y0 + 1.88, 0.58, 0.06, ANG, pc);
        S.box(sp[0], sp[1], y0 + 0.62, y0 + 1.16, 0.58, 0.06, ANG, PRINTS[(j + 3) % PRINTS.length]);
      }
    }

    // wooden woodblock printing table + natural pigment bowls (shell white, indigo, vermilion, turmeric)
    const tb = P(0, -2.5);
    S.box(tb[0], tb[1], y0 + 0.16, y0 + 0.92, 3.2, 1.35, ANG, C.wood);
    S.box(tb[0], tb[1], y0 + 0.92, y0 + 0.98, 2.6, 0.95, ANG, PRINTS[4]);
    for (let k = 0; k < 4; k++) {
      const bp1 = P(-1.05 + k * 0.7, -2.5);
      S.cyl(bp1[0], bp1[1], y0 + 0.98, y0 + 1.16, 0.16, 0.2, 7, PRINTS[k]);
    }
  }

  // ---- 2. Neighboring tiled garden-village workshops (matching satellite cluster) ----
  const neighbors = [
    { u: -24, v: 6, w: 11, d: 7.5 },
    { u: 24, v: 5, w: 11.5, d: 7.5 },
    { u: -22, v: -18, w: 10.5, d: 7.0 },
    { u: 22, v: -18, w: 10.5, d: 7.0 },
  ];
  for (let i = 0; i < neighbors.length; i++) {
    const nb = neighbors[i], c = P(nb.u, nb.v);
    if (!clearBox(c[0], c[1], nb.w + 2, nb.d + 2)) continue;
    const y = gY(c[0], c[1]);
    S.base = y - LAND_Y;
    S.kind = KIND.CIVIC;
    S.box(c[0], c[1], y - 0.5, y + 3.4, nb.w, nb.d, ANG, i % 2 ? C.wall : C.wall2, { top: C.tile2 });
    S.hip(c[0], c[1], nb.w, nb.d, ANG, y + 3.4, 1.8, i % 2 ? C.tile : C.tile2, { over: 0.7, flare: 0.2, ridgeCol: C.ridge, segs: 2 });
  }

  (S.paved = S.paved || []).push([paved0, S.n]);

  // ---- lush village garden trees & areca palms (matching Google Satellite) ----
  if (Array.isArray(data.trees)) {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = 17 + rand(i, 4) * 20;
      const q = P(Math.cos(a) * r, Math.sin(a) * r);
      if (onStreet(q[0], q[1], 3.0)) continue;
      data.trees.push(Math.round(q[0] * 10), Math.round(q[1] * 10), 9 + Math.floor(rand(i, 9) * 5), i % 3 === 0 ? 1 : 0);
    }
  }

  if (LB.n) {
    const m = new THREE.Mesh(LB.geometry(), lightMaterial(0xffd28c, 0.8));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
  }
  if (gp.length) {
    const pts = glowPoints(gp, gc, 3.0);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
