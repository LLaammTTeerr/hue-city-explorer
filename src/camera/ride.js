import * as THREE from 'three';
import { LAND_Y } from '../config.js';

// The signature move: come down from the citywide view onto a dragon boat, slip under a span
// of cầu Trường Tiền heading up-river into the light, then turn and lift back over the north
// bank until the Citadel wall, the bridge and the market line up from the other side.
export function createRide({ rig, bridge, boats, places }) {
  const { camera, controls } = rig;
  const DURATION = 40;
  const c = bridge.centre, d = bridge.dir;
  const up = [-d[1], d[0]].map((v) => v * (-d[1] * -0.682 + d[0] * 0.731 > 0 ? 1 : -1)); // up-river (south-west)
  const lane = [c[0] - d[0] * bridge.span * 0.5, c[1] - d[1] * bridge.span * 0.5]; // middle of the third span from the north bank
  const P = (alongUp, towardNorth, y) => new THREE.Vector3(lane[0] + up[0] * alongUp - d[0] * towardNorth, y, lane[1] + up[1] * alongUp - d[1] * towardNorth);
  const eye = 3.3; // standing height on the foredeck; the span's underside is about a metre above
  const gate = places.thuongtu || [-498, -101];

  const endPos = new THREE.Vector3(gate[0] - 330, 205, gate[1] + 175);
  const endLook = new THREE.Vector3(c[0] - 150, LAND_Y, c[1] - 120);

  let state = null;
  const listeners = new Set();
  const emit = (type) => listeners.forEach((f) => f(type, api));
  const tmp = new THREE.Vector3(), look = new THREE.Vector3();
  const lookOff = { yaw: 0, pitch: 0, dragging: false, x: 0, y: 0 };

  function build() {
    const pos = [
      camera.position.clone(),
      P(-330, 0, 64),
      P(-215, 0, 9.5),
      P(-125, 0, eye + 0.2),
      P(-40, 0, eye),
      P(55, 0, eye),
      P(150, 6, eye + 1.2),
      P(238, 78, 34),
      new THREE.Vector3((gate[0] + lane[0]) / 2 - 120, 118, (gate[1] + lane[1]) / 2 + 150),
      endPos.clone(),
    ];
    const looks = [
      controls.target.clone(),
      P(0, 0, 9),
      P(110, 0, 8),
      P(260, 0, 9),
      P(420, 0, 9),
      P(520, 30, 10),
      P(170, 250, 14),
      new THREE.Vector3(c[0] - d[0] * bridge.length * 0.42, 12, c[1] - d[1] * bridge.length * 0.42),
      new THREE.Vector3(c[0] - 60, 8, c[1] - 60),
      endLook.clone(),
    ];
    return { pos: new THREE.CatmullRomCurve3(pos, false, 'catmullrom', 0.5), look: new THREE.CatmullRomCurve3(looks, false, 'catmullrom', 0.5) };
  }

  const warp = (t) => { const s = t * t * (3 - 2 * t); return t * 0.55 + s * 0.45; };

  function place(t) {
    const u = warp(Math.max(0, Math.min(1, t)));
    state.curves.pos.getPoint(u, camera.position);
    state.curves.look.getPoint(u, look);
    if (camera.position.y < eye) camera.position.y = eye;
    // free look: the visitor can turn their head, and it eases back
    tmp.copy(look).sub(camera.position);
    const dist = tmp.length();
    let yaw = Math.atan2(tmp.x, tmp.z) + lookOff.yaw;
    let pitch = Math.asin(tmp.y / dist) + lookOff.pitch;
    pitch = Math.max(-1.2, Math.min(0.9, pitch));
    tmp.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(camera.position);
    camera.lookAt(tmp);

    // the boat waits on the lane, carries the camera under the bridge, then keeps going up-river
    const s = (camera.position.x - lane[0]) * up[0] + (camera.position.z - lane[1]) * up[1];
    const aboard = camera.position.y < 6 && s > -140;
    if (aboard) state.boatS = s - 3.4;
    else if (s > 100) state.boatS += state.lastDt * 17;
    else state.boatS = -125 - 3.4;
    const b = boats.rideBoat;
    b.visible = true;
    b.position.set(lane[0] + up[0] * state.boatS, Math.sin(performance.now() * 0.0011) * 0.05, lane[1] + up[1] * state.boatS);
    b.rotation.set(0, Math.atan2(-up[1], up[0]), 0);
  }

  function finish() {
    if (!state) return;
    state = null;
    lookOff.yaw = lookOff.pitch = 0;
    camera.getWorldDirection(tmp);
    // hand the camera back with its target on the ground ahead
    const k = (LAND_Y - camera.position.y) / Math.min(-0.05, tmp.y);
    controls.target.copy(camera.position).addScaledVector(tmp, Math.min(k, 1500));
    controls.target.y = LAND_Y;
    controls.enabled = true;
    controls.update();
    emit('end');
  }

  const api = {
    duration: DURATION,
    get active() { return !!state; },
    get progress() { return state ? state.t : 0; },
    on: (f) => listeners.add(f),
    start() {
      if (state) return;
      rig.cancelFly();
      controls.enabled = false;
      controls.autoRotate = false;
      state = { t: 0, curves: build(), boatS: -130, lastDt: 0, scrubbing: false };
      emit('start');
    },
    // Leaving early skips to the closing view rather than stranding the camera at water level.
    exit() {
      if (!state) return;
      const fromLow = camera.position.y < 60;
      finish();
      boats.rideBoat.visible = fromLow;
      rig.flyTo(endPos, endLook, { duration: 2.4, arc: fromLow });
    },
    seek(t, scrubbing) { if (state) { state.t = Math.max(0, Math.min(1, t)); state.scrubbing = scrubbing; } },
    look(dx, dy) { lookOff.yaw -= dx * 0.004; lookOff.pitch -= dy * 0.003; lookOff.yaw = Math.max(-2.4, Math.min(2.4, lookOff.yaw)); lookOff.pitch = Math.max(-0.8, Math.min(0.8, lookOff.pitch)); },
    setDragging(v) { lookOff.dragging = v; },
    update(dt) {
      if (!state) return;
      state.lastDt = dt;
      if (!state.scrubbing) state.t += dt / DURATION;
      if (!lookOff.dragging) { const k = Math.exp(-dt * 1.6); lookOff.yaw *= k; lookOff.pitch *= k; }
      place(state.t);
      emit('tick');
      if (state.t >= 1) { place(1); finish(); }
    },
  };
  return api;
}
