import * as THREE from 'three';
import { MOODS, SUN_DIRS } from '../config.ts';
import { shared } from '../geo/materials.ts';

const COLOR_KEYS = ['skyTop', 'skyHorizon', 'skyBelow', 'sunGlow', 'fog', 'sunColor', 'hemiSky', 'hemiGround', 'waterDeep', 'waterShallow'] as const;
const NUM_KEYS = ['fogDensity', 'sunI', 'hemiI', 'hemiEnv', 'envI', 'shadow', 'glow', 'exposure', 'sunDisk'] as const;

const MOOD_CFG = {
  initialFogDensity: 0.0001,
  inkSunReduction: 0.22,
  inkShadowReduction: 0.25,
  inkHemiBoost: 0.45,
  windBase: 0.55,
  windRainBoost: 1.1,
  rainVisibleThreshold: 0.01,
  defaultShowerSeconds: 55,
  settleEpsilon: 0.002,
  timeLerpRate: 1.3,
  rainStartRate: 0.9,
  rainClearRate: 0.5,
  rainTintDay: [0.8, 0.85, 0.92] as const,
  rainTintNight: [0.55, 0.6, 0.8] as const,
} as const;

const presets: Record<string, any> = {};
for (const [name, moodDef] of Object.entries(MOODS)) {
  presets[name] = { ...moodDef };
  for (const key of COLOR_KEYS) presets[name][key] = new THREE.Color((moodDef as any)[key]);
}

// Two independent dials: time of day (0 morning → 1 afternoon → 2 evening) and rain (0..1).
export function createMood({ scene, renderer, sun, hemi, sky, water, rain, ibl = null }: any) {
  // the model opens at golden hour (1); 0 is the morning, 2 the evening
  const state = { time: 1, rain: 0, timeTarget: 1, rainTarget: 0, showerEnds: 0, look: 0 }; // look: 0 realistic, 1 illustrated
  const cur: Record<string, any> = {};
  for (const key of COLOR_KEYS) cur[key] = new THREE.Color();

  const clearColor = new THREE.Color();
  const rainColor = new THREE.Color();
  const dirs: Record<string, THREE.Vector3> = Object.fromEntries(
    Object.entries(SUN_DIRS).map(([key, vec]) => [key, new THREE.Vector3(...(vec as [number, number, number])).normalize()]),
  );
  const sunDir = dirs.day.clone();
  scene.fog = new THREE.FogExp2(0xffffff, MOOD_CFG.initialFogDensity);
  sky.uniforms.uSunDir.value.copy(sunDir);
  for (const waterUniforms of water.sets) waterUniforms.uSunDir.value.copy(sunDir);

  function interpolateMood() {
    const rainMix = state.rain;
    const isLate = state.time > 1;
    const phaseMix = isLate ? state.time - 1 : state.time;
    const clearFrom = isLate ? presets.afternoon : presets.day;
    const clearTo = isLate ? presets.night : presets.afternoon;
    const rainFrom = presets.rain;
    const rainTo = isLate ? presets.nightRain : presets.rain;

    for (const key of COLOR_KEYS) {
      clearColor.copy(clearFrom[key]).lerp(clearTo[key], phaseMix);
      rainColor.copy(rainFrom[key]).lerp(rainTo[key], phaseMix);
      cur[key].copy(clearColor).lerp(rainColor, rainMix);
    }
    for (const key of NUM_KEYS) {
      const clearVal = clearFrom[key] + (clearTo[key] - clearFrom[key]) * phaseMix;
      const rainVal = rainFrom[key] + (rainTo[key] - rainFrom[key]) * phaseMix;
      cur[key] = clearVal + (rainVal - clearVal) * rainMix;
    }
    sunDir.copy(isLate ? dirs.afternoon : dirs.day).lerp(isLate ? dirs.night : dirs.afternoon, phaseMix).normalize();
    return { rainMix, nightMix: isLate ? phaseMix : 0 };
  }

  function apply() {
    const { rainMix, nightMix } = interpolateMood();
    const inkMix = state.look;

    sky.uniforms.uSunDir.value.copy(sunDir);
    for (const waterUniforms of water.sets) waterUniforms.uSunDir.value.copy(sunDir);

    scene.fog.color.copy(cur.fog);
    scene.fog.density = cur.fogDensity;
    sun.color.copy(cur.sunColor);
    // the illustrated look is lit evenly, like a drawing: less sun, more fill, shade laid in as a light wash
    sun.intensity = cur.sunI * (1 - MOOD_CFG.inkSunReduction * inkMix);
    sun.shadow.intensity = cur.shadow * (1 - MOOD_CFG.inkShadowReduction * inkMix);
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = (ibl ? cur.hemiEnv : cur.hemiI) * (1 + MOOD_CFG.inkHemiBoost * inkMix);
    if (ibl) scene.environmentIntensity = cur.envI;
    renderer.toneMappingExposure = cur.exposure;

    const skyUniforms = sky.uniforms;
    skyUniforms.uTop.value.copy(cur.skyTop);
    skyUniforms.uHorizon.value.copy(cur.skyHorizon);
    skyUniforms.uBelow.value.copy(cur.skyBelow);
    skyUniforms.uGlow.value.copy(cur.sunGlow);
    skyUniforms.uFog.value.copy(cur.fog);
    skyUniforms.uSunDisk.value = cur.sunDisk;
    skyUniforms.uHaze.value = rainMix;

    for (const waterUniforms of water.sets) {
      waterUniforms.uDeep.value.copy(cur.waterDeep);
      waterUniforms.uShallow.value.copy(cur.waterShallow);
      waterUniforms.uSkyTop.value.copy(cur.skyTop);
      waterUniforms.uSkyHorizon.value.copy(cur.skyHorizon);
      waterUniforms.uSunCol.value.copy(cur.sunColor);
      waterUniforms.uSunDisk.value = cur.sunDisk;
      waterUniforms.uFog.value.copy(cur.fog);
      waterUniforms.uFogDensity.value = cur.fogDensity;
      waterUniforms.uRain.value = rainMix;
      waterUniforms.uGlow.value = cur.glow;
      waterUniforms.uLook.value = inkMix;
    }

    shared.uGlow.value = cur.glow;
    shared.uWet.value = rainMix;
    shared.uSunDir.value.copy(sunDir);
    shared.uSunI.value = cur.sunI * cur.sunDisk;
    shared.uWind.value = MOOD_CFG.windBase + rainMix * MOOD_CFG.windRainBoost;

    rain.uniforms.uRain.value = rainMix;
    rain.mesh.visible = rainMix > MOOD_CFG.rainVisibleThreshold;
    rain.uniforms.uTint.value
      .setRGB(...MOOD_CFG.rainTintDay)
      .lerp(clearColor.setRGB(...MOOD_CFG.rainTintNight), nightMix);
  }

  const listeners = new Set<(state: any) => void>();
  const emit = () => listeners.forEach((fn) => fn(state));
  let simTime = 0;

  return {
    state,
    cur,
    sunDir,
    onChange: (fn: (state: any) => void) => listeners.add(fn),
    setTime(index: number) { state.timeTarget = Math.max(0, Math.min(2, index)); emit(); },
    // A shower passes on its own unless the visitor ends it first.
    setRain(on: boolean, seconds = MOOD_CFG.defaultShowerSeconds) {
      state.rainTarget = on ? 1 : 0;
      state.showerEnds = on ? simTime + seconds : 0;
      emit();
    },
    update(dt: number, time: number) {
      simTime = time;
      if (state.rainTarget && state.showerEnds && time > state.showerEnds) {
        state.rainTarget = 0;
        state.showerEnds = 0;
        emit();
      }
      const approach = (current: number, target: number, rate: number) => (
        Math.abs(target - current) < MOOD_CFG.settleEpsilon ? target : current + (target - current) * Math.min(1, dt * rate)
      );
      state.time = approach(state.time, state.timeTarget, MOOD_CFG.timeLerpRate);
      state.rain = approach(state.rain, state.rainTarget, state.rainTarget ? MOOD_CFG.rainStartRate : MOOD_CFG.rainClearRate);
      sky.uniforms.uTime.value = time;
      for (const waterUniforms of water.sets) waterUniforms.uTime.value = time;
      rain.uniforms.uTime.value = time;
      shared.uTime.value = time;
      apply();
      if (ibl) ibl.update(cur, sunDir, dt);
    },
  };
}
