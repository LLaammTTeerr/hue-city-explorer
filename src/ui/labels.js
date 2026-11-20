import * as THREE from 'three';
import { LAND_Y } from '../config.js';
import { rise } from '../geo/terrain.js';

// HTML labels pinned to places. Nearer views reveal more of them, and overlapping labels yield to the more important one.
// Highest point of the built model above each place, so a tag sits just over the roof, spire or flagpole it names
// instead of at a hand-typed height. Places with nothing standing on them (water, islands, streets, areas) get none.
function modelTops(scene, places) {
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

export function createLabels(root, data, camera, onPick, scene) {
  const TIER_DIST = { 1: 9000, 2: 3000, 3: 1500, 4: 750 };
  // Lesser places also wait for the camera to come down: the opening view (250-430 m up) and the overview show only
  // the landmarks of tiers 1-2; the framed views of single places (mostly 30-150 m up) bring the rest in.
  const TIER_CEIL = { 3: 210, 4: 160 };
  const STEM = 14; // .label-place > span sits this far above its anchor (style.css), stem included
  const items = [];
  const v = new THREE.Vector3();

  const CLEAR = 3; // a tag's anchor floats this far above the model
  const tops = scene ? modelTops(scene, data.places) : [];
  const anchorY = (p, i) => {
    const g = LAND_Y + rise(p.x / 10, p.z / 10);
    // open ground, water and whole districts keep the height given in the data
    return tops[i] > g + 2 ? tops[i] + CLEAR : g + (p.h || 10);
  };
  const add = (p, water = false, i = -1) => {
    const el = document.createElement(water ? 'div' : 'button');
    el.className = 'label ' + (water ? 'label-water' : 'label-place t' + p.t);
    el.innerHTML = water ? `<span>${p.n}</span>` : `<i></i><span>${p.n}</span>`;
    if (!water) {
      el.type = 'button';
      el.addEventListener('click', (e) => { e.stopPropagation(); onPick(p.id); });
    }
    root.appendChild(el);
    items.push({ p, el, water, pos: new THREE.Vector3(p.x / 10, water ? 1 : anchorY(p, i), p.z / 10), w: 0, h: 0, shown: false, pri: (water ? 3.5 : p.t) });
  };
  data.places.forEach((p, i) => add(p, false, i));
  data.waterLabels.forEach((p) => add(p, true));
  items.sort((a, b) => a.pri - b.pri);

  let enabled = true, frame = 0, blocked = [];
  const visited = new Set();
  let measured = false;

  function measure() {
    for (const it of items) { const span = it.el.querySelector('span'); it.w = span.offsetWidth; it.h = span.offsetHeight + (it.water ? 0 : STEM - 2); }
    measured = true;
  }

  return {
    setEnabled(on) { enabled = on; root.classList.toggle('off', !on); },
    markVisited(id) { visited.add(id); const it = items.find((i) => i.p.id === id); if (it) it.el.classList.add('seen'); },
    remeasure() { measured = false; },
    get visited() { return visited; },
    get anchors() { return items.filter((it) => !it.water).map((it) => [it.p.id, it.pos.y]); }, // for checks from the console
    update(width, height) {
      if (!measured) measure();
      // keep labels out from under the interface: its panels count as already-placed boxes
      if (frame++ % 30 === 0) {
        blocked = [];
        for (const sel of ['#places', '#search .bar', '#panel', '#tools', '#nav', '#actions', '#card']) {
          const el = document.querySelector(sel);
          if (!el || el.hidden) continue;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) blocked.push({ l: r.left - 6, r: r.right + 6, t: r.top - 4, b: r.bottom + 4 });
        }
      }
      const placed = blocked.slice();
      for (const it of items) {
        let show = enabled;
        let x = 0, y = 0;
        if (show) {
          const dist = camera.position.distanceTo(it.pos);
          show = dist < TIER_DIST[it.p.t] && dist > 40 && (it.water || !(camera.position.y - LAND_Y > TIER_CEIL[it.p.t]));
          if (show) {
            v.copy(it.pos).project(camera);
            show = v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
            x = (v.x * 0.5 + 0.5) * width; y = (-v.y * 0.5 + 0.5) * height;
          }
        }
        if (show) {
          const hw = it.w / 2 + 6, top = it.water ? y - it.h / 2 : y - it.h - 4, bottom = it.water ? y + it.h / 2 : y + 4;
          // a tag the window edge would cut is not drawn at all
          if (x - hw < 8 || x + hw > width - 8 || top < 8 || bottom > height - 8) show = false;
          else {
            for (const q of placed) if (x - hw < q.r && x + hw > q.l && top < q.b && bottom > q.t) { show = false; break; }
            if (show) placed.push({ l: x - hw, r: x + hw, t: top, b: bottom });
          }
        }
        if (show) it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        if (show !== it.shown) { it.shown = show; it.el.classList.toggle('show', show); }
      }
    },
  };
}
