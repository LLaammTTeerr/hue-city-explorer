import { KIND, Buf, hex, shade, rand } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { streetTest } from '../enclosure.ts';
import { groundHeightAt, isFootprintClearOfStreets, addEmissiveStripMesh, addGlowPointCloud } from '../helpers.ts';

// Làng hương Thủy Xuân (Huyền Trân Công Chúa street, on the way to Lăng Tự Đức): Huế's 700-year-old
// incense-making craft village, famous for roadside shophouses lined with fanned bouquets of brightly dyed
// bamboo incense sticks (đỏ, hồng, vàng, tím, xanh), drying racks, and hanging conical hats (nón lá).
export const id = 'thuyxuan';

// Huyền Trân Công Chúa axis through the village (from OSM road cls 2: [-2806.5, 3763.1] -> [-2797.1, 3851.5])
const A0 = [-2806.5, 3763.1], A1 = [-2797.1, 3851.5];
const AL = Math.hypot(A1[0] - A0[0], A1[1] - A0[1]);
const T = [(A1[0] - A0[0]) / AL, (A1[1] - A0[1]) / AL]; // south-east along Huyền Trân Công Chúa
const N = [-T[1], T[0]]; // across the road (+N west, -N east)
const ANG = Math.atan2(T[1], T[0]);

const WALLS = ['#efe3c8', '#e8d09a', '#f2ece0', '#e5c4a8', '#d9e3d5'].map(hex);
const ROOFS = ['#9c4a34', '#824130', '#4f6e7a', '#6d787e', '#a8573c'].map(hex);
const INCENSE = ['#d92638', '#e83e8c', '#f2b705', '#7e3ff2', '#17a589', '#f37021', '#2e86de'].map(hex);
const BAMBOO = hex('#c9b078'), WOOD = hex('#5c3d28'), DARK = hex('#2c221d'), PAVE = hex('#b8b0a0'), HAT = hex('#dfd0a6');

export function build({ data, S, group, place }) {
  const cx = place ? place.x : -2797.7, cz = place ? place.z : 3833.0;
  const gY = groundHeightAt;
  const onStreet = streetTest(data, [cx, cz], 120);
  const clearBox = (x, z, l, w) => isFootprintClearOfStreets(onStreet, x, z, T as [number, number], N as [number, number], l, w, 1.0);
  const P = (s, v): [number, number] => [A0[0] + T[0] * s + N[0] * v, A0[1] + T[1] * s + N[1] * v];

  const LB = new Buf(256);
  const gp = [], gc = [];
  const paved0 = S.n;

  // ---- roadside incense workshops along both sides of Huyền Trân Công Chúa ----
  for (const side of [-1, 1]) {
    for (let k = 0; k < 8; k++) {
      const s = 10 + k * 10.2;
      const w = 7.4 + (k % 2) * 1.0;
      const d = 6.2 + ((k + 1) % 2) * 1.2;
      const vFront = side * 8.6; // well clear of class-2 road half-width + kerb
      const vMid = side * (8.6 + d / 2);
      const c = P(s, vMid);
      if (!clearBox(c[0], c[1], w + 1.0, d + 2.4)) continue;
      const y0 = gY(c[0], c[1]);
      const h = (k % 3 === 0 ? 5.8 : 3.6);
      const wallCol = WALLS[(k + (side > 0 ? 2 : 0)) % WALLS.length];
      const roofCol = ROOFS[(k + (side > 0 ? 1 : 0)) % ROOFS.length];

      S.base = y0 - LAND_Y;
      // paved display apron in front of each shop
      S.kind = KIND.ROAD;
      const ap = P(s, side * 6.8);
      S.box(ap[0], ap[1], y0 - 0.5, y0 + 0.14, w + 0.8, 3.8, ANG, PAVE, { topKind: KIND.ROAD });

      // shophouse body
      S.kind = KIND.CIVIC;
      S.box(c[0], c[1], y0 - 0.5, y0 + h, w, d, ANG, wallCol, { top: shade(roofCol, 0.85) });
      // tiled/corrugated hip roof
      S.hip(c[0], c[1], w, d, ANG, y0 + h, 1.5, roofCol, { over: 0.6, flare: 0.18, fascia: 0.14, fasciaCol: WOOD, segs: 2 });

      // open timber-framed shopfront facing the street + sloping awning
      S.kind = KIND.PLAIN;
      const f = P(s, vFront - side * 0.06);
      S.box(f[0], f[1], y0 + 0.15, y0 + 2.55, w * 0.78, 0.12, ANG, DARK);
      LB.box(f[0], f[1], y0 + 0.3, y0 + 2.3, w * 0.72, 0.08, ANG, [1, 1, 1]);
      // signboard
      S.box(f[0], f[1], y0 + 2.65, y0 + 3.25, w * 0.84, 0.16, ANG, INCENSE[k % INCENSE.length]);
      // front verandah canopy on slender posts
      const aw = P(s, side * 7.2);
      S.box(aw[0], aw[1], y0 + 2.75, y0 + 2.92, w + 0.2, 2.8, ANG, shade(roofCol, 1.05), { bottom: true });
      for (const du of [-w / 2 + 0.3, w / 2 - 0.3]) {
        const post = P(s + du, side * 6.0);
        S.cyl(post[0], post[1], y0 + 0.14, y0 + 2.78, 0.08, 0.07, 6, WOOD, { cap: false });
      }
      // hanging conical hats (nón lá) under the awning
      for (let hIdx = -2; hIdx <= 2; hIdx++) {
        const hp = P(s + hIdx * 1.2, side * 6.3);
        S.cyl(hp[0], hp[1], y0 + 2.15, y0 + 2.48, 0.28, 0.03, 7, HAT);
      }

      // ---- signature fanned bouquets of dyed incense sticks (bó hương) on tiered bamboo displays ----
      for (let b = 0; b < 5; b++) {
        const bu = s - w * 0.42 + b * (w * 0.21);
        const bv = side * (5.65 + (b % 2) * 1.25);
        const bp = P(bu, bv), by = gY(bp[0], bp[1]) + 0.14;
        const ic = INCENSE[(k * 3 + b + (side > 0 ? 2 : 0)) % INCENSE.length];
        const ic2 = INCENSE[(k * 3 + b + 3) % INCENSE.length];
        const tier = b % 2 === 0 ? 0.28 : 0.0;
        // wooden stool / tiered stand
        S.cyl(bp[0], bp[1], by, by + 0.48 + tier, 0.22, 0.26, 6, WOOD);
        // narrow tied bamboo base fanning up into a vivid giant floral dome of dyed incense tips
        S.cyl(bp[0], bp[1], by + 0.48 + tier, by + 1.0 + tier, 0.16, 0.62, 10, BAMBOO);
        S.cyl(bp[0], bp[1], by + 0.96 + tier, by + 1.48 + tier, 0.62, 1.05, 11, ic);
        S.cyl(bp[0], bp[1], by + 1.48 + tier, by + 1.68 + tier, 1.05, 0.72, 11, shade(ic, 1.14));
        // inner contrasting blossom core
        S.cyl(bp[0], bp[1], by + 1.66 + tier, by + 1.78 + tier, 0.45, 0.2, 9, ic2);
      }

      // warm lantern glow under the awning
      const lp = P(s, side * 6.4);
      gp.push(lp[0], y0 + 2.6, lp[1]);
      gc.push(1, 0.84, 0.5);
    }
  }

  // ---- overhead festive silk lantern strings crisscrossing Huyền Trân Công Chúa between the incense shops ----
  {
    const lanCols = [hex('#e03030'), hex('#f2b705'), hex('#e83e8c'), hex('#17a589'), hex('#7e3ff2'), hex('#f37021')];
    for (let k = 0; k < 5; k++) {
      const s = 16 + k * 14;
      const pL = P(s, -6.2), pR = P(s, 6.2);
      const yL = gY(pL[0], pL[1]) + 6.4, yR = gY(pR[0], pR[1]) + 6.4;
      S.kind = KIND.PLAIN;
      S.beam([pL[0], yL, pL[1]], [pR[0], yR, pR[1]], 0.04, 0.04, DARK);
      for (let j = 1; j <= 5; j++) {
        const f = j / 6;
        const v = -6.2 + f * 12.4;
        const sag = Math.sin(f * Math.PI) * 0.45;
        const q = P(s, v), yq = yL + (yR - yL) * f - sag;
        S.cyl(q[0], q[1], yq - 0.52, yq - 0.06, 0.24, 0.2, 8, lanCols[(k * 2 + j) % lanCols.length]);
        gp.push(q[0], yq - 0.29, q[1]);
        gc.push(1, 0.78, 0.42);
      }
    }
  }

  // ---- village welcome arch (Làng hương Thủy Xuân) near the main junction ----
  {
    const sArch = 68;
    const pL = P(sArch, -6.2), pR = P(sArch, 6.2), pM = P(sArch, 0);
    if (!onStreet(pL[0], pL[1], 0.4) && !onStreet(pR[0], pR[1], 0.4)) {
      const yA = Math.max(gY(pL[0], pL[1]), gY(pR[0], pR[1]));
      S.base = yA - LAND_Y;
      S.kind = KIND.MASONRY;
      for (const p of [pL, pR]) {
        S.box(p[0], p[1], yA - 0.5, yA + 5.4, 0.75, 0.75, ANG, hex('#d8c494'));
        S.box(p[0], p[1], yA + 5.4, yA + 5.85, 0.95, 0.95, ANG, hex('#9e3628'));
      }
      S.kind = KIND.PLAIN;
      S.box(pM[0], pM[1], yA + 4.9, yA + 5.7, 0.55, 12.8, ANG, hex('#9e3628'));
      S.box(pM[0], pM[1], yA + 5.15, yA + 5.48, 0.62, 8.8, ANG, hex('#f0c84b'));
      S.hip(pM[0], pM[1], 1.6, 13.6, ANG, yA + 5.7, 0.95, hex('#9c4a34'), { over: 0.4, flare: 0.25, segs: 2 });
    }
  }

  (S.paved = S.paved || []).push([paved0, S.n]);

  // ---- lush hillside garden trees behind the shophouses (matching Google Satellite) ----
  if (Array.isArray(data.trees)) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 16; i++) {
        const s = -10 + i * 7.2 + (rand(i, side + 5) - 0.5) * 3;
        const v = side * (17 + rand(i, side + 9) * 18);
        const q = P(s, v);
        if (onStreet(q[0], q[1], 3.5)) continue;
        data.trees.push(Math.round(q[0] * 10), Math.round(q[1] * 10), 10 + Math.floor(rand(i, 12) * 5), i % 3 === 0 ? 1 : 0);
      }
    }
  }

  addEmissiveStripMesh(group, LB, 0xffd088, 0.85, id);
  addGlowPointCloud(group, gp, gc, 3.0, id);
  S.kind = KIND.PLAIN;
  S.base = 0;
}
