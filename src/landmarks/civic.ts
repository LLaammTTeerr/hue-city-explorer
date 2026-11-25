import { KIND, unflat } from '../geo/buf.ts';
import { replaced } from './places/index.ts';
import { fence, roadsNear, buildingsNear, FENCE } from './enclosure.ts';

// Outer enclosure walls of the Thế Miếu and Hưng Miếu compounds inside the Imperial City.
// (All standalone civic landmarks — Ga Huế, Phủ Cam, DCCT, An Định, Diệu Đế, Hiển Lâm Các,
// Vincom Plaza, and Tứ Phương Vô Sự — now live in their own files under src/landmarks/places/.)
const TEMPLE_WALLS = [
  [true, [-12468, 2632, -12924, 2971, -13127, 2701, -13546, 2143, -13868, 1716, -13569, 1494, -13160, 1191, -12875, 979, -12553, 1407, -12137, 1960, -11934, 2230, -12384, 2564]],
  [false, [-13352, 1999, -13251, 1923, -12835, 1615, -12728, 1536]],
  [true, [-13395, 1218, -12938, 881, -13064, 712, -13372, 298, -13613, 474, -14373, 1032, -13934, 1622, -13499, 1295]],
];

export function buildCivic(data, S) {
  if (!data.special) return;
  const center = [-1300, 180];
  const list = Array.isArray(data.special.themieuWalls)
    ? data.special.themieuWalls.map((w) => [w.closed !== false, w.ring])
    : TEMPLE_WALLS;
  const roads = roadsNear(data, center, 220);
  const solid = buildingsNear(data, center, 200);
  const n0 = S.n;
  try {
    list.forEach(([closed, flat], i) => {
      if (!(i < 2 && replaced('themieu'))) fence(S, unflat(flat), FENCE.imperial, { closed, roads, solid });
    });
  } catch (e) {
    S.n = n0;
    console.warn('civic: templeWalls', e);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
