import * as THREE from 'three';
import { KIND, Buf, hex, shade, signedArea, inRing } from '../../geo/buf.js';
import { LAND_Y, WALL_H } from '../../config.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';

// Kỳ Đài, the flag tower of the Huế Citadel, on the Nam Chánh bastion in the middle of the south face (1807, rebuilt
// 1829-1840; concrete pole 1948). Sources and estimates: docs/places/kydai.md.
//
// Three stepped brick tiers, about 17.5 m in all (vi.wikipedia "Kỳ đài (Huế)"):
//   1. the bastion itself (>5.5 m), drawn by city.js as the rampart at WALL_H, with a hole where tier 2 stands;
//   2. the middle tier (~6 m) on OSM way 218427614, the bastion-shaped pentagon (~80 × 60 m);
//   3. the top tier (>6 m) on OSM way 531031593 (35.3 × 17.8 m), carrying the 37 m pole, the two guard huts
//      (điếm canh, rebuilt 2018) at its ends.
// Each tier: a slight batter, a floor of square brick tiles and a 1 m parapet with a band of hollow patterned
// tiles. Stairs climb the north (citadel) faces, in slots cut into the tier, to a 4 m and a 2 m arched gate
// (the lower flight on OSM way 617748885). Cannons on the OSM `historic=cannon` nodes. At night: the 2018
// multicolour LED outline and floodlights at the foot of the pole.
export const id = 'kydai';

// OSM outlines, in model metres
const MID = [[-962.3, 289.9], [-897.4, 243.4], [-876.4, 272.6], [-898.6, 305.9], [-939.9, 318.0]];
const TOP = [[-933.9, 288.7], [-905.7, 267.7], [-894.9, 281.9], [-923.2, 302.9]];
const CANNONS = [[-861.2, 274.5], [-958.6, 341.0], [-932.1, 332.0], [-868.8, 285.8], [-952.2, 338.8], [-865.6, 281.0],
  [-853.7, 263.3], [-857.3, 268.7], [-938.0, 334.0], [-945.0, 336.3], [-898.0, 298.1], [-893.8, 292.4], [-918.6, 310.5],
  [-911.4, 308.3], [-889.4, 286.2], [-925.6, 312.6]];

const RAMP = LAND_Y + WALL_H; // tier 1 (the bastion top, city.js)
const H2 = 5.4, H3 = 5.7; // tier heights: 6.6 + 5.4 + 5.7 = 17.7 m, against "about 17.5 m"
const POLE = 37;
const WALL = hex('#5d5850'), PARA = hex('#a59e90'), COPE = hex('#c3bcad'), FLOOR = hex('#8c7264'), STEP = hex('#8f8a80');

// offset a ring by d (positive: inward), mitred
function inset(r, d) {
  const s = signedArea(r) > 0 ? 1 : -1, n = r.length;
  const nrm = (a, b) => { const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz); return [(-tz * s) / l, (tx * s) / l]; };
  return r.map((p, i) => {
    const a = r[(i - 1 + n) % n], b = r[(i + 1) % n];
    const n0 = nrm(a, p), n1 = nrm(p, b);
    const m = [n0[0] + n1[0], n0[1] + n1[1]], k = d / Math.max(0.35, (m[0] * n0[0] + m[1] * n0[1]));
    return [p[0] + m[0] * k, p[1] + m[1] * k];
  });
}
// cut a rectangular slot into edge 0 of a ring, from t0 to t1 along it, depth inward
function notch(r, t0, t1, depth) {
  const a = r[0], b = r[1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], s = signedArea(r) > 0 ? 1 : -1, w = [-u[1] * s, u[0] * s];
  const P = (t, d) => [a[0] + u[0] * t + w[0] * d, a[1] + u[1] * t + w[1] * d];
  return { ring: [a, P(t0, 0), P(t0, depth), P(t1, depth), P(t1, 0), ...r.slice(1)], u, w, P };
}

export function build({ S, group }) {
  const keep = S.kind;
  const LT = new Buf(1200); // LED outline
  const flood = [], floodCol = [];

  // one tier: battered walls from bottom ring rb to top ring rt, floor, parapet (edges in `skip` left open)
  const tier = (rb, rt, y0, y1, skip = []) => {
    S.kind = KIND.MASONRY;
    const s = signedArea(rb) > 0 ? 1 : -1;
    for (let i = 0, n = rb.length; i < n; i++) {
      const j = (i + 1) % n, a = rb[i], b = rb[j];
      const tx = b[0] - a[0], tz = b[1] - a[1];
      S.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [rt[j][0], y1, rt[j][1]], [rt[i][0], y1, rt[i][1]], WALL, [tz * s, 0.05, -tx * s]);
    }
    S.kind = KIND.ROAD;
    const c2 = rt.map((p) => new THREE.Vector2(p[0], p[1]));
    for (const f of THREE.ShapeUtils.triangulateShape(c2, [])) S.tri([c2[f[0]].x, y1, c2[f[0]].y], [c2[f[1]].x, y1, c2[f[1]].y], [c2[f[2]].x, y1, c2[f[2]].y], FLOOR, [0, 1, 0]);
    // parapet: solid plinth, a band of hollow patterned tiles (piers), coping; LED strip on the coping's outer edge
    const pr = inset(rt, 0.22);
    for (let i = 0, n = pr.length; i < n; i++) {
      if (skip.includes(i)) continue;
      const a = pr[i], b = pr[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l < 0.3) continue;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      S.kind = KIND.MASONRY;
      S.box(mx, mz, y1, y1 + 0.38, l + 0.4, 0.42, ang, PARA);
      S.kind = KIND.PLAIN;
      const k = Math.max(1, Math.round(l / 0.75));
      for (let q = 0; q <= k; q++) {
        const t = q / k;
        S.box(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, y1 + 0.38, y1 + 0.82, 0.26, 0.34, ang, shade(PARA, 0.96));
      }
      S.box(mx, mz, y1 + 0.82, y1 + 1.0, l + 0.46, 0.5, ang, COPE);
      const ox = Math.sin(ang) * 0.27, oz = -Math.cos(ang) * 0.27, so = signedArea(pr) > 0 ? -1 : 1;
      LT.beam([a[0] + ox * so, y1 + 0.97, a[1] + oz * so], [b[0] + ox * so, y1 + 0.97, b[1] + oz * so], 0.1, 0.1, [1, 1, 1]);
    }
  };
  // a straight flight filling a slot: from yb at s0 (along w, from the mouth) up to yt at the slot's back
  const flight = (P, t0, t1, s0, depth, yb, yt, ybase) => {
    const n = Math.max(4, Math.round((yt - yb) / 0.19)), run = depth - s0, tread = run / n;
    const a = P(t0, 0), b = P(t1, 0), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    S.kind = KIND.MASONRY;
    for (let k = 1; k <= n; k++) {
      const sa = s0 + (k - 1) * tread, c = P((t0 + t1) / 2, (sa + depth) / 2);
      S.box(c[0], c[1], ybase, yb + (yt - yb) * (k / n), t1 - t0 - 0.08, depth - sa, ang, STEP, { top: shade(STEP, 1.12), topKind: KIND.ROAD });
    }
    // low cheek walls where the flight stands out of the slot
    if (s0 < 0) for (const t of [t0 - 0.2, t1 + 0.2]) { const p = P(t, s0 / 2); S.box(p[0], p[1], ybase, yb + 0.9, 0.4, -s0, ang, PARA, { top: COPE }); }
  };
  // arched gate over a stair head: two piers, a round arch of short beams, a block and a small tiled cap
  const gate = (P, t0, t1, d, y, h) => {
    const w = t1 - t0, r = w / 2, a = P(t0, d), b = P(t1, d), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const spring = y + h - r - 0.5, top = y + h;
    S.kind = KIND.MASONRY;
    for (const t of [t0 - 0.45, t1 + 0.45]) { const p = P(t, d); S.box(p[0], p[1], y, top, 0.9, 1.0, ang, PARA, { top: COPE }); }
    const m = P((t0 + t1) / 2, d), ux = Math.cos(ang), uz = Math.sin(ang), N = 7;
    for (let i = 0; i < N; i++) {
      const f0 = Math.PI * (i / N), f1 = Math.PI * ((i + 1) / N);
      const q0 = [m[0] - ux * r * Math.cos(f0), spring + r * Math.sin(f0), m[1] - uz * r * Math.cos(f0)];
      const q1 = [m[0] - ux * r * Math.cos(f1), spring + r * Math.sin(f1), m[1] - uz * r * Math.cos(f1)];
      // spandrel: from the arch up to the block
      S.quad([q0[0], q0[1], q0[2]], [q1[0], q1[1], q1[2]], [q1[0], top - 0.3, q1[2]], [q0[0], top - 0.3, q0[2]], PARA, [Math.sin(ang), 0, -Math.cos(ang)]);
      S.quad([q0[0], q0[1], q0[2]], [q1[0], q1[1], q1[2]], [q1[0], top - 0.3, q1[2]], [q0[0], top - 0.3, q0[2]], PARA, [-Math.sin(ang), 0, Math.cos(ang)]);
      S.beam(q0, q1, 0.95, 0.2, shade(PARA, 0.8));
    }
    S.box(m[0], m[1], top - 0.3, top, w + 1.9, 1.1, ang, COPE);
    S.kind = KIND.TILE;
    S.box(m[0], m[1], top, top + 0.35, w + 2.2, 1.4, ang, hex('#6f4a3a'), { taper: 0.55 });
    S.kind = KIND.PLAIN;
  };

  // ---- tier 2: the bastion-shaped pentagon; base 0.15 m proud of the rampart's hole so its parapet is hidden ----
  const y1 = RAMP + H2, y2 = y1 + H3;
  const midBase = inset(MID, -0.15);
  // the lower flight: OSM steps at 67.8 m along the north edge (A→B), climbing south; slot 4 m wide, 8.6 m deep
  const n2 = notch(midBase, 65.8, 69.8, 8.6);
  tier(n2.ring, inset(n2.ring, 0.45), LAND_Y - 0.5, y1, [2]);
  flight(n2.P, 65.8, 69.8, -1.8, 8.6, RAMP, y1, LAND_Y - 0.5);
  gate(n2.P, 65.8, 69.8, 8.6 + 0.45 + 0.5, y1, 3.6);

  // ---- tier 3: the OSM rectangle; its flight, 2.4 m wide, in the east half of the north face ----
  const n3 = notch(TOP, 25.0, 27.4, 6.8);
  tier(n3.ring, inset(n3.ring, 0.4), y1, y2, [2]);
  flight(n3.P, 25.0, 27.4, -1.2, 6.8, y1, y2, y1);
  gate(n3.P, 25.0, 27.4, 6.8 + 0.4 + 0.5, y2, 3.0);

  // ---- top: the pole on the middle of tier 3, the two guard huts at its ends ----
  const c = [(TOP[0][0] + TOP[2][0]) / 2, (TOP[0][1] + TOP[2][1]) / 2];
  const L3 = Math.hypot(TOP[1][0] - TOP[0][0], TOP[1][1] - TOP[0][1]);
  const ua = Math.atan2(TOP[1][1] - TOP[0][1], TOP[1][0] - TOP[0][0]), ux = Math.cos(ua), uz = Math.sin(ua);
  const yt = y2; // floor of tier 3
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], yt, yt + 0.6, 4.2, 4.2, ua, PARA, { top: COPE });
  S.box(c[0], c[1], yt + 0.6, yt + 1.5, 2.6, 2.6, ua, PARA, { top: COPE, taper: 0.9 });
  S.kind = KIND.PLAIN;
  const poleCol = hex('#dcd7cb');
  S.cyl(c[0], c[1], yt + 1.5, yt + POLE - 0.6, 0.62, 0.26, 10, poleCol);
  S.cyl(c[0], c[1], yt + POLE - 0.6, yt + POLE - 0.3, 0.42, 0.42, 10, poleCol);
  S.cyl(c[0], c[1], yt + POLE - 0.3, yt + POLE, 0.3, 0.06, 10, hex('#c9b26a'));
  for (const sg of [-1, 1]) {
    const hc = [c[0] + ux * sg * (L3 / 2 - 2.9), c[1] + uz * sg * (L3 / 2 - 2.9)];
    S.kind = KIND.MASONRY;
    S.box(hc[0], hc[1], yt, yt + 0.25, 4.0, 4.2, ua, STEP);
    S.kind = KIND.FACADE;
    S.box(hc[0], hc[1], yt + 0.25, yt + 2.75, 3.4, 3.6, ua, hex('#d6cbad'));
    S.kind = KIND.PLAIN;
    // a dark door toward the pole and a window on each long side
    const d = [hc[0] - ux * sg * 1.72, hc[1] - uz * sg * 1.72];
    S.box(d[0], d[1], yt + 0.25, yt + 2.15, 0.06, 1.0, ua, hex('#3a2c24'));
    for (const sv of [-1, 1]) { const w = [hc[0] - uz * sv * 1.82, hc[1] + ux * sv * 1.82]; S.box(w[0], w[1], yt + 1.1, yt + 2.0, 0.8, 0.06, ua, hex('#3a2c24')); }
    S.hip(hc[0], hc[1], 3.4, 3.6, ua, yt + 2.75, 1.5, hex('#8a4f37'), { over: 0.5, hips: true, flare: 0.15, ridgeCol: hex('#b9ac95') });
    flood.push(hc[0] - ux * sg * 2.0, yt + 2.5, hc[1] - uz * sg * 2.0); floodCol.push(1.0, 0.78, 0.48);
  }
  // floodlights round the foot of the pole
  for (let i = 0; i < 8; i++) {
    const t = ua + (i / 8) * Math.PI * 2;
    flood.push(c[0] + Math.cos(t) * 2.4, yt + 0.75, c[1] + Math.sin(t) * 2.4);
    floodCol.push(1.0, 0.82, 0.55);
  }

  // ---- cannons on the OSM nodes, muzzles outward ----
  const gun = hex('#3b3832'), wood = hex('#5a4434');
  for (const [x, z] of CANNONS) {
    const y = inRing(x, z, TOP) ? y2 : inRing(x, z, MID) ? y1 : RAMP;
    const dx = x - c[0], dz = z - c[1], l = Math.hypot(dx, dz), ex = dx / l, ez = dz / l;
    S.kind = KIND.PLAIN;
    S.box(x, z, y, y + 0.42, 1.3, 0.75, Math.atan2(ez, ex), wood);
    S.beam([x - ex * 0.9, y + 0.62, z - ez * 0.9], [x + ex * 0.2, y + 0.62, z + ez * 0.2], 0.5, 0.5, gun);
    S.beam([x + ex * 0.2, y + 0.62, z + ez * 0.2], [x + ex * 1.5, y + 0.66, z + ez * 1.5], 0.34, 0.34, gun);
  }
  S.kind = keep;

  // ---- night: LED outline (colour-cycling) and floodlights ----
  const ledMat = lightMaterial(0xffffff, 1.5);
  const led = new THREE.Mesh(LT.geometry(), ledMat);
  led.renderOrder = 19;
  led.userData.landmark = id;
  group.add(led);
  const pts = glowPoints(flood, floodCol, 8);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);

  // ---- the flag, 12 × 8 m, at the masthead ----
  const flag = makeFlag();
  flag.scale.set(12, 8, 1);
  flag.position.set(c[0], yt + POLE - 4.4, c[1]);
  flag.rotation.y = -0.55; // streaming down-wind, toward the river mouth
  flag.userData.landmark = id;
  group.add(flag);

  const col = new THREE.Color();
  return {
    update(time, glow) {
      flag.material.uniforms.uTime.value = time;
      flag.material.uniforms.uLight.value = 1 - 0.4 * Math.min(1, glow || 0);
      // slow drift through the colours, with a warm-white pause each cycle
      const t = (time / 40) % 1;
      if (t < 0.2) col.setRGB(1, 0.86, 0.62); else col.setHSL((t - 0.2) / 0.8, 0.85, 0.55);
      ledMat.uniforms.uColor.value.copy(col);
    },
  };
}

// red field, yellow star; a small vertex wave
function makeFlag() {
  const cv = document.createElement('canvas');
  cv.width = 192; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#da251d'; g.fillRect(0, 0, 192, 128);
  g.fillStyle = '#ffdf00';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 15.5 : 40, t = -Math.PI / 2 + (i * Math.PI) / 5;
    g[i ? 'lineTo' : 'moveTo'](96 + Math.cos(t) * r, 67 + Math.sin(t) * r);
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
      void main() { vec4 c = texture2D( map, vUv );
        gl_FragColor = vec4( c.rgb * vSh * uLight, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}
