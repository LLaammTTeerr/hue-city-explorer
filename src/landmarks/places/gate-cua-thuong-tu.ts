import { Buf, KIND, hex, mix, shade } from '../../geo/buf.ts';
import { LAND_Y, WALL_H, PAL } from '../../config.ts';
import { lightMaterial, glowPoints } from '../../geo/materials.ts';

// Cửa Thượng Tứ (Đông Nam Môn 東南門), the south-east gate of the Huế Citadel (Kinh thành).
// Notes and sources: docs/places/gate-cua-thuong-tu.md.
// Local frame: s along the wall, t through it, + out of the Citadel (south-east, towards the moat).
export const id = 'gate:Cửa Thượng Tứ';

const CENTER = [-497.9, -100.7];
const AXIS_ANG = -0.626;
const COS_A = Math.cos(AXIS_ANG), SIN_A = Math.sin(AXIS_ANG);
const toWorld2 = (s, t): [number, number] => [CENTER[0] + s * COS_A - t * SIN_A, CENTER[1] + s * SIN_A + t * COS_A];
const toWorld3 = (s, t, y?) => { const pt = toWorld2(s, t); return [pt[0], y, pt[1]]; };
const toWorldNorm = (ds, dt, dy = 0): [number, number, number] => [ds * COS_A - dt * SIN_A, dy, ds * SIN_A + dt * COS_A];

const BLOCK_W = 18.8;
const T_INNER = -7.45, T_OUTER = 9.3;
const T_MID = (T_INNER + T_OUTER) / 2, BLOCK_D = T_OUTER - T_INNER;
const NOTCH = { s0: -5.0, s1: 4.0, t: -12.3 };
const BLOCK_H = WALL_H + 1.85;
const ARCH = { w: 3.82, h: 5.19 };
const TABLET_DIM = { w: 2.31, h: 1.1 };
const RECESS = { r: 2.8, d: 3.0 };
const TOWER = { t: 1.0, w: 10.4, d: 8.0, plinth: 0.2, wallH: 4.2, uw: 4.6, ud: 4.3, uwallH: 2.0 };
const ARCH_SEGS = 10;

const COLORS = {
  brickBase: hex('#584a43'),
  lime: hex('#86827a'),
  brickIn: hex('#6b4136'),
  body: hex('#76665a'),
  bodyTop: hex('#7d776b'),
  plinth: hex('#5a5750'),
  frame: hex('#8f897c'),
  dark: hex('#1f1b19'),
  tablet: hex('#4d5351'),
  glyph: hex('#464c4a'),
  lim: hex('#4a2e1f'),
  plaster: hex('#b9b19c'),
  plasterTop: hex('#a69f8b'),
  brick: hex('#9c5a40'),
  upperBrick: hex('#8f604c'),
  tile: hex('#8a7462'),
  tileEdge: hex('#a0664a'),
  ridge: hex('#9d968a'),
};

const hash = (i, j) => { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); };
function valueNoise(x, y) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function smoothstep(lo, hi, val) {
  const t = Math.min(1, Math.max(0, (val - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

function buildGateBlockAndTrim(S, box) {
  const baseY = LAND_Y;
  const archR = ARCH.w / 2, crownY = baseY + ARCH.h, springY = crownY - archR;
  const recessR = RECESS.r, recessCrownY = springY + recessR, tRecess = T_INNER + RECESS.d;
  const topY = baseY + BLOCK_H;

  const drawColoredTri = (ptA, ptB, ptC, colA, colB, colC, norm) => {
    const e1 = [ptB[0] - ptA[0], ptB[1] - ptA[1], ptB[2] - ptA[2]];
    const e2 = [ptC[0] - ptA[0], ptC[1] - ptA[1], ptC[2] - ptA[2]];
    const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (cross[0] * norm[0] + cross[1] * norm[1] + cross[2] * norm[2] < 0) S.smoothTri([ptA, ptC, ptB], [norm, norm, norm], [colA, colC, colB]);
    else S.smoothTri([ptA, ptB, ptC], [norm, norm, norm], [colA, colB, colC]);
  };
  const makePalette = (brickCol, seed, limeThresh = 0.5) => (s, y) => {
    const h = y - baseY;
    const noiseVal = 0.65 * valueNoise(s * 0.3 + seed, h * 0.38 + seed * 0.7) + 0.35 * valueNoise(s * 0.8 + 11 + seed, h * 0.9 + 3);
    const col = mix(brickCol, COLORS.lime, smoothstep(limeThresh, limeThresh + 0.12, noiseVal) * 0.95);
    return shade(col, (0.82 + 0.3 * valueNoise(s * 1.4 + seed, h * 0.12)) * (0.72 + 0.28 * smoothstep(0.6, 2.2, h)));
  };
  const outerPal = makePalette(COLORS.brickBase, 3.1, 0.36);
  const innerPal = makePalette(COLORS.brickIn, 7.7, 0.52);

  const drawSkin = (t, dt, s0, s1, y0, y1, pal) => {
    const norm = toWorldNorm(0, dt);
    const nu = Math.max(1, Math.ceil((s1 - s0) / 0.55)), nv = Math.max(1, Math.ceil((y1 - y0) / 0.55));
    S.kind = KIND.PLAIN;
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const sa = s0 + ((s1 - s0) * i) / nu, sb = s0 + ((s1 - s0) * (i + 1)) / nu;
        const ya = y0 + ((y1 - y0) * j) / nv, yb = y0 + ((y1 - y0) * (j + 1)) / nv;
        const a = toWorld3(sa, t, ya), b = toWorld3(sb, t, ya), c = toWorld3(sb, t, yb), d = toWorld3(sa, t, yb);
        const ca = pal(sa, ya), cb = pal(sb, ya), cc = pal(sb, yb), cd = pal(sa, yb);
        drawColoredTri(a, b, c, ca, cb, cc, norm);
        drawColoredTri(a, c, d, ca, cc, cd, norm);
      }
    }
  };
  const arcAt = (k, rad) => { const th = Math.PI - (Math.PI * k) / ARCH_SEGS; return [rad * Math.cos(th), springY + rad * Math.sin(th)]; };
  const drawFaceSkin = (t, dt, openR, sMin, sMax, pal) => {
    const ringOuter = openR + 0.4, archTop = springY + ringOuter;
    drawSkin(t, dt, sMin, -ringOuter, baseY, topY, pal);
    drawSkin(t, dt, ringOuter, sMax, baseY, topY, pal);
    drawSkin(t, dt, -ringOuter, ringOuter, archTop, topY, pal);
    const norm = toWorldNorm(0, dt);
    for (let k = 0; k < ARCH_SEGS; k++) {
      const [sa, ya] = arcAt(k, ringOuter), [sb, yb] = arcAt(k + 1, ringOuter);
      const a = toWorld3(sa, t, ya), b = toWorld3(sb, t, yb), c = toWorld3(sb, t, archTop), d = toWorld3(sa, t, archTop);
      drawColoredTri(a, b, c, pal(sa, ya), pal(sb, yb), pal(sb, archTop), norm);
      drawColoredTri(a, c, d, pal(sa, ya), pal(sb, archTop), pal(sa, archTop), norm);
    }
    for (const sgn of [-1, 1]) drawSkin(t, dt, sgn < 0 ? -ringOuter : openR, sgn < 0 ? -openR : ringOuter, baseY, springY, pal);
  };

  // Block massing
  S.kind = KIND.MASONRY;
  const tInnerCore = T_INNER + 0.05, tOuterCore = T_OUTER - 0.05;
  box(0, (tInnerCore + tOuterCore) / 2, recessCrownY, topY, BLOCK_W, tOuterCore - tInnerCore, COLORS.body, { top: COLORS.bodyTop, topKind: KIND.ROAD });
  for (const sgn of [-1, 1]) {
    box(sgn * (recessR + (BLOCK_W / 2 - recessR) / 2), (tInnerCore + tRecess) / 2, baseY - 0.5, recessCrownY, BLOCK_W / 2 - recessR, tRecess - tInnerCore, COLORS.body);
    box(sgn * (archR + (BLOCK_W / 2 - archR) / 2), (tRecess + 0.04 + tOuterCore) / 2, baseY - 0.5, recessCrownY, BLOCK_W / 2 - archR, tOuterCore - tRecess - 0.04, COLORS.body);
  }
  box(0, (tRecess + 0.04 + tOuterCore) / 2, crownY, recessCrownY, ARCH.w + 0.02, tOuterCore - tRecess - 0.04, COLORS.body);

  drawFaceSkin(T_OUTER, 1, archR, -BLOCK_W / 2, BLOCK_W / 2, outerPal);
  drawFaceSkin(T_INNER, -1, recessR, NOTCH.s0 - 0.4, NOTCH.s1 + 0.4, innerPal);

  // Recess back wall & barrel vaults
  S.kind = KIND.PLAIN;
  for (let k = 0; k < ARCH_SEGS; k++) {
    const [sa, ya] = arcAt(k, archR), [sb, yb] = arcAt(k + 1, archR);
    const [oa, yoa] = arcAt(k, recessR), [ob, yob] = arcAt(k + 1, recessR);
    S.quad(toWorld3(sa, tRecess, ya), toWorld3(sb, tRecess, yb), toWorld3(ob, tRecess, yob), toWorld3(oa, tRecess, yoa), shade(COLORS.brickIn, 0.8), toWorldNorm(0, -1));
  }
  for (const sgn of [-1, 1]) S.quad(toWorld3(sgn * archR, tRecess, baseY), toWorld3(sgn * recessR, tRecess, baseY), toWorld3(sgn * recessR, tRecess, springY), toWorld3(sgn * archR, tRecess, springY), shade(COLORS.brickIn, 0.8), toWorldNorm(0, -1));

  const drawVault = (openR, ta, tb, vaultCol, sideCol) => {
    for (let k = 0; k < ARCH_SEGS; k++) {
      const [sa, ya] = arcAt(k, openR), [sb, yb] = arcAt(k + 1, openR);
      S.quad(toWorld3(sa, ta, ya), toWorld3(sb, ta, yb), toWorld3(sb, tb, yb), toWorld3(sa, tb, ya), vaultCol, toWorldNorm(-(sa + sb) / 2, 0, springY - (ya + yb) / 2));
    }
    for (const sgn of [-1, 1]) {
      const s = sgn * (openR - 0.02);
      S.quad(toWorld3(s, ta, baseY), toWorld3(s, tb, baseY), toWorld3(s, tb, springY), toWorld3(s, ta, springY), sideCol, toWorldNorm(-sgn, 0));
    }
  };
  drawVault(recessR, T_INNER + 0.01, tRecess, shade(COLORS.brickIn, 0.7), shade(COLORS.brickIn, 0.62));
  drawVault(archR, tRecess, T_OUTER - 0.01, shade(COLORS.body, 0.42), shade(COLORS.dark, 1.6));

  S.kind = KIND.ROAD;
  S.quad(toWorld3(-recessR, T_INNER - 0.3, baseY + 0.02), toWorld3(recessR, T_INNER - 0.3, baseY + 0.02), toWorld3(recessR, tRecess, baseY + 0.02), toWorld3(-recessR, tRecess, baseY + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.quad(toWorld3(-archR, tRecess, baseY + 0.02), toWorld3(archR, tRecess, baseY + 0.02), toWorld3(archR, T_OUTER + 0.3, baseY + 0.02), toWorld3(-archR, T_OUTER + 0.3, baseY + 0.02), shade(PAL.stone, 0.62), [0, 1, 0]);

  S.kind = KIND.TIMBER;
  for (const sgn of [-1, 1]) {
    const tc = T_OUTER - 4.2;
    box(sgn * (archR - 0.12), tc, baseY + 0.05, springY + 0.6, 0.14, ARCH.w / 2 - 0.05, COLORS.lim);
    for (const yb of [baseY + 0.9, baseY + 2.3, baseY + 3.6]) box(sgn * (archR - 0.2), tc, yb, yb + 0.1, 0.04, ARCH.w / 2 - 0.1, hex('#2a2624'));
  }

  // Arch rings, outer tablet, cornices, parapet & wing piers
  S.kind = KIND.PLAIN;
  const drawArchRing = (t, dt, openR, col) => {
    const tt = t + dt * 0.08;
    for (const sgn of [-1, 1]) box(sgn * (openR + 0.2), tt, baseY, springY, 0.4, 0.16, col);
    for (let k = 0; k < ARCH_SEGS; k++) {
      const [sa, ya] = arcAt(k, openR + 0.2), [sb, yb] = arcAt(k + 1, openR + 0.2);
      S.beam(toWorld3(sa, tt, ya), toWorld3(sb, tt, yb), 0.16, 0.4, col);
    }
  };
  drawArchRing(T_OUTER, 1, archR, COLORS.frame);
  drawArchRing(T_INNER, -1, recessR, shade(COLORS.brickIn, 1.12));

  for (const sgn of [-1, 1]) {
    const plinthW = BLOCK_W / 2 - archR - 0.4;
    box(sgn * (archR + 0.4 + plinthW / 2), T_OUTER + 0.05, baseY - 0.2, baseY + 0.8, plinthW, 0.1, COLORS.plinth);
  }
  box(0, T_OUTER + 0.11, crownY + 0.05, crownY + 0.45, 0.42, 0.18, shade(COLORS.frame, 1.08));
  box(0, T_OUTER + 0.1, crownY + 1.05, crownY + 1.4, ARCH.w + 2.6, 0.2, COLORS.frame);
  const tabY = crownY + 1.65;
  box(0, T_OUTER + 0.1, tabY - 0.12, tabY + TABLET_DIM.h + 0.12, TABLET_DIM.w + 0.3, 0.2, shade(COLORS.frame, 0.92));
  box(0, T_OUTER + 0.21, tabY, tabY + TABLET_DIM.h, TABLET_DIM.w, 0.06, COLORS.tablet);
  for (const colIdx of [-1, 0, 1]) {
    for (let row = 0; row < 3; row++) {
      const yc = tabY + 0.28 + row * ((TABLET_DIM.h - 0.56) / 3);
      box(colIdx * 0.68, T_OUTER + 0.245, yc, yc + (TABLET_DIM.h - 0.56) / 3 - 0.09, 0.3, 0.01, COLORS.glyph);
    }
  }
  box(0, T_OUTER + 0.12, topY - 0.35, topY, BLOCK_W + 0.24, 0.24, COLORS.bodyTop);
  for (const sgn of [-1, 1]) box(sgn * (BLOCK_W / 2 + 0.06), T_MID, topY - 0.35, topY, 0.12, BLOCK_D + 0.24, COLORS.bodyTop);
  box(0, T_INNER - 0.05, baseY - 0.2, baseY + 0.6, NOTCH.s1 - NOTCH.s0 + 0.8, 0.1, COLORS.plinth);
  box(0, T_INNER - 0.12, topY - 0.35, topY, BLOCK_W + 0.24, 0.24, COLORS.bodyTop);
  box(0, T_INNER - 0.08, topY - 1.3, topY - 1.1, NOTCH.s1 - NOTCH.s0 + 0.8, 0.16, shade(COLORS.brickIn, 1.05));

  const drawRail = (len, isAlong, offset, y0, footH, topH, postPitch, includeEnds = true) => {
    const pos = (u) => (isAlong ? [u, offset] : [offset, T_MID + u]);
    const dims = (a, b) => (isAlong ? [a, b] : [b, a]);
    S.kind = KIND.MASONRY;
    { const [ss, st] = dims(len, 0.4); const [s, t] = pos(0); box(s, t, y0, y0 + footH, ss, st, COLORS.body, { top: COLORS.bodyTop }); }
    S.kind = KIND.PLAIN;
    { const [ss, st] = dims(len - 0.2, 0.16); const [s, t] = pos(0); box(s, t, y0 + footH, topH - 0.12, ss, st, shade(COLORS.body, 0.62)); }
    { const [ss, st] = dims(len, 0.34); const [s, t] = pos(0); box(s, t, topH - 0.12, topH, ss, st, COLORS.bodyTop); }
    const count = Math.max(2, Math.round(len / postPitch));
    for (let k = 0; k <= count; k++) {
      const u = -len / 2 + (len * k) / count, isEnd = k === 0 || k === count;
      if (isEnd && !includeEnds) continue;
      const [ss, st] = dims(isEnd ? 0.5 : 0.3, isEnd ? 0.5 : 0.3);
      const [s, t] = pos(u);
      box(s, t, y0, topH + (isEnd ? 0.18 : 0.06), ss, st, shade(COLORS.body, 1.05), { top: COLORS.bodyTop });
    }
  };
  drawRail(BLOCK_W - 1.6, true, T_OUTER - 0.25, topY, 0.25, topY + 0.62, 1.9, false);
  S.kind = KIND.MASONRY;
  box(0, T_INNER + 0.25, topY, topY + 0.62, BLOCK_W, 0.45, COLORS.body, { top: COLORS.bodyTop });
  box(0, T_INNER + 0.22, topY + 0.62, topY + 0.8, BLOCK_W + 0.1, 0.6, COLORS.bodyTop);
  for (const sgn of [-1, 1]) drawRail(BLOCK_D - 1.0, false, sgn * (BLOCK_W / 2 - 0.25), topY, 0.25, topY + 0.62, 1.9);

  S.kind = KIND.PLAIN;
  for (const sgn of [-1, 1]) {
    const s = sgn * (BLOCK_W / 2 - 0.65), pilCol = shade(mix(COLORS.brickBase, COLORS.lime, 0.45), 1.0);
    box(s, T_OUTER, baseY - 0.2, topY + 0.55, 1.3, 0.8, pilCol, { taper: 0.74 });
    box(s, T_OUTER - 0.2, topY + 0.55, topY + 0.72, 1.15, 0.85, COLORS.bodyTop);
    box(s, T_OUTER - 0.2, topY + 0.72, topY + 1.05, 0.8, 0.6, pilCol);
    box(s, T_OUTER - 0.2, topY + 1.05, topY + 1.2, 1.05, 0.8, COLORS.bodyTop);
  }

  for (const [sEdge, sgn] of ([[NOTCH.s0, -1], [NOTCH.s1, 1]] as any[])) {
    const pierW = 1.7, pierL = 2.4, s = sEdge + sgn * (pierW / 2 - 0.25), t = NOTCH.t - 0.3 + pierL / 2, wallTopY = baseY + WALL_H;
    const pierCol = mix(COLORS.brickBase, COLORS.lime, 0.55);
    S.kind = KIND.PLAIN;
    box(s, t, baseY - 0.3, wallTopY + 0.35, pierW, pierL, pierCol, { top: COLORS.bodyTop });
    box(s, t, wallTopY + 0.35, wallTopY + 0.6, pierW + 0.35, pierL + 0.35, COLORS.bodyTop);
    box(s, t, wallTopY + 0.6, wallTopY + 1.25, pierW - 0.3, pierL - 0.4, shade(pierCol, 0.95));
    box(s, t, wallTopY + 1.25, wallTopY + 1.45, pierW - 0.05, pierL - 0.15, COLORS.bodyTop);
    box(s, t, wallTopY + 1.45, wallTopY + 1.7, pierW - 0.6, pierL - 0.8, COLORS.bodyTop, { taper: 0.5 });
  }

  return topY;
}

function buildVongLau(S, box, blockTopY) {
  const towerT = TOWER.t;
  const drawOpening = (face, norm, uCenter, width, yBot, ySpring) => {
    const rad = width / 2, segs = 8;
    const arcPt = (i, r) => { const th = Math.PI - (Math.PI * i) / segs; return [uCenter + r * Math.cos(th), ySpring + r * Math.sin(th)]; };
    S.kind = KIND.PLAIN;
    S.quad(face(uCenter - rad, yBot, 0.02), face(uCenter + rad, yBot, 0.02), face(uCenter + rad, ySpring, 0.02), face(uCenter - rad, ySpring, 0.02), COLORS.dark, norm);
    for (let i = 0; i < segs; i++) {
      const [ua, ya] = arcPt(i, rad), [ub, yb] = arcPt(i + 1, rad);
      S.tri(face(uCenter, ySpring, 0.02), face(ub, yb, 0.02), face(ua, ya, 0.02), COLORS.dark, norm);
      const [oa, yoa] = arcPt(i, rad + 0.3), [ob, yob] = arcPt(i + 1, rad + 0.3);
      S.quad(face(ua, ya, 0.05), face(oa, yoa, 0.05), face(ob, yob, 0.05), face(ub, yb, 0.05), COLORS.brick, norm);
    }
    for (const sgn of [-1, 1]) {
      const a = uCenter + sgn * rad, b = uCenter + sgn * (rad + 0.3);
      S.quad(face(Math.min(a, b), yBot, 0.05), face(Math.max(a, b), yBot, 0.05), face(Math.max(a, b), ySpring, 0.05), face(Math.min(a, b), ySpring, 0.05), COLORS.brick, norm);
    }
  };
  const storeyFaces = (hw, hd) => [
    ...[-1, 1].map((sgn) => ({ len: 2 * hw, face: (u, y, e) => toWorld3(u, towerT + sgn * (hd + e), y), norm: toWorldNorm(0, sgn), isLong: true })),
    ...[-1, 1].map((sgn) => ({ len: 2 * hd, face: (u, y, e) => toWorld3(sgn * (hw + e), towerT + u, y), norm: toWorldNorm(sgn, 0), isLong: false })),
  ];

  const drawEaveSkirt = (ho, dO, hi, di, y0, y1, lift, underHalf) => {
    const outer = [[-ho, -dO], [ho, -dO], [ho, dO], [-ho, dO]];
    const inner = [[-hi, -di], [hi, -di], [hi, di], [-hi, di]];
    const under = [[-underHalf[0], -underHalf[1]], [underHalf[0], -underHalf[1]], [underHalf[0], underHalf[1]], [-underHalf[0], underHalf[1]]];
    const lerp2 = (a, b, frac): [number, number] => [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
    const segs = 8;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, mid = lerp2(outer[i], outer[j], 0.5);
      const hn = [Math.sign(mid[0]) * Number(Math.abs(mid[0]) > 0.01), Math.sign(mid[1]) * Number(Math.abs(mid[1]) > 0.01)];
      const normUp = toWorldNorm(hn[0], hn[1], 1.2), normOut = toWorldNorm(hn[0], hn[1]);
      for (let k = 0; k < segs; k++) {
        const ka = k / segs, kb = (k + 1) / segs;
        const la = lift * Math.abs(2 * ka - 1) ** 3, lb = lift * Math.abs(2 * kb - 1) ** 3;
        const oa = lerp2(outer[i], outer[j], ka), ob = lerp2(outer[i], outer[j], kb);
        const ia = lerp2(inner[i], inner[j], ka), ib = lerp2(inner[i], inner[j], kb);
        const ua = lerp2(under[i], under[j], ka), ub = lerp2(under[i], under[j], kb);
        S.kind = KIND.TILE;
        S.quad(toWorld3(oa[0], towerT + oa[1], y0 + la), toWorld3(ob[0], towerT + ob[1], y0 + lb), toWorld3(ib[0], towerT + ib[1], y1), toWorld3(ia[0], towerT + ia[1], y1), COLORS.tile, normUp);
        S.kind = KIND.PLAIN;
        S.quad(toWorld3(oa[0], towerT + oa[1], y0 + la - 0.2), toWorld3(ob[0], towerT + ob[1], y0 + lb - 0.2), toWorld3(ob[0], towerT + ob[1], y0 + lb + 0.06), toWorld3(oa[0], towerT + oa[1], y0 + la + 0.06), COLORS.tileEdge, normOut);
        S.quad(toWorld3(oa[0], towerT + oa[1], y0 + la - 0.2), toWorld3(ob[0], towerT + ob[1], y0 + lb - 0.2), toWorld3(ub[0], towerT + ub[1], y0 - 0.12), toWorld3(ua[0], towerT + ua[1], y0 - 0.12), shade(COLORS.tile, 0.5), [0, -1, 0]);
      }
    }
    for (const [sa, sb] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as any[])) {
      const eavePt = toWorld3(sa * (ho - 0.05), towerT + sb * (dO - 0.05), y0 + lift + 0.1);
      S.beam(toWorld3(sa * hi, towerT + sb * di, y1 + 0.06), eavePt, 0.2, 0.18, COLORS.ridge);
      const dx = sa * 0.7071, dz = sb * 0.7071;
      const midPt = toWorld3(sa * (ho - 0.05) + dx * 0.3, towerT + sb * (dO - 0.05) + dz * 0.3, y0 + lift + 0.22);
      const tipPt = toWorld3(sa * (ho - 0.05) + dx * 0.32, towerT + sb * (dO - 0.05) + dz * 0.32, y0 + lift + 0.45);
      S.beam(eavePt, midPt, 0.18, 0.18, COLORS.ridge);
      S.beam(midPt, tipPt, 0.13, 0.13, COLORS.ridge);
    }
  };

  const lowerHW = TOWER.w / 2, lowerHD = TOWER.d / 2;
  const floorY = blockTopY + TOWER.plinth, lowerTopY = floorY + TOWER.wallH;
  S.kind = KIND.PLAIN;
  box(0, towerT, blockTopY - 0.1, floorY, TOWER.w + 0.6, TOWER.d + 0.6, COLORS.plasterTop, { topKind: KIND.ROAD });
  box(0, towerT, floorY, lowerTopY, TOWER.w, TOWER.d, COLORS.plaster, { top: COLORS.plasterTop });
  for (const fc of storeyFaces(lowerHW, lowerHD)) {
    const sideOff = fc.isLong ? 3.2 : 2.6;
    drawOpening(fc.face, fc.norm, 0, 2.4, floorY, lowerTopY - 2.06);
    for (const sgn of [-1, 1]) drawOpening(fc.face, fc.norm, sgn * sideOff, 1.65, floorY, lowerTopY - 2.12);
  }
  S.kind = KIND.PLAIN;
  box(0, towerT, lowerTopY, lowerTopY + 0.28, TOWER.w + 0.3, TOWER.d + 0.3, COLORS.plasterTop);
  box(0, towerT, lowerTopY + 0.28, lowerTopY + 0.5, TOWER.w + 0.6, TOWER.d + 0.6, COLORS.plaster);
  const eaveY = lowerTopY + 0.62, terraceY = eaveY + 0.45;
  drawEaveSkirt(lowerHW + 0.75, lowerHD + 0.75, lowerHW - 0.3, lowerHD - 0.3, eaveY, terraceY, 0.16, [lowerHW + 0.3, lowerHD + 0.3]);
  S.kind = KIND.PLAIN;
  box(0, towerT, lowerTopY + 0.5, terraceY, TOWER.w - 0.6, TOWER.d - 0.6, COLORS.plaster, { top: COLORS.plasterTop, topKind: KIND.ROAD });

  const drawTerraceBal = (len, isAlong, offset) => {
    S.kind = KIND.PLAIN;
    if (isAlong) box(0, towerT + offset, terraceY, terraceY + 0.5, len, 0.18, COLORS.plaster, { top: COLORS.plasterTop });
    else box(offset, towerT, terraceY, terraceY + 0.5, 0.18, len, COLORS.plaster, { top: COLORS.plasterTop });
    const count = Math.max(2, Math.round(len / 1.3));
    for (let k = 1; k < count; k++) {
      const u = -len / 2 + (len * k) / count;
      if (isAlong) box(u, towerT + offset, terraceY, terraceY + 0.68, 0.26, 0.26, COLORS.plasterTop);
      else box(offset, towerT + u, terraceY, terraceY + 0.68, 0.26, 0.26, COLORS.plasterTop);
    }
  };
  const balW = lowerHW - 0.5, balD = lowerHD - 0.5;
  drawTerraceBal(2 * balW, true, balD);
  drawTerraceBal(2 * balW, true, -balD);
  drawTerraceBal(2 * balD, false, balW);
  drawTerraceBal(2 * balD, false, -balW);
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) box(sa * balW, towerT + sb * balD, terraceY, terraceY + 0.8, 0.34, 0.34, COLORS.plasterTop);

  // Upper storey and hip roof
  const upperHW = TOWER.uw / 2, upperHD = TOWER.ud / 2, upperTopY = terraceY + TOWER.uwallH;
  S.kind = KIND.PLAIN;
  box(0, towerT, terraceY, upperTopY, TOWER.uw, TOWER.ud, COLORS.plaster, { top: COLORS.plasterTop });
  for (const fc of storeyFaces(upperHW, upperHD)) {
    const panelHalf = fc.len / 2 - 0.45;
    S.quad(fc.face(-panelHalf, terraceY + 0.25, 0.015), fc.face(panelHalf, terraceY + 0.25, 0.015), fc.face(panelHalf, upperTopY - 0.2, 0.015), fc.face(-panelHalf, upperTopY - 0.2, 0.015), COLORS.upperBrick, fc.norm);
    drawOpening(fc.face, fc.norm, 0, fc.isLong ? 1.15 : 1.0, terraceY + 0.4, terraceY + 1.25);
  }
  box(0, towerT, upperTopY, upperTopY + 0.15, TOWER.uw + 0.3, TOWER.ud + 0.3, COLORS.plasterTop);
  const towerCenter = toWorld2(0, towerT);
  S.hip(towerCenter[0], towerCenter[1], TOWER.uw + 0.3, TOWER.ud + 0.3, AXIS_ANG, upperTopY + 0.15, 0.75, COLORS.tile, { over: 0.15, flare: 0.1, hips: true, horns: false, ridgeCol: COLORS.ridge, fascia: 0.16, fasciaCol: COLORS.tileEdge, segs: 3 });
  const ridgeTopY = upperTopY + 0.15 + 0.75;
  for (const [sa, sb] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as any[])) {
    const ex = sa * ((TOWER.uw + 0.3) / 2 + 0.12), ez = sb * ((TOWER.ud + 0.3) / 2 + 0.12), diag = 0.7071;
    S.kind = KIND.PLAIN;
    S.beam(toWorld3(ex, towerT + ez, upperTopY + 0.3), toWorld3(ex + sa * diag * 0.25, towerT + ez + sb * diag * 0.25, upperTopY + 0.68), 0.12, 0.12, COLORS.ridge);
  }
  S.kind = KIND.PLAIN;
  S.cyl(towerCenter[0], towerCenter[1], ridgeTopY - 0.05, ridgeTopY + 0.15, 0.14, 0.22, 8, COLORS.ridge, { cap: false });
  S.cyl(towerCenter[0], towerCenter[1], ridgeTopY + 0.15, ridgeTopY + 0.32, 0.22, 0.1, 8, COLORS.ridge, { cap: false });
  S.cyl(towerCenter[0], towerCenter[1], ridgeTopY + 0.32, ridgeTopY + 0.42, 0.1, 0.03, 8, COLORS.ridge);

  return { eaveY, lowerHW, lowerHD };
}

export function build({ S, group, THREE }) {
  const prevKind = S.kind, pavedStart = S.n;
  const box = (s, t, y0, y1, ss, st, col, opts?) => { const pt = toWorld2(s, t); S.box(pt[0], pt[1], y0, y1, ss, st, AXIS_ANG, col, opts); };

  const blockTopY = buildGateBlockAndTrim(S, box);
  const { eaveY, lowerHW, lowerHD } = buildVongLau(S, box, blockTopY);
  (S.paved = S.paved || []).push([pavedStart, S.n]);
  S.kind = prevKind;

  if (group) {
    const lightBuf = new Buf(200);
    const lightY = eaveY - 0.3, hu = lowerHW + 0.4, hv = lowerHD + 0.4;
    const cornerAt = (u, v) => toWorld3(u, TOWER.t + v, lightY);
    for (const sgn of [-1, 1]) {
      lightBuf.beam(cornerAt(-hu, sgn * hv), cornerAt(hu, sgn * hv), 0.14, 0.1, [1, 1, 1]);
      lightBuf.beam(cornerAt(sgn * hu, -hv), cornerAt(sgn * hu, hv), 0.14, 0.1, [1, 1, 1]);
    }
    const stripMesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(0xffae42, 1.2));
    stripMesh.renderOrder = 19;
    stripMesh.userData.landmark = id;
    group.add(stripMesh);

    const lampPos = [], lampCol = [];
    for (const t of [T_INNER - 1.2, T_OUTER + 1.2]) {
      const pt = toWorld2(0, t);
      lampPos.push(pt[0], LAND_Y + 2.6, pt[1]);
      lampCol.push(1.0, 0.72, 0.34);
    }
    const glowPts = glowPoints(lampPos, lampCol, 7);
    glowPts.userData.glow = true;
    glowPts.userData.landmark = id;
    group.add(glowPts);
  }
}
