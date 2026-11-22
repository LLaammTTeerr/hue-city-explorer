import { KIND, hex, shade } from '../../geo/buf.js';
import { gateAxis, CITADEL_PASSAGE } from '../../geo/gates.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';

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
// Estimated from Street View (2024 panos from the bridge, scaled from the 3.82 m arch) and the satellite: the block
// about 8.3 m above the road, brick weathered dark, wide projecting corner pilasters, a raised panel round the arch under
// the tablet, a moulded cornice and a low solid parapet with posts and corner finials; the tower brick, its render mostly gone, the
// lower storey about 9.6 m wide with three arches a side under a tiled skirt, a terrace with a low balustrade, a small
// upper storey (about 4.2 m) with one arched window a side under a hipped roof, about 16 m above the road in all.
// Both roofs keep the yellow glazed tile of the other gates' towers.
export const id = 'gate:Cửa Đông Ba';
const NAME = 'Cửa Đông Ba';

const OPEN_W = 3.82, OPEN_H = 5.19; // the nguyệt môn (huetourism.gov.vn, after Phan Thuận An)
const PLAQUE_W = 2.31, PLAQUE_H = 1.10; // the stone name tablet (same source)
const TOP = 1.6; // gate block above the wall walk (estimate, from the ~16.5 m total and the tower's height)
const BODY = hex('#5f564e'), DAMP = hex('#46433e'), FRAME = hex('#b3aa96'), CORNICE = hex('#857f75'), DARK = hex('#1f1a18');
const RENDER = hex('#ad9b84'); // the tower's brick, its render mostly weathered off
const DOOR = hex('#4a2c1e'), IRON = hex('#2a2624'), PLAQUE = hex('#d6cab0'), PLAQUE_IN = hex('#3b3430');

export function build({ data, S, group, place, THREE }) {
  const norm = (s) => String(s || '').normalize('NFC');
  const g = (data.gates || []).find((q) => norm(q.n) === norm(NAME));
  if (!g) throw new Error('gate not in data.gates');
  const kt = (data.places || []).find((q) => q.id === 'kinhthanh');
  const centre = kt ? [kt.x / 10, kt.z / 10] : [g.c[0] / 10 - 900, g.c[1] / 10 + 260];
  const { cx, cz, pa, px, pz, plen, pwid } = gateAxis(g, centre); // +v runs out of the city, towards the moat
  const ux = -pz, uz = px; // along the wall
  const P = (u, v) => [cx + u * ux + v * px, cz + u * uz + v * pz];
  const V = (u, v, y) => { const p = P(u, v); return [p[0], y, p[1]]; };
  const N = (nu, nv, ny = 0) => [nu * ux + nv * px, ny, nu * uz + nv * pz];
  const box = (u, v, y0, y1, su, sv, col, opts) => { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, pa + Math.PI / 2, col, opts); };

  // the block: 13 m deep from the outer face (on the satellite it spans the rampart face to face at that depth). The
  // record (data.gates) is lengthened inward past it (build-data GATE_FIX) so the slot the walls cut reaches the city
  // through the mapped rampart, which runs a few metres further in here than the real one; the cut behind the block
  // is lined below.
  const BLOCK_D = 13.0;
  const vOut = plen / 2, vIn = vOut - BLOCK_D;
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
  // the cut through the mapped rampart behind the block: its two sides, as far in as the wall band runs on each
  const half = CITADEL_PASSAGE.slot / 2, wallTop = LAND_Y + WALL_H;
  const reachIn = (u) => { // the innermost crossing of data.wall along the line at u, behind the block
    let best = null;
    for (const pg of data.wall || []) for (const f of pg) for (let i = 0, n = f.length / 2; i < n; i++) {
      const j = (i + 1) % n, ax = f[2 * i] / 10 - cx, az = f[2 * i + 1] / 10 - cz, bx = f[2 * j] / 10 - cx, bz = f[2 * j + 1] / 10 - cz;
      const au = ax * ux + az * uz, bu = bx * ux + bz * uz;
      if ((au - u) * (bu - u) >= 0) continue;
      const s = (u - au) / (bu - au), v = (ax * px + az * pz) * (1 - s) + (bx * px + bz * pz) * s;
      if (v < vIn && v > -plen / 2 - 1.5 && (best === null || v < best)) best = v;
    }
    return best;
  };
  S.kind = KIND.MASONRY;
  for (const sg of [-1, 1]) {
    const vEnd = reachIn(sg * half);
    if (vEnd === null) continue;
    const u = sg * half, [va, vb] = sg > 0 ? [vEnd, vIn] : [vIn, vEnd];
    S.quad(V(u, va, y0), V(u, vb, y0), V(u, vb, wallTop), V(u, va, wallTop), shade(BODY, 0.9), N(-sg, 0));
  }
  S.kind = KIND.ROAD;
  { const vEnd = Math.min(reachIn(-half) ?? vIn, reachIn(half) ?? vIn); S.quad(V(-half, vEnd, fl), V(-half, vIn, fl), V(half, vIn, fl), V(half, vEnd, fl), shade(PAL.stone, 0.62), [0, 1, 0]); }
  S.kind = KIND.PLAIN;
  // the two lim leaves, iron-banded, swung open against the passage sides just inside the outer mouth
  for (const sg of [-1, 1]) {
    box(sg * (r - 0.1), vOut - 2.0, fl, spring - 0.05, 0.14, r * 0.95, DOOR);
    for (const yb of [0.9, 2.1, 3.2]) box(sg * (r - 0.18), vOut - 2.0, fl + yb, fl + yb + 0.1, 0.03, r * 0.95, IRON);
  }

  // ---- the facades: damp foot, wide corner pilasters, the raised panel framing the arch, the tablet, the cornice ----
  const PB = LAND_Y + 6.2; // the tablet's foot, over the panel (Street View, scaled from the 3.82 m arch)
  for (const [v, sg] of [[vIn, -1], [vOut, 1]]) {
    const t = v + sg * 0.1;
    box(0, t + sg * 0.02, y0, LAND_Y + 0.8, W + 0.3, 0.25, DAMP);
    for (const s of [-1, 1]) {
      box(s * (W / 2 - 0.9), t + sg * 0.1, y0, yT - 0.55, 1.8, 0.4, shade(BODY, 1.08)); // corner pilasters, projecting
      box(s * (W / 2 - 0.9), t + sg * 0.16, yT - 0.95, yT - 0.55, 2.1, 0.5, CORNICE); // their capitals
      box(s * (r + 0.2), t + sg * 0.12, fl, spring, 0.4, 0.14, FRAME); // the arch's jambs
    }
    // the raised panel round the arch: its two piers and its head, the arch cut through it
    for (const s of [-1, 1]) box(s * (r + 0.2 + 0.375), t + sg * 0.03, LAND_Y + 0.8, LAND_Y + 6.0, 0.75, 0.16, shade(BODY, 1.12));
    for (let k = 0; k < K; k++) { // the spandrels of the panel, between the arch ring and the panel's head
      const [sa, ya] = arc(k, r + 0.4), [sb, yb] = arc(k + 1, r + 0.4);
      const um = (sa + sb) / 2, yl = Math.min(ya, yb);
      box(um, t + sg * 0.03, yl, LAND_Y + 6.0, Math.abs(sb - sa) + 0.02, 0.16, shade(BODY, 1.12));
    }
    box(0, t + sg * 0.05, LAND_Y + 5.85, LAND_Y + 6.05, 5.9, 0.22, CORNICE); // the panel's moulded head
    for (let k = 0; k < K; k++) { // the arch's moulded ring
      const [sa, ya] = arc(k, r + 0.2), [sb, yb] = arc(k + 1, r + 0.2);
      S.beam(V(sa, t + sg * 0.12, ya), V(sb, t + sg * 0.12, yb), 0.14, 0.4, FRAME);
    }
    // the stone tablet: a raised frame, the characters on a dark ground
    box(0, t + sg * 0.06, PB - 0.12, PB + PLAQUE_H + 0.12, PLAQUE_W + 0.5, 0.16, PLAQUE);
    box(0, t + sg * 0.12, PB, PB + PLAQUE_H, PLAQUE_W, 0.06, PLAQUE_IN);
    box(0, t + sg * 0.08, yT - 0.55, yT - 0.15, W + 0.5, 0.36, CORNICE);
    box(0, t + sg * 0.14, yT - 0.15, yT, W + 0.7, 0.48, shade(CORNICE, 1.08), { top: shade(PAL.stone, 0.85) });
  }

  // ---- the low parapet round the flat top: a solid rail between small posts, finials at the corners ----
  S.kind = KIND.MASONRY;
  const D = vOut - vIn, vm = (vIn + vOut) / 2;
  for (const [len, alongU, off] of [[W, true, vIn + 0.25], [W, true, vOut - 0.25], [D, false, -W / 2 + 0.25], [D, false, W / 2 - 0.25]]) {
    if (alongU) box(0, off, yT, yT + 0.6, len, 0.4, shade(BODY, 1.1), { top: PAL.stone });
    else box(off, vm, yT, yT + 0.6, 0.4, len - 1.0, shade(BODY, 1.1), { top: PAL.stone });
    const n = Math.max(2, Math.round(len / 2.4));
    for (let k = 1; k < n; k++) {
      const s = -len / 2 + (len * k) / n;
      if (alongU) box(s, off, yT, yT + 0.8, 0.5, 0.5, shade(BODY, 1.14), { top: PAL.stone });
      else box(off, vm + s, yT, yT + 0.8, 0.5, 0.5, shade(BODY, 1.14), { top: PAL.stone });
    }
  }
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    box(su * (W / 2 - 0.35), vm + sv * (D / 2 - 0.35), yT, yT + 1.0, 0.7, 0.7, shade(BODY, 1.14), { top: PAL.stone });
    box(su * (W / 2 - 0.35), vm + sv * (D / 2 - 0.35), yT + 1.0, yT + 1.45, 0.34, 0.34, shade(BODY, 1.2), { taper: 0.4 });
  }

  // ---- the vọng lâu: a rendered masonry lower storey with three arches a side under a tiled skirt, a terrace with a
  // low balustrade on it, a small upper storey with one arched window a side, under a hipped tile roof ----
  const tc = P(0, vm), ROT = pa + Math.PI / 2;
  const LW = 9.6, LD = 6.2, LH = 3.2, UW = 4.2, UD = 3.4, UH = 2.2;
  const yb0 = yT + 0.6, yL = yb0 + LH, yTer = yL + 0.55, yU = yTer + UH;
  box(0, vm, yT, yb0, LW + 0.8, LD + 0.8, shade(PAL.stone, 0.9), { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  box(0, vm, yb0, yL, LW, LD, RENDER);
  box(0, vm, yL - 0.35, yL, LW + 0.3, LD + 0.3, shade(RENDER, 0.92)); // cornice band
  // an arched opening on a face: a dark rectangle to the springing and a stepped semicircle over it
  const opening = (u, v, nv, w, sill, h, alongU = true) => {
    const rr = w / 2, sp = sill + h - rr;
    const put = (uu, y1, y2, ww) => (alongU ? box(u + uu, v + nv * 0.03, y1, y2, ww, 0.1, DARK) : box(v + nv * 0.03, u + uu, y1, y2, 0.1, ww, DARK));
    put(0, sill, sp, w);
    for (let k = 0; k < 4; k++) { const y1 = sp + (rr * k) / 4, y2 = sp + (rr * (k + 1)) / 4; put(0, y1, y2, 2 * rr * Math.sqrt(1 - ((k + 0.5) / 4) ** 2)); }
  };
  for (const sg of [-1, 1]) {
    const fv = vm + sg * LD / 2;
    opening(0, fv, sg, 1.9, yb0, 2.2);
    for (const s of [-1, 1]) opening(s * 3.0, fv, sg, 1.15, yb0, 0.9);
    opening(vm, sg * LW / 2, sg, 1.15, yb0, 0.9, false);
  }
  S.kind = KIND.PLAIN;
  S.hip(tc[0], tc[1], LW, LD, ROT, yL - 0.2, 0.6, PAL.imperialRoof, { over: 0.55, flare: 0.08, hips: true, fascia: 0.32, fasciaCol: shade(PAL.imperialRoof, 0.7), ridgeCol: hex('#f1d77a') });
  S.kind = KIND.MASONRY;
  box(0, vm, yL, yTer, LW - 1.2, LD - 1.2, shade(RENDER, 0.95), { top: shade(PAL.stone, 0.9) }); // the terrace
  for (const [len, alongU, off] of [[LW - 1.2, true, vm - (LD - 1.2) / 2 + 0.1], [LW - 1.2, true, vm + (LD - 1.2) / 2 - 0.1], [LD - 1.2, false, -(LW - 1.2) / 2 + 0.1], [LD - 1.2, false, (LW - 1.2) / 2 - 0.1]]) {
    if (alongU) box(0, off, yTer + 0.5, yTer + 0.62, len, 0.18, RENDER);
    else box(off, vm, yTer + 0.5, yTer + 0.62, 0.18, len, RENDER);
    const n = Math.max(2, Math.round(len / 1.2));
    for (let k = 0; k <= n; k++) {
      const s = -len / 2 + (len * k) / n;
      if (alongU) box(s, off, yTer, yTer + 0.62, 0.16, 0.16, RENDER);
      else box(off, vm + s, yTer, yTer + 0.62, 0.16, 0.16, RENDER);
    }
  }
  box(0, vm, yTer, yU, UW, UD, RENDER);
  box(0, vm, yU - 0.25, yU, UW + 0.2, UD + 0.2, shade(RENDER, 0.92));
  for (const sg of [-1, 1]) {
    opening(0, vm + sg * UD / 2, sg, 1.0, yTer + 0.5, 1.3);
    opening(vm, sg * UW / 2, sg, 0.8, yTer + 0.6, 1.1, false);
  }
  S.kind = KIND.PLAIN;
  S.hip(tc[0], tc[1], UW, UD, ROT, yU - 0.1, 1.0, PAL.imperialRoof, { over: 0.5, flare: 0.1, hips: true, fascia: 0.32, fasciaCol: shade(PAL.imperialRoof, 0.7), ridgeCol: hex('#f1d77a') });
  S.cyl(tc[0], tc[1], yU + 0.85, yU + 1.9, 0.1, 0.04, 6, hex('#c9a24a'));

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
      m.position.set(p[0], PB + PLAQUE_H / 2, p[1]);
      m.rotation.y = Math.atan2(px * sg, pz * sg);
      m.userData.landmark = id;
      group.add(m);
    }
  }
}
