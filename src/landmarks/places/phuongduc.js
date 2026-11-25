import * as THREE from 'three';
import { KIND, Buf, hex, shade, rand } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';
import { streetTest } from '../enclosure.js';

// Làng đúc đồng Phường Đúc (Bùi Thị Xuân street, south bank of the Perfume River): Huế's 400-year-old
// royal bronze-casting village (casters of the Nine Dynastic Urns and Thiên Mụ's Great Bell). Features
// tiled open-sided foundry sheds (lò đúc đồng), brick melting furnaces with chimneys, drying clay molds,
// cast bronze bells (đại hồng chung) & tripod incense urns (đỉnh đồng), and the ancestral craft hall.
export const id = 'phuongduc';

// Bùi Thị Xuân road tangent near Phường Đúc ([-2690.5, 1735.6] -> [-2743.4, 1747.8])
const O = [-2718.0, 1742.0];
const dx = -2743.4 - (-2690.5), dz = 1747.8 - 1735.6, dl = Math.hypot(dx, dz);
const T = [dx / dl, dz / dl]; // west-southwest along Bùi Thị Xuân
const N = [-T[1], T[0]]; // +N south-southeast, -N north-northwest (toward river)
const ANG = Math.atan2(T[1], T[0]);

const C = {
  wall: hex('#dfd3b8'), wall2: hex('#e8d6a8'), brick: hex('#8c4c3a'), kiln: hex('#6e3d2e'),
  tile: hex('#8f4632'), tile2: hex('#733a2c'), tin: hex('#6a747a'),
  wood: hex('#513424'), dark: hex('#28201c'), pave: hex('#b5ae9f'),
  bronze: hex('#5e5132'), bronzeHi: hex('#8c7442'), patina: hex('#4e6b58'), clay: hex('#9e7454'),
  gold: hex('#cfa646'),
};

export function build({ data, S, group, place }) {
  const cx = place ? place.x : -2729.0, cz = place ? place.z : 1730.1;
  const gY = (x, z) => LAND_Y + rise(x, z);
  const onStreet = streetTest(data, [cx, cz], 120);
  const P = (u, v) => [O[0] + T[0] * u + N[0] * v, O[1] + T[1] * u + N[1] * v];
  const clearBox = (x, z, l, w) => {
    for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0, 0]]) {
      if (onStreet(x + T[0] * a * l + N[0] * b * w, z + T[1] * a * l + N[1] * b * w, 1.2)) return false;
    }
    return true;
  };

  // helper: draw a cast bronze temple bell (đại hồng chung) or tripod urn (đỉnh đồng)
  const bronzeBell = (x, z, y, sc = 1) => {
    S.kind = KIND.PLAIN;
    S.cyl(x, z, y, y + 0.26 * sc, 0.68 * sc, 0.6 * sc, 8, C.wood);
    S.cyl(x, z, y + 0.26 * sc, y + 1.18 * sc, 0.6 * sc, 0.44 * sc, 10, C.bronze);
    S.cyl(x, z, y + 1.18 * sc, y + 1.72 * sc, 0.44 * sc, 0.24 * sc, 10, C.bronzeHi);
    S.cyl(x, z, y + 1.72 * sc, y + 2.02 * sc, 0.18 * sc, 0.1 * sc, 6, C.patina);
  };
  const bronzeUrn = (x, z, y, sc = 1) => {
    S.kind = KIND.PLAIN;
    S.box(x, z, y, y + 0.34 * sc, 1.05 * sc, 1.05 * sc, ANG, C.pave);
    S.cyl(x, z, y + 0.34 * sc, y + 1.2 * sc, 0.42 * sc, 0.56 * sc, 8, C.patina);
    S.cyl(x, z, y + 1.2 * sc, y + 1.56 * sc, 0.56 * sc, 0.34 * sc, 8, C.bronzeHi);
    S.cyl(x, z, y + 1.56 * sc, y + 1.85 * sc, 0.2 * sc, 0.08 * sc, 8, C.gold);
  };

  const LB = new Buf(256);
  const gp = [], gc = [];
  const paved0 = S.n;

  // ---- 1. Ancestral Bronze-Casters' Hall (Nhà thờ Tổ nghề đúc đồng) on the north side of Bùi Thị Xuân ----
  {
    const c = P(-14, -17.5);
    if (clearBox(c[0], c[1], 16, 13)) {
      const y0 = gY(c[0], c[1]);
      S.base = y0 - LAND_Y;
      S.kind = KIND.MASONRY;
      S.box(c[0], c[1], y0 - 0.5, y0 + 0.35, 16, 13, ANG, C.pave, { topKind: KIND.ROAD });
      // traditional 3-bay tiled hall
      S.kind = KIND.TIMBER;
      const hC = P(-14, -19.2);
      S.box(hC[0], hC[1], y0 + 0.35, y0 + 3.9, 12.6, 7.6, ANG, C.wall2, { top: C.tile2 });
      S.hip(hC[0], hC[1], 12.6, 7.6, ANG, y0 + 3.9, 2.2, C.tile, { over: 0.9, flare: 0.35, fascia: 0.2, fasciaCol: C.wood, ridgeCol: hex('#d9cbb0'), hips: true, segs: 3 });
      // front verandah columns & lacquered doors
      S.kind = KIND.PLAIN;
      for (let i = -2; i <= 2; i++) {
        const colP = P(-14 + i * 2.8, -15.0);
        S.cyl(colP[0], colP[1], y0 + 0.35, y0 + 3.7, 0.14, 0.12, 6, C.wood, { cap: false });
      }
      const dP = P(-14, -15.35);
      S.box(dP[0], dP[1], y0 + 0.35, y0 + 2.9, 7.2, 0.12, ANG, C.wood);
      S.box(dP[0], dP[1], y0 + 3.05, y0 + 3.55, 2.6, 0.14, ANG, C.gold);
      // courtyard monumental bronze cauldron (đỉnh đồng) + open timber bell-frame pavilions holding Đại Hồng Chung bells
      const uP = P(-14, -12.6);
      bronzeUrn(uP[0], uP[1], y0 + 0.35, 1.35);
      for (const s of [-1, 1]) {
        const bP = P(-14 + s * 4.4, -12.6);
        bronzeBell(bP[0], bP[1], y0 + 0.35, 1.25);
        // carved timber A-frame bell gantry over each bronze bell
        for (const ds of [-0.9, 0.9]) {
          const post = P(-14 + s * 4.4 + ds, -12.6);
          S.cyl(post[0], post[1], y0 + 0.35, y0 + 2.85, 0.11, 0.09, 6, C.wood, { cap: false });
        }
        S.box(bP[0], bP[1], y0 + 2.7, y0 + 2.95, 2.1, 0.22, ANG, C.wood);
        S.hip(bP[0], bP[1], 2.4, 1.5, ANG, y0 + 2.95, 0.65, C.tile, { over: 0.35, flare: 0.25, ridgeCol: hex('#d9cbb0'), segs: 2 });
      }
      // village craft entrance gate (Cổng làng đúc đồng Phường Đúc) on the street edge of the hall courtyard
      for (const s of [-1, 1]) {
        const gp0 = P(-14 + s * 2.5, -10.8);
        S.kind = KIND.MASONRY;
        S.box(gp0[0], gp0[1], y0 - 0.1, y0 + 3.4, 0.72, 0.72, ANG, C.wall2, { top: C.gold });
      }
      const gm = P(-14, -10.8);
      S.kind = KIND.PLAIN;
      S.box(gm[0], gm[1], y0 + 2.65, y0 + 3.35, 5.2, 0.52, ANG, C.brick);
      S.box(gm[0], gm[1], y0 + 2.8, y0 + 3.2, 3.0, 0.58, ANG, C.gold);
      S.hip(gm[0], gm[1], 6.0, 1.8, ANG, y0 + 3.35, 1.0, C.tile, { over: 0.4, flare: 0.3, ridgeCol: hex('#d9cbb0'), segs: 2 });
      gp.push(dP[0], y0 + 3.1, dP[1]);
      gc.push(1, 0.8, 0.42);
    }
  }

  // ---- 2. Open-sided bronze foundry sheds (lò đúc đồng) & brick melting kilns ----
  const foundries = [
    { u: 6, v: -16.5, w: 13.5, d: 8.5, kilnSide: 1 },
    { u: 22, v: -16.0, w: 11.5, d: 7.5, kilnSide: -1 },
    { u: -18, v: 14.5, w: 12.0, d: 8.0, kilnSide: 1 },
    { u: 2, v: 14.8, w: 13.0, d: 8.2, kilnSide: -1 },
  ];
  for (let idx = 0; idx < foundries.length; idx++) {
    const f = foundries[idx];
    const c = P(f.u, f.v);
    if (!clearBox(c[0], c[1], f.w + 2, f.d + 2)) continue;
    const y0 = gY(c[0], c[1]);
    S.base = y0 - LAND_Y;
    // concrete work yard
    S.kind = KIND.ROAD;
    S.box(c[0], c[1], y0 - 0.5, y0 + 0.14, f.w + 2.4, f.d + 2.8, ANG, C.pave, { topKind: KIND.ROAD });
    // low rear brick wall + timber posts supporting a high ventilated tiled/tin foundry roof
    S.kind = KIND.MASONRY;
    const rear = P(f.u, f.v + Math.sign(f.v) * (f.d / 2 - 0.4));
    S.box(rear[0], rear[1], y0 + 0.14, y0 + 3.6, f.w, 0.6, ANG, C.wall);
    S.kind = KIND.PLAIN;
    for (let i = -2; i <= 2; i++) {
      const p1 = P(f.u + i * (f.w / 4 - 0.2), f.v - Math.sign(f.v) * (f.d / 2 - 0.4));
      S.cyl(p1[0], p1[1], y0 + 0.14, y0 + 3.8, 0.14, 0.12, 6, C.wood, { cap: false });
    }
    S.hip(c[0], c[1], f.w + 0.6, f.d + 0.6, ANG, y0 + 3.8, 2.0, idx % 2 ? C.tile : C.tin, { over: 0.7, flare: 0.15, segs: 2 });

    // brick melting furnace + tapered chimney stack with brick cap ring (glowing warm ember at night)
    const kp = P(f.u + f.kilnSide * (f.w / 2 + 1.2), f.v + Math.sign(f.v) * 1.4);
    S.kind = KIND.MASONRY;
    S.cyl(kp[0], kp[1], y0 - 0.3, y0 + 2.6, 1.55, 1.28, 8, C.kiln);
    S.cyl(kp[0], kp[1], y0 + 2.6, y0 + 7.8, 0.72, 0.42, 8, C.brick);
    S.cyl(kp[0], kp[1], y0 + 7.6, y0 + 7.95, 0.54, 0.48, 8, C.kiln);
    // glowing molten-bronze furnace mouth
    S.kind = KIND.PLAIN;
    const fm = P(f.u + f.kilnSide * (f.w / 2 + 1.2), f.v + Math.sign(f.v) * 0.1);
    S.box(fm[0], fm[1], y0 + 0.4, y0 + 1.5, 0.95, 0.25, ANG, hex('#d96828'));
    gp.push(kp[0], y0 + 1.4, kp[1]);
    gc.push(1, 0.46, 0.18);

    // showroom display along the street side: cast bronze bells, urns & drying clay molds
    const vShow = f.v - Math.sign(f.v) * (f.d / 2 + 0.5);
    for (let j = -1; j <= 1; j++) {
      const sp = P(f.u + j * 3.1, vShow);
      if (j === 0) bronzeBell(sp[0], sp[1], y0 + 0.14, 1.1);
      else if (j === -1) bronzeUrn(sp[0], sp[1], y0 + 0.14, 1.0);
      else {
        // terracotta clay casting mold drying in the sun
        S.kind = KIND.MASONRY;
        S.cyl(sp[0], sp[1], y0 + 0.14, y0 + 1.25, 0.52, 0.38, 8, C.clay);
      }
    }
    // warm foundry interior glow
    const lp = P(f.u, f.v);
    LB.box(lp[0], lp[1], y0 + 0.6, y0 + 2.2, f.w * 0.5, 0.4, ANG, [1, 1, 1]);
  }

  (S.paved = S.paved || []).push([paved0, S.n]);

  // ---- lush village garden trees ----
  if (Array.isArray(data.trees)) {
    for (let i = 0; i < 14; i++) {
      const u = -32 + i * 5.2 + (rand(i, 3) - 0.5) * 3;
      const v = (i % 2 ? 1 : -1) * (26 + rand(i, 7) * 14);
      const q = P(u, v);
      if (onStreet(q[0], q[1], 3.5)) continue;
      data.trees.push(Math.round(q[0] * 10), Math.round(q[1] * 10), 10 + Math.floor(rand(i, 11) * 4), i % 3 === 0 ? 1 : 0);
    }
  }

  if (LB.n) {
    const m = new THREE.Mesh(LB.geometry(), lightMaterial(0xff9c4a, 0.9));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
  }
  if (gp.length) {
    const pts = glowPoints(gp, gc, 3.2);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
