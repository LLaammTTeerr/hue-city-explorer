import { KIND, hex, type Buf } from './buf.ts';
import { LAND_Y } from '../config.ts';
import { resample } from './bridges.ts';

// The one bridge of the Kinh thành (issue #19): weathered dark brick, round vaults springing just above the water,
// each ringed in lime plaster on both faces; a plastered string course at deck level; a solid brick parapet with
// plastered coping and round plaster medallions on its face, square posts at the ends.

const BRICK = hex('#6c5e53');
const BRICK_DARK = hex('#584c43');
const SOFFIT = hex('#433b35');
const PLASTER = hex('#d6cebb');
const PLASTER_DARK = hex('#bdb4a0');

const PARAPET_H = 0.75;
const PARAPET_T = 0.3;
const COPING_H = 0.1;
const VAULT_RING_W = 0.42;
const MEDAL_R = 0.2;
const MEDAL_STEP = 2.4;
const MEDAL_SEGS = 10;
const RESAMPLE_STEP_M = 0.5;
const MITER_MIN_COS = 0.55;

function computeDeckFrames(pts: number[][], ends: any) {
  const count = pts.length;
  const normals = pts.map((_, i) => {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(count - 1, i + 1)];
    const dx = next[0] - prev[0], dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    return [-dz / len, dx / len];
  });
  const offsets = normals.map((nrm) => nrm);
  const unitDir = (a: number[], b: number[]) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
    return [dx / len, dz / len];
  };
  for (const [endIdx, ptIdx] of [[0, 0], [1, count - 1]]) {
    const endPt = ends?.[endIdx];
    if (!endPt || endPt.dir || count < 2) continue;
    const tip = pts[ptIdx];
    const adj = pts[endIdx ? ptIdx - 1 : 1];
    const d1 = endIdx ? unitDir(adj, tip) : unitDir(endPt, tip);
    const d2 = endIdx ? unitDir(tip, endPt) : unitDir(tip, adj);
    let tanX = d1[0] + d2[0], tanZ = d1[1] + d2[1];
    const tanLen = Math.hypot(tanX, tanZ);
    if (tanLen < 1e-6) continue;
    tanX /= tanLen; tanZ /= tanLen;
    const cos = Math.max(MITER_MIN_COS, -tanZ * normals[ptIdx][0] + tanX * normals[ptIdx][1]);
    offsets[ptIdx] = [-tanZ / cos, tanX / cos];
  }
  return { normals, offsets };
}

export function citadelBridge(buf: Buf, pts: number[][], width: number, profile: any, roadCol: number[], ends: any = null) {
  const sampled = resample(pts, RESAMPLE_STEP_M, profile.breaks);
  const count = sampled.pts.length;
  const halfW = width / 2;
  const { normals, offsets } = computeDeckFrames(sampled.pts, ends);

  const deckPt = (idx: number, across: number, y: number) => [
    sampled.pts[idx][0] + offsets[idx][0] * across,
    y,
    sampled.pts[idx][1] + offsets[idx][1] * across,
  ];
  const topY = sampled.s.map((dist) => profile.y(dist));
  const deepY = (profile.spring ?? LAND_Y - 1.3) - 2.2;
  const botY = sampled.s.map((dist) => (profile.bottom ? profile.bottom(dist) : deepY));
  const inVault = (dist: number) => (profile.vaults || []).some((vault: any) => dist > vault.a + 0.01 && dist < vault.b - 0.01);

  const prevKind = buf.kind;
  const addStrip = (off0: (i: number) => number, off1: (i: number) => number, y0: (i: number) => number, y1: (i: number) => number, col: number[], hint: (i: number) => number[]) => {
    for (let i = 0; i + 1 < count; i++) {
      const next = i + 1;
      buf.quad(deckPt(i, off0(i), y0(i)), deckPt(next, off0(next), y0(next)), deckPt(next, off1(next), y1(next)), deckPt(i, off1(i), y1(i)), col, hint(i));
    }
  };
  const sideHint = (sign: number) => (i: number) => [normals[i][0] * sign, 0, normals[i][1] * sign];
  const upHint = () => [0, 1, 0];
  const downHint = () => [0, -1, 0];
  const constVal = (val: number) => () => val;

  buf.kind = KIND.ROAD;
  addStrip(constVal(-(halfW - PARAPET_T)), constVal(halfW - PARAPET_T), (i) => topY[i], (i) => topY[i], roadCol, upHint);

  buf.kind = KIND.MASONRY;
  for (const sign of [-1, 1]) {
    const outerOff = sign * halfW;
    const stringOff = sign * (halfW + 0.05);
    const innerOff = sign * (halfW - PARAPET_T);
    const copingIn = sign * (halfW - PARAPET_T - 0.04);
    const copingOut = sign * (halfW + 0.04);

    addStrip(constVal(outerOff), constVal(outerOff), (i) => botY[i], (i) => topY[i] - 0.2, BRICK, sideHint(sign));

    buf.kind = KIND.PLAIN;
    addStrip(constVal(stringOff), constVal(stringOff), (i) => topY[i] - 0.2, (i) => topY[i] + 0.02, PLASTER, sideHint(sign));
    addStrip(constVal(outerOff), constVal(stringOff), (i) => topY[i] + 0.02, (i) => topY[i] + 0.02, PLASTER, upHint);
    addStrip(constVal(outerOff), constVal(stringOff), (i) => topY[i] - 0.2, (i) => topY[i] - 0.2, PLASTER_DARK, downHint);

    buf.kind = KIND.MASONRY;
    addStrip(constVal(outerOff), constVal(outerOff), (i) => topY[i] + 0.02, (i) => topY[i] + PARAPET_H, BRICK, sideHint(sign));
    addStrip(constVal(innerOff), constVal(innerOff), (i) => topY[i], (i) => topY[i] + PARAPET_H, BRICK_DARK, sideHint(-sign));

    buf.kind = KIND.PLAIN;
    const copingBot = (i: number) => topY[i] + PARAPET_H;
    const copingTop = (i: number) => topY[i] + PARAPET_H + COPING_H;
    addStrip(constVal(copingIn), constVal(copingOut), copingTop, copingTop, PLASTER, upHint);
    addStrip(constVal(copingOut), constVal(copingOut), copingBot, copingTop, PLASTER, sideHint(sign));
    addStrip(constVal(copingIn), constVal(copingIn), copingBot, copingTop, PLASTER, sideHint(-sign));

    for (const vault of profile.vaults || []) {
      const vaultIds: number[] = [];
      for (let i = 0; i < count; i++) if (sampled.s[i] >= vault.a - 1e-3 && sampled.s[i] <= vault.b + 1e-3) vaultIds.push(i);
      for (let idx = 0; idx + 1 < vaultIds.length; idx++) {
        const i = vaultIds[idx], j = vaultIds[idx + 1];
        const ringI = Math.min(VAULT_RING_W, topY[i] - 0.22 - botY[i]);
        const ringJ = Math.min(VAULT_RING_W, topY[j] - 0.22 - botY[j]);
        if (ringI <= 0.02 && ringJ <= 0.02) continue;
        const ringOff = sign * (halfW + 0.03);
        buf.quad(deckPt(i, ringOff, botY[i]), deckPt(j, ringOff, botY[j]), deckPt(j, ringOff, botY[j] + Math.max(0, ringJ)), deckPt(i, ringOff, botY[i] + Math.max(0, ringI)), PLASTER, sideHint(sign)(i));
        buf.quad(deckPt(i, outerOff, botY[i]), deckPt(j, outerOff, botY[j]), deckPt(j, ringOff, botY[j]), deckPt(i, ringOff, botY[i]), PLASTER_DARK, downHint());
      }
    }

    const medalCount = Math.max(1, Math.floor((profile.len - 1.5) / MEDAL_STEP));
    for (let k = 0; k < medalCount; k++) {
      const dist = (profile.len * (k + 0.5)) / medalCount;
      let i = 0;
      while (i + 2 < count && sampled.s[i + 1] < dist) i++;
      const frac = Math.min(1, Math.max(0, (dist - sampled.s[i]) / ((sampled.s[i + 1] - sampled.s[i]) || 1)));
      const cx = sampled.pts[i][0] + (sampled.pts[i + 1][0] - sampled.pts[i][0]) * frac;
      const cz = sampled.pts[i][1] + (sampled.pts[i + 1][1] - sampled.pts[i][1]) * frac;
      const cy = topY[i] + (topY[i + 1] - topY[i]) * frac + PARAPET_H * 0.5;
      const nx = normals[i][0] * sign, nz = normals[i][1] * sign;
      const ux = normals[i][1], uz = -normals[i][0];
      const center = [cx + nx * (halfW + 0.025), cy, cz + nz * (halfW + 0.025)];
      for (let seg = 0; seg < MEDAL_SEGS; seg++) {
        const a0 = (2 * Math.PI * seg) / MEDAL_SEGS;
        const a1 = (2 * Math.PI * (seg + 1)) / MEDAL_SEGS;
        const rimPt = (ang: number) => [center[0] + ux * Math.cos(ang) * MEDAL_R, center[1] + Math.sin(ang) * MEDAL_R, center[2] + uz * Math.cos(ang) * MEDAL_R];
        buf.tri(center, rimPt(a0), rimPt(a1), PLASTER, [nx, 0, nz]);
      }
    }
    buf.kind = KIND.MASONRY;
  }

  for (let i = 0; i + 1 < count; i++) {
    const next = i + 1;
    const underCol = inVault((sampled.s[i] + sampled.s[next]) / 2) ? SOFFIT : BRICK_DARK;
    buf.quad(deckPt(i, -halfW, botY[i]), deckPt(i, halfW, botY[i]), deckPt(next, halfW, botY[next]), deckPt(next, -halfW, botY[next]), underCol, downHint());
  }

  for (const endIdx of [0, count - 1]) {
    const inwardSign = endIdx ? -1 : 1;
    const ang = Math.atan2(-normals[endIdx][0], normals[endIdx][1]);
    buf.kind = KIND.MASONRY;
    buf.quad(deckPt(endIdx, -halfW, botY[endIdx]), deckPt(endIdx, halfW, botY[endIdx]), deckPt(endIdx, halfW, topY[endIdx]), deckPt(endIdx, -halfW, topY[endIdx]), BRICK_DARK, [-normals[endIdx][1] * inwardSign, 0, normals[endIdx][0] * inwardSign]);
    for (const sign of [-1, 1]) {
      const across = sign * (halfW - PARAPET_T / 2);
      const alongOff = 0.32 * inwardSign;
      const ux = normals[endIdx][1], uz = -normals[endIdx][0];
      const x = sampled.pts[endIdx][0] + normals[endIdx][0] * across + ux * alongOff;
      const z = sampled.pts[endIdx][1] + normals[endIdx][1] * across + uz * alongOff;
      buf.kind = KIND.MASONRY;
      buf.box(x, z, topY[endIdx] - 0.2, topY[endIdx] + PARAPET_H + 0.35, 0.55, 0.55, ang, BRICK, { top: PLASTER });
      buf.kind = KIND.PLAIN;
      buf.box(x, z, topY[endIdx] + PARAPET_H + 0.35, topY[endIdx] + PARAPET_H + 0.47, 0.68, 0.68, ang, PLASTER);
    }
  }
  buf.kind = prevKind;
}
