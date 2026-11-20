# Chợ Đông Ba (place `dongba`)

Model: `src/landmarks/places/dongba.js`. It replaces `buildMarket` in `src/landmarks/citadel.js`, which now returns early when `replaced('dongba')`.

## Sources

- OSM: the main hall is way 172641246 (72.0 x 42.6 m). The market precinct is 161714451. The forecourt kiosks are 1050232932-40, the corner and side buildings 1050232924-30 and 1464534911, and the fruit market is 1557002446. All are read from `data/raw/hue-osm.json`.
- GISHue drone survey (`data/raw/heights/gishue`, 90th-percentile height) and Google Open Buildings 2.5D 2023 (`data/raw/heights/open-buildings-2023`), sampled in the hall's frame.
- Front on Trần Hưng Đạo: https://vnexpress.net/kham-pha-cho-dong-ba-4127933.html ("mặt tiền nằm trên đường Trần Hưng Đạo"; "Chợ gồm ba lầu") and https://tapchisonghuong.com.vn/tin-tuc/p2/c15/n4146/Cho-Dong-Ba.html
- Three floors, 15,600 m²: https://vinwonders.com (Chợ Đông Ba guide).
- History: built 1899, clock tower destroyed 1967, renovated in 1987 with four two-storey corner buildings and rows of stalls. Sources: https://vi.wikipedia.org/wiki/Ch%E1%BB%A3_%C4%90%C3%B4ng_Ba and vietnamtourism.com.
- The entrance today: Wikimedia Commons, "Dong Ba Market (Hue) - Chợ Đông Ba Huế (July 2024)", img 02 and img 09 (the en.wikipedia lead photo). Older photos: ChoDongBa.JPG, and "Chợ Đông Ba về đêm.JPG" (2012).
- 2022 infrastructure works: vietnamnews.vn, article 1252873.

## Confirmed

- The front faces Trần Hưng Đạo (west), not the river. The old model turned the hall toward the river, so its clock tower stood on the river side. That is why a mapped building (OSM 1050232930, a rear food hall) appeared "in front of the clock tower".
- There is no clock tower today. The entrance is a flat canopy with a black LED band edged in red, giant red capitals "CHỢ ĐÔNG BA" standing on top, and a row of coloured flags above.
- The main hall has three storeys in grey render, with a row of folded concrete hoods along the roofline.
- The survey puts the hall at about 11 m. Open Buildings gives 11-15 m, highest toward the north half.

## Estimates

- Floor heights are 3.9 m and 3.25 m. The roof slab is at 10.4 m and the hoods reach 11.3 m. The raised central roof is 13.5 m, an estimate fitted to the Open Buildings 14-15 m.
- The canopy is 14 m wide and 17 m deep, with its underside at 4.3 m. The LED band runs from 4.85 to 6.9 m, and the letters are 12.6 m wide.
- The front gallery (v 21.3-27) is set from the survey strip at 11 m. Column spacing is 6 m.
- The side and rear stall halls are 5 m tall with sheet roofs in bays. The two-storey blocks are 7-7.4 m. All extents come from the survey and OSM footprints.
- The wharf is a stone quay edge 90 m behind the hall (130 m long, with steps and bollards). Its position is inferred from the mapped moorings and the land edge, not from a mapped quay.

## What changed

- The model is rebuilt facing Trần Hưng Đạo. The 1899-style clock tower is gone and the 2024 entrance canopy and sign take its place. The front gallery and hoods are new.
- New parts: the forecourt stall rows, the two corner buildings, the north, south and rear stall halls, and the wharf. Their volumes cover the mapped kiosks and halls, so populate() drops those buildings instead of drawing boxes inside the model. That includes 1050232930, the building that stood in front of the old tower.
- Heights reference: the entry is now "Chợ Đông Ba, main hall", 11-14 m (estimated). The model measures 13.5 m.

## Still to do

- The text on the LED screen and the flags' exact colours and count are approximate.
- The 2023-24 renovation named in the brief could not be confirmed. Only the 2022 infrastructure works are documented.
- The interior court and stall layout are not modelled.
- The wharf's exact position and form are unverified.
