import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import './ui/style.css';

import * as THREE from 'three';
import { LAND_Y, quality } from './config.js';
import { buildCity, finishStructures, updateDetail } from './geo/city.js';
import { buildTruongTien } from './landmarks/truongtien.js';
import { buildCitadel, buildMarket, buildThienMu } from './landmarks/citadel.js';
import { buildBoats, buildLanterns } from './landmarks/boats.js';
import { buildNguyenHoang, buildQuocHocGate } from './landmarks/more.js';
import { buildCivic } from './landmarks/civic.js';
import { buildSouth } from './landmarks/south.js';
import { buildTombs } from './landmarks/tombs.js';
import { buildBiaQuocHoc } from './landmarks/memorial.js';
import { buildBoardwalk } from './landmarks/boardwalk.js';
import { era, onEra } from './era.js';
import { shared } from './geo/materials.js';
import { span } from './geo/buf.js';
import { buildLotus, buildTraffic, buildStreetLife } from './landmarks/life.js';
import { buildSky } from './env/sky.js';
import { buildWater } from './env/water.js';
import { buildRain } from './env/rain.js';
import { createMood } from './env/mood.js';
import { createPost } from './env/post.js';
import { createCamera } from './camera/controls.js';
import { createRide } from './camera/ride.js';
import { createLabels } from './ui/labels.js';
import { createUI } from './ui/ui.js';
import { VIEWS } from './ui/content.js';
import { rise } from './geo/terrain.js';

const canvas = document.getElementById('scene');
// yield to the event loop between build steps (a message task is not throttled in background tabs, unlike rAF and timers)
const frame = () => new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });

async function main() {
  const t0 = performance.now();
  const res = await fetch(`${import.meta.env.BASE_URL}data/hue.json`);
  const data = await res.json();

  let rig, ride, mood, labels;
  const ui = createUI(data, {
    pick: (id, fly) => pick(id, fly),
    overview: () => { if (!ride.active) { ui.hideCard(); const v = overviewView(); rig.flyTo(v.pos, v.target, { duration: 3 }); } },
    lang: () => labels && labels.remeasure(),
    labels: () => toggleLabels(),
    osmOnly: (on) => { world.infill.forEach((m) => { m.visible = !on; }); },
    home: () => { follow = null; if (ride.active) ride.exit(); else { rig.goHome(); ui.hideCard(); } },
    zoom: (k) => rig.zoomBy(k),
    cardClosed: () => {},
    ride: () => { follow = null; ride.start(); },
    rain: () => mood.setRain(!mood.state.rainTarget),
    time: (i) => mood.setTime(i),
    exitRide: () => ride.exit(),
    seek: (t, scrubbing) => ride.seek(t, scrubbing),
  });
  ui.loaderProgress(0.15);
  await frame();

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  // the post-processing targets are multisampled float buffers, so cap total pixels on big hi-dpi windows
  const fitRatio = () => (quality.low ? quality.pixelRatio : Math.max(1, Math.min(quality.pixelRatio, Math.sqrt(3.0e6 / (innerWidth * innerHeight)))));
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
  // each landmark is tagged with the first era it stands in (src/era.js): Trường Tiền 1899, the market and
  // Quốc Học's gate under the French, cầu Nguyễn Hoàng 2025; the Citadel and Thiên Mụ are older than all three
  const S = world.structures;
  S.span = span(1);
  const bridge = buildTruongTien(data, S, dynamic);
  S.span = 0;
  const citadel = buildCitadel(data, S, dynamic);
  S.span = span(1);
  buildMarket(data, S);
  S.span = 0;
  buildThienMu(data, S, dynamic);
  S.span = span(2);
  const extraGlows = buildNguyenHoang(data, S, dynamic);
  S.span = span(1);
  buildQuocHocGate(data, S);
  S.span = 0;
  buildCivic(data, world.structures);
  buildBiaQuocHoc(data, world.structures);
  buildBoardwalk(data, world.structures, dynamic);
  buildSouth(data, world.structures);
  buildTombs(data, world.structures);
  finishStructures(world.structures, world.group);
  const boats = buildBoats(data, dynamic);
  const lanterns = buildLanterns(data, dynamic); // hoa đăng drifting past the Citadel after dark
  buildLotus(data, dynamic);
  const traffic = buildTraffic(data, dynamic);
  const street = buildStreetLife(data, dynamic);
  scene.add(world.group, dynamic);
  // the era switcher: geometry hides itself in the shader; lights and lamp glows are switched here
  const eraGated = [], lanternGlows = []; // lanternGlows: glow points that landmarks flagged for the per-frame update
  dynamic.traverse((o) => { if (o.userData.minEra != null) eraGated.push(o); if (o.userData.glow) lanternGlows.push(o); });
  const applyEra = (e) => {
    shared.uEra.value = e;
    for (const o of eraGated) o.visible = e >= o.userData.minEra;
    world.lamps.material.uniforms.uBoost.value = e >= 2 ? 0.6 : 0.3; // thinner street lighting in the 1930s
  };
  applyEra(era.value);
  onEra(applyEra);
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
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 2.4;
  scene.add(hemi, sun, sun.target);

  mood = createMood({ scene, renderer, sun, hemi, sky, water, rain });
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

  const placeXZ = Object.fromEntries(data.places.map((p) => [p.id, [p.x / 10, p.z / 10]]));
  ride = createRide({ rig, bridge, boats, places: { thuongtu: placeXZ['gate:Cửa Thượng Tứ'] } });
  ride.on((type) => {
    if (type === 'start') { ui.setRide(true); labels.setDim(true); }
    if (type === 'tick') ui.setRideProgress(ride.progress);
    if (type === 'end') { ui.setRide(false); labels.setDim(false); setTimeout(() => { if (!ride.active) boats.rideBoat.visible = false; }, 9000); }
  });

  // ---------- labels & picking ----------
  let labelsOn = true;
  labels = createLabels(document.getElementById('labels'), data, camera, (id) => pick(id, true));
  function toggleLabels() { labelsOn = !labelsOn; labels.setEnabled(labelsOn); ui.setLabels(labelsOn); }

  function pick(id, fly) {
    const p = data.places.find((q) => q.id === id);
    if (!p) return;
    if (ride.active) return;
    if (fly) follow = null;
    ui.showCard(id);
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

  // following a boat: the camera's target rides on it; orbit and zoom still work
  let follow = null;
  const waterRay = new THREE.Raycaster(), waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.5), waterHit = new THREE.Vector3();
  function boatAt(cx, cy) {
    const r = canvas.getBoundingClientRect();
    waterRay.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
    if (!waterRay.ray.intersectPlane(waterPlane, waterHit)) return null;
    const reach = Math.max(16, camera.position.distanceTo(waterHit) * 0.03);
    let best = null, bd = reach;
    for (const b of boats.fleet) { const d = Math.hypot(b.mesh.position.x - waterHit.x, b.mesh.position.z - waterHit.z); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  const followDelta = new THREE.Vector3();
  function updateFollow() {
    if (!follow || ride.active || rig.flying) return;
    followDelta.set(follow.mesh.position.x - controls.target.x, 0, follow.mesh.position.z - controls.target.z).multiplyScalar(0.12);
    controls.target.add(followDelta);
    camera.position.add(followDelta);
  }

  // tap / click on the ground near a landmark reveals it; drag during the ride turns the head
  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, id: e.pointerId };
    canvas.classList.add('dragging');
    if (ride.active) { ride.setDragging(true); canvas.setPointerCapture(e.pointerId); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down || down.id !== e.pointerId) return;
    if (ride.active) ride.look(e.clientX - down.lx, e.clientY - down.ly);
    down.lx = e.clientX; down.ly = e.clientY;
  });
  const up = (e) => {
    canvas.classList.remove('dragging');
    ride.setDragging(false);
    if (!down || down.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
    down = null;
    if (moved > 6 || dt > 450 || ride.active || e.type === 'pointercancel') return;
    // a click on a dragon boat rides along with it (the river plane is at y = 0, so test against that)
    const hitBoat = boatAt(e.clientX, e.clientY);
    if (hitBoat) { follow = hitBoat; ui.hideCard(); ui.hint(ui.T.hintFollow, 5000); return; }
    if (follow) { follow = null; ui.hideHint(); }
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
    if (ride.active) return;
    const g = rig.groundAt(e.clientX, e.clientY);
    if (!g) return;
    const off = camera.position.clone().sub(controls.target).multiplyScalar(0.45);
    if (off.length() < 60) off.setLength(60);
    g.y = LAND_Y;
    rig.flyTo(g.clone().add(off), g, { duration: 1.1, arc: false });
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || document.getElementById('about').open) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { if (ride.active) ride.exit(); else if (follow) { follow = null; ui.hideHint(); } else ui.hideCard(); }
    else if (k === 'h' || k === 'home') { if (ride.active) ride.exit(); else { rig.goHome(); ui.hideCard(); } }
    else if (k === 'b') { if (!ride.active) ride.start(); }
    else if (k === 'r') mood.setRain(!mood.state.rainTarget);
    else if (k === 'n') mood.setTime((mood.state.timeTarget + 1) % 3);
    else if (k === 'l') toggleLabels();
    else if (k === '+' || k === '=') rig.zoomBy(0.65);
    else if (k === '-' || k === '_') rig.zoomBy(1.5);
  });

  rig.onInteract(() => ui.hideHint());

  // ---------- resize ----------
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(fitRatio());
    renderer.setSize(w, h, false);
    if (post) post.resize();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    water.mesh.userData.resize(w, h);
    labels.remeasure();
    hv = homeView();
    rig.setHome(hv.pos, hv.target);
    if (!rig.touched && !ride.active && !rig.flying) rig.jumpHome();
  }
  addEventListener('resize', resize);

  // ---------- frame loop ----------
  let last = performance.now();
  const fwd = new THREE.Vector3(), focus = new THREE.Vector3();
  let time = 0;
  function updateShadow() {
    // keep the shadow map centred where the eye is resting, sized to the view
    const dist = camera.position.distanceTo(controls.target);
    if (ride.active) { camera.getWorldDirection(fwd); focus.copy(camera.position).addScaledVector(fwd, 160); focus.y = LAND_Y; }
    else focus.copy(controls.target);
    const ext = ride.active ? 420 : Math.max(260, Math.min(2600, dist * 0.8));
    const texel = (ext * 2) / quality.shadowSize;
    focus.x = Math.round(focus.x / texel) * texel; focus.z = Math.round(focus.z / texel) * texel;
    sun.target.position.copy(focus);
    sun.position.copy(focus).addScaledVector(mood.sunDir, 3200);
    const cam = sun.shadow.camera;
    if (Math.abs(cam.right - ext) > 1) {
      cam.left = -ext; cam.right = ext; cam.top = ext; cam.bottom = -ext; cam.near = 200; cam.far = 6500;
      cam.updateProjectionMatrix();
      sun.shadow.normalBias = texel * 1.6;
    }
  }

  function tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    adapt(now);
    requestAnimationFrame(tick);
  }
  // Drop render resolution a notch if the device cannot hold ~30 fps (ignores background-tab stalls).
  let slow = 0, lastT = 0, pr = quality.pixelRatio;
  function adapt(now) {
    const ft = now - lastT; lastT = now;
    if (ft > 250 || document.visibilityState !== 'visible') { slow = 0; return; }
    slow = ft > 36 ? slow + ft : Math.max(0, slow - ft * 2);
    if (slow > 2500 && pr > 0.8) {
      pr = Math.max(0.75, pr - 0.25); slow = 0;
      quality.pixelRatio = pr;
      renderer.setPixelRatio(fitRatio());
      if (post) post.resize();
      water.mesh.userData.resize(innerWidth, innerHeight);
    }
  }
  function step(dt) {
    time += dt;
    ride.update(dt);
    updateFollow();
    rig.update(dt, !ride.active);
    mood.update(dt, time);
    bridge.update(time, mood.cur.glow, mood.state.rain);
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
    for (const g of extraGlows) { g.material.uniforms.uScale.value = pxScale; g.visible = mood.cur.glow > 0.01 && era.value >= 2; }
    if (lanterns.halo) lanterns.halo.material.uniforms.uScale.value = pxScale;
    for (const g of lanternGlows) { g.material.uniforms.uScale.value = pxScale; g.visible = mood.cur.glow > 0.01 && era.value >= (g.userData.minEra ?? 0); }
    const lit = mood.cur.glow > 0.01;
    world.lamps.visible = lit && era.value >= 1; bridge.lamps.visible = lit && era.value >= 1; bridge.lights.forEach((l) => { l.visible = lit && era.value >= 2; });
    if (post) {
      post.setMood(mood.cur.glow, mood.state.rain, mood.cur.fog, 0.5 + 0.45 * mood.state.rain + 0.1 * mood.cur.glow, time);
      // focus on what the camera is looking at; the higher the view, the shallower the focus (the model-on-a-table look)
      const fd = ride.active ? 90 : camera.position.distanceTo(controls.target);
      const hgt = camera.position.y - LAND_Y;
      post.setFocus(fd, ride.active ? 0.12 : 0.18 + 0.5 * Math.min(1, Math.max(0, (hgt - 40) / 500)));
    }
    draw();
    labels.update(innerWidth, innerHeight);
    ui.setHeading(rig.heading());
  }

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
  window.__hue = { rig, ride, mood, data, scene, renderer, world, bridge, pick, step, post, THREE };
}

main().catch((err) => {
  console.error(err);
  const t = document.getElementById('loader-text');
  if (t) t.textContent = 'Không tải được mô hình · Could not load the scene. ' + (err && err.message ? err.message : '');
});
