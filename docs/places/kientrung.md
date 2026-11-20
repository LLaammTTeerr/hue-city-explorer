# Điện Kiến Trung (`kientrung`)

The replica is in `src/landmarks/places/kientrung.js`. It covers the palace at the north end of the Tử Cấm Thành axis, its terrace and balustrade, the stairs, and the narrow forecourt down to the service road. It models the building as rebuilt in 2019–23 and opened in 2024.

## Sources
- https://vi.wikipedia.org/wiki/Điện_Kiến_Trung
  - History: built 1921–23, destroyed in February 1947 (only the base and balustrade survived), rebuilt from 16 Feb 2019.
  - The front garden and the three dragon stairs.
  - 13 openings: a middle section of 5, wings of 3, and a projecting corner bay at each end.
  - The upper floor repeats the plan. The roof is tiled, with a Vietnamese-style railing.
- https://en.wikipedia.org/wiki/Kien_Trung_Palace
  - The front faces south and carries ceramic decoration.
  - French balusters run the full length.
  - Each end bay has a large door, a large window and an Asian-style gable.
  - The garden is Art Deco and geometric. The roof has slightly raised edges and a parapet.
  - Opened to visitors in February 2024.
- https://baoquocte.vn/dien-kien-trung-mot-di-san-hoi-sinh-261313.html
  - Two storeys, about 14 m high.
  - Front and rear gardens (tiền viên, hậu viên), steps, balustrades and the base wall.
  - Brick stools, a fountain, cannons and a guard house.
- https://localvietnam.com/hue/kien-trung-palace/
  - Yellow glazed roof tiles and porcelain mosaic (dragons, flowers).
  - Three stairs, a formal geometric garden, fountains and cannon platforms.
- OpenStreetMap (from `data/raw/hue-osm.json`, hard-coded in model metres):
  - The hall, way 285990348: 39.5 × 20.6 m, with a 21 × 3.8 m block at the back. Tagged building:colour=gold.
  - The terrace walk, 1570130367: about 47.5 × 28.5 m.
  - The stairs:
    - 695949052, 7 steps from the hall to the terrace.
    - 619851645, 13 steps, the middle flight.
    - 619851643 and 619851644, 14 steps each, the end flights at the front.
    - 1570130366, 14 steps, the west end.
  - The service road, 39415484, bounds the forecourt.

## Confirmed
- The footprint and orientation, the terrace outline, and the positions of the stairs and their step counts.
- Two storeys with 13 openings per floor, split 1 + 3 + 5 + 3 + 1. The middle section and the end bays project, and the end bays have front gables.
- Yellow glazed tiles, multicoloured porcelain mosaic on the front, French balusters, and a geometric front garden with a fountain, cannons and brick stools.

## Estimated
- **Heights.** The terrace is 2.0 m (14 steps of about 0.15 m) and the hall floor 0.9 m above it (7 steps). The ground storey is 4.4 m and the upper one 3.6 m. The main ridge is about 14.3 m above the ground; the small top tier over the middle reaches about 15.5 m.
- **Roof forms.**
  - A hip over the body.
  - Hips running back from the front over the middle section and the end bays.
  - A small upper tier over the middle, with a flaming pearl between two dragons.
  - A low balustrade parapet along the wing eaves.
- **Colours.** Golden yellow render (after the OSM colour tag and photographs), ivory trim, lacquered door frames. The mosaic is drawn as coloured tiles in the friezes, the pilasters and under the windows.
- **Projections.** Each projection is drawn 0.8 m deep. OSM draws the front almost straight.
- **East-end stair.** OSM maps only the west one; the east one is mirrored from it.
- **Forecourt layout.** Two parterres, each with a box-hedge frame and diamonds and a small basin; four brick stools with potted trees per side; one cannon either side of the middle flight's foot. The sources list these items but give no positions.
- **Not modelled.** The back of the hall, the guard house and the rear garden.

## Changed
- **Before.** Kiến Trung was a generic extruded OSM building, 14 m high.
- **Now.**
  - A stone terrace with balustrades on all sides, five stairs (dragon cheek walls on the three front ones), and the 7-step porch.
  - The two-storey palace with its projecting blocks, arched doors with gilt fanlights, carved window frames, balconies on the middle section, mosaic pilasters and friezes, a name board, front gables with medallions, and yellow glazed hip roofs.
  - The forecourt garden.
  - Night lamps along the ground-floor front and the terrace stair heads.
- `populate` drops the mapped footprint because the model covers it. No guard was needed in any older builder.

## Left to do
- The rear garden (hậu viên) and the guard house.
- Exact storey heights and the true roof form, which needs a measured elevation or more photographs.
- The fountain's real position.
