# Hoàng thành · Đại Nội (`dainoi`)

Model: `src/landmarks/places/dainoi.js`. Guards in `src/geo/city.js`: `buildWalls` skips `data.iwalls` when
`replaced('dainoi')`, and `buildBuildings` skips mapped buildings that `owns(ring)` (exported by dainoi.js) says
the model draws itself.

## Sources
- OpenStreetMap (cached in `data/raw/hue-osm*.json`): both wall rings, khuyết đài, Cửa Hòa Bình, building outlines.
- vi/en Wikipedia, "Hoàng thành Huế" / "Imperial City of Huế": wall size, gates, khuyết đài, Đông Khuyết Đài restoration.
- dtinews.dantri.com.vn (2011): Tử Cấm Thành wall dimensions.
- baovanhoa.vn, daibieunhandan.vn: Đại Cung Môn still a foundation; works planned for 2026-2030.
- vinwonders.com, vietnamplus.vn: Tả/Hữu Vu (1819, glazed tiles), 9-bay green-glazed corridors.

- Google satellite and Street View (2024-25 user photospheres), checked visually in Nov 2026: alignment of the whole
  layout, Tây An Môn and the colour of the walls. Not copied into the repo.

## Confirmed
- Hoàng thành: about 600 m a side, brick, about 4 m high and 1 m thick, four gates, khuyết đài at the middle of three sides.
- Đông Khuyết Đài restoration finished in November 2023.
- Tử Cấm Thành wall: 3.72 m high, 0.72 m thick, about 1,230 m round.
- Đại Cung Môn was destroyed in 1947. Only the stone floor and column bases are left (2026).
- Tả Vu and Hữu Vu have yellow glazed roofs. The corridors beside Đại Cung Môn are green glazed.
- The long corridors (Tả/Hữu Trường Lang and those beside the inner courts) have dark weathered grey-brown tile roofs
  on the satellite (2025), with no green cast, and wider cross-roofed pavilions where they end, meet or cross a path
  (seven places).

- Tây An Môn, the Forbidden City's west gate, stands across a lane from Trường Sanh's Trường An Môn: one round-arched
  passage with an iron grille, grey plaster over brick, recessed panels, a plaque 西安門, a cornice and a raised
  middle parapet (street-level photos).
- Both wall rings read weathered grey, darkened by mould, at street level.
- Satellite check (Nov 2026): the galleries, Vu halls, Duyệt Thị Đường, Thái Hòa and the walls land within about a
  metre of the Google satellite at 0.29 m/px; the Imperial City's axis (data.imperial.a) matches it.

## Estimates
- Tây An Môn's sizes (8.6 m wide, 2.6 m deep, 5.3 m to the cornice, about 6.9 m to the parapet top), scaled from photos.
- Wall coping. The outer wall is drawn 3.75 m to the coping (4.17 m in all), the inner 3.36 m (3.72 m in all).
- Đông Khuyết Đài is drawn as a bastion with a two-roof lookout pavilion; its form is not documented.
- Tây Khuyết Đài is drawn as a bastion with only a stone base (its state is unconfirmed).
- Cửa Hòa Bình: one round-arched passage through a plastered masonry body (archivolt, pilasters, plaque), a small
  storey on top. No street-level photo was checked; sizes and finish follow Tây An Môn.
- The knuckle pavilions' size (about 9 × 8.5 m) and their crossed roofs, read from the satellite.
- The old trees along the lane outside the west wall are placed every 11 m on the wall side (photo shows the row).
- Each Tả/Hữu Vu is drawn as two parallel halls on one platform. The real section ("trùng thiềm điệp ốc") is not measured.
- Gallery widths and post spacing (3.2 m).
- The Tử Cấm Thành wall lines missing from OSM (east, south-east, and west around Trường An Môn) are interpolated.
- Gallery restoration state: OSM maps them as roofed. Whether every stretch is roofed in 2026 is unconfirmed.

## What changed
- Both wall rings are now drawn here, at their real thicknesses. Before, the inner wall was as heavy as the outer one and had gaps.
- The galleries (Tả/Hữu Trường Lang and the corridors around the inner courts) are open colonnades with green roofs.
  Before, they were solid yellow blocks; the L-shaped ones also escaped the cover test.
- Nov 2026: Tây An Môn drawn in the gap the west wall had for it; wall colours changed from beige to weathered grey.
- Nov 2026 review: long corridors re-roofed in dark old tile, the knuckle pavilions added; Tây An Môn's arch and
  Cửa Hòa Bình's are true curves with a moulded archivolt; Cửa Hòa Bình plastered and arched (was a flat lintel);
  Tây An Môn and the Tử Cấm Thành wall cooler and darker; trees along the west lane.
- Added Tả Vu and Hữu Vu, the Đại Cung Môn ruin, the khuyết đài bastions, and Cửa Hòa Bình (which was not drawn).

## Left to do
- The moat (Ngoại Kim Thủy), the Thái Dịch lakes and their bridges still come from the shared land, water and bridge
  code. They have no stone kerbs.
- The Cơ Hạ and Thiệu Phương gardens, Thái Bình Lâu, Nhật Thành Lâu, Phủ Nội Vụ and the octagonal pavilions are still
  generic mapped buildings.
- No night lighting.
- Check the November 2025 collapse of the north wall and its 2026 repair against photos.
