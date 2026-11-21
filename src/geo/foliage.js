import * as THREE from 'three';
import { hex, shade, chunked, rand, pick } from './buf.js';
import { cityMaterial, enc, foliageDepthMaterial, patch } from './materials.js';
import { rise } from './terrain.js';
import { LAND_Y, quality } from '../config.js';
import { lodAdd } from './lod.js';
import { inCitadel, inHills } from './districts.js';

// Trees are built the way stylised foliage usually is: leaf-cluster cards gathered into a few clumps on forked
// limbs, lit with rounded "puffball" normals so each crown shades as one soft mass, cut out by an alpha texture.
// Six kinds, after the trees one actually sees in Huế:
//   spreading  — xà cừ / bàng / banyan shade trees: a fork of three limbs under an umbrella of clumps
//   upright    — the narrower street and garden trees, clumps stacked up a leader
//   flamboyant — phượng vĩ: low, wide, layered; feathery green under crimson-orange blossom
//   willow     — liễu rủ along the river, the moat and the tomb lakes: a leaning trunk and hanging curtains
//   pine       — thông on the southern hills and at the tombs: a tall bare trunk and flat needle tiers
//   palm       — cây cau in the garden houses: a slender curved trunk and arched fronds
// All illustrative (OSM maps almost no individual trees here). Local units: ground at y ≈ −1.7, crown radius ≈ 1.


// ---------------------------------------------------------------------------------------------------------------
// Leaf atlas, 1024², greyscale (the instance and vertex colours give the hue). Canvas layout (y down):
//   [ broadleaf branchlet | flamboyant frond ]   top half
//   [ willow curtain      | palm frond | pine tuft / solid ]   bottom half (the right quarter: tuft above, solid below)
const UV = {
  broad: [0.0, 0.5, 0.5, 1.0], // u0, v0, u1, v1 (texture v is up)
  frond: [0.5, 0.5, 1.0, 1.0],
  willow: [0.0, 0.0, 0.5, 0.5],
  palm: [0.5, 0.0, 0.75, 0.5],
  pine: [0.75, 0.25, 1.0, 0.5],
};
const SOLID = [0.875, 0.11];

function leafAtlas() {
  const S = 1024, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const grey = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;
  // a pointed leaf from its base along +x: two curved edges, a lighter tip, a darker midrib
  const leaf = (x, y, ang, len, wid, v) => {
    g.save();
    g.translate(x, y); g.rotate(ang);
    const gr = g.createLinearGradient(0, 0, len, 0);
    gr.addColorStop(0, grey(v * 0.78)); gr.addColorStop(1, grey(Math.min(255, v * 1.06)));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.4, -wid, len, 0);
    g.quadraticCurveTo(len * 0.4, wid, 0, 0);
    g.fill();
    if (len > 14) { g.strokeStyle = grey(v * 0.6, 0.7); g.lineWidth = Math.max(0.8, wid * 0.14); g.beginPath(); g.moveTo(len * 0.05, 0); g.lineTo(len * 0.85, 0); g.stroke(); }
    g.restore();
  };
  // a twig that tapers along a gentle curve; returns sample points along it
  const twig = (x0, y0, ang, len, w0, bend, v = 78) => {
    const pts = [];
    let x = x0, y = y0, a = ang;
    const n = 10;
    for (let k = 0; k <= n; k++) { pts.push([x, y, a]); x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; a += bend / n; }
    g.strokeStyle = grey(v); g.lineCap = 'round';
    for (let k = 0; k < n; k++) { g.lineWidth = Math.max(0.7, w0 * (1 - k / n)); g.beginPath(); g.moveTo(pts[k][0], pts[k][1]); g.lineTo(pts[k + 1][0], pts[k + 1][1]); g.stroke(); }
    return pts;
  };

  // Q1 broadleaf branchlet cluster: twigs radiating from below centre, alternate pointed leaves with a size
  // gradient, the gaps filled with more leaves so the card reads as one rounded mass of foliage
  {
    const cx = 256, cy = 262;
    for (let i = 0; i < 70; i++) {
      // underlayer: darker, larger leaves filling the disc
      const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), 0.55) * 175;
      leaf(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92, a + (rnd() - 0.5) * 1.6, 44 + rnd() * 26, 17 + rnd() * 6, 145 + rnd() * 55);
    }
    for (let b = 0; b < 10; b++) {
      const ang = -Math.PI / 2 + (b - 4.5) * 0.4 + (rnd() - 0.5) * 0.2, len = 140 + rnd() * 60;
      const pts = twig(cx + (rnd() - 0.5) * 30, cy + 70 + rnd() * 30, ang, len, 4.5, (rnd() - 0.5) * 0.7);
      for (let k = 2; k <= 10; k++) {
        const [x, y, a] = pts[k], t = k / 10;
        for (const side of [-1, 1]) {
          const L = 30 + 26 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + rnd() * 8;
          leaf(x, y, a + side * (0.7 + rnd() * 0.4), L, L * 0.36, 165 + rnd() * 80);
        }
      }
      leaf(pts[10][0], pts[10][1], pts[10][2] + (rnd() - 0.5) * 0.3, 42, 14, 215 + rnd() * 40);
    }
    // sunlit outer leaves round the rim
    for (let i = 0; i < 70; i++) {
      const a = rnd() * Math.PI * 2, r = 120 + rnd() * 90;
      leaf(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.85, a + (rnd() - 0.5) * 1.0, 26 + rnd() * 18, 10 + rnd() * 4, 185 + rnd() * 70);
    }
  }
  // Q2 flamboyant: bipinnate fronds — a rachis, paired pinnae, tiny paired leaflets with air between them
  {
    const cx = 768, cy = 256;
    for (let f = 0; f < 7; f++) {
      const ang = (f / 7) * Math.PI * 2 + rnd() * 0.4, len = 175 + rnd() * 50;
      const pts = twig(cx, cy, ang, len, 3, (rnd() - 0.5) * 0.5, 95);
      for (let k = 1; k <= 10; k++) {
        const [x, y, a] = pts[k], t = k / 10, pl = 62 * Math.sin(Math.PI * (0.18 + 0.75 * t)) + 8;
        for (const s of [-1, 1]) {
          const pa = a + s * (1.0 - t * 0.3);
          g.strokeStyle = grey(120, 0.9); g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(pa) * pl, y + Math.sin(pa) * pl); g.stroke();
          const nl = Math.max(3, Math.round(pl / 6));
          for (let j = 1; j <= nl; j++) {
            const px = x + Math.cos(pa) * pl * (j / nl), py = y + Math.sin(pa) * pl * (j / nl), v = 170 + rnd() * 80;
            for (const s2 of [-1, 1]) leaf(px, py, pa + s2 * 1.1, 14 + rnd() * 3, 5.6, v);
          }
        }
      }
    }
  }
  // Q3 willow curtain: slender stems hanging from the top edge, lined with narrow lance leaves pointing down
  {
    const x0 = 0, y0 = 512;
    for (let s = 0; s < 17; s++) {
      const sx = x0 + 18 + s * 28.5 + (rnd() - 0.5) * 12, len = 300 + rnd() * 200;
      const pts = twig(sx, y0 + 2, Math.PI / 2 + (rnd() - 0.5) * 0.12, len, 2.4, (rnd() - 0.5) * 0.25, 105);
      for (let k = 1; k <= 10; k++) {
        const [x, y, a] = pts[k];
        for (let j = 0; j < 3; j++) {
          const t = (k - 1 + j / 3) / 10, px = x + Math.cos(a) * j * len / 30, py = y + Math.sin(a) * j * len / 30;
          for (const sd of [-1, 1]) leaf(px, py, a + sd * (0.32 + rnd() * 0.2), 22 + rnd() * 10 - t * 6, 4.6, 165 + rnd() * 80);
        }
      }
    }
  }
  // Q4a areca frond: a rib from the base (bottom) to the tip, long narrow paired leaflets drooping outward
  {
    const bx = 640, by = 1020;
    const pts = twig(bx, by, -Math.PI / 2, 490, 7, 0.0, 180);
    for (let k = 0; k < 30; k++) {
      const t = k / 30, idx = Math.min(9, Math.floor(t * 10)), f = t * 10 - idx;
      const x = pts[idx][0] + (pts[idx + 1][0] - pts[idx][0]) * f, y = pts[idx][1] + (pts[idx + 1][1] - pts[idx][1]) * f;
      const len = 105 * Math.sin(Math.PI * (0.1 + 0.85 * t)) + 14;
      for (const s of [-1, 1]) leaf(x, y, -Math.PI / 2 + s * (1.25 - t * 0.55), len, 7, 175 + rnd() * 70);
    }
  }
  // Q4b pine tier from above: bundles of needles bursting from twig tips, gathered into one flat mass
  {
    const cx = 896, cy = 640;
    g.lineCap = 'round';
    for (let b = 0; b < 26; b++) {
      const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), 0.6) * 92;
      const bx = cx + Math.cos(a) * r, by = cy + Math.sin(a) * r;
      g.strokeStyle = grey(85); g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(bx, by); g.stroke();
      for (let k = 0; k < 34; k++) {
        const na = rnd() * Math.PI * 2, nl = 16 + rnd() * 22, v = 150 + rnd() * 100;
        g.strokeStyle = grey(v); g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(na) * nl, by + Math.sin(na) * nl); g.stroke();
      }
    }
  }
  // solid block for trunks, limbs and the dark cores
  g.fillStyle = '#fff';
  g.fillRect(776, 790, 240, 226);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// ---------------------------------------------------------------------------------------------------------------
// What a vertex belongs to (the aKind attribute; materials.js reads it under HUE_FOLIAGE): wood keeps its bark colour,
// the crown takes the instance colour, and only the leaf cards carry the atlas, whose grey is brought back to 1 on average.
const PART = { WOOD: 0, CORE: 1, LEAF: 2 };
class Soup {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.k = []; }
  // v: three points, n: three normals, uv: three uvs, lum: three brightness values (linear), tint: [r,g,b], part: PART
  tri(v, n, uv, lum, tint = [1, 1, 1], part = PART.LEAF) {
    for (let k = 0; k < 3; k++) {
      this.p.push(...v[k]);
      const l = Math.hypot(...n[k]) || 1;
      this.n.push(n[k][0] / l, n[k][1] / l, n[k][2] / l);
      this.uv.push(...uv[k]);
      // colours are sqrt-encoded (the city shader squares them)
      this.c.push(Math.sqrt(lum[k] * tint[0]), Math.sqrt(lum[k] * tint[1]), Math.sqrt(lum[k] * tint[2]));
      this.k.push(part);
    }
  }
  quad(a, b, c, d, n, uvs, lum, tint, part) {
    this.tri([a, b, c], [n[0], n[1], n[2]], [uvs[0], uvs[1], uvs[2]], [lum[0], lum[1], lum[2]], tint, part);
    this.tri([a, c, d], [n[0], n[2], n[3]], [uvs[0], uvs[2], uvs[3]], [lum[0], lum[2], lum[3]], tint, part);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(this.k, 1));
    g.setAttribute('aBase', new THREE.Float32BufferAttribute(new Float32Array(this.p.length / 3), 1));
    g.computeBoundingSphere();
    return g;
  }
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const BARK = [0.36, 0.27, 0.2];

// A tapered wooden limb from a to b: `sides`-sided, light on top, dark underneath (shared by trunks and limbs).
function limb(S, a, b, r0, r1, sides, tint = BARK, l0 = 0.5, l1 = 0.62) {
  const ax = norm(sub(b, a));
  let u = cross(ax, [0, 0, 1]);
  if (Math.hypot(...u) < 0.2) u = cross(ax, [1, 0, 0]);
  u = norm(u);
  const w = cross(ax, u);
  const ring = (c, r, ang) => add(add(c, u, Math.cos(ang) * r), w, Math.sin(ang) * r);
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
    const n0 = add(u.map((x) => x * Math.cos(a0)), w, Math.sin(a0)), n1 = add(u.map((x) => x * Math.cos(a1)), w, Math.sin(a1));
    S.quad(ring(a, r0, a0), ring(a, r0, a1), ring(b, r1, a1), ring(b, r1, a0), [n0, n1, n1, n0], [SOLID, SOLID, SOLID, SOLID], [l0, l0, l1, l1], tint, PART.WOOD);
  }
}

// One card: centre C, plane normal n, roll, half sizes; uv rectangle; per-corner normal and brightness from `light`.
function card(S, C, n, roll, hu, hv, rect, light, tint, flip = false, up = null) {
  let t;
  if (up) { t = norm(cross(up, n)); } else { t = cross(n, [0, 1, 0]); if (Math.hypot(...t) < 0.1) t = [1, 0, 0]; t = norm(t); }
  const b = up ? norm(cross(n, t)) : cross(n, t);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const T = [t[0] * cr + b[0] * sr, t[1] * cr + b[1] * sr, t[2] * cr + b[2] * sr], B = [b[0] * cr - t[0] * sr, b[1] * cr - t[1] * sr, b[2] * cr - t[2] * sr];
  const corner = (x, y) => add(add(C, T, x * hu), B, y * hv);
  const P = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
  const [u0, v0, u1, v1] = rect, e = 0.004;
  const ua = flip ? u1 - e : u0 + e, ub = flip ? u0 + e : u1 - e;
  const uv = [[ua, v0 + e], [ub, v0 + e], [ub, v1 - e], [ua, v1 - e]];
  const L = P.map(light);
  S.quad(P[0], P[1], P[2], P[3], L.map((x) => x[0]), uv, L.map((x) => x[1]), tint);
}

// A low dark octahedral core inside a crown, so it never reads as see-through.
function core(S, c, sx, sy, sz, lum = [0.36, 0.38, 0.34]) {
  const ico = new THREE.OctahedronGeometry(1, 0), ip = ico.attributes.position.array;
  for (let i = 0; i < ip.length; i += 9) {
    const v = [0, 1, 2].map((k) => [c[0] + ip[i + k * 3] * sx, c[1] + ip[i + k * 3 + 1] * sy, c[2] + ip[i + k * 3 + 2] * sz]);
    S.tri(v, v.map((q) => [q[0] - c[0], q[1] - c[1] + 0.3 * sy, q[2] - c[2]]), [SOLID, SOLID, SOLID], lum, undefined, PART.CORE);
  }
}

// Crown lighting: a rounded normal that blends the clump's own bulge with the whole crown's, and a brightness that
// is deep warm-olive inside and low down, bright at the sunlit outer tips.
function crownLight(O, R, K, kOwn = 0.45) {
  return (q) => {
    const dc = sub(q, O), dk = sub(q, K);
    const nc = norm([dc[0] / R[0], dc[1] / R[1] + 0.45, dc[2] / R[2]]), nk = norm([dk[0], dk[1] + 0.25, dk[2]]);
    const n = norm(lerp3(nc, nk, kOwn));
    const h = smooth((dc[1] / R[1] + 0.75) / 1.6);
    const out = Math.min(1, Math.hypot(dc[0] / R[0], dc[1] / R[1], dc[2] / R[2]));
    return [n, (0.52 + 0.5 * h) * (0.8 + 0.3 * out)];
  };
}

// A clump of `nc` cards around K (radius rc): crossed upright cards plus a cap, the whole set turned at random.
function clump(S, rnd, K, rc, nc, rect, light, { tint, squash = 1, sizeK = 1.3, capTilt = 0.35 } = {}) {
  const phi = rnd() * Math.PI;
  for (let j = 0; j < nc; j++) {
    const cap = j === nc - 1 && nc > 1;
    let n;
    if (cap) n = norm([Math.cos(phi) * capTilt, 1, Math.sin(phi) * capTilt]);
    else { const a = phi + (j / Math.max(1, nc - 1)) * Math.PI + (rnd() - 0.5) * 0.3; n = norm([Math.cos(a), (rnd() - 0.3) * 0.5, Math.sin(a)]); }
    const off = [(rnd() - 0.5) * rc * 0.35, (cap ? 0.18 : (rnd() - 0.5) * 0.2) * rc * squash, (rnd() - 0.5) * rc * 0.35];
    const hs = rc * sizeK * (0.92 + rnd() * 0.2);
    card(S, add(K, off), n, rnd() * Math.PI * 2, hs, hs * (cap ? 1 : squash), rect, light, typeof tint === 'function' ? tint(cap, j) : tint, rnd() < 0.5);
  }
}

function spreadingGeometry(low) {
  const S = new Soup();
  let s = 11;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const fork = [0.03, -0.62, 0.02];
  limb(S, [0, -1.78, 0], fork, 0.16, 0.085, 4); // flared at the foot
  const O = [0, 0.18, 0], R = [1.05, 0.7, 1.05];
  const cl = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4 + (rnd() - 0.5) * 0.5, r = 0.58 + rnd() * 0.14;
    const K = [Math.cos(a) * r, 0.0 + rnd() * 0.22, Math.sin(a) * r];
    limb(S, fork, [K[0] * 0.72, K[1] - 0.24, K[2] * 0.72], 0.07, 0.035, 3);
    cl.push([K, 0.52 + rnd() * 0.1]);
  }
  cl.push([[0.05, 0.46, -0.04], 0.52]);
  core(S, [0, 0.12, 0], 0.5, 0.34, 0.5);
  for (const [K, rc] of cl) clump(S, rnd, K, rc, low ? 2 : 3, UV.broad, crownLight(O, R, K));
  return S.geometry();
}

function uprightGeometry(low) {
  const S = new Soup();
  let s = 29;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const fork = [0.02, -0.55, 0];
  limb(S, [0, -1.78, 0], fork, 0.12, 0.08, 4);
  const O = [0, 0.35, 0], R = [0.8, 1.0, 0.8];
  const cl = [[[0.26, -0.05, 0.08], 0.45], [[-0.24, 0.3, -0.1], 0.46], [[0.08, 0.68, 0.14], 0.42]];
  if (!low) cl.push([[-0.06, 1.0, -0.06], 0.32]);
  limb(S, fork, [0.2, -0.2, 0.06], 0.06, 0.035, 3);
  limb(S, fork, [-0.12, 0.42, -0.05], 0.065, 0.03, 3);
  core(S, [0, 0.32, 0], 0.32, 0.5, 0.32);
  for (const [K, rc] of cl) clump(S, rnd, K, rc, low ? 2 : 3, UV.broad, crownLight(O, R, K));
  return S.geometry();
}

// Phượng vĩ: low and wide. Colours are baked per card (the instance colour is a near-neutral multiplier):
// fresh feathery green underneath and around, flame-red blossom on the crown's top.
const FLAME_LEAF = [0.17, 0.33, 0.1], FLAME_FLOWER = [0.95, 0.13, 0.06], FLAME_FLOWER2 = [0.95, 0.27, 0.05];
function flamboyantGeometry(low) {
  const S = new Soup();
  let s = 53;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const fork = [0, -0.85, 0];
  limb(S, [0, -1.78, 0], fork, 0.13, 0.1, 4, [0.4, 0.33, 0.27]);
  const O = [0, 0.05, 0], R = [1.15, 0.55, 1.15];
  const n = low ? 4 : 5, cl = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + (rnd() - 0.5) * 0.4, r = 0.62 + rnd() * 0.15;
    const K = [Math.cos(a) * r, -0.08 + rnd() * 0.16, Math.sin(a) * r];
    if (k < 3) limb(S, fork, [K[0] * 0.8, K[1] - 0.12, K[2] * 0.8], 0.075, 0.035, 3, [0.4, 0.33, 0.27]);
    cl.push(K);
  }
  core(S, [0, -0.05, 0], 0.72, 0.24, 0.72, [0.22, 0.26, 0.2]);
  const tint = () => (cap, j) => (cap || (j === 0 && rnd() < 0.6) ? (rnd() < 0.5 ? FLAME_FLOWER : FLAME_FLOWER2) : FLAME_LEAF);
  for (const K of cl) {
    // wide, flattened clumps: one feathery green card below, crossed, and a blossom cap
    clump(S, rnd, K, 0.48, low ? 2 : 3, UV.frond, crownLight(O, R, K, 0.3), { tint: tint(K), squash: 0.72, sizeK: 1.25, capTilt: 0.3 });
  }
  // the crown's top: a broad blossom layer over the middle
  card(S, [0, 0.24, 0], norm([0.1, 1, -0.05]), rnd() * 6.28, 0.62, 0.62, UV.broad, crownLight(O, R, [0, 0.2, 0], 0.2), FLAME_FLOWER);
  return S.geometry();
}

// Liễu rủ: a trunk leaning out (toward the water, once the instance is turned that way), a small head of leaves and
// long curtains hanging from the limbs almost to the ground.
function willowGeometry(low) {
  const S = new Soup();
  let s = 71;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const top = [0.32, -0.25, 0];
  limb(S, [0, -1.78, 0], [0.12, -1.0, 0], 0.11, 0.09, 4);
  limb(S, [0.12, -1.0, 0], top, 0.09, 0.07, 4);
  const O = [0.32, 0.1, 0], R = [0.9, 0.9, 0.9];
  limb(S, top, [0.75, 0.25, 0.2], 0.05, 0.025, 3);
  limb(S, top, [0.0, 0.32, -0.25], 0.05, 0.025, 3);
  clump(S, rnd, [0.34, 0.32, 0], 0.42, low ? 1 : 2, UV.willow, crownLight(O, R, [0.34, 0.32, 0]), { capTilt: 0.6 });
  const n = low ? 6 : 9;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + (rnd() - 0.5) * 0.3, r = 0.5 + rnd() * 0.22;
    const hang = 0.62 + rnd() * 0.28; // half-length of the curtain
    const yTop = 0.42 + rnd() * 0.12;
    const C = [O[0] + Math.cos(a) * r, yTop - hang, O[2] + Math.sin(a) * r];
    // faces outward, its top leaning in toward the crown so the strands spill over and fall
    const n0 = norm([Math.cos(a), 0.22, Math.sin(a)]);
    const light = (q) => {
      const d = sub(q, O);
      const nn = norm([d[0], 0.35 + (q[1] - C[1]) * 0.3, d[2]]);
      return [nn, (0.5 + 0.5 * smooth((q[1] + 1.1) / 1.7)) * 0.95];
    };
    card(S, C, n0, 0, 0.36 + rnd() * 0.1, hang, UV.willow, light, [1, 1, 1], rnd() < 0.5, [0, 1, 0]);
  }
  return S.geometry();
}

// Thông: a tall, slightly curved bare trunk; flat-topped needle tiers staggered up its top third.
function pineGeometry(low) {
  const S = new Soup();
  let s = 47;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const tint = [0.42, 0.31, 0.25];
  const mid = [0.09, -0.35, 0.02], top = [0.03, 0.95, -0.02];
  limb(S, [0, -1.78, 0], mid, 0.08, 0.06, 4, tint);
  limb(S, mid, top, 0.06, 0.03, 4, tint);
  const tiers = low ? [[0.3, 0.8], [0.72, 0.58]] : [[0.16, 0.86], [0.46, 0.78], [0.74, 0.62], [0.98, 0.4]];
  tiers.forEach(([y, r], k) => {
    const a = k * 2.3 + rnd() * 0.6, ox = Math.cos(a) * 0.2, oz = Math.sin(a) * 0.2;
    const K = [lerp3(mid, top, (y + 0.35) / 1.3)[0] + ox, y, lerp3(mid, top, (y + 0.35) / 1.3)[2] + oz];
    if (k < tiers.length - 2) limb(S, [K[0] - ox, y - 0.06, K[2] - oz], [K[0] + ox * 2.2, y - 0.02, K[2] + oz * 2.2], 0.025, 0.012, 3, tint);
    const light = (q) => { const d = sub(q, K); return [norm([d[0] * 0.8, 0.9, d[2] * 0.8]), 0.5 + 0.5 * smooth((q[1] - K[1] + 0.12) / 0.24) * (0.75 + 0.25 * y)]; };
    // a flat tuft on top, and two shallow crossed cards under it so the tier has thickness from the side
    card(S, [K[0], K[1] + 0.03, K[2]], norm([0.05, 1, 0.04]), rnd() * 6.28, r, r, UV.pine, light, [1, 1, 1]);
    for (let j = 0; j < (low ? 1 : 2); j++) {
      const ca = a + j * Math.PI / 2;
      card(S, [K[0], K[1] - 0.04, K[2]], norm([Math.cos(ca), 0.55, Math.sin(ca)]), 0, r * 0.95, r * 0.36, UV.pine, light, [0.9, 0.92, 0.9], false, [0, 1, 0]);
    }
  });
  return S.geometry();
}

// Areca palm (cây cau): a thin ringed trunk with a slight curve and a crown of arched, drooping fronds.
function palmGeometry(low) {
  const S = new Soup();
  const tint = [0.5, 0.46, 0.4];
  const mid = [0.06, -0.55, 0], top = [0.02, 0.62, 0];
  limb(S, [0, -1.78, 0], mid, 0.045, 0.038, 3, tint);
  limb(S, mid, top, 0.038, 0.03, 3, tint);
  const nf = low ? 7 : 8, segs = low ? 2 : 3;
  const [u0, v0, u1, v1] = UV.palm;
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + (i % 2) * 0.2, lift = 0.55 - (i % 3) * 0.18;
    const dir = [Math.cos(a), 0, Math.sin(a)], side = [-dir[2], 0, dir[0]];
    // arch: rises, then falls past the crown
    const at = (t) => [top[0] + dir[0] * 0.98 * t, top[1] + lift * 0.9 * t - (0.55 + lift * 0.4) * t * t, top[2] + dir[2] * 0.98 * t];
    const width = (t) => 0.06 + 0.24 * Math.sin(Math.PI * Math.min(1, t * 1.05));
    for (let k = 0; k < segs; k++) {
      const t0 = k / segs, t1 = (k + 1) / segs, p0 = at(t0), p1 = at(t1), w0 = width(t0), w1 = width(t1);
      const nrm = norm([dir[0] * 0.35, 1, dir[2] * 0.35]);
      const va = v0 + (v1 - v0) * t0, vb = v0 + (v1 - v0) * t1;
      const droop = (p, w, sg) => [p[0] + side[0] * w * sg, p[1] - w * 0.25, p[2] + side[2] * w * sg]; // leaflets hang either side of the rib
      S.quad(droop(p0, w0, -1), droop(p0, w0, 1), droop(p1, w1, 1), droop(p1, w1, -1), [nrm, nrm, nrm, nrm],
        [[u0 + 0.004, va], [u1 - 0.004, va], [u1 - 0.004, vb], [u0 + 0.004, vb]], [0.68 + 0.3 * t0, 0.68 + 0.3 * t0, 0.68 + 0.3 * t1, 0.68 + 0.3 * t1]);
    }
  }
  return S.geometry();
}

// ---------------------------------------------------------------------------------------------------------------
// Where the water is: a coarse raster of the land polygons (holes and still water are water), so the trees that
// stand on a bank — the river, the moat, the tomb lakes — can be willows leaning out over it.
function waterNear(data) {
  const b = data.meta && data.meta.bounds;
  if (!b || !Array.isArray(data.land)) return () => null;
  const STEP = 6, x0 = b[0] / 10, z0 = b[1] / 10;
  const W = Math.ceil((b[2] - b[0]) / 10 / STEP), H = Math.ceil((b[3] - b[1]) / 10 / STEP);
  let px;
  try {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const ring = (r) => { for (let i = 0; i < r.length; i += 2) { const x = (r[i] / 10 - x0) / STEP, y = (r[i + 1] / 10 - z0) / STEP; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
    g.fillStyle = '#000';
    for (const poly of data.land) { g.beginPath(); for (const r of poly) ring(r); g.fill('evenodd'); }
    g.fillStyle = '#fff';
    for (const poly of data.ponds || []) { g.beginPath(); for (const r of poly) ring(r); g.fill('evenodd'); }
    px = g.getImageData(0, 0, W, H).data;
  } catch { return () => null; }
  const wet = (x, z) => {
    const i = Math.floor((x - x0) / STEP), j = Math.floor((z - z0) / STEP);
    return i >= 0 && j >= 0 && i < W && j < H && px[(j * W + i) * 4] > 127;
  };
  // returns the direction toward the nearest water within ~26 m (as an angle), or null
  return (x, z) => {
    let sx = 0, sz = 0, hit = 0;
    for (const r of [10, 18, 26]) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
        if (wet(x + dx * r, z + dz * r)) { sx += dx / r; sz += dz / r; hit++; }
      }
      if (hit) break;
    }
    return hit ? Math.atan2(sz, sx) : null;
  };
}

const TYPES = ['spreading', 'upright', 'flamboyant', 'willow', 'pine', 'palm'];

// Returns plant(records, nearCount, i0): plants one batch of trees (hue.json's own, then each tile's) with the shared
// geometry and materials and returns its meshes; i0 is the batch's first index in the whole model (dice seeds).
export function treePlanter(data, group, off = null) {
  const tex = leafAtlas();
  const mat = cityMaterial({ foliage: true, map: tex, alphaTest: 0.42, side: THREE.DoubleSide });
  mat.alphaToCoverage = true;
  const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, ...rest) => {
    base(sh, ...rest);
    // cards are double-sided but share one rounded normal field: do not flip it for back faces
    sh.fragmentShader = patch(sh.fragmentShader).replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0;\nvec3 normal = normalize( vNormal );\nvec3 nonPerturbedNormal = normal;').src;
    // keep the fine branchlets from thinning out in the small mip levels: alpha grows with the mip level, so a
    // far crown stays as full as a near one
    sh.fragmentShader = patch(sh.fragmentShader).replace('#include <alphatest_fragment>', `
      #ifdef USE_MAP
      {
        vec2 hueTx = vMapUv * 1024.0;
        float hueMip = max( 0.0, 0.5 * log2( max( dot( dFdx( hueTx ), dFdx( hueTx ) ), dot( dFdy( hueTx ), dFdy( hueTx ) ) ) ) );
        diffuseColor.a *= 1.0 + hueMip * 0.3;
      }
      #endif
      #include <alphatest_fragment>`).src;
  };
  mat.customProgramCacheKey = () => 'hue-foliage-cards-3';
  const depthMat = foliageDepthMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide }); // shadows sway with the crowns
  const low = quality.low;
  const geos = { spreading: spreadingGeometry(low), upright: uprightGeometry(low), flamboyant: flamboyantGeometry(low), willow: willowGeometry(low), pine: pineGeometry(low), palm: palmGeometry(low) };
  const nearWater = waterNear(data);
  // illustrative planting must not stand between the visitor and the monuments of the central axis
  const forecourts = (data.places || []).filter((p) => ['ngomon', 'thaihoa', 'kydai', 'phuvanlau', 'nghenhluong'].includes(p.id)).map((p) => [p.x / 10, p.z / 10]);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  // mossy, olive greens rather than emerald
  const greens = ['#4a6845', '#587450', '#3f5a3f', '#687a52', '#516d48', '#627849', '#466443'].map(hex);
  const dark = ['#385a42', '#3d5f44', '#33523c', '#426247'].map(hex), palmC = ['#526f42', '#4a683d', '#5e7846'].map(hex), pineC = ['#2f5040', '#345644', '#3c5c42', '#2b4a3a', '#445f3c'].map(hex);
  const willowC = ['#7a9450', '#6f8b4a', '#86995a', '#6a8648'].map(hex);
  const flameBase = ['#bdb8a8', '#c4bba4', '#b4b2a4'].map(hex); // multiplies the green/red baked into the cards
  // the city's seasonal blossom, sparingly: bằng lăng tím along the streets, hoàng mai in the Citadel's gardens
  const lilac = ['#8f6db8', '#a17ec8', '#7d5ca8'].map(hex), mai = ['#e3b53c', '#d8a632'].map(hex);
  let meshes = [];
  const range = (a, i0, start, end, layer) => {
    const span = end - start, n = Math.floor(span * quality.treeShare);
    if (n <= 0) return;
    const stride = span / n;
    const items = [];
    for (let k = 0; k < n; k++) {
      const j = start + Math.floor(k * stride), i = i0 + j, sc = a[j * 4 + 2] / 10, kind = a[j * 4 + 3];
      const r = rand(i, 61);
      const x = a[j * 4] / 10, z = a[j * 4 + 1] / 10;
      if (off && off(x, z, 2.2 * sc)) continue; // a landmark model stands here
      if (forecourts.some((c) => (x - c[0]) ** 2 + (z - c[1]) ** 2 < 46 * 46)) continue; // the great halls stand in open courts
      let type = kind === 3 ? 'pine' : kind === 2 ? 'flamboyant' : r < 0.085 && sc < 1.25 ? 'palm' : r < 0.42 ? 'upright' : 'spreading';
      let lean = null;
      if (type === 'spreading' || type === 'upright') {
        const w = rand(i, 71) < 0.5 ? nearWater(x, z) : null;
        if (w !== null) { type = 'willow'; lean = w; }
      }
      items.push({ i, x, z, sc, kind, type, lean });
    }
    for (const list of chunked(items)) {
      for (const type of TYPES) {
        const sub = list.filter((t) => t.type === type);
        if (!sub.length) continue;
        const mesh = new THREE.InstancedMesh(geos[type], mat, sub.length);
        sub.forEach(({ i, x, z, sc, kind, lean }, k) => {
          const r = 3.3 * sc * (0.75 + rand(i, 41) * 0.5);
          const hgt = r * (0.95 + rand(i, 42) * 0.45) * (type === 'palm' ? 1.45 : type === 'pine' ? 1.42 : type === 'flamboyant' ? 0.82 : type === 'willow' ? 1.05 : 1);
          const rr = type === 'palm' ? r * 0.85 : type === 'flamboyant' ? r * 1.12 : r;
          // willows lean out toward the water (local +x is the lean); everything else turns at random
          const yaw = lean !== null ? -lean + (rand(i, 72) - 0.5) * 0.7 : rand(i, 43) * 6.28;
          q.setFromAxisAngle(up, yaw);
          p.set(x, LAND_Y + rise(x, z) + hgt * 1.7, z);
          const ax = 0.88 + rand(i, 73) * 0.24; // not every crown round in plan
          s.set(rr * ax, hgt, rr / ax);
          mesh.setMatrixAt(k, m.compose(p, q, s));
          let col = type === 'pine' ? pick(pineC, i, 49) : type === 'palm' ? pick(palmC, i, 48) : type === 'flamboyant' ? pick(flameBase, i, 44) : type === 'willow' ? pick(willowC, i, 50) : kind === 1 ? pick(dark, i, 45) : pick(greens, i, 46);
          if (type === 'spreading' || type === 'upright') {
            const bl = rand(i, 67);
            if (bl < 0.035 && !inHills(x, z)) col = pick(lilac, i, 68);
            else if (bl < 0.065 && inCitadel(x, z)) col = pick(mai, i, 69);
          }
          mesh.setColorAt(k, enc(shade(col, 0.86 + rand(i, 47) * 0.28), c));
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
        mesh.customDepthMaterial = depthMat;
        mesh.castShadow = !quality.low;
        mesh.receiveShadow = true;
        mesh.computeBoundingSphere();
        mesh.layers.set(layer);
        mesh.name = 'trees';
        mesh.userData.species = type;
        lodAdd(mesh, 3600);
        group.add(mesh);
        meshes.push(mesh);
      }
    }
  };
  return (a, nearCount, i0 = 0) => {
    a = a || [];
    nearCount ??= a.length / 4;
    meshes = [];
    range(a, i0, 0, nearCount, 0);
    range(a, i0, nearCount, a.length / 4, 1);
    return meshes;
  };
}
