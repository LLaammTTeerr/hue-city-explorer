import { KIND, hex, shade, type Buf } from '../geo/buf.ts';

// A masonry gate of the Imperial City's temple precincts (the small gates of Hưng Miếu and Thế Miếu): a round-arched
// passage through a block of brick and lime, yellow-washed piers with stucco relief panels either side of a red
// centre bay, and over it a stepped mock roof set with blue-and-white porcelain shards.
export const ARCH_COL = {
  wash: hex('#c9a552'), red: hex('#93402e'), panel: hex('#6d6a5c'), blue: hex('#3f5f8f'), white: hex('#d9dcd6'),
  cornice: hex('#5d6a78'), stone: hex('#9d968a'), dark: hex('#231a17'), door: hex('#7e2a1f'),
};

const ARCH_SEGMENTS = 9;
const PLINTH_H_M = 0.25;
const PLINTH_BELOW_M = 0.3;

interface GateHelpers {
  buf: Buf;
  toWorld2D: (u: number, v: number) => [number, number];
  toWorld3D: (u: number, v: number, y: number) => [number, number, number];
  toWorldNorm: (nu: number, nv: number, ny?: number) => [number, number, number];
  addBox: (u: number, v: number, y0: number, y1: number, su: number, sv: number, col: number[], opt?: any) => void;
  palette: { wash: number[]; red: number[]; panel: number[]; blue: number[]; white: number[]; cornice: number[]; stone: number[]; door: number[] };
}

function buildArchOpenings(ctx: GateHelpers, openings: [number, number, number, number][], baseY: number, plinthTopY: number, bodyH: number, depth: number, bayHalfW: number) {
  const { buf, toWorld3D, toWorldNorm, addBox, palette } = ctx;
  const halfD = depth / 2;
  for (const [centerU, radius, springH, crownH] of openings) {
    const isRedBay = Math.abs(centerU) < bayHalfW;
    const faceCol = isRedBay ? palette.red : palette.wash;
    buf.kind = KIND.MASONRY;
    addBox(centerU, 0, baseY + crownH, baseY + bodyH, 2 * radius + 0.002, depth, faceCol, { top: palette.cornice });

    const arcPoint = (step: number, rad = radius) => {
      const theta = Math.PI - (Math.PI * step) / ARCH_SEGMENTS;
      return [centerU + rad * Math.cos(theta), baseY + springH + rad * Math.sin(theta)];
    };

    for (const faceSign of [-1, 1]) {
      const v = faceSign * halfD;
      const normal = toWorldNorm(0, faceSign);
      for (let i = 0; i < ARCH_SEGMENTS; i++) {
        const [u0, y0] = arcPoint(i), [u1, y1] = arcPoint(i + 1);
        buf.quad(toWorld3D(u0, v, y0), toWorld3D(u1, v, y1), toWorld3D(u1, v, baseY + crownH), toWorld3D(u0, v, baseY + crownH), faceCol, normal);
      }
    }

    buf.kind = KIND.PLAIN;
    for (let i = 0; i < ARCH_SEGMENTS; i++) {
      const [u0, y0] = arcPoint(i), [u1, y1] = arcPoint(i + 1);
      buf.quad(
        toWorld3D(u0, -halfD + 0.01, y0), toWorld3D(u0, halfD - 0.01, y0),
        toWorld3D(u1, halfD - 0.01, y1), toWorld3D(u1, -halfD + 0.01, y1),
        shade(palette.red, 0.45), toWorldNorm(centerU - (u0 + u1) / 2, 0, -1),
      );
    }
    for (const side of [-1, 1]) addBox(centerU + side * (radius - 0.01), 0, plinthTopY, baseY + springH, 0.02, depth - 0.02, shade(palette.red, 0.55));
    buf.kind = KIND.ROAD;
    addBox(centerU, 0, baseY - PLINTH_BELOW_M, plinthTopY + 0.01, 2 * radius, depth + 0.02, shade(palette.stone, 0.8));

    buf.kind = KIND.PLAIN;
    for (const faceSign of [-1, 1]) {
      const trimV = faceSign * (halfD + 0.04);
      for (let i = 0; i < ARCH_SEGMENTS; i++) {
        const [u0, y0] = arcPoint(i, radius + 0.12), [u1, y1] = arcPoint(i + 1, radius + 0.12);
        buf.beam(toWorld3D(u0, trimV, y0), toWorld3D(u1, trimV, y1), 0.08, 0.22, shade(palette.red, 1.25));
      }
      for (const side of [-1, 1]) addBox(centerU + side * (radius + 0.12), trimV, plinthTopY, baseY + springH, 0.22, 0.08, shade(palette.red, 1.25));
      addBox(centerU, faceSign * (halfD + 0.5), baseY - PLINTH_BELOW_M, baseY + 0.12, 2 * radius + 0.8, 0.6, shade(palette.stone, 1.04), { topKind: KIND.ROAD });
    }
    if (radius > 0.6) {
      for (const side of [-1, 1]) addBox(centerU + side * (radius - 0.08), -halfD + 0.45 + radius * 0.45, plinthTopY, baseY + springH - 0.05, 0.08, radius * 0.9, palette.door);
    }
  }
}

function buildSteppedMockRoof(ctx: GateHelpers, startY: number, width: number, depth: number, tiers: number) {
  const { buf, toWorld2D, toWorld3D, addBox, palette } = ctx;
  const addCornice = (corniceW: number, corniceD: number, y0: number) => {
    buf.kind = KIND.TILE;
    addBox(0, 0, y0, y0 + 0.12, corniceW + 0.5, corniceD + 0.55, palette.white);
    addBox(0, 0, y0 + 0.12, y0 + 0.3, corniceW + 0.62, corniceD + 0.66, palette.cornice, { taper: 0.9, top: shade(palette.cornice, 0.8) });
    buf.kind = KIND.PLAIN;
    for (const su of [-1, 1]) {
      for (const sv of [-1, 1]) {
        const p0 = toWorld3D(su * (corniceW / 2 + 0.2), sv * (corniceD / 2 + 0.2), y0 + 0.3);
        const p1 = toWorld3D(su * (corniceW / 2 + 0.42), sv * (corniceD / 2 + 0.38), y0 + 0.62);
        buf.beam(p0, p1, 0.12, 0.14, shade(palette.blue, 1.1));
      }
    }
    return y0 + 0.3;
  };

  let curY = startY;
  let tierW = width;
  let tierD = depth;

  buf.kind = KIND.MASONRY;
  addBox(0, 0, curY, curY + 0.7, tierW + 0.1, tierD + 0.1, palette.wash, { top: palette.cornice });
  buf.kind = KIND.PLAIN;
  for (const faceSign of [-1, 1]) {
    const faceV = faceSign * (tierD / 2 + 0.05);
    const panelCount = Math.max(2, Math.round(tierW / 1.4));
    for (let i = 0; i < panelCount; i++) {
      addBox(-tierW / 2 + (tierW / panelCount) * (i + 0.5), faceV + faceSign * 0.03, curY + 0.12, curY + 0.58, tierW / panelCount - 0.25, 0.06, i % 2 ? palette.blue : palette.panel);
    }
    addBox(0, faceV + faceSign * 0.02, curY + 0.62, curY + 0.7, tierW + 0.1, 0.06, palette.white);
  }
  curY = addCornice(tierW, tierD, curY + 0.7);

  for (let tierIdx = 1; tierIdx < tiers; tierIdx++) {
    tierW *= tierIdx === 1 ? 0.7 : 0.62;
    tierD *= 0.82;
    const tierH = tierIdx === 1 ? 0.85 : 0.65;
    buf.kind = KIND.MASONRY;
    addBox(0, 0, curY, curY + tierH, tierW, tierD, palette.wash, { top: palette.cornice });
    buf.kind = KIND.PLAIN;
    for (const faceSign of [-1, 1]) {
      const faceV = (faceSign * tierD) / 2;
      const panelCount = Math.max(1, Math.round(tierW / 1.3));
      for (let i = 0; i < panelCount; i++) {
        addBox(-tierW / 2 + (tierW / panelCount) * (i + 0.5), faceV + faceSign * 0.03, curY + 0.12, curY + tierH - 0.12, tierW / panelCount - 0.22, 0.06, i % 2 ? palette.panel : palette.blue);
      }
      for (const side of [-1, 1]) addBox(side * (tierW / 2 - 0.06), faceV + faceSign * 0.02, curY, curY + tierH, 0.12, 0.06, palette.white);
    }
    for (const side of [-1, 1]) addBox(side * (tierW / 2 + 0.03), 0, curY + 0.12, curY + tierH - 0.12, 0.06, tierD - 0.3, palette.blue);
    curY = addCornice(tierW, tierD, curY + tierH);
  }

  buf.kind = KIND.TILE;
  addBox(0, 0, curY, curY + 0.32, tierW * 0.9, 0.36, palette.cornice, { taper: 0.8 });
  buf.kind = KIND.PLAIN;
  const centerPt = toWorld2D(0, 0);
  buf.cyl(centerPt[0], centerPt[1], curY + 0.3, curY + 0.75, 0.2, 0.08, 8, palette.white);
  buf.cyl(centerPt[0], centerPt[1], curY + 0.25, curY + 0.4, 0.26, 0.24, 8, palette.blue);
  for (const side of [-1, 1]) {
    buf.beam(toWorld3D(side * tierW * 0.45, 0, curY + 0.3), toWorld3D(side * tierW * 0.58, 0, curY + 0.7), 0.14, 0.16, shade(palette.blue, 1.1));
  }
  return curY + 0.75;
}

export function archGate(buf: Buf, { c, a, w, d, y, open = null, body = 3.5, tiers = 3, arches = 1, weather = 0.35 }: Record<string, any> = {}) {
  const fade = 1 - 0.3 * weather;
  const palette = {
    wash: shade(ARCH_COL.wash, fade),
    red: shade(ARCH_COL.red, fade),
    panel: shade(ARCH_COL.panel, fade),
    blue: shade(ARCH_COL.blue, fade),
    white: shade(ARCH_COL.white, 0.9 * fade),
    cornice: shade(ARCH_COL.cornice, fade),
    stone: ARCH_COL.stone,
    door: shade(ARCH_COL.door, fade),
  };
  const ux = Math.cos(a), uz = Math.sin(a);
  const toWorld2D = (u: number, v: number): [number, number] => [c[0] + u * ux - v * uz, c[1] + u * uz + v * ux];
  const toWorld3D = (u: number, v: number, yy: number): [number, number, number] => { const pt = toWorld2D(u, v); return [pt[0], yy, pt[1]]; };
  const toWorldNorm = (nu: number, nv: number, ny = 0): [number, number, number] => [nu * ux - nv * uz, ny, nu * uz + nv * ux];
  const addBox = (u: number, v: number, y0: number, y1: number, su: number, sv: number, col: number[], opt?: any) => {
    const pt = toWorld2D(u, v);
    buf.box(pt[0], pt[1], y0, y1, su, sv, a, col, opt);
  };
  const ctx: GateHelpers = { buf, toWorld2D, toWorld3D, toWorldNorm, addBox, palette };
  const prevKind = buf.kind, prevBase = buf.base;

  const openW = open ?? Math.min(2.0, 0.34 * w);
  const mainRadius = openW / 2;
  const mainSpring = Math.min(body - 1.2, 1.95);
  const mainCrown = mainSpring + mainRadius;
  const openings: [number, number, number, number][] = [[0, mainRadius, mainSpring, mainCrown]];
  if (arches === 3) {
    const sideRadius = mainRadius * 0.7;
    const sideU = w * 0.32;
    const sideSpring = mainSpring - 0.35;
    openings.push([-sideU, sideRadius, sideSpring, sideSpring + sideRadius], [sideU, sideRadius, sideSpring, sideSpring + sideRadius]);
  }
  const bayHalfW = mainRadius + 0.45;
  const plinthTopY = y + PLINTH_H_M;

  buf.kind = KIND.MASONRY;
  addBox(0, 0, y - PLINTH_BELOW_M, plinthTopY, w + 0.3, d + 0.3, palette.stone, { topKind: KIND.ROAD });
  const edges = [-w / 2];
  for (const [centerU, radius] of [...openings].sort((p, q) => p[0] - q[0])) edges.push(centerU - radius, centerU + radius);
  edges.push(w / 2);

  for (let i = 0; i < edges.length; i += 2) {
    const u0 = edges[i], u1 = edges[i + 1];
    if (u1 - u0 < 0.05) continue;
    const cuts = [u0, ...[-bayHalfW, bayHalfW].filter((val) => val > u0 && val < u1), u1];
    for (let j = 0; j + 1 < cuts.length; j++) {
      const midU = (cuts[j] + cuts[j + 1]) / 2;
      addBox(midU, 0, plinthTopY, y + body, cuts[j + 1] - cuts[j], d, Math.abs(midU) < bayHalfW ? palette.red : palette.wash, { top: palette.cornice });
    }
  }

  buildArchOpenings(ctx, openings, y, plinthTopY, body, d, bayHalfW);

  // relief panels on the faces of the piers, a name board over the centre arch
  buf.kind = KIND.PLAIN;
  const pierPanels: [number, number][] = [];
  for (let i = 0; i < edges.length; i += 2) {
    const u0 = Math.max(edges[i], -w / 2), u1 = edges[i + 1];
    const cuts = [u0, ...[-bayHalfW, bayHalfW].filter((val) => val > u0 && val < u1), u1];
    for (let j = 0; j + 1 < cuts.length; j++) {
      if (Math.abs((cuts[j] + cuts[j + 1]) / 2) >= bayHalfW && cuts[j + 1] - cuts[j] > 0.7) pierPanels.push([cuts[j], cuts[j + 1]]);
    }
  }
  const halfD = d / 2;
  for (const faceSign of [-1, 1]) {
    const faceV = faceSign * halfD;
    addBox(0, faceV, y - PLINTH_BELOW_M, y + 0.55, w + 0.06, 0.1, shade(palette.stone, 0.75));
    for (const [p0, p1] of pierPanels) {
      const midU = (p0 + p1) / 2;
      const panelW = p1 - p0 - 0.4;
      addBox(midU, faceV + faceSign * 0.03, y + 0.75, y + body - 0.45, panelW + 0.16, 0.08, shade(palette.wash, 1.1));
      addBox(midU, faceV + faceSign * 0.06, y + 0.85, y + body - 0.55, panelW, 0.06, palette.panel);
      addBox(midU, faceV + faceSign * 0.08, y + 1.4, y + body - 1.1, panelW * 0.55, 0.04, shade(palette.blue, 0.9));
    }
    addBox(0, faceV + faceSign * 0.05, y + mainCrown + 0.15, y + mainCrown + 0.6, Math.min(1.6, 2 * bayHalfW - 0.3), 0.08, shade(palette.wash, 1.15));
    addBox(0, faceV + faceSign * 0.08, y + mainCrown + 0.22, y + mainCrown + 0.53, Math.min(1.3, 2 * bayHalfW - 0.5), 0.06, palette.panel);
  }

  const topY = buildSteppedMockRoof(ctx, y + body, w, d, tiers);
  buf.kind = prevKind;
  buf.base = prevBase;
  return topY;
}
