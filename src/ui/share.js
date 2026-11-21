// "Chia sẻ góc nhìn" (share a view): a link that reopens the camera, the open place card and the atmosphere.
//
// Format, version 1, in the query string (the other app params, such as ?look=, are not carried over):
//   ?v=1&c=<x>,<y>,<z>&t=<x>,<z>&a=<aspect>&f=<fov>&m=<time><rain><look>[&p=<place id>]
//   c  camera position in metres, 1 decimal       t  camera target on the ground (its height is always LAND_Y)
//   a  width / height of the window it was made in, 2 decimals
//   f  vertical field of view then, degrees, 1 decimal
//   m  three characters: time of day 0|1|2 (morning, late afternoon, lights on), rain 0|1, look i|r (ink, realistic)
//   p  the landmark whose card is open (data.places id); absent for a free view
// A link that fails any check is ignored as a whole and the normal opening plays.
import * as THREE from 'three';
import { LAND_Y } from '../config.js';

const VERSION = '1';
const num = (s) => (typeof s === 'string' && /^-?\d{1,6}(\.\d{1,3})?$/.test(s) ? Number(s) : NaN);
const r1 = (v) => Math.round(v * 10) / 10;

// Parse and check a query string. Returns null for anything missing, malformed or out of range.
export function parseShare(search, { places, bounds, minDistance, maxDistance }) {
  const q = new URLSearchParams(search);
  if (q.get('v') !== VERSION) return null;
  const c = (q.get('c') || '').split(',').map(num), t = (q.get('t') || '').split(',').map(num);
  const a = num(q.get('a')), f = num(q.get('f')), m = q.get('m') || '', p = q.get('p');
  if (c.length !== 3 || t.length !== 2 || ![...c, ...t, a, f].every(Number.isFinite)) return null;
  if (!/^[012][01][ir]$/.test(m)) return null;
  if (a < 0.2 || a > 5 || f < 5 || f > 100) return null;
  const pos = new THREE.Vector3(c[0], c[1], c[2]), target = new THREE.Vector3(t[0], LAND_Y, t[1]);
  if (target.x < bounds.minX || target.x > bounds.maxX || target.z < bounds.minZ || target.z > bounds.maxZ) return null;
  const d = pos.distanceTo(target);
  if (pos.y <= LAND_Y || d < minDistance * 0.95 || d > maxDistance * 1.05) return null;
  if (p !== null && !places.some((x) => x.id === p)) return null;
  return { pos, target, aspect: a, fov: f, time: +m[0], rain: m[1] === '1', ink: m[2] === 'i', place: p };
}

// rig: src/camera/controls.js; mood: src/env/mood.js; setLook(ink); pick(id, fly) opens a card; ui for the feedback.
export function createShare({ data, rig, mood, setLook, pick, ui, bounds }) {
  const { camera, controls } = rig;

  function link(placeId) {
    const t = controls.target, p = camera.position, s = mood.state;
    const q = [
      `v=${VERSION}`,
      `c=${r1(p.x)},${r1(p.y)},${r1(p.z)}`,
      `t=${r1(t.x)},${r1(t.z)}`,
      `a=${(Math.round(camera.aspect * 100) / 100)}`,
      `f=${r1(camera.fov)}`,
      `m=${s.timeTarget}${s.rainTarget ? 1 : 0}${s.look ? 'i' : 'r'}`,
    ];
    if (placeId) q.push(`p=${encodeURIComponent(placeId)}`);
    return `${location.origin}${location.pathname}?${q.join('&')}`;
  }

  async function copy(url) {
    try { await navigator.clipboard.writeText(url); return true; } catch { /* no permission or no clipboard API */ }
    const ta = document.createElement('textarea');
    ta.value = url; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.append(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* not supported */ }
    ta.remove();
    return ok;
  }

  // The system share sheet where there is one, otherwise the clipboard with a short note.
  async function share(placeId) {
    const url = link(placeId);
    const p = placeId && data.places.find((x) => x.id === placeId);
    if (navigator.share) {
      try { await navigator.share({ title: p ? `${p.n} · Huế` : document.title, url }); return url; } catch (e) {
        if (e && e.name === 'AbortError') return url; // the visitor closed the sheet
      }
    }
    if (await copy(url)) ui.hint(ui.T.copied, 2600);
    else ui.hint(url, 9000); // nothing could copy it: show the link to copy by hand
    return url;
  }

  // On load: if the URL carries a valid view, set the atmosphere and the camera at once (no opening flight) and open
  // the card. Returns the parsed view, or null when the normal opening should play.
  function apply() {
    const v = parseShare(location.search, { places: data.places, bounds, minDistance: controls.minDistance, maxDistance: controls.maxDistance });
    if (!v) return null;
    setLook(v.ink); // not remembered: a shared link does not change the visitor's own choice
    mood.setTime(v.time);
    mood.setRain(v.rain);
    mood.state.time = mood.state.timeTarget; // settled from the first frame, not faded in
    mood.state.rain = mood.state.rainTarget;
    rig.cancelFly();
    if (v.place) pick(v.place, false); // first, so the camera below can keep clear of the card
    // Keep the target and the direction and change only the distance, so that what mattered in the frame the link was
    // made in fits this window: all of its height, and as much of its width as the landmark needs (half of it for a
    // landmark in the middle, all of it for one near the edge; three quarters of a free view). Matching the whole width
    // would put a wide desktop view a long way off on a phone, whose lens narrows from the air.
    let keepW = 0.75;
    if (v.place) {
      const p = data.places.find((x) => x.id === v.place);
      const src = new THREE.PerspectiveCamera(v.fov, v.aspect, 1, 10);
      src.position.copy(v.pos); src.lookAt(v.target); src.updateMatrixWorld();
      const x = Math.abs(new THREE.Vector3(p.x / 10, LAND_Y, p.z / 10).project(src).x);
      keepW = Math.min(1, Math.max(0.5, x * 1.1 + 0.15));
    }
    const dir = v.pos.clone().sub(v.target), d0 = dir.length();
    dir.divideScalar(d0);
    const tv0 = Math.tan(THREE.MathUtils.degToRad(v.fov / 2)), th0 = tv0 * v.aspect;
    const place = (d) => {
      controls.target.copy(v.target);
      camera.position.copy(v.target).addScaledVector(dir, d);
      camera.lookAt(controls.target);
      camera.updateMatrixWorld();
    };
    let d = d0;
    for (let i = 0; i < 4; i++) { // the lens follows the camera height (rig.update), so settle over a few rounds
      place(d);
      rig.update(0, false); // sets the lens for this height and aspect
      const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), th = tv * camera.aspect;
      d = Math.max(controls.minDistance, Math.min(controls.maxDistance, d0 * Math.max(1, tv0 / tv, keepW * th0 / th)));
    }
    place(d);
    rig.update(0, false);
    // On a phone the card is a sheet across the lower half: from the same spot, tip the camera down until the point it
    // centred on sits in the middle of the strip left above the card (its distance, so its size, stays the same).
    const cardEl = document.getElementById('card'), card = cardEl.getBoundingClientRect(), bar = document.getElementById('search').getBoundingClientRect();
    // the card grows to its full height once the stories load, so plan for that height
    const cardTop = Math.min(card.top, card.bottom - (parseFloat(getComputedStyle(cardEl).maxHeight) || 0));
    if (v.place && card.height && card.left < innerWidth * 0.25 && card.right > innerWidth * 0.75 && cardTop - bar.bottom > 60) {
      const goal = 1 - (bar.bottom + cardTop) / innerHeight; // NDC y of the strip's middle
      const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const look = v.target.clone().sub(camera.position).normalize().applyAxisAngle(right, -Math.atan(goal * tv));
      const t = (LAND_Y - camera.position.y) / look.y;
      if (look.y < -0.05 && t > controls.minDistance) controls.target.copy(camera.position).addScaledVector(look, t);
    }
    controls.update();
    rig.update(0); // clamps to the map and above the hills, settles the lens
    rig.leaveOpening(); // no longer the opening view: a resize keeps this view and the drift never starts
    return v;
  }

  return { link, share, apply };
}
