# Tàng Thư Lâu — `tangthulau`

Model: `src/landmarks/places/tangthulau.js` (the archive, its stair, the island and lake revetment, the bridge, a
stele). Before, the archive was only the mapped OSM footprint drawn as a generic tiled hall (`TRUE_H` / `OLD_HALL` in
`scripts/build-data.mjs`). It now disappears through `populate`, because the model covers it, so no guard was needed.

## Sources
- vi.wikipedia, Tàng Thư lâu: https://vi.wikipedia.org/wiki/T%C3%A0ng_Th%C6%B0_l%C3%A2u
- kienthuc.net.vn (quotes Đại Nam thực lục): https://kienthuc.net.vn/kho-tri-thuc/kham-pha-tang-kinh-cac-cua-viet-nam-duoi-trieu-nguyen-1399846.html
- hue.gov.vn visitor page "Tang Thu Lau – Hoc Hai lake" (seen in a search summary; the page returned 404 when fetched)
- VnExpress International: https://e.vnexpress.net/news/news/an-unclassified-peak-inside-nguyen-dynasty-library-4044661.html
- vietnamnet: https://vietnamnet.vn/en/library-building-of-nguyen-dynasty-opened-to-public-720023.html and
  https://vietnamnet.vn/en/centre-exhibitingroyal-legacy-re-opens-in-hue-720597.html
- heritagevietnamairlines.com, "The Temple of Wisdom": golden-yellow walls (seen in a search summary)
- OpenStreetMap, from `data/raw/hue-osm.json`:
  - building: way 173151284 (`building:colour #ffe0a0`)
  - upper gallery: layer-1 footway ring 1346839069
  - steps: 1346839061 and 1346839062
  - island garden: 1346839222
  - bridge outline: 1431132265 (`bridge:structure=beam`), carrying the service way 372295922
  - memorial node: 12458493990
  - wayside shrine: 1346839067
  - small building: 1346839070

## Confirmed
- Built 1825–26 under Minh Mạng and used until 1945. After 1975 it was turned into housing. Restoration began in
  2014 and cost VND 24.8 bn. It reopened in March 2021.
- Two storeys of plastered brick and stone, with a terracotta tile roof and golden-yellow walls.
- The lower floor has 11 bays (gian). The upper floor has 7 bays and 2 end bays (chái).
- Railings run all round. The upper floor has many doors and open railings for air.
- The island is rectangular. vi.wiki gives about 45 × 65 m, and the OSM outline is 62 × 41 m.
- One brick-and-stone bridge crosses from the west shore (OSM: 38.6 × 4.6 m, a beam bridge).
- The footprint is 40.0 × 15.1 m (OSM).
- An upper gallery runs about 1.1 m inside the outline (OSM layer-1 ring).
- Two flights of steps rise along the long sides and turn up the east end to a landing in its middle (OSM steps).
- Ridge at 11.5 m. This is the city survey's reading, which the build kept over `TRUE_H`'s 10.5 m.

## Estimated
- Base height 0.6 m.
- Lower storey 4.2 m. Upper walls 3.0 m to the eave.
- Gallery 2.2 m wide, with columns on each bay line. Roof flare and ridge ornament.
- Door and window shapes. The 3 bays on each short end.
- Colours of the joinery (dark lacquer) and the tiles (weathered terracotta).
- The bridge: 6 spans on masonry piers, solid plastered parapets, end posts.
- The stone revetment round the island and the lake shore.
- The memorial node is drawn as a plain stone stele.

## Left
- The two small mapped buildings on the island (the shrine at the south tip and an 8.8 × 4.4 m block) are still
  generic city buildings. The block takes the survey's 8 m and reads as a two-storey house. What it is today could
  not be confirmed.
- I found no photo caption or drawing for the true door pattern or the eave detail.
- Lights: lanterns in the upper gallery at night.
