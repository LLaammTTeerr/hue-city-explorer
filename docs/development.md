# Development

Notes for working on the code and the data. If you only want to look at the model, open https://hue-city.lamter.cc. The [README](../README.md) is the user guide. Agents (and newcomers) start with [AGENTS.md](../AGENTS.md).

## Run and build

```bash
npm install
npm run dev      # http://127.0.0.1:5183
npm run build    # static site in dist/ (relative paths, host anywhere)
npm run preview  # serve the built site
```

Everything the scene needs is bundled (`public/data/places.json`, `public/data/hue.bin`, `public/data/tiles/*.bin`,
`public/data/models/*-hero.glb`, `public/data/stories.json`, and `.woff2` fonts via npm; legacy `.woff` font fallbacks
are stripped from `dist/` by `vite.config.js`). `public/data/hue.json` is generated alongside `hue.bin` by
`npm run data:build` as the human-readable and Node CI source artifact (`scripts/lib/data.mjs`). No external map service
or CDN is contacted at runtime.

Startup order (`main()` in `src/main.ts`): the place index `places.json` (~33 kB) and the WebGL renderer come first,
together. Search and the cards work as soon as the index is in, above the loader, while the city loads. The compressed
binary geometry bundle `hue.bin` (~410 kB gzipped, inflated in the browser via `DecompressionStream('gzip')` and decoded
by `src/geo/codec.ts`) is fetched only once a renderer exists; it carries the terrain height grid and the trees and
infill houses of the opening view, while the remaining trees and infill arrive after the first frame as binary 4 km
tiles (`public/data/tiles/*.bin`, decoded by `decodeTileBin` in `src/geo/codec.ts`), fetched nearest first and planted
one per frame (`world.addTile` in `src/geo/city.ts`). As the camera moves (or when a visitor picks a place), 83
self-hosted hero ornament models (`public/data/models/*-hero.glb`, built by `scripts/build-hero-glb.mjs`) stream lazily
via `src/geo/hero-gltf.ts` and bind directly to `cityMaterial()`. Without WebGL, or when the load fails,
`src/ui/fallback.ts` shows a bilingual recovery screen with "Thử lại 3D / Retry 3D" and "Xem bản đồ 2D / Browse places":
a flat SVG map of the places over the land outline (from `places.json`), with search and the cards.

`window.__hue` exposes the scene for debugging, and `__hue.step(dt)` advances one frame by hand. `?look=real` or
`?look=ink` in the URL picks the rendering. `?nogl` makes the page behave like a device without WebGL (canvas
`getContext('webgl*')` returns null), to try the recovery screen and the 2D fallback. The performance marks
`hue:search-ready`, `hue:geometry-loaded`, `hue:first-frame` and `hue:tiles-loaded` time the startup; `__hue.tiles` is a
promise that resolves once every tile is in (each tile also fires a `hue:scene-changed` window event). `?still` stops
the frame loop (no drift, no adaptive resolution), so only `__hue.step` moves time.

`node scripts/shot.mjs --view <name>` captures a named view from `scripts/views.json`; `node scripts/compare.mjs <view>
--base <ref>` captures it on another revision too and writes a side-by-side page to `scratch/compare/`.

### Controls and UI

- **Camera (`src/camera/controls.ts`):** left-drag (or `Shift` + middle-drag) pans across the ground; scroll wheel or pinch zooms toward the cursor (`+` / `-` on keyboard); middle-drag or right-drag (plus `Ctrl`- / `Shift`-drag, two-finger twist/tilt, or `Q` / `E`) orbits and tilts; arrow keys pan; double-click flies closer; `H` (or the compass) returns to the opening view.
- **Atmosphere (`src/env/mood.ts`, `src/ui/ui.ts`):** continuous time-of-day slider (`0` morning → `1` late afternoon → `2` evening lights) plus `1` / `2` / `3` preset keys (`N` cycles presets), `R` toggles a passing shower (`Mưa rào`), and the season bar switches across Huế's four seasons (`Xuân` / `Hạ` / `Thu` / `Đông`).
- **Look, labels, search & PNG capture:** `I` (`V` or the Ink button) switches between the illustrated ink-and-wash look and the realistic look; `L` toggles place and street labels; `/` focuses search (`src/ui/search.ts`); `P` (or the camera menu in `#tools`, `src/ui/capture.ts`) renders and downloads a clean `1×` (screen), `2×`, or `4K` PNG screenshot.

### Shared views (`?v=1`)

The share button ("Chia sẻ góc nhìn" / "Share this view", on the place card and in the tool column) builds a link that
reopens the view (`src/ui/share.ts`). It uses the system share sheet where there is one, otherwise it copies the link.

```
?v=1&c=<x>,<y>,<z>&t=<x>,<z>&a=<aspect>&f=<fov>&m=<time><rain><look>[&p=<place id>]
```

| Key | Meaning |
| --- | --- |
| `v` | format version, `1`; any other value is ignored |
| `c` | camera position, scene metres, 1 decimal |
| `t` | camera target on the ground (x, z; its height is always `LAND_Y`) |
| `a` | width / height of the window the link was made in, 2 decimals |
| `f` | vertical field of view then, degrees |
| `m` | time of day `0` morning, `1` late afternoon, `2` lights on; rain `0`/`1`; look `i` ink or `r` realistic |
| `p` | place id whose card is open (`data.places`); left out for a free view |

Example: `?v=1&c=300.7,116.6,-395.5&t=0,0&a=1.78&f=37.6&m=20i&p=truongtien` (Trường Tiền, lights on, ink).
On load a valid link sets the atmosphere at once (no fade), places the camera (no opening flight) and opens the card;
the camera counts as moved, so a resize keeps it. The target and direction are kept and only the distance changes for
the new window: the link's full frame height, and as much of its width as the landmark needs (a centred landmark keeps
half the width, one near the edge all of it). On a phone, where the card covers the lower half, the camera tips down so
the view's centre sits in the strip above the card. A link that fails any check (wrong version, malformed number,
target off the map, distance out of the controls' range, unknown place) is ignored and the normal opening plays.
Other params (`?look=`) are not carried into a shared link; a shared link's look does not change the saved choice.

## Checks

| Command | What it checks |
| --- | --- |
| `npm run check` | runs all of the checks below; CI runs exactly this |
| `npm run check:types` | TypeScript type-check (`tsc --noEmit`) across `src/**/*.ts` |
| `npm run check:version` | `package.json`'s version has a section in `CHANGELOG.md` |
| `npm run check:heroes` | all 83 self-hosted hero `.glb` ornament assets (`public/data/models/*-hero.glb`) match `src/geo/hero-manifest.ts` and stay within size budgets |
| `npm run check:data` | sanity checks on the built bundle |
| `npm run check:heights` | landmark heights against `docs/heights-reference.json` |
| `npm run check:burial` | no model sunk into the ground |
| `npm run check:overlap` | no model on a carriageway, inside another model or under a kept building |
| `npm run check:joints` | every bridge deck meets its approach street: no step, gap or width jump at the joint |
| `npm run test:joints` | fixture test of the joining step (`src/geo/joints.ts`) on real road ends (`scripts/fixtures/joints-real.json`), within 1 cm; milliseconds |
| `npm run check:roofs` | no hip roof runs through another: side-by-side roofs meet in a valley gutter, an upper tier clears the slope below |
| `npm run check:markings` | no lane dash crosses another major carriageway or lies in a junction hole (markings stop at the junction mouth), and dashes away from junctions are kept |
| `npm run check:labels` | the label anchor heights in `places.json` (`a`) match the model tops of a freshly built scene; `--browser` (after `npm run build`) runs the same on the live page |
| `npm run check:tiles` | loading trees and infill by binary tile changes nothing: the scene built the app's way (`hue.bin` + `hue.json`, then `tiles/*.bin`) matches one built from every record at once |
| `npm run check:boats` | moored sampans and the moving dragon-boat fleet clear every bridge deck, pier, quay and boardwalk (`src/geo/clearance.ts`) |
| `npm run check:trees` | no tree the app plants (city and tiles) stands on the asphalt: its trunk off every carriageway, junction patch and paved sliver, and no more of its crown over them than the planting rule allows |

## Contributing

- `main` is protected: every change goes through a pull request.
- The `check` workflow (`.github/workflows/check.yml`) must pass, and the branch must be up to date with `main`.
- PRs are squash-merged, so each PR lands as one commit.
- Label heights: `npm run data:build` ends with `scripts/build-label-tops.mjs`, which builds the scene headless (`scripts/lib/scene.mjs`) and writes each place's model top into `places.json` as `a` (decimetres); `src/ui/labels.ts` reads it and falls back to ground + `h` without it. Changing a model under `src/landmarks/` or `src/geo/` moves its tops: run `node scripts/build-label-tops.mjs` (or the whole data build) and commit `places.json`; `npm run check` catches a stale one.
- After changing anything under `scripts/` or `data/`, rebuild the bundle with `npm run data:build` and commit `public/data/hue.json`, `public/data/hue.bin`, `public/data/tiles/` and `public/data/places.json` with the change (and run `node scripts/build-hero-glb.mjs` if changing hero ornament generators under `scripts/heroes/`).
- Fix a problem where it starts (the source data, the parser or a shared builder) and rebuild, rather than patching one place.
- Work in progress and history are in [`PROGRESS.md`](../PROGRESS.md). Per-place research notes are in [`docs/places/`](places/).

## Versioning and releases

The app's version is `version` in `package.json`, following [Semantic Versioning](https://semver.org/) as [`CHANGELOG.md`](../CHANGELOG.md) defines it for this project (major: a new edition; minor: new places, features or data; patch: fixes only). The build stamps it, with the short commit hash, into the About dialog.

Releases are automated with two workflows:

1. **`.github/workflows/release-pr.yml`** runs on every push to `main` (and via manual `workflow_dispatch` with an optional `patch` / `minor` / `major` override). It runs `scripts/prepare-release.mjs` to inspect all commits since the latest `vX.Y.Z` tag, computes the next semver version (`feat:` / `Add ...` → minor, `BREAKING CHANGE` / `!:` → major, everything else → patch), updates `package.json`, `package-lock.json` and `CHANGELOG.md`, and opens or updates a single rolling pull request (`chore(release): vX.Y.Z` on branch `release/next`).
2. **`.github/workflows/release.yml`** runs when that release PR is merged to `main`: it sees a version with no tag, tags the merge commit `vX.Y.Z` and publishes a GitHub release whose notes are that changelog section.

To let the bot open PRs and automatically trigger `check.yml` on them:
- Enable **Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"**.
- Optionally add a fine-grained PAT (with **Contents** and **Pull requests** read/write) as the repository secret `RELEASE_BOT_TOKEN` so bot-pushed PRs trigger the required `check` workflow without a manual close/reopen.

You can preview what the next release PR would contain locally with `node scripts/prepare-release.mjs --dry-run`. Tags are never made by hand, and a tag that exists is never moved.

## Deploy

Every push to `main` is checked, built and published to GitHub Pages by `.github/workflows/deploy.yml`. The site is live at https://hue-city.lamter.cc.

## Code layout

The browser runtime is written in TypeScript (`src/**/*.ts`) and type-checked by `npm run check:types` (`tsc --noEmit`):

- `src/geo/` — geometry kit (`buf.ts`), city builder (`city.ts`, `city-roads.ts`, `city-infill.ts`), binary codec
  (`codec.ts` for `hue.bin` and `tiles/*.bin`), lazy `.glb` hero ornament loader (`hero-gltf.ts`, `hero-manifest.ts`),
  and the materials (`materials.ts`) that paint surface detail per face kind (window bays and shopfronts, roof tiles,
  brick courses, timber halls, turf)
- `src/geo/foliage.ts` — leaf-card trees and areca palms; `src/geo/terrain.ts` — ground height
- `src/landmarks/` — Trường Tiền, Citadel monuments and gates, market, Thiên Mụ, cầu Nguyễn Hoàng, boats,
  lotus ponds and street traffic
- `src/landmarks/build.ts` — `buildLandmarks(data, world, group, opts)`, the one sequence that builds every landmark,
  then `populate`, then the moving things (boats, lanterns, lotus, traffic, street life). The browser (`src/main.ts`)
  and the geometry checks (`scripts/lib/scene.mjs`, used by `check:overlap`, `check:burial`, `check:heights`,
  `check:joints` and `check:boats`) both call it, so **a new landmark is added there, never in `main.ts`**: added
  anywhere else it would show in the city but escape the checks. It returns the handles the frame loop animates. The
  checks pass a `step` observer, called around each named step, to record what each one added; per-place replicas in
  `src/landmarks/places/*.ts` are picked up by `buildPlaces` without being listed.
- `src/env/` — sky (`sky.ts`), water (`water.ts`), rain (`rain.ts`), mood and season interpolation (`mood.ts`),
  cascaded shadows (`csm.ts`), IBL (`ibl.ts`), and the desktop post pass (`post.ts`: ambient occlusion, river mist,
  tilt-shift focus, bloom, ink outlines and colour grade)
- `src/camera/` — map controls (`controls.ts`)
- `src/ui/` — interface (`ui.ts`), search (`search.ts`), labels (`labels.ts`), high-resolution PNG export (`capture.ts`),
  shared links (`share.ts`), 2D fallback (`fallback.ts`, `fallback-map.ts`), and bilingual copy (`content.ts`, `place-names-en.ts`)
- `scripts/` holds the raw data fetchers (`scripts/fetch/`), the city bundle build (`build-data.mjs`), the hero `.glb`
  ornament generator (`build-hero-glb.mjs`, `scripts/heroes/`), and the automated checks (`scripts/checks/`).
- `docs/looks/` holds reference renders, `docs/places/` per-place notes, and `docs/reference/` source material.

## Data pipeline

`npm run data:fetch` (`scripts/fetch/fetch-osm-all.sh`) refreshes every OSM extract the build merges: the main Overpass
extract (`scripts/fetch/fetch-osm.sh`, bbox 16.4455–16.4965 N, 107.552–107.613 E → `data/raw/hue-osm.json`), the western
strip out to chùa Thiên Mụ at 107.5385 E (`data/raw/hue-osm-west.json`), the southern hills down to lăng Minh Mạng at
16.382 N in six pieces (`scripts/fetch/fetch-osm-south.sh` → `hue-osm-south1..6.json`), the northern villages to làng
Sình at 16.530 N in four (`scripts/fetch/fetch-osm-north.sh` → `hue-osm-north1..4.json`), the eastern strip out to Aeon
Mall at 107.620 E in three (`scripts/fetch/fetch-osm-east.sh` → `hue-osm-east1..3.json`; the box's east edge moved there
from 107.613 E for issue #71), the paved squares and car parks over the whole box (`hue-osm-paved.json`) and the fine detail of the water
park at hồ Thủy Tiên from the OSM API (`scripts/fetch/fetch-osm-detail.mjs` → `hue-osm-thuytien.json`). All the Overpass
extracts use one query (`scripts/fetch/fetch-osm-strip.sh`). A response replaces its file only once it parses, holds
elements and carries no Overpass `remark` (a timed-out, partial result); a piece that fails keeps its old copy and the
script exits 1. Where an element appears in several extracts the build keeps the newest copy (by the extract's
timestamp), and `meta.osmExtracts` in the bundle lists every extract with its date. The model's origin and box live
in `scripts/frame.json`, read by the build and by every raw-data fetcher. `scripts/build-data.mjs` turns it all into
`public/data/hue.bin` (gzip-compressed columnar binary via `src/geo/codec.ts`) and `public/data/hue.json` (human/CI
source artifact generated alongside `hue.bin`), plus the compressed binary tree and infill tiles (`public/data/tiles/*.bin`:
what the opening view and the place builders that read `data.trees` / `data.infill` need stays in the first-frame bundle;
a place file whose builder reads farther than 520 m from its point says so with `export const dataReach = <metres>`;
Node check scripts read the whole set through `scripts/lib/data.mjs`), and the small place index `public/data/places.json`
(places, water labels and a simplified land and Citadel outline in whole metres for the 2D map; the places stay in
`hue.json` too, since the scene builders read them there):

| From OSM, positions and proportions kept | Generated, shown as illustration |
| --- | --- |
| river, canals, moats, lakes (→ land is cut around the real banks) | infill houses on streets that have no footprints yet (toggle in the info panel) |
| streets, railway, bridges | trees, dragon boats, lamps, horizon ridges |
| building footprints; heights where tagged, otherwise from the city's 3D building survey (GISHue) | heights of the few buildings no source sees (estimated from type and area) |
| Citadel wall polygon (height 6.6 m from its tag), Imperial City walls, gates | roof shapes, facades, rooftop water tanks, rear wings on infill houses |
| footprints/axes of Trường Tiền, Kỳ Đài, Ngọ Môn, Điện Thái Hòa, Phu Văn Lâu, the market hall | the hand-built models and lazy `.glb` hero ornaments (`public/data/models/*-hero.glb`) standing on those footprints |

Road types. A road record in `hue.json` is `[class, bridge, points, width?, widths?, lanes?]` (widths in decimetres,
`widths` per point where a carriageway tapers, else 0). A sixth element marks an unmarked road type: a slip road of
1-3 lanes, drawn `lanes` × 3.5 m + 0.5 m wide with no lane dashes and no lamps, never narrowed as a divided twin nor
tapered into. Every OSM `*_link` way is one (`lanes` tag, else 1 if one-way, 2 if not); `data/road-types.json`
sets `unmarked-1/2/3` or `marked` for any other way by id. A pavement patch enclosed by slip roads stays a traffic
island once it reaches 10 m² (`ISLAND_MIN` in `src/geo/junctions.ts`) instead of being painted as a junction hole.

Ground height is calibrated against measurements; `npm run data:build` prints how well it fits. The surface comes
from the owner's elevation raster `data/raw/dem/output_hh.tif` (issue #73): Band 1, metres above the WGS 84
ellipsoid, the [Copernicus GLO-30](https://registry.opendata.aws/copernicus-dem/) surface on a 1 arc-second (≈30 m)
lattice. `scripts/lib/geotiff.mjs` reads it at build time (no dependency; the site never loads it). Its
georeferencing places it on the same lattice as `data/raw/dem/terrain.json` (read by `scripts/fetch/fetch-terrain.py`),
which also holds [FABDEM v1-2](https://doi.org/10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn) (bare earth). Everything else
stands on EGM2008, so the raster is moved onto that datum by a geoid plane fitted where it overlaps the Copernicus grid
of `terrain.json` (−14.0 m in the north-west to −13.3 m in the south-east). NoData cells (the file's NoData value,
the 0.00 written over open water, lagoon cells far under the sea) are skipped and fall back to bare earth. The result
is corrected against two kinds of measured height:

- **ICESat-2 satellite lidar** (`scripts/fetch/fetch-lidar.py` → `data/raw/lidar/icesat2-ground.json`): about 7,400 laser
  ground heights on land inside the box, good to a few decimetres, along tracks that pass within a few hundred metres
  of most of it (not refetched when the box grew east to 107.620 E: a new pull would shift the calibration
  across the whole city, and the strip leans on the nearby tracks). The difference between them and the model is spread from the tracks as a smooth correction; the drawn
  ground is within about 1.1 m rms of the laser on the plain.
- **Documented summits** (`data/control-points.json`): the tracks mostly miss the hilltops, where bare earth reads
  2-10 m low. Where the land is convex the ground moves to the surface model plus 2 m, which fits the published
  summits to about 1.2 m rms.

The city's own ground (3.5 m above sea level) and the river's level (0.9 m) are both the laser's readings, so the city
stands 2.6 m above the water. Heights stand 1:1 above that floor, with no vertical scaling: the plain keeps its
half-metre swells (broadly smoothed, about 30 m, where they stand low; hills keep their crests). Ground below the floor
is drawn at the floor. Hà Khê hill is too small for a 30 m model; the laser crossed chùa Thiên Mụ's compound twice
(13.1-13.3 m), and that is its level. Its terrace and stair are shaped by hand.

A 30 m surface model reads cuttings, embankments and roadside canopy as ground, so after calibration the build smooths
carriageways (OSM classes 0-3): where a road's grade changes by more than 8 % between neighbouring 25 m stretches, the
grid nodes under it move (at most 5 m) toward the line between its neighbours. The ground moves, not the road, so
streets, the houses seated along them and the terrain stay one surface. Designed landmarks on the plain get a level pad
(nodes within 60 m held at one height) so their models keep their own geometry; the ground at each road bridge's ends
is held level (the deck reads only those two heights and stays level and continuous), and rail bridges land at the
city floor. Generic buildings keep footprint, height and shape and are seated on the ground at their base.

Building heights come first from the city of Huế's own 3D building survey, published on
[GISHue](https://gishue.hue.gov.vn) (`scripts/fetch/fetch-gishue-heights.py` → `data/raw/heights/gishue.*`): each footprint
carries the height of a surface model above the ground; that surface model was flown by drone over the urban core
(about 12.6 km², the eastern Citadel and the south bank) and comes from satellite imagery outside it. It covers nine
in ten of the model's buildings and reads within half a metre of the heights that are published (Phu Văn Lâu, điện
Thái Hòa).
Where it holds no footprint the height comes from
[Google Open Buildings 2.5D Temporal](https://sites.research.google/gr/open-buildings/temporal/) (2023;
`scripts/fetch/fetch-heights.py`), a prediction from satellite imagery that reads about a tenth low and is raised by as
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
the committed grids were not recorded), then run `scripts/fetch/fetch-terrain.py`, `scripts/fetch/fetch-lidar.py`,
`scripts/fetch/fetch-heights.py`, `scripts/fetch/fetch-gishue-heights.py`, `scripts/fetch/fetch-landcover.py` and
`scripts/fetch/fetch-roofs.py` with `.venv/bin/python`.

Licences of each source are listed in the [README](../README.md#data-sources). Keep that list current when a source is added.
