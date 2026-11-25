// Where a bridge way and a street meet end to end, each takes a point of the other just past the joint (r.ends, see
// ribbonPoints), so the deck's end and the street's end are cut on one line: no wedge of bare ground opens on the
// outside of the bend and nothing overlaps on the inside. The partner is the most nearly straight-on of the ways of
// the other kind (bridge / street) that end there; a bridge's own street ends (head) count as street.
const JOINT_ANG = Math.cos((50 * Math.PI) / 180);
export function bridgeJoints(roads) {
  const key = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);
  const at = new Map();
  for (const r of roads) {
    if (r.c > 3 || r.pts.length < 2) continue;
    for (const e of [0, 1]) {
      const k = key(e ? r.pts[r.pts.length - 1] : r.pts[0]);
      if (!at.has(k)) at.set(k, []);
      at.get(k).push([r, e]);
    }
  }
  // the first point of r at least 0.5 m from its end e, and the unit heading from that end into r
  const inward = (r, e) => {
    const p = e ? r.pts[r.pts.length - 1] : r.pts[0];
    for (let i = 1; i < r.pts.length; i++) {
      const q = r.pts[e ? r.pts.length - 1 - i : i], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d >= 0.5 || i === r.pts.length - 1) return { q, dx: (q[0] - p[0]) / (d || 1), dz: (q[1] - p[1]) / (d || 1) };
    }
  };
  const kind = (r) => (r.bridge || r.head ? 1 : 0);
  for (const list of at.values()) {
    for (const [r, e] of list) {
      if (r.cut?.[e]) continue;
      const own = inward(r, e);
      let best = null, bestDot = JOINT_ANG;
      for (const [q, f] of list) {
        if (q === r || kind(q) === kind(r) || q.cut?.[f]) continue;
        const o = inward(q, f), dot = -(own.dx * o.dx + own.dz * o.dz); // 1: straight on
        if (dot > bestDot) { bestDot = dot; best = o.q; }
      }
      if (best) { r.ends = r.ends || [null, null]; r.ends[e] = best; }
    }
  }
}

// The same for a hand-modelled deck (landmarks/places): its end is a straight line square to the deck, given as
// { p, u (outward), hw, reach }. A street that starts within reach beyond it, inside its width, is cut on that line.
export function handDeckJoints(roads, decks) {
  for (const D of decks) for (const r of roads) {
    if (r.bridge || r.c > 3) continue;
    for (const e of [0, 1]) {
      const P = e ? r.pts[r.pts.length - 1] : r.pts[0], dx = P[0] - D.p[0], dz = P[1] - D.p[1];
      const s = dx * D.u[0] + dz * D.u[1], t = -dx * D.u[1] + dz * D.u[0];
      if (Math.abs(t) > D.hw || s < -1 || s > D.reach) continue;
      r.ends = r.ends || [null, null];
      r.ends[e] = { dir: D.u, line: D }; // tangent along the deck: the cut runs across it
    }
  }
}
