import * as THREE from 'three';
import { KIND, hex, shade, unflat, obb, ringCentre } from '../geo/buf.js';
import { LAND_Y, WALL_H, PAL } from '../config.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dark = hex('#2b2422');

// Timber hall under a swept tiled roof; tiers = 2 gives the stacked roofs of gate towers and pavilions.
export function pavilion(S, cx, cz, w, d, ang, y0, { tiers = 1, wallH = 3.6, roof = PAL.imperialRoof, wall = PAL.lacquer, over = 1.5, rh = null, platform = 0, ridge = RIDGE } = {}) {
  let y = y0;
  const keep = S.kind;
  if (platform) { S.kind = KIND.MASONRY; S.box(cx, cz, y, y + platform, w + 3.4, d + 3.4, ang, PAL.stone, { taper: 0.97, topKind: KIND.ROAD }); y += platform; }
  S.kind = KIND.TIMBER;
  S.box(cx, cz, y, y + wallH, w, d, ang, wall, { top: shade(roof, 0.8) });
  y += wallH;
  const h1 = rh ?? clamp(d * 0.3, 1.5, 5.2);
  const eave = { fascia: 0.3, fasciaCol: shade(wall, 0.75), ridgeCol: ridge, hips: true };
  let top;
  if (tiers === 1) {
    S.hip(cx, cz, w, d, ang, y, h1, roof, { flare: 0.55, over, ...eave });
    top = y + h1;
  } else {
    S.hip(cx, cz, w, d, ang, y, h1 * 0.8, roof, { flare: 0.5, over, ...eave, ridgeCol: null });
    const w2 = w * 0.68, d2 = d * 0.62, y2 = y + h1 * 0.42;
    S.box(cx, cz, y2, y2 + wallH * 0.62, w2, d2, ang, wall);
    const y3 = y2 + wallH * 0.62;
    S.hip(cx, cz, w2, d2, ang, y3, h1 * 0.85, roof, { flare: 0.5, over: over * 0.85, ...eave });
    top = y3 + h1 * 0.85;
  }
  S.kind = keep;
  return top;
}
const RIDGE = hex('#f1d77a');

function gate(S, g, centre) {
  const cx = g.c[0] / 10, cz = g.c[1] / 10, w = g.w / 10, d = g.d / 10, a = g.a / 1000;
  const ux = Math.cos(a), uz = Math.sin(a);
  // which footprint axis runs through the wall?
  let rx = cx - centre[0], rz = cz - centre[1];
  const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  const alongLong = Math.abs(rx * ux + rz * uz) > 0.707;
  const pa = alongLong ? a : a + Math.PI / 2; // passage direction
  const plen = alongLong ? w : d, pwid = alongLong ? d : w;
  const px = Math.cos(pa), pz = Math.sin(pa);
  if (g.k === 'citadel') {
    const top = LAND_Y + WALL_H + 1.4;
    S.kind = KIND.MASONRY;
    S.box(cx, cz, LAND_Y - 0.5, top, w + 1, d + 1, a, PAL.brickLight, { top: PAL.stone, taper: 0.96, topKind: KIND.ROAD });
    S.box(cx, cz, top, top + 0.8, w + 0.6, d + 0.6, a, shade(PAL.brickLight, 1.08), { top: PAL.stone, topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) {
      const fx = cx + px * s * (plen / 2 + 0.42), fz = cz + pz * s * (plen / 2 + 0.42);
      S.box(fx, fz, LAND_Y, LAND_Y + 4.4, 0.3, 4.2, pa, dark);
      S.box(fx, fz, LAND_Y + 4.4, LAND_Y + 5.3, 0.3, 3.0, pa, dark);
    }
    pavilion(S, cx, cz, Math.min(pwid * 0.74, 12), Math.min(plen * 0.6, 8), pa + Math.PI / 2, top + 0.8, { tiers: 2, wallH: 3.0, roof: hex('#c08a2e'), over: 1.3, rh: 2.6, ridge: hex('#e0c270') });
  } else {
    // Imperial City gates: lower, brightly tiled, three bays
    const top = LAND_Y + 5.2;
    S.kind = KIND.MASONRY;
    S.box(cx, cz, LAND_Y, top, w, Math.max(d, 4), a, hex('#d9c9a4'), { top: PAL.stone, topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) for (const o of [-1, 0, 1]) {
      const fx = cx + px * s * (plen / 2 + 0.1) - pz * o * pwid * 0.28, fz = cz + pz * s * (plen / 2 + 0.1) + px * o * pwid * 0.28;
      S.box(fx, fz, LAND_Y, LAND_Y + (o === 0 ? 3.8 : 3.0), 0.3, o === 0 ? 2.6 : 2.0, pa, dark);
    }
    pavilion(S, cx, cz, Math.min(pwid * 0.8, 14), Math.max(3.5, plen * 0.7), pa + Math.PI / 2, top, { tiers: 2, wallH: 2.2, roof: PAL.jadeRoof, wall: hex('#b9452e'), over: 1.1, rh: 2.2 });
  }
}

// Flag for Kỳ Đài: red field, yellow star, moved by a small vertex wave.
function makeFlag() {
  const cv = document.createElement('canvas');
  cv.width = 192; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#d5231d'; g.fillRect(0, 0, 192, 128);
  g.fillStyle = '#ffdf2e';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 15 : 38, t = -Math.PI / 2 + (i * Math.PI) / 5;
    g[i ? 'lineTo' : 'moveTo'](96 + Math.cos(t) * r, 66 + Math.sin(t) * r);
  }
  g.closePath(); g.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(1, 1, 14, 6);
  geo.translate(0.5, 0, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uTime: { value: 0 }, uLight: { value: 1 } },
    side: THREE.DoubleSide,
    vertexShader: `uniform float uTime; varying vec2 vUv; varying float vSh;
      void main() { vUv = uv; vec3 p = position;
        float w = sin( p.x * 7.0 - uTime * 4.2 ) * 0.07 * p.x + sin( p.x * 3.0 - uTime * 2.6 + p.y * 2.0 ) * 0.05 * p.x;
        p.z += w; p.y -= p.x * p.x * 0.05; vSh = 0.86 + w * 2.4;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 ); }`,
    fragmentShader: `uniform sampler2D map; uniform float uLight; varying vec2 vUv; varying float vSh;
      void main() { vec4 c = texture2D( map, vUv ); gl_FragColor = vec4( c.rgb * vSh * uLight, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

export function buildCitadel(data, S, group) {
  const place = (id) => { const p = data.places.find((q) => q.id === id); return [p.x / 10, p.z / 10]; };
  const cityCentre = place('kinhthanh');
  const impCentre = [data.imperial.c[0] / 10, data.imperial.c[1] / 10];

  for (const g of data.gates) gate(S, g, g.k === 'citadel' ? cityCentre : impCentre);

  // ---- Kỳ Đài: three brick terraces on the Nam Chánh bastion, and the flag ----
  let flag = null;
  if (data.special.kydai) {
    const ring = unflat(data.special.kydai.ring);
    const c = ringCentre(ring);
    const scale = (k) => ring.map((p) => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]);
    let y = LAND_Y;
    const tiers = [[1.0, 5.6], [0.74, 5.8], [0.5, 6.2]]; // 17.6 m of terraces
    S.kind = KIND.MASONRY;
    for (const [k, h] of tiers) {
      S.prism(scale(k), y, y + h, PAL.brick, PAL.stone, { scaleTop: 0.94, centre: c, topKind: KIND.ROAD });
      S.prism(scale(k * 0.94), y + h, y + h + 0.9, shade(PAL.brickLight, 1.05), PAL.stone, { holes: [scale(k * 0.9).reverse()], centre: c, top: true, topKind: KIND.ROAD });
      y += h;
    }
    S.kind = KIND.PLAIN;
    const poleH = 37;
    S.cyl(c[0], c[1], y, y + 3, 1.3, 1.0, 8, PAL.stone);
    S.cyl(c[0], c[1], y + 3, y + poleH, 0.5, 0.28, 8, hex('#e2dccd'));
    flag = makeFlag();
    flag.scale.set(15, 10, 1);
    flag.position.set(c[0], y + poleH - 5.4, c[1]);
    flag.rotation.y = -0.55; // streaming down-wind, toward the river mouth
    group.add(flag);
  }

  // ---- Ngọ Môn: U-shaped masonry base from OSM, Lầu Ngũ Phụng on top ----
  if (data.special.ngomon) {
    const ring = unflat(data.special.ngomon.ring);
    const o = obb(ring);
    const baseTop = LAND_Y + 5.4;
    S.kind = KIND.MASONRY;
    S.prism(ring, LAND_Y, baseTop, hex('#8e8172'), PAL.stone, { topKind: KIND.ROAD, parapet: 0.7 });
    S.kind = KIND.PLAIN;
    const ux = Math.cos(o.a), uz = Math.sin(o.a);
    let vx = -uz, vz = ux; // short axis, pointed out of the Imperial City (the arms of the U reach this way)
    if ((o.c[0] - impCentre[0]) * vx + (o.c[1] - impCentre[1]) * vz < 0) { vx = -vx; vz = -vz; }
    const P = (u, v) => [o.c[0] + ux * u + vx * v, o.c[1] + uz * u + vz * v];
    const back = -o.d * 0.2;
    // centre hall: yellow glazed tiles (the emperor's), two tiers
    let p = P(0, back);
    pavilion(S, p[0], p[1], o.w * 0.4, o.d * 0.4, o.a, baseTop, { tiers: 2, wallH: 3.6, roof: PAL.imperialRoof, over: 1.5, rh: 3.6 });
    // flanking galleries and the two wing pavilions: green tiles
    for (const s of [-1, 1]) {
      p = P(s * o.w * 0.3, back);
      pavilion(S, p[0], p[1], o.w * 0.2, o.d * 0.3, o.a, baseTop, { tiers: 1, wallH: 3.0, roof: PAL.jadeRoof, over: 1.1, rh: 2.4 });
      p = P(s * o.w * 0.405, o.d * 0.08);
      pavilion(S, p[0], p[1], o.d * 0.66, o.w * 0.15, o.a + Math.PI / 2, baseTop, { tiers: 2, wallH: 3.0, roof: PAL.jadeRoof, over: 1.1, rh: 2.6 });
    }
    // the three gateways through the base
    for (const k of [-1, 0, 1]) {
      const q = P(k * o.w * 0.11, back + o.d * 0.2 + 0.2);
      S.box(q[0], q[1], LAND_Y, LAND_Y + (k === 0 ? 4.2 : 3.6), k === 0 ? 3.2 : 2.4, 0.4, o.a, dark);
    }
  }

  // ---- Điện Thái Hòa: twin joined roofs over the throne hall ----
  if (data.special.thaihoa) {
    const o = obb(unflat(data.special.thaihoa.ring));
    const ux = Math.cos(o.a), uz = Math.sin(o.a), vx = -uz, vz = ux;
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], LAND_Y, LAND_Y + 1.4, o.w + 7, o.d + 7, o.a, PAL.stone, { taper: 0.97, topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const [off, dep] of [[-0.24, 0.5], [0.25, 0.46]]) {
      pavilion(S, o.c[0] + vx * o.d * off, o.c[1] + vz * o.d * off, o.w, o.d * dep, o.a, LAND_Y + 1.4, { tiers: 1, wallH: 4.6, roof: PAL.imperialRoof, over: 1.6, rh: 4.6 });
    }
  }

  // ---- riverside pavilions in front of the Citadel ----
  for (const key of ['phuvanlau', 'nghenhluong']) {
    if (!data.special[key]) continue;
    const o = obb(unflat(data.special[key].ring));
    pavilion(S, o.c[0], o.c[1], o.w * 0.86, o.d * 0.86, o.a, LAND_Y, { tiers: key === 'phuvanlau' ? 2 : 1, wallH: 3.2, roof: PAL.imperialRoof2, wall: hex('#8f3b2a'), over: 1.2, rh: 2.6, platform: 0.9 });
  }

  return {
    flag,
    update(time, light) {
      if (flag) { flag.material.uniforms.uTime.value = time; flag.material.uniforms.uLight.value = light; }
    },
  };
}

// ---- Chợ Đông Ba: the mapped main hall with its bell tower ----
export function buildMarket(data, S) {
  if (!data.special.markethall) return;
  const o = obb(unflat(data.special.markethall.ring));
  const y0 = LAND_Y, body = 10.5;
  const wall = PAL.marketWall, roof = PAL.marketRoof;
  S.kind = KIND.FACADE;
  S.box(o.c[0], o.c[1], y0, y0 + body, o.w, o.d, o.a, wall, { top: shade(roof, 0.8) });
  // tiled awning band and a low hip roof
  S.hip(o.c[0], o.c[1], o.w, o.d, o.a, y0 + 4.2, 1.4, roof, { over: 2.2, flare: 0.3 });
  S.hip(o.c[0], o.c[1], o.w, o.d, o.a, y0 + body, 3.4, roof, { over: 1.4, flare: 0.4, fascia: 0.4, fasciaCol: shade(wall, 0.8), ridgeCol: hex('#d9c9a0'), hips: true });
  // bell tower rising through the middle of the hall
  const cx = o.c[0], cz = o.c[1];
  let y = y0 + body + 1.2;
  S.box(cx, cz, y0 + body, y + 5.2, 7.4, 7.4, o.a, wall); y += 5.2;
  S.hip(cx, cz, 7.4, 7.4, o.a, y, 1.5, roof, { over: 1.5, flare: 0.4 }); y += 0.9;
  S.box(cx, cz, y, y + 4.2, 5.4, 5.4, o.a, wall); y += 4.2;
  S.hip(cx, cz, 5.4, 5.4, o.a, y, 1.3, roof, { over: 1.3, flare: 0.4 }); y += 0.8;
  S.box(cx, cz, y, y + 3.0, 3.8, 3.8, o.a, wall); y += 3.0;
  S.hip(cx, cz, 3.8, 3.8, o.a, y, 3.2, roof, { over: 1.0, flare: 0.3 });
  S.kind = KIND.PLAIN;
  S.cyl(cx, cz, y + 3.0, y + 5.4, 0.16, 0.05, 5, hex('#d9c27a'));
}
