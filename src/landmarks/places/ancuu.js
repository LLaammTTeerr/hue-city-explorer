import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial } from '../../geo/materials.js';

// Chợ An Cựu, 89 Hùng Vương (Phú Nhuận), on the south bank a block north of sông An Cựu. See docs/places/ancuu.md.
//
// Confirmed: the lot is OSM way 118541113 (amenity=marketplace, building=yes, addr 89 Hùng Vương), a seven-sided
// block of about 2,300 m² between Hùng Vương (west), Đặng Văn Ngữ (south) and the service lane that wraps its north
// and east sides (way 895581674). The city's drone survey (GISHue) gives the block one height, 12 m; the Open
// Buildings 2.5D raster shows its make-up: a taller strip of about 10-11 m along Hùng Vương, a broad roof of 7-9 m
// behind it with a ridge of 13-14 m over its southern half, and lower roofs (4-6 m) along the south edge.
// Not found in any public source (estimates, from the rasters and the usual Huế market of the 1990s-2000s, Đông Ba
// and Tây Lộc): a two-storey front block on Hùng Vương with the gate and the name; behind it the main hall
// (nhà lồng), cream-rendered walls under a grey corrugated-steel hip roof with a raised louvred lantern on its
// ridge; single-storey kiosk rows on the north lane, the south edge and the corner on Hùng Vương - Đặng Văn Ngữ;
// a long open stall shed on the east lane; umbrella stalls in the yard at the north-east corner.
//
// Frame: u along the north edge (east-south-east), v at right angles to it (south-south-west), from the lot's
// north-west corner on Hùng Vương.
export const id = 'ancuu';

const A = [1230.4, 1246.2];
const T = [0.976, -0.218], N = [0.218, 0.976];
const ANG = Math.atan2(T[1], T[0]);
const P = (u, v) => [A[0] + T[0] * u + N[0] * v, A[1] + T[1] * u + N[1] * v];
// the lot (OSM way 118541113, model metres)
const RING = [[1230.4, 1246.2], [1279.2, 1235.3], [1285.4, 1239.1], [1289.6, 1244.1], [1284.0, 1292.7], [1253.3, 1287.5], [1238.2, 1272.7]];

const CREAM = hex('#e6d9b8'), TRIM = hex('#f3ecdc'), YELLOW = hex('#e3c27a'), DARK = hex('#2c2825'), SHUTTER = hex('#8d8f8c');
const STEEL = hex('#8e9599'), STEEL_DK = hex('#6f777b'), RUST = hex('#9b5a3c'), LOUVRE = hex('#4a4e50');
const PAVE = hex('#a8a49b'), POST = hex('#5b6062'), BLUE = hex('#2f5d8a'), RED = hex('#c3161c'), WOOD = hex('#7a5a3e');
const CANVAS = ['#c8352b', '#2f6db0', '#e0a526', '#3f8f4f', '#e8e2d2', '#d0612b'].map(hex);
const W1 = [1, 1, 1];

let Y0 = LAND_Y;
function boxUV(S, u0, u1, v0, v1, a, b, col, opt) {
  const p = P((u0 + u1) / 2, (v0 + v1) / 2);
  S.box(p[0], p[1], Y0 + a, Y0 + b, u1 - u0, v1 - v0, ANG, col, opt);
}
function hipUV(S, u0, u1, v0, v1, a, h, col, opt) {
  const p = P((u0 + u1) / 2, (v0 + v1) / 2), w = u1 - u0, d = v1 - v0;
  if (w >= d) S.hip(p[0], p[1], w, d, ANG, Y0 + a, h, col, opt);
  else S.hip(p[0], p[1], d, w, ANG + Math.PI / 2, Y0 + a, h, col, opt);
}
// a strip along the world segment a→b, from s0 to s1 metres along it and d0 to d1 metres in from it (n: inward)
function strip(a, b) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m = [0.5 * (RING[0][0] + RING[4][0]), 0.5 * (RING[0][1] + RING[4][1])];
  let n = [-t[1], t[0]];
  if ((m[0] - c[0]) * n[0] + (m[1] - c[1]) * n[1] < 0) n = [-n[0], -n[1]];
  const at = (s, d) => [a[0] + t[0] * s + n[0] * d, a[1] + t[1] * s + n[1] * d];
  const ang = Math.atan2(t[1], t[0]);
  return {
    L, at,
    box(S, s0, s1, d0, d1, y0, y1, col, opt) { const p = at((s0 + s1) / 2, (d0 + d1) / 2); S.box(p[0], p[1], Y0 + y0, Y0 + y1, s1 - s0, d1 - d0, ang, col, opt); },
    hip(S, s0, s1, d0, d1, y0, h, col, opt) { const p = at((s0 + s1) / 2, (d0 + d1) / 2); S.hip(p[0], p[1], s1 - s0, d1 - d0, ang, Y0 + y0, h, col, opt); },
  };
}

// a row of single-storey kiosks along a strip: rendered piers, roller shutters (some open, dark), a sheet lean-to
function kiosks(S, st, s0, s1, d, h, roof, seed) {
  S.kind = KIND.PLAIN;
  st.box(S, s0, s1, 0.1, d, 0, h, CREAM, { top: shade(CREAM, 0.8) });
  const n = Math.max(1, Math.round((s1 - s0) / 3.4)), w = (s1 - s0) / n;
  for (let i = 0; i < n; i++) {
    const a = s0 + i * w + 0.25, b = s0 + (i + 1) * w - 0.25, open = (i * 7 + seed) % 3 !== 0;
    st.box(S, a, b, 0.0, 0.12, 0.1, h - 0.9, open ? DARK : SHUTTER);
    if (open) st.box(S, a + 0.2, b - 0.2, -0.9, -0.1, 0.1, 0.85, WOOD); // the goods table pushed out onto the walk
  }
  st.box(S, s0, s1, -1.4, 0.1, h - 0.75, h - 0.6, roof); // the awning out over the walk
  st.hip(S, s0, s1, 0.1, d, h, 0.7, roof, { over: 0.3 });
}

// a market umbrella: pole, canvas cone, a trestle table under it
function umbrella(S, x, z, r, col, k) {
  const y = Y0;
  S.cyl(x, z, y, y + 2.5, 0.04, 0.04, 4, POST, { cap: false });
  S.cyl(x, z, y + 2.05, y + 2.65, r, 0.05, 8, col, { rot: k * 0.4 });
  S.box(x, z, y + 0.7, y + 0.8, 1.6, 0.9, ANG + k * 0.3, WOOD);
  S.box(x, z, y, y + 0.7, 1.3, 0.6, ANG + k * 0.3, shade(WOOD, 0.7));
}

// the name, red on cream, as a small canvas picture
function signTexture(THREE) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 96;
  const g = cv.getContext('2d');
  g.fillStyle = '#f4ecd6'; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = '#c3161c'; g.lineWidth = 6; g.strokeRect(6, 6, 500, 84);
  const text = 'CHỢ AN CỰU'.normalize('NFC');
  let px = 62;
  const font = () => `900 ${px}px "Helvetica Neue", Arial, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
  g.font = font();
  const tw = g.measureText(text).width;
  if (tw > 460) { px *= 460 / tw; g.font = font(); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#c3161c';
  g.fillText(text, 256, 52);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function build({ data, S, group, THREE }) {
  const c = P(28, 28);
  Y0 = LAND_Y + rise(c[0], c[1]);

  // the mapped outline is the whole lot, drawn here: take it out of data.bld so the city builder leaves it alone
  if (Array.isArray(data.bld)) {
    for (let i = data.bld.length - 1; i >= 0; i--) {
      const f = data.bld[i][0];
      let sx = 0, sz = 0;
      for (let k = 0; k < f.length; k += 2) { sx += f[k]; sz += f[k + 1]; }
      if (inRing(sx / (f.length / 2) / 10, sz / (f.length / 2) / 10, RING)) data.bld.splice(i, 1);
    }
  }

  // ---- the paved lot: concrete, a kerb all round ----
  const paved0 = S.n;
  S.kind = KIND.PLAIN;
  S.prism(RING, Y0 - 1.2, Y0 + 0.12, shade(PAVE, 0.85), PAVE);

  // ---- the front block on Hùng Vương: two storeys, the gate in the middle, the name on a raised panel ----
  const F0 = 2.0, F1 = 13.0, FV0 = 1.0, FV1 = 26.0, G0 = 11.0, G1 = 16.0; // plan, and the gate bay (v)
  S.kind = KIND.CIVIC;
  boxUV(S, F0, F1, FV0, G0, 0, 8.0, CREAM, { top: shade(STEEL, 0.9) });
  boxUV(S, F0, F1, G1, FV1, 0, 8.0, CREAM, { top: shade(STEEL, 0.9) });
  boxUV(S, F0 + 0.6, F1, G0, G1, 4.6, 8.0, CREAM, { top: shade(STEEL, 0.9) }); // over the gate passage
  S.kind = KIND.PLAIN;
  boxUV(S, F0 + 4, F1, G0 + 0.3, G1 - 0.3, 0, 4.6, DARK); // the passage into the hall, in shadow
  // ground floor: shop bays with shutters; upper floor: a band of windows; floor band and cornice
  for (const [v0, v1] of [[FV0, G0], [G1, FV1]]) {
    const n = Math.round((v1 - v0) / 3.3), w = (v1 - v0) / n;
    for (let i = 0; i < n; i++) {
      const a = v0 + i * w + 0.3, b = v0 + (i + 1) * w - 0.3;
      boxUV(S, F0 - 0.08, F0, a, b, 0.15, 3.4, i % 3 === 1 ? SHUTTER : DARK);
      boxUV(S, F0 - 0.08, F0, a + 0.3, b - 0.3, 5.0, 6.9, hex('#3d4a52'));
    }
  }
  boxUV(S, F0 - 0.9, F0, FV0, FV1, 3.8, 3.98, TRIM); // the canopy over the shop fronts
  boxUV(S, F0 - 0.2, F1 + 0.1, FV0 - 0.1, FV1 + 0.1, 4.4, 4.7, TRIM);
  boxUV(S, F0 - 0.25, F1 + 0.15, FV0 - 0.15, FV1 + 0.15, 7.8, 8.4, TRIM);
  // the gate: two yellow piers either side of the passage and the raised name panel over it
  for (const v of [G0, G1]) boxUV(S, F0 - 0.5, F0 + 0.4, v - 0.45, v + 0.45, 0, 10.2, YELLOW, { top: TRIM });
  boxUV(S, F0 - 0.45, F0 + 0.3, G0, G1, 8.4, 10.2, YELLOW, { top: TRIM });
  boxUV(S, F0 - 0.55, F0 + 0.4, G0 - 0.6, G1 + 0.6, 10.2, 10.45, TRIM);
  // a low grey hip roof over each wing of the block (behind the parapet)
  hipUV(S, F0 + 0.4, F1 - 0.2, FV0 + 0.4, G0 - 0.2, 8.0, 1.8, STEEL, { over: 0.1 });
  hipUV(S, F0 + 0.4, F1 - 0.2, G1 + 0.2, FV1 - 0.4, 8.0, 1.8, STEEL, { over: 0.1 });

  // ---- the main hall (nhà lồng): cream walls, a grey steel hip roof, a louvred lantern on the ridge ----
  const H0 = 16.0, H1 = 45.0, HV0 = 4.0, HV1 = 40.0, EAVE = 6.2;
  S.kind = KIND.CIVIC;
  boxUV(S, H0, H1, HV0, HV1, 0, EAVE, CREAM, { top: STEEL_DK });
  S.kind = KIND.PLAIN;
  // the high band of vents under the eaves, the doorways on the axis of each side, the stall openings
  for (const [u0, u1, v0, v1] of [[H0 - 0.08, H0, HV0 + 1, HV1 - 1], [H1, H1 + 0.08, HV0 + 1, HV1 - 1]]) boxUV(S, u0, u1, v0, v1, 4.6, 5.6, LOUVRE);
  for (const [u0, u1, v0, v1] of [[H0 + 1, H1 - 1, HV0 - 0.08, HV0], [H0 + 1, H1 - 1, HV1, HV1 + 0.08]]) boxUV(S, u0, u1, v0, v1, 4.6, 5.6, LOUVRE);
  const vm = (HV0 + HV1) / 2, um = (H0 + H1) / 2;
  boxUV(S, H1, H1 + 0.08, vm - 2, vm + 2, 0.12, 3.6, DARK);
  boxUV(S, H0 - 0.08, H0, vm - 2, vm + 2, 0.12, 3.6, DARK);
  for (const v of [HV0 - 0.08, HV1]) boxUV(S, um - 2, um + 2, v, v + 0.08, 0.12, 3.6, DARK);
  for (let v = HV0 + 3; v < HV1 - 2.5; v += 4.5) if (Math.abs(v - vm) > 3) boxUV(S, H1, H1 + 0.08, v, v + 2.6, 0.12, 2.8, SHUTTER);
  boxUV(S, H0 - 0.15, H1 + 0.15, HV0 - 0.15, HV1 + 0.15, 4.2, 4.4, TRIM);
  hipUV(S, H0, H1, HV0, HV1, EAVE, 3.4, STEEL, { over: 1.2, fascia: 0.25, fasciaCol: TRIM });
  // the lantern (mái thông gió): a raised strip along the ridge, louvred sides, its own shallow roof
  boxUV(S, um - 4, um + 4, HV0 + 6, HV1 - 6, EAVE + 2.2, EAVE + 4.6, LOUVRE, { top: STEEL_DK });
  hipUV(S, um - 4, um + 4, HV0 + 6, HV1 - 6, EAVE + 4.6, 1.2, STEEL, { over: 0.7 });

  // ---- kiosk rows on the edges ----
  // the north lane: between the front block and the north-east corner, facing out onto the lane
  const north = strip(RING[0], RING[1]);
  kiosks(S, north, 13.6, 45.5, 3.4, 3.9, RUST, 1);
  // the corner on Hùng Vương - Đặng Văn Ngữ
  const sw = strip(RING[6], RING[5]);
  kiosks(S, sw, 0.8, sw.L - 0.8, 4.5, 4.4, RUST, 2);
  // the south edge on Đặng Văn Ngữ
  const south = strip(RING[5], RING[4]);
  kiosks(S, south, 1.5, south.L - 2.5, 4.5, 4.6, STEEL_DK, 0);

  // ---- the open stall shed along the east lane: a sheet roof on steel posts, stall tables under it ----
  const east = strip(RING[3], RING[4]);
  {
    const s0 = 1.0, s1 = 25.0, d0 = 0.6, d1 = 4.6, h = 4.6;
    for (let s = s0; s <= s1 + 0.01; s += (s1 - s0) / 8) for (const d of [d0 + 0.3, d1 - 0.3]) east.box(S, s - 0.12, s + 0.12, d - 0.12, d + 0.12, 0, h, POST);
    east.hip(S, s0, s1, d0, d1, h, 1.0, RUST, { over: 0.6 });
    for (let s = s0 + 1.5; s < s1 - 1; s += 3.2) {
      east.box(S, s - 1.1, s + 1.1, d0 + 0.8, d0 + 2.2, 0.7, 0.82, WOOD);
      east.box(S, s - 0.9, s + 0.9, d0 + 1.0, d0 + 2.0, 0, 0.7, shade(WOOD, 0.7));
      east.box(S, s - 0.8, s + 0.8, d0 + 1.05, d0 + 1.95, 0.82, 1.0, CANVAS[(Math.round(s) * 3) % CANVAS.length]); // produce on the table
    }
  }
  // past the shed the lane closes in on the hall: a shallow row of kiosks
  kiosks(S, east, 26.0, 40.0, 2.4, 3.6, RUST, 4);

  // ---- the yard at the north-east corner: umbrella stalls ----
  const spots = [[47.5, 3.2], [50.5, 6.2], [53.2, 9.0], [48.5, 9.5], [50.5, 13.0], [47.4, 15.5], [49.0, 19.5], [47.2, 23.5]];
  spots.forEach(([u, v], k) => { const p = P(u, v); if (inRing(p[0], p[1], RING)) umbrella(S, p[0], p[1], 1.25, CANVAS[k % CANVAS.length], k); });
  // and in the lane between the front block and the hall, the cooked-food stalls of the afternoon
  for (let k = 0; k < 3; k++) { const p = P(14.0, 30 + k * 3.4); if (inRing(p[0], p[1], RING)) umbrella(S, p[0], p[1], 1.0, CANVAS[(k + 3) % CANVAS.length], k + 9); }
  (S.paved = S.paved || []).push([paved0, S.n]);
  S.kind = KIND.PLAIN;

  if (!group) return null;
  // the name panel over the gate, facing Hùng Vương
  const tex = signTexture(THREE);
  const sp = P(F0 - 0.5, (G0 + G1) / 2), SW = G1 - G0 - 0.2, SH = SW * 96 / 512;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 }));
  m.position.set(sp[0], Y0 + 9.3, sp[1]);
  m.rotation.y = Math.atan2(-T[0], -T[1]);
  m.userData.landmark = 'ancuu';
  group.add(m);
  // after dark: tube lights under the front canopy and the gate, the lamps over the umbrella yard and the east shed
  const L = new Buf(200);
  const line = (a, b, y) => L.beam([a[0], Y0 + y, a[1]], [b[0], Y0 + y, b[1]], 0.1, 0.1, W1);
  line(P(F0 - 0.85, FV0 + 0.3), P(F0 - 0.85, G0 - 0.6), 3.75);
  line(P(F0 - 0.85, G1 + 0.6), P(F0 - 0.85, FV1 - 0.3), 3.75);
  line(P(F0 - 0.6, G0 + 0.4), P(F0 - 0.6, G1 - 0.4), 4.5);
  line(east.at(2, 2.6), east.at(24, 2.6), 4.4);
  for (const [u, v] of [[49, 6], [49.5, 17], [47, 26]]) { const p = P(u, v); L.box(p[0], p[1], Y0 + 2.9, Y0 + 3.1, 0.3, 0.3, 0, W1); }
  const lm = new THREE.Mesh(L.geometry(), lightMaterial(0xfff0d0, 1.4));
  lm.renderOrder = 19;
  lm.userData.landmark = 'ancuu';
  group.add(lm);
  return null;
}
