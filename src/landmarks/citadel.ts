import * as THREE from 'three';
import { Buf, KIND, hex, shade, unflat, obb, ringCentre, signedArea, inRing } from '../geo/buf.ts';
import { gateAxis, CITADEL_PASSAGE } from '../geo/gates.ts';
import { LAND_Y, WALL_H, PAL } from '../config.ts';
import { rise } from '../geo/terrain.ts';
import { lightMaterial, glowPoints } from '../geo/materials.ts';
import { landTest } from './boats.ts';
import { replaced } from './places/index.ts';
import { flag as makeFlag } from './anim.ts';

const DECIMETRES_PER_METRE = 10;
const ARCH_SEGMENTS = 8;
const WHITE = [1, 1, 1];
const LANTERN_COL = [1.0, 0.72, 0.34];
const DARK_FILL = hex('#2b2422');
const RIDGE_GOLD = hex('#f1d77a');
const STONE_DARK = hex('#1f1a18');
const LIT_GATES = ['Cửa Ngăn', 'Cửa Thượng Tứ'].map((name) => name.normalize('NFC'));
const YELLOW_ROOF_GATES = ['Cửa Hiển Nhơn', 'Chương Đức'].map((name) => name.normalize('NFC'));

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const makeRectRing = (cx: number, cz: number, width: number, depth: number, ang: number) => {
  const ux = Math.cos(ang), uz = Math.sin(ang);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => [
    cx + (ux * su * width) / 2 - (uz * sv * depth) / 2,
    cz + (uz * su * width) / 2 + (ux * sv * depth) / 2,
  ]);
};

function buildPlatformSteps(buf: Buf, toWorld: (u: number, v: number) => [number, number], width: number, depth: number, ang: number, baseY: number, platform: number) {
  const stepCount = Math.max(2, Math.round(platform / 0.17));
  const stepH = platform / stepCount;
  const tread = 0.32;
  const stepW = clamp(width * 0.32, 1.6, 4.4);
  const edge = depth / 2 + 1.7 - 0.06;
  for (const sideSign of [-1, 1]) {
    buf.kind = KIND.MASONRY;
    for (let k = 1; k < stepCount; k++) {
      const pt = toWorld(0, sideSign * (edge + tread * (k - 0.5)));
      buf.box(pt[0], pt[1], baseY - 0.3, baseY + platform - stepH * k, stepW, tread, ang, shade(PAL.stone, 1.05), { topKind: KIND.ROAD });
    }
    buf.kind = KIND.PLAIN;
    const run = tread * (stepCount - 1);
    for (const cheekSide of [-1, 1]) {
      const topPt = toWorld(cheekSide * (stepW / 2 + 0.2), sideSign * (edge - 0.3));
      const botPt = toWorld(cheekSide * (stepW / 2 + 0.2), sideSign * (edge + run + 0.05));
      buf.box(topPt[0], topPt[1], baseY - 0.3, baseY + platform + 0.28, 0.4, 0.6, ang, shade(PAL.stone, 0.92));
      buf.beam([topPt[0], baseY + platform + 0.12, topPt[1]], [botPt[0], baseY + 0.1, botPt[1]], 0.36, 0.34, shade(PAL.stone, 0.92));
    }
  }
}

function buildColonnade(buf: Buf, toWorld: (u: number, v: number) => [number, number], cx: number, cz: number, width: number, depth: number, ang: number, baseY: number, wallH: number, wall: number[], roof: number[]) {
  const inset = clamp(Math.min(width, depth) * 0.13, 1.0, 1.4);
  const coreW = width - inset * 2;
  const coreD = depth - inset * 2;
  const lidY = baseY + wallH - 0.2;

  buf.kind = KIND.TIMBER;
  buf.box(cx, cz, baseY, lidY, coreW, coreD, ang, wall, { top: shade(roof, 0.8) });
  buf.kind = KIND.PLAIN;
  const doorW = Math.min(coreW * 0.3, 3.2);
  const doorH = Math.min(wallH * 0.78, 3.4);
  for (const sideSign of [-1, 1]) {
    const doorPt = toWorld(0, sideSign * (coreD / 2 + 0.04));
    buf.box(doorPt[0], doorPt[1], baseY, baseY + doorH, doorW, 0.08, ang, shade(wall, 0.55));
    const lintelPt = toWorld(0, sideSign * (coreD / 2 + 0.06));
    buf.box(lintelPt[0], lintelPt[1], baseY + doorH, baseY + doorH + 0.22, doorW + 0.5, 0.12, ang, shade(wall, 0.75));
  }
  buf.box(cx, cz, lidY, baseY + wallH, width, depth, ang, shade(wall, 0.5), { top: shade(roof, 0.8), bottom: true });

  const colR = clamp(Math.min(width, depth) * 0.028, 0.18, 0.3);
  const countU = Math.max(2, Math.round(width / 3.6));
  const countV = Math.max(2, Math.round(depth / 3.6));
  const postCoords: [number, number][] = [];
  for (let i = 0; i <= countU; i++) for (const sideSign of [-1, 1]) postCoords.push([-width / 2 + (width * i) / countU, (sideSign * depth) / 2]);
  for (let i = 1; i < countV; i++) for (const sideSign of [-1, 1]) postCoords.push([(sideSign * width) / 2, -depth / 2 + (depth * i) / countV]);

  const tieY = lidY - 0.36;
  for (const [u, v] of postCoords) {
    const pt = toWorld(u, v);
    buf.cyl(pt[0], pt[1], baseY, baseY + 0.26, colR * 1.8, colR * 1.55, 6, shade(PAL.stone, 0.95), { cap: false, rot: ang });
    buf.cyl(pt[0], pt[1], baseY + 0.26, lidY, colR, colR * 0.92, 6, shade(wall, 0.92), { cap: false, rot: ang });
    const coreU = clamp(u, -coreW / 2, coreW / 2);
    const coreV = clamp(v, -coreD / 2, coreD / 2);
    const corePt = toWorld(coreU, coreV);
    if (Math.hypot(u - coreU, v - coreV) > 0.3) buf.beam([pt[0], tieY, pt[1]], [corePt[0], tieY, corePt[1]], colR * 1.1, 0.3, shade(wall, 0.7));
  }
  const corners = [toWorld(-width / 2, -depth / 2), toWorld(width / 2, -depth / 2), toWorld(width / 2, depth / 2), toWorld(-width / 2, depth / 2)];
  for (let i = 0; i < 4; i++) {
    const p0 = corners[i], p1 = corners[(i + 1) % 4];
    buf.beam([p0[0], tieY, p0[1]], [p1[0], tieY, p1[1]], colR * 1.3, 0.34, shade(wall, 0.7));
  }
}

// Timber hall under a swept tiled roof; tiers = 2 gives the stacked roofs of gate towers and pavilions.
export function pavilion(buf: Buf, cx: number, cz: number, width: number, depth: number, ang: number, y0: number, {
  tiers = 1, wallH = 3.6, roof = PAL.imperialRoof, wall = PAL.lacquer, over = 1.5, rh = null,
  platform = 0, ridge = RIDGE_GOLD, eaves = null, colonnade = false, steps = true, segs = 2,
}: Record<string, any> = {}) {
  let curY = y0;
  const prevKind = buf.kind;
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const toWorld = (u: number, v: number): [number, number] => [cx + u * ux - v * uz, cz + u * uz + v * ux];

  if (platform) {
    buf.kind = KIND.MASONRY;
    buf.box(cx, cz, curY, curY + platform, width + 3.4, depth + 3.4, ang, PAL.stone, { taper: 0.97, topKind: KIND.ROAD });
    if (steps && platform >= 0.3) buildPlatformSteps(buf, toWorld, width, depth, ang, curY, platform);
    curY += platform;
  }

  if (colonnade && Math.min(width, depth) >= 4.5) {
    buildColonnade(buf, toWorld, cx, cz, width, depth, ang, curY, wallH, wall, roof);
  } else {
    buf.kind = KIND.TIMBER;
    buf.box(cx, cz, curY, curY + wallH, width, depth, ang, wall, { top: shade(roof, 0.8) });
  }

  buf.kind = KIND.TIMBER;
  curY += wallH;
  const roofH = rh ?? clamp(depth * 0.3, 1.5, 5.2);
  const eaveOpts = { fascia: 0.3, fasciaCol: shade(wall, 0.75), ridgeCol: ridge, hips: true, glazed: true, segs };
  let topY: number;
  if (tiers === 1) {
    buf.hip(cx, cz, width, depth, ang, curY, roofH, roof, { flare: 0.55, over, ...eaveOpts });
    if (eaves) eaves.push({ cx, cz, w: width, d: depth, ang, y: curY, over, fascia: eaveOpts.fascia });
    topY = curY + roofH;
  } else {
    buf.hip(cx, cz, width, depth, ang, curY, roofH * 0.8, roof, { flare: 0.5, over, ...eaveOpts, ridgeCol: null });
    const upperW = width * 0.68, upperD = depth * 0.62, upperBaseY = curY + roofH * 0.42;
    buf.box(cx, cz, upperBaseY, upperBaseY + wallH * 0.62, upperW, upperD, ang, wall);
    const upperEaveY = upperBaseY + wallH * 0.62;
    buf.hip(cx, cz, upperW, upperD, ang, upperEaveY, roofH * 0.85, roof, { flare: 0.5, over: over * 0.85, ...eaveOpts });
    if (eaves) {
      eaves.push(
        { cx, cz, w: width, d: depth, ang, y: curY, over, fascia: eaveOpts.fascia },
        { cx, cz, w: upperW, d: upperD, ang, y: upperEaveY, over: over * 0.85, fascia: eaveOpts.fascia },
      );
    }
    topY = upperEaveY + roofH * 0.85;
  }
  buf.kind = prevKind;
  return topY;
}

// ---- night lighting helpers ----
function ringStrip(lightBuf: Buf, ring: number[][], y: number, out = 0.12, width = 0.16, height = 0.26) {
  const sign = signedArea(ring) > 0 ? 1 : -1;
  for (let i = 0, len = ring.length; i < len; i++) {
    const p0 = ring[i], p1 = ring[(i + 1) % len];
    const tx = p1[0] - p0[0], tz = p1[1] - p0[1], segLen = Math.hypot(tx, tz);
    if (segLen < 0.3) continue;
    const nx = (tz * sign) / segLen, nz = (-tx * sign) / segLen;
    lightBuf.beam([p0[0] + nx * out, y, p0[1] + nz * out], [p1[0] + nx * out, y, p1[1] + nz * out], width, height, WHITE);
  }
}

function eaveStrip(lightBuf: Buf, eave: any, sides = ['v-', 'v+', 'u-', 'u+'], width = 0.14, height = 0.1) {
  const ux = Math.cos(eave.ang), uz = Math.sin(eave.ang);
  const y = eave.y - eave.fascia - 0.07;
  const ptAt = (u: number, v: number) => [eave.cx + u * ux - v * uz, y, eave.cz + u * uz + v * ux];
  const halfU = eave.w / 2 + eave.over - 0.3;
  const halfV = eave.d / 2 + eave.over - 0.3;
  for (const side of sides) {
    const sign = side[1] === '+' ? 1 : -1;
    if (side[0] === 'v') lightBuf.beam(ptAt(-halfU, sign * halfV), ptAt(halfU, sign * halfV), width, height, WHITE);
    else lightBuf.beam(ptAt(sign * halfU, -halfV), ptAt(sign * halfU, halfV), width, height, WHITE);
  }
}

function faceToward(box: any, dir: number[]) {
  const ux = Math.cos(box.a), uz = Math.sin(box.a);
  const du = dir[0] * ux + dir[1] * uz, dv = -dir[0] * uz + dir[1] * ux;
  if (Math.abs(du) > Math.abs(dv)) {
    const sign = Math.sign(du) || 1;
    return { n: [ux * sign, uz * sign], t: [-uz, ux], half: box.w / 2, side: box.d / 2 };
  }
  const sign = Math.sign(dv) || 1;
  return { n: [-uz * sign, ux * sign], t: [ux, uz], half: box.d / 2, side: box.w / 2 };
}

function addLightMesh(group: THREE.Group, lightBuf: Buf, color: number, boost: number) {
  if (!group || !lightBuf || lightBuf.n === 0) return null;
  const mesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(color, boost));
  mesh.renderOrder = 19;
  mesh.userData.landmark = true;
  group.add(mesh);
  return mesh;
}

function addLampPoints(group: THREE.Group, pos: number[], col: number[], size: number, glows: any[]) {
  if (!group || !pos.length) return null;
  const pts = glowPoints(pos, col, size);
  pts.userData.glow = true;
  group.add(pts);
  glows.push(pts);
  return pts;
}

function simplifyCollinearRing(ring0: number[][]) {
  const ring = ring0.slice();
  for (let changed = true; changed && ring.length > 3;) {
    changed = false;
    for (let i = 0; i < ring.length && ring.length > 3; i++) {
      const prev = ring[(i + ring.length - 1) % ring.length];
      const cur = ring[i];
      const next = ring[(i + 1) % ring.length];
      const ex = next[0] - prev[0], ez = next[1] - prev[1], edgeLen = Math.hypot(ex, ez);
      if (edgeLen < 1e-6 || Math.abs((cur[0] - prev[0]) * ez - (cur[1] - prev[1]) * ex) / edgeLen < 0.12) {
        ring.splice(i, 1);
        changed = true;
        i--;
      }
    }
  }
  return ring;
}

function raySegmentHit(origin: number[], dir: number[], p0: number[], p1: number[]) {
  const ex = p1[0] - p0[0], ez = p1[1] - p0[1];
  const denom = dir[0] * ez - dir[1] * ex;
  if (Math.abs(denom) < 1e-6) return null;
  const qx = p0[0] - origin[0], qz = p0[1] - origin[1];
  return { t: (qx * ez - qz * ex) / denom, s: (qx * dir[1] - qz * dir[0]) / denom };
}

// ---- passages through masonry ----
function passages(buf: Buf, ring0: number[][], y0: number, y1: number, wallCol: number[], openings: any[], { frame = hex('#d6cbb5'), proud = 0.16, covers = null, porchTop = null }: Record<string, any> = {}) {
  const ring = simplifyCollinearRing(ring0);
  const count = ring.length;
  const outSign = signedArea(ring) > 0 ? 1 : -1;
  const cuts: any[][] = ring.map(() => []);
  const tunnels: any[] = [];

  for (const opening of openings) {
    const rightVec = [-opening.dir[1], opening.dir[0]];
    const lineOrigin = (off: number) => [opening.p[0] + rightVec[0] * off, opening.p[1] + rightVec[1] * off];
    const hits: { i: number; t: number }[] = [];
    for (let i = 0; i < count; i++) {
      const hit = raySegmentHit(lineOrigin(0), opening.dir, ring[i], ring[(i + 1) % count]);
      if (hit && hit.s >= 0 && hit.s < 1) hits.push({ i, t: hit.t });
    }
    hits.sort((a, b) => a.t - b.t);
    if (hits.length < 2 || hits.length % 2) continue;
    let valid = true;
    const mapped = hits.map(({ i, t }) => {
      const p0 = ring[i], p1 = ring[(i + 1) % count];
      const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const leftHit = raySegmentHit(lineOrigin(-opening.w / 2), opening.dir, p0, p1);
      const rightHit = raySegmentHit(lineOrigin(opening.w / 2), opening.dir, p0, p1);
      if (!leftHit || !rightHit) { valid = false; return null; }
      const sL = leftHit.s * segLen, sR = rightHit.s * segLen;
      const s0 = Math.min(sL, sR), s1 = Math.max(sL, sR);
      if (s0 < 0.6 || s1 > segLen - 0.6) valid = false;
      for (const existing of cuts[i]) if (s0 < existing.s1 + 0.8 && s1 > existing.s0 - 0.8) valid = false;
      const ptAt = (s: number) => [p0[0] + ((p1[0] - p0[0]) * s) / segLen, p0[1] + ((p1[1] - p0[1]) * s) / segLen];
      return { i, t, s0, s1, L: ptAt(sL), R: ptAt(sR) };
    });
    if (!valid) continue;
    for (const hit of mapped) cuts[hit!.i].push({ s0: hit!.s0, s1: hit!.s1, op: opening });
    for (let k = 0; k < mapped.length; k += 2) tunnels.push({ op: opening, A: mapped[k], B: mapped[k + 1] });
  }

  const prevKind = buf.kind;
  for (let i = 0; i < count; i++) {
    const p0 = ring[i], p1 = ring[(i + 1) % count];
    const tx = p1[0] - p0[0], tz = p1[1] - p0[1], segLen = Math.hypot(tx, tz);
    if (segLen < 1e-3) continue;
    const hint = [tz * outSign, 0.001, -tx * outSign];
    const edgePt = (s: number, y: number) => [p0[0] + (tx * s) / segLen, y, p0[1] + (tz * s) / segLen];
    const addWallQuad = (sa: number, sb: number, ya: number, yb: number) => {
      if (sb - sa > 1e-3 && yb - ya > 1e-3) buf.quad(edgePt(sa, ya), edgePt(sb, ya), edgePt(sb, yb), edgePt(sa, yb), wallCol, hint);
    };
    const sortedCuts = cuts[i].sort((a, b) => a.s0 - b.s0);
    let cursor = 0;
    for (const cut of sortedCuts) {
      const { op } = cut;
      const floor = op.floor, crown = floor + op.h;
      addWallQuad(cursor, cut.s0, y0, y1);
      addWallQuad(cut.s0, cut.s1, y0, floor);
      addWallQuad(cut.s0, cut.s1, crown, y1);
      if (op.arch) {
        const radX = (cut.s1 - cut.s0) / 2, radY = op.w / 2, midS = (cut.s0 + cut.s1) / 2, spring = crown - radY;
        for (let k = 0; k < ARCH_SEGMENTS; k++) {
          const t0 = Math.PI - (Math.PI * k) / ARCH_SEGMENTS, t1 = Math.PI - (Math.PI * (k + 1)) / ARCH_SEGMENTS;
          const x0 = midS + radX * Math.cos(t0), x1 = midS + radX * Math.cos(t1);
          buf.quad(edgePt(x0, spring + radY * Math.sin(t0)), edgePt(x1, spring + radY * Math.sin(t1)), edgePt(x1, crown), edgePt(x0, crown), wallCol, hint);
        }
      }
      const nx = (tz * outSign) / segLen, nz = (-tx * outSign) / segLen, edgeAng = Math.atan2(tz, tx);
      const savedKind = buf.kind;
      buf.kind = KIND.PLAIN;
      const addFrameBox = (s: number, w: number, ya: number, yb: number) => {
        const pt = edgePt(s, 0);
        buf.box(pt[0] + (nx * proud) / 2, pt[2] + (nz * proud) / 2, ya, yb, w, proud, edgeAng, frame);
      };
      const jambW = 0.45, spring = op.arch ? crown - op.w / 2 : crown;
      addFrameBox(cut.s0 - jambW / 2, jambW, floor, spring);
      addFrameBox(cut.s1 + jambW / 2, jambW, floor, spring);
      if (!op.arch) {
        addFrameBox((cut.s0 + cut.s1) / 2, cut.s1 - cut.s0 + jambW * 2 + 0.3, crown, Math.min(y1, crown + 0.55));
      } else {
        const radX = (cut.s1 - cut.s0) / 2, radY = op.w / 2, midS = (cut.s0 + cut.s1) / 2;
        const outRadX = radX + jambW, outRadY = radY + jambW;
        const offsetPt = (s: number, y: number, dist: number) => { const pt = edgePt(s, y); return [pt[0] + nx * dist, y, pt[2] + nz * dist]; };
        for (let k = 0; k < ARCH_SEGMENTS; k++) {
          const t0 = Math.PI - (Math.PI * k) / ARCH_SEGMENTS, t1 = Math.PI - (Math.PI * (k + 1)) / ARCH_SEGMENTS;
          const inA = [midS + radX * Math.cos(t0), spring + radY * Math.sin(t0)];
          const inB = [midS + radX * Math.cos(t1), spring + radY * Math.sin(t1)];
          const outA = [midS + outRadX * Math.cos(t0), spring + outRadY * Math.sin(t0)];
          const outB = [midS + outRadX * Math.cos(t1), spring + outRadY * Math.sin(t1)];
          buf.quad(offsetPt(inA[0], inA[1], proud), offsetPt(inB[0], inB[1], proud), offsetPt(outB[0], outB[1], proud), offsetPt(outA[0], outA[1], proud), frame, [nx, 0, nz]);
          const cx2 = (inA[0] + inB[0]) / 2 - midS, cy2 = (inA[1] + inB[1]) / 2 - spring, cLen = Math.hypot(cx2, cy2) || 1;
          const innerNrm = [-(cx2 / cLen) * (tx / segLen), -cy2 / cLen, -(cx2 / cLen) * (tz / segLen)];
          buf.quad(offsetPt(inA[0], inA[1], 0), offsetPt(inB[0], inB[1], 0), offsetPt(inB[0], inB[1], proud), offsetPt(inA[0], inA[1], proud), shade(frame, 0.8), innerNrm);
          buf.quad(offsetPt(outA[0], outA[1], 0), offsetPt(outB[0], outB[1], 0), offsetPt(outB[0], outB[1], proud), offsetPt(outA[0], outA[1], proud), frame, [-innerNrm[0], -innerNrm[1], -innerNrm[2]]);
        }
      }
      buf.kind = savedKind;
      cursor = cut.s1;
    }
    addWallQuad(cursor, segLen, y0, y1);
  }

  buf.kind = KIND.PLAIN;
  const lerp2 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (const { op, A, B } of tunnels) {
    const floor = op.floor, crown = floor + op.h, radius = op.w / 2, spring = op.arch ? crown - radius : crown;
    const len = Math.abs(B.t - A.t), mouthFrac = Math.min(0.5, 0.85 / Math.max(len, 1));
    const segments = [[0, mouthFrac, 0.5], [mouthFrac, 1 - mouthFrac, 0], [1 - mouthFrac, 1, 0.5]];
    const mouthCol = shade(frame, 0.62);
    for (const [f0, f1, isMouth] of segments) {
      if (f1 - f0 < 1e-3) continue;
      const wallC = isMouth ? mouthCol : STONE_DARK;
      const l0 = lerp2(A.L, B.L, f0), l1 = lerp2(A.L, B.L, f1), r0 = lerp2(A.R, B.R, f0), r1 = lerp2(A.R, B.R, f1);
      const toRight = [r0[0] - l0[0], 0, r0[1] - l0[1]];
      buf.quad([l0[0], floor, l0[1]], [l1[0], floor, l1[1]], [l1[0], spring, l1[1]], [l0[0], spring, l0[1]], wallC, toRight);
      buf.quad([r0[0], floor, r0[1]], [r1[0], floor, r1[1]], [r1[0], spring, r1[1]], [r0[0], spring, r0[1]], wallC, [-toRight[0], 0, -toRight[2]]);
      buf.kind = KIND.ROAD;
      buf.quad([l0[0], floor, l0[1]], [l1[0], floor, l1[1]], [r1[0], floor, r1[1]], [r0[0], floor, r0[1]], isMouth ? shade(PAL.stone, 0.8) : shade(PAL.stone, 0.42), [0, 1, 0]);
      buf.kind = KIND.PLAIN;
      if (!op.arch) {
        buf.quad([l0[0], crown, l0[1]], [l1[0], crown, l1[1]], [r1[0], crown, r1[1]], [r0[0], crown, r0[1]], shade(wallC, 0.8), [0, -1, 0]);
      } else {
        const vaultPt = (frac: number, theta: number) => {
          const pL = lerp2(l0, l1, frac), pR = lerp2(r0, r1, frac);
          const pt = lerp2(pL, pR, (1 - Math.cos(theta)) / 2);
          return [pt[0], spring + radius * Math.sin(theta), pt[1]];
        };
        const axisMid = lerp2(lerp2(l0, r0, 0.5), lerp2(l1, r1, 0.5), 0.5);
        for (let k = 0; k < ARCH_SEGMENTS; k++) {
          const t0 = Math.PI - (Math.PI * k) / ARCH_SEGMENTS, t1 = Math.PI - (Math.PI * (k + 1)) / ARCH_SEGMENTS;
          const a0 = vaultPt(0, t0), b0 = vaultPt(0, t1), a1 = vaultPt(1, t0);
          const midX = (a0[0] + b0[0]) / 2, midY = (a0[1] + b0[1]) / 2, midZ = (a0[2] + b0[2]) / 2;
          buf.quad(a0, b0, vaultPt(1, t1), a1, shade(wallC, 0.85), [axisMid[0] - midX, spring - midY, axisMid[1] - midZ]);
        }
      }
    }
  }

  if (covers) {
    for (const { op, A, B } of tunnels) {
      for (const [endHit, sign] of [[A, -1], [B, 1]] as [any, number][]) {
        const mouthPt = [op.p[0] + op.dir[0] * endHit.t, op.p[1] + op.dir[1] * endHit.t];
        const outDir = [op.dir[0] * sign, op.dir[1] * sign];
        let maxHitDist = 0;
        for (const [p0, p1] of covers) {
          const hit = raySegmentHit(mouthPt, outDir, p0, p1);
          if (hit && hit.s >= 0 && hit.s <= 1 && hit.t > 0.05 && hit.t < 4.5) maxHitDist = Math.max(maxHitDist, hit.t);
        }
        if (!maxHitDist) continue;
        const porchDepth = 1.2;
        const porchCenter = [mouthPt[0] + outDir[0] * (maxHitDist + porchDepth / 2), mouthPt[1] + outDir[1] * (maxHitDist + porchDepth / 2)];
        const porchRing = makeRectRing(porchCenter[0], porchCenter[1], porchDepth, op.w + 1.7, Math.atan2(outDir[1], outDir[0]));
        const pTop = Math.min(porchTop ?? y1, op.floor + op.h + 1.0);
        buf.kind = KIND.MASONRY;
        buf.prism(porchRing, pTop, pTop, wallCol, shade(wallCol, 1.08));
        passages(buf, porchRing, y0, pTop, wallCol, [{ ...op, p: porchCenter }], { frame, proud });
        buf.kind = KIND.PLAIN;
        const facePt = [mouthPt[0] + outDir[0] * (maxHitDist - 0.02), mouthPt[1] + outDir[1] * (maxHitDist - 0.02)];
        const sideX = -outDir[1], sideZ = outDir[0], radius = op.w / 2;
        const floor = op.floor, spring = op.arch ? floor + op.h - radius : floor + op.h;
        const darkPt = (u: number, y: number) => [facePt[0] + sideX * u, y, facePt[1] + sideZ * u];
        const nrm = [outDir[0], 0, outDir[1]];
        buf.quad(darkPt(-radius, floor), darkPt(radius, floor), darkPt(radius, spring), darkPt(-radius, spring), STONE_DARK, nrm);
        if (op.arch) {
          for (let k = 0; k < ARCH_SEGMENTS; k++) {
            const t0 = Math.PI - (Math.PI * k) / ARCH_SEGMENTS, t1 = Math.PI - (Math.PI * (k + 1)) / ARCH_SEGMENTS;
            buf.tri(darkPt(0, spring), darkPt(radius * Math.cos(t0), spring + radius * Math.sin(t0)), darkPt(radius * Math.cos(t1), spring + radius * Math.sin(t1)), STONE_DARK, nrm);
          }
        }
      }
    }
  }
  buf.kind = prevKind;
  return tunnels;
}

function buildGate(buf: Buf, gateRec: any, center: number[], eaves: any[] | null = null, coverAt: any = null) {
  const { cx, cz, w, d, a, pa, px, pz, plen, pwid } = gateAxis(gateRec, center);
  if (gateRec.k === 'citadel') {
    const topY = LAND_Y + WALL_H + 1.4;
    buf.kind = KIND.MASONRY;
    const reach = [plen / 2 + 0.5, plen / 2 + 0.5];
    for (const [fa, fb] of (coverAt ? coverAt(cx, cz) : [])) {
      const ex = fb[0] - fa[0], ez = fb[1] - fa[1], denom = px * ez - pz * ex;
      if (Math.abs(denom) < 1e-6) continue;
      const qx = fa[0] - cx, qz = fa[1] - cz;
      const dist = (qx * ez - qz * ex) / denom, frac = (qx * pz - qz * px) / denom;
      if (frac < 0 || frac > 1 || Math.abs(dist) < plen / 2 - 1.5 || Math.abs(dist) > plen / 2 + 6) continue;
      const sideIdx = dist < 0 ? 0 : 1;
      reach[sideIdx] = Math.max(reach[sideIdx], Math.abs(dist) + 0.12);
    }
    const shift = (reach[1] - reach[0]) / 2;
    const ring = makeRectRing(cx + px * shift, cz + pz * shift, reach[0] + reach[1], pwid + 1, pa);
    buf.prism(ring, topY, topY, PAL.brickLight, PAL.stone, { topKind: KIND.ROAD });
    const built = passages(buf, ring, LAND_Y - 0.5, topY, PAL.brickLight, [{ p: [cx, cz], dir: [px, pz], w: CITADEL_PASSAGE.w, h: CITADEL_PASSAGE.h, floor: LAND_Y, arch: true }]);
    buf.kind = KIND.MASONRY;
    buf.box(cx, cz, topY, topY + 0.8, w + 0.6, d + 0.6, a, shade(PAL.brickLight, 1.08), { top: PAL.stone, topKind: KIND.ROAD });
    buf.kind = KIND.PLAIN;
    if (!built.length) {
      for (const sign of [-1, 1]) {
        const fx = cx + px * sign * (plen / 2 + 0.42), fz = cz + pz * sign * (plen / 2 + 0.42);
        buf.box(fx, fz, LAND_Y, LAND_Y + 4.4, 0.3, 4.2, pa, DARK_FILL);
        buf.box(fx, fz, LAND_Y + 4.4, LAND_Y + 5.3, 0.3, 3.0, pa, DARK_FILL);
      }
    }

    const parW = w + 0.6, parD = d + 0.6, ux = Math.cos(a), uz = Math.sin(a);
    const ptLocal = (u: number, v: number) => [cx + u * ux - v * uz, cz + u * uz + v * ux];
    buf.kind = KIND.MASONRY;
    for (const [len, isAlong, off] of [[parW, true, parD / 2], [parW, true, -parD / 2], [parD, false, parW / 2], [parD, false, -parW / 2]] as [number, boolean, number][]) {
      const merlonCount = Math.max(3, Math.round(len / 1.4));
      for (let k = 0; k < merlonCount; k++) {
        const pos = -len / 2 + (len * (k + 0.5)) / merlonCount;
        const pt = isAlong ? ptLocal(pos, off - Math.sign(off) * 0.25) : ptLocal(off - Math.sign(off) * 0.25, pos);
        const isMerlon = k % 2 === 0;
        buf.box(pt[0], pt[1], topY + 0.8, topY + 0.8 + (isMerlon ? 1.15 : 0.7), isAlong ? len / merlonCount : 0.5, isAlong ? 0.5 : len / merlonCount, a, shade(PAL.brickLight, 1.08), { top: PAL.stone });
      }
    }
    buf.kind = KIND.PLAIN;
    for (const sideIdx of [0, 1]) {
      const sign = sideIdx ? 1 : -1, dist = reach[sideIdx] + 0.08;
      const tabletY = LAND_Y + CITADEL_PASSAGE.h + 0.75;
      buf.box(cx + px * sign * dist, cz + pz * sign * dist, tabletY, tabletY + 1.25, 3.6, 0.16, pa + Math.PI / 2, hex('#ddd3bd'));
      buf.box(cx + px * sign * (dist + 0.06), cz + pz * sign * (dist + 0.06), tabletY + 0.18, tabletY + 1.07, 3.1, 0.08, pa + Math.PI / 2, hex('#3b3430'));
    }
    pavilion(buf, cx, cz, Math.min(pwid * 0.74, 12), Math.min(plen * 0.6, 8), pa + Math.PI / 2, topY + 0.8, { tiers: 2, wallH: 3.0, roof: hex('#c08a2e'), over: 1.3, rh: 2.6, ridge: hex('#e0c270'), eaves, colonnade: true });
  } else {
    if (replaced('chuongduc') && String(gateRec.n || '').normalize('NFC') === 'Chương Đức'.normalize('NFC')) return { cx, cz, px, pz, plen };
    const groundY = LAND_Y + rise(cx, cz);
    buf.base = groundY - LAND_Y;
    const topY = groundY + 5.2;
    buf.kind = KIND.MASONRY;
    const ring = makeRectRing(cx, cz, w, Math.max(d, 4), a);
    const wallCol = hex('#d9c9a4');
    buf.prism(ring, topY, topY, wallCol, PAL.stone, { topKind: KIND.ROAD });
    const ops = [-1, 0, 1].map((slot) => ({
      p: [cx - pz * slot * pwid * 0.28, cz + px * slot * pwid * 0.28],
      dir: [px, pz],
      w: slot === 0 ? 2.6 : 2.0,
      h: slot === 0 ? 4.0 : 3.2,
      floor: groundY,
      arch: true,
    }));
    const built = passages(buf, ring, groundY - 0.6, topY, wallCol, ops);
    buf.kind = KIND.PLAIN;
    for (const sign of [-1, 1]) {
      for (const slot of [-1, 0, 1]) {
        if (built.some((tunnel) => tunnel.op === ops[slot + 1])) continue;
        const fx = cx + px * sign * (plen / 2 + 0.1) - pz * slot * pwid * 0.28;
        const fz = cz + pz * sign * (plen / 2 + 0.1) + px * slot * pwid * 0.28;
        buf.box(fx, fz, groundY, groundY + (slot === 0 ? 3.8 : 3.0), 0.3, slot === 0 ? 2.6 : 2.0, pa, DARK_FILL);
      }
    }
    const isYellow = YELLOW_ROOF_GATES.includes(String(gateRec.n || '').normalize('NFC'));
    pavilion(buf, cx, cz, Math.min(pwid * 0.8, 14), Math.max(3.5, plen * 0.7), pa + Math.PI / 2, topY, {
      tiers: 2, wallH: 2.2, roof: isYellow ? PAL.imperialRoof : PAL.jadeRoof, wall: hex('#b9452e'),
      over: 1.1, rh: 2.2, eaves, ridge: isYellow ? RIDGE_GOLD : hex('#e8d9a0'),
    });
    buf.kind = KIND.PLAIN;
    const outerPar = makeRectRing(cx, cz, w - 0.3, Math.max(d, 4) - 0.3, a);
    const innerPar = makeRectRing(cx, cz, w - 0.9, Math.max(d, 4) - 0.9, a);
    buf.prism(outerPar, topY, topY + 0.75, hex('#e6dcc3'), hex('#efe6d0'), { holes: [innerPar.reverse()], top: true });
    buf.base = 0;
  }
  return { cx, cz, px, pz, plen };
}

function buildKyDai(data: any, buf: Buf, group: THREE.Group, lightA: Buf, floodPos: number[], floodCol: number[]) {
  if (!data.special?.kydai || replaced('kydai')) return null;
  const ring = unflat(data.special.kydai.ring);
  const center = ringCentre(ring);
  const scaleRing = (factor: number) => ring.map((pt) => [center[0] + (pt[0] - center[0]) * factor, center[1] + (pt[1] - center[1]) * factor]);
  let curY = LAND_Y;
  const tiers: [number, number][] = [[1.0, 5.6], [0.74, 5.8], [0.5, 6.2]];
  buf.kind = KIND.MASONRY;
  for (const [scale, height] of tiers) {
    buf.prism(scaleRing(scale), curY, curY + height, PAL.brick, PAL.stone, { scaleTop: 0.94, centre: center, topKind: KIND.ROAD });
    buf.prism(scaleRing(scale * 0.94), curY + height, curY + height + 0.9, shade(PAL.brickLight, 1.05), PAL.stone, { holes: [scaleRing(scale * 0.9).reverse()], centre: center, top: true, topKind: KIND.ROAD });
    ringStrip(lightA, scaleRing(scale * 0.94), curY + height + 0.9 - 0.16, 0.1, 0.18, 0.28);
    curY += height;
  }
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2;
    floodPos.push(center[0] + Math.cos(ang) * 2.2, curY + 0.35, center[1] + Math.sin(ang) * 2.2);
    floodCol.push(1.0, 0.76, 0.42);
  }
  buf.kind = KIND.PLAIN;
  const poleH = 37;
  buf.cyl(center[0], center[1], curY, curY + 3, 1.3, 1.0, 8, PAL.stone);
  buf.cyl(center[0], center[1], curY + 3, curY + poleH, 0.5, 0.28, 8, hex('#e2dccd'));
  return makeFlag(group, { at: [center[0], curY + poleH - 0.4, center[1]], w: 15, h: 10, look: 'vn' });
}

function buildNgoMon(data: any, buf: Buf, impCenter: number[], lightA: Buf, addLantern: (x: number, y: number, z: number) => void) {
  if (!data.special?.ngomon || replaced('ngomon')) return;
  const ring = unflat(data.special.ngomon.ring);
  const box = obb(ring);
  const baseTop = LAND_Y + 5.4;
  buf.kind = KIND.MASONRY;
  buf.prism(ring, baseTop, baseTop, hex('#8e8172'), PAL.stone, { topKind: KIND.ROAD, parapet: 0.7 });
  buf.kind = KIND.PLAIN;
  ringStrip(lightA, ring, baseTop + 0.7 - 0.16, 0.12, 0.18, 0.28);

  const eaves: any[] = [];
  const ux = Math.cos(box.a), uz = Math.sin(box.a);
  let vx = -uz, vz = ux;
  if ((box.c[0] - impCenter[0]) * vx + (box.c[1] - impCenter[1]) * vz < 0) { vx = -vx; vz = -vz; }
  const ptAt = (u: number, v: number) => [box.c[0] + ux * u + vx * v, box.c[1] + uz * u + vz * v];
  const back = -box.d * 0.2;

  const centerPt = ptAt(0, back);
  pavilion(buf, centerPt[0], centerPt[1], box.w * 0.4, box.d * 0.4, box.a, baseTop, { tiers: 2, wallH: 3.1, roof: PAL.imperialRoof, over: 1.5, rh: 3.1, eaves, colonnade: true, segs: 3 });
  for (const sign of [-1, 1]) {
    const flankPt = ptAt(sign * box.w * 0.3, back);
    pavilion(buf, flankPt[0], flankPt[1], box.w * 0.2, box.d * 0.3, box.a, baseTop, { tiers: 1, wallH: 3.0, roof: PAL.jadeRoof, over: 1.1, rh: 2.4, eaves, colonnade: true, segs: 3 });
    const wingPt = ptAt(sign * box.w * 0.405, box.d * 0.08);
    pavilion(buf, wingPt[0], wingPt[1], box.d * 0.66, box.w * 0.15, box.a + Math.PI / 2, baseTop, { tiers: 2, wallH: 3.0, roof: PAL.jadeRoof, over: 1.1, rh: 2.6, eaves, colonnade: true, segs: 3 });
  }
  for (const eave of eaves) eaveStrip(lightA, eave);

  const ops = [-1, 0, 1].map((slot) => ({ p: ptAt(slot * box.w * 0.11, back), dir: [vx, vz], w: slot === 0 ? 3.2 : 2.4, h: slot === 0 ? 4.2 : 3.6, floor: LAND_Y, arch: false }));
  ops.push({ p: ptAt(0, box.d * 0.29), dir: [ux, uz], w: 2.3, h: 3.3, floor: LAND_Y, arch: true });
  buf.kind = KIND.MASONRY;
  const built = passages(buf, ring, LAND_Y, baseTop, hex('#8e8172'), ops);
  buf.kind = KIND.PLAIN;
  for (const slot of [-1, 0, 1]) {
    const tunnel = built.find((entry) => entry.op === ops[slot + 1]);
    const lampPt = tunnel ? ptAt(slot * box.w * 0.11, back + Math.max(tunnel.A.t, tunnel.B.t) + 5.0) : ptAt(slot * box.w * 0.11, back + box.d * 0.2 + 1.0);
    addLantern(lampPt[0], LAND_Y + (slot === 0 ? 2.5 : 2.2), lampPt[1]);
    if (!tunnel) {
      const darkPt = ptAt(slot * box.w * 0.11, back + box.d * 0.2 + 0.2);
      buf.box(darkPt[0], darkPt[1], LAND_Y, LAND_Y + (slot === 0 ? 4.2 : 3.6), slot === 0 ? 3.2 : 2.4, 0.4, box.a, DARK_FILL);
    }
  }
}

function buildThaiHoa(data: any, buf: Buf, lightB: Buf, addLantern: (x: number, y: number, z: number) => void) {
  if (!data.special?.thaihoa || replaced('thaihoa')) return;
  const box = obb(unflat(data.special.thaihoa.ring));
  const ux = Math.cos(box.a), uz = Math.sin(box.a), vx = -uz, vz = ux;
  const frontTarget = data.special.ngomon ? obb(unflat(data.special.ngomon.ring)).c : data.special.kydai ? ringCentre(unflat(data.special.kydai.ring)) : null;
  const frontSign = frontTarget && (frontTarget[0] - box.c[0]) * vx + (frontTarget[1] - box.c[1]) * vz < 0 ? -1 : 1;
  const ptAt = (u: number, v: number) => [box.c[0] + ux * u + vx * v, box.c[1] + uz * u + vz * v];

  buf.kind = KIND.MASONRY;
  buf.box(box.c[0], box.c[1], LAND_Y, LAND_Y + 1.4, box.w + 7, box.d + 7, box.a, PAL.stone, { taper: 0.97, topKind: KIND.ROAD });

  const upperLen = 11, lowerLen = 13, esplanadeW = box.w + 10;
  let pt = ptAt(0, frontSign * (box.d / 2 + 3.5 + upperLen / 2));
  buf.box(pt[0], pt[1], LAND_Y - 0.3, LAND_Y + 0.9, esplanadeW, upperLen, box.a, shade(PAL.stone, 0.97), { topKind: KIND.ROAD });
  pt = ptAt(0, frontSign * (box.d / 2 + 3.5 + upperLen + lowerLen / 2));
  buf.box(pt[0], pt[1], LAND_Y - 0.3, LAND_Y + 0.45, esplanadeW + 6, lowerLen, box.a, shade(PAL.stone, 0.94), { topKind: KIND.ROAD });
  pt = ptAt(0, frontSign * (box.d / 2 + 3.5 + (upperLen + lowerLen) / 2));
  buf.box(pt[0], pt[1], LAND_Y - 0.3, LAND_Y + 1.0, 4.2, upperLen + lowerLen, box.a, shade(PAL.stone, 1.06), { topKind: KIND.ROAD });

  buf.kind = KIND.PLAIN;
  for (const [vv, yy] of [[box.d / 2 + 3.5 + upperLen / 2, LAND_Y + 0.9], [box.d / 2 + 3.5 + upperLen + lowerLen / 2, LAND_Y + 0.45]]) {
    for (const side of [-1, 1]) {
      for (let k = 0; k < 9; k++) {
        const stonePt = ptAt(side * (5 + k * 2.4), frontSign * vv);
        buf.box(stonePt[0], stonePt[1], yy, yy + 0.75, 0.45, 0.22, box.a, hex('#c9c1ae'));
      }
    }
  }

  const halls = [
    { off: frontSign * 0.27, dep: 0.42, opt: { tiers: 1, wallH: 3.4, rh: 3.0, over: 1.5 } },
    { off: -frontSign * 0.2, dep: 0.56, opt: { tiers: 2, wallH: 3.6, rh: 3.2, over: 1.7 } },
  ];
  for (const { off, dep, opt } of halls) {
    const eaves: any[] = [];
    pavilion(buf, box.c[0] + vx * box.d * off, box.c[1] + vz * box.d * off, box.w, box.d * dep, box.a, LAND_Y + 1.4, { ...opt, roof: PAL.imperialRoof, eaves, colonnade: true, segs: 3 });
    if (eaves[0]) eaveStrip(lightB, eaves[0], [off < 0 ? 'v-' : 'v+'], 0.12, 0.09);
    if (eaves[1]) eaveStrip(lightB, eaves[1], ['v-', 'v+'], 0.12, 0.09);
  }
  if (frontTarget) {
    for (const side of [-1, 1]) {
      const v = frontSign * (box.d * 0.5 + 0.9), u = side * box.w * 0.14;
      addLantern(box.c[0] + ux * u + vx * v, LAND_Y + 1.4 + 1.7, box.c[1] + uz * u + vz * v);
    }
  }
}

function buildRiversidePavilions(data: any, buf: Buf, lightB: Buf, addLantern: (x: number, y: number, z: number) => void) {
  for (const key of ['phuvanlau', 'nghenhluong']) {
    if (!data.special?.[key] || replaced(key)) continue;
    const box = obb(unflat(data.special[key].ring));
    if (key === 'phuvanlau') {
      const eaves: any[] = [];
      pavilion(buf, box.c[0], box.c[1], box.w * 0.86, box.d * 0.86, box.a, LAND_Y, { tiers: 2, wallH: 3.9, roof: PAL.imperialRoof2, wall: hex('#8f3b2a'), over: 1.2, rh: 3.1, platform: 1.2, eaves, colonnade: true, segs: 3 });
      if (eaves[0]) eaveStrip(lightB, eaves[0], ['v-', 'v+'], 0.12, 0.09);
      if (data.special?.kydai) {
        const kd = ringCentre(unflat(data.special.kydai.ring));
        const face = faceToward({ ...box, w: box.w * 0.86, d: box.d * 0.86 }, [box.c[0] - kd[0], box.c[1] - kd[1]]);
        for (const side of [-1, 1]) {
          const outDist = face.half + 0.9, lateral = side * Math.min(1.6, face.side * 0.4);
          addLantern(box.c[0] + face.n[0] * outDist + face.t[0] * lateral, LAND_Y + 1.2 + 1.6, box.c[1] + face.n[1] * outDist + face.t[1] * lateral);
        }
      }
      continue;
    }

    const kd = data.special?.kydai ? ringCentre(unflat(data.special.kydai.ring)) : [box.c[0] - 1, box.c[1] - 1];
    let fwd = [box.c[0] - kd[0], box.c[1] - kd[1]];
    const fwdLen = Math.hypot(fwd[0], fwd[1]) || 1;
    fwd = [fwd[0] / fwdLen, fwd[1] / fwdLen];
    const fwdAng = Math.atan2(fwd[1], fwd[0]);
    const sideLen = Math.min(box.w, box.d) * 0.72;
    const ptAlong = (dist: number) => [box.c[0] + fwd[0] * dist, box.c[1] + fwd[1] * dist];
    const wallCol = hex('#8f3b2a'), roofCol = PAL.imperialRoof2;

    buf.kind = KIND.MASONRY;
    buf.box(box.c[0], box.c[1], LAND_Y, LAND_Y + 0.9, sideLen + 9.5, sideLen + 3.2, fwdAng, PAL.stone, { taper: 0.98, topKind: KIND.ROAD });
    for (const endSign of [-1, 1]) {
      const porchPt = ptAlong(endSign * (sideLen / 2 + 2.0));
      buf.kind = KIND.TIMBER;
      buf.box(porchPt[0], porchPt[1], LAND_Y + 0.9, LAND_Y + 3.5, 3.4, sideLen * 0.7, fwdAng, wallCol, { top: shade(roofCol, 0.8) });
      buf.hip(porchPt[0], porchPt[1], sideLen * 0.7, 3.4, fwdAng + Math.PI / 2, LAND_Y + 3.5, 1.5, roofCol, { flare: 0.4, over: 1.0, fascia: 0.25, fasciaCol: shade(wallCol, 0.75), glazed: true });
    }
    const eaves: any[] = [];
    pavilion(buf, box.c[0], box.c[1], sideLen, sideLen, fwdAng, LAND_Y + 0.9, { tiers: 2, wallH: 2.7, roof: roofCol, wall: wallCol, over: 1.3, rh: 2.0, eaves, colonnade: true, segs: 3 });
    if (eaves[0]) eaveStrip(lightB, eaves[0], ['v-', 'v+'], 0.12, 0.09);
    for (const side of [-1, 1]) {
      const lampPt = ptAlong(sideLen / 2 + 2.0 + 1.7 + 0.6);
      addLantern(lampPt[0] - fwd[1] * side * 1.3, LAND_Y + 0.9 + 1.6, lampPt[1] + fwd[0] * side * 1.3);
    }

    buf.kind = KIND.MASONRY;
    const isOnLand = landTest(data);
    let stepStart = sideLen / 2 + 5.2;
    for (let dist = stepStart + 5 * 0.42; dist < stepStart + 40; dist += 0.25) {
      const pt = ptAlong(dist);
      if (!isOnLand(pt[0], pt[1])) { stepStart = dist - 5 * 0.42; break; }
    }
    if (stepStart > sideLen / 2 + 5.3) {
      const walkPt = ptAlong((sideLen / 2 + 4.7 + stepStart) / 2);
      buf.box(walkPt[0], walkPt[1], LAND_Y - 0.4, LAND_Y + 0.86, stepStart - sideLen / 2 - 4.7, 6, fwdAng, PAL.stone, { topKind: KIND.ROAD });
    }
    for (let i = 0; i < 13; i++) {
      const stepPt = ptAlong(stepStart + i * 0.42);
      buf.box(stepPt[0], stepPt[1], LAND_Y - 2.4, LAND_Y + 0.86 - i * 0.2, 0.44, 6, fwdAng, PAL.stone, { topKind: KIND.ROAD });
    }
    const landingPt = ptAlong(stepStart + 13 * 0.42 + 2.2);
    buf.box(landingPt[0], landingPt[1], LAND_Y - 3.2, LAND_Y - 1.75, 4.6, 16, fwdAng, PAL.stone, { topKind: KIND.ROAD });
    buf.kind = KIND.PLAIN;
  }
}

export function buildCitadel(data: any, buf: Buf, group: THREE.Group) {
  const startVert = buf.n;
  try {
    return buildCitadelInner(data, buf, group);
  } catch (err) {
    buf.n = startVert;
    buf.kind = KIND.PLAIN;
    buf.base = 0;
    console.warn('Citadel not built:', err);
    return { flag: null, glows: [], update() {} };
  }
}

function buildCitadelInner(data: any, buf: Buf, group: THREE.Group) {
  const placePos = (id: string) => {
    const rec = (data.places || []).find((entry: any) => entry.id === id);
    return rec ? [rec.x / DECIMETRES_PER_METRE, rec.z / DECIMETRES_PER_METRE] : null;
  };
  const impCenter = [data.imperial.c[0] / DECIMETRES_PER_METRE, data.imperial.c[1] / DECIMETRES_PER_METRE];
  const cityCenter = placePos('kinhthanh') || impCenter;

  const lightA = new Buf(800);
  const lightB = new Buf(800);
  const lanPos: number[] = [], lanCol: number[] = [];
  const floodPos: number[] = [], floodCol: number[] = [];
  const glows: any[] = [];
  const addLantern = (x: number, y: number, z: number) => { lanPos.push(x, y, z); lanCol.push(...LANTERN_COL); };

  const coverFaces: [number[], number[]][] = [];
  for (const poly of data.wall || []) {
    for (const ring of poly.map(unflat)) {
      for (let i = 0; i < ring.length; i++) coverFaces.push([ring[i], ring[(i + 1) % ring.length]]);
    }
  }
  for (const flat of data.iwalls || []) {
    const pts = unflat(flat);
    for (let i = 0; i + 1 < pts.length; i++) {
      const p0 = pts[i], p1 = pts[i + 1], segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (segLen < 0.3) continue;
      const tx = (p1[0] - p0[0]) / segLen, tz = (p1[1] - p0[1]) / segLen;
      for (const off of [-0.85, 0.85]) {
        coverFaces.push([[p0[0] - tx * 0.75 - tz * off, p0[1] - tz * 0.75 + tx * off], [p1[0] + tx * 0.75 - tz * off, p1[1] + tz * 0.75 + tx * off]]);
      }
    }
  }
  const coverAt = (x: number, z: number, reach = 45) => coverFaces.filter(([p0, p1]) => {
    const ex = p1[0] - p0[0], ez = p1[1] - p0[1], lenSq = ex * ex + ez * ez || 1;
    const frac = Math.max(0, Math.min(1, ((x - p0[0]) * ex + (z - p0[1]) * ez) / lenSq));
    return Math.hypot(p0[0] + ex * frac - x, p0[1] + ez * frac - z) < reach;
  });

  for (const gateRec of data.gates || []) {
    const normName = String(gateRec.n || '').normalize('NFC');
    if (normName === 'Cửa Hiển Nhơn'.normalize('NFC') && replaced('hiennhon')) continue;
    if (replaced('mangca') && normName === 'Trấn Bình Môn'.normalize('NFC')) continue;
    if (replaced(`gate:${String(gateRec.n || '')}`)) continue;
    if (replaced('thienmu') && data.hakhe && inRing(gateRec.c[0] / DECIMETRES_PER_METRE, gateRec.c[1] / DECIMETRES_PER_METRE, unflat(data.hakhe.ring))) continue;
    const isLit = LIT_GATES.includes(normName);
    const eaves = isLit ? [] : null;
    const info = buildGate(buf, gateRec, gateRec.k === 'citadel' ? cityCenter : impCenter, eaves, coverAt);
    if (!isLit) continue;
    if (eaves && eaves[0]) eaveStrip(lightB, eaves[0]);
    for (const sign of [-1, 1]) {
      addLantern(info.cx + info.px * sign * (info.plen / 2 + 1.2), LAND_Y + 2.6, info.cz + info.pz * sign * (info.plen / 2 + 1.2));
    }
  }

  const flag = buildKyDai(data, buf, group, lightA, floodPos, floodCol);
  buildNgoMon(data, buf, impCenter, lightA, addLantern);
  buildThaiHoa(data, buf, lightB, addLantern);
  buildRiversidePavilions(data, buf, lightB, addLantern);

  addLightMesh(group, lightA, 0xffb64c, 1.4);
  addLightMesh(group, lightB, 0xffae42, 1.2);
  addLampPoints(group, lanPos, lanCol, 7, glows);
  addLampPoints(group, floodPos, floodCol, 8, glows);

  return {
    flag,
    glows,
    update() {},
  };
}
