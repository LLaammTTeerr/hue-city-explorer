import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { LAND_Y } from '../config.ts';
import { rise } from '../geo/terrain.ts';

const CAMERA_CFG = {
  initialFovDeg: 36,
  initialNearM: 1,
  farPlaneM: 80000,
  dampingFactor: 0.09,
  minDistanceM: 28,
  maxDistanceM: 19000,
  maxPolarDeg: 86.5,
  rotateSpeed: 0.55,
  zoomSpeed: 1.15,
  panSpeed: 1.0,
  keyPanSpeed: 22,
  autoRotateSpeed: 0.07,
  minClearanceM: 1.7,
} as const;

const RAY_TERRAIN = {
  maxDistM: 25000,
  ceilingOffsetM: 150,
  minDownSlope: -1e-4,
  coarseSteps: 48,
  bisectSteps: 8,
} as const;

const FLIGHT_CFG = {
  defaultDurationS: 2.4,
  homeDurationS: 2.6,
  zoomDurationS: 0.5,
  reducedMotionDurationS: 0.001,
  arcMaxHeightM: 420,
  arcSpanRatio: 0.16,
} as const;

const LENS_CFG = {
  lowAltM: 10,
  highAltM: 220,
  baseFovDeg: 46,
  highFovDeltaDeg: 17,
  portraitFovScale: 24,
  fovUpdateEpsDeg: 0.01,
  nearMinM: 0.6,
  nearMaxM: 12,
  nearAltRatio: 0.04,
  nearUpdateEpsM: 0.05,
} as const;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothstep = (edge0: number, edge1: number, val: number) => {
  const t = Math.max(0, Math.min(1, (val - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// A key pressed while typing, on a form control or anywhere in the search box belongs to that control, not to the map.
export const fromForm = (event: Event) => {
  const target = event.target;
  return target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input, textarea, select, #search'));
};

function intersectTerrain(ray: THREE.Ray, flatHit: THREE.Vector3) {
  const origin = ray.origin;
  const dir = ray.direction;
  const tEnd = Math.min(origin.distanceTo(flatHit), RAY_TERRAIN.maxDistM);
  const tStart = dir.y < RAY_TERRAIN.minDownSlope ? Math.max(0, (LAND_Y + RAY_TERRAIN.ceilingOffsetM - origin.y) / dir.y) : 0;
  if (tStart >= tEnd) return flatHit.clone();

  const stepSize = (tEnd - tStart) / RAY_TERRAIN.coarseSteps;
  let prevT = tStart;
  for (let i = 1; i <= RAY_TERRAIN.coarseSteps; i++) {
    const sampleT = tStart + stepSize * i;
    const px = origin.x + dir.x * sampleT;
    const py = origin.y + dir.y * sampleT;
    const pz = origin.z + dir.z * sampleT;
    if (py <= LAND_Y + rise(px, pz)) {
      let lo = prevT;
      let hi = sampleT;
      for (let j = 0; j < RAY_TERRAIN.bisectSteps; j++) {
        const mid = (lo + hi) * 0.5;
        const mx = origin.x + dir.x * mid;
        const my = origin.y + dir.y * mid;
        const mz = origin.z + dir.z * mid;
        if (my <= LAND_Y + rise(mx, mz)) hi = mid;
        else lo = mid;
      }
      const hitX = origin.x + dir.x * hi;
      const hitZ = origin.z + dir.z * hi;
      return new THREE.Vector3(hitX, LAND_Y + rise(hitX, hitZ), hitZ);
    }
    prevT = sampleT;
  }
  return flatHit.clone();
}

function updateDynamicLens(camera: THREE.PerspectiveCamera) {
  // wider lens near the ground, longer lens from the air
  const altitude = Math.max(1, camera.position.y - (LAND_Y + rise(camera.position.x, camera.position.z)));
  const highFactor = smoothstep(LENS_CFG.lowAltM, LENS_CFG.highAltM, altitude);
  const portraitBoost = camera.aspect < 1 ? (1 - camera.aspect) * LENS_CFG.portraitFovScale : 0;
  const targetFov = LENS_CFG.baseFovDeg + portraitBoost * (1 - highFactor) - LENS_CFG.highFovDeltaDeg * highFactor;
  if (Math.abs(targetFov - camera.fov) > LENS_CFG.fovUpdateEpsDeg) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }
  // keep depth precision where the camera is
  const targetNear = Math.max(LENS_CFG.nearMinM, Math.min(LENS_CFG.nearMaxM, altitude * LENS_CFG.nearAltRatio));
  if (Math.abs(targetNear - camera.near) > LENS_CFG.nearUpdateEpsM) {
    camera.near = targetNear;
    camera.updateProjectionMatrix();
  }
}

// Map-style camera: drag the ground, wheel/pinch toward the cursor, right-drag or two fingers to turn and tilt.
export function createCamera(canvas: HTMLCanvasElement, bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  const camera = new THREE.PerspectiveCamera(CAMERA_CFG.initialFovDeg, innerWidth / innerHeight, CAMERA_CFG.initialNearM, CAMERA_CFG.farPlaneM);
  const controls = new MapControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = CAMERA_CFG.dampingFactor;
  controls.screenSpacePanning = false;
  controls.zoomToCursor = true;
  controls.minDistance = CAMERA_CFG.minDistanceM;
  controls.maxDistance = CAMERA_CFG.maxDistanceM;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = THREE.MathUtils.degToRad(CAMERA_CFG.maxPolarDeg);
  controls.rotateSpeed = CAMERA_CFG.rotateSpeed;
  controls.zoomSpeed = CAMERA_CFG.zoomSpeed;
  controls.panSpeed = CAMERA_CFG.panSpeed;
  controls.keyPanSpeed = CAMERA_CFG.keyPanSpeed;
  controls.autoRotateSpeed = CAMERA_CFG.autoRotateSpeed;

  // arrow keys pan the map, but not while they move a caret, a slider or the search results
  const keyFilters = new Map();
  controls.listenToKeyEvents({
    addEventListener: (type: any, fn: any) => {
      const wrapped = (event: Event) => { if (!fromForm(event)) fn(event); };
      keyFilters.set(fn, wrapped);
      addEventListener(type, wrapped);
    },
    removeEventListener: (type: any, fn: any) => {
      removeEventListener(type, keyFilters.get(fn));
      keyFilters.delete(fn);
    },
  } as any);

  let home = { pos: new THREE.Vector3(400, 230, -420), target: new THREE.Vector3(0, LAND_Y, 0) };
  let flight: {
    p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3;
    progress: number; duration: number; arc: boolean; onDone: (() => void) | null;
  } | null = null;
  let touched = false;
  // still on the opening view (home, untouched): a resize then re-frames home; any other view is kept as it is
  let opening = true;
  const interactListeners = new Set<() => void>();

  const markTouched = () => {
    if (!touched) { touched = true; controls.autoRotate = false; }
    opening = false;
    interactListeners.forEach((fn) => fn());
  };
  controls.addEventListener('start', () => { if (flight) flight = null; markTouched(); });
  canvas.addEventListener('wheel', markTouched, { passive: true });

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -LAND_Y);
  const planeHit = new THREE.Vector3();

  function groundAt(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    if (!raycaster.ray.intersectPlane(groundPlane, planeHit)) return null;
    return intersectTerrain(raycaster.ray, planeHit);
  }

  function flyTo(pos: THREE.Vector3, target: THREE.Vector3, { duration = FLIGHT_CFG.defaultDurationS, arc = true, onDone = null }: any = {}) {
    if (reducedMotion.matches) { duration = FLIGHT_CFG.reducedMotionDurationS; arc = false; }
    opening = false; // a place, the overview or any other flight leaves the opening view
    flight = {
      p0: camera.position.clone(),
      t0: controls.target.clone(),
      p1: pos.clone(),
      t1: target.clone(),
      progress: 0,
      duration,
      arc,
      onDone,
    };
    controls.autoRotate = false;
  }

  function clampView() {
    const target = controls.target;
    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, target.x));
    const clampedZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, target.z));
    const clampedY = LAND_Y + rise(clampedX, clampedZ);
    if (clampedX !== target.x || clampedZ !== target.z || target.y !== clampedY) {
      const dx = clampedX - target.x;
      const dy = clampedY - target.y;
      const dz = clampedZ - target.z;
      target.set(clampedX, clampedY, clampedZ);
      camera.position.x += dx;
      camera.position.y += dy;
      camera.position.z += dz;
    }
    const minY = LAND_Y + rise(camera.position.x, camera.position.z) + CAMERA_CFG.minClearanceM; // stay above the hills too
    if (camera.position.y < minY) camera.position.y = minY;
  }

  const worldDir = new THREE.Vector3();
  return {
    camera,
    controls,
    groundAt,
    get flying() { return !!flight; },
    get touched() { return touched; },
    get opening() { return opening; },
    onInteract: (fn: () => void) => interactListeners.add(fn),
    setHome(pos: THREE.Vector3, target: THREE.Vector3) { home = { pos: pos.clone(), target: target.clone() }; },
    jumpHome() { camera.position.copy(home.pos); controls.target.copy(home.target); controls.update(); },
    goHome(duration = FLIGHT_CFG.homeDurationS) { flyTo(home.pos, home.target, { duration, onDone: () => { opening = true; } }); },
    startDrift() { if (!touched && !reducedMotion.matches) controls.autoRotate = true; },
    // the camera was placed by a shared link (src/ui/share.js): treat it as moved, so resize and drift leave it alone
    leaveOpening() { touched = true; opening = false; controls.autoRotate = false; },
    flyTo,
    cancelFly() { flight = null; },
    zoomBy(scaleFactor: number) {
      if (!controls.enabled) return;
      const offset = camera.position.clone().sub(controls.target).multiplyScalar(scaleFactor);
      const len = offset.length();
      if (len < controls.minDistance || len > controls.maxDistance) {
        offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, len)));
      }
      flyTo(controls.target.clone().add(offset), controls.target, { duration: FLIGHT_CFG.zoomDurationS, arc: false });
      markTouched();
    },
    // Compass bearing the camera faces, radians clockwise from north.
    heading() { camera.getWorldDirection(worldDir); return Math.atan2(worldDir.x, -worldDir.z); },
    update(dt: number, enabled = true) {
      if (flight) {
        flight.progress = Math.min(1, flight.progress + dt / flight.duration);
        const eased = easeInOutCubic(flight.progress);
        camera.position.lerpVectors(flight.p0, flight.p1, eased);
        controls.target.lerpVectors(flight.t0, flight.t1, eased);
        if (flight.arc) {
          const span = flight.p0.distanceTo(flight.p1);
          camera.position.y += Math.sin(Math.PI * eased) * Math.min(FLIGHT_CFG.arcMaxHeightM, span * FLIGHT_CFG.arcSpanRatio);
        }
        const minY = LAND_Y + rise(camera.position.x, camera.position.z) + CAMERA_CFG.minClearanceM;
        camera.position.y = Math.max(camera.position.y, minY);
        camera.lookAt(controls.target);
        if (flight.progress >= 1) {
          const done = flight.onDone;
          flight = null;
          controls.update();
          clampView();
          if (done) done();
        }
      } else if (enabled) {
        controls.update(dt);
        clampView();
      }
      updateDynamicLens(camera);
    },
  };
}
