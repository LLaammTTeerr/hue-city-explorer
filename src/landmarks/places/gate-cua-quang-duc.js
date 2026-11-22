import { KIND, hex, shade, unflat } from '../../geo/buf.js';
import { gateAxis } from '../../geo/gates.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';

// Cửa Quảng Đức (廣德門), a south gate of the Kinh thành Huế, facing the Hương River between Cửa Ngăn and Cửa Nhà
// Đồ. Notes and sources: docs/places/gate-cua-quang-duc.md.
//
// Sourced: one of the ten main gates, all built in 1809; its watch tower (vọng lâu) added in 1829; the gate with its
// tower about 16 m high in all ("mỗi cửa 3 tầng, cao chừng 16m"), the tower rising more than 9 m above the wall top;
// people call it Cửa Sập, after it fell in a flood, and it has since been rebuilt; Hàm Nghi left the capital through
// it in 1885. The rampart here is 6.6 m high. Plan, centre and axis: the OSM gate building (way 173609941, 16.8 m
// along the wall × 12.6 m), the passage the street runs through (way 173609940) and Cầu Quảng Đức over the moat
// (way 39417336 / 1431132255, drawn as a road bridge by the shared bridge code, not here). The OSM plan sits within
// about 1 m of the satellite image, its axis within a degree or two (2026 check), so it is used as it is.
//
// Proportions from street-level and satellite imagery (2026), scaled to the block's 16.8 m width: one round-arched
// passage about 3.8 m wide and 5.4 m to the crown; the gate block's flat roof 8.4 m up, a plain solid parapet round
// it with square posts at the corners; the outer face weathered grey render, the arch set in a raised rectangular
// frame under a small name plaque; the inner face darker, its arch bay between two projecting pilasters. The vọng
// lâu is masonry, not timber: a rendered storey about 8.4 × 6.8 m, with a large arched opening between two small
// ones on the outer face and an arched niche between two round medallions on the inner, under a skirt of brown
// tiles; on it a small storey about 4.6 × 4 m pierced front to back by an arch, under a small brown-tiled hip roof
// with ridge ornaments and a short pole. Heavy timber door leaves stand open inside the outer mouth (not visible in
// the imagery; kept from the earlier estimate).
export const id = 'gate:Cửa Quảng Đức';
const NAME = 'Cửa Quảng Đức';

const OPEN_W = 3.8, OPEN_H = 5.4; // the passage (city.js and kinhthanh.js cut a 5.6 m slot)
const TOP = 1.8; // the block's flat roof above the wall walk (8.4 m above the street)
const PARA = 1.0; // the solid parapet round that roof
const BODY = hex('#77716a'), INNER = hex('#5f5953'), DAMP = hex('#4c4943'), FRAME = hex('#8e877c'), CORNICE = hex('#8a847a'), DARK = hex('#1f1a18');
const DOOR = hex('#4a2c1e'), PLAQUE = hex('#d8ccb0'), PLAQUE_IN = hex('#3b3430');
const TOWER = hex('#84806f'), MEDAL = hex('#a39c8f'), TILE = hex('#93573b'), TILE_EDGE = hex('#6e4130');

export function build({ data, S, group, place, THREE }) {
  const norm = (s) => String(s || '').normalize('NFC');
  const g = (data.gates || []).find((q) => norm(q.n) === norm(NAME));
  if (!g) throw new Error('gate not in data.gates');
  const kt = (data.places || []).find((q) => q.id === 'kinhthanh');
  const centre = kt ? [kt.x / 10, kt.z / 10] : [g.c[0] / 10, g.c[1] / 10 - 100];
  const { cx, cz, pa, px, pz, pwid } = gateAxis(g, centre); // +v runs out of the city, towards the river
  const ux = -pz, uz = px; // along the wall
  const P = (u, v) => [cx + u * ux + v * px, cz + u * uz + v * pz];
  const V = (u, v, y) => { const p = P(u, v); return [p[0], y, p[1]]; };
  const N = (nu, nv, ny = 0) => [nu * ux + nv * px, ny, nu * uz + nv * pz];
  const ANG = pa + Math.PI / 2;
  const box = (u, v, y0, y1, su, sv, col, opts) => { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ANG, col, opts); };

  // where the rampart's faces cross the passage axis: the block reaches a hand's breadth past both
  let vIn = -pwid * 0.375, vOut = pwid * 0.375;
  {
    const hits = [];
    for (const poly of data.wall || []) for (const r of poly.map(unflat)) for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], ex = b[0] - a[0], ez = b[1] - a[1], den = px * ez - pz * ex;
      if (Math.abs(den) < 1e-9) continue;
      const qx = a[0] - cx, qz = a[1] - cz, t = (qx * ez - qz * ex) / den, s = (qx * pz - qz * px) / den;
      if (s >= 0 && s <= 1 && Math.abs(t) < 20) hits.push(t);
    }
    const ins = hits.filter((t) => t < 0), outs = hits.filter((t) => t > 0);
    if (ins.length) vIn = Math.min(...ins) - 0.4;
    if (outs.length) vOut = Math.max(...outs) + 0.4;
  }
  const W = pwid + 0.4; // along the wall
  const y0 = LAND_Y - 0.5, yT = LAND_Y + WALL_H + TOP, fl = LAND_Y + 0.02;
  const r = OPEN_W / 2, crown = LAND_Y + OPEN_H, spring = crown - r, K = 10;
  const arc = (k, rr = r) => { const th = Math.PI - (Math.PI * k) / K; return [rr * Math.cos(th), spring + rr * Math.sin(th)]; };
  const n0 = S.n;

  // a flat arch-headed panel (rect + half disc) on a face: centre u (along the face), base y, width w, spring height
  // hs above the base; face at v, its outward sign sg; `alongV` for the end faces, where the panel runs along v
  const archPanel = (c, off, sg, yb, w, hs, col, alongV = false) => {
    const F = alongV ? (a, y) => V(off, c + a, y) : (a, y) => V(c + a, off, y);
    const n = alongV ? N(sg, 0) : N(0, sg), rr = w / 2, ys = yb + hs, flip = alongV ? sg < 0 : sg > 0;
    const quad = (a, b, cc, d) => (flip ? S.quad(a, b, cc, d, col, n) : S.quad(b, a, d, cc, col, n));
    quad(F(-rr, yb), F(rr, yb), F(rr, ys), F(-rr, ys));
    for (let k = 0; k < 8; k++) {
      const t0 = Math.PI - (Math.PI * k) / 8, t1 = Math.PI - (Math.PI * (k + 1)) / 8;
      const a = F(rr * Math.cos(t0), ys + rr * Math.sin(t0)), b = F(rr * Math.cos(t1), ys + rr * Math.sin(t1)), m = F(0, ys);
      if (flip) S.tri(m, a, b, col, n); else S.tri(m, b, a, col, n);
    }
  };
  const disc = (c, off, sg, yc, rad, col, alongV = false) => {
    const F = alongV ? (a, y) => V(off, c + a, y) : (a, y) => V(c + a, off, y);
    const n = alongV ? N(sg, 0) : N(0, sg), flip = alongV ? sg < 0 : sg > 0;
    for (let k = 0; k < 12; k++) {
      const t0 = (Math.PI * 2 * k) / 12, t1 = (Math.PI * 2 * (k + 1)) / 12;
      const a = F(rad * Math.cos(t0), yc + rad * Math.sin(t0)), b = F(rad * Math.cos(t1), yc + rad * Math.sin(t1)), m = F(0, yc);
      if (flip) S.tri(m, a, b, col, n); else S.tri(m, b, a, col, n);
    }
  };

  // ---- the gate block, the passage driven through it ----
  S.kind = KIND.MASONRY;
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    const n = N(0, sg), col = sg > 0 ? BODY : INNER;
    const q = (u0, u1, ya, yb) => S.quad(V(u0, v, ya), V(u1, v, ya), V(u1, v, yb), V(u0, v, yb), col, n);
    const [ua, ub] = sg > 0 ? [-1, 1] : [1, -1]; // keep the quads facing out
    q(ua * W / 2, ua * r, y0, yT);
    q(ub * r, ub * W / 2, y0, yT);
    q(ua * r, ub * r, crown, yT);
    for (let k = 0; k < K; k++) { // spandrels between the arch and the crown
      const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
      if (sg > 0) S.quad(V(sa, v, ya), V(sb, v, yb), V(sb, v, crown), V(sa, v, crown), col, n);
      else S.quad(V(sb, v, yb), V(sa, v, ya), V(sa, v, crown), V(sb, v, crown), col, n);
    }
  }
  for (const sg of [-1, 1]) { // the two ends, where the wall walk meets the block
    const u = (sg * W) / 2, [va, vb] = sg > 0 ? [vOut, vIn] : [vIn, vOut];
    S.quad(V(u, va, y0), V(u, vb, y0), V(u, vb, yT), V(u, va, yT), BODY, N(sg, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(V(-W / 2, vIn, yT), V(-W / 2, vOut, yT), V(W / 2, vOut, yT), V(W / 2, vIn, yT), shade(PAL.stone, 0.8), [0, 1, 0]);
  S.quad(V(-r, vIn - 0.3, fl), V(-r, vOut + 0.3, fl), V(r, vOut + 0.3, fl), V(r, vIn - 0.3, fl), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  // the barrel vault and the dark lining of the passage
  for (let k = 0; k < K; k++) {
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    S.quad(V(sa, vIn + 0.01, ya), V(sa, vOut - 0.01, ya), V(sb, vOut - 0.01, yb), V(sb, vIn + 0.01, yb), shade(BODY, 0.4), N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
  }
  for (const sg of [-1, 1]) {
    const u = sg * (r - 0.01), [va, vb] = sg > 0 ? [vIn, vOut] : [vOut, vIn];
    S.quad(V(u, va, fl), V(u, vb, fl), V(u, vb, spring), V(u, va, spring), DARK, N(-sg, 0));
  }
  // the timber door leaves, swung open against the passage sides just inside the outer mouth
  for (const sg of [-1, 1]) box(sg * (r - 0.1), vOut - 2.0, fl, spring - 0.05, 0.14, r * 0.95, DOOR);

  // ---- the faces: damp foot, corner pilasters, the arch's surround, the cornice ----
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    const t = v + sg * 0.1, col = sg > 0 ? BODY : INNER;
    box(0, t + sg * 0.02, y0, LAND_Y + 0.7, W + 0.3, 0.25, DAMP); // the dark damp plinth band
    for (const s of [-1, 1]) box(s * (W / 2 - 0.35), t, LAND_Y + 0.7, yT - 1.0, 0.7, 0.2, shade(col, 1.06)); // corner pilasters
    for (let k = 0; k < K; k++) { // a plain band round the arch
      const [sa, ya] = arc(k, r + 0.15), [sb, yb] = arc(k + 1, r + 0.15);
      S.beam(V(sa, t + sg * 0.02, ya), V(sb, t + sg * 0.02, yb), 0.1, 0.3, shade(col, 1.1));
    }
    for (const s of [-1, 1]) box(s * (r + 0.15), t + sg * 0.02, fl, spring, 0.3, 0.1, shade(col, 1.1));
    if (sg > 0) {
      // outside: the arch set in a raised rectangular frame, a small name plaque above it
      const fw = 5.6, ft = crown + 1.0;
      for (const s of [-1, 1]) box(s * (fw / 2 - 0.2), t + 0.04, LAND_Y + 0.7, ft, 0.4, 0.18, FRAME);
      box(0, t + 0.04, ft - 0.4, ft, fw, 0.18, FRAME);
      const pb = ft + 0.35, ph = 1.1;
      box(0, t + 0.06, pb, pb + ph, 2.4, 0.16, PLAQUE);
      box(0, t + 0.12, pb + 0.15, pb + ph - 0.15, 2.0, 0.06, PLAQUE_IN);
    } else {
      // inside: two projecting pilasters with caps either side of the arch bay
      for (const s of [-1, 1]) {
        box(s * 4.6, t - 0.25, LAND_Y + 0.7, yT - 1.6, 1.1, 0.7, shade(INNER, 1.05));
        box(s * 4.6, t - 0.3, yT - 1.6, yT - 1.25, 1.4, 0.85, shade(CORNICE, 0.95));
      }
    }
    // the cornice under the parapet, with a frieze band of light panels below it
    box(0, t + sg * 0.04, yT - 1.0, yT - 0.85, W + 0.3, 0.26, CORNICE);
    for (let k = -3; k <= 3; k++) box(k * 2.2, t + sg * 0.05, yT - 0.75, yT - 0.5, 1.2, 0.08, shade(FRAME, 1.15));
    box(0, t + sg * 0.1, yT - 0.4, yT, W + 0.6, 0.42, shade(CORNICE, 1.06), { top: shade(PAL.stone, 0.8) });
  }

  // ---- the plain solid parapet round the flat roof, square posts at its corners ----
  S.kind = KIND.MASONRY;
  const D = vOut - vIn, vm = (vIn + vOut) / 2;
  box(0, vIn + 0.22, yT, yT + PARA, W, 0.44, shade(BODY, 1.05), { top: shade(PAL.stone, 0.9) });
  box(0, vOut - 0.22, yT, yT + PARA, W, 0.44, shade(BODY, 1.05), { top: shade(PAL.stone, 0.9) });
  for (const s of [-1, 1]) box(s * (W / 2 - 0.22), vm, yT, yT + PARA, 0.44, D - 0.88, shade(BODY, 1.05), { top: shade(PAL.stone, 0.9) });
  for (const s of [-1, 1]) for (const v of [vIn + 0.3, vOut - 0.3]) {
    box(s * (W / 2 - 0.3), v, yT + PARA, yT + PARA + 0.35, 0.6, 0.6, shade(BODY, 1.08));
    box(s * (W / 2 - 0.3), v, yT + PARA + 0.35, yT + PARA + 0.5, 0.75, 0.75, shade(CORNICE, 1.05));
  }

  // ---- the vọng lâu: two masonry storeys ----
  const W2 = 8.4, D2 = Math.min(6.8, D - 3), h2 = 4.0, y2 = yT + h2; // the lower storey
  box(0, vm, yT, y2, W2, D2, TOWER, { top: shade(TOWER, 0.9) });
  box(0, vm, y2 - 0.3, y2, W2 + 0.3, D2 + 0.3, CORNICE); // a band under the skirt
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    const f = vm + sg * (D2 / 2 + 0.02), yb = yT + PARA + 0.3;
    if (sg > 0) { // outside: a large arched opening between two small ones
      archPanel(0, f, sg, yb - 0.2, 1.7, 1.5, DARK);
      for (const s of [-1, 1]) disc(s * 2.6, f, sg, yb + 1.3, 0.95, MEDAL);
    } else { // inside: an arched niche between two round medallions
      archPanel(0, f, sg, yb + 0.2, 1.4, 1.2, DARK);
      for (const s of [-1, 1]) { disc(s * 2.6, f, sg, yb + 1.3, 0.95, MEDAL); disc(s * 2.6, f - 0.01, sg, yb + 1.3, 0.6, shade(MEDAL, 0.85)); }
    }
  }
  for (const s of [-1, 1]) disc(vm, s * (W2 / 2 + 0.02), s, yT + PARA + 1.6, 0.75, MEDAL, true); // a medallion on each end
  // the skirt of brown tiles round its top
  S.kind = KIND.TILE;
  const sw = W2 + 1.2, sd = D2 + 1.2, sh = 0.8;
  box(0, vm, y2, y2 + sh, sw, sd, TILE, { taper: 0.8, top: shade(TILE, 0.9) });
  box(0, vm, y2 - 0.12, y2, sw + 0.1, sd + 0.1, TILE_EDGE);
  // the upper storey, pierced front to back by an arch
  S.kind = KIND.MASONRY;
  const W3 = 4.6, D3 = 4.0, y3 = y2 + sh, h3 = 2.4, y4 = y3 + h3, o = 1.4, ys3 = y3 + 1.1, oc = ys3 + o / 2;
  for (const s of [-1, 1]) box(s * (W3 + o) / 4, vm, y3, y4, (W3 - o) / 2, D3, TOWER, { top: shade(TOWER, 0.9) });
  box(0, vm, oc, y4, o, D3, TOWER, { top: shade(TOWER, 0.9), bottom: true });
  for (const sg of [-1, 1]) { // spandrels over the opening and its dark soffit
    const v = vm + sg * D3 / 2, n = N(0, sg);
    for (let k = 0; k < 8; k++) {
      const t0 = Math.PI - (Math.PI * k) / 8, t1 = Math.PI - (Math.PI * (k + 1)) / 8, rr = o / 2;
      const sa = rr * Math.cos(t0), sb = rr * Math.cos(t1), ya = ys3 + rr * Math.sin(t0), yb = ys3 + rr * Math.sin(t1);
      if (sg > 0) S.quad(V(sa, v, ya), V(sb, v, yb), V(sb, v, oc), V(sa, v, oc), TOWER, n);
      else S.quad(V(sb, v, yb), V(sa, v, ya), V(sa, v, oc), V(sb, v, oc), TOWER, n);
    }
  }
  box(0, vm, y4 - 0.25, y4, W3 + 0.3, D3 + 0.3, CORNICE);
  // its small hip roof of the same brown tiles, ridge ornaments and a short pole
  S.hip(...P(0, vm), W3, D3, ANG, y4, 0.9, TILE, { flare: 0.12, over: 0.3, hips: true, fascia: 0.18, fasciaCol: TILE_EDGE, ridgeCol: TILE_EDGE, segs: 3 });
  S.kind = KIND.MASONRY;
  const ridgeY = y4 + 0.9, rl = Math.max(0.2, (W3 - D3) / 2 + 0.3);
  for (const s of [-1, 1]) box(s * rl, vm, ridgeY - 0.1, ridgeY + 0.45, 0.25, 0.3, TILE_EDGE);
  box(0, vm, ridgeY - 0.1, ridgeY + 0.35, 0.5, 0.35, TILE_EDGE);
  { const q = P(0, vm); S.cyl(q[0], q[1], ridgeY + 0.35, ridgeY + 0.8, 0.04, 0.03, 4, hex('#cfcfcf'), { cap: false }); }

  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = KIND.PLAIN;

  // the plaque's characters, read right to left: 廣 德 門 (a small canvas, in the browser only; outer face only, the
  // inner face shows none)
  if (group && THREE && typeof document !== 'undefined') {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 96;
    const c = cv.getContext('2d');
    c.fillStyle = '#3b3430'; c.fillRect(0, 0, 256, 96);
    c.fillStyle = '#e2c675'; c.font = 'bold 64px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['門', '德', '廣'].forEach((ch, i) => c.fillText(ch, 48 + i * 80, 50));
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const geo = new THREE.PlaneGeometry(1.95, 0.74);
    const p = P(0, vOut + 0.1 + 0.17), m = new THREE.Mesh(geo, mat);
    m.position.set(p[0], crown + 1.0 + 0.35 + 0.55, p[1]);
    m.rotation.y = Math.atan2(px, pz);
    m.userData.landmark = id;
    group.add(m);
  }
}
