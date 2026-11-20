# Huế · bên dòng Hương

An interactive 3D model of central Huế, Vietnam, built from OpenStreetMap data: the Hương river,
cầu Trường Tiền, chợ Đông Ba, and the Citadel with its wall, moat and gates.

## Run

```bash
npm install
npm run dev      # http://127.0.0.1:5183
npm run build    # static site in dist/ (relative paths, host anywhere)
```

Live at https://hue-city.lamter.cc — every push to `main` is built and published to GitHub Pages by
`.github/workflows/deploy.yml`.

Everything the scene needs is bundled (`public/data/hue.json`, fonts via npm). No map service is
contacted at runtime.

## What to try

- **Mưa rào / Passing shower** — a shower crosses for about a minute: rings on the river, haze over
  the far banks, lamps and the bridge lights coming on.
- **Time of day** — morning (clear light from the east), late afternoon (low sun up-river), or lights on
  (dusk, with the bridge cycling through its colours).
- **Toàn cảnh / Whole model** — pulls back to show the city as one slab, the way a model sits on a table.
- The **compass** (or `H`) returns to the opening view from anywhere.
- The **label** button hides every name.

Mouse: drag to pan, wheel to zoom at the cursor, right-drag (or Shift-drag) to turn and tilt,
double-click to approach. Touch: one finger pans, two fingers pinch, twist and tilt.
Keys: arrows pan, `+`/`-` zoom, `R` rain, `N` time of day, `L` labels.

## Data

`npm run data:fetch` (`scripts/fetch-osm-all.sh`) refreshes every OSM extract the build merges: the main Overpass
extract (`scripts/fetch-osm.sh`, bbox 16.4455–16.4965 N, 107.552–107.613 E → `data/raw/hue-osm.json`), the western
strip out to chùa Thiên Mụ at 107.5385 E (`data/raw/hue-osm-west.json`), the southern hills down to lăng Minh Mạng at
16.382 N in six pieces (`scripts/fetch-osm-south.sh` → `hue-osm-south1..6.json`) and the fine detail of the water
park at hồ Thủy Tiên from the OSM API (`scripts/fetch-osm-detail.mjs` → `hue-osm-thuytien.json`). All the Overpass
extracts use one query (`scripts/fetch-osm-strip.sh`). A response replaces its file only once it parses, holds
elements and carries no Overpass `remark` (a timed-out, partial result); a piece that fails keeps its old copy and the
script exits 1. Where an element appears in several extracts the build keeps the newest copy (by the extract's
timestamp), and `meta.osmExtracts` in the bundle lists every extract with its date. The model's origin and box live
in `scripts/frame.json`, read by the build and by every raw-data fetcher. `scripts/build-data.mjs` turns it all into
the ~5 MB bundle the app loads:

| From OSM, positions and proportions kept | Generated, shown as illustration |
| --- | --- |
| river, canals, moats, lakes (→ land is cut around the real banks) | infill houses on streets that have no footprints yet (toggle in the info panel) |
| streets, railway, bridges | trees, dragon boats, lamps, horizon ridges |
| building footprints; heights where tagged, otherwise from the city's 3D building survey (GISHue) | heights of the few buildings no source sees (estimated from type and area) |
| Citadel wall polygon (height 6.6 m from its tag), Imperial City walls, gates | roof shapes, facades, rooftop water tanks, rear wings on infill houses |
| footprints/axes of Trường Tiền, Kỳ Đài, Ngọ Môn, Điện Thái Hòa, Phu Văn Lâu, the market hall | the hand-built models standing on those footprints |

Ground height is calibrated against measurements; `npm run data:build` prints how well it fits. Two open models are
read on the same 30 m grid by `scripts/fetch-terrain.py` → `data/raw/dem/terrain.json`:
[FABDEM v1-2](https://doi.org/10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn) (bare earth) and the
[Copernicus GLO-30](https://registry.opendata.aws/copernicus-dem/) surface it was made from. They are corrected against
two kinds of measured height:

- **ICESat-2 satellite lidar** (`scripts/fetch-lidar.py` → `data/raw/lidar/icesat2-ground.json`): about 7,400 laser
  ground heights on land inside the box, good to a few decimetres, along tracks that pass within a few hundred metres
  of most of it. The difference between them and the model is spread from the tracks as a smooth correction. Each
  overpass predicted from the others, the calibrated ground is within 0.8 m rms of the laser on the plain (FABDEM
  alone: 1.1 m) and unbiased on the slopes.
- **Documented summits** (`data/control-points.json`): the tracks mostly miss the hilltops, where FABDEM reads 2-10 m
  low. Where the land is convex the ground moves from FABDEM to the surface model plus 2 m, which fits the published
  summits to 1.0 m rms.

The city's own ground (3.5 m above sea level) and the river's level (0.9 m) are both the laser's readings, so the city
stands 2.6 m above the water. Ground under 1.2 m above the city stays flat. Hà Khê hill is too small for a 30 m model;
the laser crossed chùa Thiên Mụ's compound twice (13.1-13.3 m), and that is its level. Its terrace and stair are
shaped by hand.

Building heights come first from the city of Huế's own 3D building survey, published on
[GISHue](https://gishue.hue.gov.vn) (`scripts/fetch-gishue-heights.py` → `data/raw/heights/gishue.*`): each footprint
carries the height of a surface model above the ground; that surface model was flown by drone over the urban core
(about 12.6 km², the eastern Citadel and the south bank) and comes from satellite imagery outside it. It covers nine
in ten of the model's buildings and reads within half a metre of the heights that are published (Phu Văn Lâu, điện
Thái Hòa).
Where it holds no footprint the height comes from
[Google Open Buildings 2.5D Temporal](https://sites.research.google/gr/open-buildings/temporal/) (2023;
`scripts/fetch-heights.py`), a prediction from satellite imagery that reads about a tenth low and is raised by as
much. Hand-built landmarks keep their documented heights.

Which period an ordinary building belongs to (Nguyễn-period timber house, Indochine, modern) is not an OSM tag: the
build assigns it by district — the French quarter along Lê Lợi, the old shophouse streets of Gia Hội, the garden-house
wards of the Citadel, Kim Long and Vỹ Dạ — as an illustration of how those quarters read. The royal tombs, đàn Nam
Giao, Thiên An and the Thủy Tiên dragon stand on their mapped footprints and axes; their forms are hand-built.
A building styled to a period is held to that period's heights (Indochine 4.6-13 m, a Nguyễn-period house 3.4-5.2 m),
but a measured height wins over the district: a building the survey measures more than a fifth above its period's
cap is taken for a later one, keeps its measured height and is not styled to the period.

To refresh: `npm run data:fetch && npm run data:build`. The build stops if a height raster, the terrain grid or the
lidar points are missing (`node scripts/build-data.mjs --allow-missing` builds without them, with a much rougher
result). The terrain and height grids are committed; to fetch them again:
`python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt` (versions not pinned: the ones that made
the committed grids were not recorded), then run `scripts/fetch-terrain.py`, `scripts/fetch-lidar.py`,
`scripts/fetch-heights.py` and `scripts/fetch-gishue-heights.py` with `.venv/bin/python`.

Licence: no licence has been chosen for the code yet, so for now it is all rights reserved (there is no LICENSE
file). The data keeps its own licences, below. Note that `public/data/hue.json` combines OpenStreetMap data (ODbL),
a FABDEM-derived terrain grid (CC BY-NC-SA 4.0) and heights from GISHue (no stated licence): anyone reusing it is
bound by all three, so treat it as non-commercial, share-alike, and in part not openly licensed.

Data credits and licences:

- © OpenStreetMap contributors, ODbL — https://www.openstreetmap.org/copyright
- Terrain: FABDEM v1-2, © University of Bristol / Fathom, **CC BY-NC-SA 4.0**. `data/raw/dem/terrain.json` and the
  `terrain` grid inside `public/data/hue.json` are derived from it and carry the same licence: non-commercial use,
  attribution, share alike.
- Terrain: Copernicus DEM GLO-30, © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under
  COPERNICUS by the European Union and ESA; all rights reserved.
- Ground heights: ICESat-2 ATL03 (NASA, NSIDC DAAC), processed with [SlideRule](https://slideruleearth.io). NASA data
  are open; no restriction on use.
- Building heights: the city of Huế's 3D building survey on GISHue (https://gishue.hue.gov.vn; made for the city with
  ADB support). The service is public but **states no licence**; `data/raw/heights/gishue.*` and the heights derived
  from it are used here with attribution and should not be taken as openly licensed.
- Building heights: Google Open Buildings 2.5D Temporal v1, CC BY 4.0.

## Layout

- `src/geo/` — geometry kit, city builder (land, roads, buildings, trees, walls), and the materials that paint
  surface detail per face kind (window bays and shopfronts, roof tiles, brick courses, timber halls, turf)
- `src/geo/foliage.js` — leaf-card trees and areca palms; `src/geo/terrain.js` — ground height
- `src/landmarks/` — Trường Tiền, Citadel monuments and gates, market, Thiên Mụ, cầu Nguyễn Hoàng, boats,
  lotus ponds and street traffic
- `src/env/` — sky, water, rain, mood presets, and the desktop post pass (ambient occlusion, river mist,
  tilt-shift focus, bloom, grade)
- `src/camera/` — map controls
- `src/ui/` — interface, labels, copy (Vietnamese and English)

`window.__hue` exposes the scene for debugging; `__hue.step(dt)` advances one frame by hand.
