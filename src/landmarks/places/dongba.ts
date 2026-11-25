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
// Frame: the hall's centre HALL_CENTER, u along the front (toward the north end, the Đông Ba bridge), v out of the front
// (toward Trần Hưng Đạo, west). Heights and plan from the GISHue drone survey and OSM (docs/places/dongba.md).
export const id = 'dongba';

const HALL_CENTER = [-19.75, -402.83];
const AXIS_TANGENT = [0.4557, -0.8901];
const AXIS_NORMAL = [-0.8901, -0.4557];
const HALL_ANGLE = Math.atan2(AXIS_TANGENT[1], AXIS_TANGENT[0]);
const toWorld = (localU, localV): [number, number] => [
  HALL_CENTER[0] + AXIS_TANGENT[0] * localU + AXIS_NORMAL[0] * localV,
  HALL_CENTER[1] + AXIS_TANGENT[1] * localU + AXIS_NORMAL[1] * localV,
];
const groundY = (pos) => LAND_Y + rise(pos[0], pos[1]);

const HALL_HALF_U = 36.0;
const HALL_HALF_V = 21.3;
const FRONT_GALLERY_V = 27.0;
const HALL_ROOF_Y = 10.4; // the roof slab (GISHue survey: 11 m over the hall with the hoods)
const ENTRANCE_HALF_U = 7.0;
const ENTRANCE_V1 = 44.0;
const LED_BAND_Y0 = 4.85;
const LED_BAND_Y1 = 6.9;

const COLORS = {
  grey: hex('#cfc8b6'),
  trim: hex('#ece6d6'),
  concrete: hex('#b9b5ab'),
  dark: hex('#2b2422'),
  tile: PAL.marketRoof,
  metal: hex('#7d8783'),
  soffit: hex('#6b2e22'),
  led: hex('#141414'),
  red: hex('#c8161d'),
  sheet: hex('#55706a'),
  brown: hex('#6a4a3c'),
  flags: [hex('#e8781e'), hex('#2f9a45'), hex('#f0c419'), hex('#7b3fa0')],
  whiteRgb: [1, 1, 1],
  goods: [hex('#d8c9a0'), hex('#c44a2c'), hex('#e6e2d6'), hex('#5f8a3a'), hex('#d89a2a'), hex('#3d6f9e')],
  rust: [hex('#7c8288'), hex('#8a7e72'), hex('#6f767b'), hex('#857565')],
  fascia: hex('#c9ccc8'),
  stalls: [hex('#dcdad2'), hex('#cfcdc4'), hex('#e6e4dc'), hex('#c4c6c2')],
  boards: [hex('#e8c21e'), hex('#e8c21e'), hex('#c8161d'), hex('#e8c21e'), hex('#f0d64a'), hex('#c8161d')],
  awning: hex('#ecebe6'),
  canopyAwning: hex('#ecedea'),
  tarps: [hex('#2d5fa8'), hex('#d8c27a'), hex('#b8483f'), hex('#3a8a5c'), hex('#2d5fa8')],
  bamboo: hex('#8a6d3b'),
  billboardFrame: hex('#e9e9e4'),
  billboardPanel: hex('#9aa4a8'),
  signs: [hex('#2d5fa8'), hex('#c8161d'), hex('#e0b63a'), hex('#2f7a4d'), hex('#e9e6dc')],
  shutter: hex('#6f7a7a'),
  windowGlass: hex('#3b4a52'),
  flagpole: hex('#d8d8d8'),
  stoneFallback: hex('#a59f92'),
};

// a box given by its u/v extent in the frame, from height yMin to yMax above the ground
function boxUV(S, u0, u1, v0, v1, yMin, yMax, color, opts?) {
  const pos = toWorld((u0 + u1) / 2, (v0 + v1) / 2);
  const baseY = groundY(pos);
  S.box(pos[0], pos[1], baseY + yMin, baseY + yMax, u1 - u0, v1 - v0, HALL_ANGLE, color, opts);
}

function hipUV(S, u0, u1, v0, v1, yBase, riseH, color, opts) {
  const pos = toWorld((u0 + u1) / 2, (v0 + v1) / 2);
  S.hip(pos[0], pos[1], u1 - u0, v1 - v0, HALL_ANGLE, groundY(pos) + yBase, riseH, color, opts);
}

// a single-storey stall hall: low walls, roofed in bays of shallow hips (corrugated sheet or tile)
function buildShed(S, u0, u1, v0, v1, height, roofColor, baySize = 13) {
  S.kind = KIND.PLAIN;
  boxUV(S, u0, u1, v0, v1, 0, height - 1.4, COLORS.grey, { top: shade(COLORS.grey, 0.8) });
  const alongU = u1 - u0 >= v1 - v0;
  const spanLen = alongU ? u1 - u0 : v1 - v0;
  const bayCount = Math.max(1, Math.round(spanLen / baySize));
  const step = spanLen / bayCount;
  for (let i = 0; i < bayCount; i++) {
    if (alongU) hipUV(S, u0 + i * step, u0 + (i + 1) * step, v0, v1, height - 1.4, 1.4, roofColor, { over: 0.7, flare: 0.15 });
    else hipUV(S, u0, u1, v0 + i * step, v0 + (i + 1) * step, height - 1.4, 1.4, roofColor, { over: 0.7, flare: 0.15 });
  }
}

// open stall bays on a row's street face (at v = v0, the stalls running back to v1): piers every `step`, a dark
// recess between them under a lintel, and goods stacked at the front (Street View 2025, Chương Dương)
function buildStallBays(S, u0, u1, v0, v1, topH, step, openH = topH - 1.0) {
  S.kind = KIND.PLAIN;
  const recessD = Math.min(1.6, (v1 - v0) / 2); // the depth of the open front
  boxUV(S, u0, u1, v0 + recessD, v1, 0, topH, COLORS.grey, { top: shade(COLORS.grey, 0.8) });
  boxUV(S, u0 + 0.1, u1 - 0.1, v0 + recessD - 0.04, v0 + recessD, 0, openH, COLORS.dark);
  boxUV(S, u0, u1, v0, v0 + recessD, openH, topH, COLORS.grey, { top: shade(COLORS.grey, 0.8) }); // the lintel
  const bayCount = Math.max(1, Math.round((u1 - u0) / step));
  const bayW = (u1 - u0) / bayCount;
  for (let i = 0; i <= bayCount; i++) {
    const pierU = Math.min(u1 - 0.25, Math.max(u0 + 0.25, u0 + i * bayW));
    boxUV(S, pierU - 0.25, pierU + 0.25, v0, v0 + recessD, 0, openH, COLORS.grey);
  }
  for (let i = 0; i < bayCount; i++) {
    const bayStartU = u0 + i * bayW;
    for (let j = 0; j < 3; j++) {
      const stackU = bayStartU + 0.6 + j * (bayW - 1.2) / 3;
      const stackH = 0.5 + ((i * 5 + j * 3) % 4) * 0.25;
      boxUV(S, stackU, stackU + (bayW - 1.2) / 3 - 0.15, v0 + 0.2, v0 + recessD - 0.2, 0, stackH, COLORS.goods[(i * 3 + j) % COLORS.goods.length]);
    }
  }
}

// a stall row under arched tin hoods (the barrel of each running out to the street, v), on a concrete band; the
// hoods corrugated grey tin, rusting in patches (the ribs drawn by the roof shader, KIND.TILE)
function buildArchedHoods(S, u0, u1, v0, v1, baseH = 5.0, step = 6.0, archRise = 1.3, reach = 0.6) {
  buildStallBays(S, u0, u1, v0, v1, baseH - 0.6, step);
  S.kind = KIND.PLAIN;
  boxUV(S, u0 - 0.1, u1 + 0.1, v0 - reach, v1, baseH - 0.6, baseH, COLORS.concrete); // the band, carried out under the hoods
  const bayCount = Math.max(1, Math.round((u1 - u0) / step));
  const bayW = (u1 - u0) / bayCount;
  const archSegs = 8;
  const frontV = v0 - reach;
  const backV = v1;
  for (let i = 0; i < bayCount; i++) {
    const centerU = u0 + (i + 0.5) * bayW;
    const baseY = groundY(toWorld(centerU, (frontV + backV) / 2)) + baseH;
    const archPt = (k, localV) => {
      const frac = -1 + (2 * k) / archSegs;
      const pos = toWorld(centerU + (frac * bayW) / 2, localV);
      return [pos[0], baseY + archRise * (1 - frac * frac), pos[1]];
    };
    S.kind = KIND.TILE;
    for (let k = 0; k < archSegs; k++) {
      S.quad(archPt(k, frontV), archPt(k + 1, frontV), archPt(k + 1, backV), archPt(k, backV), COLORS.rust[(i * 3 + (k >> 2)) % COLORS.rust.length], [0, 1, 0]);
    }
    // the end of the barrel over the street, closed in the same corrugated tin, ribs upright
    const outNormal = [-AXIS_NORMAL[0], 0, -AXIS_NORMAL[1]];
    const capCenter = toWorld(centerU, frontV);
    for (let k = 0; k < archSegs; k++) {
      S.tri([capCenter[0], baseY, capCenter[1]], archPt(k, frontV), archPt(k + 1, frontV), shade(COLORS.rust[(i + 1) % COLORS.rust.length], 1.1), outNormal);
    }
    S.kind = KIND.PLAIN;
  }
  // for the mapped buildings to keep clear of, as a hip roof would (city.js roofClash)
  const centerPos = toWorld((u0 + u1) / 2, (frontV + backV) / 2);
  if (S.roofs) S.roofs.push({ cx: centerPos[0], cz: centerPos[1], w: u1 - u0, d: backV - frontV, ang: HALL_ANGLE, y0: groundY(centerPos) + baseH, h: archRise, over: 0 });
}

// the north end of the same row: a mono-pitch corrugated roof rising toward the market, its street edge a plain
// tin fascia with a scalloped lower edge (Street View 2025, car panorama mid-way along Chương Dương)
function buildMonoPitchLean(S, u0, u1, v0, v1, baseH = 5.0, step = 6.0, reach = 1.8) {
  buildStallBays(S, u0, u1, v0, v1, baseH - 0.6, step);
  const frontV = v0 - reach;
  const outNormal = [-AXIS_NORMAL[0], 0, -AXIS_NORMAL[1]];
  const point3 = (localU, localV, y) => {
    const pos = toWorld(localU, localV);
    return [pos[0], groundY(toWorld((u0 + u1) / 2, localV)) + y, pos[1]];
  };
  S.kind = KIND.TILE;
  const roofCorners = [point3(u0, frontV, baseH), point3(u1, frontV, baseH), point3(u1, v1, baseH + 0.6), point3(u0, v1, baseH + 0.6)];
  S.quad(roofCorners[0], roofCorners[1], roofCorners[2], roofCorners[3], COLORS.rust[0], [AXIS_NORMAL[0] * 0.25, 1, AXIS_NORMAL[1] * 0.25]);
  S.kind = KIND.PLAIN;
  S.quad(roofCorners[3], roofCorners[2], roofCorners[1], roofCorners[0], shade(COLORS.rust[0], 0.6), [0, -1, 0]);
  S.quad(point3(u0, frontV, baseH - 0.8), point3(u1, frontV, baseH - 0.8), point3(u1, frontV, baseH + 0.05), point3(u0, frontV, baseH + 0.05), COLORS.fascia, outNormal);
  S.quad(point3(u0, frontV + 0.03, baseH + 0.05), point3(u1, frontV + 0.03, baseH + 0.05), point3(u1, frontV + 0.03, baseH - 0.8), point3(u0, frontV + 0.03, baseH - 0.8), shade(COLORS.fascia, 0.7), [AXIS_NORMAL[0], 0, AXIS_NORMAL[1]]);
  for (let posU = u0; posU < u1 - 0.3; posU += 0.6) {
    S.tri(point3(posU, frontV, baseH - 0.8), point3(posU + 0.3, frontV, baseH - 0.95), point3(posU + 0.6, frontV, baseH - 0.8), COLORS.fascia, outNormal);
  }
  for (const postU of [u0, u1]) boxUV(S, postU - 0.04, postU + 0.04, frontV, v0, 0, baseH - 0.8, COLORS.dark); // the fascia's end posts
  const centerPos = toWorld((u0 + u1) / 2, (frontV + v1) / 2);
  if (S.roofs) S.roofs.push({ cx: centerPos[0], cz: centerPos[1], w: u1 - u0, d: v1 - frontV, ang: HALL_ANGLE, y0: groundY(centerPos) + baseH, h: 0.6, over: 0 });
}

// a field of small stall roofs, light corrugated sheet in bays of a few metres (the white roofs between the end
// halls and the main hall on the satellite)
function buildSmallStalls(S, u0, u1, v0, v1, height = 4.0) {
  S.kind = KIND.PLAIN;
  boxUV(S, u0, u1, v0, v1, 0, height - 0.6, COLORS.grey, { top: shade(COLORS.grey, 0.8) });
  const countU = Math.max(1, Math.round((u1 - u0) / 4.5));
  const countV = Math.max(1, Math.round((v1 - v0) / 5.5));
  const stepU = (u1 - u0) / countU;
  const stepV = (v1 - v0) / countV;
  for (let i = 0; i < countU; i++) {
    for (let j = 0; j < countV; j++) {
      hipUV(S, u0 + i * stepU + 0.1, u0 + (i + 1) * stepU - 0.1, v0 + j * stepV + 0.1, v0 + (j + 1) * stepV - 0.1, height - 0.6, 0.6, COLORS.stalls[(i * 3 + j) % COLORS.stalls.length], { over: 0.15 });
    }
  }
}

// open stalls on a forecourt row's street face (at v = faceV, the row behind it at lower v): a dark opening in each
// bay under a yellow or red signboard, goods at the front, and here and there a white roll-out awning (Street
// View 2025 on Trần Hưng Đạo: a continuous run of open shopfronts under yellow and red boards)
function buildForecourtStallFronts(S, u0, u1, faceV, topH) {
  S.kind = KIND.PLAIN;
  const bayCount = Math.round((u1 - u0) / 3.3);
  const bayW = (u1 - u0) / bayCount;
  const openH = topH - 0.95;
  for (let i = 0; i < bayCount; i++) {
    const startU = u0 + i * bayW;
    boxUV(S, startU + 0.3, startU + bayW - 0.3, faceV - 0.02, faceV + 0.04, 0, openH, COLORS.dark);
    boxUV(S, startU + 0.1, startU + bayW - 0.1, faceV, faceV + 0.2, openH + 0.05, topH - 0.1, COLORS.boards[(i + (u0 > 0 ? 3 : 0)) % COLORS.boards.length]);
    boxUV(S, startU + 0.35, startU + bayW - 0.35, faceV + 0.04, faceV + 0.75, 0, 0.55 + (i % 3) * 0.2, COLORS.goods[(i * 2) % COLORS.goods.length]);
    if (i % 3 === 1) {
      const ptA = toWorld(startU + 0.2, faceV + 0.2);
      const ptB = toWorld(startU + bayW - 0.2, faceV + 0.2);
      const ptC = toWorld(startU + bayW - 0.2, faceV + 1.5);
      const ptD = toWorld(startU + 0.2, faceV + 1.5);
      const baseY = groundY(ptA);
      const y1 = baseY + openH;
      const y2 = baseY + openH - 0.55;
      S.quad([ptD[0], y2, ptD[1]], [ptC[0], y2, ptC[1]], [ptB[0], y1, ptB[1]], [ptA[0], y1, ptA[1]], COLORS.awning, [AXIS_NORMAL[0] * 0.5, 0.85, AXIS_NORMAL[1] * 0.5]);
      S.quad([ptA[0], y1, ptA[1]], [ptB[0], y1, ptB[1]], [ptC[0], y2, ptC[1]], [ptD[0], y2, ptD[1]], shade(COLORS.awning, 0.75), [-AXIS_NORMAL[0] * 0.5, -0.85, -AXIS_NORMAL[1] * 0.5]);
    }
  }
}

// stall tarpaulins pitched from the hood band down to bamboo poles at the kerb side (blue, yellow, red, green in
// Street View 2025), with the poles
function buildTarpaulins(S, u0, u1, frontV, baseH) {
  S.kind = KIND.PLAIN;
  const tarpW = 4.2;
  for (let i = 0, posU = u0 + 1; posU + tarpW < u1; i++, posU += tarpW + 1.5 + ((i * 7) % 3) * 0.8) {
    const col = COLORS.tarps[i % COLORS.tarps.length];
    const baseY = groundY(toWorld(posU, frontV));
    const y1 = baseY + baseH - 0.8;
    const y2 = baseY + 2.5;
    const outerV = frontV - 2.4;
    const ptA = toWorld(posU, frontV);
    const ptB = toWorld(posU + tarpW, frontV);
    const ptC = toWorld(posU + tarpW, outerV);
    const ptD = toWorld(posU, outerV);
    S.quad([ptA[0], y1, ptA[1]], [ptB[0], y1, ptB[1]], [ptC[0], y2, ptC[1]], [ptD[0], y2, ptD[1]], col, [AXIS_NORMAL[0] * 0.4, 0.9, AXIS_NORMAL[1] * 0.4]);
    S.quad([ptD[0], y2, ptD[1]], [ptC[0], y2, ptC[1]], [ptB[0], y1, ptB[1]], [ptA[0], y1, ptA[1]], shade(col, 0.8), [-AXIS_NORMAL[0] * 0.4, -0.9, -AXIS_NORMAL[1] * 0.4]);
    for (const polePt of [ptD, ptC]) S.cyl(polePt[0], polePt[1], baseY, y2, 0.04, 0.04, 4, COLORS.bamboo);
  }
}

// the billboard frame on the roofline: a white lattice on two posts
function buildBillboard(S, centerU, centerV, baseY, width, height, postH = 1.2) {
  S.kind = KIND.PLAIN;
  boxUV(S, centerU - width / 2, centerU + width / 2, centerV - 0.05, centerV + 0.05, baseY, baseY + height, COLORS.billboardFrame);
  boxUV(S, centerU - width / 2 + 0.3, centerU + width / 2 - 0.3, centerV - 0.07, centerV + 0.07, baseY + 0.3, baseY + height - 0.3, COLORS.billboardPanel);
  for (const offsetU of [-width / 2 + 0.4, width / 2 - 0.4]) {
    boxUV(S, centerU + offsetU - 0.06, centerU + offsetU + 0.06, centerV - 0.1, centerV + 0.1, baseY - postH, baseY, COLORS.dark);
  }
}

// shopfronts on a corner building's front (face at v = faceV, the street side): roll-up shutters under signboards,
// and a window above each, on the rhythm of a Huế shophouse (about 3.6 m a bay)
function buildCornerShopfronts(S, u0, u1, faceV) {
  S.kind = KIND.PLAIN;
  const bayCount = Math.round((u1 - u0) / 3.6);
  const bayW = (u1 - u0) / bayCount;
  for (let i = 0; i < bayCount; i++) {
    const startU = u0 + i * bayW;
    boxUV(S, startU + 0.35, startU + bayW - 0.35, faceV - 0.02, faceV + 0.12, 0, 2.7, COLORS.shutter);
    boxUV(S, startU + 0.25, startU + bayW - 0.25, faceV - 0.02, faceV + 0.2, 2.75, 3.25, COLORS.signs[(i * 2 + (u0 > 0 ? 1 : 0)) % COLORS.signs.length]);
    boxUV(S, startU + 0.6, startU + bayW - 0.6, faceV - 0.02, faceV + 0.1, 4.3, 5.9, COLORS.windowGlass);
    boxUV(S, startU + 0.5, startU + bayW - 0.5, faceV - 0.02, faceV + 0.16, 4.2, 4.3, COLORS.trim);
  }
}

// the giant capitals of the sign, as a picture with a clear background (isMask: white letters, for the night glow)
function createSignTexture(THREE, isMask) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const text = 'CHỢ ĐÔNG BA'.normalize('NFC');
  let fontPx = 60;
  const makeFont = () => `900 ${fontPx}px "Helvetica Neue", Arial, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
  ctx.font = makeFont();
  const textW = ctx.measureText(text).width;
  if (textW > 490) {
    fontPx *= 490 / textW;
    ctx.font = makeFont();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isMask ? '#ffffff' : '#c8161d';
  ctx.fillText(text, 256, 56);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createGlowMaterial(THREE, maskTex, color, boost) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: maskTex }, uGlow: shared.uGlow, uColor: { value: new THREE.Color(color) }, uBoost: { value: boost } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `uniform sampler2D map; uniform vec3 uColor; uniform float uGlow, uBoost; varying vec2 vUv;
      void main() { float a = texture2D( map, vUv ).a;
        gl_FragColor = vec4( uColor * uBoost * uGlow * a, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

function buildMainHall(S) {
  // ---- the main hall: three storeys on the mapped footprint, the upper floors carried out over a front arcade ----
  S.kind = KIND.CIVIC;
  boxUV(S, -HALL_HALF_U, HALL_HALF_U, -HALL_HALF_V, HALL_HALF_V, 0, HALL_ROOF_Y, COLORS.grey, { top: shade(COLORS.concrete, 0.85) });
  boxUV(S, -HALL_HALF_U, HALL_HALF_U, HALL_HALF_V, FRONT_GALLERY_V, 3.9, HALL_ROOF_Y, COLORS.grey, { top: shade(COLORS.concrete, 0.85) });
  S.kind = KIND.PLAIN;
  // the dark arcade behind the front columns, and the columns
  boxUV(S, -HALL_HALF_U + 0.4, HALL_HALF_U - 0.4, HALL_HALF_V, HALL_HALF_V + 0.2, 0, 3.9, COLORS.dark);
  for (let colU = -HALL_HALF_U + 0.5; colU <= HALL_HALF_U - 0.4; colU += 6) {
    boxUV(S, colU - 0.35, colU + 0.35, FRONT_GALLERY_V - 0.7, FRONT_GALLERY_V, 0, 3.9, COLORS.trim);
  }
  // floor bands and the parapet
  for (const bandY of [3.9, 7.15]) {
    boxUV(S, -HALL_HALF_U - 0.15, HALL_HALF_U + 0.15, -HALL_HALF_V - 0.15, HALL_HALF_V + 0.15, bandY - 0.25, bandY + 0.1, COLORS.trim);
    boxUV(S, -HALL_HALF_U - 0.15, HALL_HALF_U + 0.15, HALL_HALF_V, FRONT_GALLERY_V + 0.15, bandY - 0.25, bandY + 0.1, COLORS.trim);
  }
  boxUV(S, -HALL_HALF_U - 0.1, HALL_HALF_U + 0.1, -HALL_HALF_V - 0.1, FRONT_GALLERY_V + 0.1, HALL_ROOF_Y - 0.1, HALL_ROOF_Y + 0.5, COLORS.trim, { top: shade(COLORS.concrete, 0.85) });
  // the tiled awning over the ground-floor stalls on the ends and the back (inside the body, only its skirt shows);
  // its front eave stops inside the body, behind the arcade, where it showed as a red line across the openings
  hipUV(S, -HALL_HALF_U, HALL_HALF_U, -HALL_HALF_V, HALL_HALF_V - 2.0, 3.0, 1.0, COLORS.tile, { over: 1.8, flare: 0.3 });
  // the roof over the hall: eleven sheet-roofed bays running across it, front to back, between light strips over
  // the front gallery and along the back (Google satellite, 2025: green-grey sheet, the ridges square to the front)
  const bayCount = 11;
  const bayW = (2 * HALL_HALF_U) / bayCount;
  const roofV0 = -HALL_HALF_V + 3.5;
  const roofV1 = HALL_HALF_V;
  S.joined(() => {
    for (let i = 0; i < bayCount; i++) {
      const pos = toWorld(-HALL_HALF_U + (i + 0.5) * bayW, (roofV0 + roofV1) / 2);
      S.hip(pos[0], pos[1], roofV1 - roofV0, bayW, HALL_ANGLE + Math.PI / 2, groundY(pos) + HALL_ROOF_Y + 0.1, 1.9, COLORS.sheet, { over: 0.25 });
    }
  });
}

function buildFrontEntrance(S, group) {
  // ---- the entrance on Trần Hưng Đạo: a flat canopy, the LED band, the giant red letters and flags ----
  const entranceV0 = FRONT_GALLERY_V;
  for (const colU of [-ENTRANCE_HALF_U + 0.3, -2.4, 2.4, ENTRANCE_HALF_U - 0.3]) {
    boxUV(S, colU - 0.3, colU + 0.3, ENTRANCE_V1 - 0.9, ENTRANCE_V1 - 0.3, 0, 4.3, COLORS.trim);
  }
  boxUV(S, -ENTRANCE_HALF_U, ENTRANCE_HALF_U, entranceV0, ENTRANCE_V1, 4.3, 4.5, COLORS.soffit);
  boxUV(S, -ENTRANCE_HALF_U - 0.1, ENTRANCE_HALF_U + 0.1, entranceV0, ENTRANCE_V1 + 0.1, 4.5, 4.85, COLORS.trim, { top: COLORS.tile }); // salmon from above, like the rows
  // the LED band: on the front and turning a few metres down either side
  boxUV(S, -ENTRANCE_HALF_U - 0.1, ENTRANCE_HALF_U + 0.1, ENTRANCE_V1 - 0.4, ENTRANCE_V1 + 0.1, LED_BAND_Y0, LED_BAND_Y1, COLORS.led);
  for (const side of [-1, 1]) boxUV(S, side * ENTRANCE_HALF_U - 0.25, side * ENTRANCE_HALF_U + 0.25, ENTRANCE_V1 - 6, ENTRANCE_V1, LED_BAND_Y0, LED_BAND_Y1, COLORS.led);
  // its red LED edging (by day, red trim; after dark, the light strips below)
  boxUV(S, -ENTRANCE_HALF_U - 0.15, ENTRANCE_HALF_U + 0.15, ENTRANCE_V1 + 0.08, ENTRANCE_V1 + 0.18, LED_BAND_Y1 - 0.18, LED_BAND_Y1, COLORS.red);
  boxUV(S, -ENTRANCE_HALF_U - 0.15, ENTRANCE_HALF_U + 0.15, ENTRANCE_V1 + 0.08, ENTRANCE_V1 + 0.18, LED_BAND_Y0, LED_BAND_Y0 + 0.18, COLORS.red);
  // white roll-down awnings hanging from the canopy's edge, their hems kicked out a little (2024 photos, Street View)
  const addHangQuad = (ptA, ptB, ptC, ptD) => {
    S.quad(ptA, ptB, ptC, ptD, COLORS.canopyAwning, [AXIS_NORMAL[0], 0, AXIS_NORMAL[1]]);
    S.quad(ptD, ptC, ptB, ptA, shade(COLORS.canopyAwning, 0.7), [-AXIS_NORMAL[0], 0, -AXIS_NORMAL[1]]);
  };
  const canopyPt = (localU, localV, y) => {
    const pos = toWorld(localU, localV);
    return [pos[0], groundY(toWorld(0, ENTRANCE_V1)) + y, pos[1]];
  };
  for (let i = 0; i < 4; i++) {
    const startU = -ENTRANCE_HALF_U + i * (2 * ENTRANCE_HALF_U) / 4 + 0.05;
    const endU = -ENTRANCE_HALF_U + (i + 1) * (2 * ENTRANCE_HALF_U) / 4 - 0.05;
    const hemY = 2.0 + (i % 2) * 0.35;
    addHangQuad(canopyPt(startU, ENTRANCE_V1 + 0.2, 4.3), canopyPt(endU, ENTRANCE_V1 + 0.2, 4.3), canopyPt(endU, ENTRANCE_V1 + 0.75, hemY), canopyPt(startU, ENTRANCE_V1 + 0.75, hemY));
  }
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    boxUV(S, side * (ENTRANCE_HALF_U + 0.2) - 0.03, side * (ENTRANCE_HALF_U + 0.2) + 0.03, ENTRANCE_V1 - 6, ENTRANCE_V1 + 0.1, 2.3, 4.3, COLORS.canopyAwning);
  }
  // the posts the letters stand on, and the flagpoles behind them
  for (let postU = -6; postU <= 6.01; postU += 2) {
    boxUV(S, postU - 0.06, postU + 0.06, ENTRANCE_V1 - 0.6, ENTRANCE_V1 - 0.48, LED_BAND_Y1, LED_BAND_Y1 + 0.5, COLORS.dark);
  }
  for (let i = 0; i < 7; i++) {
    const poleU = -6 + i * 2;
    const polePos = toWorld(poleU, ENTRANCE_V1 - 1.2);
    const poleY = groundY(polePos);
    S.cyl(polePos[0], polePos[1], poleY + LED_BAND_Y1, poleY + 10.2, 0.05, 0.04, 4, COLORS.flagpole);
    flag(group, { at: [polePos[0], poleY + 10.1, polePos[1]], w: 1.0, h: 0.7, look: COLORS.flags[i % 4], landmark: id }); // waves down-wind (anim.js)
  }
}

function buildForecourt(S) {
  // ---- the forecourt: rows of stalls either side of the entrance, and the two corner buildings ----
  buildShed(S, -42, -9, 31, 41, 5.0, COLORS.tile, 11);
  buildShed(S, 9, 40, 31, 41, 4.6, COLORS.tile, 10.5);
  buildForecourtStallFronts(S, -41.8, -9.2, 41, 3.6);
  buildForecourtStallFronts(S, 9.2, 39.8, 41, 3.2);
  for (const [u0, u1] of [[-69, -46], [44, 67]]) {
    S.kind = KIND.CIVIC;
    boxUV(S, u0, u1, 31.5, 42, 0, 6.6, COLORS.grey, { top: shade(COLORS.concrete, 0.85) });
    S.kind = KIND.PLAIN;
    boxUV(S, u0 - 0.1, u1 + 0.1, 31.4, 42.1, 3.3, 3.55, COLORS.trim);
    hipUV(S, u0, u1, 31.5, 42, 6.6, 1.0, COLORS.tile, { over: 0.8, flare: 0.2 });
    buildCornerShopfronts(S, u0 + 0.3, u1 - 0.3, 42);
  }
}

function buildPerimeterStalls(data, S) {
  // ---- the stall halls along both ends and the back (toward Chương Dương) ----
  // the back ones reach to the street behind, their eaves (0.7 m over, flared) stopping at its kerb: the back wall
  // is found on the mapped street, not a fixed depth (which hung the eaves a metre over the carriageway)
  const isStreet = streetTest(data, HALL_CENTER, 140);
  const findBackV = (u0, u1, defaultV) => {
    let backEdge = defaultV;
    for (let sampleU = u0; sampleU <= u1 + 0.01; sampleU += (u1 - u0) / 8) {
      for (let sampleV = -30; sampleV > defaultV - 6; sampleV -= 0.1) {
        if (isStreet(...toWorld(sampleU, sampleV), 0)) {
          backEdge = Math.max(backEdge, sampleV + 0.9);
          break;
        }
      }
    }
    return backEdge;
  };
  // south end (satellite 2025): the green sheet hall on the outer 28 m, an arm of it along the front, and small light
  // stall roofs in the band between it and the main hall
  buildShed(S, -78, -50, -21, 30, 5.0, COLORS.sheet);
  buildShed(S, -50, -36.2, 15, 30, 5.0, COLORS.sheet, 7);
  buildSmallStalls(S, -50, -36.2, -21, 15, 4.0);
  // north end: from the main hall out, a dark brown sheet strip, small light stall roofs, a second brown strip,
  // and green sheet on the outer 14 m
  buildShed(S, 36.2, 40, -21, 30, 5.6, COLORS.brown, 13);
  buildSmallStalls(S, 40, 54, -21, 30, 4.0);
  buildShed(S, 54, 64, -21, 30, 5.6, COLORS.brown, 13);
  buildShed(S, 64, 78, -21, 30, 5.0, COLORS.sheet);
  // along Chương Dương (Street View from the street, 2025): a row of open stalls under arched tin hoods over a
  // concrete band, turning to a mono-pitch roof with a scalloped fascia at the north end; behind it, the long
  // sheet-roofed hall seen green on the satellite (u -37..38) and, at the south end, a taller concrete block with
  // vertical fins on its street face and a brown roof (satellite and the southern car panorama), between stall roofs
  const backLine = findBackV(-78, 38, -49);
  const backHallV0 = -42;
  buildShed(S, -37, 38, backHallV0, -22.2, 6.8, COLORS.sheet, 38);
  buildSmallStalls(S, -78, -66, backHallV0, -22.2, 4.2);
  buildSmallStalls(S, -41, -37, backHallV0, -22.2, 4.2);
  S.kind = KIND.CIVIC;
  boxUV(S, -66, -41, -39, -22.2, 0, 8.6, COLORS.concrete, { top: shade(COLORS.concrete, 0.85) });
  S.kind = KIND.PLAIN;
  hipUV(S, -66, -41, -39, -22.2, 8.6, 1.0, COLORS.brown, { over: 0.5, flare: 0.1 });
  boxUV(S, -66, -41, -42, -39, 0, 4.2, COLORS.grey, { top: shade(COLORS.grey, 0.8) }); // the stalls between it and the hood row
  for (let finU = -65.6; finU <= -41.3; finU += 0.9) boxUV(S, finU - 0.07, finU + 0.07, -39.6, -39, 4.4, 8.4, COLORS.trim);
  boxUV(S, -66.1, -40.9, -39.7, -39, 8.3, 8.6, COLORS.trim);
  // the stall fronts stand back from the kerb, their hoods reaching out over them (both car panoramas on Chương
  // Dương put the stall fronts 4-6 m from the camera, where the kerb alone left them a metre away)
  buildArchedHoods(S, -78, 12, backLine + 2.5, backHallV0, 5.0, 6.0, 1.3, 1.8);
  buildMonoPitchLean(S, 12, 38, backLine + 2.5, backHallV0, 5.0, 5.2, 1.8);
  buildTarpaulins(S, -76, 36, backLine + 2.5, 5.0);
  // the billboard lattice stands on the main hall's back parapet: the two car panoramas on Chương Dương sight it on
  // rays that cross there, about u 0, and its size in the frames puts it 35-40 m from the middle one, 14-17 m up
  // on its frame just behind the hall's back parapet, standing on the back shed (6.8 m) rather than the hall slab
  buildBillboard(S, 0, -HALL_HALF_V - 2.0, HALL_ROOF_Y + 4.4, 9, 3.2, HALL_ROOF_Y + 4.4 - 6.6);
  S.kind = KIND.CIVIC;
  boxUV(S, 38.5, 72, -40, -22.5, 0, 7.4, COLORS.grey, { top: shade(COLORS.concrete, 0.85) });
  S.kind = KIND.PLAIN;
  hipUV(S, 38.5, 72, -40, -22.5, 7.4, 0.9, COLORS.metal, { over: 0.6, flare: 0.1 });
  buildShed(S, 38.5, 72, findBackV(38.5, 72, -48), -40.3, 3.6, COLORS.metal);
}

function buildRiverWharf(data, S) {
  // ---- the wharf on the river behind the fruit market: a stone quay edge with steps and bollards ----
  const quayV = -90.0;
  const stoneCol = PAL.stone || COLORS.stoneFallback;
  boxUV(S, -40, 90, quayV - 3, quayV, -1.8, 0.12, stoneCol);
  // the steps go down from the quay edge, or where the mapped bank runs out past it, from a landing at the quay's
  // level carried out to the shore: their third step (a metre under the street) stands at the water
  const isLand = landTest(data);
  let quayEdgeV = quayV - 3;
  for (let sampleV = quayEdgeV - 0.9; sampleV > quayEdgeV - 30; sampleV -= 0.25) {
    if (![18, 22, 26].some((sampleU) => isLand(...toWorld(sampleU, sampleV)))) {
      quayEdgeV = Math.min(quayEdgeV, sampleV + 0.9);
      break;
    }
  }
  if (quayEdgeV < quayV - 3) boxUV(S, 18, 26, quayEdgeV, quayV - 3 + 0.05, -1.8, 0.12, stoneCol);
  for (let k = 0; k < 4; k++) {
    boxUV(S, 18, 26, quayEdgeV - (k + 1) * 0.45, quayEdgeV - k * 0.45, -1.8, -0.4 - k * 0.35, shade(COLORS.stoneFallback, 0.9));
  }
  for (let bollardU = -35; bollardU <= 85; bollardU += 10) {
    const pos = toWorld(bollardU, quayV - 2.6);
    const y = groundY(pos);
    S.cyl(pos[0], pos[1], y + 0.1, y + 0.7, 0.2, 0.17, 6, COLORS.dark);
  }
  S.kind = KIND.PLAIN;
}

function buildSignAndNightLights(group, THREE) {
  if (!group) return;
  // the letters, standing on their posts on top of the LED band
  const signTex = createSignTexture(THREE, false);
  const maskTex = createSignTexture(THREE, true);
  const letterW = 12.6;
  const letterH = letterW * 96 / 512;
  const signPos = toWorld(0, ENTRANCE_V1 - 0.45);
  const signY = groundY(signPos) + LED_BAND_Y1 + 0.25 + letterH / 2;
  const addSignPlane = (material, offsetV, renderOrder) => {
    const pos = toWorld(0, ENTRANCE_V1 - 0.45 + offsetV);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(letterW, letterH), material);
    mesh.position.set(pos[0], signY, pos[1]);
    mesh.rotation.y = Math.atan2(AXIS_NORMAL[0], AXIS_NORMAL[1]);
    mesh.userData.landmark = 'dongba';
    if (renderOrder) mesh.renderOrder = renderOrder;
    group.add(mesh);
  };
  addSignPlane(new THREE.MeshStandardMaterial({ map: signTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0 }), 0, 0);
  addSignPlane(createGlowMaterial(THREE, maskTex, 0xff2a1a, 2.4), 0.03, 19);

  // after dark: the LED band's red edging, and a line of warm light under the hall's front cornice and the canopy
  const redBuf = new Buf(200);
  const warmBuf = new Buf(200);
  const addLightLine = (buf, u0, v0, u1, v1, offsetY) => {
    const ptA = toWorld(u0, v0);
    const ptB = toWorld(u1, v1);
    const baseY = groundY(ptA);
    buf.beam([ptA[0], baseY + offsetY, ptA[1]], [ptB[0], baseY + offsetY, ptB[1]], 0.12, 0.12, COLORS.whiteRgb);
  };
  for (const edgeY of [LED_BAND_Y0 + 0.09, LED_BAND_Y1 - 0.09]) {
    addLightLine(redBuf, -ENTRANCE_HALF_U - 0.1, ENTRANCE_V1 + 0.22, ENTRANCE_HALF_U + 0.1, ENTRANCE_V1 + 0.22, edgeY);
  }
  for (const side of [-1, 1]) {
    const pos = toWorld(side * (ENTRANCE_HALF_U + 0.1), ENTRANCE_V1 + 0.22);
    const baseY = groundY(pos);
    redBuf.beam([pos[0], baseY + LED_BAND_Y0, pos[1]], [pos[0], baseY + LED_BAND_Y1, pos[1]], 0.12, 0.12, COLORS.whiteRgb);
  }
  addLightLine(warmBuf, -HALL_HALF_U + 0.5, FRONT_GALLERY_V + 0.3, -ENTRANCE_HALF_U - 0.5, FRONT_GALLERY_V + 0.3, HALL_ROOF_Y + 0.2);
  addLightLine(warmBuf, ENTRANCE_HALF_U + 0.5, FRONT_GALLERY_V + 0.3, HALL_HALF_U - 0.5, FRONT_GALLERY_V + 0.3, HALL_ROOF_Y + 0.2);
  addLightLine(warmBuf, -ENTRANCE_HALF_U + 0.3, ENTRANCE_V1 - 0.6, ENTRANCE_HALF_U - 0.3, ENTRANCE_V1 - 0.6, 4.2);
  for (const [buf, colorHex, boost] of [[redBuf, 0xff2010, 2.0], [warmBuf, 0xffc068, 1.3]] as any[]) {
    const lightMesh = new THREE.Mesh(buf.geometry(), lightMaterial(colorHex, boost));
    lightMesh.renderOrder = 19;
    lightMesh.userData.landmark = 'dongba';
    group.add(lightMesh);
  }
}

export function build({ data, S, group, THREE }) {
  buildMainHall(S);
  buildFrontEntrance(S, group);
  buildForecourt(S);
  buildPerimeterStalls(data, S);
  buildRiverWharf(data, S);
  buildSignAndNightLights(group, THREE);
  return null;
}
