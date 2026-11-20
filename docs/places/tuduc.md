# Lăng Tự Đức (Khiêm Lăng): replica notes

Builder: `src/landmarks/places/tuduc.js` (id `tuduc`, about 33k triangles). The older generic tomb in `src/landmarks/tombs.js` is skipped through the scaffold's `replaced(id)` guard, so tombs.js was not changed. Its helpers are not exported, so the replica brings its own (`hall`, `gateHouse`, `waterPavilion`, `mandarin`, `elephant`, `horse`, `paving`, `terrace`). Lăng Đồng Khánh, next door, is not drawn here.

## Sources
- https://vi.wikipedia.org/wiki/L%C4%83ng_T%E1%BB%B1_%C4%90%E1%BB%A9c — layout, names, the La Thành, the stele, the Khiêm Thọ and Bồi Lăng descriptions
- https://en.wikipedia.org/wiki/Tomb_of_T%E1%BB%B1_%C4%90%E1%BB%A9c — overview and dates (1864–67)
- baovanhoa.vn (2024, 2026) and Thanh Tra — the 2023–27 restoration: Hòa Khiêm re-roofed in yellow glazed tiles, Minh Khiêm nearly finished, Ôn Khiêm's frame taken down to the workshop
- OpenStreetMap, from the cached raw extract in `data/raw` because Overpass could not be reached:
  - outlines of Khiêm Cung Môn, Hòa Khiêm, Lương Khiêm, Minh Khiêm, Ôn Khiêm, Pháp Khiêm, Lễ Khiêm, the links, Chí Khiêm, Xung Khiêm, Dũ Khiêm, Vụ Khiêm Môn
  - the Bi Đình, the trụ biểu node, the crescent pond, the sepulchre platform, the Khiêm Thọ bửu phong (way 205805278)
  - the Chấp Khiêm buildings and the steps and footways of both axes
  - the site items in `hue.json` (`sites.tuduc`)

## Confirmed facts (sourced)
- La Thành of brick and stone about 2.5 m high and over 1,800 m round. Gates Vụ Khiêm, Thượng Khiêm and Tự Khiêm.
- Lưu Khiêm lake, with the Xung Khiêm and Dũ Khiêm tạ (water pavilions) on its bank.
- Khiêm Cung Môn: a three-bay gate with an upper storey, reached from the lake by three flights of steps.
- The temple axis:
  - Hòa Khiêm điện, double-roofed, between Pháp Khiêm (left) and Lễ Khiêm (right).
  - Lương Khiêm behind it.
  - Minh Khiêm đường, the theatre, on the left; Ôn Khiêm on the right.
  - Chí Khiêm đường further right.
- The tomb axis, to the left of the temple axis:
  - Bái Đình with two rows of mandarins, plus elephants and horses.
  - Bi Đình holding the Khiêm Cung Ký stele (about 20 tonnes). Two trụ biểu stand in front of it.
  - The crescent pond Tiểu Khiêm Trì.
  - The Bửu Thành, with a bửu phong of 2.96 × 1.58 × 2.47 m.
- Khiêm Thọ Lăng (Empress Lệ Thiên Anh): four tiers of courts, an outer wall of 31.5 × 21.3 m, an inner wall of 19 × 14.55 m and a mosaic screen.
- Bồi Lăng (Emperor Kiến Phúc), with his temple Chấp Khiêm.
- Footprints and positions of every mapped building come from OSM.

## Estimates
- **Heights** (both pass check:heights):
  - Hòa Khiêm about 8.5 m and Xung Khiêm about 5.5 m above ground, including ridge ornaments.
  - Other halls, the gate storeys and Vụ Khiêm Môn are scaled from photos.
- **Double halls:** how the roof splits on Hòa Khiêm, Lương Khiêm, Minh Khiêm, Ôn Khiêm and Chấp Khiêm (two parallel hips with a valley gutter).
- **Salutation court:** the statue count and order (12 mandarins, 2 elephants, 2 horses) and the terrace levels.
- **Bi Đình and stele:** the Bi Đình is drawn roofless, with four arched walls, as it stands today. The stele is about 4 m on a pedestal; the trụ biểu are 8.2 m, the mapped one mirrored to make the pair.
- **Bửu Thành:** the walls (outer and inner rings, gate, screen) are estimated from photos and the OSM platform.
- **Side tombs:** the Khiêm Thọ tiers are 0.45 m each; the walls and yard of Bồi Lăng are estimated.
- **La Thành:** its run is estimated around the site. It breaks at water, at mapped paths and buildings, and at Vụ Khiêm Môn.
- **Roofs:** yellow glazed tiles on the restored halls (Hòa Khiêm, Lương Khiêm, Minh Khiêm); old tiles on Ôn Khiêm and the rest.

## What changed
- **Temple complex:** built in full on its OSM footprints.
  - Khiêm Cung Môn with its upper storey and three flights down to the lake.
  - The walled, paved compound with front and rear terraces.
  - Hòa Khiêm, Lương Khiêm, Minh Khiêm and Ôn Khiêm as double halls.
  - Pháp Khiêm, Lễ Khiêm, the links, and Chí Khiêm as three halls around a court.
- **Lake:** the Xung Khiêm tạ on piles with a deck, colonnade and landing; the Dũ Khiêm tạ; the Vụ Khiêm Môn gate.
- **Tomb axis:**
  - The paved Bái Đình with its statues and flights.
  - The stele platform, the Bi Đình and the stele.
  - The two trụ biểu and the kerb of the crescent pond.
  - The Bửu Thành walls, screen and walks, the sepulchre platform and the bửu phong.
- **Side tombs:**
  - Khiêm Thọ Lăng: tiers, two walls, the bửu phong and the screen.
  - Bồi Lăng: the Chấp Khiêm hall with wings, and a walled, paved tomb yard.
- **Precinct wall and leftovers:** the La Thành precinct wall. The remaining small mapped buildings (village houses, toilets, booth) are plain halls.
- Every paved court is marked in `S.paved`, so no trees grow on it.

## What is left
- The terrain lies 0.1–0.5 m above the water level over much of Lưu Khiêm and the crescent pond, so the water shows only in blocky patches. This is a terrain or water-data issue, not the replica's. The lake and pond are drawn by the shared water builder.
- The small island pavilions and the details of the lake bridges are not modelled.
- Ôn Khiêm is drawn whole, although it is currently taken down for restoration.
- The Thượng Khiêm and Tự Khiêm gates are not placed separately because their positions are unconfirmed. The La Thành line is approximate.
- Heights and the statue order should be checked against measured drawings if any turn up.
