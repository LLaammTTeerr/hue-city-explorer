import { KIND, Buf, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial } from '../../geo/materials.js';

// Chợ Bến Ngự, 47 Phan Bội Châu, on the corner of Phan Đình Phùng by cầu Bến Ngự and the An Cựu canal. Sources and
// estimates: docs/places/benngu.md.
//
// The market as the GISHue drone survey and the 2020s aerial imagery show it:
//   hall     the main hall on OSM way 513649271 (38.9 x 34 m), under four parallel grey sheet-steel gables whose
//            ridges run east-south-east, gable ends to Phan Bội Châu (the survey reads 10 m over the whole roof)
//   east     a single-storey stall shed (survey 6 m) along the hall's east side, its light roof joined to the hall by
//            a strip of translucent sheeting, and turning west along the north side of the hall
//   yards    the front yard on Phan Bội Châu under its big trees, and a row of tarp-covered stalls along the south
//            side toward the canal road (the canal itself, its embankment and the bridge are not drawn here)
//
// Frame: origin A, the hall's north-west corner; u along the north-east side (east-south-east), v at right angles to
// it (south-south-west, toward the canal). Box angle ANG makes a box's local x run along u and local z along v.
export const id = 'benngu';

const A = [-537.0, 1490.8];
const T = [0.93874, 0.34463], N = [-0.34463, 0.93874];
const ANG = Math.atan2(T[1], T[0]);
const P = (u, v) => [A[0] + T[0] * u + N[0] * v, A[1] + T[1] * u + N[1] * v];
const Y0 = LAND_Y + rise(...P(19, 17)); // one floor level for the whole market (the site is flat)

const C = {
  wall: hex('#e0cf98'), trim: hex('#f1ebd9'), plinth: hex('#8c8679'), shutter: hex('#6f7f86'), dark: hex('#2e2a26'),
  vent: hex('#b5a477'), roof: hex('#8f9597'), roofLight: hex('#b8bcbb'), clear: hex('#9fb8c2'), pave: hex('#a9a294'),
  signRed: hex('#b8201e'), signGold: hex('#f2c64a'), tarp: [hex('#3f6fa8'), hex('#d8d3c4'), hex('#c54a32'), hex('#3d8a6a')],
  post: hex('#5d5f5f'), table: hex('#7a6248'),
};

function boxUV(S, u0, u1, v0, v1, a, b, col, opt) {
  const p = P((u0 + u1) / 2, (v0 + v1) / 2);
  S.box(p[0], p[1], Y0 + a, Y0 + b, u1 - u0, v1 - v0, ANG, col, opt);
}
const W3 = (u, v, y) => { const p = P(u, v); return [p[0], Y0 + y, p[1]]; };

// a gable roof whose ridge runs along u, over u0..u1 x v0..v1 (eaves included), eave at height e, ridge at e + h;
// gableCol fills the two end triangles (set back by `inset` so the roof overhangs them)
function gableU(S, u0, u1, v0, v1, e, h, col, gableCol, inset = 0.5) {
  const vm = (v0 + v1) / 2, n0 = [-N[0], 0.8, -N[1]], n1 = [N[0], 0.8, N[1]];
  S.quad(W3(u0, v0, e), W3(u1, v0, e), W3(u1, vm, e + h), W3(u0, vm, e + h), col, n0);
  S.quad(W3(u1, v1, e), W3(u0, v1, e), W3(u0, vm, e + h), W3(u1, vm, e + h), col, n1);
  // the sheet's thickness at the eaves, so the roof does not read as paper from below
  S.quad(W3(u0, v0, e - 0.12), W3(u1, v0, e - 0.12), W3(u1, v0, e), W3(u0, v0, e), shade(col, 0.6), n0);
  S.quad(W3(u1, v1, e - 0.12), W3(u0, v1, e - 0.12), W3(u0, v1, e), W3(u1, v1, e), shade(col, 0.6), n1);
  if (!gableCol) return;
  const k = h / ((v1 - v0) / 2), ve0 = v0 + inset, ve1 = v1 - inset, ee = e + k * inset, he = h - k * inset;
  for (const [u, s] of [[u0 + inset, -1], [u1 - inset, 1]]) {
    S.tri(W3(u, ve0, ee - 0.01), W3(u, ve1, ee - 0.01), W3(u, vm, ee + he - 0.01), gableCol, [T[0] * s, 0, T[1] * s]);
  }
}

// a single-storey stall shed: low walls open in bays, a sheet roof in gables along u
function shed(S, u0, u1, v0, v1, e, h, roof) {
  S.kind = KIND.PLAIN;
  boxUV(S, u0 + 0.4, u1 - 0.4, v0 + 0.4, v1 - 0.4, 0, e, C.wall, { top: shade(C.wall, 0.7) });
  boxUV(S, u0 + 0.35, u1 - 0.35, v0 + 0.35, v1 - 0.35, 0, 2.6, C.shutter); // roller shutters and open stall fronts
  boxUV(S, u0 + 0.3, u1 - 0.3, v0 + 0.3, v1 - 0.3, 2.6, 2.8, C.trim);
  gableU(S, u0, u1, v0, v1, e, h, roof, C.wall, 0.4);
}

export function build({ S, group, THREE }) {
  // ---- ground: the market's paving, front yard to canal road (thin, so the street trees keep their place) ----
  S.kind = KIND.GROUND;
  const pave = [P(-12.5, -1.5), P(50, -1.5), P(50, 41.5), P(-14.5, 41.5)];
  S.prism(pave, Y0 - 0.3, Y0 + 0.08, C.plinth, C.pave);

  // ---- the main hall: walls 7.2 m to the eaves, four steel gables to 9.6 m ----
  const U0 = 0.6, U1 = 38.0, V0 = 1.0, V1 = 32.6, E = 7.2, H = 2.4, NB = 4;
  S.kind = KIND.CIVIC;
  boxUV(S, U0, U1, V0, V1, 0, E, C.wall, { top: shade(C.wall, 0.6) });
  S.kind = KIND.PLAIN;
  boxUV(S, U0 - 0.15, U1 + 0.15, V0 - 0.15, V1 + 0.15, 0, 0.45, C.plinth); // the step of the stall floor
  // ground storey: stall bays behind roller shutters between pilasters, a cornice band at 3.8 m
  const bays = (len, step) => { const n = Math.max(1, Math.round(len / step)); return { n, s: len / n }; };
  {
    const { n, s } = bays(U1 - U0, 3.6);
    for (let i = 0; i < n; i++) {
      const a = U0 + i * s + 0.3, b = U0 + (i + 1) * s - 0.3;
      boxUV(S, a, b, V0 - 0.06, V0, 0.45, 3.2, C.shutter);
      boxUV(S, a, b, V1, V1 + 0.06, 0.45, 3.2, C.shutter);
      boxUV(S, a + 0.2, b - 0.2, V0 - 0.05, V0, 4.6, 6.4, C.vent); // the upper wall's ventilation-block panels
      boxUV(S, a + 0.2, b - 0.2, V1, V1 + 0.05, 4.6, 6.4, C.vent);
    }
  }
  {
    const { n, s } = bays(V1 - V0, 3.6), mid = (n - 1) / 2;
    for (let i = 0; i < n; i++) {
      const a = V0 + i * s + 0.3, b = V0 + (i + 1) * s - 0.3, door = Math.abs(i - mid) < 1;
      // the front on Phan Bội Châu (u0): the central bays are the open entrance; the back (u1) is all stalls
      boxUV(S, U0 - 0.06, U0, a, b, door ? 0 : 0.45, 3.2, door ? C.dark : C.shutter);
      boxUV(S, U1, U1 + 0.06, a, b, 0.45, 3.2, C.shutter);
      boxUV(S, U0 - 0.05, U0, a + 0.2, b - 0.2, 4.6, 6.4, C.vent);
      boxUV(S, U1, U1 + 0.05, a + 0.2, b - 0.2, 4.6, 6.4, C.vent);
    }
  }
  for (const y of [3.6, 7.0]) boxUV(S, U0 - 0.12, U1 + 0.12, V0 - 0.12, V1 + 0.12, y, y + 0.25, C.trim);
  // the roofs: four gables side by side across v, gable ends east and west; a gutter in each valley
  const w = (V1 - V0 + 1.2) / NB;
  for (let i = 0; i < NB; i++) {
    const v0 = V0 - 0.6 + i * w, v1 = v0 + w;
    gableU(S, U0 - 0.7, U1 + 0.7, v0, v1, E, H, C.roof, C.wall, 0.7);
    // a louvred vent in each gable end
    for (const u of [U0 - 0.02, U1 + 0.02]) { const c = (v0 + v1) / 2; boxUV(S, u - 0.04, u + 0.04, c - 1.1, c + 1.1, E + 0.25, E + 1.25, C.dark); }
    if (i) boxUV(S, U0 - 0.7, U1 + 0.7, v0 - 0.2, v0 + 0.2, E - 0.15, E + 0.05, shade(C.roof, 0.7));
  }
  // the entrance canopy on Phan Bội Châu and the sign above it
  const vm = (V0 + V1) / 2;
  boxUV(S, U0 - 3.2, U0, vm - 5.5, vm + 5.5, 3.55, 3.8, C.trim, { top: C.roof });
  for (const s of [-1, 1]) boxUV(S, U0 - 3.0, U0 - 2.7, vm + s * 5.2 - 0.15, vm + s * 5.2 + 0.15, 0.08, 3.55, C.trim);
  boxUV(S, U0 - 0.45, U0 - 0.1, vm - 6, vm + 6, 4.1, 5.9, C.signRed);

  // ---- the stall sheds: along the east side, and along the north side of the hall ----
  const SE = 4.4, SH = 1.4;
  shed(S, 39.6, 47.0, -8.5, 33.0, SE, SH, C.roofLight);
  shed(S, 2.0, 39.6, -8.5, -0.6, SE, SH, C.roof);
  shed(S, 20.0, 47.0, -17.5, -8.5, SE, SH, C.roofLight);
  // the translucent sheeting over the passage between the hall and the east shed
  S.kind = KIND.PLAIN;
  boxUV(S, U1, 39.8, -0.6, 33.0, 5.95, 6.05, C.clear);
  for (let v = 2; v < 33; v += 6) boxUV(S, U1 + 0.2, U1 + 0.45, v - 0.12, v + 0.12, 0, 5.95, C.post);

  // ---- the south row: stalls under tarps on poles between the hall and the canal road ----
  const paved0 = S.n;
  let k = 0;
  for (let u = 1.0; u < 37.5; u += 4.6, k++) {
    const tarp = C.tarp[k % C.tarp.length], a = u, b = u + 4.2;
    for (const vv of [34.0, 38.2]) for (const uu of [a + 0.1, b - 0.1]) boxUV(S, uu - 0.05, uu + 0.05, vv - 0.05, vv + 0.05, 0.08, vv < 36 ? 2.9 : 2.4, C.post);
    // a single-pitch tarp falling toward the road
    S.quad(W3(a, 33.6, 2.95), W3(b, 33.6, 2.95), W3(b, 38.6, 2.35), W3(a, 38.6, 2.35), tarp, [0, 1, 0.15]);
    S.quad(W3(b, 33.6, 2.93), W3(a, 33.6, 2.93), W3(a, 38.6, 2.33), W3(b, 38.6, 2.33), shade(tarp, 0.6), [0, -1, 0]);
    boxUV(S, a + 0.4, b - 0.4, 34.6, 36.4, 0.08, 0.85, C.table, { top: shade(C.table, 1.2) });
  }
  (S.paved = S.paved || []).push([paved0, S.n]); // the stall row: no trees, no houses (src/geo/city.js coverOf)
  S.kind = KIND.PLAIN;

  if (!group) return null;
  // the sign's name, and its glow after dark
  const LW = 11.0, LH = LW * 64 / 512;
  const rot = Math.atan2(-T[0], -T[1]);
  const mk = (mat, off, order) => {
    const q = P(U0 - 0.5 - off, vm);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), mat);
    m.position.set(q[0], Y0 + 5.0, q[1]);
    m.rotation.y = rot;
    m.userData.landmark = 'benngu';
    if (order) m.renderOrder = order;
    group.add(m);
  };
  mk(new THREE.MeshStandardMaterial({ map: letters(THREE, '#f2c64a'), transparent: true, alphaTest: 0.4, roughness: 0.6, metalness: 0 }), 0, 0);
  mk(new THREE.MeshBasicMaterial({ map: letters(THREE, '#ffd870'), transparent: true, depthWrite: false, opacity: 0, toneMapped: false }), 0.03, 19);
  const glowMesh = group.children[group.children.length - 1];
  // warm light under the canopy and along the stall row after dark
  const L = new Buf(120);
  const line = (u0, v0, u1, v1, y) => L.beam(W3(u0, v0, y), W3(u1, v1, y), 0.12, 0.12, [1, 1, 1]);
  line(U0 - 3.1, vm - 5.3, U0 - 3.1, vm + 5.3, 3.5);
  line(1.2, 33.8, 37.0, 33.8, 2.75);
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
