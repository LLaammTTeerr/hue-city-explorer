// Label anchor heights, computed at data build time (scripts/build-label-tops.mjs) and shipped as `a` on each place in
// public/data/places.json, so the browser no longer walks the scene geometry at startup to find them.
//
// modelTops: the highest point of the built model above each place, so a tag sits just over the roof, spire or
// flagpole it names instead of at a hand-typed height. Places with nothing standing on them (water, islands, streets,
// areas) get -Infinity. Self-contained (THREE passed in) so check-label-tops.mjs can also run it inside the browser
// on the live scene, through Function.prototype.toString.
export function modelTops(scene, places, THREE) {
  // Two readings, the higher wins: the model's surface straight above the place's point (a long hall has no vertex
  // near its middle, but its ridge passes over it), and any vertex within the place's radius (spires, flagpoles).
  const CELL = 64, grid = new Map(), key = (cx, cz) => (cx + 2048) * 4096 + (cz + 2048);
  const list = places.map((p) => ({ x: p.x / 10, z: p.z / 10, r2: (p.r || 14) ** 2, top: -Infinity }));
  for (const q of list) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const k = key(Math.floor(q.x / CELL) + a, Math.floor(q.z / CELL) + b);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(q);
  }
  const v = new THREE.Vector3();
  scene.traverse((o) => {
    // the merged city and landmark meshes, plus the landmarks' own static parts (bridge bows, light strips), which
    // are flagged as landmark parts; boats, traffic and trees are left out.
    if (!o.isMesh || o.isInstancedMesh || (o.name !== 'buildings' && o.name !== 'structures' && !o.userData.landmark)) return;
    const pos = o.geometry.attributes.position, n = pos.count, P = new Float32Array(n * 3);
    o.updateWorldMatrix(true, false);
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z;
      const cell = grid.get(key(Math.floor(v.x / CELL), Math.floor(v.z / CELL)));
      if (cell) for (const q of cell) if (v.y > q.top && (v.x - q.x) ** 2 + (v.z - q.z) ** 2 < q.r2) q.top = v.y;
    }
    const idx = o.geometry.index, tn = (idx ? idx.count : n) / 3;
    for (let t = 0; t < tn; t++) {
      const a = (idx ? idx.getX(t * 3) : t * 3) * 3, b = (idx ? idx.getX(t * 3 + 1) : t * 3 + 1) * 3, c = (idx ? idx.getX(t * 3 + 2) : t * 3 + 2) * 3;
      const ax = P[a], az = P[a + 2], bx = P[b], bz = P[b + 2], cx = P[c], cz = P[c + 2];
      const x0 = Math.min(ax, bx, cx), x1 = Math.max(ax, bx, cx), z0 = Math.min(az, bz, cz), z1 = Math.max(az, bz, cz);
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-6) continue; // a wall, seen from above
      for (let gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx++) for (let gz = Math.floor(z0 / CELL); gz <= Math.floor(z1 / CELL); gz++) {
        const cell = grid.get(key(gx, gz));
        if (!cell) continue;
        for (const q of cell) {
          if (q.x < x0 || q.x > x1 || q.z < z0 || q.z > z1) continue;
          const l1 = ((bz - cz) * (q.x - cx) + (cx - bx) * (q.z - cz)) / det, l2 = ((cz - az) * (q.x - cx) + (ax - cx) * (q.z - cz)) / det, l3 = 1 - l1 - l2;
          if (l1 < 0 || l2 < 0 || l3 < 0) continue;
          const y = l1 * P[a + 1] + l2 * P[b + 1] + l3 * P[c + 1];
          if (y > q.top) q.top = y;
        }
      }
    }
  });
  return list.map((q) => q.top);
}
