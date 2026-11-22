# Phố đi bộ Nguyễn Đình Chiểu (`ndchieu`)

The riverside walking street on the south bank of the Hương. It runs upstream from the foot of cầu Trường Tiền to the head of the ironwood boardwalk, with the park strip between it and Lê Lợi. Model: `src/landmarks/places/ndchieu.js`.

## Sources
- OpenStreetMap (local raw extract `data/raw/hue-osm*.json`):
  - footway way 39418535 (`name=Nguyễn Đình Chiểu`, `surface=paving_stones`)
  - round footways 1167513743 and 1167513766, spurs 1167513765 and 1167513764, park path 1167513730
  - cannon nodes 13653718203 and 13653730801
  - Điềm Phùng Thị garden, park 239566225
- https://mia.vn/cam-nang-du-lich/thoa-chi-an-uong-va-mua-sam-o-pho-di-bo-nguyen-dinh-chieu-hue-2483
- https://dtinews.dantri.com.vn/lifestyle/hue-pedestrian-street-appeals-to-tourists-20150720161443230.htm
- https://baovanhoa.vn/du-lich/khai-truong-pho-di-bo-thu-ba-tai-tphue-35910.html
- https://nongnghiepmoitruong.vn/hue-khai-truong-pho-di-bo-gan-100-ty-d346911.html
- https://kupi.com/en/explore/vietnam/hue/nguyen-dinh-chieu-walking-street
- https://junglebosstours.com/vi/kham-pha/blog-du-lich/pho-di-bo-hue
- Boardwalk context: https://baovanhoa.vn/du-lich/tp-hue-dua-duong-di-bo-lat-san-go-lim-ven-song-huong-di-vao-hoat-dong-35255.html

## Confirmed
- Plan and length (~215 m from the bridge foot to the roundel at the boardwalk stairs), the two roundels, the spurs, the upstream park path and the two cannons all come from OSM.
- The riverbank here is one straight mapped edge.
- Paved in stone or brick, closed to motorbikes, lit at night, with food and souvenir stalls. Opening hours are given as 16:00–22:00, all day on Sunday; a 2015 report gives 17:00–23:00.
- Benches face the river and there are "genre" sculptures. Some listings mention colour-changing LED lighting; these come from search summaries of travel listings, not full articles.

## Seen on the Google satellite and Street View (2026 rebuild)
Used as visual reference only; nothing was traced, and the captures stay in `scratch/`.
- The OSM bank edge lies on the satellite water line within about 1–2 m, and the walk axis within about 1°. No data or anchor change was needed.
- The walk is wide, light grey stone slabs (no darker central strip). It is about 12 m to the inland kerb in the downstream third and about 14 m upstream.
- The river edge has a low stone balustrade with turned balusters and square piers, not a sitting edge.
- A row of palms stands in small grass squares along the bank side. Large broad shade trees (banyan-like) stand along the inland edge.
- Grey poles carry disc (UFO-shaped) lamps; taller poles with several bracket arms stand among them.
- Café parasols stand on the lawn in the upstream half. No fixed kiosks show on the satellite, so the stalls are taken to be evening carts.

## Estimates
No drawing or survey was found, so these sizes and counts are guesses:
- Widths 12.0 m / 13.8 m, with the change at about 66 m from the bridge end. Joint bands 0.3 m every 6 m.
- The balustrade is about 1.1 m high, with piers every ~3 m.
- Disc lamps 5.7 m high every 18 m along the bank, plus an inland row; a 9 m multi-arm pole beside every third.
- Palms 10.5–13.3 m high, every 9 m.
- Shade trees every 12 m along the inland kerb; they use foliage kind 4 (spreading, never turned into a willow).
- Eight parasols in two rows.
- Three figure sculptures: two on plinths and one in the inner roundel.
- The LED line along the bank edge cycles its hue.

## What changed
- New replica `ndchieu.js`, which draws:
  - the paved, banded walk with its kerb and the granite edge on the bank
  - the lawn of the park strip
  - both roundels with planted beds, the spurs and the upstream park path; all of these are marked as paved
  - lamps, benches, kiosks, sculptures and cannons
- Shade trees are pushed into `data.trees`. They keep clear of buildings, roads, the inner roundel and the Điềm Phùng Thị garden.
- Night lighting: lamp and kiosk glows, plus the animated LED line.
- No older builder drew this place, so no `replaced()` guard was needed.
- 2026 rebuild from the satellite and Street View:
  - the walk widened and paved in light slabs
  - a stone balustrade replaces the granite edge
  - disc lamps and multi-arm poles replace the twin-lantern posts
  - a palm row and an inland shade-tree row were added
  - café parasols replace the kiosks
  - generated trees standing on the paving are emptied in place (scale 0, never removed, so the other trees keep their seeds)
  - `src/geo/foliage.js` gained kind 4 for these trees

## Left to do
- Confirm the real lamp, bench and kiosk designs and spacing from photos.
- Identify the actual sculptures and where they stand.
- Check whether the stalls are fixed kiosks or mobile carts set up each evening. The satellite shows none.
- The shade trees are smaller than the real banyans, and their trunks are not whitewashed.
- The Điềm Phùng Thị garden (`diemphungthi`) is someone else's place and has no replica yet; its lawn is still the base ground.
