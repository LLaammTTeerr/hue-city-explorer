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
- **Colours.** From Street View rather than the OSM colour tag (gold): a grey-white wall faced in grey-blue relief, white pilasters and cornices, yellow render only in the panels of the upper band and on the towers' attics, lacquered door frames. The mosaic is drawn as mostly grey-blue and white tiles in the friezes, the pilasters, the ground-floor dado and under the windows.
- **Projections.** Each projection is drawn 0.8 m deep. OSM draws the front almost straight.
- **East-end stair.** OSM maps only the west one; the east one is mirrored from it.
- **Forecourt layout.** Two parterres, each with a box-hedge frame and diamonds and a small basin; four brick stools with potted trees per side; one cannon either side of the middle flight's foot. The sources list these items but give no positions.
- **Precinct.** The rear court's beds, the west apron and the four guard kiosks are placed from the satellite (the north-west kiosk is hidden by trees and placed by symmetry); the kiosks' form is from the one Street View shows beside the east flight.
- **Pavilions.** The two Lầu Bát Giác stand on OSM's footprints; the stair faces the hall, where the satellite's white apron and the mapped paths meet the base. Heights (1.4 m base, columns about 3.1 m, two roof tiers) are estimated from Street View.
- **Not modelled.** The back of the hall's detail.

## Changed
- **Before.** Kiến Trung was a generic extruded OSM building, 14 m high.
- **Now.**
  - A stone terrace with balustrades on all sides, five stairs (dragon cheek walls on the three front ones), and the 7-step porch.
  - The two-storey palace with its projecting blocks, arched doors with gilt fanlights, carved window frames, balconies on the middle section, mosaic pilasters and friezes, a name board, front gables with medallions, and yellow glazed hip roofs.
  - The forecourt garden.
  - Night lamps along the ground-floor front and the terrace stair heads.
- `populate` drops the mapped footprint because the model covers it. No guard was needed in any older builder.

## Left to do
- The rear garden's planting in detail.
- Exact storey heights and the true roof form, which needs a measured elevation or more photographs.
- The fountain's real position.

## Checked against Google satellite and Street View (2026-11)
Captures are kept outside the repo; they are visual reference only.
- **Position and axis.** The ground features line up with the OSM-derived model within about 1 m: the middle flight, the end flights and the terrace front. The axis agrees within about 1° (the satellite gives 53.3°, the model 53.4°). The roofs in that image lean about 6 m north of their bases; the seen-edge-on front facade fills the gap. So the hall's centre is unchanged.
- **Length.** The four small hip roofs of the corner towers stand 38.5 m apart along the front and 14.9 m front to back, centre to centre. The same spacing shows at the front pair and the back pair. In Street View the end flights land under the end bays' porches. So the end bays are towers about 5.6 m square, and the hall is about 44 m long, not OSM's 39.5 m. The model keeps OSM's depth (20.6 m) and terrace, and draws the hall's ends at ±22 m.
- **Massing from Street View.** All the panoramas are user photospheres, so the poses were estimated from the images.
  - There is no upper tier over the middle. Over the wings and the middle the roof is a long, low hip, hidden from the ground behind a crested parapet. Over the middle of the front stands a raised crest panel.
  - The corner towers rise a tier above the wings, with a recessed attic and a crest.
  - Each end bay has a porch of columns carrying a balcony. The east one is the visitors' entrance.
- **Finish.**
  - Red-lacquered leaves in every door and window, with arched upper windows.
  - The mosaic is mostly grey-blue and white.
  - The terrace face is rendered white, not coursed stone. The stair dragons are grey stone.
- **Forecourt.** Between the stairs there is a plain lawn strip about 5 m deep behind a kerb, with a few clipped shrubs and a cannon beside the middle flight, then brick paving. The parterres, basins and brick stools drawn there before were removed. The geometric garden with a fountain that the sources call Art Deco is across the paved road to the south (seen on the satellite). It is not modelled here.

## Review fixes (2026-11)
- **Lầu Bát Giác.** The two pavilions in front (OSM buildings 'Lầu bát giác') were generic square red halls. They are now drawn in the place file as open octagonal pavilions: a grey stone base about 1.4 m high with a balustrade, a stair with flaring balustraded cheeks toward the hall, eight dark lacquered columns, and a two-tier roof of yellow glazed tiles with ridge crests. The city's generic boxes give way to them automatically (`populate` sees the base).
- **Palette.** Grey-blue and white overall; yellow only in the upper band and the tower attics.
- **Openings.** Round-arched upper windows and ground-floor doors, each in a grey-blue relief surround. The flat stepped hoods were removed.
- **Tower tops.** The attic is crowned by a dense crest frieze and a small roof with no flare and little overhang, with a dragon crest on its ridge.
- **Stairs.** White-rendered cheeks and newels carry grey stone dragons with coiled bodies and reared heads.
- **Forecourt.** The shrubs are small and light green. The cannon is 3 m long on a stone plinth and carriage. The paved square beyond the road is laid a kerb's height up and marked paved, so the city no longer plants a tree on it.
- **Rear.** A paved court behind the hall's east half, with four garden beds, marked paved. A paved apron about the west stair. Four guard kiosks at the precinct's corners.
