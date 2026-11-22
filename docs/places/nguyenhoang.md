# Cầu Nguyễn Hoàng (Nguyễn Hoàng Bridge)

Model: `src/landmarks/places/nguyenhoang.js` (id `nguyenhoang`). It replaces `buildNguyenHoang` in `src/landmarks/more.js`, which now returns early via `replaced('nguyenhoang')`. The early return comes after `group.add(night)`, so the shared civic night group is still added. `src/geo/bridges.js` is unchanged: its `'Cầu Nguyễn Hoàng': { rise: 0 }` entry stays, and `build-data.mjs` still drops the bridge's carriageway ways, so no generic deck is drawn.

## Sources
- https://vnexpress.net/hoan-thien-cau-nguyen-hoang-4937191.html : 380 m, 5 spans, 43 m wide. 6 car lanes, 2 motorbike lanes of 3.5 m, a 3.5 m walkway. Navigation clearance 30 × 6 m. A yellow steel arch frame over 20 m tall at mid-bridge. Steel railings with a lotus pattern, red granite pavements, a walkway under the bridge. Named 8 September 2025.
- https://tienphong.vn/chiem-nguong-cay-cau-long-vang-doc-nhat-vo-nhi-khi-ve-dem-post1733117.tpo : main bridge 350 m (643 m with the approaches), steel arch span 180 m. The "hạc chầu Thiên Mụ" concept, design lead Antti Karjalainen (WSP Finland). 60 parasol lamp posts and multicolour LED lighting.
- https://tienphong.vn/doc-la-long-vang-cung-dinh-tren-cay-cau-nghin-ty-vuot-song-huong-post1726665.tpo : lọng lamps 4.6 m to over 14 m, set out on a parabola as two arcs at the two ends. Galvanised, powder-coated steel, golden. (This article gives 64 lamps; the opening-day reports give 60.)
- https://daidoanket.vn/ngam-cay-cau-co-thiet-ke-doc-dao-trong-ngay-thong-xe-ky-thuat-10302304.html : 380 × 43 m, arch over 20 m at mid-span, 60 lọng posts on both sides.
- https://vietnamfinance.vn/cay-cau-hon-1500-ty-dong-vuot-song-huong-dan-hien-hinh-hai-d113731.html : two arches, one on each side, over 30 m tall. 180 m navigation span. Each arch erected in 6 segments of about 12 m. Steel longitudinal girders and 128 cantilevered transverse girders.
- Search snippets of the same press: "2 vòm thép riêng biệt theo hướng dọc hai bên cầu, phân cách giữa phần xe cơ giới với phần xe thô sơ và lề đi bộ".
- https://khamphahue.com.vn/en-us/Hue-24h/Life/tid/Nguyen-Hoang-Bridge-through-the-Eyes-of-Experts.html/pid/18079/cid/514 : two low, slender 180 m arches ("flying bird"), V-shaped piers, royal yellow.
- https://commons.wikimedia.org/wiki/File:C%E1%BA%A7u_Nguy%E1%BB%85n_Ho%C3%A0ng_2025-04-27.jpg : a side view, used for the form.
- Position, axis and length: the OSM bridge outline (way 1431136610) as `data.nguyenhoang`, 347 × 51 m. The 2019 design drawings (sxd.thuathienhue.gov.vn) could not be reached.

## Confirmed
- Main bridge 350 m long and 43 m wide, in 5 spans with a 180 m steel arch span.
- Two separate yellow arches stand between the car lanes and the motorbike lanes / walkways.
- V piers, a steel deck with cantilevered cross girders, and a red granite walkway.
- White lotus-pattern steel railings.
- 60 golden lọng lamp posts, 4.6 to 14 m tall.
- Multicolour LED lighting at night.

## Estimates
- **Arch crown:** the two height figures are read together: 22 m over the deck ("over 20 m") and 30.6 m over the river ("over 30 m").
  - The arch springs from the V footings (±87 m, so 174 m apart at the water) and passes through the deck at about ±81 m, as the satellite shows the ribs emerging (−76 … +82 m).
  - The ribs stand upright, 26.4 m apart (satellite: a constant 26.0–26.2 m from end to end).
  - Rib section: 2.0 m wide, 2.4 to 3.4 m deep.
- **Hangers:** every 5.5 m.
- **Spans:**
  - The outer V legs meet the deck at ±114 m.
  - Grey wall piers stand at ±144 m and abutments at ±175 m.
  - That gives 30 + 30 + 228 + 30 + 30 m.
- **Deck height:** 6.6 m above the river at the ends and 8.4 m at mid-span, which leaves the 6 m clearance under a ~2.4 m structure. 46 m ramps on retaining walls run down to the streets.
- **Cross-section (from the axis):**
  - median ±1 m;
  - car lanes to ±11.5 m;
  - raised rib strip to ±14.5 m (rib and hanger line at ±13 m);
  - motorbike lanes to ±18 m;
  - granite walkway to ±21.5 m.
- **Lamp position:** the lọng stand on the rib strips (15 per row, 4 rows). Their heads rise parabolically toward the arch and run on into its curve.
- **Colours:** royal yellow arch and V legs, light grey fascia and steel, grey concrete side piers.
- **Night show:** an 8 s step through gold, amber, rose, violet and teal (mostly gold), warm white in rain. The lọng heads glow warm.

## Read from the satellite (Google, z17–z20, visual reference only; Street View returned blank frames)
- **Axis:** the deck edges run at 154.3°, parallel to the OSM outline.
- **Position:** the deck sits ~1.5 m east-north-east of the OSM outline (deck edges and both ribs, corrected for the image's lean on tall things). The OSM streets at both ends share the offset, so the model stays on the outline: moving the bridge alone opens a seam at both street joints.
- **Ribs:** parallel, not leaning inward; they cross the deck at about −76 and +82 m.
- **Wings:** at each corner a 3.6 m walkway ramp leaves the outer edge (118 m from the middle at the north end, 128 m at the south), runs beside the deck and splays out ~20° over 42–44 m to a round terrace on the bank (~18 m across). The model matches them to within ~1–2 m. The south-west terrace is drawn 15 m across so it stays off the mapped riverside street.

## What changed
- **Arch:** the old model put one arch over a single ~70 m span. It now spans the 180 m channel and continues below the deck to yellow V piers in the river.
- **Deck:** it was a flat box. It now has the real lane layout, with a gentle crown, cantilevered cross girders, a fascia, lane markings and lotus railings.
- **Lọng:** 60 parasol lamps (was 64), with fringe and finial, on the rib strips.
- **Lights:** the arch lighting changes colour, and the lights carry `userData.landmark = 'nguyenhoang'`.
- **Satellite rebuild:** the arch footings moved in from ±92 m to ±87 m and the inward lean was removed, to match the ribs seen from above. Added the four wing ramps with columns, railings and round terraces.

## Left
- The real span lengths, deck levels and lamp positions need the design drawings.
- The approach viaducts beyond the 350 m main bridge are drawn as short ramps onto the OSM streets.
- The walkway under the bridge is not modelled. The wing levels, the terrace heights and the column spacing are estimates.
- The satellite shows dark slots and grid strips beside the carriageway. They were read as rib shadows and are not modelled.
- The OSM roundabout at the south end sits ~8.6 m south of Google's. That is road data, not this place.
