# Cung Trường Sanh (`truongsanh`)

Model: `src/landmarks/places/truongsanh.js`. Before this, the palace was one generic extruded OSM building (way
172763427) with two plain side halls and a plain gate box. The channel and lake were already in `hue.json` (pond 67),
but the precinct had no walls.

## Sources
- https://vi.wikipedia.org/wiki/Cung_Trường_Sanh
  - The site is about 11,400 m² and the palace faces east.
  - Neighbours: Nội Kim Thủy lake to the north, Diên Thọ to the south.
  - Since 1846 it has a 王 plan: Ngũ Đại Đồng Đường in front, Thọ Khang in the middle, Vạn Phước lâu behind, linked by corridors.
  - A phương môn screen stands before the front hall.
  - Three rockeries (Bảo Sơn, Kình Ngư, Hổ Tôn) stand behind the halls as the "hậu chẩm".
  - Lạch Đào Nguyên channel has red bridges. Tân Nguyệt lake is part of the water.
  - Gates: Trường An môn (east, a tam quan with floral and five-colour decoration), Thụy (west), Hữu Hòa (south), Thanh Minh (north).
  - History: pulled down 1945, restored 2005–2007.
- https://vietnamnews.vn/gallery/1801271/truong-sanh-palace-a-royal-garden-in-hue.html: photo captions for the main gate, the screen wall behind it, Ngũ Đại Đồng Đường, Thọ Khang, the Đào Nguyên channel and Tân Nguyệt lake.
- https://www.nomads-travel-guide.com/places/cung-truong-sanh-grand-queen-mothers-residence/: mustard-yellow halls, red-painted bridges, rockeries.
- https://mia.vn/cam-nang-du-lich/cung-truong-sanh-co-do-hue-17056: the gate is a tam quan with three passages.
- OpenStreetMap (raw extract in `data/raw`):
  - Halls: main hall 172763427, side halls 172763422 and 172763425.
  - Gates: Trường An Môn 618267901, south gate 695810773.
  - Walls: precinct 695810771 and 695810772, rear court 695814169, screen 695814168.
  - Water: Lạch Đào Nguyên (relation 2325738), Tân Nguyệt Hồ (relation 8547961).
- City height survey in `hue.json`: main hall 8.5 m, side halls 6.0 m.
- Google satellite (z18–z20) and one Street View user photosphere from the lawn north-east of the island, checked
  2026-11 (visual reference only, kept out of the repo):
  - The halls and side halls are roofed in dark grey-green unglazed tile with grey ridges. On the satellite they read
    dark beside Điện Thọ Ninh's yellow roof.
  - Walls are solid mustard masonry with red-framed doors and windows (not open colonnades).
  - The island is edged with a low grey pierced balustrade along the channel; the court before the hall is paved
    tan brick; the precinct wall beside Trường An Môn is weathered grey plaster.
  - The hall group, side halls and gate stand where OSM puts them: within about 1–2 m and 2° of the satellite.

## Confirmed
- Footprints and positions of the hall, side halls, gate, south gate, walls and screen come from OSM.
- Everything sits on one axis aimed at Trường An Môn. Main block: 21.6 × 14.2 m. Rear block: 17.1 × 9.4 m.
- The rear walled court measures 26 × 19.5 m.
- Main ridge is 8.5 m (survey). Mustard masonry walls with red-framed openings, dark grey tile roofs (imagery).

## Estimated
- How the OSM hall outline divides into front house, Thọ Khang and rear house.
  - The rear block stands on the site of Vạn Phước lâu but is drawn as one storey. I found no source saying the lầu was rebuilt.
- Bay counts (5 + 2 chái), platform 0.6 m, eave heights.
- The window rhythm (one opening per bay) and the open verandah across the front house only.
- Trường An Môn and the small gates keep yellow glazed tile: their roofs are not visible in the imagery.
- Trường An Môn: height (about 7.9 m) and its raised middle storey.
- Positions of Thụy and Thanh Minh gates, which are not mapped: placed on the axis and mid-wall.
- Form of the rockeries, plus two smaller ones on the island front.

## Left
- The bridges are drawn by `city.js` from OSM footways and are still grey; the sources say red.
- No car Street View near the palace; the one usable photosphere sees the halls from across the channel only. The
  front gate's roof and the rear court are unchecked.
- No night lights.
