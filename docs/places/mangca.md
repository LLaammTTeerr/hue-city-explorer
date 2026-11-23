# Trấn Bình Đài (Mang Cá) and Trấn Bình Môn

Model: `src/landmarks/places/mangca.js` (id `mangca`). Two one-line guards hand the place over to it:
- `src/geo/city.js` `buildWalls` skips the `data.wall` pieces other than the main rampart, which are the fort's band.
- `src/landmarks/citadel.js` leaves Trấn Bình Môn out of the gate loop. It drew it as a three-arch Imperial City gate
  with a jade-roofed tower, because the generator files it as `k: 'imperial'`.

## Sources
- https://vi.wikipedia.org/wiki/Trấn_Bình_đài
  - 1805: an earth ring called đài Thái Bình. 1836 (Minh Mạng 17): rebuilt in brick and renamed Trấn Bình Đài.
  - Vauban style, the Citadel's 25th bastion, cut off from the main wall by a shared moat.
  - Perimeter 1,048 m. Wall 5.10 m high and nearly 15 m thick. A path about 7.50 m wide along the outer foot. Moat 32 m wide and 4.25 m deep.
  - Six flights of steps up the inner face, each 3.35 m wide.
  - Trường Định môn sits in the middle of the south flank: a 2 m passage under a 3 m arch, captioned as a ruin.
  - Neither Trường Định môn nor Trấn Bình Môn has a watch tower. Trấn Bình Môn is in the Citadel wall, between the Bắc Định and Đông Bình bastions, with a stone and brick bridge in front.
  - It once held 3 gun batteries, a powder store and a guard post.
- https://en.wikipedia.org/wiki/Trấn_Bình_đài: 21 gun emplacements. A PAVN base since 1975.
- https://nguoiquansat.vn/can-canh-cong-thanh-co-200-tuoi-bi-lang-quen-tai-mot-tinh-mien-trung-118875.html (Trấn Bình Môn, built 1836):
  - The wooden door is rotting and the gate is overgrown with wild plants.
  - An old, abandoned building roofed with cement tiles stands on top of it.
  - The wall beside the gate is damaged.
- OSM:
  - The fort's wall band: relation 8541343, the two pieces after the main rampart.
  - Trấn Bình Môn: way 367959083, a 35.5 × 13.4 m footprint against the Citadel wall's inner face.
  - Cầu Mang Cá: way 367959081, which starts at the gate's outer mouth and sets the passage axis.

## Confirmed and modelled
- Plan: the mapped band, hard-coded. It is about 15 m thick, as sourced, with the NW bastion, the north face, the E bastion and the south flank.
- Wall 5.10 m to the grassed walk. Brick faces weathered the same way as the Citadel rampart replica.
- Parapet on the outer edges, with the 21 embrasures shared out over the long outer faces by length.
- Six flights of steps on the inner face, 3.35 m wide.
- Trường Định môn: the mapped 11 m breach in the south flank, which a lane runs through. Drawn as a ruin: broken wall ends stepping down, jamb stumps, fallen brick.
- Trấn Bình Môn:
  - A brick block (brick-course texture, as on the Citadel wall) at the Citadel wall's height (6.6 m), grassed on top,
    on the OSM footprint moved 6 m north-west along the wall (see Estimates); the passage stays on the bridge's axis.
  - A 2 m × 3 m arched mouth with sagging, rotting wooden doors, on its city face and on the wall's outer face where the bridge lands.
  - The abandoned building on top: a plain stained lime wash with rain streaks, empty dark openings (no frames,
    shutters or arches), a grey cement-tile roof. Google's satellite (checked 2026-11) shows one long grey roof with
    square-cut ends and a ridge down its length over the whole gate block, about 36 × 10 m to the eaves, so it is a
    pitched roof closed by gables (no hips, no corner finials), over 34.4 × 8.4 m walls centred on the block.
  - Shrubs on top and creepers hanging in strands down the city face.

## Estimates
- Parapet 1.0 m high and 1.2 m thick. Embrasures 0.9 m wide.
- Positions of the six flights: the middle of the six longest inner faces.
- Building on Trấn Bình Môn: plan from the satellite; 3.1 m walls and 2.4 m roof estimated. Its colours are judged, not measured.
- The block's place along the wall: on the zoom-20 satellite the long roof's centre is about 6 m north-west of the OSM
  footprint's along the wall, while across the wall it agrees to about 1.5 m, and cầu Mang Cá, the moat and the wall
  match to 1-2 m in the same frame. The bridge axis meets the roof about 72% of the way from its north-west end. A lean
  of the image on a raised roof would shift it across the wall too, and it does not, so the footprint is moved 6 m
  north-west (`SHIFT` in the place file); the model's roof now sits within about 1 m of the satellite's.
- Roof pitch (2.0 m over the 8.4 m walls) and whether the ridge is central: the satellite's ridge line sits nearer the
  outer (north-east) eave, which may be lean or a lean-to; a central ridge is drawn.
- Whether the 2 m / 3 m passage figures belong to Trường Định môn or also to Trấn Bình Môn. The article gives them for Trường Định; the search summaries attach them to Trấn Bình. Both mouths use them.

## Not changed / left
- The gorge facing the Citadel has no mapped wall. The mapped band alone (about 1,000 m on its outer line) already matches the sourced 1,048 m perimeter, so no wall is drawn there. This is not confirmed from photos.
- The passage is not cut through the Citadel wall: that wall is `kinhthanh.js`, which cuts slots only for `citadel` gates. The mouths are drawn on the faces.
- The moat, the 7.5 m path and the bridge are left as the mapped water, ground and road.
- The barracks inside are the mapped buildings only: `scripts/build-data.mjs` keeps generated infill houses out of the
  fort (the hull of its wall pieces), which the satellite shows as open grass and fish ponds. No source gave the 1836
  interior buildings or the gun platforms.
- The fort's ground (`scripts/build-data.mjs`, `FORT_PONDS`): OSM maps its ponds as plain `natural=wetland`. Three are
  open water on the satellite (the north-west fish-pond strips, way 1568327489; the round pond, 174100376; the
  rectangular pond under floating plants, 174099525) and are laid as still water; the large oval (174095172) is reed
  and grass and stays a wetland. No garden trees or grass-scatter trees are planted in the fort (the Citadel's hull
  takes it in); the mapped scrub along the gorge keeps its trees.
- The closed roads (`highway=unclassified`, `access=no`: the dirt track from cầu Mang Cá into the fort and its way on
  through Trấn Bình Môn) are laid at the service width without kerbs; the bridge keeps its class. These are the only
  such ways in the data.
- No ground photo: of the six Google car panos near the fort, three are black and three show only houses or the lane.
  Wall colours, the openings, the building's elevation, the steps and the Trường Định ruin are estimates.
- About 5k triangles.
