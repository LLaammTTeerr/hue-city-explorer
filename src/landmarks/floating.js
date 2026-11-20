import * as THREE from 'three';
import { Buf, KIND, hex, mix, shade, span, unflat, ringCentre } from '../geo/buf.js';
import { glowPoints, lightMaterial, shared } from '../geo/materials.js';
import { LAND_Y, quality } from '../config.js';

// Nhà hàng nổi Sông Hương (Song Huong Floating Restaurant), 3/2 Lê Lợi, moored off công viên 3/2 just downstream of
// cầu Trường Tiền on the south bank. OSM way 1167997485 (amenity=restaurant) maps it as a near-circle about 30 m
// across, over the water (flag 1 in data.bld). It is the only floating restaurant mapped on the Hương in the model.
//
// What it looks like (sources: khamphahue.com.vn, the city's tourism portal: "architecture based on a lotus flower",
// more than 350 seats, a "360-degree view in an open space", run by Hue Tourism JSC; Tripadvisor reviews: "a floating
// restaurant in lotus flower shape", diners sit upstairs and outside, the exterior lights are lit at night over the
// river and cầu Trường Tiền; foody.vn: seen from Tòa Khâm it is "nhà hàng nổi hình hoa", the flower-shaped one):
//  - a round steel pontoon riding on the river (no piles), a walkway round its rim behind a rail
//  - a glazed dining hall on the pontoon, a cantilevered floor above it with an open terrace all round, and a
//    smaller enclosed room in the middle of the upper floor
//  - the roof is the lotus: a ring of broad petals opening outward over the terrace, a ring of upright inner petals
//    and a seed pod at the heart; pale petals blushing pink to the tips
//  - a gangway to the bank, red lanterns under the eaves, a red signboard with yellow letters
//  - at night strings of lights trace the petal edges and the rails; the halls glow behind their glass
// Not confirmed by the sources read (modelled as typical of the type): petal count, exact colours, sign position.
//
// The water surface is y = 0 (config.js: the city stands LAND_Y above the river). Only today's era: span(2).

const FLOAT_RE = /nhà hàng nổi|floating restaurant/i;

// A mapped building that is a floating restaurant: over the water (flag 1) and named as one.
// b: a data.bld record [ring, h*10, kind, name, flags, ...].
export function isFloatingRestaurant(b) {
  return !!b && ((b[4] || 0) & 1) !== 0 && typeof b[3] === 'string' && FLOAT_RE.test(b[3]);
}

// distance from c along direction (dx,dz) to the far edge of ring (largest hit, so a slightly concave outline is fine)
function rayHit(ring, c, dx, dz) {
  let best = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    const ex = b[0] - a[0], ez = b[1] - a[1];
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const ax = a[0] - c[0], az = a[1] - c[1];
    const t = (ax * ez - az * ex) / den, u = (ax * dz - az * dx) / den;
    if (t > 0 && u >= -1e-6 && u <= 1 + 1e-6) best = Math.max(best, t);
  }
  return best;
}

// nearest point of the mapped land to p (land rings are in decimetres)
function nearestBank(data, p, reach = 80) {
  let best = null;
  for (const poly of data.land || []) {
    for (const flat of poly) {
      const r = unflat(flat);
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const q of r) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
      if (p[0] < x0 - reach || p[0] > x1 + reach || p[1] < z0 - reach || p[1] > z1 + reach) continue;
      for (let i = 0; i < r.length; i++) {
        const a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
        const q = [a[0] + dx * t, a[1] + dz * t], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (!best || d < best.d) best = { d, p: q };
      }
    }
  }
  return best;
}

// the signboard's face: red field, yellow letters; lit letters after dark
function signMesh(text, w, h) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = Math.max(64, Math.round((1024 * h) / w));
  const g = cv.getContext('2d');
  const draw = () => {
    g.fillStyle = '#a5161a'; g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = '#f2c94c'; g.lineWidth = cv.height * 0.06; g.strokeRect(g.lineWidth, g.lineWidth, cv.width - g.lineWidth * 2, cv.height - g.lineWidth * 2);
    g.fillStyle = '#ffd84a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let px = cv.height * 0.56;
    g.font = `700 ${px}px "Be Vietnam Pro", "Helvetica Neue", Arial, sans-serif`;
    const max = cv.width * 0.9;
    const m = g.measureText(text).width;
    if (m > max) { px *= max / m; g.font = `700 ${px}px "Be Vietnam Pro", "Helvetica Neue", Arial, sans-serif`; }
    g.fillText(text, cv.width / 2, cv.height * 0.54);
  };
  draw();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { draw(); tex.needsUpdate = true; });
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uGlow: shared.uGlow, uSunI: shared.uSunI },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    // by day the painted board in the sun; after dark the letters light up (yellow LED) and the field goes dim
    fragmentShader: `uniform sampler2D map; uniform float uGlow, uSunI; varying vec2 vUv;
      void main() {
        vec4 c = texture2D( map, vUv );
        float day = clamp( uSunI / 2.5, 0.12, 1.0 ) * 0.85;
        float letter = smoothstep( 0.35, 0.6, c.g );
        vec3 col = c.rgb * day + letter * vec3( 1.0, 0.82, 0.32 ) * uGlow * 1.6;
        gl_FragColor = vec4( col, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

// One restaurant on mapped footprint `ring`. S: the structures buffer; LB: light strips; glow: {pos, col} light points.
function lotusRestaurant(data, S, LB, glow, group, ring, name) {
  const c = ringCentre(ring);
  const N = quality.low ? 32 : 48;
  // the outline as a radius per angle, smoothed (the mapped ring has ~20 vertices)
  let R = [];
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; R.push(rayHit(ring, c, Math.cos(a), Math.sin(a)) || 12); }
  for (let pass = 0; pass < 2; pass++) R = R.map((r, i) => (R[(i + N - 1) % N] + 2 * r + R[(i + 1) % N]) / 4);
  const Rm = R.reduce((s, r) => s + r, 0) / N;
  const radAt = (a) => { // interpolated radius at any angle
    const f = (((a / (Math.PI * 2)) % 1) + 1) % 1 * N, i = Math.floor(f) % N, t = f - Math.floor(f);
    return R[i] * (1 - t) + R[(i + 1) % N] * t;
  };
  const ang = (i) => (i / N) * Math.PI * 2;
  const at = (a, k, y) => { const r = radAt(a) * k; return [c[0] + Math.cos(a) * r, y, c[1] + Math.sin(a) * r]; };
  const ringK = (k) => { const out = []; for (let i = 0; i < N; i++) { const p = at(ang(i), k, 0); out.push([p[0], p[2]]); } return out; };

  // levels, metres above the river
  const KEEL = -0.6, DECK = 0.95, F1 = DECK + 3.1, SLAB = F1 + 0.42, F2 = SLAB + 2.7;

  const hullD = hex('#2d3a40'), hullB = hex('#3f5a66'), hullW = hex('#eeeae0'), wood = hex('#9a7552'), woodD = hex('#7a5a3e');
  const glass = hex('#4e6e74'), glassUp = hex('#5d7d82'), white = hex('#f2eee6'), cream = hex('#e9dfc8'), rail = hex('#e8e2d4');
  const petalBase = hex('#f6efe9'), petalMid = hex('#f0bfcc'), petalTip = hex('#d65a82'), petalUnder = hex('#ecd3d3');
  const red = hex('#b3241f'), gold = hex('#d9a93a'), pod = hex('#b9c46a'), podTop = hex('#9aa856'), dark = hex('#2a2522');

  // ---- the pontoon: rounded bilge under the waterline, blue-grey topsides, a white sheer band, a timber deck
  S.kind = KIND.PLAIN;
  S.prism(ringK(0.9), KEEL, 0.1, hullD, hullD, { top: false, scaleTop: 1 / 0.9, centre: c });
  S.prism(ringK(1), 0.1, 0.62, hullB, hullB, { top: false });
  S.prism(ringK(1), 0.62, DECK, hullW, wood, { topKind: KIND.FLAT });
  // rub rail (tyre fenders read as a dark band at the waterline)
  S.prism(ringK(1.012), 0.18, 0.36, dark, dark, { top: false });

  // ---- rail round the rim walkway
  const railK = 0.985, RH = 1.05;
  for (let i = 0; i < N; i++) {
    const a = ang(i), b = ang(i + 1), p = at(a, railK, DECK + RH), q = at(b, railK, DECK + RH);
    S.beam(p, q, 0.07, 0.07, rail);
    S.beam(at(a, railK, DECK + 0.5), at(b, railK, DECK + 0.5), 0.04, 0.04, rail);
    if (i % 2 === 0) S.beam(at(a, railK, DECK), p, 0.07, 0.07, rail);
  }

  // ---- ground-floor hall: a glass drum with white mullions over a cream plinth
  const g1 = 0.84;
  S.prism(ringK(g1), DECK, DECK + 0.45, cream, cream, { top: false });
  S.prism(ringK(g1 - 0.005), DECK + 0.45, F1, glass, glass, { top: false });
  for (let i = 0; i < N; i += 2) {
    const p = at(ang(i), g1 + 0.005, 0);
    S.box(p[0], p[2], DECK + 0.45, F1, 0.22, 0.22, ang(i), white);
  }
  // the interior lit behind the glass after dark: a soft additive wash laid on the glass (invisible by day)
  for (let i = 0; i < N; i++) {
    const a = ang(i), b = ang(i + 1);
    LB.warm.quad(at(a, g1 + 0.004, DECK + 0.9), at(b, g1 + 0.004, DECK + 0.9), at(b, g1 + 0.004, F1 - 0.3), at(a, g1 + 0.004, F1 - 0.3), [1, 1, 1], [Math.cos(a), 0, Math.sin(a)]);
  }

  // ---- first-floor slab, cantilevered almost to the rim: white fascia, tiled terrace floor, a soffit under it
  const sk = 0.975;
  S.prism(ringK(sk), F1, SLAB, white, hex('#c9b9a0'), { topKind: KIND.FLAT });
  for (let i = 0; i < N; i++) {
    const a = ang(i), b = ang(i + 1);
    S.quad(at(a, g1, F1), at(b, g1, F1), at(b, sk, F1), at(a, sk, F1), shade(white, 0.8), [0, -1, 0]);
  }
  // terrace rail (glass balustrade with a white top rail)
  const tk = 0.955;
  for (let i = 0; i < N; i++) {
    const a = ang(i), b = ang(i + 1);
    S.beam(at(a, tk, SLAB + 1.05), at(b, tk, SLAB + 1.05), 0.08, 0.08, rail);
    S.quad(at(a, tk, SLAB), at(b, tk, SLAB), at(b, tk, SLAB + 1.0), at(a, tk, SLAB + 1.0), shade(glassUp, 1.15), [Math.cos(a), 0, Math.sin(a)]);
    if (i % 3 === 0) S.beam(at(a, tk, SLAB), at(a, tk, SLAB + 1.05), 0.06, 0.06, rail);
  }

  // ---- upper room in the middle of the first floor, glazed, carrying the lotus
  const g2 = 0.6;
  S.prism(ringK(g2), SLAB, F2, glassUp, white, { topKind: KIND.FLAT });
  for (let i = 0; i < N; i += 2) {
    const p = at(ang(i), g2 + 0.005, 0);
    S.box(p[0], p[2], SLAB, F2, 0.2, 0.2, ang(i), white);
  }
  S.prism(ringK(g2 + 0.01), F2 - 0.35, F2, white, white, { top: false }); // ring beam under the petals
  for (let i = 0; i < N; i++) {
    const a = ang(i), b = ang(i + 1);
    LB.warm.quad(at(a, g2 + 0.004, SLAB + 0.6), at(b, g2 + 0.004, SLAB + 0.6), at(b, g2 + 0.004, F2 - 0.5), at(a, g2 + 0.004, F2 - 0.5), [1, 1, 1], [Math.cos(a), 0, Math.sin(a)]);
  }
  // slender columns on the terrace under the outer petals
  const NP = 12;
  for (let j = 0; j < NP; j++) {
    const a = (j / NP) * Math.PI * 2, p = at(a, 0.86, 0); // under each outer petal's spine
    S.cyl(p[0], p[2], SLAB, F2 + 1.2, 0.13, 0.13, 6, white, { cap: false });
  }

  // ---- the lotus: petals lofted along a curved spine, cupped across, pale at the base and pink at the tip
  // petal(phi, base:[k,y], ctrl:[k,y], tip:[k,y], half-angle, cup)
  const sN = quality.low ? 4 : 7, uN = quality.low ? 2 : 4;
  const petal = (phi, base, ctrl, tip, half, cup, edgeLights) => {
    const Rp = radAt(phi);
    const spine = (s) => {
      const k = (1 - s) * (1 - s) * base[0] + 2 * s * (1 - s) * ctrl[0] + s * s * tip[0];
      const y = (1 - s) * (1 - s) * base[1] + 2 * s * (1 - s) * ctrl[1] + s * s * tip[1];
      return [k * Rp, y];
    };
    const width = (s) => Math.pow(Math.max(0, Math.sin(Math.PI * (0.25 + 0.75 * s))), 0.8);
    const P = (s, u) => {
      const [r, y] = spine(s), w = width(s);
      const a = phi + u * half * w * (r > 0.01 ? (base[0] * Rp) / Math.max(r, base[0] * Rp * 0.6) : 1);
      const rr = r * (1 - 0.04 * u * u * w); // the edges curl in a little
      return [c[0] + Math.cos(a) * rr, y + cup * u * u * w, c[1] + Math.sin(a) * rr];
    };
    const col = (s) => (s < 0.5 ? mix(petalBase, petalMid, s / 0.5) : mix(petalMid, petalTip, Math.pow((s - 0.5) / 0.5, 1.4)));
    const out = [Math.cos(phi), 0, Math.sin(phi)];
    const G = [];
    for (let i = 0; i <= sN; i++) { const row = []; for (let k = 0; k <= uN; k++) row.push(P(i / sN, -1 + (2 * k) / uN)); G.push(row); }
    const nrm = (i, k) => {
      const a = G[Math.min(sN, i + 1)][k], b = G[Math.max(0, i - 1)][k], d = G[i][Math.min(uN, k + 1)], e = G[i][Math.max(0, k - 1)];
      const ds = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], du = [d[0] - e[0], d[1] - e[1], d[2] - e[2]];
      let n = [ds[1] * du[2] - ds[2] * du[1], ds[2] * du[0] - ds[0] * du[2], ds[0] * du[1] - ds[1] * du[0]];
      // the face that looks outward and up is the petal's back (outer side)
      if (n[0] * out[0] + n[2] * out[2] + n[1] * 0.3 < 0) n = n.map((v) => -v);
      if (!(Math.hypot(...n) > 1e-9)) n = [out[0], 0.3, out[2]];
      return n;
    };
    S.kind = KIND.PLAIN;
    for (let i = 0; i < sN; i++) for (let k = 0; k < uN; k++) {
      const v = [G[i][k], G[i + 1][k], G[i + 1][k + 1], G[i][k + 1]];
      const n = [nrm(i, k), nrm(i + 1, k), nrm(i + 1, k + 1), nrm(i, k + 1)];
      const cs = [col(i / sN), col((i + 1) / sN), col((i + 1) / sN), col(i / sN)];
      const ci = cs.map((q) => mix(q, petalUnder, 0.35));
      // outer face, wound to its normal; then the inner face with the winding and normals reversed
      const fa = (p0, p1, p2) => {
        const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
        return [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      };
      const f = fa(v[0], v[1], v[2]), flip = f[0] * n[0][0] + f[1] * n[0][1] + f[2] * n[0][2] < 0;
      const o = flip ? [0, 3, 2, 1] : [0, 1, 2, 3];
      S.smoothTri([v[o[0]], v[o[1]], v[o[2]]], [n[o[0]], n[o[1]], n[o[2]]], [cs[o[0]], cs[o[1]], cs[o[2]]]);
      S.smoothTri([v[o[0]], v[o[2]], v[o[3]]], [n[o[0]], n[o[2]], n[o[3]]], [cs[o[0]], cs[o[2]], cs[o[3]]]);
      const neg = n.map((q) => q.map((x) => -x));
      S.smoothTri([v[o[0]], v[o[2]], v[o[1]]], [neg[o[0]], neg[o[2]], neg[o[1]]], [ci[o[0]], ci[o[2]], ci[o[1]]]);
      S.smoothTri([v[o[0]], v[o[3]], v[o[2]]], [neg[o[0]], neg[o[3]], neg[o[2]]], [ci[o[0]], ci[o[3]], ci[o[2]]]);
    }
    if (edgeLights) {
      // a string of LEDs up each edge to the tip, and a bulb on the tip
      for (const k of [0, uN]) for (let i = 0; i < sN; i++) {
        const a = G[i][k], b = G[i + 1][k];
        LB.pink.beam([a[0], a[1] + 0.05, a[2]], [b[0], b[1] + 0.05, b[2]], 0.09, 0.09, [1, 1, 1]);
      }
      const t = G[sN][uN >> 1];
      glow.lpos.push(t[0], t[1] + 0.15, t[2]); glow.lcol.push(1.0, 0.72, 0.82);
    }
  };
  // outer ring: broad petals opening out over the terrace, tips curling up past the rim
  const half = (Math.PI / NP) * 1.12;
  for (let j = 0; j < NP; j++) petal((j / NP) * Math.PI * 2, [g2, F2 - 0.1], [0.9, F2 + 0.7], [1.04, F2 + 3.0], half, 0.7, true);
  // inner ring, staggered, more upright
  for (let j = 0; j < NP; j++) petal(((j + 0.5) / NP) * Math.PI * 2, [0.42, F2], [0.55, F2 + 1.2], [0.6, F2 + 3.4], half * 0.95, 0.35, true);
  // the seed pod at the heart
  const podR = Math.max(1.6, Rm * 0.2);
  S.cyl(c[0], c[1], F2, F2 + 1.0, podR * 0.75, podR, 16, pod, { cap: false });
  S.kind = KIND.FLAT;
  S.cyl(c[0], c[1], F2 + 1.0, F2 + 1.15, podR, podR * 0.92, 16, podTop);
  S.kind = KIND.PLAIN;
  for (let j = 0; j < 7; j++) { // seed holes
    const a = (j / 7) * Math.PI * 2, rr = j === 0 ? 0 : podR * 0.55;
    S.cyl(c[0] + Math.cos(a) * rr * (j ? 1 : 0), c[1] + Math.sin(a) * rr * (j ? 1 : 0), F2 + 1.15, F2 + 1.2, 0.22, 0.22, 6, shade(podTop, 0.7));
  }

  // ---- red lanterns hung under the slab round the walkway
  for (let i = 0; i < N; i += 3) {
    const p = at(ang(i) + Math.PI / N, 0.93, 0);
    S.cyl(p[0], p[2], F1 - 0.35, F1, 0.025, 0.025, 4, dark, { cap: false });
    S.cyl(p[0], p[2], F1 - 0.42, F1 - 0.35, 0.16, 0.16, 8, gold);
    S.cyl(p[0], p[2], F1 - 0.95, F1 - 0.42, 0.3, 0.3, 8, red, { cap: false });
    S.cyl(p[0], p[2], F1 - 1.02, F1 - 0.95, 0.16, 0.16, 8, gold);
    glow.lpos.push(p[0], F1 - 0.68, p[2]); glow.lcol.push(1.0, 0.36, 0.18);
  }

  // ---- string lights: a festoon of warm bulbs under the slab edge and along both rails
  for (let i = 0; i < N; i++) {
    const a = ang(i);
    const s = at(a, sk + 0.01, F1 + 0.12); glow.pos.push(s[0], s[1], s[2]); glow.col.push(1.0, 0.82, 0.5);
    if (i % 2 === 0) { const r = at(a, railK, DECK + RH + 0.08); glow.pos.push(r[0], r[1], r[2]); glow.col.push(1.0, 0.78, 0.45); }
    const t = at(a + Math.PI / N, tk, SLAB + 1.13); glow.pos.push(t[0], t[1], t[2]); glow.col.push(1.0, 0.8, 0.5);
  }
  // an LED line along the slab fascia and the rim of the pontoon
  for (let i = 0; i < N; i++) {
    const a = ang(i), b = ang(i + 1);
    LB.warmLine.beam(at(a, sk + 0.008, SLAB - 0.1), at(b, sk + 0.008, SLAB - 0.1), 0.08, 0.08, [1, 1, 1]);
    LB.warmLine.beam(at(a, 1.006, DECK - 0.05), at(b, 1.006, DECK - 0.05), 0.06, 0.06, [1, 1, 1]);
  }

  // ---- gangway to the bank
  const bank = nearestBank(data, c);
  let toBank = null;
  if (bank && bank.d < Rm + 40) {
    const dx = (bank.p[0] - c[0]) / bank.d, dz = (bank.p[1] - c[1]) / bank.d, a = Math.atan2(dz, dx);
    toBank = [dx, dz];
    const A = at(a, 0.99, DECK), B = [bank.p[0] + dx * 1.5, LAND_Y + 0.02, bank.p[1] + dz * 1.5];
    const len = Math.hypot(B[0] - A[0], B[2] - A[2]);
    if (len > 1.5) {
      const W = 2.4, nx = -dz, nz = dx, off = (p, o, up = 0) => [p[0] + nx * o, p[1] + up, p[2] + nz * o];
      S.kind = KIND.PLAIN;
      S.beam(off(A, 0, -0.12), off(B, 0, -0.12), W, 0.24, woodD);
      S.quad(off(A, -W / 2, 0.005), off(B, -W / 2, 0.005), off(B, W / 2, 0.005), off(A, W / 2, 0.005), wood, [0, 1, 0]);
      const steps = Math.max(2, Math.round(len / 1.6));
      for (const sd of [-1, 1]) {
        S.beam(off(A, sd * W / 2, 1.0), off(B, sd * W / 2, 1.0), 0.07, 0.07, rail);
        for (let k = 0; k <= steps; k++) {
          const t = k / steps, p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
          S.beam(off(p, sd * W / 2, 0), off(p, sd * W / 2, 1.0), 0.06, 0.06, rail);
          if (k % 2 === 0) { const q = off(p, sd * W / 2, 1.08); glow.pos.push(q[0], q[1], q[2]); glow.col.push(1.0, 0.8, 0.5); }
        }
      }
      // a small floating landing stage the gangway hinges on, and a lit arch over the shore end
      const Ls = at(a, 1.0, 0);
      S.box(Ls[0] + dx * 1.0, Ls[2] + dz * 1.0, 0.05, DECK - 0.02, 2.2, 3.4, a, hullB, { top: wood, topKind: KIND.FLAT });
      for (const sd of [-1, 1]) S.cyl(B[0] + nx * sd * 1.6, B[2] + nz * sd * 1.6, LAND_Y, LAND_Y + 3.4, 0.14, 0.14, 8, red, { cap: true });
      S.beam(off(B, -1.9, 3.3), off(B, 1.9, 3.3), 0.28, 0.4, red);
      S.beam(off(B, -2.1, 3.55), off(B, 2.1, 3.55), 0.18, 0.2, gold);
      for (const sd of [-1, 1]) { const q = off(B, sd * 1.6, 3.1); glow.lpos.push(q[0], q[1], q[2]); glow.lcol.push(1.0, 0.36, 0.18); }
    }
  }

  // ---- signboards: on the slab fascia facing the bank (Lê Lợi) and facing the river
  const label = (name || 'Nhà hàng nổi Sông Hương').toUpperCase();
  const faceA = toBank ? Math.atan2(toBank[1], toBank[0]) : Math.PI / 2;
  const SW = Math.min(12, Rm * 0.75), SH = 1.25;
  for (const fa of [faceA, faceA + Math.PI]) {
    const r = radAt(fa) * sk + 0.12, ux = Math.cos(fa), uz = Math.sin(fa);
    const cx = c[0] + ux * r, cz = c[1] + uz * r, yc = SLAB + 0.75;
    S.kind = KIND.PLAIN;
    S.box(cx, cz, yc - SH / 2 - 0.1, yc + SH / 2 + 0.1, 0.16, SW + 0.2, fa, gold);
    for (const sd of [-0.38, 0.38]) S.box(cx - uz * sd * SW, cz + ux * sd * SW, SLAB - 0.05, yc - SH / 2, 0.1, 0.1, fa, dark);
    const m = signMesh(label, SW, SH);
    if (m) {
      m.position.set(cx + ux * 0.09, yc, cz + uz * 0.09);
      m.rotation.y = Math.PI / 2 - fa; // the plane's +z normal turned to face outward along (ux, uz)
      m.userData.minEra = 2;
      group.add(m);
    }
  }
  S.kind = KIND.PLAIN;
  return { name, x: c[0], z: c[1], r: Rm };
}

// Floating restaurants on the Hương, built into the structures buffer S (so populate() keeps the generic piled-deck
// building off the footprint through the cover test) with their night lights in `group` (the dynamic group).
// Call before populate(). Returns { list, glows }.
export function buildFloatingRestaurants(data, S, group) {
  const list = [], glows = [];
  const keepSpan = S.span, keepKind = S.kind, keepBase = S.base;
  try {
    S.span = span(2);
    S.base = 0;
    const LB = { warm: new Buf(800), pink: new Buf(1600), warmLine: new Buf(800) };
    const glow = { pos: [], col: [], lpos: [], lcol: [] }; // bulbs on the strings; lanterns and petal-tip lamps
    data.bld.forEach((b) => {
      if (!isFloatingRestaurant(b)) return;
      list.push(lotusRestaurant(data, S, LB, glow, group, unflat(b[0]), b[3]));
    });
    if (!list.length) return { list, glows };
    const strip = (B, color, boost) => {
      if (!B.n) return;
      const m = new THREE.Mesh(B.geometry(), lightMaterial(color, boost));
      m.renderOrder = 19;
      m.userData.minEra = 2;
      group.add(m);
    };
    strip(LB.warm, 0xffc98a, 0.3); // halls lit behind the glass
    strip(LB.pink, 0xffd2e2, 1.5); // LED strings on the petal edges
    strip(LB.warmLine, 0xffd9a0, 1.1); // fascia and rim
    for (const [p, cl, size] of [[glow.pos, glow.col, 1.4], [glow.lpos, glow.lcol, 2.8]]) {
      if (!p.length) continue;
      const pts = glowPoints(p, cl, size);
      pts.userData.glow = true;
      pts.userData.minEra = 2;
      group.add(pts);
      glows.push(pts);
    }
  } catch (e) {
    console.warn('floating restaurants:', e);
  } finally {
    S.span = keepSpan;
    S.kind = keepKind;
    S.base = keepBase;
  }
  return { list, glows };
}
