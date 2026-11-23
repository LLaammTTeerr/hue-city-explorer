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
- The king's stand is on the north arc (vi.wikipedia: the stand "faces the south-east"). Google satellite (2026)
  shows its pale floor as a block about 8-10 m wide standing ~2.5 m out from the outer foot at a bearing of about
  -8 deg, with the two stairs as short radial flights against its flanks at about -22 and +7 deg. The car Street
  View from the north lane shows the east flight head-on (lime cheeks, capped posts) and the stand's face to its
  right as plain wall, its top about level with the outer wall. The stair on the left (24 steps) was for the king
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
- The front bearing FRONT = -0.14 rad (from the satellite; earlier -0.5 rad, a guess from the OSM paths). The
  stairs are at FRONT ±0.27 rad, 24 steps of 0.24 m run. The stand block is 7.8 m wide and reaches R 24.6 m.
- The ring centre stays at the OSM fit: the satellite puts the outer foot's centre within ~1 m of it (north-east).
- The elephant gate (GATE = -1.15 rad, WNW): the stand's north face shows no arch in Street View, so the gate is put
  on the short block the satellite shows standing out of the west-north-west arc. No source gives its bearing.
- The cage spacing (±0.3 rad around south), door sizes, and the larger cage on the east.
- The gate's form: a brick block, pillars, and an arch with a grille.
- The stand: a block standing out from the wall, its floor level with the inner wall walk, with a parapet to the
  arena and an iron railing.
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

- Google re-alignment (2026): the stand, stairs and gate turned from the north-west to the satellite's layout (see
  above). The data build keeps way 870617584 out of a sector round the stand and stairs (`CLEAR_SECTORS` in
  scripts/build-data.mjs), since the east stair's foot now stands where the way was pushed to.

## Left / not confirmed
- The brief asked for a "royal box with its roof". No source or photo shows a
  roof over the king's stand, so it is modelled as an open platform with a railing.
- The exact radii, the gate and stair bearings, and the cage sizes are estimates.
  So is whether some cages were for elephants.
- The tiger-face spout carving and the "Hổ Quyền" inscription are not modelled in detail.

## Polish
Walls toned to the darker grey-brown seen in sv-sw; pale grey-white iron handrails added up both stairs (seen at the stair head in sv-nw).

## Review fixes (north front rebuilt from close car Street View)
Two close car panos from the north yard (about 12 m and 20 m from the stand) and the satellite replace the earlier
guesses made from the far north-west pano:
- The stand: bearing -10.5 deg (satellite; Street View -10.4), 8.4 m wide, face 24.4 m from the centre. Its top is a
  grey lime chequer-lattice parapet about 1 m high with lotus-capped posts at the corners and between, rising above
  the ring's own parapet; a small framed plaque sits on the north face under the cornice. No iron railing.
  The stand floor is just above the outer wall top, with a short flight up to a railed dais on the inner wall.
- The east (left, the king's) flight climbs south along the stand's east flank: lime cheeks on both sides, capped
  posts at its foot about 1 m north of the stand face (the satellite shows the strip against the flank; the
  pano shows its treads climbing away from the yard). The west (right, the officials') flight runs tangentially
  along the ring from -34 deg down to -52 deg: one sloping lime cheek over a solid brick side (seen side-on in the
  12 m pano), matching the diagonal strip hugging the ring on the satellite.
- The doorway: a dark opening between two grey lime pillars in the ring wall at -29.5 deg, between the stand and
  the head of the west flight (both panos). It replaces the guessed WNW gate block at -66 deg.
- Brick: weathered grey-brown drawn in small cells with ochre washes and dark streaks instead of the generic
  masonry courses; stair treads grey-brown; the apron grey. The pale "handrails" were the lime cheeks and are gone.
- Cages: spread over about 23 m of the south wall walk (offsets +-0.6 rad), as on the satellite.
- Not changed: the real ground on the north rises toward the arena, so less wall shows from the yard than in the
  model; that is terrain, not this file. The far rail behind the stand in Street View is read as the dais rail.
