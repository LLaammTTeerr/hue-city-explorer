// Bridges, riverfront, craft villages, markets, museums & civic hubs
import * as THREE from 'three';
import {
  paint, wrapScene, latheGourd, sculptedDragon, cornerScroll,
  bronzeCauldron, sculptedCross, armillarySphere,
} from './primitives.mjs';

// Build Bia Quốc Học hero accent .glb (1920 riverside memorial screen)
export function buildBiaQuocHocHero() {
  const parts = [];
  const ry = 9.65;
  parts.push(latheGourd(0, ry + 0.02, 0, 1.15, 0xe8c45e));
  parts.push(...sculptedDragon(0, ry, 0, 1, 1.8, 0.72));
  parts.push(...sculptedDragon(0, ry, 0, -1, 1.8, 0.72));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    parts.push(cornerScroll(su * 2.2, 8.45, sv * 1.1, su * 0.72, sv * 0.72, 0.7));
    parts.push(cornerScroll(su * 3.7, 6.15, sv * 1.4, su * 0.72, sv * 0.72, 0.78));
  }
  return wrapScene(parts, );
}

// Build Quốc Học Huế Tam Quan Gate hero accent .glb (imperial yellow-tiled gate on Lê Lợi)
export function buildQuocHocHero() {
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
  return wrapScene(parts, );
}

// Build Cầu Trường Tiền hero accent .glb (heritage cast-iron pier lamp globes, bow-crown finials & bridgehead standards)
export function buildTruongTienHero() {
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
  return wrapScene(parts, );
}

// Build Chợ Đông Ba hero accent .glb (Trần Hưng Đạo entrance crest, flagpole finials & market hall roof medallions)
export function buildDongBaHero() {
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
  return wrapScene(parts, );
}

// Build Hồ Tịnh Tâm (Bồng Lai octagonal pavilion) hero accent .glb
export function buildTinhTamHero() {
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
  return wrapScene(parts, );
}

// Build Quan Tượng Đài (Bát Phong imperial observatory) hero accent .glb
export function buildQuanTuongHero() {
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
  return wrapScene(parts, );
}

// Build Hồ Thủy Tiên (20 m coiled concrete dragon aquarium) hero accent .glb
export function buildThuyTienHero() {
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
  return wrapScene(parts, );
}

// Build Bảo tàng Hồ Chí Minh hero accent .glb (lantern lotus finial, eave scrolls & front lotus fountain)
export function buildBaoTangHcmHero() {
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
  return wrapScene(parts, );
}

// Build Trung tâm Nghệ thuật Điềm Phùng Thị hero accent .glb (Indochine ridge finials & signature modular bronze/marble sculptures)
export function buildDiemPhungThiHero() {
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
  return wrapScene(parts, );
}

// Build Phố Tây Walking Street hero accent .glb (festive lantern canopy & steel archway at Võ Thị Sáu × Chu Văn An)
export function buildPhoTayHero() {
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
  return wrapScene(parts, );
}

// Build Làng hương Thủy Xuân hero accent .glb (welcome arch ridge dragons + 6 sculpted rainbow incense bouquets)
export function buildThuyXuanHero() {
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
  return wrapScene(parts, );
}

// Build Làng đúc đồng Phường Đúc hero accent .glb (Ancestral Hall dragons/scrolls + monumental bronze cauldron & bells)
export function buildPhuongDucHero() {
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
  return wrapScene(parts, );
}

// Build Làng tranh Sình hero accent .glb (Nhà rường workshop dragons/scrolls + Cổng làng Sình gate ornaments)
export function buildSinhHero() {
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
  return wrapScene(parts, );
}

// Build Cầu Nguyễn Hoàng hero accent .glb (twin 30.6 m crane-arch lotus crowns & golden royal parasol lamp standards)
export function buildNguyenHoangHero() {
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
  return wrapScene(parts, );
}

// Build Cầu Dã Viên / Bạch Hổ hero accent .glb (4 north-channel yellow-glazed lookout pavilions: spires & scrolls)
export function buildBachHoHero() {
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
  return wrapScene(parts, );
}

// Build Cồn Dã Viên hero accent .glb (1953 41.8 m Water Tower rooftop cupola, beacon mast & cornice finials)
export function buildDaVienHero() {
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
  return wrapScene(parts, );
}

// Build Cầu Phú Xuân hero accent .glb (10 sculpted heritage lamp standards & mid-span river-balcony crest medallions)
export function buildPhuXuanHero() {
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
  return wrapScene(parts, );
}

// Build Cầu Gia Hội hero accent .glb (4 corner 5-globe bronze heritage lamps + 3 twin-arm median lamps)
export function buildGiaHoiHero() {
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
  return wrapScene(parts, );
}

// Build Cầu gỗ lim hero accent .glb (sculpted bronze lotus-bud boardwalk lanterns & river-view bollards)
export function buildGoLimHero() {
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
  return wrapScene(parts, );
}

// Build Phố đi bộ Nguyễn Đình Chiểu hero accent .glb (ROUND_E bronze lotus & river-wave plaza sculpture + 6 bollards)
export function buildNdChieuHero() {
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
  return wrapScene(parts, );
}

// Build Cồn Hến hero accent .glb (Chùa Pháp Hải 2-tier main hall upper ridge dragons, lotus finial, 8 corner scrolls & cauldron)
export function buildConHenHero() {
  const parts = [];
  const y0 = 4.2, hw = 7.8, hd = 6.05;
  const y3 = 7.82, ry = 10.88, hw2 = 5.525, hd2 = 4.05;
  // Central golden flaming pearl / lotus gourd finial + flanking ridge dragons on the upper ridge
  parts.push(latheGourd(0, ry + 0.05, 0, 0.95, 0xe8c254));
  parts.push(...sculptedDragon(0, ry + 0.12, 0, 1, 2.4, 0.78));
  parts.push(...sculptedDragon(0, ry + 0.12, 0, -1, 2.4, 0.78));
  // 4 upturned corner scrolls on both upper and lower roof tiers
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(cornerScroll(sx * hw, y0, sz * hd, sx * 0.65, sz * 0.65, 0.78));
    parts.push(cornerScroll(sx * hw2, y3, sz * hd2, sx * 0.52, sz * 0.52, 0.65));
  }
  // Ceremonial bronze incense cauldron in front of the pagoda hall
  parts.push(...bronzeCauldron(0, 0.0, 9.2, 0.95));
  return wrapScene(parts, );
}

// Build Chợ An Cựu hero accent .glb (central pyramid-hall octagonal market cupola, dome finial & 4 hip crests)
export function buildAnCuuHero() {
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
  return wrapScene(parts, );
}

// Build AEON MALL Huế hero accent .glb (Culture Stream rooftop skylight lantern cupola & magenta crest ribs)
export function buildAeonHero() {
  const parts = [];
  const y0 = 22.0;
  // Sculpted polygonal glass-and-bronze skylight atrium drum seated flush on the 22 m mall roof
  const plinth = new THREE.CylinderGeometry(7.2, 7.6, 0.9, 12);
  plinth.translate(0, y0 + 0.45, 0);
  parts.push(paint(plinth, 0xefeeea));
  const drum = new THREE.CylinderGeometry(6.4, 6.8, 2.6, 12);
  drum.translate(0, y0 + 2.2, 0);
  parts.push(paint(drum, 0x3b5264));
  // Curved dome canopy with bronze architectural ribs
  const dome = new THREE.SphereGeometry(6.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.42, 1);
  dome.translate(0, y0 + 3.45, 0);
  parts.push(paint(dome, 0xb48a55));
  // Flowing magenta & white "Culture Stream" ribbon ring + central spire finial
  const ring = new THREE.TorusGeometry(7.0, 0.28, 10, 28);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, y0 + 3.5, 0);
  parts.push(paint(ring, 0xc0187a));
  parts.push(latheGourd(0, y0 + 6.18, 0, 1.05, 0xefeeea));
  return wrapScene(parts, );
}

// Build Vincom Plaza / Meliá Vinpearl Huế hero accent .glb (160 m architectural crown spire & twin sky-bar halo rings)
export function buildVincomHero() {
  const parts = [];
  const y0 = 156.5; // top of rooftop sky-bar plant room
  // Sculpted octagonal brushed-titanium crown drum & illuminated twin halo rings
  const drum = new THREE.CylinderGeometry(4.2, 4.8, 1.8, 8);
  drum.translate(0, y0 + 0.9, 0);
  parts.push(paint(drum, 0xc9cdd0));
  for (const [ry, r, col] of [[y0 + 1.85, 5.2, 0xe8c85a], [y0 + 2.8, 3.8, 0xf2f4f6]]) {
    const ring = new THREE.TorusGeometry(r, 0.22, 10, 24);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, ry, 0);
    parts.push(paint(ring, col));
  }
  // Tapered needle spire with aviation beacon tip
  const spire = new THREE.CylinderGeometry(0.08, 0.36, 7.2, 8);
  spire.translate(0, y0 + 5.4, 0);
  parts.push(paint(spire, 0xe6eaee));
  const beacon = new THREE.SphereGeometry(0.32, 10, 8);
  beacon.translate(0, y0 + 9.1, 0);
  parts.push(paint(beacon, 0xe02832));
  return wrapScene(parts, );
}

// Build Chợ Bến Ngự hero accent .glb (central gable ridge cupola, 6 louvered ventilator cowls & gable finials)
export function buildBenNguHero() {
  const parts = [];
  const yR = 9.78; // middle gable ridge height (e = 7.4 + h = 2.4)
  // Central octagonal louvered market cupola
  const base = new THREE.CylinderGeometry(1.5, 1.7, 0.65, 8);
  base.translate(0, yR + 0.325, 0);
  parts.push(paint(base, 0xddd3b2));
  const drum = new THREE.CylinderGeometry(1.25, 1.35, 1.15, 8);
  drum.translate(0, yR + 1.2, 0);
  parts.push(paint(drum, 0x566066));
  const roof = new THREE.ConeGeometry(1.65, 0.95, 8);
  roof.translate(0, yR + 2.22, 0);
  parts.push(paint(roof, 0x9a4838));
  parts.push(latheGourd(0, yR + 2.7, 0, 0.68, 0xe8c44c));
  // 6 rhythmic market ridge ventilator cowls along the central spine
  for (const x of [-12, -7.5, -3.8, 3.8, 7.5, 12]) {
    const neck = new THREE.CylinderGeometry(0.32, 0.38, 0.55, 8);
    neck.translate(x, yR + 0.275, 0);
    parts.push(paint(neck, 0xb8bcbb));
    const cap = new THREE.ConeGeometry(0.55, 0.32, 8);
    cap.translate(x, yR + 0.68, 0);
    parts.push(paint(cap, 0x8a6a55));
  }
  // Front & back gable-peak crest finials
  for (const sx of [-1, 1]) {
    parts.push(latheGourd(sx * 16.8, yR + 0.05, 0, 0.62, 0xd8b244));
  }
  return wrapScene(parts, );
}

// Build Bến xe phía Bắc hero accent .glb (rooftop civic clock pavilion, curved transit canopy & flagpole mast)
export function buildBenXeBacHero() {
  const parts = [];
  const y0 = 7.75; // top of white roof slab (R + SL)
  const zf = 11.5; // front edge facing Lý Thái Tổ
  // 4 modernist white concrete piers supporting a curved civic clock-pavilion canopy
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.BoxGeometry(0.42, 3.2, 0.42);
    p.translate(sx * 2.2, y0 + 1.6, zf + sz * 1.4);
    parts.push(paint(p, 0xefeee8));
  }
  // Clock housing with gilded circular dial facing the street
  const box = new THREE.BoxGeometry(3.6, 2.2, 2.0);
  box.translate(0, y0 + 1.6, zf);
  parts.push(paint(box, 0x1f56a6));
  const dial = new THREE.CylinderGeometry(0.85, 0.85, 0.16, 16);
  dial.rotateX(Math.PI / 2);
  dial.translate(0, y0 + 1.65, zf + 1.04);
  parts.push(paint(dial, 0xf6eed8));
  const rim = new THREE.TorusGeometry(0.86, 0.08, 8, 20);
  rim.translate(0, y0 + 1.65, zf + 1.12);
  parts.push(paint(rim, 0xe8b832));
  // Swept transit-wing roof slab + civic flagpole
  const canopy = new THREE.BoxGeometry(6.2, 0.35, 3.8);
  canopy.translate(0, y0 + 3.35, zf);
  parts.push(paint(canopy, 0xf0c22e));
  const mast = new THREE.CylinderGeometry(0.06, 0.1, 4.2, 8);
  mast.translate(0, y0 + 5.6, zf);
  parts.push(paint(mast, 0xd8dce0));
  parts.push(latheGourd(0, y0 + 7.7, zf, 0.35, 0xe8c040));
  return wrapScene(parts, );
}

// Build Bến xe phía Nam hero accent .glb (pediment crown cupola, civic flagpole & twin bronze forecourt lamps)
export function buildBenXeNamHero() {
  const parts = [];
  const yPeak = 10.48; // apex of the central triangular pediment
  // Sculpted civic crown pedestal + gilded transit finial & flagpole mast on the pediment peak
  const ped = new THREE.CylinderGeometry(0.85, 1.05, 0.65, 8);
  ped.translate(0, yPeak + 0.325, 0);
  parts.push(paint(ped, 0xf1ede2));
  const dome = new THREE.SphereGeometry(0.86, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.7, 1);
  dome.translate(0, yPeak + 0.65, 0);
  parts.push(paint(dome, 0x1f56a6));
  const mast = new THREE.CylinderGeometry(0.06, 0.1, 3.8, 8);
  mast.translate(0, yPeak + 3.1, 0);
  parts.push(paint(mast, 0xdcded8));
  parts.push(latheGourd(0, yPeak + 5.0, 0, 0.36, 0xe8c03c));
  // Twin sculpted heritage 3-globe forecourt lamp standards flanking the front granite steps
  for (const sx of [-1, 1]) {
    const x = sx * 9.5, z = 4.6;
    const base = new THREE.CylinderGeometry(0.24, 0.32, 0.9, 8);
    base.translate(x, 0.45, z);
    parts.push(paint(base, 0x48443c));
    const pole = new THREE.CylinderGeometry(0.08, 0.13, 4.2, 8);
    pole.translate(x, 2.9, z);
    parts.push(paint(pole, 0x48443c));
    const arm = new THREE.BoxGeometry(1.3, 0.08, 0.08);
    arm.translate(x, 4.95, z);
    parts.push(paint(arm, 0xc8a448));
    for (const [dx, dy] of [[-0.62, 0], [0, 0.3], [0.62, 0]]) {
      const g = new THREE.SphereGeometry(0.22, 10, 8);
      g.translate(x + dx, 5.2 + dy, z);
      parts.push(paint(g, 0xf8f0dc));
    }
  }
  return wrapScene(parts, );
}

// Build Chợ Tây Lộc hero accent .glb (Nguyễn Trãi 2-tier red-tiled market gate ridge dragons, 8 corner scrolls & lanterns)
export function buildTayLocHero() {
  const parts = [];
  // Gate runs along local z (v): lower roof y=4.1 (z ±3.65, x ±0.65), upper roof y=5.5..5.95 (z ±2.35, x ±0.35)
  const yR = 5.95;
  // Central golden lotus-gourd finial & twin emerald ridge dragons along the gate ridge (rotated along z)
  parts.push(latheGourd(0, yR + 0.04, 0, 0.72, 0xf0c848));
  for (const sz of [-1, 1]) {
    const dr = sculptedDragon(0, 0, 0, sz, 1.65, 0.58);
    for (const g of dr) {
      g.rotateY(Math.PI / 2);
      g.translate(0, yR + 0.08, 0);
      parts.push(g);
    }
  }
  // 8 upturned golden-terracotta corner scrolls on both gate roof tiers
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(cornerScroll(sx * 1.15, 4.05, sz * 4.15, sx * 0.35, sz * 0.45, 0.52));
    parts.push(cornerScroll(sx * 0.75, 5.48, sz * 2.75, sx * 0.28, sz * 0.38, 0.44));
  }
  // Pair of sculpted heritage market lantern standards flanking the gate pillars
  for (const sz of [-1, 1]) {
    const z = sz * 4.35;
    const base = new THREE.CylinderGeometry(0.22, 0.28, 0.75, 8);
    base.translate(0.5, 0.375, z);
    parts.push(paint(base, 0x8e6b32));
    const post = new THREE.CylinderGeometry(0.07, 0.1, 3.1, 8);
    post.translate(0.5, 2.25, z);
    parts.push(paint(post, 0x4c3a28));
    const lantern = new THREE.SphereGeometry(0.26, 10, 8);
    lantern.scale(1, 1.3, 1);
    lantern.translate(0.5, 4.02, z);
    parts.push(paint(lantern, 0xf8e2a4));
  }
  return wrapScene(parts, 'tayloc_hero');
}

// Build Ga Huế hero accent .glb (French-colonial pediment clock crest, parapet urns & heritage forecourt lamps)
export function buildGaHueHero() {
  const parts = [];
  // Ornate brass clock bezel & finial crowning the curved central pediment facing north (z = -5.75, y = 11.45)
  const rim = new THREE.TorusGeometry(0.92, 0.1, 8, 22);
  rim.translate(0, 11.35, -5.75);
  parts.push(paint(rim, 0xd8b454));
  const dial = new THREE.CylinderGeometry(0.84, 0.84, 0.14, 18);
  dial.rotateX(Math.PI / 2);
  dial.translate(0, 11.35, -5.7);
  parts.push(paint(dial, 0xfbfaf5));
  parts.push(latheGourd(0, 12.42, -5.6, 0.62, 0xe8c45e));
  // Classical white-gold neoclassical urn finials along the 2-storey middle block parapet corners
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(latheGourd(sx * 9.5, 10.82, sz * 5.5, 0.58, 0xf4f0e8));
  }
  // 4 heritage cast-iron forecourt lamp standards flanking the front arrival canopy
  for (const sx of [-10.5, -4.5, 4.5, 10.5]) {
    const z = -9.8;
    const base = new THREE.CylinderGeometry(0.22, 0.3, 0.85, 8);
    base.translate(sx, 0.425, z);
    parts.push(paint(base, 0x3a3e42));
    const pole = new THREE.CylinderGeometry(0.07, 0.11, 3.6, 8);
    pole.translate(sx, 2.65, z);
    parts.push(paint(pole, 0x3a3e42));
    const globe = new THREE.SphereGeometry(0.28, 10, 8);
    globe.translate(sx, 4.65, z);
    parts.push(paint(globe, 0xf8ecc8));
  }
  return wrapScene(parts, 'gahue_hero');
}
