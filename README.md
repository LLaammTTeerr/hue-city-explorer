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

- **Xuôi thuyền qua cầu / Ride under the bridge** — the camera comes down onto a dragon boat, passes
  beneath a span of Trường Tiền heading up-river, then turns and lifts over the north bank. Drag to
  look around; scrub the bar; `Esc` leaves.
- **Mưa rào / Passing shower** — a shower crosses for about a minute: rings on the river, haze over
  the far banks, lamps and the bridge lights coming on.
- **Time of day** — morning (clear light from the east), late afternoon (low sun up-river), or lights on
  (dusk, with the bridge cycling through its colours).
- **Toàn cảnh / Whole model** — pulls back to show the city as one slab, the way a model sits on a table.
- Click a **dragon boat** on the river to travel along with it.
- The **compass** (or `H`) returns to the opening view from anywhere.
- The **label** button hides every name.

Mouse: drag to pan, wheel to zoom at the cursor, right-drag (or Shift-drag) to turn and tilt,
double-click to approach. Touch: one finger pans, two fingers pinch, twist and tilt.
Keys: arrows pan, `+`/`-` zoom, `B` boat, `R` rain, `N` time of day, `L` labels.

## Data

`scripts/fetch-osm.sh` pulls one Overpass extract (bbox 16.4455–16.4965 N, 107.552–107.613 E) into
`data/raw/hue-osm.json`; `scripts/fetch-osm-strip.sh` adds extra strips (the western one, out to chùa Thiên Mụ at
107.5385 E, is `data/raw/hue-osm-west.json`; `scripts/fetch-osm-south.sh` fetches the southern hills down to lăng
Minh Mạng at 16.382 N in six pieces; `scripts/fetch-osm-detail.mjs` pulls the fine detail of one small area, used
for the water park at hồ Thủy Tiên) and the build merges them. `scripts/build-data.mjs` turns it into the ~5 MB
bundle the app loads:

| From OSM, positions and proportions kept | Generated, shown as illustration |
| --- | --- |
| river, canals, moats, lakes (→ land is cut around the real banks) | infill houses on streets that have no footprints yet (toggle in the info panel) |
| streets, railway, bridges | trees, dragon boats, lamps, horizon ridges |
| building footprints; heights where tagged, otherwise measured from the Open Buildings height raster | heights of the few buildings the raster does not see (estimated from type and area) |
| Citadel wall polygon (height 6.6 m from its tag), Imperial City walls, gates | roof shapes, facades, rooftop water tanks, rear wings on infill houses |
| footprints/axes of Trường Tiền, Kỳ Đài, Ngọ Môn, Điện Thái Hòa, Phu Văn Lâu, the market hall | the hand-built models standing on those footprints |

Ground height is bare earth: [FABDEM v1-2](https://doi.org/10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn) (Copernicus
GLO-30 with forests and buildings removed, about 30 m), cut to the model's box by `scripts/fetch-terrain.py` →
`data/raw/dem/fabdem.json`. The build keeps what stands 2.5 m or more above the city's own ground, so the hills rise to
their real height and the plain stays level. No open model resolves a hill as small as Hà Khê: its level comes from
FABDEM, its terrace and stair under chùa Thiên Mụ are shaped by hand.

Building heights come from [Google Open Buildings 2.5D Temporal](https://sites.research.google/gr/open-buildings/temporal/)
(2023), resampled to a 2 m grid by `scripts/fetch-heights.py` → `data/raw/heights/`. The raster reads about a tenth
low and blurs narrow buildings; readings are raised by a tenth, capped at four times a footprint's width, and ignored
beside the Vincom tower, whose height smears onto its neighbours. Hand-built landmarks keep their documented heights.

Which period an ordinary building belongs to (Nguyễn-period timber house, Indochine, modern) is not an OSM tag: the
build assigns it by district — the French quarter along Lê Lợi, the old shophouse streets of Gia Hội, the garden-house
wards of the Citadel, Kim Long and Vỹ Dạ — as an illustration of how those quarters read. The royal tombs, đàn Nam
Giao, Thiên An and the Thủy Tiên dragon stand on their mapped footprints and axes; their forms are hand-built.

To refresh: `npm run data:fetch && npm run data:build`. The terrain and height grids are committed; to fetch them
again: `python3 -m venv .venv && .venv/bin/pip install rasterio`, then `.venv/bin/python scripts/fetch-terrain.py` and
`.venv/bin/python scripts/fetch-heights.py`.

Data credits and licences:

- © OpenStreetMap contributors, ODbL — https://www.openstreetmap.org/copyright
- Terrain: FABDEM v1-2, © University of Bristol / Fathom, **CC BY-NC-SA 4.0**. `data/raw/dem/fabdem.json` and the
  `terrain` grid inside `public/data/hue.json` are derived from it and carry the same licence: non-commercial use,
  attribution, share alike.
- Building heights: Google Open Buildings 2.5D Temporal v1, CC BY 4.0.

## Layout

- `src/geo/` — geometry kit, city builder (land, roads, buildings, trees, walls), and the materials that paint
  surface detail per face kind (window bays and shopfronts, roof tiles, brick courses, timber halls, turf)
- `src/geo/foliage.js` — leaf-card trees and areca palms; `src/geo/terrain.js` — ground height
- `src/landmarks/` — Trường Tiền, Citadel monuments and gates, market, Thiên Mụ, cầu Nguyễn Hoàng, boats,
  lotus ponds and street traffic
- `src/env/` — sky, water, rain, mood presets, and the desktop post pass (ambient occlusion, river mist,
  tilt-shift focus, bloom, grade)
- `src/camera/` — map controls and the boat ride
- `src/ui/` — interface, labels, copy (Vietnamese and English)

`window.__hue` exposes the scene for debugging; `__hue.step(dt)` advances one frame by hand.
