import * as THREE from 'three';
import { MOODS, SUN_DIR } from '../config.js';
import { shared } from '../geo/materials.js';

const COLOR_KEYS = ['skyTop', 'skyHorizon', 'sunGlow', 'fog', 'sunColor', 'hemiSky', 'hemiGround', 'waterDeep', 'waterShallow'];
const NUM_KEYS = ['fogDensity', 'sunI', 'hemiI', 'shadow', 'glow', 'exposure', 'sunDisk'];
const presets = {};
for (const [name, m] of Object.entries(MOODS)) {
  presets[name] = { ...m };
  for (const k of COLOR_KEYS) presets[name][k] = new THREE.Color(m[k]);
}

// Two independent dials — evening (0..1) and rain (0..1) — blended bilinearly between four presets.
export function createMood({ scene, renderer, sun, hemi, sky, water, rain }) {
  const state = { night: 0, rain: 0, nightTarget: 0, rainTarget: 0, showerEnds: 0 };
  const cur = {};
  for (const k of COLOR_KEYS) cur[k] = new THREE.Color();
  const a = new THREE.Color(), b = new THREE.Color();
  const sunDir = new THREE.Vector3(...SUN_DIR).normalize();
  scene.fog = new THREE.FogExp2(0xffffff, 0.0001);
  sky.uniforms.uSunDir.value.copy(sunDir);
  water.uniforms.uSunDir.value.copy(sunDir);

  function apply() {
    const n = state.night, r = state.rain;
    const P = presets;
    for (const k of COLOR_KEYS) {
      a.copy(P.day[k]).lerp(P.night[k], n);
      b.copy(P.rain[k]).lerp(P.nightRain[k], n);
      cur[k].copy(a).lerp(b, r);
    }
    for (const k of NUM_KEYS) {
      const x = P.day[k] + (P.night[k] - P.day[k]) * n, y = P.rain[k] + (P.nightRain[k] - P.rain[k]) * n;
      cur[k] = x + (y - x) * r;
    }
    scene.fog.color.copy(cur.fog);
    scene.fog.density = cur.fogDensity;
    sun.color.copy(cur.sunColor);
    sun.intensity = cur.sunI;
    sun.shadow.intensity = cur.shadow;
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.hemiI;
    renderer.toneMappingExposure = cur.exposure;
    const su = sky.uniforms;
    su.uTop.value.copy(cur.skyTop); su.uHorizon.value.copy(cur.skyHorizon); su.uGlow.value.copy(cur.sunGlow); su.uFog.value.copy(cur.fog);
    su.uSunDisk.value = cur.sunDisk; su.uHaze.value = r;
    const wu = water.uniforms;
    wu.uDeep.value.copy(cur.waterDeep); wu.uShallow.value.copy(cur.waterShallow);
    wu.uSkyTop.value.copy(cur.skyTop); wu.uSkyHorizon.value.copy(cur.skyHorizon);
    wu.uSunCol.value.copy(cur.sunColor); wu.uSunDisk.value = cur.sunDisk;
    wu.uFog.value.copy(cur.fog); wu.uFogDensity.value = cur.fogDensity; wu.uRain.value = r; wu.uGlow.value = cur.glow;
    shared.uGlow.value = cur.glow;
    rain.uniforms.uRain.value = r;
    rain.mesh.visible = r > 0.01;
    rain.uniforms.uTint.value.setRGB(0.8, 0.85, 0.92).lerp(a.setRGB(0.55, 0.6, 0.8), n);
  }

  const listeners = new Set();
  const emit = () => listeners.forEach((f) => f(state));

  return {
    state, cur, sunDir,
    onChange: (f) => listeners.add(f),
    setNight(on) { state.nightTarget = on ? 1 : 0; emit(); },
    // A shower passes on its own unless the visitor ends it first.
    setRain(on, seconds = 55) { state.rainTarget = on ? 1 : 0; state.showerEnds = on ? performance.now() + seconds * 1000 : 0; emit(); },
    update(dt, time) {
      if (state.rainTarget && state.showerEnds && performance.now() > state.showerEnds) { state.rainTarget = 0; state.showerEnds = 0; emit(); }
      const step = (v, t, rate) => (Math.abs(t - v) < 0.002 ? t : v + (t - v) * Math.min(1, dt * rate));
      state.night = step(state.night, state.nightTarget, 1.1);
      state.rain = step(state.rain, state.rainTarget, state.rainTarget ? 0.9 : 0.5);
      sky.uniforms.uTime.value = time;
      water.uniforms.uTime.value = time;
      rain.uniforms.uTime.value = time;
      shared.uTime.value = time;
      apply();
    },
  };
}
