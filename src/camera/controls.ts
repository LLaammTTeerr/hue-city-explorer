import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { LAND_Y } from '../config.ts';
import { rise } from '../geo/terrain.ts';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const calm = matchMedia('(prefers-reduced-motion: reduce)');
// A key pressed while typing, on a form control or anywhere in the search box belongs to that control, not to the map.
export const fromForm = (e: Event) => { const t = e.target; return t instanceof HTMLElement && (t.isContentEditable || !!t.closest('input, textarea, select, #search')); };

// Map-style camera: drag the ground, wheel/pinch toward the cursor, right-drag or two fingers to turn and tilt.
export function createCamera(canvas, bounds) {
  const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 1, 80000);
  const controls = new MapControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = false;
  controls.zoomToCursor = true;
  controls.minDistance = 28;
  controls.maxDistance = 19000;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = THREE.MathUtils.degToRad(86.5);
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 1.15;
  controls.panSpeed = 1.0;
  controls.keyPanSpeed = 22;
  controls.autoRotateSpeed = 0.07;
  // arrow keys pan the map, but not while they move a caret, a slider or the search results: the controls listen through a filter
  const keyFilters = new Map();
  controls.listenToKeyEvents({
    addEventListener: (type: any, fn: any) => { const f = (e: Event) => { if (!fromForm(e)) fn(e); }; keyFilters.set(fn, f); addEventListener(type, f); },
    removeEventListener: (type: any, fn: any) => { removeEventListener(type, keyFilters.get(fn)); keyFilters.delete(fn); },
  } as any);

  let home = { pos: new THREE.Vector3(400, 230, -420), target: new THREE.Vector3(0, LAND_Y, 0) };
  let fly = null;
  let touched = false;
  // still on the opening view (home, untouched): a resize then re-frames home; any other view is kept as it is
  let opening = true;
  const listeners = { interact: new Set<() => void>() };

  const markTouched = () => {
    if (!touched) { touched = true; controls.autoRotate = false; }
    opening = false;
    listeners.interact.forEach((f) => f());
  };
  controls.addEventListener('start', () => { if (fly) fly = null; markTouched(); });
  canvas.addEventListener('wheel', markTouched, { passive: true });

  const ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -LAND_Y), hit = new THREE.Vector3();
  function groundAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), camera);
    if (!ray.ray.intersectPlane(ground, hit)) return null;
    const o = ray.ray.origin, d = ray.ray.direction;
    const tEnd = Math.min(o.distanceTo(hit), 25000);
    const tStart = d.y < -1e-4 ? Math.max(0, (LAND_Y + 150 - o.y) / d.y) : 0;
    if (tStart < tEnd) {
      const steps = 48, dt = (tEnd - tStart) / steps;
      let prev = tStart;
      for (let i = 1; i <= steps; i++) {
        const t = tStart + dt * i;
        const px = o.x + d.x * t, py = o.y + d.y * t, pz = o.z + d.z * t;
        if (py <= LAND_Y + rise(px, pz)) {
          let lo = prev, hi = t;
          for (let j = 0; j < 8; j++) {
            const mid = (lo + hi) * 0.5;
            const mx = o.x + d.x * mid, my = o.y + d.y * mid, mz = o.z + d.z * mid;
            if (my <= LAND_Y + rise(mx, mz)) hi = mid; else lo = mid;
          }
          const fx = o.x + d.x * hi, fz = o.z + d.z * hi;
          return new THREE.Vector3(fx, LAND_Y + rise(fx, fz), fz);
        }
        prev = t;
      }
    }
    return hit.clone();
  }

  function flyTo(pos, target, { duration = 2.4, arc = true, onDone = null } = {}) {
    if (calm.matches) { duration = 0.001; arc = false; } // reduced motion: cut to the new view instead of sweeping there
    opening = false; // a place, the overview or any other flight leaves the opening view
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), t: 0, duration, arc, onDone };
    controls.autoRotate = false;
  }

  function clampView() {
    const t = controls.target;
    const cx = Math.max(bounds.minX, Math.min(bounds.maxX, t.x)), cz = Math.max(bounds.minZ, Math.min(bounds.maxZ, t.z));
    const cy = LAND_Y + rise(cx, cz);
    if (cx !== t.x || cz !== t.z || t.y !== cy) {
      const dx = cx - t.x, dz = cz - t.z, dy = cy - t.y;
      t.set(cx, cy, cz);
      camera.position.x += dx; camera.position.z += dz; camera.position.y += dy;
    }
    const floor = LAND_Y + rise(camera.position.x, camera.position.z) + 1.7; // stay above the hills too
    if (camera.position.y < floor) camera.position.y = floor;
  }

  const dir = new THREE.Vector3();
  return {
    camera, controls, groundAt,
    get flying() { return !!fly; },
    get touched() { return touched; },
    get opening() { return opening; },
    onInteract: (f) => listeners.interact.add(f),
    setHome(pos, target) { home = { pos: pos.clone(), target: target.clone() }; },
    jumpHome() { camera.position.copy(home.pos); controls.target.copy(home.target); controls.update(); },
    goHome(duration = 2.6) { flyTo(home.pos, home.target, { duration, onDone: () => { opening = true; } }); },
    startDrift() { if (!touched && !calm.matches) controls.autoRotate = true; },
    // the camera was placed by a shared link (src/ui/share.js): treat it as moved, so resize and drift leave it alone
    leaveOpening() { touched = true; opening = false; controls.autoRotate = false; },
    flyTo,
    cancelFly() { fly = null; },
    zoomBy(k) {
      if (!controls.enabled) return;
      const off = camera.position.clone().sub(controls.target).multiplyScalar(k);
      const len = off.length();
      if (len < controls.minDistance || len > controls.maxDistance) off.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, len)));
      flyTo(controls.target.clone().add(off), controls.target, { duration: 0.5, arc: false });
      markTouched();
    },
    // Compass bearing the camera faces, radians clockwise from north.
    heading() { camera.getWorldDirection(dir); return Math.atan2(dir.x, -dir.z); },
    update(dt, enabled = true) {
      if (fly) {
        fly.t = Math.min(1, fly.t + dt / fly.duration);
        const k = ease(fly.t);
        camera.position.lerpVectors(fly.p0, fly.p1, k);
        controls.target.lerpVectors(fly.t0, fly.t1, k);
        if (fly.arc) {
          const span = fly.p0.distanceTo(fly.p1);
          camera.position.y += Math.sin(Math.PI * k) * Math.min(420, span * 0.16);
        }
        camera.position.y = Math.max(camera.position.y, LAND_Y + rise(camera.position.x, camera.position.z) + 1.7);
        camera.lookAt(controls.target);
        if (fly.t >= 1) { const done = fly.onDone; fly = null; controls.update(); clampView(); if (done) done(); }
      } else if (enabled) {
        controls.update(dt);
        clampView();
      }
      // wider lens near the ground, longer lens from the air
      const h = Math.max(1, camera.position.y - (LAND_Y + rise(camera.position.x, camera.position.z)));
      const high = smooth(10, 220, h);
      const portrait = camera.aspect < 1 ? (1 - camera.aspect) * 24 : 0; // tall screens need more sideways view at boat height
      const fov = 46 + portrait * (1 - high) - 17 * high; // long lens from the air (flatter, model-like), wide at ground level
      if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
      // keep depth precision where the camera is
      const near = Math.max(0.6, Math.min(12, h * 0.04));
      if (Math.abs(near - camera.near) > 0.05) { camera.near = near; camera.updateProjectionMatrix(); }
    },
  };
}
