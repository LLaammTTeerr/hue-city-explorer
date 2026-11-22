# Đàn Nam Giao (南郊壇), the Nguyễn Esplanade of Sacrifice to Heaven and Earth

Model: `src/landmarks/places/namgiao.js`. The old compass-aligned model in `src/landmarks/south.js` `namGiao()` now
returns early when `replaced('namgiao')` is true. The new file also draws the site's leftover OSM guard house
(way 1473250838), which the old function used to draw.

## Sources
- https://vi.wikipedia.org/wiki/Đàn_Nam_Giao_(triều_Nguyễn)
  - Built in 1806 under Gia Long, south of the city in Dương Xuân; used for the Tế Giao rite until 1945.
  - Three tiers, about 4.6 m tall in all: the round Viên đàn on top (Heaven) and two square Phương đàn tiers below
    (Earth).
  - Railing colours by tier: blue on the top, yellow in the middle, red on the lowest.
  - Stairs on all four sides of each tier. The Trai Cung (fasting palace) stands at the south-west, and the precinct is
    planted with pines, many of them planted by the emperors and court.
- https://tapchisonghuong.com.vn/tin-tuc/p0/c7/n4734/ : tier sizes and heights, the Trai Cung layout (front and rear
  halls, Tả and Hữu Túc, the kitchens, a walled court with a south gate).
- https://dulichhue.biz , https://tienphong.vn/post1879344 , khamphahue.com.vn , vietnamdiscovery.com : the post stones on
  the top tier, the incense blocks and the burner (Liệu sở) and offering pit (Ế khảm), the bình phong screens on the axes.
- OpenStreetMap, from `data/raw/hue-osm-south2.json`:
  - the four esplanade lawns, which give the 13.1° rotation and the centre;
  - the pine-wood polygon, which gives the precinct (about 250 × 382 m);
  - the Trai Cung main hall, way 1174199428 (15 × 25.6 m), and the notch the compound makes in the wood;
  - the guard house, way 1473250838.

## Confirmed
- Lowest tier about 165 m square, 0.84 m high, red railing. Middle tier about 83 m square, about 1.1 m high, yellow
  railing. Top tier a circle about 40.5 m across, about 2.8 m high, blue railing.
- Stairs on all four sides of every tier, the widest flight on the south.
- The esplanade faces south and sits rotated about 13° from north (OSM).
- Trai Cung: a walled compound south-west of the altar, about 85 × 65 m, with a front and a rear hall on one platform.
  The 85 m is the north-south depth: the satellite shows the walled court about 64 m east-west by 83 m north-south on
  the 13° turn.
- The precinct wall has been mostly demolished. The grounds are pine woods.

## Estimated
- Stair widths and step counts (top 15 steps on the south and 9 elsewhere, middle 5, lowest 4).
- The layout of the 28 post stones on the top tier (8 at r 4.5 m, 20 at r 9.5 m).
- The incense blocks (two rows of six on the south walk), and where the burner and offering pit sit.
- The parapet heights and pilaster spacing, and all colours.
- The Trai Cung's buildings other than the main hall: Tả and Hữu Túc, Thượng Trà and Thượng Thiện, the south gate and
  the north opening; the wall height (2.6 m).
- The precinct edges, squared off to 265 × 390 m for the walks and the screens. The DEM runs about 4 m lower on the
  west, so the lowest tier stands on a grassed bank rather than a tall wall.

## Changed
- The old model was an illustrative, compass-aligned stack of tiers.
- The new model follows OSM: the rotated, three-tier esplanade with red, yellow and blue parapets, pilasters and stair
  flights on all sides, lawn quarters and cross walks, the Thanh-stone top with its post stones, the incense blocks,
  burner and pit.
- Added the Trai Cung compound (walls, three-opening gate, the main hall pair, side halls and kitchens), the walks to
  the precinct gates, three bình phong screens, and the guard house. The esplanade and the Trai Cung court are marked
  paved, so the generic trees (176 pines in the precinct) stay off them.

## Rebuild against the satellite (2026-11)
- The esplanade already matched the satellite to about 1 m and well under 1°; nothing moved.
- The Trai Cung was 85 m wide instead of 64 m and its north wall stood about 18 m too far south. It is now placed and
  sized from the satellite (a visual reference only, nothing traced into `data/`): the walled court, the main hall
  pair on its platform, the two long side halls, the two north-corner halls, the small south-east house, the west
  outbuilding and a stone-paved court with column-base stones behind the hall. The OSM main-hall way sits about 3.5 m
  south of the roof seen from above, so the hall follows the roof.
- The tier bodies and plinth courses are now in `S.noCover`, with only the walks as paved slabs, so the precinct's
  generic pines grow on the lowest tier and the Phương đàn as the photos show (26 in the tile density). The
  satellite canopy is denser than that.

## Left
- The precinct wall is not drawn, since it has been demolished.
- The Thần khố and Thần trù (storehouse and kitchen for the rite) are lost and not drawn.
- No north screen. No sourced overall height has been added to `docs/heights-reference.json`.
- Roof colours: the satellite shows an orange main-hall roof and grey side halls; the written source says glazed
  green-blue tiles. The model keeps green-blue until the owner decides.
- Trees on the tiers are planted at ground level, so on the raised west side they sink 2 to 4.5 m into the tier.
