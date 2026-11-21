import * as THREE from 'three';
import { KIND, hex, shade, Buf } from '../geo/buf.js';
import { glowPoints, lightMaterial, shared } from '../geo/materials.js';
import { LAND_Y, PAL } from '../config.js';

// Cầu Trường Tiền. Position, axis and width come from the OSM bridge outline (way 1431129413); the six bow-string
// steel spans — "sáu vài mười hai nhịp" — are modelled by hand to the published figures (docs/places/truongtien.md):
// 402.6 m long, six spans of 67 m, a 6 m carriageway between the trusses and a 1.95 m walkway outside each, the bows
// 5.45 m high (vi.wikipedia "Cao 5m45"; a side-on 2024 panorama on Commons measures 5.5–5.7 m over the bottom chord).
// The OSM outline is 388 m, a little short of the real length, so the deck is centred on it and drawn at 402.6 m.
export const TT_LENGTH = 402.6;
export function buildTruongTien(data, S, group) {
  const tt = data.truongtien;
  const pt = (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  if (!tt || !pt(tt.a) || !pt(tt.b) || !tt.box || !pt(tt.box.c) || !(tt.box.w > 0) || !(tt.box.d > 0)) {
    // without its outline the bridge is left out, but the caller still gets the fields and methods it uses each frame
    console.warn('Trường Tiền not built: data.truongtien missing or incomplete');
    const lamps = glowPoints([], [], 8);
    group.add(lamps);
    return { centre: [0, 0], dir: [1, 0], across: [0, 1], length: 0, width: 0, span: 0, deckTop: 0, deckBottom: 0, lights: [], lamps, update() {} };
  }
  const a = [tt.a[0] / 10, tt.a[1] / 10], b = [tt.b[0] / 10, tt.b[1] / 10]; // north end, south end
  const L = TT_LENGTH, W = tt.box.d / 10;
  const c = [tt.box.c[0] / 10, tt.box.c[1] / 10];
  const dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d = [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl]; // along the bridge, north → south bank
  const n = [-d[1], d[0]]; // across the bridge
  const ang = Math.atan2(d[1], d[0]);
  const SPANS = 6, span = L / SPANS;
  // the deck stands on the river, not on the bank: its underside about 5.5 m above the water, room for a dragon boat
  // and its roof, and the approaches climb to it from the streets
  // The deck girder reads as a dark band about 1.2 m deep; the stone piers stop short of it, the girders sitting on
  // steel bearing trestles about 1.5 m tall (Commons panorama, 2024).
  const deckTop = 6.4, deckT = 1.2, trestle = 1.5;
  const trussX = W / 2 - 2.35; // truss planes (6 m carriageway + truss); 1.95 m walkways are cantilevered outside them
  const H = 5.45; // crown of each bow above the bottom chord
  const E = 1.3; // the bow ends on a short end post over the pier, not on the chord
  const N = 16; // panels per span (about 4.2 m, counted on the panorama)
  const steel = PAL.steel, steelD = PAL.steelDark;

  const at = (s, off, y) => [c[0] + d[0] * s + n[0] * off, y, c[1] + d[1] * s + n[1] * off];

  // deck + walkway edge
  S.box(c[0], c[1], deckTop - deckT, deckTop, L, W, ang, hex('#716e6b'), { top: PAL.deck, bottom: true });
  for (const side of [-1, 1]) {
    S.beam(at(-L / 2, side * (W / 2 - 0.1), deckTop + 1.05), at(L / 2, side * (W / 2 - 0.1), deckTop + 1.05), 0.16, 0.16, steel);
    S.beam(at(-L / 2, side * (W / 2 - 0.1), deckTop + 0.55), at(L / 2, side * (W / 2 - 0.1), deckTop + 0.55), 0.1, 0.1, steelD);
    for (let s = -L / 2; s <= L / 2 + 0.01; s += span / 10) S.beam(at(s, side * (W / 2 - 0.1), deckTop), at(s, side * (W / 2 - 0.1), deckTop + 1.05), 0.14, 0.14, steelD);
    // the two guard pipes on the carriageway side of each truss, added in the 1991–95 restoration
    for (const y of [0.45, 0.85]) S.beam(at(-L / 2, side * (trussX - 0.55), deckTop + y), at(L / 2, side * (trussX - 0.55), deckTop + y), 0.12, 0.12, steelD);
    // walkway surface slightly lighter than the carriageway
    const mid = at(0, side * (trussX + (W / 2 - trussX) / 2), 0);
    S.box(mid[0], mid[2], deckTop, deckTop + 0.12, L, W / 2 - trussX - 0.3, ang, hex('#b5aea4'));
  }

  // approaches: the deck sits above the riverside parks, with ramps down to the streets
  for (const end of [-1, 1]) {
    const s0 = (end * L) / 2, s1 = s0 + end * 34;
    const y1 = LAND_Y + 0.08;
    const p = [at(s0, -W / 2, deckTop), at(s0, W / 2, deckTop), at(s1, W / 2, y1), at(s1, -W / 2, y1)];
    S.quad(p[0], p[1], p[2], p[3], PAL.deck, [0, 1, 0]);
    for (const side of [-1, 1]) {
      const q0 = at(s0, (side * W) / 2, deckTop), q1 = at(s1, (side * W) / 2, y1), q2 = at(s0, (side * W) / 2, LAND_Y - 0.5), q3 = at(s1, (side * W) / 2, LAND_Y - 0.5);
      S.kind = KIND.MASONRY;
      S.quad(q0, q1, q3, q2, PAL.pier, [n[0] * side, 0, n[1] * side]);
      S.kind = KIND.PLAIN;
      S.beam(at(s0, side * (W / 2 - 0.1), deckTop + 1.0), at(s1, side * (W / 2 - 0.1), y1 + 1.0), 0.16, 0.16, steel);
    }
    // abutment
    const m = at(s0 + end * 1.2, 0, 0);
    S.kind = KIND.MASONRY;
    S.box(m[0], m[2], -3, deckTop - deckT, 3.4, W + 2.4, ang, PAL.pier);
    S.kind = KIND.PLAIN;
  }

  // stone piers with pointed cutwaters
  const lampPos = [], lampCol = [];
  for (let i = 1; i < SPANS; i++) {
    const s = -L / 2 + i * span;
    const pr = (hu, tip) => [[-hu, -W / 2 + 0.6], [0, -W / 2 - tip], [hu, -W / 2 + 0.6], [hu, W / 2 - 0.6], [0, W / 2 + tip], [-hu, W / 2 - 0.6]].map(([u, v]) => { const p = at(s + u, v, 0); return [p[0], p[2]]; });
    const yB = deckTop - deckT - trestle, yT = yB - 0.6;
    S.kind = KIND.MASONRY;
    // the battered body with its pointed cutwaters, then a projecting coping course, chamfered back on top
    S.prism(pr(2.1, 2.6), -3, yT - 0.45, PAL.pier, PAL.pier, { scaleTop: 0.92, top: false });
    S.prism(pr(2.26, 2.85), yT - 0.45, yT, shade(PAL.pier, 1.06), shade(PAL.pier, 1.12), { scaleTop: 0.96 });
    S.kind = KIND.PLAIN;
    // the cap under the deck: corners chamfered, its underside shown where it overhangs the coping
    const hu = 2.3, hv = W / 2 - 0.4, ch = 0.4;
    const cap = [[-hu + ch, -hv], [hu - ch, -hv], [hu, -hv + ch], [hu, hv - ch], [hu - ch, hv], [-hu + ch, hv], [-hu, hv - ch], [-hu, -hv + ch]].map(([u, v]) => { const p = at(s + u, v, 0); return [p[0], p[2]]; });
    const capCol = shade(PAL.pier, 1.1);
    S.prism(cap, yT, yB, capCol, capCol);
    const cm = at(s, 0, yT);
    for (let k = 0; k < cap.length; k++) { const a = cap[k], b = cap[(k + 1) % cap.length]; S.tri(cm, [a[0], yT, a[1]], [b[0], yT, b[1]], shade(capCol, 0.7), [0, -1, 0]); }
    // a moulded string course round the cap
    S.prism(cap.map(([x, z]) => [x + (x - cm[0]) * 0.03, z + (z - cm[2]) * 0.03]), yB - 0.22, yB - 0.08, shade(capCol, 0.92), capCol, { top: false });
    // the steel bearing trestles between the pier cap and the girders: a post and two raking struts under each truss
    for (const side of [-1, 1]) {
      for (const u of [-1.2, 1.2]) S.beam(at(s + u, side * trussX, yB), at(s + u, side * trussX, deckTop - deckT), 0.35, 0.35, steelD);
      S.beam(at(s - 1.6, side * trussX, yB), at(s, side * trussX, deckTop - deckT), 0.22, 0.22, steelD);
      S.beam(at(s + 1.6, side * trussX, yB), at(s, side * trussX, deckTop - deckT), 0.22, 0.22, steelD);
      S.beam(at(s, -trussX, yB + 0.2), at(s, trussX, yB + 0.2), 0.25, 0.25, steelD);
    }
    for (const side of [-1, 1]) {
      // (the balconies that bulged out over each pier from 1937 were taken off in the 1991–95 restoration)
      // lamp post at the rail, over the pier
      S.beam(at(s, side * (W / 2 - 0.25), deckTop), at(s, side * (W / 2 - 0.25), deckTop + 4.2), 0.18, 0.18, steelD);
      const lp = at(s, side * (W / 2 - 0.25), deckTop + 4.5);
      lampPos.push(...lp); lampCol.push(1.0, 0.8, 0.5);
    }
  }

  // the bows
  const spanLights = [], spanStrips = [];
  // one colour band runs the length of the bridge and slides along it (see bandColor below); the LED strips sample it
  // per pixel on the GPU, the bow lamps per lamp on the CPU, both from the same position along the bridge
  const band = bandMaterial(c, d, L);
  const lampS = []; // each bow lamp's position along the bridge, span by span
  for (let i = 0; i < SPANS; i++) {
    const s0 = -L / 2 + i * span;
    const lp = [], lc = [];
    // The bows are fuller than a parabola: they leave the piers steeply (about 45° over the first panel) and flatten
    // only near the crown, the rounded "comb" outline of the bridge seen from the river.
    const top = (k, side) => { const t = k / N, u = 2 * t - 1; return at(s0 + t * span, side * trussX, deckTop + 0.25 + E + (H - E) * Math.pow(Math.max(0, 1 - u * u), 0.62)); };
    const bot = (k, side) => at(s0 + (k / N) * span, side * trussX, deckTop + 0.25);
    for (const side of [-1, 1]) {
      S.beam(bot(0, side), bot(N, side), 0.55, 0.5, steelD);
      for (let k = 0; k < N; k++) {
        S.beam(top(k, side), top(k + 1, side), 0.78, 0.8, steel);
        S.beam(top(k, side), bot(k, side), k === 0 ? 0.6 : 0.4, 0.4, steel);
        // diagonals lean toward mid-span
        if (k >= 1 && k < N / 2) S.beam(top(k, side), bot(k + 1, side), 0.3, 0.3, steelD);
        if (k >= N / 2 && k < N - 1) S.beam(top(k + 1, side), bot(k, side), 0.3, 0.3, steelD);
        // light points traced along the bow
        for (const f of [0, 0.5]) {
          const p0 = top(k, side), p1 = top(k + 1, side);
          lp.push(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f + 0.5, p0[2] + (p1[2] - p0[2]) * f);
          lc.push(1, 1, 1);
        }
        if (k >= 1 && k % 2 === 0) { const p = top(k, side), q = bot(k, side); lp.push(p[0], (p[1] + q[1]) / 2, p[2]); lc.push(0.6, 0.6, 0.6); }
      }
    }
    // portal and wind bracing where there is headroom
    let prev = null;
    for (let k = 2; k <= N - 2; k++) {
      const l = top(k, -1), r = top(k, 1);
      if (l[1] < deckTop + 4.6) continue; // headroom: the struts start where the bow clears about 4.3 m
      S.beam(l, r, 0.34, 0.34, steel);
      if (prev) { S.beam(prev[0], r, 0.2, 0.2, steelD); S.beam(prev[1], l, 0.2, 0.2, steelD); }
      prev = [l, r];
    }
    const pts = glowPoints(lp, lc, 3.4);
    group.add(pts);
    spanLights.push(pts);
    const ls = [];
    for (let j = 0; j < lp.length; j += 3) ls.push((lp[j] - c[0]) * d[0] + (lp[j + 2] - c[1]) * d[1]);
    lampS.push(ls);
    // the LED wash: a strip riding each bow, lines down the hangers and along the bottom chord, on the outer faces
    const LB = new Buf(700), W1 = [1, 1, 1];
    const out = (p, side, o = 0.5, up = 0) => [p[0] + n[0] * side * o, p[1] + up, p[2] + n[1] * side * o];
    for (const side of [-1, 1]) {
      for (let k = 0; k < N; k++) {
        LB.beam(out(top(k, side), side, 0.46, 0.2), out(top(k + 1, side), side, 0.46, 0.2), 0.2, 0.5, W1);
        LB.beam(out(top(k, side), side, 0.3), out(bot(k, side), side, 0.3), 0.12, 0.12, W1);
      }
      LB.beam(out(bot(0, side), side, 0.36), out(bot(N, side), side, 0.36), 0.14, 0.28, W1);
    }
    const strip = new THREE.Mesh(LB.geometry(), band);
    strip.renderOrder = 19;
    strip.userData.landmark = true;
    group.add(strip);
    spanStrips.push(strip);
  }
  const lamps = glowPoints(lampPos, lampCol, 8);
  group.add(lamps);
  // a warm line under the handrail on both sides, and the piers lit from the water
  {
    const EB = new Buf(160), W1 = [1, 1, 1];
    for (const side of [-1, 1]) {
      EB.beam(at(-L / 2, side * (W / 2 + 0.08), deckTop - 0.12), at(L / 2, side * (W / 2 + 0.08), deckTop - 0.12), 0.1, 0.16, W1);
      for (let i = 1; i < SPANS; i++) { const sx = -L / 2 + i * span; EB.beam(at(sx, side * (W / 2 + 1.2), 0.5), at(sx, side * (W / 2 + 0.5), deckTop - deckT - trestle - 0.8), 0.5, 0.2, W1); }
    }
    const edge = new THREE.Mesh(EB.geometry(), lightMaterial(0xffd9a0, 0.75));
    edge.renderOrder = 19;
    edge.userData.landmark = true;
    group.add(edge);
  }

  const col = new THREE.Color();
  return {
    centre: c, dir: d, across: n, length: L, width: W, span, deckTop, deckBottom: deckTop - deckT, lights: spanLights, lamps,
    // After dark the bridge carries a continuous band of colour — Huế violet through blue, cyan, green, gold, red and
    // magenta, blending into each other along its length — and the colours change by the band sliding along the
    // bridge, so each bow flows into the next instead of the whole bridge switching at once. In rain the band settles
    // toward a warm white.
    update(time, glow, rain) {
      const warm = Math.min(1, rain * 0.85);
      band.uniforms.uWarmMix.value = warm;
      band.uniforms.uBoost.value = 1.5 + rain * 0.4;
      for (let i = 0; i < spanLights.length; i++) {
        const u = spanLights[i].material.uniforms, attr = spanLights[i].geometry.attributes.color, ls = lampS[i];
        u.uTint.value.setRGB(1, 1, 1);
        u.uBoost.value = 0.55 + rain * 0.25;
        for (let j = 0; j < ls.length; j++) {
          bandColor(ls[j], time, L, col).lerp(WARM, warm).multiplyScalar(0.6);
          attr.setXYZ(j, col.r, col.g, col.b);
        }
        attr.needsUpdate = true;
      }
    },
  };
}

// The band: PALETTE laid end to end, one full round every BAND_LEN of the bridge's length, each colour easing into the
// next, sliding along the bridge at BAND_SPEED m/s. bandColor (CPU) and the shader below compute the same thing.
const BAND_LEN = 0.85, BAND_SPEED = 9;
function bandColor(s, time, L, out) {
  const n = PALETTE.length, x = ((((s - time * BAND_SPEED) / (L * BAND_LEN)) % 1) + 1) % 1 * n;
  const a = Math.floor(x) % n, f = x - Math.floor(x), m = f * f * (3 - 2 * f);
  return out.copy(PALETTE[a]).lerp(PALETTE[(a + 1) % n], m);
}
function bandMaterial(c, d, L) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uGlow: shared.uGlow, uTime: shared.uTime, uPal: { value: PALETTE },
      uC: { value: new THREE.Vector2(c[0], c[1]) }, uD: { value: new THREE.Vector2(d[0], d[1]) },
      uLen: { value: L * BAND_LEN }, uSpeed: { value: BAND_SPEED },
      uBoost: { value: 1.5 }, uWarm: { value: WARM }, uWarmMix: { value: 0 },
    },
    vertexShader: `uniform vec2 uC, uD; varying float vS;
      void main() { vec4 w = modelMatrix * vec4( position, 1.0 ); vS = dot( w.xz - uC, uD );
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec3 uPal[ ${PALETTE.length} ]; uniform vec3 uWarm; uniform float uGlow, uBoost, uTime, uLen, uSpeed, uWarmMix;
      varying float vS;
      void main() {
        float x = fract( ( vS - uTime * uSpeed ) / uLen ) * ${PALETTE.length}.0;
        int a = int( floor( x ) ) % ${PALETTE.length};
        float f = fract( x ), m = f * f * ( 3.0 - 2.0 * f );
        vec3 c = mix( mix( uPal[ a ], uPal[ ( a + 1 ) % ${PALETTE.length} ], m ), uWarm, uWarmMix );
        gl_FragColor = vec4( c * uBoost * uGlow, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
}
const WARM = new THREE.Color(1.0, 0.82, 0.55);
// the colours of the band, in order along it: Huế violet, blue, cyan, green, gold, red, magenta, white
const PALETTE = ['#8a3cff', '#2f5bff', '#19c6ff', '#2fe07a', '#ffc21a', '#ff3b2f', '#ff3fb4', '#f4f0ff'].map((c) => new THREE.Color(c));
