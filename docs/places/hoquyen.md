# Hổ Quyền (place id `hoquyen`)

Replica: `src/landmarks/places/hoquyen.js`. It needs no guard in `src/geo/city.js`.
The model covers the mapped building (OSM relation 19381147, 5.8 m, kind
"monument"), so the populate cover test drops it.

## What stands here
This is the royal arena for tiger-and-elephant fights at Trường Đá, Thủy Biều, built
in 1830 under Minh Mạng. It is a round brick-and-lime enclosure with two concentric
walls and a broad wall-walk between them. The king's stand is on the north side,
over the elephant gate, reached by two stairs. Five tiger cages are opposite, on
the south side. The arena was restored from late 2019 to early 2022 by the Huế
Monuments Conservation Centre: walls, stairs and the cage pulley gear.

## Sources
- https://vi.wikipedia.org/wiki/Hổ_Quyền (date, wall heights, circumference, stairs, cages)
- https://e.vnexpress.net/photo/travel/the-only-royal-arena-for-tiger-and-elephant-fights-in-vietnam-4423067.html (photos, cage captions)
- https://vtcnews.vn (Hổ Quyền articles: dimensions, restoration 2019-2022)
- https://vietnamnet.vn (Hổ Quyền restoration report)
- https://commons.wikimedia.org/wiki/Category:Hổ_Quyền (photos: wall texture, parapet lattice, gate, stair)
- OSM relation 19381147 (outer ring R ~21.2 m, inner ring R ~16.5 m)

## Confirmed
- The outer wall is ~4.75 m high and the inner wall ~5.8–5.9 m. The walls are about
  4.5 m thick together, with a walk between. The circumference is 140–145 m and the
  inner "basin" is ~44 m across in the sources.
- The outer wall face leans 10–15° (battered).
- The king's stand is on the north-west arc, facing south-east (vi.wikipedia: the stand
  "faces the south-east"; the OSM entry footway 1075016120 arrives at about -41 deg). The stair on the left (24 steps) was for the king
  and the one on the right for officials.
- Five cages are opposite the stand (one caption says 3 tiger and 2 elephant). One
  cage door is larger.
- An elephant gate leads into the ring and "Hổ Quyền" is written over it. The arena
  floor is a round lawn, and the walls have drain spouts.
- Photos show dark brick, a grey lime cornice, a parapet with a chequer lattice,
  lime gate pillars with lantern caps, an iron grille in the arch, stairs with
  lime cheeks and capped posts, and an iron railing at the stand.

## Estimates
- Outer radius 22.0 m and inner radius 17.5 m. These are a compromise between OSM
  (21.2 / 16.5) and the published 44 m diameter.
- The front bearing FRONT = -0.5 rad (NW): between the wiki's SE-facing stand, the OSM entry path
  and the lane west of the ring (way 1267047360). The stairs are at FRONT ±0.44 rad.
- The cage spacing (±0.3 rad around south), door sizes, and the larger cage on the east.
- The gate's form: a brick block, pillars, and an arch with a grille.
- The stand: a raised platform 0.5 m above the walk over ±0.36 rad, with a parapet and railing.
- The lattice pattern (240 cells, 2 rows) and the 12 spouts.
- Terrain: the ground falls ~2.5 m across the site (SW high, NE low). The lawn is
  levelled to the highest ground inside. The wall feet run down to the lowest ground
  around the site, and the apron and earth ring follow the terrain.

## What changed
- Street fix (scripts/build-data.mjs `clearMonuments`): OSM residential way 870617584 is drawn on the
  line of the perimeter footway 1075016119, ~23 m from the centre, through the outer wall (the sources'
  44 m / 140-145 m make the outer radius ~22 m). The street way was wrong, not the footprint, so the data
  build pushes it out to the outline plus half its carriageway plus 0.3 m. The stand, gate and stairs
  moved from north to FRONT (NW); the old east stair ran onto that street.
- New replica `src/landmarks/places/hoquyen.js`. It has a battered outer wall with a
  lattice parapet and the inner wall with a parapet. It also has the wall-walk, five
  south cages, the north elephant gate, two stairs, the king's stand, the lawn, and a
  paved apron with an earth ring.
- The OSM building at the site (a flat 5.8 m block) is no longer drawn.

## Left / not confirmed
- The brief asked for a "royal box with its roof". No source or photo shows a
  roof over the king's stand, so it is modelled as an open platform with a railing.
- The exact radii, the gate and stair bearings, and the cage sizes are estimates.
  So is whether some cages were for elephants.
- The tiger-face spout carving and the "Hổ Quyền" inscription are not modelled in detail.
