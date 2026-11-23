// Builds self-hosted hero .glb accent models into public/data/models/ using Three.js geometry primitives
// (Catmull-Rom spline TubeGeometry, LatheGeometry) and GLTFExporter.
//
// Usage: node scripts/build-hero-glb.mjs
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// Node polyfill for GLTFExporter binary (.glb) export (uses FileReader in browser)
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = `data:${blob.type};base64,${Buffer.from(buf).toString('base64')}`;
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
  };
}

const OUT_DIR = path.resolve(new URL('../public/data/models', import.meta.url).pathname);
fs.mkdirSync(OUT_DIR, { recursive: true });

function paint(geom, hexColor) {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  const c = new THREE.Color(hexColor); // Three converts sRGB hex -> linear
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.computeVertexNormals();
  return g;
}

function mergeGeoms(geoms) {
  let total = 0;
  for (const g of geoms) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nrm = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let off = 0;
  for (const g of geoms) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, off * 3);
    nrm.set(g.attributes.normal.array, off * 3);
    col.set(g.attributes.color.array, off * 3);
    off += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

// Smooth turned pháp lam gourd finial (LatheGeometry)
function latheGourd(x, y, z, scale = 1.0, hexCol = 0xe8c45e) {
  const pts = [
    [0.01, 0.0], [0.22, 0.08], [0.26, 0.24], [0.15, 0.42],
    [0.10, 0.50], [0.19, 0.64], [0.16, 0.80], [0.06, 0.96], [0.005, 1.12],
  ].map(([r, h]) => new THREE.Vector2(r * scale, h * scale));
  const g = new THREE.LatheGeometry(pts, 14);
  g.translate(x, y, z);
  return paint(g, hexCol);
}

// Sculpted undulating imperial dragon (Catmull-Rom 3D spline TubeGeometry + raised crest + curled tail)
function sculptedDragon(cx, cy, cz, dirX, span, scale = 1.0) {
  const parts = [];
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cx + dirX * 0.55 * scale, cy + 0.68 * scale, cz),
    new THREE.Vector3(cx + dirX * 1.05 * scale, cy + 0.30 * scale, cz + 0.08 * scale),
    new THREE.Vector3(cx + dirX * (span * 0.40), cy + 0.72 * scale, cz - 0.06 * scale),
    new THREE.Vector3(cx + dirX * (span * 0.64), cy + 0.24 * scale, cz + 0.05 * scale),
    new THREE.Vector3(cx + dirX * (span * 0.85), cy + 0.62 * scale, cz),
    new THREE.Vector3(cx + dirX * span, cy + 0.88 * scale, cz),
  ]);
  parts.push(paint(new THREE.TubeGeometry(curve, 28, 0.14 * scale, 8, false), 0x3a8c6c));

  // golden dorsal crest spine along the dragon's back
  const crest = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cx + dirX * 0.48 * scale, cy + 0.88 * scale, cz),
    new THREE.Vector3(cx + dirX * 0.85 * scale, cy + 0.52 * scale, cz),
    new THREE.Vector3(cx + dirX * (span * 0.40), cy + 0.90 * scale, cz),
    new THREE.Vector3(cx + dirX * (span * 0.65), cy + 0.42 * scale, cz),
  ]);
  parts.push(paint(new THREE.TubeGeometry(crest, 18, 0.065 * scale, 6, false), 0xe6be4c));

  // sculpted dragon head sphere + snout facing the pearl
  const head = new THREE.SphereGeometry(0.22 * scale, 10, 8);
  head.scale(1.25, 0.95, 0.9);
  head.translate(cx + dirX * 0.52 * scale, cy + 0.72 * scale, cz);
  parts.push(paint(head, 0xe6be4c));

  return parts;
}

// Curved imperial roof corner scroll (đao mái) — S-curved tube sweeping up from corner eaves
function cornerScroll(x, y, z, dx, dz, scale = 1.0) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(x, y, z),
    new THREE.Vector3(x + dx * 0.45 * scale, y + 0.16 * scale, z + dz * 0.45 * scale),
    new THREE.Vector3(x + dx * 0.78 * scale, y + 0.52 * scale, z + dz * 0.78 * scale),
    new THREE.Vector3(x + dx * 0.62 * scale, y + 0.82 * scale, z + dz * 0.62 * scale),
  ]);
  return paint(new THREE.TubeGeometry(curve, 14, 0.085 * scale, 7, false), 0xe8c45e);
}

// Build Ngọ Môn hero accent .glb (local frame: u along +X, v along +Z, y = height above LAND_Y)
// Matches ngomon.js: yT = 5.0, yN = 6.14, center hall u [-8.8..8.8], v [-11.6..0.8] (center v = -5.4),
// upper ridge y = 6.14 + 3.1 + 3.2*0.34 + 3.1*0.85 + 3.2 = 16.163 m above LAND_Y.
function buildNgoMonHero() {
  const parts = [];
  const vc = -5.4;
  const ridgeY = 6.14 + 3.1 + 3.2 * 0.34 + 3.1 * 0.85 + 3.2 + 0.06;

  // 1. Sculpted flaming sun / pearl & twin curved dragons (Lưỡng Long Chầu Nhật) on Lầu Ngũ Phụng's main yellow ridge
  const pearl = new THREE.SphereGeometry(0.42, 14, 10);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ridgeY + 0.62, vc);
  parts.push(paint(pearl, 0xea6434));
  parts.push(latheGourd(0, ridgeY + 0.02, vc, 0.45, 0xe8c45e));
  parts.push(...sculptedDragon(0, ridgeY, vc, 1, 4.4, 1.12));
  parts.push(...sculptedDragon(0, ridgeY, vc, -1, 4.4, 1.12));

  // 2. Smooth turned golden pháp lam gourds on the ridge ends & corner scrolls (đao mái) of Lầu Ngũ Phụng
  const uHalf = (17.6 * 0.9 / 2 + 1.05 * 0.9) * 0.6;
  for (const s of [-1, 1]) {
    parts.push(latheGourd(s * uHalf, ridgeY - 0.08, vc, 0.88, 0xe8c45e));
  }
  // Curved corner scrolls on the 4 upper corners of the yellow center hall
  const eu = 17.6 * 0.9 / 2 + 1.05 * 0.9;
  const ev = 12.4 * 0.8 / 2 + 1.05 * 0.9;
  const eaveY = 6.14 + 3.1 + 3.2 * 0.34 + 3.1 * 0.85;
  for (const su of [-1, 1]) {
    for (const sv of [-1, 1]) {
      parts.push(cornerScroll(su * eu, eaveY + 0.12, vc + sv * ev, su * 0.72, sv * 0.72, 1.15));
    }
  }

  // 3. Sculpted golden gourds on the 4 green side & wing pavilions
  const wingV = (3.6 + 10.0 + (14.8 - 12.05)) / 2; // matches ngomon.js wing hall center v
  const sideRidgeY = 6.14 + 3.1 + 2.3 * 0.34 + 3.1 * 0.85 + 2.3 + 0.04;
  const wingRidgeY = 6.14 + 3.1 + 2.8 * 0.34 + 3.1 * 0.85 + 2.8 + 0.04;
  for (const s of [-1, 1]) {
    parts.push(latheGourd(s * 13.15, sideRidgeY, -4.75, 0.85, 0xe8c45e));
    parts.push(latheGourd(s * 20.1, wingRidgeY, wingV, 0.92, 0xe8c45e));
  }

  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'ngomon_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Điện Thái Hòa hero accent .glb (local frame: u along +X, v along +Z toward Ngọ Môn, y above ground)
function buildThaiHoaHero() {
  const parts = [];
  // Matches thaihoa.js: FL = 2.35, yd1 = 2.35 + 6.4 = 8.75, upH = 2.95, ridgeY = 11.78, iVc = -9.6
  const vc = -9.6, ridgeY = 2.35 + 6.4 + 2.95 + 0.08, eaveY = 2.35 + 6.4;
  const pearl = new THREE.SphereGeometry(0.46, 14, 10);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ridgeY + 0.68, vc);
  parts.push(paint(pearl, 0xea6434));
  parts.push(latheGourd(0, ridgeY + 0.02, vc, 0.48, 0xe8c45e));
  parts.push(...sculptedDragon(0, ridgeY, vc, 1, 5.2, 1.15));
  parts.push(...sculptedDragon(0, ridgeY, vc, -1, 5.2, 1.15));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 11.8, ridgeY - 0.08, vc, 0.85, 0xe8c45e));
  // 4 curved đao mái corner scrolls on the upper hip roof
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 17.3, eaveY + 0.14, vc + sv * 7.8, su * 0.72, sv * 0.72, 1.2));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'thaihoa_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Chùa Thiên Mụ (Phước Duyên Tower) hero accent .glb (local frame centered on tower C, y above tower base)
function buildThienMuHero() {
  const parts = [];
  // Matches thienmu.js: 7 octagonal tiers rising ~18.6 m above platform + golden spire to ~21 m
  parts.push(latheGourd(0, 18.8, 0, 1.65, 0xe8c45e));
  // Curved golden đao mái corner scrolls on the top 3 octagonal tiers
  const tierTops = [[13.2, 3.3], [15.8, 2.9], [18.3, 2.5]];
  for (const [ty, tr] of tierTops) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      parts.push(cornerScroll(Math.cos(a) * tr, ty, Math.sin(a) * tr, Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.75));
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'thienmu_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

const exporter = new GLTFExporter();
for (const [name, buildFn] of [
  ['ngomon-hero.glb', buildNgoMonHero],
  ['thaihoa-hero.glb', buildThaiHoaHero],
  ['thienmu-hero.glb', buildThienMuHero],
]) {
  const scene = buildFn();
  const glb = await exporter.parseAsync(scene, { binary: true });
  const outPath = path.join(OUT_DIR, name);
  fs.writeFileSync(outPath, Buffer.from(glb));
  console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB, ${scene.children[0].geometry.attributes.position.count / 3} tris)`);
}
