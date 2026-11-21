import * as THREE from 'three';
import { Buf, KIND, hex, shade, unflat, ringCentre } from '../geo/buf.js';
import { glowPoints, shared } from '../geo/materials.js';
import { LAND_Y, quality } from '../config.js';

// Nhà hàng nổi Sông Hương (Song Huong Floating Restaurant), 3/2 Lê Lợi, moored off công viên 3/2 just downstream of
// cầu Trường Tiền on the south bank. OSM way 1167997485 (amenity=restaurant) maps it as a near-circle about 30 m
// across, over the water (flag 1 in data.bld). It is the only floating restaurant mapped on the Hương in the model.
//
// What it looks like (from a night photograph taken from the river, and the city's tourism portal: "architecture based
// on a lotus flower"):
//  - a low dark steel pontoon, a walkway round its rim
//  - two glazed storeys, a round drum each, the upper one a little narrower, warm-lit behind white mullions
//  - the lotus is drawn by open petal hoops, not solid petals: a ring of tall hoops standing on the deck rim that
//    rises past the first floor, and a second, staggered ring on the first-floor slab in front of the upper drum.
//    Each hoop is a pointed petal outline (narrow foot, full belly, pointed tip) bowing slightly outward.
//  - after dark LED lines trace every hoop and change colour (pink-red, white, green, blue ...)
//  - a flat roof terrace behind a rail: lamp posts round its edge with festoons of warm bulbs swung between them,
//    and in the middle a small white tent pavilion with strings of bulbs running down from its peak
//  - a gangway to the bank
//
// The water surface is y = 0 (config.js: the city stands LAND_Y above the river).

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

// LED lines on the petal hoops. Each vertex carries (angle round the ring 0..1, ring 0 lower / 1 upper) in its colour;
// the shader turns that and the clock into the light show: a rainbow running round, the whole flower stepping through
// one colour at a time, the two rings alternating pink and green, and a white sparkle chasing round. 30 s a cycle.
function petalLightMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uGlow: shared.uGlow, uTime: { value: 0 }, uBoost: { value: 1.5 } },
    vertexShader: 'attribute vec3 color; varying vec3 vC; void main() { vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `
      uniform float uGlow, uTime, uBoost; varying vec3 vC;
      vec3 hsv( float h, float s, float v ) { vec3 k = clamp( abs( mod( h * 6.0 + vec3( 0.0, 4.0, 2.0 ), 6.0 ) - 3.0 ) - 1.0, 0.0, 1.0 ); return v * mix( vec3( 1.0 ), k, s ); }
      vec3 pal( float i ) {
        i = mod( i, 6.0 );
        if ( i < 1.0 ) return vec3( 1.0, 0.22, 0.32 );
        if ( i < 2.0 ) return vec3( 1.0, 0.95, 0.9 );
        if ( i < 3.0 ) return vec3( 0.3, 1.0, 0.45 );
        if ( i < 4.0 ) return vec3( 1.0, 0.45, 0.8 );
        if ( i < 5.0 ) return vec3( 0.35, 0.6, 1.0 );
        return vec3( 1.0, 0.7, 0.3 );
      }
      vec3 scene( float s, float a, float ring ) {
        s = mod( s, 4.0 );
        if ( s < 1.0 ) return hsv( fract( a + uTime * 0.05 ), 0.7, 1.0 );
        if ( s < 2.0 ) return pal( floor( uTime / 2.5 ) );
        if ( s < 3.0 ) return mix( vec3( 1.0, 0.3, 0.55 ), vec3( 0.35, 1.0, 0.55 ), mod( ring + floor( uTime / 1.5 ), 2.0 ) );
        float d = fract( a - uTime * 0.12 );
        return mix( vec3( 0.9, 0.35, 0.75 ), vec3( 1.0 ), smoothstep( 0.9, 1.0, 1.0 - d ) + smoothstep( 0.9, 1.0, d ) );
      }
      void main() {
        float t = uTime / 7.5, s = floor( t ), f = fract( t );
        vec3 c = mix( scene( s, vC.r, vC.g ), scene( s + 1.0, vC.r, vC.g ), smoothstep( 0.85, 1.0, f ) );
        gl_FragColor = vec4( c * uBoost * uGlow, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
}

// a plain additive light strip (the halls behind their glass)
function washMaterial(color, boost) {
  return new THREE.ShaderMaterial({
    uniforms: { uGlow: shared.uGlow, uColor: { value: new THREE.Color(color) }, uBoost: { value: boost } },
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `uniform vec3 uColor; uniform float uGlow, uBoost;
      void main() { gl_FragColor = vec4( uColor * uBoost * uGlow, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
}

// One restaurant on mapped footprint `ring`. S: the structures buffer; LB: light buffers; glow: bulbs.
function lotusRestaurant(data, S, LB, glow, ring, name) {
  const c = ringCentre(ring);
  const N = quality.low ? 32 : 48;
  // the outline as a radius per angle, smoothed (the mapped ring has ~20 vertices)
  let R = [];
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; R.push(rayHit(ring, c, Math.cos(a), Math.sin(a)) || 12); }
  for (let pass = 0; pass < 2; pass++) R = R.map((r, i) => (R[(i + N - 1) % N] + 2 * r + R[(i + 1) % N]) / 4);
  const Rm = R.reduce((s, r) => s + r, 0) / N;
  const radAt = (a) => {
    const f = ((((a / (Math.PI * 2)) % 1) + 1) % 1) * N, i = Math.floor(f) % N, t = f - Math.floor(f);
    return R[i] * (1 - t) + R[(i + 1) % N] * t;
  };
  const ang = (i) => (i / N) * Math.PI * 2;
  const at = (a, k, y) => { const r = radAt(a) * k; return [c[0] + Math.cos(a) * r, y, c[1] + Math.sin(a) * r]; };
  const ringK = (k) => { const out = []; for (let i = 0; i < N; i++) { const p = at(ang(i), k, 0); out.push([p[0], p[2]]); } return out; };

  // levels, metres above the river
  const KEEL = -0.5, DECK = 0.85, F1 = DECK + 3.3, SLAB = F1 + 0.4, F2 = SLAB + 3.1, ROOF = F2 + 0.4;
  const g1 = 0.8, sk = 0.86, g2 = 0.72, rk = 0.78; // ground drum, slab edge, upper drum, roof edge

  const hullD = hex('#24292c'), hullB = hex('#3a4247'), hullW = hex('#d9d6cf'), deck = hex('#8a7a66');
  const glass = hex('#5b6d6c'), white = hex('#f1eee8'), frame = hex('#ece8e0'), mull = hex('#e6e1d6');
  const roofTile = hex('#b9b2a6'), post = hex('#3b3a38'), tent = hex('#f3efe6');

  // ---- the pontoon: a low dark hull with a pale sheer band, a deck round the rim
  S.kind = KIND.PLAIN;
  S.prism(ringK(0.94), KEEL, 0.15, hullD, hullD, { top: false, scaleTop: 1 / 0.94, centre: c });
  S.prism(ringK(1), 0.15, DECK - 0.18, hullB, hullB, { top: false });
  S.prism(ringK(1), DECK - 0.18, DECK, hullW, deck, { topKind: KIND.FLAT });
  // deck-edge rail
  const railK = 0.985;
  for (let i = 0; i < N; i++) {
    const a = ang(i), b = ang(i + 1);
    S.beam(at(a, railK, DECK + 1.0), at(b, railK, DECK + 1.0), 0.06, 0.06, frame);
    if (i % 2 === 0) S.beam(at(a, railK, DECK), at(a, railK, DECK + 1.0), 0.05, 0.05, frame);
  }

  // ---- two glazed storeys: glass drums with white mullions, lit warm inside after dark
  const drum = (k, y0, y1) => {
    S.prism(ringK(k), y0, y0 + 0.35, white, white, { top: false });
    S.prism(ringK(k - 0.004), y0 + 0.35, y1, glass, glass, { top: false });
    for (let i = 0; i < N; i += 2) { const p = at(ang(i), k + 0.004, 0); S.box(p[0], p[2], y0 + 0.35, y1, 0.16, 0.16, ang(i), mull); }
    for (let i = 0; i < N; i++) { // transom
      const a = ang(i), b = ang(i + 1);
      S.beam(at(a, k + 0.004, y0 + 0.35 + (y1 - y0) * 0.72), at(b, k + 0.004, y0 + 0.35 + (y1 - y0) * 0.72), 0.08, 0.08, mull);
      LB.warm.quad(at(a, k + 0.003, y0 + 0.5), at(b, k + 0.003, y0 + 0.5), at(b, k + 0.003, y1 - 0.25), at(a, k + 0.003, y1 - 0.25), [1, 1, 1], [Math.cos(a), 0, Math.sin(a)]);
    }
  };
  drum(g1, DECK, F1);
  S.prism(ringK(sk), F1, SLAB, white, roofTile, { topKind: KIND.FLAT }); // first-floor slab, a terrace round the drum
  for (let i = 0; i < N; i++) {
    const a = ang(i), b = ang(i + 1);
    S.quad(at(a, g1, F1), at(b, g1, F1), at(b, sk, F1), at(a, sk, F1), shade(white, 0.8), [0, -1, 0]);
    S.beam(at(a, sk - 0.01, SLAB + 1.0), at(b, sk - 0.01, SLAB + 1.0), 0.06, 0.06, frame);
    if (i % 2 === 0) S.beam(at(a, sk - 0.01, SLAB), at(a, sk - 0.01, SLAB + 1.0), 0.05, 0.05, frame);
  }
  drum(g2, SLAB, F2);
  S.prism(ringK(rk), F2, ROOF, white, roofTile, { topKind: KIND.FLAT }); // the roof terrace
  for (let i = 0; i < N; i++) {
    const a = ang(i), b = ang(i + 1);
    S.quad(at(a, g2, F2), at(b, g2, F2), at(b, rk, F2), at(a, rk, F2), shade(white, 0.8), [0, -1, 0]);
    S.beam(at(a, rk - 0.01, ROOF + 1.05), at(b, rk - 0.01, ROOF + 1.05), 0.07, 0.07, frame);
    if (i % 2 === 0) S.beam(at(a, rk - 0.01, ROOF), at(a, rk - 0.01, ROOF + 1.05), 0.05, 0.05, frame);
    // warm LED line on the slab edges
    LB.line.beam(at(a, sk + 0.006, SLAB - 0.12), at(b, sk + 0.006, SLAB - 0.12), 0.07, 0.07, [1, 1, 1]);
    LB.line.beam(at(a, rk + 0.006, ROOF - 0.12), at(b, rk + 0.006, ROOF - 0.12), 0.07, 0.07, [1, 1, 1]);
  }

  // ---- the lotus: open petal hoops, white steel by day, an LED line along each after dark
  const MS = quality.low ? 8 : 14;
  const hoop = (phi, kBase, y0, H, W, bulge, lean, ringNo) => {
    const Rb = radAt(phi) * kBase;
    const half = (v) => (W / 2) * (0.14 * (1 - v) + 0.86 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.72)), 0.7));
    const P = (side, v, out = 0) => {
      const r = Rb + bulge * Math.sin(Math.PI * Math.min(1, v * 1.05)) + lean * v + out;
      const a = phi + (side * half(v)) / r;
      return [c[0] + Math.cos(a) * r, y0 + H * v, c[1] + Math.sin(a) * r];
    };
    const lc = [phi / (Math.PI * 2), ringNo, 1];
    for (const side of [-1, 1]) {
      for (let i = 0; i < MS; i++) {
        const v0 = i / MS, v1 = (i + 1) / MS;
        S.beam(P(side, v0), P(side, v1), 0.16, 0.16, frame);
        LB.petal.beam(P(side, v0, 0.12), P(side, v1, 0.12), 0.11, 0.11, lc);
      }
    }
    S.beam(P(-1, 0), P(1, 0), 0.16, 0.16, frame); // the foot
  };
  const NP = 16;
  const circ = (k) => 2 * Math.PI * Rm * k;
  for (let j = 0; j < NP; j++) { // lower ring, standing on the deck rim, rising past the first floor
    hoop((j / NP) * Math.PI * 2, 0.92, DECK, 5.9, (circ(0.92) / NP) * 1.02, 0.9, 0.4, 0);
  }
  for (let j = 0; j < NP; j++) { // upper ring on the first-floor slab, staggered, in front of the upper drum
    hoop(((j + 0.5) / NP) * Math.PI * 2, 0.81, SLAB, 4.1, (circ(0.81) / NP) * 1.02, 0.55, 0.25, 1);
  }

  // ---- roof terrace: lamp posts with festoons swung between them, a tent pavilion in the middle
  const NPost = 16, PH = 3.0;
  const posts = [];
  for (let j = 0; j < NPost; j++) {
    const a = (j / NPost) * Math.PI * 2, p = at(a, rk - 0.04, ROOF);
    S.cyl(p[0], p[2], ROOF, ROOF + PH, 0.06, 0.06, 6, post, { cap: true });
    S.cyl(p[0], p[2], ROOF + PH, ROOF + PH + 0.3, 0.16, 0.12, 6, post);
    glow.lpos.push(p[0], ROOF + PH + 0.15, p[2]); glow.lcol.push(1.0, 0.86, 0.6);
    posts.push([p[0], ROOF + PH - 0.05, p[2]]);
  }
  const festoon = (A, B, sag, n) => {
    for (let k = 1; k < n; k++) {
      const t = k / n;
      glow.pos.push(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t - sag * 4 * t * (1 - t), A[2] + (B[2] - A[2]) * t);
      glow.col.push(1.0, 0.8, 0.48);
    }
  };
  for (let j = 0; j < NPost; j++) festoon(posts[j], posts[(j + 1) % NPost], 0.7, 7);
  // the tent: eight white posts, a pointed canopy, a finial
  const TR = Math.max(2.4, Rm * 0.17), TH = 2.5, TP = 3.2;
  for (let j = 0; j < 8; j++) {
    const a = (j / 8) * Math.PI * 2;
    S.cyl(c[0] + Math.cos(a) * TR * 0.92, c[1] + Math.sin(a) * TR * 0.92, ROOF, ROOF + TH, 0.08, 0.08, 6, white, { cap: false });
  }
  S.cyl(c[0], c[1], ROOF + TH, ROOF + TH + TP, TR * 1.1, 0.08, 16, tent, { cap: false });
  S.cyl(c[0], c[1], ROOF + TH + TP, ROOF + TH + TP + 0.6, 0.05, 0.05, 4, post, { cap: false });
  S.cyl(c[0], c[1], ROOF + TH - 0.25, ROOF + TH, TR * 1.1, TR * 1.1, 16, tent, { cap: false }); // valance
  const apex = [c[0], ROOF + TH + TP - 0.2, c[1]];
  // strings of bulbs down from the peak: along the canopy seams, then out to every other lamp post
  for (let j = 0; j < NPost; j += 2) {
    const a = (j / NPost) * Math.PI * 2, eave = [c[0] + Math.cos(a) * TR * 1.1, ROOF + TH, c[1] + Math.sin(a) * TR * 1.1];
    festoon(apex, eave, 0, 6);
    festoon(eave, posts[j], 0.5, 8);
  }

  // ---- gangway to the bank
  const bank = nearestBank(data, c);
  if (bank && bank.d < Rm + 40) {
    const dx = (bank.p[0] - c[0]) / bank.d, dz = (bank.p[1] - c[1]) / bank.d, a = Math.atan2(dz, dx);
    const A = at(a, 0.99, DECK), B = [bank.p[0] + dx * 1.5, LAND_Y + 0.02, bank.p[1] + dz * 1.5];
    const len = Math.hypot(B[0] - A[0], B[2] - A[2]);
    if (len > 1.5) {
      const W = 2.4, nx = -dz, nz = dx, off = (p, o, up = 0) => [p[0] + nx * o, p[1] + up, p[2] + nz * o];
      S.kind = KIND.PLAIN;
      S.beam(off(A, 0, -0.12), off(B, 0, -0.12), W, 0.24, hullB);
      S.quad(off(A, -W / 2, 0.005), off(B, -W / 2, 0.005), off(B, W / 2, 0.005), off(A, W / 2, 0.005), deck, [0, 1, 0]);
      const steps = Math.max(2, Math.round(len / 1.6));
      for (const sd of [-1, 1]) {
        S.beam(off(A, sd * W / 2, 1.0), off(B, sd * W / 2, 1.0), 0.06, 0.06, frame);
        for (let k = 0; k <= steps; k++) {
          const t = k / steps, p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
          S.beam(off(p, sd * W / 2, 0), off(p, sd * W / 2, 1.0), 0.05, 0.05, frame);
          if (k % 2 === 0) { const q = off(p, sd * W / 2, 1.08); glow.pos.push(q[0], q[1], q[2]); glow.col.push(1.0, 0.8, 0.5); }
        }
      }
    }
  }
  S.kind = KIND.PLAIN;
  return { name, x: c[0], z: c[1], r: Rm };
}

// Floating restaurants on the Hương, built into the structures buffer S (so populate() keeps the generic piled-deck
// building off the footprint through the cover test) with their night lights in `group` (the dynamic group).
// Call before populate(). Returns { list, glows, update(time) }.
export function buildFloatingRestaurants(data, S, group) {
  const list = [], glows = [];
  let petalMat = null;
  const keepKind = S.kind, keepBase = S.base;
  try {
    S.base = 0;
    const LB = { warm: new Buf(800), petal: new Buf(4000), line: new Buf(800) };
    const glow = { pos: [], col: [], lpos: [], lcol: [] }; // festoon bulbs; lamp heads
    data.bld.forEach((b) => {
      if (!isFloatingRestaurant(b)) return;
      list.push(lotusRestaurant(data, S, LB, glow, unflat(b[0]), b[3]));
    });
    if (list.length) {
      const add = (B, mat) => {
        if (!B.n) return;
        const m = new THREE.Mesh(B.geometry(), mat);
        m.renderOrder = 19;
        m.userData.landmark = true; // counts towards label heights (scripts/lib/label-tops.mjs)
        group.add(m);
      };
      add(LB.warm, washMaterial(0xffc98a, 0.32));
      add(LB.line, washMaterial(0xffd9a0, 1.0));
      petalMat = petalLightMaterial();
      add(LB.petal, petalMat);
      for (const [p, cl, size] of [[glow.pos, glow.col, 1.3], [glow.lpos, glow.lcol, 2.4]]) {
        if (!p.length) continue;
        const pts = glowPoints(p, cl, size);
        pts.userData.glow = true;
        group.add(pts);
        glows.push(pts);
      }
    }
  } catch (e) {
    console.warn('floating restaurants:', e);
  } finally {
    S.kind = keepKind;
    S.base = keepBase;
  }
  return { list, glows, update(time) { if (petalMat) petalMat.uniforms.uTime.value = time; } };
}
