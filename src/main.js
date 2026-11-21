import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import './ui/style.css';

import * as THREE from 'three';
import { LAND_Y, quality } from './config.js';
import { buildCity, populate, finishStructures, updateDetail } from './geo/city.js';
import { buildTruongTien } from './landmarks/truongtien.js';
import { buildCitadel, buildMarket, buildThienMu } from './landmarks/citadel.js';
import { buildBoats, buildLanterns } from './landmarks/boats.js';
import { buildNguyenHoang, buildQuocHocGate } from './landmarks/more.js';
import { buildCivic } from './landmarks/civic.js';
import { buildSouth } from './landmarks/south.js';
import { buildTombs } from './landmarks/tombs.js';
import { buildBiaQuocHoc } from './landmarks/memorial.js';
import { buildBoardwalk } from './landmarks/boardwalk.js';
import { buildRiverLights } from './landmarks/riverlights.js';
import { shared } from './geo/materials.js';
import { buildLotus, buildTraffic, buildStreetLife } from './landmarks/life.js';
import { buildSky } from './env/sky.js';
import { buildWater } from './env/water.js';
import { buildRain } from './env/rain.js';
import { createMood } from './env/mood.js';
import { createPost } from './env/post.js';
import { createIBL } from './env/ibl.js';
import { createCascades } from './env/csm.js';
import { createCamera, fromForm } from './camera/controls.js';
import { createLabels } from './ui/labels.js';
import { createUI } from './ui/ui.js';
import { VIEWS } from './ui/content.js';
import { rise } from './geo/terrain.js';
import { buildFloatingRestaurants } from './landmarks/floating.js';
import { buildPlaces } from './landmarks/places/index.js';

const canvas = document.getElementById('scene');
// yield to the event loop between build steps (a message task is not throttled in background tabs, unlike rAF and timers)
const frame = () => new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });

async function main() {
  const t0 = performance.now();
  const res = await fetch(`${import.meta.env.BASE_URL}data/hue.json`);
  const data = await res.json();

  let rig, mood, labels;
  const ui = createUI(data, {
    pick: (id, fly, from) => pick(id, fly, from),
    overview: () => { ui.hideCard(); const v = overviewView(); rig.flyTo(v.pos, v.target, { duration: 3 }); },
    lang: () => labels && labels.remeasure(),
    labels: () => toggleLabels(),
    osmOnly: (on) => { world.infill.forEach((m) => { m.visible = !on; }); },
    home: () => { rig.goHome(); ui.hideCard(); },
    zoom: (k) => rig.zoomBy(k),
    cardClosed: () => {},
    rain: () => mood.setRain(!mood.state.rainTarget),
    time: (i) => mood.setTime(i),
    look: () => setLook(!look, true),
  });
  ui.loaderProgress(0.15);
  await frame();

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  // the post-processing targets are multisampled float buffers, so cap total pixels on big hi-dpi windows; the cap stops
  // at 1, but the adaptive fallback (adapt) may still take quality.pixelRatio below 1 on a slow 1x screen
  const fitRatio = () => (quality.low ? quality.pixelRatio : Math.min(quality.pixelRatio, Math.max(1, Math.sqrt(3.0e6 / (innerWidth * innerHeight)))));
  renderer.setPixelRatio(fitRatio());
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();

  // ---------- world ----------
  const world = buildCity(data);
  ui.loaderProgress(0.55);
  await frame();
  const dynamic = new THREE.Group();
  const S = world.structures;
  const bridge = buildTruongTien(data, S, dynamic);
  const citadel = buildCitadel(data, S, dynamic);
  buildMarket(data, S, dynamic);
  buildThienMu(data, S, dynamic);
  const extraGlows = buildNguyenHoang(data, S, dynamic);
  buildQuocHocGate(data, S);
  buildCivic(data, world.structures);
  buildBiaQuocHoc(data, world.structures);
  buildBoardwalk(data, world.structures, dynamic);
  buildRiverLights(data, world.structures, dynamic); // lamps along the Hương's banks and walkways (issue #21)
  const floating = buildFloatingRestaurants(data, world.structures, dynamic); // nhà hàng nổi Sông Hương, the lotus by Trường Tiền
  buildSouth(data, world.structures);
  buildTombs(data, world.structures);
  const replicas = buildPlaces(data, S, dynamic); // per-place replica models in src/landmarks/places/
  populate(world, data); // buildings, houses and trees, kept off the ground the landmark models cover
  finishStructures(world.structures, world.group);
  const boats = buildBoats(data, dynamic);
  const lanterns = buildLanterns(data, dynamic); // hoa đăng drifting past the Citadel after dark
  buildLotus(data, dynamic);
  const traffic = buildTraffic(data, dynamic);
  const street = buildStreetLife(data, dynamic);
  scene.add(world.group, dynamic);
  const lanternGlows = []; // lanternGlows: glow points that landmarks flagged for the per-frame update
  dynamic.traverse((o) => { if (o.userData.glow) lanternGlows.push(o); });
  ui.loaderProgress(0.8);
  await frame();

  const sky = buildSky();
  const water = buildWater(data);
  const rain = buildRain();
  scene.add(sky.mesh, water.mesh, water.ponds, rain.mesh);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x887766, 1);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
  sun.shadow.radius = 2.4;
  scene.add(hemi, sun, sun.target);
  const shadows = createCascades(scene, sun, { tight: !quality.low }); // after the sun, so the sun stays light 0
  const ibl = quality.low ? null : createIBL(renderer, scene);

  mood = createMood({ scene, renderer, sun, hemi, sky, water, rain, ibl });
  mood.onChange((s) => ui.setMood({ rain: s.rainTarget, time: s.timeTarget }));
  ui.setMood({ rain: mood.state.rainTarget, time: mood.state.timeTarget });

  // ---------- camera ----------
  const b = data.meta.bounds.map((v) => v / 10);
  rig = createCamera(canvas, { minX: b[0] + 250, minZ: b[1] + 250, maxX: b[2] - 250, maxZ: b[3] - 250 });
  const { camera, controls } = rig;
  camera.layers.enable(1); // layer 1: things kept out of the water reflection
  const post = quality.low ? null : createPost(renderer, scene, camera);
  const draw = () => (post ? post.render() : renderer.render(scene, camera));

  // Opening frame: from above the river below the bridge, looking up-stream into the afternoon light.
  // Trường Tiền crosses the foreground, chợ Đông Ba sits at its right-hand end, the Citadel wall and Kỳ Đài run off behind.
  const c = bridge.centre, d = bridge.dir;
  const upR = [-d[1], d[0]];
  function homeView() {
    // narrower windows step back and up so the whole bridge and the market still share the frame
    const t = Math.max(0, Math.min(1, (1.62 / (innerWidth / innerHeight) - 1) / 2.5));
    const mixv = (a, b) => a + (b - a) * t;
    const back = mixv(790, 1300), side = mixv(140, 110), height = mixv(250, 430), ahead = mixv(90, 150), north = mixv(40, 55);
    const pos = new THREE.Vector3(c[0] - upR[0] * back - d[0] * side, height, c[1] - upR[1] * back - d[1] * side);
    const target = new THREE.Vector3(c[0] + upR[0] * ahead - d[0] * north, LAND_Y, c[1] + upR[1] * ahead - d[1] * north);
    return { pos, target };
  }
  // The whole slab from the south-east, the way one would stand over a model on a table.
  function overviewView() {
    const k = Math.pow(Math.max(1, 1.4 / (innerWidth / innerHeight)), 0.9);
    const cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2;
    return { pos: new THREE.Vector3(cx + 4000 * k, 3300 * k, cz + 5300 * k), target: new THREE.Vector3(cx, LAND_Y, cz) };
  }
  let hv = homeView();
  rig.setHome(hv.pos, hv.target);
  rig.jumpHome();


  // ---------- labels & picking ----------
  let labelsOn = true;
  labels = createLabels(document.getElementById('labels'), data, camera, (id) => pick(id, true), scene);
  function toggleLabels() { labelsOn = !labelsOn; labels.setEnabled(labelsOn); ui.setLabels(labelsOn); }

  function pick(id, fly, from) {
    const p = data.places.find((q) => q.id === id);
    if (!p) return;
    ui.showCard(id, from);
    labels.markVisited(id);
    if (fly) {
      const v = VIEWS[id] || VIEWS.default;
      const target = new THREE.Vector3(p.x / 10 + v.look[0], LAND_Y, p.z / 10 + v.look[1]);
      const k = (innerWidth / innerHeight < 1 ? 1.35 : 1) * 1.2;
      const gy = LAND_Y + rise(p.x / 10, p.z / 10);
      target.y = LAND_Y;
      rig.flyTo(new THREE.Vector3(p.x / 10 + v.off[0] * k, gy + v.off[1] * k, p.z / 10 + v.off[2] * k), target, { duration: 2.6 });
    }
  }

  // tap / click on the ground near a landmark reveals it.
  // Every pointer is tracked: a second finger neither ends the first one's drag nor counts as a tap.
  const downs = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    const multi = downs.size > 0;
    if (multi) downs.forEach((d) => { d.multi = true; });
    downs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, multi });
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    const down = downs.get(e.pointerId);
    if (!down) return;
    down.lx = e.clientX; down.ly = e.clientY;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.dragged = true; // a drag stays a drag even if it ends near its start
  });
  const up = (e) => {
    const down = downs.get(e.pointerId);
    downs.delete(e.pointerId);
    if (!downs.size) canvas.classList.remove('dragging');
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
    if (down.multi || down.dragged || moved > 6 || dt > 450 || e.type === 'pointercancel') return;
    const g = rig.groundAt(e.clientX, e.clientY);
    if (!g) return;
    let best = null, bd = Infinity;
    for (const p of data.places) {
      const dist = Math.hypot(p.x / 10 - g.x, p.z / 10 - g.z);
      const reach = p.k === 'area' ? 0 : p.k === 'island' ? 220 : p.k === 'bridge' ? 150 : 85;
      if (dist < reach && dist < bd) { bd = dist; best = p; }
    }
    if (best) pick(best.id, false);
    else if (ui.cardId) ui.hideCard();
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('dblclick', (e) => {
    const g = rig.groundAt(e.clientX, e.clientY);
    if (!g) return;
    const off = camera.position.clone().sub(controls.target).multiplyScalar(0.45);
    if (off.length() < 60) off.setLength(60);
    g.y = LAND_Y;
    rig.flyTo(g.clone().add(off), g, { duration: 1.1, arc: false });
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  addEventListener('keydown', (e) => {
    if (fromForm(e) || e.metaKey || e.ctrlKey || document.getElementById('about').open) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') ui.hideCard();
    else if (k === 'h' || k === 'home') { rig.goHome(); ui.hideCard(); }
    else if (k === 'r') mood.setRain(!mood.state.rainTarget);
    else if (k === 'n') mood.setTime((mood.state.timeTarget + 1) % 3);
    else if (k === 'l') toggleLabels();
    else if (k === 'v') setLook(!look, true);
    else if (k === '+' || k === '=') rig.zoomBy(0.65);
    else if (k === '-' || k === '_') rig.zoomBy(1.5);
  });

  rig.onInteract(() => ui.hideHint());

  // ---------- look ----------
  // two renderings of the same model: 1 illustrated (ink line and flat wash), the default, and 0 realistic.
  // `?look=real` / `?look=ink` choose one; otherwise the last one chosen is kept.
  let look = 1;
  const leafMats = new Set();
  world.group.traverse((o) => { if (o.material && o.material.defines && 'HUE_FOLIAGE' in o.material.defines) leafMats.add(o.material); });
  function setLook(v, remember = false) {
    look = v ? 1 : 0;
    if (remember) { try { localStorage.setItem('hue-look', look ? 'ink' : 'real'); } catch { /* private mode */ } }
    // drawn leaves carry a mask in the alpha channel (post.js), which alpha-to-coverage would read as holes
    for (const m of leafMats) { if (m.alphaToCoverage !== !look) { m.alphaToCoverage = !look; m.needsUpdate = true; } }
    shared.uLook.value = look;
    mood.state.look = look;
    document.body.dataset.look = look ? 'ink' : 'real';
    ui.setLook(look);
  }

  // ---------- resize ----------
  // Changing the canvas size clears its drawing buffer. Done after the frame's draw (from the adaptive fallback at the
  // end of tick, or from a resize callback queued behind tick in the same animation frame), the browser composites the
  // cleared, transparent canvas and the page background flashes through. So a size change is only ever requested
  // here and applied at the top of the next step(), before anything is drawn into the new buffer.
  let pendingSize = 0; // 1: the render resolution (adapt), 2: the window as well
  function resizeBuffers() {
    renderer.setPixelRatio(fitRatio());
    renderer.setSize(innerWidth, innerHeight, false);
    if (post) post.resize(); // each resize reallocates the multisampled post targets and the mirror's
    water.mesh.userData.resize(innerWidth, innerHeight);
  }
  function resize() {
    resizeBuffers();
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    labels.remeasure();
    hv = homeView();
    rig.setHome(hv.pos, hv.target);
    if (rig.opening && !rig.flying) rig.jumpHome(); // otherwise keep the current view or flight destination
  }
  addEventListener('resize', () => { pendingSize = 2; });

  // ---------- lost GPU context ----------
  // A driver reset or memory pressure can take the WebGL context away. three prevents the default (so the browser
  // may give it back) and rebuilds its own state when it returns; what the app keeps on the GPU between frames, the
  // sky's light probe and the shadow maps, is drawn again here. Meanwhile the loop runs on and three skips the draws.
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); console.warn('[hue] WebGL context lost'); });
  canvas.addEventListener('webglcontextrestored', () => {
    console.warn('[hue] WebGL context restored');
    if (ibl) ibl.invalidate();
    sun.shadow.needsUpdate = true;
    if (shadows.near) shadows.near.shadow.needsUpdate = true;
    pendingSize = Math.max(pendingSize, 1);
  });

  // ---------- frame loop ----------
  let last = performance.now();
  const focus = new THREE.Vector3();
  let time = 0;
  function updateShadow() {
    // keep the shadow map centred where the eye is resting, sized to the view
    const dist = camera.position.distanceTo(controls.target);
    focus.copy(controls.target);
    const ext = Math.max(260, Math.min(2600, dist * 0.8));
    shadows.update(focus, mood.sunDir, ext);
  }

  function tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    adapt(now);
    requestAnimationFrame(tick);
  }
  // Drop render resolution a notch if the device cannot hold ~30 fps. Slow frames add up, each counting for at most
  // 250 ms, so one stall cannot trigger a step down but a device stuck at any low rate does; a background tab is not
  // counted, and the count restarts when the tab comes back.
  let slow = 0, lastT = 0, pr = quality.pixelRatio;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { slow = 0; lastT = performance.now(); } });
  function adapt(now) {
    const ft = now - lastT; lastT = now;
    if (document.visibilityState !== 'visible') { slow = 0; return; }
    slow = ft > 36 ? slow + Math.min(ft, 250) : Math.max(0, slow - ft * 2);
    if (slow > 2500 && pr > 0.8) {
      // step down from the ratio actually in use, so the first steps are not swallowed by the pixel cap in fitRatio
      pr = Math.max(0.75, Math.min(pr, renderer.getPixelRatio()) - 0.25); slow = 0;
      quality.pixelRatio = pr;
      pendingSize = Math.max(pendingSize, 1); // applied before the next draw (see resize)
    }
  }
  function step(dt) {
    if (pendingSize) { const full = pendingSize === 2; pendingSize = 0; if (full) resize(); else resizeBuffers(); }
    time += dt;
    rig.update(dt);
    mood.update(dt, time);
    bridge.update(time, mood.cur.glow, mood.state.rain);
    floating.update(time);
    replicas.update(time, mood.cur.glow, mood.state.rain);
    citadel.update(time, 0.35 + 0.65 * Math.min(1, mood.cur.sunI / 2.2 + mood.cur.hemiI * 0.25));
    boats.update(dt, time);
    lanterns.update(dt, time);
    traffic.update(dt);
    street.update(dt, time);
    updateShadow();
    sky.mesh.scale.setScalar(camera.far * 0.9);
    updateDetail(camera, quality.low ? 900 : 1500);
    const pxScale = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    world.lamps.material.uniforms.uScale.value = pxScale;
    bridge.lights.forEach((l) => { l.material.uniforms.uScale.value = pxScale; });
    bridge.lamps.material.uniforms.uScale.value = pxScale;
    for (const g of extraGlows) { g.material.uniforms.uScale.value = pxScale; g.visible = mood.cur.glow > 0.01; }
    if (lanterns.halo) lanterns.halo.material.uniforms.uScale.value = pxScale;
    for (const g of lanternGlows) { g.material.uniforms.uScale.value = pxScale; g.visible = mood.cur.glow > 0.01; }
    const lit = mood.cur.glow > 0.01;
    world.lamps.visible = lit; bridge.lamps.visible = lit; bridge.lights.forEach((l) => { l.visible = lit; });
    if (post) {
      post.setMood(mood.cur.glow, mood.state.rain, mood.cur.fog, 0.5 + 0.45 * mood.state.rain + 0.1 * mood.cur.glow, time);
      // focus on what the camera is looking at. Near the ground everything is sharp, as a building is to someone standing
      // by it; only from the air does the far field soften a little. The illustrated look is sharp throughout.
      const fd = camera.position.distanceTo(controls.target);
      const hgt = camera.position.y - LAND_Y;
      post.setFocus(fd, (1 - look) * 0.3 * THREE.MathUtils.smoothstep(hgt, 120, 650));
      post.setLook(look);
    }
    draw();
    labels.update(innerWidth, innerHeight);
    ui.setHeading(rig.heading());
  }

  let savedLook = null;
  try { savedLook = localStorage.getItem('hue-look'); } catch { /* private mode */ }
  setLook((new URLSearchParams(location.search).get('look') || savedLook || 'ink') !== 'real');
  mood.update(0, 0);
  updateShadow();
  draw(); // compile shaders before the curtain lifts
  console.debug(`[hue] ready in ${Math.round(performance.now() - t0)} ms`);
  ui.loaderProgress(1);
  await frame();
  ui.loaderDone();
  requestAnimationFrame(tick);
  setTimeout(() => { rig.startDrift(); if (!rig.touched) ui.firstHint(); }, 1400);

  // handle for debugging and automated checks
  window.__hue = { rig, mood, data, scene, renderer, world, bridge, pick, step, post, labels, THREE, setLook, shadows };
}

main().catch((err) => {
  console.error(err);
  const t = document.getElementById('loader-text');
  if (t) t.textContent = 'Không tải được mô hình · Could not load the scene. ' + (err && err.message ? err.message : '');
});
