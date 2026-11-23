# Cầu gỗ lim (golim)

The ironwood walkway on the south bank of the Hương, from the Nguyễn Đình Chiểu promenade (by cầu Trường Tiền) upstream past the south end of cầu Phú Xuân to công viên Lý Tự Trọng. Model: `src/landmarks/places/golim.js`.

## Sources
- https://nguoiquansat.vn/cay-cau-go-lim-bac-ty-dat-7-tan-dong-doc-nhat-viet-nam-dien-tich-hon-2-400m2-ghep-tu-16-000-thanh-go-100872.html: nearly 400 m long, 4 m wide, 2,443 m², 16,000 South African lim boards, 4,100 gold-toned bronze bars (7 t, made in Korea), waterproof lighting, concrete structure.
- https://mia.vn/cam-nang-du-lich/ghe-cau-go-lim-hue-bat-tron-toan-canh-con-song-huong-tho-mong-5312: the same figures; starts at phố đi bộ Nguyễn Đình Chiểu, ends at công viên Lý Tự Trọng; finished November 2018.
- https://e.vnexpress.net/news/travel/places/vietnam-s-royal-city-adds-to-its-charm-with-wooden-promenade-3824765.html: 380 m, lim from South Africa, copper/bronze railings.
- Web search summaries (pages not read in full): about 1 m above the water on concrete pillars in the riverbed (tuoitrenews 2018); railing lights and lamp posts, LED fittings under 18 W (LUCI association).
- OpenStreetMap (fetched 2026-11-21 via Overpass): ways 683633953, 1167513733, 1167513732, 1167513742 (footway, bridge=yes, "Ironwood Foot Bridge"). Links to the bank: ways 1493443036, 1493443034, 1493443035 and the footbridge 1473289702 (to the south end of cầu Phú Xuân).

## Confirmed
- Plan: the OSM centreline, hard-coded. It is 436 m end to end, including both ends turning onto the bank.
- Width: 4 m.
- Deck height: about 1 m over the water (deck top at 1.2 in the model).
- Structure and finish: lim deck, gold bronze bar railing, concrete piles.
- Connections to the bank: four links at the OSM nodes.

## Estimated
- **Piles:** a bent every 4.5 m, made of two 0.35 m square piles under a headstock.
- **Ends:** ramps up to the promenade over the last 16 m of each end.
- **Gangways:** a stepped timber gangway, 2.4 m wide, at each link.
- **Deck:** 15 cm lim boards laid across the walk, in 3 m panels with staggered end joints (from the photosphere on the deck).
- **Railing:**
  - Flat bronze slats, 7 cm face, 1.05 m high, 0.21 m apart, so that both sides come to about 4,100 bars.
  - One thin rail at 0.92 m, on the deck side, below the free slat tops. No cap rail and no posts (none show in the photosphere).
- **Lighting:** low lights in the railing every 6 m. The reported lamp posts are not put on the deck: the photosphere shows over 100 m of river-side railing with none.
- **Ends on land:** the model's mapped bank lies wider than the real embankment at the downstream end. There the first ~40 m of the OSM line falls on model land and is drawn at promenade level.
- **Stand-off:** over the water the deck is pushed out (smoothly, up to a few metres) so that its bank-side edge clears the mapped bank by 0.4 m.

## What changed
- **New replica:** `places/golim.js`. It replaces `landmarks/boardwalk.js`, which guessed the line from the bank ring and a 400 m window. That builder now returns early via `replaced('golim')`.
- **`geo/city.js`:** a one-line guard skips the OSM boardwalk footways (class 5 bridge ways touching the two OSM end nodes). Before, they were drawn as a pale generic slab on top of the deck.
- **Triangles:** about 36k.

## Google check (2026-11-22)
- **Position and axis:** the model's deck was laid over Google satellite captures at z19 and z20. Its river edge falls within about 1 m of the deck edge in the imagery along the middle 300 m, and the axis agrees to within half a degree. The NE end on the Trường Tiền quay and the SW gangway by cầu Phú Xuân fall within a few metres of the imagery. The OSM line was kept unchanged.
- **Appearance:** a user photosphere taken on the deck itself (exact pose estimated from the image) shows these details:
  - The lim has weathered to grey-brown, which the satellite also shows.
  - The bronze railing has dulled to a dark brown-grey. It is gold-toned in the 2018 reports.
  - The bars are flat slats with the broad face along the railing.
  - No railing post stands out.
- **Model changes from this check:**
  - Deck and railing colours now follow the photosphere.
  - Bars are 50 mm wide, a 50 x 4 mm flat. This is derived from 7 t of bronze over 4,100 bars.
  - Posts are slimmer, in the bar colour.

## Review fixes (2026-11-22)
- Deck seams turned from lengthwise to transverse boards with panel joints; railing redrawn as cap-less slats over one low rail, posts removed; deck lamp posts removed; railing lightened to a pale grey-brown, deck a cooler grey.

## Left to do
- **Unconfirmed details:** real pile spacing, stair and ramp forms, where the reported lamp posts stand, and the exact slat section. Photos would settle them.
- **Roads:** the land-side link footways are still drawn as flat road ribbons by `city.js`, and they reach a little over the water at the links.
