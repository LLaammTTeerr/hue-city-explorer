import { KIND, Buf, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial } from '../../geo/materials.js';

// Chợ Bến Ngự, 47 Phan Bội Châu, on the corner of Phan Đình Phùng by cầu Bến Ngự and the An Cựu canal. Sources and
// estimates: docs/places/benngu.md.
//
// The market as the 2020s aerial imagery and street-level photos show it:
//   hall     a 35.8 x 30.8 m roof (the satellite's roof edges; OSM way 513649271 reads 38.9 x 34 m) under three
//            parallel grey sheet-steel gables whose ridges run east-south-east, the middle one wider and taller.
//            The front on Phan Bội Châu is three red-brown gable walls trimmed in pale yellow, a pentagonal glazed
//            clerestory in each, a projecting entrance porch with the market's name, and stall awnings either side.
//            The other sides are cream, two storeys of stall bays with a band of white louvres above.
//   sheds    a single-storey stall shed (survey 6 m) along the hall's east side behind a strip of translucent
//            sheeting, ridge along its length and hipped at the canal end; at its north end it turns west, and
//            lower roofs fill the corner north-east of the hall
//   yards    the front yard on Phan Bội Châu, and beige stall awnings along the south wall toward the canal road
//            (the canal itself, its embankment and the bridge are not drawn here)
//
// Frame: origin A, 0.1 m outside the hall roof's north-west corner; u along the north side (bearing 111, east-south-
// east), v at right angles to it (south-south-west, toward the canal). Box angle ANG makes a box's local x run along u
// and local z along v. A and the 21 degree axis are fitted to the satellite roof edges.
export const id = 'benngu';

const A = [-536.22, 1488.87];
const T = [0.93358, 0.35837], N = [-0.35837, 0.93358];
const ANG = Math.atan2(T[1], T[0]);
const P = (u, v) => [A[0] + T[0] * u + N[0] * v, A[1] + T[1] * u + N[1] * v];
const Y0 = LAND_Y + rise(...P(18, 16)); // one floor level for the whole market (the site is flat)

const C = {
  wall: hex('#e0cf98'), front: hex('#a4604e'), trim: hex('#e6d58c'), plinth: hex('#8c8679'), shutter: hex('#6f7f86'),
  dark: hex('#2e2a26'), glass: hex('#3a4448'), vent: hex('#e8e4d8'), roof: hex('#8f9597'), roofLight: hex('#b8bcbb'),
  rust: hex('#8a6a55'), clear: hex('#9fb8c2'), pave: hex('#a9a294'), signBrown: hex('#6e2c22'), signRed: hex('#c0261f'),
  awning: [hex('#d6cbb0'), hex('#c9bb98'), hex('#e0dccf'), hex('#cdbf9f')], post: hex('#5d5f5f'), table: hex('#7a6248'),
  board: [hex('#2f7a4a'), hex('#e6e2d6'), hex('#d9a82c'), hex('#3a5f9e')],
};

function boxUV(S, u0, u1, v0, v1, a, b, col, opt) {
  const p = P((u0 + u1) / 2, (v0 + v1) / 2);
  S.box(p[0], p[1], Y0 + a, Y0 + b, u1 - u0, v1 - v0, ANG, col, opt);
}
const W3 = (u, v, y) => { const p = P(u, v); return [p[0], Y0 + y, p[1]]; };
const UV = (u, v, y, swap) => (swap ? W3(v, u, y) : W3(u, v, y));

// a gable roof over a0..a1 (along the ridge) x b0..b1 (across it, eaves included), eave at e, ridge at e + h. alongV
// runs the ridge along v instead of u. hip1 hips the a1 end (the ridge stops half a span short of it).
function gable(S, a0, a1, b0, b1, e, h, col, { alongV = false, hip1 = false } = {}) {
  const bm = (b0 + b1) / 2, half = (b1 - b0) / 2, r1 = hip1 ? a1 - half : a1;
  const ax = alongV ? N : T, bx = alongV ? T : N;
  const n0 = [-bx[0], 0.8, -bx[1]], n1 = [bx[0], 0.8, bx[1]], ne = [ax[0], 0.8, ax[1]];
  const p = (a, b, y) => UV(a, b, y, alongV);
  S.quad(p(a0, b0, e), p(a1, b0, e), p(r1, bm, e + h), p(a0, bm, e + h), col, n0);
  S.quad(p(a1, b1, e), p(a0, b1, e), p(a0, bm, e + h), p(r1, bm, e + h), col, n1);
  if (hip1) S.tri(p(a1, b0, e), p(a1, b1, e), p(r1, bm, e + h), col, ne);
  // the sheet's thickness at the eaves, so the roof does not read as paper from below
  S.quad(p(a0, b0, e - 0.12), p(a1, b0, e - 0.12), p(a1, b0, e), p(a0, b0, e), shade(col, 0.6), n0);
  S.quad(p(a1, b1, e - 0.12), p(a0, b1, e - 0.12), p(a0, b1, e), p(a1, b1, e), shade(col, 0.6), n1);
}

// the end wall of a gable in the plane u = u, over v0..v1 of a gable spanning g.v0..g.v1, from height y0 up to the
// rake (a quad up to the eave line and the triangle above it); s is the side it faces (-1 west, +1 east)
function gableFace(S, u, g, v0, v1, y0, col, s, lift = 0) {
  const vm = (g.v0 + g.v1) / 2, half = (g.v1 - g.v0) / 2;
  const y = (v) => g.e + lift + g.h * (1 - Math.abs(v - vm) / half);
  const n = [T[0] * s, 0, T[1] * s];
  S.quad(W3(u, v0, y0), W3(u, v1, y0), W3(u, v1, y(v1)), W3(u, v0, y(v0)), col, n);
  S.tri(W3(u, v0, y(v0)), W3(u, v1, y(v1)), W3(u, vm, y(vm)), col, n);
}

// a single-storey stall shed: low walls open in bays, a sheet roof (ridge along u, or along v with alongV)
function shed(S, u0, u1, v0, v1, e, h, roof, opt = {}) {
  S.kind = KIND.PLAIN;
  boxUV(S, u0 + 0.4, u1 - 0.4, v0 + 0.4, v1 - 0.4, 0, e, C.wall, { top: shade(C.wall, 0.7) });
  boxUV(S, u0 + 0.35, u1 - 0.35, v0 + 0.35, v1 - 0.35, 0, 2.6, C.shutter); // roller shutters and open stall fronts
  boxUV(S, u0 + 0.3, u1 - 0.3, v0 + 0.3, v1 - 0.3, 2.6, 2.8, C.trim);
  if (opt.alongV) gable(S, v0, v1, u0, u1, e, h, roof, opt);
  else gable(S, u0, u1, v0, v1, e, h, roof, opt);
}

export function build({ S, group, THREE }) {
  // ---- ground: the market's paving, front yard to canal road (thin, so the street trees keep their place) ----
  S.kind = KIND.GROUND;
  const pave = [P(-12.5, -1.5), P(48, -1.5), P(48, 39.5), P(-14.5, 39.5)];
  S.prism(pave, Y0 - 0.3, Y0 + 0.08, C.plinth, C.pave);

  // ---- the main hall: walls 7 m to the eaves; three steel gables, the middle one wider and higher ----
  const U0 = 0.6, U1 = 35.0, V0 = 1.0, V1 = 30.6, E = 7.0;
  const G = [{ v0: 0.4, v1: 9.7, e: 7.0, h: 1.8 }, { v0: 9.7, v1: 20.8, e: 7.4, h: 2.4 }, { v0: 20.8, v1: 31.2, e: 7.0, h: 1.8 }];
  S.kind = KIND.CIVIC;
  boxUV(S, U0, U1, V0, V1, 0, E, C.wall, { top: shade(C.wall, 0.6) });
  S.kind = KIND.PLAIN;
  boxUV(S, U0 - 0.15, U1 + 0.15, V0 - 0.15, V1 + 0.15, 0, 0.45, C.plinth); // the step of the stall floor
  // the side walls (north and south, cream): stall bays behind roller shutters, a band of white louvres above
  const bays = (len, step) => { const n = Math.max(1, Math.round(len / step)); return { n, s: len / n }; };
  {
    const { n, s } = bays(U1 - U0, 3.6);
    for (let i = 0; i < n; i++) {
      const a = U0 + i * s + 0.3, b = U0 + (i + 1) * s - 0.3;
      boxUV(S, a, b, V0 - 0.06, V0, 0.45, 3.2, C.shutter);
      boxUV(S, a, b, V1, V1 + 0.06, 0.45, 3.2, C.shutter);
      boxUV(S, a + 0.2, b - 0.2, V0 - 0.05, V0, 4.5, 6.2, C.vent);
      boxUV(S, a + 0.2, b - 0.2, V1, V1 + 0.05, 4.5, 6.2, C.vent);
    }
  }
  {
    // the back (east, onto the passage by the shed): stalls below, louvres above
    const { n, s } = bays(V1 - V0, 3.6);
    for (let i = 0; i < n; i++) {
      const a = V0 + i * s + 0.3, b = V0 + (i + 1) * s - 0.3;
      boxUV(S, U1, U1 + 0.06, a, b, 0.45, 3.2, C.shutter);
      boxUV(S, U1, U1 + 0.05, a + 0.2, b - 0.2, 4.5, 6.2, C.vent);
    }
  }
  for (const y of [3.6, 6.75]) {
    boxUV(S, U0 + 0.2, U1 + 0.12, V0 - 0.12, V0, y, y + 0.25, C.trim);
    boxUV(S, U0 + 0.2, U1 + 0.12, V1, V1 + 0.12, y, y + 0.25, C.trim);
    boxUV(S, U1, U1 + 0.12, V0, V1, y, y + 0.25, C.trim);
  }

  // the roofs, their gable walls (red-brown on the front, cream at the back) and the step where the middle gable's
  // higher eaves meet the side gables
  for (const g of G) {
    gable(S, U0 - 0.7, U1 + 0.7, g.v0, g.v1, g.e, g.h, C.roof);
    const v0 = Math.max(g.v0, V0 - 0.08), v1 = Math.min(g.v1, V1 + 0.08);
    gableFace(S, U0 - 0.08, g, v0, v1, E - 0.01, C.front, -1);
    gableFace(S, U1 + 0.01, g, Math.max(g.v0, V0), Math.min(g.v1, V1), E - 0.01, C.wall, 1);
    // the pale yellow trim along the front rakes
    const vm = (g.v0 + g.v1) / 2, half = (g.v1 - g.v0) / 2, y = (v) => g.e + g.h * (1 - Math.abs(v - vm) / half);
    for (const vv of [v0, v1]) S.beam(W3(U0 - 0.2, vv, y(vv) + 0.1), W3(U0 - 0.2, vm, g.e + g.h + 0.1), 0.3, 0.3, C.trim);
  }
  for (const vv of [G[1].v0, G[1].v1]) {
    boxUV(S, U0 - 0.7, U1 + 0.7, vv - 0.15, vv + 0.15, E - 0.15, G[1].e + 0.02, shade(C.roof, 0.7)); // valley gutter
  }
  // the front cornice band and a plinth course under the gables
  boxUV(S, U0 - 0.25, U0 - 0.05, V0 - 0.1, V1 + 0.1, E - 0.3, E, C.trim);
  boxUV(S, U0 - 0.12, U0, V0 - 0.1, V1 + 0.1, 0.45, 0.9, shade(C.front, 0.75));
  // the red front wall below the gables
  boxUV(S, U0 - 0.08, U0, V0 - 0.08, V1 + 0.08, 0.45, E, C.front);

  // the clerestories: a pentagon of glazing in each front gable, framed in pale yellow, with a grid of glazing bars
  const pent = (u, va, vb, yb, ys, yp, col, s) => {
    const n = [T[0] * s, 0, T[1] * s], vm = (va + vb) / 2;
    S.quad(W3(u, va, yb), W3(u, vb, yb), W3(u, vb, ys), W3(u, va, ys), col, n);
    S.tri(W3(u, va, ys), W3(u, vb, ys), W3(u, vm, yp), col, n);
  };
  for (const [i, g] of G.entries()) {
    const mid = i === 1, vm = (g.v0 + g.v1) / 2, hw = mid ? 3.7 : 2.6;
    const yb = mid ? 4.2 : 4.6, ys = yb + (mid ? 1.4 : 1.0), yp = g.e + g.h * (mid ? 0.1 : 0.0);
    pent(U0 - 0.12, vm - hw - 0.25, vm + hw + 0.25, yb - 0.25, ys + 0.05, yp + 0.3, C.trim, -1);
    pent(U0 - 0.15, vm - hw, vm + hw, yb, ys, yp, C.glass, -1);
    const nb = mid ? 8 : 5;
    for (let k = 1; k < nb; k++) {
      const v = vm - hw + (2 * hw * k) / nb, top = ys + (yp - ys) * (1 - Math.abs(v - vm) / hw);
      boxUV(S, U0 - 0.2, U0 - 0.15, v - 0.04, v + 0.04, yb, top, C.trim);
    }
    boxUV(S, U0 - 0.2, U0 - 0.15, vm - hw, vm + hw, ys - 0.04, ys + 0.04, C.trim);
  }

  // the entrance porch under the middle gable: a projecting red-brown block with pale pilasters, the market's name in
  // gold on a brown band and a red banner above it
  const vm = (G[1].v0 + G[1].v1) / 2, PW = 2.5, PD = 1.1;
  S.kind = KIND.CIVIC;
  boxUV(S, U0 - PD, U0, vm - PW, vm + PW, 0.45, 5.0, C.front, { top: shade(C.front, 0.7) });
  S.kind = KIND.PLAIN;
  boxUV(S, U0 - PD - 0.02, U0 - PD + 0.3, vm - 1.7, vm + 1.7, 0.08, 3.3, C.dark); // the open entrance
  for (const s of [-1, 1]) boxUV(S, U0 - PD - 0.06, U0 - PD + 0.2, vm + s * 2.1 - 0.3, vm + s * 2.1 + 0.3, 0.08, 4.4, C.trim);
  boxUV(S, U0 - PD - 0.08, U0 - PD, vm - 2.4, vm + 2.4, 3.45, 4.3, C.signBrown);
  boxUV(S, U0 - PD - 0.9, U0 - PD, vm - 2.0, vm + 2.0, 0.08, 0.3, C.plinth); // entrance steps
  boxUV(S, U0 - PD - 0.5, U0 - PD, vm - 2.0, vm + 2.0, 0.3, 0.5, C.plinth);
  for (const [d, c] of [[-1.6, C.signRed], [-0.8, C.board[2]], [0.8, C.signRed], [1.6, C.board[2]]]) boxUV(S, U0 - PD - 0.1, U0 - PD, vm + d - 0.3, vm + d + 0.3, 5.05, 5.9, c); // flags over the porch
  boxUV(S, U0 - PD - 0.08, U0 - PD, vm - 2.4, vm + 2.4, 4.4, 4.95, C.signRed);

  // stall awnings along the front, either side of the porch, with the stalls' signboards above them
  let k = 0;
  const frontAwning = (v0, v1) => {
    for (let v = v0; v < v1 - 1; v += 4.2, k++) {
      const a = v, b = Math.min(v + 4.0, v1), col = C.awning[k % C.awning.length];
      S.quad(W3(U0 - 0.1, a, 3.2), W3(U0 - 0.1, b, 3.2), W3(U0 - 3.6, b, 2.5), W3(U0 - 3.6, a, 2.5), col, [-0.2, 1, 0]);
      S.quad(W3(U0 - 0.1, b, 3.18), W3(U0 - 0.1, a, 3.18), W3(U0 - 3.6, a, 2.48), W3(U0 - 3.6, b, 2.48), shade(col, 0.6), [0, -1, 0]);
      boxUV(S, U0 - 0.25, U0 - 0.08, a + 0.2, b - 0.2, 3.35, 4.1, C.board[k % C.board.length]);
      boxUV(S, U0 - 0.3, U0 - 0.08, a + 0.2, b - 0.2, 0.45, 3.1, C.dark);
      for (const vv of [a + 0.1, b - 0.1]) boxUV(S, U0 - 3.55, U0 - 3.45, vv - 0.05, vv + 0.05, 0.08, 2.5, C.post);
    }
  };
  frontAwning(V0 + 0.2, vm - PW - 0.2);
  frontAwning(vm + PW + 0.2, V1 - 0.2);

  // ---- the stall sheds: along the east side (hipped at the canal end), turning west at the north end; lower roofs
  // in the corner north-east of the hall (light, flat, and one light gable ridged north-south) ----
  const SE = 4.4, SH = 1.4;
  shed(S, 38.9, 47.1, -12.1, 31.2, SE, SH, C.roof, { alongV: true, hip1: true });
  shed(S, 31.5, 38.9, -12.1, -7.1, SE, 1.0, C.roof);
  shed(S, 31.5, 47.9, -17.5, -12.1, 4.6, 1.6, C.roof); // the satellite shows it to v -23.6; cut back off the mapped lane
  shed(S, 20.7, 31.5, -16.8, -0.5, 5.0, 1.8, C.roofLight, { alongV: true });
  S.kind = KIND.PLAIN;
  boxUV(S, 31.5, 38.9, -7.1, 0.3, 0, 4.0, C.wall, { top: C.roofLight }); // a flat-roofed stall block
  // the translucent sheeting over the passage between the hall and the east shed
  boxUV(S, U1, 39.1, -0.6, 31.2, 5.95, 6.05, C.clear);
  for (let v = 2; v < 31; v += 6) boxUV(S, U1 + 0.2, U1 + 0.45, v - 0.12, v + 0.12, 0, 5.95, C.post);

  // ---- the south row: stalls under beige awnings sloping from the south wall toward the canal road ----
  const paved0 = S.n;
  for (let u = 1.0; u < 46.5; u += 4.4, k++) {
    const col = C.awning[k % C.awning.length], a = u, b = Math.min(u + 4.2, 46.9);
    for (const uu of [a + 0.1, b - 0.1]) boxUV(S, uu - 0.05, uu + 0.05, 35.75, 35.85, 0.08, 2.4, C.post);
    S.quad(W3(a, V1 + 0.1, 3.2), W3(b, V1 + 0.1, 3.2), W3(b, 35.9, 2.4), W3(a, 35.9, 2.4), col, [0, 1, 0.15]);
    S.quad(W3(b, V1 + 0.1, 3.18), W3(a, V1 + 0.1, 3.18), W3(a, 35.9, 2.38), W3(b, 35.9, 2.38), shade(col, 0.6), [0, -1, 0]);
    boxUV(S, a + 0.4, b - 0.4, 32.0, 34.0, 0.08, 0.85, C.table, { top: shade(C.table, 1.2) });
  }
  (S.paved = S.paved || []).push([paved0, S.n]); // the stall row: no trees, no houses (src/geo/city.js coverOf)
  S.kind = KIND.PLAIN;

  if (!group) return null;
  // the porch's name, and its glow after dark
  const LW = 4.4, LH = LW * 64 / 512;
  const rot = Math.atan2(-T[0], -T[1]);
  const mk = (mat, off, order) => {
    const q = P(U0 - PD - 0.1 - off, vm);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), mat);
    m.position.set(q[0], Y0 + 3.88, q[1]);
    m.rotation.y = rot;
    m.userData.landmark = 'benngu';
    if (order) m.renderOrder = order;
    group.add(m);
  };
  mk(new THREE.MeshStandardMaterial({ map: letters(THREE, '#f2c64a'), transparent: true, alphaTest: 0.4, roughness: 0.6, metalness: 0 }), 0, 0);
  mk(new THREE.MeshBasicMaterial({ map: letters(THREE, '#ffd870'), transparent: true, depthWrite: false, opacity: 0, toneMapped: false }), 0.03, 19);
  const glowMesh = group.children[group.children.length - 1];
  // warm light in the porch and along the awnings after dark
  const L = new Buf(120);
  const line = (u0, v0, u1, v1, y) => L.beam(W3(u0, v0, y), W3(u1, v1, y), 0.12, 0.12, [1, 1, 1]);
  line(U0 - PD - 0.1, vm - 1.6, U0 - PD - 0.1, vm + 1.6, 3.35);
  line(U0 - 0.3, V0 + 0.4, U0 - 0.3, vm - PW - 0.3, 3.0);
  line(U0 - 0.3, vm + PW + 0.3, U0 - 0.3, V1 - 0.4, 3.0);
  line(1.2, V1 + 0.3, 46.5, V1 + 0.3, 3.0);
  const lm = new THREE.Mesh(L.geometry(), lightMaterial(0xffc068, 1.3));
  lm.renderOrder = 19;
  lm.userData.landmark = 'benngu';
  group.add(lm);
  return { update(time, glow) { glowMesh.material.opacity = Math.min(1, glow); } };
}

// the market's name in gold capitals on a clear background (512 x 64)
function letters(THREE, color) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 64;
  const g = cv.getContext('2d');
  const text = 'CHỢ BẾN NGỰ'.normalize('NFC');
  let px = 44;
  const font = () => `900 ${px}px "Helvetica Neue", Arial, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
  g.font = font();
  const tw = g.measureText(text).width;
  if (tw > 470) { px *= 470 / tw; g.font = font(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, 256, 36);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
