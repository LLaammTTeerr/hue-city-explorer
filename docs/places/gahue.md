# Ga Huế (railway station, 1906–1908) — `gahue`

Model: `src/landmarks/places/gahue.js`. The old `station()` in `src/landmarks/civic.js` now skips it with `replaced('gahue')`.

## Sources
- OpenStreetMap (local extract `data/raw/hue-osm*.json`; Overpass refused requests during this work):
  way 175063593 (station building, `building=train_station`), annexes 1332014349 (west) and 1332014347 (east),
  platforms 866800536 (along the building) and 866800535 (the island), and main line 1135136989.
- Google satellite (z19/z20) and a 2024 Street View car pano on Lê Lợi north of the forecourt
  (16.4566866, 107.5780509, headings 160–180). Used as visual reference only; nothing traced into `data/`.
- Wikimedia Commons photos: "Ga Huế (06h39 - 02.09.2026).jpg", "Hue Vietnam Hue-Railway-Station-01.jpg",
  "Hue Railway Station.jpg", "Hue railway station of Vietnam railway (May 30, 2018).jpg" and "HUE GA VIETNAM OCT 2010".
- https://vnexpress.net/ga-tau-hoa-hon-100-tuoi-o-hue-4588681.html: two-storey main block, single-storey wings,
  painted like Quốc Học, a clock over 100 years old.
- https://vi.wikipedia.org/wiki/Ga_Huế: opened 1908, 2 platforms, 8 tracks, km 688+320.
- mia.vn travel article: pink-red colour, arched doors.

## Confirmed
- Plan, from the OSM outline:
  - Middle block 21.8 × 14.7 m.
  - Wings 12.5 / 14.1 m long and 8.9 m deep.
  - End pavilions stand forward of the wings.
  - Annexes at both ends.
  - The island platform is about 180 m long.
- Form, from the photos:
  - Flat roofs behind parapets throughout. The task brief's "steep gabled roof" does not match any photo.
  - Upper floor of the middle block: 5 bays, with banded pilasters.
  - Curved clock gable with a "HUE" plate.
  - Three arched doors behind a flat canopy on six columns, with a welcome lettering strip.
  - A white sign board across the upper floor in the 2026 Commons photo. Both 2024 car panos show the five windows
    open and no board; the model follows the panos and leaves the board out.
  - Wings with a balustrade, arched bays and a grey dado.
  - Colour today: deep crimson with white trim.
- Platform side:
  - A cantilevered canopy along the building.
  - The island platform under a long green roof on single columns with iron brackets.

## Alignment against satellite and Street View (Nov 2026)
- OSM's outline sits about 1–2 m off and is too wide in the middle. The satellite parapet rows give a middle block
  about 19.4 m wide (x −1165.2…−1145.8, axis −1155.5) and 11.3 m deep. The same pano puts the axis at about −1155.6.
- The wings, end pavilions and annexes follow the satellite's x breaks. The overall span from the west pavilion to the
  east annex matches.
- Heights rescaled from the pano. The middle block is about 19 m wide, and the vertical FOV is used (Google's viewer
  FOV is vertical). Above the floor: string course 5.55–5.9 m, cornice 9.1–9.55 m, parapet 10.35 m, clock plate top
  12.0 m. Wings 5.0 m and end pavilions 5.4 m.
- The middle block has a low hipped tile roof behind its parapet; it shows on the satellite.
- Street canopy: 22.7 m wide, 4.1 m deep, on six columns. White fascia with the welcome line in blue capitals; red
  free-standing "GA HUẾ" letters about 1.5 m tall stand on the slab, centred (2024 pano). Boards hang between the
  columns (green, blue ticket-office board, red; two upright banners).
- The forecourt is open asphalt parking (satellite and pano); the earlier estimated garden island is removed.
  A row of frangipani trees stands in front of both wings.

## Estimated
- All heights: before Nov 2026 they were scaled from photos on OSM's 21.8 m width, which made them about 12% too
  tall. They are now scaled from the pano (see above). The flagpole tops out about 14.7 m above ground, within the
  check range ([10, 12] ±25%). The reference entry is unchanged.
- Length and column spacing of the island canopy (about 120 m of the platform).
- Forecourt markings (bay spacing) and the exact positions of the trees.
- The west annex. The satellite is ambiguous there, so the OSM outline is kept.
- The yard fence. OSM has no barrier ways here, so the old estimated rectangle is replaced by two short railings:
  - West side, against the neighbouring grounds.
  - East corner, by the drive.
  - Both are drawn with `FENCE.station`.

## What changed
- The generic box with a pitched roof and an estimated rectangular fence is gone. In its place:
  - The mapped stepped plan with the real façade.
  - The forecourt, both platforms and their canopies.
  - Lamp posts and night lights (window, canopy and lamp glow in `group`, `userData.landmark = 'gahue'`).

## Left
- Real fence lines, and the depot/goods sheds further along the yard, are not modelled here.
- The forecourt: OSM maps a service drive loop with a kerbed footway across the square; the reference is one sheet
  of asphalt. The drive comes from the shared road pipeline, so it is left as mapped.
- Heights should be checked against a measured drawing if one turns up.

## Review fixes (Nov 2026)
- Front line settled at z 1368.8 (satellite). The satellite roofs sit 2.5–3.9 m north of the model's walls, which is
  the lean measured on the wings and pavilions (about 0.35 m per metre of height: ~2 m at the wings, ~3.6 m at the
  parapet); the platform edge and the track, at ground level, match within 1 m. The car pano's spans (block 495 px,
  canopy 710 px) both fit to within 2% with the camera 2.7 m north of its recorded fix. A field-of-view error would
  scale both by the same factor, but they differ (13% and 15.5%), so the pano's position is what is off.
- Ground floor: all doorways are open round arches (three on the axis, narrower ones in the outer bays); wings,
  pavilions and annexes carry round-arched arcade openings.
- Clock: a white dial in a dark rim, with ticks and hands, in a white frame.
- East of the east pavilion: the satellite's three parts (red-roofed continuation 6.6 m, a lower mixed strip 7.6 m, a
  small block with a white parapet 5.6 m) instead of one flat annex.
