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

// Sculpted cathedral/abbey finial cross with stepped plinth, chamfered arms & gilded halo ring
function sculptedCross(cx, cy, cz, h = 2.8, col = 0xf2ede0, trimCol = 0xe8c45e) {
  const parts = [];
  const sc = h / 2.8;
  // Stepped octagonal base collar
  const base = new THREE.CylinderGeometry(0.24 * sc, 0.34 * sc, 0.28 * sc, 8);
  base.translate(cx, cy + 0.14 * sc, cz);
  parts.push(paint(base, trimCol));
  // Vertical shaft & horizontal crossbar
  const shaft = new THREE.BoxGeometry(0.24 * sc, h, 0.24 * sc);
  shaft.translate(cx, cy + h * 0.5, cz);
  parts.push(paint(shaft, col));
  const arm = new THREE.BoxGeometry(0.22 * sc, 0.24 * sc, 1.75 * sc);
  arm.translate(cx, cy + h * 0.68, cz);
  parts.push(paint(arm, col));
  // Flared trefoil/bud tips on top & both arms
  const topBud = new THREE.SphereGeometry(0.18 * sc, 10, 8);
  topBud.translate(cx, cy + h + 0.06 * sc, cz);
  parts.push(paint(topBud, trimCol));
  for (const s of [-1, 1]) {
    const bud = new THREE.SphereGeometry(0.16 * sc, 10, 8);
    bud.translate(cx, cy + h * 0.68, cz + s * 0.92 * sc);
    parts.push(paint(bud, trimCol));
  }
  // Radiant halo ring around the crossing
  const halo = new THREE.TorusGeometry(0.42 * sc, 0.055 * sc, 8, 20);
  halo.rotateY(Math.PI / 2);
  halo.translate(cx, cy + h * 0.68, cz);
  parts.push(paint(halo, trimCol));
  return parts;
}

// Build Cửa Hiển Nhơn (East Imperial City Gate) hero accent .glb
function buildHienNhonHero() {
  const parts = [];
  const ry = 12.60;
  // Flaming fire pearl (hỏa châu) on lotus base + flanking jade-gold porcelain-mosaic dragons
  const pearl = new THREE.SphereGeometry(0.32, 12, 10);
  pearl.scale(1, 1.15, 0.55);
  pearl.translate(0, ry + 0.62, 0);
  parts.push(paint(pearl, 0xe85a34));
  parts.push(latheGourd(0, ry + 0.05, 0, 0.45, 0xe8b83a));
  parts.push(...sculptedDragon(0, ry + 0.15, 0, 1, 2.5, 0.78));
  parts.push(...sculptedDragon(0, ry + 0.15, 0, -1, 2.5, 0.78));
  // Upper & lower yellow-glazed roof eave corner scrolls + 4 jade corner balustrade finials
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 4.25, 10.85, sv * 2.35, su * 0.72, sv * 0.72, 0.85));
    parts.push(cornerScroll(su * 6.60, 8.40, sv * 3.40, su * 0.78, sv * 0.78, 0.92));
    parts.push(latheGourd(su * 6.95, 6.82, sv * 3.75, 0.48, 0x3d8f6e));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'hiennhon_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Cửa Chương Đức (West Imperial City Gate) hero accent .glb
function buildChuongDucHero() {
  const parts = [];
  const ry = 9.55;
  // Porcelain-mosaic lotus gourd + miniature ridge dragons
  parts.push(latheGourd(0, ry + 0.02, 0, 0.95, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 1.5, 0.58));
  parts.push(...sculptedDragon(0, ry, 0, -1, 1.5, 0.58));
  // Upper & lower roof corner scrolls
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 2.25, 8.30, sv * 2.30, su * 0.62, sv * 0.62, 0.72));
    parts.push(cornerScroll(su * 5.80, 5.35, sv * 3.09, su * 0.75, sv * 0.75, 0.85));
  }
  // 8 sculpted jade-glazed lotus buds crowning the 4 front & 4 back pilaster caps
  for (const sv of [-1, 1]) for (const u of [-5.1, -1.55, 1.55, 5.1]) {
    parts.push(latheGourd(u, 5.80, sv * 2.79, 0.36, 0x3e8f6e));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'chuongduc_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Quốc Tự Diệu Đế (Đại Giác Main Hall) hero accent .glb
function buildDieuDeHero() {
  const parts = [];
  // Upper main roof ridge (z = 0, ry = 9.30)
  parts.push(latheGourd(0, 9.32, 0, 1.15, 0xe8c45e));
  parts.push(...sculptedDragon(0, 9.30, 0, 1, 5.2, 1.0));
  parts.push(...sculptedDragon(0, 9.30, 0, -1, 5.2, 1.0));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 12.9, 6.70, sv * 6.0, su * 0.78, sv * 0.78, 0.95));
  }
  // Front hall roof ridge (z = +9.5, ry = 7.70)
  parts.push(latheGourd(0, 7.72, 9.5, 0.92, 0xe8c45e));
  parts.push(...sculptedDragon(0, 7.70, 9.5, 1, 4.2, 0.85));
  parts.push(...sculptedDragon(0, 7.70, 9.5, -1, 4.2, 0.85));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 14.0, 5.10, 9.5 + sv * 5.7, su * 0.72, sv * 0.72, 0.88));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'dieude_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Chùa Báo Quốc (Chánh Điện Main Hall) hero accent .glb
function buildBaoQuocHero() {
  const parts = [];
  const ry = 9.33;
  // Gilded dharma wheel & lotus finial + twin sculpted dragons on upper ridge
  const wheel = new THREE.TorusGeometry(0.42, 0.08, 8, 18);
  wheel.translate(0, ry + 0.55, 0);
  parts.push(paint(wheel, 0xe8c45e));
  parts.push(latheGourd(0, ry + 0.02, 0, 0.42, 0xd8b454));
  parts.push(...sculptedDragon(0, ry, 0, 1, 3.4, 0.88));
  parts.push(...sculptedDragon(0, ry, 0, -1, 3.4, 0.88));
  // Upper & lower main roof corner scrolls
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 6.4, 7.58, sv * 4.4, su * 0.72, sv * 0.72, 0.88));
    parts.push(cornerScroll(su * 10.0, 5.78, sv * 7.6, su * 0.78, sv * 0.78, 0.95));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'baoquoc_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Nhà thờ Chính tòa Phủ Cam hero accent .glb (twin 43.5 m bell tower crosses, hood cross & St Peter/Paul statues)
function buildPhuCamHero() {
  const parts = [];
  // Twin 43.5 m bell tower crosses (x = 0, z = ±12.8, y = 41.95)
  for (const s of [-1, 1]) {
    parts.push(...sculptedCross(0, 41.95, s * 12.8, 3.0, 0xf2ede0, 0xe8c45e));
  }
  // Curved front hood cross (x = 0.2, z = 0, y = 21.95)
  parts.push(...sculptedCross(0.2, 21.95, 0, 2.8, 0xf2ede0, 0xe8c45e));
  // Sculpted robed marble statues of St Peter & St Paul on forecourt pedestals (x = -24.7, z = ±7.0, y = 1.85)
  for (const s of [-1, 1]) {
    const sx = -24.7, sz = s * 7.0, sy = 1.85;
    const pts = [
      [0.44, 0.0], [0.42, 0.45], [0.36, 1.05], [0.40, 1.55],
      [0.24, 1.78], [0.22, 1.98], [0.18, 2.22], [0.02, 2.34],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const fig = new THREE.LatheGeometry(pts, 14);
    fig.translate(sx, sy, sz);
    parts.push(paint(fig, 0xf2ede4));
    const halo = new THREE.TorusGeometry(0.26, 0.035, 8, 16);
    halo.rotateY(Math.PI / 2);
    halo.translate(sx - 0.08, sy + 2.15, sz);
    parts.push(paint(halo, 0xe8c45e));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'phucam_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Nhà thờ Dòng Chúa Cứu Thế hero accent .glb (53 m 3-tier octagonal bell tower cross & 24 upturned corner scrolls)
function buildDcctHero() {
  const parts = [];
  // Sculpted gilded-cream cross crowning the 53 m spire (y = 50.0)
  parts.push(...sculptedCross(0, 50.0, 0, 3.3, 0xf5ecd6, 0xe8c45e));
  // 24 upturned pagoda-style corner scrolls across all 3 octagonal tiled skirts
  for (const [rs, ye, sc] of [[8.45, 29.2, 0.95], [6.65, 33.5, 0.82], [4.85, 37.8, 0.70]]) {
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4;
      parts.push(cornerScroll(Math.cos(a) * rs, ye, Math.sin(a) * rs, Math.cos(a) * 0.72, Math.sin(a) * 0.72, sc));
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'dcct_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Đan viện Thiên An hero accent .glb (7-storey Phước Duyên-style bell tower cross & 56 glazed eave scrolls)
function buildThienAnHero() {
  const parts = [];
  // Sculpted lotus-gourd pedestal & gilded-white finial cross crowning the 7-storey tower (y = 33.95)
  parts.push(latheGourd(0, 33.45, 0, 0.65, 0xe8c45e));
  parts.push(...sculptedCross(0, 33.95, 0, 2.8, 0xf5f0e2, 0xe8c45e));
  // 56 yellow-glazed upturned corner scrolls around all 7 octagonal eaves
  const eaves = [
    [6.15, 5.90, 0.78], [5.93, 10.35, 0.75], [5.71, 14.60, 0.72], [5.49, 18.65, 0.68],
    [5.27, 22.60, 0.65], [5.05, 26.45, 0.62], [4.83, 30.20, 0.58],
  ];
  for (const [r, ye, sc] of eaves) {
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4;
      parts.push(cornerScroll(Math.cos(a) * r, ye, Math.sin(a) * r, Math.cos(a) * 0.65, Math.sin(a) * 0.65, sc));
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'thienan_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Sculpted imperial bronze armillary sphere (hồn thiên nghi) for Quan Tượng Đài
function armillarySphere(cx, cy, cz, scale = 1.0) {
  const parts = [];
  // Stepped octagonal stone pedestal
  const ped = new THREE.CylinderGeometry(0.45 * scale, 0.58 * scale, 0.72 * scale, 8);
  ped.translate(cx, cy + 0.36 * scale, cz);
  parts.push(paint(ped, 0x9b9589));
  // Bronze tripod cradle & meridian/equator/ecliptic graduated rings
  const stem = new THREE.CylinderGeometry(0.08 * scale, 0.14 * scale, 0.45 * scale, 10);
  stem.translate(cx, cy + 0.92 * scale, cz);
  parts.push(paint(stem, 0x5c4c36));
  const cyR = cy + 1.55 * scale;
  const rOuter = 0.62 * scale;
  for (const [rx, ry, rz, rad, col] of [
    [0, 0, 0, rOuter, 0x9e8248],
    [0, Math.PI / 2, 0, rOuter, 0x9e8248],
    [Math.PI / 2, 0, 0, rOuter * 0.95, 0xb89a52],
    [0.41, 0.3, 0, rOuter * 0.86, 0xd8b454],
  ]) {
    const ring = new THREE.TorusGeometry(rad, 0.036 * scale, 8, 24);
    ring.rotateX(rx);
    ring.rotateY(ry);
    ring.rotateZ(rz);
    ring.translate(cx, cyR, cz);
    parts.push(paint(ring, col));
  }
  const earth = new THREE.SphereGeometry(0.14 * scale, 12, 10);
  earth.translate(cx, cyR, cz);
  parts.push(paint(earth, 0xd8b454));
  return parts;
}

// Build Cầu Trường Tiền hero accent .glb (heritage cast-iron pier lamp globes, bow-crown finials & bridgehead standards)
function buildTruongTienHero() {
  const parts = [];
  const L = 402.6, span = L / 6, deckY = 3.80, trussZ = 3.35, railZ = 5.45;
  // 10 pier lamp posts: sculpted cast-iron scroll collars & warm heritage glass globes (y = 8.0)
  for (let i = 1; i < 6; i++) {
    const x = -L / 2 + i * span;
    for (const s of [-1, 1]) {
      const z = s * railZ;
      const cap = new THREE.CylinderGeometry(0.24, 0.14, 0.22, 10);
      cap.translate(x, deckY + 4.18, z);
      parts.push(paint(cap, 0x3b4248));
      const globe = new THREE.SphereGeometry(0.26, 12, 10);
      globe.translate(x, deckY + 4.48, z);
      parts.push(paint(globe, 0xf6e6b4));
      const tip = new THREE.ConeGeometry(0.16, 0.22, 8);
      tip.translate(x, deckY + 4.80, z);
      parts.push(paint(tip, 0x3b4248));
    }
  }
  // 12 sculpted steel-bronze crest medallions at the crown of all 6 double bow-string spans (y = 9.50)
  for (let i = 0; i < 6; i++) {
    const x = -L / 2 + (i + 0.5) * span;
    for (const s of [-1, 1]) {
      const z = s * trussZ;
      const med = new THREE.TorusGeometry(0.38, 0.07, 8, 18);
      med.translate(x, deckY + 5.75, z);
      parts.push(paint(med, 0xd8c89e));
      parts.push(latheGourd(x, deckY + 6.08, z, 0.35, 0xc8b88a));
    }
  }
  // 4 monumental heritage bridgehead lamp standards at north & south abutments
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (L / 2 - 0.5), z = sz * 5.65;
    const ped = new THREE.CylinderGeometry(0.32, 0.44, 0.9, 8);
    ped.translate(x, deckY + 0.45, z);
    parts.push(paint(ped, 0x7c7870));
    const post = new THREE.CylinderGeometry(0.11, 0.16, 3.6, 8);
    post.translate(x, deckY + 2.7, z);
    parts.push(paint(post, 0x32383e));
    const globe = new THREE.SphereGeometry(0.32, 12, 10);
    globe.translate(x, deckY + 4.75, z);
    parts.push(paint(globe, 0xf6e6b4));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'truongtien_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Chợ Đông Ba hero accent .glb (Trần Hưng Đạo entrance crest, flagpole finials & market hall roof medallions)
function buildDongBaHero() {
  const parts = [];
  // 7 gilded finial spheres atop the Trần Hưng Đạo entrance flagpoles (z = -42.8, y = 10.2)
  for (let i = 0; i < 7; i++) {
    const x = -6 + i * 2;
    const ball = new THREE.SphereGeometry(0.14, 10, 8);
    ball.translate(x, 10.28, -42.8);
    parts.push(paint(ball, 0xe8c45e));
  }
  // Twin sculpted heritage lotus-urn finials flanking the entrance LED canopy (x = ±7.0, z = -43.6, y = 6.90)
  for (const s of [-1, 1]) {
    parts.push(latheGourd(s * 7.0, 6.90, -43.6, 0.72, 0xe8c45e));
  }
  // Sculpted heritage clock-crest medallion & ridge ventilators along the 3-storey main hall parapet (z = -27.0, y = 10.90)
  const crest = new THREE.TorusGeometry(0.85, 0.14, 10, 24);
  crest.translate(0, 11.75, -27.0);
  parts.push(paint(crest, 0xd8b454));
  const dial = new THREE.CylinderGeometry(0.76, 0.76, 0.16, 20);
  dial.rotateX(Math.PI / 2);
  dial.translate(0, 11.75, -27.0);
  parts.push(paint(dial, 0xf2eee4));
  for (const s of [-1, 1]) {
    parts.push(latheGourd(s * 35.8, 10.90, -27.0, 0.65, 0xd8cdb4));
    parts.push(latheGourd(s * 35.8, 10.90, 21.3, 0.65, 0xd8cdb4));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'dongba_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Hồ Tịnh Tâm (Bồng Lai octagonal pavilion) hero accent .glb
function buildTinhTamHero() {
  const parts = [];
  // Sculpted gilded-cream lotus-gourd finial crowning the octagonal roof (y = 6.45)
  parts.push(latheGourd(0, 6.42, 0, 1.35, 0xe8d49c));
  // 8 sculpted upturned hip-corner scrolls (đầu đao) around the octagonal eaves (r = 6.6, y = 3.63)
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    parts.push(cornerScroll(Math.cos(a) * 6.6, 3.63, Math.sin(a) * 6.6, Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.85));
  }
  // Ceremonial bronze lotus incense burner inside the pavilion centre
  parts.push(...bronzeCauldron(0, 0.55, 0, 0.72));
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'tinhtam_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Quan Tượng Đài (Bát Phong imperial observatory) hero accent .glb
function buildQuanTuongHero() {
  const parts = [];
  // Imperial bronze armillary sphere (hồn thiên nghi) inside the open Bát Phong pavilion (y = 9.80)
  parts.push(...armillarySphere(0, 9.80, 0, 0.95));
  // Sculpted celadon-gold lotus-gourd spire atop the upper pyramid roof (y = 14.46)
  parts.push(latheGourd(0, 14.42, 0, 0.88, 0xd8e0c4));
  // 4 upper roof corner scrolls & 8 lower octagonal eave corner scrolls
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 1.44, 13.20, sv * 1.44, su * 0.55, sv * 0.55, 0.62));
  }
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    parts.push(cornerScroll(Math.cos(a) * 3.07, 11.94, Math.sin(a) * 3.07, Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.65));
  }
  // 4 sculpted stone lotus finials crowning the observatory deck's 4 corner bổ trụ posts
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(latheGourd(su * 7.0, 10.95, sv * 8.0, 0.52, 0xb8b0a0));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'quantuong_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Hồ Thủy Tiên (20 m coiled concrete dragon aquarium) hero accent .glb
function buildThuyTienHero() {
  const parts = [];
  // Head direction hd = [sin(-7°), -cos(-7°)] = [-0.1219, -0.9925], head P at ~31 m along hd, y = 16.66
  const hx = -0.1219, hz = -0.9925;
  const sx = -hz, sz = hx; // right vector perpendicular to hd
  const px = hx * 31.0, py = 16.66, pz = hz * 31.0;
  // Twin swept-back carved ivory-gold dragon antlers/horns curving up from the cranium
  for (const side of [-1, 1]) {
    const hornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px - hx * 1.8 + sx * side * 1.4, py + 1.8, pz - hz * 1.8 + sz * side * 1.4),
      new THREE.Vector3(px - hx * 4.2 + sx * side * 2.2, py + 3.8, pz - hz * 4.2 + sz * side * 2.2),
      new THREE.Vector3(px - hx * 6.8 + sx * side * 2.6, py + 5.2, pz - hz * 6.8 + sz * side * 2.6),
      new THREE.Vector3(px - hx * 8.2 + sx * side * 2.1, py + 6.4, pz - hz * 8.2 + sz * side * 2.1),
    ]);
    parts.push(paint(new THREE.TubeGeometry(hornCurve, 14, 0.34, 8, false), 0xd8c896));
    // Flowing twin dragon whiskers (râu rồng) curling out from the snout
    const whisk = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px + hx * 6.4 + sx * side * 1.4, py + 0.8, pz + hz * 6.4 + sz * side * 1.4),
      new THREE.Vector3(px + hx * 5.2 + sx * side * 3.8, py + 0.1, pz + hz * 5.2 + sz * side * 3.8),
      new THREE.Vector3(px + hx * 2.6 + sx * side * 4.6, py + 1.2, pz + hz * 2.6 + sz * side * 4.6),
      new THREE.Vector3(px + hx * 0.4 + sx * side * 3.9, py + 2.4, pz + hz * 0.4 + sz * side * 3.9),
    ]);
    parts.push(paint(new THREE.TubeGeometry(whisk, 14, 0.18, 6, false), 0xe0b84e));
    // Sculpted glowing amber-gold dragon eyes set under brow ridges
    const eye = new THREE.SphereGeometry(0.52, 12, 10);
    eye.translate(px + hx * 1.2 + sx * side * 2.1, py + 1.55, pz + hz * 1.2 + sz * side * 2.1);
    parts.push(paint(eye, 0xf2a830));
  }
  // Sculpted golden flaming dragon pearl (minh châu) hovering ahead of the open jaws
  const pearl = new THREE.SphereGeometry(0.95, 16, 12);
  pearl.translate(px + hx * 10.5, py + 0.6, pz + hz * 10.5);
  parts.push(paint(pearl, 0xe8b83a));
  const ring = new THREE.TorusGeometry(1.35, 0.12, 8, 22);
  ring.rotateY(Math.PI / 2 - 0.12);
  ring.translate(px + hx * 10.5, py + 0.6, pz + hz * 10.5);
  parts.push(paint(ring, 0xe86434));
  // 12 sculpted lotus lantern globes round the circular lakeside landing railing (Rp = 17.48, y = 1.46)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.15;
    const globe = new THREE.SphereGeometry(0.24, 10, 8);
    globe.translate(Math.cos(a) * 17.48, 1.68, Math.sin(a) * 17.48);
    parts.push(paint(globe, 0xece4d0));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'thuytien_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Bảo tàng Hồ Chí Minh hero accent .glb (lantern lotus finial, eave scrolls & front lotus fountain)
function buildBaoTangHcmHero() {
  const parts = [];
  // Sculpted gilded lotus-blossom finial crowning the square roof lantern (y = 21.60)
  parts.push(latheGourd(0, 21.55, 0, 1.25, 0xe8c45e));
  // 4 lantern roof corner scrolls (y = 19.0) + 4 main hip roof corner scrolls (y = 14.55)
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 6.8, 19.0, sv * 6.8, su * 0.65, sv * 0.65, 0.78));
    parts.push(cornerScroll(su * 16.25, 14.55, sv * 15.70, su * 0.75, sv * 0.75, 0.92));
  }
  // Sculpted bronze lotus-blossom tier crowning the front courtyard crescent fountain (x = 25.6, y = 2.30)
  parts.push(latheGourd(25.6, 2.25, 0, 0.92, 0xd8b24a));
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'baotanghcm_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Trung tâm Nghệ thuật Điềm Phùng Thị hero accent .glb (Indochine ridge finials & signature modular bronze/marble sculptures)
function buildDiemPhungThiHero() {
  const parts = [];
  // Sculpted Indochine ceramic ridge finials on the main villa hip roof (y = 12.0)
  for (const x of [-4.6, 0.8]) {
    parts.push(latheGourd(x, 11.98, 0, 0.58, 0xd8c8a4));
  }
  // Sculpted modular bronze/marble signature arch & crescent totems in the forecourt (Điềm Phùng Thị's 7-module language)
  const modSculpt = (cx, cy, cz, sc, col) => {
    const ped = new THREE.BoxGeometry(1.1 * sc, 0.35 * sc, 1.1 * sc);
    ped.translate(cx, cy + 0.175 * sc, cz);
    parts.push(paint(ped, 0xa8a49c));
    const arch = new THREE.TorusGeometry(0.75 * sc, 0.18 * sc, 10, 20, Math.PI);
    arch.translate(cx, cy + 0.35 * sc, cz);
    parts.push(paint(arch, col));
    const bar = new THREE.BoxGeometry(0.24 * sc, 1.65 * sc, 0.24 * sc);
    bar.translate(cx + 0.42 * sc, cy + 1.15 * sc, cz);
    parts.push(paint(bar, col));
    const disc = new THREE.TorusGeometry(0.45 * sc, 0.12 * sc, 8, 18, Math.PI * 1.35);
    disc.rotateY(Math.PI / 4);
    disc.translate(cx - 0.15 * sc, cy + 1.45 * sc, cz);
    parts.push(paint(disc, col));
  };
  modSculpt(11.4, 0.1, -3.2, 1.15, 0x5c5240); // bronze modular work by the street forecourt
  modSculpt(11.4, 0.1, 3.6, 1.05, 0xf0ece2);  // white marble modular work on the right forecourt
  modSculpt(-12.2, 0.1, 0.4, 1.25, 0x5c5240); // bronze river-end centerpiece
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'diemphungthi_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build exact per-gate Kinh Thành Citadel watchtower (vọng lâu) hero accent .glb
function buildGateWatchtowerHero(spec) {
  const parts = [];
  const { upper, lower, name } = spec;
  const ry = upper.ry;
  // Gilded flaming pearl & lotus finial + twin watchtower ridge dragons scaled to upper ridge
  const sc = Math.max(0.45, Math.min(0.85, upper.w / 7.0));
  const pearl = new THREE.SphereGeometry(0.26 * (sc / 0.65), 12, 10);
  pearl.scale(1, 1.15, 0.5);
  pearl.translate(0, ry + 0.36 * (sc / 0.65), 0);
  parts.push(paint(pearl, 0xe86434));
  parts.push(latheGourd(0, ry + 0.01, 0, 0.34 * (sc / 0.65), 0xe8c45e));
  const span = Math.max(0.95, Math.min(2.2, (upper.w - upper.d) * 0.65 + 0.85));
  parts.push(...sculptedDragon(0, ry, 0, 1, span, sc));
  parts.push(...sculptedDragon(0, ry, 0, -1, span, sc));
  // 4 upper watchtower eave corner scrolls
  const huU = upper.w / 2 + upper.over, hvU = upper.d / 2 + upper.over;
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * huU, upper.y0, sv * hvU, su * 0.55, sv * 0.55, 0.62));
  }
  // 4 lower watchtower skirt corner scrolls (when gate has a lower hip roof)
  if (lower) {
    const huL = lower.w / 2 + lower.over, hvL = lower.d / 2 + lower.over;
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      parts.push(cornerScroll(su * huL, lower.y0, sv * hvL, su * 0.62, sv * 0.62, 0.72));
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = name;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Phố Tây Walking Street hero accent .glb (festive lantern canopy & steel archway at Võ Thị Sáu × Chu Văn An)
function buildPhoTayHero() {
  const parts = [];
  // Four arched wrought-iron festival gateway ribs radiating across the walking-street intersection
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + 0.35;
    const ca = Math.cos(a), sa = Math.sin(a);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(ca * 5.2, 0.2, sa * 5.2),
      new THREE.Vector3(ca * 5.0, 4.8, sa * 5.0),
      new THREE.Vector3(ca * 2.4, 6.8, sa * 2.4),
      new THREE.Vector3(0, 7.3, 0),
    ]);
    parts.push(paint(new THREE.TubeGeometry(curve, 14, 0.12, 6, false), 0x363a3e));
    // Hanging Huế silk lanterns along each catenary rib
    const cols = [0xd83228, 0xe8b434, 0xf2ece0, 0xe85a2a];
    for (let j = 1; j <= 4; j++) {
      const t = j / 5;
      const pt = curve.getPoint(t);
      const lan = new THREE.SphereGeometry(0.28, 10, 8);
      lan.scale(0.85, 1.25, 0.85);
      lan.translate(pt.x, pt.y - 0.45, pt.z);
      parts.push(paint(lan, cols[(k + j) % cols.length]));
    }
  }
  // Central gilded lotus-lantern chandelier at the apex of the intersection canopy
  const crown = new THREE.TorusGeometry(0.95, 0.09, 8, 20);
  crown.rotateX(Math.PI / 2);
  crown.translate(0, 7.15, 0);
  parts.push(paint(crown, 0xe8b83a));
  parts.push(latheGourd(0, 7.25, 0, 0.72, 0xe8c45e));
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'photay_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Kinh Thành Huế hero accent .glb (ceremonial imperial bronze cauldron & heritage monument obelisk)
function buildKinhThanhHero() {
  const parts = [];
  parts.push(...bronzeCauldron(0, 0.05, 0, 1.35));
  for (const s of [-1, 1]) {
    const col = new THREE.CylinderGeometry(0.22, 0.28, 3.6, 8);
    col.translate(s * 3.2, 1.8, 0);
    parts.push(paint(col, 0xb8b0a0));
    parts.push(latheGourd(s * 3.2, 3.6, 0, 0.65, 0xe8c45e));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'kinhthanh_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Làng hương Thủy Xuân hero accent .glb (welcome arch ridge dragons + 6 sculpted rainbow incense bouquets)
function buildThuyXuanHero() {
  const parts = [];
  // Welcome arch crown at y = 6.95 (flanking piers at z = ±6.2)
  parts.push(latheGourd(0, 6.95, 0, 0.75, 0xe8c45e));
  parts.push(...sculptedDragon(0, 6.90, 0, 1, 2.2, 0.68));
  parts.push(...sculptedDragon(0, 6.90, 0, -1, 2.2, 0.68));
  for (const sz of [-1, 1]) {
    parts.push(latheGourd(0, 5.85, sz * 6.2, 0.55, 0xe8c45e));
  }
  // 6 signature oversized sculpted lotus-fanned rainbow incense bouquets flanking the village arch
  const colors = [0xd92638, 0xe83e8c, 0xf2b705, 0x7e3ff2, 0x17a589, 0xf37021];
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const x = -2.8 + (i % 3) * 2.8, z = side * 7.6;
    const pts = [
      [0.02, 0.0], [0.22, 0.05], [0.16, 0.45], [0.35, 0.78], [0.78, 1.18], [0.85, 1.32], [0.55, 1.44], [0.02, 1.48],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const fan = new THREE.LatheGeometry(pts, 16);
    fan.translate(x, 0.14, z);
    parts.push(paint(fan, colors[i]));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'thuyxuan_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Làng đúc đồng Phường Đúc hero accent .glb (Ancestral Hall dragons/scrolls + monumental bronze cauldron & bells)
function buildPhuongDucHero() {
  const parts = [];
  // Ancestral Hall roof (ry = 6.10, eave = 3.90, w = 12.6, d = 7.6, over = 0.9)
  parts.push(latheGourd(0, 6.10, 0, 0.85, 0xe8c45e));
  parts.push(...sculptedDragon(0, 6.08, 0, 1, 2.8, 0.78));
  parts.push(...sculptedDragon(0, 6.08, 0, -1, 2.8, 0.78));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 7.2, 3.90, sv * 4.7, su * 0.68, sv * 0.68, 0.80));
  }
  // Monumental courtyard cast-bronze cauldron (đỉnh đồng) & twin sculpted Đại Hồng Chung bells (z = 6.6)
  parts.push(...bronzeCauldron(0, 0.35, 6.6, 1.25));
  for (const s of [-1, 1]) {
    const bellPts = [
      [0.52, 0.25], [0.46, 0.55], [0.42, 1.10], [0.36, 1.45], [0.18, 1.68], [0.08, 1.85], [0.02, 1.95],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const bell = new THREE.LatheGeometry(bellPts, 16);
    bell.translate(s * 4.4, 0.35, 6.6);
    parts.push(paint(bell, 0x5c4c36));
  }
  // Village craft gate roof finial (z = 8.4, ry = 4.35)
  parts.push(latheGourd(0, 4.35, 8.4, 0.62, 0xe8c45e));
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'phuongduc_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Làng tranh Sình hero accent .glb (Nhà rường workshop dragons/scrolls + Cổng làng Sình gate ornaments)
function buildSinhHero() {
  const parts = [];
  // Main nhà rường workshop hall (ry = 6.20, eave = 3.80, w = 14.2, d = 7.4, over = 0.9)
  parts.push(latheGourd(0, 6.20, 0, 0.88, 0xe8c45e));
  parts.push(...sculptedDragon(0, 6.18, 0, 1, 3.2, 0.80));
  parts.push(...sculptedDragon(0, 6.18, 0, -1, 3.2, 0.80));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 8.0, 3.80, sv * 4.6, su * 0.68, sv * 0.68, 0.82));
  }
  // Cổng làng Sình village tam quan gate (z = -12.3, ry = 4.70, eave = 3.95)
  parts.push(latheGourd(0, 4.72, -12.3, 0.68, 0xe8c45e));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 2.05, 3.95, -12.3 + sv * 1.0, su * 0.52, sv * 0.52, 0.62));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'sinh_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Cầu Nguyễn Hoàng hero accent .glb (twin 30.6 m crane-arch lotus crowns & golden royal parasol lamp standards)
function buildNguyenHoangHero() {
  const parts = [];
  // Twin sculpted royal golden lotus crowns seated flush atop the 30.6 m arch ribs (x = 0, y = 27.6, z = ±13.0)
  for (const s of [-1, 1]) {
    parts.push(latheGourd(0, 27.55, s * 13.0, 1.1, 0xf2c844));
    const ring = new THREE.TorusGeometry(0.85, 0.11, 8, 20);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, 27.78, s * 13.0);
    parts.push(paint(ring, 0xe8b434));
  }
  // 16 sculpted golden royal parasol (lọng vàng) lamp standards with slender golden posts seated on the deck rail
  for (const s of [-1, 1]) {
    for (let k = -4; k <= 4; k++) {
      if (k === 0) continue;
      const x = k * 18.0;
      const deckY = 4.0 + 1.8 * (1 - (Math.abs(x) / 175) ** 2);
      const postH = 5.4;
      const post = new THREE.CylinderGeometry(0.08, 0.12, postH, 8);
      post.translate(x, deckY + postH / 2, s * 21.35);
      parts.push(paint(post, 0xd8a832));
      const canopy = new THREE.ConeGeometry(0.68, 0.42, 10);
      canopy.translate(x, deckY + postH + 0.12, s * 21.35);
      parts.push(paint(canopy, 0xf2c844));
      const tip = new THREE.SphereGeometry(0.14, 8, 6);
      tip.translate(x, deckY + postH + 0.44, s * 21.35);
      parts.push(paint(tip, 0xe8a428));
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'nguyenhoang_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Cầu Dã Viên / Bạch Hổ hero accent .glb (4 north-channel yellow-glazed lookout pavilions: spires & scrolls)
function buildBachHoHero() {
  const parts = [];
  // Two pairs of pavilions: at x = 0 (yE1=5.61, yE2=7.46, ry=8.96) and x = 181.8 (yE1=5.55, yE2=7.40, ry=8.90), z = ±15.8
  for (const [px, y1, y2, ry] of [[0, 5.61, 7.46, 8.96], [181.8, 5.55, 7.40, 8.90]]) {
    for (const sz of [-1, 1]) {
      const pz = sz * 15.8;
      parts.push(latheGourd(px, ry + 0.02, pz, 0.92, 0xf1d77a));
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        parts.push(cornerScroll(px + su * 2.16, y2, pz + sv * 2.16, su * 0.52, sv * 0.52, 0.62));
        parts.push(cornerScroll(px + su * 3.20, y1, pz + sv * 3.20, su * 0.62, sv * 0.62, 0.72));
      }
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'bachho_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Cồn Dã Viên hero accent .glb (1953 41.8 m Water Tower rooftop cupola, beacon mast & cornice finials)
function buildDaVienHero() {
  const parts = [];
  const yTop = 41.8;
  // Sculpted cylindrical rooftop lantern cupola & aviation beacon mast
  const cup = new THREE.CylinderGeometry(2.1, 2.35, 1.6, 16);
  cup.translate(0, yTop + 0.8, 0);
  parts.push(paint(cup, 0xc8c4ba));
  const dome = new THREE.SphereGeometry(2.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.55, 1);
  dome.translate(0, yTop + 1.6, 0);
  parts.push(paint(dome, 0xa8a49c));
  const mast = new THREE.CylinderGeometry(0.08, 0.14, 3.8, 8);
  mast.translate(0, yTop + 4.4, 0);
  parts.push(paint(mast, 0x4c5054));
  const beacon = new THREE.SphereGeometry(0.24, 10, 8);
  beacon.translate(0, yTop + 6.4, 0);
  parts.push(paint(beacon, 0xe84a34));
  // 16 sculpted concrete parapet urn finials round the 17.6 m tank rim
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    parts.push(latheGourd(Math.cos(a) * 8.65, yTop + 0.05, Math.sin(a) * 8.65, 0.48, 0xc8c4ba));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'davien_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// ---- Track N: Riverfront, Bridges, Scenic Hills, Market & Imperial City (9 hero .glb assets) ----

// Build Cầu Phú Xuân hero accent .glb (10 sculpted heritage lamp standards & mid-span river-balcony crest medallions)
function buildPhuXuanHero() {
  const parts = [];
  const yDeck = (x) => 2.16 - 0.000025 * x * x - 0.0012 * x + 0.2; // walkway kerb surface
  for (const x of [-120, -60, 0, 60, 120]) {
    const y0 = yDeck(x);
    for (const sz of [-1, 1]) {
      const z = sz * 9.85;
      // Fluted octagonal bronze pedestal seated on the walkway kerb
      const ped = new THREE.CylinderGeometry(0.24, 0.34, 1.15, 8);
      ped.translate(x, y0 + 0.575, z);
      parts.push(paint(ped, 0x3a4a44));
      const collar = new THREE.CylinderGeometry(0.28, 0.24, 0.22, 8);
      collar.translate(x, y0 + 1.24, z);
      parts.push(paint(collar, 0xc8a44a));
      // Tapered cast-iron shaft
      const shaft = new THREE.CylinderGeometry(0.08, 0.14, 5.2, 8);
      shaft.translate(x, y0 + 3.85, z);
      parts.push(paint(shaft, 0x3a4a44));
      // Twin-arm decorative heritage lantern head + central lotus crown globe
      const arm = new THREE.BoxGeometry(0.1, 0.1, 1.5);
      arm.translate(x, y0 + 6.35, z);
      parts.push(paint(arm, 0x3a4a44));
      for (const dz of [-0.72, 0, 0.72]) {
        const cup = new THREE.CylinderGeometry(0.16, 0.08, 0.18, 8);
        cup.translate(x, y0 + (dz === 0 ? 6.62 : 6.46), z + dz);
        parts.push(paint(cup, 0xc8a44a));
        const globe = new THREE.SphereGeometry(dz === 0 ? 0.26 : 0.21, 10, 8);
        globe.translate(x, y0 + (dz === 0 ? 6.92 : 6.72), z + dz);
        parts.push(paint(globe, 0xf6eed8));
      }
      // Mid-span decorative bronze crest medallion on the railing line
      if (x === 0) {
        const crest = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 12);
        crest.rotateX(Math.PI / 2);
        crest.translate(0, y0 + 0.65, sz * 10.12);
        parts.push(paint(crest, 0xd4ad42));
      }
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'phuxuan_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Cầu Gia Hội hero accent .glb (4 corner 5-globe bronze heritage lamps + 3 twin-arm median lamps)
function buildGiaHoiHero() {
  const parts = [];
  // 4 signature bronze 5-globe corner lamp standards on the deck corner parapet pilasters
  for (const x of [-21.5, 12.5]) for (const sz of [-1, 1]) {
    const z = sz * 9.8, y0 = 0.15;
    const ped = new THREE.CylinderGeometry(0.28, 0.38, 1.2, 8);
    ped.translate(x, y0 + 0.6, z);
    parts.push(paint(ped, 0x4a3d2c));
    const shaft = new THREE.CylinderGeometry(0.09, 0.15, 3.6, 8);
    shaft.translate(x, y0 + 2.95, z);
    parts.push(paint(shaft, 0x4a3d2c));
    // Cross arms carrying 4 globes + 1 crown globe
    const armX = new THREE.BoxGeometry(1.4, 0.08, 0.08);
    armX.translate(x, y0 + 4.65, z);
    parts.push(paint(armX, 0xb89448));
    const armZ = new THREE.BoxGeometry(0.08, 0.08, 1.4);
    armZ.translate(x, y0 + 4.65, z);
    parts.push(paint(armZ, 0xb89448));
    for (const [dx, dz, dy, r] of [[-0.68, 0, 0, 0.2], [0.68, 0, 0, 0.2], [0, -0.68, 0, 0.2], [0, 0.68, 0, 0.2], [0, 0, 0.35, 0.25]]) {
      const g = new THREE.SphereGeometry(r, 10, 8);
      g.translate(x + dx, y0 + 4.9 + dy, z + dz);
      parts.push(paint(g, 0xf8f0dc));
    }
  }
  // 3 sculpted twin-arm bronze median lamp standards along the centre divider
  for (const x of [-12, 0, 12]) {
    const y0 = 0.45;
    const base = new THREE.CylinderGeometry(0.22, 0.28, 0.9, 8);
    base.translate(x, y0 + 0.45, 0);
    parts.push(paint(base, 0x4a3d2c));
    const pole = new THREE.CylinderGeometry(0.08, 0.13, 5.8, 8);
    pole.translate(x, y0 + 3.8, 0);
    parts.push(paint(pole, 0x4a3d2c));
    const arm = new THREE.BoxGeometry(0.1, 0.1, 2.2);
    arm.translate(x, y0 + 6.6, 0);
    parts.push(paint(arm, 0xb89448));
    for (const sz of [-1, 1]) {
      const g = new THREE.SphereGeometry(0.24, 10, 8);
      g.translate(x, y0 + 6.85, sz * 1.08);
      parts.push(paint(g, 0xf8f0dc));
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'giahoi_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Cầu gỗ lim hero accent .glb (sculpted bronze lotus-bud boardwalk lanterns & river-view bollards)
function buildGoLimHero() {
  const parts = [];
  const yDeck = -1.4; // DECK_Y = 1.2 relative to LAND_Y = 2.6
  for (let x = -48; x <= 48; x += 16) {
    for (const sz of [-1, 1]) {
      const z = sz * 1.9;
      // Sculpted bronze lantern post rooted into the ironwood boardwalk rail
      const base = new THREE.CylinderGeometry(0.13, 0.18, 0.45, 8);
      base.translate(x, yDeck + 0.225, z);
      parts.push(paint(base, 0x5e4a32));
      const post = new THREE.CylinderGeometry(0.055, 0.08, 2.15, 8);
      post.translate(x, yDeck + 1.5, z);
      parts.push(paint(post, 0x8f7245));
      // Warm glowing lotus-bud lantern head
      const globe = new THREE.SphereGeometry(0.17, 10, 8);
      globe.scale(1, 1.35, 1);
      globe.translate(x, yDeck + 2.75, z);
      parts.push(paint(globe, 0xf8e8c0));
      parts.push(latheGourd(x, yDeck + 2.94, z, 0.26, 0xc8a454));
    }
  }
  // Two sculpted ironwood & bronze riverside viewing benches with lotus finials
  for (const bx of [-24, 24]) {
    const seat = new THREE.BoxGeometry(3.2, 0.14, 0.62);
    seat.translate(bx, yDeck + 0.48, -1.45);
    parts.push(paint(seat, 0x7c5d40));
    for (const sx of [-1.3, 1.3]) {
      const leg = new THREE.BoxGeometry(0.18, 0.48, 0.56);
      leg.translate(bx + sx, yDeck + 0.24, -1.45);
      parts.push(paint(leg, 0x4c3a28));
    }
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'golim_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Phố đi bộ Nguyễn Đình Chiểu hero accent .glb (ROUND_E bronze lotus & river-wave plaza sculpture + 6 bollards)
function buildNdChieuHero() {
  const parts = [];
  const y0 = 0.1;
  // Stepped octagonal granite plinth at the centre of the circular riverside plaza
  const p1 = new THREE.CylinderGeometry(2.3, 2.55, 0.42, 8);
  p1.translate(0, y0 + 0.21, 0);
  parts.push(paint(p1, 0xa8a39a));
  const p2 = new THREE.CylinderGeometry(1.55, 1.75, 0.58, 8);
  p2.translate(0, y0 + 0.71, 0);
  parts.push(paint(p2, 0xc4bfb5));
  // Sculpted bronze lotus-blossom & soaring river-wave monument
  const stem = new THREE.CylinderGeometry(0.32, 0.52, 1.8, 12);
  stem.translate(0, y0 + 1.9, 0);
  parts.push(paint(stem, 0x5c4a35));
  // 8 radiating sculpted bronze lotus petals
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const petal = new THREE.ConeGeometry(0.42, 1.45, 6);
    petal.scale(1, 1, 0.35);
    petal.rotateX(0.45);
    petal.rotateY(a);
    petal.translate(Math.sin(a) * 0.62, y0 + 2.75, Math.cos(a) * 0.62);
    parts.push(paint(petal, 0xc8a248));
  }
  // Soaring gilded bronze crescent / river-wave arch crowning the lotus
  const arc = new THREE.TorusGeometry(0.95, 0.14, 10, 20, Math.PI * 1.35);
  arc.rotateZ(0.35);
  arc.translate(0, y0 + 3.95, 0);
  parts.push(paint(arc, 0xdcb44c));
  parts.push(latheGourd(0, y0 + 4.9, 0, 0.65, 0xe8c458));
  // 6 sculpted heritage bronze lotus-globe bollards encircling the plaza
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const bx = Math.cos(a) * 5.2, bz = Math.sin(a) * 5.2;
    const post = new THREE.CylinderGeometry(0.11, 0.16, 1.15, 8);
    post.translate(bx, y0 + 0.575, bz);
    parts.push(paint(post, 0x4c4034));
    const globe = new THREE.SphereGeometry(0.22, 10, 8);
    globe.translate(bx, y0 + 1.32, bz);
    parts.push(paint(globe, 0xf8eed6));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'ndchieu_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Cồn Hến hero accent .glb (Chùa Pháp Hải 2-tier main hall upper ridge dragons, lotus finial, 8 corner scrolls & cauldron)
function buildConHenHero() {
  const parts = [];
  const y0 = 4.2, hw = 7.8, hd = 6.05;
  const y3 = 7.82, ry = 10.88, hw2 = 5.525, hd2 = 4.05;
  // Central golden flaming pearl / lotus gourd finial + flanking ridge dragons on the upper ridge
  parts.push(latheGourd(0, ry + 0.05, 0, 0.95, 0xe8c254));
  parts.push(...sculptedDragon(-2.1, ry + 0.12, 0, 1, 0.82, 0x3b7a5a));
  parts.push(...sculptedDragon(2.1, ry + 0.12, 0, -1, 0.82, 0x3b7a5a));
  // 4 upturned corner scrolls on both upper and lower roof tiers
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(cornerScroll(sx * hw, y0, sz * hd, sx * 0.65, sz * 0.65, 0.78));
    parts.push(cornerScroll(sx * hw2, y3, sz * hd2, sx * 0.52, sz * 0.52, 0.65));
  }
  // Ceremonial bronze incense cauldron in front of the pagoda hall
  parts.push(...bronzeCauldron(0, 0.0, 9.2, 0.95));
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'conhen_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Núi Ngự Bình hero accent .glb (sculpted royal summit stele canopy Bi Đình on the r=4.0 stone clearing)
function buildNguBinhHero() {
  const parts = [];
  const y0 = 0.56; // top of summit circular stone dais (y1 = 0.57)
  // Octagonal stone base plinth
  const plinth = new THREE.CylinderGeometry(1.75, 1.95, 0.48, 8);
  plinth.translate(0, y0 + 0.24, 0);
  parts.push(paint(plinth, 0xb2aca0));
  // Central imperial marble summit stele (Bia Ngự Bình) on a tortoise-like carved pedestal
  const base = new THREE.BoxGeometry(1.15, 0.42, 0.68);
  base.translate(0, y0 + 0.69, 0);
  parts.push(paint(base, 0x8e8980));
  const stele = new THREE.BoxGeometry(0.86, 1.75, 0.22);
  stele.translate(0, y0 + 1.75, 0);
  parts.push(paint(stele, 0x5c5a56));
  const cap = new THREE.CylinderGeometry(0.43, 0.43, 0.22, 12, 1, false, 0, Math.PI);
  cap.rotateX(Math.PI / 2);
  cap.rotateY(Math.PI / 2);
  cap.translate(0, y0 + 2.62, 0);
  parts.push(paint(cap, 0xc8a448));
  // 4 vermilion lacquered corner columns supporting a traditional glazed-tile canopy
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const col = new THREE.CylinderGeometry(0.12, 0.14, 2.95, 8);
    col.translate(sx * 1.18, y0 + 1.95, sz * 1.18);
    parts.push(paint(col, 0x982a1e));
    parts.push(cornerScroll(sx * 1.85, y0 + 3.45, sz * 1.85, sx * 0.48, sz * 0.48, 0.58));
  }
  // Pyramidal yellow-glazed canopy roof + golden lotus-gourd spire
  const roof = new THREE.ConeGeometry(2.65, 1.45, 4);
  roof.rotateY(Math.PI / 4);
  roof.translate(0, y0 + 4.15, 0);
  parts.push(paint(roof, 0xd4a438));
  parts.push(latheGourd(0, y0 + 4.88, 0, 0.85, 0xf2d264));
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'ngubinh_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Đồi Vọng Cảnh hero accent .glb (hilltop lookout pavilion lotus-gourd spire, corner scrolls & deck finials)
function buildVongCanhHero() {
  const parts = [];
  const y0 = 14.82, ry = 16.32, hw = 2.35;
  // Golden lotus-gourd spire crowning the viewpoint tower roof
  parts.push(latheGourd(0, ry + 0.04, 0, 0.98, 0xf0cc5c));
  // 4 upturned corner scrolls on the lookout pavilion eaves
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(cornerScroll(sx * hw, y0, sz * hw, sx * 0.52, sz * 0.52, 0.65));
    // Sculpted parapet finials on the upper viewing balcony corners
    parts.push(latheGourd(sx * 2.15, 11.45, sz * 2.15, 0.42, 0xd4b254));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'vongcanh_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Chợ An Cựu hero accent .glb (central pyramid-hall octagonal market cupola, dome finial & 4 hip crests)
function buildAnCuuHero() {
  const parts = [];
  const yVent = 12.85;
  // Sculpted octagonal louvered roof cupola seated on the central pyramid hall vent
  const base = new THREE.CylinderGeometry(1.15, 1.35, 0.55, 8);
  base.translate(0, yVent + 0.275, 0);
  parts.push(paint(base, 0xd8d4ca));
  const drum = new THREE.CylinderGeometry(0.98, 1.05, 1.15, 8);
  drum.translate(0, yVent + 1.12, 0);
  parts.push(paint(drum, 0x5c6468));
  const dome = new THREE.SphereGeometry(1.06, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.72, 1);
  dome.translate(0, yVent + 1.68, 0);
  parts.push(paint(dome, 0xb8523c));
  parts.push(latheGourd(0, yVent + 2.42, 0, 0.72, 0xe8c44c));
  // 4 decorative market ridge finials at the pyramid hall's 4 corners
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(latheGourd(sx * 7.35, 8.62, sz * 7.35, 0.45, 0xd8b448));
  }
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'ancuu_hero_ornaments';
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Build Hoàng thành · Đại Nội hero accent .glb (Đại Cung Môn enamel ridge dragons, flaming pearl, scrolls & cauldrons)
function buildDaiNoiHero() {
  const parts = [];
  const y0 = 4.9, yR = 8.36, hw = 12.6, hd = 5.65, gu = 9.38;
  // Sculpted golden flaming pearl (hỏa châu) + flanking imperial enamel dragons
  parts.push(latheGourd(0, yR + 0.05, 0, 1.12, 0xf2cc52));
  parts.push(...sculptedDragon(-3.4, yR + 0.14, 0, 1, 1.08, 0x2f7d58));
  parts.push(...sculptedDragon(3.4, yR + 0.14, 0, -1, 1.08, 0x2f7d58));
  // Curled ridge-end kìm finials at both gable peaks
  for (const sx of [-1, 1]) {
    parts.push(cornerScroll(sx * gu, yR, 0, sx * 0.55, 0, 0.85));
  }
  // 4 upturned imperial corner scrolls at the yellow-glazed hip eaves
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(cornerScroll(sx * hw, y0, sz * hd, sx * 0.72, sz * 0.72, 0.88));
  }
  // Pair of sculpted imperial bronze incense cauldrons flanking the front marble steps
  parts.push(...bronzeCauldron(-6.2, 0.0, 7.8, 1.05));
  parts.push(...bronzeCauldron(6.2, 0.0, 7.8, 1.05));
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'dainoi_hero_ornaments';
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
  ['hiennhon-hero.glb', buildHienNhonHero],
  ['chuongduc-hero.glb', buildChuongDucHero],
  ['dieude-hero.glb', buildDieuDeHero],
  ['baoquoc-hero.glb', buildBaoQuocHero],
  ['phucam-hero.glb', buildPhuCamHero],
  ['dcct-hero.glb', buildDcctHero],
  ['thienan-hero.glb', buildThienAnHero],
  ['truongtien-hero.glb', buildTruongTienHero],
  ['dongba-hero.glb', buildDongBaHero],
  ['tinhtam-hero.glb', buildTinhTamHero],
  ['quantuong-hero.glb', buildQuanTuongHero],
  ['thuytien-hero.glb', buildThuyTienHero],
  ['baotanghcm-hero.glb', buildBaoTangHcmHero],
  ['diemphungthi-hero.glb', buildDiemPhungThiHero],
  ['gate-quangduc-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_quangduc_hero', upper: { w: 4.6, d: 4.0, over: 0.3, y0: 15.60, ry: 17.10 } })],
  ['gate-thuongtu-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_thuongtu_hero', upper: { w: 4.9, d: 4.6, over: 0.15, y0: 16.07, ry: 16.82 } })],
  ['gate-cuahau-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_cuahau_hero', upper: { w: 4.0, d: 3.0, over: 0.45, y0: 16.35, ry: 17.15 }, lower: { w: 8.6, d: 6.2, over: 0.45, y0: 12.65 } })],
  ['gate-anhoa-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_anhoa_hero', upper: { w: 5.0, d: 3.8, over: 0.6, y0: 19.90, ry: 21.40 }, lower: { w: 11.0, d: 7.0, over: 0.8, y0: 15.30 } })],
  ['gate-chanhtay-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_chanhtay_hero', upper: { w: 2.7, d: 2.2, over: 0.28, y0: 12.86, ry: 13.66 }, lower: { w: 6.3, d: 4.8, over: 0.30, y0: 10.66 } })],
  ['gate-cuahuu-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_cuahuu_hero', upper: { w: 3.6, d: 2.8, over: 0.55, y0: 13.34, ry: 14.09 } })],
  ['gate-nhado-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_nhado_hero', upper: { w: 4.9, d: 3.9, over: 0.30, y0: 15.95, ry: 16.70 }, lower: { w: 10.2, d: 7.6, over: 0.30, y0: 12.45 } })],
  ['gate-cuangan-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_cuangan_hero', upper: { w: 4.0, d: 3.6, over: 0.50, y0: 14.80, ry: 15.95 }, lower: { w: 8.5, d: 7.0, over: 0.60, y0: 11.80 } })],
  ['gate-dongba-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_dongba_hero', upper: { w: 4.2, d: 3.4, over: 0.28, y0: 14.25, ry: 14.75 }, lower: { w: 9.6, d: 6.2, over: 0.32, y0: 11.65 } })],
  ['gate-ketrai-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_ketrai_hero', upper: { w: 6.12, d: 4.34, over: 0.68, y0: 14.226, ry: 16.436 }, lower: { w: 9.0, d: 7.0, over: 0.80, y0: 11.15 } })],
  ['photay-hero.glb', buildPhoTayHero],
  ['kinhthanh-hero.glb', buildKinhThanhHero],
  ['thuyxuan-hero.glb', buildThuyXuanHero],
  ['phuongduc-hero.glb', buildPhuongDucHero],
  ['sinh-hero.glb', buildSinhHero],
  ['nguyenhoang-hero.glb', buildNguyenHoangHero],
  ['bachho-hero.glb', buildBachHoHero],
  ['davien-hero.glb', buildDaVienHero],
  ['phuxuan-hero.glb', buildPhuXuanHero],
  ['giahoi-hero.glb', buildGiaHoiHero],
  ['golim-hero.glb', buildGoLimHero],
  ['ndchieu-hero.glb', buildNdChieuHero],
  ['conhen-hero.glb', buildConHenHero],
  ['ngubinh-hero.glb', buildNguBinhHero],
  ['vongcanh-hero.glb', buildVongCanhHero],
  ['ancuu-hero.glb', buildAnCuuHero],
  ['dainoi-hero.glb', buildDaiNoiHero],
]) {
  const scene = buildFn();
  const glb = await exporter.parseAsync(scene, { binary: true });
  const outPath = path.join(OUT_DIR, name);
  fs.writeFileSync(outPath, Buffer.from(glb));
  console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB, ${scene.children[0].geometry.attributes.position.count / 3} tris)`);
}
