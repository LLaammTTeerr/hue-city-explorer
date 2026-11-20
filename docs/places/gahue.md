# Ga Huế (railway station, 1906–1908) — `gahue`

Model: `src/landmarks/places/gahue.js`. The old `station()` in `src/landmarks/civic.js` now skips it with `replaced('gahue')`.

## Sources
- OpenStreetMap (local extract `data/raw/hue-osm*.json`; Overpass refused requests during this work):
  way 175063593 (station building, `building=train_station`), annexes 1332014349 (west) and 1332014347 (east),
  platforms 866800536 (along the building) and 866800535 (the island), and main line 1135136989.
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
  - A white sign board across the upper floor (2026).
  - Wings with a balustrade, arched bays and a grey dado.
  - Colour today: deep crimson with white trim.
- Platform side:
  - A cantilevered canopy along the building.
  - The island platform under a long green roof on single columns with iron brackets.

## Estimated
- All heights, scaled from photos on the 21.8 m width:
  - Floor +0.5 m, cornice 10 m, parapet 11.6 m, clock plate top 13.5 m above the floor.
  - Wings 5.6 m to the cornice.
  - Annexes 4.8 m.
  - The model's top is about 14 m above ground, within the check range ([10, 12] ±25%). The reference entry is unchanged.
- Length and column spacing of the island canopy (about 120 m of the platform).
- Forecourt layout: an asphalt square with parking bays and a kerbed garden island in the middle. This also keeps
  generic infill houses off the square.
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
- The forecourt garden's exact layout is not confirmed.
- Heights should be checked against a measured drawing if one turns up.
