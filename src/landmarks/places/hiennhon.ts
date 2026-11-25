import { KIND, hex, shade } from '../../geo/buf.ts';
import { rectRing } from '../../geo/gates.ts';
import { LAND_Y, PAL } from '../../config.ts';

// Cửa Hiển Nhơn (顯仁門), the east gate of the Imperial City (Hoàng thành), Huế. Notes and sources:
// docs/places/hiennhon.md.
//
// Built 1804-05 under Gia Long and named Hiển Nhơn by Minh Mạng (1833), it was rebuilt in brick under Khải Định and
// clad in porcelain mosaic (khảm sành sứ). It was damaged in 1968 and restored after 1975. Today it is the visitors'
// exit from Đại Nội. It is a masonry gate: a long block pierced by three arched passages (the middle one higher),
// and on it a two-storey masonry tower with three arched openings on each long face of the lower storey, both
// storeys under yellow glazed tiles (hoàng lưu ly). Mosaic pilasters, a name plaque over the middle arch, dragons and
// a fire pearl on the top ridge.
//
// Plan: the OSM outline (way 264099611), 14.0 m along the wall × 7.9 m through it. The block is drawn 14.3 m long so
// it closes the 0.15 m that places/dainoi.js leaves between its wall ends and the gate's footprint.
// Local frame: s along the wall (the outline's long axis), t through it, + out of the Imperial City (east-south-east).
//
// Checked against Google satellite and Street View (Nov 2026, scratch only): the OSM centre and axis sit within about
// 1 m and 2° of the gate on the satellite, and its 14 m length matches, so they are kept. A Street View photosphere
// on the outer face shows the face itself: weathered grey porcelain-encrusted masonry (not cream lime-wash), arches
// ringed in blue and white bands, ochre-yellow passage reveals, red door leaves standing open inside, tall
// pedestals and framed relief panels on the piers, and the upper storey's arched openings set over the side passages.
export const id = 'hiennhon';

const C = [-886.0, -206.3]; // centre of the OSM outline, metres in the model frame
const A = -2.21; // direction of s (the outline's long axis, along the Imperial City wall)
const ux = Math.cos(A), uz = Math.sin(A);
const P = (s, t): [number, number] => [C[0] + s * ux - t * uz, C[1] + s * uz + t * ux];
const V = (s, t, y?) => { const p = P(s, t); return [p[0], y, p[1]]; };
const N = (ds, dt, dy = 0): [number, number, number] => [ds * ux - dt * uz, dy, ds * uz + dt * ux]; // a direction in the local frame

const L = 14.3, D = 7.9; // the block
const HB = 4.8; // block height to the cornice (estimate, ~1 m above the 3.75 m wall)
// the three passages: middle for the emperor's party, the side two for mandarins (sizes estimated from photos)
const OPEN = [{ s: 0, w: 3.0, h: 4.0 }, { s: -4.4, w: 2.0, h: 3.1 }, { s: 4.4, w: 2.0, h: 3.1 }];
// The tower's lower storey runs nearly the block's length, its side openings over the side passages (Street View);
// on the satellite the gate's lit top is a long narrow strip, the full 14 m long and about 5 m across.
const UP1 = { w: 11.2, d: 4.8, h: 3.0 }; // tower, lower storey
const UP2 = { w: 6.6, d: 2.8, h: 1.8 }; // tower, upper storey

const BODY = hex('#b8b6ac'); // bright porcelain-mosaic masonry (khảm sành sứ)
const PLINTH = hex('#888379');
const TRIM = hex('#e0dcd0');
const FRAME = hex('#2c66a8'); // rich cobalt ceramic band round each arch
const WHITE = hex('#f2eee4'); // crisp porcelain white band inside it
const REVEAL = hex('#daa942'); // warm ochre-yellow plaster in the passages
const DOOR = hex('#9a2c22'); // red-lacquered door leaves
const PANEL = hex('#3a7a68'); // turquoise-jade porcelain mosaic fields on the piers
const DARK = hex('#1f1a18');
const TOWER = hex('#b2b0a6');
const ROOF = hex('#c9943c');
const RIDGE = hex('#f1d77a');
const MOSAIC = [hex('#2d72b5'), hex('#3d9a72'), hex('#f2eee2'), hex('#c8452f'), hex('#e5b43c')];
const GLAZE = hex('#3d8f6e'); // vivid jade-green glazed openwork tiles in the balustrades
const GOLD = hex('#e0b64e');

export function build({ S }) {
  const Y = LAND_Y, keep = S.kind;
  // every box gets its underside: the cornice, frieze, caps and bands all overhang what they stand on, and an open
  // bottom let a visitor looking up see through the overhang to the tower behind (thin dark slits under the cornice)
  const box = (s, t, y0, y1, ss, st, col, opts?) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, { bottom: true, ...opts }); };

  // ---- the plinth and the block, with the three passages driven through it -----------------------------------
  S.kind = KIND.MASONRY;
  box(0, 0, Y - 0.5, Y + 0.35, L + 0.3, D + 0.4, PLINTH, { top: shade(PAL.stone, 0.9), topKind: KIND.ROAD });
  const sorted = OPEN.slice().sort((a, b) => a.s - b.s);
  let from = -L / 2;
  for (const o of [...sorted, { s: L / 2, w: 0 }]) { // solid piers between the passages
    const to = o.s - o.w / 2;
    box((from + to) / 2, 0, Y + 0.35, Y + HB, to - from, D, BODY, { top: TOWER });
    from = o.s + o.w / 2;
  }
  for (const o of OPEN) archPassage(S, o, Y, Y + HB, D);
  // cornice and the balustrade round the block's flat top
  S.kind = KIND.MASONRY;
  box(0, 0, Y + HB, Y + HB + 0.3, L + 0.3, D + 0.3, TRIM, { top: shade(PAL.stone, 0.95), topKind: KIND.ROAD });
  box(0, 0, Y + HB - 0.45, Y + HB, L + 0.12, D + 0.12, shade(BODY, 0.92)); // frieze band
  const yb = Y + HB + 0.3;
  const outer = rectRing(C[0], C[1], L + 0.1, D + 0.1, A), inner = rectRing(C[0], C[1], L - 0.5, D - 0.5, A);
  S.kind = KIND.PLAIN;
  S.prism(outer, yb, yb + 0.3, TRIM, TRIM, { holes: [inner.slice().reverse()] });
  const mid = rectRing(C[0], C[1], L - 0.05, D - 0.05, A), midIn = rectRing(C[0], C[1], L - 0.35, D - 0.35, A);
  S.prism(mid, yb + 0.3, yb + 0.68, GLAZE, GLAZE, { holes: [midIn.slice().reverse()] });
  S.prism(outer, yb + 0.68, yb + 0.82, TRIM, TRIM, { holes: [inner.slice().reverse()] });
  for (let k = 0; k <= 10; k++) for (const sg of [-1, 1]) { // balustrade posts
    box(-L / 2 + 0.15 + ((L - 0.3) * k) / 10, sg * (D / 2 - 0.15), yb + 0.3, yb + 0.95, 0.3, 0.3, TRIM);
  }
  for (let k = 1; k < 5; k++) for (const sg of [-1, 1]) box(sg * (L / 2 - 0.15), -D / 2 + 0.15 + ((D - 0.3) * k) / 5, yb + 0.3, yb + 0.95, 0.3, 0.3, TRIM);

  // cornice crests: a small scrolled finial over each pier on both faces and a taller one at each corner
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    for (const s of [-6.45, -2.45, 2.45, 6.45]) {
      box(s, dt * (D / 2 - 0.1), yb + 0.82, yb + 1.1, 0.5, 0.2, TRIM);
      box(s, dt * (D / 2 - 0.1), yb + 1.1, yb + 1.4, 0.2, 0.14, MOSAIC[4]);
    }
    for (const sg of [-1, 1]) {
      box(sg * (L / 2 - 0.2), dt * (D / 2 - 0.2), yb + 0.82, yb + 1.3, 0.34, 0.34, TRIM);
      box(sg * (L / 2 - 0.2), dt * (D / 2 - 0.2), yb + 1.3, yb + 1.75, 0.2, 0.2, GLAZE);
    }
  }

  // ---- mosaic pilasters on both faces, and on the ends where the Imperial City wall comes in -----------------
  const pil = (s, t, y0, y1, w, dt) => { // dt: the face's outward sign along t (0 for an end face: then s is the face)
    const along = dt !== 0;
    const ps = along ? s : s + Math.sign(s) * 0.08, pt = along ? t + dt * 0.08 : t;
    S.kind = KIND.PLAIN;
    box(ps, pt, y0, y1, along ? w : 0.16, along ? 0.16 : w, TRIM);
    box(along ? ps : ps + Math.sign(s) * 0.05, along ? pt + dt * 0.05 : pt, y0 + 0.5, y1 - 0.45, along ? w * 0.5 : 0.08, along ? 0.08 : w * 0.5, MOSAIC[Math.abs(Math.round(s * 3 + t)) % 2]);
    for (let k = 0; k < 3; k++) { // little coloured medallions up the shaft
      const yy = y0 + 0.9 + ((y1 - y0 - 1.8) * k) / 2;
      box(along ? ps : ps + Math.sign(s) * 0.09, along ? pt + dt * 0.09 : pt, yy, yy + 0.32, along ? w * 0.36 : 0.06, along ? 0.06 : w * 0.36, MOSAIC[(k + 2) % MOSAIC.length]);
    }
    box(ps, pt, y1 - 0.3, y1, along ? w + 0.2 : 0.26, along ? 0.26 : w + 0.2, shade(TRIM, 0.95)); // capital
  };
  // the piers on both faces: a tall pedestal with a blue mosaic panel, and above it a framed relief panel
  const pier = (s, dt, w?) => {
    const t = (dt * D) / 2;
    S.kind = KIND.PLAIN;
    box(s, t + dt * 0.18, Y + 0.35, Y + 1.65, w + 0.3, 0.36, TRIM);
    box(s, t + dt * 0.37, Y + 0.35, Y + 0.6, w + 0.36, 0.06, shade(TRIM, 0.85)); // Greek-key base band
    box(s, t + dt * 0.37, Y + 0.85, Y + 1.35, w * 0.7, 0.04, MOSAIC[0]);
    box(s, t + dt * 0.18, Y + 1.65, Y + 1.85, w + 0.36, 0.4, shade(TRIM, 0.95));
    box(s, t + dt * 0.07, Y + 1.85, Y + HB - 0.55, w, 0.14, TRIM);
    box(s, t + dt * 0.15, Y + 2.0, Y + HB - 0.7, w - 0.3, 0.04, PANEL);
    box(s, t + dt * 0.17, Y + 2.5, Y + HB - 1.2, (w - 0.3) * 0.5, 0.03, hex('#a89f8c')); // the relief, pale on the dark field
  };
  for (const dt of [-1, 1]) for (const [s, w] of ([[-6.45, 0.95], [-2.45, 0.95], [2.45, 0.95], [6.45, 0.95]] as any[])) pier(s, dt, w);
  for (const sg of [-1, 1]) for (const t of [-2.9, 2.9]) pil((sg * L) / 2, t, Y + 0.35, Y + HB, 0.7, 0);

  // ---- name plaque over the middle passage, both faces: dark field, three gilt characters -------------------
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    const t = (dt * D) / 2;
    box(0, t + dt * 0.08, Y + 4.12, Y + 4.72, 2.3, 0.14, TRIM);
    box(0, t + dt * 0.14, Y + 4.2, Y + 4.64, 2.0, 0.06, hex('#2d3b45'));
    for (const k of [-1, 0, 1]) box(k * 0.6, t + dt * 0.18, Y + 4.27, Y + 4.57, 0.32, 0.04, GOLD);
  }

  // ---- the tower, lower storey: masonry hall, three arches on each long face, one on each end ------------------
  const y1 = Y + HB + 0.3;
  S.kind = KIND.MASONRY;
  box(0, 0, y1, y1 + 0.3, UP1.w + 0.6, UP1.d + 0.6, shade(PAL.stone, 0.92), { topKind: KIND.ROAD }); // its plinth
  const y1f = y1 + 0.3;
  box(0, 0, y1f, y1f + UP1.h, UP1.w, UP1.d, TOWER, { top: shade(ROOF, 0.8) });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    for (const [s, w, h] of ([[0, 1.6, 2.3], [-4.4, 1.2, 1.95], [4.4, 1.2, 1.95]] as any[])) archPanel(S, s, (dt * UP1.d) / 2, dt, true, y1f, w, h);
    for (const s of [-5.25, -2.3, 2.3, 5.25]) pil(s, (dt * UP1.d) / 2, y1f, y1f + UP1.h, 0.4, dt);
  }
  for (const sg of [-1, 1]) archPanel(S, (sg * UP1.w) / 2, 0, sg, false, y1f, 1.1, 1.9);
  // a band of mosaic under the eave
  box(0, 0, y1f + UP1.h - 0.4, y1f + UP1.h - 0.1, UP1.w + 0.1, UP1.d + 0.1, MOSAIC[0]);
  const yr1 = y1f + UP1.h;
  S.kind = KIND.TIMBER;
  S.hip(C[0], C[1], UP1.w, UP1.d, A, yr1, 1.35, ROOF, { flare: 0.45, over: 1.0, fascia: 0.28, fasciaCol: shade(ROOF, 0.6), ridgeCol: RIDGE, hips: true, glazed: true, segs: 3 });

  // ---- the upper storey and its roof, with dragons and the fire pearl on the ridge -----------------------------
  const y2 = yr1 + 0.65;
  S.kind = KIND.MASONRY;
  box(0, 0, yr1 + 0.3, y2 + UP2.h, UP2.w, UP2.d, TOWER, { top: shade(ROOF, 0.8) });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    for (const [s, w, h] of ([[0, 0.9, 1.3], [-2.2, 0.7, 1.1], [2.2, 0.7, 1.1]] as any[])) archPanel(S, s, (dt * UP2.d) / 2, dt, true, y2 + 0.15, w, h);
    for (const s of [-3.15, 3.15]) pil(s, (dt * UP2.d) / 2, y2 - 0.3, y2 + UP2.h, 0.3, dt);
  }
  box(0, 0, y2 + UP2.h - 0.3, y2 + UP2.h - 0.05, UP2.w + 0.08, UP2.d + 0.08, MOSAIC[1]);
  const yr2 = y2 + UP2.h, rh2 = 1.75;
  S.kind = KIND.TIMBER;
  S.hip(C[0], C[1], UP2.w, UP2.d, A, yr2, rh2, ROOF, { flare: 0.45, over: 0.95, fascia: 0.26, fasciaCol: shade(ROOF, 0.6), ridgeCol: RIDGE, hips: true, glazed: true, segs: 3 });
  // ridge ornament: the ridge runs ±rl along s; "lưỡng long chầu nhật" (two dragons facing a fire pearl)
  const rl = Math.max(0, (UP2.w + 1.9) / 2 - ((UP2.d + 1.9) / 2) * 0.92);
  const yt = yr2 + rh2 + 0.25;
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) { // each dragon a short sinuous chain of green-glazed segments, head toward the middle
    const pts = [[rl * 0.95, 0.05], [rl * 0.75, 0.45], [rl * 0.55, 0.15], [rl * 0.35, 0.55], [rl * 0.18, 0.35]];
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = V(sg * pts[k][0], 0, yt + pts[k][1]), b = V(sg * pts[k + 1][0], 0, yt + pts[k + 1][1]);
      S.beam(a, b, 0.2, 0.2, k === pts.length - 2 ? MOSAIC[4] : GLAZE);
    }
    const tail = V(sg * rl * 0.95, 0, yt + 0.05), tip = V(sg * (rl * 0.95 + 0.25), 0, yt + 0.55);
    S.beam(tail, tip, 0.12, 0.12, GLAZE);
  }
  const pc = P(0, 0);
  S.cyl(pc[0], pc[1], yt - 0.1, yt + 0.25, 0.12, 0.2, 6, MOSAIC[4], { cap: false });
  S.cyl(pc[0], pc[1], yt + 0.25, yt + 0.6, 0.22, 0.2, 8, hex('#d8573a')); // the pearl
  S.cyl(pc[0], pc[1], yt + 0.6, yt + 1.05, 0.14, 0.02, 5, hex('#e8a23a')); // its flame
  S.kind = keep;
}

// An arched passage of opening o through a block from t = -depth/2 to +depth/2: the masonry over the crown, the
// spandrels between arch and crown on both faces, a dark barrel vault and lining, a paved floor, and a proud
// stone surround on each mouth.
function archPassage(S, o, y0, y1, depth) {
  const r = o.w / 2, fl = y0 + 0.35, crown = y0 + o.h, spring = crown - r, K = 8;
  const box = (s, t, a, b, ss, st, col, opts?) => { const p = P(s, t); S.box(p[0], p[1], a, b, ss, st, A, col, { bottom: true, ...opts }); };
  S.kind = KIND.MASONRY;
  box(o.s, 0, crown, y1, o.w + 0.02, depth, BODY, { top: TOWER });
  const arc = (k) => { const th = Math.PI - (Math.PI * k) / K; return [o.s + r * Math.cos(th), spring + r * Math.sin(th)]; };
  for (const dt of [-1, 1]) { // spandrels
    const t = (dt * depth) / 2;
    for (let k = 0; k < K; k++) {
      const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
      S.quad(V(sa, t, ya), V(sb, t, yb), V(sb, t, crown), V(sa, t, crown), BODY, N(0, dt));
    }
  }
  S.kind = KIND.PLAIN;
  const tin = depth / 2 - 0.01; // the yellow reveal runs right out to the face, as in the photo
  for (let k = 0; k < K; k++) { // vault
    const [sa, ya] = arc(k), [sb, yb] = arc(k + 1);
    S.quad(V(sa, -depth / 2 + 0.01, ya), V(sb, -depth / 2 + 0.01, yb), V(sb, depth / 2 - 0.01, yb), V(sa, depth / 2 - 0.01, ya), shade(REVEAL, 0.62), N(o.s - (sa + sb) / 2, 0, spring - (ya + yb) / 2));
  }
  // the doors hang about a metre in from the outer face; each leaf stands open against its reveal, as tall as the
  // vault allows there (its top follows the curve, so the leaf reaches above the springing without cutting the vault)
  const hinge = depth / 2 - 1.0, off = 0.1, lw = 0.08;
  const ds = r - off, ytop = spring + Math.sqrt(Math.max(0, r * r - ds * ds)) - 0.04;
  for (const sg of [-1, 1]) { // yellow lining on the pier faces inside
    const s = o.s + sg * (r - 0.02);
    S.quad(V(s, -tin, fl), V(s, tin, fl), V(s, tin, spring), V(s, -tin, spring), REVEAL, N(-sg, 0));
    const p = P(o.s + sg * (r - off - lw / 2), hinge - r / 2);
    S.box(p[0], p[1], fl, ytop, lw, r, A, DOOR, { bottom: true });
    const q = P(o.s + sg * (r - 0.06), hinge + 0.06); // the timber post of the door frame, against the reveal
    S.box(q[0], q[1], fl, spring, 0.1, 0.12, A, shade(DOOR, 0.7));
  }
  S.kind = KIND.ROAD;
  S.quad(V(o.s - r, -depth / 2 - 0.2, fl + 0.01), V(o.s + r, -depth / 2 - 0.2, fl + 0.01), V(o.s + r, depth / 2 + 0.2, fl + 0.01), V(o.s - r, depth / 2 + 0.2, fl + 0.01), shade(PAL.stone, 0.7), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  // the surround: jambs and an arched band standing 0.12 proud
  for (const dt of [-1, 1]) {
    const t = (dt * depth) / 2 + dt * 0.06;
    for (const sg of [-1, 1]) box(o.s + sg * (r + 0.18), t, fl, spring, 0.36, 0.12, FRAME);
    for (let k = 0; k < K; k++) {
      const th0 = Math.PI - (Math.PI * k) / K, th1 = Math.PI - (Math.PI * (k + 1)) / K, R2 = r + 0.18;
      S.beam(V(o.s + R2 * Math.cos(th0), t, spring + R2 * Math.sin(th0)), V(o.s + R2 * Math.cos(th1), t, spring + R2 * Math.sin(th1)), 0.12, 0.36, FRAME);
    }
    for (let k = 0; k < K; k++) { // the white band inside the blue one
      const th0 = Math.PI - (Math.PI * k) / K, th1 = Math.PI - (Math.PI * (k + 1)) / K, R1 = r + 0.03;
      S.beam(V(o.s + R1 * Math.cos(th0), t + dt * 0.03, spring + R1 * Math.sin(th0)), V(o.s + R1 * Math.cos(th1), t + dt * 0.03, spring + R1 * Math.sin(th1)), 0.1, 0.1, WHITE);
    }
    for (const sg of [-1, 1]) box(o.s + sg * (r + 0.03), t + dt * 0.03, fl, spring, 0.1, 0.1, WHITE);
    // keystone in mosaic
    box(o.s, t + dt * 0.04, crown + 0.02, crown + 0.42, 0.36, 0.12, MOSAIC[3]);
  }
}

// A blind or glazed arched opening drawn flat on a face: a dark rectangle up to the spring and a half-disc above,
// inside a light frame. along: the face is at constant t (the opening is centred at s); otherwise at constant s.
function archPanel(S, s, t, sg, along, y0, w, h) {
  const r = w / 2, spring = y0 + h - r, K = 7;
  const at = (u, y, d) => (along ? V(s + u, t + sg * d, y) : V(s + sg * d, t + u, y));
  const n = along ? N(0, sg) : N(sg, 0);
  for (const [rr, d, col] of ([[r + 0.15, 0.03, FRAME], [r, 0.05, DARK]] as any[])) {
    S.quad(at(-rr, y0, d), at(rr, y0, d), at(rr, spring, d), at(-rr, spring, d), col, n);
    for (let k = 0; k < K; k++) {
      const a0 = Math.PI - (Math.PI * k) / K, a1 = Math.PI - (Math.PI * (k + 1)) / K;
      S.tri(at(0, spring, d), at(rr * Math.cos(a0), spring + rr * Math.sin(a0), d), at(rr * Math.cos(a1), spring + rr * Math.sin(a1), d), col, n);
    }
  }
}
