# Progress

## Done
- Ink lines across roads at hill rims (2026-11-21): the terrain mesh stood 3 cm proud of the slab at every node,
  including the rim nodes where the ground stops rising, so each drawn cell meeting the plain slab ended in a 3 cm step
  along the 25 m lattice. Roads and greens write no depth, so the ink's depth edges drew those steps as long straight
  lines across asphalt (riverside road under chùa Thiên Mụ; the boulevard at x≈77, z≈564). terrain.js now sinks
  non-rising nodes 3 cm under the slab (fine lake cells take the same offset on the coarse triangles, so no seam), and
  the mesh dives into the slab along a shallow crease the ink ignores. Wall, kerb and roof ink unchanged.
- Trường Tiền lights (2026-11-21): the stepped colour scenes are replaced by one continuous colour band that slides
  along the bridge (`bandColor` / `bandMaterial` in src/landmarks/truongtien.js).
- Riverside lights (issue #21, 2026-11-21): build-data.mjs derives `riverLamps` from the Hương banks (embankment posts
  every ~24 m where a road reaches the bank) and the riverside footways/lanes (low lights every ~16 m), and flags
  buildings facing the river (bit 256: ≥4.5 m, within 130 m, unobstructed) as floodlit. city.js marks their faces
  KIND_FLOOD; materials.js paints warm uplight scallops after dark. `src/landmarks/riverlights.js` builds the posts and
  two glow clouds. 896 posts, 1648 walkway lights, 161 facades; frame time unchanged within noise.
- Paved yards and squares (issue #22, 2026-11-21): new 'paved' ground drawn over the parks as paving, kept free of
  trees and buildings. From OSM: highway areas (area=yes), area:highway, place=square and surface car parks, the last
  three from the new light extract `data/raw/hue-osm-paved.json` (`fetch-osm-strip.sh … paved`, in data:fetch). From
  the Sentinel-2 scene: bright, non-green 10 m cells inside parks and lawns, squared to the nearest street. 80 yards
  (49 OSM, 31 satellite); checked at Nghênh Lương Đình, Thương Bạc and the south bank by Trường Tiền.
- Waving flags (2026-11-21): shared `src/landmarks/anim.js` flag, wave in metres on the shared clock/wind (the old Kỳ Đài
  wave was scaled to ~0.1 m and invisible). Used at Kỳ Đài, Bảo tàng HCM (2) and Đông Ba (7), and the old citadel builder.
- OSM extract fetched and processed into `public/data/hue.json` (scripts/).
- 3D scene: land cut around real water, roads, rail, 5,159 OSM buildings, illustrated infill and trees.
- Hand-modelled landmarks on OSM footprints: cầu Trường Tiền, Citadel wall and gates, Kỳ Đài, Ngọ Môn,
  Điện Thái Hòa, Phu Văn Lâu, chợ Đông Ba hall and bell tower, dragon boats.
- Atmosphere: afternoon / shower / lights-on moods, planar water reflection (desktop), rain.
- Interaction: map controls, place list and cards, labels toggle, compass home.
- UI in Vietnamese and English; phone layout.
- Checked in the browser: opening view, rain, night, recovery from
  an edge-of-map street-level camera, labels off, OSM-only toggle, phone viewport, production build.

- Visual upgrade (branch `visual-upgrade`): procedural facades, roof tiles, masonry and timber-hall shading;
  eaves, parapets, roof tanks, ridge beams; lumpier smooth-shaded trees; turf/earth ground; lane markings;
  desktop post pass (ambient occlusion, bloom, grade); soft shadows; instanced houses and trees chunked for
  culling and kept out of the water reflection unless near water. Measured ~11–14 ms per frame at 1280×800
  on an Apple M5.

- Deployed: public repo `LLaammTTeerr/hue-city-explorer`, GitHub Pages via `.github/workflows/deploy.yml`
  (push to `main` → build → publish). Custom domain `hue-city.lamter.cc` is set on the Pages site.
  DNS: `CNAME hue-city → llaammtteerr.github.io` (Cloudflare, DNS only). HTTPS certificate issued and
  enforced on 2026-11-19; https://hue-city.lamter.cc verified in the browser.
- Git identity for this repo is the GitHub noreply address (local config). The remote is HTTPS; pushes need the
  LLaammTTeerr credential (`gh auth switch --user LLaammTTeerr` or a per-command token), not the work account.

- Diorama pass (branch `diorama-look`, after the Singapore and "Quack" references): the city is a finite slab on a
  calm backdrop; river lowered between 4.6 m banks with lakes/moat on their own higher sheet; Trường Tiền deck raised
  (tour no longer scrapes it); morning front light by default plus late-afternoon and evening; row houses with gable
  roofs; wind in the trees; over-water buildings on piled decks; composer pixel-ratio bug fixed (was double-sizing
  buffers on retina screens).
- Places: 64 labelled, including Nghênh Lương Đình, Cửa Kẻ Trài, phố đi bộ Nguyễn Đình Chiểu, Phố Tây, cầu Nguyễn
  Hoàng and chùa Thiên Mụ (extract widened west with a merged strip; tháp Phước Duyên modelled on its OSM octagon).

- Terrain and landmark pass (branch `landmark-shapes`): real ground height from public elevation tiles (hills in
  the west/south-west, Hà Khê hill restored under Thiên Mụ); land, roads, buildings, houses, trees and labels follow it.
  Cầu Nguyễn Hoàng remodelled (five spans, wide deck, golden arch frame, parasol lamps); Thiên Mụ with its tower
  proportions, four pillars, steps, pavilions and triple gate; Quốc Học in dark red with its gate. Institutions no
  longer get shopfronts. Aged surface pass (damp, mould, moss, soot) and 76 moored sampans.

- Restyle (branch `restyle`, on top of `landmark-shapes`): the model is presented as a miniature — long lens from
  the air, tilt-shift focus, low river mist, timber plinth and floor shadow. Trees rebuilt as leaf-card foliage with
  areca palms; windows read as recessed with sun glints; imperial tiles are glazed; street-facing awnings and
  balconies; lotus on the still water; motorbikes and cars on main streets.
  Interface redrawn as paper, ink and a vermilion seal. Frame cost brought back to ~16 ms at 2190×1369 on an
  Apple M5 (4.3 M triangles, ~370 draw calls) after it had risen to ~27 ms.

- Slopes and density (branch `restyle`): every building carries its own floor level (`aBase`), so on a hillside it
  is bedded from the lowest ground but its doors and windows start at the highest — no more houses sunk into the
  slope. Blocks are filled behind the street fronts with one or two back rows of houses (infill 34,727 → 63,859).
  Roofs no longer cast shadows (walls do), keeping the frame at ~16–17.5 ms at 2190×1369.

- City landmarks (branch `restyle`): the named places that were generic boxes now have their own models on their OSM
  footprints — Ga Huế, nhà thờ Phủ Cam, Dòng Chúa Cứu Thế, cung An Định (palace, Trung Lập pavilion, gate), chùa
  Diệu Đế, Hiển Lâm Các with the nine urns, Vincom, Lầu Tứ Phương Vô Sự; steel trusses on cầu Bạch Hổ
  (`src/landmarks/civic.js`).
- Eras: every ordinary building is Nguyễn-period timber, Indochine or modern (`scripts/build-data.mjs` §4b decides by
  district; shader kinds COLONIAL/MODERN paint the facades; palettes and roof forms differ per family).
- Performance: roof tanks lightened and chunked, small details culled beyond 1.5 km, tree and house chunks beyond
  3.6–5.2 km (`src/geo/lod.js`).
- South extension: the bundle now runs 12.7 km north–south, down to lăng Minh Mạng (six extra Overpass pieces,
  `scripts/fetch-osm-south.sh`; eight elevation tiles). Terrain keeps true hill heights (25 m grid, soft dead zone).
  `data.sites` hands each southern site's footprints to its model: `src/landmarks/tombs.js` (Tự Đức, Minh Mạng,
  Khải Định, Thiệu Trị, Đồng Khánh) and `src/landmarks/south.js` (đàn Nam Giao, hồ Thủy Tiên and its dragon, Thiên An,
  Vọng Cảnh). Street life (lamp posts, pedestrians, more traffic, a train) is in `src/landmarks/life.js`.
- Hồ Thủy Tiên remodel (branch `thuytien-remodel`): `src/landmarks/thuytien.js` replaces the first version. The
  park's fine detail comes from the OSM API (`scripts/fetch-osm-detail.mjs` → `data/raw/hue-osm-thuytien.json`):
  grandstand, show pool, slide pools, plazas, sculptures, entrance, and the three footbridges that meet at the
  dragon. The aquarium is a saucer-rimmed drum under a dome with the dragon coiled round it and reared over the
  lake. Trees gained a hill-pine type (kind 3, `src/geo/foliage.js`), planted across the southern hills.
- Night lighting (branch `night-lighting`, on top of `card-overlap`): windows are lit by neighbourhood and by
  facade (5–30 % of rooms, each its own strength and colour) instead of nearly all at full strength; bloom eased.
  Trường Tiền and cầu Nguyễn Hoàng carry light strips as real geometry (`lightMaterial` in `src/geo/materials.js`),
  so the river mirrors them: Trường Tiền's six bows drift through neighbouring hues and gather into violet now and
  then (warm white in rain); Nguyễn Hoàng's arch is washed gold. The dragon's three footbridges at hồ Thủy Tiên are
  now thin railed walkways on piers.
- Boat ride: the guided ride under cầu Trường Tiền was removed (2026-11-21). Gone: `src/camera/ride.js`, the ride
  button, HUD and scrub bar, the `B` key, the spare ride boat, and click-a-boat-to-follow. Kept: the dragon-boat fleet as scenery.
- Eras: the era switcher and its engine were removed (2026-11-21); the model shows today only. Gone: `src/era.js`,
  the per-face `span` / `aSpan` clipping, the older houses, the era roles in `life.js`, the per-era flag and lamps.
  `src/geo/eras.js` became `src/geo/districts.js` (`inCitadel`, `inHills`, used by the trees). Still in the data and
  unused: the `eras` texts in `public/data/stories.json` (43 places).
- Bia Quốc Học (`src/landmarks/memorial.js`): the 1920 memorial screen opposite the school gate; the gate is now
  placed square to it. Dimensions are estimated (no source gives them).
- Ground levels: lakes in the hills stand at their own height (55 of 171, read from the elevation model), with the
  ground held flat at that level in the lake, on its islands and along its shore (`pondLv` in the data, `pondY` /
  `waterY` in `src/geo/terrain.js`).
- Explorer panel: the note card shows picture with credit, dates, summary, story,
  facts and sources from `public/data/stories.json` (63 places, vi + en; 97 Wikimedia Commons picture references
  under free licences, loaded online, not bundled; 12 places have no picture). About 30 entries were written by
  helper agents and only spot-checked: dates and figures in the 18 sampled matched known history.
- Polish pass, started: `docs/reference/*.md` hold sourced factsheets for bridges, the Citadel, city landmarks, tombs
  and the south. Applied so far: Trường Tiền without its pier balconies (removed 1991–95), cầu Dã Viên's six viewing
  pavilions, Ngọ Môn's two arched side passages, Nghênh Lương Đình with porches. Still to do against the factsheets:
  cầu Phú Xuân (374.65 m × 17 m), cầu Nguyễn Hoàng's arch (sources conflict: check a photograph), the An Cựu river
  bridges and cầu Gia Hội (no facts found), đàn Nam Giao's red lower railing, Thiên Mụ's pavilions, each tomb's
  axis sequence, Bia Quốc Học's true dimensions.
- Atmosphere and HUD pass (branch `golden-hour`), from a visual specification the user passed on: the model opens at
  golden hour (amber low sun, lavender shade and haze); rain is slate-violet; foliage, roofs and the Citadel's stone
  are weathered rather than fresh; the river glare is a path, not a sheet. HUD: one crimson accent, gold hairlines,
  blurred parchment labels with stems, tier 3–4 labels only below ~200 m, the place list in three groups with a
  fold toggle. Deliberately not taken: ACES tone mapping (washed out, magenta speckle in the glitter),
  PCFSoftShadowMap (deprecated in this three.js), a bank-distance river gradient (no bank distance in the shader).
- Fixed: the gates of chùa Thiên Mụ were drawn at city level and sat buried in Hà Khê hill.
- Night and riverfront pass (branch `night-magic`), from a second specification the user passed on:
  amber uplighting on Kỳ Đài, Ngọ Môn, Thái Hòa, Phu Văn Lâu, Nghênh Lương Đình, Cửa Ngăn, Cửa Thượng Tứ and
  Tháp Phước Duyên (`citadel.js`; floodlight strips today only, doorway lanterns in every era); lit dragon boats
  and 160 drifting hoa đăng (`boats.js`, `buildLanterns`); the ironwood walkway on the south bank
  (`boardwalk.js`, 400 m, 2018, place `golim`); wet sheen in the rain, stone embankments with moss, flagstone
  terraces, backlit foliage, softer crowns, bằng lăng and hoàng mai accents (`materials.js`, `foliage.js`).
  The spec's "other branch" (`feat/hue-atmosphere-ui`) does not exist in this repo.
- That branch later arrived as a patch (made against `b2e4245`, before the two passes above) and was reviewed and
  merged selectively (branch `atmosphere-ui-merge`).
  Taken: `post.js` (S-curve only inside 0–1 so bright glints cannot invert, plum-to-cream grade, softer far blur),
  `sky.js` (drifting wisps of cloud, a mist band on the horizon), labels the window edge would cut are hidden,
  full-sun / setting-sun icons for morning / late afternoon, the slightly deeper ground, road and roof palette and
  the morning and night presets, a fade at the foot of the place list, and the idea of a dark lacquer interface
  once the lights are on (`body[data-time='2']` in `style.css`, rewritten on the current tokens; crimson stays the
  one accent, lifting to vermilion where it is text).
  Left out: its golden-hour and rain presets (ours are newer), the second collapse button (`#brand-fold` exists),
  the card replacing the place list (the list stays usable beside the card), kind-coloured label borders and gold
  as a second accent (one-accent rule), the inner frame on the title sheet.
- Map-style search (branch `map-search`): the title sheet and its place list became one search box at the top left
  (`src/ui/search.js`). It searches only the 77 places of `hue.json`, by name, kind and description in both
  languages, without needing tone marks; the panel under it has kind filter chips and, before anything is typed,
  the whole-model row and the three curated groups. The place card now hangs under the box like a map's side
  panel and its name is written in the box; `/` focuses the box. Phones: box across the top, period row under it,
  tools and compass in a column on the right, the quick strip of places kept at the bottom. The fold toggle is gone.
- Heights and overlaps (branch `map-search`):
  - Place tags are anchored on the model itself: 3 m over the surface above the place's point, or over the highest
    vertex within its radius (`r` in the data, default 14 m; 36 m for Phủ Cam, Dòng Chúa Cứu Thế and Thiên An, whose
    towers stand off-centre). `modelTops` in `src/ui/labels.js`; the hand-typed `h` is now only the fallback for water,
    islands, streets and districts. Check from the console: `__hue.labels.anchors`.
  - Núi Ngự Bình's point was 450 m east of the summit; it and đồi Vọng Cảnh are moved onto the highest ground nearby
    in `build-data.mjs` §9, and the Vọng Cảnh lookout is built at the place's point.
  - Real heights are collected in `docs/reference/heights.md` (16 sourced, 42 estimated from storeys and type).
    Applied: Nguyễn halls and pagodas take eaves of 3.6-5.2 m (they were 5-9.5 m, so halls stood 13-16 m instead of
    8-11 m); 19 named places drawn as ordinary buildings carry their true ridge height (`TRUE_H`, sixth field of a
    `bld` record) and no stair heads or water tanks; Tàng Thư Lâu, điện Long An, Quốc Tử Giám and Thương Bạc are tiled
    halls, not modern blocks; Đông Ba's hall about 10 m and its tower about 22 m (was 31 m); Ngọ Môn 14.7 m (was
    16.1); Phu Văn Lâu 11.8 m (was 9.7); the Redemptorist spire 53 m (was 56.7); Quốc Học's blocks two storeys.
    Left as they were: Kinh thành gates (17.2 m; only an estimate of 13-14 m found), Phủ Cam (46 m; one page says
    50 m), Vincom (164 m with mast; 160 m published), chùa Diệu Đế, Bia Quốc Học, Ga Huế (estimates only).
  - Buildings, houses and trees are placed after the landmark models (`populate` in `src/geo/city.js`) and keep off
    the ground a model covers (`coverOf`: 1 m cells under its raised, upward faces). Houses and mapped buildings keep
    off all of it, trees only off roofs and platforms 2.2 m or higher, so the pines stay on đàn Nam Giao's lawn
    terraces. The Citadel rampart is exempt (it is planted). Mapped buildings inside a landmark's own outline are
    dropped in the data (Lầu Ngũ Phụng on Ngọ Môn, a block inside Kỳ Đài).
  - Hill bridges climb between banks of different height instead of lying level at the lower one and running into
    the ground; the southern models take their ground levels from the whole footprint, not its corners.
  - Tombs: where a footpath or lane crosses an enclosure wall the wall opens, with a post either side (`crossings`
    and `wallLine` in `src/landmarks/tombs.js`; paths within a site's radius + 60 m). Terraces and gates take their
    level from the whole footprint, not its corners: Minh Lâu's three terraces were buried up to 3.6 m in the
    hillock they stand on. Đàn Nam Giao's Trai Cung court and halls sit on the highest ground inside its walls.
    The cover map samples five points per cell, so trees also keep off wall tops.
  - Left as it is: footpaths end at hall platforms and resume behind them (they are mapped through the halls); the
    burial mounds are bedded into their hills.
- Measured terrain and building heights (branch `real-terrain`; sources compared in `docs/reference/data-sources.md`):
  - Terrain is calibrated against documented elevations, as one rule for the whole map, not point fixes.
    `data/control-points.json` holds the control points (six summits, the courts of Đại Nội from flood depths, the
    river's ordinary stage; research in `docs/reference/elevation-control.md`); `npm run data:build` prints the table
    and the error of each source. Finding: FABDEM (bare earth) is right on the built-up plain but 5-10 m low on every
    hill, because it strips "forest" that hides no ground; the Copernicus surface model matches the documented
    summits to about 2 m but reads roofs on the plain. The build uses FABDEM on the plain and moves to Copernicus as
    the ground rises, from 2 m to 8 m above the city floor (`BLEND0`/`BLEND1` in `build-data.mjs` §9). Error over the
    control points: bare 6.2 m rms, surface 2.1, calibrated 1.8, the finished model 1.7 (Ngự Bình 101.0 for 103,
    Thiên Thai 115.6 for 118, Vọng Cảnh 44.0 for 43, núi Bân 41.3 for 43, Đại Nội 4.1 for about 3.5).
    `scripts/fetch-terrain.py` writes both grids to `data/raw/dem/terrain.json` (`h` bare, `s` surface); the
    terrarium tiles and `fetch-elevation.sh` are gone. Ground under 2.5 m above the floor (4.1 m asl) stays flat;
    summits are not shaved by the smoothing; a hill standing straight over the water keeps its height at the bank.
  - Chùa Thiên Mụ: the walled ground is one level, 10.1 m above the floor (14.2 m asl; `data.hakhe`). No published
    height for Hà Khê hill was found, so it is not a control point: its level follows from the calibration. The model
    stands the compound on a stone-faced terrace with the tower at its brow and one straight stair, 13 m wide, down
    to the riverside road (`buildThienMu`). The terrace is ground: exempt from the cover map (`S.noCover`). Terrace
    and stair are shaped by hand.
  - Đồi Vọng Cảnh was on the wrong hill: it is the hill straight over the river bend, now at (-2826, 5173).
  - Known deviation: the city floor stands 4.6 m above the drawn river (`LAND_Y`); the control points put it about
    3 m above the ordinary stage. Left as it is: bridges, boats and embankments are fitted to it.
  - Building heights: Google Open Buildings 2.5D Temporal 2023 (CC BY 4.0), `scripts/fetch-heights.py` →
    `data/raw/heights/` (2 m grid, half-metre steps). 5,696 of 6,070 mapped buildings take a measured height (sixth
    field of a `bld` record: height to the top; the builder fits the eave under its roof), generated houses take the
    reading on their plot. Against the 19 known places the raster reads 10-20 % low, so readings are raised by a
    tenth; large footprints are read by their bulk (65th-80th percentile), a reading is capped at four times the
    footprint's width, and measured buildings within 220 m of Vincom are held to 20 m (its 160 m smears onto its
    neighbours). Monuments (`TRUE_H`, seventh field) and hand models keep their documented heights.
  - Both fetch scripts need Python with `rasterio` (a throwaway venv); the build itself still needs only Node.
  - Not checked: individual measured heights against photographs; the raster is known to read narrow shophouses low.
- Frame cost after all of this: ~18 ms at 2190×1369 (unchanged from before the extension), ~11–14 ms at 1280×800.
- Realism handoff (branch `claude/hue-3d-realism-handoff-ba1946`, 2026-11-21), from a five-track specification another
  agent wrote (`hue-3d-realism-handoff.zip`). The user then asked to see two renderings of the same model, so there
  is a switch (pencil button, key `V`, `?look=ink`; `__hue.setLook(0|1)`, `shared.uLook`):
  - Realistic (default). `cityMaterial` / `landMaterial` are `MeshStandardMaterial` with per-kind roughness and
    metalness, relief normals (tile ribs and laps, brick joints, plaster, reveals), rooms behind window glass
    (`hueRoom`, interior mapping), and rain as a low-roughness film. The mood's sky is the environment light
    (`src/env/ibl.js`, rebuilt only while the mood changes; desktop only, phones keep the old fill and painted
    glints via `#ifndef USE_ENVMAP`). `MOODS` carry `hemiEnv` / `envI` beside `hemiI`. Focus blur is off below 120 m.
  - Illustrated, the user's choice and now the default (`?look=real` or the pencil button for the other; the choice
    is kept in `localStorage` as `hue-look`). After the Pocket City reference (april-zhu.com/pocketcity).
    `post.js`: an ink line from the second difference of the depth buffer (`uInk`, `uInkEdge`), a paper wash with the
    sheet's tooth, a paper backdrop with a faint dot grid in place of the sky, lines lighter with distance. Trees:
    leaves write zero alpha (alpha-to-coverage is switched off for them in this look), the blurred mask is the crown
    as one shape, so the pen goes round it. `materials.js`: `hueNoise` / `lNoise` settle toward their middle tone so
    weathering becomes flat wash; tile roofs are hatched down the slope; surfaces are matt. `water.js` (`uLook`): one
    jade wash, a faint mirror, pale strokes on the crests. `mood.js` (`state.look`): less sun, more fill.
    Roads and ground: `KIND.LINE` (12) is a face that is a kerb joint in the realistic look and the pen in the drawn
    one; `buildRoads` lays outlines under the pavements and carriageways map-fashion (all outlines, then fills from
    minor to major), so side streets open into the roads they meet. Open land is two washes, grass and earth, with
    an edge between them (`grassN` in `landMaterial`), and grass carries small pen marks (also on parks, kind 5).
    Trees keep 46 m clear of Ngọ Môn, Thái Hòa, Kỳ Đài, Phu Văn Lâu and Nghênh Lương Đình (`forecourts` in
    `foliage.js`).
    Checked: opening view, Thái Hòa, Phố Tây, Nguyễn Đình Chiểu, Ngọ Môn (also in rain), Trường Tiền at night, the
    1885 era. Not checked: the boat ride, the 1935 era. Not drawn: paving joints on pavements, crossings; footpaths
    (class 5) have no edge line.
  - Shadows (`src/env/csm.js`): boxes centred on the point of attention, not view-frustum slices. The sun keeps the
    wide map; a second unlit directional light carries a tight map (27 % of the width, 2048), chosen in the shader
    (`LIGHTS` in `materials.js`; the sun must stay directional light 0). Depth ranges hug the model, so the bias is
    under a texel instead of ~2.5 m and shadows meet their casters. The two maps are drawn on alternate frames.
  - Track 2, by a helper agent (`buf.js`, `citadel.js`, `truongtien.js`): curved hip roofs with lifted corners
    (`segs` / `horns`), `pavilion({ colonnade })` with free-standing columns, `passages()` through Ngọ Môn and the
    gates, 14 panels per Trường Tiền span.
  - Gates open through the walls (`src/geo/gates.js` shared by `city.js` and `citadel.js`): `buildWalls` cuts a
    5.6 m slot out of the rampart at each Citadel gate (`polygon-clipping`, now a runtime dependency) and stops the
    Imperial City's wall at the footprints of its gates and at Ngọ Môn's whole box; the Citadel gate block reaches
    to both rampart faces (`reach` in `gate()`), so the tunnel runs the wall's full thickness. The porch workaround
    in `passages()` (`covers`) is no longer used by any caller. Seen: Thượng Tứ and Đông Ba from outside, Hiển Nhơn,
    Ngọ Môn from both sides. The inner mouths of the Citadel gates were not seen clearly (trees in the way).
  - Track 4, by a helper agent (`foliage.js`, `water.js`, `boats.js`): six tree species picked in `foliage.js`,
    cross wavelets and current on the river, V-wakes (layer 1), lofted hulls. No shoreline darkening.
  - Not done: track 3 (asphalt roads, kerbs, ground textures, street dressing), `KIND.METAL` for the steel bridges,
    `.glb` hero models (none exist), the diorama-blur checkbox. Willows are planted by any water, so one stands on
    Ngọ Môn's axis. Comparison frames: `docs/looks/`.
  - Frame cost at 1024×768 on this machine: about 13 ms before, 19 ms with both maps drawn every frame, 60 fps
    (16.3 ms by `requestAnimationFrame`) with alternate maps; about 15.5 ms in either look at 1280×800 (render plus a
    forced read-back), 16.8 ms once the road outlines were added. Not measured on a phone.

## Not verified
- The southern models were checked from the air only; causeway landing, the dragon's heading, Nam Giao's exact
  alignment and the Đồng Khánh tomb's orientation are inferred, not surveyed.
- Street life was checked in still frames (stepped), not watched in real time.
- Real touch gestures on a physical phone (layout and logic checked in a 375×812 viewport only).
- Frame rate on low-end phones (adaptive resolution is in place but untested on hardware).

## Next (ideas)
- Lăng Gia Long lies 3 km beyond the southern edge.

## Lidar-calibrated terrain and surveyed building heights (2026-11-21, branch `lidar-calibration`)

Asked where the height data came from and whether a reliable source exists; then "rebuild both". Research notes are
in `docs/reference/` (`elevation-survey-sources.md`, `heights-sourced.md`, `building-heights-sources.md`).

Done:
- **Ground: ICESat-2 lidar** (`scripts/fetch-lidar.py` → `data/raw/lidar/icesat2-ground.json`; NASA, open; read
  through SlideRule's public service). 7,419 land points and 945 river points used.
  - Terrain = FABDEM + summit rule (toward Copernicus + 2 m where the land is convex) + a smooth field of lidar
    residuals (150 m bell, falling back on a 900 m one). The old "blend to the surface model as ground rises" is
    gone: it ran 2.2 m high on slopes.
  - Fit: plain 0.83 m rms (FABDEM 1.13), each overpass predicted from the others; documented summits 1.0 m rms;
    drawn model 1.2 m rms on them.
  - City floor 3.47 m asl and river 0.87 m are lidar readings, so `LAND_Y` is 2.6 (was 4.6). The build warns if the
    constant and the data drift apart.
  - Hà Khê: 38 lidar points inside the compound, 13.3 m asl, 9.8 m above the city (was drawn 10.1 above a floor that
    was itself 0.6 m too high).
  - Flat-plain gate loosened to 1.2 / 3.0 m (was 2.5 / 5.0).
- **Buildings: GISHue city survey** (`scripts/fetch-gishue-heights.py` → `data/raw/heights/gishue.*`), field
  `percentile90z`. 5,259 of 6,070 buildings take it; 558 fall back to Google Open Buildings; the rest keep tags or
  rules. Estimated landmark heights give way to the survey's reading; điện Kiến Trung (rebuilt after the survey) is
  set to its published 14 m.
- **Landmarks:** Phủ Cam towers 43.5 m (were about 47). Trường Tiền and Nguyễn Hoàng decks are now fixed above the
  water (6.4 m, 6.8 m) instead of above the bank.

Known weak points:
- GISHue states no licence. It is credited in the README and the info panel; whether to keep it in a public repo is
  the owner's call.
- The survey's drone flight covers only the urban core (about 12.6 km²); outside it the same field comes from a
  coarser surface model. Its readings for the Vincom tower (57 m) are wrong, so the tower keeps its own model.
- Ordinary road and rail bridges lie level with the bank, so with the bank at its true 2.6 m their decks are about
  3 m above the water; the real Phú Xuân and Dã Viên decks are higher.
- Ground lower than the city floor (paddies, river flats) is still drawn at the floor.
- No lidar pass crosses the Ngự Bình or Vọng Cảnh summits; they rest on published figures.
- Merged to `main` as `520534e` and deployed on 2026-11-21; the live data file matches the local build byte for byte.

## Wrong heights at the tombs and lakeside hills (2026-11-21, branch `claude/lang-minh-mang-height-69ee42`)
Lăng Minh Mạng looked wrong; the sweep found two root causes, each affecting many places.
- **Terrain, raised lakes** (`scripts/build-data.mjs` §9): the shore ring and islands of every raised lake were held
  flat at the water's level, which sheared any hill that rose from a lake (Bửu Thành's mound lost 10 m on its lake
  side and the ring wall stood on a ramp). Now only the water is held flat. Shore and islands stand no lower than it
  (`shoreLv`), which frees 449 nodes (~28 ha) at 73 lakes. Terrain error against lidar is unchanged.
- **Tomb halls** (`src/landmarks/tombs.js`): `pavilion()` pitches roofs for the Citadel's great halls (up to 5.2 m,
  ×1.27 for two tiers), which stood tomb halls 4–6 m over their documented height. `pav()` now takes `h`
  (ridge over floor) and caps the default roof at 3.8 m. Heights from `docs/reference/heights.md`, measured from
  the lowest ground (before → after):
  - Sùng Ân 15.5 → 10.8
  - Đại Hồng Môn 11.3 → 9.1
  - Minh Lâu 15.9 → 14.6
  - Hòa Khiêm 11.7 → 9.9
  - Biểu Đức 14.8 → 9.5
  - Ngưng Hy 12.8 → 10.8
  - Bửu Thành wall 3.2 → 3.5 m
  - Hiển Đức Môn, Khiêm Cung Môn and Hồng Trạch Môn are also lowered.
- Checked: satellite building heights outside the drone survey are not inflated by tree canopy (median 7 m outside,
  9.4 m inside).
- Left as is: halls on steep ground still stand on tall downhill podiums, because floors level to the highest
  ground under them (a Tự Đức outbuilding sits 6 m up on a 5 m slope).

**Humped bridges (2026-11-21).** Generic road bridges now follow a vertical profile from `src/geo/bridges.js`
(shared by `geo/city.js` and `landmarks/life.js`): bank level as before plus a crown `rise·(1−cos 2πt)/2`, so the
deck meets the road level and rounds at mid-span. Named table: Trung Đạo 1.3 m on 5 brick vaults, the three Ngoại
Kim Thủy 1.4 m on one vault, Đông Thành Thủy Quan 0.9 m on 3 vaults (masonry kind, arches cut by a variable
underside in `slab()`), Gia Hội 1.1, Nhà Đồ / Cửa Ngăn / Cửa Thượng Tứ 1.0; Phú Xuân, Dã Viên, any run over 150 m
or mapped in pieces stay level. Default: footways/lanes `len/14` (0.5–1.5 m), roads `0.02·len` (0.4–1.1 m). Piers
end just inside the curved deck (also fixes the gap under class-3 slabs); traffic and lamp posts/glows ride the
curve; tomb `bridge()` is a smooth hump instead of ramp–flat–ramp. Rises are illustrative (no surveyed sections
found; sources: Huế Univ. paper on Ngự Hà vaulted bridges, rise/span ≈ 1/6; mia.vn on Trung Đạo's vaults). Looks:
`docs/looks/bridges-arched-trungdao.jpg`, `-kimthuy.jpg`. Not checked in the browser: tomb bridges, traffic on a
humped deck, the ink look.

**Lotus floating restaurant** (`src/landmarks/restaurant.js`, wired in `src/main.js`). Nhà hàng nổi Sông Hương is now a
hand model instead of a 6.6 m block on its round OSM footprint: a dark pontoon at river level (river y = 0), three
rings of lofted, cupped, pointed petals (12 low outer petals curling out over the water, 12 taller ones between them,
8 upright inner ones), white blushing to pink at the tips, round two-storey glazed pavilion with a balcony slab, two
flared red roof tiers and a lotus-bud finial. Today only (`span(2)`). At night: pink light lines on the rims of the
two inner rings and warm light from the dining rooms, the roof lantern and round the pontoon (`lightMaterial`, `minEra 2`).
OSM's two footbridges already join it to the park, so it has no gangway of its own. `main.js` takes the record out of
`data.bld` before `buildCity` (the last record moves into its slot so other buildings keep their seeded details).
Sources: only "lotus-shaped" is confirmed (khamphahue.com.vn, wanderlog, a foody.vn review); petal counts, colours,
tiers and lights are a plausible fill-in, noted in the file header. Gotcha found: a zero normal at a pointed petal tip
became NaN and the bloom pass blanked the whole screen; tip rows now borrow the row below. Looks:
`docs/looks/restaurant-lotus.jpg`, `-night.jpg` (checked in both looks, day and night, on a `vite preview` of the build).

**Height and terrain checks** (branch `claude/height-checks`). So a wrong height is caught before deploy:
- `npm run check:heights` (`scripts/check-heights.mjs`): builds every landmark headless in node (stubbed browser
  globals, same order as `main.js`) and measures each model's top above the ground against
  `docs/heights-reference.json` (24 landmarks; ±15 % for sourced figures, ±25 % for estimates). `--all` prints every
  row, `--diag` the rise and both bases. Fails on an out-of-range model, a locator that finds nothing, or a builder
  that throws or warns (tombs swallow errors with `console.warn`). Entries with a `known` note only WARN (none left). The three that were known were fixed: Bia Quốc Học is sourced at 10.95 m and its pillars at 9.85 m, so the pillars went up from 8.8 m; the Đông Ba clock tower came down from 22.1 to 16.4 m, since the old model comment misread heights.md; the Diệu Đế Đại Giác hall came down from 12.9 to 9.8 m. The gate reference is now sourced at 16–17 m (model 17.2). To add a landmark: an entry with `name`, `h` (m or [lo, hi]), `confidence`,
  `source`, and `at` = `special` | `site`+`name` | `site`+`rel`(+`tol`) | `point`+`r` | `gate`; `base: "model"` for
  buildings on a terrace the model builds.
- `npm run check:data` (`scripts/check-data.mjs`): terrain sanity on `public/data/hue.json` (grid size, no NaN or
  negatives, Hà Khê plateau ~9.8 m, Minh Mạng mound and axis climbing, Khải Định rise 15–40 m, raised lakes flat,
  building heights 0–180 m). `--against old.json` diffs terrain (≥2 m, grouped by nearest place) and building heights.
- `npm run data:build` now runs the same checks plus lidar/peak rms limits (1.5 m; now 1.31/1.17), prints the diff
  against the previous `hue.json`, and exits 1 on a failure (the file is still written for inspection).
- CI: `npm run check` runs before `npm run build` in `deploy.yml`, and on every PR in `check.yml`.
- Proven: against the pre-fix `tombs.js` it fails 5 tomb halls; against the pre-fix `hue.json` it fails the Minh Mạng axis.
- Review pass (branch `claude/repo-comprehensive-review-f8f9c2`, 2026-11-21): whole-repo review, then fixes for its
  findings. Runtime: storage guards, key handling in form fields, ride/zoom/follow races, labels out of the tab order
  when hidden, reduced motion, adaptive resolution on 1x screens. Geometry: terrain edge normals, shader patches warn
  when a three.js chunk is missing, shared helpers in `geo/buf.js`. Landmarks: missing data skips one landmark instead
  of the load, fleet boats turn round in a continuous sweep, 1935 lamp glows match their posts, Thủy Tiên footbridges
  drawn once. Data: survey heights above a period cap are kept, newest extract wins at seams, fetch scripts validate
  before replacing, `data:fetch` covers every extract; `hue.json` rebuilt (272 buildings, 4 roads changed).
  Left open: a code licence (none chosen), binary bundle format for infill/trees, courtyard holes, explicit building
  ids for the quoctugiam and tudam height anchors, pinned python versions, tests and lint.

## Landmark re-work (2026-11-21, branch `claude/landscape-models-realism-cd02d4`)
- **Trường Tiền:** rounder bows (`H·(1-u²)^0.62`, leaving the piers at about 45°). The night light show is a 24 s cycle: solid colours stepping, a bow-to-bow chase, a rainbow drift, and a violet pulse with a white run. Rain fades it to warm white.
- **Generator fixes (build-data.mjs + city.js):**
  - Infill houses are tested against each other with an OBB check, padded for each era's roof overhang, and mapped buildings are dilated 1.2 m for eaves. Result: 54.9k houses (was 63.9k), 0 roof overlaps.
  - Old roofs are clamped to the plot.
  - OSM "bridge" ways over dry land are laid as road. That is 81 ways, Cửa Chánh Tây among them.
- **Chợ Đông Ba:** clock tower on the Trần Hưng Đạo front, a "CHỢ ĐÔNG BA" canvas sign that glows red at night, clock dials and eave light strips. The sign, clocks and lights show in today's era only.
- **Citadel:**
  - Hiển Nhơn / Chương Đức gates have yellow tiles.
  - Kinh Thành gates have a crenellated parapet and name tablets.
  - Thái Hòa has two unequal halls and the Đại Triều Nghi esplanade.
  - Nghênh Lương Đình has a two-tier roof; Phước Duyên has openings on all eight faces.
- **Civic (new `enclosure.js`):**
  - Fences and gates at Quốc Học (OSM campus outline), Ga Huế, Phủ Cam, DCCT, An Định and Diệu Đế.
  - Thế Miếu / Hưng Miếu walls.
  - Night lamps, lit crosses, and the Vincom crown.
- **Floating restaurant (new `floating.js`):** Nhà hàng nổi Sông Hương, remodelled from a night photo:
  - Low dark pontoon, two glazed drums, two staggered rings of 16 open lotus-petal hoops.
  - Roof terrace with lamp posts and festoons, and a white tent pavilion.
  - The hoop LEDs run a 30 s colour show.
- **Tombs and south:**
  - Khải Định has dark weathered concrete, a three-path dragon stair, flagpoles and a precinct fence.
  - Minh Mạng has its side gates; Đồng Khánh has a gate in the Bửu Thành wall.
  - Nam Giao terraces read blue, yellow and red.
- **Checked in the browser:** night show, Đông Ba sign, Quốc Học fence, Chánh Tây with no bridge, floating restaurant by day and night.
- **Not yet seen in the browser:** the tombs, Thái Hòa, the churches, An Định.
- **Still to do:**
  - Tự Đức's La Thành wall and Vụ Khiêm gate, and the pavilions on Minh Mạng's lake (positions unknown).
  - The yards at Ga Huế, Phủ Cam, DCCT and Diệu Đế are estimated rectangles.
  - A small mapped building stands in front of the Đông Ba clock tower.

## PRs #12, #9, #10 and #13 merged together (2026-11-21)
Merged in that order; each later branch took `main` first and was reconciled before its merge.
- **#9 after #12:** `check-heights.mjs` no longer imports `geo/eras.js` or sets `S.span` (both removed by #9).
- **#10 after #9:** where #10 fixed era, ride or follow-a-boat code, the removal wins. `terrain.js` keeps `groundY`
  (the height check uses it).
- **#13 after the rest:**
  - Its new code (`enclosure.js`, `floating.js`, the Đông Ba sign, lamps and light strips) no longer takes an era;
    light meshes carry `userData.landmark`.
  - `floating.js` is the floating restaurant. `restaurant.js` (the earlier lotus model of the same building) is
    removed, with the code in `main.js` that took its footprint out of `data.bld`.
  - Three reworked models stood above `docs/heights-reference.json` and were lowered: Thái Hòa 15.6 → 12.1 m,
    Nghênh Lương Đình 10.8 → 8.3 m, Đông Ba clock tower 23.8 → 16.3 m. Diệu Đế keeps #12's lower hall on #13's
    ground level.
  - `hue.json` is rebuilt from the merged generator: 54,753 infill houses, 81 dry-land bridge ways laid as road,
    272 survey heights kept. Two builds in a row are byte-identical.
- Checked: `npm run check` (8/8 data, 24/24 heights), `npm run build`, and in the browser the day and night views,
  the Trường Tiền show, the floating restaurant and Chợ Đông Ba, with no console errors.
- Not seen in the browser after the merge: the tombs, Thái Hòa, the churches, An Định, the Quốc Học gate.

## Models sunk into the ground, and CI required on main (2026-11-21, branch `claude/height-merge-ci-validation-01d511`)
Done:
- Terrain grid stopped up to one 25 m step short of the east and south bounds (`floor` in build-data.mjs); 15 trees
  past the edge stood at the 2.6 m city floor beside the hills, about 157 m under them. Now `ceil`; data rebuilt
  (grid 320 × 508). check-data now fails if any tree lies outside the grid.
- Thủy Tiên footbridges: the level deck ran on into the higher far bank (up to 4.4 m in); it now ends where the bank
  comes up to it.
- Minh Mạng Bửu Thành mound: a cone stood on the centre's ground, so its uphill flank was buried in the hillside
  (about 2000 m²). `mound()` in tombs.js now drapes the profile over the local ground.
- Nghênh Lương Đình river stair: a fixed run that stopped short of the shore, so its lower steps and landing were
  inside the bank. It now starts at the mapped shore, with a paved walk out to it.
- New `scripts/check-burial.mjs` (`npm run check:burial`, part of `npm run check`): builds the full scene headless and
  fails when upward faces lie more than 1 m under the ground on land over more than 1 m² per source. It fails on the
  old code (citadel, south, tombs) and passes now, in about 1 s. Tree crowns are skipped: on steep hills they
  brush the uphill slope while the trunk is on the ground.
- Branch protection on `main`: the `check` job (Check workflow, GitHub Actions) is required, the branch must be up to
  date, the rule applies to admins too, and force-pushes and deletion are off.
Left as is (within tolerance): the civic rib feet (0.77 m, intentionally bedded), Thiên Mụ (0.6 m), and mound rim
bedding (≤0.6 m).

- Buildings off streets and yards (branch `claude/zombie-housing-issue-cefb73`, 2026-11-21):
  - Mapped buildings are trimmed back to the kerb (carriageway + 0.3 m; bridges and footpaths excepted) in
    `build-data.mjs`, after the inside-landmark pass. A building the street runs through (under half its plan left, a
    sliver under 2.5 m, or under 12 m²) is dropped: OSM still maps houses pulled down for newer streets. Rebuild:
    919 trimmed, 40 dropped (6,070 → 6,030); before, 640 overlapped a carriageway, now none.
  - Landmark yards (`yard` in `src/landmarks/enclosure.js`) step around mapped buildings as they do round streets: a
    building the fence would cut is put outside by pulling in the nearest side that clears the core. Seen at Dòng
    Chúa Cứu Thế, whose fence ran through the monastery blocks.
  - Checked: `npm run check`, `npm run build`, browser views of DCCT and a west-side street, no console errors.

## Replicas of every place, one agent each (2026-11-21, branch `claude/landscape-place-replication-agents-64978c`)
Goal: each of the 77 places in `hue.json` re-modelled as it stands today, one agent per place in its own worktree, merged here.
- Contract: `src/landmarks/places/<slug>.js` exports `id` + `build(ctx)`; the older builder skips it via `replaced(id)` (`places/index.js`, lazy list; node's `check-heights` hands the modules over on `globalThis.__hueReplicas`). Agent brief: `scratch/brief.md`; place list and shot ports: `scratch/agents.txt`. Each place documents sources and estimates in `docs/places/<slug>.md`.
- Done: all 77 merged (76 replica files in `src/landmarks/places/`; Trường Tiền was corrected in place in `truongtien.js`, 226eee9). Build passes, check:data 8/8, heights 24/24.
- Gates: one generic guard in `citadel.js` (`replaced('gate:' + name)`) skips every gate a `places/gate-cua-*.js` draws; Cửa Ngăn also owns its moat bridge (one-line skip in `city.js`).
- Left for later (none blocks the build):
  - Vọng Cảnh: the seed in `scripts/build-data.mjs` (~L1027) and `data/control-points.json` sit on Hòn Chén; the control point's latitude 16.42222 looks like a typo for 16.42958 (OSM lookout tower node 13516013279, same longitude). Moving it fails the summit check (terrain 35–37 m there vs the documented 43 m), so it needs terrain/elevation work first; `places/vongcanh.js` relocates the record at runtime meanwhile.
  - Tự Đức: the terrain stands 0.1–0.5 m above the water of Lưu Khiêm lake and the crescent pond, so the water shows in patches.
  - Thiên Mụ: the two side gates are still the generic green-roofed gates in `citadel.js`; the 9.9 m terrace needs ~30 risers where sources say ~19.
  - Trường Sanh's bridges are grey (should be red, `city.js`); Cầu Quảng Đức and most other moat bridges still come from the shared bridge code.
- Merge notes: conflicts so far were neighbouring import lines (keep both) and one `bridges.js` line (own + ramp). After each merge run `scratch/dupimports.sh`; two merges once added the same `replaced` import twice. `shot.mjs` now picks free ports and kills vite's process group.
- Shared changes made by agents: `structures.paved` ranges honoured by `coverOf` in `city.js` (thaihoa); `own: true` and `climb` bridge profiles in `bridges.js` (thaihoa, phuxuan); `owns(ring)` from `dainoi.js` and `ownRoads` from `giahoi.js` used in `city.js`; quochoc removes infill houses inside its campus at runtime.

## Replicas meet the burial check (2026-11-21, PR #23)
Merging main brought in `check:burial` (PR #24), which the replicas had never run against: 6,972 m² of upward faces
were more than 1 m under the ground across eight places. Each was fixed where it was built:
- **Đàn Nam Giao:** the grassed bank round the lower tier was one tapered box; it is now a skirt sampled round the
  tier's foot that meets the local ground (4,875 m² → 0).
- **Lăng Minh Mạng:** the Bửu Thành tumulus was a cone from the centre's ground; it is now draped over the slope, as
  `tombs.js` `mound()` is (742 → 0).
- **Lăng Khải Định:** the riser is fitted to the highest ground on the palace terrace, not one point on the axis
  (r = 0.194, inside the documented 0.15–0.2) (703 → 0).
- **Lăng Thiệu Trị:** the grave-mound kerb sits on the highest ground under it, bedded at the lowest (85 → 0).
- **Cầu Dã Viên / cầu gỗ lim:** girder undersides over the banks are cut where they would enter the ground (536 → 0).
- **Thiên Mụ / Đông Ba:** the river stairs start at the mapped shore, with a landing out to it (29 → 0).
`check-burial` now loads the replicas the way `check-heights` does and checks them as their own step.

## Issue pass with the user (2026-11-21)
Issues from sleepyluno, worked one at a time and fixed at the root (the source data, the parser or a shared builder),
one PR per issue. sleepyluno is credited in the README (Contributors) and the About panel.
- #6 (Nam Giao orientation): already fixed on main by the per-place replica (`places/namgiao.js`, 13° off the compass from the OSM lawns).
- #11 done: the language control was a lone button labelled with the *other* language; it is now a VI | EN radiogroup on the shared `.seg` component (the dead `.chip` style is gone). The same pass fixed the phone compass, which was pinned at a hard-coded +144px and overlapped the tool column; `ui.js` now publishes the column's measured height as `--tools-h`.
- #14 craft villages (partly done, "Refs #14"):
  - The model now reaches Sình: `scripts/frame.json` bbox.n is 16.530, and the new `cityNorth` = 16.4965 starts a village zone (`inVillages`: roadside houses ×0.6, random trees 0.2).
  - Four new OSM strips came from `scripts/fetch-osm-north.sh` into `data/raw/hue-osm-north1..4.json`. The terrain was refetched up to 16.537 N.
  - Root fix found on the way: the terrain grid was laid from the box's corner, so widening the box moved every node by a fraction of a cell and sank the Thiên Mụ replica 1–2 m (burial check). The lattice is now laid from `frame.json` `gridAnchor`, the old corner, so main's nodes stay put and new rows are added to the north.
  - The height fetchers (`fetch-heights.py`, `fetch-gishue-heights.py`, `fetch-lidar.py`) read the same bbox but were not rerun: the northern strip uses default heights until they are.
  - New kind `craft`: Thủy Xuân (way 1473275556), Phường Đúc (node 9960090217), Sình (node 9960092017), guarded by the `craft villages` check.
  - Thanh Tiên paper flowers is not in OSM; asked sleepyluno for a pin in #14.
- #7 done (forest at the tombs and other heritage sites):
  - Root cause: OSM maps almost no forest round the tombs, and the hills had random trees at a 0.06 chance; Thiệu Trị had 35 trees within 300 m.
  - Source: ESA WorldCover 2021 v200, 10 m, class 10 tree cover. `scripts/fetch-landcover.py` reads the model box from the public COG into `data/raw/dem/treecover.json` (1080×1944 bitmap, 43% tree, 350 KB).
  - `build-data.mjs` plants on a 10 m grid where WorldCover has trees: fully inside 125 heritage rings (the tombs, Vọng Cảnh, Ngự Bình, and named OSM tombs, ruins, monuments, attractions and places of worship), and 15% of cells elsewhere in the hills and villages. The city keeps its garden canopy, and terrain cover takes `wood` from WorldCover. Replicas still clear their paved ground at runtime.
  - +127k trees (to 201k), 2,000–2,600 within 300 m of each tomb; `hue.json` gzip 2.9 MB. The `forest round the tombs` check holds each tomb at 1,000 or more.
- Remaining: #5 (south bank remodel), #8 (landmark accuracy), and the newer #15–#22.

## Trees on the roads at the Nguyễn Hoàng bridge heads (2026-11-21, branch `worktree-agent-a66ef976516add427`)
- Cause: the avenue trees in `build-data.mjs` (section 7) were placed `ROAD_W/2 + 1.6` m off each trunk/primary/
  secondary way and checked only against water, buildings and other trees, never roads. A dual carriageway is two
  ways, so each side's avenue landed on the other carriageway, and at junctions on the crossing roads; the bridge
  heads (four short carriageways and ramps meeting) were filled with them.
- Fix: `onCarriageway(x, z, pad)` (exact distance to the road lines, roads up to service class, bridges included)
  keeps every tree trunk 0.6 m off any carriageway, in `plant()` and the avenue loop. Data rebuilt.
- Trees on a carriageway: 3,997 of 60,922 → 0 of 56,637. New check in `check-data.mjs` ("no trees on the roads").
- `shot.mjs --at x,z` looks at a point instead of the place's centre (used for the bridge heads).

## Structures overlapping roads and each other (2026-11-21, branch `worktree-agent-ad9e82e9d2b5d8d5a`)
- Thiên Mụ's river stair (owner's screenshot): the terrace flight ended at a fixed v = 26.5 and the river landing
  started at a fixed v = 36. Both stood on Nguyễn Phúc Nguyên's carriageway, with the posts on the asphalt. The
  flight and the landing are now cut where `streetTest` (src/landmarks/enclosure.js) says the street begins and
  ends. The landing starts past the far pavement. Shots: scratch/shots/thienmu-before, scratch/shots/thienmu-after.
- Thiên Mụ's Hà Khê precinct ring now goes through `offStreets` (enclosure.js), which trims a mapped outline off
  the c<=3 carriageways. The east lane no longer runs under its terrace.
- Thái Miếu and Triệu Miếu both drew Thần Khố and Thần Trù. They now belong to trieumieu.js only, whose precinct
  they stand in.
- New `scripts/check-overlap.mjs` (`npm run check:overlap`) checks three things:
  - replica footprints on c<=3 carriageways (non-bridge);
  - raised faces of different sources in the same 1 m cell;
  - kept buildings and infill houses under models.
  Rampart faces (`S.noCover`) are excluded. The scene build it shares with check-burial now lives in
  scripts/lib/scene.mjs, with replicas one source per place.
  The check is not in `npm run check`: 41 findings remain and it takes about 5.7 s.
- Left (run `npm run check:overlap` for the list):
  - bridge ramps over their approach roads (nguyenhoang, truongtien, phuxuan, bachho) need a principled
    exemption;
  - road intrusions at tayloc, giahoi, tudam, phucam, dongba, quoctugiam, baotangcovat, dcct, gahue and the gate
    passages;
  - dainoi's wall tops coplanar with tuphuong, canchanh and duyetthi (stacked on the wall: possibly a real
    z-fight);
  - hungmieu with themieu;
  - about 15 small (7-16 m²) kept buildings or infill houses under models.

- #5 south bank: roof families read per building from a Sentinel-2 scene (`scripts/fetch-roofs.py`, `data/raw/dem/roofrgb.json`), stored in flag bits 4-6 (mapped) and infill bits 4-6; the Lê Lợi ward (290 m) gets whitewashed walls (bit 7); Hai Bà Trưng joins Quốc Học's dark-red campus styling.
- Remaining: #8 (landmark accuracy), and the newer #15–#22.
## Non-bridge overlap findings (2026-11-21, branch `worktree-agent-a09688f46d572038b`)
- check:overlap went from 38 to 17 findings. Of the 17, 7 are bridge or causeway road findings (left to the bridge agent).
- Shared fixes: `offStreets`/`clipTo` keep compound fills and lawns behind the kerb. `fence()` stops where a mapped
  building stands in its line (`solidSpans`), with no piers there. populate's `houseOff` samples every metre, and the
  check now asks `world.houseOff` instead of keeping its own copy.
- Check changes: the barycentric eps fix, plus the isolated `inGatePassage` rule (a gate's piers inside its mapped
  block, where the street passes through).
- Left over: tuphuong, duyetthi, canchanh and hungmieu+themieu are edge contact that the 1 m cells alias. Real
  interpenetration there is 0.03 m or less. Also left: quochoc (block plinth against the mapped hall), gahue
  (contact, 7 m²), phucam (7 m²), and hoquyen, thuyquan, mangca and conhen (not looked at).

## Visual-bug round merged (2026-11-21, PRs #33, #35, #36, #37)
- #33: ink outlines only where the surface turns (view-space normals from depth), so flat triangle seams no longer draw lines.
- #35: Cầu Gia Hội's deck covers only the water plus 1.8 m abutments, with square ends, and lands flush with its streets (`bridgeProfiles` water spans). The crown rises 2.0 m.
- #36: Nguyễn Hoàng's deck ends where the slip roads begin, so the junction islands are clear. The dropped carriageways still mark the ground as road, so nothing is planted under them. Dry-land rail bridges are laid at grade. check:overlap exempts deck-to-approach-street contact at bridge heads.
- #37: the non-bridge fixes described above, merged with the bridge-head exemption.
- check:overlap on main: 11 findings, mostly edge contact (dainoi+tuphuong 172, dainoi+duyetthi 43, canchanh 27, hungmieu 17), plus hoquyen 33, mangca 14, giahoi 13, quochoc 15, gahue 7, phucam 7, conhen 3.
- Next: decide between per-sample and per-cell overlap counting so edge contact stops aliasing. Then fix hoquyen and mangca. Once it reaches 0, add check:overlap to `npm run check`.

## check:overlap counts interpenetration, not contact (2026-11-21, branch `claude/overlap-edge-contact`)
- Rule (scripts/check-overlap.mjs, `DEEP` = 0.1 m): overlap and building areas count only sample points that lie
  inside both footprints eroded by DEEP (the point and its ±DEEP x/z neighbours all inside each), at 1/5 m² per
  point instead of a whole 1 m cell. Touching faces add nothing. The road test is unchanged. Building hits now
  consider every source over a cell, not only the first one.
- Before: 11 FAIL. After: 8 FAIL. canchanh+dainoi (3.8 m²), hungmieu+themieu (3 m²) and gahue (0) now pass.
  Road findings are unchanged (hoquyen 33, mangca 14, giahoi 13, phucam 7, conhen 3).
- Still failing, and they are real overlaps in plan, not aliasing: dainoi+tuphuong 23.2 m² (tuphuong's 6.35 m deck
  overlaps dainoi's wall top by ~0.24 m at the same height, and its 0.26 m parapet strip stands on that wall top);
  dainoi+duyetthi 14.2 m² (duyetthi's roof eave reaches 0.3–1.9 m over dainoi's gallery roof). quochoc is 7.8 m².
- Proof: a copy of canchanh shifted 2 m / 0.15 m / 0.05 m still FAILs at ~1470–1580 m² (old: 1520–1630); a hungmieu
  copy shifted 2 m gives 697 m² (old 854); gahue moved 2 m into its hall FAILs at 11.2 m².
## Last road intrusions (2026-11-21, branch `claude/last-place-intrusions`)
- check:overlap road findings are 0 (hoquyen 33, mangca 14, giahoi 13, phucam 7, conhen 3 before). The remaining FAILs are the edge-contact overlaps and the two building ones.
- Hổ Quyền: OSM way 870617584 runs on the perimeter footway line through the outer wall. `clearMonuments` in build-data.mjs (CLEAR_OF relation 19381147) moves it off. The stand, gate and stairs now face SE from the NW arc (FRONT -0.5).
- Mang Cá: the lane through the Trường Định breach crosses off-centre, so the ruins skip the street using `streetTest`.
- Phủ Cam: the apse plinth is trimmed with `offStreets`.
- Cồn Hến: the tam quan is set back 0.7 m from the west lane.
- Gia Hội: `waterSpans` (geo/bridges.js) stops the abutment at the kerb of a street crossing at grade. Huỳnh Thúc Kháng lies within a metre of the west bank, and approach streets are left out.
- Next: settle the edge-contact counting. Then add check:overlap to `npm run check`.

## Bridges: duplicate decks and one citadel bridge (2026-11-21, branch `claude/issue-17-19-bridges-32c6fd`, issues #17 and #19)
- #17: bridge ways tagged `footway=sidewalk` (14 of them) were laid as a second flat deck beside or under the real one: under Trường Tiền's trusses, and beside Dã Viên and Phú Xuân. build-data now leaves them to their carriageway's deck or hand model and still marks their ground as road.
- #19: every bridge inside the walls or within 90 m of a citadel gate is `bridge = 2` in hue.json (31 ways). They are all drawn by `src/geo/citadel-bridge.js`: brick body, round vaults ringed in plaster, a plaster string course, a solid parapet with coping and medallions, and end posts. `bridges.js` `citadelRule` sets the rise to len/10 (clamped 1.2–2.2 m) and the vaults over the water crossed (one vault, or three if the water is wider than 22 m). Nhà Đồ, Thượng Tứ and Ngoại Kim Thủy dropped out of NAMED.
- Kept bespoke: Cửa Ngăn, Thủy Quan, Trung Đạo, and the Tịnh Tâm and Tàng Thư Lâu lake footbridges (`HAND_BRIDGES` way ids).
- Verified in the preview: Đông Ba gate, Ngoại Kim Thủy, Nhà Đồ, Ngự Hà and Trường Tiền. `npm run check` passes.
## Medians and darker asphalt on the divided roads (2026-11-21, issue #15, branch `claude/issue-15-roads-e59be1`)
- Root cause: each carriageway of a divided road is its own one-way OSM way, but each was drawn at the full class width. The two overlapped into one slab, and the median trees ended up standing in the road.
- `build-data.mjs`: a one-way twin (same name, running the opposite way, straight across) is now laid at a one-way width (8/7/6 m, never wider than the gap allows). The gap between the twins' inner kerbs becomes a median (`medians` in hue.json: `[width dm, pts]`). It stops at crossing roads and roundabouts, and no trees are planted on it. 106 carriageways narrowed, 119 strips, about 17 km.
- A road record can now carry a 4th element, its width in dm. `roadWidth()` in config.js reads it, and city.js, life.js, check-data and check-overlap all use it.
- city.js draws each median as a pale-grey kerb with grass inside and small shrubs along it.
- Exception: within 90 m of chợ Đông Ba, Trần Hưng Đạo keeps its old look, with full width and trees in the middle, as the issue asks.
- Road palette darkened to the cầu Trường Tiền deck grey (#76716e…). If that is too dark, it is a one-line change to `PAL.road`.
- `npm run check` passes. Checked in the preview on port 5191.

## Last model-pair overlaps; check:overlap is required (2026-11-21, branch `claude/model-pair-overlaps`)
- Fixed the last five check:overlap findings without changing the check, its limits or its exemptions:
  - Đại Nội + Tứ Phương shared the Bắc Khuyết Đài bastion wall. Tứ Phương now owns it. The shared wall helper is in `src/landmarks/hoangthanh.js`.
  - Tả Trường Lang (beside Duyệt Thị) is redrawn from OSM at 3.5 m.
  - The Cần Chánh galleries end at the platform face (gallery `butt`).
  - Thế Miếu's wall stops clear of Hưng Miếu's rear gates (`REAR_GATE_CUTS`).
  - The Quốc Học link blocks stop their eaves at the old hall (`link`).
- `npm run check`, and with it the required CI check, now runs check:overlap: 0 findings, 78 sources.
- Also merged from the incoming queue this round: #34, #39, #40, #42, #46 (bridges), #45 (river lights), #44 (plazas) and #41 (medians). After each one, the merge with main was rebuilt and checked.

## Zoom flicker and river-stroke rings (2026-11-21, branch `claude/zoom-flicker`)
- Flicker: the canvas showed the page background (#e6e2d8) for a frame, wholly or in part. Cause: a canvas resize
  clears its drawing buffer, and `adapt()` (drop resolution when slow, which zooming triggers) resized it at the end
  of `tick`, after the draw; window resizes ran in a rAF queued behind `tick` too. The browser composited the cleared,
  transparent canvas. Now both only set `pendingSize`; `step()` applies it before rendering (`resizeBuffers` / `resize`
  in src/main.js). Frame check (alpha at the end of each tick): before, 5 of 5 resolution steps gave a fully blank
  frame; after, 910 frames over 5 steps and a window resize, none blank.
- Pale broken arcs in rings on the river (ink look, no rain): the water's pen strokes (src/env/water.js) took their
  frame from each pixel's view ray against the absolute world position, so the noise followed curves of constant
  dot(p, V). The frame is now the camera's heading (forward + up from viewMatrix), one per frame. Checked over the
  Hương below Trường Tiền at golden hour, before and after.
- `npm run check` and `npm run build` pass.

## Blank canvas at some views (2026-11-21, branch `worktree-agent-a33a47132b06bcc2c`)
- Symptom: the whole model vanished (page background #e6e2d8) and stayed gone while the view held; labels and UI fine.
  Not context loss (`isContextLost` false throughout) and not the resize path. Cause: single NaN pixels from the
  city shader, which the focus blur and above all the bloom mips smeared over the frame; NaN alpha made the canvas
  transparent. Two sources in src/geo/materials.js:
  - roof tiles (any weather): the tile frame `normalize( cross( hueN, up ) )` was guarded only for faces pointing up,
    so downward faces (eave and canopy undersides) got normalize(0) = NaN. The guard is now `abs( hueN.y )`.
  - wet film (rain): `pow( 1.0 - ndv, 3.5 )` with `ndv = dot(N, V)` slightly over 1 on faces seen head-on. Clamped,
    and the same in landMaterial, water.js, and the two `pow()` of negative bases in the boat wakes.
- Robustness: post.js zeroes non-finite scene pixels before the comp, and the final OutputPass writes alpha 1;
  main.js handles `webglcontextlost` (preventDefault) / `webglcontextrestored` (IBL probe, shadows and buffers redone).
- Evidence (Apple M5, Chrome Metal, 1280x800; sunset, Phủ Cam, ink; 720 poses round Phủ Cam, dist 150-3000 m):
  before, rain 28 fully blank poses (13 with NaN in the scene), dry 25 (12); after, 0 and 0, no NaN. Post guard alone
  on the old shaders: still NaN in 13 scene renders, 0 blank. `npm run check` and `npm run build` pass.

## Seamless bridge-to-street joints (2026-11-21, branch `worktree-agent-ab59d4954699589fb`)
- Trigger: cầu Nguyễn Hoàng's north (Kim Long) end met its divided approach with a wedge of bare ground, a skewed cut, misaligned medians and lanes, and red strips ending in the air.
- Root causes, fixed in shared code:
  - twin bridge carriageways were not narrowed like their streets (build-data `divided` now includes bridges), and decks were sized from ROAD_W, not the way's width;
  - street end caps were square to their own last segment: `bridgeJoints`/`handDeckJoints` in geo/city.js now cut both ends on the joint's bisector, or square to a replica deck's end;
  - each median strip had one averaged width: strips are now split where the gap drifts more than 0.5 m;
  - generic decks ended 0.36 m above the street: bridges.js now ramps class 0-3 decks onto the street's height;
  - cầu Nguyễn Hoàng's fixed cross-section now blends, over its last 24 m, into its approach carriageways' bands, colours and cross-fall. Its deck ends, and Phú Xuân's, are exported via `deckEnds()`.
- New `npm run check:joints` (scripts/check-joints.mjs), now part of `npm run check`: 81 joints, 0 failing (bare seam ≤ 0.5 m², step ≤ 0.35 m). The old code had 66 of 77 failing. check:overlap is still clean.

## Four interaction bugs (2026-11-21, branch `worktree-agent-a3d055188011d1313`)
- Resize no longer sends the camera home once a place or the overview is chosen: the rig tracks `opening` (still on the
  opening view), cleared by any flight or user interaction and set again when a flight home lands; `resize()` re-frames
  home only while it is set. Checked in the app: Ngọ Môn from search, then a phone-size resize, keeps the camera put.
  A resize on a fresh visit still re-frames home.
- Adaptive resolution works at any low rate: each slow frame counts for at most 250 ms, background frames are not counted,
  and the count restarts on `visibilitychange`. A simulation that runs the real `adapt()` from main.js shows the change:
  300 ms frames used to stay at 1.6 and now step down from 4 s, 100 ms frames step down from 3.4 s, and a 5 s stall or
  2 s stalls every 10 s change nothing. Checked in the app with forced ~300 ms frames (1.5 → 1.25).
- A drag that ends near its start no longer counts as a tap: `dragged` is set once movement passes 6 px.
- Choosing from search with the keyboard passes the input to `showCard(id, from)` as the card's opener, so closing
  the card returns focus to search.
- Not verified: the single-stall case in a live tab, because the hidden browser pane pauses requestAnimationFrame
  while still reporting the page as visible. The simulation covers that case.
