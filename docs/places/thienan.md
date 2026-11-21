# Đan viện Thiên An (Thiên An Benedictine monastery)

Replica: `src/landmarks/places/thienan.js` (id `thienan`). The old block in `src/landmarks/south.js` (`thienAn`) is skipped by a `replaced('thienan')` guard.

## Sources
- OSM: way 493381029 (main outline, decomposed into church + monastery ranges), node 14351300803 (bell tower), steps 1580312663 / 1580312660 and the footways (from the local extract `data/raw/hue-osm-south4.json`; Overpass was unreachable).
- tonggiaophanhue.net (Tổng giáo phận Huế): crypt church begun 05/1960, inaugurated 11.07.1965; guesthouse, chapel and bell tower inaugurated 27.08.1998; a 3-storey, 28-room tiled house of 1942–43.
- Web search summaries of Vietnamese church press: work on the church over the crypt began 12-8-1994; the bell tower is seven storeys, after tháp Phước Duyên.
- jubilee.osb.org: founded 1940 from La Pierre-qui-Vire, priory 1959, abbey 1998.
- Saigon Times, mia.vn, vinwonders, tamgianglagoon travel pages: red-tiled roofs, stone walls, stained glass; the tower stands to the right of the chapel; a stone stair climbs from the foot of the hill; a garden before the main gate; a garden court with trees.
- DEM in `public/data/hue.json` (hilltop about 56 m; the complex sits on a 45–56 m slope).

## Confirmed
- Footprint and orientation of church and ranges (OSM outline, frame angle 151.98°).
- Bell tower position (OSM node) and seven storeys.
- Red tile roofs, cream/stone walls, stained glass, stone stair up the hill.
- The church stands over the 1965 crypt church (drawn as the tall stone base where the slope falls away at the apse).

## Estimated
- All heights: church walls 6.5 m, clerestory 10.6 m, roof 5.2 m; tower ~25 m to the cross, octagonal plan; ranges 2–3 storeys of 3.5 m.
- Porch on four columns, rose window, cross on the front ridge.
- The cloister garth and garden-court terraces, flower beds, statue, well-head.
- The grotto: its existence is typical of Benedictine houses in Vietnam but its location (beside the stair, near (−671.5, 6359)) is a guess.
- Colours, window rhythm, lamp posts along the stair.

## What changed
- New per-place replica with the church (nave, choir, polygonal apse, north arm), the seven-tier octagonal bell tower, the monastery ranges around the garth and garden court, the forecourt and steps, the lamp-lined stone stair, a grotto, the outbuildings, and night lights (tower cross, stair lamps, porch, church windows).
- Every block floors at its highest ground and stands on a stone base down to the lowest ground.
- Paved courts are registered in `S.paved` so no trees or houses grow inside.

## Heights check
- `docs/heights-reference.json` entry "Thien An Monastery" (outline, 20–25 m estimated) measures 19.7 m over the outline: within tolerance. The bell tower lies about 13 m outside the outline, so the entry measures the church. Entry left unchanged; no source gives a measured height.

## Left to do
- A measured height for the tower and church, and photos to confirm the tower's plan and storey heights.
- The grotto's real position and form.
- Interior of the church and the detail of the façade (stone texture, portal carving).
