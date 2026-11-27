import { unflat } from '../geo/buf.ts';
import type { HueData, Vec2 } from '../types.ts';

// Minimal road/aquarium footprint helpers for Hồ Thủy Tiên, kept in a tiny standalone module so
// src/geo/city-roads.ts can skip the three dragon footbridges without pulling thuytien.ts + thuytien-dragon.ts
// into the eager initial bundle.

export interface ThuyTienSiteItem {
  id: number | string;
  k: string;
  n?: string;
  ring: number[];
  pts: Vec2[];
}

export interface AquariumBridgeWay {
  flat: number[];
  ends: [Vec2, Vec2];
  dists: [number, number];
}

export function centroid(ring: Vec2[]): Vec2 {
  let sx = 0, sz = 0, twiceArea = 0;
  for (let i = 0, count = ring.length; i < count; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % count];
    const cross = ptA[0] * ptB[1] - ptB[0] * ptA[1];
    twiceArea += cross;
    sx += (ptA[0] + ptB[0]) * cross;
    sz += (ptA[1] + ptB[1]) * cross;
  }
  return twiceArea ? [sx / (3 * twiceArea), sz / (3 * twiceArea)] : ring[0];
}

export const aquariumOf = (items: ThuyTienSiteItem[]) =>
  items.find((item) => item.k === 'b' && /dragon|aquarium/i.test(item.n || ''));

export const aquariumDisc = (aq: ThuyTienSiteItem) => {
  const center = centroid(aq.pts);
  const radius = Math.max(
    9,
    aq.pts.reduce((sum, pt) => sum + Math.hypot(pt[0] - center[0], pt[1] - center[1]), 0) / aq.pts.length,
  );
  return { center, radius };
};

export function aquariumBridges(roads: any[] | undefined, center: Vec2, radius: number): AquariumBridgeWay[] {
  const out: AquariumBridgeWay[] = [];
  for (const road of roads || []) {
    if (!Array.isArray(road) || !road[1]) continue;
    const flat = road[2];
    if (!Array.isArray(flat) || flat.length < 4) continue;
    const ends: [Vec2, Vec2] = [[flat[0] / 10, flat[1] / 10], [flat[flat.length - 2] / 10, flat[flat.length - 1] / 10]];
    const dists: [number, number] = [
      Math.hypot(ends[0][0] - center[0], ends[0][1] - center[1]),
      Math.hypot(ends[1][0] - center[0], ends[1][1] - center[1]),
    ];
    if (Math.min(dists[0], dists[1]) < radius + 14) out.push({ flat, ends, dists });
  }
  return out;
}

export function thuyTienBridgeRoads(data: HueData | null | undefined): Set<number[]> {
  const site = data && data.sites && data.sites.thuytien;
  const aq = site && aquariumOf((site.items || []).map((item: any) => ({ ...item, pts: unflat(item.ring) })));
  if (!aq) return new Set();
  const { center, radius } = aquariumDisc(aq);
  return new Set(aquariumBridges(data.roads, center, radius).map((bridge) => bridge.flat));
}

export const thuytienWays = thuyTienBridgeRoads;
