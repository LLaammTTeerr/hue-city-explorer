import * as THREE from 'three';
import { Buf, KIND, hex, shade } from '../geo/buf.ts';
import { LAND_Y } from '../config.ts';
import { rise } from '../geo/terrain.ts';
import { lightMaterial, glowPoints } from '../geo/materials.ts';
import type { RgbColor, Vec2 } from '../types.ts';

// Shared, human-readable helpers for landmark builders (src/landmarks/places/*.ts).
// Eliminates repeated ground-elevation, local-frame, street-clearance, and night-glow boilerplate.

/** Scene ground elevation in metres at world (x, z). */
export function groundHeightAt(x: number, z: number): number {
  return LAND_Y + rise(x, z);
}

/** Deterministic [0, 1) 2D hash for procedural variation without Math.random(). */
export function hash2D(a: number, b = 0): number {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Deterministic Mulberry32 PRNG returning values in [0, 1). */
export function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LocalFrame {
  origin: Vec2;
  angle: number;
  axisU: Vec2;
  axisV: Vec2;
  toWorld: (u: number, v: number) => Vec2;
  box: (buffer: Buf, u: number, v: number, yBottom: number, yTop: number, width: number, depth: number, color: number[], opts?: Record<string, any>) => void;
  cyl: (buffer: Buf, u: number, v: number, yBottom: number, yTop: number, rBottom: number, rTop: number, segs: number, color: number[], opts?: Record<string, any>) => void;
}

/**
 * Local 2D coordinate frame anchored at (originX, originZ) and rotated by angleRad.
 * +u runs along [cos(angleRad), sin(angleRad)]; +v runs perpendicular [-sin(angleRad), cos(angleRad)].
 */
export function createLocalFrame(originX: number, originZ: number, angleRad: number): LocalFrame {
  const axisU: Vec2 = [Math.cos(angleRad), Math.sin(angleRad)];
  const axisV: Vec2 = [-axisU[1], axisU[0]];
  const toWorld = (u: number, v: number): Vec2 => [
    originX + axisU[0] * u + axisV[0] * v,
    originZ + axisU[1] * u + axisV[1] * v,
  ];
  return {
    origin: [originX, originZ],
    angle: angleRad,
    axisU,
    axisV,
    toWorld,
    box(buffer, u, v, yBottom, yTop, width, depth, color, opts = {}) {
      const [x, z] = toWorld(u, v);
      buffer.box(x, z, yBottom, yTop, width, depth, angleRad, color, opts);
    },
    cyl(buffer, u, v, yBottom, yTop, rBottom, rTop, segs, color, opts = {}) {
      const [x, z] = toWorld(u, v);
      buffer.cyl(x, z, yBottom, yTop, rBottom, rTop, segs, color, opts);
    },
  };
}

/**
 * Returns true if the center and all 4 corners of an oriented rectangle are clear of mapped streets.
 */
export function isFootprintClearOfStreets(
  onStreet: (x: number, z: number, margin?: number) => boolean,
  centerX: number,
  centerZ: number,
  axisU: Vec2,
  axisV: Vec2,
  length: number,
  width: number,
  margin = 1.0,
): boolean {
  for (const [du, dv] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0, 0]] as Vec2[]) {
    const x = centerX + axisU[0] * du * length + axisV[0] * dv * width;
    const z = centerZ + axisU[1] * du * length + axisV[1] * dv * width;
    if (onStreet(x, z, margin)) return false;
  }
  return true;
}

/**
 * Wraps a non-empty Buf of night-only emissive strips into a Mesh and adds it to the landmark's dynamic group.
 */
export function addEmissiveStripMesh(
  group: THREE.Group,
  buffer: Buf | null,
  colorHex: number,
  boost: number,
  landmarkId: string,
): THREE.Mesh | null {
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
export function addGlowPointCloud(
  group: THREE.Group,
  positions: number[],
  colors: number[],
  size: number,
  landmarkId: string,
): THREE.Points | null {
  if (!positions || !positions.length) return null;
  const points = glowPoints(positions, colors, size);
  points.userData.glow = true;
  points.userData.landmark = landmarkId;
  group.add(points);
  return points;
}

const BUS_WHITE: RgbColor = hex('#efefef');
const BUS_GLASS: RgbColor = hex('#2f3b45');
const BUS_WINDSHIELD: RgbColor = hex('#1d2730');
const BUS_SIGN: RgbColor = hex('#f0c22e');
const BUS_HEADLIGHT: RgbColor = hex('#eef3f8');
const BUS_AC_REAR: RgbColor = hex('#dfe2e5');
const BUS_AC_FRONT: RgbColor = hex('#cfd4d8');
const BUS_TIRE: RgbColor = hex('#1f2124');

export interface IntercityBusOptions {
  length?: number;
  width?: number;
  height?: number;
}

/**
 * Draws a detailed Vietnamese intercity sleeper coach (livery stripe, panoramic windshield,
 * destination LED board, headlights, twin rooftop AC pods, and tires) into static buffer `S`.
 */
export function addIntercityBus(
  S: Buf,
  cx: number,
  cz: number,
  groundY: number,
  headingRad: number,
  bodyColor: number[],
  { length = 11.4, width = 2.55, height = 3.5 }: IntercityBusOptions = {},
): void {
  const fx = Math.cos(headingRad);
  const fz = Math.sin(headingRad);
  S.kind = KIND.PLAIN;
  S.box(cx, cz, groundY + 0.32, groundY + 1.16, length, width, headingRad, shade(bodyColor, 0.82));
  S.box(cx, cz, groundY + 1.16, groundY + height - 0.18, length, width, headingRad, bodyColor, { top: BUS_WHITE });
  S.box(cx, cz, groundY + 1.28, groundY + 1.5, length - 0.1, width + 0.03, headingRad, BUS_WHITE);
  S.box(cx, cz, groundY + height - 0.18, groundY + height, length - 0.35, width - 0.18, headingRad, BUS_WHITE, { top: BUS_WHITE });
  S.box(cx, cz, groundY + 1.65, groundY + height - 0.45, length - 0.35, width + 0.05, headingRad, BUS_GLASS);
  S.box(cx + fx * (length * 0.49), cz + fz * (length * 0.49), groundY + 1.2, groundY + height - 0.38, 0.14, width - 0.14, headingRad, BUS_WINDSHIELD);
  S.box(cx + fx * (length * 0.505), cz + fz * (length * 0.505), groundY + height - 0.62, groundY + height - 0.42, 0.06, width * 0.58, headingRad, BUS_SIGN);
  S.box(cx + fx * (length * 0.505), cz + fz * (length * 0.505), groundY + 0.65, groundY + 0.92, 0.06, width * 0.82, headingRad, BUS_HEADLIGHT);
  S.box(cx - fx * (length * 0.08), cz - fz * (length * 0.08), groundY + height, groundY + height + 0.28, length * 0.35, width * 0.58, headingRad, BUS_AC_REAR);
  S.box(cx + fx * (length * 0.23), cz + fz * (length * 0.23), groundY + height, groundY + height + 0.22, length * 0.16, width * 0.52, headingRad, BUS_AC_FRONT);
  for (const offset of [-length * 0.3, length * 0.3]) {
    S.box(cx + fx * offset, cz + fz * offset, groundY + 0.06, groundY + 0.88, 0.92, width + 0.06, headingRad, BUS_TIRE);
  }
}
