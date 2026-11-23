import * as THREE from 'three';
import { KIND, Buf, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial } from '../../geo/materials.js';

// Bến xe phía Bắc, 132 Lý Thái Tổ (An Hòa): the northern intercity bus station of Công ty CP Bến xe Huế (issue #71).
// See docs/places/benxebac.md.
//
// OSM maps the station as a node and one outline, way 1435288831 (building), that takes in more than the hall: a
// block of about 27 x 30 m on Lý Thái Tổ, a narrower range of about 31 x 17 m reaching west along the yard and a
// small piece behind. What the photos show (mia.vn, bookaway, 2019-25):
//   hall     two storeys, flat-roofed, painted a bright yellow under a thick white roof slab that overhangs all
//            round; a white slab between the floors with a low parapet and planters; white-framed ribbon windows;
//            a white semicircular arched window in the middle of the upper floor; a blue sign over the doors and
//            the company's name in red on the fascia (an older photo has it on a blue board on the roof)
//   canopy   a flat roof with a yellow fascia on yellow square columns over the minibus bays beside the hall
// The block on the street is drawn as the hall, the long west range as the canopy (the photos put the canopy along
// the hall's side over the bays), the piece behind as a one-storey office. No height is published; the hall's 7.7 m
// is read off the photos (two storeys against the doors and people).

export const id = 'benxebac';

// the outline in model metres (OSM way 1435288831) and a frame along it: u along Lý Thái Tổ, w towards it
const O = [-4510, -1895], A = Math.atan2(16.5, 26);
const T = [Math.cos(A), Math.sin(A)], W = [-T[1], T[0]];

const C = {
  yellow: hex('#f0c22e'), white: hex('#efeee8'), roof: hex('#a8a59d'), glass: hex('#2f3b45'), frame: hex('#f3f1ea'),
  blue: hex('#1f56a6'), red: hex('#c8202d'), green: hex('#4f6f33'), pave: hex('#b9b5ab'), door: hex('#4a3a2e'),
};

export function build({ S, group }) {
  const P = (u, w) => [O[0] + T[0] * u + W[0] * w, O[1] + T[1] * u + W[1] * w];
  const y0 = LAND_Y + rise(...P(10, 3));
  const box = (u, w, ya, yb, su, sw, col, o) => { const p = P(u, w); S.box(p[0], p[1], ya, yb, su, sw, A, col, o); };
  const LB = new Buf(256), WB = new Buf(512), BB = new Buf(64), RB = new Buf(128); // canopy lamps, windows, blue sign, red letters
  const lit = (B, u, w, ya, yb, su, sw) => { const p = P(u, w); B.box(p[0], p[1], ya, yb, su, sw, A, [1, 1, 1], { top: [1, 1, 1], bottom: true }); };
  S.base = y0 - LAND_Y;

  // ---------------- the hall: the block on Lý Thái Tổ ----------------
  const U0 = -2.6, U1 = 24.0, W0 = -12.4, W1 = 17.9, uc = (U0 + U1) / 2, wc = (W0 + W1) / 2, LU = U1 - U0, LW = W1 - W0;
  const G = 3.7, R = 7.2, SL = 0.55; // first floor, roof line, roof slab
  S.kind = KIND.MASONRY;
  box(uc, wc, y0 - 0.3, y0 + 0.3, LU + 1.2, LW + 1.2, C.pave, { topKind: KIND.ROAD });
  S.kind = KIND.CIVIC;
  box(uc, wc, y0 + 0.3, y0 + R, LU, LW, C.yellow, { top: C.roof });
  S.kind = KIND.PLAIN;
  box(uc, wc, y0 + R, y0 + R + SL, LU + 2.8, LW + 2.8, C.white, { top: C.roof, topKind: KIND.FLAT, bottom: true });
  // the slab between the floors on the front and the two sides, a low parapet with planters on it
  box(uc, W1 + 1.0, y0 + G - 0.25, y0 + G, LU + 2.0, 2.0, C.white, { bottom: true });
  box(uc, W1 + 1.9, y0 + G, y0 + G + 0.7, LU + 2.0, 0.2, C.white);
  for (const [u, s] of [[U0 - 1.0, -1], [U1 + 1.0, 1]]) {
    box(u, wc + 2, y0 + G - 0.25, y0 + G, 2.0, LW - 4, C.white, { bottom: true });
    box(u + s * 0.9, wc + 2, y0 + G, y0 + G + 0.7, 0.2, LW - 4, C.white);
  }
  for (let k = 0; k < 7; k++) { const p = P(U0 + 2 + k * (LU - 4) / 6, W1 + 1.3); S.cyl(p[0], p[1], y0 + G, y0 + G + 1.1, 0.5, 0.3, 6, C.green); }
  // a white upright at each third of the front, as in the photo, up through the slab
  for (const f of [0.3, 0.7]) box(U0 + LU * f, W1 + 1.0, y0 + G, y0 + G + 1.3, 0.5, 2.0, C.white);

  // front: ribbon windows in white frames either side of the arched window, the doors below
  const mid = uc, AR = 2.3;
  for (const s of [-1, 1]) {
    const ua = mid + s * (AR + 1.0), ub = s < 0 ? U0 + 1.0 : U1 - 1.0, um = (ua + ub) / 2, ul = Math.abs(ub - ua);
    box(um, W1 + 0.06, y0 + G + 0.9, y0 + G + 2.7, ul, 0.12, C.frame);
    box(um, W1 + 0.1, y0 + G + 1.05, y0 + G + 2.55, ul - 0.3, 0.12, C.glass);
    for (let k = 1; k < Math.round(ul / 1.6); k++) box(Math.min(ua, ub) + k * 1.6, W1 + 0.15, y0 + G + 1.05, y0 + G + 2.55, 0.1, 0.1, C.frame);
    box(um, W1 + 0.06, y0 + 0.8, y0 + G - 0.7, ul, 0.12, C.glass);
    lit(WB, um, W1 + 0.2, y0 + G + 1.15, y0 + G + 2.45, ul - 0.6, 0.05);
  }
  // the semicircular arched window: a white arch round dark glass, drawn in vertical strips
  {
    const yA = y0 + G + 1.0, NS = 12;
    box(mid, W1 + 0.06, yA - 0.15, yA + 1.4, 2 * AR + 0.4, 0.12, C.frame);
    box(mid, W1 + 0.1, yA, yA + 1.4, 2 * AR, 0.12, C.glass);
    for (let k = 0; k < NS; k++) {
      const x = -AR + (k + 0.5) * (2 * AR / NS), h = Math.sqrt(AR * AR - x * x), hf = Math.sqrt((AR + 0.3) ** 2 - x * x);
      box(mid + x, W1 + 0.06, yA + 1.4, yA + 1.4 + hf * 0.62, 2 * AR / NS + 0.02, 0.12, C.frame);
      box(mid + x, W1 + 0.1, yA + 1.4, yA + 1.4 + h * 0.62 - 0.05, 2 * AR / NS + 0.02, 0.12, C.glass);
    }
    for (const x of [-AR / 2, 0, AR / 2]) box(mid + x, W1 + 0.15, yA, yA + 1.4 + Math.sqrt(AR * AR - x * x) * 0.62 - 0.1, 0.1, 0.1, C.frame);
    lit(WB, mid, W1 + 0.2, yA + 0.1, yA + 2.6, 2 * AR - 0.8, 0.05);
  }
  // the doors and the blue sign over them
  box(mid, W1 + 0.06, y0 + 0.3, y0 + G - 0.8, 4.4, 0.14, C.door);
  box(mid, W1 + 0.1, y0 + 0.4, y0 + G - 1.0, 3.6, 0.12, C.glass);
  lit(WB, mid, W1 + 0.18, y0 + 0.5, y0 + G - 1.1, 3.2, 0.05);
  box(mid, W1 + 0.1, y0 + G - 0.8, y0 + G - 0.3, 9.0, 0.16, C.blue);
  lit(BB, mid, W1 + 0.2, y0 + G - 0.7, y0 + G - 0.4, 7.6, 0.04);
  // the company's name in red letters on the fascia
  {
    const word = 'BEN XE HUE', lw = 0.62;
    for (let k = 0; k < word.length; k++) {
      if (word[k] === ' ') continue;
      const u = mid + (k - (word.length - 1) / 2) * lw;
      box(u, W1 + 1.45, y0 + R + 0.07, y0 + R + 0.48, lw * 0.72, 0.08, C.red);
      lit(RB, u, W1 + 1.5, y0 + R + 0.07, y0 + R + 0.48, lw * 0.72, 0.04);
    }
  }
  // side walls and back: ribbon windows upstairs, a few lit
  for (const [u, s] of [[U0, -1], [U1, 1]]) {
    const p = P(u + s * 0.06, wc + 2), q = P(u + s * 0.1, wc + 2);
    S.box(p[0], p[1], y0 + G + 0.9, y0 + G + 2.7, 0.12, LW - 8, A, C.frame);
    S.box(q[0], q[1], y0 + G + 1.05, y0 + G + 2.55, 0.12, LW - 8.3, A, C.glass);
    const r = P(u + s * 0.18, wc + 2);
    WB.box(r[0], r[1], y0 + G + 1.15, y0 + G + 2.45, 0.05, LW - 12, A, [1, 1, 1], { top: [1, 1, 1] });
  }
  box(uc, W0 - 0.06, y0 + G + 1.0, y0 + G + 2.6, LU - 6, 0.12, C.glass);

  // ---------------- the canopy over the bays: the long range west of the hall ----------------
  {
    const a0 = -33.3, a1 = U0, b0 = -5.5, b1 = 11.7, cu = (a0 + a1) / 2, cw = (b0 + b1) / 2, lu = a1 - a0, lw = b1 - b0, CY = y0 + 4.6;
    S.kind = KIND.PLAIN;
    box(cu, cw, CY, CY + 0.3, lu, lw, C.roof, { topKind: KIND.FLAT, bottom: true });
    box(cu, cw, CY + 0.3, CY + 0.9, lu + 0.3, lw + 0.3, C.yellow, { top: C.roof });
    box(cu, cw, CY + 0.32, CY + 0.9, lu - 0.3, lw - 0.3, C.roof, { top: C.roof }); // the roof sheet inside the fascia
    const nu = Math.max(3, Math.round(lu / 6.2));
    for (let k = 0; k <= nu; k++) {
      const u = a0 + 0.4 + ((lu - 0.8) * k) / nu;
      for (const w of [b0 + 0.4, b1 - 0.4]) {
        if (k === nu && w > 0) continue; // the hall's wall carries this corner
        box(u, w, y0, CY, 0.5, 0.5, C.yellow);
      }
      if (k < nu) lit(LB, u + (lu - 0.8) / nu / 2, cw, CY - 0.06, CY - 0.01, 1.4, 0.3);
    }
  }

  // ---------------- the one-storey office behind ----------------
  {
    const a0 = -24.8, a1 = -8.3, b0 = -15.7, b1 = -5.5, cu = (a0 + a1) / 2, cw = (b0 + b1) / 2, lu = a1 - a0, lw = b1 - b0;
    S.kind = KIND.CIVIC;
    box(cu, cw, y0, y0 + 3.8, lu, lw, C.yellow, { top: C.roof });
    S.kind = KIND.PLAIN;
    box(cu, cw, y0 + 3.8, y0 + 4.25, lu + 1.2, lw + 1.2, C.white, { top: C.roof, topKind: KIND.FLAT, bottom: true });
    box(cu, b0 - 0.06, y0 + 1.2, y0 + 2.6, lu - 3, 0.12, C.glass);
  }

  // ---------------- concrete bus yard, teal boarding shelter & parked intercity buses (matching satellite) ----------------
  {
    const yard0 = S.n;
    S.kind = KIND.ROAD;
    // concrete yard west and north of the terminal hall (covering both the canopy bays and the main yard)
    box(-10, -28, y0 - 0.2, y0 + 0.08, 66, 36, hex('#b8b4aa'), { topKind: KIND.ROAD });
    box(-18, 2.5, y0 - 0.2, y0 + 0.08, 34, 19, hex('#b8b4aa'), { topKind: KIND.ROAD });
    (S.paved = S.paved || []).push([yard0, S.n]);
    // teal-green pitched boarding shelter along the north-east edge of the yard (prominent on satellite)
    S.kind = KIND.PLAIN;
    const shU = 12, shW = -34, shL = 32, shD = 8.5, shY = y0 + 4.8;
    box(shU, shW, shY, shY + 0.45, shL, shD, hex('#3a756c'), { top: hex('#43847a'), topKind: KIND.FLAT, bottom: true });
    for (let k = 0; k <= 5; k++) {
      const u = shU - shL / 2 + 0.8 + (k * (shL - 1.6)) / 5;
      for (const dw of [-shD / 2 + 0.6, shD / 2 - 0.6]) box(u, shW + dw, y0, shY, 0.42, 0.42, C.white);
      if (k < 5) lit(LB, u + (shL - 1.6) / 10, shW, shY - 0.08, shY - 0.02, 1.4, 0.3);
    }
    // parked sleeper buses and minibuses in neat bays across the yard
    const busCols = [hex('#e66824'), hex('#2c62a8'), hex('#d9382a'), hex('#eceae2'), hex('#3d7a5a'), hex('#e66824')];
    const bus = (u, w, angOff, col, len = 11.2, wid = 2.5, h = 3.45) => {
      const p = P(u, w), ba = A + angOff;
      S.kind = KIND.PLAIN;
      S.box(p[0], p[1], y0 + 0.35, y0 + h, len, wid, ba, col, { top: C.white });
      S.box(p[0], p[1], y0 + 1.6, y0 + h - 0.45, len - 0.3, wid + 0.04, ba, C.glass);
      S.box(p[0], p[1], y0 + h, y0 + h + 0.3, len * 0.4, wid * 0.6, ba, C.white);
      for (const s of [-len * 0.3, len * 0.3]) {
        S.box(p[0] + Math.cos(ba) * s, p[1] + Math.sin(ba) * s, y0 + 0.08, y0 + 0.8, 0.85, wid + 0.06, ba, hex('#232527'));
      }
    };
    for (let k = 0; k < 5; k++) bus(-31 + k * 5.6, 3.0, Math.PI / 2, busCols[k % busCols.length], 8.6, 2.3, 3.0);
    for (let k = 0; k < 6; k++) bus(-32 + k * 6.0, -24.5, Math.PI / 2 + 0.15, busCols[(k + 1) % busCols.length]);
    for (let k = 0; k < 5; k++) bus(0 + k * 5.6, -24.5, Math.PI / 2, busCols[(k + 3) % busCols.length]);
    // yard floodlight masts
    for (const [u, w] of [[-38, -14], [-38, -40], [20, -40]]) {
      const p = P(u, w);
      S.cyl(p[0], p[1], y0, y0 + 11.0, 0.16, 0.1, 6, hex('#6c7175'));
      S.box(p[0], p[1], y0 + 10.9, y0 + 11.25, 1.3, 0.4, A, hex('#d8dce0'));
      lit(LB, u, w, y0 + 10.7, y0 + 10.9, 1.1, 0.35);
    }
  }

  for (const [B, col, boost] of [[LB, 0xf2f6ff, 1.2], [WB, 0xffd9a0, 0.9], [BB, 0xe8f0ff, 1.3], [RB, 0xff3040, 1.6]]) {
    if (!B.n) continue;
    const m = new THREE.Mesh(B.geometry(), lightMaterial(col, boost));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
