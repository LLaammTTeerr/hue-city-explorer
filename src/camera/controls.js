import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { LAND_Y } from '../config.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Map-style camera: drag the ground, wheel/pinch toward the cursor, right-drag or two fingers to turn and tilt.
export function createCamera(canvas, bounds) {
  const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 1, 80000);
  const controls = new MapControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = false;
  controls.zoomToCursor = true;
  controls.minDistance = 28;
  controls.maxDistance = 6500;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = THREE.MathUtils.degToRad(86.5);
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 1.15;
  controls.panSpeed = 1.0;
  controls.keyPanSpeed = 22;
  controls.autoRotateSpeed = 0.07;
  controls.listenToKeyEvents(window);

  let home = { pos: new THREE.Vector3(400, 230, -420), target: new THREE.Vector3(0, LAND_Y, 0) };
  let fly = null;
  let touched = false;
  const listeners = { interact: new Set() };

  const markTouched = () => {
    if (!touched) { touched = true; controls.autoRotate = false; }
    listeners.interact.forEach((f) => f());
  };
  controls.addEventListener('start', () => { if (fly) fly = null; markTouched(); });
  canvas.addEventListener('wheel', markTouched, { passive: true });

  const ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -LAND_Y), hit = new THREE.Vector3();
  function groundAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), camera);
    return ray.ray.intersectPlane(ground, hit) ? hit.clone() : null;
  }

  function flyTo(pos, target, { duration = 2.4, arc = true, onDone = null } = {}) {
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), t: 0, duration, arc, onDone };
    controls.autoRotate = false;
  }

  function clampView() {
    const t = controls.target;
    const cx = Math.max(bounds.minX, Math.min(bounds.maxX, t.x)), cz = Math.max(bounds.minZ, Math.min(bounds.maxZ, t.z));
    if (cx !== t.x || cz !== t.z || t.y !== LAND_Y) {
      const dx = cx - t.x, dz = cz - t.z, dy = LAND_Y - t.y;
      t.set(cx, LAND_Y, cz);
      camera.position.x += dx; camera.position.z += dz; camera.position.y += dy;
    }
    if (camera.position.y < LAND_Y + 1.7) camera.position.y = LAND_Y + 1.7;
  }

  const dir = new THREE.Vector3();
  return {
    camera, controls, groundAt,
    get flying() { return !!fly; },
    get touched() { return touched; },
    onInteract: (f) => listeners.interact.add(f),
    setHome(pos, target) { home = { pos: pos.clone(), target: target.clone() }; },
    jumpHome() { camera.position.copy(home.pos); controls.target.copy(home.target); controls.update(); },
    goHome(duration = 2.6) { flyTo(home.pos, home.target, { duration }); },
    startDrift() { if (!touched && !matchMedia('(prefers-reduced-motion: reduce)').matches) controls.autoRotate = true; },
    flyTo,
    cancelFly() { fly = null; },
    zoomBy(k) {
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
        camera.lookAt(controls.target);
        if (fly.t >= 1) { const done = fly.onDone; fly = null; controls.update(); if (done) done(); }
      } else if (enabled) {
        controls.update(dt);
        clampView();
      }
      // wider lens near the ground, longer lens from the air
      const h = camera.position.y - LAND_Y;
      const high = smooth(10, 190, h);
      const portrait = camera.aspect < 1 ? (1 - camera.aspect) * 24 : 0; // tall screens need more sideways view at boat height
      const fov = 48 + portrait * (1 - high) - 12 * high;
      if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
      // keep depth precision where the camera is
      const near = Math.max(0.6, Math.min(12, h * 0.04));
      if (Math.abs(near - camera.near) > 0.05) { camera.near = near; camera.updateProjectionMatrix(); }
    },
  };
}
