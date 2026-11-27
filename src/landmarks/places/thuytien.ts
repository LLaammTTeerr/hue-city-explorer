import { buildThuyTien } from '../thuytien.ts';
import type { PlaceBuildContext } from '../../types.ts';

// Hồ Thủy Tiên, the water park abandoned in the pines of Thủy Bằng, as it stands in 2026: the lake, the three-storey
// aquarium on its piles with the 20 m concrete dragon coiled round it (kept as the park's landmark when the site was
// cleaned up and reopened as a public park in 2025), the footbridges, the amphitheatre and its show pool, the slide
// tower and pools, the sculpture plazas, the relaid lakeside walk with its LED lamps. The drawing lives in
// landmarks/thuytien.ts (footbridge road test in landmarks/thuytien-ways.ts); see docs/places/thuytien.md.
export const id = 'thuytien';

export function build({ data, S, group }: PlaceBuildContext) {
  buildThuyTien(data, S, group);
}
