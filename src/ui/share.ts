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
import { LAND_Y } from '../config.ts';
import { rise } from '../geo/terrain.ts';

const SHARE_VERSION = '1';
const DECIMETRES_PER_METRE = 10;
const MIN_ASPECT = 0.2;
const MAX_ASPECT = 5;
const MIN_FOV_DEG = 5;
const MAX_FOV_DEG = 100;
const BOUNDS_TOLERANCE_M = 0.15;
const MIN_DIST_MARGIN = 0.95;
const MAX_DIST_MARGIN = 1.05;
const COPIED_HINT_MS = 2600;
const DEFAULT_KEEP_WIDTH = 0.75;
const MIN_PLACE_KEEP_WIDTH = 0.5;
const PLACE_NDC_SCALE = 1.1;
const PLACE_NDC_PAD = 0.15;
const LENS_SETTLE_ITERATIONS = 4;
const SHEET_LEFT_MAX_RATIO = 0.25;
const SHEET_RIGHT_MIN_RATIO = 0.75;
const SHEET_MIN_STRIP_PX = 60;
const MIN_DOWNWARD_LOOK_Y = -0.05;

const parseStrictNum = (str: string | null) => (typeof str === 'string' && /^-?\d{1,6}(\.\d{1,3})?$/.test(str) ? Number(str) : NaN);
const round1 = (val: number) => Math.round(val * 10) / 10;
const round2 = (val: number) => Math.round(val * 100) / 100;

// Parse and check a query string. Returns null for anything missing, malformed or out of range.
export function parseShare(search: string, { places, bounds, minDistance, maxDistance }: any) {
  const params = new URLSearchParams(search);
  if (params.get('v') !== SHARE_VERSION) return null;
  const camCoords = (params.get('c') || '').split(',').map(parseStrictNum);
  const targetCoords = (params.get('t') || '').split(',').map(parseStrictNum);
  const aspect = parseStrictNum(params.get('a'));
  const fov = parseStrictNum(params.get('f'));
  const moodCode = params.get('m') || '';
  const placeId = params.get('p');

  if (camCoords.length !== 3 || targetCoords.length !== 2 || ![...camCoords, ...targetCoords, aspect, fov].every(Number.isFinite)) return null;
  if (!/^[012][01][ir]$/.test(moodCode)) return null;
  if (aspect < MIN_ASPECT || aspect > MAX_ASPECT || fov < MIN_FOV_DEG || fov > MAX_FOV_DEG) return null;

  const pos = new THREE.Vector3(camCoords[0], camCoords[1], camCoords[2]);
  const target = new THREE.Vector3(targetCoords[0], LAND_Y, targetCoords[1]);
  if (
    target.x < bounds.minX - BOUNDS_TOLERANCE_M || target.x > bounds.maxX + BOUNDS_TOLERANCE_M
    || target.z < bounds.minZ - BOUNDS_TOLERANCE_M || target.z > bounds.maxZ + BOUNDS_TOLERANCE_M
  ) return null;

  const dist = pos.distanceTo(target);
  if (pos.y <= LAND_Y || dist < minDistance * MIN_DIST_MARGIN || dist > maxDistance * MAX_DIST_MARGIN) return null;
  if (placeId !== null && !places.some((item: any) => item.id === placeId)) return null;

  return { pos, target, aspect, fov, time: +moodCode[0], rain: moodCode[1] === '1', ink: moodCode[2] === 'i', place: placeId };
}

async function copyToClipboard(url: string) {
  try { await navigator.clipboard.writeText(url); return true; } catch { /* no permission or no clipboard API */ }
  const textarea = document.createElement('textarea');
  textarea.value = url;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.append(textarea);
  textarea.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* not supported */ }
  textarea.remove();
  return ok;
}

function computeKeepWidthFraction(view: any, places: any[]) {
  if (!view.place) return DEFAULT_KEEP_WIDTH;
  const place = places.find((item: any) => item.id === view.place);
  const srcCam = new THREE.PerspectiveCamera(view.fov, view.aspect, 1, 10);
  srcCam.position.copy(view.pos);
  srcCam.lookAt(view.target);
  srcCam.updateMatrixWorld();
  const px = place.x / DECIMETRES_PER_METRE;
  const pz = place.z / DECIMETRES_PER_METRE;
  const ndcX = Math.abs(new THREE.Vector3(px, LAND_Y + rise(px, pz), pz).project(srcCam).x);
  return Math.min(1, Math.max(MIN_PLACE_KEEP_WIDTH, ndcX * PLACE_NDC_SCALE + PLACE_NDC_PAD));
}

// On a phone the card is a sheet across the lower half: from the same spot, tip the camera down until the point it
// centred on sits in the middle of the strip left above the card (its distance, so its size, stays the same).
function shiftTargetAbovePhoneCard(view: any, camera: THREE.PerspectiveCamera, controls: any, bounds: any) {
  const cardEl = document.getElementById('card')!;
  const cardRect = cardEl.getBoundingClientRect();
  const searchRect = document.getElementById('search')!.getBoundingClientRect();
  // the card grows to its full height once the stories load, so plan for that height
  const cardTop = Math.min(cardRect.top, cardRect.bottom - (parseFloat(getComputedStyle(cardEl).maxHeight) || 0));
  const isFullWidthSheet = cardRect.height > 0
    && cardRect.left < innerWidth * SHEET_LEFT_MAX_RATIO
    && cardRect.right > innerWidth * SHEET_RIGHT_MIN_RATIO
    && cardTop - searchRect.bottom > SHEET_MIN_STRIP_PX;
  if (!view.place || !isFullWidthSheet) return;

  const goalNdcY = 1 - (searchRect.bottom + cardTop) / innerHeight;
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const lookDir = view.target.clone().sub(camera.position).normalize().applyAxisAngle(camRight, -Math.atan(goalNdcY * tanHalfFov));
  const rayDist = (LAND_Y - camera.position.y) / lookDir.y;
  if (lookDir.y < MIN_DOWNWARD_LOOK_Y && rayDist > controls.minDistance) {
    controls.target.copy(camera.position).addScaledVector(lookDir, rayDist);
    controls.target.x = Math.max(bounds.minX, Math.min(bounds.maxX, controls.target.x));
    controls.target.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, controls.target.z));
  }
}

// rig: src/camera/controls.js; mood: src/env/mood.js; setLook(ink); pick(id, fly) opens a card; ui for the feedback.
export function createShare({ data, rig, mood, setLook, pick, ui, bounds }: any) {
  const { camera, controls } = rig;

  function link(placeId: string | null) {
    const target = controls.target;
    const pos = camera.position;
    const moodState = mood.state;
    const parts = [
      `v=${SHARE_VERSION}`,
      `c=${round1(pos.x)},${round1(pos.y)},${round1(pos.z)}`,
      `t=${round1(target.x)},${round1(target.z)}`,
      `a=${round2(camera.aspect)}`,
      `f=${round1(camera.fov)}`,
      `m=${Math.round(moodState.timeTarget)}${moodState.rainTarget ? 1 : 0}${moodState.look ? 'i' : 'r'}`,
    ];
    if (placeId) parts.push(`p=${encodeURIComponent(placeId)}`);
    return `${location.origin}${location.pathname}?${parts.join('&')}`;
  }

  // The system share sheet where there is one, otherwise the clipboard with a short note.
  async function share(placeId: string | null) {
    const url = link(placeId);
    const place = placeId && data.places.find((item: any) => item.id === placeId);
    if (navigator.share) {
      try {
        await navigator.share({ title: place ? `${place.n} · Huế` : document.title, url });
        return url;
      } catch (err: any) {
        if (err && err.name === 'AbortError') return url; // the visitor closed the sheet
      }
    }
    if (await copyToClipboard(url)) ui.hint(ui.T.copied, COPIED_HINT_MS);
    else window.prompt(ui.T?.share || 'Share link', url);
    return url;
  }

  // On load: if the URL carries a valid view, set the atmosphere and the camera at once (no opening flight) and open
  // the card. Returns the parsed view, or null when the normal opening should play.
  function apply() {
    const view = parseShare(location.search, {
      places: data.places, bounds, minDistance: controls.minDistance, maxDistance: controls.maxDistance,
    });
    if (!view) return null;

    setLook(view.ink); // not remembered: a shared link does not change the visitor's own choice
    mood.setTime(view.time);
    mood.setRain(view.rain);
    mood.state.time = mood.state.timeTarget; // settled from the first frame, not faded in
    mood.state.rain = mood.state.rainTarget;
    rig.cancelFly();
    if (view.place) pick(view.place, false); // first, so the camera below can keep clear of the card

    const keepWidth = computeKeepWidthFraction(view, data.places);
    const dir = view.pos.clone().sub(view.target);
    const origDist = dir.length();
    dir.divideScalar(origDist);
    const origTanV = Math.tan(THREE.MathUtils.degToRad(view.fov / 2));
    const origTanH = origTanV * view.aspect;

    const placeCameraAt = (dist: number) => {
      controls.target.copy(view.target);
      camera.position.copy(view.target).addScaledVector(dir, dist);
      camera.lookAt(controls.target);
      camera.updateMatrixWorld();
    };

    let dist = origDist;
    for (let i = 0; i < LENS_SETTLE_ITERATIONS; i++) { // the lens follows the camera height (rig.update), so settle over a few rounds
      placeCameraAt(dist);
      rig.update(0, false);
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const tanH = tanV * camera.aspect;
      dist = Math.max(controls.minDistance, Math.min(controls.maxDistance, origDist * Math.max(1, origTanV / tanV, keepWidth * origTanH / tanH)));
    }
    placeCameraAt(dist);
    rig.update(0, false);
    shiftTargetAbovePhoneCard(view, camera, controls, bounds);
    controls.update();
    rig.update(0); // clamps to the map and above the hills, settles the lens
    rig.leaveOpening(); // no longer the opening view: a resize keeps this view and the drift never starts
    return view;
  }

  return { link, share, apply };
}
