import { KIND, hex, shade, unflat } from '../../geo/buf.js';
import { gateAxis } from '../../geo/gates.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';
import { pavilion } from '../citadel.js';

// Cửa Quảng Đức (廣德門), a south gate of the Kinh thành Huế, facing the Hương River between Cửa Ngăn and Cửa Nhà
// Đồ. Notes and sources: docs/places/gate-cua-quang-duc.md.
//
// Sourced: one of the ten main gates, all built in 1809; its watch tower (vọng lâu) added in 1829; the gate with its
// tower about 16 m high in all ("mỗi cửa 3 tầng, cao chừng 16m"), the tower rising more than 9 m above the wall top;
// people call it Cửa Sập, after it fell in a flood, and it has since been rebuilt; Hàm Nghi left the capital through
// it in 1885. The rampart here is 6.6 m high. Plan, centre and axis: the OSM gate building (way 173609941, 16.8 m
// along the wall × 12.6 m), the passage the street runs through (way 173609940) and Cầu Quảng Đức over the moat
// (way 39417336 / 1431132255, drawn as a road bridge by the shared bridge code, not here).
//
// Estimated from photographs: one round-arched passage about 4.2 m wide and 5.4 m to the crown, with heavy timber
// door leaves standing open inside the outer mouth; the gate block a little higher than the wall walk, faced with
// weathered lime-rendered brick, framed by pilasters, with a moulded cornice and a crenellated parapet round its flat
// top; a framed name plaque over the arch on both faces; on top the two-storey vọng lâu: a colonnaded lower storey
// under the first roof, a small closed upper storey under the second, both roofs of yellow glazed tiles.
export const id = 'gate:Cửa Quảng Đức';
const NAME = 'Cửa Quảng Đức';

const OPEN_W = 4.2, OPEN_H = 5.4; // the passage (CITADEL_PASSAGE in geo/gates.js; city.js and kinhthanh.js cut a 5.6 m slot)
const TOP = 1.6; // gate block above the wall walk (estimate, from the 16 m total and the tower's height)
const BODY = hex('#77716a'), DAMP = hex('#4c4943'), FRAME = hex('#b9b09c'), CORNICE = hex('#8a847a'), DARK = hex('#1f1a18');
const DOOR = hex('#4a2c1e'), PLAQUE = hex('#d8ccb0'), PLAQUE_IN = hex('#3b3430');

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
  const box = (u, v, y0, y1, su, sv, col, opts) => { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, pa + Math.PI / 2, col, opts); };

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

  // ---- the gate block, the passage driven through it ----
  S.kind = KIND.MASONRY;
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    const n = N(0, sg);
    const q = (u0, u1, ya, yb, col = BODY) => S.quad(V(u0, v, ya), V(u1, v, ya), V(u1, v, yb), V(u0, v, yb), col, n);
    const [ua, ub] = sg > 0 ? [-1, 1] : [1, -1]; // keep the quads facing out
    q(ua * W / 2, ua * r, y0, yT);
    q(ub * r, ub * W / 2, y0, yT);
    q(ua * r, ub * r, crown, yT);
    for (let k = 0; k < K; k++) { // spandrels between the arch and the crown
      const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
      if (sg > 0) S.quad(V(sa, v, ya), V(sb, v, yb), V(sb, v, crown), V(sa, v, crown), BODY, n);
      else S.quad(V(sb, v, yb), V(sa, v, ya), V(sa, v, crown), V(sb, v, crown), BODY, n);
    }
  }
  for (const sg of [-1, 1]) { // the two ends, where the wall walk meets the block
    const u = (sg * W) / 2, [va, vb] = sg > 0 ? [vOut, vIn] : [vIn, vOut];
    S.quad(V(u, va, y0), V(u, vb, y0), V(u, vb, yT), V(u, va, yT), BODY, N(sg, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(V(-W / 2, vIn, yT), V(-W / 2, vOut, yT), V(W / 2, vOut, yT), V(W / 2, vIn, yT), shade(PAL.stone, 0.85), [0, 1, 0]);
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

  // ---- the facades: damp foot, pilasters, the arch's surround, the name plaque, the cornice ----
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    const t = v + sg * 0.1;
    box(0, t + sg * 0.02, y0, LAND_Y + 0.7, W + 0.3, 0.25, DAMP); // the dark damp plinth band
    for (const s of [-1, 1]) {
      box(s * (W / 2 - 0.45), t, LAND_Y + 0.7, yT - 0.55, 0.9, 0.2, shade(BODY, 1.06)); // corner pilasters
      box(s * 4.3, t, LAND_Y + 0.7, yT - 0.55, 0.7, 0.16, shade(BODY, 1.04)); // the pilasters framing the arch bay
      box(s * (r + 0.2), t + sg * 0.02, fl, spring, 0.4, 0.14, FRAME); // the arch's jambs
    }
    for (let k = 0; k < K; k++) { // the arch's moulded band
      const [sa, ya] = arc(k, r + 0.2), [sb, yb] = arc(k + 1, r + 0.2);
      S.beam(V(sa, t + sg * 0.02, ya), V(sb, t + sg * 0.02, yb), 0.14, 0.4, FRAME);
    }
    box(0, t + sg * 0.05, crown + 0.02, crown + 0.5, 0.42, 0.14, FRAME); // keystone
    // the name plaque: a light framed tablet, the characters on a dark ground
    const pb = crown + 0.75, ph = 1.3;
    box(0, t + sg * 0.06, pb, pb + ph, 3.6, 0.16, PLAQUE);
    box(0, t + sg * 0.12, pb + 0.18, pb + ph - 0.18, 3.1, 0.06, PLAQUE_IN);
    box(0, t, crown + 0.6, crown + 0.68, 8.6, 0.16, shade(BODY, 1.06)); // the band over the arch bay
    // the cornice under the parapet
    box(0, t + sg * 0.08, yT - 0.55, yT - 0.15, W + 0.5, 0.36, CORNICE);
    box(0, t + sg * 0.14, yT - 0.15, yT, W + 0.7, 0.48, shade(CORNICE, 1.08), { top: shade(PAL.stone, 0.85) });
  }

  // ---- the crenellated parapet round the flat top ----
  S.kind = KIND.MASONRY;
  const D = vOut - vIn, vm = (vIn + vOut) / 2;
  for (const [len, alongU, off] of [[W, true, vIn + 0.25], [W, true, vOut - 0.25], [D, false, -W / 2 + 0.25], [D, false, W / 2 - 0.25]]) {
    const n = Math.max(3, Math.round(len / 1.4) | 1);
    for (let k = 0; k < n; k++) {
      const s = -len / 2 + (len * (k + 0.5)) / n, merlon = k % 2 === 0;
      const h = merlon ? 1.15 : 0.65;
      if (alongU) box(s, off, yT, yT + h, len / n, 0.5, shade(BODY, 1.08), { top: PAL.stone });
      else box(off, vm + s, yT, yT + h, 0.5, len / n, shade(BODY, 1.08), { top: PAL.stone });
    }
  }
  S.kind = KIND.PLAIN;

  // ---- the vọng lâu: two storeys under yellow glazed tiles ----
  const ext = [];
  pavilion(S, cx + px * vm, cz + pz * vm, Math.min(pwid * 0.72, 12), Math.min(D * 0.55, 7.6), pa + Math.PI / 2, yT, { tiers: 2, wallH: 3.0, roof: PAL.imperialRoof, ridge: hex('#f1d77a'), over: 1.3, rh: 2.6, colonnade: true, eaves: ext });

  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = KIND.PLAIN;

  // the plaque's characters, read right to left: 廣 德 門 (a small canvas, in the browser only)
  if (group && THREE && typeof document !== 'undefined') {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 80;
    const c = cv.getContext('2d');
    c.fillStyle = '#3b3430'; c.fillRect(0, 0, 256, 80);
    c.fillStyle = '#e2c675'; c.font = 'bold 58px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['門', '德', '廣'].forEach((ch, i) => c.fillText(ch, 48 + i * 80, 42));
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const geo = new THREE.PlaneGeometry(3.0, 0.88);
    for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
      const p = P(0, v + sg * 0.27), m = new THREE.Mesh(geo, mat);
      m.position.set(p[0], crown + 0.75 + 0.65, p[1]);
      m.rotation.y = Math.atan2(px * sg, pz * sg);
      m.userData.landmark = id;
      group.add(m);
    }
  }
}
