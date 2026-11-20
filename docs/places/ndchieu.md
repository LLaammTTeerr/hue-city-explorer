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

## Estimates
No drawing or survey was found, so these sizes and counts are guesses:
- The walk is 8 m wide, with 0.6 m bands every 6 m and a granite sitting edge on the bank (0.42 m high).
- Lamp posts with twin lanterns, 4.5 m high, every 18 m, with a bench between each pair.
- Ten stall kiosks in the upstream half.
- Three figure sculptures: two on plinths and one in the inner roundel.
- Shade trees on the lawn, mixing phượng and other species.
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

## Left to do
- Confirm the real lamp, bench and kiosk designs and spacing from photos.
- Identify the actual sculptures and where they stand.
- Check whether the stalls are fixed kiosks or mobile carts set up each evening.
- The Điềm Phùng Thị garden (`diemphungthi`) is someone else's place and has no replica yet; its lawn is still the base ground.
