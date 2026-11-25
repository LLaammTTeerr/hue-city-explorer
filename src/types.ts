import type * as THREE from 'three';
import type { Buf } from './geo/buf.ts';

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type RgbColor = [number, number, number];

export interface PlaceRecord {
  id: string;
  name: string;
  en?: string;
  x: number;
  z: number;
  h?: number;
  a?: number;
  kind?: string;
  tier?: number;
  [key: string]: any;
}

export interface PlaceBuildContext {
  data: HueData;
  S: Buf;
  group: THREE.Group;
  place: PlaceRecord | null;
  THREE: typeof THREE;
}

export interface PlaceUpdateHandle {
  update: (time: number, glow: number, rain: number) => void;
}

export interface PlaceModule {
  id: string;
  build: (ctx: PlaceBuildContext) => PlaceUpdateHandle | void;
  joinRoofs?: boolean;
  ownsMapped?: (ring: Vec2[]) => boolean;
  deckEnds?: (data: HueData) => Array<{ p: Vec2; u: Vec2; hw: number; reach: number; id?: string }>;
  rampartCuts?: (data: HueData) => Vec2[][];
  lightAreas?: (data: HueData) => Vec2[][];
  ownWays?: (data: HueData) => (road: any) => boolean;
  clearings?: (data: HueData) => Vec2[][];
}

export interface HueData {
  places: PlaceRecord[];
  roads: any[];
  bld: any[];
  wall?: any[];
  water?: any[];
  ponds?: any[];
  green?: any[];
  trees?: any[];
  infill?: any[];
  terrain?: any;
  districts?: any;
  gates?: any[];
  riverLamps?: any[];
  [key: string]: any;
}

export interface MoodState {
  time: number;
  rain: number;
  timeTarget: number;
  rainTarget: number;
  showerEnds: number;
  look: number;
}
