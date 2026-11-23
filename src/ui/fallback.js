import { STR } from './content.js';

// When the scene cannot start. Two cases:
//  - no WebGL (the renderer could not get a context): the loader turns into a recovery screen with "Retry 3D", which
//    tries the renderer again in place, and "Browse places", a flat 2D map with the search box and the cards working
//    as usual. Neither needs hue.json: the map and the place list come from the small place index (data/places.json).
//  - anything else that breaks the start (a failed download, an exception while building): the same screen, where
//    "Retry" reloads the page.
// Both texts are shown in both languages: the language switch is still behind the loader at that point.

const $ = (id) => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';

export function createFallback({ ui = null, index = null, tryRenderer = null, onPick = null } = {}) {
  const lang = () => (ui ? ui.lang : (navigator.language || 'vi').slice(0, 2) === 'vi' ? 'vi' : 'en');
  let flat = false, map = null, resolveRenderer = null, bar = null, mode = 'gl';

  // ---------- recovery screen (in the loader) ----------
  function label(btn, key) {
    const l = lang(), o = l === 'vi' ? 'en' : 'vi';
    btn.textContent = '';
    const a = document.createElement('span'); a.textContent = STR[l][key];
    const b = document.createElement('small'); b.textContent = STR[o][key]; b.lang = o;
    btn.append(a, b);
  }
  function screen(gl) {
    mode = gl ? 'gl' : 'load';
    const l = lang(), o = l === 'vi' ? 'en' : 'vi', A = STR[l], B = STR[o];
    const [tk, bk] = gl ? ['noGlTitle', 'noGlBody'] : ['loadFailTitle', 'loadFailBody'];
    $('loader').classList.remove('done');
    $('loader').classList.add('failed');
    $('loader-text').hidden = true;
    $('loader-bar').parentElement.hidden = true;
    $('fail-title').textContent = A[tk];
    $('fail-body').textContent = index ? A[bk] : A[bk].split(/(?<=\.)\s/)[0]; // without the index there is no 2D map to offer
    const alt = $('fail-alt');
    alt.textContent = `${B[tk]}. ${index ? B[bk] : B[bk].split(/(?<=\.)\s/)[0]}`;
    alt.lang = o;
    label($('btn-retry'), 'retry3d');
    label($('btn-browse'), 'browse2d');
    $('btn-browse').hidden = !index;
    $('fail-status').textContent = '';
    $('fail').hidden = false;
    $('btn-retry').onclick = gl ? retry : () => location.reload();
    $('btn-browse').onclick = enterFlat;
    $('btn-retry').focus({ preventScroll: true });
  }
  function hideScreen() {
    $('fail').hidden = true;
    $('loader').classList.remove('failed');
    $('loader-text').hidden = false;
    $('loader-bar').parentElement.hidden = false;
  }

  // one more try at the renderer; on success the start carries on where it stopped
  function retry() {
    const r = tryRenderer && tryRenderer();
    if (!r) {
      const l = lang(), o = l === 'vi' ? 'en' : 'vi';
      const msg = `${STR[l].stillNoGl} · ${STR[o].stillNoGl}`;
      if (flat) ui.hint(STR[l].stillNoGl, 4200);
      else { $('fail-status').textContent = ''; requestAnimationFrame(() => { $('fail-status').textContent = msg; }); }
      return;
    }
    leaveFlat(true); // an open card stays: the 3D view flies to it once the city is in
    hideScreen();
    if (ui) ui.lock();
    const done = resolveRenderer; resolveRenderer = null;
    if (done) done(r);
  }

  // ---------- 2D browse mode ----------
  function enterFlat() {
    if (flat || !index) return;
    flat = true;
    if (!map) map = buildMap();
    if (!bar) bar = buildBar();
    document.body.classList.add('flat');
    map.svg.removeAttribute('hidden'); bar.hidden = false; // SVG elements have no .hidden property
    map.fit();
    map.svg.setAttribute('aria-label', STR[lang()].map2d);
    hideScreen();
    ui.loaderDone();
    ui.applyText();
  }
  function leaveFlat(keepCard) {
    if (!flat) return;
    flat = false;
    document.body.classList.remove('flat');
    map.svg.setAttribute('hidden', ''); bar.hidden = true;
    if (!keepCard) ui.hideCard();
  }
  addEventListener('keydown', (e) => { if (flat && e.key === 'Escape' && !$('about').open) ui.hideCard(); });

  function buildBar() {
    const el = document.createElement('div');
    el.id = 'flat-bar';
    el.hidden = true;
    const note = document.createElement('span'); note.dataset.t = 'flatNote';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'tog';
    const t = document.createElement('span'); t.dataset.t = 'retry3d';
    btn.append(t);
    btn.addEventListener('click', () => (mode === 'gl' ? retry() : location.reload()));
    el.append(note, btn);
    $('actions').after(el);
    return el;
  }

  // A plan of the place points over the land (water is the background), north up, in metres.
  function buildMap() {
    const svg = document.createElementNS(SVG, 'svg');
    svg.id = 'map2d';
    svg.setAttribute('role', 'img');
    svg.setAttribute('hidden', '');
    const ring = (r) => { let d = ''; for (let i = 0; i < r.length; i += 2) d += (i ? 'L' : 'M') + r[i] + ' ' + r[i + 1]; return d + 'Z'; };
    const path = (polys, cls) => {
      const p = document.createElementNS(SVG, 'path');
      p.setAttribute('d', polys.map((poly) => poly.map(ring).join('')).join(''));
      p.setAttribute('class', cls);
      svg.append(p);
      return p;
    };
    const m = index.map || {};
    path(m.land || [], 'land');
    path(m.wall || [], 'wall');
    const water = document.createElementNS(SVG, 'g');
    for (const w of index.waterLabels || []) {
      const t = document.createElementNS(SVG, 'text');
      t.setAttribute('class', 'water t' + w.t);
      t.textContent = w.n;
      t.dataset.x = w.x / 10; t.dataset.z = w.z / 10;
      water.append(t);
    }
    svg.append(water);
    const pts = [];
    const layer = document.createElementNS(SVG, 'g');
    // biggest tier last, so the main landmarks draw over the minor ones
    for (const p of [...index.places].sort((a, b) => b.t - a.t)) {
      const g = document.createElementNS(SVG, 'g');
      g.setAttribute('class', `pt t${p.t} k-${p.k}`);
      const c = document.createElementNS(SVG, 'circle');
      const t = document.createElementNS(SVG, 'text');
      t.textContent = p.n;
      const ti = document.createElementNS(SVG, 'title'); ti.textContent = p.n;
      g.append(ti, c, t);
      g.addEventListener('click', (e) => { if (!moved) { e.stopPropagation(); onPick && onPick(p.id); } });
      layer.append(g);
      pts.push({ p, g, c, t, x: p.x / 10, z: p.z / 10 });
    }
    svg.append(layer);
    svg.addEventListener('click', () => { if (!moved && ui.cardId) ui.hideCard(); });
    document.getElementById('labels').before(svg);

    // ---- view: centre (cx, cz) in metres and metres per pixel ----
    let cx = 0, cz = 0, upp = 10, selected = null;
    function apply() {
      const W = svg.clientWidth || innerWidth, H = svg.clientHeight || innerHeight;
      svg.setAttribute('viewBox', `${cx - (W / 2) * upp} ${cz - (H / 2) * upp} ${W * upp} ${H * upp}`);
      for (const q of pts) {
        const big = q.p.t === 1, on = q.p.id === selected;
        q.c.setAttribute('cx', q.x); q.c.setAttribute('cy', q.z);
        q.c.setAttribute('r', (on ? 7 : big ? 5 : q.p.t === 2 ? 4 : 3) * upp);
        q.c.setAttribute('stroke-width', 1.5 * upp);
        // names appear as the map comes closer: the main landmarks first
        const show = on || q.p.t === 1 || (q.p.t === 2 && upp < 9) || upp < 3.5;
        q.t.style.display = show ? '' : 'none';
        q.t.setAttribute('x', q.x + 9 * upp); q.t.setAttribute('y', q.z + 4 * upp);
        q.t.setAttribute('font-size', (big || on ? 13 : 11.5) * upp);
        q.t.setAttribute('stroke-width', 3 * upp);
        q.g.classList.toggle('on', on);
      }
      for (const t of water.children) {
        t.setAttribute('x', t.dataset.x); t.setAttribute('y', t.dataset.z);
        t.setAttribute('font-size', 13 * upp);
        t.style.display = t.classList.contains('t1') || upp < 6 ? '' : 'none';
      }
      svg.querySelector('.wall').setAttribute('stroke-width', 1.6 * upp);
    }
    function fit() {
      const xs = pts.map((q) => q.x), zs = pts.map((q) => q.z);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
      cx = (x0 + x1) / 2; cz = (z0 + z1) / 2;
      const W = svg.clientWidth || innerWidth, H = svg.clientHeight || innerHeight;
      upp = Math.max((x1 - x0) / Math.max(100, W - 80), (z1 - z0) / Math.max(100, H - 200));
      apply();
    }
    function focusOn(id) {
      const q = pts.find((r) => r.p.id === id);
      selected = id;
      if (q) {
        upp = Math.min(upp, 2.2);
        // keep the point clear of the card: on a wide window the card is on the left, on a phone at the bottom
        const W = svg.clientWidth || innerWidth, H = svg.clientHeight || innerHeight;
        const dx = W > 720 ? Math.min(220, W / 4) : 0, dz = W > 720 ? 0 : -H / 5;
        cx = q.x - dx * upp; cz = q.z - dz * upp;
      }
      apply();
    }
    // ---- pan and zoom: drag, wheel, two-finger pinch ----
    const ptrs = new Map();
    let moved = false, pinch = 0;
    svg.addEventListener('pointerdown', (e) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) moved = false;
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    svg.addEventListener('pointermove', (e) => {
      const last = ptrs.get(e.pointerId);
      if (!last) return;
      if (ptrs.size === 1) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        if (!moved) svg.setPointerCapture(e.pointerId);
        moved = true;
        cx -= dx * upp; cz -= dy * upp;
      }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        moved = true;
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && d > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch / d);
        pinch = d;
        return;
      }
      apply();
    });
    const lift = (e) => { ptrs.delete(e.pointerId); pinch = 0; };
    svg.addEventListener('pointerup', lift);
    svg.addEventListener('pointercancel', lift);
    function zoomAt(px, py, k) {
      const r = svg.getBoundingClientRect();
      const mx = cx + (px - r.left - r.width / 2) * upp, mz = cz + (py - r.top - r.height / 2) * upp;
      const nu = Math.max(0.4, Math.min(40, upp * k));
      cx = mx + (cx - mx) * (nu / upp); cz = mz + (cz - mz) * (nu / upp);
      upp = nu;
      apply();
    }
    svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * (e.deltaMode ? 0.05 : 0.0015))); }, { passive: false });
    addEventListener('resize', () => { if (flat) apply(); });
    return { svg, fit, focusOn, select(id) { selected = id; apply(); }, zoom: (k) => zoomAt(innerWidth / 2, innerHeight / 2, k) };
  }

  return {
    get flat() { return flat; },
    // no WebGL: show the recovery screen; resolves with a renderer once "Retry 3D" gets one
    recover() { return new Promise((res) => { resolveRenderer = res; screen(true); }); },
    // the start failed for another reason: the recovery screen, with a reload
    fail() { leaveFlat(); screen(false); },
    show(id) { if (flat) map.focusOn(id); },
    home() { if (flat) { map.select(null); map.fit(); } },
    zoom(k) { if (flat) map.zoom(k); },
    relabel() { if (map) map.svg.setAttribute('aria-label', STR[lang()].map2d); }, // after a language change
  };
}
