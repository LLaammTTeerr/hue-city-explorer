import * as THREE from 'three';
import { MOODS, SUN_DIRS } from '../config.ts';
import { shared } from '../geo/materials.ts';

const COLOR_KEYS = ['skyTop', 'skyHorizon', 'skyBelow', 'sunGlow', 'fog', 'sunColor', 'hemiSky', 'hemiGround', 'waterDeep', 'waterShallow'] as const;
const NUM_KEYS = ['fogDensity', 'sunI', 'hemiI', 'hemiEnv', 'envI', 'shadow', 'glow', 'exposure', 'sunDisk'] as const;
const presets: Record<string, any> = {};
for (const [name, m] of Object.entries(MOODS)) {
  presets[name] = { ...m };
  for (const k of COLOR_KEYS) presets[name][k] = new THREE.Color((m as any)[k]);
}

// Two independent dials: time of day (0 morning → 1 afternoon → 2 evening) and rain (0..1).
export function createMood({ scene, renderer, sun, hemi, sky, water, rain, ibl = null }: any) {
  // the model opens at golden hour (1); 0 is the morning, 2 the evening
  const state = { time: 1, rain: 0, timeTarget: 1, rainTarget: 0, showerEnds: 0, look: 0 }; // look: 0 realistic, 1 illustrated
  const cur: Record<string, any> = {};
  for (const k of COLOR_KEYS) cur[k] = new THREE.Color();
  const a = new THREE.Color(), b = new THREE.Color();
  const dirs: Record<string, THREE.Vector3> = Object.fromEntries(Object.entries(SUN_DIRS).map(([k, v]) => [k, new THREE.Vector3(...(v as [number, number, number])).normalize()]));
  const sunDir = dirs.day.clone();
  scene.fog = new THREE.FogExp2(0xffffff, 0.0001);
  sky.uniforms.uSunDir.value.copy(sunDir);
  for (const wu of water.sets) wu.uSunDir.value.copy(sunDir);

  function apply() {
    const r = state.rain;
    const late = state.time > 1;
    const k = late ? state.time - 1 : state.time;
    const P = presets;
    const A = late ? P.afternoon : P.day, B = late ? P.night : P.afternoon;
    const RA = P.rain, RB = late ? P.nightRain : P.rain;
    const n = late ? k : 0; // how far into evening
    for (const key of COLOR_KEYS) {
      a.copy(A[key]).lerp(B[key], k);
      b.copy(RA[key]).lerp(RB[key], k);
      cur[key].copy(a).lerp(b, r);
    }
    for (const key of NUM_KEYS) {
      const x = A[key] + (B[key] - A[key]) * k, y = RA[key] + (RB[key] - RA[key]) * k;
      cur[key] = x + (y - x) * r;
    }
    sunDir.copy(late ? dirs.afternoon : dirs.day).lerp(late ? dirs.night : dirs.afternoon, k).normalize();
    sky.uniforms.uSunDir.value.copy(sunDir);
    for (const wu of water.sets) wu.uSunDir.value.copy(sunDir);
    scene.fog.color.copy(cur.fog);
    scene.fog.density = cur.fogDensity;
    sun.color.copy(cur.sunColor);
    // the illustrated look is lit evenly, like a drawing: less sun, more fill, shade laid in as a light wash
    const ink = state.look;
    sun.intensity = cur.sunI * (1 - 0.22 * ink);
    sun.shadow.intensity = cur.shadow * (1 - 0.25 * ink);
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = (ibl ? cur.hemiEnv : cur.hemiI) * (1 + 0.45 * ink);
    if (ibl) scene.environmentIntensity = cur.envI;
    renderer.toneMappingExposure = cur.exposure;
    const su = sky.uniforms;
    su.uTop.value.copy(cur.skyTop); su.uHorizon.value.copy(cur.skyHorizon); su.uBelow.value.copy(cur.skyBelow); su.uGlow.value.copy(cur.sunGlow); su.uFog.value.copy(cur.fog);
    su.uSunDisk.value = cur.sunDisk; su.uHaze.value = r;
    for (const wu of water.sets) {
      wu.uDeep.value.copy(cur.waterDeep); wu.uShallow.value.copy(cur.waterShallow);
      wu.uSkyTop.value.copy(cur.skyTop); wu.uSkyHorizon.value.copy(cur.skyHorizon);
      wu.uSunCol.value.copy(cur.sunColor); wu.uSunDisk.value = cur.sunDisk;
      wu.uFog.value.copy(cur.fog); wu.uFogDensity.value = cur.fogDensity; wu.uRain.value = r; wu.uGlow.value = cur.glow; wu.uLook.value = ink;
    }
    shared.uGlow.value = cur.glow;
    shared.uWet.value = r;
    shared.uSunDir.value.copy(sunDir);
    shared.uSunI.value = cur.sunI * cur.sunDisk;
    shared.uWind.value = 0.55 + r * 1.1;
    rain.uniforms.uRain.value = r;
    rain.mesh.visible = r > 0.01;
    rain.uniforms.uTint.value.setRGB(0.8, 0.85, 0.92).lerp(a.setRGB(0.55, 0.6, 0.8), n);
  }

  const listeners = new Set<(s: any) => void>();
  const emit = () => listeners.forEach((f) => f(state));
  let simTime = 0;

  return {
    state, cur, sunDir,
    onChange: (f) => listeners.add(f),
    setTime(i) { state.timeTarget = Math.max(0, Math.min(2, i)); emit(); },
    // A shower passes on its own unless the visitor ends it first.
    setRain(on, seconds = 55) { state.rainTarget = on ? 1 : 0; state.showerEnds = on ? simTime + seconds : 0; emit(); },
    update(dt, time) {
      simTime = time;
      if (state.rainTarget && state.showerEnds && time > state.showerEnds) { state.rainTarget = 0; state.showerEnds = 0; emit(); }
      const step = (v, t, rate) => (Math.abs(t - v) < 0.002 ? t : v + (t - v) * Math.min(1, dt * rate));
      state.time = step(state.time, state.timeTarget, 1.3);
      state.rain = step(state.rain, state.rainTarget, state.rainTarget ? 0.9 : 0.5);
      sky.uniforms.uTime.value = time;
      for (const wu of water.sets) wu.uTime.value = time;
      rain.uniforms.uTime.value = time;
      shared.uTime.value = time;
      apply();
      if (ibl) ibl.update(cur, sunDir, dt);
    },
  };
}
