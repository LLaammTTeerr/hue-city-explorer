// Shared sculptural primitives & indexed/uint8 geometry packer for self-hosted hero .glb models.
import * as THREE from 'three';

// Paint a geometry with a flat linear RGB color stored as normalized Uint8Array (3 bytes/vertex vs 12 for Float32).
// Keeps the geometry indexed so shared vertices (LatheGeometry, TubeGeometry, SphereGeometry) stay compact.
export function paint(geom, hexColor) {
  const g = geom.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  const c = new THREE.Color(hexColor); // Three converts sRGB hex -> linear
  const r = Math.round(Math.min(1, Math.max(0, c.r)) * 255);
  const gr = Math.round(Math.min(1, Math.max(0, c.g)) * 255);
  const b = Math.round(Math.min(1, Math.max(0, c.b)) * 255);
  const n = g.attributes.position.count;
  const arr = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = r;
    arr[i * 3 + 1] = gr;
    arr[i * 3 + 2] = b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3, true));
  return g;
}

// Merge indexed/non-indexed BufferGeometries into a single indexed BufferGeometry with Uint8 normalized vertex colors.
export function mergeGeoms(geoms) {
  let totalV = 0;
  let totalI = 0;
  for (const g of geoms) {
    totalV += g.attributes.position.count;
    totalI += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(totalV * 3);
  const nrm = new Float32Array(totalV * 3);
  const col = new Uint8Array(totalV * 3);
  const idx = totalV < 65535 ? new Uint16Array(totalI) : new Uint32Array(totalI);
  let vOff = 0;
  let iOff = 0;
  for (const g of geoms) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, vOff * 3);
    nrm.set(g.attributes.normal.array, vOff * 3);
    const cAttr = g.attributes.color;
    if (cAttr.array instanceof Uint8Array) {
      col.set(cAttr.array, vOff * 3);
    } else {
      for (let i = 0; i < n * 3; i++) {
        col[vOff * 3 + i] = Math.round(Math.min(1, Math.max(0, cAttr.array[i])) * 255);
      }
    }
    if (g.index) {
      const src = g.index.array;
      for (let i = 0; i < src.length; i++) idx[iOff + i] = src[i] + vOff;
      iOff += src.length;
    } else {
      for (let i = 0; i < n; i++) idx[iOff + i] = vOff + i;
      iOff += n;
    }
    vOff += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

export function wrapScene(parts, name) {
  const merged = mergeGeoms(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = name;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// Smooth turned pháp lam gourd finial (LatheGeometry) with lotus-petal base collar & gilded needle tip
export function latheGourd(x, y, z, scale = 1.0, hexCol = 0xe8c45e) {
  const pts = [
    [0.01, 0.0], [0.28, 0.04], [0.24, 0.12], [0.30, 0.26], [0.27, 0.36], [0.14, 0.48],
    [0.10, 0.54], [0.21, 0.68], [0.18, 0.84], [0.07, 1.0], [0.02, 1.18], [0.004, 1.26],
  ].map(([r, h]) => new THREE.Vector2(r * scale, h * scale));
  const g = new THREE.LatheGeometry(pts, 14);
  g.translate(x, y, z);
  return paint(g, hexCol);
}

// Sculpted undulating imperial dragon (Catmull-Rom 3D spline TubeGeometry + raised golden crest + horns & flame tail)
export function sculptedDragon(cx, cy, cz, dirX, span, scale = 1.0) {
  const parts = [];
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cx + dirX * 0.52 * scale, cy + 0.72 * scale, cz),
    new THREE.Vector3(cx + dirX * 1.05 * scale, cy + 0.28 * scale, cz + 0.09 * scale),
    new THREE.Vector3(cx + dirX * (span * 0.40), cy + 0.78 * scale, cz - 0.07 * scale),
    new THREE.Vector3(cx + dirX * (span * 0.64), cy + 0.24 * scale, cz + 0.06 * scale),
    new THREE.Vector3(cx + dirX * (span * 0.85), cy + 0.68 * scale, cz),
    new THREE.Vector3(cx + dirX * span, cy + 0.96 * scale, cz),
  ]);
  parts.push(paint(new THREE.TubeGeometry(curve, 28, 0.155 * scale, 8, false), 0x3a8c6c));

  const crest = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cx + dirX * 0.46 * scale, cy + 0.94 * scale, cz),
    new THREE.Vector3(cx + dirX * 0.85 * scale, cy + 0.54 * scale, cz),
    new THREE.Vector3(cx + dirX * (span * 0.40), cy + 0.96 * scale, cz),
    new THREE.Vector3(cx + dirX * (span * 0.65), cy + 0.44 * scale, cz),
    new THREE.Vector3(cx + dirX * (span * 0.92), cy + 0.92 * scale, cz),
  ]);
  parts.push(paint(new THREE.TubeGeometry(crest, 20, 0.072 * scale, 6, false), 0xe6be4c));

  // sculpted head + open snout + golden mane horn
  const head = new THREE.SphereGeometry(0.24 * scale, 10, 8);
  head.scale(1.3, 0.95, 0.92);
  head.translate(cx + dirX * 0.50 * scale, cy + 0.76 * scale, cz);
  parts.push(paint(head, 0xe8c45e));

  const horn = new THREE.ConeGeometry(0.065 * scale, 0.34 * scale, 6);
  horn.rotateZ(-dirX * 0.55);
  horn.translate(cx + dirX * 0.66 * scale, cy + 1.02 * scale, cz);
  parts.push(paint(horn, 0xf2d46e));

  // raised flame tail plume at the far end
  const tail = new THREE.ConeGeometry(0.12 * scale, 0.36 * scale, 6);
  tail.rotateZ(dirX * 0.35);
  tail.translate(cx + dirX * (span + 0.06 * scale), cy + 1.08 * scale, cz);
  parts.push(paint(tail, 0xe8c45e));
  return parts;
}

// Curved imperial roof corner scroll (đao mái) — S-curved tube sweeping up from corner eaves with flared scroll curl
export function cornerScroll(x, y, z, dx, dz, scale = 1.0) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(x, y, z),
    new THREE.Vector3(x + dx * 0.46 * scale, y + 0.18 * scale, z + dz * 0.46 * scale),
    new THREE.Vector3(x + dx * 0.84 * scale, y + 0.58 * scale, z + dz * 0.84 * scale),
    new THREE.Vector3(x + dx * 0.68 * scale, y + 0.92 * scale, z + dz * 0.68 * scale),
    new THREE.Vector3(x + dx * 0.52 * scale, y + 0.84 * scale, z + dz * 0.52 * scale),
  ]);
  return paint(new THREE.TubeGeometry(curve, 16, 0.095 * scale, 7, false), 0xe8c45e);
}

// Sculpted ceremonial bronze cauldron / incense urn (Đỉnh đồng) with 3 curved tripod legs, belly band & twin loop handles
export function bronzeCauldron(cx, cy, cz, scale = 1.0, bodyCol = 0x5c4c36, trimCol = 0x9e8248) {
  const parts = [];
  const pts = [
    [0.01, 0.25], [0.42, 0.30], [0.64, 0.52], [0.68, 0.88],
    [0.54, 1.18], [0.62, 1.32], [0.50, 1.38], [0.48, 1.24],
  ].map(([r, h]) => new THREE.Vector2(r * scale, h * scale));
  const body = new THREE.LatheGeometry(pts, 16);
  body.translate(cx, cy, cz);
  parts.push(paint(body, bodyCol));

  const rim = new THREE.TorusGeometry(0.57 * scale, 0.06 * scale, 8, 16);
  rim.rotateX(Math.PI / 2);
  rim.translate(cx, cy + 1.30 * scale, cz);
  parts.push(paint(rim, trimCol));

  const band = new THREE.TorusGeometry(0.67 * scale, 0.042 * scale, 7, 16);
  band.rotateX(Math.PI / 2);
  band.translate(cx, cy + 0.82 * scale, cz);
  parts.push(paint(band, trimCol));

  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
    const leg = new THREE.CylinderGeometry(0.085 * scale, 0.06 * scale, 0.50 * scale, 8);
    leg.translate(cx + Math.cos(a) * 0.38 * scale, cy + 0.25 * scale, cz + Math.sin(a) * 0.38 * scale);
    parts.push(paint(leg, bodyCol));
  }
  for (const s of [-1, 1]) {
    const ear = new THREE.TorusGeometry(0.17 * scale, 0.044 * scale, 7, 12, Math.PI * 1.2);
    ear.rotateZ(s < 0 ? Math.PI * 0.4 : -Math.PI * 0.4);
    ear.translate(cx + s * 0.63 * scale, cy + 1.32 * scale, cz);
    parts.push(paint(ear, trimCol));
  }
  return parts;
}

// Sculpted architectural cross (for churches & monasteries) with flared arms & stepped stone base
export function sculptedCross(cx, cy, cz, h = 2.8, col = 0xf2ede0, trimCol = 0xe8c45e) {
  const parts = [];
  const base = new THREE.CylinderGeometry(0.32, 0.45, 0.45, 8);
  base.translate(cx, cy + 0.225, cz);
  parts.push(paint(base, col));

  const post = new THREE.BoxGeometry(0.24, h, 0.24);
  post.translate(cx, cy + 0.45 + h / 2, cz);
  parts.push(paint(post, col));

  const arm = new THREE.BoxGeometry(h * 0.62, 0.24, 0.24);
  arm.translate(cx, cy + 0.45 + h * 0.72, cz);
  parts.push(paint(arm, col));

  const ring = new THREE.TorusGeometry(h * 0.16, 0.045, 8, 16);
  ring.translate(cx, cy + 0.45 + h * 0.72, cz);
  parts.push(paint(ring, trimCol));
  return parts;
}

// Sculpted brass armillary sphere (Hỗn thiên nghi) for Quan Tượng Đài royal observatory
export function armillarySphere(cx, cy, cz, scale = 1.0) {
  const parts = [];
  const ped = new THREE.CylinderGeometry(0.45 * scale, 0.68 * scale, 0.9 * scale, 12);
  ped.translate(cx, cy + 0.45 * scale, cz);
  parts.push(paint(ped, 0x8e8a7e));
  const stand = new THREE.CylinderGeometry(0.10 * scale, 0.16 * scale, 0.8 * scale, 10);
  stand.translate(cx, cy + 1.25 * scale, cz);
  parts.push(paint(stand, 0x6e5a38));
  const scy = cy + 2.35 * scale;
  for (const [rx, ry, rz, r, col] of [
    [0, 0, 0, 1.05, 0xd8b24c],
    [Math.PI / 2, 0, 0, 1.02, 0xc89e3c],
    [0, Math.PI / 2, 0, 0.96, 0xb88e34],
    [0.41, 0.3, 0, 0.90, 0xe8c45e],
  ]) {
    const ring = new THREE.TorusGeometry(r * scale, 0.055 * scale, 8, 28);
    ring.rotateX(rx);
    ring.rotateY(ry);
    ring.rotateZ(rz);
    ring.translate(cx, scy, cz);
    parts.push(paint(ring, col));
  }
  const earth = new THREE.SphereGeometry(0.22 * scale, 12, 10);
  earth.translate(cx, scy, cz);
  parts.push(paint(earth, 0x4a6c58));
  return parts;
}

// Reusable imperial ridge crest: flaming sun pearl (hỏa châu) + gourd base + twin flanking dragons (Lưỡng Long Chầu Nhật)
export function dragonPearlCrest(cx, ridgeY, cz, span, scale = 1.0, { pearlRadius = 0.42, pearlCol = 0xea6434, gourdScale = null } = {}) {
  const parts = [];
  const pearl = new THREE.SphereGeometry(pearlRadius, 14, 10);
  pearl.scale(1, 1.15, 0.45);
  pearl.translate(cx, ridgeY + pearlRadius * 1.48, cz);
  parts.push(paint(pearl, pearlCol));
  parts.push(latheGourd(cx, ridgeY + 0.02, cz, gourdScale ?? pearlRadius * 1.08, 0xe8c45e));
  parts.push(...sculptedDragon(cx, ridgeY, cz, 1, span, scale));
  parts.push(...sculptedDragon(cx, ridgeY, cz, -1, span, scale));
  return parts;
}

// Four symmetric upturned roof corner scrolls (đao mái) around (cx, eaveY, cz)
export function fourCornerScrolls(cx, eaveY, cz, halfW, halfD, scale = 1.0, flare = 0.72) {
  const parts = [];
  for (const su of [-1, 1]) {
    for (const sv of [-1, 1]) {
      parts.push(cornerScroll(cx + su * halfW, eaveY, cz + sv * halfD, su * flare, sv * flare, scale));
    }
  }
  return parts;
}

// Shared parameterized builder for the 10 Kinh Thành Citadel Gates (exact per-gate watchtower dimensions)
export function buildGateWatchtowerHero({ name, upper, lower = null }) {
  const parts = [];
  const { w, d, over, y0, ry } = upper;
  const hw = w / 2 + over;
  const hd = d / 2 + over;
  const rl = Math.max(0.4, hw - hd * 0.92);
  const dragonSpan = Math.min(2.4, Math.max(1.15, rl * 0.9));

  parts.push(...dragonPearlCrest(0, ry, 0, dragonSpan, 0.65, { pearlRadius: 0.26, gourdScale: 0.42 }));
  for (const s of [-1, 1]) {
    parts.push(latheGourd(s * (rl + 0.12), ry - 0.04, 0, 0.56, 0xe8c45e));
  }
  parts.push(...fourCornerScrolls(0, y0 + 0.08, 0, hw, hd, 0.74, 0.56));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    // hanging crimson-gold imperial palace lantern under each upper watchtower corner eave
    const lx = su * (hw - 0.32), lz = sv * (hd - 0.32);
    const lantern = new THREE.SphereGeometry(0.16, 8, 7);
    lantern.scale(1, 1.3, 1);
    lantern.translate(lx, y0 - 0.34, lz);
    parts.push(paint(lantern, 0xd93828));
    const cap = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 7);
    cap.translate(lx, y0 - 0.14, lz);
    parts.push(paint(cap, 0xe8c45e));
  }
  if (lower) {
    parts.push(...fourCornerScrolls(0, lower.y0 + 0.08, 0, lower.w / 2 + lower.over, lower.d / 2 + lower.over, 0.84, 0.62));
  }
  return wrapScene(parts, name);
}
