import * as THREE from 'three';
import { LAND_Y } from '../config.js';
import { rise } from '../geo/terrain.js';

// HTML labels pinned to places. Nearer views reveal more of them, and overlapping labels yield to the more important one.
export function createLabels(root, data, camera, onPick) {
  const TIER_DIST = { 1: 9000, 2: 3000, 3: 1500, 4: 750 };
  // Lesser places also wait for the camera to come down: the opening view (250-430 m up) and the overview show only
  // the landmarks of tiers 1-2; the framed views of single places (mostly 30-150 m up) bring the rest in.
  const TIER_CEIL = { 3: 210, 4: 160 };
  const FADE = 0.2; // the last fifth of a tag's range (distance or height) fades it out
  const STEM = 14; // .label-place > span sits this far above its anchor (style.css), stem included
  const items = [];
  const v = new THREE.Vector3();

  const CLEAR = 3; // a tag's anchor floats this far above the model
  // `a` is the highest point of the built model over the place (roof, spire, flagpole, bridge bow), in decimetres,
  // found by the data build (scripts/build-label-tops.mjs), so a tag sits just over what it names. Open ground, water
  // and whole districts have none and keep the height given in the data.
  const anchorY = (p) => (p.a != null ? p.a / 10 + CLEAR : LAND_Y + rise(p.x / 10, p.z / 10) + (p.h || 10));
  const add = (p, water = false) => {
    const el = document.createElement(water ? 'div' : 'button');
    el.className = 'label ' + (water ? 'label-water' : 'label-place t' + p.t + (p.k === 'area' ? ' area' : ''));
    // built node by node: the names come from OSM, so none of them is ever parsed as markup
    if (!water) el.append(document.createElement('i'));
    const name = document.createElement('span'); name.textContent = p.n; el.append(name);
    el.setAttribute('aria-hidden', 'true'); // hidden until shown (with visibility, style.css), so off-screen tags are not tabbed through
    if (!water) {
      el.type = 'button';
      el.tabIndex = -1;
      el.addEventListener('click', (e) => { e.stopPropagation(); onPick(p.id); });
    }
    root.appendChild(el);
    const px = p.x / 10, pz = p.z / 10;
    items.push({ p, el, water, gy: water ? 0 : LAND_Y + rise(px, pz), pos: new THREE.Vector3(px, water ? 1 : anchorY(p), pz), w: 0, h: 0, shown: false, pri: (water ? 3.5 : p.t) });
  };
  data.places.forEach((p) => add(p));
  data.waterLabels.forEach((p) => add(p, true));
  items.sort((a, b) => a.pri - b.pri);

  let enabled = true, frame = 0, blocked = [], activeId = null;
  const visited = new Set();
  let measured = false;
  // widths taken with a fallback font are wrong once the web fonts (and their Vietnamese subsets) arrive
  if (document.fonts) { document.fonts.ready.then(() => { measured = false; }); document.fonts.addEventListener('loadingdone', () => { measured = false; }); }
  // the interface panels whose boxes labels keep clear of; the elements are fixed, only their boxes change
  const panels = ['#places', '#search .bar', '#panel', '#tools', '#nav', '#actions', '#card'].map((sel) => document.querySelector(sel)).filter(Boolean);

  function measure() {
    for (const it of items) { const span = it.el.querySelector('span'); it.w = span.offsetWidth; it.h = span.offsetHeight + (it.water ? 0 : STEM - 2); }
    measured = true;
  }

  return {
    setEnabled(on) { enabled = on; root.classList.toggle('off', !on); },
    setActive(id) { activeId = id || null; },
    invalidateLayout() { frame = 0; },
    markVisited(id) { visited.add(id); const it = items.find((i) => i.p.id === id); if (it) it.el.classList.add('seen'); },
    remeasure() { measured = false; },
    get visited() { return visited; },
    get anchors() { return items.filter((it) => !it.water).map((it) => [it.p.id, it.pos.y]); }, // for checks from the console
    update(width, height) {
      if (!measured) measure();
      // keep labels out from under the interface: its panels count as already-placed boxes
      if (frame++ % 30 === 0) {
        blocked = [];
        for (const el of panels) {
          if (el.hidden) continue;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) blocked.push({ l: r.left - 6, r: r.right + 6, t: r.top - 4, b: r.bottom + 4 });
        }
      }
      const placed = blocked.slice();
      // A tag already showing keeps its slot against newcomers of its own tier, and a newcomer needs a little more room
      // than a tag that is staying, so an orbit does not flip neighbouring tags on and off from frame to frame.
      const order = items.slice().sort((a, b) => (a.pri - (a.shown ? 0.75 : 0)) - (b.pri - (b.shown ? 0.75 : 0)));
      for (const it of order) {
        let show = enabled, fade = 1;
        let x = 0, y = 0, onScreen = false;
        if (show) {
          const dist = camera.position.distanceTo(it.pos);
          const isActive = !it.water && it.p.id === activeId;
          const far = TIER_DIST[it.p.t], ceil = isActive ? 0 : TIER_CEIL[it.p.t], hgt = camera.position.y - it.gy;
          show = dist < far && dist > 40 && (it.water || !ceil || !(hgt > ceil));
          // fade with distance (and, for lesser places, with height) instead of popping at the cut-off
          fade = Math.min(1, (far - dist) / (far * FADE), (dist - 40) / 20, it.water || !ceil ? 1 : (ceil - hgt) / (ceil * FADE));
          if (fade < 0.25) show = false;
          v.copy(it.pos).project(camera);
          onScreen = v.z < 1 && v.z > -1;
          x = (v.x * 0.5 + 0.5) * width; y = (-v.y * 0.5 + 0.5) * height;
          if (show) show = onScreen && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
        }
        if (show) {
          // a tag near the window edge slides off with its place (#labels clips it); only the interface panels and
          // other tags take it down
          const pad = it.shown ? 0 : 4;
          const hw = it.w / 2 + 6 + pad, top = (it.water ? y - it.h / 2 : y - it.h - 4) - pad, bottom = (it.water ? y + it.h / 2 : y + 4) + pad;
          for (const q of placed) if (x - hw < q.r && x + hw > q.l && top < q.b && bottom > q.t) { show = false; break; }
          if (show) placed.push({ l: x - hw + pad, r: x + hw - pad, t: top + pad, b: bottom - pad });
        }
        // Keep moving a tag with its place while it fades out, too: a tag frozen at its last screen point while the
        // city turns under it is the ghost the orbit used to leave behind.
        if (onScreen && (show || it.shown)) {
          const tx = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          if (it._tx !== tx) { it._tx = tx; it.el.style.transform = tx; }
        }
        if (show) {
          const fv = Math.max(0, fade).toFixed(2);
          if (it._fv !== fv) { it._fv = fv; it.el.style.setProperty('--fade', fv); }
        }
        if (show !== it.shown) {
          it.shown = show;
          it.el.classList.toggle('show', show);
          it.el.setAttribute('aria-hidden', !show);
          if (!it.water) it.el.tabIndex = show ? 0 : -1;
        }
      }
    },
  };
}
