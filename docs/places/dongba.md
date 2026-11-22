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
- The main hall has three storeys in grey render. Its roof is eleven sheet-roofed bays (green-grey) running across the hall, front to back, between light strips over the front gallery and along the back (Google satellite, 2025).
- Along Chương Dương the back is a row of stalls under arched tin hoods on a concrete band, the whole length of the back (Google Street View car panoramas, 2025). Behind it stands a long sheet-roofed hall, green on the satellite, and lower stall sheds at the south end. The halls at both ends are sheet-roofed too.
- The survey puts the hall at about 11 m. Open Buildings gives 11-15 m, highest toward the north half.

## Estimates

- Floor heights are 3.9 m and 3.25 m. The roof slab is at 10.4 m and the bay ridges reach 12.4 m (inside the survey's 11 m and Open Buildings' 11-15 m).
- The hood row: walls to 4.4 m, the band 4.4-5.0 m, hoods 6 m wide rising 1.3 m. Its stall fronts stand 2.5 m back from the kerb and the hoods reach 1.8 m out over them; the car panoramas put the fronts 4-6 m from the camera. The green hall behind is 6.8 m.
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

## Google alignment (2025 satellite and Street View)

- Position and axis already matched the satellite: the centre sits within about 1 m of the hall's middle, the axis is 27° from north, and the frontage, entrance canopy and both streets line up.
- The flat roof with folded concrete hoods all round, and the raised central roof, came from a misreading. The satellite shows transverse sheet-roofed bays, and the hoods are the arched tin hoods along Chương Dương. Both are now rebuilt that way.
- The Street View pictures sit in scratch/ only, as visual reference. Nothing is traced into data/.

## Polish
Added stall tarpaulins (blue, yellow, red, green) pitched from the hood band on poles along Chương Dương, a roofline billboard lattice, and shopfronts (roll-up shutters, coloured signboards, upper windows at a 3.6 m rhythm) on the two Trần Hưng Đạo corner buildings, after Street View 2025.

## Review fixes (Street View car panoramas and satellite, 2025)
- Trần Hưng Đạo forecourt rows: their street faces are now open stall bays of about 3.3 m, with yellow and red signboards, goods out front and a white awning on every third bay. The north row is 4.6 m tall.
- Chương Dương row: the solid wall is replaced by open bays (dark recess, piers every 6 m, goods). The hoods and their end tympana are corrugated grey and rust tin (the roof shader's ribbed kind), not flat tan and white.
- North end of that row (u 12-38): a lean-to with a mono-pitch corrugated roof (5.0-5.6 m) and a plain tin fascia with a scalloped lower edge, instead of arched hoods.
- South end hall: green sheet roof from u -50 outward (full depth u -78..-50, plus a strip v 15-30 to u -36). Small white stall roofs fill u -50..-36. The old two-storey spine is removed.
- North end hall, outward from the main hall: brown strip u 36-40, white stalls 40-54, brown 54-64, green 64-78. On the satellite the green band is about 14 m, against the ~17 m in the review.
- Back south: a taller concrete block (u -66..-41, 8.6 m, brown roof) with vertical fins on its Chương Dương face. It rises behind the hoods as in the south car panorama. White stall roofs sit at u -78..-66.
- Billboard: rays from both car panoramas cross just behind the hall's back parapet (u 0). It stands there on posts from the back shed, panel 14.8-18 m, so it clears the roofline from Chương Dương. It sits outside the hall footprint, so the hall's height check still measures the hall.
- Front: the inner tiled awning has no 1.8 m eave over the arcade any more (the red line). The canopy roof is salmon tile. White roll-down awnings hang along the canopy front and sides.
