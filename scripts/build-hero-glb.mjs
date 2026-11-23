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

// Build Lăng Khải Định (Cung Thiên Định) hero accent .glb
// Matches khaidinh.js: anchor at Khải Thành center [189.86, 7693.36], rotY = -0.7599,
// upper roof ridge y = 14.88, upper eave y = 12.88, lower main eave y = 9.98 above ground.
function buildKhaiDinhHero() {
  const parts = [];
  const ridgeY = 14.92, eaveY = 12.92, lowEaveY = 10.02;
  // Sculpted khảm sành sứ flaming sun & twin dragons on Cung Thiên Định's Khải Thành crest
  const pearl = new THREE.SphereGeometry(0.44, 14, 10);
  pearl.scale(1, 1.18, 0.45);
  pearl.translate(0, ridgeY + 0.65, 0);
  parts.push(paint(pearl, 0xe86834));
  parts.push(latheGourd(0, ridgeY + 0.02, 0, 0.46, 0xe8c45e));
  parts.push(...sculptedDragon(0, ridgeY, 0, 1, 3.6, 1.05));
  parts.push(...sculptedDragon(0, ridgeY, 0, -1, 3.6, 1.05));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 4.4, ridgeY - 0.06, 0, 0.8, 0xd9c9a8));
  // 4 upper corner scrolls on Khải Thành + 4 lower corner scrolls on Cung Thiên Định
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 9.8, eaveY, sv * 9.4, su * 0.72, sv * 0.72, 1.1));
    parts.push(cornerScroll(su * 17.6, lowEaveY, sv * 11.8, su * 0.75, sv * 0.75, 1.2));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'khaidinh_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Lăng Tự Đức (Điện Hòa Khiêm) hero accent .glb
// Matches tuduc.js: anchor at Hòa Khiêm center [-2450.9, 4024.8], rotY = -1.5011,
// main rear ridge at z = +4.83, y = 7.52; front hall ridge at z = -7.25, y = 6.72.
function buildTuDucHero() {
  const parts = [];
  const zMain = 4.83, zFront = -7.25, rMain = 7.52, rFront = 6.72, eaveY = 4.9;
  const pearl = new THREE.SphereGeometry(0.42, 14, 10);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, rMain + 0.62, zMain);
  parts.push(paint(pearl, 0xea6434));
  parts.push(latheGourd(0, rMain + 0.02, zMain, 0.45, 0xe8c45e));
  parts.push(...sculptedDragon(0, rMain, zMain, 1, 4.6, 1.05));
  parts.push(...sculptedDragon(0, rMain, zMain, -1, 4.6, 1.05));
  for (const s of [-1, 1]) {
    parts.push(latheGourd(s * 8.2, rMain - 0.06, zMain, 0.85, 0xe8c45e));
    parts.push(latheGourd(s * 9.6, rFront - 0.06, zFront, 0.75, 0xe8c45e));
  }
  parts.push(latheGourd(0, rFront + 0.02, zFront, 0.9, 0xe8c45e));
  // 4 corner scrolls on main roof + 4 on front roof
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 16.0, eaveY, zMain + sv * 8.0, su * 0.72, sv * 0.72, 1.05));
    parts.push(cornerScroll(su * 16.0, eaveY - 0.15, zFront + sv * 5.6, su * 0.72, sv * 0.72, 0.95));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'tuduc_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Lăng Minh Mạng (Minh Lâu) hero accent .glb
// Matches minhmang.js: anchor at Minh Lâu center [-2196.59, 8971.75], rotY = 1.4515,
// two-storey square pavilion rising to ridge y = 13.5 above ground.
function buildMinhMangHero() {
  const parts = [];
  // Tall golden pháp lam lotus-gourd finial at Minh Lâu's apex
  parts.push(latheGourd(0, 13.45, 0, 1.55, 0xe8c45e));
  // 4 sweeping corner scrolls on the upper square roof + 4 on the lower square roof
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 4.5, 11.1, sv * 4.5, su * 0.72, sv * 0.72, 1.1));
    parts.push(cornerScroll(su * 6.5, 8.45, sv * 6.5, su * 0.75, sv * 0.75, 1.15));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'minhmang_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Hiển Lâm Các hero accent .glb (3-tier memorial pavilion in front of Thế Miếu)
// Matches hienlam.js: anchor [-1260.15, 238.25], rotY = 0.6498;
// Tier 1 eave y = 4.95, Tier 2 eave y = 9.45, Tier 3 eave y = 12.65, apex y = 15.35 above ground.
function buildHienLamHero() {
  const parts = [];
  // Sculpted golden pháp lam lotus-gourd spire crowning the 3rd tier apex
  parts.push(latheGourd(0, 15.35, 0, 1.45, 0xe8c45e));
  // Curved golden đao mái corner scrolls across all 3 roof tiers (12 corners total)
  const tiers = [
    [4.95, 11.4, 6.5, 1.05],
    [9.45, 7.5, 4.5, 0.95],
    [12.65, 3.9, 3.6, 0.85],
  ];
  for (const [ty, eu, ev, sc] of tiers) {
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      parts.push(cornerScroll(su * eu, ty + 0.1, sv * ev, su * 0.72, sv * 0.72, sc));
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'hienlam_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Thế Miếu hero accent .glb (55 m dynastic temple behind Hiển Lâm Các)
// Matches themieu.js: anchor [-1293.6, 191.8], rotY = 0.6335;
// Main rear hall v = -3.1, eave y = 7.0, ridge y = 11.5; Front hall v = +7.8, eave y = 4.6, ridge y = 7.9.
function buildTheMieuHero() {
  const parts = [];
  // Main rear roof: Lưỡng Long Chầu Nhật + flaming sun pearl + turned end gourds + corner scrolls
  const zm = -3.1, ym = 11.54;
  const pearlM = new THREE.SphereGeometry(0.46, 14, 10);
  pearlM.scale(1, 1.15, 0.45);
  pearlM.translate(0, ym + 0.68, zm);
  parts.push(paint(pearlM, 0xea6434));
  parts.push(latheGourd(0, ym + 0.02, zm, 0.48, 0xe8c45e));
  parts.push(...sculptedDragon(0, ym, zm, 1, 5.4, 1.15));
  parts.push(...sculptedDragon(0, ym, zm, -1, 5.4, 1.15));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 16.5, ym - 0.06, zm, 0.9, 0xe8c45e));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 24.7, 7.1, zm + sv * 8.2, su * 0.72, sv * 0.72, 1.2));
  }
  // Front hall roof: sculpted dragons + pearl + corner scrolls
  const zf = 7.8, yf = 7.94;
  const pearlF = new THREE.SphereGeometry(0.38, 12, 8);
  pearlF.scale(1, 1.15, 0.45);
  pearlF.translate(0, yf + 0.58, zf);
  parts.push(paint(pearlF, 0xea6434));
  parts.push(...sculptedDragon(0, yf, zf, 1, 4.4, 0.95));
  parts.push(...sculptedDragon(0, yf, zf, -1, 4.4, 0.95));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 27.9, 4.7, zf + sv * 6.7, su * 0.72, sv * 0.72, 1.05));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'themieu_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Phu Văn Lâu hero accent .glb (2-storey royal edict pavilion on the Citadel axis)
// Matches phuvanlau.js: anchor [-851.75, 375.95], rotY = 0.6125;
// Lower eave y = 4.2, upper eave y = 8.3, upper ridge y = 10.12.
function buildPhuVanLauHero() {
  const parts = [];
  const ry = 10.14;
  const pearl = new THREE.SphereGeometry(0.34, 12, 8);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ry + 0.52, 0);
  parts.push(paint(pearl, 0xea6434));
  parts.push(latheGourd(0, ry + 0.02, 0, 0.36, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 2.2, 0.8));
  parts.push(...sculptedDragon(0, ry, 0, -1, 2.2, 0.8));
  // 4 upper + 4 lower golden đao mái corner scrolls
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 2.7, 8.35, sv * 2.6, su * 0.72, sv * 0.72, 0.85));
    parts.push(cornerScroll(su * 6.15, 4.25, sv * 5.9, su * 0.72, sv * 0.72, 0.95));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'phuvanlau_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Nghênh Lương Đình hero accent .glb (royal river pavilion on the Perfume River)
// Matches nghenhluong.js: anchor [-794.62, 452.46], rotY = -2.5376;
// Lower eave y = 4.1, upper eave y = 5.5, upper ridge y = 7.12.
function buildNghenhLuongHero() {
  const parts = [];
  const ry = 7.14;
  const pearl = new THREE.SphereGeometry(0.34, 12, 8);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ry + 0.52, 0);
  parts.push(paint(pearl, 0xea6434));
  parts.push(latheGourd(0, ry + 0.02, 0, 0.36, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 2.1, 0.78));
  parts.push(...sculptedDragon(0, ry, 0, -1, 2.1, 0.78));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 2.85, 5.55, sv * 2.55, su * 0.72, sv * 0.72, 0.82));
    parts.push(cornerScroll(su * 5.15, 4.15, sv * 5.15, su * 0.72, sv * 0.72, 0.9));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'nghenhluong_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Cung An Định hero accent .glb (Khải Tường Lâu palace + Đình Trung Lập octagonal pavilion)
// Matches andinh.js: anchor [1008.95, 1355.83], rotY = 0.4527;
// Twin towers at u = ±9.1, v = 4.8, crown top y = 16.95; center ridge at v = -4.05, y = 13.4;
// Đình Trung Lập octagonal pavilion at u = -0.3, v = 17.7, roof cap y = 9.0, eave y = 5.8.
function buildAnDinhHero() {
  const parts = [];
  // Turned neoclassical gilded finials on Khải Tường Lâu's twin front towers & center frontispiece
  for (const su of [-1, 1]) {
    parts.push(latheGourd(su * 9.1, 16.95, 4.8, 1.05, 0xe8c45e));
    for (const [du, dv] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) {
      parts.push(latheGourd(su * 9.1 + du, 15.0, 4.8 + dv, 0.65, 0xf1ead8));
    }
  }
  // Center frontispiece & main ridge gilded urn finials
  parts.push(latheGourd(0, 13.45, 2.75, 0.95, 0xe8c45e));
  for (const su of [-3.8, 0, 3.8]) parts.push(latheGourd(su, 13.4, -4.05, 0.78, 0xe8c45e));
  // Đình Trung Lập octagonal pavilion: sculpted golden spire + 8 curved đao mái dragon scrolls
  const px = -0.3, pz = 17.7;
  parts.push(latheGourd(px, 9.0, pz, 1.15, 0xe8c45e));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    parts.push(cornerScroll(px + Math.cos(a) * 4.4, 5.8, pz + Math.sin(a) * 4.4, Math.cos(a) * 0.65, Math.sin(a) * 0.65, 0.8));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'andinh_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Điện Cần Chánh hero accent .glb (Tử Cấm Thành daily audience hall)
function buildCanChanhHero() {
  const parts = [];
  const zm = -6.0, ym = 10.88, eaveY = 7.72;
  const pearl = new THREE.SphereGeometry(0.46, 14, 10);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ym + 0.68, zm);
  parts.push(paint(pearl, 0xea6434));
  parts.push(latheGourd(0, ym + 0.02, zm, 0.48, 0xe8c45e));
  parts.push(...sculptedDragon(0, ym, zm, 1, 5.2, 1.15));
  parts.push(...sculptedDragon(0, ym, zm, -1, 5.2, 1.15));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 11.8, ym - 0.06, zm, 0.88, 0xe8c45e));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 17.6, eaveY, zm + sv * 7.3, su * 0.72, sv * 0.72, 1.15));
  }
  // Front hall ridge ornament
  const zf = 8.7, yf = 8.38;
  parts.push(latheGourd(0, yf, zf, 0.85, 0xe8c45e));
  parts.push(...sculptedDragon(0, yf, zf, 1, 3.8, 0.9));
  parts.push(...sculptedDragon(0, yf, zf, -1, 3.8, 0.9));
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'canchanh_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Cung Diên Thọ hero accent .glb (Queen Mothers' Palace)
function buildDienThoHero() {
  const parts = [];
  const zm = -5.4, ym = 8.58, zf = 7.0, yf = 7.18;
  parts.push(latheGourd(0, ym + 0.02, zm, 1.1, 0xe8c45e));
  parts.push(...sculptedDragon(0, ym, zm, 1, 4.4, 1.0));
  parts.push(...sculptedDragon(0, ym, zm, -1, 4.4, 1.0));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 9.6, ym - 0.06, zm, 0.82, 0xe8c45e));
  parts.push(latheGourd(0, yf + 0.02, zf, 0.88, 0xe8c45e));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 18.4, 4.42, zm + sv * 8.6, su * 0.72, sv * 0.72, 1.05));
    parts.push(cornerScroll(su * 18.4, 3.92, zf + sv * 6.3, su * 0.72, sv * 0.72, 0.95));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'dientho_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Thái Miếu hero accent .glb (71 m dynastic temple of the nine Nguyễn lords)
function buildThaiMieuHero() {
  const parts = [];
  const zm = -0.85, ym = 11.04, zf = 10.4, yf = 7.94;
  const pearlM = new THREE.SphereGeometry(0.48, 14, 10);
  pearlM.scale(1, 1.15, 0.45);
  pearlM.translate(0, ym + 0.7, zm);
  parts.push(paint(pearlM, 0xea6434));
  parts.push(latheGourd(0, ym + 0.02, zm, 0.5, 0xe8c45e));
  parts.push(...sculptedDragon(0, ym, zm, 1, 5.8, 1.18));
  parts.push(...sculptedDragon(0, ym, zm, -1, 5.8, 1.18));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 26.0, ym - 0.06, zm, 0.95, 0xe8c45e));
  const pearlF = new THREE.SphereGeometry(0.4, 12, 8);
  pearlF.scale(1, 1.15, 0.45);
  pearlF.translate(0, yf + 0.58, zf);
  parts.push(paint(pearlF, 0xea6434));
  parts.push(...sculptedDragon(0, yf, zf, 1, 4.6, 0.95));
  parts.push(...sculptedDragon(0, yf, zf, -1, 4.6, 0.95));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 36.0, 5.7, zm + sv * 8.2, su * 0.72, sv * 0.72, 1.2));
    parts.push(cornerScroll(su * 36.0, 4.7, zf + sv * 6.2, su * 0.72, sv * 0.72, 1.05));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'thaimieu_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Duyệt Thị Đường hero accent .glb (Royal Theatre in Tử Cấm Thành)
function buildDuyetThiHero() {
  const parts = [];
  const ry = 11.84;
  const pearl = new THREE.SphereGeometry(0.42, 14, 10);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ry + 0.62, 0);
  parts.push(paint(pearl, 0xea6434));
  parts.push(latheGourd(0, ry + 0.02, 0, 0.45, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 4.4, 1.05));
  parts.push(...sculptedDragon(0, ry, 0, -1, 4.4, 1.05));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 13.0, ry - 0.06, 0, 0.9, 0xd9d2c2));
  // 4 curved corner scrolls on the lower hipped skirt
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 19.6, 4.68, sv * 11.6, su * 0.72, sv * 0.72, 1.05));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'duyetthi_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Triệu Miếu hero accent .glb (Temple of Nguyễn Kim)
function buildTrieuMieuHero() {
  const parts = [];
  const zm = -4.35, ym = 8.74, zf = 5.55, yf = 6.34;
  parts.push(latheGourd(0, ym + 0.02, zm, 1.0, 0xe8c45e));
  parts.push(...sculptedDragon(0, ym, zm, 1, 3.8, 0.92));
  parts.push(...sculptedDragon(0, ym, zm, -1, 3.8, 0.92));
  parts.push(latheGourd(0, yf + 0.02, zf, 0.8, 0xe8c45e));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 12.4, 4.78, zm + sv * 6.9, su * 0.72, sv * 0.72, 0.95));
    parts.push(cornerScroll(su * 12.4, 3.78, zf + sv * 5.6, su * 0.72, sv * 0.72, 0.88));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'trieumieu_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Cung Trường Sanh hero accent .glb (Thọ Khang royal residence)
function buildTruongSanhHero() {
  const parts = [];
  // In Three.js rotY = -ANG maps local +Z to -F, so v = -10.0 is local z = +10.0
  const zm = 10.0, ym = 8.54;
  const pearl = new THREE.SphereGeometry(0.38, 12, 8);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ym + 0.56, zm);
  parts.push(paint(pearl, 0xea6434));
  parts.push(...sculptedDragon(0, ym, zm, 1, 3.6, 0.9));
  parts.push(...sculptedDragon(0, ym, zm, -1, 3.6, 0.9));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 8.4, ym - 0.06, zm, 0.8, 0xd8d2c2));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 11.2, 4.05, zm + sv * 4.8, su * 0.72, sv * 0.72, 0.9));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'truongsanh_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Tàng Thư Lâu hero accent .glb (Imperial Archive on Học Hải lake island)
function buildTangThuLauHero() {
  const parts = [];
  const ry = 11.18, eaveY = 7.95;
  parts.push(latheGourd(0, ry + 0.02, 0, 1.05, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 4.2, 0.95));
  parts.push(...sculptedDragon(0, ry, 0, -1, 4.2, 0.95));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 12.8, ry - 0.06, 0, 0.85, 0xddd2b8));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 19.6, eaveY, sv * 7.2, su * 0.72, sv * 0.72, 0.92));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'tangthulau_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Hưng Miếu hero accent .glb (temple of Gia Long's parents behind Thế Miếu)
function buildHungMieuHero() {
  const parts = [];
  const zm = -4.0, ym = 7.3, eaveU = 5.3, eaveL = 4.02;
  const pearl = new THREE.SphereGeometry(0.36, 12, 8);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ym + 0.54, zm);
  parts.push(paint(pearl, 0xea6434));
  parts.push(latheGourd(0, ym + 0.02, zm, 0.38, 0xe8c45e));
  parts.push(...sculptedDragon(0, ym, zm, 1, 3.2, 0.85));
  parts.push(...sculptedDragon(0, ym, zm, -1, 3.2, 0.85));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 3.8, ym - 0.05, zm, 0.72, 0xe8c45e));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 7.3, eaveU, zm + sv * 3.8, su * 0.72, sv * 0.72, 0.88));
    parts.push(cornerScroll(su * 9.8, eaveL, zm + sv * 5.9, su * 0.72, sv * 0.72, 0.95));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'hungmieu_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Bảo tàng Cổ vật Cung đình (Điện Long An) hero accent .glb
function buildBaoTangCoVatHero() {
  const parts = [];
  const zm = -5.9, ym = 9.04, zf = 8.25, yf = 6.44;
  const pearl = new THREE.SphereGeometry(0.42, 14, 10);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ym + 0.62, zm);
  parts.push(paint(pearl, 0xea6434));
  parts.push(latheGourd(0, ym + 0.02, zm, 0.44, 0xe8c45e));
  parts.push(...sculptedDragon(0, ym, zm, 1, 4.4, 1.0));
  parts.push(...sculptedDragon(0, ym, zm, -1, 4.4, 1.0));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 9.5, ym - 0.06, zm, 0.82, 0xe8c45e));
  parts.push(latheGourd(0, yf + 0.02, zf, 0.92, 0xe8c45e));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 14.1, 6.4, zm + sv * 6.05, su * 0.72, sv * 0.72, 1.02));
    parts.push(cornerScroll(su * 19.6, 4.45, zf + sv * 6.8, su * 0.72, sv * 0.72, 0.96));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'baotangcovat_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Quốc Tử Giám (Di Luân Đường) hero accent .glb
function buildQuocTuGiamHero() {
  const parts = [];
  const zm = -2.8;
  parts.push(latheGourd(0, 9.02, zm, 1.35, 0xe8c45e));
  parts.push(latheGourd(0, 5.4, 8.2, 0.82, 0xe8c45e));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 6.7, 7.25, zm + sv * 6.7, su * 0.72, sv * 0.72, 0.96));
    parts.push(cornerScroll(su * 9.9, 4.15, zm + sv * 9.4, su * 0.72, sv * 0.72, 1.02));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'quoctugiam_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Lầu Tứ Phương Vô Sự hero accent .glb (Bắc Khuyết Đài north bastion pavilion)
function buildTuPhuongHero() {
  const parts = [];
  const ry = 14.05, eaveU = 10.95, eaveL = 7.35;
  const pearl = new THREE.SphereGeometry(0.38, 12, 8);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ry + 0.56, 0);
  parts.push(paint(pearl, 0xea6434));
  parts.push(latheGourd(0, ry + 0.02, 0, 0.42, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 2.4, 0.82));
  parts.push(...sculptedDragon(0, ry, 0, -1, 2.4, 0.82));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 6.1, eaveU, sv * 5.6, su * 0.72, sv * 0.72, 0.92));
    parts.push(cornerScroll(su * 7.55, eaveL, sv * 7.05, su * 0.72, sv * 0.72, 0.92));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'tuphuong_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Bia Quốc Học hero accent .glb (1920 riverside memorial screen)
function buildBiaQuocHocHero() {
  const parts = [];
  const ry = 9.65;
  parts.push(latheGourd(0, ry + 0.02, 0, 1.15, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 1.8, 0.72));
  parts.push(...sculptedDragon(0, ry, 0, -1, 1.8, 0.72));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 2.2, 8.45, sv * 1.1, su * 0.72, sv * 0.72, 0.7));
    parts.push(cornerScroll(su * 3.7, 6.15, sv * 1.4, su * 0.72, sv * 0.72, 0.78));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'biaquochoc_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Thương Bạc Đình hero accent .glb (octagonal riverside pavilion)
function buildThuongBacHero() {
  const parts = [];
  const ry = 7.58;
  const pearl = new THREE.SphereGeometry(0.32, 12, 8);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ry + 0.48, 0);
  parts.push(paint(pearl, 0xea6434));
  parts.push(latheGourd(0, ry + 0.02, 0, 0.35, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 1.6, 0.7));
  parts.push(...sculptedDragon(0, ry, 0, -1, 1.6, 0.7));
  // 8 octagonal lower eave corner scrolls + 4 upper corner scrolls
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    parts.push(cornerScroll(Math.cos(a) * 5.0, 4.42, Math.sin(a) * 5.0, Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.72));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'thuongbac_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Chùa Từ Đàm hero accent .glb (Chánh điện main ridge dragons & gilded dharma spire)
function buildTuDamHero() {
  const parts = [];
  const ry = 16.18;
  const pearl = new THREE.SphereGeometry(0.44, 14, 10);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(0, ry + 0.65, 0);
  parts.push(paint(pearl, 0xe8b83a));
  parts.push(latheGourd(0, ry + 0.02, 0, 0.45, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 4.4, 1.05));
  parts.push(...sculptedDragon(0, ry, 0, -1, 4.4, 1.05));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 9.5, 12.8, sv * 4.5, su * 0.72, sv * 0.72, 0.95));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'tudam_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Sculpted imperial bronze ceremonial incense cauldron (đỉnh đồng) on tripod legs with twin dragon handles
function bronzeCauldron(cx, cy, cz, scale = 1.0, bodyCol = 0x5c4c36, trimCol = 0x9e8248) {
  const parts = [];
  // Carved octagonal stone plinth
  const plinth = new THREE.CylinderGeometry(0.62 * scale, 0.72 * scale, 0.34 * scale, 8);
  plinth.translate(cx, cy + 0.17 * scale, cz);
  parts.push(paint(plinth, 0x9b9589));
  // Three tripod legs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const lx = Math.cos(a) * 0.36 * scale, lz = Math.sin(a) * 0.36 * scale;
    const leg = new THREE.CylinderGeometry(0.065 * scale, 0.085 * scale, 0.52 * scale, 8);
    leg.translate(cx + lx, cy + 0.56 * scale, cz + lz);
    parts.push(paint(leg, bodyCol));
  }
  // Lathe cauldron belly + flared rim + domed pierced lid
  const pts = [
    [0.01, 0.58], [0.34, 0.60], [0.54, 0.80], [0.58, 1.04],
    [0.44, 1.24], [0.52, 1.32], [0.46, 1.36], [0.36, 1.48],
    [0.16, 1.64], [0.09, 1.78], [0.14, 1.88], [0.02, 2.02],
  ].map(([r, y]) => new THREE.Vector2(r * scale, y * scale));
  const body = new THREE.LatheGeometry(pts, 18);
  body.translate(cx, cy, cz);
  parts.push(paint(body, bodyCol));
  // Raised gilded belly band & finial knob
  const band = new THREE.TorusGeometry(0.57 * scale, 0.035 * scale, 8, 20);
  band.rotateX(Math.PI / 2);
  band.translate(cx, cy + 0.98 * scale, cz);
  parts.push(paint(band, trimCol));
  // Twin arched dragon ear handles
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cx + s * 0.48 * scale, cy + 1.05 * scale, cz),
      new THREE.Vector3(cx + s * 0.72 * scale, cy + 1.24 * scale, cz),
      new THREE.Vector3(cx + s * 0.68 * scale, cy + 1.48 * scale, cz),
      new THREE.Vector3(cx + s * 0.44 * scale, cy + 1.32 * scale, cz),
    ]);
    parts.push(paint(new THREE.TubeGeometry(curve, 12, 0.055 * scale, 6, false), trimCol));
  }
  return parts;
}

// Build Quốc Học Huế Tam Quan Gate hero accent .glb (imperial yellow-tiled gate on Lê Lợi)
function buildQuocHocHero() {
  const parts = [];
  const ry = 6.55;
  // Flaming sun disc (mặt nguyệt) & flanking imperial dragons on upper ridge
  const disc = new THREE.SphereGeometry(0.36, 14, 10);
  disc.scale(1, 1.15, 0.35);
  disc.translate(0, ry + 0.48, 0);
  parts.push(paint(disc, 0xe8b83a));
  parts.push(latheGourd(0, ry + 0.02, 0, 0.32, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 1.8, 0.68));
  parts.push(...sculptedDragon(0, ry, 0, -1, 1.8, 0.68));
  // Upper & lower vọng lâu eave corner scrolls + side bay eave corner scrolls
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 2.5, 5.60, sv * 1.15, su * 0.65, sv * 0.65, 0.72));
    parts.push(cornerScroll(su * 3.35, 4.35, sv * 1.65, su * 0.72, sv * 0.72, 0.78));
  }
  for (const sg of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(sg * 4.65, 3.70, sv * 1.35, sg * 0.55, sv * 0.55, 0.6));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'quochoc_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Lăng Đồng Khánh — Điện Ngưng Hy hero accent .glb (triple-roof imperial temple hall)
function buildDongKhanhHero() {
  const parts = [];
  // Main house (z = 0, ry = 8.64), front house (z = -8.0, ry = 7.94), rear house (z = +8.0, ry = 7.64)
  const ridges = [
    { z: 0, ry: 8.64, span: 5.4, sc: 1.05, hw: 13.5, hd: 4.9, eaveY: 4.68 },
    { z: -8.0, ry: 7.94, span: 4.8, sc: 0.92, hw: 13.5, hd: 4.9, eaveY: 4.28 },
    { z: 8.0, ry: 7.64, span: 4.4, sc: 0.88, hw: 12.5, hd: 4.9, eaveY: 4.28 },
  ];
  for (const r of ridges) {
    parts.push(latheGourd(0, r.ry + 0.02, r.z, r.sc * 0.9, 0xe8c45e));
    parts.push(...sculptedDragon(0, r.ry, r.z, 1, r.span, r.sc));
    parts.push(...sculptedDragon(0, r.ry, r.z, -1, r.span, r.sc));
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      parts.push(cornerScroll(su * r.hw, r.eaveY, r.z + sv * r.hd, su * 0.72, sv * 0.72, 0.92));
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'dongkhanh_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Lăng Thiệu Trị — Đức Hinh Lâu hero accent .glb (two-storey square imperial lầu)
function buildThieuTriHero() {
  const parts = [];
  const ry = 12.20;
  // Crown lotus-gourd finial + flanking dragons on upper square ridge
  parts.push(latheGourd(0, ry + 0.02, 0, 1.35, 0xf1d77a));
  parts.push(...sculptedDragon(0, ry - 0.05, 0, 1, 2.2, 0.85));
  parts.push(...sculptedDragon(0, ry - 0.05, 0, -1, 2.2, 0.85));
  // 4 upper roof eave corner scrolls + 4 lower skirt eave corner scrolls
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 6.5, 9.40, sv * 6.5, su * 0.85, sv * 0.85, 1.0));
    parts.push(cornerScroll(su * 8.8, 5.80, sv * 8.8, su * 0.92, sv * 0.92, 1.1));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'thieutri_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Kỳ Đài (Flag Tower of Huế Citadel) hero accent .glb (flagpole crown + twin guard huts + bollards)
function buildKyDaiHero() {
  const parts = [];
  // Gilded lotus-gourd finial & collar atop the 37 m flagpole
  parts.push(latheGourd(0, 55.45, 0, 1.25, 0xe8c45e));
  const collar = new THREE.TorusGeometry(0.46, 0.08, 8, 18);
  collar.rotateX(Math.PI / 2);
  collar.translate(0, 55.28, 0);
  parts.push(paint(collar, 0xc9b26a));
  // Twin guard huts (điếm canh) at x = ±14.88, z = -4.39: ridge finials + 4 upturned corner scrolls each
  for (const sg of [-1, 1]) {
    const hx = sg * 14.88, hz = -4.39;
    parts.push(latheGourd(hx, 22.85, hz, 0.65, 0xc9b99a));
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      parts.push(cornerScroll(hx + su * 2.2, 21.35, hz + sv * 2.3, su * 0.55, sv * 0.55, 0.62));
    }
  }
  // Sculpted stone lotus finials on the 4 tier-3 guy-line bollards
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(latheGourd(su * 16.38, 19.70, sv * 7.69, 0.55, 0xa8a08e));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'kydai_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Hổ Quyền (Royal Tiger & Elephant Arena) hero accent .glb (king's stand lotus finials & cornice crest)
function buildHoQuyenHero() {
  const parts = [];
  // 5 sculpted limestone lotus-bud finials along king's stand front parapet (x = 2.43, y = 6.38)
  for (let k = 0; k <= 4; k++) {
    const z = -4.08 + (8.16 * k) / 4;
    parts.push(latheGourd(2.43, 6.38, z, k % 4 ? 0.52 : 0.68, 0xb5b1a7));
  }
  // 2 side return parapet finials (x = -1.45, z = ±4.08, y = 6.38)
  for (const s of [-1, 1]) {
    parts.push(latheGourd(-1.45, 6.38, s * 4.08, 0.56, 0xb5b1a7));
  }
  // 5 arena-edge royal dais finials (x = -4.23, y = 7.68)
  for (let k = 0; k <= 4; k++) {
    const z = -3.8 + (7.6 * k) / 4;
    parts.push(latheGourd(-4.23, 7.68, z, 0.48, 0xb5b1a7));
  }
  // Sculpted moulded crest scroll above the north face royal plaque (x = 2.60, y = 4.65)
  const crest = new THREE.TorusGeometry(0.42, 0.07, 8, 16, Math.PI);
  crest.rotateY(Math.PI / 2);
  crest.translate(2.60, 4.48, 0);
  parts.push(paint(crest, 0x9c988f));
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'hoquyen_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Đàn Nam Giao hero accent .glb (ceremonial imperial bronze tripods & Viên Đàn lotus finials)
function buildNamGiaoHero() {
  const parts = [];
  const yTop = 4.86;
  // Central imperial bronze incense cauldron + flanking ceremonial urns on Viên Đàn
  parts.push(...bronzeCauldron(0, yTop, 0, 1.35));
  parts.push(...bronzeCauldron(-4.8, yTop, 0, 0.85));
  parts.push(...bronzeCauldron(4.8, yTop, 0, 0.85));
  // 8 sculpted blue-glazed stone lotus-bud finials crowning the Viên Đàn stair-head piers
  const rm = 20.1, W3 = [5, 5, 7.5, 5];
  const card = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (let i = 0; i < 4; i++) {
    const [du, dv] = card[i];
    const g = W3[i] / 2 + 0.6;
    for (const sd of [-1, 1]) {
      const a = Math.atan2(dv, du) + sd * Math.asin(g / rm);
      parts.push(latheGourd(Math.cos(a) * rm, 5.91, Math.sin(a) * rm, 0.62, 0x4c7faf));
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'namgiao_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Đàn Xã Tắc hero accent .glb (imperial Earth & Grain bronze cauldron + altar corner & stair finials)
function buildXaTacHero() {
  const parts = [];
  const yTop = 1.60;
  // Central imperial ceremonial bronze cauldron on carved stone plinth
  parts.push(...bronzeCauldron(0, yTop, 0, 1.25));
  // 4 sculpted stone ceremonial urn pedestals at the inner altar corners
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(...bronzeCauldron(su * 11.2, yTop, sv * 11.2, 0.65, 0x7a756b, 0x9e988c));
  }
  // 8 sculpted stone lotus buds on the 4 stair-head balustrade piers (A2 = 15.2, r2 = 0.2 -> edge 15.0, gap ±2.2)
  for (const s of [-1, 1]) {
    for (const g of [-2.2, 2.2]) {
      parts.push(latheGourd(g, 2.54, s * 15.0, 0.48, 0xa8a397));
      parts.push(latheGourd(s * 15.0, 2.54, g, 0.48, 0xa8a397));
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'xatac_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

const exporter = new GLTFExporter();
for (const [name, buildFn] of [
  ['ngomon-hero.glb', buildNgoMonHero],
  ['thaihoa-hero.glb', buildThaiHoaHero],
  ['thienmu-hero.glb', buildThienMuHero],
  ['khaidinh-hero.glb', buildKhaiDinhHero],
  ['tuduc-hero.glb', buildTuDucHero],
  ['minhmang-hero.glb', buildMinhMangHero],
  ['hienlam-hero.glb', buildHienLamHero],
  ['themieu-hero.glb', buildTheMieuHero],
  ['phuvanlau-hero.glb', buildPhuVanLauHero],
  ['nghenhluong-hero.glb', buildNghenhLuongHero],
  ['andinh-hero.glb', buildAnDinhHero],
  ['canchanh-hero.glb', buildCanChanhHero],
  ['dientho-hero.glb', buildDienThoHero],
  ['thaimieu-hero.glb', buildThaiMieuHero],
  ['duyetthi-hero.glb', buildDuyetThiHero],
  ['trieumieu-hero.glb', buildTrieuMieuHero],
  ['truongsanh-hero.glb', buildTruongSanhHero],
  ['tangthulau-hero.glb', buildTangThuLauHero],
  ['hungmieu-hero.glb', buildHungMieuHero],
  ['baotangcovat-hero.glb', buildBaoTangCoVatHero],
  ['quoctugiam-hero.glb', buildQuocTuGiamHero],
  ['tuphuong-hero.glb', buildTuPhuongHero],
  ['biaquochoc-hero.glb', buildBiaQuocHocHero],
  ['thuongbac-hero.glb', buildThuongBacHero],
  ['tudam-hero.glb', buildTuDamHero],
  ['quochoc-hero.glb', buildQuocHocHero],
  ['dongkhanh-hero.glb', buildDongKhanhHero],
  ['thieutri-hero.glb', buildThieuTriHero],
  ['kydai-hero.glb', buildKyDaiHero],
  ['hoquyen-hero.glb', buildHoQuyenHero],
  ['namgiao-hero.glb', buildNamGiaoHero],
  ['xatac-hero.glb', buildXaTacHero],
]) {
  const scene = buildFn();
  const glb = await exporter.parseAsync(scene, { binary: true });
  const outPath = path.join(OUT_DIR, name);
  fs.writeFileSync(outPath, Buffer.from(glb));
  console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB, ${scene.children[0].geometry.attributes.position.count / 3} tris)`);
}
