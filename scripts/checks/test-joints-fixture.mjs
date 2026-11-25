// Fast fixture test for the bridge-to-street joining step (src/geo/joints.js): real road ends from the bundle
// (scripts/fixtures/joints-real.json) go through bridgeJoints / handDeckJoints, and each end's result must match the
// recorded one within 1 cm. No scene is built, so it runs in milliseconds; check:joints is the city-wide check.
// Run: npm run test:joints
import fs from 'node:fs';
import { bridgeJoints, handDeckJoints } from '../../src/geo/joints.js';

const fx = JSON.parse(fs.readFileSync(new URL('../fixtures/joints-real.json', import.meta.url)));
const TOL = 0.01; // m
const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= TOL;
let n = 0, bad = 0;
for (const J of fx.joints) {
  const roads = J.roads.map((r) => ({ c: r.c, bridge: r.bridge, ...(r.head ? { head: true } : {}), ...(r.cut ? { cut: r.cut } : {}), pts: r.pts }));
  bridgeJoints(roads);
  handDeckJoints(roads, J.decks);
  roads.forEach((r, i) => [0, 1].forEach((e) => {
    n++;
    const want = J.expect[i][e], got = r.ends?.[e] ?? null;
    let ok;
    if (!want || !got) ok = !want && !got;
    else if (want.line) ok = !!got.line && near(got.line.p, want.line.p) && near(got.dir, want.line.u) && near(got.line.u, want.line.u);
    else ok = Array.isArray(got) && near(got, want.toward);
    if (!ok) { bad++; console.error(`FAIL ${J.name}: road ${J.roads[i].id} end ${e}: want ${JSON.stringify(want)} got ${JSON.stringify(got)}`); }
  }));
}
console.log(`test-joints: ${fx.joints.length} joints, ${n} road ends, ${bad} off by more than 1 cm`);
process.exit(bad ? 1 : 0);
