/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

declare module 'polygon-clipping' {
  export type Pair = [number, number];
  export type Ring = Pair[];
  export type Polygon = Ring[];
  export type MultiPolygon = Polygon[];
  export type Geom = Polygon | MultiPolygon;

  export function union(geom: Geom, ...geoms: Geom[]): MultiPolygon;
  export function intersection(geom: Geom, ...geoms: Geom[]): MultiPolygon;
  export function xor(geom: Geom, ...geoms: Geom[]): MultiPolygon;
  export function difference(subject: Geom, ...clips: Geom[]): MultiPolygon;

  const polygonClipping: {
    union: typeof union;
    intersection: typeof intersection;
    xor: typeof xor;
    difference: typeof difference;
  };
  export default polygonClipping;
}

declare global {
  const __APP_VERSION__: string;
  const __APP_COMMIT__: string;
  interface Window {
    __hue?: Record<string, any>;
    __hueReplicas?: Record<string, any>;
  }
  var __hueReplicas: Record<string, any> | undefined;
}

export {};
