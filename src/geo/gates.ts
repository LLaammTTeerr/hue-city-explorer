// Where a gate's passage runs: through the wall, along whichever axis of its footprint points at the centre it
// guards. Shared by the gate models (src/landmarks/citadel.js) and by the walls that must open for them (city.js).
export function gateAxis(g, centre) {
  const cx = g.c[0] / 10, cz = g.c[1] / 10, w = g.w / 10, d = g.d / 10, a = g.a / 1000;
  const ux = Math.cos(a), uz = Math.sin(a);
  let rx = cx - centre[0], rz = cz - centre[1];
  const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  const alongLong = Math.abs(rx * ux + rz * uz) > 0.707;
  const pa = alongLong ? a : a + Math.PI / 2; // passage direction
  return { cx, cz, w, d, a, pa, px: Math.cos(pa), pz: Math.sin(pa), plen: alongLong ? w : d, pwid: alongLong ? d : w };
}

// corners of a w × d rectangle turned by a (w runs along the angle)
export const rectRing = (cx, cz, w, d, a) => {
  const ux = Math.cos(a), uz = Math.sin(a);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [cx + (ux * i * w) / 2 - (uz * j * d) / 2, cz + (uz * i * w) / 2 + (ux * j * d) / 2]);
};

export { inRing } from './buf.ts';

// The Citadel gates' passage: how wide the slot through the rampart is, and the opening inside it
export const CITADEL_PASSAGE = { w: 4.2, h: 5.4, slot: 5.6 };
