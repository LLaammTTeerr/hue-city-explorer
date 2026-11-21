# Development

Notes for working on the code and the data. If you only want to look at the model, open https://hue-city.lamter.cc. The [README](../README.md) is the user guide. Agents (and newcomers) start with [AGENTS.md](../AGENTS.md).

## Run and build

```bash
npm install
npm run dev      # http://127.0.0.1:5183
npm run build    # static site in dist/ (relative paths, host anywhere)
npm run preview  # serve the built site
```

Everything the scene needs is bundled (`public/data/places.json`, `public/data/hue.json`, `public/data/stories.json`,
fonts via npm). No map service is contacted at runtime.

Startup order (`main()` in `src/main.js`): the place index `places.json` (~32 kB, ~13 kB gzip) and the WebGL renderer
come first, together. Search and the cards work as soon as the index is in, above the loader, while the city loads. The
geometry bundle `hue.json` (~8 MB, ~3 MB gzip) is fetched only once a renderer exists. Without WebGL, or when the load
fails, `src/ui/fallback.js` shows a bilingual recovery screen with "Thử lại 3D / Retry 3D" and "Xem bản đồ 2D / Browse
places": a flat SVG map of the places over the land outline (from `places.json`), with search and the cards.

`window.__hue` exposes the scene for debugging, and `__hue.step(dt)` advances one frame by hand. `?look=real` or
`?look=ink` in the URL picks the rendering. `?nogl` makes the page behave like a device without WebGL (canvas
`getContext('webgl*')` returns null), to try the recovery screen and the 2D fallback. The performance marks
`hue:search-ready`, `hue:geometry-loaded` and `hue:first-frame` time the startup. `?still` stops the frame loop (no drift,
no adaptive resolution), so only `__hue.step` moves time.

`node scripts/shot.mjs --view <name>` captures a named view from `scripts/views.json`; `node scripts/compare.mjs <view>
--base <ref>` captures it on another revision too and writes a side-by-side page to `scratch/compare/`.

## Checks

| Command | What it checks |
| --- | --- |
| `npm run check` | runs all of the checks below; CI runs exactly this |
| `npm run check:version` | `package.json`'s version has a section in `CHANGELOG.md` |
| `npm run check:data` | sanity checks on the built bundle |
| `npm run check:heights` | landmark heights against `docs/heights-reference.json` |
| `npm run check:burial` | no model sunk into the ground |
| `npm run check:overlap` | no model on a carriageway, inside another model or under a kept building |
| `npm run check:joints` | every bridge deck meets its approach street: no step, gap or width jump at the joint |
| `npm run check:roofs` | no hip roof runs through another: side-by-side roofs meet in a valley gutter, an upper tier clears the slope below |

## Contributing

- `main` is protected: every change goes through a pull request.
- The `check` workflow (`.github/workflows/check.yml`) must pass, and the branch must be up to date with `main`.
- PRs are squash-merged, so each PR lands as one commit.
- After changing anything under `scripts/` or `data/`, rebuild the bundle with `npm run data:build` and commit `public/data/hue.json` and `public/data/places.json` with the change.
- Fix a problem where it starts (the source data, the parser or a shared builder) and rebuild, rather than patching one place.
- Work in progress and history are in [`PROGRESS.md`](../PROGRESS.md). Per-place research notes are in [`docs/places/`](places/).

## Versioning and releases

The app's version is `version` in `package.json`, following [Semantic Versioning](https://semver.org/) as [`CHANGELOG.md`](../CHANGELOG.md) defines it for this project (major: a new edition; minor: new places, features or data; patch: fixes only). The build stamps it, with the short commit hash, into the About dialog.

Not every PR needs a release. To cut one:

1. In a PR, raise `version` in `package.json` (`npm version minor --no-git-tag-version`, or `patch` / `major`) and add a `## X.Y.Z (date)` section at the top of `CHANGELOG.md`, listing the PRs since the last release. `npm run check:version` fails until the section exists.
2. Merge the PR. `.github/workflows/release.yml` sees a version with no tag, tags the merge commit `vX.Y.Z` and publishes a GitHub release whose notes are that changelog section.

Tags are never made by hand, and a tag that exists is never moved.

## Deploy

Every push to `main` is checked, built and published to GitHub Pages by `.github/workflows/deploy.yml`. The site is live at https://hue-city.lamter.cc.

## Code layout

- `src/geo/` — geometry kit, city builder (land, roads, buildings, trees, walls), and the materials that paint
  surface detail per face kind (window bays and shopfronts, roof tiles, brick courses, timber halls, turf)
- `src/geo/foliage.js` — leaf-card trees and areca palms; `src/geo/terrain.js` — ground height
- `src/landmarks/` — Trường Tiền, Citadel monuments and gates, market, Thiên Mụ, cầu Nguyễn Hoàng, boats,
  lotus ponds and street traffic
- `src/landmarks/build.js` — `buildLandmarks(data, world, group, opts)`, the one sequence that builds every landmark,
  then `populate`, then the moving things (boats, lanterns, lotus, traffic, street life). The browser (`src/main.js`)
  and the geometry checks (`scripts/lib/scene.mjs`, used by check:overlap, check:burial, check:heights and
  check:joints) both call it, so **a new landmark is added there, never in `main.js`**: added anywhere else it would
  show in the city but escape the checks. It returns the handles the frame loop animates. The checks pass a `step`
  observer, called around each named step, to record what each one added; per-place replicas in
  `src/landmarks/places/` are picked up by `buildPlaces` without being listed.
- `src/env/` — sky, water, rain, mood presets, and the desktop post pass (ambient occlusion, river mist,
  tilt-shift focus, bloom, grade)
- `src/camera/` — map controls
- `src/ui/` — interface, labels, copy (Vietnamese and English)
- `scripts/` holds the data fetchers and the bundle build (`build-data.mjs`), plus the checks.
- `docs/looks/` holds reference renders, `docs/places/` per-place notes, and `docs/reference/` source material.

## Data pipeline

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
the ~8 MB geometry bundle the app loads (`public/data/hue.json`), plus the small place index `public/data/places.json`
(places, water labels and a simplified land and Citadel outline in whole metres for the 2D map; the places stay in
`hue.json` too, since the scene builders read them there):

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

Licences of each source are listed in the [README](../README.md#data-sources). Keep that list current when a source is added.
