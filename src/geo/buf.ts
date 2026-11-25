import * as THREE from 'three';
import type { RgbColor } from '../types.ts';

const DECIMETRES_PER_METRE = 10;
const DEFAULT_CHUNK_SIZE_M = 1300;
const ROOF_JOIN_GRID_M = 32;
const ROOF_ANGLE_TOL_RAD = 0.06;
const ROOF_HEIGHT_OVERLAP_MARGIN_M = 0.5;
const ROOF_WALL_OVERLAP_MAX_M = -0.8;
const ROOF_MIN_ALONG_OVERLAP_M = 0.3;
const GUTTER_MIN_LEN_M = 0.5;
const GUTTER_WIDTH_M = 0.5;

// Growable flat-shaded triangle soup with per-vertex colour. Everything static in
// the scene (buildings, walls, landmarks) is baked through this into a handful of meshes.
export const hex = (color: THREE.ColorRepresentation): RgbColor => {
  const parsed = new THREE.Color(color);
  return [parsed.r, parsed.g, parsed.b];
};
export const mix = (colA: number[], colB: number[], t: number): RgbColor => [
  colA[0] + (colB[0] - colA[0]) * t,
  colA[1] + (colB[1] - colA[1]) * t,
  colA[2] + (colB[2] - colA[2]) * t,
];
export const shade = (col: number[], factor: number): RgbColor => [col[0] * factor, col[1] * factor, col[2] * factor];

// What a face is made of. The fragment shader paints the matching surface detail
// (window bays, roof tiles, brick courses…) so geometry stays light.
export const KIND = {
  PLAIN: 0, FACADE: 1, TILE: 2, FLAT: 3, MASONRY: 4, GROUND: 5,
  ROAD: 6, TIMBER: 7, CIVIC: 8, GLAZED: 9, COLONIAL: 10, MODERN: 11, LINE: 12,
};
// Added to a face's kind: the face is floodlit after dark (riverside facade lighting, issue #21). Kinds stay below it.
export const KIND_FLOOD = 64;

const lerpPoint3 = (p0: number[], p1: number[], t: number) => [
  p0[0] + (p1[0] - p0[0]) * t,
  p0[1] + (p1[1] - p0[1]) * t,
  p0[2] + (p1[2] - p0[2]) * t,
];

function buildClipPlanes(clip: any, halfW: number, halfD: number): [number, number, number][] {
  const planes: [number, number, number][] = [];
  if (!clip) return planes;
  if (clip.u0 > -halfW) planes.push([-1, 0, -clip.u0]);
  if (clip.u1 < halfW) planes.push([1, 0, clip.u1]);
  if (clip.v0 > -halfD) planes.push([0, -1, -clip.v0]);
  if (clip.v1 < halfD) planes.push([0, 1, clip.v1]);
  return planes;
}

export class Buf {
  static roofLog: any[] | null = null; // an array while scripts/check-roofs.mjs builds the scene: every hip roof drawn
  cap: number;
  n: number;
  kind: number;
  base: number;
  pos: Float32Array;
  nrm: Int8Array;
  col: Uint8Array;
  knd: Uint8Array;
  bas: Float32Array;
  roofs?: any[];
  _joinQ?: any[] | null;
  mark?: number;
  wallRange?: [number, number];
  paved?: any;
  noCover?: any;
  [key: string]: any;

  constructor(tris = 4096) {
    this.cap = tris * 3;
    this.n = 0;
    this.kind = KIND.PLAIN;
    this.base = 0;
    this.pos = new Float32Array(this.cap * 3);
    this.nrm = new Int8Array(this.cap * 3);
    this.col = new Uint8Array(this.cap * 3);
    this.knd = new Uint8Array(this.cap);
    this.bas = new Float32Array(this.cap);
  }

  grow() {
    this.cap *= 2;
    const nextPos = new Float32Array(this.cap * 3); nextPos.set(this.pos); this.pos = nextPos;
    const nextNrm = new Int8Array(this.cap * 3); nextNrm.set(this.nrm); this.nrm = nextNrm;
    const nextCol = new Uint8Array(this.cap * 3); nextCol.set(this.col); this.col = nextCol;
    const nextKnd = new Uint8Array(this.cap); nextKnd.set(this.knd); this.knd = nextKnd;
    const nextBas = new Float32Array(this.cap); nextBas.set(this.bas); this.bas = nextBas;
  }

  // Drop the working arrays once geometry() has copied them out and nothing will draw into this buffer again
  // (the shared structures buffer is ~170 MB at full capacity). A later write starts again from a small buffer.
  release() {
    this.cap = 3;
    this.n = 0;
    this.pos = new Float32Array(9);
    this.nrm = new Int8Array(9);
    this.col = new Uint8Array(9);
    this.knd = new Uint8Array(3);
    this.bas = new Float32Array(3);
  }

  // Smooth-shaded triangle with explicit per-vertex normals and colours (used for foliage).
  smoothTri(verts: number[][], norms: number[][], cols: number[][]) {
    if (this.n + 3 > this.cap) this.grow();
    let offset = this.n * 3;
    for (let k = 0; k < 3; k++) {
      const len = Math.hypot(norms[k][0], norms[k][1], norms[k][2]) || 1;
      this.pos[offset] = verts[k][0];
      this.pos[offset + 1] = verts[k][1];
      this.pos[offset + 2] = verts[k][2];
      this.nrm[offset] = (norms[k][0] / len) * 127;
      this.nrm[offset + 1] = (norms[k][1] / len) * 127;
      this.nrm[offset + 2] = (norms[k][2] / len) * 127;
      for (let ch = 0; ch < 3; ch++) {
        this.col[offset + ch] = Math.max(0, Math.min(255, Math.round(Math.sqrt(cols[k][ch]) * 255)));
      }
      this.knd[this.n + k] = this.kind;
      this.bas[this.n + k] = this.base;
      offset += 3;
    }
    this.n += 3;
  }

  // p0, p1, p2: [x,y,z]. hint: rough outward direction; winding is fixed to match it.
  tri(p0: number[], p1: number[], p2: number[], col: number[], hint?: number[]) {
    if (this.n + 3 > this.cap) this.grow();
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) return;
    nx /= len; ny /= len; nz /= len;
    if (hint && nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) {
      const tmp = p1; p1 = p2; p2 = tmp;
      nx = -nx; ny = -ny; nz = -nz;
    }
    let offset = this.n * 3;
    const posArr = this.pos, nrmArr = this.nrm, colArr = this.col;
    const red = Math.max(0, Math.min(255, Math.round(Math.sqrt(col[0]) * 255)));
    const grn = Math.max(0, Math.min(255, Math.round(Math.sqrt(col[1]) * 255)));
    const blu = Math.max(0, Math.min(255, Math.round(Math.sqrt(col[2]) * 255)));
    for (const vert of [p0, p1, p2]) {
      posArr[offset] = vert[0]; posArr[offset + 1] = vert[1]; posArr[offset + 2] = vert[2];
      nrmArr[offset] = nx * 127; nrmArr[offset + 1] = ny * 127; nrmArr[offset + 2] = nz * 127;
      colArr[offset] = red; colArr[offset + 1] = grn; colArr[offset + 2] = blu;
      offset += 3;
    }
    this.knd[this.n] = this.knd[this.n + 1] = this.knd[this.n + 2] = this.kind;
    this.bas[this.n] = this.bas[this.n + 1] = this.bas[this.n + 2] = this.base;
    this.n += 3;
  }

  quad(p0: number[], p1: number[], p2: number[], p3: number[], col: number[], hint?: number[]) {
    this.tri(p0, p1, p2, col, hint);
    this.tri(p0, p2, p3, col, hint);
  }

  // Box rotated about Y. (cx,cz) centre, y0..y1, sx along local x, sz along local z.
  box(cx: number, cz: number, y0: number, y1: number, sx: number, sz: number, ang: number, col: number[], { top = col, bottom = false, taper = 1, topKind = null }: Record<string, any> = {}) {
    const ux = Math.cos(ang), uz = Math.sin(ang);
    const localPt = (u: number, v: number, y: number, scale = 1) => [cx + u * scale * ux - v * scale * uz, y, cz + u * scale * uz + v * scale * ux];
    const halfX = sx / 2, halfZ = sz / 2;
    const bot = [localPt(-halfX, -halfZ, y0), localPt(halfX, -halfZ, y0), localPt(halfX, halfZ, y0), localPt(-halfX, halfZ, y0)];
    const topPts = [localPt(-halfX, -halfZ, y1, taper), localPt(halfX, -halfZ, y1, taper), localPt(halfX, halfZ, y1, taper), localPt(-halfX, halfZ, y1, taper)];
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      const outHint = [(bot[i][0] + bot[next][0]) / 2 - cx, 0.2, (bot[i][2] + bot[next][2]) / 2 - cz];
      this.quad(bot[i], bot[next], topPts[next], topPts[i], col, outHint);
    }
    const prevKind = this.kind;
    if (topKind !== null) this.kind = topKind;
    this.quad(topPts[0], topPts[1], topPts[2], topPts[3], top, [0, 1, 0]);
    this.kind = prevKind;
    if (bottom) this.quad(bot[0], bot[1], bot[2], bot[3], col, [0, -1, 0]);
  }

  // Free 3D beam from start to end with a width × height cross-section.
  beam(start: number[], end: number[], width: number, height: number, col: number[]) {
    const dx = end[0] - start[0], dy = end[1] - start[1], dz = end[2] - start[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-6) return;
    const dir = [dx / len, dy / len, dz / len];
    const refUp = Math.abs(dir[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    let side = [dir[1] * refUp[2] - dir[2] * refUp[1], dir[2] * refUp[0] - dir[0] * refUp[2], dir[0] * refUp[1] - dir[1] * refUp[0]];
    const sideLen = Math.hypot(side[0], side[1], side[2]);
    side = side.map((val) => val / sideLen);
    const up = [side[1] * dir[2] - side[2] * dir[1], side[2] * dir[0] - side[0] * dir[2], side[0] * dir[1] - side[1] * dir[0]];
    const corner = (pt: number[], su: number, sv: number) => [
      pt[0] + (side[0] * su * width) / 2 + (up[0] * sv * height) / 2,
      pt[1] + (side[1] * su * width) / 2 + (up[1] * sv * height) / 2,
      pt[2] + (side[2] * su * width) / 2 + (up[2] * sv * height) / 2,
    ];
    const capA = [corner(start, -1, -1), corner(start, 1, -1), corner(start, 1, 1), corner(start, -1, 1)];
    const capB = [corner(end, -1, -1), corner(end, 1, -1), corner(end, 1, 1), corner(end, -1, 1)];
    const hints = [[-up[0], -up[1], -up[2]], side, up, [-side[0], -side[1], -side[2]]];
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      this.quad(capA[i], capA[next], capB[next], capB[i], col, hints[i]);
    }
    this.quad(capA[0], capA[1], capA[2], capA[3], col, [-dir[0], -dir[1], -dir[2]]);
    this.quad(capB[0], capB[1], capB[2], capB[3], col, dir);
  }

  // Extrude a ring ([[x,z],...], any winding) from y0 to y1. holes: array of rings.
  prism(ring: number[][], y0: number, y1: number, wallCol: number[], topCol = wallCol, { holes = [], top = true, scaleTop = 1, centre = null, topKind = null, parapet = 0 }: Record<string, any> = {}) {
    const allRings = [ring, ...holes];
    const center = centre || ringCentre(ring);
    const scalePt = (pt: number[]) => (scaleTop === 1 ? pt : [center[0] + (pt[0] - center[0]) * scaleTop, center[1] + (pt[1] - center[1]) * scaleTop]);
    allRings.forEach((curRing, ringIdx) => {
      const sign = signedArea(curRing) > 0 ? 1 : -1;
      const outSign = ringIdx === 0 ? sign : -sign;
      for (let i = 0, len = curRing.length; i < len; i++) {
        const p0 = curRing[i], p1 = curRing[(i + 1) % len];
        const edgeX = p1[0] - p0[0], edgeZ = p1[1] - p0[1];
        if (edgeX * edgeX + edgeZ * edgeZ < 1e-6) continue;
        const topA = scalePt(p0), topB = scalePt(p1);
        this.quad([p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [topB[0], y1 + parapet, topB[1]], [topA[0], y1 + parapet, topA[1]], wallCol, [edgeZ * outSign, 0.001, -edgeX * outSign]);
        if (parapet) {
          this.quad([topA[0], y1, topA[1]], [topB[0], y1, topB[1]], [topB[0], y1 + parapet, topB[1]], [topA[0], y1 + parapet, topA[1]], shade(wallCol, 0.72), [-edgeZ * outSign, 0.001, edgeX * outSign]);
        }
      }
    });
    const prevKind = this.kind;
    if (topKind !== null) this.kind = topKind;
    if (top) {
      const contour = ring.map((pt) => { const scaled = scalePt(pt); return new THREE.Vector2(scaled[0], scaled[1]); });
      const holeContours = holes.map((hole: number[][]) => hole.map((pt) => { const scaled = scalePt(pt); return new THREE.Vector2(scaled[0], scaled[1]); }));
      const faces = THREE.ShapeUtils.triangulateShape(contour, holeContours);
      const pts = contour.concat(...holeContours);
      for (const face of faces) {
        const v0 = pts[face[0]], v1 = pts[face[1]], v2 = pts[face[2]];
        this.tri([v0.x, y1, v0.y], [v1.x, y1, v1.y], [v2.x, y1, v2.y], topCol, [0, 1, 0]);
      }
    }
    this.kind = prevKind;
  }

  joined(fn: () => void) {
    const outerQueue = this._joinQ;
    const queue = (this._joinQ = []);
    try { fn(); } finally { this._joinQ = outerQueue; }
    const { clips, gutters } = joinRoofs(queue);
    const keepBase = this.base;
    const keepMark = this.mark;
    queue.forEach((roof, idx) => {
      this.base = roof.base;
      const startVert = this.n;
      this.hip(roof.cx, roof.cz, roof.w, roof.d, roof.ang, roof.y0, roof.h, roof.col, { ...roof.opts, clip: clips[idx], _now: true });
      if (roof.mark) for (let vert = startVert; vert < this.n; vert++) this.knd[vert] |= roof.mark;
    });
    for (const gutter of gutters) {
      const [idxA, idxB] = gutter.roofs;
      const lowerRoof = queue[idxA].y0 <= queue[idxB].y0 ? queue[idxA] : queue[idxB];
      this.base = lowerRoof.base;
      const startVert = this.n;
      layGutter(this, gutter, lowerRoof.col);
      if (lowerRoof.mark) for (let vert = startVert; vert < this.n; vert++) this.knd[vert] |= lowerRoof.mark;
    }
    this.base = keepBase;
    this.mark = keepMark;
    return { clips, gutters };
  }

  hip(cx: number, cz: number, w: number, d: number, ang: number, y0: number, h: number, col: number[], opts: Record<string, any> = {}) {
    if (this._joinQ && !opts._now) {
      const { flare = 0, over = 0, hips = false, ridgeCol = null, segs = null, clip = null } = opts;
      if (Buf.roofLog) opts = { ...opts, _site: roofSite() };
      this._joinQ.push({ cx, cz, w, d, ang, y0, h, col, over, flare, hips, ridgeCol, segs, clip, opts, base: this.base, mark: this.mark || 0 });
      return;
    }
    if (this.roofs) this.roofs.push({ cx, cz, w, d, ang, y0, h, over: opts.over || 0 });
    const { flare = 0, over = 0, ridgeCol = null, fascia = 0, fasciaCol = null, hips = false, glazed = false, segs = null, horns = null, tip = 1, clip = null, ridge = null } = opts;
    const wallW = w, wallD = d;
    w += over * 2; d += over * 2;
    const prevKind = this.kind;
    this.kind = glazed ? KIND.GLAZED : KIND.TILE;

    const ux = Math.cos(ang), uz = Math.sin(ang);
    const toWorld = (u: number, v: number, y: number) => [cx + u * ux - v * uz, y, cz + u * uz + v * ux];
    const { hw, hd, rl, rows, cols, gamma, pow } = hipShape(w, d, flare, hips, ridgeCol, segs, ridge);
    const planes = buildClipPlanes(clip, hw, hd);
    const toLocal = (pt: number[]) => { const dx = pt[0] - cx, dz = pt[2] - cz; return [dx * ux + dz * uz, -dx * uz + dz * ux]; };
    const outsideDist = (pt: number[]) => {
      const [u, v] = toLocal(pt);
      let maxVal = -Infinity;
      for (const [pa, pb, pk] of planes) maxVal = Math.max(maxVal, pa * u + pb * v - pk);
      return maxVal;
    };

    const emitClippedPoly = (pts: number[][], faceCol: number[], hint: number[]) => {
      if (!planes.length) { this.quad(pts[0], pts[1], pts[2], pts[3], faceCol, hint); return; }
      let clipped = pts;
      for (const [pa, pb, pk] of planes) {
        const nextPoly: number[][] = [];
        for (let idx = 0; idx < clipped.length; idx++) {
          const p0 = clipped[idx], p1 = clipped[(idx + 1) % clipped.length];
          const l0 = toLocal(p0), l1 = toLocal(p1);
          const d0 = pa * l0[0] + pb * l0[1] - pk;
          const d1 = pa * l1[0] + pb * l1[1] - pk;
          if (d0 <= 0) nextPoly.push(p0);
          if ((d0 < 0 && d1 > 0) || (d0 > 0 && d1 < 0)) nextPoly.push(lerpPoint3(p0, p1, d0 / (d0 - d1)));
        }
        clipped = nextPoly;
        if (clipped.length < 3) return;
      }
      for (let idx = 1; idx + 1 < clipped.length; idx++) this.tri(clipped[0], clipped[idx], clipped[idx + 1], faceCol, hint);
    };

    const clipSegment = (p0: number[], p1: number[]) => {
      let t0 = 0, t1 = 1;
      const l0 = toLocal(p0), l1 = toLocal(p1);
      for (const [pa, pb, pk] of planes) {
        const d0 = pa * l0[0] + pb * l0[1] - pk;
        const d1 = pa * l1[0] + pb * l1[1] - pk;
        if (d0 > 0 && d1 > 0) return null;
        if (d0 > 0) t0 = Math.max(t0, d0 / (d0 - d1));
        else if (d1 > 0) t1 = Math.min(t1, d0 / (d0 - d1));
      }
      return t1 - t0 > 1e-4 ? [lerpPoint3(p0, p1, t0), lerpPoint3(p0, p1, t1)] : null;
    };

    const eaveCorners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
    const ridgeEnds = [[-rl, 0], [rl, 0]];
    const ridgeOfSide = [0, 1, 1, 0];
    const cornerClipped = eaveCorners.map(([u, v]) => planes.some(([pa, pb, pk]) => pa * u + pb * v - pk > 1e-6));
    const cornerLift = (side: number, frac: number) => (flare > 0 && !cornerClipped[frac < 0.5 ? side : (side + 1) % 4] ? Math.abs(2 * frac - 1) ** pow : 0);
    const sideHints = [toWorld(0, -1, 0.9), toWorld(1, 0, 0.9), toWorld(0, 1, 0.9), toWorld(-1, 0, 0.9)].map((pt) => [pt[0] - cx, 0.9, pt[2] - cz]);

    const slopeAt = (side: number, fracS: number, fracT: number) => {
      const next = (side + 1) % 4;
      const e0 = eaveCorners[side], e1 = eaveCorners[next];
      const r0 = ridgeEnds[ridgeOfSide[side]], r1 = ridgeEnds[ridgeOfSide[next]];
      const eu = e0[0] + (e1[0] - e0[0]) * fracS, ev = e0[1] + (e1[1] - e0[1]) * fracS;
      const ru = r0[0] + (r1[0] - r0[0]) * fracS, rv = r0[1] + (r1[1] - r0[1]) * fracS;
      const y = y0 + h * fracT ** gamma + flare * cornerLift(side, fracS) * (1 - fracT) ** 2;
      return toWorld(eu + (ru - eu) * fracT, ev + (rv - ev) * fracT, y);
    };

    const slopeStart = this.n;
    for (let side = 0; side < 4; side++) {
      const grid: number[][][] = [];
      for (let row = 0; row <= rows; row++) {
        const line: number[][] = [];
        for (let colIdx = 0; colIdx <= cols; colIdx++) line.push(slopeAt(side, colIdx / cols, row / rows));
        grid.push(line);
      }
      for (let row = 0; row < rows; row++) {
        for (let colIdx = 0; colIdx < cols; colIdx++) {
          emitClippedPoly([grid[row][colIdx], grid[row][colIdx + 1], grid[row + 1][colIdx + 1], grid[row + 1][colIdx]], col, sideHints[side]);
        }
      }
    }
    const slopeEnd = this.n;

    this.kind = KIND.PLAIN;
    const resolvedFasciaCol = fasciaCol || shade(col, 0.7);
    if (fascia > 0) {
      for (let side = 0; side < 4; side++) {
        for (let colIdx = 0; colIdx < cols; colIdx++) {
          const p0 = slopeAt(side, colIdx / cols, 0);
          const p1 = slopeAt(side, (colIdx + 1) / cols, 0);
          emitClippedPoly([[p0[0], p0[1] - fascia, p0[2]], [p1[0], p1[1] - fascia, p1[2]], p1, p0], resolvedFasciaCol, sideHints[side]);
        }
      }
    }
    if (flare > 0 && over > 0.3 && (fascia > 0 || over >= 0.8)) {
      const soffitCol = shade(resolvedFasciaCol, 0.45);
      const innerW = wallW / 2, innerD = wallD / 2;
      const innerCorners = [[-innerW, -innerD], [innerW, -innerD], [innerW, innerD], [-innerW, innerD]];
      for (let side = 0; side < 4; side++) {
        const next = (side + 1) % 4;
        for (let colIdx = 0; colIdx < cols; colIdx++) {
          const frac0 = colIdx / cols, frac1 = (colIdx + 1) / cols;
          const p0 = slopeAt(side, frac0, 0), p1 = slopeAt(side, frac1, 0);
          const in0 = toWorld(innerCorners[side][0] + (innerCorners[next][0] - innerCorners[side][0]) * frac0, innerCorners[side][1] + (innerCorners[next][1] - innerCorners[side][1]) * frac0, y0);
          const in1 = toWorld(innerCorners[side][0] + (innerCorners[next][0] - innerCorners[side][0]) * frac1, innerCorners[side][1] + (innerCorners[next][1] - innerCorners[side][1]) * frac1, y0);
          emitClippedPoly([[p0[0], p0[1] - fascia, p0[2]], [p1[0], p1[1] - fascia, p1[2]], in1, in0], soffitCol, [0, -1, 0]);
        }
      }
    } else if (fascia > 0) {
      const lowCorners = eaveCorners.map(([u, v]) => toWorld(u, v, y0 - fascia));
      emitClippedPoly([lowCorners[0], lowCorners[1], lowCorners[2], lowCorners[3]], shade(resolvedFasciaCol, 0.8), [0, -1, 0]);
    }

    if (ridgeCol) {
      const thick = Math.max(0.3, Math.min(0.6, d * 0.035));
      const r0 = toWorld(ridgeEnds[0][0], 0, y0 + h + thick * 0.3);
      const r1 = toWorld(ridgeEnds[1][0], 0, y0 + h + thick * 0.3);
      const clippedRidge = rl > 0.3 ? clipSegment(r0, r1) : null;
      if (clippedRidge) {
        this.beam(clippedRidge[0], clippedRidge[1], thick, thick * 1.3, ridgeCol);
        if (rows >= 3) {
          for (const [endPt, sign] of [[r0, -1], [r1, 1]] as [number[], number][]) {
            if (outsideDist(endPt) > 1e-6) continue;
            const curlTip = [endPt[0] + ux * sign * thick * 1.3, endPt[1] + thick * 0.75, endPt[2] + uz * sign * thick * 1.3];
            this.beam([endPt[0] - ux * sign * thick * 0.4, endPt[1], endPt[2] - uz * sign * thick * 0.4], curlTip, thick * 0.9, thick * 1.1, ridgeCol);
          }
        }
      }
      if (hips) {
        for (let side = 0; side < 4; side++) {
          let prevPt: number[] | null = null;
          for (let row = rows; row >= 0; row--) {
            const pt = slopeAt(side, 0, row / rows);
            const raised = [pt[0], pt[1] + thick * (row === rows ? 0.3 : 0.45), pt[2]];
            if (prevPt) {
              const segPts = planes.length ? clipSegment(prevPt, raised) : [prevPt, raised];
              if (segPts) this.beam(segPts[0], segPts[1], thick * 0.8, thick, ridgeCol);
            }
            prevPt = raised;
          }
          if (cornerClipped[side] || !prevPt) continue;
          const ox = prevPt[0] - cx, oz = prevPt[2] - cz;
          const diagLen = Math.hypot(ox, oz) || 1;
          const dx = ox / diagLen, dz = oz / diagLen;
          if (horns ?? (flare > 0 && rows >= 3)) {
            const midPt = [prevPt[0] + dx * thick * 1.6, prevPt[1] + thick * 0.8, prevPt[2] + dz * thick * 1.6];
            const tipPt = [midPt[0] + dx * thick * 1.1, midPt[1] + thick * 1.9, midPt[2] + dz * thick * 1.1];
            this.beam(prevPt, midPt, thick * 0.7, thick * 0.85, ridgeCol);
            this.beam(midPt, tipPt, thick * 0.5, thick * 0.6, ridgeCol);
          } else if (tip > 0) {
            this.beam(prevPt, [prevPt[0] + dx * thick * 2.2 * tip, prevPt[1] + thick * 1.9 * tip, prevPt[2] + dz * thick * 2.2 * tip], thick * 0.6, thick * 0.7, ridgeCol);
          }
        }
      }
    }

    if (Buf.roofLog) {
      const edgePts: number[][] = [];
      const hipPts: number[][] = [];
      for (let side = 0; side < 4; side++) {
        const edgeLen = Math.hypot(eaveCorners[(side + 1) % 4][0] - eaveCorners[side][0], eaveCorners[(side + 1) % 4][1] - eaveCorners[side][1]);
        const steps = Math.max(2, Math.ceil(edgeLen / 0.4));
        for (let k = 0; k <= steps; k++) { const pt = slopeAt(side, k / steps, 0); if (!(outsideDist(pt) > 1e-6)) edgePts.push(pt); }
        for (let k = 0; k <= 12; k++) { const pt = slopeAt(side, 0, k / 12); if (!(outsideDist(pt) > 1e-6)) hipPts.push(pt); }
      }
      Buf.roofLog.push({ buf: this, range: [slopeStart, slopeEnd], edge: edgePts, hips: hipPts, top: y0 + h, site: opts._site || roofSite(), spec: { cx, cz, w: wallW, d: wallD, ang, y0, h, over, clip } });
    }
    this.kind = prevKind;
  }

  cyl(cx: number, cz: number, y0: number, y1: number, r0: number, r1: number, segs: number, col: number[], { cap = true, rot = 0 } = {}) {
    for (let i = 0; i < segs; i++) {
      const a0 = rot + (i / segs) * Math.PI * 2;
      const a1 = rot + ((i + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const hint = [c0 + c1, 0.1, s0 + s1];
      this.quad([cx + c0 * r0, y0, cz + s0 * r0], [cx + c1 * r0, y0, cz + s1 * r0], [cx + c1 * r1, y1, cz + s1 * r1], [cx + c0 * r1, y1, cz + s0 * r1], col, hint);
      if (cap && r1 > 0.01) this.tri([cx, y1, cz], [cx + c0 * r1, y1, cz + s0 * r1], [cx + c1 * r1, y1, cz + s1 * r1], col, [0, 1, 0]);
    }
  }

  geometry() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos.slice(0, this.n * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(this.nrm.slice(0, this.n * 3), 3, true));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col.slice(0, this.n * 3), 3, true));
    geo.setAttribute('aKind', new THREE.BufferAttribute(this.knd.slice(0, this.n), 1));
    geo.setAttribute('aBase', new THREE.BufferAttribute(this.bas.slice(0, this.n), 1));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }
}

export function signedArea(ring: number[][]) {
  let area2 = 0;
  for (let i = 0, len = ring.length; i < len; i++) {
    const p0 = ring[i], p1 = ring[(i + 1) % len];
    area2 += p0[0] * p1[1] - p1[0] * p0[1];
  }
  return area2 / 2;
}

export function ringCentre(ring: number[][]): [number, number] {
  let sumX = 0, sumZ = 0;
  for (const pt of ring) { sumX += pt[0]; sumZ += pt[1]; }
  return [sumX / ring.length, sumZ / ring.length];
}

// flat decimetre int array → [[x,z],...] in metres
export function unflat(flat: number[]): [number, number][] {
  const out: [number, number][] = new Array(flat.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = [flat[i * 2] / DECIMETRES_PER_METRE, flat[i * 2 + 1] / DECIMETRES_PER_METRE];
  return out;
}

export function obb(points: number[][]) {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross2d = (orig: number[], a: number[], b: number[]) => (a[0] - orig[0]) * (b[1] - orig[1]) - (a[1] - orig[1]) * (b[0] - orig[0]);
  const lower: number[][] = [];
  for (const pt of sorted) { while (lower.length >= 2 && cross2d(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop(); lower.push(pt); }
  const upper: number[][] = [];
  for (let i = sorted.length - 1; i >= 0; i--) { const pt = sorted[i]; while (upper.length >= 2 && cross2d(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop(); upper.push(pt); }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  let best: any = null;
  for (let i = 0; i < hull.length; i++) {
    const p0 = hull[i], p1 = hull[(i + 1) % hull.length];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (len < 1e-6) continue;
    const ux = (p1[0] - p0[0]) / len, uz = (p1[1] - p0[1]) / len;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const pt of hull) {
      const u = pt[0] * ux + pt[1] * uz, v = -pt[0] * uz + pt[1] * ux;
      if (u < minU) minU = u; if (u > maxU) maxU = u; if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
    const area = (maxU - minU) * (maxV - minV);
    if (!best || area < best.area) {
      const cu = (minU + maxU) / 2, cv = (minV + maxV) / 2;
      let width = maxU - minU, depth = maxV - minV, ang = Math.atan2(uz, ux);
      if (depth > width) { [width, depth] = [depth, width]; ang += Math.PI / 2; }
      best = { area, c: [cu * ux - cv * uz, cu * uz + cv * ux], w: width, d: depth, a: ang };
    }
  }
  return best;
}

export const inRing = (x: number, z: number, ring: number[][]): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const p0 = ring[i], p1 = ring[j];
    if ((p0[1] > z) !== (p1[1] > z) && x < ((p1[0] - p0[0]) * (z - p0[1])) / (p1[1] - p0[1]) + p0[0]) inside = !inside;
  }
  return inside;
};

// inRing for one ring tested many times: its edges are bucketed by the horizontal band of z they span, so a test
// crosses only the edges of its own band. Same answer as inRing (same crossing rule, same edges for that z).
export function ringTest(ring: number[][], band = 8): (x: number, z: number) => boolean {
  const n = ring.length;
  if (n < 3) return () => false;
  let z0 = Infinity, z1 = -Infinity;
  for (const pt of ring) { z0 = Math.min(z0, pt[1]); z1 = Math.max(z1, pt[1]); }
  const bands = Math.max(1, Math.ceil((z1 - z0) / band) + 1);
  const buckets: number[][] = Array.from({ length: bands }, () => []);
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const za = ring[i][1], zb = ring[j][1];
    if (za === zb) continue; // never crossed: (p0.z > z) !== (p1.z > z) is false for a flat edge
    const b0 = Math.floor((Math.min(za, zb) - z0) / band), b1 = Math.floor((Math.max(za, zb) - z0) / band);
    for (let b = b0; b <= b1; b++) buckets[b].push(i, j);
  }
  return (x: number, z: number) => {
    if (z < z0 || z > z1) return false;
    const edges = buckets[Math.floor((z - z0) / band)];
    let inside = false;
    for (let k = 0; k < edges.length; k += 2) {
      const p0 = ring[edges[k]], p1 = ring[edges[k + 1]];
      if ((p0[1] > z) !== (p1[1] > z) && x < ((p1[0] - p0[0]) * (z - p0[1])) / (p1[1] - p0[1]) + p0[0]) inside = !inside;
    }
    return inside;
  };
}

export function distToSegment(x: number, z: number, ptA: number[], ptB: number[]): number {
  const dx = ptB[0] - ptA[0], dz = ptB[1] - ptA[1], lenSq = dx * dx + dz * dz;
  const proj = lenSq ? Math.max(0, Math.min(1, ((x - ptA[0]) * dx + (z - ptA[1]) * dz) / lenSq)) : 0;
  return Math.hypot(x - ptA[0] - dx * proj, z - ptA[1] - dz * proj);
}

export function pathLength(pts: number[][]) {
  let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return total;
}

export function chunked<T extends { x: number; z: number }>(items: T[], size = DEFAULT_CHUNK_SIZE_M) {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = `${Math.floor(item.x / size)},${Math.floor(item.z / size)}`;
    let list = buckets.get(key);
    if (!list) buckets.set(key, (list = []));
    list.push(item);
  }
  return buckets.values();
}

export const rand = (idx: number, salt = 0) => {
  let hash = ((idx + 1) * 2654435761 + salt * 40503) >>> 0;
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2246822519) >>> 0;
  hash ^= hash >>> 13;
  return (hash >>> 0) / 4294967296;
};

export const pick = (arr: any[], idx: number, salt = 0): any => arr[Math.floor(rand(idx, salt) * arr.length) % arr.length];

function roofSite() {
  return (new Error().stack || '')
    .split('\n')
    .slice(3, 5)
    .map((line) => (line.match(/([\w.-]+\.(?:m?js|ts)):(\d+)/) || []).slice(1).join(':'))
    .filter(Boolean)
    .join(' < ');
}

export function hipShape(width: number, depth: number, flare = 0, hips = false, ridgeCol: any = null, segs: number | null = null, ridge: number | null = null) {
  const hw = width / 2, hd = depth / 2;
  const rl = ridge == null ? Math.max(0, hw - hd * 0.92) : Math.max(0, Math.min(0.95, ridge)) * hw;
  const rows = Math.max(1, Math.round(segs ?? (flare > 0 && hips && ridgeCol ? 2 : 1)));
  const cols = flare > 0 ? (rows <= 2 ? 2 : rows + 2) : 1;
  const gamma = flare > 0 && rows > 1 ? 1 + Math.min(0.8, flare * 1.25) : 1;
  return { hw, hd, rl, rows, cols, gamma, pow: cols > 2 ? 2.2 : 1 };
}

function findNearbyRoofs(frames: any[]) {
  const grid = new Map<number, number[]>();
  const cellKey = (gx: number, gz: number) => gx * 65537 + gz;
  frames.forEach((roof, idx) => {
    for (let gx = Math.floor((roof.cx - roof.R) / ROOF_JOIN_GRID_M); gx <= Math.floor((roof.cx + roof.R) / ROOF_JOIN_GRID_M); gx++) {
      for (let gz = Math.floor((roof.cz - roof.R) / ROOF_JOIN_GRID_M); gz <= Math.floor((roof.cz + roof.R) / ROOF_JOIN_GRID_M); gz++) {
        const key = cellKey(gx, gz);
        const list = grid.get(key) || [];
        if (!grid.has(key)) grid.set(key, list);
        list.push(idx);
      }
    }
  });
  return frames.map((roof, idx) => {
    const found = new Set<number>();
    for (let gx = Math.floor((roof.cx - roof.R) / ROOF_JOIN_GRID_M); gx <= Math.floor((roof.cx + roof.R) / ROOF_JOIN_GRID_M); gx++) {
      for (let gz = Math.floor((roof.cz - roof.R) / ROOF_JOIN_GRID_M); gz <= Math.floor((roof.cz + roof.R) / ROOF_JOIN_GRID_M); gz++) {
        for (const other of grid.get(cellKey(gx, gz)) || []) {
          if (other !== idx && Math.hypot(frames[other].cx - roof.cx, frames[other].cz - roof.cz) <= roof.R + frames[other].R) found.add(other);
        }
      }
    }
    return [...found].sort((a, b) => a - b);
  });
}

export function joinRoofs(roofs: any[]) {
  const count = roofs.length;
  const clips = roofs.map((roof) => (roof.clip ? { ...roof.clip } : null));
  const gutters: any[] = [];
  const frames = roofs.map((roof) => {
    const ux = Math.cos(roof.ang), uz = Math.sin(roof.ang), over = roof.over || 0;
    const shape = hipShape(roof.w + over * 2, roof.d + over * 2, roof.flare || 0, !!roof.hips, roof.ridgeCol || null, roof.segs ?? null, roof.opts?.ridge ?? roof.ridge ?? null);
    return { ...roof, over, ux, uz, sh: shape, R: Math.hypot(roof.w, roof.d) / 2 + over };
  });

  const cutEdge = (roof: any, axis: number, dist: number) => {
    const { hw, hd, rl, gamma } = roof.sh;
    const t = axis === 0 ? Math.min(1, Math.max(0, (hw - dist) / Math.max(1e-6, hw - rl))) : Math.min(1, Math.max(0, (hd - dist) / hd));
    return { y: roof.y0 + roof.h * t ** gamma, half: axis === 0 ? hd * (1 - t) : hw - (hw - rl) * t };
  };
  const setClip = (idx: number, key: string, val: number, isLower: boolean) => {
    const clip = clips[idx] || (clips[idx] = {});
    clip[key] = clip[key] === undefined ? val : isLower ? Math.max(clip[key], val) : Math.min(clip[key], val);
  };
  const isUpperTierOf = (upper: any, lower: any) => {
    const dx = upper.cx - lower.cx, dz = upper.cz - lower.cz;
    const u = dx * lower.ux + dz * lower.uz, v = -dx * lower.uz + dz * lower.ux;
    const parallel = Math.abs(upper.ux * lower.ux + upper.uz * lower.uz) > 0.7;
    const halfW = (parallel ? upper.w : upper.d) / 2, halfD = (parallel ? upper.d : upper.w) / 2;
    return upper.y0 > lower.y0 + 0.3 && Math.abs(u) + halfW <= lower.w / 2 + 0.3 && Math.abs(v) + halfD <= lower.d / 2 + 0.3;
  };

  const nearby = findNearbyRoofs(frames);
  const isUpperTier = frames.map((roof, idx) => nearby[idx].some((otherIdx) => isUpperTierOf(roof, frames[otherIdx])));

  for (let i = 0; i < count; i++) {
    for (const j of nearby[i]) {
      if (j <= i || isUpperTier[i] || isUpperTier[j]) continue;
      const roofA = frames[i], roofB = frames[j];
      let deltaAng = (roofB.ang - roofA.ang) % (Math.PI / 2);
      if (deltaAng > Math.PI / 4) deltaAng -= Math.PI / 2;
      else if (deltaAng < -Math.PI / 4) deltaAng += Math.PI / 2;
      if (Math.abs(deltaAng) > ROOF_ANGLE_TOL_RAD) continue;
      if (Math.min(roofA.y0 + roofA.h, roofB.y0 + roofB.h) < Math.max(roofA.y0, roofB.y0) - ROOF_HEIGHT_OVERLAP_MARGIN_M) continue;

      const dx = roofB.cx - roofA.cx, dz = roofB.cz - roofA.cz;
      const bInA = [dx * roofA.ux + dz * roofA.uz, -dx * roofA.uz + dz * roofA.ux];
      const parallel = Math.abs(roofB.ux * roofA.ux + roofB.uz * roofA.uz) > 0.7;
      const halfB = parallel ? [roofB.w / 2, roofB.d / 2] : [roofB.d / 2, roofB.w / 2];
      const halfA = [roofA.w / 2, roofA.d / 2];

      let bestJoin: { axis: number; gap: number } | null = null;
      for (const axis of [0, 1]) {
        const ortho = 1 - axis;
        const gap = Math.abs(bInA[axis]) - halfA[axis] - halfB[axis];
        const alongOverlap = Math.min(halfA[ortho], bInA[ortho] + halfB[ortho]) - Math.max(-halfA[ortho], bInA[ortho] - halfB[ortho]);
        if (gap > ROOF_WALL_OVERLAP_MAX_M && gap < roofA.over + roofB.over && alongOverlap > ROOF_MIN_ALONG_OVERLAP_M && (!bestJoin || gap > bestJoin.gap)) {
          bestJoin = { axis, gap };
        }
      }
      if (!bestJoin) continue;

      const { axis } = bestJoin;
      const sign = Math.sign(bInA[axis]) || 1;
      const cutA = sign * (halfA[axis] + bestJoin.gap / 2);
      setClip(i, axis === 0 ? (sign > 0 ? 'u1' : 'u0') : sign > 0 ? 'v1' : 'v0', cutA, sign < 0);

      const normA = axis === 0 ? [roofA.ux, roofA.uz] : [-roofA.uz, roofA.ux];
      const px = roofA.cx + normA[0] * cutA, pz = roofA.cz + normA[1] * cutA;
      const axisB = parallel ? axis : 1 - axis;
      const normB = axisB === 0 ? [roofB.ux, roofB.uz] : [-roofB.uz, roofB.ux];
      const dot = (normA[0] * normB[0] + normA[1] * normB[1]) * sign;
      const cutB = (px - roofB.cx) * normB[0] + (pz - roofB.cz) * normB[1];
      setClip(j, axisB === 0 ? (dot > 0 ? 'u0' : 'u1') : dot > 0 ? 'v0' : 'v1', cutB, dot > 0);

      const edgeA = cutEdge(roofA, axis, Math.abs(cutA));
      const edgeB = cutEdge(roofB, axisB, Math.abs(cutB));
      const tanA = [-normA[1], normA[0]];
      const centerA = (roofA.cx - px) * tanA[0] + (roofA.cz - pz) * tanA[1];
      const centerB = (roofB.cx - px) * tanA[0] + (roofB.cz - pz) * tanA[1];
      const lo = Math.max(centerA - edgeA.half, centerB - edgeB.half);
      const hi = Math.min(centerA + edgeA.half, centerB + edgeB.half);
      if (hi - lo > GUTTER_MIN_LEN_M) {
        gutters.push({
          a: [px + tanA[0] * lo, pz + tanA[1] * lo],
          b: [px + tanA[0] * hi, pz + tanA[1] * hi],
          top: Math.max(edgeA.y, edgeB.y) - 0.04,
          bottom: Math.min(edgeA.y, edgeB.y) - 0.3,
          roofs: [i, j],
        });
      }
    }
  }
  return { clips, gutters };
}

export function layGutter(buf: Buf, gutter: any, col: number[]) {
  const prevKind = buf.kind;
  buf.kind = KIND.PLAIN;
  const midY = (gutter.top + gutter.bottom) / 2;
  const height = Math.max(0.1, gutter.top - gutter.bottom);
  buf.beam([gutter.a[0], midY, gutter.a[1]], [gutter.b[0], midY, gutter.b[1]], GUTTER_WIDTH_M, height, shade(col, 0.55));
  buf.kind = prevKind;
}

export function joinedRoofs(buf: Buf, list: any[]) {
  return buf.joined(() => {
    for (const { cx, cz, w, d, ang, y0, h, col, ...opts } of list) buf.hip(cx, cz, w, d, ang, y0, h, col, opts);
  });
}
