import { KIND, hex, shade, mix } from '../geo/buf.ts';
import { LAND_Y } from '../config.ts';
import { waterY } from '../geo/terrain.ts';

// Shared 3D vector, spline, tube-sweep helpers and the Hồ Thủy Tiên dragon aquarium sculpture.

const DARK_OPENING = hex('#2b2422');
const DRAGON_BODY_R = 2.15;
const DRAGON_COIL_TURNS = 1.15;
const DRAGON_COIL_STEPS = 200;
const DOME_RINGS = 6;
const DOME_HEIGHT = 3.6;
const DOME_SPRING_LIFT = 9.0;

export const add3 = (vecA, vecB) => [vecA[0] + vecB[0], vecA[1] + vecB[1], vecA[2] + vecB[2]];
export const sub3 = (vecA, vecB) => [vecA[0] - vecB[0], vecA[1] - vecB[1], vecA[2] - vecB[2]];
export const scl3 = (vec, scale) => [vec[0] * scale, vec[1] * scale, vec[2] * scale];
export const dot3 = (vecA, vecB) => vecA[0] * vecB[0] + vecA[1] * vecB[1] + vecA[2] * vecB[2];
export const crs3 = (vecA, vecB) => [
  vecA[1] * vecB[2] - vecA[2] * vecB[1],
  vecA[2] * vecB[0] - vecA[0] * vecB[2],
  vecA[0] * vecB[1] - vecA[1] * vecB[0],
];
export const nrm3 = (vec) => {
  const len = Math.hypot(vec[0], vec[1], vec[2]) || 1;
  return [vec[0] / len, vec[1] / len, vec[2] / len];
};
export const lin3 = (...terms) => terms.reduce((acc, [vec, weight]) => add3(acc, scl3(vec, weight)), [0, 0, 0]);
export const hash = (idx) => {
  const val = Math.sin(idx * 127.1 + 311.7) * 43758.5453;
  return val - Math.floor(val);
};

export function catmull(ctrl, stepLen) {
  const out = [];
  for (let seg = 1; seg < ctrl.length - 2; seg++) {
    const p0 = ctrl[seg - 1], p1 = ctrl[seg], p2 = ctrl[seg + 1], p3 = ctrl[seg + 2];
    const steps = Math.max(3, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]) / stepLen));
    for (let k = seg === 1 ? 0 : 1; k <= steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1, 2].map((axis) =>
        0.5 * (2 * p1[axis] + (-p0[axis] + p2[axis]) * t
          + (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t2
          + (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t3),
      ));
    }
  }
  return out;
}

// a triangle seen from both sides (fins, teeth)
export function fin(S, ptA, ptB, ptC, col) {
  const normal = crs3(sub3(ptB, ptA), sub3(ptC, ptA));
  S.tri(ptA, ptB, ptC, col, normal);
  S.tri(ptA, ptB, ptC, shade(col, 0.85), scl3(normal, -1));
}

// tapered block along an arbitrary axis: from origin, l0..l1 along fwd, width w0→w1 along side, height h0→h1 along up
function block(S, origin, fwd, up, side, l0, l1, w0, w1, h0, h1, col, lift = 0) {
  const ptAt = (along, across, vert) => lin3([origin, 1], [fwd, along], [side, across], [up, vert + lift]);
  const capA = [ptAt(l0, -w0 / 2, -h0 / 2), ptAt(l0, w0 / 2, -h0 / 2), ptAt(l0, w0 / 2, h0 / 2), ptAt(l0, -w0 / 2, h0 / 2)];
  const capB = [ptAt(l1, -w1 / 2, -h1 / 2), ptAt(l1, w1 / 2, -h1 / 2), ptAt(l1, w1 / 2, h1 / 2), ptAt(l1, -w1 / 2, h1 / 2)];
  const hints = [scl3(up, -1), side, up, scl3(side, -1)];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    S.quad(capA[i], capA[j], capB[j], capB[i], col, hints[i]);
  }
  S.quad(capA[0], capA[1], capA[2], capA[3], col, scl3(fwd, -1));
  S.quad(capB[0], capB[1], capB[2], capB[3], col, fwd);
}

// A tube swept along a path. dors[i] is roughly "up" for the cross-section; paint(i, up) → [colour, kind].
export function sweep(S, pts, rad, dors, sides, paint, squash = 1) {
  const rings = [];
  for (let i = 0; i < pts.length; i++) {
    const tan = nrm3(sub3(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]));
    const norm = nrm3(sub3(dors[i], scl3(tan, dot3(dors[i], tan))));
    const binorm = crs3(tan, norm);
    const ring = [];
    for (let k = 0; k < sides; k++) {
      const ang = (k / sides) * Math.PI * 2;
      const radial = add3(scl3(norm, Math.cos(ang)), scl3(binorm, Math.sin(ang) * squash));
      ring.push({ v: add3(pts[i], scl3(radial, rad[i])), d: radial, up: Math.cos(ang) });
    }
    rings.push({ ring, T: tan, N: norm, B: binorm });
  }
  for (let i = 0; i + 1 < rings.length; i++) {
    const ringA = rings[i].ring, ringB = rings[i + 1].ring;
    for (let k = 0; k < sides; k++) {
      const next = (k + 1) % sides;
      const [col, kind] = paint(i, (ringA[k].up + ringA[next].up) / 2);
      S.kind = kind;
      S.quad(ringA[k].v, ringA[next].v, ringB[next].v, ringB[k].v, col, add3(ringA[k].d, ringA[next].d));
    }
  }
  S.kind = KIND.PLAIN;
  return rings;
}

function circularRailing(S, cx, cz, radius, y, height, segs, col, gapAngles) {
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2, aMid = (a0 + a1) / 2;
    if (gapAngles.some((gapAng) => Math.abs(Math.atan2(Math.sin(aMid - gapAng), Math.cos(aMid - gapAng))) < 0.2)) continue;
    const p0 = [cx + Math.cos(a0) * radius, y + height, cz + Math.sin(a0) * radius];
    const p1 = [cx + Math.cos(a1) * radius, y + height, cz + Math.sin(a1) * radius];
    S.beam(p0, p1, 0.14, 0.14, col);
    S.beam([p0[0], y, p0[2]], p0, 0.12, 0.12, col);
  }
}

function buildAquariumDrum(S, center, drumR, bridgeAngles) {
  const lakeY = waterY(center[0], center[1]);
  const landingY = lakeY - 0.08 + 0.46;
  const conc = hex('#a3a69b'), concDark = hex('#7f847a'), pale = hex('#b9c4c2'), glass = hex('#2c444b');
  const groundR = drumR * 0.8, saucerR = drumR + 1.7, upperR = drumR * 0.7, landingR = drumR + 4.4;
  const domeSpringY = landingY + DOME_SPRING_LIFT;
  S.base = landingY - LAND_Y;

  S.kind = KIND.MASONRY;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    S.cyl(center[0] + Math.cos(ang) * (landingR - 1.4), center[1] + Math.sin(ang) * (landingR - 1.4), lakeY - 1.6, landingY - 0.4, 0.55, 0.55, 6, concDark, { cap: false });
  }
  S.cyl(center[0], center[1], lakeY - 1.6, landingY - 0.4, groundR * 0.5, groundR * 0.5, 10, concDark, { cap: false });
  S.kind = KIND.ROAD;
  S.cyl(center[0], center[1], landingY - 0.5, landingY, landingR, landingR, 28, hex('#aaa89b'));
  S.kind = KIND.PLAIN;
  circularRailing(S, center[0], center[1], landingR - 0.25, landingY, 1.0, 28, hex('#8d8f86'), bridgeAngles);

  S.kind = KIND.MASONRY;
  S.cyl(center[0], center[1], landingY, landingY + 4.1, groundR, groundR, 24, conc, { cap: false });
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], landingY + 0.9, landingY + 3.2, groundR + 0.06, groundR + 0.06, 24, glass, { cap: false });
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    S.box(center[0] + Math.cos(ang) * (groundR + 0.2), center[1] + Math.sin(ang) * (groundR + 0.2), landingY, landingY + 4.1, 0.7, 0.55, ang, shade(conc, 1.06));
  }
  for (const ang of bridgeAngles) {
    S.box(center[0] + Math.cos(ang) * (groundR + 0.36), center[1] + Math.sin(ang) * (groundR + 0.36), landingY, landingY + 3.0, 0.3, 2.6, ang, DARK_OPENING);
  }
  S.cyl(center[0], center[1], landingY + 4.1, landingY + 5.0, groundR, saucerR, 28, shade(pale, 0.8), { cap: false });
  S.cyl(center[0], center[1], landingY + 5.0, landingY + 5.5, saucerR, saucerR, 28, pale, { cap: false });
  for (let i = 0; i < 28; i += 2) {
    const ang = ((i + 0.5) / 28) * Math.PI * 2;
    S.box(center[0] + Math.cos(ang) * (saucerR + 0.02), center[1] + Math.sin(ang) * (saucerR + 0.02), landingY + 5.08, landingY + 5.42, 0.1, 1.6, ang, glass);
  }
  S.kind = KIND.FLAT;
  S.cyl(center[0], center[1], landingY + 5.5, landingY + 6.5, saucerR, upperR + 0.5, 28, shade(pale, 0.92), { cap: false });
  S.kind = KIND.MASONRY;
  S.cyl(center[0], center[1], landingY + 6.2, domeSpringY, upperR, upperR, 24, shade(conc, 1.05), { cap: false });
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 16; i++) {
    const ang = ((i + 0.5) / 16) * Math.PI * 2;
    S.box(center[0] + Math.cos(ang) * (upperR + 0.04), center[1] + Math.sin(ang) * (upperR + 0.04), landingY + 7.3, landingY + 8.5, 0.12, 1.3, ang, glass);
  }
  for (let k = 0; k < DOME_RINGS; k++) {
    const a0 = (k / DOME_RINGS) * (Math.PI / 2), a1 = ((k + 1) / DOME_RINGS) * (Math.PI / 2);
    S.cyl(center[0], center[1], domeSpringY + Math.sin(a0) * DOME_HEIGHT, domeSpringY + Math.sin(a1) * DOME_HEIGHT, upperR * Math.cos(a0), Math.max(0.05, upperR * Math.cos(a1)), 24, mix(pale, hex('#7f8c78'), 0.15 + 0.12 * k), { cap: false });
  }
  return { landingY, domeSpringY, saucerR, upperR };
}

function buildDragonHead(S, headOrigin, headDir, colors) {
  const { teal, deep, gold, horn } = colors;
  const fwd = nrm3([headDir[0], -0.16, headDir[1]]);
  const side = nrm3(crs3(fwd, [0, 1, 0]));
  const up = crs3(side, fwd);
  const headPt = (along, vert, across) => lin3([headOrigin, 1], [fwd, along], [up, vert], [side, across]);
  const rotatePair = (vecA, vecB, deg) => {
    const rad = (deg * Math.PI) / 180;
    return [nrm3(add3(scl3(vecA, Math.cos(rad)), scl3(vecB, Math.sin(rad)))), nrm3(add3(scl3(vecB, Math.cos(rad)), scl3(vecA, -Math.sin(rad))))];
  };
  const headLight = shade(teal, 1.06), headDark = shade(deep, 0.95), mouthRed = hex('#8c2f29');

  S.kind = KIND.TILE;
  block(S, headPt(-2.8, 0, 0), fwd, up, side, 0, 5.4, 5.3, 4.7, 4.7, 4.2, headLight, 0.5);
  S.kind = KIND.PLAIN;
  const jawPivot = headPt(2.2, -0.3, 0);
  const [fwdUp, upUp] = rotatePair(fwd, up, 18);
  const [fwdLo, upLo] = rotatePair(fwd, up, -26);
  block(S, jawPivot, fwdUp, upUp, side, 0, 7.8, 4.5, 2.9, 1.9, 1.25, headLight, 0.95);
  block(S, lin3([jawPivot, 1], [fwdUp, 6.8], [upUp, 1.7]), fwdUp, upUp, side, 0, 1.6, 2.5, 2.0, 1.2, 0.8, headDark, 0.2);
  block(S, jawPivot, fwdLo, upLo, side, 0, 6.8, 4.0, 2.5, 1.3, 0.8, headLight, -0.65);
  block(S, headPt(0.4, 0.1, 0), fwd, up, side, 0, 2.8, 3.6, 3.3, 2.5, 2.1, mouthRed);
  block(S, lin3([jawPivot, 1], [fwdLo, 0.6], [upLo, 0.12]), fwdLo, upLo, side, 0, 5.2, 2.0, 1.0, 0.25, 0.2, shade(mouthRed, 1.25));

  const railCol = hex('#9aa3a0');
  for (const sgn of [-1, 1]) {
    S.beam(headPt(0.5, 0.2, sgn * 1.55), headPt(3.1, 0.0, sgn * 1.55), 0.1, 0.1, railCol);
    for (const along of [0.5, 1.8, 3.1]) S.beam(headPt(along, -1.0 + (3.1 - along) * 0.08, sgn * 1.55), headPt(along, 0.2 - along * 0.065, sgn * 1.55), 0.08, 0.08, railCol);
  }
  S.beam(headPt(3.1, 0.0, -1.55), headPt(3.1, 0.0, 1.55), 0.1, 0.1, railCol);

  const toothCol = hex('#e3dcc8');
  for (const sgn of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const fang = k === 5 ? 1.9 : 1;
      const upperL = 1.4 + k * 1.08;
      const upperW = (4.5 + (2.9 - 4.5) * (upperL / 7.8)) / 2 - 0.3;
      const upperH = 0.95 - (1.9 + (1.25 - 1.9) * (upperL / 7.8)) / 2;
      const upperBase = lin3([jawPivot, 1], [fwdUp, upperL], [upUp, upperH], [side, sgn * upperW]);
      fin(S, add3(upperBase, scl3(fwdUp, -0.36)), add3(upperBase, scl3(fwdUp, 0.36)), add3(upperBase, add3(scl3(upUp, -0.9 * fang), scl3(fwdUp, 0.1))), toothCol);

      const lowerL = 1.4 + k * 0.94;
      const lowerW = (4.0 + (2.5 - 4.0) * (lowerL / 6.8)) / 2 - 0.3;
      const lowerH = -0.65 + (1.3 + (0.8 - 1.3) * (lowerL / 6.8)) / 2;
      const lowerBase = lin3([jawPivot, 1], [fwdLo, lowerL], [upLo, lowerH], [side, sgn * lowerW]);
      fin(S, add3(lowerBase, scl3(fwdLo, -0.32)), add3(lowerBase, scl3(fwdLo, 0.32)), add3(lowerBase, add3(scl3(upLo, 0.8 * fang), scl3(fwdLo, -0.1))), toothCol);
    }
  }

  for (const sgn of [-1, 1]) {
    block(S, headPt(0.9, 1.7, sgn * 2.5), fwd, up, side, -0.7, 0.7, 0.6, 0.5, 1.2, 1.0, hex('#e6d27a'));
    block(S, headPt(1.1, 1.75, sgn * 2.84), fwd, up, side, -0.25, 0.25, 0.12, 0.12, 0.7, 0.7, DARK_OPENING);
    block(S, headPt(0.2, 2.65, sgn * 2.25), fwd, up, side, -1.5, 1.8, 1.2, 0.8, 0.8, 0.6, headDark);
    const horn0 = headPt(-1.6, 2.7, sgn * 1.3);
    const horn1 = lin3([horn0, 1], [fwd, -1.9], [up, 2.8], [side, sgn * 0.9]);
    const horn2 = lin3([horn1, 1], [fwd, -3.2], [up, 1.3], [side, sgn * 0.8]);
    S.beam(horn0, horn1, 0.8, 0.8, horn); S.beam(horn1, horn2, 0.5, 0.5, horn);
    S.beam(horn1, lin3([horn1, 1], [fwd, 0.6], [up, 1.8], [side, sgn * 0.3]), 0.4, 0.4, horn);
    S.beam(lin3([horn1, 0.5], [horn2, 0.5]), lin3([horn1, 0.5], [horn2, 0.5], [up, 1.4], [fwd, -0.4]), 0.32, 0.32, horn);
    const w0 = lin3([jawPivot, 1], [fwdUp, 7.2], [upUp, 1.0], [side, sgn * 1.2]);
    const w1 = lin3([w0, 1], [side, sgn * 2.8], [fwd, -0.8], [up, 0.7]);
    const w2 = lin3([w1, 1], [side, sgn * 1.7], [fwd, -2.8], [up, -1.6]);
    const w3 = lin3([w2, 1], [side, sgn * 0.4], [fwd, -2.4], [up, -2.5]);
    S.beam(w0, w1, 0.32, 0.32, gold); S.beam(w1, w2, 0.27, 0.27, gold); S.beam(w2, w3, 0.22, 0.22, gold);
  }

  for (let k = 0; k < 9; k++) {
    const phi = -1.9 + (k / 8) * 3.8;
    const radial = add3(scl3(up, Math.cos(phi)), scl3(side, Math.sin(phi)));
    const base = add3(headPt(-2.6, 0.5, 0), scl3(radial, 2.3));
    fin(S, add3(base, scl3(fwd, -0.8)), add3(base, scl3(fwd, 0.8)), add3(headPt(-4.9, 0.5, 0), scl3(radial, 4.8)), shade(gold, 0.9));
  }
  const headCenter = headPt(-1.6, 0.6, 0), fwdAng = Math.atan2(headDir[1], headDir[0]);
  for (let k = 0; k < 16; k++) {
    const ang = fwdAng + Math.PI / 8 + (k / 16) * (Math.PI * 2 - Math.PI / 4) * (16 / 15);
    if (Math.abs(Math.atan2(Math.sin(ang - fwdAng), Math.cos(ang - fwdAng))) < 0.45) continue;
    const radial = [Math.cos(ang), 0, Math.sin(ang)], tangent = [-Math.sin(ang), 0, Math.cos(ang)];
    const dy = -0.25 + 0.5 * hash(k + 9);
    const base = add3(headCenter, scl3(radial, 2.4));
    fin(S, add3(base, scl3(tangent, 0.95)), add3(base, scl3(tangent, -0.95)), add3(headCenter, [radial[0] * 6.0, dy - 0.6, radial[2] * 6.0]), shade(gold, 0.82 + 0.16 * hash(k)));
    fin(S, add3(base, [0, 0.5, 0]), add3(base, [0, -0.5, 0]), add3(headCenter, [radial[0] * 5.4, dy - 0.3, radial[2] * 5.4]), shade(gold, 0.75));
  }
  S.kind = KIND.TILE;
  S.cyl(headCenter[0], headCenter[2], headCenter[1] - 2.2, headCenter[1] + 1.4, 2.7, 2.9, 10, headLight, { cap: false });
  S.cyl(headCenter[0], headCenter[2], headCenter[1] + 1.4, headCenter[1] + 2.6, 2.9, 1.2, 10, shade(headLight, 0.95));
  S.kind = KIND.PLAIN;
  for (const sgn of [-1, 0, 1]) {
    const base = lin3([jawPivot, 1], [fwdLo, 2.5 + Math.abs(sgn)], [upLo, -1.2], [side, sgn * 1.0]);
    fin(S, add3(base, scl3(fwdLo, -0.8)), add3(base, scl3(fwdLo, 0.8)), lin3([base, 1], [up, -2.5], [fwd, -1.4]), shade(gold, 0.85));
  }
}

export function buildDragonAquarium(S, center, drumR, headDir, bridgeAngles) {
  const { landingY, domeSpringY, saucerR, upperR } = buildAquariumDrum(S, center, drumR, bridgeAngles);
  const domeSurfR = (y) => (y <= domeSpringY ? upperR : upperR * Math.sqrt(Math.max(0.03, 1 - ((y - domeSpringY) / DOME_HEIGHT) ** 2)));

  const headAng = Math.atan2(headDir[1], headDir[0]);
  const endTheta = headAng + Math.PI;
  const yStart = landingY + 5.6 + DRAGON_BODY_R * 0.8;
  const yEnd = domeSpringY + DOME_HEIGHT * 0.85;
  const pts = [], rad = [], dors = [];
  for (let i = 0; i <= DRAGON_COIL_STEPS; i++) {
    const frac = i / DRAGON_COIL_STEPS;
    const theta = endTheta - DRAGON_COIL_TURNS * Math.PI * 2 * (1 - frac);
    const tailDroop = frac < 0.1 ? (0.1 - frac) / 0.1 : 0;
    const bodyR = DRAGON_BODY_R * Math.min(1, 0.07 + frac / 0.2) * (0.95 + 0.05 * Math.sin(frac * 11));
    const y = Math.max(landingY + 5.5 + bodyR, yStart + (yEnd - yStart) * Math.pow(frac, 1.12) - tailDroop * tailDroop * 1.6);
    const orbitR = Math.min(saucerR + 0.5, domeSurfR(y - DRAGON_BODY_R * 0.2) + DRAGON_BODY_R * 0.8 + tailDroop * tailDroop * 2.4);
    pts.push([center[0] + Math.cos(theta) * orbitR, y, center[1] + Math.sin(theta) * orbitR]);
    rad.push(bodyR);
    dors.push(nrm3([Math.cos(theta) * 0.7, 1, Math.sin(theta) * 0.7]));
  }

  const domeTopY = domeSpringY + DOME_HEIGHT;
  const coilEnd = pts[pts.length - 1];
  const neckPt = (along, y, sideOff = 0) => [center[0] + headDir[0] * along - headDir[1] * sideOff, y, center[1] + headDir[1] * along + headDir[0] * sideOff];
  const neck = catmull([
    pts[pts.length - 8], coilEnd,
    neckPt(-4.4, domeTopY + 1.4, 1.6), neckPt(-5.0, domeTopY + 3.6, 0.8), neckPt(-2.2, domeTopY + 5.6, 0),
    neckPt(5.6, domeTopY + 6.6, 0), neckPt(15.2, domeTopY + 6.0, 0), neckPt(24.6, domeTopY + 4.8, 0), neckPt(31.0, domeTopY + 3.6, 0),
  ], 0.85).slice(1);
  neck.forEach((pt, idx) => {
    const frac = idx / Math.max(1, neck.length - 1);
    pts.push(pt);
    rad.push(DRAGON_BODY_R * (1 - 0.2 * frac));
    dors.push(nrm3([-headDir[0] * (0.35 + frac * 0.9), 1 - frac * 0.4, -headDir[1] * (0.35 + frac * 0.9)]));
  });

  const colors = { teal: hex('#4f7d86'), deep: hex('#35606c'), moss: hex('#5f7350'), belly: hex('#d9cfa6'), gold: hex('#d6ad45'), horn: hex('#cdbd8f') };
  const rings = sweep(S, pts, rad, dors, 16, (idx, up) => {
    if (up < -0.52) return [shade(colors.belly, idx % 3 ? 0.95 : 0.8), KIND.PLAIN];
    const mossMix = Math.min(1, Math.max(0, 0.2 + 0.35 * Math.sin(idx * 0.19) + 0.3 * hash(idx >> 2)));
    return [shade(mix(idx % 6 < 3 ? colors.teal : colors.deep, colors.moss, mossMix * (0.35 + 0.5 * Math.max(0, up))), idx % 2 ? 0.88 : 1.02), KIND.TILE];
  }, 0.92);

  for (let i = 4; i < rings.length - 2; i += 2) {
    const { T, N } = rings[i], bodyR = rad[i], onNeck = i > DRAGON_COIL_STEPS;
    const finH = bodyR * (onNeck ? 0.95 : 0.6) * (i % 4 === 0 ? 1 : 0.7);
    const base = add3(pts[i], scl3(N, bodyR * 0.93));
    fin(S, add3(base, scl3(T, -0.8)), add3(base, scl3(T, 0.6)), add3(base, add3(scl3(N, finH), scl3(T, -1.3))), shade(colors.gold, 0.8 + 0.2 * hash(i)));
  }
  {
    const { T, N, B } = rings[1];
    for (const sgn of [-1, 0, 1]) {
      fin(S, add3(pts[0], scl3(N, 0.35)), add3(pts[0], scl3(N, -0.35)), add3(pts[0], add3(scl3(T, -2.2), add3(scl3(N, sgn * 1.1), scl3(B, sgn * 0.5)))), colors.gold);
    }
  }
  for (const frac of [0.34, 0.46, 0.74, 0.86]) {
    const idx = Math.round(frac * DRAGON_COIL_STEPS), pt = pts[idx], { T } = rings[idx];
    const inward = nrm3([center[0] - pt[0], 0, center[1] - pt[2]]);
    const sgn = frac < 0.6 ? 1 : -1;
    const hip = add3(pt, [0, -rad[idx] * 0.55, 0]);
    const knee = add3(hip, add3(scl3(T, sgn * 2.2), [0, -0.6, 0]));
    const footY = knee[1] - 1.5, footR = domeSurfR(footY) + 0.3;
    const kneeDir = nrm3([knee[0] - center[0], 0, knee[2] - center[1]]);
    const foot = [center[0] + kneeDir[0] * footR, footY, center[1] + kneeDir[2] * footR];
    S.beam(hip, knee, 1.2, 1.2, shade(colors.teal, 0.92));
    S.beam(knee, foot, 0.9, 0.9, shade(colors.deep, 0.95));
    for (const claw of [-1, 0, 1]) S.beam(foot, add3(foot, add3(scl3(T, claw * 0.9), add3([0, -1.0, 0], scl3(inward, 0.2)))), 0.3, 0.3, colors.horn);
  }

  buildDragonHead(S, pts[pts.length - 1], headDir, colors);
  S.kind = KIND.PLAIN;
}
