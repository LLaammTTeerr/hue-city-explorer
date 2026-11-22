# Phủ Cam Cathedral (Nhà thờ chính tòa Phủ Cam) — `phucam`

Model: `src/landmarks/places/phucam.js`. The old block in `src/landmarks/civic.js` (`phuCam`) is skipped by a `replaced('phucam')` guard.

## Sources
- OpenStreetMap way 118792054 (church outline), way 1173741401 (church yard), plus the paths, steps and gates in that yard: https://www.openstreetmap.org/way/118792054, https://www.openstreetmap.org/way/1173741401
- VietNamNet (80 × 24 m, 43.5 m towers, 21.5 m vault, materials, blue arched windows, glass strip and curved stone wings at the entrance): https://vietnamnet.vn/
- Huế provincial tourism page (towers of 7 stages, 43.5 m): https://visithue.vn/
- https://en.wikipedia.org/wiki/Ph%E1%BB%A7_Cam_Cathedral (concave centre lower than the towers, like an "open Bible"; statues of St Peter (right) and St Paul (left))
- https://vi.wikipedia.org/wiki/Nh%C3%A0_th%E1%BB%9D_ch%C3%ADnh_t%C3%B2a_Ph%E1%BB%A7_Cam (cross plan, head to the south; begun 1963, finished 2000, consecrated 28–29 June 2000)
- khamphahue.com.vn (grounds 10,804 m²; ribs that curve and meet in pairs, like hands joined in prayer)
- VnExpress (weathered raw stone)
- Wikimedia Commons front photographs: "Nhà thờ Chánh tòa Phủ Camafa.png" and the "2024 Huế - Phủ Cam Cathedral - img NN" set (the 2026-11 photo audit)

## Confirmed
- The plan is from OSM: a Latin cross 74.6 m long, with the axis 71° from east (heading south-south-east). Nave half-width 10.5 m, transept 40.4 m across, choir and a three-sided apse. The sources give 80 m, which probably counts the steps.
- Two bell towers, square in plan and set at 45°, 43.5 m tall, with 7 stages. The model measures 45.3 m from centre ground; `npm run check` passes.
- Grey stone walls, terracotta-tiled pitched roofs, tall blue arched windows, and leaning concrete ribs in pairs.
- The front between the towers (Commons photographs): a glass-block lattice strip beside each tower; two stone shoulders, each highest beside its tower and sloping concavely inward to a low centre; the coloured-glass strip and the door in that centre; and behind, the nave's triangular gable with cream infill, a stone rim and the cross on its apex. This is the "open Bible".
- Statues of St Peter and St Paul in the forecourt.
- The yard fence follows the real OSM yard ring, about 13,465 m², with its gates. It replaces the estimated rectangle.

## Estimates
- Eave height 10 m and ridge 26 m (choir 23.5 m). The only sourced inside figure is the 21.5 m vault.
- Tower stage heights and taper, belfry openings and the spire.
- Front shoulders (photo-derived, *est.*): 22 m beside each tower, curving down to 15 m at about 4 m from the axis, where they drop vertically to the low centre (8 m wide). The lattice strips run from 3 to 25.5 m. The gable apex is the model's ridge, 26 m (*est.*), with the cross 2.8 m above it.
- Towers (photo-derived, *est.*): continuous vertical arrises with no stage caps and a full-height dark slit on the inner front face. Square 7.0 m tapering to 5.9 m up to 33.2 m, set back to 4.6–4.3 m to 36 m and 3.4–3.1 m to 38.4 m, a pyramid to 41.2 m, and the cross to **43.5 m (sourced)**. The setbacks are on the inner side, as in the photos.
- Tower spacing: the photographs suggest centres a little wider than OSM's ±10.6 m; the model keeps the OSM diamonds.
- Statue size and pedestals, forecourt size (19 × 32 m) and step counts.
- The model puts the steps on the church axis. The OSM footpath and steps sit about 4 m off it.
- Seven mapped small houses inside the yard are covered with lawn beds and shrubs.

## Changes
- 2026-11 photo audit: the concave centre screen is replaced by the shoulders, lattice strips and nave gable with its cross, and the towers are continuous prisms without stage caps. Named views `phucam-front` and `phucam-aerial` in `scripts/views.json`.
- `docs/heights-reference.json`: Phủ Cam changed from 50 m to 43.5 m (VietNamNet and provincial tourism; 50 m was VinWonders' estimate).
- The brief described a folded concrete roof and glass walls. The sources show a stone church with two towers and tiled roofs, and the model follows the sources.

## Left
- No photo-measured eave or ridge heights, and no interior.
- One source (Báo Thừa Thiên Huế) gives 12 tower stages instead of 7.
- The exact number of window bays along the nave has not been checked against photos.
