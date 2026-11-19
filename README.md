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
- **Lên đèn / Lights on** — dusk, with the bridge cycling through its colours.
- The **compass** (or `H`) returns to the opening view from anywhere.
- The **label** button hides every name.

Mouse: drag to pan, wheel to zoom at the cursor, right-drag (or Shift-drag) to turn and tilt,
double-click to approach. Touch: one finger pans, two fingers pinch, twist and tilt.
Keys: arrows pan, `+`/`-` zoom, `B` boat, `R` rain, `N` lights, `L` labels.

## Data

`scripts/fetch-osm.sh` pulls one Overpass extract (bbox 16.4455–16.4965 N, 107.552–107.613 E) into
`data/raw/hue-osm.json`. `scripts/build-data.mjs` turns it into the 2.3 MB bundle the app loads:

| From OSM, positions and proportions kept | Generated, shown as illustration |
| --- | --- |
| river, canals, moats, lakes (→ land is cut around the real banks) | infill houses on streets that have no footprints yet (toggle in the info panel) |
| streets, railway, bridges | trees, dragon boats, lamps, horizon ridges |
| 5,159 building footprints; heights where tagged | building heights where untagged (estimated from type and area) |
| Citadel wall polygon (height 6.6 m from its tag), Imperial City walls, gates | roof shapes, facades, rooftop water tanks, rear wings on infill houses |
| footprints/axes of Trường Tiền, Kỳ Đài, Ngọ Môn, Điện Thái Hòa, Phu Văn Lâu, the market hall | the hand-built models standing on those footprints |

To refresh: `npm run data:fetch && npm run data:build`.

© OpenStreetMap contributors, ODbL — https://www.openstreetmap.org/copyright

## Layout

- `src/geo/` — geometry kit, city builder (land, roads, buildings, trees, walls), and the materials that paint
  surface detail per face kind (window bays and shopfronts, roof tiles, brick courses, timber halls, turf)
- `src/landmarks/` — Trường Tiền, Citadel monuments and gates, market, boats
- `src/env/` — sky, water, rain, mood presets, and the desktop post pass (depth-based ambient occlusion, bloom, grade)
- `src/camera/` — map controls and the boat ride
- `src/ui/` — interface, labels, copy (Vietnamese and English)

`window.__hue` exposes the scene for debugging; `__hue.step(dt)` advances one frame by hand.
