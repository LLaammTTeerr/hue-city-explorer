import { KIND, hex, shade, unflat } from '../../geo/buf.js';
import { gateAxis } from '../../geo/gates.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';
import { pavilion } from '../citadel.js';

// Cửa Đông Ba, properly Chánh Đông Môn (正東門), the main east gate of the Kinh thành Huế, at the end of Mai Thúc Loan,
// facing chợ Đông Ba across the moat and sông Đông Ba. Notes and sources: docs/places/gate-cua-dong-ba.md.
//
// Sourced: the arched gate built in 1809 (Gia Long), its watch tower (vọng lâu) added in 1824 (Minh Mạng), the first
// with Đông Bắc to get one; the name after the Đông Hoa fort beside it; fighting here on 5 July 1885; the tower brought
// down by shelling in 1968 and the gate fully restored in 2009. All ten land gates share one form: a nguyệt môn (a
// round-arched passage) through the wall, about 3.82 m wide and 5.19 m high, closed by two iron-banded lim leaves; a
// stone name tablet about 2.31 × 1.10 m over the arch; a two-storey vọng lâu under tube tiles rising more than 9 m
// above the wall, the whole gate about 16-17 m high. Plan, centre and axis: the OSM gate building (data.gates,
// 16.8 m along the wall × 13.0 m), the passage on the axis gateAxis gives (the slot city.js / kinhthanh.js cut).
// The road bridge over the moat in front is the mapped bridge, drawn by the shared bridge code, not here.
//
// Estimated from photographs: the gate block a little above the wall walk, lime-rendered brick weathered dark grey,
// pilasters, a moulded cornice and a crenellated parapet round the flat top; the tower a colonnaded lower storey with
// red lacquered posts round a closed core, a small closed upper storey, both roofs of yellow glazed tiles.
export const id = 'gate:Cửa Đông Ba';
const NAME = 'Cửa Đông Ba';

const OPEN_W = 3.82, OPEN_H = 5.19; // the nguyệt môn (huetourism.gov.vn, after Phan Thuận An)
const PLAQUE_W = 2.31, PLAQUE_H = 1.10; // the stone name tablet (same source)
const TOP = 1.6; // gate block above the wall walk (estimate, from the ~16.5 m total and the tower's height)
const BODY = hex('#6f6a63'), DAMP = hex('#46433e'), FRAME = hex('#b3aa96'), CORNICE = hex('#857f75'), DARK = hex('#1f1a18');
const DOOR = hex('#4a2c1e'), IRON = hex('#2a2624'), PLAQUE = hex('#d6cab0'), PLAQUE_IN = hex('#3b3430');

export function build({ data, S, group, place, THREE }) {
  const norm = (s) => String(s || '').normalize('NFC');
  const g = (data.gates || []).find((q) => norm(q.n) === norm(NAME));
  if (!g) throw new Error('gate not in data.gates');
  const kt = (data.places || []).find((q) => q.id === 'kinhthanh');
  const centre = kt ? [kt.x / 10, kt.z / 10] : [g.c[0] / 10 - 900, g.c[1] / 10 + 260];
  const { cx, cz, pa, px, pz, pwid } = gateAxis(g, centre); // +v runs out of the city, towards the moat
  const ux = -pz, uz = px; // along the wall
  const P = (u, v) => [cx + u * ux + v * px, cz + u * uz + v * pz];
  const V = (u, v, y) => { const p = P(u, v); return [p[0], y, p[1]]; };
  const N = (nu, nv, ny = 0) => [nu * ux + nv * px, ny, nu * uz + nv * pz];
  const box = (u, v, y0, y1, su, sv, col, opts) => { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, pa + Math.PI / 2, col, opts); };

  // where the rampart's faces cross the passage axis: the block reaches a hand's breadth past both
  let vIn = -6.5, vOut = 6.5;
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
    const q = (u0, u1, ya, yb) => S.quad(V(u0, v, ya), V(u1, v, ya), V(u1, v, yb), V(u0, v, yb), BODY, n);
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
  // the two lim leaves, iron-banded, swung open against the passage sides just inside the outer mouth
  for (const sg of [-1, 1]) {
    box(sg * (r - 0.1), vOut - 2.0, fl, spring - 0.05, 0.14, r * 0.95, DOOR);
    for (const yb of [0.9, 2.1, 3.2]) box(sg * (r - 0.18), vOut - 2.0, fl + yb, fl + yb + 0.1, 0.03, r * 0.95, IRON);
  }

  // ---- the facades: damp foot, pilasters, the arch's surround, the name tablet, the cornice ----
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    const t = v + sg * 0.1;
    box(0, t + sg * 0.02, y0, LAND_Y + 0.8, W + 0.3, 0.25, DAMP);
    for (const s of [-1, 1]) {
      box(s * (W / 2 - 0.45), t, LAND_Y + 0.8, yT - 0.55, 0.9, 0.2, shade(BODY, 1.06)); // corner pilasters
      box(s * 4.0, t, LAND_Y + 0.8, yT - 0.55, 0.7, 0.16, shade(BODY, 1.04)); // the pilasters framing the arch bay
      box(s * (r + 0.2), t + sg * 0.02, fl, spring, 0.4, 0.14, FRAME); // the arch's jambs
    }
    for (let k = 0; k < K; k++) { // the arch's moulded band
      const [sa, ya] = arc(k, r + 0.2), [sb, yb] = arc(k + 1, r + 0.2);
      S.beam(V(sa, t + sg * 0.02, ya), V(sb, t + sg * 0.02, yb), 0.14, 0.4, FRAME);
    }
    box(0, t + sg * 0.05, crown + 0.02, crown + 0.45, 0.4, 0.14, FRAME); // keystone
    // the stone tablet: a raised frame, the characters on a dark ground
    const pb = crown + 0.7;
    box(0, t + sg * 0.06, pb - 0.12, pb + PLAQUE_H + 0.12, PLAQUE_W + 0.5, 0.16, PLAQUE);
    box(0, t + sg * 0.12, pb, pb + PLAQUE_H, PLAQUE_W, 0.06, PLAQUE_IN);
    box(0, t, crown + 0.55, crown + 0.63, 7.8, 0.16, shade(BODY, 1.06)); // the band over the arch bay
    box(0, t + sg * 0.08, yT - 0.55, yT - 0.15, W + 0.5, 0.36, CORNICE);
    box(0, t + sg * 0.14, yT - 0.15, yT, W + 0.7, 0.48, shade(CORNICE, 1.08), { top: shade(PAL.stone, 0.85) });
  }

  // ---- the crenellated parapet round the flat top ----
  S.kind = KIND.MASONRY;
  const D = vOut - vIn, vm = (vIn + vOut) / 2;
  for (const [len, alongU, off] of [[W, true, vIn + 0.25], [W, true, vOut - 0.25], [D, false, -W / 2 + 0.25], [D, false, W / 2 - 0.25]]) {
    const n = Math.max(3, Math.round(len / 1.4) | 1);
    for (let k = 0; k < n; k++) {
      const s = -len / 2 + (len * (k + 0.5)) / n, h = k % 2 === 0 ? 1.15 : 0.65;
      if (alongU) box(s, off, yT, yT + h, len / n, 0.5, shade(BODY, 1.1), { top: PAL.stone });
      else box(off, vm + s, yT, yT + h, 0.5, len / n, shade(BODY, 1.1), { top: PAL.stone });
    }
  }
  S.kind = KIND.PLAIN;

  // ---- the vọng lâu: two storeys under yellow glazed tiles, on a low stone footing ----
  const tc = P(0, vm);
  box(0, vm, yT, yT + 0.3, Math.min(pwid * 0.72, 12) + 1.0, Math.min(D * 0.55, 7.6) + 1.0, shade(PAL.stone, 0.9), { topKind: KIND.ROAD });
  pavilion(S, tc[0], tc[1], Math.min(pwid * 0.72, 12), Math.min(D * 0.55, 7.6), pa + Math.PI / 2, yT + 0.3, { tiers: 2, wallH: 3.0, roof: PAL.imperialRoof, wall: PAL.lacquer, ridge: hex('#f1d77a'), over: 1.3, rh: 2.6, colonnade: true });

  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = KIND.PLAIN;

  // the tablet's characters, read right to left: 正 東 門 (a small canvas, in the browser only)
  if (group && THREE && typeof document !== 'undefined') {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 112;
    const c = cv.getContext('2d');
    c.fillStyle = '#3b3430'; c.fillRect(0, 0, 256, 112);
    c.fillStyle = '#e2c675'; c.font = 'bold 66px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['門', '東', '正'].forEach((ch, i) => c.fillText(ch, 48 + i * 80, 58));
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const geo = new THREE.PlaneGeometry(PLAQUE_W - 0.1, PLAQUE_H - 0.1);
    for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
      const p = P(0, v + sg * 0.27), m = new THREE.Mesh(geo, mat);
      m.position.set(p[0], crown + 0.7 + PLAQUE_H / 2, p[1]);
      m.rotation.y = Math.atan2(px * sg, pz * sg);
      m.userData.landmark = id;
      group.add(m);
    }
  }
}
