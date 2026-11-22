import { KIND, hex, shade, unflat } from '../../geo/buf.js';
import { gateAxis, rectRing } from '../../geo/gates.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';

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
// (way 39412997, drawn as a road bridge by the shared bridge code, not here). The satellite agrees with that axis
// (bridge bearing 324.5° against 323.3° here) and puts the gate within about 2-3 m of the OSM centre.
//
// As it stands (street-level photographs from the bridge, Nguyễn Trãi and Lương Ngọc Quyền, 2025; heights scaled from
// the sourced arch): a block of dark weathered brick, mottled with lime render and black lichen, its ends stepped out
// as broad corner piers; the arch set in a framed panel that rises to rampart height under a moulded band; the
// pale stone plaque between that band and a cornice at 9 m; a plain parapet with corner posts round the flat
// top (no crenellations). On it a masonry vọng lâu, not a timber pavilion: a lime-rendered lower storey with three
// arched openings on the long faces (the middle one tall and wide, its back painted red) and one on each end, a short
// skirt of terracotta tiles with up-turned corners, a balustraded terrace, and a small upper storey with an arched
// window front and back and a round window in each end, under a low hipped terracotta roof with ridge ornaments and
// a lightning rod: about 19 m to the ridge.
export const id = 'gate:Cửa An Hòa';
const NAME = 'Cửa An Hòa';

const ARCH_W = 3.82, ARCH_H = 5.19; // huetourism.gov.vn
const PLAQUE_W = 2.31, PLAQUE_H = 1.1; // the stone tablet, same source
const TOP = 2.4; // the block's flat top over the wall walk: the cornice tops out at 9.0 m (photo, scaled by the arch)
const LOW = { w: 10.2, d: 7.0, h: 5.05 }; // vọng lâu, lower storey (photo from the bridge; depth estimated)
const UP = { w: 4.9, d: 3.8, h: 3.3 }; // upper storey (same)
const BODY = hex('#625f57'), DAMP = hex('#3f3d37'), LICHEN = hex('#535049'), LIME = hex('#726f66'), FRAME = hex('#7a766b');
const CORNICE = hex('#77736a'), DARK = hex('#1d1916'), DOOR = hex('#4a2c1e'), IRON = hex('#2a2826');
const PLAQUE = hex('#8c887c'), PLAQUE_IN = hex('#b9b4a5');
const RENDER = hex('#7f7d73'), STONE = hex('#8e8b80'), RED = hex('#7e4532');
const TILE = hex('#ac5f3e'), TILE_D = hex('#74452f'), ORN = hex('#cfc9b8'), CURL = hex('#57514a');

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

  // ---- the faces: damp foot, corner piers, the framed arch panel, lichen and lime, the plaque, the cornice ----
  S.kind = KIND.MASONRY;
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    const t = v + sg * 0.1;
    box(0, t + sg * 0.02, y0, LAND_Y + 0.7, W + 0.3, 0.25, DAMP);
    for (const s of [-1, 1]) {
      // the broad corner piers, stepped out from the face and capped under the cornice
      box(s * (W / 2 - 1.0), t + sg * 0.06, y0, yT - 0.75, 2.0, 0.32, shade(BODY, 1.05));
      box(s * (W / 2 - 1.0), t + sg * 0.1, yT - 0.95, yT - 0.55, 2.2, 0.4, CORNICE);
      // the panel the arch is set in, framed up to rampart height
      box(s * 3.1, t + sg * 0.02, fl, LAND_Y + 6.4, 0.6, 0.14, FRAME);
      box(s * (r + 0.2), t + sg * 0.02, fl, spring, 0.4, 0.14, FRAME); // the arch's jambs
      // black lichen run down from the cornice and pale patches of the old lime render
      for (const [u0, h, w] of sg > 0 ? [[4.6, 3.4, 1.1], [6.9, 5.2, 0.8], [1.9, 1.2, 0.9]] : [[5.8, 3.0, 1.0], [2.2, 1.0, 0.8]]) box(s * u0, t + sg * 0.01, yT - 0.6 - h, yT - 0.6, w, 0.2, LICHEN);
      for (const [u0, ya, yb, w] of sg > 0 ? [[5.4, 2.4, 4.4, 1.3], [2.5, 6.8, 7.7, 0.7]] : [[4.8, 3.0, 4.6, 1.1]]) box(s * u0, t + sg * 0.01, LAND_Y + ya, LAND_Y + yb, w, 0.2, LIME);
    }
    for (let k = 0; k < K; k++) { // the arch's moulded band
      const [sa, ya] = arc(k, r + 0.2), [sb, yb] = arc(k + 1, r + 0.2);
      S.beam(V(sa, t + sg * 0.02, ya), V(sb, t + sg * 0.02, yb), 0.14, 0.4, FRAME);
    }
    box(0, t + sg * 0.06, LAND_Y + 6.4, LAND_Y + 6.7, 6.9, 0.28, CORNICE); // the band over the panel
    // the stone plaque over the band: a grey frame round a paler field cut with the characters
    const pb = LAND_Y + 6.95;
    box(0, t + sg * 0.06, pb - 0.12, pb + PLAQUE_H + 0.12, PLAQUE_W + 0.3, 0.16, PLAQUE);
    box(0, t + sg * 0.12, pb, pb + PLAQUE_H, PLAQUE_W, 0.06, PLAQUE_IN);
    box(0, t + sg * 0.08, yT - 0.55, yT - 0.15, W + 0.5, 0.36, CORNICE);
    box(0, t + sg * 0.14, yT - 0.15, yT, W + 0.7, 0.48, shade(CORNICE, 1.08), { top: shade(PAL.stone, 0.8) });
  }

  // ---- the plain parapet round the flat top, with a post at each corner ----
  const pc = P(0, vm);
  const ring = (w, d) => rectRing(pc[0], pc[1], w, d, ang);
  S.kind = KIND.MASONRY;
  {
    const outer = ring(W + 0.3, D + 0.2), inner = ring(W - 0.3, D - 0.4);
    S.prism(outer, yT, yT + 0.45, shade(BODY, 1.06), shade(BODY, 1.06), { holes: [inner.slice().reverse()] });
    const co = ring(W + 0.45, D + 0.35), ci = ring(W - 0.45, D - 0.55);
    S.prism(co, yT + 0.45, yT + 0.6, CORNICE, shade(PAL.stone, 0.85), { holes: [ci.slice().reverse()] });
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      const u = a * (W / 2 - 0.05), v = vm + b * (D / 2 - 0.05), q = P(u, v);
      box(u, v, yT, yT + 1.0, 0.5, 0.5, shade(BODY, 1.06));
      S.box(q[0], q[1], yT + 1.0, yT + 1.15, 0.62, 0.62, ang, CORNICE);
    }
  }

  // ---- the vọng lâu: a masonry lower storey, a skirt of tiles, a terrace, a small upper storey ----
  // An arched opening on one of the tower's faces: a render ring round a recess (rectangle to the spring, half-disc
  // above). along: the face is at constant v (centred at u = s); otherwise at constant u (centred at v = t).
  const opening = (s, t, sg, along, ya, w, h, back) => {
    const rr0 = w / 2, sp = ya + h - rr0, KK = 7;
    const at = (q, y, d) => (along ? V(s + q, t + sg * d, y) : V(s + sg * d, t + q, y));
    const n = along ? N(0, sg) : N(sg, 0);
    for (const [rr, d, col] of [[rr0 + 0.2, 0.03, STONE], [rr0, 0.05, back]]) {
      quad(at(-rr, ya, d), at(rr, ya, d), at(rr, sp, d), at(-rr, sp, d), col, n);
      for (let k = 0; k < KK; k++) {
        const a0 = Math.PI - (Math.PI * k) / KK, a1 = Math.PI - (Math.PI * (k + 1)) / KK;
        S.tri(at(0, sp, d), at(rr * Math.cos(a0), sp + rr * Math.sin(a0), d), at(rr * Math.cos(a1), sp + rr * Math.sin(a1), d), col, n);
      }
    }
  };
  // a round window on an end face (constant u): a stone ring round a dark disc
  const roundel = (s, sg, yc, rad) => {
    const KK = 12, n = N(sg, 0);
    for (const [rr, d, col] of [[rad + 0.14, 0.03, STONE], [rad, 0.05, DARK]]) for (let k = 0; k < KK; k++) {
      const a0 = (2 * Math.PI * k) / KK, a1 = (2 * Math.PI * (k + 1)) / KK;
      S.tri(V(s + sg * d, vm, yc), V(s + sg * d, vm + rr * Math.cos(a0), yc + rr * Math.sin(a0)), V(s + sg * d, vm + rr * Math.cos(a1), yc + rr * Math.sin(a1)), col, n);
    }
  };

  S.kind = KIND.MASONRY;
  box(0, vm, yT, yT + 0.4, LOW.w + 0.5, LOW.d + 0.5, STONE, { top: shade(PAL.stone, 0.85), topKind: KIND.ROAD }); // plinth
  const yf = yT + 0.4, ye = yf + LOW.h;
  box(0, vm, yf, ye, LOW.w, LOW.d, RENDER, { top: STONE });
  box(0, vm, yf, yf + 0.6, LOW.w + 0.02, LOW.d + 0.02, DAMP); // damp, darkened foot
  for (const sg of [-1, 1]) for (const [u0, h, w] of [[-4.3, 2.2, 0.9], [4.0, 1.4, 1.1]]) box(sg * u0, vm + sg * (LOW.d / 2 + 0.01), ye - h, ye, w, 0.04, shade(RENDER, 0.86));
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    const t = vm + (dt * LOW.d) / 2;
    opening(0, t, dt, true, yf, 2.4, 3.95, RED); // the middle opening, its back painted red
    opening(-3.2, t, dt, true, yf, 1.4, 2.65, dt > 0 ? DARK : RED);
    opening(3.2, t, dt, true, yf, 1.4, 2.65, dt > 0 ? RED : DARK);
  }
  for (const sg of [-1, 1]) opening((sg * LOW.w) / 2, vm, sg, false, yf, 1.5, 2.5, RED);
  // the cornice and the skirt of tiles with up-turned corners
  S.kind = KIND.MASONRY;
  box(0, vm, ye - 0.05, ye + 0.25, LOW.w + 0.35, LOW.d + 0.35, STONE);
  const ys = ye + 0.25;
  S.kind = KIND.TILE;
  S.prism(ring(LOW.w + 1.6, LOW.d + 1.6), ys - 0.12, ys + 0.4, TILE, TILE, { scaleTop: 0.86, top: false });
  S.kind = KIND.PLAIN;
  box(0, vm, ys - 0.3, ys - 0.12, LOW.w + 1.6, LOW.d + 1.6, ORN); // the pale lime edge under the tiles
  for (const a of [-1, 1]) for (const b of [-1, 1]) { // corner horns
    const s = a * (LOW.w / 2 + 0.8), t = vm + b * (LOW.d / 2 + 0.8);
    S.beam(V(s, t, ys - 0.05), V(s + a * 0.2, t + b * 0.2, ys + 0.4), 0.2, 0.2, CURL);
  }
  // the terrace on it, and its balustrade
  S.kind = KIND.MASONRY;
  box(0, vm, ys, ys + 0.35, LOW.w - 0.05, LOW.d - 0.05, STONE, { top: shade(PAL.stone, 0.85), topKind: KIND.ROAD });
  const yt = ys + 0.35;
  S.kind = KIND.PLAIN;
  S.prism(ring(LOW.w - 0.2, LOW.d - 0.2), yt, yt + 0.55, shade(STONE, 0.9), shade(STONE, 1.05), { holes: [ring(LOW.w - 0.5, LOW.d - 0.5).slice().reverse()] });
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(a * (LOW.w / 2 - 0.25), vm + b * (LOW.d / 2 - 0.25), yt, yt + 0.9, 0.38, 0.38, STONE);
  for (const sg of [-1, 1]) for (const s of [-1.8, 1.8]) box(s, vm + sg * (LOW.d / 2 - 0.25), yt, yt + 0.8, 0.32, 0.32, STONE);

  // the upper storey and its roof
  S.kind = KIND.MASONRY;
  const yu = yt + UP.h;
  box(0, vm, yt, yu, UP.w, UP.d, RENDER, { top: STONE });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) opening(0, vm + (dt * UP.d) / 2, dt, true, yt + 0.3, 1.4, 1.9, DARK);
  for (const sg of [-1, 1]) roundel((sg * UP.w) / 2, sg, yt + 1.5, 0.48);
  S.kind = KIND.MASONRY;
  box(0, vm, yu - 0.05, yu + 0.2, UP.w + 0.3, UP.d + 0.3, STONE);
  const rh = 0.6;
  S.hip(pc[0], pc[1], UP.w, UP.d, ang, yu + 0.2, rh, TILE, { flare: 0.3, over: 0.6, fascia: 0.18, fasciaCol: TILE_D, ridgeCol: hex('#c99060'), hips: true, segs: 2, horns: false });
  // ridge ornaments: curled ends on the ridge and the four hips, a small finial and the lightning rod
  S.kind = KIND.PLAIN;
  const yr = yu + 0.2 + rh, rl = Math.max(0, (UP.w + 1.2) / 2 - ((UP.d + 1.2) / 2) * 0.92);
  for (const sg of [-1, 1]) box(sg * rl, vm, yr, yr + 0.45, 0.3, 0.25, ORN);
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(a * (UP.w / 2 + 0.5), vm + b * (UP.d / 2 + 0.5), yu + 0.25, yu + 0.6, 0.22, 0.22, CURL);
  box(0, vm, yr, yr + 0.35, 0.35, 0.3, ORN);
  box(0, vm, yr + 0.35, yr + 1.6, 0.05, 0.05, hex('#4a4a48'));

  (S.paved = S.paved || []).push([n0, S.n]);
  S.kind = keep;

  // the plaque's characters, read right to left: 西 北 門 (a small canvas, in the browser only)
  if (group && THREE && typeof document !== 'undefined') {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 112;
    const c = cv.getContext('2d');
    c.fillStyle = '#b9b4a5'; c.fillRect(0, 0, 256, 112);
    c.fillStyle = '#4a443d'; c.font = 'bold 62px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['門', '北', '西'].forEach((ch, i) => c.fillText(ch, 48 + i * 80, 58));
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const geo = new THREE.PlaneGeometry(PLAQUE_W - 0.1, PLAQUE_H - 0.1);
    for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
      const p = P(0, v + sg * 0.27), m = new THREE.Mesh(geo, mat);
      m.position.set(p[0], LAND_Y + 6.95 + PLAQUE_H / 2, p[1]);
      m.rotation.y = Math.atan2(ox * sg, oz * sg);
      m.userData.landmark = id;
      group.add(m);
    }
  }
}
