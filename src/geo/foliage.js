import * as THREE from 'three';
import { hex, shade } from './buf.js';
import { cityMaterial, enc } from './materials.js';
import { rise } from './terrain.js';
import { LAND_Y, quality } from '../config.js';

// Trees are built the way stylised foliage usually is: a handful of leaf-cluster cards around a dark core,
// lit with rounded "puffball" normals so the crown shades as one soft mass, cut out by an alpha texture.
// All illustrative (OSM maps almost no individual trees here).

const rand = (i, salt = 0) => {
  let h = ((i + 1) * 2654435761 + salt * 40503) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
const pick = (arr, i, salt = 0) => arr[Math.floor(rand(i, salt) * arr.length) % arr.length];

// Atlas: [leaf cluster | palm frond] on top, a solid block bottom-left for trunks and cores.
function leafAtlas() {
  const S = 512, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // cluster
  for (let i = 0; i < 150; i++) {
    const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), 0.62) * 104;
    const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r;
    const v = Math.round(165 + rnd() * 90);
    g.save();
    g.translate(x, y); g.rotate(rnd() * Math.PI);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath(); g.ellipse(0, 0, 11 + rnd() * 11, 5 + rnd() * 5, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(90,90,90,0.55)`; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.stroke();
    g.restore();
  }
  // frond: a rib with paired leaflets
  g.save();
  g.translate(384, 246);
  g.fillStyle = 'rgb(205,205,205)';
  g.fillRect(-3, -232, 6, 232);
  for (let i = 0; i < 22; i++) {
    const y = -8 - i * 10.2, len = 62 * Math.sin(Math.PI * (0.12 + 0.88 * (i / 22))) + 16;
    for (const s of [-1, 1]) {
      g.save(); g.translate(0, y); g.rotate(s * (0.95 - i * 0.012));
      const v = Math.round(180 + rnd() * 70);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.ellipse(0, -len / 2, 4.2, len / 2, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  g.restore();
  // solid block
  g.fillStyle = '#fff';
  g.fillRect(0, 330, 190, 182);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

class Soup {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; }
  // v: three points, n: three normals, uv: three uvs, lum: three brightness values (linear), tint: [r,g,b]
  tri(v, n, uv, lum, tint = [1, 1, 1]) {
    for (let k = 0; k < 3; k++) {
      this.p.push(...v[k]);
      const l = Math.hypot(...n[k]) || 1;
      this.n.push(n[k][0] / l, n[k][1] / l, n[k][2] / l);
      this.uv.push(...uv[k]);
      // colours are sqrt-encoded (the city shader squares them)
      this.c.push(Math.sqrt(lum[k] * tint[0]), Math.sqrt(lum[k] * tint[1]), Math.sqrt(lum[k] * tint[2]));
    }
  }
  quad(a, b, c, d, n, uvs, lum, tint) {
    this.tri([a, b, c], [n[0], n[1], n[2]], [uvs[0], uvs[1], uvs[2]], [lum[0], lum[1], lum[2]], tint);
    this.tri([a, c, d], [n[0], n[2], n[3]], [uvs[0], uvs[2], uvs[3]], [lum[0], lum[2], lum[3]], tint);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(new Float32Array(this.p.length / 3), 1));
    g.computeBoundingSphere();
    return g;
  }
}
const SOLID = [0.18, 0.18];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

function trunk(S, y0, y1, r0, r1, tint) {
  for (let i = 0; i < 4; i++) {
    const a0 = (i / 4) * Math.PI * 2, a1 = ((i + 1) / 4) * Math.PI * 2;
    const p = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    const n0 = [Math.cos(a0), 0, Math.sin(a0)], n1 = [Math.cos(a1), 0, Math.sin(a1)];
    S.quad(p(a0, r0, y0), p(a1, r0, y0), p(a1, r1, y1), p(a0, r1, y1), [n0, n1, n1, n0], [SOLID, SOLID, SOLID, SOLID], [0.5, 0.5, 0.62, 0.62], tint);
  }
}

// Broadleaf crown. `tall` stretches it for the upright trees that line streets and gardens.
function crownGeometry(seed, cards, tall) {
  const S = new Soup();
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const sy = tall ? 1.32 : 1.0, sx = tall ? 0.8 : 1.0;
  trunk(S, -1.75, -0.15, 0.1, 0.07, [0.36, 0.27, 0.2]);
  // dark core so the crown never reads as see-through
  const ico = new THREE.OctahedronGeometry(0.56, 0), ip = ico.attributes.position.array;
  for (let i = 0; i < ip.length; i += 9) {
    const v = [0, 1, 2].map((k) => [ip[i + k * 3] * sx, ip[i + k * 3 + 1] * sy + 0.12, ip[i + k * 3 + 2] * sx]);
    S.tri(v, v.map((q) => [q[0], q[1] + 0.3, q[2]]), [SOLID, SOLID, SOLID], [0.2, 0.2, 0.2]);
  }
  for (let i = 0; i < cards; i++) {
    // card centres spread over a lumpy shell, biased to the top and sides
    const y = -0.4 + 1.35 * Math.pow(rnd(), 0.8), a = rnd() * Math.PI * 2, hr = Math.sqrt(Math.max(0, 1 - Math.min(1, y) ** 2));
    const d = norm([Math.cos(a) * Math.max(0.25, hr), y, Math.sin(a) * Math.max(0.25, hr)]);
    const rad = 0.44 + rnd() * 0.36;
    const C = [d[0] * rad * sx, d[1] * rad * sy + 0.12, d[2] * rad * sx];
    const n = norm([d[0] + (rnd() - 0.5) * 0.7, d[1] + (rnd() - 0.5) * 0.7, d[2] + (rnd() - 0.5) * 0.7]);
    let t = cross(n, [0, 1, 0]);
    if (Math.hypot(...t) < 0.1) t = [1, 0, 0];
    t = norm(t);
    const b = cross(n, t);
    const roll = rnd() * Math.PI * 2, cr = Math.cos(roll), sr = Math.sin(roll);
    const T = [t[0] * cr + b[0] * sr, t[1] * cr + b[1] * sr, t[2] * cr + b[2] * sr], B = [b[0] * cr - t[0] * sr, b[1] * cr - t[1] * sr, b[2] * cr - t[2] * sr];
    const hs = 0.7 + rnd() * 0.22;
    const corner = (u, v) => [C[0] + (T[0] * u + B[0] * v) * hs, C[1] + (T[1] * u + B[1] * v) * hs, C[2] + (T[2] * u + B[2] * v) * hs];
    const P = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
    // puffball normals and a shade that falls off toward the underside and the inside
    const N = P.map((q) => norm([q[0], (q[1] - 0.12) / sy + 0.42, q[2]]));
    const L = P.map((q) => { const h = Math.max(0, Math.min(1, (q[1] / sy + 0.55) / 1.5)); return 0.38 + 0.62 * h * h * (3 - 2 * h); });
    const flip = rnd() < 0.5;
    const uv = flip ? [[0.49, 0.51], [0.01, 0.51], [0.01, 0.99], [0.49, 0.99]] : [[0.01, 0.51], [0.49, 0.51], [0.49, 0.99], [0.01, 0.99]];
    S.quad(P[0], P[1], P[2], P[3], N, uv, L);
  }
  return S.geometry();
}

// Areca palm (cây cau): a thin trunk and a crown of drooping fronds — the tree of Huế's garden houses.
function palmGeometry() {
  const S = new Soup();
  trunk(S, -1.75, 0.62, 0.045, 0.03, [0.5, 0.46, 0.4]);
  const top = [0, 0.62, 0];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.2, lift = 0.5 - (i % 3) * 0.16;
    const dir = [Math.cos(a), 0, Math.sin(a)], side = [-dir[2], 0, dir[0]];
    const w = 0.2, l1 = 0.5, l2 = 0.95;
    const mid = [top[0] + dir[0] * l1, top[1] + lift * 0.55, top[2] + dir[2] * l1];
    const end = [top[0] + dir[0] * l2, top[1] + lift * 0.55 - 0.34, top[2] + dir[2] * l2];
    const P = (c, k) => [c[0] + side[0] * w * k, c[1], c[2] + side[2] * w * k];
    const N = [0, 1, 0].map(() => norm([dir[0] * 0.4, 1, dir[2] * 0.4]));
    const nn = [N[0], N[0], N[0], N[0]];
    S.quad(P(top, -0.5), P(top, 0.5), P(mid, 1), P(mid, -1), nn, [[0.52, 0.51], [0.98, 0.51], [0.98, 0.75], [0.52, 0.75]], [0.7, 0.7, 0.95, 0.95]);
    S.quad(P(mid, -1), P(mid, 1), P(end, 0.6), P(end, -0.6), nn, [[0.52, 0.75], [0.98, 0.75], [0.98, 0.99], [0.52, 0.99]], [0.95, 0.95, 0.8, 0.8]);
  }
  return S.geometry();
}

function chunked(items, size = 1300) {
  const map = new Map();
  for (const it of items) {
    const key = Math.floor(it.x / size) + ',' + Math.floor(it.z / size);
    let list = map.get(key);
    if (!list) map.set(key, (list = []));
    list.push(it);
  }
  return map.values();
}

export function buildTrees(data, group) {
  const a = data.trees;
  const total = a.length / 4;
  const nearCount = data.meta.counts.treesNear ?? total;
  const tex = leafAtlas();
  const mat = cityMaterial({ foliage: true, map: tex, alphaTest: 0.36, side: THREE.DoubleSide });
  mat.alphaToCoverage = true;
  const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh) => {
    base(sh);
    // cards are double-sided but share one rounded normal field: do not flip it for back faces
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0;\nvec3 normal = normalize( vNormal );\nvec3 nonPerturbedNormal = normal;');
  };
  mat.customProgramCacheKey = () => 'hue-foliage-cards';
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.4, side: THREE.DoubleSide });
  const geos = { round: crownGeometry(11, quality.low ? 8 : 11, false), tall: crownGeometry(29, quality.low ? 9 : 12, true), palm: palmGeometry() };

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  const greens = ['#4f8a3e', '#5a9445', '#467a3c', '#6a9c48', '#3f7038', '#588a4a', '#739f4c'].map(hex);
  const dark = ['#2f6238', '#35693a', '#2b5a36', '#3a6e3c'].map(hex), flame = ['#d8452c', '#e2552b', '#c93c33'].map(hex), palmC = ['#5c8f47', '#4f8440', '#6a9a4c'].map(hex);
  const meshes = [];
  const range = (start, end, layer) => {
    const span = end - start, n = Math.floor(span * quality.treeShare);
    if (n <= 0) return;
    const stride = span / n;
    const items = [];
    for (let k = 0; k < n; k++) {
      const i = start + Math.floor(k * stride), sc = a[i * 4 + 2] / 10, kind = a[i * 4 + 3];
      const r = rand(i, 61);
      const type = kind === 2 ? 'round' : r < 0.085 && sc < 1.25 ? 'palm' : r < 0.42 ? 'tall' : 'round';
      items.push({ i, x: a[i * 4] / 10, z: a[i * 4 + 1] / 10, sc, kind, type });
    }
    for (const list of chunked(items)) {
      for (const type of ['round', 'tall', 'palm']) {
        const sub = list.filter((t) => t.type === type);
        if (!sub.length) continue;
        const mesh = new THREE.InstancedMesh(geos[type], mat, sub.length);
        sub.forEach(({ i, x, z, sc, kind }, k) => {
          const r = 3.3 * sc * (0.75 + rand(i, 41) * 0.5);
          const hgt = r * (0.95 + rand(i, 42) * 0.45) * (type === 'palm' ? 1.45 : 1);
          const rr = type === 'palm' ? r * 0.85 : r;
          q.setFromAxisAngle(up, rand(i, 43) * 6.28);
          p.set(x, LAND_Y + rise(x, z) + hgt * 1.7, z);
          s.set(rr, hgt, rr);
          mesh.setMatrixAt(k, m.compose(p, q, s));
          const col = type === 'palm' ? pick(palmC, i, 48) : kind === 2 ? pick(flame, i, 44) : kind === 1 ? pick(dark, i, 45) : pick(greens, i, 46);
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
        group.add(mesh);
        meshes.push(mesh);
      }
    }
  };
  range(0, nearCount, 0);
  range(nearCount, total, 1);
  return meshes;
}
