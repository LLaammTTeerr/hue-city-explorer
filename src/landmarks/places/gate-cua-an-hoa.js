import { KIND, hex, shade, unflat } from '../../geo/buf.js';
import { gateAxis } from '../../geo/gates.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';
import { pavilion } from '../citadel.js';

// Cửa An Hòa (安和, officially Tây Bắc Môn 西北門), the north-west gate of the Kinh thành Huế, at the end of đường
// Nguyễn Trãi, opening over Cầu An Hòa and the moat towards An Hòa village and market. Notes and sources:
// docs/places/gate-cua-an-hoa.md.
//
// Sourced: the arched gate built 1809 under Gia Long, its vọng lâu 1831 under Minh Mạng (VietnamPlus, VisitHue);
// like all ten land gates of the Kinh thành: one passage under a round arch 3.82 m wide and 5.19 m high, timber (lim)
// door leaves, a stone name plaque over the arch about 2.31 × 1.10 × 0.15 m, and a two-storey vọng lâu roofed with
// tubular tiles rising more than 9 m over the wall top, the whole gate more than 17 m high (huetourism.gov.vn, after
// Phan Thuận An). The rampart is 6.6 m high. Plan, centre and axis: the OSM gate building (way 367959065, 17.5 m
// along the wall × 13.9 m), Nguyễn Trãi's passage through it (way 39418370) and Cầu An Hòa over the moat
// (way 39412997, drawn as a road bridge by the shared bridge code, not here).
//
// Estimated from photographs of the Kinh thành gates: the block a little higher than the wall walk, of weathered
// lime-rendered brick gone dark and mossy on this north-facing side, pilasters framing the arch bay, a moulded cornice
// and a crenellated parapet round the flat top; the vọng lâu a colonnaded lower storey under the first roof and a
// small closed upper storey under the second, red lacquered timber and yellow glazed tiles.
export const id = 'gate:Cửa An Hòa';
const NAME = 'Cửa An Hòa';

const ARCH_W = 3.82, ARCH_H = 5.19; // huetourism.gov.vn
const PLAQUE_W = 2.31, PLAQUE_H = 1.1; // the stone tablet, same source
const TOP = 1.45; // the block above the wall walk (estimate: room for arch + plaque + cornice, 17 m in all)
const BODY = hex('#6c675f'), DAMP = hex('#45433c'), MOSS = hex('#545a45'), FRAME = hex('#aaa290');
const CORNICE = hex('#837d72'), DARK = hex('#1d1916'), DOOR = hex('#4a2c1e'), IRON = hex('#2a2826');
const PLAQUE = hex('#cfc4aa'), PLAQUE_IN = hex('#38312c');

export function build({ data, S, group, place, THREE }) {
  const norm = (s) => String(s || '').normalize('NFC');
  const g = (data.gates || []).find((q) => norm(q.n) === norm(NAME));
  if (!g) throw new Error('gate not in data.gates');
  const kt = (data.places || []).find((q) => q.id === 'kinhthanh');
  const centre = kt ? [kt.x / 10, kt.z / 10] : [g.c[0] / 10 + 100, g.c[1] / 10 + 100];
  const { cx, cz, px: tx, pz: tz, pwid } = gateAxis(g, centre);
  // local frame: v through the wall, + out of the city (towards the moat), u along the wall
  const ox = -tx, oz = -tz, ux = -oz, uz = ox, ang = Math.atan2(uz, ux);
  const P = (u, v) => [cx + u * ux + v * ox, cz + u * uz + v * oz];
  const V = (u, v, y) => { const p = P(u, v); return [p[0], y, p[1]]; };
  const N = (nu, nv, ny = 0) => [nu * ux + nv * ox, ny, nu * uz + nv * oz];
  const box = (u, v, y0, y1, su, sv, col, opts) => { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ang, col, opts); };
  const quad = (a, b, c, d, col, n) => S.quad(a, b, c, d, col, n);

  // the rampart's faces where they cross the passage axis (data.wall): the block stands a hand's breadth past both
  let vIn = -6.5, vOut = 6.5;
  {
    const hits = [];
    for (const poly of data.wall || []) for (const r of poly.map(unflat)) for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], ex = b[0] - a[0], ez = b[1] - a[1], den = ox * ez - oz * ex;
      if (Math.abs(den) < 1e-9) continue;
      const qx = a[0] - cx, qz = a[1] - cz, t = (qx * ez - qz * ex) / den, s = (qx * oz - qz * ox) / den;
      if (s >= 0 && s <= 1 && Math.abs(t) < 20) hits.push(t);
    }
    const ins = hits.filter((t) => t < 0), outs = hits.filter((t) => t > 0);
    if (ins.length) vIn = Math.min(...ins) - 0.4;
    if (outs.length) vOut = Math.max(...outs) + 0.4;
  }
  const W = pwid + 0.4, D = vOut - vIn, vm = (vIn + vOut) / 2;
  const y0 = LAND_Y - 0.5, yT = LAND_Y + WALL_H + TOP, fl = LAND_Y + 0.02;
  const r = ARCH_W / 2, crown = LAND_Y + ARCH_H, spring = crown - r, K = 12;
  const arc = (k, rr = r) => { const th = Math.PI - (Math.PI * k) / K; return [rr * Math.cos(th), spring + rr * Math.sin(th)]; };
  const n0 = S.n, keep = S.kind;

  // ---- the block: both faces with the arch cut out, the ends, the flat top ----
  S.kind = KIND.MASONRY;
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    const n = N(0, sg);
    quad(V(-W / 2, v, y0), V(-r, v, y0), V(-r, v, yT), V(-W / 2, v, yT), BODY, n);
    quad(V(r, v, y0), V(W / 2, v, y0), V(W / 2, v, yT), V(r, v, yT), BODY, n);
    quad(V(-r, v, crown), V(r, v, crown), V(r, v, yT), V(-r, v, yT), BODY, n);
    for (let k = 0; k < K; k++) { // the spandrels between the arch and its crown
      const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
      quad(V(sa, v, ya), V(sb, v, yb), V(sb, v, crown), V(sa, v, crown), BODY, n);
    }
  }
  for (const sg of [-1, 1]) {
    const u = (sg * W) / 2;
    quad(V(u, vIn, y0), V(u, vOut, y0), V(u, vOut, yT), V(u, vIn, yT), BODY, N(sg, 0));
  }
  S.kind = KIND.ROAD;
  quad(V(-W / 2, vIn, yT), V(-W / 2, vOut, yT), V(W / 2, vOut, yT), V(W / 2, vIn, yT), shade(PAL.stone, 0.8), [0, 1, 0]);
  quad(V(-r, vIn - 0.4, fl), V(-r, vOut + 0.4, fl), V(r, vOut + 0.4, fl), V(r, vIn - 0.4, fl), shade(PAL.stone, 0.6), [0, 1, 0]);
  // the barrel vault and the passage's sides, dark with soot and damp
  S.kind = KIND.PLAIN;
  for (let k = 0; k < K; k++) {
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    quad(V(sa, vIn + 0.01, ya), V(sa, vOut - 0.01, ya), V(sb, vOut - 0.01, yb), V(sb, vIn + 0.01, yb), shade(BODY, 0.42), N(-(sa + sb) / 2, 0, spring - (ya + yb) / 2));
  }
  for (const sg of [-1, 1]) {
    const u = sg * (r - 0.01);
    quad(V(u, vIn, fl), V(u, vOut, fl), V(u, vOut, spring), V(u, vIn, spring), DARK, N(-sg, 0));
  }
  // the lim-wood door leaves, iron-banded, swung back against the passage sides inside the outer mouth
  for (const sg of [-1, 1]) {
    box(sg * (r - 0.1), vOut - 2.4, fl, spring - 0.05, 0.14, r * 0.95, DOOR);
    for (const yy of [fl + 0.6, (fl + spring) / 2, spring - 0.6]) box(sg * (r - 0.18), vOut - 2.4, yy, yy + 0.1, 0.03, r * 0.95, IRON);
  }

  // ---- the faces: damp foot, moss streaks, pilasters, the arch's surround, the plaque, the cornice ----
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    const t = v + sg * 0.1;
    box(0, t + sg * 0.02, y0, LAND_Y + 0.8, W + 0.3, 0.25, DAMP);
    for (const s of [-1, 1]) {
      box(s * (W / 2 - 0.5), t, LAND_Y + 0.8, yT - 0.55, 1.0, 0.2, shade(BODY, 1.07)); // corner pilasters
      box(s * 4.2, t, LAND_Y + 0.8, yT - 0.55, 0.75, 0.16, shade(BODY, 1.05)); // pilasters framing the arch bay
      box(s * (r + 0.2), t + sg * 0.02, fl, spring, 0.4, 0.14, FRAME); // the arch's jambs
      // lichen run down from the cornice, more on the outer (north-west) face
      for (const [u0, h] of sg > 0 ? [[2.6, 3.2], [6.1, 4.4]] : [[6.4, 2.4]]) box(s * u0, t + sg * 0.01, yT - 0.6 - h, yT - 0.6, 0.9 + (h % 1), 0.2, MOSS);
    }
    for (let k = 0; k < K; k++) { // the arch's moulded band
      const [sa, ya] = arc(k, r + 0.2), [sb, yb] = arc(k + 1, r + 0.2);
      S.beam(V(sa, t + sg * 0.02, ya), V(sb, t + sg * 0.02, yb), 0.14, 0.4, FRAME);
    }
    box(0, t + sg * 0.05, crown + 0.02, crown + 0.48, 0.42, 0.14, FRAME); // keystone
    // the stone plaque: a light frame, the characters on a dark ground
    const pb = crown + 0.62;
    box(0, t + sg * 0.06, pb - 0.12, pb + PLAQUE_H + 0.12, PLAQUE_W + 0.3, 0.16, PLAQUE);
    box(0, t + sg * 0.12, pb, pb + PLAQUE_H, PLAQUE_W, 0.06, PLAQUE_IN);
    box(0, t, crown + 0.5, crown + 0.56, 7.6, 0.16, shade(BODY, 1.06)); // the band across the arch bay
    box(0, t + sg * 0.08, yT - 0.55, yT - 0.15, W + 0.5, 0.36, CORNICE);
    box(0, t + sg * 0.14, yT - 0.15, yT, W + 0.7, 0.48, shade(CORNICE, 1.08), { top: shade(PAL.stone, 0.8) });
  }

  // ---- the crenellated parapet (lỗ châu mai) round the flat top ----
  S.kind = KIND.MASONRY;
  for (const [len, alongU, off] of [[W, true, vIn + 0.25], [W, true, vOut - 0.25], [D, false, -W / 2 + 0.25], [D, false, W / 2 - 0.25]]) {
    const n = Math.max(3, Math.round(len / 1.4) | 1);
    for (let k = 0; k < n; k++) {
      const s = -len / 2 + (len * (k + 0.5)) / n, h = k % 2 === 0 ? 1.15 : 0.62;
      if (alongU) box(s, off, yT, yT + h, len / n, 0.5, shade(BODY, 1.1), { top: PAL.stone });
      else box(off, vm + s, yT, yT + h, 0.5, len / n, shade(BODY, 1.1), { top: PAL.stone });
    }
  }
  // a stone sill under the tower's colonnade
  box(0, vm, yT, yT + 0.25, Math.min(pwid * 0.7, 12.2) + 0.8, Math.min(D * 0.5, 7.6) + 0.8, shade(PAL.stone, 0.92), { topKind: KIND.ROAD });

  // ---- the vọng lâu: two storeys, red lacquer under yellow glazed tubular tiles ----
  S.kind = KIND.PLAIN;
  const pc = P(0, vm);
  pavilion(S, pc[0], pc[1], Math.min(pwid * 0.7, 12.2), Math.min(D * 0.5, 7.6), ang, yT + 0.25, { tiers: 2, wallH: 3.2, roof: PAL.imperialRoof, ridge: hex('#f1d77a'), over: 1.3, rh: 2.9, colonnade: true });

  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = keep;

  // the plaque's characters, read right to left: 西 北 門 (a small canvas, in the browser only)
  if (group && THREE && typeof document !== 'undefined') {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 112;
    const c = cv.getContext('2d');
    c.fillStyle = '#38312c'; c.fillRect(0, 0, 256, 112);
    c.fillStyle = '#e0c472'; c.font = 'bold 62px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['門', '北', '西'].forEach((ch, i) => c.fillText(ch, 48 + i * 80, 58));
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const geo = new THREE.PlaneGeometry(PLAQUE_W - 0.1, PLAQUE_H - 0.1);
    for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
      const p = P(0, v + sg * 0.27), m = new THREE.Mesh(geo, mat);
      m.position.set(p[0], crown + 0.62 + PLAQUE_H / 2, p[1]);
      m.rotation.y = Math.atan2(ox * sg, oz * sg);
      m.userData.landmark = id;
      group.add(m);
    }
  }
}
