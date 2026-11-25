// Royal tombs, pagodas, cathedrals & scenic hills
import * as THREE from 'three';
import {
  paint, wrapScene, latheGourd, sculptedDragon, cornerScroll,
  bronzeCauldron, sculptedCross, armillarySphere, dragonPearlCrest, fourCornerScrolls,
} from './primitives.mjs';

// Build Chùa Thiên Mụ (Phước Duyên Tower) hero accent .glb (local frame centered on tower C, y above tower base)
export function buildThienMuHero() {
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
  return wrapScene(parts, );
}

// Build Lăng Khải Định (Cung Thiên Định) hero accent .glb
// Matches khaidinh.js: anchor at Khải Thành center [189.86, 7693.36], rotY = -0.7599,
// upper roof ridge y = 14.88, upper eave y = 12.88, lower main eave y = 9.98 above ground.
export function buildKhaiDinhHero() {
  const parts = [];
  const ridgeY = 14.92, eaveY = 12.92, lowEaveY = 10.02;
  parts.push(...dragonPearlCrest(0, ridgeY, 0, 3.6, 1.05, { pearlRadius: 0.44, pearlCol: 0xe86834, gourdScale: 0.46 }));
  for (const s of [-1, 1]) parts.push(latheGourd(s * 4.4, ridgeY - 0.06, 0, 0.8, 0xd9c9a8));
  parts.push(...fourCornerScrolls(0, eaveY, 0, 9.8, 9.4, 1.1));
  parts.push(...fourCornerScrolls(0, lowEaveY, 0, 17.6, 11.8, 1.2, 0.75));
  return wrapScene(parts, );
}

// Build Lăng Tự Đức (Điện Hòa Khiêm) hero accent .glb
// Matches tuduc.js: anchor at Hòa Khiêm center [-2450.9, 4024.8], rotY = -1.5011,
// main rear ridge at z = +4.83, y = 7.52; front hall ridge at z = -7.25, y = 6.72.
export function buildTuDucHero() {
  const parts = [];
  const zMain = 4.83, zFront = -7.25, rMain = 7.52, rFront = 6.72, eaveY = 4.9;
  parts.push(...dragonPearlCrest(0, rMain, zMain, 4.6, 1.05, { pearlRadius: 0.42, gourdScale: 0.45 }));
  for (const s of [-1, 1]) {
    parts.push(latheGourd(s * 8.2, rMain - 0.06, zMain, 0.85, 0xe8c45e));
    parts.push(latheGourd(s * 9.6, rFront - 0.06, zFront, 0.75, 0xe8c45e));
  }
  parts.push(latheGourd(0, rFront + 0.02, zFront, 0.9, 0xe8c45e));
  parts.push(...fourCornerScrolls(0, eaveY, zMain, 16.0, 8.0, 1.05));
  parts.push(...fourCornerScrolls(0, eaveY - 0.15, zFront, 16.0, 5.6, 0.95));
  return wrapScene(parts, );
}

// Build Lăng Minh Mạng (Minh Lâu) hero accent .glb
// Matches minhmang.js: anchor at Minh Lâu center [-2196.59, 8971.75], rotY = 1.4515,
// two-storey square pavilion rising to ridge y = 13.5 above ground.
export function buildMinhMangHero() {
  const parts = [];
  // Tall golden pháp lam lotus-gourd finial at Minh Lâu's apex
  parts.push(latheGourd(0, 13.45, 0, 1.55, 0xe8c45e));
  // 4 sweeping corner scrolls on the upper square roof + 4 on the lower square roof
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 4.5, 11.1, sv * 4.5, su * 0.72, sv * 0.72, 1.1));
    parts.push(cornerScroll(su * 6.5, 8.45, sv * 6.5, su * 0.75, sv * 0.75, 1.15));
  }
  return wrapScene(parts, );
}

// Build Chùa Từ Đàm hero accent .glb (Chánh điện main ridge dragons & gilded dharma spire)
export function buildTuDamHero() {
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
  return wrapScene(parts, );
}

// Build Lăng Đồng Khánh — Điện Ngưng Hy hero accent .glb (triple-roof imperial temple hall)
export function buildDongKhanhHero() {
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
  return wrapScene(parts, );
}

// Build Lăng Thiệu Trị — Đức Hinh Lâu hero accent .glb (two-storey square imperial lầu)
export function buildThieuTriHero() {
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
  return wrapScene(parts, );
}

// Build Quốc Tự Diệu Đế (Đại Giác Main Hall) hero accent .glb
export function buildDieuDeHero() {
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
  return wrapScene(parts, );
}

// Build Chùa Báo Quốc (Chánh Điện Main Hall) hero accent .glb
export function buildBaoQuocHero() {
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
  return wrapScene(parts, );
}

// Build Nhà thờ Chính tòa Phủ Cam hero accent .glb (twin 43.5 m bell tower crosses, hood cross & St Peter/Paul statues)
export function buildPhuCamHero() {
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
  return wrapScene(parts, );
}

// Build Nhà thờ Dòng Chúa Cứu Thế hero accent .glb (53 m 3-tier octagonal bell tower cross & 24 upturned corner scrolls)
export function buildDcctHero() {
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
  return wrapScene(parts, );
}

// Build Đan viện Thiên An hero accent .glb (7-storey Phước Duyên-style bell tower cross & 56 glazed eave scrolls)
export function buildThienAnHero() {
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
  return wrapScene(parts, );
}

// Build Núi Ngự Bình hero accent .glb (sculpted royal summit stele canopy Bi Đình on the r=4.0 stone clearing)
export function buildNguBinhHero() {
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
  return wrapScene(parts, );
}

// Build Đồi Vọng Cảnh hero accent .glb (hilltop lookout pavilion lotus-gourd spire, corner scrolls & deck finials)
export function buildVongCanhHero() {
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
  return wrapScene(parts, );
}
