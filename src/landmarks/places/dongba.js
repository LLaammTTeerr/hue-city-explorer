import { Buf, KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial, shared } from '../../geo/materials.js';
import { landTest } from '../boats.js';

// Chợ Đông Ba, Huế's central market, as it stands today. Sources and estimates: docs/places/dongba.md.
//
// The main hall (OSM way 172641246, 72.0 x 42.6 m) is a three-storey block in grey render ("Chợ gồm ba lầu",
// VnExpress) whose front is on Trần Hưng Đạo ("mặt tiền nằm trên đường Trần Hưng Đạo"), not on the river. Its
// roofline carries a row of folded concrete hoods; tiled awnings run over the ground-floor stalls. The 1899 clock
// tower was lost in 1967 and is not rebuilt: the entrance on Trần Hưng Đạo is a flat canopy with a black LED band
// edged in red, the name "CHỢ ĐÔNG BA" in giant red capitals standing on it and a row of flags above (photos of
// 2024 on Wikimedia Commons). Before the front, two rows of stalls either side of the entrance and two two-storey
// corner buildings (the 1987 renovation); single-storey stall halls along both ends and the back toward Chương
// Dương; past the fruit market, the wharf (bến Đông Ba) on the river.
//
// Frame: the hall's centre C, u along the front (toward the north end, the Đông Ba bridge), v out of the front
// (toward Trần Hưng Đạo, west). Heights and plan from the GISHue drone survey and OSM (docs/places/dongba.md).
export const id = 'dongba';

const C = [-19.75, -402.83];
const T = [0.4557, -0.8901], N = [-0.8901, -0.4557];
const ANG = Math.atan2(T[1], T[0]);
const P = (u, v) => [C[0] + T[0] * u + N[0] * v, C[1] + T[1] * u + N[1] * v];
const gy = (p) => LAND_Y + rise(p[0], p[1]);

const GREY = hex('#cfc8b6'), TRIM = hex('#ece6d6'), CONCRETE = hex('#b9b5ab'), DARK = hex('#2b2422');
const TILE = PAL.marketRoof, METAL = hex('#7d8783'), SOFFIT = hex('#6b2e22'), LED = hex('#141414'), RED = hex('#c8161d');
const FLAGS = [hex('#e8781e'), hex('#2f9a45'), hex('#f0c419'), hex('#7b3fa0')];
const W1 = [1, 1, 1];

// a box given by its u/v extent in the frame, from height a to b above the ground
function boxUV(S, u0, u1, v0, v1, a, b, col, opt) {
  const p = P((u0 + u1) / 2, (v0 + v1) / 2), y = gy(p);
  S.box(p[0], p[1], y + a, y + b, u1 - u0, v1 - v0, ANG, col, opt);
}
function hipUV(S, u0, u1, v0, v1, a, h, col, opt) {
  const p = P((u0 + u1) / 2, (v0 + v1) / 2);
  S.hip(p[0], p[1], u1 - u0, v1 - v0, ANG, gy(p) + a, h, col, opt);
}
// a single-storey stall hall: low walls, roofed in bays of shallow hips (corrugated sheet or tile)
function shed(S, u0, u1, v0, v1, h, roof, bay = 13) {
  S.kind = KIND.PLAIN;
  boxUV(S, u0, u1, v0, v1, 0, h - 1.4, GREY, { top: shade(GREY, 0.8) });
  const alongU = u1 - u0 >= v1 - v0, L = alongU ? u1 - u0 : v1 - v0, n = Math.max(1, Math.round(L / bay)), s = L / n;
  for (let i = 0; i < n; i++) {
    if (alongU) hipUV(S, u0 + i * s, u0 + (i + 1) * s, v0, v1, h - 1.4, 1.4, roof, { over: 0.7, flare: 0.15 });
    else hipUV(S, u0, u1, v0 + i * s, v0 + (i + 1) * s, h - 1.4, 1.4, roof, { over: 0.7, flare: 0.15 });
  }
}

// the giant capitals of the sign, as a picture with a clear background (mask: white letters, for the night glow)
function letters(THREE, mask) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 96;
  const g = cv.getContext('2d');
  const text = 'CHỢ ĐÔNG BA'.normalize('NFC');
  let px = 60;
  const font = () => `900 ${px}px "Helvetica Neue", Arial, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
  g.font = font();
  const tw = g.measureText(text).width;
  if (tw > 490) { px *= 490 / tw; g.font = font(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = mask ? '#ffffff' : '#c8161d';
  g.fillText(text, 256, 56);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
function glowMaterial(THREE, mask, color, boost) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: mask }, uGlow: shared.uGlow, uColor: { value: new THREE.Color(color) }, uBoost: { value: boost } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `uniform sampler2D map; uniform vec3 uColor; uniform float uGlow, uBoost; varying vec2 vUv;
      void main() { float a = texture2D( map, vUv ).a;
        gl_FragColor = vec4( uColor * uBoost * uGlow * a, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}

export function build({ data, S, group, THREE }) {
  // ---- the main hall: three storeys on the mapped footprint, the upper floors carried out over a front arcade ----
  const HU = 36.0, HV = 21.3, FV = 27.0; // half length, half depth, the face of the front gallery
  const TOP = 10.4; // the roof slab (GISHue survey: 11 m over the hall with the hoods)
  S.kind = KIND.CIVIC;
  boxUV(S, -HU, HU, -HV, HV, 0, TOP, GREY, { top: shade(CONCRETE, 0.85) });
  boxUV(S, -HU, HU, HV, FV, 3.9, TOP, GREY, { top: shade(CONCRETE, 0.85) });
  S.kind = KIND.PLAIN;
  // the dark arcade behind the front columns, and the columns
  boxUV(S, -HU + 0.4, HU - 0.4, HV, HV + 0.2, 0, 3.9, DARK);
  for (let u = -HU + 0.5; u <= HU - 0.4; u += 6) boxUV(S, u - 0.35, u + 0.35, FV - 0.7, FV, 0, 3.9, TRIM);
  // floor bands and the parapet
  for (const y of [3.9, 7.15]) {
    boxUV(S, -HU - 0.15, HU + 0.15, -HV - 0.15, HV + 0.15, y - 0.25, y + 0.1, TRIM);
    boxUV(S, -HU - 0.15, HU + 0.15, HV, FV + 0.15, y - 0.25, y + 0.1, TRIM);
  }
  boxUV(S, -HU - 0.1, HU + 0.1, -HV - 0.1, FV + 0.1, TOP - 0.1, TOP + 0.5, TRIM, { top: shade(CONCRETE, 0.85) });
  // the tiled awning over the ground-floor stalls on the ends and the back (inside the body, only its skirt shows)
  hipUV(S, -HU, HU, -HV, FV, 3.0, 1.0, TILE, { over: 1.8, flare: 0.3 });
  // the row of folded concrete hoods at the roofline, all round
  const hood = (u, v, w, d) => hipUV(S, u - w / 2, u + w / 2, v - d / 2, v + d / 2, TOP + 0.5, 0.85, CONCRETE, { over: 0.35, flare: 0.25 });
  for (let u = -HU + 2.25; u < HU; u += 4.5) { hood(u, FV - 1.0, 3.6, 2.4); hood(u, -HV + 1.0, 3.6, 2.4); }
  for (let v = -HV + 5.5; v < FV - 4; v += 4.5) { hood(-HU + 1.0, v, 2.4, 3.6); hood(HU - 1.0, v, 2.4, 3.6); }
  // the raised roof over the central hall (the old "lầu chuông" court), toward the north end
  boxUV(S, -26, 32, -9, 9, TOP + 0.5, TOP + 1.8, GREY, { top: CONCRETE });
  hipUV(S, -26, 32, -9, 9, TOP + 1.8, 1.3, METAL, { over: 0.6, flare: 0.1 });

  // ---- the entrance on Trần Hưng Đạo: a flat canopy, the LED band, the giant red letters and flags ----
  const EU = 7.0, EV0 = FV, EV1 = 44.0;
  for (const u of [-EU + 0.3, -2.4, 2.4, EU - 0.3]) boxUV(S, u - 0.3, u + 0.3, EV1 - 0.9, EV1 - 0.3, 0, 4.3, TRIM);
  boxUV(S, -EU, EU, EV0, EV1, 4.3, 4.5, SOFFIT);
  boxUV(S, -EU - 0.1, EU + 0.1, EV0, EV1 + 0.1, 4.5, 4.85, TRIM);
  const BY0 = 4.85, BY1 = 6.9; // the LED band: on the front and turning a few metres down either side
  boxUV(S, -EU - 0.1, EU + 0.1, EV1 - 0.4, EV1 + 0.1, BY0, BY1, LED);
  for (const s of [-1, 1]) boxUV(S, s * EU - 0.25, s * EU + 0.25, EV1 - 6, EV1, BY0, BY1, LED);
  // its red LED edging (by day, red trim; after dark, the light strips below)
  boxUV(S, -EU - 0.15, EU + 0.15, EV1 + 0.08, EV1 + 0.18, BY1 - 0.18, BY1, RED);
  boxUV(S, -EU - 0.15, EU + 0.15, EV1 + 0.08, EV1 + 0.18, BY0, BY0 + 0.18, RED);
  // the posts the letters stand on, and the flagpoles behind them
  for (let u = -6; u <= 6.01; u += 2) boxUV(S, u - 0.06, u + 0.06, EV1 - 0.6, EV1 - 0.48, BY1, BY1 + 0.5, DARK);
  for (let i = 0; i < 7; i++) {
    const u = -6 + i * 2, p = P(u, EV1 - 1.2), y = gy(p);
    S.cyl(p[0], p[1], y + BY1, y + 10.2, 0.05, 0.04, 4, hex('#d8d8d8'));
    const q = P(u + 0.55, EV1 - 1.2);
    S.box(q[0], q[1], y + 9.4, y + 10.1, 1.0, 0.04, ANG, FLAGS[i % 4]);
  }

  // ---- the forecourt: rows of stalls either side of the entrance, and the two corner buildings ----
  shed(S, -42, -9, 31, 41, 5.0, TILE, 11);
  shed(S, 9, 40, 31, 41, 3.8, TILE, 10.5);
  for (const [u0, u1] of [[-69, -46], [44, 67]]) {
    S.kind = KIND.CIVIC;
    boxUV(S, u0, u1, 31.5, 42, 0, 6.6, GREY, { top: shade(CONCRETE, 0.85) });
    S.kind = KIND.PLAIN;
    boxUV(S, u0 - 0.1, u1 + 0.1, 31.4, 42.1, 3.3, 3.55, TRIM);
    hipUV(S, u0, u1, 31.5, 42, 6.6, 1.0, TILE, { over: 0.8, flare: 0.2 });
  }

  // ---- the stall halls along both ends and the back (toward Chương Dương) ----
  shed(S, -78, -36.2, -21, 30, 5.0, METAL);
  S.kind = KIND.CIVIC; // the two-storey spine through the south end hall
  boxUV(S, -48, -42, -21, 30, 0, 7.0, GREY, { top: shade(CONCRETE, 0.85) });
  S.kind = KIND.PLAIN;
  hipUV(S, -48, -42, -21, 30, 7.0, 0.8, METAL, { over: 0.5, flare: 0.1 });
  shed(S, 36.2, 78, -21, 30, 5.0, METAL);
  shed(S, -78, 38, -49, -22.2, 5.0, METAL);
  S.kind = KIND.CIVIC;
  boxUV(S, 38.5, 72, -40, -22.5, 0, 7.4, GREY, { top: shade(CONCRETE, 0.85) });
  S.kind = KIND.PLAIN;
  hipUV(S, 38.5, 72, -40, -22.5, 7.4, 0.9, METAL, { over: 0.6, flare: 0.1 });
  shed(S, 38.5, 72, -48, -40.3, 3.6, METAL);

  // ---- the wharf on the river behind the fruit market: a stone quay edge with steps and bollards ----
  const QV = -90.0;
  boxUV(S, -40, 90, QV - 3, QV, -1.8, 0.12, PAL.stone || hex('#a59f92'));
  // the steps go down from the quay edge, or where the mapped bank runs out past it, from a landing at the quay's
  // level carried out to the shore: their third step (a metre under the street) stands at the water
  const land = landTest(data);
  let QE = QV - 3;
  for (let v = QE - 0.9; v > QE - 30; v -= 0.25) if (![18, 22, 26].some((u) => land(...P(u, v)))) { QE = Math.min(QE, v + 0.9); break; }
  if (QE < QV - 3) boxUV(S, 18, 26, QE, QV - 3 + 0.05, -1.8, 0.12, PAL.stone || hex('#a59f92'));
  for (let k = 0; k < 4; k++) boxUV(S, 18, 26, QE - (k + 1) * 0.45, QE - k * 0.45, -1.8, -0.4 - k * 0.35, shade(hex('#a59f92'), 0.9));
  for (let u = -35; u <= 85; u += 10) { const p = P(u, QV - 2.6), y = gy(p); S.cyl(p[0], p[1], y + 0.1, y + 0.7, 0.2, 0.17, 6, DARK); }
  S.kind = KIND.PLAIN;

  if (!group) return null;
  // the letters, standing on their posts on top of the LED band
  const tex = letters(THREE, false), mask = letters(THREE, true);
  const LW = 12.6, LH = LW * 96 / 512, lp = P(0, EV1 - 0.45), ly = gy(lp) + BY1 + 0.25 + LH / 2;
  const add = (mat, off, order) => {
    const q = P(0, EV1 - 0.45 + off);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), mat);
    m.position.set(q[0], ly, q[1]);
    m.rotation.y = Math.atan2(N[0], N[1]);
    m.userData.landmark = 'dongba';
    if (order) m.renderOrder = order;
    group.add(m);
  };
  add(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0 }), 0, 0);
  add(glowMaterial(THREE, mask, 0xff2a1a, 2.4), 0.03, 19);
  // after dark: the LED band's red edging, and a line of warm light under the hall's front cornice and the canopy
  const R = new Buf(200), Wm = new Buf(200);
  const line = (L, u0, v0, u1, v1, y) => { const a = P(u0, v0), b = P(u1, v1), h = gy(a); L.beam([a[0], h + y, a[1]], [b[0], h + y, b[1]], 0.12, 0.12, W1); };
  for (const y of [BY0 + 0.09, BY1 - 0.09]) line(R, -EU - 0.1, EV1 + 0.22, EU + 0.1, EV1 + 0.22, y);
  for (const s of [-1, 1]) { const a = P(s * (EU + 0.1), EV1 + 0.22), h = gy(a); R.beam([a[0], h + BY0, a[1]], [a[0], h + BY1, a[1]], 0.12, 0.12, W1); }
  line(Wm, -HU + 0.5, FV + 0.3, -EU - 0.5, FV + 0.3, TOP + 0.2);
  line(Wm, EU + 0.5, FV + 0.3, HU - 0.5, FV + 0.3, TOP + 0.2);
  line(Wm, -EU + 0.3, EV1 - 0.6, EU - 0.3, EV1 - 0.6, 4.2);
  for (const [L, col, boost] of [[R, 0xff2010, 2.0], [Wm, 0xffc068, 1.3]]) {
    const m = new THREE.Mesh(L.geometry(), lightMaterial(col, boost));
    m.renderOrder = 19;
    m.userData.landmark = 'dongba';
    group.add(m);
  }
  return null;
}
