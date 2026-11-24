// Imperial City, palaces, pavilions, temples & citadel fortifications
import * as THREE from 'three';
import {
  paint, wrapScene, latheGourd, sculptedDragon, cornerScroll,
  bronzeCauldron, sculptedCross, armillarySphere,
} from './primitives.mjs';

// Build Ngọ Môn hero accent .glb (local frame: u along +X, v along +Z, y = height above LAND_Y)
// Matches ngomon.js: yT = 5.0, yN = 6.14, center hall u [-8.8..8.8], v [-11.6..0.8] (center v = -5.4),
// upper ridge y = 6.14 + 3.1 + 3.2*0.34 + 3.1*0.85 + 3.2 = 16.163 m above LAND_Y.
export function buildNgoMonHero() {
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

  return wrapScene(parts, );
}

// Build Điện Thái Hòa hero accent .glb (local frame: u along +X, v along +Z toward Ngọ Môn, y above ground)
export function buildThaiHoaHero() {
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
  return wrapScene(parts, );
}

// Build Hiển Lâm Các hero accent .glb (3-tier memorial pavilion in front of Thế Miếu)
// Matches hienlam.js: anchor [-1260.15, 238.25], rotY = 0.6498;
// Tier 1 eave y = 4.95, Tier 2 eave y = 9.45, Tier 3 eave y = 12.65, apex y = 15.35 above ground.
export function buildHienLamHero() {
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
  return wrapScene(parts, );
}

// Build Thế Miếu hero accent .glb (55 m dynastic temple behind Hiển Lâm Các)
// Matches themieu.js: anchor [-1293.6, 191.8], rotY = 0.6335;
// Main rear hall v = -3.1, eave y = 7.0, ridge y = 11.5; Front hall v = +7.8, eave y = 4.6, ridge y = 7.9.
export function buildTheMieuHero() {
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
  return wrapScene(parts, );
}

// Build Phu Văn Lâu hero accent .glb (2-storey royal edict pavilion on the Citadel axis)
// Matches phuvanlau.js: anchor [-851.75, 375.95], rotY = 0.6125;
// Lower eave y = 4.2, upper eave y = 8.3, upper ridge y = 10.12.
export function buildPhuVanLauHero() {
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
  return wrapScene(parts, );
}

// Build Nghênh Lương Đình hero accent .glb (royal river pavilion on the Perfume River)
// Matches nghenhluong.js: anchor [-794.62, 452.46], rotY = -2.5376;
// Lower eave y = 4.1, upper eave y = 5.5, upper ridge y = 7.12.
export function buildNghenhLuongHero() {
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
  return wrapScene(parts, );
}

// Build Cung An Định hero accent .glb (Khải Tường Lâu palace + Đình Trung Lập octagonal pavilion)
// Matches andinh.js: anchor [1008.95, 1355.83], rotY = 0.4527;
// Twin towers at u = ±9.1, v = 4.8, crown top y = 16.95; center ridge at v = -4.05, y = 13.4;
// Đình Trung Lập octagonal pavilion at u = -0.3, v = 17.7, roof cap y = 9.0, eave y = 5.8.
export function buildAnDinhHero() {
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
  return wrapScene(parts, );
}

// Build Điện Cần Chánh hero accent .glb (Tử Cấm Thành daily audience hall)
export function buildCanChanhHero() {
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
  return wrapScene(parts, );
}

// Build Cung Diên Thọ hero accent .glb (Queen Mothers' Palace)
export function buildDienThoHero() {
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
  return wrapScene(parts, );
}

// Build Thái Miếu hero accent .glb (71 m dynastic temple of the nine Nguyễn lords)
export function buildThaiMieuHero() {
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
  return wrapScene(parts, );
}

// Build Duyệt Thị Đường hero accent .glb (Royal Theatre in Tử Cấm Thành)
export function buildDuyetThiHero() {
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
  return wrapScene(parts, );
}

// Build Triệu Miếu hero accent .glb (Temple of Nguyễn Kim)
export function buildTrieuMieuHero() {
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
  return wrapScene(parts, );
}

// Build Cung Trường Sanh hero accent .glb (Thọ Khang royal residence)
export function buildTruongSanhHero() {
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
  return wrapScene(parts, );
}

// Build Tàng Thư Lâu hero accent .glb (Imperial Archive on Học Hải lake island)
export function buildTangThuLauHero() {
  const parts = [];
  const ry = 11.18, eaveY = 7.95;
  parts.push(latheGourd(0, ry + 0.02, 0, 1.05, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 4.2, 0.95));
  parts.push(...sculptedDragon(0, ry, 0, -1, 4.2, 0.95));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 12.8, ry - 0.06, 0, 0.85, 0xddd2b8));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 19.6, eaveY, sv * 7.2, su * 0.72, sv * 0.72, 0.92));
  }
  return wrapScene(parts, );
}

// Build Hưng Miếu hero accent .glb (temple of Gia Long's parents behind Thế Miếu)
export function buildHungMieuHero() {
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
  return wrapScene(parts, );
}

// Build Bảo tàng Cổ vật Cung đình (Điện Long An) hero accent .glb
export function buildBaoTangCoVatHero() {
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
  return wrapScene(parts, );
}

// Build Quốc Tử Giám (Di Luân Đường) hero accent .glb
export function buildQuocTuGiamHero() {
  const parts = [];
  const zm = -2.8;
  parts.push(latheGourd(0, 9.02, zm, 1.35, 0xe8c45e));
  parts.push(latheGourd(0, 5.4, 8.2, 0.82, 0xe8c45e));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 6.7, 7.25, zm + sv * 6.7, su * 0.72, sv * 0.72, 0.96));
    parts.push(cornerScroll(su * 9.9, 4.15, zm + sv * 9.4, su * 0.72, sv * 0.72, 1.02));
  }
  return wrapScene(parts, );
}

// Build Lầu Tứ Phương Vô Sự hero accent .glb (Bắc Khuyết Đài north bastion pavilion)
export function buildTuPhuongHero() {
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
  return wrapScene(parts, );
}

// Build Thương Bạc Đình hero accent .glb (octagonal riverside pavilion)
export function buildThuongBacHero() {
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
  return wrapScene(parts, );
}

// Build Kỳ Đài (Flag Tower of Huế Citadel) hero accent .glb (flagpole crown + twin guard huts + bollards)
export function buildKyDaiHero() {
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
  return wrapScene(parts, );
}

// Build Hổ Quyền (Royal Tiger & Elephant Arena) hero accent .glb (king's stand lotus finials & cornice crest)
export function buildHoQuyenHero() {
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
  return wrapScene(parts, );
}

// Build Đàn Nam Giao hero accent .glb (ceremonial imperial bronze tripods & Viên Đàn lotus finials)
export function buildNamGiaoHero() {
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
  return wrapScene(parts, );
}

// Build Đàn Xã Tắc hero accent .glb (imperial Earth & Grain bronze cauldron + altar corner & stair finials)
export function buildXaTacHero() {
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
  return wrapScene(parts, );
}

// Build Cửa Hiển Nhơn (East Imperial City Gate) hero accent .glb
export function buildHienNhonHero() {
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
  return wrapScene(parts, );
}

// Build Cửa Chương Đức (West Imperial City Gate) hero accent .glb
export function buildChuongDucHero() {
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
  return wrapScene(parts, );
}

// Build Kinh Thành Huế hero accent .glb (ceremonial imperial bronze cauldron & heritage monument obelisk)
export function buildKinhThanhHero() {
  const parts = [];
  parts.push(...bronzeCauldron(0, 0.05, 0, 1.35));
  for (const s of [-1, 1]) {
    const col = new THREE.CylinderGeometry(0.22, 0.28, 3.6, 8);
    col.translate(s * 3.2, 1.8, 0);
    parts.push(paint(col, 0xb8b0a0));
    parts.push(latheGourd(s * 3.2, 3.6, 0, 0.65, 0xe8c45e));
  }
  return wrapScene(parts, );
}

// Build Hoàng thành · Đại Nội hero accent .glb (Đại Cung Môn enamel ridge dragons, flaming pearl, scrolls & cauldrons)
export function buildDaiNoiHero() {
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
  return wrapScene(parts, );
}

// Build Trấn Bình Đài · Mang Cá hero accent .glb (Trấn Bình Môn ridge finials, corner scrolls & twin bronze rampart cannons)
export function buildMangCaHero() {
  const parts = [];
  const yWall = 6.6, yEave = 10.1, yRidge = 12.4, hw = 17.95, hd = 4.95;
  // Sculpted weathered ceramic ridge-crest finials along the 34.4 m colonial gate-house roof
  for (const x of [-15.2, 0, 15.2]) {
    parts.push(latheGourd(x, yRidge + 0.05, 0, x === 0 ? 0.92 : 0.72, 0xd8b86a));
  }
  // 4 corner ridge scrolls on the eaves
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(cornerScroll(sx * hw, yEave, sz * hd, sx * 0.55, sz * 0.55, 0.68));
  }
  // Twin historical weathered bronze bastion cannons on wooden gun carriages on the rampart walk
  for (const sx of [-1, 1]) {
    const cx = sx * 13.5, cz = 5.4;
    const carriage = new THREE.BoxGeometry(1.1, 0.55, 1.8);
    carriage.translate(cx, yWall + 0.275, cz);
    parts.push(paint(carriage, 0x5c4230));
    const barrel = new THREE.CylinderGeometry(0.14, 0.22, 2.3, 10);
    barrel.rotateX(Math.PI / 2 - 0.12);
    barrel.translate(cx, yWall + 0.75, cz + 0.25);
    parts.push(paint(barrel, 0x3b443e));
  }
  return wrapScene(parts, );
}

// Build Đông Thành Thủy Quan hero accent .glb (stone lotus-urn parapet finials, áp quan drop-gate beam & keystone lantern)
export function buildThuyQuanHero() {
  const parts = [];
  const yDeck = 4.72; // crown deck height over the 8.4 m stone vault
  // 4 carved đá thanh stone lotus-urn finials crowning the arch pilasters on both parapets
  for (const sx of [-1, 1]) for (const [z, yTop] of [[-2.25, yDeck + 0.95], [2.25, yDeck + 1.55]]) {
    parts.push(latheGourd(sx * 4.8, yTop + 0.04, z, 0.58, 0xa8aca4));
  }
  // Historical áp quan (drop-gate) stone pivot piers & timber windlass beam on the inner parapet
  for (const sx of [-1, 1]) {
    const pier = new THREE.BoxGeometry(0.62, 2.4, 0.62);
    pier.translate(sx * 3.8, yDeck + 1.2, -2.25);
    parts.push(paint(pier, 0x8d908a));
    parts.push(latheGourd(sx * 3.8, yDeck + 2.42, -2.25, 0.42, 0xc8a852));
  }
  const beam = new THREE.CylinderGeometry(0.14, 0.14, 7.6, 8);
  beam.rotateZ(Math.PI / 2);
  beam.translate(0, yDeck + 2.15, -2.25);
  parts.push(paint(beam, 0x6b4b32));
  // Central sculpted imperial bronze signal lantern over the arch keystone on the outer parapet
  const lPost = new THREE.CylinderGeometry(0.1, 0.14, 1.4, 8);
  lPost.translate(0, yDeck + 2.25, 2.25);
  parts.push(paint(lPost, 0x4c4438));
  const lGlobe = new THREE.SphereGeometry(0.28, 10, 8);
  lGlobe.translate(0, yDeck + 3.12, 2.25);
  parts.push(paint(lGlobe, 0xf8e8be));
  parts.push(latheGourd(0, yDeck + 3.4, 2.25, 0.36, 0xd8b24c));
  return wrapScene(parts, );
}
