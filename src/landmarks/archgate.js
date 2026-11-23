import { KIND, hex, shade } from '../geo/buf.js';

// A masonry gate of the Imperial City's temple precincts (the small gates of Hưng Miếu and Thế Miếu): a round-arched
// passage through a block of brick and lime, yellow-washed piers with stucco relief panels either side of a red
// centre bay, and over it a stepped mock roof (two or three diminishing tiers of panels under projecting tiled
// cornices) set with blue-and-white porcelain shards, dragon finials curling up off the cornice ends and a ridge
// ornament on top: about twice the height of the wall it stands in. Built from photographs (Street View photospheres
// in the Thế Miếu / Hưng Miếu precinct); the proportions are estimates.
//
// archGate(S, { c: [x, z], a, w, d, y, ... }) stands one, centred at c on ground y, w along the wall (the wall's angle
// a), d through it. Options:
//   open    width of the arched opening (default min(2.0, 0.34 w))
//   body    height of the gate block (default 3.5)
//   tiers   mock-roof tiers above the block (default 3)
//   arches  1 or 3 openings (3: a taller centre arch and two lower side arches, the block wider)
//   weather 0..1, how far the wash has gone dark (default 0.35)
export const ARCH_COL = {
  wash: hex('#c9a552'), red: hex('#93402e'), panel: hex('#6d6a5c'), blue: hex('#3f5f8f'), white: hex('#d9dcd6'),
  cornice: hex('#5d6a78'), stone: hex('#9d968a'), dark: hex('#231a17'), door: hex('#7e2a1f'),
};

export function archGate(S, { c, a, w, d, y, open = null, body = 3.5, tiers = 3, arches = 1, weather = 0.35 } = {}) {
  const C = ARCH_COL, k = 1 - 0.3 * weather;
  const WASH = shade(C.wash, k), RED = shade(C.red, k), PANEL = shade(C.panel, k), BLUE = shade(C.blue, k);
  const WHITE = shade(C.white, 0.9 * k), CORN = shade(C.cornice, k), STONE = C.stone;
  const ux = Math.cos(a), uz = Math.sin(a);
  const P = (u, v) => [c[0] + u * ux - v * uz, c[1] + u * uz + v * ux];
  const V = (u, v, yy) => { const p = P(u, v); return [p[0], yy, p[1]]; };
  const N = (nu, nv, ny = 0) => [nu * ux - nv * uz, ny, nu * uz + nv * ux];
  const box = (u, v, y0, y1, su, sv, col, o) => { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, a, col, o); };
  const keepKind = S.kind, keepBase = S.base; // the caller sets S.base for the gate's ground

  const hd = d / 2, ow = open ?? Math.min(2.0, 0.34 * w);
  // the openings: [centre u, half width, spring, crown]
  const ops = [];
  const r0 = ow / 2, spring0 = Math.min(body - 1.2, 1.95), crown0 = spring0 + r0;
  ops.push([0, r0, spring0, crown0]);
  if (arches === 3) {
    const rs = r0 * 0.7, us = w * 0.32, sp = spring0 - 0.35;
    ops.push([-us, rs, sp, sp + rs], [us, rs, sp, sp + rs]);
  }
  const bay = r0 + 0.45; // half width of the red bay round the centre arch
  const K = 9;

  // ---- the block: solid stretches between the openings, the lintel band over each, spandrels on both faces ----
  S.kind = KIND.MASONRY;
  box(0, 0, y - 0.3, y + 0.25, w + 0.3, d + 0.3, STONE, { topKind: KIND.ROAD }); // plinth
  const yb = y + 0.25;
  const edges = [-w / 2];
  for (const [u, r] of [...ops].sort((p, q) => p[0] - q[0])) edges.push(u - r, u + r);
  edges.push(w / 2);
  for (let i = 0; i < edges.length; i += 2) {
    const u0 = edges[i], u1 = edges[i + 1];
    if (u1 - u0 < 0.05) continue;
    // split each solid stretch into the yellow pier and the red bay where it meets the centre arch
    const cuts = [u0, ...[-bay, bay].filter((q) => q > u0 && q < u1), u1];
    for (let j = 0; j + 1 < cuts.length; j++) {
      const p0 = cuts[j], p1 = cuts[j + 1], m = (p0 + p1) / 2, red = Math.abs(m) < bay;
      box(m, 0, yb, y + body, p1 - p0, d, red ? RED : WASH, { top: CORN });
    }
  }
  for (const [u, r, sp, cr] of ops) {
    const red = Math.abs(u) < bay;
    box(u, 0, y + cr, y + body, 2 * r + 0.002, d, red ? RED : WASH, { top: CORN });
    const arc = (i, rr = r) => { const th = Math.PI - (Math.PI * i) / K; return [u + rr * Math.cos(th), y + sp + rr * Math.sin(th)]; };
    for (const sg of [-1, 1]) {
      const v = sg * hd, n = N(0, sg);
      for (let i = 0; i < K; i++) {
        const [sa, ya] = arc(i), [sb, yc] = arc(i + 1);
        S.quad(V(sa, v, ya), V(sb, v, yc), V(sb, v, y + cr), V(sa, v, y + cr), red ? RED : WASH, n);
      }
    }
    // the vault and the passage's floor, dark inside
    S.kind = KIND.PLAIN;
    for (let i = 0; i < K; i++) {
      const [sa, ya] = arc(i), [sb, yc] = arc(i + 1);
      S.quad(V(sa, -hd + 0.01, ya), V(sa, hd - 0.01, ya), V(sb, hd - 0.01, yc), V(sb, -hd + 0.01, yc), shade(RED, 0.45), N(u - (sa + sb) / 2, 0, -1));
    }
    for (const sg of [-1, 1]) box(u + sg * (r - 0.01), 0, yb, y + sp, 0.02, d - 0.02, shade(RED, 0.55));
    S.kind = KIND.ROAD;
    box(u, 0, y - 0.3, yb + 0.01, 2 * r, d + 0.02, shade(STONE, 0.8));
    S.kind = KIND.PLAIN;
    // the moulded band round each arch, on both faces
    for (const sg of [-1, 1]) {
      const t = sg * (hd + 0.04);
      for (let i = 0; i < K; i++) {
        const [sa, ya] = arc(i, r + 0.12), [sb, yc] = arc(i + 1, r + 0.12);
        S.beam(V(sa, t, ya), V(sb, t, yc), 0.08, 0.22, shade(RED, 1.25));
      }
      for (const s of [-1, 1]) box(u + s * (r + 0.12), t, yb, y + sp, 0.22, 0.08, shade(RED, 1.25));
      box(u, sg * (hd + 0.5), y - 0.3, y + 0.12, 2 * r + 0.8, 0.6, shade(STONE, 1.04), { topKind: KIND.ROAD }); // a step
    }
    // the red door leaves, swung back against the passage sides
    if (r > 0.6) for (const s of [-1, 1]) box(u + s * (r - 0.08), -hd + 0.45 + r * 0.45, yb, y + sp - 0.05, 0.08, r * 0.9, shade(C.door, k));
  }

  // ---- relief panels on the faces of the piers, a name board over the centre arch ----
  S.kind = KIND.PLAIN;
  const pierPanels = [];
  for (let i = 0; i < edges.length; i += 2) {
    const u0 = Math.max(edges[i], -w / 2), u1 = edges[i + 1];
    const cuts = [u0, ...[-bay, bay].filter((q) => q > u0 && q < u1), u1];
    for (let j = 0; j + 1 < cuts.length; j++) if (Math.abs((cuts[j] + cuts[j + 1]) / 2) >= bay && cuts[j + 1] - cuts[j] > 0.7) pierPanels.push([cuts[j], cuts[j + 1]]);
  }
  for (const sg of [-1, 1]) {
    const t = sg * hd;
    box(0, t, y - 0.3, y + 0.55, w + 0.06, 0.1, shade(STONE, 0.75)); // damp foot
    for (const [p0, p1] of pierPanels) {
      const m = (p0 + p1) / 2, pw = p1 - p0 - 0.4;
      box(m, t + sg * 0.03, y + 0.75, y + body - 0.45, pw + 0.16, 0.08, shade(WASH, 1.1));
      box(m, t + sg * 0.06, y + 0.85, y + body - 0.55, pw, 0.06, PANEL);
      box(m, t + sg * 0.08, y + 1.4, y + body - 1.1, pw * 0.55, 0.04, shade(BLUE, 0.9));
    }
    box(0, t + sg * 0.05, y + crown0 + 0.15, y + crown0 + 0.6, Math.min(1.6, 2 * bay - 0.3), 0.08, shade(WASH, 1.15));
    box(0, t + sg * 0.08, y + crown0 + 0.22, y + crown0 + 0.53, Math.min(1.3, 2 * bay - 0.5), 0.06, PANEL);
  }

  // ---- the stepped mock roof: frieze, cornice, then diminishing panelled tiers ----
  let yy = y + body, tw = w, td = d;
  const cornice = (cw, cd, y0) => {
    S.kind = KIND.TILE;
    box(0, 0, y0, y0 + 0.12, cw + 0.5, cd + 0.55, WHITE);
    box(0, 0, y0 + 0.12, y0 + 0.3, cw + 0.62, cd + 0.66, CORN, { taper: 0.9, top: shade(CORN, 0.8) });
    // dragon finials curling up off the four corners
    S.kind = KIND.PLAIN;
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      const p0 = V(su * (cw / 2 + 0.2), sv * (cd / 2 + 0.2), y0 + 0.3), p1 = V(su * (cw / 2 + 0.42), sv * (cd / 2 + 0.38), y0 + 0.62);
      S.beam(p0, p1, 0.12, 0.14, shade(BLUE, 1.1));
    }
    return y0 + 0.3;
  };
  S.kind = KIND.MASONRY;
  // the frieze over the block: a band of panels, blue-and-white edges
  box(0, 0, yy, yy + 0.7, tw + 0.1, td + 0.1, WASH, { top: CORN });
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    const t = sg * (td / 2 + 0.05), n = Math.max(2, Math.round(tw / 1.4));
    for (let i = 0; i < n; i++) box(-tw / 2 + (tw / n) * (i + 0.5), t + sg * 0.03, yy + 0.12, yy + 0.58, tw / n - 0.25, 0.06, i % 2 ? BLUE : PANEL);
    box(0, t + sg * 0.02, yy + 0.62, yy + 0.7, tw + 0.1, 0.06, WHITE);
  }
  yy = cornice(tw, td, yy + 0.7);
  for (let tr = 1; tr < tiers; tr++) {
    tw *= tr === 1 ? 0.7 : 0.62; td *= 0.82;
    const th = tr === 1 ? 0.85 : 0.65;
    S.kind = KIND.MASONRY;
    box(0, 0, yy, yy + th, tw, td, WASH, { top: CORN });
    S.kind = KIND.PLAIN;
    for (const sg of [-1, 1]) {
      const t = sg * td / 2, n = Math.max(1, Math.round(tw / 1.3));
      for (let i = 0; i < n; i++) box(-tw / 2 + (tw / n) * (i + 0.5), t + sg * 0.03, yy + 0.12, yy + th - 0.12, tw / n - 0.22, 0.06, i % 2 ? PANEL : BLUE);
      for (const s of [-1, 1]) box(s * (tw / 2 - 0.06), t + sg * 0.02, yy, yy + th, 0.12, 0.06, WHITE); // mosaic edging
    }
    for (const s of [-1, 1]) box(s * (tw / 2 + 0.03), 0, yy + 0.12, yy + th - 0.12, 0.06, td - 0.3, BLUE);
    yy = cornice(tw, td, yy + th);
  }
  // the ridge: a short tiled crest with a gourd ornament in the middle
  S.kind = KIND.TILE;
  box(0, 0, yy, yy + 0.32, tw * 0.9, 0.36, CORN, { taper: 0.8 });
  S.kind = KIND.PLAIN;
  { const q = P(0, 0); S.cyl(q[0], q[1], yy + 0.3, yy + 0.75, 0.2, 0.08, 8, WHITE); S.cyl(q[0], q[1], yy + 0.25, yy + 0.4, 0.26, 0.24, 8, BLUE); }
  for (const s of [-1, 1]) S.beam(V(s * tw * 0.45, 0, yy + 0.3), V(s * tw * 0.58, 0, yy + 0.7), 0.14, 0.16, shade(BLUE, 1.1));

  S.kind = keepKind;
  S.base = keepBase;
  return yy + 0.75;
}
