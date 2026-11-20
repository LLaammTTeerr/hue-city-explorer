import * as THREE from 'three';
import { LAND_Y } from '../config.js';
import { rise } from '../geo/terrain.js';
import { onEra, existsIn } from '../era.js';

// HTML labels pinned to places. Nearer views reveal more of them, and overlapping labels yield to the more important one.
export function createLabels(root, data, camera, onPick) {
  const TIER_DIST = { 1: 9000, 2: 3000, 3: 1500, 4: 750 };
  // Lesser places also wait for the camera to come down: the opening view (250-430 m up) and the overview show only
  // the landmarks of tiers 1-2; the framed views of single places (mostly 30-150 m up) bring the rest in.
  const TIER_CEIL = { 3: 210, 4: 160 };
  const STEM = 14; // .label-place > span sits this far above its anchor (style.css), stem included
  const items = [];
  const v = new THREE.Vector3();

  const add = (p, water = false) => {
    const el = document.createElement(water ? 'div' : 'button');
    el.className = 'label ' + (water ? 'label-water' : 'label-place t' + p.t);
    el.innerHTML = water ? `<span>${p.n}</span>` : `<i></i><span>${p.n}</span>`;
    if (!water) {
      el.type = 'button';
      el.addEventListener('click', (e) => { e.stopPropagation(); onPick(p.id); });
    }
    root.appendChild(el);
    items.push({ p, el, water, pos: new THREE.Vector3(p.x / 10, water ? 1 : LAND_Y + rise(p.x / 10, p.z / 10) + (p.h || 10), p.z / 10), w: 0, h: 0, shown: false, pri: (water ? 3.5 : p.t) });
  };
  data.places.forEach((p) => add(p));
  data.waterLabels.forEach((p) => add(p, true));
  items.sort((a, b) => a.pri - b.pri);
  // places not yet built in the current period are skipped; gate:* and water labels always exist
  const checkExists = () => { for (const it of items) it.exists = it.water || existsIn(it.p.id); };
  checkExists();
  onEra(checkExists);

  let enabled = true, dim = false, frame = 0, blocked = [];
  const visited = new Set();
  let measured = false;

  function measure() {
    for (const it of items) { const span = it.el.querySelector('span'); it.w = span.offsetWidth; it.h = span.offsetHeight + (it.water ? 0 : STEM - 2); }
    measured = true;
  }

  return {
    setEnabled(on) { enabled = on; root.classList.toggle('off', !on); },
    setDim(on) { dim = on; root.classList.toggle('dim', on); },
    markVisited(id) { visited.add(id); const it = items.find((i) => i.p.id === id); if (it) it.el.classList.add('seen'); },
    remeasure() { measured = false; },
    get visited() { return visited; },
    update(width, height) {
      if (!measured) measure();
      // keep labels out from under the interface: its panels count as already-placed boxes
      if (frame++ % 30 === 0) {
        blocked = [];
        for (const sel of ['#places', '#brand', '#era', '#tools', '#nav', '#actions', '#card', '#ride-hud']) {
          const el = document.querySelector(sel);
          if (!el || el.hidden) continue;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) blocked.push({ l: r.left - 6, r: r.right + 6, t: r.top - 4, b: r.bottom + 4 });
        }
      }
      const placed = blocked.slice();
      for (const it of items) {
        let show = enabled && !dim && it.exists;
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
          for (const q of placed) if (x - hw < q.r && x + hw > q.l && top < q.b && bottom > q.t) { show = false; break; }
          if (show) placed.push({ l: x - hw, r: x + hw, t: top, b: bottom });
        }
        if (show) it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        if (show !== it.shown) { it.shown = show; it.el.classList.toggle('show', show); }
      }
    },
  };
}
