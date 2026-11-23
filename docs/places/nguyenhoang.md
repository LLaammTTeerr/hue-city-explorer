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
- **Wings:** at each corner a 3.8–4.4 m walkway branches off the outer walkway and peels away in one smooth curve: its outer edge already stands +0.8 m beyond the deck's edge at 95 m from the middle, +2 m at 105 m, +4 m at 115 m, and the water opens between wing and deck at ~118–120 m (north) and ~128–130 m (south). From there the wing's centreline runs 4.2, 5.5, 6.9, 8.5, 10.1, 11.9 m off the deck edge at 125–150 m and comes down over 42–44 m to its terrace. The model draws the wing 4.4 m wide with that peel.
- **Terraces:** a pink-paved disc ~10–11 m in radius inside a white rim, ~25 m across in all, rounded toward the river and joined to the bank's paving and promenade on the land side. The model draws each one up to 12.5 m round its centre, cut back where a mapped street or building comes closer, with a white parapet only where its rim stands over the water or a drop.
- **No mid-span bulge:** the bright deck measures 43.3 m across at every point from −90 to +90 m (west edge ~+17.5, east edge ~−25.8 in the image's leaning frame); it only widens beyond ~90 m where the wings peel off. A 49 m reading at mid-span includes the deck's black shadow on the water.
- **Rib lean:** on z20 the two ribs stand 25.9, 26.1, 26.1 and 26.0 m apart at −60, −30, 0 and +60 m, while their apparent centre moves east with height exactly as the image's lean does (−4.1 m at 10 m up, −7.7 m at 30 m). Constant spacing means upright ribs; the diamond seen from above is their sun shadows. The model keeps them upright (the owner may still overrule from a photograph).

## What changed
- **Arch:** the old model put one arch over a single ~70 m span. It now spans the 180 m channel and continues below the deck to yellow V piers in the river.
- **Deck:** it was a flat box. It now has the real lane layout, with a gentle crown, cantilevered cross girders, a fascia, lane markings and lotus railings.
- **Lọng:** 60 parasol lamps (was 64), with fringe and finial, on the rib strips.
- **Lights:** the arch lighting changes colour, and the lights carry `userData.landmark = 'nguyenhoang'`.
- **Satellite rebuild:** the arch footings moved in from ±92 m to ±87 m and the inward lean was removed, to match the ribs seen from above. Added the four wing ramps with columns, railings and round terraces.

## Left
- The real span lengths, deck levels and lamp positions need the design drawings.
- The approach viaducts beyond the 350 m main bridge are drawn as short ramps onto the OSM streets.
- The walkway under the bridge, the stepped amphitheatre on the north-west bank and the riverside promenade on the south-east are not modelled (the north terraces stand where the deck is still on its abutment, so a path under it needs the abutment opened; the amphitheatre and promenade need a bank-landscaping builder outside this place). The wing levels, the terrace heights and the column spacing are estimates.
- The satellite shows dark slots and grid strips beside the carriageway. They were read as rib shadows and are not modelled.
- The OSM roundabout at the south end sits ~8.6 m south of Google's. That is road data, not this place.
