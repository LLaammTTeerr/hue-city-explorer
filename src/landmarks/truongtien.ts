import * as THREE from 'three';
import { KIND, hex, shade, Buf } from '../geo/buf.ts';
import { glowPoints, lightMaterial, shared } from '../geo/materials.ts';
import { LAND_Y, PAL } from '../config.ts';

// Cầu Trường Tiền: 402.6 m long, six spans of 67 m, a 6 m carriageway between the trusses and a 1.95 m walkway
// outside each, the bows 5.45 m high (docs/places/truongtien.md).
export const TT_LENGTH = 402.6;

const DECIMETRES_PER_METRE = 10;
const SPAN_COUNT = 6;
const PANELS_PER_SPAN = 16;
const DECK_TOP_M = 6.4;
const DECK_THICK_M = 1.2;
const TRESTLE_H_M = 1.5;
const WALKWAY_INSET_M = 2.35;
const BOW_HEIGHT_M = 5.45;
const END_POST_H_M = 1.3;
const APPROACH_LEN_M = 34;
const BAND_LEN = 0.85;
const BAND_SPEED = 9;
const WARM_WHITE = new THREE.Color(1.0, 0.82, 0.55);
const PALETTE = ['#8a3cff', '#2f5bff', '#19c6ff', '#2fe07a', '#ffc21a', '#ff3b2f', '#ff3fb4', '#f4f0ff'].map((hexCol) => new THREE.Color(hexCol));

interface BridgeFrame {
  center: [number, number];
  dir: [number, number];
  across: [number, number];
  ang: number;
  length: number;
  width: number;
  span: number;
  trussX: number;
  at: (alongS: number, off: number, y: number) => [number, number, number];
}

function bandColor(alongS: number, time: number, bridgeLen: number, out: THREE.Color) {
  const count = PALETTE.length;
  const pos = ((((alongS - time * BAND_SPEED) / (bridgeLen * BAND_LEN)) % 1) + 1) % 1 * count;
  const idx = Math.floor(pos) % count;
  const frac = pos - Math.floor(pos);
  const blend = frac * frac * (3 - 2 * frac);
  return out.copy(PALETTE[idx]).lerp(PALETTE[(idx + 1) % count], blend);
}

function createBandMaterial(center: [number, number], dir: [number, number], bridgeLen: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uGlow: shared.uGlow, uTime: shared.uTime, uPal: { value: PALETTE },
      uC: { value: new THREE.Vector2(center[0], center[1]) }, uD: { value: new THREE.Vector2(dir[0], dir[1]) },
      uLen: { value: bridgeLen * BAND_LEN }, uSpeed: { value: BAND_SPEED },
      uBoost: { value: 1.5 }, uWarm: { value: WARM_WHITE }, uWarmMix: { value: 0 },
    },
    vertexShader: `uniform vec2 uC, uD; varying float vS;
      void main() { vec4 w = modelMatrix * vec4( position, 1.0 ); vS = dot( w.xz - uC, uD );
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec3 uPal[ ${PALETTE.length} ]; uniform vec3 uWarm; uniform float uGlow, uBoost, uTime, uLen, uSpeed, uWarmMix;
      varying float vS;
      void main() {
        float x = fract( ( vS - uTime * uSpeed ) / uLen ) * ${PALETTE.length}.0;
        int a = int( floor( x ) ) % ${PALETTE.length};
        float f = fract( x ), m = f * f * ( 3.0 - 2.0 * f );
        vec3 c = mix( mix( uPal[ a ], uPal[ ( a + 1 ) % ${PALETTE.length} ], m ), uWarm, uWarmMix );
        gl_FragColor = vec4( c * uBoost * uGlow, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
}

function buildDeckAndApproaches(buf: Buf, frame: BridgeFrame) {
  const { center, across, ang, length, width, span, trussX, at } = frame;
  const steel = PAL.steel, steelDark = PAL.steelDark;

  buf.box(center[0], center[1], DECK_TOP_M - DECK_THICK_M, DECK_TOP_M, length, width, ang, hex('#716e6b'), { top: PAL.deck, bottom: true });
  for (const side of [-1, 1]) {
    const railOff = side * (width / 2 - 0.1);
    buf.beam(at(-length / 2, railOff, DECK_TOP_M + 1.05), at(length / 2, railOff, DECK_TOP_M + 1.05), 0.16, 0.16, steel);
    buf.beam(at(-length / 2, railOff, DECK_TOP_M + 0.55), at(length / 2, railOff, DECK_TOP_M + 0.55), 0.1, 0.1, steelDark);
    for (let dist = -length / 2; dist <= length / 2 + 0.01; dist += span / 10) {
      buf.beam(at(dist, railOff, DECK_TOP_M), at(dist, railOff, DECK_TOP_M + 1.05), 0.14, 0.14, steelDark);
    }
    for (const guardY of [0.45, 0.85]) {
      buf.beam(at(-length / 2, side * (trussX - 0.55), DECK_TOP_M + guardY), at(length / 2, side * (trussX - 0.55), DECK_TOP_M + guardY), 0.12, 0.12, steelDark);
    }
    const midPt = at(0, side * (trussX + (width / 2 - trussX) / 2), 0);
    buf.box(midPt[0], midPt[2], DECK_TOP_M, DECK_TOP_M + 0.12, length, width / 2 - trussX - 0.3, ang, hex('#b5aea4'));
  }

  for (const endSign of [-1, 1]) {
    const s0 = (endSign * length) / 2;
    const s1 = s0 + endSign * APPROACH_LEN_M;
    const rampEndY = LAND_Y + 0.08;
    const rampQuad = [at(s0, -width / 2, DECK_TOP_M), at(s0, width / 2, DECK_TOP_M), at(s1, width / 2, rampEndY), at(s1, -width / 2, rampEndY)];
    buf.quad(rampQuad[0], rampQuad[1], rampQuad[2], rampQuad[3], PAL.deck, [0, 1, 0]);
    for (const side of [-1, 1]) {
      const q0 = at(s0, (side * width) / 2, DECK_TOP_M);
      const q1 = at(s1, (side * width) / 2, rampEndY);
      const q2 = at(s0, (side * width) / 2, LAND_Y - 0.5);
      const q3 = at(s1, (side * width) / 2, LAND_Y - 0.5);
      buf.kind = KIND.MASONRY;
      buf.quad(q0, q1, q3, q2, PAL.pier, [across[0] * side, 0, across[1] * side]);
      buf.kind = KIND.PLAIN;
      buf.beam(at(s0, side * (width / 2 - 0.1), DECK_TOP_M + 1.0), at(s1, side * (width / 2 - 0.1), rampEndY + 1.0), 0.16, 0.16, steel);
    }
    const abutPt = at(s0 + endSign * 1.2, 0, 0);
    buf.kind = KIND.MASONRY;
    buf.box(abutPt[0], abutPt[2], -3, DECK_TOP_M - DECK_THICK_M, 3.4, width + 2.4, ang, PAL.pier);
    buf.kind = KIND.PLAIN;
  }
}

function buildPiers(buf: Buf, frame: BridgeFrame) {
  const { length, width, span, trussX, at } = frame;
  const steelDark = PAL.steelDark;
  const lampPos: number[] = [];
  const lampCol: number[] = [];

  for (let i = 1; i < SPAN_COUNT; i++) {
    const alongS = -length / 2 + i * span;
    const cutwaterRing = (halfU: number, tip: number) => [
      [-halfU, -width / 2 + 0.6], [0, -width / 2 - tip], [halfU, -width / 2 + 0.6],
      [halfU, width / 2 - 0.6], [0, width / 2 + tip], [-halfU, width / 2 - 0.6],
    ].map(([u, v]) => { const pt = at(alongS + u, v, 0); return [pt[0], pt[2]]; });

    const capTopY = DECK_TOP_M - DECK_THICK_M - TRESTLE_H_M;
    const capBotY = capTopY - 0.6;
    buf.kind = KIND.MASONRY;
    buf.prism(cutwaterRing(2.1, 2.6), -3, capBotY - 0.45, PAL.pier, PAL.pier, { scaleTop: 0.92, top: false });
    buf.prism(cutwaterRing(2.26, 2.85), capBotY - 0.45, capBotY, shade(PAL.pier, 1.06), shade(PAL.pier, 1.12), { scaleTop: 0.96 });
    buf.kind = KIND.PLAIN;

    const halfU = 2.3, halfV = width / 2 - 0.4, chamfer = 0.4;
    const capRing = [
      [-halfU + chamfer, -halfV], [halfU - chamfer, -halfV], [halfU, -halfV + chamfer], [halfU, halfV - chamfer],
      [halfU - chamfer, halfV], [-halfU + chamfer, halfV], [-halfU, halfV - chamfer], [-halfU, -halfV + chamfer],
    ].map(([u, v]) => { const pt = at(alongS + u, v, 0); return [pt[0], pt[2]]; });
    const capCol = shade(PAL.pier, 1.1);
    buf.prism(capRing, capBotY, capTopY, capCol, capCol);
    const capMid = at(alongS, 0, capBotY);
    for (let k = 0; k < capRing.length; k++) {
      const p0 = capRing[k], p1 = capRing[(k + 1) % capRing.length];
      buf.tri(capMid, [p0[0], capBotY, p0[1]], [p1[0], capBotY, p1[1]], shade(capCol, 0.7), [0, -1, 0]);
    }
    buf.prism(capRing.map(([x, z]) => [x + (x - capMid[0]) * 0.03, z + (z - capMid[2]) * 0.03]), capTopY - 0.22, capTopY - 0.08, shade(capCol, 0.92), capCol, { top: false });

    for (const side of [-1, 1]) {
      for (const u of [-1.2, 1.2]) buf.beam(at(alongS + u, side * trussX, capTopY), at(alongS + u, side * trussX, DECK_TOP_M - DECK_THICK_M), 0.35, 0.35, steelDark);
      buf.beam(at(alongS - 1.6, side * trussX, capTopY), at(alongS, side * trussX, DECK_TOP_M - DECK_THICK_M), 0.22, 0.22, steelDark);
      buf.beam(at(alongS + 1.6, side * trussX, capTopY), at(alongS, side * trussX, DECK_TOP_M - DECK_THICK_M), 0.22, 0.22, steelDark);
      buf.beam(at(alongS, -trussX, capTopY + 0.2), at(alongS, trussX, capTopY + 0.2), 0.25, 0.25, steelDark);
      buf.beam(at(alongS, side * (width / 2 - 0.25), DECK_TOP_M), at(alongS, side * (width / 2 - 0.25), DECK_TOP_M + 4.2), 0.18, 0.18, steelDark);
      const headPt = at(alongS, side * (width / 2 - 0.25), DECK_TOP_M + 4.5);
      lampPos.push(...headPt);
      lampCol.push(1.0, 0.8, 0.5);
    }
  }
  return { lampPos, lampCol };
}

function buildBowSpans(buf: Buf, group: THREE.Group, frame: BridgeFrame, bandMat: THREE.ShaderMaterial) {
  const { center, dir, across, length, span, trussX, at } = frame;
  const steel = PAL.steel, steelDark = PAL.steelDark;
  const spanLights: any[] = [];
  const lampS: number[][] = [];
  const white = [1, 1, 1];

  for (let spanIdx = 0; spanIdx < SPAN_COUNT; spanIdx++) {
    const startS = -length / 2 + spanIdx * span;
    const lightPos: number[] = [];
    const lightCol: number[] = [];
    const topNode = (panel: number, side: number) => {
      const frac = panel / PANELS_PER_SPAN;
      const u = 2 * frac - 1;
      return at(startS + frac * span, side * trussX, DECK_TOP_M + 0.25 + END_POST_H_M + (BOW_HEIGHT_M - END_POST_H_M) * Math.pow(Math.max(0, 1 - u * u), 0.62));
    };
    const botNode = (panel: number, side: number) => at(startS + (panel / PANELS_PER_SPAN) * span, side * trussX, DECK_TOP_M + 0.25);

    for (const side of [-1, 1]) {
      buf.beam(botNode(0, side), botNode(PANELS_PER_SPAN, side), 0.55, 0.5, steelDark);
      for (let k = 0; k < PANELS_PER_SPAN; k++) {
        buf.beam(topNode(k, side), topNode(k + 1, side), 0.78, 0.8, steel);
        buf.beam(topNode(k, side), botNode(k, side), k === 0 ? 0.6 : 0.4, 0.4, steel);
        if (k >= 1 && k < PANELS_PER_SPAN / 2) buf.beam(topNode(k, side), botNode(k + 1, side), 0.3, 0.3, steelDark);
        if (k >= PANELS_PER_SPAN / 2 && k < PANELS_PER_SPAN - 1) buf.beam(topNode(k + 1, side), botNode(k, side), 0.3, 0.3, steelDark);
        for (const frac of [0, 0.5]) {
          const p0 = topNode(k, side), p1 = topNode(k + 1, side);
          lightPos.push(p0[0] + (p1[0] - p0[0]) * frac, p0[1] + (p1[1] - p0[1]) * frac + 0.5, p0[2] + (p1[2] - p0[2]) * frac);
          lightCol.push(1, 1, 1);
        }
        if (k >= 1 && k % 2 === 0) {
          const tp = topNode(k, side), bp = botNode(k, side);
          lightPos.push(tp[0], (tp[1] + bp[1]) / 2, tp[2]);
          lightCol.push(0.6, 0.6, 0.6);
        }
      }
    }

    let prevPair: [number[], number[]] | null = null;
    for (let k = 2; k <= PANELS_PER_SPAN - 2; k++) {
      const left = topNode(k, -1), right = topNode(k, 1);
      if (left[1] < DECK_TOP_M + 4.6) continue;
      buf.beam(left, right, 0.34, 0.34, steel);
      if (prevPair) {
        buf.beam(prevPair[0], right, 0.2, 0.2, steelDark);
        buf.beam(prevPair[1], left, 0.2, 0.2, steelDark);
      }
      prevPair = [left, right];
    }

    const pts = glowPoints(lightPos, lightCol, 3.4);
    (pts.geometry.attributes.color as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage); // recoloured every frame
    group.add(pts);
    spanLights.push(pts);
    const alongList: number[] = [];
    for (let j = 0; j < lightPos.length; j += 3) alongList.push((lightPos[j] - center[0]) * dir[0] + (lightPos[j + 2] - center[1]) * dir[1]);
    lampS.push(alongList);

    const ledBuf = new Buf(700);
    const outerOf = (pt: number[], side: number, off = 0.5, up = 0) => [pt[0] + across[0] * side * off, pt[1] + up, pt[2] + across[1] * side * off];
    for (const side of [-1, 1]) {
      for (let k = 0; k < PANELS_PER_SPAN; k++) {
        ledBuf.beam(outerOf(topNode(k, side), side, 0.46, 0.2), outerOf(topNode(k + 1, side), side, 0.46, 0.2), 0.2, 0.5, white);
        ledBuf.beam(outerOf(topNode(k, side), side, 0.3), outerOf(botNode(k, side), side, 0.3), 0.12, 0.12, white);
      }
      ledBuf.beam(outerOf(botNode(0, side), side, 0.36), outerOf(botNode(PANELS_PER_SPAN, side), side, 0.36), 0.14, 0.28, white);
    }
    const strip = new THREE.Mesh(ledBuf.geometry(), bandMat);
    strip.renderOrder = 19;
    strip.userData.landmark = true;
    group.add(strip);
  }
  return { spanLights, lampS };
}

export function buildTruongTien(data: any, buf: Buf, group: THREE.Group) {
  const tt = data.truongtien;
  const isPt = (pt: any) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]);
  if (!tt || !isPt(tt.a) || !isPt(tt.b) || !tt.box || !isPt(tt.box.c) || !(tt.box.w > 0) || !(tt.box.d > 0)) {
    console.warn('Trường Tiền not built: data.truongtien missing or incomplete');
    const lamps = glowPoints([], [], 8);
    group.add(lamps);
    return { centre: [0, 0], dir: [1, 0], across: [0, 1], length: 0, width: 0, span: 0, deckTop: 0, deckBottom: 0, lights: [], lamps, update() {} };
  }

  const northEnd = [tt.a[0] / DECIMETRES_PER_METRE, tt.a[1] / DECIMETRES_PER_METRE];
  const southEnd = [tt.b[0] / DECIMETRES_PER_METRE, tt.b[1] / DECIMETRES_PER_METRE];
  const length = TT_LENGTH;
  const width = tt.box.d / DECIMETRES_PER_METRE;
  const center: [number, number] = [tt.box.c[0] / DECIMETRES_PER_METRE, tt.box.c[1] / DECIMETRES_PER_METRE];
  const axisLen = Math.hypot(southEnd[0] - northEnd[0], southEnd[1] - northEnd[1]);
  const dir: [number, number] = [(southEnd[0] - northEnd[0]) / axisLen, (southEnd[1] - northEnd[1]) / axisLen];
  const across: [number, number] = [-dir[1], dir[0]];
  const span = length / SPAN_COUNT;
  const frame: BridgeFrame = {
    center,
    dir,
    across,
    ang: Math.atan2(dir[1], dir[0]),
    length,
    width,
    span,
    trussX: width / 2 - WALKWAY_INSET_M,
    at: (alongS, off, y) => [center[0] + dir[0] * alongS + across[0] * off, y, center[1] + dir[1] * alongS + across[1] * off],
  };

  buildDeckAndApproaches(buf, frame);
  const { lampPos, lampCol } = buildPiers(buf, frame);
  const bandMat = createBandMaterial(center, dir, length);
  const { spanLights, lampS } = buildBowSpans(buf, group, frame, bandMat);

  const lamps = glowPoints(lampPos, lampCol, 8);
  group.add(lamps);

  const edgeBuf = new Buf(160);
  const white = [1, 1, 1];
  for (const side of [-1, 1]) {
    edgeBuf.beam(frame.at(-length / 2, side * (width / 2 + 0.08), DECK_TOP_M - 0.12), frame.at(length / 2, side * (width / 2 + 0.08), DECK_TOP_M - 0.12), 0.1, 0.16, white);
    for (let i = 1; i < SPAN_COUNT; i++) {
      const alongS = -length / 2 + i * span;
      edgeBuf.beam(frame.at(alongS, side * (width / 2 + 1.2), 0.5), frame.at(alongS, side * (width / 2 + 0.5), DECK_TOP_M - DECK_THICK_M - TRESTLE_H_M - 0.8), 0.5, 0.2, white);
    }
  }
  const edgeMesh = new THREE.Mesh(edgeBuf.geometry(), lightMaterial(0xffd9a0, 0.75));
  edgeMesh.renderOrder = 19;
  edgeMesh.userData.landmark = true;
  group.add(edgeMesh);

  const colorTmp = new THREE.Color();
  return {
    centre: center,
    dir,
    across,
    length,
    width,
    span,
    deckTop: DECK_TOP_M,
    deckBottom: DECK_TOP_M - DECK_THICK_M,
    lights: spanLights,
    lamps,
    update(time: number, _glow: number, rain: number) {
      const warmMix = Math.min(1, rain * 0.85);
      bandMat.uniforms.uWarmMix.value = warmMix;
      bandMat.uniforms.uBoost.value = 1.5 + rain * 0.4;
      for (let i = 0; i < spanLights.length; i++) {
        const uniforms = spanLights[i].material.uniforms;
        const colorAttr = spanLights[i].geometry.attributes.color;
        const alongList = lampS[i];
        uniforms.uTint.value.setRGB(1, 1, 1);
        uniforms.uBoost.value = 0.55 + rain * 0.25;
        for (let j = 0; j < alongList.length; j++) {
          bandColor(alongList[j], time, length, colorTmp).lerp(WARM_WHITE, warmMix).multiplyScalar(0.6);
          colorAttr.setXYZ(j, colorTmp.r, colorTmp.g, colorTmp.b);
        }
        colorAttr.needsUpdate = true;
      }
    },
  };
}
