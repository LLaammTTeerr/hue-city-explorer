import * as THREE from 'three';
import { Buf, KIND, hex, shade, unflat, ringCentre } from '../geo/buf.ts';
import { glowPoints, shared } from '../geo/materials.ts';
import { LAND_Y, quality } from '../config.ts';

// Nhà hàng nổi Sông Hương (Song Huong Floating Restaurant), moored off công viên 3/2 just downstream of
// cầu Trường Tiền on the south bank.

const FLOAT_RE = /nhà hàng nổi|floating restaurant/i;
const NEAREST_BANK_REACH_M = 80;
const PETAL_COUNT = 16;
const ROOF_POST_COUNT = 16;
const ROOF_POST_H_M = 3.0;
const GLOW_THRESHOLD = 0.01;
const GANGWAY_MAX_EXTRA_M = 40;
const GANGWAY_WIDTH_M = 2.4;

const LEVELS = {
  keel: -0.5,
  deck: 0.85,
  floor1: 0.85 + 3.3,
  slab: 0.85 + 3.3 + 0.4,
  floor2: 0.85 + 3.3 + 0.4 + 3.1,
  roof: 0.85 + 3.3 + 0.4 + 3.1 + 0.4,
} as const;

const RADII_SCALE = { groundDrum: 0.8, slabEdge: 0.86, upperDrum: 0.72, roofEdge: 0.78, deckRail: 0.985 } as const;

const COLORS = {
  hullDark: hex('#24292c'), hullBody: hex('#3a4247'), hullWhite: hex('#d9d6cf'), deck: hex('#8a7a66'),
  glass: hex('#5b6d6c'), white: hex('#f1eee8'), frame: hex('#ece8e0'), mullion: hex('#e6e1d6'),
  roofTile: hex('#b9b2a6'), post: hex('#3b3a38'), tent: hex('#f3efe6'),
};

export function isFloatingRestaurant(rec: any) {
  return !!rec && ((rec[4] || 0) & 1) !== 0 && typeof rec[3] === 'string' && FLOAT_RE.test(rec[3]);
}

function rayHitRing(ring: number[][], center: [number, number], dx: number, dz: number) {
  let best = 0;
  for (let i = 0, len = ring.length; i < len; i++) {
    const p0 = ring[i], p1 = ring[(i + 1) % len];
    const ex = p1[0] - p0[0], ez = p1[1] - p0[1];
    const denom = dx * ez - dz * ex;
    if (Math.abs(denom) < 1e-9) continue;
    const ax = p0[0] - center[0], az = p0[1] - center[1];
    const dist = (ax * ez - az * ex) / denom;
    const frac = (ax * dz - az * dx) / denom;
    if (dist > 0 && frac >= -1e-6 && frac <= 1 + 1e-6) best = Math.max(best, dist);
  }
  return best;
}

function nearestBank(data: any, pt: [number, number], reach = NEAREST_BANK_REACH_M) {
  let best: { d: number; p: [number, number] } | null = null;
  for (const poly of data.land || []) {
    for (const flat of poly) {
      const ring = unflat(flat);
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const vertex of ring) { x0 = Math.min(x0, vertex[0]); x1 = Math.max(x1, vertex[0]); z0 = Math.min(z0, vertex[1]); z1 = Math.max(z1, vertex[1]); }
      if (pt[0] < x0 - reach || pt[0] > x1 + reach || pt[1] < z0 - reach || pt[1] > z1 + reach) continue;
      for (let i = 0; i < ring.length; i++) {
        const p0 = ring[i], p1 = ring[(i + 1) % ring.length];
        const dx = p1[0] - p0[0], dz = p1[1] - p0[1], lenSq = dx * dx + dz * dz || 1;
        const frac = Math.max(0, Math.min(1, ((pt[0] - p0[0]) * dx + (pt[1] - p0[1]) * dz) / lenSq));
        const closest: [number, number] = [p0[0] + dx * frac, p0[1] + dz * frac];
        const dist = Math.hypot(closest[0] - pt[0], closest[1] - pt[1]);
        if (!best || dist < best.d) best = { d: dist, p: closest };
      }
    }
  }
  return best;
}

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

function washMaterial(color: number, boost: number) {
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

function buildRoofTerrace(buf: Buf, glow: any, center: [number, number], meanRadius: number, at: (ang: number, scale: number, y: number) => [number, number, number]) {
  const posts: [number, number, number][] = [];
  for (let j = 0; j < ROOF_POST_COUNT; j++) {
    const ang = (j / ROOF_POST_COUNT) * Math.PI * 2;
    const pt = at(ang, RADII_SCALE.roofEdge - 0.04, LEVELS.roof);
    buf.cyl(pt[0], pt[2], LEVELS.roof, LEVELS.roof + ROOF_POST_H_M, 0.06, 0.06, 6, COLORS.post, { cap: true });
    buf.cyl(pt[0], pt[2], LEVELS.roof + ROOF_POST_H_M, LEVELS.roof + ROOF_POST_H_M + 0.3, 0.16, 0.12, 6, COLORS.post);
    glow.lpos.push(pt[0], LEVELS.roof + ROOF_POST_H_M + 0.15, pt[2]);
    glow.lcol.push(1.0, 0.86, 0.6);
    posts.push([pt[0], LEVELS.roof + ROOF_POST_H_M - 0.05, pt[2]]);
  }
  const addFestoon = (p0: number[], p1: number[], sag: number, count: number) => {
    for (let k = 1; k < count; k++) {
      const t = k / count;
      glow.pos.push(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t - sag * 4 * t * (1 - t), p0[2] + (p1[2] - p0[2]) * t);
      glow.col.push(1.0, 0.8, 0.48);
    }
  };
  for (let j = 0; j < ROOF_POST_COUNT; j++) addFestoon(posts[j], posts[(j + 1) % ROOF_POST_COUNT], 0.7, 7);

  const tentR = Math.max(2.4, meanRadius * 0.17);
  const tentH = 2.5, tentPeak = 3.2;
  for (let j = 0; j < 8; j++) {
    const ang = (j / 8) * Math.PI * 2;
    buf.cyl(center[0] + Math.cos(ang) * tentR * 0.92, center[1] + Math.sin(ang) * tentR * 0.92, LEVELS.roof, LEVELS.roof + tentH, 0.08, 0.08, 6, COLORS.white, { cap: false });
  }
  buf.cyl(center[0], center[1], LEVELS.roof + tentH, LEVELS.roof + tentH + tentPeak, tentR * 1.1, 0.08, 16, COLORS.tent, { cap: false });
  buf.cyl(center[0], center[1], LEVELS.roof + tentH + tentPeak, LEVELS.roof + tentH + tentPeak + 0.6, 0.05, 0.05, 4, COLORS.post, { cap: false });
  buf.cyl(center[0], center[1], LEVELS.roof + tentH - 0.25, LEVELS.roof + tentH, tentR * 1.1, tentR * 1.1, 16, COLORS.tent, { cap: false });
  const apex = [center[0], LEVELS.roof + tentH + tentPeak - 0.2, center[1]];
  for (let j = 0; j < ROOF_POST_COUNT; j += 2) {
    const ang = (j / ROOF_POST_COUNT) * Math.PI * 2;
    const eave = [center[0] + Math.cos(ang) * tentR * 1.1, LEVELS.roof + tentH, center[1] + Math.sin(ang) * tentR * 1.1];
    addFestoon(apex, eave, 0, 6);
    addFestoon(eave, posts[j], 0.5, 8);
  }
}

function buildGangway(data: any, buf: Buf, glow: any, center: [number, number], meanRadius: number, at: (ang: number, scale: number, y: number) => [number, number, number]) {
  const bank = nearestBank(data, center);
  if (!bank || bank.d >= meanRadius + GANGWAY_MAX_EXTRA_M) return;
  const dx = (bank.p[0] - center[0]) / bank.d;
  const dz = (bank.p[1] - center[1]) / bank.d;
  const startPt = at(Math.atan2(dz, dx), 0.99, LEVELS.deck);
  const endPt = [bank.p[0] + dx * 1.5, LAND_Y + 0.02, bank.p[1] + dz * 1.5];
  const len = Math.hypot(endPt[0] - startPt[0], endPt[2] - startPt[2]);
  if (len <= 1.5) return;

  const nx = -dz, nz = dx;
  const offsetPt = (pt: number[], across: number, up = 0) => [pt[0] + nx * across, pt[1] + up, pt[2] + nz * across];
  buf.kind = KIND.PLAIN;
  buf.beam(offsetPt(startPt, 0, -0.12), offsetPt(endPt, 0, -0.12), GANGWAY_WIDTH_M, 0.24, COLORS.hullBody);
  buf.quad(offsetPt(startPt, -GANGWAY_WIDTH_M / 2, 0.005), offsetPt(endPt, -GANGWAY_WIDTH_M / 2, 0.005), offsetPt(endPt, GANGWAY_WIDTH_M / 2, 0.005), offsetPt(startPt, GANGWAY_WIDTH_M / 2, 0.005), COLORS.deck, [0, 1, 0]);

  const steps = Math.max(2, Math.round(len / 1.6));
  for (const side of [-1, 1]) {
    const railOff = (side * GANGWAY_WIDTH_M) / 2;
    buf.beam(offsetPt(startPt, railOff, 1.0), offsetPt(endPt, railOff, 1.0), 0.06, 0.06, COLORS.frame);
    for (let k = 0; k <= steps; k++) {
      const frac = k / steps;
      const pt = [startPt[0] + (endPt[0] - startPt[0]) * frac, startPt[1] + (endPt[1] - startPt[1]) * frac, startPt[2] + (endPt[2] - startPt[2]) * frac];
      buf.beam(offsetPt(pt, railOff, 0), offsetPt(pt, railOff, 1.0), 0.05, 0.05, COLORS.frame);
      if (k % 2 === 0) {
        const bulb = offsetPt(pt, railOff, 1.08);
        glow.pos.push(bulb[0], bulb[1], bulb[2]);
        glow.col.push(1.0, 0.8, 0.5);
      }
    }
  }
}

function buildLotusRestaurant(data: any, buf: Buf, lightBufs: { warm: Buf; petal: Buf; line: Buf }, glow: any, ring: number[][], name: string) {
  const center = ringCentre(ring);
  const segCount = quality.low ? 32 : 48;
  let radii: number[] = [];
  for (let i = 0; i < segCount; i++) {
    const ang = (i / segCount) * Math.PI * 2;
    radii.push(rayHitRing(ring, center, Math.cos(ang), Math.sin(ang)) || 12);
  }
  for (let pass = 0; pass < 2; pass++) {
    radii = radii.map((rad, i) => (radii[(i + segCount - 1) % segCount] + 2 * rad + radii[(i + 1) % segCount]) / 4);
  }
  const meanRadius = radii.reduce((sum, rad) => sum + rad, 0) / segCount;
  const radiusAt = (ang: number) => {
    const pos = ((((ang / (Math.PI * 2)) % 1) + 1) % 1) * segCount;
    const idx = Math.floor(pos) % segCount;
    const frac = pos - Math.floor(pos);
    return radii[idx] * (1 - frac) + radii[(idx + 1) % segCount] * frac;
  };
  const angleAt = (i: number) => (i / segCount) * Math.PI * 2;
  const pointAt = (ang: number, scale: number, y: number): [number, number, number] => {
    const rad = radiusAt(ang) * scale;
    return [center[0] + Math.cos(ang) * rad, y, center[1] + Math.sin(ang) * rad];
  };
  const ringAt = (scale: number) => Array.from({ length: segCount }, (_, i) => {
    const pt = pointAt(angleAt(i), scale, 0);
    return [pt[0], pt[2]];
  });

  // pontoon hull + deck-edge rail
  buf.kind = KIND.PLAIN;
  buf.prism(ringAt(0.94), LEVELS.keel, 0.15, COLORS.hullDark, COLORS.hullDark, { top: false, scaleTop: 1 / 0.94, centre: center });
  buf.prism(ringAt(1), 0.15, LEVELS.deck - 0.18, COLORS.hullBody, COLORS.hullBody, { top: false });
  buf.prism(ringAt(1), LEVELS.deck - 0.18, LEVELS.deck, COLORS.hullWhite, COLORS.deck, { topKind: KIND.FLAT });
  for (let i = 0; i < segCount; i++) {
    const a0 = angleAt(i), a1 = angleAt(i + 1);
    buf.beam(pointAt(a0, RADII_SCALE.deckRail, LEVELS.deck + 1.0), pointAt(a1, RADII_SCALE.deckRail, LEVELS.deck + 1.0), 0.06, 0.06, COLORS.frame);
    if (i % 2 === 0) buf.beam(pointAt(a0, RADII_SCALE.deckRail, LEVELS.deck), pointAt(a0, RADII_SCALE.deckRail, LEVELS.deck + 1.0), 0.05, 0.05, COLORS.frame);
  }

  // two glazed drums + slabs
  const addDrum = (scale: number, y0: number, y1: number) => {
    buf.prism(ringAt(scale), y0, y0 + 0.35, COLORS.white, COLORS.white, { top: false });
    buf.prism(ringAt(scale - 0.004), y0 + 0.35, y1, COLORS.glass, COLORS.glass, { top: false });
    for (let i = 0; i < segCount; i += 2) {
      const pt = pointAt(angleAt(i), scale + 0.004, 0);
      buf.box(pt[0], pt[2], y0 + 0.35, y1, 0.16, 0.16, angleAt(i), COLORS.mullion);
    }
    for (let i = 0; i < segCount; i++) {
      const a0 = angleAt(i), a1 = angleAt(i + 1);
      const transomY = y0 + 0.35 + (y1 - y0) * 0.72;
      buf.beam(pointAt(a0, scale + 0.004, transomY), pointAt(a1, scale + 0.004, transomY), 0.08, 0.08, COLORS.mullion);
      lightBufs.warm.quad(pointAt(a0, scale + 0.003, y0 + 0.5), pointAt(a1, scale + 0.003, y0 + 0.5), pointAt(a1, scale + 0.003, y1 - 0.25), pointAt(a0, scale + 0.003, y1 - 0.25), [1, 1, 1], [Math.cos(a0), 0, Math.sin(a0)]);
    }
  };
  addDrum(RADII_SCALE.groundDrum, LEVELS.deck, LEVELS.floor1);
  buf.prism(ringAt(RADII_SCALE.slabEdge), LEVELS.floor1, LEVELS.slab, COLORS.white, COLORS.roofTile, { topKind: KIND.FLAT });
  for (let i = 0; i < segCount; i++) {
    const a0 = angleAt(i), a1 = angleAt(i + 1);
    buf.quad(pointAt(a0, RADII_SCALE.groundDrum, LEVELS.floor1), pointAt(a1, RADII_SCALE.groundDrum, LEVELS.floor1), pointAt(a1, RADII_SCALE.slabEdge, LEVELS.floor1), pointAt(a0, RADII_SCALE.slabEdge, LEVELS.floor1), shade(COLORS.white, 0.8), [0, -1, 0]);
    buf.beam(pointAt(a0, RADII_SCALE.slabEdge - 0.01, LEVELS.slab + 1.0), pointAt(a1, RADII_SCALE.slabEdge - 0.01, LEVELS.slab + 1.0), 0.06, 0.06, COLORS.frame);
    if (i % 2 === 0) buf.beam(pointAt(a0, RADII_SCALE.slabEdge - 0.01, LEVELS.slab), pointAt(a0, RADII_SCALE.slabEdge - 0.01, LEVELS.slab + 1.0), 0.05, 0.05, COLORS.frame);
  }
  addDrum(RADII_SCALE.upperDrum, LEVELS.slab, LEVELS.floor2);
  buf.prism(ringAt(RADII_SCALE.roofEdge), LEVELS.floor2, LEVELS.roof, COLORS.white, COLORS.roofTile, { topKind: KIND.FLAT });
  for (let i = 0; i < segCount; i++) {
    const a0 = angleAt(i), a1 = angleAt(i + 1);
    buf.quad(pointAt(a0, RADII_SCALE.upperDrum, LEVELS.floor2), pointAt(a1, RADII_SCALE.upperDrum, LEVELS.floor2), pointAt(a1, RADII_SCALE.roofEdge, LEVELS.floor2), pointAt(a0, RADII_SCALE.roofEdge, LEVELS.floor2), shade(COLORS.white, 0.8), [0, -1, 0]);
    buf.beam(pointAt(a0, RADII_SCALE.roofEdge - 0.01, LEVELS.roof + 1.05), pointAt(a1, RADII_SCALE.roofEdge - 0.01, LEVELS.roof + 1.05), 0.07, 0.07, COLORS.frame);
    if (i % 2 === 0) buf.beam(pointAt(a0, RADII_SCALE.roofEdge - 0.01, LEVELS.roof), pointAt(a0, RADII_SCALE.roofEdge - 0.01, LEVELS.roof + 1.05), 0.05, 0.05, COLORS.frame);
    lightBufs.line.beam(pointAt(a0, RADII_SCALE.slabEdge + 0.006, LEVELS.slab - 0.12), pointAt(a1, RADII_SCALE.slabEdge + 0.006, LEVELS.slab - 0.12), 0.07, 0.07, [1, 1, 1]);
    lightBufs.line.beam(pointAt(a0, RADII_SCALE.roofEdge + 0.006, LEVELS.roof - 0.12), pointAt(a1, RADII_SCALE.roofEdge + 0.006, LEVELS.roof - 0.12), 0.07, 0.07, [1, 1, 1]);
  }

  // open lotus petal hoops
  const hoopSteps = quality.low ? 8 : 14;
  const addHoop = (phi: number, baseScale: number, y0: number, height: number, width: number, bulge: number, lean: number, ringIdx: number) => {
    const baseR = radiusAt(phi) * baseScale;
    const halfWidth = (v: number) => (width / 2) * (0.14 * (1 - v) + 0.86 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.72)), 0.7));
    const hoopPt = (side: number, v: number, out = 0) => {
      const rad = baseR + bulge * Math.sin(Math.PI * Math.min(1, v * 1.05)) + lean * v + out;
      const ang = phi + (side * halfWidth(v)) / rad;
      return [center[0] + Math.cos(ang) * rad, y0 + height * v, center[1] + Math.sin(ang) * rad];
    };
    const ledCol = [phi / (Math.PI * 2), ringIdx, 1];
    for (const side of [-1, 1]) {
      for (let i = 0; i < hoopSteps; i++) {
        const v0 = i / hoopSteps, v1 = (i + 1) / hoopSteps;
        buf.beam(hoopPt(side, v0), hoopPt(side, v1), 0.16, 0.16, COLORS.frame);
        lightBufs.petal.beam(hoopPt(side, v0, 0.12), hoopPt(side, v1, 0.12), 0.11, 0.11, ledCol);
      }
    }
    buf.beam(hoopPt(-1, 0), hoopPt(1, 0), 0.16, 0.16, COLORS.frame);
  };
  const circumference = (scale: number) => 2 * Math.PI * meanRadius * scale;
  for (let j = 0; j < PETAL_COUNT; j++) {
    addHoop((j / PETAL_COUNT) * Math.PI * 2, 0.92, LEVELS.deck, 5.9, (circumference(0.92) / PETAL_COUNT) * 1.02, 0.9, 0.4, 0);
    addHoop(((j + 0.5) / PETAL_COUNT) * Math.PI * 2, 0.81, LEVELS.slab, 4.1, (circumference(0.81) / PETAL_COUNT) * 1.02, 0.55, 0.25, 1);
  }

  buildRoofTerrace(buf, glow, center, meanRadius, pointAt);
  buildGangway(data, buf, glow, center, meanRadius, pointAt);
  buf.kind = KIND.PLAIN;
  return { name, x: center[0], z: center[1], r: meanRadius };
}

export function buildFloatingRestaurants(data: any, buf: Buf, group: THREE.Group) {
  const list: any[] = [];
  const glows: any[] = [];
  const nightMeshes: THREE.Mesh[] = [];
  let petalMat: THREE.ShaderMaterial | null = null;
  const prevKind = buf.kind, prevBase = buf.base;
  try {
    buf.base = 0;
    const lightBufs = { warm: new Buf(800), petal: new Buf(4000), line: new Buf(800) };
    const glow = { pos: [] as number[], col: [] as number[], lpos: [] as number[], lcol: [] as number[] };
    data.bld.forEach((rec: any) => {
      if (!isFloatingRestaurant(rec)) return;
      list.push(buildLotusRestaurant(data, buf, lightBufs, glow, unflat(rec[0]), rec[3]));
    });
    if (list.length) {
      const addNightMesh = (lightBuf: Buf, mat: THREE.Material) => {
        if (!lightBuf.n) return;
        const mesh = new THREE.Mesh(lightBuf.geometry(), mat);
        mesh.renderOrder = 19;
        mesh.visible = shared.uGlow.value >= GLOW_THRESHOLD;
        mesh.userData.landmark = true;
        group.add(mesh);
        nightMeshes.push(mesh);
      };
      addNightMesh(lightBufs.warm, washMaterial(0xffc98a, 0.32));
      addNightMesh(lightBufs.line, washMaterial(0xffd9a0, 1.0));
      petalMat = petalLightMaterial();
      addNightMesh(lightBufs.petal, petalMat);
      for (const [positions, colors, size] of [[glow.pos, glow.col, 1.3], [glow.lpos, glow.lcol, 2.4]] as [number[], number[], number][]) {
        if (!positions.length) continue;
        const pts = glowPoints(positions, colors, size);
        pts.userData.glow = true;
        group.add(pts);
        glows.push(pts);
      }
    }
  } catch (err) {
    console.warn('floating restaurants:', err);
  } finally {
    buf.kind = prevKind;
    buf.base = prevBase;
  }
  return {
    list,
    glows,
    update(time: number) {
      const isLit = shared.uGlow.value >= GLOW_THRESHOLD;
      for (let i = 0; i < nightMeshes.length; i++) nightMeshes[i].visible = isLit;
      if (isLit && petalMat) petalMat.uniforms.uTime.value = time;
    },
  };
}
