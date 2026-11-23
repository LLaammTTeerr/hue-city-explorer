# Đông Thành Thủy Quan (Cống Lương Y)

Builder: `src/landmarks/places/thuyquan.js` (id `thuyquan`). Guard: `src/geo/city.js` skips the generic bridge when replaced. Deck profile: `src/geo/bridges.js` NAMED entry.

## Sources
- Tạp chí Kiến trúc, cầu vòm bắc qua sông Ngự Hà: https://www.tapchikientruc.com.vn/chuyen-muc/dac-diem-kien-truc-cac-cau-vom-bac-qua-song-ngu-ha-trong-vai-tro-ket-noi-va-to-chuc-giao-thong-cua-kinh-thanh-hue.html
- An Hằng, Đông Thành Thủy Quan: https://anhang.vn/di-an/dong-thanh-thuy-quan-cua-ngo-tho-mong-cua-kinh-thanh-hue.html
- Doanh nhân Plus, two small doors: https://doanhnhanplus.vn/xuat-lo-hai-chiec-cong-doc-dao-trong-khu-thuong-thanh-hue-516375.html
- Wikimedia Commons postcard "Cống Đông thành Thủy quan qua bưu ảnh xưa" (Pont Thanh-Long): https://commons.wikimedia.org/wiki/File:C%E1%BB%91ng_%C4%90%C3%B4ng_th%C3%A0nh_Th%E1%BB%A7y_quan_qua_b%C6%B0u_%E1%BA%A3nh_x%C6%B0a.jpg
- Wikipedia, Kinh thành Huế: https://vi.wikipedia.org/wiki/Kinh_th%C3%A0nh_Hu%E1%BA%BF
- OpenStreetMap: way 619851621 (man_made=bridge, historic=city_gate, alt_name Cống Lương Y) and road way 174742775 (Cầu Lương Y), both from the local data/raw/hue-osm.json.

## Confirmed facts
- A masonry dam with a single vault: 71.7 m long, 4.9 m wide, 8.05 m high, vault 8.4 m wide (Kiến trúc). The OSM outline is about 75 m.
- Built of gạch vồ brick and đá thanh blue stone; the vault has six stone rings; laterite (đá gan gà) at the base.
- Outer (east/NE) parapet 1.55 m high with 13 round gun ports about 0.5 m across. Inner parapet 0.95 m high, with two 0.54 × 0.54 m stone posts that carried the sluice gate's pivot beam.
- The deck is curved and carries a road (Cầu Lương Y, asphalt, maxweight 5). There is a small door at each end, where it meets the rampart.
- Originally the timber Thanh Long kiều (1806/1808); rebuilt in masonry in May 1830 under Minh Mạng.
- The postcard shows long walls standing in the water, one arch framed by pilasters, and a deck rising from both banks.

## Estimates
- Semicircular vault, R 4.2 m, springing 0.5 m above the water; the deck crown about 4.3 m above the ends. The model keeps the 8.05 m figure from bed to crown, not from the waterline.
- Pilasters 1 m wide and 0.22 m proud. Gun ports evenly spaced, 0.85 m above the deck. Posts 1.9 m tall.
- The wing walls and doors join the rampart's inner corners (hard-coded at WALL_ENDS). The doors are round-headed, about 0.8 m wide.
- Colours, the damp band and the extent of the laterite footing.
- The 15 gun ports An Hằng reports would include ports in the wing walls; the model follows the 13 from Kiến trúc.

## What changed
- New replica: brick dam faces with a damp band, a stone-ringed vault with springers, a laterite footing, and pilasters with caps. The asphalt deck has a gun-ported outer parapet, a low inner parapet with the two sluice posts, and wing walls with small doors to the rampart.
- Bridge profile NAMED entry: from `{ rise: 0.9, arches: 3 }` to `{ rise: 4.3, ramp: 0.45 }`, so traffic and lamps ride the humped deck.
- One-line `replaced('thuyquan')` guard in city.js. The Citadel wall (kinhthanh) is untouched.

## What is left
- The drop gate (áp quan) itself, and any timber beam between the posts, are not modelled.
- The exact vault shape, the springing height and the door positions need on-site photos or drawings.
- The water level is the shared POND_Y, not a measured sluice level.

## Google check (Nov 2026)
Compared with Google satellite (z17-z20) and four car Street View panoramas (Đường Xuân 68 from the NW and SE, the Lê Văn Hưu corner, Lương Y); captures stay in scratch/, not in the repo.
- Position and axis: the OSM road line lies within about 1 m and 1 degree of the deck seen from above (deck bearing about 143 degrees); not moved.
- Length: the parapets run about 69-70 m. The north-west end meets the OSM line's end; at the south-east the parapets stop about 5.5 m short of it, and the road runs on at street level. The model now starts the parapets, footing and wing wall 5.5 m in (`SE_BARE`).
- Gate posts: two tall square posts with heavy urn caps stand about 5 m north-east of the road's centre at the south-east foot, about 5 m apart along the road, where the path along the canal leaves the road. The model adds them (1 m square, about 4.9 m to the top of the ball, sized from the panorama) and splits the south-east wing wall either side of the opening between them.
- Crown height: the two end-on views do not agree about how high the crown stands above the street (from the SE about 2.5 m, from the NW 5 m or more; the street levels at the two cameras are unknown). The profile keeps the 4.3 m that the published 8.05 m height gives.

## Review fixes (Nov 2026, from the same panoramas)
- Wing walls: the piece from the south-east foot to the first gate post, and the north-west wing wall, are now low ruined brick walls about 1.1 m above the bank, standing on land (never below the water) with a small square opening where the documented door was; the piece from the second post to the rampart's end is a 2.3 m retaining wall. The panoramas show nothing taller at either foot.
- Gate posts: free-standing brick shafts about twice the height of the walls beside them, topped by squat urn caps as wide as the shaft (were small balls).
- Parapets: a short pale square pier with a cap (about 1.3 m) at each of the four ends, the rail easing out of it over 3 m; the parapets are pale weathered grey (đá thanh, as the sources say for the railings) instead of dark brick.
- Still open: crown height (above); the rampart beside the road (kinhthanh/shared fill) is a tall capped wall where the panoramas show a 2.3-3 m retaining wall with a grassy mound, with trees set into its face and a cap slab overhanging its SE end.
