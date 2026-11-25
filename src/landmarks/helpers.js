import * as THREE from 'three';
import { LAND_Y } from '../config.js';
import { rise } from '../geo/terrain.js';
import { lightMaterial, glowPoints } from '../geo/materials.js';

// Shared, human-readable helpers for landmark builders (src/landmarks/places/*.js).
// Eliminates repeated ground-elevation, local-frame, street-clearance, and night-glow boilerplate.

/** Scene ground elevation in metres at world (x, z). */
export function groundHeightAt(x, z) {
  return LAND_Y + rise(x, z);
}

/** Deterministic [0, 1) 2D hash for procedural variation without Math.random(). */
export function hash2D(a, b = 0) {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Deterministic Mulberry32 PRNG returning values in [0, 1). */
export function createPrng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Local 2D coordinate frame anchored at (originX, originZ) and rotated by angleRad.
 * +u runs along [cos(angleRad), sin(angleRad)]; +v runs perpendicular [-sin(angleRad), cos(angleRad)].
 */
export function createLocalFrame(originX, originZ, angleRad) {
  const axisU = [Math.cos(angleRad), Math.sin(angleRad)];
  const axisV = [-axisU[1], axisU[0]];
  const toWorld = (u, v) => [
    originX + axisU[0] * u + axisV[0] * v,
    originZ + axisU[1] * u + axisV[1] * v,
  ];
  return {
    origin: [originX, originZ],
    angle: angleRad,
    axisU,
    axisV,
    toWorld,
    box(buffer, u, v, yBottom, yTop, width, depth, color, opts) {
      const [x, z] = toWorld(u, v);
      buffer.box(x, z, yBottom, yTop, width, depth, angleRad, color, opts);
    },
    cyl(buffer, u, v, yBottom, yTop, rBottom, rTop, segs, color, opts) {
      const [x, z] = toWorld(u, v);
      buffer.cyl(x, z, yBottom, yTop, rBottom, rTop, segs, color, opts);
    },
  };
}

/**
 * Returns true if the center and all 4 corners of an oriented rectangle are clear of mapped streets.
 */
export function isFootprintClearOfStreets(onStreet, centerX, centerZ, axisU, axisV, length, width, margin = 1.0) {
  for (const [du, dv] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0, 0]]) {
    const x = centerX + axisU[0] * du * length + axisV[0] * dv * width;
    const z = centerZ + axisU[1] * du * length + axisV[1] * dv * width;
    if (onStreet(x, z, margin)) return false;
  }
  return true;
}

/**
 * Wraps a non-empty Buf of night-only emissive strips into a Mesh and adds it to the landmark's dynamic group.
 */
export function addEmissiveStripMesh(group, buffer, colorHex, boost, landmarkId) {
  if (!buffer || !buffer.n) return null;
  const mesh = new THREE.Mesh(buffer.geometry(), lightMaterial(colorHex, boost));
  mesh.renderOrder = 19;
  mesh.userData.landmark = landmarkId;
  group.add(mesh);
  return mesh;
}

/**
 * Adds a distance-clamped additive lamp halo point cloud to the landmark's dynamic group.
 */
export function addGlowPointCloud(group, positions, colors, size, landmarkId) {
  if (!positions || !positions.length) return null;
  const points = glowPoints(positions, colors, size);
  points.userData.glow = true;
  points.userData.landmark = landmarkId;
  group.add(points);
  return points;
}
