import * as THREE from 'three';

// Growable flat-shaded triangle soup with per-vertex colour. Everything static in
// the scene (buildings, walls, landmarks) is baked through this into a handful of meshes.
export const hex = (h) => {
  const c = new THREE.Color(h);
  return [c.r, c.g, c.b];
};
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

// What a face is made of. The fragment shader paints the matching surface detail
// (window bays, roof tiles, brick courses…) so geometry stays light.
export const KIND = { PLAIN: 0, FACADE: 1, TILE: 2, FLAT: 3, MASONRY: 4, GROUND: 5, ROAD: 6, TIMBER: 7, CIVIC: 8, GLAZED: 9, COLONIAL: 10, MODERN: 11 };

// When a piece of the model exists: from era `since` through era `until` (0 Nguyễn, 1 French period, 2 today).
// Encoded so that 0 means "always", which is also what geometry without the attribute reads as.
export const span = (since = 0, until = 2) => since * 4 + (2 - until);

export class Buf {
  constructor(tris = 4096) {
    this.cap = tris * 3;
    this.n = 0;
    this.kind = KIND.PLAIN; // applied to faces added from now on
    this.base = 0; // floor level of what is being built, in metres above the flat city datum (for slopes)
    this.span = 0; // which eras the faces added from now on exist in (see span())
    this.pos = new Float32Array(this.cap * 3);
    this.nrm = new Int8Array(this.cap * 3);
    this.col = new Uint8Array(this.cap * 3);
    this.knd = new Uint8Array(this.cap);
    this.bas = new Float32Array(this.cap);
    this.spn = new Uint8Array(this.cap);
  }
  grow() {
    this.cap *= 2;
    const p = new Float32Array(this.cap * 3); p.set(this.pos); this.pos = p;
    const n = new Int8Array(this.cap * 3); n.set(this.nrm); this.nrm = n;
    const c = new Uint8Array(this.cap * 3); c.set(this.col); this.col = c;
    const k = new Uint8Array(this.cap); k.set(this.knd); this.knd = k;
    const bb = new Float32Array(this.cap); bb.set(this.bas); this.bas = bb;
    const sp = new Uint8Array(this.cap); sp.set(this.spn); this.spn = sp;
  }
  // Smooth-shaded triangle with explicit per-vertex normals and colours (used for foliage).
  smoothTri(v, nrm, cols) {
    if (this.n + 3 > this.cap) this.grow();
    let i = this.n * 3;
    for (let k = 0; k < 3; k++) {
      const l = Math.hypot(nrm[k][0], nrm[k][1], nrm[k][2]) || 1;
      this.pos[i] = v[k][0]; this.pos[i + 1] = v[k][1]; this.pos[i + 2] = v[k][2];
      this.nrm[i] = (nrm[k][0] / l) * 127; this.nrm[i + 1] = (nrm[k][1] / l) * 127; this.nrm[i + 2] = (nrm[k][2] / l) * 127;
      for (let c = 0; c < 3; c++) this.col[i + c] = Math.max(0, Math.min(255, Math.round(Math.sqrt(cols[k][c]) * 255)));
      this.knd[this.n + k] = this.kind;
      this.bas[this.n + k] = this.base;
      this.spn[this.n + k] = this.span;
      i += 3;
    }
    this.n += 3;
  }
  // a, b, c: [x,y,z]. hint: rough outward direction; winding is fixed to match it.
  tri(a, b, c, col, hint) {
    if (this.n + 3 > this.cap) this.grow();
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    let vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-9) return;
    nx /= l; ny /= l; nz /= l;
    if (hint && nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) {
      const t = b; b = c; c = t;
      nx = -nx; ny = -ny; nz = -nz;
    }
    let i = this.n * 3;
    const P = this.pos, N = this.nrm, C = this.col;
    const r = Math.max(0, Math.min(255, Math.round(Math.sqrt(col[0]) * 255)));
    const g = Math.max(0, Math.min(255, Math.round(Math.sqrt(col[1]) * 255)));
    const bl = Math.max(0, Math.min(255, Math.round(Math.sqrt(col[2]) * 255)));
    for (const v of [a, b, c]) {
      P[i] = v[0]; P[i + 1] = v[1]; P[i + 2] = v[2];
      N[i] = nx * 127; N[i + 1] = ny * 127; N[i + 2] = nz * 127;
      C[i] = r; C[i + 1] = g; C[i + 2] = bl;
      i += 3;
    }
    this.knd[this.n] = this.knd[this.n + 1] = this.knd[this.n + 2] = this.kind;
    this.bas[this.n] = this.bas[this.n + 1] = this.bas[this.n + 2] = this.base;
    this.spn[this.n] = this.spn[this.n + 1] = this.spn[this.n + 2] = this.span;
    this.n += 3;
  }
  quad(a, b, c, d, col, hint) {
    this.tri(a, b, c, col, hint);
    this.tri(a, c, d, col, hint);
  }

  // Box rotated about Y. (cx,cz) centre, y0..y1, sx along local x, sz along local z.
  box(cx, cz, y0, y1, sx, sz, ang, col, { top = col, bottom = false, taper = 1, topKind = null } = {}) {
    const ux = Math.cos(ang), uz = Math.sin(ang);
    const P = (u, v, y, k = 1) => [cx + u * k * ux - v * k * uz, y, cz + u * k * uz + v * k * ux];
    const hx = sx / 2, hz = sz / 2;
    const b = [P(-hx, -hz, y0), P(hx, -hz, y0), P(hx, hz, y0), P(-hx, hz, y0)];
    const t = [P(-hx, -hz, y1, taper), P(hx, -hz, y1, taper), P(hx, hz, y1, taper), P(-hx, hz, y1, taper)];
    const mid = [cx, (y0 + y1) / 2, cz];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const m = [(b[i][0] + b[j][0]) / 2 - mid[0], 0.2, (b[i][2] + b[j][2]) / 2 - mid[2]];
      this.quad(b[i], b[j], t[j], t[i], col, m);
    }
    const k = this.kind;
    if (topKind !== null) this.kind = topKind;
    this.quad(t[0], t[1], t[2], t[3], top, [0, 1, 0]);
    this.kind = k;
    if (bottom) this.quad(b[0], b[1], b[2], b[3], col, [0, -1, 0]);
  }

  // Free 3D beam from a to b with a w × h cross-section.
  beam(a, b, w, h, col) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-6) return;
    const d = [dx / len, dy / len, dz / len];
    let up = Math.abs(d[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    // side = d × up, up' = side × d
    let s = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]];
    const sl = Math.hypot(...s); s = s.map((v) => v / sl);
    const u = [s[1] * d[2] - s[2] * d[1], s[2] * d[0] - s[0] * d[2], s[0] * d[1] - s[1] * d[0]];
    const corner = (p, i, j) => [p[0] + s[0] * i * w / 2 + u[0] * j * h / 2, p[1] + s[1] * i * w / 2 + u[1] * j * h / 2, p[2] + s[2] * i * w / 2 + u[2] * j * h / 2];
    const A = [corner(a, -1, -1), corner(a, 1, -1), corner(a, 1, 1), corner(a, -1, 1)];
    const B = [corner(b, -1, -1), corner(b, 1, -1), corner(b, 1, 1), corner(b, -1, 1)];
    const hints = [[-u[0], -u[1], -u[2]], s, u, [-s[0], -s[1], -s[2]]];
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; this.quad(A[i], A[j], B[j], B[i], col, hints[i]); }
    this.quad(A[0], A[1], A[2], A[3], col, [-d[0], -d[1], -d[2]]);
    this.quad(B[0], B[1], B[2], B[3], col, d);
  }

  // Extrude a ring ([[x,z],...], any winding) from y0 to y1. holes: array of rings.
  prism(ring, y0, y1, wallCol, topCol = wallCol, { holes = [], top = true, scaleTop = 1, centre = null, topKind = null, parapet = 0 } = {}) {
    const all = [ring, ...holes];
    const c = centre || ringCentre(ring);
    const up = (p) => (scaleTop === 1 ? p : [c[0] + (p[0] - c[0]) * scaleTop, c[1] + (p[1] - c[1]) * scaleTop]);
    all.forEach((r, ri) => {
      const s = signedArea(r) > 0 ? 1 : -1;
      const out = ri === 0 ? s : -s;
      for (let i = 0, n = r.length; i < n; i++) {
        const a = r[i], b = r[(i + 1) % n];
        const tx = b[0] - a[0], tz = b[1] - a[1];
        if (tx * tx + tz * tz < 1e-6) continue;
        const ta = up(a), tb = up(b);
        this.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [tb[0], y1 + parapet, tb[1]], [ta[0], y1 + parapet, ta[1]], wallCol, [tz * out, 0.001, -tx * out]);
        // inner face of the parapet, so flat roofs read as a tray rather than a lid
        if (parapet) this.quad([ta[0], y1, ta[1]], [tb[0], y1, tb[1]], [tb[0], y1 + parapet, tb[1]], [ta[0], y1 + parapet, ta[1]], [wallCol[0] * 0.72, wallCol[1] * 0.72, wallCol[2] * 0.72], [-tz * out, 0.001, tx * out]);
      }
    });
    const keep = this.kind;
    if (topKind !== null) this.kind = topKind;
    if (top) {
      const contour = ring.map((p) => { const q = up(p); return new THREE.Vector2(q[0], q[1]); });
      const hs = holes.map((h) => h.map((p) => { const q = up(p); return new THREE.Vector2(q[0], q[1]); }));
      const faces = THREE.ShapeUtils.triangulateShape(contour, hs);
      const pts = contour.concat(...hs);
      for (const f of faces) {
        const a = pts[f[0]], b = pts[f[1]], d = pts[f[2]];
        this.tri([a.x, y1, a.y], [b.x, y1, b.y], [d.x, y1, d.y], topCol, [0, 1, 0]);
      }
    }
    this.kind = keep;
  }

  // Hip roof on an oriented rectangle. w = long side (along ang), d = short side.
  // flare > 0 gives the swept, upturned-eave profile of Vietnamese palace roofs.
  hip(cx, cz, w, d, ang, y0, h, col, { flare = 0, over = 0, ridgeCol = null, fascia = 0, fasciaCol = null, hips = false, glazed = false } = {}) {
    w += over * 2; d += over * 2;
    const keep = this.kind;
    this.kind = glazed ? KIND.GLAZED : KIND.TILE;
    const ux = Math.cos(ang), uz = Math.sin(ang);
    const P = (u, v, y) => [cx + u * ux - v * uz, y, cz + u * uz + v * ux];
    const hw = w / 2, hd = d / 2;
    const rl = Math.max(0, hw - hd * 0.92); // half ridge length
    const eave = [P(-hw, -hd, y0 + flare), P(hw, -hd, y0 + flare), P(hw, hd, y0 + flare), P(-hw, hd, y0 + flare)];
    const ridge = [P(-rl, 0, y0 + h), P(rl, 0, y0 + h)];
    const rOf = [0, 1, 1, 0];
    const hintOf = [P(0, -1, 0.9), P(1, 0, 0.9), P(0, 1, 0.9), P(-1, 0, 0.9)].map((p) => [p[0] - cx, 0.9, p[2] - cz]);
    if (flare > 0) {
      // lower, shallower skirt + steeper upper roof
      const t = 0.5;
      const midp = eave.map((e, i) => {
        const r = ridge[rOf[i]];
        return [e[0] + (r[0] - e[0]) * t, y0 + h * 0.3, e[2] + (r[2] - e[2]) * t];
      });
      // eave corners dip in the middle of each side: emulate by lifting corners only
      const sideMid = (i, j) => [(eave[i][0] + eave[j][0]) / 2, y0, (eave[i][2] + eave[j][2]) / 2];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const m = sideMid(i, j);
        const mm = [(midp[i][0] + midp[j][0]) / 2, midp[i][1], (midp[i][2] + midp[j][2]) / 2];
        this.quad(eave[i], m, mm, midp[i], col, hintOf[i]);
        this.quad(m, eave[j], midp[j], mm, col, hintOf[i]);
        if (rOf[i] === rOf[j]) this.tri(midp[i], midp[j], ridge[rOf[i]], col, hintOf[i]);
        else this.quad(midp[i], midp[j], ridge[rOf[j]], ridge[rOf[i]], col, hintOf[i]);
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        if (rOf[i] === rOf[j]) this.tri(eave[i], eave[j], ridge[rOf[i]], col, hintOf[i]);
        else this.quad(eave[i], eave[j], ridge[rOf[j]], ridge[rOf[i]], col, hintOf[i]);
      }
    }
    this.kind = KIND.PLAIN;
    // eave thickness: a fascia band and soffit under the roof edge
    if (fascia > 0) {
      const fc = fasciaCol || [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7];
      const lo = eave.map((e) => [e[0], y0 - fascia, e[2]]);
      const hi = eave.map((e) => [e[0], y0, e[2]]);
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        this.quad(lo[i], lo[j], hi[j], hi[i], fc, hintOf[i]);
      }
      this.quad(lo[0], lo[1], lo[2], lo[3], [fc[0] * 0.8, fc[1] * 0.8, fc[2] * 0.8], [0, -1, 0]);
    }
    if (ridgeCol) {
      const t = Math.max(0.3, Math.min(0.6, d * 0.035));
      if (rl > 0.3) this.beam([ridge[0][0], y0 + h + t * 0.3, ridge[0][2]], [ridge[1][0], y0 + h + t * 0.3, ridge[1][2]], t, t * 1.3, ridgeCol);
      // the four hip ridges, ending in upturned tips at the corners
      if (hips) for (let i = 0; i < 4; i++) {
        const r = ridge[rOf[i]], e = eave[i];
        const m = [e[0] + (r[0] - e[0]) * 0.5, y0 + h * (flare > 0 ? 0.3 : 0.5) + t * 0.4, e[2] + (r[2] - e[2]) * 0.5];
        this.beam([r[0], r[1] + t * 0.3, r[2]], m, t * 0.8, t, ridgeCol);
        this.beam(m, [e[0], e[1] + t * 0.5, e[2]], t * 0.8, t, ridgeCol);
        const ox = e[0] - cx, oz = e[2] - cz, ol = Math.hypot(ox, oz) || 1;
        this.beam([e[0], e[1] + t * 0.5, e[2]], [e[0] + (ox / ol) * t * 2.2, e[1] + t * 2.4, e[2] + (oz / ol) * t * 2.2], t * 0.6, t * 0.7, ridgeCol);
      }
    }
    this.kind = keep;
  }

  cyl(cx, cz, y0, y1, r0, r1, seg, col, { cap = true, rot = 0 } = {}) {
    for (let i = 0; i < seg; i++) {
      const a0 = rot + (i / seg) * Math.PI * 2, a1 = rot + ((i + 1) / seg) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const hint = [c0 + c1, 0.1, s0 + s1];
      this.quad([cx + c0 * r0, y0, cz + s0 * r0], [cx + c1 * r0, y0, cz + s1 * r0], [cx + c1 * r1, y1, cz + s1 * r1], [cx + c0 * r1, y1, cz + s0 * r1], col, hint);
      if (cap && r1 > 0.01) this.tri([cx, y1, cz], [cx + c0 * r1, y1, cz + s0 * r1], [cx + c1 * r1, y1, cz + s1 * r1], col, [0, 1, 0]);
    }
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.slice(0, this.n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nrm.slice(0, this.n * 3), 3, true));
    g.setAttribute('color', new THREE.BufferAttribute(this.col.slice(0, this.n * 3), 3, true));
    g.setAttribute('aKind', new THREE.BufferAttribute(this.knd.slice(0, this.n), 1));
    g.setAttribute('aBase', new THREE.BufferAttribute(this.bas.slice(0, this.n), 1));
    g.setAttribute('aSpan', new THREE.BufferAttribute(Float32Array.from(this.spn.subarray(0, this.n)), 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export function signedArea(r) {
  let a = 0;
  for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}
export function ringCentre(r) {
  let x = 0, z = 0;
  for (const p of r) { x += p[0]; z += p[1]; }
  return [x / r.length, z / r.length];
}
// flat decimetre int array → [[x,z],...] in metres
export function unflat(a) {
  const o = new Array(a.length / 2);
  for (let i = 0; i < o.length; i++) o[i] = [a[i * 2] / 10, a[i * 2 + 1] / 10];
  return o;
}
export function obb(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  const h = lo.slice(0, -1).concat(up.slice(0, -1));
  let best = null;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-6) continue;
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    let mnU = Infinity, mxU = -Infinity, mnV = Infinity, mxV = -Infinity;
    for (const q of h) {
      const u = q[0] * ux + q[1] * uz, v = -q[0] * uz + q[1] * ux;
      if (u < mnU) mnU = u; if (u > mxU) mxU = u; if (v < mnV) mnV = v; if (v > mxV) mxV = v;
    }
    const area = (mxU - mnU) * (mxV - mnV);
    if (!best || area < best.area) {
      const cu = (mnU + mxU) / 2, cv = (mnV + mxV) / 2;
      let w = mxU - mnU, d = mxV - mnV, ang = Math.atan2(uz, ux);
      if (d > w) { [w, d] = [d, w]; ang += Math.PI / 2; }
      best = { area, c: [cu * ux - cv * uz, cu * uz + cv * ux], w, d, a: ang };
    }
  }
  return best;
}
