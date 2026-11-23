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
- Two storeys (Google satellite and Street View, 2026-11): a raw-stone ground storey follows OSM's whole outline, capped by a pale concrete slab that overhangs it; the upper church on the slab is much narrower than the outline, rendered in cool grey concrete, with wide round-topped (parabolic) windows set in framed recesses with a cross of mullions, between flat pilasters, and terracotta-tiled pitched roofs. The apse has five facets. The earlier full-width single storey with leaning ribs did not match.
- The front between the towers (Commons photographs): a glass-block lattice strip beside each tower; two stone shoulders, each highest beside its tower and sloping concavely inward to a low centre; the coloured-glass strip and the door in that centre; and over the glass strip a curved stone hood, bowed forward, with the cross on its crown (no sharp gable shows). This is the "open Bible".
- Statues of St Peter and St Paul in the forecourt.
- The yard fence follows the real OSM yard ring, about 13,465 m², with its gates. It replaces the estimated rectangle.

## Estimates
- Position and axis (2026-11 Google check): the satellite, corrected for lean (about 0.42 m north per metre of height), puts the walls, slab edges and towers 3-6 m east of the OSM outline (the apse about 2 m) while the streets match OSM to a metre, so the model's frame is moved 3.5 m east. North-south is left as OSM (evidence conflicts within about 2.5 m). The axis, 71 deg from east, matches the satellite within about 1.5 deg.
- Massing (satellite widths, Street View proportions, *est.*): ground storey 5.2 m with a 0.45 m slab overhanging 0.9 m; upper nave 13.6 m wide, choir 12.4 m, transept arms 40.4 m across; eave 15 m, nave/transept ridge 21.2 m, choir ridge 20.4 m above the church floor (review 2026-11: the earlier 29.5/27.5 m pitched the roofs far steeper than the photographs; with these the sourced 21.5 m vault must be counted from the ground-storey floor, which is not confirmed).
- Six window bays a side in the nave, two in the choir, three in each transept end with a round window above, two on each transept arm face, one per apse facet.
- Front porch: a flat slab on two columns over the doors, with stairs rising on both sides from the forecourt to the porch level (Street View).
- Forecourt (satellite z20, re-measured 2026-11): an asphalt yard about 75 m across east-west, running 23.5 m north of the tower tips on the axis and along both towers to the west service drive and the east lane; its north edge drops about 1.5 m, by a short flight on the axis, to a lower garden where a central path runs between two pale paved panels about 25 m further to the lower flight at the gate. Statues stand near the yard's north edge. The hilltop is levelled at the source: `scripts/build-data.mjs` locks the terrain lattice within 32 m of the cathedral outline (and not across a street) at the ground level under it, so yard and church sit on the ground instead of on a 3.7 m plinth over the smoothed DEM.
- Tower stage heights and taper, belfry openings and the spire.
- Front shoulders (photo-derived, *est.*): 22 m beside each tower, curving down to 15 m at about 4 m from the axis, where they drop vertically to the low centre (8 m wide). The lattice strips run from 3 to 25.5 m. The hood is 9.2 m wide, rising from 14.6 m to its crown at 21 m (*est.*), with the cross 2.8 m above it.
- Towers (photo-derived, *est.*): continuous vertical arrises with no stage caps and a full-height dark slit on the inner front face. Square 7.0 m tapering to 5.9 m up to 33.2 m, set back to 4.6–4.3 m to 36 m and 3.4–3.1 m to 38.4 m, a pyramid to 41.2 m, and the cross to **43.5 m (sourced)**. The setbacks are on the inner side, as in the photos.
- Tower spacing: the photographs suggest centres a little wider than OSM's ±10.6 m; the model keeps the OSM diamonds.
- Statue size and pedestals, the panel edges in the lower garden and step counts.
- The model puts the steps on the church axis. The OSM footpath and steps sit about 4 m off it.
- Seven mapped small houses inside the yard are covered with lawn beds and shrubs.

## Changes
- 2026-11 Google check: frame moved 3.5 m east; two-storey massing (stone ground storey, slab, narrow rendered upper church, five-sided apse) replaces the full-width nave with leaning ribs; porch slab and side stairs replace the curved wings; forecourt deepened to about 36 m with the statues, lamps and upper flight moved out to its edge; nave gable in stone; window glass greyer.
- 2026-11 review: ridges lowered to 21.2/20.4 m; the forecourt re-measured as a 23.5 m asphalt yard over a lower garden with two paved panels; terrain levelled round the church in build-data instead of a raised plateau; the nave gable replaced by the curved hood; cool grey render, darker stone; wide parabolic windows.
- 2026-11 photo audit: the concave centre screen is replaced by the shoulders, lattice strips and nave gable with its cross, and the towers are continuous prisms without stage caps. Named views `phucam-front` and `phucam-aerial` in `scripts/views.json`.
- 2026-11 review fixes: ridges 21.2/20.4 m with the eave 1 m lower; the ground storey is a 4.2 m stone base recessed 1 m under a 0.45 m slab that overhangs it by 0.9 m, with doors and grilles in it (a sign error in the ring offset had inset the slab instead); arm windows 2.0 m, choir 2.1 m, transept ends 2.2 m and apse 1.8 m wide, with stepped piers at the apse angles; the hood is a cream concave shell over a gridded front window; the front side stairs are 28 shallow steps from beyond the tower corners to the porch slab; the yard is asphalt and marked as paved, so no trees are planted on it.
- `docs/heights-reference.json`: Phủ Cam changed from 50 m to 43.5 m (VietNamNet and provincial tourism; 50 m was VinWonders' estimate).
- The brief described a folded concrete roof and glass walls. The sources show a stone church with two towers and tiled roofs, and the model follows the sources.

## Left
- Eave and ridge heights are estimated from Street View proportions, not measured; no interior.
- The annex/bishop's house east of the church (an L-shaped tiled block on the satellite) is not modelled; the garden beds and ramps east of the yard are simplified.
- The window tracery, the arched recesses round the transept windows, and the lattice strips are simplified.
- One source (Báo Thừa Thiên Huế) gives 12 tower stages instead of 7.
- The exact number of window bays along the nave has not been checked against photos.
