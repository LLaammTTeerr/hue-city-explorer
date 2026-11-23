# Chùa Thiên Mụ (id `thienmu`)

The model is in `src/landmarks/places/thienmu.js`. The old `buildThienMu` in `src/landmarks/citadel.js` now skips through a one-line `replaced('thienmu')` guard.

## Sources
- https://vi.wikipedia.org/wiki/Chùa_Thiên_Mụ
- https://en.wikipedia.org/wiki/Thiên_Mụ_Temple
- https://vietnamnet.vn/en/inside-hue-s-425-year-old-thien-mu-pagoda-home-to-two-national-treasures-2533392.html (the turtle stele and the bell, both national treasures)
- Search summaries citing tapchicongthuong.vn and vietnamplus.vn for the stele's dimensions
- crystalbay.com travel notes on the Tam Quan gate: two storeys, eight roof faces, brick walls, a wooden upper floor
- OpenStreetMap, from the local extract `data/raw/hue-osm-west.json`:
  - Tower: way 205795043, `height=21`
  - Precinct outline: way 205794912. This is the same ring as `data.hakhe`.
  - Tam Quan: way 1205452741
  - Square stele houses: ways 1494518276 and 205794914
  - Hexagonal pavilions: ways 1494518277 and 1494518278
  - Đại Hùng Bảo Điện: way 205794919
  - Guardian halls: ways 205794917 and 1195439754
  - Halls behind: ways 205794918, 205794921, 1205452747, 1195439753, 205794915 and 205794913
  - Stupa: way 206108046
  - Footways and steps: ways 1195439748 and 1195439749

## Confirmed
- **Phước Duyên tower:** 21 m tall, seven octagonal tiers. Built in 1844 under Thiệu Trị. A Buddha stands on each tier, and a spiral stair runs inside.
- **Hương Nguyện pavilion:** stood in front of the tower and collapsed in 1904. Only its base remains.
- **Square stele houses:** two of them flank the tower and hold Thiệu Trị's steles.
- **Hexagonal pavilions:** one holds the 1715 stele on a stone turtle. The other holds the 1710 bell: about 2.5 m high, 1.4 m across, 2–3 t.
- **Turtle stele:** the stele is 2.6 × 1.2 m according to vi.wikipedia; another source gives 3.89 × 1.68 × 0.25 m. The turtle is 2.24 × 1.65 × 0.66 m.
- **Tam Quan:** a two-storey gate with three entrances and guardian statues. Inside it, two halls hold six guardians each.
- **Behind the gate:** Đại Hùng Bảo Điện, then the Địa Tạng and Quan Âm halls, the monks' quarters, a pine garden and the abbots' stupas.
- **Approach:** four ceremonial pillars, and a brick stair down to the riverside road with a landing on the river.
- **Footprints and positions:** from OSM, as listed above.

## Estimated
- **Platform sizes:** the octagonal tower terrace (r 7.4 m, 0.9 m high, with a balustrade) and the tower's base radius (3.9 m).
- **Tower tiers:** the proportions of each tier, and the 2.5 m finial.
- **Tam Quan:** about 11.2 × 5.4 m. The lower storey is 4.4 m high and the upper storey 2.5 m; the total is about 11 m.
- **Đại Hùng Bảo Điện:** split into a 9 m front hall plus a 16 m double-roofed main hall. Wall heights are estimated, and the total is about 13 m. The ridge ornaments are simplified.
- **Bell and stele placement:** the bell is placed in the east hexagon and the stele in the west, following the "tả chung hữu cổ" convention.
- **Colours:** terracotta roofs, ochre walls, lacquered columns and the brick-red stair.
- **Wall:** the precinct wall is 2.3 m high with tiled coping. Along the front brow it is a 0.95 m lime balustrade.
- **Stair:** the model's terrace stands 9.9 m above the road, so the stair has 30 risers in two flights. Sources speak of about 19 steps; the terrain here is a model simplification.
- **River landing:** a platform plus 18 steps to the water.
- **Halls behind:** single-roofed halls on the OSM outlines. Their heights are estimated, and the very long service wings are capped at 14 m deep.
- **Stupa:** the 206108046 outline is drawn as an octagonal three-tier stupa. It may be Thích Đôn Hậu's stupa.

## What changed
- **Terrace:** the Hà Khê terrace is now cut at the front so the stair descends inside it between stone cheek walls, instead of running out across the road.
- **Tower:** set on a balustraded octagonal terrace with steps. It has doors on the axis, Buddha niches on the other faces, and a light ring under each eave at night.
- **New structures:**
  - The Hương Nguyện ruin
  - The four pillars, with lanterns
  - The square stele houses
  - The bell and turtle stele in their hexagonal pavilions
  - Tam Quan, with its three passages, twelve guardian figures and two-storey roof
  - The guardian halls
  - Đại Hùng with its platform and incense urn
  - The halls behind
  - Lawns, bonsai and paths in the court
  - The stupa
  - The precinct wall, with openings where the side-gate path crosses it
  - The river landing
- **Lighting:** all lights are in `group` with `userData.landmark = 'thienmu'`.
- **Surfaces:** the courts are in `S.paved`, and the terrace and lawns are in `S.noCover`.

## Left to do
- **Side gates:** the two unnamed side gates in `data.gates` are still drawn by `citadel.js` as generic imperial gates with green roofs. A better model would match the real gates.
- **Missing details:**
  - The interiors of Đại Hùng
  - The upper statues of Tam Quan (Nguyễn Hoàng and Thiên Mụ)
  - The Austin car shrine
  - The other abbots' stupas in the pine garden (only the one mapped stupa is drawn)
- **Toilets and shelter:** OSM ways 1205452748 and 1205452750 are not modelled.

## Google reference pass (2026)
Compared against Google satellite (z17-z20) and four Google car Street View panoramas from the lanes around the
precinct (captures kept in scratch/, not in the repo).
- **Position and axis:** the tower (C) and the compound axis (ANG, about 346°/166°) match the satellite to within
  about 2 m and 3°. The Đại Hùng roof and the court's lawns sit where the satellite shows them. Nothing was moved.
- **Outer wall:** Street View along the east lane shows rough grey-brown rubble stone under a flat stone coping,
  about 2.8-3 m above the lane where the lane runs at its foot and about 2.5 m above a grass bank further south. The
  model had an ochre rendered wall with a tiled coping on an ashlar terrace face, 4-5 m above the lane. Now the wall
  and the terrace face are rubble with a flat coping, and each stretch of wall is sized from the ground outside it
  (top 2.9 m above it, between 0.9 and 2.3 m above the court).
- **East gate:** Street View shows a small masonry gate in the east wall, about 3.5 m wide, with an arched opening, red
  doors, a red plaque and a short tiled canopy. It is not in OSM. It is placed where the panorama's sight line meets
  the mapped wall (about 16.45283 N, 107.54536 E). Steps lead down the bank to the lane.
- **Roof colour:** from above, and in a courtyard photo, the halls' tiles read weathered grey-brown, not new
  terracotta. The place now uses its own weathered tile colour.
- **Not matched:** on the river and west sides, the real hill is a steep wooded bank with a low stone wall at the road.
  The model keeps its one-level court on a vertical rubble face, 5-9 m high there. This comes from the elevation data
  (the court 9.7 m above the riverside road at the stair), not from this file.

## Review fixes (2026)
A second pass against the same car panoramas replaced several choices above (the east gate and the "Not matched"
note no longer hold).
- **Ground:** the court is level only inside the brow (west brow line and the front at v 13 in the local frame). Outside
  it, grass banks fall at about 1:1.1 from the court to the city's ground: a west bank inside the ring, the front banks
  either side of the stair, and on the east an apron outside the mapped ring, grown outward until it meets the lane or
  the ground (at most 14 m). Banks are heightfields on a 2 m grid, so they follow the terrain.
- **Walls:** random rubble (per-stone quads, mossier toward the top) under an uneven mossy coping, not ashlar coursing.
  The precinct wall stands about 2 m above the bank top on the brow and on the east; at the road, a low rubble wall
  (0.8 m above the road, 0.45 m above the bank foot) on the west and river sides, and only a stone kerb at the foot of
  the east apron, where svB shows the grass running down to the lane.
- **East gate:** a low rendered block about 3.6 m wide, one round arch with a timber lattice grille, couplet panels, a
  plaque frieze and a flat cornice; no canopy, no stair. Placed where svB's sight line meets the wall (about 14 m from
  the car, as in the panorama). The two side gates use the same builder.
- **Citadel side gates:** the generic cream gate blocks with teal roofs from `citadel.js` are skipped inside the
  precinct ring when this file is loaded.
- **Colours:** halls and Đại Hùng have ochre-cream walls (`#d3bd8c`), dark doors and the weathered brown-grey tile;
  pavilion fascias follow the roof instead of red lacquer. Columns stay lacquered.
- **Trees:** a jittered 5.2 m grid of trees over the banks and round the halls (pines on the north end), clear of the
  lawn court, the forecourt, the stair and the cross path. The generated flame tree on the riverside verge in front
  of the tower's east corner (svD) is removed. `dataReach = 120` keeps the data trees near the place in `hue.json`.
