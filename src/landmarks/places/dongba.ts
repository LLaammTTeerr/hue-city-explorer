import { Buf, KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { lightMaterial, shared } from '../../geo/materials.ts';
import { landTest } from '../boats.ts';
import { streetTest } from '../enclosure.ts';
import { flag } from '../anim.ts';

// Chợ Đông Ba, Huế's central market, as it stands today. Sources and estimates: docs/places/dongba.md.
//
// The main hall (OSM way 172641246, 72.0 x 42.6 m) is a three-storey block in grey render ("Chợ gồm ba lầu",
// VnExpress) whose front is on Trần Hưng Đạo ("mặt tiền nằm trên đường Trần Hưng Đạo"), not on the river. Its
// roof is a row of sheet-roofed bays across it; tiled awnings run over the ground-floor stalls. The 1899 clock
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
const P = (u, v): [number, number] => [C[0] + T[0] * u + N[0] * v, C[1] + T[1] * u + N[1] * v];
const gy = (p) => LAND_Y + rise(p[0], p[1]);

const GREY = hex('#cfc8b6'), TRIM = hex('#ece6d6'), CONCRETE = hex('#b9b5ab'), DARK = hex('#2b2422');
const TILE = PAL.marketRoof, METAL = hex('#7d8783'), SOFFIT = hex('#6b2e22'), LED = hex('#141414'), RED = hex('#c8161d');
const SHEET = hex('#55706a'), TIN = hex('#8b8781');
const FLAGS = [hex('#e8781e'), hex('#2f9a45'), hex('#f0c419'), hex('#7b3fa0')];
const W1 = [1, 1, 1];

// a box given by its u/v extent in the frame, from height a to b above the ground
function boxUV(S, u0, u1, v0, v1, a, b, col, opt?) {
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

// open stall bays on a row's street face (at v = v0, the stalls running back to v1): piers every `step`, a dark
// recess between them under a lintel, and goods stacked at the front (Street View 2025, Chương Dương)
const GOODS = [hex('#d8c9a0'), hex('#c44a2c'), hex('#e6e2d6'), hex('#5f8a3a'), hex('#d89a2a'), hex('#3d6f9e')];
function bays(S, u0, u1, v0, v1, top, step, open = top - 1.0) {
  S.kind = KIND.PLAIN;
  const D = Math.min(1.6, (v1 - v0) / 2); // the depth of the open front
  boxUV(S, u0, u1, v0 + D, v1, 0, top, GREY, { top: shade(GREY, 0.8) });
  boxUV(S, u0 + 0.1, u1 - 0.1, v0 + D - 0.04, v0 + D, 0, open, DARK);
  boxUV(S, u0, u1, v0, v0 + D, open, top, GREY, { top: shade(GREY, 0.8) }); // the lintel
  const n = Math.max(1, Math.round((u1 - u0) / step)), w = (u1 - u0) / n;
  for (let i = 0; i <= n; i++) { const u = Math.min(u1 - 0.25, Math.max(u0 + 0.25, u0 + i * w)); boxUV(S, u - 0.25, u + 0.25, v0, v0 + D, 0, open, GREY); }
  for (let i = 0; i < n; i++) {
    const a = u0 + i * w;
    for (let j = 0; j < 3; j++) {
      const b = a + 0.6 + j * (w - 1.2) / 3, h = 0.5 + ((i * 5 + j * 3) % 4) * 0.25;
      boxUV(S, b, b + (w - 1.2) / 3 - 0.15, v0 + 0.2, v0 + D - 0.2, 0, h, GOODS[(i * 3 + j) % GOODS.length]);
    }
  }
}
// a stall row under arched tin hoods (the barrel of each running out to the street, v), on a concrete band; the
// hoods corrugated grey tin, rusting in patches (the ribs drawn by the roof shader, KIND.TILE)
const RUST = [hex('#7c8288'), hex('#8a7e72'), hex('#6f767b'), hex('#857565')];
function hoods(S, u0, u1, v0, v1, H = 5.0, step = 6.0, rise = 1.3, reach = 0.6) {
  bays(S, u0, u1, v0, v1, H - 0.6, step);
  S.kind = KIND.PLAIN;
  boxUV(S, u0 - 0.1, u1 + 0.1, v0 - reach, v1, H - 0.6, H, CONCRETE); // the band, carried out under the hoods
  const n = Math.max(1, Math.round((u1 - u0) / step)), w = (u1 - u0) / n, K = 8, va = v0 - reach, vb = v1;
  for (let i = 0; i < n; i++) {
    const uc = u0 + (i + 0.5) * w, y = gy(P(uc, (va + vb) / 2)) + H;
    const at = (k, v) => { const s = -1 + (2 * k) / K, p = P(uc + (s * w) / 2, v); return [p[0], y + rise * (1 - s * s), p[1]]; };
    S.kind = KIND.TILE;
    for (let k = 0; k < K; k++) S.quad(at(k, va), at(k + 1, va), at(k + 1, vb), at(k, vb), RUST[(i * 3 + (k >> 2)) % RUST.length], [0, 1, 0]);
    // the end of the barrel over the street, closed in the same corrugated tin, ribs upright
    const out = [-N[0], 0, -N[1]], c = P(uc, va);
    for (let k = 0; k < K; k++) S.tri([c[0], y, c[1]], at(k, va), at(k + 1, va), shade(RUST[(i + 1) % RUST.length], 1.1), out);
    S.kind = KIND.PLAIN;
  }
  // for the mapped buildings to keep clear of, as a hip roof would (city.js roofClash)
  const c = P((u0 + u1) / 2, (va + vb) / 2);
  if (S.roofs) S.roofs.push({ cx: c[0], cz: c[1], w: u1 - u0, d: vb - va, ang: ANG, y0: gy(c) + H, h: rise, over: 0 });
}
// the north end of the same row: a mono-pitch corrugated roof rising toward the market, its street edge a plain
// tin fascia with a scalloped lower edge (Street View 2025, car panorama mid-way along Chương Dương)
function lean(S, u0, u1, v0, v1, H = 5.0, step = 6.0, reach = 1.8) {
  bays(S, u0, u1, v0, v1, H - 0.6, step);
  const va = v0 - reach, out = [-N[0], 0, -N[1]], FAS = hex('#c9ccc8');
  const pt = (u, v, y) => { const p = P(u, v); return [p[0], gy(P((u0 + u1) / 2, v)) + y, p[1]]; };
  S.kind = KIND.TILE;
  const R = [pt(u0, va, H), pt(u1, va, H), pt(u1, v1, H + 0.6), pt(u0, v1, H + 0.6)];
  S.quad(R[0], R[1], R[2], R[3], RUST[0], [N[0] * 0.25, 1, N[1] * 0.25]);
  S.kind = KIND.PLAIN;
  S.quad(R[3], R[2], R[1], R[0], shade(RUST[0], 0.6), [0, -1, 0]);
  S.quad(pt(u0, va, H - 0.8), pt(u1, va, H - 0.8), pt(u1, va, H + 0.05), pt(u0, va, H + 0.05), FAS, out);
  S.quad(pt(u0, va + 0.03, H + 0.05), pt(u1, va + 0.03, H + 0.05), pt(u1, va + 0.03, H - 0.8), pt(u0, va + 0.03, H - 0.8), shade(FAS, 0.7), [N[0], 0, N[1]]);
  for (let u = u0; u < u1 - 0.3; u += 0.6) S.tri(pt(u, va, H - 0.8), pt(u + 0.3, va, H - 0.95), pt(u + 0.6, va, H - 0.8), FAS, out);
  for (const u of [u0, u1]) boxUV(S, u - 0.04, u + 0.04, va, v0, 0, H - 0.8, DARK); // the fascia's end posts
  const c = P((u0 + u1) / 2, (va + v1) / 2);
  if (S.roofs) S.roofs.push({ cx: c[0], cz: c[1], w: u1 - u0, d: v1 - va, ang: ANG, y0: gy(c) + H, h: 0.6, over: 0 });
}
// a field of small stall roofs, light corrugated sheet in bays of a few metres (the white roofs between the end
// halls and the main hall on the satellite)
const STALLS = [hex('#dcdad2'), hex('#cfcdc4'), hex('#e6e4dc'), hex('#c4c6c2')];
function stalls(S, u0, u1, v0, v1, h = 4.0) {
  S.kind = KIND.PLAIN;
  boxUV(S, u0, u1, v0, v1, 0, h - 0.6, GREY, { top: shade(GREY, 0.8) });
  const nu = Math.max(1, Math.round((u1 - u0) / 4.5)), nv = Math.max(1, Math.round((v1 - v0) / 5.5));
  const su = (u1 - u0) / nu, sv = (v1 - v0) / nv;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    hipUV(S, u0 + i * su + 0.1, u0 + (i + 1) * su - 0.1, v0 + j * sv + 0.1, v0 + (j + 1) * sv - 0.1, h - 0.6, 0.6, STALLS[(i * 3 + j) % STALLS.length], { over: 0.15 });
  }
}
// open stalls on a forecourt row's street face (at v = vf, the row behind it at lower v): a dark opening in each
// bay under a yellow or red signboard, goods at the front, and here and there a white roll-out awning (Street
// View 2025 on Trần Hưng Đạo: a continuous run of open shopfronts under yellow and red boards)
const BOARDS = [hex('#e8c21e'), hex('#e8c21e'), hex('#c8161d'), hex('#e8c21e'), hex('#f0d64a'), hex('#c8161d')];
function stallFronts(S, u0, u1, vf, top) {
  S.kind = KIND.PLAIN;
  const n = Math.round((u1 - u0) / 3.3), bw = (u1 - u0) / n, oh = top - 0.95;
  for (let i = 0; i < n; i++) {
    const a = u0 + i * bw;
    boxUV(S, a + 0.3, a + bw - 0.3, vf - 0.02, vf + 0.04, 0, oh, DARK);
    boxUV(S, a + 0.1, a + bw - 0.1, vf, vf + 0.2, oh + 0.05, top - 0.1, BOARDS[(i + (u0 > 0 ? 3 : 0)) % BOARDS.length]);
    boxUV(S, a + 0.35, a + bw - 0.35, vf + 0.04, vf + 0.75, 0, 0.55 + (i % 3) * 0.2, GOODS[(i * 2) % GOODS.length]);
    if (i % 3 === 1) {
      const A = P(a + 0.2, vf + 0.2), B = P(a + bw - 0.2, vf + 0.2), Cc = P(a + bw - 0.2, vf + 1.5), D = P(a + 0.2, vf + 1.5), y = gy(A);
      const y1 = y + oh, y2 = y + oh - 0.55, W = hex('#ecebe6');
      S.quad([D[0], y2, D[1]], [Cc[0], y2, Cc[1]], [B[0], y1, B[1]], [A[0], y1, A[1]], W, [N[0] * 0.5, 0.85, N[1] * 0.5]);
      S.quad([A[0], y1, A[1]], [B[0], y1, B[1]], [Cc[0], y2, Cc[1]], [D[0], y2, D[1]], shade(W, 0.75), [-N[0] * 0.5, -0.85, -N[1] * 0.5]);
    }
  }
}

// stall tarpaulins pitched from the hood band down to bamboo poles at the kerb side (blue, yellow, red, green in
// Street View 2025), with the poles
const TARPS = [hex('#2d5fa8'), hex('#d8c27a'), hex('#b8483f'), hex('#3a8a5c'), hex('#2d5fa8')];
function tarps(S, u0, u1, va, vb, H) {
  S.kind = KIND.PLAIN;
  const w = 4.2;
  for (let i = 0, u = u0 + 1; u + w < u1; i++, u += w + 1.5 + ((i * 7) % 3) * 0.8) {
    const col = TARPS[i % TARPS.length], yo = gy(P(u, va)), y1 = yo + H - 0.8, y2 = yo + 2.5, vo = va - 2.4;
    const A = P(u, va), B = P(u + w, va), Cc = P(u + w, vo), D = P(u, vo);
    S.quad([A[0], y1, A[1]], [B[0], y1, B[1]], [Cc[0], y2, Cc[1]], [D[0], y2, D[1]], col, [N[0] * 0.4, 0.9, N[1] * 0.4]);
    S.quad([D[0], y2, D[1]], [Cc[0], y2, Cc[1]], [B[0], y1, B[1]], [A[0], y1, A[1]], shade(col, 0.8), [-N[0] * 0.4, -0.9, -N[1] * 0.4]);
    for (const q of [D, Cc]) S.cyl(q[0], q[1], yo, y2, 0.04, 0.04, 4, hex('#8a6d3b'));
  }
}
// the billboard frame on the roofline: a white lattice on two posts
function billboard(S, u, v, y, w, h, post = 1.2) {
  S.kind = KIND.PLAIN;
  boxUV(S, u - w / 2, u + w / 2, v - 0.05, v + 0.05, y, y + h, hex('#e9e9e4'));
  boxUV(S, u - w / 2 + 0.3, u + w / 2 - 0.3, v - 0.07, v + 0.07, y + 0.3, y + h - 0.3, hex('#9aa4a8'));
  for (const du of [-w / 2 + 0.4, w / 2 - 0.4]) boxUV(S, u + du - 0.06, u + du + 0.06, v - 0.1, v + 0.1, y - post, y, DARK);
}
// shopfronts on a corner building's front (face at v = vf, the street side): roll-up shutters under signboards,
// and a window above each, on the rhythm of a Huế shophouse (about 3.6 m a bay)
const SIGNS = [hex('#2d5fa8'), hex('#c8161d'), hex('#e0b63a'), hex('#2f7a4d'), hex('#e9e6dc')];
function shopfronts(S, u0, u1, vf, h) {
  S.kind = KIND.PLAIN;
  const n = Math.round((u1 - u0) / 3.6), bw = (u1 - u0) / n;
  for (let i = 0; i < n; i++) {
    const a = u0 + i * bw;
    boxUV(S, a + 0.35, a + bw - 0.35, vf - 0.02, vf + 0.12, 0, 2.7, hex('#6f7a7a'));
    boxUV(S, a + 0.25, a + bw - 0.25, vf - 0.02, vf + 0.2, 2.75, 3.25, SIGNS[(i * 2 + (u0 > 0 ? 1 : 0)) % SIGNS.length]);
    boxUV(S, a + 0.6, a + bw - 0.6, vf - 0.02, vf + 0.1, 4.3, 5.9, hex('#3b4a52'));
    boxUV(S, a + 0.5, a + bw - 0.5, vf - 0.02, vf + 0.16, 4.2, 4.3, TRIM);
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
  // the tiled awning over the ground-floor stalls on the ends and the back (inside the body, only its skirt shows);
  // its front eave stops inside the body, behind the arcade, where it showed as a red line across the openings
  hipUV(S, -HU, HU, -HV, HV - 2.0, 3.0, 1.0, TILE, { over: 1.8, flare: 0.3 });
  // the roof over the hall: eleven sheet-roofed bays running across it, front to back, between light strips over
  // the front gallery and along the back (Google satellite, 2025: green-grey sheet, the ridges square to the front)
  const NB = 11, BW = (2 * HU) / NB, BV0 = -HV + 3.5, BV1 = HV;
  S.joined(() => {
    for (let i = 0; i < NB; i++) {
      const p = P(-HU + (i + 0.5) * BW, (BV0 + BV1) / 2);
      S.hip(p[0], p[1], BV1 - BV0, BW, ANG + Math.PI / 2, gy(p) + TOP + 0.1, 1.9, SHEET, { over: 0.25 });
    }
  });

  // ---- the entrance on Trần Hưng Đạo: a flat canopy, the LED band, the giant red letters and flags ----
  const EU = 7.0, EV0 = FV, EV1 = 44.0;
  for (const u of [-EU + 0.3, -2.4, 2.4, EU - 0.3]) boxUV(S, u - 0.3, u + 0.3, EV1 - 0.9, EV1 - 0.3, 0, 4.3, TRIM);
  boxUV(S, -EU, EU, EV0, EV1, 4.3, 4.5, SOFFIT);
  boxUV(S, -EU - 0.1, EU + 0.1, EV0, EV1 + 0.1, 4.5, 4.85, TRIM, { top: TILE }); // salmon from above, like the rows
  const BY0 = 4.85, BY1 = 6.9; // the LED band: on the front and turning a few metres down either side
  boxUV(S, -EU - 0.1, EU + 0.1, EV1 - 0.4, EV1 + 0.1, BY0, BY1, LED);
  for (const s of [-1, 1]) boxUV(S, s * EU - 0.25, s * EU + 0.25, EV1 - 6, EV1, BY0, BY1, LED);
  // its red LED edging (by day, red trim; after dark, the light strips below)
  boxUV(S, -EU - 0.15, EU + 0.15, EV1 + 0.08, EV1 + 0.18, BY1 - 0.18, BY1, RED);
  boxUV(S, -EU - 0.15, EU + 0.15, EV1 + 0.08, EV1 + 0.18, BY0, BY0 + 0.18, RED);
  // white roll-down awnings hanging from the canopy's edge, their hems kicked out a little (2024 photos, Street View)
  {
    const AW = hex('#ecedea'), hang = (a, b, c, d) => {
      S.quad(a, b, c, d, AW, [N[0], 0, N[1]]);
      S.quad(d, c, b, a, shade(AW, 0.7), [-N[0], 0, -N[1]]);
    };
    const pt = (u, v, y) => { const p = P(u, v); return [p[0], gy(P(0, EV1)) + y, p[1]]; };
    for (let i = 0; i < 4; i++) {
      const a = -EU + i * (2 * EU) / 4 + 0.05, b = -EU + (i + 1) * (2 * EU) / 4 - 0.05, hem = 2.0 + (i % 2) * 0.35;
      hang(pt(a, EV1 + 0.2, 4.3), pt(b, EV1 + 0.2, 4.3), pt(b, EV1 + 0.75, hem), pt(a, EV1 + 0.75, hem));
    }
    S.kind = KIND.PLAIN;
    for (const sg of [-1, 1]) boxUV(S, sg * (EU + 0.2) - 0.03, sg * (EU + 0.2) + 0.03, EV1 - 6, EV1 + 0.1, 2.3, 4.3, AW);
  }
  // the posts the letters stand on, and the flagpoles behind them
  for (let u = -6; u <= 6.01; u += 2) boxUV(S, u - 0.06, u + 0.06, EV1 - 0.6, EV1 - 0.48, BY1, BY1 + 0.5, DARK);
  for (let i = 0; i < 7; i++) {
    const u = -6 + i * 2, p = P(u, EV1 - 1.2), y = gy(p);
    S.cyl(p[0], p[1], y + BY1, y + 10.2, 0.05, 0.04, 4, hex('#d8d8d8'));
    flag(group, { at: [p[0], y + 10.1, p[1]], w: 1.0, h: 0.7, look: FLAGS[i % 4], landmark: id }); // waves down-wind (anim.js)
  }

  // ---- the forecourt: rows of stalls either side of the entrance, and the two corner buildings ----
  shed(S, -42, -9, 31, 41, 5.0, TILE, 11);
  shed(S, 9, 40, 31, 41, 4.6, TILE, 10.5);
  stallFronts(S, -41.8, -9.2, 41, 3.6);
  stallFronts(S, 9.2, 39.8, 41, 3.2);
  for (const [u0, u1] of ([[-69, -46], [44, 67]] as any[])) {
    S.kind = KIND.CIVIC;
    boxUV(S, u0, u1, 31.5, 42, 0, 6.6, GREY, { top: shade(CONCRETE, 0.85) });
    S.kind = KIND.PLAIN;
    boxUV(S, u0 - 0.1, u1 + 0.1, 31.4, 42.1, 3.3, 3.55, TRIM);
    hipUV(S, u0, u1, 31.5, 42, 6.6, 1.0, TILE, { over: 0.8, flare: 0.2 });
    shopfronts(S, u0 + 0.3, u1 - 0.3, 42, 6.6);
  }

  // ---- the stall halls along both ends and the back (toward Chương Dương) ----
  // the back ones reach to the street behind, their eaves (0.7 m over, flared) stopping at its kerb: the back wall
  // is found on the mapped street, not a fixed depth (which hung the eaves a metre over the carriageway)
  const street = streetTest(data, C, 140);
  const backV = (u0, u1, v) => {
    let back = v;
    for (let u = u0; u <= u1 + 0.01; u += (u1 - u0) / 8) for (let w = -30; w > v - 6; w -= 0.1) if (street(...P(u, w), 0)) { back = Math.max(back, w + 0.9); break; }
    return back;
  };
  // south end (satellite 2025): the green sheet hall on the outer 28 m, an arm of it along the front, and small light
  // stall roofs in the band between it and the main hall
  shed(S, -78, -50, -21, 30, 5.0, SHEET);
  shed(S, -50, -36.2, 15, 30, 5.0, SHEET, 7);
  stalls(S, -50, -36.2, -21, 15, 4.0);
  // north end: from the main hall out, a dark brown sheet strip, small light stall roofs, a second brown strip,
  // and green sheet on the outer 14 m
  const BROWN = hex('#6a4a3c');
  shed(S, 36.2, 40, -21, 30, 5.6, BROWN, 13);
  stalls(S, 40, 54, -21, 30, 4.0);
  shed(S, 54, 64, -21, 30, 5.6, BROWN, 13);
  shed(S, 64, 78, -21, 30, 5.0, SHEET);
  // along Chương Dương (Street View from the street, 2025): a row of open stalls under arched tin hoods over a
  // concrete band, turning to a mono-pitch roof with a scalloped fascia at the north end; behind it, the long
  // sheet-roofed hall seen green on the satellite (u -37..38) and, at the south end, a taller concrete block with
  // vertical fins on its street face and a brown roof (satellite and the southern car panorama), between stall roofs
  const back = backV(-78, 38, -49), HV0 = -42;
  shed(S, -37, 38, HV0, -22.2, 6.8, SHEET, 38);
  stalls(S, -78, -66, HV0, -22.2, 4.2);
  stalls(S, -41, -37, HV0, -22.2, 4.2);
  S.kind = KIND.CIVIC;
  boxUV(S, -66, -41, -39, -22.2, 0, 8.6, CONCRETE, { top: shade(CONCRETE, 0.85) });
  S.kind = KIND.PLAIN;
  hipUV(S, -66, -41, -39, -22.2, 8.6, 1.0, BROWN, { over: 0.5, flare: 0.1 });
  boxUV(S, -66, -41, -42, -39, 0, 4.2, GREY, { top: shade(GREY, 0.8) }); // the stalls between it and the hood row
  for (let u = -65.6; u <= -41.3; u += 0.9) boxUV(S, u - 0.07, u + 0.07, -39.6, -39, 4.4, 8.4, TRIM);
  boxUV(S, -66.1, -40.9, -39.7, -39, 8.3, 8.6, TRIM);
  // the stall fronts stand back from the kerb, their hoods reaching out over them (both car panoramas on Chương
  // Dương put the stall fronts 4-6 m from the camera, where the kerb alone left them a metre away)
  hoods(S, -78, 12, back + 2.5, HV0, 5.0, 6.0, 1.3, 1.8);
  lean(S, 12, 38, back + 2.5, HV0, 5.0, 5.2, 1.8);
  tarps(S, -76, 36, back + 2.5, HV0, 5.0);
  // the billboard lattice stands on the main hall's back parapet: the two car panoramas on Chương Dương sight it on
  // rays that cross there, about u 0, and its size in the frames puts it 35-40 m from the middle one, 14-17 m up
  // on its frame just behind the hall's back parapet, standing on the back shed (6.8 m) rather than the hall slab
  billboard(S, 0, -HV - 2.0, TOP + 4.4, 9, 3.2, TOP + 4.4 - 6.6);
  S.kind = KIND.CIVIC;
  boxUV(S, 38.5, 72, -40, -22.5, 0, 7.4, GREY, { top: shade(CONCRETE, 0.85) });
  S.kind = KIND.PLAIN;
  hipUV(S, 38.5, 72, -40, -22.5, 7.4, 0.9, METAL, { over: 0.6, flare: 0.1 });
  shed(S, 38.5, 72, backV(38.5, 72, -48), -40.3, 3.6, METAL);

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
  for (const [L, col, boost] of ([[R, 0xff2010, 2.0], [Wm, 0xffc068, 1.3]] as any[])) {
    const m = new THREE.Mesh(L.geometry(), lightMaterial(col, boost));
    m.renderOrder = 19;
    m.userData.landmark = 'dongba';
    group.add(m);
  }
  return null;
}
